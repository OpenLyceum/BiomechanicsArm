/**
 * dataCsv.ts
 *
 * The recorded points as CSV text, ready to open in Excel. Pure, so it can be
 * tested without a browser.
 */

import { toFixed } from "scenerystack/dot";

export type DataPoint = {
  /** Sensor angle in degrees, after zero and Reverse direction. */
  readonly angleDegrees: number;
  /** String tension in newtons, after zero and Reverse direction. */
  readonly forceNewtons: number;
};

export const ANGLE_DECIMALS = 1;
export const FORCE_DECIMALS = 2;

/** One extra decimal in the file, so the spreadsheet is not limited by the display. */
const CSV_EXTRA_DECIMALS = 1;

const quote = (text: string): string => `"${text.replace(/"/g, '""')}"`;

export function dataCsv(points: readonly DataPoint[], angleHeading: string, forceHeading: string): string {
  const lines = [`${quote("#")},${quote(angleHeading)},${quote(forceHeading)}`];
  points.forEach((point, index) => {
    lines.push(
      [
        index + 1,
        toFixed(point.angleDegrees, ANGLE_DECIMALS + CSV_EXTRA_DECIMALS),
        toFixed(point.forceNewtons, FORCE_DECIMALS + CSV_EXTRA_DECIMALS),
      ].join(","),
    );
  });
  return `${lines.join("\r\n")}\r\n`;
}
