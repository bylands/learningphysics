// Checks the pure parts of shared/play.js ("predict, then watch"): the time on the slider and back,
// what the scene shows at a time (before or after switching, the progress, the end), playing on to
// the end and stopping there, the switch (the run from 0; back to before; nothing while locked),
// ▶/❚❚ (pause, play on, from the start at the end), the slider, and reduced motion (the switch and ▶
// jump to the end state and back, nothing plays by itself), and the keys that press a button.
//   node shared/test/check-play.js
const assert = require('assert');
const P = require('../play.js').logic;

const o = { t0: -0.5, t1: 2, seconds: 4 };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);

// ---------------------------------------------------------------- the slider
assert.strictEqual(P.toSlider(o.t0, o), 0);
assert.strictEqual(P.toSlider(o.t1, o), P.STEPS);
assert.strictEqual(P.toSlider(0, o), 200, 'the moment of switching at a fifth of the way');
assert.strictEqual(P.toSlider(99, o), P.STEPS, 'clamped');
near(P.fromSlider(0, o), o.t0, 'slider 0');
near(P.fromSlider(P.STEPS, o), o.t1, 'slider end');
near(P.fromSlider(600, o), 1, 'slider 600');
near(P.fromSlider(-5, o), o.t0, 'clamped');
for (let v = 0; v <= P.STEPS; v += 50) assert.strictEqual(P.toSlider(P.fromSlider(v, o), o), v, `round trip ${v}`);

// ---------------------------------------------------------------- the scene at a time
assert.deepStrictEqual(P.view(-0.2, o), { t: -0.2, after: false, u: 0, end: false });
assert.deepStrictEqual(P.view(0, o), { t: 0, after: true, u: 0, end: false }, 'from 0 on: switched');
assert.deepStrictEqual(P.view(1, o), { t: 1, after: true, u: 0.5, end: false });
assert.deepStrictEqual(P.view(2, o), { t: 2, after: true, u: 1, end: true });

// ---------------------------------------------------------------- playing
near(P.rate(o), 0.5, 'rate: t1 in 4 s');
near(P.rate({ t0: -1, t1: 5 }), 2, 'default 2.5 s');
let s = { t: 0, playing: true };
s = P.advance(s, 1, o);
near(s.t, 0.5, 'one second');
assert.strictEqual(s.playing, true);
s = P.advance(s, 100, o);
assert.deepStrictEqual(s, { t: 2, playing: false }, 'stops at the end');
assert.deepStrictEqual(P.advance({ t: 1, playing: false }, 1, o), { t: 1, playing: false }, 'paused: no change');
assert.deepStrictEqual(P.advance({ t: 1, playing: true }, -3, o), { t: 1, playing: true }, 'no going back');
// from before switching, playing passes the moment of switching
s = P.advance({ t: -0.5, playing: true }, 2, o);
assert.ok(P.view(s.t, o).after && !P.view(s.t, o).end);

// ---------------------------------------------------------------- the switch
assert.deepStrictEqual(P.flip({ t: o.t0, playing: false }, o, false, false), { t: 0, playing: true }, 'before: the run');
assert.deepStrictEqual(P.flip({ t: 1, playing: true }, o, false, false), { t: o.t0, playing: false }, 'after: back to before');
assert.deepStrictEqual(P.flip({ t: 2, playing: false }, o, false, false), { t: o.t0, playing: false }, 'at the end: back to before');
assert.deepStrictEqual(P.flip({ t: o.t0, playing: false }, o, false, true), { t: o.t0, playing: false }, 'locked: nothing');
// reduced motion: straight to the end state, and back
assert.deepStrictEqual(P.flip({ t: o.t0, playing: false }, o, true, false), { t: o.t1, playing: false }, 'reduced: the end state');
assert.deepStrictEqual(P.flip({ t: o.t1, playing: false }, o, true, false), { t: o.t0, playing: false }, 'reduced: back');

// ---------------------------------------------------------------- ▶/❚❚
assert.deepStrictEqual(P.press({ t: 1, playing: true }, o, false, false), { t: 1, playing: false }, 'pause');
assert.deepStrictEqual(P.press({ t: 1, playing: false }, o, false, false), { t: 1, playing: true }, 'play on');
assert.deepStrictEqual(P.press({ t: -0.3, playing: false }, o, false, false), { t: -0.3, playing: true }, 'play from before');
assert.deepStrictEqual(P.press({ t: 2, playing: false }, o, false, false), { t: o.t0, playing: true }, 'at the end: from the start');
assert.deepStrictEqual(P.press({ t: 1, playing: false }, o, false, true), { t: 1, playing: false }, 'locked: nothing');
assert.deepStrictEqual(P.press({ t: 0.4, playing: false }, o, true, false), { t: o.t1, playing: false }, 'reduced: the end state');
assert.deepStrictEqual(P.press({ t: o.t1, playing: false }, o, true, false), { t: o.t0, playing: false }, 'reduced: back to before');
// with reduced motion nothing ever plays
for (const t of [o.t0, -0.1, 0, 1, o.t1]) {
  assert.strictEqual(P.flip({ t, playing: false }, o, true, false).playing, false);
  assert.strictEqual(P.press({ t, playing: false }, o, true, false).playing, false);
}

// ---------------------------------------------------------------- the slider moved
assert.deepStrictEqual(P.seek({ t: 1, playing: true }, 0, o, false), { t: o.t0, playing: false });
near(P.seek({ t: 1, playing: true }, 800, o, false).t, 1.5, 'seek');
assert.deepStrictEqual(P.seek({ t: 1, playing: true }, 0, o, true), { t: 1, playing: true }, 'locked: nothing');

// ---------------------------------------------------------------- keys and reduced motion
assert.ok(P.activates(' ') && P.activates('Enter') && P.activates('Spacebar'));
assert.ok(!P.activates('a') && !P.activates('ArrowRight'));
assert.strictEqual(P.isReduced(null), false);
assert.strictEqual(P.isReduced((q) => ({ matches: q.includes('reduce') })), true);
assert.strictEqual(P.isReduced(() => ({ matches: false })), false);

console.log('play: all checks passed');
