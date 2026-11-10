# Biomechanics Arm

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

Live force and angle readings from two PASCO wireless sensors for a model-arm
torque lab (static equilibrium, introductory physics), built with
[SceneryStack](https://scenerystack.org/), Vite 8, TypeScript 7, and Biome 2.

## Features

- Connects to a PASCO Wireless Force Acceleration Sensor (PS-3202) and a Wireless Rotary Motion Sensor (PS-3220) over Web Bluetooth, or over USB where the browser supports WebUSB (Chrome or Edge, on HTTPS or localhost)
- Large live readouts of string tension (N) and arm angle (degrees)
- Zero button and Reverse direction for each sensor, plus Zero both sensors
- Record up to 15 points, delete or clear them, and download them as CSV for a spreadsheet
- Scatter plot of the recorded points with a marker at the live reading, and swappable axes
- Diagram of the arm at the measured angle, so a wrong sign is obvious
- Demo mode (`?demo`, or Preferences → Simulation) with a simulated arm and sensors, for trying the lab with no hardware
- Keyboard shortcuts (Alt+P records a point, Alt+0 zeroes both sensors), screen-reader descriptions, English, French and Spanish, default and projector colors, installable PWA

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

Open `http://localhost:5173/?demo` to try it without sensors. To check a sensor
over USB before a lab, open `http://localhost:5173/scripts/probe/usb-probe.html`.

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (includes memory-leak suite) |
| `npm run test:fuzz` | Optional Playwright fuzz smoke: pointer (`?fuzz`) + keyboard (`?fuzzBoard`), with `?ea`, 30s each |
| `npm run test:fuzz -- 90` | Same fuzz for 90 seconds (`--duration 90` or `FUZZ_DURATION=90` also work) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run test:fuzz:long` | Longer fuzz smoke (300s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run release` | `check && lint && build && test`, then version patch + push tags |
| `npm run clean` | Remove `dist/` |

New sims start at `version: "0.0.0"` in `package.json`. Bump only when cutting a release (for example `npm version patch` and a matching git tag). Keep `name` in kebab-case; it is separate from the SceneryStack sim identifier in `src/init.ts`, which reads its `version` from `package.json`.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^2 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenLyceum org license](https://github.com/OpenLyceum/.github/blob/main/LICENSE).

## Contributing

See [OpenLyceum contributing guidelines](https://github.com/OpenLyceum/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
