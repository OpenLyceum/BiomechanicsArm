/**
 * LabScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers: what the play and
 * control areas hold, a live paragraph with both readings and the number of
 * points recorded, and a hint on how to start.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import { ANGLE_DECIMALS, FORCE_DECIMALS } from "../model/dataCsv.js";
import type { LabModel } from "../model/LabModel.js";
import { ConnectionState } from "../model/SensorChannel.js";

export class LabScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: LabModel) {
    const a11y = StringManager.getInstance().getLabA11yStrings();
    const labels = StringManager.getInstance().getLabels();

    // The ScreenView lives for the whole sim, so this DerivedProperty is never disposed.
    const currentDetailsProperty = new DerivedProperty(
      [
        model.forceChannel.valueProperty,
        model.forceChannel.connectionStateProperty,
        model.angleDegreesProperty,
        model.angleChannel.connectionStateProperty,
        model.pointsProperty,
        a11y.currentDetailsPatternStringProperty,
        labels.forcePatternStringProperty,
        labels.anglePatternStringProperty,
        labels.notConnectedStringProperty,
      ],
      (force, forceState, angle, angleState, points, pattern, forcePattern, anglePattern, notConnected) =>
        StringUtils.fillIn(pattern, {
          force:
            forceState === ConnectionState.CONNECTED
              ? StringUtils.fillIn(forcePattern, { value: toFixed(force, FORCE_DECIMALS) })
              : notConnected,
          angle:
            angleState === ConnectionState.CONNECTED
              ? StringUtils.fillIn(anglePattern, { value: toFixed(angle, ANGLE_DECIMALS) })
              : notConnected,
          count: points.length,
        }),
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetailsProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
