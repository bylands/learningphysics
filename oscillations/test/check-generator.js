// Verifies the Oscillations generator: run with `node oscillations/test/check-generator.js`.
// For many seeds per exercise type and both languages it checks
// - every form of equation against a numerical solution: an SHM (a sine with the period of its
//   formula, fitted to the motion) exactly when the form says so,
// - the answers: the right period option, the mistake, the graph of the given equation (and four
//   graphs that do not look alike), the equation of a graph, and the kinematics worked out again
//   here (v_max = Aω, a_max = Aω², v = ω√(A² − x²), …),
// - one right option per choice, distinct options, an explanation for every wrong one, traps that
//   differ from the answer, four options in every quiz question,
// - the pointer: the right graph is the shadow A·sin(ωt + φ₀), four graphs that do not look alike,
// - the LC circuit: the roles (Q ↔ y, I ↔ v, L ↔ m, 1/C ↔ D), ω = 1/√(LC), T = 2π√(LC), and the
//   factor of the frequency when L or C change,
// - that texts, hints, solutions and figures contain no undefined values (and no ß in German),
// - the tutor's examples (the worksheet's ξ + k²·ξ̈ = 0 has T = 2πk),
// - the check: every objective's kinds give questions with four options, one of them right.
'use strict';

const Lang = require('../lang.js');
require('../core.js'); require('../equations.js'); require('../plot.js'); require('../scenarios.js'); require('../generator.js'); require('../lessons.js');
global.window = globalThis; require('../figkit.js'); require('../figures.js'); require('../check-src.js');
const { OC, Equations: Eq, Scenarios, Osc, Lessons, Plot, CheckSource } = globalThis;

let failures = 0, checked = 0, questions = 0;
const fail = (msg) => { failures++; if (failures < 400) console.log('  FAIL ' + msg); };
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1e-30, Math.abs(b));
const PI2 = 2 * Math.PI;

// ---------------------------------------------------------------- the forms against the numbers
// The motion is an SHM with period T if a least-squares fit y = a·cos(ωt) + b·sin(ωt) + c
// (ω = 2π/T) leaves almost nothing over, and the amplitude is not 0.
function fitsSine(pts, T) {
  const w = PI2 / T, M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], R = [0, 0, 0];
  for (const [t, y] of pts) { const v = [Math.cos(w * t), Math.sin(w * t), 1]; for (let i = 0; i < 3; i++) { R[i] += v[i] * y; for (let j = 0; j < 3; j++) M[i][j] += v[i] * v[j]; } }
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M), s = [0, 1, 2].map((k) => det(M.map((row, i) => row.map((x, j) => (j === k ? R[i] : x)))) / D);
  const amp = Math.hypot(s[0], s[1]), resid = Math.max(...pts.map(([t, y]) => Math.abs(y - s[0] * Math.cos(w * t) - s[1] * Math.sin(w * t) - s[2])));
  return amp > 0.05 && resid < 1e-4 * amp;
}
for (let seed = 1; seed <= 40; seed++) {
  const r = OC.rng(seed);
  for (const f of Eq.FORMS) {
    const P = Eq.numbers(r), T = f.shm ? f.period(P) : PI2 / P.c;
    const pts = Eq.trace(f.motion(P), 3 * T, 300, 1);
    if (fitsSine(pts, T) !== f.shm) fail(`form ${f.id}: ${f.shm ? 'no sine with its period' : 'a sine, but said not to be'} (c = ${P.c.toFixed(3)})`);
    // no SHM has another period either (twice and half as long)
    if (!f.shm && (fitsSine(pts, T * 2) || fitsSine(pts, T / 2))) fail(`form ${f.id}: harmonic after all`);
    if (f.shm && new Set(f.T(Eq.symbols('x', 'k', 'dot')).map((o) => (Array.isArray(o) ? o[0] : o))).size !== 4) fail(`form ${f.id}: periods alike`);
    if (!f.shm && !Eq.MISTAKES[f.mistake]) fail(`form ${f.id}: no mistake`);
  }
}

