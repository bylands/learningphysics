// Verifies the energy conservation generator: run with `node energy-conservation/test/check-generator.js`.
// For many seeds per level, both languages and both modes (numbers and formulas) it checks
// - the answer against energy conservation, written out independently for each situation,
// - that the energies of all states add up to the same total, and the table and the energy
//   formulas (for typed energies) follow from them,
// - that every wrong-idea answer differs from the right one and is explained, and that there are
//   at least three of them (for the arcade's four options),
// - that texts, hints, solutions and drawings contain no undefined values.
// It also checks the formula parser, typed answers (among them the worksheet's: A √(2/3 g h),
// B 5/9 h, C √(1/2 g s)), the tutor's examples, and the questions of the check and of practice
// (concepts.js): every objective's kinds give four options, one of them right, each wrong one
// explained; a question with a drawing of a situation brings that situation for practice's
// animation (motion).
'use strict';

['../lang.js', '../core.js', '../expr.js', '../draw.js', '../scenarios.js', '../generator.js', '../motion.js', '../lessons.js', '../concepts.js'].forEach((f) => require(f));
const { EC, Expr, Energy, Lessons, Motion, EnergyConcepts: Concepts } = globalThis;
const Check = require('../check.js');
const g = EC.G;

let failures = 0, checked = 0;
const log = (s) => console.log(s);
const fail = (msg) => { failures++; if (failures < 40) log('  FAIL ' + msg); };
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const sq = (x) => x * x;

// Energy conservation per situation, with the wanted quantity set to the answer: [left, right]
// pairs that must be equal (per kilogram where no mass is given).
const LAWS = {
  fall: (p, V) => [[g * V.h, sq(V[p.vk]) / 2]],
  'part-drop': (p, V) => [[g * V.h, g * V.hp + sq(V.vp) / 2], [V.hp, (p.fr[0] / p.fr[1]) * V.h]],
  launcher: (p, V) => [[(V.k * sq(V.s)) / 2, (V.m * sq(V.v)) / 2]],
  pendulum: (p, V) => [[g * V.l * (1 - Math.cos((p.ang * Math.PI) / 180)), sq(V.v) / 2]],
  ramp: (p, V) => [[g * V.h1 + sq(V.v1) / 2, g * V.h2 + sq(V.v2) / 2]],
  tower: (p, V) => [[g * V.h + sq(V.v0) / 2, sq(V.v) / 2]],
  'spring-up': (p, V) => [[(V.k * sq(V.s)) / 2, V.m * g * V.h]],
  'speed-fraction': (p, V) => { const v0 = Math.sqrt(2 * g * V.h), vp = (p.fr[0] / p.fr[1]) * v0; return [[g * V.hp + sq(vp) / 2, sq(v0) / 2]]; },
  'drop-spring': (p, V) => [[V.m * g * (V.h + V.s), (V.k * sq(V.s)) / 2]],
  'ekin-epot': (p, V) => [[g * V.h, g * V.hp + sq(V.vp) / 2], [sq(V.vp) / 2, ((p.n[0] / p.n[1]) * g * V.hp)]],
  'slope-launch': (p, V) => [[(V.k * sq(V.s)) / 2, (V.m * g * V.d) / 2]],
  'ramp-spring': (p, V) => [[V.m * g * V.h, (V.k * sq(V.s)) / 2]],
  incline: (p, V) => [[g * V.h, sq(V.v) / 2], ...(p.ask === 's' ? [[V.h, V.s * Math.sin(Math.PI / 6)]] : [])],
  buffer: (p, V) => [[(V.m * sq(V.v)) / 2, (V.k * sq(V.s)) / 2]],
  bungee: (p, V) => [[V.m * g * (V.l + V.s), (V.k * sq(V.s)) / 2]],
  twice: (p, V) => [[V.m * g * (V.h + V.s), (V.k * sq(V.s)) / 2], [V.m * g * (V.hp + 2 * V.s), (V.k * sq(2 * V.s)) / 2]],
  'spring-hang': (p, V) => {
    const x = (p.fr[0] / p.fr[1]) * V.s;
    return p.ask === 'k' ? [[V.m * g * V.s, (V.k * sq(V.s)) / 2]]
      : [[V.m * g * V.s, V.m * g * (V.s - x) + (V.m * sq(V.vp)) / 2 + (V.k * x * x) / 2], [V.k, (2 * V.m * g) / V.s]];
  },
};

