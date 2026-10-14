// Verifies the torque generator and the check: run with `node torque/test/check-generator.js`.
// For many seeds per situation, level and both languages it checks
// - the answers against the laws, written out independently: torques as cross products, the
//   balance of torques about the axis or the suspension point, and the balance of forces,
// - that the values are positive and plausible, and exact where no calculator is wanted,
// - that the wrong-idea values differ from the right ones,
// - that texts, hints, solutions and drawings contain no undefined values,
// - that a choice (ranking, finding the error) has four options with exactly one right, and the
//   right ranking is that of the torques, the wrong lever arm the one drawn wrong,
// - that every kind of question of every objective of the check gives four different options,
//   exactly one right, and flags that name a wrong idea.
// It also checks the tutor's examples against the answers on the worksheets, and the stages added
// later: where to hang the load on a heavy beam, the lever arm at an angle chosen in the drawing,
// the tutor's “Wanted” and its remark on the muscle force.
'use strict';

require('../lang.js'); require('../core.js'); require('../draw.js'); require('../scenarios.js'); require('../statics.js'); require('../generator.js'); require('../lessons.js'); require('../check-src.js');
const { TQ, Torque, Lessons, Lang, CheckSource } = globalThis;
const G = TQ.G;

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 30) console.log('  FAIL ' + msg); };
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const sin = (d) => Math.sin((d * Math.PI) / 180);

// The laws per situation: [left, right] pairs that must be equal.
const LAWS = {
  plate: (p, v) => p.forces.map((f, i) => [v[`M${i + 1}`], (f.P[0] * f.u[1] * f.F - f.P[1] * f.u[0] * f.F) * 0.1]),
  seesaw: (p, v) => [[p.m1 * G * p.a1, p.find === 'x' ? p.m2 * G * v.x : v.m * G * p.a2]],
  lever3: (p, v) => [[p.m1 * p.a1 + p.m2 * p.a2, p.m3 * v.x]],
  'beam-weight': (p, v) => { const m = p.find === 'm' ? v.m : p.m, mb = p.find === 'mb' ? v.mb : p.mb; return [[m * G * p.s, mb * G * (p.len / 2 - p.s)]]; },
  angle: (p, v) => [[v.F * sin(p.alpha) * p.b, p.m * G * p.a]],
  // torques about the suspension point, and the forces
  hang: (p, v) => [[(p.F1 || 0) * v.x + p.m * G * (v.x - p.len / 2), p.F2 * (p.len - v.x)], [v.H, p.m * G + (p.F1 || 0) + p.F2]],
};
LAWS['plate-axis'] = LAWS.plate;
LAWS['rank-axis'] = LAWS.rank = LAWS['arm-error'] = LAWS.plate;
// the situations of statics.js
Object.assign(LAWS, {
  // torques about A and about B, and the forces
  plank: (p, v) => [[v.B * p.b, p.m * G * p.len / 2 + p.M * G * p.x], [v.A * p.b, p.m * G * (p.b - p.len / 2) + p.M * G * (p.b - p.x)]],
  arm: (p, v) => [[v.Fm * p.d, p.mA * G * p.c + p.M * G * p.a], [v.Fm, v.E + (p.mA + p.M) * G]],
  // the load's lever arm about the support (from it, or from the left end)
  'beam-arm': (p, v) => { const x = p.from === 'end' ? p.s - v.x : v.x; return [[p.m * G * x, p.mb * G * (p.len / 2 - p.s)]]; },
});
LAWS.hang2 = LAWS.hang;

