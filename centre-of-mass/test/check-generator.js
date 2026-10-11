// Verifies the centre-of-mass generator and the check: run with
// `node centre-of-mass/test/check-generator.js`. For many seeds per situation and both languages
// it checks
// - the answers against the laws, written out independently: the centre of mass of a wire figure
//   from many small pieces, the torques about the edge a box tips over, the tilt at which the
//   centre of mass is straight above the edge,
// - that the values are positive, plausible and exact (no calculator needed),
// - that the wrong-idea values differ from the right ones,
// - that texts, hints, solutions and drawings contain no undefined values,
// - that a choice (the kind of equilibrium, the block that falls) has four options with exactly
//   one right, and that the right one follows from where the centre of mass is,
// - that every kind of question of every objective of the check gives four different options,
//   exactly one right, and flags that name a wrong idea.
'use strict';

require('../lang.js'); require('../core.js'); require('../draw.js'); require('../scenarios.js'); require('../generator.js'); require('../lessons.js'); require('../check-src.js');
const { TQ, Com, Lessons, Lang, CheckSource, Scenarios } = globalThis;
const G = TQ.G;

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 30) console.log('  FAIL ' + msg); };
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const rad = (d) => (d * Math.PI) / 180;

// the centre of mass of a wire figure, from 20000 small pieces per side
function comNumeric(parts) {
  let m = 0, mx = 0, my = 0;
  // a square: its four sides
  parts = parts.flatMap((pt) => { if (pt.kind !== 'square') return [pt]; const q = pt.s / 2, [x, y] = pt.c, c = [[x - q, y - q], [x + q, y - q], [x + q, y + q], [x - q, y + q]]; return c.map((a, i) => ({ kind: 'seg', a, b: c[(i + 1) % 4] })); });
  for (const pt of parts) {
    const n = 20000, dl = Math.hypot(pt.b[0] - pt.a[0], pt.b[1] - pt.a[1]) / n;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      m += dl; mx += dl * (pt.a[0] + t * (pt.b[0] - pt.a[0])); my += dl * (pt.a[1] + t * (pt.b[1] - pt.a[1]));
    }
  }
  return [mx / m, my / m];
}

// The laws per situation: [left, right] pairs that must be equal.
const LAWS = {
  // torques about the edge: the push against the weight at the middle
  tip: (p, v) => [[v.F * p.y, p.m * G * p.w / 2]],
  // tilted by θ about the edge, the centre of mass (w/2 inside, h/2 up) is straight above it
  tilt: (p, v) => { const t = Math.atan(v.tan); return [[-(p.w / 2) * Math.cos(t) + (p.h / 2) * Math.sin(t), 0]]; },
};

