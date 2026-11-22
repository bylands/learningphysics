// Verifies the play button of the simulation (sim/sim.js): run with
// `node acceleration-voltage/test/check-sim.js`. It loads the page's script into a small stand-in
// for the DOM, presses ▶, runs a few frames, presses ❚❚ and checks
// - that the pause holds the time still (more frames change nothing) and ▶ goes on from there,
// - that the button's label is written only when it changes, not on every frame: rewriting it each
//   frame swaps the text node under the pointer, and Safari then drops the click on ❚❚,
// - that the energy bars move while it plays but the table (time, speed, kinetic energy) holds
//   still, and shows the new values once paused and at the end;
// and, in accel.js, that the plates one above the other and a point charge of any Z are fields
// with E = −grad V (Z = 0: none).
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
const fail = (msg) => { failures++; console.error('  FAIL ' + msg); };

// the stand-in for the DOM: one element per selector, the frames run by hand
function element(sel) {
  let text = '';
  const el = {
    sel, innerHTML: '', listeners: {}, writes: 0, value: '', dataset: {}, style: {},
    get textContent() { return text; },
    set textContent(s) { text = String(s); el.writes++; },
    addEventListener(ev, fn) { (el.listeners[ev] = el.listeners[ev] || []).push(fn); },
    setAttribute() {}, focus() {},
    fire(ev) { (el.listeners[ev] || []).forEach((fn) => fn({ target: el, preventDefault() {} })); },
  };
  return el;
}
const els = {};
const document = {
  readyState: 'complete', title: '', documentElement: { lang: 'en' },
  querySelector: (sel) => (/svg|#sim-layer/.test(sel) ? null : els[sel] || (els[sel] = element(sel))),
  querySelectorAll: () => [],
  addEventListener() {},
};
let queue = [], now = 0, id = 0;
const window = {
  document,
  requestAnimationFrame: (fn) => { queue.push(fn); return ++id; },
  cancelAnimationFrame: () => { queue = []; },
  matchMedia: () => ({ matches: false }),
  localStorage: { getItem: () => null, setItem() {} },
  location: { search: '', hash: '', pathname: '/acceleration-voltage/sim/' },
  navigator: { language: 'en' },
};
window.window = window;
const run = (ms) => { for (let k = 0; k < ms / 16; k++) { now += 16; const q = queue; queue = []; q.forEach((fn) => fn(now)); } };

const ctx = vm.createContext({ ...window, window, console, URLSearchParams, Math, Number, String, JSON, Object, Array, Date });
const dir = path.join(__dirname, '..');
for (const f of ['lang.js', 'elec.js', 'accel.js', 'exercises.js', 'sim/sim.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });

const btn = els['#sim-play'], out = els['#sim-bars'], tbl = els['#sim-table'];
if (!btn || !btn.listeners.click) { console.error('  FAIL the play button is not wired'); process.exit(1); }
const label = () => btn.textContent;

const table0 = tbl.innerHTML;
if (!/<table/.test(table0)) fail('no table before ▶');
btn.fire('click');
run(50);
if (!/Pause/.test(label())) fail(`after ▶ the button reads "${label()}", not Pause`);
const before = btn.writes;
run(500);
if (btn.writes !== before) fail(`while playing the label was written ${btn.writes - before} times in 30 frames (should be 0)`);
if (tbl.innerHTML !== table0) fail('the table changes while the motion plays');
if (!/running/.test(tbl.className)) fail('the table is not marked as held while playing');
btn.fire('click');
if (tbl.innerHTML === table0) fail('the table does not show the new values after ❚❚');
if (/running/.test(tbl.className)) fail('the table is still marked as held after ❚❚');
if (!/Play/.test(label())) fail(`after ❚❚ the button reads "${label()}", not Play`);
const paused = out.innerHTML;
run(500);
if (out.innerHTML !== paused) fail('the time goes on after ❚❚');
if (queue.length) fail('a frame is still scheduled after ❚❚');
btn.fire('click');
run(100);
if (out.innerHTML === paused) fail('▶ after ❚❚ does not go on');
const tablePaused = tbl.innerHTML;
run(8000);
if (tbl.innerHTML === tablePaused || /running/.test(tbl.className)) fail('the table does not show the values at the end');

// the fields (accel.js)
const A = ctx.window.Accel || ctx.Accel;
const grad = (c, x, y) => { const h = 1e-4; return [-(A.V(c, x + h, y) - A.V(c, x - h, y)) / (2 * h), -(A.V(c, x, y + h) - A.V(c, x, y - h)) / (2 * h)]; };
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const vert = { kind: 'plates', vert: true, VT: 1000, VB: 0 };
if (!near(A.V(vert, 0, A.PY), 1000) || !near(A.V(vert, 1, -A.PY), 0)) fail('plates one above the other: the potentials of the plates');
for (const [x, y] of [[0, 0], [-2, 0.7], [2.5, -1.2]]) { const E = A.E(vert, x, y), g = grad(vert, x, y); if (!near(E[0], g[0]) || !near(E[1], g[1])) fail(`plates one above the other: E ≠ −grad V at (${x}, ${y})`); }
if (A.E(vert, 0, 0)[1] >= 0) fail('plates one above the other: the field does not point down from the top plate at the higher potential');
for (const Z of [-100, -3, 1, 47]) { const c = { kind: 'nucleus', Z, scale: 20 }, E = A.E(c, 0, 0.5), g = grad(c, 0, 0.5); if (!near(E[0], g[0]) || !near(E[1], g[1])) fail(`a point charge Z = ${Z}: E ≠ −grad V`); }
const z0 = { kind: 'nucleus', Z: 0, scale: 20 };
if (A.V(z0, 0, 0.5) !== 0 || A.lines(z0, A.BOX.nucleus).length) fail('a point charge Z = 0 has a field');
if (!/class="charge neu"/.test(A.fieldFig(z0, { W: 640 }))) fail('a point charge Z = 0 is not drawn neutral');
if (!/class="plate"[^>]*height="6"/.test(A.fieldFig(vert, { W: 640, equi: [500] }))) fail('plates one above the other are not drawn lying');

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('Acceleration Voltage simulation: play, pause, the held table and the fields OK');
