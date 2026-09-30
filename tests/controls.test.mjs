// node tests/controls.test.mjs  (no dependencies)
import assert from 'node:assert/strict';
import * as core from '../controls-core.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  ', name); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} vs ${b}`);

t('registry: duplicate id throws', () => {
  core.reset();
  core.register('throttle');
  assert.throws(() => core.register('throttle'), /duplicate/);
  core.reset();
  core.register('throttle');            /* reset() allows re-use */
  const r = core.createRegistry();
  r.register('a');
  assert.throws(() => r.register('a'), /duplicate/);
  assert.throws(() => r.register(''), /non-empty/);
});

t('registry: get/set/on, clamping, change-only events', () => {
  const r = core.createRegistry();
  r.register('axis1', { type: 'axis' });
  r.register('wheel', { type: 'dial' });
  let calls = 0; r.on('axis1', () => calls++);
  assert.equal(r.set('axis1', 2), 1);
  assert.equal(r.set('axis1', 1), 1);
  assert.equal(calls, 1);
  assert.equal(r.set('axis1', -5), 0);
  assert.equal(r.set('wheel', -5), -1);          /* dial allows negatives */
  assert.equal(r.set('wheel', NaN), 0);
  assert.throws(() => r.set('nope', 0), /unknown/);
});

t('normalise round-trip', () => {
  for (const [min, max] of [[0, 100], [800, 5000], [-10, 45], [8, 15]]) {
    for (const v of [min, (min + max) / 2, max, min + (max - min) * 0.37]) {
      near(core.denormalize(core.normalize(v, min, max), min, max), v, 1e-9, `${min}..${max}`);
    }
  }
  assert.equal(core.normalize(999, 0, 100), 1);            /* clamps */
  assert.equal(core.normalize(-5, 0, 100), 0);
  assert.equal(core.normalize(5, 10, 10), 0);              /* degenerate */
  assert.equal(core.normalize(NaN, 0, 1), 0);
  near(core.denormalizeSigned(core.normalizeSigned(90, 180), 180), 90, 1e-9);
  assert.equal(core.normalizeSigned(500, 180), 1);
  assert.equal(core.normalizeSigned(-500, 180), -1);
});

t('format helpers', () => {
  assert.equal(core.format(13.5, { unit: 'V', decimals: 1 }), '13.5 V');
  assert.equal(core.format(72, { unit: '%' }), '72%');
  assert.equal(core.format(1800, { unit: 'rpm' }), '1800 rpm');
  assert.equal(core.format(-0.04, { unit: '°C', decimals: 1 }), '0.0 °C');   /* no -0 */
  assert.equal(core.format(NaN, { unit: 'V' }), '—');
  assert.equal(core.axisValueText(0.5, { preset: 'load' }), '50%');
  assert.equal(core.axisValueText(1, { preset: 'voltage' }), '15.0 V');
  assert.equal(core.dialValueText(0, {}), 'centre');
  assert.equal(core.dialValueText(0.5, { range: 360 }), '90° right');
  assert.equal(core.dialValueText(-0.25, { range: 360 }), '45° left');
});

t('spring: frame-rate independent (60 Hz vs 144 Hz, 0.5 s)', () => {
  for (const k of [2, 4, 8]) {
    for (const v0 of [1, 0.6, -0.8]) {
      const run = (hz) => { let v = v0; const dt = 1 / hz; for (let i = 0; i < hz / 2; i++) v = core.spring.step(v, dt, k); return v; };
      const a = run(60), b = run(144);
      /* within 1 % of the starting amplitude */
      assert.ok(Math.abs(a - b) <= 0.01 * Math.abs(v0), `k=${k} v0=${v0}: ${a} vs ${b}`);
      near(a, v0 * Math.exp(-k * 0.5), 1e-9 + 0.001, 'matches closed form');
    }
  }
});

t('spring: snaps to exactly 0 below epsilon, and is inert on bad input', () => {
  let v = 0.5;
  for (let i = 0; i < 600; i++) v = core.spring.step(v, 1 / 60, 6);
  assert.equal(v, 0);
  assert.equal(core.spring.step(0.5, 0, 6), 0.5);
  assert.equal(core.spring.step(0.5, 0.016, 0), 0.5);
  assert.equal(core.spring.toward(0.9, 0.5, 100, 6), 0.5);
});

t('key mapping: axis, dial, choice, momentary', () => {
  assert.deepEqual(core.keyToIntent('axis', { key: 'ArrowUp' }), { delta: 0.08 });
  assert.deepEqual(core.keyToIntent('axis', { key: 'ArrowDown' }), { delta: -0.08 });
  assert.equal(core.keyToIntent('axis', { key: 'ArrowLeft' }), null);
  assert.equal(core.keyToIntent('axis', { key: ' ' }), null);         /* Space is play/pause now */
  const d = core.keyToIntent('dial', { key: 'ArrowRight' }, { range: 360 });
  near(d.delta, 10 / 180, 1e-12);                                     /* 10° of a ±180° sweep */
  near(core.keyToIntent('dial', { key: 'ArrowLeft' }, { range: 720 }).delta, -10 / 360, 1e-12);
  assert.equal(core.keyToIntent('dial', { key: 'ArrowUp' }), null);
  assert.deepEqual(core.keyToIntent('choice', { key: 'ArrowRight' }), { step: 1 });
  assert.deepEqual(core.keyToIntent('choice', { key: 'ArrowLeft' }), { step: -1 });
  assert.deepEqual(core.keyToIntent('momentary', { key: 'Shift' }), { pressed: true });
  assert.deepEqual(core.keyUpToIntent('momentary', { key: 'Shift' }), { pressed: false });
  assert.equal(core.keyToIntent('momentary', { key: ' ' }), null);
  assert.equal(core.keyToIntent('bogus', { key: 'ArrowUp' }), null);
});

t('global keymap (R5)', () => {
  const want = { ' ': 'togglePlay', r: 'reset', d: 'labelDensity', l: 'theme', w: 'wireframe', x: 'xray', Escape: 'close' };
  for (const [k, a] of Object.entries(want)) assert.equal(core.globalKeyAction(k), a, k);
  assert.equal(core.globalKeyAction('R'), 'reset');
  assert.equal(core.globalKeyAction('q'), null);
  assert.equal(core.globalKeyAction('toString'), null);               /* no prototype leaks */
});

t('presets sane', () => {
  const { PRESETS } = core;
  assert.deepEqual(Object.keys(PRESETS).sort(), ['ambient', 'load', 'percent', 'rpm', 'vehicle-speed', 'voltage']);
  for (const [name, p] of Object.entries(PRESETS)) {
    assert.ok(p.min < p.max, `${name}: min<max`);
    assert.ok(p.def >= p.min && p.def <= p.max, `${name}: def in range`);
    assert.ok(p.step > 0 && p.step < (p.max - p.min), `${name}: step`);
    assert.ok(typeof p.unit === 'string' && p.unit, `${name}: unit`);
    assert.ok(p.scale > 0, `${name}: scale`);
  }
  assert.deepEqual([PRESETS.rpm.min, PRESETS.rpm.max, PRESETS.rpm.def], [800, 5000, 1800]);
  assert.deepEqual([PRESETS.load.min, PRESETS.load.max], [0, 100]);
  assert.deepEqual([PRESETS.ambient.min, PRESETS.ambient.max, PRESETS.ambient.def], [-10, 45, 20]);
  assert.deepEqual([PRESETS['vehicle-speed'].min, PRESETS['vehicle-speed'].max], [0, 160]);
  /* voltage is in VOLTS; scale 100 reproduces fuelpump's old centivolt slider (800..1500) */
  assert.equal(PRESETS.voltage.unit, 'V');
  assert.equal(PRESETS.voltage.min * PRESETS.voltage.scale, 800);
  assert.equal(PRESETS.voltage.max * PRESETS.voltage.scale, 1500);
  assert.equal(PRESETS.voltage.def * PRESETS.voltage.scale, 1350);
  assert.throws(() => { PRESETS.rpm.max = 1; core.getPreset('nope'); }, /unknown preset|read only|Cannot assign/);
  assert.equal(core.getPreset('rpm').max, 5000);                     /* frozen: unchanged */
});

t('resolveSpec / defaultNormalized', () => {
  const s = core.resolveSpec({ preset: 'rpm', label: 'Speed', max: 6000 });
  assert.equal(s.min, 800); assert.equal(s.max, 6000); assert.equal(s.label, 'Speed');
  near(core.defaultNormalized({ preset: 'rpm' }), (1800 - 800) / 4200, 1e-12);
  near(core.defaultNormalized({ preset: 'voltage' }), (13.5 - 8) / 7, 1e-12);
  assert.equal(core.defaultNormalized({}), 0);
  const r = core.createRegistry(); r.register('rpm', { preset: 'rpm' });
  near(r.get('rpm'), 1000 / 4200, 1e-12);
});

console.log(`\n${n} test groups passed`);
