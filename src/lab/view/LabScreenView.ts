import { LAB_SCREEN_VIEW_SETTINGS } from "../../BiomechanicsArmConstants.js";
/**
 * LabScreenView.ts
 *
 * The Lab screen, in three columns:
 *
 *   left    the two sensor panels and Zero both sensors (SensorColumn)
 *   centre  the arm diagram, the demo slider (demo mode only), Record point
 *           and the data table
 *   right   the graph, Swap axes, Clear data and Download CSV
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, toFixed } from "scenerystack/dot";
import { optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, KeyboardListener, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { Checkbox, HSlider, RectangularPushButton } from "scenerystack/sun";
import BiomechanicsArmColors from "../../BiomechanicsArmColors.js";
import { SCREEN_VIEW_MARGIN } from "../../BiomechanicsArmConstants.js";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/BiomechanicsArmButtonOptions.js";
import {
  BIOMECHANICS_ARM_CHECKBOX_OPTIONS,
  BIOMECHANICS_ARM_SLIDER_OPTIONS,
} from "../../common/BiomechanicsArmControlOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import { ANGLE_DECIMALS, dataCsv, FORCE_DECIMALS } from "../model/dataCsv.js";
import type { LabModel } from "../model/LabModel.js";
import { ConnectionState } from "../model/SensorChannel.js";
import { ArmDiagramNode } from "./ArmDiagramNode.js";
import { DataTableNode } from "./DataTableNode.js";
import { downloadText } from "./downloadText.js";
import { RECORD_POINT_HOTKEY_DATA, ZERO_BOTH_HOTKEY_DATA } from "./LabKeyboardHelpContent.js";
import { LabScreenSummaryContent } from "./LabScreenSummaryContent.js";
import { PointsGraphNode } from "./PointsGraphNode.js";
import { SensorColumn } from "./SensorColumn.js";

type SelfOptions = {
  /** Whether the simulated sensors and the demo slider are offered. */
  demoModeProperty: TReadOnlyProperty<boolean>;
};

export type LabScreenViewOptions = SelfOptions & ScreenViewOptions;

const MARGIN: number = LAB_SCREEN_VIEW_SETTINGS.MARGIN;
const COLUMN_SPACING: number = LAB_SCREEN_VIEW_SETTINGS.COLUMN_SPACING;
const LEFT_WIDTH: number = LAB_SCREEN_VIEW_SETTINGS.LEFT_WIDTH;
const CENTER_WIDTH: number = LAB_SCREEN_VIEW_SETTINGS.CENTER_WIDTH;
const DIAGRAM_HEIGHT: number = LAB_SCREEN_VIEW_SETTINGS.DIAGRAM_HEIGHT;
const BUTTON_FONT = new PhetFont({ size: LAB_SCREEN_VIEW_SETTINGS.BUTTON_FONT_SIZE, weight: "bold" });
const FONT = new PhetFont(LAB_SCREEN_VIEW_SETTINGS.FONT_SIZE);

