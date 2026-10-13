// Verifies the random circuit generator: run with `node circuit-trainer/test/check-generator.js`.
// For many seeds per level it checks that
// - every current and voltage agrees with a nodal analysis of the drawn circuit,
// - givens and answers are nice numbers,
// - the worked solution reaches every unknown, using only givens and earlier steps,
// - both diagrams render,
// - the tutorial has a frame for the task, each group, each step and the results,
// - the meters (an ammeter and a voltmeter, one meter in its place, or meters connected the wrong way) show what a
//   nodal analysis of the circuit with nearly ideal meters in it gives.
'use strict';

const { LEVELS, generate, tutorial, meters, meterTutorial, padded, fval } = require('../generator.js');
const { solve } = require('./mna.js');

const SAMPLES = 400;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const isHalf = (x) => close(x * 2, Math.round(x * 2));

function netlist(c) {
  const E = [['V', 'V', 1, 0, fval(c.root.V)]];
  let next = 2;
  (function place(node, a, b) {
    if (node.t === 'R') { E.push(['R', 'n' + node.id, a, b, fval(node.R)]); return; }
    if (node.t === 'P') { node.kids.forEach((k) => place(k, a, b)); return; }
    node.kids.forEach((k, i) => {
      const to = i === node.kids.length - 1 ? b : next++;
      place(k, a, to);
      a = to;
    });
  })(c.root, 1, 0);
  return E;
}

