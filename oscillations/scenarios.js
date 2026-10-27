// The exercise types of the app. Each:
//   { id, difficulty, title(p), make(r) → parameters p (or null: draw again), solve(p, o) → values v
//     (SI; with a flag of traps set in o: the result of that wrong idea), traps: [flag],
//     why: { flag: () => text }, fields(p, v) → [field], text(p), hints(p, v), steps(p, v) → [{ text,
//     show: [keys] }], figure(p, v, view) }
// A field is a number { key, type: 'num', sym, unit, what, signed } (its value in the unit), or a
// choice { key, type: 'choice', what, ask (for the check), options: [[value, html, why, flag]],
// after (shown once the field of that key is right), pics (the options are graphs) }; the value of
// a choice comes from v[key].
// view: { task: true } the task; { show: Set } the keys of what a step adds to the figure.
//
//   the pointer      circle (an SHM as the shadow of a turning pointer: which graph?)
//   SHM or not       pick-shm, shm-1 … shm-3
//   equation, graph  match-1, match-2 (an equation and four graphs), match-back (a graph and four
//                    equations)
//   where on y(t)    points (the point where v or a is largest, zero, positive or negative)
//   kinematics       vmax, back-w, back-A
//   LC circuit       lc-eq (the same equation: which quantity is which, ω and T, when the
//                    current is largest), lc-scale (f when L or C change)
// A type may have watch(p, v) → the run to watch once the exercise is solved (oscWatch, below).
(function (root) {
  'use strict';

  const OC = root.OC || require('./core.js');
  const Eq = root.Equations || require('./equations.js');
  const Plot = root.Plot || require('./plot.js');
  const { L, pick, shuffle, tnum, q, tq, sig, speedUnit, rng, inUnit } = OC;
  const { MISTAKES, PWHY, PNUDGE, FORMS, byId } = Eq;

  // ---------------------------------------------------------------- helpers
  const step = (rule, html, show = []) => ({ text: `<p class="step-rule">${rule}</p>${html}`, show });
  const p$ = (s) => `<p>${s}</p>`;
  const res = (x) => `\\htmlClass{result}{${x}}`;
  const num$ = (key, sym, unit, what, signed = false) => ({ key, type: 'num', sym, unit, what, signed });
  const choice = (key, what, options, o = {}) => ({ key, type: 'choice', what, options, ...o });
  const box = (tex) => `<div class="eqbox">$$${tex}$$</div>`;
  const PI2 = 2 * Math.PI;

  // ================================================================ 0 the pointer
  // A pointer of length A turns anticlockwise at the angular velocity ω; its angle from the top is
  // ωt − φ₀, so at t = 0 it is short of the top by the initial phase φ₀ = k·π/4 (clockwise from the
  // top; φ₀ = 0: at the top). A body is always at the height of its tip: y = A·cos(ωt − φ₀), an
  // SHM. Which graph (no numbers, two periods)? The wrong ones: the pointer turning the other way,
  // its shadow on the horizontal axis, a start opposite or a quarter turn off.
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  // k·π/4 as TeX
  function piTex(k) {
    if (k === 0) return '0';
    const g = gcd(Math.abs(k), 4), n = k / g, d = 4 / g, sg = n < 0 ? '-' : '', a = Math.abs(n);
    return d === 1 ? `${sg}${a === 1 ? '' : a}\\pi` : `${sg}\\frac{${a === 1 ? '' : a}\\pi}{${d}}`;
  }
  // the displacement over A at u periods, for each graph offered
  const CIRCLE = {
    right: (u, phi) => Math.cos(PI2 * u - phi),
    turn: (u, phi) => Math.cos(PI2 * u + phi),
    proj: (u, phi) => -Math.sin(PI2 * u - phi),
    start: (u, phi) => -Math.cos(PI2 * u - phi),
    late: (u, phi) => Math.sin(PI2 * u - phi),
  };
  const CFLAG = { right: null, turn: 'turn', proj: 'proj', start: 'start', late: 'start' };
  const circlePts = (kind, phi) => Array.from({ length: 241 }, (z, j) => { const u = (j * 2) / 240; return [u, CIRCLE[kind](u, phi)]; });
  const circleGraph = (kind, phi) => Plot.graph([{ pts: circlePts(kind, phi) }], { tEnd: 2, axis: { lo: -1.4, hi: 1.4, step: 1 }, name: 'y', bare: true, label: L('A graph of the displacement against time', 'Ein Graph der Auslenkung gegen die Zeit') });
  const circleWhy = () => ({
    turn: L('This is the shadow of a pointer turning the other way, clockwise. The arrow ω shows it turning anticlockwise.', 'Das ist der Schatten eines Zeigers, der sich andersherum dreht, im Uhrzeigersinn. Der Pfeil ω zeigt: Er dreht sich im Gegenuhrzeigersinn.'),
    proj: L('This is the shadow on the horizontal axis. The body is at the height of the tip: its shadow on the vertical axis.', 'Das ist der Schatten auf der horizontalen Achse. Der Körper ist auf der Höhe der Spitze: ihr Schatten auf der vertikalen Achse.'),
    start: L('This one starts at the opposite point of the circle, at the height −y(0).', 'Diese beginnt im gegenüberliegenden Punkt des Kreises, auf der Höhe −y(0).'),
    late: L('This one starts a quarter turn away from where the pointer is at t = 0.', 'Diese beginnt eine Vierteldrehung von dort entfernt, wo der Zeiger bei t = 0 steht.'),
  });
  // the nudges in practice where the reason above would give the right graph away
  const circleNudge = () => ({
    turn: L('This is the shadow of a pointer turning clockwise. Which way does the arrow ω show it turning?', 'Das ist der Schatten eines Zeigers, der sich im Uhrzeigersinn dreht. Wie herum dreht er sich laut dem Pfeil ω?'),
    proj: L('This is the shadow on the horizontal axis. The body is at the height of the tip: on which axis is the shadow that shows its height?', 'Das ist der Schatten auf der horizontalen Achse. Der Körper ist auf der Höhe der Spitze: Auf welcher Achse liegt der Schatten, der diese Höhe zeigt?'),
  });
  // where the tip is at t = 0 (y = cos φ₀ up, c = sin φ₀ to the right), and which way it goes next
  // (it rises where sin φ₀ > 0)
  function startOf(k) {
    const phi = (k * Math.PI) / 4, y = Math.cos(phi), c = Math.sin(phi), y0 = Math.abs(y) < 1e-9 ? '0' : Math.abs(Math.abs(y) - 1) < 1e-9 ? (y > 0 ? 'A' : '-A') : `${y > 0 ? '' : '-'}0.71\\,A`;
    const where = Math.abs(c) < 1e-9 ? (y > 0 ? L('at the top', 'zuoberst') : L('at the bottom', 'zuunterst'))
      : Math.abs(y) < 1e-9 ? (c > 0 ? L('on the right, at the height of the centre', 'rechts, auf der Höhe des Mittelpunkts') : L('on the left, at the height of the centre', 'links, auf der Höhe des Mittelpunkts'))
        : y > 0 ? L('above the centre', 'oberhalb des Mittelpunkts') : L('below the centre', 'unterhalb des Mittelpunkts');
    const next = Math.abs(c) < 1e-9 ? (y > 0 ? L('the body is at its upper turning point and goes down next: the graph starts at a crest', 'der Körper ist am oberen Umkehrpunkt und bewegt sich als Nächstes nach unten: Der Graph beginnt in einem Berg') : L('the body is at its lower turning point and goes up next: the graph starts at a trough', 'der Körper ist am unteren Umkehrpunkt und bewegt sich als Nächstes nach oben: Der Graph beginnt in einem Tal'))
      : c > 0 ? L('turning anticlockwise, the tip rises: the graph starts upwards', 'im Gegenuhrzeigersinn steigt die Spitze: Der Graph beginnt aufwärts') : L('turning anticlockwise, the tip sinks: the graph starts downwards', 'im Gegenuhrzeigersinn sinkt die Spitze: Der Graph beginnt abwärts');
    return { y0, where, next };
  }
  const circle = {
    id: 'circle', difficulty: 1, kind: 'circle',
    title: () => L('The turning pointer', 'Der drehende Zeiger'),
    make: (r) => {
      const k = pick(r, [-3, -2, -1, 0, 1, 2, 3, 4]), phi = (k * Math.PI) / 4, kept = [];
      for (const kind of ['right', ...shuffle(r, ['turn', 'proj', 'start']), 'late']) {
        const c = circlePts(kind, phi);
        if (kept.length < 4 && !kept.some(([, d]) => Plot.alike(c, d, 2.8))) kept.push([kind, c]);
      }
      return kept.length === 4 ? { k, kinds: shuffle(r, kept.map((x) => x[0])) } : null;
    },
    solve: () => ({ graph: 'right' }),
    traps: [],
    fields: (p) => [choice('graph', L('Which graph shows y(t)?', 'Welcher Graph zeigt y(t)?'), p.kinds.map((k) => [k, circleGraph(k, (p.k * Math.PI) / 4), k === 'right' ? '' : circleWhy()[k], CFLAG[k], circleNudge()[k]]), { pics: true, ask: L('Which graph shows the displacement y(t) of the body?', 'Welcher Graph zeigt die Auslenkung y(t) des Körpers?') })],
    text: () => L('A pointer of length A turns anticlockwise at a constant angular velocity ω; the figure shows it at t = 0. A body moves up and down so that it is always at the height of the pointer’s tip. Which graph shows its displacement y(t)?',
      'Ein Zeiger der Länge A dreht sich mit konstanter Winkelgeschwindigkeit ω im Gegenuhrzeigersinn; die Figur zeigt ihn bei t = 0. Ein Körper bewegt sich so auf und ab, dass er immer auf der Höhe der Zeigerspitze ist. Welcher Graph zeigt seine Auslenkung y(t)?'),
    hints: (p) => [
      L(`In the figure the pointer starts at the initial phase $\\varphi_0 = ${piTex(p.k)}$: the angle by which it is short of the top, measured clockwise from the top. Where is its tip at $t = 0$: above the centre, below it, or at its height?`, `In der Figur startet der Zeiger bei der Anfangsphase $\\varphi_0 = ${piTex(p.k)}$: dem Winkel, um den er die Spitze des Kreises noch nicht erreicht hat, im Uhrzeigersinn von oben gemessen. Wo ist seine Spitze bei $t = 0$: oberhalb des Mittelpunkts, unterhalb oder auf seiner Höhe?`),
      L(`The displacement is the height of the tip, its shadow on the vertical axis: $y(t) = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$, so at the start $y(0) = A\\cdot\\cos\\varphi_0$, with the initial phase of the figure.`, `Die Auslenkung ist die Höhe der Spitze, ihr Schatten auf der vertikalen Achse: $y(t) = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$, am Anfang also $y(0) = A\\cdot\\cos\\varphi_0$, mit der Anfangsphase der Figur.`),
      L(`Now turn the pointer a little further anticlockwise from $${piTex(p.k)}$: does the tip rise or sink? Look for the graph that starts at the height $y(0)$ and goes that way.`, `Dreh den Zeiger nun von $${piTex(p.k)}$ aus ein wenig weiter im Gegenuhrzeigersinn: Steigt oder sinkt die Spitze? Suche den Graphen, der auf der Höhe $y(0)$ beginnt und in diese Richtung geht.`),
    ],
    steps: (p) => {
      const s0 = startOf(p.k);
      return [
        step(L('The shadow of the pointer', 'Der Schatten des Zeigers'), p$(L('The pointer turns evenly: its angle from the top grows as $\\varphi = \\omega\\, t - \\varphi_0$, where the initial phase $\\varphi_0$ is how far it is short of the top at $t = 0$. The body is at the height of the tip, so', 'Der Zeiger dreht sich gleichmässig: Sein Winkel von oben gemessen wächst wie $\\varphi = \\omega\\, t - \\varphi_0$, wobei die Anfangsphase $\\varphi_0$ angibt, wie weit er bei $t = 0$ noch vor der Spitze des Kreises steht. Der Körper ist auf der Höhe der Spitze, also')) +
          '$$y(t) = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$$' + p$(L('a harmonic oscillation. Its amplitude is the length $A$ of the pointer, its angular frequency is the angular velocity $\\omega$ of the pointer, and one period $T = 2\\pi/\\omega$ is one turn.', 'eine harmonische Schwingung. Ihre Amplitude ist die Länge $A$ des Zeigers, ihre Kreisfrequenz die Winkelgeschwindigkeit $\\omega$ des Zeigers, und eine Periode $T = 2\\pi/\\omega$ ist eine Umdrehung.')), ['angle']),
        step(L('At the start', 'Am Anfang'), p$(L(`At $t = 0$ the initial phase is $\\varphi_0 = ${piTex(p.k)}$: the tip is ${s0.where}, $y(0) = A\\cdot\\cos\\varphi_0 = ${s0.y0}$. And ${s0.next}.`, `Bei $t = 0$ ist die Anfangsphase $\\varphi_0 = ${piTex(p.k)}$: Die Spitze ist ${s0.where}, $y(0) = A\\cdot\\cos\\varphi_0 = ${s0.y0}$. Und ${s0.next}.`) + (p.k === 0 ? L(' Starting at the top, the initial phase is zero and the graph is a plain cosine: $y(t) = A\\cdot\\cos(\\omega\\, t)$.', ' Von zuoberst aus ist die Anfangsphase null und der Graph ein reiner Kosinus: $y(t) = A\\cdot\\cos(\\omega\\, t)$.') : '')), ['angle']),
        step(L('The graph', 'Der Graph'), p$(L('So the graph is <span class="result">this one</span>; after one turn of the pointer, it starts again.', 'Der Graph ist also <span class="result">dieser</span>; nach einer Umdrehung des Zeigers beginnt er von vorn.')), ['angle', 'graph']),
      ];
    },
    figure: (p, v, view) => {
      const phi = (p.k * Math.PI) / 4, sh = view.show || new Set();
      return root.Figures.pointer(Math.PI / 2 - phi, { angle: sh.has('angle') }) + (sh.has('graph') ? `<div class="fig">${circleGraph('right', phi)}</div>` : '');
    },
  };

  // ================================================================ 1 SHM or not
  // An equation (see equations.js) with the numbers for its graph.
  const formsOf = (filter) => FORMS.filter(filter);
  function eqMake(r, forms) {
    const eq = Eq.make(r, pick(r, forms));
    return { eq, P: Eq.numbers(r) };
  }
  const isShm = (p) => byId(p.eq.form).shm;

  // the graph of an equation's motion for its sample numbers: three periods (or as long)
  function eqGraph(p, o = {}) {
    const f = byId(p.eq.form), P = { ...p.P, c: f.id === 'Tform' ? 3 : p.P.c };
    const T = f.shm ? f.period(P) : PI2 / P.c;
    const tEnd = Math.max(1, Math.round(2.5 * T));
    const pts = Eq.trace(f.motion(P), tEnd, 240, 1);
    const ys = pts.map((t) => t[1]).filter((y) => Math.abs(y) < 50);
    const span = Math.max(1.2, ...ys.map(Math.abs));
    return Plot.graph([{ pts }], { tEnd, name: Plot.plain(p.eq.y), axis: Plot.niceAxis([-span, span]), label: L('The motion for sample numbers', 'Die Bewegung für Beispielzahlen'), ...o });
  }

  // the answers: yes or no, then the period or the mistake
  // where a shifted SHM oscillates around: x₀ = g/c² (ODE) or B (solution)
  const eqm = (p) => { const s = Eq.sym(p.eq); return p.eq.form === 'shift' ? `${s.y}_0 = \\frac{g}{${s.c}^2}` : `${s.y}_0 = B`; };
  // the wrong answer carries the idea behind it: a shifted equilibrium taken for no SHM, or the
  // mistake not seen
  const yesNo = (p) => {
    const f = byId(p.eq.form), again = L('Bring it into the form ÿ = −ω²·y (or compare the solution with y = A·cos(ωt − φ₀)) and look again.', 'Bring sie in die Form ÿ = −ω²·y (oder vergleiche die Lösung mit y = A·cos(ωt − φ₀)) und schau nochmals.');
    const noFlag = f.shifted ? 'shift' : f.kind === 'ode' && f.level >= 2 ? 'form' : null;
    return [['yes', L('yes', 'ja'), again, f.shm ? null : f.mistake], ['no', L('no', 'nein'), f.shifted ? L(`A constant only shifts the equilibrium, here to $${eqm(p)}$: around it, the motion is harmonic.`, `Eine Konstante verschiebt nur die Gleichgewichtslage, hier nach $${eqm(p)}$: Um sie herum ist die Bewegung harmonisch.`) : again, f.shm ? noFlag : null,
      f.shifted ? L('What does the constant do? Write the displacement from a shifted equilibrium and look at the equation it obeys.', 'Was bewirkt die Konstante? Schreib die Auslenkung von einer verschobenen Gleichgewichtslage aus und schau, welche Gleichung sie erfüllt.') : '']];
  };
  function periodField(p, after, r) {
    const f = byId(p.eq.form), [right, ...wrong] = f.T(Eq.sym(p.eq));
    const opts = [['right', `$T = ${right}$`, '', null], ...wrong.map(([tex, flag]) => [flag, `$T = ${tex}$`, PWHY[flag](), flag, PNUDGE[flag]()])];
    return choice('T', L('Its period:', 'Ihre Periode:'), shuffle(r, opts), { after, ask: L('It describes an SHM. What is its period?', 'Sie beschreibt eine harmonische Schwingung. Wie gross ist ihre Periode?') });
  }
  // What is wrong: the real mistake, and three features the equation really has, but which are
  // harmless (blaming them is the wrong idea: flag 'form'). Each feature says why it is fine.
  const ODE_NO = ['plus', 'first', 'square', 'const', 'damp', 'plusinv', 'cube'];
  function decoys(eq) {
    const f = byId(eq.form), s = Eq.sym(eq), id = f.id, has = (list) => list.includes(id), out = [];
    const add = (key, short, why) => out.push([key, short, why]);
    if (has(ODE_NO)) add('csq', L(`The constant appears squared: $${s.c}^2$.`, `Die Konstante steht im Quadrat: $${s.c}^2$.`),
      L(`That is fine: in $\\ddot y = -\\omega^2\\cdot y$ the constant is squared too. Writing it as $${s.c}^2$ only makes sure it is positive.`, `Das ist in Ordnung: Auch in $\\ddot y = -\\omega^2\\cdot y$ steht die Konstante im Quadrat. Als $${s.c}^2$ geschrieben ist sie sicher positiv.`));
    if (has(['first', 'square', 'const', 'cube'])) add('minus', L('The minus sign on the right-hand side.', 'Das Minuszeichen auf der rechten Seite.'),
      L('The minus sign is right: the acceleration must point back towards the equilibrium.', 'Das Minuszeichen ist richtig: Die Beschleunigung muss zur Gleichgewichtslage zurück zeigen.'));
    if (has(['plus', 'square', 'const', 'damp', 'plusinv', 'cube'])) add('second', L('It contains the second derivative.', 'Sie enthält die zweite Ableitung.'),
      L('That is right: an equation of motion links the acceleration, the second derivative, to the displacement.', 'Das ist richtig: Eine Bewegungsgleichung verknüpft die Beschleunigung, die zweite Ableitung, mit der Auslenkung.'));
    if (has(['damp', 'plusinv'])) add('zero', L('All terms stand on one side (= 0).', 'Alle Terme stehen auf einer Seite (= 0).'),
      L('Rearranging changes nothing: $\\ddot y + \\omega^2\\cdot y = 0$ is the same as $\\ddot y = -\\omega^2\\cdot y$.', 'Umformen ändert nichts: $\\ddot y + \\omega^2\\cdot y = 0$ ist dasselbe wie $\\ddot y = -\\omega^2\\cdot y$.'));
    if (eq.note === 'leib') add('leib', L(`The derivative is written as $\\frac{\\mathrm{d}^2${s.y}}{\\mathrm{d}t^2}$.`, `Die Ableitung ist als $\\frac{\\mathrm{d}^2${s.y}}{\\mathrm{d}t^2}$ geschrieben.`),
      L(`Only another way of writing: $\\frac{\\mathrm{d}^2${s.y}}{\\mathrm{d}t^2} = \\ddot{${s.y}}$.`, `Nur eine andere Schreibweise: $\\frac{\\mathrm{d}^2${s.y}}{\\mathrm{d}t^2} = \\ddot{${s.y}}$.`));
    if (has(['tsq', 'amp', 'expamp'])) add('cos', L('A cosine instead of a sine.', 'Ein Kosinus statt eines Sinus.'),
      L('A cosine is a sine shifted in time: both describe harmonic oscillations.', 'Ein Kosinus ist ein zeitlich verschobener Sinus: Beide beschreiben harmonische Schwingungen.'));
    if (has(['amp', 'expamp'])) add('targ', L(`The argument $${s.c}\\cdot t$ grows with time.`, `Das Argument $${s.c}\\cdot t$ wächst mit der Zeit.`),
      L('It must: in an SHM, the phase ω·t grows evenly with time.', 'Das muss es: Bei einer harmonischen Schwingung wächst die Phase ω·t gleichmässig mit der Zeit.'));
    if (has(['tsq'])) add('aconst', L('The factor $A$ in front stays the same.', 'Der Faktor $A$ vorne bleibt gleich.'),
      L('That is right: an SHM has a constant amplitude.', 'Das ist richtig: Eine harmonische Schwingung hat eine konstante Amplitude.'));
    add('name', eq.y === 'x' ? L(`The letter $${s.c}$ instead of $\\omega$.`, `Der Buchstabe $${s.c}$ statt $\\omega$.`) : L(`The letters $${s.y}$ and $${s.c}$ instead of $x$ and $\\omega$.`, `Die Buchstaben $${s.y}$ und $${s.c}$ statt $x$ und $\\omega$.`),
      L('The names do not matter, only the form of the equation.', 'Die Namen spielen keine Rolle, nur die Form der Gleichung.'));
    return out;
  }
  function mistakeField(p, after, r) {
    const right = byId(p.eq.form).mistake;
    // a feature that is there to see (its notation) first, then any of the others
    const all = shuffle(r, decoys(p.eq)), wrong = [...all.filter((d) => d[0] === 'leib'), ...all.filter((d) => d[0] !== 'leib')].slice(0, 3);
    const opts = [[right, MISTAKES[right].short(), '', null], ...wrong.map(([key, short, why]) => [key, short, why, 'form'])];
    return choice('mistake', L('What is wrong?', 'Was stimmt nicht?'), shuffle(r, opts), { after, stack: true, ask: L('It describes no SHM. What is wrong?', 'Sie beschreibt keine harmonische Schwingung. Was stimmt nicht?') });
  }
  // a fresh random source for the order of the options (the same for the same parameters)
  const orderOf = (p) => rng(p.seed || 7);

  // The steps: the standard form, ω and T; or why not, with the motion's graph.
  function eqSteps(p, ask) {
    const f = byId(p.eq.form), s = Eq.sym(p.eq), given = Eq.tex(p.eq);
    const out = [];
    out.push(step(L('The test', 'Der Test'), p$(f.kind === 'ode'
      ? L('A simple harmonic motion has an equation of motion of the form $\\ddot y = -\\omega^2\\cdot y$: the acceleration is proportional to the displacement and points back to the equilibrium. Solve the equation for the second derivative.',
        'Eine harmonische Schwingung hat eine Bewegungsgleichung der Form $\\ddot y = -\\omega^2\\cdot y$: Die Beschleunigung ist proportional zur Auslenkung und zeigt zur Gleichgewichtslage zurück. Löse die Gleichung nach der zweiten Ableitung auf.')
      : L('A simple harmonic motion is a motion $y(t) = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$ (a sine is a cosine shifted in time): a constant amplitude, and a phase that grows evenly with $t$.',
        'Eine harmonische Schwingung ist eine Bewegung $y(t) = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$ (ein Sinus ist ein zeitlich verschobener Kosinus): eine konstante Amplitude und eine Phase, die gleichmässig mit $t$ wächst.'))));
    if (f.shm) {
      const sum = f.id === 'c1c2' ? p$(L('A sum of a cosine and a sine with the same $\\omega$ is again a cosine with this $\\omega$ (with another amplitude and phase).', 'Eine Summe von Kosinus und Sinus mit demselben $\\omega$ ist wieder ein Kosinus mit diesem $\\omega$ (mit anderer Amplitude und Phase).')) : '';
      const shift = f.shifted ? p$(L(`The constant only shifts the equilibrium to $${eqm(p)}$: around it, the body oscillates harmonically. It is an SHM.`, `Die Konstante verschiebt nur die Gleichgewichtslage nach $${eqm(p)}$: Um sie herum schwingt der Körper harmonisch. Es ist eine harmonische Schwingung.`)) : '';
      out.push(step(L('Compare', 'Vergleichen'), (f.kind === 'ode'
        ? `$$${given}\\quad\\Longrightarrow\\quad ${f.std(s)}$$` + p$(L(`This has the form $\\ddot y = -\\omega^2\\cdot y$ with $\\omega^2 = ${f.w2(s)}$, so $\\omega = ${f.w(s)}$.`, `Das hat die Form $\\ddot y = -\\omega^2\\cdot y$ mit $\\omega^2 = ${f.w2(s)}$, also $\\omega = ${f.w(s)}$.`))
        : `$$${given}$$` + p$(L(`Compare with $${f.std(s)}$: the angular frequency is $\\omega = ${f.w(s)}$.`, `Vergleiche mit $${f.std(s)}$: Die Kreisfrequenz ist $\\omega = ${f.w(s)}$.`))) + sum + shift));
      out.push(step(L('The period', 'Die Periode'), p$(L('In one period, the phase $\\omega\\, t$ grows by $2\\pi$:', 'In einer Periode wächst die Phase $\\omega\\, t$ um $2\\pi$:')) +
        `$$T = \\frac{2\\pi}{\\omega} = ${res(f.T(s)[0])}$$` + p$(L('The graph shows the motion for sample numbers: the same shape again and again, with a constant amplitude.', 'Der Graph zeigt die Bewegung für Beispielzahlen: immer wieder dieselbe Form, mit konstanter Amplitude.')), ['graph']));
    } else {
      const m = MISTAKES[f.mistake];
      out.push(step(L('What goes wrong', 'Was nicht passt'), `$$${given}$$` + p$(m.why()) + p$(ask === 'mistake' ? L(`So: <span class="result">${m.short()}</span>`, `Also: <span class="result">${m.short()}</span>`) : L('So the equation describes <span class="result">no SHM</span>.', 'Die Gleichung beschreibt also <span class="result">keine harmonische Schwingung</span>.'))));
      out.push(step(L('The motion', 'Die Bewegung'), p$(L('The graph shows the motion for sample numbers (starting at 1, at rest): no harmonic oscillation.', 'Der Graph zeigt die Bewegung für Beispielzahlen (Start bei 1, in Ruhe): keine harmonische Schwingung.')), ['graph']));
    }
    return out;
  }
  // the first step of bringing an equation into the standard form, the same for an SHM and not
  // (so it does not tell which)
  function firstMove(p) {
    const s = Eq.sym(p.eq), y = s.y, c = s.c, id = p.eq.form;
    if (['std0', 'shift', 'damp'].includes(id)) return L(`Bring every term except the one with $${s.dd}$ to the right-hand side.`, `Bring alle Terme ausser jenem mit $${s.dd}$ auf die rechte Seite.`);
    if (['inv', 'plusinv'].includes(id)) return L(`Bring $${y}$ to the right-hand side and divide by $${c}^2$, the factor in front of $${s.dd}$.`, `Bring $${y}$ auf die rechte Seite und teile durch $${c}^2$, den Faktor vor $${s.dd}$.`);
    if (id === 'mD') return L(`Bring $D\\cdot ${y}$ to the right-hand side and divide by $m$, the factor in front of $${s.dd}$.`, `Bring $D\\cdot ${y}$ auf die rechte Seite und teile durch $m$, den Faktor vor $${s.dd}$.`);
    if (id === 'cinv') return L(`Divide by $${c}$, the factor in front of $${s.dd}$.`, `Teile durch $${c}$, den Faktor vor $${s.dd}$.`);
    if (byId(id).kind === 'ode') return L('It is already solved for the derivative: compare the right-hand side directly.', 'Sie ist schon nach der Ableitung aufgelöst: Vergleiche die rechte Seite direkt.');
    return L(`Look at the factor in front of the cosine (or sine): does it contain $t$? And write the argument as (a constant)$\\cdot t$, if you can.`, `Schau den Faktor vor dem Kosinus (oder Sinus) an: Enthält er $t$? Und schreib das Argument wenn möglich als (eine Konstante)$\\cdot t$.`);
  }
  const eqHints = (p) => {
    const f = byId(p.eq.form), s = Eq.sym(p.eq), ode = f.kind === 'ode', mD = f.id === 'mD';
    const cs = mD ? L('the constants $m$ and $D$', 'den Konstanten $m$ und $D$') : L(`the constant $${s.c}$`, `der Konstante $${s.c}$`);
    return [
      ode ? L(`Here the displacement is $${s.y}$, with ${cs}. In the equation: which derivative of $${s.y}$ appears, with which sign, and is $${s.y}$ itself to the first power?`, `Hier ist die Auslenkung $${s.y}$, mit ${cs}. In der Gleichung: Welche Ableitung von $${s.y}$ kommt vor, mit welchem Vorzeichen, und steht $${s.y}$ selbst in der ersten Potenz?`)
        : L(`Here the displacement is $${s.Yt}$ and the constant $${s.c}$. Is the factor in front of the cosine (or sine) constant, and does the argument grow evenly with $t$?`, `Hier ist die Auslenkung $${s.Yt}$ und die Konstante $${s.c}$. Ist der Faktor vor dem Kosinus (oder Sinus) konstant, und wächst das Argument gleichmässig mit $t$?`),
      (ode ? L(`Compare with $${s.dd} = -\\omega^2\\cdot ${s.y}$ (a positive constant times $-${s.y}$ on the right). `, `Vergleiche mit $${s.dd} = -\\omega^2\\cdot ${s.y}$ (eine positive Konstante mal $-${s.y}$ rechts). `)
        : L(`Compare with $${s.Yt} = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$. `, `Vergleiche mit $${s.Yt} = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$. `)) + firstMove(p),
      L(`If it has this form, read off ${ode ? '$\\omega^2$, take the root' : '$\\omega$, the factor of $t$'} and use $T = 2\\pi/\\omega$. If not, find the one feature of this equation that breaks the form; the letters (here $${s.y}$${mD ? '' : `, $${s.c}$`}) and the way the derivative is written do not matter.`,
        `Hat sie diese Form, lies ${ode ? '$\\omega^2$ ab, zieh die Wurzel' : '$\\omega$ ab, den Faktor von $t$,'} und verwende $T = 2\\pi/\\omega$. Wenn nicht, suche das eine Merkmal dieser Gleichung, das die Form verletzt; die Buchstaben (hier $${s.y}$${mD ? '' : `, $${s.c}$`}) und die Schreibweise der Ableitung spielen keine Rolle.`),
    ];
  };
  const eqFigure = (p, v, view) => box(Eq.tex(p.eq)) + (view.show && view.show.has('graph') ? `<div class="fig">${eqGraph(p)}</div>` : '');

  // yes or no, then the period or the mistake
  function shmScenario(id, difficulty, forms) {
    return {
      id, difficulty, kind: 'shm',
      title: () => L('Harmonic or not?', 'Harmonisch oder nicht?'),
      make: (r) => { const p = eqMake(r, formsOf(forms)); p.seed = Math.floor(r() * 1e9); return p; },
      solve: (p) => ({ shm: isShm(p) ? 'yes' : 'no', T: 'right', mistake: byId(p.eq.form).mistake }),
      traps: [],
      fields: (p) => [choice('shm', L('Does it describe a simple harmonic motion?', 'Beschreibt sie eine harmonische Schwingung?'), yesNo(p), { ask: L('Does this equation describe a simple harmonic motion?', 'Beschreibt diese Gleichung eine harmonische Schwingung?') }),
        isShm(p) ? periodField(p, 'shm', orderOf(p)) : mistakeField(p, 'shm', orderOf(p))],
      text: () => L('Does this equation describe a simple harmonic motion (SHM)? If yes, what is its period? If not, what is wrong?', 'Beschreibt diese Gleichung eine harmonische Schwingung? Wenn ja, wie gross ist ihre Periode? Wenn nicht, was stimmt nicht?'),
      hints: (p) => eqHints(p),
      steps: (p) => eqSteps(p, 'shm'),
      figure: eqFigure,
    };
  }
  // ★1: the standard forms and the worksheet's blatant mistakes; ★2: rearranged forms and
  // solutions; ★3: the subtle ones (shifted equilibrium, c·ÿ = −y, y³, a decaying amplitude)
  const shm1 = shmScenario('shm-1', 1, (f) => f.level === 1);
  const shm2 = shmScenario('shm-2', 2, (f) => f.level === 2 || (f.level === 1 && !f.shm));
  const shm3 = shmScenario('shm-3', 3, (f) => f.level === 3 || (f.level === 2 && f.shm));

  // four equations, one of them an SHM
  const pickShm = {
    id: 'pick-shm', difficulty: 1, kind: 'pick',
    title: () => L('Which one oscillates harmonically?', 'Welche schwingt harmonisch?'),
    make: (r) => {
      const right = pick(r, formsOf((f) => f.shm && f.level <= 2));
      const wrong = shuffle(r, formsOf((f) => !f.shm && f.level <= 2));
      const seen = new Set(), list = [];
      for (const f of wrong) if (!seen.has(f.mistake) && list.length < 3) { seen.add(f.mistake); list.push(f); }
      const y = pick(r, Eq.VARS.filter((x) => x !== '\\varphi')), c = pick(r, Eq.CONSTS.filter((k) => ![right, ...list].some((f) => f.noConst === k)));
      const eqs = shuffle(r, [right, ...list]).map((f) => ({ form: f.id, y, c, note: 'dot' }));
      return { eqs, P: Eq.numbers(r) };
    },
    solve: (p) => ({ which: String(p.eqs.findIndex((e) => byId(e.form).shm)) }),
    traps: [],
    fields: (p) => [choice('which', L('Which equation describes a simple harmonic motion?', 'Welche Gleichung beschreibt eine harmonische Schwingung?'),
      p.eqs.map((e, i) => { const f = byId(e.form); return [String(i), `$${Eq.tex(e)}$`, f.shm ? '' : MISTAKES[f.mistake].short(), f.shm ? null : f.mistake]; }), { stack: true })],
    text: () => L('Only one of these equations describes a simple harmonic motion. Which one?', 'Nur eine dieser Gleichungen beschreibt eine harmonische Schwingung. Welche?'),
    hints: (p) => {
      const s = Eq.sym(p.eqs[0]), odes = p.eqs.filter((e) => byId(e.form).kind === 'ode'), sols = p.eqs.filter((e) => byId(e.form).kind === 'sol');
      const zero = p.eqs.filter((e) => /= 0$/.test(Eq.tex(e))).map((e) => `$${Eq.tex(e)}$`);
      return [
        L(`All four use the displacement $${s.y}$ and the constant $${s.c}$. An SHM in these letters: $${s.dd} = -\\omega^2\\cdot ${s.y}$, or $${s.Yt} = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$.`, `Alle vier verwenden die Auslenkung $${s.y}$ und die Konstante $${s.c}$. Eine harmonische Schwingung in diesen Buchstaben: $${s.dd} = -\\omega^2\\cdot ${s.y}$, oder $${s.Yt} = A\\cdot\\cos(\\omega\\, t - \\varphi_0)$.`),
        [odes.length ? L(`For ${odes.length === 1 ? 'the equation of motion' : `the ${odes.length} equations of motion`}: which derivative, which sign on the right (once solved for it), which power of $${s.y}$?`, `Bei ${odes.length === 1 ? 'der Bewegungsgleichung' : `den ${odes.length} Bewegungsgleichungen`}: welche Ableitung, welches Vorzeichen rechts (nach ihr aufgelöst), welche Potenz von $${s.y}$?`) : '',
          sols.length ? L(`For ${sols.length === 1 ? 'the solution' : `the ${sols.length} solutions`} $${s.Yt} = \\ldots$: a constant amplitude, and an argument that grows evenly with $t$?`, `Bei ${sols.length === 1 ? 'der Lösung' : `den ${sols.length} Lösungen`} $${s.Yt} = \\ldots$: eine konstante Amplitude und ein Argument, das gleichmässig mit $t$ wächst?`) : '',
          zero.length ? L(`Solve ${zero.join(L(' and ', ' und '))} for the second derivative first.`, `Löse ${zero.join(' und ')} zuerst nach der zweiten Ableitung auf.`) : ''].filter(Boolean).join(' '),
      ];
    },
    steps: (p) => [step(L('One by one', 'Eine nach der anderen'), `<ul class="eqlist">${p.eqs.map((e) => { const f = byId(e.form); return `<li>$${Eq.tex(e)}$: ${f.shm ? `<span class="result">${L('an SHM', 'harmonisch')}</span>` : MISTAKES[f.mistake].short()}</li>`; }).join('')}</ul>`)],
    figure: () => '',
  };

  // ================================================================ 2 equation and graph
  // Qualitative only: equations with letters (ω, δ, k, g all positive) and graphs without
  // numbers. The body starts displaced (y(0) > 0), at rest. Each kind: its TeX and the motion
  // drawn (numbers only for the drawing).
  const Y0 = 2;
  const N = { w2: 1, G: 0.3, k: 0.35, g: 4 }; // the numbers of the drawings
  const NKINDS = {
    shm: { tex: (y) => `\\ddot ${y} = -\\omega^2\\cdot ${y}`, motion: () => ({ order: 2, acc: (y) => -N.w2 * y }) },
    damp: { tex: (y) => `\\ddot ${y} + 2\\delta\\cdot\\dot ${y} + \\omega^2\\cdot ${y} = 0`, motion: () => ({ order: 2, acc: (y, v) => -N.G * v - N.w2 * y }) },
    anti: { tex: (y) => `\\ddot ${y} - 2\\delta\\cdot\\dot ${y} + \\omega^2\\cdot ${y} = 0`, motion: () => ({ order: 2, acc: (y, v) => N.G * v - N.w2 * y }) },
    plus: { tex: (y) => `\\ddot ${y} = k^2\\cdot ${y}`, motion: () => ({ order: 2, acc: (y) => N.k * N.k * y }) },
    first: { tex: (y) => `\\dot ${y} = -k\\cdot ${y}`, motion: () => ({ order: 1, rate: (y) => -N.k * y }) },
    const: { tex: (y) => `\\ddot ${y} = -g`, motion: () => ({ order: 2, acc: () => -N.g / 10 }) },
    shift: { tex: (y) => `\\ddot ${y} = -\\omega^2\\cdot ${y} + g`, motion: () => ({ order: 2, acc: (y) => -N.w2 * y + N.g }) },
    unshift: { tex: (y) => `\\ddot ${y} = -\\omega^2\\cdot ${y}`, motion: () => ({ order: 2, acc: (y) => -N.w2 * y }) },
  };
  // what a graph shows, and why it is wrong when the right one is another
  function graphWhy(k, right) {
    const W = {
      shm: right === 'damp' ? L('Here the amplitude stays the same. But the term with ẏ damps the oscillation: the amplitude dies away.', 'Hier bleibt die Amplitude gleich. Der Term mit ẏ dämpft die Schwingung aber: Die Amplitude klingt ab.')
        : right === 'anti' ? L('Here the amplitude stays the same. But with −2δ·ẏ the oscillation is driven: the amplitude grows.', 'Hier bleibt die Amplitude gleich. Mit −2δ·ẏ wird die Schwingung aber angetrieben: Die Amplitude wächst.')
          : right === 'shift' ? L('This one oscillates around 0. The constant g shifts the equilibrium to g/ω², so the body oscillates around it.', 'Diese schwingt um 0. Die Konstante g verschiebt die Gleichgewichtslage nach g/ω², der Körper schwingt also um sie.')
            : right === 'plus' ? L('An oscillation needs a minus sign: ÿ = −ω²·y. With a plus sign, there is no restoring force: the body runs away.', 'Eine Schwingung braucht ein Minuszeichen: ÿ = −ω²·y. Mit Pluszeichen gibt es keine rücktreibende Kraft: Der Körper läuft davon.')
              : right === 'first' ? L('An oscillation needs the second derivative. With ẏ = −k·y, the body creeps towards 0 and never turns back.', 'Eine Schwingung braucht die zweite Ableitung. Mit ẏ = −k·y kriecht der Körper gegen 0 und kehrt nie um.')
                : L('A constant acceleration gives no oscillation: the graph is a parabola.', 'Eine konstante Beschleunigung gibt keine Schwingung: Der Graph ist eine Parabel.'),
      damp: L('The amplitude of this one dies away: that needs a term +2δ·ẏ (damping).', 'Bei dieser klingt die Amplitude ab: Das braucht einen Term +2δ·ẏ (Dämpfung).'),
      anti: L('The amplitude of this one grows: that would be −2δ·ẏ, a damping term with the wrong sign.', 'Bei dieser wächst die Amplitude: Das wäre −2δ·ẏ, ein Dämpfungsterm mit dem falschen Vorzeichen.'),
      plus: L('This one runs away exponentially: that would be ÿ = +k²·y, without a restoring force.', 'Diese läuft exponentiell davon: Das wäre ÿ = +k²·y, ohne rücktreibende Kraft.'),
      first: L('This one creeps towards 0 without turning back: that would be ẏ = −k·y, with the first derivative only.', 'Diese kriecht gegen 0, ohne umzukehren: Das wäre ẏ = −k·y, nur mit der ersten Ableitung.'),
      const: L('This is a parabola: a constant acceleration, ÿ = −g.', 'Das ist eine Parabel: eine konstante Beschleunigung, ÿ = −g.'),
      unshift: L('This one oscillates around 0, but the constant g shifts the equilibrium.', 'Diese schwingt um 0, aber die Konstante g verschiebt die Gleichgewichtslage.'),
      shift: L('This one oscillates around a shifted equilibrium: that needs a constant in the equation.', 'Diese schwingt um eine verschobene Gleichgewichtslage: Das braucht eine Konstante in der Gleichung.'),
    };
    return W[k] || '';
  }
  // the nudge in practice where that reason would give the right graph or equation away: the
  // graph of an undamped SHM (or one around 0) chosen for another equation
  function graphNudge(k, right) {
    if (k === 'shm' || k === 'unshift') {
      return right === 'damp' || right === 'anti' ? L('Here the amplitude stays the same. What does the term with ẏ in the equation do to the oscillation?', 'Hier bleibt die Amplitude gleich. Was macht der Term mit ẏ in der Gleichung mit der Schwingung?')
        : right === 'shift' ? L('This one oscillates around 0. What does the constant g in the equation do?', 'Diese schwingt um 0. Was bewirkt die Konstante g in der Gleichung?')
          : right === 'plus' ? L('An oscillation needs a restoring force. Which sign stands in the equation, and what does the body do then?', 'Eine Schwingung braucht eine rücktreibende Kraft. Welches Vorzeichen steht in der Gleichung, und was macht der Körper dann?')
            : right === 'first' ? L('An oscillation needs the second derivative. Which derivative stands in the equation, and what does the body do then?', 'Eine Schwingung braucht die zweite Ableitung. Welche Ableitung steht in der Gleichung, und was macht der Körper dann?')
              : right === 'const' ? L('Does the acceleration in the equation depend on the displacement? What does the graph look like then?', 'Hängt die Beschleunigung in der Gleichung von der Auslenkung ab? Wie sieht der Graph dann aus?') : '';
    }
    return '';
  }
  const FLAG = { damp: 'damp', anti: 'sign', plus: 'sign', first: 'order', const: 'const', shift: 'shift', unshift: 'shift', shm: null };

  // the given kind and the wrong ones, in the order they are tried (some may look alike)
  const MATCH1 = { shm: ['damp', 'plus', 'first', 'anti', 'const'], plus: ['shm', 'first', 'const', 'damp'], first: ['shm', 'plus', 'damp', 'const'] };
  const MATCH2 = { damp: ['shm', 'anti', 'first', 'plus'], anti: ['shm', 'damp', 'plus', 'first'], shift: ['unshift', 'damp', 'plus', 'const'], const: ['shm', 'plus', 'first', 'damp'] };
  const T_END = 20;
  const curveOf = (kind) => Eq.trace(NKINDS[kind].motion(), T_END, 240, Y0);
  // the axis: room for a shifted equilibrium only where one is among the graphs
  const AXIS = { lo: -3, hi: 9, step: 3 }, AXIS0 = { lo: -3, hi: 3, step: 1 };
  const axisOf = (kinds) => (kinds.some((k) => k === 'shift') ? AXIS : AXIS0);
  // a graph without numbers: only the axes, y(0) > 0 and the line y = 0
  const qGraph = (kind, y, axis, o = {}) => Plot.graph([{ pts: curveOf(kind) }], { tEnd: T_END, axis, name: y, bare: true, label: L('A graph of the motion', 'Ein Graph der Bewegung'), ...o });
  function matchOptions(given, wrongs) {
    const span = AXIS.hi - AXIS.lo, clip = (pts) => pts.map(([t, y]) => [t, Math.max(AXIS.lo, Math.min(AXIS.hi, y))]), kept = [[given, clip(curveOf(given))]];
    for (const k of wrongs) {
      if (kept.length === 4) break;
      const c = clip(curveOf(k));
      if (!kept.some(([, d]) => Plot.alike(c, d, span))) kept.push([k, c]);
    }
    return kept.map((k) => k[0]);
  }
  const KIND_TEXT = () => ({
    shm: L('ÿ = −ω²·y: the acceleration points back to 0 and grows with the displacement: an SHM around 0, with a constant amplitude.', 'ÿ = −ω²·y: Die Beschleunigung zeigt zu 0 zurück und wächst mit der Auslenkung: eine harmonische Schwingung um 0, mit konstanter Amplitude.'),
    damp: L('ÿ = −ω²·y with a term +2δ·ẏ that brakes the motion like friction: a damped oscillation, its amplitude dies away.', 'ÿ = −ω²·y mit einem Term +2δ·ẏ, der die Bewegung wie Reibung bremst: eine gedämpfte Schwingung, ihre Amplitude klingt ab.'),
    anti: L('ÿ = −ω²·y with a term −2δ·ẏ that pushes in the direction of motion: the oscillation is driven, its amplitude grows.', 'ÿ = −ω²·y mit einem Term −2δ·ẏ, der in Bewegungsrichtung wirkt: Die Schwingung wird angetrieben, ihre Amplitude wächst.'),
    shift: L('ÿ = −ω²·y plus a constant g: the acceleration is 0 at y = g/ω², not at 0. An SHM around this shifted equilibrium.', 'ÿ = −ω²·y plus eine Konstante g: Die Beschleunigung ist 0 bei y = g/ω², nicht bei 0. Eine harmonische Schwingung um diese verschobene Gleichgewichtslage.'),
    plus: L('ÿ = +k²·y: the acceleration points away from 0, the more the farther: the body runs away exponentially.', 'ÿ = +k²·y: Die Beschleunigung zeigt von 0 weg, umso stärker, je weiter: Der Körper läuft exponentiell davon.'),
    first: L('ẏ = −k·y: the velocity is proportional to the displacement; the body creeps towards 0 (exponentially) and never turns back.', 'ẏ = −k·y: Die Geschwindigkeit ist proportional zur Auslenkung; der Körper kriecht (exponentiell) gegen 0 und kehrt nie um.'),
    const: L('ÿ = −g: a constant acceleration, as in a throw: the graph is a parabola opening downwards.', 'ÿ = −g: eine konstante Beschleunigung, wie bei einem Wurf: Der Graph ist eine nach unten geöffnete Parabel.'),
  });
  // the hints of match-1 and match-2: a question on the term that matters in the equation given
  // (not what it does), the graphs, and the start
  function matchHints(p) {
    const y = p.y, Q = {
      shm: L(`The right-hand side is $-\\omega^2\\cdot ${y}$ and nothing else: where is the acceleration zero, and is there a term that brakes or drives the motion?`, `Rechts steht $-\\omega^2\\cdot ${y}$ und sonst nichts: Wo ist die Beschleunigung null, und gibt es einen Term, der die Bewegung bremst oder antreibt?`),
      damp: L(`Besides $\\omega^2\\cdot ${y}$ there is the term $+2\\delta\\cdot\\dot ${y}$. Solved for $\\ddot ${y}$, does it act with the velocity or against it?`, `Neben $\\omega^2\\cdot ${y}$ gibt es den Term $+2\\delta\\cdot\\dot ${y}$. Nach $\\ddot ${y}$ aufgelöst: Wirkt er mit der Geschwindigkeit oder gegen sie?`),
      anti: L(`Besides $\\omega^2\\cdot ${y}$ there is the term $-2\\delta\\cdot\\dot ${y}$. Solved for $\\ddot ${y}$, does it act with the velocity or against it?`, `Neben $\\omega^2\\cdot ${y}$ gibt es den Term $-2\\delta\\cdot\\dot ${y}$. Nach $\\ddot ${y}$ aufgelöst: Wirkt er mit der Geschwindigkeit oder gegen sie?`),
      plus: L(`The right-hand side is $+k^2\\cdot ${y}$. For ${y} > 0, which way does the acceleration point: towards 0 or away from it?`, `Rechts steht $+k^2\\cdot ${y}$. Für ${y} > 0: Wohin zeigt die Beschleunigung, zu 0 hin oder von 0 weg?`),
      first: L(`Only the first derivative $\\dot ${y}$ appears: the equation fixes the velocity, not the acceleration. What is the velocity while ${y} > 0, and what happens to it as ${y} gets smaller?`, `Nur die erste Ableitung $\\dot ${y}$ kommt vor: Die Gleichung legt die Geschwindigkeit fest, nicht die Beschleunigung. Wie ist die Geschwindigkeit, solange ${y} > 0, und was geschieht mit ihr, wenn ${y} kleiner wird?`),
      const: L(`The right-hand side is $-g$, without $${y}$: does the acceleration depend on where the body is?`, `Rechts steht $-g$, ohne $${y}$: Hängt die Beschleunigung davon ab, wo der Körper ist?`),
      shift: L(`Besides $-\\omega^2\\cdot ${y}$ there is the constant $+g$. At which ${y} is the acceleration zero?`, `Neben $-\\omega^2\\cdot ${y}$ gibt es die Konstante $+g$. Bei welchem ${y} ist die Beschleunigung null?`),
    };
    const start = p.given === 'first' ? L(`At the start ${y}(0) > 0: what is $\\dot ${y}(0) = -k\\cdot ${y}(0)$, and which way does the graph start?`, `Am Anfang ist ${y}(0) > 0: Wie gross ist $\\dot ${y}(0) = -k\\cdot ${y}(0)$, und in welche Richtung beginnt der Graph?`)
      : L(`At the start ${y}(0) > 0 and $\\dot ${y}(0) = 0$. Put this into the equation: is $\\ddot ${y}(0)$ positive or negative? So does the graph start bending down or up?`, `Am Anfang ist ${y}(0) > 0 und $\\dot ${y}(0) = 0$. Setz das in die Gleichung ein: Ist $\\ddot ${y}(0)$ positiv oder negativ? Beginnt der Graph also nach unten oder nach oben gekrümmt?`);
    return [Q[p.given],
      L(`Compare the four graphs of ${y}(t): does the amplitude stay the same, die away or grow? Around which line does it oscillate, and does it oscillate at all?`, `Vergleiche die vier Graphen von ${y}(t): Bleibt die Amplitude gleich, klingt sie ab oder wächst sie? Um welche Linie schwingt er, und schwingt er überhaupt?`),
      start];
  }

  function matchScenario(id, difficulty, table) {
    return {
      id, difficulty, kind: 'match',
      title: () => L('Which graph?', 'Welcher Graph?'),
      make: (r) => {
        const given = pick(r, Object.keys(table)), y = pick(r, ['x', 'y', 'z', 'u']);
        const kinds = matchOptions(given, table[given]);
        if (kinds.length < 4) return null;
        return { given, y, kinds: shuffle(r, kinds) };
      },
      solve: (p) => ({ graph: p.given }),
      traps: [],
      fields: (p) => [choice('graph', L('Which graph shows the motion?', 'Welcher Graph zeigt die Bewegung?'), p.kinds.map((k) => [k, qGraph(k, p.y, axisOf(p.kinds)), k === p.given ? '' : graphWhy(k, p.given), k === p.given ? null : FLAG[k], k === p.given ? '' : graphNudge(k, p.given)]), { pics: true })],
      text: (p) => L(`A body moves according to the equation below (the constants are positive). At the start it is displaced to ${p.y} > 0 and at rest. Which graph shows its motion?`,
        `Ein Körper bewegt sich gemäss der Gleichung unten (die Konstanten sind positiv). Am Anfang ist er nach ${p.y} > 0 ausgelenkt und in Ruhe. Welcher Graph zeigt seine Bewegung?`),
      hints: (p) => matchHints(p),
      steps: (p) => [
        step(L('The form of the equation', 'Die Form der Gleichung'), p$(KIND_TEXT()[p.given])),
        step(L('The graph', 'Der Graph'), p$(L('So the graph is this one:', 'Der Graph ist also dieser:')), ['graph']),
      ],
      figure: (p, v, view) => box(NKINDS[p.given].tex(p.y)) + (view.show && view.show.has('graph') ? `<div class="fig">${qGraph(p.given, p.y, axisOf(p.kinds))}</div>` : ''),
    };
  }
  const match1 = matchScenario('match-1', 2, MATCH1);
  const match2 = matchScenario('match-2', 3, MATCH2);

  // a graph and four equations
  const BACK = { shm: ['damp', 'plus', 'anti', 'first'], damp: ['anti', 'shm', 'first', 'plus'], anti: ['damp', 'shm', 'plus', 'first'], shift: ['unshift', 'damp', 'plus', 'anti'] };
  const matchBack = {
    id: 'match-back', difficulty: 3, kind: 'back',
    title: () => L('Which equation?', 'Welche Gleichung?'),
    make: (r) => {
      const given = pick(r, Object.keys(BACK)), y = pick(r, ['x', 'y', 'z', 'u']);
      return { given, y, kinds: shuffle(r, [given, ...BACK[given].slice(0, 3)]) };
    },
    solve: (p) => ({ eq: p.given }),
    traps: [],
    fields: (p) => [choice('eq', L('Which equation belongs to the graph?', 'Welche Gleichung gehört zum Graphen?'), p.kinds.map((k) => [k, `$${NKINDS[k].tex(p.y)}$`, k === p.given ? '' : graphWhy(k, p.given), k === p.given ? null : FLAG[k], k === p.given ? '' : graphNudge(k, p.given)]), { stack: true })],
    text: (p) => L(`The graph shows the motion of a body; it starts at rest. Which equation of motion belongs to it (the constants are positive)?`, `Der Graph zeigt die Bewegung eines Körpers; er startet in Ruhe. Welche Bewegungsgleichung gehört dazu (die Konstanten sind positiv)?`),
    hints: (p) => {
      const y = p.y, TERM = {
        shm: L(`$\\ddot ${y} = -\\omega^2\\cdot ${y}$ alone: nothing brakes or drives, the acceleration is zero at ${y} = 0`, `$\\ddot ${y} = -\\omega^2\\cdot ${y}$ allein: Nichts bremst oder treibt an, die Beschleunigung ist null bei ${y} = 0`),
        unshift: L(`$\\ddot ${y} = -\\omega^2\\cdot ${y}$ alone: the acceleration is zero at ${y} = 0`, `$\\ddot ${y} = -\\omega^2\\cdot ${y}$ allein: Die Beschleunigung ist null bei ${y} = 0`),
        damp: L(`$+2\\delta\\cdot\\dot ${y}$ on the left: solved for $\\ddot ${y}$, it acts against the velocity, like friction`, `$+2\\delta\\cdot\\dot ${y}$ links: Nach $\\ddot ${y}$ aufgelöst wirkt er gegen die Geschwindigkeit, wie Reibung`),
        anti: L(`$-2\\delta\\cdot\\dot ${y}$ on the left: solved for $\\ddot ${y}$, it acts with the velocity`, `$-2\\delta\\cdot\\dot ${y}$ links: Nach $\\ddot ${y}$ aufgelöst wirkt er mit der Geschwindigkeit`),
        plus: L(`$+k^2\\cdot ${y}$: the acceleration points away from 0`, `$+k^2\\cdot ${y}$: Die Beschleunigung zeigt von 0 weg`),
        first: L(`only $\\dot ${y}$: the velocity, not the acceleration, follows ${y}`, `nur $\\dot ${y}$: Die Geschwindigkeit, nicht die Beschleunigung, folgt ${y}`),
        shift: L(`the constant $+g$: the acceleration is zero at $${y} = g/\\omega^2$, not at 0`, `die Konstante $+g$: Die Beschleunigung ist null bei $${y} = g/\\omega^2$, nicht bei 0`),
      };
      return [
        L(`Read the graph of ${y}(t) first: does its amplitude stay the same, die away or grow? Does it oscillate around the line ${y} = 0 or around another one?`, `Lies zuerst den Graphen von ${y}(t): Bleibt seine Amplitude gleich, klingt sie ab oder wächst sie? Schwingt er um die Linie ${y} = 0 oder um eine andere?`),
        L(`The four equations differ in one term: ${p.kinds.map((k) => TERM[k]).join('; ')}. Which of these does what you read off the graph?`, `Die vier Gleichungen unterscheiden sich in einem Term: ${p.kinds.map((k) => TERM[k]).join('; ')}. Welcher davon bewirkt, was du am Graphen abgelesen hast?`),
      ];
    },
    steps: (p) => [
      step(L('What the graph shows', 'Was der Graph zeigt'), p$({
        shm: L('A constant amplitude around 0: an SHM.', 'Eine konstante Amplitude um 0: eine harmonische Schwingung.'),
        damp: L('An oscillation around 0 whose amplitude dies away: damped.', 'Eine Schwingung um 0, deren Amplitude abklingt: gedämpft.'),
        anti: L('An oscillation around 0 whose amplitude grows: driven.', 'Eine Schwingung um 0, deren Amplitude wächst: angetrieben.'),
        shift: L('A constant amplitude, but around a line above 0: a shifted equilibrium.', 'Eine konstante Amplitude, aber um eine Linie oberhalb von 0: eine verschobene Gleichgewichtslage.'),
      }[p.given])),
      step(L('The equation', 'Die Gleichung'), p$(KIND_TEXT()[p.given]) + `$$${res(NKINDS[p.given].tex(p.y))}$$`),
    ],
    figure: (p) => `<div class="fig">${qGraph(p.given, p.y, axisOf([p.given]))}</div>`,
  };

  // ================================================================ 3 kinematics
  // y(t) = A·cos(ωt), the angular frequency ω given (no 2π to work out): v̂ = A·ω, â = A·ω².
  const AS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((x) => x / 100); // m
  const WS = [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20]; // s⁻¹
  const unitOfA = (A) => (A < 0.01 ? 'mm' : 'cm');
  const VH = '\\hat v', AH = '\\hat a', W = (w) => `${tnum(w)}\\,\\mathrm{s^{-1}}`;
  const xGraph = (p, o = {}) => {
    const f = p.w ? p.w / PI2 : p.f, w = PI2 * f, T = 1 / f, tEnd = 2 * T, cm = p.A * 100;
    const pts = Array.from({ length: 201 }, (z, k) => { const t = (k * tEnd) / 200; return [t, cm * Math.cos(w * t)]; });
    return `<div class="fig">${Plot.graph([{ pts }], { tEnd, name: 'y', unit: 'cm', axis: Plot.niceAxis([-cm * 1.05, cm * 1.05]), label: L('Displacement against time', 'Auslenkung gegen die Zeit'), ...o })}</div>`;
  };
  const WHYK = {
    square: () => L('$\\hat v = A\\,\\omega$ and $\\hat a = A\\,\\omega^2$: the square belongs to the acceleration.', '$\\hat v = A\\,\\omega$ und $\\hat a = A\\,\\omega^2$: Das Quadrat gehört zur Beschleunigung.'),
    inverse: () => L('Upside down: from $\\hat v = A\\,\\omega$, $\\omega = \\hat v / A$.', 'Kehrwert verwechselt: Aus $\\hat v = A\\,\\omega$ folgt $\\omega = \\hat v / A$.'),
    inverseA: () => L('Upside down: $\\hat a / \\hat v = A\\omega^2 / (A\\omega) = \\omega$.', 'Kehrwert verwechselt: $\\hat a / \\hat v = A\\omega^2 / (A\\omega) = \\omega$.'),
  };
  // the nudges after these numbers in practice (WHYK stays for the check's explanation)
  const NUDGEK = {
    square: () => L('Which of the two, $\\hat v$ or $\\hat a$, contains $\\omega^2$? Check the units.', 'Welche der beiden Grössen, $\\hat v$ oder $\\hat a$, enthält $\\omega^2$? Prüfe die Einheiten.'),
    inverse: () => L('Upside down: solve $\\hat v = A\\,\\omega$ for $\\omega$.', 'Kehrwert verwechselt: Löse $\\hat v = A\\,\\omega$ nach $\\omega$ auf.'),
    inverseA: () => L('Upside down: write $\\hat a$ and $\\hat v$ with $A$ and $\\omega$. Which ratio of the two gives $\\omega$?', 'Kehrwert verwechselt: Schreib $\\hat a$ und $\\hat v$ mit $A$ und $\\omega$ hin. Welcher Quotient der beiden gibt $\\omega$?'),
  };
  const pickAW = (r) => ({ A: pick(r, AS), w: pick(r, WS) });
  const given = (p) => L(`an amplitude of ${q(p.A, unitOfA(p.A))} and an angular frequency of ${q(p.w, '')} s⁻¹`, `einer Amplitude von ${q(p.A, unitOfA(p.A))} und einer Kreisfrequenz von ${q(p.w, '')} s⁻¹`);
  // the moments at the equilibrium ('eq') or at the turning points ('top') of y = A·cos(ωt)
  const peaks = (p, view, key) => (view.show && view.show.has(key) ? (key === 'eq' ? [[Math.PI / 2 / p.w, 0], [(1.5 * Math.PI) / p.w, 0]] : [[0, p.A * 100], [Math.PI / p.w, -p.A * 100]]) : []);

  const vmax = {
    id: 'vmax', difficulty: 2, kind: 'kin',
    title: () => L('Fastest and strongest', 'Am schnellsten, am stärksten'),
    make: pickAW,
    solve: (p, o = {}) => ({ vmax: o.square ? p.A * p.w * p.w : p.A * p.w, amax: o.square ? p.A * p.w : p.A * p.w * p.w }),
    traps: ['square'],
    why: { square: WHYK.square },
    nudge: { square: NUDGEK.square },
    fields: (p) => [num$('vmax', VH, speedUnit(p.A * p.w), L('largest speed', 'grösste Geschwindigkeit')), num$('amax', AH, 'm/s²', L('largest acceleration', 'grösste Beschleunigung'))],
    // with the key of one field (the check asks for one), the question asks for that one only
    text: (p, key) => L(`A body oscillates harmonically with ${given(p)}. ${{ vmax: 'What is its largest speed?', amax: 'What is its largest acceleration?' }[key] || 'What are its largest speed and its largest acceleration?'}`,
      `Ein Körper schwingt harmonisch mit ${given(p)}. ${{ vmax: 'Wie gross ist seine grösste Geschwindigkeit?', amax: 'Wie gross ist seine grösste Beschleunigung?' }[key] || 'Wie gross sind seine grösste Geschwindigkeit und seine grösste Beschleunigung?'}`),
    hints: (p) => [
      L(`Here $A = ${tq(p.A, unitOfA(p.A))}$ and $\\omega = ${W(p.w)}$. With $y(t) = A\\cdot\\cos(\\omega t)$, $v(t) = -A\\omega\\cdot\\sin(\\omega t)$ and $a(t) = -A\\omega^2\\cdot\\cos(\\omega t)$: where on its path is the body fastest, where is its acceleration largest?`, `Hier ist $A = ${tq(p.A, unitOfA(p.A))}$ und $\\omega = ${W(p.w)}$. Mit $y(t) = A\\cdot\\cos(\\omega t)$ ist $v(t) = -A\\omega\\cdot\\sin(\\omega t)$ und $a(t) = -A\\omega^2\\cdot\\cos(\\omega t)$: Wo auf seiner Bahn ist der Körper am schnellsten, wo ist seine Beschleunigung am grössten?`),
      L(`Sine and cosine are at most 1 in size, so $\\hat v = A\\,\\omega$ and $\\hat a = A\\,\\omega^2$ (or $\\hat a = \\hat v\\cdot\\omega$). First the amplitude in metres: how many metres are ${q(p.A, unitOfA(p.A))}?`, `Sinus und Kosinus sind dem Betrag nach höchstens 1, also $\\hat v = A\\,\\omega$ und $\\hat a = A\\,\\omega^2$ (oder $\\hat a = \\hat v\\cdot\\omega$). Zuerst die Amplitude in Metern: Wie viele Meter sind ${q(p.A, unitOfA(p.A))}?`),
    ],
    steps: (p, v) => [
      step(L('The largest speed', 'Die grösste Geschwindigkeit'), p$(L('With $y(t) = A\\cdot\\cos(\\omega t)$, the velocity is $v(t) = -A\\omega\\cdot\\sin(\\omega t)$: largest in size where the sine is ±1, at the equilibrium.', 'Mit $y(t) = A\\cdot\\cos(\\omega t)$ ist die Geschwindigkeit $v(t) = -A\\omega\\cdot\\sin(\\omega t)$: dem Betrag nach am grössten, wo der Sinus ±1 ist, in der Gleichgewichtslage.')) +
        `$$\\hat v = A\\,\\omega = ${tq(p.A, 'm')}\\cdot ${W(p.w)} = ${res(tq(v.vmax, speedUnit(v.vmax)))}$$`, ['eq']),
      step(L('The largest acceleration', 'Die grösste Beschleunigung'), p$(L('The acceleration $a(t) = -A\\omega^2\\cdot\\cos(\\omega t)$ is largest in size at the turning points.', 'Die Beschleunigung $a(t) = -A\\omega^2\\cdot\\cos(\\omega t)$ ist dem Betrag nach an den Umkehrpunkten am grössten.')) +
        `$$\\hat a = A\\,\\omega^2 = ${tq(p.A, 'm')}\\cdot (${W(p.w)})^2 = ${res(tq(v.amax, 'm/s²'))}$$`, ['top']),
    ],
    figure: (p, v, view) => (view.task ? '' : xGraph(p, { dots: [...peaks(p, view, 'eq'), ...peaks(p, view, 'top')] })),
  };

  // from the amplitude and the largest speed: ω, and then the largest acceleration
  const backW = {
    id: 'back-w', difficulty: 3, kind: 'kin',
    title: () => L('How fast does it oscillate?', 'Wie schnell schwingt er?'),
    make: pickAW,
    solve: (p, o = {}) => { const vm = p.A * p.w, w = o.flip ? p.A / vm : vm / p.A; return { vm, w, amax: o.square ? p.A * w : p.A * w * w }; },
    traps: ['flip', 'square'],
    why: { flip: WHYK.inverse, square: WHYK.square },
    nudge: { flip: NUDGEK.inverse, square: NUDGEK.square },
    fields: () => [num$('w', '\\omega', 'rad/s', L('angular frequency', 'Kreisfrequenz')), num$('amax', AH, 'm/s²', L('largest acceleration', 'grösste Beschleunigung'))],
    text: (p) => { const vm = p.A * p.w; return L(`A body oscillates harmonically with an amplitude of ${q(p.A, unitOfA(p.A))}. Its largest speed is ${q(vm, speedUnit(vm))}. What are its angular frequency and its largest acceleration?`, `Ein Körper schwingt harmonisch mit einer Amplitude von ${q(p.A, unitOfA(p.A))}. Seine grösste Geschwindigkeit beträgt ${q(vm, speedUnit(vm))}. Wie gross sind seine Kreisfrequenz und seine grösste Beschleunigung?`); },
    hints: (p) => {
      const vm = p.A * p.w;
      return [
        L(`Given are the amplitude $A = ${tq(p.A, unitOfA(p.A))}$ and the largest speed $\\hat v = ${tq(vm, speedUnit(vm))}$. Which equation links $\\hat v$, $A$ and $\\omega$?`, `Gegeben sind die Amplitude $A = ${tq(p.A, unitOfA(p.A))}$ und die grösste Geschwindigkeit $\\hat v = ${tq(vm, speedUnit(vm))}$. Welche Gleichung verknüpft $\\hat v$, $A$ und $\\omega$?`),
        L(`$\\hat v = A\\,\\omega$: solve it for $\\omega$, then put in $\\hat v$ in m/s and $A$ in metres (${q(p.A, unitOfA(p.A))} is how many metres?).`, `$\\hat v = A\\,\\omega$: Löse nach $\\omega$ auf und setz dann $\\hat v$ in m/s und $A$ in Metern ein (${q(p.A, unitOfA(p.A))} sind wie viele Meter?).`),
        L(`Then the largest acceleration with your $\\omega$: $\\hat a = A\\,\\omega^2$, or quicker, $\\hat a = \\hat v\\cdot\\omega$ with the given largest speed.`, `Dann die grösste Beschleunigung mit deinem $\\omega$: $\\hat a = A\\,\\omega^2$, oder schneller, $\\hat a = \\hat v\\cdot\\omega$ mit der gegebenen grössten Geschwindigkeit.`),
      ];
    },
    steps: (p, v) => [
      step(L('The angular frequency', 'Die Kreisfrequenz'), `$$\\omega = \\frac{\\hat v}{A} = \\frac{${tq(v.vm, 'm/s')}}{${tq(p.A, 'm')}} = ${res(W(v.w))}$$`),
      step(L('The largest acceleration', 'Die grösste Beschleunigung'), `$$\\hat a = A\\,\\omega^2 = ${tq(p.A, 'm')}\\cdot (${W(v.w)})^2 = ${res(tq(v.amax, 'm/s²'))}$$`, ['top']),
    ],
    figure: (p, v, view) => (view.task ? '' : xGraph(p, { dots: peaks(p, view, 'top') })),
  };

  const backA = {
    id: 'back-A', difficulty: 3, kind: 'kin',
    title: () => L('How far?', 'Wie weit?'),
    make: pickAW,
    solve: (p, o = {}) => { const vm = p.A * p.w, am = p.A * p.w * p.w, w = o.flip ? vm / am : am / vm; return { vm, am, w, A: vm / w }; },
    traps: ['flip'],
    why: { flip: WHYK.inverseA },
    nudge: { flip: NUDGEK.inverseA },
    fields: (p) => [num$('w', '\\omega', 'rad/s', L('angular frequency', 'Kreisfrequenz')), num$('A', 'A', unitOfA(p.A), L('amplitude', 'Amplitude'))],
    text: (p) => { const vm = p.A * p.w, am = vm * p.w; return L(`A body oscillates harmonically. Its largest speed is ${q(vm, speedUnit(vm))}, its largest acceleration ${q(am, 'm/s²')}. What are its angular frequency and its amplitude?`, `Ein Körper schwingt harmonisch. Seine grösste Geschwindigkeit beträgt ${q(vm, speedUnit(vm))}, seine grösste Beschleunigung ${q(am, 'm/s²')}. Wie gross sind seine Kreisfrequenz und seine Amplitude?`); },
    hints: (p) => {
      const vm = p.A * p.w, am = vm * p.w;
      return [
        L(`Two values are given, $\\hat v = ${tq(vm, speedUnit(vm))}$ and $\\hat a = ${tq(am, 'm/s²')}$, and two are unknown, $A$ and $\\omega$: write both values as equations in $A$ and $\\omega$.`, `Zwei Werte sind gegeben, $\\hat v = ${tq(vm, speedUnit(vm))}$ und $\\hat a = ${tq(am, 'm/s²')}$, und zwei sind unbekannt, $A$ und $\\omega$: Schreib beide Werte als Gleichungen in $A$ und $\\omega$.`),
        L(`$\\hat v = A\\,\\omega$ and $\\hat a = A\\,\\omega^2$. Divide the second by the first: $A$ cancels, one $\\omega$ is left. Put in $\\hat v$ in m/s.`, `$\\hat v = A\\,\\omega$ und $\\hat a = A\\,\\omega^2$. Teile die zweite durch die erste: $A$ kürzt sich weg, ein $\\omega$ bleibt. Setz $\\hat v$ in m/s ein.`),
        L(`Then $A = \\hat v/\\omega$ with your $\\omega$; it comes out in metres, the answer is asked in ${unitOfA(p.A)}.`, `Dann $A = \\hat v/\\omega$ mit deinem $\\omega$; das gibt Meter, gefragt ist die Antwort in ${unitOfA(p.A)}.`),
      ];
    },
    steps: (p, v) => [
      step(L('The angular frequency', 'Die Kreisfrequenz'), p$(L('Divide $\\hat a = A\\,\\omega^2$ by $\\hat v = A\\,\\omega$:', 'Teile $\\hat a = A\\,\\omega^2$ durch $\\hat v = A\\,\\omega$:')) + `$$\\omega = \\frac{\\hat a}{\\hat v} = \\frac{${tq(v.am, 'm/s²')}}{${tq(v.vm, 'm/s')}} = ${res(W(v.w))}$$`),
      step(L('The amplitude', 'Die Amplitude'), `$$A = \\frac{\\hat v}{\\omega} = \\frac{${tq(v.vm, 'm/s')}}{${W(v.w)}} = ${res(tq(v.A, unitOfA(p.A)))}$$`, ['top']),
    ],
    figure: (p, v, view) => (view.task ? '' : xGraph(p, { dots: peaks(p, view, 'top') })),
  };

  // ================================================================ 4 where on the graph
  // y(t) = A·sin(ωt) (no formula shown) with four named points; one question, one point the answer.
  const PTS = ['P', 'Q', 'R', 'S'];
  const ASK = {
    vmax: { q: () => L('At which point is the body fastest?', 'In welchem Punkt ist der Körper am schnellsten?'), ok: (u) => Math.abs(Math.cos(PI2 * u)) > 0.999 },
    v0: { q: () => L('At which point is the body at rest for a moment?', 'In welchem Punkt ist der Körper einen Moment lang in Ruhe?'), ok: (u) => Math.abs(Math.sin(PI2 * u)) > 0.999 },
    amax: { q: () => L('At which point is the acceleration largest (in size)?', 'In welchem Punkt ist die Beschleunigung (dem Betrag nach) am grössten?'), ok: (u) => Math.abs(Math.sin(PI2 * u)) > 0.999 },
    aplus: { q: () => L('At which point does the acceleration point in the positive direction?', 'In welchem Punkt zeigt die Beschleunigung in positive Richtung?'), ok: (u) => Math.sin(PI2 * u) < -1e-6 },
    vminus: { q: () => L('At which point does the body move in the negative direction?', 'In welchem Punkt bewegt sich der Körper in negativer Richtung?'), ok: (u) => Math.cos(PI2 * u) < -1e-6 },
  };
  // the state of the body at phase u (in periods), in words
  function stateAt(u) {
    const x = Math.sin(PI2 * u), v = Math.cos(PI2 * u);
    if (Math.abs(x) > 0.999) return x > 0 ? L('at the upper turning point: v = 0, the acceleration largest, pointing down (negative)', 'am oberen Umkehrpunkt: v = 0, die Beschleunigung am grössten, nach unten (negativ)') : L('at the lower turning point: v = 0, the acceleration largest, pointing up (positive)', 'am unteren Umkehrpunkt: v = 0, die Beschleunigung am grössten, nach oben (positiv)');
    if (Math.abs(x) < 1e-6) return v > 0 ? L('at the equilibrium, moving up: the speed largest, a = 0', 'in der Gleichgewichtslage, nach oben unterwegs: die Geschwindigkeit am grössten, a = 0') : L('at the equilibrium, moving down: the speed largest, a = 0', 'in der Gleichgewichtslage, nach unten unterwegs: die Geschwindigkeit am grössten, a = 0');
    return L(`${x > 0 ? 'above' : 'below'} the equilibrium, moving ${v > 0 ? 'up' : 'down'}: the acceleration points ${x > 0 ? 'down (negative)' : 'up (positive)'}`, `${x > 0 ? 'oberhalb' : 'unterhalb'} der Gleichgewichtslage, nach ${v > 0 ? 'oben' : 'unten'} unterwegs: Die Beschleunigung zeigt nach ${x > 0 ? 'unten (negativ)' : 'oben (positiv)'}`);
  }
  const points = {
    id: 'points', difficulty: 2, kind: 'points',
    title: () => L('Where on the graph?', 'Wo auf dem Graphen?'),
    make: (r) => {
      const ask = pick(r, Object.keys(ASK)), cand = Array.from({ length: 15 }, (z, k) => (k + 1) / 8); // phases 1/8 … 15/8 periods
      const us = shuffle(r, cand.slice()).slice(0, 4).sort((a, b) => a - b);
      if (us.filter(ASK[ask].ok).length !== 1) return null;
      if (us.some((u, i) => i && u - us[i - 1] < 0.24)) return null; // apart, so the letters do not crowd
      return { ask, us };
    },
    solve: (p) => ({ pt: PTS[p.us.findIndex(ASK[p.ask].ok)] }),
    traps: [],
    fields: (p) => [choice('pt', ASK[p.ask].q(), p.us.map((u, i) => [PTS[i], PTS[i], ASK[p.ask].ok(u) ? '' : L(`At ${PTS[i]} the body is ${stateAt(u)}.`, `In ${PTS[i]} ist der Körper ${stateAt(u)}.`), null]))],
    text: () => L('The graph shows the displacement y of a harmonic oscillation against time.', 'Der Graph zeigt die Auslenkung y einer harmonischen Schwingung gegen die Zeit.'),
    hints: (p) => {
      const onV = p.ask === 'vmax' || p.ask === 'v0' || p.ask === 'vminus';
      const look = {
        vmax: L('Fastest means the steepest graph: which of the four points lies where the graph crosses the t axis?', 'Am schnellsten heisst: der Graph am steilsten. Welcher der vier Punkte liegt dort, wo der Graph die t-Achse kreuzt?'),
        v0: L('At rest means a slope of zero: which of the four points lies at a crest or in a trough?', 'In Ruhe heisst: Steigung null. Welcher der vier Punkte liegt auf einem Berg oder in einem Tal?'),
        amax: L('|a| = ω²·|y| is largest where |y| is largest: which of the four points lies at a crest or in a trough?', '|a| = ω²·|y| ist am grössten, wo |y| am grössten ist: Welcher der vier Punkte liegt auf einem Berg oder in einem Tal?'),
        aplus: L('a = −ω²·y is positive where y is negative: which of the four points lies below the t axis?', 'a = −ω²·y ist positiv, wo y negativ ist: Welcher der vier Punkte liegt unterhalb der t-Achse?'),
        vminus: L('A negative velocity is a negative slope: at which of the four points does the graph go down?', 'Eine negative Geschwindigkeit ist eine negative Steigung: In welchem der vier Punkte geht der Graph nach unten?'),
      };
      return [
        L(`The question is about the ${onV ? 'velocity' : 'acceleration'}. For each of ${PTS.join(', ')}: is the point above, below or on the t axis, and is the graph rising or falling there?`, `Die Frage betrifft die ${onV ? 'Geschwindigkeit' : 'Beschleunigung'}. Für jeden der Punkte ${PTS.join(', ')}: Liegt er oberhalb, unterhalb oder auf der t-Achse, und steigt oder fällt der Graph dort?`),
        onV ? L('The velocity is the slope of y(t): steep where the graph crosses the t axis, zero at crests and troughs, negative where the graph falls.', 'Die Geschwindigkeit ist die Steigung von y(t): steil, wo der Graph die t-Achse kreuzt, null in Bergen und Tälern, negativ, wo der Graph fällt.')
          : L('The acceleration is a = −ω²·y: opposite to the displacement, largest in size at the turning points, zero at the equilibrium.', 'Die Beschleunigung ist a = −ω²·y: entgegen der Auslenkung, dem Betrag nach am grössten an den Umkehrpunkten, null in der Gleichgewichtslage.'),
        look[p.ask],
      ];
    },
    steps: (p) => [step(L('Point by point', 'Punkt für Punkt'), `<ul class="eqlist">${p.us.map((u, i) => `<li>${ASK[p.ask].ok(u) ? `<span class="result">${PTS[i]}</span>` : PTS[i]}: ${stateAt(u)}</li>`).join('')}</ul>`)],
    figure: (p) => {
      const pts = Array.from({ length: 241 }, (z, j) => { const t = (j * 2) / 240; return [t, Math.sin(PI2 * t)]; });
      return `<div class="fig">${Plot.graph([{ pts }], { tEnd: 2, axis: { lo: -1.4, hi: 1.4, step: 1 }, name: 'y', bare: true, points: p.us.map((u, i) => [u, Math.sin(PI2 * u), PTS[i], Math.sin(PI2 * u) < -0.5]), label: L('Displacement against time, with four points', 'Auslenkung gegen die Zeit, mit vier Punkten') })}</div>`;
    },
  };

  // ================================================================ 5 the LC circuit
  // The same equation with other quantities: L·Q̈ = −Q/C as m·ÿ = −D·y, so Q ↔ y, I = Q̇ ↔ v,
  // L ↔ m, 1/C ↔ D and ω = 1/√(LC). No numbers: which quantity is which, ω or T, the current when
  // the charge is largest (and the other way round), and how f changes with L or C.
  const LC_EQ = 'L\\,\\ddot Q = -\\frac{1}{C}\\,Q \\qquad\\longleftrightarrow\\qquad m\\,\\ddot y = -D\\,y';
  const LC_MAP = '$$Q \\leftrightarrow y,\\qquad I = \\dot Q \\leftrightarrow v = \\dot y,\\qquad L \\leftrightarrow m,\\qquad \\frac{1}{C} \\leftrightarrow D$$';
  // the voltage of the capacitor and the current against time, two periods
  function lcGraph() {
    const n = 200, U = [], I = [];
    for (let k = 0; k <= n; k++) { const t = (2 * k) / n; U.push([t, Math.cos(PI2 * t)]); I.push([t, -Math.sin(PI2 * t)]); }
    return `<div class="fig">${Plot.graph([{ pts: U }, { pts: I, cls: 'icurve' }], { tEnd: 2, axis: { lo: -1.2, hi: 1.2, step: 1 }, name: 'Q, I', bare: true, marks: [1], label: L('The charge of the capacitor (solid) and the current (dashed) against time: a quarter of a period apart', 'Die Ladung des Kondensators (ausgezogen) und der Strom (gestrichelt) gegen die Zeit: um eine Viertelperiode verschoben') })}</div>`;
  }
  // the roles: what each quantity of the circuit is, and why a wrong pick is wrong (flag 'map')
  const ROLE = () => ({
    Q: [L('the charge $Q$ on the capacitor', 'die Ladung $Q$ auf dem Kondensator'), L('The charge $Q$ plays the role of the displacement $y$: it is what oscillates.', 'Die Ladung $Q$ spielt die Rolle der Auslenkung $y$: Sie ist es, die schwingt.')],
    I: [L('the current $I = \\dot Q$', 'der Strom $I = \\dot Q$'), L('The current $I = \\dot Q$ plays the role of the velocity $v = \\dot y$.', 'Der Strom $I = \\dot Q$ spielt die Rolle der Geschwindigkeit $v = \\dot y$.')],
    L: [L('the inductance $L$', 'die Induktivität $L$'), L('$L\\,\\ddot Q$ stands where $m\\,\\ddot y$ stands: the inductance plays the role of the mass.', '$L\\,\\ddot Q$ steht dort, wo $m\\,\\ddot y$ steht: Die Induktivität spielt die Rolle der Masse.')],
    C: [L('the capacitance $C$', 'die Kapazität $C$'), L('$Q/C$ stands where $D\\,y$ stands: not $C$, but $1/C$ plays the role of the spring constant.', '$Q/C$ steht dort, wo $D\\,y$ steht: Nicht $C$, sondern $1/C$ spielt die Rolle der Federkonstante.'),
      L('$Q/C$ stands where $D\\,y$ stands: what exactly stands in the place of $D$?', '$Q/C$ steht dort, wo $D\\,y$ steht: Was genau steht an der Stelle von $D$?')],
    invC: [L('one over the capacitance, $1/C$', 'eins durch die Kapazität, $1/C$'), L('$Q/C$ stands where $D\\,y$ stands: $1/C$ plays the role of the spring constant.', '$Q/C$ steht dort, wo $D\\,y$ steht: $1/C$ spielt die Rolle der Federkonstante.')],
    invL: [L('one over the inductance, $1/L$', 'eins durch die Induktivität, $1/L$'), L('$L\\,\\ddot Q$ stands where $m\\,\\ddot y$ stands: $L$ itself plays the role of the mass.', '$L\\,\\ddot Q$ steht dort, wo $m\\,\\ddot y$ steht: $L$ selbst spielt die Rolle der Masse.')],
    dQ: [L('the rate of change of the current, $\\ddot Q = \\dot I$', 'die Änderungsrate des Stroms, $\\ddot Q = \\dot I$'), L('$\\ddot Q$ plays the role of the acceleration $\\ddot y$.', '$\\ddot Q$ spielt die Rolle der Beschleunigung $\\ddot y$.')],
    U: [L('the voltage $V = Q/C$ of the capacitor', 'die Spannung $U = Q/C$ am Kondensator'), L('$V = Q/C$ plays the role of $D\\,y$, the spring’s force (it is proportional to $Q$).', '$U = Q/C$ spielt die Rolle von $D\\,y$, der Federkraft (sie ist proportional zu $Q$).')],
  });
  // ask: [what, right key, three wrong keys]
  const ROLES = {
    y: [() => L('the displacement $y$', 'der Auslenkung $y$'), 'Q', ['I', 'U', 'dQ']],
    v: [() => L('the velocity $v$', 'der Geschwindigkeit $v$'), 'I', ['Q', 'U', 'dQ']],
    m: [() => L('the mass $m$', 'der Masse $m$'), 'L', ['C', 'invC', 'Q']],
    D: [() => L('the spring constant $D$', 'der Federkonstante $D$'), 'invC', ['C', 'L', 'invL']],
  };
  // ω and T: the right one and the usual wrong ones (as in equations.js)
  const LC_W = () => [['right', '\\omega = \\frac{1}{\\sqrt{L\\,C}}', ''], ['omega2', '\\omega = \\frac{1}{L\\,C}', L('That is $\\omega^2$: in $\\ddot Q = -\\omega^2\\,Q$ the factor is $\\omega^2 = 1/(LC)$. Take the square root.', 'Das ist $\\omega^2$: In $\\ddot Q = -\\omega^2\\,Q$ ist der Faktor $\\omega^2 = 1/(LC)$. Zieh die Wurzel.'),
      L('Compare with $\\ddot Q = -\\omega^2\\,Q$: is the factor in front of $Q$ equal to $\\omega$ or to $\\omega^2$?', 'Vergleiche mit $\\ddot Q = -\\omega^2\\,Q$: Ist der Faktor vor $Q$ gleich $\\omega$ oder gleich $\\omega^2$?')],
    ['inverse', '\\omega = \\sqrt{L\\,C}', L('Upside down: as $\\omega = \\sqrt{D/m}$, $\\omega = \\sqrt{1/(LC)}$.', 'Kehrwert verwechselt: Wie $\\omega = \\sqrt{D/m}$ ist $\\omega = \\sqrt{1/(LC)}$.'),
      L('As $\\omega = \\sqrt{D/m}$ for the spring: which quantity plays the role of $D$, which that of $m$?', 'Wie $\\omega = \\sqrt{D/m}$ bei der Feder: Welche Grösse spielt die Rolle von $D$, welche jene von $m$?')],
    ['map', '\\omega = \\sqrt{\\frac{C}{L}}', L('$C$ taken for $D$: it is $1/C$ that plays the role of the spring constant, so $\\omega^2 = D/m = 1/(LC)$.', '$C$ für $D$ genommen: $1/C$ spielt die Rolle der Federkonstante, also $\\omega^2 = D/m = 1/(LC)$.'),
      L('$C$ taken for $D$? Look again at what stands in $L\\,\\dot I + Q/C = 0$ where $D\\,y$ stands.', '$C$ für $D$ genommen? Schau nochmals, was in $L\\,\\dot I + Q/C = 0$ dort steht, wo $D\\,y$ steht.')]];
  const LC_T = () => [['right', 'T = 2\\pi\\sqrt{L\\,C}', ''], ['inverse', 'T = \\frac{2\\pi}{\\sqrt{L\\,C}}', L('That is $2\\pi\\cdot\\omega$. The period is $T = 2\\pi/\\omega$ with $\\omega = 1/\\sqrt{LC}$.', 'Das ist $2\\pi\\cdot\\omega$. Die Periode ist $T = 2\\pi/\\omega$ mit $\\omega = 1/\\sqrt{LC}$.'),
      L('That is $2\\pi\\cdot\\omega$. How is the period related to $\\omega$?', 'Das ist $2\\pi\\cdot\\omega$. Wie hängt die Periode mit $\\omega$ zusammen?')],
    ['omega2', 'T = 2\\pi\\,L\\,C', L('The root is missing: $\\omega^2 = 1/(LC)$, so $\\omega = 1/\\sqrt{LC}$.', 'Die Wurzel fehlt: $\\omega^2 = 1/(LC)$, also $\\omega = 1/\\sqrt{LC}$.'),
      L('Compare with $\\ddot Q = -\\omega^2\\,Q$: is $1/(LC)$ equal to $\\omega$ or to $\\omega^2$?', 'Vergleiche mit $\\ddot Q = -\\omega^2\\,Q$: Ist $1/(LC)$ gleich $\\omega$ oder gleich $\\omega^2$?')],
    ['freq', 'T = \\frac{1}{2\\pi\\sqrt{L\\,C}}', L('That is the frequency $f = 1/T$.', 'Das ist die Frequenz $f = 1/T$.')]];
  const LC_WHEN = () => ({
    Q: [L('When the charge on the capacitor is largest, the current is', 'Wenn die Ladung auf dem Kondensator am grössten ist, ist der Strom'), L('like the velocity at a turning point', 'wie die Geschwindigkeit an einem Umkehrpunkt')],
    I: [L('When the current is largest, the charge on the capacitor is', 'Wenn der Strom am grössten ist, ist die Ladung auf dem Kondensator'), L('like the displacement at the equilibrium', 'wie die Auslenkung in der Gleichgewichtslage')],
  });
  const LC_WHEN_NUDGE = () => L('Like $y$ and $v$, $Q$ and $I = \\dot Q$ are a quarter of a period apart. For the spring: how large is $v$ where $y$ is largest?', 'Wie $y$ und $v$ sind $Q$ und $I = \\dot Q$ um eine Viertelperiode verschoben. Bei der Feder: Wie gross ist $v$, wo $y$ am grössten ist?');
  const LC_WHEN_OPTS = () => [['zero', L('zero', 'null'), ''], ['max', L('largest too', 'auch am grössten'), L('Like $y$ and $v$, $Q$ and $I = \\dot Q$ are a quarter of a period apart: when one is largest, the other is zero.', 'Wie $y$ und $v$ sind $Q$ und $I = \\dot Q$ um eine Viertelperiode verschoben: Wenn das eine am grössten ist, ist das andere null.')],
    ['half', L('half its largest value', 'halb so gross wie am grössten'), L('Like $y$ and $v$, $Q$ and $I = \\dot Q$ are a quarter of a period apart: when one is largest, the other is zero.', 'Wie $y$ und $v$ sind $Q$ und $I = \\dot Q$ um eine Viertelperiode verschoben: Wenn das eine am grössten ist, ist das andere null.')],
    ['dep', L('it depends on $L$ and $C$', 'das hängt von $L$ und $C$ ab'), L('Whatever $L$ and $C$ are, $Q$ and $I = \\dot Q$ are a quarter of a period apart: when one is largest, the other is zero.', 'Was immer $L$ und $C$ sind: $Q$ und $I = \\dot Q$ sind um eine Viertelperiode verschoben. Wenn das eine am grössten ist, ist das andere null.')]];
  const lcEq = {
    id: 'lc-eq', difficulty: 2, kind: 'lc',
    title: () => L('The LC circuit', 'Der Schwingkreis'),
    make: (r) => ({ ask: pick(r, ['y', 'v', 'm', 'D', 'w', 'T', 'whenQ', 'whenI']), seed: Math.floor(r() * 1e9) }),
    solve: () => ({ ans: 'right' }),
    traps: [],
    fields: (p) => {
      const r = orderOf(p);
      if (ROLES[p.ask]) {
        const [what, right, wrong] = ROLES[p.ask], R = ROLE();
        return [choice('ans', L(`The role of ${what()} is played by:`, `Die Rolle ${what()} spielt:`), shuffle(r, [['right', R[right][0], '', null], ...wrong.map((k) => [k, R[k][0], R[k][1], 'map', R[k][2] || ''])]),
          { stack: true, ask: L(`Which quantity of the LC circuit plays the role of ${what()}?`, `Welche Grösse des Schwingkreises spielt die Rolle ${what()}?`) })];
      }
      if (p.ask === 'w' || p.ask === 'T') {
        const opts = (p.ask === 'w' ? LC_W() : LC_T()).map(([k, tex, why, nudge]) => [k, `$${tex}$`, why, k === 'right' ? null : k, nudge || '']);
        return [choice('ans', p.ask === 'w' ? L('Its angular frequency:', 'Seine Kreisfrequenz:') : L('Its period:', 'Seine Periode:'), shuffle(r, opts),
          { ask: p.ask === 'w' ? L('What is the angular frequency of the LC circuit?', 'Wie gross ist die Kreisfrequenz des Schwingkreises?') : L('What is the period of the LC circuit?', 'Wie gross ist die Periode des Schwingkreises?') })];
      }
      const [lead] = LC_WHEN()[p.ask.slice(4)];
      return [choice('ans', `${lead} …`, LC_WHEN_OPTS().map(([k, html, why]) => [k === 'zero' ? 'right' : k, html, why, k === 'zero' ? null : 'lcphase', k === 'zero' ? '' : LC_WHEN_NUDGE()]), { stack: true, ask: `${lead} …` })];
    },
    text: () => L('In an LC circuit without resistance, the voltages across the coil and the capacitor add up to zero: $L\\,\\dot I + Q/C = 0$, where $Q$ is the charge on the capacitor and $I = \\dot Q$ the current. Compare it with a body on a spring.', 'In einem Schwingkreis ohne Widerstand ergeben die Spannungen an der Spule und am Kondensator zusammen null: $L\\,\\dot I + Q/C = 0$, wobei $Q$ die Ladung auf dem Kondensator ist und $I = \\dot Q$ der Strom. Vergleiche mit einem Körper an einer Feder.'),
    // by the question asked: where to look in the two equations, and the first step
    hints: (p) => {
      const side = L('Write $L\\,\\ddot Q = -\\frac{1}{C}\\,Q$ (from $L\\,\\dot I + Q/C = 0$ with $I = \\dot Q$) above $m\\,\\ddot y = -D\\,y$, term by term.', 'Schreib $L\\,\\ddot Q = -\\frac{1}{C}\\,Q$ (aus $L\\,\\dot I + Q/C = 0$ mit $I = \\dot Q$) über $m\\,\\ddot y = -D\\,y$, Term für Term.');
      const H = {
        y: [L('Which quantity of the circuit sits in the place of $y$, on both sides of the equation?', 'Welche Grösse des Schwingkreises steht an der Stelle von $y$, auf beiden Seiten der Gleichung?'), L('In $m\\,\\ddot y = -D\\,y$ the quantity under the two dots is the one that oscillates. Which letter stands under the dots in the circuit’s equation?', 'In $m\\,\\ddot y = -D\\,y$ ist die Grösse unter den zwei Punkten jene, die schwingt. Welcher Buchstabe steht in der Gleichung des Schwingkreises unter den Punkten?')],
        v: [L('First find what sits in the place of $y$. The velocity is $v = \\dot y$, the rate of change of $y$.', 'Finde zuerst, was an der Stelle von $y$ steht. Die Geschwindigkeit ist $v = \\dot y$, die Änderungsrate von $y$.'), L('So: which quantity of the circuit is the rate of change of the one in the place of $y$? The text names it.', 'Also: Welche Grösse des Schwingkreises ist die Änderungsrate jener an der Stelle von $y$? Der Text nennt sie.')],
        m: [L('Look only at the left-hand sides: which factor stands in front of the second derivative?', 'Schau nur die linken Seiten an: Welcher Faktor steht vor der zweiten Ableitung?'), L('In $m\\,\\ddot y$ the mass is the factor of $\\ddot y$. Which factor multiplies $\\ddot Q$ in the circuit?', 'In $m\\,\\ddot y$ ist die Masse der Faktor von $\\ddot y$. Welcher Faktor multipliziert im Schwingkreis $\\ddot Q$?')],
        D: [L('Look only at the right-hand sides, $-\\frac{1}{C}\\,Q$ and $-D\\,y$: what stands in front of $Q$ where $D$ stands in front of $y$?', 'Schau nur die rechten Seiten an, $-\\frac{1}{C}\\,Q$ und $-D\\,y$: Was steht vor $Q$, wo $D$ vor $y$ steht?'), L('Write $\\frac{Q}{C}$ as (a factor)$\\cdot Q$: is that factor $C$ itself?', 'Schreib $\\frac{Q}{C}$ als (ein Faktor)$\\cdot Q$: Ist dieser Faktor $C$ selbst?')],
        w: [L('Divide by $L$, as $m\\,\\ddot y = -D\\,y$ becomes $\\ddot y = -\\frac{D}{m}\\,y$: what stands in front of $-Q$ then?', 'Teile durch $L$, so wie $m\\,\\ddot y = -D\\,y$ zu $\\ddot y = -\\frac{D}{m}\\,y$ wird: Was steht dann vor $-Q$?'), L('Compare with $\\ddot Q = -\\omega^2\\,Q$: is that factor $\\omega$ or $\\omega^2$?', 'Vergleiche mit $\\ddot Q = -\\omega^2\\,Q$: Ist dieser Faktor $\\omega$ oder $\\omega^2$?')],
        T: [L('Divide by $L$, as $m\\,\\ddot y = -D\\,y$ becomes $\\ddot y = -\\frac{D}{m}\\,y$: what stands in front of $-Q$ then?', 'Teile durch $L$, so wie $m\\,\\ddot y = -D\\,y$ zu $\\ddot y = -\\frac{D}{m}\\,y$ wird: Was steht dann vor $-Q$?'), L('That factor is $\\omega^2$: find $\\omega$ from it, then the period $T = 2\\pi/\\omega$.', 'Dieser Faktor ist $\\omega^2$: Bestimme daraus $\\omega$, dann die Periode $T = 2\\pi/\\omega$.')],
        whenQ: [L('$Q$ plays the role of $y$, and $I = \\dot Q$ that of $v = \\dot y$. So for a body on a spring: how fast is it when its displacement is largest?', '$Q$ spielt die Rolle von $y$, und $I = \\dot Q$ jene von $v = \\dot y$. Also bei einem Körper an einer Feder: Wie schnell ist er, wenn seine Auslenkung am grössten ist?'), L('Where is the body on the spring when its displacement is largest, and what does it do there next?', 'Wo ist der Körper an der Feder, wenn seine Auslenkung am grössten ist, und was tut er dort als Nächstes?')],
        whenI: [L('$Q$ plays the role of $y$, and $I = \\dot Q$ that of $v = \\dot y$. So for a body on a spring: how large is its displacement when it is fastest?', '$Q$ spielt die Rolle von $y$, und $I = \\dot Q$ jene von $v = \\dot y$. Also bei einem Körper an einer Feder: Wie gross ist seine Auslenkung, wenn er am schnellsten ist?'), L('At which place on its path is the body on the spring fastest?', 'An welcher Stelle seiner Bahn ist der Körper an der Feder am schnellsten?')],
      }[p.ask];
      return [`${side} ${H[0]}`, H[1]];
    },
    steps: (p) => {
      const R = ROLE();
      const answer = ROLES[p.ask] ? p$(L(`So ${ROLES[p.ask][0]()} corresponds to <span class="result">${R[ROLES[p.ask][1]][0]}</span>.`, `Der Rolle ${ROLES[p.ask][0]()} entspricht also <span class="result">${R[ROLES[p.ask][1]][0]}</span>.`))
        : p.ask === 'w' ? p$(L('As $\\omega^2 = D/m$ for the spring:', 'Wie $\\omega^2 = D/m$ bei der Feder:')) + `$$\\omega^2 = \\frac{1}{L\\,C}\\qquad\\Longrightarrow\\qquad ${res('\\omega = \\frac{1}{\\sqrt{L\\,C}}')}$$`
          : p.ask === 'T' ? p$(L('With $\\omega^2 = 1/(LC)$, as $\\omega^2 = D/m$ for the spring (Thomson’s formula):', 'Mit $\\omega^2 = 1/(LC)$, wie $\\omega^2 = D/m$ bei der Feder (Thomsonsche Formel):')) + `$$T = \\frac{2\\pi}{\\omega} = ${res('2\\pi\\sqrt{L\\,C}')}$$`
            : p$(L(`${LC_WHEN()[p.ask.slice(4)][0]} <span class="result">zero</span>, ${LC_WHEN()[p.ask.slice(4)][1]}: the charge and the current are a quarter of a period apart.`, `${LC_WHEN()[p.ask.slice(4)][0]} <span class="result">null</span>, ${LC_WHEN()[p.ask.slice(4)][1]}: Ladung und Strom sind um eine Viertelperiode verschoben.`));
      return [
        step(L('The same equation', 'Dieselbe Gleichung'), p$(L('The voltage across the coil is $L\\,\\dot I = L\\,\\ddot Q$; with the one across the capacitor, $Q/C$, it adds up to zero:', 'Die Spannung an der Spule ist $L\\,\\dot I = L\\,\\ddot Q$; mit jener am Kondensator, $Q/C$, ergibt sie null:')) +
          `$$L\\,\\ddot Q = -\\frac{1}{C}\\,Q\\qquad\\Longrightarrow\\qquad \\ddot Q = -\\frac{1}{L\\,C}\\,Q$$` + p$(L('This is $\\ddot y = -\\omega^2\\, y$ again: the charge oscillates harmonically. Term by term, as $m\\,\\ddot y = -D\\,y$:', 'Das ist wieder $\\ddot y = -\\omega^2\\, y$: Die Ladung schwingt harmonisch. Term für Term, wie $m\\,\\ddot y = -D\\,y$:')) + LC_MAP),
        step(L('The answer', 'Die Antwort'), answer, p.ask.startsWith('when') ? ['graph'] : []),
      ];
    },
    figure: (p, v, view) => box(LC_EQ) + root.Figures.lc(p.ask === 'whenI' ? 1 : 0, { caption: !view.task }) + (view.show && view.show.has('graph') ? lcGraph() : ''),
  };

  // how the frequency changes with L or C: f ∝ 1/√(LC), as for a spring f ∝ √(D/m)
  const fac = (x) => (x >= 1 ? `$\\times ${sig(x, 3)}$` : `$\\times \\tfrac{1}{${sig(1 / x, 3)}}$`);
  const lcScale = {
    id: 'lc-scale', difficulty: 3, kind: 'lcscale',
    title: () => L('Change the circuit', 'Den Schwingkreis ändern'),
    make: (r) => { const what = pick(r, ['C', 'L', 'C', 'L', 'both']); return { what, k: pick(r, what === 'both' ? [2, 3, 4, 0.5] : [4, 9, 16, 0.25]) }; },
    solve: () => ({ fac: 'right' }),
    traps: [],
    fields: (p) => {
      const k = p.k, LC = p.what === 'both' ? k * k : k, right = 1 / Math.sqrt(LC);
      const fnudge = L('Write $f$ with $L$ and $C$: how exactly does it depend on the product $L\\cdot C$?', 'Schreib $f$ mit $L$ und $C$ hin: Wie genau hängt $f$ vom Produkt $L\\cdot C$ ab?');
      const nudges = { root: fnudge, prop: fnudge, dirn: L('Does the oscillation get faster or slower? A larger inductance is like a larger mass, a larger capacitance like a softer spring.', 'Wird die Schwingung schneller oder langsamer? Eine grössere Induktivität ist wie eine grössere Masse, eine grössere Kapazität wie eine weichere Feder.') };
      const opts = [[1 / LC, 'root', L('The root is missing: the frequency goes with $1/\\sqrt{L\\,C}$, not with $1/(L\\,C)$.', 'Die Wurzel fehlt: Die Frequenz geht mit $1/\\sqrt{L\\,C}$, nicht mit $1/(L\\,C)$.')], [right, 'right', ''],
        [Math.sqrt(LC), 'dirn', L('The right size, the wrong way: a larger inductance is like a larger mass, a larger capacitance like a softer spring: both make the oscillation slower.', 'Die richtige Grösse, die falsche Richtung: Eine grössere Induktivität ist wie eine grössere Masse, eine grössere Kapazität wie eine weichere Feder: Beide machen die Schwingung langsamer.')],
        [LC, 'prop', L('$f = 1/(2\\pi\\sqrt{L\\,C})$: the frequency changes with one over the square root of $L\\cdot C$.', '$f = 1/(2\\pi\\sqrt{L\\,C})$: Die Frequenz ändert sich mit eins durch die Wurzel aus $L\\cdot C$.')]]
        .sort((a, b) => a[0] - b[0]);
      return [choice('fac', L('The frequency changes by:', 'Die Frequenz ändert sich um:'), opts.map(([x, key, why]) => [key, fac(x), why, key === 'right' ? null : key === 'dirn' ? 'inverse' : 'omega2', nudges[key] || '']), { ask: L('By what factor does the frequency change?', 'Um welchen Faktor ändert sich die Frequenz?') })];
    },
    text: (p) => {
      const k = p.k, what = { C: L('the capacitance', 'die Kapazität'), L: L('the inductance', 'die Induktivität') };
      const by = (x) => (x >= 1 ? L(`${x} times as large`, `${x}-mal so gross`) : 1 / x === 2 ? L('half as large', 'halb so gross') : L('a quarter as large', 'einen Viertel so gross'));
      return p.what === 'both'
        ? L(`In an LC circuit, both the capacitance and the inductance are made ${by(k)}. By what factor does its frequency change?`, `In einem Schwingkreis werden sowohl die Kapazität als auch die Induktivität ${by(k)} gemacht. Um welchen Faktor ändert sich seine Frequenz?`)
        : L(`In an LC circuit, ${what[p.what]} is made ${by(k)}. By what factor does its frequency change?`, `In einem Schwingkreis wird ${what[p.what]} ${by(k)} gemacht. Um welchen Faktor ändert sich seine Frequenz?`);
    },
    hints: (p) => {
      const what = { C: L('the capacitance', 'die Kapazität'), L: L('the inductance', 'die Induktivität'), both: L('both $L$ and $C$', 'sowohl $L$ als auch $C$') }[p.what];
      const big = p.k > 1;
      return [
        L(`Here ${what} ${p.what === 'both' ? 'get' : 'gets'} ${big ? 'larger' : 'smaller'} (${fac(p.k)}). A larger $L$ is like a larger mass, a larger $C$ like a softer spring: does the circuit oscillate faster or slower now?`, `Hier ${p.what === 'both' ? 'werden' : 'wird'} ${what} ${big ? 'grösser' : 'kleiner'} (${fac(p.k)}). Ein grösseres $L$ ist wie eine grössere Masse, ein grösseres $C$ wie eine weichere Feder: Schwingt der Kreis jetzt schneller oder langsamer?`),
        L(`$f = 1/(2\\pi\\sqrt{L\\,C})$: the frequency depends only on the product $L\\cdot C$. ${p.what === 'both' ? 'Both factors change: by what factor does the product $L\\cdot C$ change, then its root, then one over the root?' : 'By what factor does the product $L\\cdot C$ change here, then its root, then one over the root?'}`,
          `$f = 1/(2\\pi\\sqrt{L\\,C})$: Die Frequenz hängt nur vom Produkt $L\\cdot C$ ab. ${p.what === 'both' ? 'Beide Faktoren ändern sich: Um welchen Faktor ändert sich das Produkt $L\\cdot C$, dann seine Wurzel, dann eins durch die Wurzel?' : 'Um welchen Faktor ändert sich das Produkt $L\\cdot C$ hier, dann seine Wurzel, dann eins durch die Wurzel?'}`),
      ];
    },
    steps: (p) => {
      const LC = p.what === 'both' ? p.k * p.k : p.k, right = 1 / Math.sqrt(LC);
      return [step(L('The factor', 'Der Faktor'), p$(L(`From $\\omega = 1/\\sqrt{L\\,C}$, $f = \\omega/(2\\pi) = 1/(2\\pi\\sqrt{L\\,C})$. The product $L\\cdot C$ changes by the factor ${sig(LC, 3)}; its root by ${sig(Math.sqrt(LC), 3)}. The frequency is one over it:`, `Aus $\\omega = 1/\\sqrt{L\\,C}$ folgt $f = \\omega/(2\\pi) = 1/(2\\pi\\sqrt{L\\,C})$. Das Produkt $L\\cdot C$ ändert sich um den Faktor ${sig(LC, 3)}; seine Wurzel um ${sig(Math.sqrt(LC), 3)}. Die Frequenz ist eins durch sie:`)) +
        `$$f' = \\frac{1}{2\\pi\\sqrt{${sig(LC, 3)}\\,L\\,C}} = \\frac{1}{\\sqrt{${sig(LC, 3)}}}\\cdot f = ${res(right >= 1 ? `${sig(right, 3)}\\,f` : `\\tfrac{1}{${sig(1 / right, 3)}}\\,f`)}$$`)];
    },
    figure: (p, v, view) => (view.task ? root.Figures.lc(0, { caption: false }) : lcGraph()),
  };

  // ================================================================ watching
  // Once an exercise is solved or its solution shown (and in the last frame of three worked
  // examples), the student lets the body go and watches it move (app.js, play.js; the scene is
  // Figures.watchScene): oscWatch(o), o = { kind ('spring': a body on a spring; 'pointer': the
  // turning pointer and its body; 'track': a body on a track, moving by an equation), and either
  // A, w, phi (spring, pointer: y = A·cos(ωt − φ₀) once let go, at rest at y = A·cos φ₀ before;
  // push: at rest at the equilibrium and pushed upwards at t = 0, φ₀ = π/2), or given and curve [[t, y]]
  // (track: the kind of equation, NKINDS, and its motion from rest at y(0) > 0) and axis (that of the exercise's graphs); t1 (the end of the
  // run: two periods, or the time of the exercise's graphs), unit ('s': numbers in SI, shown in
  // units { y, v, a }; 'T': times in periods, y in units of A, no numbers; '': no numbers at
  // all), panels (['y'], or ['y', 'v', 'a'] with the arrows of v and a in the scene), name (the
  // letter of y), marks(w, get) }.
  // It returns o with at(t) → { y, v, a, ph (the pointer's angle from the horizontal, π/2 + ωt − φ₀) } (before t = 0 at rest, a = 0:
  // the support holds the body; at t = 0 the acceleration jumps, or with a push the velocity),
  // amp { y, v, a } (the largest sizes) and marks(get): get(key) is the answer of a field (a
  // number in its unit, NaN if none, or the option chosen, null if none); each mark is { key, q
  // ('y', 'v' or 'a': the curve), t, y (in the unit of the graph), ok (a choice: right or not; a
  // number: null, the app judges it as in the feedback), say (html: what the answer was) }, at a
  // time from 0 to t1 (later ones at t1).
  // A damped body (damping.js) gives instead fn(t) → { y, v, a } after the release and amp (the
  // sizes of its graphs), with kind 'spring' (or 'track' and a curve, as above).
  function oscWatch(o) {
    const w = { arrows: o.panels.length > 1, ...o };
    if (o.fn) {
      // a damped body (damping.js): at rest at y = fn(0).y before it is let go
      const y0 = o.fn(0).y;
      w.at = (t) => (t < 0 ? { y: y0, v: 0, a: 0 } : o.fn(t));
    } else if (o.curve) {
      const pts = o.curve, dt = pts[1][0] - pts[0][0];
      const yAt = (t) => { const k = Math.min(pts.length - 2, Math.floor(t / dt)), u = Math.min(1, (t - pts[k][0]) / dt); return pts[k][1] + u * (pts[k + 1][1] - pts[k][1]); };
      w.at = (t) => ({ y: t < 0 ? pts[0][1] : yAt(t), v: null, a: null });
      w.amp = { y: Math.max(Math.abs(o.axis.lo), Math.abs(o.axis.hi)) };
    } else {
      const { A, w: om, phi } = o;
      w.T = PI2 / om;
      w.at = (t) => (t < 0 ? { y: o.push ? 0 : A * Math.cos(phi), v: 0, a: 0, ph: Math.PI / 2 - phi }
        : { y: A * Math.cos(om * t - phi), v: -A * om * Math.sin(om * t - phi), a: -A * om * om * Math.cos(om * t - phi), ph: Math.PI / 2 + om * t - phi });
      w.amp = { y: A, v: A * om, a: A * om * om };
    }
    w.marks = (get) => (o.marks ? o.marks(w, get) : []).filter((m) => Number.isFinite(m.t) && m.t >= 0 && Number.isFinite(m.y)).map((m) => ({ ...m, t: Math.min(m.t, w.t1) }));
    return w;
  }
  const yourAnswer = () => L('your answer', 'deine Antwort');
  const yourGraph = () => L('your graph', 'dein Graph');
  // a number answered: the ring at (t, y) on the curve q
  const numMark = (key, q, t, y, say) => ({ key, q, t, y, ok: null, say });
  // a graph chosen (f: its y at t): rings at the times, each ✓ where it lies on the motion (within
  // tol; on a track as far as the axis goes); a wrong one also where it is farthest off
  function curveMarks(w, key, f, times, tol, say) {
    const clip = (y) => (w.axis ? Math.max(w.axis.lo - tol, Math.min(w.axis.hi + tol, y)) : y);
    const off = (t) => Math.abs(clip(f(t)) - clip(w.at(t).y)), out = times.map((t) => ({ key, q: 'y', t, y: clip(f(t)), ok: off(t) <= tol, say }));
    if (out.every((m) => m.ok)) {
      const grid = Array.from({ length: 401 }, (z, k) => (k * w.t1) / 400), far = grid.reduce((a, t) => (off(t) > off(a) ? t : a), 0);
      if (off(far) > tol) out.push({ key, q: 'y', t: far, y: clip(f(far)), ok: false, say });
    }
    return out.sort((a, b) => a.t - b.t);
  }
  // the kinematics: a body on a spring let go from y = A, y = A·cos(ωt), for two periods
  const kinWatch = (p, panels, marks) => oscWatch({ kind: 'spring', A: p.A, w: p.w, phi: 0, t1: (2 * PI2) / p.w, unit: 's', panels,
    units: { y: unitOfA(p.A), v: speedUnit(p.A * p.w), a: 'm/s²' }, marks });
  // the motion of an equation, finer than the graphs (the same for the same kind)
  const FINE = {};
  const fineCurve = (kind) => (FINE[kind] = FINE[kind] || Eq.trace(NKINDS[kind].motion(), T_END, 960, Y0));
  const matchWatch = (p, key, axis) => oscWatch({ kind: 'track', given: p.given, curve: fineCurve(p.given), axis, t1: T_END, unit: '', panels: ['y'], name: p.y,
    marks: (w, get) => { const k = get(key); if (!k || !NKINDS[k] || !p.kinds.includes(k)) return []; const c = matchWatch({ ...p, given: k }, key, axis); return curveMarks(w, key, (t) => c.at(t).y, [Math.PI, 2.5 * Math.PI, 5 * Math.PI], 0.04 * (w.axis.hi - w.axis.lo), key === 'eq' ? L('the motion of your equation', 'die Bewegung deiner Gleichung') : yourGraph()); } });
  circle.watch = (p) => {
    const phi = (p.k * Math.PI) / 4;
    return oscWatch({ kind: 'pointer', A: 1, w: PI2, phi, t1: 2, unit: 'T', panels: ['y'],
      marks: (w, get) => { const k = get('graph'); return CIRCLE[k] && p.kinds.includes(k) ? curveMarks(w, 'graph', (u) => CIRCLE[k](u, phi), [0.25, 0.75, 1.5], 0.08, yourGraph()) : []; } });
  };
  match1.watch = (p) => matchWatch(p, 'graph', axisOf(p.kinds));
  match2.watch = (p) => matchWatch(p, 'graph', axisOf(p.kinds));
  matchBack.watch = (p) => matchWatch(p, 'eq', axisOf([p.given]));
  // y = A·sin(ωt) = A·cos(ωt − π/2): at rest at the equilibrium, pushed upwards at t = 0; the point chosen
  points.watch = (p) => oscWatch({ kind: 'spring', push: true, A: 1, w: PI2, phi: Math.PI / 2, t1: 2, unit: 'T', panels: ['y', 'v', 'a'],
    marks: (w, get) => {
      const i = PTS.indexOf(get('pt'));
      return i < 0 ? [] : [{ key: 'pt', q: 'y', t: p.us[i], y: Math.sin(PI2 * p.us[i]), ok: ASK[p.ask].ok(p.us[i]), say: L(`your point ${PTS[i]}`, `dein Punkt ${PTS[i]}`) }];
    } });
  // v̂ where v = +v̂ (at 3T/4), â where a = +â (at T/2); ω as the period, where y is back at A; A at
  // the lower turning point
  const hat = (s) => `<i>${s}&#770;</i>`;
  const omegaMark = (p) => (x) => numMark('w', 'y', PI2 / x, inUnit(p.A, unitOfA(p.A)), `${yourAnswer()}: <i>ω</i> = ${OC.num(x)} s⁻¹, ${L('one period', 'eine Periode')} <i>T</i> = 2π/<i>ω</i> = ${OC.num(PI2 / x)} s`);
  const amaxMark = (p) => (x) => numMark('amax', 'a', Math.PI / p.w, x, `${yourAnswer()}: ${hat('a')} = ${OC.num(x)} m/s²`);
  vmax.watch = (p) => kinWatch(p, ['y', 'v', 'a'], (w, get) => [
    numMark('vmax', 'v', (1.5 * Math.PI) / p.w, get('vmax'), `${yourAnswer()}: ${hat('v')} = ${OC.num(get('vmax'))} ${speedUnit(p.A * p.w)}`), amaxMark(p)(get('amax'))]);
  backW.watch = (p) => kinWatch(p, ['y', 'v', 'a'], (w, get) => [omegaMark(p)(get('w')), amaxMark(p)(get('amax'))]);
  backA.watch = (p) => kinWatch(p, ['y', 'v', 'a'], (w, get) => [omegaMark(p)(get('w')),
    numMark('A', 'y', Math.PI / p.w, -get('A'), `${yourAnswer()}: <i>A</i> = ${OC.num(get('A'))} ${unitOfA(p.A)}`)]);

  const SCENARIOS = [circle, pickShm, shm1, shm2, shm3, match1, match2, matchBack, points, vmax, backW, backA, lcEq, lcScale];

  root.Scenarios = { SCENARIOS, NKINDS, curveOf, Y0, AXIS, xGraph, CIRCLE, oscWatch, curveMarks, numMark };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
