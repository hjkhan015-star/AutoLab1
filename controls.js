/* ═══════════════════════════════════════════════════════════════════════
   controls.js — DOM primitives for the unified control system.

   PHASE 3: `axis` (look: 'slider').  PHASE 4: `axis` look:'pedal' (spring release,
   Shift-hold) and `momentary` (clutch).  PHASE 5: `dial` (wheel / crank / knob).
   Later phases add toggle, choice, action here. All logic that can be pure lives in
   controls-core.js (unit-tested); this file is thin DOM on top of it.

   One-place rule (R1): one node per control. Values live in the shared
   registry (R4) as normalised 0..1; modules read them with
     controls.get(id)      normalised 0..1
     controls.value(id)    real value in display units (step-snapped)
     controls.raw(id)      value * spec.scale (legacy raw unit, e.g. centivolts)
     controls.on(id, fn)   change events   fn(normalised, id)
   and never read a slider's DOM value.

   Spec (all optional except id):
     { id, type:'axis', look:'slider'|'pedal', label, ariaLabel, preset:'rpm'|'load'|'ambient'|
       'vehicle-speed'|'voltage'|'percent', min, max, def, step, unit,
       decimals, scale, format:(realValue)=>string, hint,
       // look:'pedal' only:
       spring:'return', k (s^-1), keys:'arrows' (Shift-hold with the page body focused), ticks:n, ramp }
     { id, type:'momentary', label, ariaLabel, keys:'arrows' }   registry 0 / 1; edges via on(id, fn)
     { id, type:'dial', look:'wheel'|'crank'|'knob', label, ariaLabel, range:360, wrap:false, def:0 (degrees),
       step:1 (degrees, for value()), spring:'return', k (s^-1), side, color,
       onGrab(active) }                       // registry -1..1 (clamped, ±range/2) or 0..1 (wrap, 0..range);
                                              // positive = clockwise = right turn; controls.value(id) = degrees
   ═══════════════════════════════════════════════════════════════════════ */
import {
  registry, resolveSpec, defaultNormalized, keyToIntent, axisValueText,
  realValue, rawValue, fromReal, snapNormalized, stepCount, format as fmt, clamp,
  createPedalModel, pedalIntent, pedalUpIntent, DEFAULT_PEDAL_K,
  isDial, dialToDeg, degToDial, dialDefault, dialRange, dialWraps, dialValueText, dialAddDelta,
  dialSpringStep, angleFromPointer, unwrapDelta
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
  /** build a momentary (hold) control, e.g. the clutch pedal */
  momentary: (spec, opts) => createMomentary(spec, opts),
  /** build a dial (steering wheel / crank / knob) */
  dial: (spec, opts) => createDial(spec, opts),
  /** true while the user is dragging / keying a dial or pedal (module logic can stand back) */
  dragging(id) { const i = instances.get(id); return !!(i && i.dragging); },
  /** true while the shared pedal animation loop is running (tests / debugging) */
  loopRunning: () => loop.running(),
  /** all axis instances, in creation order */
  instances: () => [...instances.values()]
};

/* ── ONE shared animation loop for every pedal (no per-pedal timers) ──────
   Started by the first pedal that needs to move (spring release, Shift ramp),
   stopped as soon as every pedal is at rest. dt is real time, so a release takes
   the same wall-clock time at 30, 60 or 144 Hz. */
const loop = (() => {
  const runners = new Set();            /* fn(dt) -> true while still moving */
  let handle = 0, last = 0, running = false;
  const raf = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(() => fn(Date.now()), 16));
  const caf = (h) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(h) : clearTimeout(h));
  function frame(t) {
    handle = 0;
    const dt = last ? Math.min(0.1, Math.max(0, (t - last) / 1000)) : 1 / 60;
    last = t;
    for (const fn of [...runners]) if (!fn(dt)) runners.delete(fn);
    if (runners.size) handle = raf(frame); else { running = false; last = 0; }
  }
  return {
    add(fn) {
      runners.add(fn);
      if (!running) { running = true; last = 0; handle = raf(frame); }
    },
    remove(fn) {
      runners.delete(fn);
      if (!runners.size && running) { if (handle) caf(handle); handle = 0; running = false; last = 0; }
    },
    running: () => running,
    /** advance manually (tests) */
    tick(dt) { for (const fn of [...runners]) if (!fn(dt)) runners.delete(fn); if (!runners.size) { if (handle) caf(handle); handle = 0; running = false; last = 0; } }
  };
})();
export const _pedalLoop = loop;

