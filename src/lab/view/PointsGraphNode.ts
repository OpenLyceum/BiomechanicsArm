/**
 * PointsGraphNode.ts
 *
 * The recorded points as a scatter plot of tension against angle (or, with the
 * axes swapped, angle against tension — the form of the handout's prediction
 * question). A ring marks the live reading, so the student can see where the
 * next point will land before recording it.
 *
 * Both axes always include zero and grow to fit the data.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import {
  ChartRectangle,
  ChartTransform,
  GridLineSet,
  ScatterPlot,
  TickLabelSet,
  TickMarkSet,
} from "scenerystack/bamboo";
import { Range, toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { Circle, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BiomechanicsArmColors from "../../BiomechanicsArmColors.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { DataPoint } from "../model/dataCsv.js";
import { axisRange, decimalsFor } from "./formatting.js";

const LABEL_FONT = new PhetFont(13);
const TICK_FONT = new PhetFont(11);

/** Axis spans shown before any data: a half turn, and a few newtons. */
const DEFAULT_MAX_ANGLE = 180;
const DEFAULT_MAX_FORCE = 5;

/** Preferred spacing of the angle axis, degrees. */
const ANGLE_STEP = 30;

export type PointsGraphNodeOptions = {
  readonly viewWidth: number;
  readonly viewHeight: number;
};

export class PointsGraphNode extends Node {
  public constructor(
    pointsProperty: TReadOnlyProperty<readonly DataPoint[]>,
    axesSwappedProperty: TReadOnlyProperty<boolean>,
    liveAngleProperty: TReadOnlyProperty<number>,
    liveForceProperty: TReadOnlyProperty<number>,
    liveVisibleProperty: TReadOnlyProperty<boolean>,
    options: PointsGraphNodeOptions,
  ) {
    const labels = StringManager.getInstance().getLabels();
    const { viewWidth, viewHeight } = options;

    const chartTransform = new ChartTransform({
      viewWidth,
      viewHeight,
      modelXRange: new Range(0, DEFAULT_MAX_ANGLE),
      modelYRange: new Range(0, DEFAULT_MAX_FORCE),
    });
    const chartRectangle = new ChartRectangle(chartTransform, {
      fill: BiomechanicsArmColors.chartBackgroundColorProperty,
      stroke: BiomechanicsArmColors.panelBorderColorProperty,
    });

    const gridOptions = { stroke: BiomechanicsArmColors.chartGridColorProperty, lineWidth: 0.5 };
    const xGrid = new GridLineSet(chartTransform, Orientation.HORIZONTAL, 30, gridOptions);
    const yGrid = new GridLineSet(chartTransform, Orientation.VERTICAL, 1, gridOptions);

    let xDecimals = 0;
    let yDecimals = 0;
    const tickLabel = (decimals: () => number) => (value: number) =>
      new Text(toFixed(value, decimals()), { font: TICK_FONT, fill: BiomechanicsArmColors.textColorProperty });
    const tickOptions = { edge: "min" as const, stroke: BiomechanicsArmColors.textColorProperty };
    const xTicks = new TickMarkSet(chartTransform, Orientation.HORIZONTAL, 30, tickOptions);
    const yTicks = new TickMarkSet(chartTransform, Orientation.VERTICAL, 1, tickOptions);
    const xTickLabels = new TickLabelSet(chartTransform, Orientation.HORIZONTAL, 30, {
      edge: "min",
      createLabel: tickLabel(() => xDecimals),
    });
    const yTickLabels = new TickLabelSet(chartTransform, Orientation.VERTICAL, 1, {
      edge: "min",
      createLabel: tickLabel(() => yDecimals),
    });

    const plot = new ScatterPlot(chartTransform, [], {
      radius: 4,
      fill: BiomechanicsArmColors.pointColorProperty,
    });
    const liveMarker = new Circle(6, {
      stroke: BiomechanicsArmColors.liveMarkerColorProperty,
      lineWidth: 2,
      pickable: false,
    });
    const plotLayer = new Node({
      children: [plot, liveMarker],
      clipArea: Shape.rectangle(0, 0, viewWidth, viewHeight),
    });

    const xLabel = new Text("", { font: LABEL_FONT, maxWidth: viewWidth });
    const yLabel = new Text("", { font: LABEL_FONT, maxWidth: viewHeight, rotation: -Math.PI / 2 });

    super({
      children: [chartRectangle, xGrid, yGrid, xTicks, yTicks, xTickLabels, yTickLabels, plotLayer, xLabel, yLabel],
      accessibleParagraph: StringManager.getInstance().getLabA11yStrings().controls.graphStringProperty,
    });

    // ── Axes and data ──────────────────────────────────────────────────────────
    Multilink.multilink(
      [pointsProperty, axesSwappedProperty, labels.angleAxisStringProperty, labels.tensionAxisStringProperty],
      (points, swapped, angleAxis, tensionAxis) => {
        const angleOnX = !swapped;
        const angles = axisRange(
          points.map((point) => point.angleDegrees),
          DEFAULT_MAX_ANGLE,
          ANGLE_STEP,
        );
        const forces = axisRange(
          points.map((point) => point.forceNewtons),
          DEFAULT_MAX_FORCE,
        );
        const x = angleOnX ? angles : forces;
        const y = angleOnX ? forces : angles;

        xDecimals = decimalsFor(x.step);
        yDecimals = decimalsFor(y.step);
        chartTransform.setModelXRange(new Range(x.min, x.max));
        chartTransform.setModelYRange(new Range(y.min, y.max));
        for (const set of [xGrid, xTicks, xTickLabels]) {
          set.setSpacing(x.step);
        }
        for (const set of [yGrid, yTicks, yTickLabels]) {
          set.setSpacing(y.step);
        }
        // Spacing may be unchanged while the decimals are not; rebuild the labels regardless.
        xTickLabels.invalidateTickLabelSet();
        yTickLabels.invalidateTickLabelSet();

        plot.setDataSet(
          points.map((point) =>
            angleOnX
              ? new Vector2(point.angleDegrees, point.forceNewtons)
              : new Vector2(point.forceNewtons, point.angleDegrees),
          ),
        );

        xLabel.string = angleOnX ? angleAxis : tensionAxis;
        yLabel.string = angleOnX ? tensionAxis : angleAxis;
        xLabel.fill = angleOnX ? BiomechanicsArmColors.angleColorProperty : BiomechanicsArmColors.forceColorProperty;
        yLabel.fill = angleOnX ? BiomechanicsArmColors.forceColorProperty : BiomechanicsArmColors.angleColorProperty;
        xLabel.centerX = viewWidth / 2;
        xLabel.top = viewHeight + 24;
        yLabel.centerY = viewHeight / 2;
        yLabel.right = -34;
      },
    );

    // ── Live reading ───────────────────────────────────────────────────────────
    Multilink.multilink(
      [liveAngleProperty, liveForceProperty, liveVisibleProperty, axesSwappedProperty, pointsProperty],
      (angle, force, visible, swapped) => {
        const angleOnX = !swapped;
        liveMarker.visible = visible;
        if (visible) {
          liveMarker.center = chartTransform.modelToViewPosition(
            angleOnX ? new Vector2(angle, force) : new Vector2(force, angle),
          );
        }
      },
    );
  }
}
