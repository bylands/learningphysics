// Verifies the play button of the simulation (sim/sim.js): run with
// `node acceleration-voltage/test/check-sim.js`. It loads the page's script into a small stand-in
// for the DOM, presses ▶, runs a few frames, presses ❚❚ and checks
// - that the pause holds the time still (more frames change nothing) and ▶ goes on from there,
// - that the button's label is written only when it changes, not on every frame: rewriting it each
//   frame swaps the text node under the pointer, and Safari then drops the click on ❚❚.
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

const btn = els['#sim-play'], out = els['#sim-out'];
if (!btn || !btn.listeners.click) { console.error('  FAIL the play button is not wired'); process.exit(1); }
const label = () => btn.textContent;

btn.fire('click');
run(50);
if (!/Pause/.test(label())) fail(`after ▶ the button reads "${label()}", not Pause`);
const before = btn.writes;
run(500);
if (btn.writes !== before) fail(`while playing the label was written ${btn.writes - before} times in 30 frames (should be 0)`);
btn.fire('click');
if (!/Play/.test(label())) fail(`after ❚❚ the button reads "${label()}", not Play`);
const paused = out.innerHTML;
run(500);
if (out.innerHTML !== paused) fail('the time goes on after ❚❚');
if (queue.length) fail('a frame is still scheduled after ❚❚');
btn.fire('click');
run(100);
if (out.innerHTML === paused) fail('▶ after ❚❚ does not go on');

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('Acceleration Voltage simulation: play and pause OK');
