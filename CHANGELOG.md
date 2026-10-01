# Changelog

## 8.5.0 - Control-system refactor, Phase 5 (`dial`: wheel / crank / knob)
- `controls.js`: new `dial` primitive (`createDial`, `controls.dial`, `controls.dragging`). `look:'wheel'|'crank'|'knob'`; drag anywhere with pointer capture (angle from the pointer, unwrapped across ±180°); `range` degrees, `wrap:true` (crank) or clamped (wheel); optional `spring:'return'` on the SHARED animation loop (still exactly one `requestAnimationFrame` call site); ←/→ 10° (→ = clockwise = right), `Enter` / `Home` = default, `role="slider"` with degree `aria-*`; `onGrab(active)`; reduced motion = no spring. `UI.create({axes})` and `CFG.ctls[]` host dials.
- `controls-core.js` (pure, tested): `angleFromPointer`, `unwrapDelta`, `wrapDeg`, `dialToDeg`, `degToDial`, `dialDefault`, `snapDial`, `dialRealValue`, `dialAddDelta`, `dialSpringStep`, `isDial`; `realValue` / `fromReal` / `snapNormalized` / `defaultNormalized` understand dial specs (`controls.value(id)` = degrees); `dialValueText` reads a crank as plain degrees; `keyToIntent('dial')` handles wrapping dials and `Enter` / `Home` (`{reset:true}`); the registry clamps a wrapping dial to 0..1.
- Migrated `engine` (`crank`, 0–720°, wraps; the crank angle is gone from the badge, the panel row and the chip), `steering` (`wheel`, ±180°, springs to centre; "Centre wheels" and the on-screen label removed), `differential` (`wheel`, ±129.6° = ±`MAX_STEER_ANGLE`; Auto Drive drives the dial and any touch disengages it as before), `awd` (`steer`: the interim 0–100 % slider is now a ±180° wheel, `S.steering = |dial|`, so 0 / 50 / 100 % = centre / 90° / full lock).
- Deleted the copy-pasted `steer-*` / `crank-*` / `sw-*` markup, CSS and pointer / key handlers. Arrow-key signs unified: → is clockwise (the old steering and differential handlers already agreed visually; their internal variables just used opposite signs). Space no longer centres the wheel (it stays play / pause); Enter / Home do.
- Tests: `tests/dial.test.mjs` (angle ↔ normalised mapping, 720° wrap, unwrap across the seam, key direction, spring equivalence + frame-rate independence, `dialValueText`, `controls.value`, static module checks, optional jsdom DOM group). Cache `autolab-v8.5`.

## 8.4.0 - Control-system refactor, Phase 4 (`axis` pedal look + `momentary`)
- `controls.js`: `axis` takes `look:'pedal'` (vertical 54×158 on desktop, 52 px horizontal bar on phones; pointer capture; `spring:'return'` + `k`; ticks; ARIA slider; ↑/↓; Shift-hold quick press; Space does nothing) and a new `momentary` primitive (clutch: pointer, Shift, Enter/Space on the focused element; registry 0/1; events on both edges). ONE shared animation loop for every pedal (starts on first release, stops when all are at rest); `prefers-reduced-motion` releases instantly. `UI.create({axes})` also hosts `type:'momentary'`.
- `controls-core.js` (pure, tested): `decayFactorToK`, `springStepAxis`, `pedalIntent` / `pedalUpIntent`, `createPedalModel`, `PEDAL_RAMP`.
- Migrated `braking` (`brake`, k 7.67), `automatic` (`throttle`, 9.05; P R N D untouched), `carburetor` (`throttle`, 9.05), `turbocharger` (`throttle`, 7.67), `abs-esc` (interim slider -> pedal, id `brake`, 7.67), `clutch` (momentary `clutch`). Deleted the five copy-pasted pedal widgets (`wirePedal`, `springRelease`, `cancelReturn`, `__setPos`, …) and their CSS (`.br-pedal-*`, `.at-pedal-*`, `.carb-pedal-*`, `#accel-*`, `.clutch-pedal-*`, the turbocharger light-theme override). Pedal captions ("Press & hold · 0%", "Hold to disengage") removed: the pedal shows its value once. Each module's Reset calls `ui.controls.resetAll()`.
- `abs-esc`: a pedal springs back to 0, so the old resting default of 40 % brake is gone.
- Tests: pedal maths, frame-rate independence, Shift-hold model, momentary edges (`tests/controls.test.mjs`); static greps + optional jsdom DOM tests (`tests/axis.test.mjs`). Cache `autolab-v8.4`.

