/**
 * BiomechanicsArmPanel.ts
 *
 * A pre-themed Panel that automatically uses BiomechanicsArmColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { BiomechanicsArmPanel } from "../../common/BiomechanicsArmPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new BiomechanicsArmPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new BiomechanicsArmPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new BiomechanicsArmPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import BiomechanicsArmColors from "../BiomechanicsArmColors.js";
import { PANEL_CORNER_RADIUS } from "../BiomechanicsArmConstants.js";

export type BiomechanicsArmPanelOptions = PanelOptions;

export class BiomechanicsArmPanel extends Panel {
  public constructor(content: Node, providedOptions?: BiomechanicsArmPanelOptions) {
    const options = optionize<BiomechanicsArmPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: BiomechanicsArmColors.panelBackgroundColorProperty,
        stroke: BiomechanicsArmColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
