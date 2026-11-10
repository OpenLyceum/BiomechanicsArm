/**
 * FakeSensorDevice.ts
 *
 * A sensor that never leaves the test process: connects at once (or reports a
 * cancelled picker or a failure), and emits whatever samples the test sends.
 */

import { DeviceSelectionCancelled } from "../../src/common/hardware/PascoTransport.js";
import type { TSensorDevice } from "../../src/common/hardware/SensorDevice.js";

export class FakeSensorDevice implements TSensorDevice {
  public readonly diagnostic = "fake";
  public connected = false;
  public cancel = false;
  public failWith: string | null = null;
  public periodMs = 0;
  private onSample: ((value: number) => void) | null = null;
  private readonly disconnectListeners: (() => void)[] = [];

  public get name(): string | null {
    return this.connected ? "Fake 000-001" : null;
  }

  public connect(): Promise<void> {
    if (this.cancel) {
      return Promise.reject(new DeviceSelectionCancelled());
    }
    if (this.failWith !== null) {
      return Promise.reject(new Error(this.failWith));
    }
    this.connected = true;
    return Promise.resolve();
  }

  public start(periodMs: number, onSample: (value: number) => void): Promise<void> {
    this.periodMs = periodMs;
    this.onSample = onSample;
    return Promise.resolve();
  }

  public disconnect(): Promise<void> {
    this.connected = false;
    this.onSample = null;
    return Promise.resolve();
  }

  public onUnexpectedDisconnect(listener: () => void): void {
    this.disconnectListeners.push(listener);
  }

  /** Sends one sample, as the sensor would. */
  public emit(value: number): void {
    this.onSample?.(value);
  }

  /** Drops the link, as pulling the battery would. */
  public drop(): void {
    this.connected = false;
    for (const listener of this.disconnectListeners) {
      listener();
    }
  }
}
