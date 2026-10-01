/* ═══════════════════════════════════════════════════════════════════════
   controls.js — DOM primitives for the unified control system.

   PHASE 3: `axis` (look: 'slider'). Later phases add pedal, dial, momentary,
   toggle, choice, action here. All logic that can be pure lives in
   controls-core.js (unit-tested); this file is thin DOM on top of it.

   One-place rule (R1): one node per control. Values live in the shared
   registry (R4) as normalised 0..1; modules read them with
     controls.get(id)      normalised 0..1
     controls.value(id)    real value in display units (step-snapped)
     controls.raw(id)      value * spec.scale (legacy raw unit, e.g. centivolts)
     controls.on(id, fn)   change events   fn(normalised, id)
   and never read a slider's DOM value.

   Spec (all optional except id):
     { id, type:'axis', look:'slider', label, preset:'rpm'|'load'|'ambient'|
       'vehicle-speed'|'voltage'|'percent', min, max, def, step, unit,
       decimals, scale, format:(realValue)=>string, hint }
   ═══════════════════════════════════════════════════════════════════════ */
import {
  registry, resolveSpec, defaultNormalized, keyToIntent, axisValueText,
  realValue, rawValue, fromReal, snapNormalized, stepCount, format as fmt, clamp
} from './controls-core.js';

const instances = new Map();          /* id -> axis instance (for resetAll) */

/* ── module-facing store API (also exposed as ui.controls) ─────────────── */
export const controls = {
  has: (id) => registry.has(id),
  ids: () => registry.ids(),
  spec: (id) => registry.spec(id),
  /** normalised 0..1 */
  get: (id) => registry.get(id),
  /** real value in display units, snapped to the step */
  value(id) {
    const n = registry.get(id);
    return n === undefined ? undefined : realValue(n, registry.spec(id));
  },
  /** real value multiplied by spec.scale (legacy raw unit) */
  raw(id) {
    const n = registry.get(id);
    return n === undefined ? undefined : rawValue(n, registry.spec(id));
  },
  /** set a normalised value (also moves the control on screen) */
  set(id, n) {
    const inst = instances.get(id);
    return inst ? inst.set(n) : registry.set(id, n);
  },
  /** set a real value in display units */
  setValue(id, v) { return controls.set(id, fromReal(v, registry.spec(id))); },
  on: (id, fn) => registry.on(id, fn),
  /** enable / disable a control */
  setDisabled(id, b) { const i = instances.get(id); if (i) i.setDisabled(b); },
  /** back to every control's default (module Reset) */
  resetAll() { instances.forEach((inst, id) => { if (registry.has(id)) inst.reset(); else instances.delete(id); }); },
  /** build an axis control (registers its id; throws on duplicates, R9) */
  axis: (spec, opts) => createAxis(spec, opts),
  /** all axis instances, in creation order */
  instances: () => [...instances.values()]
};

/* ── axis ───────────────────────────────────────────────────────────────── */
let uid = 0;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * createAxis(spec) -> instance
 *   instance.el            the ONE root node (append it where it belongs)
 *   instance.get()         normalised 0..1
 *   instance.value()       real value, display units
 *   instance.raw()         value * scale
 *   instance.set(n)        normalised; moves the thumb; fires listeners on change
 *   instance.setValue(v)   real value
 *   instance.reset()       back to the spec default
 *   instance.on(fn)        change listener (normalised, id) -> unsubscribe
 *   instance.setText(t)    module-formatted readout text (null = automatic)
 *   instance.setDisabled(b)
 *   instance.destroy()
 */
