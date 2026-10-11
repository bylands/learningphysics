// The situations of the app, from the worksheet “Force Vectors” and around it: point charges, the
// Coulomb force between two of them, and the net force of several (superposition). Each situation:
//   { id, difficulty, title(p), make(r) → parameters p, solve(p, o) → values v (SI; with a flag
//     of traps set in o: the result of that wrong idea), traps: [flag], why: { flag: () => text },
//     fields(p) → [field], text(p), hints(p, v), steps(p, v) → [{ text, show: [force keys] }],
//     figure(p, v, view) }
// A field is a number { key, type: 'num', sym, unit, what } (its value in the unit), a choice
// { key, type: 'choice', what, options: [[value, html]] }, a direction { key, type: 'dir', what,
// dirs } (the eight of the compass and '0') or a ranking { key, type: 'rank', what, items }.
// view: { task: true } the situation; { show: Set } with the forces of those keys drawn.
(function (root) {
  'use strict';

  const CL = root.CL, { Pic } = root.Draw;
  const { L, K, force, add, len, unit, mul, sub, dirOf, dirName, ARROW, DIRS, DIRVEC, q, tq, qs, tnum, sig, inUnit, forceUnit, pick, sign, shuffle } = CL;

  // ---------------------------------------------------------------- helpers
  const step = (rule, html, show = [], hl = []) => ({ text: `<p class="step-rule">${rule}</p>${html}`, show, hl });
  const p$ = (s) => `<p>${s}</p>`;
  const m$ = (s) => `$${s}$`;
  const res = (x) => `\\htmlClass{result}{${x}}`;
  const rt = (x) => `<span class="result">${x}</span>`; // a result in the text
  const num$ = (key, sym, unit, what) => ({ key, type: 'num', sym, unit, what });
  const choice = (key, what, options, want) => ({ key, type: 'choice', what, options, want });
  const dirField = (key, what, dirs) => ({ key, type: 'dir', what, dirs });
  // SVG labels: an italic letter with an upright subscript
  const sv = (l, s = '') => `<tspan font-style="italic">${l}</tspan>${s ? `<tspan class="sub" dy="4">${s}</tspan><tspan dy="-4">\u200b</tspan>` : ''}`;
  const kq = 'k\\,\\frac{|q_1|\\,|q_2|}{r^2}';
  const KT = '9.0\\cdot 10^{9}\\,\\mathrm{\\tfrac{N\\,m^2}{C^2}}';
  const qC = (x) => `${tnum(Math.abs(x))}\\,\\mathrm{C}`; // |q| in C
  const mT = (x) => `${tnum(x)}\\,\\mathrm{m}`;
  const attractRepel = () => [['attract', L('they attract each other', 'sie ziehen sich an')], ['repel', L('they repel each other', 'sie stossen sich ab')]];
  const DIR_ALL = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', '0'];
  const opp = (d) => (d === '0' ? '0' : DIRS[(DIRS.indexOf(d) + 4) % 8]); // the opposite direction
  const arrowWord = (d) => `${ARROW[d]} ${dirName(d)}`;
  const word = (n) => ({ 2: L('two', 'zwei'), 3: L('three', 'drei'), 4: L('four', 'vier') }[n] || n);

  // A drawing of point charges: pts [{ c (m), q (sign), lab, cls }], scale px/m, dims [[a, b, label,
  // off]], forces { key: { at, F (N), lab, cls } } of which those in view.show are drawn, their
  // lengths in proportion (the largest 85 px).
  function drawing(o, view = {}) {
    const P = new Pic(o.scale, o.label || '');
    if (o.before) o.before(P);
    (o.dims || []).forEach(([a, b, l, off, cls]) => P.dim(a, b, l, off, `dimline${cls ? ` ${cls}` : ''}`));
    o.pts.forEach((pt) => P.charge(pt.c, pt.q, pt.lab, pt.cls || '', pt.off));
    // all forces, those not shown hidden: every frame of a worked example has the same size, and an
    // arrow the same length in every frame
    const all = Object.entries(o.forces || {});
    const big = Math.max(...all.map(([, f]) => len(f.F)), 1e-300);
    all.forEach(([k, f]) => {
      const hidden = !(view.show && view.show.has(k)) ? ' hidden' : '';
      const L0 = len(f.F);
      if (L0 < 1e-12 * big) return;
      const u = unit(f.F), l = Math.max(16, (o.arrow || 85) * (L0 / big));
      const off = [u[0] > 0.35 ? 8 : u[0] < -0.35 ? -8 : 9, u[1] > 0.35 ? -8 : u[1] < -0.35 ? 14 : 0];
      P.arrow(f.at, u, l, `force ${f.cls || ''}${view.hl && view.hl.has(k) ? ' hl' : ''}${hidden}`, f.lab, f.off || off);
    });
    if (o.after) o.after(P, view);
    return P.svg();
  }

  // ---------------------------------------------------------------- 1 two charges
  // distances that keep the arithmetic mental: k/r² = 0.9, 0.4, 0.1 or 0.025 N/μC²
  const QS = [1, 2, 3, 4, 5, 6, 8];
  const RS = [10, 15, 30, 60];
  function pairMake(r) {
    return { q1: sign(r) * pick(r, QS) * 1e-6, q2: sign(r) * pick(r, QS) * 1e-6, r: pick(r, RS) / 100 };
  }
  const pairF = (p) => (K * Math.abs(p.q1 * p.q2)) / p.r ** 2;
  const kind = (p) => (p.q1 * p.q2 > 0 ? 'repel' : 'attract');
  function pairFigure(p, v, view, o = {}) {
    const s = 220 / p.r, a = [0, 0], b = [p.r, 0], F = v.F != null ? v.F : pairF(p), at = kind(p) === 'attract' ? 1 : -1;
    return drawing({
      scale: s,
      pts: [{ c: a, q: Math.sign(p.q1), lab: o.lab1 || qs(p.q1, 'μC') }, { c: b, q: Math.sign(o.q2sign != null ? o.q2sign : p.q2), lab: o.lab2 || qs(p.q2, 'μC') }],
      dims: [[a, b, o.rlab || q(p.r, 'cm'), -26]],
      forces: { F12: { at: b, F: [-at * F, 0], lab: sv('F', '12'), cls: 'k-1' }, F21: { at: a, F: [at * F, 0], lab: sv('F', '21'), cls: 'k-2' } },
      arrow: 60,
    }, view);
  }
  // Coulomb's law in mental arithmetic: k = 9·10⁹, the charges a·10⁻⁶ C and b·10⁻⁶ C, the distance
  // R·10⁻² m; the powers of ten give 10⁹⁻⁶⁻⁶⁺⁴ = 10, the numbers 9 a b/R² (reduced)
  const gcd = (x, y) => (y ? gcd(y, x % y) : x);
  function pairMental(p, v) {
    const a = Math.round(Math.abs(p.q1) * 1e6), b = Math.round(Math.abs(p.q2) * 1e6), R = Math.round(p.r * 100), n = 9 * a * b, d = R * R, g = gcd(n, d);
    const frac = g > 1 ? ` = \\frac{${n / g}}{${d / g}}\\cdot 10\\,\\mathrm{N}` : '';
    return `$$F = \\frac{9\\cdot ${a}\\cdot ${b}}{${R}^2}\\cdot\\frac{10^{9}\\cdot 10^{-6}\\cdot 10^{-6}}{(10^{-2})^2}\\,\\mathrm{N} = \\frac{${n}}{${d}}\\cdot 10\\,\\mathrm{N}${frac} = ${res(tq(v.F, forceUnit(v.F)))}$$`;
  }
  const pairSteps = (p, F, find) => [
    step(L('Attraction or repulsion', 'Anziehung oder Abstossung'), p$(kind(p) === 'attract'
      ? L('The charges have opposite signs: they attract each other.', 'Die Ladungen haben entgegengesetzte Vorzeichen: Sie ziehen sich an.')
      : L('The charges have the same sign: they repel each other.', 'Die Ladungen haben das gleiche Vorzeichen: Sie stossen sich ab.')), ['F12', 'F21']),
  ];

  const pair = {
    id: 'pair', difficulty: 1,
    title: () => L('Two charges', 'Zwei Ladungen'),
    make: pairMake,
    solve: (p, o = {}) => ({ F: o.noSquare ? (K * Math.abs(p.q1 * p.q2)) / p.r : o.cm ? (K * Math.abs(p.q1 * p.q2)) / (100 * p.r) ** 2 : pairF(p), kind: kind(p) }),
    traps: ['noSquare'],
    why: { noSquare: () => L('The distance counts squared: r² in the denominator.', 'Der Abstand zählt im Quadrat: r² im Nenner.') },
    fields: (p) => [num$('F', 'F', forceUnit(pairF(p)), L('force', 'Kraft')), choice('kind', L('The charges …', 'Die Ladungen …'), attractRepel(), L('whether they attract or repel each other', 'ob sie sich anziehen oder abstossen'))],
    text: (p) => L(`Two small charged spheres carry charges of ${qs(p.q1, 'μC')} and ${qs(p.q2, 'μC')}; their centres are ${q(p.r, 'cm')} apart. How large is the force between them? Do they attract or repel each other?`,
      `Zwei kleine geladene Kugeln tragen die Ladungen ${qs(p.q1, 'μC')} und ${qs(p.q2, 'μC')}; ihre Mittelpunkte sind ${q(p.r, 'cm')} voneinander entfernt. Wie gross ist die Kraft zwischen ihnen? Ziehen sie sich an oder stossen sie sich ab?`),
    hints: () => [
      L('Like charges repel, unlike charges attract.', 'Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an.'),
      L(`Coulomb's law: ${m$(`F = ${kq}`)} with $k = ${KT}$. Charges in coulombs, the distance in metres. Without a calculator: work out the numbers and the powers of ten separately.`, `Coulombgesetz: ${m$(`F = ${kq}`)} mit $k = ${KT}$. Ladungen in Coulomb, Abstand in Metern. Ohne Taschenrechner: Rechne die Zahlen und die Zehnerpotenzen getrennt aus.`),
    ],
    steps: (p, v) => [
      ...pairSteps(p),
      step(L("Coulomb's law", 'Coulombgesetz'), p$(L('Let $q_1$ and $q_2$ be the charges and $r$ their distance. The force has the size', 'Seien $q_1$ und $q_2$ die Ladungen und $r$ ihr Abstand. Die Kraft hat den Betrag')) +
        `$$F = ${kq} = ${KT}\\cdot\\frac{${qC(p.q1)}\\cdot ${qC(p.q2)}}{(${mT(p.r)})^2}$$` +
        p$(L('Without a calculator: the charges in μC, the distance in cm, the numbers and the powers of ten separately:', 'Ohne Taschenrechner: die Ladungen in μC, den Abstand in cm, die Zahlen und die Zehnerpotenzen getrennt:')) + pairMental(p, v) +
        p$(L('Both charges feel a force of this size, in opposite directions (Newton’s third law).', 'Beide Ladungen spüren eine Kraft dieser Grösse, in entgegengesetzte Richtungen (actio = reactio).')), ['F12', 'F21']),
    ],
    figure: (p, v, view) => pairFigure(p, v, view),
  };

  // which way? A at the origin, B (in the ring) on a grid of side d in one of the eight directions
  // from it; charges of different sizes, so that the equal forces (Newton's third law) are a question
  const OFFS = [[1, 0], [2, 0], [1, 1], [2, 2], [0, 1], [0, 2]];
  // The second question (ask): which force is larger, or how one force changes when the other
  // charge (chg: 'A' or 'B') or the distance ('r') is changed by the factor n.
  function pairDirMake(r) {
    const b = rot(pick(r, OFFS), pick(r, [0, 1, 2, 3])), qa = sign(r) * pick(r, [1, 2, 3, 4]) * 1e-6, qb = sign(r) * pick(r, [1, 2, 3, 4]) * 1e-6;
    const ask = r() < 0.3 ? { chg: null } : { chg: pick(r, ['A', 'B', 'r']), n: pick(r, [2, 0.5]) };
    return Math.abs(qa) !== Math.abs(qb) ? { a: [0, 0], b, qa, qb, ...ask } : null;
  }
  // the other charge: the one whose force is asked for when a charge is changed
  const otherOf = (c) => (c === 'A' ? 'B' : 'A');
  // with signs: like and unlike mixed up; with third: both forces the same way, the larger charge
  // pushing harder, and changing one charge changing only the force on that charge; with noSquare:
  // the distance not squared
  function pairDirSolve(p, o = {}) {
    const like = (p.qa * p.qb > 0) !== !!o.signs, fb = mul(unit(sub(p.b, p.a)), like ? 1 : -1), fa = mul(fb, o.third ? 1 : -1);
    const f = p.chg === 'r' ? (o.noSquare ? 1 / p.n : 1 / p.n ** 2) : o.third ? 1 : p.n;
    return { fa, fb, dB: dirOf(fb), dA: dirOf(fa), size: p.chg ? String(f) : o.third ? (Math.abs(p.qa) > Math.abs(p.qb) ? 'B' : 'A') : 'eq', like };
  }
  const FACTORS = () => [['4', L('four times as large', 'viermal so gross')], ['2', L('twice as large', 'doppelt so gross')], ['1', L('unchanged', 'unverändert')], ['0.5', L('half as large', 'halb so gross')], ['0.25', L('a quarter as large', 'ein Viertel so gross')]];
  // the question of the change, and whose force it asks for
  const pairDirChange = (p) => {
    const on = p.chg === 'r' ? 'A' : otherOf(p.chg);
    const now = p.chg === 'r' ? (p.n === 2 ? L('Now B is moved away from A along the same line, to twice the distance', 'Nun wird B entlang derselben Geraden von A weggeschoben, auf den doppelten Abstand') : L('Now B is moved towards A along the same line, to half the distance', 'Nun wird B entlang derselben Geraden zu A hin geschoben, auf den halben Abstand'))
      : p.n === 2 ? L(`Now the charge of ${p.chg} is doubled`, `Nun wird die Ladung von ${p.chg} verdoppelt`) : L(`Now the charge of ${p.chg} is halved`, `Nun wird die Ladung von ${p.chg} halbiert`);
    return { on, now };
  };
  function pairDirFigure(p, v, view) {
    // the two charges about 150 px apart, so that two forces towards each other do not meet
    const xs = [p.a[0], p.b[0]], ys = [p.a[1], p.b[1]], u = unit(sub(p.b, p.a)), n = u[0] > 0 ? [-u[1], u[0]] : [u[1], -u[0]];
    const lab = (r) => (Math.abs(n[1]) > 0.9 ? [0, -r - 3] : [Math.sign(n[0]) * r, -n[1] * r]);
    return drawing({
      scale: 150 / len(sub(p.b, p.a)),
      // the grid lines through the charges, half a square beyond them
      before: (P) => {
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        for (let x = x0; x <= x1; x++) P.line([x, y0 - 0.5], [x, y1 + 0.5], 'grid');
        for (let y = y0; y <= y1; y++) P.line([x0 - 0.5, y], [x1 + 0.5, y], 'grid');
      },
      // the labels beside the line through the charges (the forces lie on it), above it if it slants
      pts: [{ c: p.a, q: Math.sign(p.qa), lab: `A: ${qs(p.qa, 'μC')}`, off: lab(18) }, { c: p.b, q: Math.sign(p.qb), lab: `B: ${qs(p.qb, 'μC')}`, cls: 'hl', off: lab(24) }],
      forces: { FB: { at: p.b, F: v.fb, lab: sv('F', 'B'), cls: 'k-1' }, FA: { at: p.a, F: v.fa, lab: sv('F', 'A'), cls: 'k-2' } },
      arrow: 52,
    }, view);
  }
  const pairDir = {
    id: 'pair-dir', difficulty: 1,
    title: () => L('Which way does the force point?', 'Wohin zeigt die Kraft?'),
    make: pairDirMake,
    solve: pairDirSolve,
    traps: ['third', 'signs', 'noSquare'],
    why: {
      noSquare: () => L('The distance counts squared: 1/r².', 'Der Abstand zählt im Quadrat: 1/r².'),
      signs: () => L('Like charges repel, unlike charges attract.', 'Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an.'),
      third: () => L('Newton’s third law: A and B push or pull each other with forces of the same size, in opposite directions, however different the charges.', 'Actio = reactio: A und B stossen oder ziehen sich mit gleich grossen Kräften in entgegengesetzte Richtungen, wie verschieden die Ladungen auch sind.'),
    },
    fields: (p) => [dirField('dB', L('direction of the force on B', 'Richtung der Kraft auf B'), DIR_ALL), dirField('dA', L('direction of the force on A', 'Richtung der Kraft auf A'), DIR_ALL),
      p.chg ? choice('size', L(`The force on ${pairDirChange(p).on} is then …`, `Die Kraft auf ${pairDirChange(p).on} ist dann …`), FACTORS(), L(`how the force on ${pairDirChange(p).on} changes`, `wie sich die Kraft auf ${pairDirChange(p).on} ändert`))
        : choice('size', L('Which force is larger?', 'Welche Kraft ist grösser?'), [['A', L('the force on A', 'die Kraft auf A')], ['B', L('the force on B', 'die Kraft auf B')], ['eq', L('both are equally large', 'beide sind gleich gross')]], L('which force is larger', 'welche Kraft grösser ist'))],
    text: (p) => {
      const c = p.chg && pairDirChange(p);
      return L(`Two small charged spheres A and B sit on a grid, as shown. In which direction does the force on B (in the ring) point, and in which the force on A? ${c ? `${c.now}: how does the force on ${c.on} change?` : 'Which of the two forces is larger?'}`,
        `Zwei kleine geladene Kugeln A und B sitzen auf einem Gitter, wie abgebildet. In welche Richtung zeigt die Kraft auf B (im Ring), in welche die Kraft auf A? ${c ? `${c.now}: Wie ändert sich die Kraft auf ${c.on}?` : 'Welche der beiden Kräfte ist grösser?'}`);
    },
    hints: (p) => [
      L('The force lies on the line through the two charges: like charges repel, unlike charges attract.', 'Die Kraft liegt auf der Geraden durch die beiden Ladungen: Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an.'),
      p.chg === 'r' ? L(`Newton’s third law: the force on A is the reaction to the force on B. Both have the size ${m$(kq)}.`, `Actio = reactio: Die Kraft auf A ist die Reaktion auf die Kraft auf B. Beide haben den Betrag ${m$(kq)}.`)
        : p.chg ? L(`Newton’s third law: the force on A is the reaction to the force on B. Both have the size ${m$(kq)}, with both charges in it.`, `Actio = reactio: Die Kraft auf A ist die Reaktion auf die Kraft auf B. Beide haben den Betrag ${m$(kq)}, mit beiden Ladungen darin.`)
          : L('Newton’s third law: the force on A is the reaction to the force on B.', 'Actio = reactio: Die Kraft auf A ist die Reaktion auf die Kraft auf B.'),
    ],
    steps: (p, v) => [
      step(L('Along the connecting line', 'Entlang der Verbindungsgeraden'), p$(v.like
        ? L(`The charges have the same sign: they repel each other. The force on B points along the line from A to B, away from A: ${rt(arrowWord(v.dB))}.`, `Die Ladungen haben das gleiche Vorzeichen: Sie stossen sich ab. Die Kraft auf B zeigt entlang der Geraden von A nach B, von A weg: ${rt(arrowWord(v.dB))}.`)
        : L(`The charges have opposite signs: they attract each other. The force on B points along the line from B to A, towards A: ${rt(arrowWord(v.dB))}.`, `Die Ladungen haben entgegengesetzte Vorzeichen: Sie ziehen sich an. Die Kraft auf B zeigt entlang der Geraden von B nach A, zu A hin: ${rt(arrowWord(v.dB))}.`)), ['FB'], ['FB']),
      step(L('The force on A', 'Die Kraft auf A'), p$(L(`Newton’s third law: A feels a force of the same size in the opposite direction, ${rt(arrowWord(v.dA))}. Both forces are ${(p.chg ? String : rt)('equally large')}, although the charges are not: each force is $k\\,|q_A|\\,|q_B|/r^2$, the same product for both.`,
        `Actio = reactio: A spürt eine gleich grosse Kraft in die Gegenrichtung, ${rt(arrowWord(v.dA))}. Beide Kräfte sind ${(p.chg ? String : rt)('gleich gross')}, obwohl die Ladungen es nicht sind: Jede Kraft ist $k\\,|q_A|\\,|q_B|/r^2$, dasselbe Produkt für beide.`)), ['FA', 'FB'], ['FA']),
      ...(p.chg ? [step(L('The change', 'Die Änderung'), p$(p.chg === 'r'
        ? L(`The force goes with $1/r^2$: at ${p.n === 2 ? 'twice' : 'half'} the distance it is ${p.n === 2 ? '$1/2^2 = 1/4$' : '$2^2 = 4$'} times as large, on A as on B: ${rt(FACTORS().find((o) => o[0] === v.size)[1])}.`,
          `Die Kraft geht mit $1/r^2$: Im ${p.n === 2 ? 'doppelten' : 'halben'} Abstand ist sie ${p.n === 2 ? '$1/2^2 = 1/4$' : '$2^2 = 4$'}-mal so gross, auf A wie auf B: ${rt(FACTORS().find((o) => o[0] === v.size)[1])}.`)
        : L(`The force is proportional to the product of the charges, $|q_A|\\,|q_B|$. With the charge of ${p.chg} ${p.n === 2 ? 'doubled' : 'halved'}, the product and both forces ${p.n === 2 ? 'double' : 'halve'}, also the force on ${otherOf(p.chg)}: ${rt(FACTORS().find((o) => o[0] === v.size)[1])}.`,
          `Die Kraft ist proportional zum Produkt der Ladungen, $|q_A|\\,|q_B|$. Wird die Ladung von ${p.chg} ${p.n === 2 ? 'verdoppelt' : 'halbiert'}, ${p.n === 2 ? 'verdoppeln' : 'halbieren'} sich das Produkt und beide Kräfte, auch die Kraft auf ${otherOf(p.chg)}: ${rt(FACTORS().find((o) => o[0] === v.size)[1])}.`)), ['FA', 'FB'], [`F${pairDirChange(p).on}`])] : []),
    ],
    figure: pairDirFigure,
  };

  // ---------------------------------------------------------------- 2 factors
  const DIST = { 2: L.bind(null, 'doubled', 'verdoppelt'), 3: L.bind(null, 'tripled', 'verdreifacht'), 4: L.bind(null, 'made four times as large', 'vervierfacht'), 0.5: L.bind(null, 'halved', 'halbiert'), [1 / 3]: L.bind(null, 'reduced to a third', 'auf einen Drittel verkleinert') };
  const CHG = { 2: L.bind(null, 'doubled', 'verdoppelt'), 3: L.bind(null, 'tripled', 'verdreifacht'), 0.5: L.bind(null, 'halved', 'halbiert'), 1: null };
  // a power of the factor: 2^2, but (\dfrac{1}{2})^2
  const sq = (x) => (Number.isInteger(x) ? `${x}^2` : `\\left(${ft(x)}\\right)^2`);
  // a factor as a number or a fraction: \dfrac in an equation, \tfrac inside another fraction (inner)
  const ft = (x, inner) => { const fr = [[1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [1, 4], [9, 1], [1, 9], [16, 1], [1, 16], [3, 2], [2, 3], [9, 4], [4, 9], [3, 4], [4, 3], [1, 8], [8, 1], [6, 1], [1, 6], [12, 1], [1, 12], [27, 4], [4, 27], [9, 8], [8, 9], [2, 9], [9, 2], [3, 8], [8, 3], [1, 18], [18, 1], [1, 36], [36, 1], [1, 27], [27, 1], [3, 16], [16, 3], [1, 24], [24, 1], [2, 27], [27, 2], [4, 3], [3, 4]].find(([a, b]) => Math.abs(a / b - x) < 1e-9); return fr ? (fr[1] === 1 ? String(fr[0]) : `\\${inner ? 't' : 'd'}frac{${fr[0]}}{${fr[1]}}`) : tnum(x); };
  function factorFigure(p, v, view) {
    const P = new Pic(1, L('The two charges before and after', 'Die beiden Ladungen vorher und nachher'));
    const row = (y, d, l1, l2, s1, s2, title, rl) => {
      P.text([-70, y], title, 'lbl small', 'end');
      P.charge([0, y], s1, l1); P.charge([d, y], s2, l2); P.dim([0, y], [d, y], rl, -24);
    };
    const s1 = Math.sign(p.s1 || 1), s2 = Math.sign(p.s2 || 1), d0 = 90;
    row(0, d0, sv('q', '1'), sv('q', '2'), s1, s2, p.before || L('before', 'vorher'), sv('r'));
    const lab = (a, i) => (a === 1 ? sv('q', i) : `${a === 0.5 ? '½' : a}${sv('q', i)}`);
    const n = p.n || 1;
    row(-90, d0 * n, lab(p.a || 1, '1'), lab(p.b || 1, '2'), s1, s2, p.after || L('after', 'nachher'), p.rl || (n === 1 ? sv('r') : `${n === 0.5 ? '½' : n === 1 / 3 ? '⅓' : n === 0.25 ? '¼' : n}${sv('r')}`));
    return P.svg();
  }
  const factor = {
    id: 'factor', difficulty: 1,
    title: () => L('Twice as far', 'Doppelt so weit'),
    make: (r) => (r() < 0.6 ? { what: 'r', n: pick(r, [2, 3, 4, 0.5, 1 / 3]), a: 1, b: 1, s1: sign(r), s2: sign(r) } : { what: 'q', n: 1, a: pick(r, [2, 3, 0.5]), b: 1, s1: sign(r), s2: sign(r) }),
    solve: (p, o = {}) => ({ f: o.noSquare ? (p.a * p.b) / p.n : o.wrongWay ? p.a * p.b * p.n ** 2 : (p.a * p.b) / p.n ** 2 }),
    traps: ['noSquare', 'wrongWay'],
    why: { noSquare: () => L('The distance counts squared: 1/r².', 'Der Abstand zählt im Quadrat: 1/r².'), wrongWay: () => L('A larger distance means a smaller force.', 'Ein grösserer Abstand bedeutet eine kleinere Kraft.') },
    fields: () => [num$('f', "F'/F", '', L('factor', 'Faktor'))],
    text: (p) => (p.what === 'r'
      ? L(`Two point charges exert a force on each other. Their distance is ${DIST[p.n]()}, the charges stay the same. By what factor does the force change? (Give it as a number or a fraction, e.g. 0.25 or 1/4.)`,
        `Zwei Punktladungen üben eine Kraft aufeinander aus. Ihr Abstand wird ${DIST[p.n]()}, die Ladungen bleiben gleich. Um welchen Faktor ändert sich die Kraft? (Gib ihn als Zahl oder Bruch an, z. B. 0.25 oder 1/4.)`)
      : L(`Two point charges exert a force on each other. One of the charges is ${CHG[p.a]()}; the distance stays the same. By what factor does the force change? (Give it as a number or a fraction, e.g. 0.25 or 1/4.)`,
        `Zwei Punktladungen üben eine Kraft aufeinander aus. Eine der Ladungen wird ${CHG[p.a]()}; der Abstand bleibt gleich. Um welchen Faktor ändert sich die Kraft? (Gib ihn als Zahl oder Bruch an, z. B. 0.25 oder 1/4.)`)),
    hints: () => [
      L(`In ${m$(`F = ${kq}`)}, the force is proportional to each charge and to $1/r^2$.`, `In ${m$(`F = ${kq}`)} ist die Kraft proportional zu jeder Ladung und zu $1/r^2$.`),
      L('Write the new force with the new values and divide by the old one: k and everything that stays the same cancels.', 'Schreibe die neue Kraft mit den neuen Werten und teile durch die alte: k und alles Gleichbleibende kürzt sich.'),
    ],
    steps: (p, v) => {
      const n = ft(p.n, true), a = ft(p.a, true);
      return [step(L('Compare', 'Vergleichen'), p$(L("Let $F$ be the old force and $F'$ the new one. Only what changes is left in the ratio:", "Sei $F$ die alte und $F'$ die neue Kraft. Im Verhältnis bleibt nur, was sich ändert:")) +
        (p.what === 'r'
          ? `$$\\frac{F'}{F} = \\frac{k\\,|q_1|\\,|q_2| / (${n}\\,r)^2}{k\\,|q_1|\\,|q_2| / r^2} = \\frac{1}{${sq(p.n)}} = ${res(ft(v.f))}$$` + p$(L('The force falls with the square of the distance.', 'Die Kraft nimmt mit dem Quadrat des Abstands ab.'))
          : `$$\\frac{F'}{F} = \\frac{k\\,${a}\\,|q_1|\\,|q_2| / r^2}{k\\,|q_1|\\,|q_2| / r^2} = ${res(ft(v.f))}$$` + p$(L('The force is proportional to each charge.', 'Die Kraft ist proportional zu jeder Ladung.'))))];
    },
    figure: factorFigure,
  };
  const factorMix = {
    id: 'factor-mix', difficulty: 2,
    title: () => L('Charges and distance changed', 'Ladungen und Abstand verändert'),
    make: (r) => { const a = pick(r, [2, 3, 0.5]), b = pick(r, [1, 2, 3, 0.5]), n = pick(r, [2, 3, 0.5]); return a * b !== n * n ? { what: 'mix', a, b, n, F: pick(r, [0.4, 0.6, 0.8, 1.2, 1.8, 3.6]), s1: sign(r), s2: sign(r) } : null; },
    solve: (p, o = {}) => { const f = o.noSquare ? (p.a * p.b) / p.n : o.oneCharge ? p.a / p.n ** 2 : (p.a * p.b) / p.n ** 2; return { f, F2: f * p.F }; },
    traps: ['noSquare', 'oneCharge'],
    why: { noSquare: () => L('The distance counts squared: 1/r².', 'Der Abstand zählt im Quadrat: 1/r².'), oneCharge: () => L('Both charges count: the force is proportional to their product.', 'Beide Ladungen zählen: Die Kraft ist proportional zu ihrem Produkt.') },
    fields: (p) => [num$('f', "F'/F", '', L('factor', 'Faktor')), num$('F2', "F'", forceUnit(Math.min(p.F, (p.a * p.b * p.F) / p.n ** 2)), L('new force', 'neue Kraft'))],
    text: (p) => {
      const c = (x, i) => (x === 1 ? L(`charge ${i} stays the same`, `Ladung ${i} bleibt gleich`) : L(`charge ${i} is ${CHG[x]()}`, `Ladung ${i} wird ${CHG[x]()}`));
      return L(`Two point charges exert a force of ${q(p.F, 'N')} on each other. Now ${c(p.a, 1)}, ${c(p.b, 2)}, and their distance is ${DIST[p.n]()}. By what factor does the force change, and how large is it now?`,
        `Zwei Punktladungen üben eine Kraft von ${q(p.F, 'N')} aufeinander aus. Nun ${c(p.a, 1).replace(/^Ladung (\d) (bleibt|wird)/, '$2 Ladung $1')}, ${c(p.b, 2)}, und ihr Abstand wird ${DIST[p.n]()}. Um welchen Faktor ändert sich die Kraft, und wie gross ist sie jetzt?`);
    },
    hints: () => [
      L('Each change gives a factor: the charges directly, the distance as 1/(factor)².', 'Jede Änderung gibt einen Faktor: die Ladungen direkt, der Abstand als 1/(Faktor)².'),
      L('Multiply the factors.', 'Multipliziere die Faktoren.'),
    ],
    steps: (p, v) => [
      step(L('Compare', 'Vergleichen'), p$(L("Let $F$ be the old force and $F'$ the new one. In the ratio, k cancels and only the factors are left:", "Sei $F$ die alte und $F'$ die neue Kraft. Im Verhältnis kürzt sich k, und nur die Faktoren bleiben:")) +
        `$$\\frac{F'}{F} = \\frac{${ft(p.a)}\\cdot ${ft(p.b)}}{${sq(p.n)}} = ${res(ft(v.f))}$$`),
      step(L('The new force', 'Die neue Kraft'), p$(L('The old force times the factor:', 'Die alte Kraft mal den Faktor:')) + `$$F' = ${ft(v.f)}\\cdot ${tq(p.F, 'N')} = ${res(tq(v.F2, forceUnit(v.F2)))}$$`),
    ],
    figure: factorFigure,
  };
  // the distance wanted: at r the force is F; at which distance r' is it m F?
  const factorFind = {
    id: 'factor-find', difficulty: 2,
    title: () => L('How far for that force?', 'Wie weit für diese Kraft?'),
    make: (r) => {
      const m = pick(r, [4, 9, 16, 0.25, 1 / 9, 1 / 16]), r0 = pick(r, [10, 12, 15, 20, 30, 40, 60]), F = pick(r, [0.2, 0.3, 0.4, 0.6, 0.8, 0.9, 1.2, 1.8]);
      const r2 = r0 / Math.sqrt(m);
      return Math.abs(r2 - Math.round(r2)) < 1e-9 && Math.abs(F * m * 100 - Math.round(F * m * 100)) < 1e-9 && r2 >= 3 && r2 <= 240 ? { what: 'find', m, r0: r0 / 100, F, s1: sign(r), s2: sign(r) } : null;
    },
    solve: (p, o = {}) => { const n = o.noRoot ? 1 / p.m : o.wrongWay ? Math.sqrt(p.m) : 1 / Math.sqrt(p.m); return { n, r2: n * p.r0 }; },
    traps: ['noRoot', 'wrongWay'],
    why: { noRoot: () => L('The force goes with 1/r²: the distance changes by the square root of the inverse factor.', 'Die Kraft geht mit 1/r²: Der Abstand ändert sich um die Wurzel des Kehrwerts.'), wrongWay: () => L('A larger force needs a smaller distance.', 'Eine grössere Kraft braucht einen kleineren Abstand.') },
    fields: () => [num$('n', "r'/r", '', L('factor for the distance', 'Faktor für den Abstand')), num$('r2', "r'", 'cm', L('new distance', 'neuer Abstand'))],
    text: (p) => L(`Two point charges ${q(p.r0, 'cm')} apart exert a force of ${q(p.F, 'N')} on each other. At what distance is the force between them ${q(p.F * p.m, 'N')}? By what factor must their distance change?`,
      `Zwei Punktladungen im Abstand ${q(p.r0, 'cm')} üben eine Kraft von ${q(p.F, 'N')} aufeinander aus. In welchem Abstand beträgt die Kraft zwischen ihnen ${q(p.F * p.m, 'N')}? Um welchen Faktor muss sich ihr Abstand ändern?`),
    hints: () => [
      L('Compare the forces first: by what factor does the force change? The charges stay the same.', 'Vergleiche zuerst die Kräfte: Um welchen Faktor ändert sich die Kraft? Die Ladungen bleiben gleich.'),
      L('The force goes with 1/r²: if the distance changes by a factor n, the force changes by 1/n². Solve 1/n² = (factor of the force) for n.', 'Die Kraft geht mit 1/r²: Ändert sich der Abstand um den Faktor n, ändert sich die Kraft um 1/n². Löse 1/n² = (Faktor der Kraft) nach n auf.'),
    ],
    steps: (p, v) => [
      step(L('The factor of the force', 'Der Faktor der Kraft'), p$(L("Let $F$ be the old force and $F'$ the new one:", "Sei $F$ die alte und $F'$ die neue Kraft:")) + `$$\\frac{F'}{F} = \\frac{${tq(p.F * p.m, 'N')}}{${tq(p.F, 'N')}} = ${ft(p.m)}$$`),
      step(L('Solve for the distance', 'Nach dem Abstand auflösen'), p$(L("Let the distance change by the factor $n = r'/r$. Then the force changes by $1/n^2$:", "Der Abstand ändere sich um den Faktor $n = r'/r$. Dann ändert sich die Kraft um $1/n^2$:")) +
        `$$\\frac{1}{n^2} = ${ft(p.m)} \\;\\Rightarrow\\; n = \\frac{1}{\\sqrt{${ft(p.m)}}} = ${res(ft(v.n))}, \\qquad r' = ${ft(v.n)}\\cdot ${tq(p.r0, 'cm')} = ${res(tq(v.r2, 'cm'))}$$` +
        p$(p.m > 1 ? L('A larger force: the charges must come closer.', 'Eine grössere Kraft: Die Ladungen müssen näher zusammen.') : L('A smaller force: the charges must move apart.', 'Eine kleinere Kraft: Die Ladungen müssen sich voneinander entfernen.'))),
    ],
    // after: drawn at the right distance r' (its value unknown, r' = ?, until the solution shows it);
    // the forces in the titles
    figure: (p, v, view) => {
      const shown = view.show && view.show.size, N = (x) => String(Number(x.toPrecision(3)));
      return factorFigure({ ...p, n: v.n, a: 1, b: 1, rl: shown ? `${sv('r')}′ = ${N(v.r2 * 100)} cm` : `${sv('r')}′ = ?`,
        before: `${L('before', 'vorher')}: F = ${N(p.F)} N`, after: `${L('after', 'nachher')}: F′ = ${N(p.F * p.m)} N` }, v, view);
    },
  };

  // ---------------------------------------------------------------- 3 three charges in a line
  // Charges A and B on the x axis, the charge t (±q) at x = 0; charges in units of q, distances in
  // units of d, forces in units of F₀ = k q²/d², along x (right positive). No calculation: the
  // directions, and which force wins.
  const QL = [1, 2, 3, 4];
  function lineMake(r, mid) {
    const [d1, d2] = mid ? [pick(r, [1, 2, 3]), pick(r, [1, 2, 3])] : shuffle(r, [1, 2, 3]).slice(0, 2).sort((x, y) => x - y), flip = sign(r);
    const p = { mid, t: sign(r), qa: sign(r) * pick(r, QL), qb: sign(r) * pick(r, QL), xa: (mid ? -d1 : d1) * flip, xb: d2 * flip };
    const v = lineSolve(p);
    if (Math.abs(v.net) < 1e-9 || Math.abs(Math.abs(v.Fa) - Math.abs(v.Fb)) < 1e-9) return null;
    // mostly forces in opposite directions, so that their sizes decide
    return v.Fa * v.Fb < 0 || r() < 0.25 ? p : null;
  }
  // the force on t from qi at xi, in units of F₀ (with noSquare: the distance not squared)
  const fx = (qt, qi, xi, o = {}) => (-Math.sign(xi) * qt * qi) / Math.abs(xi) ** (o.noSquare ? 1 : 2);
  function lineSolve(p, o = {}) {
    const sg = o.signs ? -1 : 1;
    const Fa = sg * fx(p.t, p.qa, p.xa, o), Fb = sg * fx(p.t, p.qb, o.sameDist ? Math.sign(p.xb) * Math.abs(p.xb - p.xa) : p.xb, o);
    const net = Fa + Fb, d = (x) => (Math.abs(x) < 1e-12 ? '0' : x > 0 ? 'E' : 'W');
    return { Fa, Fb, net, dA: d(Fa), dB: d(Fb), dir: d(net) };
  }
  const towards = (qt, qi) => (qt * qi < 0);
  // a fraction of F₀ in TeX, reduced: 3/4, 2, 1/9
  function fracF0(x, sgn) {
    const den = [1, 2, 3, 4, 6, 9, 12, 18, 36].find((k) => Math.abs(x * k - Math.round(x * k)) < 1e-9) || 1, nu = Math.round(Math.abs(x) * den);
    const s0 = sgn ? (x < 0 ? '-' : '+') : x < 0 ? '-' : '';
    return `${s0}${den === 1 ? (nu === 1 ? '' : nu) : `\\tfrac{${nu}}{${den}}`}\\,F_0`;
  }
  const qT = (x) => `${x < 0 ? '-' : '+'}${Math.abs(x) === 1 ? '' : Math.abs(x)}q`; // a charge in TeX
  const dT = (x) => `${Math.abs(x) === 1 ? '' : Math.abs(x)}d`;
  function lineSteps(p, v) {
    const one = (k, qi, xi, Fi) => step(L(`The force of ${k}`, `Die Kraft von ${k}`),
      p$(L(`${k} ($${qT(qi)}$) is $${dT(xi)}$ away. ${towards(p.t, qi) ? 'Opposite signs: it attracts the charge, towards itself' : 'Same sign: it repels the charge, away from itself'}, that is ${rt(arrowWord(Fi > 0 ? 'E' : 'W'))}.`,
        `${k} ($${qT(qi)}$) ist $${dT(xi)}$ entfernt. ${towards(p.t, qi) ? 'Entgegengesetzte Vorzeichen: Sie zieht die Ladung an, zu sich hin' : 'Gleiche Vorzeichen: Sie stösst die Ladung ab, von sich weg'}, also ${rt(arrowWord(Fi > 0 ? 'E' : 'W'))}.`)) +
      `$$F_${k} = k\\,\\frac{q\\cdot ${Math.abs(qi)}q}{(${dT(xi)})^2} = ${fracF0(Math.abs(Fi))}$$`, [`F${k}`], [`F${k}`]);
    return [
      step(L('The unit of force', 'Die Krafteinheit'), p$(L('No numbers are needed: measure every force in units of $F_0 = k\\,q^2/d^2$, the force between two charges $q$ at the distance $d$. Twice the charge, twice the force; twice the distance, a quarter of the force.',
        'Zahlen braucht es keine: Miss jede Kraft in Einheiten von $F_0 = k\\,q^2/d^2$, der Kraft zwischen zwei Ladungen $q$ im Abstand $d$. Doppelte Ladung, doppelte Kraft; doppelter Abstand, ein Viertel der Kraft.'))),
      one('A', p.qa, p.xa, v.Fa), one('B', p.qb, p.xb, v.Fb),
      step(L('The net force', 'Die resultierende Kraft'), p$(L('Both forces lie on the line: add them with signs, the right taken as positive.', 'Beide Kräfte liegen auf der Geraden: Addiere sie mit Vorzeichen, nach rechts positiv.')) +
        `$$F = ${fracF0(v.Fa)} ${fracF0(v.Fb, true)} = ${fracF0(v.net)}$$` +
        p$(L(`The net force points ${rt(arrowWord(v.dir))}${v.Fa * v.Fb < 0 ? `: the force of ${Math.abs(v.Fa) > Math.abs(v.Fb) ? 'A' : 'B'} is larger` : ': both forces point the same way'}.`,
          `Die resultierende Kraft zeigt ${rt(arrowWord(v.dir))}${v.Fa * v.Fb < 0 ? `: Die Kraft von ${Math.abs(v.Fa) > Math.abs(v.Fb) ? 'A' : 'B'} ist grösser` : ': Beide Kräfte zeigen in dieselbe Richtung'}.`)), ['FA', 'FB', 'F'], ['F']),
    ];
  }
  function lineFigure(p, v, view) {
    const s = 420 / (Math.max(Math.abs(p.xa), Math.abs(p.xb)) * (p.mid ? 2.2 : 1.2));
    const pts = [[0, p.t, ''], [p.xa, p.qa, 'A: '], [p.xb, p.qb, 'B: ']];
    const xs = [0, p.xa, p.xb].sort((a, b) => a - b), dl = (x) => `${Math.abs(x) === 1 ? '' : Math.abs(x)}${sv('d')}`;
    return drawing({
      scale: s,
      pts: pts.map(([x, qq, name], i) => ({ c: [x, 0], q: Math.sign(qq), lab: `${name}${qName(qq)}`, cls: i ? '' : 'hl' })),
      dims: [[[xs[0], 0], [xs[1], 0], dl(xs[1] - xs[0]), -58], [[xs[1], 0], [xs[2], 0], dl(xs[2] - xs[1]), -58]],
      // the net force on the line, the two forces stacked below it (the labels of the charges are
      // above), each labelled beside its tip
      forces: { FA: { at: [0, -15 / s], F: [v.Fa, 0], lab: sv('F', 'A'), cls: 'k-1', off: [v.Fa >= 0 ? 8 : -8, 0] }, FB: { at: [0, -30 / s], F: [v.Fb, 0], lab: sv('F', 'B'), cls: 'k-2', off: [v.Fb >= 0 ? 8 : -8, 0] }, F: { at: [0, 0], F: [v.net, 0], lab: sv('F'), cls: 'k-net', off: [v.net >= 0 ? 10 : -10, 0] } },
      arrow: 90,
    }, view);
  }
  const lineFields = () => [dirField('dA', L('direction of the force of A', 'Richtung der Kraft von A'), ['W', 'E']), dirField('dB', L('direction of the force of B', 'Richtung der Kraft von B'), ['W', 'E']),
    dirField('dir', L('direction of the net force', 'Richtung der resultierenden Kraft'), ['W', 'E', '0'])];
  const lineText = (p) => L(`Three small charged spheres lie on a straight line, as shown: the charge in the ring is $${qT(p.t)}$, A carries $${qT(p.qa)}$ and B $${qT(p.qb)}$. In which direction does the force of A on the ${p.mid ? 'middle' : 'outer'} charge (in the ring) point, in which that of B, and in which the net force?`,
    `Drei kleine geladene Kugeln liegen auf einer Geraden, wie abgebildet: Die Ladung im Ring ist $${qT(p.t)}$, A trägt $${qT(p.qa)}$ und B $${qT(p.qb)}$. In welche Richtung zeigt die Kraft von A auf die ${p.mid ? 'mittlere' : 'äussere'} Ladung (im Ring), in welche die von B, und in welche die resultierende Kraft?`);
  const lineHints = () => [
    L('Each force on its own: attraction towards the other charge, repulsion away from it; the other charge does not change it.', 'Jede Kraft für sich: Anziehung zur anderen Ladung hin, Abstossung von ihr weg; die andere Ladung ändert daran nichts.'),
    L('Compare the sizes in units of F₀ = k q²/d²: proportional to the charge, and 1/(distance)²: at 2d a quarter, at 3d a ninth.', 'Vergleiche die Beträge in Einheiten von F₀ = k q²/d²: proportional zur Ladung und zu 1/(Abstand)²: in 2d ein Viertel, in 3d ein Neuntel.'),
  ];
  const lineWhy = {
    signs: () => L('Like charges repel, unlike charges attract.', 'Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an.'),
    noSquare: () => L('The distance counts squared: at twice the distance a quarter of the force.', 'Der Abstand zählt im Quadrat: im doppelten Abstand ein Viertel der Kraft.'),
    sameDist: () => L('Measure each distance from the charge the force acts on.', 'Miss jeden Abstand von der Ladung aus, auf die die Kraft wirkt.'),
  };
  const lineEnd = { id: 'line-end', difficulty: 2, title: () => L('Three charges in a line', 'Drei Ladungen auf einer Geraden'), make: (r) => lineMake(r, false), solve: lineSolve, traps: ['signs', 'noSquare', 'sameDist'], why: lineWhy, fields: lineFields, text: lineText, hints: lineHints, steps: lineSteps, figure: lineFigure };
  const lineMid = { ...lineEnd, id: 'line-mid', difficulty: 3, title: () => L('A charge in the middle', 'Eine Ladung in der Mitte'), make: (r) => lineMake(r, true), traps: ['signs', 'noSquare'] };

  // ---------------------------------------------------------------- 4 which way? (equal charges)
  const rot = (c, k) => { let [x, y] = c; for (let i = 0; i < k; i++) [x, y] = [-y, x]; return [x, y]; };
  // charges of equal size q at points in units of d; the target is the first
  function whichSolve(p) {
    const t = p.pts[0], Fs = p.pts.slice(1).map((pt) => force(t.s, t.c, pt.s, pt.c).map((x) => x / K));
    const net = Fs.reduce(add, [0, 0]);
    return { Fs, net, dir: dirOf(net, 1) };
  }
  function whichFigure(p, v, view) {
    const big = Math.max(...v.Fs.map(len));
    return drawing({
      scale: 120,
      before: (P) => { if (p.shape === 'tri') P.poly(p.pts.map((pt) => pt.c), 'outline'); if (p.shape === 'square') P.poly([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], 'outline'); if (p.shape === 'grid') P.grid(-1, -1, 1, 1, 1); },
      pts: p.pts.map((pt, i) => ({ c: pt.c, q: pt.s, lab: `${pt.s > 0 ? '+' : '−'}<tspan font-style="italic">q</tspan>`, cls: i ? '' : 'hl', off: pt.off })),
      forces: Object.fromEntries([...v.Fs.map((F, i) => [`F${i + 1}`, { at: p.pts[0].c, F, lab: sv('F', String(i + 1)), cls: `k-${(i % 3) + 1}` }]), ['F', { at: p.pts[0].c, F: v.net, lab: sv('F'), cls: 'k-net' }]]),
      arrow: 70 * Math.max(1, len(v.net) / big),
    }, view);
  }
  function whichSteps(p, v) {
    const n = v.Fs.length, near = v.Fs.map((F, i) => len(sub(p.pts[i + 1].c, p.pts[0].c)));
    const sizes = [...new Set(near.map((d) => sig(d * (p.shape === 'tri' ? 1 / 1.4 : 1), 6)))];
    const F0 = '$F_0 = k\\,q^2/d^2$';
    const sizeText = sizes.length === 1 && sizes[0] === 1
      ? L(`All ${word(n)} charges are at the distance $d$: the forces have the same size ${F0}.`, `Alle ${word(n)} Ladungen sind im Abstand $d$: Die Kräfte haben den gleichen Betrag ${F0}.`)
      : sizes.length === 1
        ? L(`All ${word(n)} charges are on the diagonals, at $\\sqrt{2}\\,d$: the forces have the same size $F_0/2$, with ${F0}.`, `Alle ${word(n)} Ladungen sind auf den Diagonalen, im Abstand $\\sqrt{2}\\,d$: Die Kräfte haben den gleichen Betrag $F_0/2$, mit ${F0}.`)
        : L(`The charges at the distance $d$ act with ${F0}; at the diagonal distance $\\sqrt{2}\\,d$ the force is half as large, $F_0/2$.`, `Die Ladungen im Abstand $d$ wirken mit ${F0}; im Abstand $\\sqrt{2}\\,d$ (Diagonale) ist die Kraft halb so gross, $F_0/2$.`);
    const comp = (x) => (Math.abs(x) < 1e-9 ? '0' : `${sig(x, 3)}\\,F_0`);
    return [
      step(L('Each force', 'Jede Kraft'), p$(L('Each force lies on the line through the two charges: towards the other charge for opposite signs, away from it for like signs.', 'Jede Kraft liegt auf der Geraden durch die beiden Ladungen: zur anderen Ladung hin bei entgegengesetzten Vorzeichen, von ihr weg bei gleichen.')) + p$(sizeText),
        v.Fs.map((F, i) => `F${i + 1}`)),
      step(L('Add them', 'Addieren'), p$(L('Add the forces arrow to arrow, or by components: what points in opposite directions cancels.', 'Addiere die Kräfte Pfeil an Pfeil oder in Komponenten: Was in entgegengesetzte Richtungen zeigt, hebt sich auf.')) +
        `$$F_x = ${comp(v.net[0] * p.scaleF)}, \\qquad F_y = ${comp(v.net[1] * p.scaleF)}$$` +
        p$(v.dir === '0' ? L(`Everything cancels: ${rt(L('no net force', 'keine resultierende Kraft'))}.`, `Alles hebt sich auf: ${rt('keine resultierende Kraft')}.`) : L(`The net force points ${rt(arrowWord(v.dir))}.`, `Die resultierende Kraft zeigt ${rt(arrowWord(v.dir))}.`)),
        [...v.Fs.map((F, i) => `F${i + 1}`), 'F'], ['F']),
    ];
  }
  const whichText = (p) => L(`The ${p.pts.length} point charges shown all have the same size; ${p.shape === 'tri' ? 'they sit at the corners of an equilateral triangle' : p.shape === 'square' ? 'they sit at the corners of a square' : 'the grid squares have the side d'}. In which direction does the net force on the charge in the ring point?`,
    `Die ${p.pts.length} abgebildeten Punktladungen haben alle den gleichen Betrag; ${p.shape === 'tri' ? 'sie sitzen an den Ecken eines gleichseitigen Dreiecks' : p.shape === 'square' ? 'sie sitzen an den Ecken eines Quadrats' : 'die Gitterquadrate haben die Seitenlänge d'}. In welche Richtung zeigt die resultierende Kraft auf die Ladung im Ring?`);
  const whichHints = () => [
    L('Draw each force on the charge in the ring: along the line to the other charge, towards it (opposite signs) or away from it (like signs).', 'Zeichne jede Kraft auf die Ladung im Ring: entlang der Geraden zur anderen Ladung, zu ihr hin (entgegengesetzte Vorzeichen) oder von ihr weg (gleiche Vorzeichen).'),
    L('Equal charges at equal distances give forces of equal size: look for what cancels by symmetry.', 'Gleiche Ladungen in gleichen Abständen geben gleich grosse Kräfte: Suche, was sich aus Symmetriegründen aufhebt.'),
  ];
  const which = {
    id: 'which-tri', difficulty: 1,
    title: () => L('Which way? A triangle', 'Wohin? Ein Dreieck'),
    make(r) {
      const k = pick(r, [0, 0, 1, 2, 3]), h = Math.sqrt(3) / 2;
      const base = [[0, h * 2 / 3], [-0.5, -h / 3], [0.5, -h / 3]].map((c) => mul(rot(c, k), 1.4));
      return { shape: 'tri', scaleF: 1.96, pts: base.map((c) => ({ c, s: sign(r) })) };
    },
    solve: (p) => { const v = whichSolve(p); return { ...v, d: v.dir }; },
    traps: [], why: {},
    fields: () => [dirField('d', L('direction of the net force', 'Richtung der resultierenden Kraft'), DIR_ALL)],
    text: whichText, hints: whichHints, steps: whichSteps, figure: whichFigure,
  };
  // a square of side 2d around the target's grid, the target at its centre or at a corner
  const whichSquare = {
    ...which, id: 'which-square', difficulty: 2,
    title: () => L('Which way? A square', 'Wohin? Ein Quadrat'),
    make(r) {
      // the target at the centre of a 3 × 3 grid with charges at some of its neighbours, or at a
      // corner of a square with charges at the other three corners
      let pts;
      if (r() < 0.65) {
        const grid = []; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (x || y) grid.push([x, y]);
        pts = [[0, 0], ...shuffle(r, grid).slice(0, pick(r, [2, 3, 3, 4]))];
      } else {
        const k = pick(r, [0, 1, 2, 3]);
        pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map((c) => rot([c[0] - 0.5, c[1] - 0.5], k));
      }
      const p = { shape: pts.length === 4 && pts.every((c) => Math.abs(Math.abs(c[0]) - 0.5) < 1e-9) ? 'square' : 'grid', scaleF: 1, pts: pts.map((c) => ({ c, s: sign(r) })) };
      return whichSolve(p).dir ? p : null;
    },
  };

  // ---------------------------------------------------------------- 5 ranking arrangements
  // In units of d, the target +q at the origin, the other two charges at these points.
  const ARR = {
    end: [[1, 0], [2, 0]], mid: [[-1, 0], [1, 0]], right: [[-1, 0], [0, 1]], tri: [[1, 0], [0.5, Math.sqrt(3) / 2]],
    split: [[-1, 0], [2, 0]], diag: [[1, 0], [1, 1]], far: [[2, 0], [0, 1]],
  };
  const SIGNS = [[-1, -1], [1, 1], [-1, 1], [1, -1]];
  const arrNet = (pts, s) => pts.map((c, i) => force(1, [0, 0], s[i], c).map((x) => x / K)).reduce(add, [0, 0]);
  function rankMake(r, n) {
    const s = pick(r, SIGNS), keys = shuffle(r, Object.keys(ARR)).slice(0, n);
    const F = keys.map((k) => len(arrNet(ARR[k], s)));
    const distinct = F.every((a, i) => F.every((b, j) => i === j || Math.abs(a - b) > 0.03 * Math.max(a, b, 0.1)));
    return distinct ? { s, keys } : null;
  }
  const LETTERS = ['A', 'B', 'C', 'D'];
  function rankSolve(p) {
    const nets = p.keys.map((k) => arrNet(ARR[k], p.s)), F = nets.map(len);
    const order = F.map((f, i) => i).sort((a, b) => F[b] - F[a]);
    const rank = {}; order.forEach((i, k) => { rank[LETTERS[i]] = k + 1; });
    return { nets, F, rank, order };
  }
  function rankFigure(p, v, view) {
    const P = new Pic(70, L('The arrangements', 'Die Anordnungen'));
    const sl = (s) => `${s > 0 ? '+' : '−'}<tspan font-style="italic">q</tspan>`;
    let x0 = 0;
    p.keys.forEach((k, i) => {
      const pts = ARR[k], xs = [0, ...pts.map((c) => c[0])], minX = Math.min(...xs), maxX = Math.max(...xs), dx = x0 - minX;
      const at = (c) => [c[0] + dx, c[1]];
      pts.forEach((c) => P.line(at([0, 0]), at(c), 'w thin dashed'));
      pts.forEach((c, j) => P.charge(at(c), p.s[j], sl(p.s[j])));
      P.charge(at([0, 0]), 1, sl(1), 'hl');
      P.text([(minX + maxX) / 2 + dx, -0.9], `<tspan font-weight="700">${LETTERS[i]}</tspan>`, 'lbl');
      const hidden = view.show && (view.show.has(`F${i}`) || view.show.has('all')) ? '' : ' hidden', n = v.nets[i], l = len(n);
      if (l > 1e-9) P.arrow(at([0, 0]), unit(n), 22 + 40 * l, `force k-net${hidden}`, `${sig(l, 3)}${sv('F', '0')}`, [n[0] >= 0 ? 8 : -8, n[1] > 0.3 ? -8 : 14]);
      else P.text(at([0, -0.45]), `${sv('F')} = 0`, `lbl small${hidden}`);
      x0 += maxX - minX + 1.7;
    });
    return P.svg();
  }
  const rankStepText = (p, v, i) => {
    const k = p.keys[i], l = v.F[i];
    const what = {
      end: L('Both charges are on the same side, at d and 2d.', 'Beide Ladungen sind auf derselben Seite, in d und 2d.'),
      mid: L('The charges are on opposite sides, both at d.', 'Die Ladungen sind auf entgegengesetzten Seiten, beide in d.'),
      right: L('The charges are at d, at a right angle: Pythagoras.', 'Die Ladungen sind in d, im rechten Winkel: Pythagoras.'),
      tri: L('The charges are at d, at 60° to each other.', 'Die Ladungen sind in d, unter 60° zueinander.'),
      split: L('One charge at d on one side, the other at 2d on the other side.', 'Eine Ladung in d auf der einen Seite, die andere in 2d auf der anderen.'),
      diag: L('One charge at d, the other on the diagonal at √2 d (half the force), at 45°.', 'Eine Ladung in d, die andere auf der Diagonalen in √2 d (halbe Kraft), unter 45°.'),
      far: L('One charge at 2d (a quarter of the force), the other at d, at a right angle.', 'Eine Ladung in 2d (ein Viertel der Kraft), die andere in d, im rechten Winkel.'),
    }[k];
    return `<li><b>${LETTERS[i]}</b>: ${what} $F_{${LETTERS[i]}} = ${sig(l, 3)}\\,F_0$</li>`;
  };
  function rankSteps(p, v) {
    return [
      step(L('Each arrangement', 'Jede Anordnung'), p$(L('Let $F_0 = k\\,q^2/d^2$ be the force of one charge at the distance $d$. At $2d$ a charge acts with $F_0/4$, at $\\sqrt{2}\\,d$ with $F_0/2$. Add the two forces on +q as arrows:', 'Sei $F_0 = k\\,q^2/d^2$ die Kraft einer Ladung im Abstand $d$. In $2d$ wirkt eine Ladung mit $F_0/4$, in $\\sqrt{2}\\,d$ mit $F_0/2$. Addiere die beiden Kräfte auf +q als Pfeile:')) +
        `<ul>${p.keys.map((k, i) => rankStepText(p, v, i)).join('')}</ul>`, ['all']),
      step(L('The ranking', 'Die Rangfolge'), p$(L(`From the largest to the smallest: ${rt(v.order.map((i) => LETTERS[i]).join(' > '))}.`, `Vom grössten zum kleinsten: ${rt(v.order.map((i) => LETTERS[i]).join(' > '))}.`)), ['all']),
    ];
  }
  const rank3 = {
    id: 'rank', difficulty: 3,
    title: () => L('Ranking the arrangements', 'Anordnungen ordnen'),
    make: (r) => rankMake(r, 3),
    solve: (p) => { const v = rankSolve(p); return { ...v, rk: v.rank }; },
    traps: [], why: {},
    fields: (p) => [{ key: 'rk', type: 'rank', what: L('rank (1 = largest net force)', 'Rang (1 = grösste resultierende Kraft)'), want: L('the ranking of the arrangements', 'die Rangfolge der Anordnungen'), items: p.keys.map((k, i) => LETTERS[i]) }],
    text: (p) => {
      const others = p.s[0] !== p.s[1] ? L('of the other two, one is positive and one negative', 'von den anderen beiden ist eine positiv und eine negativ') : p.s[0] > 0 ? L('so are the other two', 'die anderen beiden auch') : L('the other two are negative', 'die anderen beiden sind negativ');
      return L(`The drawing shows three point charges arranged in ${word(p.keys.length)} different ways. The charges have the same size q: the one in the ring is positive, ${others}. In each arrangement the distance d is the same. Rank the arrangements by the size of the net force on the charge in the ring (1 = largest).`,
        `Die Abbildung zeigt drei Punktladungen in ${word(p.keys.length)} verschiedenen Anordnungen. Die Ladungen haben den gleichen Betrag q: Die im Ring ist positiv, ${others}. In jeder Anordnung ist der Abstand d derselbe. Ordne die Anordnungen nach dem Betrag der resultierenden Kraft auf die Ladung im Ring (1 = grösste).`);
    },
    hints: () => [
      L('Measure every force in units of F₀ = k q²/d², the force of one charge at the distance d. At 2d it is F₀/4.', 'Miss jede Kraft in Einheiten von F₀ = k q²/d², der Kraft einer Ladung im Abstand d. In 2d ist sie F₀/4.'),
      L('Then add the two forces of each arrangement as arrows: same direction, opposite directions, or at an angle.', 'Addiere dann die beiden Kräfte jeder Anordnung als Pfeile: gleiche Richtung, entgegengesetzt oder unter einem Winkel.'),
    ],
    steps: rankSteps,
    figure: rankFigure,
  };
  const rank4 = { ...rank3, id: 'rank4', difficulty: 4, make: (r) => rankMake(r, 4) };

  // ---------------------------------------------------------------- 6 at a right angle
  // The force F1 of charge 1 is given; that of charge 2 follows from the ratio of the charges and the
  // distances, without Coulomb's law. The two forces in the ratio of a Pythagorean triple (3 : 4 : 5,
  // 5 : 12 : 13), so that the net force needs no calculator.
  const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13]];
  const QR = [1, 2, 3, 4, 5, 6, 8, 9, 12, 16];
  function rightMake(r, same) {
    const a = pick(r, [10, 15, 20, 30]), b = same ? a : a * pick(r, [2, 0.5]), q1 = pick(r, QR), q2 = pick(r, QR);
    const ratio = (q2 / q1) * (a / b) ** 2, tr = TRIPLES.find(([A, B]) => Math.abs(ratio - B / A) < 1e-9);
    if (!tr) return null;
    const c = pick(r, tr[2] === 5 ? [0.1, 0.2, 0.3, 0.4, 0.5] : [0.1, 0.2, 0.5]);
    return { t: sign(r) * pick(r, [1, 2, 3, 4, 5]) * 1e-6, q1: sign(r) * q1 * 1e-6, q2: sign(r) * q2 * 1e-6, x1: sign(r) * a / 100, y2: sign(r) * b / 100, F1: CL.clean(tr[0] * c) };
  }
  // with sum: the forces added as numbers; with noSquare: the distances not squared
  function rightSolve(p, o = {}) {
    const ratio = (Math.abs(p.q2) / Math.abs(p.q1)) * (Math.abs(p.x1) / Math.abs(p.y2)) ** (o.noSquare ? 1 : 2);
    const F1 = p.F1, F2 = ratio * F1;
    const f1 = [(p.t * p.q1 > 0 ? -1 : 1) * Math.sign(p.x1) * F1, 0], f2 = [0, (p.t * p.q2 > 0 ? -1 : 1) * Math.sign(p.y2) * F2], net = add(f1, f2);
    return { f1, f2, net, F1, F2, ratio, F: o.sum ? F1 + F2 : len(net), dir: dirOf([Math.sign(net[0]), Math.sign(net[1])]) };
  }
  function rightFigure(p, v, view) {
    const ext = Math.max(Math.abs(p.x1), Math.abs(p.y2)), s = 150 / ext;
    return drawing({
      scale: s,
      // the label of the charge opposite its forces; each dimension line on the side the other
      // force does not point to
      pts: [{ c: [0, 0], q: Math.sign(p.t), lab: qs(p.t, 'μC'), cls: 'hl', off: [-Math.sign(v.f1[0]) * 14, Math.sign(v.f2[1]) * 22] }, { c: [p.x1, 0], q: Math.sign(p.q1), lab: `1: ${qs(p.q1, 'μC')}` }, { c: [0, p.y2], q: Math.sign(p.q2), lab: `2: ${qs(p.q2, 'μC')}`, off: [14, 0] }],
      dims: [[[0, 0], [p.x1, 0], q(Math.abs(p.x1), 'cm'), -Math.sign(v.f2[1]) * Math.sign(p.x1) * 44], [[0, 0], [0, p.y2], q(Math.abs(p.y2), 'cm'), Math.sign(v.f1[0]) * Math.sign(p.y2) * 48]],
      forces: { F1: { at: [0, 0], F: v.f1, lab: sv('F', '1'), cls: 'k-1' }, F2: { at: [0, 0], F: v.f2, lab: sv('F', '2'), cls: 'k-2' }, F: { at: [0, 0], F: v.net, lab: sv('F'), cls: 'k-net' } },
      arrow: 95,
      after: (P, vw) => {
        if (!vw.show || !vw.show.has('F')) return;
        const big = Math.max(v.F1, v.F2, len(v.net)), k = 95 / big / s, e1 = mul(v.f1, k), e2 = mul(v.f2, k);
        P.line(e1, add(e1, e2), 'w thin dashed'); P.line(e2, add(e1, e2), 'w thin dashed');
      },
    }, view);
  }
  const right = {
    id: 'right', difficulty: 3,
    title: () => L('Forces at a right angle', 'Kräfte im rechten Winkel'),
    make: (r) => rightMake(r, true),
    solve: rightSolve,
    traps: ['sum', 'noSquare'],
    why: {
      sum: () => L('The forces are perpendicular: add them as arrows, with Pythagoras, not as numbers.', 'Die Kräfte stehen senkrecht aufeinander: Addiere sie als Pfeile, mit Pythagoras, nicht als Zahlen.'),
      noSquare: () => L('The distance counts squared: at twice the distance a quarter of the force.', 'Der Abstand zählt im Quadrat: im doppelten Abstand ein Viertel der Kraft.'),
    },
    fields: () => [num$('F2', 'F_2', 'N', L('force of charge 2', 'Kraft von Ladung 2')), num$('F', 'F', 'N', L('size of the net force', 'Betrag der resultierenden Kraft')), dirField('dir', L('direction', 'Richtung'), ['NE', 'NW', 'SW', 'SE'])],
    text: (p) => {
      const same = Math.abs(Math.abs(p.x1) - Math.abs(p.y2)) < 1e-9;
      return L(`A charge of ${qs(p.t, 'μC')} sits at the corner of a right angle; charge 1 (${qs(p.q1, 'μC')}) and charge 2 (${qs(p.q2, 'μC')}) lie on the two sides, ${same ? 'both at the same distance' : 'at different distances'}, as shown. Charge 1 exerts a force of ${q(p.F1, 'N')} on the charge in the corner. How large is the force of charge 2 on it? How large is the net force, and roughly where does it point?`,
        `Eine Ladung von ${qs(p.t, 'μC')} sitzt in der Ecke eines rechten Winkels; Ladung 1 (${qs(p.q1, 'μC')}) und Ladung 2 (${qs(p.q2, 'μC')}) liegen auf den beiden Schenkeln, ${same ? 'beide im gleichen Abstand' : 'in verschiedenen Abständen'}, wie abgebildet. Ladung 1 übt auf die Ladung in der Ecke eine Kraft von ${q(p.F1, 'N')} aus. Wie gross ist die Kraft von Ladung 2 auf sie? Wie gross ist die resultierende Kraft, und ungefähr wohin zeigt sie?`);
    },
    hints: () => [
      L('Compare charge 2 with charge 1: the force is proportional to the charge and to 1/r². No need for k.', 'Vergleiche Ladung 2 mit Ladung 1: Die Kraft ist proportional zur Ladung und zu 1/r². k braucht es nicht.'),
      L('One force is horizontal, the other vertical: the net force is the diagonal of the rectangle, F = √(F₁² + F₂²).', 'Eine Kraft ist horizontal, die andere vertikal: Die resultierende Kraft ist die Diagonale des Rechtecks, F = √(F₁² + F₂²).'),
    ],
    steps: (p, v) => {
      const a = Math.round(Math.abs(p.x1) * 100), b = Math.round(Math.abs(p.y2) * 100), q1 = Math.round(Math.abs(p.q1) * 1e6), q2 = Math.round(Math.abs(p.q2) * 1e6);
      const dist = a === b ? '' : `\\cdot\\left(\\frac{${a}}{${b}}\\right)^2`;
      const pull = (qi) => (p.t * qi < 0 ? L('attracts', 'zieht … an') : L('repels', 'stösst … ab'));
      const tri = TRIPLES.find(([A, B]) => Math.abs(v.F2 / v.F1 - B / A) < 1e-9);
      return [
        step(L('The force of charge 2', 'Die Kraft von Ladung 2'), p$(L(`Compare it with that of charge 1: the force is proportional to the charge${a === b ? ', and the distances are the same' : ' and to 1/r²'}; k and the charge in the corner cancel.`, `Vergleiche sie mit der von Ladung 1: Die Kraft ist proportional zur Ladung${a === b ? ', und die Abstände sind gleich' : ' und zu 1/r²'}; k und die Ladung in der Ecke kürzen sich.`)) +
          `$$\\frac{F_2}{F_1} = \\frac{${q2}}{${q1}}${dist} = ${ft(v.ratio)} \\;\\Rightarrow\\; F_2 = ${ft(v.ratio)}\\cdot ${tq(v.F1, 'N')} = ${res(tq(v.F2, 'N'))}$$`, ['F2'], ['F2']),
        step(L('The directions', 'Die Richtungen'), p$(L(`Charge 1 ${pull(p.q1)} the charge in the corner: its force points ${arrowWord(v.f1[0] > 0 ? 'E' : 'W')}. Charge 2 ${pull(p.q2)} it: its force points ${arrowWord(v.f2[1] > 0 ? 'N' : 'S')}.`,
          `Ladung 1 ${pull(p.q1).replace(' … ', ' die Ladung in der Ecke ')}: Ihre Kraft zeigt ${arrowWord(v.f1[0] > 0 ? 'E' : 'W')}. Ladung 2 ${pull(p.q2).replace(' … ', ' sie ')}: Ihre Kraft zeigt ${arrowWord(v.f2[1] > 0 ? 'N' : 'S')}.`)), ['F1', 'F2']),
        step(L('The net force', 'Die resultierende Kraft'), p$(L('The forces are perpendicular: the net force is the diagonal of the rectangle they span.', 'Die Kräfte stehen senkrecht aufeinander: Die resultierende Kraft ist die Diagonale des Rechtecks, das sie aufspannen.')) +
          `$$F = \\sqrt{F_1^2 + F_2^2} = \\sqrt{(${tq(v.F1, 'N')})^2 + (${tq(v.F2, 'N')})^2} = \\sqrt{${tnum(v.F1 ** 2)} + ${tnum(v.F2 ** 2)}}\\,\\mathrm{N} = ${res(tq(v.F, 'N'))}$$` +
          p$(L(`The sides are in the ratio ${tri.join(' : ')}, like the sides of a right triangle you may know. The net force points ${rt(arrowWord(v.dir))}, between the two forces and nearer the larger one.`,
            `Die Seiten stehen im Verhältnis ${tri.join(' : ')}, wie die Seiten eines bekannten rechtwinkligen Dreiecks. Die resultierende Kraft zeigt ${rt(arrowWord(v.dir))}, zwischen den beiden Kräften und näher bei der grösseren.`)), ['F1', 'F2', 'F'], ['F']),
      ];
    },
    figure: rightFigure,
  };
  const rightDist = { ...right, id: 'right-dist', difficulty: 4, title: () => L('At a right angle, different distances', 'Rechter Winkel, verschiedene Abstände'), make: (r) => rightMake(r, false) };

  // ---------------------------------------------------------------- 7 where is the force zero?
  // q1 at 0, q2 at d (m) on the x axis; m = |q2|/|q1| a square (or 9/4).
  function zeroMake(r, like) {
    const m = pick(r, like ? [1, 4, 9, 9 / 4, 16] : [4, 9, 9 / 4, 16]), q1 = pick(r, m === 9 / 4 ? [4, 8] : m === 16 ? [1, 2] : [1, 2, 3, 4]), s = sign(r);
    const swap = r() < 0.5, a = swap ? q1 * m : q1, b = swap ? q1 : q1 * m;
    const d = pick(r, [30, 40, 60, 90, 120]) / 100;
    const p = { q1: s * a * 1e-6, q2: (like ? s : -s) * b * 1e-6, d, like };
    const x = zeroSolve(p).x;
    return Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? p : null;
  }
  function zeroSolve(p, o = {}) {
    const a = Math.abs(p.q1), b = Math.abs(p.q2), k = Math.sqrt(b / a);
    if (p.like) {
      const x = o.noRoot ? (p.d * a) / (a + b) : p.d / (1 + k);
      return { region: 'between', x: o.other ? p.d - x : x, pos: x };
    }
    // outside, beyond the smaller charge: its distance s from that charge
    const small = a < b ? 1 : 2, kk = Math.sqrt(Math.max(a, b) / Math.min(a, b));
    const s = o.noRoot ? p.d / (kk * kk - 1) : o.between ? p.d / (1 + kk) : p.d / (kk - 1);
    return { region: small === 1 ? 'left' : 'right', x: s, pos: small === 1 ? -s : p.d + s, small };
  }
  function zeroFigure(p, v, view) {
    const pos = v.pos, hide = view.show && view.show.size ? '' : 'hidden', xs = [0, p.d, pos], minX = Math.min(...xs), maxX = Math.max(...xs), s = 360 / (maxX - minX);
    return drawing({
      scale: s,
      pts: [{ c: [0, 0], q: Math.sign(p.q1), lab: `${sv('q', '1')} = ${qs(p.q1, 'μC')}` }, { c: [p.d, 0], q: Math.sign(p.q2), lab: `${sv('q', '2')} = ${qs(p.q2, 'μC')}` }, { c: [pos, 0], q: 0, lab: L('here', 'hier'), cls: `hl ${hide}` }],
      dims: [[[0, 0], [p.d, 0], q(p.d, 'cm'), -26], [[Math.min(pos, p.like || v.small === 1 ? 0 : p.d), 0], [Math.max(pos, p.like || v.small === 1 ? 0 : p.d), 0], q(v.x, 'cm'), -56, hide]],
      before: (P) => { P.line([minX - 0.1 * (maxX - minX), 0], [maxX + 0.1 * (maxX - minX), 0], 'w thin dashed'); },
    }, view);
  }
  const zeroRegions = () => [['left', L('left of q₁', 'links von q₁')], ['between', L('between the charges', 'zwischen den Ladungen')], ['right', L('right of q₂', 'rechts von q₂')]];
  const zeroLike = {
    id: 'zero-like', difficulty: 3,
    title: () => L('Where is the force zero?', 'Wo ist die Kraft null?'),
    make: (r) => zeroMake(r, true),
    solve: zeroSolve,
    traps: ['noRoot', 'other'],
    why: { noRoot: () => L('The forces go with 1/r²: the distances are in the ratio of the square roots of the charges.', 'Die Kräfte gehen mit 1/r²: Die Abstände stehen im Verhältnis der Wurzeln der Ladungen.'), other: () => L('That is the distance from q₂; the question asks for the distance from q₁.', 'Das ist der Abstand von q₂; gefragt ist der Abstand von q₁.') },
    fields: () => [choice('region', L('The point lies …', 'Der Punkt liegt …'), zeroRegions(), L('where the point lies', 'wo der Punkt liegt')), num$('x', 'x', 'cm', L('distance from q₁', 'Abstand von q₁'))],
    text: (p) => L(`Two point charges of ${qs(p.q1, 'μC')} (q₁) and ${qs(p.q2, 'μC')} (q₂) are ${q(p.d, 'cm')} apart. At which point on the line through them does a third charge feel no net force? Give the region and the distance from q₁.`,
      `Zwei Punktladungen von ${qs(p.q1, 'μC')} (q₁) und ${qs(p.q2, 'μC')} (q₂) sind ${q(p.d, 'cm')} voneinander entfernt. An welchem Punkt auf der Geraden durch sie spürt eine dritte Ladung keine resultierende Kraft? Gib den Bereich und den Abstand von q₁ an.`),
    hints: () => [
      L('The two forces on the third charge must point in opposite directions and have the same size. Where on the line do they point in opposite directions?', 'Die beiden Kräfte auf die dritte Ladung müssen entgegengesetzt und gleich gross sein. Wo auf der Geraden zeigen sie in entgegengesetzte Richtungen?'),
      L('Set k q q₁/x² = k q q₂/(distance to q₂)²: the third charge q cancels. Take the square root of both sides.', 'Setze k q q₁/x² = k q q₂/(Abstand zu q₂)²: Die dritte Ladung q kürzt sich. Zieh auf beiden Seiten die Wurzel.'),
    ],
    steps: (p, v) => {
      const a = Math.abs(p.q1), b = Math.abs(p.q2);
      return [
        step(L('Where?', 'Wo?'), p$(L('Like charges push (or pull) a third charge in the same way. Between them, their forces point in opposite directions; outside, in the same direction. So the point lies between them, nearer the smaller charge.', 'Gleichnamige Ladungen stossen (oder ziehen) eine dritte Ladung gleich. Zwischen ihnen zeigen ihre Kräfte in entgegengesetzte Richtungen, ausserhalb in dieselbe. Der Punkt liegt also zwischen ihnen, näher bei der kleineren Ladung.'))),
        step(L('Equal forces', 'Gleiche Kräfte'), p$(L('Let $x$ be the distance from $q_1$ and $d$ the distance between the charges. The forces on a third charge $q$ are equal:', 'Sei $x$ der Abstand von $q_1$ und $d$ der Abstand der Ladungen. Die Kräfte auf eine dritte Ladung $q$ sind gleich:')) +
          `$$k\\,\\frac{|q|\\,|q_1|}{x^2} = k\\,\\frac{|q|\\,|q_2|}{(d - x)^2} \\;\\Rightarrow\\; \\frac{d - x}{x} = \\sqrt{\\frac{|q_2|}{|q_1|}} \\;\\Rightarrow\\; x = \\frac{d}{1 + \\sqrt{|q_2|/|q_1|}}$$`, ['P']),
        step(L('The numbers', 'Die Zahlen'), `$$x = \\frac{${tq(p.d, 'cm')}}{1 + \\sqrt{${sig(b / a, 4)}}} = ${res(tq(v.x, 'cm'))}$$` + p$(L(`The point lies ${rt(L('between the charges', 'zwischen den Ladungen'))}, ${q(v.x, 'cm')} from q₁.`, `Der Punkt liegt ${rt('zwischen den Ladungen')}, ${q(v.x, 'cm')} von q₁ entfernt.`)), ['P']),
      ];
    },
    figure: zeroFigure,
  };
  const zeroUnlike = {
    ...zeroLike, id: 'zero-unlike', difficulty: 4,
    title: () => L('Zero force beside unlike charges', 'Kraft null bei ungleichnamigen Ladungen'),
    make: (r) => zeroMake(r, false),
    traps: ['noRoot', 'between'],
    why: { noRoot: () => L('The forces go with 1/r²: the distances are in the ratio of the square roots of the charges.', 'Die Kräfte gehen mit 1/r²: Die Abstände stehen im Verhältnis der Wurzeln der Ladungen.'), between: () => L('Between unlike charges, both forces point the same way: the point lies outside.', 'Zwischen ungleichnamigen Ladungen zeigen beide Kräfte in dieselbe Richtung: Der Punkt liegt ausserhalb.') },
    fields: () => [choice('region', L('The point lies …', 'Der Punkt liegt …'), zeroRegions(), L('where the point lies', 'wo der Punkt liegt')), num$('x', 'x', 'cm', L('distance from the nearer charge', 'Abstand von der näheren Ladung'))],
    text: (p) => L(`Two point charges of ${qs(p.q1, 'μC')} (q₁) and ${qs(p.q2, 'μC')} (q₂) are ${q(p.d, 'cm')} apart. At which point on the line through them does a third charge feel no net force? Give the region and the distance from the nearer of the two charges.`,
      `Zwei Punktladungen von ${qs(p.q1, 'μC')} (q₁) und ${qs(p.q2, 'μC')} (q₂) sind ${q(p.d, 'cm')} voneinander entfernt. An welchem Punkt auf der Geraden durch sie spürt eine dritte Ladung keine resultierende Kraft? Gib den Bereich und den Abstand von der näheren der beiden Ladungen an.`),
    steps: (p, v) => {
      const a = Math.abs(p.q1), b = Math.abs(p.q2), sm = v.small === 1 ? 'q_1' : 'q_2', bg = v.small === 1 ? 'q_2' : 'q_1', ratio = sig(Math.max(a, b) / Math.min(a, b), 4);
      return [
        step(L('Where?', 'Wo?'), p$(L(`Unlike charges: one pushes, the other pulls a third charge. Between them, both forces point the same way. Outside, they point in opposite directions, and they can be equal only near the smaller charge $${sm}$, where its smaller charge is made up for by the shorter distance.`,
          `Ungleichnamige Ladungen: Die eine stösst, die andere zieht eine dritte Ladung. Zwischen ihnen zeigen beide Kräfte in dieselbe Richtung. Ausserhalb zeigen sie in entgegengesetzte Richtungen, und gleich gross können sie nur nahe bei der kleineren Ladung $${sm}$ sein, wo ihre kleinere Ladung durch den kürzeren Abstand ausgeglichen wird.`))),
        step(L('Equal forces', 'Gleiche Kräfte'), p$(L(`Let $x$ be the distance from $${sm}$ and $d$ the distance between the charges; $${bg}$ is then $d + x$ away:`, `Sei $x$ der Abstand von $${sm}$ und $d$ der Abstand der Ladungen; $${bg}$ ist dann $d + x$ entfernt:`)) +
          `$$k\\,\\frac{|q|\\,|${sm}|}{x^2} = k\\,\\frac{|q|\\,|${bg}|}{(d + x)^2} \\;\\Rightarrow\\; \\frac{d + x}{x} = \\sqrt{\\frac{|${bg}|}{|${sm}|}} \\;\\Rightarrow\\; x = \\frac{d}{\\sqrt{|${bg}|/|${sm}|} - 1}$$`, ['P']),
        step(L('The numbers', 'Die Zahlen'), `$$x = \\frac{${tq(p.d, 'cm')}}{\\sqrt{${ratio}} - 1} = ${res(tq(v.x, 'cm'))}$$` +
          p$(L(`The point lies ${rt(v.small === 1 ? 'left of q₁' : 'right of q₂')}, ${q(v.x, 'cm')} from it.`, `Der Punkt liegt ${rt(v.small === 1 ? 'links von q₁' : 'rechts von q₂')}, ${q(v.x, 'cm')} davon entfernt.`)), ['P']),
      ];
    },
  };

  // ---------------------------------------------------------------- 8 moved slightly
  // Outer charges at (−1, 0) and (1, 0) (units of d), of the same sign; the middle one moved by
  // 0.25 d along the line or across it (drawn larger than "slightly", to be seen).
  function nudgeMake(r, across) {
    return { across, so: sign(r), sm: sign(r), dir: across ? pick(r, ['N', 'S']) : pick(r, ['E', 'W']), vert: r() < 0.3 };
  }
  const R90 = (c, v) => (v ? [-c[1], c[0]] : c); // the line drawn upright
  const DROT = { E: 'N', N: 'W', W: 'S', S: 'E' };
  function nudgeSolve(p) {
    const dv = { E: [0.25, 0], W: [-0.25, 0], N: [0, 0.25], S: [0, -0.25] }[p.dir], at = dv;
    const fa = force(p.sm, at, p.so, [-1, 0]).map((x) => x / K), fb = force(p.sm, at, p.so, [1, 0]).map((x) => x / K), net = add(fa, fb);
    const d0 = dirOf(net, 1), dir = p.vert ? DROT[d0] : d0, moved = p.vert ? DROT[p.dir] : p.dir;
    return { fa, fb, net, at, d: dir, stab: dir === moved ? 'away' : 'back', moved };
  }
  function nudgeFigure(p, v, view) {
    const c = (x) => R90(x, p.vert), sl = (s) => `${s > 0 ? '+' : '−'}<tspan font-style="italic">q</tspan>`;
    return drawing({
      scale: 170,
      before: (P) => { P.line(c([-1, 0]), c([1, 0]), 'w thin dashed'); P.charge(c([0, 0]), p.sm, '', 'ghost'); P.arrow(c([0, 0]), unit(c(v.at)), 22, 'force k-move'); },
      pts: [{ c: c([-1, 0]), q: p.so, lab: sl(p.so) }, { c: c([1, 0]), q: p.so, lab: sl(p.so) }, { c: c(v.at), q: p.sm, lab: sl(p.sm), cls: 'hl', off: p.across ? [16, -16] : [0, -21] }],
      dims: [[c([-1, 0]), c([0, 0]), sv('d'), p.vert ? 64 : -64], [c([0, 0]), c([1, 0]), sv('d'), p.vert ? 64 : -64]],
      // along the line, the labels of the two forces below them and that of the net force above
      forces: { Fa: { at: c(v.at), F: c(v.fa), lab: sv('F', '1'), cls: 'k-1', off: p.across || p.vert ? undefined : [0, 22] }, Fb: { at: c(v.at), F: c(v.fb), lab: sv('F', '2'), cls: 'k-2', off: p.across || p.vert ? undefined : [0, 22] }, F: { at: c(v.at), F: c(v.net), lab: sv('F'), cls: 'k-net', off: p.across || p.vert ? undefined : [0, 40] } },
      arrow: 80,
    }, view);
  }
  const nudgeFields = () => [dirField('d', L('direction of the net force', 'Richtung der resultierenden Kraft'), ['N', 'E', 'S', 'W', '0']),
    choice('stab', L('The net force …', 'Die resultierende Kraft …'), [['back', L('pushes the charge back to the middle', 'treibt die Ladung zur Mitte zurück')], ['away', L('pushes it further away from the middle', 'treibt sie weiter von der Mitte weg')]], L('whether it pushes the charge back to the middle', 'ob sie die Ladung zur Mitte zurücktreibt'))];
  const nudgeText = (p) => {
    const like = p.so === p.sm, side = p.across ? L('away from the line, across it', 'quer zur Geraden') : L('along the line, towards one of the outer charges', 'entlang der Geraden, zu einer der äusseren Ladungen hin');
    return L(`Three point charges of the same size lie on a line, the middle one exactly halfway between the others. There the forces on it cancel. Now the middle charge is moved slightly ${side} (the drawing exaggerates it). In which direction does the net force on it point? Does it push the charge back to the middle?`,
      `Drei gleich grosse Punktladungen liegen auf einer Geraden, die mittlere genau in der Mitte zwischen den anderen. Dort heben sich die Kräfte auf sie auf. Nun wird die mittlere Ladung ein wenig verschoben, ${side} (die Zeichnung übertreibt). In welche Richtung zeigt die resultierende Kraft auf sie? Treibt sie die Ladung zur Mitte zurück?`) + (like ? '' : '');
  };
  const nudgeHints = (p) => [
    L('Draw the forces of both outer charges on the moved charge: along the lines to them, towards them (unlike) or away from them (like).', 'Zeichne die Kräfte beider äusseren Ladungen auf die verschobene Ladung: entlang der Geraden zu ihnen, zu ihnen hin (ungleichnamig) oder von ihnen weg (gleichnamig).'),
    p.across ? L('Both charges are equally far away now: their forces are equally large. Which components cancel?', 'Beide Ladungen sind jetzt gleich weit entfernt: Ihre Kräfte sind gleich gross. Welche Komponenten heben sich auf?')
      : L('The nearer charge now acts with the larger force (1/r²).', 'Die nähere Ladung wirkt jetzt mit der grösseren Kraft (1/r²).'),
  ];
  function nudgeSteps(p, v) {
    const like = p.so === p.sm;
    const first = p.across
      ? (like ? L('Both outer charges repel the middle one. Moved off the line, it is equally far from both: the forces have the same size, their components along the line cancel, those across the line add up, pointing away from the line.', 'Beide äusseren Ladungen stossen die mittlere ab. Neben der Geraden ist sie von beiden gleich weit entfernt: Die Kräfte sind gleich gross, ihre Komponenten entlang der Geraden heben sich auf, die quer dazu addieren sich und zeigen von der Geraden weg.')
        : L('Both outer charges attract the middle one. Moved off the line, it is equally far from both: the forces have the same size, their components along the line cancel, those across the line add up, pointing back towards the line.', 'Beide äusseren Ladungen ziehen die mittlere an. Neben der Geraden ist sie von beiden gleich weit entfernt: Die Kräfte sind gleich gross, ihre Komponenten entlang der Geraden heben sich auf, die quer dazu addieren sich und zeigen zur Geraden zurück.'))
      : (like ? L('Both outer charges repel the middle one, in opposite directions. The nearer one now pushes harder (1/r²): the net force points away from it, back to the middle.', 'Beide äusseren Ladungen stossen die mittlere ab, in entgegengesetzte Richtungen. Die nähere stösst jetzt stärker (1/r²): Die resultierende Kraft zeigt von ihr weg, zurück zur Mitte.')
        : L('Both outer charges attract the middle one, in opposite directions. The nearer one now pulls harder (1/r²): the net force points towards it, further away from the middle.', 'Beide äusseren Ladungen ziehen die mittlere an, in entgegengesetzte Richtungen. Die nähere zieht jetzt stärker (1/r²): Die resultierende Kraft zeigt zu ihr hin, weiter von der Mitte weg.'));
    return [
      step(L('The two forces', 'Die beiden Kräfte'), p$(first), ['Fa', 'Fb']),
      step(L('The net force', 'Die resultierende Kraft'), p$(L(`The net force points ${rt(arrowWord(v.d))}: it ${rt(v.stab === 'back' ? 'pushes the charge back to the middle' : 'pushes it further away')}.`, `Die resultierende Kraft zeigt ${rt(arrowWord(v.d))}: Sie ${rt(v.stab === 'back' ? 'treibt die Ladung zur Mitte zurück' : 'treibt sie weiter weg')}.`)) +
        p$(v.stab === 'back' ? L('The middle is a stable position for this displacement: the charge returns, like a ball in a bowl.', 'Die Mitte ist für diese Verschiebung eine stabile Lage: Die Ladung kehrt zurück, wie eine Kugel in einer Schale.')
          : L('The middle is an unstable position for this displacement: the slightest push moves the charge away, like a ball on a hilltop.', 'Die Mitte ist für diese Verschiebung eine labile Lage: Der kleinste Stoss treibt die Ladung weg, wie eine Kugel auf einer Kuppe.')), ['Fa', 'Fb', 'F'], ['F']),
    ];
  }
  const nudgeAlong = { id: 'nudge-along', difficulty: 2, title: () => L('Moved along the line', 'Entlang der Geraden verschoben'), make: (r) => nudgeMake(r, false), solve: nudgeSolve, traps: [], why: {}, fields: nudgeFields, text: nudgeText, hints: nudgeHints, steps: nudgeSteps, figure: nudgeFigure };
  const nudgeAcross = { ...nudgeAlong, id: 'nudge-across', difficulty: 3, title: () => L('Moved off the line', 'Neben die Gerade verschoben'), make: (r) => nudgeMake(r, true) };

  // ---------------------------------------------------------------- 9 field and force
  // A test charge q1 > 0 at P feels the force F1 = q1 E in the direction d (of the field); then a
  // charge q2 of either sign takes its place. Numbers for mental arithmetic: nC, μN and N/C.
  function fieldForceMake(r) {
    const q1 = pick(r, [1, 2, 4, 5]) * 1e-9, q2 = sign(r) * pick(r, [1, 2, 3, 4, 6]) * 1e-9;
    return Math.abs(q2) !== q1 ? { q1, E: pick(r, [500, 1000, 2000, 3000, 5000]), d: pick(r, DIRS), q2 } : null;
  }
  // with prefix: μN and nC taken as N and C; sameF: the same force for every charge; inverse: the
  // force inversely proportional to the charge; against: along and against the field mixed up
  function fieldForceSolve(p, o = {}) {
    const F1 = p.q1 * p.E, along = (p.q2 > 0) !== !!o.against;
    return { F1, E: o.prefix ? p.E / 1000 : p.E, F2: o.sameF ? F1 : o.inverse ? (F1 * p.q1) / Math.abs(p.q2) : Math.abs(p.q2) * p.E, dir: along ? p.d : opp(p.d) };
  }
  // the first test charge at P on the left, the second one at P on the right; the field drawn as
  // long as the larger force, beside the second charge (on the side away from its label)
  function fieldForceFigure(p, v, view) {
    const X = 4.4, u = DIRVEC[p.d], up = u[1] > 0.3, n = [u[1], -u[0]], side = mul(n, (n[1] > 0) === up || !n[1] ? 0.42 : -0.42), big = Math.max(v.F1, v.F2), show = new Set([...(view.show || []), 'F1']);
    return drawing({
      scale: 50,
      after: (P) => { const y = u[1] < -0.3 ? -2.3 : -1.1; P.text([0, y], L('first test charge', 'erste Probeladung'), 'lbl note'); P.text([X, y], L('second test charge', 'zweite Probeladung'), 'lbl note'); },
      pts: [{ c: [0, 0], q: 1, lab: `${sv('q', '1')} = ${qs(p.q1, 'nC')}`, off: [0, up ? 24 : -21] }, { c: [X, 0], q: Math.sign(p.q2), lab: `${sv('q', '2')} = ${qs(p.q2, 'nC')}`, cls: 'hl', off: [0, up ? 30 : -27] }],
      forces: {
        F1: { at: [0, 0], F: mul(u, v.F1), lab: `${sv('F', '1')} = ${q(v.F1, 'μN')}`, cls: 'k-1' },
        E: { at: add([X, 0], side), F: mul(u, big), lab: sv('E'), cls: 'k-net' },
        F2: { at: [X, 0], F: mul(DIRVEC[v.dir], v.F2), lab: sv('F', '2'), cls: 'k-2' },
      },
      arrow: 70,
    }, { ...view, show });
  }
  const fieldForce = {
    id: 'field-force', difficulty: 2,
    title: () => L('Field and force', 'Feld und Kraft'),
    make: fieldForceMake,
    solve: fieldForceSolve,
    traps: ['prefix', 'sameF', 'inverse', 'against'],
    why: {
      prefix: () => L('Mind the prefixes: 1 μN = 10⁻⁶ N, 1 nC = 10⁻⁹ C.', 'Achte auf die Vorsätze: 1 μN = 10⁻⁶ N, 1 nC = 10⁻⁹ C.'),
      sameF: () => L('The field at P stays the same, but the force is proportional to the charge: F = |q| E.', 'Das Feld in P bleibt gleich, aber die Kraft ist proportional zur Ladung: F = |q| E.'),
      inverse: () => L('A larger charge feels a larger force, not a smaller one: F = |q| E.', 'Eine grössere Ladung spürt eine grössere Kraft, nicht eine kleinere: F = |q| E.'),
      against: () => L('A positive charge is pushed along the field, a negative charge against it.', 'Eine positive Ladung wird in Feldrichtung gestossen, eine negative entgegen.'),
    },
    fields: () => [num$('E', 'E', 'N/C', L('field strength at P', 'Feldstärke in P')), num$('F2', 'F_2', 'μN', L('size of the force on the second charge', 'Betrag der Kraft auf die zweite Ladung')),
      dirField('dir', L('direction of that force', 'Richtung dieser Kraft'), DIR_ALL)],
    text: (p) => L(`A small test charge of ${qs(p.q1, 'nC')} at a point P feels an electric force of ${q(p.q1 * p.E, 'μN')}, pointing ${dirName(p.d)}. Then it is replaced by a charge of ${qs(p.q2, 'nC')}. How strong is the field at P? How large is the force on the second charge, and which way does it point?`,
      `Eine kleine Probeladung von ${qs(p.q1, 'nC')} in einem Punkt P spürt eine elektrische Kraft von ${q(p.q1 * p.E, 'μN')}, die ${dirName(p.d)} zeigt. Dann wird sie durch eine Ladung von ${qs(p.q2, 'nC')} ersetzt. Wie stark ist das Feld in P? Wie gross ist die Kraft auf die zweite Ladung, und wohin zeigt sie?`),
    hints: () => [
      L('The field is the force per charge: E = F/q. It belongs to the point P, not to the test charge.', 'Das Feld ist die Kraft pro Ladung: E = F/q. Es gehört zum Punkt P, nicht zur Probeladung.'),
      L('The force on another charge: F = |q| E, along the field for a positive charge, against it for a negative one.', 'Die Kraft auf eine andere Ladung: F = |q| E, in Feldrichtung für eine positive Ladung, entgegen für eine negative.'),
    ],
    steps: (p, v) => [
      step(L('The field strength', 'Die Feldstärke'), p$(L('Let $F_1$ be the force on the test charge $q_1$. The field at P is the force per charge, and it points along the force on a positive charge:', 'Sei $F_1$ die Kraft auf die Probeladung $q_1$. Das Feld in P ist die Kraft pro Ladung, und es zeigt in Richtung der Kraft auf eine positive Ladung:')) +
        `$$E = \\frac{F_1}{q_1} = \\frac{${tnum(v.F1)}\\,\\mathrm{N}}{${tnum(p.q1)}\\,\\mathrm{C}} = ${res(tq(v.E, 'N/C'))}$$` + p$(L('The field belongs to the point P: it stays the same when the test charge is replaced.', 'Das Feld gehört zum Punkt P: Es bleibt gleich, wenn die Probeladung ersetzt wird.')), ['E'], ['E']),
      step(L('The force on the second charge', 'Die Kraft auf die zweite Ladung'), p$(L(`The force is proportional to the charge: ${Math.abs(p.q2) > p.q1 ? 'a larger' : 'a smaller'} charge, ${Math.abs(p.q2) > p.q1 ? 'a larger' : 'a smaller'} force.`, `Die Kraft ist proportional zur Ladung: ${Math.abs(p.q2) > p.q1 ? 'grössere' : 'kleinere'} Ladung, ${Math.abs(p.q2) > p.q1 ? 'grössere' : 'kleinere'} Kraft.`)) +
        `$$F_2 = |q_2|\\,E = ${tnum(Math.abs(p.q2))}\\,\\mathrm{C}\\cdot ${tq(v.E, 'N/C')} = ${res(tq(v.F2, 'μN'))}$$`, ['E', 'F2'], ['F2']),
      step(L('Its direction', 'Ihre Richtung'), p$(p.q2 > 0
        ? L(`$q_2$ is positive: the force points along the field, ${rt(arrowWord(v.dir))}.`, `$q_2$ ist positiv: Die Kraft zeigt in Feldrichtung, ${rt(arrowWord(v.dir))}.`)
        : L(`$q_2$ is negative: the force points against the field, ${rt(arrowWord(v.dir))}. The field at P has not changed, only the sign of the charge.`, `$q_2$ ist negativ: Die Kraft zeigt entgegen der Feldrichtung, ${rt(arrowWord(v.dir))}. Das Feld in P hat sich nicht geändert, nur das Vorzeichen der Ladung.`)), ['E', 'F2'], ['F2']),
    ],
    figure: fieldForceFigure,
  };

  // ---------------------------------------------------------------- 10 fields add up
  // Charges s q (s = ±1, ±2) on a grid of side d around the empty point P at the origin; fields in
  // units of E₀ = k q/d². The field of a charge at P is the force on a test charge +1 there.
  const NAMES = ['A', 'B', 'C'];
  const fieldAt = (s, c) => force(1, [0, 0], s, c).map((x) => x / K);
  // with fieldSign: every field the wrong way round; largest: the strongest field alone; negAlong: the
  // force on a negative charge along the field
  function fieldSumSolve(p, o = {}) {
    const parts = p.ch.map((x) => fieldAt(o.fieldSign ? -x.s : x.s, x.c)), net = parts.reduce(add, [0, 0]);
    const big = parts.map(len).indexOf(Math.max(...parts.map(len)));
    const E = o.largest ? dirOf(parts[big], 1) : dirOf(net, 1);
    return { parts, net, E, F: E && (o.negAlong ? E : opp(E)) };
  }
  function fieldSumMake(r) {
    const n = pick(r, [2, 2, 3]), used = new Set(['0,0']), ch = [];
    while (ch.length < n) {
      const c = [Math.floor(r() * 5) - 2, Math.floor(r() * 3) - 1];
      if (!used.has(String(c))) { used.add(String(c)); ch.push({ c, s: pick(r, [1, 1, 2, -1, -1, -2]) }); }
    }
    const E = fieldSumSolve({ ch }).E;
    if (ch.every((x) => !x.c[1]) && r() < 0.6) return null; // fewer with all charges in one row with P
    return E && E !== '0' ? { ch } : null; // the net field along one of the eight directions
  }
  const qName = (s) => `${s > 0 ? '+' : '−'}${Math.abs(s) === 1 ? '' : Math.abs(s)}<tspan font-style="italic">q</tspan>`;
  const qTex = (s) => `${s > 0 ? '+' : '-'}${Math.abs(s) === 1 ? '' : Math.abs(s)}q`;
  // The fields of the charges at P, and their sum. When all lie on one line through P, those of the
  // charges are drawn stacked beside it (as in a line of three charges), so that they do not cover
  // each other and the sum.
  function fieldSumFigure(p, v, view) {
    const flat = p.ch.every((x) => !x.c[1]), upright = p.ch.every((x) => !x.c[0]), s = 90;
    const at = (i) => (flat ? [0, -(i + 1) * 22 / s] : upright ? [(i + 1) * 22 / s, 0] : [0, 0]);
    const off = (F) => (flat ? [F[0] >= 0 ? 8 : -8, 0] : upright ? [8, F[1] >= 0 ? -6 : 14] : undefined);
    return drawing({
      scale: s,
      before: (P) => { P.grid(-2, -1, 2, 1); P.dot([0, 0], 'dot', 3.2); P.text([0, 0], 'P', 'lbl', 'end', [-7, -12]); },
      pts: p.ch.map((x, i) => ({ c: x.c, q: Math.sign(x.s), lab: `${NAMES[i]}: ${qName(x.s)}` })),
      forces: Object.fromEntries([...v.parts.map((E, i) => [`E${i}`, { at: at(i), F: E, lab: sv('E', NAMES[i]), cls: `k-${i + 1}`, off: off(E) }]),
        ['E', { at: [0, 0], F: v.net, lab: sv('E'), cls: 'k-net', off: off(v.net) }], ['F', { at: [0, 0], F: mul(v.net, -1), lab: sv('F'), cls: 'k-h', off: off(mul(v.net, -1)) }]]),
      arrow: 60,
    }, view);
  }
  const fieldSum = {
    id: 'field-sum', difficulty: 3,
    title: () => L('Fields add up', 'Felder addieren sich'),
    make: fieldSumMake,
    solve: fieldSumSolve,
    traps: ['negAlong', 'fieldSign', 'largest'],
    why: {
      fieldSign: () => L('The field of a positive charge points away from it, that of a negative charge towards it.', 'Das Feld einer positiven Ladung zeigt von ihr weg, das einer negativen zu ihr hin.'),
      largest: () => L('That is the field of the strongest charge alone; the others count too.', 'Das ist das Feld der stärksten Ladung allein; die anderen zählen auch.'),
      negAlong: () => L('On a negative charge, the force points against the field.', 'Auf eine negative Ladung zeigt die Kraft entgegen dem Feld.'),
    },
    fields: () => [dirField('E', L('direction of the net field at P', 'Richtung des Gesamtfeldes in P'), DIR_ALL), dirField('F', L('direction of the force on a negative charge at P', 'Richtung der Kraft auf eine negative Ladung in P'), DIR_ALL)],
    text: (p) => L(`The point charges ${p.ch.map((x, i) => `${NAMES[i]} = $${qTex(x.s)}$`).join(', ')} sit on a grid of side d around the point P, as shown. In which direction does their net electric field at P point? A small negative charge is placed at P: in which direction does the force on it point?`,
      `Die Punktladungen ${p.ch.map((x, i) => `${NAMES[i]} = $${qTex(x.s)}$`).join(', ')} sitzen auf einem Gitter mit der Seitenlänge d um den Punkt P, wie abgebildet. In welche Richtung zeigt ihr elektrisches Gesamtfeld in P? Eine kleine negative Ladung wird nach P gebracht: In welche Richtung zeigt die Kraft auf sie?`),
    hints: () => [
      L('The field of each charge at P: away from a positive charge, towards a negative one, of strength E = k|Q|/r².', 'Das Feld jeder Ladung in P: von einer positiven Ladung weg, zu einer negativen hin, mit der Stärke E = k|Q|/r².'),
      L('Add the fields as arrows (by components). The force on a negative charge points against the net field.', 'Addiere die Felder als Pfeile (in Komponenten). Die Kraft auf eine negative Ladung zeigt entgegen dem Gesamtfeld.'),
    ],
    steps: (p, v) => {
      const comp = (x) => (Math.abs(x) < 1e-9 ? '0' : `${sig(x, 3)}\\,E_0`);
      const each = p.ch.map((x, i) => {
        const r2 = x.c[0] ** 2 + x.c[1] ** 2, d = dirOf(v.parts[i], 1);
        return `<li>${L(`${NAMES[i]} ($${qTex(x.s)}$), $r^2 = ${r2}\\,d^2$: $E_${NAMES[i]} = ${sig(Math.abs(x.s) / r2, 3)}\\,E_0$, ${x.s > 0 ? 'away from' : 'towards'} ${NAMES[i]}${d ? ` (${ARROW[d]})` : ''}`,
          `${NAMES[i]} ($${qTex(x.s)}$), $r^2 = ${r2}\\,d^2$: $E_${NAMES[i]} = ${sig(Math.abs(x.s) / r2, 3)}\\,E_0$, ${x.s > 0 ? 'von' : 'zu'} ${NAMES[i]} ${x.s > 0 ? 'weg' : 'hin'}${d ? ` (${ARROW[d]})` : ''}`)}</li>`;
      });
      const parts = v.parts.map((E, i) => `E${i}`);
      return [
        step(L('Each field', 'Jedes Feld'), p$(L('The field of a positive charge points away from it, that of a negative charge towards it. Its strength $E = k\\,|Q|/r^2$, in units of $E_0 = k\\,q/d^2$:', 'Das Feld einer positiven Ladung zeigt von ihr weg, das einer negativen zu ihr hin. Seine Stärke $E = k\\,|Q|/r^2$, in Einheiten von $E_0 = k\\,q/d^2$:')) + `<ul>${each.join('')}</ul>`, parts),
        step(L('Add them', 'Addieren'), p$(L('Add the fields arrow to arrow, or by components:', 'Addiere die Felder Pfeil an Pfeil oder in Komponenten:')) + `$$E_x = ${comp(v.net[0])}, \\qquad E_y = ${comp(v.net[1])}$$` +
          p$(v.E === '0' ? L(`The fields cancel: ${rt('no net field')} at P.`, `Die Felder heben sich auf: ${rt('kein Gesamtfeld')} in P.`) : L(`The net field points ${rt(arrowWord(v.E))}.`, `Das Gesamtfeld zeigt ${rt(arrowWord(v.E))}.`)), [...parts, 'E'], ['E']),
        step(L('The force on a negative charge', 'Die Kraft auf eine negative Ladung'), p$(v.E === '0' ? L(`Without a field there is ${rt('no force')}.`, `Ohne Feld gibt es ${rt('keine Kraft')}.`)
          : L(`$\\vec F = q\\,\\vec E$ with $q < 0$: the force points against the field, ${rt(arrowWord(v.F))}.`, `$\\vec F = q\\,\\vec E$ mit $q < 0$: Die Kraft zeigt entgegen dem Feld, ${rt(arrowWord(v.F))}.`)), ['E', 'F'], ['F']),
      ];
    },
    figure: fieldSumFigure,
  };

  const SCENARIOS = [pairDir, pair, factor, factorMix, factorFind, lineEnd, lineMid, which, whichSquare, rank3, rank4, right, rightDist, zeroLike, zeroUnlike, nudgeAlong, nudgeAcross, fieldForce, fieldSum];
  root.Scenarios = { SCENARIOS, drawing, sv };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
