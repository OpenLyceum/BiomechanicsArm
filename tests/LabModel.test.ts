import { toRadians } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { MAX_POINTS } from "../src/BiomechanicsArmConstants.js";
import { DemoArm, DemoQuantity, DemoSensorDevice, demoTension } from "../src/common/hardware/DemoArm.js";
import { TransportKind } from "../src/common/hardware/PascoTransport.js";
import { dataCsv } from "../src/lab/model/dataCsv.js";
import { LabModel } from "../src/lab/model/LabModel.js";
import { axisRange, decimalsFor, niceStep } from "../src/lab/view/formatting.js";
import { FakeSensorDevice } from "./helpers/FakeSensorDevice.js";

const setup = async () => {
  const force = new FakeSensorDevice();
  const angle = new FakeSensorDevice();
  const model = new LabModel({
    averagingSamples: 1,
    createForceDevice: () => force,
    createAngleDevice: () => angle,
  });
  await model.forceChannel.connect(TransportKind.BLUETOOTH);
  await model.angleChannel.connect(TransportKind.BLUETOOTH);
  return { model, force, angle };
};

describe("LabModel", () => {
  it("cannot record until both sensors are connected", async () => {
    const model = new LabModel({ createForceDevice: () => new FakeSensorDevice() });
    expect(model.canRecordProperty.value).toBe(false);
    await model.forceChannel.connect(TransportKind.BLUETOOTH);
    expect(model.canRecordProperty.value).toBe(false);
    expect(model.recordPoint()).toBeNull();
  });

  it("records the angle in degrees and the tension in newtons", async () => {
    const { model, force, angle } = await setup();
    angle.emit(toRadians(134));
    force.emit(1.54);
    const point = model.recordPoint();
    expect(point?.angleDegrees).toBeCloseTo(134, 9);
    expect(point?.forceNewtons).toBe(1.54);
    expect(model.pointsProperty.value).toHaveLength(1);
  });

  it("zeroes both sensors together", async () => {
    const { model, force, angle } = await setup();
    angle.emit(0.2);
    force.emit(0.12);
    model.zeroBoth();
    expect(model.angleDegreesProperty.value).toBe(0);
    expect(model.forceChannel.valueProperty.value).toBe(0);
  });

  it("deletes one point and clears all", async () => {
    const { model, force, angle } = await setup();
    for (const degrees of [170, 158, 142]) {
      angle.emit(toRadians(degrees));
      force.emit(degrees / 100);
      model.recordPoint();
    }
    model.deletePoint(1);
    expect(model.pointsProperty.value.map((point) => Math.round(point.angleDegrees))).toEqual([170, 142]);
    model.clearPoints();
    expect(model.pointsProperty.value).toEqual([]);
  });

  it("stops recording when the table is full", async () => {
    const { model } = await setup();
    for (let i = 0; i < MAX_POINTS + 3; i++) {
      model.recordPoint();
    }
    expect(model.pointsProperty.value).toHaveLength(MAX_POINTS);
    expect(model.canRecordProperty.value).toBe(false);
  });

  it("reset clears the data and settings but keeps the sensors connected", async () => {
    const { model, force } = await setup();
    force.emit(1);
    model.recordPoint();
    model.axesSwappedProperty.value = true;
    model.forceChannel.reversedProperty.value = true;
    model.reset();
    expect(model.pointsProperty.value).toEqual([]);
    expect(model.axesSwappedProperty.value).toBe(false);
    expect(model.forceChannel.reversedProperty.value).toBe(false);
    expect(model.forceChannel.isConnected).toBe(true);
  });
});

describe("dataCsv", () => {
  it("writes a header and one numbered row per point", () => {
    const csv = dataCsv(
      [
        { angleDegrees: 170, forceNewtons: 0.23 },
        { angleDegrees: 105.04, forceNewtons: 5.5 },
      ],
      "Angle (°)",
      "Tension (N)",
    );
    expect(csv).toBe('"#","Angle (°)","Tension (N)"\r\n1,170.00,0.230\r\n2,105.04,5.500\r\n');
  });
});

describe("demo arm", () => {
  it("has a slack string at and below the horizontal", () => {
    expect(demoTension(0)).toBe(0);
    expect(demoTension(toRadians(90))).toBe(0);
  });

  it("reproduces the handout's torque balance", () => {
    // (0.0753·0.300 + 0.0292·0.165)·9.8 / 0.165 = 1.628 N at α = 45°
    expect(demoTension(toRadians(135))).toBeCloseTo(1.628, 3);
  });

  it("is within reach of the sample measurements", () => {
    // Sample data: sensor angle → measured tension.
    const samples: [number, number][] = [
      [158, 0.62],
      [142, 1.12],
      [134, 1.54],
      [127, 2.02],
      [119, 2.7],
      [114, 3.4],
      [105, 5.5],
    ];
    for (const [degrees, measured] of samples) {
      const predicted = demoTension(toRadians(degrees));
      expect(Math.abs(predicted - measured) / measured).toBeLessThan(0.25);
    }
  });

  it("counts the angle from where streaming began, in whole encoder counts", async () => {
    const arm = new DemoArm();
    const device = new DemoSensorDevice(arm, DemoQuantity.ANGLE);
    arm.angle = toRadians(10);
    await device.connect();
    await device.start(1000, () => undefined);
    arm.angle = toRadians(100);
    expect(device.read()).toBeCloseTo(toRadians(90), 12);
    await device.disconnect();
  });
});

describe("axis helpers", () => {
  it("picks 1-2-5 steps", () => {
    expect(niceStep(180)).toBe(50);
    expect(niceStep(5)).toBe(1);
    expect(niceStep(0.9)).toBe(0.2);
    expect(decimalsFor(0.2)).toBe(1);
    expect(decimalsFor(50)).toBe(0);
  });

  it("includes zero, the default span and the data", () => {
    expect(axisRange([], 5)).toEqual({ min: 0, max: 5, step: 1 });
    expect(axisRange([5.5], 5)).toEqual({ min: 0, max: 6, step: 1 });
    const range = axisRange([-20, 170], 180);
    expect(range.min).toBe(-50);
    expect(range.max).toBe(200);
  });

  it("keeps the angle axis in 30° steps while that stays readable", () => {
    expect(axisRange([170], 180, 30)).toEqual({ min: 0, max: 180, step: 30 });
    expect(axisRange([-20, 200], 180, 30)).toEqual({ min: -30, max: 210, step: 30 });
    expect(axisRange([900], 180, 30).step).toBe(200);
  });
});
