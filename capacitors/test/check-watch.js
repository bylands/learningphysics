// Verifies the run shown while watching ("predict, then watch", rcWatch in generator.js): run with
// `node capacitors/test/check-watch.js`. For many seeds of every exercise type with a run, in both
// languages, and for the worked examples, it checks that
// - before t = 0 (the switch open) the values are those before switching: no current, U_R = 0,
//   U_C = 0 while charging and U₀ while discharging;
// - at t = 0⁺ U_C has not jumped, U_R = U₀ and I = I₀ = U₀/R (the current jumps);
// - at the end (t1 = 5τ, or longer) everything is within e^−5 of its final value (charging:
//   U_C = U₀, discharging: U_C = 0; U_R = I = 0);
// - the curves are the exponentials with the exercise's τ: U_C = U₀(1 − e^(−t/τ)) or U₀·e^(−t/τ),
//   I = I₀·e^(−t/τ) (τ = R·C as given: read from the graph, the half-life over ln 2, or the
//   factor of R and C changed);
// - Kirchhoff's voltage rule holds along the curve: charging U₀ = U_R + U_C, discharging (no
//   battery) U_R = U_C; and Ohm's law I = U_R/R;
// - the answers of the exercise lie on the curve (loop: U_R, I, U_C at the moment asked; the
//   half-life, two half-lives, τ), so that the right answers are listed with ✓, and wrong
//   choices of a graph are marked ✗ somewhere;
// - the moments marked (keys: the jump, the time constant, the half-life, the moment asked) lie
//   on their curves, inside the run, with a label and words;
// - the circuit to watch is drawn before and after in the same frame, with one switch to flip.
'use strict';

const Lang = require('../lang.js');
const G = require('../generator.js');
const Lessons = require('../lessons.js');

const SAMPLES = 150;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const E = Math.exp;

function verifyRun(w, tag) {
  const { U0, I0, tau, charge, T } = w;
  if (!(tau > 0) || !(T >= 5 * tau - 1e-12) || !(U0 > 0)) { fail(`${tag}: τ = ${tau}, T = ${T}`); return; }
  const before = w.at(-0.1 * T);
  if (before.UC !== (charge ? 0 : U0) || before.UR !== 0 || (I0 != null && before.I !== 0)) fail(`${tag}: before t = 0 ${JSON.stringify(before)}`);
  const a0 = w.at(0);
  if (!near(a0.UC, charge ? 0 : U0) || !near(a0.UR, U0) || (I0 != null && !near(a0.I, I0))) fail(`${tag}: at t = 0+ ${JSON.stringify(a0)}`);
  const end = w.at(T), lim = E(-5) * 1.0000001;
  if (Math.abs(end.UC - (charge ? U0 : 0)) > lim * U0 || end.UR > lim * U0 || (I0 != null && end.I > lim * I0)) fail(`${tag}: at the end ${JSON.stringify(end)}`);
  for (let k = 0; k <= 40; k++) {
    const t = (k / 40) * T, a = w.at(t), e = E(-t / tau);
    if (!near(a.UC, charge ? U0 * (1 - e) : U0 * e)) fail(`${tag}: U_C at t = ${t} is ${a.UC}`);
    if (I0 != null && !near(a.I, I0 * e)) fail(`${tag}: I at t = ${t} is ${a.I}`);
    if (charge ? !near(a.UR + a.UC, U0) : !near(a.UR, a.UC)) fail(`${tag}: loop rule at t = ${t}`);
    if (I0 != null && !near(a.UR / U0, a.I / I0)) fail(`${tag}: Ohm's law at t = ${t}`);
    if (!(a.UC >= -1e-12 && a.UR >= -1e-12)) fail(`${tag}: negative voltage at t = ${t}`);
  }
  if (w.ghostAt) {
    const g = w.ghostAt;
    if (g(-1).UC !== 0 || !near(g(0).I, w.ghost.I0) || !near(g(w.ghost.tau).UC, 1 - E(-1))) fail(`${tag}: the first charging`);
  }
  const figs = w.figures();
  const box = (s) => s.match(/viewBox="([^"]+)"/)[1];
  if (figs.length !== 2 || box(figs[0]) !== box(figs[1])) fail(`${tag}: watch figures not in the same frame`);
  figs.forEach((s) => { if ((s.match(/data-pw-switch/g) || []).length !== 1 || /NaN|undefined/.test(s)) fail(`${tag}: watch figure`); });
}

// the key moments: on their curves, inside the run, named
function verifyKeys(w, tag) {
  const keys = w.keys();
  if (!keys.length) fail(`${tag}: no key moments`);
  for (const k of keys) {
    if (!(k.t >= 0 && k.t <= w.T) || typeof k.say !== 'string' || /undefined|NaN/.test(k.say) || !k.pts.length) fail(`${tag}: key ${JSON.stringify(k)}`);
    for (const m of k.pts) {
      if (!/^(UC|UR|I)$/.test(m.q) || !near(m.y, w.at(k.t)[m.q]) || typeof m.label !== 'string' || /undefined|NaN/.test(m.label)) fail(`${tag}: key point ${JSON.stringify(m)}`);
    }
  }
  return keys;
}

