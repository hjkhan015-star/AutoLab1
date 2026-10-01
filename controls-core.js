/* ═══════════════════════════════════════════════════════════════════════
   controls-core.js — pure control logic. NO DOM, NO window, NO Three.js.
   Unit-tested with plain node (tests/controls.test.mjs).

   Conventions
   - axis     : normalised 0..1
   - dial     : normalised -1..1 (positive = clockwise = right turn)
              : crank turns may use 0..1 (use normalize/denormalize)
   - Modules map normalised values to real units with a preset or
     min/max + format(). Values live in the registry, never in the DOM.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── math helpers ─────────────────────────────────────────────────────── */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** value in [min,max] -> 0..1 (clamped). Degenerate range -> 0. */
export function normalize(value, min, max) {
  if (!(max > min) || !Number.isFinite(value)) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}
/** 0..1 -> value in [min,max] (input clamped). */
export function denormalize(n, min, max) {
  return min + clamp(Number.isFinite(n) ? n : 0, 0, 1) * (max - min);
}
/** value in [-half,+half] -> -1..1 (clamped). For dials. */
export function normalizeSigned(value, half) {
  if (!(half > 0) || !Number.isFinite(value)) return 0;
  return clamp(value / half, -1, 1);
}
/** -1..1 -> value in [-half,+half]. */
export function denormalizeSigned(n, half) {
  return clamp(Number.isFinite(n) ? n : 0, -1, 1) * half;
}

/* ── presets ──────────────────────────────────────────────────────────── */
/* min/max/def are in DISPLAY units. `scale` converts a display value to the
   legacy raw unit an old module used (voltage: volts -> centivolts), so a
   module can migrate without changing its internals: raw = value * scale. */
export const PRESETS = Object.freeze({
  rpm:            Object.freeze({ min: 800,  max: 5000, def: 1800, step: 50,  unit: 'rpm',  decimals: 0, label: 'Engine speed', scale: 1 }),
  load:           Object.freeze({ min: 0,    max: 100,  def: 0,    step: 1,   unit: '%',    decimals: 0, label: 'Load',         scale: 1 }),
  ambient:        Object.freeze({ min: -10,  max: 45,   def: 20,   step: 1,   unit: '°C',   decimals: 0, label: 'Ambient',      scale: 1 }),
  'vehicle-speed':Object.freeze({ min: 0,    max: 160,  def: 0,    step: 1,   unit: 'km/h', decimals: 0, label: 'Vehicle speed',scale: 1 }),
  voltage:        Object.freeze({ min: 8,    max: 15,   def: 13.5, step: 0.1, unit: 'V',    decimals: 1, label: 'Voltage',      scale: 100 }),
  percent:        Object.freeze({ min: 0,    max: 100,  def: 0,    step: 1,   unit: '%',    decimals: 0, label: 'Value',        scale: 1 })
});

export function getPreset(name) {
  const p = PRESETS[name];
  if (!p) throw new Error(`controls-core: unknown preset "${name}"`);
  return p;
}
/** Resolve a control spec: preset defaults overridden by explicit fields. */
export function resolveSpec(spec) {
  const base = spec && spec.preset ? getPreset(spec.preset) : {};
  return Object.assign({}, base, spec);
}
/** Default normalised value of a spec (axis). */
export function defaultNormalized(spec) {
  const s = resolveSpec(spec);
  if (typeof s.min === 'number' && typeof s.max === 'number') {
    return normalize(typeof s.def === 'number' ? s.def : s.min, s.min, s.max);
  }
  return 0;
}

/* ── axis value mapping (display units <-> normalised, with step snapping) ──
   The registry stores normalised 0..1. The real value is min + idx*step, so
   1.00 stays 1.00 (no float creep) and `scale` gives the legacy raw unit. */
