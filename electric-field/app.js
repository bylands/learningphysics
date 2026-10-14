(function () {
  'use strict';

  const C = window.Charges, X = window.FieldEx;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Field Lines and Equipotentials', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Blue: field lines and field, orange: equipotential lines, red: force.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', option: (k) => `Option ${k}`,
      revealNote: (n) => `The solution unlocks once you have solved the exercise, used all hints or made ${n} attempts.`,
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check.', okWell: 'All correct, well done!',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', notAll: 'Not all the answers that fit are chosen yet.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), missed: 'This one fits too:', shown: 'The right answers are marked.',
      observe: 'Watch it happen',
    },
    de: {
      title: 'Feldlinien und Äquipotentiallinien', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Blau: Feldlinien und Feld, orange: Äquipotentiallinien, rot: Kraft.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', option: (k) => `Antwort ${k}`,
      revealNote: (n) => `Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder ${n} Versuche gemacht hast.`,
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann.', okWell: 'Alles richtig, gut gemacht!',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Hinweis.', notAll: 'Noch sind nicht alle passenden Antworten gewählt.', stmtsWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`), missed: 'Auch diese passt:', shown: 'Die richtigen Antworten sind markiert.',
      observe: 'Schau zu, was passiert',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('ef-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
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
  // solution are taken out of its explanation (or an option's own nudge is shown, where what is
  // left would still give the answer away), and single statements or missed tiles are not marked.
  function feedback() {
    let all = true, missing = false;
    const done = st && (st.solved || st.revealed);
    const nudge = (o) => {
      if (done) return o.why;
      if (o.nudge) return o.nudge;
      let t = o.why || '';
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
          if (chosen && !o.ok) notes.push(nudge(o));
          if (!chosen && q.multi && o.ok) notes.push(done ? `${ui().missed} ${o.why}` : ui().notAll);
          if (chosen !== o.ok && (chosen || q.multi)) all = false;
        });
        $(`[data-fb="${q.key}"]`).innerHTML = [...new Set(notes)].map((n) => `<li>${n}</li>`).join('');
        continue;
      }
      const o = q.options[on[0]], row = $(`.field[data-key="${q.key}"]`);
      row.className = `field ${o.ok ? 'ok' : 'bad'}`;
      row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o);
      if (!o.ok) all = false;
    }
    return all ? true : missing && !document.querySelector('.field.bad, .cand.bad, .tile.bad, .tile.miss, .stmts li.bad, .stmts-fb:not(:empty)') ? null : false;
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'ef', typeOf = (e) => e.type;
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
    window.Probe.wire($('#figure'));
    $('#fields').innerHTML = ex.questions.map(questionHtml).join('');
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    showObserve();
    updateButtons();
  }
  // Predict, then observe: once a dipole exercise is answered (or its solution shown), the animation
  // of its own dipole (ex.anim, anim.js) under it. Practice only: the check shows no animations.
  function showObserve() {
    const el = $('#observe'), a = ex.anim, on = !!(a && st && (st.solved || st.revealed));
    el.hidden = !on;
    el.innerHTML = on ? `<h3>${ui().observe}</h3><p class="note">${a.note}</p>${window.DipoleAnim.html(a.kind, { ...a.o, label: a.note })}` : '';
    if (on) window.DipoleAnim.start(el);
    return on;
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
    const s = stored('ef-score', { solved: 0, clean: 0 });
    s.solved++;
    if (st.tries === 1 && st.hints === 0) s.clean++;
    store('ef-score', s);
    showScore();
    st.solved = true;
    Practice.markSolved(PRACTICE, ex.id);
    finish();
    st.advance = topics.solved(st, ex);
    document.querySelectorAll('#fields input').forEach((x) => { x.disabled = true; });
    showStatus('ok');
    if (showObserve()) $('#observe').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    showObserve();
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- tutor
  // Worked examples: how to sketch field lines step by step, how to read a diagram, the dipole in a
  // uniform field, equipotentials, and checking a student's sketch.
  const frame = (title, text, figure) => ({ text: `<p class="step-rule">${title}</p>${text}`, figure: `<div class="figs">${figure}</div>` });
  const fig = (html) => `<div class="fig">${html}</div>`, half = (html) => `<div class="fig half">${html}</div>`;
  const BOX = X.BOX, uni = (E) => ({ kind: 'uniform', E });
  // a dipole on a rod at the angle a (degrees) in a field to the right, with the forces on its ends
  const dipole = (a, o = {}) => {
    const p = [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)], h = 0.7;
    return C.fig(uni([1, 0]), { box: BOX, lines: true, rods: [[-h * p[0], -h * p[1], h * p[0], h * p[1]]], parts: [{ x: h * p[0], y: h * p[1], q: 1 }, { x: -h * p[0], y: -h * p[1], q: -1 }],
      vecs: o.forces === false ? [] : [{ x: h * p[0], y: h * p[1], dx: 46, dy: 0, cls: 'v-force', name: 'F⃗' }, { x: -h * p[0], y: -h * p[1], dx: -46, dy: 0, cls: 'v-force', name: 'F⃗' }], small: o.small });
  };
  // the stubs of the field lines next to the charges (the first step of a sketch)
  const stubs = (c, lns) => lns.flatMap((ln) => {
    const at = (p) => c.charges.some((ch) => Math.hypot(p[0] - ch.x, p[1] - ch.y) < 0.3);
    return [at(ln[0]) ? ln.slice(0, 24) : null, at(ln[ln.length - 1]) ? ln.slice(-24) : null].filter(Boolean);
  });
  const LESSONS = [
    { topic: 0, stage: 0, name: () => L('Sketching field lines', 'Feldlinien skizzieren'), idea: () => L('Start at the charges, connect from + to −, never cross; then check the symmetry and the density.', 'Bei den Ladungen beginnen, von + nach − verbinden, nie kreuzen; dann Symmetrie und Dichte prüfen.'),
      frames: () => {
        const c = X.pts2([[2, -1], [-1, 1]]), lns = C.lines(c, BOX), labels = ['+2', '−'];
        return [
          frame(L('Step 1: next to each charge', 'Schritt 1: neben jeder Ladung'), `<p>${L('Sketch the field lines of +2q and −q. Close to a charge its own field wins: the lines are straight and radial, evenly spread, out of the positive charge and into the negative one. In a drawing +2q gets about √2 times as many lines as −q (a drawing is a section through space).', 'Skizziere die Feldlinien von +2q und −q. Nahe bei einer Ladung überwiegt ihr eigenes Feld: Die Linien sind gerade und radial, gleichmässig verteilt, aus der positiven Ladung heraus und in die negative hinein. In einer Zeichnung bekommt +2q etwa √2-mal so viele Linien wie −q (eine Zeichnung ist ein Schnitt durch den Raum).')}</p>`,
            fig(C.fig(c, { box: BOX, given: stubs(c, lns), labels }))),
          frame(L('Step 2: connect from + to −', 'Schritt 2: von + nach − verbinden'), `<p>${L('Join the lines that leave +2q to those that arrive at −q, bending round smoothly. They never cross: at each point the fields of both charges add up to one field with one direction.', 'Verbinde die Linien, die +2q verlassen, mit denen, die bei −q ankommen, in sanften Bögen. Sie kreuzen sich nie: In jedem Punkt addieren sich die Felder beider Ladungen zu einem Feld mit einer Richtung.')}</p>`,
            fig(C.fig(c, { box: BOX, given: lns, labels }))),
          frame(L('Step 3: far away', 'Schritt 3: weit weg'), `<p>${L('−q cannot take all the lines of +2q: the others go off to infinity. From far away the pair looks like a single charge +q, its lines radial again.', '−q kann nicht alle Linien von +2q aufnehmen: Die übrigen gehen ins Unendliche. Von weitem sieht das Paar aus wie eine einzelne Ladung +q, ihre Linien wieder radial.')}</p>`,
            fig(C.fig(c, { box: [-6, 6, -4.4, 4.4], lines: true, lineOpts: { per: 8 }, labels }))),
          frame(L('Step 4: check', 'Schritt 4: prüfen'), `<p>${L('From + to −, no crossings, densest near the charges and between them, where the field is strongest. Do not count lines to compare the charges: in a drawing they do not grow in proportion to the charge.', 'Von + nach −, keine Kreuzungen, am dichtesten nahe bei den Ladungen und zwischen ihnen, wo das Feld am stärksten ist. Zähle keine Linien, um die Ladungen zu vergleichen: In einer Zeichnung wachsen sie nicht proportional zur Ladung.')}</p>`,
            fig(C.fig(c, { box: BOX, given: lns, labels }))),
          frame(L('A long charged wire', 'Ein langer geladener Draht'), `<p>${L('Every piece of a long wire looks the same: the lines leave it at right angles, all along it. Seen from the side they look parallel, but round the wire they spread out like spokes (end-on, right): at twice the distance the field is half as strong, E ∝ 1/r.', 'Jedes Stück eines langen Drahts sieht gleich aus: Die Linien verlassen ihn senkrecht, überall entlang. Von der Seite sehen sie parallel aus, aber um den Draht herum laufen sie wie Speichen auseinander (von vorn, rechts): Im doppelten Abstand ist das Feld halb so stark, E ∝ 1/r.')}</p>`,
            half(C.fig(uni([0, 1]), { box: BOX, given: [...X.XS.map((x) => [[x, 0.15], [x, 2.7]]), ...X.XS.map((x) => [[x, -0.15], [x, -2.7]])], ...X.wire(1), small: true })) + half(C.fig({ kind: 'points', charges: [{ q: 1, x: 0, y: 0 }] }, { box: BOX, lines: true, lineOpts: { per: 12 }, small: true }))),
          frame(L('A plate capacitor', 'Ein Plattenkondensator'), `<p>${L('The charge is spread evenly over the plates: between them the lines are parallel and evenly spaced, from + to −, a uniform field. Only at the edges do they bulge out; outside, the fields of the two plates cancel: (almost) no field. Not lines from the middles of the plates, as from two point charges.', 'Die Ladung ist gleichmässig über die Platten verteilt: Dazwischen sind die Linien parallel und gleich dicht, von + nach −, ein homogenes Feld. Nur an den Rändern wölben sie sich nach aussen; ausserhalb heben sich die Felder der beiden Platten auf: (fast) kein Feld. Nicht Linien aus den Mitten der Platten wie bei zwei Punktladungen.')}</p>`,
            fig(C.fig(X.CAP(1), { box: BOX, given: X.capLines(X.CAP(1)) }))),
          frame(L('A plate and a charge', 'Eine Platte und eine Ladung'), `<p>${L('A large positive metal plate and a point charge −q above it. The plate is an equipotential: every line leaves it at right angles. The −q pulls charge on the plate towards it: under the charge the lines are densest. Far from the charge the lines are evenly spaced, on both sides; close to it they bend round and run into it. The two fields add up to one field: the lines bend smoothly and never cross.', 'Eine grosse positive Metallplatte und eine Punktladung −q über ihr. Die Platte ist eine Äquipotentialfläche: Jede Linie verlässt sie senkrecht. Die −q zieht Ladung auf der Platte zu sich hin: Unter der Ladung liegen die Linien am dichtesten. Weit weg von der Ladung sind die Linien gleichmässig verteilt, nach beiden Seiten; nahe bei ihr biegen sie ab und laufen in sie hinein. Die beiden Felder addieren sich zu einem Feld: Die Linien biegen sanft ab und kreuzen sich nie.')}</p>`,
            fig(C.fig(X.mixConf(X.MIX[0], false, false), { box: BOX, lines: true, labels: ['−'] }))),
        ];
      } },
    { topic: 1, stage: 0, name: () => L('Reading a field-line diagram', 'Ein Feldliniendiagramm lesen'), idea: () => L('The arrows give the signs and the direction, the density gives the strength.', 'Die Pfeile geben die Vorzeichen und die Richtung, die Dichte gibt die Stärke.'),
      frames: () => {
        const c = X.pts2([[2, -1], [-1, 1]]), lns = C.lines(c, BOX, { per: 6 }), P = [[0, 0], [-2.4, 0.4], [0, 1.6], [1.6, 1.2]], pn = ['P', 'Q', 'R', 'S'];
        const points = P.map(([x, y], i) => ({ x, y, name: pn[i] })), f = C.field(c, ...P[2]), n = Math.hypot(...f);
        const base = { box: BOX, given: lns, unknown: true, points };
        return [
          frame(L('The signs', 'Die Vorzeichen'), `<p>${L('The signs of A and B are hidden. The arrows leave A and run into B: A is positive, B negative.', 'Die Vorzeichen von A und B sind verdeckt. Die Pfeile verlassen A und laufen in B hinein: A ist positiv, B negativ.')}</p>`, fig(C.fig(c, base))),
          frame(L('The direction at a point', 'Die Richtung in einem Punkt'), `<p>${L('The field at R points along the field line through R (its tangent), the way the arrows point. No line passes exactly through R? Follow the lines next to it.', 'Das Feld in R zeigt längs der Feldlinie durch R (ihrer Tangente), so wie die Pfeile zeigen. Geht keine Linie genau durch R? Folge den Linien daneben.')}</p>`,
            fig(C.fig(c, { ...base, vecs: [{ x: P[2][0], y: P[2][1], dx: (46 * f[0]) / n, dy: (46 * f[1]) / n, cls: 'v-field', name: 'E⃗' }] }))),
          frame(L('The strength', 'Die Stärke'), `<p>${L('Compare how close together the lines are: densest at P, between the charges (both fields point the same way there); sparse at Q and S, far out. The field is strongest at P.', 'Vergleiche, wie dicht die Linien liegen: am dichtesten bei P, zwischen den Ladungen (beide Felder zeigen dort in dieselbe Richtung); spärlich bei Q und S, weit draussen. Das Feld ist bei P am stärksten.')}</p>`, fig(C.fig(c, base))),
          frame(L('Between the lines', 'Zwischen den Linien'), `<p>${L('The field is everywhere, not only on the drawn lines: a drawing shows just a few of them. At a point between two lines the field is as strong as the density of the lines around it shows.', 'Das Feld ist überall, nicht nur auf den gezeichneten Linien: Eine Zeichnung zeigt nur einige von ihnen. In einem Punkt zwischen zwei Linien ist das Feld so stark, wie die Dichte der Linien um ihn zeigt.')}</p>`, fig(C.fig(c, base))),
        ];
      } },
    { topic: 2, stage: 0, name: () => L('A dipole in a uniform field', 'Ein Dipol im homogenen Feld'), idea: () => L('In a uniform field a dipole is not pulled, but it turns: M = q·E·d·sin φ.', 'In einem homogenen Feld wird ein Dipol nicht gezogen, aber er dreht sich: M = q·E·d·sin φ.'),
      frames: () => [
        frame(L('The forces on the ends', 'Die Kräfte auf die Enden'), `<p>${L('<span class="vec"><i>F</i></span> = q·<span class="vec"><i>E</i></span>: on the + end along the field, on the − end against it. In a uniform field both are equally strong: the net force is zero, the dipole is not pulled either way.', '<span class="vec"><i>F</i></span> = q·<span class="vec"><i>E</i></span>: auf das +-Ende in Feldrichtung, auf das −-Ende entgegen. In einem homogenen Feld sind beide gleich stark: Die Gesamtkraft ist null, der Dipol wird in keine Richtung gezogen.')}</p>`, fig(dipole(45))),
        frame(L('The torque', 'Das Drehmoment'), `<p>${L('But the two forces do not act along one line: they turn the dipole, here clockwise, until its + end points along the field.', 'Aber die beiden Kräfte wirken nicht auf einer Geraden: Sie drehen den Dipol, hier im Uhrzeigersinn, bis sein +-Ende in Feldrichtung zeigt.')}</p>`, fig(dipole(45))),
        frame(L('In motion', 'In Bewegung'), `<p>${L('Let go, the dipole swings round the field direction like a pendulum, past it and back. Nothing takes away its energy, so it keeps swinging; its centre stays where it is, as the net force is zero. A molecule among others loses energy when it collides with its neighbours, but the collisions also jostle it: in a field, the molecular dipoles of a material are, on average, turned a little towards the field direction.', 'Losgelassen schwingt der Dipol wie ein Pendel um die Feldrichtung, über sie hinaus und zurück. Nichts nimmt ihm Energie weg, also schwingt er weiter; sein Mittelpunkt bleibt, wo er ist, denn die Gesamtkraft ist null. Ein Molekül unter anderen verliert bei Stössen mit seinen Nachbarn Energie, wird durch die Stösse aber auch hin und her gestossen: In einem Feld sind die molekularen Dipole eines Materials im Mittel etwas in Feldrichtung gedreht.')}</p>`, fig(window.DipoleAnim.html('uniform', { angle: 65 }))),
        frame(L('Equilibrium', 'Gleichgewicht'), `<p>${L('Along the field (left) the forces act along the rod: no torque, and nudged a little, the dipole turns back: a stable equilibrium. Against the field (right) there is no torque either, but the slightest nudge turns it round: unstable.', 'In Feldrichtung (links) wirken die Kräfte längs des Stabs: kein Drehmoment, und ein wenig ausgelenkt, dreht der Dipol zurück: ein stabiles Gleichgewicht. Gegen das Feld (rechts) gibt es auch kein Drehmoment, aber der kleinste Stoss dreht ihn um: labil.')}</p>`, half(dipole(0, { small: true })) + half(dipole(180, { small: true, forces: false }))),
        frame(L('How large is the torque?', 'Wie gross ist das Drehmoment?'), `<p>${L('Each end feels q·E; the lever arm of the pair is the distance between the two lines of action, d·sin φ (φ between the rod and the field). So M = q·E·d·sin φ: largest at 90°, zero along the field.', 'Jedes Ende spürt q·E; der Hebelarm des Paars ist der Abstand der beiden Wirkungslinien, d·sin φ (φ zwischen Stab und Feld). Also M = q·E·d·sin φ: am grössten bei 90°, null in Feldrichtung.')}</p><p>${L('Compared with this dipole at 90°: twice the charge, half the field, at 30° instead: ×2 · ×1/2 · ×1/2 (sin 30° = 1/2) = ×1/2.', 'Verglichen mit diesem Dipol bei 90°: doppelte Ladung, halbes Feld, dafür bei 30°: ×2 · ×1/2 · ×1/2 (sin 30° = 1/2) = ×1/2.')}</p>`, fig(dipole(90))),
        frame(L('Near a charge', 'Nahe einer Ladung'), `<p>${L('In the field of a point charge, the nearer end is in the stronger field (denser lines): if it is the end of opposite sign, the dipole is attracted. A free dipole first turns, then is always attracted: that is why a charged rod picks up scraps of paper.', 'Im Feld einer Punktladung ist das nähere Ende im stärkeren Feld (dichtere Linien): Ist es das Ende mit entgegengesetztem Vorzeichen, wird der Dipol angezogen. Ein freier Dipol dreht sich zuerst und wird dann immer angezogen: Darum hebt ein geladener Stab Papierschnipsel auf.')}</p>`,
          fig(C.fig({ kind: 'points', charges: [{ q: 2, x: -1.8, y: 0 }] }, { box: BOX, lines: true, lineOpts: { per: 6 }, labels: ['+2'], rods: [[0.3, 0, 1.5, 0]], parts: [{ x: 0.3, y: 0, q: -1 }, { x: 1.5, y: 0, q: 1 }] }))),
        frame(L('Turned round, then pulled in', 'Umgedreht, dann angezogen'), `<p>${L('Here the dipole starts with its + end towards the charge: that end is pushed away harder than the − end is pulled, and the pair turns it round. Once its − end is nearer, the pull wins and the dipole moves towards the charge.', 'Hier beginnt der Dipol mit seinem +-Ende zur Ladung hin: Dieses Ende wird stärker weggedrückt, als das −-Ende angezogen wird, und das Kräftepaar dreht ihn um. Sobald sein −-Ende näher ist, überwiegt die Anziehung, und der Dipol bewegt sich zur Ladung hin.')}</p>`, fig(window.DipoleAnim.html('point'))),
      ] },
    { topic: 3, stage: 0, name: () => L('Equipotential lines', 'Äquipotentiallinien'), idea: () => L('Sketch the field lines first, then the equipotentials across them at right angles.', 'Zuerst die Feldlinien skizzieren, dann die Äquipotentiallinien senkrecht dazu.'),
      frames: () => {
        const xs = [-2, -1, 0, 1, 2], tops = xs.map((x, i) => ({ x, label: `${400 - 100 * i} V` }));
        return [
          frame(L('At right angles', 'Senkrecht'), `<p>${L('Along an equipotential line the potential is the same: moving a charge along it takes no work, so the field has no part along it. Equipotential lines cross the field lines at right angles: around a point charge, circles.', 'Längs einer Äquipotentiallinie ist das Potential gleich: Eine Ladung längs ihr zu bewegen, braucht keine Arbeit, also hat das Feld keinen Anteil längs ihr. Äquipotentiallinien kreuzen die Feldlinien senkrecht: um eine Punktladung Kreise.')}</p>`,
            fig(C.fig(X.EQ.point.c, { box: BOX, lines: true, equi: X.EQ.point.lv }))),
          frame(L('The spacing', 'Die Abstände'), `<p>${L('For equal steps of potential the circles get farther apart outwards (V = k·Q/r): where the field is stronger, the same step takes a shorter distance. Close equipotentials, like dense field lines, mean a strong field.', 'Für gleiche Potentialschritte liegen die Kreise nach aussen immer weiter auseinander (V = k·Q/r): Wo das Feld stärker ist, braucht derselbe Schritt eine kürzere Strecke. Dichte Äquipotentiallinien bedeuten wie dichte Feldlinien ein starkes Feld.')}</p>`,
            fig(C.fig(X.EQ.point.c, { box: BOX, equi: X.EQ.point.lv }))),
          frame(L('A plate capacitor', 'Ein Plattenkondensator'), `<p>${L('Between the plates the field lines are parallel: the equipotentials are straight lines parallel to the plates, evenly spaced (a uniform field).', 'Zwischen den Platten sind die Feldlinien parallel: Die Äquipotentiallinien sind Geraden parallel zu den Platten, in gleichen Abständen (ein homogenes Feld).')}</p>`,
            fig(C.fig(X.CAP(1), { box: BOX, given: X.capEqui(X.CAP(1)), equiLines: true, extra: X.capLines(X.CAP(1)) }))),
          frame(L('A plate and a charge', 'Eine Platte und eine Ladung'), `<p>${L('A large positive metal plate and a point charge +q above it. Near the charge its own potential wins: small closed loops round it. The metal plate is itself an equipotential: next to it the equipotentials run along it. In between the equipotentials bend from one shape into the other, always at right angles to the field lines, and never cross.', 'Eine grosse positive Metallplatte und eine Punktladung +q über ihr. Nahe bei der Ladung überwiegt ihr eigenes Potential: kleine geschlossene Schleifen um sie. Die Metallplatte ist selbst eine Äquipotentialfläche: Neben ihr verlaufen die Äquipotentiallinien längs ihr. Dazwischen gehen die Äquipotentiallinien von der einen Form in die andere über, immer senkrecht zu den Feldlinien, und kreuzen sich nie.')}</p>`,
            fig(C.fig(X.mixConf(X.MIX[1], false, false), { box: BOX, lines: true, labels: ['+'], equi: X.levelsOf(X.mixConf(X.MIX[1], false, false), 9, [0.3, 0.5].map((d) => C.potential(X.mixConf(X.MIX[1], false, false), d, 0.5))) }))),
          frame(L('Two charges', 'Zwei Ladungen'), `<p>${L('Sketch the field lines first, then draw the equipotentials across them at right angles: small circles round each charge, wider loops further out. Halfway between + and − the equipotential is a straight line (V = 0).', 'Skizziere zuerst die Feldlinien, dann zeichne die Äquipotentiallinien senkrecht dazu: kleine Kreise um jede Ladung, weitere Schleifen weiter aussen. In der Mitte zwischen + und − ist die Äquipotentiallinie eine Gerade (V = 0).')}</p>`,
            fig(C.fig(X.EQ.dipole.c, { box: BOX, lines: true, equi: X.EQ.dipole.lv }))),
          frame(L('From equipotentials to field lines', 'Von Äquipotentiallinien zu Feldlinien'), `<p>${L('Given the equipotentials, draw the field lines at right angles to them, pointing from high to low potential: here to the right.', 'Sind die Äquipotentiallinien gegeben, zeichne die Feldlinien senkrecht dazu, von hohem zu tiefem Potential: hier nach rechts.')}</p>`,
            fig(C.fig(uni([1, 0]), { box: BOX, given: xs.map((x) => [[x, -3], [x, 3]]), equiLines: true, extra: [-1.6, -0.8, 0, 0.8, 1.6].map((y) => [[-3, y], [3, y]]), tops }))),
        ];
      } },
    { topic: 4, stage: 0, name: () => L('Find the error', 'Finde den Fehler'), idea: () => L('Check a sketch feature by feature: start and end, arrows, crossings, the angle and the spacing of the equipotentials.', 'Eine Skizze Merkmal für Merkmal prüfen: Anfang und Ende, Pfeile, Kreuzungen, Winkel und Abstände der Äquipotentiallinien.'),
      frames: () => {
        const wrong = X.sketch('like', 'cross', false), right = X.sketch('like', null, false), cap = X.sketch('plates', 'equi', false);
        const eqx = X.sketch('dipole', 'eqcross', false), eqr = X.sketch('dipole', null, false), eqs = X.sketch('like', 'eqspace', true);
        return [
          frame(L('The sketch', 'Die Skizze'), `<p>${L('A student sketched the field lines and equipotentials of two equal positive charges. One feature is wrong: check them one at a time.', 'Eine Schülerin hat die Feldlinien und Äquipotentiallinien zweier gleicher positiver Ladungen skizziert. Ein Merkmal ist falsch: Prüfe sie einzeln.')}</p>`, fig(C.fig(wrong.c, wrong.o))),
          frame(L('Start, end and arrows', 'Anfang, Ende und Pfeile'), `<p>${L('The lines start at the positive charges and run outwards, out of the picture; the arrows point away from +. That is right.', 'Die Linien beginnen bei den positiven Ladungen und laufen nach aussen, aus dem Bild; die Pfeile zeigen von + weg. Das stimmt.')}</p>`, fig(C.fig(wrong.c, wrong.o))),
          frame(L('Crossings', 'Kreuzungen'), `<p>${L('In the middle the lines of the left charge cross those of the right one: wrong. The student drew the lines of each charge on its own. But at each point the two fields add up to one field with one direction: the lines of the pair bend away from each other and never cross.', 'In der Mitte kreuzen die Linien der linken Ladung die der rechten: falsch. Die Schülerin hat die Linien jeder Ladung für sich gezeichnet. Aber in jedem Punkt addieren sich die beiden Felder zu einem Feld mit einer Richtung: Die Linien des Paars weichen sich aus und kreuzen sich nie.')}</p>`, fig(C.fig(right.c, right.o))),
          frame(L('Crossing equipotentials', 'Sich kreuzende Äquipotentiallinien'), `<p>${L('A sketch of a dipole: the field lines are right, but the student drew circles round each charge on its own, and they cross. Equipotential lines never cross: at each point the potential has one value, the sum of the potentials of both charges. Near each charge they are almost circles; further out they bend, and halfway between + and − the equipotential is a straight line.', 'Eine Skizze eines Dipols: Die Feldlinien stimmen, aber die Schülerin hat um jede Ladung für sich Kreise gezeichnet, und diese kreuzen sich. Äquipotentiallinien kreuzen sich nie: In jedem Punkt hat das Potential einen Wert, die Summe der Potentiale beider Ladungen. Nahe bei jeder Ladung sind sie fast Kreise; weiter aussen biegen sie sich, und in der Mitte zwischen + und − ist die Äquipotentiallinie eine Gerade.')}</p>`, half(C.fig(eqx.c, { ...eqx.o, small: true })) + half(C.fig(eqr.c, { ...eqr.o, small: true }))),
          frame(L('The spacing', 'Die Abstände'), `<p>${L('Here the equipotentials of two negative charges get closer together outwards. Wrong: for equal steps of potential they are closest where the field is strongest, near the charges, and farther apart outwards.', 'Hier liegen die Äquipotentiallinien zweier negativer Ladungen nach aussen immer dichter. Falsch: Für gleiche Potentialschritte liegen sie dort am dichtesten, wo das Feld am stärksten ist, nahe bei den Ladungen, und nach aussen immer weiter auseinander.')}</p>`, fig(C.fig(eqs.c, eqs.o))),
          frame(L('The equipotentials', 'Die Äquipotentiallinien'), `<p>${L('Another student’s sketch of a capacitor: here the orange lines run along the field lines, from plate to plate. Wrong: equipotential lines cross the field lines at right angles, so between the plates they are parallel to the plates.', 'Die Skizze eines Kondensators einer anderen Schülerin: Hier verlaufen die orangen Linien längs der Feldlinien, von Platte zu Platte. Falsch: Äquipotentiallinien kreuzen die Feldlinien senkrecht, zwischen den Platten sind sie also parallel zu den Platten.')}</p>`, fig(C.fig(cap.c, cap.o))),
        ];
      } },
  ];
  const stage = (name, types) => ({ name, types });
  const TOPICS = [
    { name: () => L('Sketching field lines', 'Feldlinien skizzieren'), example: () => 0, stages: [stage(() => L('point charges', 'Punktladungen'), ['lines-pick']), stage(() => L('a charged wire', 'ein geladener Draht'), ['lines-wire']), stage(() => L('a plate capacitor', 'ein Plattenkondensator'), ['lines-cap']), stage(() => L('plates and charges', 'Platten und Ladungen'), ['lines-mix'])] },
    { name: () => L('Reading field lines', 'Feldlinien lesen'), example: () => 1, stages: [stage(() => L('point charges', 'Punktladungen'), ['lines-read']), stage(() => L('plates and charges', 'Platten und Ladungen'), ['read-mix'])] },
    { name: () => L('Dipoles', 'Dipole'), example: () => 2, stages: [stage(() => L('uniform field', 'homogenes Feld'), ['dipole-uniform']), stage(() => L('the torque', 'das Drehmoment'), ['dipole-torque']), stage(() => L('near a charge', 'nahe einer Ladung'), ['dipole-point'])] },
    { name: () => L('Equipotential lines', 'Äquipotentiallinien'), example: () => 3, stages: [stage(() => L('which diagram', 'welches Diagramm'), ['equi-pick']), stage(() => L('field lines from them', 'Feldlinien daraus'), ['lines-equi']), stage(() => L('plates and charges', 'Platten und Ladungen'), ['equi-mix'])] },
    { name: () => L('Find the error', 'Finde den Fehler'), example: () => 4, stages: [stage(null, ['error'])] },
    { name: () => L('True or false', 'Richtig oder falsch'), example: () => 0, stages: [stage(() => L('statements', 'Aussagen'), ['stmts'])] },
    { name: () => L('Probing a field', 'Ein Feld abtasten'), example: (s) => (s ? 3 : 1), stages: [stage(() => L('field probe', 'Feldsonde'), ['probe-field']), stage(() => L('potential probe', 'Potentialsonde'), ['probe-pot'])] },
  ];
  const lessons = () => LESSONS.map((l) => ({ name: l.name(), idea: l.idea(), frames: l.frames, also: topics.also(l.topic) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the exercise types it is asked about, its worked
  // example and its practice topic. A question of the check is one question of an exercise with
  // four options (for the wire and the capacitor: the diagram); the tags of the wrong options are
  // the flags of the check.
  const OBJECTIVES = [
    { id: 'sketch', kinds: ['lines-pick', 'lines-wire', 'lines-cap', 'lines-mix'], tutor: 0, topic: 0,
      name: () => L('Sketch the field lines of point charges, of a charged wire, of a plate capacitor (a uniform field) and of plates and point charges together.', 'Die Feldlinien von Punktladungen, eines geladenen Drahts, eines Plattenkondensators (ein homogenes Feld) und von Platten und Punktladungen zusammen skizzieren.') },
    { id: 'read', kinds: ['lines-read', 'read-mix'], tutor: 1, topic: 1,
      name: () => L('Read the direction and the relative strength of a field from its field lines.', 'Die Richtung und die relative Stärke eines Feldes aus seinen Feldlinien ablesen.') },
    { id: 'dipole', kinds: ['dipole-uniform', 'dipole-torque'], tutor: 2, topic: 2,
      name: () => L('Determine the force and the torque on a dipole in a uniform field.', 'Die Kraft und das Drehmoment auf einen Dipol in einem homogenen Feld bestimmen.') },
    { id: 'equi', kinds: ['equi-pick', 'lines-equi', 'equi-mix'], tutor: 3, topic: 3,
      name: () => L('Sketch equipotential lines at right angles to the field lines.', 'Äquipotentiallinien senkrecht zu den Feldlinien skizzieren.') },
    { id: 'error', kinds: ['error'], tutor: 4, topic: 4,
      name: () => L('Find the error in a sketch of field lines and equipotentials: lines that cross, equipotentials not at right angles to the field lines or wrongly spaced.', 'Den Fehler in einer Skizze von Feldlinien und Äquipotentiallinien finden: Linien, die sich kreuzen, Äquipotentiallinien, die nicht senkrecht zu den Feldlinien stehen oder falsche Abstände haben.') },
  ];
  const ASK = { 'lines-wire': 'd', 'lines-cap': 'd' };
  function checkQuestion(kind, seed) {
    const e = X.make(kind, seed), qs = e.questions.filter((q) => q.type !== 'multi' && q.options.length === 4 && (!ASK[kind] || q.key === ASK[kind])), q = qs[seed % qs.length];
    return {
      title: e.title, text: e.text, figure: `<div class="figs">${e.figs || ''}</div>`, ask: q.label.replace(/^\([a-d]\) /, ''),
      options: q.options.map((o) => ({ html: o.html || o.label, correct: o.ok, flag: o.ok ? null : o.tag || 'other', why: o.why })),
      explain: () => `${e.solFig || ''}<div class="steps">${e.solution.map((s) => `<p>${s}</p>`).join('')}</div>`,
    };
  }
  const CONCEPT = { reverse: 'direction', sign: 'direction', against: 'direction', separate: 'cross', swap: 'direction', parallel: 'shape', point: 'shape', outside: 'shape', circle: 'shape', past: 'shape', flat: 'shape', square: 'shape', nearplate: 'shape',
    perp: 'tangent', density: 'density', force: 'netforce', torque: 'torque', angle: 'torque', lines: 'perp', along: 'perp', slant: 'perp', even: 'spacing', bunched: 'spacing', eqspace: 'spacing', eqcross: 'eqsum', ignore: 'eqsum', up: 'downhill' };
  const checkSource = {
    id: 'ef', objectives: OBJECTIVES, question: checkQuestion, concept: CONCEPT,
    concepts: () => ({
      direction: L('the direction of field lines (from + to −)', 'die Richtung der Feldlinien (von + nach −)'), cross: L('field lines that cross', 'Feldlinien, die sich kreuzen'),
      shape: L('the field of a wire or a capacitor', 'das Feld eines Drahts oder eines Kondensators'), tangent: L('the field along the field line', 'das Feld längs der Feldlinie'),
      density: L('the strength from the density of the lines', 'die Stärke aus der Dichte der Linien'), netforce: L('the net force on a dipole', 'die Gesamtkraft auf einen Dipol'),
      torque: L('the torque on a dipole', 'das Drehmoment auf einen Dipol'), perp: L('equipotentials at right angles to the field lines', 'Äquipotentiallinien senkrecht zu den Feldlinien'),
      spacing: L('the spacing of equipotentials', 'die Abstände der Äquipotentiallinien'), eqsum: L('the equipotentials of several charges together (they never cross)', 'die Äquipotentiallinien mehrerer Ladungen zusammen (sie kreuzen sich nie)'), downhill: L('the field from high to low potential', 'das Feld von hohem zu tiefem Potential'),
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
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('ef-mode', m);
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
      make: (type, seed) => X.make(type, seed), typeOf, typeIsMade: true,
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
    tutor = window.createTutor(lessons(), { after: () => window.DipoleAnim.start($('#t-figure')), done: practise, practise: (i) => { topics.go(LESSONS[i].topic, LESSONS[i].stage); setMode('practice'); fresh(); } });
    checker = Check.create(checkSource, {
      math: () => {}, markScrollable: () => {}, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (t) => { topics.go(t); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    const last = stored('ef-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
