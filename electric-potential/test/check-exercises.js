// Verifies Electric Potential: run with `node electric-potential/test/check-exercises.js`. It checks
// - the physics, independently: in a uniform field ΔV = −E·Δx (only the distance along the field
//   counts); the field and potential at the centre of each arrangement (fields add as vectors,
//   potentials as numbers); a test charge changes the potential energy, not the potential or the
//   voltage; V_AB = V_B − V_A (from A to B); ΔE_pot = q·ΔV; a particle released at rest moves the way its sign says,
// - for every type, in both languages and many seeds: each question has a right option (exactly one
//   unless several may fit), a reason for each wrong one, distinct options; statements are mixed,
//   and no text or drawing contains undefined, NaN and the like,
// - the check: every kind of every objective gives questions with four options, exactly one right,
// - the notation: no question asks for a difference of two potentials (V_A − V_B gives the way
//   away: it asks for V_AB); the German texts write the potential Φ and the voltage U, the English
//   ones the potential V and no U; every index is a subscript (no "V_A" left in the text).
'use strict';

const Lang = require('../lang.js');
const C = require('../charges.js');
const X = require('../exercises.js');

let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (html) => /undefined|NaN|\[object|Infinity|[(=:]null\b/.test(html);
const json = (e) => JSON.stringify(e, (k, v) => (typeof v === 'function' ? undefined : v));
const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-30);
const SEEDS = 60;
const num = (label) => { const t = label.replace(/−/g, '-').replace('+', ''); const m = t.match(/^(-?[\d.]+)(?: · 10<sup>(-?\d+)<\/sup>)?/); return m ? Number(m[1]) * (m[2] ? 10 ** Number(m[2]) : 1) : NaN; };
const right = (e, key) => { const q = e.questions.find((x) => x.key === key); return q.options.find((o) => o.ok); };

// signed number options: as many positive as negative ones (the sign must not give the answer away)
function checkSigns(tag, q) {
  const labs = q.options.map((o) => String(o.label || '')), pos = labs.filter((x) => /^\+\d/.test(x)).length, neg = labs.filter((x) => /^[−-]\d/.test(x)).length;
  if (pos + neg >= 3 && pos !== neg) fail(`${tag} ${q.key}: ${pos} positive and ${neg} negative options`);
}
function checkQuestions(tag, e) {
  for (const q of e.questions) {
    if (q.type === 'multi') {
      if (!q.statements.some((s) => s.ok) || !q.statements.some((s) => !s.ok)) fail(`${tag}: statements all of one kind`);
      if (q.statements.some((s) => !s.why)) fail(`${tag}: a statement without a reason`);
      continue;
    }
    checkSigns(tag, q);
    const n = q.options.filter((o) => o.ok).length;
    if (n < 1 || (!q.multi && n !== 1)) fail(`${tag} ${q.key}: ${n} right options`);
    if (q.options.some((o) => !o.ok && !o.why)) fail(`${tag} ${q.key}: a wrong option without a reason`);
    const labels = q.options.map((o) => o.label || o.html);
    if (new Set(labels).size !== labels.length) fail(`${tag} ${q.key}: two options alike`);
  }
}
// the notation of a text (HTML) in a language; ask: the text asks a question
const strip = (h) => String(h).replace(/<[^>]*>/g, '');
const unsub = (h) => String(h).replace(/<sub>([^<]*)<\/sub>/g, '_$1');
const DIFF = /[VΦ]_[A-Za-z0-9]+\s*[−-]\s*[VΦ]_[A-Za-z0-9]/, DIFF0 = /\b[VΦ][A-Z]{1,2}\s*[−-]\s*[VΦ][A-Z]\b/;
function notation(tag, lang, html, ask) {
  const t = strip(html);
  if (ask && (DIFF.test(html) || DIFF.test(unsub(html)) || DIFF0.test(t))) fail(`${tag}: the question asks for a difference of potentials: ${t}`);
  if (/[A-Za-zΦ]_[A-Za-z0-9]/.test(t)) fail(`${tag}: an index not set as a subscript: ${t}`);
  if (lang === 'de') {
    if (/V(_|<sub>|₀)|ΔV|dV\//.test(html)) fail(`${tag}: V for a potential in German: ${t}`);
    // V only as the unit: after a number, a bracket or "in"
    const m = t.match(/(^|.{0,3})\bV\b(?!\/)/g);
    if (m && m.some((x) => !/(\d|\)|\bin) ?V$/.test(x.replace(/\s+V$/, ' V')))) fail(`${tag}: V for a potential in German: ${t}`);
  } else if (/\bU\s*=|\bU(<sub>|_)|ΔU|Φ/.test(html)) fail(`${tag}: U or Φ in English: ${t}`);
}
function texts(e) {
  const out = [[e.text, true], [e.figs || '', false], [e.solFig || '', false], ...e.hints.map((h) => [h, false]), ...e.solution.map((h) => [h, false])];
  for (const q of e.questions) {
    out.push([q.label, true]);
    for (const o of q.options || []) out.push([o.label || o.html, false], [o.why || '', false]);
    for (const s of q.statements || []) out.push([s.html, true], [s.why, false]);
  }
  return out;
}

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of X.TYPES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const e = X.make(type, seed), tag = `${type} ${seed} ${lang}`;
      if (bad(json(e))) fail(`${tag}: undefined or NaN`);
      if (!e.hints.length || !e.solution.length) fail(`${tag}: no hints or solution`);
      checkQuestions(tag, e);
      texts(e).forEach(([h, ask], i) => notation(`${tag} text ${i}`, lang, h, ask));
      if (lang === 'de') continue;
      if (type === 'uniform-d') {
        const { Ef, ax, bx } = e.p, want = -Ef * (bx - ax) / 100;
        if (!rel(num(right(e, 'U').label), want, 1e-3)) fail(`${tag}: V_AB is not −E·Δx`);
      }
      if (type === 'points-v') {
        // independently: V_AC = V_C − V_A, the potentials read off the labelled lines
        const { step, V0, pick } = e.p, V = (i) => V0 + (5 - Number(pick[i])) * step;
        if (num(right(e, 'U').label) !== V(2) - V(0)) fail(`${tag}: V_AC ${right(e, 'U').label}, not V_C − V_A = ${V(2) - V(0)} V`);
      }
      if (type === 'scalar') {
        const S = X.SC.find((s) => s.id === e.p.S), ch = S.c.map(([q, x, y]) => ({ q, x: e.p.flip ? y : x, y: e.p.flip ? -x : y })), c = { kind: 'points', charges: ch };
        const V = C.potential(c, 0, 0), Ef = C.field(c, 0, 0), zeroE = Math.hypot(...Ef) < 1e-9;
        const wantV = Math.abs(V) < 1e-9 ? 'zero' : V > 0 ? 'positive' : 'negative';
        if (right(e, 'V').label !== wantV) fail(`${tag}: the potential at the centre`);
        if (zeroE !== right(e, 'E').html.includes('nowhere')) fail(`${tag}: the field at the centre`);
      }
      if (type === 'which-qty') {
        // independently: V and U belong to the points, V_PQ = V_Q − V_P, E_pot = q′·V_P
        const { VP, VQ, q, k } = e.p, val = (key) => num(right(e, key).label);
        if (val('V') !== VP || val('U') !== VQ - VP || val('Ep') !== k * q * VP) fail(`${tag}: potential, energy or voltage`);
      }
      if (type === 'gain-lose') {
        const { step, V0, ia, ib, pt } = e.p, V = (i) => V0 + (5 - i) * step, z = { p: 1, 'e+': 1, a: 2, na: 1, e: -1, cl: -1 }[pt], dE = z * (V(ib) - V(ia));
        const lab = right(e, 'Ep').label;
        if (!lab.includes(String(Math.abs(dE))) || lab.startsWith('increases') !== dE > 0) fail(`${tag}: ΔE_pot ${lab}, not ${dE} eV`);
        if (right(e, 'K').label !== (dE < 0 ? 'increases' : 'decreases')) fail(`${tag}: the kinetic energy`);
      }
      if (type === 'point-v') {
        // independently: V = k·Q/r in units of V₀ = k·q/r
        const { sQ, k, m, s2 } = e.p, VP = sQ + m / s2, lab = right(e, 'P').label.replace('−', '-').replace('·', '').replace('V₀', '');
        const [n, d] = (/^[+-]$/.test(lab) ? lab + '1' : lab).split('/').map(Number), got = d ? n / d : n;
        if (!rel(got, VP, 1e-9)) fail(`${tag}: the potential at P ${right(e, 'P').label}, not ${VP}`);
        if (right(e, 'V').label !== X.frac(1 / k)) fail(`${tag}: the factor for B`);
        // V_AB = V_B − V_A, with A at r and B at k·r from Q
        const ab = right(e, 'U').label.replace('−', '-').replace('·', '').replace('V₀', ''), [n2, d2] = (/^[+-]$/.test(ab) ? ab + '1' : ab).split('/').map(Number);
        if (!rel(d2 ? n2 / d2 : n2, sQ / k - sQ, 1e-9)) fail(`${tag}: V_AB ${right(e, 'U').label}, not V_B − V_A = ${sQ / k - sQ}`);
      }
      if (type === 'which-way') {
        const { q, Vl, Vr } = e.p, toRight = q > 0 ? Vl > Vr : q < 0 ? Vr > Vl : null, html = right(e, 'm').html;
        const want = toRight === null ? 'it stays' : toRight ? 'to the right' : 'to the left';
        if (!html.includes(want)) fail(`${tag}: the particle moves the wrong way`);
      }
    }
  }
  // the stage "scalar, not vector": at least 12 exercises that read differently, none with a raw $ or _
  {
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      const e = X.make('scalar', seed), t = e.text + e.questions.map((q) => q.options.map((o) => strip(o.label || o.html)).sort().join(',')).join('|');
      seen.add(t);
      if (/[$_]/.test(strip(t + e.solution.join('')))) fail(`scalar ${seed} ${lang}: a raw $ or _`);
    }
    if (seen.size < 12) fail(`scalar ${lang}: only ${seen.size} different exercises`);
  }
  // the check: each kind of each objective, many seeds
  for (const o of X.OBJECTIVES) {
    if (!o.name() || !o.kinds.length) fail(`objective ${o.id}: no name or kinds`);
    if (/[<_]/.test(o.name())) fail(`objective ${o.id}: markup or an index in its name (shown as plain text)`);
    notation(`objective ${o.id}`, lang, o.name(), false);
    for (const kind of o.kinds) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = X.question(kind, seed), tag = `check ${kind} ${seed} ${lang}`;
        if (q.options.length !== 4 || q.options.filter((x) => x.correct).length !== 1) fail(`${tag}: ${q.options.length} options, ${q.options.filter((x) => x.correct).length} right`);
        if (new Set(q.options.map((x) => x.html)).size !== 4) fail(`${tag}: two options alike`);
        if (q.options.some((x) => !x.correct && !x.why)) fail(`${tag}: a wrong option without a reason`);
        if (bad(json(q)) || bad(q.explain()) || !q.ask) fail(`${tag}: undefined or NaN`);
        notation(`${tag} ask`, lang, `${q.text} ${q.ask}`, true);
        notation(`${tag} figure`, lang, q.figure, false);
        notation(`${tag} explanation`, lang, q.explain(), false);
        q.options.forEach((o, i) => { notation(`${tag} option ${i}`, lang, o.html, false); notation(`${tag} why ${i}`, lang, o.why || '', false); });
      }
    }
  }
}
console.log(`${X.TYPES.length} types × ${SEEDS} seeds and ${X.OBJECTIVES.length} objectives of the check, in both languages`);
if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
