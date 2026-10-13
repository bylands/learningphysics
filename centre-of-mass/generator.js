// Exercises and worked examples from the scenarios (see scenarios.js).
// exercise(scenario, p) gives { scenario, title, text, fields: [{ key, sym, unit, dec, what, value,
// traps: [{ value, why, nudge, flag }] }], figure(view), hints, solution, results };
// practiceOf(scenario, seed) one of a given situation for practice, generateFor(scenario, seed) one
// for the check; quiz(exercise, seed) a multiple-choice question about one of its quantities;
// tutorial(lesson) the tutor's frames.
(function (root) {
  'use strict';

  const TQ = root.TQ, { SCENARIOS } = root.Scenarios;
  const { L, tex, tq, rng } = TQ;

  const byId = (id) => SCENARIOS.find((s) => s.id === id);
  const same = (x, y) => Math.abs(x - y) <= 0.015 * Math.max(Math.abs(y), 0.05);

  function exercise(scn, p) {
    const v = scn.solve(p);
    const why = (flag) => (scn.why && scn.why[flag] ? scn.why[flag]() : '');
    const nudge = (flag) => (scn.nudge && scn.nudge[flag] ? scn.nudge[flag]() : '');
    const wrong = scn.traps.map((flag) => ({ vals: scn.solve(p, { [flag]: true }), why: why(flag), nudge: nudge(flag), flag }));
    const fields = scn.fields(p).map((f) => ({
      ...f,
      value: v[f.key],
      traps: wrong.map((w) => ({ value: w.vals[f.key], why: w.why, nudge: w.nudge, flag: w.flag })).filter((t) => Number.isFinite(t.value) && !same(t.value, v[f.key])),
    }));
    const steps = scn.steps(p, v);
    const all = new Set(steps.flatMap((s) => s.show || []));
    return {
      scenario: scn.id,
      family: scn.family,
      difficulty: scn.difficulty,
      title: scn.title(p),
      text: `<p>${scn.text(p)}</p>`,
      fields,
      figure: (view = { task: true }) => scn.figure(p, v, view),
      solutionFigure: () => scn.figure(p, v, { show: all }),
      hints: scn.hints(p, v),
      solution: steps.map((s) => s.text),
      results: scn.results ? scn.results(p, v) : fields.map((f) => `$${tex(...f.sym)} = ${tq(f.value, f.unit, f.dec)}$`).join(', '),
      steps,
      comps: [],
      p, v,
    };
  }

  // Parameters for which ok(p) holds, if found; else the first that fit at all.
  function make(scn, r, ok) {
    let first = null;
    for (let k = 0; k < 5000; k++) {
      const p = scn.make(r);
      if (!p) continue;
      if (!ok || ok(p)) return p;
      first = first || p;
    }
    return first;
  }
  // Results exact to their decimal places, so that none needs rounding (no calculator needed).
  const exactTo = (x, dec) => Math.abs(x * 10 ** dec - Math.round(x * 10 ** dec)) < 1e-6;
  const neat = (scn) => (p) => { const v = scn.solve(p); return scn.fields(p).every((f) => exactTo(v[f.key], f.dec)); };

  // A practice exercise of the given situation, with the item to choose for a choice.
  function practiceOf(scenario, seed) {
    const scn = byId(scenario), ex = exercise(scn, make(scn, rng(seed), neat(scn)));
    return { ...ex, comps: scn.comps ? scn.comps(ex.p) : [], seed };
  }

  // An exercise of the given situation, for the check.
  function generateFor(scenario, seed) {
    const scn = byId(scenario);
    return { ...exercise(scn, make(scn, rng(seed), neat(scn))), seed };
  }

  // A multiple-choice question about one quantity of an exercise: the right value and three wrong
  // ones, first those of typical wrong ideas, then other quantities of the exercise, then simple
  // slips. All options positive and clearly different.
  function quiz(ex, seed) {
    const r = rng(seed), shuffle = (a) => TQ.shuffle(r, a);
    const cands = ex.fields.filter((f) => f.traps.length && f.value > 0);
    const f = cands.length ? cands[Math.floor(r() * cands.length)] : ex.fields.filter((g) => g.value > 0)[0] || ex.fields[0];
    const options = [{ value: f.value, correct: true }];
    const fits = (x) => Number.isFinite(x) && x > 0 && x < 1e4 && options.every((o) => Math.abs(o.value - x) > Math.max(10 ** -f.dec * 2, 0.06 * Math.max(o.value, x)));
    const add = (list) => { for (const o of list) if (options.length < 4 && fits(TQ.round(o.value, f.dec))) options.push({ ...o, value: TQ.round(o.value, f.dec) }); };
    add(shuffle(f.traps.map((t) => ({ value: t.value, flag: t.flag, why: t.why }))));
    add(shuffle(ex.fields.filter((g) => g !== f && g.unit === f.unit).map((g) => ({ value: g.value }))));
    const v = f.value;
    add(shuffle([2 * v, v / 2, 1.5 * v, v / 1.5, 3 * v, v / 3, 1.25 * v, 0.8 * v].map((value) => ({ value }))));
    return { field: f, options: shuffle(options) };
  }

  // The tutor: the situation with what is wanted, then the steps of the solution.
  function tutorial(lesson) {
    const ex = exercise(byId(lesson.scenario), lesson.p);
    const wanted = ex.fields.map((f) => `${f.what} $${tex(...f.sym)}$`).join(', ');
    const first = {
      text: `<p class="step-rule">${L('The situation', 'Die Situation')}</p>${ex.text}${wanted ? `<p>${L('Wanted', 'Gesucht')}: ${wanted}.</p>` : ''}`,
      figure: ex.figure({ task: true }),
    };
    const frames = ex.steps.map((s) => ({ text: s.text, figure: ex.figure({ show: new Set(s.show || []), hl: new Set(s.hl || []) }) }));
    return { frames: [first, ...frames] };
  }

  root.Com = { SCENARIOS, generateFor, practiceOf, quiz, tutorial, exercise };
  if (typeof module !== 'undefined') module.exports = root.Com;
})(typeof window !== 'undefined' ? window : globalThis);
