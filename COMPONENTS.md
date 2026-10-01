# Auto Lab — Shared Components (v5.0)

## Files
| File | Purpose |
|---|---|
| `components.js` | Shared 3D helpers (`createGeoKit`), panel widgets (`Widgets`) and the guided-module runtime (`runGuidedModule`) |
| `components.css` | Styles for readout grid, overview sections, faults, quiz, legend (`.al-*`); sliders are styled in `controls.css` (`.ctl-axis`) |
| `kit.js` / `labels.js` / `app.css` | Unchanged base engine, labels, theme |

## Link a module (2 lines + 1)
```html
<link rel="stylesheet" href="app.css">
<link rel="stylesheet" href="components.css">
<script type="module">
  import { runGuidedModule } from './components.js';
  const CFG = { /* text, quiz, faults, readouts, legend, ctls[] (sliders) */ };
  function build(H) { const { box, cyl, mat, pipe, stream, THREE } = H; /* parts */ return { labels: [...], update(c) {...} }; }
  runGuidedModule(CFG, build);
</script>
```
Keep `:root { --al-accent: #hex; }` (and the light-theme line) in the module `<style>`.

`H` provides: `THREE root lowEnd mat glass glow V3 clamp lerp lc put box cyl cylX cylZ sph tor pipe stream Base`.
If `build()` uses a helper, destructure it from `H` (they are no longer module-level globals).

## Converted to shared components (18)
airfilter, awd, catalytic, coilplug, commonrail, dpf, driveshaft, egr, fuelpump, intercooler, lighting, oilfilter, oilpump, radiator, sparkplug, thermostat, tyres, wiring.
Each dropped from ~17 KB to ~5 KB; the geometry kit, panel UI, quiz, loop and 36 CSS rules now live once.

## Shared parts (`Parts`, also available as `H.Parts`)
| Part | Replaces | Used by |
|---|---|---|
| `Parts.tubeBetween(a,b,r,mat,segments)` | local `tubeBetween` | exhaustsystem, starting-system |
| `Parts.coilSpring({radius,length,turns,wire,mat,axis,centered,samplesPerTurn,samples,radial})` | `coilSpring`, `makeSpring`, `makeCoilSpring` | clutch, lubrication, suspension |
| `Parts.additivePoints(tex,count,size,opacity,{color,renderOrder,parent})` | point-cloud setup in 4 stream builders | mpfi, turbocharger, braking, electrical (and `H.stream` style modules) |
| `Parts.DEG` / `Parts.TAU` | local `DEG`/`TAU` constants | 11 modules now use `Base.DEG`/`Base.TAU` |
Geometry is identical to the old copies (checked vertex-by-vertex).

## Panel CSS / quiz (all 23 panel modules)
obd2, ecu, abs-esc, crankshaft-piston, valvetrain now link `components.css` and use `Widgets.wireQuiz()`. Only real differences stay local (`.al-w` min-width; `.al-pins` in obd2). `.al-sel` moved into components.css.

## Deliberately NOT merged (different look/behaviour — needs a visual check)
- Road wheels: suspension `makeWheel`, steering `makeRoadWheel`, differential `makeWheelAssembly` (different axes, tread, animation hooks). (`makeSimpleWheel` in steering is a steering wheel, not a road wheel.)
- Gears (differential bevel gears, starting-system teeth, steering gears), pulleys, fans/impellers, shock absorbers, hoses: each is built differently per module.
- Stream update logic (`updateStream`) differs per module; only the shared point-cloud setup was merged.
To merge one of these: add it to `Parts`, keep the old function as a thin wrapper, compare in a browser.

## Sliders: `axis` (Phase 3)
One slider primitive for the whole project: `controls.js` builds it, `controls.css` styles it (`.ctl-axis`), `controls-core.js` holds the maths.
- **Guided modules:** list sliders in `CFG.ctls[]`. `ctls[0]` has id `ctl` (main 0-100 % control, read by `update({k})`; `apply({ctl:'…'})` sets its text). Each extra entry is an axis spec plus `onChange(real, raw, norm)`.
  `{ id:'rpm', preset:'rpm', max:5500, def:2400, label:'Engine speed', onChange:(v)=>{ S.rpm = v; } }`.
  `CFG.ctl { label, val, caption }` still works (shim -> `ctls[0]`).
- **`UI.create` modules:** `axes: [spec, …]` (hosted in the dock's primary zone). Read values with `ui.controls.get(id)` (0..1), `.value(id)` (real units), `.raw(id)` (value x `scale`, e.g. centivolts). Never read a slider's DOM value. Reset: `ui.controls.resetAll()`.
- **Presets:** `rpm` 800-5000 (def 1800) - `load` 0-100 % - `ambient` -10..45 °C (def 20) - `vehicle-speed` 0-160 km/h - `voltage` 8-15 V (def 13.5, `scale` 100) - `percent`. Override any field in the spec.
- **Sim speed is not a quantity.** `state.speedMul` is sim speed (⋯ menu) only; engine rpm / load / vehicle speed are their own axes.