## 8.3.0 - Control-system refactor, Phase 3 (`axis` slider + single-quantity fixes)
- New `controls.js` (`axis`, slider look) + `.ctl-axis` styles in `controls.css`: 44 px target, value bubble while dragging, unit + `aria-valuetext`, focus ring, reduced-motion safe, ↑/↓ keys. One shared store (`ui.controls.get/value/raw/set/on/resetAll`); duplicate ids throw. `controls-core.js` gained step-snapped real-value helpers (`realValue`, `rawValue`, `fromReal`, `snapNormalized`).
- `runGuidedModule` takes `CFG.ctls[]` (`CFG.ctl` kept as a shim). The 10 multi-slider guided modules (awd, catalytic, commonrail, dpf, driveshaft, egr, fuelpump, intercooler, oilpump, radiator) moved their hand-written sliders into the dock; the single-slider guided modules use the shim. `UI.create` takes `axes:[…]`.
- `ecu` (load), `valvetrain` (cam advance), `crankshaft-piston` (rod ratio), `abs-esc` (brake %, as a slider for now) use axes. fuelpump uses real volts (preset `voltage`, `scale` 100).
- D8/D16: `ignition` (engine rpm), `mpfi` (engine load), `abs-esc` (vehicle speed), `cooling` (engine rpm) have their own axes and no longer read `state.speedMul` as a physical quantity. The Phase 1 temporary slider (`data-phase1-temp`, `#speed-module`) is gone.
- Removed `.al-range`, `.ui-tb-speed*`, `Widgets.slider`. `awd` "Steering input" is an axis for now (becomes a dial in Phase 5). A module's Reset now also resets its axes.
- New `tests/axis.test.mjs`; axis mapping tests in `tests/controls.test.mjs`. Cache `autolab-v8.3`.


## 8.2.0 - Control-system refactor, Phase 2 (stage layout & dock)
- New `dock.js`: one control dock per module document (embedded AND standalone) - handle (swipe up = options row, down = 56 px slim bar), transport (play/pause, reset - one node each), primary zone (1 = centred, 2 = left/right thumb zones, 3+ = pages with dots), options row (Flow + module extras). Default 24 vh, max 30 vh; landscape phones get two 140 px side rails; desktop is one auto-height bar. State persists per module in `sessionStorage` (`autolab.dock.<moduleId>`); the dock hides while a `<select>` soft keyboard is open. Pure logic is unit-tested (`tests/dock.test.mjs`).
- Stage: `#canvas-wrap` (and `#labels-root`, so labels never draw over the dock) is inset by `--stage-top` (0 embedded, header height standalone) and `--dock-h`. `kit.js` adds a `ResizeObserver` on the stage; the camera view is nudged up on portrait phones.
- `UI.create` keeps `widgets:{bl,br}`, `toolbar`, `extras` but mounts them inside the dock. Bottom slots `bl`/`br`/`bc` are removed. Info panel is a bottom sheet (<= 50 vh, closed by default) opened by the header i on phones and a side panel on desktop; the readout chip is a one-line strip on phones.
- Standalone modules draw the same `chrome.js` header + menu as the shell (owner = module; D/L/W/X keep the menu in sync). Standalone Back button removed. Default label density is Key on phones.
- Flow toggle restored (dock options row). Play/reset restored for embedded modules.
- Fixed double click-wiring of play/reset in `automatic`, `braking`, `carburetor`, `cooling`.
- z-index limited to the R10 scale in `app.css`/`index.html`; `100vh` -> `100dvh` in `wiring.html`/`404.html`; Phase 1 leftovers removed from `app.css`. The `!important` LEGACY block moved to `legacy.css` (loaded by `sensors.html` only, until Phase 8).
- Cache `autolab-v8.2`.

