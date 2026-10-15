// Verifies the directions the student draws in practice (exercises.js: draw, drawn with arrow.js
// in app.js; the check keeps the four options): run with `node magnetic-forces/test/check-drawing.js`.
// For the direction exercises (dir-current, dir-particle, dir-missing), many seeds and both
// languages it checks
// - that every right direction can be drawn (one of the 8 in the page, ⊙ or ⊗) and turns into
//   itself again (toArrow, fromArrow), that a new arrow does not start in a right direction or
//   along a vector of the figure, and that the figure has no unknown "= ?" left,
// - where the arrow starts (the middle of the charge or wire, inside the figure), and that its ⊙ ⊗
//   go beside it, clear of the figure's own ⊙ ⊗,
// - judging every direction there is to draw (and "no force"), worked out independently with
//   F = q·v × B: right exactly when it gives the force; a wrong one with a nudge and, once done,
//   the explanation (the hand rule, howForce), and the tag of the four-option version (hand,
//   alongV, alongB, none, some) where there is one,
// - that a nudge does not name the right direction, and no text contains undefined or NaN,
// - and that the other exercises have no drawing (they keep their options).
'use strict';

const Lang = require('../lang.js');
const M = require('../generator.js');
const X = require('../exercises.js');
const A = require('../arrow.js');

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 30) console.log('  FAIL ' + msg); };
const bad = /undefined|NaN|Infinity|\[object/;
const vec = (k) => k.split(',').map(Number);
const neg = (d) => d.map((x) => -x);
const along = (d, x) => M.same(d, x) || M.same(d, neg(x));
const DRAWABLE = [...A.dirs(8), 'out', 'in'];
const SEEDS = 120;

// directions as arrow.js has them, and back
for (const d of M.CANDS) {
  const a = X.toArrow(d);
  if (!DRAWABLE.includes(a)) fail(`${d}: ${a} cannot be drawn`);
  if (!M.same(X.fromArrow(a), d)) fail(`${d}: back as ${X.fromArrow(a)}`);
}

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of X.TYPES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const e = X.make(type, seed), d = e.draw, id = `${lang} ${type}-${seed}`;
      if (!type.startsWith('dir-')) { if (d) fail(`${id}: a drawing where options are asked`); continue; }
      if (!d) { fail(`${id}: no drawing`); continue; }
      checked++;
      // the figure and where the arrow starts
      if (/= \?/.test(d.fig)) fail(`${id}: an unknown left in the figure`);
      if (!(d.at[0] > 60 && d.at[0] < 280 && d.at[1] > 60 && d.at[1] < 190)) fail(`${id}: the arrow starts at ${d.at}`);
      if (!(d.gap >= 9 && d.gap <= 16)) fail(`${id}: gap ${d.gap}`);
      const spot = [d.at[0] + d.aside[0], d.at[1] + d.aside[1]], R = 13;
      if (Math.hypot(d.aside[0], d.aside[1]) < R + 9 + 4) fail(`${id}: ⊙ ⊗ over the charge`);
      if (spot[0] + 9 > 340 || spot[1] - 9 < 0) fail(`${id}: ⊙ ⊗ outside the figure`);
      // the figure's own ⊙ ⊗ (dotCross of radius 9 at their slots)
      const own = [...d.fig.matchAll(/<circle class="(?:v-vel|v-force|v-field) sym" cx="([\d.]+)" cy="([\d.]+)" r="9"/g)].map((m) => [Number(m[1]), Number(m[2])]);
      if (own.some((p) => Math.hypot(p[0] - spot[0], p[1] - spot[1]) < 20)) fail(`${id}: ⊙ ⊗ drawn over the figure's own`);
      // a new arrow
      if (typeof d.start !== 'number' || d.fits.some((f) => M.same(f, X.fromArrow(d.start)))) fail(`${id}: a new arrow starts right (${d.start})`);
      if (!d.name || !d.ask || bad.test(d.name + d.ask)) fail(`${id}: name or ask`);
      // the physics
      let fits;
      if (type === 'dir-missing') {
        const { q, missing, a, F } = e.p;
        fits = M.CANDS.filter((c) => M.same(missing === 'B' ? M.force(q, vec(a), c) : M.force(q, c, vec(a)), vec(F)));
        if (d.kind !== missing || d.none) fail(`${id}: kind ${d.kind}, none ${d.none}`);
        if (!fits.length || !d.show || !fits.some((f) => M.same(f, d.show))) fail(`${id}: the direction shown does not fit`);
      } else {
        const { q, v, B } = e.p, F = M.force(q, vec(v), vec(B));
        fits = F ? [F] : [];
        if (d.kind !== 'F' || !d.none) fail(`${id}: kind ${d.kind}, none ${d.none}`);
        if (F ? !M.same(d.show, F) : d.show) fail(`${id}: the direction shown`);
      }
      if (d.fits.length !== fits.length || !fits.every((f) => d.fits.some((g) => M.same(f, g)))) fail(`${id}: fits ${d.fits} instead of ${fits}`);
      for (const c of [...M.CANDS, null]) {
        if (!c && !d.none) continue;
        const j = d.judge(c), right = c ? fits.some((f) => M.same(f, c)) : !fits.length, tag = `${id} ${c ? X.toArrow(c) : 'none'}`;
        if (j.ok !== right) fail(`${tag}: judged ${j.ok}`);
        if (!j.why || bad.test(j.why)) fail(`${tag}: why ${j.why}`);
        if (right) continue;
        if (!j.nudge || bad.test(j.nudge)) fail(`${tag}: nudge ${j.nudge}`);
        if (j.why === j.nudge && type !== 'dir-missing') fail(`${tag}: the explanation is the nudge`);
        if (type !== 'dir-missing') {
          // the nudge names no right direction; the explanation is the hand rule
          if (fits.some((f) => j.nudge.includes(X.dirName(f)))) fail(`${tag}: the nudge gives the answer: ${j.nudge}`);
          if (!j.why.includes(X.howForce(e.p.q, type === 'dir-current' ? 'I' : 'v', vec(e.p.v), vec(e.p.B)))) fail(`${tag}: no hand rule in ${j.why}`);
          // the tag of the four-option version
          const F = fits[0], { v, B } = e.p;
          const want = !F ? 'some' : !c ? 'none' : M.same(c, neg(F)) ? 'hand' : along(c, vec(v)) ? 'alongV' : along(c, vec(B)) ? 'alongB' : 'perp';
          if (j.tag !== want) fail(`${tag}: tag ${j.tag}, expected ${want}`);
        } else {
          if (!/would|wäre|würde/.test(j.nudge)) fail(`${tag}: nudge ${j.nudge}`);
          if (!j.tag) fail(`${tag}: no tag`);
        }
      }
      // one right drawn in the other language too: the texts follow the language
      const r = d.judge(d.show || null);
      if (!r.ok) fail(`${id}: the direction shown is judged wrong`);
      if (lang === 'de' && /\b(the|with|points)\b/.test(r.why)) fail(`${id}: English in ${r.why}`);
    }
  }
}

console.log(`${checked} direction exercises drawn, every direction judged`);
if (failures) { console.log(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
