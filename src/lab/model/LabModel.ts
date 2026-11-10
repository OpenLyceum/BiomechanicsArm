/**
 * LabModel.ts
 *
 * The Lab screen's model: the two sensor channels (string tension and arm
 * angle), the points the student has recorded, and the simulated arm used in
 * demo mode.
 *
 * The sim measures and records; it does not compute torques or the handout's
 * angle α. Those are the student's work in the spreadsheet.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range, toDegrees, toRadians } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { DEMO_MAX_ANGLE_DEGREES, MAX_POINTS } from "../../BiomechanicsArmConstants.js";
import BiomechanicsArmNamespace from "../../BiomechanicsArmNamespace.js";
import { BluetoothPascoTransport } from "../../common/hardware/BluetoothPascoTransport.js";
import { DemoArm, DemoQuantity, DemoSensorDevice } from "../../common/hardware/DemoArm.js";
import { TransportKind, type TransportKindValue } from "../../common/hardware/PascoTransport.js";
import {
  FORCE_SENSOR_SPEC,
  PascoSensorDevice,
  ROTARY_SENSOR_SPEC,
  type SensorSpec,
  type TSensorDevice,
} from "../../common/hardware/SensorDevice.js";
import { UsbPascoTransport } from "../../common/hardware/UsbPascoTransport.js";
import type { DataPoint } from "./dataCsv.js";
import {
  ConnectionState,
  SensorChannel,
  type SensorChannelOptions,
  type SensorDeviceFactory,
} from "./SensorChannel.js";

export type LabModelOptions = SensorChannelOptions & {
  /** Log USB bring-up to the console. */
  readonly logUsb?: boolean;
  /** Replaces the real device factories; for tests. */
  readonly createForceDevice?: SensorDeviceFactory;
  readonly createAngleDevice?: SensorDeviceFactory;
};

export class LabModel implements TModel {
  /** String tension, N. */
  public readonly forceChannel: SensorChannel;

  /** Arm angle from where it was zeroed, radians. */
  public readonly angleChannel: SensorChannel;

  /** Arm angle in degrees, as displayed and recorded. */
  public readonly angleDegreesProperty: TReadOnlyProperty<number>;

  /** The recorded points, in the order taken. Replaced, never mutated. */
  public readonly pointsProperty = new Property<readonly DataPoint[]>([]);

  /** True when both sensors are live and the table has room. */
  public readonly canRecordProperty: TReadOnlyProperty<boolean>;

  /** Graph orientation: tension against angle (false) or, swapped, angle against tension. */
  public readonly axesSwappedProperty = new BooleanProperty(false);

  /** Angle of the simulated arm in degrees from hanging, set by the demo slider. */
  public readonly demoAngleProperty = new NumberProperty(0, { range: new Range(0, DEMO_MAX_ANGLE_DEGREES) });

  private readonly demoArm = new DemoArm();

  public constructor(options?: LabModelOptions) {
    const factory =
      (spec: SensorSpec, quantity: (typeof DemoQuantity)[keyof typeof DemoQuantity]): SensorDeviceFactory =>
      (kind: TransportKindValue): TSensorDevice => {
        if (kind === TransportKind.DEMO) {
          return new DemoSensorDevice(this.demoArm, quantity);
        }
        const transport =
          kind === TransportKind.USB ? new UsbPascoTransport(options?.logUsb === true) : new BluetoothPascoTransport();
        return new PascoSensorDevice(transport, spec);
      };

    this.forceChannel = new SensorChannel(
      options?.createForceDevice ?? factory(FORCE_SENSOR_SPEC, DemoQuantity.FORCE),
      options,
    );
    this.angleChannel = new SensorChannel(
      options?.createAngleDevice ?? factory(ROTARY_SENSOR_SPEC, DemoQuantity.ANGLE),
      options,
    );

    this.angleDegreesProperty = new DerivedProperty([this.angleChannel.valueProperty], (angle) => toDegrees(angle));

    this.canRecordProperty = new DerivedProperty(
      [this.forceChannel.connectionStateProperty, this.angleChannel.connectionStateProperty, this.pointsProperty],
      (force, angle, points) =>
        force === ConnectionState.CONNECTED && angle === ConnectionState.CONNECTED && points.length < MAX_POINTS,
    );

    this.demoAngleProperty.link((degrees) => {
      this.demoArm.angle = toRadians(degrees);
    });
  }

  /** Adds the current readings to the table. Returns the point, or null if it could not be taken. */
  public recordPoint(): DataPoint | null {
    if (!this.canRecordProperty.value) {
      return null;
    }
    const point: DataPoint = {
      angleDegrees: this.angleDegreesProperty.value,
      forceNewtons: this.forceChannel.valueProperty.value,
    };
    this.pointsProperty.value = [...this.pointsProperty.value, point];
    return point;
  }

  public deletePoint(index: number): void {
    this.pointsProperty.value = this.pointsProperty.value.filter((_point, i) => i !== index);
  }

  public clearPoints(): void {
    this.pointsProperty.value = [];
  }

  /** The handout's step: string unhooked, rod hanging still, both sensors set to zero. */
  public zeroBoth(): void {
    this.forceChannel.zero();
    this.angleChannel.zero();
  }

  /** Reset All: clears the data, the zeros and the settings; connections are kept. */
  public reset(): void {
    this.clearPoints();
    this.forceChannel.reset();
    this.angleChannel.reset();
    this.axesSwappedProperty.reset();
    this.demoAngleProperty.reset();
  }

  public step(_dt: number): void {
    // Readings arrive from the sensors on their own clocks; nothing to integrate.
  }

  public dispose(): void {
    this.canRecordProperty.dispose();
    this.angleDegreesProperty.dispose();
    this.forceChannel.dispose();
    this.angleChannel.dispose();
    this.pointsProperty.dispose();
    this.axesSwappedProperty.dispose();
    this.demoAngleProperty.dispose();
  }
}

BiomechanicsArmNamespace.register("LabModel", LabModel);
