// Exercises and worked examples from the situations (see scenarios.js).
// practiceOf(type, seed) gives { scenario, difficulty, title, text, fields, figure(view),
// solutionFigure(), hints, solution, results, p, v }: a number field has its value in its unit and
// traps [{ value, why, nudge, flag }] (the answers under typical wrong ideas; why explains the
// mistake, as in the check, nudge is the feedback in practice), a choice, direction or
// ranking field its right answer (a direction or choice also traps: the answers under typical wrong
// ideas). quiz(exercise, seed, key) gives a multiple-choice question about one of its fields (for the
// check), tutorial(lesson) the tutor's frames.
(function (root) {
  'use strict';

  const CL = root.CL, { SCENARIOS } = root.Scenarios;
  const { L, rng, inUnit, tq, num, ARROW, dirName } = CL;

  const byId = (id) => SCENARIOS.find((s) => s.id === id);
  const same = (x, y) => Math.abs(x - y) <= 0.015 * Math.max(Math.abs(y), 1e-12);
  const LETTERS = ['A', 'B', 'C', 'D'];

  // the right answer of a field, as shown in the results
  function answerHtml(f) {
    if (f.type === 'num') return `$${f.sym} = ${tq(f.value * (CL.UNITS[f.unit] || [1])[0], f.unit)}$`;
    if (f.type === 'dir') return `${ARROW[f.value]} ${dirName(f.value)}`;
    if (f.type === 'rank') return Object.entries(f.value).sort((a, b) => a[1] - b[1]).map(([k]) => k).join(' > ');
    return (f.options.find((o) => o[0] === f.value) || [, ''])[1];
  }

  function exercise(scn, p) {
    const v = scn.solve(p);
    const why = (flag) => (scn.why && scn.why[flag] ? scn.why[flag]() : '');
    // the nudge after a wrong answer in practice, where the why would give the answer away
    const nudge = (flag) => (scn.nudge && scn.nudge[flag] ? scn.nudge[flag]() : why(flag));
    const wrong = scn.traps.map((flag) => ({ vals: scn.solve(p, { [flag]: true }), why: why(flag), nudge: nudge(flag), flag }));
    const fields = scn.fields(p).map((f) => {
      // a direction or a choice: the other answers that typical wrong ideas give
      if (f.type === 'dir' || f.type === 'choice') {
        const traps = wrong.map((w) => ({ value: w.vals[f.key], why: w.why, nudge: w.nudge, flag: w.flag }))
          .filter((t, i, all) => t.value != null && t.value !== v[f.key] && all.findIndex((u) => u.value === t.value) === i);
        return { ...f, value: v[f.key], traps };
      }
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
      results: fields.map(answerHtml).join(', '),
      steps,
      p, v,
    };
  }

  // Parameters of a situation (make may refuse a draw: null).
  function make(scn, r) {
    for (let k = 0; k < 20000; k++) { const p = scn.make(r); if (p) return p; }
    throw new Error(`no parameters for ${scn.id}`);
  }
  // A practice exercise of the given situation.
  function practiceOf(scenario, seed) {
    const scn = byId(scenario);
    return { ...exercise(scn, make(scn, rng(seed))), seed };
  }

  // A multiple-choice question about one field of an exercise (the one of the key, if given): for a
  // number, the right value and three wrong ones (typical wrong ideas first, then simple slips); for
  // a direction, choice or ranking, other answers of the same kind (typical wrong ideas first).
  function quiz(ex, seed, key) {
    const r = rng(seed), shuffle = (a) => CL.shuffle(r, a);
    // a number with typical wrong ideas first, else any field with at least four answers
    const f = (key && ex.fields.find((g) => g.key === key)) || ex.fields.find((g) => g.type === 'num' && g.traps.length) || ex.fields.find((g) => g.type === 'num' || g.type === 'rank' || (g.type === 'dir' && g.dirs.length >= 4)) || ex.fields[0];
    const options = [{ value: f.value, correct: true }];
    if (f.type === 'num') {
      const fits = (x) => Number.isFinite(x) && x > 0 && options.every((o) => Math.abs(o.value - x) > 0.06 * Math.max(o.value, x));
      const add = (list) => { for (const o of list) if (options.length < 4 && fits(CL.sig(o.value))) options.push({ ...o, value: CL.sig(o.value) }); };
      add(shuffle(f.traps.map((t) => ({ value: t.value, flag: t.flag, why: t.why }))));
      const v = f.value;
      add(shuffle([2 * v, v / 2, 4 * v, v / 4, 10 * v, v / 10, 3 * v, v / 3].map((value) => ({ value }))));
    } else if (f.type === 'dir') {
      // typical wrong ideas first, then other directions ("no force" only when right or typical)
      shuffle(f.traps.filter((t) => f.dirs.includes(t.value))).forEach((t) => { if (options.length < 4) options.push({ value: t.value, flag: t.flag, why: t.why }); });
      shuffle(f.dirs.filter((d) => d !== '0' && options.every((o) => o.value !== d))).slice(0, 4 - options.length).forEach((value) => options.push({ value }));
    } else if (f.type === 'rank') {
      const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((rest) => [x, ...rest])));
      const right = Object.entries(f.value).sort((a, b) => a[1] - b[1]).map(([k]) => k).join(' > ');
      options[0].value = right;
      shuffle(perms(f.items).map((p) => p.join(' > ')).filter((s) => s !== right)).slice(0, 3).forEach((value) => options.push({ value }));
    } else {
      f.options.filter((o) => o[0] !== f.value).forEach((o) => { const t = f.traps.find((x) => x.value === o[0]); options.push(t ? { value: o[0], flag: t.flag, why: t.why } : { value: o[0] }); });
    }
    const html = (o) => (f.type === 'num' ? `$${tq(o.value * (CL.UNITS[f.unit] || [1])[0], f.unit)}$` : f.type === 'dir' ? `${ARROW[o.value]} ${dirName(o.value)}` : f.type === 'rank' ? o.value : f.options.find((x) => x[0] === o.value)[1]);
    return { field: f, options: shuffle(options).map((o) => ({ ...o, html: html(o) })) };
  }

  // The tutor: the situation with what is wanted, then the steps of the solution.
  function tutorial(lesson) {
    const ex = exercise(byId(lesson.scenario), lesson.p);
    const wanted = ex.fields.map((f) => (f.type === 'num' ? `${f.what} $${f.sym}$` : f.want || f.what)).join(', ');
    const first = {
      text: `<p class="step-rule">${L('The situation', 'Die Situation')}</p>${ex.text}<p>${L('Wanted', 'Gesucht')}: ${wanted}.</p>`,
      figure: ex.figure({ task: true }),
    };
    const frames = ex.steps.map((s) => ({ text: s.text, figure: ex.figure({ show: new Set(s.show || []), hl: new Set(s.hl || []) }) }));
    return { frames: [first, ...frames] };
  }

  root.Coulomb = { SCENARIOS, practiceOf, quiz, tutorial, exercise, byId, num, LETTERS };
  if (typeof module !== 'undefined') module.exports = root.Coulomb;
})(typeof window !== 'undefined' ? window : globalThis);
