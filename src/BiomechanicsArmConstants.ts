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

/** Settings for common/BiomechanicsArmControlOptions.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const BIOMECHANICS_ARM_CONTROL_OPTIONS_SETTINGS = {
  SLIDER_THUMB_SIZE_WIDTH: 12,
  SLIDER_THUMB_SIZE_HEIGHT: 22,
  STANDALONE_SLIDER_TRACK_SIZE_WIDTH: 150,
  STANDALONE_SLIDER_TRACK_SIZE_HEIGHT: 3,
  NUMBER_CONTROL_SLIDER_TRACK_SIZE_WIDTH: 110,
  NUMBER_CONTROL_SLIDER_TRACK_SIZE_HEIGHT: 3,
  CHECKBOX_BOX_WIDTH: 16,
  /** Biomechanics arm number control options scale (dimensionless). */
  BIOMECHANICS_ARM_NUMBER_CONTROL_OPTIONS_SCALE: 0.75,
  BIOMECHANICS_ARM_NUMBER_CONTROL_OPTIONS_SLIDER_PADDING: 4,
  BIOMECHANICS_ARM_NUMBER_CONTROL_OPTIONS_ARROW_BUTTON_SPACING: 3,
  BIOMECHANICS_ARM_NUMBER_CONTROL_OPTIONS_VERTICAL_SPACING: 4,
  BIOMECHANICS_ARM_CHECKBOX_OPTIONS_SPACING: 4,
} as const;

/** Settings for common/BiomechanicsArmPanel.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const BIOMECHANICS_ARM_PANEL_SETTINGS = {
  OPTIONS_X_MARGIN: 12,
  OPTIONS_Y_MARGIN: 10,
} as const;

/** Settings for common/BiomechanicsArmScreenIcons.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS = {
  CREATE_LAB_ICON_START_X_SEGMENT_2: 250, // px
  CREATE_LAB_ICON_START_Y_SEGMENT_2: 260, // px
  CREATE_LAB_ICON_END_X_SEGMENT_2: 410, // px
  CREATE_LAB_ICON_END_Y_SEGMENT_2: 40, // px
  CREATE_LAB_ICON_ITEM_4_LINE_WIDTH: 22, // px
  CREATE_LAB_ICON_ITEM_5_X: 392, // px
  CREATE_LAB_ICON_ITEM_5_Y: 65, // px
  CREATE_LAB_ICON_RADIUS_SEGMENT_2: 20, // px
  CREATE_LAB_ICON_ITEM_6_X: 250, // px
  CREATE_LAB_ICON_ITEM_6_Y: 260, // px

  CREATE_LAB_ICON_START_X: 120,
  CREATE_LAB_ICON_START_Y: 150,
  CREATE_LAB_ICON_END_X: 330,
  CREATE_LAB_ICON_END_Y: 150,
  CREATE_LAB_ICON_LINE_WIDTH: 8,
  CREATE_LAB_ICON_X: 80,
  CREATE_LAB_ICON_Y: 120,
  CREATE_LAB_ICON_WIDTH: 44,
  CREATE_LAB_ICON_HEIGHT: 60,
  CREATE_LAB_ICON_CORNER_RADIUS: 6,
  CREATE_LAB_ICON_RADIUS: 34,
} as const;

/** Settings for common/hardware/BluetoothPascoTransport.ts. */
export const BLUETOOTH_PASCO_TRANSPORT_SETTINGS = {
  /** Most channels any supported sensor has, plus the device service. */
  MAX_SERVICES: 4,
} as const;

/** Settings for common/hardware/UsbPascoTransport.ts. */
export const USB_PASCO_TRANSPORT_SETTINGS = {
  /** PASCO scientific. */
  PASCO_USB_VENDOR_ID: 0x0945,
  /** Fallback transfer size, replaced at connect by the IN endpoint's own `packetSize`. */
  TRANSFER_BYTES: 64,
  /** Consecutive failed reads after which the link is considered lost. */
  READ_FAILURE_TOLERANCE: 3,
} as const;

/** Settings for lab/model/dataCsv.ts. */
export const DATA_CSV_SETTINGS = {
  /** String tension in newtons, after zero and Reverse direction. */
  FORCE_DECIMALS: 2,
} as const;

/** Settings for lab/view/ArmDiagramNode.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const ARM_DIAGRAM_NODE_SETTINGS = {
  ZERO_LINE_LINE_DASH_DASH: 4, // px

  /** Where along the rod the string is tied and the cylinder sits, as fractions of its length. */
  STRING_FRACTION: 0.5,
  /** Where along the rod the string is tied and the cylinder sits, as fractions of its length. */
  CYLINDER_FRACTION: 0.88,
  /** Where along the rod the string is tied and the cylinder sits, as fractions of its length. */
  ARC_RADIUS: 26,
  BACKGROUND_CORNER_RADIUS: 4,
  ARC_LINE_WIDTH: 2,
  STRING_LINE_WIDTH: 1.5,
  FORCE_SENSOR_WIDTH: 14,
  FORCE_SENSOR_HEIGHT: 20,
  FORCE_SENSOR_CORNER_RADIUS: 2,
  ROD_LINE_WIDTH: 6,
  CYLINDER_RADIUS: 9,
  PIVOT_RADIUS: 5,
} as const;

