(function () {
  'use strict';

  const Lp = window.Loop, Lang = window.Lang, Check = window.Check, L = Lang.L;
  const { fitText } = window.Circuit;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Potential in a Circuit', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. In the circuit, the point just found is <span class="k-new">marked</span>; below it, the potential is plotted around the loop, from A back to A.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      solNote: 'The circuit shows the potential at every point; below it, the potential around the loop.',
      stars: (d) => `Difficulty: ${d} of 5`,
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Wrong sign: check the direction', close: 'Close: check your arithmetic', wrong: 'Not correct', notThis: 'Not this one: check your reasoning, or take a hint.',
      sketchHow: 'Drag each point to its potential, or press where it should go (keyboard: Tab, then ← → choose a point, ↑ ↓ move it). The shape counts: level where it should be, and each step the right way and about the right size.',
      sketchLabel: 'Your sketch of the potential around the loop', sketchFirst: 'Sketch the potential first: drag the points up or down, then check.', reset: 'Reset the sketch',
      sketchOk: 'Your sketch has the right shape. The exact graph is laid over it, dashed.', sketchWrong: 'What is wrong in your sketch (marked):',
      sketchTutorOk: 'Right! Your sketch has the right shape (the exact graph is dashed). The next steps go round the loop one step at a time.',
    },
    de: {
      title: 'Potential im Stromkreis', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. In der Schaltung ist der eben gefundene Punkt <span class="k-new">markiert</span>; darunter ist das Potential im Kreis herum aufgetragen, von A zurück nach A.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      solNote: 'Die Schaltung zeigt das Potential in jedem Punkt; darunter das Potential im Kreis herum.',
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Falsches Vorzeichen: Prüfe die Richtung', close: 'Knapp daneben: Prüfe deine Rechnung', wrong: 'Nicht richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Tipp.',
      sketchHow: 'Zieh jeden Punkt auf sein Potential, oder drück dorthin, wo er hingehört (Tastatur: Tab, dann wählt ← → einen Punkt, ↑ ↓ verschiebt ihn). Es zählt die Form: gleich hoch, wo es gleich bleibt, und jeder Schritt in die richtige Richtung und etwa gleich gross.',
      sketchLabel: 'Deine Skizze des Potentials im Kreis herum', sketchFirst: 'Skizziere zuerst das Potential: Zieh die Punkte hinauf oder hinunter und prüfe dann.', reset: 'Skizze zurücksetzen',
      sketchOk: 'Deine Skizze hat die richtige Form. Der genaue Graph liegt gestrichelt darüber.', sketchWrong: 'Was an deiner Skizze falsch ist (markiert):',
      sketchTutorOk: 'Richtig! Deine Skizze hat die richtige Form (der genaue Graph ist gestrichelt). Die nächsten Schritte gehen Schritt für Schritt im Kreis herum.',
    },
  };
  const ui = () => UI[Lang.get()];
  const TITLE = {
    pot: () => L('Potentials', 'Potentiale'), loop: () => L('The loop rule', 'Die Maschenregel'), junction: () => L('Junction and loop', 'Knoten und Masche'),
    volt: () => L('Voltages between points', 'Spannungen zwischen Punkten'), error: () => L('Find the error', 'Finde den Fehler'),
    sketch: () => L('Sketch the potential', 'Das Potential skizzieren'),
  };

  // An exercise (loop.js) has fields { type: 'num', key, sym, unit, value } (a number to enter) or
  // { type: 'choice', key, label, options: [{ label, ok, why }] } (one option to choose), or none
  // and a sketch of the potential (ex.sketch, see below).
  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('pc-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  // KaTeX, and the circuit labels fitted to the rendered text (fitText)
  function math(el) {
    el.querySelectorAll('.fig svg.circuit').forEach((svg) => fitText(svg));
    if (window.renderMathInElement) {
      window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
  }
  // Wide figures scroll horizontally on small screens; say so, since the cut-off part is invisible.
  function markScrollable() {
    document.querySelectorAll('.fig').forEach((fig) => {
      fig.classList.toggle('scrolls', fig.scrollWidth > fig.clientWidth + 1);
    });
  }

  // ---------------------------------------------------------------- input and feedback
  function parse(s) {
    s = s.trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/[^\d.)]+$/, '').trim(); // the minus as phones type it
    const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)$/i);
    return m ? Number(m[1]) : NaN;
  }
  function judge(x, e) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    if (Math.abs(x - e) < 1e-6) return { cls: 'ok', msg: ui().correct };
    if (e !== 0 && Math.abs(x + e) < 1e-6) return { cls: 'warn', msg: ui().sign };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  const PRACTICE = 'pc', typeOf = (e) => e.type;
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, status: null, values: ex.sketch ? ex.sketch.xs.map(() => 0) : null, judged: false };
    if (location.hash !== `#${ex.id}`) history.replaceState(null, '', `#${ex.id}`);
    render();
    topics.shown(ex);
    const first = $('#fields input[type="text"]');
    if (first) first.focus({ preventScroll: true });
  }
  // A new exercise of the topic and stage chosen (topics.js).
  const fresh = () => open(topics.next(ex));
  const again = (e) => topics.parse(e.id);

  function fieldHtml(f) {
    if (f.type === 'choice') {
      return `<div class="field choice" data-key="${f.key}"><span class="what">${f.label}</span><div class="opts" role="radiogroup">${f.options.map((o, k) => `<label><input type="radio" name="q-${f.key}" value="${k}"><span>${o.label}</span></label>`).join('')}</div><span class="fb" aria-live="polite"></span></div>`;
    }
    return `
      <div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym">$${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${f.unit}</span>
        <span class="fb" aria-live="polite"></span>
      </div>`;
  }

  function render() {
    $('#title').innerHTML = `${TITLE[ex.kind]()} ${starsOf(ex.difficulty)}`;
    $('#prompt').innerHTML = ex.text;
    $('#figure').innerHTML = ex.figure(false);
    $('#fields').innerHTML = ex.fields.map(fieldHtml).join('');
    $('#sketch-area').hidden = !ex.sketch;
    $('#sketch-area').innerHTML = '';
    if (ex.sketch) mountSketch();
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    math($('#task'));
    markScrollable();
    updateButtons();
  }

  // solved now, or solved before (its solution can be looked at again)
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;

  function updateButtons() {
    const left = ex.hints.length - st.hints;
    $('#hint').disabled = left === 0 || st.revealed;
    $('#hint').textContent = left ? ui().hint(left) : ui().noHints;
    $('#reveal').disabled = !canReveal() || st.revealed;
    $('#reveal').title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
    // once everything is right, Check becomes New exercise, like the button at the top
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
  }

  // Marks every answer; true if all are right, null if some are missing.
  function feedback() {
    if (ex.sketch) {
      const probs = Lp.judgeSketch(ex.c, ex.sketch, st.values);
      st.judged = probs !== null;
      showSketch();
      return probs === null ? null : !probs.length;
    }
    let allOk = true, anyEmpty = false;
    const done = st.solved || st.revealed;
    for (const f of ex.fields) {
      const row = $(`#fields .field[data-key="${f.key}"]`), fb = row.querySelector('.fb');
      if (f.type === 'choice') {
        const sel = row.querySelector('input:checked');
        if (!sel) { anyEmpty = true; allOk = false; row.className = 'field choice'; fb.textContent = ''; continue; }
        const o = f.options[Number(sel.value)];
        row.className = `field choice ${o.ok ? 'ok' : 'bad'}`;
        // while the exercise is open, a wrong choice gets a nudge, not the solution
        fb.innerHTML = o.ok ? ui().correct : done || f.key === 'step' ? o.why : ui().notThis;
        if (!o.ok) allOk = false;
        continue;
      }
      const raw = row.querySelector('input').value;
      if (!raw.trim()) { anyEmpty = true; allOk = false; row.className = 'field'; fb.textContent = ''; continue; }
      const r = judge(parse(raw), f.value);
      row.className = `field ${r.cls}`;
      fb.textContent = r.msg;
      if (r.cls !== 'ok') allOk = false;
    }
    math($('#fields'));
    return allOk ? true : anyEmpty ? null : false;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    if (st) st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? (ex.sketch ? ui().sketchFirst : ui().fill)
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (st.tries < MAX_TRIES && !canReveal() ? ui().tryAgain : ui().canReveal);
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) {
      if (!st.revealed) {
        const s = stored('pc-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('pc-score', s);
        showScore();
      }
      st.solved = true;
      Practice.markSolved(PRACTICE, ex.id);
      finish();
      st.advance = topics.solved(st, ex);
      showStatus('ok');
    } else showStatus('bad');
    if (ex.sketch) showSketch();
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
    $('#sol-figure').innerHTML = ex.figure(true);
    $('#sol-steps').innerHTML = ex.solution.map((p) => `<p>${p}</p>`).join('');
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
    if (st.checked) feedback();
    if (ex.sketch) showSketch();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- sketching the potential
  // A sketch exercise (ex.sketch) has a handle at every point after A, dragged up and down, set by
  // a press (the nearest point) or moved with the keys: the shared sketcher (sketch.js), its
  // columns, on the drawing of loop.js. Check judges it leniently (Lp.judgeSketch): while the
  // exercise is open, the first problem gets a nudge and its step is marked; once it is solved or
  // its solution shown, the right graph is laid over the sketch, dashed, and every problem is
  // explained. A change clears the marks. The tutor's Your turn frames use the same sketcher.
  // s: { values, judged (checked since the last change), done (solved or shown: locked, the
  // right graph laid over) }; onEdit runs after a change.
  function sketcher(svg, c, spec, s, onEdit) {
    const g = Lp.sketchScale(spec);
    const marks = () => {
      const probs = s.judged ? Lp.judgeSketch(c, spec, s.values) : null;
      if (!probs || !probs.length) return null;
      return [...new Set((s.done ? probs : probs.slice(0, 1)).flatMap((p) => p.steps))];
    };
    const k = Sketch.create(svg, {
      model: 'columns', xs: spec.xs, x: g.x, y: g.y, inv: g.inv, lo: spec.lo, hi: spec.hi, step: 1, area: g.area,
      state: s.values, locked: () => s.done,
      plot: (sk) => Lp.sketchBody(c, spec, sk.state(), { marks: marks(), right: s.done, active: sk.active() }),
      radius: (h, active) => (active ? 8 : 6.5),
      describe: (h) => ({ label: L(`Potential at ${c.points[h.i + 1].name}`, `Potential in ${c.points[h.i + 1].name}`), text: Lp.sketchValue(spec, h.v) }),
      onEdit(sk) { s.values = sk.state(); s.judged = false; onEdit(); },
    });
    k.show({ hidden: s.done });
    return k;
  }
  // The feedback on the sketch: none (not checked since the last change), right, the first
  // problem's nudge, or (done) every problem explained.
  function sketchFb(el, c, spec, s, okText) {
    const probs = s.judged ? Lp.judgeSketch(c, spec, s.values) : null;
    el.className = `sketch-fb${probs ? (probs.length ? ' bad' : ' ok') : ''}`;
    el.innerHTML = !probs ? '' : !probs.length ? okText : s.done
      ? `<p>${ui().sketchWrong}</p><ul>${probs.map((p) => `<li>${p.why}</li>`).join('')}</ul>` : `<p>${probs[0].nudge}</p>`;
    math(el);
  }

  let sk = null;
  function mountSketch() {
    st.done = st.solved || st.revealed;
    $('#sketch-area').innerHTML = `<p class="note sketch-how">${ui().sketchHow}</p>${Lp.sketchFig(ex.sketch, ui().sketchLabel)}` +
      `<button type="button" id="sketch-reset" class="linklike">${ui().reset}</button><div id="sketch-fb" class="sketch-fb" aria-live="polite"></div>`;
    sk = sketcher($('#sketch-area svg'), ex.c, ex.sketch, st, () => { sketchFb($('#sketch-fb'), ex.c, ex.sketch, st, ''); if (st.status === 'fill') showStatus(null); });
    $('#sketch-reset').addEventListener('click', () => sk.reset());
    showSketch();
  }
  function showSketch() {
    st.done = st.solved || st.revealed;
    // shown without having been checked: what is wrong in it, if anything is drawn
    if (st.revealed && !st.judged) st.judged = Lp.judgeSketch(ex.c, ex.sketch, st.values) !== null;
    $('#sketch-reset').hidden = st.done;
    sk.show({ hidden: st.done });
    sketchFb($('#sketch-fb'), ex.c, ex.sketch, st, ui().sketchOk);
  }

  // The tutor's Your turn (a frame with .t-draw): the sketch of the example's circuit, checked with
  // nudges until it is right; or the student simply goes on. Each example's sketch is kept.
  const tutorSketch = {};
  function mountTutorSketch() {
    const box = $('#t-text .t-draw'), svg = $('#t-figure svg.sketch-plot');
    if (!box || !svg) return;
    const i = tutor.current(), c = Lp.EXAMPLES[i].sketch(), spec = Lp.sketchSpec(c, false);
    const s = tutorSketch[i] || (tutorSketch[i] = { values: spec.xs.map(() => 0), judged: false, done: false });
    box.innerHTML = `<div class="actions"><button type="button" id="t-scheck" class="primary">${ui().check}</button><button type="button" id="t-sreset" class="linklike">${ui().reset}</button></div><div id="t-sfb" class="sketch-fb" aria-live="polite"></div>`;
    const fb = () => sketchFb($('#t-sfb'), c, spec, s, ui().sketchTutorOk);
    const k = sketcher(svg, c, spec, s, fb);
    const sync = () => { $('#t-scheck').disabled = s.done; $('#t-sreset').hidden = s.done; k.show({ hidden: s.done }); fb(); };
    $('#t-scheck').addEventListener('click', () => {
      const probs = Lp.judgeSketch(c, spec, s.values);
      if (probs === null) { $('#t-sfb').className = 'sketch-fb'; $('#t-sfb').textContent = ui().sketchFirst; return; }
      s.judged = true;
      s.done = !probs.length;
      sync();
    });
    $('#t-sreset').addEventListener('click', () => k.reset());
    sync();
  }

  // ---------------------------------------------------------------- practice topics
  // Each with its worked example (the stage with two batteries has its own) and its stages.
  const ex0 = { i: 0, name: () => Lp.EXAMPLES[0].name() }, ex1 = { i: 1, name: () => Lp.EXAMPLES[1].name() };
  const TOPICS = [
    { name: () => L('Potentials around the loop', 'Potentiale im Kreis herum'), example: (s) => (s === 1 || s === 4 ? ex1 : ex0),
      stages: [{ name: () => L('one battery', 'eine Batterie'), types: ['pot-1'] }, { name: () => L('two batteries', 'zwei Batterien'), types: ['pot-2'] },
        { name: () => L('sketch it, one battery', 'skizzieren, eine Batterie'), types: ['sketch-1'] }, { name: () => L('sketch it, identical lamps', 'skizzieren, gleiche Lampen'), types: ['sketch-eq'] },
        { name: () => L('sketch it, two batteries', 'skizzieren, zwei Batterien'), types: ['sketch-2'] }] },
    { name: () => L('Loop rule and junction rule', 'Maschenregel und Knotenregel'), example: { i: 2, name: () => Lp.EXAMPLES[2].name() },
      stages: [{ name: () => L('loop rule, one battery', 'Maschenregel, eine Batterie'), types: ['loop-1'] }, { name: () => L('loop rule, two batteries', 'Maschenregel, zwei Batterien'), types: ['loop-2'] }, { name: () => L('a junction', 'ein Knoten'), types: ['junction'] }] },
    { name: () => L('Voltage between two points', 'Spannung zwischen zwei Punkten'), example: { i: 3, name: () => Lp.EXAMPLES[3].name() },
      stages: [{ name: () => L('potentials given', 'Potentiale gegeben'), types: ['volt-1'] }, { name: () => L('from the circuit', 'aus der Schaltung'), types: ['volt-2'] }] },
    { name: () => L('Find the error', 'Finde den Fehler'), example: { i: 4, name: () => Lp.EXAMPLES[4].name() },
      stages: [{ name: () => L('one battery', 'eine Batterie'), types: ['error-1'] }, { name: () => L('two batteries', 'zwei Batterien'), types: ['error-2'] }] },
  ];

  // ---------------------------------------------------------------- check
  // The objectives and the questions are in loop.js: each question asks for a potential, a
  // voltage, a current or the wrong step of a sketch, with wrong options from the typical mistakes.
  const checkSource = {
    id: 'pc',
    objectives: Lp.OBJECTIVES,
    question: Lp.question,
    concept: Lp.CONCEPT,
    concepts: Lp.concepts,
  };

  // ---------------------------------------------------------------- language
  const lessons = () => Lp.EXAMPLES.map((e, i) => ({ name: e.name(), idea: e.idea(), frames: e.frames, also: i === 1 ? '' : topics.also(e.topic) }));

  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
  }

  // The same exercise in the other language, with the answers, hints and solution kept.
  function switchLang() {
    applyStatic();
    showScore();
    if (ex) {
      const values = [...document.querySelectorAll('#fields input[type="text"]')].map((x) => [x.id, x.value]);
      const chosen = [...document.querySelectorAll('#fields input:checked')].map((x) => [x.name, x.value]);
      const keep = st;
      ex = again(ex);
      render();
      st = keep;
      values.forEach(([id, v]) => { const x = document.getElementById(id); if (x) x.value = v; });
      chosen.forEach(([n, v]) => { const x = document.querySelector(`input[name="${n}"][value="${v}"]`); if (x) x.checked = true; });
      if (st.checked) feedback();
      if (ex.sketch) showSketch();
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
  // objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('pc-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; markScrollable(); } else fresh();
  }
  function checkMode() {
    setMode('check');
    checker.show();
    if (location.hash !== '#check') history.replaceState(null, '', '#check');
  }

  function fromHash() {
    const h = location.hash.slice(1);
    if (h === 'check') { if ($('#ck').hidden) checkMode(); return true; }
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
    return false;
  }

  // ---------------------------------------------------------------- init
  function init() {
    Lang.init(); // see lang.js
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    topics = window.Topics.create({
      app: PRACTICE, topics: TOPICS,
      make: Lp.generate, typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    applyStatic();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#fields').addEventListener('change', (evt) => {
      const row = evt.target.closest('.field.choice');
      if (row) { row.className = 'field choice'; row.querySelector('.fb').textContent = ''; }
    });
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { mountTutorSketch(); math($('#tutor')); markScrollable(); },
      done: practise,
      practise: (i) => { topics.go(Lp.EXAMPLES[i].topic, i === 1 ? 1 : undefined); setMode('practice'); fresh(); },
    });
    checker = Check.create(checkSource, {
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
    const last = stored('pc-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
