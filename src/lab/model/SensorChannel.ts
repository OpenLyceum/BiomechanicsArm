/**
 * SensorChannel.ts
 *
 * One sensor as the student sees it: its connection, a steady reading, a Zero
 * button and a Reverse direction setting.
 *
 * ── Reading ───────────────────────────────────────────────────────────────────
 * The sensor streams on its own clock. Each sample goes into a short rolling
 * window, and the reading is
 *
 *   value = sign × (mean of window − zero offset)
 *
 * so zeroing and then reversing leaves zero where the student put it.
 *
 * ── Errors never reach the caller ─────────────────────────────────────────────
 * `connect()` resolves even when it fails (pattern from CartCollisions
 * `SmartCartChannel`): the button listener stays synchronous, and every outcome
 * lands on `connectionStateProperty` / `errorMessageProperty` for the panel to
 * show. A cancelled picker returns to DISCONNECTED with no message.
 */

import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { AVERAGING_SAMPLES, DEFAULT_SAMPLE_PERIOD_MS } from "../../BiomechanicsArmConstants.js";
import BiomechanicsArmNamespace from "../../BiomechanicsArmNamespace.js";
import { DeviceSelectionCancelled, type TransportKindValue } from "../../common/hardware/PascoTransport.js";
import type { TSensorDevice } from "../../common/hardware/SensorDevice.js";

export const ConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
} as const;

export type ConnectionStateValue = (typeof ConnectionState)[keyof typeof ConnectionState];

/** `errorMessageProperty` value meaning the link dropped on its own (the view localizes it). */
export const CONNECTION_LOST = "disconnected";

/** Builds a fresh device for one connection over the given wire. */
export type SensorDeviceFactory = (kind: TransportKindValue) => TSensorDevice;

export type SensorChannelOptions = {
  readonly periodMs?: number;
  readonly averagingSamples?: number;
};

export class SensorChannel {
  public readonly connectionStateProperty = new Property<ConnectionStateValue>(ConnectionState.DISCONNECTED);
  public readonly deviceNameProperty = new Property<string | null>(null);
  public readonly errorMessageProperty = new Property<string | null>(null);

  /** Which wire the current (or last) connection uses. */
  public readonly transportKindProperty = new Property<TransportKindValue | null>(null);

  /** The student's Reverse direction setting. */
  public readonly reversedProperty = new BooleanProperty(false);

  /** The reading: averaged, relative to the last zero, after Reverse direction. SI units. */
  public readonly valueProperty = new NumberProperty(0);

  /** Packet counts and raw bytes, refreshed about once a second, for `?showDiagnostics`. */
  public readonly diagnosticProperty = new Property<string>("");

  private readonly createDevice: SensorDeviceFactory;
  private readonly periodMs: number;
  private readonly averagingSamples: number;
  private device: TSensorDevice | null = null;
  private readonly window: number[] = [];
  private zeroOffset = 0;
  private samplesSinceDiagnostic = 0;

  public constructor(createDevice: SensorDeviceFactory, options?: SensorChannelOptions) {
    this.createDevice = createDevice;
    this.periodMs = options?.periodMs ?? DEFAULT_SAMPLE_PERIOD_MS;
    this.averagingSamples = options?.averagingSamples ?? AVERAGING_SAMPLES;
    // Lazy so that toggling Reverse direction updates a held reading at once.
    this.reversedProperty.lazyLink(() => this.publish());
  }

  public get isConnected(): boolean {
    return this.connectionStateProperty.value === ConnectionState.CONNECTED;
  }

  public async connect(kind: TransportKindValue): Promise<void> {
    if (this.connectionStateProperty.value !== ConnectionState.DISCONNECTED) {
      return;
    }
    this.errorMessageProperty.value = null;
    this.connectionStateProperty.value = ConnectionState.CONNECTING;
    this.transportKindProperty.value = kind;
    try {
      const device = this.createDevice(kind);
      device.onUnexpectedDisconnect(() => {
        if (this.device === device) {
          this.device = null;
          this.connectionStateProperty.value = ConnectionState.DISCONNECTED;
          this.deviceNameProperty.value = null;
          this.errorMessageProperty.value = CONNECTION_LOST;
        }
      });
      this.device = device;
      await device.connect();
      this.deviceNameProperty.value = device.name;
      this.window.length = 0;
      this.zeroOffset = 0;
      await device.start(this.periodMs, (value) => {
        if (this.device === device) {
          this.accept(value);
        }
      });
      this.connectionStateProperty.value = ConnectionState.CONNECTED;
    } catch (error) {
      const device = this.device;
      this.device = null;
      await device?.disconnect().catch(() => undefined);
      this.connectionStateProperty.value = ConnectionState.DISCONNECTED;
      this.deviceNameProperty.value = null;
      if (!(error instanceof DeviceSelectionCancelled)) {
        this.errorMessageProperty.value = error instanceof Error ? error.message : String(error);
      }
    }
  }

  public async disconnect(): Promise<void> {
    const device = this.device;
    this.device = null;
    try {
      await device?.disconnect();
    } finally {
      this.connectionStateProperty.value = ConnectionState.DISCONNECTED;
      this.deviceNameProperty.value = null;
    }
  }

  /** One raw sample from the device. Public so tests can feed readings directly. */
  public accept(rawValue: number): void {
    this.window.push(rawValue);
    if (this.window.length > this.averagingSamples) {
      this.window.shift();
    }
    this.publish();

    this.samplesSinceDiagnostic++;
    if (this.samplesSinceDiagnostic * this.periodMs >= 1000) {
      this.samplesSinceDiagnostic = 0;
      this.diagnosticProperty.value = this.device?.diagnostic ?? "";
    }
  }

  /** Makes the current reading the new zero. */
  public zero(): void {
    this.zeroOffset = this.rawMean();
    this.publish();
  }

  private rawMean(): number {
    if (this.window.length === 0) {
      return 0;
    }
    let sum = 0;
    for (const value of this.window) {
      sum += value;
    }
    return sum / this.window.length;
  }

  private publish(): void {
    const sign = this.reversedProperty.value ? -1 : 1;
    // `+ 0` so a reversed zero reads 0, not −0.
    this.valueProperty.value = sign * (this.rawMean() - this.zeroOffset) + 0;
  }

  /** Reset All: clears the zero and Reverse direction; the connection is kept. */
  public reset(): void {
    this.zeroOffset = 0;
    this.reversedProperty.reset();
    this.publish();
  }

  public dispose(): void {
    this.device?.disconnect().catch(() => undefined);
    this.device = null;
    this.connectionStateProperty.dispose();
    this.deviceNameProperty.dispose();
    this.errorMessageProperty.dispose();
    this.transportKindProperty.dispose();
    this.reversedProperty.dispose();
    this.valueProperty.dispose();
    this.diagnosticProperty.dispose();
  }
}

BiomechanicsArmNamespace.register("SensorChannel", SensorChannel);
