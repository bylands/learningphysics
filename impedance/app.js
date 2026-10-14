(function () {
  'use strict';

  const I = window.Impedance, P = window.Plot, M = window.Match, Identify = window.Identify;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Impedance Curves', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. In the graph, dashed lines are asymptotes and helper lines, the tangent is drawn in <span class="k-tan">orange</span>.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard', mixed: 'Mixed' },
      stars: (d) => `Difficulty: ${d} of 5`,
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      choose: 'Enter a value for each quantity, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      correct: 'Correct', number: 'Enter a number',
      close: (tol) => `Close, but not within ${tol} %: read the graph more carefully, with the probe.`,
      whichCurve: 'Which curve?', theCurves: 'The curves:', curve: (k) => `Curve ${k}`,
      whichCircuit: 'Which circuit?', theCircuits: 'The circuits:', circuit: (k) => `Circuit ${k}`,
      chooseCurve: 'Choose a curve, then check.', chooseCircuit: 'Choose a circuit, then check.',
      // directly: res, with the resonance (circuits of RLC or LC); one, of one element
      directPrompt: (res, one) => `Which of the four curves shows the impedance <i>Z</i> of this ${one ? 'element' : 'circuit'} against the angular frequency <i>ω</i>? Think of what <i>Z</i> does for small and for large <i>ω</i>${res ? ', and at the resonance frequency' : ''}.`,
      directInversePrompt: (res) => `The curve shows the impedance <i>Z</i> of a circuit against the angular frequency <i>ω</i>. Which of the four circuits is it? Think of what the curve tells you for small and for large <i>ω</i>${res ? ', and at its minimum or maximum' : ''}.`,
      inversePrompt: 'The curve shows the impedance <i>Z</i> of a circuit against the angular frequency <i>ω</i>. Which of the four circuits is it? Answer the questions: each right answer rules out the circuits that do not fit, until one is left.',
      matchPrompt: 'Which of the four curves shows the impedance <i>Z</i> of this circuit against the angular frequency <i>ω</i>? Answer the questions: each right answer rules out the curves that do not fit, until one is left.',
    },
    de: {
      title: 'Impedanzkurven', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Im Graphen sind gestrichelte Linien Asymptoten und Hilfslinien, die Tangente ist <span class="k-tan">orange</span>.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      levels: { easy: 'Einfach', medium: 'Mittel', hard: 'Schwierig', mixed: 'Gemischt' },
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      choose: 'Gib für jede Grösse einen Wert ein und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      correct: 'Richtig', number: 'Gib eine Zahl ein',
      close: (tol) => `Knapp daneben, nicht innerhalb von ${tol} %: Lies den Graphen genauer ab, mit der Sonde.`,
      whichCurve: 'Welche Kurve?', theCurves: 'Die Kurven:', curve: (k) => `Kurve ${k}`,
      whichCircuit: 'Welche Schaltung?', theCircuits: 'Die Schaltungen:', circuit: (k) => `Schaltung ${k}`,
      chooseCurve: 'Wähle eine Kurve und prüfe dann.', chooseCircuit: 'Wähle eine Schaltung und prüfe dann.',
      directPrompt: (res, one) => `Welche der vier Kurven zeigt die Impedanz <i>Z</i> ${one ? 'dieses Bauteils' : 'dieser Schaltung'} gegen die Kreisfrequenz <i>ω</i>? Überlege, was <i>Z</i> für kleines und für grosses <i>ω</i> tut${res ? ', und bei der Resonanzfrequenz' : ''}.`,
      directInversePrompt: (res) => `Die Kurve zeigt die Impedanz <i>Z</i> einer Schaltung gegen die Kreisfrequenz <i>ω</i>. Welche der vier Schaltungen ist es? Überlege, was die Kurve für kleines und für grosses <i>ω</i> verrät${res ? ', und bei ihrem Minimum oder Maximum' : ''}.`,
      inversePrompt: 'Die Kurve zeigt die Impedanz <i>Z</i> einer Schaltung gegen die Kreisfrequenz <i>ω</i>. Welche der vier Schaltungen ist es? Beantworte die Fragen: Jede richtige Antwort schliesst die Schaltungen aus, die nicht passen, bis eine übrig bleibt.',
      matchPrompt: 'Welche der vier Kurven zeigt die Impedanz <i>Z</i> dieser Schaltung gegen die Kreisfrequenz <i>ω</i>? Beantworte die Fragen: Jede richtige Antwort schliesst die Kurven aus, die nicht passen, bis eine übrig bleibt.',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, probe = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('imp-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  function math(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
      });
    }
  }
  const markScrollable = () => {};

  const axesMode = () => 'lin'; // the exercises have linear axes
  const figure = (c, ax, ann, mode = axesMode()) => `<div class="fig">${P.schematic(c)}</div><div class="fig gwrap">${P.graph(c, ax, mode, { ann })}</div>`;
  const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L('and', 'und')} ${xs[xs.length - 1]}`);
  const list = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const circuitName = (c) => P.name(c);
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;

  // ---------------------------------------------------------------- matching (match.js)
  // The four options of a matching exercise, curves or (inverse) circuits: the ones that do not fit
  // the answers so far (keys of the questions) faded, and once all are answered the one left marked
  // (o.done); marks: labels on the right curve. With the questions there is nothing to pick: the
  // answers decide. The direct versions (e.direct) have no questions; the option is picked (o.pick,
  // as radio buttons) and checked.
  // A curve: with the level R and ω₀ where the circuit shown has them; the curve given in the
  // inverse has neither, which would tell whether there is a resistor or a resonance.
  const sketchOf = (e, id, o, label, marks) => P.sketch(M.circuit(id, e.q), o.mode || axesMode(), {
    w0: 1, zref: 1, R: !e.inverse && M.NETS[e.net].kind.includes('R') ? 1 : null, noW0: e.inverse || !M.resonant(e.net), marks, label,
  });
  function curves(e, answered, o = {}) {
    const name = e.inverse ? ui().circuit : ui().curve;
    return `<div class="cands${e.inverse ? ' circuits' : ''}"${o.pick ? ` role="radiogroup" aria-label="${e.inverse ? ui().whichCircuit : ui().whichCurve}"` : ''}>${e.cands.map((id, k) => {
      const tag = o.pick ? 'label' : 'div', cls = `cand${M.fits(e, k, answered) ? (o.done && k === e.right ? ' ok' : '') : ' out'}`;
      const svg = e.inverse ? P.schematic(M.circuit(id, e.q)) : sketchOf(e, id, o, name(M.letter(k)), o.marks && k === e.right ? M.marks(id) : null);
      return `<${tag} class="${cls}" data-k="${k}">${o.pick ? `<input type="radio" name="cand" value="${k}">` : ''}<span class="letter">${M.letter(k)}</span>${svg}</${tag}>`;
    }).join('')}</div>`;
  }
  // the circuit (or the curve) given, and the options
  const given = (e, o = {}) => (e.inverse ? `<div class="fig curve-big">${sketchOf(e, e.net, o, L('The curve', 'Die Kurve'), o.marks ? M.marks(e.net) : null)}</div>` : `<div class="fig">${P.schematic(M.circuit(e.net, e.q))}</div>`);
  const matchFigure = (e, answered, o = {}) => `${given(e, o)}<div class="fig cands-wrap">${curves(e, answered, { done: answered.length === M.phases(e.net).length, ...o })}</div>`;
  // the questions answered right so far
  const answeredOf = () => ex.items.filter((it) => Identify.right(it, st.ident)).map((it) => it.key);
  const matchSolution = (e) => { const s = M.solution(e); return s.steps.map((x) => `<h4>${x.title}</h4><p>${x.text}</p>`).join('') + `<p>${s.verdict}</p><ul>${s.others.map((x) => `<li>${x}</li>`).join('')}</ul>`; };

  function renderMatch() {
    $('#title').innerHTML = `${ex.inverse ? ui().whichCircuit : ui().whichCurve} ${starsOf(ex.difficulty)}`;
    const res = M.NETS[ex.net].level >= 2; // what the options can have, not only the right one
    $('#prompt').innerHTML = ex.direct ? (ex.inverse ? ui().directInversePrompt(res) : ui().directPrompt(res, M.single(ex.net))) : ex.inverse ? ui().inversePrompt : ui().matchPrompt;
    $('#fields').className = '';
    $('#fields').innerHTML = `<div id="ident"></div><p class="match-head">${ex.inverse ? ui().theCircuits : ui().theCurves}</p><div id="cands"></div><p id="cand-fb" class="ident-fb bad" aria-live="polite"></p>`;
  }
  // the questions and the options
  function drawMatch() {
    // the circuit given, or in the inverse the curve
    $('#schematic').outerHTML = given(ex).replace('class="fig', 'id="schematic" class="fig');
    $('#ident').innerHTML = Identify.html(ex.items, st.ident, st.revealed);
    if (ex.direct) {
      // nothing faded; the curve picked kept, marked once checked
      $('#cands').innerHTML = curves(ex, [], { pick: !st.solved && !st.revealed, done: st.solved || st.revealed });
      if (st.pick != null && $(`input[name="cand"][value="${st.pick}"]`)) $(`input[name="cand"][value="${st.pick}"]`).checked = true;
      if (st.wrong != null && st.wrong === st.pick) markWrong();
      return;
    }
    const answered = st.revealed ? M.phases(ex.net) : answeredOf();
    $('#cands').innerHTML = curves(ex, answered, { done: answered.length === ex.items.length });
  }
  // a wrong pick in a direct version: marked, with what does not fit
  function markWrong() {
    const el = $(`.cand[data-k="${st.wrong}"]`);
    if (el) el.classList.add('bad');
    $('#cand-fb').innerHTML = M.mismatch(ex, st.wrong, M.letter, !st.solved && !st.revealed);
  }

  // ---------------------------------------------------------------- hints and solution
  // From the worked analysis (generator.js): what the graph does → which feature gives which
  // value → the formulas → the readings to check.
  function hints() {
    const an = ex.an, ks = I.UNKNOWNS[ex.c.kind];
    return [
      `${I.shape(ex.c)} ${an.intro}`,
      L('Which feature of the graph gives which value:', 'Welches Merkmal des Graphen liefert welchen Wert:') +
        list(ks.map((k) => L(`<i>${k}</i>: ${an.plan[k]}`, `<i>${k}</i> folgt aus ${an.plan[k]}`))),
      L('Formulas:', 'Formeln:') + list(ks.map((k) => `$${an.formulas[k]}$`)) +
        L('The probe shows the slope of the tangent in Ω·s; since ω is in rad/s, 1 Ω·s = 1 H.', 'Die Sonde zeigt die Steigung der Tangente in Ω·s; da ω in rad/s gemessen wird, ist 1 Ω·s = 1 H.') +
        // series RC: Z² is a straight line in ω⁻², which the probe shows too
        (ex.c.kind === 'RC' && ex.c.conn === 'series' ? ` ${L('To check: $Z^2 = R^2 + \\frac{1}{C^2}\\,\\omega^{-2}$, so one point ($\\omega^{-2}$, $Z$) of the probe gives $C = \\sqrt{\\omega^{-2}/(Z^2 - R^2)}$.', 'Zur Kontrolle: $Z^2 = R^2 + \\frac{1}{C^2}\\,\\omega^{-2}$, also liefert ein Punkt ($\\omega^{-2}$, $Z$) der Sonde $C = \\sqrt{\\omega^{-2}/(Z^2 - R^2)}$.')}` : ''),
      L('Readings to check yours against:', 'Ablesungen zum Vergleich mit deinen:') + list(ks.map((k) => `<i>${k}</i>: ${an.readings[k]}`)),
    ];
  }

  function results(e = ex) {
    const ks = I.UNKNOWNS[e.c.kind];
    const unit = { R: 'ohm', L: 'H', C: 'F' };
    const est = ks.map((k) => `<i>${k}</i> ≈ ${I.H(e.an.est[k], unit[k])}`).join(', ');
    const exact = ks.map((k) => `<i>${k}</i> = ${I.H(e.c[k], unit[k])}`).join(', ');
    return L(`Read from the graph: ${est}. The graph was drawn with ${exact}.`, `Am Graphen abgelesen: ${est}. Gezeichnet wurde der Graph mit ${exact}.`);
  }
  const solutionSteps = (e) => `<p>${e.an.intro}</p>` + e.an.steps.map((s) => `<h4>${s.title}</h4><p>${s.text}</p>`).join('');

  // ---------------------------------------------------------------- exercise lifecycle

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  // (imp3: the topics were regrouped, so practice starts afresh rather than in the wrong topic)
  const PRACTICE = 'imp3', typeOf = (e) => (e.match ? `${e.direct ? 'pick' : ''}${e.inverse ? 'inv' : 'match'}-${e.net}` : `${e.c.kind}-${e.c.conn}`);
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    prepare(ex);
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, status: null, ident: {}, pick: null, wrong: null };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    topics.relabel(); // the worked example linked may depend on the exercise (byType in lessons.js)
  }

  // the hints, and for a matching exercise its questions, in the current language
  function prepare(e) {
    if (e.match) { e.items = e.direct ? [] : M.items(e); e.hints = M.hints(e); } else e.hints = hints();
  }

  // A new exercise of the topic chosen (topics.js), of another kind than the current one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language); links of earlier versions name a level
  const again = (e) => topics.parse(e.id) || I.generate(e.id.split('-')[0], Number(e.id.split('-')[1]));
  // an exercise of a kind of circuit: 'RL-series' and so on
  const ofType = (type, seed) => {
    // matching: match-, inv- (curve → circuit), and pickmatch-, pickinv- (directly, no questions)
    const m = /^(pick)?(match|inv)-(.+)$/.exec(type);
    if (m) {
      const e = M.generate(m[3], seed, m[2] === 'inv');
      if (m[1]) { e.direct = true; e.p.direct = true; }
      return e;
    }
    const [kind, conn] = type.split('-');
    return I.generate(`${conn} ${kind}`, seed);
  };

  // Narrow screens get a smaller drawing; redraw when that changes.
  const narrow = () => document.querySelector('main').clientWidth < 600;
  function relayout() {
    if ((P.W < 640) === narrow()) return;
    P.setNarrow(narrow());
    if (ex) drawGraph();
    if (ex && st.revealed) drawSolution();
    if (tutor.shown()) tutor.refresh();
  }

  function drawGraph() {
    // a matching exercise has its curves instead of the graph with the probe
    for (const el of ['#graph', '#readout']) $(el).hidden = !!ex.match;
    if (ex.match) { $('#graph').innerHTML = ''; $('#pins').hidden = true; drawMatch(); return; }
    $('#graph').innerHTML = P.graph(ex.c, ex.ax, axesMode(), { extra: ex.extra });
    probe.draw();
  }

  function render() {
    if (ex.match) {
      $('#graph').innerHTML = ''; // the probe would redraw on the graph of the exercise before
      probe.reset();
      renderMatch();
      drawGraph(); // the questions and the curves
      finishRender();
      return;
    }
    const c = ex.c, ks = I.UNKNOWNS[c.kind];
    $('#title').innerHTML = `${circuitName(c)} ${starsOf(ex.difficulty)}`;
    const tol = Math.round(100 * I.TOL);
    $('#prompt').innerHTML = L(`The graph shows the impedance <i>Z</i> of the circuit against the angular frequency <i>ω</i>. Find ${and(ks.map((k) => `<i>${k}</i>`))} from the features of the graph and enter their values; within ${tol} % counts as right.`,
      `Der Graph zeigt die Impedanz <i>Z</i> der Schaltung gegen die Kreisfrequenz <i>ω</i>. Bestimme ${and(ks.map((k) => `<i>${k}</i>`))} aus den Merkmalen des Graphen und gib ihre Werte ein; auf ${tol} % genau gilt als richtig.`);
    $('#schematic').className = 'fig'; // after a curve → circuit exercise, it held the curve
    $('#schematic').innerHTML = P.schematic(c);
    probe.reset();
    drawGraph();
    $('#fields').className = 'fields';
    $('#fields').innerHTML = fieldsHtml(ex.fields);
    finishRender();
  }
  // The answers: a number field per unknown, in a fixed unit (generator.js: ENTRY), read off the
  // graph with the probe.
  const fieldsHtml = (fields) => fields.map((f) => `
      <div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym"><i>${f.key}</i>&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${f.unit}</span>
        <span class="fb" aria-live="polite"></span>
      </div>`).join('');
  function finishRender() {
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    updateButtons();
  }

  // solved now, or solved before (its solution can be looked at again)
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;

  function updateButtons() {
    const left = ex.hints.length - st.hints;
    const hb = $('#hint');
    hb.disabled = left === 0 || st.revealed;
    hb.textContent = left ? ui().hint(left) : ui().noHints;
    const rb = $('#reveal');
    rb.disabled = !canReveal() || st.revealed;
    rb.title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
    // once everything is right, Check becomes New exercise, like the button at the top
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
    $('#check').hidden = !!ex.match && !ex.direct && !st.solved; // a matching exercise with questions is solved by them
  }

  // Marks every field; true if all are right, null if some are empty. Right within TOL; a value of a
  // typical mistake gets its explanation, one a little off a hint to read more carefully.
  function feedback() {
    let allOk = true, anyEmpty = false;
    for (const f of ex.fields) {
      const row = document.querySelector(`.field[data-key="${f.key}"]`);
      const raw = row.querySelector('input').value;
      if (!raw.trim()) { anyEmpty = true; allOk = false; row.className = 'field'; row.querySelector('.fb').innerHTML = ''; continue; }
      const r = I.judge(f, I.parse(raw));
      row.className = `field ${r.ok ? 'ok' : r.close ? 'warn' : 'bad'}`;
      row.querySelector('.fb').innerHTML = r.ok ? ui().correct : r.nan ? ui().number : r.trap ? r.trap.why : r.close ? ui().close(Math.round(100 * I.TOL)) : f.wrong;
      if (!r.ok) allOk = false;
    }
    return allOk ? true : anyEmpty ? null : false;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    if (st) st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? (ex && ex.match ? (ex.inverse ? ui().chooseCircuit : ui().chooseCurve) : ui().choose)
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (!canReveal() ? ui().tryAgain : ui().canReveal);
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    if (ex.match && !ex.direct) return; // solved by its questions (see init), no Check
    if (ex.match) {
      const sel = $('input[name="cand"]:checked');
      st.checked = true;
      if (!sel) { showStatus('fill'); return; }
      st.tries++;
      st.pick = Number(sel.value);
      if (st.pick === ex.right) { st.wrong = null; solved(); drawMatch(); } else { st.wrong = st.pick; markWrong(); showStatus('bad'); }
      updateButtons();
      return;
    }
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) solved();
    else showStatus('bad');
    updateButtons();
  }
  // The exercise is solved: the score, the record of practice and the step of the topic.
  function solved() {
    if (!st.revealed) {
      const s = stored('imp-score', { solved: 0, clean: 0 });
      s.solved++;
      if (st.tries === 1 && st.hints === 0) s.clean++;
      store('imp-score', s);
      showScore();
    }
    st.solved = true;
    Practice.markSolved(PRACTICE, ex.id);
    finish();
    st.advance = topics.solved(st, ex);
    showStatus('ok');
  }

  function showHints() {
    $('#hint-list').innerHTML = ex.hints.slice(0, st.hints).map((h) => `<li>${h}</li>`).join('');
    $('#hints').hidden = !st.hints;
    math($('#hints'));
  }
  function hint() {
    if (st.hints >= ex.hints.length) return;
    st.hints++;
    showHints();
    updateButtons();
    $('#hint-list').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function drawSolution() {
    $('#sol-figure').innerHTML = ex.match ? matchFigure(ex, M.phases(ex.net), { marks: true }) : figure(ex.c, ex.ax, ex.an.steps.flatMap((s) => s.ann));
  }
  function showSolution() {
    drawSolution();
    $('#sol-steps').innerHTML = ex.match ? matchSolution(ex) : solutionSteps(ex);
    $('#sol-short').innerHTML = !ex.match ? results() : ex.inverse ? L(`The circuit is ${M.letter(ex.right)}.`, `Die Schaltung ist ${M.letter(ex.right)}.`) : L(`The curve is ${M.letter(ex.right)}.`, `Die Kurve ist ${M.letter(ex.right)}.`);
    $('#solution').hidden = false;
    math($('#solution'));
  }
  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    finish();
    if (ex.match) drawMatch(); // the questions shown as answered
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- tutor
  // Tutor examples: an overview frame, then one frame per step of the analysis.
  function lesson(e) {
    const c = e.circuit, ax = I.axesFor(c);
    return {
      name: e.name[Lang.get()], idea: e.idea[Lang.get()],
      frames: () => {
        const an = I.analysis(c, ax);
        const first = {
          text: `<div class="step-rule">${L('The circuit', 'Die Schaltung')}</div><p>${an.intro}</p><p>${I.shape(c)}</p>`,
          get figure() { return figure(c, ax, []); },
        };
        return [first, ...an.steps.map((s) => ({
          text: `<div class="step-rule">${s.title}</div><p>${s.text}</p>`,
          get figure() { return figure(c, ax, s.ann); },
        }))];
      },
    };
  }
  // The matching example: the curves, then one frame per question, each fading the curves it
  // rules out, and the curve that is left.
  function matchLesson(d) {
    const e = { ...d.match, match: true, right: d.match.cands.indexOf(d.match.net) }, ks = M.phases(e.net), inv = !!e.inverse;
    const opt = (j) => (inv ? L(`circuit ${M.letter(j)}`, `Schaltung ${M.letter(j)}`) : L(`curve ${M.letter(j)}`, `Kurve ${M.letter(j)}`));
    const title = { lo: L('Small ω', 'Kleines ω'), hi: L('Large ω', 'Grosses ω'), res: L('At the resonance frequency', 'Bei der Resonanzfrequenz') };
    const ruled = (k) => e.cands.map((x, j) => j).filter((j) => M.fits(e, j, ks.slice(0, ks.indexOf(k))) && !M.fits(e, j, ks.slice(0, ks.indexOf(k) + 1)));
    const out = (js) => (js.length ? L(`This rules out ${M.and(js.map(opt))}.`, `Das schliesst ${M.and(js.map(opt))} aus.`) : '');
    return {
      name: d.name[Lang.get()], idea: d.idea[Lang.get()],
      frames: () => [
        { text: `<div class="step-rule">${L('The question', 'Die Frage')}</div><p>${inv
          ? L('Which of the four circuits has this impedance curve? Instead of guessing, read the curve at both ends and at its minimum or maximum, and ask what each tells you about the circuit; each answer rules out circuits that do not fit.', 'Welche der vier Schaltungen hat diese Impedanzkurve? Statt zu raten, liest du die Kurve an beiden Enden und bei ihrem Minimum oder Maximum ab und fragst, was das über die Schaltung verrät; jede Antwort schliesst Schaltungen aus, die nicht passen.')
          : L(`Which of the four curves shows the impedance of this circuit? Instead of guessing, ask ${ks.length === 3 ? 'three' : 'two'} questions about the curve; each one rules out curves that do not fit.`, `Welche der vier Kurven zeigt die Impedanz dieser Schaltung? Statt zu raten, stellst du ${ks.length === 3 ? 'drei' : 'zwei'} Fragen an die Kurve; jede schliesst Kurven aus, die nicht passen.`)}</p>`,
          get figure() { return matchFigure(e, []); } },
        ...ks.map((k, i) => ({ text: `<div class="step-rule">${title[k]}</div><p>${inv ? M.inverseText(k, M.features(e.net)[k]).value : M.reason(e.net, k)}</p><p>${out(ruled(k))}</p>`,
          get figure() { return matchFigure(e, ks.slice(0, i + 1)); } })),
        { text: `<div class="step-rule">${L('The curve', 'Die Kurve')}</div><p>${M.solution(e).verdict} ${inv ? L('Backwards, the same rules:', 'Rückwärts gelten dieselben Regeln:') : ''} ${L(`The rules in short: for ω → 0 a coil is a wire and a capacitor a gap, for ω → ∞ the other way round${ks.length === 3 ? '; at ω₀ coil and capacitor in series act like a wire, in parallel like a gap' : ''}. A gap in series blocks (Z → ∞), a wire in parallel short-circuits (Z → 0).`, `Die Regeln kurz: Für ω → 0 ist eine Spule ein Draht und ein Kondensator ein Unterbruch, für ω → ∞ umgekehrt${ks.length === 3 ? '; bei ω₀ wirken Spule und Kondensator in Serie wie ein Draht, parallel wie ein Unterbruch' : ''}. Ein Unterbruch in Serie sperrt (Z → ∞), ein Draht parallel schliesst kurz (Z → 0).`)}</p>`,
          get figure() { return matchFigure(e, ks, { marks: true }); } },
      ],
    };
  }
  // The three elements alone: one frame each, with its curve and what it does at both ends and its
  // shift, then the rules in short (the start of every other example).
  function elementsLesson(d) {
    const ids = ['R', 'L', 'C'], name = (id) => circuitName(M.circuit(id, 1));
    const sk = (id, marks) => `<div class="fig">${P.schematic(M.circuit(id, 1))}${P.sketch(M.circuit(id, 1), 'lin', { w0: 1, zref: 1, R: id === 'R' ? 1 : null, noW0: true, label: name(id), marks: marks && id !== 'R' ? M.marks(id) : null })}</div>`;
    const ends = (id) => (id === 'R' ? M.reason(id, 'lo') : `${M.reason(id, 'lo')} ${M.reason(id, 'hi')}`);
    const warn = {
      R: '',
      L: L('A coil does not block a direct current: it is a wire for it. It only hinders a current that changes, the more the faster it changes.', 'Eine Spule sperrt keinen Gleichstrom: Für ihn ist sie ein Draht. Sie behindert nur einen Strom, der sich ändert, umso mehr, je schneller.'),
      C: L('No charge passes through the capacitor; the current of an alternating voltage charges and discharges it. The faster that goes, the more current flows: <i>Z</i> falls with <i>ω</i>.', 'Durch den Kondensator fliesst keine Ladung hindurch; der Strom einer Wechselspannung lädt und entlädt ihn. Je schneller das geht, desto mehr Strom fliesst: <i>Z</i> fällt mit <i>ω</i>.'),
    };
    return {
      name: d.name[Lang.get()], idea: d.idea[Lang.get()],
      frames: () => [
        { text: `<div class="step-rule">${L('The question', 'Die Frage')}</div><p>${L('The impedance <i>Z</i> = <i>Û</i>/<i>Î</i> says how much voltage an element needs per ampere of alternating current. For each element: how does <i>Z</i> change with the angular frequency <i>ω</i>, what does it do for <i>ω</i> → 0 and for <i>ω</i> → ∞, and how is the current shifted against the voltage?',
          'Die Impedanz <i>Z</i> = <i>Û</i>/<i>Î</i> sagt, wie viel Spannung ein Bauteil pro Ampere Wechselstrom braucht. Für jedes Bauteil: Wie ändert sich <i>Z</i> mit der Kreisfrequenz <i>ω</i>, was tut es für <i>ω</i> → 0 und für <i>ω</i> → ∞, und wie ist der Strom gegenüber der Spannung verschoben?')}</p>`,
          get figure() { return ids.map((id) => sk(id, false)).join(''); } },
        ...ids.map((id) => ({
          text: `<div class="step-rule">${name(id)}</div><p>${ends(id)}</p><p>${M.shiftWhy(id)}</p>${warn[id] ? `<p>${warn[id]}</p>` : ''}`,
          get figure() { return sk(id, true); },
        })),
        { text: `<div class="step-rule">${L('In short', 'Kurz')}</div><p>${L('Coil: <i>Z</i> = <i>ωL</i>, a wire for <i>ω</i> → 0 and a gap for <i>ω</i> → ∞; the current lags 90° behind. Capacitor: <i>Z</i> = 1/(<i>ωC</i>), a gap for <i>ω</i> → 0 and a wire for <i>ω</i> → ∞; the current leads by 90°. Resistor: <i>Z</i> = <i>R</i>, in phase. Only <i>Z</i> depends on <i>ω</i>, not the shift. Don\'t swap coil and capacitor: the coil blocks high frequencies, the capacitor low ones.',
          'Spule: <i>Z</i> = <i>ωL</i>, ein Draht für <i>ω</i> → 0 und ein Unterbruch für <i>ω</i> → ∞; der Strom hinkt um 90° nach. Kondensator: <i>Z</i> = 1/(<i>ωC</i>), ein Unterbruch für <i>ω</i> → 0 und ein Draht für <i>ω</i> → ∞; der Strom eilt um 90° voraus. Widerstand: <i>Z</i> = <i>R</i>, in Phase. Nur <i>Z</i> hängt von <i>ω</i> ab, nicht die Verschiebung. Spule und Kondensator nicht verwechseln: Die Spule sperrt hohe Frequenzen, der Kondensator tiefe.')}</p>`,
          get figure() { return ids.map((id) => sk(id, true)).join(''); } },
      ],
    };
  }
  // Series RL or RC (pairAnalysis in generator.js): the triangle Z = √(R² + X²), both ends, a point
  // read off the curve, the corner and the usual mistakes; the triangle beside the schematic.
  function pairLesson(d) {
    const c = d.circuit, ax = I.axesFor(c);
    return {
      name: d.name[Lang.get()], idea: d.idea[Lang.get()],
      frames: () => I.pairAnalysis(c, ax, d.read).steps.map((s) => ({
        text: `<div class="step-rule">${s.title}</div><p>${s.text}</p>`,
        get figure() { return `<div class="fig">${P.schematic(c)}</div>${s.tri ? `<div class="fig">${P.triangle(s.tri)}</div>` : ''}<div class="fig gwrap">${P.graph(c, ax, axesMode(), { ann: s.ann })}</div>`; },
      })),
    };
  }
  const lessons = () => window.Lessons.EXAMPLES.map((d) => ({ ...(d.elements ? elementsLesson(d) : d.match ? matchLesson(d) : d.pair ? pairLesson(d) : lesson(d)), also: topics.also(d.topic) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with its kinds of question, its worked example and its
  // practice topic (lessons.js). No calculations: the questions ask for a curve (or a circuit), for
  // what Z does at the ends of the ω axis or at ω₀, for the shift of an element, or for R read off
  // the minimum or maximum of an RLC curve (the four options of the practice exercise).
  //   el      one element: which curve (match.js, circuit → curve)
  //   phase   one element: how the current is shifted against the voltage
  //   ends    two elements: what Z does for ω → 0 and for ω → ∞
  //   m1, i1  two elements: circuit → curve, curve → circuit
  //   res     RLC, LC, or R with an LC pair: what Z does at ω₀
  //   m2      RLC and LC: circuit → curve
  //   rlcR    R read off the minimum (series) or maximum (parallel) of an RLC curve
  const OBJECTIVES = [
    { id: 'elements', kinds: ['el', 'phase'], tutor: 0, topic: 0,
      name: () => L('Sketch the impedance of a resistor, a coil and a capacitor against the angular frequency, and state how the current is shifted against the voltage in each.',
        'Die Impedanz eines Widerstands, einer Spule und eines Kondensators gegen die Kreisfrequenz skizzieren und angeben, wie der Strom jeweils gegenüber der Spannung verschoben ist.') },
    { id: 'limits', kinds: ['ends', 'm1', 'i1'], tutor: 1, topic: 1,
      name: () => L('Use the reactances ωL and 1/(ωC) to predict what a circuit does for small and for large frequencies: block, short-circuit, or leave only R.',
        'Mit den Blindwiderständen ωL und 1/(ωC) vorhersagen, was eine Schaltung bei kleinen und bei grossen Frequenzen tut: sperren, kurzschliessen oder nur R übrig lassen.') },
    { id: 'resonance', kinds: ['res', 'm2', 'rlcR'], tutor: 2, topic: 2,
      name: () => L('Identify the resonance as the minimum of the impedance of a series RLC circuit and the maximum of a parallel one.',
        'Die Resonanz als Minimum der Impedanz einer RLC-Serieschaltung und als Maximum einer Parallelschaltung erkennen.') },
  ];
  const nets = (lvl) => M.IDS.filter((id) => M.NETS[id].level === lvl);
  const pickOf = (xs, seed) => xs[seed % xs.length];
  // A wrong curve or circuit: with series and parallel swapped, or coil and capacitor.
  const flagOf = (net, id) => (id === M.dual(net) ? 'dual' : id === M.swapLC(net) ? 'swap' : 'other');
  const matchExplain = (e) => () => {
    const sol = M.solution(e);
    return `<div class="figs">${matchFigure(e, M.phases(e.net), { marks: true, mode: 'lin' })}</div><div class="steps">${sol.steps.map((x) => `<h4>${x.title}</h4><p>${x.text}</p>`).join('')}` +
      `<p>${e.inverse ? L(`The circuit is option ${e.right + 1}.`, `Die Schaltung ist Antwort ${e.right + 1}.`) : L(`The curve is option ${e.right + 1}.`, `Die Kurve ist Antwort ${e.right + 1}.`)}</p></div>`;
  };
  // Circuit → curve, or (inv) curve → circuit, for the circuits of a level (match.js): the four
  // curves or circuits are the options.
  function matchQuestion(lvl, inv, seed) {
    const e = M.generate(pickOf(nets(lvl), seed), seed, inv), num = (k) => k + 1, one = lvl === 0;
    return {
      title: inv ? ui().whichCircuit : circuitName(M.circuit(e.net, e.q)),
      text: `<p>${inv ? L('The curve shows <i>Z</i> against <i>ω</i>; the four options are circuits.', 'Die Kurve zeigt <i>Z</i> gegen <i>ω</i>; die vier Antworten sind Schaltungen.') : L('The four options are sketches of <i>Z</i> against <i>ω</i>.', 'Die vier Antworten sind Skizzen von <i>Z</i> gegen <i>ω</i>.')}</p>`,
      figure: given(e, { mode: 'lin' }),
      ask: inv ? L('Which circuit has this curve?', 'Welche Schaltung hat diese Kurve?') : one ? L('Which curve shows the impedance of this element?', 'Welche Kurve zeigt die Impedanz dieses Bauteils?') : L('Which curve belongs to this circuit?', 'Welche Kurve gehört zu dieser Schaltung?'),
      options: e.cands.map((id, k) => ({
        html: inv ? P.schematic(M.circuit(id, e.q)) : sketchOf(e, id, { mode: 'lin' }, ui().curve(k + 1), null),
        correct: k === e.right, flag: flagOf(e.net, id), why: k === e.right ? '' : M.mismatch(e, k, num),
      })),
      key: `${e.net}|${inv ? 'inv' : ''}|${e.cands.join(',')}`,
      explain: matchExplain(e),
    };
  }
  // The shift of one element: the question of practice (match.js), without its number.
  function phaseQuestion(seed) {
    const id = pickOf(['R', 'L', 'C'], seed), it = M.phaseItem(id), c = M.circuit(id, 1);
    return {
      title: circuitName(c),
      text: `<p>${L('An alternating voltage drives a current through this element.', 'Eine Wechselspannung treibt einen Strom durch dieses Bauteil.')}</p>`,
      figure: `<div class="fig">${P.schematic(c)}</div>`,
      ask: L('How is the current shifted against the voltage?', 'Wie ist der Strom gegenüber der Spannung verschoben?'),
      options: it.options.map((o) => ({ html: o.html, correct: o.right, flag: o.flag, why: o.right ? '' : o.why })),
      key: `phase|${id}`,
      explain: () => `<div class="steps"><p>${it.value}</p></div>`,
    };
  }
  // What Z does at both ends of the ω axis, for a circuit of two elements. The wrong pairs: those of
  // the circuit with coil and capacitor swapped (the ends turned round) and with series and parallel
  // swapped, then others.
  const ZTO = { 0: '<i>Z</i> → 0', R: '<i>Z</i> → <i>R</i>', inf: '<i>Z</i> → ∞' };
  function endsQuestion(seed) {
    const id = pickOf(nets(1), seed), f = M.features(id), c = M.circuit(id, 1), key = (x) => `${x.lo}|${x.hi}`;
    const options = [{ v: f, correct: true }];
    const add = (v, flag) => { if (options.length < 4 && options.every((o) => key(o.v) !== key(v))) options.push({ v, flag }); };
    add(M.features(M.swapLC(id)), 'swap');
    add({ lo: f.hi, hi: f.lo }, 'swap');
    add(M.features(M.dual(id)), 'dual');
    for (const lo of ['R', '0', 'inf']) for (const hi of ['R', 'inf', '0']) add({ lo, hi }, 'other');
    options.sort((a, b) => key(a.v).localeCompare(key(b.v)));
    const why = (v) => (v.lo !== f.lo ? `${L('Not for <i>ω</i> → 0:', 'Nicht für <i>ω</i> → 0:')} ${M.reason(id, 'lo')}` : `${L('Not for <i>ω</i> → ∞:', 'Nicht für <i>ω</i> → ∞:')} ${M.reason(id, 'hi')}`);
    return {
      title: circuitName(c),
      text: `<p>${L('Think of the reactances <i>ωL</i> and 1/(<i>ωC</i>) at both ends of the <i>ω</i> axis.', 'Denke an die Blindwiderstände <i>ωL</i> und 1/(<i>ωC</i>) an beiden Enden der <i>ω</i>-Achse.')}</p>`,
      figure: `<div class="fig">${P.schematic(c)}</div>`,
      ask: L('What does the impedance do for <i>ω</i> → 0, and for <i>ω</i> → ∞?', 'Was macht die Impedanz für <i>ω</i> → 0 und für <i>ω</i> → ∞?'),
      options: options.map((o) => ({ html: `${L('<i>ω</i> → 0', '<i>ω</i> → 0')}: ${ZTO[o.v.lo]}; ${L('<i>ω</i> → ∞', '<i>ω</i> → ∞')}: ${ZTO[o.v.hi]}`, correct: !!o.correct, flag: o.flag, why: o.correct ? '' : why(o.v) })),
      key: `ends|${id}`,
      explain: () => `<div class="figs"><div class="fig">${P.schematic(c)}</div><div class="fig">${P.sketch(c, 'lin', { w0: 1, zref: 1, R: 1, noW0: true, marks: M.marks(id) })}</div></div><div class="steps"><h4>${L('Small ω', 'Kleines ω')}</h4><p>${M.reason(id, 'lo')}</p><h4>${L('Large ω', 'Grosses ω')}</h4><p>${M.reason(id, 'hi')}</p></div>`,
    };
  }
  // What Z does at ω₀ (the question of practice, match.js), for RLC, LC or R with an LC pair. A
  // minimum taken for a maximum (or 0 for ∞) is series and parallel swapped.
  const RES_DUAL = { minR: 'maxR', maxR: 'minR', zero: 'inf', inf: 'zero' };
  function resQuestion(seed) {
    const id = pickOf([...nets(2), ...nets(3)], seed), f = M.features(id), c = M.circuit(id, 1);
    const it = M.items({ net: id, inverse: false }).find((x) => x.key === 'res'), vals = ['minR', 'maxR', 'zero', 'inf'];
    return {
      title: circuitName(c),
      text: `<p>${L('At the resonance frequency <i>ω</i>₀ = 1/√(<i>LC</i>) the reactances of coil and capacitor are equal.', 'Bei der Resonanzfrequenz <i>ω</i>₀ = 1/√(<i>LC</i>) sind die Blindwiderstände von Spule und Kondensator gleich gross.')}</p>`,
      figure: `<div class="fig">${P.schematic(c)}</div>`,
      ask: L('What does the impedance do at <i>ω</i>₀?', 'Was macht die Impedanz bei <i>ω</i>₀?'),
      options: it.options.map((o, k) => ({ html: o.html, correct: o.right, flag: vals[k] === RES_DUAL[f.res] ? 'dual' : 'other', why: o.right ? '' : o.why })),
      key: `res|${id}`,
      explain: () => `<div class="figs"><div class="fig">${P.schematic(c)}</div><div class="fig">${P.sketch(c, 'lin', { w0: 1, zref: 1, R: M.NETS[id].kind.includes('R') ? 1 : null, marks: M.marks(id) })}</div></div><div class="steps"><p>${it.value}</p></div>`,
    };
  }
  // R read off the curve of an RLC circuit, where it is marked (the minimum or the maximum, without
  // a label), with four values to choose from: the right one and those of typical mistakes
  // (generator.js: choices; practice has the student type it).
  function annForR(an) {
    const has = (s, f) => s.ann.some(f);
    const s = an.steps.find((x) => has(x, (a) => (a.t === 'pt' || a.t === 'h') && /R/.test(a.label || '') && !/√2/.test(a.label || '')));
    return s ? s.ann.filter((a) => a.t === 'pt' || a.t === 'h').map((a) => ({ ...a, label: '' })) : [];
  }
  function rlcRQuestion(seed) {
    const e = I.generate(pickOf(['series RLC', 'parallel RLC'], seed), seed), f = e.fields.find((x) => x.key === 'R');
    return {
      title: circuitName(e.c),
      text: `<p>${L('The graph shows the impedance <i>Z</i> against the angular frequency <i>ω</i>; the point marked is the resonance.', 'Der Graph zeigt die Impedanz <i>Z</i> gegen die Kreisfrequenz <i>ω</i>; der markierte Punkt ist die Resonanz.')}</p>`,
      figure: figure(e.c, e.ax, annForR(e.an), 'lin'),
      ask: L('Read off the resistance <i>R</i>.', 'Lies den Widerstand <i>R</i> ab.'),
      options: f.options.map((o) => ({ html: o.label, correct: !!o.ok, flag: o.tag, why: o.why })),
      key: `rlcR|${e.id}`,
      explain: () => `<div class="figs">${figure(e.c, e.ax, e.an.steps.flatMap((s) => s.ann), 'lin')}</div><div class="steps">${solutionSteps(e)}<p class="short">${results(e)}</p></div>`,
    };
  }
  function checkQuestion(kind, seed) {
    if (kind === 'el') return matchQuestion(0, false, seed);
    if (kind === 'phase') return phaseQuestion(seed);
    if (kind === 'ends') return endsQuestion(seed);
    if (kind === 'm1' || kind === 'm2') return matchQuestion(Number(kind[1]), false, seed);
    if (kind === 'i1') return matchQuestion(1, true, seed);
    if (kind === 'res') return resQuestion(seed);
    return rlcRQuestion(seed);
  }
  const checkSource = {
    id: 'imp',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { swap: 'coilcap', dual: 'serpar', omega: 'omega', reactance: 'resonance' },
    concepts: () => ({
      coilcap: L('coil and capacitor swapped', 'Spule und Kondensator vertauscht'),
      serpar: L('series and parallel swapped', 'Serie und parallel vertauscht'),
      omega: L('the shift of one element taken to depend on ω', 'die Verschiebung eines Bauteils für abhängig von ω gehalten'),
      resonance: L('the reactance at resonance taken for R', 'der Blindwiderstand bei Resonanz für R gehalten'),
    }),
  };

  // ---------------------------------------------------------------- language
  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
  }

  // The same exercise in the other language, with the answers, feedback, hints and solution kept.
  function switchLang() {
    applyStatic();
    showScore();
    if (ex) {
      const fields = ex.fields || [];
      const typed = fields.map((f) => { const el = document.getElementById(`in-${f.key}`); return el ? el.value : null; });
      const keep = st, status = st.status; // render() clears the status line
      ex = again(ex);
      prepare(ex);
      render();
      st = keep;
      ex.fields && ex.fields.forEach((f, k) => { if (typed[k] != null) document.getElementById(`in-${f.key}`).value = typed[k]; });
      if (ex.match) drawMatch();
      else if (st.checked) feedback();
      showStatus(status);
      showHints();
      if (st.revealed) showSolution();
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
      updateButtons();
    }
    tutor.relabel(lessons());
    checker.relabel();
  }

  // ---------------------------------------------------------------- modes
  // Practice: random exercises; tutor: worked examples; check: a short test on the learning
  // objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('imp-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; } else fresh();
  }
  function checkMode() {
    setMode('check');
    checker.show();
    if (location.hash !== '#check') history.replaceState(null, '', '#check');
  }

  function fromHash() {
    const h = location.hash.slice(1);
    // the arcade of earlier versions is now the check
    if (h === 'check' || h === 'arcade') { if ($('#ck').hidden) checkMode(); return true; }
    let m = h.match(/^tutor-(\d+)$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= tutor.count) {
      setMode('tutor');
      if (tutor.current() !== Number(m[1]) - 1 || !tutor.shown()) tutor.open(Number(m[1]) - 1);
      return true;
    }
    const te = topics.parse(h);
    if (te) {
      setMode('practice');
      if (!ex || ex.id !== h) open(te);
      return true;
    }
    m = h.match(/^(easy|medium|hard|mixed)-(\d+)$/);
    if (m) {
      setMode('practice');
      if (!ex || ex.id !== h) open(I.generate(m[1], Number(m[2])));
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- init
  function init() {
    Lang.init(); // see lang.js
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    applyStatic();
    Lang.wire(switchLang);

    probe = window.createProbe($('#graph'), () => ({ c: ex.c, ax: ex.ax, mode: axesMode() }), $('#readout'), $('#pins'));
    topics = window.Topics.create({
      app: PRACTICE,
      topics: window.Lessons.TOPICS.map((t) => ({
        name: () => t.name[Lang.get()],
        stages: t.stages.map((st) => ({ name: () => st.name[Lang.get()], types: st.types })),
        // the worked example of the step (or of the topic, for all steps)
        // (or, for the exercise shown, the example of its type: byType)
        example: (k) => {
          const byType = ex && t.byType && t.byType[typeOf(ex)];
          const i = t.stages[k] && t.stages[k].example != null ? t.stages[k].example : byType != null ? byType : t.example;
          return { i, name: () => window.Lessons.EXAMPLES[i].name[Lang.get()] };
        },
      })),
      make: ofType, typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    // A new choice clears the feedback on the old one, and so does typing a new value.
    $('#fields').addEventListener('change', (evt) => {
      if (evt.target.name === 'cand') { st.pick = Number(evt.target.value); document.querySelectorAll('.cand.bad').forEach((el) => el.classList.remove('bad')); $('#cand-fb').innerHTML = ''; }
    });
    $('#fields').addEventListener('input', (evt) => {
      const row = evt.target.closest('.field');
      if (!row) return;
      row.className = 'field';
      row.querySelector('.fb').textContent = '';
    });
    // the questions of a matching exercise: a right answer fades the options that do not fit; once
    // one option is left (and for one element, its shift is answered too), the exercise is solved
    // (counted as the attempt that solves it), and the questions not needed any more are shown
    // answered, with their reasoning. A wrong answer counts as an attempt.
    const shiftDone = () => ex.items.every((it) => it.key !== 'phase' || Identify.right(it, st.ident));
    Identify.attach($('#fields'), () => (ex && ex.match ? ex.items : []), () => st.ident, (right) => {
      if (!right) st.tries++;
      else if (!st.solved && shiftDone() && ex.cands.filter((x, k) => M.fits(ex, k, answeredOf())).length === 1) {
        ex.items.forEach((it) => { st.ident[it.key] = it.options.findIndex((o) => o.right); });
        st.tries++;
        solved();
      }
      if (right) drawMatch();
      updateButtons();
    });
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', relayout);
    P.setNarrow(narrow());

    tutor = window.createTutor(lessons(), { after: () => math($('#tutor')), done: practise, practise: (i) => {
      // the step of this example, where it has one
      const t = window.Lessons.EXAMPLES[i].topic, k = window.Lessons.TOPICS[t].stages.findIndex((st) => st.example === i);
      topics.go(t, k >= 0 ? k : null); setMode('practice'); fresh();
    } });
    checker = Check.create(checkSource, {
      math, markScrollable, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (t) => { topics.go(t); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // First visit: start with the first worked example.
    const last = stored('imp-mode', 'tutor');
    // (the arcade of earlier versions is now the check, and its problems are gone)
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
