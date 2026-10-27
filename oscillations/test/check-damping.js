// Verifies the damped oscillations (damping.js): run with `node oscillations/test/check-damping.js`.
// It checks
// - the motions: damping ∝ v (weak, critical, strong) let go at rest, v = dy/dt and a = dv/dt
//   (numerically), a = −ω₀²·y − 2δ·v, the maxima of weak damping at k·T, A·e^(−δ·k·T); critical
//   and strong damping never cross 0, strong returns more slowly; dry friction: turning points
//   A − 2r·k with alternating signs, at rest at the first one within r of 0, never sooner;
// - the graphs of the formulas: an exponential envelope shrinks by equal factors, a linear one by
//   equal steps, t² in the cosine shortens the period; the four graphs of an exercise do not look
//   alike;
// - find the error: each flaw does what its explanation says (the period shorter or longer, the
//   amplitude growing again, a shifted centre, a start below A and falling, a stop away from 0 in
//   water, no stop on the table), and the sketch differs from the right graph;
// - decay-read: the peaks P and Q of the motion are the heights given;
// - the runs to watch: at rest before t = 0 and no jump, the motion of the exercise, the scene
//   drawn without NaN; right answers marked ✓ (a number on its curve), every wrong choice ✗;
// - the worked examples 6 and 7 and their runs.
'use strict';

const Lang = require('../lang.js');
require('../core.js'); require('../equations.js'); require('../plot.js'); require('../scenarios.js'); require('../damping.js'); require('../generator.js'); require('../lessons.js');
global.window = globalThis; require('../figkit.js'); require('../figures.js');
const { OC, Osc, Lessons, Figures, Damping: D, Plot } = globalThis;

