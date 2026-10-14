// Exercises and worked examples from the exercise types (see scenarios.js).
// practiceOf(type, seed, o) gives { scenario, difficulty, title, text, fields, figure(view),
// solutionFigure(), hints, solution, results, p, v }: a number field has its value in its unit and
// traps [{ value, why, nudge, flag }] (the answers under typical wrong ideas), a choice field its right
// answer, a ranking its order (value, and answer as shown). With o.drag, a type that has one takes
// its variant for practice by drag and drop (scn.drag: text, fields with a ranking, steps), which
// the check cannot ask. quiz(exercise, seed) gives a multiple-choice question about one of its
// fields (for the check), tutorial(lesson) the tutor's frames.
(function (root) {
  'use strict';

  const EW = root.EW, { SCENARIOS } = root.Scenarios;
  const { L, rng, inUnit, tq } = EW;

  const byId = (id) => SCENARIOS.find((s) => s.id === id);
  const same = (x, y) => Math.abs(x - y) <= 0.015 * Math.max(Math.abs(y), 1e-300);

  // the right answer of a field, as shown in the results
  function answerHtml(f) {
    if (f.type === 'rank') return f.answer;
    if (f.type === 'num') return `$${f.sym} = ${tq(f.value * (EW.UNITS[f.unit] || [1])[0], f.unit)}$`;
    return (f.options.find((o) => o[0] === f.value) || [, ''])[1];
  }

  function exercise(scn, p, o = {}) {
    if (o.drag && scn.drag) scn = { ...scn, ...scn.drag };
    const v = scn.solve(p);
    const why = (flag) => (scn.why && scn.why[flag] ? scn.why[flag]() : '');
    // the nudge after a wrong answer in practice, where the explanation (for the check) would give the answer away
    const nudge = (flag) => (scn.nudge && scn.nudge[flag] ? scn.nudge[flag]() : '');
    const wrong = scn.traps.map((flag) => ({ vals: scn.solve(p, { [flag]: true }), why: why(flag), nudge: nudge(flag), flag }));
    const fields = scn.fields(p, v).map((f) => {
      if (f.type !== 'num') return { ...f, value: v[f.key] };
      const value = inUnit(v[f.key], f.unit);
      const traps = wrong.map((w) => ({ value: inUnit(w.vals[f.key], f.unit), why: w.why, nudge: w.nudge, flag: w.flag }))
        .filter((t, i, all) => Number.isFinite(t.value) && !same(t.value, value) && all.findIndex((u) => same(u.value, t.value)) === i);
      return { ...f, value, traps };
    });
    const steps = scn.steps(p, v);
    const all = new Set(steps.flatMap((s) => s.show || []));
    return {
      scenario: scn.id,
      difficulty: scn.difficulty,
      title: scn.title(p),
      text: `<p>${scn.text(p)}</p>`,
      fields,
      figure: (view = { task: true }) => scn.figure(p, v, view),
      solutionFigure: () => scn.figure(p, v, { show: all }),
      hints: scn.hints(p, v),
      solution: steps.map((s) => s.text),
      results: fields.map(answerHtml).filter(Boolean).join(', '),
      steps,
      p, v,
    };
  }

  // Parameters of an exercise type (make may refuse a draw: null).
  function make(scn, r) {
    for (let k = 0; k < 20000; k++) { const p = scn.make(r); if (p) return p; }
    throw new Error(`no parameters for ${scn.id}`);
  }
  function practiceOf(scenario, seed, o = {}) {
    const scn = byId(scenario);
    return { ...exercise(scn, make(scn, rng(seed)), o), seed };
  }

  // A multiple-choice question about one field of an exercise: a choice with four options as it
  // is; else a number, with the right value and three wrong ones (typical wrong ideas first, then
  // simple slips). Where an exercise has both, or several numbers with typical wrong ideas, the seed
  // decides.
  function quiz(ex, seed) {
    const r = rng(seed), shuffle = (a) => EW.shuffle(r, a);
    const four = ex.fields.filter((g) => g.type === 'choice' && g.options.length >= 4).pop();
    const nums = ex.fields.filter((g) => g.type === 'num' && g.value > 0);
    if (four && (!nums.length || seed % 2 === 0)) {
      const right = four.options.find((o) => o[0] === four.value), opts = [right, ...four.options.filter((o) => o !== right).slice(0, 3)];
      return { field: four, options: (four.stack ? shuffle(opts) : four.options.filter((o) => opts.includes(o))).map(([value, html, why, flag]) => ({ value, html, correct: value === four.value, why: value === four.value ? '' : why, flag: value === four.value ? null : flag })) };
    }
    const trapped = nums.filter((g) => g.traps.length), f = trapped.length ? trapped[Math.floor(seed / 2) % trapped.length] : nums[0];
    const options = [{ value: f.value, correct: true }];
    const fits = (x) => Number.isFinite(x) && x > 0 && options.every((o) => Math.abs(o.value - x) > 0.06 * Math.max(Math.abs(o.value), Math.abs(x)));
    const add = (list) => { for (const o of list) if (options.length < 4 && fits(EW.sig(o.value))) options.push({ ...o, value: EW.sig(o.value) }); };
    add(shuffle(f.traps.map((t) => ({ value: t.value, flag: t.flag, why: t.why }))));
    const v = f.value;
    add(shuffle([2 * v, v / 2, 4 * v, v / 4, 10 * v, v / 10, 3 * v, v / 3].map((value) => ({ value, why: '' }))));
    const html = (o) => `$${tq(o.value * (EW.UNITS[f.unit] || [1])[0], f.unit)}$`;
    return { field: f, options: shuffle(options).map((o) => ({ ...o, html: html(o) })) };
  }

  // The tutor: the frames that introduce the idea (lesson.intro), then the task with what is
  // wanted, then the steps of its solution.
  function tutorial(lesson) {
    const scn = byId(lesson.scenario), ex = exercise(scn, lesson.p);
    // numbers are named as wanted; a choice lists its options
    const nums = ex.fields.filter((f) => f.type === 'num'), choices = ex.fields.filter((f) => f.type !== 'num');
    const wanted = nums.length ? `<p>${L('Wanted', 'Gesucht')}: ${nums.map((f) => `${f.what} $${f.sym}$`).join(', ')}</p>` : '';
    const offered = choices.map((f) => `<p>${L('Choose from', 'Zur Auswahl')}: ${f.options.map((o) => `<span class="opt">${o[1]}</span>`).join(' · ')}</p>`).join('');
    const intro = (lesson.intro || []).map((fr) => ({ text: `<p class="step-rule">${fr.title()}</p>${fr.text()}`, figure: fr.figure() }));
    const task = {
      text: `<p class="step-rule">${L('An exercise', 'Eine Aufgabe')}</p>${ex.text}${wanted}${offered}`,
      // without a figure of its own, the task shows the solution's figure before any step marks it
      figure: ex.figure({ task: true }) || ex.figure({ show: new Set() }),
    };
    return { frames: [...intro, task, ...ex.steps.map((s) => ({ text: s.text, figure: ex.figure({ show: new Set(s.show || []) }) }))] };
  }

  root.EWaves = { SCENARIOS, practiceOf, quiz, tutorial, exercise, byId };
  if (typeof module !== 'undefined') module.exports = root.EWaves;
})(typeof window !== 'undefined' ? window : globalThis);
