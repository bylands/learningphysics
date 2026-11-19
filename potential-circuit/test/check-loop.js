// Verifies the circuits, exercises, check questions and worked examples: run with
// `node potential-circuit/test/check-loop.js`. For many seeds of every type it checks that
// - the potentials follow the rules (up from − to + across a battery, down across a lamp in the
//   direction of the current, the same along a wire) and come back to 0 V at A,
// - the answers are whole volts (and whole multiples of 100 mA), the junction rule holds,
// - a voltage U_XY is φ_Y − φ_X, the second potential minus the first,
// - a "find the error" sketch differs from the right one in exactly the step it calls wrong,
// - every choice has exactly one right option, texts and figures render (in English and German),
// - every stage has enough different exercises,
// and that every kind of every objective of the check gives four distinct options, one right,
// with known misconception flags.
'use strict';

const Lang = require('../lang.js');
const Lp = require('../loop.js');
const Check = require('../check.js');

const SAMPLES = 300;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (t) => /undefined|NaN|\[object|null/.test(t);

function checkCircuit(c, tag) {
  if (c.points[0].name !== 'A' || c.points[0].phi !== 0) fail(`${tag}: A is not at 0 V`);
  c.steps.forEach((s) => {
    const a = c.points[s.from].phi, b = s.to ? c.points[s.to].phi : 0;
    const want = !s.el ? 0 : s.el.t === 'bat' ? (s.el.up ? s.el.V : -s.el.V) : -s.el.V;
    if (b - a !== want) fail(`${tag}: step ${s.from}→${s.to} changes by ${b - a}, not ${want}`);
    if (s.slots.length > 1 && s.slots.some((i) => c.slots[i])) fail(`${tag}: a step of several slots crosses an element`);
  });
  for (const el of c.slots) if (el && (!Number.isInteger(el.V) || el.V <= 0)) fail(`${tag}: element voltage ${el.V}`);
  const par = c.slots.find((el) => el && el.t === 'par');
  if (par && par.I[0] + par.I[1] !== c.I) fail(`${tag}: junction rule`);
  if (c.slots[0].t !== 'bat' || !c.slots[0].up) fail(`${tag}: battery 1 is not in slot 0`);
}

for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of Lp.TYPES) {
    const keys = new Set();
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const tag = `${lang} ${type} seed ${seed}`;
      let e;
      try { e = Lp.generate(type, seed); } catch (err) { fail(`${tag}: ${err.message}`); continue; }
      checkCircuit(e.c, tag);
      if (seed <= 24) keys.add(e.p);
      for (const f of e.fields) {
        if (f.type === 'num') {
          if (!Number.isInteger(f.value)) fail(`${tag}: answer ${f.key} = ${f.value}`);
          if (f.unit === 'mA' && (f.value <= 0 || f.value % 100)) fail(`${tag}: current ${f.value}`);
          if (f.unit === 'V' && f.key[0] === 'U' && type !== 'volt-1' && type !== 'volt-2' && f.value <= 0) fail(`${tag}: lamp voltage ${f.value}`);
        } else if (f.options.filter((o) => o.ok).length !== 1) fail(`${tag}: ${f.key} has not exactly one right option`);
      }
      if (e.kind === 'volt') for (const f of e.fields) if (f.value === 0) fail(`${tag}: zero voltage asked`);
      // the voltage from X to Y: U_XY = φ_Y − φ_X (the second minus the first), at least one negative
      if (e.kind === 'volt') {
        e.pairs.forEach(([a, b], i) => { if (e.fields[i].value !== b.phi - a.phi) fail(`${tag}: U_${a.name}${b.name} = ${e.fields[i].value}, not φ_${b.name} − φ_${a.name}`); });
        if (!e.fields.some((f) => f.value < 0)) fail(`${tag}: no negative voltage asked`);
      }
      if (e.kind === 'error') {
        const right = Lp.rightJumps(e.c), wrongSlots = e.c.steps[e.wrong].slots;
        e.jumps.forEach((j, i) => { if ((Math.abs(j - right[i]) > 1e-9) !== wrongSlots.includes(i)) fail(`${tag}: the sketch differs elsewhere than in the wrong step`); });
        if (Math.abs(e.jumps.reduce((a, b) => a + b, 0)) < 1e-9) fail(`${tag}: the wrong sketch closes the loop`);
        if (e.c.points.length < 4) fail(`${tag}: fewer than four steps`);
      }
      for (const sol of [false, true]) {
        const html = e.figure(sol);
        if (!html.includes('<svg') || bad(html)) fail(`${tag}: bad figure`);
      }
      for (const t of [e.text, ...e.hints, ...e.solution, e.results, ...e.fields.flatMap((f) => (f.options || []).map((o) => o.label + o.why))]) {
        if (bad(t)) fail(`${tag}: bad text: ${t.slice(0, 120)}`);
      }
    }
    if (keys.size < 3) fail(`${type}: only ${keys.size} different exercises`);
  }

  // the check: every kind of every objective
  const concept = Lp.CONCEPT, names = Lp.concepts();
  for (const o of Lp.OBJECTIVES) {
    if (bad(o.name())) fail(`objective ${o.id}: bad name`);
    for (const kind of o.kinds) {
      const flags = new Set();
      for (let seed = 1; seed <= SAMPLES; seed++) {
        const tag = `${lang} check ${kind} seed ${seed}`;
        let q;
        try { q = Lp.question(kind, seed); } catch (err) { fail(`${tag}: ${err.message}`); continue; }
        if (q.options.length !== 4) fail(`${tag}: ${q.options.length} options`);
        if (q.options.filter((x) => x.correct).length !== 1) fail(`${tag}: not exactly one right option`);
        if (new Set(q.options.map((x) => x.html)).size !== q.options.length) fail(`${tag}: options repeat`);
        for (const x of q.options) {
          if (x.flag) { flags.add(x.flag); if (!concept[x.flag] || !names[concept[x.flag]]) fail(`${tag}: unknown flag ${x.flag}`); }
          if (bad(x.html)) fail(`${tag}: bad option ${x.html}`);
        }
        for (const t of [q.title, q.text, q.figure, q.ask, q.explain()]) if (bad(t)) fail(`${tag}: bad text ${t.slice(0, 120)}`);
      }
      if (lang === 'en') console.log(`check ${o.id}/${kind}: flags ${[...flags].join(', ') || '—'}`);
    }
  }
  const plan = Check.plan(Lp.OBJECTIVES, Lp.rng(5).next);
  if (plan.length !== Check.perObjective(Lp.OBJECTIVES.length) * Lp.OBJECTIVES.length) fail('check plan length');

  // the worked examples
  Lp.EXAMPLES.forEach((x, i) => {
    const frames = x.frames();
    if (frames.length < 3) fail(`example ${i}: ${frames.length} frames`);
    for (const f of frames) if (bad(f.text) || bad(f.figure) || !f.figure.includes('<svg')) fail(`${lang} example ${i}: bad frame ${f.text.slice(0, 80)}`);
    if (bad(x.name() + x.idea())) fail(`example ${i}: bad name or idea`);
  });
}

console.log(failures ? `${failures} failures` : `All ${Lp.TYPES.length} types × ${SAMPLES} seeds, ${Lp.OBJECTIVES.length} objectives and ${Lp.EXAMPLES.length} worked examples OK (en, de).`);
process.exit(failures ? 1 : 0);
