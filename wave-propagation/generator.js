// Wave crests on a rope: the model and the exercises.
//
// A crest is a profile P(u) over its length w (u = 0 at its left end), made of straight pieces
// (LIN: easier, with corners on a grid of 0.5 m and 1 cm, some with jumps as on the worksheet) or
// smooth (SMOOTH: advanced). A pulse is { sh, x0, dir, v, sgn, rev }: its left end at x0 at t = 0,
// moving right (dir 1) or left (dir −1) at v, upside down if sgn = −1, reversed (front and back
// swapped) if rev. It moves without changing: y(x, t) = sgn·P(x − x0 − dir·v·t).
// A scene is { pulses, end: { x, type: 'fixed' | 'free' } or null, X (the rope from 0 to X) }.
// A reflection at the end E is the mirror image of the pulse, running towards the rope from
// behind the end: reversed, at 2E − x, and upside down at a fixed end. On the rope (x ≤ E) the
// displacement is the sum of the incoming and the reflected pulses: at a fixed end always 0, at a
// free end twice the incoming one. Units: x in m, y in cm, t in s, v in m/s.
//
// The exercises (EXERCISES): each { kind, level, text, fig (the given diagram), anim (an
// animation of the lead-in, up to the state given), solAnim, questions, hints, solution,
// difficulty }. Diagrams are specs for plot.js: { axis: 'x' | 't', lo, hi, Y, curves: [{ f, cls }],
// end, end0 (an end at the left), arrows, marks, dots, label }, f a function of x or t. The wrong
// options come from typical mistakes: the wrong distance or direction, a crest that turns round, a
// y(t) graph not reversed, the larger instead of the sum, a reflection with the wrong sign or not
// reversed, a standing wave with a node at a free end or an antinode at a fixed end, a loop taken
// as a whole wavelength. "Find the error" (error-refl, error-stand): four sketches of a student,
// one of them wrong, the right answer.
(function (root) {
  'use strict';

  const Lang = root.Lang || (typeof require === 'function' ? require('./lang.js') : null);
  const L = (en, de) => (Lang ? Lang.L(en, de) : en);

  // ---------------------------------------------------------------- random numbers
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (arr) => arr[Math.floor(next() * arr.length)];
    const shuffle = (arr) => { const b = [...arr]; for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(next() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; };
    return { next, pick, shuffle, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)) };
  }
  const eq = (a, b) => Math.abs(a - b) < 1e-9;
  const num = (x) => String(Number(x.toPrecision(3))); // 1.5, 2, 0.25

  // ---------------------------------------------------------------- crests
  // straight pieces: corners [u, y] (u in m from the left end, y in cm); jumps where u repeats
  const LIN = {
    ws: { pts: [[0, 0], [0, 5], [1, 5], [1, 0], [2, -5], [2, 0]] },        // the worksheet's
    ramp: { pts: [[0, 0], [2, 4], [2, 0]] },
    stairs: { pts: [[0, 0], [0, 2], [1, 2], [1, 4], [1.5, 4], [1.5, 0]] },
    tri: { pts: [[0, 0], [0.5, 4], [2.5, 0]], draw: true },
    trap: { pts: [[0, 0], [0.5, 2], [1.5, 2], [2.5, 0]], draw: true },
    zig: { pts: [[0, 0], [1, 4], [1.5, 0], [2, -2], [2.5, 0]], draw: true },
  };
  for (const s of Object.values(LIN)) { s.w = s.pts[s.pts.length - 1][0]; s.lin = true; }
  const S2 = (u) => Math.sin(Math.PI * u) ** 2;
  const SMOOTH = {
    skew: { w: 2.5, f: (u) => 4 * S2((u / 2.5) ** 0.55) },
    dip: { w: 3, f: (u) => (u < 1.8 ? 4 * S2(u / 1.8) : -2 * S2((u - 1.8) / 1.2)) },
    twin: { w: 3, f: (u) => (u < 1.6 ? 4 * S2(u / 1.6) : 2 * S2((u - 1.6) / 1.4)) },
  };
  for (const s of Object.values(SMOOTH)) s.lin = false;
  // the tutor's first crest: smooth and lopsided, 2 m long and 5 cm high, rising gently over 1.5 m
  // (its back) and falling steeply over the last 0.5 m (its front, when it runs to the right), so
  // that one sees it does not turn round, and that its front reaches a place first
  const BUMP = { w: 2, lin: false, f: (u) => (u < 1.5 ? 5 * Math.sin((Math.PI * u) / 3) ** 2 : 5 * Math.cos(Math.PI * (u - 1.5)) ** 2) };
  function prof(sh, u) {
    if (u < 0 || u > sh.w) return 0;
    if (!sh.lin) return sh.f(u);
    const p = sh.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const [u0, y0] = p[i], [u1, y1] = p[i + 1];
      if (u1 > u0 && u >= u0 && u <= u1) return y0 + ((y1 - y0) * (u - u0)) / (u1 - u0);
    }
    return 0;
  }

  // ---------------------------------------------------------------- pulses and scenes
  const pulse = (sh, x0, dir, v, o = {}) => ({ sh, x0, dir, v, sgn: o.sgn || 1, rev: !!o.rev });
  const leftAt = (p, t) => p.x0 + p.dir * p.v * t;
  function ev(p, x, t) {
    const s = x - leftAt(p, t);
    if (s < -1e-12 || s > p.sh.w + 1e-12) return 0;
    return p.sgn * prof(p.sh, p.rev ? p.sh.w - s : s);
  }
  // the mirror image of a pulse at the end E: reversed, behind the end, running the other way,
  // upside down at a fixed end
  const image = (p, E, type) => ({ ...p, x0: 2 * E - (p.x0 + p.sh.w), dir: -p.dir, rev: !p.rev, sgn: p.sgn * (type === 'fixed' ? -1 : 1) });
  const images = (sc) => (sc.end ? sc.pulses.map((p) => image(p, sc.end.x, sc.end.type)) : []);
  // the displacement on the rope: the pulses and their reflections (only for x ≤ E)
  function y(sc, x, t) {
    if (sc.end && x > sc.end.x + 1e-9) return 0;
    let s = 0;
    for (const p of sc.pulses) s += ev(p, x, t);
    for (const p of images(sc)) s += ev(p, x, t);
    return s;
  }
  const yIn = (sc, x, t) => (sc.end && x > sc.end.x + 1e-9 ? 0 : sc.pulses.reduce((a, p) => a + ev(p, x, t), 0));
  const yRef = (sc, x, t) => (sc.end && x > sc.end.x + 1e-9 ? 0 : images(sc).reduce((a, p) => a + ev(p, x, t), 0));

  // ---------------------------------------------------------------- diagrams
  const X = 8, Y = 6;
  const snap = (f, o = {}) => ({ axis: 'x', lo: 0, hi: o.hi || X, Y: o.Y || Y, curves: [{ f, cls: o.cls || 'main' }, ...(o.more || [])], end: o.end || null, arrows: o.arrows || [], marks: o.marks || [], dots: o.dots || [], label: o.label || '', virtual: o.virtual });
  const graphT = (f, T, o = {}) => ({ axis: 't', lo: 0, hi: T, Y: o.Y || Y, curves: [{ f, cls: o.cls || 'main' }, ...(o.more || [])], end: null, arrows: [], marks: o.marks || [], dots: [], label: o.label || '' });
  const arrowOf = (p, t, o = {}) => ({ x: leftAt(p, t) + p.sh.w / 2, dir: p.dir, v: p.v, up: o.up });
  const tLabel = (t) => `t = ${num(Math.abs(t) < 1e-9 ? 0 : t).replace('-', '−')} s`; // a lead-in runs at negative times
  // a signature of a curve, for telling options apart
  const sig = (spec) => spec.curves.map((c) => { const out = []; for (let k = 0; k <= 160; k++) out.push(Math.round(c.f(spec.lo + ((spec.hi - spec.lo) * k) / 160) * 4)); return `${c.cls}:${out.join(',')}`; }).join('|') + (spec.end ? spec.end.type : '') + (spec.end0 ? spec.end0.type : '');

  // Four options from the right diagram and candidates [{ spec, why, tag }]: the first that look
  // different from all the others.
  function pickFrom(r, right, cands) {
    const opts = [{ fig: right, ok: true, why: '' }], seen = new Set([sig(right)]);
    for (const c of cands) {
      if (opts.length === 4) break;
      const s = sig(c.spec);
      if (seen.has(s)) continue;
      seen.add(s);
      opts.push({ fig: c.spec, ok: false, why: c.why, nudge: c.nudge, tag: c.tag });
    }
    return r.shuffle(opts);
  }

  // ---------------------------------------------------------------- texts
  const dirWord = (d) => (d > 0 ? L('to the right', 'nach rechts') : L('to the left', 'nach links'));
  const endWord = (type) => (type === 'fixed' ? L('a fixed end', 'ein festes Ende') : L('a free end', 'ein loses Ende'));
  const RULE = {
    move: () => L('A crest moves without changing its shape: in the time t it moves the distance v·t.', 'Ein Wellenbuckel bewegt sich, ohne seine Form zu ändern: In der Zeit t legt er die Strecke v·t zurück.'),
    yt: () => L('At a fixed place, the front of the crest arrives first: the y(t) graph shows the crest reversed, front first.', 'An einem festen Ort kommt die Front des Buckels zuerst an: Das y(t)-Bild zeigt den Buckel seitenverkehrt, die Front zuerst.'),
    dur: () => L('The crest of length ℓ takes the time ℓ/v to pass a place.', 'Der Buckel der Länge ℓ braucht die Zeit ℓ/v, um an einem Ort vorbeizulaufen.'),
    sup: () => L('Where crests overlap, their displacements add (superposition); afterwards each runs on unchanged.', 'Wo sich Buckel überlagern, addieren sich ihre Auslenkungen (Superposition); danach läuft jeder unverändert weiter.'),
    fixed: () => L('At a fixed end the crest is reflected upside down; at a free end it comes back upright. In both, its front and back swap: the front is reflected first.', 'An einem festen Ende wird der Buckel umgedreht (nach unten) reflektiert, an einem losen Ende kommt er aufrecht zurück. In beiden Fällen vertauschen sich Front und Rücken: Die Front wird zuerst reflektiert.'),
    mirror: () => L('Mirror trick: imagine a second crest behind the end, the mirror image of the incoming one, running towards it; at a fixed end it is also upside down. On the rope, add both.', 'Spiegeltrick: Stell dir hinter dem Ende einen zweiten Buckel vor, das Spiegelbild des einlaufenden, der ihm entgegenläuft; bei einem festen Ende steht er zudem auf dem Kopf. Auf dem Seil addierst du beide.'),
    medium: () => L('The rope only moves up and down. A point of the rope takes on, a moment later, the displacement the rope now has just behind it, upstream of the wave.', 'Das Seil bewegt sich nur auf und ab. Ein Punkt des Seils nimmt einen Moment später die Auslenkung an, die das Seil jetzt direkt hinter ihm hat, auf der Seite, von der die Welle kommt.'),
  };

  // Nudges after a wrong answer while the exercise is open, where the reason (why) would give the
  // answer away; the reason stays for the explanation in check mode and after solving.
  const NUDGE = {
    fixed: () => L('What kind of end is it, and which way up does the crest come back from it?', 'Was für ein Ende ist es, und wie herum kommt der Buckel von dort zurück?'),
    yt: () => L('Which part of the crest arrives at a fixed place first, the front or the back? Where is it then in the y(t) graph?', 'Welcher Teil des Buckels kommt an einem festen Ort zuerst an, die Front oder der Rücken? Wo steht er dann im y(t)-Bild?'),
    ends: () => L('Look at the ends: what kind of end is each, and can the rope move there?', 'Schau die Enden an: Was für ein Ende ist es jeweils, und kann sich das Seil dort bewegen?'),
  };

  // a level of an exercise: 'lin' (straight pieces) or 'smooth'
  const shapeFor = (r, level, o = {}) => (level === 'smooth' ? r.pick(Object.values(SMOOTH)) : r.pick(Object.values(LIN).filter((s) => !o.draw || s.draw)));

  // the time when two crests running towards each other have passed each other completely, and a
  // little more (the end of a solution's animation)
  const apart = (a, b) => (b.x0 + b.sh.w - a.x0) / (a.v + b.v) + 0.5;

  // ---------------------------------------------------------------- propagation
  function move(r, level) {
    for (;;) {
      const sh = shapeFor(r, level), dir = r.pick([1, -1]), v = r.pick([1, 2]), t = r.pick([0.5, 1, 1.5, 2]);
      const d = v * t, w = sh.w;
      const x0 = dir > 0 ? r.pick([0.5, 1]) : X - w - r.pick([0.5, 1]);
      if (x0 + dir * d < 0 || x0 + w + dir * d > X) continue;
      const p = pulse(sh, x0, dir, v), sc = { pulses: [p], end: null };
      const at = (pp, tt) => (x) => ev(pp, x, tt);
      const right = snap(at(p, t), { label: tLabel(t) });
      const cands = r.shuffle([
        { spec: snap(at(p, 2 * t), { label: tLabel(t) }), tag: 'dist', why: L(`That is where it is after ${num(2 * t)} s: how far does it move in ${num(t)} s at ${num(v)} m/s?`, `Dort ist er nach ${num(2 * t)} s: Wie weit kommt er in ${num(t)} s mit ${num(v)} m/s?`) },
        { spec: snap(at(p, t / 2), { label: tLabel(t) }), tag: 'dist', why: L(`Too short a distance: how far does it move in ${num(t)} s at ${num(v)} m/s?`, `Eine zu kurze Strecke: Wie weit kommt er in ${num(t)} s mit ${num(v)} m/s?`) },
        { spec: snap(at({ ...p, dir: -dir }, t), { label: tLabel(t) }), tag: 'dir', why: L(`The crest moves ${dirWord(dir)}.`, `Der Buckel läuft ${dirWord(dir)}.`), nudge: L('Which way does the crest run, according to the text?', 'In welche Richtung läuft der Buckel laut Aufgabe?') },
        { spec: snap(at({ ...p, rev: true }, t), { label: tLabel(t) }), tag: 'turn', why: RULE.move() },
        { spec: snap(at({ ...p, sgn: -1 }, t), { label: tLabel(t) }), tag: 'flip', why: RULE.move() },
      ]);
      return {
        kind: 'move', level, difficulty: level === 'lin' ? 1 : 2, sc, t,
        text: L(`A crest runs ${dirWord(dir)} along a rope at ${num(v)} m/s. The diagram shows the rope at t = 0. Which diagram shows it at t = ${num(t)} s?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s ${dirWord(dir)} über ein Seil. Das Diagramm zeigt das Seil zur Zeit t = 0. Welches Diagramm zeigt es zur Zeit t = ${num(t)} s?`),
        fig: snap(at(p, 0), { arrows: [arrowOf(p, 0)], label: tLabel(0) }),
        anim: { sc, t0: -1, t1: 0, show: ['sum'] }, solAnim: { sc, t0: 0, t1: t, show: ['sum'] },
        questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
        hints: [
          L(`The crest runs ${dirWord(dir)} at ${num(v)} m/s; at t = 0 it reaches from x = ${num(x0)} m to ${num(x0 + w)} m. How far does it get in ${num(t)} s?`, `Der Buckel läuft mit ${num(v)} m/s ${dirWord(dir)}; bei t = 0 reicht er von x = ${num(x0)} m bis ${num(x0 + w)} m. Wie weit kommt er in ${num(t)} s?`),
          `${RULE.move()} ${L('Here with the speed and the time from the text.', 'Hier mit der Geschwindigkeit und der Zeit aus der Aufgabe.')}`,
          L(`Follow one corner, e.g. the left end at x = ${num(x0)} m: where must it be at t = ${num(t)} s? Look for the diagram with the same shape there, not turned round or upside down.`, `Verfolge eine Ecke, z. B. das linke Ende bei x = ${num(x0)} m: Wo muss es bei t = ${num(t)} s sein? Suche das Diagramm mit derselben Form dort, nicht umgedreht und nicht auf dem Kopf.`),
        ],
        solution: [L(`In ${num(t)} s the crest moves ${num(v)} m/s · ${num(t)} s = ${num(d)} m ${dirWord(dir)}, unchanged.`, `In ${num(t)} s bewegt sich der Buckel um ${num(v)} m/s · ${num(t)} s = ${num(d)} m ${dirWord(dir)}, unverändert.`)],
        solFig: right, p: { k: 'move', x0, dir, v, t, w },
      };
    }
  }

  // ---------------------------------------------------------------- y(t) at a place, and back
  // The crest moving right towards the place xp: the times its front and back pass.
  function ytSetup(r, level) {
    for (;;) {
      const sh = shapeFor(r, level), v = r.pick([1, 2]), x0 = r.pick([0, 0.5, 1]), xp = r.pick([4, 4.5, 5, 5.5, 6]);
      const tf = (xp - (x0 + sh.w)) / v, tb = (xp - x0) / v;
      if (tf <= 0.2) continue;
      const T = Math.ceil((tb + sh.w / v + 0.5) * 2) / 2; // room for a crest arriving one length late (an option)
      if (T > 9) continue;
      return { sh, v, x0, xp, tf, tb, T, p: pulse(sh, x0, 1, v) };
    }
  }
  function yt(r, level) {
    const { sh, v, x0, xp, tf, tb, T, p } = ytSetup(r, level), sc = { pulses: [p], end: null };
    const f = (t) => ev(p, xp, t), w = sh.w;
    const right = graphT(f, T, { label: L(`x = ${num(xp)} m`, `x = ${num(xp)} m`) });
    const lab = right.label;
    const cands = r.shuffle([
      { spec: graphT((t) => f(tf + tb - t), T, { label: lab }), tag: 'copy', why: RULE.yt(), nudge: NUDGE.yt() },
      { spec: graphT((t) => f(t - w / v), T, { label: lab }), tag: 'back', why: L(`Which part of the crest reaches x = ${num(xp)} m first, the front or the back?`, `Welcher Teil des Buckels erreicht x = ${num(xp)} m zuerst, die Front oder der Rücken?`) },
      { spec: graphT((t) => f(tf + (t - tf) / 2), T, { label: lab }), tag: 'dur', why: RULE.dur() },
      { spec: graphT((t) => -f(t), T, { label: lab }), tag: 'flip', why: L('The rope at that place is displaced the same way as the crest: upwards where the crest is up.', 'Das Seil an diesem Ort wird gleich ausgelenkt wie der Buckel: nach oben, wo der Buckel oben ist.'), nudge: L('As the crest passes, is the rope at that place displaced upwards or downwards?', 'Wird das Seil an diesem Ort nach oben oder nach unten ausgelenkt, wenn der Buckel vorbeiläuft?') },
      { spec: graphT((t) => f(tf + tb - t + 0.5), T, { label: lab }), tag: 'copy', why: RULE.yt(), nudge: NUDGE.yt() },
    ]);
    return {
      kind: 'yt', level, difficulty: level === 'lin' ? 2 : 3, sc,
      text: L(`A crest runs to the right at ${num(v)} m/s. The diagram shows the rope at t = 0. Which graph shows the displacement y(t) of the rope at x = ${num(xp)} m?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s nach rechts. Das Diagramm zeigt das Seil zur Zeit t = 0. Welcher Graph zeigt die Auslenkung y(t) des Seils bei x = ${num(xp)} m?`),
      fig: snap((x) => ev(p, x, 0), { arrows: [arrowOf(p, 0)], marks: [{ x: xp, label: `${num(xp)} m` }], label: tLabel(0) }),
      anim: { sc, t0: -1, t1: 0, show: ['sum'], mark: xp }, solAnim: { sc, t0: 0, t1: T, show: ['sum'], mark: xp, trace: xp },
      questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
      hints: [
        L(`The crest runs to the right at ${num(v)} m/s; at t = 0 its front (right end) is at x = ${num(x0 + w)} m, the place at x = ${num(xp)} m. Which part of the crest reaches the place first?`, `Der Buckel läuft mit ${num(v)} m/s nach rechts; bei t = 0 ist seine Front (das rechte Ende) bei x = ${num(x0 + w)} m, der Ort bei x = ${num(xp)} m. Welcher Teil des Buckels erreicht den Ort zuerst?`),
        `${RULE.yt()} ${L('The front arrives after the time distance/speed, with the distance from the front to the place.', 'Die Front kommt nach der Zeit Strecke/Geschwindigkeit an, mit der Strecke von der Front bis zum Ort.')}`,
        L(`${RULE.dur()} Here the crest is ${num(w)} m long.`, `${RULE.dur()} Hier ist der Buckel ${num(w)} m lang.`),
      ],
      solution: [L(`The front arrives at t = ${num(tf)} s, the back leaves at t = ${num(tb)} s: the crest takes ${num(w)} m / ${num(v)} m/s = ${num(w / v)} s to pass.`, `Die Front kommt bei t = ${num(tf)} s an, der Rücken verlässt den Ort bei t = ${num(tb)} s: Der Buckel braucht ${num(w)} m / ${num(v)} m/s = ${num(w / v)} s, um vorbeizulaufen.`), RULE.yt()],
      solFig: right, p: { k: 'yt', x0, xp, v, w },
    };
  }
  // y(t) given → the snapshot at a time
  function ty(r, level) {
    const { sh, v, x0, xp, tf, tb, T, p } = ytSetup(r, level), sc = { pulses: [p], end: null }, w = sh.w;
    // a time when the crest is on the rope, whole
    const times = [];
    for (let t = 0.5; t <= 6; t += 0.5) if (x0 + v * t >= 0 && x0 + w + v * t <= X) times.push(t);
    const t1 = r.pick(times);
    const at = (pp, tt) => (x) => ev(pp, x, tt);
    const right = snap(at(p, t1), { label: tLabel(t1) });
    const cands = r.shuffle([
      { spec: snap(at({ ...p, rev: true }, t1), { label: tLabel(t1) }), tag: 'copy', why: RULE.yt(), nudge: NUDGE.yt() },
      { spec: snap(at(p, t1 + w / v), { label: tLabel(t1) }), tag: 'back', why: L(`Which part of the crest arrives at x = ${num(xp)} m first? That fixes where the crest is.`, `Welcher Teil des Buckels kommt zuerst bei x = ${num(xp)} m an? Das legt fest, wo der Buckel ist.`) },
      { spec: snap(at(p, t1 - 0.5), { label: tLabel(t1) }), tag: 'time', why: L(`Go from the time the front passes x = ${num(xp)} m, at ${num(v)} m/s.`, `Geh von der Zeit aus, zu der die Front x = ${num(xp)} m passiert, mit ${num(v)} m/s.`) },
      { spec: snap(at({ ...p, sgn: -1 }, t1), { label: tLabel(t1) }), tag: 'flip', why: L('Up in the y(t) graph is up on the rope.', 'Oben im y(t)-Bild ist oben auf dem Seil.'), nudge: L('Does the crest point up or down in the y(t) graph, and how does it stand on the rope then?', 'Zeigt der Buckel im y(t)-Bild nach oben oder nach unten, und wie steht er dann auf dem Seil?') },
      { spec: snap(at(p, t1 + 0.5), { label: tLabel(t1) }), tag: 'time', why: L(`Go from the time the front passes x = ${num(xp)} m, at ${num(v)} m/s.`, `Geh von der Zeit aus, zu der die Front x = ${num(xp)} m passiert, mit ${num(v)} m/s.`) },
    ]);
    return {
      kind: 'ty', level, difficulty: level === 'lin' ? 3 : 4, sc,
      text: L(`A crest runs to the right at ${num(v)} m/s. The graph shows the displacement y(t) of the rope at x = ${num(xp)} m. Which diagram shows the rope at t = ${num(t1)} s?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s nach rechts. Der Graph zeigt die Auslenkung y(t) des Seils bei x = ${num(xp)} m. Welches Diagramm zeigt das Seil zur Zeit t = ${num(t1)} s?`),
      fig: graphT((t) => ev(p, xp, t), T, { label: L(`x = ${num(xp)} m`, `x = ${num(xp)} m`) }),
      anim: null, solAnim: { sc, t0: 0, t1, show: ['sum'], mark: xp },
      questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
      hints: [
        L(`Read the graph at x = ${num(xp)} m: at which time does the rope there start to move? ${RULE.yt()}`, `Lies den Graphen bei x = ${num(xp)} m: Zu welcher Zeit beginnt sich das Seil dort zu bewegen? ${RULE.yt()}`),
        L(`From that time on, the front runs on to the right at ${num(v)} m/s until t = ${num(t1)} s: how far beyond x = ${num(xp)} m is it then? The crest lies behind it, the right way round.`, `Von dieser Zeit an läuft die Front mit ${num(v)} m/s weiter nach rechts, bis t = ${num(t1)} s: Wie weit ist sie dann über x = ${num(xp)} m hinaus? Der Buckel liegt dahinter, seitenrichtig.`),
      ],
      solution: [L(`The y(t) graph starts with the front, at t = ${num(tf)} s. At t = ${num(t1)} s the front is at ${num(xp)} m + ${num(v)} m/s · (${num(t1)} s − ${num(tf)} s) = ${num(x0 + w + v * t1)} m; the crest lies behind it, the right way round.`, `Das y(t)-Bild beginnt mit der Front, bei t = ${num(tf)} s. Bei t = ${num(t1)} s ist die Front bei ${num(xp)} m + ${num(v)} m/s · (${num(t1)} s − ${num(tf)} s) = ${num(x0 + w + v * t1)} m; der Buckel liegt dahinter, seitenrichtig.`)],
      solFig: right, p: { k: 'ty', x0, xp, v, w, t1 },
    };
  }

  // ---------------------------------------------------------------- how the rope moves
  function medium(r, level) {
    for (;;) {
      const sh = shapeFor(r, level), dir = r.pick([1, -1]), v = 2, x0 = r.pick([2.5, 3]), p = pulse(sh, x0, dir, v);
      // the velocity of the rope: −dir·v·dy/dx; candidates inside straight pieces or clear slopes
      const slope = (x) => (ev(p, x + 1e-3, 0) - ev(p, x - 1e-3, 0)) / 2e-3, vel = (x) => -dir * v * slope(x);
      const xs = [];
      for (let x = 0.25; x < X; x += 0.25) {
        const s = slope(x), inside = x > x0 + 0.05 && x < x0 + sh.w - 0.05;
        if (inside && Math.abs(s) > 1.5 && Math.abs(slope(x - 0.12) - s) < 0.4 * Math.abs(s) && Math.abs(slope(x + 0.12) - s) < 0.4 * Math.abs(s)) xs.push({ x, m: vel(x) > 0 ? 'up' : 'down' });
        else if (Math.abs(s) < 1e-6 && Math.abs(slope(x - 0.15)) < 1e-6 && Math.abs(slope(x + 0.15)) < 1e-6) xs.push({ x, m: 'rest' });
      }
      const ups = xs.filter((q) => q.m === 'up'), downs = xs.filter((q) => q.m === 'down'), rests = xs.filter((q) => q.m === 'rest' && q.x > x0 - 1 && q.x < x0 + sh.w + 1);
      if (!ups.length || !downs.length) continue;
      const chosen = [r.pick(ups), r.pick(downs), r.pick([...ups, ...downs].filter((q) => !eq(q.x, 0))), ...(rests.length ? [r.pick(rests)] : [])];
      const uniq = [];
      for (const q of chosen) if (uniq.every((u) => Math.abs(u.x - q.x) >= 0.5)) uniq.push(q);
      if (uniq.length < 3) continue;
      uniq.sort((a, b) => a.x - b.x);
      const names = 'PQRS';
      const word = { up: () => L('moves up', 'bewegt sich nach oben'), down: () => L('moves down', 'bewegt sich nach unten'), rest: () => L('is at rest', 'ist in Ruhe') };
      const sc = { pulses: [p], end: null };
      // what one point does, and why (in the solution, so that it is not given away before)
      const point = (q, i) => (q.m === 'rest' ? L(`Around ${names[i]} the rope is flat: it stays where it is.`, `Um ${names[i]} ist das Seil flach: Es bleibt, wo es ist.`) : L(`Just ${dir > 0 ? 'left' : 'right'} of ${names[i]} the rope is ${q.m === 'up' ? 'higher' : 'lower'}: ${names[i]} ${word[q.m]()}.`, `Gleich ${dir > 0 ? 'links' : 'rechts'} von ${names[i]} ist das Seil ${q.m === 'up' ? 'höher' : 'tiefer'}: ${names[i]} ${word[q.m]()}.`));
      return {
        kind: 'medium', level, difficulty: level === 'lin' ? 2 : 3, sc,
        text: L(`A crest runs ${dirWord(dir)} along a rope. How does each marked point of the rope move at this moment?`, `Ein Wellenbuckel läuft ${dirWord(dir)} über ein Seil. Wie bewegt sich jeder markierte Punkt des Seils in diesem Moment?`),
        fig: snap((x) => ev(p, x, 0), { arrows: [arrowOf(p, 0)], dots: uniq.map((q, i) => ({ x: q.x, y: ev(p, q.x, 0), label: names[i] })) }),
        anim: { sc, t0: -1, t1: 0, show: ['sum'], dots: uniq.map((q, i) => ({ x: q.x, label: names[i] })) },
        solAnim: { sc, t0: 0, t1: 0.6, show: ['sum'], dots: uniq.map((q, i) => ({ x: q.x, label: names[i] })) },
        questions: uniq.map((q, i) => ({
          type: 'choice', key: names[i], label: names[i],
          options: ['up', 'down', 'rest'].map((m) => ({ label: word[m](), ok: m === q.m, why: `${RULE.medium()} ${point(q, i)}` })),
        })),
        hints: [
          L(`The crest runs ${dirWord(dir)}, so the wave comes from the ${dir > 0 ? 'left' : 'right'}. Look at ${uniq.map((q, i) => names[i]).join(', ')} one by one.`, `Der Buckel läuft ${dirWord(dir)}, die Welle kommt also von ${dir > 0 ? 'links' : 'rechts'}. Schau ${uniq.map((q, i) => names[i]).join(', ')} einzeln an.`),
          RULE.medium(),
          L(`For each point: is the rope just ${dir > 0 ? 'left' : 'right'} of it higher, lower, or as high (flat)? Imagine the crest shifted a little further ${dirWord(dir)}.`, `Für jeden Punkt: Ist das Seil gleich ${dir > 0 ? 'links' : 'rechts'} davon höher, tiefer oder gleich hoch (flach)? Stell dir den Buckel ein Stück weiter ${dirWord(dir)} vor.`),
        ],
        solution: [RULE.medium(), L('The points at the front of the crest rise, those at its back fall; where the rope is flat, it is at rest for the moment.', 'Die Punkte an der Front des Buckels steigen, die an seinem Rücken sinken; wo das Seil flach ist, ist es im Moment in Ruhe.'), ...uniq.map(point)],
        p: { k: 'medium', x0, dir, sh: sh.w },
      };
    }
  }

  // ---------------------------------------------------------------- speed and timing
  const opts4 = (r, right, wrongs, unit) => {
    const out = [{ value: right, ok: true, why: '' }];
    for (const w of wrongs) if (out.length < 4 && w.value > 0 && out.every((o) => Math.abs(Math.log(w.value / o.value)) > Math.log(1.15))) out.push({ ...w, ok: false });
    for (const k of [2, 0.5, 3, 1.5]) if (out.length < 4 && out.every((o) => Math.abs(Math.log((right * k) / o.value)) > Math.log(1.15))) out.push({ value: right * k, ok: false, why: wrongs[0] ? wrongs[0].why : '', tag: 'other' });
    return out.sort((a, b) => a.value - b.value).map((o) => ({ ...o, label: `${num(o.value)} ${unit}` }));
  };
  function speed(r, variant) {
    const sh = shapeFor(r, r.pick(['lin', 'smooth'])), v = r.pick([0.5, 1, 2]), w = sh.w;
    if (variant === 'x') {
      const x0 = r.pick([0, 0.5]), t1 = r.pick([0.5, 1]), dt = r.pick([1, 1.5, 2]), t2 = t1 + dt, p = pulse(sh, x0, 1, v);
      if (x0 + w + v * t2 > X) return speed(r, variant);
      const sc = { pulses: [p], end: null }, d = v * dt;
      const why = L(`The crest moved ${num(d)} m in ${num(dt)} s: v = ${num(d)} m / ${num(dt)} s = ${num(v)} m/s.`, `Der Buckel hat sich in ${num(dt)} s um ${num(d)} m bewegt: v = ${num(d)} m / ${num(dt)} s = ${num(v)} m/s.`);
      return {
        kind: 'speed', variant, level: 'mixed', difficulty: 2, sc,
        text: L(`The two diagrams show a rope at t = ${num(t1)} s and at t = ${num(t2)} s. How fast does the crest move?`, `Die zwei Diagramme zeigen ein Seil zur Zeit t = ${num(t1)} s und zur Zeit t = ${num(t2)} s. Wie schnell läuft der Buckel?`),
        fig: [snap((x) => ev(p, x, t1), { label: tLabel(t1) }), snap((x) => ev(p, x, t2), { label: tLabel(t2) })],
        anim: null, solAnim: { sc, t0: t1, t1: t2, show: ['sum'] },
        questions: [{ type: 'choice', key: 'v', label: 'v', options: opts4(r, v, [{ value: (x0 + w + v * t2) / t2, tag: 'total', why: L(`That divides the position of the front by the time. Use how far it moved between the two times: ${why}`, `Das teilt die Lage der Front durch die Zeit. Nimm, wie weit er sich zwischen den zwei Zeiten bewegt hat: ${why}`) }, { value: dt / d, tag: 'inverse', why }, { value: d / t2, tag: 'total', why }], 'm/s') }],
        hints: [
          L(`The diagrams are ${num(dt)} s apart (t = ${num(t1)} s and ${num(t2)} s). Follow one corner of the crest, e.g. its front: where is it in each diagram?`, `Die Diagramme liegen ${num(dt)} s auseinander (t = ${num(t1)} s und ${num(t2)} s). Verfolge eine Ecke des Buckels, z. B. seine Front: Wo ist sie in jedem Diagramm?`),
          L('v = Δx/Δt, with Δx how far that corner moved between the two diagrams (not where it is) and Δt the time between them.', 'v = Δx/Δt, mit Δx, wie weit sich diese Ecke zwischen den zwei Diagrammen bewegt hat (nicht, wo sie ist), und Δt der Zeit dazwischen.'),
        ],
        solution: [why], p: { k: 'speed-x', x0, v, t1, dt, w },
      };
    }
    if (variant === 't') {
      const x0 = 0, x1 = r.pick([3, 3.5, 4]), x2 = x1 + r.pick([1, 2, 3]), p = pulse(sh, x0, 1, v);
      const t1f = (x1 - w) / v, t2f = (x2 - w) / v, T = Math.ceil(((x2 - x0) / v + 0.5) * 2) / 2;
      if (t1f < 0 || T > 9) return speed(r, variant);
      const sc = { pulses: [p], end: null }, dt = t2f - t1f;
      const why = L(`The front passes x = ${num(x1)} m at ${num(t1f)} s and x = ${num(x2)} m at ${num(t2f)} s: v = ${num(x2 - x1)} m / ${num(dt)} s = ${num(v)} m/s.`, `Die Front passiert x = ${num(x1)} m bei ${num(t1f)} s und x = ${num(x2)} m bei ${num(t2f)} s: v = ${num(x2 - x1)} m / ${num(dt)} s = ${num(v)} m/s.`);
      return {
        kind: 'speed', variant, level: 'mixed', difficulty: 3, sc,
        text: L(`The two graphs show the displacement y(t) of a rope at x = ${num(x1)} m and at x = ${num(x2)} m, as a crest passes. How fast does the crest move?`, `Die zwei Graphen zeigen die Auslenkung y(t) eines Seils bei x = ${num(x1)} m und bei x = ${num(x2)} m, während ein Buckel vorbeiläuft. Wie schnell läuft der Buckel?`),
        fig: [graphT((t) => ev(p, x1, t), T, { label: `x = ${num(x1)} m` }), graphT((t) => ev(p, x2, t), T, { label: `x = ${num(x2)} m` })],
        anim: null, solAnim: { sc, t0: 0, t1: T, show: ['sum'], mark: x1, mark2: x2 },
        questions: [{ type: 'choice', key: 'v', label: 'v', options: opts4(r, v, [{ value: (x2 - x1) / (w / v), tag: 'dur', why: L(`That uses how long the crest takes to pass. Use the delay between the two places: ${why}`, `Das verwendet, wie lange der Buckel zum Vorbeilaufen braucht. Nimm die Verzögerung zwischen den zwei Orten: ${why}`) }, { value: dt / (x2 - x1), tag: 'inverse', why }, { value: x2 / t2f, tag: 'total', why }], 'm/s') }],
        hints: [
          L(`The two places are ${num(x2 - x1)} m apart. At which time does the front (where the rope starts to move) appear in the graph at x = ${num(x1)} m, and at which in the one at x = ${num(x2)} m?`, `Die zwei Orte liegen ${num(x2 - x1)} m auseinander. Zu welcher Zeit erscheint die Front (wo sich das Seil zu bewegen beginnt) im Graphen bei x = ${num(x1)} m, und zu welcher in jenem bei x = ${num(x2)} m?`),
          L('v = Δx/Δt, with Δt the delay of the front between the two places (not how long one graph lasts).', 'v = Δx/Δt, mit Δt der Verzögerung der Front zwischen den zwei Orten (nicht, wie lange ein Graph dauert).'),
        ],
        solution: [why], p: { k: 'speed-t', x1, x2, v, w },
      };
    }
    // the length of the crest from its y(t) graph
    const x0 = 0, xp = r.pick([4, 5]), p = pulse(sh, x0, 1, v), T = Math.ceil((xp / v + 0.5) * 2) / 2;
    if (T > 9) return speed(r, variant);
    const sc = { pulses: [p], end: null }, dur = w / v;
    const why = L(`The crest takes ${num(dur)} s to pass x = ${num(xp)} m: its length is ℓ = v·Δt = ${num(v)} m/s · ${num(dur)} s = ${num(w)} m.`, `Der Buckel braucht ${num(dur)} s, um an x = ${num(xp)} m vorbeizulaufen: Seine Länge ist ℓ = v·Δt = ${num(v)} m/s · ${num(dur)} s = ${num(w)} m.`);
    return {
      kind: 'speed', variant: 'len', level: 'mixed', difficulty: 2, sc,
      text: L(`A crest runs along a rope at ${num(v)} m/s. The graph shows the displacement y(t) at x = ${num(xp)} m. How long is the crest?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s über ein Seil. Der Graph zeigt die Auslenkung y(t) bei x = ${num(xp)} m. Wie lang ist der Buckel?`),
      fig: graphT((t) => ev(p, xp, t), T, { label: `x = ${num(xp)} m` }),
      anim: null, solAnim: { sc, t0: 0, t1: T, show: ['sum'], mark: xp },
      questions: [{ type: 'choice', key: 'len', label: 'ℓ', options: opts4(r, w, [{ value: dur / v, tag: 'inverse', why }, { value: dur, tag: 'time', why: L(`That is the time the crest takes, in s. Its length: ${why}`, `Das ist die Zeit, die der Buckel braucht, in s. Seine Länge: ${why}`) }, { value: v / dur, tag: 'inverse', why }], 'm') }],
      hints: [
        L(`Read from the graph at x = ${num(xp)} m: from when to when is the rope there displaced?`, `Lies am Graphen bei x = ${num(xp)} m ab: Von wann bis wann ist das Seil dort ausgelenkt?`),
        L(`In that time the whole crest runs past the place at ${num(v)} m/s: ℓ = v·Δt.`, `In dieser Zeit läuft der ganze Buckel mit ${num(v)} m/s am Ort vorbei: ℓ = v·Δt.`),
      ],
      solution: [why], p: { k: 'speed-len', xp, v, w },
    };
  }

  // ---------------------------------------------------------------- superposition
  function sup(r, level) {
    for (;;) {
      const a = shapeFor(r, level), b = shapeFor(r, level), v = r.pick([1, 2]);
      const pa = pulse(a, r.pick([0, 0.5]), 1, v), pb = pulse(b, X - b.w - r.pick([0, 0.5]), -1, v, { sgn: r.pick([1, -1]) });
      // a time when they overlap by at least 1 m
      const gap0 = pb.x0 - (pa.x0 + a.w), times = [];
      for (let t = 0.5; t <= 4; t += 0.5) { const ov = 2 * v * t - gap0; if (ov >= 1 && ov <= Math.min(a.w, b.w) + 0.5) times.push(t); }
      if (!times.length) continue;
      const t = r.pick(times), sc = { pulses: [pa, pb], end: null };
      const f = (x) => ev(pa, x, t) + ev(pb, x, t), A = (x) => ev(pa, x, t), B = (x) => ev(pb, x, t);
      const right = snap(f, { label: tLabel(t) });
      const big = (x) => (Math.abs(A(x)) >= Math.abs(B(x)) ? A(x) : B(x));
      const cands = r.shuffle([
        { spec: snap(big, { label: tLabel(t) }), tag: 'max', why: RULE.sup() },
        { spec: snap(A, { label: tLabel(t), more: [{ f: B, cls: 'main' }] }), tag: 'apart', why: L('Where the crests overlap, the rope has one displacement: the sum of both.', 'Wo sich die Buckel überlagern, hat das Seil eine einzige Auslenkung: die Summe beider.') },
        { spec: snap((x) => ev(pa, x, t + 0.5) + ev(pb, x, t + 0.5), { label: tLabel(t) }), tag: 'time', why: L(`How far does each crest move in ${num(t)} s?`, `Wie weit bewegt sich jeder Buckel in ${num(t)} s?`) },
        { spec: snap((x) => ev(pa, x, t) - ev(pb, x, t), { label: tLabel(t) }), tag: 'sign', why: RULE.sup() },
        { spec: snap((x) => ev(pa, x, t - 0.5) + ev(pb, x, t - 0.5), { label: tLabel(t) }), tag: 'time', why: L(`How far does each crest move in ${num(t)} s?`, `Wie weit bewegt sich jeder Buckel in ${num(t)} s?`) },
      ]);
      return {
        kind: 'sup', level, difficulty: level === 'lin' ? 3 : 4, sc, t,
        text: L(`Two crests run towards each other, both at ${num(v)} m/s. The diagram shows the rope at t = 0. Which diagram shows it at t = ${num(t)} s?`, `Zwei Wellenbuckel laufen aufeinander zu, beide mit ${num(v)} m/s. Das Diagramm zeigt das Seil zur Zeit t = 0. Welches Diagramm zeigt es zur Zeit t = ${num(t)} s?`),
        fig: snap((x) => ev(pa, x, 0) + ev(pb, x, 0), { arrows: [arrowOf(pa, 0), arrowOf(pb, 0, { up: pb.sgn < 0 })], label: tLabel(0) }),
        anim: { sc, t0: -0.5, t1: 0, show: ['sum'] }, solAnim: { sc, t0: 0, t1: apart(pa, pb), show: ['parts', 'sum'], hold: t },
        questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
        hints: [
          L(`The left crest runs to the right, the right one (${pb.sgn < 0 ? 'upside down' : 'upright'}) to the left, both at ${num(v)} m/s. How far has each moved at t = ${num(t)} s, and where is each then?`, `Der linke Buckel läuft nach rechts, der rechte (${pb.sgn < 0 ? 'nach unten' : 'nach oben'} gerichtet) nach links, beide mit ${num(v)} m/s. Wie weit hat sich jeder bei t = ${num(t)} s bewegt, und wo ist jeder dann?`),
          L(`${RULE.sup()} Draw both crests at t = ${num(t)} s, each unchanged, then add their heights where they overlap.`, `${RULE.sup()} Zeichne beide Buckel bei t = ${num(t)} s, jeden unverändert, und addiere dann ihre Höhen, wo sie sich überlagern.`),
        ],
        solution: [L(`Each crest moves ${num(v * t)} m. Where they overlap, the displacements add.`, `Jeder Buckel bewegt sich um ${num(v * t)} m. Wo sie sich überlagern, addieren sich die Auslenkungen.`), RULE.sup()],
        solFig: snap(f, { label: tLabel(t), more: [{ f: A, cls: 'part' }, { f: B, cls: 'part2' }] }), p: { k: 'sup', a: pa.x0, b: pb.x0, v, t, s: pb.sgn },
      };
    }
  }

  // ---------------------------------------------------------------- reflection
  // a crest running right towards the end at E
  function reflSetup(r, level, type, o = {}) {
    for (;;) {
      const sh = shapeFor(r, level, o), v = r.pick([1, 2]), E = r.pick([6, 6.5, 7]), x0 = r.pick([0, 0.5, 1]);
      if (x0 + sh.w > E - 1) continue;
      const p = pulse(sh, x0, 1, v), sc = { pulses: [p], end: { x: E, type: type || r.pick(['fixed', 'free']) } };
      return { sh, v, E, x0, p, sc, w: sh.w, tf: (E - x0 - sh.w) / v, tb: (E - x0) / v };
    }
  }
  const onRope = (sc) => (x) => y(sc, x, 0);
  function refl(r, level, type) {
    for (;;) {
      const { sh, v, E, p, sc, w, tb } = reflSetup(r, level, type);
      // after the whole crest has been reflected, the reflected crest still on the rope
      const times = [];
      for (let t = 0.5; t <= 10; t += 0.5) if (t > tb + 0.01 && E - v * (t - tb) - w >= 0) times.push(t);
      if (!times.length) continue;
      const t = r.pick(times), et = sc.end.type, other = et === 'fixed' ? 'free' : 'fixed';
      const refOnly = (o = {}) => (x) => {
        const im = image(p, E, o.type || et), q = o.notRev ? { ...im, rev: !im.rev } : im;
        return x > E ? 0 : ev(q, x, t + (o.dt || 0));
      };
      const fig = (f) => snap(f, { hi: E, end: sc.end, label: tLabel(t) });
      const right = fig(refOnly());
      const cands = r.shuffle([
        { spec: snap(refOnly({ type: other }), { hi: E, end: sc.end, label: tLabel(t) }), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() },
        { spec: fig(refOnly({ notRev: true })), tag: 'order', why: L('The front reaches the end first and so is reflected first: on the way back it leads again, so the crest comes back reversed.', 'Die Front erreicht das Ende zuerst und wird darum zuerst reflektiert: Auf dem Rückweg geht sie wieder voran, der Buckel kommt also seitenverkehrt zurück.'), nudge: L('Which part of the crest reaches the end first and so is reflected first? Which part leads on the way back?', 'Welcher Teil des Buckels erreicht das Ende zuerst und wird darum zuerst reflektiert? Welcher Teil geht auf dem Rückweg voran?') },
        { spec: snap(refOnly({ type: other, notRev: true }), { hi: E, end: sc.end, label: tLabel(t) }), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() },
        { spec: fig(refOnly({ dt: 1 })), tag: 'time', why: L(`The crest needs (${num(E)} m − x)/v to reach the end and as long again to come back to x.`, `Der Buckel braucht (${num(E)} m − x)/v bis zum Ende und gleich lang zurück bis x.`) },
        { spec: fig(refOnly({ dt: -0.5 })), tag: 'time', why: L(`The crest needs (${num(E)} m − x)/v to reach the end and as long again to come back to x.`, `Der Buckel braucht (${num(E)} m − x)/v bis zum Ende und gleich lang zurück bis x.`) },
      ]);
      return {
        kind: 'refl', level, difficulty: level === 'lin' ? 3 : 4, sc, t,
        text: L(`A crest runs to the right at ${num(v)} m/s towards ${endWord(et)} at x = ${num(E)} m. The diagram shows the rope at t = 0. Which diagram shows it at t = ${num(t)} s?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s nach rechts auf ${endWord(et)} bei x = ${num(E)} m zu. Das Diagramm zeigt das Seil zur Zeit t = 0. Welches Diagramm zeigt es zur Zeit t = ${num(t)} s?`),
        fig: snap(onRope(sc), { hi: E, end: sc.end, arrows: [arrowOf(p, 0)], label: tLabel(0) }),
        anim: { sc, t0: -0.5, t1: 0, show: ['sum'] }, solAnim: { sc, t0: 0, t1: t, show: ['sum'] },
        questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
        hints: [
          L(`The crest runs at ${num(v)} m/s towards ${endWord(et)} at x = ${num(E)} m; at t = 0 its back is at x = ${num(p.x0)} m, ${num(E - p.x0)} m from the end. Has the whole crest been reflected by t = ${num(t)} s?`, `Der Buckel läuft mit ${num(v)} m/s auf ${endWord(et)} bei x = ${num(E)} m zu; bei t = 0 ist sein Rücken bei x = ${num(p.x0)} m, ${num(E - p.x0)} m vor dem Ende. Ist der ganze Buckel bis t = ${num(t)} s reflektiert?`),
          RULE.fixed(),
          L(`Follow the front: in ${num(t)} s it runs v·t in all; what is left after reaching the end, it runs back. Then put the crest behind it, the way it comes back from this end.`, `Verfolge die Front: In ${num(t)} s läuft sie insgesamt v·t; was nach dem Ende übrig bleibt, läuft sie zurück. Setz dann den Buckel dahinter, so wie er von diesem Ende zurückkommt.`),
        ],
        solution: [RULE.fixed(), L(`At t = ${num(t)} s the crest has run ${num(v * t)} m: to the end and ${num(v * t - (E - p.x0 - w))} m back (its front).`, `Bei t = ${num(t)} s hat der Buckel ${num(v * t)} m zurückgelegt: bis zum Ende und ${num(v * t - (E - p.x0 - w))} m zurück (seine Front).`)],
        solFig: right, p: { k: 'refl', x0: p.x0, E, v, t, et },
      };
    }
  }
  // the reflection while the crest is still partly arriving: the sum
  function reflsum(r, level, type) {
    for (;;) {
      const { v, E, p, sc, w, tf, tb } = reflSetup(r, level, type);
      const times = [];
      for (let t = 0.5; t <= 10; t += 0.5) if (t > tf + 0.2 && t < tb - 0.2) times.push(t);
      if (!times.length) continue;
      const t = r.pick(times), et = sc.end.type, other = et === 'fixed' ? 'free' : 'fixed';
      const sum = (s) => (x) => y(s, x, t);
      const fig = (f, o = {}) => snap(f, { hi: E, end: sc.end, label: tLabel(t), more: o.more });
      const scOther = { ...sc, end: { x: E, type: other } };
      const notRev = (x) => (x > E ? 0 : ev(p, x, t) + ev({ ...image(p, E, et), rev: !image(p, E, et).rev }, x, t));
      const right = fig(sum(sc));
      const cands = r.shuffle([
        { spec: fig(sum(scOther)), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() },
        { spec: fig((x) => yIn(sc, x, t), { more: [{ f: (x) => yRef(sc, x, t), cls: 'main' }] }), tag: 'apart', why: L('Where the incoming and the reflected part overlap, the rope has one displacement: their sum.', 'Wo sich der einlaufende und der reflektierte Teil überlagern, hat das Seil eine einzige Auslenkung: ihre Summe.') },
        { spec: fig(notRev), tag: 'order', why: RULE.fixed(), nudge: NUDGE.fixed() },
        { spec: fig((x) => y(sc, x, t + 0.5)), tag: 'time', why: L(`How far has the front run at t = ${num(t)} s?`, `Wie weit ist die Front bei t = ${num(t)} s gelaufen?`) },
        { spec: fig((x) => yIn(sc, x, t)), tag: 'cut', why: L('The part that has reached the end is not lost: it comes back, and adds to the part still arriving.', 'Der Teil, der das Ende erreicht hat, geht nicht verloren: Er kommt zurück und addiert sich zum Teil, der noch ankommt.') },
      ]);
      return {
        kind: 'reflsum', level, difficulty: level === 'lin' ? 4 : 5, sc, t,
        text: L(`A crest runs to the right at ${num(v)} m/s towards ${endWord(et)} at x = ${num(E)} m. The diagram shows the rope at t = 0. Which diagram shows it at t = ${num(t)} s, while the crest is being reflected?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s nach rechts auf ${endWord(et)} bei x = ${num(E)} m zu. Das Diagramm zeigt das Seil zur Zeit t = 0. Welches Diagramm zeigt es zur Zeit t = ${num(t)} s, während der Buckel reflektiert wird?`),
        fig: snap(onRope(sc), { hi: E, end: sc.end, arrows: [arrowOf(p, 0)], label: tLabel(0) }),
        anim: { sc, t0: -0.5, t1: 0, show: ['sum'] }, solAnim: { sc, t0: 0, t1: tb + 0.5, show: ['parts', 'sum'], virtual: true, hold: t },
        questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
        hints: [
          L(`At t = ${num(t)} s the crest is being reflected at ${endWord(et)} (x = ${num(E)} m): its front has reached the end, its back not yet. Which way up does a crest come back from ${endWord(et)}?`, `Bei t = ${num(t)} s wird der Buckel an ${et === 'fixed' ? 'einem festen Ende' : 'einem losen Ende'} (x = ${num(E)} m) reflektiert: Seine Front hat das Ende erreicht, sein Rücken noch nicht. Wie herum kommt ein Buckel von ${et === 'fixed' ? 'einem festen Ende' : 'einem losen Ende'} zurück?`),
          RULE.mirror(),
          L(`Draw the incoming crest at t = ${num(t)} s as if the rope went on beyond x = ${num(E)} m (moved ${num(v)} m per second), mirror it at x = ${num(E)} m, and on the rope add the two.`, `Zeichne den einlaufenden Buckel bei t = ${num(t)} s, als ginge das Seil über x = ${num(E)} m hinaus weiter (${num(v)} m pro Sekunde verschoben), spiegle ihn an x = ${num(E)} m und addiere auf dem Seil beide.`),
        ],
        solution: [RULE.mirror(), RULE.fixed(), L('On the rope the incoming and the reflected part add up.', 'Auf dem Seil addieren sich der einlaufende und der reflektierte Teil.')],
        solFig: snap(sum(sc), { hi: E, end: sc.end, label: tLabel(t), more: [{ f: (x) => yIn(sc, x, t), cls: 'part' }, { f: (x) => yRef(sc, x, t), cls: 'part2' }] }),
        p: { k: 'reflsum', x0: p.x0, E, v, t, et },
      };
    }
  }
  // the mirror crest behind the end
  function mirror(r, level) {
    const s0 = reflSetup(r, level), { v, E, w } = s0, et = s0.sc.end.type, other = et === 'fixed' ? 'free' : 'fixed';
    // the crest close to the end, so that its mirror image lies close behind it
    const p = pulse(s0.sh, E - w - r.pick([0.5, 1, 1.5]), 1, v), sc = { pulses: [p], end: s0.sc.end };
    const hi = 2 * E - p.x0 + 1.5;
    const view = (im) => snap((x) => (x <= E ? ev(p, x, 0) : 0), { hi, end: sc.end, virtual: E, more: [{ f: (x) => (x >= E ? ev(im, x, 0) : 0), cls: 'virt' }], arrows: [arrowOf(p, 0), arrowOf(im, 0)] });
    const im = image(p, E, et);
    const right = view(im);
    const cands = r.shuffle([
      { spec: view(image(p, E, other)), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() },
      { spec: view({ ...im, rev: !im.rev }), tag: 'order', why: L('A mirror image is reversed: the front of the incoming crest faces the end, and so does the front of the mirror crest.', 'Ein Spiegelbild ist seitenverkehrt: Die Front des einlaufenden Buckels zeigt zum Ende, und ebenso die Front des Spiegelbuckels.'), nudge: L('Which way does the front of the incoming crest face? Which way must the front of its mirror image face, then?', 'Wohin zeigt die Front des einlaufenden Buckels? Wohin muss dann die Front seines Spiegelbilds zeigen?') },
      { spec: view({ ...im, x0: im.x0 + 1 }), tag: 'dist', why: L('The mirror crest is as far behind the end as the incoming crest is in front of it.', 'Der Spiegelbuckel ist gleich weit hinter dem Ende wie der einlaufende Buckel vor ihm.'), nudge: L('Measure: how far is the incoming crest from the end, and how far the mirror crest?', 'Miss nach: Wie weit ist der einlaufende Buckel vom Ende entfernt, und wie weit der Spiegelbuckel?') },
      { spec: view({ ...image(p, E, other), rev: !im.rev }), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() },
      { spec: view({ ...im, x0: im.x0 - 0.5 }), tag: 'dist', why: L('The mirror crest is as far behind the end as the incoming crest is in front of it.', 'Der Spiegelbuckel ist gleich weit hinter dem Ende wie der einlaufende Buckel vor ihm.'), nudge: L('Measure: how far is the incoming crest from the end, and how far the mirror crest?', 'Miss nach: Wie weit ist der einlaufende Buckel vom Ende entfernt, und wie weit der Spiegelbuckel?') },
    ]);
    return {
      kind: 'mirror', level, difficulty: level === 'lin' ? 3 : 4, sc,
      text: L(`A crest runs towards ${endWord(et)} at x = ${num(E)} m. Its reflection can be found with a mirror crest that runs towards it from behind the end. Which diagram shows the right mirror crest (dashed)?`, `Ein Wellenbuckel läuft auf ${endWord(et)} bei x = ${num(E)} m zu. Seine Reflexion findet man mit einem Spiegelbuckel, der ihm von hinter dem Ende entgegenläuft. Welches Diagramm zeigt den richtigen Spiegelbuckel (gestrichelt)?`),
      fig: snap(onRope(sc), { hi: E, end: sc.end, arrows: [arrowOf(p, 0)], label: tLabel(0) }),
      anim: null, solAnim: { sc, t0: 0, t1: (E - p.x0) / v + 0.5, show: ['parts', 'sum'], virtual: true },
      questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
      hints: [
        L(`The front of the crest is at x = ${num(p.x0 + w)} m, ${num(E - p.x0 - w)} m in front of ${endWord(et)} at x = ${num(E)} m. How far behind the end must the front of the mirror crest be, and which way must it face?`, `Die Front des Buckels ist bei x = ${num(p.x0 + w)} m, ${num(E - p.x0 - w)} m vor ${et === 'fixed' ? 'einem festen Ende' : 'einem losen Ende'} bei x = ${num(E)} m. Wie weit hinter dem Ende muss die Front des Spiegelbuckels sein, und wohin muss sie zeigen?`),
        L(`${RULE.mirror()} Each point at the distance d in front of x = ${num(E)} m goes to the distance d behind it.`, `${RULE.mirror()} Jeder Punkt im Abstand d vor x = ${num(E)} m kommt in den Abstand d dahinter.`),
        L(`Then the sign: here the end is ${et === 'fixed' ? 'fixed' : 'free'}. ${RULE.fixed()}`, `Dann das Vorzeichen: Hier ist das Ende ${et === 'fixed' ? 'fest' : 'lose'}. ${RULE.fixed()}`),
      ],
      solution: [RULE.mirror(), L(`At ${endWord(et)} the mirror crest is ${et === 'fixed' ? 'upside down' : 'upright'}.`, `Bei ${endWord(et)} steht der Spiegelbuckel ${et === 'fixed' ? 'auf dem Kopf' : 'aufrecht'}.`)],
      solFig: right, p: { k: 'mirror', x0: p.x0, E, et, w },
    };
  }
  // y(t) of the end itself
  function endEx(r, level) {
    const type = r.next() < 0.7 ? 'free' : 'fixed', { v, E, p, sc, tb } = reflSetup(r, level, type), T = Math.ceil((tb + 0.5) * 2) / 2;
    const inc = (t) => ev(p, E, t), f = (t) => y(sc, E, t);
    const g = (fn) => graphT(fn, T, { label: `x = ${num(E)} m`, Y: 11 });
    const right = g(f);
    const tf = (E - p.x0 - p.sh.w) / v;
    const cands = r.shuffle([
      { spec: g(inc), tag: 'single', why: type === 'free' ? L('At a free end the incoming and the reflected crest overlap exactly: the end moves twice as far.', 'An einem losen Ende überlagern sich der einlaufende und der reflektierte Buckel genau: Das Ende bewegt sich doppelt so weit.') : L('A fixed end cannot move: y = 0 all the time.', 'Ein festes Ende kann sich nicht bewegen: y = 0 die ganze Zeit.'),
        nudge: type === 'free' ? L('At the end the incoming and the reflected crest overlap: what does their sum give there?', 'Am Ende überlagern sich der einlaufende und der reflektierte Buckel: Was gibt ihre Summe dort?') : L('What kind of end is it: can it move at all?', 'Was für ein Ende ist es: Kann es sich überhaupt bewegen?') },
      { spec: g((t) => (type === 'free' ? 0 : 2 * inc(t))), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() },
      { spec: g((t) => 2 * inc(tf + tb - t)), tag: 'copy', why: RULE.yt(), nudge: NUDGE.yt() },
      { spec: g((t) => -2 * inc(t)), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() },
      { spec: g((t) => inc(tf + tb - t)), tag: 'copy', why: RULE.yt(), nudge: NUDGE.yt() },
    ]);
    return {
      kind: 'end', level, difficulty: level === 'lin' ? 3 : 4, sc,
      text: L(`A crest runs to the right at ${num(v)} m/s towards ${endWord(type)} at x = ${num(E)} m. Which graph shows how the end itself moves, y(t) at x = ${num(E)} m?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s nach rechts auf ${endWord(type)} bei x = ${num(E)} m zu. Welcher Graph zeigt, wie sich das Ende selbst bewegt, y(t) bei x = ${num(E)} m?`),
      fig: snap(onRope(sc), { hi: E, end: sc.end, arrows: [arrowOf(p, 0)], label: tLabel(0), Y: 11 }),
      anim: { sc, t0: -0.5, t1: 0, show: ['sum'] }, solAnim: { sc, t0: 0, t1: T, show: ['sum'], mark: E, trace: E },
      questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
      hints: [
        L(`The end at x = ${num(E)} m is ${type === 'fixed' ? 'fixed (a wall)' : 'free (a ring on a pole)'}. At the end itself, the incoming crest and its mirror crest arrive at the same time: what does their sum give there?`, `Das Ende bei x = ${num(E)} m ist ${type === 'fixed' ? 'fest (eine Wand)' : 'lose (ein Ring an einer Stange)'}. Am Ende selbst kommen der einlaufende Buckel und sein Spiegelbuckel gleichzeitig an: Was gibt ihre Summe dort?`),
        RULE.mirror(),
        L(`${RULE.yt()} Here the front reaches x = ${num(E)} m first.`, `${RULE.yt()} Hier erreicht die Front x = ${num(E)} m zuerst.`),
      ],
      solution: [type === 'free' ? L('At a free end the incoming and the reflected crest are the same there at every moment: the end moves twice as far as the crest is high.', 'An einem losen Ende sind der einlaufende und der reflektierte Buckel dort in jedem Moment gleich: Das Ende bewegt sich doppelt so weit, wie der Buckel hoch ist.') : L('At a fixed end the incoming and the reflected crest cancel there at every moment: the end stays at rest.', 'An einem festen Ende heben sich der einlaufende und der reflektierte Buckel dort in jedem Moment auf: Das Ende bleibt in Ruhe.'), RULE.yt()],
      solFig: right, p: { k: 'end', x0: p.x0, E, v, type },
    };
  }

  // y(t) at a place near the end, where the incoming and the reflected crest overlap: the place
  // xp = E − d, with 2d well below the length of the crest. There the reflected crest's y(t) is the
  // incoming one's, 2d/v later (to the end and back), upside down at a fixed end; the two add while
  // they overlap. The crest is lopsided, so that a graph not reversed in time (the y(x) picture)
  // looks different. The wrong graphs: the other kind of end, each part not reversed in time (the
  // shape as on the rope), no overlap (only the incoming crest, the two parts not added, or the
  // reflection only after the incoming crest has passed), and wrong timing.
  const lopsided = (sh) => { for (let u = 0.05; u < sh.w; u += 0.05) if (Math.abs(prof(sh, u) - prof(sh, sh.w - u)) > 0.5) return true; return false; };
  function reflyt(r, level) {
    for (;;) {
      const type = r.pick(['fixed', 'free']), { sh, v, E, x0, p, sc, w } = reflSetup(r, level, type);
      if (!lopsided(sh)) continue;
      const d = r.pick([0.5, 1]);
      if (2 * d > w - 0.5) continue;
      const xp = E - d, t1 = (xp - x0 - w) / v, t2 = t1 + (2 * d) / v, tb1 = (xp - x0) / v, tb2 = t2 + w / v;
      if (t1 < 0.5) continue;
      const T = Math.ceil((tb2 + 1) * 2) / 2;
      if (T > 10) continue;
      const s = type === 'fixed' ? -1 : 1, other = type === 'fixed' ? 'free' : 'fixed';
      const inc = (t) => ev(p, xp, t), ref = (t) => s * inc(t - (2 * d) / v), f = (t) => y(sc, xp, t);
      const lab = `x = ${num(xp)} m`, g = (fn, o = {}) => graphT(fn, T, { label: lab, Y: 11, more: o.more });
      const right = g(f);
      const q = { ...p, rev: !p.rev }, notRev = (t) => y({ ...sc, pulses: [q] }, xp, t);
      const gap = (tb1 - t2), noOverlap = (t) => inc(t) + ref(t - gap);
      const whyT = L(`The reflected crest has to run to the end and back: ${num(d)} m and ${num(d)} m at ${num(v)} m/s, ${num((2 * d) / v)} s after the incoming one.`, `Der reflektierte Buckel muss bis zum Ende und zurück laufen: ${num(d)} m und ${num(d)} m mit ${num(v)} m/s, ${num((2 * d) / v)} s nach dem einlaufenden.`);
      const nudgeT = L(`The reflected crest runs ${num(d)} m to the end and ${num(d)} m back: how long does it take at ${num(v)} m/s?`, `Der reflektierte Buckel läuft ${num(d)} m bis zum Ende und ${num(d)} m zurück: Wie lange braucht er dafür mit ${num(v)} m/s?`);
      const groups = [
        [{ spec: g((t) => inc(t) - ref(t)), tag: 'sign', why: RULE.fixed(), nudge: NUDGE.fixed() }],
        [{ spec: g(notRev), tag: 'copy', why: RULE.yt(), nudge: NUDGE.yt() }],
        r.shuffle([
          { spec: g(inc), tag: 'single', why: L('The crest is not lost at the end: it comes back over the place and adds to the part still arriving.', 'Der Buckel geht am Ende nicht verloren: Er kommt über den Ort zurück und addiert sich zum Teil, der noch ankommt.') },
          { spec: g(inc, { more: [{ f: ref, cls: 'main' }] }), tag: 'apart', why: L('Where the incoming and the reflected crest overlap, the rope has one displacement: their sum.', 'Wo sich der einlaufende und der reflektierte Buckel überlagern, hat das Seil eine einzige Auslenkung: ihre Summe.') },
          { spec: g(noOverlap), tag: 'gap', why: L(`The reflected crest comes back while the incoming one is still passing: ${whyT}`, `Der reflektierte Buckel kommt zurück, während der einlaufende noch vorbeiläuft: ${whyT}`), nudge: L(`${nudgeT} Has the incoming one passed completely by then?`, `${nudgeT} Ist der einlaufende dann schon ganz vorbei?`) },
        ]),
        r.shuffle([
          { spec: g((t) => inc(t) + ref(t + d / v)), tag: 'time', why: whyT, nudge: nudgeT },
          { spec: g((t) => inc(t) + ref(t - d / v)), tag: 'time', why: whyT, nudge: nudgeT },
          { spec: g((t) => f(t - 0.5)), tag: 'time', why: L(`When does the front reach x = ${num(xp)} m?`, `Wann erreicht die Front x = ${num(xp)} m?`) },
        ]),
      ];
      // three of the four mistakes, then the rest as spares
      const order = r.shuffle(groups), cands = [...order.slice(0, 3).map((gr) => gr[0]), ...order.flatMap((gr) => gr.slice(1)), ...order[3]];
      const options = pickFrom(r, right, cands);
      if (options.length < 4) continue;
      return {
        kind: 'reflyt', level, difficulty: level === 'lin' ? 4 : 5, sc, t: null,
        text: L(`A crest runs to the right at ${num(v)} m/s towards ${endWord(type)} at x = ${num(E)} m. The diagram shows the rope at t = 0. Which graph shows the displacement y(t) of the rope at x = ${num(xp)} m, close to the end?`, `Ein Wellenbuckel läuft mit ${num(v)} m/s nach rechts auf ${endWord(type)} bei x = ${num(E)} m zu. Das Diagramm zeigt das Seil zur Zeit t = 0. Welcher Graph zeigt die Auslenkung y(t) des Seils bei x = ${num(xp)} m, nahe beim Ende?`),
        fig: snap(onRope(sc), { hi: E, end: sc.end, arrows: [arrowOf(p, 0)], marks: [{ x: xp, label: `${num(xp)} m` }], label: tLabel(0) }),
        anim: { sc, t0: -0.5, t1: 0, show: ['sum'], mark: xp }, solAnim: { sc, t0: 0, t1: T, show: ['parts', 'sum'], virtual: true, mark: xp, trace: xp, Y: 11 },
        questions: [{ type: 'pick', key: 'fig', options }],
        hints: [
          L(`First the incoming crest passes x = ${num(xp)} m, front first: from t = ${num(t1)} s to ${num(tb1)} s. ${RULE.yt()}`, `Zuerst läuft der einlaufende Buckel an x = ${num(xp)} m vorbei, die Front zuerst: von t = ${num(t1)} s bis ${num(tb1)} s. ${RULE.yt()}`),
          L(`The reflected crest comes back over the place ${num((2 * d) / v)} s later (to the end and back, ${num(2 * d)} m), front first again, ${type === 'fixed' ? 'upside down' : 'upright'}: from t = ${num(t2)} s to ${num(tb2)} s.`, `Der reflektierte Buckel kommt ${num((2 * d) / v)} s später über den Ort zurück (bis zum Ende und zurück, ${num(2 * d)} m), wieder die Front zuerst, ${type === 'fixed' ? 'auf dem Kopf' : 'aufrecht'}: von t = ${num(t2)} s bis ${num(tb2)} s.`),
          L(`From t = ${num(t2)} s to ${num(tb1)} s both are there: add them.`, `Von t = ${num(t2)} s bis ${num(tb1)} s sind beide da: Addiere sie.`),
        ],
        solution: [
          L(`The incoming crest (green, dashed) passes x = ${num(xp)} m from t = ${num(t1)} s to ${num(tb1)} s; its y(t) graph is the crest reversed, front first.`, `Der einlaufende Buckel (grün, gestrichelt) läuft von t = ${num(t1)} s bis ${num(tb1)} s an x = ${num(xp)} m vorbei; sein y(t)-Bild ist der Buckel seitenverkehrt, die Front zuerst.`),
          L(`The reflected crest (orange, dashed) gives the same y(t) graph ${num((2 * d) / v)} s later, ${type === 'fixed' ? 'upside down (a fixed end)' : 'upright (a free end)'}: the front is reflected first and leads again on the way back.`, `Der reflektierte Buckel (orange, gestrichelt) ergibt dasselbe y(t)-Bild ${num((2 * d) / v)} s später, ${type === 'fixed' ? 'auf dem Kopf (ein festes Ende)' : 'aufrecht (ein loses Ende)'}: Die Front wird zuerst reflektiert und geht auf dem Rückweg wieder voran.`),
          L(`From t = ${num(t2)} s to ${num(tb1)} s the two overlap, and the rope at x = ${num(xp)} m has their sum (blue).`, `Von t = ${num(t2)} s bis ${num(tb1)} s überlagern sich die beiden, und das Seil bei x = ${num(xp)} m hat ihre Summe (blau).`),
        ],
        solFig: g(f, { more: [{ f: inc, cls: 'part' }, { f: ref, cls: 'part2' }] }),
        p: { k: 'reflyt', x0, E, v, d, type, w, sh: Object.keys(LIN).find((k) => LIN[k] === sh) || Object.keys(SMOOTH).find((k) => SMOOTH[k] === sh) },
      };
    }
  }

  // ---------------------------------------------------------------- drawing
  // The rope at a time, drawn by dragging a point at each 0.5 m to a height (whole cm). The crests
  // have their corners on that grid, so the answer is exactly the heights there. draw.Y: the height
  // scale, the same for the given diagram and the drawing.
  function draw(r, task) {
    for (;;) {
      let sc, t, text, hi = X;
      if (task === 'sup') {
        const a = shapeFor(r, 'lin', { draw: true }), b = shapeFor(r, 'lin', { draw: true }), v = 1;
        const pa = pulse(a, 0.5, 1, v), pb = pulse(b, X - b.w - 0.5, -1, v, { sgn: r.pick([1, -1]) });
        const gap0 = pb.x0 - (pa.x0 + a.w), times = [];
        for (let tt = 0.5; tt <= 4; tt += 0.5) { const ov = 2 * v * tt - gap0; if (ov >= 1 && ov <= 2.5) times.push(tt); }
        if (!times.length) continue;
        t = r.pick(times); sc = { pulses: [pa, pb], end: null };
        text = L(`Two crests run towards each other at 1 m/s. Draw the rope at t = ${num(t)} s: at each grid line, drag the point to the height of the rope.`, `Zwei Wellenbuckel laufen mit 1 m/s aufeinander zu. Zeichne das Seil zur Zeit t = ${num(t)} s: Zieh bei jeder Gitterlinie den Punkt auf die Höhe des Seils.`);
      } else {
        const type = r.pick(['fixed', 'free']), sh = shapeFor(r, 'lin', { draw: true }), v = 1, E = 6.5, x0 = 0.5, p = pulse(sh, x0, 1, v);
        sc = { pulses: [p], end: { x: E, type } }; hi = E;
        const tf = (E - x0 - sh.w) / v, tb = (E - x0) / v, times = [];
        for (let tt = 0.5; tt <= 10; tt += 0.5) {
          if (task === 'refl' && tt > tb && E - v * (tt - tb) - sh.w >= 0.5) times.push(tt);
          if (task === 'reflsum' && tt > tf + 0.4 && tt < tb - 0.4) times.push(tt);
        }
        if (!times.length) continue;
        t = r.pick(times);
        text = L(`A crest runs at 1 m/s towards ${endWord(type)} at x = ${num(E)} m. Draw the rope at t = ${num(t)} s: at each grid line, drag the point to the height of the rope.`, `Ein Wellenbuckel läuft mit 1 m/s auf ${endWord(type)} bei x = ${num(E)} m zu. Zeichne das Seil zur Zeit t = ${num(t)} s: Zieh bei jeder Gitterlinie den Punkt auf die Höhe des Seils.`);
      }
      const xs = [];
      for (let x = 0; x <= hi + 1e-9; x += 0.5) xs.push(x);
      const target = xs.map((x) => Math.round(y(sc, x, t)));
      if (!xs.every((x, i) => eq(y(sc, x, t), target[i]))) continue;
      // one height scale for the given diagram (and its animation) and the drawing: room for the
      // highest the rope gets (two crests moved one by one may overlap anywhere: both peaks)
      const peak = (p) => Math.max(...p.sh.pts.map((q) => Math.abs(q[1])));
      let top = task === 'sup' ? peak(sc.pulses[0]) + peak(sc.pulses[1]) : 0;
      if (task !== 'sup') for (let tt = -0.5; tt <= 16; tt += 0.1) for (let x = 0; x <= hi + 1e-9; x += 0.05) top = Math.max(top, Math.abs(y(sc, x, tt)));
      const Yd = Math.max(Y, Math.ceil(top - 1e-6) + 1);
      return {
        kind: 'draw', task, level: 'lin', difficulty: task === 'refl' ? 3 : 4, sc, t, xs, target,
        text, fig: snap((x) => y(sc, x, 0), { hi, Y: Yd, end: sc.end, arrows: sc.pulses.map((p) => arrowOf(p, 0, { up: p.sgn < 0 })), label: tLabel(0) }),
        anim: { sc, t0: -0.5, t1: 0, show: ['sum'] }, solAnim: { sc, t0: 0, t1: task === 'refl' ? t : task === 'sup' ? apart(...sc.pulses) : (sc.end.x - sc.pulses[0].x0) / sc.pulses[0].v + 0.5, show: task === 'refl' ? ['sum'] : ['parts', 'sum'], virtual: task !== 'sup', hold: task === 'refl' ? null : t, Y: Yd },
        draw: { hi, Y: Yd, end: sc.end, label: tLabel(t) },
        questions: [],
        hints: task === 'sup' ? [
          L(`Both crests move 1 m per second, the left one to the right, the right one to the left: how far has each moved at t = ${num(t)} s?`, `Beide Buckel bewegen sich 1 m pro Sekunde, der linke nach rechts, der rechte nach links: Wie weit hat sich jeder bei t = ${num(t)} s bewegt?`),
          L(`${RULE.sup()} Draw both moved crests, then add their heights at each grid line (every 0.5 m).`, `${RULE.sup()} Zeichne beide verschobenen Buckel und addiere dann ihre Höhen bei jeder Gitterlinie (alle 0.5 m).`),
        ] : [
          L(`The crest moves 1 m per second towards ${endWord(sc.end.type)} at x = ${num(hi)} m. Where would it be at t = ${num(t)} s if the rope went on beyond the end?`, `Der Buckel bewegt sich 1 m pro Sekunde auf ${endWord(sc.end.type)} bei x = ${num(hi)} m zu. Wo wäre er bei t = ${num(t)} s, wenn das Seil über das Ende hinaus weiterginge?`),
          RULE.mirror(),
          L(`${RULE.fixed()} Mirror the moved crest at x = ${num(hi)} m accordingly, then add the heights on the rope at each grid line (every 0.5 m).`, `${RULE.fixed()} Spiegle den verschobenen Buckel entsprechend an x = ${num(hi)} m und addiere dann auf dem Seil die Höhen bei jeder Gitterlinie (alle 0.5 m).`),
        ],
        solution: [task === 'sup' ? RULE.sup() : RULE.mirror(), ...(task === 'sup' ? [] : [RULE.fixed()])],
        solFig: snap((x) => y(sc, x, t), { hi, Y: Yd, end: sc.end, label: tLabel(t), more: task === 'sup' ? sc.pulses.map((p, i) => ({ f: (x) => ev(p, x, t), cls: i ? 'part2' : 'part' })) : [{ f: (x) => yIn(sc, x, t), cls: 'part' }, { f: (x) => yRef(sc, x, t), cls: 'part2' }] }),
        p: { k: 'draw', task, t, s: sc.pulses.map((p) => [p.x0, p.sgn]) },
      };
    }
  }

  // ---------------------------------------------------------------- standing waves
  // A rope of length ℓ between two ends, each fixed or free. A standing wave on it has a node at a
  // fixed end and an antinode at a free end, neighbouring nodes λ/2 apart: q quarter wavelengths
  // fit (q even if the ends are alike, odd if not), λ = 4ℓ/q. Drawn as the rope at its two extreme
  // positions, y = ±A·sin(qπx/(2ℓ) + ph·π/2): ph = 0 starts with a node at the left, ph = 1 with
  // an antinode. A wrong picture: ph or q not fitting an end ('ends'), or the nodes not evenly
  // spaced ('even': the rope stretched unevenly).
  const AMP = 4;
  const CONFIGS = [['fixed', 'fixed'], ['fixed', 'free'], ['free', 'fixed']];
  const phOf = (ends) => (ends[0] === 'fixed' ? 0 : 1);
  const qFits = (ends, q) => (ends[0] === ends[1]) === (q % 2 === 0);
  // what the picture has at the left and at the right end: 'node' or 'anti'
  const endsOf = (q, ph) => [ph ? 'anti' : 'node', Math.abs(Math.sin(((q + ph) * Math.PI) / 2)) > 0.5 ? 'anti' : 'node'];
  const fits = (ends, q, ph) => endsOf(q, ph).every((k, i) => k === (ends[i] === 'fixed' ? 'node' : 'anti'));
  function standFn(len, q, ph, o = {}) {
    return (x) => {
      if (x < -1e-9 || x > len + 1e-9) return null;
      const u = o.warp ? len * Math.max(0, x / len) ** 1.6 : x;
      return AMP * Math.sin(((q * u) / (2 * len) + ph / 2) * Math.PI);
    };
  }
  // the picture: the rope from 0 to ℓ (a little room at the left for its left end)
  function standFig(len, ends, q, ph, o = {}) {
    const f = standFn(len, q, ph, o), neg = (x) => { const v = f(x); return v == null ? null : -v; };
    return { ...snap(f, { hi: len, end: { x: len, type: ends[1] }, more: [{ f: neg, cls: 'main' }], dots: o.dots, label: o.label }), lo: -0.5, end0: { x: 0, type: ends[0] }, std: { len, ends, q, ph, warp: !!o.warp } };
  }
  const endsText = (ends) => (ends[0] === ends[1] ? L('fixed at both ends', 'an beiden Enden fest')
    : ends[0] === 'fixed' ? L('fixed at the left end and free at the right end (a ring on a pole)', 'am linken Ende fest und am rechten Ende lose (ein Ring an einer Stange)')
      : L('free at the left end (a ring on a pole) and fixed at the right end', 'am linken Ende lose (ein Ring an einer Stange) und am rechten Ende fest'));
  const qText = (ends, q) => (ends[0] === ends[1] ? `ℓ = ${q / 2} · λ/2` : `ℓ = ${q} · λ/4`);
  Object.assign(RULE, {
    stand: () => L('A wave and its reflection make a standing wave: at the nodes the rope does not move, at the antinodes (half-way between) it moves most. Neighbouring nodes are λ/2 apart.', 'Eine Welle und ihre Reflexion bilden eine stehende Welle: In den Knoten bewegt sich das Seil nicht, in den Bäuchen (in der Mitte dazwischen) am meisten. Benachbarte Knoten sind λ/2 voneinander entfernt.'),
    ends: () => L('A fixed end cannot move: it is always a node. A free end moves most: it is always an antinode.', 'Ein festes Ende kann sich nicht bewegen: Es ist immer ein Knoten. Ein loses Ende bewegt sich am meisten: Es ist immer ein Bauch.'),
    modes: () => L('Fixed at both ends, n loops fit: ℓ = n·λ/2, so λ = λ₁/n. With one end free, the last piece is a quarter wavelength: ℓ = q·λ/4 with q = 1, 3, 5, …, so λ = λ₁/q.', 'An beiden Enden fest passen n Schleifen: ℓ = n·λ/2, also λ = λ₁/n. Mit einem losen Ende ist das letzte Stück eine Viertelwellenlänge: ℓ = q·λ/4 mit q = 1, 3, 5, …, also λ = λ₁/q.'),
  });
  const WHY_ENDS = () => L('Look at the ends: a fixed end is a node, a free end an antinode.', 'Schau die Enden an: Ein festes Ende ist ein Knoten, ein loses Ende ein Bauch.');
  const WHY_EVEN = () => L('Neighbouring nodes are always λ/2 apart: they are evenly spaced.', 'Benachbarte Knoten sind immer λ/2 voneinander entfernt: Sie liegen gleichmässig verteilt.');

  // which picture fits the ends of the rope
  function standPic(r) {
    const ends = r.pick(CONFIGS), same = ends[0] === ends[1], q = r.pick(same ? [2, 4, 6] : [1, 3, 5]), ph = phOf(ends), len = r.pick([5, 6, 7]);
    const fig = (qq, pp, o) => standFig(len, ends, qq, pp, o);
    const right = fig(q, ph);
    const cands = r.shuffle([
      { spec: fig(q + 1, 1 - ph), tag: 'ends', why: WHY_ENDS(), nudge: NUDGE.ends() },
      { spec: fig(q + 1, ph), tag: 'ends', why: WHY_ENDS(), nudge: NUDGE.ends() },
      { spec: fig(q, 1 - ph), tag: 'ends', why: WHY_ENDS(), nudge: NUDGE.ends() },
      { spec: fig(q, ph, { warp: true }), tag: 'even', why: WHY_EVEN() },
      ...(q > 1 ? [{ spec: fig(q - 1, ph), tag: 'ends', why: WHY_ENDS(), nudge: NUDGE.ends() }] : []),
    ]);
    return {
      kind: 'stand', variant: 'pic', level: 'mixed', difficulty: 2,
      text: L(`A rope is ${endsText(ends)}. Which picture can show a standing wave on it? Each picture shows the rope at its two extreme positions.`, `Ein Seil ist ${endsText(ends)}. Welches Bild kann eine stehende Welle darauf zeigen? Jedes Bild zeigt das Seil in seinen beiden äussersten Lagen.`),
      fig: null, anim: null, solAnim: null,
      questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
      hints: [
        L(`This rope is ${endsText(ends)}. In each picture, what is at the left end and at the right end: a node (the rope at rest) or an antinode?`, `Dieses Seil ist ${endsText(ends)}. Was ist in jedem Bild am linken und am rechten Ende: ein Knoten (das Seil in Ruhe) oder ein Bauch?`),
        L(`${RULE.ends()} And neighbouring nodes are λ/2 apart: are the nodes in the picture evenly spaced?`, `${RULE.ends()} Und benachbarte Knoten sind λ/2 voneinander entfernt: Sind die Knoten im Bild gleichmässig verteilt?`),
      ],
      solution: [RULE.ends(), L(`The right picture has a node at each fixed end, an antinode at each free end and evenly spaced nodes: ${qText(ends, q)}.`, `Das richtige Bild hat einen Knoten an jedem festen Ende, einen Bauch an jedem losen Ende und gleichmässig verteilte Knoten: ${qText(ends, q)}.`)],
      solFig: right, p: { k: 'stand-pic', ends, q, len },
    };
  }
  // the wavelength from the picture and the length of the rope
  function standCount(r) {
    for (;;) {
      const ends = r.pick(CONFIGS), same = ends[0] === ends[1], q = r.pick(same ? [2, 4, 6] : [1, 3, 5]), lam = r.pick([1, 2, 3, 4]), len = (q * lam) / 4;
      if (len < 2 || len > 8 || !eq(len * 2, Math.round(len * 2))) continue;
      const n = same ? q / 2 : q, many = n > 1;
      const why = L(`${many ? n : 'One'} ${same ? 'loop' : 'quarter wavelength'}${many ? 's' : ''} ${many ? 'fit' : 'fits'} on the rope: ${qText(ends, q)}, so λ = ${num(lam)} m.`, `Auf das Seil ${many ? `passen ${n}` : 'passt eine'} ${same ? (many ? 'Schleifen' : 'Schleife') : (many ? 'Viertelwellenlängen' : 'Viertelwellenlänge')}: ${qText(ends, q)}, also λ = ${num(lam)} m.`);
      const wrongs = [
        { value: lam / 2, tag: 'halfS', why: L(`Neighbouring nodes are half a wavelength apart: one loop is λ/2. ${why}`, `Benachbarte Knoten sind eine halbe Wellenlänge voneinander entfernt: Eine Schleife ist λ/2. ${why}`) },
        { value: (4 * len) / (q + (same ? 2 : 1)), tag: 'count', why: L(`Count the loops between the nodes, not the nodes. ${why}`, `Zähle die Schleifen zwischen den Knoten, nicht die Knoten. ${why}`) },
        ...(same ? [] : [{ value: q > 1 ? (4 * len) / (q - 1) : 2 * lam, tag: 'ends', why: L(`At the free end the rope ends with an antinode: the last piece is a quarter wavelength. ${why}`, `Am losen Ende endet das Seil mit einem Bauch: Das letzte Stück ist eine Viertelwellenlänge. ${why}`) }]),
        { value: 2 * lam, tag: 'halfS', why },
      ];
      return {
        kind: 'stand', variant: 'count', level: 'mixed', difficulty: 2,
        text: L(`A rope ${num(len)} m long is ${endsText(ends)}. The picture shows a standing wave on it (the rope at its two extreme positions). What is its wavelength?`, `Ein ${num(len)} m langes Seil ist ${endsText(ends)}. Das Bild zeigt eine stehende Welle darauf (das Seil in seinen beiden äussersten Lagen). Wie gross ist ihre Wellenlänge?`),
        fig: standFig(len, ends, q, phOf(ends)), anim: null, solAnim: null,
        questions: [{ type: 'choice', key: 'lam', label: 'λ', options: opts4(r, lam, wrongs, 'm') }],
        hints: [
          same ? L(`The rope is ${num(len)} m long and ${endsText(ends)}. How many loops (from node to node) does the picture show?`, `Das Seil ist ${num(len)} m lang und ${endsText(ends)}. Wie viele Schleifen (von Knoten zu Knoten) zeigt das Bild?`)
            : L(`The rope is ${num(len)} m long and ${endsText(ends)}. How many whole loops does the picture show, and what is left at the free end?`, `Das Seil ist ${num(len)} m lang und ${endsText(ends)}. Wie viele ganze Schleifen zeigt das Bild, und was bleibt am losen Ende übrig?`),
          `${RULE.stand()} ${same ? L('So the length of the rope is the number of loops times λ/2.', 'Die Länge des Seils ist also die Anzahl Schleifen mal λ/2.') : L('At the free end the last piece is half a loop, a quarter wavelength: count the rope in quarter wavelengths, ℓ = q·λ/4.', 'Am losen Ende ist das letzte Stück eine halbe Schleife, eine Viertelwellenlänge: Zähle das Seil in Viertelwellenlängen, ℓ = q·λ/4.')}`,
        ],
        solution: [RULE.stand(), why], p: { k: 'stand-count', ends, q, lam },
      };
    }
  }
  // the wavelength as a fraction of the fundamental's
  // (or, the other way round, which picture shows the wave with λ = λ₁/k)
  function standRatio(r) {
    const ends = r.pick(CONFIGS), same = ends[0] === ends[1], q = r.pick(same ? [4, 6, 8, 10] : [3, 5, 7, 9]), k = same ? q / 2 : q;
    const lab = (d) => (d === 1 ? 'λ₁' : d < 1 ? `${Math.round(1 / d)}·λ₁` : `λ₁/${d}`);
    const why = same ? L(`Fixed at both ends, the fundamental is one loop: λ₁ = 2ℓ. Here ${k} loops fit: λ = 2ℓ/${k} = λ₁/${k}.`, `An beiden Enden fest ist die Grundschwingung eine Schleife: λ₁ = 2ℓ. Hier passen ${k} Schleifen: λ = 2ℓ/${k} = λ₁/${k}.`)
      : L(`With one end free, the fundamental is a quarter wavelength: λ₁ = 4ℓ. Here ${q} quarter wavelengths fit: λ = 4ℓ/${q} = λ₁/${q}.`, `Mit einem losen Ende ist die Grundschwingung eine Viertelwellenlänge: λ₁ = 4ℓ. Hier passen ${q} Viertelwellenlängen: λ = 4ℓ/${q} = λ₁/${q}.`);
    if (r.int(0, 1)) {
      // which picture: the same rope with other numbers of loops (quarter wavelengths)
      const fig = (qq) => standFig(6, ends, qq, phOf(ends));
      const other = (qq) => {
        const kk = same ? qq / 2 : qq;
        return same ? L(`This picture shows ${kk > 1 ? kk : 'one'} loop${kk > 1 ? 's' : ''}: ${kk === 1 ? 'λ = λ₁' : `λ = λ₁/${kk}`}. ${why}`, `Dieses Bild zeigt ${kk === 1 ? 'eine Schleife' : `${kk} Schleifen`}: ${kk === 1 ? 'λ = λ₁' : `λ = λ₁/${kk}`}. ${why}`)
          : L(`This picture shows ${kk > 1 ? kk : 'one'} quarter wavelength${kk > 1 ? 's' : ''}: ${kk === 1 ? 'λ = λ₁' : `λ = λ₁/${kk}`}. ${why}`, `Dieses Bild zeigt ${kk === 1 ? 'eine Viertelwellenlänge' : `${kk} Viertelwellenlängen`}: ${kk === 1 ? 'λ = λ₁' : `λ = λ₁/${kk}`}. ${why}`);
      };
      const qs = r.shuffle([q - 2, q + 2, q + 4, q - 4].filter((x) => x >= 1));
      const cands = qs.map((qq) => ({ spec: fig(qq), tag: same && qq === q - 2 ? 'count' : 'ratio', why: other(qq) }));
      const right = fig(q);
      return {
        kind: 'stand', variant: 'ratio-pic', level: 'mixed', difficulty: 3,
        text: L(`A rope is ${endsText(ends)}. Its fundamental (the standing wave of lowest frequency) has the wavelength λ₁. Which picture shows a standing wave on this rope with the wavelength λ = λ₁/${k}? Each picture shows the rope at its two extreme positions.`, `Ein Seil ist ${endsText(ends)}. Seine Grundschwingung (die stehende Welle mit der tiefsten Frequenz) hat die Wellenlänge λ₁. Welches Bild zeigt eine stehende Welle auf diesem Seil mit der Wellenlänge λ = λ₁/${k}? Jedes Bild zeigt das Seil in seinen beiden äussersten Lagen.`),
        fig: null, anim: null, solAnim: null,
        questions: [{ type: 'pick', key: 'fig', options: pickFrom(r, right, cands) }],
        hints: [
          L(`This rope is ${endsText(ends)}. Its fundamental is the simplest standing wave that fits: how much of a wave is that, and so λ₁ in terms of the length ℓ?`, `Dieses Seil ist ${endsText(ends)}. Seine Grundschwingung ist die einfachste stehende Welle, die passt: Wie viel einer Welle ist das, und also λ₁ ausgedrückt durch die Länge ℓ?`),
          same ? L('Fixed at both ends, n loops fit: ℓ = n·λ/2, so λ = λ₁/n.', 'An beiden Enden fest passen n Schleifen: ℓ = n·λ/2, also λ = λ₁/n.') : L('With one end free, the last piece is a quarter wavelength: ℓ = q·λ/4 with q = 1, 3, 5, …, so λ = λ₁/q. Count the quarter wavelengths: half a loop at the free end, two in each whole loop.', 'Mit einem losen Ende ist das letzte Stück eine Viertelwellenlänge: ℓ = q·λ/4 mit q = 1, 3, 5, …, also λ = λ₁/q. Zähle die Viertelwellenlängen: eine halbe Schleife am losen Ende, zwei in jeder ganzen Schleife.'),
        ],
        solution: [RULE.modes(), why], solFig: right, p: { k: 'stand-ratio', ends, q, pic: true },
      };
    }
    // denominators d (λ = λ₁/d; d < 1 for a multiple)
    const cands = [
      { d: 1 / k, tag: 'ratio', why: L(`More loops on the same rope: a shorter wavelength. ${why}`, `Mehr Schleifen auf demselben Seil: eine kürzere Wellenlänge. ${why}`), nudge: L('More loops on the same rope: is the wavelength longer or shorter then?', 'Mehr Schleifen auf demselben Seil: Ist die Wellenlänge dann länger oder kürzer?') },
      { d: k + 1, tag: 'count', why: L(`Count the loops, not the nodes. ${why}`, `Zähle die Schleifen, nicht die Knoten. ${why}`) },
      ...(same ? [{ d: 2 * k, tag: 'halfS', why }] : [{ d: (q + 1) / 2, tag: 'ends', why: L(`At the free end the last piece is half a loop. ${why}`, `Am losen Ende ist das letzte Stück eine halbe Schleife. ${why}`) }]),
      { d: k - 1, tag: 'count', why },
      { d: 2 * k, tag: 'halfS', why },
    ];
    const opts = [{ d: k, ok: true, why: '' }];
    for (const c of cands) if (opts.length < 4 && opts.every((o) => !eq(o.d, c.d))) opts.push({ ...c, ok: false });
    return {
      kind: 'stand', variant: 'ratio', level: 'mixed', difficulty: 3,
      text: L(`A rope is ${endsText(ends)}. Its fundamental (the standing wave of lowest frequency) has the wavelength λ₁. What is the wavelength of the standing wave in the picture?`, `Ein Seil ist ${endsText(ends)}. Seine Grundschwingung (die stehende Welle mit der tiefsten Frequenz) hat die Wellenlänge λ₁. Wie gross ist die Wellenlänge der stehenden Welle im Bild?`),
      fig: standFig(6, ends, q, phOf(ends)), anim: null, solAnim: null,
      questions: [{ type: 'choice', key: 'lam', label: 'λ', options: opts.sort((a, b) => a.d - b.d).map((o) => ({ ...o, label: lab(o.d) })) }],
      hints: [
        L(`This rope is ${endsText(ends)}. Its fundamental is the simplest standing wave that fits: how much of a wave is that, and so λ₁ in terms of the length ℓ?`, `Dieses Seil ist ${endsText(ends)}. Seine Grundschwingung ist die einfachste stehende Welle, die passt: Wie viel einer Welle ist das, und also λ₁ ausgedrückt durch die Länge ℓ?`),
        same ? L('Fixed at both ends, n loops fit: ℓ = n·λ/2, so λ = λ₁/n.', 'An beiden Enden fest passen n Schleifen: ℓ = n·λ/2, also λ = λ₁/n.') : L('With one end free, the last piece is a quarter wavelength: ℓ = q·λ/4 with q = 1, 3, 5, …, so λ = λ₁/q. Count the quarter wavelengths: half a loop at the free end, two in each whole loop.', 'Mit einem losen Ende ist das letzte Stück eine Viertelwellenlänge: ℓ = q·λ/4 mit q = 1, 3, 5, …, also λ = λ₁/q. Zähle die Viertelwellenlängen: eine halbe Schleife am losen Ende, zwei in jeder ganzen Schleife.'),
      ],
      solution: [RULE.modes(), why], p: { k: 'stand-ratio', ends, q },
    };
  }

  // ---------------------------------------------------------------- find the error
  // A student's four sketches, one of them wrong: the wrong one is the right answer. A reflection
  // with the wrong inversion, or a standing wave with an antinode at a fixed end.
  // A reflection sketch: the incoming crest (dashed) and the student's reflected crest (solid);
  // flip: the reflected crest the wrong way up.
  function reflSketch(p, E, type, t, flip) {
    const im = image(p, E, type), shown = flip ? { ...im, sgn: -im.sgn } : im;
    return { ...snap((x) => ev(shown, x, t), { hi: E, end: { x: E, type }, more: [{ f: (x) => ev(p, x, 0), cls: 'part' }], arrows: [arrowOf(p, 0), arrowOf(shown, t, { up: shown.sgn < 0 })] }), flip: !!flip };
  }
  function errorEx(r, what) {
    const sketches = [], seen = new Set();
    const wrongAt = r.int(0, 3);
    let wrong = null, fix = null, wrongType = null;
    while (sketches.length < 4) {
      const bad = sketches.length === wrongAt;
      let spec, fixed, type;
      if (what === 'refl') {
        type = r.pick(['fixed', 'free']);
        const sh = shapeFor(r, 'lin'), E = 7, p = pulse(sh, 0.5, 1, 1), tb = E - 0.5;
        // after the reflection, the reflected crest clear of the incoming one (at t = 0)
        const times = [];
        for (let t = tb; 2 * E - 0.5 - sh.w - t >= sh.w + 1; t += 0.5) times.push(t);
        if (!times.length) continue;
        const t = r.pick(times);
        spec = reflSketch(p, E, type, t, bad); fixed = reflSketch(p, E, type, t, false);
      } else {
        const ends = r.pick(CONFIGS), len = 6;
        if (bad) {
          // an antinode at a fixed end, and no other mistake
          const opts = [];
          for (let q = 1; q <= 6; q++) for (const ph of [0, 1]) { const k = endsOf(q, ph); if (k.some((x, i) => x === 'anti' && ends[i] === 'fixed') && !k.some((x, i) => x === 'node' && ends[i] === 'free')) opts.push([q, ph]); }
          const [q, ph] = r.pick(opts), qq = qFits(ends, q) ? q : q > 1 ? q - 1 : q + 1;
          spec = standFig(len, ends, q, ph); fixed = standFig(len, ends, qq, phOf(ends));
        } else {
          const qs = [1, 2, 3, 4, 5, 6].filter((q) => qFits(ends, q));
          spec = standFig(len, ends, r.pick(qs), phOf(ends));
        }
        type = ends;
      }
      const s = sig(spec);
      if (seen.has(s)) continue;
      seen.add(s);
      if (bad) { wrong = spec; fix = fixed; wrongType = type; }
      sketches.push({ fig: spec, ok: bad, type });
    }
    const why = (o) => (what === 'refl'
      ? L(`This sketch is right: at ${endWord(o.type)} the crest comes back ${o.type === 'fixed' ? 'upside down' : 'upright'}.`, `Diese Skizze stimmt: An ${o.type === 'fixed' ? 'einem festen Ende' : 'einem losen Ende'} kommt der Buckel ${o.type === 'fixed' ? 'umgedreht' : 'aufrecht'} zurück.`)
      : L('This sketch is right: a node at each fixed end, an antinode at each free end, the nodes evenly spaced.', 'Diese Skizze stimmt: ein Knoten an jedem festen Ende, ein Bauch an jedem losen Ende, die Knoten gleichmässig verteilt.'));
    const nudge = () => (what === 'refl'
      ? L('This sketch is right. Check each sketch: which kind of end, and which way up does the crest come back?', 'Diese Skizze stimmt. Prüfe jede Skizze: Was für ein Ende, und wie herum kommt der Buckel zurück?')
      : L('This sketch is right. Check each end of each sketch (node or antinode?) and the spacing of the nodes.', 'Diese Skizze stimmt. Prüfe jedes Ende jeder Skizze (Knoten oder Bauch?) und die Abstände der Knoten.'));
    const options = sketches.map((o) => ({ fig: o.fig, ok: o.ok, why: o.ok ? '' : why(o), nudge: o.ok ? '' : nudge(), tag: o.ok ? '' : what === 'refl' ? 'errRefl' : 'errStand' }));
    const n = options.findIndex((o) => o.ok) + 1;
    return {
      kind: 'error', variant: what, level: 'mixed', difficulty: 3, fig: null, anim: null, solAnim: null,
      text: what === 'refl'
        ? L('A student sketched four reflections. In each, the dashed crest runs towards the end (a wall: a fixed end; a ring on a pole: a free end), and the solid crest is the student’s sketch of it after the reflection. One sketch is wrong. Which?', 'Eine Schülerin hat vier Reflexionen skizziert. In jeder läuft der gestrichelte Buckel auf das Ende zu (eine Wand: ein festes Ende; ein Ring an einer Stange: ein loses Ende), und der ausgezogene ist ihre Skizze von ihm nach der Reflexion. Eine Skizze ist falsch. Welche?')
        : L('A student sketched standing waves on four ropes, each as the rope at its two extreme positions (a wall: a fixed end; a ring on a pole: a free end). One sketch is wrong. Which?', 'Eine Schülerin hat stehende Wellen auf vier Seilen skizziert, jede als das Seil in seinen beiden äussersten Lagen (eine Wand: ein festes Ende; ein Ring an einer Stange: ein loses Ende). Eine Skizze ist falsch. Welche?'),
      questions: [{ type: 'pick', key: 'fig', options }],
      hints: what === 'refl' ? [
        L(`The ends: ${sketches.map((o, i) => `${i + 1} ${o.type === 'fixed' ? 'a wall (fixed)' : 'a ring (free)'}`).join(', ')}. In each sketch, does the solid crest come back upright or upside down?`, `Die Enden: ${sketches.map((o, i) => `${i + 1} ${o.type === 'fixed' ? 'eine Wand (fest)' : 'ein Ring (lose)'}`).join(', ')}. Kommt der ausgezogene Buckel in jeder Skizze aufrecht oder auf dem Kopf zurück?`),
        RULE.fixed(),
      ] : [
        L(`The ends, left and right: ${sketches.map((o, i) => `${i + 1} ${o.type.map((e) => (e === 'fixed' ? 'fixed' : 'free')).join('–')}`).join(', ')}. In each sketch, is there a node or an antinode at each end?`, `Die Enden, links und rechts: ${sketches.map((o, i) => `${i + 1} ${o.type.map((e) => (e === 'fixed' ? 'fest' : 'lose')).join('–')}`).join(', ')}. Ist in jeder Skizze an jedem Ende ein Knoten oder ein Bauch?`),
        RULE.ends(),
      ],
      solution: what === 'refl'
        ? [RULE.fixed(), L(`Sketch ${n} is wrong: at ${endWord(wrongType)} the crest comes back ${wrongType === 'fixed' ? 'upside down' : 'upright'}, not ${wrongType === 'fixed' ? 'upright' : 'upside down'}. The figure above shows it corrected.`, `Skizze ${n} ist falsch: An ${wrongType === 'fixed' ? 'einem festen Ende' : 'einem losen Ende'} kommt der Buckel ${wrongType === 'fixed' ? 'umgedreht' : 'aufrecht'} zurück, nicht ${wrongType === 'fixed' ? 'aufrecht' : 'umgedreht'}. Die Figur oben zeigt sie richtig.`)]
        : [RULE.ends(), L(`Sketch ${n} is wrong: it has an antinode at a fixed end. The figure above shows it corrected.`, `Skizze ${n} ist falsch: Sie hat einen Bauch an einem festen Ende. Die Figur oben zeigt sie richtig.`)],
      solFig: fix, wrong, p: { k: `error-${what}`, n },
    };
  }

  const EXERCISES = {
    move: (r, a) => move(r, a), yt: (r, a) => yt(r, a), ty: (r, a) => ty(r, a), medium: (r, a) => medium(r, a), speed: (r, a) => speed(r, a),
    sup: (r, a) => sup(r, a), refl: (r, a, b) => refl(r, b || 'lin', a === 'smooth' ? null : a), reflsum: (r, a, b) => reflsum(r, a || 'lin', b), mirror: (r, a) => mirror(r, a), end: (r, a) => endEx(r, a), reflyt: (r, a) => reflyt(r, a), draw: (r, a) => draw(r, a),
    stand: (r, a) => (a === 'count' ? standCount(r) : a === 'ratio' ? standRatio(r) : standPic(r)), error: (r, a) => errorEx(r, a),
  };
  // An exercise of a type ('move-lin', 'refl-fixed', 'refl-smooth', 'speed-x', 'draw-sup', …) and a seed.
  function generate(type, seed) {
    const r = rng(seed), [kind, a, b] = type.split('-');
    const e = kind === 'refl' ? (a === 'smooth' ? refl(r, 'smooth', null) : refl(r, 'lin', a)) : EXERCISES[kind](r, a, b);
    return { ...e, type, seed };
  }

  const api = { rng, LIN, SMOOTH, BUMP, prof, pulse, ev, image, y, yIn, yRef, snap, graphT, sig, X, Y, num, RULE, EXERCISES, generate, endWord, dirWord, tLabel, arrowOf, AMP, endsOf, fits, standFig, reflSketch };
  root.Waves = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
