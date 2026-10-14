// Verifies the free-body diagrams generator: run with `node force-systems/test/check-generator.js`.
// For many seeds per situation and both languages it checks
// - the worked solutions against Newton's laws, written out independently for each situation
//   (balance perpendicular to the motion, F = m a for the system and for single boxes),
// - that the values are positive and the boxes move the way the text says,
// - the equations to choose: four different ones, the right one true for the situation's values
//   and each wrong one false,
// - "find the error": one wrong step, and the check's questions: four options, one right,
// - that texts, hints, solutions and drawings contain no undefined values.
// It also checks the tutor's examples against the answers on the worksheet, and that the check's
// questions on springs and drag offer their misconceptions. Practice: nice angles (sine and cosine
// given in the text), the results to work out (each worked out here again, four values to choose
// from, one right), at least 20 different exercises per stage, the order of topics and stages, the
// drag acting at the body's centre, and the saved progress of the earlier order moved along with
// its content.
'use strict';

const load = typeof require === 'function'
  ? () => { require('../lang.js'); require('../core.js'); require('../draw.js'); require('../scenarios.js'); require('../equations.js'); require('../generator.js'); require('../lessons.js'); require('../check-src.js'); }
  : () => {};
load();
const { FS, Forces, Lessons, Equations, CheckSource } = globalThis;
const g = FS.G;

let failures = 0, checked = 0;
const log = typeof console !== 'undefined' ? (s) => console.log(s) : () => {};
const fail = (msg) => { failures++; if (failures < 30) log('  FAIL ' + msg); };
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
// practice uses the sine and cosine the text gives (p.nice): 37° and 53° with 0.6 and 0.8, 30° and 60° with 0.5 and 0.87
const NICE_SIN = { 30: 0.5, 37: 0.6, 53: 0.8, 60: 0.87 }, NICE_COS = { 30: 0.87, 37: 0.8, 53: 0.6, 60: 0.5 };
let P = {}; // the parameters of the exercise being checked (for the nice angles)
const sin = (d) => (P.nice ? NICE_SIN[d] : Math.sin((d * Math.PI) / 180)), cos = (d) => (P.nice ? NICE_COS[d] : Math.cos((d * Math.PI) / 180));

// Newton's laws per situation: a list of [left, right] that must be equal.
const LAWS = {
  'rest-up': (p, v) => [[v.G, p.m * g], [v.N + (p.dir === 'up' ? p.F : -p.F), p.m * g]],
  'rest-angle': (p, v) => {
    const up = p.ref === 'v' ? cos(p.alpha) : sin(p.alpha), side = p.ref === 'v' ? sin(p.alpha) : cos(p.alpha);
    return [[v.N + p.F * up, p.m * g], [v.R, p.F * side]];
  },
  'pull-friction': (p, v) => {
    const F = p.given === 'a' ? v.F : p.F, a = p.given === 'a' ? p.a : v.a;
    return [[v.R, p.mu * p.m * g], [v.res, p.m * a], [F - v.R, v.res]];
  },
  'push-pair': (p, v) => [[p.F - p.mu * (p.m1 + p.m2) * g, (p.m1 + p.m2) * v.a], [v.res, (p.m1 + p.m2) * v.a],
    [v.K - p.mu * p.m2 * g, p.m2 * v.a], [p.F - v.K - p.mu * p.m1 * g, p.m1 * v.a], ...(p.mu ? [[v.R, p.mu * (p.m1 + p.m2) * g]] : [])],
  'rope-pair': (p, v) => [[v.R1, p.mu1 * p.m1 * g], [v.S - v.R1, p.m1 * v.a], [p.F - v.S - p.mu2 * p.m2 * g, p.m2 * v.a], [v.res, (p.m1 + p.m2) * v.a]],
  atwood: (p, v) => {
    const mh = Math.max(p.m1, p.m2), ml = Math.min(p.m1, p.m2);
    return [[v.S - ml * g, ml * v.a], [mh * g - v.S, mh * v.a], [v.res, (p.m1 + p.m2) * v.a]];
  },
  'table-pulley': (p, v) => [[v.R, p.mu * p.m1 * g], [v.S - v.R, p.m1 * v.a], [p.m2 * g - v.S, p.m2 * v.a], [v.res, (p.m1 + p.m2) * v.a]],
  'incline-pull': (p, v) => [[v.N, p.m * g * cos(p.alpha)], [v.R, p.mu * v.N], [v.F - p.m * g * sin(p.alpha) - v.R, p.m * p.a], [v.res, p.m * p.a]],
  'incline-pulley': (p, v) => [[v.N, p.m1 * g * cos(p.alpha)], [v.R, p.mu * v.N], [v.S - p.m1 * g * sin(p.alpha) - v.R, p.m1 * v.a],
    [p.m2 * g - v.S, p.m2 * v.a], [v.res, (p.m1 + p.m2) * v.a]],
  // springs (Δx in cm) and drag
  'spring-hang': (p, v) => [[v.Fs, p.m * g], [v.Fs, (p.k * v.dx) / 100], [v.k, p.k]],
  'spring-floor': (p, v) => [[v.Fs, (p.k * p.dx) / 100], [v.R, p.mu * p.m * g], [v.Fs - v.R, p.m * v.a]],
  'drag-fall': (p, v) => (p.phase === 'terminal' ? [[v.D, p.m * g], [v.a, 0]]
    : p.phase === 'early' ? [[p.m * g - p.D, p.m * v.a], [v.res, p.m * v.a], [p.D < p.m * g ? 1 : 0, 1]]
      : [[p.D - p.m * g, p.m * v.a], [v.res, p.m * v.a], [p.D > p.m * g ? 1 : 0, 1]]),
  'drag-bike': (p, v) => [[v.N, p.m * g], [p.D, p.m * v.a]],
};
// Quantities that must be positive (a box at rest or at constant speed may have a = 0).
const POSITIVE = (ex) => ex.fields.filter((f) => !(f.key === 'a' && ex.p.a === 0) && !(f.key === 'res' && ex.p.a === 0));

