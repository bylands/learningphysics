// Verifies the dipole animations of Field Lines and Equipotentials (anim.js): run with
// `node electric-field/test/check-anim.js`. It checks
// - the figures: html() for both scenes, in both languages and a few starting angles, contains the
//   animated svg with its scene, the dipole and its force arrows, a button to replay, and no
//   undefined, NaN and the like,
// - the physics, step by step (simulate): in the uniform field the net force is zero, the dipole
//   ends along the field (within a few degrees) with its centre where it was, and it has settled
//   (hardly turning any more); near the point charge it first turns round, ends closer to the
//   charge than it started, with its negative end nearer the charge, held short of touching it,
// - every state on the way is finite,
// - the observe step of practice: for many generated dipole exercises (dipole-uniform, dipole-torque,
//   dipole-point) the animation starts as the exercise's figure (its field, angle, charge and ends),
//   keeps its scene through data-scene, and moves as the exercise's right answer says: in a uniform
//   field it turns the way answered (or, in an equilibrium, holds until tapped, then settles back or
//   turns round), ends along the field with its centre held; near a charge it is first pulled in or
//   pushed away as answered, and in the end (free to turn) attracted, the end of the opposite sign
//   nearer.
'use strict';

const Lang = require('../lang.js');
const C = require('../charges.js');
const A = require('../anim.js');
const X = require('../exercises.js');