/** Settings for lab/view/DataTableNode.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const DATA_TABLE_NODE_SETTINGS = {
  TEXT_MAX_WIDTH_OFFSET: 58, // px
  HEADER_TEXT_MAX_WIDTH_OFFSET: 6, // px
  CONSTRUCTOR_RIGHT_OFFSET: 6, // px

  FONT_FONT_SIZE: 12,
  HEADER_FONT_SIZE: 12,
  ROW_HEIGHT: 17,
  HEADER_HEIGHT: 22,
  DELETE_SIZE: 9,
  INDEX_RIGHT: 26,
  BACKGROUND_CORNER_RADIUS: 4,
  RULE_START_X: 4,
  DELETE_BUTTON_FONT_SIZE: 12,
  DELETE_BUTTON_X_MARGIN: 3,
  DELETE_BUTTON_TOUCH_AREA_X_DILATION: 4,
  DELETE_BUTTON_TOUCH_AREA_Y_DILATION: 2,
} as const;

/** Settings for lab/view/LabScreenView.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const LAB_SCREEN_VIEW_SETTINGS = {
  RECORD_POINT_PUSH_BUTTON_MAX_WIDTH: 160, // px
  CLEAR_DATA_PUSH_BUTTON_MAX_WIDTH: 120, // px
  DOWNLOAD_CSV_PUSH_BUTTON_MAX_WIDTH: 140, // px

  CONSTRUCTOR_Y_OFFSET: 6, // px
  DATA_CONTROLS_LEFT_OFFSET: 40, // px
  DATA_CONTROLS_TOP_OFFSET: 360, // px
  CONSTRUCTOR_DATA_CONTROLS_TOP_OFFSET: 52, // px

  /** Whether the simulated sensors and the demo slider are offered. */
  MARGIN: 15,
  /** Whether the simulated sensors and the demo slider are offered. */
  COLUMN_SPACING: 14,
  /** Whether the simulated sensors and the demo slider are offered. */
  LEFT_WIDTH: 286,
  /** Whether the simulated sensors and the demo slider are offered. */
  CENTER_WIDTH: 262,
  /** Whether the simulated sensors and the demo slider are offered. */
  DIAGRAM_HEIGHT: 150,
  BUTTON_FONT_SIZE: 14,
  FONT_FONT_SIZE: 12,
  PUSH_BUTTON_X_MARGIN: 12,
  PUSH_BUTTON_Y_MARGIN: 7,
  LEFT_COLUMN_SPACING: 10,
  DEMO_SLIDER_HEIGHT: 3,
  /** Demo slider keyboard step (dimensionless). */
  DEMO_SLIDER_KEYBOARD_STEP: 5,
  /** Demo slider page keyboard step (dimensionless). */
  DEMO_SLIDER_PAGE_KEYBOARD_STEP: 15,
  DEMO_CONTROL_SPACING: 8,
  DEMO_CONTROL_MAX_WIDTH: 100,
  CENTER_COLUMN_SPACING: 8,
  GRAPH_VIEW_HEIGHT: 360,
  SWAP_AXES_CHECKBOX_MAX_WIDTH: 140,
  DATA_CONTROLS_SPACING: 10,
} as const;

/** Settings for lab/view/PointsGraphNode.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const POINTS_GRAPH_NODE_SETTINGS = {
  CONSTRUCTOR_TOP_OFFSET: 24, // px

  LABEL_FONT_SIZE: 13,
  TICK_FONT_SIZE: 11,
  /** Axis spans shown before any data: a half turn, and a few newtons. */
  DEFAULT_MAX_ANGLE: 180,
  /** Axis spans shown before any data: a half turn, and a few newtons. */
  DEFAULT_MAX_FORCE: 5,
  /** Preferred spacing of the angle axis, degrees. */
  ANGLE_STEP: 30,
  GRID_OPTIONS_LINE_WIDTH: 0.5,
  PLOT_RADIUS: 4,
  LIVE_MARKER_RADIUS: 6,
  LIVE_MARKER_LINE_WIDTH: 2,
  RIGHT_RIGHT: -34,
} as const;

/** Settings for lab/view/SensorPanel.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const SENSOR_PANEL_SETTINGS = {
  CONNECT_BUTTON_MAX_WIDTH: 58, // px
  ITEM_5_SPACING: 12, // px
  PHET_FONT_FONT_SIZE: 10, // px

  READOUT_TEXT_MAX_WIDTH_OFFSET: 16, // px
  REVERSE_CHECKBOX_MAX_WIDTH_OFFSET: 110, // px

  FONT_FONT_SIZE: 12,
  BUTTON_FONT_SIZE: 13,
  READOUT_FONT_SIZE: 30,
  READOUT_HEIGHT: 46,
  TEXT_BUTTON_X_MARGIN: 8,
  TEXT_BUTTON_Y_MARGIN: 5,
  READOUT_BACKGROUND_CORNER_RADIUS: 4,
  ZERO_BUTTON_MAX_WIDTH: 60,
  ZERO_BUTTON_X_MARGIN: 10,
  ZERO_BUTTON_Y_MARGIN: 5,
  CONSTRUCTOR_SPACING: 6,
  CONSTRUCTOR_FONT_SIZE: 15,
  CONSTRUCTOR_MAX_WIDTH: 70,
} as const;

/** Settings for preferences/BiomechanicsArmPreferencesNode.ts. Layout lengths are in px; counts and ratios are dimensionless. */
export const BIOMECHANICS_ARM_PREFERENCES_NODE_SETTINGS = {
  HEADER_FONT_SIZE: 18,
  DEMO_MODE_CHECKBOX_FONT_SIZE: 14,
  DEMO_MODE_CHECKBOX_SPACING: 8,
  CONSTRUCTOR_SPACING: 12,
} as const;

BiomechanicsArmNamespace.register("BiomechanicsArmConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  DEFAULT_SAMPLE_PERIOD_MS,
  AVERAGING_SAMPLES,
  MAX_POINTS,
});
