// Verifies the forces the student draws in practice and in the tutor (scenarios.js: draw, judged in
// generator.js: drawOf, drawn with arrow.js in app.js; the check keeps its four options): run with
// `node coulomb/test/check-drawing.js`. For every situation with a drawing, many seeds and both
// languages it checks
// - the forces to draw against Coulomb's law, worked out independently here (the force on the
//   charge from each of the others, and their sum), and against the directions the check asks for
//   (the fields the drawing answers),
// - that every right drawing can be drawn: each direction one of its kind's grid within the
//   tolerance, the arrows inside the figure at full length, the right drawing (right()) judged
//   right, and a new arrow not starting in a right direction (where there is a choice),
// - the judging of many drawings (the right one turned, stretched, with a force missing or one
//   too many) against a judge written here: each force within 10° of its direction, matched to the
//   forces of its kind in any order; equal forces (but the net force) equally long within a step
//   or 30 %; of two forces one at least 1.25 times the other, the larger drawn longer,
// - the notes on a wrong drawing: a nudge that names no right direction, the explanation once done,
//   the typical wrong idea where a drawing is one (attraction and repulsion swapped, the third law),
//   no undefined or NaN, no English in German,
// - and that the other situations have no drawing, and the tutor asks for the drawing in the
//   examples that have one.
'use strict';

require('../lang.js'); require('../core.js'); require('../draw.js'); require('../scenarios.js'); require('../generator.js'); require('../lessons.js'); require('../check-src.js');
const { CL, Coulomb, Lessons, CheckSource, Lang } = globalThis;
const A = require('../arrow.js');

let failures = 0, checked = 0, drawings = 0;
const seen = {};
// (each kind of failure shown three times at most)
const fail = (msg) => { failures++; const kind = msg.replace(/^[^:]*: /, '').replace(/[\d.-]+/g, '#').slice(0, 50); seen[kind] = (seen[kind] || 0) + 1; if (seen[kind] <= 3) console.log('  FAIL ' + msg); };
const bad = /undefined|NaN|Infinity|\[object/;
const SEEDS = 150;
const DRAWN = { 'pair-dir': ['dB', 'dA'], 'line-end': ['dA', 'dB', 'dir'], 'line-mid': ['dA', 'dB', 'dir'], 'which-tri': ['d'], 'which-square': ['d'], right: ['dir'], 'right-dist': ['dir'], 'nudge-along': ['d'], 'nudge-across': ['d'] };
const TOL = 10, CLEAR = 1.25;

// ---------------------------------------------------------------- the physics, independently
const k = 9e9;
const force = (qt, pt, q, p) => { const dx = pt[0] - p[0], dy = pt[1] - p[1], r = Math.hypot(dx, dy); return [(k * qt * q * dx) / r ** 3, (k * qt * q * dy) / r ** 3]; };
const sum = (list) => list.reduce((s, F) => [s[0] + F[0], s[1] + F[1]], [0, 0]);
const rot = (c, vert) => (vert ? [-c[1], c[0]] : c);
// the forces to draw, by kind: [{ kind, F }]
function forces(id, p) {
  if (id === 'pair-dir') { const FB = force(p.qb, p.b, p.qa, p.a); return [{ kind: 'F', anchor: 'B', F: FB }, { kind: 'F', anchor: 'A', F: [-FB[0], -FB[1]] }]; }
  if (id.startsWith('line')) {
    const Fa = force(p.t, [0, 0], p.qa, [p.xa, 0]), Fb = force(p.t, [0, 0], p.qb, [p.xb, 0]);
    return [{ kind: 'FA', F: Fa }, { kind: 'FB', F: Fb }, { kind: 'F', F: sum([Fa, Fb]), net: true }];
  }
  if (id.startsWith('which')) {
    const t = p.pts[0], Fs = p.pts.slice(1).map((x) => force(t.s, t.c, x.s, x.c));
    return [...Fs.map((F, i) => ({ kind: `F${'ABCD'[i]}`, F })), { kind: 'F', F: sum(Fs), net: true }];
  }
  if (id.startsWith('right')) {
    const F1 = force(p.t, [0, 0], p.q1, [p.x1, 0]), F2 = force(p.t, [0, 0], p.q2, [0, p.y2]);
    return [{ kind: 'FA', F: F1 }, { kind: 'FB', F: F2 }, { kind: 'F', F: sum([F1, F2]), net: true }];
  }
  // moved slightly: by a quarter of d (as drawn), the line upright if vert; A on the left, B on the right
  const at = rot({ E: [0.25, 0], W: [-0.25, 0], N: [0, 0.25], S: [0, -0.25] }[p.dir], p.vert);
  const Fs = [[-1, 0], [1, 0]].map((c) => force(p.sm, at, p.so, rot(c, p.vert)));
  return [...Fs.map((F, i) => ({ kind: `F${'AB'[i]}`, F })), { kind: 'F', F: sum(Fs), net: true }];
}
const deg = (F) => ((((Math.atan2(F[1], F[0]) * 180) / Math.PI) % 360) + 360) % 360;
const gap = (a, b) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return Math.min(d, 360 - d); };
const mag = (F) => Math.hypot(F[0], F[1]);
const COMPASS = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
const compass = (F) => COMPASS[Math.round(deg(F) / 45) % 8];

