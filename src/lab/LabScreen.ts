/**
 * LabScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createLabIcon() in src/common/BiomechanicsArmScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import BiomechanicsArmColors from "../BiomechanicsArmColors.js";
import { createLabIcon } from "../common/BiomechanicsArmScreenIcons.js";
import biomechanicsArmQueryParameters from "../preferences/biomechanicsArmQueryParameters.js";
import { LabModel } from "./model/LabModel.js";
import { LabKeyboardHelpContent } from "./view/LabKeyboardHelpContent.js";
import { LabScreenView } from "./view/LabScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type LabScreenOptions = ScreenOptions & {
  tandem: Tandem;
  /** Whether the simulated sensors are offered (Preferences → Simulation). */
  demoModeProperty: TReadOnlyProperty<boolean>;
};

export class LabScreen extends Screen<LabModel, LabScreenView> {
  public constructor(options: LabScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () =>
        new LabModel({
          periodMs: biomechanicsArmQueryParameters.samplePeriod,
          logUsb: biomechanicsArmQueryParameters.showDiagnostics,
        }),
      // View factory — receives the model instance
      (model) =>
        new LabScreenView(model, {
          tandem: options.tandem.createTandem("view"),
          demoModeProperty: options.demoModeProperty,
        }),
      optionize<LabScreenOptions, { demoModeProperty: TReadOnlyProperty<boolean> }, ScreenOptions>()(
        {
          backgroundColorProperty: BiomechanicsArmColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new LabKeyboardHelpContent(),
          homeScreenIcon: createLabIcon(),
          navigationBarIcon: createLabIcon(),
        },
        options,
      ),
    );
  }
}
