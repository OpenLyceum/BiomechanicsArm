import { DATA_TABLE_NODE_SETTINGS } from "../../BiomechanicsArmConstants.js";
/**
 * DataTableNode.ts
 *
 * The recorded points: number, angle and tension, with a delete button on each
 * row. The table has a fixed number of rows so the layout never moves.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { Line, Node, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { RectangularPushButton } from "scenerystack/sun";
import BiomechanicsArmColors from "../../BiomechanicsArmColors.js";
import { MAX_POINTS } from "../../BiomechanicsArmConstants.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../../common/BiomechanicsArmButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import { ANGLE_DECIMALS, type DataPoint, FORCE_DECIMALS } from "../model/dataCsv.js";

const FONT = new PhetFont(DATA_TABLE_NODE_SETTINGS.FONT_FONT_SIZE);
const HEADER_FONT = new PhetFont({ size: DATA_TABLE_NODE_SETTINGS.HEADER_FONT_SIZE, weight: "bold" });
const ROW_HEIGHT: number = DATA_TABLE_NODE_SETTINGS.ROW_HEIGHT;
const HEADER_HEIGHT: number = DATA_TABLE_NODE_SETTINGS.HEADER_HEIGHT;
const DELETE_SIZE: number = DATA_TABLE_NODE_SETTINGS.DELETE_SIZE;

export type DataTableNodeOptions = {
  readonly width: number;
  readonly onDelete: (index: number) => void;
};

export class DataTableNode extends Node {
  public readonly deleteButtons: readonly Node[];

  public constructor(pointsProperty: TReadOnlyProperty<readonly DataPoint[]>, options: DataTableNodeOptions) {
    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getLabA11yStrings();
    const { width } = options;
    const height = HEADER_HEIGHT + MAX_POINTS * ROW_HEIGHT + 4;

    // Right edges of the three columns; the delete buttons sit after the last.
    const indexRight: number = DATA_TABLE_NODE_SETTINGS.INDEX_RIGHT;
    const angleRight = indexRight + (width - 58) / 2;
    const forceRight = width - 32;

    const background = new Rectangle(0, 0, width, height, {
      cornerRadius: DATA_TABLE_NODE_SETTINGS.BACKGROUND_CORNER_RADIUS,
      fill: BiomechanicsArmColors.chartBackgroundColorProperty,
      stroke: BiomechanicsArmColors.panelBorderColorProperty,
    });

    const header = (
      label: TReadOnlyProperty<string>,
      right: number,
      fill: typeof BiomechanicsArmColors.textColorProperty,
    ) => {
      const text = new Text(label, {
        font: HEADER_FONT,
        fill,
        maxWidth:
          (width - DATA_TABLE_NODE_SETTINGS.TEXT_MAX_WIDTH_OFFSET) / 2 -
          DATA_TABLE_NODE_SETTINGS.HEADER_TEXT_MAX_WIDTH_OFFSET,
      });
      text.boundsProperty.link(() => {
        text.right = right;
        text.centerY = HEADER_HEIGHT / 2;
      });
      return text;
    };
    const rule = new Line(DATA_TABLE_NODE_SETTINGS.RULE_START_X, HEADER_HEIGHT, width - 4, HEADER_HEIGHT, {
      stroke: BiomechanicsArmColors.chartGridColorProperty,
    });

    const rows: Node[] = [];
    const deleteButtons: Node[] = [];
    const cells: { index: Text; angle: Text; force: Text }[] = [];
    for (let i = 0; i < MAX_POINTS; i++) {
      const centerY = HEADER_HEIGHT + 2 + (i + 0.5) * ROW_HEIGHT;
      const cell = () => new Text("", { font: FONT, fill: BiomechanicsArmColors.textColorProperty });
      const index = cell();
      const angle = cell();
      const force = cell();
      const deleteButton = new RectangularPushButton({
        ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
        content: new Text("×", {
          font: new PhetFont({ size: DATA_TABLE_NODE_SETTINGS.DELETE_BUTTON_FONT_SIZE, weight: "bold" }),
          fill: LIGHT_SURFACE_TEXT_FILL,
        }),
        xMargin: DATA_TABLE_NODE_SETTINGS.DELETE_BUTTON_X_MARGIN,
        yMargin: 0,
        minWidth: DELETE_SIZE,
        minHeight: DELETE_SIZE,
        touchAreaXDilation: DATA_TABLE_NODE_SETTINGS.DELETE_BUTTON_TOUCH_AREA_X_DILATION,
        touchAreaYDilation: DATA_TABLE_NODE_SETTINGS.DELETE_BUTTON_TOUCH_AREA_Y_DILATION,
        accessibleName: new DerivedProperty([a11y.controls.deletePointPatternStringProperty], (pattern) =>
          StringUtils.fillIn(pattern, { number: i + 1 }),
        ),
        listener: () => options.onDelete(i),
      });
      deleteButton.right = width - DATA_TABLE_NODE_SETTINGS.CONSTRUCTOR_RIGHT_OFFSET;
      deleteButton.centerY = centerY;
      const row = new Node({ children: [index, angle, force, deleteButton], visible: false });
      rows.push(row);
      deleteButtons.push(deleteButton);
      cells.push({ index, angle, force });
    }

    super({
      children: [
        background,
        header(labels.pointColumnStringProperty, indexRight, BiomechanicsArmColors.textColorProperty),
        header(labels.angleColumnStringProperty, angleRight, BiomechanicsArmColors.angleColorProperty),
        header(labels.tensionColumnStringProperty, forceRight, BiomechanicsArmColors.forceColorProperty),
        rule,
        ...rows,
      ],
      accessibleParagraph: a11y.controls.dataTableStringProperty,
    });

    pointsProperty.link((points) => {
      for (let i = 0; i < MAX_POINTS; i++) {
        const row = rows[i];
        const cell = cells[i];
        const point = points[i];
        if (!(row && cell)) {
          continue;
        }
        row.visible = point !== undefined;
        if (point === undefined) {
          continue;
        }
        const centerY = HEADER_HEIGHT + 2 + (i + 0.5) * ROW_HEIGHT;
        cell.index.string = `${i + 1}`;
        cell.angle.string = toFixed(point.angleDegrees, ANGLE_DECIMALS);
        cell.force.string = toFixed(point.forceNewtons, FORCE_DECIMALS);
        cell.index.right = indexRight;
        cell.angle.right = angleRight;
        cell.force.right = forceRight;
        cell.index.centerY = centerY;
        cell.angle.centerY = centerY;
        cell.force.centerY = centerY;
      }
    });

    this.deleteButtons = deleteButtons;
  }
}
