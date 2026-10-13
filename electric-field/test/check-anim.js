// Verifies the dipole animations of Field Lines and Equipotentials (anim.js): run with
// `node electric-field/test/check-anim.js`. It checks
// - the figures: html() for both scenes, in both languages and a few starting angles, contains the
//   animated svg with its scene, the dipole and its force arrows, a button to replay, and no
//   undefined, NaN and the like,
// - the physics, step by step (simulate): in the uniform field the net force is zero, the dipole
//   ends along the field (within a few degrees) with its centre where it was, and it has settled
//   (hardly turning any more); near the point charge it first turns round, ends closer to the
//   charge than it started, with its negative end nearer the charge, held short of touching it,
// - every state on the way is finite.
'use strict';

const Lang = require('../lang.js');
const C = require('../charges.js');
const A = require('../anim.js');

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

console.log('two scenes in both languages; the dipole in a uniform field and near a point charge');
if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
