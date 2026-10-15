(function () {
  'use strict';

  const CL = window.CL, Lang = window.Lang, Check = window.Check, { practiceOf, tutorial } = window.Coulomb;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Point Charges', mode: 'Mode', difficulty: 'Difficulty', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. What a step is about is highlighted. Positive charges are red, negative ones green; the net force or field is purple.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every part, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Give the size (a positive number)', close: 'Close: check your rounding', wrong: 'Not correct', power: 'Off by a power of ten: check the units (cm, μC, nC, mN, μN)',
      rankWrong: (n) => `${n === 1 ? 'One place is' : `${n} places are`} not right yet`, sci: 'Powers of ten: type 3.2e-8 or 3.2*10^-8.', none: 'none',
      drawNote: 'Drag a force onto the charge it acts on (or tap the force, then the charge), then drag its tip to set its direction and length; drag an arrow off the drawing to remove it. (Keys on a selected arrow: ← → turn, ↑ ↓ length, Delete removes.)',
      drawOk: '✓ The forces are right.', drawBad: '✗ Not right yet:', drawShown: 'The right forces are drawn.', noNet: 'No net force', drawFirst: 'Draw the forces first, then check.',
      fillDraw: 'Draw the forces and answer every part, then check again.', drawTutorOk: '✓ The forces are right. Go on to compare with the worked solution.',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Punktladungen', mode: 'Modus', difficulty: 'Schwierigkeit', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Worum es in einem Schritt geht, ist hervorgehoben. Positive Ladungen sind rot, negative grün; die resultierende Kraft oder das Gesamtfeld ist violett.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte alle Teile, dann prüfe nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Gib den Betrag an (eine positive Zahl)', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig', power: 'Um eine Zehnerpotenz daneben: Prüfe die Einheiten (cm, μC, nC, mN, μN)',
      rankWrong: (n) => `${n === 1 ? 'Ein Platz stimmt' : `${n} Plätze stimmen`} noch nicht`, sci: 'Zehnerpotenzen: Tippe 3.2e-8 oder 3.2*10^-8.', none: 'keine',
      drawNote: 'Ziehe eine Kraft auf die Ladung, auf die sie wirkt (oder tippe die Kraft an und dann die Ladung), und dann ihre Spitze, um Richtung und Länge einzustellen; ziehe einen Pfeil aus der Zeichnung, um ihn zu entfernen. (Tasten bei einem gewählten Pfeil: ← → drehen, ↑ ↓ Länge, Entf entfernt.)',
      drawOk: '✓ Die Kräfte stimmen.', drawBad: '✗ Noch nicht richtig:', drawShown: 'Die richtigen Kräfte sind eingezeichnet.', noNet: 'Keine resultierende Kraft', drawFirst: 'Zeichne zuerst die Kräfte und prüfe dann.',
      fillDraw: 'Zeichne die Kräfte und beantworte alle Teile, dann prüfe nochmals.', drawTutorOk: '✓ Die Kräfte stimmen. Vergleiche nun mit der ausführlichen Lösung.',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[CL.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('cl-score', { solved: 0, clean: 0 });
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

  // Right within 1 % or when rounded to three digits; otherwise the answer under a typical wrong
  // idea, a sign, a power of ten or a rounding error.
  function judgeNum(x, f) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.max(Math.abs(z), 1e-300);
    if (e === 0 ? Math.abs(x) < 1e-9 : near(x, e, 0.01) || CL.sig(x, 3) === CL.sig(e, 3) || CL.sig(x, 2) === CL.sig(e, 2)) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, 0.01)) return { cls: 'bad', msg: t.nudge || t.why };
    if (e !== 0 && near(-x, e, 0.01)) return { cls: 'warn', msg: ui().sign };
    if (e !== 0 && x !== 0) { const k = Math.log10(Math.abs(x / e)); if (Math.abs(k - Math.round(k)) < 0.005 && Math.round(k) !== 0) return { cls: 'warn', msg: ui().power }; }
    if (e !== 0 && near(x, e, 0.05)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'cl', typeOf = (e) => e.scenario;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, arrows: [], none: false, drawn: false, shownRight: false };
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
    name: () => e.name[CL.getLang()],
    stages: e.practice.map((s) => ({ name: s.en ? () => s[CL.getLang()] : null, types: s.types })),
  }));

  // The answer fields: a number (input in-key), a direction or a choice (radio buttons named
  // in-key), a ranking (a select in-key-A per item).
  const radios = (f, list) => `<span class="choices levels small${f.type === 'dir' ? ' dirs' : ''}" role="radiogroup" aria-label="${f.what}">${list
    .map(([v, html, title]) => `<label><input type="radio" name="in-${f.key}" value="${v}"><span${title ? ` title="${title}" aria-label="${title}"` : ''}>${html}</span></label>`).join('')}</span>`;
  function fieldHtml(f) {
    const fb = '<span class="fb" aria-live="polite"></span>';
    if (f.type === 'num') {
      return `<div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym"><span class="what">${f.what}</span> $${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="${f.sci ? 'text' : 'decimal'}" autocomplete="off" autocapitalize="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${(CL.UNITS[f.unit] || [, f.unit])[1]}</span>${fb}</div>`;
    }
    if (f.type === 'rank') {
      const n = f.items.length, opts = `<option value="">–</option>${Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}`;
      return `<div class="field choice rank" data-key="${f.key}"><span class="what">${f.what}</span>
        <span class="ranks">${f.items.map((it) => `<label><b>${it}</b> <select id="in-${f.key}-${it}">${opts}</select></label>`).join('')}</span>${fb}</div>`;
    }
    // all nine directions as a compass, 3 × 3, with "none" in the middle
    const compass = f.type === 'dir' && f.dirs.length === 9, order = ['NW', 'N', 'NE', 'W', '0', 'E', 'SW', 'S', 'SE'];
    const dirs = f.type === 'dir' ? (compass ? order : f.dirs) : null;
    const list = dirs ? dirs.map((d) => [d, d === '0' ? (compass ? '0' : ui().none) : CL.ARROW[d], CL.dirName(d)]) : f.options;
    return `<div class="field choice${compass ? ' compass' : ''}" data-key="${f.key}"><span class="what">${f.what}</span>${radios(f, list)}${fb}</div>`;
  }
  // ---------------------------------------------------------------- the forces drawn
  // Where a situation has draw (generator.js: drawOf), practice asks to draw the forces on the
  // figure (shared arrow.js) instead of choosing their directions; the other answers stay fields,
  // and the check keeps its four options. The arrows are kept in st.arrows, so that they survive
  // a redraw (the other language); a check marks them, with a nudge per thing wrong while the
  // exercise is open and the explanation once it is solved or the solution shown; the marks go
  // once the drawing changes. The tutor's example asks the same before its steps (see tutorDraw).
  let drawing = null;
  const drawnKeys = () => new Set(ex.draw ? ex.draw.keys : []);
  // The arrows on the svg of the drawing d, kept in h() (its arrows, and none: "No net force"
  // chosen, a button where the forces may cancel); o: { locked, palette, onChange }. Returns {
  // ar (the arrows, arrow.js), lock(), mark(marks, none) }.
  function arrowsIn(svg, d, h, o) {
    const isNet = (a) => d.target.some((t) => t.net && t.kind === a.kind);
    let btn = null;
    const ar = window.Arrow.create(svg, {
      kinds: d.kinds.map((k) => ({ id: k.id, label: k.name, cls: k.cls, dirs: k.dirs, max: k.max })),
      anchors: d.anchors,
      tail: (kind, an) => d.tail(kind, an),
      len: d.len, gap: d.gap, start: d.start,
      label: (a) => d.label(a, h().arrows), labelCls: 'flbl',
      note: ui().drawNote,
      state: h().arrows,
      locked: o.locked,
      palette: o.palette,
      onEdit: (x) => {
        h().arrows = x.state();
        if (h().none && h().arrows.some(isNet)) { h().none = false; showNone(); }
        o.onChange();
      },
    });
    function showNone() {
      if (!btn) return;
      btn.setAttribute('aria-pressed', h().none ? 'true' : 'false');
      btn.disabled = !!o.locked;
    }
    if (d.none && o.palette) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ar-none';
      btn.innerHTML = `<span class="ar-oi-sym" aria-hidden="true">0</span> ${ui().noNet}`;
      btn.addEventListener('click', () => {
        if (o.locked) return;
        h().none = !h().none;
        if (h().none) { h().arrows = h().arrows.filter((a) => !isNet(a)); ar.restore(h().arrows); }
        showNone();
        o.onChange();
      });
      o.palette.querySelector('.ar-kinds').insertBefore(btn, o.palette.querySelector('.ar-remove'));
      showNone();
    }
    return {
      ar,
      lock() { o.locked = true; ar.select(null); ar.show({ locked: true }); showNone(); },
      mark(marks, none) {
        ar.mark(marks);
        if (btn) { btn.classList.toggle('ok', none === 'ok'); btn.classList.toggle('bad', none === 'bad'); }
      },
    };
  }
  // the judging of the drawing w (arrowsIn) shown in el: true if right, false if wrong, null if
  // nothing is drawn
  function drawJudged(el, w, d, h, done, okText) {
    if (!h.arrows.length && !h.none) { w.mark({}); el.className = 'draw-fb'; el.innerHTML = ''; return null; }
    const j = d.judge(h.arrows, done, !!h.none);
    w.mark(j.marks, h.none ? (d.zero ? 'ok' : 'bad') : null);
    el.className = `draw-fb ${j.ok ? 'ok' : 'bad'}`;
    el.innerHTML = j.ok ? `<p>${okText}</p>` : `<p>${ui().drawBad}</p><ul class="draw-notes">${j.notes.map((n) => `<li>${n.text}</li>`).join('')}</ul>`;
    math(el);
    return j.ok;
  }
  const drawHtml = () => `<div class="field draw" data-key="draw"><p class="what ask">${ex.draw.ask}</p><div id="cpalette"></div><div id="draw-fb" class="draw-fb" aria-live="polite"></div></div>`;
  function mountDrawing() {
    drawing = null;
    const svg = $('#figure svg');
    if (!ex.draw || !svg) return;
    drawing = arrowsIn(svg, ex.draw, () => st, { locked: st.solved || st.revealed, palette: $('#cpalette'), onChange: clearDrawn });
  }
  // the marks of a check, gone once the drawing changes
  function clearDrawn() {
    if (!st.drawn) return;
    st.drawn = false;
    drawing.mark({}, null);
    $('#draw-fb').className = 'draw-fb';
    $('#draw-fb').innerHTML = '';
  }
  // the drawing judged: true if right, false if wrong, null if nothing is drawn
  function drawFeedback() {
    const r = drawJudged($('#draw-fb'), drawing, ex.draw, st, st.solved || st.revealed, st.shownRight ? ui().drawShown : ui().drawOk);
    st.drawn = r !== null;
    return r;
  }
  const lockDrawing = () => { if (drawing) drawing.lock(); };

  function valueOf(f) {
    if (f.type === 'num') return $(`#in-${f.key}`).value;
    if (f.type === 'rank') { const o = {}; for (const it of f.items) { const v = $(`#in-${f.key}-${it}`).value; if (!v) return null; o[it] = Number(v); } return o; }
    const r = document.querySelector(`input[name="in-${f.key}"]:checked`);
    return r ? r.value : null;
  }
  function setValue(f, val) {
    if (val == null) return;
    if (f.type === 'num') $(`#in-${f.key}`).value = val;
    else if (f.type === 'rank') f.items.forEach((it) => { $(`#in-${f.key}-${it}`).value = val[it]; });
    else { const r = document.querySelector(`input[name="in-${f.key}"][value="${val}"]`); if (r) r.checked = true; }
  }
  const empty = (f, val) => (f.type === 'num' ? !String(val).trim() : val == null);
  function judge(f, val) {
    if (f.type === 'num') return judgeNum(parse(val), f);
    if (f.type === 'rank') { const n = f.items.filter((it) => val[it] !== f.value[it]).length; return n ? { cls: 'bad', msg: ui().rankWrong(n) } : { cls: 'ok', msg: ui().correct }; }
    if (val === f.value) return { cls: 'ok', msg: ui().correct };
    const t = (f.traps || []).find((x) => x.value === val); // the answer of a typical wrong idea
    return { cls: 'bad', msg: (t && (t.nudge || t.why)) || ui().wrong };
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
    $('#figure').innerHTML = ex.draw ? ex.draw.fig : ex.figure({ task: true });
    $('#fields').innerHTML = (ex.draw ? drawHtml() : '') + ex.fields.filter((f) => !drawnKeys().has(f.key)).map(fieldHtml).join('');
    mountDrawing();
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
    if (ex.draw) { const r = drawFeedback(); if (r === null) anyEmpty = true; if (r !== true) allOk = false; }
    ex.fields.filter((f) => !drawnKeys().has(f.key)).forEach((f) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`), base = row.className.replace(/ (ok|warn|bad)\b/g, ''), val = valueOf(f);
      if (empty(f, val)) { anyEmpty = true; allOk = false; row.className = base; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(f, val);
      row.className = `${base} ${r.cls}`;
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
    el.textContent = !kind ? '' : kind === 'fill' ? (ex.draw ? ui().fillDraw : ui().fill)
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
        const s = stored('cl-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('cl-score', s);
        showScore();
      }
      st.solved = true;
      Practice.markSolved(PRACTICE, ex.id);
      finish();
      st.advance = topics.solved(st, ex);
      lockDrawing();
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
    finish();
    if (ex.draw) {
      // the drawing explained; if nothing is drawn, the right forces
      if (!st.arrows.length && !st.none) { st.arrows = ex.draw.right(); st.none = ex.draw.zero; st.shownRight = true; $('#figure').innerHTML = ex.draw.fig; mountDrawing(); }
      lockDrawing();
      drawFeedback();
    }
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- the tutor's drawing
  // An example whose forces can be drawn asks for them after the situation (a frame with .t-draw,
  // see tutorial in generator.js): the student draws and checks, with nudges, before the steps
  // show the solution; or simply goes on. The arrows of each example are kept (tutorDraw).
  const tutorDraw = {};
  function mountTutorDrawing() {
    const box = $('#t-text .t-draw'), svg = $('#t-figure svg');
    if (!box || !svg) return;
    const i = tutor.current(), e = window.Lessons.EXAMPLES[i], d = window.Coulomb.exercise(window.Coulomb.byId(e.scenario), e.p).draw;
    const s = tutorDraw[i] || (tutorDraw[i] = { arrows: [], none: false, drawn: false, ok: false });
    box.innerHTML = `<div id="t-palette"></div><div class="actions"><button type="button" id="t-dcheck" class="primary">${ui().check}</button></div><div id="t-dfb" class="draw-fb" aria-live="polite"></div>`;
    const fb = $('#t-dfb');
    const w = arrowsIn(svg, d, () => s, {
      locked: s.ok, palette: $('#t-palette'),
      onChange: () => { if (s.drawn) { s.drawn = false; w.mark({}, null); fb.className = 'draw-fb'; fb.innerHTML = ''; } },
    });
    const judge = () => {
      const r = drawJudged(fb, w, d, s, false, ui().drawTutorOk);
      if (r === null) { fb.className = 'draw-fb'; fb.textContent = ui().drawFirst; return; }
      s.drawn = true;
      if (r) { s.ok = true; w.lock(); $('#t-dcheck').disabled = true; }
    };
    $('#t-dcheck').disabled = s.ok;
    $('#t-dcheck').addEventListener('click', judge);
    if (s.drawn) judge();
  }

  // ---------------------------------------------------------------- language
  const lessons = () => window.Lessons.EXAMPLES.map((e, i) => ({
    name: e.name[CL.getLang()], idea: e.idea[CL.getLang()], also: topics.also(i), frames: () => tutorial(e).frames,
  }));

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
      if (st.checked) feedback();
      else if (st.drawn && ex.draw) drawFeedback();
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
  // Practice: exercises by topic; tutor: worked examples; check: a short test on the learning
  // objectives (check.js, check-src.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('cl-mode', m);
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
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { mountTutorDrawing(); math($('#tutor')); markScrollable(); },
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
    const last = stored('cl-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
