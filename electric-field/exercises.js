// The exercises of Field Lines and Equipotentials, with their texts, in the current language (the
// app rebuilds them when the language changes). The form is that of Magnetic Forces: { id, type,
// kind, difficulty, title, text, figs, questions, hints, solution, solFig, p }, with questions of
// the kinds tiles (directions or names: one, or all that fit), pick (one of four drawings), choice
// (one of a few values or words) and multi (statements to tick). The wrong options carry a tag: the
// wrong idea behind them (the check counts some of them as misconceptions).
// The types:
//   lines-pick, lines-wire, lines-cap   which diagram shows the field lines: of point charges, of a
//                               charged wire (and how its field falls off), of a plate capacitor
//   lines-read                  a diagram with hidden signs: the signs, the field at a point, where
//                               the field is strongest
//   dipole-uniform, dipole-torque, dipole-point   a dipole in a uniform field: net force and turning;
//                               the torque q·E·d·sin φ by factors; a dipole near a point charge
//   equi-pick, lines-equi       equipotentials of an arrangement; field lines from equipotentials
//   error                       find the error in a student's sketch of field lines and equipotentials
//   stmts                       which statements are correct?
(function (root) {
  'use strict';

  const E = root.Elec || require('./elec.js');
  const C = root.Charges || require('./charges.js');
  const { L, rng, dkey, dirName, nice, choice, tiles, words } = E;
  const BOX = [-3, 3, -2.2, 2.2];
  const it = (s) => `<i>${s}</i>`;
  const frac = (x) => (Math.abs(x - 1) < 1e-9 ? '×1' : x > 1 ? `×${nice(x)}` : `×1/${nice(1 / x)}`);
  const fig = (html) => `<div class="fig">${html}</div>`;
  const LINES = () => L('Field lines start at positive charges and end at negative ones (or at infinity); they never cross; they are closer together where the field is stronger. A drawing shows only the lines in one plane, so the number of lines drawn at a charge does not tell its size.',
    'Feldlinien beginnen bei positiven Ladungen und enden bei negativen (oder im Unendlichen); sie kreuzen sich nie; sie liegen dichter, wo das Feld stärker ist. Eine Zeichnung zeigt nur die Linien in einer Ebene, deshalb verrät die Zahl der gezeichneten Linien bei einer Ladung nicht ihre Grösse.');
  const PERP = () => L('Equipotential lines cross the field lines at right angles; for equal steps of potential they are closer together where the field is stronger.', 'Äquipotentiallinien kreuzen die Feldlinien senkrecht; für gleiche Potentialschritte liegen sie dort dichter, wo das Feld stärker ist.');

  // ---------------------------------------------------------------- field-line diagrams
  const LCONF = [
    { id: 'like', c: [[1, -1], [1, 1]] }, { id: 'opp', c: [[1, -1], [-1, 1]] }, { id: 'unequal', c: [[2, -1], [-1, 1]] },
    { id: 'neg', c: [[-1, -1], [-1, 1]] }, { id: 'unequal2', c: [[1, -1], [-2, 1]] },
    { id: 'likeun', c: [[2, -1], [1, 1]] }, { id: 'likeun2', c: [[1, -1], [2, 1]] }, { id: 'three', c: [[3, -1], [-1, 1]] }, { id: 'three2', c: [[1, -1], [-3, 1]] },
  ];
  const pts2 = (spec) => ({ kind: 'points', charges: spec.map(([q, x]) => ({ q, x, y: 0 })) });
  const label = (q) => (q > 0 ? (q > 1 ? `+${q}` : '+') : q < -1 ? `−${-q}` : '−');
  const WHYL = {
    reverse: () => L('The arrows point the wrong way: field lines start at positive charges and end at negative ones.', 'Die Pfeile zeigen falsch herum: Feldlinien beginnen bei positiven Ladungen und enden bei negativen.'),
    separate: () => L('Field lines never cross: at each point the field has a single direction, that of the sum of the fields of all the charges.', 'Feldlinien kreuzen sich nie: In jedem Punkt hat das Feld eine einzige Richtung, die der Summe der Felder aller Ladungen.'),
    swap: () => L('This pattern belongs to another arrangement: lines here run into a positive charge or out of a negative one, which cannot be.', 'Dieses Muster gehört zu einer anderen Anordnung: Linien laufen hier in eine positive Ladung hinein oder aus einer negativen heraus, was nicht sein kann.'),
  };
  function linesPick(seed) {
    const r = rng(seed * 41 + 13), cf = r.pick(LCONF), opts = [];
    const small = (c, given, o = {}) => C.fig(c, { box: BOX, given, small: true, ...o });
    const flip = r.next() < 0.5 && cf.id !== 'neg', spec = cf.c.map(([q, x]) => [flip ? -q : q, x]);
    const c = pts2(spec), labels = spec.map(([q]) => label(q));
    const name = L(`the charges ${labels.join(' and ')}`, `die Ladungen ${labels.join(' und ')}`);
    const right = C.lines(c, BOX);
    opts.push({ html: small(c, right, { labels }), ok: true }, { html: small(c, right, { labels, reverse: true }), tag: 'reverse' });
    const sep = c.charges.flatMap((ch) => C.lines({ kind: 'points', charges: [ch] }, BOX));
    const swapped = C.lines(pts2([spec[0], [-spec[1][0], spec[1][1]]]), BOX);
    opts.push({ html: small(c, sep, { labels }), tag: 'separate' }, { html: small(c, swapped, { labels }), tag: 'swap' });
    return {
      kind: 'lines', title: L('Field lines', 'Feldlinien'),
      text: L(`<p>Which diagram shows the field lines of ${name}?</p>`, `<p>Welches Diagramm zeigt die Feldlinien für ${name}?</p>`), figs: '',
      questions: [{ type: 'pick', key: 'd', label: L('Which diagram is right?', 'Welches Diagramm stimmt?'), options: r.shuffle(opts).map((o) => ({ html: o.html, ok: !!o.ok, tag: o.tag, why: o.ok ? '' : `${WHYL[o.tag]()} ${LINES()}` })) }],
      hints: [L('Where do the lines start, where do they end?', 'Wo beginnen die Linien, wo enden sie?'), L('Can two lines cross?', 'Können sich zwei Linien kreuzen?'), LINES()],
      solution: [LINES()], solFig: fig(C.fig(c, { box: BOX, lines: true, labels })), p: { cf: cf.id, flip, seed: seed % 5 },
    };
  }

  // A long charged wire (seen from the side) and a plate capacitor: which diagram, and how strong.
  const XS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  // the wire along the x axis: a rod with its sign on it
  const wire = (q) => ({ rods: [[-3.3, 0, 3.3, 0]], parts: [-2, -1, 0, 1, 2].map((x) => ({ x, y: 0, q, r: 7 })) });
  const flipAll = (lns) => lns.map((ln) => [...ln].reverse());
  const CAP = (q) => ({ kind: 'plates', h: 0.8, w: 1.8, q });
  // the capacitor as in a textbook (the computed lines of charges.js wobble at the edges): straight
  // lines from + to − between the plates, two bulging at each edge; equipotentials parallel to
  // the plates, evenly spaced
  function capLines(c) {
    const s = c.q > 0 ? 1 : -1, h = c.h - 0.03, out = [];
    for (let x = -1.6; x <= 1.61; x += 0.4) out.push([[x, s * h], [x, -s * h]]);
    for (const side of [-1, 1]) for (const b of [0.22, 0.5]) out.push(Array.from({ length: 41 }, (z, k) => [side * (c.w - 0.04 + b * Math.sin((Math.PI * k) / 40)), s * h * (1 - (2 * k) / 40)]));
    return out;
  }
  const capEqui = (c, ys = [-0.5, -0.25, 0, 0.25, 0.5]) => ys.map((y) => [[-c.w - 0.1, y * (c.h / 0.75)], [c.w + 0.1, y * (c.h / 0.75)]]);
  function linesShape(seed, key) {
    const r = rng(seed * 61 + (key === 'wire' ? 31 : 37)), q = r.pick([1, -1]), small = (c, given, o = {}) => C.fig(c, { box: BOX, given, small: true, ...o });
    const out = (lns) => (q > 0 ? lns : flipAll(lns)); // drawn from + to −
    let opts, qs, how, solFig, text, W;
    if (key === 'wire') {
      const c = { kind: 'uniform', E: [0, 1] }, w = wire(q);
      const right = out([...XS.map((x) => [[x, 0.15], [x, 2.7]]), ...XS.map((x) => [[x, -0.15], [x, -2.7]])]);
      const along = [-1.8, -1.2, -0.6, 0.6, 1.2, 1.8].map((y) => [[-3.3, y], [3.3, y]]);
      const point = out(Array.from({ length: 12 }, (x, k) => { const a = (k * Math.PI) / 6 + Math.PI / 12; return [[0.2 * Math.cos(a), 0.2 * Math.sin(a)], [4 * Math.cos(a), 4 * Math.sin(a)]]; }));
      W = {
        reverse: () => L(`The arrows point the wrong way: field lines run away from positive charge, towards negative charge. The wire is ${q > 0 ? 'positive' : 'negative'}.`, `Die Pfeile zeigen falsch herum: Feldlinien laufen von positiver Ladung weg, zu negativer Ladung hin. Der Draht ist ${q > 0 ? 'positiv' : 'negativ'}.`),
        parallel: () => L('Field lines start or end on the charge of the wire; they do not run along it.', 'Feldlinien beginnen oder enden auf der Ladung des Drahts; sie laufen nicht längs des Drahts.'),
        point: () => L('That is the field of a point charge in the middle. Every piece of a long wire looks the same: the lines leave it at right angles everywhere, not only from its middle.', 'Das ist das Feld einer Punktladung in der Mitte. Jedes Stück eines langen Drahts sieht gleich aus: Die Linien verlassen ihn überall senkrecht, nicht nur in seiner Mitte.'),
      };
      opts = [{ html: small(c, right, w), ok: true }, { html: small(c, right, { ...w, reverse: true }), tag: 'reverse' }, { html: small(c, along, w), tag: 'parallel' }, { html: small(c, point, w), tag: 'point' }];
      how = L(`By symmetry the lines leave the wire at right angles, the same all along it, ${q > 0 ? 'away from the positive wire' : 'towards the negative wire'}.`, `Aus Symmetriegründen verlassen die Linien den Draht senkrecht, überall gleich, ${q > 0 ? 'vom positiven Draht weg' : 'zum negativen Draht hin'}.`);
      const howE = L('Seen from the side the lines look parallel, but round the wire they spread out like the spokes of a wheel: at twice the distance they are spread over twice the circumference. E = λ/(2π·ε₀·r): half the field.', 'Von der Seite sehen die Linien parallel aus, aber um den Draht herum laufen sie wie die Speichen eines Rads auseinander: Im doppelten Abstand verteilen sie sich auf den doppelten Umfang. E = λ/(2π·ε₀·r): halbes Feld.');
      qs = [choice('E', L('(b) At twice the distance from the wire, the field is', '(b) Im doppelten Abstand vom Draht ist das Feld'), [[1, 'flat', L('The lines look parallel from the side, but they spread out round the wire.', 'Die Linien sehen von der Seite parallel aus, laufen aber um den Draht herum auseinander.')], [0.5, undefined, ''], [0.25, 'square', L('A quarter: that is a point charge, whose lines spread out in all directions.', 'Ein Viertel: Das ist eine Punktladung, deren Linien sich in alle Richtungen ausbreiten.')], [2, 'other', '']].map(([x, tag, w0]) => ({ label: frac(x), ok: x === 0.5, tag, why: x === 0.5 ? '' : `${w0} ${howE}` })))];
      solFig = fig(C.fig(c, { box: BOX, given: right, ...w }));
      text = L(`<p>A long straight wire, evenly charged ${q > 0 ? 'positive' : 'negative'}, seen from the side.</p>`, `<p>Ein langer gerader Draht, gleichmässig ${q > 0 ? 'positiv' : 'negativ'} geladen, von der Seite gesehen.</p>`);
      how = [how, howE];
    } else {
      const c = CAP(q), right = capLines(c);
      const point = C.lines({ kind: 'points', charges: [{ q, x: 0, y: 0.8 }, { q: -q, x: 0, y: -0.8 }] }, BOX, { per: 10 });
      const outside = out([-2.7, -2.1, -1.5, -0.9, -0.3, 0.3, 0.9, 1.5, 2.1, 2.7].map((x) => [[x, 2.7], [x, -2.7]]));
      W = {
        reverse: () => L('The arrows point the wrong way: field lines run from the positive plate to the negative one.', 'Die Pfeile zeigen falsch herum: Feldlinien laufen von der positiven Platte zur negativen.'),
        point: () => L('That is the field of two point charges in the middles of the plates. The charge is spread evenly over the plates: the lines leave the whole plate.', 'Das ist das Feld zweier Punktladungen in den Mitten der Platten. Die Ladung ist gleichmässig über die Platten verteilt: Die Linien verlassen die ganze Platte.'),
        outside: () => L('Outside the plates the fields of the two plates cancel: there is (almost) no field there.', 'Ausserhalb der Platten heben sich die Felder der beiden Platten auf: Dort gibt es (fast) kein Feld.'),
      };
      opts = [{ html: small(c, right), ok: true }, { html: small(c, right, { reverse: true }), tag: 'reverse' }, { html: small(c, point), tag: 'point' }, { html: small(c, outside), tag: 'outside' }];
      how = L('Between the plates the field is uniform: parallel lines, evenly spaced, from the positive plate to the negative one. Only at the edges do they bulge out; outside there is (almost) no field.', 'Zwischen den Platten ist das Feld homogen: parallele Linien in gleichen Abständen, von der positiven Platte zur negativen. Nur an den Rändern wölben sie sich nach aussen; ausserhalb gibt es (fast) kein Feld.');
      const howE = L('Between the plates the lines are parallel and evenly spaced: the field is the same everywhere (uniform), near the plates as in the middle.', 'Zwischen den Platten sind die Linien parallel und gleich dicht: Das Feld ist überall gleich (homogen), nahe den Platten wie in der Mitte.');
      qs = [choice('E', L('(b) Between the plates, the field is', '(b) Zwischen den Platten ist das Feld'), words(r, [
        [L('the same everywhere', 'überall gleich'), true, ''], [L('strongest near the positive plate', 'am stärksten nahe der positiven Platte'), false, howE],
        [L('strongest in the middle', 'in der Mitte am stärksten'), false, howE], [L('strongest near both plates', 'nahe bei beiden Platten am stärksten'), false, howE]]).map((o) => ({ ...o, tag: o.ok ? undefined : 'nearplate' })))];
      solFig = fig(C.fig(c, { box: BOX, given: right }));
      text = L(`<p>A plate capacitor, its ${q > 0 ? 'upper' : 'lower'} plate positive.</p>`, `<p>Ein Plattenkondensator, seine ${q > 0 ? 'obere' : 'untere'} Platte positiv.</p>`);
      how = [how, howE];
    }
    return {
      kind: 'lines', title: key === 'wire' ? L('A charged wire', 'Ein geladener Draht') : L('A plate capacitor', 'Ein Plattenkondensator'), text, figs: '',
      questions: [{ type: 'pick', key: 'd', label: L('(a) Which diagram shows the field lines?', '(a) Welches Diagramm zeigt die Feldlinien?'), options: r.shuffle(opts).map((o) => ({ html: o.html, ok: !!o.ok, tag: o.tag, why: o.ok ? '' : `${W[o.tag]()} ${how[0]}` })) }, ...qs],
      hints: [L('Where does the charge sit? The lines start (or end) on it, at right angles.', 'Wo sitzt die Ladung? Die Linien beginnen (oder enden) auf ihr, senkrecht.'), L('Use the symmetry: every piece of a long wire, and every piece of a large plate, looks the same.', 'Nutze die Symmetrie: Jedes Stück eines langen Drahts und jedes Stück einer grossen Platte sieht gleich aus.')],
      solution: how, solFig, p: { key, q, s: seed % 5 },
    };
  }

  // A diagram with hidden signs: the signs, the field at a point, where the field is strongest.
  function linesRead(seed) {
    const r = rng(seed * 43 + 17);
    for (;;) {
      const qa = r.pick([1, 2, 3]) * r.pick([1, -1]), qb = r.pick([1, 2, 3]) * r.pick([1, -1]);
      const c = pts2([[qa, -1], [qb, 1]]), per = 6;
      const cand = r.shuffle([[0, 0], [0, 1.6], [-2.4, 0.4], [2.4, -0.4], [-1, 1], [1, -1], [0, -1.3], [-1.6, -1.2], [1.6, 1.2]]).slice(0, 4);
      const mags = cand.map(([x, y]) => Math.hypot(...C.field(c, x, y)));
      const best = mags.indexOf(Math.max(...mags)), sorted = [...mags].sort((a, b) => b - a);
      if (sorted[0] < 1.4 * sorted[1]) continue;
      // a drawing shows only the lines in one plane: the point must also be where the drawn lines are densest
      const lns = C.lines(c, BOX, { per }), near = ([x, y]) => lns.filter((ln) => ln.some((q) => Math.hypot(q[0] - x, q[1] - y) < 0.35)).length;
      const dens = cand.map(near);
      if (dens.some((d, i) => i !== best && d >= dens[best])) continue;
      // the field at one point, not too weak to read off
      const at = cand.findIndex((p, i) => i !== best && mags[i] > 0.12 && dens[i] > 0);
      if (at < 0) continue;
      const pn = ['P', 'Q', 'R', 'S'], points = cand.map(([x, y], i) => ({ x, y, name: pn[i] }));
      const f = C.field(c, ...cand[at]), u = [f[0] / mags[at], f[1] / mags[at]];
      const sgn = (q, n) => L(`The lines ${q > 0 ? 'start' : 'end'} at ${n}: ${n} is ${q > 0 ? 'positive' : 'negative'}.`, `Die Linien ${q > 0 ? 'beginnen' : 'enden'} bei ${n}: ${n} ist ${q > 0 ? 'positiv' : 'negativ'}.`);
      const howS = `${sgn(qa, 'A')} ${sgn(qb, 'B')}`;
      const howP = L(`The field is strongest where the lines are densest: at ${pn[best]}.`, `Das Feld ist am stärksten, wo die Linien am dichtesten sind: bei ${pn[best]}.`);
      const howD = L(`The field at ${pn[at]} points along the field line through ${pn[at]} (its tangent), the way its arrows point.`, `Das Feld in ${pn[at]} zeigt längs der Feldlinie durch ${pn[at]} (ihrer Tangente), so wie ihre Pfeile zeigen.`);
      const sl = (a, b) => `A ${a > 0 ? '+' : '−'}, B ${b > 0 ? '+' : '−'}`;
      const combos = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      const dirs = [[u, undefined], [[-u[0], -u[1]], 'against'], [[-u[1], u[0]], 'perp'], [[u[1], -u[0]], 'perp']];
      return {
        kind: 'read', title: L('Reading field lines', 'Feldlinien lesen'),
        text: L('<p>The diagram shows the field lines of two charges A and B (their signs are hidden) and four points.</p>', '<p>Das Diagramm zeigt die Feldlinien zweier Ladungen A und B (ihre Vorzeichen sind verdeckt) und vier Punkte.</p>'),
        figs: fig(C.fig(c, { box: BOX, given: lns, unknown: true, points })),
        questions: [
          choice('sg', L('(a) The signs of the charges', '(a) Die Vorzeichen der Ladungen'), combos.map(([a, b]) => ({ label: sl(a, b), ok: a === Math.sign(qa) && b === Math.sign(qb), tag: 'sign', why: howS }))),
          tiles('dir', L(`(b) In which direction does the field at ${pn[at]} point?`, `(b) In welche Richtung zeigt das Feld in ${pn[at]}?`), r.shuffle(dirs.slice()).map(([d, tag]) => ({ html: `<span class="dtile">${C.icon(d)}</span>`, ok: !tag, tag, why: tag ? howD : '' }))),
          tiles('P', L('(c) Where is the field strongest?', '(c) Wo ist das Feld am stärksten?'), pn.map((n, i) => ({ html: `<span class="dtile"><b>${n}</b></span>`, ok: i === best, tag: 'density', why: howP }))),
        ],
        hints: [L('The arrows show the direction of the field: away from positive charges, towards negative ones.', 'Die Pfeile zeigen die Richtung des Feldes: von positiven Ladungen weg, zu negativen hin.'), L('The field at a point is tangent to the field line through it.', 'Das Feld in einem Punkt ist tangential zur Feldlinie durch ihn.'), LINES()],
        solution: [howS, howD, howP], solFig: fig(C.fig(c, { box: BOX, given: lns, labels: [label(qa), label(qb)], points: [points[at]], vecs: [{ x: cand[at][0], y: cand[at][1], dx: 46 * u[0], dy: 46 * u[1], cls: 'v-field', name: 'E⃗' }] })),
        p: { qa, qb, pts: cand.join(';'), at },
      };
    }
  }

  // ---------------------------------------------------------------- dipoles
  function dipoleUniform(seed) {
    const r = rng(seed * 79 + 47), Ed = r.pick([[1, 0], [0, 1], [-1, 0], [0, -1]]), ang = r.pick([45, 90, 135, -45, -90, -135, 0, 180]);
    const a0 = Math.atan2(Ed[1], Ed[0]) + (ang * Math.PI) / 180, p = [Math.cos(a0), Math.sin(a0)], tz = p[0] * Ed[1] - p[1] * Ed[0];
    const turn = Math.abs(tz) < 1e-9 ? (ang === 0 ? 'stable' : 'unstable') : tz > 0 ? 'acw' : 'cw', h = 0.7;
    const howF = L('The forces on the two ends are equal in size and opposite in direction: the net force in a uniform field is zero.', 'Die Kräfte auf die beiden Enden sind gleich gross und entgegengesetzt: Die Gesamtkraft in einem homogenen Feld ist null.');
    const howT = turn === 'stable' ? L('The dipole already points along the field: the two forces act along the rod and do not turn it. Nudged a little, it turns back: a stable equilibrium.', 'Der Dipol zeigt schon in Feldrichtung: Die beiden Kräfte wirken längs des Stabs und drehen ihn nicht. Ein wenig ausgelenkt, dreht er zurück: ein stabiles Gleichgewicht.')
      : turn === 'unstable' ? L('The dipole points against the field: the forces act along the rod and do not turn it, but the slightest nudge turns it round: an unstable equilibrium.', 'Der Dipol zeigt gegen das Feld: Die Kräfte wirken längs des Stabs und drehen ihn nicht, aber der kleinste Stoss dreht ihn um: ein labiles Gleichgewicht.')
        : L(`The force on the + end points along the field, that on the − end against it: together they turn the dipole ${turn === 'acw' ? 'anticlockwise' : 'clockwise'}, until its + end points along the field.`, `Die Kraft auf das +-Ende zeigt in Feldrichtung, die auf das −-Ende entgegen: Zusammen drehen sie den Dipol ${turn === 'acw' ? 'im Gegenuhrzeigersinn' : 'im Uhrzeigersinn'}, bis sein +-Ende in Feldrichtung zeigt.`);
    const F = [[L('is zero', 'ist null'), true], [L('points along the field', 'zeigt in Feldrichtung'), false], [L('points against the field', 'zeigt gegen das Feld'), false], [L('points across the field', 'zeigt quer zum Feld'), false]];
    const T = [['cw', L('turns clockwise', 'dreht sich im Uhrzeigersinn')], ['acw', L('turns anticlockwise', 'dreht sich im Gegenuhrzeigersinn')], ['stable', L('does not turn: it is in a stable equilibrium', 'dreht sich nicht: Es ist im stabilen Gleichgewicht')], ['unstable', L('does not turn: it is in an unstable equilibrium', 'dreht sich nicht: Es ist im labilen Gleichgewicht')]];
    return {
      kind: 'dipole', title: L('A dipole in a uniform field', 'Ein Dipol im homogenen Feld'),
      text: L(`<p>A dipole, a positive and a negative charge of the same size on a rod, is in a uniform field pointing ${dirName(Ed)}.</p>`, `<p>Ein Dipol, eine positive und eine negative Ladung gleichen Betrags an einem Stab, befindet sich in einem homogenen Feld, das ${dirName(Ed)} zeigt.</p>`),
      figs: fig(C.fig({ kind: 'uniform', E: Ed }, { box: BOX, lines: true, rods: [[-h * p[0], -h * p[1], h * p[0], h * p[1]]], parts: [{ x: h * p[0], y: h * p[1], q: 1 }, { x: -h * p[0], y: -h * p[1], q: -1 }], W: 320 })),
      questions: [
        choice('F', L('(a) The net force on the dipole', '(a) Die Gesamtkraft auf den Dipol'), r.shuffle(F.map(([label, ok]) => ({ label, ok, tag: ok ? undefined : 'force', why: ok ? '' : howF })))),
        choice('T', L('(b) The dipole', '(b) Der Dipol'), T.map(([k, label]) => ({ label, ok: k === turn, tag: k === turn ? undefined : 'torque', why: k === turn ? '' : howT }))),
      ],
      hints: [L('Draw the force on each end: <span class="vec"><i>F</i></span> = q·<span class="vec"><i>E</i></span>.', 'Zeichne die Kraft auf jedes Ende: <span class="vec"><i>F</i></span> = q·<span class="vec"><i>E</i></span>.'), L('Equal and opposite forces that do not act along the same line make a torque.', 'Gleich grosse, entgegengesetzte Kräfte, die nicht auf derselben Geraden wirken, erzeugen ein Drehmoment.')],
      solution: [howF, howT], p: { E: dkey(Ed), ang },
    };
  }

  // two situations side by side: a table with a row for each quantity
  const cmpTable = (heads, rows) => `<table class="cmp"><thead><tr><th></th>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(([n, ...v]) => `<tr><th>${n}</th>${v.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const times = (f, sym) => (Math.abs(f - 1) < 1e-9 ? it(sym) : f > 1 ? `${nice(f)}${it(sym)}` : `${it(sym)}/${nice(1 / f)}`);
  const whole = (x) => [x, 1 / x].some((y) => Math.abs(y - Math.round(y)) < 1e-9);
  const FILL = [2, 0.5, 4, 0.25, 1, 3, 1 / 3, 6, 1 / 6, 8, 1 / 8];
  // the right factor, the tempting ones ([x, why, tag, nudge]: nudge, if given, is the feedback in
  // practice instead of the why), then fillers: four options in order
  function factors(right, tempt, how) {
    const out = [{ x: right, ok: true }];
    for (const [x, why, tag, nudge] of tempt) if (out.length < 4 && whole(x) && !out.some((o) => Math.abs(o.x - x) < 1e-9)) out.push({ x, why: `${why} ${how}`, tag, nudge });
    for (const x of FILL) if (out.length < 4 && !out.some((o) => Math.abs(o.x - x) < 1e-9)) out.push({ x, why: how, tag: 'other' });
    return out.sort((p, q) => p.x - q.x).map((o) => ({ label: frac(o.x), ok: !!o.ok, tag: o.ok ? undefined : o.tag, why: o.ok ? '' : o.why, ...(o.nudge && !o.ok ? { nudge: o.nudge } : {}) }));
  }
  // The torque M = q·E·d·sin φ of two dipoles compared (φ: between the rod and the field).
  const SIN = { 90: 1, 30: 0.5, 150: 0.5 };
  function dipoleTorque(seed) {
    const r = rng(seed * 107 + 71);
    let f, a1, a2, k;
    for (;;) {
      f = { q: r.pick([1, 1, 2, 3, 0.5]), d: r.pick([1, 1, 2, 0.5]), E: r.pick([1, 1, 2, 3, 0.5]) };
      a1 = r.pick([90, 90, 30]); a2 = r.pick([90, 30, 150]);
      k = (f.q * f.d * f.E * SIN[a2]) / SIN[a1];
      const n = Object.values(f).filter((x) => x !== 1).length + (a1 !== a2 ? 1 : 0);
      if (n >= 2 && n <= 3 && whole(k) && k <= 12 && k >= 1 / 12) break;
    }
    const parts = [];
    if (f.q !== 1) parts.push(L(`the charge ${frac(f.q)}`, `die Ladung ${frac(f.q)}`));
    if (f.d !== 1) parts.push(L(`the length ${frac(f.d)}`, `die Länge ${frac(f.d)}`));
    if (f.E !== 1) parts.push(L(`the field ${frac(f.E)}`, `das Feld ${frac(f.E)}`));
    if (a1 !== a2) parts.push(L(`sin ${a2}° / sin ${a1}° = ${nice(SIN[a2])}/${nice(SIN[a1])}, so ${frac(SIN[a2] / SIN[a1])}`, `sin ${a2}° / sin ${a1}° = ${nice(SIN[a2])}/${nice(SIN[a1])}, also ${frac(SIN[a2] / SIN[a1])}`));
    const how = L(`Each end feels the force q·E; the lever arm of the pair is d·sin φ, so M = q·E·d·sin φ: ${parts.join('; ')}. Together: ${frac(k)}.`, `Jedes Ende spürt die Kraft q·E; der Hebelarm des Paars ist d·sin φ, also M = q·E·d·sin φ: ${parts.join('; ')}. Zusammen: ${frac(k)}.`);
    const tempt = [
      [(f.q * f.d * f.E), L('The angle counts: the torque is largest at right angles to the field and zero along it.', 'Der Winkel zählt: Das Drehmoment ist senkrecht zum Feld am grössten und längs des Feldes null.'), 'angle',
        L('Does the angle between the rod and the field matter? Compare the two angles.', 'Spielt der Winkel zwischen Stab und Feld eine Rolle? Vergleiche die beiden Winkel.')],
      [(f.q * f.E * SIN[a2]) / (f.d * SIN[a1]), L('A longer rod gives a longer lever arm: more torque.', 'Ein längerer Stab ergibt einen längeren Hebelarm: mehr Drehmoment.'), 'torque',
        L('How does the lever arm depend on the length of the rod?', 'Wie hängt der Hebelarm von der Länge des Stabs ab?')],
      [1 / k, L('Upside down.', 'Gerade umgekehrt.'), 'other', L('Check the way round: the question compares dipole 2 with dipole 1.', 'Prüfe die Richtung des Vergleichs: Gefragt ist Dipol 2 verglichen mit Dipol 1.')],
    ];
    const rows = [
      [L('charge at each end', 'Ladung an jedem Ende'), `±${it('q')}`, `±${times(f.q, 'q')}`],
      [L('length of the rod', 'Länge des Stabs'), it('d'), times(f.d, 'd')],
      [L('field', 'Feld'), it('E'), times(f.E, 'E')],
      [L('angle between the rod and the field', 'Winkel zwischen Stab und Feld'), `${a1}°`, `${a2}°`],
    ];
    const p = [Math.cos((a1 * Math.PI) / 180), Math.sin((a1 * Math.PI) / 180)], h = 0.7;
    return {
      kind: 'dipole', title: L('The torque on a dipole', 'Das Drehmoment auf einen Dipol'),
      text: L('<p>Two dipoles 1 and 2 are each in a uniform field. The table compares them; the figure shows dipole 1.</p>', '<p>Zwei Dipole 1 und 2 befinden sich je in einem homogenen Feld. Die Tabelle vergleicht sie; die Abbildung zeigt Dipol 1.</p>')
        + cmpTable([L('dipole 1', 'Dipol 1'), L('dipole 2', 'Dipol 2')], rows),
      figs: fig(C.fig({ kind: 'uniform', E: [1, 0] }, { box: BOX, lines: true, rods: [[-h * p[0], -h * p[1], h * p[0], h * p[1]]], parts: [{ x: h * p[0], y: h * p[1], q: 1 }, { x: -h * p[0], y: -h * p[1], q: -1 }], vecs: [{ x: h * p[0], y: h * p[1], dx: 46, dy: 0, cls: 'v-force', name: 'F⃗' }, { x: -h * p[0], y: -h * p[1], dx: -46, dy: 0, cls: 'v-force', name: 'F⃗' }], W: 320, label: L('Dipole 1 in the field', 'Dipol 1 im Feld') })),
      questions: [choice('M', L('Compared with dipole 1, the torque on dipole 2 is', 'Verglichen mit Dipol 1 ist das Drehmoment auf Dipol 2'), factors(k, tempt, how))],
      hints: [L('Two forces q·E, equal and opposite; their lever arm is the distance between their lines of action, d·sin φ.', 'Zwei Kräfte q·E, gleich gross und entgegengesetzt; ihr Hebelarm ist der Abstand ihrer Wirkungslinien, d·sin φ.'), L('M = q·E·d·sin φ: find the factor of each quantity. sin 90° = 1, sin 30° = sin 150° = 1/2.', 'M = q·E·d·sin φ: Bestimme den Faktor jeder Grösse. sin 90° = 1, sin 30° = sin 150° = 1/2.')],
      solution: [how], p: { f: [f.q, f.d, f.E].join(','), a1, a2 },
    };
  }
  // A dipole along the line to a point charge: given which end is nearer and the sign of the
  // charge, the net force (ask 'F'); or, from the way the dipole is pushed or pulled, which end is
  // nearer ('end': the ends' signs hidden) or the sign of the charge ('Q': the charge grey, no lines)
  function dipolePoint(seed) {
    const r = rng(seed * 83 + 53), Q = r.pick([1, -1]), plusNear = r.next() < 0.5, ask = r.pick(['F', 'end', 'Q']);
    const c = { kind: 'points', charges: [{ q: Q * 2, x: -1.8, y: 0, name: 'Q' }] }, xn = 0.3, xf = 1.5;
    const near = plusNear ? 1 : -1, attract = near * Q < 0;
    const parts = [{ x: xn, y: 0, q: near, sym: ask === 'end' ? '?' : undefined }, { x: xf, y: 0, q: -near, sym: ask === 'end' ? '?' : undefined }];
    const how = L(`The end nearer the charge is in the stronger field (the lines are denser there). Its ${near > 0 ? 'positive' : 'negative'} end is nearer the ${Q > 0 ? 'positive' : 'negative'} charge, so the stronger force ${attract ? 'pulls it towards' : 'pushes it away from'} the charge.`, `Das Ende näher bei der Ladung ist im stärkeren Feld (die Linien sind dort dichter). Sein ${near > 0 ? 'positives' : 'negatives'} Ende ist näher bei der ${Q > 0 ? 'positiven' : 'negativen'} Ladung, also ${attract ? 'zieht' : 'stösst'} die stärkere Kraft ihn ${attract ? 'zur Ladung hin' : 'von der Ladung weg'}.`);
    const howFree = L('A dipole that can turn freely first turns its end of the opposite sign towards the charge; then it is attracted. That is why a charged rod attracts neutral scraps of paper.', 'Ein Dipol, der sich frei drehen kann, dreht zuerst sein Ende mit dem entgegengesetzten Vorzeichen zur Ladung; dann wird er angezogen. Darum zieht ein geladener Stab neutrale Papierschnipsel an.');
    const decides = L('The end nearer the charge is in the stronger field (the lines are denser there): the force on it is the larger one and decides which way the dipole moves.', 'Das Ende näher bei der Ladung ist im stärkeren Feld (die Linien sind dort dichter): Die Kraft darauf ist die grössere und entscheidet, wohin sich der Dipol bewegt.');
    const notCancel = L('In a field that is not uniform, the forces on the two ends are not equal.', 'In einem nicht homogenen Feld sind die Kräfte auf die beiden Enden nicht gleich.');
    let text, figs, qa, sol;
    if (ask === 'F') {
      text = L(`<p>A dipole is held near a ${Q > 0 ? 'positive' : 'negative'} point charge, along the line to it, its ${near > 0 ? 'positive' : 'negative'} end nearer.</p>`, `<p>Ein Dipol wird nahe einer ${Q > 0 ? 'positiven' : 'negativen'} Punktladung gehalten, längs der Geraden zu ihr, mit dem ${near > 0 ? 'positiven' : 'negativen'} Ende näher.</p>`);
      figs = fig(C.fig(c, { box: BOX, lines: true, lineOpts: { per: 6 }, labels: [label(Q * 2)], rods: [[xn, 0, xf, 0]], parts, W: 340 }));
      qa = choice('F', L('(a) The net force on the dipole points', '(a) Die Gesamtkraft auf den Dipol zeigt'), words(r, [[L('towards the charge', 'zur Ladung hin'), attract, how], [L('away from the charge', 'von der Ladung weg'), !attract, how], [L('nowhere: it is zero', 'nirgends hin: Sie ist null'), false, `${notCancel} ${how}`]]));
      sol = how;
    } else if (ask === 'end') {
      // which end is nearer: the force on the nearer end has the direction of the net force
      sol = L(`${decides} The dipole ${attract ? 'is pulled towards' : 'is pushed away from'} the ${Q > 0 ? 'positive' : 'negative'} charge, so its nearer end is ${attract ? 'attracted' : 'repelled'} by it: it is ${attract === (Q > 0) ? 'negative' : 'positive'}.`,
        `${decides} Der Dipol ${attract ? 'wird zur' : 'wird von der'} ${Q > 0 ? 'positiven' : 'negativen'} Ladung ${attract ? 'hingezogen' : 'weggestossen'}, also wird sein näheres Ende von ihr ${attract ? 'angezogen' : 'abgestossen'}: Es ist ${attract === (Q > 0) ? 'negativ' : 'positiv'}.`);
      text = L(`<p>A dipole is held near a ${Q > 0 ? 'positive' : 'negative'} point charge, along the line to it; the signs of its ends are hidden. When it is let go, it ${attract ? 'is pulled towards' : 'is pushed away from'} the charge.</p>`, `<p>Ein Dipol wird nahe einer ${Q > 0 ? 'positiven' : 'negativen'} Punktladung gehalten, längs der Geraden zu ihr; die Vorzeichen seiner Enden sind verdeckt. Losgelassen ${attract ? 'wird er zur Ladung hingezogen' : 'wird er von der Ladung weggestossen'}.</p>`);
      figs = fig(C.fig(c, { box: BOX, lines: true, lineOpts: { per: 6 }, labels: [label(Q * 2)], rods: [[xn, 0, xf, 0]], parts, W: 340 }));
      qa = choice('end', L('(a) The end of the dipole nearer the charge is', '(a) Das Ende des Dipols näher bei der Ladung ist'), words(r, [[L('its positive end', 'sein positives Ende'), near > 0, sol], [L('its negative end', 'sein negatives Ende'), near < 0, sol], [L('cannot be told: the forces on the two ends cancel', 'nicht zu sagen: Die Kräfte auf die beiden Enden heben sich auf'), false, `${notCancel} ${sol}`]]));
    } else {
      // the sign of the charge: the nearer end is pulled towards an unlike charge, pushed away from a like one
      sol = L(`${decides} The dipole ${attract ? 'is pulled towards' : 'is pushed away from'} the charge, so its nearer, ${near > 0 ? 'positive' : 'negative'} end is ${attract ? 'attracted' : 'repelled'}: the charge Q is ${Q > 0 ? 'positive' : 'negative'}.`,
        `${decides} Der Dipol ${attract ? 'wird zur Ladung hingezogen' : 'wird von der Ladung weggestossen'}, also wird sein näheres, ${near > 0 ? 'positives' : 'negatives'} Ende ${attract ? 'angezogen' : 'abgestossen'}: Die Ladung Q ist ${Q > 0 ? 'positiv' : 'negativ'}.`);
      text = L(`<p>A dipole is held near a point charge Q, along the line to it, its ${near > 0 ? 'positive' : 'negative'} end nearer. When it is let go, it ${attract ? 'is pulled towards' : 'is pushed away from'} the charge.</p>`, `<p>Ein Dipol wird nahe einer Punktladung Q gehalten, längs der Geraden zu ihr, mit dem ${near > 0 ? 'positiven' : 'negativen'} Ende näher. Losgelassen ${attract ? 'wird er zur Ladung hingezogen' : 'wird er von der Ladung weggestossen'}.</p>`);
      figs = fig(C.fig(c, { box: BOX, unknown: true, rods: [[xn, 0, xf, 0]], parts, W: 340 }));
      qa = choice('Q', L('(a) The charge Q is', '(a) Die Ladung Q ist'), words(r, [[L('positive', 'positiv'), Q > 0, sol], [L('negative', 'negativ'), Q < 0, sol], [L('cannot be told: a dipole is always pulled towards a charge', 'nicht zu sagen: Ein Dipol wird immer zu einer Ladung hingezogen'), false, L(`Only a dipole that can turn freely is always attracted in the end; this one is held along the line. ${sol}`, `Nur ein Dipol, der sich frei drehen kann, wird am Ende immer angezogen; dieser wird längs der Geraden gehalten. ${sol}`)]]));
    }
    return {
      kind: 'dipole', title: L('A dipole near a charge', 'Ein Dipol nahe einer Ladung'), text, figs,
      questions: [
        qa,
        choice('free', L('(b) If the dipole could turn freely, it would in the end be', '(b) Könnte sich der Dipol frei drehen, würde er schliesslich'), words(r, [[L('attracted', 'angezogen'), true, ''], [L('repelled', 'abgestossen'), false, howFree], [L('neither', 'weder noch'), false, howFree]])),
      ],
      hints: [L('The field of a point charge gets weaker with the distance.', 'Das Feld einer Punktladung wird mit dem Abstand schwächer.'), L('Which end of the dipole feels the stronger force?', 'Welches Ende des Dipols spürt die stärkere Kraft?')],
      solution: [sol, howFree], p: ask === 'F' ? { Q, plusNear } : { Q, plusNear, ask },
    };
  }

  // ---------------------------------------------------------------- equipotentials
  const EQ = {
    point: { c: { kind: 'points', charges: [{ q: 1, x: 0, y: 0 }] }, lv: [0.4, 0.6, 0.9, 1.4, 2.4], name: () => L('a positive point charge', 'eine positive Punktladung') },
    dipole: { c: { kind: 'points', charges: [{ q: 1, x: -1, y: 0 }, { q: -1, x: 1, y: 0 }] }, lv: [-1.6, -0.8, -0.4, -0.15, 0, 0.15, 0.4, 0.8, 1.6], name: () => L('a positive and a negative charge (a dipole)', 'eine positive und eine negative Ladung (ein Dipol)') },
    like: { c: { kind: 'points', charges: [{ q: 1, x: -1, y: 0 }, { q: 1, x: 1, y: 0 }] }, lv: [0.6, 0.85, 1, 1.2, 1.6, 2.4], name: () => L('two equal positive charges', 'zwei gleiche positive Ladungen') },
    plates: { c: CAP(1), lv: null, name: () => L('a plate capacitor', 'einen Plattenkondensator') },
  };
  const WHYE = {
    even: () => L('Around a point charge, V = k·Q/r: for equal steps of potential, the circles get farther apart outwards.', 'Um eine Punktladung ist V = k·Q/r: Für gleiche Potentialschritte liegen die Kreise nach aussen immer weiter auseinander.'),
    lines: () => L('These are field lines, not equipotentials: equipotentials cross the field lines at right angles.', 'Das sind Feldlinien, keine Äquipotentiallinien: Äquipotentiallinien kreuzen die Feldlinien senkrecht.'),
    swap: () => L('This pattern belongs to another arrangement.', 'Dieses Muster gehört zu einer anderen Anordnung.'),
    bunched: () => L('Between the plates the field is uniform: for equal steps of potential the equipotentials are equally far apart.', 'Zwischen den Platten ist das Feld homogen: Für gleiche Potentialschritte liegen die Äquipotentiallinien gleich weit auseinander.'),
  };
  // the nudges in practice where the why would give the right diagram away
  const NUDGEE = {
    even: () => L('These circles are evenly spaced. How does V = k·Q/r change with the distance, and what does that mean for equal steps of potential?', 'Diese Kreise liegen gleich weit auseinander. Wie ändert sich V = k·Q/r mit dem Abstand, und was bedeutet das für gleiche Potentialschritte?'),
    bunched: () => L('What is the field like between the plates? What does that mean for the spacing of the equipotentials?', 'Wie ist das Feld zwischen den Platten? Was bedeutet das für die Abstände der Äquipotentiallinien?'),
  };
  function equiPick(seed) {
    const r = rng(seed * 53 + 23), key = r.pick(Object.keys(EQ)), Q = EQ[key], box = BOX, small = (c, o) => C.fig(c, { box, small: true, ...o });
    const cp = key === 'plates', right = { html: small(Q.c, cp ? { given: capEqui(Q.c), equiLines: true } : { equi: Q.lv }), ok: true }, cands = [];
    cands.push({ html: small(Q.c, { given: cp ? capLines(Q.c) : C.lines(Q.c, box), equiLines: true }), tag: 'lines' });
    if (key === 'point') cands.push({ html: small(Q.c, { circles: [0.5, 1, 1.5, 2, 2.5] }), tag: 'even' }, { html: small(Q.c, { equi: EQ.dipole.lv, alt: EQ.dipole.c }), tag: 'swap' });
    if (key === 'dipole') cands.push({ html: small(Q.c, { equi: EQ.like.lv, alt: EQ.like.c }), tag: 'swap' }, { html: small(Q.c, { circles: [0.4, 0.8, 1.2], centres: [[-1, 0], [1, 0]] }), tag: 'even' });
    if (key === 'like') cands.push({ html: small(Q.c, { equi: EQ.dipole.lv, alt: EQ.dipole.c }), tag: 'swap' }, { html: small(Q.c, { circles: [0.4, 0.8, 1.2], centres: [[-1, 0], [1, 0]] }), tag: 'even' });
    if (cp) cands.push({ html: small(Q.c, { given: capEqui(Q.c, [-0.62, -0.5, -0.3, 0, 0.3, 0.5, 0.62]), equiLines: true }), tag: 'bunched' }, { html: small(Q.c, { equi: EQ.dipole.lv, alt: EQ.dipole.c }), tag: 'swap' });
    const opts = [right, ...cands.slice(0, 3)];
    return {
      kind: 'equi', title: L('Equipotential lines', 'Äquipotentiallinien'),
      text: L(`<p>Which diagram shows equipotential lines (equal steps of potential) of ${Q.name()}?</p>`, `<p>Welches Diagramm zeigt Äquipotentiallinien (gleiche Potentialschritte) für ${Q.name()}?</p>`), figs: '',
      questions: [{ type: 'pick', key: 'd', label: L('Which diagram is right?', 'Welches Diagramm stimmt?'), options: r.shuffle(opts).map((o) => ({ html: o.html, ok: !!o.ok, tag: o.tag, why: o.ok ? '' : `${WHYE[o.tag]()} ${PERP()}`, ...(!o.ok && NUDGEE[o.tag] ? { nudge: NUDGEE[o.tag]() } : {}) })) }],
      hints: [L('Sketch the field lines first; the equipotentials cross them at right angles.', 'Skizziere zuerst die Feldlinien; die Äquipotentiallinien kreuzen sie senkrecht.'), L('Around a single point charge, equipotentials are circles: V = k·Q/r.', 'Um eine einzelne Punktladung sind Äquipotentiallinien Kreise: V = k·Q/r.')],
      solution: [PERP()], solFig: fig(C.fig(Q.c, cp ? { box, given: capEqui(Q.c), equiLines: true, extra: capLines(Q.c) } : { box, equi: Q.lv, lines: true })), p: { key, s: seed % 5 },
    };
  }
  function linesEqui(seed) {
    const r = rng(seed * 59 + 29), kind = r.pick(['uniform', 'point']), hiLeft = r.next() < 0.5, box = BOX;
    let given, opts, how;
    if (kind === 'uniform') {
      const xs = [-2, -1, 0, 1, 2], vals = xs.map((x, i) => (hiLeft ? 400 - 100 * i : 100 * i)), Ed = hiLeft ? [1, 0] : [-1, 0];
      const lab = { tops: xs.map((x, i) => ({ x, label: `${vals[i]} V` })) };
      given = C.fig({ kind: 'uniform', E: Ed }, { box, given: xs.map((x) => [[x, -3], [x, 3]]), equiLines: true, ...lab });
      const horiz = [-1.6, -0.8, 0, 0.8, 1.6].map((y) => [[-3, y], [3, y]]), vert = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((x) => [[x, -3], [x, 3]]);
      const slant = [-3.2, -1.6, 0, 1.6, 3.2].map((b) => [[-3.5, -3.5 + b], [3.5, 3.5 + b]]);
      const draw = (lines, o = {}) => C.fig({ kind: 'uniform', E: Ed }, { box, given: xs.map((x) => [[x, -3], [x, 3]]), equiLines: true, extra: lines, small: true, ...lab, ...o });
      const fwd = (ls) => (Ed[0] > 0 ? ls : flipAll(ls)), back = (ls) => (Ed[0] > 0 ? flipAll(ls) : ls);
      opts = [{ html: draw(fwd(horiz)), ok: true }, { html: draw(back(horiz)), tag: 'up' }, { html: draw(vert), tag: 'along' }, { html: draw(fwd(slant)), tag: 'slant' }];
      how = L(`Field lines cross the equipotentials at right angles and point from high to low potential: ${hiLeft ? 'to the right' : 'to the left'}.`, `Feldlinien kreuzen die Äquipotentiallinien senkrecht und zeigen von hohem zu tiefem Potential: ${hiLeft ? 'nach rechts' : 'nach links'}.`);
    } else {
      const pos = hiLeft, c = { kind: 'points', charges: [{ q: pos ? 1 : -1, x: 0, y: 0 }] }, rs = [0.5, 0.9, 1.4, 2.1];
      const vlab = rs.map((rr) => ({ x: rr * 0.72, y: rr * 0.72, label: `${pos ? '+' : '−'}${nice(Math.round(90 / rr))} V` }));
      given = C.fig(c, { box, circles: rs, unknown: true, labelsAt: vlab });
      const rad = Array.from({ length: 8 }, (x, k) => { const a = (k * Math.PI) / 4 + 0.2; return [[0.15 * Math.cos(a), 0.15 * Math.sin(a)], [3.5 * Math.cos(a), 3.5 * Math.sin(a)]]; });
      const circ = [0.7, 1.15, 1.75].map((rr) => Array.from({ length: 61 }, (x, k) => [rr * Math.cos((k * Math.PI) / 30), rr * Math.sin((k * Math.PI) / 30)]));
      const slant = [-1.8, -1.2, -0.6, 0.6, 1.2, 1.8].map((y) => [[-3.5, y], [3.5, y]]);
      const draw = (lines, o = {}) => C.fig(c, { box, circles: rs, unknown: true, extra: lines, small: true, labelsAt: vlab, ...o });
      opts = [{ html: draw(pos ? rad : flipAll(rad)), ok: true }, { html: draw(pos ? flipAll(rad) : rad), tag: 'up' }, { html: draw(circ), tag: 'along' }, { html: draw(slant), tag: 'slant' }];
      how = L(`Field lines cross the equipotential circles at right angles: they run radially, from high to low potential, ${pos ? 'outwards (the charge is positive)' : 'inwards (the charge is negative)'}.`, `Feldlinien kreuzen die Äquipotentialkreise senkrecht: Sie verlaufen radial, von hohem zu tiefem Potential, ${pos ? 'nach aussen (die Ladung ist positiv)' : 'nach innen (die Ladung ist negativ)'}.`);
    }
    const W = {
      up: L('These point from low to high potential; the field points the other way.', 'Diese zeigen von tiefem zu hohem Potential; das Feld zeigt umgekehrt.'),
      along: L('These run along the equipotentials; field lines cross them at right angles.', 'Diese verlaufen längs der Äquipotentiallinien; Feldlinien kreuzen sie senkrecht.'),
      slant: L('These cross the equipotentials at an angle, not at right angles.', 'Diese kreuzen die Äquipotentiallinien schräg, nicht senkrecht.'),
    };
    // in practice, instead of the why of up (which says which way is right)
    const nudgeUp = L('These point from low to high potential. Does the field point towards higher or lower potential?', 'Diese zeigen von tiefem zu hohem Potential. Zeigt das Feld zu höherem oder zu tieferem Potential?');
    return {
      kind: 'equi', title: L('Field lines from equipotentials', 'Feldlinien aus Äquipotentiallinien'),
      text: L('<p>The figure shows equipotential lines (orange) with their potentials. Which diagram shows the field lines (blue)?</p>', '<p>Die Abbildung zeigt Äquipotentiallinien (orange) mit ihren Potentialen. Welches Diagramm zeigt die Feldlinien (blau)?</p>'),
      figs: fig(given),
      questions: [{ type: 'pick', key: 'd', label: L('Which diagram is right?', 'Welches Diagramm stimmt?'), options: r.shuffle(opts).map((o) => ({ html: o.html, ok: !!o.ok, tag: o.tag, why: o.ok ? '' : `${W[o.tag]} ${how}`, ...(o.tag === 'up' ? { nudge: nudgeUp } : {}) })) }],
      hints: [L('Field lines and equipotentials meet at right angles.', 'Feldlinien und Äquipotentiallinien treffen sich senkrecht.'), L('The field points from high to low potential.', 'Das Feld zeigt von hohem zu tiefem Potential.')],
      solution: [how], p: { kind, hiLeft, s: seed % 5 },
    };
  }

  // ---------------------------------------------------------------- find the error
  // A student's sketch of the field lines and equipotentials of two charges or a capacitor, with
  // one feature wrong: lines that cross, equipotentials along the field lines, arrows from − to +,
  // or lines that end in empty space.
  const FEAT = {
    cross: () => L('Two field lines cross.', 'Zwei Feldlinien kreuzen sich.'),
    equi: () => L('The equipotential lines run along the field lines, not across them.', 'Die Äquipotentiallinien verlaufen längs der Feldlinien, nicht quer zu ihnen.'),
    reverse: () => L('The arrows point from − to +.', 'Die Pfeile zeigen von − nach +.'),
    end: () => L('Field lines end in empty space.', 'Feldlinien enden im leeren Raum.'),
  };
  // what the sketch should show instead (the rule the wrong feature breaks)
  const RULES = {
    cross: () => L('Field lines never cross: at each point the field has only one direction, that of the sum of the fields of all the charges.', 'Feldlinien kreuzen sich nie: In jedem Punkt hat das Feld nur eine Richtung, die der Summe der Felder aller Ladungen.'),
    equi: () => L('Equipotential lines cross the field lines at right angles: moving along them, the field does no work.', 'Äquipotentiallinien kreuzen die Feldlinien senkrecht: Bewegt man sich längs ihnen, verrichtet das Feld keine Arbeit.'),
    reverse: () => L('Field lines run from + to −: the field points the way a positive charge would be pushed.', 'Feldlinien laufen von + nach −: Das Feld zeigt dorthin, wohin eine positive Ladung gedrückt würde.'),
    end: () => L('Field lines start and end only on charges (or leave the picture).', 'Feldlinien beginnen und enden nur auf Ladungen (oder verlassen das Bild).'),
  };
  // the features that are right in a sketch
  const FINE = {
    cross: () => L('no two field lines cross', 'kreuzen sich keine zwei Feldlinien'),
    equi: () => L('the equipotentials cross the field lines at right angles', 'kreuzen die Äquipotentiallinien die Feldlinien senkrecht'),
    reverse: () => L('the arrows point from + to −', 'zeigen die Pfeile von + nach −'),
    end: () => L('every field line runs from a charge to a charge or out of the picture', 'läuft jede Feldlinie von einer Ladung zu einer Ladung oder aus dem Bild'),
  };
  const ERRS = Object.keys(FEAT);
  // the sketch: { c, lv (the levels of its equipotentials), name, o (the options of C.fig) };
  // err null: the right sketch
  function sketch(key, err, flip) {
    let c = EQ[key].c, lv = EQ[key].lv, name = EQ[key].name();
    if (flip && key !== 'dipole') {
      // the other sign: two negative charges, or the capacitor upside down
      c = key === 'like' ? { kind: 'points', charges: c.charges.map((ch) => ({ ...ch, q: -ch.q })) } : { ...c, q: -c.q };
      if (lv) lv = lv.map((x) => -x).reverse();
      if (key === 'like') name = L('two equal negative charges', 'zwei gleiche negative Ladungen');
    }
    const cp = key === 'plates', fl = cp ? capLines(c) : C.lines(c, BOX, { per: 8 });
    // the field lines and the right equipotentials (of the capacitor drawn as lines)
    const draw = (lines, more = {}) => (cp ? { given: capEqui(c), equiLines: true, extra: lines, ...more } : { given: lines, equi: lv, ...more });
    let o = draw(fl);
    if (err === 'cross') o = draw(cp ? fl.concat([[-1.5, 0.1], [0.1, 1.3]].map(([a, b]) => [[a, c.q > 0 ? c.h : -c.h], [b, c.q > 0 ? -c.h : c.h]])) : c.charges.flatMap((ch) => C.lines({ kind: 'points', charges: [ch] }, BOX, { per: 8 })));
    else if (err === 'equi') o = { given: cp ? [-1.4, -0.7, 0, 0.7, 1.4].map((x) => [[x, -0.75], [x, 0.75]]) : C.lines(c, BOX, { per: 5, offset: 0.33 }), equiLines: true, extra: fl };
    else if (err === 'reverse') o = draw(fl, { reverse: true });
    else if (err === 'end') o = draw(fl.map((ln, i) => (i % 2 === 0 && (cp || ln.length > 30) ? (ln.length === 2 ? [ln[0], [ln[0][0], 0]] : ln.slice(0, Math.round(ln.length * 0.45))) : ln)));
    return { c, lv, name, o: { box: BOX, ...o } };
  }
  function error(seed) {
    const r = rng(seed * 113 + 79), key = r.pick(['dipole', 'like', 'plates']), err = r.pick(ERRS), flip = r.next() < 0.5 && key !== 'dipole';
    const { c, name, o } = sketch(key, err, flip);
    const how = `${L('Wrong', 'Falsch')}: ${FEAT[err]()} ${RULES[err]()}`;
    const check = L('Check the features one at a time: where the lines start and end, the arrows, crossings, and how the equipotentials meet the field lines.', 'Prüfe die Merkmale einzeln: wo die Linien beginnen und enden, die Pfeile, Kreuzungen, und wie die Äquipotentiallinien die Feldlinien treffen.');
    return {
      kind: 'error', title: L('Find the error', 'Finde den Fehler'),
      text: L(`<p>A student sketched the field lines (blue) and the equipotential lines (orange) of ${name}. One feature of the sketch is wrong.</p>`, `<p>Eine Schülerin hat die Feldlinien (blau) und die Äquipotentiallinien (orange) für ${name} skizziert. Ein Merkmal der Skizze ist falsch.</p>`),
      figs: fig(C.fig(c, { ...o, label: L('A student’s sketch', 'Die Skizze einer Schülerin') })),
      questions: [choice('err', L('Which feature is wrong?', 'Welches Merkmal ist falsch?'), ERRS.map((k) => ({ label: FEAT[k](), ok: k === err, tag: k === err ? undefined : 'other', why: k === err ? '' : L(`Not this: in the sketch, ${FINE[k]()}. ${check}`, `Nicht das: In der Skizze ${FINE[k]()}. ${check}`) })))],
      hints: [check, LINES(), PERP()],
      solution: [how, L('The right sketch:', 'Die richtige Skizze:')], solFig: fig(C.fig(c, sketch(key, null, flip).o)), p: { key, err, flip },
    };
  }

  // ---------------------------------------------------------------- statements
  const BANK = [
    [() => L('Field lines can cross where two fields meet.', 'Feldlinien können sich kreuzen, wo zwei Felder aufeinandertreffen.'), false, () => L('The fields add up to one field with one direction at each point.', 'Die Felder addieren sich zu einem Feld mit einer Richtung in jedem Punkt.')],
    [() => L('Field lines start at positive charges and end at negative ones.', 'Feldlinien beginnen bei positiven Ladungen und enden bei negativen.'), true, () => L('Or they go on to infinity.', 'Oder sie gehen ins Unendliche.')],
    [() => L('Where the field lines are denser, the field is stronger.', 'Wo die Feldlinien dichter sind, ist das Feld stärker.'), true, () => L('The density of the lines shows the strength.', 'Die Dichte der Linien zeigt die Stärke.')],
    [() => L('Between two field lines there is no field.', 'Zwischen zwei Feldlinien gibt es kein Feld.'), false, () => L('The field is everywhere; a drawing shows only a few of the lines.', 'Das Feld ist überall; eine Zeichnung zeigt nur einige der Linien.')],
    [() => L('A charge released at rest moves along a field line.', 'Eine in Ruhe losgelassene Ladung bewegt sich längs einer Feldlinie.'), false, () => L('Only in a uniform field or along a straight line; in general its path bends away from curved field lines.', 'Nur in einem homogenen Feld oder längs einer geraden Linie; im Allgemeinen weicht ihre Bahn von gekrümmten Feldlinien ab.')],
    [() => L('The field lines of a single positive charge are straight and point radially outwards.', 'Die Feldlinien einer einzelnen positiven Ladung sind gerade und zeigen radial nach aussen.'), true, () => L('By symmetry.', 'Aus Symmetriegründen.')],
    [() => L('The field of a point charge points towards the charge if the charge is positive.', 'Das Feld einer Punktladung zeigt zur Ladung hin, wenn die Ladung positiv ist.'), false, () => L('It points away from a positive charge.', 'Es zeigt von einer positiven Ladung weg.')],
    [() => L('In a drawing of field lines, a charge of +2q has twice as many lines as a charge of +q.', 'In einer Zeichnung der Feldlinien hat eine Ladung von +2q doppelt so viele Linien wie eine Ladung von +q.'), false, () => L('In space, the number of lines is proportional to the charge, but a drawing shows only the lines in one plane: of twice as many lines in space, only about √2 times as many lie in that plane.', 'Im Raum ist die Zahl der Linien proportional zur Ladung, aber eine Zeichnung zeigt nur die Linien in einer Ebene: Von doppelt so vielen Linien im Raum liegen nur etwa √2-mal so viele in dieser Ebene.')],
    [() => L('Seen from the side, the field lines of a long charged wire are parallel; still, the field gets weaker with the distance.', 'Von der Seite gesehen sind die Feldlinien eines langen geladenen Drahts parallel; trotzdem wird das Feld mit dem Abstand schwächer.'), true, () => L('Round the wire the lines spread out like spokes: E ∝ 1/r.', 'Um den Draht herum laufen die Linien wie Speichen auseinander: E ∝ 1/r.')],
    [() => L('The field between the plates of a capacitor is strongest near the plates.', 'Das Feld zwischen den Platten eines Kondensators ist nahe bei den Platten am stärksten.'), false, () => L('It is uniform: the same everywhere between the plates.', 'Es ist homogen: überall zwischen den Platten gleich.')],
    [() => L('Outside a plate capacitor, away from its edges, there is (almost) no field.', 'Ausserhalb eines Plattenkondensators, weg von seinen Rändern, gibt es (fast) kein Feld.'), true, () => L('There the fields of the two plates cancel.', 'Dort heben sich die Felder der beiden Platten auf.')],
    [() => L('A dipole in a uniform field feels no net force.', 'Ein Dipol in einem homogenen Feld spürt keine Gesamtkraft.'), true, () => L('The forces on its ends are equal and opposite; there can be a torque.', 'Die Kräfte auf seine Enden sind gleich und entgegengesetzt; es kann ein Drehmoment geben.')],
    [() => L('A dipole in a uniform field cannot turn.', 'Ein Dipol in einem homogenen Feld kann sich nicht drehen.'), false, () => L('The two forces make a torque that turns its + end towards the field direction.', 'Die beiden Kräfte erzeugen ein Drehmoment, das sein +-Ende in Feldrichtung dreht.')],
    [() => L('The torque on a dipole is largest when it points along the field.', 'Das Drehmoment auf einen Dipol ist am grössten, wenn er in Feldrichtung zeigt.'), false, () => L('Along the field it is zero; it is largest at right angles to the field (sin 90° = 1).', 'In Feldrichtung ist es null; am grössten ist es senkrecht zum Feld (sin 90° = 1).')],
    [() => L('A charged rod attracts neutral scraps of paper.', 'Ein geladener Stab zieht neutrale Papierschnipsel an.'), true, () => L('The charges in the paper shift (it becomes a dipole), and the nearer, opposite charge is attracted more strongly.', 'Die Ladungen im Papier verschieben sich (es wird ein Dipol), und die nähere, entgegengesetzte Ladung wird stärker angezogen.')],
    [() => L('Moving a charge along an equipotential line needs no work.', 'Eine Ladung längs einer Äquipotentiallinie zu bewegen, braucht keine Arbeit.'), true, () => L('The potential, and so the potential energy, stays the same.', 'Das Potential, und damit die potentielle Energie, bleibt gleich.')],
    [() => L('Equipotential lines and field lines meet at right angles.', 'Äquipotentiallinien und Feldlinien treffen sich senkrecht.'), true, () => L('Along an equipotential line the field does no work.', 'Längs einer Äquipotentiallinie verrichtet das Feld keine Arbeit.')],
    [() => L('Around a point charge, equipotential circles for equal steps of potential are equally spaced.', 'Um eine Punktladung liegen Äquipotentialkreise für gleiche Potentialschritte gleich weit auseinander.'), false, () => L('V ∝ 1/r: they get farther apart outwards.', 'V ∝ 1/r: Sie liegen nach aussen immer weiter auseinander.')],
    [() => L('Where the equipotential lines are closer together, the field is stronger.', 'Wo die Äquipotentiallinien dichter liegen, ist das Feld stärker.'), true, () => L('E = |ΔV|/Δx: the same ΔV over a shorter distance.', 'E = |ΔV|/Δx: dasselbe ΔV auf kürzerer Strecke.')],
    [() => L('Between the plates of a capacitor, the equipotential lines are parallel to the plates.', 'Zwischen den Platten eines Kondensators sind die Äquipotentiallinien parallel zu den Platten.'), true, () => L('They cross the field lines, which run from plate to plate, at right angles.', 'Sie kreuzen die Feldlinien, die von Platte zu Platte laufen, senkrecht.')],
  ];
  function statements(seed) {
    const r = rng(seed * 101 + 67);
    for (;;) {
      const pick = r.shuffle(BANK.slice()).slice(0, 5);
      if (pick.every((s) => s[1]) || pick.every((s) => !s[1])) continue;
      return {
        kind: 'stmts', title: L('Which statements are correct?', 'Welche Aussagen sind richtig?'), text: L('<p>Tick all the statements that are correct.</p>', '<p>Kreuze alle richtigen Aussagen an.</p>'), figs: '',
        questions: [{ type: 'multi', key: 's', label: L('Which statements are correct?', 'Welche Aussagen sind richtig?'), statements: pick.map(([h, ok, why]) => ({ html: h(), ok, why: why() })) }],
        hints: [LINES(), PERP()], solution: pick.map(([h, ok, why]) => `${ok ? '✓' : '✗'} ${h()} ${why()}`), p: { s: pick.map((x) => BANK.indexOf(x)) },
      };
    }
  }

  const TYPES = {
    'lines-pick': [2, linesPick], 'lines-wire': [2, (s) => linesShape(s, 'wire')], 'lines-cap': [2, (s) => linesShape(s, 'cap')], 'lines-read': [3, linesRead],
    'dipole-uniform': [2, dipoleUniform], 'dipole-torque': [3, dipoleTorque], 'dipole-point': [4, dipolePoint],
    'equi-pick': [2, equiPick], 'lines-equi': [2, linesEqui], error: [3, error], stmts: [2, statements],
  };
  function make(type, seed) {
    const [difficulty, f] = TYPES[type];
    return { ...f(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }

  const api = { TYPES: Object.keys(TYPES), make, LINES, PERP, label, pts2, BOX, frac, EQ, CAP, capLines, capEqui, wire, XS, FEAT, sketch };
  root.FieldEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