// ---------------------------------------------------------------- the exercises
const bad = /undefined|NaN|Infinity|\[object|\$\$\$/;
const outside = (s) => s.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\$[^$]*\$/g, '');
const checkText = (id, what, s) => {
  if (typeof s !== 'string' || bad.test(s)) fail(`${id}: ${what}: ${String(s).match(/.{0,40}(undefined|NaN|Infinity|\[object|\$\$\$).{0,40}/)?.[0]}`);
  else if (/\\htmlClass/.test(outside(s))) fail(`${id}: ${what}: \\htmlClass outside a formula`);
  else if (Lang.get() === 'de' && /ß/.test(s)) fail(`${id}: ${what}: ß`);
};
const val = (ex, key) => ex.fields.find((f) => f.key === key);
const si = (f) => f.value * OC.UNITS[f.unit][0];

const LAWS = {
  shm: (p, ex) => {
    const f = Eq.byId(p.eq.form);
    if (val(ex, 'shm').value !== (f.shm ? 'yes' : 'no')) fail(`${ex.scenario}: yes or no`);
    const follow = f.shm ? val(ex, 'T') : val(ex, 'mistake');
    if (!follow || follow.after !== 'shm') fail(`${ex.scenario}: the second part`);
    LAWS[f.shm ? 'period' : 'mistake'](p, ex);
  },
  period: (p, ex) => {
    const f = Eq.byId(p.eq.form), T = val(ex, 'T');
    if (!f.shm) fail(`${ex.scenario}: period of no SHM`);
    const right = T.options.find((o) => o[0] === T.value);
    if (!right || right[1] !== `$T = ${f.T(Eq.sym(p.eq))[0]}$`) fail(`${ex.scenario}: the right period`);
  },
  mistake: (p, ex) => {
    const m = val(ex, 'mistake');
    if (m.value !== Eq.byId(p.eq.form).mistake) fail(`${ex.scenario}: the mistake`);
    // the wrong options are features of this equation, not mistakes it does not make
    if (m.options.some((o) => o[0] !== m.value && Eq.MISTAKES[o[0]])) fail(`${ex.scenario}: another mistake offered for ${p.eq.form}`);
  },
  pick: (p, ex) => {
    const which = Number(val(ex, 'which').value);
    if (p.eqs.filter((e) => Eq.byId(e.form).shm).length !== 1 || !Eq.byId(p.eqs[which].form).shm) fail('pick-shm: not one SHM');
  },
  match: (p, ex) => {
    const g = val(ex, 'graph');
    if (g.value !== p.given || g.options.length !== 4) fail(`${ex.scenario}: graph`);
    const clip = (pts) => pts.map(([t, y]) => [t, Math.max(Scenarios.AXIS.lo, Math.min(Scenarios.AXIS.hi, y))]);
    const curves = g.options.map((o) => clip(Scenarios.curveOf(o[0])));
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (Plot.alike(curves[i], curves[j], Scenarios.AXIS.hi - Scenarios.AXIS.lo)) fail(`${ex.scenario}: graphs alike`);
    // qualitative: no numbers in the equation, none on the axes but the 0
    if (/\d/.test(Scenarios.NKINDS[p.given].tex(p.y).replace(/\^2|\^3| = 0$/g, ''))) fail(`${ex.scenario}: a number in the equation`);
    if (g.options.some((o) => (o[1].match(/class="tick"[^>]*>([^<]*)</g) || []).some((t) => !/>0</.test(t)))) fail(`${ex.scenario}: numbers on the axes`);
  },
  back: (p, ex) => { const e = val(ex, 'eq'); if (e.value !== p.given || e.options.length !== 4 || new Set(e.options.map((o) => o[1])).size !== 4) fail('match-back: equations'); },
  kin: (p, ex) => {
    const w = p.w, A = p.A, has = (k) => ex.fields.some((f) => f.key === k);
    const want = { vmax: { vmax: A * w, amax: A * w * w }, 'back-w': { w, amax: A * w * w }, 'back-A': { w, A } }[ex.scenario];
    for (const [k, x] of Object.entries(want)) if (!has(k) || !close(si(val(ex, k)), x, 1e-9)) fail(`${ex.scenario}: ${k} = ${has(k) ? si(val(ex, k)) : '–'} ≠ ${x}`);
    if (ex.fields.some((f) => /max/.test(f.sym))) fail(`${ex.scenario}: v_max instead of the hat`);
  },
  points: (p, ex) => {
    const pt = val(ex, 'pt'), x = (u) => Math.sin(2 * Math.PI * u), v = (u) => Math.cos(2 * Math.PI * u);
    const test = { vmax: (u) => Math.abs(v(u)) > 0.999, v0: (u) => Math.abs(x(u)) > 0.999, amax: (u) => Math.abs(x(u)) > 0.999, aplus: (u) => x(u) < -1e-6, vminus: (u) => v(u) < -1e-6 }[p.ask];
    const right = p.us.map((u, i) => (test(u) ? 'PQRS'[i] : null)).filter(Boolean);
    if (right.length !== 1 || right[0] !== pt.value) fail(`points: ${p.ask} ${right}`);
  },
  circle: (p, ex) => {
    const g = val(ex, 'graph'), phi = (p.k * Math.PI) / 4;
    if (g.value !== 'right' || g.options.length !== 4 || !g.options.some((o) => o[0] === 'right')) fail('circle: graph');
    // the right graph: y(0) = A·sin φ₀, rising where cos φ₀ > 0
    const right = (u) => Scenarios.CIRCLE.right(u, phi);
    if (!close(right(0), Math.sin(phi) || 1e-30, 1e-9) && Math.abs(right(0) - Math.sin(phi)) > 1e-12) fail(`circle: start at ${p.k}`);
    if (Math.abs(Math.cos(phi)) > 1e-9 && Math.sign(right(0.01) - right(0)) !== Math.sign(Math.cos(phi))) fail(`circle: direction at ${p.k}`);
    const pts = (k) => Array.from({ length: 121 }, (z, j) => [j / 60, Scenarios.CIRCLE[k](j / 60, phi)]);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (Plot.alike(pts(g.options[i][0]), pts(g.options[j][0]), 2.8)) fail(`circle: graphs alike at ${p.k}`);
  },
  lc: (p, ex) => {
    const f = val(ex, 'ans'), right = f.options.find((o) => o[0] === 'right');
    const want = { y: /charge|Ladung/, v: /current|Strom/, m: /\$L\$/, D: /1\/C/, w: /\\omega = \\frac\{1\}\{\\sqrt\{L\\,C\}\}/, T: /T = 2\\pi\\sqrt\{L\\,C\}/, whenQ: /^(zero|null)$/, whenI: /^(zero|null)$/ }[p.ask];
    if (f.options.length !== 4 || !right || !want.test(right[1])) fail(`lc-eq ${p.ask}: ${right && right[1]}`);
  },
  lcscale: (p, ex) => {
    const f = val(ex, 'fac'), LC = p.what === 'both' ? p.k * p.k : p.k, x = 1 / Math.sqrt(LC);
    const shown = x >= 1 ? `$\\times ${OC.sig(x, 3)}$` : `$\\times \\tfrac{1}{${OC.sig(1 / x, 3)}}$`;
    if (f.options.find((o) => o[0] === 'right')[1] !== shown || new Set(f.options.map((o) => o[1])).size !== 4) fail(`lc-scale: ${p.what} ×${p.k}`);
  },
};

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const scn of Osc.SCENARIOS) {
    const law = LAWS[scn.kind];
    if (!law) fail(`no law for ${scn.id}`);
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      const ex = Osc.practiceOf(scn.id, seed), id = `${lang}/${scn.id}/${seed}`;
      checked++;
      seen.add(JSON.stringify(ex.p));
      if (law) law(ex.p, ex);
      ex.fields.forEach((f) => {
        if (f.type === 'num') {
          if (!Number.isFinite(f.value) || (!f.signed && f.value <= 0)) fail(`${id}: ${f.key} = ${f.value}`);
          f.traps.forEach((t) => { if (Math.abs(t.value - f.value) <= 0.015 * Math.abs(f.value)) fail(`${id}: trap ${t.flag} equals the answer`); });
        } else {
          if (f.options.filter((o) => o[0] === f.value).length !== 1) fail(`${id}: ${f.key} has not one right option`);
          if (new Set(f.options.map((o) => o[1])).size !== f.options.length) fail(`${id}: ${f.key} options alike`);
          if (f.options.some((o) => o[0] !== f.value && !o[2])) fail(`${id}: ${f.key}: a wrong option without why`);
          if (f.after && !ex.fields.some((g) => g.key === f.after)) fail(`${id}: ${f.key} after nothing`);
        }
      });
      [ex.title, ex.text, ex.results, ...ex.hints, ...ex.solution, ex.figure(), ex.solutionFigure(), ...ex.fields.flatMap((f) => (f.options || []).map((o) => o[1] + o[2] + (o[4] || '')))].forEach((s, i) => checkText(id, `text ${i}`, s));
      ex.steps.forEach((s, i) => checkText(id, `frame ${i}`, ex.figure({ show: new Set(s.show || []) })));
      if (seed <= 80) {
        const qz = Osc.quiz(ex, seed);
        if (qz.options.length !== 4 || qz.options.filter((o) => o.correct).length !== 1 || new Set(qz.options.map((o) => o.html)).size !== 4) fail(`${id}: quiz with ${qz.options.length} options`);
        if (qz.options.some((o) => !o.correct && o.why === undefined)) fail(`${id}: quiz option without why`);
      }
    }
    if (seen.size < 8) fail(`${scn.id}: only ${seen.size} different exercises`);
  }

  // the tutor's examples, and the worksheet's ξ + k²·ξ̈ = 0: an SHM with T = 2πk
  Lessons.EXAMPLES.forEach((e) => Osc.tutorial(e).frames.forEach((f, i) => { checkText(`tutor ${e.scenario}`, `frame ${i}`, f.text); checkText(`tutor ${e.scenario}`, `figure ${i}`, f.figure); }));
  const ws = Lessons.EXAMPLES.find((e) => e.scenario === 'shm-2'), w1 = Osc.exercise(Osc.byId('shm-2'), ws.p);
  if (Osc.tutorial(ws).frames.length < 9) fail('tutor: the three equations of the worksheet');
  const T1 = val(w1, 'T');
  if (val(w1, 'shm').value !== 'yes' || !T1 || T1.options.find((o) => o[0] === T1.value)[1] !== '$T = 2\\pi\\cdot k$') fail('worksheet: ξ + k²·ξ̈ = 0 has T = 2πk');

  // the check: each objective's kinds give questions with four options, one right
  CheckSource.objectives.forEach((o) => {
    if (!o.kinds.length || !o.name() || o.tutor >= Lessons.EXAMPLES.length || o.topic >= Lessons.EXAMPLES.length) fail(`objective ${o.id}: kinds, name, tutor or topic`);
    o.kinds.forEach((kind) => {
      for (let seed = 1; seed <= 120; seed++) {
        const q = CheckSource.question(kind, 7919 * seed), id = `check ${lang} ${o.id} ${kind}-${7919 * seed}`;
        questions++;
        if (q.options.length !== 4 || q.options.filter((x) => x.correct).length !== 1) fail(`${id}: ${q.options.length} options, ${q.options.filter((x) => x.correct).length} right`);
        if (new Set(q.options.map((x) => x.html)).size !== 4) fail(`${id}: two options the same`);
        q.options.forEach((x) => { if (!x.correct && x.flag && !CheckSource.concept[x.flag]) fail(`${id}: flag ${x.flag} names no idea`); });
        [q.title, q.text, q.figure, q.ask, q.explain(), ...q.options.map((x) => x.html + (x.why || ''))].forEach((t, k) => checkText(id, `part ${k}`, t));
      }
    });
  });
  Object.values(CheckSource.concept).forEach((c) => { if (!CheckSource.concepts()[c]) fail(`concept ${c} has no name`); });
}

console.log(`${questions} check questions.`);
console.log(failures ? `${failures} failures in ${checked} exercises` : `All checks passed (${checked} exercises).`);
process.exit(failures ? 1 : 0);
