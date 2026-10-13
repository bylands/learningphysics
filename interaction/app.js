(function () {
  'use strict';

  const FC = window.FC, Q = window.Questions, Lang = window.Lang, Check = window.Check;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Interaction', mode: 'Mode', difficulty: 'Difficulty', example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard', mixed: 'Mixed' },
      stars: (d) => `Difficulty: ${d} of 5`,
      tutorNote: 'Use the arrow keys ← → to step through. Arrows in the pictures: <span class="k-f">forces</span>, <span class="k-v">velocities</span>, <span class="k-a">accelerations</span> and the <span class="k-net">net force</span>.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', reset: 'Reset', close: 'Close',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      profile: 'Your typical slips', correct: 'Correct:', wrongIdea: 'Wrong idea:', notThis: 'Not this one: check your reasoning, or take a hint.', tfWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`),
      profileEmpty: 'Nothing recorded yet. Wrong answers that stem from a misconception, and exercise types you find hard, will show up here.',
      profileNote: 'How often each misconception was behind one of your wrong answers, and what is correct instead. The exercises are written in the spirit of the Force Concept Inventory; they are not its items.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      choose: 'Answer every question (every statement, item and reason), then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your reasoning with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Read the feedback and try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      task: 'The task', answers: 'The answers', wrong: 'Typical wrong answers',
      profileTypes: 'Coming up more often',
      profileTypesNote: 'Exercise types you found hard come up more often in practice, until you solve them easily.',
      often: (w) => `about ${Math.round(w * 10) / 10}× as often as a mastered type`,
    },
    de: {
      title: 'Wechselwirkung', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      levels: { easy: 'Einfach', medium: 'Mittel', hard: 'Schwierig', mixed: 'Gemischt' },
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Pfeile in den Bildern: <span class="k-f">Kräfte</span>, <span class="k-v">Geschwindigkeiten</span>, <span class="k-a">Beschleunigungen</span> und die <span class="k-net">resultierende Kraft</span>.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', reset: 'Zurücksetzen', close: 'Schliessen',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      profile: 'Deine typischen Fehler', correct: 'Richtig:', wrongIdea: 'Falsche Vorstellung:', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Hinweis.', tfWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`),
      profileEmpty: 'Noch nichts erfasst. Falsche Antworten, hinter denen eine Fehlvorstellung steckt, und Aufgabentypen, die dir schwerfallen, erscheinen hier.',
      profileNote: 'Wie oft jede Fehlvorstellung hinter einer deiner falschen Antworten steckte, und was stattdessen richtig ist. Die Aufgaben sind im Sinne des Force Concept Inventory geschrieben; sie stammen nicht daraus.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      choose: 'Beantworte jede Frage (jede Aussage, jedes Element und die Begründung) und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deine Überlegungen mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Lies die Rückmeldungen und versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      task: 'Die Aufgabe', answers: 'Die Antworten', wrong: 'Typische falsche Antworten',
      profileTypes: 'Kommt häufiger dran',
      profileTypesNote: 'Aufgabentypen, die dir schwergefallen sind, kommen beim Üben häufiger, bis du sie mühelos löst.',
      often: (w) => `etwa ${String(Math.round(w * 10) / 10)}-mal so oft wie ein beherrschter Typ`,
    },
  };
  const ui = () => UI[FC.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('ia-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  // How often each misconception showed up in wrong answers (once per option and exercise).
  function showProfile() {
    const tally = stored('ia-mis', {});
    const rows = Object.entries(tally).filter(([c]) => FC.MIS[c]).sort((a, b) => b[1] - a[1]);
    // the types that come up more often, because they were hard
    const hard = Object.entries(stored('ia-types', {})).filter(([g, x]) => x.s >= 0.4 && FC.TYPE_NAMES[g]).sort((a, b) => b[1].s - a[1].s);
    const slips = rows.reduce((n, [, k]) => n + k, 0);
    $('#profile-empty').hidden = rows.length > 0 || hard.length > 0;
    $('#profile-btn-label').textContent = ui().profile;
    $('#profile-badge').textContent = slips;
    $('#profile-badge').hidden = !slips;
    $('#profile-list').innerHTML = rows.map(([c, k]) =>
      `<li><span class="count">${k}×</span> <b>${FC.misLabel(c)}</b><span class="claim"><b>${ui().wrongIdea}</b> ${FC.mis(c).text}</span><span class="fix"><b>${ui().correct}</b> ${FC.mis(c).fix}</span></li>`).join('');
    $('#profile-mis').hidden = !rows.length;
    $('#profile-types').hidden = !hard.length;
    $('#profile-types-list').innerHTML = hard.map(([g, x]) => `<li><b>${FC.typeName(g)}</b> <span class="count">${ui().often(FC.weightOf(stored('ia-types', {}), g))}</span></li>`).join('');
  }

  // How the exercise went, for choosing the next ones: 0 right at once … 1 solution needed.
  function record(score) {
    if (!ex || st.recorded) return;
    st.recorded = true;
    store('ia-types', FC.recordResult(stored('ia-types', {}), ex.gen, score));
    showProfile();
  }
  const tag = Q.tag;

  // ---------------------------------------------------------------- rendering
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;

  function render() {
    $('#title').innerHTML = `${ex.title} ${starsOf(ex.difficulty)}`;
    $('#situation').innerHTML = ex.situation;
    $('#figure').innerHTML = ex.figure;
    $('#fields').innerHTML = ex.questions.map((qu, k) => Q.html(qu, k)).join('');
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus();
    updateButtons();
  }

  const stepHtml = (s) => `<h4>${s.title}</h4><div class="figs">${s.figure}</div><p>${s.text}</p>`;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ---------------------------------------------------------------- exercise lifecycle

  function open(exercise) {
    if (ex && st.tries > 0 && !st.recorded) record(0.75); // left unsolved after trying
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, counted: new Set(), status: null, checked: [] };
    // the types shown last, so that a new exercise is of a different type
    store('ia-recent', [...stored('ia-recent', []), ex.gen].slice(-10));
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
  }

  // A new exercise of the topic and stage chosen (topics.js); types that were hard come up more
  // often (ia-types, the same statistics as before).
  function fresh() { open(topics.next(ex)); }
  // The topics of practice: those of the tutor's examples; a stage is named after its types.
  const topicList = () => window.Lessons.EXAMPLES.map((e) => ({
    name: () => e.name[FC.getLang()],
    stages: e.practice.map((st, i) => ({ name: i ? () => [...new Set(st.types.map((t) => FC.typeName(t.split('/')[1])))].join(', ') : null, types: st.types })),
  }));
  // the same exercise again (e.g. in the other language)
  const again = (e) => topics.parse(e.id);

  // solved now, or solved before (its solution can be looked at again)
  const canReveal = () => st.solved || Practice.solvedBefore('ia', ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;

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
  }

  // The status line, kept as a state so that it can be rewritten in the other language.
  function showStatus() {
    const s = $('#status'), k = st && st.status;
    s.textContent = !k ? '' : k === 'choose' ? ui().choose : k === 'ok' ? (st.okPlain ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
      : ui().notYet(st.tries) + (canReveal() ? ui().canReveal : ui().tryAgain);
    s.className = `status${k === 'ok' ? ' ok' : k === 'bad' ? ' bad' : ''}`;
  }

  // Marks the checked answers right or wrong, with the explanations; a question whose answer
  // changed since the last check stays unmarked.
  // While the exercise is open, a wrong answer gets a nudge, not the solution: sentences of the
  // worked solution are taken out of its remark (the name of the misconception stays), and the
  // single statements of a true-or-false question are not marked.
  function soften(qu, ev) {
    if (st.solved || st.revealed) return ev;
    const steps = ex.steps.map((x) => String(x.text || ''));
    const nudge = (fb) => {
      let t = String(fb || '');
      for (const s of steps) for (const x of s.split(/(?<=[.!?])\s+/)) if (x.length > 12) t = t.split(x).join('');
      t = t.replace(/\s+/g, ' ').trim();
      return t.replace(/<span class="tag"[\s\S]*$/, '').trim() ? t : `${ui().notThis}${t ? ` ${t}` : ''}`;
    };
    if (qu.type === 'tf') {
      const wrong = ev.marks.filter((m) => typeof m.where === 'number' && !m.ok).length;
      const marks = ev.marks.filter((m) => typeof m.where !== 'number');
      if (wrong) marks.push({ where: 'q', ok: false, fb: ui().tfWrong(wrong) });
      return { ...ev, marks };
    }
    return { ...ev, marks: ev.marks.map((m) => (m.ok ? m : { ...m, fb: nudge(m.fb) })) };
  }
  function showFeedback() {
    ex.questions.forEach((qu, k) => {
      const now = Q.state(qu);
      if (st.checked[k] !== undefined && same(now, st.checked[k])) Q.paint(qu, soften(qu, Q.evaluate(qu, now))); else Q.clear(qu);
    });
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    const states = ex.questions.map(Q.state), evs = ex.questions.map((qu, k) => Q.evaluate(qu, states[k]));
    const allOk = evs.every((e) => e.ok), anyEmpty = evs.some((e) => !e.complete);
    const tally = stored('ia-mis', {});
    ex.questions.forEach((qu, k) => {
      for (const m of evs[k].misses) {
        const key = `${qu.key}|${m.id}`;
        if (st.counted.has(key) || st.revealed) continue;
        st.counted.add(key);
        tally[m.code] = (tally[m.code] || 0) + 1;
      }
    });
    store('ia-mis', tally);
    st.checked = states;
    showFeedback();
    showProfile();
    if (anyEmpty && !allOk) {
      st.status = 'choose';
      showStatus();
      return;
    }
    st.tries++;
    if (allOk) {
      if (!st.solved && !st.revealed) {
        const s = stored('ia-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('ia-score', s);
        showScore();
      }
      st.okPlain = st.revealed;
      if (!st.revealed) record(Math.min(1, 0.3 * (st.tries - 1) + 0.2 * st.hints));
      st.solved = true;
      Practice.markSolved('ia', ex.id);
      st.advance = topics.solved(st, ex);
      st.status = 'ok';
    } else st.status = 'bad';
    showStatus();
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

  function showSolution() {
    $('#sol-steps').innerHTML = ex.steps.map(stepHtml).join('');
    $('#sol-short').innerHTML = ex.questions.map((qu, k) => `<li><span class="qn">${k + 1}</span>${FC.answerText(qu)}</li>`).join('');
    $('#solution').hidden = false;
  }
  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    if (!st.solved) record(1);
    if (st.checked) showFeedback(); // now with the full remarks
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- tutor
  // Frames: the task, the steps of the worked solution, then the answers and the typical wrong
  // answers with the misconception behind each.
  function lesson(def) {
    const lang = FC.getLang();
    return {
      name: def.name[lang],
      idea: def.idea[lang],
      frames: () => {
        const e = FC.build(def.gen, def.params);
        // The questions as in practice, but read-only; single-choice ones without pictures as a list
        // of prompts (a choice of graphs or diagrams shows its options).
        const simple = e.questions.every((qu) => qu.type === 'choice' && !qu.pics);
        const task = {
          text: `<div class="step-rule">${ui().task}</div>${e.situation}` + (simple
            ? `<ol class="tq">${e.questions.map((qu) => `<li>${qu.prompt}</li>`).join('')}</ol>`
            : `<div class="preview">${e.questions.map((qu, k) => Q.html(qu, k, true)).join('')}</div>`),
          figure: `<div class="fig">${e.figure}</div>`,
        };
        const steps = e.steps.map((s) => ({ text: `<div class="step-rule">${s.title}</div><p>${s.text}</p>`, figure: `<div class="fig">${s.figure}</div>` }));
        const answers = e.questions.map((qu, k) => {
          const [lq, rq] = lang === 'de' ? ['„', '“'] : ['“', '”'];
          const wrong = FC.misreads(qu).map((x) => `<li><i>${lq}${x.text}${rq}</i>${tag(x.code)}<br>${x.why}</li>`).join('');
          const answer = FC.answerText(qu);
          return `<p><span class="qn">${k + 1}</span>${qu.prompt} ${qu.type === 'tf' ? `<br>${answer}` : `<b>${answer}</b>`}</p><details><summary>${ui().wrong}</summary><ul class="wrong">${wrong}</ul></details>`;
        }).join('');
        const last = { text: `<div class="step-rule">${ui().answers}</div>${answers}`, figure: steps[steps.length - 1].figure };
        return [task, ...steps, last];
      },
    };
  }
  const lessons = () => window.Lessons.EXAMPLES.map((d, i) => ({ ...lesson(d), also: topics.also(i) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (lessons.js), each with its question kinds, worked example and
  // practice topic. A question of a kind is one of the questions of an exercise asked with four
  // options (core.js); the misconception codes of the wrong options are the check's
  // misconceptions, and the exercise's worked solution explains it.
  function checkQuestion(kind, seed) {
    const c = FC.checkQuestion(kind, seed), e = c.ex;
    return {
      title: e.title,
      text: e.situation,
      figure: `<figure class="fig">${e.figure}</figure>`,
      ask: c.ask,
      options: c.options.map((x) => ({ html: x.html, correct: x.ok, flag: FC.MIS[x.code] ? x.code : null, why: x.why })),
      explain: () => `<div class="steps">${e.steps.map(stepHtml).join('')}</div>`,
    };
  }
  const checkSource = {
    id: 'ia',
    objectives: window.Lessons.OBJECTIVES.map((o) => ({ ...o, name: () => o.name[FC.getLang()] })),
    question: checkQuestion,
    concept: Object.fromEntries(Object.keys(FC.MIS).map((c) => [c, c])),
    concepts: () => Object.fromEntries(Object.keys(FC.MIS).map((c) => [c, FC.getLang() === 'de' ? `„${FC.mis(c).name}“` : `“${FC.mis(c).name}”`])),
  };

  // ---------------------------------------------------------------- language
  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
  }

  // Same exercise (same seed) in the other language: the options keep their order, so the
  // chosen answers, feedback, hints and solution carry over.
  function switchLang() {
    applyStatic();
    showScore();
    showProfile();
    if (ex) {
      const states = ex.questions.map(Q.state);
      ex = again(ex);
      const keep = { ...st };
      render();
      st = keep;
      ex.questions.forEach((qu, k) => Q.setState(qu, states[k]));
      showFeedback();
      showStatus();
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
  // objectives (check.js). Hints, solution and profile belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('ia-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
    if (m !== 'practice' && $('#profile').open) $('#profile').close();
    showProfile();
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
    applyStatic();
    Lang.wire(switchLang);
    topics = window.Topics.create({
      app: 'ia', topics: topicList(),
      make: (type, seed) => FC.generateGen(type, seed), typeOf: (e) => e.gen,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    // A new answer clears the marks on that part of the question.
    $('#fields').addEventListener('change', (evt) => Q.clearAt(evt.target));
    Q.attach($('#fields'));
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    $('#reset-profile').addEventListener('click', () => { store('ia-mis', {}); store('ia-types', {}); showProfile(); });
    // The “typical slips” overlay: closes with ×, Escape or a click on the backdrop.
    const profile = $('#profile');
    $('#profile-btn').addEventListener('click', () => { showProfile(); profile.showModal(); });
    $('#close-profile').addEventListener('click', () => profile.close());
    profile.addEventListener('click', (evt) => {
      if (evt.target !== profile) return;
      const r = profile.getBoundingClientRect();
      if (evt.clientX < r.left || evt.clientX > r.right || evt.clientY < r.top || evt.clientY > r.bottom) profile.close();
    });
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
    const last = stored('ia-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
