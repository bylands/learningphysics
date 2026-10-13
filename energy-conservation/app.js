(function () {
  'use strict';

  const EC = window.EC, Expr = window.Expr, Lang = window.Lang, Check = window.Check, Concepts = window.EnergyConcepts;
  const { generate, generateFor, tutorial, judgeFormula } = window.Energy;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const LEGEND = {
    en: '<span class="k-pot">gravitational potential energy</span>, <span class="k-kin">kinetic energy</span>, <span class="k-el">elastic energy</span>',
    de: '<span class="k-pot">Lageenergie</span>, <span class="k-kin">kinetische Energie</span>, <span class="k-el">Spannenergie</span>',
  };
  const UI = {
    en: {
      title: 'Energy Conservation', mode: 'Mode', difficulty: 'Difficulty', stars: (d) => `Difficulty: ${d} of 5`, example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: `Use the arrow keys ← → to step through. The bars show the energy in each state: ${LEGEND.en}; the dashed line is the total energy.`,
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', result: 'Result',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      tableHead: '1 · Energy in each state', formulaHead: '2 · Energy as a formula', answerHead: '3 · Result',
      formulaNote: (syms, typing) => `Write the energy of each state as a formula in ${syms}.${typing ? ` Type ${typing}.` : ''}`,
      missing: 'A form of energy is missing: compare with your ticks in step 1', half: 'Check the factor ½',
      tableNote: (z) => `Tick the forms of energy that are not zero in each state. Zero level: ${z}.`,
      state: 'State',
      tableOk: '✓ The energy table is right.', tableBad: (n) => `✗ ${n === 1 ? 'One box is' : `${n} boxes are`} not right yet.`,
      fill: 'Fill in all fields, then check again.',
      ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      correct: 'Correct', wrong: 'Not correct', choose: 'Choose one of the options.',
      empty: 'Type a formula', syntax: 'This formula cannot be read: check the brackets and operators',
      unknown: (v, ok) => `${v} is not given here: use only ${ok}`,
      wanted: (v) => `Express ${v} by the given quantities`,
      typeHelp: (ex) => `For example sqrt(2*g*h) or √(2gh), v0^2 or v0², 1/2 or 0.5.${ex ? ` Type ${ex}.` : ''}`,
      preview: 'Read as', play: 'Play', pause: 'Pause',
      tutorBtns: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →' },
    },
    de: {
      title: 'Energieerhaltung', mode: 'Modus', difficulty: 'Schwierigkeit', stars: (d) => `Schwierigkeit: ${d} von 5`, example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: `Mit den Pfeiltasten ← → blätterst du weiter. Die Balken zeigen die Energie in jedem Zustand: ${LEGEND.de}; die gestrichelte Linie ist die Gesamtenergie.`,
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', result: 'Resultat',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      tableHead: '1 · Energie in jedem Zustand', formulaHead: '2 · Energie als Formel', answerHead: '3 · Resultat',
      formulaNote: (syms, typing) => `Schreibe die Energie jedes Zustands als Formel in ${syms}.${typing ? ` Tippe ${typing}.` : ''}`,
      missing: 'Eine Energieform fehlt: Vergleiche mit deinen Kreuzen in Schritt 1', half: 'Prüfe den Faktor ½',
      tableNote: (z) => `Kreuze in jedem Zustand die Energieformen an, die nicht null sind. Nullniveau: ${z}.`,
      state: 'Zustand',
      tableOk: '✓ Die Energietabelle stimmt.', tableBad: (n) => `✗ ${n === 1 ? 'Ein Feld stimmt' : `${n} Felder stimmen`} noch nicht.`,
      fill: 'Fülle alle Felder aus und prüfe dann nochmals.',
      ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      correct: 'Richtig', wrong: 'Nicht richtig', choose: 'Wähle eine der Antworten.',
      empty: 'Gib eine Formel ein', syntax: 'Diese Formel ist nicht lesbar: Prüfe Klammern und Rechenzeichen',
      unknown: (v, ok) => `${v} ist hier nicht gegeben: Verwende nur ${ok}`,
      wanted: (v) => `Drücke ${v} durch die gegebenen Grössen aus`,
      typeHelp: (ex) => `Zum Beispiel sqrt(2*g*h) oder √(2gh), v0^2 oder v0², 1/2 oder 0.5.${ex ? ` Tippe ${ex}.` : ''}`,
      preview: 'Gelesen als', play: 'Abspielen', pause: 'Anhalten',
      tutorBtns: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →' },
    },
  };
  const ui = () => UI[EC.getLang()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('ec-score', { solved: 0, clean: 0 });
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
  const katex1 = (tex) => (window.katex ? window.katex.renderToString(tex, { throwOnError: false, strict: false }) : tex);

  // Wide drawings scroll horizontally on small screens.
  function markScrollable() {
    document.querySelectorAll('.fig').forEach((fig) => {
      fig.classList.toggle('scrolls', fig.scrollWidth > fig.clientWidth + 1);
    });
  }

  // ---------------------------------------------------------------- input and feedback
  const symList = (keys) => keys.map((k) => EC.plainSym(k)).join(', ');
  // The symbols as typed: "v0 for v₀, l for ℓ"
  const typeHints = (keys) => keys.filter((k) => EC.typed(k) !== EC.plainSym(k)).map((k) => `${EC.typed(k)} ${EC.L('for', 'für')} ${EC.plainSym(k)}`);

  function judge(raw) {
    const r = judgeFormula(ex, raw), allowed = [...new Set([...ex.vars, 'g'])];
    const named = (v) => (EC.SYM[v] ? EC.plainSym(v) : v.replace(/p/, '′'));
    const msg = r.msg || {
      ok: ui().correct, empty: ui().empty, syntax: ui().syntax, wrong: ui().wrong,
      unknown: r.vars && ui().unknown(named(r.vars[0]), symList(allowed)),
      wanted: ui().wanted(EC.plainSym(ex.want.key)),
    }[r.key];
    return { cls: r.cls, msg };
  }

  // ---------------------------------------------------------------- exercise lifecycle

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'ec', typeOf = (e) => e.scenario;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
  }

  // A new exercise of the topic and stage chosen (topics.js), of another type than the current
  // one if possible.
  function fresh() { open(topics.next(ex)); }
  // the same exercise again (e.g. in the other language); links of earlier versions name a level
  const again = (e) => topics.parse(e.id) || generate(e.level, e.seed);
  // An exercise of a type: a situation (scenarios.js), with the energy table and formulas, or a
  // question of concepts.js with options to choose from.
  const ofType = (type, seed) => (Concepts.KINDS.includes(type) ? Concepts.exercise(type, seed) : generateFor(type, seed));

  // The topics of practice: those of the tutor's examples, with their stages (lessons.js).
  const topicList = () => window.Lessons.EXAMPLES.map((e) => ({
    name: () => e.name[EC.getLang()],
    stages: e.practice.map((s) => ({ name: s.en ? () => s[EC.getLang()] : null, types: s.types })),
  }));

  // The energy table: a row per state, a column per form of energy, a box per cell.
  function tableHtml() {
    const head = ex.forms.map((k) => `<th scope="col" class="k-${k}" title="${EC.ENAME[k]()}">$${EC.etex(k)}$</th>`).join('');
    const rows = ex.table.map((row, i) => `<tr><th scope="row">${EC.CIRCLED[i]}</th>${row.map((_, j) => `
      <td><label class="cell"><input type="checkbox" data-i="${i}" data-j="${j}" aria-label="${ui().state} ${i + 1}: ${EC.ENAME[ex.forms[j]]()}"><span aria-hidden="true"></span></label></td>`).join('')}</tr>`).join('');
    return `<table class="etable"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  // a question with options (concepts.js): one to choose
  function choiceHtml() {
    return `<div class="choices" role="radiogroup">${ex.options.map((o, k) => `<label class="choice" data-k="${k}"><input type="radio" name="choice" value="${k}"><span class="letter">${k + 1}</span><span class="val"><span>${o.html}</span></span></label>`).join('')}</div>
      <p class="fb choice-fb" aria-live="polite"></p>`;
  }

  function fieldHtml() {
    if (ex.choice) return choiceHtml();
    const w = ex.want, label = `<label for="in-ans" class="sym"><span class="what">${w.what}</span> $${EC.tex(w.key)}$&nbsp;=</label>`;
    const keys = [...new Set([...ex.vars, 'g'])], th = typeHints(keys);
    return `<div class="field formula" data-key="ans">${label}
        <input id="in-ans" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" enterkeyhint="done" spellcheck="false">
        <span class="fb" aria-live="polite"></span></div>
      <p class="preview" id="preview" aria-live="polite"></p>
      <p class="note type-help">${ui().typeHelp(th.join(', '))}</p>`;
  }

  // The energy of each state as a formula: E₁ = …
  const eTex = (i) => `E_${i + 1}`;
  function efieldHtml() {
    return ex.table.map((_, i) => `<div class="field formula" data-key="e${i}">
        <label for="in-e${i}" class="sym">$${eTex(i)}$&nbsp;=</label>
        <input id="in-e${i}" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" enterkeyhint="next" spellcheck="false">
        <span class="fb" aria-live="polite"></span></div>
      <p class="preview" id="pv-e${i}" aria-live="polite"></p>`).join('');
  }
  function formulaNote() {
    if (!ex.energy) return '';
    const keys = ex.energy.esyms;
    return ui().formulaNote(symList(keys), typeHints(keys).join(', '));
  }
  const judgeE = (i, raw) => {
    const r = window.Energy.judgeEnergy(ex, i, raw);
    const allowed = [...new Set([...ex.energy.esyms, 'g', 'm'])];
    const named = (v) => (EC.SYM[v] ? EC.plainSym(v) : v.replace(/p/, '′'));
    return { cls: r.cls, msg: { ok: ui().correct, empty: ui().empty, syntax: ui().syntax, wrong: ui().wrong, missing: ui().missing, half: ui().half,
      unknown: r.vars && ui().unknown(named(r.vars[0]), symList(allowed)) }[r.key] };
  };

  // A typed formula as KaTeX, so that the student sees how it is read: the field id, the left side.
  function previewOne(id, lhs) {
    const el = $(`#${id === 'in-ans' ? 'preview' : `pv-${id.slice(3)}`}`);
    if (!el) return;
    const raw = $(`#${id}`).value, r = Expr.parse(raw);
    el.innerHTML = raw.trim() && r.tree ? `${ui().preview}: ${katex1(`${lhs} = ${Expr.tex(r.tree)}`)}` : '';
  }
  function preview() {
    if (ex.choice) return;
    previewOne('in-ans', EC.tex(ex.want.key));
    ex.table.forEach((_, i) => previewOne(`in-e${i}`, eTex(i)));
  }

  function render() {
    $('#title').textContent = ex.title;
    const stars = document.createElement('span');
    stars.className = 'stars';
    stars.textContent = '★'.repeat(ex.difficulty) + '☆'.repeat(5 - ex.difficulty);
    stars.title = ui().stars(ex.difficulty);
    stars.setAttribute('aria-label', ui().stars(ex.difficulty));
    stars.setAttribute('role', 'img');
    $('#title').append(' ', stars);
    $('#prompt').innerHTML = ex.text;
    $('#figure').innerHTML = ex.figure({});
    // a question with options has no table and no formulas: its question takes the place of the result
    $('#etable-part').hidden = !!ex.choice;
    $('#eformula').hidden = !!ex.choice;
    $('#table-note').textContent = ex.choice ? '' : ui().tableNote(ex.zero);
    $('#etable').innerHTML = ex.choice ? '' : tableHtml();
    $('#table-fb').textContent = '';
    $('#table-fb').className = 'table-fb';
    $('#answer-head').innerHTML = ex.choice ? ex.ask : ui().answerHead;
    $('#formula-note').textContent = ex.choice ? '' : formulaNote();
    $('#efields').innerHTML = ex.choice ? '' : efieldHtml();
    $('#fields').className = `fields${ex.choice ? ' choice-fields' : ' formula'}`;
    $('#fields').innerHTML = fieldHtml();
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

  // Marks the option chosen; true if right, null if none is chosen.
  function choiceFeedback() {
    const sel = document.querySelector('#fields input[name="choice"]:checked'), fb = $('#fields .choice-fb');
    document.querySelectorAll('#fields .choice').forEach((el) => el.classList.remove('ok', 'bad'));
    if (!sel) { fb.textContent = ''; return null; }
    const o = ex.options[Number(sel.value)];
    sel.closest('.choice').classList.add(o.correct ? 'ok' : 'bad');
    fb.className = `fb choice-fb ${o.correct ? 'ok' : 'bad'}`;
    // a wrong option: a nudge while the exercise is open, where its reason would give the answer away
    fb.innerHTML = o.correct ? ui().correct : (!st.solved && !st.revealed && o.nudge) || o.why || ui().wrong;
    math(fb);
    return !!o.correct;
  }

  // Marks the table and the result; true if all is right, null if the result is empty.
  function feedback() {
    if (ex.choice) return choiceFeedback();
    let wrongCells = 0;
    document.querySelectorAll('#etable input').forEach((box) => {
      const right = box.checked === ex.table[box.dataset.i][box.dataset.j];
      box.closest('td').className = right ? 'ok' : 'bad';
      if (!right) wrongCells++;
    });
    $('#table-fb').className = `table-fb ${wrongCells ? 'bad' : 'ok'}`;
    $('#table-fb').textContent = wrongCells ? ui().tableBad(wrongCells) : ui().tableOk;
    // a field: marked with the verdict of judge, or left unmarked if empty; returns the verdict
    const mark = (row, raw, judgeIt) => {
      const base = row.className.replace(/ (ok|warn|bad)/g, '');
      if (!raw.trim()) { row.className = base; row.querySelector('.fb').textContent = ''; return null; }
      const r = judgeIt(raw);
      row.className = `${base} ${r.cls}`;
      row.querySelector('.fb').textContent = r.msg;
      return r.cls === 'ok';
    };
    const verdicts = [...ex.table.map((_, i) => mark($(`#efields .field[data-key="e${i}"]`), $(`#in-e${i}`).value, (raw) => judgeE(i, raw))),
      mark($('#fields .field'), $('#in-ans').value, judge)];
    if (verdicts.includes(null)) return null;
    return verdicts.every(Boolean) && !wrongCells;
  }

  // The status line: null (none), 'fill', 'ok' or 'bad'.
  function showStatus(kind) {
    const el = $('#status');
    st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? (ex.choice ? ui().choose : ui().fill)
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
        const s = stored('ec-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('ec-score', s);
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
    $('#sol-figure').innerHTML = ex.solutionFigure();
    $('#sol-steps').innerHTML = ex.solution.join('');
    $('#sol-short').innerHTML = `${ui().result}: ${ex.results}`;
    $('#sol-short').hidden = !!ex.choice && /<svg/.test(ex.results); // a bar chart is in the solution already
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

  // ---------------------------------------------------------------- the tutor's animation
  // The animation in a tutor frame (motion.js): it plays when the frame is shown and stops in the
  // last state; ▶ then plays it again from the start, ❚❚ pauses it, and the slider moves through it.
  // With reduced motion, it waits for ▶.
  let player = null;
  function startAnim() {
    if (player) player.stop();
    player = null;
    const el = $('#t-figure .anim'), anim = el && window.Motion && window.Motion.get(el.dataset.anim);
    if (!anim) return;
    const svg = el.querySelector('svg'), btn = el.querySelector('.anim-play'), seek = el.querySelector('.anim-seek');
    let t = 0, last = null, raf = 0, playing = false;
    const show = () => { svg.innerHTML = anim.frame(t).svg; seek.value = Math.round((1000 * t) / anim.duration); };
    const setPlaying = (on) => {
      playing = on;
      last = null;
      btn.textContent = on ? '❚❚' : '▶';
      btn.setAttribute('aria-label', on ? ui().pause : ui().play);
    };
    function tick(now) {
      if (!el.isConnected) return;
      if (playing) {
        if (last != null) {
          t = Math.min(anim.duration, t + (now - last) / 1000);
          show();
          if (t >= anim.duration) setPlaying(false);
        }
        last = now;
      }
      raf = requestAnimationFrame(tick);
    }
    btn.addEventListener('click', () => {
      if (!playing && t >= anim.duration) { t = 0; show(); } // at the end: from the start again
      setPlaying(!playing);
    });
    seek.addEventListener('input', () => { setPlaying(false); t = (Number(seek.value) / 1000) * anim.duration; show(); });
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    show();
    raf = requestAnimationFrame(tick);
    player = { stop: () => cancelAnimationFrame(raf) };
  }

  // ---------------------------------------------------------------- language
  const lessons = () => window.Lessons.EXAMPLES.map((e, i) => ({
    name: e.name[EC.getLang()], idea: e.idea[EC.getLang()], also: topics.also(i), frames: () => tutorial(e).frames,
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
      const answer = ex.choice ? null : $('#in-ans').value, boxes = [...document.querySelectorAll('#etable input')].map((b) => b.checked);
      const energies = ex.choice ? [] : ex.table.map((_, i) => $(`#in-e${i}`).value);
      const chosen = document.querySelector('#fields input[name="choice"]:checked');
      const keep = { ...st };
      ex = again(ex);
      render();
      st = keep;
      if (answer != null) $('#in-ans').value = answer;
      energies.forEach((v, i) => { $(`#in-e${i}`).value = v; });
      document.querySelectorAll('#etable input').forEach((b, k) => { b.checked = boxes[k]; });
      if (chosen) document.querySelector(`#fields input[name="choice"][value="${chosen.value}"]`).checked = true;
      preview();
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
  // Practice: exercises by topic; tutor: worked examples; check: a short test on the learning
  // objectives (check.js, the questions of concepts.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('ec-mode', m);
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
    // links of earlier versions: a level, with symbols (numbers are no longer practised)
    m = h.match(/^(easy|medium|hard|mixed)(-num)?-(\d+)$/);
    if (m) {
      setMode('practice');
      if (!ex || ex.id !== h) open(generate(m[1], Number(m[3])));
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
      // an exercise is new by its text (and, with options, by its options)
      keyOf: (e) => e.key || `${e.title}|${e.text}`,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    topics.relabel();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#answers').addEventListener('input', (evt) => {
      const id = evt.target.id;
      if (id === 'in-ans') previewOne(id, EC.tex(ex.want.key));
      else if (/^in-e\d$/.test(id)) previewOne(id, eTex(Number(id.slice(4))));
    });
    // another option chosen: its mark goes until the next check
    $('#fields').addEventListener('change', (evt) => {
      if (evt.target.name !== 'choice') return;
      document.querySelectorAll('#fields .choice').forEach((el) => el.classList.remove('ok', 'bad'));
      $('#fields .choice-fb').textContent = '';
    });
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), {
      after: () => { math($('#tutor')); markScrollable(); startAnim(); },
      done: practise,
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
      t: () => ui().tutorBtns,
    });
    checker = Check.create(Concepts.CHECK, {
      math, markScrollable, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // First visit: start with the first worked example; problems of earlier versions are now practice.
    const last = stored('ec-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
