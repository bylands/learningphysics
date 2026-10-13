(function () {
  'use strict';

  const C = window.Charges, X = window.PotEx;
  const Lang = window.Lang, Check = window.Check;
  // the texts with their indices as subscripts (V_P → V<sub>P</sub>, exercises.js); the labels of
  // a drawing take Lang.L, the drawing sets their indices itself (charges.js)
  const L = (en, de) => X.subs(Lang.L(en, de));
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Electric Potential', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Blue: field lines, orange: equipotential lines, red: force.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', option: (k) => `Option ${k}`,
      revealNote: (n) => `The solution unlocks once you have solved the exercise, used all hints or made ${n} attempts.`,
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check.', okWell: 'All correct, well done!',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', notAll: 'Not all the answers that fit are chosen yet.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), missed: 'This one fits too:', shown: 'The right answers are marked.',
    },
    de: {
      title: 'Elektrisches Potential', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Blau: Feldlinien, orange: Äquipotentiallinien, rot: Kraft.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', option: (k) => `Antwort ${k}`,
      revealNote: (n) => `Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder ${n} Versuche gemacht hast.`,
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann.', okWell: 'Alles richtig, gut gemacht!',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Hinweis.', notAll: 'Noch sind nicht alle passenden Antworten gewählt.', stmtsWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`), missed: 'Auch diese passt:', shown: 'Die richtigen Antworten sind markiert.',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('ep-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;

  // ---------------------------------------------------------------- questions
  // tiles: directions or names (one, or all that fit); pick: drawings; choice: a row of options;
  // multi: statements to tick.
  function questionHtml(q) {
    if (q.type === 'tiles') {
      return `<p class="ask">${q.label}</p><div class="tiles" role="${q.multi ? 'group' : 'radiogroup'}">${q.options.map((o, k) => `<label class="tile" data-k="${k}"><input type="${q.multi ? 'checkbox' : 'radio'}" name="q-${q.key}" value="${k}">${o.html}</label>`).join('')}</div><ul class="qfb" data-fb="${q.key}"></ul>`;
    }
    if (q.type === 'pick') {
      return `<p class="ask">${q.label}</p><div class="cands" role="radiogroup">${q.options.map((o, k) => `<label class="cand" data-k="${k}"><input type="radio" name="q-${q.key}" value="${k}"><span class="letter">${k + 1}</span>${o.html}</label>`).join('')}</div><ul class="qfb" data-fb="${q.key}"></ul>`;
    }
    if (q.type === 'multi') {
      return `<ul class="stmts">${q.statements.map((s, k) => `<li data-k="${k}"><label><input type="checkbox" name="q-${q.key}" value="${k}"><span>${s.html}</span></label><span class="fb"></span></li>`).join('')}</ul><p class="fb stmts-fb" data-fb="${q.key}"></p>`;
    }
    return `<div class="field" data-key="${q.key}"><span class="what">${q.label}</span><div class="opts" role="radiogroup">${q.options.map((o, k) => `<label><input type="radio" name="q-${q.key}" value="${k}"><span>${o.label}</span></label>`).join('')}</div><span class="fb" aria-live="polite"></span></div>`;
  }
  // Marks every answer; true if all are right, null if one is missing.
  // While the exercise is open, a wrong answer gets a nudge, not the solution: the steps of the
  // solution are taken out of its explanation, and single statements or missed tiles are not marked.
  function feedback() {
    let all = true, missing = false;
    const done = st && (st.solved || st.revealed);
    // n: the option's own nudge, where its reason would give the answer away
    const nudge = (w, n) => {
      if (done) return w;
      let t = n || w || '';
      // whole steps, then single sentences of the solution
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
          li.querySelector('.fb').innerHTML = done && !good ? (on ? s.why : `${ui().missed.replace(/:$/, '')}: ${s.why}`) : '';
        });
        $(`[data-fb="${q.key}"]`).innerHTML = !done && wrong ? ui().stmtsWrong(wrong) : '';
        continue;
      }
      const inputs = [...document.querySelectorAll(`input[name="q-${q.key}"]`)], on = inputs.filter((x) => x.checked).map((x) => Number(x.value));
      if (!on.length) { all = false; missing = true; continue; }
      if (q.type === 'tiles' || q.type === 'pick') {
        const notes = [];
        inputs.forEach((x) => {
          const k = Number(x.value), o = q.options[k], el = x.closest('.tile, .cand'), chosen = x.checked;
          el.classList.remove('ok', 'bad', 'miss');
          if (chosen) el.classList.add(o.ok ? 'ok' : 'bad');
          else if (q.multi && o.ok && done) el.classList.add('miss');
          if (chosen && !o.ok) notes.push(nudge(o.why, o.nudge));
          if (!chosen && q.multi && o.ok) notes.push(done ? `${ui().missed} ${o.why}` : ui().notAll);
          if (chosen !== o.ok && (chosen || q.multi)) all = false;
        });
        $(`[data-fb="${q.key}"]`).innerHTML = [...new Set(notes)].map((n) => `<li>${n}</li>`).join('');
        continue;
      }
      const o = q.options[on[0]], row = $(`.field[data-key="${q.key}"]`);
      row.className = `field ${o.ok ? 'ok' : 'bad'}`;
      row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o.why, o.nudge);
      if (!o.ok) all = false;
    }
    return all ? true : missing && !document.querySelector('.field.bad, .cand.bad, .tile.bad, .tile.miss, .stmts li.bad, .stmts-fb:not(:empty)') ? null : false;
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'ep', typeOf = (e) => e.type;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };
  const maxTries = () => (ex.questions.length === 1 && !ex.questions[0].multi && ex.questions[0].type !== 'multi' ? 2 : 3);
  function open(exercise) {
    finish();
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, status: null };
    if (location.hash !== `#${ex.id}`) history.replaceState(null, '', `#${ex.id}`);
    render();
    topics.shown(ex);
  }
  const fresh = () => open(topics.next(ex));
  const again = (e) => topics.parse(e.id) || X.make(e.type, e.seed);

  function render() {
    $('#title').innerHTML = `${ex.title} ${starsOf(ex.difficulty)}`;
    $('#prompt').innerHTML = ex.text;
    $('#figure').innerHTML = ex.figs || '';
    $('#fields').innerHTML = ex.questions.map(questionHtml).join('');
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    updateButtons();
  }
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= maxTries() || st.hints >= ex.hints.length;
  function updateButtons() {
    const left = ex.hints.length - st.hints;
    $('#hint').disabled = left === 0 || st.revealed || st.solved;
    $('#hint').textContent = left ? ui().hint(left) : ui().noHints;
    $('#reveal').disabled = !canReveal() || st.revealed;
    $('#reveal').title = canReveal() ? '' : ui().unlocks(maxTries());
    $('#reveal-note').textContent = ui().revealNote(maxTries());
    $('#reveal-note').hidden = canReveal() || st.revealed;
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
    $('#check').disabled = st.revealed && !st.solved;
  }
  function showStatus(kind) {
    const el = $('#status');
    if (st) st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? ui().fill : kind === 'shown' ? ui().shown
      : kind === 'ok' ? ui().okWell + (st.advance ? ` ${st.advance}` : '') : ui().notYet(st.tries) + (!canReveal() ? ui().tryAgain : ui().canReveal);
  }
  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; }
    if (st.revealed) return;
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) solved(); else showStatus('bad');
    updateButtons();
  }
  function solved() {
    const s = stored('ep-score', { solved: 0, clean: 0 });
    s.solved++;
    if (st.tries === 1 && st.hints === 0) s.clean++;
    store('ep-score', s);
    showScore();
    st.solved = true;
    Practice.markSolved(PRACTICE, ex.id);
    finish();
    st.advance = topics.solved(st, ex);
    document.querySelectorAll('#fields input').forEach((x) => { x.disabled = true; });
    showStatus('ok');
  }
  function showHints() { $('#hint-list').innerHTML = ex.hints.slice(0, st.hints).map((h) => `<li>${h}</li>`).join(''); $('#hints').hidden = !st.hints; }
  function hint() {
    if (st.hints >= ex.hints.length) return;
    st.hints++;
    showHints();
    updateButtons();
    $('#hint-list').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function showSolution() {
    $('#sol-figure').innerHTML = ex.solFig || '';
    $('#sol-steps').innerHTML = ex.solution.map((s) => `<p>${s}</p>`).join('');
    $('#solution').hidden = false;
  }
  // The right answers chosen and marked.
  function markRight() {
    for (const q of ex.questions) {
      if (q.type === 'multi') q.statements.forEach((s, k) => { document.querySelector(`.stmts li[data-k="${k}"] input`).checked = s.ok; });
      else q.options.forEach((o, k) => { document.querySelector(`input[name="q-${q.key}"][value="${k}"]`).checked = o.ok; });
    }
    feedback();
    document.querySelectorAll('#fields input').forEach((x) => { x.disabled = true; });
  }
  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    finish();
    markRight();
    showStatus('shown');
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- tutor
  // Worked examples, one per learning objective: the steps in order, and the wrong idea each step
  // avoids. Blue: field lines, orange: equipotentials, red: force.
  const frame = (title, text, figure) => ({ text: `<p class="step-rule">${title}</p>${text}`, figure: `<div class="figs">${figure}</div>` });
  const fig = (html) => `<div class="fig">${html}</div>`;
  const BOX = [-3, 3, -2.2, 2.2], xs = [-2, -1, 0, 1, 2];
  // vertical equipotentials at 400 V … 0 V, the field to the right, with more (points, parts, vecs)
  const ladder = (o = {}) => C.fig({ kind: 'uniform', E: [1, 0] }, { box: [-3, 3, -1.6, 1.6], given: xs.map((x) => [[x, -3], [x, 3]]), equiLines: true, tops: xs.map((x, i) => ({ x, label: `${400 - 100 * i} V` })), ...o });
  const ONE = { kind: 'points', charges: [{ q: 1, x: 0, y: 0 }] }, NEG = { kind: 'points', charges: [{ q: -1, x: 0, y: 0 }] }, LV = [0.4, 0.6, 0.9, 1.4, 2.4];
  const signTable = () => `<table class="cmp"><thead><tr><th></th><th>${L('ΔV', 'ΔΦ')} > 0</th><th>${L('ΔV', 'ΔΦ')} < 0</th></tr></thead><tbody><tr><th>q > 0</th><td>${L('gains', 'gewinnt')}</td><td>${L('loses', 'verliert')}</td></tr><tr><th>q < 0</th><td>${L('loses', 'verliert')}</td><td>${L('gains', 'gewinnt')}</td></tr></tbody></table>`;
  const LESSONS = [
    { topic: 0, stage: 0, name: () => L('Potential, energy, voltage', 'Potential, Energie, Spannung'), idea: () => L('The potential belongs to a point, the potential energy to a charge at a point, the voltage to two points.', 'Das Potential gehört zu einem Punkt, die potentielle Energie zu einer Ladung in einem Punkt, die Spannung zu zwei Punkten.'),
      frames: () => [
        frame(L('The task', 'Die Aufgabe'), `<p>${L('The equipotential lines are labelled with their potentials. A charge q = +2 nC sits at P. Find (a) the potential at P, (b) the potential energy of the charge at P, (c) the potential difference V_PQ between P and Q. First decide which of the three quantities each question asks for.', 'Die Äquipotentiallinien sind mit ihren Potentialen beschriftet. Eine Ladung q = +2 nC sitzt in P. Gesucht sind (a) das Potential in P, (b) die potentielle Energie der Ladung in P, (c) die Spannung U_PQ zwischen P und Q. Entscheide zuerst, nach welcher der drei Grössen jede Frage fragt.')}</p>`,
          fig(ladder({ parts: [{ x: -1, y: 0.5, q: 1 }], names: [{ x: -1, y: 0.5, name: 'P' }], points: [{ x: 1, y: -0.6, name: 'Q' }] }))),
        frame(L('(a) The potential: a property of the point', '(a) Das Potential: eine Eigenschaft des Punktes'), `<p>${L('Read it off: V_P = 300 V. It is the same whatever charge sits at P, or none at all. Replacing the charge by −4 nC does not change it.', 'Ablesen: Φ_P = 300 V. Es ist dasselbe, welche Ladung auch in P sitzt, oder gar keine. Ersetzt man die Ladung durch −4 nC, ändert es sich nicht.')}</p>`,
          fig(ladder({ points: [{ x: -1, y: 0.5, name: 'P' }, { x: 1, y: -0.6, name: 'Q' }] }))),
        frame(L('(b) The potential energy: charge times potential', '(b) Die potentielle Energie: Ladung mal Potential'), `<p>${L('E_pot = q·V_P = 2 nC · 300 V = 600 nJ. This one depends on the charge: −4 nC at P would have E_pot = −4 nC · 300 V = −1200 nJ, at the same potential of 300 V.', 'E_pot = q·Φ_P = 2 nC · 300 V = 600 nJ. Diese Grösse hängt von der Ladung ab: −4 nC in P hätte E_pot = −4 nC · 300 V = −1200 nJ, beim selben Potential von 300 V.')}</p>`,
          fig(ladder({ parts: [{ x: -1, y: 0.5, q: 1 }], names: [{ x: -1, y: 0.5, name: 'P' }], points: [{ x: 1, y: -0.6, name: 'Q' }] }))),
        frame(L('(c) The potential difference: a difference of two potentials', '(c) Die Spannung: eine Differenz zweier Potentiale'), `<p>${L('The potential difference (the voltage) between two points A and B is V_AB = V_A − V_B, in the order of the indices. Here V_PQ = V_P − V_Q = 300 V − 100 V = 200 V (and V_QP = −200 V). Not 300 V: that is the potential at P alone. Moving the zero of the potential changes V_P and V_Q, but not their difference; and the potential difference does not depend on the charge either.', 'Die Spannung zwischen zwei Punkten A und B ist die Differenz ihrer Potentiale, U_AB = Φ_A − Φ_B, in der Reihenfolge der Indizes. Hier U_PQ = Φ_P − Φ_Q = 300 V − 100 V = 200 V (und U_QP = −200 V). Nicht 300 V: Das ist das Potential in P allein. Verschiebt man den Nullpunkt des Potentials, ändern sich Φ_P und Φ_Q, aber nicht ihre Differenz; und auch die Spannung hängt nicht von der Ladung ab.')}</p>`,
          fig(ladder({ points: [{ x: -1, y: 0.5, name: 'P' }, { x: 1, y: -0.6, name: 'Q' }] }))),
      ] },
    { topic: 1, stage: 0, name: () => L('ΔV = E·d in a uniform field', 'U = E·d im homogenen Feld'), idea: () => L('In a uniform field the potential changes evenly along the field lines: |ΔV| = E·d, with d measured along the lines.', 'Im homogenen Feld ändert sich das Potential längs der Feldlinien gleichmässig: |U| = E·d, mit d längs der Linien gemessen.'),
      frames: () => [
        frame(L('The task', 'Die Aufgabe'), `<p>${L('A uniform field of 500 V/m points to the right; the grid spacing is 1 cm. Find the potential difference V_BA.', 'Ein homogenes Feld von 500 V/m zeigt nach rechts; der Gitterabstand ist 1 cm. Gesucht ist die Spannung U_BA.')}</p>`,
          fig(C.fig({ kind: 'uniform', E: [1, 0] }, { box: [-3, 3, -1.6, 1.6], lines: true, lineOpts: { gap: 1 }, grid: true, points: [{ x: -1, y: 1, name: 'A' }, { x: 1, y: -1, name: 'B' }] }))),
        frame(L('Step 1: the distance along the field lines', 'Schritt 1: der Abstand längs der Feldlinien'), `<p>${L('Only the distance along the field lines counts: d = 2 cm. Not the straight distance AB (about 2.8 cm): moving across the field lines, along an equipotential, the potential stays the same.', 'Nur der Abstand längs der Feldlinien zählt: d = 2 cm. Nicht der direkte Abstand AB (etwa 2.8 cm): Quer zu den Feldlinien, längs einer Äquipotentiallinie, bleibt das Potential gleich.')}</p>`,
          fig(C.fig({ kind: 'uniform', E: [1, 0] }, { box: [-3, 3, -1.6, 1.6], lines: true, lineOpts: { gap: 1 }, grid: true, vlines: [-1, 1], points: [{ x: -1, y: 1, name: 'A' }, { x: 1, y: -1, name: 'B' }] }))),
        frame(L('Step 2: size and sign', 'Schritt 2: Betrag und Vorzeichen'), `<p>${L('The size: |ΔV| = E·d = 500 V/m · 0.02 m = 10 V. The sign: the potential falls in the direction of the field, and B lies further along it. So V_BA = V_B − V_A = −10 V.', 'Der Betrag: |U_BA| = E·d = 500 V/m · 0.02 m = 10 V. Das Vorzeichen: Das Potential fällt in Feldrichtung, und B liegt weiter in Feldrichtung. Also U_BA = Φ_B − Φ_A = −10 V.')}</p>`,
          fig(C.fig({ kind: 'uniform', E: [1, 0] }, { box: [-3, 3, -1.6, 1.6], lines: true, lineOpts: { gap: 1 }, grid: true, vlines: [-1, 1], points: [{ x: -1, y: 1, name: 'A' }, { x: 1, y: -1, name: 'B' }], tops: [{ x: -1, label: Lang.L('V_A', 'Φ_A') }, { x: 1, label: Lang.L('V_A − 10 V', 'Φ_A − 10 V') }] }))),
        frame(L('Backwards: E from the potential', 'Rückwärts: E aus dem Potential'), `<p>${L('E = ΔV/d works both ways. On a graph V(x), the field is the slope with the opposite sign, E = −ΔV/Δx: where V falls by 2 V per mm, E = +2 kV/m; where V is constant, E = 0; where V rises by 1 V per mm, E = −1 kV/m.', 'E = U/d gilt in beide Richtungen. Auf einem Graphen Φ(x) ist das Feld die Steigung mit umgekehrtem Vorzeichen, E = −ΔΦ/Δx: Wo Φ um 2 V pro mm fällt, ist E = +2 kV/m; wo Φ konstant ist, ist E = 0; wo Φ um 1 V pro mm steigt, ist E = −1 kV/m.')}</p>`,
          `<div class="fig">${X.vGraph((x) => (x < 2 ? 6 - 2 * x : x < 5 ? 2 : 2 + (x - 5)), [0, 2, 5, 8])}</div><div class="fig">${X.eGraph((x) => (x < 2 ? 2 : x < 5 ? 0 : -1), [0, 2, 5, 8])}</div>`),
      ] },
    { topic: 2, stage: 0, name: () => L('The potential of point charges', 'Das Potential von Punktladungen'), idea: () => L('V = k·Q/r: the sign of Q, and a size falling with 1/r; the potentials of several charges add as numbers.', 'Φ = k·Q/r: das Vorzeichen von Q, und ein Betrag, der mit 1/r abnimmt; die Potentiale mehrerer Ladungen addieren sich als Zahlen.'),
      frames: () => [
        frame(L('The sign comes from Q', 'Das Vorzeichen kommt von Q'), `<p>${L('With the zero far away, V = k·Q/r. Around a positive charge the potential is positive everywhere and highest near the charge.', 'Mit dem Nullpunkt weit weg ist Φ = k·Q/r. Um eine positive Ladung ist das Potential überall positiv und nahe bei der Ladung am höchsten.')}</p>`, fig(C.fig(ONE, { box: BOX, equi: LV }))),
        frame(L('A negative charge', 'Eine negative Ladung'), `<p>${L('Q = −q; A is at the distance r, B at 3r. With V₀ = k·q/r: V_A = −V₀, V_B = −V₀/3 (a third: 1/r, not 1/r² as for the field). So V_BA = V_B − V_A = +2/3·V₀: moving away from a negative charge, the potential rises towards zero.', 'Q = −q; A liegt im Abstand r, B im Abstand 3r. Mit Φ₀ = k·q/r: Φ_A = −Φ₀, Φ_B = −Φ₀/3 (ein Drittel: 1/r, nicht 1/r² wie beim Feld). Also U_BA = Φ_B − Φ_A = +2/3·Φ₀: Weg von einer negativen Ladung steigt das Potential gegen null.')}</p>`,
          fig(C.fig(NEG, { box: BOX, equi: LV.map((v) => -v), points: [{ x: 0.7, y: 0, name: 'A' }, { x: 2.1, y: 0, name: 'B' }] }))),
        frame(L('Numbers, not vectors', 'Zahlen, keine Vektoren'), `<p>${L('At the centre of four equal positive charges on a square, the four fields cancel (vectors), but the potentials add up: V = 4·k·q/r > 0. With +q, −q, +q, −q in turn, both the field and the potential are zero.', 'Im Mittelpunkt von vier gleichen positiven Ladungen auf einem Quadrat heben sich die vier Felder auf (Vektoren), aber die Potentiale addieren sich: Φ = 4·k·q/r > 0. Mit +q, −q, +q, −q abwechselnd sind Feld und Potential beide null.')}</p>`,
          fig(C.fig({ kind: 'points', charges: [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([x, y]) => ({ q: 1, x, y })) }, { box: BOX, equi: [1.5, 2, 2.5, 3, 4], points: [{ x: 0, y: 0, name: 'M' }] }))),
        frame(L('In units of V₀', 'In Einheiten von Φ₀'), `<p>${L('Without a calculator, count in units: with V₀ = k·q/r, a charge +q at the distance r gives +V₀, a charge −2q at the distance 2r gives −2/2·V₀ = −V₀. At P between them: V = +V₀ − V₀ = 0, although the field there is not zero.', 'Ohne Taschenrechner zählt man in Einheiten: Mit Φ₀ = k·q/r gibt eine Ladung +q im Abstand r den Beitrag +Φ₀, eine Ladung −2q im Abstand 2r den Beitrag −2/2·Φ₀ = −Φ₀. In P dazwischen: Φ = +Φ₀ − Φ₀ = 0, obwohl das Feld dort nicht null ist.')}</p>`,
          fig(C.fig({ kind: 'points', charges: [{ q: 1, x: -1, y: 0 }, { q: -2, x: 2, y: 0 }] }, { box: BOX, lines: true, labels: ['+', '−2'], points: [{ x: 0, y: 0, name: 'P' }] }))),
      ] },
    { topic: 3, stage: 0, name: () => L('Gaining or losing potential energy', 'Potentielle Energie gewinnen oder verlieren'), idea: () => L('ΔE_pot = q·ΔV: the signs of q and of ΔV decide.', 'ΔE_pot = q·ΔΦ: Die Vorzeichen von q und von ΔΦ entscheiden.'),
      frames: () => [
        frame(L('The task', 'Die Aufgabe'), `<p>${L('An electron moves from A (100 V) to B (300 V). Does its potential energy increase or decrease, and by how much?', 'Ein Elektron bewegt sich von A (100 V) nach B (300 V). Nimmt seine potentielle Energie zu oder ab, und um wie viel?')}</p>`,
          fig(ladder({ parts: [{ x: 1, y: 0.4, q: -1, sym: 'e⁻' }], names: [{ x: 1, y: 0.4, name: 'A' }], points: [{ x: -1, y: -0.6, name: 'B' }] }))),
        frame(L('Step 1: ΔV, then the sign of q', 'Schritt 1: ΔΦ, dann das Vorzeichen von q'), `<p>${L('ΔV = V_B − V_A = 300 V − 100 V = +200 V. Then ΔE_pot = q·ΔV = (−e)·(+200 V) = −200 eV: the potential energy decreases by 200 eV, although the potential rises.', 'ΔΦ = Φ_B − Φ_A = 300 V − 100 V = +200 V. Dann ΔE_pot = q·ΔΦ = (−e)·(+200 V) = −200 eV: Die potentielle Energie nimmt um 200 eV ab, obwohl das Potential steigt.')}</p>`,
          fig(ladder({ parts: [{ x: 1, y: 0.4, q: -1, sym: 'e⁻' }], names: [{ x: 1, y: 0.4, name: 'A' }], points: [{ x: -1, y: -0.6, name: 'B' }] }))),
        frame(L('The four cases', 'Die vier Fälle'), `<p>${L('“Higher potential, higher potential energy” holds only for positive charges. A negative charge loses potential energy where the potential rises:', '«Höheres Potential, höhere potentielle Energie» gilt nur für positive Ladungen. Eine negative Ladung verliert potentielle Energie, wo das Potential steigt:')}</p>${signTable()}`, ''),
        frame(L('Left to itself', 'Sich selbst überlassen'), `<p>${X.DOWNHILL()} ${L('The electron at A is pulled towards higher potential: the force points against the field. On its way to B it gains 200 eV of kinetic energy.', 'Das Elektron in A wird zu höherem Potential gezogen: Die Kraft zeigt gegen das Feld. Auf dem Weg nach B gewinnt es 200 eV kinetische Energie.')}</p>`,
          fig(ladder({ parts: [{ x: 1, y: 0, q: -1, sym: 'e⁻' }], vecs: [{ x: 1, y: 0, dx: -76, dy: 0, cls: 'v-force', name: 'F⃗' }] }))),
      ] },
  ];
  const stage = (name, types) => ({ name, types });
  const TOPICS = [
    { name: () => L('Potential and energy', 'Potential und Energie'), example: () => 0, stages: [stage(() => L('which quantity', 'welche Grösse'), ['which-qty']), stage(() => L('at points', 'in Punkten'), ['points-v'])] },
    { name: () => L('The uniform field', 'Das homogene Feld'), example: () => 1, stages: [stage(() => L('along the field', 'längs des Feldes'), ['uniform-d']), stage(() => L('V → E', 'Φ → E'), ['v2e']), stage(() => L('E → V', 'E → Φ'), ['e2v'])] },
    { name: () => L('Point charges', 'Punktladungen'), example: () => 2, stages: [stage(() => L('in units of V₀', 'in Einheiten von Φ₀'), ['point-v']), stage(() => L('scalar, not vector', 'Skalar, kein Vektor'), ['scalar'])] },
    { name: () => L('Gain or lose', 'Gewinnen oder verlieren'), example: () => 3, stages: [stage(() => L('which way', 'welche Richtung'), ['which-way']), stage(() => L('potential energy', 'potentielle Energie'), ['gain-lose'])] },
    { name: () => L('True or false', 'Richtig oder falsch'), example: () => 0, stages: [stage(() => L('statements', 'Aussagen'), ['stmts'])] },
  ];
  const lessons = () => LESSONS.map((l) => ({ name: l.name(), idea: l.idea(), frames: l.frames, also: topics.also(l.topic) }));

  // ---------------------------------------------------------------- check
  // The learning objectives and their questions are in exercises.js (OBJECTIVES, question).
  const checkSource = {
    id: 'ep', objectives: X.OBJECTIVES, question: X.question, concept: X.CONCEPT,
    concepts: () => ({
      sign: L('the sign of the charge and of ΔV', 'das Vorzeichen der Ladung und von ΔΦ'), along: L('the distance along the field lines', 'der Abstand längs der Feldlinien'),
      slope: L('E as the slope of V', 'E als Steigung von Φ'), charge: L('the charge in e', 'die Ladung in e'), vr: L('V = kQ/r, not kQ/r²', 'Φ = kQ/r, nicht kQ/r²'),
      scalar: L('potentials add as numbers', 'Potentiale addieren sich als Zahlen'),
      perq: L('only the potential energy depends on the charge, not the potential', 'nur die potentielle Energie hängt von der Ladung ab, nicht das Potential'),
      diff: L('the potential at a point and the voltage between two points', 'das Potential in einem Punkt und die Spannung zwischen zwei Punkten'),
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
      const keep = st, status = st.status, chosen = [...document.querySelectorAll('#fields input:checked')].map((x) => [x.name, x.value]);
      ex = again(ex);
      render();
      st = keep;
      chosen.forEach(([n, v]) => { const x = document.querySelector(`input[name="${n}"][value="${v}"]`); if (x) x.checked = true; });
      if (st.revealed) markRight(); else if (st.checked) feedback();
      if (st.solved) document.querySelectorAll('#fields input').forEach((x) => { x.disabled = true; });
      showStatus(status);
      showHints();
      if (st.revealed) showSolution();
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
      updateButtons();
    }
    tutor.relabel(lessons());
    checker.relabel();
  }
  // Practice: exercises by topic; tutor: worked examples; check: a short test on the learning
  // objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('ep-mode', m);
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
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= LESSONS.length) {
      setMode('tutor');
      if (tutor.current() !== Number(m[1]) - 1 || !tutor.shown()) tutor.open(Number(m[1]) - 1);
      return true;
    }
    const te = topics.parse(h);
    if (te) { setMode('practice'); if (!ex || ex.id !== h) open(te); return true; }
    const d = h.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)$/);
    if (d && X.TYPES.includes(d[1])) { setMode('practice'); if (!ex || ex.id !== h) open(X.make(d[1], Number(d[2]))); return true; }
    return false;
  }

  function init() {
    Lang.init();
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    topics = window.Topics.create({
      app: PRACTICE,
      topics: TOPICS.map((t) => ({ name: t.name, stages: t.stages, example: (s) => ({ i: t.example(s), name: () => LESSONS[t.example(s)].name() }) })),
      make: (type, seed) => X.make(type, seed), typeOf,
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
      const box = evt.target.closest('.tiles, .cands');
      if (box) { box.querySelectorAll('.tile, .cand').forEach((el) => el.classList.remove('ok', 'bad', 'miss')); const fb = box.nextElementSibling; if (fb) fb.innerHTML = ''; }
      const li = evt.target.closest('.stmts li');
      if (li) { li.className = ''; li.querySelector('.fb').textContent = ''; }
    });
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    const practiseTopic = (t) => { topics.go(t); setMode('practice'); fresh(); };
    tutor = window.createTutor(lessons(), { done: practise, practise: (i) => { topics.go(LESSONS[i].topic, LESSONS[i].stage); setMode('practice'); fresh(); } });
    checker = Check.create(checkSource, {
      math: () => {}, markScrollable: () => {}, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: practiseTopic,
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // the problems of earlier versions are gone: practice instead; the arcade is now the check
    const last = stored('ep-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
