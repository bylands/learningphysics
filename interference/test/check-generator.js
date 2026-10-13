// Verifies the Interference and Diffraction generator: run with `node interference/test/check-generator.js`.
// For many seeds per exercise type and both languages it checks
// - the answers, worked out again here from the parameters (Δs in wavelengths, y = k·λ·L/d,
//   d = 1/n, sin α = k·n·λ ≤ 1, w = 2·λ·L/b, θ_min ∝ λ/D, how the pattern scales),
// - that the numbers give round results (mental arithmetic) and small angles where y ≈ L·sin α,
// - one right option per choice, distinct options, an explanation for every wrong one, traps that
//   differ from the answer, four options in every question of the check,
// - that texts, hints, solutions and figures contain no undefined values (and no ß in German),
// - that every type has enough different exercises,
// - the tutor's examples and topics, and the check's objectives and their questions.
'use strict';

const Lang = require('../lang.js');
global.window = globalThis;
for (const f of ['core', 'figkit', 'figures', 'scenarios', 'generator', 'lessons', 'check-src']) require(`../${f}.js`);
const { IW, Interf, Scenarios, Lessons, CheckSource, Figures } = globalThis;
const Check = require('../check.js');

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 400) console.log('  FAIL ' + msg); };
const close = (a, b, tol = 2e-3) => Math.abs(a - b) <= tol * Math.max(1e-300, Math.abs(b));
// a value with at most n significant digits
const round = (x, n = 3) => close(x, Number(x.toPrecision(n)), 1e-9);

// how each quantity enters the pattern (or θ_min): the power of the factor (0: not at all)
const POWER = {
  ds: { lam: 1, L: 1, d: -1, b: 0 }, ss: { lam: 1, L: 1, b1: -1 }, gr: { lam: 1, L: 1, n: 1, N: 0 }, res: { lam: 1, D: -1 }, radio: { lamr: 1, Ddish: -1 }, eye: { Dp: -1 }, cam: { Da: -1 },
};
const fkey = (r) => (r >= 1 ? String(Math.round(r)) : `1/${Math.round(1 / r)}`);

// The answers of an exercise type, from its parameters p.
const EXPECT = {
  gap: (p) => ({ ans: p.a <= 1 ? 'arcs' : 'beam' }),
  path: (p) => ({ ans: String(p.m), ds: p.m * p.lam }),
  'ds-pos': (p) => ({ y: (p.k * p.lam * p.L) / p.d }),
  'ds-lam': (p) => ({ lam: p.lam }),
  grating: (p) => ({ d: 1e-3 / p.n, y: (p.k * p.lam * p.L * p.n) / 1e-3 }),
  'grating-max': (p) => { const s = p.n * 1e3 * p.lam; let k = 0; while ((k + 1) * s <= 1) k++; return { s, kmax: String(k) }; },
  change: (p) => ({ ans: fkey(p.k ** POWER[p.s][p.v]) }),
  'res-change': (p) => ({ ans: fkey(p.k ** POWER[p.s][p.v]) }),
  single: (p) => (p.hair ? { w: (2 * p.lam * p.L) / p.b, b: p.b } : { w: (2 * p.lam * p.L) / p.b }),
  // two lamps seen as two from x = s/θ; craters on the Moon (3.8·10⁸ m) at least s = θ·x apart
  'res-far': (p) => (p.k === 'dist' ? { x: p.s / p.th } : { s: p.th * 3.8e8 }),
  'res-scale': (p) => {
    const R = Scenarios.RES, th = (lam, D) => (1.22 * lam) / D;
    // the angles given are those of θ = 1.22·λ/D, rounded (the eye at 550 nm)
    if (p.k === 'eye') { if (!close(R[0].th1, th(550e-9, R[0].D1), 0.04)) fail('eye: θ₁ does not fit'); return { th: R[0].th1 * (R[0].D1 / p.D2) }; }
    if (p.k === 'colour') { if (!close(R[1].th1, th(R[1].l1, R[1].D), 0.01)) fail('colour: θ₁ does not fit'); return { th: R[1].th1 * (p.l2 / R[1].l1) }; }
    return { D: (p.D1 * p.l2) / R[2].l1 };
  },
};

