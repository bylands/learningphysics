(function () {
  'use strict';

  const A = window.Accel, X = window.AvEx;
  const Lang = window.Lang, Check = window.Check;
  // the texts with their indices as subscripts (V_A → V<sub>A</sub>, exercises.js); the labels of a
  // drawing take Lang.L, the drawing sets their indices itself (accel.js)
  const L = (en, de) => X.subs(Lang.L(en, de));
  const LR = (en, de) => Lang.L(en, de);
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Acceleration Voltage', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', explore: 'Explore', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Gold: field lines, green dashed: equipotentials, blue: velocity. Bars: potential energy blue, kinetic energy red, total grey.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: (n) => `The solution unlocks once you have solved the exercise, used all hints or made ${n} attempts.`,
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check.', okWell: 'All correct, well done!',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', shown: 'The right answers are marked.',
    },
    de: {
      title: 'Beschleunigungsspannung', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', explore: 'Erkunden', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Gold: Feldlinien, grün gestrichelt: Äquipotentiallinien, blau: Geschwindigkeit. Balken: potentielle Energie blau, kinetische Energie rot, Summe grau.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: (n) => `Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder ${n} Versuche gemacht hast.`,
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann.', okWell: 'Alles richtig, gut gemacht!',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Tipp.', shown: 'Die richtigen Antworten sind markiert.',
    },
  };
  const ui = () => {
    const t = UI[Lang.get()];
    return { ...t, ruleNote: X.subs(t.ruleNote) };
  };

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('av-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;

  // ---------------------------------------------------------------- questions
  // choice: a row of options; pick: drawings (energy bars) to choose from
  function questionHtml(q) {
    if (q.type === 'pick') {
      return `<p class="ask">${q.label}</p><div class="cands" role="radiogroup">${q.options.map((o, k) => `<label class="cand" data-k="${k}"><input type="radio" name="q-${q.key}" value="${k}"><span class="letter">${k + 1}</span>${o.html}</label>`).join('')}</div><ul class="qfb" data-fb="${q.key}"></ul>`;
    }
    return `<div class="field" data-key="${q.key}"><span class="what">${q.label}</span><div class="opts" role="radiogroup">${q.options.map((o, k) => `<label><input type="radio" name="q-${q.key}" value="${k}"><span>${o.label}</span></label>`).join('')}</div><span class="fb" aria-live="polite"></span></div>`;
  }
  // Marks every answer; true if all are right, null if one is missing. While the exercise is open,
  // a wrong answer gets a nudge, not the solution.
  function feedback() {
    let all = true, missing = false;
    const done = st && (st.solved || st.revealed);
    const nudge = (w, n) => {
      if (done) return w;
      let t = n || w || '';
      for (const s of ex.solution) if (s) t = t.split(s).join('');
      for (const s of ex.solution) for (const x of String(s || '').split(/(?<=[.!?])\s+/)) if (x.length > 3) t = t.split(x).join('');
      t = t.replace(/\s+/g, ' ').trim();
      return t || ui().notThis;
    };
    for (const q of ex.questions) {
      const inputs = [...document.querySelectorAll(`input[name="q-${q.key}"]`)], on = inputs.filter((x) => x.checked).map((x) => Number(x.value));
      if (!on.length) { all = false; missing = true; continue; }
      if (q.type === 'pick') {
        const notes = [];
        inputs.forEach((x) => {
          const o = q.options[Number(x.value)], el = x.closest('.cand');
          el.classList.remove('ok', 'bad');
          if (x.checked) { el.classList.add(o.ok ? 'ok' : 'bad'); if (!o.ok) { notes.push(nudge(o.why, o.nudge)); all = false; } }
        });
        $(`[data-fb="${q.key}"]`).innerHTML = notes.map((n) => `<li>${n}</li>`).join('');
        continue;
      }
      const o = q.options[on[0]], row = $(`.field[data-key="${q.key}"]`);
      row.className = `field ${o.ok ? 'ok' : 'bad'}`;
      row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o.why, o.nudge);
      if (!o.ok) all = false;
    }
    return all ? true : missing && !document.querySelector('.field.bad, .cand.bad') ? null : false;
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'av', typeOf = (e) => e.type;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };
  const maxTries = () => (ex.questions.length === 1 ? 2 : 3);
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
    const s = stored('av-score', { solved: 0, clean: 0 });
    s.solved++;
    if (st.tries === 1 && st.hints === 0) s.clean++;
    store('av-score', s);
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
  function markRight() {
    for (const q of ex.questions) q.options.forEach((o, k) => { document.querySelector(`input[name="q-${q.key}"][value="${k}"]`).checked = o.ok; });
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
  // Worked examples, one per topic (the race a second one for comparing): the steps in order, and
  // the wrong idea each step avoids. Gold: field lines, blue: velocity; bars: E_pot blue, E_kin red.
  const frame = (title, text, figure) => ({ text: `<p class="step-rule">${title}</p>${text}`, figure: `<div class="figs">${figure}</div>` });
  const fig = (html) => `<div class="fig">${html}</div>`;
  const P = (en, de) => `<p>${L(en, de)}</p>`;
  const eV = X.eV;
  // the scene of example 1: a proton from A (800 V) to B (200 V) on the middle field line
  const SC1 = () => X.abScene(null, 800, 200, { y0: 0.1 });
  const ab1 = (o = {}) => fig(X.abFig(SC1(), { VA: LR('V_A = 800 V', 'Φ_A = 800 V'), VB: LR('V_B = 200 V', 'Φ_B = 200 V'), ...o }));
  const vp = (E) => X.vOf(E, A.PARTS.p.m);
  const PLATES = { kind: 'plates', VL: 0, VR: 5000 };
  const gunFig = (o = {}) => fig(A.fieldFig(PLATES, { tops: [{ x: -A.PX, label: LR('cathode 0 V', 'Kathode 0 V') }, { x: A.PX, label: LR('anode 5 kV', 'Anode 5 kV') }], ...o, label: LR('An electron gun: cathode and anode', 'Eine Elektronenkanone: Kathode und Anode') }));
  const rm = (2 * 79 * A.KE) / 5; // fm
  const LESSONS = [
    { topic: 0, stage: 0, name: () => L('From A to B', 'Von A nach B'), idea: () => L('The field does the work W = q·(V_A − V_B) on a charge from A to B: its kinetic energy changes by W, its potential energy by −W.', 'Das Feld verrichtet an einer Ladung von A nach B die Arbeit W = q·(Φ_A − Φ_B): Ihre kinetische Energie ändert sich um W, ihre potentielle um −W.'),
      frames: () => [
        frame(L('The task', 'Die Aufgabe'), P(`A proton passes A, where the potential is V_A = 800 V, with a kinetic energy of 200 eV (v_A = ${X.speed(vp(200))}). It moves to B, where V_B = 200 V. How do its kinetic energy and its speed change?`, `Ein Proton durchläuft A, wo das Potential Φ_A = 800 V ist, mit einer kinetischen Energie von 200 eV (v_A = ${X.speed(vp(200))}). Es bewegt sich nach B, wo Φ_B = 200 V ist. Wie ändern sich seine kinetische Energie und seine Geschwindigkeit?`),
          ab1({ vA: 34, part: { q: 1, sym: 'q' } })),
        frame(L('Step 1: the voltage from A to B', 'Schritt 1: die Spannung von A nach B'), P(`${X.subs('V_AB = V_B − V_A')} = 200 V − 800 V = −600 V: in the order of the indices, end minus start. The potential falls from A to B, along the field lines: they point from high to low potential.`, `${X.subs('U_AB = Φ_B − Φ_A')} = 200 V − 800 V = −600 V: in der Reihenfolge der Indizes, Ende minus Anfang. Das Potential fällt von A nach B, in Richtung der Feldlinien: Sie zeigen von hohem zu tiefem Potential.`),
          ab1({ vA: 34, equi: [800, 200] })),
        frame(L('Step 2: the work of the field', 'Schritt 2: die Arbeit des Feldes'), P('W = q·(V_A − V_B) = −q·V_AB = e · (800 V − 200 V) = +600 eV. Positive: the field pushes the positive proton along the field lines, in the direction it moves. In eV the work is simply the charge in e times the potential difference in V.', 'W = q·(Φ_A − Φ_B) = −q·U_AB = e · (800 V − 200 V) = +600 eV. Positiv: Das Feld stösst das positive Proton in Richtung der Feldlinien, in seine Bewegungsrichtung. In eV ist die Arbeit einfach die Ladung in e mal die Potentialdifferenz in V.'),
          ab1({ vA: 34, part: { q: 1, sym: 'q' } })),
        frame(L('Step 3: energy bars', 'Schritt 3: Energiebalken'), P('E_pot = q·V: 800 eV at A, 200 eV at B. The potential energy falls by 600 eV, the kinetic energy grows by as much, from 200 eV to 800 eV. The total, 1000 eV, stays the same: no other force does work.', 'E_pot = q·Φ: 800 eV in A, 200 eV in B. Die potentielle Energie nimmt um 600 eV ab, die kinetische Energie um gleich viel zu, von 200 eV auf 800 eV. Die Summe, 1000 eV, bleibt gleich: Keine andere Kraft verrichtet Arbeit.'),
          fig(A.bars([{ name: 'A', pot: 800, kin: 200 }, { name: 'B', pot: 200, kin: 800 }], { values: eV }))),
        frame(L('Step 4: the speed at B', 'Schritt 4: die Geschwindigkeit in B'), P(`v_B = √(2·E_kin,B/m) = √(2 · 800 eV · 1.602·10⁻¹⁹ J/eV / 1.673·10⁻²⁷ kg) = ${X.speed(vp(800))}. Four times the kinetic energy, but only twice the speed (√4 = 2).`, `v_B = √(2·E_kin,B/m) = √(2 · 800 eV · 1.602·10⁻¹⁹ J/eV / 1.673·10⁻²⁷ kg) = ${X.speed(vp(800))}. Viermal so viel kinetische Energie, aber nur doppelt so schnell (√4 = 2).`),
          ab1({ vA: 30, vB: 60, part: { q: 1, sym: 'q' } })),
        frame(L('The path does not matter', 'Der Weg spielt keine Rolle'), P('Along any other path from A to B the field does the same work: it depends only on the potentials at the start and the end. The proton arrives at B with 800 eV, whether it flies straight or in a curve.', 'Auf jedem anderen Weg von A nach B verrichtet das Feld dieselbe Arbeit: Sie hängt nur von den Potentialen am Anfang und am Ende ab. Das Proton kommt mit 800 eV in B an, ob es gerade oder im Bogen fliegt.'),
          ab1({ vA: 34 })),
        frame(L('A negative charge', 'Eine negative Ladung'), P('An electron from A to B: W = q·(V_A − V_B) = (−e) · 600 V = −600 eV. The field pulls it backwards, against its motion: it loses 600 eV of kinetic energy and needs at least that much at A to get to B. Its potential energy E_pot = q·V rises, from −800 eV to −200 eV.', 'Ein Elektron von A nach B: W = q·(Φ_A − Φ_B) = (−e) · 600 V = −600 eV. Das Feld zieht es rückwärts, gegen seine Bewegung: Es verliert 600 eV kinetische Energie und braucht in A mindestens so viel, um nach B zu kommen. Seine potentielle Energie E_pot = q·Φ steigt, von −800 eV auf −200 eV.'),
          `${ab1({ vA: 50, vB: 20, part: { q: -1, sym: 'e⁻' } })}${fig(A.bars([{ name: 'A', pot: -800, kin: 1000 }, { name: 'B', pot: -200, kin: 400 }], { values: eV, H: 80 }))}`),
      ] },
    { topic: 1, stage: 0, name: () => L('Particle accelerators', 'Teilchenbeschleuniger'), idea: () => L('From rest through a voltage, a charge gains E_kin = |q|·|V_AB|: in eV, its charge in e times the voltage in V. The speed follows from ½·m·v².', 'Aus der Ruhe durch eine Spannung gewinnt eine Ladung E_kin = |q|·|U_AB|: in eV ihre Ladung in e mal die Spannung in V. Die Geschwindigkeit folgt aus ½·m·v².'),
      frames: () => [
        frame(L('An electron gun', 'Eine Elektronenkanone'), P('In an old television tube or an electron microscope, electrons leave a hot cathode at rest and are accelerated towards the anode, 5 kV higher, through a hole in it. Which plate must they start from, and how fast are they at the anode?', 'In einer alten Fernsehröhre oder einem Elektronenmikroskop verlassen Elektronen eine heisse Kathode in Ruhe und werden zur Anode beschleunigt, die 5 kV höher liegt, durch ein Loch in ihr. Bei welcher Platte müssen sie starten, und wie schnell sind sie bei der Anode?'),
          gunFig({ part: { x: -2.2, y: 0, q: -1, sym: 'e⁻' } })),
        frame(L('Step 1: which way', 'Schritt 1: welche Richtung'), P('The field points from the anode (high potential) to the cathode (low). The electron is negative: it is pulled against the field, towards higher potential, so it must start at the cathode. A proton would have to start at the anode.', 'Das Feld zeigt von der Anode (hohes Potential) zur Kathode (tiefes). Das Elektron ist negativ: Es wird gegen das Feld gezogen, zu höherem Potential, also muss es bei der Kathode starten. Ein Proton müsste bei der Anode starten.'),
          gunFig({ part: { x: -2.2, y: 0, q: -1, sym: 'e⁻' }, vels: [{ x: -2.2, y: 0, dx: 60, dy: 0, name: '' }] })),
        frame(L('Step 2: the energy', 'Schritt 2: die Energie'), P('W = q·(V_A − V_B) = (−e) · (0 V − 5000 V) = +5000 eV = 5 keV. From rest, that is all kinetic energy at the anode: E_kin = |q|·|V_AB|. It does not depend on the distance between the plates, nor on the mass.', 'W = q·(Φ_A − Φ_B) = (−e) · (0 V − 5000 V) = +5000 eV = 5 keV. Aus der Ruhe ist das bei der Anode alles kinetische Energie: E_kin = |q|·|U_AB|. Sie hängt weder vom Abstand der Platten noch von der Masse ab.'),
          fig(A.bars([{ name: LR('cathode', 'Kathode'), pot: 0, kin: 0 }, { name: LR('anode', 'Anode'), pot: -5000, kin: 5000 }], { values: eV, H: 80 }))),
        frame(L('Step 3: the speed', 'Schritt 3: die Geschwindigkeit'), P(`v = √(2·E_kin/m) = √(2 · 5000 · 1.602·10⁻¹⁹ J / 9.109·10⁻³¹ kg) = ${X.speed(X.vOf(5000, A.me))}, 14 % of the speed of light. (At much higher voltages, the formula of relativity is needed.)`, `v = √(2·E_kin/m) = √(2 · 5000 · 1.602·10⁻¹⁹ J / 9.109·10⁻³¹ kg) = ${X.speed(X.vOf(5000, A.me))}, 14 % der Lichtgeschwindigkeit. (Bei viel höheren Spannungen braucht es die Formel der Relativitätstheorie.)`),
          gunFig({ part: { x: 2.2, y: 0, q: -1, sym: 'e⁻' }, vels: [{ x: 2.2, y: 0, dx: 56, dy: 0, name: 'v' }] })),
        frame(L('Many gaps in a row', 'Viele Lücken hintereinander'), P(`A linear accelerator does not use one huge voltage but many gaps, the same voltage each time: the voltages are switched while the particle is inside a tube. After n gaps of 100 kV a proton has n · 100 keV; after 25 gaps 2.5 MeV. Its speed grows only with √n: after 25 gaps it is 5 times as fast as after the first one.`, `Ein Linearbeschleuniger braucht nicht eine riesige Spannung, sondern viele Lücken, jedes Mal mit derselben Spannung: Die Spannungen werden umgeschaltet, während das Teilchen in einer Röhre ist. Nach n Lücken von 100 kV hat ein Proton n · 100 keV; nach 25 Lücken 2.5 MeV. Seine Geschwindigkeit wächst nur mit √n: Nach 25 Lücken ist es 5-mal so schnell wie nach der ersten.`),
          fig(X.linacFig(8, 'p'))),
      ] },
    { topic: 2, stage: 0, name: () => L("Rutherford's experiment", 'Rutherfords Streuversuch'), idea: () => L('A charge flying against a field is slowed down: its kinetic energy turns into potential energy, until it stops and turns back.', 'Eine Ladung, die gegen ein Feld fliegt, wird gebremst: Ihre kinetische Energie wird zu potentieller Energie, bis sie anhält und umkehrt.'),
      frames: () => [
        frame(L('The task', 'Die Aufgabe'), P('Rutherford shot alpha particles (charge 2e) of 5 MeV at a thin gold foil (Z = 79). A few came straight back. How close does an alpha particle get to a gold nucleus when it flies straight at it? Around the nucleus, V = k·Z·e/r, with k·e² = 1.44 MeV·fm.', 'Rutherford schoss Alphateilchen (Ladung 2e) von 5 MeV auf eine dünne Goldfolie (Z = 79). Einige kamen geradewegs zurück. Wie nahe kommt ein Alphateilchen einem Goldkern, wenn es genau auf ihn zufliegt? Um den Kern ist Φ = k·Z·e/r, mit k·e² = 1.44 MeV·fm.'),
          fig(X.ruthFig(79, rm, 0.2))),
        frame(L('Far away', 'Weit weg'), P('Far from the nucleus the potential is zero: E_pot = 0, E_kin = 5 MeV. As it comes nearer, the potential rises and the positive alpha particle is pushed back: the field does negative work, and it slows down.', 'Weit weg vom Kern ist das Potential null: E_pot = 0, E_kin = 5 MeV. Wenn es näher kommt, steigt das Potential, und das positive Alphateilchen wird zurückgestossen: Das Feld verrichtet negative Arbeit, und es wird langsamer.'),
          fig(A.bars([{ name: LR('far away', 'weit weg'), pot: 0, kin: 5 }], { values: (x) => `${A.nice(x)} MeV`, H: 80 }))),
        frame(L('The closest point', 'Der nächste Punkt'), P(`At the closest point it stops for a moment: all 5 MeV are potential energy. q·V = 2e · k·Z·e/r_min = 5 MeV, so r_min = 2 · 79 · 1.44 MeV·fm / 5 MeV = ${A.nice(rm)} fm.`, `Im nächsten Punkt steht es kurz still: Alle 5 MeV sind potentielle Energie. q·Φ = 2e · k·Z·e/r_min = 5 MeV, also r_min = 2 · 79 · 1.44 MeV·fm / 5 MeV = ${A.nice(rm)} fm.`),
          fig(A.bars([{ name: LR('far away', 'weit weg'), pot: 0, kin: 5 }, { name: '2·r_min', pot: 2.5, kin: 2.5 }, { name: 'r_min', pot: 5, kin: 0 }], { values: (x) => `${A.nice(x)} MeV`, H: 80 }))),
        frame(L('On the way', 'Unterwegs'), P('At twice that distance the potential is half as large (V ∝ 1/r, not 1/r²): there the alpha particle has 2.5 MeV of potential and 2.5 MeV of kinetic energy. Twice the energy would bring it twice as close.', 'Im doppelten Abstand ist das Potential halb so gross (Φ ∝ 1/r, nicht 1/r²): Dort hat das Alphateilchen 2.5 MeV potentielle und 2.5 MeV kinetische Energie. Die doppelte Energie brächte es doppelt so nahe.'),
          fig(X.ruthFig(79, rm, 0.2))),
        frame(L("Rutherford's conclusion", 'Rutherfords Schluss'), P('The alpha particles turned back at about 45 fm without touching the nucleus: all the positive charge of the atom must sit in a nucleus smaller than that, while the atom is about 10⁵ fm across.', 'Die Alphateilchen kehrten bei etwa 45 fm um, ohne den Kern zu berühren: Die ganze positive Ladung des Atoms muss in einem Kern sitzen, der kleiner ist, während das Atom etwa 10⁵ fm gross ist.'), ''),
      ] },
    { topic: 3, stage: 0, name: () => L('Two particles compared', 'Zwei Teilchen verglichen'), idea: () => L('Through the same voltage, the energy depends only on the charge; the speed on the charge per mass, v = √(2·|q|·|V_AB|/m).', 'Mit derselben Spannung hängt die Energie nur von der Ladung ab, die Geschwindigkeit von der Ladung pro Masse, v = √(2·|q|·U/m).'),
      frames: () => [
        frame(L('The task', 'Die Aufgabe'), P('A proton (e, 1 u) and an alpha particle (2e, 4 u) are both accelerated from rest through 2 kV. Which gains more energy, which is faster?', 'Ein Proton (e, 1 u) und ein Alphateilchen (2e, 4 u) werden beide aus der Ruhe mit 2 kV beschleunigt. Welches gewinnt mehr Energie, welches ist schneller?'),
          fig(A.bars([{ name: 'p', pot: 0, kin: 1, unknown: true }, { name: 'α', pot: 0, kin: 2, unknown: true }], { H: 60 }))),
        frame(L('Step 1: the energies', 'Schritt 1: die Energien'), P('E_kin = |q|·|V_AB|: the proton 1e · 2 kV = 2 keV, the alpha particle 2e · 2 kV = 4 keV. Twice as much, because of twice the charge. The mass does not appear: the force is larger on the larger charge, whatever the mass.', 'E_kin = |q|·U: das Proton 1e · 2 kV = 2 keV, das Alphateilchen 2e · 2 kV = 4 keV. Doppelt so viel, wegen der doppelten Ladung. Die Masse kommt nicht vor: Die Kraft ist auf die grössere Ladung grösser, wie gross die Masse auch ist.'),
          fig(A.bars([{ name: 'p', pot: 0, kin: 2000 }, { name: 'α', pot: 0, kin: 4000 }], { values: eV, H: 70 }))),
        frame(L('Step 2: the speeds', 'Schritt 2: die Geschwindigkeiten'), P('v = √(2·|q|·|V_AB|/m): only the charge per mass differs. Proton: 1e per 1 u; alpha particle: 2e per 4 u, half as much. So v_α/v_p = √(1/2) ≈ 0.71: more energy, but slower.', 'v = √(2·|q|·U/m): Nur die Ladung pro Masse unterscheidet sich. Proton: 1e pro 1 u; Alphateilchen: 2e pro 4 u, halb so viel. Also v_α/v_p = √(1/2) ≈ 0.71: mehr Energie, aber langsamer.'), ''),
        frame(L('Same energy, very different speeds', 'Gleiche Energie, ganz verschiedene Geschwindigkeiten'), P('An electron through the same 2 kV gains the same 2 keV as the proton (its charge has the same size). But its mass is 1836 times smaller: it is √1836 ≈ 43 times as fast. A deuteron (e, 2 u) and an alpha particle (2e, 4 u) have the same charge per mass: they end up equally fast, the alpha particle with twice the energy.', 'Ein Elektron gewinnt mit denselben 2 kV dieselben 2 keV wie das Proton (seine Ladung ist gleich gross). Aber seine Masse ist 1836-mal kleiner: Es ist √1836 ≈ 43-mal so schnell. Ein Deuteron (e, 2 u) und ein Alphateilchen (2e, 4 u) haben dieselbe Ladung pro Masse: Sie werden gleich schnell, das Alphateilchen mit doppelt so viel Energie.'), ''),
      ] },
    { topic: 3, stage: 1, name: () => L('The race', 'Das Rennen'), idea: () => L('Who goes where, who gains most, who is fastest: the sign of the charge, its size, and the charge per mass.', 'Wer geht wohin, wer gewinnt am meisten, wer ist am schnellsten: das Vorzeichen der Ladung, ihr Betrag und die Ladung pro Masse.'),
      frames: () => [
        frame(L('The start', 'Der Start'), P('A proton, a neutron and an alpha particle start at rest on the equipotential line V_A = 800 V, an electron at rest on V_B = 200 V. On your marks …', 'Ein Proton, ein Neutron und ein Alphateilchen starten in Ruhe auf der Äquipotentiallinie Φ_A = 800 V, ein Elektron in Ruhe auf Φ_B = 200 V. Auf die Plätze …'),
          fig(X.raceFig(800, 200))),
        frame(L('Who moves where', 'Wer bewegt sich wohin'), P('The proton and the alpha particle are positive: pushed along the field lines, to V_B. The electron is negative: pulled against them, to V_A. The neutron feels no force and stays at the start. Each one that moves loses potential energy.', 'Das Proton und das Alphateilchen sind positiv: in Richtung der Feldlinien gestossen, zu Φ_B. Das Elektron ist negativ: gegen sie gezogen, zu Φ_A. Das Neutron spürt keine Kraft und bleibt am Start. Jedes, das sich bewegt, verliert potentielle Energie.'),
          fig(X.raceFig(800, 200))),
        frame(L('Who gains most', 'Wer gewinnt am meisten'), P('Each gains |q| · 600 V, whatever its path or mass: the proton 600 eV, the electron 600 eV, the alpha particle 1200 eV, the neutron nothing.', 'Jedes gewinnt |q| · 600 V, was auch immer sein Weg oder seine Masse ist: das Proton 600 eV, das Elektron 600 eV, das Alphateilchen 1200 eV, das Neutron nichts.'),
          fig(A.bars([['p', 1], ['α', 2], ['n', 0], ['e⁻', 1]].map(([n, z]) => ({ name: n, pot: 0, kin: z * 600 })), { values: eV, H: 70 }))),
        frame(L('Who is fastest', 'Wer ist am schnellsten'), P(`The electron by far: the same energy as the proton, 1836 times less mass, about 43 times as fast (${X.speed(X.vOf(600, A.me))} against ${X.speed(vp(600))}). The alpha particle has twice the proton's energy but four times its mass: 0.71 times as fast.`, `Das Elektron, mit Abstand: dieselbe Energie wie das Proton, 1836-mal weniger Masse, etwa 43-mal so schnell (${X.speed(X.vOf(600, A.me))} gegen ${X.speed(vp(600))}). Das Alphateilchen hat die doppelte Energie des Protons, aber die vierfache Masse: 0.71-mal so schnell.`), ''),
      ] },
  ];
  const stage = (name, types) => ({ name, types });
  const TOPICS = [
    { name: () => L('From A to B', 'Von A nach B'), example: () => 0, stages: [stage(() => L('faster or slower', 'schneller oder langsamer'), ['ab']), stage(() => L('energy and speed', 'Energie und Geschwindigkeit'), ['ab-num']), stage(() => L('energy bars', 'Energiebalken'), ['ab-bars'])] },
    { name: () => L('Accelerators', 'Beschleuniger'), example: () => 1, stages: [stage(() => L('from rest', 'aus der Ruhe'), ['gun']), stage(() => L('many gaps', 'viele Lücken'), ['linac'])] },
    { name: () => L("Rutherford's experiment", 'Rutherfords Streuversuch'), example: () => 2, stages: [stage(() => L('closest approach', 'kleinster Abstand'), ['ruth'])] },
    { name: () => L('Two particles', 'Zwei Teilchen'), example: (s) => (s === 1 ? 4 : 3), stages: [stage(() => L('which one', 'welches'), ['cmp']), stage(() => L('the race', 'das Rennen'), ['race']), stage(() => L('ratios', 'Verhältnisse'), ['cmp-ratio'])] },
  ];
  const lessons = () => LESSONS.map((l) => ({ name: l.name(), idea: l.idea(), frames: l.frames, also: topics.also(l.topic) }));

  // ---------------------------------------------------------------- check
  const checkSource = {
    id: 'av', objectives: X.OBJECTIVES, question: X.question, concept: X.CONCEPT,
    concepts: () => ({
      sign: L('the signs of the charge and of the potential difference', 'die Vorzeichen der Ladung und der Spannung'), path: L('the work depends only on the start and the end, not on the path', 'die Arbeit hängt nur von Anfang und Ende ab, nicht vom Weg'),
      charge: L('the charge in e (an alpha particle carries 2e)', 'die Ladung in e (ein Alphateilchen trägt 2e)'), total: L('the total energy stays the same', 'die Gesamtenergie bleibt gleich'),
      formula: L('E_kin = ½·m·v² and E_kin = |q|·|V_AB|', 'E_kin = ½·m·v² und E_kin = |q|·U'), sqrt: L('the speed grows with the square root of the energy', 'die Geschwindigkeit wächst mit der Wurzel aus der Energie'),
      r1: L('V = k·Q/r, not k·Q/r²', 'Φ = k·Q/r, nicht k·Q/r²'), mass: L('the energy does not depend on the mass', 'die Energie hängt nicht von der Masse ab'),
      qm: L('the speed depends on the charge per mass', 'die Geschwindigkeit hängt von der Ladung pro Masse ab'),
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
    Explore.relabel();
  }
  // Practice: exercises by topic; tutor: worked examples; explore: the field to click in; check: a
  // short test on the learning objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('av-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#explore').hidden = m !== 'explore';
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
  function exploreMode() {
    setMode('explore');
    if (location.hash !== '#explore') history.replaceState(null, '', '#explore');
  }
  function fromHash() {
    const h = location.hash.slice(1);
    if (h === 'check') { if ($('#ck').hidden) checkMode(); return true; }
    if (h === 'explore') { exploreMode(); return true; }
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
      const box = evt.target.closest('.cands');
      if (box) { box.querySelectorAll('.cand').forEach((el) => el.classList.remove('ok', 'bad')); const fb = box.nextElementSibling; if (fb) fb.innerHTML = ''; }
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
    Explore.mount($('#explore'));
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else if (mode() === 'explore') exploreMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    const last = stored('av-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check') checkMode(); else if (last === 'explore') exploreMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