const reducedMotion = (doc) => {
  try { const w = (doc && doc.defaultView) || globalThis; return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
};

/* Shift-hold: ONE document-level key listener per document, shared by every pedal / momentary
   that declared keys:'arrows'. Shift acts on a control when it is focused, or when the page body has focus
   (nothing else is being edited). Auto-repeat is ignored; blur releases. */
const shiftTargets = new Map();         /* doc -> Set<{ el, keys, press(), release() }> */
function installShift(doc) {
  if (shiftTargets.has(doc)) return shiftTargets.get(doc);
  const set = new Set();
  shiftTargets.set(doc, set);
  const typing = (t) => !!(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
  const eligible = (ev, tgt) => {
    const t = ev.target;
    if (tgt.el.contains && t && tgt.el.contains(t)) return true;                    /* focused control */
    if (!tgt.keys) return false;                                                    /* module did not declare keys:'arrows' */
    return !typing(t) && (!t || t === doc.body || t === doc.documentElement || t === doc || t.tagName === 'CANVAS');
  };
  const down = (ev) => {
    if (!pedalIntent(ev) || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    set.forEach((tgt) => { if (!tgt.disabled() && eligible(ev, tgt)) tgt.press(); });
  };
  const up = (ev) => { if (pedalUpIntent(ev)) set.forEach((tgt) => tgt.release()); };
  const off = () => set.forEach((tgt) => tgt.release());
  const win = doc.defaultView || globalThis;
  doc.addEventListener('keydown', down);
  doc.addEventListener('keyup', up);
  win.addEventListener('blur', off);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) off(); });
  return set;
}

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

  if (spec.look === 'pedal') return createPedal(spec, opts);

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

/* ── pedal (axis look:'pedal') ───────────────────────────────────────────────
   Phone  (max-width 720 px or max-height 540 px): a horizontal bar, 48–56 px high, full width of its slot.
   Desktop: vertical 54 × 158 px. Same registry value (normalised 0..1) as the slider.
   spec extras: spring:'return', k (s^-1; decayFactorToK of the old per-frame factor), keys:'arrows', ticks:n, ramp.
   Release is time-based on the shared loop; prefers-reduced-motion releases instantly. */
const PEDAL_SVG = '<svg viewBox="0 0 60 34" aria-hidden="true" focusable="false"><rect class="ctl-plate" x="4" y="4" width="52" height="26" rx="8"/>' +
  '<rect class="ctl-grip" x="10" y="9" width="40" height="4" rx="2"/><rect class="ctl-grip" x="10" y="16" width="40" height="4" rx="2"/>' +
  '<rect class="ctl-grip" x="10" y="23" width="40" height="4" rx="2"/></svg>';

