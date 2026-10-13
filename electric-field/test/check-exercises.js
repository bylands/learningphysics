// Verifies Field Lines and Equipotentials: run with `node electric-field/test/check-exercises.js`.
// It checks
// - the physics, independently: the field of a point charge points away from a positive charge
//   and falls with 1/r²; field lines run from + to − (or to the edge); equipotentials are
//   perpendicular to the field; the field of a plate capacitor runs from plate to plate between
//   them and is weak outside; a dipole turns as said; its torque q·E·d·sin φ changes by the factor said,
// - for every type, in both languages and many seeds: each question has a right option (exactly one
//   unless several may fit), a reason for each wrong one, distinct options; statements are mixed;
//   the questions the check asks have four options,
// - "find the error": the wrong feature is the one drawn: lines that cross only where the sketch
//   says so, equipotentials along the field lines only where it says so,
// - no text or drawing contains undefined, NaN and the like.
'use strict';

const Lang = require('../lang.js');
const C = require('../charges.js');
const X = require('../exercises.js');

let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (html) => /undefined|NaN|\[object|Infinity|[(=:]null\b/.test(html);
const json = (e) => JSON.stringify(e, (k, v) => (typeof v === 'function' ? undefined : v));
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const SEEDS = 60;

// ---------------------------------------------------------------- the physics
const one = { kind: 'points', charges: [{ q: 1, x: 0, y: 0 }] };
{
  const [ex, ey] = C.field(one, 1, 0), [fx] = C.field(one, 2, 0);
  if (!(ex > 0 && near(ey, 0, 1e-12) && near(ex / fx, 4, 1e-9))) fail('the field of a point charge');
}
const opp = { kind: 'points', charges: [{ q: 1, x: -1, y: 0 }, { q: -1, x: 1, y: 0 }] }, box = [-3, 3, -2.2, 2.2];
for (const ln of C.lines(opp, box)) {
  const a = ln[0], b = ln[ln.length - 1], fromPlus = Math.hypot(a[0] + 1, a[1]) < 0.2, toMinus = Math.hypot(b[0] - 1, b[1]) < 0.25, out = Math.abs(b[0]) > 2.9 || Math.abs(b[1]) > 2.1 || Math.abs(a[0]) > 2.9 || Math.abs(a[1]) > 2.1;
  if (!((fromPlus && (toMinus || out)) || (toMinus && out))) { fail('a field line does not run from + to −'); break; }
}
// the cosine of the angle between the field and a segment, at its middle
const cosTo = (c, [p, q]) => {
  const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], f = C.field(c, ...m), t = [q[0] - p[0], q[1] - p[1]];
  return Math.hypot(...t) < 1e-4 ? 0 : (f[0] * t[0] + f[1] * t[1]) / (Math.hypot(...f) * Math.hypot(...t) || 1);
};
for (const key of ['point', 'dipole', 'like']) {
  const { c, lv } = X.EQ[key];
  if (C.contours(c, box, lv, { n: 70 }).slice(0, 400).some((s) => Math.abs(cosTo(c, s)) > 0.15)) fail(`an equipotential of ${key} is not perpendicular to the field`);
}
{
  // the capacitor as drawn: between the plates, the lines along the field, the equipotentials across it
  const cap = X.CAP(1), inner = (ln) => ln.filter(([x, y]) => Math.abs(x) < 1.65 && Math.abs(y) < 0.7);
  const pieces = (lns) => lns.flatMap((ln) => { const d = ln.length === 2 ? Array.from({ length: 9 }, (z, k) => [ln[0][0] + ((ln[1][0] - ln[0][0]) * k) / 8, ln[0][1] + ((ln[1][1] - ln[0][1]) * k) / 8]) : ln, p = inner(d); return p.slice(1).map((q, i) => [p[i], q]); });
  if (pieces(X.capLines(cap)).some((s) => cosTo(cap, s) < 0.95)) fail('a field line of the capacitor drawing is not along the field');
  if (pieces(X.capEqui(cap)).some((s) => Math.abs(cosTo(cap, s)) > 0.1)) fail('an equipotential of the capacitor drawing is not across the field');
}
{
  // between the plates straight from + to −, and much stronger than at the same distance outside
  const cap = X.CAP(1), inside = [[0, 0], [0.6, 0.4], [-1, -0.3], [1.2, 0]].map(([x, y]) => C.field(cap, x, y)), out = Math.hypot(...C.field(cap, 0, 2));
  if (inside.some(([ex, ey]) => !(ey < 0 && Math.abs(ex) < 0.1 * -ey))) fail('the field of a capacitor does not point from plate to plate');
  if (out > -inside[0][1] / 3) fail('the field outside a capacitor is not weak');
}

{
  // plates and charges: the field is minus the gradient of the potential; the plates are metal: each
  // one potential, the field leaving it at right angles; in the middle of a wide lone plate the charge
  // is 2/π of its average (it crowds at the edges, as on a conducting strip), so the field is 4·s;
  // the drawn equipotentials are across the field and the field lines start on a positive charge or a
  // plate (or come in from the edge), and end on a negative charge or a plate (or leave)
  for (const cf of X.MIX) for (const flip of [false, true]) {
    const c = X.mixConf(cf, flip, flip), tag = `mixed ${cf.id}${flip ? ' flipped' : ''}`, h = 1e-5;
    for (const [x, y] of [[0.7, 0.9], [-2.1, -0.4], [1.6, -1.9], [2.6, 1.7]]) {
      const f = C.field(c, x, y), g = [-(C.potential(c, x + h, y) - C.potential(c, x - h, y)) / (2 * h), -(C.potential(c, x, y + h) - C.potential(c, x, y - h)) / (2 * h)];
      if (Math.hypot(f[0] - g[0], f[1] - g[1]) > 1e-4 * (1 + Math.hypot(...f))) { fail(`${tag}: the field is not minus the gradient of the potential`); break; }
    }
    // (not near a point where the field vanishes: there the grid cannot follow the saddle)
    // (nor at the edges of the plates, where the field grows without end)
    const strong = ([p, q]) => { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; return Math.hypot(...C.field(c, ...m)) > 0.8 && c.plates.every((pl) => Math.hypot(m[0] - pl.a, m[1] - pl.y) > 0.25 && Math.hypot(m[0] - pl.b, m[1] - pl.y) > 0.25); };
    if (C.contours(c, box, X.levelsOf(c), { n: 70 }).some((sg) => strong(sg) && Math.abs(cosTo(c, sg)) > 0.25)) fail(`${tag}: an equipotential is not across the field`);
    for (const pl of c.plates) {
      const xs = [0.15, 0.35, 0.5, 0.65, 0.85].map((t) => Math.max(pl.a, -3) + t * (Math.min(pl.b, 3) - Math.max(pl.a, -3))), v = xs.map((x) => C.potential(c, x, pl.y));
      if (Math.max(...v) - Math.min(...v) > 1e-3 * (1 + Math.abs(v[0]))) fail(`${tag}: a plate is not one potential`);
      // at its surface, away from its edges (where the field bends round them), within 5°
      for (let x = Math.max(pl.a, -3) + 0.3; x < Math.min(pl.b, 3) - 0.3; x += 0.05) if ([0.03, -0.03].some((d) => { const [ex, ey] = C.field(c, x, pl.y + d); return Math.abs(ex) > Math.tan((5 * Math.PI) / 180) * Math.abs(ey); })) { fail(`${tag}: the field does not leave a plate at right angles`); break; }
    }
    const onPlate = ([x, y]) => c.plates.some((p) => Math.abs(y - p.y) < 0.1 && x >= p.a - 0.05 && x <= p.b + 0.05);
    const onCharge = ([x, y], sg) => c.charges.some((ch) => Math.sign(ch.q) === sg && Math.hypot(x - ch.x, y - ch.y) < 0.25);
    const edge = ([x, y]) => Math.abs(x) > 2.9 || Math.abs(y) > 2.1;
    for (const ln of C.lines(c, box)) {
      const a = ln[0], b = ln[ln.length - 1];
      if (!((onPlate(a) || onCharge(a, 1) || edge(a)) && (onPlate(b) || onCharge(b, -1) || edge(b) || Math.hypot(...C.field(c, ...b)) < 0.05))) { fail(`${tag}: a field line does not run from + to −`); break; }
    }
  }
  const big = { kind: 'mixed', charges: [], plates: [{ y: 0, a: -50, b: 50, s: 0.25 }] }, [ex, ey] = C.field(big, 0.3, 0.2);
  if (!(near(ey, 4 * 0.25, 0.01) && Math.abs(ex) < 0.01)) fail('the field of a large plate');
}

// ---------------------------------------------------------------- the exercises
function checkQuestions(tag, e) {
  for (const q of e.questions) {
    if (q.type === 'multi') {
      if (!q.statements.some((s) => s.ok) || !q.statements.some((s) => !s.ok)) fail(`${tag}: statements all of one kind`);
      if (q.statements.some((s) => !s.why)) fail(`${tag}: a statement without a reason`);
      continue;
    }
    const n = q.options.filter((o) => o.ok).length;
    if (n < 1 || (!q.multi && n !== 1)) fail(`${tag} ${q.key}: ${n} right options`);
    if (q.options.some((o) => !o.ok && !o.why)) fail(`${tag} ${q.key}: a wrong option without a reason`);
    const labels = q.options.map((o) => o.label || o.html);
    if (new Set(labels).size !== labels.length) fail(`${tag} ${q.key}: two options alike`);
  }
}
// the questions of the check (app.js): every question of these types, of the wire and the capacitor only the diagram
const CHECK = { 'lines-pick': null, 'lines-wire': 'd', 'lines-cap': 'd', 'lines-mix': null, 'lines-read': null, 'read-mix': null, 'equi-mix': null, 'dipole-uniform': null, 'dipole-torque': null, 'equi-pick': null, 'lines-equi': null, error: null };
const rightOf = (e, key) => { const q = e.questions.find((x) => x.key === key), o = q.options.find((x) => x.ok); return o.label || o.html; };
const rad = (a) => (a * Math.PI) / 180;
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of X.TYPES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const e = X.make(type, seed), tag = `${type} ${seed} ${lang}`;
      if (bad(json(e))) fail(`${tag}: undefined or NaN`);
      if (!e.hints.length || !e.solution.length) fail(`${tag}: no hints or solution`);
      checkQuestions(tag, e);
      if (type in CHECK) {
        const qs = e.questions.filter((q) => q.type !== 'multi' && (!CHECK[type] || q.key === CHECK[type]));
        if (!qs.length || qs.some((q) => q.options.length !== 4)) fail(`${tag}: a question of the check without four options`);
      }
      if (lang === 'de') continue;
      if (type === 'lines-wire' && rightOf(e, 'E') !== '×1/2') fail(`${tag}: the field of a wire at twice the distance`);
      if (type === 'lines-read' || type === 'read-mix') {
        // the strongest of the four points, independently
        const c = e.p.c || X.pts2([[e.p.qa, -1], [e.p.qb, 1]]), pts = e.p.pts.split(';').map((s) => s.split(',').map(Number));
        const mags = pts.map(([x, y]) => Math.hypot(...C.field(c, x, y))), best = 'PQRS'[mags.indexOf(Math.max(...mags))];
        if (!rightOf(e, 'P').includes(`<b>${best}</b>`)) fail(`${tag}: the strongest point is ${best}`);
        if (rightOf(e, 'sg') !== `A ${e.p.qa > 0 ? '+' : '−'}, B ${e.p.qb > 0 ? '+' : '−'}`) fail(`${tag}: the signs`);
      }
      if (type === 'dipole-uniform') {
        const Ed = e.p.E.split(',').map(Number), a0 = Math.atan2(Ed[1], Ed[0]) + rad(e.p.ang), tz = Math.cos(a0) * Ed[1] - Math.sin(a0) * Ed[0];
        const along = Math.cos(a0) * Ed[0] + Math.sin(a0) * Ed[1];
        const want = Math.abs(tz) < 1e-9 ? (along > 0 ? 'does not turn: it is in a stable equilibrium' : 'does not turn: it is in an unstable equilibrium') : tz > 0 ? 'turns anticlockwise' : 'turns clockwise';
        if (rightOf(e, 'T') !== want) fail(`${tag}: the dipole ${rightOf(e, 'T')}, not ${want}`);
        if (rightOf(e, 'F') !== 'is zero') fail(`${tag}: the net force in a uniform field`);
      }
      if (type === 'dipole-torque') {
        const [fq, fd, fE] = e.p.f.split(',').map(Number), k = (fq * fd * fE * Math.sin(rad(e.p.a2))) / Math.sin(rad(e.p.a1));
        if (rightOf(e, 'M') !== X.frac(Number(k.toPrecision(9)))) fail(`${tag}: the torque factor ${rightOf(e, 'M')}, not ${X.frac(k)}`);
      }
      if (type === 'error' && rightOf(e, 'err') !== X.FEAT[e.p.err]()) fail(`${tag}: the wrong feature`);
    }
  }
}