const bad = /undefined|NaN|Infinity|\[object/;
function checkText(id, what, s) {
  if (typeof s !== 'string' || bad.test(s)) fail(`${id}: ${what} contains an undefined value: ${String(s).match(bad)}`);
  else if (/[^\\];\\Rightarrow|\\Rightarrow;/.test(s)) fail(`${id}: ${what}: a TeX space lost its backslash`);
}

function checkExercise(ex, id) {
  checked++;
  P = ex.p;
  const law = LAWS[ex.scenario];
  if (!law) { fail(`${id}: no laws for ${ex.scenario}`); return; }
  law(ex.p, ex.v).forEach(([a, b], k) => { if (!close(a, b)) fail(`${id} (${ex.scenario}): law ${k + 1}: ${a} ≠ ${b}`); });
  ex.fields.forEach((f) => {
    if (!Number.isFinite(f.value)) fail(`${id}: ${f.key} is ${f.value}`);
    if (f.value > 2000) fail(`${id}: ${f.key} = ${f.value} is implausibly large`);
  });
  POSITIVE(ex).forEach((f) => { if (!(f.value > 0)) fail(`${id}: ${f.key} = ${f.value} is not positive`); });
  // the table of forces: every box has its weight; friction only where there is a coefficient
  const t = ex.forces, ki = (k) => t.kinds.findIndex((x) => x.kind === k);
  if (t.boxes.length !== (ex.p.m1 != null ? 2 : 1)) fail(`${id}: ${t.boxes.length} boxes in the table of forces`);
  t.table.forEach((row, i) => { if (!row[ki('g')]) fail(`${id}: no weight on box ${i + 1}`); });
  if (ex.scenario === 'rope-pair' && !t.table[1][ki('s')]) fail(`${id}: the pull does not act on the right box`);
  if (ex.scenario === 'rope-pair' && t.table[1][ki('r')] !== ex.p.mu2 > 0) fail(`${id}: friction on the right box with mu2 = ${ex.p.mu2}`);
  if (['atwood'].includes(ex.scenario) && t.table.some((r) => r[ki('n')] || r[ki('r')])) fail(`${id}: normal force or friction on a hanging box`);
  // springs and drag: the spring force or drag acts, and no push or pull (a "force of motion")
  if (/^(spring|drag)-/.test(ex.scenario)) {
    const sp = /^spring/.test(ex.scenario);
    if (!t.table[0][ki('f')] !== !sp || !t.table[0][ki('d')] !== sp) fail(`${id}: spring force or drag wrong in the table of forces`);
    if (t.table[0][ki('s')] || t.table[0][ki('k')]) fail(`${id}: a push, pull or rope force in the table of forces`);
    const N = ['spring-floor', 'drag-bike'].includes(ex.scenario);
    if (!t.table[0][ki('n')] !== !N || !t.table[0][ki('r')] !== (ex.scenario !== 'spring-floor')) fail(`${id}: normal force or friction wrong in the table of forces`);
  }
  t.boxes.forEach((b) => checkText(id, 'box name', b));
  // ticking draws the forces in, those that do not act too, without resizing the drawing
  const none = ex.taskFigure(new Set()), every = ex.taskFigure(new Set(t.boxes.flatMap((b, i) => t.kinds.map((k, j) => `${i}:${j}`))));
  checkText(id, 'task figure with all forces ticked', every);
  const vb = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
  if (vb(none) !== vb(every)) fail(`${id}: ticking forces resizes the drawing: ${vb(none)} → ${vb(every)}`);
  const drawn = (every.match(/class="seq force k-[gnrskfd]/g) || []).length;
  if (drawn < t.boxes.length * t.kinds.length) fail(`${id}: ${drawn} arrows for ${t.boxes.length * t.kinds.length} ticks`);
  checkText(id, 'title', ex.title);
  checkText(id, 'text', ex.text);
  ex.hints.forEach((h, k) => checkText(id, `hint ${k + 1}`, h));
  ex.solution.forEach((s, k) => checkText(id, `step ${k + 1}`, s));
  checkText(id, 'results', ex.results);
  checkText(id, 'task figure', ex.figure({ task: true }));
  // every number in the task figure (masses, forces, μ, angles) must be the one in the text
  const nums = (html) => (html.replace(/<[^>]*>/g, ' ').match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(',', '.'));
  const inText = new Set(nums(ex.text));
  for (const x of nums(ex.figure({ task: true }).replace(/<svg[^>]*>/, ''))) if (!inText.has(x)) fail(`${id}: figure shows ${x}, the text does not`);
  checkText(id, 'solution figure', ex.solutionFigure());
  ex.steps.forEach((s, k) => checkText(id, `step figure ${k + 1}`, ex.figure({ show: new Set(s.show || []), hl: new Set(s.hl || []) })));
}

// The equations of an exercise as numbers (in English, where the symbols are F_N, F_f, F_T, F_c):
// the right one must hold for the situation's values, a wrong one must not (but for a rare
// coincidence of numbers, counted per equation).
function equationValue(ex, html) {
  FS.setLang('en');
  const p = ex.p, v = ex.v, rad = (p.alpha || 0) * Math.PI / 180;
  const vals = {
    g, m: p.m, m1: p.m1, m2: p.m2, a: p.a != null ? p.a : v.a, F: p.F != null ? p.F : v.F, mu: p.mu,
    N: v.N != null ? v.N : p.m * g, R: v.R, R1: v.R1, R2: v.R2 || 0, S: v.S, K: v.K,
    SIN: sin(p.alpha || 0), COS: cos(p.alpha || 0), TAN: Math.tan(rad),
    // springs (Δx in metres) and drag; F where there is no push or pull is a "force of motion"
    // that does not exist: any value but zero
    Fs: v.Fs, k: p.k, dx: (p.dx != null ? p.dx : v.dx) / 100, D: p.D != null ? p.D : v.D,
  };
  if (vals.F == null) vals.F = 7;
  let t = html.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
  [[FS.tex('R', 1), 'R1'], [FS.tex('R', 2), 'R2'], [FS.tex('Fs'), 'Fs'], [FS.tex('D'), 'D'], [FS.tex('N'), 'N'], [FS.tex('R'), 'R'], [FS.tex('S'), 'S'], [FS.tex('K'), 'K'], [FS.tex('mu'), 'mu'],
    ['\\Delta x', 'dx'], ['\\sin\\alpha', '*SIN'], ['\\cos\\alpha', '*COS'], ['\\tan\\alpha', '*TAN'], ['m_1', 'm1'], ['m_2', 'm2'], ['\\,', '*'], ['$', '']].forEach(([a, b]) => { t = t.split(a).join(b); });
  const [lhs, rhs] = t.split('=');
  const f = (e) => Function(...Object.keys(vals), `return ${e};`)(...Object.values(vals));
  return [f(lhs), f(rhs)];
}
const holds = ([x, y]) => Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(x), Math.abs(y));
const trueWrong = {}, seenWrong = {};
function checkEquations(ex, id) {
  const lang = FS.getLang();
  P = ex.p;
  Equations.of(ex.scenario, ex.p).forEach((it) => {
    if (it.options.length !== 4) fail(`${id}: equation ${it.key} has ${it.options.length} options`);
    if (new Set(it.options.map((o) => o.html)).size !== it.options.length) fail(`${id}: equation ${it.key} has equal options`);
    if (it.options.filter((o) => o.right).length !== 1) fail(`${id}: equation ${it.key}: not exactly one right option`);
    it.options.forEach((o) => {
      if (!o.right && !o.why) fail(`${id}: equation ${it.key}: a wrong option without explanation`);
      checkText(id, `equation ${it.key}`, o.html + (o.why || ''));
    });
    checkText(id, `equation ${it.key}`, it.what + it.value);
    if (lang !== 'en') return;
    it.options.forEach((o) => {
      const val = equationValue(ex, o.html);
      if (val.some((x) => !Number.isFinite(x))) { fail(`${id}: equation ${it.key} ${o.html} is not a number: ${val}`); return; }
      if (o.right && !holds(val)) fail(`${id}: the right equation ${it.key} ${o.html} does not hold: ${val}`);
      if (!o.right) {
        const k = `${ex.scenario} ${it.key} ${o.n}`;
        seenWrong[k] = (seenWrong[k] || 0) + 1;
        if (holds(val)) trueWrong[k] = (trueWrong[k] || 0) + 1;
      }
    });
  });
  FS.setLang(lang);
}

// The results the student works out in practice, worked out here again from the parameters.
const ANSWER = {
  'rest-up': (p) => ({ N: p.m * g + (p.dir === 'up' ? -p.F : p.F) }),
  'rest-angle': (p) => ({ N: p.m * g - p.F * (p.ref === 'v' ? cos(p.alpha) : sin(p.alpha)) }),
  'pull-friction': (p) => (p.given === 'a' ? { F: p.m * p.a + p.mu * p.m * g } : { a: (p.F - p.mu * p.m * g) / p.m }),
  'incline-pull': (p) => ({ F: p.m * p.a + p.m * g * sin(p.alpha) + p.mu * p.m * g * cos(p.alpha) }),
  'table-pulley': (p) => { const a = (p.m2 * g - p.mu * p.m1 * g) / (p.m1 + p.m2); return { a, S: p.m2 * (g - a) }; },
  'incline-pulley': (p) => { const a = (p.m2 * g - p.m1 * g * sin(p.alpha) - p.mu * p.m1 * g * cos(p.alpha)) / (p.m1 + p.m2); return { a, S: p.m2 * (g - a) }; },
  'spring-hang': (p) => (p.given === 'k' ? { dx: (100 * p.m * g) / p.k } : { k: p.k }),
  'spring-floor': (p) => ({ a: ((p.k * p.dx) / 100 - p.mu * p.m * g) / p.m }),
  'drag-fall': (p) => (p.phase === 'terminal' ? { D: p.m * g } : { res: Math.abs(p.m * g - p.D), a: Math.abs(p.m * g - p.D) / p.m }),
  'drag-bike': (p) => ({ a: p.D / p.m }),
};
const UNIT = { N: 'N', F: 'N', S: 'N', D: 'N', res: 'N', a: 'a', dx: 'cm', k: 'Nm' };
const tenthOk = (x) => Math.abs(10 * x - Math.round(10 * x)) < 1e-9;
const valueOf = (html) => Number(html.replace(/^\$/, '').match(/^-?[\d.]+/)[0]);
function checkNums(ex, id) {
  const want = ANSWER[ex.scenario];
  if (!want) { if (ex.nums.length) fail(`${id}: results to work out without a check`); return; }
  const w = want(ex.p);
  if (ex.nums.map((n) => n.key).join() !== Object.keys(w).map((k) => `n-${k}`).join()) fail(`${id}: results ${ex.nums.map((n) => n.key)} instead of ${Object.keys(w)}`);
  ex.nums.forEach((n) => {
    const k = n.key.slice(2), x = w[k], right = n.options.filter((o) => o.right);
    if (n.options.length !== 4) fail(`${id}: result ${k} has ${n.options.length} options`);
    if (right.length !== 1) { fail(`${id}: result ${k}: not exactly one right option`); return; }
    if (new Set(n.options.map((o) => o.html)).size !== 4) fail(`${id}: result ${k}: equal options`);
    if (Math.abs(valueOf(right[0].html) - x) > 1e-9) fail(`${id}: result ${k} = ${right[0].html}, worked out ${x}`);
    if (!(x > 0) || !tenthOk(x)) fail(`${id}: result ${k} = ${x} is not a nice number`);
    if (UNIT[k] === 'a' && !Number.isInteger(Math.round(2 * x * 1e6) / 1e6)) fail(`${id}: acceleration ${x} is not a multiple of 0.5`);
    n.options.forEach((o) => {
      const y = valueOf(o.html);
      if (!(y >= 0) || Math.abs(1000 * y - Math.round(1000 * y)) > 1e-6) fail(`${id}: result ${k}: option ${o.html} is not a short number`);
      if (!o.right && (!o.why || !o.flag)) fail(`${id}: result ${k}: a wrong option without explanation`);
      if (!o.html.includes(`\\mathrm{${{ N: 'N', a: 'm/s^2', cm: 'cm', Nm: 'N/m' }[UNIT[k]]}}`)) fail(`${id}: result ${k}: option ${o.html} without its unit`);
      checkText(id, `result ${k}`, o.html + (o.why || ''));
    });
    if (n.options.map(o => valueOf(o.html)).some((y, j, a) => j && y < a[j - 1])) fail(`${id}: result ${k}: options not in ascending order`);
    checkText(id, `result ${k}`, n.what + n.value);
  });
}

// Practice: every situation in both languages, with nice angles (their sine and cosine in the
// text), so that the components the student identifies, the results the student works out and
// the worked solution need at most one decimal place.
let practised = 0;
const seen = {};
for (const lang of FS.LANGS) {
  FS.setLang(lang);
  for (const scn of Forces.SCENARIOS) {
    for (let seed = 1; seed <= 150; seed++) {
      const ex = Forces.practiceOf(scn.id, seed), id = `${lang} practice ${scn.id}-${seed}`;
      practised++;
      seen[scn.id] = (seen[scn.id] || 0) + 1;
      checkExercise(ex, id);
      checkEquations(ex, id);
      if (!ex.eqs.length) fail(`${id}: no equations to choose`);
      ex.fields.forEach((f) => { if (Math.abs(10 * f.value - Math.round(10 * f.value)) > 1e-9) fail(`${id}: ${f.key} = ${f.value} needs rounding`); });
      if (scn.trig && !ex.comps.length) fail(`${id}: no components to identify`);
      if (scn.trig && (!ex.p.nice || !(ex.p.alpha in NICE_SIN) || !ex.text.includes(`sin ${ex.p.alpha}°`) || !ex.text.includes(`cos ${ex.p.alpha}°`))) fail(`${id}: no nice angle given with its sine and cosine: ${ex.p.alpha}`);
      ex.comps.forEach((c) => {
        const x = c.baseVal * (c.fn === 'sin' ? sin(ex.p.alpha) : cos(ex.p.alpha));
        if (!tenthOk(x)) fail(`${id}: component ${c.key} = ${x} needs rounding`);
        if (!c.value.includes(`= ${FS.texNum(x)}\\,\\mathrm{N}$`)) fail(`${id}: component ${c.key} shown as ${c.value}, not ${x} N`);
      });
      checkNums(ex, id);
      // any angles, as in the check
      const any = Forces.generateFor(scn.id, seed);
      checkExercise(any, `${lang} any ${scn.id}-${seed}`);
      checkEquations(any, `${lang} any ${scn.id}-${seed}`);
    }
  }
}
for (const s of Forces.SCENARIOS) if (!seen[s.id]) fail(`scenario ${s.id} never generated`);
for (const [k, n] of Object.entries(trueWrong)) if (n > 0.2 * seenWrong[k]) fail(`wrong equation ${k} holds in ${n} of ${seenWrong[k]} exercises`);
log(`${practised} practice exercises checked; wrong equations that held by coincidence: ${JSON.stringify(trueWrong)}, ${Object.keys(seenWrong).length} wrong equations evaluated`);

// Find the error: a student's attempt with exactly one wrong step, a drawing, and every text set.
let errors = 0;
const slips = {};
for (const lang of FS.LANGS) {
  FS.setLang(lang);
  for (const type of ['error-floor', 'error-pulley', 'error-slope', 'error-spring', 'error-drag']) {
    for (let seed = 1; seed <= 150; seed++) {
      const ex = Forces.practiceOf(type, seed), id = `${lang} ${type}-${seed}`, it = ex.eqs[0], e = ex.p.err;
      errors++;
      if (ex.scenario !== type) fail(`${id}: type ${ex.scenario}`);
      if (it.options.length !== 4 || it.options.filter((o) => o.right).length !== 1 || !it.options[e.at].right) fail(`${id}: the wrong step is not the one to choose`);
      if (e.at && Forces.linesOf(ex.situation, ex.p)[e.eqs[e.at - 1]].options.find((o) => o.n === e.n).right) fail(`${id}: the wrong equation is right`);
      if (e.eqs.length !== 3) fail(`${id}: ${e.eqs.length} equations`);
      const group = type.slice(6), kind = e.at ? (e.eqs[e.at - 1] >= Equations.of(ex.situation, ex.p).length ? 'result' : 'equation') : e.flag;
      slips[group] = slips[group] || {};
      slips[group][kind] = (slips[group][kind] || 0) + 1;
      // the right lines hold: a result worked out is the value of the situation
      Forces.linesOf(ex.situation, ex.p).slice(Equations.of(ex.situation, ex.p).length).forEach((c) => {
        const r = c.options.find((o) => o.right).html, vals = Object.values(ex.v).map((x) => FS.texNum(x));
        if (!vals.some((x) => r.includes(`= ${x}\\,`) || r.includes(`= ${x}$`))) fail(`${id}: the result ${r} is none of the values of the situation`);
        c.options.forEach((o) => { if (!o.right && !o.why) fail(`${id}: a wrong result without explanation`); });
      });
      if (!ex.taskFigure().includes('<svg') || !ex.solutionFigure().includes('<svg')) fail(`${id}: a drawing is missing`);
      [ex.title, ex.text, it.value, ...it.options.map((o) => o.html + o.why), ...ex.hints, ...ex.solution, ex.results].forEach((x, k) => checkText(id, `text ${k}`, x));
    }
  }
}
// every kind of slip comes up: the teacher's examples for springs and drag among them
const SLIPS = { floor: ['motion', 'noFric', 'equation'], pulley: ['equation'], slope: ['equation'],
  spring: ['noSpring', 'springDir', 'dragRest', 'motion', 'noFric', 'equation', 'result'], drag: ['noDrag', 'dragDir', 'dragSize', 'motion', 'equation', 'result'] };
Object.entries(SLIPS).forEach(([group, kinds]) => kinds.forEach((k) => { if (!(slips[group] || {})[k]) fail(`find the error (${group}): no slip of the kind ${k}`); }));
log(`${errors} attempts to find the error in checked: ${JSON.stringify(slips)}`);

// The worksheet's answers (rounded as there) for the tutor's examples; the last example is a
// student's attempt with the rope force set equal to the weight of the hanging box.
const SHEET = [
  { N: 3, R: 7 },
  { res: 6, R: 18, F: 24 },
  { res: 15, a: 3, K: 6 },
  { R: 12, res: 28, a: 3.5, S: 26 },
  { res: 12, N: 35, R: 14, F: 46 },
  { N: 52, R: 21, res: 29, a: 2.1, S: 63 },
  { Fs: 20, R: 5, a: 7.5 }, // springs and drag: not on the worksheet
  { res: 320, a: 4 },
  null, // find the error (see above)
];
for (const lang of FS.LANGS) {
  FS.setLang(lang);
  Lessons.EXAMPLES.forEach((e, k) => {
    const frames = Forces.tutorial(e).frames;
    frames.forEach((f, j) => { checkText(`lesson ${k + 1}`, `frame ${j + 1} text`, f.text); checkText(`lesson ${k + 1}`, `frame ${j + 1} figure`, f.figure); });
    e.practice.forEach((s) => s.types.forEach((t) => { if (!Forces.practiceOf(t, 1)) fail(`lesson ${k + 1}: no practice of ${t}`); }));
    if (e.error) {
      const opt = Equations.of(e.scenario, e.p)[e.p.err.eqs[e.p.err.at - 1]].options.find((o) => o.n === e.p.err.n);
      if (opt.flag !== 'rope') fail(`lesson ${k + 1}: the error is ${opt.flag}, not the rope force`);
      return;
    }
    const v = Forces.SCENARIOS.find((s) => s.id === e.scenario).solve(e.p);
    for (const [key, want] of Object.entries(SHEET[k])) {
      if (Math.abs(v[key] - want) > 0.06 * want) fail(`lesson ${k + 1}: ${key} = ${v[key]}, worksheet ${want}`);
    }
  });
}

// The check: every kind of every objective gives questions with four different options, one of
// them right, and flags that name a misconception or none.
let questions = 0;
for (const lang of FS.LANGS) {
  FS.setLang(lang);
  CheckSource.objectives.forEach((o) => {
    if (!o.kinds.length || o.tutor == null || o.topic == null) fail(`objective ${o.id}: kinds, tutor or topic missing`);
    if (o.tutor >= Lessons.EXAMPLES.length || o.topic >= Lessons.EXAMPLES.length) fail(`objective ${o.id}: no such example or topic`);
    checkText(o.id, 'name', o.name());
    o.kinds.forEach((kind) => {
      for (let seed = 1; seed <= 120; seed++) {
        const q = CheckSource.question(kind, seed), id = `${lang} check ${kind}-${seed}`;
        questions++;
        if (q.options.length !== 4) fail(`${id}: ${q.options.length} options`);
        if (q.options.filter((x) => x.correct).length !== 1) fail(`${id}: not exactly one right option`);
        if (new Set(q.options.map((x) => x.html)).size !== q.options.length) fail(`${id}: equal options`);
        q.options.forEach((x) => { if (x.flag && !(x.flag in CheckSource.concept) && !['dir', 'axis', 'noK', 'fric', 'other', 'unit'].includes(x.flag)) fail(`${id}: unknown flag ${x.flag}`); });
        [q.title, q.text, q.figure, q.ask, q.explain(), ...q.options.map((x) => x.html + (x.why || ''))].forEach((x, k) => checkText(id, `part ${k}`, x));
        if (lang === 'de' && q.options.some((x) => /\b(upwards|downwards|to the (left|right)|backwards|forwards|weight)\b/.test(x.html + (x.why || '')))) fail(`${id}: English in a German option`);
      }
    });
  });
  Object.values(CheckSource.concept).forEach((c) => { if (!CheckSource.concepts()[c]) fail(`concept ${c} has no name`); });
}
// the new objectives show their misconceptions among the wrong options
FS.setLang('en');
const flagsOf = (kind) => new Set(Array.from({ length: 200 }, (_, k) => CheckSource.question(kind, k + 1).options.map((x) => x.flag)).flat());
[['spring-dir', ['stretch', 'unit']], ['spring-law', ['stretch', 'hooke', 'noFric']], ['spring-forces', ['motion']],
  ['drag-dir', ['accel', 'motion', 'terminal']], ['drag-law', ['accel', 'motion', 'terminal', 'noDrag']], ['drag-forces', ['motion', 'noDrag']]].forEach(([kind, want]) => {
  const got = flagsOf(kind);
  want.forEach((f) => { if (!got.has(f)) fail(`check ${kind}: no option with the misconception ${f}`); });
});
log(`${questions} check questions checked`);

// The order of topics and stages: the straight case first, then at an angle or on a slope; Find
// the error after the spring force and air resistance, with spring and drag cases of its own; the
// objectives point to their worked examples and topics.
const names = Lessons.EXAMPLES.map((e) => e.name.en), stagesOf = (i) => Lessons.EXAMPLES[i].practice.map((x) => x.types.join('+'));
const ORDER = [['At rest', ['rest-up', 'rest-angle']], ['Up a slope', ['pull-friction', 'incline-pull']], ['Slope and pulley', ['table-pulley', 'incline-pulley']],
  ['Find the error', ['error-floor', 'error-pulley', 'error-slope', 'error-spring', 'error-drag']]];
ORDER.forEach(([n, st]) => { if (stagesOf(names.indexOf(n)).join() !== st.join()) fail(`topic ${n}: stages ${stagesOf(names.indexOf(n))}, not ${st}`); });
if (names.join() !== 'At rest,Pulled with friction,Two boxes pushed,Over the table edge,Up a slope,Slope and pulley,Spring force,Air resistance,Find the error') fail(`order of the topics: ${names}`);
const OBJ = { forces: 'Pulled with friction', slope: 'Up a slope', system: 'Two boxes pushed', law: 'Over the table edge', spring: 'Spring force', drag: 'Air resistance', error: 'Find the error' };
CheckSource.objectives.forEach((o) => { if (names[o.tutor] !== OBJ[o.id] || names[o.topic] !== OBJ[o.id]) fail(`objective ${o.id}: example ${names[o.tutor]}, topic ${names[o.topic]}`); });
if (CheckSource.objectives.map((o) => o.id).join() !== 'forces,slope,system,law,spring,drag,error') fail('order of the objectives');

// At least 20 different exercises in each stage of practice (as topics.js counts them: by ex.p).
FS.setLang('en');
Lessons.EXAMPLES.forEach((e) => e.practice.forEach((st) => {
  const keys = new Set();
  for (let k = 1; k <= 400; k++) keys.add(JSON.stringify(Forces.practiceOf(st.types[k % st.types.length], 7919 * k).p));
  if (keys.size < 20) fail(`${e.name.en} · ${st.types}: only ${keys.size} different exercises`);
}));

// Air resistance acts at the body's centre (where the weight starts, beside it), in every phase;
// ticked where it does not act (a box hanging at rest), it starts at the centre's height, on the
// body, beside the spring force.
const byId = (id) => Forces.SCENARIOS.find((x) => x.id === id);
const centreOf = (forces) => { const w = forces.find((f) => f.kind === 'g'); return [w.at[0] + 6, w.at[1]]; };
for (let seed = 1; seed <= 60; seed++) {
  ['drag-fall', 'drag-bike'].forEach((id) => {
    const ex = Forces.practiceOf(id, seed), sc = byId(id).scene(ex.p, ex.v, {}), D = sc.forces.find((f) => f.kind === 'd'), c = centreOf(sc.forces);
    if (Math.hypot(D.at[0] - c[0], D.at[1] - c[1]) > 9) fail(`${id}-${seed} (${ex.p.phase || ''}): air resistance acts at ${D.at}, the centre is ${c}`);
  });
  const ex = Forces.practiceOf('spring-hang', seed), t = ex.forces, j = t.kinds.findIndex((k) => k.kind === 'd');
  const svg = ex.taskFigure(new Set([`0:${j}`])), sc = byId('spring-hang').scene(ex.p, ex.v, {}), c = centreOf(sc.forces);
  const m = svg.match(/class="seq force k-d[^"]*"><line x1="([\d.]+)" y1="([\d.]+)"/);
  if (!m || Math.abs(m[2] - c[1]) > 2 || Math.abs(m[1] - c[0]) > 30) fail(`spring-hang-${seed}: air resistance ticked is drawn at ${m && m.slice(1)}, the centre is ${c}`);
}

// Saved progress of the earlier order (version 1) moves along with its content: the stage a
// student had reached, the topic and stage chosen and the exercises solved name the same types.
const OLD = [['rest-angle', 'rest-up'], ['pull-friction'], ['push-pair', 'rope-pair'], ['table-pulley', 'atwood'], ['incline-pull'], ['incline-pulley'],
  ['error-floor', 'error-pulley', 'error-slope'], ['spring-floor', 'spring-hang'], ['drag-fall', 'drag-bike']];
function fakeStorage(init) {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, JSON.stringify(v)]));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), read: (k) => JSON.parse(m.get(k)) };
}
const typesNow = (t, s) => (Lessons.EXAMPLES[t].practice[s] || { types: ['all'] }).types.join('+');
const oldProgress = {}, oldDone = [];
OLD.forEach((st, t) => st.forEach((x, s) => { oldDone.push(`p${t + 1}.${s + 1}-${100 * t + s}`); }));
OLD.forEach((st, t) => { oldProgress[t] = { stage: st.length - 1, wins: 1 }; });
const store = fakeStorage({ 'fs-progress': oldProgress, 'fs-topic': { topic: 7, stage: 1 }, 'fs-topic@class': { topic: 0, stage: 0 }, 'fs-done': oldDone, 'fs-score': { solved: 3, clean: 1 } });
Lessons.migrate(store);
const prog = store.read('fs-progress');
OLD.forEach((st, t) => {
  const was = st[st.length - 1], k = Object.keys(prog).find((x) => typesNow(Number(x), prog[x].stage) === was);
  if (k == null || prog[k].wins !== 1) fail(`migration: progress at ${was} (topic ${t + 1}) lost: ${JSON.stringify(prog)}`);
});
if (Object.keys(prog).length !== OLD.length) fail(`migration: ${Object.keys(prog).length} topics in the progress`);
const cur = store.read('fs-topic');
if (typesNow(cur.topic, cur.stage) !== 'spring-hang') fail(`migration: topic chosen ${JSON.stringify(cur)}`);
const curSet = store.read('fs-topic@class');
if (typesNow(curSet.topic, curSet.stage) !== 'rest-angle') fail(`migration: topic chosen in a set ${JSON.stringify(curSet)}`);
store.read('fs-done').forEach((id, k) => {
  const [, t, s] = /^p(\d+)\.(\d+)-(\d+)$/.exec(id), was = /^p(\d+)\.(\d+)-/.exec(oldDone[k]);
  if (typesNow(t - 1, s - 1) !== OLD[was[1] - 1][was[2] - 1] || !id.endsWith(oldDone[k].split('-')[1])) fail(`migration: solved ${oldDone[k]} became ${id}`);
});
if (JSON.stringify(store.read('fs-score')) !== '{"solved":3,"clean":1}') fail('migration: the score changed');
// once only; and the last step of Find the error (all steps) goes on with the springs
Lessons.migrate(store);
if (JSON.stringify(store.read('fs-progress')) !== JSON.stringify(prog)) fail('migration: ran twice');
const allSteps = fakeStorage({ 'fs-progress': { 6: { stage: 3, wins: 0 } } });
Lessons.migrate(allSteps);
if (typesNow(8, allSteps.read('fs-progress')[8].stage) !== 'error-spring') fail(`migration: Find the error, all steps: ${JSON.stringify(allSteps.read('fs-progress'))}`);
const fresh = fakeStorage({});
Lessons.migrate(fresh);
if (fresh.read('fs-layout') !== Lessons.LAYOUT) fail('migration: no version stored');
if (Lessons.oldTutor(6) !== names.indexOf('Find the error') || Lessons.oldTutor(3) !== 3) fail('legacy sets: worked examples');

log(`${checked} exercises checked, ${Object.keys(seen).length} situations: ${JSON.stringify(seen)}`);
log(failures ? `${failures} failures` : 'all checks passed');
if (typeof process !== 'undefined' && failures) process.exit(1);
