/**
 * SensorDevice.ts
 *
 * One PASCO wireless sensor reduced to what the lab needs: connect, then a
 * stream of readings of one quantity. `PascoSensorDevice` does that over any
 * `TPascoTransport`; `DemoArm.ts` provides a simulated one.
 *
 * Readings are raw in the sense that matters to the model: newtons straight off
 * the factory calibration, or radians accumulated since streaming began. Zero
 * and sign are the model's business (`SensorChannel`).
 */

import {
  countsToRadians,
  decodeCountChanges,
  decodeForceSamples,
  isStreamPacket,
  keepaliveCommand,
  PASCO_CHARACTERISTIC,
  PASCO_DEVICE_SERVICE_ID,
  ROTARY_MOTION_START_COMMAND,
  STREAM_ACK_INTERVAL,
  setSamplePeriodCommand,
  startSamplingCommand,
  stopSamplingCommand,
  streamAckCommand,
} from "./PascoProtocol.js";
import type { TPascoTransport } from "./PascoTransport.js";

export interface TSensorDevice {
  /** Advertised name, or null before a connection exists. */
  readonly name: string | null;

  /** Packet counts and the like, for `?showDiagnostics`. */
  readonly diagnostic: string;

  /** Opens the picker and connects. Must reach the picker before any `await`. */
  connect(): Promise<void>;

  /** Puts the sensor on its own clock; `onSample` then receives every reading. */
  start(periodMs: number, onSample: (value: number) => void): Promise<void>;

  /** Stops sampling and lets go of the device. Never rejects. */
  disconnect(): Promise<void>;

  /** Registers a listener for the link dropping on its own. */
  onUnexpectedDisconnect(listener: () => void): void;
}

/** What distinguishes one sensor model from another. */
export type SensorSpec = {
  /** Prefix of the name the sensor advertises over Bluetooth. */
  readonly namePrefix: string;
  /** Channels the device samples; all must be given a period and acknowledged. */
  readonly channelCount: number;
  /** Channel whose samples are the quantity wanted. */
  readonly dataChannel: number;
  /** Sent to the device service after connecting, before sampling. */
  readonly startCommand?: readonly number[];
  /** Builds a decoder for one streaming session; it may keep a running total. */
  readonly createDecoder: () => (data: Uint8Array) => number[];
};

/** Wireless Force Acceleration Sensor PS-3202: force in newtons. */
export const FORCE_SENSOR_SPEC: SensorSpec = {
  namePrefix: "Force Accel",
  channelCount: 3,
  dataChannel: 0,
  createDecoder: () => decodeForceSamples,
};

/** Wireless Rotary Motion Sensor PS-3220: angle in radians since streaming began. */
export const ROTARY_SENSOR_SPEC: SensorSpec = {
  namePrefix: "Rotary Motion",
  channelCount: 1,
  dataChannel: 0,
  startCommand: ROTARY_MOTION_START_COMMAND,
  createDecoder: () => {
    let counts = 0;
    return (data) =>
      decodeCountChanges(data).map((change) => {
        counts += change;
        return countsToRadians(counts);
      });
  },
};

export class PascoSensorDevice implements TSensorDevice {
  private readonly transport: TPascoTransport;
  private readonly spec: SensorSpec;
  private readonly disconnectListeners: (() => void)[] = [];
  private sampling = false;
  private packets = 0;
  private otherPackets = 0;
  private lastPacket = "";

  public constructor(transport: TPascoTransport, spec: SensorSpec) {
    this.transport = transport;
    this.spec = spec;
    transport.disconnectListener = () => {
      this.sampling = false;
      for (const listener of this.disconnectListeners) {
        listener();
      }
    };
  }

  public get name(): string | null {
    return this.transport.name;
  }

  public get diagnostic(): string {
    return `packets ${this.packets} · other ${this.otherPackets} · last ${this.lastPacket}`;
  }

  public async connect(): Promise<void> {
    this.transport.packetListener = null;
    // +1 for the device service.
    await this.transport.connect(this.spec.namePrefix, this.spec.channelCount + 1);
    await this.command(PASCO_DEVICE_SERVICE_ID, keepaliveCommand());
    if (this.spec.startCommand) {
      await this.command(PASCO_DEVICE_SERVICE_ID, this.spec.startCommand);
    }
  }

  public async start(periodMs: number, onSample: (value: number) => void): Promise<void> {
    const { channelCount, dataChannel } = this.spec;
    const dataService = dataChannel + 1;
    const decode = this.spec.createDecoder();
    const packetsSinceAck = new Map<number, number>();
    this.packets = 0;
    this.otherPackets = 0;

    this.transport.packetListener = (serviceId, data) => {
      if (serviceId === PASCO_DEVICE_SERVICE_ID || !isStreamPacket(data)) {
        this.otherPackets++;
        return;
      }
      // Every channel must be acknowledged, wanted or not, or the device stops sending.
      const count = (packetsSinceAck.get(serviceId) ?? 0) + 1;
      if (count >= STREAM_ACK_INTERVAL) {
        packetsSinceAck.set(serviceId, 0);
        this.transport
          .write(serviceId, PASCO_CHARACTERISTIC.STREAM_ACK, streamAckCommand(data[0] ?? 0))
          .catch(() => undefined);
      } else {
        packetsSinceAck.set(serviceId, count);
      }
      if (serviceId === dataService) {
        this.packets++;
        this.lastPacket = Array.from(data, (byte) => byte.toString(16).padStart(2, "0")).join(" ");
        for (const value of decode(data)) {
          onSample(value);
        }
      }
    };

    // A previous session may have left the sampler running.
    await this.command(PASCO_DEVICE_SERVICE_ID, stopSamplingCommand()).catch(() => undefined);
    for (let channel = 0; channel < channelCount; channel++) {
      await this.command(channel + 1, setSamplePeriodCommand(periodMs));
    }
    await this.command(PASCO_DEVICE_SERVICE_ID, startSamplingCommand(periodMs, channelCount));
    this.sampling = true;
  }

  public async disconnect(): Promise<void> {
    this.transport.packetListener = null;
    if (this.sampling) {
      this.sampling = false;
      await this.command(PASCO_DEVICE_SERVICE_ID, stopSamplingCommand()).catch(() => undefined);
    }
    await this.transport.disconnect().catch(() => undefined);
  }

  public onUnexpectedDisconnect(listener: () => void): void {
    this.disconnectListeners.push(listener);
  }

  private command(serviceId: number, packet: readonly number[]): Promise<void> {
    return this.transport.write(serviceId, PASCO_CHARACTERISTIC.SEND_COMMAND, packet);
  }
}
