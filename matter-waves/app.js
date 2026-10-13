(function () {
  'use strict';

  const P = window.MatterWave, X = window.MatterEx, G = window.MatterPlot;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);
  const { plain, sci } = P;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Matter Waves and the Particle in a Box', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. In practice, the numbers are worked out by ratios, without a calculator; a comma works as a decimal point too.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: (n) => `The solution unlocks once you have solved the exercise, used all hints or made ${n} attempts.`,
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check.', okWell: 'All correct, well done!',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', notAll: 'Not all the answers that fit are chosen yet.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), missed: 'This one fits too:', shown: 'The right answers are filled in.',
      number: 'Enter a number', sign: 'Wrong sign', prefix: 'Off by a factor of 1000: check the unit prefix', power: 'Check the power of ten', close: 'Close: check your rounding', wrong: 'Not correct',
    },
    de: {
      title: 'Materiewellen und das Teilchen im Kasten', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Beim Üben rechnest du mit Verhältnissen, ohne Taschenrechner; ein Komma geht auch als Dezimalzeichen.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: (n) => `Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder ${n} Versuche gemacht hast.`,
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann.', okWell: 'Alles richtig, gut gemacht!',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Tipp.', notAll: 'Noch sind nicht alle passenden Antworten gewählt.', stmtsWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`), missed: 'Auch diese passt:', shown: 'Die richtigen Antworten sind eingetragen.',
      number: 'Gib eine Zahl ein', sign: 'Falsches Vorzeichen', prefix: 'Um den Faktor 1000 daneben: Prüfe die Einheit', power: 'Prüfe die Zehnerpotenz', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('mw-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;
  // Wide pictures scroll on small screens; say so, since the cut-off part is invisible.
  function markScrollable() { document.querySelectorAll('.fig').forEach((el) => el.classList.toggle('scrolls', el.scrollWidth > el.clientWidth + 1)); }

  // ---------------------------------------------------------------- numbers typed in
  // 3.8e-24, 3.8·10^-24, 3.8 x 10^-24, 3,8 · 10⁻²⁴, a minus as phones type it, a unit left over at the end
  const SUPS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parse(s) {
    s = String(s).trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => `^${[...m].map((ch) => SUPS[ch]).join('')}`);
    s = s.replace(/\s*(?:[·*×x]|\\cdot)\s*10\s*\^?\s*\(?([-+]?\d+)\)?/i, 'e$1').replace(/\s+/g, '');
    s = s.replace(/^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)[^\d]*$/i, '$1');
    const m = s.match(/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i);
    return m ? Number(s) : NaN;
  }
  // { cls: ok | warn | bad, msg, why }: why, the text of a typical mistake that fits
  function judge(x, q) {
    if (Number.isNaN(x)) return { cls: 'bad', msg: ui().number };
    const v = q.value;
    const near = (y, tol = q.tol, abs = q.abs) => Math.abs(y - v) <= Math.max(tol * Math.abs(v), abs || 0) + 1e-12;
    if (near(x) || (q.scale !== 1 && near(x / q.scale))) return { cls: 'ok', msg: ui().correct };
    for (const w of q.wrong || []) {
      if (Math.abs(x - w.value) <= Math.max(0.02 * Math.abs(w.value), q.abs || 0) || (q.scale !== 1 && Math.abs(x / q.scale - w.value) <= 0.02 * Math.abs(w.value))) return { cls: 'bad', msg: w.why, tag: w.tag, nudge: w.nudge };
    }
    if (near(-x)) return { cls: 'warn', msg: ui().sign };
    if (near(x / 1000) || near(x * 1000)) return { cls: 'warn', msg: ui().prefix };
    for (let k = -12; k <= 12; k++) if (k && (near(x * 10 ** k, q.tol * 1.5) || (q.scale !== 1 && near((x / q.scale) * 10 ** k, q.tol * 1.5)))) return { cls: 'warn', msg: ui().power };
    if (near(x, Math.max(0.05, 2 * q.tol), (q.abs || 0) * 2)) return { cls: 'warn', msg: ui().close };
    return { cls: 'bad', msg: ui().wrong };
  }
  // the right value as the student would type it
  const typed = (q) => String(P.round(q.value, 3));

  // ---------------------------------------------------------------- questions
  // num: a number field; choice: a row of options; pick: drawings; multi: statements to tick.
  // Number fields that follow each other share one grid, so that their inputs line up.
  function questionHtml(q) {
    if (q.type === 'num') {
      return `<div class="field" data-key="${q.key}"><span class="what">${q.label}</span><label class="sym" for="in-${q.key}">${q.sym ? `${q.sym}&nbsp;=` : ''}</label><input id="in-${q.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false"><span class="unit">${q.unit}</span><span class="fb" aria-live="polite"></span></div>`;
    }
    if (q.type === 'pick') {
      return `<p class="ask">${q.label}</p><div class="cands" role="radiogroup">${q.options.map((o, k) => `<label class="cand" data-k="${k}"><input type="radio" name="q-${q.key}" value="${k}"><span class="letter">${k + 1}</span>${o.html}</label>`).join('')}</div><ul class="qfb" data-fb="${q.key}"></ul>`;
    }
    if (q.type === 'multi') {
      return `<ul class="stmts">${q.statements.map((s, k) => `<li data-k="${k}"><label><input type="checkbox" name="q-${q.key}" value="${k}"><span>${s.html}</span></label><span class="fb"></span></li>`).join('')}</ul><p class="fb stmts-fb" data-fb="${q.key}"></p>`;
    }
    return `<div class="qrow" data-key="${q.key}"><span class="what">${q.label}</span><div class="opts" role="radiogroup">${q.options.map((o, k) => `<label><input type="radio" name="q-${q.key}" value="${k}"><span>${o.label}</span></label>`).join('')}</div><span class="fb" aria-live="polite"></span></div>`;
  }
  function questionsHtml(qs) {
    let out = '', nums = '';
    const flush = () => { if (nums) out += `<div class="fields">${nums}</div>`; nums = ''; };
    for (const q of qs) { if (q.type === 'num') nums += questionHtml(q); else { flush(); out += questionHtml(q); } }
    flush();
    return out;
  }
  // Marks every answer; true if all are right, null if one is missing.
  // While the exercise is open, a wrong answer gets a nudge, not the solution: its own nudge where it
  // has one (its explanation would give the answer away), else the explanation with the steps of the
  // solution taken out; single statements or missed options are not marked.
  function feedback() {
    let all = true, missing = false;
    const done = st && (st.solved || st.revealed);
    const nudge = (w, n) => {
      if (done) return w;
      if (n) return n;
      let t = w || '';
      for (const s of ex.solution) if (s) t = t.split(s).join('');
      t = t.replace(/\s+/g, ' ').trim();
      return t || ui().notThis;
    };
    for (const q of ex.questions) {
      if (q.type === 'num') {
        const row = $(`.field[data-key="${q.key}"]`), raw = row.querySelector('input').value;
        if (!raw.trim()) { all = false; missing = true; row.className = 'field'; row.querySelector('.fb').textContent = ''; continue; }
        const r = judge(parse(raw), q);
        row.className = `field ${r.cls}`;
        row.querySelector('.fb').innerHTML = r.cls === 'bad' && r.tag ? nudge(r.msg, r.nudge) : r.msg;
        if (r.cls !== 'ok') all = false;
        continue;
      }
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
      const o = q.options[on[0]], row = $(`.qrow[data-key="${q.key}"]`);
      row.className = `qrow ${o.ok ? 'ok' : 'bad'}`;
      row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o.why, o.nudge);
      if (!o.ok) all = false;
    }
    return all ? true : missing && !document.querySelector('#fields .field.bad, #fields .field.warn, .qrow.bad, .cand.bad, .stmts li.bad, .stmts-fb:not(:empty)') ? null : false;
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'mw', typeOf = (e) => e.type;
  const MAX_TRIES = 3;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };
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
    $('#fields').innerHTML = questionsHtml(ex.questions);
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    markScrollable();
    updateButtons();
  }
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;
  function updateButtons() {
    const left = ex.hints.length - st.hints;
    $('#hint').disabled = left === 0 || st.revealed || st.solved;
    $('#hint').textContent = left ? ui().hint(left) : ui().noHints;
    $('#reveal').disabled = !canReveal() || st.revealed;
    $('#reveal').title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').textContent = ui().revealNote(MAX_TRIES);
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
  const lock = () => document.querySelectorAll('#fields input').forEach((x) => { x.disabled = true; });
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
    const s = stored('mw-score', { solved: 0, clean: 0 });
    s.solved++;
    if (st.tries === 1 && st.hints === 0) s.clean++;
    store('mw-score', s);
    showScore();
    st.solved = true;
    Practice.markSolved(PRACTICE, ex.id);
    finish();
    st.advance = topics.solved(st, ex);
    lock();
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
    markScrollable();
  }
  // The right answers filled in and marked.
  function markRight() {
    for (const q of ex.questions) {
      if (q.type === 'num') $(`#in-${q.key}`).value = typed(q);
      else if (q.type === 'multi') q.statements.forEach((s, k) => { $(`.stmts li[data-k="${k}"] input`).checked = s.ok; });
      else q.options.forEach((o, k) => { $(`input[name="q-${q.key}"][value="${k}"]`).checked = o.ok; });
    }
    feedback();
    lock();
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
  const frame = (title, text, figure) => ({ text: `<p class="step-rule">${title}</p>${text}`, figure: figure ? `<div class="figs">${figure}</div>` : '' });
  const fig = (html) => `<div class="fig">${html}</div>`;
  const { i, sb, ofL } = X;
  const lam = i('λ'), p = i('p'), m = i('m'), v = i('v'), h = i('h'), U = { toString: () => i(L('V', 'U')) }, Ek = `${i('E')}${sb('kin')}`, dx = `Δ${i('x')}`, dp = `Δ${i('p')}`, d = i('d'), Lb = i('L'), n = i('n'), E1 = `${i('E')}${sb('1')}`, En = `${i('E')}${sb('n')}`, psi2 = `|${i('ψ')}|²`, xm = `⟨${i('x')}⟩`;
  // the rings of graphite (mm) at a voltage in kV: r = L·λ/d, L = 13.5 cm, d = 0.213 nm and 0.123 nm
  const ringsAt = (kV) => [0.213e-9, 0.123e-9].map((dd) => (0.135 * P.lambdaU(kV * 1e3)) / dd * 1e3);
  const LESSONS = [
    { topic: 0, stage: 0, name: () => L('The wavelength by comparison', 'Die Wellenlänge im Vergleich'), idea: () => L('λ = h/p. Work it out once (an electron through 150 V: 100 pm), then compare: for a particle with mass p = √(2·m·E_kin), never E/c, so λ ∝ 1/√V.', 'λ = h/p. Einmal ausrechnen (ein Elektron durch 150 V: 100 pm), dann vergleichen: Für ein Teilchen mit Masse ist p = √(2·m·E_kin), nie E/c, also λ ∝ 1/√U.'),
      frames: () => {
        const Uv = 150, pp = P.pOfU(P.me, Uv), lm = P.h / pp, lPh = (P.h * P.c) / (Uv * P.e), ball = P.h / (0.057 * 50);
        return [
          frame(L('One value, worked out once', 'Ein Wert, einmal ausgerechnet'), `<p>${L(`An electron accelerated through ${U} = ${Uv} V gains ${Ek} = ${i('e')}·${U} = ${Uv} eV = ${p}²/(2${m}). So ${p} = √(2·${m}·${i('e')}·${U}) = ${sci(pp)} kg·m/s and ${lam} = ${h}/${p} = ${plain(lm * 1e12)} pm: about the distance between the atoms of a crystal.`, `Ein Elektron, das mit ${U} = ${Uv} V beschleunigt wird, gewinnt ${Ek} = ${i('e')}·${U} = ${Uv} eV = ${p}²/(2${m}). Also ${p} = √(2·${m}·${i('e')}·${U}) = ${sci(pp)} kg·m/s und ${lam} = ${h}/${p} = ${plain(lm * 1e12)} pm: etwa der Abstand der Atome eines Kristalls.`)}</p><p class="law">${lam} = ${h}/${p} = ${h}/√(2·${m}·${i('e')}·${U})</p>`, fig(G.tube({ U: '150 V' }))),
          frame(L('Then by ratios', 'Dann mit Verhältnissen'), `<p>${L(`${p} ∝ √${U}, so ${lam} ∝ 1/√${U}. Through 600 V, four times the voltage: twice the momentum, <b>half</b> the wavelength, 50 pm. Through 37.5 V, a quarter of the voltage: 200 pm. Not a quarter of the wavelength: the square root makes four times the voltage only twice the momentum.`, `${p} ∝ √${U}, also ${lam} ∝ 1/√${U}. Durch 600 V, die vierfache Spannung: doppelter Impuls, <b>halbe</b> Wellenlänge, 50 pm. Durch 37.5 V, ein Viertel der Spannung: 200 pm. Nicht ein Viertel der Wellenlänge: Wegen der Wurzel gibt die vierfache Spannung nur den doppelten Impuls.`)}</p><p class="law">${lam}${sb('2')}/${lam}${sb('1')} = √(${U}${sb('1')}/${U}${sb('2')})</p>`),
          frame(L('The trap', 'Die Falle'), `<p>${L(`For a photon ${p} = ${i('E')}/${i('c')}; for an electron that is wrong. With it, ${Uv} eV would give ${lam} = ${h}${i('c')}/${i('E')} = ${plain(lPh * 1e9)} nm, ${plain(lPh / lm, 2)} times too long. A particle with mass has ${p} = √(2·${m}·${Ek}).`, `Für ein Photon ist ${p} = ${i('E')}/${i('c')}; für ein Elektron ist das falsch. Damit ergäben ${Uv} eV ${lam} = ${h}${i('c')}/${i('E')} = ${plain(lPh * 1e9)} nm, ${plain(lPh / lm, 2)}-mal zu lang. Ein Teilchen mit Masse hat ${p} = √(2·${m}·${Ek}).`)}</p>`),
          frame(L('Other particles', 'Andere Teilchen'), `<p>${L(`A proton is about 1840 times as heavy as an electron. At the same speed, ${p} = ${m}·${v}: its wavelength is 1840 times shorter. At the same kinetic energy, ${p} = √(2·${m}·${Ek}): √1840 ≈ 43 times shorter. A tennis ball (57 g) at 50 m/s: ${lam} = ${sci(ball)} m, unimaginably shorter than anything it could be diffracted by. Only for electrons, neutrons, atoms and small molecules is the wave long enough to show.`, `Ein Proton ist etwa 1840-mal so schwer wie ein Elektron. Bei gleicher Geschwindigkeit ist ${p} = ${m}·${v}: Seine Wellenlänge ist 1840-mal kürzer. Bei gleicher kinetischer Energie ist ${p} = √(2·${m}·${Ek}): √1840 ≈ 43-mal kürzer. Ein Tennisball (57 g) mit 50 m/s: ${lam} = ${sci(ball)} m, unvorstellbar viel kürzer als alles, woran er gebeugt werden könnte. Nur bei Elektronen, Neutronen, Atomen und kleinen Molekülen ist die Welle lang genug, um sich zu zeigen.`)}</p>`),
        ];
      } },
    { topic: 0, stage: 2, name: () => L('Electron diffraction', 'Elektronenbeugung'), idea: () => L('Electrons passing a graphite foil make rings, as X-rays do. The rings shrink as the voltage grows, exactly as λ = h/p predicts: electrons are waves.', 'Elektronen, die eine Graphitfolie durchqueren, bilden Ringe, wie Röntgenstrahlung. Die Ringe schrumpfen, wenn die Spannung wächst, genau wie λ = h/p es vorhersagt: Elektronen sind Wellen.'),
      frames: () => {
        const r4 = ringsAt(4), r16 = ringsAt(16), max = r4[1] * 1.08;
        return [
          frame(L('The diffraction tube', 'Die Beugungsröhre'), `<p>${L('Electrons from a hot cathode are accelerated through a few kilovolts and pass a thin foil of graphite: tiny crystals in all orientations. On the screen, they make bright rings around the central spot.', 'Elektronen aus einer Glühkathode werden mit einigen Kilovolt beschleunigt und durchqueren eine dünne Graphitfolie: winzige Kristalle in allen Orientierungen. Auf dem Schirm bilden sie helle Ringe um den zentralen Fleck.')}</p>`, fig(G.tube()) + fig(G.rings(r4, { max }))),
          frame(L('Bragg reflection', 'Bragg-Reflexion'), `<p>${L(`The planes of atoms reflect the electron waves where 2${d}·sin θ = ${lam}: only there do the waves from all the planes add up. The beam is turned by 2θ, so for small angles a ring of radius ${i('r')} = ${Lb}·2θ = ${Lb}·${lam}/${d} appears. Two kinds of planes (${d} = 0.213 nm and 0.123 nm) give two rings.`, `Die Atomebenen reflektieren die Elektronenwellen dort, wo 2${d}·sin θ = ${lam} gilt: Nur dort verstärken sich die Wellen aller Ebenen. Der Strahl wird um 2θ abgelenkt; für kleine Winkel erscheint also ein Ring mit dem Radius ${i('r')} = ${Lb}·2θ = ${Lb}·${lam}/${d}. Zwei Arten von Ebenen (${d} = 0.213 nm und 0.123 nm) ergeben zwei Ringe.`)}</p><p class="law">${i('r')} = ${Lb}·${lam}/${d} ∝ ${lam} ∝ 1/√${U}</p>`, fig(G.tube())),
          frame(L('The test', 'Der Test'), `<p>${L(`Raise the voltage from 4 kV to 16 kV. Four times the voltage, half the wavelength: the rings must shrink to <b>half</b> their radius, not to a quarter. They do: the inner ring goes from ${plain(r4[0], 2)} mm to ${plain(r16[0], 2)} mm.`, `Erhöhe die Spannung von 4 kV auf 16 kV. Vierfache Spannung, halbe Wellenlänge: Die Ringe müssen auf den <b>halben</b> Radius schrumpfen, nicht auf ein Viertel. Das tun sie: Der innere Ring geht von ${plain(r4[0], 2)} mm auf ${plain(r16[0], 2)} mm.`)}</p>`, fig(G.rings(r4, { max, label: true })) + fig(G.rings(r16, { max, label: true })) + `<p class="note legend">4 kV · 16 kV</p>`),
          frame(L('Why this is evidence', 'Warum das ein Beweis ist'), `<p>${L('Sharp rings at fixed angles are a diffraction pattern: only waves do that. Particles bouncing off the atoms at random would make a smooth spot. A magnet near the tube moves the rings, so they are made by the electrons, not by X-rays. And their size follows λ = h/p of the electrons exactly (Davisson and Germer, G. P. Thomson, 1927).', 'Scharfe Ringe bei festen Winkeln sind ein Beugungsmuster: Das können nur Wellen. Teilchen, die zufällig von den Atomen abprallen, ergäben einen verschmierten Fleck. Ein Magnet neben der Röhre verschiebt die Ringe, also stammen sie von den Elektronen, nicht von Röntgenstrahlung. Und ihre Grösse folgt genau dem λ = h/p der Elektronen (Davisson und Germer, G. P. Thomson, 1927).')}</p>`),
        ];
      } },
    { topic: 1, stage: 0, name: () => L('The particle in a box', 'Das Teilchen im Kasten'), idea: () => L('Between infinitely high walls only standing waves fit: L = n·λ/2. So p_n = n·h/(2L) and E_n = n²·h²/(8mL²): the energies are quantised, E_n ∝ n² and ∝ 1/L².', 'Zwischen unendlich hohen Wänden passen nur stehende Wellen: L = n·λ/2. Also p_n = n·h/(2L) und E_n = n²·h²/(8mL²): Die Energien sind gequantelt, E_n ∝ n² und ∝ 1/L².'),
      frames: () => {
        const e1 = P.boxE(1, 0.5e-9) / P.e;
        return [
          frame(L('A wave between two walls', 'Eine Welle zwischen zwei Wänden'), `<p>${L(`A particle is trapped between two infinitely high walls a distance ${Lb} apart. It is never at or beyond them: its wavefunction ${i('ψ')} is zero at both walls, like a string fixed at both ends. Only standing waves fit, with a whole number ${n} of half waves: ${Lb} = ${n}·${lam}/2. A wave with antinodes at the walls, or one that goes on beyond them, is not allowed.`, `Ein Teilchen ist zwischen zwei unendlich hohen Wänden im Abstand ${Lb} gefangen. Es ist nie an oder hinter ihnen: Seine Wellenfunktion ${i('ψ')} ist an beiden Wänden null, wie eine Saite, die an beiden Enden eingespannt ist. Nur stehende Wellen passen, mit einer ganzen Zahl ${n} halber Wellen: ${Lb} = ${n}·${lam}/2. Eine Welle mit Bäuchen an den Wänden, oder eine, die über sie hinausläuft, ist nicht erlaubt.`)}</p><p class="law">${lam}${sb('n')} = 2${Lb}/${n}</p>`, [1, 2, 3].map((k) => fig(G.box({ n: k, small: true, w: 220, h: 120 }))).join('')),
          frame(L('Only certain energies', 'Nur bestimmte Energien'), `<p>${L(`Each standing wave has its own momentum and energy: ${p}${sb('n')} = ${h}/${lam}${sb('n')} = ${n}·${h}/(2${Lb}), ${En} = ${p}²/(2${m}). The energies are ${E1}, 4${E1}, 9${E1}, …, and nothing in between, since no standing wave in between fits. That is what <b>quantised</b> means.`, `Jede stehende Welle hat ihren eigenen Impuls und ihre eigene Energie: ${p}${sb('n')} = ${h}/${lam}${sb('n')} = ${n}·${h}/(2${Lb}), ${En} = ${p}²/(2${m}). Die Energien sind ${E1}, 4${E1}, 9${E1}, …, und nichts dazwischen, weil keine stehende Welle dazwischen passt. Das bedeutet <b>gequantelt</b>.`)}</p><p class="law">${En} = ${n}²·${h}²/(8${m}${Lb}²) = ${n}²·${E1}</p>`, fig(G.levels(3))),
          frame(L('By ratios', 'Mit Verhältnissen'), `<p>${L(`${En} ∝ ${n}²/(${m}·${Lb}²). An electron in a box of 0.5 nm has ${E1} = ${plain(e1)} eV. The state ${n} = 3: 9 times as much, ${plain(9 * e1)} eV (not 3 times). A box twice as wide: a quarter, ${plain(e1 / 4)} eV (not half). A proton in the same box: 1840 times less, since the same wavelengths give the same momenta.`, `${En} ∝ ${n}²/(${m}·${Lb}²). Ein Elektron in einem Kasten von 0.5 nm hat ${E1} = ${plain(e1)} eV. Der Zustand ${n} = 3: 9-mal so viel, ${plain(9 * e1)} eV (nicht 3-mal). Ein doppelt so breiter Kasten: ein Viertel, ${plain(e1 / 4)} eV (nicht die Hälfte). Ein Proton im selben Kasten: 1840-mal weniger, weil dieselben Wellenlängen dieselben Impulse ergeben.`)}</p>`),
          frame(L('Never at rest', 'Nie in Ruhe'), `<p>${L(`There is no state ${n} = 0: zero half waves means ${i('ψ')} = 0 everywhere, no particle at all. The lowest energy ${E1} is not zero: a particle in a box always moves. The narrower the box, the more: confined to ${dx} ≈ ${Lb}, its momentum must spread by ${dp} ≳ ${h}/(4π·${Lb}).`, `Es gibt keinen Zustand ${n} = 0: null halbe Wellen heisst ${i('ψ')} = 0 überall, gar kein Teilchen. Die kleinste Energie ${E1} ist nicht null: Ein Teilchen im Kasten bewegt sich immer. Je schmaler der Kasten, desto mehr: Auf ${dx} ≈ ${Lb} eingesperrt, muss sein Impuls um ${dp} ≳ ${h}/(4π·${Lb}) streuen.`)}</p>`),
        ];
      } },
    { topic: 2, stage: 0, name: () => L('Reading |ψ|²', '|ψ|² lesen'), idea: () => L('|ψ|² is the probability density: where the particle is likely to be found. The mean of many measurements is the expectation value ⟨x⟩, their spread the uncertainty Δx: a property of the state, not a measurement error.', '|ψ|² ist die Wahrscheinlichkeitsdichte: wo man das Teilchen wahrscheinlich findet. Der Mittelwert vieler Messungen ist der Erwartungswert ⟨x⟩, ihre Streuung die Unschärfe Δx: eine Eigenschaft des Zustands, kein Messfehler.'),
      frames: () => {
        const ymax = 1.08 / (0.05 * Math.sqrt(2 * Math.PI));
        return [
          frame(L('Where the particle is found', 'Wo man das Teilchen findet'), `<p>${L(`${psi2} is the probability density: ${psi2}·Δ${i('x')} is the probability of finding the particle in a small piece Δ${i('x')}. In the ground state of a box, it is most likely found in the middle and never at the walls. In the state ${n} = 2, it is never found in the middle: there ${i('ψ')} has a node.`, `${psi2} ist die Wahrscheinlichkeitsdichte: ${psi2}·Δ${i('x')} ist die Wahrscheinlichkeit, das Teilchen in einem kleinen Stück Δ${i('x')} zu finden. Im Grundzustand eines Kastens findet man es am wahrscheinlichsten in der Mitte und nie an den Wänden. Im Zustand ${n} = 2 findet man es nie in der Mitte: Dort hat ${i('ψ')} einen Knoten.`)}</p>`, fig(G.box({ n: 1, sq: true, small: true, w: 240, h: 120 })) + fig(G.box({ n: 2, sq: true, small: true, w: 240, h: 120 }))),
          frame(L('One measurement, many measurements', 'Eine Messung, viele Messungen'), `<p>${L(`A measurement of the position finds the particle at one place, and which place cannot be predicted. Only when the position is measured on many particles in the same state do the places pile up as ${psi2} says: often where it is high, never where it is zero.`, `Eine Messung des Orts findet das Teilchen an einem Ort, und welcher es ist, lässt sich nicht vorhersagen. Erst wenn man den Ort an vielen Teilchen im selben Zustand misst, häufen sich die Orte so, wie ${psi2} es sagt: oft, wo es hoch ist, nie, wo es null ist.`)}</p>`),
          frame(L('The expectation value', 'Der Erwartungswert'), `<p>${L(`The mean of the places found is the expectation value ${xm}. For ${n} = 2, ${psi2} is symmetric about the middle, so ${xm} = ${ofL(1, 2)}, although the particle is never found there. A mean need not be a likely place: the most likely places are near ${ofL(1, 4)} and ${ofL(3, 4)}.`, `Der Mittelwert der gefundenen Orte ist der Erwartungswert ${xm}. Für ${n} = 2 ist ${psi2} symmetrisch zur Mitte, also ${xm} = ${ofL(1, 2)}, obwohl man das Teilchen dort nie findet. Ein Mittelwert muss kein wahrscheinlicher Ort sein: Die wahrscheinlichsten Orte liegen bei ${ofL(1, 4)} und ${ofL(3, 4)}.`)}</p>`, fig(G.box({ n: 2, sq: true, ticks: true }))),
          frame(L('The uncertainty is not an error', 'Die Unschärfe ist kein Fehler'), `<p>${L(`The spread of the places found (their standard deviation) is the uncertainty ${dx}: the width of ${psi2}. In a box, ${dx} ≈ ${plain(P.boxDx(1), 2)}·${Lb} for ${n} = 1 and ${plain(P.boxDx(2), 2)}·${Lb} for ${n} = 2. With a perfect instrument the results still scatter: ${dx} is not a measurement error. The particle in this state has no exact position.`, `Die Streuung der gefundenen Orte (ihre Standardabweichung) ist die Unschärfe ${dx}: die Breite von ${psi2}. Im Kasten ist ${dx} ≈ ${plain(P.boxDx(1), 2)}·${Lb} für ${n} = 1 und ${plain(P.boxDx(2), 2)}·${Lb} für ${n} = 2. Auch mit einem perfekten Instrument streuen die Ergebnisse: ${dx} ist kein Messfehler. Das Teilchen hat in diesem Zustand keinen genauen Ort.`)}</p>`, fig(G.packet(0.5, 0.05, { ymax, small: true })) + fig(G.packet(0.5, 0.15, { ymax, small: true })) + `<p class="note legend">${L(`small ${dx} · large ${dx}`, `kleines ${dx} · grosses ${dx}`)}</p>`),
        ];
      } },
    { topic: 2, stage: 1, name: () => L('The uncertainty relation', 'Die Unschärferelation'), idea: () => L('A particle never has an exact position and an exact momentum at once: Δx·Δp ≥ h/(4π). The tighter it is confined, the more its momentum spreads.', 'Ein Teilchen hat nie zugleich einen genauen Ort und einen genauen Impuls: Δx·Δp ≥ h/(4π). Je enger es eingesperrt ist, desto stärker streut sein Impuls.'),
      frames: () => {
        const dpe = P.minDp(1e-10), dve = dpe / P.me, dvg = P.minDp(1e-6) / 1e-9;
        return [
          frame(L('A narrower slit, a wider pattern', 'Schmalerer Spalt, breiteres Muster'), `<p>${L(`A slit of width ${i('b')} fixes where a quantum passes to within Δy ≈ ${i('b')}. Behind it the quanta spread: the first minimum is at sin α = ${lam}/${i('b')}. Make the slit narrower, and they spread more, not less. Sideways they now have a momentum of up to ${p}·sin α = ${h}/${i('b')}.`, `Ein Spalt der Breite ${i('b')} legt fest, wo ein Quant durchgeht, auf Δy ≈ ${i('b')} genau. Dahinter streuen die Quanten: Das erste Minimum liegt bei sin α = ${lam}/${i('b')}. Wird der Spalt schmaler, streuen sie stärker, nicht schwächer. Seitwärts haben sie nun einen Impuls bis zu ${p}·sin α = ${h}/${i('b')}.`)}</p>`, fig(G.slitGraph([{ b: 20, lam: 0.633, cls: 'old', dash: true }, { b: 10, lam: 0.633, cls: 'new' }], { amax: 10 })) + `<p class="note legend"><span class="k-old">- - -</span> ${i('b')} = 20 µm · <span class="k-new">—</span> ${i('b')} = 10 µm</p>`),
          frame(L('Heisenberg', 'Heisenberg'), `<p>${L('This holds for every quantum object: the more precisely its position is fixed, the larger the spread of its momentum. Heisenberg (1927):', 'Das gilt für jedes Quantenobjekt: Je genauer sein Ort festgelegt ist, desto grösser die Streuung seines Impulses. Heisenberg (1927):')}</p><p class="law">${dx}·${dp} ≥ ${h}/(4π)</p><p>${L('It is not a flaw of the instruments: the particle does not have both an exact position and an exact momentum.', 'Das ist kein Mangel der Instrumente: Das Teilchen hat nicht zugleich einen genauen Ort und einen genauen Impuls.')}</p>`),
          frame(L('An electron in an atom', 'Ein Elektron im Atom'), `<p>${L(`Confined to ${dx} = 0.1 nm: ${dp} ≥ ${h}/(4π·${dx}) = ${sci(dpe)} kg·m/s, so Δ${v} = ${dp}/${m} = ${plain(dve / 1e3)} km/s. The velocity is hugely uncertain: an electron in an atom has no orbit. Half the region, twice the ${dp}, four times the energy: as in the box, ${i('E')} ∝ 1/${dx}².`, `Auf ${dx} = 0.1 nm beschränkt: ${dp} ≥ ${h}/(4π·${dx}) = ${sci(dpe)} kg·m/s, also Δ${v} = ${dp}/${m} = ${plain(dve / 1e3)} km/s. Die Geschwindigkeit ist riesig unscharf: Ein Elektron im Atom hat keine Bahn. Halber Bereich, doppeltes ${dp}, vierfache Energie: wie im Kasten, ${i('E')} ∝ 1/${dx}².`)}</p>`),
          frame(L('A grain of dust', 'Ein Staubkorn'), `<p>${L(`A grain of dust of 1 µg located to 1 µm: Δ${v} ≥ ${sci(dvg)} m/s. Far below anything measurable: for everyday things, h is too small to matter.`, `Ein Staubkorn von 1 µg, auf 1 µm genau lokalisiert: Δ${v} ≥ ${sci(dvg)} m/s. Weit unter allem Messbaren: Für Alltagsdinge ist h zu klein, um eine Rolle zu spielen.`)}</p>`),
        ];
      } },
  ];
  const stage = (name, types) => ({ name, types });
  const TOPICS = [
    { name: () => L('The de Broglie wavelength', 'Die de-Broglie-Wellenlänge'), example: (s) => (s >= 2 ? 1 : 0), stages: [stage(() => L('by ratios', 'mit Verhältnissen'), ['debroglie']), stage(() => L('other particles', 'andere Teilchen'), ['same-lambda']), stage(() => L('diffraction', 'Beugung'), ['diffraction'])] },
    { name: () => L('The particle in a box', 'Das Teilchen im Kasten'), example: () => 2, stages: [stage(() => L('standing waves', 'stehende Wellen'), ['box-pick']), stage(() => L('energies', 'Energien'), ['box-energy'])] },
    { name: () => L('Probability and uncertainty', 'Wahrscheinlichkeit und Unschärfe'), example: (s) => (s >= 1 ? 4 : 3), stages: [stage(() => L('reading |ψ|²', '|ψ|² lesen'), ['density']), stage(() => L('the uncertainty relation', 'die Unschärferelation'), ['uncert-stmts'])] },
  ];
  const lessons = () => LESSONS.map((l) => ({ name: l.name(), idea: l.idea(), frames: l.frames, also: topics.also(l.topic) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the exercise types it is asked about, its worked
  // example and its practice topic. A question of the check is one question of an exercise with
  // four options: a number becomes four values (the right one, those of typical mistakes, then
  // multiples), choices and drawings stay, the statements become "which is correct?". The tags of
  // the wrong options are the flags of the check.
  const OBJECTIVES = [
    { id: 'debroglie', kinds: ['debroglie', 'same-lambda', 'diffraction'], tutor: 0, topic: 0,
      name: () => L('Work out de Broglie wavelengths by ratios with λ = h/p and p = √(2·m·E_kin), not E/c, and explain why electron diffraction shows that electrons are waves.', 'De-Broglie-Wellenlängen mit λ = h/p und p = √(2·m·E_kin), nicht E/c, über Verhältnisse bestimmen und erklären, warum die Elektronenbeugung zeigt, dass Elektronen Wellen sind.') },
    { id: 'box', kinds: ['box-pick', 'box-energy'], tutor: 2, topic: 1,
      name: () => L('Sketch the standing waves of a particle in a box, and explain why its energies are quantised, with E_n ∝ n² and ∝ 1/L².', 'Die stehenden Wellen eines Teilchens im Kasten skizzieren und erklären, warum seine Energien gequantelt sind, mit E_n ∝ n² und ∝ 1/L².') },
    { id: 'psi', kinds: ['density', 'uncert-stmts'], tutor: 3, topic: 2,
      name: () => L('Read |ψ|² as a probability density, with its expectation value and its uncertainty, and tell the uncertainty from a measurement error.', '|ψ|² als Wahrscheinlichkeitsdichte lesen, mit Erwartungswert und Unschärfe, und die Unschärfe von einem Messfehler unterscheiden.') },
  ];
  const STMTS = { 'uncert-stmts': X.BANK_U };
  const CONCEPT = {
    photonp: 'momentum', sqrt: 'root', inverse: 'inverse', mass: 'mass', charge: 'mass', particle: 'particle',
    count: 'standing', walls: 'standing', half: 'standing', nl: 'standing', psisq: 'psisq', classical: 'classical',
    linear: 'energy', lsq: 'energy', widthdir: 'energy', mean: 'mean', height: 'width', width: 'width', error: 'error', hidden: 'error', heisenberg: 'uncert', uncert: 'uncert',
  };
  const valueLabel = (val, q) => `${plain(val)}${q.unit ? ` ${q.unit}` : ''}`;
  function numOptions(q, seed) {
    const out = [{ value: q.value, correct: true }];
    const fits = (x) => Number.isFinite(x) && x > 0 && out.every((o) => Math.abs(Math.log(x / o.value)) > Math.log(1.18)) && !out.some((o) => valueLabel(o.value, q) === valueLabel(x, q));
    for (const w of q.wrong || []) if (out.length < 4 && fits(w.value)) out.push({ value: w.value, flag: w.tag, why: w.why });
    const factors = [[2, 0.5, 1.5, 3, 0.7], [0.5, 2, 0.7, 1.5, 4], [1.5, 0.7, 2, 0.5, 3]][seed % 3];
    for (const k of factors) if (out.length < 4 && fits(q.value * k)) out.push({ value: q.value * k, flag: null, why: null });
    return out.sort((a, b) => a.value - b.value).map((o) => ({ html: valueLabel(o.value, q), correct: !!o.correct, flag: o.flag || null, why: o.why || null }));
  }
  function checkQuestion(kind, seed) {
    if (STMTS[kind]) {
      const bank = STMTS[kind], r = P.rng(seed * 7 + 1), t = r.pick(bank.filter((s) => s[1])), fs = r.shuffle(bank.filter((s) => !s[1])).slice(0, 3);
      return {
        title: L('True or false', 'Richtig oder falsch'), text: '', figure: '', ask: L('Which statement is correct?', 'Welche Aussage ist richtig?'),
        options: r.shuffle([t, ...fs]).map((s) => ({ html: s[0](), correct: s[1], flag: s[1] ? null : 'uncert', why: s[1] ? null : s[2]() })),
        explain: () => `<div class="steps"><p>✓ ${t[0]()} ${t[2]()}</p>${fs.map((s) => `<p>✗ ${s[0]()} ${s[2]()}</p>`).join('')}</div>`, key: `${kind}-${bank.indexOf(t)}`,
      };
    }
    const e = X.make(kind, seed);
    const qs = e.questions.filter((q) => q.type === 'num' || (q.type !== 'multi' && q.options.length === 4)), q = qs[seed % qs.length];
    const ask = `${q.label.replace(/^\([a-d]\) /, '').replace(/, without a calculator$|, ohne Taschenrechner$/, '')}${q.type === 'num' && q.sym ? `: ${q.sym} = ?` : ''}`;
    const options = q.type === 'num' ? numOptions(q, seed) : q.options.map((o) => ({ html: o.html || o.label, correct: o.ok, flag: o.ok ? null : o.tag || 'other', why: o.why }));
    return {
      title: e.title, text: e.text, figure: e.figs || '', ask, options, key: `${kind}-${q.key}-${JSON.stringify(e.p)}`,
      explain: () => `${e.solFig ? `<div class="figs">${e.solFig}</div>` : ''}<div class="steps">${e.solution.map((s) => `<p>${s}</p>`).join('')}</div>`,
    };
  }
  const checkSource = {
    id: 'mw', objectives: OBJECTIVES, question: checkQuestion, concept: CONCEPT,
    concepts: () => ({
      momentum: L('p = E/c, the photon’s formula, for a particle with mass', 'p = E/c, die Formel des Photons, für ein Teilchen mit Masse'), root: L('λ ∝ 1/√V: the square root', 'λ ∝ 1/√U: die Wurzel'),
      inverse: L('more momentum, shorter wavelength', 'mehr Impuls, kürzere Wellenlänge'), mass: L('the mass (and charge) in the momentum', 'die Masse (und Ladung) im Impuls'),
      particle: L('electrons only as particles in diffraction', 'Elektronen bei der Beugung nur als Teilchen'), standing: L('standing waves: zero at the walls, n half waves', 'stehende Wellen: null an den Wänden, n halbe Wellen'),
      psisq: L('ψ and |ψ|² told apart', 'ψ und |ψ|² unterscheiden'), classical: L('the particle as a ball bouncing in the box', 'das Teilchen als Kugel, die im Kasten hin- und herprallt'),
      energy: L('E_n ∝ n²/(m·L²)', 'E_n ∝ n²/(m·L²)'), mean: L('the expectation value as the most likely place', 'der Erwartungswert als wahrscheinlichster Ort'),
      width: L('the uncertainty as the width of |ψ|²', 'die Unschärfe als Breite von |ψ|²'), error: L('the uncertainty taken for a measurement error', 'die Unschärfe als Messfehler verstanden'),
      uncert: L('the uncertainty relation Δx·Δp ≥ h/(4π)', 'die Unschärferelation Δx·Δp ≥ h/(4π)'),
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
      const keep = st, status = st.status;
      const typedIn = ex.questions.filter((q) => q.type === 'num').map((q) => [q.key, $(`#in-${q.key}`).value]);
      const chosen = [...document.querySelectorAll('#fields input:checked')].map((x) => [x.name, x.value]);
      ex = again(ex);
      render();
      st = keep;
      typedIn.forEach(([k, val]) => { const x = $(`#in-${k}`); if (x) x.value = val; });
      chosen.forEach(([nm, val]) => { const x = document.querySelector(`input[name="${nm}"][value="${val}"]`); if (x) x.checked = true; });
      if (st.revealed) markRight(); else if (st.checked) feedback();
      if (st.solved) lock();
      showStatus(status);
      showHints();
      if (st.revealed) showSolution();
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
      updateButtons();
    }
    tutor.relabel(lessons());
    checker.relabel();
  }
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(md) {
    document.querySelector(`input[name="mode"][value="${md}"]`).checked = true;
    store('mw-mode', md);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = md !== 'practice'; });
    $('#tutor').hidden = md !== 'tutor';
    $('#ck').hidden = md !== 'check';
    if (md !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; markScrollable(); } else fresh();
  }
  function checkMode() { setMode('check'); checker.show(); if (location.hash !== '#check') history.replaceState(null, '', '#check'); }
  function fromHash() {
    const hsh = location.hash.slice(1);
    // the arcade of earlier versions is now the check
    if (hsh === 'check' || hsh === 'arcade') { if ($('#ck').hidden) checkMode(); return true; }
    const mt = hsh.match(/^tutor-(\d+)$/);
    if (mt && Number(mt[1]) >= 1 && Number(mt[1]) <= LESSONS.length) {
      setMode('tutor');
      if (tutor.current() !== Number(mt[1]) - 1 || !tutor.shown()) tutor.open(Number(mt[1]) - 1);
      return true;
    }
    const te = topics.parse(hsh);
    if (te) { setMode('practice'); if (!ex || ex.id !== hsh) open(te); return true; }
    const dd = hsh.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)$/);
    if (dd && X.TYPES.includes(dd[1])) { setMode('practice'); if (!ex || ex.id !== hsh) open(X.make(dd[1], Number(dd[2]))); return true; }
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
      tutor: (k) => { setMode('tutor'); tutor.open(k); },
    });
    topics.mount($('#levels'));
    applyStatic();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#fields').addEventListener('input', (evt) => {
      const row = evt.target.closest('.field');
      if (row) { row.className = 'field'; row.querySelector('.fb').textContent = ''; }
    });
    $('#fields').addEventListener('change', (evt) => {
      const row = evt.target.closest('.qrow');
      if (row) { row.className = 'qrow'; row.querySelector('.fb').textContent = ''; }
      const box = evt.target.closest('.cands');
      if (box) { box.querySelectorAll('.cand').forEach((el) => el.classList.remove('ok', 'bad')); const fb = box.nextElementSibling; if (fb) fb.innerHTML = ''; }
      const li = evt.target.closest('.stmts li');
      if (li) { li.className = ''; li.querySelector('.fb').textContent = ''; }
    });
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', markScrollable);
    tutor = window.createTutor(lessons(), { after: markScrollable, done: practise, practise: (k) => { topics.go(LESSONS[k].topic, LESSONS[k].stage); setMode('practice'); fresh(); } });
    checker = Check.create(checkSource, {
      math: () => {}, markScrollable, stored, store,
      tutor: (k) => { setMode('tutor'); tutor.open(k); },
      practise: (t) => { topics.go(t); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // the arcade of earlier versions is now the check, its problems are gone
    const last = stored('mw-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (typeof document !== 'undefined' && typeof window.Lang !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  window.MatterApp = { parse, judge: (x, q) => judge(x, q), checkQuestion, OBJECTIVES, CONCEPT, LESSONS, TOPICS };
})();