function createPedal(spec, opts = {}) {
  const doc = opts.doc || document;
  const id = spec.id;
  registry.register(id, spec);
  const count = stepCount(spec);
  const label = spec.label || id;
  const springy = spec.spring === 'return';
  const model = createPedalModel({ k: spec.k > 0 ? spec.k : DEFAULT_PEDAL_K, ramp: spec.ramp, value: registry.get(id), rest: defaultNormalized(spec) });
  const reduced = typeof opts.reducedMotion === 'function' ? opts.reducedMotion : () => reducedMotion(doc);

  const el = doc.createElement('div');
  el.className = 'ctl ctl-pedal';
  el.dataset.ctl = id;
  el.style.setProperty('--ctl-accent', spec.color || 'var(--ctl-fill)');
  const ticks = spec.ticks > 0 ? '<span class="ctl-pedal-ticks" aria-hidden="true">' + '<i></i>'.repeat(spec.ticks) + '</span>' : '';
  el.innerHTML =
    `<span class="ctl-label"><span class="ctl-name">${esc(label)}</span><output class="ctl-value"></output></span>` +
    `<div class="ctl-pedal-pad" role="slider" tabindex="0" aria-label="${esc(spec.ariaLabel || label)}" aria-orientation="vertical" ` +
      `aria-valuemin="${spec.min}" aria-valuemax="${spec.max}" aria-valuenow="${spec.min}">` +
      `<span class="ctl-pedal-fill"></span>${ticks}<span class="ctl-pedal-foot">${PEDAL_SVG}</span></div>`;
  const pad = el.querySelector('.ctl-pedal-pad');
  const outEl = el.querySelector('.ctl-value');
  let textOverride = null, lastTxt = null, lastNow = null;

  const text = (n) => {
    if (textOverride != null) return textOverride;
    if (typeof spec.format === 'function') return spec.format(realValue(n, spec));
    return axisValueText(snapNormalized(n, spec), spec);
  };
  function paint() {
    const n = registry.get(id);
    el.style.setProperty('--p', String(n));
    const now = realValue(n, spec);
    if (now !== lastNow) { lastNow = now; pad.setAttribute('aria-valuenow', String(now)); }
    const txt = text(n);
    if (txt !== lastTxt) { lastTxt = txt; outEl.textContent = txt; pad.setAttribute('aria-valuetext', txt); }
  }
  /* continuous model value -> snapped registry value (listeners fire on change only) */
  function push(v) { registry.set(id, snapNormalized(v, spec)); paint(); }

  const tick = (dt) => { const moving = model.step(dt); push(model.value); return moving; };
  function startMotion() {
    if (reduced()) {                                   /* no animation: jump to the end state */
      if (model.pressed) model.value = 1; else if (!model.held) model.value = model.rest;
      push(model.value);
      return;
    }
    if (model.active()) loop.add(tick);
  }
  function stopMotion() { loop.remove(tick); }

  /* pointer: pad = drag surface */
  let pointerId = null;
  const fromEvent = (e) => {
    const r = pad.getBoundingClientRect();
    if (r.width > r.height) return r.width ? clamp((e.clientX - r.left) / r.width, 0, 1) : 0;       /* horizontal bar */
    return r.height ? clamp(1 - (e.clientY - r.top) / r.height, 0, 1) : 0;                          /* vertical pedal */
  };
  const hold = (v) => { stopMotion(); model.hold(v); push(model.value); };
  function letGo() {
    model.letGo();
    if (springy) startMotion();
  }
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (pointerId != null) return;
    pointerId = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch (_) {}
    pad.classList.add('is-active');
    hold(fromEvent(e));
  });
  pad.addEventListener('pointermove', (e) => {
    if (pointerId == null || e.pointerId !== pointerId) return;
    e.preventDefault();
    hold(fromEvent(e));
  });
  const end = (e) => {
    if (pointerId == null || (e && e.pointerId != null && e.pointerId !== pointerId)) return;
    pointerId = null;
    pad.classList.remove('is-active');
    letGo();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => pad.addEventListener(t, end));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());                     /* drag surface only (R8) */

  /* keyboard: ↑/↓ step and stay (like the old pedals). Space does nothing here. */
  pad.addEventListener('keydown', (e) => {
    const intent = keyToIntent('axis', e, spec);
    if (!intent) return;
    e.preventDefault(); e.stopPropagation();
    hold(registry.get(id) + intent.delta);
  });

  /* Shift-hold quick press (shared document listener) */
  const shiftSet = installShift(doc);
  const shiftTarget = {
    el, keys: spec.keys === 'arrows',
    disabled: () => pad.getAttribute('aria-disabled') === 'true',
    press() { if (!model.press()) return; model.held = false; pad.classList.add('is-active'); startMotion(); },
    release() { if (!model.release()) return; pad.classList.remove('is-active'); startMotion(); }
  };
  shiftSet.add(shiftTarget);

  const inst = {
    id, el, pad, input: pad, spec, model,
    get: () => registry.get(id),
    value: () => realValue(registry.get(id), spec),
    raw: () => rawValue(registry.get(id), spec),
    /** programmatic set (bridge commands): stays where it is, no spring */
    set(n) { hold(n); return registry.get(id); },
    setValue: (v) => inst.set(fromReal(v, spec)),
    /** back to rest: pedal released, Shift state cleared */
    reset() { stopMotion(); pointerId = null; pad.classList.remove('is-active'); model.reset(); push(model.rest); return registry.get(id); },
    /** let go of a held pedal (spring takes over) */
    release: letGo,
    on: (fn) => registry.on(id, fn),
    setText(t) { textOverride = t == null ? null : String(t); paint(); },
    setDisabled(b) { pad.setAttribute('aria-disabled', b ? 'true' : 'false'); pad.tabIndex = b ? -1 : 0; el.classList.toggle('is-disabled', !!b); if (b) inst.reset(); },
    destroy() { stopMotion(); shiftSet.delete(shiftTarget); instances.delete(id); registry.unregister(id); el.remove(); }
  };
  if (typeof globalThis.matchMedia === 'function' || (doc.defaultView && doc.defaultView.matchMedia)) {
    try {
      const mq = (doc.defaultView || globalThis).matchMedia('(max-width:720px), (max-height:540px)');
      const orient = () => pad.setAttribute('aria-orientation', mq.matches ? 'horizontal' : 'vertical');
      orient();
      if (mq.addEventListener) mq.addEventListener('change', orient);
    } catch (_) {}
  }
  instances.set(id, inst);
  paint();
  return inst;
}

