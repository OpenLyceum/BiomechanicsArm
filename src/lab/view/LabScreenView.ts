/**
 * LabScreenView.ts
 *
 * The Lab screen, in three columns:
 *
 *   left    the two sensor panels and Zero both sensors
 *   centre  the arm diagram, the demo slider (demo mode only), Record point
 *           and the data table
 *   right   the graph, Swap axes, Clear data and Download CSV
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, toFixed } from "scenerystack/dot";
import { optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, KeyboardListener, Node, RichText, Text, VBox } from "scenerystack/scenery";
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
import { TransportKind } from "../../common/hardware/PascoTransport.js";
import { isTransportAvailable } from "../../common/hardware/transportSupport.js";
import { StringManager } from "../../i18n/StringManager.js";
import biomechanicsArmQueryParameters from "../../preferences/biomechanicsArmQueryParameters.js";
import { ANGLE_DECIMALS, dataCsv, FORCE_DECIMALS } from "../model/dataCsv.js";
import type { LabModel } from "../model/LabModel.js";
import { ConnectionState } from "../model/SensorChannel.js";
import { ArmDiagramNode } from "./ArmDiagramNode.js";
import { DataTableNode } from "./DataTableNode.js";
import { RECORD_POINT_HOTKEY_DATA, ZERO_BOTH_HOTKEY_DATA } from "./LabKeyboardHelpContent.js";
import { LabScreenSummaryContent } from "./LabScreenSummaryContent.js";
import { PointsGraphNode } from "./PointsGraphNode.js";
import { SensorPanel } from "./SensorPanel.js";

type SelfOptions = {
  /** Whether the simulated sensors and the demo slider are offered. */
  demoModeProperty: TReadOnlyProperty<boolean>;
};

export type LabScreenViewOptions = SelfOptions & ScreenViewOptions;

const MARGIN = 15;
const COLUMN_SPACING = 14;
const LEFT_WIDTH = 286;
const CENTER_WIDTH = 262;
const DIAGRAM_HEIGHT = 150;
const BUTTON_FONT = new PhetFont({ size: 14, weight: "bold" });
const FONT = new PhetFont(12);

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
    const eitherConnectedProperty = new DerivedProperty(
      [model.forceChannel.connectionStateProperty, model.angleChannel.connectionStateProperty],
      (force, angle) => force === ConnectionState.CONNECTED || angle === ConnectionState.CONNECTED,
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
        xMargin: 12,
        yMargin: 7,
        ...extra,
      });

    // ── Left column: sensors ───────────────────────────────────────────────────
    const showDiagnostics = biomechanicsArmQueryParameters.showDiagnostics;
    const forcePanel = new SensorPanel(model.forceChannel, {
      title: labels.forceSensorStringProperty,
      color: BiomechanicsArmColors.forceColorProperty,
      valuePattern: labels.forcePatternStringProperty,
      displayValueProperty: model.forceChannel.valueProperty,
      decimals: FORCE_DECIMALS,
      demoModeProperty: options.demoModeProperty,
      showDiagnostics,
      width: LEFT_WIDTH,
      accessibleNames: {
        bluetooth: a11y.controls.connectForceBluetoothStringProperty,
        usb: a11y.controls.connectForceUsbStringProperty,
        demo: a11y.controls.connectForceDemoStringProperty,
        disconnect: a11y.controls.disconnectForceStringProperty,
        zero: a11y.controls.zeroForceStringProperty,
        reverse: a11y.controls.reverseForceStringProperty,
      },
    });
    const anglePanel = new SensorPanel(model.angleChannel, {
      title: labels.angleSensorStringProperty,
      color: BiomechanicsArmColors.angleColorProperty,
      valuePattern: labels.anglePatternStringProperty,
      displayValueProperty: model.angleDegreesProperty,
      decimals: ANGLE_DECIMALS,
      demoModeProperty: options.demoModeProperty,
      showDiagnostics,
      width: LEFT_WIDTH,
      accessibleNames: {
        bluetooth: a11y.controls.connectAngleBluetoothStringProperty,
        usb: a11y.controls.connectAngleUsbStringProperty,
        demo: a11y.controls.connectAngleDemoStringProperty,
        disconnect: a11y.controls.disconnectAngleStringProperty,
        zero: a11y.controls.zeroAngleStringProperty,
        reverse: a11y.controls.reverseAngleStringProperty,
      },
    });

    const zeroBoth = () => {
      if (eitherConnectedProperty.value) {
        model.zeroBoth();
        this.addAccessibleContextResponse(a11y.responses.zeroedStringProperty.value);
      }
    };
    const zeroBothButton = pushButton(
      labels.zeroBothStringProperty,
      zeroBoth,
      eitherConnectedProperty,
      LEFT_WIDTH - 40,
      {
        accessibleHelpText: a11y.controls.zeroBothHelpStringProperty,
      },
    );

    // Shown only where neither Web Bluetooth nor WebUSB exists, so the empty panels are explained.
    const hardwareAvailable = isTransportAvailable(TransportKind.BLUETOOTH) || isTransportAvailable(TransportKind.USB);
    const hardwareNote = new RichText(labels.hardwareUnavailableStringProperty, {
      font: FONT,
      fill: BiomechanicsArmColors.warningColorProperty,
      lineWrap: LEFT_WIDTH,
      visible: !hardwareAvailable,
    });

    const leftColumn = new VBox({
      align: "left",
      spacing: 10,
      children: [forcePanel, anglePanel, zeroBothButton, hardwareNote],
      left: bounds.minX + MARGIN,
      top: bounds.minY + MARGIN,
    });

    // ── Centre column: diagram, record, table ──────────────────────────────────
    const armDiagram = new ArmDiagramNode(model.angleChannel.valueProperty, bothConnectedProperty, {
      width: CENTER_WIDTH,
      height: DIAGRAM_HEIGHT,
    });

    const demoSlider = new HSlider(model.demoAngleProperty, model.demoAngleProperty.range, {
      ...BIOMECHANICS_ARM_SLIDER_OPTIONS,
      trackSize: new Dimension2(CENTER_WIDTH - 130, 3),
      keyboardStep: 5,
      shiftKeyboardStep: 1,
      pageKeyboardStep: 15,
      accessibleName: labels.demoAngleStringProperty,
      accessibleHelpText: a11y.controls.demoAngleHelpStringProperty,
    });
    const demoControl = new HBox({
      spacing: 8,
      visibleProperty: options.demoModeProperty,
      children: [
        new Text(labels.demoAngleStringProperty, {
          font: FONT,
          fill: BiomechanicsArmColors.textColorProperty,
          maxWidth: 100,
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
    const recordButton = pushButton(labels.recordPointStringProperty, recordPoint, model.canRecordProperty, 160, {
      accessibleHelpText: a11y.controls.recordPointHelpStringProperty,
    });

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
      spacing: 8,
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
      { viewWidth: graphWidth, viewHeight: 360 },
    );
    graph.x = graphLeft;
    graph.y = bounds.minY + MARGIN + 6;

    const swapAxesCheckbox = new Checkbox(
      model.axesSwappedProperty,
      new Text(labels.swapAxesStringProperty, {
        font: FONT,
        fill: BiomechanicsArmColors.textColorProperty,
        maxWidth: 140,
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
      120,
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
      140,
    );

    const dataControls = new VBox({
      align: "left",
      spacing: 10,
      children: [swapAxesCheckbox, new HBox({ spacing: 10, children: [clearButton, downloadButton] })],
      left: graphLeft - 40,
      top: graph.y + 360 + 52,
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

/** Hands text to the browser as a file download. */
function downloadText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
