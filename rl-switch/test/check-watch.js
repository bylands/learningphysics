// Verifies the currents shown while watching ("predict, then watch"): run with
// `node rl-switch/test/check-watch.js`. For many seeds per level it checks that the curves of all
// currents (through R1 and every branch)
// - before t = 0 have the values before switching (s0),
// - start at t = 0 at the values right after switching (s1, the answers of the exercise),
// - end at T (six of the longest time constants) at the values long after switching (s2), within
//   e^−6 of the jump,
// - keep the junction rule at every time (the current through R1 is the sum of the branch
//   currents, with the main line closed; zero with it open),
// - with a single inductor, follow I(t) = I∞ + (I(0⁺) − I∞)·e^(−t/τ) with τ = L/R, R the resistance
//   the inductor sees (worked out here on its own: its branch's resistor plus the rest of the
//   circuit with the battery replaced by a wire),
// - and that the watch figures (before, after) render with the switch to flip, in the same frame.
'use strict';

const S = require('../generator.js');

const SAMPLES = 150;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const f = S.fval;
const all = (a) => [a.IR1, ...a.Ib];

// The resistance an inductor branch j sees after switching: R_j plus, in series, the other
// branches that can carry current (resistor branches that are closed) in parallel with the main
// line (R1, unless bridged; a wire if R1 is absent), the battery being a wire.
function tauOf(c, st, j) {
  const closed = st.then;
  const main = !(c.sw.at === 'main' && !closed), bridged = c.sw.at === 'bridge' && closed;
  const r = c.r1 && !bridged ? f(c.r1) : 0;
  let G = 0, wire = false;
  c.branches.forEach((b, k) => {
    if (k === j || b.L) return;
    if (c.sw.at === 'branch' && c.sw.j === k && !closed) return;
    G += 1 / f(b.R);
  });
  if (main) { if (r === 0) wire = true; else G += 1 / r; }
  const rest = wire ? 0 : 1 / G;
  return c.branches[j].H / ((c.branches[j].R ? f(c.branches[j].R) : 0) + rest);
}

for (const level of ['easy', 'medium', 'hard']) {
  const t0 = Date.now();
  let single = 0, two = 0;
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const tag = `${level} ${seed}`, e = S.generate(level, seed), c = e.circuit, st = e.st, run = e.curves();
    const s0 = all({ IR1: f(st.s0.IR1), Ib: st.s0.Ib.map(f) }), s1 = all({ IR1: f(st.s1.IR1), Ib: st.s1.Ib.map(f) }), s2 = all({ IR1: f(st.s2.IR1), Ib: st.s2.Ib.map(f) });
    const jump = Math.max(1e-6, ...s1.map((x, k) => Math.abs(x - s2[k])));
    if (!(run.T > 0) || run.taus.some((t) => !(t > 0))) { fail(`${tag}: time constants ${run.taus}`); continue; }
    all(run.at(-run.T / 10)).forEach((x, k) => { if (Math.abs(x - s0[k]) > 1e-12) fail(`${tag}: before t = 0, current ${k} is ${x}, not ${s0[k]}`); });
    all(run.at(0)).forEach((x, k) => { if (Math.abs(x - s1[k]) > 1e-9) fail(`${tag}: at t = 0+, current ${k} is ${x}, not ${s1[k]}`); });
    all(run.at(run.T)).forEach((x, k) => { if (Math.abs(x - s2[k]) > 0.0026 * jump + 1e-9) fail(`${tag}: at the end, current ${k} is ${x}, not ${s2[k]}`); });
    // the answers of the exercise are the currents at t = 0+ (mA)
    e.fields.filter((fl) => fl.unit === 'mA').forEach((fl) => {
      const a = run.at(0), v = 1000 * (fl.key === 'IR1' ? a.IR1 : a.Ib[Number(fl.key.slice(1))]);
      if (Math.abs(v - fl.value) > 1e-6) fail(`${tag}: ${fl.key} starts at ${v} mA, the answer is ${fl.value}`);
    });
    const main = !(c.sw.at === 'main' && !st.then);
    for (let k = 0; k <= 20; k++) {
      const a = run.at((k / 20) * run.T), sum = a.Ib.reduce((x, y) => x + y, 0);
      if (Math.abs((main ? sum : 0) - a.IR1) > 1e-9 && c.r1 && !(c.sw.at === 'bridge' && st.then)) fail(`${tag}: junction rule at t = ${k / 20} T`);
    }
    const Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L);
    if (Ls.length === 1) {
      single++;
      const tau = tauOf(c, st, Ls[0]);
      if (Math.abs(tau - run.taus[0]) > 1e-9 * tau) fail(`${tag}: τ = ${run.taus[0]}, expected ${tau}`);
      for (const t of [0.3 * tau, tau, 2.5 * tau]) {
        all(run.at(t)).forEach((x, k) => {
          const want = s2[k] + (s1[k] - s2[k]) * Math.exp(-t / tau);
          if (Math.abs(x - want) > 1e-6 * jump + 1e-12) fail(`${tag}: current ${k} at t = ${(t / tau).toFixed(1)} τ is ${x}, expected ${want}`);
        });
      }
    } else two++;
    const figs = e.watch();
    const box = (s) => s.match(/viewBox="([^"]+)"/)[1];
    if (figs.length !== 2 || box(figs[0]) !== box(figs[1])) fail(`${tag}: watch figures not in the same frame`);
    figs.forEach((s) => { if ((s.match(/data-pw-switch/g) || []).length !== 1 || /NaN|undefined/.test(s)) fail(`${tag}: watch figure`); });
  }
  console.log(`${level}: ${SAMPLES} seeds (${single} with one inductor, ${two} with two), ${Date.now() - t0} ms`);
}

// the worked examples
const { EXAMPLES } = require('../lessons.js');
EXAMPLES.forEach((def, i) => {
  const ex = S.tutorial(def.circuit).ex, run = ex.curves(), st = ex.st;
  if (Math.abs(run.at(0).IR1 - f(st.s1.IR1)) > 1e-9 || run.at(run.T).Ib.some((x, j) => Math.abs(x - f(st.s2.Ib[j])) > 0.003 * Math.max(1e-3, Math.abs(f(st.s1.Ib[j]) - f(st.s2.Ib[j]))))) fail(`example ${i + 1}`);
});

if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log('Watching OK');