const bad = /undefined|NaN|Infinity|\[object|\$\$\$/;
const checkText = (id, what, s) => { if (typeof s !== 'string' || bad.test(s)) fail(`${id}: ${what} contains an undefined value: ${String(s).match(bad)}`); };
const exactTo = (x, dec) => Math.abs(x * 10 ** dec - Math.round(x * 10 ** dec)) < 1e-6;

function checkExercise(ex, id) {
  checked++;
  const law = LAWS[ex.scenario];
  if (law) law(ex.p, ex.v).forEach(([a, b], k) => { if (!close(a, b, 1e-5)) fail(`${id} (${ex.scenario}): law ${k + 1}: ${a} ≠ ${b}`); });
  else if (ex.family === 'com') {
    const c = comNumeric(Scenarios.SHAPES[ex.scenario.slice(4)].parts(ex.p));
    ex.fields.forEach((f) => { const k = f.key === 'x' ? 0 : 1; if (!close(f.value, c[k], 1e-4)) fail(`${id}: ${f.key} = ${f.value}, numerically ${c[k]}`); });
  } else if (!Com.SCENARIOS.find((s) => s.id === ex.scenario).choice) fail(`${id}: no laws for ${ex.scenario}`);
  ex.fields.forEach((f) => {
    if (!Number.isFinite(f.value) || f.value <= 0) fail(`${id}: ${f.key} = ${f.value} is not positive`);
    if (f.value > 5000) fail(`${id}: ${f.key} = ${f.value} is implausibly large`);
    if (!exactTo(f.value, f.dec)) fail(`${id}: ${f.key} = ${f.value} needs rounding`);
    f.traps.forEach((t) => { if (Math.abs(t.value - f.value) < 1e-9) fail(`${id}: trap ${t.flag} equals the answer`); if (!t.why) fail(`${id}: trap ${t.flag} has no explanation`); });
  });
  [['text', ex.text], ['figure', ex.figure()], ['solution figure', ex.solutionFigure()], ['results', ex.results], ...ex.hints.map((h, k) => [`hint ${k + 1}`, h]), ...ex.solution.map((s, k) => [`step ${k + 1}`, s])]
    .forEach(([w, s]) => checkText(id, w, s));
  ex.steps.forEach((s, k) => checkText(id, `figure of step ${k + 1}`, ex.figure({ show: new Set(s.show), hl: new Set(s.hl) })));
}

// The choices: four options, one right, each wrong one explained. The kind of equilibrium from
// where D is against S (at the origin), D on the board; the block that falls from where its centre
// of mass is against its edge, worked out from the corners of the tilted block.
function checkChoice(ex, id) {
  const it = ex.comps[0], right = it.options.filter((o) => o.right);
  if (it.options.length !== 4 || new Set(it.options.map((o) => o.html)).size !== 4 || right.length !== 1) fail(`${id}: ${it.options.length} options, ${right.length} right, or two the same`);
  if (it.options.some((o) => !o.right && !o.why)) fail(`${id}: a wrong option without an explanation`);
  checkText(id, 'item', it.what + it.value + it.options.map((o) => o.html + (o.why || '')).join(''));
  const p = ex.p;
  if (ex.scenario === 'stability') {
    const [x, y] = p.D, want = Math.abs(x) > 1e-9 ? 3 : Math.abs(y) < 1e-9 ? 2 : y > 0 ? 0 : 1;
    if (it.options[want] !== right[0]) fail(`${id}: D = ${p.D}, but the right option is ${right[0].html}`);
    const c = Math.cos(rad(p.phi)), s = Math.sin(rad(p.phi)), bx = x * c + y * s, by = -x * s + y * c;
    if (Math.abs(bx) > p.w / 2 - 4 || Math.abs(by) > p.h / 2 - 4) fail(`${id}: D = ${p.D} is not well inside the board`);
  } else if (ex.scenario === 'tips') {
    const falls = p.bodies.map((b) => {
      // the bottom left corner after the tilt, and the centre of mass, from the edge
      const t = rad(b.th), corner = [-b.w * Math.cos(t), b.w * Math.sin(t)], up = [b.h * Math.sin(t), b.h * Math.cos(t)];
      const S = [corner[0] / 2 + (up[0] * b.sy) / b.h, corner[1] / 2 + (up[1] * b.sy) / b.h];
      if (Math.abs(S[0]) < 1) fail(`${id}: the centre of mass of a block is hardly beside its edge (${S[0]} cm)`);
      return S[0] > 0;
    });
    if (falls.filter(Boolean).length !== 1 || !falls[p.falls]) fail(`${id}: falls ${falls}, the right one is ${p.falls}`);
    if (it.options[p.falls] !== right[0]) fail(`${id}: the right option is ${right[0].html}`);
    if (p.slope == null && !it.options.some((o) => o.flag === 'tilt')) fail(`${id}: no option for the most tilted block`); // on a slope all are tilted alike
  }
}

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  // every situation, for practice and for the check, and its quiz
  for (const s of Com.SCENARIOS) {
    for (let seed = 1; seed <= 60; seed++) {
      const ex = Com.practiceOf(s.id, seed), id = `${lang} ${s.id}-${seed}`;
      checkExercise(ex, id);
      if (s.choice) { checkChoice(ex, id); continue; }
      if (ex.comps.length) fail(`${id}: something to identify`);
      const q = Com.generateFor(s.id, seed);
      checkExercise(q, `${id} (check)`);
      const qz = Com.quiz(q, seed);
      if (qz.options.length !== 4 || qz.options.filter((o) => o.correct).length !== 1) fail(`${id}: quiz has ${qz.options.length} options`);
      const vals = qz.options.map((o) => o.value);
      if (new Set(vals).size !== 4 || vals.some((x) => !(x > 0))) fail(`${id}: quiz options ${vals}`);
    }
  }
  // the tutor's examples
  Lessons.EXAMPLES.forEach((e, k) => {
    const scn = Com.SCENARIOS.find((s) => s.id === e.scenario), ex = Com.exercise(scn, e.p);
    checkExercise(ex, `tutor ${k + 1}`);
    if (scn.choice) checkChoice({ ...ex, comps: scn.comps(e.p) }, `tutor ${k + 1}`);
    e.practice.forEach((st) => st.types.forEach((t) => { if (!Com.SCENARIOS.some((s) => s.id === t)) fail(`tutor ${k + 1}: no situation ${t}`); }));
    Com.tutorial(e).frames.forEach((f, j) => { checkText(`tutor ${k + 1}`, `frame ${j + 1}`, f.text); checkText(`tutor ${k + 1}`, `figure ${j + 1}`, f.figure); });
  });
}
// The first practice stage (com-L): at least 10 different exercises (dimensions), each valid.
{
  Lang.set('en', true);
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const ex = Com.practiceOf('com-L', seed);
    seen.add(JSON.stringify(ex.p));
    if (seed > 60) checkExercise(ex, `com-L-${seed}`);
    if (/[$_]/.test(ex.text.replace(/<[^>]*>/g, ''))) fail(`com-L-${seed}: raw $ or _ in the text`);
  }
  if (seen.size < 10) fail(`com-L: only ${seen.size} different exercises`);
  console.log(`com-L: ${seen.size} different exercises.`);
}
// the tutor's example of the stability: not in equilibrium, so that all cases are discussed
if (Scenarios.stateOf(Lessons.EXAMPLES[2].p.D) !== 'none') fail('tutor 3: the board is in equilibrium');