const bad = /undefined|NaN|Infinity|\[object|\$\$\$/;
function texts(ex) {
  return [ex.title, ex.text, ...ex.hints, ...ex.solution, ex.results, ex.figure({ task: true }) || '', ex.solutionFigure() || '',
    ...ex.steps.map((s) => ex.figure({ show: new Set(s.show || []) }) || ''),
    ...ex.fields.flatMap((f) => [f.what, f.ask || '', ...(f.options || []).flatMap((o) => [o[1], o[2] || '', o[4] || '']), ...(f.traps || []).flatMap((t) => [t.why, t.nudge || ''])])].join('\n');
}

function checkFields(ex, where) {
  for (const f of ex.fields) {
    if (f.type === 'num') {
      if (!Number.isFinite(f.value) || f.value <= 0) fail(`${where}: ${f.key} = ${f.value}`);
      if (!(f.unit in IW.UNITS)) fail(`${where}: unknown unit ${f.unit}`);
      if (!round(f.value)) fail(`${where}: ${f.key} = ${f.value} is not round`);
      for (const t of f.traps || []) {
        if (close(t.value, f.value, 0.015)) fail(`${where}: trap ${t.flag} equals the answer`);
        if (!t.why) fail(`${where}: trap ${t.flag} without explanation`);
      }
    } else {
      const keys = f.options.map((o) => o[0]);
      if (new Set(keys).size !== keys.length) fail(`${where}: options not distinct`);
      if (new Set(f.options.map((o) => o[1])).size !== keys.length) fail(`${where}: option texts not distinct`);
      if (keys.filter((k) => k === f.value).length !== 1) fail(`${where}: ${keys.filter((k) => k === f.value).length} right options`);
      for (const o of f.options) if (o[0] !== f.value && !o[2]) fail(`${where}: wrong option ${o[0]} without explanation`);
    }
  }
}

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const scn of Interf.SCENARIOS) {
    const seen = new Set();
    for (let seed = 1; seed <= 150; seed++) {
      const where = `${lang} ${scn.id} seed ${seed}`;
      let ex;
      try { ex = Interf.practiceOf(scn.id, seed); } catch (e) { fail(`${where}: ${e.message}`); continue; }
      checked++;
      seen.add(JSON.stringify(ex.p));
      checkFields(ex, where);
      const all = texts(ex);
      if (bad.test(all)) fail(`${where}: ${all.match(bad)[0]} in the texts`);
      if (lang === 'de' && /ß/.test(all)) fail(`${where}: ß`);
      // the answers again
      const want = EXPECT[scn.id] && EXPECT[scn.id](ex.p, ex.v);
      if (!want && !scn.id.startsWith('concept')) fail(`${where}: no expected answer`);
      if (want) {
        for (const [k, x] of Object.entries(want)) {
          if (typeof x === 'string') { if (ex.v[k] !== x) fail(`${where}: ${k} = ${ex.v[k]}, expected ${x}`); } else if (!close(ex.v[k], x)) fail(`${where}: ${k} = ${ex.v[k]}, expected ${x}`);
        }
      }
      for (const f of ex.fields) if (f.type === 'num' && !close(f.value, IW.inUnit(ex.v[f.key], f.unit), 1e-9)) fail(`${where}: ${f.key} not in its unit`);
      // small angles where y = L·sin α is used: sin α at most 0.1
      if (['ds-pos', 'ds-lam', 'grating', 'single'].includes(scn.id)) {
        const s = scn.id === 'single' ? ex.p.lam / ex.p.b : (ex.p.k * ex.p.lam) / (scn.id === 'grating' ? 1e-3 / ex.p.n : ex.p.d);
        if (s > 0.1) fail(`${where}: sin α = ${s} is not small`);
      }
      // the grating's highest order is not at 90°
      if (scn.id === 'grating-max' && Math.abs(1 / ex.v.s - Math.round(1 / ex.v.s)) < 0.02) fail(`${where}: an order at 90°`);
      // the question of the check
      const qz = Interf.quiz(ex, seed);
      if (qz.options.length !== 4) fail(`${where}: quiz with ${qz.options.length} options`);
      if (qz.options.filter((o) => o.correct).length !== 1) fail(`${where}: quiz without one right option`);
      if (new Set(qz.options.map((o) => o.html)).size !== 4) fail(`${where}: quiz options alike`);
      if (scn.quizChoice && qz.field.type !== 'choice') fail(`${where}: the check asks a number`);
    }
    if (seen.size < 8) fail(`${lang} ${scn.id}: only ${seen.size} different exercises`);
  }
  // the first stage of "Resolving power" has at least 12 exercises that read differently
  {
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed++) { const ex = Interf.practiceOf('res-change', seed); seen.add(ex.text + '|' + ex.fields.map((f) => (f.options || []).map((o) => o[1]).join(',')).join(';')); }
    if (seen.size < 12) fail(`${lang} res-change: only ${seen.size} texts`);
  }

  // the tutor's examples and the topics
  Lessons.EXAMPLES.forEach((e, i) => {
    const t = Interf.tutorial(e), all = [e.name(), e.idea(), ...t.frames.map((f) => f.text + (f.figure || ''))].join('\n');
    if (t.frames.length < 3) fail(`${lang} example ${i}: only ${t.frames.length} frames`);
    if (bad.test(all)) fail(`${lang} example ${i}: ${all.match(bad)[0]}`);
    if (lang === 'de' && /ß/.test(all)) fail(`${lang} example ${i}: ß`);
  });
  const types = new Set();
  Lessons.TOPICS.forEach((tp, i) => tp.stages.forEach((s, k) => {
    s.types.forEach((id) => { types.add(id); if (!Interf.byId(id)) fail(`topic ${i}: unknown type ${id}`); });
    const ex = tp.example(k);
    if (!Lessons.EXAMPLES[ex]) fail(`topic ${i} stage ${k}: no example ${ex}`);
  }));
  for (const s of Interf.SCENARIOS) if (!types.has(s.id)) fail(`type ${s.id} is in no topic`);

  // the check: every objective's kinds give questions with four options, one of them right, a
  // known misconception behind every flag, and links to an example and a topic that exist
  const names = CheckSource.concepts();
  for (const [flag, idea] of Object.entries(CheckSource.concept)) if (!(idea in names)) fail(`flag ${flag}: no idea ${idea}`);
  CheckSource.objectives.forEach((o, i) => {
    if (!o.name() || bad.test(o.name())) fail(`${lang} objective ${i}: name`);
    if (!Lessons.EXAMPLES[o.tutor] || !Lessons.TOPICS[o.topic]) fail(`${lang} objective ${o.id}: tutor ${o.tutor}, topic ${o.topic}`);
    for (const kind of o.kinds) {
      if (!Interf.byId(kind)) { fail(`objective ${o.id}: unknown kind ${kind}`); continue; }
      if (!Lessons.TOPICS[o.topic].stages.some((s) => s.types.includes(kind))) fail(`objective ${o.id}: ${kind} not in topic ${o.topic}`);
      for (let seed = 1; seed <= 80; seed++) {
        const where = `${lang} check ${o.id} ${kind} seed ${seed}`, q = CheckSource.question(kind, seed);
        checked++;
        if (q.options.length !== 4) fail(`${where}: ${q.options.length} options`);
        if (q.options.filter((x) => x.correct).length !== 1) fail(`${where}: not one right option`);
        if (new Set(q.options.map((x) => x.html)).size !== 4) fail(`${where}: options alike`);
        for (const x of q.options) if (x.flag && !(CheckSource.concept[x.flag] in names)) fail(`${where}: flag ${x.flag} without an idea`);
        const all = [q.title, q.text, q.ask, q.figure, ...q.options.map((x) => x.html + (x.why || '')), q.explain()].join('\n');
        if (bad.test(all)) fail(`${where}: ${all.match(bad)[0]}`);
      }
    }
  });
  const plan = Check.plan(CheckSource.objectives, Math.random);
  if (plan.length !== CheckSource.objectives.length * Check.perObjective(CheckSource.objectives.length)) fail(`check of ${plan.length} questions`);
}

