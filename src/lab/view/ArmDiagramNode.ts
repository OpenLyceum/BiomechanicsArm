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
const STRING_FRACTION = 0.5;
const CYLINDER_FRACTION = 0.88;
const ARC_RADIUS = 26;

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
      cornerRadius: 4,
      fill: BiomechanicsArmColors.chartBackgroundColorProperty,
      stroke: BiomechanicsArmColors.panelBorderColorProperty,
    });
    const zeroLine = new Line(pivotX, pivotY, pivotX, pivotY + rodLength, {
      stroke: BiomechanicsArmColors.chartGridColorProperty,
      lineDash: [4, 4],
    });
    const arc = new Path(null, { stroke: BiomechanicsArmColors.angleColorProperty, lineWidth: 2 });
    const string = new Line(0, 0, 0, 0, { stroke: BiomechanicsArmColors.forceColorProperty, lineWidth: 1.5 });
    const forceSensor = new Rectangle(0, 0, 14, 20, {
      cornerRadius: 2,
      fill: BiomechanicsArmColors.forceColorProperty,
    });
    const rod = new Line(0, 0, 0, 0, {
      stroke: BiomechanicsArmColors.rodColorProperty,
      lineWidth: 6,
      lineCap: "round",
    });
    const cylinder = new Circle(9, {
      fill: BiomechanicsArmColors.cylinderColorProperty,
      stroke: BiomechanicsArmColors.rodColorProperty,
    });
    const pivot = new Circle(5, {
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
