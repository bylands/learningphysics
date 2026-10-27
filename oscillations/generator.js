// Exercises and worked examples from the exercise types (see scenarios.js).
// practiceOf(type, seed) gives { scenario, difficulty, title, text, fields, figure(view),
// solutionFigure(), hints, solution, results, watch(), p, v }: watch() the run to watch once
// solved (oscWatch in scenarios.js; null for a type without one); a number field has its value in its unit and
// traps [{ value, why, flag }] (the answers under typical wrong ideas), a choice field its right
// answer. quiz(exercise, seed) gives a multiple-choice question about one of its fields (for the
// check), tutorial(lesson) the tutor's frames.
(function (root) {
  'use strict';

  const OC = root.OC, { SCENARIOS } = root.Scenarios;
  const { L, rng, inUnit, tq } = OC;

  const byId = (id) => SCENARIOS.find((s) => s.id === id);
  const same = (x, y) => Math.abs(x - y) <= 0.015 * Math.max(Math.abs(y), 1e-12);

  // the right answer of a field, as shown in the results
  function answerHtml(f) {
    if (f.type === 'num') return `$${f.sym} = ${f.show || tq(f.value * (OC.UNITS[f.unit] || [1])[0], f.unit)}$`;
    return (f.options.find((o) => o[0] === f.value) || [, ''])[1];
  }

  function exercise(scn, p) {
    const v = scn.solve(p);
    const why = (flag) => (scn.why && scn.why[flag] ? scn.why[flag]() : '');
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
      // the task asking for one field only (for the check)
      textFor: (key) => `<p>${scn.text(p, key)}</p>`,
      fields,
      figure: (view = { task: true }) => scn.figure(p, v, view),
      solutionFigure: () => scn.figure(p, v, { show: all }),
      hints: scn.hints(p, v),
      solution: steps.map((s) => s.text),
      results: fields.map((f) => (f.pics ? '' : answerHtml(f))).filter(Boolean).join(', '),
      steps,
      watch: scn.watch ? () => scn.watch(p, v) : null,
      p, v,
    };
  }

  // Parameters of an exercise type (make may refuse a draw: null).
  function make(scn, r) {
    for (let k = 0; k < 20000; k++) { const p = scn.make(r); if (p) return p; }
    throw new Error(`no parameters for ${scn.id}`);
  }
  function practiceOf(scenario, seed) {
    const scn = byId(scenario);
    return { ...exercise(scn, make(scn, rng(seed))), seed };
  }

  // A multiple-choice question about one field of an exercise: a choice with four options as it
  // is; else a number, with the right value and three wrong ones (typical wrong ideas first, then
  // simple slips).
  function quiz(ex, seed) {
    const r = rng(seed), shuffle = (a) => OC.shuffle(r, a);
    const four = ex.fields.filter((g) => g.type === 'choice' && g.options.length >= 4).pop();
    if (four) {
      return { field: four, options: shuffle(four.options.slice(0, 4).map(([value, html, why, flag]) => ({ value, html, correct: value === four.value, why: value === four.value ? '' : why, flag: value === four.value ? null : flag }))) };
    }
    const f = ex.fields.find((g) => g.type === 'num' && g.traps.length) || ex.fields.find((g) => g.type === 'num');
    const options = [{ value: f.value, correct: true }];
    const fits = (x) => Number.isFinite(x) && (f.signed || x > 0) && options.every((o) => Math.abs(o.value - x) > 0.06 * Math.max(Math.abs(o.value), Math.abs(x)));
    const add = (list) => { for (const o of list) if (options.length < 4 && fits(OC.sig(o.value))) options.push({ ...o, value: OC.sig(o.value) }); };
    add(shuffle(f.traps.map((t) => ({ value: t.value, flag: t.flag, why: t.why }))));
    const v = f.value;
    add(shuffle([2 * v, v / 2, 4 * v, v / 4, 10 * v, v / 10, 3 * v, v / 3, -v].map((value) => ({ value, why: '' }))));
    const html = (o) => `$${tq(o.value * (OC.UNITS[f.unit] || [1])[0], f.unit)}$`;
    return { field: f, options: shuffle(options).map((o) => ({ ...o, html: html(o) })) };
  }

  // The tutor: the task with what is wanted, then the steps of the solution; then the same for
  // each further exercise of the example (lesson.more). With lesson.watch (the index of one of
  // these exercises), a frame right after it to watch its run (app.js): tutorial(lesson).watch(); with
  // lesson.page, the frame links to the run on a page of its own (watch-page.js).
  // a choice of graphs or pictures: its options, read-only, so that the task can be read
  const pics = (ex) => ex.fields.filter((f) => f.type === 'choice' && f.pics && !f.after)
    .map((f) => `<span class="choices levels small pics tq-pics">${f.options.map((o) => `<label><span>${o[1]}</span></label>`).join('')}</span>`).join('');
  function framesOf(lesson) {
    const scn = byId(lesson.scenario), ex = exercise(scn, lesson.p || make(scn, rng(lesson.seed)));
    const wanted = ex.fields.filter((f) => !f.after).map((f) => (f.type === 'num' ? `${f.what} $${f.sym}$` : f.what.replace(/:$/, ''))).join(', ');
    const first = {
      text: `<p class="step-rule">${L('The task', 'Die Aufgabe')}</p>${ex.text}<p>${L('Wanted', 'Gesucht')}: ${wanted}</p>` + pics(ex),
      figure: ex.figure({ task: true }),
    };
    return [first, ...ex.steps.map((s) => ({ text: s.text, figure: ex.figure({ show: new Set(s.show || []) }) }))];
  }
  const WATCH_TEXT = {
    spring: () => L('Let the body go and watch: at the turning points it stops for a moment, and its acceleration is largest, pointing back; through the equilibrium it is fastest, and the acceleration is zero.',
      'Lass den Körper los und schau zu: An den Umkehrpunkten steht er einen Moment still, und seine Beschleunigung ist am grössten und zeigt zurück; durch die Gleichgewichtslage geht er am schnellsten, und die Beschleunigung ist null.'),
    pointer: () => L('Set the pointer turning and watch the body follow the height of its tip: one turn is one period, and the graph of y(t) is a cosine, shifted in time by the initial phase.',
      'Lass den Zeiger drehen und schau zu, wie der Körper der Höhe seiner Spitze folgt: Eine Umdrehung ist eine Periode, und der Graph von y(t) ist ein Kosinus, zeitlich verschoben um die Anfangsphase.'),
    track: () => L('Let the body go and watch it move as the equation says, while its graph is drawn.',
      'Lass den Körper los und schau zu, wie er sich gemäss der Gleichung bewegt, während sein Graph entsteht.'),

    damped: () => L('Let the body go and watch: it keeps its period, while its swings get smaller and smaller.',
      'Lass den Körper los und schau zu: Er behält seine Periode, während seine Schwingungen immer kleiner werden.'),
  };
  function tutorial(lesson) {
    const all = [lesson, ...(lesson.more || [])], parts = all.map(framesOf);
    // a further exercise starts with a heading: the next equation (or exercise)
    const eq = byId(lesson.scenario).kind === 'shm';
    parts.slice(1).forEach((fr, i) => { fr[0].text = `<p class="step-rule">${eq ? L(`Another equation (${i + 2} of ${parts.length})`, `Eine weitere Gleichung (${i + 2} von ${parts.length})`) : L(`Another exercise (${i + 2} of ${parts.length})`, `Eine weitere Aufgabe (${i + 2} von ${parts.length})`)}</p>${fr[0].text.replace(/^<p class="step-rule">[^<]*<\/p>/, '')}`; });
    if (lesson.watch == null) return { frames: parts.flat(), watch: null };
    const one = all[lesson.watch], scn = byId(one.scenario), watch = () => exercise(scn, one.p || make(scn, rng(one.seed))).watch();
    // with lesson.page, a link to the run on a page of its own (watch-page.js)
    const page = lesson.page ? `<p class="note"><a href="${lesson.page}/" target="_blank" rel="noopener">${L('Open it on a page of its own ↗', 'Auf einer eigenen Seite öffnen ↗')}</a></p>` : '';
    const w = watch(), say = WATCH_TEXT[w.fn ? 'damped' : w.kind];
    const frame = { text: `<p class="step-rule">${L('Watch it happen', 'Zuschauen')}</p><p>${say()}</p>${page}`, figure: '<div class="pw-host osw-host"></div>' };
    // right after the exercise it belongs to
    parts[lesson.watch].push(frame);
    return { frames: parts.flat(), watch };
  }

  root.Osc = { SCENARIOS, practiceOf, quiz, tutorial, exercise, byId, WATCH_TEXT };
  if (typeof module !== 'undefined') module.exports = root.Osc;
})(typeof window !== 'undefined' ? window : globalThis);
