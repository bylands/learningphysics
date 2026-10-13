(function () {
  'use strict';

  const TQ = window.TQ, Lang = window.Lang, Check = window.Check, { practiceOf, tutorial } = window.Com;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Centre of Mass and Tipping', mode: 'Mode', difficulty: 'Difficulty', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. What a step is about is highlighted.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Fill in all fields, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Give the size (a positive number)', close: 'Close: check your rounding', wrong: 'Not correct',
      idFirst: 'First make your choice above.',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Schwerpunkt und Kippen', mode: 'Modus', difficulty: 'Schwierigkeit', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Worum es in einem Schritt geht, ist hervorgehoben.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Fülle alle Felder aus, dann prüfe nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Gib den Betrag an (eine positive Zahl)', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig',
      idFirst: 'Triff zuerst oben deine Wahl.',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[TQ.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  const slips = window.Slips.create({ app: 'cm', concept: window.CheckSource.concept, ideas: () => window.CheckSource.concepts(), fixes: () => window.CheckSource.fixes() });

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('cm-score', { solved: 0, clean: 0 });
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

  // ---------------------------------------------------------------- input and feedback
  function parse(s) {
    s = s.trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/[^\d.)]+$/, '').trim();
    const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(?:\s*\/\s*(\d*\.?\d+))?$/i);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  }

  // Right within 1 % or when rounded to the field's decimal places; otherwise the answer under a
  // typical wrong idea, a sign or a rounding error.
  function judge(x, f) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.max(Math.abs(z), 0.01);
    const right = near(x, e, 0.01) || Math.abs(x - e) <= 0.5 * 10 ** -f.dec + 1e-9;
    if (right) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, 0.01)) return { cls: 'bad', msg: t.nudge || t.why, flag: t.flag };
    if (e !== 0 && near(-x, e, 0.01)) return { cls: 'warn', msg: ui().sign };
    if (e !== 0 && near(x, e, 0.05)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  const newSeed = () => 1 + Math.floor(Math.random() * 999999);

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'cm', typeOf = (e) => e.scenario;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, ident: {} };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    if (ex.fields.length) $(`#in-${ex.fields[0].key}`).focus({ preventScroll: true });
  }

  // A new exercise of the topic and stage chosen (topics.js), of another situation than the
  // current one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language)
  const again = (e) => topics.parse(e.id);

  // The topics of practice: those of the tutor's examples, with their stages (lessons.js).
  const topicList = () => window.Lessons.EXAMPLES.map((e) => ({
    name: () => e.name[TQ.getLang()],
    stages: e.practice.map((s) => ({ name: s.en ? () => s[TQ.getLang()] : null, types: s.types })),
  }));

  // The answer fields; their inputs have the ids `${prefix}-${key}`.
  const fieldsHtml = (exercise, prefix) => exercise.fields.map((f) => `
      <div class="field" data-key="${f.key}">
        <label for="${prefix}-${f.key}" class="sym"><span class="what">${f.what}</span> $${TQ.tex(...f.sym)}$&nbsp;=</label>
        <input id="${prefix}-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${TQ.UNITS[f.unit]}</span>
        <span class="after"><span class="fb" aria-live="polite"></span></span>
      </div>`).join('');

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
    $('#figure').innerHTML = ex.figure({ task: true });
    $('#fields').innerHTML = fieldsHtml(ex, 'in');
    showComps();
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    math($('#task'));
    markScrollable();
    updateButtons();
  }

  // What to choose (see identify.js): an exercise without fields is a choice only (the kind of
  // equilibrium, the block that falls): a right choice solves it.
  const identItems = () => ex.comps || [];
  function showComps() {
    $('#comps-part').hidden = !(ex.comps || []).length;
    $('#comps').innerHTML = Identify.html(identItems(), st ? st.ident || {} : {}, st && st.revealed);
    math($('#comps'));
  }

  // solved now, or solved before (its solution can be looked at again)
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;

  function updateButtons() {
    // once everything is right, Check becomes New exercise, like the button at the top
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
    const left = ex.hints.length - st.hints;
    const hb = $('#hint');
    hb.disabled = left === 0 || st.revealed;
    hb.textContent = left ? ui().hint(left) : ui().noHints;
    const rb = $('#reveal');
    rb.disabled = !canReveal() || st.revealed;
    rb.title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
  }

  // Marks every field; true if all are right, null if some are empty.
  function feedback() {
    let allOk = true, anyEmpty = false;
    ex.fields.forEach((f) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`);
      const raw = row.querySelector('input[type="text"]').value;
      if (!raw.trim()) { anyEmpty = true; allOk = false; row.className = 'field'; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(parse(raw), f);
      row.className = `field ${r.cls}`;
      row.querySelector('.fb').textContent = r.msg;
      if (r.flag && !st.revealed) slips.note(r.flag, ex.id);
      if (r.cls !== 'ok') allOk = false;
    });
    return allOk ? true : anyEmpty ? null : false;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? ui().fill : kind === 'ident' ? ui().idFirst
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (st.tries < MAX_TRIES && !canReveal() ? ui().tryAgain : ui().canReveal);
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    if (!Identify.ok(identItems(), st.ident)) { showStatus('ident'); return; }
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) {
      if (!st.solved && !st.revealed) {
        const s = stored('cm-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('cm-score', s);
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
    name: e.name[TQ.getLang()], idea: e.idea[TQ.getLang()], also: topics.also(i), frames: () => tutorial(e).frames,
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
      const values = ex.fields.map((f) => $(`#in-${f.key}`).value);
      const keep = { ...st };
      ex = again(ex);
      render();
      st = keep;
      showComps();
      ex.fields.forEach((f, k) => { $(`#in-${f.key}`).value = values[k]; });
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
    store('cm-mode', m);
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
    return false;
  }

  // ---------------------------------------------------------------- init
  function init() {
    Lang.init(); // see lang.js
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    topics = window.Topics.create({
      app: PRACTICE, topics: topicList(),
      make: (type, seed) => practiceOf(type, seed), typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    slips.mount();
    applyStatic();
    Identify.attach($('#comps'), identItems, () => st.ident, (right, it) => {
      math($('#comps'));
      const o = it.options[st.ident[it.key]];
      if (!right && o && o.flag && !st.revealed) slips.note(o.flag, ex.id);
      if (!right) { st.tries++; updateButtons(); } // a wrong choice counts as an attempt
      else if (!ex.fields.length && !st.solved && Identify.ok(identItems(), st.ident)) check({ preventDefault() {} }); // a choice only: solved
    });
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
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
    const last = stored('cm-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