// ---------------------------------------------------------------- the widened stages
// point charges and a dipole near a charge: at least 10 different exercises each (by their visible
// text); the dipole's answers worked out independently: the nearer end feels the stronger force,
// so the dipole is pulled towards the charge when that end and the charge have opposite signs
{
  const strip = (h) => String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  for (const lang of ['en', 'de']) {
    Lang.set(lang, true);
    for (const type of ['lines-pick', 'dipole-point']) {
      const seen = new Set();
      for (let seed = 1; seed <= 300; seed++) {
        const e = X.make(type, seed), tag = `${type} ${seed} ${lang}`;
        seen.add(strip(e.text + e.questions.map((q) => q.label).join('|')));
        if (bad(json(e))) fail(`${tag}: undefined or NaN`);
        checkQuestions(tag, e);
        if (/[$_]/.test(strip(e.text + e.questions.map((q) => q.label + q.options.map((o) => (o.label || '') + o.why).join(' ')).join(' ') + e.solution.join(' ')))) fail(`${tag}: a raw $ or _ in the text`);
        if (type === 'lines-pick' && e.questions[0].options.length !== 4) fail(`${tag}: not four diagrams`);
        if (type === 'dipole-point' && lang === 'en') {
          const { Q, plusNear, ask = 'F' } = e.p, near = plusNear ? 1 : -1, attract = near * Q < 0;
          const want = { F: attract ? 'towards the charge' : 'away from the charge', end: plusNear ? 'its positive end' : 'its negative end', Q: Q > 0 ? 'positive' : 'negative' }[ask];
          if (rightOf(e, ask) !== want) fail(`${tag}: ${rightOf(e, ask)}, not ${want}`);
          if (ask !== 'F' && !e.text.includes(attract ? 'pulled towards' : 'pushed away from')) fail(`${tag}: the text does not say how the dipole moves`);
          if (rightOf(e, 'free') !== 'attracted') fail(`${tag}: a free dipole is attracted`);
        }
      }
      if (seen.size < 10) fail(`${type} ${lang}: only ${seen.size} different exercises`);
    }
  }
}

