/**
 * formatting.ts
 *
 * Axis helpers for the graph. Pure.
 */

/** A "nice" tick spacing (1, 2 or 5 × 10ⁿ) giving about `targetTicks` ticks across `span`. */
export function niceStep(span: number, targetTicks = 5): number {
  if (!(span > 0 && Number.isFinite(span))) {
    return 1;
  }
  const raw = span / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return nice * magnitude;
}

/** Decimals needed to print multiples of `step` exactly. */
export function decimalsFor(step: number): number {
  return Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
}

/**
 * An axis range that contains zero, the default span and every value, with its
 * ends on multiples of the returned tick spacing. `preferredStep` is used while
 * it gives a readable number of ticks (degrees read better in 30s than in 50s).
 */
export function axisRange(
  values: readonly number[],
  defaultMax: number,
  preferredStep?: number,
): { readonly min: number; readonly max: number; readonly step: number } {
  let low = 0;
  let high = defaultMax;
  for (const value of values) {
    if (Number.isFinite(value)) {
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
  }
  const span = high - low;
  const step = preferredStep !== undefined && span / preferredStep <= 8 ? preferredStep : niceStep(span);
  return {
    min: Math.floor(low / step + 1e-9) * step,
    max: Math.ceil(high / step - 1e-9) * step,
    step,
  };
}
