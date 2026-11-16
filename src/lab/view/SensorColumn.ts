/**
 * SensorColumn.ts
 *
 * Left column of the Lab screen: force and angle sensor panels, Zero both, and
 * the hardware-unavailable note when the browser has neither Bluetooth nor USB.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { RectangularPushButton } from "scenerystack/sun";
import BiomechanicsArmColors from "../../BiomechanicsArmColors.js";
import { LAB_SCREEN_VIEW_SETTINGS } from "../../BiomechanicsArmConstants.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../../common/BiomechanicsArmButtonOptions.js";
import { TransportKind } from "../../common/hardware/PascoTransport.js";
import { isTransportAvailable } from "../../common/hardware/transportSupport.js";
import { StringManager } from "../../i18n/StringManager.js";
import biomechanicsArmQueryParameters from "../../preferences/biomechanicsArmQueryParameters.js";
import { ANGLE_DECIMALS, FORCE_DECIMALS } from "../model/dataCsv.js";
import type { LabModel } from "../model/LabModel.js";
import { ConnectionState } from "../model/SensorChannel.js";
import { SensorPanel } from "./SensorPanel.js";

const LEFT_WIDTH: number = LAB_SCREEN_VIEW_SETTINGS.LEFT_WIDTH;
const BUTTON_FONT = new PhetFont({ size: LAB_SCREEN_VIEW_SETTINGS.BUTTON_FONT_SIZE, weight: "bold" });
const FONT = new PhetFont(LAB_SCREEN_VIEW_SETTINGS.FONT_SIZE);

export type SensorColumnOptions = {
  readonly demoModeProperty: TReadOnlyProperty<boolean>;
  /** Announces that both sensors were zeroed (screen context response). */
  readonly onZeroBoth: () => void;
};

export class SensorColumn extends VBox {
  public readonly forcePanel: SensorPanel;
  public readonly anglePanel: SensorPanel;
  public readonly zeroBothButton: RectangularPushButton;
  /** Shared by the Zero both button and the Alt+0 hotkey. */
  public readonly zeroBoth: () => void;

  public constructor(model: LabModel, options: SensorColumnOptions) {
    const labels = StringManager.getInstance().getLabels();
    const a11y = StringManager.getInstance().getLabA11yStrings();
    const showDiagnostics = biomechanicsArmQueryParameters.showDiagnostics;

    const eitherConnectedProperty = new DerivedProperty(
      [model.forceChannel.connectionStateProperty, model.angleChannel.connectionStateProperty],
      (force, angle) => force === ConnectionState.CONNECTED || angle === ConnectionState.CONNECTED,
    );

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
        options.onZeroBoth();
      }
    };
    const zeroBothButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(labels.zeroBothStringProperty, {
        font: BUTTON_FONT,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: LEFT_WIDTH - 40,
      }),
      accessibleName: labels.zeroBothStringProperty,
      accessibleHelpText: a11y.controls.zeroBothHelpStringProperty,
      enabledProperty: eitherConnectedProperty,
      listener: zeroBoth,
      xMargin: LAB_SCREEN_VIEW_SETTINGS.PUSH_BUTTON_X_MARGIN,
      yMargin: LAB_SCREEN_VIEW_SETTINGS.PUSH_BUTTON_Y_MARGIN,
    });

    // Shown only where neither Web Bluetooth nor WebUSB exists, so the empty panels are explained.
    const hardwareAvailable = isTransportAvailable(TransportKind.BLUETOOTH) || isTransportAvailable(TransportKind.USB);
    const hardwareNote = new RichText(labels.hardwareUnavailableStringProperty, {
      font: FONT,
      fill: BiomechanicsArmColors.warningColorProperty,
      lineWrap: LEFT_WIDTH,
      visible: !hardwareAvailable,
    });

    super({
      align: "left",
      spacing: LAB_SCREEN_VIEW_SETTINGS.LEFT_COLUMN_SPACING,
      children: [forcePanel, anglePanel, zeroBothButton, hardwareNote],
    });

    this.forcePanel = forcePanel;
    this.anglePanel = anglePanel;
    this.zeroBothButton = zeroBothButton;
    this.zeroBoth = zeroBoth;
  }
}
