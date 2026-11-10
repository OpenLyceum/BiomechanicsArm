/**
 * DemoArm.ts
 *
 * A simulated model arm and the two sensors on it, so the sim can be tried (and
 * tested, and fuzzed) with no hardware: `?demo`.
 *
 * The arm is the handout's: a uniform rod pivoted at one end on the rotary
 * sensor, a brass cylinder near the far end, and a horizontal string from the
 * rod's centre hole to the force sensor. With the rod at angle α above the
 * horizontal, torque balance about the pivot gives
 *
 *   T · L_T · sin α = (m_C · L_C + m_rod · L_T) · g · cos α
 *
 * The sensor angle θ is measured from the rod hanging straight down, so
 * α = θ − 90°. Below the horizontal the string is slack and the tension is zero.
 * The force sensor carries a small offset, as a real one does before it is
 * zeroed.
 */

import { dotRandom } from "scenerystack/dot";
import {
  DEMO_CYLINDER_DISTANCE,
  DEMO_CYLINDER_MASS,
  DEMO_FORCE_NOISE,
  DEMO_FORCE_OFFSET,
  DEMO_MAX_TENSION,
  DEMO_ROD_MASS,
  DEMO_STRING_DISTANCE,
  GRAVITY,
} from "../../BiomechanicsArmConstants.js";
import { countsToRadians, ROTARY_COUNTS_PER_REVOLUTION } from "./PascoProtocol.js";
import type { TSensorDevice } from "./SensorDevice.js";

/** String tension in N holding the demo arm at sensor angle θ (radians from hanging). */
export function demoTension(sensorAngle: number): number {
  const alpha = sensorAngle - Math.PI / 2;
  if (alpha <= 0) {
    return 0;
  }
  const weightTorquePerCos =
    (DEMO_CYLINDER_MASS * DEMO_CYLINDER_DISTANCE + DEMO_ROD_MASS * DEMO_STRING_DISTANCE) * GRAVITY;
  return Math.min(DEMO_MAX_TENSION, (weightTorquePerCos * Math.cos(alpha)) / (DEMO_STRING_DISTANCE * Math.sin(alpha)));
}

/** The simulated arm: its angle is set by the demo slider. */
export class DemoArm {
  /** Sensor angle in radians, from the rod hanging straight down. */
  public angle = 0;
}

export const DemoQuantity = {
  FORCE: "force",
  ANGLE: "angle",
} as const;

export type DemoQuantityValue = (typeof DemoQuantity)[keyof typeof DemoQuantity];

export class DemoSensorDevice implements TSensorDevice {
  public readonly diagnostic = "demo";
  public name: string | null = null;

  private readonly arm: DemoArm;
  private readonly quantity: DemoQuantityValue;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Arm angle when streaming began: a real encoder counts from there. */
  private angleAtStart = 0;

  public constructor(arm: DemoArm, quantity: DemoQuantityValue) {
    this.arm = arm;
    this.quantity = quantity;
  }

  public connect(): Promise<void> {
    this.name = this.quantity === DemoQuantity.FORCE ? "Force Accel (demo)" : "Rotary Motion (demo)";
    return Promise.resolve();
  }

  public start(periodMs: number, onSample: (value: number) => void): Promise<void> {
    this.angleAtStart = this.arm.angle;
    this.timer = setInterval(() => onSample(this.read()), periodMs);
    return Promise.resolve();
  }

  /** One reading, as the real sensor would report it. */
  public read(): number {
    if (this.quantity === DemoQuantity.FORCE) {
      return demoTension(this.arm.angle) + DEMO_FORCE_OFFSET + DEMO_FORCE_NOISE * dotRandom.nextGaussian();
    }
    // Quantized to whole encoder counts.
    const radiansPerCount = countsToRadians(1);
    return (
      Math.round((this.arm.angle - this.angleAtStart) / radiansPerCount) *
      ((2 * Math.PI) / ROTARY_COUNTS_PER_REVOLUTION)
    );
  }

  public disconnect(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.name = null;
    return Promise.resolve();
  }

  public onUnexpectedDisconnect(_listener: () => void): void {
    // A simulated sensor never drops its link.
  }
}