// The check: every kind of every objective, many seeds, both languages.
let questions = 0;
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  CheckSource.objectives.forEach((o) => {
    if (!o.kinds.length || !o.name() || o.tutor >= Lessons.EXAMPLES.length || o.topic >= Lessons.EXAMPLES.length) fail(`objective ${o.id}: kinds, name, tutor or topic`);
    if (!o.kinds.every((k) => Lessons.EXAMPLES.some((e) => e.practice.some((st) => st.types.includes(k))))) fail(`objective ${o.id}: a kind that is not practised`);
    o.kinds.forEach((kind) => {
      for (let seed = 1; seed <= 120; seed++) {
        const q = CheckSource.question(kind, 7919 * seed), id = `check ${lang} ${o.id} ${kind}-${7919 * seed}`;
        questions++;
        if (q.options.length !== 4 || q.options.filter((x) => x.correct).length !== 1) fail(`${id}: ${q.options.length} options, ${q.options.filter((x) => x.correct).length} right`);
        if (new Set(q.options.map((x) => x.html)).size !== q.options.length) fail(`${id}: two options the same: ${q.options.map((x) => x.html)}`);
        q.options.forEach((x) => { if (!x.correct && x.flag && !CheckSource.concept[x.flag]) fail(`${id}: flag ${x.flag} names no idea`); });
        [['title', q.title], ['text', q.text], ['figure', q.figure], ['ask', q.ask], ['explanation', q.explain()], ...q.options.map((x, k) => [`option ${k + 1}`, x.html + (x.why || '')])].forEach(([w, t]) => checkText(id, w, t));
      }
    });
  });
  Object.values(CheckSource.concept).forEach((c) => { if (!CheckSource.concepts()[c]) fail(`concept ${c} has no name`); });
}

console.log(`${questions} check questions.`);
console.log(`${checked} exercises checked, ${Com.SCENARIOS.length} situations.`);
console.log(failures ? `${failures} failures.` : 'All checks passed.');
process.exitCode = failures ? 1 : 0;