export class LabScreenView extends ScreenView {
  public constructor(model: LabModel, providedOptions: LabScreenViewOptions) {
    const options = optionize<LabScreenViewOptions, SelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new LabScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getLabA11yStrings();
    const bounds = this.layoutBounds;

    const bothConnectedProperty = new DerivedProperty(
      [model.forceChannel.connectionStateProperty, model.angleChannel.connectionStateProperty],
      (force, angle) => force === ConnectionState.CONNECTED && angle === ConnectionState.CONNECTED,
    );
    const hasPointsProperty = new DerivedProperty([model.pointsProperty], (points) => points.length > 0);

    const pushButton = (
      label: TReadOnlyProperty<string>,
      listener: () => void,
      enabledProperty: TReadOnlyProperty<boolean>,
      maxWidth: number,
      extra?: { accessibleHelpText?: TReadOnlyProperty<string> },
    ) =>
      new RectangularPushButton({
        ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
        content: new Text(label, { font: BUTTON_FONT, fill: LIGHT_SURFACE_TEXT_FILL, maxWidth }),
        accessibleName: label,
        enabledProperty,
        listener,
        xMargin: LAB_SCREEN_VIEW_SETTINGS.PUSH_BUTTON_X_MARGIN,
        yMargin: LAB_SCREEN_VIEW_SETTINGS.PUSH_BUTTON_Y_MARGIN,
        ...extra,
      });

    // ── Left column: sensors ───────────────────────────────────────────────────
    const leftColumn = new SensorColumn(model, {
      demoModeProperty: options.demoModeProperty,
      onZeroBoth: () => this.addAccessibleContextResponse(a11y.responses.zeroedStringProperty.value),
    });
    leftColumn.left = bounds.minX + MARGIN;
    leftColumn.top = bounds.minY + MARGIN;

    const { forcePanel, anglePanel, zeroBothButton, zeroBoth } = leftColumn;

    // ── Centre column: diagram, record, table ──────────────────────────────────
    const armDiagram = new ArmDiagramNode(model.angleChannel.valueProperty, bothConnectedProperty, {
      width: CENTER_WIDTH,
      height: DIAGRAM_HEIGHT,
    });

    const demoSlider = new HSlider(model.demoAngleProperty, model.demoAngleProperty.range, {
      ...BIOMECHANICS_ARM_SLIDER_OPTIONS,
      trackSize: new Dimension2(CENTER_WIDTH - 130, LAB_SCREEN_VIEW_SETTINGS.DEMO_SLIDER_HEIGHT),
      keyboardStep: LAB_SCREEN_VIEW_SETTINGS.DEMO_SLIDER_KEYBOARD_STEP,
      shiftKeyboardStep: 1,
      pageKeyboardStep: LAB_SCREEN_VIEW_SETTINGS.DEMO_SLIDER_PAGE_KEYBOARD_STEP,
      accessibleName: labels.demoAngleStringProperty,
      accessibleHelpText: a11y.controls.demoAngleHelpStringProperty,
    });
    const demoControl = new HBox({
      spacing: LAB_SCREEN_VIEW_SETTINGS.DEMO_CONTROL_SPACING,
      visibleProperty: options.demoModeProperty,
      children: [
        new Text(labels.demoAngleStringProperty, {
          font: FONT,
          fill: BiomechanicsArmColors.textColorProperty,
          maxWidth: LAB_SCREEN_VIEW_SETTINGS.DEMO_CONTROL_MAX_WIDTH,
        }),
        demoSlider,
      ],
    });

    const recordPoint = () => {
      const point = model.recordPoint();
      if (point) {
        this.addAccessibleContextResponse(
          StringUtils.fillIn(a11y.responses.pointRecordedPatternStringProperty.value, {
            number: model.pointsProperty.value.length,
            angle: toFixed(point.angleDegrees, ANGLE_DECIMALS),
            force: toFixed(point.forceNewtons, FORCE_DECIMALS),
          }),
        );
      }
    };
    const recordButton = pushButton(
      labels.recordPointStringProperty,
      recordPoint,
      model.canRecordProperty,
      LAB_SCREEN_VIEW_SETTINGS.RECORD_POINT_PUSH_BUTTON_MAX_WIDTH,
      {
        accessibleHelpText: a11y.controls.recordPointHelpStringProperty,
      },
    );

    const dataTable = new DataTableNode(model.pointsProperty, {
      width: CENTER_WIDTH,
      onDelete: (index) => {
        model.deletePoint(index);
        this.addAccessibleContextResponse(
          StringUtils.fillIn(a11y.responses.pointDeletedPatternStringProperty.value, { number: index + 1 }),
        );
      },
    });

    const centerColumn = new VBox({
      align: "center",
      spacing: LAB_SCREEN_VIEW_SETTINGS.CENTER_COLUMN_SPACING,
      children: [armDiagram, demoControl, recordButton, dataTable],
      left: leftColumn.left + LEFT_WIDTH + COLUMN_SPACING,
      top: bounds.minY + MARGIN,
    });

    // ── Right column: graph and data buttons ───────────────────────────────────
    const graphLeft = centerColumn.left + CENTER_WIDTH + COLUMN_SPACING + 52;
    const graphWidth = bounds.maxX - MARGIN - graphLeft;
    const graph = new PointsGraphNode(
      model.pointsProperty,
      model.axesSwappedProperty,
      model.angleDegreesProperty,
      model.forceChannel.valueProperty,
      bothConnectedProperty,
      { viewWidth: graphWidth, viewHeight: LAB_SCREEN_VIEW_SETTINGS.GRAPH_VIEW_HEIGHT },
    );
    graph.x = graphLeft;
    graph.y = bounds.minY + MARGIN + LAB_SCREEN_VIEW_SETTINGS.CONSTRUCTOR_Y_OFFSET;

    const swapAxesCheckbox = new Checkbox(
      model.axesSwappedProperty,
      new Text(labels.swapAxesStringProperty, {
        font: FONT,
        fill: BiomechanicsArmColors.textColorProperty,
        maxWidth: LAB_SCREEN_VIEW_SETTINGS.SWAP_AXES_CHECKBOX_MAX_WIDTH,
      }),
      { ...BIOMECHANICS_ARM_CHECKBOX_OPTIONS, accessibleName: labels.swapAxesStringProperty },
    );

    const clearButton = pushButton(
      labels.clearDataStringProperty,
      () => {
        model.clearPoints();
        this.addAccessibleContextResponse(a11y.responses.dataClearedStringProperty.value);
      },
      hasPointsProperty,
      LAB_SCREEN_VIEW_SETTINGS.CLEAR_DATA_PUSH_BUTTON_MAX_WIDTH,
    );
    const downloadButton = pushButton(
      labels.downloadCsvStringProperty,
      () => {
        downloadText(
          dataCsv(
            model.pointsProperty.value,
            labels.angleColumnStringProperty.value,
            labels.tensionColumnStringProperty.value,
          ),
          `${labels.csvFileNameStringProperty.value}.csv`,
        );
        this.addAccessibleContextResponse(a11y.responses.csvDownloadedStringProperty.value);
      },
      hasPointsProperty,
      LAB_SCREEN_VIEW_SETTINGS.DOWNLOAD_CSV_PUSH_BUTTON_MAX_WIDTH,
    );

    const dataControls = new VBox({
      align: "left",
      spacing: LAB_SCREEN_VIEW_SETTINGS.DATA_CONTROLS_SPACING,
      children: [
        swapAxesCheckbox,
        new HBox({ spacing: LAB_SCREEN_VIEW_SETTINGS.DATA_CONTROLS_SPACING, children: [clearButton, downloadButton] }),
      ],
      left: graphLeft - LAB_SCREEN_VIEW_SETTINGS.DATA_CONTROLS_LEFT_OFFSET,
      top:
        graph.y +
        LAB_SCREEN_VIEW_SETTINGS.DATA_CONTROLS_TOP_OFFSET +
        LAB_SCREEN_VIEW_SETTINGS.CONSTRUCTOR_DATA_CONTROLS_TOP_OFFSET,
    });

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => model.reset(),
      right: bounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: bounds.maxY - SCREEN_VIEW_MARGIN,
    });

    this.children = [leftColumn, centerColumn, graph, dataControls, resetAllButton];

    // ── Shortcuts ──────────────────────────────────────────────────────────────
    // ScreenViews live for the whole sim, so these global listeners are never disposed.
    KeyboardListener.createGlobal(this, {
      keyStringProperties: [...RECORD_POINT_HOTKEY_DATA.keyStringProperties],
      fire: recordPoint,
    });
    KeyboardListener.createGlobal(this, {
      keyStringProperties: [...ZERO_BOTH_HOTKEY_DATA.keyStringProperties],
      fire: zeroBoth,
    });

    // ── Traversal order ────────────────────────────────────────────────────────
    this.addChild(
      new Node({
        pdomOrder: [
          ...forcePanel.controls,
          ...anglePanel.controls,
          zeroBothButton,
          armDiagram,
          demoSlider,
          recordButton,
          dataTable,
          graph,
          swapAxesCheckbox,
          clearButton,
          downloadButton,
          resetAllButton,
        ],
      }),
    );
  }
}
