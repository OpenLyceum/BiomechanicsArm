/**
 * PascoProtocol.ts
 *
 * Dependency-free PASCO wireless-sensor wire protocol, as pure functions, for the
 * two sensors this lab uses:
 *
 *   Wireless Force Acceleration Sensor PS-3202 (interface 1028)
 *     channel 0 → sensor 2023, force:  unsigned 16-bit raw, factory line
 *                 (32768 → 0 N) and (5000 → 50 N)
 *     channel 1 → accelerometer, channel 2 → gyroscope (acknowledged, not decoded)
 *   Wireless Rotary Motion Sensor PS-3220 (interface 1041)
 *     channel 0 → sensor 2047, angle:  signed 16-bit count *change* per sample,
 *                 2000 counts per revolution
 *
 * Sensor ids and calibration constants come from the datasheets in
 * OpenPhysics/pascoTS (`src/datasheets.ts`); the sampling commands are the ones
 * MotionSensor and CartCollisions already use with real hardware.
 *
 * ── Addressing ────────────────────────────────────────────────────────────────
 * A device has a "device service" (id 0) and one "sensor service" per channel
 * (id = channel + 1). Each service has the characteristics below. Over Bluetooth
 * these are GATT UUIDs; over USB the same packets travel behind a two-byte
 * `[service, characteristic]` header.
 *
 * ── Periodic sampling ─────────────────────────────────────────────────────────
 *   sensor service, SEND_COMMAND: [0x01, period µs (u32 LE), 0, 0]   set period
 *   device service, SEND_COMMAND: [0x06, period ms (u16 LE) × channels] start
 *   device service, SEND_COMMAND: [0x07]                              stop
 *   sensor service, notification: [sequence (< 0x20), sample, …]     data
 *   sensor service, STREAM_ACK:   [0, 0, 0, 0, sequence]             every 8 packets
 */

const UUID_PREFIX = "4a5c000";
const UUID_SUFFIX = "5c1e741f1c00";

export const PASCO_CHARACTERISTIC = {
  SERVICE: 0,
  SEND_COMMAND: 2,
  RECEIVE: 3,
  STREAM_DATA: 4,
  STREAM_ACK: 5,
} as const;

export const PASCO_DEVICE_SERVICE_ID = 0;

const SET_SAMPLE_PERIOD = 0x01;
const START_SAMPLING = 0x06;
const STOP_SAMPLING = 0x07;
const RESULT = 0xc0;

/** Streamed packets carry a five-bit sequence number; anything at or above is a reply or event. */
export const STREAM_SEQUENCE_MODULUS = 0x20;

/** Acknowledge every this many packets per service, or the device stops sending. */
export const STREAM_ACK_INTERVAL = 8;

/** The Wireless Rotary Motion Sensor needs this on the device service before it reports counts. */
export const ROTARY_MOTION_START_COMMAND: readonly number[] = [0x37, 0x01, 0x00];

/** Encoder counts per revolution of the PS-3220 (datasheet `RotaryPos` 6.28319 / 2000). */
export const ROTARY_COUNTS_PER_REVOLUTION = 2000;

/** Factory calibration of the PS-3202 force channel: two (raw, newtons) points. */
const FORCE_RAW_AT_ZERO = 32768;
const FORCE_RAW_AT_REFERENCE = 5000;
const FORCE_REFERENCE_NEWTONS = 50;

export function pascoUuid(serviceId: number, characteristicId: number): string {
  return `${UUID_PREFIX}${serviceId}-000${characteristicId}-0000-0000-${UUID_SUFFIX}`;
}

/** `[service, characteristic]` of a PASCO UUID, or null for anything else. */
export function parsePascoUuid(uuid: string): { serviceId: number; characteristicId: number } | null {
  const lower = uuid.toLowerCase();
  if (!(lower.startsWith(UUID_PREFIX) && lower.endsWith(UUID_SUFFIX)) || lower.length !== 36) {
    return null;
  }
  const serviceId = Number.parseInt(lower.charAt(7), 16);
  const characteristicId = Number.parseInt(lower.slice(9, 13), 16);
  if (Number.isNaN(serviceId) || Number.isNaN(characteristicId)) {
    return null;
  }
  return { serviceId, characteristicId };
}