// the right answers, entered: every mark on the curve (choices ok, numbers at the curve's value)
function verifyMarks(ex, w, tag) {
  const right = (key) => { const f = ex.fields.find((x) => x.key === key); return f ? (f.type === 'num' ? f.value : f.value) : null; };
  const marks = w.marks(right);
  if (!marks.length) fail(`${tag}: no marks`);
  for (const m of marks) {
    if (!/^(UC|UR|I)$/.test(m.q) || typeof m.say !== 'string' || /undefined|NaN/.test(m.say)) fail(`${tag}: mark ${JSON.stringify(m)}`);
    if (m.ok === false) fail(`${tag}: the right answer ${m.key} marked wrong`);
    if (m.ok === null) {
      const f = ex.fields.find((x) => x.key === m.key), y = w.at(m.t)[m.q];
      // a number lies on the curve within the tolerance of its field (values read from the
      // exercise's graph are rounded: 63 % and 37 %)
      if (!f || f.type !== 'num' || Math.abs(y - m.y) > Math.max(f.tol, 0.01) * Math.max(Math.abs(y), 0.05 * w.U0)) fail(`${tag}: ${m.key} at t = ${m.t}: ${m.y}, the curve ${y}`);
    }
  }
  // a wrong graph chosen: marked wrong somewhere
  const g = ex.fields.find((f) => f.key === 'graph');
  if (g) {
    g.options.filter((o) => o.v !== g.value).forEach((o) => {
      if (!w.marks((k) => (k === 'graph' ? o.v : null)).some((m) => m.ok === false)) fail(`${tag}: the wrong graph ${o.v} marked right`);
    });
  }
}

const tauOf = (ex) => {
  const p = ex.p;
  switch (ex.type) {
    case 'read-half': return p.th / Math.LN2;
    case 'read-tau': return p.tau;
    case 'predict': case 'predict-graph': return { R2: 2, Rh: 0.5, C2: 2, Ch: 0.5, par: 2, ser: 0.5, RC: 4, Rc: 1 }[p.ch]; // the factor kR·kC
    default: return 1; // τ not given: times in units of τ
  }
};
const I0Of = (ex) => {
  const p = ex.p;
  if (ex.type === 'loop' || ex.type === 'loop-d') return p.U0 / p.R;
  if (ex.type === 'read-half' || ex.type === 'read-tau') return null;
  if (ex.type === 'predict' || ex.type === 'predict-graph') return { R2: 0.5, Rh: 2, RC: 0.5, Rc: 0.5 }[p.ch] || 1;
  return 1;
};

const WATCHED = ['curve-u-d', 'curve-i-d', 'curve-r-d', 'loop-d', 'curve-u', 'curve-i', 'curve-r', 'loop', 'read-half', 'read-tau', 'predict', 'predict-graph'];
for (const lang of ['en', 'de']) {
  Lang.set(lang);
  for (const type of Object.keys(G.TYPES)) {
    let n = 0;
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const ex = G.practiceOf(type, seed), tag = `${lang} ${type} ${seed}`;
      if (!ex.watch) { if (WATCHED.includes(type)) fail(`${tag}: no run to watch`); continue; }
      if (!WATCHED.includes(type)) fail(`${tag}: a run to watch`);
      const w = ex.watch();
      n++;
      if (!near(w.tau, tauOf(ex))) fail(`${tag}: τ = ${w.tau}, expected ${tauOf(ex)}`);
      const I0 = I0Of(ex);
      if (I0 === null ? w.I0 !== null : !near(w.I0, I0)) fail(`${tag}: I0 = ${w.I0}, expected ${I0}`);
      if (/^(curve|loop|read)/.test(type) && w.charge !== !!ex.p.charge && !(type.startsWith('loop') && w.charge === (type === 'loop'))) fail(`${tag}: charging or discharging`);
      verifyRun(w, tag);
      verifyMarks(ex, w, tag);
      const keys = verifyKeys(w, tag);
      // the half-life at ΔV₀/2, the time constant at 63 % or 37 %
      if (type === 'read-half' && !near(keys[0].pts[0].y, ex.p.U0 / 2, 1e-6)) fail(`${tag}: the half-life not at U0/2`);
      if (type === 'read-tau' && !near(keys[0].pts[0].y, ex.p.U0 * (ex.p.charge ? 1 - E(-1) : E(-1)), 1e-6)) fail(`${tag}: τ not at 63 % or 37 %`);
      // the answers of a loop exercise are the values at the moment asked
      if (type.startsWith('loop')) {
        const m = w.marks((k) => ex.fields.find((f) => f.key === k).value)[0], a = w.at(m.t);
        ex.fields.forEach((f) => { const q = { UR: 'UR', I: 'I', UC: 'UC' }[f.key]; if (!near(a[q], f.value, 1e-6)) fail(`${tag}: ${f.key} = ${f.value}, the curve ${a[q]}`); });
        if (ex.p.moment === 'start' && m.t !== 0) fail(`${tag}: the start not at t = 0`);
      }
    }
    if (n) console.log(`${lang} ${type}: ${n} runs`);
  }
  // the worked examples
  Lessons.EXAMPLES.forEach((e, i) => {
    if (!e.watch) return;
    const w = G.rcWatch(e.watch());
    verifyRun(w, `${lang} example ${i + 1}`);
    verifyKeys(w, `${lang} example ${i + 1}`);
    if (w.marks(() => null).length) fail(`example ${i + 1}: marks without answers`);
  });
}
if (Lessons.EXAMPLES.filter((e) => e.watch).length !== 3) fail('not three worked examples to watch');

if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log('Watching OK');
