/**
 * BiomechanicsArmPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in biomechanicsArmQueryParameters.
 *
 * Demo mode offers simulated sensors on a simulated arm, so the sim can be
 * explored (or demonstrated) with no hardware.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import BiomechanicsArmNamespace from "../BiomechanicsArmNamespace.js";
import biomechanicsArmQueryParameters from "./biomechanicsArmQueryParameters.js";

export class BiomechanicsArmPreferencesModel {
  /** Offer the simulated sensors; initial value comes from the `demo` query parameter. */
  public readonly demoModeProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.demoModeProperty = new BooleanProperty(
      biomechanicsArmQueryParameters.demo,
      tandem ? { tandem: tandem.createTandem("demoModeProperty") } : undefined,
    );
  }

  public reset(): void {
    this.demoModeProperty.reset();
  }
}

BiomechanicsArmNamespace.register("BiomechanicsArmPreferencesModel", BiomechanicsArmPreferencesModel);
