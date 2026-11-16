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
import { BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS } from "../BiomechanicsArmConstants.js";

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
        new Line(
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_START_X,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_START_Y,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_END_X,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_END_Y,
          {
            stroke: BiomechanicsArmColors.forceColorProperty,
            lineWidth: BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_LINE_WIDTH,
          },
        ),
        new Rectangle(
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_X,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_Y,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_WIDTH,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_HEIGHT,
          {
            cornerRadius: BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_CORNER_RADIUS,
            fill: BiomechanicsArmColors.forceColorProperty,
          },
        ),
        // Rod, from the pivot up and to the right
        new Line(
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ROD_START_X,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ROD_START_Y,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ROD_END_X,
          BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ROD_END_Y,
          {
            stroke: BiomechanicsArmColors.rodColorProperty,
            lineWidth: BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ITEM_4_LINE_WIDTH,
            lineCap: "round",
          },
        ),
        new Circle(BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_RADIUS, {
          x: BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ITEM_5_X,
          y: BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ITEM_5_Y,
          fill: BiomechanicsArmColors.cylinderColorProperty,
        }),
        new Circle(BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_PIVOT_RADIUS, {
          x: BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ITEM_6_X,
          y: BIOMECHANICS_ARM_SCREEN_ICONS_SETTINGS.CREATE_LAB_ICON_ITEM_6_Y,
          fill: BiomechanicsArmColors.angleColorProperty,
        }),
      ],
    }),
  );
}
