import { ARM_DIAGRAM_NODE_SETTINGS } from "../../BiomechanicsArmConstants.js";
/**
 * ArmDiagramNode.ts
 *
 * A schematic of the model arm at the measured angle: the rod on its pivot, the
 * brass cylinder near its end, the angle swept from where the sensor was zeroed
 * (drawn as straight down, where the handout says to zero it), and the string to
 * the force sensor once the rod is above the horizontal.
 *
 * It exists so that a wrong sign is obvious at a glance: lift the rod and the
 * drawing should lift the same way. It is not to scale.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import BiomechanicsArmColors from "../../BiomechanicsArmColors.js";
import { StringManager } from "../../i18n/StringManager.js";

/** Where along the rod the string is tied and the cylinder sits, as fractions of its length. */
const STRING_FRACTION: number = ARM_DIAGRAM_NODE_SETTINGS.STRING_FRACTION;
const CYLINDER_FRACTION: number = ARM_DIAGRAM_NODE_SETTINGS.CYLINDER_FRACTION;
const ARC_RADIUS: number = ARM_DIAGRAM_NODE_SETTINGS.ARC_RADIUS;

export type ArmDiagramNodeOptions = {
  readonly width: number;
  readonly height: number;
};

export class ArmDiagramNode extends Node {
  public constructor(
    angleProperty: TReadOnlyProperty<number>,
    stringVisibleProperty: TReadOnlyProperty<boolean>,
    options: ArmDiagramNodeOptions,
  ) {
    const { width, height } = options;
    const pivotX = width / 2;
    const pivotY = height / 2;
    const rodLength = Math.min(width, height) / 2 - 12;

    const background = new Rectangle(0, 0, width, height, {
      cornerRadius: ARM_DIAGRAM_NODE_SETTINGS.BACKGROUND_CORNER_RADIUS,
      fill: BiomechanicsArmColors.chartBackgroundColorProperty,
      stroke: BiomechanicsArmColors.panelBorderColorProperty,
    });
    const zeroLine = new Line(pivotX, pivotY, pivotX, pivotY + rodLength, {
      stroke: BiomechanicsArmColors.chartGridColorProperty,
      lineDash: [
        ARM_DIAGRAM_NODE_SETTINGS.ZERO_LINE_LINE_DASH_DASH,
        ARM_DIAGRAM_NODE_SETTINGS.ZERO_LINE_LINE_DASH_DASH,
      ],
    });
    const arc = new Path(null, {
      stroke: BiomechanicsArmColors.angleColorProperty,
      lineWidth: ARM_DIAGRAM_NODE_SETTINGS.ARC_LINE_WIDTH,
    });
    const string = new Line(0, 0, 0, 0, {
      stroke: BiomechanicsArmColors.forceColorProperty,
      lineWidth: ARM_DIAGRAM_NODE_SETTINGS.STRING_LINE_WIDTH,
    });
    const forceSensor = new Rectangle(
      0,
      0,
      ARM_DIAGRAM_NODE_SETTINGS.FORCE_SENSOR_WIDTH,
      ARM_DIAGRAM_NODE_SETTINGS.FORCE_SENSOR_HEIGHT,
      {
        cornerRadius: ARM_DIAGRAM_NODE_SETTINGS.FORCE_SENSOR_CORNER_RADIUS,
        fill: BiomechanicsArmColors.forceColorProperty,
      },
    );
    const rod = new Line(0, 0, 0, 0, {
      stroke: BiomechanicsArmColors.rodColorProperty,
      lineWidth: ARM_DIAGRAM_NODE_SETTINGS.ROD_LINE_WIDTH,
      lineCap: "round",
    });
    const cylinder = new Circle(ARM_DIAGRAM_NODE_SETTINGS.CYLINDER_RADIUS, {
      fill: BiomechanicsArmColors.cylinderColorProperty,
      stroke: BiomechanicsArmColors.rodColorProperty,
    });
    const pivot = new Circle(ARM_DIAGRAM_NODE_SETTINGS.PIVOT_RADIUS, {
      fill: BiomechanicsArmColors.angleColorProperty,
      stroke: BiomechanicsArmColors.rodColorProperty,
      x: pivotX,
      y: pivotY,
    });

    super({
      children: [background, zeroLine, arc, string, forceSensor, rod, cylinder, pivot],
      accessibleParagraph: StringManager.getInstance().getLabA11yStrings().controls.armDiagramStringProperty,
    });

    Multilink.multilink([angleProperty, stringVisibleProperty], (angle, stringVisible) => {
      // Angle 0 points straight down; positive angles swing the rod to the right and up.
      const dx = Math.sin(angle);
      const dy = Math.cos(angle);
      rod.setLine(pivotX, pivotY, pivotX + rodLength * dx, pivotY + rodLength * dy);
      cylinder.x = pivotX + CYLINDER_FRACTION * rodLength * dx;
      cylinder.y = pivotY + CYLINDER_FRACTION * rodLength * dy;

      const swept = clamp(angle, -2 * Math.PI, 2 * Math.PI);
      arc.shape =
        Math.abs(swept) < 1e-3
          ? null
          : new Shape().arc(pivotX, pivotY, ARC_RADIUS, Math.PI / 2, Math.PI / 2 - swept, swept > 0);

      // The string runs horizontally from the rod's centre hole to the force sensor.
      const holeX = pivotX + STRING_FRACTION * rodLength * dx;
      const holeY = pivotY + STRING_FRACTION * rodLength * dy;
      const taut = stringVisible && dy < 0;
      string.visible = taut;
      forceSensor.visible = taut;
      if (taut) {
        const sensorX = dx >= 0 ? 6 : width - 20;
        forceSensor.x = sensorX;
        forceSensor.centerY = holeY;
        string.setLine(holeX, holeY, dx >= 0 ? sensorX + 14 : sensorX, holeY);
      }
    });
  }
}
