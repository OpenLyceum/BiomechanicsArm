import { describe, expect, it, vi } from "vitest";
import { TransportKind } from "../src/common/hardware/PascoTransport.js";
import { CONNECTION_LOST, ConnectionState, SensorChannel } from "../src/lab/model/SensorChannel.js";
import { FakeSensorDevice } from "./helpers/FakeSensorDevice.js";

/** A fake device whose connect() and start() wait until the test settles them. */
class DeferredSensorDevice extends FakeSensorDevice {
  public readonly connecting = Promise.withResolvers<void>();
  public readonly starting = Promise.withResolvers<void>();
  public readonly disconnectSpy = vi.fn();

  public override async connect(): Promise<void> {
    await this.connecting.promise;
    await super.connect();
  }

  public override async start(periodMs: number, onSample: (value: number) => void): Promise<void> {
    await super.start(periodMs, onSample);
    await this.starting.promise;
  }

  public override disconnect(): Promise<void> {
    this.disconnectSpy();
    return super.disconnect();
  }
}

const setup = (averagingSamples = 1) => {
  const device = new FakeSensorDevice();
  const channel = new SensorChannel(() => device, { periodMs: 50, averagingSamples });
  return { device, channel };
};

describe("SensorChannel", () => {
  it("connects, names the device and streams at the requested period", async () => {
    const { device, channel } = setup();
    await channel.connect(TransportKind.BLUETOOTH);
    expect(channel.connectionStateProperty.value).toBe(ConnectionState.CONNECTED);
    expect(channel.deviceNameProperty.value).toBe("Fake 000-001");
    expect(channel.transportKindProperty.value).toBe(TransportKind.BLUETOOTH);
    expect(device.periodMs).toBe(50);
    device.emit(1.25);
    expect(channel.valueProperty.value).toBe(1.25);
  });

  it("averages over the window", async () => {
    const { device, channel } = setup(4);
    await channel.connect(TransportKind.USB);
    for (const value of [1, 2, 3, 4]) {
      device.emit(value);
    }
    expect(channel.valueProperty.value).toBeCloseTo(2.5, 12);
    device.emit(5); // window is now 2, 3, 4, 5
    expect(channel.valueProperty.value).toBeCloseTo(3.5, 12);
  });

  it("zeroes at the current reading", async () => {
    const { device, channel } = setup();
    await channel.connect(TransportKind.BLUETOOTH);
    device.emit(0.3);
    channel.zero();
    expect(channel.valueProperty.value).toBe(0);
    device.emit(2.3);
    expect(channel.valueProperty.value).toBeCloseTo(2, 12);
  });

  it("reverses about the zero, and at once", async () => {
    const { device, channel } = setup();
    await channel.connect(TransportKind.BLUETOOTH);
    device.emit(0.3);
    channel.zero();
    device.emit(2.3);
    channel.reversedProperty.value = true;
    expect(channel.valueProperty.value).toBeCloseTo(-2, 12);
    device.emit(0.3);
    expect(Object.is(channel.valueProperty.value, 0)).toBe(true);
  });

  it("returns silently from a cancelled picker", async () => {
    const { device, channel } = setup();
    device.cancel = true;
    await channel.connect(TransportKind.BLUETOOTH);
    expect(channel.connectionStateProperty.value).toBe(ConnectionState.DISCONNECTED);
    expect(channel.errorMessageProperty.value).toBeNull();
  });

  it("reports a failed connection without rejecting", async () => {
    const { device, channel } = setup();
    device.failWith = "GATT Server is disconnected";
    await channel.connect(TransportKind.BLUETOOTH);
    expect(channel.connectionStateProperty.value).toBe(ConnectionState.DISCONNECTED);
    expect(channel.errorMessageProperty.value).toBe("GATT Server is disconnected");
  });

  it("reports a dropped link and ignores late samples", async () => {
    const { device, channel } = setup();
    await channel.connect(TransportKind.BLUETOOTH);
    device.emit(1);
    device.drop();
    expect(channel.connectionStateProperty.value).toBe(ConnectionState.DISCONNECTED);
    expect(channel.errorMessageProperty.value).toBe(CONNECTION_LOST);
    device.emit(9);
    expect(channel.valueProperty.value).toBe(1);
  });

  it("reset clears zero and Reverse direction but keeps the connection", async () => {
    const { device, channel } = setup();
    await channel.connect(TransportKind.BLUETOOTH);
    device.emit(0.5);
    channel.zero();
    channel.reversedProperty.value = true;
    channel.reset();
    expect(channel.isConnected).toBe(true);
    expect(channel.reversedProperty.value).toBe(false);
    expect(channel.valueProperty.value).toBe(0.5);
  });

  it("disconnects", async () => {
    const { device, channel } = setup();
    await channel.connect(TransportKind.BLUETOOTH);
    await channel.disconnect();
    expect(device.connected).toBe(false);
    expect(channel.connectionStateProperty.value).toBe(ConnectionState.DISCONNECTED);
    expect(channel.deviceNameProperty.value).toBeNull();
  });

  describe("an attempt superseded while pending", () => {
    const deferredSetup = () => {
      const devices: DeferredSensorDevice[] = [];
      const channel = new SensorChannel(
        () => {
          const device = new DeferredSensorDevice();
          devices.push(device);
          return device;
        },
        { periodMs: 50, averagingSamples: 1 },
      );
      return { devices, channel };
    };

    it("disconnects its own device when Disconnect lands during connect()", async () => {
      const { devices, channel } = deferredSetup();
      const connecting = channel.connect(TransportKind.BLUETOOTH);
      await channel.disconnect();
      devices[0]!.connecting.resolve();
      await connecting;
      expect(devices[0]!.connected).toBe(false);
      expect(devices[0]!.disconnectSpy).toHaveBeenCalledTimes(2);
      expect(channel.connectionStateProperty.value).toBe(ConnectionState.DISCONNECTED);
      expect(channel.deviceNameProperty.value).toBeNull();
    });

    it("disconnects its own device when Disconnect lands during start()", async () => {
      const { devices, channel } = deferredSetup();
      const connecting = channel.connect(TransportKind.BLUETOOTH);
      devices[0]!.connecting.resolve();
      await vi.waitFor(() => expect(channel.deviceNameProperty.value).toBe("Fake 000-001"));
      await channel.disconnect();
      devices[0]!.starting.resolve();
      await connecting;
      expect(devices[0]!.connected).toBe(false);
      expect(channel.connectionStateProperty.value).toBe(ConnectionState.DISCONNECTED);
    });

    it("leaves a newer attempt alone when the old one finishes or fails late", async () => {
      const { devices, channel } = deferredSetup();
      const first = channel.connect(TransportKind.BLUETOOTH);
      await channel.disconnect();
      const second = channel.connect(TransportKind.USB);
      devices[1]!.connecting.resolve();
      devices[1]!.starting.resolve();
      await second;
      devices[0]!.connecting.reject(new Error("GATT Server is disconnected"));
      await first;
      expect(devices[0]!.disconnectSpy).toHaveBeenCalledTimes(2);
      expect(devices[1]!.disconnectSpy).not.toHaveBeenCalled();
      expect(channel.connectionStateProperty.value).toBe(ConnectionState.CONNECTED);
      expect(channel.errorMessageProperty.value).toBeNull();
      devices[1]!.emit(2);
      expect(channel.valueProperty.value).toBe(2);
    });

    it("disconnects its own device when disposed during connect()", async () => {
      const { devices, channel } = deferredSetup();
      const connecting = channel.connect(TransportKind.BLUETOOTH);
      channel.dispose();
      devices[0]!.connecting.resolve();
      await connecting;
      expect(devices[0]!.connected).toBe(false);
    });
  });
});
