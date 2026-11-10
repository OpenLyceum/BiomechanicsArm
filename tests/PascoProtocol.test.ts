import { describe, expect, it } from "vitest";
import {
  countsToRadians,
  decodeCountChanges,
  decodeForceSamples,
  isStreamPacket,
  parsePascoUuid,
  parseUsbTransfer,
  pascoUuid,
  rawForceToNewtons,
  setSamplePeriodCommand,
  startSamplingCommand,
  streamAckCommand,
  usbWriteFrame,
} from "../src/common/hardware/PascoProtocol.js";

describe("PASCO UUIDs", () => {
  it("round-trips service and characteristic", () => {
    const uuid = pascoUuid(1, 4);
    expect(uuid).toBe("4a5c0001-0004-0000-0000-5c1e741f1c00");
    expect(parsePascoUuid(uuid)).toEqual({ serviceId: 1, characteristicId: 4 });
    expect(parsePascoUuid(uuid.toUpperCase())).toEqual({ serviceId: 1, characteristicId: 4 });
  });

  it("rejects other UUIDs", () => {
    expect(parsePascoUuid("0000180f-0000-1000-8000-00805f9b34fb")).toBeNull();
  });
});

describe("sampling commands", () => {
  it("encodes the sample period in microseconds, little-endian", () => {
    // 50 ms = 50 000 µs = 0x00C350
    expect(setSamplePeriodCommand(50)).toEqual([0x01, 0x50, 0xc3, 0x00, 0x00, 0, 0]);
  });

  it("sends one millisecond period per channel", () => {
    expect(startSamplingCommand(50, 1)).toEqual([0x06, 50, 0]);
    expect(startSamplingCommand(50, 3)).toEqual([0x06, 50, 0, 50, 0, 50, 0]);
  });

  it("acknowledges with the five-bit sequence number", () => {
    expect(streamAckCommand(0x1f)).toEqual([0, 0, 0, 0, 0x1f]);
    expect(streamAckCommand(0x27)).toEqual([0, 0, 0, 0, 0x07]);
  });

  it("tells stream packets from replies", () => {
    expect(isStreamPacket(Uint8Array.from([0x05, 0x00, 0x80]))).toBe(true);
    expect(isStreamPacket(Uint8Array.from([0xc0, 0x00, 0x06]))).toBe(false);
    expect(isStreamPacket(Uint8Array.from([0x05]))).toBe(false);
  });
});

describe("force decoding", () => {
  it("follows the factory line through (32768, 0 N) and (5000, 50 N)", () => {
    expect(rawForceToNewtons(32768)).toBe(0);
    expect(rawForceToNewtons(5000)).toBeCloseTo(50, 10);
    expect(rawForceToNewtons(32768 + (32768 - 5000))).toBeCloseTo(-50, 10);
  });

  it("reads every little-endian sample after the sequence byte", () => {
    // 32768 = 0x8000, 5000 = 0x1388
    const forces = decodeForceSamples(Uint8Array.from([0x03, 0x00, 0x80, 0x88, 0x13]));
    expect(forces).toHaveLength(2);
    expect(forces[0]).toBe(0);
    expect(forces[1]).toBeCloseTo(50, 10);
  });
});

describe("rotary decoding", () => {
  it("reads signed count changes", () => {
    // +500, −500 (0xFE0C)
    expect(decodeCountChanges(Uint8Array.from([0x00, 0xf4, 0x01, 0x0c, 0xfe]))).toEqual([500, -500]);
  });

  it("counts 2000 per revolution", () => {
    expect(countsToRadians(2000)).toBeCloseTo(2 * Math.PI, 12);
    expect(countsToRadians(-500)).toBeCloseTo(-Math.PI / 2, 12);
  });
});

describe("USB envelope", () => {
  it("prefixes writes with service and characteristic", () => {
    expect(Array.from(usbWriteFrame(1, 2, [0x01, 0x02]))).toEqual([1, 2, 0x01, 0x02]);
  });

  it("strips the header from reads", () => {
    const packet = parseUsbTransfer(Uint8Array.from([1, 4, 0x05, 0x00, 0x80]));
    expect(packet?.serviceId).toBe(1);
    expect(Array.from(packet?.data ?? [])).toEqual([0x05, 0x00, 0x80]);
  });

  it("passes a bare result packet through as a device-service packet", () => {
    const packet = parseUsbTransfer(Uint8Array.from([0xc0, 0x00, 0x06]));
    expect(packet?.serviceId).toBe(0);
    expect(packet?.data).toHaveLength(3);
  });
});
