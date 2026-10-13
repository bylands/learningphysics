(function () {
  'use strict';

  const { generate, tutorial, meters, meterTutorial, placeOptions, placeWhy, fval, ftex } = window.Generator;
  const { esc, fitText } = window.Circuit;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Resistor Circuits', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. In the diagram, the parts combined in a step are <span class="k-strong">highlighted</span>, the group they belong to is <span class="k-light">shaded</span>, the value just found is <span class="k-new">marked</span> and the values used are <b>bold</b>.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      solNote: 'The diagram shows all currents (<span class="c-cur">blue</span>) and voltages (<span class="c-vol">red</span>) in the circuit.',
      solNoteMeters: 'The diagram shows what the meters read.',
      place: (m) => `Drag the ${m} onto a dashed circle in the circuit, or tap the circle. To move it, place it again.`,
      levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard', mixed: 'Mixed' },
      stars: (d) => `Difficulty: ${d} of 5`,
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Fill in all fields, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Wrong sign: check the direction', prefix: 'Off by a factor of 1000: check the unit prefix', close: 'Close: check your rounding', wrong: 'Not correct',
    },
    de: {
      title: 'Widerstandsschaltungen', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Im Schaltbild sind die Teile, die in einem Schritt zusammengefasst werden, <span class="k-strong">hervorgehoben</span>, ihre Gruppe ist <span class="k-light">schattiert</span>, der eben gefundene Wert ist <span class="k-new">markiert</span>, und die verwendeten Werte sind <b>fett</b>.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      solNote: 'Das Schaltbild zeigt alle Ströme (<span class="c-cur">blau</span>) und Spannungen (<span class="c-vol">rot</span>) in der Schaltung.',
      solNoteMeters: 'Das Schaltbild zeigt, was die Messgeräte anzeigen.',
      place: (m) => `Ziehe das ${m} auf einen gestrichelten Kreis in der Schaltung, oder tippe auf den Kreis. Um es zu verschieben, setze es neu.`,
      levels: { easy: 'Einfach', medium: 'Mittel', hard: 'Schwierig', mixed: 'Gemischt' },
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Fülle alle Felder aus und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Falsches Vorzeichen: Prüfe die Richtung', prefix: 'Um den Faktor 1000 daneben: Prüfe die Einheit', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig',
    },
  };
  const ui = () => UI[Lang.get()];

  // An exercise is { id, difficulty, title, text, fields: [{key, sym, unit, value}], tol, figure(sol),
  // hints: [html], solution: [html], results: html }.
  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('rc-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  function math(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
        // \htmlClass marks the results (highlighted in ui.css).
        trust: (ctx) => ctx.command === '\\htmlClass',
        strict: (code) => (code === 'htmlExtension' ? 'ignore' : 'warn'),
      });
    }
  }

  // Wide circuits scroll horizontally on small screens; say so, since the cut-off part is invisible.
  function markScrollable() {
    document.querySelectorAll('.fig').forEach((fig) => {
      fig.classList.toggle('scrolls', fig.scrollWidth > fig.clientWidth + 1);
    });
  }

  // ---------------------------------------------------------------- input and feedback
  function parse(s) {
    s = s.trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/[^\d.)]+$/, '').trim(); // the minus as phones type it
    const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(?:\s*\/\s*(\d*\.?\d+))?$/i);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  }

  function judge(x, e, tol) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    if (e === 0) return Math.abs(x) < 1e-9 ? { cls: 'ok', msg: ui().correct } : { cls: 'bad', msg: ui().wrong }; // a meter that shows nothing
    const off = (y) => Math.abs(y - e) / Math.abs(e);
    if (off(x) <= tol) return { cls: 'ok', msg: ui().correct };
    if (off(-x) <= tol) return { cls: 'warn', msg: ui().sign };
    if (off(x / 1000) <= tol || off(x * 1000) <= tol) return { cls: 'warn', msg: ui().prefix };
    if (off(x) <= Math.max(0.05, 2 * tol)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  const newSeed = () => 1 + Math.floor(Math.random() * 999999);
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'rc', typeOf = (e) => e.ptype || `d${e.difficulty}`;
  // The kind of an exercise, as in the tutor: groups inside groups inside groups (nested), else
  // backwards (a resistance is wanted), else by the circuit: series or parallel only, or one group
  // inside the other (mixed).
  const depth = (node) => (node.t === 'R' ? 0 : 1 + Math.max(...node.kids.map(depth)));
  function kindOf(e) {
    const root = e.circuit.nodes[0], d = depth(root);
    if (d >= 3) return 'nested';
    if (e.targets.some((t) => t[0] === 'R')) return 'backwards';
    return d === 1 ? (root.t === 'S' ? 'series' : 'parallel') : 'mixed';
  }
  // An exercise of a practice type 'kind:level' (e.g. 'mixed:medium'): the first of that level,
  // from the seed on, of that kind; or 'meter:stage', an exercise on meters (meters in generator.js).
  function ofType(type, seed) {
    const [kind, lv] = type.split(':');
    if (kind === 'meter') { const e = meters(lv, seed); e.ptype = type; return e; }
    for (let k = 0; ; k++) {
      const e = generate(lv, seed * 1000 + k);
      if (kindOf(e) === kind || k >= 5000) { e.ptype = type; return e; }
    }
  }
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, status: null };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
  }

  // A new exercise of the topic and stage chosen (topics.js), of another type than the current
  // one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language); links of earlier versions name a level
  const again = (e) => topics.parse(e.id) || generate(e.id.split('-')[0], Number(e.id.split('-')[1]));

  // The topics of practice: those of the tutor's examples, with their stages (lessons.js).
  const topicList = () => window.Lessons.EXAMPLES.map((e) => ({
    name: () => e.name[Lang.get()],
    stages: e.practice.map((s) => ({ name: s.en ? () => s[Lang.get()] : null, types: s.types })),
  }));

  function render() {
    $('#title').innerHTML = `${esc(ex.title)} ${starsOf(ex.difficulty)}`;
    $('#prompt').innerHTML = ex.text;
    $('#figure').innerHTML = ex.slots ? ex.placeFig(st.placed || null) : ex.figure(false);
    $('#fields').innerHTML = ex.fields.map((f) => (f.place ? `
      <div class="field choice wide place" data-key="${f.key}"><span class="what">${esc(f.what)}</span><span class="place-row">
        <button type="button" class="meter-chip" aria-label="${esc(f.what)}">${f.meter}</button><span class="note">${esc(ui().place(meterName(f.meter)))}</span></span>
        <span class="fb" aria-live="polite"></span></div>` : f.choice ? `
      <div class="field choice wide" data-key="${f.key}"><span class="what">${esc(f.what)}</span><span class="choices levels small stack" role="radiogroup">${f.options.map((o) =>
        `<label><input type="radio" name="in-${f.key}" value="${o.v}"><span>${o.html}</span></label>`).join('')}</span><span class="fb" aria-live="polite"></span></div>` : `
      <div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym">$${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${esc(f.unit)}</span>
        <span class="fb" aria-live="polite"></span>
      </div>`)).join('');
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
    const left = ex.hints.length - st.hints;
    const hb = $('#hint');
    hb.disabled = left === 0 || st.revealed;
    hb.textContent = left ? ui().hint(left) : ui().noHints;
    const rb = $('#reveal');
    rb.disabled = !canReveal() || st.revealed;
    rb.title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
    // once everything is right, Check becomes New exercise, like the button at the top
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
  }

  // The answer in a field: the text typed, or the value of the option chosen (null if none).
  function valueOf(f) {
    if (f.place) return st.placed || null;
    if (!f.choice) return $(`#in-${f.key}`).value;
    const r = document.querySelector(`input[name="in-${f.key}"]:checked`);
    return r ? r.value : null;
  }
  function setValue(f, v) {
    if (v == null) return;
    if (f.place) { place(v); return; }
    if (!f.choice) { $(`#in-${f.key}`).value = v; return; }
    const r = document.querySelector(`input[name="in-${f.key}"][value="${v}"]`);
    if (r) r.checked = true;
  }

  // Where does the meter go: the meter is placed at a spot of the figure (ex.slots), by a tap on
  // the spot (or Enter on it), or by dragging the meter from its button onto it.
  const meterName = (m) => (m === 'A' ? L('ammeter', 'Amperemeter') : L('voltmeter', 'Voltmeter'));
  function place(id) {
    if (!ex.slots || !ex.slots.includes(id) || st.solved || st.revealed) return;
    st.placed = id;
    $('#figure').innerHTML = ex.placeFig(id);
    markScrollable();
    const f = ex.fields.find((x) => x.place), row = f && $('#fields').querySelector(`.field[data-key="${f.key}"]`);
    if (row) { row.className = 'field choice wide place'; row.querySelector('.fb').textContent = ''; }
  }
  function placeEvents() {
    const fig = $('#figure');
    fig.addEventListener('click', (evt) => { const g = evt.target.closest('.slot'); if (g) place(g.dataset.slot); });
    fig.addEventListener('keydown', (evt) => {
      const g = evt.target.closest('.slot');
      if (g && (evt.key === 'Enter' || evt.key === ' ')) { evt.preventDefault(); place(g.dataset.slot); const again = $(`#figure .slot`); if (again) again.focus({ preventScroll: true }); }
    });
    // dragging: a copy of the meter follows the pointer; it lands on the nearest spot (within reach)
    $('#fields').addEventListener('pointerdown', (evt) => {
      const chip = evt.target.closest('.meter-chip');
      if (!chip || evt.button > 0) return;
      evt.preventDefault();
      const ghost = document.createElement('div');
      ghost.className = 'meter-ghost';
      ghost.textContent = chip.textContent;
      document.body.append(ghost);
      const x0 = evt.clientX, y0 = evt.clientY;
      let near = null, moved = false;
      const nearest = (x, y) => {
        let best = null, bd = 56;
        for (const g of document.querySelectorAll('#figure .slot')) {
          const b = g.querySelector('circle').getBoundingClientRect(), d = Math.hypot(b.left + b.width / 2 - x, b.top + b.height / 2 - y);
          if (d < bd) { bd = d; best = g; }
        }
        return best;
      };
      const move = (e) => {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) > 4) moved = true;
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
        const g = nearest(e.clientX, e.clientY);
        if (g !== near) { if (near) near.classList.remove('near'); near = g; if (g) g.classList.add('near'); }
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        ghost.remove();
        if (near) place(near.dataset.slot);
        // a tap on the button: show where it can go
        else if (!moved) for (const g of document.querySelectorAll('#figure .slot')) { g.classList.remove('pulse'); void g.getBBox(); g.classList.add('pulse'); }
      };
      move(evt);
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
  }

  // Marks every field; true if all are right, null if some are empty.
  function feedback() {
    let allOk = true, anyEmpty = false;
    for (const f of ex.fields) {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`);
      const raw = valueOf(f), base = f.place ? 'field choice wide place' : f.choice ? 'field choice wide' : 'field';
      if (raw == null || !raw.trim()) { anyEmpty = true; allOk = false; row.className = base; row.querySelector('.fb').textContent = ''; continue; }
      // a choice: the explanation of a wrong one (after Check, so it gives nothing away before)
      const pc = f.place && ex.placeCheck(raw);
      const r = f.place ? (pc.ok ? { cls: 'ok', msg: ui().correct } : { cls: 'bad', msg: pc.why || ui().wrong }) : f.choice ? (raw === f.value ? { cls: 'ok', msg: ui().correct } : { cls: 'bad', msg: (f.options.find((o) => o.v === raw) || {}).why || ui().wrong })
        : judge(parse(raw), f.value, ex.tol);
      row.className = `${base} ${r.cls}`;
      if (f.choice || f.place) { row.querySelector('.fb').innerHTML = r.msg; math(row.querySelector('.fb')); } else row.querySelector('.fb').textContent = r.msg;
      if (r.cls !== 'ok') allOk = false;
    }
    return allOk ? true : anyEmpty ? null : false;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    if (st) st.status = kind;
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
      if (!st.revealed) {
        const s = stored('rc-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('rc-score', s);
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
    $('#solution .note').innerHTML = ex.meters ? ui().solNoteMeters : ui().solNote; // an exercise on meters shows their readings
    $('#sol-figure').innerHTML = ex.figure(true);
    $('#sol-steps').innerHTML = ex.solution.map((p) => `<p>${p}</p>`).join('');
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

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the practice types it is asked about, its worked
  // example and its practice topic (lessons.js). Each question asks for one unknown of a circuit
  // whose currents and voltages are multiples of 0.5 (no fractions to work with): a voltage or a
  // current, or for working backwards, a resistance. Wrong options: the whole battery voltage or
  // current for one part, the value of its partner in a divider (the ratio turned round), or
  // simple slips.
  const OBJECTIVES = [
    { id: 'divide', kinds: ['series:easy', 'parallel:easy'], tutor: 0, topic: 0,
      name: () => L('Split the voltage in series in the ratio of the resistances, and the current in parallel in the inverse ratio.',
        'Die Spannung in Serie im Verhältnis der Widerstände aufteilen und den Strom parallel im umgekehrten Verhältnis.') },
    { id: 'combine', kinds: ['mixed:medium', 'nested:medium'], tutor: 2, topic: 2,
      name: () => L('Reduce groups of resistors to one equivalent resistance and work out every current and voltage step by step.',
        'Gruppen von Widerständen durch einen Ersatzwiderstand ersetzen und alle Ströme und Spannungen Schritt für Schritt bestimmen.') },
    { id: 'backwards', kinds: ['backwards:easy', 'backwards:medium'], tutor: 3, topic: 3,
      name: () => L('Find an unknown resistance from measured currents and voltages.',
        'Einen unbekannten Widerstand aus gemessenen Strömen und Spannungen bestimmen.') },
    { id: 'meters', kinds: ['meter:place', 'meter:read', 'meter:wrong'], tutor: 5, topic: 5,
      name: () => L('Place an ammeter (in series) and a voltmeter (in parallel) correctly and read what an ideal meter shows in a circuit.',
        'Ein Amperemeter (in Serie) und ein Voltmeter (parallel) richtig anschliessen und ablesen, was ein ideales Messgerät in einer Schaltung anzeigt.') },
  ];
  const half = (f) => Number.isFinite(fval(f)) && Math.abs(2 * fval(f) - Math.round(2 * fval(f))) < 1e-9;
  // A circuit of a practice type and the unknown asked for: a resistance when working backwards,
  // else a voltage or a current.
  function checkCircuit(type, seed) {
    const back = type.startsWith('backwards');
    let e = null, f = null;
    for (let k = 0; k < 400; k++) {
      const c = ofType(type, seed + 7919 * k);
      const ok = c.circuit.nodes.every((n) => half(n.V) && half(n.I));
      const nice = c.fields.filter((x) => (back ? x.key[0] === 'R' && Number.isInteger(x.value) : x.key[0] !== 'R'));
      if ((ok && nice.length) || k === 399) { e = c; f = (nice.length ? nice : c.fields)[seed % (nice.length || c.fields.length)]; break; }
    }
    return { e, f };
  }
  // Four options for the value of quantity q (V, I or R) of a node: the right one, then the
  // candidates [value, flag, why] (0 only among these, for a meter that shows nothing), the values
  // of the whole circuit and of the partner in a divider, the other values of the circuit and simple
  // slips; positive multiples of 0.5, clearly different from each other, by size.
  function numberOptions(c, node, q, value, cands = []) {
    const options = [{ value, correct: true }];
    const fits = (x) => x >= 0 && Math.abs(2 * x - Math.round(2 * x)) < 1e-9 && options.every((o) => Math.abs(o.value - x) > 0.01 * Math.max(o.value, x) + 1e-9);
    const add = (v, flag, why) => { if (options.length < 4 && (v > 0 || (v === 0 && flag !== undefined)) && fits(v)) options.push({ value: v, flag, why }); };
    for (const [v, flag, why] of cands) add(v, flag || null, why || null);
    if (q !== 'R' && node && node !== c.root) {
      add(fval(c.root[q]), 'whole', q === 'V'
        ? L('That is the whole battery voltage: a part in series only gets its share.', 'Das ist die ganze Batteriespannung: Ein Teil in Serie bekommt nur seinen Anteil.')
        : L('That is the whole battery current: a branch in parallel only carries its share.', 'Das ist der ganze Batteriestrom: Ein paralleler Zweig führt nur seinen Anteil.'));
    }
    const parent = c.nodes.find((n) => n.kids && n.kids.includes(node));
    if (parent && q !== 'R') {
      for (const sib of parent.kids) {
        if (sib !== node) add(fval(sib[q]), 'ratio', L('That belongs to the other part: in a divider, the larger share goes to the larger resistance (voltages in series) or the smaller one (currents in parallel).',
          'Das gehört zum anderen Teil: Beim Teiler bekommt der grössere Widerstand den grösseren Anteil (Spannungen in Serie) bzw. den kleineren (Ströme parallel).'));
      }
    }
    for (const n of c.nodes) if (n !== node) add(fval(n[q]), undefined, null);
    const base = value || 1;
    for (const x of [2 * base, base / 2, base + 1, base + 2, base - 1, 3 * base, base + 3, base + 4]) add(x, undefined, null);
    // the options in a fixed order: by size
    options.sort((a, b) => a.value - b.value);
    const unitTex = { V: '\\mathrm{V}', I: '\\mathrm{mA}', R: '\\mathrm{k\\Omega}' }[q];
    return options.map((o) => ({ html: `$${num(o.value)}\\,${unitTex}$`, correct: !!o.correct, flag: o.flag || null, why: o.why || null }));
  }
  const num = (x) => String(parseFloat(x.toFixed(2)));
  function checkQuestion(type, seed) {
    if (type.startsWith('meter:')) return meterQuestion(type, seed);
    const { e, f } = checkCircuit(type, seed);
    const c = e.circuit, node = c.nodes[Number(f.key.slice(1))], q = f.key[0];
    return {
      title: e.title,
      // only the quantity asked for: the exercise text lists all its unknowns
      text: `<p>${L('Apply the rules for series and parallel circuits.', 'Wende die Regeln für Serie- und Parallelschaltungen an.')}</p>`,
      figure: e.figure(false, f.key),
      ask: L(`Find $${f.sym}$.`, `Wie gross ist $${f.sym}$?`),
      options: numberOptions(c, node, q, f.value),
      explain: () => `<div class="figs">${e.figure(true)}</div><div class="steps">${e.solution.map((p) => `<p>${p}</p>`).join('')}</div>`,
      key: `${e.id}|${f.key}`,
    };
  }

  // Measuring with meters: where a meter goes (in words), what an ideal one shows, and what one
  // connected the wrong way shows. Wrong options: the other way of connecting it (a voltmeter in
  // series blocks the current, an ammeter in parallel short-circuits), and the reading of a meter
  // in another place (the whole battery voltage or current, the partner's value).
  function meterQuestion(kind, seed) {
    const steps = (e) => `<div class="steps">${e.solution.map((p) => `<p>${p}</p>`).join('')}</div>`;
    const Rn = (n) => `$R_{${n.idx}}$`;
    if (kind === 'meter:place') {
      const volt = seed % 2 === 1, q = volt ? 'V' : 'I';
      // a resistor whose voltage is not the battery's, or whose current is not the battery's
      let e, n;
      for (let k = 0; k < 200; k++) {
        e = meters('read', seed + 7919 * k);
        const m = e.meters.find((x) => x.m === (volt ? 'V' : 'A'));
        n = e.circuit.nodes[m.at];
        if (n.t === 'R' && fval(n[q]) !== fval(e.circuit.root[q])) break;
      }
      const R = Rn(n), s = e.sym(q + n.id), val = `${num(fval(n[q]))}\\,\\mathrm{${volt ? 'V' : 'mA'}}`;
      const options = placeOptions(volt, R).map(({ v, ...o }) => o);
      const turn = seed % 4; // the options in an order of their own
      return {
        title: L('Where does the meter go?', 'Wo kommt das Messgerät hin?'),
        text: `<p>${volt ? L(`With a voltmeter, you want to measure the voltage across ${R} (highlighted).`, `Mit einem Voltmeter willst du die Spannung an ${R} (hervorgehoben) messen.`)
          : L(`With an ammeter, you want to measure the current through ${R} (highlighted).`, `Mit einem Amperemeter willst du den Strom durch ${R} (hervorgehoben) messen.`)}</p>`,
        figure: e.plain(n.id),
        ask: volt ? L('How do you connect the voltmeter?', 'Wie schliesst du das Voltmeter an?') : L('How do you connect the ammeter?', 'Wie schliesst du das Amperemeter an?'),
        options: [...options.slice(turn), ...options.slice(0, turn)].map((o) => ({ correct: false, flag: null, why: null, ...o })),
        explain: () => `<div class="figs">${e.figure(true)}</div><div class="steps"><p>${placeWhy(volt, R, s, val)}</p></div>`,
        key: `place|${e.id}|${q}`,
      };
    }
    const e = meters(kind === 'meter:wrong' ? 'wrong' : 'read', seed, ['vseries', 'ashort']), c = e.circuit; // the check asks about one meter: the kinds with distractors of their own
    // the meter asked about: the voltmeter or the ammeter, where there are both
    const m = e.meters.length > 1 && seed % 2 === 1 ? e.meters.find((x) => x.m === 'V') : e.meters.find((x) => x.m === 'A');
    const q = m.m === 'V' ? 'V' : 'I', node = c.nodes[m.at];
    let cands = [], target = node;
    if (e.kind === 'vseries' && m.m === 'A') {
      cands = [[fval(node.I), 'vseries', L(`That is the current without the voltmeter. In series in the main line, the voltmeter ($R_\\text{V} \\to \\infty$) blocks the current: the ammeter shows 0.`, `Das ist der Strom ohne Voltmeter. In Serie in der Hauptleitung sperrt das Voltmeter ($R_\\text{V} \\to \\infty$) den Strom: Das Amperemeter zeigt 0.`)],
        [fval(c.root.I), 'vseries', L('That is the battery current without the voltmeter; but in series, the voltmeter blocks the current.', 'Das ist der Batteriestrom ohne Voltmeter; in Serie sperrt das Voltmeter aber den Strom.')]];
      target = null;
    } else if (e.kind === 'vseries') {
      cands = [[0, 'vseries', L('No current flows, but there is a voltage: with none across the resistors, the whole battery voltage is across the voltmeter.', 'Es fliesst kein Strom, aber es gibt eine Spannung: An den Widerständen liegt keine, also liegt die ganze Batteriespannung am Voltmeter.')],
        ...c.leaves.map((n) => [fval(n.V), 'vseries', L('That is the voltage across a resistor without the voltmeter; but in series, the voltmeter blocks the current, and no voltage is left across the resistors.', 'Das ist die Spannung an einem Widerstand ohne Voltmeter; in Serie sperrt das Voltmeter aber den Strom, und an den Widerständen bleibt keine Spannung.')])];
      target = null;
    } else if (e.kind === 'ashort') {
      const k = e.shorted.k;
      cands = [[fval(k.I), 'aparallel', L(`That is the current through ${Rn(k)} without the meter. Across ${Rn(k)}, the ammeter ($R_\\text{A} \\approx 0$) short-circuits it, so a larger current flows, all of it through the ammeter.`, `Das ist der Strom durch ${Rn(k)} ohne Messgerät. Parallel zu ${Rn(k)} schliesst das Amperemeter ($R_\\text{A} \\approx 0$) diesen kurz, also fliesst ein grösserer Strom, ganz durchs Amperemeter.`)],
        [0, null, L(`The current does not avoid the ammeter: with $R_\\text{A} \\approx 0$, it takes the path through the ammeter rather than through ${Rn(k)}.`, `Der Strom meidet das Amperemeter nicht: Mit $R_\\text{A} \\approx 0$ nimmt er den Weg durchs Amperemeter statt durch ${Rn(k)}.`)]];
      target = null;
    }
    return {
      title: e.title,
      text: `<p>${e.kind === 'read' ? L('The meters are ideal.', 'Die Messgeräte sind ideal.') : L('The meters are ideal. Look closely at how they are connected.', 'Die Messgeräte sind ideal. Schau genau, wie sie angeschlossen sind.')}</p>`,
      figure: e.figure(false, m.m),
      ask: m.m === 'V' ? L('What does the voltmeter show?', 'Was zeigt das Voltmeter an?') : L('What does the ammeter show?', 'Was zeigt das Amperemeter an?'),
      options: numberOptions(c, target, q, m.value, cands),
      explain: () => `<div class="figs">${e.figure(true)}</div>${steps(e)}`,
      key: `${e.id}|${m.m}`,
    };
  }
  const checkSource = {
    id: 'rc',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { whole: 'whole', ratio: 'ratio', vseries: 'vseries', aparallel: 'aparallel' },
    concepts: () => ({
      whole: L('giving one part the whole battery voltage or current', 'einem Teil die ganze Batteriespannung oder den ganzen Strom geben'),
      ratio: L('a divider the wrong way round', 'ein Teiler falsch herum'),
      vseries: L('a voltmeter in series, as if it changed nothing (it blocks the current: R_V → ∞)', 'ein Voltmeter in Serie, als ob es nichts veränderte (es sperrt den Strom: R_V → ∞)'),
      aparallel: L('an ammeter in parallel, as if it changed nothing (it short-circuits: R_A ≈ 0)', 'ein Amperemeter parallel, als ob es nichts veränderte (es schliesst kurz: R_A ≈ 0)'),
    }),
  };

  // ---------------------------------------------------------------- language
  const lessons = () => window.Lessons.EXAMPLES.map((e, i) => ({
    name: e.name[Lang.get()], idea: e.idea[Lang.get()], also: topics.also(i), frames: () => (e.meters ? meterTutorial : tutorial)(e.level, e.seed, e.path).frames,
  }));

  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
  }

  // The same exercise in the other language, with the answers, hints and solution kept.
  function switchLang() {
    applyStatic();
    showScore();
    if (ex) {
      const values = ex.fields.map(valueOf), keep = st;
      ex = again(ex);
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
  // Practice: random exercises; tutor: worked examples; check: a short test on the learning
  // objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('rc-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; markScrollable(); } else fresh();
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
    m = h.match(/^(easy|medium|hard|mixed)-(\d+)$/);
    if (m) {
      setMode('practice');
      if (!ex || ex.id !== h) open(generate(m[1], Number(m[2])));
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
      app: PRACTICE, topics: topicList(),
      make: ofType, typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    $('#new').addEventListener('click', fresh);
    placeEvents();
    $('#answers').addEventListener('submit', check);
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { fitText($('#t-figure svg')); math($('#tutor')); markScrollable(); },
      done: practise,
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
    });
    // circuit diagrams fit their labels to the rendered text (fitText)
    const typeset = (el) => { el.querySelectorAll('.fig svg').forEach((svg) => fitText(svg)); math(el); };
    checker = Check.create(checkSource, {
      math: typeset, markScrollable, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // First visit: start with the first worked example.
    const last = stored('rc-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
