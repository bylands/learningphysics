(function () {
  'use strict';

  const { generate, KINDS } = window.Motion;
  const Concepts = window.Concepts, Quiz = window.Quiz, { dec } = window.Figs;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Motion Data', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: 'The solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      stars: (d) => `Difficulty: ${d} of 5`,
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      canReveal: ' You can take a hint or look at the solution.',
      choose: 'Answer every question, then check again.',
      qOk: 'All answers are correct, well done!',
      qSome: (r, n, k) => `${r} of ${n} answers are correct (attempt ${k}).`,
      qTry: ' Correct the answers marked ✗ and check again, or take a hint.',
      qShown: 'The worked solution is shown below.',
      answers: 'Answers', wrongs: 'Typical wrong answers',
    },
    de: {
      title: 'Bewegungsdaten', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: 'Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.',
      choose: 'Beantworte jede Frage und prüfe dann nochmals.',
      qOk: 'Alle Antworten sind richtig, gut gemacht!',
      qSome: (r, n, k) => `${r} von ${n} Antworten sind richtig (Versuch ${k}).`,
      qTry: ' Korrigiere die mit ✗ markierten Antworten und prüfe nochmals, oder nimm einen Tipp.',
      qShown: 'Die ausführliche Lösung steht unten.',
      answers: 'Antworten', wrongs: 'Typische falsche Antworten',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, tutor = null, checker = null, topics = null;
  // tries, hints used, solved, revealed, checked: the answers of the last check
  let st = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('md-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  const r2 = (x) => Math.round(x * 100) / 100 + 0;
  const fmt = (x) => (r2(x) < 0 ? '−' + dec(-r2(x)) : dec(r2(x)));
  const figOf = (f) => `<div class="figs">${f.startsWith('<div') ? f : `<figure class="fig">${f}</figure>`}</div>`;
  // the worked steps of an exercise, then the answers
  const stepsHtml = (e) => e.steps.map((x) => `<p class="step-rule">${x.title}</p>${figOf(x.figure)}<p>${x.text}</p>`).join('') +
    `<ul class="short">${e.questions.map((q, k) => `<li><span class="qn">${k + 1}</span>${e.answers[k]}</li>`).join('')}</ul>`;
  const solution = () => `<div class="steps">${stepsHtml(ex)}</div>`;
  // the fields in a table for the values on the way are not checked: Enter there does not check
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' && evt.target.matches && evt.target.matches('input.scratch')) { evt.preventDefault(); evt.stopPropagation(); }
  }, true);

  // ---------------------------------------------------------------- rendering
  // The exercises of concepts.js are answered by choosing and entering numbers (quiz.js).
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;

  // The exercise as it stands (st); saved: the answers to keep, by question key.
  function render(saved) {
    $('#title').innerHTML = `${ex.title} ${starsOf(ex.difficulty)}`;
    $('#statement').innerHTML = ex.text;
    $('#q-figure').innerHTML = ex.figure.startsWith('<div') ? ex.figure : `<figure class="fig">${ex.figure}</figure>`;
    $('#q-fields').innerHTML = ex.questions.map((q, k) => Quiz.html(q, k)).join('');
    if (saved) ex.questions.forEach((q) => { if (q.key in saved) Quiz.setState(q, saved[q.key]); });
    showHints();
    showFeedback();
    $('#solution').hidden = !st.revealed;
    $('#sol-text').innerHTML = st.revealed ? solution() : '';
    updateButtons();
  }
  const quizAnswers = () => Object.fromEntries(ex.questions.map((q) => [q.key, Quiz.state(q)]));

  // The marks of the last check, on the questions whose answers have not changed since.
  function showFeedback() {
    const status = $('#status');
    status.className = 'status';
    status.textContent = '';
    const now = quizAnswers();
    ex.questions.forEach((q) => {
      const then = st.checked && st.checked[q.key];
      const same = st.checked && JSON.stringify(then) === JSON.stringify(now[q.key]);
      Quiz.paint(q, same ? Quiz.evaluate(q, then) : null, now[q.key], !st.solved && !st.revealed);
    });
    if (st.revealed && !st.solved) { status.textContent = ui().qShown; return; }
    if (!st.checked) return;
    const evs = ex.questions.map((q) => Quiz.evaluate(q, st.checked[q.key]));
    if (evs.some((e) => !e.complete)) { status.textContent = ui().choose; return; }
    const right = evs.filter((e) => e.ok).length;
    if (right === evs.length) { status.textContent = ui().qOk + (st.advance ? ` ${st.advance}` : ''); status.className = 'status ok'; return; }
    status.textContent = ui().qSome(right, evs.length, st.tries) + (canReveal() ? ui().canReveal : ui().qTry);
    status.className = 'status bad';
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // solved now, or solved before (its solution can be looked at again)
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.hints >= ex.hints.length || st.tries >= MAX_TRIES;

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'md', typeOf = (e) => e.kind;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: null };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
  }

  // A new exercise of the topic and stage chosen (topics.js), of another type than the current one if possible.
  function fresh() { open(topics.next(ex)); }
  // an exercise of a practice type: a kind of question with its difficulty (table:3)
  const ofType = (type, seed) => { const [k, d] = type.split(':'); return KINDS[k].make(seed, Number(d)); };

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
    const cb = $('#check');
    cb.textContent = st.solved ? ui().new : ui().check;
    cb.classList.toggle('primary', !st.solved);
    cb.classList.toggle('new-btn', st.solved);
    cb.disabled = st.revealed && !st.solved;
  }

  function check() {
    if (st.solved) { fresh(); return; } // the button reads New exercise
    const ans = quizAnswers(), evs = ex.questions.map((q) => Quiz.evaluate(q, ans[q.key]));
    st.checked = ans;
    if (evs.every((e) => e.complete)) {
      st.tries++;
      if (evs.every((e) => e.ok)) {
        if (!st.revealed) {
          const s = stored('md-score', { solved: 0, clean: 0 });
          s.solved++;
          if (st.tries === 1 && st.hints === 0) s.clean++;
          store('md-score', s);
          showScore();
        }
        st.solved = true;
        Practice.markSolved(PRACTICE, ex.id);
        st.advance = topics.solved(st, ex);
        finish();
      }
    }
    showFeedback();
    updateButtons();
  }

  function showHints() {
    $('#hint-list').innerHTML = ex.hints.slice(0, st.hints).map((h) => `<li>${h}</li>`).join('');
    $('#hints').hidden = !st.hints;
  }
  function hint() {
    if (st.hints >= ex.hints.length) return;
    st.hints++;
    showHints();
    updateButtons();
    $('#hint-list').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    finish();
    $('#sol-text').innerHTML = solution();
    $('#solution').hidden = false;
    showFeedback();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- tutor
  // Worked examples: the task, its worked steps, then the answers with the typical wrong ones and
  // the misconception behind each.
  const LESSONS = [
    { name: () => L('Value table', 'Wertetabelle'), kind: 'table', d: 3, seed: 1,
      practice: [{ types: ['table:3'] }, { name: () => L('table and graph', 'Tabelle und Graph'), types: ['tablegraph:2', 'tablegraph:3'] }],
      idea: () => L('A position is where a body is at an instant; a change of position Δs belongs to a time interval Δt. The velocity is Δs/Δt, not s/t, and a missing position is a known one plus v · Δt.',
        'Ein Ort ist, wo ein Körper zu einem Zeitpunkt ist; eine Ortsänderung Δs gehört zu einem Zeitintervall Δt. Die Geschwindigkeit ist Δs/Δt, nicht s/t, und ein fehlender Ort ist ein bekannter plus v · Δt.') },
    { name: () => L('Accelerated table', 'Tabelle mit Beschleunigung'), kind: 'atable', d: 3, seed: 1,
      practice: [{ types: ['atable:3'] }, { name: () => L('values to fill in', 'Werte ergänzen'), types: ['atable:4'] }, { name: () => L('table and graph', 'Tabelle und Graph'), types: ['atablegraph:3', 'atablegraph:4'] }],
      idea: () => L('In equal time steps, a uniform motion has equal changes of position Δs. With constant acceleration, the Δs change by the same amount Δ(Δs) from step to step; continuing this pattern fills the gaps in the table, and Δ(Δs) = a · (Δt)² gives the acceleration.',
        'In gleichen Zeitschritten hat eine gleichförmige Bewegung gleiche Ortsänderungen Δs. Bei konstanter Beschleunigung ändern sich die Δs von Schritt zu Schritt um gleich viel, Δ(Δs); setzt man dieses Muster fort, füllen sich die Lücken der Tabelle, und Δ(Δs) = a · (Δt)² ergibt die Beschleunigung.') },
    { name: () => L('Stroboscope', 'Stroboskop'), kind: 'strobe', d: 3, seed: 1,
      practice: [{ types: ['strobe:2', 'strobe:3'] }, { name: () => L('picture and graph', 'Bild und Graph'), types: ['strobegraph:2', 'strobegraph:3'] }],
      idea: () => L('A stroboscope picture is a value table drawn on the line of motion: one dot per second. Equal distances mean a uniform motion; with constant acceleration they change by the same amount each second, and each distance corresponds to the mean velocity in that second.',
        'Eine Stroboskopaufnahme ist eine Wertetabelle, auf der Bewegungslinie gezeichnet: ein Punkt pro Sekunde. Gleiche Abstände bedeuten eine gleichförmige Bewegung; bei konstanter Beschleunigung ändern sie sich jede Sekunde um gleich viel, und jeder Abstand entspricht der mittleren Geschwindigkeit in dieser Sekunde.') },
  ];
  function lesson(def) {
    const e = KINDS[def.kind].make(def.seed, def.d);
    // a choice of graphs shows its graphs with the question
    const pics = (q) => (q.pics ? `<div class="qopts pics tq-pics">${q.options.map((o) => `<div class="qopt"><span class="qval">${o.html}</span></div>`).join('')}</div>` : '');
    const task = { text: `<p class="step-rule">${L('The task', 'Die Aufgabe')}</p>${e.text}<ol class="tq">${e.questions.map((q) => `<li>${q.prompt}${pics(q)}</li>`).join('')}</ol>`, figure: figOf(e.figure) };
    const steps = e.steps.map((x) => ({ text: `<p class="step-rule">${x.title}</p><p>${x.text}</p>`, figure: figOf(x.figure) }));
    const wrongs = (q) => (q.type === 'num' ? q.traps.map((t) => ({ html: `${fmt(t.value)} ${q.unit}`, flag: t.flag, why: t.why })) : q.options.filter((o) => !o.correct))
      .filter((o) => o.flag).map((o) => `<li>${o.html.startsWith('<svg') ? '' : `<i>${o.html}</i> `}<span class="tag">${Concepts.FLAGS[o.flag]()}</span><br>${o.why}</li>`).join('');
    const answers = e.questions.map((q, k) => `<p><span class="qn">${k + 1}</span>${q.prompt} <b>${e.answers[k]}</b></p>` +
      (wrongs(q) ? `<details><summary>${ui().wrongs}</summary><ul class="wrong">${wrongs(q)}</ul></details>` : '')).join('');
    return [task, ...steps, { text: `<p class="step-rule">${ui().answers}</p>${answers}`, figure: steps[steps.length - 1].figure }];
  }
  const lessons = () => LESSONS.map((l, i) => ({ name: l.name(), idea: l.idea(), also: topics.also(i), frames: () => lesson(l) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the kinds of question it is asked with, its
  // worked example and its practice topic. A kind is an exercise type of concepts.js with its
  // difficulty, and (kind:d:key) the question of it to ask; else one of its questions is picked,
  // with four options.
  const OBJECTIVES = [
    { id: 'instant', kinds: ['table:3', 'atable:4:vm'], tutor: 0, topic: 0,
      name: () => L('Tell a position from a change of position, and an instant from a time interval, when reading a value table.',
        'Einen Ort von einer Ortsänderung und einen Zeitpunkt von einem Zeitintervall unterscheiden, wenn du eine Wertetabelle liest.') },
    { id: 'convert', kinds: ['tablegraph:2', 'strobegraph:2'], tutor: 2, topic: 2,
      name: () => L('Turn a value table or a stroboscope picture into the s(t) graph of the motion.',
        'Eine Wertetabelle oder eine Stroboskopaufnahme in den s(t)-Graphen der Bewegung umsetzen.') },
    { id: 'uniform', kinds: ['strobe:2:how', 'atable:3:a', 'atablegraph:3'], tutor: 1, topic: 1,
      name: () => L('Decide from the changes of position in equal time steps whether a motion is uniform or uniformly accelerated.',
        'An den Ortsänderungen in gleichen Zeitschritten entscheiden, ob eine Bewegung gleichförmig oder gleichmässig beschleunigt ist.') },
  ];
  function checkQuestion(kind, seed) {
    const [k, d, key] = kind.split(':');
    const e = KINDS[k].make(seed, Number(d)), a = Concepts.question(e, seed, key);
    return {
      title: e.title, text: e.situation || e.text, figure: e.figure.startsWith('<div') ? e.figure : `<figure class="fig">${e.figure}</figure>`, ask: a.ask,
      options: a.options.map((o) => ({ html: o.html, correct: o.correct, flag: o.correct ? null : o.flag, why: o.correct ? '' : o.why })),
      explain: () => `<div class="steps">${stepsHtml(e)}</div>`,
    };
  }
  const IDEAS = ['negpos', 'nodt', 'origin', 'sign', 'gaps', 'order', 'linear', 'steps', 'skip'];
  const checkSource = {
    id: 'md',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: Object.fromEntries(IDEAS.map((f) => [f, f])),
    concepts: () => Object.fromEntries(IDEAS.map((f) => [f, Concepts.FLAGS[f]()])),
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
      const keep = quizAnswers(), id = ex.id, m = /^([a-z]+)-(\d+)$/.exec(id);
      const scratch = [...document.querySelectorAll('#q-figure input.scratch')].map((i) => i.value);
      ex = topics.parse(id) || generate(m[1], Number(m[2]));
      ex.id = id;
      render(keep);
      document.querySelectorAll('#q-figure input.scratch').forEach((i, k) => { i.value = scratch[k] || ''; });
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
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
    store('md-mode', m);
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
    if (h === 'check') { if ($('#ck').hidden) checkMode(); return true; }
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
    // an exercise of a kind, any difficulty
    m = h.match(/^([a-z]+)-(\d+)$/);
    if (!m || !KINDS[m[1]]) return false;
    setMode('practice');
    if (!ex || ex.id !== h) open(generate(m[1], Number(m[2])));
    return true;
  }

  // ---------------------------------------------------------------- init
  function init() {
    Lang.init(); // see lang.js
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    applyStatic();
    Lang.wire(switchLang);
    topics = window.Topics.create({
      app: PRACTICE,
      topics: LESSONS.map((l) => ({ name: l.name, stages: l.practice.map((s) => ({ name: s.name || null, types: s.types })) })),
      make: ofType, typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    $('#new').addEventListener('click', fresh);
    $('#q-fields').addEventListener('input', () => { if (st && !st.solved) showFeedback(); });
    $('#q-fields').addEventListener('change', () => { if (st && !st.solved) showFeedback(); });
    $('#check').addEventListener('click', check);
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    tutor = window.createTutor(lessons(), { done: practise, practise: (i) => { topics.go(i); setMode('practice'); fresh(); } });
    checker = Check.create(checkSource, {
      math: () => {}, markScrollable: () => {}, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // First visit: start with the first worked example.
    const last = stored('md-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