const bad = /undefined|NaN|Infinity|\[object|\$\$\$/;
const checkText = (id, what, s) => { if (typeof s !== 'string' || bad.test(s)) fail(`${id}: ${what} contains an undefined value: ${String(s).match(bad)}`); };
const exactTo = (x, dec) => Math.abs(x * 10 ** dec - Math.round(x * 10 ** dec)) < 1e-6;

function checkExercise(ex, id, wantExact) {
  checked++;
  const law = LAWS[ex.scenario];
  if (law) law(ex.p, ex.v).forEach(([a, b], k) => { if (!close(a, b, 1e-5)) fail(`${id} (${ex.scenario}): law ${k + 1}: ${a} ≠ ${b}`); });
  else fail(`${id}: no laws for ${ex.scenario}`);
  ex.fields.forEach((f) => {
    if (!Number.isFinite(f.value) || f.value < 0) fail(`${id}: ${f.key} = ${f.value}`);
    if (!f.sense && f.value <= 0) fail(`${id}: ${f.key} = ${f.value} is not positive`);
    if (f.value > 5000) fail(`${id}: ${f.key} = ${f.value} is implausibly large`);
    if (wantExact && !exactTo(f.value, f.dec)) fail(`${id}: ${f.key} = ${f.value} needs rounding`);
    f.traps.forEach((t) => { if (Math.abs(t.value - f.value) < 1e-9) fail(`${id}: trap ${t.flag} equals the answer`); if (!t.why) fail(`${id}: trap ${t.flag} has no explanation`); });
  });
  if (ex.scenario.startsWith('plate')) {
    const ms = ex.fields.map((f) => f.value).sort((a, b) => a - b);
    for (let i = 1; i < ms.length; i++) if (ms[i] - ms[i - 1] < 0.029) fail(`${id}: torques too close to rank: ${ms}`);
  }
  if (ex.scenario === 'hang' || ex.scenario === 'hang2') { const x = ex.v.x; if (x <= 0 || x > ex.p.len) fail(`${id}: suspension point ${x} off the beam`); }
  [['text', ex.text], ['figure', ex.figure()], ['solution figure', ex.solutionFigure()], ['results', ex.results], ...ex.hints.map((h, k) => [`hint ${k + 1}`, h]), ...ex.solution.map((s, k) => [`step ${k + 1}`, s])]
    .forEach(([w, s]) => checkText(id, w, s));
  ex.steps.forEach((s, k) => checkText(id, `figure of step ${k + 1}`, ex.figure({ show: new Set(s.show), hl: new Set(s.hl) })));
}

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const level of Object.keys(Torque.LEVELS)) {
    for (const calc of [true, false]) {
      for (let seed = 1; seed <= 150; seed++) {
        const ex = Torque.generate(level, seed, calc);
        checkExercise(ex, `${lang} ${ex.id}`, !calc || !['always', 'trig'].includes(Torque.SCENARIOS.find((s) => s.id === ex.scenario).calc));
        if (!calc && Torque.SCENARIOS.find((s) => s.id === ex.scenario).calc === 'always') fail(`${ex.id}: needs a calculator`);
      }
    }
  }
  // every situation, also for the check (no calculator) and its quiz
  for (const s of Torque.SCENARIOS) {
    for (let seed = 1; seed <= 40; seed++) {
      const ex = Torque.generateFor(s.id, seed, { nice: s.calc !== 'always' });
      checkExercise(ex, `${lang} ${s.id}-${seed}`, s.calc !== 'always');
      if (s.calc === 'always' || s.choice) continue;
      const qz = Torque.quiz(ex, seed);
      if (qz.options.length !== 4 || qz.options.filter((o) => o.correct).length !== 1) fail(`${s.id}-${seed}: quiz has ${qz.options.length} options`);
      const vals = qz.options.map((o) => o.value);
      if (new Set(vals).size !== 4 || vals.some((x) => !(x > 0))) fail(`${s.id}-${seed}: quiz options ${vals}`);
    }
  }
  // the tutor's examples
  Lessons.EXAMPLES.forEach((e, k) => {
    const t = Torque.tutorial(e);
    t.frames.forEach((f, j) => { checkText(`tutor ${k + 1}`, `frame ${j + 1}`, f.text); checkText(`tutor ${k + 1}`, `figure ${j + 1}`, f.figure); });
  });
}

// the worksheets' answers: b) F = 11.5 N; c) 16 cm, 30 N
const lesson = (id) => { const e = Lessons.EXAMPLES.find((x) => x.scenario === id); return Torque.exercise(Torque.SCENARIOS.find((s) => s.id === id), e.p); };
const b = lesson('angle'), c = lesson('hang');
if (TQ.round(b.v.F, 1) !== 11.5) fail(`worksheet b: F = ${b.v.F}, the worksheet says 11.5 N`);
if (c.v.x !== 16 || c.v.H !== 30) fail(`worksheet c: x = ${c.v.x}, F_H = ${c.v.H}; the worksheet says 16 cm, 30 N`);

