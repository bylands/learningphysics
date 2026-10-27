// Verifies the pattern shown while watching ("predict, then watch", ifWatch in scenarios.js, the
// scene Figures.watchScene): run with `node interference/test/check-watch.js`. For many seeds of
// every exercise type with a run, in both languages, and for the worked examples, it checks that
// - before switching only the source that is on shines: the intensity is 1/N² everywhere, no
//   pattern; once the waves of all sources have arrived, the brightest point is 1;
// - the pattern is the exercise's: on a flat screen that of Figures.intensity (N narrow slits at
//   the spacing d, the screen at L), its bright fringes at y_k = k·λ·L/d and, for two slits, dark
//   ones half way; for the path difference cos²(π·Δs/λ), P at Δs = m·λ; for the highest order
//   the maxima at sin α = k·λ/d up to the highest order, the next one beyond sin α = 1;
// - the waves spread from the sources at one speed: a point is as before switching until the
//   waves of a source switched on can have reached it, and at the end of the run the whole screen
//   shows the full pattern; the middle of the screen is reached at t ≈ 1;
// - the right answers are rings marked ✓ (a number: on a bright fringe, or at P), every wrong
//   choice is ✗, a wrong number lies elsewhere, and no answer gives no ring;
// - the places marked (keys) are those of the exercise: P, the bright fringe asked for (a
//   maximum, I = 1), the first and the highest order; named, on the screen shown;
// - the scene has one switch with its hit area, and draws without NaN or undefined.
'use strict';

const Lang = require('../lang.js');
global.window = globalThis;
for (const f of ['core', 'figkit', 'figures', 'scenarios', 'generator', 'lessons']) require(`../${f}.js`);
const { IW, Interf, Lessons, Figures } = globalThis;

const SAMPLES = 60;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const BAD = /NaN|undefined|Infinity/;

// the run of the waves: intensities, the pattern before and after, the scene
function verifyRun(w, tag) {
  const N = w.N, ys = Array.from({ length: 41 }, (z, k) => -w.Y + (k / 20) * w.Y);
  for (const y of ys) {
    if (!near(w.I(y, () => false), 1 / (N * N))) fail(`${tag}: before switching I(${y}) = ${w.I(y, () => false)}`);
    const I = w.I(y);
    if (!(I >= -1e-12 && I <= 1 + 1e-9)) fail(`${tag}: I(${y}) = ${I}`);
  }
  if (!near(w.I(0), 1)) fail(`${tag}: the central maximum ${w.I(0)}`);
  const sc = Figures.watchScene(w), { y0, ls, cx, c } = sc.geo;
  if ((sc.frame.match(/data-pw-switch/g) || []).length !== 1 || !/class="pw-hit"/.test(sc.frame) || !/ifw-canvas/.test(sc.frame)) fail(`${tag}: the switch or the canvas`);
  if (!(sc.t1 > 1 && sc.t1 < 2.5) || !near(sc.full(0), 1, 0.08)) fail(`${tag}: t1 = ${sc.t1}, the middle of the screen at ${sc.full(0)}`);
  for (const y of ys) if (sc.full(y) > sc.t1) fail(`${tag}: the pattern at ${y} complete after the end`);
  for (const t of [-0.1, 0, 0.4, 1, sc.t1]) {
    const s = sc.over(t) + sc.graph(t, []);
    if (BAD.test(s)) fail(`${tag}: drawn at ${t}: ${s.match(BAD)[0]}`);
  }
  if (BAD.test(sc.frame)) fail(`${tag}: the frame`);
  // causality: near the screen, as before until a switched source's waves can be there; at the
  // end the full pattern
  for (const fx of [-0.8, -0.3, 0, 0.45, 0.9]) {
    const [x, ys0] = sc.at(fx * w.Y), y = ys0 - 3, d = Math.min(...sc.sources.filter((_, j) => j !== w.on).map((sx) => Math.hypot(x - sx, y - y0)));
    const before = sc.level(x, y, -0.5), early = sc.level(x, y, (0.95 * d) / c), end = sc.level(x, y, sc.t1), one = sc.level(x, y, 0.001);
    if (before == null || !Number.isFinite(before)) { fail(`${tag}: no light at the screen at ${fx}`); continue; }
    if (!near(early, before) || !near(one, before)) fail(`${tag}: at ${fx} the waves before they can have arrived`);
    if (!(end >= 0 && end <= 1)) fail(`${tag}: brightness ${end}`);
  }
  if (sc.level(cx, y0 - 10, 1) !== null || (w.flat && sc.level(cx, y0 + ls + 8, 1) !== null)) fail(`${tag}: light outside the field`);
  return sc;
}

