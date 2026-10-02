// node tests/monitor.test.mjs — Phase 7a: Monitor core logic (pure) + static acceptance checks. No dependencies.
// Source-level guarantees only; they do NOT replace opening the app on a phone (see the manual checklist).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as M from '../monitor-core.js';

const rd = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  ', name); };

t('rolling buffer: fills, wraps at capacity, keeps oldest → newest order', () => {
  const b = M.createRolling(4);
  assert.equal(b.length, 0); assert.deepEqual(b.toArray(), []);
  [1, 2, 3].forEach((v) => b.push(v));
  assert.deepEqual(b.toArray(), [1, 2, 3]);
  [4, 5, 6].forEach((v) => b.push(v));
  assert.equal(b.length, 4);
  assert.deepEqual(b.toArray(), [3, 4, 5, 6]);
  assert.equal(b.at(0), 3); assert.equal(b.at(3), 6);
  assert.equal(b.min(), 3); assert.equal(b.max(), 6);
  b.clear(); assert.equal(b.length, 0);
});
t('rolling buffer: non-finite samples repeat the previous value (a NaN never reaches a canvas)', () => {
  const b = M.createRolling(8); b.push(2); b.push(NaN); b.push(Infinity);
  assert.deepEqual(b.toArray(), [2, 2, 2]);
  const e = M.createRolling(8); e.push(NaN); assert.deepEqual(e.toArray(), [0]);
});
t('rate limiter: ≈9 Hz text refresh (fake clock)', () => {
  const r = M.createRateLimiter(9); let fired = 0;
  for (let ms = 0; ms < 1000; ms += 4) if (r.due(ms)) fired++;      /* called at 250 Hz */
  assert.ok(fired >= 8 && fired <= 10, `fired ${fired} times in 1 s`);
  const r30 = M.createRateLimiter(30); fired = 0;
  for (let ms = 0; ms < 1000; ms += 4) if (r30.due(ms)) fired++;
  assert.ok(fired >= 28 && fired <= 31, `trace limiter fired ${fired}`);
  assert.equal(r.due(5000), true); assert.equal(r.due(5001), false); r.reset(); assert.equal(r.due(5002), true);
});
t('value → bar / gauge mapping', () => {
  assert.equal(M.barPercent(-5), 0); assert.equal(M.barPercent(40), 40); assert.equal(M.barPercent(130), 100); assert.equal(M.barPercent('x'), 0);
  assert.equal(M.gaugeFraction(50, 0, 100), 0.5); assert.equal(M.gaugeFraction(-1, 0, 100), 0); assert.equal(M.gaugeFraction(9, 0, 5), 1);
  assert.equal(M.gaugeFraction(3, 5, 5), 0, 'degenerate range');
  assert.equal(M.gaugeAngle(0, 0, 100), -120); assert.equal(M.gaugeAngle(100, 0, 100), 120); assert.equal(M.gaugeAngle(50, 0, 100), 0);
});
t('formatting: numbers, row payloads (text | [text, tone]), status payloads', () => {
  assert.equal(M.formatNumber(3.14159, 2), '3.14'); assert.equal(M.formatNumber(NaN), '–'); assert.equal(M.formatNumber(7.6), '8');
  assert.deepEqual(M.normalizeRowValue('12 bar'), { text: '12 bar', tone: '' });
  assert.deepEqual(M.normalizeRowValue(['OK', 'ok']), { text: 'OK', tone: 'ok' });
  assert.deepEqual(M.normalizeRowValue(['x', 'bogus']), { text: 'x', tone: '' });
  assert.deepEqual(M.normalizeRowValue(null), { text: '', tone: '' });
  assert.deepEqual(M.normalizeStatus(['Overheating', true]), { text: 'Overheating', on: true, tone: '' });
  assert.deepEqual(M.normalizeStatus({ text: 'Run', on: 0 }), { text: 'Run', on: false, tone: '' });
  assert.deepEqual(M.normalizeStatus('Idle'), { text: 'Idle', on: false, tone: '' });
});
t('mergeValue: setBig + setBar in one tick do not drop each other', () => {
  assert.deepEqual(M.mergeValue({ text: '5', unit: 'bar' }, { bar: 40 }), { text: '5', unit: 'bar', bar: 40 });
  assert.deepEqual(M.mergeValue(undefined, 7), { text: 7 });
  assert.deepEqual(M.mergeValue({ text: 'a' }, undefined), { text: 'a' });
  assert.deepEqual(M.mergeValue(null, { bar: 52 }), { bar: 52 }, 'null must not blank the big value (regression)');
  assert.deepEqual(M.mergeValue(null, null), {});
});
t('channel validation: good config normalises', () => {
  const r = M.validateMonitorConfig({
    label: 'Heat', value: { label: 'Heat', unit: 'kW', max: 80 },
    rows: [['tin', 'Coolant in'], { id: 'tout', label: 'Coolant out' }],
    traces: [{ id: 'temp', label: 'Temp', series: [{ id: 't1' }, 't2'] }], gauge: { id: 'g', min: 0, max: 120, unit: '°C' }, status: true, footer: '<i>legend</i>',
  });
  assert.equal(r.ok, true, r.errors.join('; '));
  assert.deepEqual(r.config.rows.map((x) => x.id), ['tin', 'tout']);
  assert.equal(r.config.traces[0].series.length, 2); assert.equal(r.config.traces[0].length, M.DEFAULT_TRACE_LEN);
  assert.equal(r.config.value.bar, true); assert.equal(r.config.gauge.max, 120); assert.deepEqual(r.config.status, { text: '' });
});
t('channel validation: bad configs report errors and never throw', () => {
  assert.equal(M.validateMonitorConfig(null).ok, false);
  assert.equal(M.validateMonitorConfig({ rows: [['a', 'A'], ['a', 'B']] }).ok, false, 'duplicate row id');
  assert.equal(M.validateMonitorConfig({ rows: [['a', 'A']], gauge: { id: 'a' } }).ok, false, 'id shared between channels');
  assert.equal(M.validateMonitorConfig({ rows: [['has space', 'x']] }).ok, false, 'illegal id characters');
  assert.equal(M.validateMonitorConfig({ rows: [[7, 'x']] }).ok, false, 'non-string id');
  assert.equal(M.validateMonitorConfig({ traces: [{ id: 't', series: [] }] }).ok, false, 'trace without series');
  assert.equal(M.validateMonitorConfig({ traces: [{ id: 't', series: ['a', 'a'] }] }).ok, false, 'duplicate series id');
  assert.equal(M.validateMonitorConfig({ traces: [{ id: 't', series: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }] }).ok, false, 'more than 6 series');
  assert.equal(M.validateMonitorConfig({ gauge: { id: 'g', min: 5, max: 5 } }).ok, false, 'gauge max <= min');
});
t('traceRange: fixed bounds win; auto-range pads and survives flat / empty data', () => {
  const b = M.createRolling(8); [10, 20].forEach((v) => b.push(v));
  assert.deepEqual(M.traceRange([b], 0, 100), { lo: 0, hi: 100 });
  const auto = M.traceRange([b]); assert.ok(auto.lo < 10 && auto.hi > 20);
  const flat = M.createRolling(8); flat.push(5); flat.push(5); const f = M.traceRange([flat]); assert.ok(f.hi > f.lo);
  const empty = M.traceRange([M.createRolling(8)]); assert.ok(empty.hi > empty.lo);
});