// Practice (no calculator): what the student identifies first comes out in round numbers (two
// decimals at most), and the results need no rounding, except where π comes in.
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const s of Torque.SCENARIOS) {
    for (let seed = 1; seed <= 40; seed++) {
      const ex = Torque.practiceOf(s.id, seed), id = `${lang} practice ${s.id}-${seed}`;
      checkExercise(ex, id, s.calc !== 'always');
      if ((s.id === 'angle' || s.choice) && !ex.comps.length) fail(`${id}: nothing to identify`);
      if (s.choice) checkChoice(ex, id);
      ex.comps.forEach((c) => {
        if (c.options) {
          if (c.options.filter((o) => o.right).length !== 1) fail(`${id}: ${c.key} has not exactly one right option`);
          if (c.options.some((o) => !o.right && !o.why)) fail(`${id}: ${c.key} has a wrong option without an explanation`);
          // the lever arm among segments: each with its length, all different (no trigonometry needed)
          if (s.id === 'angle') {
            const lens = c.options.map((o) => (o.html.match(/: ([\d.]+)\s*cm/) || [])[1]);
            if (lens.some((x) => !x) || new Set(lens).size !== 4) fail(`${id}: segment lengths ${lens}`);
            const d = ex.p.b * Math.sin((ex.p.alpha * Math.PI) / 180);
            if (Math.abs(Number(lens[c.options.findIndex((o) => o.right)]) - d) > 0.051) fail(`${id}: the right segment is not ${d} cm long`);
          }
          return;
        }
        if (c.baseVal == null) return;
        const x = c.baseVal * Math[c.fn]((ex.p.alpha * Math.PI) / 180);
        if (Math.abs(100 * x - Math.round(100 * x)) > 1e-6) fail(`${id}: ${c.key} = ${x} is not round`);
      });
    }
  }
}

// The choices: four options, one right; the right ranking orders the torques by size, the
// lever arm drawn wrong is the one to the point of application.
function checkChoice(ex, id) {
  const it = ex.comps[0], right = it.options.find((o) => o.right);
  if (it.options.length !== 4 || new Set(it.options.map((o) => o.html)).size !== 4) fail(`${id}: ${it.options.length} options, or two the same`);
  if (ex.scenario === 'arm-error') {
    if (right.html !== `$d_${ex.p.wrong + 1}$`) fail(`${id}: the right option is ${right.html}`);
    const f = ex.p.forces[ex.p.wrong], arm = globalThis.Scenarios.armOf(f);
    if (Math.abs(Math.hypot(...f.P) * 10 - arm.d) < 1) fail(`${id}: the wrong arm is hardly longer than the right one`);
  } else {
    const order = right.html.match(/M_(\d)/g).map((x) => Math.abs(ex.v.M[Number(x.slice(2)) - 1]));
    if (order.some((x, k) => k && x <= order[k - 1])) fail(`${id}: the right ranking ${right.html} is not by size: ${order}`);
  }
}

