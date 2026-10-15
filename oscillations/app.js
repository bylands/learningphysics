(function () {
  'use strict';

  const OC = window.OC, Lang = window.Lang, Check = window.Check, { practiceOf, tutorial } = window.Osc;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Oscillations', mode: 'Mode', difficulty: 'Difficulty', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Results are highlighted.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every part, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Give the size (a positive number)', close: 'Close: check your rounding', wrong: 'Not correct', power: 'Off by a power of ten: check the units (cm, mm, m)', signed: 'Check the sign', next: 'Right. Now the next part.',
      rankWrong: (n) => `${n === 1 ? 'One place is' : `${n} places are`} not right yet`, sci: 'Powers of ten: type 3.2e-8 or 3.2*10^-8.', none: 'none',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Schwingungen', mode: 'Modus', difficulty: 'Schwierigkeit', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Resultate sind hervorgehoben.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte alle Teile, dann prüfe nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Gib den Betrag an (eine positive Zahl)', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig', power: 'Um eine Zehnerpotenz daneben: Prüfe die Einheiten (cm, mm, m)', signed: 'Prüfe das Vorzeichen', next: 'Richtig. Jetzt der nächste Teil.',
      rankWrong: (n) => `${n === 1 ? 'Ein Platz stimmt' : `${n} Plätze stimmen`} noch nicht`, sci: 'Zehnerpotenzen: Tippe 3.2e-8 oder 3.2*10^-8.', none: 'keine',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[OC.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null, player = null, tutorPlayer = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('osc-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  function math(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
        trust: (ctx) => ctx.command === '\\htmlClass',
        strict: false,
      });
    }
  }

  // Wide drawings scroll horizontally on small screens.
  function markScrollable() {
    document.querySelectorAll('.fig').forEach((fig) => {
      fig.classList.toggle('scrolls', fig.scrollWidth > fig.clientWidth + 1);
    });
  }

  // ---------------------------------------------------------------- input and feedback
  // A number as typed: 0.25, 1/4, 3.2e-8, 3.2*10^-8, 3.2·10⁻⁸, with a comma or a point.
  const SUPER = { '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  function parse(s) {
    s = s.trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^${[...m].map((c) => SUPER[c]).join('')}`).replace(/\s+/g, '');
    s = s.replace(/[*·×x]10\^?\(?([-+]?\d+)\)?$/i, 'e$1').replace(/[^\d.)e]+$/i, '');
    const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(?:\/(\d*\.?\d+))?$/i);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  }

  // A phase as typed: a number of radians, or with π: pi/2, 3pi/4, -π, 0.5π.
  function parsePhase(s) {
    s = s.trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/\s+/g, '').replace(/rad$/i, '').replace(/pi|π/gi, 'π');
    const m = s.match(/^([-+]?)(\d*\.?\d*)\*?π(?:\/(\d*\.?\d+))?$/);
    if (m) return (m[1] === '-' ? -1 : 1) * (m[2] ? Number(m[2]) : 1) * Math.PI / (m[3] ? Number(m[3]) : 1);
    return parse(s);
  }
  // A phase is right up to multiples of 2π (to 0.02 rad); its traps the same way (in degrees: up to 360°).
  function judgePhase(x, f) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const wrap = (d, P) => Math.abs(d - P * Math.round(d / P));
    if (wrap(x - f.value, 2 * Math.PI) < 0.02) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (t.flag === 'deg' ? wrap(x - t.value, 360) < 1 : wrap(x - t.value, 2 * Math.PI) < 0.02) return { cls: 'bad', msg: t.nudge || t.why };
    return { cls: 'bad', msg: ui().wrong };
  }

  // Right within 1 % or when rounded to three digits; otherwise the answer under a typical wrong
  // idea, a sign, a power of ten or a rounding error.
  function judgeNum(x, f) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.max(Math.abs(z), 1e-300);
    if (e === 0 ? Math.abs(x) < 1e-9 : near(x, e, 0.01) || OC.sig(x, 3) === OC.sig(e, 3) || OC.sig(x, 2) === OC.sig(e, 2)) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, 0.01)) return { cls: 'bad', msg: t.nudge || t.why };
    if (e !== 0 && near(-x, e, 0.01)) return { cls: 'warn', msg: f.signed ? ui().signed : ui().sign };
    if (e !== 0 && x !== 0) { const k = Math.log10(Math.abs(x / e)); if (Math.abs(k - Math.round(k)) < 0.005 && Math.round(k) !== 0) return { cls: 'warn', msg: ui().power }; }
    if (e !== 0 && near(x, e, 0.05)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'osc', typeOf = (e) => e.scenario;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, open: [] };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    const first = $('#fields input, #fields select');
    if (first && first.type === 'text') first.focus({ preventScroll: true });
  }

  // A new exercise of the topic and stage chosen (topics.js), of another situation than the
  // current one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language)
  const again = (e) => topics.parse(e.id);

  // The topics of practice: those of the tutor's examples, with their stages (lessons.js).
  const topicList = () => window.Lessons.EXAMPLES.map((e) => ({
    name: () => e.name[OC.getLang()],
    stages: e.practice.map((s) => ({ name: s.en ? () => s[OC.getLang()] : null, types: s.types })),
  }));

  // The answer fields: a number (input in-key) or a choice (radio buttons named in-key).
  const radios = (f, list) => `<span class="choices levels small${f.pics ? ' pics' : ''}${f.stack ? ' stack' : ''}" role="radiogroup" aria-label="${f.what.replace(/<[^>]*>|\$/g, '')}">${list
    .map(([v, html, title]) => `<label><input type="radio" name="in-${f.key}" value="${v}"><span${title ? ` title="${title}" aria-label="${title}"` : ''}>${html}</span></label>`).join('')}</span>`;
  function fieldHtml(f) {
    const fb = '<span class="fb" aria-live="polite"></span>';
    if (f.type === 'num') {
      return `<div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym"><span class="what">${f.what}</span> $${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="${f.sci ? 'text' : 'decimal'}" autocomplete="off" autocapitalize="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${(OC.UNITS[f.unit] || [, f.unit])[1]}</span>${fb}</div>`;
    }
    // a choice (o[2], the explanation of a wrong one, is no title: it would give the answer away;
    // after a wrong choice, o[4], a nudge, is shown in its place where there is one)
    const list = f.options.map((o) => [o[0], o[1]]);
    return `<div class="field choice${f.pics || f.stack ? ' wide' : ''}" data-key="${f.key}"${f.after ? ' hidden' : ''}><span class="what">${f.what}</span>${radios(f, list)}${fb}</div>`;
  }
  function valueOf(f) {
    if (f.type === 'num') return $(`#in-${f.key}`).value;
    const r = document.querySelector(`input[name="in-${f.key}"]:checked`);
    return r ? r.value : null;
  }
  function setValue(f, val) {
    if (val == null) return;
    if (f.type === 'num') $(`#in-${f.key}`).value = val;
    else { const r = document.querySelector(`input[name="in-${f.key}"][value="${val}"]`); if (r) r.checked = true; }
  }
  const empty = (f, val) => (f.type === 'num' ? !String(val).trim() : val == null);
  function judge(f, val) {
    if (f.type === 'num') return f.phase ? judgePhase(parsePhase(val), f) : judgeNum(parse(val), f);
    if (val === f.value) return { cls: 'ok', msg: ui().correct };
    const o = (f.options || []).find((x) => x[0] === val);
    return { cls: 'bad', msg: (o && (o[4] || o[2])) || ui().wrong };
  }

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
    $('#prompt').innerHTML = ex.text + (ex.fields.some((f) => f.sci) ? `<p class="note">${ui().sci}</p>` : '');
    // the run to watch once solved, below the figure (the pointer: in its place)
    if (player) player.stop();
    player = null;
    const w = ex.watch ? ex.watch() : null;
    $('#figure').innerHTML = !w ? ex.figure({ task: true }) : `${w.kind === 'pointer' ? '' : ex.figure({ task: true })}<div class="pw-host osw-host"></div>`;
    $('#fields').innerHTML = ex.fields.map(fieldHtml).join('');
    if (w) {
      player = mountWatch($('#figure .pw-host'), w, {
        locked: () => !(st && (st.solved || st.revealed)),
        marks: () => w.marks(answerOf),
      });
    }
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

  // A field with `after` is shown once the field it follows is right (st.open: those shown).
  const shown = (f) => !f.after || st.open.includes(f.key);
  function showOpen() { ex.fields.forEach((f) => { const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`); if (row) row.hidden = !shown(f); }); }

  // Marks every field shown; true if all are right, null if some are empty, 'next' if a hidden
  // field opens now.
  function feedback() {
    let allOk = true, anyEmpty = false;
    ex.fields.filter(shown).forEach((f) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`), base = row.className.replace(/ (ok|warn|bad)\b/g, ''), val = valueOf(f);
      if (empty(f, val)) { anyEmpty = true; allOk = false; row.className = base; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(f, val);
      row.className = `${base} ${r.cls}`;
      row.querySelector('.fb').textContent = r.msg;
      if (r.cls !== 'ok') allOk = false;
    });
    if (allOk) {
      const opens = ex.fields.filter((f) => !shown(f) && ex.fields.some((g) => g.key === f.after));
      if (opens.length) { opens.forEach((f) => st.open.push(f.key)); showOpen(); return 'next'; }
    }
    return allOk ? true : anyEmpty ? null : false;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    st.status = kind;
    el.className = 'status' + (kind === 'ok' || kind === 'next' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? ui().fill : kind === 'next' ? ui().next
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (st.tries < MAX_TRIES && !canReveal() ? ui().tryAgain : ui().canReveal);
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    if (r === 'next') { showStatus('next'); const row = $('#fields').querySelector('.field:not([hidden]):last-child'); if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    st.tries++;
    if (r) {
      if (!st.solved && !st.revealed) {
        const s = stored('osc-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('osc-score', s);
        showScore();
      }
      st.solved = true;
      Practice.markSolved(PRACTICE, ex.id);
      finish();
      st.advance = topics.solved(st, ex);
      showStatus('ok');
    } else showStatus('bad');
    updateButtons();
    if (player) player.refresh(); // solved: the body can be let go
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
    $('#sol-figure').innerHTML = ex.solutionFigure();
    $('#sol-steps').innerHTML = ex.solution.join('');
    $('#sol-short').innerHTML = `${ui().results}: ${ex.results}`;
    $('#solution').hidden = false;
    math($('#solution'));
    markScrollable();
  }
  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    ex.fields.forEach((f) => { if (f.after && !st.open.includes(f.key)) st.open.push(f.key); });
    showOpen();
    finish();
    showSolution();
    updateButtons();
    if (player) player.refresh(); // the body can be let go
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- predict, then watch
  // Once an exercise with a run (oscWatch in scenarios.js) is solved or its solution shown (and in
  // the last frame of three worked examples), the student lets the body go (or sets the pointer
  // turning) and watches it move (play.js): the scene beside a small graph of y (and of v and a)
  // drawn up to the time of the slider, a dot on each curve and, with numbers, the values read
  // off below it; the student's answers are rings (✓ right, ✗ not), shown once the run has
  // reached their time. A run with numbers lasts SECONDS, in slow motion or time lapse: the note
  // under the graph says how much.
  const SECONDS = 3;
  const fix = (x, d) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d).replace('-', '−');
  // a tidy step for about n intervals of size span
  function niceStep(span, n) {
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  // the top of an axis: the next of 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 (times a power of ten)
  function niceTop(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= x - 1e-12 * p) * p;
  }
  // the decimals a number needs (0.25: 2)
  const decimals = (s) => { let d = 0; while (d < 6 && Math.abs(s * 10 ** d - Math.round(s * 10 ** d)) > 1e-6) d++; return d; };
  // the student's answer of field key: a number (NaN if none) or the option chosen (null)
  function answerOf(key) {
    const f = ex && ex.fields.find((x) => x.key === key);
    if (!f) return null;
    const v = valueOf(f);
    return f.type === 'num' ? (empty(f, v) ? NaN : parse(v)) : v;
  }
  // a value of the run in the unit of its graph
  const inGraph = (w, q, x) => (w.units ? OC.inUnit(x, w.units[q]) : x);

  // The graph at time t: y (and v and a) up to t, the line of t with a dot on each curve, and the
  // marks reached.
  function graph(w, t, marks) {
    const W = 330, ml = 46, mr = 14, t0 = -0.15 * w.t1, T1 = w.t1, n = w.panels.length, ph = n === 1 ? 150 : 62, gap = 26;
    const panels = w.panels.map((q, i) => ({ q, top: 26 + i * (ph + gap), h: ph }));
    const bottom = panels[n - 1].top + ph, H = bottom + 34;
    const X = (x) => ml + ((x - t0) / (T1 - t0)) * (W - ml - mr), f1 = (x) => x.toFixed(1);
    const ts = Array.from({ length: 241 }, (_, k) => (k * T1) / 240), until = Math.min(t, T1);
    let svg = `<svg class="osw-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${OC.L('The motion against time', 'Die Bewegung gegen die Zeit')}">`;
    panels.forEach((pn) => {
      const q = pn.q, mine = marks.filter((m) => m.q === q).map((m) => Math.abs(m.y));
      // the axis: that of the exercise's graphs (a track), else symmetric around 0, with room for
      // the answers (up to 2.2 times the largest size)
      let lo, hi;
      if (w.axis) ({ lo, hi } = w.axis);
      else {
        const base = inGraph(w, q, w.amp[q]), top = Math.min(2.2 * base, Math.max(base, ...mine));
        hi = w.units ? niceTop(1.04 * top) : 1.3 * top;
        lo = -hi;
      }
      const Y = (y) => pn.top + ((hi - Math.max(lo - 0.04 * (hi - lo), Math.min(hi + 0.04 * (hi - lo), y))) / (hi - lo)) * pn.h;
      pn.Y = Y;
      // the grid, 0 and the labels: numbers, or ±A (±v̂, ±â) without
      svg += `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(hi))}" y2="${f1(Y(hi))}"/><line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(lo))}" y2="${f1(Y(lo))}"/>`;
      svg += `<line class="ax" x1="${ml}" x2="${W - mr}" y1="${f1(Y(0))}" y2="${f1(Y(0))}"/><text class="tick" x="${ml - 5}" y="${f1(Y(0) + 4)}" text-anchor="end">0</text>`;
      if (w.units) {
        for (const y of [-hi, -hi / 2, hi / 2, hi]) svg += `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(y))}" y2="${f1(Y(y))}"/>`;
        for (const y of [-hi, hi]) svg += `<text class="tick" x="${ml - 5}" y="${f1(Y(y) + 4)}" text-anchor="end">${fix(y, decimals(hi))}</text>`;
      } else if (!w.axis) {
        const base = w.amp[q], hat = q === 'y' ? '<tspan class="it">A</tspan>' : `<tspan class="it">${q}&#770;</tspan>`;
        for (const y of [-base, base]) svg += `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(y))}" y2="${f1(Y(y))}"/><text class="tick" x="${ml - 5}" y="${f1(Y(y) + 4)}" text-anchor="end">${y < 0 ? '−' : ''}${hat}</text>`;
      }
      svg += `<text class="qname n-${q}" x="4" y="${pn.top - 10}"><tspan class="it">${q === 'y' ? w.name || 'y' : q}</tspan>${w.units ? `<tspan> in ${OC.UNITS[w.units[q]][1]}</tspan>` : ''}</text>`;
      // the release
      svg += `<line class="release" x1="${f1(X(0))}" x2="${f1(X(0))}" y1="${pn.top - 4}" y2="${pn.top + pn.h + 4}"/>`;
      const val = (x) => inGraph(w, q, w.at(x)[q]), v0 = val(-1);
      let d = `M${f1(X(t0))} ${f1(Y(v0))}L${f1(X(Math.min(0, until)))} ${f1(Y(v0))}`;
      if (until >= 0) {
        ts.filter((x) => x <= until).forEach((x) => { d += `L${f1(X(x))} ${f1(Y(val(x)))}`; });
        d += `L${f1(X(until))} ${f1(Y(val(until)))}`;
      }
      svg += `<path class="wcurve q-${q}" d="${d}"/>`;
      if (t > t0) svg += `<line class="now" x1="${f1(X(until))}" x2="${f1(X(until))}" y1="${pn.top - 4}" y2="${pn.top + pn.h + 4}"/>`;
    });
    // the time axis: in s, in periods, or no numbers
    if (w.unit === 's') {
      const tStep = niceStep(T1, 5);
      for (let k = 0; k * tStep <= T1 + 1e-9; k++) svg += `<text class="tick" x="${f1(X(k * tStep))}" y="${bottom + 15}" text-anchor="middle">${fix(k * tStep, decimals(tStep))}</text>`;
    } else if (w.unit === 'T') {
      for (let k = 0; k <= T1 + 1e-9; k++) svg += `<text class="tick" x="${f1(X(k))}" y="${bottom + 15}" text-anchor="middle">${k === 0 ? '0' : `${k === 1 ? '' : k}<tspan class="it">T</tspan>`}</text>`;
    }
    svg += `<text class="tick" x="${W - mr}" y="${bottom + 30}" text-anchor="end"><tspan class="it">t</tspan>${w.unit === 's' ? ' in s' : ''}</text>`;
    // the answers reached, then a dot on each curve
    marks.forEach((m) => {
      const pn = panels.find((x) => x.q === m.q), cx = X(m.t), cy = pn.Y(m.y);
      svg += `<circle class="pred q-${m.q}" cx="${f1(cx)}" cy="${f1(cy)}" r="6"/><text class="mk ${m.ok ? 'ok' : 'bad'}" x="${f1(Math.min(W - 6, cx + 8))}" y="${f1(cy - 7)}">${m.ok ? '✓' : '✗'}</text>`;
    });
    panels.forEach((pn) => { svg += `<circle class="dot q-${pn.q}" cx="${f1(X(until))}" cy="${f1(pn.Y(inGraph(w, pn.q, w.at(until)[pn.q])))}" r="4"/>`; });
    return `${svg}</svg>`;
  }

  // The player of the run w in host. o: { locked(), marks() → the student's answers (w.marks) }.
  function mountWatch(host, w, o = {}) {
    let shown = null, scene = null;
    const L = OC.L, fieldOf = (key) => ex && ex.fields.find((f) => f.key === key);
    // a number answered is right as in the feedback
    const okOf = (m) => (m.ok != null ? m.ok : (() => { const f = fieldOf(m.key); return !!f && judge(f, valueOf(f)).cls === 'ok'; })());
    const body = w.kind === 'pointer' ? L('the pointer', 'den Zeiger') : L('the body', 'den Körper');
    // scene time per real second: a run with numbers in slow motion or time lapse
    const rate = w.t1 / SECONDS, factor = rate < 1 ? 1 / rate : rate, fx = OC.num(OC.sig(factor, 2));
    const scale = () => (w.unit !== 's' ? '' : factor < 1.1 ? L('In real time.', 'In Echtzeit.') : rate < 1 ? L(`Slow motion: ${fx} times slower than in reality.`, `Zeitlupe: ${fx}-mal langsamer als in Wirklichkeit.`) : L(`Time lapse: ${fx} times faster than in reality.`, `Zeitraffer: ${fx}-mal schneller als in Wirklichkeit.`));
    return window.Play.create(host, {
      t0: -0.15 * w.t1, t1: w.t1, seconds: SECONDS,
      locked: o.locked,
      render(el, s) {
        const lock = !!(o.locked && o.locked()), key = `${lock}|${OC.getLang()}`;
        if (key !== shown) {
          shown = key;
          scene = window.Figures.watchScene(w);
          el.innerHTML = `<div class="osw"><div class="osw-fig">${scene.frame}</div><div class="osw-side"></div></div>`;
          markScrollable();
        }
        el.querySelector('.osw-pose').innerHTML = scene.pose({ ...w.at(Math.min(s.t, w.t1)), held: !s.after && !w.push });
        const side = el.querySelector('.osw-side');
        if (lock) { side.innerHTML = `<p class="note osw-wait">${L('The graph of the motion appears here once you have solved the exercise or looked at the solution.', 'Der Graph der Bewegung erscheint hier, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.')}</p>`; return; }
        const at = w.at(Math.min(s.t, w.t1));
        const marks = (o.marks ? o.marks() : []).map((m) => ({ ...m, ok: okOf(m) })).filter((m) => s.after && s.t >= m.t - 1e-9);
        const rows = [];
        if (w.units) {
          w.panels.forEach((q) => {
            const x = inGraph(w, q, at[q]), big = Math.max(Math.abs(inGraph(w, q, w.amp[q])), 1e-9);
            rows.push(`<li><span class="key q-${q}" aria-hidden="true"></span><i>${q}</i> = ${fix(x, Math.max(0, 2 - Math.floor(Math.log10(big))))} ${OC.UNITS[w.units[q]][1]}</li>`);
          });
        }
        // one line per answer (a graph: ✓ only if every ring is)
        const says = [...new Set(marks.map((m) => m.say))];
        says.forEach((say) => { const ok = marks.filter((m) => m.say === say).every((m) => m.ok); rows.push(`<li class="pred ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${say}</li>`); });
        side.innerHTML = graph(w, s.t, marks) + `<ul class="osw-read">${rows.join('')}</ul>` + (scale() ? `<p class="note osw-scale">${scale()}</p>` : '');
      },
      texts: () => ({
        switch: w.kind === 'pointer' ? L('The pointer: set it turning', 'Der Zeiger: drehen lassen') : w.push ? L('The body: push it', 'Der Körper: anstossen') : L('The body: let it go', 'Der Körper: loslassen'),
        locked: L(`Check your answer first: you can start ${body} once you have solved the exercise or looked at the solution.`, `Prüfe zuerst deine Antwort: Du kannst ${body} starten, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.`),
        ready: w.kind === 'pointer' ? L('Click the pointer to set it turning, and watch the body follow the height of its tip.', 'Klicke auf den Zeiger, damit er sich dreht, und schau zu, wie der Körper der Höhe seiner Spitze folgt.')
          : w.push ? L('Click the body to give it a push upwards, and watch it oscillate.', 'Klicke auf den Körper, um ihn nach oben anzustossen, und schau zu, wie er schwingt.')
            : w.kind === 'track' ? L('Click the body to let it go, and watch it move as the equation says.', 'Klicke auf den Körper, um ihn loszulassen, und schau zu, wie er sich gemäss der Gleichung bewegt.')
              : L('Click the body to let it go, and watch it oscillate.', 'Klicke auf den Körper, um ihn loszulassen, und schau zu, wie er schwingt.'),
        again: (o.marks ? L('Rings: your answers (✓ right, ✗ not). ', 'Ringe: deine Antworten (✓ richtig, ✗ nicht). ') : '') +
          L(`Click ${body} again to go back, or ▶ to watch once more.`, `Klicke nochmals auf ${body}, um zurückzugehen, oder ▶, um nochmals zuzuschauen.`),
        time: w.unit === 's' ? (t) => `t = ${fix(t, w.t1 < 2 ? 2 : 1)} s` : w.unit === 'T' ? (t) => `t = ${fix(t, 2)} T` : null,
      }),
    });
  }

  // ---------------------------------------------------------------- language
  const lessons = () => window.Lessons.EXAMPLES.map((e, i) => ({
    name: e.name[OC.getLang()], idea: e.idea[OC.getLang()], also: topics.also(i), frames: () => tutorial(e).frames,
  }));
  // the last frame of an example with a run to watch (tutorial(lesson).watch, generator.js)
  function watchInTutor() {
    if (tutorPlayer) tutorPlayer.stop();
    tutorPlayer = null;
    const host = $('#t-figure .pw-host'), e = window.Lessons.EXAMPLES[tutor ? tutor.current() : 0];
    if (host && e && e.watch != null) tutorPlayer = mountWatch(host, tutorial(e).watch(), {});
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
      const values = ex.fields.map(valueOf), keep = { ...st };
      ex = again(ex) || ex;
      render();
      st = keep;
      ex.fields.forEach((f, k) => setValue(f, values[k]));
      showOpen();
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
  // Practice: exercises by topic; tutor: worked examples; check: a short test on the learning
  // objectives (check.js, check-src.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('osc-mode', m);
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
    topics = window.Topics.create({
      app: PRACTICE, topics: topicList(),
      make: (type, seed) => practiceOf(type, seed), typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    applyStatic();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    // when every field shown is a choice (yes or no, which graph, …), a click checks at once
    $('#answers').addEventListener('change', (e) => {
      if (e.target.type !== 'radio' || st.solved || !ex.fields.filter(shown).every((f) => f.type !== 'num')) return;
      check({ preventDefault() {} });
    });
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
    checker = Check.create(window.CheckSource, {
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
    const last = stored('osc-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
