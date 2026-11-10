/**
 * SensorPanel.ts
 *
 * One sensor: how to connect it (Bluetooth, USB, or the simulated sensor in demo
 * mode), its state, a large live reading, a Zero button and Reverse direction.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Rectangle, type TColor, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, RectangularPushButton } from "scenerystack/sun";
import BiomechanicsArmColors from "../../BiomechanicsArmColors.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../../common/BiomechanicsArmButtonOptions.js";
import { BIOMECHANICS_ARM_CHECKBOX_OPTIONS } from "../../common/BiomechanicsArmControlOptions.js";
import { BiomechanicsArmPanel } from "../../common/BiomechanicsArmPanel.js";
import { TransportKind, type TransportKindValue } from "../../common/hardware/PascoTransport.js";
import { isTransportAvailable } from "../../common/hardware/transportSupport.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CONNECTION_LOST, ConnectionState, type SensorChannel } from "../model/SensorChannel.js";

const FONT = new PhetFont(12);
const BUTTON_FONT = new PhetFont({ size: 13, weight: "bold" });
const READOUT_FONT = new PhetFont({ size: 30, weight: "bold" });
const READOUT_HEIGHT = 46;

export type SensorPanelOptions = {
  readonly title: TReadOnlyProperty<string>;
  readonly color: TColor;
  /** Pattern with a `{{value}}` placeholder, e.g. "{{value}} N". */
  readonly valuePattern: TReadOnlyProperty<string>;
  /** The reading in display units. */
  readonly displayValueProperty: TReadOnlyProperty<number>;
  readonly decimals: number;
  readonly demoModeProperty: TReadOnlyProperty<boolean>;
  readonly showDiagnostics: boolean;
  readonly width: number;
  readonly accessibleNames: {
    readonly bluetooth: TReadOnlyProperty<string>;
    readonly usb: TReadOnlyProperty<string>;
    readonly demo: TReadOnlyProperty<string>;
    readonly disconnect: TReadOnlyProperty<string>;
    readonly zero: TReadOnlyProperty<string>;
    readonly reverse: TReadOnlyProperty<string>;
  };
};

export class SensorPanel extends BiomechanicsArmPanel {
  /** Interactive nodes, in traversal order. */
  public readonly controls: readonly Node[];

