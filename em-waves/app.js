(function () {
  'use strict';

  const EW = window.EW, Lang = window.Lang, Check = window.Check, { practiceOf, tutorial } = window.EWaves;
  const { EXAMPLES, TOPICS } = window.Lessons;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Electromagnetic Waves', mode: 'Mode', difficulty: 'Difficulty', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Results are highlighted.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every part, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Give the size (a positive number)', close: 'Close: check your rounding', wrong: 'Not correct', power: 'Off by a power of ten: check the units (nm, μT, THz, …)', signed: 'Check the sign', next: 'Right. Now the next part.',
      rankWrong: (n) => `${n === 1 ? 'One place is' : `${n} places are`} not right yet`, sci: 'Powers of ten: type 3.2e-8 or 3.2*10^-8.', none: 'none',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Elektromagnetische Wellen', mode: 'Modus', difficulty: 'Schwierigkeit', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Resultate sind hervorgehoben.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte alle Teile, dann prüfe nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Gib den Betrag an (eine positive Zahl)', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig', power: 'Um eine Zehnerpotenz daneben: Prüfe die Einheiten (nm, μT, THz, …)', signed: 'Prüfe das Vorzeichen', next: 'Richtig. Jetzt der nächste Teil.',
      rankWrong: (n) => `${n === 1 ? 'Ein Platz stimmt' : `${n} Plätze stimmen`} noch nicht`, sci: 'Zehnerpotenzen: Tippe 3.2e-8 oder 3.2*10^-8.', none: 'keine',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[EW.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('emw-score', { solved: 0, clean: 0 });
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
  // A number as typed: 0.25, 1/4, 3.2e-8, 3.2*10^-8, 3.2·10⁻⁸, with a comma or a point.
  const SUPER = { '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  function parse(s) {
    s = s.trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^${[...m].map((c) => SUPER[c]).join('')}`).replace(/\s+/g, '');
    s = s.replace(/[*·×x]10\^?\(?([-+]?\d+)\)?$/i, 'e$1').replace(/[^\d.)e]+$/i, '');
    const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(?:\/(\d*\.?\d+))?$/i);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  }

  // Right within 1 % or when rounded to three digits; otherwise the answer under a typical wrong
  // idea, a sign, a power of ten or a rounding error.
  function judgeNum(x, f) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.max(Math.abs(z), 1e-300);
    if (e === 0 ? Math.abs(x) < 1e-9 : near(x, e, 0.01) || EW.sig(x, 3) === EW.sig(e, 3) || EW.sig(x, 2) === EW.sig(e, 2)) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, 0.01)) return { cls: 'bad', msg: t.nudge || t.why };
    if (e !== 0 && near(-x, e, 0.01)) return { cls: 'warn', msg: f.signed ? ui().signed : ui().sign };
    if (e !== 0 && x !== 0) { const k = Math.log10(Math.abs(x / e)); if (Math.abs(k - Math.round(k)) < 0.005 && Math.round(k) !== 0) return { cls: 'warn', msg: ui().power }; }
    if (e !== 0 && near(x, e, 0.05)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'emw', typeOf = (e) => e.scenario;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, open: [] };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    const first = $('#fields input, #fields select');
    if (first && first.type === 'text') first.focus({ preventScroll: true });
  }

  // A new exercise of the topic and stage chosen (topics.js), of another situation than the
  // current one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language)
  const again = (e) => topics.parse(e.id);

  // The topics of practice (lessons.js), each with its worked example (by stage).
  const topicList = () => TOPICS.map((t) => ({
    name: t.name,
    stages: t.stages,
    example: (s) => { const i = t.example(s); return { i, name: () => EXAMPLES[i].name() }; },
  }));
  // the topic and stage of worked example i: the first whose example it is
  function topicOf(i) {
    for (let t = 0; t < TOPICS.length; t++) for (let s = 0; s < TOPICS[t].stages.length; s++) if (TOPICS[t].example(s) === i) return { t, s };
    return { t: 0, s: 0 };
  }

  // The answer fields: a number (input in-key), a choice (radio buttons named in-key) or a ranking
  // (cards dragged into boxes, questions.js).
  const radios = (f, list) => `<span class="choices levels small${f.pics ? ' pics' : ''}${f.stack ? ' stack' : ''}" role="radiogroup" aria-label="${f.what.replace(/<[^>]*>|\$/g, '')}">${list
    .map(([v, html, title]) => `<label><input type="radio" name="in-${f.key}" value="${v}"><span${title ? ` title="${title}" aria-label="${title}"` : ''}>${html}</span></label>`).join('')}</span>`;
  function fieldHtml(f) {
    if (f.type === 'rank') return Questions.html(f);
    const fb = '<span class="fb" aria-live="polite"></span>';
    if (f.type === 'num') {
      return `<div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym"><span class="what">${f.what}</span> $${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="${f.sci ? 'text' : 'decimal'}" autocomplete="off" autocapitalize="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${(EW.UNITS[f.unit] || [, f.unit])[1]}</span>${fb}</div>`;
    }
    // a choice (o[2], the explanation of a wrong one, is no title: it would give the answer away;
    // o[4], where there is one, is the nudge shown instead of o[2] after a wrong answer)
    const list = f.options.map((o) => [o[0], o[1]]);
    return `<div class="field choice${f.pics || f.stack ? ' wide' : ''}" data-key="${f.key}"${f.after ? ' hidden' : ''}><span class="what">${f.what}</span>${radios(f, list)}${fb}</div>`;
  }
  function valueOf(f) {
    if (f.type === 'rank') return Questions.state(f);
    if (f.type === 'num') return $(`#in-${f.key}`).value;
    const r = document.querySelector(`input[name="in-${f.key}"]:checked`);
    return r ? r.value : null;
  }
  function setValue(f, val) {
    if (val == null) return;
    if (f.type === 'rank') Questions.setState(f, val);
    else if (f.type === 'num') $(`#in-${f.key}`).value = val;
    else { const r = document.querySelector(`input[name="in-${f.key}"][value="${val}"]`); if (r) r.checked = true; }
  }
  const empty = (f, val) => (f.type === 'num' ? !String(val).trim() : f.type === 'rank' ? val.includes(null) : val == null);
  // { cls, msg }; a ranking's message may hold formulas (html), and it marks its cards
  function judge(f, val) {
    if (f.type === 'num') return judgeNum(parse(val), f);
    if (f.type === 'rank') { const r = f.judge(val); return { cls: r.ok ? 'ok' : 'bad', msg: r.msg, html: true, ok: r.ok ? val.map((v, i) => i) : [], bad: r.bad }; }
    if (val === f.value) return { cls: 'ok', msg: ui().correct };
    const o = (f.options || []).find((x) => x[0] === val);
    return { cls: 'bad', msg: (o && (o[4] || o[2])) || ui().wrong };
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
    $('#prompt').innerHTML = ex.text + (ex.fields.some((f) => f.sci) ? `<p class="note">${ui().sci}</p>` : '');
    $('#figure').innerHTML = ex.figure({ task: true });
    $('#fields').innerHTML = ex.fields.map(fieldHtml).join('');
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

  // A field with `after` is shown once the field it follows is right (st.open: those shown).
  const shown = (f) => !f.after || st.open.includes(f.key);
  function showOpen() { ex.fields.forEach((f) => { const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`); if (row) row.hidden = !shown(f); }); }

  // Marks every field shown; true if all are right, null if some are empty, 'next' if a hidden
  // field opens now.
  function feedback() {
    let allOk = true, anyEmpty = false;
    ex.fields.filter(shown).forEach((f) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`), base = row.className.replace(/ (ok|warn|bad)\b/g, ''), val = valueOf(f);
      if (f.type === 'rank') Questions.mark(f);
      if (empty(f, val)) { anyEmpty = true; allOk = false; row.className = base; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(f, val);
      row.className = `${base} ${r.cls}`;
      if (r.html) { row.querySelector('.fb').innerHTML = r.msg; math(row.querySelector('.fb')); } else row.querySelector('.fb').textContent = r.msg;
      if (f.type === 'rank') Questions.mark(f, r.ok, r.bad);
      if (r.cls !== 'ok') allOk = false;
    });
    if (allOk) {
      const opens = ex.fields.filter((f) => !shown(f) && ex.fields.some((g) => g.key === f.after));
      if (opens.length) { opens.forEach((f) => st.open.push(f.key)); showOpen(); return 'next'; }
    }
    return allOk ? true : anyEmpty ? null : false;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    st.status = kind;
    el.className = 'status' + (kind === 'ok' || kind === 'next' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? ui().fill : kind === 'next' ? ui().next
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (st.tries < MAX_TRIES && !canReveal() ? ui().tryAgain : ui().canReveal);
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    if (r === 'next') { showStatus('next'); const row = $('#fields').querySelector('.field:not([hidden]):last-child'); if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    st.tries++;
    if (r) {
      if (!st.solved && !st.revealed) {
        const s = stored('emw-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('emw-score', s);
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
    ex.fields.forEach((f) => { if (f.after && !st.open.includes(f.key)) st.open.push(f.key); });
    showOpen();
    finish();
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- language
  const lessons = () => EXAMPLES.map((e, i) => ({
    name: e.name(), idea: e.idea(), also: topics.also(topicOf(i).t), frames: () => tutorial(e).frames,
  }));

  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
  }

  // The same exercise (same seed) in the other language, with the answers, hints and solution kept.
  function switchLang() {
    applyStatic();
    showScore();
    if (ex) {
      const values = ex.fields.map(valueOf), keep = { ...st };
      ex = again(ex) || ex;
      render();
      st = keep;
      ex.fields.forEach((f, k) => setValue(f, values[k]));
      showOpen();
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
  // Practice: exercises by topic; tutor: worked examples; check: a short test on the learning
  // objectives (check.js, check-src.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('emw-mode', m);
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
      make: (type, seed) => practiceOf(type, seed, { drag: true }), typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    applyStatic();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    // when every field shown is a choice (yes or no, which graph, …), a click checks at once
    // a ranking (questions.js) is checked with the button: a moved card only clears its marks
    Questions.attach($('#fields'));
    $('#answers').addEventListener('change', (e) => {
      if (e.target.classList.contains('chip')) { Questions.clearAt(e.target); return; }
      if (e.target.type !== 'radio' || st.solved || !ex.fields.filter(shown).every((f) => f.type !== 'num')) return;
      check({ preventDefault() {} });
    });
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { math($('#tutor')); markScrollable(); },
      done: practise,
      practise: (i) => { const { t, s } = topicOf(i); topics.go(t, s); setMode('practice'); fresh(); },
      t: () => ui().tutorBtns,
    });
    checker = Check.create(window.CheckSource, {
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
    const last = stored('emw-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
