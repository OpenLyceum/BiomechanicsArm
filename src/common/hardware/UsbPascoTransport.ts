/**
 * UsbPascoTransport.ts
 *
 * WebUSB carrier for PASCO packets, for a wireless sensor plugged in with its
 * micro-USB cable. Adapted from MotionSensor's `UsbMotionSensor`, where the
 * framing was recovered for the PS-3219: the PASCO packets are identical to the
 * Bluetooth ones behind a two-byte `[service, characteristic]` header.
 *
 * ── Status ────────────────────────────────────────────────────────────────────
 * Proven on the PS-3219 only. The PS-3202 and PS-3220 are expected to use the
 * same bridge, but that has to be confirmed on the sensors themselves — see
 * doc/implementation-notes.md and scripts/probe/.
 *
 * ── The bridge must be enabled first ──────────────────────────────────────────
 * Claiming the interface is not enough. Until the vendor control transfer in
 * `wakeBridge` arrives, both endpoints accept writes and answer nothing.
 *
 * ── One reader ────────────────────────────────────────────────────────────────
 * USB has no notifications, so a single loop reads the IN endpoint for as long
 * as the device is open and hands every packet on. WebUSB cannot cancel a
 * transfer; the loop simply ends when the device closes and the read rejects.
 */

import { parseUsbTransfer, usbWriteFrame } from "./PascoProtocol.js";
import { DeviceSelectionCancelled, type PacketListener, type TPascoTransport } from "./PascoTransport.js";

/** PASCO scientific. */
const PASCO_USB_VENDOR_ID = 0x0945;

/** Fallback transfer size, replaced at connect by the IN endpoint's own `packetSize`. */
const TRANSFER_BYTES = 64;

/** Consecutive failed reads after which the link is considered lost. */
const READ_FAILURE_TOLERANCE = 3;

/** Vendor control requests the bridge wants before it carries bulk traffic. */
const BRIDGE = {
  STATUS: 0xed,
  CONFIG: 0xa0,
  VERSION: 0xf2,
  ENABLE: 0xfb,
  CONFIG_VALUE: 0x01fc,
  CONFIG_INDEX: 0x1000,
  ENABLE_INDEX: 0x3500,
} as const;

export class UsbPascoTransport implements TPascoTransport {
  public packetListener: PacketListener | null = null;
  public disconnectListener: (() => void) | null = null;

  private device: USBDevice | null = null;
  private inEndpoint = 0;
  private outEndpoint = 0;
  private inPacketBytes = TRANSFER_BYTES;
  private readonly logDetails: boolean;

  private readonly handleDisconnect = (event: USBConnectionEvent): void => {
    if (event.device === this.device) {
      this.lostConnection();
    }
  };

  public constructor(logDetails = false) {
    this.logDetails = logDetails;
  }

  public get isConnected(): boolean {
    return this.device?.opened === true;
  }

  public get name(): string | null {
    const device = this.device;
    if (!device) {
      return null;
    }
    return device.productName ?? `PASCO ${device.productId}`;
  }

  public async connect(_namePrefix: string, _serviceCount: number): Promise<void> {
    if (!navigator.usb) {
      throw new Error("WebUSB is not available in this browser");
    }

    let device: USBDevice;
    try {
      device = await navigator.usb.requestDevice({ filters: [{ vendorId: PASCO_USB_VENDOR_ID }] });
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        throw new DeviceSelectionCancelled();
      }
      throw error;
    }

    this.device = device;
    navigator.usb.addEventListener("disconnect", this.handleDisconnect);

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    const usbInterface = device.configuration?.interfaces[0];
    if (!usbInterface) {
      throw new Error("The USB device exposes no interface to claim");
    }
    await device.claimInterface(usbInterface.interfaceNumber);

    // Read the endpoint numbers rather than assuming them: a PS-3219 uses 3 for
    // OUT and 2 for IN.
    this.inEndpoint = 0;
    this.outEndpoint = 0;
    for (const endpoint of usbInterface.alternate.endpoints) {
      if (endpoint.direction === "in" && this.inEndpoint === 0) {
        this.inEndpoint = endpoint.endpointNumber;
        this.inPacketBytes = endpoint.packetSize;
      }
      if (endpoint.direction === "out" && this.outEndpoint === 0) {
        this.outEndpoint = endpoint.endpointNumber;
      }
    }
    this.log("endpoints: in", this.inEndpoint, "out", this.outEndpoint, "packet", this.inPacketBytes);
    if (this.inEndpoint === 0 || this.outEndpoint === 0) {
      throw new Error("The USB device is missing an IN or OUT endpoint");
    }