export function roundTo(v, decimals = 0) {
  if (!Number.isFinite(v)) return v;
  const f = Math.pow(10, decimals);
  const r = Math.round(v * f) / f;
  return r === 0 ? 0 : r;                                   /* no -0 */
}
/** Number of steps between min and max (>= 1). */
export function stepCount(spec) {
  const s = resolveSpec(spec);
  const step = s.step > 0 ? s.step : (s.max - s.min) / 100;
  return Math.max(1, Math.round((s.max - s.min) / step));
}
/** Snap a normalised value to the nearest step. */
export function snapNormalized(n, spec) {
  const c = stepCount(spec);
  return clamp(Math.round(clamp(Number.isFinite(n) ? n : 0, 0, 1) * c), 0, c) / c;
}
/** normalised -> real value in display units (step-snapped, decimals-rounded). */
export function realValue(n, spec) {
  const s = resolveSpec(spec);
  const c = stepCount(s);
  const idx = clamp(Math.round(clamp(Number.isFinite(n) ? n : 0, 0, 1) * c), 0, c);
  const step = (s.max - s.min) / c;
  return roundTo(s.min + idx * step, s.decimals ?? 0);
}
/** normalised -> legacy raw units (display value * scale), e.g. volts -> centivolts. */
export function rawValue(n, spec) {
  const s = resolveSpec(spec);
  return roundTo(realValue(n, s) * (s.scale ?? 1), 6);
}
/** real value (display units) -> normalised, step-snapped. */
export function fromReal(value, spec) {
  const s = resolveSpec(spec);
  return snapNormalized(normalize(value, s.min, s.max), s);
}

/* ── formatting ───────────────────────────────────────────────────────── */
/** Format a real value: format(13.5,{unit:'V',decimals:1}) -> "13.5 V" */
export function format(value, opts = {}) {
  const { unit = '', decimals = 0, space = true } = opts;
  if (!Number.isFinite(value)) return '—';
  let txt = value.toFixed(decimals);
  if (/^-0(\.0*)?$/.test(txt)) txt = txt.slice(1);          /* no "-0" */
  if (!unit) return txt;
  return unit === '%' || unit === '°' ? txt + unit : txt + (space ? ' ' : '') + unit;
}
/** Text for aria-valuetext of an axis (with unit). */
export function axisValueText(n, spec) {
  const s = resolveSpec(spec);
  const v = denormalize(n, s.min ?? 0, s.max ?? 1);
  return format(v, s);
}
/** Text for aria-valuetext of a dial: "12° right", "8° left", "centre". */
export function dialValueText(n, spec) {
  const s = resolveSpec(spec);
  const half = (s.range ?? 360) / 2;
  const deg = Math.round(denormalizeSigned(n, half));
  if (deg === 0) return 'centre';
  return `${Math.abs(deg)}° ${deg > 0 ? 'right' : 'left'}`;
}

/* ── spring (frame-rate independent) ──────────────────────────────────── */
export const SPRING_EPS = 0.001;
export const spring = {
  /** Exponential decay toward 0: v *= exp(-k·dt). Snaps to 0 below eps. */
  step(v, dt, k, eps = SPRING_EPS) {
    if (!(dt > 0) || !(k > 0)) return v;
    const out = v * Math.exp(-k * dt);
    return Math.abs(out) < eps ? 0 : out;
  },
  /** Decay toward `target` instead of 0. */
  toward(v, target, dt, k, eps = SPRING_EPS) {
    return target + spring.step(v - target, dt, k, eps);
  }
};

/* ── keyboard mapping ─────────────────────────────────────────────────── */
export const KEY_STEP_AXIS = 0.08;       /* per press, normalised 0..1      */
export const KEY_STEP_DIAL_DEG = 10;     /* per press, degrees              */
export const DEFAULT_DIAL_RANGE = 360;   /* total sweep in degrees          */

