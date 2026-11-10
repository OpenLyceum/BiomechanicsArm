# AGENTS.md — Biomechanics Arm

Sim-specific context for AI assistants. General SceneryStack guidance:
[OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

A data-acquisition front end for the PHY 127 "Biomechanics" lab: a model forearm
(a rod on a PASCO Wireless Rotary Motion Sensor, PS-3220) held at an angle by a
horizontal string tied to a Wireless Force Acceleration Sensor (PS-3202). The sim
connects to both sensors over Web Bluetooth or WebUSB, shows live readings, lets
the student zero each sensor and reverse its direction, records about ten
(angle, tension) points, graphs them and exports them as CSV.

It measures and records only. Torques, percent error, the pivot force and the
handout's angle α are the student's work in a spreadsheet; do not add them
without being asked.

What is measured and how: [`doc/model.md`](doc/model.md). Architecture, the PASCO
protocol and the state of USB support:
[`doc/implementation-notes.md`](doc/implementation-notes.md). Read both before
changing hardware or model code.

## Key files

| File | Purpose |
|---|---|
| `src/common/hardware/PascoProtocol.ts` | Pure PASCO wire protocol: UUIDs, sampling commands, force and rotary decoders, USB envelope |
| `src/common/hardware/PascoTransport.ts` | `TPascoTransport`, the seam between the protocol and the wire; `TransportKind` |
| `src/common/hardware/BluetoothPascoTransport.ts` | Web Bluetooth carrier |
| `src/common/hardware/UsbPascoTransport.ts` | WebUSB carrier (proven on the PS-3219 only; see implementation notes) |
| `src/common/hardware/SensorDevice.ts` | `TSensorDevice`, `PascoSensorDevice` (set-up, streaming, acknowledgements) and the two sensor specs |
| `src/common/hardware/DemoArm.ts` | Simulated arm and sensors for demo mode, tests and the fuzzer |
| `src/common/hardware/transportSupport.ts` | Which transports this browser offers |
| `src/lab/model/SensorChannel.ts` | One sensor as the student sees it: connection, averaged reading, zero, reverse |
| `src/lab/model/LabModel.ts` | Two channels, recorded points, demo arm angle |
| `src/lab/model/dataCsv.ts` | `DataPoint` and the CSV builder (pure) |
| `src/lab/view/LabScreenView.ts` | Three-column layout, shortcuts, `pdomOrder`, CSV download |
| `src/lab/view/SensorPanel.ts` | Connect buttons, status, large readout, Zero, Reverse direction |
| `src/lab/view/DataTableNode.ts` | Fixed-height table with a delete button per row |
| `src/lab/view/PointsGraphNode.ts` | bamboo scatter plot with autoscaled axes and a live marker |
| `src/lab/view/ArmDiagramNode.ts` | Schematic of the arm at the measured angle |
| `src/preferences/biomechanicsArmQueryParameters.ts` | `?demo`, `?samplePeriod=`, `?showDiagnostics` |
| `scripts/probe/usb-probe.html` | Bring-up page for checking a sensor over USB; not part of the sim |

## Conventions specific to this sim

- **Angles** are radians in the model (`SensorChannel.valueProperty`) and degrees
  everywhere the student sees them (`LabModel.angleDegreesProperty`, the table,
  the CSV). Force is newtons throughout.
- **Zero then sign.** `value = sign × (mean − zeroOffset)`; keep that order so
  reversing never moves the zero.
- **`connect()` never rejects.** Outcomes go to `connectionStateProperty` and
  `errorMessageProperty`. Button listeners that open a device picker must stay
  synchronous up to `requestDevice()`, or the browser drops the user gesture.
- **Reset All keeps connections.** It clears points, zeros and settings only.
- **No hardware in tests.** Use `tests/helpers/FakeSensorDevice.ts` or a fake
  `TPascoTransport` (see `tests/SensorDevice.test.ts`).
- The dev server port 5173 may be taken by another sim; any free port works.

## Accessibility

Every control has an `accessibleName` from the `a11y.lab.controls` strings; the
screen summary's current-details paragraph is live (both readings and the point
count); recording, deleting, clearing, zeroing and downloading each add a context
response. Alt+P records a point and Alt+0 zeroes both sensors from anywhere on
the screen (`LabKeyboardHelpContent.ts` holds the `HotkeyData`). Full convention:
[Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

- `tsconfig.json` and `tsconfig.test.json`: add the `web-bluetooth` and
  `w3c-web-usb` types.

### `package.json` overrides

JSON cannot carry comments, so the rationale for forced transitive pins lives here. Prefer
**tilde (`~`) or exact** versions — caret (`^`) lets minors drift under what is meant to be a
hard pin. Dependabot ignores these three names (see `.github/dependabot.yml`) so it does not
open PRs that fight the overrides. Revisit when SceneryStack drops or re-pins them upstream.

| Override | Pin | Why |
|---|---|---|
| `lodash` | `~4.18.1` | SceneryStack declares `~4.17.12`. Bump clears Dependabot/npm advisories patched in 4.18.x (e.g. GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh). |
| `three` | `~0.125.2` | SceneryStack declares `^0.104.0`. Floor is 0.125.0 for GHSA-fq6p-x6j3-cmmq (ReDoS). Staying on the 0.125 line avoids a larger API jump; **0.125.x still has open CVEs** (e.g. XSS GHSA-7vvq-7r29-5vg3, fixed only in ≥0.137.0). Remove this override if/when SceneryStack stops depending on `three` or pins a patched line itself. |
| `brace-expansion` | `~5.0.12` | Transitive via `vite-plugin-pwa` / Workbox. Clears npm audit (originally GHSA-mh99-v99m-4gvg; keep ≥5.0.9 for GHSA-rgw5-rvv9-x895; ≥5.0.12 for the CPU-DoS advisory). |

## Testing

| Path | Purpose |
|---|---|
| `tests/PascoProtocol.test.ts` | Commands, force and rotary decoding, USB envelope |
| `tests/SensorDevice.test.ts` | Set-up sequence, per-channel acknowledgements, disconnect, against a fake transport |
| `tests/SensorChannel.test.ts` | Averaging, zero, reverse, cancelled picker, failures, dropped link |
| `tests/LabModel.test.ts` | Recording, delete/clear, reset, CSV, demo arm physics, axis helpers |
| `tests/memory-leak.test.ts` | `SensorChannel` and `LabModel` disposal |
| `tests/fuzz/fuzz.spec.ts` | Template-owned Playwright fuzz (pointer and keyboard) |

Real sensors cannot be tested in CI. After any change under
`src/common/hardware/`, say plainly that it is untested on hardware until someone
has run it with the sensors.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run build:single` | Single-file build mode |
| `npm run check` | TypeScript (`tsc --noEmit` on app, scripts, and tests) |
| `npm run lint` / `npm run fix` | Biome check / auto-fix |
| `npm test` | Vitest unit tests |
| `npm run test:fuzz` | Playwright fuzz smoke (pointer + keyboard, `?ea`, 30s each; `npm run test:fuzz -- 90` to change) |
| `npm run test:fuzz:quick` | 10s fuzz |
| `npm run test:fuzz:long` | 300s fuzz |
| `npm run icons` | Regenerate PWA icons; seed missing screenshots, preserve existing ones |
| `npm run release` | `check && lint && build && test`, then version patch + push tags |

`src/init.ts` reads `version` from `package.json`, so the patch bump shows up in the About dialog
without a second edit.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
Web Bluetooth and WebUSB need HTTPS or localhost, and Chrome or Edge.