let failures = 0;
const fail = (msg) => { failures++; if (failures < 40) console.error('  FAIL ' + msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const PI2 = 2 * Math.PI;
// the local maxima of a sampled curve: [t, y]
const maxima = (pts) => pts.filter((p, i) => i > 0 && i < pts.length - 1 && p[1] > pts[i - 1][1] && p[1] >= pts[i + 1][1] && p[1] > 0.02);

// ---------------------------------------------------------------- the motions
function derivatives(f, t1, tag, h = 1e-6) {
  for (let k = 1; k < 200; k++) {
    const t = ((k + 0.37) / 200) * t1, s = f(t), dy = (f(t + h).y - f(t - h).y) / (2 * h), dv = (f(t + h).v - f(t - h).v) / (2 * h);
    if (Math.abs(dy - s.v) > 1e-4 * (1 + Math.abs(s.v))) { fail(`${tag}: v ≠ dy/dt at ${t}`); return; }
    if (Math.abs(dv - s.a) > 1e-3 * (1 + Math.abs(s.a))) { fail(`${tag}: a ≠ dv/dt at ${t}`); return; }
  }
}
for (const w0 of [1, PI2, 7.3]) {
  for (const z of [0, 0.05, 0.1, 0.3, 0.9, 1, 1.5, 3]) {
    const d = z * w0, f = D.viscous(1, w0, d), tag = `viscous ζ = ${z}, ω₀ = ${w0}`, t1 = (6 * PI2) / w0;
    const s0 = f(0);
    if (!near(s0.y, 1) || Math.abs(s0.v) > 1e-12) fail(`${tag}: not at rest at y = A`);
    derivatives(f, t1, tag);
    for (let k = 0; k <= 100; k++) { const s = f((k / 100) * t1); if (!near(s.a, -w0 * w0 * s.y - 2 * d * s.v, 1e-9)) fail(`${tag}: the equation`); }
    if (z < 1) {
      const T = PI2 / Math.sqrt(w0 * w0 - d * d);
      for (let k = 1; k <= 4; k++) { const s = f(k * T); if (!near(s.y, Math.exp(-d * k * T), 1e-9) || Math.abs(s.v) > 1e-9) fail(`${tag}: the maximum at ${k} T`); }
      if (z > 0 && !(f(T / 2).y < 0)) fail(`${tag}: does not cross 0`);
    } else {
      for (let k = 0; k <= 400; k++) if (f((k / 400) * t1).y <= 0) { fail(`${tag}: crosses 0`); break; }
    }
  }
  // strong damping returns more slowly than critical damping
  const crit = D.viscous(1, w0, w0), over = D.viscous(1, w0, 3 * w0);
  if (!(over(PI2 / w0).y > crit(PI2 / w0).y)) fail(`ω₀ = ${w0}: strong damping not slower`);
}
for (const r of [0.03, 0.09, 0.2, 0.45, 0.6, 1.2]) {
  const w0 = PI2, f = D.dry(1, w0, r), turns = D.dryTurns(1, r), tag = `dry r = ${r}`, half = 0.5;
  turns.slice(1).forEach((y, k) => {
    const prev = turns[k];
    if (Math.abs(prev) <= r) fail(`${tag}: moved from rest at ${prev}`);
    if (!near(y, 2 * Math.sign(prev) * r - prev, 1e-12)) fail(`${tag}: the turning point ${k + 1}`);
    if (!near(f((k + 1) * half).y, y, 1e-9)) fail(`${tag}: at the turning point ${k + 1}`);
  });
  if (Math.abs(turns[turns.length - 1]) > r + 1e-12) fail(`${tag}: never stops`);
  const stop = (turns.length - 1) * half;
  if (f(stop + 3).v !== 0 || !near(f(stop + 3).y, turns[turns.length - 1])) fail(`${tag}: not at rest after the stop`);
  derivatives((t) => f(t), Math.max(0.1, stop - 0.01), tag);
  // equal steps: the amplitude falls by 4r per period while it moves
  for (let k = 2; k < turns.length; k += 2) if (!near(turns[k - 2] - turns[k], 4 * r, 1e-9)) fail(`${tag}: not 4r per period`);
}

// ---------------------------------------------------------------- the graphs of the formulas
{
  const m = (k) => maxima(D.dCurve(k, 2000));
  const exp = m('exp'), lin = m('lin'), chirp = m('chirp');
  const ratios = exp.slice(1).map((p, i) => p[1] / exp[i][1]);
  if (ratios.length < 3 || Math.max(...ratios) - Math.min(...ratios) > 0.02) fail(`exp: the maxima not by equal factors ${ratios}`);
  const steps = lin.slice(1).map((p, i) => exp[i] && lin[i][1] - p[1]);
  if (steps.length < 3 || Math.max(...steps) - Math.min(...steps) > 0.02) fail(`lin: the maxima not by equal steps ${steps}`);
  const gaps = chirp.slice(1).map((p, i) => p[0] - chirp[i][0]);
  if (gaps.some((g, i) => i && g >= gaps[i - 1])) fail('chirp: the period not shorter');
  const ex = maxima(D.dCurve('exp', 2000)).map((p) => p[0]), gs = ex.slice(1).map((t, i) => t - ex[i]);
  if (gs.some((g) => Math.abs(g - 1) > 0.01)) fail('exp: the period changes');
}

// ---------------------------------------------------------------- find the error
for (const sys of ['water', 'table']) {
  const right = D.sketch(sys, null), mx = maxima(right);
  if (sys === 'water') { const rs = mx.slice(1).map((p, i) => p[1] / mx[i][1]); if (Math.max(...rs) - Math.min(...rs) > 0.01) fail('water: not by equal factors'); }
  for (const flaw of ['shorter', 'longer', 'grows', 'shift', 'kink', sys === 'water' ? 'stops' : 'never']) {
    const s = D.sketch(sys, flaw), tag = `${sys} ${flaw}`, ms = maxima(s);
    if (Plot.alike(s, right, 2.4)) fail(`${tag}: looks like the right graph`);
    const gaps = ms.slice(1).map((p, i) => p[0] - ms[i][0]);
    if (flaw === 'shorter' && !(gaps.length >= 1 && gaps[0] < 0.97 && gaps.every((g, i) => !i || g < gaps[i - 1]))) fail(`${tag}: the period not shorter ${gaps}`);
    if (flaw === 'longer' && !(gaps.length >= 1 && gaps.every((g, i) => !i || g > gaps[i - 1]) && gaps[0] > 1.01)) fail(`${tag}: the period not longer ${gaps}`);
    if (flaw === 'grows' && !ms.some((p, i) => i && p[1] > ms[i - 1][1] + 0.05)) fail(`${tag}: does not grow again`);
    if (flaw === 'shift' && Math.abs(s[s.length - 1][1] - 0.4) > 0.15) fail(`${tag}: not about 0.4`);
    if (flaw === 'kink' && !(s[0][1] < 0.9 && s[1][1] < s[0][1] - 0.01)) fail(`${tag}: starts at the top`);
    if (flaw === 'stops') { const end = s.filter((p) => p[0] > 2.6).map((p) => p[1]); if (Math.max(...end) - Math.min(...end) > 1e-9 || Math.abs(end[0]) < 0.2) fail(`${tag}: no stop away from 0`); }
    if (flaw === 'never' && !s.some((p, i) => p[0] > 4.5 && i && Math.sign(p[1]) !== Math.sign(s[i - 1][1]))) fail(`${tag}: stops`);
  }
  if (sys === 'table') { const end = right.filter((p) => p[0] > 4).map((p) => p[1]); if (Math.max(...end) - Math.min(...end) > 1e-9 || Math.abs(end[0]) < 0.03) fail('table: does not stop a little away from 0'); }
}

// ---------------------------------------------------------------- the exercises and their runs
function verifyRun(ex, w, tag) {
  if (!(w.t1 > 0) || !['s', 'T', ''].includes(w.unit) || !w.panels.length) { fail(`${tag}: t1, unit or panels`); return; }
  const before = w.at(-0.1 * w.t1), s0 = w.at(0);
  if (!near(before.y, s0.y, 1e-9)) fail(`${tag}: y jumps at t = 0`);
  if (w.fn) {
    if (before.v !== 0 || before.a !== 0) fail(`${tag}: not at rest before t = 0`);
    if (Math.abs(s0.v) > 1e-9 * w.amp.v) fail(`${tag}: not let go at rest`);
    derivatives(w.at, w.t1, tag, w.t1 * 1e-7);
  } else {
    const k = ex.p.given, f = D.DK[k].f;
    for (let i = 0; i <= 50; i++) { const t = (i / 50) * w.t1; if (Math.abs(w.at(t).y - Math.max(D.AX.lo - 1, Math.min(D.AX.hi + 1, f(t)))) > 0.02 && Math.abs(f(t)) < 1.5) { fail(`${tag}: off the formula at ${t}`); break; } }
  }
  const sc = Figures.watchScene(w);
  if ((sc.frame.match(/data-pw-switch/g) || []).length !== 1) fail(`${tag}: the scene's switch`);
  for (const t of [-0.1 * w.t1, 0, 0.3 * w.t1, w.t1]) { const p = sc.pose({ ...w.at(t), held: t < 0 }); if (!p || /NaN|undefined/.test(p)) fail(`${tag}: the scene at ${t}`); }
  // the answers: right ones ✓ (numbers on their curve), every wrong choice ✗ somewhere
  const right = (key) => { const f = ex.fields.find((x) => x.key === key); return f ? f.value : null; };
  w.marks(right).forEach((m) => {
    if (m.ok === false) fail(`${tag}: the right ${m.key} marked wrong`);
    if (m.ok === null) { const y = w.units ? OC.inUnit(w.at(m.t)[m.q], w.units[m.q]) : w.at(m.t)[m.q]; if (Math.abs(y - m.y) > 0.01 * Math.abs(y)) fail(`${tag}: ${m.key} off its curve`); }
  });
  ex.fields.filter((f) => f.type === 'choice' && w.marks((k) => (k === f.key ? f.value : null)).length).forEach((f) => {
    f.options.filter((o) => o[0] !== f.value).forEach((o) => { if (!w.marks((k) => (k === f.key ? o[0] : null)).some((m) => m.ok === false)) fail(`${tag}: the wrong ${o[0]} marked right`); });
  });
  ex.fields.filter((f) => f.type === 'num').forEach((f) => {
    const m = w.marks((k) => (k === f.key ? 1.5 * f.value : NaN))[0];
    if (m && Math.abs(OC.inUnit(w.at(m.t)[m.q], w.units[m.q]) - m.y) < 0.05 * Math.abs(m.y)) fail(`${tag}: a wrong ${f.key} on the curve`);
  });
}
const RUNS = { 'damp-match': true, 'damp-back': true, 'damp-error': true, 'decay-read': true, 'decay-regime': null, 'damp-eq': false, 'decay-eq': false, 'decay-energy': false };
let runs = 0;
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const id of Object.keys(RUNS)) {
    for (let seed = 1; seed <= 150; seed++) {
      const ex = Osc.practiceOf(id, seed), tag = `${lang} ${id} ${seed}`, w = ex.watch ? ex.watch() : null;
      if (RUNS[id] === true && !w) fail(`${tag}: no run`);
      if (RUNS[id] === false && ex.watch) fail(`${tag}: a run`);
      if (id === 'decay-read') {
        const f = w.fn;
        if (!near(f(0).y, ex.p.A0) || !near(f(ex.p.n * ex.p.T).y, ex.p.An, 1e-9)) fail(`${tag}: the peaks P and Q`);
      }
      if (id === 'decay-regime' && !!w !== ['crit', 'over', 'fast'].includes(ex.p.ask)) fail(`${tag}: a run for ${ex.p.ask}`);
      if (w) { verifyRun(ex, w, tag); runs++; }
    }
  }
  // the worked examples on damping and their runs
  Lessons.EXAMPLES.forEach((e, i) => {
    if (!/^(damp|decay)-/.test(e.scenario)) return;
    const t = Osc.tutorial(e), last = t.frames[t.frames.length - 1];
    if (!t.watch || !/pw-host/.test(last.figure)) { fail(`example ${i + 1}: no run`); return; }
    const w = t.watch();
    if (w.marks(() => null).length) fail(`example ${i + 1}: marks without answers`);
    verifyRun(Osc.exercise(Osc.byId(e.scenario), e.p), w, `${lang} example ${i + 1}`);
    if (t.frames.length < 6) fail(`example ${i + 1}: ${t.frames.length} frames`);
  });
}
if (Lessons.EXAMPLES.filter((e) => /^(damp|decay)-/.test(e.scenario)).length !== 2) fail('not two worked examples on damping');

if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log(`Damping OK (${runs} runs)`);
