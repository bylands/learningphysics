(function () {
  'use strict';

  const Lang = window.Lang, Check = window.Check;
  const { practiceOf } = window.Caps;
  const { EXAMPLES, TOPICS } = window.Lessons;
  const { fitText } = window.Circuit;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // An exercise (generator.js) is { type, difficulty, title, text, fields, figure(), solutionFigure(),
  // hints, solution, results }: a number field has its value and traps (the answers under typical
  // wrong ideas), a choice field its right option; a choice of graphs (pics) shows them side by side.

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Capacitors and RC Circuits', mode: 'Mode', difficulty: 'Difficulty', example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      stars: (d) => `Difficulty: ${d} of 5`,
      tutorNote: 'Use the arrow keys ← → to step through. In the diagrams, the block a step is about is <span class="k-strong">shaded</span> and the capacitor just found is <span class="k-new">marked</span>.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every part, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', close: 'Close: read the graph more carefully, or check your rounding', wrong: 'Not correct', sign: 'Give the size (a positive number)',
      graph: (k) => `Graph ${k}`,
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Kondensatoren und RC-Kreise', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. In den Schaltungen ist der Block, um den es in einem Schritt geht, <span class="k-strong">hinterlegt</span>, und der eben gefundene Kondensator ist <span class="k-new">markiert</span>.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte alle Teile und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', close: 'Knapp daneben: Lies den Graphen genauer ab oder prüfe deine Rundung', wrong: 'Nicht richtig', sign: 'Gib den Betrag an (eine positive Zahl)',
      graph: (k) => `Graph ${k}`,
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[Lang.get()];
  const UNIT = { 'µF': 'µF', s: 's', ms: 'ms', V: 'V', mA: 'mA', 'kΩ': 'kΩ' };

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('cap-score', { solved: 0, clean: 0 });
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
    // circuit diagrams fit their labels to the rendered text
    el.querySelectorAll('svg.circuit').forEach((svg) => fitText(svg));
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

  // Right within the field's tolerance (a value read from a graph has a larger one); else the
  // answer under a typical wrong idea, a sign or a rounding error.
  function judgeNum(x, f) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.abs(z) + 1e-9;
    if (near(x, e, f.tol) || Math.abs(x - e) < 0.005) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, Math.max(f.tol, 0.01))) return { cls: 'bad', msg: t.why || ui().wrong };
    if (near(-x, e, f.tol)) return { cls: 'warn', msg: ui().sign };
    if (near(x, e, Math.max(0.05, 2 * f.tol))) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // The answer fields: a number (input in-key) or a choice (radio buttons named in-key).
  function fieldHtml(f) {
    const fb = '<span class="fb" aria-live="polite"></span>';
    if (f.type === 'num') {
      return `<div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym"><span class="what">${f.what}</span> $${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${UNIT[f.unit]}</span>${fb}</div>`;
    }
    // a choice (the explanation of a wrong one is no title: it would give the answer away)
    const opts = f.options.map((o, k) => `<label><input type="radio" name="in-${f.key}" value="${o.v}"><span${f.pics ? ` aria-label="${ui().graph(k + 1)}"` : ''}>${f.pics ? `<b class="num">${k + 1}</b>` : ''}${o.html}</span></label>`).join('');
    return `<div class="field choice${f.pics || f.stack ? ' wide' : ''}" data-key="${f.key}"><span class="what">${f.what}</span><span class="choices levels small${f.pics ? ' pics' : ''}${f.stack ? ' stack' : ''}" role="radiogroup">${opts}</span>${fb}</div>`;
  }
  function valueOf(f) {
    if (f.type === 'num') return $(`#in-${f.key}`).value;
    const r = document.querySelector(`input[name="in-${f.key}"]:checked`);
    return r ? r.value : null;
  }
  function setValue(f, val) {
    if (val == null) return;
    if (f.type === 'num') $(`#in-${f.key}`).value = val;
    else { const r = document.querySelector(`input[name="in-${f.key}"][value="${val}"]`); if (r) r.checked = true; }
  }
  const empty = (f, val) => (f.type === 'num' ? !String(val).trim() : val == null);
  function judge(f, val) {
    if (f.type === 'num') return judgeNum(parse(val), f);
    if (val === f.value) return { cls: 'ok', msg: ui().correct };
    const o = f.options.find((x) => x.v === val);
    return { cls: 'bad', msg: (o && o.why) || ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'cap', typeOf = (e) => e.type;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    const first = $('#fields input');
    if (first && first.type === 'text') first.focus({ preventScroll: true });
  }

  // A new exercise of the topic and stage chosen (topics.js), of another type than the current
  // one if possible.
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
    $('#figure').innerHTML = ex.figure();
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

  // Marks every field; true if all are right, null if some are empty.
  function feedback() {
    let allOk = true, anyEmpty = false;
    ex.fields.forEach((f) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`), base = row.className.replace(/ (ok|warn|bad)\b/g, ''), val = valueOf(f);
      if (empty(f, val)) { anyEmpty = true; allOk = false; row.className = base; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(f, val);
      row.className = `${base} ${r.cls}`;
      row.querySelector('.fb').innerHTML = r.msg;
      math(row.querySelector('.fb'));
      if (r.cls !== 'ok') allOk = false;
    });
    return allOk ? true : anyEmpty ? null : false;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? ui().fill
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
      if (!st.solved && !st.revealed) {
        const s = stored('cap-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('cap-score', s);
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
    finish();
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- language
  const lessons = () => EXAMPLES.map((e, i) => ({
    name: e.name(), idea: e.idea(), also: topics.also(topicOf(i).t), frames: () => e.frames(),
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
    store('cap-mode', m);
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
      app: PRACTICE, topics: topicList(),
      make: (type, seed) => practiceOf(type, seed), typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    applyStatic();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    // when every field is a choice (which graph, larger or smaller, …), a click checks at once
    $('#answers').addEventListener('change', (evt) => {
      if (evt.target.type !== 'radio' || st.solved || ex.fields.some((f) => f.type === 'num' || empty(f, valueOf(f)))) return;
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
    const last = stored('cap-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
