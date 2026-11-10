import { describe, expect, it } from "vitest";
import { PASCO_CHARACTERISTIC } from "../src/common/hardware/PascoProtocol.js";
import type { PacketListener, TPascoTransport } from "../src/common/hardware/PascoTransport.js";
import { FORCE_SENSOR_SPEC, PascoSensorDevice, ROTARY_SENSOR_SPEC } from "../src/common/hardware/SensorDevice.js";

type Write = { serviceId: number; characteristicId: number; packet: number[] };

class FakeTransport implements TPascoTransport {
  public isConnected = false;
  public name: string | null = null;
  public packetListener: PacketListener | null = null;
  public disconnectListener: (() => void) | null = null;
  public readonly writes: Write[] = [];
  public connectArguments: [string, number] | null = null;

  public connect(namePrefix: string, serviceCount: number): Promise<void> {
    this.connectArguments = [namePrefix, serviceCount];
    this.isConnected = true;
    this.name = `${namePrefix} 123-456`;
    return Promise.resolve();
  }

  public disconnect(): Promise<void> {
    this.isConnected = false;
    return Promise.resolve();
  }

  public write(serviceId: number, characteristicId: number, packet: readonly number[]): Promise<void> {
    this.writes.push({ serviceId, characteristicId, packet: [...packet] });
    return Promise.resolve();
  }

  public push(serviceId: number, bytes: number[]): void {
    this.packetListener?.(serviceId, Uint8Array.from(bytes));
  }
}

const commands = (transport: FakeTransport) =>
  transport.writes
    .filter((write) => write.characteristicId === PASCO_CHARACTERISTIC.SEND_COMMAND)
    .map((write) => [write.serviceId, write.packet[0]]);

describe("PascoSensorDevice", () => {
  it("starts the rotary sensor and accumulates its counts into radians", async () => {
    const transport = new FakeTransport();
    const device = new PascoSensorDevice(transport, ROTARY_SENSOR_SPEC);
    await device.connect();
    expect(transport.connectArguments).toEqual(["Rotary Motion", 2]);
    expect(device.name).toBe("Rotary Motion 123-456");

    const samples: number[] = [];
    await device.start(50, (value) => samples.push(value));
    // keepalive, rotary start, stop, set period on the sensor service, start sampling
    expect(commands(transport)).toEqual([
      [0, 0x00],
      [0, 0x37],
      [0, 0x07],
      [1, 0x01],
      [0, 0x06],
    ]);

    transport.push(1, [0x00, 0xf4, 0x01]); // +500 counts
    transport.push(1, [0x01, 0xf4, 0x01]); // +500 counts
    transport.push(1, [0x02, 0x0c, 0xfe]); // −500 counts
    expect(samples).toHaveLength(3);
    expect(samples[0]).toBeCloseTo(Math.PI / 2, 10);
    expect(samples[1]).toBeCloseTo(Math.PI, 10);
    expect(samples[2]).toBeCloseTo(Math.PI / 2, 10);
  });

  it("sets up all three force-sensor channels but reports only force", async () => {
    const transport = new FakeTransport();
    const device = new PascoSensorDevice(transport, FORCE_SENSOR_SPEC);
    await device.connect();
    const samples: number[] = [];
    await device.start(50, (value) => samples.push(value));
    expect(commands(transport)).toEqual([
      [0, 0x00],
      [0, 0x07],
      [1, 0x01],
      [2, 0x01],
      [3, 0x01],
      [0, 0x06],
    ]);
    expect(transport.writes.at(-1)?.packet).toHaveLength(7);

    transport.push(1, [0x00, 0x88, 0x13]); // 5000 → 50 N
    transport.push(2, [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06]); // acceleration: ignored
    transport.push(0, [0xc0, 0x00, 0x06]); // reply: ignored
    expect(samples).toHaveLength(1);
    expect(samples[0]).toBeCloseTo(50, 10);
  });

  it("acknowledges every eighth packet on each service", async () => {
    const transport = new FakeTransport();
    const device = new PascoSensorDevice(transport, FORCE_SENSOR_SPEC);
    await device.connect();
    await device.start(50, () => undefined);
    for (let sequence = 0; sequence < 16; sequence++) {
      transport.push(1, [sequence, 0x00, 0x80]);
      transport.push(2, [sequence, 0, 0, 0, 0, 0, 0]);
    }
    const acks = transport.writes.filter((write) => write.characteristicId === PASCO_CHARACTERISTIC.STREAM_ACK);
    expect(acks.map((ack) => [ack.serviceId, ack.packet[4]])).toEqual([
      [1, 7],
      [2, 7],
      [1, 15],
      [2, 15],
    ]);
  });

  it("stops the sampler on disconnect and reports a dropped link", async () => {
    const transport = new FakeTransport();
    const device = new PascoSensorDevice(transport, ROTARY_SENSOR_SPEC);
    let dropped = 0;
    device.onUnexpectedDisconnect(() => dropped++);
    await device.connect();
    await device.start(50, () => undefined);
    transport.writes.length = 0;
    await device.disconnect();
    expect(commands(transport)).toEqual([[0, 0x07]]);
    expect(transport.isConnected).toBe(false);

    transport.disconnectListener?.();
    expect(dropped).toBe(1);
  });
});