/** Device-service keepalive sent once the link is up. */
export function keepaliveCommand(): number[] {
  return [0x00];
}

export function setSamplePeriodCommand(periodMilliseconds: number): number[] {
  const us = Math.round(periodMilliseconds * 1000);
  return [SET_SAMPLE_PERIOD, us & 0xff, (us >>> 8) & 0xff, (us >>> 16) & 0xff, (us >>> 24) & 0xff, 0, 0];
}

/** One period per channel, in channel order. */
export function startSamplingCommand(periodMilliseconds: number, channelCount: number): number[] {
  const ms = Math.round(periodMilliseconds) & 0x7ff;
  const bytes = [START_SAMPLING];
  for (let i = 0; i < channelCount; i++) {
    bytes.push(ms & 0xff, (ms >>> 8) & 0xff);
  }
  return bytes;
}

export function stopSamplingCommand(): number[] {
  return [STOP_SAMPLING];
}

export function streamAckCommand(sequence: number): number[] {
  return [0, 0, 0, 0, sequence & (STREAM_SEQUENCE_MODULUS - 1)];
}

/** True for a streamed data packet (as opposed to a command reply or an event). */
export function isStreamPacket(data: Uint8Array): boolean {
  return data.length >= 3 && (data[0] ?? 0xff) < STREAM_SEQUENCE_MODULUS;
}

/** Raw force count → newtons on the factory line. */
export function rawForceToNewtons(raw: number): number {
  return ((FORCE_RAW_AT_ZERO - raw) * FORCE_REFERENCE_NEWTONS) / (FORCE_RAW_AT_ZERO - FORCE_RAW_AT_REFERENCE);
}

/** Forces in N in a streamed force packet (after the sequence byte). */
export function decodeForceSamples(data: Uint8Array): number[] {
  const forces: number[] = [];
  for (let i = 1; i + 1 < data.length; i += 2) {
    forces.push(rawForceToNewtons((data[i] ?? 0) | ((data[i + 1] ?? 0) << 8)));
  }
  return forces;
}

/** Signed encoder count changes in a streamed rotary packet (after the sequence byte). */
export function decodeCountChanges(data: Uint8Array): number[] {
  const changes: number[] = [];
  for (let i = 1; i + 1 < data.length; i += 2) {
    const value = (data[i] ?? 0) | ((data[i + 1] ?? 0) << 8);
    changes.push(value >= 0x8000 ? value - 0x10000 : value);
  }
  return changes;
}

export function countsToRadians(counts: number): number {
  return (counts * 2 * Math.PI) / ROTARY_COUNTS_PER_REVOLUTION;
}

// ── USB envelope ──────────────────────────────────────────────────────────────
// Over USB the packets are unchanged; they gain a two-byte header naming the
// service and characteristic GATT would have addressed (see MotionSensor's
// doc/implementation-notes.md, recovered there for the PS-3219).

/** One transfer cannot exceed 64 bytes, two of which are the header. */
const USB_MAXIMUM_PAYLOAD_BYTES = 62;

/** `[service, characteristic, ...packet]` — a write to that characteristic. */
export function usbWriteFrame(serviceId: number, characteristicId: number, packet: readonly number[]): Uint8Array {
  return Uint8Array.from([serviceId, characteristicId, ...packet.slice(0, USB_MAXIMUM_PAYLOAD_BYTES)]);
}

/**
 * Splits a USB IN transfer into the service it came from and the PASCO packet.
 * A transfer that already starts with a result byte is passed through whole as
 * a device-service packet rather than truncated.
 */
export function parseUsbTransfer(transfer: Uint8Array): { serviceId: number; data: Uint8Array } | null {
  if (transfer.length >= 3 && transfer[0] === RESULT) {
    return { serviceId: PASCO_DEVICE_SERVICE_ID, data: transfer };
  }
  if (transfer.length < 3) {
    return null;
  }
  return { serviceId: (transfer[0] ?? 0) & 0x7f, data: transfer.subarray(2) };
}