    await this.wakeBridge(device);
    // Deliberately not awaited: the loop runs until the device closes and never rejects.
    this.readLoop(device).catch(() => undefined);
  }

  /** Brings the bridge out of silence; only the enable is required. */
  private async wakeBridge(device: USBDevice): Promise<void> {
    const read = async (request: number, value: number, index: number, length: number): Promise<string> => {
      try {
        const result = await device.controlTransferIn(
          { requestType: "vendor", recipient: "device", request, value, index },
          length,
        );
        return result.status;
      } catch (error) {
        return error instanceof Error ? error.name : String(error);
      }
    };
    this.log("bridge status:", await read(BRIDGE.STATUS, 0, 0, 2));
    this.log("bridge config:", await read(BRIDGE.CONFIG, BRIDGE.CONFIG_VALUE, BRIDGE.CONFIG_INDEX, 4));
    this.log("bridge version:", await read(BRIDGE.VERSION, 0, 0, 64));

    const enabled = await device.controlTransferOut({
      requestType: "vendor",
      recipient: "device",
      request: BRIDGE.ENABLE,
      value: 0,
      index: BRIDGE.ENABLE_INDEX,
    });
    this.log("bridge enable:", enabled.status);
    if (enabled.status !== "ok") {
      throw new Error(`USB bridge refused to start: ${enabled.status}`);
    }
  }

  private async readLoop(device: USBDevice): Promise<void> {
    let failures = 0;
    while (this.device === device && device.opened) {
      try {
        const result = await device.transferIn(this.inEndpoint, this.inPacketBytes);
        if (result.status === "stall") {
          await device.clearHalt("in", this.inEndpoint);
          throw new Error("stalled");
        }
        if (result.status !== "ok" || !result.data) {
          throw new Error(result.status);
        }
        failures = 0;
        const transfer = new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
        const packet = parseUsbTransfer(transfer);
        if (packet) {
          this.packetListener?.(packet.serviceId, packet.data);
        }
      } catch (error) {
        if (this.device !== device) {
          return;
        }
        failures++;
        this.log(`read failed (${failures}):`, error);
        if (failures >= READ_FAILURE_TOLERANCE) {
          this.lostConnection();
          return;
        }
      }
    }
  }

  public async disconnect(): Promise<void> {
    const device = this.device;
    navigator.usb?.removeEventListener("disconnect", this.handleDisconnect);
    this.device = null;
    if (!device) {
      return;
    }
    try {
      await device.close();
    } catch {
      // The cable may already be out; the caller's state is the same either way.
    }
  }

  public async write(serviceId: number, characteristicId: number, packet: readonly number[]): Promise<void> {
    const device = this.device;
    if (!device?.opened) {
      throw new Error("Sensor is not connected");
    }
    const frame = usbWriteFrame(serviceId, characteristicId, packet);
    const result = await device.transferOut(this.outEndpoint, frame.buffer as ArrayBuffer);
    if (result.status === "stall") {
      await device.clearHalt("out", this.outEndpoint);
      throw new Error("Sensor stalled the OUT endpoint");
    }
    if (result.status !== "ok") {
      throw new Error(`Sensor write failed: ${result.status}`);
    }
  }

  private lostConnection(): void {
    const device = this.device;
    navigator.usb?.removeEventListener("disconnect", this.handleDisconnect);
    this.device = null;
    device?.close().catch(() => undefined);
    this.disconnectListener?.();
  }

  /** Bring-up trace. Silent unless `?showDiagnostics` asked for it. */
  private log(...parts: unknown[]): void {
    if (this.logDetails) {
      // biome-ignore lint/suspicious/noConsole: explicit hardware bring-up diagnostics.
      console.info("[BiomechanicsArm USB]", ...parts);
    }
  }
}
