import { afterEach, describe, expect, it, vi } from "vitest";
import { BluetoothPascoTransport } from "../src/common/hardware/BluetoothPascoTransport.js";
import { PASCO_CHARACTERISTIC, pascoUuid } from "../src/common/hardware/PascoProtocol.js";

/** A notifying characteristic that tracks its listeners; startNotifications() waits on the test. */
const fakeCharacteristic = (serviceId: number) => {
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const starting = Promise.withResolvers<void>();
  return {
    starting,
    listeners,
    characteristic: {
      uuid: pascoUuid(serviceId, PASCO_CHARACTERISTIC.STREAM_DATA),
      properties: { notify: true },
      addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener)),
      removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) =>
        listeners.delete(listener),
      ),
      startNotifications: vi.fn(() => starting.promise),
    },
  };
};

const stubBluetooth = (characteristic: ReturnType<typeof fakeCharacteristic>["characteristic"]) => {
  const server = {
    connected: true,
    disconnect: vi.fn(() => {
      server.connected = false;
    }),
    getPrimaryService: vi.fn(() => Promise.resolve({ getCharacteristics: () => Promise.resolve([characteristic]) })),
  };
  const device = {
    name: "Force 000-001",
    gatt: { connect: () => Promise.resolve(server) },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: { requestDevice: () => Promise.resolve(device) },
  });
  return server;
};

describe("BluetoothPascoTransport notifications", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "bluetooth");
  });

  it("removes the listener of a characteristic whose notifications fail to start", async () => {
    const fake = fakeCharacteristic(0);
    stubBluetooth(fake.characteristic);
    const transport = new BluetoothPascoTransport();
    const connecting = transport.connect("Force", 1);
    await vi.waitFor(() => expect(fake.characteristic.startNotifications).toHaveBeenCalledOnce());
    expect(fake.listeners.size).toBe(1);
    fake.starting.reject(new Error("GATT operation failed"));
    await expect(connecting).rejects.toThrow("GATT operation failed");
    expect(fake.listeners.size).toBe(0);
  });

  it("removes the listener when disconnect() lands while notifications are starting", async () => {
    const fake = fakeCharacteristic(0);
    const server = stubBluetooth(fake.characteristic);
    const transport = new BluetoothPascoTransport();
    const connecting = transport.connect("Force", 1);
    await vi.waitFor(() => expect(fake.characteristic.startNotifications).toHaveBeenCalledOnce());
    await transport.disconnect();
    expect(fake.listeners.size).toBe(0);
    expect(server.disconnect).toHaveBeenCalledOnce();
    fake.starting.resolve();
    await connecting;
    expect(fake.listeners.size).toBe(0);
  });
});