// the figures: the pattern of a double slit is brightest at the maxima, dark at the minima
{
  const c = { lam: 600e-9, L: 2, d: 0.3e-3, N: 2, b: 0 }, y1 = (c.lam * c.L) / c.d;
  if (!close(Figures.intensity(c, y1), 1, 1e-6) || Figures.intensity(c, y1 / 2) > 1e-9) fail('double-slit intensity');
  const s = { lam: 600e-9, L: 2, b: 0.1e-3, N: 1 };
  if (Figures.intensity(s, (s.lam * s.L) / s.b) > 1e-9) fail('single-slit minimum');
  // the first dark ring of a round opening at u = 3.83
  if (Figures.airyI(3.8317) > 1e-6 || !close(Figures.airyI(0), 1)) fail('Airy pattern');
}

// the tutor's examples: a gap one wavelength wide gives circular waves; the double slit's second
// fringe 8 mm out; the grating's third order the highest; narrower slits leave the spacing
Lang.set('en', true);
const ex = (i) => Interf.exercise(Interf.byId(Lessons.EXAMPLES[i].scenario), Lessons.EXAMPLES[i].p);
if (ex(0).v.ans !== 'arcs') fail(`tutor example 1: ${ex(0).v.ans}`);
if (!close(ex(1).v.y, 8e-3)) fail(`tutor example 2: ${ex(1).v.y}`);
if (ex(2).v.kmax !== '3') fail(`tutor example 3: ${ex(2).v.kmax}`);
if (ex(3).v.ans !== '1') fail(`tutor example 4: ${ex(3).v.ans}`);
if (ex(4).v.ans !== '1/2') fail(`tutor example 5: ${ex(4).v.ans}`);

console.log(failures ? `${failures} failures in ${checked} exercises` : `All ${checked} exercises passed.`);
process.exit(failures ? 1 : 0);
