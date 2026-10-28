(function () {
  'use strict';

  const Lang = window.Lang, Check = window.Check;
  const { practiceOf } = window.Caps;
  const { EXAMPLES, TOPICS } = window.Lessons;
  const { fitText } = window.Circuit;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // An exercise (generator.js) is { type, difficulty, title, text, fields, figure(), solutionFigure(),
  // hints, solution, results }: a number field has its value and traps (the answers under typical
  // wrong ideas), a choice field its right option; a choice of graphs (pics) shows them side by side.

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Capacitors and RC Circuits', mode: 'Mode', difficulty: 'Difficulty', example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      stars: (d) => `Difficulty: ${d} of 5`,
      tutorNote: 'Use the arrow keys ← → to step through. In the diagrams, the block a step is about is <span class="k-strong">shaded</span> and the capacitor just found is <span class="k-new">marked</span>.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', results: 'Results',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every part, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      number: 'Enter a number', correct: 'Correct', close: 'Close: read the graph more carefully, or check your rounding', wrong: 'Not correct', sign: 'Give the size (a positive number)',
      graph: (k) => `Graph ${k}`,
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Kondensatoren und RC-Kreise', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. In den Schaltungen ist der Block, um den es in einem Schritt geht, <span class="k-strong">hinterlegt</span>, und der eben gefundene Kondensator ist <span class="k-new">markiert</span>.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', results: 'Resultate',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte alle Teile und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      number: 'Gib eine Zahl ein', correct: 'Richtig', close: 'Knapp daneben: Lies den Graphen genauer ab oder prüfe deine Rundung', wrong: 'Nicht richtig', sign: 'Gib den Betrag an (eine positive Zahl)',
      graph: (k) => `Graph ${k}`,
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[Lang.get()];
  const UNIT = { 'µF': 'µF', s: 's', ms: 'ms', V: 'V', mA: 'mA', 'kΩ': 'kΩ' };

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('cap-score', { solved: 0, clean: 0 });
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

  // While the exercise is open, a wrong answer gets the nudge of its trap or option (if it has
  // one) instead of the explanation, which would give the answer away.
  const unsolved = () => !!st && !st.solved && !st.revealed;
  const whyOf = (o) => (unsolved() && o.nudge) || o.why;

  // Right within the field's tolerance (a value read from a graph has a larger one); else the
  // answer under a typical wrong idea, a sign or a rounding error.
  function judgeNum(x, f) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const e = f.value, near = (y, z, tol) => Math.abs(y - z) <= tol * Math.abs(z) + 1e-9;
    if (near(x, e, f.tol) || Math.abs(x - e) < 0.005) return { cls: 'ok', msg: ui().correct };
    for (const t of f.traps) if (near(x, t.value, Math.max(f.tol, 0.01))) return { cls: 'bad', msg: whyOf(t) || ui().wrong };
    if (near(-x, e, f.tol)) return { cls: 'warn', msg: ui().sign };
    if (near(x, e, Math.max(0.05, 2 * f.tol))) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }

  // The answer fields: a number (input in-key) or a choice (radio buttons named in-key).
  function fieldHtml(f) {
    const fb = '<span class="fb" aria-live="polite"></span>';
    if (f.type === 'num') {
      return `<div class="field" data-key="${f.key}">
        <label for="in-${f.key}" class="sym"><span class="what">${f.what}</span> $${f.sym}$&nbsp;=</label>
        <input id="in-${f.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">
        <span class="unit">${UNIT[f.unit]}</span>${fb}</div>`;
    }
    // a choice (the explanation of a wrong one is no title: it would give the answer away)
    const opts = f.options.map((o, k) => `<label><input type="radio" name="in-${f.key}" value="${o.v}"><span${f.pics ? ` aria-label="${ui().graph(k + 1)}"` : ''}>${f.pics ? `<b class="num">${k + 1}</b>` : ''}${o.html}</span></label>`).join('');
    return `<div class="field choice${f.pics || f.stack ? ' wide' : ''}" data-key="${f.key}"><span class="what">${f.what}</span><span class="choices levels small${f.pics ? ' pics' : ''}${f.stack ? ' stack' : ''}" role="radiogroup">${opts}</span>${fb}</div>`;
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
    const o = f.options.find((x) => x.v === val);
    return { cls: 'bad', msg: (o && whyOf(o)) || ui().wrong };
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'cap', typeOf = (e) => e.type;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, watched: false };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
    const first = $('#fields input');
    if (first && first.type === 'text') first.focus({ preventScroll: true });
  }

  // A new exercise of the topic and stage chosen (topics.js), of another type than the current
  // one if possible.
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
    // an exercise on charging or discharging: the circuit with the switch to flip once solved
    // (a graph to read stays, the circuit to watch below it)
    if (player) player.stop();
    player = null;
    const w = ex.watch ? ex.watch() : null;
    $('#figure').innerHTML = !w ? ex.figure() : w.keep ? `${ex.figure()}<div class="pw-host capw-host"></div>` : '<div class="pw-host capw-host"></div>';
    if (w) {
      player = mountWatch($('#figure .pw-host'), w, {
        locked: () => !(st && (st.solved || st.revealed || st.watched)), check: checkByPlay,
        marks: () => w.marks(answerOf),
        other: () => w.other(answerOf),
      });
    }
    $('#fields').innerHTML = ex.fields.map(fieldHtml).join('');
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
    ex.fields.forEach((f) => {
      const row = $('#fields').querySelector(`.field[data-key="${f.key}"]`), base = row.className.replace(/ (ok|warn|bad)\b/g, ''), val = valueOf(f);
      if (empty(f, val)) { anyEmpty = true; allOk = false; row.className = base; row.querySelector('.fb').textContent = ''; return; }
      const r = judge(f, val);
      row.className = `${base} ${r.cls}`;
      row.querySelector('.fb').innerHTML = r.msg;
      math(row.querySelector('.fb'));
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
    st.checkedAs = answers();
    if (r) {
      if (!st.solved && !st.revealed && !st.watched) {
        const s = stored('cap-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('cap-score', s);
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
  // the answers as entered, to tell whether they have been checked as they are
  const answers = () => JSON.stringify(ex.fields.map(valueOf));
  // ▶ or the switch pressed before the run is unlocked (play.js): a check like the button (the same
  // answers checked again are no new try); once checked, right or wrong, the run can be watched,
  // a wrong answer marked in it. Watched before it was solved, it no longer counts for the score.
  function checkByPlay() {
    if (!ex || !st || st.solved || st.revealed) return;
    if (st.checkedAs !== answers() || !st.status) check({ preventDefault() {} });
    if (st.status === 'ok' || st.status === 'bad') { st.watched = true; if (player) player.refresh(); }
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
    showSolution();
    updateButtons();
    if (player) player.refresh(); // the switch unlocks
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- predict, then watch
  // Once the answer of an exercise on charging or discharging is checked or its solution shown (and in the last
  // frame of the worked examples on it), the student closes the switch S in the circuit and
  // watches the run (play.js, the model is rcWatch in generator.js): the voltages U_C and U_R and
  // the current I drawn up to the time of the slider on a small graph, with a dot on each curve
  // and the values read off beside it. The moments that mean something in the exercise (the jump
  // right after closing, the time constant, the half-life, the moment asked for: keys in
  // rcWatch) are marked on the curves and named below the graph once the run has reached them;
  // the student's answers are listed there too (✓ on the curve, ✗ off it), and a wrong graph chosen
  // is drawn dotted in the same diagram. The answer is checked first: ▶ or the switch checks it
  // (checkByPlay), and right or wrong the run can then be watched.
  let player = null, tutorPlayer = null;
  const SER = { UC: 's1', UR: 's2', I: 's0' }; // the colours of the curves
  const nf = (x, d) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d).replace('-', '−');
  const n2 = (x) => nf(x, Math.abs(x) >= 10 ? 1 : 2);
  const vH = (i) => (Lang.get() === 'de' ? '<i>U</i>' : 'Δ<i>V</i>') + (i ? `<sub>${i}</sub>` : '');
  const vS = (i) => (Lang.get() === 'de' ? '<tspan class="it">U</tspan>' : 'Δ<tspan class="it">V</tspan>') + (i ? `<tspan class="sub" dy="3">${i}</tspan><tspan dy="-3"></tspan>` : '');
  // a value: in V or mA, or in units of U₀ or I₀
  const valH = (w, q, y) => (w.norm ? `${n2(y)}&#8202;${q === 'I' ? '<i>I</i><sub>0</sub>' : vH('0')}` : `${n2(y)} ${q === 'I' ? 'mA' : 'V'}`);
  const timeH = (w, t) => (w.unit === 'τ' ? `${n2(t)} τ` : `${n2(t)} ${w.unit}`);
  // a tidy step for about n intervals of size `span`
  function niceStep(span, n) {
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  // a step for the values from 0 to hi: two to four intervals, the top as low as possible
  function valueStep(hi) {
    let best = null;
    for (let e = Math.floor(Math.log10(hi)) - 2; e <= Math.floor(Math.log10(hi)) + 1; e++) {
      for (const m of [1, 2, 2.5, 3, 4, 5]) {
        const s = m * Math.pow(10, e), n = Math.ceil(hi / s - 1e-9);
        if (n < 2 || n > 4) continue;
        if (!best || n * s < best.top - 1e-12 || (Math.abs(n * s - best.top) < 1e-12 && s > best.s)) best = { s, top: n * s };
      }
    }
    return best ? best.s : niceStep(hi, 3);
  }
  const decimals = (s) => (Number.isInteger(s) ? 0 : Number.isInteger(Math.round(s * 1e6) / 1e5) ? 1 : 2);
  // the student's answer of field key: a number (NaN if none) or the option chosen (null)
  function answerOf(key) {
    const f = ex.fields.find((x) => x.key === key), v = f && valueOf(f);
    if (!f) return null;
    return f.type === 'num' ? (empty(f, v) ? NaN : parse(v)) : v;
  }

  // The graph at time t: the voltages (and below, the current) up to t, the line of t with a dot
  // on each curve, the first charging grey (R or C changed), a wrong graph chosen (other: { q, f },
  // dashed) and the key moments reached.
  function graph(w, t, keys, other) {
    const W = 320, ml = 46, mr = 16, T = w.T, t0 = -0.15 * T, hasI = w.I0 != null;
    const panels = [{ id: 'V', qs: w.charge ? ['UC', 'UR'] : ['UC'], top: 28, h: hasI ? 96 : 116 }];
    if (hasI) panels.push({ id: 'I', qs: ['I'], top: 28 + 96 + 36, h: 66 });
    const bottom = panels[panels.length - 1].top + panels[panels.length - 1].h, H = bottom + 34;
    const X = (x) => ml + ((x - t0) / (T - t0)) * (W - ml - mr), f1 = (x) => x.toFixed(1);
    const ts = Array.from({ length: 161 }, (_, k) => (k * T) / 160), until = Math.min(t, T);
    const panelOf = (q) => (q === 'I' ? 'I' : 'V');
    let svg = `<svg class="capw-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${Lang.L('The voltages and the current against time', 'Die Spannungen und der Strom gegen die Zeit')}">`;
    panels.forEach((pn) => {
      const base = pn.id === 'I' ? Math.max(w.I0, w.ghost ? w.ghost.I0 : 0) : w.U0;
      const hi = base;
      const step = w.norm ? (hi > 1.6 ? 1 : 0.5) : valueStep(hi), top = Math.ceil(hi / step - 1e-9) * step;
      const Y = (y) => pn.top + pn.h - (Math.max(-0.04 * top, Math.min(1.08 * top, y)) / top) * pn.h;
      pn.Y = Y;
      for (let k = 0; k * step <= top + 1e-9; k++) {
        const y = k * step, unitLabel = pn.id === 'I' ? '<tspan class="it">I</tspan><tspan class="sub" dy="3">0</tspan>' : vS('0');
        const lab = !w.norm ? nf(y, decimals(step)) : y === 0 ? '0' : Math.abs(y - Math.round(y)) > 1e-9 ? '' : `${y === 1 ? '' : y}${unitLabel}`;
        svg += `<line class="grid${k ? '' : ' zero'}" x1="${ml}" x2="${W - mr}" y1="${f1(Y(y))}" y2="${f1(Y(y))}"/>`;
        if (lab) svg += `<text class="tick" x="${ml - 5}" y="${f1(Y(y) + 4)}" text-anchor="end">${lab}</text>`;
      }
      const name = pn.id === 'I' ? '<tspan class="it">I</tspan>' : vS('');
      svg += `<text class="pname" x="${ml - 5}" y="${pn.top - 14}" text-anchor="end">${name}${w.norm ? '' : `<tspan> in ${pn.id === 'I' ? 'mA' : 'V'}</tspan>`}</text>`;
      svg += `<line class="axis" x1="${f1(X(0))}" x2="${f1(X(0))}" y1="${pn.top - 4}" y2="${pn.top + pn.h}"/>`;
      // the first charging (grey)
      if (w.ghostAt) {
        pn.qs.filter((q) => q !== 'UR').forEach((q) => {
          svg += `<path class="ghost" d="M${f1(X(t0))} ${f1(Y(w.ghostAt(-1)[q]))}L${f1(X(0))} ${f1(Y(w.ghostAt(-1)[q]))}${ts.map((x) => `L${f1(X(x))} ${f1(Y(w.ghostAt(x)[q]))}`).join('')}"/>`;
        });
      }
      // a wrong graph chosen, under the motion, from the switching to t
      if (other && pn.qs.includes(other.q) && until >= 0) {
        const at = (x) => `${f1(X(x))} ${f1(Y(other.f(x)))}`;
        svg += `<path class="other" d="M${[...ts.filter((x) => x <= until), until].map(at).join('L')}"/><circle class="odot" cx="${f1(X(until))}" cy="${f1(Y(other.f(until)))}" r="3.5"/>`;
      }
      pn.qs.forEach((q) => {
        const v0 = w.at(-1)[q];
        let d = `M${f1(X(t0))} ${f1(Y(v0))}L${f1(X(Math.min(0, until)))} ${f1(Y(v0))}`;
        if (until >= 0) {
          ts.filter((x) => x <= until).forEach((x) => { d += `L${f1(X(x))} ${f1(Y(w.at(x)[q]))}`; });
          d += `L${f1(X(until))} ${f1(Y(w.at(until)[q]))}`;
        }
        svg += `<path class="curve ${SER[q]}" d="${d}"/>`;
      });
      if (t > t0) svg += `<line class="now" x1="${f1(X(until))}" x2="${f1(X(until))}" y1="${pn.top - 4}" y2="${pn.top + pn.h}"/>`;
    });
    // the time axis
    const tStep = niceStep(T, 6), tick = (k) => (w.unit === 'τ' ? (k === 0 ? '0' : `${k === 1 ? '' : nf(k, decimals(tStep))}τ`) : nf(k, decimals(tStep)));
    for (let k = 0; k * tStep <= T + 1e-9; k++) svg += `<text class="tick" x="${f1(X(k * tStep))}" y="${bottom + 15}" text-anchor="middle">${tick(k * tStep)}</text>`;
    svg += `<text class="tick" x="${W - mr}" y="${bottom + 29}" text-anchor="end"><tspan class="it">t</tspan>${w.unit === 'τ' ? '' : ` in ${w.unit}`}</text>`;
    // the key moments reached: a line down to the time axis, a ring on the curve and its label
    // (moved down where it would cover another one), then a dot on each curve
    const placed = [];
    keys.forEach((k) => k.pts.forEach((m) => {
      const pn = panels.find((x) => x.id === panelOf(m.q)), q = pn.qs.includes(m.q) ? m.q : 'UC';
      const cx = X(Math.max(0, Math.min(T, k.t))), cy = pn.Y(m.y), right = cx < W - mr - 44;
      let ly = cy - 7;
      while (placed.some((p) => Math.abs(p.x - cx) < 44 && Math.abs(p.y - ly) < 12)) ly += 12;
      placed.push({ x: cx, y: ly });
      svg += `<line class="kline" x1="${f1(cx)}" x2="${f1(cx)}" y1="${f1(cy)}" y2="${pn.top + pn.h}"/><circle class="kpt ${SER[q]}" cx="${f1(cx)}" cy="${f1(cy)}" r="4.5"/>`;
      if (m.label) svg += `<text class="klab ${SER[q]}" x="${f1(cx + (right ? 7 : -7))}" y="${f1(ly)}" text-anchor="${right ? 'start' : 'end'}">${m.label}</text>`;
    }));
    panels.forEach((pn) => pn.qs.forEach((q) => { svg += `<circle class="dot ${SER[q]}" cx="${f1(X(until))}" cy="${f1(pn.Y(w.at(until)[q]))}" r="4"/>`; }));
    return `${svg}</svg>`;
  }

  // The player of the run w in host. o: { locked(), check() (▶ or the switch while locked: the app
  // checks the answer, play.js), marks() → the student's answers, other() → a wrong graph (rcWatch) }.
  function mountWatch(host, w, o = {}) {
    let shown = null;
    const L = Lang.L, fieldOf = (key) => ex && ex.fields.find((f) => f.key === key);
    // a number answered is right as in the feedback
    const okOf = (m) => (m.ok != null ? m.ok : (() => { const f = fieldOf(m.key); return !!f && judge(f, valueOf(f)).cls === 'ok'; })());
    return window.Play.create(host, {
      t0: -0.15 * w.T, t1: w.T, seconds: 3,
      locked: o.locked,
      check: o.check,
      render(scene, s) {
        const lock = !!(o.locked && o.locked()), key = `${s.after}|${lock}|${Lang.get()}`;
        if (key !== shown) {
          shown = key;
          scene.innerHTML = '<div class="capw"><div class="capw-circ"></div><div class="capw-side"></div></div>';
          scene.querySelector('.capw-circ').innerHTML = w.figures()[s.after ? 1 : 0];
          const svg = scene.querySelector('svg.circuit');
          if (svg) requestAnimationFrame(() => fitText(svg));
          markScrollable();
        }
        const side = scene.querySelector('.capw-side');
        if (lock) { side.innerHTML = `<p class="note capw-wait">${o.check ? L('The graph of the voltages and the current appears here once your answer is checked: ▶ or the switch checks it too.', 'Der Graph der Spannungen und des Stroms erscheint hier, sobald deine Antwort geprüft ist: ▶ oder der Schalter prüft sie auch.') : L('The graph of the voltages and the current appears here once you have solved the exercise or looked at the solution.', 'Der Graph der Spannungen und des Stroms erscheint hier, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.')}</p>`; return; }
        const at = w.at(Math.min(s.t, w.T));
        const marks = (o.marks ? o.marks() : []).map((m) => ({ ...m, ok: okOf(m) })).filter((m) => s.after && s.t >= m.t - 1e-9);
        const keys = w.keys().filter((k) => s.after && s.t >= k.t - 1e-9);
        const other = s.after && o.other ? o.other() : null;
        const row = (q, label) => `<li><span class="key ${SER[q]}" aria-hidden="true"></span>${label} = ${valH(w, q, at[q])}</li>`;
        const rows = [w.charge ? row('UC', vH('C')) + row('UR', vH('R')) : row('UC', `${vH('C')} = ${vH('R')}`)];
        if (w.I0 != null) rows.push(row('I', '<i>I</i>'));
        if (w.ghostAt) rows.push(`<li class="ghost-note"><span class="key ghost" aria-hidden="true"></span>${L('the first charging', 'das erste Laden')}</li>`);
        if (other) rows.push(`<li class="otherrow"><span class="key other" aria-hidden="true"></span>${L('dotted', 'punktiert')}: ${other.say}</li>`);
        keys.forEach((k) => rows.push(`<li class="keyrow"><span class="kmark" aria-hidden="true"></span>${k.say}</li>`));
        marks.forEach((m) => rows.push(`<li class="pred ${m.ok ? 'ok' : 'bad'}">${m.ok ? '✓' : '✗'} ${m.say}</li>`));
        side.innerHTML = graph(w, s.t, keys, other) + `<ul class="capw-read">${rows.join('')}</ul>`;
      },
      texts: () => ({
        switch: L('Switch S: close', 'Schalter S: schliessen'),
        ready: w.charge ? L('Click the switch S to close it, and watch the capacitor charge.', 'Klicke auf den Schalter S, um ihn zu schliessen, und schau zu, wie sich der Kondensator lädt.')
          : L('Click the switch S to close it, and watch the capacitor discharge.', 'Klicke auf den Schalter S, um ihn zu schliessen, und schau zu, wie sich der Kondensator entlädt.'),
        again: w.keys().length ? L('Rings: the moments named below the graph. Click the switch again to go back, or ▶ to watch once more.', 'Ringe: die Momente, die unter dem Graphen genannt sind. Klicke nochmals auf den Schalter, um zurückzugehen, oder ▶, um nochmals zuzuschauen.')
          : L('Click the switch again to go back, or ▶ to watch once more.', 'Klicke nochmals auf den Schalter, um zurückzugehen, oder ▶, um nochmals zuzuschauen.'),
        time: (t) => `t = ${timeH(w, t)}`,
      }),
    });
  }

  // ---------------------------------------------------------------- language
  // The worked examples; those on charging and discharging end with a frame to watch (mountWatch).
  const watchFrame = () => ({
    text: `<p class="step-rule">${Lang.L('Watch it happen', 'Zuschauen')}</p><p>${Lang.L('Close the switch S in the circuit and watch: the voltage of the capacitor cannot jump, the current can; then everything runs exponentially, with the time constant τ, towards its value long after.',
      'Schliesse den Schalter S im Schaltbild und schau zu: Die Spannung des Kondensators kann nicht springen, der Strom schon; dann läuft alles exponentiell, mit der Zeitkonstante τ, zu seinem Wert lange danach.')}</p>`,
    figure: '<div class="figs"><div class="pw-host capw-host"></div></div>',
  });
  const lessons = () => EXAMPLES.map((e, i) => ({
    name: e.name(), idea: e.idea(), also: topics.also(topicOf(i).t), frames: () => (e.watch ? [...e.frames(), watchFrame()] : e.frames()),
  }));
  function watchInTutor() {
    if (tutorPlayer) tutorPlayer.stop();
    tutorPlayer = null;
    const host = $('#t-figure .pw-host'), e = EXAMPLES[tutor ? tutor.current() : 0];
    if (host && e && e.watch) tutorPlayer = mountWatch(host, window.Caps.rcWatch(e.watch()), {});
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
    store('cap-mode', m);
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
    if (h === 'check') { if ($('#ck').hidden) checkMode(); return true; }
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
    // when every field is a choice (which graph, larger or smaller, …), a click checks at once
    $('#answers').addEventListener('change', (evt) => {
      if (evt.target.type !== 'radio' || st.solved || ex.fields.some((f) => f.type === 'num' || empty(f, valueOf(f)))) return;
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
    const last = stored('cap-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
