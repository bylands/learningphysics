(function () {
  'use strict';

  const M = window.Magnet, X = window.MagEx, P = window.MagPlot;
  const { scene, linesFig } = P;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Magnetic Forces and Fields of Currents', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Blue: velocity or current, green: magnetic field and field lines, red: force; ⊙ points out of the page, ⊗ into it.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', option: (k) => `Option ${k}`,
      revealNote: (n) => `The solution unlocks once you have solved the exercise, used all hints or made ${n} attempts.`,
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check.', okWell: 'All correct, well done!',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', notAll: 'Not all the answers that fit are chosen yet.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), missed: 'This one fits too:', shown: 'The right answers are marked.',
      drawNote: (k) => `Tap “${k}” to put the arrow on the drawing, then drag its tip to turn it; for out of or into the page, use ⊙ or ⊗. (Keys on the selected arrow: ← → turn it, also to ⊙ and ⊗.)`,
      noForce: 'No force', fillDraw: 'Draw the arrow first, then check.', shownDraw: 'The right direction is drawn.',
      onParticle: 'the particle', onWire: 'the wire',
    },
    de: {
      title: 'Magnetische Kräfte und Felder von Strömen', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Blau: Geschwindigkeit oder Strom, grün: Magnetfeld und Feldlinien, rot: Kraft; ⊙ zeigt aus der Seite heraus, ⊗ hinein.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', option: (k) => `Antwort ${k}`,
      revealNote: (n) => `Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder ${n} Versuche gemacht hast.`,
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann.', okWell: 'Alles richtig, gut gemacht!',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.',
      drawNote: (k) => `Tippe auf «${k}», um den Pfeil in die Zeichnung zu setzen, und ziehe dann an seiner Spitze, um ihn zu drehen; für aus der Seite heraus oder in sie hinein nimm ⊙ oder ⊗. (Tasten beim gewählten Pfeil: ← → drehen ihn, auch zu ⊙ und ⊗.)`,
      noForce: 'Keine Kraft', fillDraw: 'Zeichne zuerst den Pfeil und prüfe dann.', shownDraw: 'Die richtige Richtung ist eingezeichnet.',
      onParticle: 'das Teilchen', onWire: 'den Draht',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Hinweis.', notAll: 'Noch sind nicht alle passenden Antworten gewählt.', stmtsWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`), missed: 'Auch diese passt:', shown: 'Die richtigen Antworten sind markiert.',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('mf-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;

  // ---------------------------------------------------------------- questions
  // tiles: directions or names (one, or all that fit; wide: sentences, one per row); pick:
  // drawings; choice: a row of options; multi: statements to tick.
  function questionHtml(q) {
    if (q.type === 'tiles') {
      return `<p class="ask">${q.label}</p><div class="tiles${q.wide ? ' wide' : ''}" role="${q.multi ? 'group' : 'radiogroup'}">${q.options.map((o, k) => `<label class="tile" data-k="${k}"><input type="${q.multi ? 'checkbox' : 'radio'}" name="q-${q.key}" value="${k}">${o.html}</label>`).join('')}</div><ul class="qfb" data-fb="${q.key}"></ul>`;
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
    if (ex.draw) return drawFeedback();
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

  // ---------------------------------------------------------------- the vector drawn
  // In practice the direction exercises are answered by drawing the vector (shared arrow.js) at
  // the charge or wire, in the page or ⊙ ⊗, or with the button "No force" where there may be none
  // (exercises.js: draw, with the judging). The check keeps the four options. The arrow is kept in
  // st.arrows (st.none: no force), so that it survives a redraw (the other language). A check
  // marks it, with a nudge while the exercise is open and the explanation once it is solved or
  // the solution shown; the marks go once the drawing changes.
  let drawing = null;
  const LEN = 60;
  function drawHtml() {
    return `<p class="ask">${ex.draw.ask}</p><div id="mpalette"></div><ul class="qfb" data-fb="draw" aria-live="polite"></ul>`;
  }
  function mountDrawing() {
    drawing = null;
    const d = ex.draw, svg = d && $('#figure svg.mf');
    if (!svg) return;
    const kindLabel = `${d.name} <i>${d.kind}</i>`;
    drawing = window.Arrow.create(svg, {
      kinds: [{ id: d.kind, label: kindLabel, cls: `mf-${d.kind}` }],
      anchors: [{ id: 0, label: ex.type === 'dir-current' ? ui().onWire : ui().onParticle, x: d.at[0], y: d.at[1], r: 26 }],
      len: LEN, outIn: true, gap: d.gap, aside: d.aside, start: d.start, max: 1,
      label: () => `<tspan class="it">${d.kind}</tspan>`, labelCls: 'mf-al',
      words: (dir) => X.dirName(X.fromArrow(dir)),
      note: ui().drawNote(d.name),
      state: st.arrows,
      locked: st.solved || st.revealed,
      palette: $('#mpalette'),
      onEdit: (ar) => { st.arrows = ar.state(); if (st.arrows.length && st.none) { st.none = false; showNone(); } clearDrawn(); },
    });
    if (d.none) {
      const pal = $('#mpalette'), b = document.createElement('button');
      b.type = 'button';
      b.id = 'no-force';
      b.className = 'ar-none';
      b.innerHTML = `<span class="ar-oi-sym" aria-hidden="true">0</span> ${ui().noForce}`;
      b.addEventListener('click', () => {
        if (st.solved || st.revealed) return;
        st.none = !st.none;
        if (st.none) { st.arrows = []; drawing.restore([]); }
        showNone();
        clearDrawn();
      });
      pal.querySelector('.ar-kinds').insertBefore(b, pal.querySelector('.ar-remove'));
      showNone();
    }
  }
  function showNone() {
    const b = $('#no-force');
    if (!b) return;
    b.setAttribute('aria-pressed', st.none ? 'true' : 'false');
    b.disabled = st.solved || st.revealed;
  }
  // the marks of a check, gone once the drawing changes
  function clearDrawn() {
    if (!st.drawn) return;
    st.drawn = false;
    drawing.mark({});
    const b = $('#no-force');
    if (b) b.classList.remove('ok', 'bad');
    const fb = $('[data-fb="draw"]');
    fb.className = 'qfb';
    fb.innerHTML = '';
  }
  // the drawing judged and marked: true if right, false if wrong, null if nothing is drawn
  function drawFeedback() {
    const arrows = st.arrows || [], a = arrows[arrows.length - 1], fb = $('[data-fb="draw"]'), b = $('#no-force');
    if (!a && !st.none) return null;
    const j = ex.draw.judge(a ? X.fromArrow(a.dir) : null), done = st.solved || st.revealed || j.ok;
    st.drawn = true;
    drawing.mark(a ? { [a.id]: j.ok ? 'ok' : 'bad' } : {});
    if (b) { b.classList.toggle('ok', !a && j.ok); b.classList.toggle('bad', !a && !j.ok); }
    fb.className = `qfb${j.ok ? ' ok' : ''}`;
    fb.innerHTML = `<li>${j.ok ? `${ui().correct}: ${j.why}` : done ? j.why : j.nudge}</li>`;
    return j.ok;
  }
  // the solution shown: the right direction drawn (or "No force")
  function drawRight() {
    const show = ex.draw.show;
    st.none = !show;
    st.arrows = show ? [{ id: 'a1', kind: ex.draw.kind, anchor: 0, at: [...ex.draw.at], dir: X.toArrow(show), len: LEN }] : [];
    drawing.restore(st.arrows);
    drawing.select(null);
    drawing.show({ locked: true });
    showNone();
    drawFeedback();
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'mf', typeOf = (e) => e.type;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };
  const maxTries = () => (ex.draw ? (ex.type === 'dir-missing' ? 3 : 2)
    : ex.questions.length === 1 && !ex.questions[0].multi && ex.questions[0].type !== 'multi' ? 2 : 3);
  function open(exercise) {
    finish();
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, status: null, arrows: [], none: false, drawn: false };
    if (location.hash !== `#${ex.id}`) history.replaceState(null, '', `#${ex.id}`);
    render();
    topics.shown(ex);
  }
  const fresh = () => open(topics.next(ex));
  const again = (e) => topics.parse(e.id) || X.make(e.type, e.seed);

  function render() {
    $('#title').innerHTML = `${ex.title} ${starsOf(ex.difficulty)}`;
    $('#prompt').innerHTML = ex.text;
    $('#figure').innerHTML = ex.draw ? `<div class="fig">${ex.draw.fig}</div>` : ex.figs || '';
    $('#fields').innerHTML = ex.draw ? drawHtml() : ex.questions.map(questionHtml).join('');
    mountDrawing();
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
    el.textContent = !kind ? '' : kind === 'fill' ? (ex.draw ? ui().fillDraw : ui().fill) : kind === 'shown' ? (ex.draw ? ui().shownDraw : ui().shown)
      : kind === 'ok' ? ui().okWell + (st.advance ? ` ${st.advance}` : '') : ui().notYet(st.tries) + (!canReveal() ? ui().tryAgain : ui().canReveal);
  }
  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    if (st.revealed) return;
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) solved(); else showStatus('bad');
    updateButtons();
  }
  function solved() {
    const s = stored('mf-score', { solved: 0, clean: 0 });
    s.solved++;
    if (st.tries === 1 && st.hints === 0) s.clean++;
    store('mf-score', s);
    showScore();
    st.solved = true;
    Practice.markSolved(PRACTICE, ex.id);
    finish();
    st.advance = topics.solved(st, ex);
    document.querySelectorAll('#fields input').forEach((x) => { x.disabled = true; });
    if (drawing) { drawing.select(null); drawing.show({ locked: true }); showNone(); } // (the mark shows, not the selection)
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
    if (ex.draw) { drawRight(); return; }
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
  const frame = (title, text, figure) => ({ text: `<p class="step-rule">${title}</p>${text}`, figure: `<div class="figs">${figure}</div>` });
  const fig = (html) => `<div class="fig">${html}</div>`;
  const dn = X.dirName;
  const IN = [0, 0, -1], OUT = [0, 0, 1], RIGHT = [1, 0, 0], LEFT = [-1, 0, 0], UP = [0, 1, 0], DOWN = [0, -1, 0];
  const at30 = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), 0];
  const LESSONS = [
    { topic: 0, stage: 0, name: () => L('Field lines', 'Feldlinien'), idea: () => L('Grip each conductor with the right hand, thumb along the current: the fingers curl the way of the field. Magnetic field lines are closed.', 'Umfasse jeden Leiter mit der rechten Hand, Daumen in Stromrichtung: Die gekrümmten Finger zeigen die Richtung des Feldes. Magnetische Feldlinien sind geschlossen.'),
      frames: () => [
        frame(L('A straight wire', 'Ein gerader Draht'), `<p>${X.GRIP()} ${L('Here the current comes out of the page (⊙): the field lines are circles around the wire, anticlockwise. Further out, the field is weaker: the circles are drawn further apart.', 'Hier kommt der Strom aus der Seite heraus (⊙): Die Feldlinien sind Kreise um den Draht, im Gegenuhrzeigersinn. Weiter aussen ist das Feld schwächer: Die Kreise liegen weiter auseinander.')}</p>`, fig(linesFig({ src: 'wire', s: 1 }))),
        frame(L('A loop', 'Eine Leiterschleife'), `<p>${L(`A circular loop, cut through its middle and seen from the side: at the top the current comes out of the page, at the bottom it goes in. Grip each conductor: between them, both fields point ${dn(RIGHT)} and add up. Outside, the lines come back round: each line is closed.`, `Eine kreisförmige Leiterschleife, in der Mitte durchgeschnitten und von der Seite gesehen: Oben kommt der Strom aus der Seite heraus, unten geht er hinein. Umfasse jeden Leiter: Dazwischen zeigen beide Felder ${dn(RIGHT)} und addieren sich. Aussen laufen die Linien zurück: Jede Linie ist geschlossen.`)}</p>`, fig(linesFig({ src: 'loop', s: 1 }))),
        frame(L('A solenoid', 'Eine Spule'), `<p>${L('A solenoid is many loops in a row. Inside, the fields of all turns add up to a nearly uniform field along the axis; outside, the lines spread out and come back round. The end where the field lines come out acts as a north pole.', 'Eine Spule besteht aus vielen Schleifen hintereinander. Innen addieren sich die Felder aller Windungen zu einem nahezu homogenen Feld längs der Achse; aussen laufen die Linien auseinander und zurück. Das Ende, wo die Feldlinien austreten, wirkt als Nordpol.')}</p>`, fig(linesFig({ src: 'solenoid', s: 1 }))),
        frame(L('A bar magnet', 'Ein Stabmagnet'), `<p>${L('The field of a bar magnet looks like that of a solenoid: outside, the lines run from the north pole N to the south pole S, inside from S back to N.', 'Das Feld eines Stabmagneten sieht aus wie das einer Spule: Aussen laufen die Linien vom Nordpol N zum Südpol S, innen von S zurück nach N.')}</p>`, fig(linesFig({ src: 'magnet', s: 1 }))),
        frame(L('Not like this', 'Nicht so'), `<p>${L('Here the arrows inside the magnet point from N to S. Then the arrows of a line would meet head-on at S and point away from each other at N: the line would end at S and start at N. Magnetic field lines have no beginning and no end. Follow a line along its arrows: out of N, round the outside to S, and on through the magnet from S back to N.', 'Hier zeigen die Pfeile im Magneten von N nach S. Dann würden die Pfeile einer Linie bei S gegeneinander zeigen und bei N voneinander weg: Die Linie würde bei S enden und bei N beginnen. Magnetische Feldlinien haben weder Anfang noch Ende. Folge einer Linie in Pfeilrichtung: aus N heraus, aussen herum zu S und durch den Magneten von S zurück zu N.')}</p>`, fig(linesFig({ src: 'magnet', s: 1, wrong: 'inside' }))),
      ] },
    { topic: 1, stage: 0, name: () => L('The hand rules', 'Die Handregeln'), idea: () => L('Right hand for positive charges and currents, left hand for negative charges: thumb along the motion, index finger along the field, middle finger: the force.', 'Rechte Hand für positive Ladungen und Ströme, linke Hand für negative Ladungen: Daumen in Bewegungsrichtung, Zeigefinger in Feldrichtung, Mittelfinger: die Kraft.'),
      frames: () => [
        frame(L('A positive charge', 'Eine positive Ladung'), `<p>${X.RULE()}</p><p>${X.howForce(1, 'v', RIGHT, IN)}</p>`, fig(scene({ field: { dir: IN }, items: [{ kind: 'particle', q: 1, at: [0, 0] }], vecs: [{ of: 0, kind: 'v', dir: RIGHT }, { of: 0, kind: 'F', dir: M.force(1, RIGHT, IN) }] }))),
        frame(L('A negative charge', 'Eine negative Ladung'), `<p>${X.howForce(-1, 'v', RIGHT, IN)}</p><p>${L(`The same motion and field, the opposite force: ${X.LAW()} changes sign with the charge.`, `Dieselbe Bewegung und dasselbe Feld, die entgegengesetzte Kraft: ${X.LAW()} wechselt mit der Ladung das Vorzeichen.`)}</p>`, fig(scene({ field: { dir: IN }, items: [{ kind: 'particle', q: -1, at: [0, 0] }], vecs: [{ of: 0, kind: 'v', dir: RIGHT }, { of: 0, kind: 'F', dir: M.force(-1, RIGHT, IN) }] }))),
        frame(L('A current', 'Ein Strom'), `<p>${L('A current is moving positive charge: the right hand, thumb along the current.', 'Ein Strom ist bewegte positive Ladung: die rechte Hand, Daumen in Stromrichtung.')} ${X.howForce(1, 'I', UP, OUT)}</p>`, fig(scene({ field: { dir: OUT }, items: [{ kind: 'piece', d: UP, at: [0, 0], name: '<tspan class="it">I</tspan>' }], vecs: [{ of: 0, kind: 'F', dir: M.force(1, UP, OUT) }] }))),
        frame(L('No force', 'Keine Kraft'), `<p>${X.PERP()}</p>`, fig(scene({ field: { dir: RIGHT }, items: [{ kind: 'particle', q: 1, at: [0, 0] }], vecs: [{ of: 0, kind: 'v', dir: RIGHT }] }))),
      ] },
    { topic: 1, stage: 2, name: () => L('Which directions fit?', 'Welche Richtungen passen?'), idea: () => L('Only the part of the field across the motion matters: several field directions can give the same force.', 'Nur der Teil des Feldes quer zur Bewegung zählt: Mehrere Feldrichtungen können dieselbe Kraft ergeben.'),
      frames: () => {
        const v = RIGHT, F = OUT, fit = M.fitting('B', 1, v, F);
        return [
          frame(L('The field is missing', 'Das Feld fehlt'), `<p>${L(`A positive charge moves ${dn(v)}; the force points ${dn(F)}. Which field gives this force? Right hand: thumb ${dn(v)}, middle finger ${dn(F)}: the index finger points ${dn(UP)}.`, `Eine positive Ladung bewegt sich ${dn(v)}; die Kraft zeigt ${dn(F)}. Welches Feld ergibt diese Kraft? Rechte Hand: Daumen ${dn(v)}, Mittelfinger ${dn(F)}: Der Zeigefinger zeigt ${dn(UP)}.`)}</p>`,
            fig(scene({ items: [{ kind: 'particle', q: 1, at: [0, 0] }], vecs: [{ of: 0, kind: 'v', dir: v }, { of: 0, kind: 'F', dir: F }, { of: 0, kind: 'B', dir: UP }] }))),
          frame(L('But not only that one', 'Aber nicht nur dieses'), `<p>${L(`A field ${dn([1, 1, 0])} has a part ${dn(UP)} and a part ${dn(RIGHT)}, along the motion. The part along the motion gives no force: this field gives a force ${dn(F)} as well. All these fit: ${fit.map(dn).join(', ')}.`, `Ein Feld ${dn([1, 1, 0])} hat einen Teil ${dn(UP)} und einen Teil ${dn(RIGHT)}, längs der Bewegung. Der Teil längs der Bewegung ergibt keine Kraft: Auch dieses Feld ergibt eine Kraft ${dn(F)}. Alle diese passen: ${fit.map(dn).join(', ')}.`)}</p>`,
            fig(scene({ items: [{ kind: 'particle', q: 1, at: [0, 0] }], vecs: [{ of: 0, kind: 'v', dir: v }, { of: 0, kind: 'F', dir: F }, ...fit.map((d, i) => ({ of: 0, kind: 'B', dir: d, name: `B<tspan class="sub" dy="3">${i + 1}</tspan>` }))] }))),
          frame(L('In the exercises', 'In den Aufgaben'), `<p>${L('When the field or the velocity is missing, find the directions that fit: rule out those that are not perpendicular to the force, then check the rest with the hand rule. In practice you draw one of them; in the check you choose among four.', 'Wenn das Feld oder die Geschwindigkeit fehlt, suche die Richtungen, die passen: Schliesse jene aus, die nicht senkrecht zur Kraft stehen, und prüfe die übrigen mit der Handregel. Beim Üben zeichnest du eine davon, im Check wählst du aus vier aus.')}</p>`,
            fig(scene({ items: [{ kind: 'particle', q: 1, at: [0, 0] }], vecs: [{ of: 0, kind: 'v', dir: v }, { of: 0, kind: 'F', dir: F }, { of: 0, kind: 'B', unknown: true }] }))),
        ];
      } },
    { topic: 2, stage: 0, name: () => L('The size of the force', 'Der Betrag der Kraft'), idea: () => L('F = I·L·B·sin θ: only the part of the wire across the field counts. Each factor changes the force in proportion.', 'F = I·L·B·sin θ: Nur der Teil des Drahts quer zum Feld zählt. Jeder Faktor ändert die Kraft im selben Verhältnis.'),
      frames: () => {
        const piece = (d) => ({ kind: 'piece', d, at: [0, 0], name: '<tspan class="it">I</tspan>' });
        return [
          frame(L('Across the field', 'Quer zum Feld'), `<p>${L('A piece of wire of length L carries a current I perpendicular to a field B: the force on it is F = I·L·B. With 2 A, 50 cm and 0.2 T: F = 2 A · 0.5 m · 0.2 T = 0.2 N. The length in metres!', 'Ein Drahtstück der Länge L führt einen Strom I senkrecht zu einem Feld B: Die Kraft darauf ist F = I·L·B. Mit 2 A, 50 cm und 0.2 T: F = 2 A · 0.5 m · 0.2 T = 0.2 N. Die Länge in Metern!')}</p>`,
            fig(scene({ field: { dir: RIGHT }, items: [piece(UP)], vecs: [{ of: 0, kind: 'F', dir: M.force(1, UP, RIGHT) }] }))),
          frame(L('At an angle', 'Schräg zum Feld'), `<p>${L('At an angle θ to the field, only the part of the wire across the field counts: F = I·L·B·sin θ. At 30°, sin 30° = 0.5: half the force, 0.1 N. The direction is still given by the hand rule: perpendicular to the wire and to the field.', 'Unter einem Winkel θ zum Feld zählt nur der Teil des Drahts quer zum Feld: F = I·L·B·sin θ. Bei 30° ist sin 30° = 0.5: die halbe Kraft, 0.1 N. Die Richtung gibt weiterhin die Handregel: senkrecht zum Draht und zum Feld.')}</p>`,
            fig(scene({ field: { dir: RIGHT }, items: [piece(at30)], vecs: [{ of: 0, kind: 'F', dir: M.force(1, at30, RIGHT) }] }))),
          frame(L('Along the field', 'Längs des Feldes'), `<p>${L('Along the field lines, θ = 0° and sin 0° = 0: no force at all, however large the current.', 'Längs der Feldlinien ist θ = 0° und sin 0° = 0: überhaupt keine Kraft, wie gross der Strom auch ist.')}</p>`,
            fig(scene({ field: { dir: RIGHT }, items: [piece(RIGHT)], vecs: [] }))),
          frame(L('Ratios', 'Verhältnisse'), `<p>${L('The force is proportional to I, to L, to B and to sin θ. Twice the current and half the field: 2 · ½ = 1, the same force. Three times the current, turned from 90° to 30°: 3 · 0.5 = 1.5 times the force. No numbers needed.', 'Die Kraft ist proportional zu I, zu L, zu B und zu sin θ. Doppelter Strom und halbes Feld: 2 · ½ = 1, dieselbe Kraft. Dreifacher Strom, von 90° auf 30° gedreht: 3 · 0.5 = das 1.5-Fache der Kraft. Ganz ohne Zahlen.')}</p>`,
            fig(scene({ field: { dir: RIGHT }, items: [piece(UP)], vecs: [{ of: 0, kind: 'F', dir: M.force(1, UP, RIGHT) }] }))),
        ];
      } },
    { topic: 3, stage: 0, name: () => L('Two currents', 'Zwei Ströme'), idea: () => L('First the field of one current at the other, then the force on the other.', 'Zuerst das Feld des einen Stroms beim anderen, dann die Kraft auf den anderen.'),
      frames: () => {
        const w1 = { kind: 'wire', d: OUT, at: [-1.2, 0], name: '1' };
        return [
          frame(L('The field of a current', 'Das Feld eines Stroms'), `<p>${X.GRIP()} ${L(`Wire 1 carries a current out of the page: at wire 2, to its right, the field points ${dn(UP)}.`, `Draht 1 führt einen Strom aus der Seite heraus: Bei Draht 2, rechts davon, zeigt das Feld ${dn(UP)}.`)}</p>`,
            fig(scene({ items: [w1, { kind: 'wire', d: OUT, at: [1.2, 0], name: '2' }], vecs: [{ of: 1, kind: 'B', dir: UP }] }))),
          frame(L('The force on the other', 'Die Kraft auf den anderen'), `<p>${X.howForce(1, 'I', OUT, UP)} ${L('Currents in the same direction attract each other. Wire 1 is pulled towards wire 2 just as strongly, even if the currents differ (Newton’s third law).', 'Gleich gerichtete Ströme ziehen sich an. Draht 1 wird ebenso stark zu Draht 2 gezogen, auch wenn die Ströme verschieden sind (drittes Newtonsches Axiom).')}</p>`,
            fig(scene({ items: [w1, { kind: 'wire', d: OUT, at: [1.2, 0], name: '2' }], vecs: [{ of: 1, kind: 'B', dir: UP }, { of: 1, kind: 'F', dir: M.force(1, OUT, UP) }] }))),
          frame(L('Opposite currents', 'Entgegengesetzte Ströme'), `<p>${X.howForce(1, 'I', IN, UP)} ${L('Opposite currents repel each other.', 'Entgegengesetzte Ströme stossen sich ab.')}</p>`,
            fig(scene({ items: [w1, { kind: 'wire', d: IN, at: [1.2, 0], name: '2' }], vecs: [{ of: 1, kind: 'B', dir: UP }, { of: 1, kind: 'F', dir: M.force(1, IN, UP) }] }))),
          frame(L('At an angle', 'Schräg zueinander'), `<p>${L(`The currents need not be parallel. Wire 1 runs ${dn(UP)}; a piece of wire 2 to its right carries a current ${dn(RIGHT)}. The field of wire 1 there points ${dn(M.wireField(UP, [1.6, 0, 0]))}. ${X.howForce(1, 'I', RIGHT, M.wireField(UP, [1.6, 0, 0]))}`, `Die Ströme müssen nicht parallel sein. Draht 1 verläuft ${dn(UP)}; ein Stück von Draht 2 rechts davon führt einen Strom ${dn(RIGHT)}. Das Feld von Draht 1 zeigt dort ${dn(M.wireField(UP, [1.6, 0, 0]))}. ${X.howForce(1, 'I', RIGHT, M.wireField(UP, [1.6, 0, 0]))}`)}</p>`,
            fig(scene({ items: [{ kind: 'wire', d: UP, at: [-0.8, 0], name: '1' }, { kind: 'piece', d: RIGHT, at: [1.2, 0], name: '2' }], vecs: [{ of: 1, kind: 'B', dir: M.wireField(UP, [1.6, 0, 0]) }, { of: 1, kind: 'F', dir: M.force(1, RIGHT, M.wireField(UP, [1.6, 0, 0])) }] }))),
        ];
      } },
    { topic: 4, stage: 0, name: () => L('A coil in a field', 'Eine Spule im Feld'), idea: () => L('Opposite sides of a coil feel opposite forces: together they turn it. The torque is largest when the field lies in the plane of the coil, zero when it is perpendicular to it.', 'Gegenüberliegende Seiten einer Spule spüren entgegengesetzte Kräfte: Zusammen drehen sie sie. Das Drehmoment ist am grössten, wenn das Feld in der Ebene der Spule liegt, null, wenn es senkrecht dazu steht.'),
      frames: () => [
        frame(L('The forces on the sides', 'Die Kräfte auf die Seiten'), `<p>${L(`A rectangular coil can turn about an axis perpendicular to the page (the dot); we look along the axis. Side 1 carries the current out of the page, side 2 into it. ${X.howForce(1, 'I', OUT, RIGHT)} On side 2 the force points ${dn(DOWN)}.`, `Eine rechteckige Spule kann sich um eine Achse senkrecht zur Seite drehen (der Punkt); wir schauen längs der Achse. Seite 1 führt den Strom aus der Seite heraus, Seite 2 hinein. ${X.howForce(1, 'I', OUT, RIGHT)} Auf Seite 2 zeigt die Kraft ${dn(DOWN)}.`)}</p>`, X.coilFigs(0, 1, 1, true, false)),
        frame(L('A pair that turns', 'Ein Paar, das dreht'), `<p>${L('The two forces are equal and opposite: they do not push the coil away, but they turn it, here anticlockwise. With the field in the plane of the coil, their lever arm is the whole half-width of the coil: the torque is largest.', 'Die beiden Kräfte sind gleich gross und entgegengesetzt: Sie verschieben die Spule nicht, aber sie drehen sie, hier im Gegenuhrzeigersinn. Liegt das Feld in der Ebene der Spule, ist ihr Hebelarm die ganze halbe Breite der Spule: Das Drehmoment ist am grössten.')}</p>`, X.coilFigs(0, 1, 1, true)),
        frame(L('As it turns', 'Während sie sich dreht'), `<p>${L('The forces keep pointing up and down, but as the coil turns their lever arm gets shorter: the torque gets smaller.', 'Die Kräfte zeigen weiter nach oben und unten, aber während sich die Spule dreht, wird ihr Hebelarm kürzer: Das Drehmoment wird kleiner.')}</p>`, X.coilFigs(60, 1, 1, true)),
        frame(L('No torque', 'Kein Drehmoment'), `<p>${L('With the field perpendicular to the plane of the coil, both forces act along one line through the axis: no torque. The coil comes to rest here, unless the current is reversed.', 'Steht das Feld senkrecht zur Ebene der Spule, wirken beide Kräfte längs einer Geraden durch die Achse: kein Drehmoment. Hier kommt die Spule zur Ruhe, ausser der Strom wird umgekehrt.')}</p>`, X.coilFigs(90, 1, 1, true)),
        frame(L('Motor, loudspeaker, meter', 'Motor, Lautsprecher, Messgerät'), `<p>${L('In an electric motor, a commutator reverses the current every half turn, so that the torque keeps turning the coil the same way. In a moving-coil meter, the torque is proportional to the current and a spring balances it: the pointer shows the current. In a loudspeaker, an alternating current in a coil in the field of a magnet makes the coil, and the cone, move back and forth.', 'Im Elektromotor kehrt ein Kommutator den Strom bei jeder halben Drehung um, damit das Drehmoment die Spule immer in dieselbe Richtung dreht. Im Drehspulinstrument ist das Drehmoment proportional zum Strom, und eine Feder hält ihm das Gleichgewicht: Der Zeiger zeigt den Strom. Im Lautsprecher lässt ein Wechselstrom in einer Spule im Feld eines Magneten die Spule und die Membran hin und her schwingen.')}</p>`, X.coilFigs(120, 1, 1, true, false)),
      ] },
    { topic: 5, stage: 0, name: () => L('Find the error', 'Finde den Fehler'), idea: () => L('Go through a worked attempt step by step: which hand, the thumb, the index finger, the middle finger. The usual error: the sign of the charge ignored.', 'Gehe einen Lösungsversuch Schritt für Schritt durch: welche Hand, der Daumen, der Zeigefinger, der Mittelfinger. Der übliche Fehler: das Vorzeichen der Ladung übersehen.'),
      frames: () => {
        const e = [{ kind: 'particle', q: -1, at: [0, 0], sym: 'e⁻' }];
        return [
          frame(L('An attempt', 'Ein Versuch'), `<p>${L(`An electron moves ${dn(RIGHT)} through a field ${dn(IN)}. Mia writes: (1) The electron moves ${dn(RIGHT)}: the right hand, as for any charge. (2) Thumb along the velocity, ${dn(RIGHT)}. (3) Index finger along the field, ${dn(IN)}. (4) The middle finger points ${dn(UP)}: that is the force.`, `Ein Elektron bewegt sich ${dn(RIGHT)} durch ein Feld, das ${dn(IN)} zeigt. Mia schreibt: (1) Das Elektron bewegt sich ${dn(RIGHT)}: die rechte Hand, wie für jede Ladung. (2) Daumen in Richtung der Geschwindigkeit, ${dn(RIGHT)}. (3) Zeigefinger in Richtung des Feldes, ${dn(IN)}. (4) Der Mittelfinger zeigt ${dn(UP)}: Das ist die Kraft.`)}</p>`,
            fig(scene({ field: { dir: IN }, items: e, vecs: [{ of: 0, kind: 'v', dir: RIGHT }, { of: 0, kind: 'F', unknown: true }] }))),
          frame(L('Check each step', 'Jeden Schritt prüfen'), `<p>${L(`Step 1 is wrong: an electron is negative, so the left hand. Steps 2 and 3 are right. With the left hand, the middle finger points ${dn(DOWN)}: the force on the electron points ${dn(DOWN)}, not ${dn(UP)}. Step 4 followed correctly from the wrong hand.`, `Schritt 1 ist falsch: Ein Elektron ist negativ, also die linke Hand. Die Schritte 2 und 3 sind richtig. Mit der linken Hand zeigt der Mittelfinger ${dn(DOWN)}: Die Kraft auf das Elektron zeigt ${dn(DOWN)}, nicht ${dn(UP)}. Schritt 4 folgte richtig aus der falschen Hand.`)}</p>`,
            fig(scene({ field: { dir: IN }, items: e, vecs: [{ of: 0, kind: 'v', dir: RIGHT }, { of: 0, kind: 'F', dir: M.force(-1, RIGHT, IN) }] }))),
          frame(L('Electrons in a wire', 'Elektronen in einem Draht'), `<p>${L(`The same error in a wire: the electrons drift ${dn(RIGHT)}, so the current flows ${dn(LEFT)}. Right hand, thumb along the current ${dn(LEFT)}, index finger ${dn(IN)}: the force points ${dn(M.force(1, LEFT, IN))}, the same as for the electrons with the left hand. Other steps that go wrong: ⊙ and ⊗ mixed up, or a middle finger that is not perpendicular to the thumb and the index finger.`, `Derselbe Fehler in einem Draht: Die Elektronen driften ${dn(RIGHT)}, also fliesst der Strom ${dn(LEFT)}. Rechte Hand, Daumen in Stromrichtung ${dn(LEFT)}, Zeigefinger ${dn(IN)}: Die Kraft zeigt ${dn(M.force(1, LEFT, IN))}, wie für die Elektronen mit der linken Hand. Andere Schritte, die schiefgehen: ⊙ und ⊗ verwechselt, oder ein Mittelfinger, der nicht senkrecht zu Daumen und Zeigefinger steht.`)}</p>`,
            fig(scene({ field: { dir: IN }, items: [{ kind: 'piece', d: LEFT, at: [0, 0], name: '<tspan class="it">I</tspan>' }], vecs: [{ of: 0, kind: 'F', dir: M.force(1, LEFT, IN) }] }))),
        ];
      } },
  ];
  const stage = (name, types) => ({ name, types });
  const TOPICS = [
    { name: () => L('Field lines', 'Feldlinien'), example: () => 0, stages: [stage(() => L('wire and loop', 'Draht und Schleife'), ['lines-wire', 'lines-loop']), stage(() => L('solenoid and magnet', 'Spule und Magnet'), ['lines-solenoid', 'lines-magnet'])] },
    { name: () => L('The direction of the force', 'Die Richtung der Kraft'), example: (s) => (s >= 2 ? 2 : 1), stages: [stage(() => L('currents', 'Ströme'), ['dir-current']), stage(() => L('charges', 'Ladungen'), ['dir-particle']), stage(() => L('field or velocity missing', 'Feld oder Geschwindigkeit fehlt'), ['dir-missing'])] },
    { name: () => L('The size of the force', 'Der Betrag der Kraft'), example: () => 3, stages: [stage(() => L('mental arithmetic', 'Kopfrechnen'), ['size-num']), stage(() => L('ratios', 'Verhältnisse'), ['size-ratio'])] },
    { name: () => L('Two currents', 'Zwei Ströme'), example: () => 4, stages: [stage(() => L('parallel currents', 'parallele Ströme'), ['pair-parallel']), stage(() => L('at an angle', 'schräg zueinander'), ['pair-angle'])] },
    { name: () => L('A coil in a field', 'Eine Spule im Feld'), example: () => 5, stages: [stage(() => L('torque', 'Drehmoment'), ['coil'])] },
    { name: () => L('Find the error', 'Finde den Fehler'), example: () => 6, stages: [stage(() => L('charges', 'Ladungen'), ['error-charge']), stage(() => L('currents', 'Ströme'), ['error-current'])] },
    { name: () => L('True or false', 'Richtig oder falsch'), example: () => 1, stages: [stage(() => L('statements', 'Aussagen'), ['stmts'])] },
  ];
  const lessons = () => LESSONS.map((l) => ({ name: l.name(), idea: l.idea(), frames: l.frames, also: topics.also(l.topic) }));

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
      if (st.revealed) markRight(); else if (ex.draw ? st.drawn : st.checked) feedback();
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
  // objectives (check.js, check-src.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('mf-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; } else fresh();
  }
  function checkMode() { setMode('check'); checker.show(); if (location.hash !== '#check') history.replaceState(null, '', '#check'); }
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
    const d = h.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)$/);
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
    tutor = window.createTutor(lessons(), { done: practise, practise: (i) => { topics.go(LESSONS[i].topic, LESSONS[i].stage); setMode('practice'); fresh(); } });
    checker = Check.create(window.MagCheck, {
      math: () => {}, markScrollable: () => {}, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (t) => { topics.go(t); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // first visit: the first worked example; the problems of earlier versions are now practice
    const last = stored('mf-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