let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (html) => /undefined|NaN|\[object|Infinity|[(=:]null\b/.test(html);
const deg = (th) => { const a = ((th * 180) / Math.PI) % 360; return a > 180 ? a - 360 : a < -180 ? a + 360 : a; };

// ---------------------------------------------------------------- the figures
for (const lang of ['en', 'de']) {
  Lang.set(lang);
  for (const kind of ['uniform', 'point']) for (const o of [{}, { angle: 30 }, { angle: 150, small: true }]) {
    const h = A.html(kind, o), tag = `${kind} ${JSON.stringify(o)} ${lang}`;
    if (bad(h)) fail(`${tag}: undefined or NaN in the figure`);
    if (!/<svg data-scene='\{[^']*\}' class="ef dip-anim/.test(h)) fail(`${tag}: no animated svg with its scene`);
    const sc = JSON.parse(h.match(/data-scene='([^']*)'/)[1]);
    if (sc.kind !== kind || !Number.isFinite(sc.angle + sc.x + sc.y + sc.W)) fail(`${tag}: the scene ${JSON.stringify(sc)}`);
    if (!/<g class="dip">.*class="rod".*<\/g><\/svg>/.test(h)) fail(`${tag}: no dipole`);
    if ((h.match(/class="v-force"/g) || []).length !== 2) fail(`${tag}: not two force arrows`);
    if (!h.includes(`class="dip-replay">↻ ${lang === 'de' ? 'Nochmals' : 'Replay'}</button>`)) fail(`${tag}: no button to replay`);
    if (/ß/.test(h)) fail(`${tag}: ß (Swiss spelling: ss)`);
  }
}
Lang.set('en');

// ---------------------------------------------------------------- the physics
// every state on the way finite
for (const kind of ['uniform', 'point']) {
  const sc = A.scene(kind);
  let s = A.simulate(kind, {}, 0);
  for (let i = 0; i < sc.T * 240; i++) { s = A.step(sc, s); if (!Number.isFinite(s.x + s.y + s.th + s.vx + s.vy + s.w)) { fail(`${kind}: not finite at ${s.t}`); break; } }
}
// uniform: no net force, ends along the field, centre unmoved, settled
for (const angle of [65, 30, 120, -70]) {
  const sc = A.scene('uniform', { angle }), { Fp, Fn } = A.forces(sc, A.simulate(sc, null, 0));
  if (Math.hypot(Fp[0] + Fn[0], Fp[1] + Fn[1]) > 1e-12) fail(`uniform ${angle}°: a net force`);
  const s = A.simulate('uniform', { angle });
  if (Math.abs(deg(s.th)) > 3) fail(`uniform ${angle}°: ends at ${deg(s.th).toFixed(1)}°, not along the field`);
  if (Math.hypot(s.x, s.y) > 1e-9) fail(`uniform ${angle}°: the centre moved`);
  if (Math.abs(s.w) > 0.1) fail(`uniform ${angle}°: still turning (ω = ${s.w.toFixed(2)})`);
  // it swings past the field direction (a pendulum), not creeping in
  let over = false, t = A.simulate(sc, null, 0);
  for (let i = 0; i < 240 * 3; i++) { t = A.step(sc, t); if (Math.sign(deg(t.th)) === -Math.sign(angle) && Math.abs(deg(t.th)) > 5) over = true; }
  if (!over) fail(`uniform ${angle}°: does not swing past the field direction`);
}
// point: turns round, attracted, negative end nearer, stops short of the charge
{
  const sc = A.scene('point'), Q = sc.Q, s0 = A.simulate(sc, null, 0), s = A.simulate('point', {});
  const dist = (st) => Math.hypot(st.x - Q.x, st.y - Q.y), e = (st) => A.forces(sc, st).e;
  const dp = (st) => Math.hypot(e(st).p[0] - Q.x, e(st).p[1] - Q.y), dn = (st) => Math.hypot(e(st).n[0] - Q.x, e(st).n[1] - Q.y);
  if (!(dp(s0) < dn(s0))) fail('point: does not start with its + end towards the charge');
  // at the start the nearer + end is pushed harder: the dipole is first pushed away
  const f0 = A.forces(sc, s0);
  if (!(Math.hypot(...f0.Fp) > Math.hypot(...f0.Fn))) fail('point: the nearer end does not feel the larger force');
  if (!(dist(s) < dist(s0) - 0.5)) fail(`point: not attracted (distance ${dist(s0).toFixed(2)} → ${dist(s).toFixed(2)})`);
  if (!(dn(s) < dp(s))) fail('point: the negative end is not the nearer one at the end');
  if (!s.done) fail('point: does not stop');
  if (Math.min(dn(s), dp(s)) < sc.stopR - 0.05) fail('point: comes too close to the charge');
  const r = 9 + 3, R = 11, S = 380 / 6; // the drawn discs (px) do not overlap
  if (Math.min(dn(s), dp(s)) * S < r + R) fail('point: touches the charge in the drawing');
  let a = s0;
  while (!a.done && a.t < sc.T) a = A.step(sc, a);
  if (!(a.t > 2.5 && a.t < 8)) fail(`point: arrives after ${a.t.toFixed(1)} s, not in a few seconds`);
}

// ---------------------------------------------------------------- the observe step of practice
const rightOf = (e, key) => { const q = e.questions.find((x) => x.key === key), o = q.options.find((x) => x.ok); return o.label || o.html; };
const rad = (a) => (a * Math.PI) / 180;
const turnOf = (s0, s1) => deg(s1.th - s0.th); // > 0: anticlockwise
let observed = 0;
for (const lang of ['de', 'en']) {
  Lang.set(lang);
  for (const type of ['dipole-uniform', 'dipole-torque', 'dipole-point']) for (let seed = 1; seed <= 80; seed++) {
    const e = X.make(type, seed), tag = `${type}-${seed} ${lang}`, a = e.anim;
    if (!a || !a.note || !A.html) { fail(`${tag}: no animation`); continue; }
    const h = A.html(a.kind, { ...a.o, label: a.note });
    if (bad(h) || bad(a.note)) fail(`${tag}: undefined or NaN in the animation`);
    if (h.includes(`aria-label="${a.note}"`) === false) fail(`${tag}: the note is not the label`);
    // the scene read back from data-scene (as the browser runs it) is the one built from o
    const d = JSON.parse(h.match(/data-scene='([^']*)'/)[1]), sc = A.scene(a.kind, a.o), sd = A.scene(d.kind, d);
    if (JSON.stringify([sd.c, sd.nudge, sd.x, sd.y]) !== JSON.stringify([sc.c, sc.nudge, sc.x, sc.y]) || Math.abs(deg(sd.th - sc.th)) > 0.06) fail(`${tag}: data-scene does not keep the scene`);
    if (lang === 'de') continue;
    observed++;
    const s0 = A.simulate(sc, null, 0), end = A.simulate(sc, null, sc.T), e0 = A.forces(sc, s0).e;
    const tap = sc.nudge ? sc.nudge.t : 0, before = A.simulate(sc, null, Math.max(0, tap - 0.05)), soon = A.simulate(sc, null, tap + 0.3);
    if (a.kind === 'uniform') {
      // the figure: the field, and the + end at h·p, p at the angle of the exercise
      const Ed = type === 'dipole-uniform' ? e.p.E.split(',').map(Number) : [1, 0];
      const a0 = type === 'dipole-uniform' ? Math.atan2(Ed[1], Ed[0]) + rad(e.p.ang) : rad(e.p.a1);
      if (Math.hypot(sc.c.E[0] - Ed[0], sc.c.E[1] - Ed[1]) > 1e-9) fail(`${tag}: the field ${sc.c.E}, not ${Ed}`);
      if (Math.hypot(e0.p[0] - 0.7 * Math.cos(a0), e0.p[1] - 0.7 * Math.sin(a0)) > 1e-6) fail(`${tag}: does not start as in the figure`);
      // the end: along the field, the centre held, at rest
      const ue = Math.atan2(Ed[1], Ed[0]);
      if (Math.abs(deg(end.th - ue)) > 3) fail(`${tag}: ends at ${deg(end.th - ue).toFixed(1)}° from the field`);
      if (Math.hypot(end.x, end.y) > 1e-9 || Math.abs(end.w) > 0.1) fail(`${tag}: the centre moved, or still turning`);
      const right = type === 'dipole-uniform' ? rightOf(e, 'T') : 'turns clockwise';
      if (/turns (anti)?clockwise/.test(right)) {
        if (sc.nudge) fail(`${tag}: tapped, though it turns by itself`);
        const t = turnOf(s0, A.simulate(sc, null, 0.15));
        if (!(right === 'turns anticlockwise' ? t > 1 : t < -1)) fail(`${tag}: the answer is "${right}", it turns by ${t.toFixed(1)}°`);
        if (type === 'dipole-torque') {
          // and its torque at the start: q·E·d·sin φ (q = E = 1, d = 2h)
          const { Fp } = A.forces(sc, s0), tau = 2 * sc.h * (Math.cos(sc.th) * Fp[1] - Math.sin(sc.th) * Fp[0]);
          if (Math.abs(-tau - 2 * sc.h * Math.sin(rad(e.p.a1))) > 1e-9) fail(`${tag}: the torque at the start is not q·E·d·sin φ`);
        }
      } else {
        // an equilibrium: held until the tap; then back (stable) or round (unstable)
        if (!sc.nudge || Math.abs(turnOf(s0, before)) > 0.5) fail(`${tag}: the answer is "${right}", but it turns before the tap`);
        if (Math.abs(turnOf(s0, soon)) < 3) fail(`${tag}: the tap does not move it`);
        const stable = /stable equilibrium/.test(right) && !/unstable/.test(right);
        if (Math.abs(turnOf(s0, end)) > (stable ? 3 : 1e9) || (!stable && Math.abs(turnOf(s0, end)) < 177)) fail(`${tag}: the answer is "${right}", it ends ${turnOf(s0, end).toFixed(1)}° from where it was`);
      }
    } else {
      // the figure: the charge ±2 at −1.8, the nearer end at x = 0.3, the farther at 1.5, on the line
      const { Q, plusNear, ask = 'F' } = e.p, dQ = (pt) => Math.hypot(pt[0] - sc.Q.x, pt[1] - sc.Q.y), dist = (st) => Math.hypot(st.x - sc.Q.x, st.y - sc.Q.y);
      if (sc.Q.q !== 2 * Q || sc.Q.x !== -1.8 || sc.Q.y !== 0) fail(`${tag}: the charge ${sc.Q.q}, not ${2 * Q}`);
      const pn = plusNear ? e0.p : e0.n, pf = plusNear ? e0.n : e0.p;
      if (Math.hypot(pn[0] - 0.3, pn[1]) > 1e-9 || Math.hypot(pf[0] - 1.5, pf[1]) > 1e-9) fail(`${tag}: does not start as in the figure`);
      // first: pulled or pushed as answered (the force; the way it moves before any tap)
      const attract = { F: () => rightOf(e, 'F') === 'towards the charge', end: () => /pulled towards/.test(e.text), Q: () => /pulled towards/.test(e.text) }[ask]();
      const { Fp, Fn } = A.forces(sc, s0), Fx = Fp[0] + Fn[0], moved = dist(A.simulate(sc, null, 0.5)) - dist(s0);
      if (!(attract ? Fx < 0 && moved < -0.02 : Fx > 0 && moved > 0.02)) fail(`${tag}: ${attract ? 'attracted' : 'repelled'} by the answer, but it moves by ${moved.toFixed(2)}`);
      if (!attract && Math.abs(turnOf(s0, before)) > 0.5) fail(`${tag}: turns before the tap`);
      // in the end, free to turn: attracted (the answer to (b)), held just short of the charge, its
      // end of the opposite sign nearer
      if (rightOf(e, 'free') !== 'attracted') fail(`${tag}: (b) is not "attracted"`);
      const ee = A.forces(sc, end).e, opp = Q > 0 ? ee.n : ee.p, like = Q > 0 ? ee.p : ee.n;
      if (!end.done || !(dist(end) < dist(s0) - 0.5)) fail(`${tag}: not attracted in the end (distance ${dist(s0).toFixed(2)} → ${dist(end).toFixed(2)})`);
      if (!(dQ(opp) < dQ(like))) fail(`${tag}: the end of the opposite sign is not the nearer one at the end`);
      if (Math.min(dQ(opp), dQ(like)) < sc.stopR - 0.05) fail(`${tag}: comes too close to the charge`);
    }
  }
}
Lang.set('en');
if (observed < 200) fail(`only ${observed} exercises observed`);

console.log(`two scenes in both languages; the dipole in a uniform field and near a point charge; the observe step of ${observed} dipole exercises`);
if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
