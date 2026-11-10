/**
 * BiomechanicsArmPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to BiomechanicsArmPreferencesModel Properties (whose initial values come from
 * biomechanicsArmQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import BiomechanicsArmColors from "../BiomechanicsArmColors.js";
import BiomechanicsArmNamespace from "../BiomechanicsArmNamespace.js";
import { StringManager } from "../i18n/StringManager.js";
import type { BiomechanicsArmPreferencesModel } from "./BiomechanicsArmPreferencesModel.js";

export class BiomechanicsArmPreferencesNode extends VBox {
  public constructor(preferencesModel: BiomechanicsArmPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    // The Preferences dialog is always white, so use the dark "light control surface"
    // colors (readable on white in both default and projector profiles), not textColorProperty
    // (which is near-white in default mode and would be invisible on the white dialog).
    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: BiomechanicsArmColors.controlSurfaceTextColorProperty,
    });

    const demoModeCheckbox = new Checkbox(
      preferencesModel.demoModeProperty,
      new Text(prefStrings.demoModeStringProperty, {
        font: new PhetFont(14),
        fill: BiomechanicsArmColors.controlSurfaceTextColorProperty,
      }),
      {
        checkboxColor: BiomechanicsArmColors.controlSurfaceTextColorProperty,
        checkboxColorBackground: BiomechanicsArmColors.controlSurfaceColorProperty,
        spacing: 8,
        ...(tandem && { tandem: tandem.createTandem("demoModeCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, demoModeCheckbox],
    });
  }
}

BiomechanicsArmNamespace.register("BiomechanicsArmPreferencesNode", BiomechanicsArmPreferencesNode);
