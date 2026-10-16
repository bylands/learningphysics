// Verifies the sketches of the potential (exercises.js: the specs, sketchBody, judgeSketch): run
// with `node electric-potential/test/check-sketch.js`. For many seeds of every sketch type, in
// English and German, it checks that
// - the spec fits the sketcher (its model, handles, axis holding the right values, snapped to its
//   grid), the right sketch is judged right and an untouched one is not judged at all,
// - typical mistakes are found where they are, with texts that render: plates, a slope inside the
//   metal and a plate off its potential; E → V, a part sloped where E = 0, a part the wrong way and
//   one much too steep; a point charge, the wrong sign, a zero and 1/r² instead of 1/r,
// and, on fixed cases, that the judging is lenient (a volt off here and there is fine) but finds a
// less steep line where the field is stronger, errors adding up, an isolated plate where the field
// is not the same on both sides, and a potential growing with the distance.
'use strict';

const assert = require('assert');
const Lang = require('../lang.js');
const X = require('../exercises.js');
const Sketch = require('../sketch.js');

const SAMPLES = 150;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (t) => /undefined|NaN|\[object|Infinity|[(=:]null\b/.test(t); // (null alone: German for zero)
const TYPES = X.TYPES.filter((t) => t.startsWith('sk-'));
const codes = (spec, st) => (X.judgeSketch(spec, st) || []).map((p) => `${p.code}@${p.at.join('+')}`);
const pieces = (nodes) => ({ nodes, bends: nodes.slice(1).map(() => 0) });
const onGrid = (spec, v) => Math.abs(v / spec.step - Math.round(v / spec.step)) < 1e-9 && v >= spec.lo && v <= spec.hi;
// the right state with the values from handle k on moved by d (a mistake from there on)
const moved = (spec, k, d) => {
  const v = spec.target.map((w, i) => (i >= k ? w + d : w));
  return spec.model === 'pieces' ? pieces(v) : v;
};

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of TYPES) {
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const tag = `${lang} ${type} seed ${seed}`, e = X.make(type, seed), spec = e.sketch;
      if (!spec || e.questions.length) { fail(`${tag}: no sketch, or questions besides`); continue; }
      const M = Sketch.models[spec.model], hs = M.handles(spec, X.rightState(spec));
      // the handles: one per breakpoint not given, or per column; the right values on the grid
      if (hs.length !== (spec.model === 'pieces' ? spec.ts.length - (spec.fixed || []).length : spec.xs.length)) fail(`${tag}: handles`);
      if (spec.target.some((v) => !onGrid(spec, v))) fail(`${tag}: a right value off the grid or the axis: ${spec.target}`);
      if (spec.target.some((v) => v < spec.lo + spec.step || v > spec.hi - spec.step)) fail(`${tag}: a right value at the edge of the axis`);
      if (X.judgeSketch(spec, spec.init) !== null) fail(`${tag}: an untouched sketch is judged`);
      if (codes(spec, X.rightState(spec)).length) fail(`${tag}: the right sketch is judged wrong: ${codes(spec, X.rightState(spec))}`);
      if (spec.model === 'pieces' && (spec.fixed || []).some((i) => spec.init.nodes[i] !== spec.target[i])) fail(`${tag}: a given breakpoint not at its value`);
      const probe = (st, want, where) => {
        const probs = X.judgeSketch(spec, st);
        if (!probs || !probs.length || probs[0].code !== want || (where != null && !probs[0].at.includes(where))) fail(`${tag}: ${want} at ${where} not found: ${probs && probs.map((p) => `${p.code}@${p.at}`)}`);
        for (const p of probs || []) if (bad(p.nudge + p.why)) fail(`${tag}: bad text ${p.nudge} ${p.why}`);
      };
      if (spec.kind === 'plates') {
        for (const m of spec.metal) {
          // the metal sloped (its far end moved), and the plate moved off its potential
          const v = [...spec.target];
          v[m.k + 1] += v[m.k + 1] + 2 <= spec.hi ? 2 : -2;
          probe(pieces(v), 'metal', m.k);
          const w = [...spec.target], d = w[m.k] + 2 <= spec.hi ? 2 : -2;
          w[m.k] += d; w[m.k + 1] += d;
          probe(pieces(w), m.iso ? 'iso' : 'value', m.k);
        }
      } else if (spec.kind === 'e2v') {
        spec.sl.forEach((s, k) => {
          const len = spec.ts[k + 1] - spec.ts[k], D = s * len;
          if (s === 0) probe(moved(spec, k + 1, 2), 'level', k);
          else {
            probe(moved(spec, k + 1, -2 * D), 'dir', k); // the wrong way, as far again
            probe(moved(spec, k + 1, D + 2 * Math.sign(D)), 'size', k); // twice the change and more
          }
        });
      } else {
        const t = spec.target, s = spec.s;
        probe(t.map((v) => -v), 'sign', 0);
        probe(t.map((v, i) => (i === t.length - 1 ? 0 : v)), 'zero', t.length - 1);
        // 1/r² through the given point
        const sq = spec.xs.map((x) => Math.max(spec.lo, Math.min(spec.hi, Math.round((s * spec.Vr / spec.ref / (x / spec.ref) ** 2) / spec.step) * spec.step)));
        const probs = X.judgeSketch(spec, sq);
        if (!probs || !probs.some((p) => p.code === 'shape' || p.code === 'zero')) fail(`${tag}: 1/r² not found: ${probs && probs.map((p) => p.code)}`);
        for (const p of probs || []) if (bad(p.nudge + p.why)) fail(`${tag}: bad text`);
      }
      // the drawing, with marks, the right graph and a readout
      const h = { ...hs[0], x: 10, y: 10 }, body = X.sketchBody(spec, X.rightState(spec), { right: true, marks: [0], active: h });
      if (bad(body) || !body.includes('skline right') || !body.includes('wrongband')) fail(`${tag}: bad drawing`);
      if (!X.sketchFig(spec, 'x').includes('<svg') || bad(JSON.stringify(X.sketchHandle(spec, hs[0])))) fail(`${tag}: no svg, or a bad handle text`);
      if (bad(e.text + e.figs + e.hints.join('') + e.solution.join(''))) fail(`${tag}: bad text`);
    }
  }

  // E → V: 0–2 mm E = −2 kV/m, 2–5 mm E = 0, 5–8 mm E = +1 kV/m, V(0) = 1 V: 1, 5, 5, 2
  let spec = X.e2vSpec([0, 2, 5, 8], [2, 0, -1], 1);
  assert.deepStrictEqual(spec.target, [1, 5, 5, 2]);
  assert.deepStrictEqual(codes(spec, pieces([1, 4, 4, 2])), [], 'a volt short on the rise is fine');
  assert.deepStrictEqual(codes(spec, pieces([1, 5, 5, 1])), [], 'a volt more on the fall is fine');
  assert.deepStrictEqual(codes(spec, pieces([1, 5, 6, 3])), ['level@1'], 'sloped where E = 0');
  assert.deepStrictEqual(codes(spec, pieces([1, 1, 1, -2])), ['dir@0'], 'level where E = −2 kV/m');
  spec = X.e2vSpec([0, 1, 5, 8], [2, 1, 0], 0);
  assert.deepStrictEqual(codes(spec, pieces([0, 1, 6, 6])), ['order@0+1'], 'each part within a volt, but E = −2 kV/m drawn less steep (1 V/mm) than E = −1 kV/m (1.25 V/mm)');
  spec = X.e2vSpec([0, 2, 4, 6, 8], [1, 1, 1, 1], 0);
  assert.deepStrictEqual(codes(spec, pieces([0, 3, 6, 9, 10])), ['drift@2'], 'a volt too much on each part adds up');
  // plates: A 0–1 mm at 0 V, a gap of 2 mm, B 3–4 mm uncharged, a gap of 2 mm, C 6–8 mm at 8 V: the
  // field 2 kV/m in both gaps, B at 4 V
  spec = { kind: 'plates', how: 'iso', model: 'pieces', ts: [0, 1, 3, 4, 6, 8], metal: [{ k: 0, name: 'A', V: 0 }, { k: 2, name: 'B', V: 4, iso: true }, { k: 4, name: 'C', V: 8 }], x0: 0, x1: 8, lo: -1, hi: 9, step: 1, init: pieces([0, 0, 0, 0, 0, 0]), target: [0, 0, 4, 4, 8, 8] };
  assert.deepStrictEqual(codes(spec, pieces([0, 0, 5, 5, 8, 8])), [], 'a volt off at the isolated plate is fine');
  assert.deepStrictEqual(codes(spec, pieces([0, 0, 6, 6, 8, 8])), ['iso@1+2+3'], 'not the same field on both sides');
  assert.deepStrictEqual(codes(spec, pieces([0, 0, 3, 5, 8, 8])), ['metal@2'], 'a slope inside B');
  assert.deepStrictEqual(codes(spec, pieces([1, 1, 4, 4, 7, 7])), [], 'A and C a volt off');
  assert.deepStrictEqual(codes(spec, pieces([2, 2, 4, 4, 8, 8])), ['value@0'], 'A 2 V off');
  // a point charge: +, 12 V at r: 12, 8, 6, 4, 3, 2
  spec = X.pointSpec(1, 12, 1);
  assert.deepStrictEqual(spec.target, [12, 8, 6, 4, 3, 2]);
  assert.deepStrictEqual(codes(spec, [11, 8, 6, 4, 3, 2]), [], 'a volt off at r is fine');
  assert.deepStrictEqual(codes(spec, [12, 9, 6, 5, 3, 2]), [], 'a volt off here and there is fine');
  assert.deepStrictEqual(codes(spec, [12, 5, 3, 1, 1, 1]), ['shape@1+2+3+4'], '1/r²');
  assert.deepStrictEqual(codes(spec, [12, 10, 8, 6, 4, 1]), ['shape@2+3'], 'a straight line down');
  assert.deepStrictEqual(codes(spec, [12, 8, 9, 4, 3, 2]), ['grow@1+2'], 'growing with the distance');
  assert.deepStrictEqual(codes(spec, [9, 8, 6, 4, 3, 2]), ['ref@0'], 'the given value off');
  assert(X.judgeSketch(spec, [12, 5, 3, 1, 1, 1])[0].nudge.includes(lang === 'en' ? 'too fast' : 'zu schnell'));
  spec = X.pointSpec(-1, 24, 2);
  assert.deepStrictEqual(spec.target, [-24, -16, -12, -8, -6, -4]);
  assert.deepStrictEqual(codes(spec, [-24, -16, -10, -8, -6, -4]), [], 'a grid step off at the given point is fine');
}

console.log(failures ? `${failures} failures` : `All ${TYPES.length} sketch types × ${SAMPLES} seeds and the fixed cases OK (en, de).`);
process.exit(failures ? 1 : 0);
