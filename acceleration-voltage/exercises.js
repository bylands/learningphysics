// The exercises of Acceleration Voltage, with their texts, in the current language, in the form of
// Electric Potential (exercises.js there): the physics and drawings of accel.js, the helpers of
// elec.js. The convention is that of Electric Potential: the potential V (German Φ), the voltage
// from A to B V_AB = V_B − V_A (U_AB = Φ_B − Φ_A); the field does the work W = q·(V_A − V_B) =
// −q·V_AB on a charge going from A to B, and its kinetic energy changes by W (ΔE_kin = W = −ΔE_pot).
// The types:
//   ab, ab-num, ab-bars    a charge from A to B in a field: V_AB, the work, faster or slower; the
//                          kinetic energy and the speed at B; the energy bars at A and at B
//   gun, linac             accelerators: from rest through a voltage (which plate, the energy in eV,
//                          the speed); several gaps in a row (the energy, v grows with √n)
//   ruth                   Rutherford's experiment: an alpha particle against a nucleus, the
//                          distance of closest approach, the energy on the way
//   cmp, cmp-ratio         two particles of different charges and masses through the same voltage:
//                          which gains more energy, which is faster; the ratios
// The check (check.js): OBJECTIVES, CONCEPT and question(kind, seed).
// A wrong option may carry a nudge: shown in practice in place of a why that gives the answer away.
(function (root) {
  'use strict';

  const El = root.Elec || require('./elec.js');
  const A = root.Accel || require('./accel.js');
  const { cap, rng, nice, sci, values, choice, tiles, words } = El;
  // every text goes through L, where V_AB is written as V<sub>AB</sub>
  const subs = (s) => String(s).replace(/([A-Za-zΦ])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>');
  const L = (en, de) => subs(El.L(en, de));
  const LR = (en, de) => El.L(en, de); // the labels of a drawing, which sets its indices itself
  const fig = (html) => `<div class="fig">${html}</div>`;
  const minus = (s) => String(s).replace(/-(?=\d)/g, '−');
  const vab = (a, b) => L(`V_${a}${b} = V_${b} − V_${a}`, `U_${a}${b} = Φ_${b} − Φ_${a}`);
  const Vof = (p) => L(`V_${p}`, `Φ_${p}`);
  const volts = (v) => minus(`${nice(v)} V`);
  const kv = (v) => (Math.abs(v) >= 1e6 ? `${nice(v / 1e6)} MV` : Math.abs(v) >= 1e3 ? `${nice(v / 1e3)} kV` : `${nice(v)} V`);
  // an energy in eV, keV or MeV; signed: with + or −
  const eVu = (x) => { const a = Math.abs(x); return a >= 1e6 - 1 ? `${nice(x / 1e6)} MeV` : a >= 1e3 - 1e-6 ? `${nice(x / 1e3)} keV` : `${nice(x)} eV`; };
  const eV = (x) => minus(eVu(x));
  const eVs = (x) => (x > 0 ? `+${eVu(x)}` : x < 0 ? `−${eVu(-x)}` : '0 eV');
  const Vs = (x) => (x > 0 ? `+${kv(x)}` : x < 0 ? `−${kv(-x)}` : '0 V');
  const bare = (pt) => pt.name().replace(/ \([^)]*\)$/, '');
  const speed = (v) => `${sci(v)} m/s`;
  const zq = (q) => (q === 1 ? 'e' : q === -1 ? '−e' : `${minus(q)}e`);
  // v from a kinetic energy in eV
  const vOf = (EeV, m) => Math.sqrt((2 * EeV * A.e) / m);
  const RULE = () => L('From A to B the field does the work W = q·(V_A − V_B) = −q·V_AB on the charge; its potential energy falls by W and its kinetic energy grows by W: ΔE_kin = W = −ΔE_pot. With q in e and the potentials in V, W comes out in eV.', 'Von A nach B verrichtet das Feld an der Ladung die Arbeit W = q·(Φ_A − Φ_B) = −q·U_AB; ihre potentielle Energie nimmt um W ab und ihre kinetische Energie um W zu: ΔE_kin = W = −ΔE_pot. Mit q in e und den Potentialen in V kommt W in eV heraus.');
  const NUDGE = {
    sign: () => L('Mind the sign: what sign has the charge, and does the potential rise or fall from A to B?', 'Achte auf das Vorzeichen: Welches Vorzeichen hat die Ladung, und steigt oder fällt das Potential von A nach B?'),
    order: () => L(`Mind the order of the indices: ${vab('A', 'B')}.`, `Achte auf die Reihenfolge der Indizes: ${vab('A', 'B')}.`),
    path: () => L('Does the work of the field depend on the path, or only on the start and the end?', 'Hängt die Arbeit des Feldes vom Weg ab, oder nur von Anfang und Ende?'),
    z: () => L('What is the charge of this particle, in units of e?', 'Wie gross ist die Ladung dieses Teilchens, in Einheiten von e?'),
    two: () => L('E_kin = ½·m·v²: solve for v. Where does the factor 2 go?', 'E_kin = ½·m·v²: nach v auflösen. Wohin kommt der Faktor 2?'),
    start: () => L('The particle had kinetic energy at A already: does that count at B?', 'Das Teilchen hatte in A schon kinetische Energie: Zählt die in B mit?'),
    sqrt: () => L('The energy grows in proportion to the voltage. How does the speed grow with the energy?', 'Die Energie wächst proportional zur Spannung. Wie wächst die Geschwindigkeit mit der Energie?'),
    r2: () => L('That would be a potential falling with 1/r². How does the potential of the nucleus fall off?', 'Das wäre ein Potential, das mit 1/r² abnimmt. Wie nimmt das Potential des Kerns ab?'),
  };

  // ---------------------------------------------------------------- from A to B (the bent field)
  const BENT = { kind: 'bent' };
  // A and B on a field line, at the potentials VA and VB; the path (dashed) along the line, the
  // velocity at A (and at B, length ∝ v)
  function abScene(r, VA, VB, o = {}) {
    const y0 = o.y0 != null ? o.y0 : r.pick([-0.4, 0, 0.4]);
    const pA = A.onLine(BENT, 0, y0, VA), pB = A.onLine(BENT, 0, y0, VB);
    const path = A.lineThrough(BENT, 0, y0, pA[0], pB[0]);
    const dirAt = (k) => { const a = path[k], b = path[Math.min(path.length - 1, Math.max(0, k + (k === path.length - 1 ? -1 : 1)))], s = k === path.length - 1 ? -1 : 1, d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(s * (b[0] - a[0])) / d, (s * (b[1] - a[1])) / d]; };
    return { pA, pB, path, dA: dirAt(0), dB: dirAt(path.length - 1) };
  }
  function abFig(sc, o = {}) {
    const vel = (p, d, len, name) => ({ x: p[0], y: p[1], dx: d[0] * len, dy: d[1] * len, name, ny: d[1] > 0.3 ? -4 : 0 });
    const left = (p) => p[0] < 0;
    const lab = (p, n, v) => ({ x: p[0], y: p[1], name: n, v, at: 'above', nx: -12, ny: 2, vx: 0, va: 'auto', vy: 22 });
    const vels = [];
    if (o.vA != null && o.vA > 0) vels.push(vel(sc.pA, sc.dA, o.vA, LR('v_A', 'v_A')));
    if (o.vB != null && o.vB > 0) vels.push(vel(sc.pB, sc.dB, o.vB, LR('v_B', 'v_B')));
    const mid = sc.path[Math.floor(sc.path.length * 0.45)];
    return A.fieldFig(BENT, {
      path: sc.path, vels, labelE: [-1.9, 1.55], equi: o.equi,
      points: [lab(sc.pA, 'A', o.VA), lab(sc.pB, 'B', o.VB)],
      part: o.part ? { x: mid[0], y: mid[1], q: o.part.q, sym: o.part.sym } : null,
      label: LR('Field lines of an electric field, a charge on its way from A to B', 'Feldlinien eines elektrischen Feldes, eine Ladung auf dem Weg von A nach B'),
    });
  }
  // the particle and the two potentials of an exercise from A to B; neutral: a neutron sometimes
  function abSetup(seed, k, o = {}) {
    const r = rng(seed * k + 17), ids = o.neutral ? ['p', 'p', 'e', 'e', 'a', 'n'] : ['p', 'p', 'e', 'e', 'a', 'd'];
    const pt = A.part(r.pick(ids)), hi = r.pick([600, 700, 800, 900]), lo = r.pick([100, 200, 300]);
    const down = r.next() < 0.5; // from high to low potential (along the field)
    const VA = down ? hi : lo, VB = down ? lo : hi, W = pt.q * (VA - VB);
    // the kinetic energy at A: enough to reach B when the field slows it down
    const EA = (W < 0 ? -W : 0) + r.pick([100, 200, 300, 500]);
    return { r, pt, VA, VB, W, EA, down, sc: abScene(r, VA, VB) };
  }
  const abText = (s) => L(`<p>${cap(bare(s.pt))} (charge ${zq(s.pt.q)}) passes the point A of an electric field with a kinetic energy of ${eV(s.EA)} and moves to B, along the dashed path. The potentials are V_A = ${volts(s.VA)} and V_B = ${volts(s.VB)}.</p>`,
    `<p>${cap(bare(s.pt))} (Ladung ${zq(s.pt.q)}) durchläuft den Punkt A eines elektrischen Feldes mit einer kinetischen Energie von ${eV(s.EA)} und bewegt sich nach B, längs des gestrichelten Wegs. Die Potentiale sind Φ_A = ${volts(s.VA)} und Φ_B = ${volts(s.VB)}.</p>`);
  const abFigOf = (s) => fig(abFig(s.sc, { vA: 42, VA: LR(`V_A = ${volts(s.VA)}`, `Φ_A = ${volts(s.VA)}`), VB: LR(`V_B = ${volts(s.VB)}`, `Φ_B = ${volts(s.VB)}`), part: s.pt }));
  const howU = (s) => L(`${vab('A', 'B')} = ${volts(s.VB)} − ${volts(s.VA)} = ${Vs(s.VB - s.VA)}.`, `${vab('A', 'B')} = ${volts(s.VB)} − ${volts(s.VA)} = ${Vs(s.VB - s.VA)}.`);
  const howW = (s) => (s.pt.q ? L(`W = q·(V_A − V_B) = −q·V_AB = ${zq(s.pt.q)} · (${volts(s.VA)} − ${volts(s.VB)}) = ${eVs(s.W)}.`, `W = q·(Φ_A − Φ_B) = −q·U_AB = ${zq(s.pt.q)} · (${volts(s.VA)} − ${volts(s.VB)}) = ${eVs(s.W)}.`)
    : L(`The ${s.pt.short()} has no charge: the field does no work on it, W = 0, whatever the potentials.`, `Das ${s.pt.short()} hat keine Ladung: Das Feld verrichtet keine Arbeit an ihm, W = 0, was auch immer die Potentiale sind.`));
  const fasterWord = (W) => (W > 0 ? L('faster: the field speeds it up', 'schneller: Das Feld beschleunigt es') : W < 0 ? L('slower: the field slows it down', 'langsamer: Das Feld bremst es') : L('as fast: the field does no work on it', 'gleich schnell: Das Feld verrichtet keine Arbeit an ihm'));
  function ab(seed) {
    const s = abSetup(seed, 41, { neutral: true }), { r, pt, W } = s;
    const howV = `${howW(s)} ${pt.q ? L(`ΔE_kin = W ${W > 0 ? '> 0: its kinetic energy grows, it is faster at B' : '< 0: its kinetic energy falls, it is slower at B'}.`, `ΔE_kin = W ${W > 0 ? '> 0: Seine kinetische Energie wächst, es ist in B schneller' : '< 0: Seine kinetische Energie nimmt ab, es ist in B langsamer'}.`) : ''}`;
    const pathWhy = L('The work of the field depends only on the potentials at the start and the end, not on the path between them.', 'Die Arbeit des Feldes hängt nur von den Potentialen am Anfang und am Ende ab, nicht vom Weg dazwischen.');
    const qs = [choice('U', L('(a) the voltage V_AB', '(a) die Spannung U_AB'), values(s.VB - s.VA, [{ value: s.VA - s.VB, tag: 'order', why: `${NUDGE.order()} ${howU(s)}`, nudge: NUDGE.order() }], null, howU(s), { signed: true, fmt: (v) => Vs(v), extra: [0.5, 2] }))];
    if (pt.q) qs.push(choice('W', L('(b) the work done by the field on the particle from A to B', '(b) die Arbeit, die das Feld von A nach B am Teilchen verrichtet'), values(W, [{ value: -W, tag: 'sign', why: `${howW(s)}`, nudge: NUDGE.sign() }, ...(Math.abs(pt.q) === 2 ? [{ value: W / 2, tag: 'z', why: howW(s), nudge: NUDGE.z() }] : [])], null, howW(s), { signed: true, fmt: eVs, extra: [2, 0.5] })));
    qs.push(choice('v', L(`(${pt.q ? 'c' : 'b'}) At B, the particle is`, `(${pt.q ? 'c' : 'b'}) In B ist das Teilchen`), words(r, [
      [L('faster than at A', 'schneller als in A'), W > 0, howV], [L('slower than at A', 'langsamer als in A'), W < 0, howV],
      [L('as fast as at A', 'gleich schnell wie in A'), W === 0, pt.q ? howV : howW(s)], [L('faster or slower, depending on the path', 'schneller oder langsamer, je nach Weg'), false, pathWhy],
    ]).map((o) => (/path|Weg/.test(o.label) ? { ...o, tag: 'path', nudge: NUDGE.path() } : o.ok ? o : { ...o, tag: 'sign', nudge: NUDGE.sign() }))));
    return {
      title: L('From A to B', 'Von A nach B'), text: abText(s), figs: abFigOf(s), questions: qs,
      hints: [
        L(`(a) ${vab('A', 'B')}: the end point first. Read V_A and V_B in the text.`, `(a) ${vab('A', 'B')}: zuerst der Endpunkt. Lies Φ_A und Φ_B im Text.`),
        `${El.chargeOf({ ...pt, sym: pt.sym })} ${L('The field does the work W = q·(V_A − V_B) on it; with q in e and V in volts, W is in eV.', 'Das Feld verrichtet an ihm die Arbeit W = q·(Φ_A − Φ_B); mit q in e und Φ in Volt ist W in eV.')}`,
        L('ΔE_kin = W: positive work speeds the particle up, negative work slows it down. The path between A and B does not matter.', 'ΔE_kin = W: Positive Arbeit beschleunigt das Teilchen, negative bremst es. Der Weg zwischen A und B spielt keine Rolle.'),
      ],
      solution: [howU(s), howW(s), pt.q ? howV : L(`So its kinetic energy stays the same: it is as fast at B as at A.`, `Also bleibt seine kinetische Energie gleich: Es ist in B gleich schnell wie in A.`)],
      p: { pt: pt.id, VA: s.VA, VB: s.VB, EA: s.EA, y: s.sc.pA[1].toFixed(2) },
    };
  }
  function abNum(seed) {
    const s = abSetup(seed, 43), { pt, W, EA } = s, EB = EA + W, vA = vOf(EA, pt.m), vB = vOf(EB, pt.m);
    const howK = L(`E_kin,B = E_kin,A + W = ${eV(EA)} ${W >= 0 ? '+' : '−'} ${eV(Math.abs(W))} = ${eV(EB)}, with W = q·(V_A − V_B) = ${zq(pt.q)} · (${volts(s.VA)} − ${volts(s.VB)}) = ${eVs(W)}.`,
      `E_kin,B = E_kin,A + W = ${eV(EA)} ${W >= 0 ? '+' : '−'} ${eV(Math.abs(W))} = ${eV(EB)}, mit W = q·(Φ_A − Φ_B) = ${zq(pt.q)} · (${volts(s.VA)} − ${volts(s.VB)}) = ${eVs(W)}.`);
    const howV = L(`v_B = √(2·E_kin,B/m) = √(2 · ${eV(EB)} · ${sci(A.e)} J/eV / ${sci(pt.m)} kg) = ${speed(vB)} (at A: ${speed(vA)}).`, `v_B = √(2·E_kin,B/m) = √(2 · ${eV(EB)} · ${sci(A.e)} J/eV / ${sci(pt.m)} kg) = ${speed(vB)} (in A: ${speed(vA)}).`);
    const kTraps = [{ value: EA - W, tag: 'sign', why: howK, nudge: NUDGE.sign() }, { value: Math.abs(W), tag: 'start', why: howK, nudge: NUDGE.start() }];
    if (Math.abs(pt.q) === 2) kTraps.push({ value: EA + W / 2, tag: 'z', why: howK, nudge: NUDGE.z() });
    return {
      title: L('Energy and speed at B', 'Energie und Geschwindigkeit in B'), text: abText(s), figs: abFigOf(s),
      questions: [
        choice('K', L('(a) the kinetic energy at B', '(a) die kinetische Energie in B'), values(EB, kTraps.filter((t) => t.value > 0), null, howK, { fmt: eV, extra: [2, 0.5, 1.5] })),
        choice('vB', L('(b) the speed at B', '(b) die Geschwindigkeit in B'), values(vB, [{ value: vOf(Math.abs(W), pt.m), tag: 'start', why: howV, nudge: NUDGE.start() }, { value: vB / Math.SQRT2, tag: 'two', why: howV, nudge: NUDGE.two() }, ...(EA - W > 0 ? [{ value: vOf(EA - W, pt.m), tag: 'sign', why: howV, nudge: NUDGE.sign() }] : [])], 'speed', howV)),
      ],
      hints: [
        L('First the work of the field from A to B: W = q·(V_A − V_B), in eV with q in e.', 'Zuerst die Arbeit des Feldes von A nach B: W = q·(Φ_A − Φ_B), in eV mit q in e.'),
        L(`Energy is conserved: E_kin,B = E_kin,A + W, with E_kin,A = ${eV(EA)}.`, `Die Energie bleibt erhalten: E_kin,B = E_kin,A + W, mit E_kin,A = ${eV(EA)}.`),
        L(`E_kin = ½·m·v², so v = √(2·E_kin/m), with the energy in joules (1 eV = ${sci(A.e)} J) and m = ${sci(pt.m)} kg.`, `E_kin = ½·m·v², also v = √(2·E_kin/m), mit der Energie in Joule (1 eV = ${sci(A.e)} J) und m = ${sci(pt.m)} kg.`),
      ],
      solution: [howK, howV], p: { pt: pt.id, VA: s.VA, VB: s.VB, EA, y: s.sc.pA[1].toFixed(2) },
    };
  }
  // the energy bars at A and B to choose from: the right ones and three wrong ones
  function abBars(seed) {
    const s = abSetup(seed, 47), { r, pt, W, EA } = s, q = pt.q;
    const pot = (v) => q * v, right = [{ name: 'A', pot: pot(s.VA), kin: EA }, { name: 'B', pot: pot(s.VB), kin: EA + W }];
    const why = L(`E_pot = q·V: at A ${eVs(pot(s.VA))}, at B ${eVs(pot(s.VB))}. The kinetic energy changes the other way by as much, ${eVs(W)}: the total stays the same.`, `E_pot = q·Φ: in A ${eVs(pot(s.VA))}, in B ${eVs(pot(s.VB))}. Die kinetische Energie ändert sich um gleich viel in die andere Richtung, ${eVs(W)}: Die Summe bleibt gleich.`);
    const wrong = [
      { g: [right[0], { name: 'B', pot: pot(s.VB), kin: EA - W }], tag: 'total', why: L(`Here the total energy is not the same at A and B. ${why}`, `Hier ist die Gesamtenergie in A und B nicht gleich. ${why}`), nudge: L('Look at the total energy E: must it be the same at A and B?', 'Schau die Gesamtenergie E an: Muss sie in A und B gleich sein?') },
      { g: [{ name: 'A', pot: pot(s.VB), kin: EA + W }, { name: 'B', pot: pot(s.VA), kin: EA }], tag: 'sign', why, nudge: NUDGE.sign() },
      { g: [right[0], { name: 'B', pot: pot(s.VB), kin: EA }], tag: 'total', why: L(`Here the kinetic energy does not change although the potential energy does. ${why}`, `Hier ändert sich die kinetische Energie nicht, obwohl sich die potentielle ändert. ${why}`), nudge: L('Where does the potential energy go?', 'Wohin geht die potentielle Energie?') },
      ...(q < 0 ? [{ g: [{ name: 'A', pot: s.VA, kin: EA }, { name: 'B', pot: s.VB, kin: EA - (s.VB - s.VA) }], tag: 'charge', why: L(`The electron's charge is negative: E_pot = q·V is negative where V is positive. ${why}`, `Die Ladung des Elektrons ist negativ: E_pot = q·Φ ist negativ, wo Φ positiv ist. ${why}`), nudge: L('E_pot = q·V: what sign has q here?', 'E_pot = q·Φ: Welches Vorzeichen hat q hier?') }] : []),
    ];
    const pickW = r.shuffle(wrong).slice(0, 3);
    const max = Math.max(...[right, ...pickW.map((w) => w.g)].flat().flatMap((g) => [Math.abs(g.pot), Math.abs(g.kin), Math.abs(g.pot + g.kin)]));
    const draw = (g) => A.bars(g, { max, H: 70 });
    const opts = r.shuffle([{ html: draw(right), ok: true, why: '' }, ...pickW.map((w) => ({ html: draw(w.g), ok: false, tag: w.tag, why: w.why, nudge: w.nudge }))]);
    return {
      title: L('Energy bars from A to B', 'Energiebalken von A nach B'), text: abText(s), figs: abFigOf(s),
      questions: [{ type: 'pick', key: 'bars', label: L('Which bars show the potential energy, the kinetic energy and the total energy at A and at B?', 'Welche Balken zeigen die potentielle Energie, die kinetische Energie und die Gesamtenergie in A und in B?'), options: opts }],
      hints: [
        L(`E_pot = q·V, with the sign of q: ${zq(q)} at ${volts(s.VA)} and at ${volts(s.VB)}.`, `E_pot = q·Φ, mit dem Vorzeichen von q: ${zq(q)} auf ${volts(s.VA)} und auf ${volts(s.VB)}.`),
        L('No other force does work: the total energy E = E_pot + E_kin is the same at A and at B.', 'Keine andere Kraft verrichtet Arbeit: Die Gesamtenergie E = E_pot + E_kin ist in A und in B gleich.'),
        L(`What the potential energy loses, the kinetic energy gains (or the other way round). At A, E_kin = ${eV(EA)}.`, `Was die potentielle Energie verliert, gewinnt die kinetische (oder umgekehrt). In A ist E_kin = ${eV(EA)}.`),
      ],
      solution: [why], solFig: `<div class="figs">${fig(A.bars(right, { values: eV }))}</div>`, p: { pt: pt.id, VA: s.VA, VB: s.VB, EA, y: s.sc.pA[1].toFixed(2) },
    };
  }

  // ---------------------------------------------------------------- accelerators
  const PLATES = (VL, VR) => ({ kind: 'plates', VL, VR });
  function gunFig(VL, VR, parts) {
    return A.fieldFig(PLATES(VL, VR), { tops: [{ x: -A.PX, label: kv(VL) }, { x: A.PX, label: kv(VR) }], part: parts[0], label: LR('Two plates and the field between them', 'Zwei Platten und das Feld zwischen ihnen') });
  }
  function gun(seed) {
    const r = rng(seed * 53 + 5), pt = A.part(r.pick(['p', 'e', 'e', 'a', 'd'])), U = r.pick([500, 1000, 2000, 5000, 10000, 20000]);
    const hiLeft = r.next() < 0.5, VL = hiLeft ? U : 0, VR = hiLeft ? 0 : U;
    // it starts at the plate whose potential is high for a positive charge, low for a negative one
    const startLeft = pt.q > 0 ? hiLeft : !hiLeft, K = Math.abs(pt.q) * U, v = vOf(K, pt.m);
    const side = (left) => (left ? L(`the left plate (${kv(VL)})`, `die linke Platte (${kv(VL)})`) : L(`the right plate (${kv(VR)})`, `die rechte Platte (${kv(VR)})`));
    const howS = L(`${pt.q > 0 ? 'A positive charge is pushed along the field, from high to low potential' : 'A negative charge is pulled against the field, from low to high potential'}: it must start at ${side(startLeft)} to fly to the other one.`, `${pt.q > 0 ? 'Eine positive Ladung wird in Feldrichtung gestossen, von hohem zu tiefem Potential' : 'Eine negative Ladung wird gegen das Feld gezogen, von tiefem zu hohem Potential'}: Sie muss bei ${side(startLeft)} starten, um zur anderen zu fliegen.`);
    const howK = L(`W = |q|·|V_AB| = ${Math.abs(pt.q) === 1 ? 'e' : `${Math.abs(pt.q)}e`} · ${kv(U)} = ${eV(K)}: from rest, its kinetic energy is ${eV(K)} at the other plate.`, `W = |q|·|U_AB| = ${Math.abs(pt.q) === 1 ? 'e' : `${Math.abs(pt.q)}e`} · ${kv(U)} = ${eV(K)}: Aus der Ruhe hat es bei der anderen Platte die kinetische Energie ${eV(K)}.`);
    const howV = L(`v = √(2·E_kin/m) = √(2 · ${eV(K)} · ${sci(A.e)} J/eV / ${sci(pt.m)} kg) = ${speed(v)}.`, `v = √(2·E_kin/m) = √(2 · ${eV(K)} · ${sci(A.e)} J/eV / ${sci(pt.m)} kg) = ${speed(v)}.`);
    const kTraps = Math.abs(pt.q) === 2 ? [{ value: U, tag: 'z', why: howK, nudge: NUDGE.z() }] : [{ value: K / 2, tag: 'half', why: howK, nudge: L('W = q·U: is there a ½ in it?', 'W = q·U: Kommt darin ein ½ vor?') }];
    return {
      title: L('From rest through a voltage', 'Aus der Ruhe durch eine Spannung'),
      text: L(`<p>In an accelerator, ${bare(pt)} (charge ${zq(pt.q)}, mass ${sci(pt.m)} kg) is to be accelerated from rest between two plates at ${kv(VL)} (left) and ${kv(VR)} (right), through small holes.</p>`, `<p>In einem Beschleuniger soll ${bare(pt)} (Ladung ${zq(pt.q)}, Masse ${sci(pt.m)} kg) aus der Ruhe zwischen zwei Platten auf ${kv(VL)} (links) und ${kv(VR)} (rechts) beschleunigt werden, durch kleine Löcher.</p>`),
      figs: fig(gunFig(VL, VR, [])),
      questions: [
        choice('start', L('(a) It must start at', '(a) Es muss starten bei'), words(r, [[side(true), startLeft, howS], [side(false), !startLeft, howS], [L('either plate', 'einer beliebigen Platte'), false, howS], [L('neither: it would stay at rest', 'keiner: es bliebe in Ruhe'), false, howS]]).map((o) => (o.ok ? o : { ...o, tag: 'sign', nudge: NUDGE.sign() }))),
        choice('K', L('(b) its kinetic energy when it reaches the other plate', '(b) seine kinetische Energie, wenn es die andere Platte erreicht'), values(K, kTraps, null, howK, { fmt: eV, extra: [2, 0.5, 4] })),
        choice('v', L('(c) its speed there', '(c) seine Geschwindigkeit dort'), values(v, [{ value: v / Math.SQRT2, tag: 'two', why: howV, nudge: NUDGE.two() }, { value: v * v / 1e6 > 0 ? v * Math.SQRT2 : 0, tag: 'two', why: howV, nudge: NUDGE.two() }, ...(Math.abs(pt.q) === 2 ? [{ value: v / Math.SQRT2, tag: 'z', why: howV, nudge: NUDGE.z() }] : [])], 'speed', howV)),
      ],
      hints: [
        `${El.chargeOf({ ...pt })} ${L('A positive charge is pushed from high to low potential, a negative one from low to high.', 'Eine positive Ladung wird von hohem zu tiefem Potential gestossen, eine negative von tiefem zu hohem.')}`,
        L(`From rest, it gains E_kin = |q|·|V_AB|: with q in e and the voltage ${kv(U)}, that is in eV.`, `Aus der Ruhe gewinnt es E_kin = |q|·|U_AB|: mit q in e und der Spannung ${kv(U)} in eV.`),
        L(`v = √(2·E_kin/m), with E_kin in joules (1 eV = ${sci(A.e)} J).`, `v = √(2·E_kin/m), mit E_kin in Joule (1 eV = ${sci(A.e)} J).`),
      ],
      solution: [howS, howK, howV], p: { pt: pt.id, U, hiLeft },
    };
  }
  // a linear accelerator: tubes in a row, gaps between them
  function linacFig(n, sym) {
    const W = 440, H = 96, gw = 20, tw = (W - 40 - (n + 1) * gw) / n;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    for (let k = 0; k < n; k++) { const x = 20 + gw + k * (tw + gw); s += `<rect class="tube" x="${x.toFixed(1)}" y="30" width="${tw.toFixed(1)}" height="36" rx="4"/>`; }
    s += `<line class="avpath" x1="20" y1="48" x2="${W - 10}" y2="48"/>`;
    for (let k = 0; k <= n; k++) { const x = 20 + gw / 2 + k * (tw + gw); s += A.txt(x, 22, k < n ? `${k + 1}` : '', 'tick'); }
    s += `<circle class="charge pos part" cx="14" cy="48" r="7"/>` + A.txt(14, 84, sym, 'lbl small q-lbl');
    return A.svg(W, H, s, LR('Tubes of a linear accelerator in a row, with gaps between them', 'Röhren eines Linearbeschleunigers in einer Reihe, mit Lücken dazwischen'));
  }
  function linac(seed) {
    const r = rng(seed * 59 + 3), pt = A.part(r.pick(['p', 'a', 'd', 'h', 'c'])), n = r.pick([4, 9, 16, 25]), U = r.pick([50e3, 100e3, 200e3, 500e3]), z = pt.q;
    const K = n * z * U, K1 = z * U, root2 = Math.sqrt(n);
    const howK = L(`Each gap adds W = q·|V| = ${zq(z)} · ${kv(U)} = ${eV(K1)}; after ${n} gaps, from rest: ${n} · ${eV(K1)} = ${eV(K)}.`, `Jede Lücke bringt W = q·|U| = ${zq(z)} · ${kv(U)} = ${eV(K1)}; nach ${n} Lücken, aus der Ruhe: ${n} · ${eV(K1)} = ${eV(K)}.`);
    const howR = L(`The energy grows with the number of gaps, ${n} times as much; v = √(2·E_kin/m) grows with its square root: √${n} = ${nice(root2)} times as fast as after the first gap.`, `Die Energie wächst mit der Zahl der Lücken, ${n}-mal so viel; v = √(2·E_kin/m) wächst mit ihrer Wurzel: √${n} = ${nice(root2)}-mal so schnell wie nach der ersten Lücke.`);
    const kTraps = [{ value: K1, tag: 'other', why: howK }, ...(z > 1 ? [{ value: n * U, tag: 'z', why: howK, nudge: NUDGE.z() }] : [])];
    const ratio = (x) => `${nice(x)} ×`;
    return {
      title: L('A linear accelerator', 'Ein Linearbeschleuniger'),
      text: L(`<p>In a linear accelerator, ${bare(pt)} (charge ${zq(z)}) starts at rest and crosses ${n} gaps between metal tubes. The voltages are switched so that it is accelerated in every gap, each time by a voltage of ${kv(U)}; inside the tubes there is no field.</p>`, `<p>In einem Linearbeschleuniger startet ${pt.name()} (Ladung ${zq(z)}) in Ruhe und durchquert ${n} Lücken zwischen Metallröhren. Die Spannungen werden so umgeschaltet, dass es in jeder Lücke beschleunigt wird, jedes Mal mit einer Spannung von ${kv(U)}; in den Röhren gibt es kein Feld.</p>`),
      figs: fig(linacFig(Math.min(n, 9), pt.sym)),
      questions: [
        choice('K', L(`(a) its kinetic energy after the ${n} gaps`, `(a) seine kinetische Energie nach den ${n} Lücken`), values(K, kTraps, null, howK, { fmt: eV, extra: [2, 0.5, n] })),
        choice('r', L('(b) Compared with its speed after the first gap, its final speed is', '(b) Verglichen mit seiner Geschwindigkeit nach der ersten Lücke ist seine Endgeschwindigkeit'), values(root2, [{ value: n, tag: 'sqrt', why: howR, nudge: NUDGE.sqrt() }, { value: n * n, tag: 'sqrt', why: howR, nudge: NUDGE.sqrt() }, { value: n / 2, tag: 'sqrt', why: howR, nudge: NUDGE.sqrt() }], null, howR, { fmt: ratio })),
      ],
      hints: [
        L(`In each gap the field does the work q·|V| = ${zq(z)} · ${kv(U)} on it; inside the tubes, none.`, `In jeder Lücke verrichtet das Feld die Arbeit q·|U| = ${zq(z)} · ${kv(U)} an ihm; in den Röhren keine.`),
        L(`The energies of the ${n} gaps add up.`, `Die Energien der ${n} Lücken addieren sich.`),
        L('E_kin = ½·m·v²: n times the energy gives how many times the speed?', 'E_kin = ½·m·v²: n-mal die Energie gibt wie viel-mal die Geschwindigkeit?'),
      ],
      solution: [howK, howR], p: { pt: pt.id, n, U },
    };
  }

  // ---------------------------------------------------------------- Rutherford's experiment
  const NUCLEI = [[79, ['gold', 'Gold']], [47, ['silver', 'Silber']], [29, ['copper', 'Kupfer']], [13, ['aluminium', 'Aluminium']]];
  function ruthFig(Z, rmin, unit) {
    // one drawing unit is 10 fm; the point of closest approach drawn at least 0.6 units from the nucleus
    const d = Math.max(0.6, Math.min(2.4, rmin / 10 * unit));
    return A.fieldFig({ kind: 'nucleus', Z }, { path: [[-3.4, 0], [A.NX - d, 0]], points: [{ x: A.NX - d, y: 0, name: 'P', at: 'above', ny: -6 }],
      part: { x: -2.6, y: 0, q: 1, sym: 'α' }, vels: [{ x: -2.6, y: 0, dx: 44, dy: 0, name: LR('v_0', 'v_0'), ny: -6 }],
      label: LR('An alpha particle flying straight at a nucleus', 'Ein Alphateilchen, das genau auf einen Kern zufliegt') });
  }
  function ruth(seed) {
    const r = rng(seed * 61 + 29), [Z, name] = r.pick(NUCLEI), E = r.pick([2, 4, 5, 6, 8]), rmin = (2 * Z * A.KE) / E; // fm
    const howR = L(`Far away, E_pot = 0 and E_kin = ${E} MeV. At the closest point P it stops for a moment: all of it is potential energy, q·V = 2e · k·Z·e/r_min. So r_min = 2·Z·k·e²/E_kin = 2 · ${Z} · 1.44 MeV·fm / ${E} MeV = ${nice(rmin)} fm.`, `Weit weg ist E_pot = 0 und E_kin = ${E} MeV. Im nächsten Punkt P steht es kurz still: Alles ist potentielle Energie, q·Φ = 2e · k·Z·e/r_min. Also r_min = 2·Z·k·e²/E_kin = 2 · ${Z} · 1.44 MeV·fm / ${E} MeV = ${nice(rmin)} fm.`);
    const howE2 = L('r_min = 2·Z·k·e²/E_kin: twice the energy, half the distance. The alpha particle comes twice as close.', 'r_min = 2·Z·k·e²/E_kin: doppelte Energie, halber Abstand. Das Alphateilchen kommt doppelt so nahe.');
    const howH = L(`At 2·r_min the potential of the nucleus is half of that at r_min (V ∝ 1/r), so E_pot = ${E / 2} MeV, and E_kin = ${E} MeV − ${E / 2} MeV = ${nice(E / 2)} MeV.`, `In 2·r_min ist das Potential des Kerns halb so gross wie in r_min (Φ ∝ 1/r), also E_pot = ${E / 2} MeV und E_kin = ${E} MeV − ${E / 2} MeV = ${nice(E / 2)} MeV.`);
    const MeV = (x) => `${nice(x)} MeV`, fm = (x) => `${nice(x)} fm`;
    return {
      title: L("Rutherford's experiment", 'Rutherfords Streuversuch'),
      text: L(`<p>In Rutherford's experiment, alpha particles (charge 2e) with a kinetic energy of ${E} MeV fly at a thin foil of ${name[0]} (Z = ${Z}). One of them flies straight at a nucleus, stops at the point P and flies back. The nucleus has the potential V = k·Z·e/r around it, and k·e² = 1.44 MeV·fm.</p>`, `<p>In Rutherfords Streuversuch fliegen Alphateilchen (Ladung 2e) mit einer kinetischen Energie von ${E} MeV auf eine dünne Folie aus ${name[1]} (Z = ${Z}). Eines davon fliegt genau auf einen Kern zu, hält im Punkt P an und fliegt zurück. Um den Kern herrscht das Potential Φ = k·Z·e/r, und k·e² = 1.44 MeV·fm.</p>`),
      figs: fig(ruthFig(Z, rmin, 0.04 * E)),
      questions: [
        choice('r', L('(a) the distance r_min of P from the nucleus', '(a) der Abstand r_min von P vom Kern'), values(rmin, [{ value: rmin / 2, tag: 'z', why: howR, nudge: NUDGE.z() }, { value: Math.sqrt(2 * Z * A.KE / E), tag: 'r2', why: howR, nudge: NUDGE.r2() }], null, howR, { fmt: fm, extra: [2, 4, 0.25] })),
        choice('E2', L('(b) With alpha particles of twice the energy, r_min becomes', '(b) Mit Alphateilchen der doppelten Energie wird r_min'), words(r, [[L('half as large', 'halb so gross'), true, ''], [L('twice as large', 'doppelt so gross'), false, howE2], [L('a quarter as large', 'ein Viertel so gross'), false, howE2], [L('the same: it depends only on the nucleus', 'gleich: Er hängt nur vom Kern ab'), false, howE2]]).map((o) => (o.ok ? o : { ...o, tag: /Viertel|quarter/.test(o.label) ? 'r2' : 'other' }))),
        choice('half', L('(c) the kinetic energy of the alpha particle at the distance 2·r_min, on its way in', '(c) die kinetische Energie des Alphateilchens im Abstand 2·r_min, auf dem Hinweg'), values(E / 2, [{ value: (3 * E) / 4, tag: 'r2', why: howH, nudge: NUDGE.r2() }, { value: E / 4, tag: 'other', why: howH }, { value: E, tag: 'other', why: howH }], null, howH, { fmt: MeV })),
      ],
      hints: [
        L('Energy is conserved: far away it is all kinetic energy, at P (where it turns back) all potential energy.', 'Die Energie bleibt erhalten: Weit weg ist alles kinetische Energie, in P (wo es umkehrt) alles potentielle Energie.'),
        L(`E_pot = q·V = 2e · k·Z·e/r = 2·${Z}·1.44 MeV·fm / r.`, `E_pot = q·Φ = 2e · k·Z·e/r = 2·${Z}·1.44 MeV·fm / r.`),
        L('V ∝ 1/r: at twice the distance, half the potential energy.', 'Φ ∝ 1/r: im doppelten Abstand die halbe potentielle Energie.'),
      ],
      solution: [howR, howE2, howH, L('Rutherford found such distances of a few ten fm without any sign of the alpha particles touching the nucleus: the nucleus must be smaller still, about 10 000 times smaller than the atom.', 'Rutherford fand solche Abstände von einigen zehn fm, ohne dass die Alphateilchen den Kern berührten: Der Kern muss noch kleiner sein, etwa 10 000-mal kleiner als das Atom.')],
      solFig: `<div class="figs">${fig(A.bars([{ name: L('far away', 'weit weg'), pot: 0, kin: E }, { name: '2·r_min', pot: E / 2, kin: E / 2 }, { name: 'P', pot: E, kin: 0 }], { values: MeV }))}</div>`,
      p: { Z, E },
    };
  }

  // ---------------------------------------------------------------- two particles compared
  // pairs [X, Y]: different charges and masses (qX/mX vs qY/mY in mass numbers)
  const PAIRS = [['p', 'a'], ['d', 'a'], ['p', 'd'], ['a', 'c'], ['h', 'a'], ['p', 'h'], ['li', 'a'], ['p', 't'], ['e', 'p'], ['d', 'c'], ['t', 'h']];
  const qm = (pt) => Math.abs(pt.q) / pt.m;
  function cmpSetup(seed, k) {
    const r = rng(seed * k + 7), pair = r.pick(PAIRS), [X, Y] = (r.next() < 0.5 ? pair : [pair[1], pair[0]]).map(A.part), U = r.pick([1000, 2000, 5000, 10000]);
    return { r, X, Y, U };
  }
  const cmpText = (s) => L(`<p>${cap(bare(s.X))} (charge ${zq(s.X.q)}, mass ${s.X.A ? `${s.X.A} u` : `${sci(s.X.m)} kg`}) and ${bare(s.Y)} (charge ${zq(s.Y.q)}, mass ${s.Y.A ? `${s.Y.A} u` : `${sci(s.Y.m)} kg`}) are each accelerated from rest through the same voltage of ${kv(s.U)}.</p>`,
    `<p>${cap(bare(s.X))} (Ladung ${zq(s.X.q)}, Masse ${s.X.A ? `${s.X.A} u` : `${sci(s.X.m)} kg`}) und ${bare(s.Y)} (Ladung ${zq(s.Y.q)}, Masse ${s.Y.A ? `${s.Y.A} u` : `${sci(s.Y.m)} kg`}) werden je aus der Ruhe mit derselben Spannung von ${kv(s.U)} beschleunigt.</p>`);
  function cmpFig(s) {
    const bar = (pt) => ({ name: pt.sym, pot: 0, kin: Math.abs(pt.q) });
    return fig(A.bars([bar(s.X), bar(s.Y)].map((g) => ({ ...g, unknown: true })), { H: 60, label: LR('The energies of the two particles, still unknown', 'Die Energien der beiden Teilchen, noch unbekannt') }));
  }
  function cmp(seed) {
    const s = cmpSetup(seed, 67), { r, X, Y } = s, kx = Math.abs(X.q), ky = Math.abs(Y.q), vx = qm(X), vy = qm(Y);
    const sameV = Math.abs(vx / vy - 1) < 0.02, sameK = kx === ky;
    const howK = L(`E_kin = |q|·|V_AB| does not depend on the mass: ${X.short()} ${kx}e · ${kv(s.U)} = ${eV(kx * s.U)}, ${Y.short()} ${ky}e · ${kv(s.U)} = ${eV(ky * s.U)}.`, `E_kin = |q|·U hängt nicht von der Masse ab: ${X.short()} ${kx}e · ${kv(s.U)} = ${eV(kx * s.U)}, ${Y.short()} ${ky}e · ${kv(s.U)} = ${eV(ky * s.U)}.`);
    const howV = L(`v = √(2·|q|·|V_AB|/m): what counts is the charge per mass, |q|/m. ${cap(X.short())}: ${kx}e / ${X.A ? `${X.A} u` : 'm_e'}; ${Y.short()}: ${ky}e / ${Y.A ? `${Y.A} u` : 'm_e'}. ${sameV ? 'The same: they are equally fast.' : `The ${(vx > vy ? X : Y).short()} has the larger |q|/m: it is faster.`}`,
      `v = √(2·|q|·U/m): Es zählt die Ladung pro Masse, |q|/m. ${cap(X.short())}: ${kx}e / ${X.A ? `${X.A} u` : 'm_e'}; ${Y.short()}: ${ky}e / ${Y.A ? `${Y.A} u` : 'm_e'}. ${sameV ? 'Gleich: Sie sind gleich schnell.' : `Das ${(vx > vy ? X : Y).short()} hat das grössere |q|/m: Es ist schneller.`}`);
    const depends = L('It depends on the voltage.', 'Es hängt von der Spannung ab.'), depWhy = L('The voltage is the same for both: it scales both energies (and both speeds) by the same factor.', 'Die Spannung ist für beide dieselbe: Sie ändert beide Energien (und beide Geschwindigkeiten) um denselben Faktor.');
    const four = (right, why, massTag) => words(r, [[L(`the ${X.short()}`, `das ${X.short()}`), right === 'X', why], [L(`the ${Y.short()}`, `das ${Y.short()}`), right === 'Y', why], [L('both the same', 'beide gleich'), right === '=', why], [depends, false, depWhy]])
      .map((o) => (o.ok ? o : o.label === depends ? { ...o, tag: 'other' } : { ...o, tag: massTag }));
    return {
      title: L('Two particles compared', 'Zwei Teilchen verglichen'), text: cmpText(s), figs: cmpFig(s),
      questions: [
        choice('K', L('(a) Which gains more kinetic energy?', '(a) Welches gewinnt mehr kinetische Energie?'), four(sameK ? '=' : kx > ky ? 'X' : 'Y', howK, 'mass')),
        choice('v', L('(b) Which is faster at the end?', '(b) Welches ist am Ende schneller?'), four(sameV ? '=' : vx > vy ? 'X' : 'Y', howV, 'qm')),
      ],
      hints: [
        L('The field does the work |q|·|V_AB| on each: what does that depend on, and what not?', 'Das Feld verrichtet an jedem die Arbeit |q|·U: Wovon hängt sie ab, wovon nicht?'),
        L('½·m·v² = |q|·|V_AB|, so v = √(2·|q|·|V_AB|/m).', '½·m·v² = |q|·U, also v = √(2·|q|·U/m).'),
        L('Compare the charge per mass, |q|/m, of the two (in e per u).', 'Vergleiche die Ladung pro Masse, |q|/m, der beiden (in e pro u).'),
      ],
      solution: [howK, howV], solFig: `<div class="figs">${fig(A.bars([{ name: X.sym, pot: 0, kin: kx * s.U }, { name: Y.sym, pot: 0, kin: ky * s.U }], { values: eV, H: 70 }))}</div>`,
      p: { X: X.id, Y: Y.id, U: s.U },
    };
  }
  function cmpRatio(seed) {
    let s;
    for (let k = 0; ; k++) { s = cmpSetup(seed + 1000 * k, 71); if (s.X.A && s.Y.A && Math.abs(qm(s.X) / qm(s.Y) - 1) > 0.05) break; }
    const { X, Y } = s, kx = Math.abs(X.q), ky = Math.abs(Y.q), rv = Math.sqrt((kx / X.A) / (ky / Y.A)), rK = kx / ky, UY = s.U * (kx / X.A) / (ky / Y.A);
    const howK = L(`E_kin = |q|·|V_AB|: the ratio of the energies is that of the charges, ${kx} : ${ky} = ${nice(rK)}.`, `E_kin = |q|·U: Das Verhältnis der Energien ist das der Ladungen, ${kx} : ${ky} = ${nice(rK)}.`);
    const howV = L(`v = √(2·|q|·|V_AB|/m), so v_X/v_Y = √((q_X/m_X)/(q_Y/m_Y)) = √((${kx}/${X.A})/(${ky}/${Y.A})) = ${nice(rv)}.`, `v = √(2·|q|·U/m), also v_X/v_Y = √((q_X/m_X)/(q_Y/m_Y)) = √((${kx}/${X.A})/(${ky}/${Y.A})) = ${nice(rv)}.`);
    const howU = L(`The same speed needs the same |q|·|V_AB|/m: Y needs ${kv(s.U)} · (q_X/m_X)/(q_Y/m_Y) = ${kv(s.U)} · (${kx}/${X.A})/(${ky}/${Y.A}) = ${kv(UY)}.`, `Die gleiche Geschwindigkeit braucht das gleiche |q|·U/m: U_Y = ${kv(s.U)} · (q_X/m_X)/(q_Y/m_Y) = ${kv(s.U)} · (${kx}/${X.A})/(${ky}/${Y.A}) = ${kv(UY)}.`);
    const r3 = (x) => nice(x);
    return {
      title: L('Two particles: the ratios', 'Zwei Teilchen: die Verhältnisse'),
      text: cmpText(s).replace('</p>', L(' Call them X and Y in this order (masses in u, rounded).</p>', ' Nenne sie X und Y in dieser Reihenfolge (Massen in u, gerundet).</p>')),
      figs: cmpFig(s),
      questions: [
        choice('K', L('(a) the ratio E_kin(X) / E_kin(Y)', '(a) das Verhältnis E_kin(X) / E_kin(Y)'), values(rK, [{ value: rK * Y.A / X.A, tag: 'mass', why: howK, nudge: L('Does the work of the field depend on the mass?', 'Hängt die Arbeit des Feldes von der Masse ab?') }, { value: 1, tag: 'mass', why: howK }], null, howK, { fmt: r3, extra: [2, 0.5, 4] })),
        choice('v', L('(b) the ratio of the speeds v_X / v_Y', '(b) das Verhältnis der Geschwindigkeiten v_X / v_Y'), values(rv, [{ value: rv * rv, tag: 'sqrt', why: howV, nudge: NUDGE.sqrt() }, { value: Math.sqrt(X.A / Y.A * ky / kx) === rv ? 1 / rv : 1 / rv, tag: 'qm', why: howV, nudge: L('Which particle has the larger charge per mass?', 'Welches Teilchen hat die grössere Ladung pro Masse?') }, { value: Math.sqrt(rK), tag: 'mass', why: howV }], null, howV, { fmt: r3, extra: [2, 0.5] })),
        choice('U', L(`(c) the voltage through which Y would have to be accelerated to be as fast as X`, `(c) die Spannung, mit der Y beschleunigt werden müsste, um gleich schnell wie X zu sein`), values(UY, [{ value: s.U * s.U / UY, tag: 'qm', why: howU }, { value: s.U * rv, tag: 'sqrt', why: howU, nudge: NUDGE.sqrt() }], null, howU, { fmt: kv })),
      ],
      hints: [
        L('E_kin = |q|·|V_AB| for each, from rest: the same voltage.', 'E_kin = |q|·U für jedes, aus der Ruhe: dieselbe Spannung.'),
        L('v = √(2·|q|·|V_AB|/m): in the ratio, the voltage and the 2 cancel, √((q_X/m_X)/(q_Y/m_Y)) remains.', 'v = √(2·|q|·U/m): Im Verhältnis kürzen sich die Spannung und die 2 weg, √((q_X/m_X)/(q_Y/m_Y)) bleibt.'),
        L('The same speed means the same |q|·|V_AB|/m for both.', 'Gleiche Geschwindigkeit heisst gleiches |q|·U/m für beide.'),
      ],
      solution: [howK, howV, howU], p: { X: X.id, Y: Y.id, U: s.U },
    };
  }

  // ---------------------------------------------------------------- the race
  // A proton, a neutron and an alpha particle start at rest on the equipotential V_A, an electron
  // on V_B; who arrives at the other equipotential with the most energy, who is fastest there?
  function raceFig(VA, VB, o = {}) {
    const ys = [0.95, 0.1, -0.75], xA = (y) => A.onLine(BENT, 0, y, VA), xB = A.onLine(BENT, 0, -0.35, VB);
    const [pp, pn, pa] = ys.map(xA);
    const lbl = (x) => ({ sx: -14, sy: 18, sa: 'end' });
    return A.fieldFig(BENT, {
      equi: [VA, VB], labelE: [-1.9, 1.55],
      parts: [{ x: pp[0], y: pp[1], q: 1, sym: 'p', ...lbl() }, { x: pn[0], y: pn[1], q: 0, sym: 'n', ...lbl() }, { x: pa[0], y: pa[1], q: 1, sym: 'α', r: 10, ...lbl() }, { x: xB[0], y: xB[1], q: -1, sym: 'e⁻', sx: 16, sy: 18, sa: 'start' }],
      points: o.marks || [],
      tops: [{ x: xA(1.6)[0], label: LR(`V_A = ${volts(VA)}`, `Φ_A = ${volts(VA)}`) }, { x: A.onLine(BENT, 0, 1.6, VB)[0], label: LR(`V_B = ${volts(VB)}`, `Φ_B = ${volts(VB)}`) }],
      label: LR('The race: a proton, a neutron and an alpha particle on one equipotential line, an electron on another', 'Das Rennen: ein Proton, ein Neutron und ein Alphateilchen auf einer Äquipotentiallinie, ein Elektron auf einer anderen'),
    });
  }
  function race(seed) {
    const r = rng(seed * 73 + 13), VA = r.pick([700, 800, 900]), VB = r.pick([100, 200, 300]), U = VA - VB;
    const nm = (id) => L(`the ${A.part(id).short()}`, `das ${A.part(id).short()}`);
    const howK = L(`Each charge goes where its potential energy falls: p and α from V_A to V_B (along the field), the electron from V_B to V_A (against it). Each gains |q|·|V_AB| = |q| · ${kv(U)}: the proton and the electron ${eV(U)} each, the alpha particle (2e) ${eV(2 * U)}. The neutron has no charge and stays where it is.`,
      `Jede Ladung geht dorthin, wo ihre potentielle Energie fällt: p und α von Φ_A nach Φ_B (in Feldrichtung), das Elektron von Φ_B nach Φ_A (gegen das Feld). Jede gewinnt |q|·|U_AB| = |q| · ${kv(U)}: das Proton und das Elektron je ${eV(U)}, das Alphateilchen (2e) ${eV(2 * U)}. Das Neutron hat keine Ladung und bleibt, wo es ist.`);
    const howV = L(`v = √(2·|q|·|V_AB|/m): the electron has the same energy as the proton but about 1836 times less mass, so it is √1836 ≈ 43 times as fast. The alpha particle has twice the energy but four times the mass of the proton: √(2/4) ≈ 0.71 times as fast.`,
      `v = √(2·|q|·U/m): Das Elektron hat dieselbe Energie wie das Proton, aber etwa 1836-mal weniger Masse, also ist es √1836 ≈ 43-mal so schnell. Das Alphateilchen hat doppelt so viel Energie, aber viermal die Masse des Protons: √(2/4) ≈ 0.71-mal so schnell.`);
    const four = (right, why, tags) => words(r, ['p', 'a', 'n', 'e'].map((id) => [nm(id), id === right, why])).map((o, k) => (o.ok ? o : { ...o, tag: tags[o.label] || 'other' }));
    const tagsK = { [nm('p')]: 'charge', [nm('e')]: 'mass', [nm('n')]: 'other' }, tagsV = { [nm('p')]: 'qm', [nm('a')]: 'mass', [nm('n')]: 'other' };
    const pairs = [[['p', 'e'], true], [['p', 'a'], false], [['a', 'e'], false], [['n', 'p'], false]];
    return {
      title: L('The race', 'Das Rennen'),
      text: L(`<p>A proton, a neutron and an alpha particle start at rest on the equipotential line V_A = ${volts(VA)}, an electron at rest on V_B = ${volts(VB)}. Each one that moves flies to the other equipotential line.</p>`, `<p>Ein Proton, ein Neutron und ein Alphateilchen starten in Ruhe auf der Äquipotentiallinie Φ_A = ${volts(VA)}, ein Elektron in Ruhe auf Φ_B = ${volts(VB)}. Jedes, das sich bewegt, fliegt zur anderen Äquipotentiallinie.</p>`),
      figs: fig(raceFig(VA, VB)),
      questions: [
        choice('K', L('(a) Which arrives with the most kinetic energy?', '(a) Welches kommt mit der grössten kinetischen Energie an?'), four('a', howK, tagsK)),
        choice('v', L('(b) Which is fastest when it arrives?', '(b) Welches ist bei der Ankunft am schnellsten?'), four('e', howV, tagsV)),
        choice('pair', L('(c) Which two gain the same kinetic energy?', '(c) Welche zwei gewinnen gleich viel kinetische Energie?'), words(r, pairs.map(([ids, ok]) => [`${nm(ids[0])}, ${nm(ids[1])}`.replace(/^./, (c) => c.toUpperCase()), ok, howK])).map((o) => (o.ok ? o : { ...o, tag: /n|N/.test(o.label) && /Neutron|neutron/.test(o.label) ? 'other' : 'mass' }))),
      ],
      hints: [
        L('A positive charge moves towards lower potential, a negative one towards higher; a neutral one feels no force.', 'Eine positive Ladung bewegt sich zu tieferem Potential, eine negative zu höherem; eine neutrale spürt keine Kraft.'),
        L(`From rest, E_kin = |q|·|V_AB| with |V_AB| = ${kv(U)}: only the charge counts, not the mass or the path.`, `Aus der Ruhe ist E_kin = |q|·U mit U = ${kv(U)}: Nur die Ladung zählt, nicht die Masse oder der Weg.`),
        L('v = √(2·E_kin/m): for the speed, compare the charge per mass.', 'v = √(2·E_kin/m): Für die Geschwindigkeit vergleiche die Ladung pro Masse.'),
      ],
      solution: [howK, howV], solFig: `<div class="figs">${fig(A.bars([['p', 1], ['α', 2], ['n', 0], ['e⁻', 1]].map(([n, z]) => ({ name: n, pot: 0, kin: z * U })), { values: eV, H: 70 }))}</div>`,
      p: { VA, VB },
    };
  }

  const TYPES = {
    ab: [1, ab], 'ab-num': [2, abNum], 'ab-bars': [2, abBars], gun: [2, gun], linac: [3, linac], ruth: [3, ruth], cmp: [2, cmp], race: [2, race], 'cmp-ratio': [3, cmpRatio],
  };
  function make(type, seed) {
    const [difficulty, f] = TYPES[type];
    return { ...f(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }

  // ---------------------------------------------------------------- the check
  const OBJECTIVES = [
    { id: 'ab', kinds: ['ab:W', 'ab:v', 'ab-num:K', 'ab-bars:bars'], tutor: 0, topic: 0,
      name: () => L('Find how the kinetic energy and the speed of a charge change between two points A and B of a field, from W = q·(V_A − V_B), and show it with energy bars.', 'Bestimmen, wie sich die kinetische Energie und die Geschwindigkeit einer Ladung zwischen zwei Punkten A und B eines Feldes ändern, aus W = q·(Φ_A − Φ_B), und es mit Energiebalken darstellen.') },
    { id: 'accel', kinds: ['gun:start', 'gun:K', 'gun:v', 'linac:K', 'linac:r'], tutor: 1, topic: 1,
      name: () => L('Find the energy in eV and the speed of a charge accelerated from rest through a voltage, also in several steps.', 'Die Energie in eV und die Geschwindigkeit einer Ladung bestimmen, die aus der Ruhe durch eine Spannung beschleunigt wird, auch in mehreren Stufen.') },
    { id: 'rutherford', kinds: ['ruth:r', 'ruth:E2', 'ruth:half'], tutor: 2, topic: 2,
      name: () => L("Use energy conservation for a charge slowed down by a field, as in Rutherford's experiment: the distance of closest approach.", 'Die Energieerhaltung auf eine Ladung anwenden, die von einem Feld gebremst wird, wie in Rutherfords Streuversuch: der kleinste Abstand.') },
    { id: 'compare', kinds: ['cmp:K', 'cmp:v', 'race:K', 'race:v', 'cmp-ratio:v'], tutor: 3, topic: 3,
      name: () => L('Compare the energies and speeds of two particles with different charges and masses accelerated through the same voltage.', 'Die Energien und Geschwindigkeiten zweier Teilchen mit verschiedenen Ladungen und Massen vergleichen, die mit derselben Spannung beschleunigt werden.') },
  ];
  // the tags of wrong options that are typical wrong ideas (check.js: concept)
  const CONCEPT = { sign: 'sign', order: 'sign', path: 'path', z: 'charge', total: 'total', charge: 'sign', start: 'total', two: 'formula', half: 'formula', sqrt: 'sqrt', r2: 'r1', mass: 'mass', qm: 'qm' };
  // one question of a practice exercise, with four options (a seed further on otherwise)
  function checkQuestion(kind, seed) {
    const [type, key] = kind.split(':');
    let e, q;
    for (let s = seed; ; s += 1000) {
      e = make(type, s); q = e.questions.find((x) => x.key === key);
      if (q && q.options.length === 4) break;
    }
    return {
      title: e.title, text: e.text, figure: `<div class="figs">${e.figs || ''}</div>`, ask: cap(q.label.replace(/^\([a-d]\) /, '')),
      options: q.options.map((o) => ({ html: o.html || o.label, correct: o.ok, flag: o.ok ? undefined : o.tag || 'other', why: o.why })),
      explain: () => `${e.solFig || ''}<div class="steps">${e.solution.map((s) => `<p>${s}</p>`).join('')}</div>`,
      key: `${e.id}|${key}`,
    };
  }
  const api = { TYPES: Object.keys(TYPES), make, OBJECTIVES, CONCEPT, question: checkQuestion, RULE, subs, abScene, abFig, gunFig, linacFig, ruthFig, raceFig, eV, eVs, Vs, kv, volts, vOf, speed, zq };
  root.AvEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
