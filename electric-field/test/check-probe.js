// Verifies the probe exercises of Field Lines and Equipotentials (probe.js): run with
// `node electric-field/test/check-probe.js`. It checks, for both types, in both languages and
// seeds 1 to 80,
// - no text, drawing or data contains undefined, NaN and the like; hints, a solution and a solFig;
//   the figure carries its probe data (the configuration, the box, W, the kind),
// - each question has exactly one right option, four options (the capacitor's plate question
//   too), distinct labels, a reason for every wrong option,
// - the right answers, worked out independently from p with Coulomb's law: the charges (signs and
//   sizes); the zero point really has |E| < 1e-3 of the field at the other three points, and those
//   are not zero; the capacitor's field equals ΔV/Δd of two probe readings; the field at P points
//   from high to low potential (along −grad V, found numerically); the probe's readings agree with
//   Coulomb's law,
// - at least 10 different exercises per type.
'use strict';

const Lang = require('../lang.js');
const C = require('../charges.js');
const Probe = require('../probe.js');

let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (html) => /undefined|NaN|\[object|Infinity|[(=:]null\b/.test(html);
const json = (e) => JSON.stringify(e, (k, v) => (typeof v === 'function' ? undefined : v));
const SEEDS = 80, K = 8.99e9;
const sz = (q) => `${q > 0 ? '+' : '−'}${Math.abs(q) === 1 ? '' : Math.abs(q)}q`;
// the field (N/C) and the potential (V) of point charges (in nC, positions in cm), independently
const charges = (p) => [{ q: p.qa, x: p.xa, y: p.y0 }, { q: p.qb, x: p.xb, y: p.y0 }];
function coulomb(cs, x, y) {
  let ex = 0, ey = 0, v = 0;
  for (const c of cs) {
    const dx = (x - c.x) / 100, dy = (y - c.y) / 100, r = Math.hypot(dx, dy);
    ex += (K * c.q * 1e-9 * dx) / r ** 3; ey += (K * c.q * 1e-9 * dy) / r ** 3; v += (K * c.q * 1e-9) / r;
  }
  return { E: [ex, ey], mag: Math.hypot(ex, ey), V: v };
}
const dataOf = (e) => {
  const m = /data-probe="([^"]*)"/.exec(e.figs);
  return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) : null;
};

