(function () {
  'use strict';

  const C = window.Cycles, D = window.Diagram, Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Cyclic Processes', mode: 'Mode', example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise', difficulty: 'Difficulty',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check again.', ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), next: 'Correct so far. Now the last question:', option: (k) => `Option ${k}`, place: (n) => `Click where state ${n} lies:`, placed: 'All states placed.', missed: 'This one is correct too.',
      tutorNote: 'Use the arrow keys ← → to step through.',
    },
    de: {
      title: 'Kreisprozesse', mode: 'Modus', example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe', difficulty: 'Schwierigkeit',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann nochmals.', ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Hinweis.', stmtsWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`), next: 'Bis hierher richtig. Jetzt noch die letzte Frage:', option: (k) => `Antwort ${k}`, place: (n) => `Klicke dorthin, wo der Zustand ${n} liegt:`, placed: 'Alle Zustände gesetzt.', missed: 'Auch diese ist richtig.',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter.',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('cyc-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
  const markScrollable = () => {};
  const math = () => {};
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;
  const TITLE = {
    match: () => L('Which diagram?', 'Welches Diagramm?'), close: () => L('Back to A', 'Zurück nach A'), statements: () => L('Which statements are correct?', 'Welche Aussagen sind richtig?'),
    switch: () => L('Another diagram', 'Ein anderes Diagramm'), lines: () => L('Which line is which?', 'Welche Linie ist welche?'), draw: () => L('Draw it', 'Zeichne ihn'),
    error: () => L('Find the error', 'Finde den Fehler'), table: () => L('The state table', 'Die Zustandstabelle'),
  };

  // ---------------------------------------------------------------- figures
  // the figure of an exercise: the diagram given (none for match, whose options are diagrams)
  function figureOf(e, solved) {
    if (e.kind === 'lines') return D.linesDiagram(e.diagram, e.lines);
    if (e.kind === 'match') return solved ? D.diagram({ cycle: e.cycle, diagram: e.diagram }) : '';
    if (e.kind === 'close') return D.diagram({ cycle: e.cycle, diagram: e.diagram, upTo: solved ? null : 3 });
    if (e.kind === 'switch') return D.diagram({ cycle: e.cycle, diagram: e.diagram }) + (solved ? D.diagram({ cycle: e.cycle, diagram: e.to }) : '');
    if (e.kind === 'error') return D.diagram({ cycle: e.cycle, diagram: e.diagram, straight: e.straight });
    if (e.kind === 'table') return tableHtml(e, solved);
    if (e.kind === 'draw') return D.diagram({ cycle: e.cycle, diagram: e.diagram, ax: e.ax, upTo: solved ? null : Math.max(0, st.placed - 1) }, { grid: true, placed: solved ? null : st.placed });
    return D.diagram({ cycle: e.cycle, diagram: e.diagram });
  }
  function tableHtml(e, solved) {
    const fmt = (v, i, k) => {
      if (e.rows[i][k] != null) return e.rows[i][k];
      const key = `${e.rows[i].name}${k}`, q = e.questions.find((x) => x.key === key);
      if (q && solved) return q.options.find((o) => o.ok).label.split(' ')[0];
      return q ? '<b>?</b>' : '–';
    };
    return `<table class="states"><thead><tr><th></th><th><i>p</i> in kPa</th><th><i>V</i> in L</th><th><i>T</i> in K</th></tr></thead><tbody>${e.rows.map((row, i) => `<tr><th>${row.name}</th>${['p', 'V', 'T'].map((k) => `<td>${fmt(row, i, k)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  // ---------------------------------------------------------------- questions
  // pick: diagrams as options; multi: statements to tick; choice: a row of options.
  function questionHtml(q) {
    if (q.type === 'pick') {
      return `<div class="cands" role="radiogroup">${q.options.map((o, k) => `<label class="cand" data-k="${k}"><input type="radio" name="q-${q.key}" value="${k}"><span class="letter">${k + 1}</span>${D.diagram(o.fig, { small: true, label: ui().option(k + 1) })}</label>`).join('')}</div><p class="qfb" data-fb="${q.key}"></p>`;
    }
    if (q.type === 'multi') {
      return `<ul class="stmts">${q.statements.map((s, k) => `<li data-k="${k}"><label><input type="checkbox" name="q-${q.key}" value="${k}"><span>${s.html}</span></label><span class="fb"></span></li>`).join('')}</ul><p class="fb stmts-fb" data-fb="${q.key}"></p>`;
    }
    return `<div class="field" data-key="${q.key}"${q.after ? ' hidden' : ''}><span class="what">${q.label}</span><div class="opts" role="radiogroup">${q.options.map((o, k) => `<label><input type="radio" name="q-${q.key}" value="${k}"><span>${o.label}</span></label>`).join('')}</div><span class="fb" aria-live="polite"></span></div>`;
  }
  // Marks every answer; true if all are right, null if one is missing.
  function feedback() {
    let all = true, missing = false;
    const done = st && (st.solved || st.revealed);
    // While the exercise is open, a wrong answer gets a nudge, not the solution: the steps of the
    // solution, whole or sentence by sentence, are taken out of its explanation.
    // n: the option's own nudge, where its reason would give the answer away
    const nudge = (w, n) => {
      if (done) return w;
      let t = n || w || '';
      for (const s of ex.solution) if (s) t = t.split(s).join('');
      for (const s of ex.solution) for (const x of String(s || '').split(/(?<=[.!?])\s+/)) if (x.length > 3) t = t.split(x).join('');
      t = t.replace(/\s+/g, ' ').trim();
      return t || ui().notThis;
    };
    for (const q of ex.questions) {
      if (q.type === 'multi') {
        let wrong = 0;
        q.statements.forEach((s, k) => {
          const li = $(`.stmts li[data-k="${k}"]`), on = li.querySelector('input').checked, good = on === s.ok;
          if (!good) { all = false; wrong++; }
          li.className = done || good ? (good ? (on ? 'ok' : '') : 'bad') : '';
          li.querySelector('.fb').innerHTML = done && !good ? (on ? s.why : `${ui().missed} ${s.why}`) : '';
        });
        $(`[data-fb="${q.key}"]`).innerHTML = !done && wrong ? ui().stmtsWrong(wrong) : '';
        continue;
      }
      if (q.after && $(`.field[data-key="${q.key}"]`).hidden) { all = false; missing = true; continue; }
      const sel = document.querySelector(`input[name="q-${q.key}"]:checked`);
      if (!sel) { all = false; missing = true; continue; }
      const o = q.options[Number(sel.value)];
      if (q.type === 'pick') {
        document.querySelectorAll('.cand').forEach((el) => el.classList.remove('ok', 'bad'));
        sel.closest('.cand').classList.add(o.ok ? 'ok' : 'bad');
        $(`[data-fb="${q.key}"]`).innerHTML = o.ok ? '' : nudge(o.why, o.nudge);
      } else {
        const row = $(`.field[data-key="${q.key}"]`);
        row.className = `field ${o.ok ? 'ok' : 'bad'}`;
        row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o.why, o.nudge);
      }
      if (!o.ok) all = false;
    }
    return all ? true : missing && !anyWrong() ? null : false;
  }
  const anyWrong = () => !!document.querySelector('.field.bad, .cand.bad, .stmts li.bad, .stmts-fb:not(:empty)');

  // ---------------------------------------------------------------- drawing
  // The states are placed one by one; a right click draws the step, a wrong one says why.
  function drawPrompt() {
    const steps = ex.steps, n = st.placed - 1;
    $('#draw-step').innerHTML = n < steps.length ? `${ui().place(C.nameOf(n + 1))} ${steps[n].html}` : ui().placed;
  }
  function onDrawClick(evt) {
    if (!ex || ex.kind !== 'draw' || st.placed > ex.steps.length || st.revealed) return;
    const svg = $('#figure svg.drawing');
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse()), hit = D.pointAt(ex.ax, q.x, q.y);
    if (!hit) return;
    const seg = ex.cycle.segs[st.placed - 1], a = ex.cycle.states[seg.from], b = ex.cycle.states[seg.to];
    const why = C.judgePoint(ex.diagram, seg, a, b, hit.x, hit.y);
    if (!why) {
      st.placed++;
      $('#draw-fb').textContent = '';
      if (st.placed > ex.steps.length) { st.placed = ex.cycle.states.length + 1; $('.field[data-key="back"]').hidden = false; }
    } else {
      st.tries++;
      $('#draw-fb').innerHTML = why;
      st.miss = hit;
    }
    drawFigure();
    updateButtons();
  }
  function drawFigure() {
    $('#figure').innerHTML = figureOf(ex, st.revealed || (ex.kind === 'draw' && st.placed > ex.cycle.states.length));
    if (ex.kind === 'draw') {
      drawPrompt();
      const svg = $('#figure svg.drawing');
      if (svg && st.miss && st.placed <= ex.steps.length) svg.insertAdjacentHTML('beforeend', `<path class="miss" d="M${st.miss.px - 5} ${st.miss.py - 5} l10 10 m0 -10 l-10 10"/>`);
    }
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'cyc', typeOf = (e) => e.type;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };
  const newSeed = () => 1 + Math.floor(Math.random() * 999999);

  function open(exercise) {
    finish();
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, status: null, placed: 1, miss: null };
    if (location.hash !== `#${ex.id}`) history.replaceState(null, '', `#${ex.id}`);
    render();
    topics.shown(ex);
  }
  const fresh = () => open(topics.next(ex));
  const again = (e) => topics.parse(e.id);

  function render() {
    $('#title').innerHTML = `${TITLE[ex.kind]()} ${starsOf(ex.difficulty)}`;
    $('#prompt').innerHTML = ex.text;
    drawFigure();
    $('#draw-area').hidden = ex.kind !== 'draw';
    $('#draw-fb').textContent = '';
    $('#fields').innerHTML = ex.questions.map(questionHtml).join('');
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    updateButtons();
  }

  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;
  function updateButtons() {
    const left = ex.hints.length - st.hints;
    $('#hint').disabled = left === 0 || st.revealed;
    $('#hint').textContent = left ? ui().hint(left) : ui().noHints;
    $('#reveal').disabled = !canReveal() || st.revealed;
    $('#reveal').title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
    // drawing: Check once the states are placed
    $('#check').hidden = ex.kind === 'draw' && !st.solved && st.placed <= ex.steps.length;
  }
  function showStatus(kind) {
    const el = $('#status');
    if (st) st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'next' ? ui().next : kind === 'fill' ? ui().fill
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (!canReveal() ? ui().tryAgain : ui().canReveal);
  }
  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; }
    const r = feedback();
    // a question held back (e.g. which of two isotherms is hotter, which tells their kind): shown
    // once all others are answered right; that step is no attempt
    const held = ex.kind !== 'draw' && ex.questions.find((q) => q.after && $(`.field[data-key="${q.key}"]`).hidden);
    if (held && r === null && !anyWrong() && ex.questions.every((q) => q === held || q.type !== 'choice' || document.querySelector(`input[name="q-${q.key}"]:checked`))) {
      unveil(held);
      showStatus('next');
      return;
    }
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) solved(); else showStatus('bad');
    updateButtons();
  }
  function unveil(q) {
    st.unveiled = q.key;
    showUnveiled();
    const row = $(`.field[data-key="${q.key}"]`);
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  // The held-back question replaces the ones already answered right, so it sits next to the figure;
  // once the exercise is solved, all of them are shown again.
  function showUnveiled() {
    for (const q of ex.questions) { const row = $(`.field[data-key="${q.key}"]`); if (row) row.hidden = !st.solved && q.key !== st.unveiled; }
  }

  function solved() {
    if (!st.revealed) {
      const s = stored('cyc-score', { solved: 0, clean: 0 });
      s.solved++;
      if (st.tries === 1 && st.hints === 0) s.clean++;
      store('cyc-score', s);
      showScore();
    }
    st.solved = true;
    if (st.unveiled) showUnveiled();
    Practice.markSolved(PRACTICE, ex.id);
    finish();
    st.advance = topics.solved(st, ex);
    showStatus('ok');
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
    $('#sol-figure').innerHTML = ex.kind === 'table' ? tableHtml(ex, true) : ex.kind === 'error' ? D.diagram({ cycle: rightOf(ex), diagram: ex.diagram }) : figureOf(ex, true);
    $('#sol-steps').innerHTML = ex.solution.map((s) => `<p>${s}</p>`).join('');
    $('#solution').hidden = false;
  }
  // the cycle as described, for the solution of "find the error"
  function rightOf(e) {
    const s = e.p.s, steps = [];
    for (let i = 0; i < s.length - 1; i++) steps.push({ type: C.classify(s[i], s[i + 1]), k: 1 });
    return { states: s, segs: [...steps.map((x, i) => ({ type: x.type, from: i, to: i + 1 })), { type: C.classify(s[s.length - 1], s[0]), from: s.length - 1, to: 0, closing: true }] };
  }
  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    finish();
    if (ex.kind === 'draw') { st.placed = ex.cycle.states.length + 1; drawFigure(); $('.field[data-key="back"]').hidden = false; }
    ex.questions.forEach((q) => { const row = $(`.field[data-key="${q.key}"]`); if (row) row.hidden = false; });
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- tutor
  // The worked examples, from the worksheet: the processes in the three diagrams, a description
  // drawn step by step, a diagram read, a cycle moved to other diagrams, and the state table.
  const st0 = (p, V) => ({ p, V });
  // the worksheet's p(V) cycle: isothermal expansion ×3, isochoric cooling to half the pressure,
  // isobaric compression to the starting volume; and its V(T) rectangle
  const WS1 = () => C.cycleOf(st0(6, 2), [{ type: 'isothermal', k: 3, say: 'V' }, { type: 'isochoric', k: 1 / 2, say: 'p' }, { type: 'isobaric', k: 1 / 3, say: 'V' }]);
  const RECT = () => C.cycleOf(st0(6, 2), [{ type: 'isothermal', k: 3, say: 'V' }, { type: 'isochoric', k: 1 / 3, say: 'T' }, { type: 'isothermal', k: 1 / 3, say: 'V' }]);
  const frame = (title, text, figure) => ({ text: `<div class="step-rule">${title}</div>${text}`, figure: `<div class="figs">${figure}</div>` });
  const ln = (type, c) => ({ type, c });

  const EXAMPLES = [
    {
      topic: 0, name: () => L('Processes in three diagrams', 'Prozesse in drei Diagrammen'),
      idea: () => L('pV ∝ T: two of p, V and T are enough to describe a state. Each process has its own shape in each diagram.', 'pV ∝ T: Zwei von p, V und T genügen, um einen Zustand zu beschreiben. Jeder Prozess hat in jedem Diagramm seine eigene Form.'),
      frames: () => [
        frame(L('States and processes', 'Zustände und Prozesse'), `<p>${L('A fixed amount of an ideal gas is in a state (p, V, T); the three are linked by pV ∝ T. So a state is a point in a diagram of two of them: p(V), p(T) or V(T). A process is a line from one state to the next.', 'Eine feste Menge eines idealen Gases ist in einem Zustand (p, V, T); die drei hängen über pV ∝ T zusammen. Ein Zustand ist deshalb ein Punkt in einem Diagramm von zweien davon: p(V), p(T) oder V(T). Ein Prozess ist eine Linie von einem Zustand zum nächsten.')}</p><p>${L('Isobaric: p constant. Isochoric: V constant. Isothermal: T constant.', 'Isobar: p konstant. Isochor: V konstant. Isotherm: T konstant.')}</p>`, D.linesDiagram('pV', [ln('isobaric', 5), ln('isochoric', 3), ln('isothermal', 8)])),
        ...['pV', 'pT', 'VT'].map((d) => frame(L(`The ${C.AXES[d][1]}(${C.AXES[d][0]}) diagram`, `Das ${C.AXES[d][1]}(${C.AXES[d][0]})-Diagramm`),
          `<p>${L(`Line 1 is an isobar: ${C.shape('isobaric', d)}. Line 2 is an isochore: ${C.shape('isochoric', d)}. Line 3 is an isotherm: ${C.shape('isothermal', d)}.`, `Linie 1 ist eine Isobare: ${C.shape('isobaric', d)}. Linie 2 ist eine Isochore: ${C.shape('isochoric', d)}. Linie 3 ist eine Isotherme: ${C.shape('isothermal', d)}.`)}</p>` +
          (d === 'pT' ? `<p>${L('Why through the origin? At constant V, p ∝ T: at T = 0 the pressure would vanish. The steeper the line, the smaller the volume.', 'Warum durch den Ursprung? Bei konstantem V ist p ∝ T: Bei T = 0 wäre der Druck null. Je steiler die Gerade, desto kleiner das Volumen.')}</p>` : d === 'VT' ? `<p>${L('At constant p, V ∝ T: a line through the origin, the steeper the smaller the pressure.', 'Bei konstantem p ist V ∝ T: eine Gerade durch den Ursprung, je steiler, desto kleiner der Druck.')}</p>` : `<p>${L('At constant T, p ∝ 1/V: twice the volume, half the pressure. Isotherms further out have a higher temperature.', 'Bei konstantem T ist p ∝ 1/V: doppeltes Volumen, halber Druck. Isothermen weiter aussen haben eine höhere Temperatur.')}</p>`),
          D.linesDiagram(d, [ln('isobaric', 5), ln('isochoric', 3), ln('isothermal', d === 'pV' ? 8 : 16)]))),
      ],
    },
    {
      topic: 1, name: () => L('From a description to the diagram', 'Von der Beschreibung zum Diagramm'),
      idea: () => L('Draw a cycle step by step: the kind of process gives the shape, the factor where it ends.', 'Zeichne einen Kreisprozess Schritt für Schritt: Die Art des Prozesses gibt die Form, der Faktor, wo er endet.'),
      frames: () => {
        const c = WS1(), ax = C.axesFor('pV', c.states);
        const fig = (n) => D.diagram({ cycle: c, diagram: 'pV', ax, upTo: n }, { grid: true, placed: Math.min(n + 1, 4) });
        return [
          frame(L('The description', 'Die Beschreibung'), `<p>${L('In the p(V) diagram, from A:', 'Im p(V)-Diagramm, von A aus:')}</p><ul>${C.describeCycle(c).map((x) => `<li>${x}</li>`).join('')}</ul><p>${L('and then straight back to A. How is D → A best described?', 'und dann direkt zurück nach A. Wie lässt sich D → A beschreiben?')}</p>`, fig(0)),
          ...c.segs.slice(0, 3).map((s, i) => frame(`${C.nameOf(s.from)} → ${C.nameOf(s.to)}`, `<p>${C.describe(s)}: ${L(`in the p(V) diagram ${C.shape(s.type, 'pV')}.`, `im p(V)-Diagramm ${C.shape(s.type, 'pV')}.`)}</p><p>${C.summary(c, s)}</p>`, fig(i + 1))),
          frame('D → A', `<p>${C.summary(c, c.segs[3])}</p><p>${L(`So D → A is ${C.closingWords(c, c.segs[3])}.`, `D → A ist also eine ${C.closingWords(c, c.segs[3])}.`)}</p>`, D.diagram({ cycle: c, diagram: 'pV', ax }, { grid: true })),
        ];
      },
    },
    {
      topic: 2, name: () => L('Reading a diagram', 'Ein Diagramm lesen'),
      idea: () => L('For each step: which quantity stays the same, and what do the other two do?', 'Für jeden Schritt: Welche Grösse bleibt gleich, und was machen die anderen zwei?'),
      frames: () => {
        const c = RECT(), fig = D.diagram({ cycle: c, diagram: 'VT' });
        return [
          frame(L('The cycle', 'Der Kreisprozess'), `<p>${L('In the V(T) diagram this cycle is a rectangle. Vertical lines are isotherms (T constant), horizontal lines isochores (V constant).', 'Im V(T)-Diagramm ist dieser Kreisprozess ein Rechteck. Senkrechte Linien sind Isothermen (T konstant), waagrechte Isochoren (V konstant).')}</p>`, fig),
          ...c.segs.map((s) => frame(`${C.nameOf(s.from)} → ${C.nameOf(s.to)}`, `<p>${C.summary(c, s)}</p><p>${s.type === 'isochoric' ? L('At constant V, p changes by the same factor as T.', 'Bei konstantem V ändert sich p um denselben Faktor wie T.') : L('At constant T, p changes by the inverse factor of V.', 'Bei konstantem T ändert sich p um den Kehrwert des Faktors von V.')}</p>`, fig)),
        ];
      },
    },
    {
      topic: 3, name: () => L('Switching diagrams', 'Diagramme wechseln'),
      idea: () => L('Name each step, then draw it in the new diagram with its shape there.', 'Benenne jeden Schritt und zeichne ihn dann im neuen Diagramm mit seiner Form dort.'),
      frames: () => {
        const c = RECT();
        return [
          frame(L('The given cycle', 'Der gegebene Kreisprozess'), `<p>${L('From the V(T) rectangle: A → B isothermal expansion, B → C isochoric cooling, C → D isothermal compression, D → A isochoric heating.', 'Aus dem V(T)-Rechteck: A → B isotherme Expansion, B → C isochore Abkühlung, C → D isotherme Kompression, D → A isochore Erwärmung.')}</p>`, D.diagram({ cycle: c, diagram: 'VT' })),
          frame(L('In the p(V) diagram', 'Im p(V)-Diagramm'), `<p>${L('Isotherms are hyperbolas, isochores vertical lines: the rectangle becomes a curved quadrilateral. The pressure: A 6, B 2, C 2/3, D 2 (in units of p₀).', 'Isothermen sind Hyperbeln, Isochoren senkrechte Linien: Aus dem Rechteck wird ein gekrümmtes Viereck. Der Druck: A 6, B 2, C 2/3, D 2 (in Einheiten von p₀).')}</p>`, D.diagram({ cycle: c, diagram: 'pV' })),
          frame(L('In the p(T) diagram', 'Im p(T)-Diagramm'), `<p>${L('Isotherms are vertical lines, isochores lines through the origin: B → C and D → A lie on two such lines, the flatter one with the larger volume.', 'Isothermen sind senkrechte Geraden, Isochoren Geraden durch den Ursprung: B → C und D → A liegen auf zwei solchen Geraden, die flachere mit dem grösseren Volumen.')}</p>`, D.diagram({ cycle: c, diagram: 'pT' })),
        ];
      },
    },
    {
      topic: 6, name: () => L('The state table', 'Die Zustandstabelle'),
      idea: () => L('Each state follows from the one before: the constant quantity stays, the other two change by the factors of the process.', 'Jeder Zustand folgt aus dem vorherigen: Die konstante Grösse bleibt, die anderen zwei ändern sich um die Faktoren des Prozesses.'),
      frames: () => {
        const rows = [['A', 100, 3, 300], ['B', 300, 1, 300], ['C', 300, 0.5, 150], ['D', 50, 3, 150]];
        const tab = (n) => `<table class="states"><thead><tr><th></th><th><i>p</i> in kPa</th><th><i>V</i> in L</th><th><i>T</i> in K</th></tr></thead><tbody>${rows.map((r, i) => `<tr><th>${r[0]}</th>${r.slice(1).map((x) => `<td>${i <= n ? x : '<b>?</b>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        return [
          frame(L('The task', 'Die Aufgabe'), `<p>${L('A with 100 kPa, 3 L, 300 K; isothermal compression to a third of the volume → B; isobaric cooling to half the temperature → C; isothermal expansion to the starting volume → D.', 'A mit 100 kPa, 3 L, 300 K; isotherme Kompression auf 1/3 des Volumens → B; isobare Abkühlung auf die halbe Temperatur → C; isotherme Expansion auf das Anfangsvolumen → D.')}</p>`, tab(0)),
          frame('B', `<p>${L('Isothermal: T stays 300 K; V to a third, 1 L; p three times, 300 kPa.', 'Isotherm: T bleibt 300 K; V auf einen Drittel, 1 L; p dreimal so gross, 300 kPa.')}</p>`, tab(1)),
          frame('C', `<p>${L('Isobaric: p stays 300 kPa; T to half, 150 K; V by the same factor, 0.5 L.', 'Isobar: p bleibt 300 kPa; T auf die Hälfte, 150 K; V um denselben Faktor, 0.5 L.')}</p>`, tab(2)),
          frame('D', `<p>${L('Isothermal: T stays 150 K; V from 0.5 L to 3 L, six times; p to a sixth, 50 kPa. Check: pV/T is the same in every row, 1 kPa·L/K. And D → A: V stays 3 L, so it is isochoric heating.', 'Isotherm: T bleibt 150 K; V von 0.5 L auf 3 L, sechsmal; p auf einen Sechstel, 50 kPa. Kontrolle: pV/T ist in jeder Zeile gleich, 1 kPa·L/K. Und D → A: V bleibt 3 L, also eine isochore Erwärmung.')}</p>`, tab(3)),
        ];
      },
    },
  ];

  // ---------------------------------------------------------------- practice topics
  const TOPICS = [
    { name: () => L('Processes and lines', 'Prozesse und Linien'), example: 0, stages: [{ name: () => 'p(V)', types: ['lines-pV'] }, { name: () => L('p(T) and V(T)', 'p(T) und V(T)'), types: ['lines-pT', 'lines-VT'] }] },
    { name: () => L('Description → diagram', 'Beschreibung → Diagramm'), example: 1, stages: [{ name: () => 'p(V)', types: ['match-pV'] }, { name: () => L('p(T) and V(T)', 'p(T) und V(T)'), types: ['match-pT', 'match-VT'] }, { name: () => L('mixed diagrams', 'gemischte Diagramme'), types: ['match-mix'] }, { name: () => L('back to A', 'zurück nach A'), types: ['close-pV', 'close-pT', 'close-VT'] }] },
    { name: () => L('Diagram → statements', 'Diagramm → Aussagen'), example: 2, stages: [{ name: () => 'p(V)', types: ['statements-pV'] }, { name: () => L('p(T) and V(T)', 'p(T) und V(T)'), types: ['statements-pT', 'statements-VT'] }] },
    { name: () => L('Switching diagrams', 'Diagramme wechseln'), example: 3, stages: [{ name: () => L('from p(V)', 'aus p(V)'), types: ['switch-pV-pT', 'switch-pV-VT'] }, { name: () => L('into p(V)', 'in p(V)'), types: ['switch-pT-pV', 'switch-VT-pV'] }, { name: () => L('p(T) ↔ V(T)', 'p(T) ↔ V(T)'), types: ['switch-pT-VT', 'switch-VT-pT'] }] },
    { name: () => L('Draw it yourself', 'Selbst zeichnen'), example: 1, stages: [{ name: () => 'p(V)', types: ['draw-pV'] }, { name: () => L('p(T) and V(T)', 'p(T) und V(T)'), types: ['draw-pT', 'draw-VT'] }] },
    { name: () => L('Find the error', 'Finde den Fehler'), example: 2, stages: [{ name: () => 'p(V)', types: ['error-pV'] }, { name: () => L('p(T) and V(T)', 'p(T) und V(T)'), types: ['error-pT', 'error-VT'] }] },
    { name: () => L('State table', 'Zustandstabelle'), example: 4, stages: [{ name: null, types: ['table'] }] },
  ];

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the question kinds it is asked about, its worked
  // example and its practice topic. Four options, no calculations beyond a factor: which line,
  // which statement, which diagram, the step back, another diagram, a value of the table, the
  // wrong step.
  const OBJECTIVES = [
    { id: 'states', kinds: ['table', 'close'], tutor: 4, topic: 6,
      name: () => L('Tell a state (p, V and T at one moment, a point) from a process (a line from one state to the next): find a state from the process before it, and the process that links two states.',
        'Einen Zustand (p, V und T in einem Moment, ein Punkt) von einem Prozess (eine Linie von einem Zustand zum nächsten) unterscheiden: einen Zustand aus dem Prozess davor bestimmen und den Prozess, der zwei Zustände verbindet.') },
    { id: 'identify', kinds: ['line', 'stmt', 'stmt3'], tutor: 0, topic: 0,
      name: () => L('Identify isobaric, isochoric and isothermal processes in p(V), p(T) and V(T) diagrams, using pV ∝ T.',
        'Isobare, isochore und isotherme Prozesse in p(V)-, p(T)- und V(T)-Diagrammen erkennen, mit pV ∝ T.') },
    { id: 'sketch', kinds: ['match', 'switch'], tutor: 1, topic: 1,
      name: () => L('Sketch a cycle from a description and transfer it from one diagram to another.',
        'Einen Kreisprozess nach einer Beschreibung skizzieren und von einem Diagramm in ein anderes übertragen.') },
    { id: 'error', kinds: ['error'], tutor: 2, topic: 5,
      name: () => L('Find the error in a sketch of a cycle.', 'Den Fehler in der Skizze eines Kreisprozesses finden.') },
  ];
  const FLAG = { type: 'type', factor: 'factor', inverse: 'factor', reverse: 'direction', shape: 'shape', copy: 'copy', celsius: 'celsius', same: 'factor' };
  function checkQuestion(kind, seed) {
    const r = C.rng(seed), d = r.pick(C.DIAGRAMS);
    if (kind === 'line') {
      const e = C.generate(`lines-${d}`, seed), types = e.lines.map((x) => x.type), want = types.find((t) => types.filter((u) => u === t).length === 1);
      const name = { isobaric: L('the isobar', 'die Isobare'), isochoric: L('the isochore', 'die Isochore'), isothermal: L('the isotherm', 'die Isotherme') }[want];
      return { title: TITLE.lines(), text: '', figure: `<div class="fig">${D.linesDiagram(d, e.lines)}</div>`, ask: L(`Which line is ${name}?`, `Welche Linie ist ${name}?`),
        options: e.lines.map((x, k) => ({ html: L(`line ${k + 1}`, `Linie ${k + 1}`), correct: x.type === want, flag: d === 'pV' && want === 'isothermal' ? 'shape' : 'type', why: L(`Line ${k + 1}: ${C.shape(x.type, d)}.`, `Linie ${k + 1}: ${C.shape(x.type, d)}.`) })), explain: () => e.solution.map((s) => `<p>${s}</p>`).join('') };
    }
    if (kind === 'stmt' || kind === 'stmt3') {
      const c = C.randomCycle(r, 3, { standard: true }), pool = r.shuffle(C.statementPool(c, r)), t = pool.find((x) => x.ok), fs = [];
      for (const x of pool) if (!x.ok && fs.length < 3 && x.topic !== t.topic && fs.every((y) => y.topic !== x.topic)) fs.push(x);
      return { title: L('Which statement is correct?', 'Welche Aussage ist richtig?'), text: '', figure: `<div class="fig">${D.diagram({ cycle: c, diagram: d })}</div>`, ask: L('Which statement is correct?', 'Welche Aussage ist richtig?'),
        options: r.shuffle([t, ...fs]).map((x) => ({ html: x.html, correct: x.ok, flag: 'reading', why: x.why })), explain: () => c.segs.map((s) => `<p>${C.summary(c, s)}</p>`).join('') };
    }
    const e = kind === 'match' ? C.generate(`match-${d}`, seed) : kind === 'close' ? C.generate(`close-${d}`, seed) : kind === 'switch' ? C.generate(`switch-${d}-${r.pick(C.DIAGRAMS.filter((x) => x !== d))}`, seed) : kind === 'error' ? C.generate(`error-${d}`, seed) : C.generate('table', seed);
    const q = e.questions[0], explain = () => `<div class="figs">${figureOf(e, true)}</div>${e.solution.map((s) => `<p>${s}</p>`).join('')}`;
    if (q.type === 'pick') return { title: TITLE[e.kind](), text: e.kind === 'switch' ? '' : `<div class="desc">${e.text}</div>`, figure: e.kind === 'switch' ? `<div class="fig">${D.diagram({ cycle: e.cycle, diagram: e.diagram })}</div>` : '', ask: e.kind === 'switch' ? e.text : L('Which diagram?', 'Welches Diagramm?'), options: q.options.map((o) => ({ html: D.diagram(o.fig, { small: true }), correct: o.ok, flag: FLAG[o.tag] || 'other', why: o.why })), explain };
    if (e.kind === 'error') {
      const q1 = e.questions[0];
      return { title: TITLE.error(), text: `<div class="desc">${e.text}</div>`, figure: `<div class="fig">${figureOf(e)}</div>`, ask: L('Which step is wrong?', 'Welcher Schritt ist falsch?'),
        options: [...q1.options.map((o) => ({ html: o.label, correct: o.ok, flag: 'reading', why: o.why || e.solution[0] })), { html: 'D → A', correct: false, flag: 'reading', why: L('D → A only closes the loop: it goes back to A from wherever D is.', 'D → A schliesst nur den Kreis: Es führt von D, wo immer es liegt, zurück nach A.') }], explain };
    }
    const qq = kind === 'table' ? r.pick(e.questions) : q;
    return { title: TITLE[e.kind](), text: `<div class="desc">${e.text}</div>`, figure: kind === 'table' ? `<div class="fig">${tableHtml(e, false)}</div>` : `<div class="fig">${figureOf(e)}</div>`, ask: kind === 'table' ? `${qq.label} = ?` : qq.label,
      options: qq.options.map((o) => ({ html: o.label, correct: o.ok, flag: FLAG[o.tag] || 'other', why: o.why })), explain };
  }
  const checkSource = {
    id: 'cyc',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { type: 'type', factor: 'factor', direction: 'direction', shape: 'shape', copy: 'copy', celsius: 'celsius' },
    concepts: () => ({
      type: L('one process taken for another', 'einen Prozess mit einem anderen verwechselt'), factor: L('the factor upside down or wrong', 'den Faktor umgekehrt oder falsch'),
      direction: L('the cycle run backwards', 'den Kreisprozess rückwärts durchlaufen'), shape: L('an isotherm drawn straight in p(V)', 'eine Isotherme im p(V)-Diagramm gerade gezeichnet'),
      copy: L('a diagram copied without changing it', 'ein Diagramm unverändert übernommen'), celsius: L('°C instead of kelvin', '°C statt Kelvin'),
    }),
  };

  // ---------------------------------------------------------------- language and modes
  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
  }
  function switchLang() {
    applyStatic();
    showScore();
    if (ex) {
      const keep = st, status = st.status;
      const chosen = [...document.querySelectorAll('#fields input:checked')].map((x) => [x.name, x.value]);
      ex = again(ex);
      render();
      st = keep;
      drawFigure();
      if (ex.kind === 'draw' && st.placed > ex.steps.length) $('.field[data-key="back"]').hidden = false;
      if (st.unveiled) showUnveiled();
      chosen.forEach(([n, v]) => { const x = document.querySelector(`input[name="${n}"][value="${v}"]`); if (x) x.checked = true; });
      if (st.checked) feedback();
      showStatus(status);
      showHints();
      if (st.revealed) showSolution();
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
      updateButtons();
    }
    tutor.relabel(lessons());
    checker.relabel();
  }
  const lessons = () => EXAMPLES.map((e) => ({ name: e.name(), idea: e.idea(), frames: e.frames, also: topics.also(e.topic) }));

  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('cyc-mode', m);
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
    const m = h.match(/^tutor-(\d+)$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= EXAMPLES.length) {
      setMode('tutor');
      if (tutor.current() !== Number(m[1]) - 1 || !tutor.shown()) tutor.open(Number(m[1]) - 1);
      return true;
    }
    const te = topics.parse(h);
    if (te) { setMode('practice'); if (!ex || ex.id !== h) open(te); return true; }
    return false;
  }

  function init() {
    Lang.init();
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    topics = window.Topics.create({
      app: PRACTICE,
      topics: TOPICS.map((t) => ({ name: t.name, stages: t.stages, example: { i: t.example, name: () => EXAMPLES[t.example].name() } })),
      make: (type, seed) => C.generate(type, seed), typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    applyStatic();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#fields').addEventListener('change', (evt) => {
      const row = evt.target.closest('.field');
      if (row) { row.className = 'field'; row.querySelector('.fb').textContent = ''; }
      if (evt.target.closest('.cand')) { document.querySelectorAll('.cand').forEach((el) => el.classList.remove('ok', 'bad')); document.querySelectorAll('.qfb').forEach((el) => { el.textContent = ''; }); }
      const li = evt.target.closest('.stmts li');
      if (li) { li.className = ''; li.querySelector('.fb').textContent = ''; }
    });
    $('#figure').addEventListener('click', onDrawClick);
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    tutor = window.createTutor(lessons(), { done: practise, practise: (i) => { topics.go(EXAMPLES[i].topic); setMode('practice'); fresh(); } });
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
    const last = stored('cyc-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