/* ── momentary (hold) — the clutch pedal ────────────────────────────────────
   Stores 0 / 1 in the registry. The module keeps its own eased engage/disengage;
   the control only reports pressed / not pressed. on(id, fn) fires on both edges.
   Pointer (captured) · Shift (keys:'arrows') · Enter / Space while the control itself has focus. */
export function createMomentary(rawSpec, opts = {}) {
  const doc = opts.doc || document;
  const spec = Object.assign({ type: 'momentary', min: 0, max: 1, step: 1, def: 0, decimals: 0 }, rawSpec);
  if (!spec.id) throw new Error('controls: momentary needs an id');
  const id = spec.id;
  registry.register(id, spec);
  const label = spec.label || id;

  const el = doc.createElement('div');
  el.className = 'ctl ctl-momentary';
  el.dataset.ctl = id;
  el.style.setProperty('--ctl-accent', spec.color || 'var(--ctl-fill)');
  el.innerHTML =
    `<span class="ctl-label"><span class="ctl-name">${esc(label)}</span></span>` +
    `<div class="ctl-pedal-pad ctl-momentary-pad" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(spec.ariaLabel || label)}">` +
      `<span class="ctl-pedal-foot">${PEDAL_SVG}</span></div>`;
  const pad = el.querySelector('.ctl-momentary-pad');

  const paint = () => {
    const on = registry.get(id) === 1;
    pad.setAttribute('aria-pressed', on ? 'true' : 'false');
    pad.classList.toggle('is-active', on);
    el.style.setProperty('--p', on ? '1' : '0');
  };
  const setPressed = (on) => { registry.set(id, on ? 1 : 0); paint(); };

  let pointerId = null, keyHeld = false, shiftHeld = false;
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (pointerId != null) return;
    pointerId = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch (_) {}
    setPressed(true);
  });
  const end = (e) => {
    if (pointerId == null || (e && e.pointerId != null && e.pointerId !== pointerId)) return;
    pointerId = null;
    if (!keyHeld && !shiftHeld) setPressed(false);
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => pad.addEventListener(t, end));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());

  /* Enter / Space on THIS element only (R5); no auto-repeat re-entry */
  pad.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault(); e.stopPropagation();
    if (e.repeat || keyHeld) return;
    keyHeld = true; setPressed(true);
  });
  pad.addEventListener('keyup', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault(); e.stopPropagation();
    if (!keyHeld) return;
    keyHeld = false;
    if (pointerId == null && !shiftHeld) setPressed(false);
  });
  pad.addEventListener('blur', () => { if (keyHeld) { keyHeld = false; if (pointerId == null && !shiftHeld) setPressed(false); } });

  const shiftSet = installShift(doc);
  const shiftTarget = {
    el, keys: spec.keys === 'arrows',
    disabled: () => pad.getAttribute('aria-disabled') === 'true',
    press() { if (shiftHeld) return; shiftHeld = true; setPressed(true); },
    release() { if (!shiftHeld) return; shiftHeld = false; if (pointerId == null && !keyHeld) setPressed(false); }
  };
  shiftSet.add(shiftTarget);

  const inst = {
    id, el, pad, input: pad, spec,
    get: () => registry.get(id),
    value: () => registry.get(id),
    raw: () => registry.get(id),
    set(n) { setPressed(n >= 0.5); return registry.get(id); },
    setValue(v) { return inst.set(v ? 1 : 0); },
    reset() { pointerId = null; keyHeld = false; shiftHeld = false; setPressed(false); return 0; },
    on: (fn) => registry.on(id, fn),
    setText() {},
    setDisabled(b) { pad.setAttribute('aria-disabled', b ? 'true' : 'false'); pad.tabIndex = b ? -1 : 0; el.classList.toggle('is-disabled', !!b); if (b) inst.reset(); },
    destroy() { shiftSet.delete(shiftTarget); instances.delete(id); registry.unregister(id); el.remove(); }
  };
  instances.set(id, inst);
  paint();
  return inst;
}

