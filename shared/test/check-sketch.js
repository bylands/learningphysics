// Checks the pure parts of shared/sketch.js: snapping, the handles of both models in the order of
// the keys, setting a value (snapped and kept on the axis), the bend of a piece, moving a whole
// piece, and which piece or column a press takes.   node shared/test/check-sketch.js
const assert = require('assert');
const S = require('../sketch.js');
const { pieces: P, columns: C } = S.models;

// snapping: to the step, no −0
assert.strictEqual(S.snap(1.26, 0.5), 1.5);
assert.strictEqual(S.snap(-0.2, 0.5), 0);
assert(Object.is(S.snap(-0.2, 0.5), 0), 'no −0');
assert.strictEqual(S.snap(0.62, 0.25), 0.5);

// ---------------------------------------------------------------- pieces
// Slopes of Motion Graphs: breakpoints at 0, 2, 5 s, every one a handle; x 10 px per s from 50,
// y 20 px per unit, 0 at 100 (up is less)
const lin = { model: 'pieces', ts: [0, 2, 5], lo: -4, hi: 4, step: 0.5, dragPieces: true, x: (t) => 50 + 10 * t, y: (v) => 100 - 20 * v };
let st = P.init(lin);
assert.deepStrictEqual(st, { nodes: [0, 0, 0], bends: [0, 0] });
assert.deepStrictEqual(P.handles(lin, st).map((h) => h.id), ['n0', 'n1', 'n2']);
assert.deepStrictEqual(P.handles(lin, st).map((h) => h.t), [0, 2, 5]);
st = P.set(lin, st, { kind: 'node', i: 1 }, 1.3);
assert.deepStrictEqual(st.nodes, [0, 1.5, 0], 'snapped to 0.5');
st = P.set(lin, st, { kind: 'node', i: 2 }, 9);
assert.deepStrictEqual(st.nodes, [0, 1.5, 4], 'kept on the axis');
assert.deepStrictEqual(P.pieces(lin, st), [{ t0: 0, t1: 2, y0: 0, ym: 0.75, y1: 1.5 }, { t0: 2, t1: 5, y0: 1.5, ym: 2.75, y1: 4 }]);
// a whole piece moved: both ends, by whole steps, stopped at the top of the axis
assert.deepStrictEqual(P.shift(lin, st, 0, [0, 1.5], 1.1).nodes, [1, 2.5, 4]);
assert.deepStrictEqual(P.shift(lin, st, 1, [1.5, 4], 2).nodes, [0, 1.5, 4], 'the higher end at the top already');
assert.deepStrictEqual(P.shift(lin, st, 1, [1.5, 4], -3).nodes, [0, -1.5, 1]);
// the line of a piece: within r of it, away from its ends
assert.strictEqual(P.lineAt(lin, st, 60, 100 - 20 * 0.75, 5), 0, 'the middle of piece 0');
assert.strictEqual(P.lineAt(lin, st, 60, 100 - 20 * 0.75 + 8, 5), -1, 'too far below');
assert.strictEqual(P.lineAt(lin, st, 51, 100, 5), -1, 'at an end: the handle, not the line');
assert.strictEqual(P.lineAt(lin, st, 85, 100 - 20 * 2.75, 5), 1);

// Areas under Motion Graphs: the first breakpoint given, a bend in every piece
const bent = { model: 'pieces', ts: [0, 2, 5], lo: -4, hi: 4, step: 0.5, fixed: [0], bend: { step: 0.25 }, x: lin.x, y: lin.y };
st = { nodes: [1, 1, 1], bends: [0, 0] };
assert.deepStrictEqual(P.handles(bent, st).map((h) => h.id), ['m0', 'n1', 'm1', 'n2'], 'the middle of each piece before its end, n0 given');
assert.deepStrictEqual(P.handles(bent, st).map((h) => h.t), [1, 2, 3.5, 5]);
assert.strictEqual(P.step(bent, { kind: 'bend' }), 0.25);
assert.strictEqual(P.step(bent, { kind: 'node' }), 0.5);
st = P.set(bent, st, { kind: 'bend', i: 0 }, 1.6);
assert.deepStrictEqual(st.bends, [0.5, 0], 'the bend: from the middle of the chord, snapped to 0.25');
assert.strictEqual(P.pieces(bent, st)[0].ym, 1.5);
st = P.set(bent, st, { kind: 'node', i: 1 }, 3);
assert.strictEqual(P.pieces(bent, st)[0].ym, 2.5, 'the bend stays when an end moves');
st = P.set(bent, st, { kind: 'bend', i: 1 }, 7);
assert.strictEqual(P.pieces(bent, st)[1].ym, 4, 'the middle kept on the axis');
assert.strictEqual(P.shift(bent, st, 0, [1, 3], 1), null, 'a piece with a given end does not move');
// a drawing kept without bends (motion-graphs) still sets
assert.deepStrictEqual(P.set(lin, { nodes: [0, 0, 0] }, { kind: 'node', i: 0 }, -1).nodes, [-1, 0, 0]);

// ---------------------------------------------------------------- columns
// Wave Propagation: grid lines at 0, 0.5, 1 m; x 40 px per m from 46, the area with a margin
const cols = { model: 'columns', xs: [0, 0.5, 1], lo: -6, hi: 6, step: 1, x: (u) => 46 + 40 * u, y: (v) => 120 - 10 * v, area: { x0: 32, x1: 100, y0: 0, y1: 200 } };
let vs = C.init(cols);
assert.deepStrictEqual(vs, [0, 0, 0]);
assert.deepStrictEqual(C.handles(cols, vs).map((h) => [h.id, h.kind, h.i, h.t]), [['c0', 'column', 0, 0], ['c1', 'column', 1, 0.5], ['c2', 'column', 2, 1]]);
vs = C.set(cols, vs, { i: 1 }, 2.6);
vs = C.set(cols, vs, { i: 2 }, -8.2);
assert.deepStrictEqual(vs, [0, 3, -6], 'whole values, kept on the axis');
assert.strictEqual(C.step(cols), 1);
// a press: the nearest column, anywhere in the area
assert.strictEqual(C.columnAt(cols, 33, 50), 0, 'in the margin left of the plot');
assert.strictEqual(C.columnAt(cols, 75, 50), 1);
assert.strictEqual(C.columnAt(cols, 82, 199), 2);
assert.strictEqual(C.columnAt(cols, 101, 50), -1, 'outside the area');
assert.strictEqual(C.columnAt(cols, 60, 201), -1, 'below the area');

console.log('all checks passed');
