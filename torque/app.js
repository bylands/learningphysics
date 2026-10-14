(function () {
  'use strict';

  const TQ = window.TQ, Lang = window.Lang, Check = window.Check, { generate, practiceOf, tutorial } = window.Torque;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Torque and Equilibrium', mode: 'Mode', difficulty: 'Difficulty', calc: 'Calculator', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. What a step is about is highlighted. Torques: ↺ counterclockwise, ↻ clockwise.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Fill in all fields and choose each sense of rotation, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Give the size (a positive number)', close: 'Close: check your rounding', wrong: 'Not correct',
      compsHead: '1 · First identify', compsNote: 'Choose the lever arm in the drawing. The lengths of the segments are given, so that no calculator is needed.', calcHead: '2 · Then calculate', idFirst: 'First choose the lever arm above.',
      sense: 'Sense of rotation', ccw: 'counterclockwise', cw: 'clockwise', none: 'no rotation', badSense: 'The size is right, but not the sense of rotation',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
      measure: 'Measure', clear: 'Clear', length: 'Length', measureHelp: 'Drag from one grid point to another, or click (tap) both ends, to measure the distance between them.', measureFrom: 'Now click or tap the other end.',
      squares: (n) => `${n} ${n === 1 ? 'square' : 'squares'}`,
    },
    de: {
      title: 'Drehmoment und Gleichgewicht', mode: 'Modus', difficulty: 'Schwierigkeit', calc: 'Taschenrechner', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Worum es in einem Schritt geht, ist hervorgehoben. Drehmomente: ↺ im Gegenuhrzeigersinn, ↻ im Uhrzeigersinn.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Fülle alle Felder aus und wähle jeden Drehsinn, dann prüfe nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Gib den Betrag an (eine positive Zahl)', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig',
      compsHead: '1 · Zuerst bestimmen', compsNote: 'Wähle den Hebelarm in der Zeichnung. Die Längen der Strecken sind angegeben, sodass kein Taschenrechner nötig ist.', calcHead: '2 · Dann berechnen', idFirst: 'Wähle zuerst oben den Hebelarm.',
      sense: 'Drehsinn', ccw: 'im Gegenuhrzeigersinn', cw: 'im Uhrzeigersinn', none: 'keine Drehung', badSense: 'Der Betrag stimmt, aber nicht der Drehsinn',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
      measure: 'Messen', clear: 'Löschen', length: 'Länge', measureHelp: 'Ziehe von einem Gitterpunkt zu einem anderen, oder klicke (tippe) beide Enden an, um ihren Abstand zu messen.', measureFrom: 'Klicke oder tippe jetzt das andere Ende an.',
      squares: (n) => `${n} Kästchen`,
    },
  };
  const ui = () => UI[TQ.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('tq-score', { solved: 0, clean: 0 });
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
  function parse(s) {
    s = s.trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/[^\d.)]+$/, '').trim();
    const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(?:\s*\/\s*(\d*\.?\d+))?$/i);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  }

  // Right within 1 % or when rounded to the field's decimal places; otherwise the answer under a
  // typical wrong idea, a sign or a rounding error. A torque also needs its sense of rotation.
  function judge(x, f, sense) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.max(Math.abs(z), 0.01);
    const right = near(x, e, 0.01) || Math.abs(x - e) <= 0.5 * 10 ** -f.dec + 1e-9;
    if (right) return f.sense && sense !== f.senseValue ? { cls: 'bad', msg: ui().badSense } : { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, 0.01)) return { cls: 'bad', msg: t.nudge || t.why };
    if (e !== 0 && near(-x, e, 0.01)) return { cls: 'warn', msg: ui().sign };
    if (e !== 0 && near(x, e, 0.05)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  const newSeed = () => 1 + Math.floor(Math.random() * 999999);

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'tq', typeOf = (e) => e.scenario;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, ident: {} };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    if (ex.fields.length) $(`#in-${ex.fields[0].key}`).focus({ preventScroll: true });
  }

  // A new exercise of the topic and stage chosen (topics.js), of another situation than the
  // current one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language); links of earlier versions name a level
  const again = (e) => topics.parse(e.id) || generate(e.level, e.seed, e.calc);

  // The topics of practice: those of the tutor's examples, with their stages (lessons.js).
  const topicList = () => window.Lessons.EXAMPLES.map((e) => ({
    name: () => e.name[TQ.getLang()],
    stages: e.practice.map((s) => ({ name: s.en ? () => s[TQ.getLang()] : null, types: s.types })),
  }));

  // The answer fields; their inputs have the ids `${prefix}-${key}`. A torque has its sense of
  // rotation too: ↺, ↻ or none (radio buttons named `${prefix}-${key}-s`, values 1, -1, 0).
  const senseHtml = (f, prefix) => `<span class="senses levels small" role="radiogroup" aria-label="${ui().sense}">${[[1, '↺', ui().ccw], [-1, '↻', ui().cw], [0, '0', ui().none]]
    .map(([v, sym, name]) => `<label><input type="radio" name="${prefix}-${f.key}-s" value="${v}"><span title="${name}" aria-label="${name}">${sym}</span></label>`).join('')}</span>`;
  const fieldsHtml = (exercise, prefix) => exercise.fields.map((f) => `
      <div class="field${f.sense ? ' torque' : ''}" data-key="${f.key}">
        <label for="${prefix}-${f.key}" class="sym"><span class="what">${f.what}:</span> $${TQ.tex(...f.sym)}$&nbsp;=</label>
        <input id="${prefix}-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${TQ.UNITS[f.unit]}</span>
        <span class="after">${f.sense ? senseHtml(f, prefix) : ''}<span class="fb" aria-live="polite"></span></span>
      </div>`).join('');
  const senseOf = (f) => { const r = document.querySelector(`input[name="in-${f.key}-s"]:checked`); return r ? Number(r.value) : null; };

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
    $('#figure').innerHTML = ex.figure({ task: true });
    if (ruler.id !== ex.id) rulerReset(); else rulerDraw(); // kept when only the language changes
    $('#fields').innerHTML = fieldsHtml(ex, 'in');
    showComps();
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    math($('#task'));
    markScrollable();
    updateButtons();
  }

  // What to identify first (lever arms at an angle, see identify.js): the app gives the values, so
  // that no calculator is needed. An exercise without fields is a choice only (a ranking, the error
  // in a sketch): a right choice solves it.
  const identItems = () => (ex.comps || []).map((c) => (c.options ? c : Identify.trig({ ...c, alpha: ex.p.alpha, num: (x) => TQ.num(x, 2) })));
  // the task's drawing, with what has been identified drawn in (all once the solution is shown)
  function drawTask() {
    const items = identItems(), shown = (ex.comps || []).filter((c, i) => c.fig && (st.revealed || Identify.right(items[i], st.ident))).map((c) => c.fig);
    $('#figure').innerHTML = ex.figure({ task: true, show: new Set(shown) });
    rulerDraw();
    markScrollable();
  }
  function showComps() {
    $('#comps-part').hidden = !(ex.comps || []).length;
    $('#comps-part').classList.toggle('only', !ex.fields.length);
    $('#comps').innerHTML = Identify.html(identItems(), st ? st.ident || {} : {}, st && st.revealed);
    math($('#comps'));
  }

  // ---------------------------------------------------------------- the ruler
  // The situations on the grid (Scenarios.RULER): the student may draw one segment between two
  // grid points of the drawing (drag from one to the other, or tap both ends) and reads its
  // length, in squares and in cm. It
  // only measures: it draws no line of action and knows nothing of the forces. A new segment
  // replaces the old one; Clear removes it. Measuring is switched on with its button, so that on a
  // touch screen the drawing still scrolls otherwise.
  const RULER = new Set(window.Scenarios.RULER);
  const GRID = () => window.Scenarios.GRID;
  let ruler = { on: false, a: null, b: null, pending: false, drag: false };
  const hasRuler = () => !!(ex && RULER.has(ex.scenario));
  const fmt = (x, dec) => TQ.num(x, dec);
  function rulerLength() {
    const { a, b } = ruler, dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]), n = Math.hypot(dx, dy), g = GRID();
    if (!dx || !dy) return `${ui().squares(n)} = ${TQ.q(n * g.unit, 'cm', 0)}`;
    // oblique: the whole number when there is one (3, 4 → 5), else rounded
    const whole = Math.abs(n - Math.round(n)) < 1e-9;
    return `${whole ? '' : '≈ '}${ui().squares(fmt(n, 2))} ${whole ? '=' : '≈'} ${TQ.q(n * g.unit, 'cm', 1)}`;
  }
  // the segment drawn into the task's drawing (again after every redraw), and the readout
  function rulerDraw() {
    const bar = $('#ruler');
    bar.hidden = !hasRuler();
    if (!hasRuler()) return;
    const svg = $('#figure svg');
    $('#ruler-btn').setAttribute('aria-pressed', String(ruler.on));
    $('#ruler-btn').textContent = ui().measure;
    $('#ruler-clear').textContent = ui().clear;
    $('#ruler-clear').disabled = !ruler.a;
    if (!svg) return;
    svg.classList.toggle('measuring', ruler.on);
    const old = svg.querySelector('.ruler');
    if (old) old.remove();
    const out = $('#ruler-out');
    if (!ruler.a) { out.textContent = ruler.on ? ui().measureHelp : ''; return; }
    const g = GRID(), px = (p) => [p[0] * g.px, -p[1] * g.px], A = px(ruler.a), B = px(ruler.b || ruler.a);
    let html = `<g class="ruler" aria-hidden="true"><line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>` +
      `<circle cx="${A[0]}" cy="${A[1]}" r="4"/>${ruler.b ? `<circle cx="${B[0]}" cy="${B[1]}" r="4"/>` : ''}`;
    const long = ruler.b && (ruler.a[0] !== ruler.b[0] || ruler.a[1] !== ruler.b[1]);
    if (long) {
      // the length beside the middle of the segment, on the side away from D (and its label), unless
      // that leaves the grid
      const n = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = -(B[1] - A[1]) / n, ny = (B[0] - A[0]) / n;
      const cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2, away = cx * nx + cy * ny;
      let s = Math.abs(away) > 1e-6 ? Math.sign(away) : nx < 0 ? 1 : -1;
      const at = (k) => [cx + k * nx * 10, cy + k * ny * 14];
      if (Math.abs(at(s)[0]) > g.x * g.px - 24 || Math.abs(at(s)[1]) > g.y * g.px - 10) s = -s;
      const [mx, my0] = at(s), my = my0 + 5, anchor = s * nx > 0.5 ? 'start' : s * nx < -0.5 ? 'end' : 'middle';
      html += `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="${anchor}">${TQ.q(Math.hypot(ruler.b[0] - ruler.a[0], ruler.b[1] - ruler.a[1]) * g.unit, 'cm', 1)}</text>`;
    }
    svg.insertAdjacentHTML('beforeend', html + '</g>');
    out.textContent = long ? `${ui().length}: ${rulerLength()}` : ruler.pending ? ui().measureFrom : '';
  }
  function rulerReset() { ruler = { on: ruler.on, id: ex && ex.id, a: null, b: null, pending: false, drag: false }; rulerDraw(); }
  // the grid point nearest to the pointer, within the grid
  function gridPoint(evt) {
    const svg = $('#figure svg'), g = GRID(), pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const clamp = (x, m) => Math.max(-m, Math.min(m, x));
    return [clamp(Math.round(p.x / g.px), g.x), clamp(Math.round(-p.y / g.px), g.y)];
  }
  function rulerWire() {
    const fig = $('#figure');
    fig.addEventListener('pointerdown', (evt) => {
      if (!hasRuler() || !ruler.on || !evt.target.closest('svg') || (evt.pointerType === 'mouse' && evt.button !== 0)) return;
      evt.preventDefault();
      const p = gridPoint(evt);
      if (ruler.pending) { ruler.b = p; ruler.pending = false; } else { ruler.a = p; ruler.b = p; }
      ruler.drag = true;
      try { evt.target.setPointerCapture(evt.pointerId); } catch (e) { /* not capturable */ }
      rulerDraw();
    });
    fig.addEventListener('pointermove', (evt) => {
      if (!ruler.drag) return;
      evt.preventDefault();
      const p = gridPoint(evt);
      if (p[0] !== ruler.b[0] || p[1] !== ruler.b[1]) { ruler.b = p; rulerDraw(); }
    });
    const up = () => {
      if (!ruler.drag) return;
      ruler.drag = false;
      // a tap without dragging: the first end, waiting for the other
      ruler.pending = ruler.a[0] === ruler.b[0] && ruler.a[1] === ruler.b[1];
      rulerDraw();
    };
    fig.addEventListener('pointerup', up);
    fig.addEventListener('pointercancel', up);
    $('#ruler-btn').addEventListener('click', () => { ruler.on = !ruler.on; if (!ruler.on && ruler.pending) ruler.a = ruler.b = null, ruler.pending = false; rulerDraw(); });
    $('#ruler-clear').addEventListener('click', () => rulerReset());
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
    ex.fields.forEach((f) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`);
      const raw = row.querySelector('input[type="text"]').value, sense = f.sense ? senseOf(f) : null;
      if (!raw.trim() || (f.sense && sense === null)) { anyEmpty = true; allOk = false; row.className = `field${f.sense ? ' torque' : ''}`; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(parse(raw), f, sense);
      row.className = `field${f.sense ? ' torque' : ''} ${r.cls}`;
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
    el.textContent = !kind ? '' : kind === 'fill' ? ui().fill : kind === 'ident' ? ui().idFirst
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (st.tries < MAX_TRIES && !canReveal() ? ui().tryAgain : ui().canReveal);
  }

  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    if (!Identify.ok(identItems(), st.ident)) { showStatus('ident'); return; }
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) {
      if (!st.solved && !st.revealed) {
        const s = stored('tq-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('tq-score', s);
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
    showComps();
    drawTask();
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
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- language
  const lessons = () => window.Lessons.EXAMPLES.map((e, i) => ({
    name: e.name[TQ.getLang()], idea: e.idea[TQ.getLang()], also: topics.also(i), frames: () => tutorial(e).frames,
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
      const values = ex.fields.map((f) => $(`#in-${f.key}`).value), senses = ex.fields.map((f) => (f.sense ? senseOf(f) : null));
      const keep = { ...st };
      ex = again(ex);
      render();
      st = keep;
      showComps();
      drawTask();
      ex.fields.forEach((f, k) => {
        $(`#in-${f.key}`).value = values[k];
        if (senses[k] !== null) document.querySelector(`input[name="in-${f.key}-s"][value="${senses[k]}"]`).checked = true;
      });
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
  // objectives (check.js, check-src.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('tq-mode', m);
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
    m = h.match(/^(easy|medium|hard|mixed)(-nocalc)?-(\d+)$/);
    if (m) {
      setMode('practice');
      if (!ex || ex.id !== h) open(generate(m[1], Number(m[3]), !m[2]));
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
    Identify.attach($('#comps'), identItems, () => st.ident, (right) => {
      math($('#comps'));
      if (right) drawTask(); // the lever arm or component appears in the drawing
      else { st.tries++; updateButtons(); } // a wrong choice counts as an attempt
      if (right && !ex.fields.length && !st.solved && Identify.ok(identItems(), st.ident)) check({ preventDefault() {} }); // a choice only: solved
    });
    Lang.wire(switchLang);
    rulerWire();
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { math($('#tutor')); markScrollable(); },
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
    const last = stored('tq-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