/* ── dial (Phase 5) — steering wheel, crank, knob ───────────────────────────
   ONE rotary primitive. Drag anywhere on it (angle from the pointer, pointer capture), ←/→ turn it 10° (→ =
   clockwise = right in every module), Enter / Home = back to the default (the single reset path).
   Registry: clamped wheel/knob −1..1 (±range/2) · wrapping crank 0..1 (0..range). controls.value(id) = degrees.
   spring:'return' pulls a released dial back to its default on the SHARED loop (no second RAF). Programmatic
   set() (bridge commands, a simulation that drives the dial) never springs and cancels a running spring.
   The angle is shown once, as small text next to the name — there is no big caption. */
const DIAL_SKINS = {
  wheel:
    '<svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false"><g class="ctl-dial-rotor">' +
    '<circle class="ctl-dial-rim" r="48"/><circle class="ctl-dial-rim-hi" r="48"/>' +
    '<rect class="ctl-dial-spoke" x="-48" y="-6" width="34" height="12" rx="6"/>' +
    '<rect class="ctl-dial-spoke" x="14" y="-6" width="34" height="12" rx="6"/>' +
    '<rect class="ctl-dial-spoke" x="-6" y="14" width="12" height="34" rx="6"/>' +
    '<circle class="ctl-dial-hub" r="14"/><path class="ctl-dial-marker" d="M0,-57 L-8,-45 L8,-45 Z"/></g></svg>',
  crank:
    '<svg viewBox="-70 -70 140 140" aria-hidden="true" focusable="false"><g class="ctl-dial-rotor">' +
    '<circle class="ctl-dial-bg" r="64"/><circle class="ctl-dial-rim" r="49"/><circle class="ctl-dial-rim-hi" r="49"/>' +
    '<rect class="ctl-dial-spoke" x="-5" y="-42" width="10" height="34" rx="5"/>' +
    '<rect class="ctl-dial-spoke" x="-5" y="8" width="10" height="34" rx="5"/>' +
    '<rect class="ctl-dial-spoke" x="8" y="-5" width="34" height="10" rx="5"/>' +
    '<rect class="ctl-dial-spoke" x="-42" y="-5" width="34" height="10" rx="5"/>' +
    '<circle class="ctl-dial-hub" r="14"/>' +
    '<rect class="ctl-dial-handle" x="-4" y="-66" width="8" height="18" rx="4"/><circle class="ctl-dial-handle-end" cy="-66" r="6"/>' +
    '<circle class="ctl-dial-marker" cy="-51" r="4"/></g></svg>',
  knob:
    '<svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false"><g class="ctl-dial-rotor">' +
    '<circle class="ctl-dial-rim" r="44"/><circle class="ctl-dial-hub" r="34"/>' +
    '<rect class="ctl-dial-pointer" x="-3" y="-34" width="6" height="22" rx="3"/></g></svg>'
};

