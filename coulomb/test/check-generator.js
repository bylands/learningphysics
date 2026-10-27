// Verifies the Coulomb force generator: run with `node coulomb/test/check-generator.js`.
// For many seeds per situation and both languages it checks
// - the answers against the laws, worked out independently here: Coulomb's law, forces added as
//   vectors, the point of zero force (a test charge there feels nothing), the direction of the net
//   force on a charge moved by a tiny step (stable or unstable), the field as force per charge and
//   the fields of several charges added,
// - that wrong-idea values differ from the right ones, and every check question (of each kind of
//   each objective) has four options, one of them right,
// - that texts, hints, solutions and drawings contain no undefined values,
// - the tutor's examples against the worksheet "Force Vectors" (ranking C > A > B; the charge in
//   B moved to the right is pulled further away).
'use strict';

require('../lang.js'); require('../core.js'); require('../draw.js'); require('../scenarios.js'); require('../generator.js'); require('../lessons.js'); require('../check-src.js');
const { CL, Coulomb, Lessons, CheckSource, Lang } = globalThis;
const k = 9e9;

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 30) console.log('  FAIL ' + msg); };
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1e-30, Math.abs(b));
// the force on charge qt at pt from charges [{ q, p }], summed
const net = (qt, pt, list) => list.reduce((F, c) => { const dx = pt[0] - c.p[0], dy = pt[1] - c.p[1], r = Math.hypot(dx, dy); return [F[0] + (k * qt * c.q * dx) / r ** 3, F[1] + (k * qt * c.q * dy) / r ** 3]; }, [0, 0]);
const dirOf = (F) => { if (Math.hypot(...F) < 1e-12) return '0'; const a = Math.round((Math.atan2(F[1], F[0]) * 180) / Math.PI / 45); return ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][(a + 8) % 8]; };
const val = (ex, key) => ex.fields.find((f) => f.key === key);
const si = (f) => f.value * CL.UNITS[f.unit][0];

