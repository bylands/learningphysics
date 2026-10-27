(function () {
  'use strict';

  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const { generate, tutorial, after, fval } = window.Switching;
  const { esc, fitText } = window.Circuit;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // An exercise is { id, title, difficulty, text, situation, fields: [{key, sym, unit, value, abs}],
  // models: per field { wire, zero, same } (the answer under a typical wrong idea), tol,
  // figure(sol, ask), hints: [html], solution: [html], results: html }.

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Switching RL Circuits', mode: 'Mode', difficulty: 'Difficulty', example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      stars: (d) => `Difficulty: ${d} of 5`,
      tutorNote: 'Use the arrow keys ← → to step through. In the diagram, the parts a step is about are <span class="k-strong">highlighted</span>, the value just found is <span class="k-new">marked</span>, values used are <b>bold</b>, and parts without current are <span class="k-dim">greyed out</span>.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      solNote: 'The diagram shows the circuit right after switching, with all currents and the induced emf of each coil.',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Fill in all fields, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', close: 'Close: check your rounding', wrong: 'Not correct',
      size: 'Give the size (a positive number)', sign: 'Wrong sign: check the direction of the current against the arrow',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Schaltvorgänge mit Spulen', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. In der Schaltung sind die Teile, um die es in einem Schritt geht, <span class="k-strong">hervorgehoben</span>, der eben gefundene Wert ist <span class="k-new">markiert</span>, verwendete Werte sind <b>fett</b>, und Teile ohne Strom sind <span class="k-dim">ausgegraut</span>.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      solNote: 'Die Schaltung unmittelbar nach dem Schalten, mit allen Strömen und der induzierten Spannung jeder Spule.',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Fülle alle Felder aus und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig',
      size: 'Gib den Betrag an (eine positive Zahl)', sign: 'Falsches Vorzeichen: Vergleiche die Richtung des Stroms mit dem Pfeil',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[Lang.get()];

  // What a wrong value suggests: the answer under a typical wrong idea (see models() in
  // generator.js).
  const WHY = {
    wire: () => L('That is the value long after switching: right after it, the inductor does not act like a wire yet.', 'Das ist der Wert lange nach dem Schalten: Unmittelbar danach wirkt die Spule noch nicht wie ein Draht.'),
    zero: () => L('Right after switching, the inductor still carries its old current: it does not drop to zero (or stay zero).', 'Unmittelbar nach dem Schalten führt die Spule noch ihren alten Strom: Er fällt nicht auf null (und bleibt nicht null).'),
    same: () => L('That is the value before switching. Only the inductor current is sure to stay the same; the other currents can jump.', 'Das ist der Wert vor dem Schalten. Nur der Spulenstrom bleibt sicher gleich; die anderen Ströme können springen.'),
    sign: () => L('Wrong direction: compare the direction of the current with the arrow.', 'Falsche Richtung: Vergleiche die Richtung des Stroms mit dem Pfeil.'),
  };
  // While the exercise is open, a nudge instead of a WHY that would give the answer away.
  const NUDGE = {
    zero: () => L('Right after switching: can the current through an inductor change suddenly?', 'Unmittelbar nach dem Schalten: Kann sich der Strom durch eine Spule sprunghaft ändern?'),
  };

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('rl-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  function math(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
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

  // Right within the tolerance; else the answer under a typical wrong idea, a sign or a rounding error.
  function judge(x, f, model) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.max(Math.abs(z), 0.05);
    if (near(x, e, ex.tol)) return { cls: 'ok', msg: ui().correct };
    for (const k of ['wire', 'zero', 'same']) {
      if (model[k] !== null && !near(model[k], e, ex.tol) && near(x, model[k], ex.tol)) return { cls: 'bad', msg: (!st.solved && !st.revealed && NUDGE[k] ? NUDGE : WHY)[k]() };
    }
    if (e !== 0 && near(-x, e, ex.tol)) return { cls: 'warn', msg: f.abs ? ui().size : ui().sign };
    if (e !== 0 && near(x, e, Math.max(0.05, 2 * ex.tol))) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  const newSeed = () => 1 + Math.floor(Math.random() * 999999);

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'rl', typeOf = (e) => e.ptype || `${e.circuit.sw.at}-${e.circuit.sw.before}`;
  // An exercise of a practice type 'where-before:level' (e.g. 'main-open:easy': the main switch is
  // closed, from rest): the first of that level, from the seed on, with its switch there.
  function ofType(type, seed) {
    const [kind, lv] = type.split(':');
    for (let k = 0; ; k++) {
      const e = generate(lv, seed * 1000 + k);
      if (`${e.circuit.sw.at}-${e.circuit.sw.before}` === kind || k >= 5000) { e.ptype = type; return e; }
    }
  }
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    $(`#in-${ex.fields[0].key}`).focus({ preventScroll: true });
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
    if (player) player.stop();
    player = mountWatch($('#figure'), ex, {
      locked: () => !(st && (st.solved || st.revealed)),
      preds: () => ex.fields.map((f) => { const el = $(`#in-${f.key}`); return el && el.value.trim() ? parse(el.value) : NaN; }),
    });
    $('#fields').innerHTML = ex.fields.map((f) => `
      <div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym">$${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${esc(f.unit)}</span>
        <span class="fb" aria-live="polite"></span>
      </div>`).join('');
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
    ex.fields.forEach((f, k) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`);
      const raw = row.querySelector('input').value;
      if (!raw.trim()) { anyEmpty = true; allOk = false; row.className = 'field'; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(parse(raw), f, ex.models[k]);
      row.className = `field ${r.cls}`;
      row.querySelector('.fb').textContent = r.msg;
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
        const s = stored('rl-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('rl-score', s);
        showScore();
      }
      st.solved = true;
      Practice.markSolved(PRACTICE, ex.id);
      finish();
      st.advance = topics.solved(st, ex);
      showStatus('ok');
    } else showStatus('bad');
    updateButtons();
    if (player) player.refresh(); // solved: the switch unlocks
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
    if (player) player.refresh(); // the switch unlocks
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- predict, then watch
  // Once the exercise is solved or its solution shown (and in the last frame of each worked
  // example), the student flips the switch in the figure and watches every current run from its
  // value before switching, through the jump at t = 0, to its value long after (play.js), on a
  // small I(t) graph with the values read off at the time of the slider; rings mark the values
  // right after switching (t = 0⁺), the ones the exercise asks for, named below the graph with
  // the values before and the student's answers (✓, ✗).
  let player = null, tutorPlayer = null, tutorEx = null;
  const symHtml = (sym) => sym.replace(/^([A-Za-z])_\{(.+)\}$/, '<i>$1</i><sub>$2</sub>');
  const num = (x, d = 1) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d).replace('-', '−');
  // a time: in ms below 0.1 s
  const timeText = (t, T) => (T < 0.1 ? `${num(1000 * t, T < 0.01 ? 2 : 1)} ms` : `${num(t, 2)} s`);
  // a tidy step for about n intervals of size `span`
  function niceStep(span, n) {
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }

  // The currents asked for (mA): { f, j (branch, or null for R1), value(at) in mA }.
  const currentsOf = (e) => e.fields.filter((f) => f.unit === 'mA').map((f) => {
    const j = f.key === 'IR1' ? null : Number(f.key.slice(1));
    return { f, value: (a) => 1000 * (j === null ? a.IR1 : a.Ib[j]) };
  });

  // The graph at time t: each current as a line up to t (before switching flat, the jump at t = 0),
  // a line at t with a dot on each curve, and once switched, a ring at each value right after
  // switching (t = 0⁺; the rows below the graph name them, by colour).
  function graph(e, run, t) {
    const W = 320, H = 190, ml = 48, mr = 12, mt = 22, mb = 28;
    const cur = currentsOf(e), T = run.T, t0 = -0.15 * T;
    const ts = Array.from({ length: 161 }, (_, k) => (k * T) / 160);
    const vals = cur.map((c) => [c.value(run.at(-1)), ...ts.map((x) => c.value(run.at(x)))]);
    let lo = Math.min(0, ...vals.flat()), hi = Math.max(0, ...vals.flat());
    if (hi - lo < 1e-9) hi = lo + 1;
    const step = niceStep(hi - lo, 4);
    lo = Math.floor(lo / step - 1e-9) * step; hi = Math.ceil(hi / step + 1e-9) * step;
    const X = (x) => ml + ((x - t0) / (T - t0)) * (W - ml - mr), Y = (y) => mt + ((hi - y) / (hi - lo)) * (H - mt - mb);
    const f1 = (x) => x.toFixed(1);
    let svg = `<svg class="rlw-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('The currents against time', 'Die Ströme in Abhängigkeit der Zeit')}">`;
    for (let y = lo; y <= hi + step / 2; y += step) {
      svg += `<line class="grid${Math.abs(y) < step / 2 ? ' zero' : ''}" x1="${ml}" x2="${W - mr}" y1="${f1(Y(y))}" y2="${f1(Y(y))}"/><text class="tick" x="${ml - 5}" y="${f1(Y(y) + 4)}" text-anchor="end">${num(y, step < 1 ? 1 : 0)}</text>`;
    }
    svg += `<line class="axis" x1="${f1(X(0))}" x2="${f1(X(0))}" y1="${mt}" y2="${H - mb}"/><text class="tick" x="${f1(X(0))}" y="${H - mb + 16}" text-anchor="middle">0</text>`;
    svg += `<text class="tick" x="${W - mr}" y="${H - mb + 16}" text-anchor="end">${timeText(T, T)}</text><text class="tick" x="${ml - 5}" y="11" text-anchor="end">mA</text>`;
    const until = Math.min(t, T);
    cur.forEach((c, k) => {
      const v0 = vals[k][0];
      let d = `M${f1(X(t0))} ${f1(Y(v0))}L${f1(X(Math.min(0, until)))} ${f1(Y(v0))}`;
      if (until >= 0) {
        ts.filter((x) => x <= until).forEach((x) => { d += `L${f1(X(x))} ${f1(Y(c.value(run.at(x))))}`; });
        d += `L${f1(X(until))} ${f1(Y(c.value(run.at(until))))}`;
      }
      svg += `<path class="curve s${k}" d="${d}"/>`;
    });
    if (t > t0) svg += `<line class="now" x1="${f1(X(until))}" x2="${f1(X(until))}" y1="${mt}" y2="${H - mb}"/>`;
    // the values right after switching
    if (t >= 0) {
      svg += `<text class="klab" x="${f1(X(0))}" y="${mt - 6}" text-anchor="middle"><tspan class="it">t</tspan> = 0⁺</text>`;
      cur.forEach((c, k) => { svg += `<circle class="kpt s${k}" cx="${f1(X(0))}" cy="${f1(Y(vals[k][1]))}" r="4.5"/>`; });
    }
    cur.forEach((c, k) => { svg += `<circle class="dot s${k}" cx="${f1(X(until))}" cy="${f1(Y(c.value(run.at(until))))}" r="4"/>`; });
    return `${svg}</svg>`;
  }

  // The player of exercise e in host. o: { locked(), preds() → the values entered for the currents
  // (mA, NaN if none), tutor: true in a worked example }.
  function mountWatch(host, e, o = {}) {
    let shown = null;
    const cur = currentsOf(e);
    const near = (y, z) => Math.abs(y - z) <= e.tol * Math.max(Math.abs(z), 0.05);
    const what = e.st.then ? L('close', 'schliessen') : L('open', 'öffnen');
    const prediction = () => {
      if (!o.preds) return cur.map(() => null);
      const p = o.preds();
      return cur.map((c) => { const v = p[e.fields.indexOf(c.f)]; return Number.isFinite(v) ? v : null; });
    };
    return window.Play.create(host, {
      t0: -0.15 * e.curves().T, t1: e.curves().T, seconds: 3,
      locked: o.locked,
      render(scene, s) {
        const lock = !!(o.locked && o.locked()), key = `${s.after}|${lock}|${Lang.get()}`;
        if (key !== shown) {
          shown = key;
          scene.innerHTML = `<div class="rlw"><div class="rlw-circ"></div><div class="rlw-side"></div></div>`;
          scene.querySelector('.rlw-circ').innerHTML = e.watch()[s.after ? 1 : 0];
          const svg = scene.querySelector('svg.circuit');
          if (svg) requestAnimationFrame(() => fitText(svg));
          markScrollable();
        }
        const side = scene.querySelector('.rlw-side');
        if (lock) { side.innerHTML = `<p class="note rlw-wait">${L('The graph of the currents appears here once you have solved the exercise or looked at the solution.', 'Der Graph der Ströme erscheint hier, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.')}</p>`; return; }
        const run = e.curves(), preds = prediction(), a = run.at(Math.min(s.t, run.T)), a0 = run.at(0), before = run.at(-1);
        const rows = cur.map((c, k) => {
          const p = preds[k], ok = p != null && near(p, c.value(a0)), v0 = c.value(a0), vb = c.value(before);
          // right after switching: as before (a coil keeps its current), or a jump
          const coil = c.f.key !== 'IR1' && e.circuit.branches[Number(c.f.key.slice(1))].L;
          const same = Math.abs(v0 - vb) <= 1e-6 * Math.max(1, Math.abs(vb));
          const how = same ? (coil ? L('as before: the coil keeps its current', 'wie vorher: Die Spule hält ihren Strom') : L('as before', 'wie vorher')) : L(`before: ${num(vb)} mA`, `vorher: ${num(vb)} mA`);
          const key = s.after ? `<span class="keyrow"><span class="kmark" aria-hidden="true"></span><i>t</i> = 0⁺: ${num(v0)} mA (${how})</span>` : '';
          const mark = s.after && p != null ? ` <span class="pred ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${L('your answer', 'deine Antwort')}: ${num(p)}</span>` : '';
          return `<li><span class="key s${k}" aria-hidden="true"></span>${symHtml(c.f.sym)} = ${num(c.value(a))} mA${key || mark ? `<div class="rlw-more">${key}${mark}</div>` : ''}</li>`;
        });
        side.innerHTML = graph(e, run, s.t) + `<ul class="rlw-read">${rows.join('')}</ul>`;
      },
      texts: () => ({
        switch: L(`Switch S: ${what}`, `Schalter S: ${what}`),
        ready: L(`Click the switch S to ${what} it, and watch the currents.`, `Klicke auf den Schalter S, um ihn zu ${what}, und schau den Strömen zu.`),
        again: L('Rings: the currents right after switching (t = 0⁺). Click the switch again to go back, or ▶ to watch once more.', 'Ringe: die Ströme unmittelbar nach dem Schalten (t = 0⁺). Klicke nochmals auf den Schalter, um zurückzugehen, oder ▶, um nochmals zuzuschauen.'),
        time: (t) => `t = ${timeText(t, e.curves().T)}`,
      }),
    });
  }

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with its question kinds, its worked example and its
  // practice topic (lessons.js). A kind is 'what/type': what is asked about an exercise of a
  // practice type. coil: the current through an inductor right after switching; jump: another
  // current right after switching; steady: a current before t = 0, when the switch has been set
  // for a long time (the inductor acts like a wire). The induced emf is not asked.
  const OBJECTIVES = [
    { id: 'keep', kinds: ['coil/main-open:easy', 'coil/main-closed:easy', 'coil/branch-open:medium'], tutor: 1, topic: 1,
      name: () => L('Use that the current through an inductor cannot jump: right after switching, it keeps the value it had before.',
        'Nutzen, dass der Strom durch eine Spule nicht springen kann: Unmittelbar nach dem Schalten behält er seinen Wert von vorher.') },
    { id: 'after', kinds: ['jump/main-closed:medium', 'jump/branch-open:medium', 'jump/main-open:hard'], tutor: 3, topic: 3,
      name: () => L('Find the currents right after a switch closes or opens: the inductor current is kept, the others follow from Kirchhoff’s rules.',
        'Die Ströme unmittelbar nach dem Schliessen oder Öffnen eines Schalters bestimmen: Der Spulenstrom bleibt, die anderen folgen aus den Kirchhoffschen Regeln.') },
    { id: 'steady', kinds: ['steady/main-closed:easy', 'steady/main-closed:medium', 'steady/branch-closed:medium'], tutor: 2, topic: 2,
      name: () => L('Find the steady currents long after a switch was set: the inductor then acts like a wire.',
        'Die konstanten Ströme lange nach dem Schalten bestimmen: Die Spule wirkt dann wie ein Draht.') },
  ];

  // The currents of exercise e that a kind can ask for: [{ f, value, models: { flag: value },
  // why: { flag: html } }]. Right after switching, the models are those of the exercise (the
  // inductor acts like a wire at once, its current drops to zero, nothing changes at the switch);
  // before t = 0, the wrong idea is an inductor that blocks the current like a break.
  function checkCandidates(e, what) {
    const c = e.circuit, coil = (f) => f.key !== 'IR1' && c.branches[Number(f.key.slice(1))].L;
    const cur = e.fields.map((f, k) => ({ f, k })).filter(({ f }) => f.unit === 'mA');
    if (what !== 'steady') {
      return cur.filter(({ f }) => (what === 'coil') === !!coil(f)).map(({ f, k }) => ({ f, value: f.value, models: e.models[k], why: {} }));
    }
    const of = (s, f) => 1000 * fval(f.key === 'IR1' ? s.IR1 : s.Ib[Number(f.key.slice(1))]);
    const cut = after(c, e.st.first, c.branches.map(() => ({ n: 0, d: 1 })));
    return cur.map(({ f }) => ({
      f, value: of(e.st.s0, f), models: { zero: cut ? Math.round(of(cut, f)) : null }, // whole mA, like the answers
      why: { zero: L('The currents have been constant for a long time, so the inductor acts like a wire, not like a break.', 'Die Ströme sind seit langer Zeit konstant, also wirkt die Spule wie ein Draht, nicht wie eine Unterbrechung.') },
    }));
  }

  // A current of a kind, preferably one that is not zero and where a wrong idea gives another
  // value. Wrong options: the values under the wrong ideas (for the inductor current, a zero
  // current counts as the idea that it drops to zero), the current in the wrong direction, then
  // simple slips.
  function checkQuestion(kind, seed) {
    const [what, type] = kind.split('/');
    let e = null, pool = [];
    for (let k = 0; k < 50 && !pool.length; k++) {
      e = ofType(type, seed + 7919 * k);
      const cands = checkCandidates(e, what);
      const telling = cands.filter((x) => Object.values(x.models).some((v) => v !== null && Math.abs(v - x.value) > 0.5));
      const nonzero = telling.filter((x) => Math.abs(x.value) > 0.5);
      pool = nonzero.length ? nonzero : telling.length ? telling : cands;
    }
    const { f, value, models, why } = pool[seed % pool.length];
    const gap = 0.5, options = [{ value, correct: true }];
    const add = (v, flag) => {
      if (options.length < 4 && Number.isFinite(v) && options.every((o) => Math.abs(o.value - v) > gap)) options.push({ value: v, flag, why: flag ? (why[flag] || WHY[flag]()) : undefined });
    };
    (what === 'coil' ? ['zero', 'wire', 'same'] : ['wire', 'zero', 'same']).forEach((x) => { if (models[x] != null) add(models[x], x); });
    add(-value, 'sign');
    const step = Math.abs(value) >= 100 ? 50 : 10;
    [2 * value, value / 2, value + step, value - step, value + 2 * step, 3 * value].forEach((x) => add(Math.round(x * 10) / 10, null));
    options.sort((a, b) => a.value - b.value);
    const num = (x) => String(parseFloat(x.toFixed(2))).replace('-', '−');
    const steady = what === 'steady', first = e.st.first;
    // before t = 0: the steps up to the moment of switching, with the circuit as it was
    const jump = e.solution.findIndex((p) => p.includes('\\Delta t \\to 0'));
    const steps = steady && jump > 0 ? e.solution.slice(0, jump) : e.solution;
    return {
      title: e.title,
      text: `<p>${e.situation}</p>`,
      figure: e.figure(false, f.key),
      ask: steady
        ? L(`Find $${f.sym}$ before $t = 0$, when the switch has been ${first ? 'closed' : 'open'} for a long time.`, `Wie gross ist $${f.sym}$ vor $t = 0$, wenn der Schalter seit langer Zeit ${first ? 'geschlossen' : 'offen'} ist?`)
        : L(`Find $${f.sym}$ right after switching.`, `Wie gross ist $${f.sym}$ unmittelbar nach dem Schalten?`),
      options: options.map((o) => ({ html: `$${num(o.value)}\\,\\mathrm{mA}$`, correct: !!o.correct, flag: o.flag, why: o.why })),
      explain: () => `<div class="figs">${e.figure(!steady)}</div><div class="steps">${steps.map((p) => `<p>${p}</p>`).join('')}</div>`,
      key: `${e.id}|${f.key}|${what}`,
    };
  }
  const checkSource = {
    id: 'rl',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { wire: 'wire', zero: 'zero', same: 'same', sign: 'sign' },
    concepts: () => ({
      wire: L('the inductor as a wire at once', 'die Spule sofort als Draht'),
      zero: L('no current through the inductor', 'kein Strom durch die Spule'),
      same: L('nothing changes at the switch', 'beim Schalten ändert sich nichts'),
      sign: L('the direction of the current', 'die Richtung des Stroms'),
    }),
  };

  // ---------------------------------------------------------------- language
  // The worked examples, each with a last frame to watch (mountWatch).
  const watchFrame = () => ({
    text: `<p class="step-rule">${L('Watch it happen', 'Zuschauen')}</p><p>${L('Flip the switch S in the figure and watch every current: before switching, the jump at <i>t</i> = 0 (all currents except the inductor current can jump), and how the currents then run to their values long after switching.',
      'Lege den Schalter S im Schaltbild um und schau jedem Strom zu: vor dem Schalten, der Sprung bei <i>t</i> = 0 (alle Ströme ausser dem Spulenstrom können springen), und wie die Ströme danach zu ihren Werten lange nach dem Schalten laufen.')}</p>`,
    figure: '<div class="pw-host"></div>',
  });
  const lessons = () => window.Lessons.EXAMPLES.map((e, i) => ({
    name: e.name[Lang.get()], idea: e.idea[Lang.get()], also: topics.also(i),
    frames: () => { const t = tutorial(e.circuit); return [...t.frames, watchFrame()]; },
  }));
  function watchInTutor() {
    if (tutorPlayer) tutorPlayer.stop();
    tutorPlayer = null;
    const host = $('#t-figure .pw-host'), i = tutor ? tutor.current() : 0;
    if (!host) return;
    tutorEx = window.Switching.tutorial(window.Lessons.EXAMPLES[i].circuit).ex;
    tutorPlayer = mountWatch(host, tutorEx, {});
  }

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
      const values = ex.fields.map((f) => $(`#in-${f.key}`).value);
      const keep = { ...st };
      ex = again(ex);
      render();
      st = keep;
      ex.fields.forEach((f, k) => { $(`#in-${f.key}`).value = values[k]; });
      if (st.checked) feedback();
      showStatus(st.status);
      showHints();
      if (st.revealed) showSolution();
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
      updateButtons();
      if (player) player.refresh();
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
    store('rl-mode', m);
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
    topics = window.Topics.create({
      app: PRACTICE, topics: topicList(),
      make: ofType, typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { math($('#tutor')); watchInTutor(); markScrollable(); },
      done: practise,
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
      t: () => ui().tutorBtns,
    });
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
    // First visit: start with the first worked example.
    const last = stored('rl-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
