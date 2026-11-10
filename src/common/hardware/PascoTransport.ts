/**
 * PascoTransport.ts
 *
 * What a PASCO wireless sensor needs from the wire, independent of which wire.
 * Web Bluetooth and WebUSB carry the same packets (see PascoProtocol.ts), so the
 * difference stops at this interface and never reaches the sensor logic, the
 * model or the view.
 */

export const TransportKind = {
  BLUETOOTH: "bluetooth",
  USB: "usb",
  /** The built-in simulated arm (`?demo`), which needs no hardware. */
  DEMO: "demo",
} as const;

export type TransportKindValue = (typeof TransportKind)[keyof typeof TransportKind];

/** Thrown when the user dismisses the browser's device picker. Not a failure. */
export class DeviceSelectionCancelled extends Error {}

/** Called for every packet the device sends, with the service it came from. */
export type PacketListener = (serviceId: number, data: Uint8Array) => void;

export interface TPascoTransport {
  readonly isConnected: boolean;

  /** Advertised or product name, or null before a connection exists. */
  readonly name: string | null;

  /** Receives every packet while connected. Set before `connect()`. */
  packetListener: PacketListener | null;

  /** Called when the link drops without `disconnect()` having been asked for. */
  disconnectListener: (() => void) | null;

  /**
   * Opens the browser's picker and connects. Must reach the picker before any
   * `await`, so the button's user gesture still counts.
   *
   * @param namePrefix - advertised-name prefix to list (Bluetooth only)
   * @param serviceCount - how many services (device + sensors) to open
   */
  connect(namePrefix: string, serviceCount: number): Promise<void>;

  disconnect(): Promise<void>;

  /** Writes one packet to a characteristic of a service. */
  write(serviceId: number, characteristicId: number, packet: readonly number[]): Promise<void>;
}
