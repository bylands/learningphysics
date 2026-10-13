// Probe exercises of Field Lines and Equipotentials: the student measures with a virtual probe in
// a figure whose charges are hidden, and builds a map of the field or the potential.
//   probe-field   a field probe: an arrow (direction; its length grows with the logarithm of the
//                 strength) and |E| in kN/C. Two hidden point charges A and B: (a) their signs and
//                 sizes, (b) which of four marked points is where the field is zero
//   probe-pot     a potential probe: the potential V in volts, each reading a labelled dot. Two
//                 hidden point charges ((a) signs and sizes) or a plate capacitor with its signs
//                 hidden, the lower plate at 0 V ((a) which plate is positive, (b) the field from
//                 two readings); then the direction of the field at a marked point P
// Units: one drawing unit is 1 cm, charges in units of q = 1 nC, so E = k·q/r² and V = k·q/r with
// k = 8.99·10⁹ N·m²/C². The capacitor is ideal: between its plates V rises evenly from 0 V.
// The figure is an SVG from Charges.fig, its <svg> carrying data-probe, JSON of
//   { kind: 'field' | 'pot', c (the configuration: { kind: 'points', charges } or
//     { kind: 'plates', h, w, q, U }, U the upper plate's potential in V), box, W, H,
//     region [x0, x1, y0, y1] (where the probe measures), snap [{ x, y, name }] (marked points the
//     probe snaps to), grid (positions rounded to it, 0: none), bottom (the lower plate's name) }
// Probe.wire(rootEl) makes such figures interactive in the browser (pointer, touch and keyboard).
//   Probe.TYPES = { 'probe-field': [3, fn], 'probe-pot': [3, fn] }, fn(seed) → the exercise
//   Probe.measure(data, x, y) → { E: [Ex, Ey] (N/C), mag (N/C), V (V) } or { near } / { out }
(function (root) {
  'use strict';

  const Lang = root.Lang || require('./lang.js');
  const El = root.Elec || require('./elec.js');
  const C = root.Charges || require('./charges.js');
  const { L, rng, dirName, nice, choice, tiles } = El;
  const BOX = [-3, 3, -2.2, 2.2], W = 380;
  const K = 8.99e9, KE = (K * 1e-9) / 1e-4, KV = (K * 1e-9) / 1e-2; // a k = 1 unit in N/C and in V
  const fig = (html) => `<div class="fig probe-fig">${html}</div>`;
  const f1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const minus = (s) => String(s).replace(/-/g, '−');

  // ---------------------------------------------------------------- measuring
  function measure(d, x, y) {
    const c = d.c;
    if (c.kind === 'plates') {
      const [x0, x1, y0, y1] = d.region;
      if (x < x0 - 1e-9 || x > x1 + 1e-9 || y < y0 - 1e-9 || y > y1 + 1e-9) return { out: true };
      const ey = -c.U / (2 * c.h * 0.01);
      return { E: [0, ey], mag: Math.abs(ey), V: (c.U * (y + c.h)) / (2 * c.h) };
    }
    if (c.charges.some((s) => Math.hypot(x - s.x, y - s.y) < 0.2)) return { near: true };
    const [ex, ey] = C.field(c, x, y);
    return { E: [ex * KE, ey * KE], mag: Math.hypot(ex, ey) * KE, V: C.potential(c, x, y) * KV };
  }
  // |E| in kN/C with 2 significant figures; V in volts with 3, signed
  const fmtE = (n) => (n < 5e-3 ? '0' : String(Number((n / 1000).toPrecision(2))));
  const fmtV = (v) => (Math.abs(v) < 5e-3 ? '0' : `${v > 0 ? '+' : '−'}${Number(Math.abs(v).toPrecision(3))}`);
  const kNC = (n) => `${fmtE(n)} kN/C`;
  const volts = (v) => `${fmtV(v)} V`;
  // the direction of a vector in words, to the nearest of the eight
  const roughly = (v) => { const k = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)); return dirName(El.DIRS[(k + 8) % 8]); };

  // ---------------------------------------------------------------- the figure
  const sz = (q) => `${q > 0 ? '+' : '−'}${Math.abs(q) === 1 ? '' : Math.abs(q)}q`;
  const signLbl = (q) => (q > 0 ? (q > 1 ? `+${q}` : '+') : q < -1 ? `−${-q}` : '−');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  // the SVG of Charges.fig made into a probe figure: its data, focusable, with the layers for the
  // readings, and the readout and the clear button under it
  function probeFig(svg, data, label) {
    const S = data.W / (data.box[1] - data.box[0]);
    data.H = Math.round((data.box[3] - data.box[2]) * S);
    const open = `<svg data-probe="${esc(JSON.stringify(data))}" tabindex="0" aria-roledescription="${esc(L('probe', 'Sonde'))}" class="ef probe`;
    const s = svg.replace('<svg class="ef', open).replace('role="img"', 'role="application"').replace(/<\/svg>$/, '<g class="pr-marks"></g><g class="pr-live"></g></svg>');
    return fig(`${s}<div class="probe-bar"><span class="probe-read" aria-live="polite">${label}</span><button type="button" class="probe-clear">${L('Clear', 'Löschen')}</button></div>`);
  }
  // the plates of a capacitor, their signs hidden, labelled with their names
  function plates(svg, c, names) {
    const S = W / (BOX[1] - BOX[0]), X = (x) => (x - BOX[0]) * S, Y = (y) => (BOX[3] - y) * S;
    let s = '';
    [c.h, -c.h].forEach((y, i) => { s += `<rect class="plate" x="${f1(X(-c.w))}" y="${f1(Y(y) - 3)}" width="${f1(2 * c.w * S)}" height="6"/>` + C.txt(X(c.w) + 8, Y(y) + 5, names[i], 'lbl name', 'start'); });
    return svg.replace(/<\/svg>$/, `${s}</svg>`);
  }

  // ---------------------------------------------------------------- the charges
  const sides = (r) => r.next() < 0.5;
  // two charges on a horizontal line: A and B (A left or right), their sizes from 1 to 3
  function pair(r, o) {
    const qa = r.pick([1, 2, 3]) * r.pick([1, -1]), qb = r.pick([1, 2, 3]) * r.pick([1, -1]);
    const d = r.pick(o.ds), y0 = r.pick([0, 0.4, -0.4]), cx = r.int(-10, 10) / 10, aLeft = sides(r);
    const xa = r2(cx + (aLeft ? -d / 2 : d / 2)), xb = r2(cx + (aLeft ? d / 2 : -d / 2));
    return { qa, qb, xa, xb, y0, d };
  }
  const realC = (P) => ({ kind: 'points', charges: [{ q: P.qa, x: P.xa, y: P.y0, name: 'A' }, { q: P.qb, x: P.xb, y: P.y0, name: 'B' }] });
  // the drawing: both grey and of the same size, only their names
  const hiddenC = (P) => ({ kind: 'points', charges: [{ q: 1, x: P.xa, y: P.y0, name: 'A' }, { q: 1, x: P.xb, y: P.y0, name: 'B' }] });
  // the four options of the charges: right, both signs swapped, sizes swapped (or, for equal
  // sizes, unequal ones), one sign wrong; how: { S, Q } the reasons, nudge: { swap, size, sign }
  function chargeOpts(r, P, how, nudge) {
    const { qa, qb } = P, sa = Math.sign(qa), sb = Math.sign(qb), na = Math.abs(qa), nb = Math.abs(qb);
    const opts = [{ a: qa, b: qb, ok: true }, { a: -qa, b: -qb, tag: 'swap' }];
    if (na !== nb) opts.push({ a: sa * nb, b: sb * na, tag: 'size' });
    else opts.push({ a: sa * (na === 1 ? 2 : na - 1), b: qb, tag: 'size' });
    opts.push(r.next() < 0.5 ? { a: -qa, b: qb, tag: 'sign' } : { a: qa, b: -qb, tag: 'sign' });
    return r.shuffle(opts).map((o) => ({ label: `A: ${sz(o.a)}, B: ${sz(o.b)}`, ok: !!o.ok, ...(o.ok ? { why: '' } : { tag: o.tag, why: o.tag === 'size' ? how.Q : how.S, nudge: nudge[o.tag] }) }));
  }
  const nm = (q) => (q > 0 ? L('positive', 'positiv') : L('negative', 'negativ'));

  // ---------------------------------------------------------------- the field probe
  // where the field of two charges on a line is zero (distance along the line from A), or null
  function zeroOf(P) {
    const { qa, qb, xa, xb } = P, d = Math.abs(xb - xa), u = Math.sign(xb - xa), na = Math.abs(qa), nb = Math.abs(qb);
    if (qa * qb > 0) return xa + u * (d * Math.sqrt(na)) / (Math.sqrt(na) + Math.sqrt(nb));
    if (na === nb) return null;
    // unlike: beyond the smaller one, at r from it with |q_s|/r² = |q_g|/(r + d)²
    const [xs, xg, k] = na < nb ? [xa, xb, nb / na] : [xb, xa, na / nb], rr = d / (Math.sqrt(k) - 1);
    return xs + Math.sign(xs - xg) * rr;
  }
  const WHYZ = {
    middle: () => L('Halfway between the charges the two fields point in opposite directions, but they are not equally strong: the bigger charge wins.', 'In der Mitte zwischen den Ladungen zeigen die beiden Felder in entgegengesetzte Richtungen, sind aber nicht gleich stark: Die grössere Ladung gewinnt.'),
    nearbig: () => L('Here, nearer the bigger charge, its field is the stronger one: the fields balance only farther from the bigger charge.', 'Hier, näher bei der grösseren Ladung, ist ihr Feld das stärkere: Die Felder sind erst weiter weg von der grösseren Ladung im Gleichgewicht.'),
    outside: () => L('Outside, beyond one of two like charges, both fields point the same way: they add up and cannot cancel.', 'Aussen, jenseits einer von zwei gleichnamigen Ladungen, zeigen beide Felder in dieselbe Richtung: Sie addieren sich und können sich nicht aufheben.'),
    between: () => L('Between two unlike charges both fields point the same way, away from the positive charge and towards the negative one: they add up.', 'Zwischen zwei ungleichnamigen Ladungen zeigen beide Felder in dieselbe Richtung, von der positiven Ladung weg und zur negativen hin: Sie addieren sich.'),
    bigside: () => L('Beyond the bigger charge its field always wins: there it is both bigger and nearer.', 'Jenseits der grösseren Ladung gewinnt immer ihr Feld: Dort ist sie grösser und erst noch näher.'),
    near: () => L('This close to the smaller charge its field is the stronger one; the two fields are equally strong only farther out.', 'So nahe bei der kleineren Ladung ist ihr Feld das stärkere; gleich stark sind die beiden Felder erst weiter aussen.'),
    offaxis: () => L('Off the line through the charges the two fields come from different directions: they are not opposite and cannot cancel.', 'Neben der Geraden durch die Ladungen kommen die beiden Felder aus verschiedenen Richtungen: Sie sind nicht entgegengesetzt und können sich nicht aufheben.'),
  };
  const NUDGEZ = {
    middle: () => L('Halfway between, which of the two fields is the stronger?', 'Welches der beiden Felder ist in der Mitte das stärkere?'),
    nearbig: () => L('So near the bigger charge, can the smaller one balance its field?', 'Kann die kleinere Ladung so nahe bei der grösseren deren Feld ausgleichen?'),
    outside: () => L('Beyond one of the charges, do the two fields point in opposite directions?', 'Zeigen die beiden Felder jenseits einer der Ladungen in entgegengesetzte Richtungen?'),
    between: () => L('Between the two charges, do their fields point in opposite directions?', 'Zeigen die Felder der beiden Ladungen zwischen ihnen in entgegengesetzte Richtungen?'),
    bigside: () => L('Beyond the bigger charge, can the smaller one balance its field?', 'Kann die kleinere Ladung jenseits der grösseren deren Feld ausgleichen?'),
    near: () => L('So close to the smaller charge, are the two fields equally strong?', 'Sind die beiden Felder so nahe bei der kleineren Ladung gleich stark?'),
    offaxis: () => L('Off the line through the charges, can two fields from different directions cancel?', 'Können sich neben der Geraden durch die Ladungen zwei Felder aus verschiedenen Richtungen aufheben?'),
  };
  function probeField(seed) {
    const r = rng(seed * 131 + 89), PN = ['P', 'Q', 'R', 'S'];
    for (;;) {
      const P = pair(r, { ds: [1.6, 2, 2.4] }), { qa, qb, xa, xb, y0 } = P;
      if (qa === -qb) continue; // no zero point within reach
      const xz = Number(zeroOf(P).toFixed(9)), c = realC(P);
      if (Math.max(Math.abs(xa), Math.abs(xb)) > 2.4 || xz < -2.6 || xz > 2.5 || Math.min(Math.abs(xz - xa), Math.abs(xz - xb)) < 0.5) continue;
      const u = Math.sign(xb - xa), mid = (xa + xb) / 2, na = Math.abs(qa), nb = Math.abs(qb);
      const off = (y) => (y0 + 1.3 <= 1.85 && (y0 <= 0 || r.next() < 0.5) ? y0 + 1.3 : y0 - 1.3);
      let cand;
      if (qa * qb > 0) {
        cand = na !== nb ? [[2 * mid - xz, y0, 'nearbig'], [mid, y0, 'middle']] : [];
        cand.push(...r.shuffle([[xa - 0.9 * u, y0, 'outside'], [xb + 0.9 * u, y0, 'outside'], [xz, off(), 'offaxis']]));
      } else {
        const [xs, xg] = na < nb ? [xa, xb] : [xb, xa], rr = Math.abs(xz - xs), v = Math.sign(xs - xg);
        cand = [[mid, y0, 'between'], ...r.shuffle([[xg - v * rr, y0, 'bigside'], [xs + v * rr * 0.45, y0, 'near'], [xz, off(), 'offaxis']])];
      }
      const pts = [[xz, y0, null]];
      for (const [x, y, tag] of cand) {
        if (pts.length === 4) break;
        const fine = x > -2.65 && x < 2.5 && y > -1.9 && y < 1.85 && c.charges.every((s) => Math.hypot(x - s.x, y - s.y) >= 0.5)
          && pts.every((p) => Math.hypot(x - p[0], y - p[1]) >= 0.6) && Math.hypot(...C.field(c, x, y)) >= 0.08;
        if (fine) pts.push([r2(x), r2(y), tag]);
      }
      if (pts.length < 4) continue;
      const order = r.shuffle(pts.map((p, i) => i)), points = order.map((i, k) => ({ x: pts[i][0], y: pts[i][1], name: PN[k], tag: pts[i][2] }));
      const z = points.find((p) => !p.tag), zn = z.name;
      const rA = Math.abs(xz - xa), rB = Math.abs(xz - xb);
      const howS = L(`Close to A the field points ${qa > 0 ? 'away from A' : 'towards A'}: A is ${nm(qa)}. Close to B it points ${qb > 0 ? 'away from B' : 'towards B'}: B is ${nm(qb)}.`,
        `Nahe bei A zeigt das Feld ${qa > 0 ? 'von A weg' : 'zu A hin'}: A ist ${nm(qa)}. Nahe bei B zeigt es ${qb > 0 ? 'von B weg' : 'zu B hin'}: B ist ${nm(qb)}.`);
      const howQ = L(`At ${zn} the field is zero: there the fields of A and B are equally strong, |q_A|/r_A² = |q_B|/r_B². With r_A = ${nice(rA)} cm and r_B = ${nice(rB)} cm: |q_A| : |q_B| = (r_A/r_B)² = ${nice((rA / rB) ** 2)}, so A is ${sz(qa)} and B is ${sz(qb)}.`,
        `In ${zn} ist das Feld null: Dort sind die Felder von A und B gleich stark, |q_A|/r_A² = |q_B|/r_B². Mit r_A = ${nice(rA)} cm und r_B = ${nice(rB)} cm: |q_A| : |q_B| = (r_A/r_B)² = ${nice((rA / rB) ** 2)}, also ist A ${sz(qa)} und B ${sz(qb)}.`).replace(/_A/g, '<sub>A</sub>').replace(/_B/g, '<sub>B</sub>');
      const howZ = qa * qb > 0
        ? L(`Between two like charges their fields point in opposite directions; they cancel where both are equally strong, ${na === nb ? 'halfway between the equal charges' : 'nearer the smaller charge'}: at ${zn}.`, `Zwischen zwei gleichnamigen Ladungen zeigen ihre Felder in entgegengesetzte Richtungen; sie heben sich dort auf, wo beide gleich stark sind, ${na === nb ? 'in der Mitte zwischen den gleichen Ladungen' : 'näher bei der kleineren Ladung'}: in ${zn}.`)
        : L(`For two unlike charges the fields point in opposite directions only outside, on the line through them; they cancel beyond the smaller charge, where its nearness makes up for its size: ${zn}.`, `Bei zwei ungleichnamigen Ladungen zeigen die Felder nur aussen, auf der Geraden durch sie, in entgegengesetzte Richtungen; sie heben sich jenseits der kleineren Ladung auf, wo ihre Nähe ihre Grösse ausgleicht: in ${zn}.`);
      const nudgeQ = {
        swap: L('Probe right next to A and right next to B: does the field point away from the charge or towards it? Which way does it point at a positive charge?', 'Miss direkt neben A und direkt neben B: Zeigt das Feld von der Ladung weg oder zu ihr hin? Wohin zeigt es bei einer positiven Ladung?'),
        sign: L('Check A and B one at a time: close to each, does the field point towards it or away from it?', 'Prüfe A und B einzeln: Zeigt das Feld nahe bei jeder Ladung zu ihr hin oder von ihr weg?'),
        size: L('Which charge is the bigger one? Compare the field at the same distance from A and from B, or use where the field is zero.', 'Welche Ladung ist die grössere? Vergleiche das Feld im gleichen Abstand von A und von B, oder nutze, wo das Feld null ist.'),
      };
      const d = { kind: 'field', c, box: BOX, W, region: BOX, snap: points.map(({ x, y, name }) => ({ x, y, name })), grid: 0 };
      const svg = C.fig(hiddenC(P), { box: BOX, W, grid: true, unknown: true, points: points.map(({ x, y, name }) => ({ x, y, name })), label: L('Field probe: two hidden charges A and B and four points P, Q, R, S. Click, tap, or use the arrow keys and Enter, to measure the field.', 'Feldsonde: zwei verdeckte Ladungen A und B und vier Punkte P, Q, R, S. Klicke, tippe oder benutze die Pfeiltasten und Enter, um das Feld zu messen.') });
      const sol = C.fig(c, { box: BOX, W, lines: true, lineOpts: { per: 7 }, labels: [signLbl(qa), signLbl(qb)], names: [{ x: xa, y: y0, name: 'A' }, { x: xb, y: y0, name: 'B' }], points: [{ x: z.x, y: z.y, name: zn }], labelsAt: [{ x: z.x - 0.25, y: z.y - 0.4, label: "E = 0" }] });
      return {
        kind: 'probe', title: L('Field probe', 'Feldsonde'),
        text: L('<p>Two point charges A and B are hidden: you see where they are, but not their signs or sizes (each is ±q, ±2q or ±3q, with q = 1 nC). The grid has 1 cm squares.</p><p>Measure the field with the probe: click or tap a point in the figure, or drag to search. The arrow shows the direction of the field; its length grows with the strength (ten times stronger: one step longer), and the value is shown under the figure. Keyboard: the arrow keys move the probe, Enter measures.</p>',
          '<p>Zwei Punktladungen A und B sind verdeckt: Du siehst, wo sie sind, aber nicht ihre Vorzeichen und Beträge (jede ist ±q, ±2q oder ±3q, mit q = 1 nC). Das Gitter hat 1-cm-Quadrate.</p><p>Miss das Feld mit der Sonde: Klicke oder tippe auf einen Punkt der Abbildung, oder ziehe, um zu suchen. Der Pfeil zeigt die Richtung des Feldes; seine Länge wächst mit der Stärke (zehnmal stärker: eine Stufe länger), und der Wert steht unter der Abbildung. Tastatur: Die Pfeiltasten bewegen die Sonde, Enter misst.</p>'),
        figs: probeFig(svg, d, L('Click or tap in the figure to measure the field.', 'Klicke oder tippe in die Abbildung, um das Feld zu messen.')),
        questions: [
          choice('q', L('(a) The charges', '(a) Die Ladungen'), chargeOpts(r, P, { S: howS, Q: howQ }, nudgeQ)),
          tiles('zero', L('(b) Where is the field zero?', '(b) Wo ist das Feld null?'), points.map((p) => {
            if (!p.tag) return { html: `<span class="dtile"><b>${p.name}</b></span>`, ok: true, why: '' };
            const e = Math.hypot(...C.field(c, p.x, p.y)) * KE;
            return { html: `<span class="dtile"><b>${p.name}</b></span>`, ok: false, tag: p.tag, why: `${WHYZ[p.tag]()} ${L(`At ${p.name}, E = ${kNC(e)}.`, `In ${p.name} ist E = ${kNC(e)}.`)} ${howZ}`,
              nudge: `${L(`Measure the field at ${p.name} with the probe: is it zero there?`, `Miss das Feld in ${p.name} mit der Sonde: Ist es dort null?`)} ${NUDGEZ[p.tag]()}` };
          })),
        ],
        hints: [
          L('The field points away from a positive charge and towards a negative one: measure close to each charge.', 'Das Feld zeigt von einer positiven Ladung weg und zu einer negativen hin: Miss nahe bei jeder Ladung.'),
          L('Measure at each of the marked points; the probe snaps to a point when you are close to it.', 'Miss in jedem der markierten Punkte; die Sonde rastet ein, wenn du nahe bei einem Punkt bist.'),
          L('Where the field is zero, the fields of A and B are equal and opposite: E = k·|q|/r² is the same for both, so the bigger charge is farther away.', 'Wo das Feld null ist, sind die Felder von A und B gleich gross und entgegengesetzt: E = k·|q|/r² ist für beide gleich, also ist die grössere Ladung weiter weg.'),
        ],
        solution: [howS, howQ, howZ], solFig: `<div class="fig">${sol}</div>`,
        p: { qa, qb, xa, xb, y0, pts: points.map((q) => [q.x, q.y]), zero: points.indexOf(z) },
      };
    }
  }

  // ---------------------------------------------------------------- the potential probe
  const ICON = (d) => `<span class="dtile">${C.icon(d)}</span>`;
  // the direction tiles: the field, against it, and the two across it
  function dirTiles(r, u, howD, label) {
    const W2 = {
      against: [L('This points from low to high potential; the field points the other way.', 'Diese Richtung zeigt von tiefem zu hohem Potential; das Feld zeigt umgekehrt.'), L('Measure the potential a little to either side of P. Does the field point towards the higher or the lower value?', 'Miss das Potential ein wenig auf beiden Seiten von P. Zeigt das Feld zum höheren oder zum tieferen Wert?')],
      perp: [L('Along this direction the potential hardly changes: it runs along the equipotential line through P, and the field crosses that at right angles.', 'In dieser Richtung ändert sich das Potential kaum: Sie verläuft längs der Äquipotentiallinie durch P, und das Feld kreuzt diese senkrecht.'), L('Measure just next to P in this direction and in the opposite one: does the potential change much? Where does it fall fastest?', 'Miss direkt neben P in dieser Richtung und in der entgegengesetzten: Ändert sich das Potential stark? Wo fällt es am schnellsten?')],
    };
    const dirs = [[u, null], [[-u[0], -u[1]], 'against'], [[-u[1], u[0]], 'perp'], [[u[1], -u[0]], 'perp']];
    return tiles('dir', label, r.shuffle(dirs).map(([dd, tag]) => (tag ? { html: ICON(dd), ok: false, tag, why: `${W2[tag][0]} ${howD}`, nudge: W2[tag][1] } : { html: ICON(dd), ok: true, why: '' })));
  }
  const DIRQ = () => L('In which direction does the field at P point?', 'In welche Richtung zeigt das Feld in P?');
  const POTTEXT = () => L('Measure the potential with the probe: click or tap a point in the figure, or drag to search; each reading stays as a dot with its value. Keyboard: the arrow keys move the probe, Enter measures.', 'Miss das Potential mit der Sonde: Klicke oder tippe auf einen Punkt der Abbildung, oder ziehe, um zu suchen; jede Messung bleibt als Punkt mit ihrem Wert stehen. Tastatur: Die Pfeiltasten bewegen die Sonde, Enter misst.');
  const READ0 = () => L('Click or tap in the figure to measure the potential.', 'Klicke oder tippe in die Abbildung, um das Potential zu messen.');
  const round3 = (x) => Math.round(x * 1000) / 1000;
  // how the field at P follows from readings 3 mm either side of it
  const howDir = (d, Pt, u) => {
    const a = measure(d, Pt[0] + 0.3 * u[0], Pt[1] + 0.3 * u[1]).V, b = measure(d, Pt[0] - 0.3 * u[0], Pt[1] - 0.3 * u[1]).V, at = measure(d, Pt[0], Pt[1]).V;
    return L(`At P, V = ${volts(at)}. 3 mm from P the potential is ${volts(b)} on one side and ${volts(a)} on the other: it falls fastest ${roughly(u)}. The field points from high to low potential, at right angles to the equipotential through P: ${roughly(u)}.`,
      `In P ist V = ${volts(at)}. 3 mm neben P ist das Potential auf der einen Seite ${volts(b)} und auf der anderen ${volts(a)}: Es fällt am schnellsten ${roughly(u)}. Das Feld zeigt von hohem zu tiefem Potential, senkrecht zur Äquipotentiallinie durch P: ${roughly(u)}.`);
  };

  function potCharges(r) {
    for (;;) {
      const P = pair(r, { ds: [1.6, 2, 2.4] }), { qa, qb, xa, xb, y0 } = P, c = realC(P);
      if (Math.max(Math.abs(xa), Math.abs(xb)) > 2.3) continue;
      const cand = [];
      for (let x = -2.4; x <= 2.41; x += 0.2) for (let y = -1.8; y <= 1.81; y += 0.2) {
        const p = [r2(x), r2(y)];
        if (Math.abs(p[1] - y0) >= 0.5 && c.charges.every((s) => Math.hypot(p[0] - s.x, p[1] - s.y) >= 0.8) && Math.hypot(...C.field(c, ...p)) >= 0.06) cand.push(p);
      }
      if (!cand.length) continue;
      const Pt = r.pick(cand), f = C.field(c, ...Pt), m = Math.hypot(...f), u = [round3(f[0] / m), round3(f[1] / m)];
      const d = { kind: 'pot', c, box: BOX, W, region: BOX, snap: [{ x: Pt[0], y: Pt[1], name: 'P' }], grid: 0 };
      // sizes: the potential 2.5 mm from each charge, on its far side
      const out = (x, o) => measure(d, x + 0.25 * Math.sign(x - o), y0).V, va = out(xa, xb), vb = out(xb, xa);
      const howS = L(`Close to A the potential is ${qa > 0 ? 'high and positive' : 'low and negative'}: A is ${nm(qa)}. Close to B it is ${qb > 0 ? 'high and positive' : 'low and negative'}: B is ${nm(qb)}.`,
        `Nahe bei A ist das Potential ${qa > 0 ? 'hoch und positiv' : 'tief und negativ'}: A ist ${nm(qa)}. Nahe bei B ist es ${qb > 0 ? 'hoch und positiv' : 'tief und negativ'}: B ist ${nm(qb)}.`);
      const cmp = Math.abs(qa) === Math.abs(qb) ? L('about the same: the charges are equally big', 'etwa gleich: Die Ladungen sind gleich gross')
        : L(`${Math.abs(qa) > Math.abs(qb) ? 'larger near A: A is the bigger charge' : 'larger near B: B is the bigger charge'}`, `${Math.abs(qa) > Math.abs(qb) ? 'nahe bei A grösser: A ist die grössere Ladung' : 'nahe bei B grösser: B ist die grössere Ladung'}`);
      const howQ = L(`V = k·q/r: at the same short distance, the bigger charge gives the larger potential. 2.5 mm from A (on its far side) V = ${volts(va)}, 2.5 mm from B V = ${volts(vb)}; the size of V is ${cmp}. So A is ${sz(qa)} and B is ${sz(qb)}.`,
        `V = k·q/r: Im gleichen kleinen Abstand ergibt die grössere Ladung das grössere Potential. 2.5 mm neben A (auf der abgewandten Seite) ist V = ${volts(va)}, 2.5 mm neben B ist V = ${volts(vb)}; der Betrag von V ist ${cmp}. Also ist A ${sz(qa)} und B ${sz(qb)}.`);
      const howD = howDir(d, Pt, u);
      const nudgeQ = {
        swap: L('Probe right next to A and right next to B: is the potential there positive or negative? What sign does it have near a positive charge?', 'Miss direkt neben A und direkt neben B: Ist das Potential dort positiv oder negativ? Welches Vorzeichen hat es nahe bei einer positiven Ladung?'),
        sign: L('Check A and B one at a time: is the potential close to each positive or negative?', 'Prüfe A und B einzeln: Ist das Potential nahe bei jeder Ladung positiv oder negativ?'),
        size: L('Which charge is the bigger one? Compare the potential at the same short distance from A and from B.', 'Welche Ladung ist die grössere? Vergleiche das Potential im gleichen kleinen Abstand von A und von B.'),
      };
      const svg = C.fig(hiddenC(P), { box: BOX, W, grid: true, unknown: true, points: [{ x: Pt[0], y: Pt[1], name: 'P' }], label: L('Potential probe: two hidden charges A and B and a point P. Click, tap, or use the arrow keys and Enter, to measure the potential.', 'Potentialsonde: zwei verdeckte Ladungen A und B und ein Punkt P. Klicke, tippe oder benutze die Pfeiltasten und Enter, um das Potential zu messen.') });
      const sol = C.fig(c, { box: BOX, W, lines: true, lineOpts: { per: 7 }, labels: [signLbl(qa), signLbl(qb)], names: [{ x: xa, y: y0, name: 'A' }, { x: xb, y: y0, name: 'B' }], points: [{ x: Pt[0], y: Pt[1], name: 'P' }], vecs: [{ x: Pt[0], y: Pt[1], dx: 46 * u[0], dy: 46 * u[1], cls: 'v-field', name: 'E⃗' }] });
      return {
        kind: 'probe', title: L('Potential probe', 'Potentialsonde'),
        text: L(`<p>Two point charges A and B are hidden: you see where they are, but not their signs or sizes (each is ±q, ±2q or ±3q, with q = 1 nC). The grid has 1 cm squares.</p><p>${POTTEXT()}</p>`, `<p>Zwei Punktladungen A und B sind verdeckt: Du siehst, wo sie sind, aber nicht ihre Vorzeichen und Beträge (jede ist ±q, ±2q oder ±3q, mit q = 1 nC). Das Gitter hat 1-cm-Quadrate.</p><p>${POTTEXT()}</p>`),
        figs: probeFig(svg, d, READ0()),
        questions: [choice('q', L('(a) The charges', '(a) Die Ladungen'), chargeOpts(r, P, { S: howS, Q: howQ }, nudgeQ)), dirTiles(r, u, howD, `(b) ${DIRQ()}`)],
        hints: [
          L('A positive charge raises the potential around it, a negative one lowers it: measure close to A and close to B.', 'Eine positive Ladung hebt das Potential um sich herum an, eine negative senkt es: Miss nahe bei A und nahe bei B.'),
          L('V = k·q/r: to compare the sizes, measure at the same short distance from each charge.', 'V = k·q/r: Um die Beträge zu vergleichen, miss im gleichen kleinen Abstand von jeder Ladung.'),
          L('The field points from high to low potential, the way the potential falls fastest: measure in a small circle around P.', 'Das Feld zeigt von hohem zu tiefem Potential, dorthin, wo das Potential am schnellsten fällt: Miss auf einem kleinen Kreis um P.'),
        ],
        solution: [howS, howQ, howD], solFig: `<div class="fig">${sol}</div>`,
        p: { kind: 'points', qa, qb, xa, xb, y0, P: Pt, dir: u },
      };
    }
  }

  function potCap(r) {
    const h = r.pick([0.75, 1, 1.5]), w = 2.2, E0 = r.pick([1500, 2000, 2500, 3000, 4000, 5000, 6000]), topPos = sides(r), topA = sides(r);
    const gap = 2 * h, U = (topPos ? 1 : -1) * E0 * gap * 0.01, top = topA ? 'A' : 'B', bot = topA ? 'B' : 'A', pos = topPos ? top : bot, neg = topPos ? bot : top;
    const c = { kind: 'plates', h, w, q: topPos ? 1 : -1, U };
    const Pt = [r.int(-15, 15) / 10, r2(r.int(Math.ceil((-h + 0.3) * 10 - 1e-9), Math.floor((h - 0.3) * 10 + 1e-9)) / 10)];
    const u = [0, topPos ? -1 : 1];
    const d = { kind: 'pot', c, box: BOX, W, region: [-w, w, -h, h], snap: [{ x: Pt[0], y: Pt[1], name: 'P' }], grid: 0.1, bottom: bot };
    const y1 = 0.5, y2 = gap - 0.5, V1 = measure(d, 0, -h + y1).V, V2 = measure(d, 0, -h + y2).V;
    const howP = L(`The potential ${topPos ? 'rises' : 'falls'} from plate ${bot} (0 V) to plate ${top} (${volts(U)}): ${pos} is at the higher potential, so ${pos} carries the positive charge and ${neg} the negative charge.`,
      `Das Potential ${topPos ? 'steigt' : 'fällt'} von Platte ${bot} (0 V) bis Platte ${top} (${volts(U)}): ${pos} ist auf dem höheren Potential, also trägt ${pos} die positive Ladung und ${neg} die negative.`);
    const show = (v) => El.show(v, 'field');
    const howE = L(`Two readings: V = ${volts(V1)} at ${nice(y1)} cm and V = ${volts(V2)} at ${nice(y2)} cm above plate ${bot}. E = |ΔV|/Δd = ${nice(Math.abs(V2 - V1))} V / ${nice((y2 - y1) / 100)} m = ${show(E0)}; any two readings between the plates give the same: the field is uniform.`,
      `Zwei Messungen: V = ${volts(V1)} bei ${nice(y1)} cm und V = ${volts(V2)} bei ${nice(y2)} cm über Platte ${bot}. E = |ΔV|/Δd = ${nice(Math.abs(V2 - V1))} V / ${nice((y2 - y1) / 100)} m = ${show(E0)}; zwei beliebige Messungen zwischen den Platten ergeben dasselbe: Das Feld ist homogen.`);
    const howD = howDir(d, Pt, u);
    const words = [
      [L(`${top} is positive, ${bot} negative`, `${top} ist positiv, ${bot} negativ`), topPos, null],
      [L(`${bot} is positive, ${top} negative`, `${bot} ist positiv, ${top} negativ`), !topPos, null],
      [L('both are positive', 'beide sind positiv'), false, 'both'],
      [L('cannot be told: one plate is at 0 V', 'nicht zu sagen: Eine Platte ist auf 0 V'), false, 'zero'],
    ];
    const WP = {
      opp: [howP, L('Which plate is at the higher potential? Measure close to each plate.', 'Welche Platte ist auf dem höheren Potential? Miss nahe bei jeder Platte.')],
      both: [L(`Two equally charged positive plates would be at (nearly) the same potential, with hardly any field between them; here the potential changes evenly from plate to plate. ${howP}`, `Zwei gleich geladene positive Platten wären auf (fast) demselben Potential, mit kaum einem Feld dazwischen; hier ändert sich das Potential gleichmässig von Platte zu Platte. ${howP}`), L('Does the potential change between the plates? What would it do if both plates had the same charge?', 'Ändert sich das Potential zwischen den Platten? Was würde es tun, wenn beide Platten gleich geladen wären?')],
      zero: [L(`0 V is only the reference: the lower plate was chosen as zero. What counts is which plate is at the higher potential. ${howP}`, `0 V ist nur der Bezugspunkt: Die untere Platte wurde als null gewählt. Es zählt, welche Platte auf dem höheren Potential ist. ${howP}`), L('Is 0 V a property of the plate, or only a choice of reference? Compare the two plates.', 'Ist 0 V eine Eigenschaft der Platte oder nur eine Wahl des Bezugspunkts? Vergleiche die beiden Platten.')],
    };
    const posOpts = r.shuffle(words.map(([label, ok, tag]) => (ok ? { label, ok: true, why: '' } : { label, ok: false, tag: tag || 'sign', why: WP[tag || 'opp'][0], nudge: WP[tag || 'opp'][1] })));
    const Eopts = El.values(E0, [
      { value: Math.abs(U), tag: 'nodiv', why: `${L(`${nice(Math.abs(U))} is the voltage between the plates in V, not yet divided by their distance.`, `${nice(Math.abs(U))} ist die Spannung zwischen den Platten in V, noch nicht durch ihren Abstand dividiert.`)} ${howE}`, nudge: L('Check the units: a potential difference in V is not yet a field in V/m.', 'Prüfe die Einheiten: Eine Potentialdifferenz in V ist noch kein Feld in V/m.') },
      { value: E0 / 100, tag: 'cm', why: `${L('The distance must be in metres, not in centimetres.', 'Der Abstand muss in Metern stehen, nicht in Zentimetern.')} ${howE}`, nudge: L('In which unit did you put the distance? A field in V/m needs it in metres.', 'In welcher Einheit hast du den Abstand eingesetzt? Ein Feld in V/m braucht ihn in Metern.') },
      { value: 1 / E0, tag: 'inverse', why: `${L('Upside down: E = ΔV/Δd, not Δd/ΔV.', 'Gerade umgekehrt: E = ΔV/Δd, nicht Δd/ΔV.')} ${howE}`, nudge: L('Check which quantity goes on top of the fraction.', 'Prüfe, welche Grösse in den Zähler gehört.') },
    ], 'field', howE);
    const svg = plates(C.fig({ kind: 'uniform', E: [0, 1] }, { box: BOX, W, grid: true, points: [{ x: Pt[0], y: Pt[1], name: 'P' }], label: L('Potential probe: a plate capacitor with plates A and B and a point P between them. Click, tap, or use the arrow keys and Enter, to measure the potential.', 'Potentialsonde: ein Plattenkondensator mit den Platten A und B und einem Punkt P dazwischen. Klicke, tippe oder benutze die Pfeiltasten und Enter, um das Potential zu messen.') }), c, [top, bot]);
    const s = topPos ? 1 : -1, lns = [-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x) => [[x, s * (h - 0.04)], [x, -s * (h - 0.04)]]);
    const sol = C.fig(c, { box: BOX, W, given: lns, names: [{ x: w - 0.1, y: h + 0.15, name: top }, { x: w - 0.1, y: -h + 0.15, name: bot }], points: [{ x: Pt[0], y: Pt[1], name: 'P' }], vecs: [{ x: Pt[0], y: Pt[1], dx: 0, dy: 40 * u[1], cls: 'v-field', name: 'E⃗' }] });
    return {
      kind: 'probe', title: L('Potential probe', 'Potentialsonde'),
      text: L(`<p>A plate capacitor with plates A and B; which plate is positive is hidden. The grid has 1 cm squares; the lower plate, ${bot}, is at 0 V.</p><p>${POTTEXT()} The probe measures between the plates; under the figure you also see its height above plate ${bot}.</p>`,
        `<p>Ein Plattenkondensator mit den Platten A und B; welche Platte positiv ist, ist verdeckt. Das Gitter hat 1-cm-Quadrate; die untere Platte, ${bot}, ist auf 0 V.</p><p>${POTTEXT()} Die Sonde misst zwischen den Platten; unter der Abbildung siehst du auch ihre Höhe über Platte ${bot}.</p>`),
      figs: probeFig(svg, d, READ0()),
      questions: [
        choice('pos', L('(a) Which plate is positive?', '(a) Welche Platte ist positiv?'), posOpts),
        choice('E', L('(b) The field strength between the plates', '(b) Die Feldstärke zwischen den Platten'), Eopts),
        dirTiles(r, u, howD, `(c) ${DIRQ()}`),
      ],
      hints: [
        L('The positive plate is the one at the higher potential: measure close to each plate.', 'Die positive Platte ist die auf dem höheren Potential: Miss nahe bei jeder Platte.'),
        L('Measure at two heights between the plates: E = |ΔV|/Δd, with Δd in metres.', 'Miss in zwei Höhen zwischen den Platten: E = |ΔV|/Δd, mit Δd in Metern.'),
        L('The field points from high to low potential.', 'Das Feld zeigt von hohem zu tiefem Potential.'),
      ],
      solution: [howP, howE, howD], solFig: `<div class="fig">${sol}</div>`,
      p: { kind: 'plates', h, w, U, top, E: E0, P: Pt, dir: u },
    };
  }
  function probePot(seed) {
    const r = rng(seed * 137 + 97);
    return r.next() < 0.35 ? potCap(r) : potCharges(r);
  }

  // ---------------------------------------------------------------- in the browser
  const NS = 'http://www.w3.org/2000/svg';
  const LOG = (n) => Math.max(5, Math.min(46, 10 + 13 * Math.log10(n / 3000))); // the arrow's length (px) for |E| in N/C
  function wire(rootEl) {
    if (!rootEl || typeof document === 'undefined') return;
    rootEl.querySelectorAll('svg[data-probe]').forEach((svg) => {
      if (svg.__probe) return;
      let d;
      try { d = JSON.parse(svg.getAttribute('data-probe')); } catch (e) { return; }
      const st = { marks: [], cur: null, down: false, kb: false };
      svg.__probe = st;
      const box = d.box, S = d.W / (box[1] - box[0]), X = (x) => (x - box[0]) * S, Y = (y) => (box[3] - y) * S;
      const marks = svg.querySelector('.pr-marks'), live = svg.querySelector('.pr-live'), wrap = svg.closest('.probe-fig') || svg.parentNode;
      const read = wrap.querySelector('.probe-read'), clear = wrap.querySelector('.probe-clear');
      const reg = d.region, field = d.kind === 'field';
      // a position in the figure: snapped to a marked point, or to the grid, kept in the region
      function snap(x, y) {
        for (const p of d.snap || []) if (Math.hypot(x - p.x, y - p.y) < 0.18) return { x: p.x, y: p.y, name: p.name };
        if (d.grid) { x = Math.round(x / d.grid) * d.grid; y = Math.round(y / d.grid) * d.grid; }
        const cl = (v, a, b) => Math.min(b, Math.max(a, v));
        // well outside the region (the capacitor): not moved onto its edge, the probe says so
        if (x < reg[0] - 0.25 || x > reg[1] + 0.25 || y < reg[2] - 0.25 || y > reg[3] + 0.25) return { x, y };
        return { x: Number(cl(x, reg[0], reg[1]).toFixed(3)), y: Number(cl(y, reg[2], reg[3]).toFixed(3)) };
      }
      const at = (e) => { const b = svg.getBoundingClientRect(); return { x: box[0] + ((e.clientX - b.left) * d.W) / b.width / S, y: box[3] - ((e.clientY - b.top) * d.H) / b.height / S }; };
      const inRegion = (x, y) => x >= reg[0] - 1e-9 && x <= reg[1] + 1e-9 && y >= reg[2] - 1e-9 && y <= reg[3] + 1e-9;
      // the drawing of one reading (o.live: the probe itself, o.label: with its value, o.op: opacity)
      function draw(p, m, o) {
        const px = X(p.x), py = Y(p.y);
        let s = '';
        if (o.live) s += `<circle class="pr-cross" cx="${f1(px)}" cy="${f1(py)}" r="7"/><path class="pr-cross" d="M${f1(px - 12)},${f1(py)}h6M${f1(px + 6)},${f1(py)}h6M${f1(px)},${f1(py - 12)}v6M${f1(px)},${f1(py + 6)}v6"/>`;
        if (!m || m.near || m.out) return s;
        let lbl;
        if (field) {
          if (m.mag < 300) s += `<circle class="pr-zero" cx="${f1(px)}" cy="${f1(py)}" r="4"/>`;
          else {
            const len = LOG(m.mag), ux = m.E[0] / m.mag, uy = -m.E[1] / m.mag, hd = Math.min(7, len * 0.5), tx = px + len * ux, ty = py + len * uy, bx = tx - hd * ux, by = ty - hd * uy;
            s += `<circle class="pr-base" cx="${f1(px)}" cy="${f1(py)}" r="2"/><line class="pr-arrow" stroke-width="${o.live || o.last ? 2.4 : 1.8}" x1="${f1(px)}" y1="${f1(py)}" x2="${f1(bx)}" y2="${f1(by)}"/><polygon class="pr-head" points="${f1(tx)},${f1(ty)} ${f1(bx - 0.55 * hd * uy)},${f1(by + 0.55 * hd * ux)} ${f1(bx + 0.55 * hd * uy)},${f1(by - 0.55 * hd * ux)}"/>`;
          }
          lbl = kNC(m.mag);
        } else {
          s += `<circle class="pr-dot" cx="${f1(px)}" cy="${f1(py)}" r="3.4"/>`;
          lbl = volts(m.V);
        }
        if (o.label) {
          const right = px < d.W - 80, below = field ? m.mag >= 300 && -m.E[1] / m.mag < -0.5 : d.c.kind === 'plates' && p.y > d.c.h - 0.35;
          s += `<text class="pr-val${o.live ? ' live' : ''}" x="${f1(px + (right ? 7 : -7))}" y="${f1(py + (below ? 15 : -7))}" text-anchor="${right ? 'start' : 'end'}">${minus(lbl)}</text>`;
        }
        return `<g opacity="${o.op == null ? 1 : o.op}">${s}</g>`;
      }
      const redraw = () => { const n = st.marks.length; marks.innerHTML = st.marks.map((k, i) => draw(k.p, k.m, { op: (0.3 + (0.7 * (i + 1)) / n).toFixed(2), label: !field || i === n - 1, last: i === n - 1 })).join(''); };
      // the reading in words
      function words(p, m) {
        if (m.near) return L('Too close to the charge: move the probe a little away.', 'Zu nahe bei der Ladung: Bewege die Sonde ein wenig weg.');
        if (m.out) return L('The probe measures only between the plates.', 'Die Sonde misst nur zwischen den Platten.');
        const where = p.name ? L(` at ${p.name}`, ` in ${p.name}`) : '';
        if (field) return m.mag < 5 ? L(`E = 0 kN/C${where}: no field here.`, `E = 0 kN/C${where}: Hier gibt es kein Feld.`) : L(`E = ${kNC(m.mag)}${where}, pointing ${roughly(m.E)}.`, `E = ${kNC(m.mag)}${where}, zeigt ${roughly(m.E)}.`);
        const hgt = d.c.kind === 'plates' ? L(`, ${nice(Math.round((p.y + d.c.h) * 10) / 10)} cm above plate ${d.bottom}`, `, ${nice(Math.round((p.y + d.c.h) * 10) / 10)} cm über Platte ${d.bottom}`) : '';
        return minus(`V = ${volts(m.V)}${where}${hgt}.`);
      }
      const mOf = (p) => (inRegion(p.x, p.y) ? measure(d, p.x, p.y) : { out: true });
      function preview(p, say) {
        st.cur = p;
        const m = mOf(p);
        live.innerHTML = draw(p, m, { live: true, label: true });
        if (say) read.textContent = words(p, m);
      }
      function place(p) {
        const m = mOf(p);
        read.textContent = words(p, m);
        if (m.near || m.out) return;
        st.marks.push({ p, m });
        if (st.marks.length > 12) st.marks.shift();
        redraw();
      }
      const hide = () => { live.innerHTML = ''; };
      svg.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        st.down = true; st.kb = false;
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
        preview(snap(...Object.values(at(e))));
      });
      svg.addEventListener('pointermove', (e) => { if (st.down || e.pointerType === 'mouse') { st.kb = false; preview(snap(...Object.values(at(e)))); } });
      svg.addEventListener('pointerup', (e) => { if (!st.down) return; st.down = false; place(snap(...Object.values(at(e)))); if (e.pointerType !== 'mouse') hide(); });
      svg.addEventListener('pointercancel', () => { st.down = false; hide(); });
      svg.addEventListener('pointerleave', (e) => { if (!st.down && e.pointerType === 'mouse' && !st.kb) hide(); });
      svg.addEventListener('focus', () => { if (svg.matches(':focus-visible')) { st.kb = true; preview(st.cur || snap((reg[0] + reg[1]) / 2, reg[2] + 0.8 * (reg[3] - reg[2])), true); } });
      svg.addEventListener('blur', () => { st.kb = false; hide(); });
      svg.addEventListener('keydown', (e) => {
        const step = (e.shiftKey ? 5 : 1) * 0.1, mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
        const p = st.cur || snap((reg[0] + reg[1]) / 2, reg[2] + 0.8 * (reg[3] - reg[2]));
        if (mv) {
          e.preventDefault(); st.kb = true;
          // from a marked point, step off it (it would snap back)
          let n = snap(p.x + mv[0] * step, p.y + mv[1] * step);
          if (n.name && n.name === p.name) n = { x: Number((p.x + mv[0] * step).toFixed(3)), y: Number((p.y + mv[1] * step).toFixed(3)) };
          preview(n, true);
        } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.kb = true; preview(p); place(p); } else if (e.key === 'Escape') hide();
      });
      if (clear) clear.addEventListener('click', () => { st.marks = []; redraw(); hide(); read.textContent = L('Cleared. Click or tap in the figure to measure.', 'Gelöscht. Klicke oder tippe in die Abbildung, um zu messen.'); });
    });
  }

  const api = { TYPES: { 'probe-field': [3, probeField], 'probe-pot': [3, probePot] }, wire, measure, zeroOf, fmtE, fmtV, KE, KV, BOX };
  root.Probe = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
