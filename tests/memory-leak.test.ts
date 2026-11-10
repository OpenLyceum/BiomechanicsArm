/**
 * Memory-leak regression suite (fleet standard).
 *
 * List every model/view object that links Properties, adds listeners, or owns child
 * nodes, with a factory that builds a fresh instance. The shared harness in
 * tests/helpers/memoryLeak.ts (template-owned) checks that each one is garbage
 * collected after dispose() and leaves no survivors across repeated cycles.
 */

import { LabModel } from "../src/lab/model/LabModel.js";
import { SensorChannel } from "../src/lab/model/SensorChannel.js";
import { FakeSensorDevice } from "./helpers/FakeSensorDevice.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

describeDisposalLeaks([
  { name: "SensorChannel", create: () => new SensorChannel(() => new FakeSensorDevice()) },
  { name: "LabModel", create: () => new LabModel() },
]);
