// Verifies the Electromagnetic Waves generator: run with `node em-waves/test/check-generator.js`.
// For many seeds per exercise type and both languages it checks
// - the answers, worked out again here from the parameters (c = λ·f, v = c/n, E = c·B, E × B along
//   c), the region of the spectrum from the wavelength, and the order of the spectrum,
// - that the given numbers give round results (mental arithmetic),
// - one right option per choice, distinct options, an explanation for every wrong one, traps that
//   differ from the answer, four options in every question of the check,
// - that texts, hints, solutions and figures contain no undefined values (and no ß in German),
// - that every type has enough different exercises,
// - the tutor's examples and topics, and the check's objectives and their questions.
'use strict';

const Lang = require('../lang.js');
global.window = globalThis;
for (const f of ['core', 'plot', 'figkit', 'figures', 'scenarios', 'generator', 'lessons', 'check-src']) require(`../${f}.js`);
const { EW, EWaves, Scenarios, Lessons, CheckSource } = globalThis;
const Check = require('../check.js');

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 400) console.log('  FAIL ' + msg); };
const close = (a, b, tol = 2e-3) => Math.abs(a - b) <= tol * Math.max(1e-300, Math.abs(b));
const c = 3.00e8;

// the region of the spectrum of a wavelength (borders as in a textbook)
function region(lam) {
  if (lam < 1e-11) return 'gamma';
  if (lam < 1e-8) return 'xray';
  if (lam < 380e-9) return 'uv';
  if (lam < 780e-9) return 'vis';
  if (lam < 1e-3) return 'ir';
  if (lam < 1) return 'micro';
  return 'radio';
}
const DIR = { xp: [1, 0, 0], xm: [-1, 0, 0], yp: [0, 1, 0], ym: [0, -1, 0], zp: [0, 0, 1], zm: [0, 0, -1] };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const same = (a, b) => a.every((x, i) => x === b[i]);

// The answers of an exercise type, from its parameters p (and v, for values the exercise rounds
// before it gives them: the wavelength in a medium, the field B given).
const EXPECT = {
  'spec-lf': (p, v) => ({ lam: EW.sig(p.x, 3), f: c / v.lam, reg: region(p.x) }), // the wavelength given to 3 digits
  'spec-fl': (p, v) => ({ f: EW.sig(c / p.x, 3), lam: c / v.f, reg: region(c / v.f) }),
  medium: (p) => { const n = Scenarios.MATS[p.m][2]; return { v: c / n, f: c / p.lam0, lam: p.lam0 / n }; },
  'medium-back': (p, v) => ({ n: p.lam0 / v.lam, v: (c * v.lam) / p.lam0 }),
  'eb-ratio': (p, v) => (p.give === 'E' ? { B: p.E / c } : { E: EW.sig(p.E / c, 3) * c }),
  // the longest wave of the four is the answer when the longest wavelength or the lowest frequency
  // or photon energy is asked
  'spec-order': (p) => {
    const lam = (k) => { const g = globalThis.Figures.REGIONS.find((x) => x.key === k); return 10 ** ((g.lo + g.hi) / 2); };
    const byLam = p.regs.slice().sort((x, y) => lam(x) - lam(y));
    return { ans: (p.by === 'lam') === p.hi ? byLam[3] : byLam[0] };
  },
};