const bad = /undefined|NaN|Infinity|\[object/;
function checkText(id, what, s) { if (typeof s !== 'string' || bad.test(s)) fail(`${id}: ${what} contains an undefined value: ${String(s).match(bad)}`); }

function checkExercise(ex, id) {
  checked++;
  const law = LAWS[ex.scenario];
  if (!law) { fail(`${id}: no law for ${ex.scenario}`); return; }
  const V = { ...ex.p.V, [ex.want.key]: ex.value };
  law(ex.p, V).forEach(([a, b], k) => { if (!close(a, b)) fail(`${id}: law ${k + 1}: ${a} ≠ ${b}`); });
  if (!(ex.value > 0) || !Number.isFinite(ex.value)) fail(`${id}: answer ${ex.value}`);
  if (!close(ex.value, ex.p.V[ex.want.key])) fail(`${id}: the answer ${ex.value} differs from the parameters' ${ex.p.V[ex.want.key]}`);
  // every state has the same total energy; the table marks the forms that are there
  const sc = Energy.SCENARIOS.find((s) => s.id === ex.scenario), states = sc.states(ex.p);
  const totals = states.map((s) => (s.pot || 0) + (s.kin || 0) + (s.el || 0));
  totals.forEach((t, i) => { if (Math.abs(t - totals[0]) > 1e-9 * totals[0]) fail(`${id}: total energy of state ${i + 1} is ${t}, not ${totals[0]}`); });
  states.forEach((s, i) => ['pot', 'kin', 'el'].forEach((k) => { if ((s[k] || 0) < -1e-12) fail(`${id}: negative ${k} in state ${i + 1}`); }));
  if (ex.table.length !== states.length || ex.table.some((r) => r.length !== ex.forms.length)) fail(`${id}: table shape`);
  if (ex.table.some((r) => !r.some(Boolean))) fail(`${id}: a state without energy`);
  if (sc.energies(ex.p).length !== states.length) fail(`${id}: energies and states differ in number`);
  sc.energies(ex.p).forEach((e, i) => ex.forms.forEach((k, j) => { if (!!e[k] !== ex.table[i][j]) fail(`${id}: state ${i + 1}: formula and value of ${k} disagree`); }));
  // the energies as functions: at the exercise's values, those of the states
  const { efun, rel, ebase } = ex.energy, W = rel(ebase);
  if (efun.length !== states.length) fail(`${id}: ${efun.length} energy functions for ${states.length} states`);
  efun.forEach((e, i) => ['pot', 'kin', 'el'].forEach((k) => {
    const a = e[k] ? e[k](W) : 0, b = states[i][k] || 0;
    if (Math.abs(a - b) > 1e-9 * Math.max(1, totals[0])) fail(`${id}: state ${i + 1}: ${k} is ${a} as a function, ${b} as a value`);
  }));
  // wrong ideas
  if (ex.formal && ex.traps.length < 3) fail(`${id}: only ${ex.traps.length} wrong ideas`);
  for (const t of ex.traps) {
    if (!t.why) fail(`${id}: trap ${t.flag} without explanation`);
    if (!ex.formal && Number.isFinite(t.value) && Math.abs(t.value - ex.value) <= 0.03 * ex.value) fail(`${id}: trap ${t.flag} (${t.tex}) is too close to the answer`);
    if (!Energy.WHY[t.flag] && !(sc.why && sc.why[t.flag])) fail(`${id}: unknown flag ${t.flag}`);
  }
  // with numbers, no two wrong ideas give nearly the same value (each value has one explanation)
  if (!ex.formal) ex.traps.forEach((t, k) => ex.traps.slice(0, k).forEach((u) => {
    if (Number.isFinite(t.value) && Math.abs(t.value - u.value) <= 0.03 * Math.abs(u.value)) fail(`${id}: traps ${u.tex} and ${t.tex} give nearly the same value`);
  }));
  // twice the compression: wrong ideas with other factors than 2 and 4 (3 h + s, 4 h + 3 s, …)
  if (ex.scenario === 'twice' && ex.formal) {
    const factors = new Set(ex.traps.flatMap((t) => (t.tex.match(/\d+/g) || ['1'])));
    if (![...factors].some((x) => x !== '2' && x !== '4')) fail(`${id}: twice: only the factors ${[...factors]}`);
    if (ex.traps.length < 6) fail(`${id}: twice: only ${ex.traps.length} wrong ideas`);
  }
  // the answer formula, if typed as it is shown, is right
  checkText(id, 'title', ex.title);
  checkText(id, 'text', ex.text);
  ex.hints.forEach((h, k) => checkText(id, `hint ${k + 1}`, h));
  ex.solution.forEach((s, k) => checkText(id, `step ${k + 1}`, s));
  if (!ex.solution.some((s) => s.includes('htmlClass{result}'))) fail(`${id}: no highlighted result`);
  checkText(id, 'results', ex.results);
  checkText(id, 'task figure', ex.figure({}));
  checkText(id, 'solution figure', ex.solutionFigure());
  // numbers: every value in the task figure appears in the text
  if (!ex.formal) {
    const nums = (html) => (html.replace(/<tspan class="sub"[^>]*>[^<]*<\/tspan>/g, '').replace(/<[^>]*>/g, ' ').replace(/[①②③]/g, '').replace(/\d\/\d/g, '').match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(',', '.'));
    const inText = new Set(nums(ex.text));
    for (const x of nums(ex.figure({}).replace(/<svg[^>]*>/, ''))) if (!inText.has(x) && !['0', '60'].includes(x)) fail(`${id}: figure shows ${x}, the text does not`);
  }
}

const SAMPLES = 200, seen = {};
for (const lang of EC.LANGS) {
  EC.setLang(lang);
  for (const level of Object.keys(Energy.LEVELS)) {
    for (let seed = 1; seed <= SAMPLES; seed++) {
      for (const formal of [true, false]) {
        const ex = Energy.generate(level, seed, formal);
        seen[ex.scenario] = (seen[ex.scenario] || 0) + 1;
        if (ex.id !== `${level}${formal ? '' : '-num'}-${seed}`) fail(`${ex.id}: wrong id`);
        const lv = Energy.LEVELS[level];
        if (ex.difficulty < lv.from || ex.difficulty > lv.to) fail(`${ex.id}: difficulty ${ex.difficulty} outside ${level}`);
        checkExercise(ex, `${lang} ${ex.id}`);
        // the judges: the right number and a trap's number
        if (Energy.judgeNumber(ex, Number(EC.sig(ex.value))).key !== 'ok') fail(`${lang} ${ex.id}: rounded answer not accepted`);
        const t = ex.traps.find((x) => Number.isFinite(x.value));
        if (!formal && t && Energy.judgeNumber(ex, t.value).cls === 'ok') fail(`${lang} ${ex.id}: trap ${t.flag} accepted as right`);
      }
    }
  }
}
for (const s of Energy.SCENARIOS) if (!seen[s.id]) fail(`scenario ${s.id} never generated`);

// ---------------------------------------------------------------- formulas
const PARSE = [
  ['sqrt(2/3 g h)', { g: 9.81, h: 3 }, Math.sqrt((2 / 3) * 9.81 * 3)],
  ['√2gh', { g: 9.81, h: 3 }, Math.sqrt(2 * 9.81 * 3)],
  ['√(2gh)', { g: 9.81, h: 3 }, Math.sqrt(2 * 9.81 * 3)],
  ['wurzel(2*g*h)', { g: 9.81, h: 3 }, Math.sqrt(2 * 9.81 * 3)],
  ['v0^2/(2g)', { v0: 4, g: 10 }, 0.8],
  ['v_0²/2/g', { v0: 4, g: 10 }, 0.8],
  ['v₀^2/(2*g)', { v0: 4, g: 10 }, 0.8],
  ['1/2 g s', { g: 10, s: 3 }, 15],
  ['0,5gs', { g: 10, s: 3 }, 15],
  ['2mg(h+s)/s²', { m: 1, g: 10, h: 2, s: 0.5 }, 200],
  ['s*sqrt(k/m)', { s: 0.1, k: 400, m: 1 }, 2],
  ['s√(k/m)', { s: 0.1, k: 400, m: 1 }, 2],
  ['sqrt(v1^2+2g(h1-h2))', { v1: 3, g: 10, h1: 2, h2: 1.2 }, 5],
  ['5/9 h', { h: 9 }, 5],
  ['5h/9', { h: 9 }, 5],
  ['-(-2)L', { l: 3 }, 6],
  ['2·g·ℓ', { g: 10, l: 2 }, 40],
];
for (const [text, V, want] of PARSE) {
  const r = Expr.parse(text);
  if (r.error) { fail(`parse ${text}: ${JSON.stringify(r.error)}`); continue; }
  if (!close(Expr.evaluate(r.tree, V), want)) fail(`parse ${text}: ${Expr.evaluate(r.tree, V)} ≠ ${want}`);
  checkText(`parse ${text}`, 'tex', Expr.tex(r.tree));
}
for (const text of ['', '2*(g', 'g h)', 'sqrt', '2 +', '#h', '()']) if (!Expr.parse(text).error) fail(`parse "${text}" should fail`);
if (Expr.vars(Expr.parse("h'").tree)[0] !== 'hp') fail("h' is not read as h′");

// typed answers to the tutor's examples: the worksheet's results, and wrong ideas
EC.setLang('en');
// a tutor example by its situation; the worksheet's B and the tower, no longer examples, as they were
const FORMER = {
  tower: { scenario: 'tower', formal: false, p: { dir: 'up', V: { g, h: 10, v0: 5, v: Math.sqrt(25 + 2 * g * 10) } } },
  'speed-fraction': { scenario: 'speed-fraction', formal: true, p: { fr: [2, 3], V: { g, h: 4.5, v0: Math.sqrt(2 * g * 4.5), vp: (2 / 3) * Math.sqrt(2 * g * 4.5), hp: 2.5 } } },
};
const lesson = (id) => Energy.tutorial(Lessons.EXAMPLES.find((e) => e.scenario === id) || FORMER[id]).ex;
const TYPED = [
  ['part-drop', 'sqrt(2/3*g*h)', 'ok'], ['part-drop', '√(2gh)', 'trap'], ['part-drop', 'sqrt(4/3 g h)', 'trap'], ['part-drop', '2/3gh', 'trap'], ['part-drop', 'sqrt(2 g h\')', 'unknown'], ['part-drop', "v'", 'wanted'], ['part-drop', 'sqrt(2gh*m/m)', 'unknown'],
  ['speed-fraction', '5/9 h', 'ok'], ['speed-fraction', '5h/9', 'ok'], ['speed-fraction', '1/3 h', 'trap'], ['speed-fraction', '4/9*h', 'trap'], ['speed-fraction', 'h', 'wrong'],
  ['twice', '4h + 2s', 'ok'], ['twice', '2h', 'trap'], ['twice', '3h + s', 'trap'], ['twice', '4h + 3s', 'trap'], ['twice', '4h - 2s', 'trap'], ['twice', '2(h + s)', 'trap'], ['incline', 'sqrt(2gh)', 'ok'],
  ['spring-hang', 'sqrt(1/2 g s)', 'ok'], ['spring-hang', 'sqrt(g*s/2)', 'ok'], ['spring-hang', 'sqrt(gs)', 'trap'], ['spring-hang', '√(0.5gs', 'syntax'], ['spring-hang', '', 'empty'],
];
for (const [k, text, key] of TYPED) {
  const ex = lesson(k), r = Energy.judgeFormula(ex, text);
  if (r.key !== key) fail(`lesson ${k}: "${text}" judged ${r.key}, expected ${key}`);
}
// typed energies of the states, in the tutor's examples
const ETYPED = [
  ['fall', 0, 'mgh', 'ok'], ['fall', 1, '1/2 m v^2', 'ok'], ['fall', 1, 'm v²', 'half'], ['fall', 1, 'mgh', 'wrong'], ['fall', 0, 'mgh + 1/2 m x^2', 'unknown'],
  ['part-drop', 1, "m g h' + 1/2 m v'^2", 'ok'], ['part-drop', 1, "m g 2/3 h + m v'^2/2", 'ok'], ['part-drop', 1, "m g h'", 'missing'], ['part-drop', 1, "m g h' + m v'^2", 'half'],
  ['launcher', 0, '1/2 k s^2', 'ok'], ['launcher', 0, 'k s^2', 'half'],
  ['tower', 0, 'm g h + 1/2 m v0^2', 'ok'], ['tower', 0, '1/2 m v0²', 'missing'],
  ['speed-fraction', 1, "mgh' + 1/2 m (2/3 v0)^2", 'ok'], ['speed-fraction', 2, '1/2 m v_0^2', 'ok'],
  ['spring-hang', 1, "m g s/2 + 1/2 m v'^2 + 1/2 k (s/2)^2", 'ok'], ['spring-hang', 1, "m g s/2 + 1/2 m v'^2", 'missing'], ['spring-hang', 2, '1/2 k s^2', 'ok'], ['spring-hang', 0, 'm g s', 'ok'],
];
for (const [k, i, text, key] of ETYPED) {
  const ex = lesson(k), r = Energy.judgeEnergy(ex, i, text);
  if (r.key !== key) fail(`lesson ${k}, E${i + 1}: "${text}" judged ${r.key}, expected ${key}`);
}

// the worksheet's results (A, B, C) for the tutor's examples
const SHEET = { 'part-drop': (V) => Math.sqrt((2 / 3) * V.g * V.h), 'speed-fraction': (V) => (5 / 9) * V.h, 'spring-hang': (V) => Math.sqrt(0.5 * V.g * V.s) };
for (const [k, f] of Object.entries(SHEET)) {
  const ex = lesson(k);
  if (!Expr.same(f, ex.f, ex.p.V, ex.sampled)) fail(`lesson ${k}: not the worksheet's result`);
}
for (const lang of EC.LANGS) {
  EC.setLang(lang);
  Lessons.EXAMPLES.forEach((e, k) => {
    const { frames, ex } = Energy.tutorial(e);
    if (ex) checkExercise(ex, `${lang} lesson ${k + 1}`);
    if (!ex && !frames.length) fail(`lesson ${k + 1}: no frames`);
    if (ex && !ex.formal) fail(`lesson ${k + 1}: with numbers`);
    frames.forEach((f, j) => { checkText(`lesson ${k + 1}`, `frame ${j + 1} text`, f.text); checkText(`lesson ${k + 1}`, `frame ${j + 1} figure`, f.figure); });
  });
}

// ---------------------------------------------------------------- the tutor's animations
// At each state, the animated energies are those of the solution; in between, the total stays the
// same and no energy is negative; the frames contain no undefined values.
let anims = 0;
for (const lang of EC.LANGS) {
  EC.setLang(lang);
  for (const scn of Energy.SCENARIOS) {
    for (let seed = 1; seed <= 40; seed++) {
      const ex = Energy.generateFor(scn.id, seed, seed % 2 === 0), id = `${lang} animation ${scn.id}-${seed}`, an = Motion.create(ex);
      anims++;
      const states = scn.states(ex.p), sum = (e) => (e.pot || 0) + (e.kin || 0) + (e.el || 0), total = sum(states[0]);
      if (an.states.length !== states.length) fail(`${id}: ${an.states.length} animated states, ${states.length} in the solution`);
      an.states.forEach((st, i) => ['pot', 'kin', 'el'].forEach((k) => {
        const a = an.energy(st)[k] || 0, b = states[i][k] || 0;
        if (Math.abs(a - b) > 1e-6 * total) fail(`${id}: state ${i + 1}: ${k} ${a} in the animation, ${b} in the solution`);
      }));
      for (let k = 0; k <= 50; k++) {
        const e = an.energy(k / 50);
        if ((e.pot || 0) + (e.el || 0) > total * (1 + 1e-6)) fail(`${id}: at ${k / 50}, potential and elastic energy exceed the total`);
        if (Math.abs(sum(e) - total) > 1e-6 * total) fail(`${id}: at ${k / 50}, total ${sum(e)} instead of ${total}`);
      }
      if (!(an.duration > 3 && an.duration < 20)) fail(`${id}: duration ${an.duration}`);
      for (let k = 0; k <= 8; k++) checkText(id, `frame at ${k}`, an.frame((k / 8) * an.duration).svg);
      checkText(id, 'markup', an.markup('x'));
    }
  }
}
log(`${anims} animations checked`);

// ---------------------------------------------------------------- the check and the choice exercises
// Every objective has kinds; every kind gives four options, exactly one right, all different, the
// wrong ones explained and their wrong ideas known; no undefined values; and its practice stage.
// As a practice exercise, it brings the situation drawn for the animation (and only then).
const C = Concepts.CHECK, kinds = new Set(C.objectives.flatMap((o) => o.kinds));
const stageTypes = new Set(Lessons.EXAMPLES.flatMap((e) => e.practice.flatMap((st) => st.types)));
C.objectives.forEach((o) => {
  if (!o.kinds.length) fail(`objective ${o.id}: no kinds`);
  if (!(o.tutor >= 0 && o.tutor < Lessons.EXAMPLES.length)) fail(`objective ${o.id}: tutor ${o.tutor}`);
  if (!(o.topic >= 0 && o.topic < Lessons.EXAMPLES.length)) fail(`objective ${o.id}: topic ${o.topic}`);
  o.kinds.forEach((k) => { if (!Concepts.KINDS.includes(k)) fail(`objective ${o.id}: unknown kind ${k}`); });
});
for (const k of Concepts.KINDS) if (!stageTypes.has(k)) fail(`kind ${k} is in no practice stage`);
for (const t of stageTypes) if (!Concepts.KINDS.includes(t) && !Energy.SCENARIOS.some((s) => s.id === t)) fail(`practice type ${t} unknown`);
const names = Object.keys(C.concepts());
Object.values(C.concept).forEach((c) => { if (!names.includes(c)) fail(`concept ${c} has no name`); });
let questions = 0;
const flags = {};
for (const lang of EC.LANGS) {
  EC.setLang(lang);
  C.objectives.forEach((o) => checkText(`objective ${o.id}`, 'name', o.name()));
  for (const kind of Concepts.KINDS) {
    for (let seed = 1; seed <= 150; seed++) {
      const id = `${lang} ${kind}-${seed}`, q = C.question(kind, seed);
      questions++;
      if (q.options.length !== 4) fail(`${id}: ${q.options.length} options`);
      if (q.options.filter((x) => x.correct).length !== 1) fail(`${id}: not exactly one right option`);
      if (new Set(q.options.map((x) => x.html)).size !== q.options.length) fail(`${id}: options repeat`);
      for (const x of q.options.filter((y) => !y.correct)) {
        if (!x.why) fail(`${id}: a wrong option without explanation`);
        flags[x.flag] = (flags[x.flag] || 0) + 1;
        checkText(id, 'why', x.why || '');
      }
      ['title', 'text', 'figure', 'ask'].forEach((w) => checkText(id, w, q[w]));
      q.options.forEach((x) => checkText(id, 'option', x.html));
      checkText(id, 'explanation', q.explain());
      const e = Concepts.exercise(kind, seed);
      if (!e.hints.length) fail(`${id}: no hints`);
      e.hints.forEach((h) => checkText(id, 'hint', h));
      if (e.key !== Concepts.exercise(kind, seed).key) fail(`${id}: not the same exercise again`);
      // practice's animation after the answer: the situation drawn, wherever one is drawn
      if (!!e.motion !== !!e.figure()) fail(`${id}: ${e.motion ? 'an animation without a drawing' : 'a drawing without an animation'}`);
      if (e.motion) {
        if (e.motion.figure({}) !== e.figure().replace(/ hl"/g, '"')) fail(`${id}: the animation's situation is not the one drawn`);
        const an = Motion.create(e.motion);
        if (an.states.length !== e.motion.table.length) fail(`${id}: ${an.states.length} animated states, ${e.motion.table.length} in the table`);
        checkText(id, 'animation', an.frame(an.duration / 2).svg);
      }
    }
  }
}
// the misconceptions the check reports come up as wrong options
for (const f of Object.keys(C.concept)) if (!flags[f]) fail(`wrong idea ${f} never offered`);
// a check: the planned questions, all objectives
const planned = Check.plan(C.objectives, Math.random);
if (planned.length !== Check.perObjective(C.objectives.length) * C.objectives.length) fail(`check of ${planned.length} questions`);
C.objectives.forEach((o, i) => { if (!planned.some((x) => x.objective === i)) fail(`objective ${o.id} not asked`); });
log(`${questions} questions of ${kinds.size} kinds checked, wrong ideas: ${JSON.stringify(flags)}`);

log(`${checked} exercises checked, ${Object.keys(seen).length} situations: ${JSON.stringify(seen)}`);
log(failures ? `${failures} failures` : 'all checks passed');
if (failures) process.exit(1);
