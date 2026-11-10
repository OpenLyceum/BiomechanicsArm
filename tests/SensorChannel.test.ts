import { describe, expect, it } from "vitest";
import { TransportKind } from "../src/common/hardware/PascoTransport.js";
import { CONNECTION_LOST, ConnectionState, SensorChannel } from "../src/lab/model/SensorChannel.js";
import { FakeSensorDevice } from "./helpers/FakeSensorDevice.js";

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
});
