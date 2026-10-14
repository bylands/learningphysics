// Checks the pure part of shared/reader.js: numbers, axes, the readings of the modes (free, on a
// curve, nearest the pointer, tangent) and the arrow keys.   node shared/test/check-reader.js
const assert = require('assert');
const R = require('../reader.js');
const near = (a, b, eps = 1e-9) => assert(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

// numbers: decimals of the step, a proper minus, no −0; trimmed without trailing zeros
assert.strictEqual(R.fmt(1.234, 0.01), '1.23');
assert.strictEqual(R.fmt(3, 0.01), '3.00');
assert.strictEqual(R.fmt(-0.004, 0.01), '0.00');
assert.strictEqual(R.fmt(-1.5, 0.1), '−1.5');
assert.strictEqual(R.fmt(12.34, 1), '12');
assert.strictEqual(R.fmt(3, 0.1, true), '3');
assert.strictEqual(R.fmt(0.3000000004, 0.1, true), '0.3');
assert.strictEqual(R.fmt(1.25, 0.05, true), '1.25');
assert.strictEqual(R.fmt(1.2, 0.05, true), '1.2');

// axes: linear and logarithmic, both ways
const a = R.axes([40, 340, 200, 20], [0, 10, -2, 4]);
near(a.X(5), 190); near(a.Y(0), 140); near(a.x(190), 5); near(a.y(20), 4);
assert(a.inside(40, 200) && a.inside(340.4, 19.6) && !a.inside(39, 100) && !a.inside(100, 201));
const lg = R.axes([0, 300, 100, 0], [1, 1000, 1, 100], { x: true, y: true });
near(lg.X(10), 100); near(lg.x(200), 100, 1e-9); near(lg.Y(10), 50); near(lg.y(0), 100);

// free coordinates (as the photons graphs): rounded to the steps, the label in two lines
const ds = { read: '40 340 200 20', val: '0 10 -2 4', xn: 'f', xu: '· 10¹⁴ Hz', xp: '0.01', yn: 'V_s', yu: 'V', yp: '0.01' };
const free = R.parse(ds);
assert.strictEqual(free.mode, 'xy');
let r = R.read(free, a.X(2.3456), a.Y(1.111));
near(r.x, 2.35); near(r.y, 1.11); near(r.X, a.X(2.35));
assert.deepStrictEqual(r.lines, ['f = 2.35 · 10¹⁴ Hz', 'V_s = 1.11 V']);
assert.strictEqual(R.said(r), 'f = 2.35 · 10¹⁴ Hz, Vs = 1.11 V');
assert.strictEqual(R.read(free, 30, 100), null); // left of the plot area
// arrow keys: none yet → the middle; then a hundredth of the axis (Shift: a tenth), within it
r = R.nudge(free, null, 1, 0, false);
near(r.x, 5); near(r.y, 1);
r = R.nudge(free, r, 1, 0, false); near(r.x, 5.1);
r = R.nudge(free, r, 0, 1, true); near(r.y, 1.6);
r = R.nudge(free, { ...r, x: 9.95 }, 1, 0, true); near(r.x, 10);

// on a curve: a named one (arguments as JSON), or points; the nearest point on the grid of the step
R.curve('lin', ({ m }) => (x) => m * x);
const ds2 = { ...ds, val: '0 10 0 10', readCurve: 'lin', readArgs: '{"m":1}', xp: '0.5', yp: '0.1', readNum: 'trim' };
const c = R.parse(ds2), b = c.ax;
assert.strictEqual(c.mode, 'near');
r = R.read(c, b.X(6), b.Y(4)); // nearest to (6, 4) on y = x in user units (30 and 18 per unit)
near(r.x, 5.5); near(r.y, 5.5);
assert.deepStrictEqual(r.lines, ['f = 5.5 · 10¹⁴ Hz', 'V_s = 5.5 V']);
r = R.read(c, b.X(5), b.Y(5.2));
assert.deepStrictEqual(r.lines, ['f = 5 · 10¹⁴ Hz', 'V_s = 5 V']);
r = R.read({ ...c, mode: 'curve' }, b.X(6.1), b.Y(4)); // at the pointer's x
near(r.x, 6); near(r.y, 6);
assert.strictEqual(R.nudge(c, r, 0, 1, false), undefined); // ↑ ↓ are left to the page on a curve
near(R.nudge(c, r, -1, 0, false).x, 5.5);
const pts = R.parse({ ...ds2, readCurve: '0,0 4,8 10,2' });
near(pts.curve.f(2), 4); near(pts.curve.f(7), 5); near(pts.curve.d(7), -1);

// the tangent (as the capacitors' graphs): from x − a to where it meets the level y, marked there
const tau = 2, U0 = 10;
R.curve('dis', () => ({ f: (t) => U0 * Math.exp(-t / tau), d: (t) => (-U0 * Math.exp(-t / tau)) / tau }));
const tan = R.parse({ read: '50 314 176 26', val: '0 10 0 11', readCurve: 'dis', readMode: 'tan', readTan: `${0.4 * tau} ${1.3 * tau} 0` });
const t = tan.ax;
r = R.read(tan, t.X(3), t.Y(1));
near(r.x, 3, 1e-6); near(r.slope, -U0 * Math.exp(-1.5) / tau, 1e-6);
near(r.tan.a[0], t.X(3 - 0.8), 1e-6); near(r.tan.b[0], t.X(5), 1e-6); near(r.tan.b[1], t.Y(0), 1e-6);
assert(r.tan.end && Math.abs(r.tan.end[0] - t.X(5)) < 1e-6);
r = R.read(tan, t.X(9.5), t.Y(1)); // the level lies beyond the axis: no mark, the line ends there
assert.strictEqual(r.tan.end, null); near(r.tan.b[0], t.X(10), 1e-6);
// a curve without a slope gets one numerically
const num = R.parse({ ...ds2, readArgs: '{"m":2}', readMode: 'tan' });
near(num.curve.d(3), 2, 1e-6);
console.log('all checks passed');