const LAWS = {
  pair: (p, ex) => { if (!close(si(val(ex, 'F')), (k * Math.abs(p.q1 * p.q2)) / p.r ** 2, 1e-9)) fail('pair F'); if (val(ex, 'kind').value !== (p.q1 * p.q2 < 0 ? 'attract' : 'repel')) fail('pair kind'); },
  'pair-dir': (p, ex) => {
    const F = net(p.qb, p.b, [{ q: p.qa, p: p.a }]);
    if (val(ex, 'dB').value !== dirOf(F) || val(ex, 'dA').value !== dirOf([-F[0], -F[1]]) || val(ex, 'size').value !== (p.chg ? String(p.chg === 'r' ? 1 / p.n ** 2 : p.n) : 'eq')) fail(`pair-dir ${JSON.stringify(p)}`);
  },
  factor: (p, ex) => { if (!close(val(ex, 'f').value, (p.a * p.b) / p.n ** 2)) fail('factor'); },
  'factor-mix': (p, ex) => { const f = (p.a * p.b) / p.n ** 2; if (!close(val(ex, 'f').value, f) || !close(si(val(ex, 'F2')), f * p.F)) fail('factor-mix'); },
  'factor-find': (p, ex) => { const n = val(ex, 'n').value, r2 = si(val(ex, 'r2')); if (!close(1 / n ** 2, p.m) || !close((p.r0 / r2) ** 2, p.m)) fail('factor-find'); },
  // charges in units of q, distances in units of d: only the directions count
  'line-end': (p, ex) => {
    const one = (qi, xi) => net(p.t, [0, 0], [{ q: qi, p: [xi, 0] }]), F = net(p.t, [0, 0], [{ q: p.qa, p: [p.xa, 0] }, { q: p.qb, p: [p.xb, 0] }]);
    if (val(ex, 'dA').value !== dirOf(one(p.qa, p.xa)) || val(ex, 'dB').value !== dirOf(one(p.qb, p.xb)) || val(ex, 'dir').value !== dirOf(F)) fail(`line ${JSON.stringify(p)}`);
  },
  which: (p, ex) => { const t = p.pts[0], F = net(t.s, t.c, p.pts.slice(1).map((x) => ({ q: x.s, p: x.c }))); if (val(ex, 'd').value !== dirOf(F)) fail(`which ${JSON.stringify(p)}: ${val(ex, 'd').value} ≠ ${dirOf(F)}`); if (Math.hypot(...F) > 1e-6 && Math.abs(Math.atan2(F[1], F[0]) * 4 / Math.PI - Math.round(Math.atan2(F[1], F[0]) * 4 / Math.PI)) > 1e-6) fail('which: not one of the eight directions'); },
  rank: (p, ex) => {
    const A = { end: [[1, 0], [2, 0]], mid: [[-1, 0], [1, 0]], right: [[-1, 0], [0, 1]], tri: [[1, 0], [0.5, Math.sqrt(3) / 2]], split: [[-1, 0], [2, 0]], diag: [[1, 0], [1, 1]], far: [[2, 0], [0, 1]] };
    const F = p.keys.map((key) => Math.hypot(...net(1, [0, 0], A[key].map((c, i) => ({ q: p.s[i], p: c })))));
    const rk = val(ex, 'rk').value;
    p.keys.forEach((key, i) => { const want = 1 + F.filter((x) => x > F[i] + 1e-9).length; if (rk['ABCD'[i]] !== want) fail(`rank ${key}`); });
  },
  // the force of charge A given: Coulomb's law scaled to it
  right: (p, ex) => {
    const F1 = net(p.t, [0, 0], [{ q: p.q1, p: [p.x1, 0] }]), F2 = net(p.t, [0, 0], [{ q: p.q2, p: [0, p.y2] }]), s = p.F1 / Math.hypot(...F1), F = [s * (F1[0] + F2[0]), s * (F1[1] + F2[1])];
    if (!close(si(val(ex, 'F2')), s * Math.hypot(...F2), 1e-9)) fail('right F2');
    if (!close(si(val(ex, 'F')), Math.hypot(...F), 1e-9)) fail('right F');
    if (val(ex, 'dir').value !== dirOf([Math.sign(F[0]), Math.sign(F[1])])) fail('right dir');
  },
  zero: (p, ex) => {
    const x = si(val(ex, 'x')), region = val(ex, 'region').value, a = Math.abs(p.q1), b = Math.abs(p.q2);
    const pos = region === 'between' ? x : region === 'left' ? -x : p.d + x;
    const F = net(1e-6, [pos, 0], [{ q: p.q1, p: [0, 0] }, { q: p.q2, p: [p.d, 0] }]);
    if (Math.abs(F[0]) > 1e-9 * (k * 1e-6 * Math.max(a, b)) / (pos * pos)) fail(`zero: force ${F[0]} at ${pos}`);
  },
  nudge: (p, ex) => {
    const step = { E: [1e-3, 0], W: [-1e-3, 0], N: [0, 1e-3], S: [0, -1e-3] }[p.dir], rot = (c) => (p.vert ? [-c[1], c[0]] : c);
    const F = net(p.sm, rot(step), [{ q: p.so, p: rot([-1, 0]) }, { q: p.so, p: rot([1, 0]) }]), moved = rot(step);
    if (val(ex, 'd').value !== dirOf(F)) fail(`nudge dir ${val(ex, 'd').value} ≠ ${dirOf(F)}`);
    const back = F[0] * moved[0] + F[1] * moved[1] < 0;
    if (val(ex, 'stab').value !== (back ? 'back' : 'away')) fail('nudge stability');
  },
  // the force on q1 is q1 E, on q2 then q2 E, against the field if q2 < 0
  'field-force': (p, ex) => {
    const E = si(val(ex, 'E')), F2 = si(val(ex, 'F2'));
    if (!close(E * p.q1, p.q1 * p.E, 1e-9) || !close(F2, Math.abs(p.q2) * E, 1e-9)) fail(`field-force ${JSON.stringify(p)}`);
    const u = CL.DIRVEC[p.d], d = dirOf([Math.sign(p.q2) * u[0], Math.sign(p.q2) * u[1]]);
    if (val(ex, 'dir').value !== d) fail(`field-force dir ${val(ex, 'dir').value} ≠ ${d}`);
  },
  // the net field at P: the force on a test charge +1 there; on a negative charge the other way
  'field-sum': (p, ex) => {
    const E = net(1, [0, 0], p.ch.map((x) => ({ q: x.s, p: x.c })));
    if (val(ex, 'E').value !== dirOf(E) || val(ex, 'F').value !== dirOf([-E[0], -E[1]])) fail(`field-sum ${JSON.stringify(p)}: ${val(ex, 'E').value} ≠ ${dirOf(E)}`);
    const a = Math.atan2(E[1], E[0]) * 4 / Math.PI;
    if (Math.abs(a - Math.round(a)) > 1e-6) fail('field-sum: not one of the eight directions');
  },
};
LAWS['line-mid'] = LAWS['line-end'];
LAWS['which-tri'] = LAWS.which; LAWS['which-square'] = LAWS.which;
LAWS.rank4 = LAWS.rank;
LAWS['right-dist'] = LAWS.right;
LAWS['zero-like'] = LAWS.zero; LAWS['zero-unlike'] = LAWS.zero;
LAWS['nudge-along'] = LAWS.nudge; LAWS['nudge-across'] = LAWS.nudge;

