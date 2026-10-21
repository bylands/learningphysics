// Verifies the runs shown while watching ("predict, then watch", oscWatch in scenarios.js): run
// with `node oscillations/test/check-watch.js`. For many seeds of every exercise type with a run,
// in both languages, and for the worked examples, it checks that
// - before t = 0 the body is at rest where it starts (y = A·cos φ₀, v = a = 0: held, or at the
//   equilibrium before the push; on a track at y(0) > 0), and its position does not jump at t = 0;
// - the body on its spring and the pointer's shadow move harmonically: v = dy/dt, a = dv/dt
//   (numerically), a = −ω²·y, y(t + T) = y(t), the largest sizes A, A·ω and A·ω²; the exercise's
//   y = A·cos(ωt) (kinematics), y = A·sin(ωt) (the points), y = A·cos(ωt − φ₀) (the pointer);
// - on a track the body follows the motion of the given equation (the graph of the exercise);
// - the answers of the exercise lie on the curves (v̂, â, the period 2π/ω, the lower turning
//   point −A), so that right answers are rings marked ✓, the point asked for and the right graph
//   or equation are ✓, and every wrong choice is ✗ somewhere;
// - the scene has one switch with its hit area and draws without NaN or undefined.
'use strict';

const Lang = require('../lang.js');
require('../core.js'); require('../equations.js'); require('../plot.js'); require('../scenarios.js'); require('../generator.js'); require('../lessons.js');
global.window = globalThis; require('../figkit.js'); require('../figures.js');
const { OC, Equations: Eq, Scenarios, Osc, Lessons, Figures } = globalThis;

const SAMPLES = 120;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const PI2 = 2 * Math.PI;

function verifyScene(w, tag) {
  const sc = Figures.watchScene(w);
  if ((sc.frame.match(/data-pw-switch/g) || []).length !== 1 || !/class="pw-hit"/.test(sc.frame) || !/class="osw-pose"/.test(sc.frame)) fail(`${tag}: the scene's switch`);
  for (const t of [-0.1 * w.t1, 0, 0.3 * w.t1, w.t1]) {
    const s = sc.pose({ ...w.at(t), held: t < 0 && !w.push });
    if (/NaN|undefined/.test(s) || !s) fail(`${tag}: the scene at t = ${t}`);
  }
}

function verifyRun(w, tag) {
  if (!(w.t1 > 0) || !['s', 'T', ''].includes(w.unit)) { fail(`${tag}: t1 = ${w.t1}, unit ${w.unit}`); return; }
  const before = w.at(-0.1 * w.t1), a0 = w.at(0);
  if (!near(before.y, a0.y, 1e-6)) fail(`${tag}: y jumps at t = 0`);
  if (w.curve) {
    if (before.y !== Scenarios.Y0) fail(`${tag}: not at rest at y(0) = ${Scenarios.Y0}`);
    const pts = Scenarios.curveOf(w.given);
    const span = w.axis.hi - w.axis.lo;
    pts.forEach(([t, y]) => { if (Math.abs(y) < 50 && Math.abs(w.at(t).y - y) > 0.01 * Math.max(span, Math.abs(y))) fail(`${tag}: off the equation's motion at t = ${t}`); });
  } else {
    const { A, w: om } = w, T = PI2 / om;
    if (before.v !== 0 || before.a !== 0 || !near(before.y, w.push ? 0 : A * Math.cos(w.phi))) fail(`${tag}: not at rest before t = 0`);
    if (!near(w.t1, 2 * T, 1e-9)) fail(`${tag}: not two periods`);
    let ymax = 0, vmax = 0, amax = 0;
    for (let k = 0; k <= 400; k++) {
      const t = (k / 400) * w.t1, s = w.at(t), h = T * 1e-5;
      ymax = Math.max(ymax, Math.abs(s.y)); vmax = Math.max(vmax, Math.abs(s.v)); amax = Math.max(amax, Math.abs(s.a));
      if (!near(s.a, -om * om * s.y, 1e-9)) fail(`${tag}: a ≠ −ω²·y at t = ${t}`);
      if (Math.abs((w.at(t + h).y - w.at(t - h).y) / (2 * h) - s.v) > 1e-5 * A * om) { if (t > h) fail(`${tag}: v ≠ dy/dt at t = ${t}`); }
      if (Math.abs((w.at(t + h).v - w.at(t - h).v) / (2 * h) - s.a) > 1e-5 * A * om * om) { if (t > h) fail(`${tag}: a ≠ dv/dt at t = ${t}`); }
      if (!near(w.at(t + T).y, s.y, 1e-9 * A + 1e-12)) fail(`${tag}: not periodic at t = ${t}`);
    }
    if (!near(ymax, A, 1e-3) || !near(vmax, A * om, 1e-3) || !near(amax, A * om * om, 1e-3)) fail(`${tag}: the largest sizes`);
    if (!near(w.amp.y, A) || !near(w.amp.v, A * om) || !near(w.amp.a, A * om * om)) fail(`${tag}: amp`);
  }
  verifyScene(w, tag);
}