export function createDial(rawSpec, opts = {}) {
  const doc = opts.doc || document;
  const spec = Object.assign({ type: 'dial', look: 'wheel' }, resolveSpec(rawSpec));
  spec.type = 'dial';
  if (!spec.id) throw new Error('controls: dial needs an id');
  if (!DIAL_SKINS[spec.look]) throw new Error(`controls: unknown dial look "${spec.look}"`);
  if (spec.look === 'crank' && spec.wrap == null) spec.wrap = true;
  if (!(spec.range > 0)) spec.range = spec.wrap ? 720 : 360;
  if (!(spec.step > 0)) spec.step = 1;
  if (typeof spec.def !== 'number') spec.def = 0;

  const id = spec.id;
  registry.register(id, spec);                      /* throws on duplicates (R9) */
  const label = spec.label || id;
  const wraps = dialWraps(spec);
  const half = dialRange(spec) / 2;
  const springy = spec.spring === 'return';
  const k = spec.k > 0 ? spec.k : 4.5;
  const reduced = typeof opts.reducedMotion === 'function' ? opts.reducedMotion : () => reducedMotion(doc);

  const el = doc.createElement('div');
  el.className = 'ctl ctl-dial ctl-dial-' + spec.look;
  el.dataset.ctl = id;
  el.style.setProperty('--ctl-accent', spec.color || 'var(--ctl-fill)');
  el.innerHTML =
    `<span class="ctl-label"><span class="ctl-name">${esc(label)}</span><output class="ctl-value"></output></span>` +
    `<div class="ctl-dial-pad" role="slider" tabindex="0" aria-label="${esc(spec.ariaLabel || label)}" ` +
      `aria-valuemin="${wraps ? 0 : -half}" aria-valuemax="${wraps ? dialRange(spec) : half}" aria-valuenow="0">` +
      DIAL_SKINS[spec.look] + `</div>`;
  const pad = el.querySelector('.ctl-dial-pad');
  const rotor = el.querySelector('.ctl-dial-rotor');
  const outEl = el.querySelector('.ctl-value');

  /* registry values are continuous (a spring / a drag is not stair-stepped); value() snaps to spec.step */
  const norm = (n) => {
    if (!Number.isFinite(n)) return dialDefault(spec);
    return wraps ? n - Math.floor(n) : clamp(n, -1, 1);
  };
  let textOverride = null, lastTxt = null, lastDeg = null, lastNow = null;
  function paint() {
    const n = registry.get(id);
    const deg = dialToDeg(n, spec);
    if (deg !== lastDeg) { lastDeg = deg; rotor.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ')'); }
    const now = Math.round(deg);
    if (now !== lastNow) { lastNow = now; pad.setAttribute('aria-valuenow', String(now)); }
    const txt = textOverride != null ? textOverride : (typeof spec.format === 'function' ? spec.format(realValue(n, spec)) : dialValueText(n, spec));
    if (txt !== lastTxt) { lastTxt = txt; outEl.textContent = txt; pad.setAttribute('aria-valuetext', txt); }
  }
  function push(n) { registry.set(id, norm(n)); paint(); }

  /* grab bookkeeping: onGrab(true) on the first of pointer / key, onGrab(false) when neither is left */
  let pointerId = null, lastAngle = 0, keysDown = 0, grabbed = false;
  const grab = () => {
    const now = pointerId != null || keysDown > 0;
    if (now === grabbed) return;
    grabbed = now;
    pad.classList.toggle('is-active', now);
    if (typeof spec.onGrab === 'function') spec.onGrab(now);
  };

  /* spring-to-default on the ONE shared loop (controls.js `loop`) */
  const tick = (dt) => {
    if (pointerId != null) return false;
    const cur = registry.get(id);
    const next = dialSpringStep(cur, dt, k, spec);
    push(next);
    return next !== dialDefault(spec);
  };
  const stopMotion = () => loop.remove(tick);
  function letGo() {
    if (!springy) return;
    if (reduced()) { push(dialDefault(spec)); return; }       /* no animation: jump to the default */
    if (registry.get(id) !== dialDefault(spec)) loop.add(tick);
  }

  /* pointer: drag anywhere on the dial; angle delta from the pointer, unwrapped across ±180° */
  const pointerAngle = (e) => {
    const r = pad.getBoundingClientRect();
    return angleFromPointer(r.left + r.width / 2, r.top + r.height / 2, e.clientX, e.clientY);
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (pointerId != null || pad.getAttribute('aria-disabled') === 'true') return;
    pointerId = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch (_) {}
    stopMotion();
    lastAngle = pointerAngle(e);
    grab();
  });
  pad.addEventListener('pointermove', (e) => {
    if (pointerId == null || e.pointerId !== pointerId) return;
    e.preventDefault();
    const a = pointerAngle(e);
    const d = unwrapDelta(lastAngle, a, 360);
    lastAngle = a;
    if (d) push(dialAddDelta(registry.get(id), d, spec));
  });
  const end = (e) => {
    if (pointerId == null || (e && e.pointerId != null && e.pointerId !== pointerId)) return;
    pointerId = null;
    grab();
    letGo();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => pad.addEventListener(t, end));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());                    /* drag surface only (R8) */

  /* keyboard (R5): → clockwise, ← counter-clockwise, 10°; Enter / Home = default. Space stays play/pause. */
  const heldKeys = new Set();
  pad.addEventListener('keydown', (e) => {
    const intent = keyToIntent('dial', e, spec);
    if (!intent) return;
    e.preventDefault(); e.stopPropagation();
    stopMotion();
    if (!heldKeys.has(e.key)) { heldKeys.add(e.key); keysDown = heldKeys.size; grab(); }
    if (intent.reset) push(dialDefault(spec));
    else push(dialAddDelta(registry.get(id), intent.delta * (wraps ? dialRange(spec) : half), spec));
  });
  const keyEnd = (e) => {
    if (e && e.key && !heldKeys.delete(e.key)) return;
    if (!e || !e.key) heldKeys.clear();
    keysDown = heldKeys.size;
    grab();
    if (!keysDown) letGo();
  };
  pad.addEventListener('keyup', keyEnd);
  pad.addEventListener('blur', () => { if (heldKeys.size) keyEnd(null); });

  const inst = {
    id, el, pad, input: pad, spec,
    get: () => registry.get(id),
    /** degrees, clockwise positive, snapped to spec.step */
    value: () => realValue(registry.get(id), spec),
    raw: () => rawValue(registry.get(id), spec),
    /** programmatic set (a simulation, bridge commands): exact, never springs, cancels a running spring */
    set(n) { stopMotion(); push(n); return registry.get(id); },
    setValue(v) { return inst.set(fromReal(v, spec)); },
    reset() { stopMotion(); pointerId = null; heldKeys.clear(); keysDown = 0; grab(); push(dialDefault(spec)); return registry.get(id); },
    on: (fn) => registry.on(id, fn),
    get dragging() { return pointerId != null || keysDown > 0; },
    setText(t) { textOverride = t == null ? null : String(t); paint(); },
    setDisabled(b) {
      pad.setAttribute('aria-disabled', b ? 'true' : 'false'); pad.tabIndex = b ? -1 : 0;
      el.classList.toggle('is-disabled', !!b);
      if (b) inst.reset();
    },
    destroy() { stopMotion(); instances.delete(id); registry.unregister(id); el.remove(); }
  };
  instances.set(id, inst);
  paint();
  return inst;
}

/** Format helper re-exported for modules that build their own text. */
export { fmt as formatValue, clamp };
