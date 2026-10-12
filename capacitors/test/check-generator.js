// Verifies the exercises of Capacitors and RC Circuits: run with `node capacitors/test/check-generator.js`.
// For many seeds of every exercise type, in both languages, it checks that
// - the totals of capacitors in series and in parallel are right (worked out again here) and
//   multiples of 0.5 µF, and the trap of the resistor rules is offered;
// - the right graph of the time curves is the exponential one, with three wrong ones;
// - the times read from a graph are where the curve is (U₀/2 at T½, U₀/4 or ¾U₀ at 2·T½, 37 % or
//   63 % at τ), and the factor on τ = R·C is right;
// - every choice has its right answer among the options, and no text, hint, solution or drawing
//   contains undefined values;
// - every objective of the check has kinds that give questions with four options, exactly one
//   right, the flags of the wrong ones named as misconceptions or slips, and that a check plans
//   the right number of questions.
'use strict';

const Lang = require('../lang.js');
const G = require('../generator.js');
const Lessons = require('../lessons.js');
const Check = require('../check.js');
const S = require('../check-src.js');

const SAMPLES = 300;
// undefined values in a text ("null" is a German word, so only in English)
const bad = () => (Lang.get() === 'de' ? /undefined|NaN|\[object/ : /undefined|NaN|\[object|null/);
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const half = (x) => close(2 * x, Math.round(2 * x));
const ser = (...cs) => 1 / cs.reduce((s, c) => s + 1 / c, 0);
const field = (ex, key) => ex.fields.find((f) => f.key === key);

function texts(ex, tag) {
  const all = [ex.title, ex.text, ex.figure(), ex.solutionFigure(), ex.results, ...ex.hints, ...ex.solution,
    ...ex.fields.flatMap((f) => [f.what, ...(f.options || []).flatMap((o) => [o.html, o.why]), ...(f.traps || []).map((t) => t.why)])];
  for (const t of all) if (typeof t !== 'string' || bad().test(t)) { fail(`${tag}: bad text ${String(t).slice(0, 80)}`); break; }
}

function verify(ex, tag) {
  const p = ex.p;
  for (const f of ex.fields) {
    if (f.type === 'num' && !(Number.isFinite(f.value) && f.value > 0)) fail(`${tag}: ${f.key} = ${f.value}`);
    if (f.type === 'choice' && f.options.filter((o) => o.v === f.value).length !== 1) fail(`${tag}: ${f.key} has not exactly one right option`);
  }
  switch (ex.type) {
    case 'pair': {
      const C = field(ex, 'C');
      if (!close(C.value, p.ser ? ser(p.a, p.b) : p.a + p.b)) fail(`${tag}: C = ${C.value}`);
      if (!half(C.value)) fail(`${tag}: C = ${C.value} µF is not a multiple of 0.5`);
      if (!C.traps.some((t) => t.flag === 'swap' && close(t.value, p.ser ? p.a + p.b : ser(p.a, p.b)))) fail(`${tag}: no trap of the resistor rules`);
      break;
    }
    case 'mixed': {
      const block = p.shape === 'sp' ? p.b + p.c : ser(p.b, p.c), total = p.shape === 'sp' ? ser(p.a, block) : p.a + block;
      if (!close(field(ex, 'C23').value, block) || !close(field(ex, 'C').value, total)) fail(`${tag}: C23 or C wrong`);
      if (!half(block) || !half(total)) fail(`${tag}: C23 = ${block}, C = ${total} not multiples of 0.5`);
      break;
    }
    case 'bounds': {
      const total = (vals) => (p.ser ? ser(...vals) : vals.reduce((s, v) => s + v, 0)), w = field(ex, 'where').value, m = field(ex, 'more').value;
      if (p.kind !== 'equal' && new Set(p.vals).size !== 3) fail(`${tag}: capacitances not distinct`);
      if (p.kind === 'where') {
        const C = total(p.vals), lo = Math.min(...p.vals), hi = Math.max(...p.vals);
        const where = C < lo ? 'below' : C > hi ? 'above' : 'between';
        if (w !== where) fail(`${tag}: the total ${C} lies ${where}`);
        // the change worked out: a fourth (any) added, C₃ taken out, C₁ made larger or smaller
        const after = { add: total([...p.vals, 7]), remove: total(p.vals.slice(0, 2)), larger: total([p.vals[0] * 1.5, ...p.vals.slice(1)]), smaller: total([p.vals[0] / 1.5, ...p.vals.slice(1)]) }[p.change];
        if (m !== (after > C ? 'up' : 'down')) fail(`${tag}: the change ${p.change}`);
      } else if (p.kind === 'share') {
        // in series the voltages Q/C differ (largest for the smallest C), in parallel the charges C·U
        const k = 1 + p.vals.indexOf(p.ser ? Math.min(...p.vals) : Math.max(...p.vals));
        if (w !== `c${k}` || m !== 'same') fail(`${tag}: which capacitor`);
      } else if (p.kind === 'mixed') {
        const [a, b, c] = p.vals, blk = p.ser ? b + c : ser(b, c), C = p.ser ? ser(a, blk) : a + blk;
        if (w !== (C < a ? 'below' : 'above') || m !== (C < blk ? 'below' : 'above')) fail(`${tag}: compared with C₁ or the block`);
      } else if (p.kind === 'equal') {
        if (!close(Number(w), p.ser ? p.c / p.n : p.n * p.c) || m !== (p.ser ? 'part' : 'all')) fail(`${tag}: equal capacitors`);
      } else fail(`${tag}: kind ${p.kind}`);
      break;
    }
    case 'network': {
      // worked out again, every group inside out a multiple of 0.5 µF
      let ok = true;
      const cap = (sh, at) => {
        if (!Array.isArray(sh)) return p.vals[at.k++];
        const parts = sh.slice(1).map((x) => cap(x, at)), v = sh[0] === 's' ? ser(...parts) : parts.reduce((s, x) => s + x, 0);
        if (!half(v)) ok = false;
        return v;
      };
      const SH = [['s', ['p', 0, 0], ['p', 0, 0]], ['p', ['s', 0, 0], ['s', 0, 0]], ['s', 0, ['p', 0, ['s', 0, 0]]], ['p', 0, ['s', 0, ['p', 0, 0]]], ['s', ['p', 0, 0], ['p', 0, 0, 0]], ['p', ['s', 0, 0], ['s', 0, ['p', 0, 0]]]];
      const C = cap(SH[p.shape], { k: 0 });
      if (!close(field(ex, 'C').value, C)) fail(`${tag}: C = ${field(ex, 'C').value}, expected ${C}`);
      if (!ok || p.vals.length < 4) fail(`${tag}: a block not a multiple of 0.5 µF`);
      const swap = (sh, at) => (!Array.isArray(sh) ? p.vals[at.k++] : ((xs) => (sh[0] === 'p' ? ser(...xs) : xs.reduce((s, x) => s + x, 0)))(sh.slice(1).map((x) => swap(x, at))));
      if (Math.abs(swap(SH[p.shape], { k: 0 }) / C - 1) > 0.05 && !field(ex, 'C').traps.some((t) => t.flag === 'swap')) fail(`${tag}: no trap of the resistor rules`);
      break;
    }
    case 'loop': case 'loop-d': {
      const UC = p.moment === 'start' ? (p.charge ? 0 : p.U0) : p.moment === 'fromI' ? field(ex, 'UC').value : p.UC, UR = field(ex, 'UR').value;
      if (!close(p.charge ? UR + UC : UR, p.charge ? p.U0 : UC)) fail(`${tag}: the loop rule`);
      if (p.moment !== 'fromI' && !close(field(ex, 'I').value, UR / p.R)) fail(`${tag}: I = U_R/R`);
      if (p.charge !== (ex.type === 'loop')) fail(`${tag}: charging or discharging`);
      break;
    }
    case 'curve-u': case 'curve-i': case 'curve-r': case 'curve-u-d': case 'curve-i-d': case 'curve-r-d': {
      if (p.charge !== !ex.type.endsWith('-d')) fail(`${tag}: charging or discharging`);
      const f = field(ex, 'graph');
      if (f.value !== 'exp' || f.options.length !== 4 || !f.pics) fail(`${tag}: the graph field`);
      if (f.options.some((o) => o.v !== 'exp' && !o.flag)) fail(`${tag}: a wrong graph without a flag`);
      break;
    }
    case 'read-half': {
      const tau = p.th / Math.LN2, U = (t) => (p.charge ? p.U0 * (1 - Math.exp(-t / tau)) : p.U0 * Math.exp(-t / tau));
      if (!close(U(field(ex, 'th').value), p.U0 / 2, 1e-6)) fail(`${tag}: U(T½) is not U₀/2`);
      const part = 1 / 2 ** p.k, q = p.charge ? (1 - part) * p.U0 : part * p.U0;
      if (p.ask === 'time' && !close(U(field(ex, 't2').value), q, 1e-6)) fail(`${tag}: U(t₂)`);
      if (p.ask === 'volt' && !close(field(ex, 't2').value, U(p.k * p.th), 1e-6)) fail(`${tag}: U at k·T½`);
      if (p.tEnd < p.k * p.th) fail(`${tag}: k·T½ beyond the graph`);
      if (p.tEnd / p.tStep > 10 || p.tEnd < 2 * p.th) fail(`${tag}: the time axis`);
      break;
    }
    case 'read-tau': {
      const U = (t) => (p.charge ? p.U0 * (1 - Math.exp(-t / p.tau)) : p.U0 * Math.exp(-t / p.tau));
      if (!close(field(ex, 'tau').value, p.tau) || !close(U(p.tau) / p.U0, p.charge ? 1 - 1 / Math.E : 1 / Math.E, 1e-6)) fail(`${tag}: τ`);
      if (!field(ex, 'tau').traps.some((t) => t.flag === 'half')) fail(`${tag}: no trap of the half-life`);
      break;
    }
    case 'predict': case 'predict-graph': {
      if (ex.type === 'predict') {
        const k = Number(field(ex, 'tau').value), txt = ex.text;
        const kR = /twice the resistance|doppeltem Widerstand/.test(txt) ? 2 : /half the resistance|halbem Widerstand/.test(txt) ? 0.5 : 1;
        const kC = /twice the capacitance|doppelter Kapazität|in parallel|parallel zum/.test(txt) ? 2 : /half the capacitance|halber Kapazität|in series|in Serie/.test(txt) ? 0.5 : 1;
        if (!close(k, kR * kC)) fail(`${tag}: τ ×${k}, expected ×${kR * kC}`);
        if (field(ex, 'fin').value !== 'same') fail(`${tag}: the final voltage`);
        if (field(ex, 'i0').value !== (kR > 1 ? 'down' : kR < 1 ? 'up' : 'same')) fail(`${tag}: the current at the start`);
      } else if (field(ex, 'graph').options.length !== 4) fail(`${tag}: four graphs`);
      break;
    }
    default: fail(`${tag}: unknown type ${ex.type}`);
  }
}

for (const lang of ['en', 'de']) {
  Lang.set(lang);
  for (const type of Object.keys(G.TYPES)) {
    const keys = new Set();
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const ex = G.practiceOf(type, seed), tag = `${lang} ${type} #${seed}`;
      keys.add(JSON.stringify(ex.p));
      verify(ex, tag);
      if (seed <= 60) texts(ex, tag);
    }
    if (keys.size < 3) fail(`${lang} ${type}: only ${keys.size} different exercises`);
  }
  // the tutor
  Lessons.EXAMPLES.forEach((e, i) => {
    const frames = e.frames();
    if (frames.length < 3) fail(`${lang} example ${i + 1}: ${frames.length} frames`);
    for (const fr of frames) if (bad().test(fr.text + fr.figure)) fail(`${lang} example ${i + 1}: bad text`);
  });
  Lessons.TOPICS.forEach((t, i) => t.stages.forEach((s) => s.types.forEach((ty) => { if (!G.TYPES[ty]) fail(`topic ${i}: unknown type ${ty}`); })));
  // the check
  const names = S.concepts();
  for (const o of S.objectives) {
    if (!o.kinds.length || o.tutor == null || o.topic == null || !Lessons.EXAMPLES[o.tutor] || !Lessons.TOPICS[o.topic]) fail(`${lang} objective ${o.id}: kinds, tutor or topic`);
    if (bad().test(o.name())) fail(`${lang} objective ${o.id}: name`);
    for (const kind of o.kinds) {
      for (let seed = 1; seed <= 120; seed++) {
        const q = S.question(kind, seed), tag = `${lang} check ${o.id}/${kind} #${seed}`;
        if (q.options.length !== 4) fail(`${tag}: ${q.options.length} options`);
        if (q.options.filter((x) => x.correct).length !== 1) fail(`${tag}: not exactly one right option`);
        if (new Set(q.options.map((x) => x.html)).size !== 4) fail(`${tag}: two options alike`);
        for (const x of q.options) {
          if (!x.correct && x.flag && S.concept[x.flag] && !names[S.concept[x.flag]]) fail(`${tag}: misconception ${x.flag} has no name`);
          if (!x.correct && x.flag && !S.concept[x.flag] && x.flag !== 'invert') fail(`${tag}: unknown flag ${x.flag}`);
        }
        if (seed <= 20 && bad().test(q.title + q.text + q.figure + q.ask + q.options.map((x) => x.html + (x.why || '')).join('') + q.explain())) fail(`${tag}: bad text`);
      }
    }
  }
  const plan = Check.plan(S.objectives, Math.random);
  if (plan.length !== Check.perObjective(S.objectives.length) * S.objectives.length) fail(`${lang}: the check plans ${plan.length} questions`);
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log(`OK: ${Object.keys(G.TYPES).length} exercise types × ${SAMPLES} seeds in EN and DE, ${Lessons.EXAMPLES.length} worked examples, ${S.objectives.length} objectives of the check (${S.objectives.map((o) => o.kinds.length).reduce((a, b) => a + b, 0)} kinds × 120 questions).`);