for (const type of Object.keys(Probe.TYPES)) {
  const [difficulty, make] = Probe.TYPES[type];
  if (difficulty !== 3) fail(`${type}: difficulty ${difficulty}`);
  const seen = new Set();
  for (const lang of ['en', 'de']) {
    Lang.set(lang, true);
    for (let seed = 1; seed <= SEEDS; seed++) {
      const e = make(seed), tag = `${type} ${seed} ${lang}`;
      for (const k of ['kind', 'title', 'text', 'figs', 'questions', 'hints', 'solution', 'solFig', 'p']) if (!(k in e)) fail(`${tag}: no ${k}`);
      if (bad(json(e))) fail(`${tag}: undefined or NaN`);
      if (e.hints.length < 2 || e.hints.length > 3 || !e.solution.length || !e.solFig) fail(`${tag}: hints, solution or solFig`);
      if (lang === 'de' && /ß/.test(json(e))) fail(`${tag}: ß instead of ss`);
      const noId = (s) => s.replace(/(efc|gc)\d+/g, "");
      if (noId(make(seed).figs) !== noId(e.figs)) fail(`${tag}: not deterministic`);
      seen.add(json(e.p));
      const d = dataOf(e);
      if (!d || !d.c || !d.box || !d.W || !d.H || !d.region || d.kind !== (type === 'probe-field' ? 'field' : 'pot')) { fail(`${tag}: no probe data`); continue; }
      if (!/tabindex="0"/.test(e.figs) || !/aria-live/.test(e.figs) || !/probe-clear/.test(e.figs)) fail(`${tag}: the figure is not a probe figure`);
      for (const q of e.questions) {
        const n = q.options.filter((o) => o.ok).length;
        if (n !== 1) fail(`${tag} ${q.key}: ${n} right options`);
        if (q.options.length !== 4) fail(`${tag} ${q.key}: ${q.options.length} options`);
        if (q.options.some((o) => !o.ok && !o.why)) fail(`${tag} ${q.key}: a wrong option without a reason`);
        if (q.options.some((o) => !o.ok && !o.tag)) fail(`${tag} ${q.key}: a wrong option without a tag`);
        const labels = q.options.map((o) => o.label || o.html);
        if (new Set(labels).size !== labels.length) fail(`${tag} ${q.key}: two options alike`);
      }
      const right = (key) => { const q = e.questions.find((x) => x.key === key); return q && q.options.find((o) => o.ok); };
      const p = e.p;
      // the charges are hidden in the drawing: no signs, all of one size
      if (p.qa != null) {
        if (/class="charge (pos|neg)/.test(e.figs) || new Set((e.figs.match(/class="charge[^"]*"[^>]*r="([\d.]+)"/g) || []).map((s) => s.replace(/.*r="/, ''))).size > 1) fail(`${tag}: the drawing shows the charges`);
        if (!right('q') || right('q').label !== `A: ${sz(p.qa)}, B: ${sz(p.qb)}`) fail(`${tag}: the charges`);
        if (![1, 2, 3].includes(Math.abs(p.qa)) || ![1, 2, 3].includes(Math.abs(p.qb))) fail(`${tag}: sizes`);
        // the probe agrees with Coulomb's law
        for (const [x, y] of [[0.3, 1.7], [-2.1, -1.2], [1.4, -0.9]]) {
          const a = Probe.measure(d, x, y), b = coulomb(charges(p), x, y);
          if (!a.near && (Math.abs(a.mag - b.mag) > 1e-6 * b.mag || Math.abs(a.V - b.V) > 1e-6 * Math.abs(b.V) + 1e-9)) fail(`${tag}: the probe reads ${a.mag}, ${a.V}, Coulomb ${b.mag}, ${b.V}`);
        }
      }
      if (type === 'probe-field') {
        const mags = p.pts.map(([x, y]) => coulomb(charges(p), x, y).mag), z = mags[p.zero], others = mags.filter((m, i) => i !== p.zero);
        if (!(z < 1e-3 * Math.min(...others))) fail(`${tag}: |E| at the zero point ${z}, at the others ${others.map(Math.round)}`);
        if (Math.min(...others) < 1000) fail(`${tag}: another point has almost no field (${Math.min(...others)} N/C)`);
        const ok = right('zero');
        if (!ok || !ok.html.includes(`<b>${'PQRS'[p.zero]}</b>`)) fail(`${tag}: the zero point`);
        // all points inside the drawing, apart, away from the charges
        p.pts.forEach(([x, y], i) => {
          if (x < -2.7 || x > 2.6 || Math.abs(y) > 2) fail(`${tag}: a point outside`);
          if (charges(p).some((c) => Math.hypot(x - c.x, y - c.y) < 0.45)) fail(`${tag}: a point on a charge`);
          if (p.pts.some(([u, v], j) => j !== i && Math.hypot(x - u, y - v) < 0.55)) fail(`${tag}: two points too close`);
        });
        // the nudges do not give the zero point away
        for (const o of e.questions.find((q) => q.key === 'zero').options) if (!o.ok && (!o.nudge || o.nudge.includes(`<b>${'PQRS'[p.zero]}</b>`))) fail(`${tag}: a nudge missing or giving it away`);
      } else {
        // the field at P: along −grad V, numerically
        const h = 1e-4, V = (x, y) => (p.kind === 'plates' ? Probe.measure(d, x, y).V : coulomb(charges(p), x, y).V);
        const [x, y] = p.P, g = [-(V(x + h, y) - V(x - h, y)) / (2 * h), -(V(x, y + h) - V(x, y - h)) / (2 * h)], gm = Math.hypot(...g);
        const cos = (g[0] * p.dir[0] + g[1] * p.dir[1]) / (gm * Math.hypot(...p.dir));
        if (!(cos > Math.cos((2 * Math.PI) / 180))) fail(`${tag}: the field at P is not along −grad V (cos ${cos})`);
        if (!right('dir') || right('dir').html !== `<span class="dtile">${C.icon(p.dir)}</span>`) fail(`${tag}: the right direction tile`);
        // the field points from high to low potential: a step along it lowers V
        if (!(V(x + 0.05 * p.dir[0], y + 0.05 * p.dir[1]) < V(x - 0.05 * p.dir[0], y - 0.05 * p.dir[1]))) fail(`${tag}: the field does not point to lower potential`);
        if (p.kind === 'plates') {
          // the ideal capacitor: the lower plate at 0 V, the upper at U; the field from two readings
          if (Math.abs(Probe.measure(d, 0, -p.h).V) > 1e-9 || Math.abs(Probe.measure(d, 0.7, p.h).V - p.U) > 1e-9) fail(`${tag}: the plates' potentials`);
          for (const [y1, y2] of [[-p.h + 0.2, p.h - 0.1], [-0.3, 0.4], [0, p.h]]) {
            const dV = Probe.measure(d, 1.1, y2).V - Probe.measure(d, -0.6, y1).V, Ed = Math.abs(dV) / ((y2 - y1) / 100);
            if (Math.abs(Ed - right('E').value) > 1e-6 * Ed) fail(`${tag}: ΔV/Δd = ${Ed}, the answer ${right('E').value}`);
          }
          const posName = p.U > 0 ? p.top : p.top === 'A' ? 'B' : 'A';
          if (!right('pos').label.startsWith(posName)) fail(`${tag}: the positive plate`);
          if (Probe.measure(d, 0, p.h + 0.3).out !== true) fail(`${tag}: the probe measures outside the plates`);
        }
      }
    }
  }
  if (seen.size < 10) fail(`${type}: only ${seen.size} different exercises`);
  console.log(`${type}: ${seen.size} different exercises in ${SEEDS} seeds`);
}

// the potential probe shows both arrangements
{
  const kinds = new Set();
  for (let s = 1; s <= SEEDS; s++) kinds.add(Probe.TYPES['probe-pot'][1](s).p.kind);
  if (kinds.size !== 2) fail('probe-pot: not both the charges and the capacitor');
}

if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
