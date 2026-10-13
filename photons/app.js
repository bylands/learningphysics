(function () {
  'use strict';

  const P = window.Photon, X = window.PhotonEx, G = window.PhotonPlot;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);
  const { plain } = P;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Photoelectric Effect', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. Numbers can be typed as 6e14 or 6·10^14; a comma works as a decimal point too.',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: (n) => `The solution unlocks once you have solved the exercise, used all hints or made ${n} attempts.`,
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check.', next: 'Right. Now answer the next part.', okWell: 'All correct, well done!',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', notAll: 'Not all the answers that fit are chosen yet.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), missed: 'This one fits too:', shown: 'The right answers are filled in.',
      number: 'Enter a number', sign: 'Wrong sign', prefix: 'Off by a factor of 1000: check the unit prefix', power: 'Check the power of ten', close: 'Close: check your rounding', wrong: 'Not correct',
    },
    de: {
      title: 'Photoeffekt', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Zahlen kannst du als 6e14 oder 6·10^14 eingeben; ein Komma geht auch als Dezimalzeichen.',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: (n) => `Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder ${n} Versuche gemacht hast.`,
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann.', next: 'Richtig. Beantworte jetzt den nächsten Teil.', okWell: 'Alles richtig, gut gemacht!',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Tipp.', notAll: 'Noch sind nicht alle passenden Antworten gewählt.', stmtsWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`), missed: 'Auch diese passt:', shown: 'Die richtigen Antworten sind eingetragen.',
      number: 'Gib eine Zahl ein', sign: 'Falsches Vorzeichen', prefix: 'Um den Faktor 1000 daneben: Prüfe die Einheit', power: 'Prüfe die Zehnerpotenz', close: 'Knapp daneben: Prüfe deine Rundung', wrong: 'Nicht richtig',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('ph-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;
  // Wide pictures scroll on small screens; say so, since the cut-off part is invisible.
  function markScrollable() { document.querySelectorAll('.fig').forEach((el) => el.classList.toggle('scrolls', el.scrollWidth > el.clientWidth + 1)); }

  // ---------------------------------------------------------------- numbers typed in
  // 4.6e14, 4.6·10^14, 4.6 x 10^14, 4,6 · 10¹⁴, a minus as phones type it, a unit left over at the end
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
  // A question with after: '<key>' stays hidden until that question has been answered right.
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
  // Number fields waiting for the same question share one hidden block (and one grid).
  function questionsHtml(qs) {
    let out = '', nums = '', numsAfter = '';
    const wrap = (after, html) => (after ? `<div class="after" data-after="${after}" hidden>${html}</div>` : html);
    const flush = () => { if (nums) out += wrap(numsAfter, `<div class="fields">${nums}</div>`); nums = ''; };
    for (const q of qs) {
      if (q.type === 'num') {
        if (nums && (q.after || '') !== numsAfter) flush();
        numsAfter = q.after || '';
        nums += questionHtml(q);
      } else { flush(); out += wrap(q.after, questionHtml(q)); }
    }
    flush();
    return out;
  }
  // Shows the questions waiting for key, once it is answered right; notes that one was opened.
  let unlocked = false;
  function showAfter(key) {
    document.querySelectorAll(`#fields .after[data-after="${key}"][hidden]`).forEach((el) => { el.hidden = false; unlocked = true; });
  }
  // Marks every answer; true if all are right, null if one is missing (or still hidden).
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
        if (r.cls === 'ok') showAfter(q.key);
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
        if (!wrong) showAfter(q.key);
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
        if (!notes.length) showAfter(q.key);
        continue;
      }
      const o = q.options[on[0]], row = $(`.qrow[data-key="${q.key}"]`);
      row.className = `qrow ${o.ok ? 'ok' : 'bad'}`;
      if (o.ok) showAfter(q.key);
      row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o.why, o.nudge);
      if (!o.ok) all = false;
    }
    return all ? true : missing && !document.querySelector('#fields .field.bad, #fields .field.warn, .qrow.bad, .cand.bad, .stmts li.bad, .stmts-fb:not(:empty)') ? null : false;
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'ph', typeOf = (e) => e.type;
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
      : kind === 'next' ? ui().next : kind === 'ok' ? ui().okWell + (st.advance ? ` ${st.advance}` : '') : ui().notYet(st.tries) + (!canReveal() ? ui().tryAgain : ui().canReveal);
  }
  const lock = () => document.querySelectorAll('#fields input').forEach((x) => { x.disabled = true; });
  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; }
    if (st.revealed) return;
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus(unlocked ? 'next' : 'fill'); unlocked = false; return; }
    unlocked = false;
    st.tries++;
    if (r) solved(); else showStatus('bad');
    updateButtons();
  }
  function solved() {
    const s = stored('ph-score', { solved: 0, clean: 0 });
    s.solved++;
    if (st.tries === 1 && st.hints === 0) s.clean++;
    store('ph-score', s);
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
    document.querySelectorAll('#fields .after[hidden]').forEach((el) => { el.hidden = false; });
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
  // The worked examples: what the wave model cannot explain, photon energy against brightness,
  // Einstein's equation as energy bookkeeping, the characteristic of a photocell and the U₀(f) line.
  // All numbers in eV, so that they can be worked out in the head.
  const frame = (title, text, figure) => ({ text: `<p class="step-rule">${title}</p>${text}`, figure: figure ? `<div class="figs">${figure}</div>` : '' });
  const fig = (html) => `<div class="fig">${html}</div>`;
  const { i } = X;
  const lam = i('λ'), E = i('E'), f = i('f'), h = i('h'), c = i('c');
  // the symbols that differ between the languages (exercises.js): in English φ, V_s, E_k,max, V, f₀,
  // λ₀ as in British textbooks, in German W, U₀, E_kin,max, U, f_G, λ_G (Grenzfrequenz)
  const { W, U0, V } = X.SYM, Ek = X.SYM.EkMax, fG = () => X.SYM.fG, lG = () => X.SYM.lG;
  const legend = (alt) => `<p class="note legend"><span class="k-old">- - -</span> ${L('before', 'vorher')} · <span class="k-new">—</span> ${L('after', 'nachher')}${alt ? ` · <span class="k-alt">—</span> ${alt}` : ''}</p>`;
  const LESSONS = [
    { topic: 0, stage: 0, name: () => L('What the wave model cannot explain', 'Was das Wellenmodell nicht erklärt'), idea: () => L('For each observation, ask what a stronger wave or a longer wait would change. Where the wave model says “more” and the experiment says “no”, only photons explain it.', 'Frage bei jeder Beobachtung, was eine stärkere Welle oder längeres Warten ändern würde. Wo das Wellenmodell „mehr“ sagt und das Experiment „nein“, erklären es nur Photonen.'),
      frames: () => [
        frame(L('The test', 'Der Test'), `<p>${L('Light on a metal releases electrons. In the wave model, light is a wave whose energy grows with its brightness (its amplitude) and is spread over the whole surface. That makes three predictions that can be tested: brighter light gives faster electrons; any colour works if it is bright enough; dim light needs time before the first electron gets out.', 'Licht auf einem Metall löst Elektronen aus. Im Wellenmodell ist Licht eine Welle, deren Energie mit der Helligkeit (der Amplitude) wächst und über die ganze Fläche verteilt ist. Daraus folgen drei prüfbare Voraussagen: Helleres Licht ergibt schnellere Elektronen; jede Farbe wirkt, wenn sie hell genug ist; schwaches Licht braucht Zeit, bis das erste Elektron herauskommt.')}</p>`, fig(G.cell({ nm: 400, counter: true }))),
        frame(L('1. The threshold frequency', '1. Die Grenzfrequenz'), `<p>${L(`Wave model: red light on zinc, made bright enough, should release electrons. Observed: nothing, however bright. Photons: one electron takes up the energy of one photon. Red light of 620 nm brings 1240 eV·nm / 620 nm = 2.00 eV per photon; zinc needs ${W} = 4.27 eV. Below the threshold frequency ${fG()} = ${W}/${h}, no single photon has enough.`, `Wellenmodell: Rotes Licht auf Zink sollte Elektronen auslösen, wenn es nur hell genug ist. Beobachtet: nichts, wie hell es auch ist. Photonen: Ein Elektron nimmt die Energie eines Photons auf. Rotes Licht von 620 nm bringt 1240 eV·nm / 620 nm = 2.00 eV pro Photon; Zink braucht ${W} = 4.27 eV. Unterhalb der Grenzfrequenz ${fG()} = ${W}/${h} hat kein einzelnes Photon genug.`)}</p>`, fig(G.bars(2, 4.27))),
        frame(L('2. Brightness and the kinetic energy', '2. Helligkeit und kinetische Energie'), `<p>${L(`Wave model: brighter light shakes the electrons harder, so they come out faster. Observed: the stopping voltage ${U0}, and so the energy of the fastest electrons, stays the same; only the current grows. Photons: brighter light brings more photons per second, each with the same energy ${h}·${f}.`, `Wellenmodell: Helleres Licht schüttelt die Elektronen stärker, also kommen sie schneller heraus. Beobachtet: Die Gegenspannung ${U0} und damit die Energie der schnellsten Elektronen bleibt gleich; nur der Strom wächst. Photonen: Helleres Licht bringt mehr Photonen pro Sekunde, jedes mit derselben Energie ${h}·${f}.`)}</p>`,
          fig(G.ivGraph([{ U0: 1.2, I: 10, cls: 'old', dash: true }, { U0: 1.2, I: 20, cls: 'new' }], { Imax: 24 })) + legend()),
        frame(L('3. No waiting', '3. Kein Warten'), `<p>${L('Wave model: in very dim light, the energy spread over the surface trickles in slowly; an electron would have to collect it for a long time before it could leave. Observed: the first electrons come out at once. Photons: the energy arrives in portions; the first photon that hits an electron can free it.', 'Wellenmodell: Bei sehr schwachem Licht rieselt die über die Fläche verteilte Energie langsam herein; ein Elektron müsste sie lange sammeln, bevor es austreten kann. Beobachtet: Die ersten Elektronen kommen sofort. Photonen: Die Energie kommt in Portionen; das erste Photon, das ein Elektron trifft, kann es lösen.')}</p>`, fig(G.cell({ nm: 300 }))),
        frame(L('What fits both', 'Was zu beiden passt'), `<p>${L('Some observations fit the wave model as well, so they do not decide anything: brighter light releases more electrons per second; a large enough counter-voltage stops the current. A typical mistake is to count these as evidence for photons. What only photons explain: the threshold frequency, a kinetic energy that does not depend on the brightness but grows with the frequency, and no delay.', 'Manche Beobachtungen passen auch zum Wellenmodell und entscheiden darum nichts: Helleres Licht löst mehr Elektronen pro Sekunde aus; eine genügend grosse Gegenspannung stoppt den Strom. Ein typischer Fehler ist, diese als Beleg für Photonen zu zählen. Was nur Photonen erklären: die Grenzfrequenz, eine kinetische Energie, die nicht von der Helligkeit abhängt, aber mit der Frequenz wächst, und keine Verzögerung.')}</p>`, fig(G.bars(P.eV(248), 4.27))),
      ] },
    { topic: 1, stage: 0, name: () => L('Brighter or bluer?', 'Heller oder blauer?'), idea: () => L('The colour (frequency) sets the energy of each photon, E = h·f; the brightness sets how many photons arrive per second.', 'Die Farbe (Frequenz) bestimmt die Energie jedes Photons, E = h·f; die Helligkeit bestimmt, wie viele Photonen pro Sekunde ankommen.'),
      frames: () => [
        frame(L('One photon in electronvolts', 'Ein Photon in Elektronvolt'), `<p>${L(`${E} = ${h}·${f} with ${h} = 4.14 · 10<sup>−15</sup> eV·s. Violet light of ${f} = 7.5 · 10<sup>14</sup> Hz: the powers of ten give 10<sup>−1</sup>, so ${E} = 4.14 · 0.75 eV = 3.10 eV. From the wavelength: ${E} = ${h}·${c}/${lam} = 1240 eV·nm / ${lam} = 1240 eV·nm / 400 nm = 3.10 eV.`, `${E} = ${h}·${f} mit ${h} = 4.14 · 10<sup>−15</sup> eV·s. Violettes Licht mit ${f} = 7.5 · 10<sup>14</sup> Hz: Die Zehnerpotenzen ergeben 10<sup>−1</sup>, also ${E} = 4.14 · 0.75 eV = 3.10 eV. Aus der Wellenlänge: ${E} = ${h}·${c}/${lam} = 1240 eV·nm / ${lam} = 1240 eV·nm / 400 nm = 3.10 eV.`)}</p><p class="law">${E} = ${h}·${f} = 1240 eV·nm / ${lam}</p>`, fig(G.bar([{ nm: 400, label: '3.10 eV' }]))),
        frame(L('Shorter wavelength, more energy', 'Kürzere Wellenlänge, mehr Energie'), `<p>${L('Red light of 620 nm: 2.00 eV per photon. UV light of 310 nm, half the wavelength: 4.00 eV, twice the energy. The energy is proportional to the frequency and inversely proportional to the wavelength.', 'Rotes Licht von 620 nm: 2.00 eV pro Photon. UV-Licht von 310 nm, halbe Wellenlänge: 4.00 eV, doppelte Energie. Die Energie ist proportional zur Frequenz und umgekehrt proportional zur Wellenlänge.')}</p>`, fig(G.bar([{ nm: 620, label: '2.00 eV' }, { nm: 310, label: '4.00 eV' }]))),
        frame(L('Brighter is not bluer', 'Heller ist nicht blauer'), `<p>${L('The red light made twice as bright: twice as many photons per second, each still with 2.00 eV. The power of the light is (photons per second) × (energy of one photon): brightness changes the first factor, colour the second. A typical mistake: “brighter light has more energetic photons”.', 'Das rote Licht doppelt so hell gemacht: doppelt so viele Photonen pro Sekunde, jedes immer noch mit 2.00 eV. Die Leistung des Lichts ist (Photonen pro Sekunde) × (Energie eines Photons): Die Helligkeit ändert den ersten Faktor, die Farbe den zweiten. Ein typischer Fehler: „Helleres Licht hat energiereichere Photonen“.')}</p><p class="law">${i('P')} = ${i('N')} · ${E}</p>`, fig(G.bar([{ nm: 620, label: '2.00 eV' }]))),
        frame(L('Two sources compared', 'Zwei Quellen verglichen'), `<p>${L(`A red pointer (650 nm, 5 mW) and a violet one (405 nm, 1 mW). Energy per photon: only the wavelength counts, so violet wins. Photons per second: ${i('N')} = ${i('P')}/${E} is proportional to ${i('P')}·${lam}: red 5 · 650 = 3250, violet 1 · 405 = 405, so the red pointer emits about eight times as many photons.`, `Ein roter Pointer (650 nm, 5 mW) und ein violetter (405 nm, 1 mW). Energie pro Photon: Nur die Wellenlänge zählt, also gewinnt Violett. Photonen pro Sekunde: ${i('N')} = ${i('P')}/${E} ist proportional zu ${i('P')}·${lam}: rot 5 · 650 = 3250, violett 1 · 405 = 405; der rote Pointer sendet also etwa achtmal so viele Photonen aus.`)}</p>`, fig(G.bar([{ nm: 650, label: '5 mW' }, { nm: 405, label: '1 mW' }]))),
      ] },
    { topic: 2, stage: 0, name: () => L('Einstein’s equation as bookkeeping', 'Einsteins Gleichung als Buchhaltung'), idea: () => L('The photon brings h·f; the electron pays the work function φ to get out; the rest is the kinetic energy of the fastest electrons, measured as e·V<sub>s</sub>.', 'Das Photon bringt h·f; das Elektron bezahlt die Austrittsarbeit W, um herauszukommen; der Rest ist die kinetische Energie der schnellsten Elektronen, gemessen als e·U₀.'),
      frames: () => [
        frame(L('The account', 'Die Abrechnung'), `<p>${L(`UV light of 248 nm on zinc (${W} = 4.27 eV). Income: one photon, 1240 eV·nm / 248 nm = 5.00 eV. Cost of getting out: 4.27 eV. Left over: ${Ek} = 5.00 eV − 4.27 eV = 0.73 eV. That is the most an electron can have; electrons from deeper inside lose some on the way out.`, `UV-Licht von 248 nm auf Zink (${W} = 4.27 eV). Einnahme: ein Photon, 1240 eV·nm / 248 nm = 5.00 eV. Kosten für das Austreten: 4.27 eV. Übrig: ${Ek} = 5.00 eV − 4.27 eV = 0.73 eV. Das ist das Höchste, was ein Elektron haben kann; Elektronen aus tieferen Schichten verlieren auf dem Weg nach aussen etwas.`)}</p><p class="law">${h}·${f} = ${W} + ${Ek}</p>`, fig(G.bars(5, 4.27))),
        frame(L('The stopping voltage', 'Die Gegenspannung'), `<p>${L(`A counter-voltage between cathode and anode slows the electrons. At the stopping voltage ${U0} even the fastest just fail to reach the anode: ${i('e')}·${U0} = ${Ek}. An energy in eV is stopped by the same number of volts: 0.73 eV by ${U0} = 0.73 V. Measuring ${U0} measures what is left over.`, `Eine Gegenspannung zwischen Kathode und Anode bremst die Elektronen. Bei der Gegenspannung ${U0} erreichen auch die schnellsten die Anode gerade nicht mehr: ${i('e')}·${U0} = ${Ek}. Eine Energie in eV wird von gleich vielen Volt gestoppt: 0.73 eV von ${U0} = 0.73 V. Wer ${U0} misst, misst, was übrig bleibt.`)}</p>`, fig(G.cell({ nm: 248, counter: true }))),
        frame(L('Backwards: the work function', 'Rückwärts: die Austrittsarbeit'), `<p>${L(`Violet light of 400 nm (3.10 eV) on an unknown cathode; the current stops at ${U0} = 0.82 V. Bookkeeping backwards: ${W} = ${h}·${f} − ${i('e')}·${U0} = 3.10 eV − 0.82 eV = 2.28 eV, the work function of sodium.`, `Violettes Licht von 400 nm (3.10 eV) auf einer unbekannten Kathode; der Strom hört bei ${U0} = 0.82 V auf. Rückwärts abgerechnet: ${W} = ${h}·${f} − ${i('e')}·${U0} = 3.10 eV − 0.82 eV = 2.28 eV, die Austrittsarbeit von Natrium.`)}</p>`, fig(G.bars(3.1, 2.28))),
        frame(L('When the account is short', 'Wenn es nicht reicht'), `<p>${L(`The same violet light on zinc: 3.10 eV < 4.27 eV. No electron gets out, however bright the light and however long it shines: an electron cannot add up the energy of two photons. Only a shorter wavelength helps, below 1240 eV·nm / 4.27 eV ≈ 290 nm.`, `Dasselbe violette Licht auf Zink: 3.10 eV < 4.27 eV. Kein Elektron kommt heraus, wie hell das Licht auch ist und wie lange es scheint: Ein Elektron kann die Energie zweier Photonen nicht zusammenzählen. Nur eine kürzere Wellenlänge hilft, unter 1240 eV·nm / 4.27 eV ≈ 290 nm.`)}</p>`, fig(G.bars(3.1, 4.27))),
        frame(L('Step by step, and the typical mistakes', 'Schritt für Schritt, und die typischen Fehler'), `<p>${L(`1. The energy of one photon in eV. 2. Compare it with ${W}: smaller, and nothing happens. 3. Subtract: ${Ek} = ${h}·${f} − ${W}. 4. The stopping voltage is the same number in volts. Typical mistakes: taking the whole photon energy as kinetic energy (forgetting ${W}), adding ${W} instead of subtracting it, and expecting a larger ${U0} from brighter light.`, `1. Die Energie eines Photons in eV. 2. Mit ${W} vergleichen: kleiner, und es geschieht nichts. 3. Abziehen: ${Ek} = ${h}·${f} − ${W}. 4. Die Gegenspannung ist dieselbe Zahl in Volt. Typische Fehler: die ganze Photonenenergie als kinetische Energie nehmen (${W} vergessen), ${W} addieren statt abziehen, und von hellerem Licht eine grössere Gegenspannung erwarten.`)}</p>`, fig(G.bars(5, 4.27))),
      ] },
    { topic: 3, stage: 0, name: () => L('The characteristic of a photocell', 'Die Kennlinie einer Photozelle'), idea: () => L('The saturation current counts the photons per second; the stopping voltage measures the energy of one photon minus the work function.', 'Der Sättigungsstrom zählt die Photonen pro Sekunde; die Gegenspannung misst die Energie eines Photons minus die Austrittsarbeit.'),
      frames: () => [
        frame(L('Reading the characteristic', 'Die Kennlinie lesen'), `<p>${L(`The current against the voltage between anode and cathode. To the right (positive), the anode collects every released electron: the current levels off at the saturation current, which counts the electrons, and so the photons, per second. To the left, a counter-voltage turns back the slower electrons; at ${V} = −${U0} even the fastest are stopped.`, `Der Strom gegen die Spannung zwischen Anode und Kathode. Rechts (positiv) sammelt die Anode jedes ausgelöste Elektron: Der Strom erreicht den Sättigungsstrom, der die Elektronen und damit die Photonen pro Sekunde zählt. Links schickt eine Gegenspannung die langsameren Elektronen zurück; bei ${V} = −${U0} werden auch die schnellsten gestoppt.`)}</p>`, fig(G.ivGraph([{ U0: 1.2, I: 10, cls: 'new' }], { Imax: 24 }))),
        frame(L('Twice as bright', 'Doppelt so hell'), `<p>${L('Twice as many photons per second release twice as many electrons: the saturation current doubles. Each photon has the same energy, so the stopping voltage stays.', 'Doppelt so viele Photonen pro Sekunde lösen doppelt so viele Elektronen aus: Der Sättigungsstrom verdoppelt sich. Jedes Photon hat dieselbe Energie, also bleibt die Gegenspannung.')}</p>`,
          fig(G.ivGraph([{ U0: 1.2, I: 10, cls: 'old', dash: true }, { U0: 1.2, I: 20, cls: 'new' }], { Imax: 24 })) + legend()),
        frame(L('A higher frequency', 'Eine höhere Frequenz'), `<p>${L(`Light of a higher frequency, with the same number of photons per second: each photon brings more energy, ${W} stays, so more is left over: a larger stopping voltage. The same number of electrons per second: the same saturation current.`, `Licht höherer Frequenz, mit gleich vielen Photonen pro Sekunde: Jedes Photon bringt mehr Energie, ${W} bleibt, also bleibt mehr übrig: eine grössere Gegenspannung. Gleich viele Elektronen pro Sekunde: derselbe Sättigungsstrom.`)}</p>`,
          fig(G.ivGraph([{ U0: 1.2, I: 10, cls: 'old', dash: true }, { U0: 2.0, I: 10, cls: 'new' }], { Imax: 24 })) + legend()),
        frame(L('Another cathode', 'Eine andere Kathode'), `<p>${L(`The same light on a cathode with a larger work function: getting out costs more, so less is left over: a smaller stopping voltage. As long as electrons are released at all, the number per second, and so the saturation current, stays.`, `Dasselbe Licht auf eine Kathode mit grösserer Austrittsarbeit: Das Austreten kostet mehr, also bleibt weniger übrig: eine kleinere Gegenspannung. Solange überhaupt Elektronen ausgelöst werden, bleibt ihre Zahl pro Sekunde und damit der Sättigungsstrom.`)}</p>`,
          fig(G.ivGraph([{ U0: 1.2, I: 10, cls: 'old', dash: true }, { U0: 0.6, I: 10, cls: 'new' }], { Imax: 24 })) + legend()),
        frame(L('Two questions for every change', 'Zwei Fragen bei jeder Änderung'), `<p>${L('How many photons arrive per second? That moves the saturation current. How much energy does each photon bring, and how much does the cathode take? That moves the stopping voltage. Brightness answers only the first question, colour and metal only the second.', 'Wie viele Photonen kommen pro Sekunde an? Das verschiebt den Sättigungsstrom. Wie viel Energie bringt jedes Photon, und wie viel nimmt die Kathode? Das verschiebt die Gegenspannung. Die Helligkeit beantwortet nur die erste Frage, Farbe und Metall nur die zweite.')}</p>`,
          fig(G.ivGraph([{ U0: 1.2, I: 10, cls: 'old', dash: true }, { U0: 1.2, I: 20, cls: 'new' }, { U0: 2.0, I: 10, cls: 'alt' }], { Imax: 24 })) + `<p class="note legend"><span class="k-old">- - -</span> ${L('before', 'vorher')} · <span class="k-new">—</span> ${L('twice as bright', 'doppelt so hell')} · <span class="k-alt">—</span> ${L('higher frequency', 'höhere Frequenz')}</p>`),
      ] },
    { topic: 4, stage: 0, name: () => L('Stopping voltage against frequency', 'Die U₀(f)-Gerade'), idea: () => L('The stopping voltage against the frequency is a straight line: it meets the f-axis at the threshold frequency and the V<sub>s</sub>-axis at −φ/e; its slope h/e is the same for every metal.', 'Die Gegenspannung gegen die Frequenz ist eine Gerade: Sie schneidet die f-Achse bei der Grenzfrequenz und die U₀-Achse bei −W/e; ihre Steigung h/e ist für jedes Metall gleich.'),
      frames: () => {
        const e = X.make('photo-line', 1);
        return [
          frame(L('A straight line', 'Eine Gerade'), `<p>${L(`For light of several frequencies, the stopping voltage is measured. Einstein: ${i('e')}·${U0} = ${h}·${f} − ${W}, so ${U0} = (${h}/${i('e')})·${f} − ${W}/${i('e')}: plotted against ${f}, the stopping voltages lie on a straight line.`, `Für Licht mehrerer Frequenzen wird die Gegenspannung gemessen. Einstein: ${i('e')}·${U0} = ${h}·${f} − ${W}, also ${U0} = (${h}/${i('e')})·${f} − ${W}/${i('e')}: Gegen ${f} aufgetragen, liegen die Gegenspannungen auf einer Geraden.`)}</p><p class="law">${U0} = (${h}/${i('e')})·${f} − ${W}/${i('e')}</p>`, e.figs),
          frame(L('The threshold frequency and the cut-off wavelength', 'Grenzfrequenz und Grenzwellenlänge'), `<p>${L(`Where the line meets the ${f}-axis, ${U0} = 0: the electrons just get out. Here ${fG()} = 6.0 · 10<sup>14</sup> Hz. The longest wavelength that still releases electrons: ${lG()} = ${c}/${fG()} = 3.00 · 10<sup>8</sup> m/s / 6.0 · 10<sup>14</sup> Hz = 500 nm. Green light of 532 nm releases nothing from this cathode.`, `Wo die Gerade die ${f}-Achse schneidet, ist ${U0} = 0: Die Elektronen kommen gerade noch heraus. Hier ist ${fG()} = 6.0 · 10<sup>14</sup> Hz. Die grösste Wellenlänge, die noch Elektronen auslöst: ${lG()} = ${c}/${fG()} = 3.00 · 10<sup>8</sup> m/s / 6.0 · 10<sup>14</sup> Hz = 500 nm. Grünes Licht von 532 nm löst aus dieser Kathode nichts aus.`)}</p>`, e.solFig),
          frame(L('The work function', 'Die Austrittsarbeit'), `<p>${e.solution[2].replace(/^\(c\) ./, (x) => x.slice(4).toUpperCase())}</p><p>${L(`Below ${fG()} the line has no meaning (no electrons, no stopping voltage): the dashed part is only drawn to find the intercept.`, `Unterhalb von ${fG()} hat die Gerade keine Bedeutung (keine Elektronen, keine Gegenspannung): Der gestrichelte Teil ist nur gezeichnet, um den Achsenabschnitt zu finden.`)}</p>`, e.solFig),
          frame(L('The slope is h/e', 'Die Steigung ist h/e'), `<p>${L(`From 7 to 11 · 10<sup>14</sup> Hz the line rises by 1.65 V: 0.414 V per 10<sup>14</sup> Hz, so ${h} = 4.14 · 10<sup>−15</sup> eV·s, Planck’s constant. With another cathode, only ${W} changes: the line moves sideways, parallel. A larger work function means a higher threshold frequency, further to the right. Typical mistakes: taking the slope for ${W}/${i('e')}, or expecting brighter light to change the line.`, `Von 7 bis 11 · 10<sup>14</sup> Hz steigt die Gerade um 1.65 V: 0.414 V pro 10<sup>14</sup> Hz, also ${h} = 4.14 · 10<sup>−15</sup> eV·s, die Planck-Konstante. Mit einer anderen Kathode ändert sich nur ${W}: Die Gerade verschiebt sich parallel. Eine grössere Austrittsarbeit bedeutet eine höhere Grenzfrequenz, weiter rechts. Typische Fehler: die Steigung für ${W}/${i('e')} halten, oder erwarten, dass helleres Licht die Gerade ändert.`)}</p>`, e.solFig),
        ];
      } },
  ];
  const stage = (name, types) => ({ name, types });
  const TOPICS = [
    { name: () => L('Wave or photon?', 'Welle oder Photon?'), stages: [stage(() => L('observations', 'Beobachtungen'), ['model']), stage(() => L('statements', 'Aussagen'), ['photo-stmts'])] },
    { name: () => L('Photon energy', 'Photonenenergie'), stages: [stage(() => L('energy', 'Energie'), ['energy']), stage(() => L('brighter or bluer', 'heller oder blauer'), ['rank'])] },
    { name: () => L('Einstein’s equation', 'Einsteins Gleichung'), stages: [stage(() => L('bookkeeping', 'Buchhaltung'), ['photo-calc'])] },
    { name: () => L('The characteristic', 'Die Kennlinie'), stages: [stage(() => L('characteristic', 'Kennlinie'), ['photo-curve'])] },
    { name: () => L('Stopping voltage against frequency', 'Die U₀(f)-Gerade'), stages: [stage(() => L('reading the line', 'die Gerade lesen'), ['photo-line'])] },
  ];
  const lessons = () => LESSONS.map((l) => ({ name: l.name(), idea: l.idea(), frames: l.frames, also: topics.also(l.topic) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the questions it is asked about, its worked
  // example and its practice topic. A kind is a practice type and the key of one of its questions
  // (photo-calc:ek); the kinds of an objective are taken in turn. One question of an exercise: a
  // number becomes four values (the right one, those of typical mistakes, then multiples), choices
  // and drawings stay.
  const OBJECTIVES = [
    { id: 'wave', kinds: ['model:obs', 'model:why'], tutor: 0, topic: 0,
      name: () => L('Name the observations of the photoelectric effect that the wave model cannot explain: the threshold frequency, and a kinetic energy that does not depend on the brightness.',
        'Die Beobachtungen beim Photoeffekt nennen, die das Wellenmodell nicht erklärt: die Grenzfrequenz, und eine kinetische Energie, die nicht von der Helligkeit abhängt.') },
    { id: 'einstein', kinds: ['photo-calc:ek', 'energy:E', 'photo-calc:U0', 'photo-curve:W', 'photo-calc:out'], tutor: 2, topic: 2,
      name: () => L('Apply E = h·f and the energy balance h·f = φ + E_k,max, with E_k,max measured by the stopping voltage.',
        'E = h·f und die Energiebilanz h·f = W + E_kin,max anwenden, mit E_kin,max gemessen durch die Gegenspannung.') },
    { id: 'threshold', kinds: ['photo-line:fG', 'photo-line:W', 'photo-line:slope', 'photo-line:lG', 'photo-calc:light', 'photo-line:metal'], tutor: 4, topic: 4,
      name: () => L('Determine the threshold frequency, the cut-off wavelength and the work function, for instance from a V_s(f) graph with slope h/e.',
        'Die Grenzfrequenz, die Grenzwellenlänge und die Austrittsarbeit bestimmen, zum Beispiel aus einem U₀(f)-Diagramm mit der Steigung h/e.') },
    { id: 'rate', kinds: ['photo-curve:new', 'energy:k', 'rank:N', 'rank:E'], tutor: 3, topic: 3,
      name: () => L('Tell the photon energy from the number of photons per second when the brightness or the frequency of the light changes, also in the characteristic of a photocell.',
        'Die Photonenenergie von der Zahl der Photonen pro Sekunde unterscheiden, wenn sich die Helligkeit oder die Frequenz des Lichts ändert, auch in der Kennlinie einer Photozelle.') },
  ];
  const CONCEPT = { intensity: 'intensity', inverse: 'inverse', wave: 'wave', noW: 'work', addW: 'work', work: 'work', threshold: 'threshold', slope: 'graph', axis: 'graph' };
  const valueLabel = (v, q) => `${plain(v)}${q.unit ? (/^10/.test(q.unit) ? ` · ${q.unit}` : ` ${q.unit}`) : ''}`;
  function numOptions(q, seed) {
    const out = [{ value: q.value, correct: true }];
    const fits = (x) => Number.isFinite(x) && x > 0 && out.every((o) => Math.abs(Math.log(x / o.value)) > Math.log(1.18)) && !out.some((o) => valueLabel(o.value, q) === valueLabel(x, q));
    for (const w of q.wrong || []) if (out.length < 4 && fits(w.value)) out.push({ value: w.value, flag: w.tag, why: w.why });
    const factors = [[2, 0.5, 1.5, 3, 0.7], [0.5, 2, 0.7, 1.5, 4], [1.5, 0.7, 2, 0.5, 3]][seed % 3];
    for (const k of factors) if (out.length < 4 && fits(q.value * k)) out.push({ value: q.value * k, flag: null, why: null });
    return out.sort((a, b) => a.value - b.value).map((o) => ({ html: valueLabel(o.value, q), correct: !!o.correct, flag: o.flag || null, why: o.why || null }));
  }
  function checkQuestion(kind, seed) {
    const [type, key] = kind.split(':');
    // some questions come only with some exercises (photo-calc asks for E_kin only if electrons get out)
    let e = X.make(type, seed);
    for (let k = 1; !e.questions.some((x) => x.key === key) && k < 200; k++) e = X.make(type, seed + 7919 * k);
    const q = e.questions.find((x) => x.key === key);
    const explain = () => `${e.solFig ? `<div class="figs">${e.solFig}</div>` : ''}<div class="steps">${e.solution.map((s) => `<p>${s}</p>`).join('')}</div>`;
    const ask = `${q.label.replace(/^\([a-e]\) /, '').replace(/^./, (x) => x.toUpperCase())}${q.type === 'num' && q.sym ? ` ${q.sym}` : ''}`;
    const options = q.type === 'num' ? numOptions(q, seed) : q.options.map((o) => ({ html: o.html || o.label, correct: o.ok, flag: o.ok ? null : o.tag || 'other', why: o.why }));
    return { title: e.title, text: e.text, figure: `<div class="figs">${e.figs || ''}</div>`, ask, options, explain, key: `${e.id}|${q.key}` };
  }
  const checkSource = {
    id: 'ph',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: CONCEPT,
    concepts: () => ({
      intensity: L('brightness is the number of photons, not their energy', 'Helligkeit ist die Zahl der Photonen, nicht ihre Energie'), inverse: L('shorter wavelength, more energy per photon', 'kürzere Wellenlänge, mehr Energie pro Photon'),
      wave: L('what the wave model can and cannot explain', 'was das Wellenmodell erklärt und was nicht'), work: L('the work function in Einstein’s equation', 'die Austrittsarbeit in Einsteins Gleichung'),
      threshold: L('the threshold frequency f₀ = φ/h', 'die Grenzfrequenz f_G = W/h'), graph: L('the slope h/e and the intercepts of the V_s(f) line', 'die Steigung h/e und die Achsenabschnitte der U₀(f)-Geraden'),
    }),
  };

  // ---------------------------------------------------------------- reading off a graph
  // A graph from plot.js with data-read carries its axis mapping (user units of the plot area and the
  // values there). Over it, guide lines to both axes and a small label with both coordinates follow
  // the pointer: hover with a mouse; tap and then drag with a finger (the graph then stops scrolling
  // the page until a tap elsewhere); arrow keys once it has the focus (announced in a live region).
  // Everything is drawn inside the svg, so nothing around it moves.
  const SVGNS = 'http://www.w3.org/2000/svg';
  const fmt = (v, p) => { const d = Math.max(0, Math.round(-Math.log10(p))); const t = (Math.round(v / p) * p).toFixed(d); return (/^-0?\.?0*$/.test(t) ? t.slice(1) : t).replace('-', '−'); };
  function axesOf(svg) {
    const [px0, px1, py0, py1] = svg.dataset.read.split(' ').map(Number), [x0, x1, y0, y1] = svg.dataset.val.split(' ').map(Number);
    const d = svg.dataset;
    return { px0, px1, py0, py1, x0, x1, y0, y1, xp: Number(d.xp), yp: Number(d.yp), xn: d.xn, xu: d.xu, yn: d.yn, yu: d.yu };
  }
  const readText = (a, x, y) => [`${a.xn} = ${fmt(x, a.xp)} ${a.xu}`, `${a.yn} = ${fmt(y, a.yp)} ${a.yu}`];
  // A name with a subscript is written V_s: the part after _ (up to a space) is set lower and smaller.
  function rich(tspan, s) {
    tspan.textContent = '';
    s.split(/_(\S+)/).forEach((part, k) => {
      if (!part) return;
      if (k % 2) {
        const sub = document.createElementNS(SVGNS, 'tspan');
        sub.setAttribute('font-size', '75%'); sub.setAttribute('dy', '3'); sub.textContent = part;
        const back = document.createElementNS(SVGNS, 'tspan');
        back.setAttribute('dy', '-3'); back.textContent = '\u200b';
        tspan.append(sub, back);
      } else tspan.append(part);
    });
  }
  // the readout at the user coordinates (ux, uy) of the svg, or none if they lie outside the plot area
  function showRead(svg, ux, uy) {
    const a = axesOf(svg);
    let g = svg.querySelector('g.readout');
    if (ux < a.px0 - 0.5 || ux > a.px1 + 0.5 || uy > a.py0 + 0.5 || uy < a.py1 - 0.5) { if (g) g.remove(); return null; }
    // the values, rounded to the steps, and the point drawn where those rounded values lie
    const x = Math.round((a.x0 + ((ux - a.px0) / (a.px1 - a.px0)) * (a.x1 - a.x0)) / a.xp) * a.xp;
    const y = Math.round((a.y0 + ((uy - a.py0) / (a.py1 - a.py0)) * (a.y1 - a.y0)) / a.yp) * a.yp;
    const X = a.px0 + ((x - a.x0) / (a.x1 - a.x0)) * (a.px1 - a.px0), Y = a.py0 + ((y - a.y0) / (a.y1 - a.y0)) * (a.py1 - a.py0);
    const ax = Math.max(a.x0, Math.min(a.x1, 0)), ay = Math.max(a.y0, Math.min(a.y1, 0));
    const AX = a.px0 + ((ax - a.x0) / (a.x1 - a.x0)) * (a.px1 - a.px0), AY = a.py0 + ((ay - a.y0) / (a.y1 - a.y0)) * (a.py1 - a.py0);
    if (!g) {
      g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'readout');
      g.setAttribute('aria-hidden', 'true');
      g.innerHTML = '<line class="ro-guide"/><line class="ro-guide"/><circle class="ro-pt" r="3.2"/><rect class="ro-box" rx="4"/><text class="ro-text"><tspan/><tspan/></text>';
      svg.appendChild(g);
    }
    const [lv, lh] = g.querySelectorAll('line'), pt = g.querySelector('circle'), box = g.querySelector('rect'), text = g.querySelector('text'), [t1, t2] = text.querySelectorAll('tspan');
    // guide lines from the point to both axes (where the axes cross, x = 0 or y = 0 when shown)
    lv.setAttribute('x1', X); lv.setAttribute('x2', X); lv.setAttribute('y1', Y); lv.setAttribute('y2', AY);
    lh.setAttribute('y1', Y); lh.setAttribute('y2', Y); lh.setAttribute('x1', X); lh.setAttribute('x2', AX);
    pt.setAttribute('cx', X); pt.setAttribute('cy', Y);
    const [s1, s2] = readText(a, x, y);
    rich(t1, s1); rich(t2, s2);
    // the label beside the point, up and to the right, flipped to stay within the drawing
    const W = svg.viewBox.baseVal.width, pad = 5, lineH = 14;
    t1.setAttribute('dy', 0); t2.setAttribute('dy', lineH);
    let bw = 0;
    try { bw = text.getComputedTextLength ? Math.max(t1.getComputedTextLength(), t2.getComputedTextLength()) : 0; } catch (e) { bw = 0; }
    if (!bw) bw = Math.max(s1.length, s2.length) * 6.6;
    const bh = 2 * lineH + 2 * pad - 4;
    let bx = X + 10, by = Y - 10 - bh;
    if (bx + bw + 2 * pad > W - 2) bx = X - 10 - bw - 2 * pad;
    if (by < 2) by = Y + 10;
    bx = Math.max(2, bx);
    box.setAttribute('x', bx); box.setAttribute('y', by); box.setAttribute('width', bw + 2 * pad); box.setAttribute('height', bh);
    t1.setAttribute('x', bx + pad); t2.setAttribute('x', bx + pad); text.setAttribute('y', by + pad + 10);
    g.dataset.ux = X; g.dataset.uy = Y;
    return `${s1}, ${s2}`.replace(/_/g, '');
  }
  function hideRead(svg) { const g = svg && svg.querySelector('g.readout'); if (g) g.remove(); }
  function userPoint(svg, evt) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  let reading = null; // the graph a finger is reading (it does not scroll the page meanwhile)
  function stopReading() { if (reading) { reading.classList.remove('reading'); hideRead(reading); reading = null; } }
  function wireReadout() {
    const live = document.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.id = 'readout-live';
    live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:-1px;padding:0;border:0';
    document.body.appendChild(live);
    // the graph under the pointer; a drawing to choose (a label or button around it, whose input may
    // lie on top of the drawing) counts as well
    const graphOf = (evt) => {
      const el = evt.target && evt.target.closest ? evt.target : null;
      if (!el) return null;
      const svg = el.closest('svg[data-read]');
      if (svg) return svg;
      const box = el.closest('label, button');
      return box ? box.querySelector('svg[data-read]') : null;
    };
    document.addEventListener('pointermove', (evt) => {
      const svg = graphOf(evt);
      if (evt.pointerType === 'mouse' || evt.pointerType === 'pen') {
        document.querySelectorAll('svg[data-read] g.readout').forEach((g) => { if (g.ownerSVGElement !== svg && g.ownerSVGElement !== document.activeElement) g.remove(); });
        if (svg) { const p = userPoint(svg, evt); if (p) showRead(svg, ...p); }
      } else if (reading) {
        const p = userPoint(reading, evt);
        if (p) showRead(reading, ...p);
      }
    }, { passive: true });
    document.addEventListener('pointerdown', (evt) => {
      if (evt.pointerType === 'mouse') return;
      const svg = graphOf(evt);
      if (!svg) { stopReading(); return; }
      if (reading !== svg) stopReading();
      reading = svg;
      svg.classList.add('reading');
      const p = userPoint(svg, evt);
      if (p && !showRead(svg, ...p)) stopReading();
    });
    document.addEventListener('pointerout', (evt) => {
      if (evt.pointerType !== 'mouse') return;
      const svg = graphOf(evt);
      if (svg && !svg.contains(evt.relatedTarget) && graphOf({ target: evt.relatedTarget }) !== svg && svg !== document.activeElement) hideRead(svg);
    });
    // arrow keys move the point by about a hundredth of the axis (shift: ten times as far); Escape hides it
    document.addEventListener('keydown', (evt) => {
      const svg = evt.target && evt.target.matches && evt.target.matches('svg[data-read]') ? evt.target : null;
      if (!svg) return;
      if (evt.key === 'Escape') { hideRead(svg); return; }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[evt.key];
      if (!d) return;
      evt.preventDefault();
      evt.stopPropagation();
      const a = axesOf(svg), g = svg.querySelector('g.readout');
      const k = evt.shiftKey ? 10 : 1;
      const stepOf = (range, p) => Math.max(1, Math.round(range / 100 / p)) * p;
      const dx = ((a.px1 - a.px0) / (a.x1 - a.x0)) * stepOf(a.x1 - a.x0, a.xp) * k, dy = ((a.py0 - a.py1) / (a.y1 - a.y0)) * stepOf(a.y1 - a.y0, a.yp) * k;
      let ux = g ? Number(g.dataset.ux) : (a.px0 + a.px1) / 2, uy = g ? Number(g.dataset.uy) : (a.py0 + a.py1) / 2;
      if (g) { ux += d[0] * dx; uy += d[1] * dy; }
      ux = Math.max(a.px0, Math.min(a.px1, ux)); uy = Math.max(a.py1, Math.min(a.py0, uy));
      const said = showRead(svg, ux, uy);
      if (said) live.textContent = said;
    });
    document.addEventListener('focusout', (evt) => { if (evt.target && evt.target.matches && evt.target.matches('svg[data-read]')) hideRead(evt.target); });
  }

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
      typedIn.forEach(([k, v]) => { const x = $(`#in-${k}`); if (x) x.value = v; });
      chosen.forEach(([n, v]) => { const x = document.querySelector(`input[name="${n}"][value="${v}"]`); if (x) x.checked = true; });
      if (st.revealed) markRight(); else if (st.checked) feedback();
      unlocked = false;
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
  // Practice: random exercises; tutor: worked examples; check: a short test on the learning
  // objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('ph-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; markScrollable(); } else fresh();
  }
  function checkMode() { setMode('check'); checker.show(); if (location.hash !== '#check') history.replaceState(null, '', '#check'); }
  function fromHash() {
    const hsh = location.hash.slice(1);
    // #arcade: the old arcade, now the check
    if (hsh === 'check' || hsh === 'arcade') { if ($('#ck').hidden) checkMode(); return true; }
    const m = hsh.match(/^tutor-(\d+)$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= LESSONS.length) {
      setMode('tutor');
      if (tutor.current() !== Number(m[1]) - 1 || !tutor.shown()) tutor.open(Number(m[1]) - 1);
      return true;
    }
    const te = topics.parse(hsh);
    if (te) { setMode('practice'); if (!ex || ex.id !== hsh) open(te); return true; }
    const d = hsh.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)$/);
    if (d && X.TYPES.includes(d[1])) { setMode('practice'); if (!ex || ex.id !== hsh) open(X.make(d[1], Number(d[2]))); return true; }
    return false;
  }

  function init() {
    Lang.init();
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    topics = window.Topics.create({
      app: PRACTICE,
      topics: TOPICS.map((t) => ({ name: t.name, stages: t.stages })),
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
    wireReadout();
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
    // a mode stored by an older version: the arcade is now the check, the problems are practice
    const last = stored('ph-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (typeof document !== 'undefined' && typeof window.Lang !== 'undefined' && typeof window.Check !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  window.PhotonApp = { parse, judge: (x, q) => judge(x, q), checkQuestion, OBJECTIVES, CONCEPT, concepts: checkSource.concepts, LESSONS, TOPICS };
})();