// the pattern against the exercise
function verifyPattern(ex, w, tag) {
  const p = ex.p, v = ex.v;
  if (ex.scenario === 'path') {
    if (w.N !== 2 || w.P !== p.m || w.kind !== (p.sound ? 'speakers' : 'slits')) fail(`${tag}: the sources or P`);
    for (const m of [0, 0.5, 1, 1.5, 2.25, 3, 3.5]) if (!near(w.I(m), Math.cos(Math.PI * m) ** 2, 1e-9)) fail(`${tag}: I at Δs = ${m} λ`);
    return;
  }
  if (ex.scenario === 'grating-max') {
    const k = Number(v.kmax);
    for (let j = 1; j <= k; j++) if (!near(w.I(j * v.s), 1, 1e-6) || j * v.s > 1) fail(`${tag}: the maximum of order ${j}`);
    if ((k + 1) * v.s <= 1 || w.flat || w.Y !== 1) fail(`${tag}: the order ${k + 1} would be seen`);
    if (!near(v.s, p.n * 1e3 * p.lam)) fail(`${tag}: sin α₁`);
    return;
  }
  const d = ex.scenario === 'grating' ? 1e-3 / p.n : p.d, f = IW.UNITS[w.unit][0], y1 = (p.lam * p.L) / d / f;
  if (!w.flat || w.N !== (ex.scenario === 'grating' ? 8 : 2) || !near(w.Lm, p.L)) fail(`${tag}: the set-up`);
  for (let j = 0; j <= 3; j++) if (!near(w.I(j * y1), 1, 1e-6)) fail(`${tag}: no bright fringe of order ${j}`);
  if (w.N === 2) for (let j = 0; j <= 2; j++) if (w.I((j + 0.5) * y1) > 1e-9) fail(`${tag}: no dark fringe after order ${j}`);
  for (const u of [0.13, 0.4, 0.77, 1.31, 2.6]) {
    const I = Figures.intensity({ lam: p.lam, L: p.L, d, N: w.N, b: 0 }, u * y1 * f);
    if (!near(w.I(u * y1), I, 1e-6)) fail(`${tag}: I(${u} y1) = ${w.I(u * y1)}, Figures.intensity ${I}`);
  }
  if (!(w.Y > Math.max(p.k, 2) * y1)) fail(`${tag}: the fringe of order ${p.k} not on the screen`);
}

