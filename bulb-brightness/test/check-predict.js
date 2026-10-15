// Verifies the change exercises ("predict, then watch"): run with
// `node bulb-brightness/test/check-predict.js`. For many seeds per level it checks that
// - every exercise has exactly one change (a switch S, or an unscrewed bulb), a closed circuit
//   before it that does not short-circuit the batteries, and the batteries not short-circuited
//   after it either; at least two bulbs to predict, and beyond the easy level not all the same,
// - the brightness change of every bulb (brighter, equal, dimmer, off) holds for bulbs with very
//   different characteristics, found by solving the circuit before and after the change numerically
//   (its own solver, independent of generator.js),
// - the reasons agree with the answers (in series with the gap or bridged: off; connected: brighter),
//   and the powers the animation shows before and after agree with the answers,
// - diagnoseChange() accepts the right answers and recognises the misconceptions (bridged bulb
//   still lit, a bulb in a chain with a gap still lit, the fixed-current model, nothing changes
//   away from the change),
// - the figure before and after renders, with the switch the student flips (data-pw-switch) once,
//   and an unscrewed bulb as an empty socket after the change,
// - the worked example (a bulb in series with a parallel pair, one of the pair unscrewed) gives
//   the classic answers.
'use strict';

const { CHANGE_LEVELS, ANSWERS, generateChange, makeChange, diagnoseChange } = require('../generator.js');
const { circuit } = require('../draw.js');

const SAMPLES = 120;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const clone = (x) => JSON.parse(JSON.stringify(x));

// Bulb characteristics I = g(V), all increasing with g(0) = 0.
const BULBS = {
  'V^0.6 (filament)': (v) => Math.pow(v, 0.6),
  ohmic: (v) => v,
  'V^2.5': (v) => Math.pow(v, 2.5),
  'V/(1+V)': (v) => v / (1 + v),
  'sinh V': (v) => Math.sinh(v),
  'V+V^3': (v) => v + v * v * v,
};

// The circuit as it is, without switches: a closed switch is a wire, an open switch or an
// unscrewed bulb (after) a gap; parts with a gap are cut off (null).
function plainCircuit(node, after) {
  switch (node.t) {
    case 'L': return after && node.out ? null : node;
    case 'W': return node;
    case 'K': return (after ? !node.closed : node.closed) ? { t: 'W' } : null;
    case 'S': { const k = node.kids.map((x) => plainCircuit(x, after)); return k.some((x) => x === null) ? null : { t: 'S', kids: k }; }
    default: { const k = node.kids.map((x) => plainCircuit(x, after)).filter((x) => x !== null); return k.length ? { t: 'P', kids: k } : null; }
  }
}

