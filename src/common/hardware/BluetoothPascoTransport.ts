/**
 * BluetoothPascoTransport.ts
 *
 * Web Bluetooth carrier for PASCO packets. Each PASCO service is a GATT service;
 * every characteristic that can notify is subscribed, and each notification is
 * handed on tagged with the service it arrived on (which is how streamed data
 * from several channels is told apart).
 */

import { PASCO_CHARACTERISTIC, parsePascoUuid, pascoUuid } from "./PascoProtocol.js";
import { DeviceSelectionCancelled, type PacketListener, type TPascoTransport } from "./PascoTransport.js";

/** Most channels any supported sensor has, plus the device service. */
const MAX_SERVICES = 4;

const OPTIONAL_SERVICES = Array.from({ length: MAX_SERVICES }, (_unused, serviceId) =>
  pascoUuid(serviceId, PASCO_CHARACTERISTIC.SERVICE),
);

export class BluetoothPascoTransport implements TPascoTransport {
  public packetListener: PacketListener | null = null;
  public disconnectListener: (() => void) | null = null;

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private readonly characteristics = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private readonly subscribed: BluetoothRemoteGATTCharacteristic[] = [];

  private readonly handleDisconnect = (): void => {
    this.clearConnectionState();
    this.disconnectListener?.();
  };

  private readonly handleNotification = (event: Event): void => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    const address = parsePascoUuid(characteristic.uuid);
    if (!(value && address)) {
      return;
    }
    this.packetListener?.(address.serviceId, new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  };

  public get isConnected(): boolean {
    return this.server?.connected === true;
  }

  public get name(): string | null {
    return this.device?.name ?? null;
  }

  public async connect(namePrefix: string, serviceCount: number): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth is not available in this browser");
    }

    let device: BluetoothDevice;
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix }],
        optionalServices: OPTIONAL_SERVICES,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        throw new DeviceSelectionCancelled();
      }
      throw error;
    }

    this.device = device;
    device.addEventListener("gattserverdisconnected", this.handleDisconnect);
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("Could not reach the sensor's GATT server");
    }
    this.server = server;

    for (let serviceId = 0; serviceId < Math.min(serviceCount, MAX_SERVICES); serviceId++) {
      const service = await server.getPrimaryService(pascoUuid(serviceId, PASCO_CHARACTERISTIC.SERVICE));
      for (const characteristic of await service.getCharacteristics()) {
        const address = parsePascoUuid(characteristic.uuid);
        if (!address) {
          continue;
        }
        this.characteristics.set(`${address.serviceId}:${address.characteristicId}`, characteristic);
        if (characteristic.properties.notify) {
          characteristic.addEventListener("characteristicvaluechanged", this.handleNotification);
          await characteristic.startNotifications();
          this.subscribed.push(characteristic);
        }
      }
    }
  }

  public disconnect(): Promise<void> {
    this.device?.removeEventListener("gattserverdisconnected", this.handleDisconnect);
    for (const characteristic of this.subscribed) {
      characteristic.removeEventListener("characteristicvaluechanged", this.handleNotification);
    }
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.clearConnectionState();
    this.device = null;
    return Promise.resolve();
  }

  public async write(serviceId: number, characteristicId: number, packet: readonly number[]): Promise<void> {
    const characteristic = this.characteristics.get(`${serviceId}:${characteristicId}`);
    if (!(characteristic && this.isConnected)) {
      throw new Error("Sensor is not connected");
    }
    await characteristic.writeValueWithoutResponse(Uint8Array.from(packet));
  }

  private clearConnectionState(): void {
    this.server = null;
    this.characteristics.clear();
    this.subscribed.length = 0;
  }
}