/**
 * Map a KeyboardEvent-like {key, shiftKey} to an intent for a control kind.
 * Returns null when the key is not handled by that kind.
 *   axis      -> { delta }            (normalised 0..1 units)
 *   dial      -> { delta }            (normalised -1..1 units; + = clockwise)
 *   choice    -> { step }             (+1 / -1 index)
 *   momentary -> { pressed }          (Shift held)
 * `spec.range` (dial) is the total sweep in degrees (default 360), so one
 * press = KEY_STEP_DIAL_DEG / (range/2) in normalised units.
 */
export function keyToIntent(kind, ev, spec = {}) {
  const key = ev && ev.key;
  switch (kind) {
    case 'axis':
      if (key === 'ArrowUp')   return { delta: +KEY_STEP_AXIS };
      if (key === 'ArrowDown') return { delta: -KEY_STEP_AXIS };
      return null;
    case 'dial': {
      const half = (spec.range ?? DEFAULT_DIAL_RANGE) / 2;
      const d = KEY_STEP_DIAL_DEG / half;
      if (key === 'ArrowRight') return { delta: +d };
      if (key === 'ArrowLeft')  return { delta: -d };
      return null;
    }
    case 'choice':
      if (key === 'ArrowRight') return { step: +1 };
      if (key === 'ArrowLeft')  return { step: -1 };
      return null;
    case 'momentary':
      if (key === 'Shift') return { pressed: true };
      return null;
    default:
      return null;
  }
}
/** keyup counterpart for momentary (Shift released). */
export function keyUpToIntent(kind, ev) {
  if (kind === 'momentary' && ev && ev.key === 'Shift') return { pressed: false };
  return null;
}

/** Global (shell-owned / module-owned) keymap, R5. Returns action or null. */
export const GLOBAL_KEYS = Object.freeze({
  ' ': 'togglePlay', Spacebar: 'togglePlay',
  r: 'reset', R: 'reset',
  d: 'labelDensity', D: 'labelDensity',
  l: 'theme', L: 'theme',
  w: 'wireframe', W: 'wireframe',
  x: 'xray', X: 'xray',
  Escape: 'close'
});
export function globalKeyAction(key) {
  return Object.prototype.hasOwnProperty.call(GLOBAL_KEYS, key) ? GLOBAL_KEYS[key] : null;
}

/* ── registry (unique ids, single value store) ────────────────────────── */
export function createRegistry() {
  const items = new Map();       /* id -> { spec, value }  */
  const listeners = new Map();   /* id -> Set<fn>          */
  return {
    /** Register a control id. Throws if already registered (R9). */
    register(id, spec = {}) {
      if (typeof id !== 'string' || !id) throw new Error('controls-core: id must be a non-empty string');
      if (items.has(id)) throw new Error(`controls-core: duplicate control id "${id}"`);
      items.set(id, { spec, value: defaultNormalized(spec) });
      return id;
    },
    has: (id) => items.has(id),
    ids: () => [...items.keys()],
    spec: (id) => (items.get(id) || {}).spec,
    get(id) {
      const it = items.get(id);
      return it ? it.value : undefined;
    },
    /** Set a normalised value; fires listeners only on change. */
    set(id, value) {
      const it = items.get(id);
      if (!it) throw new Error(`controls-core: unknown control id "${id}"`);
      const s = it.spec || {};
      const lo = s.kind === 'dial' || s.type === 'dial' ? -1 : 0;
      const v = clamp(Number.isFinite(value) ? value : 0, lo, 1);
      if (v === it.value) return v;
      it.value = v;
      (listeners.get(id) || []).forEach((fn) => fn(v, id));
      return v;
    },
    on(id, fn) {
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(fn);
      return () => listeners.get(id).delete(fn);
    },
    unregister(id) { items.delete(id); listeners.delete(id); },
    /** Clear everything (tests / module reset). */
    reset() { items.clear(); listeners.clear(); }
  };
}

/* Shared default registry — API surface required by the phase brief:
   register(id) throws on duplicates, reset() clears for tests. */
const defaultRegistry = createRegistry();
export const register = (id, spec) => defaultRegistry.register(id, spec);
export const reset = () => defaultRegistry.reset();
export const registry = defaultRegistry;