// the answers: right ones ✓ where the pattern says, wrong ones ✗ or elsewhere, none no ring
function verifyMarks(ex, w, tag) {
  const right = (key) => { const f = ex.fields.find((x) => x.key === key); return f ? f.value : null; };
  const marks = w.marks(right);
  if (marks.length !== ex.fields.length) fail(`${tag}: ${marks.length} rings for ${ex.fields.length} answers`);
  const at = {};
  for (const m of marks) {
    at[m.key] = m.y;
    if (m.ok === false || typeof m.say !== 'string' || BAD.test(m.say) || Math.abs(m.y) > w.Y) fail(`${tag}: mark ${JSON.stringify(m)}`);
    if (ex.scenario === 'path') { if (!near(m.y, ex.p.m, 1e-6)) fail(`${tag}: ${m.key} not at P`); } else if (!near(w.I(m.y), 1, 1e-3)) fail(`${tag}: ${m.key} at ${m.y}, not on a maximum`);
  }
  // the fringe asked: at y_k
  if (/^(ds-pos|ds-lam|grating)$/.test(ex.scenario)) {
    const d = ex.scenario === 'grating' ? 1e-3 / ex.p.n : ex.p.d, yk = (ex.p.k * ex.p.lam * ex.p.L) / d / IW.UNITS[w.unit][0];
    for (const k in at) if (!near(at[k], yk, 1e-6)) fail(`${tag}: ${k} at ${at[k]}, not at y_k = ${yk}`);
  }
  if (w.marks((k) => { const f = ex.fields.find((x) => x.key === k); return f && f.type === 'num' ? NaN : null; }).length) fail(`${tag}: rings without answers`);
  ex.fields.filter((f) => f.type === 'choice').forEach((f) => {
    f.options.filter((o) => o[0] !== f.value).forEach((o) => {
      const ms = w.marks((k) => (k === f.key ? o[0] : null));
      if (ms.length !== 1 || ms[0].ok !== false) fail(`${tag}: the wrong choice ${o[0]} not marked wrong`);
    });
  });
  ex.fields.filter((f) => f.type === 'num').forEach((f) => {
    const m = w.marks((k) => (k === f.key ? 1.5 * f.value : NaN))[0];
    if (m && near(m.y, at[f.key], 0.01)) fail(`${tag}: a wrong ${f.key} where the right one is`);
  });
}

// the key places: on the screen shown, named; a fringe asked for is a maximum
function verifyKeys(ex, w, tag) {
  const keys = w.keys();
  if (!keys.length) fail(`${tag}: no key places`);
  for (const k of keys) {
    if (Math.abs(k.y) > w.Y + 1e-9 || typeof k.say !== 'string' || BAD.test(k.say) || typeof k.label !== 'string' || BAD.test(k.label)) fail(`${tag}: key ${JSON.stringify(k)}`);
  }
  if (ex.scenario === 'path' || ex.id === 'path') { if (!near(keys[0].y, ex.p.m) || keys[0].y !== w.P) fail(`${tag}: P not marked`); }
  else keys.forEach((k) => { if (!near(w.I(k.y), 1, 1e-6)) fail(`${tag}: ${k.y} not a maximum (I = ${w.I(k.y)})`); });
  const sc = Figures.watchScene(w), g = sc.graph(sc.t1, keys);
  if ((g.match(/class="ifw-key"/g) || []).length !== keys.length || BAD.test(g)) fail(`${tag}: the key places drawn`);
}

const WATCHED = ['path', 'ds-pos', 'ds-lam', 'grating', 'grating-max'];
for (const lang of ['en', 'de']) {
  Lang.set(lang);
  for (const scn of Interf.SCENARIOS) {
    let n = 0;
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const ex = Interf.practiceOf(scn.id, seed), tag = `${lang} ${scn.id} ${seed}`;
      if (!ex.watch) { if (WATCHED.includes(scn.id)) fail(`${tag}: no run to watch`); continue; }
      if (!WATCHED.includes(scn.id)) fail(`${tag}: a run to watch`);
      const w = ex.watch();
      n++;
      verifyRun(w, tag);
      verifyPattern(ex, w, tag);
      verifyMarks(ex, w, tag);
      verifyKeys(ex, w, tag);
    }
    if (n) console.log(`${lang} ${scn.id}: ${n} runs`);
  }
  // the worked examples
  Lessons.EXAMPLES.forEach((e, i) => {
    const t = Interf.tutorial(e);
    if (!e.watch) { if (t.watch) fail(`example ${i + 1}: a run without watch`); return; }
    const w = t.watch(), last = t.frames[t.frames.length - 1];
    if (!/pw-host/.test(last.figure) || BAD.test(last.text)) fail(`${lang} example ${i + 1}: the frame to watch`);
    verifyRun(w, `${lang} example ${i + 1}`);
    if (w.marks(() => null).length) fail(`example ${i + 1}: marks without answers`);
  });
}
if (Lessons.EXAMPLES.filter((e) => e.watch).length !== 2) fail('not two worked examples to watch');

if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log('Watching OK');
