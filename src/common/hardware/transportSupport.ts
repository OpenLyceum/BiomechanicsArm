/**
 * transportSupport.ts
 *
 * Feature detection for the browser APIs behind each hardware transport, so the
 * sim can say why a wire is unavailable instead of failing at the first click.
 * Web Bluetooth and WebUSB exist only in a secure context (HTTPS or localhost)
 * and only in Chromium-based browsers.
 */

import { TransportKind, type TransportKindValue } from "./PascoTransport.js";

export const TransportStatus = {
  AVAILABLE: "available",
  /** Not a browser (unit test, server-side render). */
  NO_BROWSER: "noBrowser",
  /** Page is not HTTPS or localhost, so the API is hidden. */
  INSECURE_CONTEXT: "insecureContext",
  /** Browser does not implement the API (Firefox, Safari). */
  UNSUPPORTED_BROWSER: "unsupportedBrowser",
} as const;

export type TransportStatusValue = (typeof TransportStatus)[keyof typeof TransportStatus];

export function getTransportStatus(kind: TransportKindValue): TransportStatusValue {
  if (kind === TransportKind.DEMO) {
    return TransportStatus.AVAILABLE;
  }
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return TransportStatus.NO_BROWSER;
  }
  if (!window.isSecureContext) {
    return TransportStatus.INSECURE_CONTEXT;
  }
  const hasApi = kind === TransportKind.USB ? navigator.usb !== undefined : navigator.bluetooth !== undefined;
  return hasApi ? TransportStatus.AVAILABLE : TransportStatus.UNSUPPORTED_BROWSER;
}

export function isTransportAvailable(kind: TransportKindValue): boolean {
  return getTransportStatus(kind) === TransportStatus.AVAILABLE;
}