// ---------------------------------------------------------------- the judge, independently
const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
// right when the arrows can be matched one to one with the forces (same kind and anchor, within
// TOL), with the lengths as they must be
// (a net force of zero: no arrow for it, but "No net force" chosen; that button chosen otherwise:
// wrong)
function judgeHere(arrows, all, none) {
  const big = Math.max(...all.map((w) => mag(w.F))), zero = all.some((w) => w.net && mag(w.F) < 1e-9 * big);
  if (none !== zero) return false;
  const want = all.filter((w) => !(w.net && zero));
  if (arrows.length !== want.length) return false;
  const groups = [...new Set(want.map((w) => `${w.kind}|${w.anchor}`))];
  const choices = groups.map((g) => {
    const ws = want.filter((w) => `${w.kind}|${w.anchor}` === g), as = arrows.filter((a) => `${a.kind}|${a.anchor}` === g);
    if (as.length !== ws.length) return [];
    return perms(as).filter((pa) => pa.every((a, i) => gap(a.dir, deg(ws[i].F)) <= TOL)).map((pa) => pa.map((a, i) => [a, ws[i]]));
  });
  if (choices.some((c) => !c.length)) return false;
  // every combination of the matchings of the groups
  const combos = choices.reduce((acc, c) => acc.flatMap((x) => c.map((y) => [...x, ...y])), [[]]);
  return combos.some((pairs) => pairs.every(([a1, w1], i) => pairs.slice(i + 1).every(([a2, w2]) => {
    const m1 = mag(w1.F), m2 = mag(w2.F);
    if (!w1.net && !w2.net && Math.abs(m1 - m2) <= 1e-9 * Math.max(m1, m2)) return Math.abs(a1.len - a2.len) <= 8 || Math.max(a1.len, a2.len) / Math.min(a1.len, a2.len) <= 1.3 + 1e-9;
    if (m1 >= CLEAR * m2) return a1.len > a2.len;
    if (m2 >= CLEAR * m1) return a2.len > a1.len;
    return true;
  })));
}

// ---------------------------------------------------------------- random drawings
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const LENS = [16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96];
function variant(r, d, base) {
  let arrows = base.map((a) => ({ ...a, at: [...a.at] }));
  const kindOf = (id) => d.kinds.find((x) => x.id === id);
  arrows.forEach((a) => {
    if (r() < 0.3) a.dir = pick(r, kindOf(a.kind).dirs);
    if (r() < 0.3) a.len = pick(r, LENS);
  });
  if (r() < 0.12) arrows.splice(Math.floor(r() * arrows.length), 1);
  if (r() < 0.06) { const b = pick(r, base); arrows.push({ ...b, id: 'x1', dir: pick(r, kindOf(b.kind).dirs) }); }
  return arrows;
}