const bad = /undefined|NaN|Infinity|\[object|\$\$\$/;
// outside formulas, KaTeX's \htmlClass would show as text
const outside = (s) => s.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\$[^$]*\$/g, '');
const checkText = (id, what, s) => {
  if (typeof s !== 'string' || bad.test(s)) fail(`${id}: ${what}: ${String(s).match(/.{0,40}(undefined|NaN|Infinity|\[object|\$\$\$).{0,40}/)?.[0]}`);
  else if (/\\htmlClass/.test(outside(s))) fail(`${id}: ${what}: \\htmlClass outside a formula`);
};

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const scn of Coulomb.SCENARIOS) {
    const law = LAWS[scn.id];
    if (!law) fail(`no law for ${scn.id}`);
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      const ex = Coulomb.practiceOf(scn.id, seed), id = `${lang}/${scn.id}/${seed}`;
      checked++;
      seen.add(JSON.stringify(ex.p));
      if (law) law(ex.p, ex);
      ex.fields.forEach((f) => {
        if (f.type === 'num') {
          if (!Number.isFinite(f.value) || f.value < 0) fail(`${id}: ${f.key} = ${f.value}`);
          f.traps.forEach((t) => { if (Math.abs(t.value - f.value) <= 0.015 * f.value) fail(`${id}: trap ${t.flag} equals the answer`); });
        } else if (f.value == null) fail(`${id}: ${f.key} has no answer`);
      });
      [ex.title, ex.text, ex.results, ...ex.hints, ...ex.solution, ex.figure(), ex.solutionFigure()].forEach((s, i) => checkText(id, `text ${i}`, s));
      ex.steps.forEach((s, i) => checkText(id, `frame ${i}`, ex.figure({ show: new Set(s.show || []), hl: new Set(s.hl || []) })));
      // (a quiz needs a field with at least four answers: the line of three asks only directions)
      const quizzable = ex.fields.some((f) => f.type === 'num' || f.type === 'rank' || (f.type === 'dir' && f.dirs.length >= 4) || (f.type === 'choice' && f.options.length >= 4));
      if (seed <= 60 && quizzable) { const qz = Coulomb.quiz(ex, seed); if (qz.options.length !== 4 || qz.options.filter((o) => o.correct).length !== 1) fail(`${id}: quiz with ${qz.options.length} options`); }
    }
    if (seen.size < 3) fail(`${scn.id}: only ${seen.size} different exercises`);
  }

  // the tutor's examples
  const lesson = (id) => Coulomb.exercise(Coulomb.byId(id), Lessons.EXAMPLES.find((e) => e.scenario === id).p);
  Lessons.EXAMPLES.forEach((e) => Coulomb.tutorial(e).frames.forEach((f, i) => { checkText(`tutor ${e.scenario}`, `frame ${i}`, f.text); checkText(`tutor ${e.scenario}`, `figure ${i}`, f.figure); }));
  const rk = val(lesson('rank'), 'rk').value;
  if (!(rk.C === 1 && rk.A === 2 && rk.B === 3)) fail(`worksheet ranking: ${JSON.stringify(rk)} (C > A > B)`);
  const nb = lesson('nudge-along');
  if (val(nb, 'd').value !== 'E' || val(nb, 'stab').value !== 'away') fail('worksheet: the charge in B moved to the right is pulled further to the right');
  const pd = lesson('pair-dir');
  if (val(pd, 'dB').value !== 'SW' || val(pd, 'dA').value !== 'NE') fail('example 1: B pulled towards A, A towards B');
  const ff = lesson('field-force');
  if (!close(si(val(ff, 'E')), 3000, 1e-9) || !close(si(val(ff, 'F2')), 12e-6, 1e-9) || val(ff, 'dir').value !== 'W') fail('example 9: 3000 N/C, 12 μN to the left');

  // the check: every kind of every objective gives questions with four different options, one right
  const kinds = new Set();
  CheckSource.objectives.forEach((o) => {
    if (!o.name() || !o.kinds.length || o.tutor == null || !Lessons.EXAMPLES[o.tutor] || !Lessons.EXAMPLES[o.topic]) fail(`objective ${o.id}`);
    o.kinds.forEach((kind) => {
      if (kinds.has(kind)) fail(`kind ${kind} in two objectives`);
      kinds.add(kind);
      for (let seed = 1; seed <= 80; seed++) {
        const qn = CheckSource.question(kind, seed), id = `${lang}/check ${kind}/${seed}`;
        checked++;
        const html = qn.options.map((x) => x.html);
        if (qn.options.length !== 4 || qn.options.filter((x) => x.correct).length !== 1 || new Set(html).size !== 4) fail(`${id}: ${html.join(' | ')}`);
        [qn.title, qn.text, qn.ask, qn.figure, qn.explain(), ...html].forEach((s, i) => checkText(id, `part ${i}`, s));
        qn.options.forEach((x) => { if (x.flag && !CheckSource.concept[x.flag] && !['prefix'].includes(x.flag)) fail(`${id}: flag ${x.flag} without a concept`); });
        Object.values(CheckSource.concept).forEach((c) => { if (!CheckSource.concepts()[c]) fail(`concept ${c} without a name`); });
      }
    });
  });
}
console.log(failures ? `${failures} failures in ${checked} exercises` : `All checks passed (${checked} exercises).`);
process.exit(failures ? 1 : 0);
