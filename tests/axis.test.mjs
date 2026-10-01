// node tests/axis.test.mjs — Phase 3: one slider primitive. Static checks always run; the DOM check runs
// when jsdom is resolvable (it is NOT a project dependency: R11 — run `npm i jsdom` in a scratch dir and
// set JSDOM_PATH, or have it installed globally; otherwise that group is skipped and says so).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log('ok  ', name); };

await t('no <input type="range"> in any page except sensors.html (Phase 8) — only controls.js / chrome.js build them', () => {
  const bad = pages.filter((f) => f !== 'sensors.html' && /type=\\?"range\\?"/.test(rd(f)));
  assert.deepEqual(bad, []);
  const js = fs.readdirSync(root).filter((f) => f.endsWith('.js') && !['controls.js', 'chrome.js'].includes(f));
  const badJs = js.filter((f) => /type=\\?"range\\?"|type\s*=\s*['"]range['"]/.test(rd(f)));
  assert.deepEqual(badJs, [], 'range inputs outside controls.js / chrome.js');
});

await t('legacy slider classes are gone (.al-range, .ui-tb-speed, data-phase1-temp, speed-module)', () => {
  for (const f of [...pages.filter((p) => p !== 'sensors.html'), 'app.css', 'components.css', 'controls.css', 'kit.js', 'components.js']) {
    const s = rd(f);
    assert.ok(!/al-range|ui-tb-speed|data-phase1-temp|speed-module|Widgets\.slider/.test(s), `${f} still references a removed slider`);
  }
});

await t('modules read slider values only through ui.controls / controls (no el.value reads of removed inputs)', () => {
  for (const f of ['awd','catalytic','commonrail','dpf','driveshaft','egr','fuelpump','intercooler','oilpump','radiator']) {
    const s = rd(f + '.html');
    assert.match(s, /ctls:\s*\[/, `${f}: no ctls[]`);
    assert.ok(!/getElementById\('ctl'\)|CFG\.ctl\b/.test(s), `${f}: still touches #ctl / CFG.ctl`);
    const ids = [...s.matchAll(/\{ id:'(\w+)'/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${f}: duplicate control ids ${ids}`);
    assert.ok(ids[0] === 'ctl', `${f}: ctls[0] must be the main 'ctl' control`);
  }
});

await t('fuelpump uses real volts (preset voltage), not centivolts', () => {
  const s = rd('fuelpump.html');
  assert.match(s, /preset:'voltage'/);
  assert.ok(!/1350|\/ 100\)/.test(s.split('\n').filter((l) => /volts/i.test(l)).join('\n')));
});

await t('D8/D16: cooling + abs-esc + ignition + mpfi have own axes; state.speedMul is not a quantity any more', () => {
  const need = { 'cooling.html': 'rpm', 'abs-esc.html': 'speed', 'ignition.html': 'rpm', 'mpfi.html': 'load' };
  for (const [f, id] of Object.entries(need)) {
    const s = rd(f);
    assert.match(s, new RegExp(`id: '${id}'`), `${f}: no '${id}' axis`);
  }
  const abs = rd('abs-esc.html').split('\n').filter((l) => /state\.speedMul/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) && !/\/\/.*state\.speedMul/.test(l.split('state.speedMul')[0] + '//'));
  assert.ok(!/const v\s*=\s*state\.speedMul/.test(rd('abs-esc.html')));
  assert.ok(!/state\.speedMul \* |\* state\.speedMul|\(700 \+ 2100 \* state\.speedMul/.test(rd('cooling.html').replace(/state\.time \+= dt \* state\.speedMul/, '')),
    'cooling physics must use engLevel(), only the time step may use sim speed');
  void abs;
});

await t('controls.js + controls-core.js precached; cache version bumped', () => {
  const sw = rd('sw.js');
  assert.match(sw, /'\.\/controls\.js'/);
  assert.match(sw, /'\.\/controls-core\.js'/);
  assert.match(sw, /autolab-v8\.3/);
});

await t('controls.css: axis is 44 px, tokens only, focus ring + reduced motion', () => {
  const css = rd('controls.css');
  const axis = css.slice(css.indexOf('PHASE 3'));
  assert.match(axis, /height: var\(--ctl-tap\)/);
  assert.match(axis, /focus-visible/);
  assert.match(axis, /prefers-reduced-motion/);
  assert.match(axis, /touch-action: none/);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(axis), 'hard-coded colour in axis CSS (R3)');
});

/* ── DOM (optional) ── */
let JSDOM = null;
try {
  const req = createRequire(process.env.JSDOM_PATH ? pathToFileURL(path.join(process.env.JSDOM_PATH, 'x.js')) : import.meta.url);
  JSDOM = req('jsdom').JSDOM;
} catch (_) { /* skipped below */ }

if (!JSDOM) {
  console.log('skip  axis DOM tests (jsdom not available; set JSDOM_PATH to a dir with jsdom installed)');
} else {
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  const { controls, createAxis } = await import('../controls.js');
  const { registry } = await import('../controls-core.js');

  await t('DOM axis: one root node, role/aria, value text with unit, keyboard ↑/↓ steps', () => {
    registry.reset();
    const ax = createAxis({ id: 'rpm', preset: 'rpm', max: 5500, def: 2400, label: 'Engine speed' });
    document.body.appendChild(ax.el);
    assert.equal(document.querySelectorAll('[data-ctl="rpm"]').length, 1);
    assert.equal(ax.value(), 2400);
    assert.equal(ax.input.getAttribute('aria-valuetext'), '2400 rpm');
    assert.equal(ax.el.querySelector('.ctl-value').textContent, '2400 rpm');
    assert.equal(ax.input.getAttribute('aria-label'), 'Engine speed');
    ax.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    assert.ok(ax.value() > 2400, 'ArrowUp raises the value');
    ax.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    ax.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    assert.ok(ax.value() < 2400);
  });

  await t('DOM axis: input -> store -> listeners (change-only); set()/reset()/raw()/setText()', () => {
    registry.reset();
    const ax = createAxis({ id: 'volts', preset: 'voltage' });
    let calls = 0, last = null;
    ax.on((v) => { calls++; last = v; });
    ax.input.value = String(Math.round(0.5 * Number(ax.input.max)));
    ax.input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(calls, 1);
    assert.equal(controls.get('volts'), last);
    assert.equal(ax.value(), 11.5);
    assert.equal(ax.raw(), 1150);
    ax.set(ax.get());                      /* no change -> no event */
    assert.equal(calls, 1);
    ax.reset();
    assert.equal(ax.value(), 13.5);
    ax.setText('Fuse blown');
    assert.equal(ax.el.querySelector('.ctl-value').textContent, 'Fuse blown');
    assert.equal(ax.input.getAttribute('aria-valuetext'), 'Fuse blown');
    ax.setText(null);
    assert.equal(ax.el.querySelector('.ctl-value').textContent, '13.5 V');
  });

  await t('DOM axis: duplicate id throws (R9); resetAll() restores every default; setDisabled', () => {
    registry.reset();
    const a = createAxis({ id: 'a', min: 0, max: 10, step: 1, def: 3 });
    const b = createAxis({ id: 'b', preset: 'percent', def: 40 });
    assert.throws(() => createAxis({ id: 'a', min: 0, max: 1 }), /duplicate/);
    a.set(1); b.set(1);
    controls.resetAll();
    assert.equal(a.value(), 3);
    assert.equal(b.value(), 40);
    controls.setDisabled('a', true);
    assert.equal(a.input.disabled, true);
  });

  await t('DOM axis: drag shows the bubble state; custom format (+/- degrees) is used in text', () => {
    registry.reset();
    const ax = createAxis({ id: 'adv', min: -20, max: 20, step: 1, def: 0, unit: '°', format: (v) => (v > 0 ? '+' : '') + v + '°' });
    ax.input.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
    assert.ok(ax.el.classList.contains('is-dragging'));
    ax.setValue(10);
    assert.equal(ax.el.querySelector('.ctl-bubble').textContent, '+10°');
    ax.input.dispatchEvent(new dom.window.Event('pointerup', { bubbles: true }));
    assert.ok(!ax.el.classList.contains('is-dragging'));
  });
}

console.log(`\n${n} test groups passed`);