// the run against the exercise: its numbers, and where it starts
function verifyExercise(ex, w, tag) {
  const p = ex.p;
  if (ex.scenario === 'circle') {
    if (w.kind !== 'pointer' || !near(w.phi, (p.k * Math.PI) / 4)) fail(`${tag}: the pointer's φ₀`);
    for (const u of [0.1, 0.6, 1.3]) if (!near(w.at(u).y, Math.cos(PI2 * u - w.phi))) fail(`${tag}: the shadow at ${u} T`);
  } else if (ex.scenario === 'points') {
    if (!w.push || w.at(-1).y !== 0) fail(`${tag}: not pushed at the equilibrium`);
    for (const u of p.us) if (!near(w.at(u).y, Math.sin(PI2 * u))) fail(`${tag}: the graph of the points at ${u}`);
  } else if (/^match/.test(ex.scenario)) {
    if (w.kind !== 'track' || w.given !== p.given) fail(`${tag}: the given motion`);
  } else {
    if (w.kind !== 'spring' || !near(w.A, p.A) || !near(w.w, p.w) || w.unit !== 's') fail(`${tag}: A and ω`);
    for (const t of [0, 0.37, 1.1]) if (!near(w.at(t).y, p.A * Math.cos(p.w * t))) fail(`${tag}: y = A·cos(ωt) at ${t}`);
  }
}

// the right answers entered: every ring right (numbers on their curve)
function verifyMarks(ex, w, tag) {
  const right = (key) => { const f = ex.fields.find((x) => x.key === key); return f ? f.value : null; };
  const marks = w.marks(right);
  if (!marks.length) fail(`${tag}: no marks`);
  for (const m of marks) {
    if (!/^(y|v|a)$/.test(m.q) || !w.panels.includes(m.q) || typeof m.say !== 'string' || /undefined|NaN/.test(m.say) || m.t < 0 || m.t > w.t1) fail(`${tag}: mark ${JSON.stringify(m)}`);
    if (m.ok === false) fail(`${tag}: the right answer ${m.key} marked wrong`);
    if (m.ok === null) {
      const f = ex.fields.find((x) => x.key === m.key), y = w.units ? OC.inUnit(w.at(m.t)[m.q], w.units[m.q]) : w.at(m.t)[m.q];
      if (!f || f.type !== 'num' || Math.abs(y - m.y) > 0.01 * Math.abs(y)) fail(`${tag}: ${m.key} at t = ${m.t}: ${m.y}, the curve ${y}`);
    }
  }
  // no answer: no rings
  if (w.marks((k) => { const f = ex.fields.find((x) => x.key === k); return f && f.type === 'num' ? NaN : null; }).length) fail(`${tag}: rings without answers`);
  // a wrong choice: marked wrong somewhere
  ex.fields.filter((f) => f.type === 'choice').forEach((f) => {
    f.options.filter((o) => o[0] !== f.value).forEach((o) => {
      if (!w.marks((k) => (k === f.key ? o[0] : null)).some((m) => m.ok === false)) fail(`${tag}: the wrong choice ${o[0]} marked right`);
    });
  });
  // a wrong number: off the curve
  ex.fields.filter((f) => f.type === 'num').forEach((f) => {
    const m = w.marks((k) => (k === f.key ? 1.5 * f.value : NaN))[0];
    if (!m) return;
    const y = OC.inUnit(w.at(m.t)[m.q], w.units[m.q]);
    if (m.t < w.t1 && Math.abs(y - m.y) < 0.05 * Math.abs(y)) fail(`${tag}: a wrong ${f.key} on the curve`);
  });
}

const WATCHED = ['circle', 'match-1', 'match-2', 'match-back', 'points', 'vmax', 'back-w', 'back-A'];
for (const lang of ['en', 'de']) {
  Lang.set(lang);
  for (const scn of Osc.SCENARIOS) {
    let n = 0;
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const ex = Osc.practiceOf(scn.id, seed), tag = `${lang} ${scn.id} ${seed}`;
      if (!ex.watch) { if (WATCHED.includes(scn.id)) fail(`${tag}: no run to watch`); continue; }
      if (!WATCHED.includes(scn.id)) fail(`${tag}: a run to watch`);
      const w = ex.watch();
      n++;
      verifyRun(w, tag);
      verifyExercise(ex, w, tag);
      verifyMarks(ex, w, tag);
    }
    if (n) console.log(`${lang} ${scn.id}: ${n} runs`);
  }
  // the worked examples
  Lessons.EXAMPLES.forEach((e, i) => {
    const t = Osc.tutorial(e);
    if (e.watch == null) { if (t.watch) fail(`example ${i + 1}: a run without watch`); return; }
    const w = t.watch(), last = t.frames[t.frames.length - 1];
    if (!/pw-host/.test(last.figure) || /undefined/.test(last.text)) fail(`${lang} example ${i + 1}: the frame to watch`);
    verifyRun(w, `${lang} example ${i + 1}`);
    if (w.marks(() => null).length) fail(`example ${i + 1}: marks without answers`);
  });
}
if (Lessons.EXAMPLES.filter((e) => e.watch != null).length !== 3) fail('not three worked examples to watch');

if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log('Watching OK');