// The new stages and frames (teacher's notes, October 2026).
const dollars = (t) => (String(t).replace(/\\\$/g, '').match(/\$/g) || []).length;
const plainOk = (id, what, t) => { checkText(id, what, t); if (dollars(t) % 2) fail(`${id}: ${what} has an unpaired $: ${t}`); };
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  // Heavy beam, where to hang the load: a lever arm, the load on the beam between its left end and
  // the support, both ways of asking, at least 12 different exercises
  const seenArm = new Set(), froms = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const ex = Torque.practiceOf('beam-arm', seed), p = ex.p, id = `${lang} beam-arm-${seed}`;
    seenArm.add(JSON.stringify(p)); froms.add(p.from);
    const x = p.from === 'end' ? p.s - ex.v.x : ex.v.x;
    if (!(x >= 5 && x <= p.s - 5)) fail(`${id}: the load hangs ${x} cm from the support, off the left part`);
    if (ex.fields.length !== 1 || ex.fields[0].unit !== 'cm') fail(`${id}: it should ask for one distance`);
    if (!ex.fields[0].traps.some((t) => t.flag === 'end')) fail(`${id}: no trap for the beam's arm measured from the end`);
    if (p.from === 'end' && !ex.fields[0].traps.some((t) => t.flag === 'fromSupport')) fail(`${id}: no trap for the distance from the support`);
    [ex.text, ...ex.hints, ...ex.solution, ex.results].forEach((t, k) => plainOk(id, `text ${k}`, t));
  }
  if (seenArm.size < 12 || froms.size !== 2) fail(`beam-arm: ${seenArm.size} different exercises, ways of asking ${[...froms]}`);
  if (Lessons.EXAMPLES[4].practice[1].types[0] !== 'beam-arm' || Lessons.EXAMPLES[4].practice[0].types[0] !== 'beam-weight') fail('heavy beam: the stages');
  // At an angle: the lever arm chosen among four segments drawn in, exactly one right (from D,
  // perpendicular to the line of action), the others of other lengths, each with an explanation
  const seenAngle = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const ex = Torque.practiceOf('angle', seed), p = ex.p, id = `${lang} angle-choice-${seed}`, it = ex.comps[0];
    seenAngle.add(JSON.stringify(p));
    if (!p.cands || ex.comps.length !== 1 || !it.options) { fail(`${id}: no segments to choose`); continue; }
    if (it.options.length !== 4 || it.options.filter((o) => o.right).length !== 1 || new Set(it.options.map((o) => o.html)).size !== 4) fail(`${id}: options ${it.options.map((o) => o.html)}`);
    if (it.options.some((o) => !o.right && !o.why)) fail(`${id}: a wrong option without explanation`);
    [it.what, it.value, ...it.options.map((o) => o.html + (o.why || ''))].forEach((t, k) => plainOk(id, `choice ${k}`, t));
    const cands = globalThis.Scenarios.angleCands(p), right = cands.filter((c) => c.right);
    if (right.length !== 1 || it.options[right[0].n - 1].right !== true) fail(`${id}: the right segment is not the right option`);
    const dir = [Math.cos(((180 - p.alpha) * Math.PI) / 180), Math.sin(((180 - p.alpha) * Math.PI) / 180)];
    const lenOf = (c) => Math.hypot(c.ends[1][0] - c.ends[0][0], c.ends[1][1] - c.ends[0][1]);
    const [a, b] = right[0].ends, D = p.len / 2 + p.a;
    if (Math.abs(a[0] - D) > 1e-9 || Math.abs((b[0] - a[0]) * dir[0] + (b[1] - a[1]) * dir[1]) > 1e-6) fail(`${id}: the right segment is not the perpendicular from D`);
    if (Math.abs(lenOf(right[0]) - p.b * sin(p.alpha)) > 1e-6) fail(`${id}: the right segment is not b sin α long`);
    // each long enough to see and pick (in px of the drawing), and no two the same
    const px = 360 / p.len, key = (c) => c.ends.map((e) => e.map((x) => x.toFixed(3)).sort().join()).sort().join('|');
    cands.forEach((c) => { if (lenOf(c) * px < 25) fail(`${id}: segment ${c.n} (${c.kind}) is only ${lenOf(c) * px} px long`); });
    if (new Set(cands.map(key)).size !== 4) fail(`${id}: two segments coincide`);
    const fig = ex.figure({ task: true }), cnt = (f) => (f.match(/class="cand"/g) || []).length;
    if (cnt(fig) !== 4) fail(`${id}: ${cnt(fig)} segments drawn`);
    if (cnt(ex.figure({ task: true, show: new Set(['arm']) })) || cnt(ex.solutionFigure())) fail(`${id}: segments drawn once the lever arm is known`);
    checkText(id, 'figure', fig);
  }
  if (seenAngle.size < 12) fail(`angle: ${seenAngle.size} different exercises`);
  // the check and the tutor draw no segments
  if (/class="cand"/.test(Torque.generateFor('angle', 3, { nice: true }).figure({ task: true }))) fail('angle: segments outside practice');
  // Lever arm (tutor): “Wanted: the torque M₁ of F₁”, not “torque of F₁ M₁”
  const first = Torque.tutorial(Lessons.EXAMPLES[0]).frames[0].text;
  if (!first.includes(lang === 'en' ? 'the torque $M_1$ of $F_1$' : 'das Drehmoment $M_1$ von $F_1$') || /\$F_1\$ \$M_1\$/.test(first)) fail(`tutor 1 (${lang}): ${first}`);
  // Force in the joint (tutor): the remark that the force along the muscle is even greater
  const frames = Torque.tutorial(Lessons.EXAMPLES[8]).frames, last = frames[frames.length - 1];
  if (!(lang === 'en' ? /even greater/ : /noch grösser/).test(last.text) || !/along the muscle|entlang des Muskels/.test(last.figure)) fail(`tutor 9 (${lang}): no remark on the force along the muscle`);
  if (/ß/.test(last.text)) fail('tutor 9: ß in Swiss German');
}

