/**
 * BiomechanicsArmScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each screen.
 * Drawn on the standard PhET 548 × 373 canvas using BiomechanicsArmColors.
 * The Lab icon is the model arm: a rod on a pivot, held up by a horizontal string.
 */
import { Circle, Line, Node, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import BiomechanicsArmColors from "../BiomechanicsArmColors.js";

const W = 548;
const H = 373;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: BiomechanicsArmColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: BiomechanicsArmColors.backgroundColorProperty,
  });
}

export function createLabIcon(): ScreenIcon {
  return iconFrom(
    new Node({
      children: [
        background(),
        // String to the force sensor
        new Line(120, 150, 330, 150, { stroke: BiomechanicsArmColors.forceColorProperty, lineWidth: 8 }),
        new Rectangle(80, 120, 44, 60, { cornerRadius: 6, fill: BiomechanicsArmColors.forceColorProperty }),
        // Rod, from the pivot up and to the right
        new Line(250, 260, 410, 40, {
          stroke: BiomechanicsArmColors.rodColorProperty,
          lineWidth: 22,
          lineCap: "round",
        }),
        new Circle(34, { x: 392, y: 65, fill: BiomechanicsArmColors.cylinderColorProperty }),
        new Circle(20, { x: 250, y: 260, fill: BiomechanicsArmColors.angleColorProperty }),
      ],
    }),
  );
}