export function createAxis(rawSpec, opts = {}) {
  const doc = opts.doc || document;
  const spec = Object.assign({ type: 'axis', look: 'slider' }, resolveSpec(rawSpec));
  if (!spec.id) throw new Error('controls: axis needs an id');
  if (typeof spec.min !== 'number') spec.min = 0;
  if (typeof spec.max !== 'number') spec.max = 100;
  if (typeof spec.def !== 'number') spec.def = spec.min;
  if (!(spec.step > 0)) spec.step = (spec.max - spec.min) / 100;
  if (spec.decimals == null) spec.decimals = spec.step >= 1 ? 0 : Math.min(3, Math.max(0, Math.ceil(-Math.log10(spec.step))));

  const id = spec.id;
  registry.register(id, spec);                      /* throws on duplicates (R9) */
  const count = stepCount(spec);
  const domId = 'ctl-' + id + '-' + (++uid);
  const label = spec.label || id;

  const el = doc.createElement('div');
  el.className = 'ctl ctl-axis';
  el.dataset.ctl = id;
  el.style.setProperty('--ctl-accent', spec.color || 'var(--ctl-fill)');
  el.innerHTML =
    `<label class="ctl-label" for="${domId}"><span class="ctl-name">${esc(label)}</span>` +
    `<output class="ctl-value" for="${domId}"></output></label>` +
    `<div class="ctl-track">` +
      `<input id="${domId}" class="ctl-range" type="range" min="0" max="${count}" step="1" value="0" aria-label="${esc(label)}">` +
      `<span class="ctl-bubble" aria-hidden="true"></span>` +
    `</div>`;
  const input = el.querySelector('.ctl-range');
  const outEl = el.querySelector('.ctl-value');
  const bubble = el.querySelector('.ctl-bubble');

  let textOverride = null;
  let lastTxt = null;

  const realText = (n) => {
    if (textOverride != null) return textOverride;
    if (typeof spec.format === 'function') return spec.format(realValue(n, spec));
    return axisValueText(snapNormalized(n, spec), spec);
  };

  /* paint from the registry value — the ONLY place that touches the DOM value */
  function paint() {
    const n = registry.get(id);
    const idx = Math.round(n * count);
    if (String(idx) !== input.value) input.value = String(idx);
    const txt = realText(n);
    if (txt !== lastTxt) {                      /* runtime calls setText() ~8x/s: touch the DOM only on change */
      lastTxt = txt;
      outEl.textContent = txt;
      bubble.textContent = txt;
      input.setAttribute('aria-valuetext', txt);
    }
    el.style.setProperty('--p', String(count ? idx / count : 0));
  }

  function set(n) {
    const v = registry.set(id, snapNormalized(n, spec));   /* fires listeners only on change */
    paint();
    return v;
  }

  /* input -> store */
  input.addEventListener('input', () => set(Number(input.value) / count));

  /* keyboard: ↑/↓ step the axis (R5). ←/→ stay native (1 step) for a11y. */
  input.addEventListener('keydown', (ev) => {
    const intent = keyToIntent('axis', ev, spec);
    if (!intent) return;
    ev.preventDefault();
    ev.stopPropagation();
    set(registry.get(id) + intent.delta);
  });

  /* value bubble while dragging (the label value hides meanwhile: one value on screen, R1) */
  const drag = (on) => el.classList.toggle('is-dragging', on);
  input.addEventListener('pointerdown', () => drag(true));
  ['pointerup', 'pointercancel', 'blur', 'lostpointercapture'].forEach((t) => input.addEventListener(t, () => drag(false)));
  input.addEventListener('contextmenu', (e) => e.preventDefault());   /* drag surface only (R8) */

  const inst = {
    id, el, input, spec,
    get: () => registry.get(id),
    value: () => realValue(registry.get(id), spec),
    raw: () => rawValue(registry.get(id), spec),
    set,
    setValue: (v) => set(fromReal(v, spec)),
    reset: () => set(defaultNormalized(spec)),
    on: (fn) => registry.on(id, fn),
    setText(t) { textOverride = t == null ? null : String(t); paint(); },
    setDisabled(b) { input.disabled = !!b; el.classList.toggle('is-disabled', !!b); },
    destroy() { instances.delete(id); registry.unregister(id); el.remove(); }
  };
  instances.set(id, inst);
  paint();
  return inst;
}

/** Format helper re-exported for modules that build their own text. */
export { fmt as formatValue, clamp };
