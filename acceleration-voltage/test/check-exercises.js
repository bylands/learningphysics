// Verifies Acceleration Voltage: run with `node acceleration-voltage/test/check-exercises.js`. It checks
// - the physics, independently: the bent field is free of charges (its potential is harmonic) and
//   its field points from high to low potential; V_AB = V_B − V_A; W = q·(V_A − V_B) = ΔE_kin =
//   −ΔE_pot in every exercise from A to B; from rest E_kin = |q|·|V_AB| and v = √(2·E_kin/m); the
//   closest approach in Rutherford's experiment; the race and the comparisons by |q| and |q|/m;
//   a numerical run in the uniform field (the simulation's integrator) ends with E_kin = |q|·U,
// - for every type, in both languages and many seeds: each question has exactly one right option,
//   a reason for each wrong one, distinct options, as many positive as negative signed numbers, and
//   no text or drawing contains undefined, NaN and the like,
// - the check: every kind of every objective gives questions with four options, exactly one right,
// - the notation: the German texts write the potential Φ and the voltage U, the English ones the
//   potential V and no U or Φ; every index is a subscript (no "V_A" left in the text).
'use strict';

const Lang = require('../lang.js');
const A = require('../accel.js');
const X = require('../exercises.js');

let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (html) => /undefined|NaN|\[object|Infinity|[(=:]null\b/.test(html);
const json = (e) => JSON.stringify(e, (k, v) => (typeof v === 'function' ? undefined : v));
const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-30);
const SEEDS = 60;
// a label of a number (1.23 · 10<sup>5</sup> m/s, −500 V, 2 keV …) as a number in base units
const num = (label) => {
  const t = String(label).replace(/−/g, '-').replace('+', ''), m = t.match(/^(-?[\d.]+)(?: · 10<sup>(-?\d+)<\/sup>)?\s*(M|k)?/);
  return m ? Number(m[1]) * (m[2] ? 10 ** Number(m[2]) : 1) * (m[3] === 'M' ? 1e6 : m[3] === 'k' ? 1e3 : 1) : NaN;
};
const right = (e, key) => e.questions.find((x) => x.key === key).options.find((o) => o.ok);

// ---------------------------------------------------------------- physics
const B = { kind: 'bent' };
for (const [x, y] of [[-2, 0.5], [0, 0], [1.3, -1], [2.5, 1.2], [-0.7, -1.5]]) {
  const h = 1e-3, lap = (A.V(B, x + h, y) + A.V(B, x - h, y) + A.V(B, x, y + h) + A.V(B, x, y - h) - 4 * A.V(B, x, y)) / (h * h);
  if (Math.abs(lap) > 1e-2) fail(`bent field: not harmonic at (${x}, ${y}): ${lap}`);
  const E = A.E(B, x, y), d = 1e-3, Vf = A.V(B, x + d * E[0], y + d * E[1]);
  if (!(Vf < A.V(B, x, y))) fail(`bent field: the field does not point to lower potential at (${x}, ${y})`);
}
// points on a field line at a given potential
for (const v of [800, 200]) { const p = A.onLine(B, 0, 0, v); if (!rel(A.V(B, ...p), v, 1e-4)) fail(`onLine: V = ${A.V(B, ...p)} instead of ${v}`); }
// a point charge: V ∝ 1/r
{ const c = { kind: 'nucleus', Z: 79 }; if (!rel(A.V(c, A.NX - 1, 0), 2 * A.V(c, A.NX - 2, 0), 1e-9)) fail('nucleus: V not ∝ 1/r'); }
// the simulation's integrator: a proton from rest through 1 kV between the plates
{
  const c = { kind: 'plates', VL: 1000, VR: 0 }, L = 0.01, P = A.PARTS.p, k = (P.q * A.e) / (P.m * L * L);
  let x = -A.PX, v = 0;
  while (x < A.PX) { const E = A.E(c, x, 0)[0], dt = 0.004 / (Math.abs(v) + Math.sqrt(0.004 * Math.abs(k * E)) + 1e-300); const a = k * E; x += v * dt + 0.5 * a * dt * dt; v += a * dt; }
  const Ek = (0.5 * P.m * (v * L) ** 2) / A.e;
  if (!rel(Ek, 1000, 0.01)) fail(`simulation: the proton ends with ${Ek} eV, not 1000 eV`);
}

// the exercises, against the physics
Lang.set('en', true);
for (let seed = 1; seed <= SEEDS; seed++) {
  for (const type of ['ab', 'ab-num', 'ab-bars']) {
    const e = X.make(type, seed), { VA, VB, EA, pt } = e.p, P = A.PARTS[pt], W = P.q * (VA - VB);
    if (type === 'ab') {
      if (!rel(num(right(e, 'U').label), VB - VA, 1e-3)) fail(`ab ${seed}: V_AB ${right(e, 'U').label} ≠ ${VB - VA} V`);
      if (P.q && !rel(num(right(e, 'W').label), W, 1e-3)) fail(`ab ${seed}: W ${right(e, 'W').label} ≠ ${W} eV`);
      const v = right(e, 'v').label;
      if ((W > 0 && !/faster/.test(v)) || (W < 0 && !/slower/.test(v)) || (W === 0 && !/as fast/.test(v))) fail(`ab ${seed}: ${v} for W = ${W}`);
    }
    if (type === 'ab-num') {
      if (EA + W <= 0) fail(`ab-num ${seed}: the particle does not reach B`);
      if (!rel(num(right(e, 'K').label), EA + W, 1e-2)) fail(`ab-num ${seed}: E_kin,B ${right(e, 'K').label} ≠ ${EA + W} eV`);
      if (!rel(num(right(e, 'vB').label), Math.sqrt((2 * (EA + W) * A.e) / P.m), 1e-2)) fail(`ab-num ${seed}: v_B`);
    }
  }
  {
    const e = X.make('gun', seed), P = A.PARTS[e.p.pt], K = Math.abs(P.q) * e.p.U;
    if (!rel(num(right(e, 'K').label), K, 1e-3)) fail(`gun ${seed}: E_kin ${right(e, 'K').label} ≠ ${K} eV`);
    if (!rel(num(right(e, 'v').label), Math.sqrt((2 * K * A.e) / P.m), 1e-2)) fail(`gun ${seed}: v`);
    // a positive charge starts at the plate of higher potential
    const leftHigh = e.p.hiLeft, startLeft = /left/.test(right(e, 'start').label);
    if (startLeft !== (P.q > 0 ? leftHigh : !leftHigh)) fail(`gun ${seed}: the wrong plate to start from`);
  }
  {
    const e = X.make('linac', seed), P = A.PARTS[e.p.pt];
    if (!rel(num(right(e, 'K').label), e.p.n * P.q * e.p.U, 1e-3)) fail(`linac ${seed}: E_kin`);
    if (!rel(num(right(e, 'r').label), Math.sqrt(e.p.n), 1e-3)) fail(`linac ${seed}: v ratio`);
  }
  {
    const e = X.make('ruth', seed), rmin = (2 * e.p.Z * 1.44) / e.p.E;
    if (!rel(num(right(e, 'r').label), rmin, 1e-2)) fail(`ruth ${seed}: r_min`);
    // energy conservation at 2·r_min: E_kin = E − 2e·V(2 r_min)
    const Vhalf = (e.p.Z * 1.44) / (2 * rmin); // MV
    if (!rel(num(right(e, 'half').label), (e.p.E - 2 * Vhalf) * 1e6, 1e-2)) fail(`ruth ${seed}: E_kin at 2·r_min`);
  }
  {
    const e = X.make('cmp', seed), Xp = A.PARTS[e.p.X], Yp = A.PARTS[e.p.Y];
    const kx = Math.abs(Xp.q), ky = Math.abs(Yp.q), vx = kx / Xp.m, vy = ky / Yp.m;
    const want = (a, b, tol) => (Math.abs(a / b - 1) < tol ? 'both' : a > b ? 'X' : 'Y');
    const lab = (key) => { const l = right(e, key).label; return /both/.test(l) ? 'both' : l.includes(A.part(e.p.X).short()) ? 'X' : 'Y'; };
    if (lab('K') !== want(kx, ky, 1e-9)) fail(`cmp ${seed}: more energy`);
    if (lab('v') !== want(vx, vy, 0.02)) fail(`cmp ${seed}: faster`);
  }
  {
    const e = X.make('cmp-ratio', seed), Xp = A.PARTS[e.p.X], Yp = A.PARTS[e.p.Y];
    if (!rel(num(right(e, 'v').label), Math.sqrt((Math.abs(Xp.q) / Xp.A) / (Math.abs(Yp.q) / Yp.A)), 1e-2)) fail(`cmp-ratio ${seed}: v ratio`);
  }
  {
    const e = X.make('race', seed);
    if (!/alpha/.test(right(e, 'K').label) || !/electron/.test(right(e, 'v').label) || !/proton.*electron/i.test(right(e, 'pair').label)) fail(`race ${seed}: the winners`);
  }
}

// ---------------------------------------------------------------- form and notation
function checkQuestions(tag, e) {
  for (const q of e.questions) {
    const n = q.options.filter((o) => o.ok).length;
    if (n !== 1) fail(`${tag} ${q.key}: ${n} right options`);
    if (q.options.some((o) => !o.ok && !o.why)) fail(`${tag} ${q.key}: a wrong option without a reason`);
    const labels = q.options.map((o) => o.label || o.html);
    if (new Set(labels).size !== labels.length) fail(`${tag} ${q.key}: two options alike`);
    const ls = labels.map(String), pos = ls.filter((x) => /^\+\d/.test(x)).length, neg = ls.filter((x) => /^[−-]\d/.test(x)).length;
    if (pos + neg >= 3 && pos !== neg) fail(`${tag} ${q.key}: ${pos} positive and ${neg} negative options`);
  }
}
const strip = (h) => String(h).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]*>/g, '');
function notation(tag, lang, html) {
  const t = strip(html);
  if (/[A-Za-zΦ]_[A-Za-z0-9]/.test(t)) fail(`${tag}: an index not set as a subscript: ${t}`);
  if (lang === 'de') { if (/\bV(_|<sub>)|ΔV/.test(html.replace(/<svg[\s\S]*?<\/svg>/g, ''))) fail(`${tag}: V for a potential in German: ${t}`); }
  else if (/\bU\s*=|\bU(<sub>|_)|Φ/.test(html.replace(/<svg[\s\S]*?<\/svg>/g, ''))) fail(`${tag}: U or Φ in English: ${t}`);
}
const texts = (e) => [e.text, ...e.hints, ...e.solution, ...e.questions.flatMap((q) => [q.label, ...q.options.flatMap((o) => [o.label || '', o.why || '', o.nudge || ''])])];
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of X.TYPES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const e = X.make(type, seed), tag = `${type} ${seed} ${lang}`;
      if (bad(json(e))) fail(`${tag}: undefined or NaN`);
      if (!e.hints.length || !e.solution.length) fail(`${tag}: no hints or solution`);
      checkQuestions(tag, e);
      for (const h of texts(e)) notation(tag, lang, h);
    }
  }
  for (const o of X.OBJECTIVES) {
    if (!o.name()) fail(`objective ${o.id}: no name`);
    for (const kind of o.kinds) for (let seed = 1; seed <= 20; seed++) {
      const q = X.question(kind, seed);
      if (q.options.length !== 4 || q.options.filter((x) => x.correct).length !== 1) fail(`check ${kind} ${seed}: not four options with one right`);
      if (bad(json(q)) || bad(q.explain())) fail(`check ${kind} ${seed}: undefined or NaN`);
    }
  }
}

if (failures) { console.error(`acceleration-voltage: ${failures} failures`); process.exit(1); }
console.log(`acceleration-voltage: all checks passed (${X.TYPES.length} types × ${SEEDS} seeds × 2 languages, ${X.OBJECTIVES.length} objectives)`);
