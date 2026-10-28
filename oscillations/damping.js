// Damped oscillations: the exercise types of the worked examples 6 (Damped oscillations) and 7
// (How fast does it die away?), in the form of the types of scenarios.js (see there), added to
// its list.
//   damped           damp-match (a formula y(t) and four graphs), damp-back (a graph and four
//                    formulas), damp-error (find the error in a student's graph of a body damped
//                    in water or by friction on a table), damp-eq (which equation of motion
//                    describes a damped oscillation, and which term damps it)
//   how fast         decay-read (δ and τ from two peaks of a graph), decay-eq (ω₀, δ and τ of an
//                    equation, a spring or an LC circuit with a resistor), decay-energy (E ∝ A²),
//                    decay-regime (weak, critical and strong damping)
// As in the lecture notes, the damping term is 2δ·ẏ: ÿ + 2δ·ẏ + ω₀²·y = 0, the amplitude falls
// as e^(−δt), τ = 1/δ, and the damping is critical at δ = ω₀. A constant friction force F_R makes
// the amplitude fall by the same step, 4·F_R/D, every period; the body stops at a turning point
// once the spring can no longer overcome the friction (|y| ≤ F_R/D).
(function (root) {
  'use strict';

  const OC = root.OC || require('./core.js');
  const Plot = root.Plot || require('./plot.js');
  const Sc = root.Scenarios || require('./scenarios.js');
  const { L, pick, shuffle, q, tq, tnum, sig, rng, inUnit, speedUnit } = OC;
  const { oscWatch, curveMarks, numMark, kpt, peakKeys } = Sc;

  const PI2 = 2 * Math.PI;
  const step = (rule, html, show = []) => ({ text: `<p class="step-rule">${rule}</p>${html}`, show });
  const p$ = (s) => `<p>${s}</p>`;
  const res = (x) => `\\htmlClass{result}{${x}}`;
  const num$ = (key, sym, unit, what, signed = false) => ({ key, type: 'num', sym, unit, what, signed });
  const choice = (key, what, options, o = {}) => ({ key, type: 'choice', what, options, ...o });
  const box = (tex) => `<div class="eqbox">$$${tex}$$</div>`;
  const fig = (svg) => `<div class="fig">${svg}</div>`;
  const yourGraph = () => L('your graph', 'dein Graph');
  const yourAnswer = () => L('your answer', 'deine Antwort');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ================================================================ the motions
  // A body let go at rest from y = A at t = 0 (ω₀ in s⁻¹): (t) → { y, v, a }, in the unit of A.
  // Damping ∝ v, ÿ + 2δ·ẏ + ω₀²·y = 0: weak (δ < ω₀; its maxima at t = k·T, T = 2π/ω_d, are
  // A·e^(−δ·k·T)), critical (δ = ω₀) or strong (δ > ω₀).
  function viscous(A, w0, d) {
    let yv;
    if (Math.abs(d - w0) < 1e-9 * w0) yv = (t) => { const e = A * Math.exp(-w0 * t); return [e * (1 + w0 * t), -e * w0 * w0 * t]; };
    else if (d < w0) {
      const wd = Math.sqrt(w0 * w0 - d * d);
      yv = (t) => { const e = A * Math.exp(-d * t), c = Math.cos(wd * t), s = Math.sin(wd * t); return [e * (c + (d / wd) * s), -e * (wd + (d * d) / wd) * s]; };
    } else {
      const r = Math.sqrt(d * d - w0 * w0), s1 = -d + r, s2 = -d - r;
      yv = (t) => { const e1 = Math.exp(s1 * t), e2 = Math.exp(s2 * t); return [(A * (s2 * e1 - s1 * e2)) / (s2 - s1), (A * s1 * s2 * (e1 - e2)) / (s2 - s1)]; };
    }
    return (t) => { const [y, v] = yv(t); return { y, v, a: -w0 * w0 * y - 2 * d * v }; };
  }
  // A constant friction force F_R against the motion, r = F_R/D (in the unit of A). Each half
  // period the body swings about +r or −r, on the side it comes from, so its turning points are
  // A, −(A − 2r), A − 4r, …; it stops at the first one with |y| ≤ r (static friction as large).
  function dryTurns(A, r) {
    const turns = [A];
    while (Math.abs(turns[turns.length - 1]) > r + 1e-12 && turns.length < 1000) { const y = turns[turns.length - 1]; turns.push(2 * Math.sign(y) * r - y); }
    return turns;
  }
  function dry(A, w0, r) {
    const turns = dryTurns(A, r), half = Math.PI / w0, moving = turns.length - 1;
    return (t) => {
      const k = Math.floor(t / half);
      if (t < 0 || k >= moving) return { y: t < 0 ? A : turns[moving], v: 0, a: 0 };
      const y0 = turns[k], c = Math.sign(y0) * r, ph = w0 * (t - k * half);
      return { y: c + (y0 - c) * Math.cos(ph), v: -(y0 - c) * w0 * Math.sin(ph), a: -w0 * w0 * (y0 - c) * Math.cos(ph) };
    };
  }
  const sample = (f, tEnd, n) => Array.from({ length: n + 1 }, (z, k) => { const t = (k * tEnd) / n; return [t, f(t)]; });
  const clipTo = (axis) => (pts) => pts.map(([t, y]) => [t, Math.max(axis.lo, Math.min(axis.hi, y))]);

  // ================================================================ 6 formula and graph
  // Qualitative: formulas with letters (A, δ, k, ω positive) and graphs without numbers, five
  // periods (T = 1 in the drawings).
  const AX = { lo: -1.2, hi: 1.2, step: 1 }, T_END = 5;
  const DK = {
    exp: { tex: (y) => `${y}(t) = A\\cdot e^{-\\delta\\cdot t}\\cdot\\cos(\\omega\\cdot t)`, f: (t) => Math.exp(-0.35 * t) * Math.cos(PI2 * t) },
    lin: { tex: (y) => `${y}(t) = (A - k\\cdot t)\\cdot\\cos(\\omega\\cdot t)\\quad (t \\le A/k)`, f: (t) => Math.max(0, 1 - 0.22 * t) * Math.cos(PI2 * t) },
    hyp: { tex: (y) => `${y}(t) = \\frac{A}{1 + k\\cdot t}\\cdot\\cos(\\omega\\cdot t)`, f: (t) => Math.cos(PI2 * t) / (1 + 0.9 * t) },
    grow: { tex: (y) => `${y}(t) = A\\cdot e^{\\delta\\cdot t}\\cdot\\cos(\\omega\\cdot t)`, f: (t) => Math.exp(0.35 * t) * Math.cos(PI2 * t) },
    creep: { tex: (y) => `${y}(t) = A\\cdot e^{-\\delta\\cdot t}`, f: (t) => Math.exp(-0.8 * t) },
    shm: { tex: (y) => `${y}(t) = A\\cdot\\cos(\\omega\\cdot t)`, f: (t) => Math.cos(PI2 * t) },
    sin: { tex: (y) => `${y}(t) = A\\cdot e^{-\\delta\\cdot t}\\cdot\\sin(\\omega\\cdot t)`, f: (t) => Math.exp(-0.35 * t) * Math.sin(PI2 * t) },
    chirp: { tex: (y) => `${y}(t) = A\\cdot e^{-\\delta\\cdot t}\\cdot\\cos(\\omega\\cdot t^2)`, f: (t) => Math.exp(-0.35 * t) * Math.cos(PI2 * 0.3 * t * t) },
  };
  const CURVES = {};
  const dCurve = (k, n = 300) => (CURVES[`${k}/${n}`] = CURVES[`${k}/${n}`] || sample(DK[k].f, T_END, n));
  const dGraph = (k, y) => Plot.graph([{ pts: dCurve(k) }], { tEnd: T_END, axis: AX, name: y, bare: true, label: L('A graph of the motion', 'Ein Graph der Bewegung') });
  // the idea behind a wrong graph or formula: the amplitude's law, its growth, or the shape
  const DFLAG = { exp: 'envelope', lin: 'envelope', hyp: 'envelope', grow: 'grow', creep: 'dshape', shm: 'dshape', sin: 'dshape', chirp: 'dshape' };
  // what a graph shows ("In this graph …")
  const GRAPH_IS = () => ({
    exp: L('the maxima shrink by the same factor every period: fast at first, then ever more slowly, and they never quite reach 0', 'schrumpfen die Maxima in jeder Periode um denselben Faktor: zuerst schnell, dann immer langsamer, und sie erreichen 0 nie ganz'),
    lin: L('the maxima shrink by the same step every period and reach 0 after a few periods; then the body is at rest', 'schrumpfen die Maxima in jeder Periode um denselben Betrag und erreichen nach einigen Perioden 0; dann ist der Körper in Ruhe'),
    hyp: L('the amplitude drops steeply in the first period and then only very slowly', 'fällt die Amplitude in der ersten Periode steil ab und danach nur noch sehr langsam'),
    grow: L('the maxima grow', 'wachsen die Maxima'),
    creep: L('the curve creeps towards 0 without ever crossing it: no oscillation', 'kriecht die Kurve gegen 0, ohne die Achse je zu kreuzen: keine Schwingung'),
    shm: L('the amplitude stays the same', 'bleibt die Amplitude gleich'),
    sin: L('the curve starts at 0, not at the top', 'beginnt die Kurve bei 0, nicht zuoberst'),
    chirp: L('the maxima come closer and closer together: the period gets shorter', 'rücken die Maxima immer näher zusammen: Die Periode wird kürzer'),
  });
  // what a formula does
  const FORMULA_DOES = () => ({
    exp: L('With the factor $A\\cdot e^{-\\delta t}$ the amplitude shrinks by the same factor $e^{-\\delta T}$ in every period: exponentially.', 'Mit dem Faktor $A\\cdot e^{-\\delta t}$ schrumpft die Amplitude in jeder Periode um denselben Faktor $e^{-\\delta T}$: exponentiell.'),
    lin: L('With the factor $A - k\\cdot t$ the amplitude shrinks by the same step $k\\cdot T$ in every period: linearly, down to 0.', 'Mit dem Faktor $A - k\\cdot t$ schrumpft die Amplitude in jeder Periode um denselben Betrag $k\\cdot T$: linear, bis auf 0.'),
    hyp: L('With the factor $A/(1 + k\\cdot t)$ the amplitude falls steeply at first, then more and more slowly.', 'Mit dem Faktor $A/(1 + k\\cdot t)$ fällt die Amplitude zuerst steil, dann immer langsamer.'),
    grow: L('With the factor $e^{+\\delta t}$ the amplitude grows.', 'Mit dem Faktor $e^{+\\delta t}$ wächst die Amplitude.'),
    creep: L('Without a cosine, $A\\cdot e^{-\\delta t}$ only decays: it never changes sign, so there is no oscillation.', 'Ohne Kosinus klingt $A\\cdot e^{-\\delta t}$ nur ab: Es wechselt nie das Vorzeichen, also gibt es keine Schwingung.'),
    shm: L('With the constant factor $A$ the amplitude stays the same: no damping.', 'Mit dem konstanten Faktor $A$ bleibt die Amplitude gleich: keine Dämpfung.'),
    sin: L('With a sine, the curve starts at $\\sin 0 = 0$.', 'Mit einem Sinus beginnt die Kurve bei $\\sin 0 = 0$.'),
    chirp: L('With $t^2$ in the cosine, the phase grows faster and faster: the period gets shorter.', 'Mit $t^2$ im Kosinus wächst die Phase immer schneller: Die Periode wird kürzer.'),
  });
  // a formula and its graph
  const KIND_TEXT = () => ({
    exp: L('The cosine oscillates with a fixed period $T = 2\\pi/\\omega$; the factor $A\\cdot e^{-\\delta t}$ in front is the amplitude, which shrinks by the same factor in every period. This is the damped oscillation of a body braked by a force proportional to its velocity.', 'Der Kosinus schwingt mit fester Periode $T = 2\\pi/\\omega$; der Faktor $A\\cdot e^{-\\delta t}$ davor ist die Amplitude, die in jeder Periode um denselben Faktor schrumpft. Das ist die gedämpfte Schwingung eines Körpers, der von einer Kraft proportional zu seiner Geschwindigkeit gebremst wird.'),
    lin: L('The cosine oscillates with a fixed period $T = 2\\pi/\\omega$; the factor $A - k\\cdot t$ in front is the amplitude, which shrinks by the same step in every period until it is 0. This is (approximately) a body braked by a constant friction force.', 'Der Kosinus schwingt mit fester Periode $T = 2\\pi/\\omega$; der Faktor $A - k\\cdot t$ davor ist die Amplitude, die in jeder Periode um denselben Betrag schrumpft, bis sie 0 ist. Das ist (näherungsweise) ein Körper, der von einer konstanten Reibungskraft gebremst wird.'),
    hyp: L('The cosine oscillates with a fixed period; the amplitude $A/(1 + k\\cdot t)$ falls steeply at first and then more and more slowly (as with air resistance at high speed).', 'Der Kosinus schwingt mit fester Periode; die Amplitude $A/(1 + k\\cdot t)$ fällt zuerst steil und dann immer langsamer (wie bei Luftwiderstand bei hoher Geschwindigkeit).'),
    grow: L('The cosine oscillates with a fixed period, but the factor $A\\cdot e^{\\delta t}$ grows: the oscillation is driven, its amplitude grows.', 'Der Kosinus schwingt mit fester Periode, aber der Faktor $A\\cdot e^{\\delta t}$ wächst: Die Schwingung wird angetrieben, ihre Amplitude wächst.'),
    creep: L('There is no cosine: $A\\cdot e^{-\\delta t}$ starts at $A$ and creeps towards 0 without ever crossing it.', 'Es gibt keinen Kosinus: $A\\cdot e^{-\\delta t}$ beginnt bei $A$ und kriecht gegen 0, ohne die Achse je zu kreuzen.'),
    chirp: L('The amplitude $A\\cdot e^{-\\delta t}$ shrinks, but the argument $\\omega\\cdot t^2$ grows faster and faster: the period gets shorter. A damped oscillation keeps its period.', 'Die Amplitude $A\\cdot e^{-\\delta t}$ schrumpft, aber das Argument $\\omega\\cdot t^2$ wächst immer schneller: Die Periode wird kürzer. Eine gedämpfte Schwingung behält ihre Periode.'),
  });
  // the given kind and the wrong ones: the first always offered, then some of the others
  const MATCH = { exp: ['lin', 'grow', 'chirp', 'creep', 'shm', 'sin'], lin: ['exp', 'creep', 'grow', 'shm', 'hyp'], creep: ['exp', 'lin', 'shm', 'grow'], grow: ['exp', 'shm', 'lin', 'creep'] };
  const BACK = { exp: ['lin', 'hyp', 'chirp', 'sin', 'grow'], lin: ['exp', 'hyp', 'creep', 'sin'], hyp: ['exp', 'lin', 'chirp', 'grow'], chirp: ['exp', 'lin', 'sin', 'hyp'] };
  function kindsOf(r, given, table) {
    const [first, ...rest] = table[given], kept = [[given, clipTo(AX)(dCurve(given))]];
    for (const k of [first, ...shuffle(r, rest.slice())]) {
      const c = clipTo(AX)(dCurve(k));
      if (kept.length < 4 && !kept.some(([, d]) => Plot.alike(c, d, AX.hi - AX.lo))) kept.push([k, c]);
    }
    return kept.length === 4 ? shuffle(r, kept.map((x) => x[0])) : null;
  }
  const graphWhy = (k, given) => `${L('In this graph', 'In diesem Graphen')} ${GRAPH_IS()[k]}. ${FORMULA_DOES()[given]}`;
  const graphNudge = (k) => `${L('In this graph', 'In diesem Graphen')} ${GRAPH_IS()[k]}. ${L('Look at the formula again: what does the factor in front of the cosine do as $t$ grows, and is the argument of the cosine $\\omega\\cdot t$?', 'Schau die Formel nochmals an: Was macht der Faktor vor dem Kosinus, wenn $t$ wächst, und ist das Argument des Kosinus $\\omega\\cdot t$?')}`;
  const formulaWhy = (k, given) => `${FORMULA_DOES()[k]} ${L('In the graph, though,', 'Im Graphen aber')} ${GRAPH_IS()[given]}.`;
  const formulaNudge = (k) => `${FORMULA_DOES()[k]} ${L('Is that what the graph shows?', 'Zeigt der Graph das?')}`;
  const dHints = (y) => [
    L(`The factor in front of the cosine is the amplitude. As $t$ grows: does it stay the same, shrink by the same step every period, shrink by the same factor every period, or grow?`, `Der Faktor vor dem Kosinus ist die Amplitude. Wenn $t$ wächst: Bleibt er gleich, schrumpft er in jeder Periode um denselben Betrag, um denselben Faktor, oder wächst er?`),
    L(`The argument of the cosine: with $\\omega\\cdot t$ the phase grows evenly, so the maxima are evenly spaced (the period stays the same). Is there a cosine at all?`, `Das Argument des Kosinus: Mit $\\omega\\cdot t$ wächst die Phase gleichmässig, die Maxima liegen also gleich weit auseinander (die Periode bleibt gleich). Gibt es überhaupt einen Kosinus?`),
    L(`At $t = 0$: $${y}(0) = A\\cdot\\cos 0 = A$, so the graph starts at the top; with a sine it would start at 0.`, `Bei $t = 0$: $${y}(0) = A\\cdot\\cos 0 = A$, der Graph beginnt also zuoberst; mit einem Sinus begänne er bei 0.`),
  ];
  // the run: a body on a track moving by the given formula; rings where the chosen graph or formula
  // lies on it
  function dWatch(p, key) {
    return oscWatch({ kind: 'track', given: p.given, curve: dCurve(p.given, 1000), axis: AX, t1: T_END, unit: '', panels: ['y'], name: p.y,
      marks: (w, get) => { const k = get(key); return DK[k] && p.kinds.includes(k) ? curveMarks(w, key, DK[k].f, [0.5, 2, 4.5], 0.04 * (AX.hi - AX.lo), say()) : []; },
      other: (w, get) => { const k = get(key); return DK[k] && p.kinds.includes(k) ? { key, f: DK[k].f, say: say() } : null; },
      keyOf: peakKeys });
    function say() { return key === 'graph' ? yourGraph() : L('the motion of your formula', 'die Bewegung deiner Formel'); }
  }
  const dampMatch = {
    id: 'damp-match', difficulty: 2, kind: 'dmatch',
    title: () => L('Which graph?', 'Welcher Graph?'),
    make: (r) => { const given = pick(r, Object.keys(MATCH)), kinds = kindsOf(r, given, MATCH); return kinds && { given, y: pick(r, ['x', 'y', 'z', 'u']), kinds }; },
    solve: (p) => ({ graph: p.given }),
    traps: [],
    fields: (p) => [choice('graph', L('Which graph shows the motion?', 'Welcher Graph zeigt die Bewegung?'), p.kinds.map((k) => [k, dGraph(k, p.y), k === p.given ? '' : graphWhy(k, p.given), k === p.given ? null : DFLAG[k], k === p.given ? '' : graphNudge(k)]), { pics: true })],
    text: (p) => L(`A body moves according to the formula shown (the constants are positive). Which graph shows its displacement ${p.y}(t)?`, `Ein Körper bewegt sich gemäss der angegebenen Formel (die Konstanten sind positiv). Welcher Graph zeigt seine Auslenkung ${p.y}(t)?`),
    hints: (p) => dHints(p.y),
    steps: (p) => [
      step(L('The amplitude and the period', 'Die Amplitude und die Periode'), p$(KIND_TEXT()[p.given] || FORMULA_DOES()[p.given])),
      step(L('The graph', 'Der Graph'), p$(L('So the graph is <span class="result">this one</span>:', 'Der Graph ist also <span class="result">dieser</span>:')), ['graph']),
    ],
    figure: (p, v, view) => box(DK[p.given].tex(p.y)) + (view.show && view.show.has('graph') ? fig(dGraph(p.given, p.y)) : ''),
    watch: (p) => dWatch(p, 'graph'),
  };
  const dampBack = {
    id: 'damp-back', difficulty: 3, kind: 'dback',
    title: () => L('Which formula?', 'Welche Formel?'),
    make: (r) => { const given = pick(r, Object.keys(BACK)), kinds = kindsOf(r, given, BACK); return kinds && { given, y: pick(r, ['x', 'y', 'z', 'u']), kinds }; },
    solve: (p) => ({ eq: p.given }),
    traps: [],
    fields: (p) => [choice('eq', L('Which formula belongs to the graph?', 'Welche Formel gehört zum Graphen?'), p.kinds.map((k) => [k, `$${DK[k].tex(p.y)}$`, k === p.given ? '' : formulaWhy(k, p.given), k === p.given ? null : DFLAG[k], k === p.given ? '' : formulaNudge(k)]), { stack: true })],
    text: (p) => L(`The graph shows the displacement ${p.y}(t) of a body. Which formula belongs to it (the constants are positive)?`, `Der Graph zeigt die Auslenkung ${p.y}(t) eines Körpers. Welche Formel gehört dazu (die Konstanten sind positiv)?`),
    hints: (p) => [
      L(`Read the graph first: do the maxima shrink by equal steps or by equal factors (fast at first, then ever more slowly), or steeply at first and then hardly at all? Are they evenly spaced?`, `Lies zuerst den Graphen: Schrumpfen die Maxima um gleiche Beträge oder um gleiche Faktoren (zuerst schnell, dann immer langsamer), oder zuerst steil und dann kaum noch? Liegen sie gleich weit auseinander?`),
      ...dHints(p.y).slice(0, 2),
    ],
    steps: (p) => [
      step(L('What the graph shows', 'Was der Graph zeigt'), p$(`${L('In the graph', 'Im Graphen')} ${GRAPH_IS()[p.given]}.`)),
      step(L('The formula', 'Die Formel'), p$(KIND_TEXT()[p.given]) + `$$${res(DK[p.given].tex(p.y))}$$`),
    ],
    figure: (p) => fig(dGraph(p.given, p.y)),
    watch: (p) => dWatch(p, 'eq'),
  };

  // ================================================================ 6 find the error
  // A student's sketch of y(t), let go at rest from y = A, six periods (T = 1 in the drawing): a
  // body on a spring in water (damping ∝ v) or a block on a spring on a rough table (a constant
  // friction force), with one flaw. Which feature is wrong?
  const E_END = 6, W0 = PI2;
  const RIGHT = { water: viscous(1, W0, 0.3), table: dry(1, W0, 0.09) };
  const FEATS = ['period', 'decay', 'centre', 'start', 'end'];
  const FLAWS = { water: ['shorter', 'longer', 'grows', 'shift', 'kink', 'stops'], table: ['shorter', 'longer', 'grows', 'shift', 'kink', 'never'] };
  const FEAT_OF = { shorter: 'period', longer: 'period', grows: 'decay', shift: 'centre', kink: 'start', stops: 'end', never: 'end' };
  // the sketch: the right motion, changed by the flaw (null: the right one); sketchFn: as t → y
  const sketch = (sys, flaw) => sample(sketchFn(sys, flaw), E_END, 360);
  function sketchFn(sys, flaw) {
    const y = (t) => RIGHT[sys](t).y;
    const f = {
      shorter: (t) => y(t + 0.08 * t * t),
      longer: (t) => y(t - 0.04 * t * t),
      grows: (t) => { const [b, h, w] = sys === 'table' ? [2, 2.2, 0.6] : [3, 1.4, 0.8]; return y(t) * (1 + h * Math.exp(-(((t - b) / w) ** 2))); },
      shift: (t) => 0.4 + 0.6 * y(t),
      kink: (t) => y(t + 0.14) / RIGHT[sys](0.14).y * 0.62,
      stops: (t) => y(Math.min(t, 2.5)),
      never: (t) => RIGHT.water(t).y,
    }[flaw];
    return f || y;
  }
  const eGraph = (p, view) => {
    const curves = [{ pts: sketch(p.sys, p.flaw) }];
    if (view.show && view.show.has('right')) curves.push({ pts: sketch(p.sys, null), cls: 'icurve' });
    return fig(Plot.graph(curves, { tEnd: E_END, axis: { lo: -1.2, hi: 1.2, step: 1 }, name: 'y', bare: true, label: view.show && view.show.has('right') ? L('The student’s sketch (solid) and the right graph (dashed)', 'Die Skizze der Schülerin (ausgezogen) und der richtige Graph (gestrichelt)') : L('A student’s sketch of y(t)', 'Die Skizze einer Schülerin von y(t)') }));
  };
  const FEAT_NAME = () => ({
    period: L('The period: the time from one maximum to the next', 'Die Periode: die Zeit von einem Maximum zum nächsten'),
    decay: L('How the amplitude changes', 'Wie sich die Amplitude ändert'),
    centre: L('The line it oscillates about', 'Die Linie, um die er schwingt'),
    start: L('The start at t = 0', 'Der Anfang bei t = 0'),
    end: L('How it ends', 'Wie die Bewegung endet'),
  });
  // a feature that is right in the sketch (of this system): why it is fine
  const FINE = (sys) => ({
    period: L('the maxima are evenly spaced: the period stays the same, as it must.', 'Die Maxima liegen gleich weit auseinander: Die Periode bleibt gleich, wie sie muss.'),
    decay: sys === 'water' ? L('the maxima shrink by the same factor every period, as with damping proportional to the velocity.', 'Die Maxima schrumpfen in jeder Periode um denselben Faktor, wie bei einer Dämpfung proportional zur Geschwindigkeit.')
      : L('the maxima shrink by the same step every period, as with a constant friction force.', 'Die Maxima schrumpfen in jeder Periode um denselben Betrag, wie bei einer konstanten Reibungskraft.'),
    centre: L('it oscillates symmetrically about the equilibrium 0.', 'Er schwingt symmetrisch um die Gleichgewichtslage 0.'),
    start: L('it starts at the top, at rest: the tangent at t = 0 is horizontal.', 'Er beginnt zuoberst, in Ruhe: Die Tangente bei t = 0 ist waagrecht.'),
    end: sys === 'water' ? L('it keeps oscillating with ever smaller swings: with damping proportional to the velocity it never stops completely.', 'Er schwingt mit immer kleineren Ausschlägen weiter: Mit einer Dämpfung proportional zur Geschwindigkeit hört er nie ganz auf.')
      : L('it stops after a few swings, at a turning point a little away from 0: with friction, the body sticks once the spring can no longer overcome the friction force. That is right.', 'Er bleibt nach einigen Schwingungen an einem Umkehrpunkt etwas neben 0 stehen: Mit Reibung bleibt der Körper haften, sobald die Feder die Reibungskraft nicht mehr überwinden kann. Das stimmt so.'),
  });
  // the flaw: what is wrong, and what is right instead
  const WRONG = (sys) => ({
    shorter: L('The maxima come closer and closer together: the period gets shorter. But damping does not change the period: a damped oscillation keeps its period (slightly longer than without damping, but the same from one swing to the next).', 'Die Maxima rücken immer näher zusammen: Die Periode wird kürzer. Die Dämpfung ändert die Periode aber nicht: Eine gedämpfte Schwingung behält ihre Periode (etwas länger als ohne Dämpfung, aber von Schwingung zu Schwingung gleich).'),
    longer: L('The maxima get farther and farther apart: the period gets longer. But damping does not change the period from one swing to the next: the maxima stay evenly spaced.', 'Die Maxima rücken immer weiter auseinander: Die Periode wird länger. Die Dämpfung ändert die Periode von Schwingung zu Schwingung aber nicht: Die Maxima bleiben gleich weit auseinander.'),
    grows: L('In the middle the amplitude grows again. Damping only takes energy away: the amplitude can only shrink.', 'In der Mitte wächst die Amplitude wieder. Die Dämpfung entzieht nur Energie: Die Amplitude kann nur schrumpfen.'),
    shift: L('It oscillates about a line above 0 and settles there. But 0 is the equilibrium, where the spring’s force is zero: the body oscillates about it and comes to rest there.', 'Er schwingt um eine Linie oberhalb von 0 und kommt dort zur Ruhe. 0 ist aber die Gleichgewichtslage, wo die Federkraft null ist: Der Körper schwingt um sie herum.'),
    kink: L('The sketch starts below A and already falling steeply. But the body is let go at rest at y = A: the graph starts at its top, with a horizontal tangent.', 'Die Skizze beginnt unterhalb von A und fällt schon steil ab. Der Körper wird aber bei y = A in Ruhe losgelassen: Der Graph beginnt zuoberst, mit waagrechter Tangente.'),
    stops: L('The body stops after a few swings, at a turning point away from 0. In water, the braking force is proportional to the velocity: at rest away from 0 nothing holds it against the spring, so it goes on oscillating, ever less, and never stops completely.', 'Der Körper bleibt nach einigen Schwingungen an einem Umkehrpunkt neben 0 stehen. Im Wasser ist die Bremskraft proportional zur Geschwindigkeit: In Ruhe neben 0 hält ihn nichts gegen die Feder, er schwingt also immer schwächer weiter und hört nie ganz auf.'),
    never: L('The body keeps swinging with ever smaller swings, the maxima shrinking by the same factor. With a constant friction force, though, the amplitude falls by the same step every period (4·F_R/D), and the body stops after a few swings.', 'Der Körper schwingt mit immer kleineren Ausschlägen weiter, die Maxima schrumpfen um denselben Faktor. Mit einer konstanten Reibungskraft fällt die Amplitude aber in jeder Periode um denselben Betrag (4·F_R/D), und der Körper bleibt nach einigen Schwingungen stehen.'),
  });
  const sysText = (sys) => (sys === 'water'
    ? L('A body hangs on a spring and dips into a beaker of water. It is pulled down to the displacement y = A from the equilibrium and let go at rest at t = 0; the water brakes it with a force proportional to its velocity.', 'Ein Körper hängt an einer Feder und taucht in ein Becherglas mit Wasser. Er wird bis zur Auslenkung y = A aus der Gleichgewichtslage gezogen und bei t = 0 in Ruhe losgelassen; das Wasser bremst ihn mit einer Kraft proportional zu seiner Geschwindigkeit.')
    : L('A block on a rough table is fixed to a horizontal spring. It is pulled out to the displacement y = A from the equilibrium and let go at rest at t = 0; the friction force F_R on it is constant (and as large as static friction).', 'Ein Klotz auf einem rauen Tisch ist an einer waagrechten Feder befestigt. Er wird bis zur Auslenkung y = A aus der Gleichgewichtslage gezogen und bei t = 0 in Ruhe losgelassen; die Reibungskraft F_R auf ihn ist konstant (und so gross wie die Haftreibung).'));
  const RULES = (sys) => (sys === 'water'
    ? L('In water: the period stays the same, the maxima shrink by the same factor every period, it oscillates about the equilibrium 0, starts at the top with a horizontal tangent and never stops completely.', 'Im Wasser: Die Periode bleibt gleich, die Maxima schrumpfen in jeder Periode um denselben Faktor, er schwingt um die Gleichgewichtslage 0, beginnt zuoberst mit waagrechter Tangente und hört nie ganz auf.')
    : L('With friction: the period stays the same, the maxima shrink by the same step every period, it oscillates about the equilibrium 0, starts at the top with a horizontal tangent and stops after a few swings at a turning point near 0.', 'Mit Reibung: Die Periode bleibt gleich, die Maxima schrumpfen in jeder Periode um denselben Betrag, er schwingt um die Gleichgewichtslage 0, beginnt zuoberst mit waagrechter Tangente und bleibt nach einigen Schwingungen an einem Umkehrpunkt nahe bei 0 stehen.'));
  const dampError = {
    id: 'damp-error', difficulty: 3, kind: 'derror',
    title: () => L('Find the error', 'Finde den Fehler'),
    make: (r) => {
      // (a sketch that never stops on the table also shrinks by factors: its decay is not offered)
      const sys = pick(r, ['water', 'table']), flaw = pick(r, FLAWS[sys]), right = FEAT_OF[flaw];
      const others = FEATS.filter((f) => f !== right && !(flaw === 'never' && f === 'decay'));
      return { sys, flaw, feats: shuffle(r, [right, ...shuffle(r, others).slice(0, 3)]) };
    },
    solve: (p) => ({ feat: FEAT_OF[p.flaw] }),
    traps: [],
    fields: (p) => [choice('feat', L('Which feature of the sketch is wrong?', 'Welches Merkmal der Skizze ist falsch?'), p.feats.map((f) => [f, FEAT_NAME()[f], f === FEAT_OF[p.flaw] ? '' : `${L('Not this:', 'Nicht das:')} ${FINE(p.sys)[f]}`, f === FEAT_OF[p.flaw] ? null : 'dshape']), { stack: true })],
    text: (p) => `${sysText(p.sys)} ${L('A student sketched its displacement y(t) (see the sketch). One feature of the sketch is wrong. Which one?', 'Eine Schülerin hat seine Auslenkung y(t) skizziert (siehe Skizze). Ein Merkmal der Skizze ist falsch. Welches?')}`,
    hints: (p) => [
      RULES(p.sys),
      L('Check the sketch feature by feature: the spacing of the maxima, how they shrink, the line it oscillates about, the start at t = 0 and the end.', 'Prüfe die Skizze Merkmal für Merkmal: den Abstand der Maxima, wie sie schrumpfen, die Linie, um die er schwingt, den Anfang bei t = 0 und das Ende.'),
      L(`Look closely at this: ${FEAT_NAME()[FEAT_OF[p.flaw]].toLowerCase()}.`, `Schau dir das genau an: ${FEAT_NAME()[FEAT_OF[p.flaw]]}.`),
    ],
    steps: (p) => [
      step(L('Feature by feature', 'Merkmal für Merkmal'), p$(RULES(p.sys))),
      step(`${L('Wrong', 'Falsch')}: ${FEAT_NAME()[FEAT_OF[p.flaw]]}`, p$(`<span class="result">${WRONG(p.sys)[p.flaw]}</span>`)),
      step(L('The right graph', 'Der richtige Graph'), p$(L('The dashed graph shows the motion as it really is.', 'Der gestrichelte Graph zeigt die Bewegung, wie sie wirklich ist.')), ['right']),
    ],
    figure: (p, v, view) => eGraph(p, view),
    watch: (p) => oscWatch({ kind: p.sys === 'table' ? 'table' : 'spring', fn: RIGHT[p.sys], amp: { y: 1, v: W0, a: W0 * W0 }, t1: E_END, unit: 'T', panels: ['y'], marks: () => [], keyOf: peakKeys,
      // the student's sketch beside the real motion, whatever the answer
      other: () => ({ key: 'sketch', f: sketchFn(p.sys, p.flaw), always: true, say: L('the student’s sketch', 'die Skizze der Schülerin') }) }),
  };

  // ================================================================ 6 the equation of motion
  // Four equations in one setting, one of them a damped oscillation: a body on a spring (m, D, b;
  // or with friction F_R), the standard form (δ, ω₀), or an LC circuit with a resistor. Then: which
  // term damps it?
  const SET = {
    mD: {
      right: { r1: (y) => `m\\cdot\\ddot ${y} = -D\\cdot ${y} - b\\cdot\\dot ${y}`, r2: (y) => `m\\cdot\\ddot ${y} + b\\cdot\\dot ${y} + D\\cdot ${y} = 0`, dry: (y) => `m\\cdot\\ddot ${y} = -D\\cdot ${y} - F_\\mathrm{R}\\cdot\\operatorname{sgn}(\\dot ${y})` },
      wrong: { antidamp: (y) => `m\\cdot\\ddot ${y} = -D\\cdot ${y} + b\\cdot\\dot ${y}`, noty: (y) => `m\\cdot\\ddot ${y} = -D\\cdot ${y} - b\\cdot ${y}`, norest: (y) => `m\\cdot\\ddot ${y} = -b\\cdot\\dot ${y}`, order: (y) => `b\\cdot\\dot ${y} = -D\\cdot ${y}`, shift: (y) => `m\\cdot\\ddot ${y} = -D\\cdot ${y} - F_\\mathrm{R}`, nodamp: (y) => `m\\cdot\\ddot ${y} = -D\\cdot ${y}` },
      terms: (y, dryOne) => ({ damp: dryOne ? `-F_\\mathrm{R}\\cdot\\operatorname{sgn}(\\dot ${y})` : `b\\cdot\\dot ${y}`, rest: `D\\cdot ${y}`, inert: `m\\cdot\\ddot ${y}` }),
    },
    norm: {
      right: { r3: (y) => `\\ddot ${y} + 2\\delta\\cdot\\dot ${y} + \\omega_0^2\\cdot ${y} = 0` },
      wrong: { antidamp: (y) => `\\ddot ${y} - 2\\delta\\cdot\\dot ${y} + \\omega_0^2\\cdot ${y} = 0`, noty: (y) => `\\ddot ${y} + 2\\delta\\cdot ${y} + \\omega_0^2\\cdot ${y} = 0`, norest: (y) => `\\ddot ${y} + 2\\delta\\cdot\\dot ${y} = 0`, order: (y) => `2\\delta\\cdot\\dot ${y} + \\omega_0^2\\cdot ${y} = 0`, nodamp: (y) => `\\ddot ${y} + \\omega_0^2\\cdot ${y} = 0` },
      terms: (y) => ({ damp: `2\\delta\\cdot\\dot ${y}`, rest: `\\omega_0^2\\cdot ${y}`, inert: `\\ddot ${y}` }),
    },
    lc: {
      right: { rlc: () => 'L\\cdot\\ddot Q + R\\cdot\\dot Q + \\frac{Q}{C} = 0' },
      wrong: { antidamp: () => 'L\\cdot\\ddot Q - R\\cdot\\dot Q + \\frac{Q}{C} = 0', noty: () => 'L\\cdot\\ddot Q + R\\cdot Q + \\frac{Q}{C} = 0', norest: () => 'L\\cdot\\ddot Q + R\\cdot\\dot Q = 0', order: () => 'R\\cdot\\dot Q + \\frac{Q}{C} = 0', nodamp: () => 'L\\cdot\\ddot Q + \\frac{Q}{C} = 0' },
      terms: () => ({ damp: 'R\\cdot\\dot Q', rest: '\\frac{Q}{C}', inert: 'L\\cdot\\ddot Q' }),
    },
  };
  const EQ_FLAG = { antidamp: 'antidamp', noty: 'noty', norest: 'norest', order: 'order', shift: 'shift', nodamp: 'nodamp' };
  // why a wrong equation is no damped oscillation (lc: in the words of the circuit)
  const EQ_WHY = (lc) => ({
    antidamp: lc ? L('With $-R\\cdot\\dot Q$ the resistor would feed energy into the circuit: the oscillation would grow. A resistor takes energy away: $+R\\cdot\\dot Q$, the voltage across it, adds to the others.', 'Mit $-R\\cdot\\dot Q$ würde der Widerstand dem Kreis Energie zuführen: Die Schwingung würde wachsen. Ein Widerstand entzieht Energie: $+R\\cdot\\dot Q$, die Spannung an ihm, kommt zu den anderen hinzu.')
      : L('Solved for the acceleration, the term with the velocity points along the motion: it pushes the body on, and the amplitude grows. A damping force points against the velocity.', 'Nach der Beschleunigung aufgelöst zeigt der Term mit der Geschwindigkeit in Bewegungsrichtung: Er stösst den Körper an, die Amplitude wächst. Eine Dämpfungskraft zeigt gegen die Geschwindigkeit.'),
    noty: lc ? L('$R\\cdot Q$ is proportional to the charge, not to the current: it would only act like a second capacitor. The voltage across a resistor is $R\\cdot I = R\\cdot\\dot Q$.', '$R\\cdot Q$ ist proportional zur Ladung, nicht zum Strom: Es wirkte nur wie ein zweiter Kondensator. Die Spannung an einem Widerstand ist $R\\cdot I = R\\cdot\\dot Q$.')
      : L('The extra term is proportional to the displacement, not to the velocity: it only adds to the spring’s force, like a stiffer spring. The motion is still harmonic, undamped.', 'Der zusätzliche Term ist proportional zur Auslenkung, nicht zur Geschwindigkeit: Er verstärkt nur die Federkraft, wie eine härtere Feder. Die Bewegung ist immer noch harmonisch, ungedämpft.'),
    norest: lc ? L('Without the capacitor’s voltage $Q/C$ nothing drives the charge back: the current dies away, but the charge never swings back. No oscillation.', 'Ohne die Spannung $Q/C$ des Kondensators treibt nichts die Ladung zurück: Der Strom klingt ab, aber die Ladung schwingt nie zurück. Keine Schwingung.')
      : L('Without a term with the displacement there is no restoring force: the body is braked until it stops, but never pulled back. No oscillation.', 'Ohne einen Term mit der Auslenkung gibt es keine rücktreibende Kraft: Der Körper wird gebremst, bis er stillsteht, aber nie zurückgezogen. Keine Schwingung.'),
    order: lc ? L('Without the coil, $L\\cdot\\ddot Q$, this is the discharge of a capacitor through a resistor: the charge falls exponentially to 0 and never swings back. No oscillation.', 'Ohne die Spule, $L\\cdot\\ddot Q$, ist das die Entladung eines Kondensators über einen Widerstand: Die Ladung fällt exponentiell auf 0 und schwingt nie zurück. Keine Schwingung.')
      : L('Without the second derivative there is no inertia: the body creeps back to 0 exponentially without overshooting. No oscillation.', 'Ohne die zweite Ableitung gibt es keine Trägheit: Der Körper kriecht exponentiell gegen 0, ohne darüber hinauszuschiessen. Keine Schwingung.'),
    shift: L('A constant force only shifts the equilibrium (to $-F_\\mathrm{R}/D$): around it the body oscillates harmonically, undamped. Friction must change its direction with the motion: $-F_\\mathrm{R}\\cdot\\operatorname{sgn}(\\dot y)$.', 'Eine konstante Kraft verschiebt nur die Gleichgewichtslage (nach $-F_\\mathrm{R}/D$): Um sie herum schwingt der Körper harmonisch, ungedämpft. Die Reibung muss ihre Richtung mit der Bewegung ändern: $-F_\\mathrm{R}\\cdot\\operatorname{sgn}(\\dot y)$.'),
    nodamp: lc ? L('Without a resistor nothing takes energy away: the undamped LC circuit, its amplitude stays the same.', 'Ohne Widerstand entzieht nichts Energie: der ungedämpfte Schwingkreis, seine Amplitude bleibt gleich.')
      : L('Nothing brakes the body: the undamped harmonic oscillation, with a constant amplitude.', 'Nichts bremst den Körper: die ungedämpfte harmonische Schwingung, mit konstanter Amplitude.'),
  });
  const TERM_WHY = (lc, dryOne) => ({
    rest: lc ? L('That is the voltage of the capacitor, the “spring” of the circuit: it drives the charge back and makes it oscillate.', 'Das ist die Spannung des Kondensators, die «Feder» des Kreises: Sie treibt die Ladung zurück und lässt sie schwingen.')
      : L('That is the restoring force (of the spring): it pulls the body back and makes it oscillate.', 'Das ist die rücktreibende Kraft (der Feder): Sie zieht den Körper zurück und lässt ihn schwingen.'),
    inert: lc ? L('That is the coil’s voltage, the inertia of the circuit: it keeps the current flowing, so the charge overshoots.', 'Das ist die Spannung der Spule, die Trägheit des Kreises: Sie hält den Strom aufrecht, die Ladung schiesst also über.')
      : L('That is the inertia (mass times acceleration): it makes the body overshoot the equilibrium.', 'Das ist die Trägheit (Masse mal Beschleunigung): Sie lässt den Körper über die Gleichgewichtslage hinausschiessen.'),
    damp: dryOne ? L('The friction force, always against the velocity, takes energy away.', 'Die Reibungskraft, immer gegen die Geschwindigkeit, entzieht Energie.') : '',
  });
  const dampEq = {
    id: 'damp-eq', difficulty: 3, kind: 'deq',
    title: () => L('Which one is damped?', 'Welche ist gedämpft?'),
    make: (r) => {
      const set = pick(r, ['mD', 'mD', 'norm', 'lc']), S = SET[set], right = pick(r, Object.keys(S.right));
      const wrong = shuffle(r, Object.keys(S.wrong)).slice(0, 3), y = set === 'lc' ? 'Q' : pick(r, ['x', 'y']);
      const order = shuffle(r, ['right', ...wrong]);
      return { set, right, wrong, y, order, terms: shuffle(r, ['damp', 'rest', 'inert']) };
    },
    solve: () => ({ which: 'right', term: 'damp' }),
    traps: [],
    fields: (p) => {
      const S = SET[p.set], lc = p.set === 'lc', dryOne = p.right === 'dry', tex = (k) => (k === 'right' ? S.right[p.right](p.y) : S.wrong[k](p.y)), T = S.terms(p.y, dryOne);
      return [
        choice('which', L('Which equation describes a damped oscillation?', 'Welche Gleichung beschreibt eine gedämpfte Schwingung?'), p.order.map((k) => [k, `$${tex(k)}$`, k === 'right' ? '' : EQ_WHY(lc)[k], k === 'right' ? null : EQ_FLAG[k]]), { stack: true }),
        choice('term', L('Which term damps it?', 'Welcher Term dämpft sie?'), p.terms.map((k) => [k, `$${T[k]}$`, k === 'damp' ? '' : TERM_WHY(lc, dryOne)[k], k === 'damp' ? null : 'dampterm']), { after: 'which' }),
      ];
    },
    // (the check asks only which one)
    text: (p, key) => (p.set === 'lc'
      ? L('An LC circuit has a resistor $R$; $Q$ is the charge on the capacitor. Only one of these equations describes its damped oscillation. Which one, and which term damps it?', 'Ein Schwingkreis hat einen Widerstand $R$; $Q$ ist die Ladung auf dem Kondensator. Nur eine dieser Gleichungen beschreibt seine gedämpfte Schwingung. Welche, und welcher Term dämpft sie?')
      : p.set === 'norm' ? L(`Only one of these equations describes a damped oscillation ($\\delta$ and $\\omega_0$ are positive constants). Which one, and which term damps it?`, `Nur eine dieser Gleichungen beschreibt eine gedämpfte Schwingung ($\\delta$ und $\\omega_0$ sind positive Konstanten). Welche, und welcher Term dämpft sie?`)
        : L(`A body of mass $m$ on a spring (spring constant $D$) moves; $b$ and $F_\\mathrm{R}$ are positive constants. Only one of these equations describes a damped oscillation. Which one, and which term damps it?`, `Ein Körper der Masse $m$ an einer Feder (Federkonstante $D$) bewegt sich; $b$ und $F_\\mathrm{R}$ sind positive Konstanten. Nur eine dieser Gleichungen beschreibt eine gedämpfte Schwingung. Welche, und welcher Term dämpft sie?`)).replace(key === 'which' ? /(, and which term damps it\?|, und welcher Term dämpft sie\?)$/ : /$^/, '?'),
    hints: (p) => {
      const lc = p.set === 'lc';
      return [
        lc ? L('A damped oscillation needs three things: the coil’s inertia ($L\\cdot\\ddot Q$), the capacitor that drives the charge back ($Q/C$), and a resistor that takes energy away.', 'Eine gedämpfte Schwingung braucht dreierlei: die Trägheit der Spule ($L\\cdot\\ddot Q$), den Kondensator, der die Ladung zurücktreibt ($Q/C$), und einen Widerstand, der Energie entzieht.')
          : L('A damped oscillation needs three things: inertia (the second derivative), a restoring force proportional to the displacement, and a force against the velocity.', 'Eine gedämpfte Schwingung braucht dreierlei: Trägheit (die zweite Ableitung), eine rücktreibende Kraft proportional zur Auslenkung und eine Kraft gegen die Geschwindigkeit.'),
        lc ? L('The voltage across the resistor is $R\\cdot I = R\\cdot\\dot Q$: with which sign do the three voltages add up to zero?', 'Die Spannung am Widerstand ist $R\\cdot I = R\\cdot\\dot Q$: Mit welchem Vorzeichen ergeben die drei Spannungen zusammen null?')
          : L('Solve each equation for the second derivative: is there a term with the first derivative, and does it point against the velocity (a minus sign on the right)? A term with the displacement itself does not damp.', 'Löse jede Gleichung nach der zweiten Ableitung auf: Gibt es einen Term mit der ersten Ableitung, und zeigt er gegen die Geschwindigkeit (ein Minus rechts)? Ein Term mit der Auslenkung selbst dämpft nicht.'),
      ];
    },
    steps: (p) => {
      const S = SET[p.set], lc = p.set === 'lc', tex = (k) => (k === 'right' ? S.right[p.right](p.y) : S.wrong[k](p.y)), T = S.terms(p.y, p.right === 'dry');
      const ok = lc ? L('the coil’s inertia, the capacitor driving the charge back and the resistor taking energy away: a damped oscillation.', 'die Trägheit der Spule, der Kondensator, der die Ladung zurücktreibt, und der Widerstand, der Energie entzieht: eine gedämpfte Schwingung.')
        : p.right === 'dry' ? L('inertia, the spring’s restoring force and a friction force against the velocity: a damped oscillation, whose amplitude falls by the same step every period.', 'Trägheit, die rücktreibende Federkraft und eine Reibungskraft gegen die Geschwindigkeit: eine gedämpfte Schwingung, deren Amplitude in jeder Periode um denselben Betrag fällt.')
          : L('inertia, the spring’s restoring force and a force against the velocity: a damped oscillation, whose amplitude falls exponentially.', 'Trägheit, die rücktreibende Federkraft und eine Kraft gegen die Geschwindigkeit: eine gedämpfte Schwingung, deren Amplitude exponentiell abklingt.');
      return [
        step(L('One by one', 'Eine nach der anderen'), `<ul class="eqlist">${p.order.map((k) => `<li>$${tex(k)}$: ${k === 'right' ? `<span class="result">${ok}</span>` : EQ_WHY(lc)[k]}</li>`).join('')}</ul>`),
        step(L('The damping term', 'Der Dämpfungsterm'), p$(L(`The term $${res(T.damp)}$ damps the oscillation: it ${lc ? 'is the voltage across the resistor, which turns electrical energy into heat' : 'acts against the velocity and turns the energy of the oscillation into heat'}.`, `Der Term $${res(T.damp)}$ dämpft die Schwingung: ${lc ? 'Er ist die Spannung am Widerstand, der elektrische Energie in Wärme umwandelt' : 'Er wirkt gegen die Geschwindigkeit und wandelt die Energie der Schwingung in Wärme um'}.`))),
      ];
    },
    figure: () => '',
  };

  // ================================================================ 7 how fast: δ and τ from a graph
  // A body on a spring, damped ∝ v, let go at rest from A₀: the graph with numbers over n + 1
  // periods, the peaks P (t = 0) and Q (n periods later) marked, their heights given. δ = ln(P/Q)/(n·T)
  // (the heights as shown: the motion is made to fit them), τ = 1/δ.
  const readMotion = (p) => { const d = Math.log(p.A0 / p.An) / (p.n * p.T), wd = PI2 / p.T; return { d, w0: Math.sqrt(wd * wd + d * d) }; };
  const readFn = (p) => { const m = readMotion(p); return viscous(p.A0, m.w0, m.d); };
  function readGraph(p, view) {
    const f = readFn(p), m = readMotion(p), tEnd = (p.n + 1) * p.T, A = p.A0 * 100;
    const curves = [{ pts: sample((t) => 100 * f(t).y, tEnd, 400) }];
    if (view.show && view.show.has('env')) for (const s of [1, -1]) curves.push({ pts: sample((t) => s * A * Math.exp(-m.d * t), tEnd, 100), cls: 'icurve' });
    return fig(Plot.graph(curves, { tEnd, tStep: tEnd / p.T <= 10 ? p.T : undefined, name: 'y', unit: 'cm', axis: Plot.niceAxis([-A, A]),
      points: [[0, A, 'P', false], [p.n * p.T, p.An * 100, 'Q', false]], label: L('The displacement of the damped body against time, with the peaks P and Q', 'Die Auslenkung des gedämpften Körpers gegen die Zeit, mit den Spitzen P und Q') }));
  }
  const decayRead = {
    id: 'decay-read', difficulty: 2, kind: 'dread',
    title: () => L('How fast does it die away?', 'Wie schnell klingt sie ab?'),
    make: (r) => {
      const T = pick(r, [0.5, 0.8, 1, 1.2, 1.5, 1.6, 2, 2.5]), n = pick(r, [2, 3, 4]), A0 = pick(r, [4, 5, 6, 8, 10]) / 100, kq = pick(r, [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]);
      const An = sig(100 * A0 * kq ** n, 2) / 100;
      return An >= 0.006 && An < A0 ? { T, n, A0, An } : null;
    },
    solve: (p, o = {}) => {
      const ratio = p.A0 / p.An, span = o.per ? p.T : p.n * p.T, right = Math.log(ratio) / (p.n * p.T);
      const delta = o.noln ? ratio / span : o.log10 ? Math.log10(ratio) / span : o.diff ? (1 - 1 / ratio) / span : Math.log(ratio) / span;
      return { delta, tau: o.half ? Math.LN2 / right : 1 / delta };
    },
    traps: ['noln', 'log10', 'per', 'diff', 'half'],
    why: {
      noln: () => L('The ratio itself is not δ·t: from $A_Q/A_P = e^{-\\delta\\, t}$ follows $\\delta\\cdot t = \\ln(A_P/A_Q)$. Take the logarithm.', 'Das Verhältnis selbst ist nicht δ·t: Aus $A_Q/A_P = e^{-\\delta\\, t}$ folgt $\\delta\\cdot t = \\ln(A_P/A_Q)$. Nimm den Logarithmus.'),
      log10: () => L('The base is e, not 10: use the natural logarithm ln.', 'Die Basis ist e, nicht 10: Verwende den natürlichen Logarithmus ln.'),
      per: () => L('P and Q are several periods apart: the time between them is n·T, not one period.', 'P und Q liegen mehrere Perioden auseinander: Die Zeit zwischen ihnen ist n·T, nicht eine Periode.'),
      diff: () => L('With damping proportional to the velocity the amplitude does not fall by equal steps, but by equal factors: use the ratio of the peaks and its logarithm.', 'Mit einer Dämpfung proportional zur Geschwindigkeit fällt die Amplitude nicht um gleiche Beträge, sondern um gleiche Faktoren: Verwende das Verhältnis der Spitzen und seinen Logarithmus.'),
      half: () => L('That is the half-life of the amplitude, ln 2/δ. The time constant is τ = 1/δ: in that time the amplitude falls to 1/e ≈ 37 %.', 'Das ist die Halbwertszeit der Amplitude, ln 2/δ. Die Zeitkonstante ist τ = 1/δ: In dieser Zeit fällt die Amplitude auf 1/e ≈ 37 %.'),
    },
    nudge: {
      noln: () => L('Is the ratio of the peaks equal to δ·t? Write $A_Q = A_P\\cdot e^{-\\delta\\, t}$ and solve for δ.', 'Ist das Verhältnis der Spitzen gleich δ·t? Schreib $A_Q = A_P\\cdot e^{-\\delta\\, t}$ und löse nach δ auf.'),
      per: () => L('How much time passes from P to Q? Count the periods on the graph.', 'Wie viel Zeit vergeht von P bis Q? Zähle die Perioden auf dem Graphen.'),
      half: () => L('In the time τ = 1/δ, to what fraction does the amplitude fall: to a half, or to 1/e?', 'Auf welchen Bruchteil fällt die Amplitude in der Zeit τ = 1/δ: auf die Hälfte oder auf 1/e?'),
    },
    fields: () => [num$('delta', '\\delta', 's⁻¹', L('damping coefficient', 'Abklingkonstante')), num$('tau', '\\tau', 's', L('time constant', 'Zeitkonstante'))],
    text: (p, key) => L(`A body on a spring oscillates, damped by a force proportional to its velocity, so its amplitude falls as $A(t) = A_P\\cdot e^{-\\delta\\, t}$. The graph shows its displacement; the peaks P and Q are $A_P = ${tq(p.A0, 'cm', 2)}$ and $A_Q = ${tq(p.An, 'cm', 2)}$ high. ${{ delta: 'What is the damping coefficient δ?', tau: 'What is the time constant τ = 1/δ?' }[key] || 'What are the damping coefficient δ and the time constant τ = 1/δ?'}`,
      `Ein Körper an einer Feder schwingt, gedämpft durch eine Kraft proportional zu seiner Geschwindigkeit; seine Amplitude fällt also wie $A(t) = A_P\\cdot e^{-\\delta\\, t}$. Der Graph zeigt seine Auslenkung; die Spitzen P und Q sind $A_P = ${tq(p.A0, 'cm', 2)}$ und $A_Q = ${tq(p.An, 'cm', 2)}$ hoch. ${{ delta: 'Wie gross ist die Abklingkonstante δ?', tau: 'Wie gross ist die Zeitkonstante τ = 1/δ?' }[key] || 'Wie gross sind die Abklingkonstante δ und die Zeitkonstante τ = 1/δ?'}`),
    hints: (p) => [
      L('Read off the graph how much time passes from P to Q: count the periods and read the period T on the time axis.', 'Lies am Graphen ab, wie viel Zeit von P bis Q vergeht: Zähle die Perioden und lies die Periode T auf der Zeitachse ab.'),
      L('$A_Q = A_P\\cdot e^{-\\delta\\, t}$, with t the time from P to Q. Divide by $A_P$ and take the natural logarithm: $\\ln(A_P/A_Q) = \\delta\\cdot t$.', '$A_Q = A_P\\cdot e^{-\\delta\\, t}$, mit t der Zeit von P bis Q. Teile durch $A_P$ und nimm den natürlichen Logarithmus: $\\ln(A_P/A_Q) = \\delta\\cdot t$.'),
      L(`Here $t = ${p.n}\\cdot T$. Then τ = 1/δ.`, `Hier ist $t = ${p.n}\\cdot T$. Dann ist τ = 1/δ.`),
    ],
    steps: (p, v) => [
      step(L('From P to Q', 'Von P bis Q'), p$(L(`On the graph, Q is ${p.n} periods after P, and one period is $T = ${tq(p.T, 's')}$: so $t = ${p.n}\\cdot T = ${tq(p.n * p.T, 's')}$.`, `Auf dem Graphen liegt Q ${p.n} Perioden nach P, und eine Periode ist $T = ${tq(p.T, 's')}$: also $t = ${p.n}\\cdot T = ${tq(p.n * p.T, 's')}$.`))),
      step(L('The damping coefficient', 'Die Abklingkonstante'), p$(L('The peaks lie on the curve $A_P\\cdot e^{-\\delta t}$ (dashed): every period, the amplitude shrinks by the same factor.', 'Die Spitzen liegen auf der Kurve $A_P\\cdot e^{-\\delta t}$ (gestrichelt): In jeder Periode schrumpft die Amplitude um denselben Faktor.')) +
        `$$A_Q = A_P\\cdot e^{-\\delta\\, t}\\quad\\Longrightarrow\\quad \\delta = \\frac{\\ln(A_P/A_Q)}{t} = \\frac{\\ln(${tnum(p.A0 * 100, 2)}/${tnum(p.An * 100, 2)})}{${tq(p.n * p.T, 's')}} = ${res(tq(v.delta, 's⁻¹'))}$$`, ['env']),
      step(L('The time constant', 'Die Zeitkonstante'), `$$\\tau = \\frac{1}{\\delta} = ${res(tq(v.tau, 's'))}$$` + p$(L(`In the time τ the amplitude falls to 1/e ≈ 37 % of its value. Here δ is much smaller than ω₀ ≈ 2π/T = ${OC.num(PI2 / p.T)} s⁻¹: the damping is weak.`, `In der Zeit τ fällt die Amplitude auf 1/e ≈ 37 % ihres Werts. Hier ist δ viel kleiner als ω₀ ≈ 2π/T = ${OC.num(PI2 / p.T)} s⁻¹: Die Dämpfung ist schwach.`)), ['env']),
    ],
    figure: (p, v, view) => readGraph(p, view),
    watch: (p) => {
      const m = readMotion(p), tEnd = (p.n + 1) * p.T;
      return oscWatch({ kind: 'spring', fn: readFn(p), amp: { y: p.A0, v: p.A0 * m.w0, a: p.A0 * m.w0 * m.w0 }, t1: tEnd, unit: 's', panels: ['y'], units: { y: 'cm', v: speedUnit(p.A0 * m.w0), a: 'm/s²' },
        marks: (w, get) => { const x = get('delta'); return typeof x !== 'number' || !(x > 0) ? [] : [numMark('delta', 'y', p.n * p.T, inUnit(p.A0 * Math.exp(-x * p.n * p.T), 'cm'), `${yourAnswer()}: <i>δ</i> = ${OC.num(x)} s⁻¹, ${L('the peak at Q', 'die Spitze bei Q')}`)]; },
        // the peaks P and Q of the exercise's graph
        keyOf: (w) => [{ say: L(`the peaks P and Q, ${p.n} periods apart: the amplitude falls from ${OC.num(p.A0 * 100)} cm to ${OC.num(p.An * 100)} cm`, `die Spitzen P und Q, ${p.n} Perioden auseinander: Die Amplitude fällt von ${OC.num(p.A0 * 100)} cm auf ${OC.num(p.An * 100)} cm`),
          pts: [kpt(w, 'y', 0, 'P'), kpt(w, 'y', p.n * p.T, 'Q')] }] });
    },
  };

  // ================================================================ 7 from the equation
  // ω₀, δ and τ read off an equation: ÿ + 2δ·ẏ + ω₀²·y = 0 with numbers, a body on a spring braked
  // by F = −b·v (δ = b/(2m), ω₀ = √(D/m)), or an LC circuit with a resistor (δ = R/(2L),
  // ω₀ = 1/√(LC)). Weak damping only (δ ≤ ω₀/4).
  const pq = (x, u) => `${tnum(x)}\\,\\mathrm{${u}}`;
  function eqNums(p) {
    if (p.set === 'norm') return { w0: p.w0, d: p.d };
    if (p.set === 'mD') return { w0: Math.sqrt(p.D / p.m), d: p.b / (2 * p.m) };
    return { w0: 1 / Math.sqrt(p.L * p.C), d: p.R / (2 * p.L) };
  }
  const tauUnit = (p) => (1 / eqNums(p).d < 0.1 ? 'ms' : 's');
  const eqTex = (p) => (p.set === 'norm' ? `\\ddot y + ${pq(2 * p.d, 's^{-1}')}\\cdot\\dot y + ${pq(p.w0 * p.w0, 's^{-2}')}\\cdot y = 0`
    : p.set === 'mD' ? 'm\\cdot\\ddot y + b\\cdot\\dot y + D\\cdot y = 0' : 'L\\cdot\\ddot Q + R\\cdot\\dot Q + \\frac{Q}{C} = 0');
  const decayEq = {
    id: 'decay-eq', difficulty: 2, kind: 'deqnum',
    title: () => L('From the equation', 'Aus der Gleichung'),
    make: (r) => {
      const set = pick(r, ['norm', 'mD', 'lc']);
      const p = set === 'norm' ? { set, w0: pick(r, [2, 3, 4, 5, 6, 8, 10, 12, 15, 20]), d: pick(r, [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2]) }
        : set === 'mD' ? { set, m: pick(r, [0.1, 0.2, 0.25, 0.5, 0.8, 1, 1.5, 2]), D: pick(r, [5, 10, 20, 40, 50, 80, 100, 200]), b: pick(r, [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.8, 1]) }
          : { set, L: pick(r, [1, 2, 5, 9, 10, 20, 50]) / 1000, C: pick(r, [10, 22, 47, 100, 150, 220, 470]) * 1e-9, R: pick(r, [1, 2, 5, 10, 20, 50, 100]) };
      const n = eqNums(p);
      return n.d <= n.w0 / 4 ? p : null;
    },
    solve: (p, o = {}) => {
      const n = eqNums(p), d = o.two ? 2 * n.d : o.mass ? p.b / 2 : n.d;
      return { w0: o.root ? n.w0 * n.w0 : n.w0, delta: d, tau: 1 / d };
    },
    traps: ['two', 'root', 'mass'],
    why: {
      two: () => L('The damping term is 2δ·ẏ: δ is half the factor in front of ẏ (once the equation is divided by the factor in front of ÿ).', 'Der Dämpfungsterm ist 2δ·ẏ: δ ist die Hälfte des Faktors vor ẏ (nachdem die Gleichung durch den Faktor vor ÿ geteilt ist).'),
      root: () => L('The factor in front of y is ω₀², not ω₀: take the square root.', 'Der Faktor vor y ist ω₀², nicht ω₀: Zieh die Wurzel.'),
      mass: () => L('First divide the equation by m, the factor in front of ÿ: then the factor in front of ẏ is b/m = 2δ.', 'Teile die Gleichung zuerst durch m, den Faktor vor ÿ: Dann ist der Faktor vor ẏ gleich b/m = 2δ.'),
    },
    nudge: {
      two: () => L('Compare with ÿ + 2δ·ẏ + ω₀²·y = 0: is the factor in front of ẏ equal to δ or to 2δ?', 'Vergleiche mit ÿ + 2δ·ẏ + ω₀²·y = 0: Ist der Faktor vor ẏ gleich δ oder gleich 2δ?'),
      root: () => L('Compare with ÿ + 2δ·ẏ + ω₀²·y = 0: is the factor in front of y equal to ω₀ or to ω₀²?', 'Vergleiche mit ÿ + 2δ·ẏ + ω₀²·y = 0: Ist der Faktor vor y gleich ω₀ oder gleich ω₀²?'),
    },
    fields: (p) => [{ ...num$('w0', '\\omega_0', 'rad/s', L('angular frequency without damping', 'Kreisfrequenz ohne Dämpfung')), sci: p.set === 'lc' }, num$('delta', '\\delta', 's⁻¹', L('damping coefficient', 'Abklingkonstante')), num$('tau', '\\tau', tauUnit(p), L('time constant', 'Zeitkonstante'))],
    text: (p, key) => {
      const ask = { w0: L('What is ω₀?', 'Wie gross ist ω₀?'), delta: L('What is the damping coefficient δ?', 'Wie gross ist die Abklingkonstante δ?'), tau: L('What is the time constant τ = 1/δ?', 'Wie gross ist die Zeitkonstante τ = 1/δ?') }[key]
        || L('What are ω₀, the damping coefficient δ and the time constant τ = 1/δ?', 'Wie gross sind ω₀, die Abklingkonstante δ und die Zeitkonstante τ = 1/δ?');
      if (p.set === 'norm') return `${L('A damped oscillation obeys the equation below. Compare it with $\\ddot y + 2\\delta\\cdot\\dot y + \\omega_0^2\\cdot y = 0$.', 'Eine gedämpfte Schwingung gehorcht der Gleichung unten. Vergleiche sie mit $\\ddot y + 2\\delta\\cdot\\dot y + \\omega_0^2\\cdot y = 0$.')} ${ask}`;
      if (p.set === 'mD') return `${L(`A body of mass $m = ${pq(p.m, 'kg')}$ on a spring ($D = ${pq(p.D, 'N/m')}$) is braked by a force $F = -b\\cdot v$ with $b = ${pq(p.b, 'kg/s')}$; it obeys the equation below.`, `Ein Körper der Masse $m = ${pq(p.m, 'kg')}$ an einer Feder ($D = ${pq(p.D, 'N/m')}$) wird durch eine Kraft $F = -b\\cdot v$ mit $b = ${pq(p.b, 'kg/s')}$ gebremst; er gehorcht der Gleichung unten.`)} ${ask}`;
      return `${L(`An LC circuit with $L = ${pq(p.L * 1e3, 'mH')}$, $C = ${pq(p.C * 1e9, 'nF')}$ and a resistor $R = ${pq(p.R, '\\Omega')}$ obeys the equation below.`, `Ein Schwingkreis mit $L = ${pq(p.L * 1e3, 'mH')}$, $C = ${pq(p.C * 1e9, 'nF')}$ und einem Widerstand $R = ${pq(p.R, '\\Omega')}$ gehorcht der Gleichung unten.`)} ${ask}`;
    },
    hints: (p) => [
      p.set === 'norm' ? L('The factor in front of ÿ is already 1: read off the factors in front of ẏ and y.', 'Der Faktor vor ÿ ist schon 1: Lies die Faktoren vor ẏ und y ab.')
        : L(`Divide the equation by ${p.set === 'mD' ? 'm' : 'L'}, the factor in front of the second derivative, to bring it into the form ÿ + 2δ·ẏ + ω₀²·y = 0.`, `Teile die Gleichung durch ${p.set === 'mD' ? 'm' : 'L'}, den Faktor vor der zweiten Ableitung, um sie in die Form ÿ + 2δ·ẏ + ω₀²·y = 0 zu bringen.`),
      L('The factor in front of ẏ is 2δ (so δ is half of it); the factor in front of y is ω₀² (so take the root).', 'Der Faktor vor ẏ ist 2δ (δ ist also die Hälfte davon); der Faktor vor y ist ω₀² (zieh also die Wurzel).'),
      L('The time constant is τ = 1/δ.', 'Die Zeitkonstante ist τ = 1/δ.'),
    ],
    steps: (p, v) => {
      const std = p.set === 'norm' ? eqTex(p) : p.set === 'mD' ? '\\ddot y + \\frac{b}{m}\\cdot\\dot y + \\frac{D}{m}\\cdot y = 0' : '\\ddot Q + \\frac{R}{L}\\cdot\\dot Q + \\frac{1}{L\\,C}\\cdot Q = 0';
      const read = p.set === 'norm' ? `2\\delta = ${pq(2 * p.d, 's^{-1}')},\\qquad \\omega_0^2 = ${pq(p.w0 * p.w0, 's^{-2}')}`
        : p.set === 'mD' ? '2\\delta = \\frac{b}{m},\\qquad \\omega_0^2 = \\frac{D}{m}' : '2\\delta = \\frac{R}{L},\\qquad \\omega_0^2 = \\frac{1}{L\\,C}';
      const sol = p.set === 'norm' ? `\\omega_0 = ${res(tq(v.w0, 'rad/s'))},\\qquad \\delta = ${res(tq(v.delta, 's⁻¹'))}`
        : p.set === 'mD' ? `\\omega_0 = \\sqrt{\\frac{D}{m}} = ${res(tq(v.w0, 'rad/s'))},\\qquad \\delta = \\frac{b}{2m} = ${res(tq(v.delta, 's⁻¹'))}`
          : `\\omega_0 = \\frac{1}{\\sqrt{L\\,C}} = ${res(tq(v.w0, 'rad/s'))},\\qquad \\delta = \\frac{R}{2L} = ${res(tq(v.delta, 's⁻¹'))}`;
      return [
        step(L('The standard form', 'Die Normalform'), (p.set === 'norm' ? '' : p$(L(`Divide by ${p.set === 'mD' ? '$m$' : '$L$'}:`, `Teile durch ${p.set === 'mD' ? '$m$' : '$L$'}:`))) + `$$${std}$$` + p$(L('Compare with $\\ddot y + 2\\delta\\cdot\\dot y + \\omega_0^2\\cdot y = 0$:', 'Vergleiche mit $\\ddot y + 2\\delta\\cdot\\dot y + \\omega_0^2\\cdot y = 0$:')) + `$$${read}$$`),
        step(L('ω₀ and δ', 'ω₀ und δ'), `$$${sol}$$`),
        step(L('The time constant', 'Die Zeitkonstante'), `$$\\tau = \\frac{1}{\\delta} = ${res(tq(v.tau, tauUnit(p)))}$$` + p$(L('δ is much smaller than ω₀: the damping is weak, and the body oscillates with almost the period 2π/ω₀, its amplitude falling to 1/e in every time τ.', 'δ ist viel kleiner als ω₀: Die Dämpfung ist schwach, und der Körper schwingt fast mit der Periode 2π/ω₀, wobei seine Amplitude in jeder Zeit τ auf 1/e fällt.'))),
      ];
    },
    figure: (p) => box(eqTex(p)),
  };

  // ================================================================ 7 amplitude and energy
  // E = ½·D·A²: the energy goes with the square of the amplitude.
  const pc = (x) => `${OC.num(100 * x)}\u00a0%`;
  const decayEnergy = {
    id: 'decay-energy', difficulty: 2, kind: 'denergy',
    title: () => L('Amplitude and energy', 'Amplitude und Energie'),
    make: (r) => {
      const ask = pick(r, ['left', 'loss', 'halve']);
      return ask === 'left' ? { ask, x: pick(r, [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) } : ask === 'loss' ? { ask, x: pick(r, [0.02, 0.04, 0.05, 0.08, 0.1, 0.15, 0.2, 0.25]) } : { ask, x: pick(r, [0.05, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3]) };
    },
    solve: (p, o = {}) => {
      const x = p.x;
      if (p.ask === 'left') return { e: o.same ? x : o.sqrt ? Math.sqrt(x) : x * x };
      if (p.ask === 'loss') return { e: o.same ? x : o.add ? 2 * x : 1 - (1 - x) ** 2 };
      return { e: o.halfamp ? Math.LN2 / -Math.log(1 - x) : o.lin ? 0.25 / x : Math.LN2 / (-2 * Math.log(1 - x)) };
    },
    traps: ['same', 'sqrt', 'add', 'halfamp', 'lin'],
    why: {
      same: () => L('The energy does not go like the amplitude, but like its square: E = ½·D·A².', 'Die Energie geht nicht wie die Amplitude, sondern wie ihr Quadrat: E = ½·D·A².'),
      sqrt: () => L('The other way round: E ∝ A², so the energy changes by the square of the amplitude’s factor, not its root.', 'Umgekehrt: E ∝ A², die Energie ändert sich also um das Quadrat des Faktors der Amplitude, nicht um seine Wurzel.'),
      add: () => L('Per cent losses do not add up: the energy is multiplied by (1 − q)², which is not 1 − 2q.', 'Prozentuale Verluste addieren sich nicht: Die Energie wird mit (1 − q)² multipliziert, und das ist nicht 1 − 2q.'),
      halfamp: () => L('That is when the amplitude is halved. The energy goes with A²: it is halved when the amplitude has fallen to 1/√2 ≈ 71 %.', 'Dann ist die Amplitude halbiert. Die Energie geht mit A²: Sie ist halbiert, wenn die Amplitude auf 1/√2 ≈ 71 % gefallen ist.'),
      lin: () => L('The losses are not the same amount every period, but the same fraction: the energy is multiplied by (1 − q)² each period.', 'Die Verluste sind nicht in jeder Periode gleich gross, sondern derselbe Bruchteil: Die Energie wird in jeder Periode mit (1 − q)² multipliziert.'),
    },
    fields: (p) => [p.ask === 'left' ? num$('e', 'E/E_0', '%', L('energy left', 'verbleibende Energie')) : p.ask === 'loss' ? num$('e', '\\Delta E/E', '%', L('energy lost per period', 'Energieverlust pro Periode')) : num$('e', 'n', '', L('number of periods', 'Anzahl Perioden'))],
    text: (p) => ({
      left: L(`The amplitude of a damped oscillation has fallen to ${pc(p.x)} of its starting value. What fraction of the energy of the oscillation is left?`, `Die Amplitude einer gedämpften Schwingung ist auf ${pc(p.x)} ihres Anfangswerts gefallen. Welcher Bruchteil der Schwingungsenergie ist noch übrig?`),
      loss: L(`In every period, the amplitude of a damped oscillation decreases by ${pc(p.x)}. By how many per cent does its energy decrease in every period?`, `In jeder Periode nimmt die Amplitude einer gedämpften Schwingung um ${pc(p.x)} ab. Um wie viel Prozent nimmt ihre Energie in jeder Periode ab?`),
      halve: L(`In every period, the amplitude of a damped oscillation decreases by ${pc(p.x)}. After how many periods is its energy halved?`, `In jeder Periode nimmt die Amplitude einer gedämpften Schwingung um ${pc(p.x)} ab. Nach wie vielen Perioden ist ihre Energie halbiert?`),
    }[p.ask]),
    hints: (p) => [
      L('The energy of an oscillation is E = ½·D·A²: it goes with the square of the amplitude.', 'Die Energie einer Schwingung ist E = ½·D·A²: Sie geht mit dem Quadrat der Amplitude.'),
      p.ask === 'left' ? L('If the amplitude is multiplied by a factor k, the energy is multiplied by k².', 'Wird die Amplitude mit einem Faktor k multipliziert, wird die Energie mit k² multipliziert.')
        : L(`Every period the amplitude is multiplied by ${OC.num(1 - p.x)}, so the energy by ${OC.num(1 - p.x)}².`, `In jeder Periode wird die Amplitude mit ${OC.num(1 - p.x)} multipliziert, die Energie also mit ${OC.num(1 - p.x)}².`),
      ...(p.ask === 'halve' ? [L(`After n periods the energy is multiplied by ${OC.num(1 - p.x)}^(2n). Set this equal to 1/2 and solve for n with the logarithm.`, `Nach n Perioden ist die Energie mit ${OC.num(1 - p.x)}^(2n) multipliziert. Setz das gleich 1/2 und löse mit dem Logarithmus nach n auf.`)] : []),
    ],
    steps: (p, v) => {
      const k = OC.num(1 - p.x);
      const s0 = step(L('Energy and amplitude', 'Energie und Amplitude'), p$(L('At a turning point all the energy is in the spring: E = ½·D·A². So the energy goes with the square of the amplitude.', 'An einem Umkehrpunkt steckt die ganze Energie in der Feder: E = ½·D·A². Die Energie geht also mit dem Quadrat der Amplitude.')));
      if (p.ask === 'left') return [s0, step(L('The energy left', 'Die verbleibende Energie'), `$$\\frac{E}{E_0} = \\left(\\frac{A}{A_0}\\right)^2 = ${tnum(p.x)}^2 = ${res(tq(v.e, '%'))}$$`)];
      if (p.ask === 'loss') return [s0, step(L('One period', 'Eine Periode'), `$$\\frac{E_1}{E_0} = ${k.replace('−', '-')}^2 = ${tnum(sig((1 - p.x) ** 2, 4))}\\qquad\\Longrightarrow\\qquad \\frac{\\Delta E}{E} = 1 - ${tnum(sig((1 - p.x) ** 2, 4))} = ${res(tq(v.e, '%'))}$$`)];
      return [s0, step(L('Half the energy', 'Die halbe Energie'), `$$${k}^{2n} = \\frac{1}{2}\\qquad\\Longrightarrow\\qquad n = \\frac{\\ln 2}{-2\\,\\ln ${k}} = ${res(tnum(v.e))}$$` + p$(L('The amplitude is then 1/√2 ≈ 71 % of what it was.', 'Die Amplitude ist dann 1/√2 ≈ 71 % so gross wie am Anfang.')))];
    },
    figure: () => '',
  };

  // ================================================================ 7 weak, critical, strong
  // One system (ω₀ = 2π: times in periods), let go at rest from y = A: no damping, weak (δ = 0.1·ω₀),
  // critical (δ = ω₀) and strong damping (δ = 3·ω₀). Which graph is which; which damping a shock
  // absorber or a meter needs; and whether an LC circuit with a resistor oscillates (R against
  // R_c = 2·√(L/C), where δ = R/(2L) = ω₀).
  const REG_D = { none: 0, weak: 0.1, crit: 1, over: 3 }, R_END = 3;
  const regFn = (k) => viscous(1, PI2, REG_D[k] * PI2);
  const regGraph = (k) => Plot.graph([{ pts: sample((t) => regFn(k)(t).y, R_END, 300) }], { tEnd: R_END, axis: { lo: -1.2, hi: 1.2, step: 1 }, name: 'y', bare: true, label: L('A graph of the motion', 'Ein Graph der Bewegung') });
  const REG_NAME = () => ({
    none: L('undamped: it oscillates with a constant amplitude', 'ungedämpft: Er schwingt mit konstanter Amplitude'),
    weak: L('weakly damped: it oscillates, its amplitude shrinking', 'schwach gedämpft: Er schwingt, seine Amplitude schrumpft'),
    crit: L('critically damped: it returns to 0 as fast as possible without overshooting', 'aperiodischer Grenzfall: Er kehrt so schnell wie möglich nach 0 zurück, ohne überzuschwingen'),
    over: L('overdamped: it creeps back to 0 without overshooting, but slowly', 'Kriechfall (starke Dämpfung): Er kriecht ohne Überschwingen nach 0 zurück, aber langsam'),
  });
  const REG_IS = () => ({
    none: L('This one oscillates with a constant amplitude: no damping.', 'Diese schwingt mit konstanter Amplitude: keine Dämpfung.'),
    weak: L('This one oscillates with a shrinking amplitude: weak damping (δ < ω₀). It crosses 0 first, but swings on.', 'Diese schwingt mit schrumpfender Amplitude: schwache Dämpfung (δ < ω₀). Sie kreuzt 0 zuerst, schwingt aber weiter.'),
    crit: L('This one returns to 0 fastest without overshooting: critical damping (δ = ω₀).', 'Diese kehrt am schnellsten nach 0 zurück, ohne überzuschwingen: der aperiodische Grenzfall (δ = ω₀).'),
    over: L('This one creeps back to 0 without overshooting, but more slowly: strong damping (δ > ω₀). More damping does not bring it back faster.', 'Diese kriecht ohne Überschwingen nach 0 zurück, aber langsamer: starke Dämpfung (δ > ω₀). Mehr Dämpfung bringt sie nicht schneller zurück.'),
  });
  const USES = () => ({
    shock: L('A car’s shock absorbers should bring the car body back to rest as fast as possible after a bump, without bouncing.', 'Die Stossdämpfer eines Autos sollen die Karosserie nach einer Bodenwelle so schnell wie möglich zur Ruhe bringen, ohne nachzuschwingen.'),
    meter: L('The needle of an analogue meter should settle on its reading as fast as possible, without swinging about it.', 'Der Zeiger eines analogen Messgeräts soll sich so schnell wie möglich auf seinen Wert einstellen, ohne um ihn herumzuschwingen.'),
    door: L('A door closer should shut the door as fast as possible without letting it slam and bounce back.', 'Ein Türschliesser soll die Tür so schnell wie möglich schliessen, ohne dass sie zuschlägt und zurückprallt.'),
  });
  const REG_ORDER = ['none', 'weak', 'crit', 'over'];
  const Rc = (p) => 2 * Math.sqrt(p.L / p.C);
  const regRight = (p) => (p.ask === 'lc' ? (p.R < Rc(p) ? 'weak' : 'over') : p.ask === 'over' ? 'over' : 'crit');
  const decayRegime = {
    id: 'decay-regime', difficulty: 3, kind: 'dregime',
    title: () => L('Weak, critical, strong', 'Schwach, Grenzfall, stark'),
    make: (r) => {
      const ask = pick(r, ['crit', 'over', 'fast', 'use', 'lc', 'lc']);
      if (ask === 'use') return { ask, use: pick(r, ['shock', 'meter', 'door']), kinds: REG_ORDER };
      if (ask === 'lc') {
        const p = { ask, L: pick(r, [5, 9, 20]) / 1000, C: pick(r, [47, 150, 470]) * 1e-9, kinds: REG_ORDER };
        return { ...p, R: sig(Rc(p) * pick(r, [0.1, 0.2, 0.3, 0.5, 2, 3, 5]), 2) };
      }
      return { ask, kinds: shuffle(r, REG_ORDER.slice()) };
    },
    solve: (p) => ({ reg: regRight(p) }),
    traps: [],
    fields: (p) => {
      const graphs = ['crit', 'over', 'fast'].includes(p.ask), right = regRight(p);
      const what = { crit: L('Which graph shows critical damping?', 'Welcher Graph zeigt den aperiodischen Grenzfall?'), over: L('Which graph shows strong damping (overdamped)?', 'Welcher Graph zeigt starke Dämpfung (Kriechfall)?'),
        fast: L('Which body comes to rest at the equilibrium fastest?', 'Welcher Körper kommt am schnellsten in der Gleichgewichtslage zur Ruhe?'), use: L('Which damping is best?', 'Welche Dämpfung ist am besten?'),
        lc: L('What does the charge on the capacitor do?', 'Was macht die Ladung auf dem Kondensator?') }[p.ask];
      return [choice('reg', what, p.kinds.map((k) => [k, graphs ? regGraph(k) : cap(REG_NAME()[k]), k === right ? '' : REG_IS()[k], k === right ? null : 'regime']), graphs ? { pics: true } : { stack: true })];
    },
    text: (p) => {
      if (p.ask === 'use') return USES()[p.use];
      if (p.ask === 'lc') return L(`An LC circuit with $L = ${pq(p.L * 1e3, 'mH')}$ and $C = ${pq(p.C * 1e9, 'nF')}$ has a resistor $R = ${pq(p.R, '\\Omega')}$. The capacitor is charged, and at t = 0 the circuit is closed.`, `Ein Schwingkreis mit $L = ${pq(p.L * 1e3, 'mH')}$ und $C = ${pq(p.C * 1e9, 'nF')}$ hat einen Widerstand $R = ${pq(p.R, '\\Omega')}$. Der Kondensator ist geladen, und bei t = 0 wird der Kreis geschlossen.`);
      return L('Four bodies on equal springs, damped differently, are let go at rest from y = A at the same time.', 'Vier Körper an gleichen Federn, verschieden stark gedämpft, werden gleichzeitig bei y = A in Ruhe losgelassen.');
    },
    hints: (p) => {
      const base = L('With weak damping (δ < ω₀) the body oscillates, its amplitude shrinking; at critical damping (δ = ω₀) it just no longer overshoots and returns fastest; with strong damping (δ > ω₀) it creeps back, the more slowly the stronger the damping.', 'Bei schwacher Dämpfung (δ < ω₀) schwingt der Körper mit schrumpfender Amplitude; im aperiodischen Grenzfall (δ = ω₀) schwingt er gerade nicht mehr über und kehrt am schnellsten zurück; bei starker Dämpfung (δ > ω₀) kriecht er zurück, umso langsamer, je stärker die Dämpfung.');
      if (p.ask === 'lc') return [L('Compare δ = R/(2L) with ω₀ = 1/√(LC).', 'Vergleiche δ = R/(2L) mit ω₀ = 1/√(LC).'), base, L('δ = ω₀ for the critical resistance $R_\\mathrm{c} = 2\\sqrt{L/C}$: is R smaller or larger?', 'δ = ω₀ gilt für den Grenzwiderstand $R_\\mathrm{c} = 2\\sqrt{L/C}$: Ist R kleiner oder grösser?')];
      if (p.ask === 'use') return [L('It should come to rest fast, and it should not swing.', 'Es soll schnell zur Ruhe kommen, und es soll nicht schwingen.'), base];
      return [base, L('Which graphs cross 0? Of the others, which returns to 0 faster?', 'Welche Graphen kreuzen 0? Welcher der anderen kehrt schneller nach 0 zurück?')];
    },
    steps: (p) => {
      const right = regRight(p);
      if (p.ask === 'lc') {
        const w0 = 1 / Math.sqrt(p.L * p.C), d = p.R / (2 * p.L);
        return [
          step(L('δ and ω₀', 'δ und ω₀'), `$$\\delta = \\frac{R}{2L} = ${tq(d, 's⁻¹')},\\qquad \\omega_0 = \\frac{1}{\\sqrt{L\\,C}} = ${tq(w0, 'rad/s')}$$` + p$(L(`Or with the critical resistance, where δ = ω₀: $R_\\mathrm{c} = 2\\sqrt{L/C} = ${pq(sig(Rc(p), 3), '\\Omega')}$.`, `Oder mit dem Grenzwiderstand, bei dem δ = ω₀: $R_\\mathrm{c} = 2\\sqrt{L/C} = ${pq(sig(Rc(p), 3), '\\Omega')}$.`))),
          step(L('Weak or strong?', 'Schwach oder stark?'), p$(right === 'weak' ? L(`δ < ω₀ (R < R_c): the damping is weak, the charge <span class="result">oscillates with a shrinking amplitude</span>.`, `δ < ω₀ (R < R_c): Die Dämpfung ist schwach, die Ladung <span class="result">schwingt mit schrumpfender Amplitude</span>.`)
            : L(`δ > ω₀ (R > R_c): the damping is strong, the charge <span class="result">creeps to 0 without oscillating</span>.`, `δ > ω₀ (R > R_c): Die Dämpfung ist stark, die Ladung <span class="result">kriecht ohne zu schwingen gegen 0</span>.`))),
        ];
      }
      if (p.ask === 'use') return [step(L('The best damping', 'Die beste Dämpfung'), p$(L('Weak damping would let it swing; strong damping would bring it back only slowly. The best is <span class="result">critical damping</span> (in practice slightly less): it returns fastest without overshooting.', 'Schwache Dämpfung liesse es schwingen; starke Dämpfung brächte es nur langsam zurück. Am besten ist der <span class="result">aperiodische Grenzfall</span> (in der Praxis etwas weniger): Er kehrt am schnellsten zurück, ohne überzuschwingen.')))];
      return [step(L('The four kinds of damping', 'Die vier Fälle'), `<ul class="eqlist">${REG_ORDER.map((k) => `<li>${k === right ? `<span class="result">${cap(REG_NAME()[k])}</span>` : cap(REG_NAME()[k])}</li>`).join('')}</ul>`), step(L('The graph', 'Der Graph'), p$(L('So the graph is <span class="result">this one</span>:', 'Der Graph ist also <span class="result">dieser</span>:')), ['graph'])];
    },
    figure: (p, v, view) => (view.show && view.show.has('graph') ? fig(regGraph(regRight(p))) : ''),
    watch: (p) => (['crit', 'over', 'fast'].includes(p.ask) ? oscWatch({ kind: 'spring', fn: regFn(regRight(p)), amp: { y: 1, v: PI2, a: PI2 * PI2 }, t1: R_END, unit: 'T', panels: ['y'],
      marks: (w, get) => { const k = get('reg'); return REG_D[k] != null && p.kinds.includes(k) ? curveMarks(w, 'reg', (t) => regFn(k)(t).y, [0.25, 0.6, 1.5], 0.06, yourGraph()) : []; },
      other: (w, get) => { const k = get('reg'); return REG_D[k] != null && p.kinds.includes(k) ? { key: 'reg', f: (t) => regFn(k)(t).y, say: yourGraph() } : null; },
      keyOf: peakKeys }) : null),
  };

  root.Damping = { viscous, dry, dryTurns, DK, dCurve, AX, T_END, RIGHT, sketch, FEAT_OF, SET };
  Sc.SCENARIOS.push(dampMatch, dampBack, dampError, dampEq, decayRead, decayEq, decayEnergy, decayRegime);
  if (typeof module !== 'undefined') module.exports = root.Damping;
})(typeof window !== 'undefined' ? window : globalThis);