// The ruler (app.js): in the situations of Scenarios.RULER it reads a segment between grid points
// (a, b) as |b − a| · GRID.unit cm and draws it at GRID.px per square. So their drawings must have
// that grid, with D at 0, 0, the forces at grid points, the scale the text names, and the lengths
// the ruler reads must give the answers. The other situations have no grid and no ruler.
{
  const { GRID, RULER, UNIT, armOf } = globalThis.Scenarios;
  const read = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) * GRID.unit; // cm, as the ruler shows it
  const onGrid = (P) => P.every((x) => Number.isInteger(x)) && Math.abs(P[0]) <= GRID.x && Math.abs(P[1]) <= GRID.y;
  const near = (x) => Math.abs(x - Math.round(x)) < 1e-9;
  if (GRID.unit !== UNIT) fail(`ruler: ${GRID.unit} cm per square, the exercises ${UNIT} cm`);
  RULER.forEach((id) => { if (!Torque.SCENARIOS.some((s) => s.id === id)) fail(`ruler: no situation ${id}`); });
  for (const lang of ['en', 'de']) {
    Lang.set(lang, true);
    for (const s of Torque.SCENARIOS) {
      for (let seed = 1; seed <= 40; seed++) {
        const ex = Torque.practiceOf(s.id, seed), id = `${lang} ruler ${s.id}-${seed}`, fig = ex.figure({ task: true });
        const grid = (fig.match(/<path class="grid" d="([^"]*)"/) || [])[1];
        if (!RULER.includes(s.id)) { if (grid) fail(`${id}: a grid, but no ruler`); continue; }
        checked++;
        // the grid's lines: every GRID.px from −x to x squares and from −y to y (y down in px)
        const xs = [...grid.matchAll(/M(-?[\d.]+) (-?[\d.]+)V/g)].map((m) => +m[1]), ys = [...grid.matchAll(/M(-?[\d.]+) (-?[\d.]+)H/g)].map((m) => -m[2]);
        [[xs, GRID.x], [ys, GRID.y]].forEach(([ls, n], k) => {
          if (ls.length !== 2 * n + 1 || ls.some((x, i) => Math.abs(x - (i - n) * GRID.px) > 0.05)) fail(`${id}: grid lines ${'xy'[k]} not every ${GRID.px} px from −${n} to ${n}: ${ls}`);
        });
        // the scale in the text and in the drawing
        if (!(lang === 'en' ? /squares: 10 cm/ : /Kästchen: 10 cm/).test(fig) || !new RegExp(`${GRID.unit} cm`).test(ex.text)) fail(`${id}: the scale is not ${GRID.unit} cm per square`);
        if (!/<circle class="hub" cx="0" cy="0"/.test(fig)) fail(`${id}: D is not at the grid point 0, 0`);
        ex.p.forces.forEach((f, i) => {
          const k = i + 1, M = Math.abs(ex.v.M[i]);
          if (!onGrid(f.P)) fail(`${id}: F${k} acts at ${f.P}, not at a grid point`);
          // what the ruler reads gives the torque: the lever arm of a force along the grid (to the
          // foot of the perpendicular, a grid point), or the distances of an oblique one's point of
          // application from D across and up (for its components)
          if (f.u[0] === 0 || f.u[1] === 0) {
            const { foot, d } = armOf(f);
            if (!foot.every(near) || !onGrid(foot.map(Math.round))) fail(`${id}: the foot of d${k} ${foot} is not a grid point`);
            if (!close(read([0, 0], foot), d) || !close((f.F * read([0, 0], foot)) / 100, M)) fail(`${id}: the ruler reads d${k} = ${read([0, 0], foot)} cm, M${k} = ${M} N·m`);
          } else {
            const Mc = Math.abs(f.F * f.u[1] * read([0, 0], [f.P[0], 0]) * Math.sign(f.P[0]) - f.F * f.u[0] * read([0, 0], [0, f.P[1]]) * Math.sign(f.P[1])) / 100;
            if (!close(Mc, M)) fail(`${id}: by components on the grid ${Mc} N·m, M${k} = ${M} N·m`);
          }
          // the student's sketch: each lever arm in the text is the length the ruler reads of the arm drawn
          if (s.id === 'arm-error') {
            const len = read([0, 0], i === ex.p.wrong ? f.P : armOf(f).foot);
            if (!ex.text.includes(TQ.tq(len / 100, 'm', 3))) fail(`${id}: d${k} drawn ${len} cm, not in the text`);
          }
        });
      }
    }
  }
}

// The check: every kind of every objective, many seeds, both languages.
let questions = 0;
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  CheckSource.objectives.forEach((o) => {
    if (!o.kinds.length || !o.name() || o.tutor >= Lessons.EXAMPLES.length || o.topic >= Lessons.EXAMPLES.length) fail(`objective ${o.id}: kinds, name, tutor or topic`);
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
console.log(`${checked} exercises checked, ${Torque.SCENARIOS.length} situations.`);
console.log(failures ? `${failures} failures.` : 'All checks passed.');
process.exitCode = failures ? 1 : 0;