for (const level of Object.keys(LEVELS)) {
  const t0 = Date.now();
  const shapes = new Set(), sizes = {}, stepCounts = [], rules = {};
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const tag = `${level} seed ${seed}`;
    let ex;
    try { ex = generate(level, seed); } catch (e) { fail(`${tag}: ${e.message}`); continue; }
    const c = ex.circuit;

    const s = solve(netlist(c));
    for (const leaf of c.leaves) {
      if (!close(s.i('n' + leaf.id), fval(leaf.I))) fail(`${tag}: I of R${leaf.idx} differs from nodal analysis`);
      if (!close(s.i('n' + leaf.id) * fval(leaf.R), fval(leaf.V))) fail(`${tag}: V of R${leaf.idx} differs`);
    }

    for (const g of ex.givens) {
      const x = fval(c.nodes[Number(g.slice(1))][g[0]]);
      if (!isHalf(x) || x <= 0) fail(`${tag}: given ${g} = ${x} is not nice`);
    }
    for (const f of ex.fields.filter((x) => !x.choice && !x.place)) if (!isHalf(f.value) || f.value <= 0) fail(`${tag}: answer ${f.key} = ${f.value} is not nice`);

    const known = new Set(ex.givens);
    const g = (k) => fval(c.nodes[Number(k.slice(1))][k[0]]);
    for (const st of ex.steps) {
      for (const k of st.from) if (!known.has(k)) fail(`${tag}: step for ${st.key} uses unknown ${k}`);
      if (!st.rel.holds(g)) fail(`${tag}: ${st.rel.rule} step for ${st.key} does not hold numerically`);
      known.add(st.key);
      rules[st.rel.rule] = (rules[st.rel.rule] || 0) + 1;
    }
    if (LEVELS[level].compact && padded(c, ex.givens, ex.targets)) fail(`${tag}: padded circuit`);
    for (const t of ex.targets) {
      if (ex.givens.has(t)) fail(`${tag}: target ${t} is also given`);
      if (!known.has(t)) fail(`${tag}: target ${t} not reached`);
    }

    const lv = LEVELS[level];
    if (c.leaves.length < lv.n[0] || c.leaves.length > lv.n[1]) fail(`${tag}: ${c.leaves.length} resistors`);
    if (ex.steps.length < lv.steps[0] || ex.steps.length > lv.steps[1]) fail(`${tag}: ${ex.steps.length} steps`);

    for (const sol of [false, true]) {
      const html = ex.figure(sol);
      if (!html.includes('<svg') || html.includes('NaN') || html.includes('undefined')) fail(`${tag}: bad figure`);
    }
    for (const t of [...ex.hints, ...ex.solution, ex.text, ex.results]) {
      if (/undefined|NaN|\[object/.test(t)) fail(`${tag}: bad text: ${t.slice(0, 120)}`);
    }

    const tut = tutorial(level, seed);
    const groups = c.nodes.filter((n) => n.t !== 'R').length;
    if (tut.frames.length !== groups + ex.steps.length + 2) fail(`${tag}: ${tut.frames.length} tutorial frames`);
    for (const f of tut.frames) {
      if (!f.figure.includes('<svg') || /undefined|NaN|\[object/.test(f.figure + f.text)) fail(`${tag}: bad tutorial frame: ${f.text.slice(0, 120)}`);
    }

    shapes.add(JSON.stringify(c.root, (k, v) => (['t', 'kids'].includes(k) || k === '' || /^\d+$/.test(k) ? v : undefined)));
    sizes[c.leaves.length] = (sizes[c.leaves.length] || 0) + 1;
    stepCounts.push(ex.steps.length);
  }
  const ms = (Date.now() - t0) / SAMPLES;
  const avg = stepCounts.reduce((a, b) => a + b, 0) / stepCounts.length;
  console.log(`${level}: ${shapes.size} topologies, resistors ${JSON.stringify(sizes)}, ` +
    `solution steps ${Math.min(...stepCounts)}–${Math.max(...stepCounts)} (avg ${avg.toFixed(1)}), ${ms.toFixed(1)} ms/exercise`);
  const total = Object.values(rules).reduce((a, b) => a + b, 0);
  console.log('  rules used: ' + Object.entries(rules).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${Math.round((100 * n) / total)}%`).join(', '));
}

// The tutor examples: their paths must work, and every step must hold numerically.
for (const [i, e] of require('../lessons.js').EXAMPLES.entries()) {
  const tag = `tutor example ${i + 1} (${e.name.en})`;
  let tut;
  try { tut = (e.meters ? meterTutorial : tutorial)(e.level, e.seed, e.path); } catch (err) { fail(`${tag}: ${err.message}`); continue; }
  const c = tut.circuit, g = (k) => fval(c.nodes[Number(k.slice(1))][k[0]]);
  for (const st of tut.steps) if (!st.rel.holds(g)) fail(`${tag}: ${st.rel.rule} step for ${st.key} does not hold`);
  for (const f of tut.frames) if (/undefined|NaN|\[object/.test(f.figure + f.text)) fail(`${tag}: bad frame: ${f.text.slice(0, 120)}`);
  console.log(`${tag}: ${tut.frames.length} frames`);
}

// Meters: the circuit with nearly ideal meters in it (an ammeter of 1e-7 kΩ, a voltmeter of 1e9 kΩ):
// in series with a resistor, across it, or in the main line beside the battery.
const RA = 1e-7, RV = 1e9;
function meterNetlist(c, ms) {
  const E = [], main = ms.find((m) => m.at === 0 && !m.across);
  let next = 3;
  if (main) { E.push(['V', 'V', 2, 0, fval(c.root.V)], ['R', 'M' + main.m, 2, 1, main.m === 'A' ? RA : RV]); } else E.push(['V', 'V', 2, 0, fval(c.root.V)], ['R', 'w0', 2, 1, RA]); // (node 2 in use either way)
  const bat = ms.find((m) => m.at === 0 && m.across);
  if (bat) E.push(['R', 'M' + bat.m, main ? 2 : 1, 0, bat.m === 'A' ? RA : RV]);
  (function place(node, a, b) {
    if (node.t === 'R') {
      const ser = ms.find((m) => m.at === node.id && !m.across), acr = ms.find((m) => m.at === node.id && m.across);
      if (ser) { const mid = next++; E.push(['R', 'n' + node.id, a, mid, fval(node.R)], ['R', 'M' + ser.m, mid, b, ser.m === 'A' ? RA : RV]); } else E.push(['R', 'n' + node.id, a, b, fval(node.R)]);
      if (acr) E.push(['R', 'M' + acr.m, a, b, acr.m === 'A' ? RA : RV]);
      return;
    }
    if (node.t === 'P') { node.kids.forEach((k) => place(k, a, b)); return; }
    node.kids.forEach((k, i) => {
      const to = i === node.kids.length - 1 ? b : next++;
      place(k, a, to);
      a = to;
    });
  })(c.root, 1, 0);
  return E;
}
const kinds = {};
for (const stage of ['read', 'place', 'wrong']) {
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const tag = `meters ${stage} seed ${seed}`;
    let ex;
    try { ex = meters(stage, seed); } catch (e) { fail(`${tag}: ${e.message}`); continue; }
    kinds[`${stage}:${ex.kind}:${ex.level}`] = (kinds[`${stage}:${ex.kind}:${ex.level}`] || 0) + 1;
    const s = solve(meterNetlist(ex.circuit, ex.meters));
    for (const m of ex.meters) {
      const shown = m.m === 'A' ? Math.abs(s.i('M' + m.m)) : Math.abs(s.i('M' + m.m)) * RV;
      if (!(Math.abs(shown - m.value) <= 1e-3 * Math.max(1, m.value))) fail(`${tag}: the ${m.m} meter shows ${shown}, not ${m.value}`);
      if (m.key && Math.abs(fval(ex.circuit.nodes[Number(m.key.slice(1))][m.key[0]]) - m.value) > 1e-9) fail(`${tag}: reading of ${m.m} is not ${m.key}`);
    }
    if (stage === 'read' && !(ex.meters.length === 2 && ex.meters.every((m) => m.key))) fail(`${tag}: not an ammeter and a voltmeter in their places`);
    if (stage === 'place') {
      // every spot: a meter there that counts as right shows the quantity asked for and changes
      // no current in the circuit; the spot of the meter in the figure counts as right
      const how = ex.fields.find((f) => f.place), m = ex.meters[0], target = ex.fields.find((f) => !f.place).value;
      if (ex.meters.length !== 1 || !m.key || !how || how.value !== (m.across ? 'a' : 's') + m.at || !ex.placeCheck(how.value).ok) fail(`${tag}: not one meter in its place, with the spot asked`);
      const base = solve(meterNetlist(ex.circuit, [])), Is = (sol) => ex.circuit.leaves.map((n) => Math.abs(sol.i('n' + n.id)));
      for (const id of ex.slots) {
        const at = id === 'main' || id === 'battery' ? 0 : Number(id.slice(1)), across = id === 'battery' || id[0] === 'a';
        const sol = solve(meterNetlist(ex.circuit, [{ m: m.m, at, across }]));
        const shown = m.m === 'A' ? Math.abs(sol.i('M' + m.m)) : Math.abs(sol.i('M' + m.m)) * RV;
        const same = Is(sol).every((x, k) => Math.abs(x - Is(base)[k]) < 1e-3 * Math.max(1, x)), right = same && Math.abs(shown - target) < 1e-3 * Math.max(1, target);
        const r = ex.placeCheck(id);
        if (r.ok && !right) fail(`${tag}: spot ${id} counts as right, but the meter there shows ${shown}${same ? '' : ' and changes the circuit'}`);
        if (!r.ok && !r.why) fail(`${tag}: spot ${id} is wrong without a reason`);
        if (!r.ok && right) fail(`${tag}: spot ${id} counts as wrong, but the meter there shows the quantity and changes nothing`);
        const html = ex.placeFig(id);
        if (!html.includes('<svg') || /NaN|undefined/.test(html) || (html.match(/class="slot"/g) || []).length !== ex.slots.length - 1) fail(`${tag}: bad figure with the meter at ${id}`);
      }
    }
    for (const f of ex.fields.filter((x) => !x.choice && !x.place)) if (!isHalf(f.value) || f.value < 0 || (f.value === 0 && ex.kind !== 'vseries')) fail(`${tag}: reading ${f.key} = ${f.value} is not nice`);
    const known = new Set(ex.givens), g = (k) => fval(ex.circuit.nodes[Number(k.slice(1))][k[0]]);
    for (const st of ex.steps) {
      for (const k of st.from) if (!known.has(k)) fail(`${tag}: step for ${st.key} uses unknown ${k}`);
      if (!st.rel.holds(g)) fail(`${tag}: ${st.rel.rule} step for ${st.key} does not hold numerically`);
      known.add(st.key);
    }
    for (const sol of [false, true]) {
      const html = ex.figure(sol, 'A');
      if (!html.includes('<svg') || /NaN|undefined/.test(html) || (html.match(/class="lbl meter-l"/g) || []).length !== (stage === 'place' && !sol ? 0 : ex.meters.length)) fail(`${tag}: bad figure`);
    }
    if (!ex.plain(ex.circuit.leaves[0].id).includes('<svg')) fail(`${tag}: bad plain figure`);
    for (const t of [...ex.hints, ...ex.solution, ex.text, ex.results]) if (/undefined|NaN|\[object/.test(t)) fail(`${tag}: bad text: ${t.slice(0, 120)}`);
  }
}
console.log('meters: ' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '));

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nGenerator OK');