const bad = /undefined|NaN|Infinity|\[object|\$\$\$/;
function texts(ex) {
  return [ex.title, ex.text, ...ex.hints, ...ex.solution, ex.results, ex.figure({ task: true }) || '', ex.solutionFigure() || '',
    ...ex.fields.flatMap((f) => [f.what, f.ask || '', ...(f.options || []).flatMap((o) => [o[1], o[2] || '', o[4] || '']), ...(f.traps || []).flatMap((t) => [t.why, t.nudge || ''])])].join('\n');
}

function checkFields(ex, where) {
  for (const f of ex.fields) {
    if (f.type === 'num') {
      if (!Number.isFinite(f.value) || f.value <= 0) fail(`${where}: ${f.key} = ${f.value}`);
      if (!(f.unit in EW.UNITS)) fail(`${where}: unknown unit ${f.unit}`);
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
  for (const scn of EWaves.SCENARIOS) {
    const seen = new Set();
    for (let seed = 1; seed <= 150; seed++) {
      const where = `${lang} ${scn.id} seed ${seed}`;
      let ex;
      try { ex = EWaves.practiceOf(scn.id, seed); } catch (e) { fail(`${where}: ${e.message}`); continue; }
      checked++;
      seen.add(JSON.stringify(ex.p));
      checkFields(ex, where);
      const all = texts(ex);
      if (bad.test(all)) fail(`${where}: ${all.match(bad)[0]} in the texts`);
      if (lang === 'de' && /ß/.test(all)) fail(`${where}: ß`);
      // the answers again
      const want = EXPECT[scn.id] && EXPECT[scn.id](ex.p, ex.v);
      if (want) {
        for (const [k, x] of Object.entries(want)) {
          if (typeof x === 'string') { if (ex.v[k] !== x) fail(`${where}: ${k} = ${ex.v[k]}, expected ${x}`); } else if (!close(ex.v[k], x)) fail(`${where}: ${k} = ${ex.v[k]}, expected ${x}`);
        }
      }
      for (const f of ex.fields) if (f.type === 'num' && !close(f.value, EW.inUnit(ex.v[f.key], f.unit), 1e-9)) fail(`${where}: ${f.key} not in its unit`);
      // round results for c = λ·f and E = c·B: three significant digits at most
      if (/^spec|^eb-ratio/.test(scn.id)) for (const f of ex.fields) if (f.type === 'num' && !close(f.value, EW.sig(f.value, 3), 1e-6)) fail(`${where}: ${f.key} = ${f.value} is not round`);
      if (scn.id === 'eb-dir') {
        const { E, B, c: cc, ans } = ex.v;
        if (!same(cross(DIR[E], DIR[B]), DIR[cc])) fail(`${where}: E × B is not along c`);
        if (ans !== ex.v[ex.p.miss]) fail(`${where}: wrong direction asked`);
      }
      if (scn.id === 'eb-phase') {
        const x = ex.p.xs['PQRS'.indexOf(ex.v.pt)], s = Math.abs(Math.sin(2 * Math.PI * x));
        if (ex.p.ask === 'zero' ? s > 1e-9 : s < 1 - 1e-9) fail(`${where}: ${ex.v.pt} is not where B is ${ex.p.ask}`);
        if (ex.p.xs.filter((y) => (ex.p.ask === 'zero' ? Math.abs(Math.sin(2 * Math.PI * y)) < 1e-9 : Math.abs(Math.sin(2 * Math.PI * y)) > 1 - 1e-9)).length !== 1) fail(`${where}: not one point fits`);
      }
      // the question of the check
      const qz = EWaves.quiz(ex, seed);
      if (qz.options.length !== 4) fail(`${where}: quiz with ${qz.options.length} options`);
      if (qz.options.filter((o) => o.correct).length !== 1) fail(`${where}: quiz without one right option`);
      if (new Set(qz.options.map((o) => o.html)).size !== 4) fail(`${where}: quiz options alike`);
    }
    if (seen.size < 8) fail(`${lang} ${scn.id}: only ${seen.size} different exercises`);
  }

  // the tutor's examples and the topics
  Lessons.EXAMPLES.forEach((e, i) => {
    const t = EWaves.tutorial(e), all = [e.name(), e.idea(), ...t.frames.map((f) => f.text + (f.figure || ''))].join('\n');
    if (t.frames.length < 3) fail(`${lang} example ${i}: only ${t.frames.length} frames`);
    if (bad.test(all)) fail(`${lang} example ${i}: ${all.match(bad)[0]}`);
    if (lang === 'de' && /ß/.test(all)) fail(`${lang} example ${i}: ß`);
  });
  const types = new Set();
  Lessons.TOPICS.forEach((tp, i) => tp.stages.forEach((s, k) => {
    s.types.forEach((id) => { types.add(id); if (!EWaves.byId(id)) fail(`topic ${i}: unknown type ${id}`); });
    const ex = tp.example(k);
    if (!Lessons.EXAMPLES[ex]) fail(`topic ${i} stage ${k}: no example ${ex}`);
  }));
  for (const s of EWaves.SCENARIOS) if (!types.has(s.id)) fail(`type ${s.id} is in no topic`);

  // the check: every objective's kinds give questions with four options, one of them right, a
  // known misconception behind every flag, and links to an example and a topic that exist
  const names = CheckSource.concepts();
  CheckSource.objectives.forEach((o, i) => {
    if (!o.name() || bad.test(o.name())) fail(`${lang} objective ${i}: name`);
    if (!Lessons.EXAMPLES[o.tutor] || !Lessons.TOPICS[o.topic]) fail(`${lang} objective ${o.id}: tutor ${o.tutor}, topic ${o.topic}`);
    for (const kind of o.kinds) {
      if (!EWaves.byId(kind)) { fail(`objective ${o.id}: unknown kind ${kind}`); continue; }
      if (!Lessons.TOPICS[o.topic].stages.some((s) => s.types.includes(kind)) && !kind.startsWith('concept')) fail(`objective ${o.id}: ${kind} not in topic ${o.topic}`);
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

// the ranking in practice (spec-order by drag and drop): the order from the end asked for, and its
// feedback for every order of the four cards and for cards that share a box: right only for the
// right order, a nudge without the whole order while wrong, the explanation once right
const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (let seed = 1; seed <= 150; seed++) {
    const where = `${lang} spec-order drag seed ${seed}`, ex = EWaves.practiceOf('spec-order', seed, { drag: true }), { p, v } = ex;
    checked++;
    if (ex.fields.length !== 1 || ex.fields[0].type !== 'rank') { fail(`${where}: no ranking`); continue; }
    const f = ex.fields[0], all = [ex.text, ...ex.solution, ex.results, ...f.ends, ...f.items.map((x) => x.label)].join('\n');
    if (bad.test(all)) fail(`${where}: ${all.match(bad)[0]} in the texts`);
    if (lang === 'de' && /ß/.test(all)) fail(`${where}: ß`);
    if (f.items.length !== 4 || f.value[0] !== v.ans || f.value[3] !== v.opp) fail(`${where}: order ${f.value}`);
    const longest = (p.by === 'lam') === p.hi, lam = (k) => globalThis.Figures.REGIONS.find((x) => x.key === k).lo;
    if (f.value.some((k, i) => i && (lam(k) > lam(f.value[i - 1])) !== !longest)) fail(`${where}: not ordered`);
    for (const order of perms([0, 1, 2, 3])) {
      const ranks = [];
      order.forEach((i, r) => { ranks[i] = r + 1; });
      const right = order.every((i, r) => p.regs[i] === f.value[r]), j = f.judge(ranks);
      if (j.ok !== right) fail(`${where}: order ${order} judged ${j.ok}`);
      if (!j.msg || bad.test(j.msg)) fail(`${where}: order ${order} without feedback`);
      if (!right && f.items.every((x) => j.msg.toLowerCase().includes(x.label.toLowerCase()))) fail(`${where}: the nudge names all four`);
      if (!right && j.bad.length && j.bad.some((i) => !order.includes(i))) fail(`${where}: marks ${j.bad}`);
      if (!right && j.bad.length === 2 && Math.abs(order.indexOf(j.bad[0]) - order.indexOf(j.bad[1])) !== 1) fail(`${where}: marked pair not neighbours`);
    }
    const tie = f.judge([1, 1, 3, 4]);
    if (tie.ok || tie.bad.length !== 2) fail(`${where}: shared box judged ${tie.ok}`);
  }
}
// a pair swapped: those two are marked
Lang.set('en', true);
{
  const ex = EWaves.exercise(EWaves.byId('spec-order'), { regs: ['micro', 'uv', 'radio', 'vis'], by: 'lam', hi: true }, { drag: true }), f = ex.fields[0];
  // right: radio, micro, vis, uv (indices 2, 0, 3, 1); vis and uv swapped
  const ranks = [2, 3, 1, 4], j = f.judge(ranks);
  if (j.ok || j.bad.slice().sort().join() !== '1,3' || !/Ultraviolet and visible light/.test(j.msg)) fail(`swapped pair: ${JSON.stringify(j)}`);
  if (!f.judge([2, 4, 1, 3]).ok) fail('right order not accepted');
}

// the example in the tutor: of microwaves, UV, radio waves and light, UV has the largest photons
Lang.set('en', true);
const tutorEx = EWaves.exercise(EWaves.byId('spec-order'), Lessons.EXAMPLES[0].p);
if (tutorEx.v.ans !== 'uv') fail(`tutor example 1: ${tutorEx.v.ans}`);

console.log(failures ? `${failures} failures in ${checked} exercises` : `All ${checked} exercises passed.`);
process.exit(failures ? 1 : 0);