  public constructor(channel: SensorChannel, options: SensorPanelOptions) {
    const labels = StringManager.getInstance().getLabels();
    const innerWidth = options.width - 24;

    const isState = (wanted: (typeof ConnectionState)[keyof typeof ConnectionState]) =>
      new DerivedProperty([channel.connectionStateProperty], (state) => state === wanted);
    const disconnectedProperty = isState(ConnectionState.DISCONNECTED);
    const connectedProperty = isState(ConnectionState.CONNECTED);

    // ── Status line: device name, state, or the last error ─────────────────────
    const statusProperty = new DerivedProperty(
      [
        channel.connectionStateProperty,
        channel.deviceNameProperty,
        channel.errorMessageProperty,
        labels.notConnectedStringProperty,
        labels.connectingStringProperty,
        labels.connectionLostStringProperty,
      ],
      (state, name, error, notConnected, connecting, lost) => {
        if (state === ConnectionState.CONNECTED) {
          return name ?? "";
        }
        if (state === ConnectionState.CONNECTING) {
          return connecting;
        }
        return error === null ? notConnected : error === CONNECTION_LOST ? lost : error;
      },
    );
    const statusFillProperty = new DerivedProperty(
      [
        channel.connectionStateProperty,
        channel.errorMessageProperty,
        BiomechanicsArmColors.textColorProperty,
        BiomechanicsArmColors.warningColorProperty,
      ],
      (state, error, text, warning) => (state === ConnectionState.DISCONNECTED && error !== null ? warning : text),
    );

    // ── Connection buttons ─────────────────────────────────────────────────────
    const textButton = (
      label: TReadOnlyProperty<string>,
      accessibleName: TReadOnlyProperty<string>,
      listener: () => void,
      visibleProperty: TReadOnlyProperty<boolean>,
      maxWidth: number,
    ) =>
      new RectangularPushButton({
        ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
        content: new Text(label, { font: BUTTON_FONT, fill: LIGHT_SURFACE_TEXT_FILL, maxWidth }),
        accessibleName,
        visibleProperty,
        listener,
        xMargin: 8,
        yMargin: 5,
      });

    // Synchronous listeners so the browser still sees a user gesture; connect() never rejects.
    const connectButton = (
      kind: TransportKindValue,
      label: TReadOnlyProperty<string>,
      accessibleName: TReadOnlyProperty<string>,
    ) => {
      const offered =
        kind === TransportKind.DEMO
          ? new DerivedProperty(
              [disconnectedProperty, options.demoModeProperty],
              (disconnected, demo) => disconnected && demo,
            )
          : new DerivedProperty([disconnectedProperty], (disconnected) => disconnected && isTransportAvailable(kind));
      return textButton(
        label,
        accessibleName,
        () => {
          channel.connect(kind).catch(() => undefined);
        },
        offered,
        58,
      );
    };

    const bluetoothButton = connectButton(
      TransportKind.BLUETOOTH,
      labels.bluetoothStringProperty,
      options.accessibleNames.bluetooth,
    );
    const usbButton = connectButton(TransportKind.USB, labels.usbStringProperty, options.accessibleNames.usb);
    const demoButton = connectButton(TransportKind.DEMO, labels.demoStringProperty, options.accessibleNames.demo);
    const disconnectButton = textButton(
      labels.disconnectStringProperty,
      options.accessibleNames.disconnect,
      () => {
        channel.disconnect().catch(() => undefined);
      },
      new DerivedProperty([disconnectedProperty], (disconnected) => !disconnected),
      innerWidth - 20,
    );

    // ── Live reading ───────────────────────────────────────────────────────────
    const readoutProperty = new DerivedProperty(
      [options.displayValueProperty, connectedProperty, options.valuePattern, labels.noReadingStringProperty],
      (value, connected, pattern, none) =>
        connected ? StringUtils.fillIn(pattern, { value: toFixed(value, options.decimals) }) : none,
    );
    const readoutBackground = new Rectangle(0, 0, innerWidth, READOUT_HEIGHT, {
      cornerRadius: 4,
      fill: BiomechanicsArmColors.chartBackgroundColorProperty,
      stroke: BiomechanicsArmColors.panelBorderColorProperty,
    });
    const readoutText = new Text(readoutProperty, {
      font: READOUT_FONT,
      fill: options.color,
      maxWidth: innerWidth - 16,
    });
    readoutText.boundsProperty.link(() => {
      readoutText.center = readoutBackground.center;
    });

    // ── Zero and Reverse direction ─────────────────────────────────────────────
    const zeroButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(labels.zeroStringProperty, { font: BUTTON_FONT, fill: LIGHT_SURFACE_TEXT_FILL, maxWidth: 60 }),
      accessibleName: options.accessibleNames.zero,
      enabledProperty: connectedProperty,
      listener: () => channel.zero(),
      xMargin: 10,
      yMargin: 5,
    });
    const reverseCheckbox = new Checkbox(
      channel.reversedProperty,
      new Text(labels.reverseDirectionStringProperty, {
        font: FONT,
        fill: BiomechanicsArmColors.textColorProperty,
        maxWidth: innerWidth - 110,
      }),
      { ...BIOMECHANICS_ARM_CHECKBOX_OPTIONS, accessibleName: options.accessibleNames.reverse },
    );

    super(
      new VBox({
        align: "left",
        spacing: 6,
        children: [
          new Text(options.title, {
            font: new PhetFont({ size: 15, weight: "bold" }),
            fill: options.color,
            maxWidth: innerWidth,
          }),
          new Text(statusProperty, { font: FONT, fill: statusFillProperty, maxWidth: innerWidth }),
          new HBox({
            spacing: 6,
            children: [
              new Text(labels.connectStringProperty, {
                font: FONT,
                fill: BiomechanicsArmColors.textColorProperty,
                maxWidth: 70,
                visibleProperty: disconnectedProperty,
              }),
              bluetoothButton,
              usbButton,
              demoButton,
              disconnectButton,
            ],
          }),
          new Node({ children: [readoutBackground, readoutText] }),
          new HBox({ spacing: 12, children: [zeroButton, reverseCheckbox] }),
          ...(options.showDiagnostics
            ? [
                new Text(channel.diagnosticProperty, {
                  font: new PhetFont(10),
                  fill: BiomechanicsArmColors.warningColorProperty,
                  maxWidth: innerWidth,
                }),
              ]
            : []),
        ],
      }),
      { minWidth: options.width, maxWidth: options.width },
    );

    this.controls = [bluetoothButton, usbButton, demoButton, disconnectButton, zeroButton, reverseCheckbox];
  }
}
