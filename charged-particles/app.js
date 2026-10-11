(function () {
  'use strict';

  const M = window.Particles, X = window.PartEx, P = window.PartPlot;
  const { pathFig } = P;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Charged Particles in Fields', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Blue: velocity or current, green: magnetic field, ochre: electric field, red: force, violet: the path; ⊙ points out of the page, ⊗ into it.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', option: (k) => `Option ${k}`,
      revealNote: (n) => `The solution unlocks once you have solved the exercise, used all hints or made ${n} attempts.`,
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check.', okWell: 'All correct, well done!',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', notAll: 'Not all the answers that fit are chosen yet.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), missed: 'This one fits too:', shown: 'The right answers are marked.',
    },
    de: {
      title: 'Geladene Teilchen in Feldern', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Blau: Geschwindigkeit oder Strom, grün: Magnetfeld, ocker: elektrisches Feld, rot: Kraft, violett: die Bahn; ⊙ zeigt aus der Seite heraus, ⊗ in sie hinein.',
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
  function showScore() { const s = stored('cp-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
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
    const nudge = (w) => {
      if (done) return w;
      let t = w || '';
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
          if (chosen && !o.ok) notes.push(nudge(o.why));
          if (!chosen && q.multi && o.ok) notes.push(done ? `${ui().missed} ${o.why}` : ui().notAll);
          if (chosen !== o.ok && (chosen || q.multi)) all = false;
        });
        $(`[data-fb="${q.key}"]`).innerHTML = [...new Set(notes)].map((n) => `<li>${n}</li>`).join('');
        continue;
      }
      const o = q.options[on[0]], row = $(`.field[data-key="${q.key}"]`);
      row.className = `field ${o.ok ? 'ok' : 'bad'}`;
      row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o.why);
      if (!o.ok) all = false;
    }
    return all ? true : missing && !document.querySelector('.field.bad, .cand.bad, .tile.bad, .tile.miss, .stmts li.bad, .stmts-fb:not(:empty)') ? null : false;
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'cp', typeOf = (e) => e.type;
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
    const s = stored('cp-score', { solved: 0, clean: 0 });
    s.solved++;
    if (st.tries === 1 && st.hints === 0) s.clean++;
    store('cp-score', s);
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
  const frame = (title, text, figure) => ({ text: `<p class="step-rule">${title}</p>${text}`, figure: `<div class="figs">${figure}</div>` });
  const fig = (html) => `<div class="fig">${html}</div>`;
  // a parabola through the capacitor (capFig), deflected by y at the end of the plates
  const parabola = (y) => { const o = [[0, 0]]; for (let x = 0; x <= 1.0001; x += 0.02) o.push([x, x < 0.09 ? 0 : -y * ((x - 0.09) / 0.91) ** 2]); return o; };
  // a charge flying to the right into a field into the page (pathFig): k = q/(m·v) in units of the box
  const BOX = { box: [-1, 6, -3.2, 3.2], region: [1, 6, -3.2, 3.2], bz: -1 };
  const run = (k) => M.path({ x0: -0.6, y0: 0.5, vx: 1, vy: 0, k, Bz: () => -1, inside: (x) => x >= 1, dt: 0.02, n: 900, stop: (x, y) => x < -1.2 || Math.abs(y) > 3.5 });
  const LESSONS = [
    { topic: 0, stage: 0, name: () => L('Acceleration voltage', 'Beschleunigungsspannung'), idea: () => L('Through a voltage U, a charge gains the kinetic energy |q|·U: in eV, simply its charge in e times U in V.', 'Mit einer Spannung U gewinnt eine Ladung die kinetische Energie |q|·U: in eV einfach ihre Ladung in e mal U in V.'),
      frames: () => [
        frame(L('Energy from the field', 'Energie aus dem Feld'), `<p>${L('A proton starts at rest at the + plate. The field pushes it to the grid at the − side and does the work W = q·U on it, with U = φ<sub>start</sub> − φ<sub>end</sub> the voltage it runs through: ΔE_kin = q·U. Through 2000 V, a proton gains 2000 eV = 2 keV, whatever the distance between plate and grid.', 'Ein Proton startet in Ruhe bei der +-Platte. Das Feld treibt es zum Gitter auf der −-Seite und verrichtet an ihm die Arbeit W = q·U, mit U = φ<sub>Start</sub> − φ<sub>Ende</sub> der durchlaufenen Spannung: ΔE_kin = q·U. Mit 2000 V gewinnt ein Proton 2000 eV = 2 keV, unabhängig vom Abstand zwischen Platte und Gitter.')}</p>`, fig(P.accelFig({ q: 1, sym: 'p' }))),
        frame(L('A negative charge', 'Eine negative Ladung'), `<p>${L('An electron is pulled the other way: it starts at the − plate and flies towards +. Now q and U = φ<sub>start</sub> − φ<sub>end</sub> are both negative, so q·U is positive again: the charge goes where its potential energy falls, and the field does positive work on it. That is why the energy gained is simply written |q|·U, with U the size of the voltage.', 'Ein Elektron wird in die Gegenrichtung gezogen: Es startet bei der −-Platte und fliegt zu +. Jetzt sind q und U = φ<sub>Start</sub> − φ<sub>Ende</sub> beide negativ, also ist q·U wieder positiv: Die Ladung geht dorthin, wo ihre potentielle Energie abnimmt, und das Feld verrichtet positive Arbeit an ihr. Darum schreibt man die gewonnene Energie einfach als |q|·U, mit U dem Betrag der Spannung.')}</p>`, fig(P.accelFig({ q: -1, sym: 'e⁻' }))),
        frame(L('The electronvolt', 'Das Elektronvolt'), `<p>${L('1 eV is the energy of one elementary charge moved through 1 V: 1 eV = 1.602 · 10<sup>−19</sup> J. In eV the energy is just the charge in e times the voltage in V: an alpha particle (2e) through 3 kV gains 6 keV; a “30 MeV Pb²⁺ ion” has gone through 15 MV.', '1 eV ist die Energie einer Elementarladung, die 1 V durchläuft: 1 eV = 1.602 · 10<sup>−19</sup> J. In eV ist die Energie einfach die Ladung in e mal die Spannung in V: Ein Alphateilchen (2e) gewinnt mit 3 kV 6 keV; ein «30-MeV-Pb²⁺-Ion» hat 15 MV durchlaufen.')}</p>`, ''),
        frame(L('Comparing speeds', 'Geschwindigkeiten vergleichen'), `<p>${L('From ½·m·v² = |q|·U: v = √(2·|q|·U/m). Twice the voltage gives twice the energy, but only √2 times the speed. A proton and an alpha particle through the same voltage: the alpha particle gets twice the energy (2e), but has four times the mass: its speed is √(2/4) = 1/√2 times the proton’s.', 'Aus ½·m·v² = |q|·U: v = √(2·|q|·U/m). Doppelte Spannung ergibt doppelte Energie, aber nur √2-fache Geschwindigkeit. Ein Proton und ein Alphateilchen mit derselben Spannung: Das Alphateilchen erhält die doppelte Energie (2e), hat aber die vierfache Masse: Seine Geschwindigkeit ist √(2/4) = 1/√2-mal die des Protons.')}</p>`, ''),
      ] },
    { topic: 1, stage: 0, name: () => L('Into a capacitor', 'In einen Kondensator'), idea: () => L('A constant force: a charge flying across a capacitor moves on a parabola, like a ball thrown horizontally, and gets faster.', 'Eine konstante Kraft: Eine Ladung, die quer durch einen Kondensator fliegt, bewegt sich auf einer Parabel, wie ein waagrecht geworfener Ball, und wird schneller.'),
      frames: () => [
        frame(L('A parabola', 'Eine Parabel'), `<p>${L('Between the plates the force q·E is the same everywhere. Along the plates the speed stays the same, across them the charge accelerates evenly with a = q·E/m: a parabola, towards the negative plate for a positive charge.', 'Zwischen den Platten ist die Kraft q·E überall gleich. Längs der Platten bleibt die Geschwindigkeit gleich, quer dazu wird die Ladung gleichmässig mit a = q·E/m beschleunigt: eine Parabel, zur negativen Platte für eine positive Ladung.')}</p>`,
          fig(P.capFig({ top: 1, q: 1, field: true, v: true, pts: parabola(0.85) }))),
        frame(L('Faster as well', 'Auch schneller'), `<p>${L('The electron is pulled against the field, towards the positive plate (a positive charge would go towards the negative one). Either way it moves partly along the force: the electric force does work on it, and its speed grows. It gains the energy |q|·U, with U the voltage between where it enters and where it leaves. Remember this for the magnetic field, where it is different.', 'Das Elektron wird entgegen dem Feld zur positiven Platte gezogen (eine positive Ladung ginge zur negativen). So oder so bewegt es sich teilweise in Richtung der Kraft: Die elektrische Kraft verrichtet Arbeit an ihm, und seine Geschwindigkeit wächst. Es gewinnt die Energie |q|·U, mit U der Spannung zwischen Eintritts- und Austrittsstelle. Merke dir das für das Magnetfeld, wo es anders ist.')}</p>`,
          fig(P.capFig({ top: -1, q: -1, sym: 'e⁻', field: true, v: true, pts: parabola(0.6) }))),
        frame(L('Comparing deflections', 'Ablenkungen vergleichen'), `<p>${L('The deflection by the end of the plates is y = ½·a·t² = |q|·U·L²/(2·m·d·v²). To compare two experiments, take the factor of each quantity: an alpha particle has twice the charge and four times the mass of a proton, so at the same speed it is deflected half as far. Twice as fast: a quarter of the deflection.', 'Die Ablenkung bis zum Ende der Platten ist y = ½·a·t² = |q|·U·L²/(2·m·d·v²). Um zwei Versuche zu vergleichen, nimm den Faktor jeder Grösse: Ein Alphateilchen hat die doppelte Ladung und die vierfache Masse eines Protons, wird also bei gleicher Geschwindigkeit halb so weit abgelenkt. Doppelt so schnell: ein Viertel der Ablenkung.')}</p>`,
          fig(P.capFig({ top: 1, q: 1, sym: 'α', field: true, pts: parabola(0.42) }))),
      ] },
    { topic: 2, stage: 0, name: () => L('On a circle', 'Auf einem Kreis'), idea: () => L('The magnetic force is always perpendicular to the velocity: it does no work, and the charge circles at constant speed.', 'Die magnetische Kraft steht immer senkrecht zur Geschwindigkeit: Sie verrichtet keine Arbeit, und die Ladung kreist mit konstantem Betrag der Geschwindigkeit.'),
      frames: () => [
        frame(L('Into the field', 'Ins Feld hinein'), `<p>${L('A proton flies into a field that points into the page. Right hand: the force points up, perpendicular to the velocity. As the proton turns, the force turns with it: always towards the centre of a circle.', 'Ein Proton fliegt in ein Feld, das in die Seite hinein zeigt. Rechte Hand: Die Kraft zeigt nach oben, senkrecht zur Geschwindigkeit. Während sich das Proton dreht, dreht die Kraft mit: immer zum Mittelpunkt eines Kreises.')}</p>`, fig(pathFig({ ...BOX, q: 1, pts: run(1 / 1.4) }))),
        frame(L('No work', 'Keine Arbeit'), `<p>${L('Work is W = F·s·cos α. The magnetic force is perpendicular to the motion at every moment (α = 90°): it does no work. The kinetic energy stays the same, and so does the speed; only the direction changes. In the capacitor, the force had a part along the motion: there the speed grew. A magnetic field can bend a charge, but never speed it up or slow it down.', 'Arbeit ist W = F·s·cos α. Die magnetische Kraft steht in jedem Moment senkrecht zur Bewegung (α = 90°): Sie verrichtet keine Arbeit. Die kinetische Energie bleibt gleich, also auch der Betrag der Geschwindigkeit; nur die Richtung ändert sich. Im Kondensator hatte die Kraft einen Teil in Bewegungsrichtung: Dort wuchs die Geschwindigkeit. Ein Magnetfeld kann eine Ladung ablenken, aber nie schneller oder langsamer machen.')}</p>`, fig(pathFig({ ...BOX, q: -1, sym: 'e⁻', pts: run(-1 / 1.4) }))),
        frame(L('The radius', 'Der Radius'), `<p>${L('The magnetic force is the centripetal force: q·v·B = m·v²/r, so r = m·v/(q·B). Faster or heavier: a wider circle; more charge or a stronger field: a tighter one.', 'Die magnetische Kraft ist die Zentripetalkraft: q·v·B = m·v²/r, also r = m·v/(q·B). Schneller oder schwerer: ein weiterer Kreis; mehr Ladung oder ein stärkeres Feld: ein engerer.')}</p>`, fig(pathFig({ ...BOX, q: 1, pts: run(1 / 2) }))),
        frame(L('The period', 'Die Umlaufzeit'), `<p>${L('One turn takes T = 2π·r/v = 2π·m/(q·B): the speed cancels out. A faster charge runs a larger circle in the same time. The cyclotron is built on this.', 'Ein Umlauf dauert T = 2π·r/v = 2π·m/(q·B): Die Geschwindigkeit kürzt sich heraus. Eine schnellere Ladung läuft einen grösseren Kreis in derselben Zeit. Darauf beruht das Zyklotron.')}</p>`, fig(pathFig({ ...BOX, q: 1, pts: run(1 / 1) }))),
      ] },
    { topic: 3, stage: 0, name: () => L('Comparing circles', 'Kreise vergleichen'), idea: () => L('r = m·v/(q·B): compare with ratios instead of calculating; the period T = 2π·m/(q·B) does not depend on the speed.', 'r = m·v/(q·B): mit Verhältnissen vergleichen statt rechnen; die Umlaufzeit T = 2π·m/(q·B) hängt nicht von der Geschwindigkeit ab.'),
      frames: () => [
        frame(L('Ratios, not numbers', 'Verhältnisse statt Zahlen'), `<p>${L('A proton (1 u, e) and an alpha particle (4 u, 2e) at the same speed in the same field: r ∝ m/q, 4/2 against 1/1. The alpha particle’s circle is twice as large, and its period twice as long. A deuteron (2 u, e) has the same m/q as the alpha particle: the same circle.', 'Ein Proton (1 u, e) und ein Alphateilchen (4 u, 2e) mit derselben Geschwindigkeit im selben Feld: r ∝ m/q, 4/2 gegen 1/1. Der Kreis des Alphateilchens ist doppelt so gross und seine Umlaufzeit doppelt so lang. Ein Deuteron (2 u, e) hat dasselbe m/q wie das Alphateilchen: denselben Kreis.')}</p>`, fig(pathFig({ ...BOX, q: 1, sym: 'α', pts: run(1 / 2.2) }))),
        frame(L('Faster: wider, not quicker', 'Schneller: weiter, nicht rascher'), `<p>${L('Twice as fast, the circle is twice as large: r = m·v/(q·B). Its length 2π·r doubles too, and the charge covers it at twice the speed: one turn takes exactly as long as before. In a field twice as strong, the circle and the period both halve.', 'Doppelt so schnell ist der Kreis doppelt so gross: r = m·v/(q·B). Sein Umfang 2π·r verdoppelt sich auch, und die Ladung durchläuft ihn mit doppelter Geschwindigkeit: Ein Umlauf dauert genau gleich lang wie vorher. In einem doppelt so starken Feld halbieren sich Kreis und Umlaufzeit.')}</p>`, fig(pathFig({ ...BOX, q: 1, pts: run(1 / 2.8) }))),
        frame(L('Tracks in a bubble chamber', 'Spuren in einer Blasenkammer'), `<p>${L('In a bubble chamber, the way a track turns tells the sign of the charge (hand rule), and its radius r = p/(q·B) the momentum: the straighter, the larger. A track that spirals inwards belongs to a particle that loses energy in the liquid; the magnetic field itself never slows it down. Charge and momentum are conserved: an uncharged particle that turns into charged ones makes as many positive as negative ones, and they fly on roughly in its direction.', 'In einer Blasenkammer zeigt die Drehrichtung einer Spur das Vorzeichen der Ladung (Handregel), und ihr Radius r = p/(q·B) den Impuls: je gerader, desto grösser. Eine Spur, die nach innen spiralt, gehört zu einem Teilchen, das in der Flüssigkeit Energie verliert; das Magnetfeld selbst bremst es nie ab. Ladung und Impuls bleiben erhalten: Ein ungeladenes Teilchen, das sich in geladene umwandelt, ergibt gleich viele positive wie negative, und sie fliegen ungefähr in seiner Richtung weiter.')}</p>`, X.make('tracks', 5).figs),
      ] },
    { topic: 4, stage: 0, name: () => L('Crossed fields', 'Gekreuzte Felder'), idea: () => L('An electric and a magnetic force in opposite directions cancel at exactly one speed, v = E/B. In a conductor, the same balance gives the Hall voltage.', 'Eine elektrische und eine magnetische Kraft in entgegengesetzten Richtungen heben sich bei genau einer Geschwindigkeit auf, v = E/B. In einem Leiter ergibt dasselbe Gleichgewicht die Hall-Spannung.'),
      frames: () => [
        frame(L('Two forces', 'Zwei Kräfte'), `<p>${L('A positive ion flies between two plates. The electric field pushes it down with q·E; the magnetic field (into the page) pushes it up with q·v·B (right hand).', 'Ein positives Ion fliegt zwischen zwei Platten. Das elektrische Feld drückt es mit q·E nach unten; das Magnetfeld (in die Seite hinein) drückt es mit q·v·B nach oben (rechte Hand).')}</p>`, fig(P.selectorFig({ Edown: true, bz: -1, q: 1, forces: true }))),
        frame(L('Straight through', 'Gerade durch'), `<p>${L('The forces cancel when q·E = q·v·B, so at v = E/B: the same for every charge and every mass. For a negative ion both forces turn round together. Faster ions are pushed the way of the magnetic force, slower ones the way of the electric force.', 'Die Kräfte heben sich auf, wenn q·E = q·v·B, also bei v = E/B: gleich für jede Ladung und jede Masse. Bei einem negativen Ion kehren beide Kräfte zusammen um. Schnellere Ionen werden in Richtung der magnetischen Kraft gedrückt, langsamere in Richtung der elektrischen.')}</p>`, fig(P.selectorFig({ Edown: true, bz: -1, q: -1, forces: true }))),
        frame(L('The Hall effect', 'Der Hall-Effekt'), `<p>${L(`A copper strip carries a current to the right in a field into the page. The current is carried by electrons moving to the left. Left hand: the magnetic force pushes them ${X.dirName(M.force(-1, [-1, 0, 0], [0, 0, -1]))}: the upper edge becomes negative, the lower edge, short of electrons, positive. Positive charge carriers, moving to the right, would be pushed up too and make the upper edge positive: the sign of the Hall voltage tells the sign of the moving charges.`, `Ein Kupferstreifen führt einen Strom nach rechts in einem Feld, das in die Seite hinein zeigt. Der Strom wird von Elektronen getragen, die sich nach links bewegen. Linke Hand: Die magnetische Kraft drückt sie ${X.dirName(M.force(-1, [-1, 0, 0], [0, 0, -1]))}: Der obere Rand wird negativ, der untere, wo Elektronen fehlen, positiv. Positive Ladungsträger, die sich nach rechts bewegen, würden auch nach oben gedrückt und den oberen Rand positiv machen: Das Vorzeichen der Hall-Spannung zeigt das Vorzeichen der bewegten Ladungen.`)}</p>`, fig(P.hallFig({ I: 1, bz: -1 }))),
        frame(L('The Hall voltage', 'Die Hall-Spannung'), `<p>${L('The charged edges make an electric field across the strip, which pushes the electrons back. It grows until the electric force e·E balances the magnetic force e·v·B, just as in the velocity selector: then the electrons flow straight along the strip. With E = v·B, the voltage across a strip of width d is U<sub>H</sub> = v·B·d: proportional to the field. That is how a Hall probe measures B.', 'Die geladenen Ränder erzeugen ein elektrisches Feld quer zum Streifen, das die Elektronen zurückdrückt. Es wächst, bis die elektrische Kraft e·E der magnetischen Kraft e·v·B das Gleichgewicht hält, genau wie im Geschwindigkeitsfilter: Dann fliessen die Elektronen gerade längs des Streifens. Mit E = v·B ist die Spannung über einem Streifen der Breite d U<sub>H</sub> = v·B·d: proportional zum Feld. So misst eine Hall-Sonde B.')}</p>`, fig(P.hallFig({ I: 1, bz: -1, edges: -1 }))),
      ] },
  ];
  const stage = (name, types) => ({ name, types });
  const TOPICS = [
    { name: () => L('Acceleration voltage', 'Beschleunigungsspannung'), example: () => 0, stages: [stage(() => L('electronvolt', 'Elektronvolt'), ['ev']), stage(() => L('energy', 'Energie'), ['accel']), stage(() => L('stopping', 'abbremsen'), ['stop']), stage(() => L('comparing', 'vergleichen'), ['accel-compare'])] },
    { name: () => L('Into a capacitor', 'In einen Kondensator'), example: () => 1, stages: [stage(() => L('the path', 'die Bahn'), ['deflect-path']), stage(() => L('two deflections', 'zwei Ablenkungen'), ['deflect-compare'])] },
    { name: () => L('Into a magnetic field', 'In ein Magnetfeld'), example: () => 2, stages: [stage(() => L('the path', 'die Bahn'), ['path-circle']), stage(() => L('the speed', 'die Geschwindigkeit'), ['speed'])] },
    { name: () => L('Radius and period', 'Radius und Umlaufzeit'), example: () => 3, stages: [stage(() => L('comparing', 'vergleichen'), ['radius-compare']), stage(() => L('tracks', 'Spuren'), ['tracks'])] },
    { name: () => L('Crossed fields', 'Gekreuzte Felder'), example: () => 4, stages: [stage(() => L('velocity selector', 'Geschwindigkeitsfilter'), ['selector']), stage(() => L('field direction', 'Feldrichtung'), ['crossed-dir']), stage(() => L('Hall voltage', 'Hall-Spannung'), ['hall'])] },
    { name: () => L('True or false', 'Richtig oder falsch'), example: () => 2, stages: [stage(() => L('statements', 'Aussagen'), ['stmts'])] },
  ];
  const lessons = () => LESSONS.map((l) => ({ name: l.name(), idea: l.idea(), frames: l.frames, also: topics.also(l.topic) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the questions it is asked about, its worked
  // example and its practice topic. A kind is a practice type (its one question), or a type and the
  // key of one of its questions (selector:v). The kinds of an objective are taken in turn, so they
  // alternate between its exercises.
  const OBJECTIVES = [
    { id: 'accel', kinds: ['accel:E', 'ev', 'accel-compare:v', 'stop:U', 'accel:k', 'accel-compare:E', 'accel:J'], tutor: 0, topic: 0,
      name: () => L('Apply ΔE_kin = |q|·U to a charge accelerated through a voltage, and give its energy in electronvolts.',
        'ΔE_kin = |q|·U auf eine Ladung anwenden, die mit einer Spannung beschleunigt wird, und ihre Energie in Elektronvolt angeben.') },
    { id: 'work', kinds: ['path-circle', 'speed:m', 'deflect-path', 'speed:why', 'speed:e', 'speed:turns'], tutor: 2, topic: 2,
      name: () => L('Explain why a magnetic field changes the direction of a charge but not its speed: the magnetic force does no work, unlike the electric force in a capacitor.',
        'Erklären, warum ein Magnetfeld die Richtung einer Ladung ändert, aber nicht ihre Geschwindigkeit: Die magnetische Kraft verrichtet keine Arbeit, anders als die elektrische Kraft im Kondensator.') },
    { id: 'radius', kinds: ['radius-compare:r', 'radius-compare:p', 'tracks:p', 'radius-compare:T', 'radius-compare:c'], tutor: 3, topic: 3,
      name: () => L('Relate the radius r = m·v/(q·B) of the circular path to mass, speed, charge and field by ratios, and explain why the period does not depend on the speed.',
        'Den Radius r = m·v/(q·B) der Kreisbahn mit Verhältnissen auf Masse, Geschwindigkeit, Ladung und Feld zurückführen und erklären, warum die Umlaufzeit nicht von der Geschwindigkeit abhängt.') },
    { id: 'crossed', kinds: ['selector:v', 'hall:edge', 'crossed-dir:dir', 'selector:fast', 'hall:b', 'selector:sign', 'hall:u', 'crossed-dir:dir', 'selector:heavy'], tutor: 4, topic: 4,
      name: () => L('Find the speed that passes crossed electric and magnetic fields undeflected, and explain how the Hall voltage builds up.',
        'Die Geschwindigkeit bestimmen, mit der eine Ladung gekreuzte elektrische und magnetische Felder unabgelenkt durchfliegt, und erklären, wie die Hall-Spannung entsteht.') },
  ];
  const CONCEPT = {
    charge: 'charge', half: 'formula', unit: 'unit', sqrt: 'sqrt', mass: 'mass',
    hand: 'hand', parabola: 'shape', circle: 'shape', straight: 'perp', bent: 'neutral', sign: 'side', work: 'work', efield: 'efield', perp: 'perp',
    inverse: 'ratio', same: 'ratio', curl: 'ratio', period: 'period',
    inv: 'selector', fast: 'selector', hallsign: 'hallsign', none: 'perp', balance: 'balance',
  };
  // one question of a practice exercise, with four options
  function checkQuestion(kind, seed) {
    const [type, key] = kind.split(':'), e = X.make(type, seed);
    const q = key ? e.questions.find((x) => x.key === key) : e.questions[seed % e.questions.length];
    return {
      title: e.title, text: e.text, figure: `<div class="figs">${e.figs || ''}</div>`, ask: q.label.replace(/^\([a-d]\) /, '').replace(/^./, (c) => c.toUpperCase()),
      options: q.options.map((o) => ({ html: o.html || o.label, correct: o.ok, flag: o.ok ? null : o.tag || 'other', why: o.why })),
      explain: () => `${e.solFig || ''}<div class="steps">${e.solution.map((s) => `<p>${s}</p>`).join('')}</div>`,
      key: `${e.id}|${q.key}`,
    };
  }
  const checkSource = {
    id: 'cp',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: CONCEPT,
    concepts: () => ({
      charge: L('the charge in e (an alpha particle carries 2e)', 'die Ladung in e (ein Alphateilchen trägt 2e)'), formula: L('E_kin = |q|·U, without a ½', 'E_kin = |q|·U, ohne ½'),
      unit: L('the prefixes of eV, keV and MeV', 'die Vorsätze bei eV, keV und MeV'), sqrt: L('the speed grows with the square root of the energy', 'die Geschwindigkeit wächst mit der Wurzel aus der Energie'),
      mass: L('the energy |q|·U does not depend on the mass', 'die Energie |q|·U hängt nicht von der Masse ab'),
      hand: L('which way the charge turns (its sign, the hand rule)', 'in welche Richtung die Ladung dreht (ihr Vorzeichen, die Handregel)'),
      shape: L('a circle in a magnetic field, a parabola in an electric one', 'ein Kreis im Magnetfeld, eine Parabel im elektrischen Feld'),
      perp: L('the magnetic force perpendicular to motion and field', 'die magnetische Kraft senkrecht zu Bewegung und Feld'), neutral: L('no force on a neutral particle', 'keine Kraft auf ein neutrales Teilchen'),
      side: L('the side a charge is pushed to', 'die Seite, zu der eine Ladung gedrückt wird'),
      work: L('a magnetic force that changes the speed', 'eine magnetische Kraft, die den Betrag der Geschwindigkeit ändert'), efield: L('the electric force doing work', 'die elektrische Kraft verrichtet Arbeit'),
      ratio: L('r = m·v/(q·B) as a ratio', 'r = m·v/(q·B) als Verhältnis'), period: L('a period that changes with the speed', 'eine Umlaufzeit, die sich mit der Geschwindigkeit ändert'),
      selector: L('the balance q·E = q·v·B', 'das Gleichgewicht q·E = q·v·B'),
      hallsign: L('the edge the moving charges are pushed to', 'der Rand, an den die bewegten Ladungen gedrückt werden'), balance: L('when the Hall voltage stops growing', 'wann die Hall-Spannung nicht mehr wächst'),
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
  // Practice: random exercises; tutor: worked examples; check: a short test on the learning
  // objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('cp-mode', m);
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
    if (h === 'check') { if ($('#ck').hidden) checkMode(); return true; }
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
    const last = stored('cp-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
