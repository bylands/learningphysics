(function () {
  'use strict';

  const W = window.Waves, P = window.WavePlot, Lang = window.Lang, Check = window.Check, L = Lang.L;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Wave Propagation', mode: 'Mode', example: 'Example', tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise', difficulty: 'Difficulty',
      check: 'Check', reveal: 'Show solution', hints: 'Hints', solution: 'Solution', clear: 'Clear drawing',
      revealNote: 'The worked solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      stars: (d) => `Difficulty: ${d} of 5`, score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      fill: 'Answer every question, then check again.', ok: 'All correct.', okWell: 'All correct, well done! Compare your approach with the worked solution, or start a new exercise.',
      notYet: (n) => `Not quite yet (attempt ${n}).`, tryAgain: ' Try again, or take a hint.', canReveal: ' You can take a hint or look at the worked solution.',
      correct: 'Correct', notThis: 'Not this one: check your reasoning, or take a hint.', stmtsWrong: (n) => (n === 1 ? 'One statement is judged wrong.' : `${n} statements are judged wrong.`), option: (k) => `Option ${k}`, drawWrong: (n) => `${n} grid ${n === 1 ? 'line is' : 'lines are'} not right yet (marked).`,
      tutorNote: 'Use the arrow keys ← → to step through. ▶ plays an animation; the slider moves through time.',
      drawHow: 'Drag each point up or down to the height of the rope (or use the keys ← → and ↑ ↓). Point at the diagram above to read off its displacement there.',
      animNoteDraw: 'The animation shows how the rope got there and stops at the state given. With ▶ or the slider you can move the crests on yourself (two crests running towards each other one by one). The time is not shown, and only the crests themselves are drawn, not the rope they make together: that appears once you have solved the exercise. The faded line is the rope in the state given.',
      given: 'Given', animLead: 'The animation shows how the rope got there; ▶ plays it again.', animNote: 'The animation shows how the rope got there and stops at the state given. With ▶ or the slider you can move the crests on yourself (two crests running towards each other one by one). The time is not shown, and only the crests themselves are drawn (an incoming crest also behind the end, in the shaded part), not the rope they make together: that appears once you have solved the exercise. The faded line is the rope in the state given.',
    },
    de: {
      title: 'Wellenausbreitung', mode: 'Modus', example: 'Beispiel', tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe', difficulty: 'Schwierigkeit',
      check: 'Prüfen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung', clear: 'Zeichnung löschen',
      revealNote: 'Die ausführliche Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      stars: (d) => `Schwierigkeit: ${d} von 5`, score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      fill: 'Beantworte jede Frage und prüfe dann nochmals.', ok: 'Alles richtig.', okWell: 'Alles richtig, gut gemacht! Vergleiche deinen Lösungsweg mit der ausführlichen Lösung oder starte eine neue Aufgabe.',
      notYet: (n) => `Noch nicht ganz (Versuch ${n}).`, tryAgain: ' Versuche es nochmals, oder nimm einen Tipp.', canReveal: ' Du kannst einen Tipp nehmen oder die ausführliche Lösung anschauen.',
      correct: 'Richtig', notThis: 'Das stimmt nicht: Überprüfe deine Überlegung, oder nimm einen Hinweis.', stmtsWrong: (n) => (n === 1 ? 'Eine Aussage ist falsch beurteilt.' : `${n} Aussagen sind falsch beurteilt.`), option: (k) => `Antwort ${k}`, drawWrong: (n) => `${n} ${n === 1 ? 'Gitterlinie stimmt' : 'Gitterlinien stimmen'} noch nicht (markiert).`,
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. ▶ spielt eine Animation ab; mit dem Schieber bewegst du dich durch die Zeit.',
      drawHow: 'Zieh jeden Punkt nach oben oder unten auf die Höhe des Seils (oder mit den Tasten ← → und ↑ ↓). Zeig auf das Diagramm oben, um dort seine Auslenkung abzulesen.',
      animNoteDraw: 'Die Animation zeigt, wie das Seil dorthin kam, und hält beim gegebenen Zustand an. Mit ▶ oder dem Schieber kannst du die Buckel selbst weiterbewegen (zwei aufeinander zulaufende Buckel einzeln). Die Zeit wird nicht angezeigt, und es werden nur die Buckel selbst gezeichnet, nicht das Seil, das sie zusammen ergeben: Das erscheint, sobald du die Aufgabe gelöst hast. Die blasse Linie ist das Seil im gegebenen Zustand.',
      given: 'Gegeben', animLead: 'Die Animation zeigt, wie das Seil dorthin kam; ▶ spielt sie nochmals ab.', animNote: 'Die Animation zeigt, wie das Seil dorthin kam, und hält beim gegebenen Zustand an. Mit ▶ oder dem Schieber kannst du die Buckel selbst weiterbewegen (zwei aufeinander zulaufende Buckel einzeln). Die Zeit wird nicht angezeigt, und es werden nur die Buckel selbst gezeichnet (ein einlaufender Buckel auch hinter dem Ende, im schattierten Teil), nicht das Seil, das sie zusammen ergeben: Das erscheint, sobald du die Aufgabe gelöst hast. Die blasse Linie ist das Seil im gegebenen Zustand.',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, st = null, tutor = null, checker = null, topics = null;
  function stored(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  function showScore() { const s = stored('wav-score', { solved: 0, clean: 0 }); $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : ''; }
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;
  const TITLE = {
    move: () => L('A crest travels', 'Ein Buckel läuft'), yt: () => L('The y(t) graph', 'Das y(t)-Bild'), ty: () => L('From y(t) to the rope', 'Vom y(t)-Bild zum Seil'),
    medium: () => L('How the rope moves', 'Wie sich das Seil bewegt'), speed: () => L('Speed and timing', 'Geschwindigkeit und Zeit'), sup: () => L('Two crests meet', 'Zwei Buckel begegnen sich'),
    refl: () => L('Reflection', 'Reflexion'), reflsum: () => L('Reflection with overlap', 'Reflexion mit Überlagerung'), mirror: () => L('The mirror crest', 'Der Spiegelbuckel'),
    end: () => L('The end itself', 'Das Ende selbst'), reflyt: () => L('y(t) near the end', 'y(t) nahe beim Ende'), draw: () => L('Draw the rope', 'Zeichne das Seil'),
    stand: () => L('Standing waves', 'Stehende Wellen'), error: () => L('Find the error', 'Finde den Fehler'),
  };

  // ---------------------------------------------------------------- animations
  // A slot in some HTML that becomes an animation once the HTML is on the page (mountAnims).
  const anims = new Map();
  let animId = 0, running = [];
  const animSlot = (a) => { const id = `a${++animId}`; anims.set(id, a); return `<div class="anim-slot" data-anim="${id}"></div>`; };
  function mountAnims(el) {
    el.querySelectorAll('.anim-slot[data-anim]').forEach((slot) => {
      const a = anims.get(slot.dataset.anim);
      if (!a) return;
      slot.removeAttribute('data-anim');
      running.push(P.Anim.mount(slot, a));
    });
  }
  const stopAnims = () => { running.forEach((r) => r.stop()); running = []; };
  const redrawAnims = () => running.forEach((r) => r.redraw && r.redraw());

  // ---------------------------------------------------------------- figures
  const many = (f) => [].concat(f || []);
  const graphs = (specs, o) => many(specs).map((s) => `<div class="fig">${P.graph(s, o)}</div>`).join('');
  // the given situation: the animation of the lead-in, stopping at the state given, or the diagrams.
  // Its slider goes on until the crests have left the rope, well past the time asked about: the
  // student can move the crests on, but is not told the time, and has to find the right position.
  // Two crests running towards each other get a slider each. Once moved, only the crests are drawn
  // (and the given state faded), not the rope, their sum: that is for the student to work out; at
  // an end only the incoming crest, also behind the end. Once the exercise is solved (or the
  // solution shown), the rope is drawn too, with the mirror crest behind an end. Not where the
  // question is how the rope moves at the given moment (moving the crests would show it).
  function given(e) {
    if (e.anim) {
      const f = many(e.fig)[0], base = { ...e.anim, arrows: true, Y: f.Y, mark: e.anim.mark != null ? e.anim.mark : f.marks && f.marks[0] ? f.marks[0].x : null, dots: e.anim.dots };
      if (e.kind === 'medium') return `<div class="fig">${animSlot(base)}</div>`;
      const sc = e.anim.sc, split = !sc.end && sc.pulses.length === 2 && sc.pulses[0].dir !== sc.pulses[1].dir;
      const t1 = Math.min(15, Math.max(gone(sc, f.hi), (e.t || 0) + 2, e.anim.t1 + 2));
      const end = !!sc.end, several = split || sc.pulses.length > 1, draw = e.kind === 'draw';
      // to draw: the same scales as the drawing below (no region behind the end, the same height),
      // and a guide with the displacement where the student points (readout)
      return `<div class="fig">${animSlot({
        ...base, t1, hold: e.anim.t1, ref: e.anim.t1, noTime: true, split, show: e.anim.show,
        explore: end ? ['in'] : several ? ['parts'] : null, exploreSolved: end || several ? ['parts', 'sum'] : null, solved: () => !!st && (st.solved || st.revealed),
        virtual: draw ? false : end || base.virtual, Y: draw ? e.draw.Y : split ? Math.max(base.Y || 6, 11) : base.Y, // moved one by one, any parts may overlap
        readout: draw ? readout : null,
      })}</div>`;
    }
    return graphs(e.fig);
  }
  // when every crest has left the rope shown (0 … hi): a crest towards an end comes back first
  function gone(sc, hi) {
    return Math.max(...sc.pulses.map((p) => (sc.end && p.dir > 0 ? (2 * sc.end.x - p.x0) / p.v : p.dir > 0 ? (hi - p.x0) / p.v : (p.x0 + p.sh.w) / p.v)));
  }
  // the solution's animation: it stops at the time the exercise asks about, and goes on beyond it
  // (with the given state faded as a reference, where the exercise gave the rope at its start)
  function solAnimOf(e) {
    const a = { ...e.solAnim, ...(e.anim && e.anim.t1 === e.solAnim.t0 ? { ref: e.solAnim.t0 } : {}) };
    if (e.t == null || a.trace != null || e.t <= a.t0 || e.t > a.t1 + 1e-9) return a;
    return { ...a, hold: e.t, t1: Math.max(a.t1, e.t + 1.5) };
  }

  // ---------------------------------------------------------------- questions
  function questionHtml(q) {
    if (q.type === 'pick') {
      return `<div class="cands" role="radiogroup">${q.options.map((o, k) => `<label class="cand" data-k="${k}"><input type="radio" name="q-${q.key}" value="${k}"><span class="letter">${k + 1}</span>${P.graph(o.fig, { small: true, label: ui().option(k + 1) })}</label>`).join('')}</div><p class="qfb" data-fb="${q.key}"></p>`;
    }
    return `<div class="field" data-key="${q.key}"><span class="what">${q.label}</span><div class="opts" role="radiogroup">${q.options.map((o, k) => `<label><input type="radio" name="q-${q.key}" value="${k}"><span>${o.label}</span></label>`).join('')}</div><span class="fb" aria-live="polite"></span></div>`;
  }
  // Marks every answer; true if all are right, null if one is missing.
  function feedback() {
    if (ex.kind === 'draw') return drawFeedback();
    let all = true, missing = false;
    const done = st && (st.solved || st.revealed);
    // While the exercise is open, a wrong answer gets a nudge, not the solution: the steps of the
    // solution, whole or sentence by sentence, are taken out of its explanation; an option with a
    // nudge (where its reason would give the answer away) shows that instead.
    const nudge = (o) => {
      if (done) return o.why;
      let t = o.nudge || o.why || '';
      for (const s of ex.solution) if (s) t = t.split(s).join('');
      for (const s of ex.solution) for (const x of String(s || '').split(/(?<=[.!?])\s+/)) if (x.length > 3) t = t.split(x).join('');
      t = t.replace(/\s+/g, ' ').trim();
      return t || ui().notThis;
    };
    for (const q of ex.questions) {
      const sel = document.querySelector(`input[name="q-${q.key}"]:checked`);
      if (!sel) { all = false; missing = true; continue; }
      const o = q.options[Number(sel.value)];
      if (q.type === 'pick') {
        document.querySelectorAll(`.cand`).forEach((el) => { if (el.querySelector(`input[name="q-${q.key}"]`)) el.classList.remove('ok', 'bad'); });
        sel.closest('.cand').classList.add(o.ok ? 'ok' : 'bad');
        $(`[data-fb="${q.key}"]`).innerHTML = o.ok ? '' : nudge(o);
      } else {
        const row = $(`.field[data-key="${q.key}"]`);
        row.className = `field ${o.ok ? 'ok' : 'bad'}`;
        row.querySelector('.fb').innerHTML = o.ok ? ui().correct : nudge(o);
      }
      if (!o.ok) all = false;
    }
    return all ? true : missing && !document.querySelector('.field.bad, .cand.bad, .stmts-fb:not(:empty)') ? null : false;
  }

  // ---------------------------------------------------------------- drawing
  // A point at each grid line (ex.xs), dragged up and down to a height (whole cm; a press sets it
  // too), or moved with the keys (← → another point, ↑ ↓ its height): the shared sketcher
  // (sketch.js), its columns. Check marks the lines still wrong. The given diagram above has the
  // same scales (both from x = 0 to ex.draw.hi, both as high as ex.draw.Y, the same size), so their
  // grid lines line up; pointing at either shows a guide through both at the nearest grid line,
  // with the displacement read off the diagram above.
  const drawSpec = () => ({ ...W.snap(() => 0, { hi: ex.draw.hi, Y: ex.draw.Y, end: ex.draw.end, label: ex.draw.label }), curves: [] });
  const fmtY = (v) => W.num(Math.round(v * 10) / 10 || 0).replace('-', '−');
  // the readout of the given diagram: the rope, or each crest shown, at x
  function readout(x, vals) {
    const out = [{ text: `x = ${W.num(x)} m: `, cls: 'plain' }];
    vals.forEach((v, k) => out.push({ text: `${k ? ' · ' : ''}${v.cls === 'main' ? 'y = ' : ''}${fmtY(v.y)} cm`, cls: v.cls }));
    return out;
  }
  let gi = null, sk = null, givenAnim = null; // the grid line of the guide, the sketcher, the given diagram
  const locked = () => st.solved || st.revealed;
  const drawOpts = () => ({ values: st.values, xs: ex.xs, wrong: st.wrong, guide: gi == null ? null : { x: ex.xs[gi], parts: [{ text: `y = ${fmtY(st.values[gi])} cm`, cls: 'drawn' }], low: true } });
  function drawEditor() {
    const spec = drawSpec(), s = P.scales(spec), Y = Math.floor(ex.draw.Y);
    $('#draw-area').innerHTML = `<p class="note draw-how">${ui().drawHow}</p><div class="fig"><svg class="wave drawing" viewBox="0 0 ${s.W} ${s.H}" aria-label="${L('Your drawing of the rope', 'Deine Zeichnung des Seils')}"></svg></div><button type="button" id="draw-clear" class="linklike">${ui().clear}</button>`;
    sk = Sketch.create($('#draw-area svg.drawing'), {
      model: 'columns', xs: ex.xs, x: s.x, y: s.y, lo: -Y, hi: Y, step: 1,
      area: { x0: s.ML - 14, x1: s.ML + s.PW + 14, y0: s.MT - 14, y1: s.MT + s.PH + 14 },
      init: ex.xs.map(() => 0), state: st.values, locked, selected: `c${st.focus || 0}`,
      plot: () => P.body(spec, drawOpts()),
      // the point at the guide large, the points moved from 0 a little larger
      radius: (h) => (h.i === gi ? 7 : h.v ? 5.5 : 4.5),
      classes: (h) => `${h.v ? 'set' : ''}${h.i === gi ? ' active' : ''}`,
      describe: (h) => ({ label: `x = ${W.num(h.t)} m`, text: `${String(h.v).replace('-', '−')} cm` }),
      onEdit(k, h) {
        st.values = k.state();
        if (st.wrong) {
          st.wrong = h ? st.wrong.filter((i) => i !== h.i) : [];
          if (!st.wrong.length) st.wrong = null;
        }
        // the answer read again as the student changes it: the readout follows
        if (givenAnim && h && gi === h.i) givenAnim.guide(ex.xs[h.i]);
      },
      onSelect(h) {
        if (h) { st.focus = h.i; setGuide(h.i); } else if (!sk.dragging()) setGuide(null);
      },
      hover(pt, evt, hit) {
        if (!pt) { leave(); return; }
        if (evt.pointerType === 'touch') return;
        setGuide(hit ? hit.h.i : sk.focused() ? st.focus : null);
      },
    });
  }
  // the guide at grid line i (null: none), in both diagrams
  function setGuide(i) {
    if (i === gi) return;
    gi = i;
    if (givenAnim) givenAnim.guide(i == null ? null : ex.xs[i]);
    if (sk) sk.render();
  }
  const svgPoint = (svg, evt) => { const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const nearest = (x) => ex.xs.reduce((b, v, k) => (Math.abs(v - x) < Math.abs(ex.xs[b] - x) ? k : b), 0);
  // the grid line a pointer is at, over a diagram (svg) of the same scales as the drawing, or null
  function lineAt(svg, evt) {
    const q = svgPoint(svg, evt), v = P.valueAt(drawSpec(), q.x, q.y);
    return v.inside ? { i: nearest(v.x), y: v.y } : null;
  }
  const leave = () => { if (!sk || (!sk.dragging() && !sk.focused())) setGuide(null); };
  function wireDrawing() {
    // the given diagram above: pointing at it (or touching it) shows the guide and the displacement
    const fig = $('#figure');
    const over = (evt) => {
      if (!ex || ex.kind !== 'draw') return;
      const svg = evt.target.closest && evt.target.closest('.frames svg.wave');
      const at = svg ? lineAt(svg, evt) : null;
      setGuide(at ? at.i : sk && sk.focused() ? st.focus : null);
    };
    fig.addEventListener('pointermove', over);
    fig.addEventListener('pointerdown', over);
    fig.addEventListener('pointerleave', (evt) => { if (evt.pointerType !== 'touch') leave(); });
  }
  function drawFeedback() {
    const wrong = ex.xs.map((x, i) => i).filter((i) => st.values[i] !== ex.target[i]);
    st.wrong = wrong.length ? wrong : null;
    drawEditor();
    $('#draw-fb').textContent = wrong.length ? ui().drawWrong(wrong.length) : '';
    return wrong.length === 0;
  }

  // ---------------------------------------------------------------- exercises
  const PRACTICE = 'wav', typeOf = (e) => e.type;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };
  function open(exercise) {
    finish();
    ex = exercise;
    st = { tries: 0, hints: 0, solved: false, revealed: false, checked: false, status: null, values: ex.xs ? ex.xs.map(() => 0) : null, wrong: null, focus: 0 };
    if (location.hash !== `#${ex.id}`) history.replaceState(null, '', `#${ex.id}`);
    render();
    topics.shown(ex);
  }
  const fresh = () => open(topics.next(ex));
  const again = (e) => topics.parse(e.id);

  function render() {
    stopAnims();
    $('#title').innerHTML = `${TITLE[ex.kind]()} ${starsOf(ex.difficulty)}`;
    $('#prompt').innerHTML = `<p>${ex.text}</p>`;
    $('#figure').innerHTML = ex.fig ? given(ex) : '';
    $('#anim-note').hidden = !ex.anim;
    $('#anim-note').textContent = ex.kind === 'medium' ? ui().animLead : ex.kind === 'draw' ? ui().animNoteDraw : ui().animNote;
    gi = null; sk = null;
    mountAnims($('#figure'));
    givenAnim = ex.kind === 'draw' ? running.find((r) => $('#figure').contains(r.el)) || null : null;
    $('#figure').classList.toggle('to-draw', ex.kind === 'draw');
    $('#draw-area').hidden = ex.kind !== 'draw';
    $('#draw-fb').textContent = '';
    if (ex.kind === 'draw') drawEditor();
    $('#fields').innerHTML = ex.questions.map(questionHtml).join('');
    $('#hint-list').innerHTML = '';
    $('#hints').hidden = true;
    $('#solution').hidden = true;
    showStatus(null);
    updateButtons();
  }

  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.tries >= MAX_TRIES || st.hints >= ex.hints.length;
  function updateButtons() {
    const left = ex.hints.length - st.hints;
    $('#hint').disabled = left === 0 || st.revealed;
    $('#hint').textContent = left ? ui().hint(left) : ui().noHints;
    $('#reveal').disabled = !canReveal() || st.revealed;
    $('#reveal').title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
    $('#check').textContent = st.solved ? ui().new : ui().check;
    $('#check').classList.toggle('primary', !st.solved);
    $('#check').classList.toggle('new-btn', st.solved);
  }
  function showStatus(kind) {
    const el = $('#status');
    if (st) st.status = kind;
    el.className = 'status' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : '');
    el.textContent = !kind ? '' : kind === 'fill' ? ui().fill
      : kind === 'ok' ? (st.revealed ? ui().ok : ui().okWell) + (st.advance ? ` ${st.advance}` : '')
        : ui().notYet(st.tries) + (!canReveal() ? ui().tryAgain : ui().canReveal);
  }
  function check(evt) {
    evt.preventDefault();
    if (st.solved) { fresh(); return; } // the button reads New exercise
    const r = feedback();
    st.checked = true;
    if (r === null) { showStatus('fill'); return; }
    st.tries++;
    if (r) solved(); else showStatus('bad');
    updateButtons();
  }
  function solved() {
    if (!st.revealed) {
      const s = stored('wav-score', { solved: 0, clean: 0 });
      s.solved++;
      if (st.tries === 1 && st.hints === 0) s.clean++;
      store('wav-score', s);
      showScore();
    }
    st.solved = true;
    Practice.markSolved(PRACTICE, ex.id);
    finish();
    st.advance = topics.solved(st, ex);
    redrawAnims();
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
    $('#sol-figure').innerHTML = (ex.solFig ? graphs(ex.solFig) : '') + (ex.solAnim ? `<div class="fig">${animSlot({ ...solAnimOf(ex), arrows: true })}</div>` : '');
    $('#sol-steps').innerHTML = ex.solution.map((s) => `<p>${s}</p>`).join('');
    $('#solution').hidden = false;
    mountAnims($('#solution'));
  }
  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    finish();
    if (ex.kind === 'draw') { st.values = [...ex.target]; st.wrong = null; drawEditor(); }
    redrawAnims();
    showSolution();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- tutor
  // A smooth, lopsided crest (W.BUMP: rising gently from x = 1 m to its top at 2.5 m, falling
  // steeply to its front at 3 m) at 2 m/s: how it travels (without turning round) and its y(t)
  // graph at x = 4 m (front first: the picture reversed). Then the worksheet's crest (a block 5 cm
  // high, then a slope down to −5 cm, from x = 1 m to 3 m) at 2 m/s: two crests meeting, the
  // reflection at a fixed and a free end at x = 5 m, and the overlap at t = 1.5 s.
  const BUMP = () => W.pulse(W.BUMP, 1, 1, 2);
  const WS = () => W.pulse(W.LIN.ws, 1, 1, 2);
  const frame = (title, text, figure) => ({ text: `<div class="step-rule">${title}</div>${text}`, figure: `<div class="figs">${figure}</div>` });
  const fig = (html) => `<div class="fig">${html}</div>`;
  const anim = (a) => fig(animSlot({ arrows: true, ...a }));
  const EXAMPLES = [
    {
      topic: 0, name: () => L('A crest travels', 'Ein Buckel läuft'),
      idea: () => L('A crest moves along the rope without changing its shape; the rope itself only moves up and down.', 'Ein Buckel bewegt sich über das Seil, ohne seine Form zu ändern; das Seil selbst bewegt sich nur auf und ab.'),
      frames: () => {
        const p = BUMP(), sc = { pulses: [p], end: null };
        return [
          frame(L('The crest', 'Der Buckel'), `<p>${L('A smooth crest, but lopsided: from its back at x = 1 m it rises gently to its top, 5 cm high, at x = 2.5 m, then falls steeply to its front at x = 3 m. It runs to the right at 2 m/s.', 'Ein runder Buckel, aber schief: Von seinem Rücken bei x = 1 m steigt er sanft bis zu seiner Spitze, 5 cm hoch, bei x = 2.5 m an, dann fällt er steil zu seiner Front bei x = 3 m ab. Er läuft mit 2 m/s nach rechts.')}</p>`, anim({ sc, t0: 0, t1: 2.5, show: ['sum'] })),
          frame(L('Distance = speed × time', 'Strecke = Geschwindigkeit × Zeit'), `<p>${W.RULE.move()} ${L('After 0.5 s it is 1 m further, after 1 s 2 m further. The steep side stays in front: the crest does not turn round, it keeps its shape.', 'Nach 0.5 s ist er 1 m weiter, nach 1 s 2 m weiter. Die steile Seite bleibt vorne: Der Buckel dreht sich nicht um, er behält seine Form.')}</p>`,
            fig(P.graph(W.snap((x) => W.ev(p, x, 0), { label: W.tLabel(0), more: [{ f: (x) => W.ev(p, x, 0.5), cls: 'part' }, { f: (x) => W.ev(p, x, 1), cls: 'part2' }] }))) + `<p class="legend"><span class="k-main">t = 0</span> · <span class="k-part">t = 0.5 s</span> · <span class="k-part2">t = 1 s</span></p>`),
          frame(L('The rope moves up and down', 'Das Seil bewegt sich auf und ab'), `<p>${W.RULE.medium()}</p><p>${L('Watch the three points: each only moves up and down while the crest passes, first quickly up (the steep front reaches it first), then slowly down (the gentle back).', 'Beobachte die drei Punkte: Jeder bewegt sich nur auf und ab, während der Buckel vorbeiläuft, zuerst schnell nach oben (die steile Front erreicht ihn zuerst), dann langsam nach unten (der sanfte Rücken).')}</p>`,
            anim({ sc, t0: 0, t1: 2.5, show: ['sum'], dots: [{ x: 3.5, label: 'P' }, { x: 4.5, label: 'Q' }, { x: 5.5, label: 'R' }] })),
        ];
      },
    },
    {
      topic: 1, name: () => L('The y(t) graph', 'Das y(t)-Bild'),
      idea: () => L('At one place, the rope rises and falls as the crest passes: front first, so the y(t) graph is the crest’s picture reversed.', 'An einem Ort hebt und senkt sich das Seil, während der Buckel vorbeiläuft: die Front zuerst, das y(t)-Bild ist also das Bild des Buckels seitenverkehrt.'),
      frames: () => {
        const p = BUMP(), sc = { pulses: [p], end: null };
        const rope = () => P.graph(W.snap((x) => W.ev(p, x, 0), { label: W.tLabel(0), marks: [{ x: 4, label: '4 m' }], arrows: [W.arrowOf(p, 0, { up: true })] }));
        const ytg = () => P.graph(W.graphT((t) => W.ev(p, 4, t), 3, { label: 'x = 4 m' }));
        return [
          frame(L('Watching one place', 'Einen Ort beobachten'), `<p>${L('How does the rope at x = 4 m move as the crest passes? Watch its y(t) graph grow alongside.', 'Wie bewegt sich das Seil bei x = 4 m, während der Buckel vorbeiläuft? Sieh zu, wie sein y(t)-Bild daneben entsteht.')}</p>`, anim({ sc, t0: 0, t1: 2, show: ['sum'], mark: 4, trace: 4 })),
          frame(L('The front comes first', 'Die Front kommt zuerst'), `<p>${W.RULE.yt()}</p><p>${L('The steep front (at x = 3 m) reaches 4 m after 0.5 s: the rope there shoots up, to the top at 0.75 s (the top was at 2.5 m, 1.5 m away). Then the gentle back passes: the rope sinks slowly, until the back (at x = 1 m) has passed, after 1.5 s. The crest is 2 m long and runs at 2 m/s: it takes 1 s to pass.', 'Die steile Front (bei x = 3 m) erreicht 4 m nach 0.5 s: Das Seil schnellt dort hoch, bis zur Spitze bei 0.75 s (die Spitze war bei 2.5 m, 1.5 m entfernt). Dann läuft der sanfte Rücken vorbei: Das Seil sinkt langsam, bis der Rücken (bei x = 1 m) nach 1.5 s vorbei ist. Der Buckel ist 2 m lang und läuft mit 2 m/s: Er braucht 1 s zum Vorbeilaufen.')}</p>`,
            fig(ytg())),
          frame(L('A mirror image', 'Ein Spiegelbild'), `<p>${L('Compare the two: on the rope, y(x) at t = 0, the steep side is on the right, in front. In the y(t) graph at x = 4 m it is on the left, at the start: what is in front on the rope happens first at the place. So the y(t) graph is the crest’s picture reversed, as in a mirror: steep at the start, gentle at the end.', 'Vergleiche die beiden: Auf dem Seil, y(x) bei t = 0, ist die steile Seite rechts, vorne. Im y(t)-Bild bei x = 4 m ist sie links, am Anfang: Was auf dem Seil vorne ist, geschieht am Ort zuerst. Das y(t)-Bild ist also das Bild des Buckels seitenverkehrt, wie in einem Spiegel: steil am Anfang, sanft am Ende.')}</p>`,
            fig(rope()) + fig(ytg())),
        ];
      },
    },
    {
      topic: 4, name: () => L('Two crests meet', 'Zwei Buckel begegnen sich'),
      idea: () => L('Where crests overlap, their displacements add; afterwards each runs on as before.', 'Wo sich Buckel überlagern, addieren sich ihre Auslenkungen; danach läuft jeder weiter wie zuvor.'),
      frames: () => {
        const a = W.pulse(W.LIN.zig, 0.5, 1, 1), b = W.pulse(W.LIN.trap, 5, -1, 1), sc = { pulses: [a, b], end: null };
        const c = W.pulse(W.LIN.trap, 1, 1, 1), d = W.pulse(W.LIN.trap, 4.5, -1, 1, { sgn: -1 }), sc2 = { pulses: [c, d], end: null };
        return [
          frame(L('Superposition', 'Superposition'), `<p>${W.RULE.sup()}</p><p>${L('Dashed: each crest on its own; solid: the rope, their sum.', 'Gestrichelt: jeder Buckel für sich; ausgezogen: das Seil, ihre Summe.')}</p>`, anim({ sc, t0: 0, t1: 4.5, show: ['parts', 'sum'] })),
          frame(L('A crest meets its opposite', 'Ein Buckel trifft sein Gegenstück'), `<p>${L('A crest meets the same crest upside down: when they cover each other, the rope is straight for a moment. Yet it moves on: the rope is moving fast at that moment, and the crests come out again.', 'Ein Buckel trifft denselben Buckel umgedreht: Wenn sie sich decken, ist das Seil für einen Moment gerade. Trotzdem geht es weiter: Das Seil bewegt sich in diesem Moment schnell, und die Buckel kommen wieder heraus.')}</p>`, anim({ sc: sc2, t0: 0, t1: 4, show: ['parts', 'sum'] })),
        ];
      },
    },
    {
      topic: 5, name: () => L('Reflection at an end', 'Reflexion an einem Ende'),
      idea: () => L('At a fixed end the crest comes back upside down, at a free end upright; in both, reversed.', 'An einem festen Ende kommt der Buckel umgedreht zurück, an einem losen aufrecht; in beiden Fällen seitenverkehrt.'),
      frames: () => {
        const p = WS(), fixed = { pulses: [p], end: { x: 5, type: 'fixed' } }, free = { pulses: [p], end: { x: 5, type: 'free' } };
        return [
          frame(L('A fixed end', 'Ein festes Ende'), `<p>${L('The rope is tied to a wall at x = 5 m: the end cannot move.', 'Das Seil ist bei x = 5 m an einer Wand festgemacht: Das Ende kann sich nicht bewegen.')} ${W.RULE.fixed()}</p>`, anim({ sc: fixed, t0: 0, t1: 3.5, show: ['sum'], Y: 11 })),
          frame(L('The mirror trick', 'Der Spiegeltrick'), `<p>${W.RULE.mirror()}</p><p>${L('Behind the end (shaded) runs the mirror crest, upside down at a fixed end; on the rope the two add up, so the end stays at 0.', 'Hinter dem Ende (schattiert) läuft der Spiegelbuckel, bei einem festen Ende auf dem Kopf; auf dem Seil addieren sich die beiden, sodass das Ende bei 0 bleibt.')}</p>`, anim({ sc: fixed, t0: 0, t1: 3.5, show: ['parts', 'sum'], virtual: true, Y: 11 })),
          frame(L('A free end', 'Ein loses Ende'), `<p>${L('Now the end at x = 5 m is free (a ring on a pole): the mirror crest is upright, and the crest comes back upright. At the end the two add: it moves twice as far.', 'Jetzt ist das Ende bei x = 5 m lose (ein Ring an einer Stange): Der Spiegelbuckel steht aufrecht, und der Buckel kommt aufrecht zurück. Am Ende addieren sich die beiden: Es bewegt sich doppelt so weit.')}</p>`, anim({ sc: free, t0: 0, t1: 3.5, show: ['parts', 'sum'], virtual: true, Y: 11 })),
          frame(L('Find the error', 'Finde den Fehler'), `<p>${L('A student sketched the crest (dashed) after its reflection at a wall (solid). It is reversed, as it should be, but it comes back upright: wrong, a fixed end turns it upside down. Check every reflection twice: which way up (the kind of end), and reversed (the front comes back first).', 'Eine Schülerin hat den Buckel (gestrichelt) nach seiner Reflexion an einer Wand skizziert (ausgezogen). Er ist seitenverkehrt, wie es sein muss, kommt aber aufrecht zurück: falsch, ein festes Ende dreht ihn um. Prüfe jede Reflexion zweimal: wie herum (die Art des Endes) und seitenverkehrt (die Front kommt zuerst zurück).')}</p>`,
            ['sketch', 'right'].map((k) => fig(P.graph({ ...W.reflSketch(W.pulse(W.LIN.ws, 0.5, 1, 1), 7, 'fixed', 9, k === 'sketch'), label: k === 'sketch' ? L('The student’s sketch: wrong', 'Die Skizze der Schülerin: falsch') : L('Right: upside down', 'Richtig: umgedreht') }))).join('')),
        ];
      },
    },
    {
      topic: 6, name: () => L('Reflection with overlap', 'Reflexion mit Überlagerung'),
      idea: () => L('While the crest is reflected, the incoming and the reflected part overlap and add.', 'Während der Buckel reflektiert wird, überlagern sich der einlaufende und der reflektierte Teil und addieren sich.'),
      frames: () => {
        const p = WS(), sc = { pulses: [p], end: { x: 5, type: 'free' } }, t = 1.5;
        return [
          frame(L('The rope at t = 1.5 s', 'Das Seil bei t = 1.5 s'), `<p>${L('After 1.5 s the crest has run 3 m: its front reached the end at t = 1 s and has come back 1 m; the block is still arriving. Green: the incoming part; orange: the reflected part (the mirror crest); blue: the rope, their sum.', 'Nach 1.5 s ist der Buckel 3 m gelaufen: Seine Front erreichte das Ende bei t = 1 s und ist 1 m zurückgekommen; der Block kommt noch an. Grün: der einlaufende Teil; orange: der reflektierte Teil (der Spiegelbuckel); blau: das Seil, ihre Summe.')}</p>`,
            fig(P.graph(W.snap((x) => W.y(sc, x, t), { hi: 5, end: sc.end, Y: 11, label: W.tLabel(t), more: [{ f: (x) => W.yIn(sc, x, t), cls: 'part' }, { f: (x) => W.yRef(sc, x, t), cls: 'part2' }] })))),
          frame(L('The whole reflection', 'Die ganze Reflexion'), `<p>${W.RULE.mirror()}</p>`, anim({ sc, t0: 0, t1: 3, show: ['parts', 'sum'], virtual: true, Y: 11 })),
          frame(L('The y(t) graph at x = 4 m', 'Das y(t)-Bild bei x = 4 m'), `<p>${L('With the free end, the rope at x = 4 m sees the crest pass and then its reflection come back over it. Its y(t) graph is the sum of both.', 'Mit dem losen Ende sieht das Seil bei x = 4 m den Buckel vorbeilaufen und dann seine Reflexion über ihn zurückkommen. Sein y(t)-Bild ist die Summe beider.')}</p>`,
            anim({ sc, t0: 0, t1: 3, show: ['sum'], mark: 4, trace: 4, Y: 11 })),
        ];
      },
    },
    {
      topic: 7, name: () => L('Standing waves', 'Stehende Wellen'),
      idea: () => L('A wave and its reflection make a standing wave: a node at a fixed end, an antinode at a free end, neighbouring nodes λ/2 apart.', 'Eine Welle und ihre Reflexion bilden eine stehende Welle: ein Knoten an einem festen Ende, ein Bauch an einem losen Ende, benachbarte Knoten λ/2 voneinander entfernt.'),
      frames: () => {
        // a long wave train (λ = 2 m) running into a fixed end at x = 6 m
        const train = W.pulse({ w: 16, lin: false, f: (u) => 3 * Math.sin(Math.PI * u) }, -15, 1, 1), sc = { pulses: [train], end: { x: 6, type: 'fixed' } };
        const FF = ['fixed', 'fixed'], FL = ['fixed', 'free'];
        const nodes = [0, 2, 4, 6].map((x) => ({ x, y: 0, label: 'N' })), antis = [1, 3, 5].map((x) => ({ x, y: W.AMP, label: 'A' }));
        return [
          frame(L('A wave meets its reflection', 'Eine Welle trifft ihre Reflexion'), `<p>${L('A long wave (λ = 2 m) runs into a wall at x = 6 m. Its reflection (orange, upside down) runs back over it. Where the two overlap, the rope no longer shows a wave running along: some points never move, the others swing up and down in step. Move the slider near the end and watch.', 'Eine lange Welle (λ = 2 m) läuft auf eine Wand bei x = 6 m zu. Ihre Reflexion (orange, umgedreht) läuft über sie zurück. Wo sich die beiden überlagern, zeigt das Seil keine laufende Welle mehr: Einige Punkte bewegen sich nie, die anderen schwingen im Gleichtakt auf und ab. Schieb den Regler gegen das Ende und schau zu.')}</p>`,
            anim({ sc, t0: 0, t1: 13, show: ['parts', 'sum'], virtual: true, Y: 7, arrows: false })),
          frame(L('Nodes and antinodes', 'Knoten und Bäuche'), `<p>${W.RULE.stand()} ${W.RULE.ends()}</p><p>${L('The picture shows the rope at its two extreme positions: nodes N, antinodes A. Here λ = 4 m: the nodes are 2 m apart. The same holds for every wave: in a microwave oven without its turntable, chocolate melts in spots λ/2 apart, at the antinodes.', 'Das Bild zeigt das Seil in seinen beiden äussersten Lagen: Knoten N, Bäuche A. Hier ist λ = 4 m: Die Knoten sind 2 m voneinander entfernt. Das gilt für jede Welle: In einem Mikrowellenofen ohne Drehteller schmilzt Schokolade an Stellen im Abstand λ/2, in den Bäuchen.')}</p>`,
            fig(P.graph(W.standFig(6, FF, 6, 0, { dots: [...nodes, ...antis] })))),
          frame(L('Fixed at both ends', 'An beiden Enden fest'), `<p>${L('A node at each end: a whole number n of loops fits, ℓ = n·λ/2. The rope of 6 m: λ₁ = 2ℓ = 12 m (the fundamental), then 6 m, 4 m, …: λ = λ₁/n.', 'Ein Knoten an jedem Ende: Eine ganze Zahl n von Schleifen passt, ℓ = n·λ/2. Das Seil von 6 m: λ₁ = 2ℓ = 12 m (die Grundschwingung), dann 6 m, 4 m, …: λ = λ₁/n.')}</p>`,
            [1, 2, 3].map((n) => fig(P.graph(W.standFig(6, FF, 2 * n, 0, { label: n === 1 ? 'λ₁ = 12 m' : `λ = ${12 / n} m = λ₁/${n}` })))).join('')),
          frame(L('One end free', 'Ein Ende lose'), `<p>${L('A node at the fixed end, an antinode at the free end: the last piece is a quarter wavelength. ℓ = q·λ/4 with q = 1, 3, 5, …: λ₁ = 4ℓ = 24 m, then λ₁/3, λ₁/5, …', 'Ein Knoten am festen Ende, ein Bauch am losen Ende: Das letzte Stück ist eine Viertelwellenlänge. ℓ = q·λ/4 mit q = 1, 3, 5, …: λ₁ = 4ℓ = 24 m, dann λ₁/3, λ₁/5, …')}</p>`,
            [1, 3, 5].map((q) => fig(P.graph(W.standFig(6, FL, q, 0, { label: q === 1 ? 'λ₁ = 24 m' : `λ = ${W.num(24 / q)} m = λ₁/${q}` })))).join('')),
          frame(L('Find the error', 'Finde den Fehler'), `<p>${L('A student sketched a standing wave on a rope fixed at the left and free at the right. Check each end: at the wall the sketch has an antinode, impossible, as a fixed end cannot move (and a node at the ring, where the rope moves most). Corrected: a node at the wall, an antinode at the ring.', 'Eine Schülerin hat eine stehende Welle auf einem Seil skizziert, das links fest und rechts lose ist. Prüfe jedes Ende: An der Wand hat die Skizze einen Bauch, unmöglich, denn ein festes Ende kann sich nicht bewegen (und einen Knoten beim Ring, wo sich das Seil am meisten bewegt). Richtig: ein Knoten an der Wand, ein Bauch beim Ring.')}</p>`,
            fig(P.graph(W.standFig(6, FL, 3, 1, { label: L('The student’s sketch: wrong', 'Die Skizze der Schülerin: falsch') }))) + fig(P.graph(W.standFig(6, FL, 3, 0, { label: L('Right', 'Richtig') })))),
        ];
      },
    },
  ];

  // ---------------------------------------------------------------- practice topics
  const TOPICS = [
    { name: () => L('Propagation', 'Ausbreitung'), example: 0, stages: [{ name: () => L('straight crests', 'gerade Buckel'), types: ['move-lin'] }, { name: () => L('smooth crests', 'runde Buckel'), types: ['move-smooth'] }] },
    { name: () => L('y(t) and the rope', 'y(t)-Bild und Seil'), example: 1, stages: [{ name: () => L('rope → y(t)', 'Seil → y(t)'), types: ['yt-lin'] }, { name: () => L('y(t) → rope', 'y(t) → Seil'), types: ['ty-lin'] }, { name: () => L('smooth crests', 'runde Buckel'), types: ['yt-smooth', 'ty-smooth'] }] },
    { name: () => L('How the rope moves', 'Wie sich das Seil bewegt'), example: 0, stages: [{ name: () => L('straight crests', 'gerade Buckel'), types: ['medium-lin'] }, { name: () => L('smooth crests', 'runde Buckel'), types: ['medium-smooth'] }] },
    { name: () => L('Speed and timing', 'Geschwindigkeit und Zeit'), example: 1, stages: [{ name: () => L('two snapshots', 'zwei Momentbilder'), types: ['speed-x'] }, { name: () => L('the length', 'die Länge'), types: ['speed-len'] }, { name: () => L('two places', 'zwei Orte'), types: ['speed-t'] }] },
    { name: () => L('Superposition', 'Überlagerung'), example: 2, stages: [{ name: () => L('straight crests', 'gerade Buckel'), types: ['sup-lin'] }, { name: () => L('smooth crests', 'runde Buckel'), types: ['sup-smooth'] }, { name: () => L('draw it', 'zeichnen'), types: ['draw-sup'] }] },
    { name: () => L('Reflection', 'Reflexion'), example: 3, stages: [{ name: () => L('fixed end', 'festes Ende'), types: ['refl-fixed'] }, { name: () => L('free end', 'loses Ende'), types: ['refl-free'] }, { name: () => L('the mirror crest', 'der Spiegelbuckel'), types: ['mirror-lin', 'mirror-smooth'] }, { name: () => L('the end itself', 'das Ende selbst'), types: ['end-lin', 'end-smooth'] }, { name: () => L('smooth crests', 'runde Buckel'), types: ['refl-smooth'] }, { name: () => L('draw it', 'zeichnen'), types: ['draw-refl'] }, { name: () => L('find the error', 'finde den Fehler'), types: ['error-refl'] }] },
    { name: () => L('Reflection with overlap', 'Reflexion mit Überlagerung'), example: 4, stages: [{ name: () => L('straight crests', 'gerade Buckel'), types: ['reflsum-lin'] }, { name: () => L('smooth crests', 'runde Buckel'), types: ['reflsum-smooth'] }, { name: () => L('draw it', 'zeichnen'), types: ['draw-reflsum'] }, { name: () => L('y(t) near the end', 'y(t) nahe beim Ende'), types: ['reflyt-lin', 'reflyt-smooth'] }] },
    { name: () => L('Standing waves', 'Stehende Wellen'), example: 5, stages: [{ name: () => L('nodes and antinodes', 'Knoten und Bäuche'), types: ['stand-pic'] }, { name: () => L('the wavelength', 'die Wellenlänge'), types: ['stand-count'] }, { name: () => L('λ as a fraction of λ₁', 'λ als Bruchteil von λ₁'), types: ['stand-ratio'] }, { name: () => L('find the error', 'finde den Fehler'), types: ['error-stand'] }] },
  ];

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the exercise types it is asked about, its worked
  // example and its practice topic. Four options: diagrams, or values; how the rope moves as
  // "which point moves up"; "find the error" as "which sketch is wrong". The wrong options carry the typical wrong idea behind them (FLAG).
  const OBJECTIVES = [
    { id: 'medium', kinds: ['move-lin', 'medium-lin', 'yt-lin'], tutor: 0, topic: 0,
      name: () => L('Tell the motion of the wave from the motion of the rope: where a crest is later, how a point of the rope moves, and its y(t) graph.',
        'Die Bewegung der Welle von der Bewegung des Seils unterscheiden: wo ein Buckel später ist, wie sich ein Punkt des Seils bewegt, und sein y(t)-Bild.') },
    { id: 'reflect', kinds: ['refl-fixed', 'refl-free', 'mirror-lin', 'error-refl', 'reflyt-lin'], tutor: 3, topic: 5,
      name: () => L('Predict the crest reflected at a fixed end (upside down) and at a free end (upright).',
        'Den an einem festen Ende (umgedreht) und an einem losen Ende (aufrecht) reflektierten Buckel vorhersagen.') },
    { id: 'superpose', kinds: ['sup-lin', 'sup-smooth'], tutor: 2, topic: 4,
      name: () => L('Add the displacements of two overlapping crests point by point.',
        'Die Auslenkungen zweier sich überlagernder Buckel Punkt für Punkt addieren.') },
    { id: 'standing', kinds: ['stand-pic', 'stand-count', 'stand-ratio', 'error-stand'], tutor: 5, topic: 7,
      name: () => L('Locate the nodes and antinodes of a standing wave on a rope: nodes λ/2 apart, a node at a fixed end, an antinode at a free end.',
        'Die Knoten und Bäuche einer stehenden Welle auf einem Seil finden: Knoten im Abstand λ/2, ein Knoten an einem festen Ende, ein Bauch an einem losen Ende.') },
  ];
  const FLAG = { dist: 'distance', dir: 'direction', turn: 'turn', flip: 'flip', copy: 'yt', back: 'yt', dur: 'yt', time: 'distance', max: 'sum', apart: 'sum', sign: 'reflection', order: 'reflection', cut: 'sum', gap: 'sum', single: 'reflection', inverse: 'formula', total: 'formula',
    ends: 'ends', errStand: 'ends', errRefl: 'reflection', even: 'halfwave', halfS: 'halfwave', count: 'halfwave', ratio: 'halfwave' };
  // two crests subtracted instead of added: the sum, not a reflection
  const flagOf = (e, tag) => (e.kind === 'sup' && tag === 'sign' ? 'sum' : FLAG[tag] || 'other');
  function checkQuestion(kind, seed) {
    const e = W.generate(kind, seed);
    const figure = `<div class="figs">${graphs(e.fig)}</div>`, explain = () => `<div class="figs">${e.solFig ? graphs(e.solFig) : ''}</div>${e.solution.map((s) => `<p>${s}</p>`).join('')}`;
    if (e.kind === 'medium') {
      // four marked points, one of them the only one that moves as asked
      const moves = e.questions.map((q) => q.options.find((o) => o.ok).label), want = moves.find((m) => moves.filter((x) => x === m).length === 1);
      if (!want || e.questions.length !== 4) return checkQuestion(kind, seed + 1);
      return { title: TITLE.medium(), text: `<p>${e.situation}</p>`, figure, ask: L(`Which point ${want}?`, `Welcher Punkt ${want}?`), options: e.questions.map((q) => ({ html: q.label, correct: q.options.find((o) => o.ok).label === want, flag: 'medium', why: q.options.find((o) => o.ok).why })), explain };
    }
    const q = e.questions[0];
    if (q.type === 'pick') return { title: TITLE[e.kind](), text: `<p>${e.text}</p>`, figure, ask: e.kind === 'error' ? L('Which sketch is wrong?', 'Welche Skizze ist falsch?') : e.kind === 'reflyt' ? L('Which graph is right?', 'Welcher Graph stimmt?') : L('Which diagram is right?', 'Welches Diagramm stimmt?'), options: q.options.map((o) => ({ html: P.graph(o.fig, { small: true }), correct: o.ok, flag: flagOf(e, o.tag), why: o.why })), explain };
    return { title: TITLE[e.kind](), text: `<p>${e.text}</p>`, figure, ask: q.label, options: q.options.map((o) => ({ html: o.label, correct: o.ok, flag: flagOf(e, o.tag), why: o.why })), explain };
  }
  const checkSource = {
    id: 'wav',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { distance: 'distance', direction: 'direction', turn: 'turn', yt: 'yt', sum: 'sum', reflection: 'reflection', medium: 'medium', ends: 'ends', halfwave: 'halfwave' },
    concepts: () => ({
      distance: L('the distance v·t', 'die Strecke v·t'), direction: L('the direction of the crest', 'die Richtung des Buckels'), turn: L('a crest that turns round', 'einen Buckel, der sich umdreht'),
      yt: L('the y(t) graph not reversed', 'das y(t)-Bild nicht seitenverkehrt'), sum: L('the overlap not added', 'die Überlagerung nicht addiert'), reflection: L('the reflection wrong way up or not reversed', 'die Reflexion falsch herum oder nicht seitenverkehrt'), medium: L('how the rope moves', 'wie sich das Seil bewegt'),
      ends: L('a node at a free end or an antinode at a fixed end', 'einen Knoten an einem losen Ende oder einen Bauch an einem festen Ende'), halfwave: L('a loop taken as a whole wavelength, or the nodes counted instead of the loops', 'eine Schleife als ganze Wellenlänge, oder die Knoten statt der Schleifen gezählt'),
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
      const keep = st, status = st.status, chosen = [...document.querySelectorAll('#fields input:checked')].map((x) => [x.name, x.value]);
      ex = again(ex);
      render();
      st = keep;
      if (ex.kind === 'draw') drawEditor();
      chosen.forEach(([n, v]) => { const x = document.querySelector(`input[name="${n}"][value="${v}"]`); if (x) x.checked = true; });
      if (st.checked) feedback();
      showStatus(status);
      showHints();
      if (st.revealed) showSolution();
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
      updateButtons();
    }
    tutor.relabel(lessons());
    checker.relabel();
  }
  const lessons = () => EXAMPLES.map((e) => ({ name: e.name(), idea: e.idea(), frames: e.frames, also: topics.also(e.topic) }));

  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('wav-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; stopAnims(); }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; } else fresh();
  }
  function checkMode() { setMode('check'); checker.show(); if (location.hash !== '#check') history.replaceState(null, '', '#check'); }
  function fromHash() {
    const h = location.hash.slice(1);
    // the arcade of earlier versions is now the check
    if (h === 'check' || h === 'arcade') { if ($('#ck').hidden) checkMode(); return true; }
    const m = h.match(/^tutor-(\d+)$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= EXAMPLES.length) {
      setMode('tutor');
      if (tutor.current() !== Number(m[1]) - 1 || !tutor.shown()) tutor.open(Number(m[1]) - 1);
      return true;
    }
    const te = topics.parse(h);
    if (te) { setMode('practice'); if (!ex || ex.id !== h) open(te); return true; }
    return false;
  }

  function init() {
    Lang.init();
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    topics = window.Topics.create({
      app: PRACTICE,
      topics: TOPICS.map((t) => ({ name: t.name, stages: t.stages, example: { i: t.example, name: () => EXAMPLES[t.example].name() } })),
      make: (type, seed) => W.generate(type, seed), typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    applyStatic();
    Lang.wire(switchLang);
    $('#new').addEventListener('click', fresh);
    $('#answers').addEventListener('submit', check);
    $('#fields').addEventListener('change', (evt) => {
      const row = evt.target.closest('.field');
      if (row) { row.className = 'field'; row.querySelector('.fb').textContent = ''; }
      if (evt.target.closest('.cand')) { document.querySelectorAll('.cand').forEach((el) => el.classList.remove('ok', 'bad')); document.querySelectorAll('.qfb').forEach((el) => { el.textContent = ''; }); }
    });
    $('#draw-area').addEventListener('click', (evt) => {
      if (evt.target.id === 'draw-clear' && !locked()) { st.wrong = null; sk.reset(); }
    });
    wireDrawing();
    $('#hint').addEventListener('click', hint);
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    tutor = window.createTutor(lessons(), { after: () => { stopAnims(); mountAnims($('#tutor')); }, done: practise, practise: (i) => { topics.go(EXAMPLES[i].topic); setMode('practice'); fresh(); } });
    checker = Check.create(checkSource, {
      math: () => {}, markScrollable: () => {}, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    const last = stored('wav-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
