(function () {
  'use strict';

  const IW = window.IW, Lang = window.Lang, Check = window.Check, { practiceOf, tutorial } = window.Interf;
  const { EXAMPLES, TOPICS } = window.Lessons;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Interference and Diffraction', mode: 'Mode', difficulty: 'Difficulty', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Results are highlighted.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every part, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', sign: 'Give the size (a positive number)', close: 'Close: check your rounding', wrong: 'Not correct', power: 'Off by a power of ten: check the units (nm, μm, mm, …)', signed: 'Check the sign', next: 'Right. Now the next part.',
      rankWrong: (n) => `${n === 1 ? 'One place is' : `${n} places are`} not right yet`, sci: 'Powers of ten: type 3.2e-8 or 3.2*10^-8.', none: 'none',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Interferenz und Beugung', mode: 'Modus', difficulty: 'Schwierigkeit', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Resultate sind hervorgehoben.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte alle Teile, dann prüfe nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', sign: 'Gib den Betrag an (eine positive Zahl)', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig', power: 'Um eine Zehnerpotenz daneben: Prüfe die Einheiten (nm, μm, mm, …)', signed: 'Prüfe das Vorzeichen', next: 'Richtig. Jetzt der nächste Teil.',
      rankWrong: (n) => `${n === 1 ? 'Ein Platz stimmt' : `${n} Plätze stimmen`} noch nicht`, sci: 'Zehnerpotenzen: Tippe 3.2e-8 oder 3.2*10^-8.', none: 'keine',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[IW.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null, player = null, tutorPlayer = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('itf-score', { solved: 0, clean: 0 });
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
    if (e === 0 ? Math.abs(x) < 1e-9 : near(x, e, 0.01) || IW.sig(x, 3) === IW.sig(e, 3) || IW.sig(x, 2) === IW.sig(e, 2)) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, 0.01)) return { cls: 'bad', msg: t.nudge || t.why };
    if (e !== 0 && near(-x, e, 0.01)) return { cls: 'warn', msg: f.signed ? ui().signed : ui().sign };
    if (e !== 0 && x !== 0) { const k = Math.log10(Math.abs(x / e)); if (Math.abs(k - Math.round(k)) < 0.005 && Math.round(k) !== 0) return { cls: 'warn', msg: ui().power }; }
    if (e !== 0 && near(x, e, 0.05)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'itf', typeOf = (e) => e.scenario;
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

  // The topics of practice (lessons.js), each with its worked example (by stage).
  const topicList = () => TOPICS.map((t) => ({
    name: t.name,
    stages: t.stages,
    example: (s) => { const i = t.example(s); return { i, name: () => EXAMPLES[i].name() }; },
  }));
  // the topic and stage of worked example i: the first whose example it is
  function topicOf(i) {
    for (let t = 0; t < TOPICS.length; t++) for (let s = 0; s < TOPICS[t].stages.length; s++) if (TOPICS[t].example(s) === i) return { t, s };
    return { t: 0, s: 0 };
  }

  // The answer fields: a number (input in-key) or a choice (radio buttons named in-key).
  const radios = (f, list) => `<span class="choices levels small${f.pics ? ' pics' : ''}${f.stack ? ' stack' : ''}" role="radiogroup" aria-label="${f.what.replace(/<[^>]*>|\$/g, '')}">${list
    .map(([v, html, title]) => `<label><input type="radio" name="in-${f.key}" value="${v}"><span${title ? ` title="${title}" aria-label="${title}"` : ''}>${html}</span></label>`).join('')}</span>`;
  function fieldHtml(f) {
    const fb = '<span class="fb" aria-live="polite"></span>';
    if (f.type === 'num') {
      return `<div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym"><span class="what">${f.what}</span> $${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="${f.sci ? 'text' : 'decimal'}" autocomplete="off" autocapitalize="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${(IW.UNITS[f.unit] || [, f.unit])[1]}</span>${fb}</div>`;
    }
    // a choice (o[2], the explanation of a wrong one, is no title: it would give the answer away;
    // o[4], where there is one, is the nudge shown instead of o[2] after a wrong answer)
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
    if (f.type === 'num') return judgeNum(parse(val), f);
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
    // the pattern to watch once solved, below the figure
    if (player) player.stop();
    player = null;
    const w = ex.watch ? ex.watch() : null;
    $('#figure').innerHTML = ex.figure({ task: true }) + (w ? '<div class="pw-host ifw-host"></div>' : '');
    $('#fields').innerHTML = ex.fields.map(fieldHtml).join('');
    if (w) player = mountWatch($('#figure .pw-host'), w, { locked: () => !(st && (st.solved || st.revealed)), marks: () => w.marks(answerOf) });
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
      // the explanations of wrong answers may hold formulas (written by the app, so safe as HTML)
      const fb = row.querySelector('.fb');
      fb.innerHTML = r.msg;
      if (r.msg.includes('$')) math(fb);
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
        const s = stored('itf-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('itf-score', s);
        showScore();
      }
      st.solved = true;
      Practice.markSolved(PRACTICE, ex.id);
      finish();
      st.advance = topics.solved(st, ex);
      showStatus('ok');
    } else showStatus('bad');
    updateButtons();
    if (player) player.refresh(); // solved: the second source can be switched on
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
    if (player) player.refresh(); // the second source can be switched on
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- predict, then watch
  // Once an exercise with a run (ifWatch in scenarios.js) is solved or its solution shown (and in
  // the last frame of two worked examples), the student switches on the second source (opens the
  // second slit, lights the whole grating) and watches the pattern build up (play.js): the waves
  // seen from above, as their average brightness, spreading from the sources at their speed, and
  // below them the intensity along the screen, drawn as far as the waves have arrived; the
  // student's answers are rings on it (✓ right, ✗ not), shown once the pattern there is complete.
  // A run lasts SECONDS: far slower than the light or sound, as the note under the graph says.
  const SECONDS = 3;
  // the student's answer of field key: a number (NaN if none) or the option chosen (null)
  function answerOf(key) {
    const f = ex && ex.fields.find((x) => x.key === key);
    if (!f) return null;
    const v = valueOf(f);
    return f.type === 'num' ? (empty(f, v) ? NaN : parse(v)) : v;
  }
  // a number in words: 5·10⁸ (one digit)
  const about = (x) => IW.num(IW.sig(x, 1));

  // The player of the run w in host. o: { locked(), marks() → the student's answers (w.marks) }.
  function mountWatch(host, w, o = {}) {
    let shown = null, scene = window.Figures.watchScene(w);
    const L = IW.L, fieldOf = (key) => ex && ex.fields.find((f) => f.key === key);
    // a number answered is right as in the feedback
    const okOf = (m) => (m.ok != null ? m.ok : (() => { const f = fieldOf(m.key); return !!f && judge(f, valueOf(f)).cls === 'ok'; })());
    // T: the real time per unit of scene time (the waves reach the middle of the screen, or P, at
    // the time they take in reality)
    const sound = w.kind === 'speakers', t1 = scene.t1, T = w.T && w.P != null ? w.T / scene.full(w.P) : w.T;
    const what = sound ? L('the loudspeaker S₂', 'den Lautsprecher S₂') : w.kind === 'grating' ? L('the grating', 'das Gitter') : L('the slit S₂', 'den Spalt S₂');
    // the note: how much slower than in reality, why the brightness is an average, how much larger the angles
    function scale() {
      const slow = T ? SECONDS / t1 / T : null, ms = w.T * 1e3, ns = w.T * 1e9;
      const first = sound ? L(`Slow motion: about ${about(slow)} times slower than in reality (the sound reaches P after ${IW.num(ms, 2)} ms).`, `Zeitlupe: etwa ${about(slow)}-mal langsamer als in Wirklichkeit (der Schall erreicht P nach ${IW.num(ms, 2)} ms).`)
        : slow ? L(`Slow motion: about ${about(slow)} times slower than in reality (the light reaches the screen after ${IW.num(ns, 2)} ns).`, `Zeitlupe: etwa ${about(slow)}-mal langsamer als in Wirklichkeit (das Licht erreicht den Schirm nach ${IW.num(ns, 2)} ns).`)
          : L('Extreme slow motion: in reality the light crosses the set-up in a few nanoseconds.', 'Extreme Zeitlupe: In Wirklichkeit durchquert das Licht die Anordnung in wenigen Nanosekunden.');
      const avg = sound ? L(`The sound oscillates ${IW.num(w.f, 2)} times per second, far too fast to show: the colour shows how loud it is on average. Not to scale.`, `Der Schall schwingt ${IW.num(w.f, 2)}-mal pro Sekunde, viel zu schnell zum Zeigen: Die Farbe zeigt, wie laut er im Mittel ist. Nicht massstäblich.`)
        : L(`The light oscillates about ${about(w.f)} times per second, far too fast to show: you see its average brightness.`, `Das Licht schwingt etwa ${about(w.f)}-mal pro Sekunde, viel zu schnell zum Zeigen: Du siehst seine mittlere Helligkeit.`);
      const zoom = scene.zoom ? L(` The angles are drawn about ${about(scene.zoom)} times larger.`, ` Die Winkel sind etwa ${about(scene.zoom)}-mal grösser gezeichnet.`) : w.kind === 'grating' ? L(' Only 8 slits are drawn.', ' Nur 8 Spalte sind gezeichnet.') : '';
      return `${first} ${avg}${zoom}`;
    }
    const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(x > -10 && x < 10 ? 2 : 1).replace('-', '−'));
    return window.Play.create(host, {
      t0: -0.2 * t1, t1, seconds: SECONDS,
      locked: o.locked,
      render(el, s) {
        const lock = !!(o.locked && o.locked()), key = `${lock}|${IW.getLang()}`;
        if (key !== shown) {
          shown = key;
          scene = window.Figures.watchScene(w);
          el.innerHTML = `<div class="ifw">${scene.frame}<div class="ifw-side"></div></div>`;
        }
        const t = Math.min(s.t, t1);
        el.querySelector('.ifw-field').classList.toggle('ifw-on', s.after);
        scene.paint(el.querySelector('.ifw-canvas'), t);
        el.querySelector('.ifw-dyn').innerHTML = scene.over(t);
        const side = el.querySelector('.ifw-side');
        if (lock) { side.innerHTML = `<p class="note ifw-wait">${L('The pattern on the screen appears here once you have solved the exercise or looked at the solution.', 'Das Muster auf dem Schirm erscheint hier, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.')}</p>`; return; }
        const marks = (o.marks ? o.marks() : []).map((m) => ({ ...m, ok: okOf(m) })).filter((m) => s.after && t >= scene.full(m.y) - 1e-9);
        const keys = w.keys().filter((k) => s.after && t >= scene.full(k.y) - 1e-9);
        const rows = [...keys.map((k) => `<li class="keyrow"><span class="kmark" aria-hidden="true"></span>${k.say}</li>`), ...marks.map((m) => `<li class="pred ${m.ok ? 'ok' : 'bad'}">${m.ok ? '✓' : '✗'} ${m.say}</li>`)];
        side.innerHTML = scene.graph(s.t, keys) + (rows.length ? `<ul class="ifw-read">${rows.join('')}</ul>` : '') + `<p class="note ifw-scale">${scale()}</p>`;
      },
      texts: () => ({
        switch: sound ? L('The loudspeaker S₂: switch it on', 'Der Lautsprecher S₂: einschalten') : w.kind === 'grating' ? L('The grating: light all its slits', 'Das Gitter: alle Spalte beleuchten') : L('The slit S₂: open it', 'Der Spalt S₂: öffnen'),
        locked: L(`Check your answer first: you can switch on ${what} once you have solved the exercise or looked at the solution.`, `Prüfe zuerst deine Antwort: Du kannst ${what} einschalten, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.`),
        ready: sound ? L('Click the loudspeaker S₂ to switch it on, and watch where the sound gets loud and where quiet.', 'Klicke auf den Lautsprecher S₂, um ihn einzuschalten, und schau zu, wo der Schall laut und wo er leise wird.')
          : w.kind === 'grating' ? L('Click the grating to widen the beam onto all its slits, and watch the maxima form.', 'Klicke auf das Gitter, um den Strahl auf alle Spalte aufzuweiten, und schau zu, wie die Maxima entstehen.')
            : L('Click the slit S₂ to open it, and watch the fringes form on the screen.', 'Klicke auf den Spalt S₂, um ihn zu öffnen, und schau zu, wie die Streifen auf dem Schirm entstehen.'),
        again: (w.keys().length ? L('Rings: the places named below the graph. ', 'Ringe: die Stellen, die unter dem Graphen genannt sind. ') : '') +
          L(`Click ${what} again to go back, or ▶ to watch once more.`, `Klicke nochmals auf ${what}, um zurückzugehen, oder ▶, um nochmals zuzuschauen.`),
        time: T ? (t) => (sound ? `t = ${fmt(t * T * 1e3)} ms` : `t = ${fmt(t * T * 1e9)} ns`) : null,
      }),
    });
  }

  // ---------------------------------------------------------------- language
  const lessons = () => EXAMPLES.map((e, i) => ({
    name: e.name(), idea: e.idea(), also: topics.also(topicOf(i).t), frames: () => tutorial(e).frames,
  }));
  // the last frame of an example with a run to watch (tutorial(lesson).watch, generator.js)
  function watchInTutor() {
    if (tutorPlayer) tutorPlayer.stop();
    tutorPlayer = null;
    const host = $('#t-figure .pw-host'), e = EXAMPLES[tutor ? tutor.current() : 0];
    if (host && e && e.watch) tutorPlayer = mountWatch(host, tutorial(e).watch(), {});
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
    store('itf-mode', m);
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
      // what makes an exercise new: not the order of its options
      keyOf: (ex) => JSON.stringify({ ...ex.p, o: undefined, off: undefined, order: undefined }),
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
      practise: (i) => { const { t, s } = topicOf(i); topics.go(t, s); setMode('practice'); fresh(); },
      t: () => ui().tutorBtns,
    });
    checker = Check.create(window.CheckSource, {
      math, markScrollable, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (t) => { topics.go(t); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // First visit: start with the first worked example.
    const last = stored('itf-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