## 8.1.0 - Control-system refactor, Phase 1 (shell & chrome)
- New `chrome.js` (32 px header + single ⋯ menu), `keys.js` (one keymap), chrome styles in `controls.css`.
- Shell: removed the floating pill, the floating back/⋯ buttons and the old settings sheet. The menu now holds only sim speed, label density, theme, wireframe, x-ray. Sim speed is shown as a multiplier (it used to be labelled in rpm).
- Protocol: `setLabelDensity`, `toggleInfo`, `key` (both directions), module→shell `state {playing|density}`.
- Kit: embedded modules no longer build play / reset / sim-speed / Flow / density nodes. One keydown path; Space is no longer a pedal in braking, clutch, turbocharger.
- `ignition` (engine rpm) and `mpfi` (engine load) keep their own visible slider and no longer read `state.speedMul` (temporary, `data-phase1-temp`).
- Cache `autolab-v8.1`.

## 7.0.0 - Sharper, richer visuals
- Sharpness: v6.0's adaptive resolution was too eager and dropped pixel ratio on ordinary frame dips. It now starts at full resolution, waits out the warm-up, only steps down after two windows below ~30 fps, never goes under 80% of full, and recovers quickly. Removed `backface-visibility` on the module frame (could soften compositing).
- Higher pixel-ratio caps (low 1.75, mid 2, high 2.5); antialiasing on low-end screens under 2x DPR; 4096 shadow map on desktop high-end.
- Colour: studio environment map (512x256 with soft cool/warm light boxes) replaces the dark 64px gradient, so metals reflect properly; brighter key/hemisphere lights; higher tone-mapping exposure; tone mapping now on for low-end too; +14% saturation / +5% contrast on the canvas (skipped on low-end).
- Cache `autolab-v7.0`.


## 6.1.0
- Fixed label wobble in all modules except cooling. Causes: (1) a CSS `transition` on label `transform` stacked on top of JS smoothing; (2) the JS eased the label's absolute screen position, so it lagged behind moving anchors; (3) collision avoidance re-ran every frame and flipped labels between slots.
- Fix, modelled on cooling's callouts: label = anchor + stored offset (rigid, no lag); offsets are solved at most 4x/second with a sticky preferred slot; flip-side hysteresis; sub-pixel anchor deadband; whole-pixel transforms.
- Added `tests/labels.test.mjs` (in `npm test`).

## 6.0.0
- Smoothness: adaptive render resolution in `kit.js` (drops pixel ratio when frames run slow, restores it when there is headroom); `content-visibility` on cards, press feedback, GPU-isolated module frame, contained scrolling. All respect reduced-motion.
- Progress: "Explored X of N" card, checkmark on explored modules, stored locally (`autolab.visited`).
- Updates: service worker no longer swaps itself in mid-session; users get a "New version available - Reload" prompt. Hourly update check. Cache `autolab-v6.0`.

## AutoLab2 repo
- Added `.gitignore`, `.gitattributes`, `.nojekyll`, GitHub Actions CI (`npm test`) and GitHub Pages deploy workflow. App code is unchanged from v5.0.

## 5.0.0
- Added `tests/check.mjs` + `package.json` (`npm test`): syntax, viewport/zoom, guard.js, precache coverage, broken refs, registry ids.
- Added `404.html` (precached, noindex) and `robots.txt`.
- `index.html`: Open Graph/Twitter meta, `<noscript>` message.
- `_headers`: added `frame-ancestors 'self'`, `upgrade-insecure-requests`, noindex on 404.
- Service worker cache renamed `autolab-v5.0`.

## 4.0.0
- Accessibility: removed `maximum-scale=1, user-scalable=no` from 19 pages (pinch-zoom allowed).
- New `guard.js`: friendly recoverable message on missing WebGL or failed 3D-library load (previously a blank screen). Added to all 42 Three.js modules.
- Service worker: cache renamed `autolab-v4.0`; precaches `guard.js` and maskable icon.
- Manifest: added stable `id`.
- Added `_headers` (CSP, nosniff, referrer/permissions policy, cache rules), `README.md`, this changelog.
- Docs updated to v4.0.