// ---------------------------------------------------------------- the sketches of "find the error"
// two polylines cross (away from the charges and the plates, where lines meet anyway)
function crossings(lines, c) {
  const segs = [];
  lines.forEach((ln, k) => { const d = ln.length > 6 ? 3 : 1; for (let i = 0; i + d < ln.length; i += d) segs.push([ln[i], ln[i + d], k]); });
  const away = ([x, y]) => (c.kind === 'plates' ? Math.abs(Math.abs(y) - c.h) > 0.2 : c.charges.every((ch) => Math.hypot(x - ch.x, y - ch.y) > 0.4)) && Math.abs(x) < 3 && Math.abs(y) < 2.2;
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const [p, p2, a] = segs[i], [q, q2, b] = segs[j];
      if (a === b) continue;
      const r = [p2[0] - p[0], p2[1] - p[1]], s = [q2[0] - q[0], q2[1] - q[1]], d = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(d) < 1e-12) continue;
      const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / d, u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / d;
      if (t > 0 && t < 1 && u > 0 && u < 1 && away([p[0] + t * r[0], p[1] + t * r[1]])) n++;
    }
  }
  return n;
}
for (const key of ['dipole', 'like', 'plates']) {
  for (const flip of key === 'dipole' ? [false] : [false, true]) {
    for (const err of [null, ...X.errsOf(key)]) {
      const { c, o } = X.sketch(key, err, flip), tag = `sketch ${key}${flip ? ' flipped' : ''} ${err}`;
      const field = o.equiLines ? o.extra : o.given, n = crossings(field, c);
      if ((err === 'cross') !== (n > 0)) fail(`${tag}: ${n} crossings of field lines`);
      // equipotentials that cross: the circles drawn round each charge (contours of one potential never do)
      if (err === 'eqcross') {
        const rings = (o.centres || []).flatMap(([x, y]) => o.circles.map((rr) => Array.from({ length: 73 }, (z, k) => [x + rr * Math.cos((k * Math.PI) / 36), y + rr * Math.sin((k * Math.PI) / 36)])));
        if (!crossings(rings, c)) fail(`${tag}: no equipotentials cross`);
      }
      // the wrong spacing: outwards from a charge the equipotentials get closer together, between plates they are uneven
      if (err === 'eqspace') {
        if (c.kind === 'plates') { const ys = o.given.map((ln) => ln[0][1]).sort((a, b) => a - b), d = ys.slice(1).map((y, i) => y - ys[i]); if (Math.max(...d) < 1.5 * Math.min(...d)) fail(`${tag}: the equipotentials are evenly spaced`); }
        else {
          // where each level crosses the axis left of the left charge
          const xs = o.equi.filter((v) => v * c.charges[0].q > 0).map((v) => { let x = -1.05; while (x > -3 && (C.potential(c, x, 0) - v) * c.charges[0].q > 0) x -= 0.001; return -1 - x; }).sort((a, b) => a - b);
          const d = xs.slice(1).map((x, i) => x - xs[i]);
          if (!(d[d.length - 1] < d[0])) fail(`${tag}: the equipotentials do not get closer outwards`);
        }
      }
      // the equipotentials along the field lines: the drawn ones mostly parallel to the field
      if (err === 'equi') {
        const segs = o.given.flatMap((ln) => ln.slice(1).map((p, i) => [ln[i], p])).filter(([p]) => Math.abs(p[0]) < 3 && Math.abs(p[1]) < 2.2);
        const along = segs.filter((sg) => Math.abs(cosTo(c, sg)) > 0.9).length;
        if (along < 0.8 * segs.length) fail(`${tag}: the equipotentials do not run along the field lines`);
      }
      if (err === null && o.equi && C.contours(c, box, o.equi, { n: 70 }).slice(0, 300).some((sg) => Math.abs(cosTo(c, sg)) > 0.2)) fail(`${tag}: the right sketch has equipotentials not across the field`);
      if (err === 'end') {
        const ends = field.filter((ln) => { const [x, y] = ln[ln.length - 1]; return Math.abs(x) < 2.8 && Math.abs(y) < 2 && (c.kind === 'plates' ? Math.abs(Math.abs(y) - c.h) > 0.2 : c.charges.every((ch) => Math.hypot(x - ch.x, y - ch.y) > 0.3)); });
        if (!ends.length) fail(`${tag}: no line ends in empty space`);
      }
      if (bad(C.fig(c, o))) fail(`${tag}: undefined or NaN in the drawing`);
    }
  }
}

console.log(`${X.TYPES.length} types × ${SEEDS} seeds in both languages, and the sketches of "find the error"`);
if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
