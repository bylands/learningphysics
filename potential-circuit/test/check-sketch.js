// Verifies the sketch of the potential (loop.js: sketchSpec, sketchBody, judgeSketch): run with
// `node potential-circuit/test/check-sketch.js`. For many seeds of every sketch type, in English and
// German, it checks that
// - the axis holds the right potentials, the handles sit at the points after A, the right sketch
//   is judged right and an empty one is not judged at all,
// - a point moved off a wire's level, a step the wrong way and a step much too large are found,
//   at the step they belong to, with texts that render,
// and, on the circuits of the worked examples, that the judging is lenient (a volt off is fine)
// but finds steps of the wrong order of size, identical lamps with unequal steps, and a battery
// the current flows through from + to − drawn as a rise.
'use strict';

const assert = require('assert');
const Lang = require('../lang.js');
const Lp = require('../loop.js');
const Sketch = require('../sketch.js');

const SAMPLES = 200;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (t) => /undefined|NaN|\[object|null/.test(t);
const TYPES = Lp.TYPES.filter((t) => t.startsWith('sketch-'));
const codes = (c, spec, vals) => (Lp.judgeSketch(c, spec, vals) || []).map((p) => `${p.code}@${p.steps.join('+')}`);

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of TYPES) {
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const tag = `${lang} ${type} seed ${seed}`, e = Lp.generate(type, seed), c = e.c, spec = e.sketch;
      if (!spec || e.fields.length) { fail(`${tag}: no sketch, or fields besides`); continue; }
      if (spec.eq !== (type === 'sketch-eq')) fail(`${tag}: eq`);
      if (JSON.stringify(spec.xs) !== JSON.stringify(c.points.slice(1).map((p) => p.node))) fail(`${tag}: handles not at the points`);
      if (spec.target.some((v) => v < spec.lo + 1 || v > spec.hi - 1)) fail(`${tag}: a potential at the edge of the axis`);
      if (spec.eq && c.slots.some((el) => el && el.t === 'lamp' && el.V !== c.slots.find((x) => x && x.t === 'lamp').V)) fail(`${tag}: lamps not identical`);
      if (Lp.judgeSketch(c, spec, spec.xs.map(() => 0)) !== null) fail(`${tag}: an empty sketch is judged`);
      if (codes(c, spec, spec.target).length) fail(`${tag}: the right sketch is judged wrong: ${codes(c, spec, spec.target)}`);
      // the sketcher's columns: one handle per point, snapped and kept on the axis
      const o = { model: 'columns', xs: spec.xs, lo: spec.lo, hi: spec.hi, step: 1 }, C = Sketch.models.columns;
      if (C.handles(o, spec.target).length !== spec.xs.length) fail(`${tag}: handles`);
      if (C.set(o, spec.target, { i: 0 }, spec.hi + 5)[0] !== spec.hi || C.set(o, spec.target, { i: 0 }, 2.4)[0] !== 2) fail(`${tag}: snapping`);
      // one mistake at a time (the points after a step moved; not the step back to A, whose end
      // is fixed): the first problem is at its step
      c.steps.forEach((s, k) => {
        if (!s.to) return;
        const X = s.el ? Lp.jump(s.el) : 0;
        const moved = (d) => spec.target.map((v, j) => (j + 1 >= s.to ? v + d : v));
        let probs;
        if (!s.el) probs = Lp.judgeSketch(c, spec, moved(2));
        else probs = Lp.judgeSketch(c, spec, moved(-2 * X)); // the wrong way, as far again
        if (!probs || !probs.length || probs[0].steps[0] !== k || probs[0].code !== (s.el ? 'dir' : 'wire')) fail(`${tag}: step ${k} (${s.el ? 'element' : 'wire'}) wrong: ${probs && probs.map((p) => p.code)}`);
        if (s.el) {
          const big = Lp.judgeSketch(c, spec, moved(X * 2 + Math.sign(X) * 2)); // 3× the jump and more
          if (!big || !big.length || big[0].code !== 'size' || big[0].steps[0] !== k) fail(`${tag}: step ${k} too large not found: ${big && big.map((p) => p.code)}`);
        }
        for (const p of probs || []) if (bad(p.nudge + p.why)) fail(`${tag}: bad text ${p.nudge} ${p.why}`);
      });
      const body = Lp.sketchBody(c, spec, spec.target, { right: true, marks: [0], active: { i: 0, t: spec.xs[0], v: spec.target[0], x: 10, y: 10 } });
      if (bad(body) || !body.includes('phi right') || !body.includes('wrongband')) fail(`${tag}: bad drawing`);
      if (!Lp.sketchFig(spec, 'x').includes('<svg')) fail(`${tag}: no svg`);
    }
  }

  // the circuits of the worked examples: 12 V; wire; L1 5 V, L2 4 V; wire; L3 3 V (A 0, B 12, C 12,
  // D 7, E 3, F 3), and 12 V; L1 3 V; wire; 4 V against the current; wire; L2 5 V
  const bat = (V, up = true) => ({ t: 'bat', V, up }), lamp = (V) => ({ t: 'lamp', V });
  let c = Lp.make([bat(12), null, lamp(5), lamp(4), null, lamp(3)]), spec = Lp.sketchSpec(c, false);
  assert.deepStrictEqual(spec.target, [12, 12, 7, 3, 3]);
  assert.deepStrictEqual(codes(c, spec, [12, 12, 7, 3, 3]), []);
  assert.deepStrictEqual(codes(c, spec, [11, 11, 6, 3, 3]), [], 'a volt off here and there is fine');
  assert.deepStrictEqual(codes(c, spec, [10, 10, 5, 2, 2]), [], 'the battery 2 V short (a sixth of 12 V), L2 and L3 a volt short');
  assert.deepStrictEqual(codes(c, spec, [12, 11, 7, 3, 3]), ['wire@1'], 'sloped along the wire B → C');
  assert.deepStrictEqual(codes(c, spec, [12, 12, 9, 5, 5]), ['size@2', 'size@5'], 'L1 too small, and so L3 too large');
  assert.deepStrictEqual(codes(c, spec, [12, 12, 14, 10, 10]), ['dir@2', 'size@5'], 'a rise across L1');
  assert.deepStrictEqual(codes(c, spec, [12, 12, 8, 3, 3]), ['order@2+3'], 'L1 (5 V) drawn smaller than L2 (4 V)');
  assert.deepStrictEqual(codes(c, spec, [12, 12, 7, 4, 4]), ['order@3+5'], 'L2 (4 V) drawn smaller than L3 (3 V)');
  assert.deepStrictEqual(codes(c, spec, [12, 12, 7, 3, 0]), ['wire@4', 'dir@5'], 'down along the wire E → F');
  assert.strictEqual(Lp.judgeSketch(c, spec, [12, 11, 7, 3, 3])[0].nudge.includes('B → C'), true, 'the nudge names the step');
  c = Lp.make([bat(12), lamp(3), null, bat(4, false), null, lamp(5)]);
  spec = Lp.sketchSpec(c, false);
  assert.deepStrictEqual(spec.target, [12, 9, 9, 5, 5]);
  const up = Lp.judgeSketch(c, spec, [12, 9, 9, 13, 13]);
  assert.deepStrictEqual(up.map((p) => p.code), ['dir', 'size']);
  assert(up[0].nudge.includes('+'), 'the battery against the current: from + to −');
  // identical lamps (eq): sixths of the battery voltage; three lamps, a third each
  c = Lp.make([bat(6), lamp(2), null, lamp(2), null, lamp(2)]);
  spec = Lp.sketchSpec(c, true);
  assert.deepStrictEqual([spec.lo, spec.hi], [-2, 8]);
  assert.deepStrictEqual(codes(c, spec, [6, 4, 4, 2, 2]), []);
  assert.deepStrictEqual(codes(c, spec, [6, 5, 5, 2, 2]), ['equal@1+3'], 'steps of ⅙, ½, ⅓: each within a sixth, but not equal');
  assert.deepStrictEqual(codes(c, spec, [6, 3, 3, 3, 3]), ['dir@3'], 'no step across L2 (L1 and L3 a half each: within a sixth, and equal)');
  assert.strictEqual(Lp.sketchValue(spec, 4), lang === 'en' ? '⅔ ΔV₀' : '⅔ U₀');
  assert.strictEqual(Lp.sketchValue(spec, 6), lang === 'en' ? 'ΔV₀' : 'U₀');
}

console.log(failures ? `${failures} failures` : `All ${TYPES.length} sketch types × ${SAMPLES} seeds and the examples' circuits OK (en, de).`);
process.exit(failures ? 1 : 0);
