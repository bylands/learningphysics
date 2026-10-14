(function () {
  'use strict';

  const FS = window.FS, Lang = window.Lang, Check = window.Check, { practiceOf, tutorial } = window.Forces;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const LEGEND = {
    en: '<span class="k-g">weight</span>, <span class="k-n">normal force</span>, <span class="k-r">friction</span>, <span class="k-s">pull</span>, <span class="k-k">rope and contact forces</span>, <span class="k-f">spring force</span>, <span class="k-d">air resistance</span>, <span class="k-acc">acceleration</span> and velocity (dashed)',
    de: '<span class="k-g">Gewichtskraft</span>, <span class="k-n">Normalkraft</span>, <span class="k-r">Reibung</span>, <span class="k-s">Zugkraft</span>, <span class="k-k">Seil- und Kontaktkräfte</span>, <span class="k-f">Federkraft</span>, <span class="k-d">Luftwiderstand</span>, <span class="k-acc">Beschleunigung</span> und Geschwindigkeit (gestrichelt)',
  };
  const UI = {
    en: {
      title: 'Free-Body Diagrams', mode: 'Mode', difficulty: 'Difficulty', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: `Use the arrow keys ← → to step through. The forces a step is about are highlighted. Colours: ${LEGEND.en}.`,
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      forcesHead: '1 · Forces on each box', compsHead: (n) => `${n} · Components`, compsNote: 'Choose the right expression for each component; its value is then given.',
      eqsHead: (n) => `${n} · Equations`, eqsNote: 'Choose the right equation for each system and axis. The worked solution then solves them.',
      eqsNoteNums: 'Choose the right equation for each system and axis.',
      numsHead: (n) => `${n} · Calculation`, numsNote: 'Work it out in your head with the values given (g = 10 m/s²), then enter the result.',
      idFirst: 'First choose the right expression or equation for each part.', fill: 'Enter the result, then check again.',
      number: 'Enter a number', correct: 'Correct', sign: 'Give the size (a positive number)', close: 'Close: check your calculation', wrong: 'Not correct',
      choose: 'Not right yet. Choose the result from these values:', pick: 'Choose one of the values for each result, then check again.',
      forcesNote: (n, who) => (n > 1 ? 'Tick every force that acts on each box. Each force you tick appears in the drawing.' : `Tick every force that acts on ${who}. Each force you tick appears in the drawing.`),
      tableOk: '✓ The forces are right.', tableBad: (n) => `✗ ${n === 1 ? 'One entry is' : `${n} entries are`} not right yet.`,
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Kräftediagramme', mode: 'Modus', difficulty: 'Schwierigkeit', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: `Mit den Pfeiltasten ← → blätterst du weiter. Die Kräfte, um die es in einem Schritt geht, sind hervorgehoben. Farben: ${LEGEND.de}.`,
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      forcesHead: '1 · Kräfte auf jede Kiste', compsHead: (n) => `${n} · Komponenten`, compsNote: 'Wähle für jede Komponente den richtigen Ausdruck; ihr Wert wird dann angegeben.',
      eqsHead: (n) => `${n} · Gleichungen`, eqsNote: 'Wähle für jedes System und jede Achse die richtige Gleichung. Die ausführliche Lösung löst sie dann auf.',
      eqsNoteNums: 'Wähle für jedes System und jede Achse die richtige Gleichung.',
      numsHead: (n) => `${n} · Rechnung`, numsNote: 'Rechne im Kopf mit den gegebenen Werten (g = 10 m/s²) und gib das Resultat ein.',
      idFirst: 'Wähle zuerst für jeden Teil den richtigen Ausdruck bzw. die richtige Gleichung.', fill: 'Gib das Resultat ein, dann prüfe nochmals.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Gib den Betrag an (eine positive Zahl)', close: 'Knapp daneben: Prüfe deine Rechnung', wrong: 'Nicht richtig',
      choose: 'Noch nicht richtig. Wähle das Resultat aus diesen Werten:', pick: 'Wähle für jedes Resultat einen der Werte und prüfe dann nochmals.',
      forcesNote: (n, who) => (n > 1 ? 'Kreuze jede Kraft an, die auf die jeweilige Kiste wirkt. Jede angekreuzte Kraft erscheint in der Zeichnung.' : `Kreuze jede Kraft an, die auf ${who} wirkt. Jede angekreuzte Kraft erscheint in der Zeichnung.`),
      tableOk: '✓ Die Kräfte stimmen.', tableBad: (n) => `✗ ${n === 1 ? 'Ein Feld stimmt' : `${n} Felder stimmen`} noch nicht.`,
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[FS.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  const slips = window.Slips.create({ app: 'fs', concept: window.CheckSource.concept, ideas: () => window.CheckSource.concepts(), fixes: () => window.CheckSource.fixes() });

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  // ---------------------------------------------------------------- saved progress of earlier versions
  // The order of the topics and stages changed (see lessons.js: migrate): the saved progress moves
  // along with its content, once. Sets saved before there were objectives list worked examples by
  // index (sets.js), from the time when Find the error was the last of seven: it is now the 9th.
  const migrate = () => { try { window.Lessons.migrate(localStorage); } catch (e) { /* storage unavailable */ } };
  function legacySets() {
    const S = window.LPSets;
    if (!S) return;
    const tutorOf = S.tutor;
    S.tutor = () => { const l = tutorOf(); return l && !S.objectives() ? l.map(window.Lessons.oldTutor) : l; };
  }

  function showScore() {
    const s = stored('fs-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  function math(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
        trust: (ctx) => ctx.command === '\\htmlClass',
        strict: false,
      });
    }
  }

  // Wide drawings scroll horizontally on small screens.
  function markScrollable() {
    document.querySelectorAll('.fig').forEach((fig) => {
      fig.classList.toggle('scrolls', fig.scrollWidth > fig.clientWidth + 1);
    });
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'fs', typeOf = (e) => e.scenario;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, ident: {}, nums: {}, chosen: {} };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
  }

  // A new exercise of the topic and stage chosen (topics.js), of another type than the current
  // one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language)
  const again = (e) => topics.parse(e.id);

  // The topics of practice: those of the tutor's examples, with their stages (lessons.js).
  const topicList = () => window.Lessons.EXAMPLES.map((e) => ({
    name: () => e.name[FS.getLang()],
    stages: e.practice.map((s) => ({ name: s.en ? () => s[FS.getLang()] : null, types: s.types })),
  }));

  // The table of forces: a row per kind of force, a column per box (at most two, so that it fits
  // a phone), a box to tick per cell.
  function forcesHtml() {
    const t = ex.forces;
    const head = t.boxes.map((b) => `<th scope="col">${b}</th>`).join('');
    const rows = t.kinds.map((k, j) => `<tr><th scope="row" class="k-${k.kind}">${k.name}</th>${t.boxes.map((b, i) => `
      <td><label class="cell"><input type="checkbox" data-i="${i}" data-j="${j}" aria-label="${b}: ${k.name}"><span aria-hidden="true"></span></label></td>`).join('')}</tr>`).join('');
    return `<table class="ftable"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  // The task's drawing with every force ticked in the table drawn in, whether it acts or not:
  // the drawing shows what the student claims.
  function drawTicked() {
    if (!ex.forces) return;
    const ticked = new Set([...document.querySelectorAll('#ftable input:checked')].map((b) => `${b.dataset.i}:${b.dataset.j}`));
    $('#figure').innerHTML = ex.taskFigure(ticked, identified());
    markScrollable();
  }

  function render() {
    $('#title').textContent = ex.title;
    // the difficulty: ★★★☆☆
    const stars = document.createElement('span');
    stars.className = 'stars';
    stars.textContent = '★'.repeat(ex.difficulty) + '☆'.repeat(5 - ex.difficulty);
    stars.title = ui().stars(ex.difficulty);
    stars.setAttribute('aria-label', ui().stars(ex.difficulty));
    stars.setAttribute('role', 'img');
    $('#title').append(' ', stars);
    $('#prompt').innerHTML = ex.text;
    $('#figure').innerHTML = ex.forces ? ex.taskFigure(new Set()) : ex.taskFigure();
    $('#forces-part').hidden = !ex.forces; // find the error: no table of forces
    if (ex.forces) {
      $('#forces-note').textContent = ui().forcesNote(ex.forces.boxes.length, ex.forces.boxes[0]);
      $('#ftable').innerHTML = forcesHtml();
      $('#ftable-fb').textContent = '';
      $('#ftable-fb').className = 'table-fb';
    }
    showComps();
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    math($('#task'));
    markScrollable();
    updateButtons();
  }

  // The components to identify (angled forces, see identify.js), with values the app gives (with
  // the sine or cosine the text gives, c.value), the equations to choose (equations.js) and the
  // results to work out, typed in and after a wrong value chosen (generator.js: numItem). Find the
  // error is a choice only: a right choice solves it.
  const compItems = () => ex.comps.map((c) => ({ ...Identify.trig({ ...c, alpha: ex.p.alpha, num: (x) => FS.num(x), unit: '\\mathrm{N}' }), ...(c.value ? { value: c.value } : {}) }));
  // while the exercise is open, a wrong choice shows its nudge (where there is one) instead of its why
  const nudged = (items) => (st && (st.solved || st.revealed) ? items : items.map((it) => ({ ...it, options: it.options.map((o) => (o.nudge ? { ...o, why: o.nudge } : o)) })));
  const eqItems = () => nudged(ex.eqs);
  const numItems = () => nudged(ex.nums || []);
  const choiceOnly = () => !ex.forces;
  const allIdentified = () => Identify.ok(compItems(), st.ident) && Identify.ok(eqItems(), st.ident);
  // the forces of the components identified so far (drawn in), all once the solution is shown
  const identified = () => ex.comps.filter((c) => (st && st.revealed) || (st && Identify.right(compItems().find((it) => it.key === c.key), st.ident))).map((c) => c.fig);
  function showComps() {
    const state = st ? st.ident || {} : {}, done = st && st.revealed;
    const n = ex.forces ? 2 : 1, m = n + (ex.comps.length ? 1 : 0); // numbered after the table of forces
    $('#comps-part').hidden = !ex.comps.length;
    $('#comps-head').textContent = ui().compsHead(n);
    $('#comps').innerHTML = Identify.html(compItems(), state, done);
    $('#eqs-part').hidden = !ex.eqs.length;
    $('#eqs-part').classList.toggle('only', choiceOnly());
    $('#eqs-head').textContent = ui().eqsHead(m);
    $('#eqs-note').textContent = numItems().length ? ui().eqsNoteNums : ui().eqsNote;
    $('#eqs').innerHTML = Identify.html(eqItems(), state, done);
    $('#nums-part').hidden = !numItems().length;
    $('#nums-head').textContent = ui().numsHead(m + (ex.eqs.length ? 1 : 0));
    showNums();
    math($('#comps'));
    math($('#eqs'));
  }
  // The results to work out: a number field each, as in the sibling apps (the value typed kept in
  // st.nums, so that the fields survive a redraw). One typed wrong is chosen from four values instead
  // (st.chosen, until the next exercise; see numFeedback), with what was wrong about the value typed
  // above them until the right one is chosen. Once the solution is shown, the calculation below.
  function showNums() {
    const items = numItems(), done = st && st.revealed, state = st ? st.ident : {};
    const chosen = (n) => st && st.chosen[n.key];
    $('#nums').innerHTML = `<div class="fields">${items.map((n) => (chosen(n) ? Identify.html([{ ...n, what: `<span class="what">${n.what}</span> $${n.sym}$${
      done || Identify.right(n, state) ? '' : `<span class="num-why">${typedWhy(n)}</span>`}` }], state, done) : `
      <div class="field" data-key="${n.key}">
        <label for="in-${n.key}" class="sym"><span class="what">${n.what}</span> $${n.sym}$&nbsp;=</label>
        <input id="in-${n.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${FS.UNITS[n.unit]}</span>
        <span class="fb" aria-live="polite"></span>
      </div>`)).join('')}</div>${done ? items.filter((n) => !chosen(n)).map((n) => `<p class="ident-fb ok">${n.value}</p>`).join('') : ''}`;
    items.forEach((n) => { if (!chosen(n)) $(`#in-${n.key}`).value = (st && st.nums[n.key]) || ''; });
    if (st && st.checked) numFeedback();
    math($('#nums'));
  }
  // What was wrong about the value typed for result n (that of a typical mistake, close, or the
  // wrong sign), and that the result is now to be chosen.
  function typedWhy(n) {
    const r = window.Forces.judge(n, window.Forces.parse(st.nums[n.key] || '')), t = r.trap;
    const why = t ? (st.solved || st.revealed ? t.why : t.nudge || t.why) : r.sign ? ui().sign : r.close ? ui().close : '';
    return `${why ? `${why} ` : ''}${ui().choose}`;
  }

  // solved now, or solved before (its solution can be looked at again)
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;

  function updateButtons() {
    // once everything is right, Check becomes New exercise, like the button at the top
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
    $('#check').hidden = choiceOnly() && !st.solved; // a choice only is solved by choosing
    const left = ex.hints.length - st.hints;
    const hb = $('#hint');
    hb.disabled = left === 0 || st.revealed;
    hb.textContent = left ? ui().hint(left) : ui().noHints;
    const rb = $('#reveal');
    rb.disabled = !canReveal() || st.revealed;
    rb.title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
  }

  // A wrong cell of the table of forces as a typical slip: a force in the direction of motion,
  // friction, a spring force or air resistance left out, air resistance on a body at rest.
  function tableSlip(box) {
    if (st.revealed) return;
    const k = ex.forces.kinds[box.dataset.j].kind, scn = window.Forces.SCENARIOS.find((x) => x.id === ex.scenario);
    const still = !!(scn && scn.still);
    const flag = box.checked ? (k === 's' && !still ? 'motion' : k === 'd' && still ? 'dragRest' : null)
      : { r: 'noFric', f: 'noSpring', d: 'noDrag' }[k];
    if (flag) slips.note(flag, ex.id);
  }

  // Marks the table of forces; true if it is right (or there is none).
  function feedback() {
    if (!ex.forces) return true;
    let wrongCells = 0;
    document.querySelectorAll('#ftable input').forEach((box) => {
      const right = box.checked === ex.forces.table[box.dataset.i][box.dataset.j];
      box.closest('td').className = right ? 'ok' : 'bad';
      if (!right) { wrongCells++; tableSlip(box); }
    });
    $('#ftable-fb').className = `table-fb ${wrongCells ? 'bad' : 'ok'}`;
    $('#ftable-fb').textContent = wrongCells ? ui().tableBad(wrongCells) : ui().tableOk;
    return !wrongCells;
  }

  // Marks the results typed: { empty, wrong, pick } counts the results empty (or no number), typed
  // wrong and to be chosen still (none of each: all right). A value of a typical mistake gets its
  // nudge while the exercise is open, its explanation once it is solved or the solution shown.
  // note (on Check, not on a redraw): the slip is noted, and a result typed wrong is from now on
  // chosen from four values (st.chosen; showNums draws them). A trap chosen after it was typed is
  // not counted twice: slips.js counts an idea once per exercise.
  function numFeedback(note) {
    const res = { empty: 0, wrong: 0, pick: 0 };
    numItems().forEach((n) => {
      if (st.chosen[n.key]) { if (!Identify.right(n, st.ident)) res.pick++; return; }
      const row = $('#nums').querySelector(`.field[data-key="${n.key}"]`), raw = st.nums[n.key] || '';
      if (!raw.trim()) { res.empty++; row.className = 'field'; row.querySelector('.fb').textContent = ''; return; }
      const r = window.Forces.judge(n, window.Forces.parse(raw)), t = r.trap;
      row.className = `field ${r.ok ? 'ok' : r.sign || r.close ? 'warn' : 'bad'}`;
      row.querySelector('.fb').textContent = r.ok ? ui().correct : r.nan ? ui().number : t ? (st.solved || st.revealed ? t.why : t.nudge || t.why)
        : r.sign ? ui().sign : r.close ? ui().close : ui().wrong;
      if (r.nan) res.empty++;
      else if (!r.ok) {
        res.wrong++;
        if (note) { if (t && t.flag && !st.revealed) slips.note(t.flag, ex.id); st.chosen[n.key] = true; }
      }
    });
    return res;
  }

  // The status line: null (none), 'ident', 'fill', 'pick', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'ident' ? ui().idFirst : kind === 'fill' ? ui().fill : kind === 'pick' ? ui().pick
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (st.tries < MAX_TRIES && !canReveal() ? ui().tryAgain : ui().canReveal);
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    if (!allIdentified()) { showStatus('ident'); return; }
    const r = feedback(), n = numFeedback(true);
    st.checked = true;
    if (n.wrong) showNums(); // the results typed wrong are now chosen
    // a result left empty, or one still to be chosen: not an attempt (unless one is typed wrong)
    if (!n.wrong && (n.empty || n.pick)) { showStatus(n.empty ? 'fill' : 'pick'); return; }
    st.tries++;
    if (r && !n.wrong) {
      if (!st.solved && !st.revealed) {
        const s = stored('fs-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('fs-score', s);
        showScore();
      }
      st.solved = true;
      Practice.markSolved(PRACTICE, ex.id);
      finish();
      st.advance = topics.solved(st, ex);
      showStatus('ok');
    } else showStatus('bad');
    updateButtons();
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

  function showSolution() {
    showComps();
    $('#sol-figure').innerHTML = ex.solutionFigure();
    $('#sol-steps').innerHTML = ex.solution.join('');
    $('#sol-short').innerHTML = `${ui().results}: ${ex.results}`;
    $('#solution').hidden = false;
    math($('#solution'));
    markScrollable();
  }
  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    finish();
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- language
  const lessons = () => window.Lessons.EXAMPLES.map((e, i) => ({
    name: e.name[FS.getLang()], idea: e.idea[FS.getLang()], also: topics.also(i), frames: () => tutorial(e).frames,
  }));

  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
    slips.relabel();
  }

  // The same exercise (same seed) in the other language, with the answers, hints and solution kept.
  function switchLang() {
    applyStatic();
    showScore();
    if (ex) {
      const ticks = [...document.querySelectorAll('#ftable input')].map((b) => b.checked);
      const keep = { ...st };
      ex = again(ex);
      render();
      st = keep;
      showComps();
      document.querySelectorAll('#ftable input').forEach((b, k) => { b.checked = ticks[k]; });
      drawTicked();
      if (st.checked) feedback();
      showStatus(st.status);
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
  // objectives (check.js, check-src.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('fs-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function checkMode() {
    setMode('check');
    checker.show();
    if (location.hash !== '#check') history.replaceState(null, '', '#check');
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; markScrollable(); } else fresh();
  }

  function fromHash() {
    const h = location.hash.slice(1);
    // the arcade of earlier versions is now the check
    if (h === 'check' || h === 'arcade') { if ($('#ck').hidden) checkMode(); return true; }
    const m = h.match(/^tutor-(\d+)$/);
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
    // links of earlier versions (a level, a real problem): practice
    if (/^(easy|medium|hard|mixed|real)/.test(h)) { practise(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- init
  function init() {
    migrate();
    legacySets();
    Lang.init(); // see lang.js
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    applyStatic();
    topics = window.Topics.create({
      app: PRACTICE, topics: topicList(),
      make: (type, seed) => practiceOf(type, seed), typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    slips.mount();
    const picked = (el) => (right, it) => {
      math(el);
      const o = it.options[st.ident[it.key]];
      if (!right && o && o.flag && !st.revealed) slips.note(o.flag, ex.id);
      if (right) drawTicked(); // a component appears in the drawing
      else { st.tries++; updateButtons(); } // a wrong choice counts as an attempt
      if (right && choiceOnly() && !st.solved && allIdentified()) check({ preventDefault() {} }); // a choice only: solved
    };
    Identify.attach($('#comps'), compItems, () => st.ident, picked($('#comps')));
    Identify.attach($('#eqs'), eqItems, () => st.ident, picked($('#eqs')));
    // a result chosen (once typed wrong): as a choice above, then drawn again with its label (and,
    // until the right one is chosen, what was wrong about the value typed)
    const pickedNum = picked($('#nums'));
    Identify.attach($('#nums'), numItems, () => st.ident, (right, it) => { pickedNum(right, it); showNums(); });
    // a result typed: kept, and its feedback cleared until the next check
    $('#nums').addEventListener('input', (evt) => {
      const row = evt.target.closest('.field');
      if (!row) return;
      st.nums[row.dataset.key] = evt.target.value;
      row.className = 'field';
      row.querySelector('.fb').textContent = '';
    });
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#ftable').addEventListener('change', drawTicked);
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { math($('#tutor')); markScrollable(); },
      done: practise,
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
      t: () => ui().tutorBtns,
    });
    checker = Check.create(window.CheckSource, {
      math, markScrollable, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // First visit: start with the first worked example.
    const last = stored('fs-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
