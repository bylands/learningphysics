// Exercises and worked examples from the situations (see scenarios.js).
// practiceOf(type, seed) gives { scenario, difficulty, title, text, fields, figure(view),
// solutionFigure(), hints, solution, results, p, v }: a number field has its value in its unit and
// traps [{ value, why, nudge, flag }] (the answers under typical wrong ideas; why explains the
// mistake, as in the check, nudge is the feedback in practice), a choice, direction or
// ranking field its right answer (a direction or choice also traps: the answers under typical wrong
// ideas), and draw (drawOf, below) where the forces are drawn in practice and in the tutor instead
// of their directions chosen. quiz(exercise, seed, key) gives a multiple-choice question about one of its fields (for the
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

  // ---------------------------------------------------------------- drawing the forces
  // In practice and in the tutor, the forces of a situation with draw (scenarios.js) are drawn with
  // arrow.js instead of their directions chosen; the check keeps its four options (quiz, below).
  // drawOf gives { keys, ask, fig (the task's figure, with room for the arrows), anchors (in svg
  // units), kinds, tail(kind, anchor), len, gap, start, target [{ kind, anchor, dir (degrees),
  // mag, net, zero, name }], none (a button "No net force"), zero (the net force is zero: no arrow
  // for it, but that button), label(a, arrows) (an arrow's label), judge(arrows, done, none) → { ok,
  // marks: { arrow id: 'ok' | 'bad' }, notes: [{ flag, text }] } (none: that button pressed),
  // right() (a drawing judged right, with the button pressed if zero) }.
  // The judging, kind to achieve with a mouse or a finger:
  // - each force within TOL = 10° of its direction (the directions to snap to are 15° apart at the
  //   finest, so that a force off the grid, e.g. the sum of two at a right angle, takes the nearest
  //   one or two of them, and one on the grid only itself),
  // - the lengths only where the size is clear: two forces of the same size (but the net force)
  //   equally long within a step or 30 %, and of two forces of which one is at least CLEAR = 1.25
  //   times the other (the net force too), the larger longer. Other lengths are free.
  // A note per thing wrong: a nudge while the exercise is open, the explanation once done (solved
  // or shown); each with the typical wrong idea behind it (flag) where there is one.
  const TOL = 10, CLEAR = 1.25, LEN = { lo: 16, hi: 96, step: 8, init: 48 };
  const DEG8 = [0, 45, 90, 135, 180, 225, 270, 315];
  const degOf = (F) => (Math.round(((((Math.atan2(F[1], F[0]) * 180) / Math.PI) % 360 + 360) % 360) * 1e6) / 1e6) % 360;
  const gap = (a, b) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return Math.min(d, 360 - d); };
  const arrowLib = () => root.Arrow || require('./arrow.js');
  function drawOf(scn, p, v) {
    const s = scn.draw(p, v), view = { room: s.anchors.map((a) => a.c) };
    const fig = scn.figure(p, v, { task: true, draw: view });
    const anchors = s.anchors.map((a) => ({ id: a.id, label: a.label, x: CL.clean(a.c[0] * view.s), y: CL.clean(-a.c[1] * view.s), r: 26 }));
    const kinds = s.kinds.map((k) => ({ ...k, dirs: k.dirs || s.dirs || DEG8 }));
    const big = Math.max(...s.target.map((t) => CL.len(t.F)));
    const target = s.target.map((t) => ({ ...t, dir: degOf(t.F), mag: CL.len(t.F), zero: !!t.net && CL.len(t.F) < 1e-9 * big }));
    const judged = target.filter((t) => !t.zero), netT = target.find((t) => t.net), zero = !!(netT && netT.zero);
    const tail = (kind, an) => { const o = (s.tails || {})[kind] || [0, 0]; return [an.x + o[0], an.y + o[1]]; };
    // a new arrow points where no force of its kind to draw does (where a kind has a choice)
    const free = (d) => kinds.every((k) => k.dirs.length < 8 || judged.every((t) => t.kind !== k.id || gap(t.dir, arrowLib().nearest(k.dirs, d)) > TOL));
    const start = [45, 135, 225, 315, 90, 270, 0, 180, 15, 75, 105, 165, 195, 255, 285, 345].find(free) ?? 45;
    const { sv } = root.Scenarios;
    function label(a, arrows) {
      const k = kinds.find((x) => x.id === a.kind) || {};
      if (k.sub === '@') return sv('F', String(a.anchor));
      if (k.sub !== null) return sv('F', k.sub || '');
      const same = (arrows || []).filter((x) => x.kind === a.kind && String(x.anchor) === String(a.anchor));
      return sv('F', String(Math.max(1, same.findIndex((x) => x.id === a.id) + 1)));
    }
    function judge(arrows, done, none = false) {
      const j = arrowLib().judge(arrows, judged, { tol: TOL }), marks = {}, problems = [];
      j.results.forEach((r) => {
        const a = r.drawn != null ? arrows[r.drawn] : null;
        if (a) marks[a.id] = r.result === 'right' ? 'ok' : 'bad';
        if (r.result === 'right') return;
        // the net force: an arrow drawn although it is zero, or "No net force" chosen although it is not
        if (zero && r.result === 'extra' && r.kind === netT.kind) problems.push({ type: 'dir', kind: r.kind, t: netT, dir: a.dir });
        else if (none && r.result === 'missing' && judged[r.target] === netT) problems.push({ type: 'dir', kind: r.kind, t: netT, dir: null });
        else problems.push({ type: r.result, kind: r.kind, t: r.target != null ? judged[r.target] : null, dir: a ? a.dir : null });
      });
      if (zero && !none && !arrows.some((a) => a.kind === netT.kind)) problems.push({ type: 'none', kind: netT.kind, t: netT, dir: null });
      const right = j.results.filter((r) => r.result === 'right');
      right.forEach((r, i) => right.slice(i + 1).forEach((q) => {
        const t1 = judged[r.target], t2 = judged[q.target], a1 = arrows[r.drawn], a2 = arrows[q.drawn], l1 = a1.len, l2 = a2.len;
        const bad = () => { marks[a1.id] = 'bad'; marks[a2.id] = 'bad'; };
        if (!t1.net && !t2.net && Math.abs(t1.mag - t2.mag) <= 1e-9 * Math.max(t1.mag, t2.mag)) {
          if (Math.abs(l1 - l2) > LEN.step + 1e-9 && Math.max(l1, l2) / Math.min(l1, l2) > 1.3 + 1e-9) { problems.push({ type: 'equal', t: t1, a: t1, b: t2 }); bad(); }
        } else if (t1.mag >= CLEAR * t2.mag && !(l1 > l2)) { problems.push({ type: 'order', t: t1, big: t1, small: t2 }); bad(); }
        else if (t2.mag >= CLEAR * t1.mag && !(l2 > l1)) { problems.push({ type: 'order', t: t2, big: t2, small: t1 }); bad(); }
      }));
      const notes = [];
      problems.forEach((pr) => {
        let n;
        if (pr.type === 'missing') { const x = L(`Still missing: ${pr.t.name}.`, `Es fehlt noch: ${pr.t.name}.`); n = { flag: null, nudge: x, why: x }; }
        else if (pr.type === 'extra') { const x = L('One arrow too many: draw each force once.', 'Ein Pfeil zu viel: Zeichne jede Kraft nur einmal.'); n = { flag: null, nudge: x, why: x }; }
        else {
          n = s.say({ ...pr, type: pr.type === 'none' ? 'dir' : pr.type, targets: judged, rights: right.map((r) => judged[r.target]) });
          if (pr.type === 'none') n = { ...n, nudge: L('The net force is still missing: draw it, or choose “No net force”.', 'Die resultierende Kraft fehlt noch: Zeichne sie, oder wähle «Keine resultierende Kraft».') };
        }
        const text = done ? n.why : n.nudge;
        if (!notes.some((x) => x.text === text)) notes.push({ flag: n.flag || null, text });
      });
      return { ok: !problems.length, marks, notes };
    }
    // the right forces, in proportion (the largest 88 long), or else one step of 16 for each size
    function right() {
      const A = arrowLib();
      const make = (lens) => judged.map((t, i) => {
        const k = kinds.find((x) => x.id === t.kind), an = anchors.find((x) => x.id === t.anchor);
        return { id: `r${i + 1}`, kind: t.kind, anchor: t.anchor, at: tail(t.kind, an), dir: A.nearest(k.dirs, t.dir), len: lens[i] };
      });
      let arrows = make(judged.map((t) => Math.max(LEN.lo, Math.min(LEN.hi, Math.round((88 * t.mag) / big / LEN.step) * LEN.step))));
      if (!judge(arrows, false, zero).ok) {
        const level = (t) => CL.sig(t.mag / big, 6), levels = [...new Set(judged.map(level))].sort((a, b) => a - b);
        arrows = make(judged.map((t) => LEN.lo + 16 * levels.indexOf(level(t))));
      }
      return arrows;
    }
    return { keys: s.keys, ask: s.ask, fig, anchors, kinds, tail, len: LEN, gap: 13, start, target, none: !!s.none, zero, label, judge, right, tol: TOL };
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
      draw: scn.draw ? drawOf(scn, p, v) : null,
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
    // the forces drawn by the student first, where they can be (app.js mounts the drawing in .t-draw)
    const own = ex.draw ? [{ text: `<p class="step-rule">${L('Your turn', 'Du bist dran')}</p><p>${ex.draw.ask}</p><div class="t-draw"></div>`, figure: ex.draw.fig }] : [];
    return { frames: [first, ...own, ...frames] };
  }

  root.Coulomb = { SCENARIOS, practiceOf, quiz, tutorial, exercise, byId, num, LETTERS };
  if (typeof module !== 'undefined') module.exports = root.Coulomb;
})(typeof window !== 'undefined' ? window : globalThis);