// Solve a circuit of bulbs with characteristic g by bisection (as in check-generator.js).
function solver(g) {
  const shorted = (n) => n.t === 'W' || (n.t === 'P' ? n.kids.some(shorted) : n.t === 'S' && n.kids.every(shorted));
  const bisect = (f, target, hi) => { let lo = 0; while (f(hi) < target) hi *= 2; for (let k = 0; k < 44; k++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };
  function current(n, v) {
    if (n.t === 'L') return g(v);
    if (n.t === 'P') return n.kids.reduce((s, k) => s + current(k, v), 0);
    return bisect((i) => voltage(n, i), v, 1);
  }
  function voltage(n, i) {
    if (shorted(n)) return 0;
    if (n.t === 'L') return bisect(g, i, 1);
    if (n.t === 'S') return n.kids.reduce((s, k) => s + voltage(k, i), 0);
    return bisect((v) => current(n, v), i, 1);
  }
  return { shorted, bulbs: function bulbs(n, v, out) {
    if (n.t === 'L') out[n.i] = v;
    if (n.t === 'P') n.kids.forEach((k) => bulbs(k, shorted(n) ? 0 : v, out));
    if (n.t === 'S') {
      const i = shorted(n) ? 0 : current(n, v);
      n.kids.forEach((k) => bulbs(k, voltage(k, i), out));
    }
    return out;
  } };
}
const volts = (sol, load, E, n) => (load ? sol.bulbs(load, E, new Array(n).fill(0)) : new Array(n).fill(0));
const change = (b, a) => (a < 1e-6 ? 'off' : Math.abs(a - b) < 1e-6 ? 'equal' : a > b ? 'brighter' : 'dimmer');

function verify(ex, tag) {
  const n = ex.bulbs.length, E = ex.E.n / ex.E.d;
  // one change
  let switches = 0, out = 0;
  (function walk(node) { if (node.t === 'K') switches++; if (node.out) out++; (node.kids || []).forEach(walk); })(ex.load);
  if (switches + out !== 1) fail(`${tag}: ${switches} switches and ${out} unscrewed bulbs`);
  const before = plainCircuit(clone(ex.load), false), after = plainCircuit(clone(ex.load), true);
  const sol = solver((v) => v);
  if (!before) fail(`${tag}: no current before the change`);
  if (before && sol.shorted(before)) fail(`${tag}: batteries short-circuited before`);
  if (after && sol.shorted(after)) fail(`${tag}: batteries short-circuited after`);
  const asked = ex.bulbs.filter((b) => !b.gone);
  if (asked.length < 2) fail(`${tag}: only ${asked.length} bulb to predict`);
  if (ex.bulbs.some((b) => !ANSWERS.includes(b.answer))) fail(`${tag}: undecided bulb`);
  // the answers, for very different bulbs
  for (const [label, g] of Object.entries(BULBS)) {
    const s = solver(g), vb = volts(s, before, E, n), va = volts(s, after, E, n);
    ex.bulbs.forEach((b, i) => {
      const c = change(vb[i], va[i]);
      if (c !== b.answer) fail(`${tag}: ${b.name} is ${c} for ${label} bulbs (${vb[i].toFixed(4)} → ${va[i].toFixed(4)}), not ${b.answer}`);
    });
  }
  // reasons and the animation's powers
  ex.bulbs.forEach((b, i) => {
    if (b.gone && b.answer !== 'off') fail(`${tag}: the unscrewed bulb is not off`);
    if (['chain', 'bridged'].includes(b.by) && b.answer !== 'off') fail(`${tag}: ${b.name} (${b.by}) not off`);
    if (b.by === 'joined' && b.answer !== 'brighter') fail(`${tag}: ${b.name} connected but not brighter`);
    const pb = ex.power.before[i], pa = ex.power.after[i];
    if (change(pb, pa) !== b.answer) fail(`${tag}: ${b.name}: power ${pb} → ${pa} against ${b.answer}`);
  });
  // diagnose
  const right = ex.bulbs.map((b) => (b.gone ? null : b.answer));
  if (diagnoseChange(ex, right).some((c) => c !== 'right')) fail(`${tag}: right answers not accepted`);
  ex.bulbs.forEach((b, i) => {
    if (b.gone) return;
    const wrong = (a) => right.map((x, k) => (k === i ? a : x));
    if (['bridged', 'chain'].includes(b.by)) {
      const c = diagnoseChange(ex, wrong('dimmer'))[i];
      if (c !== (b.by === 'bridged' ? 'short' : 'chain')) fail(`${tag}: lit ${b.by} bulb diagnosed as ${c}`);
    }
    const fixed = b.models.fixedCurrent;
    if (fixed && fixed !== b.answer && diagnoseChange(ex, wrong(fixed))[i] === 'other') fail(`${tag}: fixed-current answer not recognised`);
    if (b.answer !== 'equal' && /^(level\d+|inside)$/.test(b.by) && diagnoseChange(ex, wrong('equal'))[i] === 'other') fail(`${tag}: 'nothing changes' not recognised`);
  });
  // the figures
  for (const afterFig of [false, true]) {
    const svg = circuit(clone(ex.load), clone(ex.pack), (i) => ({ label: `L${i + 1}`, glow: 0.5, live: { i }, gone: afterFig && ex.bulbs[i].gone, hit: ex.x.t === 'L' && ex.x.i === i }),
      { sw: { closed: ex.x.t === 'K' ? afterFig !== ex.x.closed : false, hit: ex.x.t === 'K' } });
    if (!svg.startsWith('<svg') || /NaN|undefined/.test(svg)) fail(`${tag}: diagram`);
    if ((svg.match(/data-pw-switch/g) || []).length !== 1) fail(`${tag}: not one switch to flip`);
    if ((svg.match(/<g /g) || []).length !== (svg.match(/<\/g>/g) || []).length) fail(`${tag}: unbalanced groups`);
    if (afterFig && ex.x.t === 'L' && !svg.includes('class="socket"')) fail(`${tag}: no empty socket`);
  }
  return asked;
}

for (const level of Object.keys(CHANGE_LEVELS)) {
  const t0 = Date.now(), kinds = {}, answers = {}, seen = new Set();
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const tag = `${level} ${seed}`, ex = generateChange(level, seed);
    if (ex.id !== `change-${level}-${seed}`) fail(`${tag}: id ${ex.id}`);
    const again = generateChange(level, seed);
    if (JSON.stringify(again.load) !== JSON.stringify(ex.load)) fail(`${tag}: not the same exercise again`);
    kinds[ex.change] = (kinds[ex.change] || 0) + 1;
    seen.add(JSON.stringify([ex.packKey, ex.load]));
    const asked = verify(ex, tag);
    asked.forEach((b) => { answers[b.answer] = (answers[b.answer] || 0) + 1; });
    if (level !== 'easy' && new Set(asked.map((b) => b.answer)).size < 2) fail(`${tag}: every bulb has the same answer`);
    if (ex.difficulty < 1 || ex.difficulty > 5) fail(`${tag}: difficulty ${ex.difficulty}`);
  }
  if (seen.size < 20) fail(`${level}: only ${seen.size} different circuits`);
  for (const k of ['unscrew', 'bridge', 'close']) if (!kinds[k]) fail(`${level}: no change of kind ${k}`);
  console.log(`${level}: ${SAMPLES} seeds, ${seen.size} distinct circuits, ${Date.now() - t0} ms; changes ${JSON.stringify(kinds)}; answers ${JSON.stringify(answers)}`);
}

// The worked example: L1 in series with L2 ∥ L3, L3 unscrewed.
{
  const ex = makeChange('1', { t: 'S', kids: [{ t: 'L' }, { t: 'P', kids: [{ t: 'L' }, { t: 'L', out: true }] }] }, 'tutor', 'tutor');
  if (!ex) fail('worked example not usable');
  else {
    verify(ex, 'worked example');
    const got = ex.bulbs.map((b) => b.answer).join(' ');
    if (got !== 'dimmer brighter off') fail(`worked example: ${got}`);
  }
}

if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log('Changes OK');
