/**
 * BiomechanicsArmConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in BiomechanicsArmColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 *
 * Physics values here describe the demo arm only; with real sensors the sim
 * reports what it measures and computes nothing from the arm's dimensions.
 */

import BiomechanicsArmNamespace from "./BiomechanicsArmNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

// ── Acquisition ───────────────────────────────────────────────────────────────

/** Default period of the sensors' own samplers, in ms (20 Hz); `?samplePeriod=` overrides it. */
export const DEFAULT_SAMPLE_PERIOD_MS = 50;

/** Readings averaged into each displayed and recorded value (0.5 s at the default period). */
export const AVERAGING_SAMPLES = 10;

/** Most points the data table holds; the handout asks for about ten. */
export const MAX_POINTS = 15;

// ── Demo arm (SI units), from the handout's sample data ───────────────────────

/** Gravitational acceleration, m/s². */
export const GRAVITY = 9.8;

/** Mass of the rod, kg. */
export const DEMO_ROD_MASS = 0.0292;

/** Mass of the brass cylinder, kg. */
export const DEMO_CYLINDER_MASS = 0.0753;

/** Pivot to the rod's centre hole, where the string is tied (L_T), m. */
export const DEMO_STRING_DISTANCE = 0.165;

/** Pivot to the centre of the cylinder (L_C), m. */
export const DEMO_CYLINDER_DISTANCE = 0.3;

/** Reading of the demo force sensor with no load, before it is zeroed, N. */
export const DEMO_FORCE_OFFSET = 0.12;

/** Standard deviation of the demo force sensor's noise, N. */
export const DEMO_FORCE_NOISE = 0.01;

/** Tension at which the demo arm's string would saturate the ±50 N sensor, N. */
export const DEMO_MAX_TENSION = 50;

/** Largest angle the demo slider reaches, degrees from hanging. */
export const DEMO_MAX_ANGLE_DEGREES = 175;

BiomechanicsArmNamespace.register("BiomechanicsArmConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  DEFAULT_SAMPLE_PERIOD_MS,
  AVERAGING_SAMPLES,
  MAX_POINTS,
});
