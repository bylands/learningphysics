// The situations of the app, from the worksheet “Force Vectors” and around it: point charges, the
// Coulomb force between two of them, and the net force of several (superposition). Each situation:
//   { id, difficulty, title(p), make(r) → parameters p, solve(p, o) → values v (SI; with a flag
//     of traps set in o: the result of that wrong idea), traps: [flag], why: { flag: () => text } (what the
//     wrong idea misses, shown in the check), nudge: { flag: () => text } (the feedback in
//     practice instead, where the why would give the answer away),
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
  // nudges after a wrong answer in practice, used by several situations
  const NUDGE = {
    noSquare: () => L('How does the distance enter Coulomb’s law? Check its power.', 'Wie geht der Abstand ins Coulombgesetz ein? Prüfe seine Potenz.'),
    signs: () => L('What signs do the two charges have, and what does that mean for the direction of the force?', 'Welche Vorzeichen haben die beiden Ladungen, und was bedeutet das für die Richtung der Kraft?'),
    negative: () => L('What sign does the charge have, and what does that mean for the direction of the force compared with the field?', 'Welches Vorzeichen hat die Ladung, und was bedeutet das für die Richtung der Kraft im Vergleich zum Feld?'),
  };
  const res = (x) => `\\htmlClass{result}{${x}}`;
  const rt = (x) => `<span class="result">${x}</span>`; // a result in the text
  const num$ = (key, sym, unit, what) => ({ key, type: 'num', sym, unit, what });
  const choice = (key, what, options, want) => ({ key, type: 'choice', what, options, want });
  const dirField = (key, what, dirs) => ({ key, type: 'dir', what, dirs });
  // SVG labels: an italic letter with an upright subscript
  const sv = (l, s = '') => `<tspan font-style="italic">${l}</tspan>${s ? `<tspan class="sub" dy="4">${s}</tspan><tspan dy="-4">\u200b</tspan>` : ''}`;
  const kq = 'k\\,\\frac{|q_A|\\,|q_B|}{r^2}';
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
  // With view.draw (the figure the student draws the forces on, see draw below): no forces, room
  // around the points view.draw.room for the arrows drawn, and the scale (px per unit) noted in
  // view.draw.s.
  function drawing(o, view = {}) {
    const P = new Pic(o.scale, o.label || '');
    if (o.before) o.before(P);
    (o.dims || []).forEach(([a, b, l, off, cls]) => P.dim(a, b, l, off, `dimline${cls ? ` ${cls}` : ''}`));
    o.pts.forEach((pt) => P.charge(pt.c, pt.q, pt.lab, pt.cls || '', pt.off));
    if (view.draw) {
      view.draw.s = o.scale;
      (view.draw.room || []).forEach((c) => { const [x, y] = P.px(c), R = view.draw.R || 125; P.see(x - R, y - R); P.see(x + R, y + R); });
      if (o.after) o.after(P, {});
      return P.svg();
    }
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
      pts: [{ c: a, q: Math.sign(p.q1), lab: o.lab1 || `A: ${qs(p.q1, 'μC')}` }, { c: b, q: Math.sign(o.q2sign != null ? o.q2sign : p.q2), lab: o.lab2 || `B: ${qs(p.q2, 'μC')}` }],
      dims: [[a, b, o.rlab || q(p.r, 'cm'), -26]],
      forces: { F12: { at: b, F: [-at * F, 0], lab: sv('F', 'AB'), cls: 'k-1' }, F21: { at: a, F: [at * F, 0], lab: sv('F', 'BA'), cls: 'k-2' } },
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
    text: (p) => L(`Two small charged spheres A and B carry charges of ${qs(p.q1, 'μC')} and ${qs(p.q2, 'μC')}; their centres are ${q(p.r, 'cm')} apart. How large is the force between them? Do they attract or repel each other?`,
      `Zwei kleine geladene Kugeln A und B tragen die Ladungen ${qs(p.q1, 'μC')} und ${qs(p.q2, 'μC')}; ihre Mittelpunkte sind ${q(p.r, 'cm')} voneinander entfernt. Wie gross ist die Kraft zwischen ihnen? Ziehen sie sich an oder stossen sie sich ab?`),
    hints: (p) => [
      L(`The charges are ${qs(p.q1, 'μC')} and ${qs(p.q2, 'μC')}: the same sign or opposite signs? Like charges repel, unlike charges attract.`, `Die Ladungen sind ${qs(p.q1, 'μC')} und ${qs(p.q2, 'μC')}: gleiches oder entgegengesetztes Vorzeichen? Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an.`),
      L(`The size comes from Coulomb's law, ${m$(`F = ${kq}`)}, with the two charges and their distance of ${q(p.r, 'cm')}: in which units do they go in?`, `Den Betrag gibt das Coulombgesetz, ${m$(`F = ${kq}`)}, mit den beiden Ladungen und ihrem Abstand von ${q(p.r, 'cm')}: In welchen Einheiten setzt du sie ein?`),
      L('Without a calculator: take the charges in μC and the distance in cm, and work out the numbers and the powers of ten separately. The powers of ten of $k$, the two μC and the cm² give together $10$.', 'Ohne Taschenrechner: Nimm die Ladungen in μC und den Abstand in cm, und rechne die Zahlen und die Zehnerpotenzen getrennt aus. Die Zehnerpotenzen von $k$, den beiden μC und den cm² geben zusammen $10$.'),
    ],
    steps: (p, v) => [
      ...pairSteps(p),
      step(L("Coulomb's law", 'Coulombgesetz'), p$(L('Let $q_A$ and $q_B$ be the charges of A and B and $r$ their distance. The force has the size', 'Seien $q_A$ und $q_B$ die Ladungen von A und B und $r$ ihr Abstand. Die Kraft hat den Betrag')) +
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
    nudge: {
      noSquare: () => NUDGE.noSquare(),
      signs: () => NUDGE.signs(),
      third: () => L('Think of Newton’s third law: what holds for the forces that A and B exert on each other?', 'Denk an actio = reactio: Was gilt für die Kräfte, die A und B aufeinander ausüben?'),
    },
    fields: (p) => [dirField('dB', L('direction of the force on B', 'Richtung der Kraft auf B'), DIR_ALL), dirField('dA', L('direction of the force on A', 'Richtung der Kraft auf A'), DIR_ALL),
      p.chg ? choice('size', L(`The force on ${pairDirChange(p).on} is then …`, `Die Kraft auf ${pairDirChange(p).on} ist dann …`), FACTORS(), L(`how the force on ${pairDirChange(p).on} changes`, `wie sich die Kraft auf ${pairDirChange(p).on} ändert`))
        : choice('size', L('Which force is larger?', 'Welche Kraft ist grösser?'), [['A', L('the force on A', 'die Kraft auf A')], ['B', L('the force on B', 'die Kraft auf B')], ['eq', L('both are equally large', 'beide sind gleich gross')]], L('which force is larger', 'welche Kraft grösser ist'))],
    text: (p) => {
      const c = p.chg && pairDirChange(p);
      return L(`Two small charged spheres A and B sit on a grid, as shown. In which direction does the force on B (in the ring) point, and in which the force on A? ${c ? `${c.now}: how does the force on ${c.on} change?` : 'Which of the two forces is larger?'}`,
        `Zwei kleine geladene Kugeln A und B sitzen auf einem Gitter, wie abgebildet. In welche Richtung zeigt die Kraft auf B (im Ring), in welche die Kraft auf A? ${c ? `${c.now}: Wie ändert sich die Kraft auf ${c.on}?` : 'Welche der beiden Kräfte ist grösser?'}`);
    },
    // the situation without the questions (for the check, which asks for one answer)
    situation: () => L('Two small charged spheres A and B sit on a grid, as shown; B is in the ring.', 'Zwei kleine geladene Kugeln A und B sitzen auf einem Gitter, wie abgebildet; B ist im Ring.'),
    hints: (p) => [
      L(`A carries ${qs(p.qa, 'μC')}, B ${qs(p.qb, 'μC')}: do they attract or repel each other? The force on B lies on the grid line through A and B, towards A or away from it.`, `A trägt ${qs(p.qa, 'μC')}, B ${qs(p.qb, 'μC')}: Ziehen sie sich an oder stossen sie sich ab? Die Kraft auf B liegt auf der Gitterlinie durch A und B, zu A hin oder von A weg.`),
      L(`The charges differ (${q(Math.abs(p.qa), 'μC')} and ${q(Math.abs(p.qb), 'μC')}), but the force on A is the reaction to the force on B (Newton’s third law), and both are ${m$('k\\,\\frac{|q_A|\\,|q_B|}{r^2}')}: the same product for both.`, `Die Ladungen sind verschieden (${q(Math.abs(p.qa), 'μC')} und ${q(Math.abs(p.qb), 'μC')}), aber die Kraft auf A ist die Reaktion auf die Kraft auf B (actio = reactio), und beide sind ${m$('k\\,\\frac{|q_A|\\,|q_B|}{r^2}')}: dasselbe Produkt für beide.`),
      ...(p.chg === 'r' ? [L(`Then B moves to ${p.n === 2 ? 'twice' : 'half'} the distance: in ${m$('k\\,|q_A|\\,|q_B|/r^2')} only $r$ changes, and it counts squared.`, `Dann rückt B auf den ${p.n === 2 ? 'doppelten' : 'halben'} Abstand: In ${m$('k\\,|q_A|\\,|q_B|/r^2')} ändert sich nur $r$, und es zählt im Quadrat.`)]
        : p.chg ? [L(`Then the charge of ${p.chg} is ${p.n === 2 ? 'doubled' : 'halved'}, but the question is about the force on ${otherOf(p.chg)}: what happens to the product ${m$('|q_A|\\,|q_B|')}?`, `Dann wird die Ladung von ${p.chg} ${p.n === 2 ? 'verdoppelt' : 'halbiert'}, gefragt ist aber die Kraft auf ${otherOf(p.chg)}: Was geschieht mit dem Produkt ${m$('|q_A|\\,|q_B|')}?`)] : []),
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
    row(0, d0, sv('q', 'A'), sv('q', 'B'), s1, s2, p.before || L('before', 'vorher'), sv('r'));
    const lab = (a, i) => (a === 1 ? sv('q', i) : `${a === 0.5 ? '½' : a}${sv('q', i)}`);
    const n = p.n || 1;
    row(-90, d0 * n, lab(p.a || 1, 'A'), lab(p.b || 1, 'B'), s1, s2, p.after || L('after', 'nachher'), p.rl || (n === 1 ? sv('r') : `${n === 0.5 ? '½' : n === 1 / 3 ? '⅓' : n === 0.25 ? '¼' : n}${sv('r')}`));
    return P.svg();
  }
  const factor = {
    id: 'factor', difficulty: 1,
    title: () => L('Twice as far', 'Doppelt so weit'),
    make: (r) => (r() < 0.6 ? { what: 'r', n: pick(r, [2, 3, 4, 0.5, 1 / 3]), a: 1, b: 1, s1: sign(r), s2: sign(r) } : { what: 'q', n: 1, a: pick(r, [2, 3, 0.5]), b: 1, s1: sign(r), s2: sign(r) }),
    solve: (p, o = {}) => ({ f: o.noSquare ? (p.a * p.b) / p.n : o.wrongWay ? p.a * p.b * p.n ** 2 : (p.a * p.b) / p.n ** 2 }),
    traps: ['noSquare', 'wrongWay'],
    why: { noSquare: () => L('The distance counts squared: 1/r².', 'Der Abstand zählt im Quadrat: 1/r².'), wrongWay: () => L('A larger distance means a smaller force.', 'Ein grösserer Abstand bedeutet eine kleinere Kraft.') },
    nudge: { noSquare: () => NUDGE.noSquare(), wrongWay: () => L('Does the force grow or shrink when the charges move apart?', 'Wird die Kraft grösser oder kleiner, wenn sich die Ladungen voneinander entfernen?') },
    fields: () => [num$('f', "F'/F", '', L('factor', 'Faktor'))],
    text: (p) => (p.what === 'r'
      ? L(`Two point charges exert a force on each other. Their distance is ${DIST[p.n]()}, the charges stay the same. By what factor does the force change? (Give it as a number or a fraction, e.g. 0.25 or 1/4.)`,
        `Zwei Punktladungen üben eine Kraft aufeinander aus. Ihr Abstand wird ${DIST[p.n]()}, die Ladungen bleiben gleich. Um welchen Faktor ändert sich die Kraft? (Gib ihn als Zahl oder Bruch an, z. B. 0.25 oder 1/4.)`)
      : L(`Two point charges exert a force on each other. One of the charges is ${CHG[p.a]()}; the distance stays the same. By what factor does the force change? (Give it as a number or a fraction, e.g. 0.25 or 1/4.)`,
        `Zwei Punktladungen üben eine Kraft aufeinander aus. Eine der Ladungen wird ${CHG[p.a]()}; der Abstand bleibt gleich. Um welchen Faktor ändert sich die Kraft? (Gib ihn als Zahl oder Bruch an, z. B. 0.25 oder 1/4.)`)),
    hints: (p) => (p.what === 'r' ? [
      L(`Only the distance changes, from $r$ to $${ft(p.n)}\\,r$. Does the force grow or shrink, and how does $r$ enter ${m$(`F = ${kq}`)}?`, `Nur der Abstand ändert sich, von $r$ auf $${ft(p.n)}\\,r$. Wird die Kraft grösser oder kleiner, und wie geht $r$ in ${m$(`F = ${kq}`)} ein?`),
      L(`Divide the new force by the old one: in $F'/F$, $k$ and the charges cancel, and only the distance, now $${ft(p.n)}\\,r$, is left.`, `Teile die neue Kraft durch die alte: In $F'/F$ kürzen sich $k$ und die Ladungen, und nur der Abstand, jetzt $${ft(p.n)}\\,r$, bleibt übrig.`),
    ] : [
      L(`Only one charge changes, from $q_A$ to $${ft(p.a)}\\,q_A$; the distance stays. How does a charge enter ${m$(`F = ${kq}`)}?`, `Nur eine Ladung ändert sich, von $q_A$ auf $${ft(p.a)}\\,q_A$; der Abstand bleibt. Wie geht eine Ladung in ${m$(`F = ${kq}`)} ein?`),
      L(`Divide the new force by the old one: in $F'/F$, $k$, $q_B$ and $r$ cancel, and only the changed charge is left.`, `Teile die neue Kraft durch die alte: In $F'/F$ kürzen sich $k$, $q_B$ und $r$, und nur die veränderte Ladung bleibt übrig.`),
    ]),
    steps: (p, v) => {
      const n = ft(p.n, true), a = ft(p.a, true);
      return [step(L('Compare', 'Vergleichen'), p$(L("Let $F$ be the old force and $F'$ the new one. Only what changes is left in the ratio:", "Sei $F$ die alte und $F'$ die neue Kraft. Im Verhältnis bleibt nur, was sich ändert:")) +
        (p.what === 'r'
          ? `$$\\frac{F'}{F} = \\frac{k\\,|q_A|\\,|q_B| / (${n}\\,r)^2}{k\\,|q_A|\\,|q_B| / r^2} = \\frac{1}{${sq(p.n)}} = ${res(ft(v.f))}$$` + p$(L('The force falls with the square of the distance.', 'Die Kraft nimmt mit dem Quadrat des Abstands ab.'))
          : `$$\\frac{F'}{F} = \\frac{k\\,${a}\\,|q_A|\\,|q_B| / r^2}{k\\,|q_A|\\,|q_B| / r^2} = ${res(ft(v.f))}$$` + p$(L('The force is proportional to each charge.', 'Die Kraft ist proportional zu jeder Ladung.'))))];
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
    nudge: { noSquare: () => NUDGE.noSquare(), oneCharge: () => L('Did you take the change of both charges into account?', 'Hast du die Änderung beider Ladungen berücksichtigt?') },
    fields: (p) => [num$('f', "F'/F", '', L('factor', 'Faktor')), num$('F2', "F'", forceUnit(Math.min(p.F, (p.a * p.b * p.F) / p.n ** 2)), L('new force', 'neue Kraft'))],
    text: (p) => {
      const c = (x, i) => (x === 1 ? L(`charge ${i} stays the same`, `Ladung ${i} bleibt gleich`) : L(`charge ${i} is ${CHG[x]()}`, `Ladung ${i} wird ${CHG[x]()}`));
      return L(`Two point charges exert a force of ${q(p.F, 'N')} on each other. Now ${c(p.a, 'A')}, ${c(p.b, 'B')}, and their distance is ${DIST[p.n]()}. By what factor does the force change, and how large is it now?`,
        `Zwei Punktladungen üben eine Kraft von ${q(p.F, 'N')} aufeinander aus. Nun ${c(p.a, 'A').replace(/^Ladung ([AB]) (bleibt|wird)/, '$2 Ladung $1')}, ${c(p.b, 'B')}, und ihr Abstand wird ${DIST[p.n]()}. Um welchen Faktor ändert sich die Kraft, und wie gross ist sie jetzt?`);
    },
    situation: (p) => {
      const c = (x, i) => (x === 1 ? L(`charge ${i} stays the same`, `Ladung ${i} bleibt gleich`) : L(`charge ${i} is ${CHG[x]()}`, `Ladung ${i} wird ${CHG[x]()}`));
      return L(`Two point charges exert a force of ${q(p.F, 'N')} on each other. Now ${c(p.a, 'A')}, ${c(p.b, 'B')}, and their distance is ${DIST[p.n]()}.`,
        `Zwei Punktladungen üben eine Kraft von ${q(p.F, 'N')} aufeinander aus. Nun ${c(p.a, 'A').replace(/^Ladung ([AB]) (bleibt|wird)/, '$2 Ladung $1')}, ${c(p.b, 'B')}, und ihr Abstand wird ${DIST[p.n]()}.`);
    },
    hints: (p) => [
      L(`Three changes, each with its own factor for the force: $q_A$ times $${ft(p.a)}$, $q_B$ times $${ft(p.b)}$, the distance $r$ times $${ft(p.n)}$.`, `Drei Änderungen, jede mit ihrem eigenen Faktor für die Kraft: $q_A$ mal $${ft(p.a)}$, $q_B$ mal $${ft(p.b)}$, der Abstand $r$ mal $${ft(p.n)}$.`),
      L(`The charges count directly, the distance squared and in the denominator. Multiply the three factors, then the old force, ${q(p.F, 'N')}, by the result.`, `Die Ladungen zählen direkt, der Abstand im Quadrat und im Nenner. Multipliziere die drei Faktoren und dann die alte Kraft, ${q(p.F, 'N')}, mit dem Resultat.`),
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
    nudge: {
      noRoot: () => L('You took the factor of the force for the distance. How does the force depend on the distance?', 'Du hast den Faktor der Kraft für den Abstand genommen. Wie hängt die Kraft vom Abstand ab?'),
      wrongWay: () => L('For this force, must the charges come closer or move apart?', 'Müssen die Ladungen für diese Kraft näher zusammen oder weiter auseinander?'),
    },
    fields: () => [num$('n', "r'/r", '', L('factor for the distance', 'Faktor für den Abstand')), num$('r2', "r'", 'cm', L('new distance', 'neuer Abstand'))],
    text: (p) => L(`Two point charges ${q(p.r0, 'cm')} apart exert a force of ${q(p.F, 'N')} on each other. At what distance is the force between them ${q(p.F * p.m, 'N')}? By what factor must their distance change?`,
      `Zwei Punktladungen im Abstand ${q(p.r0, 'cm')} üben eine Kraft von ${q(p.F, 'N')} aufeinander aus. In welchem Abstand beträgt die Kraft zwischen ihnen ${q(p.F * p.m, 'N')}? Um welchen Faktor muss sich ihr Abstand ändern?`),
    situation: (p) => L(`Two point charges ${q(p.r0, 'cm')} apart exert a force of ${q(p.F, 'N')} on each other. Their distance is changed so that the force between them is ${q(p.F * p.m, 'N')}.`,
      `Zwei Punktladungen im Abstand ${q(p.r0, 'cm')} üben eine Kraft von ${q(p.F, 'N')} aufeinander aus. Ihr Abstand wird so geändert, dass die Kraft zwischen ihnen ${q(p.F * p.m, 'N')} beträgt.`),
    hints: (p) => [
      L(`Compare the forces first: from ${q(p.F, 'N')} to ${q(p.F * p.m, 'N')}, by what factor does the force change? ${p.m > 1 ? 'A larger force: must the charges come closer or move apart?' : 'A smaller force: must the charges come closer or move apart?'}`, `Vergleiche zuerst die Kräfte: Von ${q(p.F, 'N')} auf ${q(p.F * p.m, 'N')}, um welchen Faktor ändert sich die Kraft? ${p.m > 1 ? 'Eine grössere Kraft: Müssen die Ladungen näher zusammen oder weiter auseinander?' : 'Eine kleinere Kraft: Müssen die Ladungen näher zusammen oder weiter auseinander?'}`),
      L(`If the distance changes by the factor $n = r'/r$, the force changes by $1/n^2$. Set $1/n^2$ equal to the factor of the force, solve for $n$, and multiply ${q(p.r0, 'cm')} by it.`, `Ändert sich der Abstand um den Faktor $n = r'/r$, ändert sich die Kraft um $1/n^2$. Setze $1/n^2$ gleich dem Faktor der Kraft, löse nach $n$ auf und multipliziere ${q(p.r0, 'cm')} damit.`),
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
  // the hints: where A and B sit, the two sizes set up in units of F₀, the size of A's force worked out
  const lineHints = (p, v) => {
    const at = (k, qi, xi, sits) => L(`${k} ($${qT(qi)}$)${sits ? ' sits' : ''} $${dT(xi)}$ to its ${xi > 0 ? 'right' : 'left'}`, `${k} ($${qT(qi)}$)${sits ? ' sitzt' : ''} $${dT(xi)}$ ${xi > 0 ? 'rechts' : 'links'} davon`);
    const aq = Math.abs(p.qa), aSays = L(`A carries ${aq === 1 ? 'as much charge as' : `${aq} times as much charge as`} the charge in the ring and sits at the distance $${dT(p.xa)}$`,
      `A trägt ${aq === 1 ? 'gleich viel Ladung wie' : `${aq}-mal so viel Ladung wie`} die Ladung im Ring und sitzt im Abstand $${dT(p.xa)}$`);
    return [
      L(`The charge in the ring is $${qT(p.t)}$; ${at('A', p.qa, p.xa, true)}, ${at('B', p.qb, p.xb)}. For A and B each on its own: the same sign as the charge in the ring or the opposite sign, so a push away from it or a pull towards it?`,
        `Die Ladung im Ring ist $${qT(p.t)}$; ${at('A', p.qa, p.xa, true)}, ${at('B', p.qb, p.xb)}. Für A und B je für sich: das gleiche Vorzeichen wie die Ladung im Ring oder das entgegengesetzte, also ein Stoss von ihr weg oder ein Zug zu ihr hin?`),
      L('Compare the sizes with Coulomb’s law $F = k\\,|q|\\,|Q|/r^2$, in units of $F_0 = k\\,q^2/d^2$: which multiple of $q$ and which multiple of $d$ go in for A, and which for B?', 'Vergleiche die Beträge mit dem Coulombgesetz $F = k\\,|q|\\,|Q|/r^2$, in Einheiten von $F_0 = k\\,q^2/d^2$: Welches Vielfache von $q$ und welches Vielfache von $d$ setzt du für A ein, welche für B?'),
      L(`${aSays}: its force is $${fracF0(Math.abs(v.Fa)).replace(/^\\,/, '')}$. Work out the force of B the same way, then add the two forces with signs, the right taken as positive.`, `${aSays}: Ihre Kraft ist $${fracF0(Math.abs(v.Fa)).replace(/^\\,/, '')}$. Berechne die Kraft von B ebenso und addiere dann die beiden Kräfte mit Vorzeichen, nach rechts positiv.`),
    ];
  };
  const lineWhy = {
    signs: () => L('Like charges repel, unlike charges attract.', 'Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an.'),
    noSquare: () => L('The distance counts squared: at twice the distance a quarter of the force.', 'Der Abstand zählt im Quadrat: im doppelten Abstand ein Viertel der Kraft.'),
    sameDist: () => L('Measure each distance from the charge the force acts on.', 'Miss jeden Abstand von der Ladung aus, auf die die Kraft wirkt.'),
  };
  const lineNudge = {
    signs: () => NUDGE.signs(),
    noSquare: () => L('How quickly does the force fall off with the distance? Compare the two forces again.', 'Wie stark nimmt die Kraft mit dem Abstand ab? Vergleiche die beiden Kräfte nochmals.'),
  };
  const lineEnd = { id: 'line-end', difficulty: 2, title: () => L('Three charges in a line', 'Drei Ladungen auf einer Geraden'), make: (r) => lineMake(r, false), solve: lineSolve, traps: ['signs', 'noSquare', 'sameDist'], why: lineWhy, nudge: lineNudge, fields: lineFields, text: lineText, hints: lineHints, steps: lineSteps, figure: lineFigure };
  const lineMid = { ...lineEnd, id: 'line-mid', difficulty: 3, title: () => L('A charge in the middle', 'Eine Ladung in der Mitte'), make: (r) => lineMake(r, true), traps: ['signs', 'noSquare'] };

  // ---------------------------------------------------------------- 4 which way? (equal charges)
  const LETTERS = ['A', 'B', 'C', 'D'];
  const rot = (c, k) => { let [x, y] = c; for (let i = 0; i < k; i++) [x, y] = [-y, x]; return [x, y]; };
  // charges of equal size q at points in units of d; the target is the first, the others A, B, …
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
      pts: p.pts.map((pt, i) => ({ c: pt.c, q: pt.s, lab: `${i ? `${LETTERS[i - 1]}: ` : ''}${pt.s > 0 ? '+' : '−'}<tspan font-style="italic">q</tspan>`, cls: i ? '' : 'hl', off: pt.off })),
      forces: Object.fromEntries([...v.Fs.map((F, i) => [`F${i + 1}`, { at: p.pts[0].c, F, lab: sv('F', LETTERS[i]), cls: `k-${(i % 3) + 1}` }]), ['F', { at: p.pts[0].c, F: v.net, lab: sv('F'), cls: 'k-net' }]]),
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
  // the hints: the signs of this exercise's charges, then their distances (d or the diagonal) and the
  // pairs opposite each other across the charge in the ring
  const whichHints = (p) => {
    const t = p.pts[0], others = p.pts.slice(1), n = others.length, rel = others.map((o) => sub(o.c, t.c)), dist = rel.map(len);
    const one = (k) => ({ 1: L('one', 'eine'), 2: L('two', 'zwei'), 3: L('three', 'drei'), 4: L('four', 'vier') }[k]);
    const pos = others.filter((o) => o.s > 0).length, cap = (x) => `${x[0].toUpperCase()}${x.slice(1)}`;
    const signs = pos === n || !pos ? L(`the other ${word(n)} are ${n === 2 ? 'both' : 'all'} $${pos ? '+' : '-'}q$`, `die anderen ${word(n)} sind ${n === 2 ? 'beide' : 'alle'} $${pos ? '+' : '-'}q$`)
      : L(`of the other ${word(n)}, ${one(pos)} ${pos === 1 ? 'is' : 'are'} $+q$ and ${one(n - pos)} ${n - pos === 1 ? 'is' : 'are'} $-q$`, `von den anderen ${word(n)} ${pos === 1 ? 'ist' : 'sind'} ${one(pos)} $+q$ und ${one(n - pos)} $-q$`);
    const near = dist.filter((x) => Math.abs(x - Math.min(...dist)) < 1e-9).length;
    const sizes = near === n
      ? L(`${n === 2 ? 'Both' : `All ${word(n)}`} are equally far from it: their forces have the same size.`, `${n === 2 ? 'Beide' : `Alle ${word(n)}`} sind gleich weit von ihr entfernt: Ihre Kräfte haben den gleichen Betrag.`)
      : L(`${cap(one(near))} of them ${near === 1 ? 'is' : 'are'} at the distance $d$ (force $F_0 = k\\,q^2/d^2$), ${one(n - near)} on a diagonal at $\\sqrt{2}\\,d$ (half that force, $F_0/2$).`,
        `${cap(one(near))} davon ${near === 1 ? 'ist' : 'sind'} im Abstand $d$ (Kraft $F_0 = k\\,q^2/d^2$), ${one(n - near)} auf einer Diagonalen im Abstand $\\sqrt{2}\\,d$ (halb so viel Kraft, $F_0/2$).`);
    const pairs = rel.flatMap((a, i) => rel.slice(i + 1).filter((b) => len(add(a, b)) < 1e-9).map(() => 1)).length;
    const sym = pairs
      ? L(`${pairs === 1 ? 'Two of them sit' : 'Two pairs of them sit'} opposite each other across the charge in the ring: with the same sign, such a pair’s forces cancel; with opposite signs, they add up.`, `${pairs === 1 ? 'Zwei davon sitzen' : 'Zwei Paare davon sitzen'} einander gegenüber, auf beiden Seiten der Ladung im Ring: Bei gleichem Vorzeichen heben sich die Kräfte eines solchen Paars auf, bei entgegengesetztem addieren sie sich.`)
      : L('Add the forces tip to tail, or by components: which components cancel by symmetry?', 'Addiere die Kräfte Pfeil an Pfeil oder in Komponenten: Welche Komponenten heben sich aus Symmetriegründen auf?');
    return [
      L(`The charge in the ring is $${t.s > 0 ? '+' : '-'}q$; ${signs}. Which of them push it away, which pull it towards them? Each force lies on the line to that charge.`,
        `Die Ladung im Ring ist $${t.s > 0 ? '+' : '-'}q$; ${signs}. Welche davon stossen sie weg, welche ziehen sie zu sich hin? Jede Kraft liegt auf der Geraden zu dieser Ladung.`),
      `${sizes} ${sym}`,
    ];
  };
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
    // the hints: the signs, then the two sizes in each arrangement, then the angle between the two
    // forces in each (the net forces are left to the student)
    hints: (p) => {
      const others = p.s[0] !== p.s[1] ? L('of the other two, one is $+q$ and one $-q$', 'von den anderen beiden ist eine $+q$ und eine $-q$') : L(`the other two are both $${p.s[0] > 0 ? '+' : '-'}q$`, `die anderen beiden sind beide $${p.s[0] > 0 ? '+' : '-'}q$`);
      const size = (c) => ({ 1: 'F_0', 2: '\\tfrac{1}{2}F_0', 4: '\\tfrac{1}{4}F_0' }[Math.round(c[0] ** 2 + c[1] ** 2)]);
      const angle = (k) => {
        const [a, b] = ARR[k].map((c, i) => force(1, [0, 0], p.s[i], c)), cos = (a[0] * b[0] + a[1] * b[1]) / len(a) / len(b), deg = Math.round((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
        return deg === 0 ? L('0°, the same way', '0°, in dieselbe Richtung') : deg === 180 ? L('180°, opposite', '180°, entgegengesetzt') : `${deg}°`;
      };
      const list = (f) => p.keys.map((k, i) => `${LETTERS[i]}: ${f(k)}`).join('; ');
      return [
        L(`The charge in the ring is $+q$; ${others}. In each arrangement, does each of them push it away or pull it towards itself, and how far away is it ($d$, $2d$ or the diagonal $\\sqrt{2}\\,d$)?`,
          `Die Ladung im Ring ist $+q$; ${others}. Wird sie in jeder Anordnung von jeder der beiden weggestossen oder angezogen, und wie weit ist diese entfernt ($d$, $2d$ oder die Diagonale $\\sqrt{2}\\,d$)?`),
        L(`The two forces in units of $F_0 = k\\,q^2/d^2$ (at $2d$ a quarter, at $\\sqrt{2}\\,d$ half): ${list((k) => `$${ARR[k].map(size).join('$ and $')}$`)}.`,
          `Die beiden Kräfte in Einheiten von $F_0 = k\\,q^2/d^2$ (in $2d$ ein Viertel, in $\\sqrt{2}\\,d$ die Hälfte): ${list((k) => `$${ARR[k].map(size).join('$ und $')}$`)}.`),
        L(`The angle between the two forces: ${list(angle)}. Add them as arrows in each arrangement: same way the sum, opposite ways the difference, at 90° Pythagoras.`,
          `Der Winkel zwischen den beiden Kräften: ${list(angle)}. Addiere sie in jeder Anordnung als Pfeile: in dieselbe Richtung die Summe, entgegengesetzt die Differenz, unter 90° Pythagoras.`),
      ];
    },
    steps: rankSteps,
    figure: rankFigure,
  };
  const rank4 = { ...rank3, id: 'rank4', difficulty: 4, make: (r) => rankMake(r, 4) };

  // ---------------------------------------------------------------- 6 at a right angle
  // The force F1 of charge A is given; that of charge B follows from the ratio of the charges and the
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
      pts: [{ c: [0, 0], q: Math.sign(p.t), lab: qs(p.t, 'μC'), cls: 'hl', off: [-Math.sign(v.f1[0]) * 14, Math.sign(v.f2[1]) * 22] }, { c: [p.x1, 0], q: Math.sign(p.q1), lab: `A: ${qs(p.q1, 'μC')}` }, { c: [0, p.y2], q: Math.sign(p.q2), lab: `B: ${qs(p.q2, 'μC')}`, off: [14, 0] }],
      dims: [[[0, 0], [p.x1, 0], q(Math.abs(p.x1), 'cm'), -Math.sign(v.f2[1]) * Math.sign(p.x1) * 44], [[0, 0], [0, p.y2], q(Math.abs(p.y2), 'cm'), Math.sign(v.f1[0]) * Math.sign(p.y2) * 48]],
      forces: { F1: { at: [0, 0], F: v.f1, lab: sv('F', 'A'), cls: 'k-1' }, F2: { at: [0, 0], F: v.f2, lab: sv('F', 'B'), cls: 'k-2' }, F: { at: [0, 0], F: v.net, lab: sv('F'), cls: 'k-net' } },
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
    nudge: { sum: () => L('You added the sizes as numbers. How do two forces at a right angle add up?', 'Du hast die Beträge als Zahlen addiert. Wie addieren sich zwei Kräfte, die senkrecht aufeinander stehen?') },
    fields: () => [num$('F2', 'F_B', 'N', L('force of charge B', 'Kraft von Ladung B')), num$('F', 'F', 'N', L('size of the net force', 'Betrag der resultierenden Kraft')), dirField('dir', L('direction', 'Richtung'), ['NE', 'NW', 'SW', 'SE'])],
    text: (p) => {
      const same = Math.abs(Math.abs(p.x1) - Math.abs(p.y2)) < 1e-9;
      return L(`A charge of ${qs(p.t, 'μC')} sits at the corner of a right angle; charge A (${qs(p.q1, 'μC')}) and charge B (${qs(p.q2, 'μC')}) lie on the two sides, ${same ? 'both at the same distance' : 'at different distances'}, as shown. Charge A exerts a force of ${q(p.F1, 'N')} on the charge in the corner. How large is the force of charge B on it? How large is the net force, and roughly where does it point?`,
        `Eine Ladung von ${qs(p.t, 'μC')} sitzt in der Ecke eines rechten Winkels; Ladung A (${qs(p.q1, 'μC')}) und Ladung B (${qs(p.q2, 'μC')}) liegen auf den beiden Schenkeln, ${same ? 'beide im gleichen Abstand' : 'in verschiedenen Abständen'}, wie abgebildet. Ladung A übt auf die Ladung in der Ecke eine Kraft von ${q(p.F1, 'N')} aus. Wie gross ist die Kraft von Ladung B auf sie? Wie gross ist die resultierende Kraft, und ungefähr wohin zeigt sie?`);
    },
    situation: (p) => {
      const same = Math.abs(Math.abs(p.x1) - Math.abs(p.y2)) < 1e-9;
      return L(`A charge of ${qs(p.t, 'μC')} sits at the corner of a right angle; charge A (${qs(p.q1, 'μC')}) and charge B (${qs(p.q2, 'μC')}) lie on the two sides, ${same ? 'both at the same distance' : 'at different distances'}, as shown. Charge A exerts a force of ${q(p.F1, 'N')} on the charge in the corner.`,
        `Eine Ladung von ${qs(p.t, 'μC')} sitzt in der Ecke eines rechten Winkels; Ladung A (${qs(p.q1, 'μC')}) und Ladung B (${qs(p.q2, 'μC')}) liegen auf den beiden Schenkeln, ${same ? 'beide im gleichen Abstand' : 'in verschiedenen Abständen'}, wie abgebildet. Ladung A übt auf die Ladung in der Ecke eine Kraft von ${q(p.F1, 'N')} aus.`);
    },
    // the hints: the two charges and distances seen from the corner, the ratio of the forces, then the
    // directions and the diagonal
    hints: (p) => {
      const same = Math.abs(Math.abs(p.x1) - Math.abs(p.y2)) < 1e-9;
      return [
        L(`Seen from the corner (${qs(p.t, 'μC')}): charge A is ${qs(p.q1, 'μC')} at ${q(Math.abs(p.x1), 'cm')}, charge B is ${qs(p.q2, 'μC')} at ${q(Math.abs(p.y2), 'cm')}. Charge A pushes or pulls with ${q(p.F1, 'N')}. ${same ? 'The distances are the same: what differs?' : 'What differs between the two: the charge, the distance, or both?'}`,
          `Von der Ecke aus (${qs(p.t, 'μC')}): Ladung A ist ${qs(p.q1, 'μC')} im Abstand ${q(Math.abs(p.x1), 'cm')}, Ladung B ist ${qs(p.q2, 'μC')} im Abstand ${q(Math.abs(p.y2), 'cm')}. Ladung A stösst oder zieht mit ${q(p.F1, 'N')}. ${same ? 'Die Abstände sind gleich: Was ist verschieden?' : 'Was ist bei den beiden verschieden: die Ladung, der Abstand oder beides?'}`),
        L(`Coulomb’s law ${m$('F = k\\,|q|\\,|Q|/r^2')}: in the ratio ${m$('F_B/F_A')}, k and the charge in the corner cancel. ${same ? 'Only the ratio of the charges is left.' : 'The ratio of the charges is left, and that of the distances, squared and upside down.'} Multiply ${m$('F_A')} by it.`,
          `Coulombgesetz ${m$('F = k\\,|q|\\,|Q|/r^2')}: Im Verhältnis ${m$('F_B/F_A')} kürzen sich k und die Ladung in der Ecke. ${same ? 'Es bleibt nur das Verhältnis der Ladungen.' : 'Es bleiben das Verhältnis der Ladungen und das der Abstände, im Quadrat und umgekehrt.'} Multipliziere ${m$('F_A')} damit.`),
        L(`Is the corner charge pulled towards charge A or pushed away from it, and from charge B? One force is horizontal, the other vertical: the net force is the diagonal of their rectangle, ${m$('F = \\sqrt{F_A^2 + F_B^2}')}.`,
          `Wird die Ladung in der Ecke zu Ladung A hingezogen oder von ihr weggestossen, und bei Ladung B? Eine Kraft ist horizontal, die andere vertikal: Die resultierende Kraft ist die Diagonale ihres Rechtecks, ${m$('F = \\sqrt{F_A^2 + F_B^2}')}.`),
      ];
    },
    steps: (p, v) => {
      const a = Math.round(Math.abs(p.x1) * 100), b = Math.round(Math.abs(p.y2) * 100), q1 = Math.round(Math.abs(p.q1) * 1e6), q2 = Math.round(Math.abs(p.q2) * 1e6);
      const dist = a === b ? '' : `\\cdot\\left(\\frac{${a}}{${b}}\\right)^2`;
      const pull = (qi) => (p.t * qi < 0 ? L('attracts', 'zieht … an') : L('repels', 'stösst … ab'));
      const tri = TRIPLES.find(([A, B]) => Math.abs(v.F2 / v.F1 - B / A) < 1e-9);
      return [
        step(L('The force of charge B', 'Die Kraft von Ladung B'), p$(L(`Compare it with that of charge A: the force is proportional to the charge${a === b ? ', and the distances are the same' : ' and to 1/r²'}; k and the charge in the corner cancel.`, `Vergleiche sie mit der von Ladung A: Die Kraft ist proportional zur Ladung${a === b ? ', und die Abstände sind gleich' : ' und zu 1/r²'}; k und die Ladung in der Ecke kürzen sich.`)) +
          `$$\\frac{F_B}{F_A} = \\frac{${q2}}{${q1}}${dist} = ${ft(v.ratio)} \\;\\Rightarrow\\; F_B = ${ft(v.ratio)}\\cdot ${tq(v.F1, 'N')} = ${res(tq(v.F2, 'N'))}$$`, ['F2'], ['F2']),
        step(L('The directions', 'Die Richtungen'), p$(L(`Charge A ${pull(p.q1)} the charge in the corner: its force points ${arrowWord(v.f1[0] > 0 ? 'E' : 'W')}. Charge B ${pull(p.q2)} it: its force points ${arrowWord(v.f2[1] > 0 ? 'N' : 'S')}.`,
          `Ladung A ${pull(p.q1).replace(' … ', ' die Ladung in der Ecke ')}: Ihre Kraft zeigt ${arrowWord(v.f1[0] > 0 ? 'E' : 'W')}. Ladung B ${pull(p.q2).replace(' … ', ' sie ')}: Ihre Kraft zeigt ${arrowWord(v.f2[1] > 0 ? 'N' : 'S')}.`)), ['F1', 'F2']),
        step(L('The net force', 'Die resultierende Kraft'), p$(L('The forces are perpendicular: the net force is the diagonal of the rectangle they span.', 'Die Kräfte stehen senkrecht aufeinander: Die resultierende Kraft ist die Diagonale des Rechtecks, das sie aufspannen.')) +
          `$$F = \\sqrt{F_A^2 + F_B^2} = \\sqrt{(${tq(v.F1, 'N')})^2 + (${tq(v.F2, 'N')})^2} = \\sqrt{${tnum(v.F1 ** 2)} + ${tnum(v.F2 ** 2)}}\\,\\mathrm{N} = ${res(tq(v.F, 'N'))}$$` +
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
      pts: [{ c: [0, 0], q: Math.sign(p.q1), lab: `A: ${qs(p.q1, 'μC')}` }, { c: [p.d, 0], q: Math.sign(p.q2), lab: `B: ${qs(p.q2, 'μC')}` }, { c: [pos, 0], q: 0, lab: L('here', 'hier'), cls: `hl ${hide}` }],
      dims: [[[0, 0], [p.d, 0], q(p.d, 'cm'), -26], [[Math.min(pos, p.like || v.small === 1 ? 0 : p.d), 0], [Math.max(pos, p.like || v.small === 1 ? 0 : p.d), 0], q(v.x, 'cm'), -56, hide]],
      before: (P) => { P.line([minX - 0.1 * (maxX - minX), 0], [maxX + 0.1 * (maxX - minX), 0], 'w thin dashed'); },
    }, view);
  }
  const zeroRegions = () => [['left', L('left of A', 'links von A')], ['between', L('between the charges', 'zwischen den Ladungen')], ['right', L('right of B', 'rechts von B')]];
  const zeroLike = {
    id: 'zero-like', difficulty: 3,
    title: () => L('Where is the force zero?', 'Wo ist die Kraft null?'),
    make: (r) => zeroMake(r, true),
    solve: zeroSolve,
    traps: ['noRoot', 'other'],
    why: { noRoot: () => L('The forces go with 1/r²: the distances are in the ratio of the square roots of the charges.', 'Die Kräfte gehen mit 1/r²: Die Abstände stehen im Verhältnis der Wurzeln der Ladungen.'), other: () => L('That is the distance from B; the question asks for the distance from A.', 'Das ist der Abstand von B; gefragt ist der Abstand von A.') },
    nudge: { noRoot: () => L('Set the two forces equal: how do the distances enter the forces?', 'Setze die beiden Kräfte gleich: Wie gehen die Abstände in die Kräfte ein?') },
    fields: () => [choice('region', L('The point lies …', 'Der Punkt liegt …'), zeroRegions(), L('where the point lies', 'wo der Punkt liegt')), num$('x', 'x', 'cm', L('distance from A', 'Abstand von A'))],
    text: (p) => L(`Two point charges A (${qs(p.q1, 'μC')}) and B (${qs(p.q2, 'μC')}) are ${q(p.d, 'cm')} apart. At which point on the line through them does a third charge feel no net force? Give the region and the distance from A.`,
      `Zwei Punktladungen A (${qs(p.q1, 'μC')}) und B (${qs(p.q2, 'μC')}) sind ${q(p.d, 'cm')} voneinander entfernt. An welchem Punkt auf der Geraden durch sie spürt eine dritte Ladung keine resultierende Kraft? Gib den Bereich und den Abstand von A an.`),
    situation: (p) => L(`Two point charges A (${qs(p.q1, 'μC')}) and B (${qs(p.q2, 'μC')}) are ${q(p.d, 'cm')} apart. At one point on the line through them, a third charge feels no net force.`,
      `Zwei Punktladungen A (${qs(p.q1, 'μC')}) und B (${qs(p.q2, 'μC')}) sind ${q(p.d, 'cm')} voneinander entfernt. In einem Punkt auf der Geraden durch sie spürt eine dritte Ladung keine resultierende Kraft.`),
    // the hints: the signs of this pair and where the forces can cancel, the equal sizes, then the
    // ratio of the distances from that of the charges
    hints: (p) => {
      const a = Math.abs(p.q1), b = Math.abs(p.q2);
      return [
        L(`${qs(p.q1, 'μC')} and ${qs(p.q2, 'μC')} have ${p.like ? 'the same sign' : 'opposite signs'}. Left of A, between the charges, right of B: where do their forces on a third charge point in opposite directions? And nearer which charge must the point be for the two forces to be equally large?`,
          `${qs(p.q1, 'μC')} und ${qs(p.q2, 'μC')} haben ${p.like ? 'das gleiche Vorzeichen' : 'entgegengesetzte Vorzeichen'}. Links von A, zwischen den Ladungen, rechts von B: Wo zeigen ihre Kräfte auf eine dritte Ladung in entgegengesetzte Richtungen? Und näher bei welcher Ladung muss der Punkt sein, damit die beiden Kräfte gleich gross sind?`),
        L(`Set the two forces of Coulomb’s law equal, ${m$('k\\,\\frac{|q|\\,|q_A|}{r_A^2} = k\\,\\frac{|q|\\,|q_B|}{r_B^2}')}, with ${m$('r_A')} and ${m$('r_B')} the distances of the point from A and B: k and the third charge q cancel.`,
          `Setze die beiden Kräfte aus dem Coulombgesetz gleich, ${m$('k\\,\\frac{|q|\\,|q_A|}{r_A^2} = k\\,\\frac{|q|\\,|q_B|}{r_B^2}')}, mit ${m$('r_A')} und ${m$('r_B')} den Abständen des Punkts von A und B: k und die dritte Ladung q kürzen sich.`),
        L(`Take the square root: $q_B$ is ${m$(ft(b / a, true))} times $q_A$ in size, so ${m$('r_B')} is ${m$(ft(Math.sqrt(b / a), true))} times ${m$('r_A')}. Combine that with the ${q(p.d, 'cm')} between the charges.`,
          `Zieh die Wurzel: $q_B$ ist betragsmässig ${m$(ft(b / a, true))}-mal $q_A$, also ist ${m$('r_B')} ${m$(ft(Math.sqrt(b / a), true))}-mal ${m$('r_A')}. Verbinde das mit den ${q(p.d, 'cm')} zwischen den Ladungen.`),
      ];
    },
    steps: (p, v) => {
      const a = Math.abs(p.q1), b = Math.abs(p.q2);
      return [
        step(L('Where?', 'Wo?'), p$(L('Like charges push (or pull) a third charge in the same way. Between them, their forces point in opposite directions; outside, in the same direction. So the point lies between them, nearer the smaller charge.', 'Gleichnamige Ladungen stossen (oder ziehen) eine dritte Ladung gleich. Zwischen ihnen zeigen ihre Kräfte in entgegengesetzte Richtungen, ausserhalb in dieselbe. Der Punkt liegt also zwischen ihnen, näher bei der kleineren Ladung.'))),
        step(L('Equal forces', 'Gleiche Kräfte'), p$(L('Let $x$ be the distance from A and $d$ the distance between the charges. The forces on a third charge $q$ are equal:', 'Sei $x$ der Abstand von A und $d$ der Abstand der Ladungen. Die Kräfte auf eine dritte Ladung $q$ sind gleich:')) +
          `$$k\\,\\frac{|q|\\,|q_A|}{x^2} = k\\,\\frac{|q|\\,|q_B|}{(d - x)^2} \\;\\Rightarrow\\; \\frac{d - x}{x} = \\sqrt{\\frac{|q_B|}{|q_A|}} \\;\\Rightarrow\\; x = \\frac{d}{1 + \\sqrt{|q_B|/|q_A|}}$$`, ['P']),
        step(L('The numbers', 'Die Zahlen'), `$$x = \\frac{${tq(p.d, 'cm')}}{1 + \\sqrt{${sig(b / a, 4)}}} = ${res(tq(v.x, 'cm'))}$$` + p$(L(`The point lies ${rt(L('between the charges', 'zwischen den Ladungen'))}, ${q(v.x, 'cm')} from A.`, `Der Punkt liegt ${rt('zwischen den Ladungen')}, ${q(v.x, 'cm')} von A entfernt.`)), ['P']),
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
    nudge: {
      noRoot: () => L('Set the two forces equal: how do the distances enter the forces?', 'Setze die beiden Kräfte gleich: Wie gehen die Abstände in die Kräfte ein?'),
      between: () => L('Which way do the two forces point on a charge between unlike charges? Can they cancel there?', 'In welche Richtungen zeigen die beiden Kräfte auf eine Ladung zwischen ungleichnamigen Ladungen? Können sie sich dort aufheben?'),
    },
    fields: () => [choice('region', L('The point lies …', 'Der Punkt liegt …'), zeroRegions(), L('where the point lies', 'wo der Punkt liegt')), num$('x', 'x', 'cm', L('distance from the nearer charge', 'Abstand von der näheren Ladung'))],
    text: (p) => L(`Two point charges A (${qs(p.q1, 'μC')}) and B (${qs(p.q2, 'μC')}) are ${q(p.d, 'cm')} apart. At which point on the line through them does a third charge feel no net force? Give the region and the distance from the nearer of the two charges.`,
      `Zwei Punktladungen A (${qs(p.q1, 'μC')}) und B (${qs(p.q2, 'μC')}) sind ${q(p.d, 'cm')} voneinander entfernt. An welchem Punkt auf der Geraden durch sie spürt eine dritte Ladung keine resultierende Kraft? Gib den Bereich und den Abstand von der näheren der beiden Ladungen an.`),
    steps: (p, v) => {
      const a = Math.abs(p.q1), b = Math.abs(p.q2), sm = v.small === 1 ? 'q_A' : 'q_B', bg = v.small === 1 ? 'q_B' : 'q_A', ratio = sig(Math.max(a, b) / Math.min(a, b), 4);
      return [
        step(L('Where?', 'Wo?'), p$(L(`Unlike charges: one pushes, the other pulls a third charge. Between them, both forces point the same way. Outside, they point in opposite directions, and they can be equal only near the smaller charge $${sm}$, where its smaller charge is made up for by the shorter distance.`,
          `Ungleichnamige Ladungen: Die eine stösst, die andere zieht eine dritte Ladung. Zwischen ihnen zeigen beide Kräfte in dieselbe Richtung. Ausserhalb zeigen sie in entgegengesetzte Richtungen, und gleich gross können sie nur nahe bei der kleineren Ladung $${sm}$ sein, wo ihre kleinere Ladung durch den kürzeren Abstand ausgeglichen wird.`))),
        step(L('Equal forces', 'Gleiche Kräfte'), p$(L(`Let $x$ be the distance from $${sm}$ and $d$ the distance between the charges; $${bg}$ is then $d + x$ away:`, `Sei $x$ der Abstand von $${sm}$ und $d$ der Abstand der Ladungen; $${bg}$ ist dann $d + x$ entfernt:`)) +
          `$$k\\,\\frac{|q|\\,|${sm}|}{x^2} = k\\,\\frac{|q|\\,|${bg}|}{(d + x)^2} \\;\\Rightarrow\\; \\frac{d + x}{x} = \\sqrt{\\frac{|${bg}|}{|${sm}|}} \\;\\Rightarrow\\; x = \\frac{d}{\\sqrt{|${bg}|/|${sm}|} - 1}$$`, ['P']),
        step(L('The numbers', 'Die Zahlen'), `$$x = \\frac{${tq(p.d, 'cm')}}{\\sqrt{${ratio}} - 1} = ${res(tq(v.x, 'cm'))}$$` +
          p$(L(`The point lies ${rt(v.small === 1 ? 'left of A' : 'right of B')}, ${q(v.x, 'cm')} from it.`, `Der Punkt liegt ${rt(v.small === 1 ? 'links von A' : 'rechts von B')}, ${q(v.x, 'cm')} davon entfernt.`)), ['P']),
      ];
    },
  };

  // ---------------------------------------------------------------- 8 moved slightly
  // Outer charges A at (−1, 0) and B at (1, 0) (units of d), of the same sign; the middle one moved by
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
      pts: [{ c: c([-1, 0]), q: p.so, lab: `A: ${sl(p.so)}` }, { c: c([1, 0]), q: p.so, lab: `B: ${sl(p.so)}` }, { c: c(v.at), q: p.sm, lab: sl(p.sm), cls: 'hl', off: p.across ? [16, -16] : [0, -21] }],
      dims: [[c([-1, 0]), c([0, 0]), sv('d'), p.vert ? 64 : -64], [c([0, 0]), c([1, 0]), sv('d'), p.vert ? 64 : -64]],
      // along the line, the labels of the two forces below them and that of the net force above
      forces: { Fa: { at: c(v.at), F: c(v.fa), lab: sv('F', 'A'), cls: 'k-1', off: p.across || p.vert ? undefined : [0, 22] }, Fb: { at: c(v.at), F: c(v.fb), lab: sv('F', 'B'), cls: 'k-2', off: p.across || p.vert ? undefined : [0, 22] }, F: { at: c(v.at), F: c(v.net), lab: sv('F'), cls: 'k-net', off: p.across || p.vert ? undefined : [0, 40] } },
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
  const nudgeSituation = (p) => {
    const side = p.across ? L('away from the line, across it', 'quer zur Geraden') : L('along the line, towards one of the outer charges', 'entlang der Geraden, zu einer der äusseren Ladungen hin');
    return L(`Three point charges of the same size lie on a line, the middle one exactly halfway between the others. There the forces on it cancel. Now the middle charge is moved slightly ${side} (the drawing exaggerates it).`,
      `Drei gleich grosse Punktladungen liegen auf einer Geraden, die mittlere genau in der Mitte zwischen den anderen. Dort heben sich die Kräfte auf sie auf. Nun wird die mittlere Ladung ein wenig verschoben, ${side} (die Zeichnung übertreibt).`);
  };
  // the hints: the signs of this exercise, then where the charge was moved and what that does to the
  // distances
  const nudgeHints = (p) => {
    const v = nudgeSolve(p), sq = (s) => `$${s > 0 ? '+' : '-'}q$`;
    return [
      L(`The outer charges are both ${sq(p.so)}, the moved charge is ${sq(p.sm)}: does each outer charge push it away or pull it towards itself? Draw both forces, along the lines to the outer charges.`,
        `Die äusseren Ladungen sind beide ${sq(p.so)}, die verschobene Ladung ist ${sq(p.sm)}: Stösst jede äussere Ladung sie weg oder zieht sie sie zu sich hin? Zeichne beide Kräfte, entlang der Geraden zu den äusseren Ladungen.`),
      p.across ? L(`The charge was moved ${dirName(v.moved)}, off the line: it is still equally far from both outer charges, so their forces are equally large (Coulomb’s law, ${m$('1/r^2')}). Their components along the line cancel: which way do the components across it point?`,
        `Die Ladung wurde ${dirName(v.moved)} verschoben, neben die Gerade: Sie ist von beiden äusseren Ladungen noch gleich weit entfernt, ihre Kräfte sind also gleich gross (Coulombgesetz, ${m$('1/r^2')}). Ihre Komponenten entlang der Geraden heben sich auf: Wohin zeigen die Komponenten quer dazu?`)
        : L(`The charge was moved ${dirName(v.moved)}: the outer charge on that side is now nearer than $d$, the other farther. With Coulomb’s law (${m$('1/r^2')}), which of the two forces is now larger?`,
          `Die Ladung wurde ${dirName(v.moved)} verschoben: Die äussere Ladung auf dieser Seite ist jetzt näher als $d$, die andere weiter weg. Welche der beiden Kräfte ist mit dem Coulombgesetz (${m$('1/r^2')}) jetzt grösser?`),
    ];
  };
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
  const nudgeAlong = { id: 'nudge-along', difficulty: 2, title: () => L('Moved along the line', 'Entlang der Geraden verschoben'), make: (r) => nudgeMake(r, false), solve: nudgeSolve, traps: [], why: {}, fields: nudgeFields, text: nudgeText, situation: nudgeSituation, hints: nudgeHints, steps: nudgeSteps, figure: nudgeFigure };
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
      pts: [{ c: [0, 0], q: 1, lab: `${sv('q', 'A')} = ${qs(p.q1, 'nC')}`, off: [0, up ? 24 : -21] }, { c: [X, 0], q: Math.sign(p.q2), lab: `${sv('q', 'B')} = ${qs(p.q2, 'nC')}`, cls: 'hl', off: [0, up ? 30 : -27] }],
      forces: {
        F1: { at: [0, 0], F: mul(u, v.F1), lab: `${sv('F', 'A')} = ${q(v.F1, 'μN')}`, cls: 'k-1' },
        E: { at: add([X, 0], side), F: mul(u, big), lab: sv('E'), cls: 'k-net' },
        F2: { at: [X, 0], F: mul(DIRVEC[v.dir], v.F2), lab: sv('F', 'B'), cls: 'k-2' },
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
    nudge: {
      sameF: () => L('You kept the same force. Does the force on the second charge depend on its charge?', 'Du hast die gleiche Kraft genommen. Hängt die Kraft auf die zweite Ladung von ihrer Ladung ab?'),
      inverse: () => L('In the same field, does a larger charge feel a larger or a smaller force?', 'Spürt eine grössere Ladung im gleichen Feld eine grössere oder eine kleinere Kraft?'),
      against: () => NUDGE.negative(),
    },
    fields: () => [num$('E', 'E', 'N/C', L('field strength at P', 'Feldstärke in P')), num$('F2', 'F_B', 'μN', L('size of the force on the second charge', 'Betrag der Kraft auf die zweite Ladung')),
      dirField('dir', L('direction of that force', 'Richtung dieser Kraft'), DIR_ALL)],
    text: (p) => L(`A small test charge of ${qs(p.q1, 'nC')} at a point P feels an electric force of ${q(p.q1 * p.E, 'μN')}, pointing ${dirName(p.d)}. Then it is replaced by a charge of ${qs(p.q2, 'nC')}. How strong is the field at P? How large is the force on the second charge, and which way does it point?`,
      `Eine kleine Probeladung von ${qs(p.q1, 'nC')} in einem Punkt P spürt eine elektrische Kraft von ${q(p.q1 * p.E, 'μN')}, die ${dirName(p.d)} zeigt. Dann wird sie durch eine Ladung von ${qs(p.q2, 'nC')} ersetzt. Wie stark ist das Feld in P? Wie gross ist die Kraft auf die zweite Ladung, und wohin zeigt sie?`),
    situation: (p) => L(`A small test charge of ${qs(p.q1, 'nC')} at a point P feels an electric force of ${q(p.q1 * p.E, 'μN')}, pointing ${dirName(p.d)}. Then it is replaced by a charge of ${qs(p.q2, 'nC')}.`,
      `Eine kleine Probeladung von ${qs(p.q1, 'nC')} in einem Punkt P spürt eine elektrische Kraft von ${q(p.q1 * p.E, 'μN')}, die ${dirName(p.d)} zeigt. Dann wird sie durch eine Ladung von ${qs(p.q2, 'nC')} ersetzt.`),
    // the hints: what is given at P and what stays, the two relations, then the prefixes and the sign
    hints: (p) => [
      L(`At P, the test charge ${qs(p.q1, 'nC')} feels ${q(p.q1 * p.E, 'μN')}, pointing ${dirName(p.d)}. Then ${qs(p.q2, 'nC')} takes its place: what stays the same at P, and what changes?`,
        `In P spürt die Probeladung ${qs(p.q1, 'nC')} eine Kraft von ${q(p.q1 * p.E, 'μN')}, die ${dirName(p.d)} zeigt. Dann tritt ${qs(p.q2, 'nC')} an ihre Stelle: Was bleibt in P gleich, und was ändert sich?`),
      L(`The field is the force per charge, ${m$('E = F_A/q_A')}, from the first test charge and its force; it belongs to P. The force on the second charge is then ${m$('F_B = |q_B|\\,E')}.`,
        `Das Feld ist die Kraft pro Ladung, ${m$('E = F_A/q_A')}, aus der ersten Probeladung und ihrer Kraft; es gehört zu P. Die Kraft auf die zweite Ladung ist dann ${m$('F_B = |q_B|\\,E')}.`),
      L(`Mind the prefixes: μN divided by nC gives ${m$('10^{-6}/10^{-9} = 10^{3}')}, so the field comes out in thousands of N/C. The second charge is ${p.q2 > 0 ? 'positive' : 'negative'}: is it pushed along the field or against it?`,
        `Achte auf die Vorsätze: μN geteilt durch nC gibt ${m$('10^{-6}/10^{-9} = 10^{3}')}, das Feld kommt also in Tausenden von N/C heraus. Die zweite Ladung ist ${p.q2 > 0 ? 'positiv' : 'negativ'}: Wird sie in Feldrichtung gestossen oder entgegen?`),
    ],
    steps: (p, v) => [
      step(L('The field strength', 'Die Feldstärke'), p$(L('Let $F_A$ be the force on the test charge $q_A$. The field at P is the force per charge, and it points along the force on a positive charge:', 'Sei $F_A$ die Kraft auf die Probeladung $q_A$. Das Feld in P ist die Kraft pro Ladung, und es zeigt in Richtung der Kraft auf eine positive Ladung:')) +
        `$$E = \\frac{F_A}{q_A} = \\frac{${tnum(v.F1)}\\,\\mathrm{N}}{${tnum(p.q1)}\\,\\mathrm{C}} = ${res(tq(v.E, 'N/C'))}$$` + p$(L('The field belongs to the point P: it stays the same when the test charge is replaced.', 'Das Feld gehört zum Punkt P: Es bleibt gleich, wenn die Probeladung ersetzt wird.')), ['E'], ['E']),
      step(L('The force on the second charge', 'Die Kraft auf die zweite Ladung'), p$(L(`The force is proportional to the charge: ${Math.abs(p.q2) > p.q1 ? 'a larger' : 'a smaller'} charge, ${Math.abs(p.q2) > p.q1 ? 'a larger' : 'a smaller'} force.`, `Die Kraft ist proportional zur Ladung: ${Math.abs(p.q2) > p.q1 ? 'grössere' : 'kleinere'} Ladung, ${Math.abs(p.q2) > p.q1 ? 'grössere' : 'kleinere'} Kraft.`)) +
        `$$F_B = |q_B|\\,E = ${tnum(Math.abs(p.q2))}\\,\\mathrm{C}\\cdot ${tq(v.E, 'N/C')} = ${res(tq(v.F2, 'μN'))}$$`, ['E', 'F2'], ['F2']),
      step(L('Its direction', 'Ihre Richtung'), p$(p.q2 > 0
        ? L(`$q_B$ is positive: the force points along the field, ${rt(arrowWord(v.dir))}.`, `$q_B$ ist positiv: Die Kraft zeigt in Feldrichtung, ${rt(arrowWord(v.dir))}.`)
        : L(`$q_B$ is negative: the force points against the field, ${rt(arrowWord(v.dir))}. The field at P has not changed, only the sign of the charge.`, `$q_B$ ist negativ: Die Kraft zeigt entgegen der Feldrichtung, ${rt(arrowWord(v.dir))}. Das Feld in P hat sich nicht geändert, nur das Vorzeichen der Ladung.`)), ['E', 'F2'], ['F2']),
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
    nudge: {
      fieldSign: () => L('Check each field on its own: which way does the field of a positive charge point, and which way that of a negative one?', 'Prüfe jedes Feld einzeln: Wohin zeigt das Feld einer positiven Ladung, wohin das einer negativen?'),
      negAlong: () => L('The charge at P is negative: what does that mean for the direction of the force compared with the field?', 'Die Ladung in P ist negativ: Was bedeutet das für die Richtung der Kraft im Vergleich zum Feld?'),
    },
    fields: () => [dirField('E', L('direction of the net field at P', 'Richtung des Gesamtfeldes in P'), DIR_ALL), dirField('F', L('direction of the force on a negative charge at P', 'Richtung der Kraft auf eine negative Ladung in P'), DIR_ALL)],
    text: (p) => L(`The point charges ${p.ch.map((x, i) => `${NAMES[i]} = $${qTex(x.s)}$`).join(', ')} sit on a grid of side d around the point P, as shown. In which direction does their net electric field at P point? A small negative charge is placed at P: in which direction does the force on it point?`,
      `Die Punktladungen ${p.ch.map((x, i) => `${NAMES[i]} = $${qTex(x.s)}$`).join(', ')} sitzen auf einem Gitter mit der Seitenlänge d um den Punkt P, wie abgebildet. In welche Richtung zeigt ihr elektrisches Gesamtfeld in P? Eine kleine negative Ladung wird nach P gebracht: In welche Richtung zeigt die Kraft auf sie?`),
    situation: (p) => L(`The point charges ${p.ch.map((x, i) => `${NAMES[i]} = $${qTex(x.s)}$`).join(', ')} sit on a grid of side d around the point P, as shown.`,
      `Die Punktladungen ${p.ch.map((x, i) => `${NAMES[i]} = $${qTex(x.s)}$`).join(', ')} sitzen auf einem Gitter mit der Seitenlänge d um den Punkt P, wie abgebildet.`),
    // the hints: each charge's sign and distance from P, the strength of a point charge's field, then
    // the strengths worked out (not their directions)
    hints: (p) => {
      const dist = (x) => { const r2 = x.c[0] ** 2 + x.c[1] ** 2, r = Math.sqrt(r2); return Number.isInteger(r) ? `${r === 1 ? '' : r}d` : `\\sqrt{${r2}}\\,d`; };
      const list = p.ch.map((x, i) => `${NAMES[i]} ($${qTex(x.s)}$) ${L('at', 'in')} $${dist(x)}$`).join(', ');
      const sizes = p.ch.map((x, i) => { const e = sig(Math.abs(x.s) / (x.c[0] ** 2 + x.c[1] ** 2), 3); return `$E_${NAMES[i]} = ${e === 1 ? '' : `${e}\\,`}E_0$`; }).join(', ');
      return [
        L(`Seen from P: ${list}. Which of these fields point away from their charge, which towards it?`, `Von P aus: ${list}. Welche dieser Felder zeigen von ihrer Ladung weg, welche zu ihr hin?`),
        L(`The strength of each field is ${m$('E = k\\,|Q|/r^2')}: in units of ${m$('E_0 = k\\,q/d^2')}, the multiple of $q$ divided by the square of the multiple of $d$.`,
          `Die Stärke jedes Feldes ist ${m$('E = k\\,|Q|/r^2')}: in Einheiten von ${m$('E_0 = k\\,q/d^2')} das Vielfache von $q$ geteilt durch das Quadrat des Vielfachen von $d$.`),
        L(`The strengths: ${sizes}. Add the fields as arrows (by components). Does the force on the negative charge at P then point along the net field or against it?`,
          `Die Stärken: ${sizes}. Addiere die Felder als Pfeile (in Komponenten). Zeigt die Kraft auf die negative Ladung in P dann in Richtung des Gesamtfeldes oder entgegen?`),
      ];
    },
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

  // ---------------------------------------------------------------- 11 drawing the forces
  // In practice and in the tutor, the student draws the forces on a charge instead of choosing
  // their directions (arrow.js; the check keeps its four options, see quiz in generator.js):
  //   draw(p, v) → { keys (the direction fields the drawing answers), ask, anchors [{ id, label,
  //     c (where, as in the figure) }], kinds [{ id, name (in the palette), sub (of the arrow's
  //     label F: '' none, '@' the anchor's name, null numbered as drawn), cls, max, dirs }], dirs
  //     (degrees; default the eight of the compass), tails { kind: [dx, dy] } (px from the anchor:
  //     forces along one line stacked beside it), target [{ kind, anchor, F (the force, y up), net,
  //     name }], none (a button "No net force": the forces may cancel), say(problem) → { flag,
  //     nudge, why } }
  // say tells what is wrong with the drawing (judged in generator.js: drawOf): a nudge while the
  // exercise is open, why (the explanation, with the answer) once it is done; flag is the typical
  // wrong idea behind it, if any. problem: { type: 'dir' (a force turned the wrong way), 'equal'
  // (two equal forces drawn unequal), 'order' (the larger of two clearly unequal forces drawn
  // shorter), t (the target concerned; order: big, small), dir (as drawn, degrees), targets,
  // rights (the targets drawn right) }.
  const DEG8 = [0, 45, 90, 135, 180, 225, 270, 315], DEG12 = Array.from({ length: 12 }, (x, i) => 30 * i), DEG24 = Array.from({ length: 24 }, (x, i) => 15 * i);
  const compass = (d) => DIRS[Math.round(d / 45) % 8]; // a direction of the eight, from degrees
  const angle = (a, b) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return Math.min(d, 360 - d); };
  const opposed = (pr, kind) => pr.targets.some((t) => t.kind === kind && angle(t.dir, pr.dir + 180) <= 10);
  const ON_RING = () => L('the charge in the ring', 'die Ladung im Ring');
  const NET = () => ({ id: 'F', name: L('Net force', 'Resultierende Kraft'), sub: '', cls: 'k-net', max: 1 });
  const netName = () => L('the net force', 'die resultierende Kraft');
  const TIPS = () => L('Put the forces tip to tail: the net force goes from the first tail to the last tip. How long is it?', 'Setze die Kräfte Pfeil an Pfeil: Die resultierende Kraft geht vom ersten Anfang zur letzten Spitze. Wie lang ist sie?');
  const f0 = (x) => `$${sig(x, 3)}\\,F_0$`;

  pairDir.draw = (p, v) => ({
    keys: ['dB', 'dA'],
    ask: L('Draw the force on B and the force on A.', 'Zeichne die Kraft auf B und die Kraft auf A.'),
    anchors: [{ id: 'A', label: 'A', c: p.a }, { id: 'B', label: 'B', c: p.b }],
    kinds: [{ id: 'F', name: L('Force', 'Kraft'), sub: '@', cls: 'k-1', max: 1 }],
    target: [{ kind: 'F', anchor: 'B', F: v.fb, name: L('the force on B', 'die Kraft auf B') }, { kind: 'F', anchor: 'A', F: v.fa, name: L('the force on A', 'die Kraft auf A') }],
    say(pr) {
      if (pr.type === 'equal') return { flag: 'third', nudge: pairDir.nudge.third(), why: `${pairDir.why.third()} ${L('Draw them equally long.', 'Zeichne sie gleich lang.')}` };
      const x = pr.t.anchor, key = `d${x}`, d = compass(pr.dir), fact = L(`The force on ${x} points ${arrowWord(v[key])}.`, `Die Kraft auf ${x} zeigt ${arrowWord(v[key])}.`);
      // A's force the way of B's, with B's right: the third law; else turned round: the signs
      const third = x === 'A' && d === v.dB && pr.rights.some((t) => t.anchor === 'B');
      const flag = third ? 'third' : ['signs', 'third'].find((f) => pairDirSolve(p, { [f]: true })[key] === d);
      if (flag) return { flag, nudge: pairDir.nudge[flag](), why: `${pairDir.why[flag]()} ${fact}` };
      return { flag: null, nudge: L(`The force on ${x} lies on the line through A and B. Which way along it?`, `Die Kraft auf ${x} liegt auf der Geraden durch A und B. In welche Richtung auf ihr?`),
        why: `${L('The force lies on the line through the two charges: like charges repel, unlike charges attract.', 'Die Kraft liegt auf der Geraden durch die beiden Ladungen: Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an.')} ${fact}` };
    },
  });

  // three in a line: the forces of A and B stacked below the line, the net force on it (as in the figure)
  const lineDraw = (p, v) => {
    const sizes = () => L(`In units of $F_0 = k\\,q^2/d^2$, the force of A is $${fracF0(Math.abs(v.Fa))}$, that of B $${fracF0(Math.abs(v.Fb))}$, the net force $${fracF0(Math.abs(v.net))}$.`,
      `In Einheiten von $F_0 = k\\,q^2/d^2$ ist die Kraft von A $${fracF0(Math.abs(v.Fa))}$, die von B $${fracF0(Math.abs(v.Fb))}$, die resultierende Kraft $${fracF0(Math.abs(v.net))}$.`);
    const traps = p.mid ? ['noSquare'] : ['noSquare', 'sameDist'], nudge = (f) => (lineNudge[f] || lineWhy[f])();
    const of = (k) => ({ id: `F${k}`, name: L(`Force of ${k}`, `Kraft von ${k}`), sub: k, cls: k === 'A' ? 'k-1' : 'k-2', max: 1, dirs: [0, 180] });
    return {
      keys: ['dA', 'dB', 'dir'],
      ask: L('Draw the force of A and the force of B on the charge in the ring, then the net force. Draw the larger force longer.', 'Zeichne die Kraft von A und die Kraft von B auf die Ladung im Ring, dann die resultierende Kraft. Zeichne die grössere Kraft länger.'),
      anchors: [{ id: 't', label: ON_RING(), c: [0, 0] }],
      kinds: [of('A'), of('B'), { ...NET(), dirs: [0, 180] }],
      tails: { FA: [0, 15], FB: [0, 30] },
      target: [{ kind: 'FA', anchor: 't', F: [v.Fa, 0], name: L('the force of A', 'die Kraft von A') }, { kind: 'FB', anchor: 't', F: [v.Fb, 0], name: L('the force of B', 'die Kraft von B') },
        { kind: 'F', anchor: 't', F: [v.net, 0], net: true, name: netName() }],
      say(pr) {
        if (pr.type === 'dir' && pr.t.kind !== 'F') {
          const k = pr.t.kind.slice(1);
          return { flag: 'signs', nudge: lineNudge.signs(), why: `${lineWhy.signs()} ${L(`The force of ${k} points ${arrowWord(v[`d${k}`])}.`, `Die Kraft von ${k} zeigt ${arrowWord(v[`d${k}`])}.`)}` };
        }
        if (pr.type === 'dir') {
          // (with the forces of A and B drawn right, the net force turned is not a sign mixed up)
          const flag = traps.find((f) => lineSolve(p, { [f]: true }).dir === compass(pr.dir));
          return { flag: flag || null, nudge: flag ? nudge(flag) : L('The net force is the sum of the two forces: which of them is larger?', 'Die resultierende Kraft ist die Summe der beiden Kräfte: Welche ist grösser?'),
            why: `${sizes()} ${L(`The net force points ${arrowWord(v.dir)}.`, `Die resultierende Kraft zeigt ${arrowWord(v.dir)}.`)}` };
        }
        if (!pr.big.net && !pr.small.net) {
          const flag = traps.find((f) => { const w = lineSolve(p, { [f]: true }); return Math.abs(w.Fa) > Math.abs(w.Fb) !== Math.abs(v.Fa) > Math.abs(v.Fb); });
          const k = pr.big.kind.slice(1);
          return { flag: flag || null, nudge: flag ? nudge(flag) : L('Compare the sizes: proportional to the charge, and to 1/(distance)².', 'Vergleiche die Beträge: proportional zur Ladung und zu 1/(Abstand)².'),
            why: `${sizes()} ${L(`Draw the force of ${k} longer.`, `Zeichne die Kraft von ${k} länger.`)}` };
        }
        return { flag: null, nudge: TIPS(), why: `${sizes()} ${v.Fa * v.Fb < 0 ? L('The forces point in opposite directions: the net force is their difference.', 'Die Kräfte zeigen in entgegengesetzte Richtungen: Die resultierende Kraft ist ihre Differenz.')
          : L('Both forces point the same way: the net force is their sum, longer than each.', 'Beide Kräfte zeigen in dieselbe Richtung: Die resultierende Kraft ist ihre Summe, länger als jede.')}` };
      },
    };
  };
  lineEnd.draw = lineDraw;
  lineMid.draw = lineDraw;

  // which way: the force of each other charge (a kind each: A, B, …), then the net force
  const ONE_LINE = () => L('Each force lies on the line through the two charges: towards the other charge for opposite signs, away from it for like signs.', 'Jede Kraft liegt auf der Geraden durch die beiden Ladungen: zur anderen Ladung hin bei entgegengesetzten Vorzeichen, von ihr weg bei gleichen.');
  const whichDraw = (p, v) => {
    const n = v.Fs.length, of = (i) => ({ id: `F${LETTERS[i]}`, name: L(`Force of ${LETTERS[i]}`, `Kraft von ${LETTERS[i]}`), sub: LETTERS[i], cls: `k-${(i % 3) + 1}`, max: 1 });
    const sizes = () => L(`Each single force is ${[...new Set(v.Fs.map((F) => f0(len(F) * p.scaleF)))].join(' or ')}, with $F_0 = k\\,q^2/d^2$; added tip to tail, they give a net force of ${f0(len(v.net) * p.scaleF)}.`,
      `Jede einzelne Kraft ist ${[...new Set(v.Fs.map((F) => f0(len(F) * p.scaleF)))].join(' oder ')}, mit $F_0 = k\\,q^2/d^2$; Pfeil an Pfeil addiert, ergeben sie eine resultierende Kraft von ${f0(len(v.net) * p.scaleF)}.`);
    return {
      keys: ['d'],
      ask: L(`Draw the force of each of the other ${word(n)} charges on the charge in the ring, then the net force. Draw equal forces equally long, a smaller one shorter.`, `Zeichne die Kraft jeder der anderen ${word(n)} Ladungen auf die Ladung im Ring, dann die resultierende Kraft. Zeichne gleich grosse Kräfte gleich lang, eine kleinere kürzer.`),
      anchors: [{ id: 't', label: ON_RING(), c: p.pts[0].c }],
      kinds: [...v.Fs.map((F, i) => of(i)), NET()],
      dirs: p.shape === 'tri' ? DEG12 : DEG8,
      none: true, // the forces may cancel
      target: [...v.Fs.map((F, i) => ({ kind: `F${LETTERS[i]}`, anchor: 't', F, name: L(`the force of ${LETTERS[i]}`, `die Kraft von ${LETTERS[i]}`) })), { kind: 'F', anchor: 't', F: v.net, net: true, name: netName() }],
      say(pr) {
        if (pr.type === 'dir' && pr.t.kind !== 'F') {
          const k = pr.t.kind.slice(1);
          return opposed(pr, pr.t.kind) ? { flag: 'signs', nudge: NUDGE.signs(), why: ONE_LINE() }
            : { flag: null, nudge: L(`The force of ${k} lies on the line through the charge in the ring and ${k}.`, `Die Kraft von ${k} liegt auf der Geraden durch die Ladung im Ring und ${k}.`), why: ONE_LINE() };
        }
        const why = (s) => `${sizes()} ${s}`;
        if (pr.type === 'dir') return { flag: null, nudge: TIPS(), why: why(v.dir === '0' ? L('They cancel: there is no net force.', 'Sie heben sich auf: Es gibt keine resultierende Kraft.') : L(`The net force points ${arrowWord(v.dir)}.`, `Die resultierende Kraft zeigt ${arrowWord(v.dir)}.`)) };
        if (pr.type === 'equal') return { flag: null, nudge: L('Equal charges at equal distances: compare the sizes of their forces.', 'Gleiche Ladungen in gleichen Abständen: Vergleiche die Beträge ihrer Kräfte.'), why: why(L('Equal charges at the same distance exert forces of the same size: draw them equally long.', 'Gleiche Ladungen im gleichen Abstand üben gleich grosse Kräfte aus: Zeichne sie gleich lang.')) };
        if (!pr.big.net && !pr.small.net) return { flag: null, nudge: L('Which of the other charges are nearer? Compare the distances.', 'Welche der anderen Ladungen sind näher? Vergleiche die Abstände.'), why: why(L('A charge on the diagonal, at $\\sqrt{2}\\,d$, exerts half the force of one at $d$: draw its force shorter.', 'Eine Ladung auf der Diagonalen, im Abstand $\\sqrt{2}\\,d$, übt die halbe Kraft aus wie eine im Abstand $d$: Zeichne ihre Kraft kürzer.')) };
        return { flag: null, nudge: TIPS(), why: why('') };
      },
    };
  };
  which.draw = whichDraw;
  whichSquare.draw = whichDraw;

  // at a right angle: the forces of charges A and B along the sides, the net force at any angle
  const rightDraw = (p, v) => {
    const pull = (i) => (p.t * (i === 'A' ? p.q1 : p.q2) < 0);
    const vals = () => `$F_A = ${tq(v.F1, 'N')}$, $F_B = ${tq(v.F2, 'N')}$, $F = ${tq(len(v.net), 'N')}$`;
    const of = (i) => ({ id: `F${i}`, name: L(`Force of charge ${i}`, `Kraft von Ladung ${i}`), sub: i, cls: i === 'A' ? 'k-1' : 'k-2', max: 1 });
    return {
      keys: ['dir'],
      ask: L('Draw the force of charge A and the force of charge B on the charge in the corner, then the net force. Draw the larger force longer.', 'Zeichne die Kraft von Ladung A und die Kraft von Ladung B auf die Ladung in der Ecke, dann die resultierende Kraft. Zeichne die grössere Kraft länger.'),
      anchors: [{ id: 't', label: L('the charge in the corner', 'die Ladung in der Ecke'), c: [0, 0] }],
      kinds: [of('A'), of('B'), { ...NET(), dirs: DEG24 }],
      target: [{ kind: 'FA', anchor: 't', F: v.f1, name: L('the force of charge A', 'die Kraft von Ladung A') }, { kind: 'FB', anchor: 't', F: v.f2, name: L('the force of charge B', 'die Kraft von Ladung B') },
        { kind: 'F', anchor: 't', F: v.net, net: true, name: netName() }],
      say(pr) {
        if (pr.type === 'dir' && pr.t.kind !== 'F') {
          const i = pr.t.kind.slice(1), d = i === 'A' ? (v.f1[0] > 0 ? 'E' : 'W') : v.f2[1] > 0 ? 'N' : 'S';
          return { flag: 'signs', nudge: NUDGE.signs(), why: pull(i) ? L(`Charge ${i} attracts the charge in the corner: its force points ${arrowWord(d)}, towards charge ${i}.`, `Ladung ${i} zieht die Ladung in der Ecke an: Ihre Kraft zeigt ${arrowWord(d)}, zu Ladung ${i} hin.`)
            : L(`Charge ${i} repels the charge in the corner: its force points ${arrowWord(d)}, away from charge ${i}.`, `Ladung ${i} stösst die Ladung in der Ecke ab: Ihre Kraft zeigt ${arrowWord(d)}, von Ladung ${i} weg.`) };
        }
        if (pr.type === 'dir') {
          const a = Math.round((Math.atan2(Math.abs(v.net[1]), Math.abs(v.net[0])) * 180) / Math.PI);
          return { flag: null, nudge: L('The net force is the diagonal of the rectangle that the two forces span.', 'Die resultierende Kraft ist die Diagonale des Rechtecks, das die beiden Kräfte aufspannen.'),
            why: L(`The net force is the diagonal of the rectangle of the two forces: it points ${arrowWord(v.dir)}, at about ${a}° to the horizontal, nearer the larger force (${vals()}).`, `Die resultierende Kraft ist die Diagonale des Rechtecks der beiden Kräfte: Sie zeigt ${arrowWord(v.dir)}, etwa ${a}° gegen die Horizontale, näher bei der grösseren Kraft (${vals()}).`) };
        }
        if (!pr.big.net && !pr.small.net) {
          const w = rightSolve(p, { noSquare: true }), flag = (w.ratio > 1) !== (v.ratio > 1) ? 'noSquare' : null, i = pr.big.kind.slice(1);
          return { flag, nudge: flag ? NUDGE.noSquare() : L('Compare the two forces: how do the charges and the distances enter?', 'Vergleiche die beiden Kräfte: Wie gehen die Ladungen und die Abstände ein?'),
            why: L(`${vals()}: draw the force of charge ${i} longer.`, `${vals()}: Zeichne die Kraft von Ladung ${i} länger.`) };
        }
        return { flag: null, nudge: L('How long is the diagonal of a rectangle compared with its sides?', 'Wie lang ist die Diagonale eines Rechtecks im Vergleich zu seinen Seiten?'),
          why: L(`The net force is the diagonal of the rectangle of the two forces, longer than each side: ${vals()}.`, `Die resultierende Kraft ist die Diagonale des Rechtecks der beiden Kräfte, länger als jede Seite: ${vals()}.`) };
      },
    };
  };
  right.draw = rightDraw;
  rightDist.draw = rightDraw;

  // moved slightly: the forces of the two outer charges A and B, then the net force; along the
  // line, the two forces stacked beside it
  const nudgeDraw = (p, v) => {
    const c = (x) => R90(x, p.vert), of = (k) => ({ id: `F${k}`, name: L(`Force of ${k}`, `Kraft von ${k}`), sub: k, cls: k === 'A' ? 'k-1' : 'k-2', max: 1 });
    const first = nudgeSteps(p, v)[0].text.replace(/^<p class="step-rule">.*?<\/p>/, '').replace(/<\/?p>/g, '');
    const sizes = () => (p.across
      ? L(`Each force is ${f0(len(v.fa))} (with $F_0 = k\\,q^2/d^2$); their components across the line add up to a net force of ${f0(len(v.net))}, shorter than each.`, `Jede Kraft ist ${f0(len(v.fa))} (mit $F_0 = k\\,q^2/d^2$); ihre Komponenten quer zur Geraden addieren sich zu einer resultierenden Kraft von ${f0(len(v.net))}, kürzer als jede.`)
      : L(`The forces are ${f0(Math.max(len(v.fa), len(v.fb)))} and ${f0(Math.min(len(v.fa), len(v.fb)))} (with $F_0 = k\\,q^2/d^2$), in opposite directions: the net force is their difference, ${f0(len(v.net))}.`, `Die Kräfte sind ${f0(Math.max(len(v.fa), len(v.fb)))} und ${f0(Math.min(len(v.fa), len(v.fb)))} (mit $F_0 = k\\,q^2/d^2$), entgegengesetzt: Die resultierende Kraft ist ihre Differenz, ${f0(len(v.net))}.`));
    return {
      keys: ['d'],
      ask: L('Draw the forces of the two outer charges on the moved charge, then the net force. Draw equal forces equally long, a larger one longer.', 'Zeichne die Kräfte der beiden äusseren Ladungen auf die verschobene Ladung, dann die resultierende Kraft. Zeichne gleich grosse Kräfte gleich lang, eine grössere länger.'),
      anchors: [{ id: 't', label: L('the moved charge', 'die verschobene Ladung'), c: c(v.at) }],
      kinds: [of('A'), of('B'), NET()],
      dirs: p.across ? DEG24 : DEG8,
      tails: p.across ? {} : { FA: p.vert ? [15, 0] : [0, 15], FB: p.vert ? [15, 0] : [0, 15] },
      target: [{ kind: 'FA', anchor: 't', F: c(v.fa), name: L('the force of A', 'die Kraft von A') }, { kind: 'FB', anchor: 't', F: c(v.fb), name: L('the force of B', 'die Kraft von B') }, { kind: 'F', anchor: 't', F: c(v.net), net: true, name: netName() }],
      say(pr) {
        if (pr.type === 'dir' && pr.t.kind !== 'F') {
          const k = pr.t.kind.slice(1);
          return opposed(pr, pr.t.kind) ? { flag: 'signs', nudge: NUDGE.signs(), why: first }
            : { flag: null, nudge: L(`The force of ${k} lies on the line from ${k} to the moved charge.`, `Die Kraft von ${k} liegt auf der Geraden von ${k} zur verschobenen Ladung.`), why: first };
        }
        if (pr.type === 'dir') {
          return { flag: null, nudge: p.across ? L('Which components of the two forces cancel, and which remain?', 'Welche Komponenten der beiden Kräfte heben sich auf, welche bleiben?') : L('Which of the two forces is larger now? The net force is their sum.', 'Welche der beiden Kräfte ist jetzt grösser? Die resultierende Kraft ist ihre Summe.'),
            why: `${first} ${L(`The net force points ${arrowWord(v.d)}.`, `Die resultierende Kraft zeigt ${arrowWord(v.d)}.`)}` };
        }
        if (pr.type === 'equal') return { flag: null, nudge: L('The moved charge is equally far from both outer charges: compare their forces.', 'Die verschobene Ladung ist von beiden äusseren Ladungen gleich weit entfernt: Vergleiche ihre Kräfte.'), why: `${sizes()} ${L('Draw the two forces equally long.', 'Zeichne die beiden Kräfte gleich lang.')}` };
        if (!pr.big.net && !pr.small.net) return { flag: null, nudge: L('Which outer charge is nearer now? How does that change its force?', 'Welche äussere Ladung ist jetzt näher? Wie ändert das ihre Kraft?'), why: `${L('The nearer charge acts with the larger force (1/r²): draw its force longer.', 'Die nähere Ladung wirkt mit der grösseren Kraft (1/r²): Zeichne ihre Kraft länger.')} ${sizes()}` };
        return { flag: null, nudge: TIPS(), why: sizes() };
      },
    };
  };
  nudgeAlong.draw = nudgeDraw;
  nudgeAcross.draw = nudgeDraw;

  const SCENARIOS = [pairDir, pair, factor, factorMix, factorFind, lineEnd, lineMid, which, whichSquare, rank3, rank4, right, rightDist, zeroLike, zeroUnlike, nudgeAlong, nudgeAcross, fieldForce, fieldSum];
  root.Scenarios = { SCENARIOS, drawing, sv };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
