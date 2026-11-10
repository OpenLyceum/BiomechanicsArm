/**
 * BiomechanicsArmColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import BiomechanicsArmColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import BiomechanicsArmColors from "../../BiomechanicsArmColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: BiomechanicsArmColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the BiomechanicsArmColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import BiomechanicsArmNamespace from "./BiomechanicsArmNamespace.js";

const BiomechanicsArmColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Lab screen ───────────────────────────────────────────────────────────────

  /** Force sensor: panel title, tension axis, string in the diagram. */
  forceColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "force", {
    default: "#ffb74d",
    projector: "#b45309",
  }),

  /** Rotary motion sensor: panel title, angle axis, angle arc in the diagram. */
  angleColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "angle", {
    default: "#81d4fa",
    projector: "#0b5c8a",
  }),

  /** Errors and diagnostics. */
  warningColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "warning", {
    default: "#ff8a80",
    projector: "#b71c1c",
  }),

  /** Background of the graph, the readouts, the table and the arm diagram. */
  chartBackgroundColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "chartBackground", {
    default: "#0d1326",
    projector: "#ffffff",
  }),

  /** Grid lines of the graph and row rules of the table. */
  chartGridColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "chartGrid", {
    default: "#3a4668",
    projector: "#cccccc",
  }),

  /** Recorded points on the graph. */
  pointColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "point", {
    default: "#fff176",
    projector: "#1a1a2e",
  }),

  /** Marker at the live reading on the graph. */
  liveMarkerColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "liveMarker", {
    default: "#69f0ae",
    projector: "#1b7a43",
  }),

  /** The rod in the arm diagram. */
  rodColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "rod", {
    default: "#cfd8dc",
    projector: "#263238",
  }),

  /** The brass cylinder in the arm diagram. */
  cylinderColorProperty: new ProfileColorProperty(BiomechanicsArmNamespace, "cylinder", {
    default: "#d4af37",
    projector: "#a67c00",
  }),
};

export default BiomechanicsArmColors;