/* ── static acceptance (source level) ── */
const mon = rd('monitor.js'), kit = rd('kit.js'), comp = rd('components.js'), sw = rd('sw.js'), css = rd('controls.css');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

t('monitor.js / kit.js: no MutationObserver (layout is measured on tab switch / ResizeObserver only)', () => {
  assert.ok(!/MutationObserver/.test(mon), 'monitor.js'); assert.ok(!/MutationObserver/.test(kit), 'kit.js');
  assert.ok(!/_wireAutoCollapse[\s\S]{0,4000}observe\([^)]*characterData/.test(kit));
});
t('monitor.js: exactly ONE aria-live region (the status text)', () => {
  assert.equal((strip(mon).match(/aria-live/g) || []).length, 1);
  assert.match(mon, /statusText\.setAttribute\('aria-live', 'polite'\)/);
});
t('monitor.js: no authored <input>/<select>; its one <button> is the phone toggle', () => {
  assert.ok(!/<input|<select/.test(strip(mon)));
  assert.equal((strip(mon).match(/el\('button'/g) || []).length, 1);
});
t('kit.js: ui.monitor exists and ui.chip.* only wraps it (no second readout code path)', () => {
  assert.match(kit, /get monitor\(\)/); assert.match(kit, /_buildMonitor\(/); assert.match(kit, /createMonitor\(/);
  const chip = kit.slice(kit.indexOf('get chip()'), kit.indexOf('get toolbar()'));
  assert.ok(!/textContent|innerHTML|style\./.test(chip), 'chip wrappers must not touch the DOM');
  assert.ok(!/_chipEls|_chipRows|_buildChip/.test(kit), 'old chip DOM removed');
});
t('runGuidedModule: every guided number goes through ui.monitor (no ro-* grid, no ui.chip, no direct DOM writes)', () => {
  const g = comp.slice(comp.indexOf('export function runGuidedModule'));
  assert.match(g, /ui\.monitor\.update\(/);
  assert.ok(!/ui\.chip\./.test(g), 'ui.chip left in runGuidedModule'); assert.ok(!/getElementById\('ro-'/.test(g), 'ro-* lookup left'); assert.ok(!/readout:\s*readoutHTML/.test(g), 'panel readout grid left');
  assert.match(g, /monitor:\s*\{/);
});
t('guided modules: no module reaches around the Monitor for a readout (no ro- ids written, no ui.chip)', () => {
  const guided = readdirSync(new URL('..', import.meta.url)).filter((f) => f.endsWith('.html') && /runGuidedModule\(CFG, build\)/.test(rd(f)));
  assert.ok(guided.length >= 18, `found ${guided.length} guided modules`);
  for (const f of guided) { const s = strip(rd(f)); assert.ok(!/ui\.chip\./.test(s), `${f}: ui.chip`); assert.ok(!/getElementById\(['"]ro-/.test(s), `${f}: ro-* element`); }
});
t('sw.js: monitor.js + monitor-core.js precached, cache bumped', () => {
  assert.match(sw, /'\.\/monitor\.js'/); assert.match(sw, /'\.\/monitor-core\.js'/); assert.match(sw, /VERSION = 'autolab-v8\.[6-9](\.\d+)?'/);
});
t('controls.css: Monitor styles use tokens only (no hard-coded colours) and a reduced-motion block', () => {
  const block = css.slice(css.indexOf('Monitor (Phase 7a)'));
  assert.ok(block.length > 500);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(/.test(block), 'hard-coded colour in the Monitor block');
  assert.match(block, /--monitor-strip-h/); assert.match(block, /--monitor-max/); assert.match(block, /prefers-reduced-motion: reduce/);
});

/* ── Phase 7a part 2: graph canvases → traces, *-warn → status, setRpmLabel → rows ─────────────────────────── */
const GRAPH10 = ['awd', 'catalytic', 'commonrail', 'dpf', 'driveshaft', 'egr', 'fuelpump', 'intercooler', 'oilpump', 'radiator'];
const RPM13 = ['abs-esc', 'automatic', 'carburetor', 'clutch', 'cooling', 'differential', 'electrical', 'exhaustsystem', 'ignition', 'mpfi', 'starting-system', 'suspension', 'turbocharger'];
t('7a-2 (a): the ten guided modules have no graph canvas, drawGraph, history buffer or warn element', () => {
  for (const m of GRAPH10) {
    const s = rd(m + '.html');
    assert.ok(!/<canvas id="[a-z]+-graph"/.test(s), `${m}: graph canvas`);
    assert.ok(!/drawGraph|\bgctx\b|\bgcv\b|\belWarn\b|\bsim\.samples\b|GRAPH_N/.test(s), `${m}: old graph code`);
    assert.ok(!/(?<!-)\b[a-z]+-warn\b/.test(s.replace(/var\(--warn\)/g, '')), `${m}: a *-warn element or rule is left`);
    assert.ok(!/<canvas/.test(s), `${m}: a <canvas> is left in the page source`);
  }
});
t('7a-2 (c): each graph module declares CFG.traces and returns traces + a status from update()', () => {
  for (const m of GRAPH10) {
    const s = rd(m + '.html');
    assert.match(s, /CFG\.traces = \[\{ id: 'hist'/, `${m}: CFG.traces`);
    assert.match(s, /traces: tr,/, `${m}: update() must return traces`);
    assert.match(s, /status: \[warnText \|\| /, `${m}: status must carry the warning`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(s.slice(s.indexOf('CFG.traces'), s.indexOf('CFG.traces') + 700)), `${m}: trace colours must be tokens`);
    assert.match(s, /color: 'var\(--accent\)'/); assert.match(s, /color: 'var\(--warn\)'/);
  }
});
t('7a-2 (b)(d): no *.html calls setRpmLabel any more (kit.js keeps a no-op until 7b)', () => {
  for (const m of RPM13) assert.ok(!/setRpmLabel/.test(rd(m + '.html')), `${m}: setRpmLabel`);
  const all = readdirSync(new URL('../', import.meta.url)).filter((f) => f.endsWith('.html'));
  assert.equal(all.filter((f) => /ui\.toolbar\.setRpmLabel/.test(rd(f))).length, 0);
});
t('7a-2: the rpm / speed rows exist where setRpmLabel used to print a number', () => {
  const rows = { automatic: 'speed', carburetor: 'rpm', clutch: 'rpm', cooling: 'rpm', differential: 'rpm', mpfi: 'rpm', 'starting-system': 'rpm', turbocharger: 'rpm' };
  for (const m in rows) {
    const s = rd(m + '.html');
    assert.match(s, new RegExp(`\\{ id: '${rows[m]}', label: '[^']+', value: '[^']*' \\}`), `${m}: ${rows[m]} row`);
    assert.match(s, new RegExp(`ui\\.monitor\\.update\\(\\{ rows: \\{ ${rows[m]}:`), `${m}: row update`);
  }
});
t('monitor-core: status tone is normalised (warn / crit only), anything else is no tone', () => {
  assert.deepEqual(M.normalizeStatus(['Boiling', true, 'warn']), { text: 'Boiling', on: true, tone: 'warn' });
  assert.deepEqual(M.normalizeStatus(['x', true, 'bogus']), { text: 'x', on: true, tone: '' });
  assert.deepEqual(M.normalizeStatus({ text: 'y', tone: 'crit' }), { text: 'y', on: false, tone: 'crit' });
  assert.deepEqual(M.normalizeStatus('plain'), { text: 'plain', on: false, tone: '' });
});
t('monitor.js: a null trace clears it (module Reset), series colours may be var() tokens, status has a tone', () => {
  const s = rd('monitor.js');
  assert.match(s, /vals === null\) \{ t\.bufs\.forEach\(\(b\) => b\.clear\(\)\)/);
  assert.match(s, /function cssColor/); assert.match(s, /dataset\.tone/);
  assert.ok(!/MutationObserver/.test(s) && !/MutationObserver/.test(rd('kit.js')));
});
t('components.js: CFG.traces reach the Monitor and traces/status tone are forwarded from update()', () => {
  const s = rd('components.js');
  assert.match(s, /traces: CFG\.traces \|\| \[\]/); assert.match(s, /function pushTraces/); assert.match(s, /o\.status\[2\] \|\| ''/);
});

console.log(`\n${n} test groups passed`);
