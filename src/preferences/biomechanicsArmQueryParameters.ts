/**
 * biomechanicsArmQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in BiomechanicsArmPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?demo` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import { DEFAULT_SAMPLE_PERIOD_MS } from "../BiomechanicsArmConstants.js";
import BiomechanicsArmNamespace from "../BiomechanicsArmNamespace.js";

const biomechanicsArmQueryParameters = QueryStringMachine.getAll({
  /**
   * Start with the simulated sensors offered, so the sim can be tried with no
   * hardware. Also a preference (Preferences → Simulation).
   */
  demo: {
    type: "flag",
    public: true,
  },

  /** Period of the sensors' own samplers, in milliseconds. */
  samplePeriod: {
    type: "number",
    defaultValue: DEFAULT_SAMPLE_PERIOD_MS,
    isValidValue: (value: number) => value >= 5 && value <= 1000,
    public: true,
  },

  /** Show packet counts and raw bytes under each sensor, and log USB bring-up to the console. */
  showDiagnostics: {
    type: "flag",
  },
});

BiomechanicsArmNamespace.register("biomechanicsArmQueryParameters", biomechanicsArmQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default biomechanicsArmQueryParameters;