// a nudge must not tell the direction: no arrow sign of the right ones, no name of a direction
const dirWords = () => COMPASS.map((c) => CL.dirName(c));
const vb = (fig) => fig.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number);

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const scn of Coulomb.SCENARIOS) {
    const keys = DRAWN[scn.id];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const ex = Coulomb.practiceOf(scn.id, seed), d = ex.draw, id = `${lang}/${scn.id}/${seed}`;
      if (!keys) { if (d) fail(`${id}: a drawing where none is drawn`); continue; }
      if (!d) { fail(`${id}: no drawing`); continue; }
      checked++;
      if (JSON.stringify(d.keys) !== JSON.stringify(keys) || !keys.every((key) => (ex.fields.find((f) => f.key === key) || {}).type === 'dir')) fail(`${id}: keys ${d.keys}`);
      if (!d.ask || bad.test(d.ask) || bad.test(d.fig)) fail(`${id}: ask or figure`);
      if (/class="force (?!k-move)/.test(d.fig)) fail(`${id}: a force drawn in the figure to draw on`); // (but where the charge was moved)
      // the forces against the law
      const want = forces(scn.id, ex.p);
      want.forEach((w) => { w.anchor = w.anchor || 't'; });
      if (want.length !== d.target.length) { fail(`${id}: ${d.target.length} forces to draw, ${want.length} expected`); continue; }
      const scale = Math.max(...want.map((w) => mag(w.F))), tm = Math.max(...d.target.map((t) => t.mag));
      want.forEach((w, i) => {
        const t = d.target[i];
        if (t.zero) { if (!w.net || mag(w.F) > 1e-9 * scale) fail(`${id}: a zero net force that is not`); return; }
        if (t.kind !== w.kind || t.anchor !== w.anchor || !!t.net !== !!w.net) fail(`${id}: force ${i} is ${t.kind} on ${t.anchor}`);
        if (gap(t.dir, deg(w.F)) > 1e-6) fail(`${id}: ${t.kind} at ${t.dir}°, ${deg(w.F)}° by the law`);
        if (Math.abs(t.mag / tm - mag(w.F) / scale) > 1e-9) fail(`${id}: the size of ${t.kind}`);
        if (!t.name || bad.test(t.name)) fail(`${id}: name of ${t.kind}`);
      });
      // the directions the check asks for are those drawn
      const field = (key) => ex.fields.find((f) => f.key === key).value;
      const netF = (want.find((w) => w.net) || {}).F;
      if (scn.id === 'pair-dir') { if (field('dB') !== compass(want[0].F) || field('dA') !== compass(want[1].F)) fail(`${id}: the fields and the forces`); }
      else if (scn.id.startsWith('line')) { if (field('dA') !== compass(want[0].F) || field('dB') !== compass(want[1].F) || field('dir') !== compass(netF)) fail(`${id}: the fields and the forces`); }
      else if (scn.id.startsWith('right')) { if (field('dir') !== compass([Math.sign(netF[0]), Math.sign(netF[1])])) fail(`${id}: the quadrant`); }
      else if (mag(netF) < 1e-9 * scale) { if (field('d') !== '0') fail(`${id}: no net force, but the field`); }
      else if (field('d') !== compass(netF) || gap(deg(netF), 45 * Math.round(deg(netF) / 45)) > 1e-6) fail(`${id}: the net force and the field`);
      // every force can be drawn, in the figure at full length
      const [x0, y0, w0, h0] = vb(d.fig);
      d.target.filter((t) => !t.zero).forEach((t) => {
        const kd = d.kinds.find((x) => x.id === t.kind), an = d.anchors.find((x) => x.id === t.anchor);
        if (!kd || !an) { fail(`${id}: kind or anchor of ${t.kind}`); return; }
        if (gap(A.nearest(kd.dirs, t.dir), t.dir) > TOL) fail(`${id}: ${t.kind} at ${t.dir}° not drawable`);
        const at = d.tail(t.kind, an), reach = d.gap({ kind: t.kind, anchor: t.anchor }) + d.len.hi + 4;
        if (!(at[0] > x0 && at[0] < x0 + w0 && at[1] > y0 && at[1] < y0 + h0)) fail(`${id}: ${t.kind} starts outside the figure`);
        kd.dirs.forEach((dir) => { const u = A.vec(dir), tip = [at[0] + reach * u[0], at[1] + reach * u[1]]; if (!(tip[0] >= x0 && tip[0] <= x0 + w0 && tip[1] >= y0 && tip[1] <= y0 + h0)) fail(`${id}: no room for ${t.kind} at ${dir}°`); });
        if (kd.dirs.length >= 8 && d.target.some((u) => u.kind === t.kind && gap(A.nearest(kd.dirs, d.start), u.dir) <= TOL)) fail(`${id}: a new ${t.kind} starts in a right direction`);
      });
      // the right drawing, and its labels
      const right = d.right(), zero = d.zero;
      if (zero !== (field(DRAWN[scn.id].slice(-1)[0]) === '0') || (zero && !d.none)) fail(`${id}: no net force, but no way to say so`);
      if (!d.judge(right, false, zero).ok || !judgeHere(right, want, zero)) fail(`${id}: the right drawing is judged wrong`);
      right.forEach((a) => { if (a.len < d.len.lo || a.len > d.len.hi || !d.kinds.find((x) => x.id === a.kind).dirs.includes(a.dir)) fail(`${id}: right arrow ${JSON.stringify(a)}`); const l = d.label(a, right); if (!/>F</.test(l) || bad.test(l)) fail(`${id}: label ${l}`); });
      // many drawings, judged as here
      const r = rng(seed * 7919 + (lang === 'de' ? 1 : 0)), rightDirs = d.target.map((t) => A.words(t.dir));
      for (let n = 0; n < 60; n++) {
        let arrows = variant(r, d, right), none = zero;
        if (d.none && r() < 0.15) none = !none;
        if (none) arrows = arrows.filter((a) => a.kind !== 'F');
        const j = d.judge(arrows, false, none), jd = d.judge(arrows, true, none), here = judgeHere(arrows, want, none);
        drawings++;
        if (j.ok !== here || jd.ok !== here) { fail(`${id}: judged ${j.ok}, here ${here}: ${JSON.stringify(arrows.map((a) => [a.kind, a.anchor, a.dir, a.len]))}`); continue; }
        if (here) { if (j.notes.length) fail(`${id}: notes on a right drawing`); continue; }
        if (!j.notes.length || !jd.notes.length) fail(`${id}: no note on a wrong drawing`);
        if (!arrows.some((a) => j.marks[a.id] === 'bad') && arrows.length >= d.target.length) fail(`${id}: nothing marked on a wrong drawing`);
        [...j.notes, ...jd.notes].forEach((x) => {
          if (!x.text || bad.test(x.text)) fail(`${id}: note ${x.text}`);
          if (lang === 'de' && /\b(the|force|draw|which|with)\b/i.test(x.text.replace(/\$[^$]*\$/g, ''))) fail(`${id}: English in ${x.text}`);
          if (x.flag && !CheckSource.concept[x.flag]) fail(`${id}: flag ${x.flag} without a concept`);
        });
        j.notes.forEach((x) => {
          if (/[→↗↑↖←↙↓↘]/.test(x.text) || dirWords().some((w) => x.text.includes(w)) || rightDirs.some((w) => x.text.includes(w))) fail(`${id}: the nudge tells the direction: ${x.text}`);
        });
      }
      // typical wrong ideas: attraction and repulsion swapped, the third law
      const turned = (i, dir) => right.map((a, k) => (k === i ? { ...a, dir } : a));
      const flags = (arrows) => d.judge(arrows, false, zero).notes.map((x) => x.flag);
      const kOf = (t) => d.kinds.find((x) => x.id === t.kind);
      d.target.forEach((t, i) => {
        if (t.net) return; // (the forces of the charges come first, as in right())
        const back = A.nearest(kOf(t).dirs, (t.dir + 180) % 360), twin = d.target.some((u, k) => k !== i && u.kind === t.kind && gap(u.dir, back) <= TOL);
        if (!twin && !flags(turned(i, back)).includes('signs')) fail(`${id}: ${t.kind} turned round is not attraction and repulsion swapped`);
      });
      if (scn.id === 'pair-dir') {
        if (!flags(turned(1, right[0].dir)).includes('third')) fail(`${id}: both forces the same way is not the third law`);
        if (!flags(right.map((a, k) => (k ? { ...a, len: a.len >= 64 ? 24 : 96 } : a))).includes('third')) fail(`${id}: unequal forces are not the third law`);
      }
    }
  }

  // the tutor: the examples whose forces can be drawn ask for them after the situation
  Lessons.EXAMPLES.forEach((e) => {
    const frames = Coulomb.tutorial(e).frames, own = frames.filter((f) => /class="t-draw"/.test(f.text));
    if (own.length !== (DRAWN[e.scenario] ? 1 : 0) || (own.length && frames[1] !== own[0])) fail(`${lang} tutor ${e.scenario}: ${own.length} drawings`);
    if (own.length && /class="force (?!k-move)/.test(own[0].figure)) fail(`${lang} tutor ${e.scenario}: forces in the figure to draw on`);
  });
  // the check keeps its four options for the directions
  ['pair-dir', 'pair-back', 'which-tri', 'which-square', 'right', 'nudge-along'].forEach((kind) => {
    for (let seed = 1; seed <= 20; seed++) { const q = CheckSource.question(kind, seed); if (q.options.length !== 4 || q.options.filter((o) => o.correct).length !== 1) fail(`${lang} check ${kind}/${seed}`); }
  });
}

console.log(`${checked} exercises with forces to draw, ${drawings} drawings judged`);
if (failures) { console.log(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
