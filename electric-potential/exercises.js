// The exercises of Electric Potential, with their texts, in the current language. The form is that
// of Electric Field (exercises.js there), with the physics and drawings of charges.js and the
// helpers of elec.js.
// The types:
//   which-qty, points-v          potential, potential energy and voltage told apart; potentials at
//                                points: voltage, energy, work
//   uniform-d, v2e, e2v          the uniform field: ΔV = E·d along the field lines; V(x) ↔ E(x)
//   point-v, scalar              the potential of point charges in units of V₀ (a sum of numbers, not of vectors)
//   which-way, gain-lose         which way a charge moves; whether it gains or loses potential energy
//   stmts                        which statements are correct?
// The check (check.js): OBJECTIVES, CONCEPT and question(kind, seed), a question of an exercise.
// A wrong option may carry a nudge: shown in practice in place of a why that gives the answer away.
(function (root) {
  'use strict';

  const E = root.Elec || require('./elec.js');
  const C = root.Charges || require('./charges.js');
  const { cap, rng, dkey, dirName, dirOf, nice, values, choice, tiles, words, particle, chargeOf } = E;
  // Indices: every text goes through L, where V_AB is written as V<sub>AB</sub> (the potential V,
  // in German Φ; the voltage between A and B is V_AB = V_A − V_B, in German U_AB = Φ_A − Φ_B).
  const subs = (s) => String(s).replace(/([A-Za-zΦ])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>');
  const L = (en, de) => subs(E.L(en, de));
  // the voltage between a and b, with its definition: V_ab = V_a − V_b
  const vab = (a, b) => L(`V_${a}${b} = V_${a} − V_${b}`, `U_${a}${b} = Φ_${a} − Φ_${b}`);
  const ORDER = (a, b) => L(`Mind the order of the indices: ${vab(a, b)}.`, `Achte auf die Reihenfolge der Indizes: ${vab(a, b)}.`);
  const V0 = () => L('V₀', 'Φ₀');
  const fig = (html) => `<div class="fig">${html}</div>`;
  const sgn = (x) => (x > 0 ? `+${nice(x)}` : x < 0 ? `−${nice(-x)}` : '0');
  const tile = (d, none) => `<span class="dtile">${C.icon(d)}<span>${dirName(d, none)}</span></span>`;
  const frac = (x) => (Math.abs(x - 1) < 1e-9 ? '×1' : x > 1 ? `×${nice(x)}` : `×1/${nice(1 / x)}`);
  const eV = (x) => `${sgn(x)} eV`;
  const RULE = () => L('The potential energy of a charge q at a point with potential V is q·V. Moving from A to B, the field does the work W = q·(V_A − V_B) = q·V_AB, and the kinetic energy changes by that much.', 'Die potentielle Energie einer Ladung q in einem Punkt mit dem Potential Φ ist q·Φ. Von A nach B verrichtet das Feld die Arbeit W = q·(Φ_A − Φ_B) = q·U_AB, und die kinetische Energie ändert sich um so viel.');
  // In practice, while the exercise is open, a nudge in place of a reason that would give the answer
  // away (app.js); the reason itself stays for the check and once the exercise is solved.
  const NUDGE = {
    testqV: () => L('Does the potential at P depend on the charge placed there?', 'Hängt das Potential in P von der Ladung ab, die dort liegt?'),
    testqU: () => L('Does the potential difference between P and Q depend on the charge that is moved?', 'Hängt die Spannung zwischen P und Q von der Ladung ab, die bewegt wird?'),
    gain: () => L('Mind the sign: what sign does the charge have, and does the potential rise or fall from A to B?', 'Achte auf das Vorzeichen: Welches Vorzeichen hat die Ladung, und steigt oder fällt das Potential von A nach B?'),
    uniform: () => L(`Check the sign: does the potential rise or fall in the direction of the field? Mind the order of the indices, ${vab('B', 'A')}.`, `Prüfe das Vorzeichen: Steigt oder fällt das Potential in Feldrichtung? Achte auf die Reihenfolge der Indizes, ${vab('B', 'A')}.`),
    v2e: () => L('Check the sign: E = −dV/dx. Where V rises, which sign must E have?', 'Prüfe das Vorzeichen: E = −dΦ/dx. Welches Vorzeichen muss E haben, wo Φ steigt?'),
    e2v: () => L('Check the direction: E = −dV/dx. Where E is positive, must V rise or fall?', 'Prüfe die Richtung: E = −dΦ/dx. Muss Φ steigen oder fallen, wo E positiv ist?'),
    field: () => L('That is how the field falls off. How does the potential of a point charge depend on r?', 'So nimmt das Feld ab. Wie hängt das Potential einer Punktladung von r ab?'),
  };
  const DOWNHILL = () => L('Left to itself, a positive charge moves towards lower potential, a negative charge towards higher potential; either way its potential energy decreases.', 'Sich selbst überlassen, bewegt sich eine positive Ladung zu tieferem Potential, eine negative zu höherem; so oder so nimmt ihre potentielle Energie ab.');

  // ---------------------------------------------------------------- graphs V(x) and E(x)
  // f on [0, 8] (x in mm), with jumps allowed at the breaks (dotted); y from lo to hi
  function lineGraph(f, breaks, o) {
    const W = o.small ? 250 : 320, H = o.small ? 170 : 210, L0 = 36, B = 24, T = 26, R = 34, lo = o.lo, hi = o.hi;
    const X = (x) => L0 + (x / 8) * (W - L0 - R), Y = (y) => T + ((hi - y) / (hi - lo)) * (H - T - B);
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    for (let x = 1; x <= 8; x++) s += `<line class="grid" x1="${X(x)}" y1="${Y(hi)}" x2="${X(x)}" y2="${Y(lo)}"/>`;
    for (let y = lo; y <= hi; y += o.step || 1) if (y !== 0) s += `<line class="grid" x1="${X(0)}" y1="${Y(y)}" x2="${X(8)}" y2="${Y(y)}"/>`;
    s += `<line class="axisline" x1="${X(0)}" y1="${Y(lo)}" x2="${X(0)}" y2="${Y(hi) - 6}"/><line class="axisline" x1="${X(0)}" y1="${Y(0)}" x2="${X(8) + 6}" y2="${Y(0)}"/>`;
    for (let y = lo; y <= hi; y += o.label || 2) s += C.txt(X(0) - 5, Y(y) + 4, String(y).replace('-', '−'), 'tick', 'end');
    for (let x = 0; x <= 6; x += 2) s += C.txt(X(x), H - 6, String(x), 'tick'); // not 8: the axis name is there
    s += C.txt(W - 2, H - 6, '<tspan class="it">x</tspan> in mm', 'tick', 'end') + C.txt(L0 + 6, 15, o.yname, `lbl small ${o.cls || ''}`, 'start');
    let d = '';
    breaks.slice(0, -1).forEach((a, i) => {
      const b = breaks[i + 1], n = 20, pts = [];
      for (let k = 0; k <= n; k++) { const x = a + ((b - a) * k) / n; pts.push(`${X(x).toFixed(1)},${Y(f(Math.min(x, b - 1e-9))).toFixed(1)}`); }
      if (i > 0 && !o.joined) { const u = f(a - 1e-9), w = f(a); if (Math.abs(u - w) > 1e-6) s += `<line class="jump" x1="${X(a)}" y1="${Y(u)}" x2="${X(a)}" y2="${Y(w)}"/>`; }
      d += `${i && o.joined ? 'L' : 'M'}${pts.join(' L')} `;
    });
    s += `<path class="gcurve ${o.cls || ''}" d="${d.trim()}"/>`;
    return C.svg(W, H, s, o.label || '', o.small ? 'small' : '');
  }
  const vGraph = (f, br, small) => lineGraph(f, br, { lo: 0, hi: 8, step: 1, label: 2, yname: L('<tspan class="it">V</tspan> in V', '<tspan class="it">Φ</tspan> in V'), cls: 'c-v', joined: true, small });
  const eGraph = (f, br, small) => lineGraph(f, br, { lo: -3, hi: 3, step: 1, label: 1, yname: '<tspan class="it">E</tspan> in kV/m', cls: 'c-e', small });

  // ---------------------------------------------------------------- potentials at points
  // equipotential lines of a uniform field (vertical, V falling to the right) with points on them
  function pointsV(seed) {
    const r = rng(seed * 31 + 7), step = r.pick([20, 50, 100]), V0 = r.pick([1, 2]) * step, n = 6, levels = Array.from({ length: n }, (x, i) => V0 + (n - 1 - i) * step);
    const xs = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5], pick = r.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3), ys = [1.2, -0.4, 0.6];
    const P = pick.map((k, i) => ({ x: xs[k], y: ys[i], V: levels[k], name: 'ABC'[i] }));
    const [A, B, Cc] = P, qn = r.pick([2, 3.4, 5]), pt = particle(r, r.pick([1, -1]), { generic: false });
    const dVAC = Cc.V - A.V, Epot = qn * B.V, Wp = pt.z * (A.V - B.V);
    const elec = B.V - Cc.V; // an electron from C to B: ΔE_kin = −e·(V_C − V_B), in eV
    const howU = L(`The potential difference is ${vab('C', 'A')} = ${nice(Cc.V)} V − ${nice(A.V)} V = ${sgn(dVAC)} V.`, `Die Spannung ist ${vab('C', 'A')} = ${nice(Cc.V)} V − ${nice(A.V)} V = ${sgn(dVAC)} V.`);
    const howE = L(`E_pot = q·V_B = ${nice(qn)} nC · ${nice(B.V)} V = ${nice(Epot)} nJ.`, `E_pot = q·Φ_B = ${nice(qn)} nC · ${nice(B.V)} V = ${nice(Epot)} nJ.`);
    const howW = L(`W = q·(V_A − V_B) = ${pt.z > 0 ? (pt.z > 1 ? '2e' : 'e') : '−e'} · (${nice(A.V)} V − ${nice(B.V)} V) = ${eV(Wp)}.`, `W = q·(Φ_A − Φ_B) = ${pt.z > 0 ? (pt.z > 1 ? '2e' : 'e') : '−e'} · (${nice(A.V)} V − ${nice(B.V)} V) = ${eV(Wp)}.`);
    const howK = L(`ΔE_kin = W = q·(V_C − V_B) = −e · (${nice(Cc.V)} V − ${nice(B.V)} V) = ${eV(elec)}.`, `ΔE_kin = W = q·(Φ_C − Φ_B) = −e · (${nice(Cc.V)} V − ${nice(B.V)} V) = ${eV(elec)}.`);
    const fmtV = (v) => `${sgn(v)} V`, fmtJ = (v) => `${nice(v)} nJ`;
    const sgnTrap = (x, how) => ({ value: -x, tag: 'sign', why: L(`Mind the sign. ${how}`, `Achte auf das Vorzeichen. ${how}`) });
    const orderTrap = { value: -dVAC, tag: 'sign', why: `${ORDER('C', 'A')} ${howU}` };
    return {
      kind: 'pot', title: L('Potentials at points', 'Potentiale in Punkten'),
      text: L(`<p>The figure shows equipotential lines of an electric field with their potentials, and three points A, B and C on them.</p>`, `<p>Die Abbildung zeigt Äquipotentiallinien eines elektrischen Feldes mit ihren Potentialen und drei Punkte A, B und C darauf.</p>`),
      figs: fig(C.fig({ kind: 'uniform', E: [1, 0] }, { box: [-3, 3, -1.8, 1.8], given: xs.map((x) => [[x, -3], [x, 3]]), equiLines: true, points: P.map((p) => ({ x: p.x, y: p.y, name: p.name })), tops: xs.map((x, i) => ({ x, label: `${levels[i]} V` })) })),
      questions: [
        choice('U', L('(a) the potential difference V_CA', '(a) die Spannung U_CA'), values(dVAC, [orderTrap, { value: Cc.V + A.V, tag: 'sum', why: howU }], null, howU, { signed: true, fmt: fmtV, extra: [2, 0.5] })),
        choice('Ep', L(`(b) the potential energy of a test charge of +${nice(qn)} nC at B`, `(b) die potentielle Energie einer Probeladung von +${nice(qn)} nC in B`), values(Epot, [{ value: B.V / qn, tag: 'div', why: howE }], null, howE, { fmt: fmtJ })),
        choice('W', L(`(c) the work done by the field on ${pt.name()} moving from A to B`, `(c) die Arbeit, die das Feld an ${pt.name().replace(/^ein /, 'einem ').replace(/^eine /, 'einer ')} verrichtet, das sich von A nach B bewegt`), values(Wp, [sgnTrap(Wp, howW), ...(Math.abs(pt.z) === 2 ? [{ value: Wp / 2, tag: 'z', why: L(`An alpha particle has the charge 2e. ${howW}`, `Ein Alphateilchen hat die Ladung 2e. ${howW}`) }] : [])], null, howW, { signed: true, fmt: eV, extra: [2, 0.5] })),
        choice('K', L('(d) the change of the kinetic energy of an electron moving from C to B', '(d) die Änderung der kinetischen Energie eines Elektrons, das sich von C nach B bewegt'), values(elec, [sgnTrap(elec, howK)], null, howK, { signed: true, fmt: eV, extra: [2, 0.5] })),
      ],
      hints: [`${L('The potential difference between two points:', 'Die Spannung zwischen zwei Punkten:')} ${vab('A', 'B')}. ${RULE()}`, L('1 eV is the energy of a charge e moved through 1 V.', '1 eV ist die Energie einer Ladung e, die 1 V durchläuft.'), chargeOf(pt)],
      solution: [howU, howE, howW, howK], p: { step, V0, pick: pick.join(''), pt: pt.id, qn },
    };
  }
  function whichWay(seed) {
    const mv = (x) => String(x).replace('-', '−');
    const r = rng(seed * 37 + 11), q = r.pick([1, 1, -1, -1, 0]), pt = particle(r, q), Vl = r.pick([0, 100, 200]), Vr = Vl + r.pick([-1, 1]) * r.pick([100, 200, 300]);
    const Ed = Vl > Vr ? [1, 0] : [-1, 0]; // the field points from high to low potential
    const move = q > 0 ? Ed : q < 0 ? [-Ed[0], 0] : null, toHigh = q < 0;
    const how = q ? L(`${DOWNHILL()} The left plate is at ${mv(Vl)} V, the right one at ${mv(Vr)} V: ${q > 0 ? 'lower' : 'higher'} potential is ${dirName(move)}.`, `${DOWNHILL()} Die linke Platte liegt auf ${mv(Vl)} V, die rechte auf ${mv(Vr)} V: ${q > 0 ? 'Tieferes' : 'Höheres'} Potential liegt ${dirName(move)}.`)
      : L('A neutral particle feels no force: it stays where it is.', 'Ein neutrales Teilchen spürt keine Kraft: Es bleibt, wo es ist.');
    const opts = [{ d: move, ok: true }];
    // the opposite way: the sign of the charge or of ΔV mixed up
    for (const d of [move ? [-move[0], 0] : [1, 0], move ? null : [-1, 0], [0, 1]]) if (opts.length < 4 && !opts.some((o) => dkey(o.d) === dkey(d))) opts.push({ d, tag: move && d && d[0] === -move[0] ? 'sign' : 'other' });
    const howE = L('Released at rest, the charge speeds up: its kinetic energy grows, so its potential energy falls.', 'In Ruhe losgelassen, wird die Ladung schneller: Ihre kinetische Energie wächst, also nimmt ihre potentielle Energie ab.');
    const qs = [tiles('m', L('(a) Released at rest, it moves', '(a) In Ruhe losgelassen, bewegt es sich'), r.shuffle(opts).map((o) => ({ html: tile(o.d, L('it stays', 'es bleibt')), ok: !!o.ok, tag: o.tag, why: o.ok ? '' : how })))];
    if (q) {
      qs.push(choice('V', L('(b) It moves towards', '(b) Es bewegt sich zu'), words(r, [[L('higher potential', 'höherem Potential'), toHigh, how], [L('lower potential', 'tieferem Potential'), !toHigh, how]])));
      qs.push(choice('Ep', L('(c) Its potential energy', '(c) Seine potentielle Energie'), words(r, [[L('decreases', 'nimmt ab'), true, ''], [L('increases', 'nimmt zu'), false, howE], [L('stays the same', 'bleibt gleich'), false, howE]])));
    }
    return {
      kind: 'pot', title: L('Which way?', 'In welche Richtung?'),
      text: L(`<p>Between two parallel plates at ${mv(Vl)} V (left) and ${mv(Vr)} V (right), ${pt.name()} is released at rest.</p>`, `<p>Zwischen zwei parallelen Platten auf ${mv(Vl)} V (links) und ${mv(Vr)} V (rechts) wird ${pt.name()} in Ruhe losgelassen.</p>`),
      figs: fig(C.fig({ kind: 'uniform', E: Ed }, { box: [-2.75, 2.75, -1.6, 1.6], lines: true, rods: [[-2.6, -1.5, -2.6, 1.5], [2.6, -1.5, 2.6, 1.5]], parts: [{ x: 0, y: 0, q, sym: pt.sym }], tops: [{ x: -2.6, label: `${mv(Vl)} V` }, { x: 2.6, label: `${mv(Vr)} V` }] })),
      questions: qs, hints: [chargeOf(pt), DOWNHILL(), L('The field points from high to low potential.', 'Das Feld zeigt von hohem zu tiefem Potential.')],
      solution: q ? [how, howE] : [how], p: { q, Vl, Vr, pt: pt.id },
    };
  }

  // Potential, potential energy and voltage told apart: the test charge at P is replaced by
  // another one. The potential belongs to the point, the potential energy to the charge at the
  // point, the voltage to two points.
  // options: the right value and its negative, then the first mistake [value, tag, why, nudge] of
  // another size and its negative (so that the sign gives nothing away), sorted
  function opts4(right, mistakes, how, fmt) {
    const same = (a, b) => Math.abs(Math.abs(a) - Math.abs(b)) < 1e-9;
    const [value, tag, why, nudge] = mistakes.find(([v]) => !same(v, right)) || [2 * right, 'other', how];
    const flip = (x, w, n) => { const m = mistakes.find(([v]) => Math.abs(v + x) < 1e-9); return m ? { value: -x, tag: m[1], why: m[2], nudge: m[3] } : { value: -x, tag: 'sign', why: w, nudge: n }; };
    const out = [{ value: right, ok: true, why: '' }, flip(right, how), { value, tag, why, nudge }, flip(value, why, nudge)];
    return out.sort((a, b) => a.value - b.value).map((o) => ({ label: fmt(o.value), ok: !!o.ok, tag: o.ok ? undefined : o.tag, why: o.why, ...(o.nudge ? { nudge: o.nudge } : {}) }));
  }
  const num = (x) => nice(x).replace('-', '−');
  function whichQty(seed) {
    const r = rng(seed * 103 + 71);
    let VP, VQ;
    do { VP = r.pick([100, 200, 300, 400]); VQ = r.pick([0, 50, 100, 150, 200, 250, 300, 500]); } while (VQ === VP || 2 * VQ === VP);
    const q = r.pick([1, 2, 3]), k = r.pick([2, 3, -1, -2]), q2 = k * q, U = VP - VQ, nC = (x) => `${x > 0 ? '+' : '−'}${Math.abs(x)} nC`;
    const fV = (x) => `${sgn(x)} V`, fJ = (x) => `${sgn(x)} nJ`;
    const howV = L(`The potential belongs to the point P, not to the charge placed there: V_P = ${VP} V, whatever the charge.`, `Das Potential gehört zum Punkt P, nicht zur Ladung, die dort liegt: Φ_P = ${VP} V, welche Ladung auch immer.`);
    const howE = L(`The potential energy belongs to the charge at P: E_pot = q′·V_P = ${nC(q2)} · ${VP} V = ${fJ(q2 * VP)}.`, `Die potentielle Energie gehört zur Ladung in P: E_pot = q′·Φ_P = ${nC(q2)} · ${VP} V = ${fJ(q2 * VP)}.`);
    const howU = L(`The potential difference belongs to two points: ${vab('P', 'Q')} = ${VP} V − ${VQ} V = ${fV(U)}, whatever charge is moved.`, `Die Spannung gehört zu zwei Punkten: ${vab('P', 'Q')} = ${VP} V − ${VQ} V = ${fV(U)}, welche Ladung auch immer bewegt wird.`);
    const testq = (how) => L(`The test charge does not change the potentials. ${how}`, `Die Probeladung ändert die Potentiale nicht. ${how}`);
    return {
      kind: 'pot', title: L('Potential, potential energy, voltage', 'Potential, potentielle Energie, Spannung'),
      text: L(`<p>At the point P the potential is V_P = ${VP} V, at the point Q it is V_Q = ${VQ} V (zero far away). A test charge q = ${nC(q)} at P has the potential energy ${fJ(q * VP)}. It is replaced by the charge q′ = ${nC(q2)}.</p>`,
        `<p>Im Punkt P ist das Potential Φ_P = ${VP} V, im Punkt Q ist es Φ_Q = ${VQ} V (weit weg null). Eine Probeladung q = ${nC(q)} in P hat die potentielle Energie ${fJ(q * VP)}. Sie wird durch die Ladung q′ = ${nC(q2)} ersetzt.</p>`),
      figs: '',
      questions: [
        choice('V', L('(a) Now the potential at P is', '(a) Jetzt ist das Potential in P'), opts4(VP, [[k * VP, 'testq', testq(howV), NUDGE.testqV()], [U, 'diff', L(`That is the potential difference V_PQ between P and Q. ${howV}`, `Das ist die Spannung U_PQ zwischen P und Q. ${howV}`)]], howV, fV)),
        choice('Ep', L('(b) The potential energy of q′ at P is', '(b) Die potentielle Energie von q′ in P ist'), opts4(q2 * VP, [[q * VP, 'noq', L(`The potential energy is proportional to the charge. ${howE}`, `Die potentielle Energie ist proportional zur Ladung. ${howE}`)], [-q2 * VP, 'sign', L(`Mind the sign of q′. ${howE}`, `Achte auf das Vorzeichen von q′. ${howE}`)], [q2 * U, 'diff', L(`That is the change of its potential energy from Q to P. ${howE}`, `Das ist die Änderung seiner potentiellen Energie von Q nach P. ${howE}`)]], howE, fJ)),
        choice('U', L('(c) Now the potential difference V_PQ is', '(c) Jetzt ist die Spannung U_PQ'), opts4(U, [[k * U, 'testq', testq(howU), NUDGE.testqU()], [VP, 'point', L(`That is the potential at P alone. ${howU}`, `Das ist das Potential in P allein. ${howU}`)], [-U, 'sign', `${ORDER('P', 'Q')} ${howU}`]], howU, fV)),
      ],
      hints: [L(`The potential V belongs to a point; the potential energy q·V to a charge at a point; the potential difference ${vab('P', 'Q')} to two points.`, `Das Potential Φ gehört zu einem Punkt; die potentielle Energie q·Φ zu einer Ladung in einem Punkt; die Spannung ${vab('P', 'Q')} zu zwei Punkten.`), L('Which of the three depends on the charge?', 'Welche der drei Grössen hängt von der Ladung ab?')],
      solution: [howV, howE, howU], p: { VP, VQ, q, k },
    };
  }

  // Gaining or losing potential energy: a charge moves from A to B between equipotentials;
  // ΔE_pot = q·(V_B − V_A), the signs of q and of ΔV decide.
  function gainLose(seed) {
    const r = rng(seed * 107 + 73), step = r.pick([50, 100]), V0 = r.pick([-2, -1, 0, 1]) * step, n = 6, levels = Array.from({ length: n }, (x, i) => V0 + (n - 1 - i) * step);
    const xs = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5], [ia, ib] = r.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 2), ys = r.shuffle([1.1, -0.9, 0.3]);
    const A = { x: xs[ia], y: ys[0], V: levels[ia], name: 'A' }, B = { x: xs[ib], y: ys[1], V: levels[ib], name: 'B' };
    const pt = particle(r, r.pick([1, -1]), { generic: false }), z = pt.z, dV = B.V - A.V, dE = z * dV;
    const qs = z === 2 ? '2e' : z === 1 ? 'e' : '−e';
    const how = L(`ΔV = V_B − V_A = ${num(B.V)} V − ${num(A.V)} V = ${sgn(dV)} V, so ΔE_pot = q·ΔV = ${qs} · (${sgn(dV)} V) = ${sgn(dE)} eV: the potential energy ${dE > 0 ? 'increases' : 'decreases'}.`,
      `ΔΦ = Φ_B − Φ_A = ${num(B.V)} V − ${num(A.V)} V = ${sgn(dV)} V, also ΔE_pot = q·ΔΦ = ${qs} · (${sgn(dV)} V) = ${sgn(dE)} eV: Die potentielle Energie ${dE > 0 ? 'nimmt zu' : 'nimmt ab'}.`);
    const howK = L(`With only the field acting, the energy is conserved: the kinetic energy changes by −ΔE_pot = ${sgn(-dE)} eV.`, `Wirkt nur das Feld, bleibt die Energie erhalten: Die kinetische Energie ändert sich um −ΔE_pot = ${sgn(-dE)} eV.`);
    const grow = (x) => (x > 0 ? L(`increases by ${nice(x)} eV`, `nimmt um ${nice(x)} eV zu`) : L(`decreases by ${nice(-x)} eV`, `nimmt um ${nice(-x)} eV ab`));
    const sign = pt.q > 0 ? L(`Mind the sign: for a positive charge, the potential energy follows the potential. ${how}`, `Achte auf das Vorzeichen: Bei einer positiven Ladung folgt die potentielle Energie dem Potential. ${how}`)
      : L(`Mind the sign: for a negative charge, the potential energy falls where the potential rises. ${how}`, `Achte auf das Vorzeichen: Bei einer negativen Ladung fällt die potentielle Energie, wo das Potential steigt. ${how}`);
    return {
      kind: 'pot', title: L('Gaining or losing potential energy', 'Potentielle Energie gewinnen oder verlieren'),
      text: L(`<p>The figure shows equipotential lines with their potentials. ${cap(pt.name())} moves from A to B.</p>`, `<p>Die Abbildung zeigt Äquipotentiallinien mit ihren Potentialen. ${cap(pt.name())} bewegt sich von A nach B.</p>`),
      figs: fig(C.fig({ kind: 'uniform', E: [1, 0] }, { box: [-3, 3, -1.8, 1.8], given: xs.map((x) => [[x, -3], [x, 3]]), equiLines: true, points: [A, B], tops: xs.map((x, i) => ({ x, label: `${levels[i]} V` })) })),
      questions: [
        choice('Ep', L('(a) Its potential energy', '(a) Seine potentielle Energie'), values(dE, [{ value: -dE, tag: 'sign', why: sign, nudge: NUDGE.gain() }, ...(z === 2 ? [{ value: dE / 2, tag: 'z', why: L(`An alpha particle has the charge 2e. ${how}`, `Ein Alphateilchen hat die Ladung 2e. ${how}`) }] : [])], null, how, { signed: true, fmt: grow, extra: [2, 0.5] })),
        choice('K', L('(b) If only the field acts on it, its kinetic energy', '(b) Wirkt nur das Feld darauf, so nimmt seine kinetische Energie'), words(r, [[L('increases', 'zu'), dE < 0, howK], [L('decreases', 'ab'), dE > 0, howK]])),
      ],
      hints: [L('ΔE_pot = q·(V_B − V_A): first the sign of ΔV, then that of q.', 'ΔE_pot = q·(Φ_B − Φ_A): zuerst das Vorzeichen von ΔΦ, dann das von q.'), chargeOf(pt), L('1 eV is the energy of a charge e moved through 1 V.', '1 eV ist die Energie einer Ladung e, die 1 V durchläuft.')],
      solution: [how, howK], p: { step, V0, ia, ib, pt: pt.id },
    };
  }

  // ---------------------------------------------------------------- the uniform field
  function uniformD(seed) {
    const r = rng(seed * 41 + 13);
    for (;;) {
      const Ef = r.pick([100, 200, 250, 400, 500]), ax = r.int(-2, 1), ay = r.int(-1, 1), bx = r.int(-2, 2), by = r.int(-1, 1);
      if (ax === bx || ay === by) continue;
      const dx = (bx - ax) / 100, dV = -Ef * dx, dist = Math.hypot(bx - ax, by - ay) / 100, Wel = dV; // electron from A to B: W = −e(V_A − V_B) = e·(V_B − V_A)
      const how = L(`Only the distance along the field lines counts: ${Math.abs(bx - ax)} cm. Along the field the potential falls: ${vab('B', 'A')} = −E·Δx = −${Ef} V/m · (${sgn(bx - ax)} cm) = ${sgn(dV)} V.`, `Nur der Abstand längs der Feldlinien zählt: ${Math.abs(bx - ax)} cm. In Feldrichtung fällt das Potential: ${vab('B', 'A')} = −E·Δx = −${Ef} V/m · (${sgn(bx - ax)} cm) = ${sgn(dV)} V.`);
      const howW = L(`W = q·(V_A − V_B) = −e · (${sgn(-dV)} V) = ${eV(Wel)}.`, `W = q·(Φ_A − Φ_B) = −e · (${sgn(-dV)} V) = ${eV(Wel)}.`);
      const fmtV = (v) => `${sgn(v)} V`;
      return {
        kind: 'uni', title: L('Along the field lines', 'Längs der Feldlinien'),
        text: L(`<p>A uniform field of ${Ef} V/m points to the right. The grid spacing is 1 cm.</p>`, `<p>Ein homogenes Feld von ${Ef} V/m zeigt nach rechts. Der Gitterabstand ist 1 cm.</p>`),
        figs: fig(C.fig({ kind: 'uniform', E: [1, 0] }, { box: [-3, 3, -1.6, 1.6], lines: true, lineOpts: { gap: 1 }, grid: true, points: [{ x: ax, y: ay, name: 'A' }, { x: bx, y: by, name: 'B' }] })),
        questions: [
          choice('U', L('(a) the potential difference V_BA', '(a) die Spannung U_BA'), values(dV, [{ value: -dV, tag: 'sign', why: L(`The potential falls along the field; mind the order of the indices, ${vab('B', 'A')}. ${how}`, `Das Potential fällt in Feldrichtung; achte auf die Reihenfolge der Indizes, ${vab('B', 'A')}. ${how}`), nudge: NUDGE.uniform() }, { value: -Ef * dist * Math.sign(dx), tag: 'straight', why: L(`Not the straight distance AB: only the part along the field lines counts. ${how}`, `Nicht der direkte Abstand AB: Nur der Teil längs der Feldlinien zählt. ${how}`) }, { value: -Ef * Math.abs(by - ay) / 100 * Math.sign(dx), tag: 'across', why: how }], null, how, { signed: true, fmt: fmtV, extra: [2, 0.5] })),
          choice('W', L('(b) the work done by the field on an electron moving from A to B', '(b) die Arbeit, die das Feld an einem Elektron verrichtet, das sich von A nach B bewegt'), values(Wel, [{ value: -Wel, tag: 'sign', why: L(`The electron is negative. ${howW}`, `Das Elektron ist negativ. ${howW}`) }], null, howW, { signed: true, fmt: eV, extra: [2, 0.5] })),
        ],
        hints: [L(`${vab('B', 'A')}. In a uniform field: |ΔV| = E·d, with d the distance measured along the field lines.`, `${vab('B', 'A')}. Im homogenen Feld: |U| = E·d, mit d dem Abstand längs der Feldlinien gemessen.`), L('Moving across the field lines changes nothing: those are equipotentials.', 'Eine Bewegung quer zu den Feldlinien ändert nichts: Das sind Äquipotentiallinien.'), L('The potential falls in the direction of the field.', 'Das Potential fällt in Feldrichtung.')],
        solution: [how, howW], p: { Ef, ax, ay, bx, by },
      };
    }
  }
  // V(x) straight pieces at whole mm, slopes in V/mm (= kV/m); E = −dV/dx
  function vPieces(r) {
    for (;;) {
      const br = [0], sl = [];
      while (br[br.length - 1] < 8) { const l = r.pick([1, 2, 2, 3]); if (br[br.length - 1] + l > 8) continue; br.push(br[br.length - 1] + l); sl.push(r.pick([-2, -1, 0, 1, 2])); }
      if (sl.some((s, i) => i && s === sl[i - 1]) || sl.filter((s) => s).length < 2) continue;
      let v = 0, lo = 0, hi = 0;
      const at = [0];
      sl.forEach((s, i) => { v += s * (br[i + 1] - br[i]); at.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); });
      if (hi - lo > 8) continue;
      const v0 = r.int(-lo, 8 - hi), V = (x) => { let i = sl.length - 1; while (i > 0 && x < br[i]) i--; return v0 + at[i] + sl[i] * (x - br[i]); };
      const Ef = (x) => { let i = sl.length - 1; while (i > 0 && x < br[i]) i--; return -sl[i]; };
      return { br, sl, v0, V, E: Ef };
    }
  }
  const WHYG = {
    sign: () => L(`The field points towards lower potential: E = −dV/dx. Where V rises, E is negative.`, `Das Feld zeigt zu tieferem Potential: E = −dΦ/dx. Wo Φ steigt, ist E negativ.`),
    copy: () => L('This graph has the shape of the other one. But E is the slope of V (with the opposite sign), not V itself: where V is constant, E = 0.', 'Dieser Graph hat die Form des anderen. Aber E ist die Steigung von Φ (mit umgekehrtem Vorzeichen), nicht Φ selbst: Wo Φ konstant ist, ist E = 0.'),
    steep: () => L('In one part, the value does not match the slope: read it off, ΔV/Δx in V/mm = kV/m.', 'In einem Teil passt der Wert nicht zur Steigung: Lies sie ab, ΔΦ/Δx in V/mm = kV/m.'),
  };
  function v2e(seed, back) {
    const r = rng(seed * (back ? 43 : 47) + 17), g = vPieces(r), br = g.br;
    const k = r.int(0, g.sl.length - 1), alt = { ...g, sl: g.sl.map((s, i) => (i === k ? (s === 0 ? r.pick([1, -1]) : Math.sign(s) * (3 - Math.abs(s))) : s)) };
    let a = 0; const atA = [0]; alt.sl.forEach((s, i) => { a += s * (br[i + 1] - br[i]); atA.push(a); });
    const Va = (x) => { let i = alt.sl.length - 1; while (i > 0 && x < br[i]) i--; return g.v0 + atA[i] + alt.sl[i] * (x - br[i]); };
    const Ea = (x) => { let i = alt.sl.length - 1; while (i > 0 && x < br[i]) i--; return -alt.sl[i]; };
    const pieces = g.sl.map((s, i) => L(`${br[i]}–${br[i + 1]} mm: V changes by ${sgn(s * (br[i + 1] - br[i]))} V, so E = ${sgn(-s)} kV/m`, `${br[i]}–${br[i + 1]} mm: Φ ändert sich um ${sgn(s * (br[i + 1] - br[i]))} V, also E = ${sgn(-s)} kV/m`));
    const sol = `${L('E = −dV/dx: the slope of the potential, with the opposite sign (1 V/mm = 1 kV/m).', 'E = −dΦ/dx: die Steigung des Potentials, mit umgekehrtem Vorzeichen (1 V/mm = 1 kV/m).')}<ul>${pieces.map((p) => `<li>${p}.</li>`).join('')}</ul>`;
    const fits = (f, lo, hi) => { for (let x = 0; x <= 8; x += 0.05) { const y = f(Math.min(x, 7.999)); if (y < lo - 1e-9 || y > hi + 1e-9) return false; } return true; };
    let opts;
    if (!back) {
      const [vlo, vhi] = [Math.min(...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(g.V)), Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(g.V))], mid = (vlo + vhi) / 2, sc = 2.4 / Math.max(1, (vhi - vlo) / 2);
      opts = [{ f: g.E, ok: true }, { f: (x) => -g.E(x), tag: 'sign' }, { f: (x) => Math.max(-2.8, Math.min(2.8, sc * (g.V(x) - mid))), tag: 'copy' }, { f: Ea, tag: 'steep' }].map((o) => ({ ...o, html: eGraph(o.f, br, true) }));
    } else {
      const flip = (x) => 2 * g.v0 - g.V(x), cp = (x) => g.v0 + 1.2 * (g.E(x) - g.E(0));
      opts = [{ f: g.V, ok: true }, { f: flip, tag: 'sign' }, { f: cp, tag: 'copy' }, { f: Va, tag: 'steep' }].filter((o) => fits(o.f, 0, 8)).map((o) => ({ ...o, html: vGraph(o.f, br, true) }));
      if (opts.length < 3) return v2e(seed + 1000, back);
    }
    return {
      kind: 'graph', title: back ? L('From E back to V', 'Von E zurück zu Φ') : L('From V to E', 'Von Φ zu E'),
      text: back ? L(`<p>The graph shows the field E along the x axis. At x = 0 the potential is ${g.v0} V.</p>`, `<p>Der Graph zeigt das Feld E längs der x-Achse. Bei x = 0 ist das Potential ${g.v0} V.</p>`) : L('<p>The graph shows the potential V along the x axis (the field points along x).</p>', '<p>Der Graph zeigt das Potential Φ längs der x-Achse (das Feld zeigt längs x).</p>'),
      figs: fig(back ? eGraph(g.E, br) : vGraph(g.V, br)),
      questions: [{ type: 'pick', key: 'g', label: back ? L('Which graph shows the potential?', 'Welcher Graph zeigt das Potential?') : L('Which graph shows the field?', 'Welcher Graph zeigt das Feld?'), options: r.shuffle(opts).map((o) => ({ html: o.html, ok: !!o.ok, tag: o.tag, why: o.ok ? '' : WHYG[o.tag](), ...(!o.ok && o.tag === 'sign' ? { nudge: back ? NUDGE.e2v() : NUDGE.v2e() } : {}) })) }],
      hints: [L('E = −dV/dx: the field is the slope of the potential graph, with the opposite sign.', 'E = −dΦ/dx: Das Feld ist die Steigung des Potentialgraphen, mit umgekehrtem Vorzeichen.'), back ? L('Going back: V changes by −E·Δx, minus the area under the E graph (1 kV/m · 1 mm = 1 V).', 'Zurück: Φ ändert sich um −E·Δx, minus die Fläche unter dem E-Graphen (1 kV/m · 1 mm = 1 V).') : L('Where V is constant, E = 0; where V falls, E is positive.', 'Wo Φ konstant ist, ist E = 0; wo Φ fällt, ist E positiv.')],
      solution: [sol], solFig: `<div class="figs">${fig(vGraph(g.V, br))}${fig(eGraph(g.E, br))}</div>`, p: { br: br.join(','), sl: g.sl.join(','), v0: g.v0 },
    };
  }

  // ---------------------------------------------------------------- point charges
  const FILL = [2, 0.5, 4, 0.25, 1, 3, 1 / 3, 8, 1 / 8, 6, 1 / 6];
  // four options: the right factor (×2, ×1/3), the tempting ones (each one mistake, with its reason), fillers
  function factors(right, tempt, how) {
    const out = [{ x: right, ok: true }];
    for (const [x, why, nudge] of tempt) if (out.length < 4 && !out.some((o) => Math.abs(o.x - x) < 1e-9)) out.push({ x, why, nudge });
    for (const x of FILL) if (out.length < 4 && !out.some((o) => Math.abs(o.x - x) < 1e-9)) out.push({ x, why: how });
    return out.sort((p, q) => p.x - q.x).map((o) => ({ label: frac(o.x), ok: !!o.ok, why: o.ok ? '' : o.why, ...(o.nudge ? { nudge: o.nudge } : {}) }));
  }
  // a multiple of V₀ as a fraction: +3/2 V₀
  function inV0(x) {
    if (Math.abs(x) < 1e-9) return '0';
    for (let d = 1; d <= 12; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-9) { const n = Math.abs(Math.round(x * d)); return `${x > 0 ? '+' : '−'}${d === 1 ? (n === 1 ? '' : n) : `${n}/${d}·`}${V0()}`; }
    return `${x > 0 ? '+' : '−'}${nice(Math.abs(x))}·${V0()}`;
  }
  function pointV(seed) {
    const r = rng(seed * 61 + 31);
    let sQ, k, m, s2, VP;
    for (;;) {
      sQ = r.pick([1, -1]); k = r.pick([2, 3, 4]); m = r.pick([-3, -2, -1, 1, 2, 3]); s2 = r.pick([1, 2, 3]); VP = sQ + m / s2;
      if (Math.abs(VP) > 1e-9 && Math.abs(sQ + m / (s2 * s2) - VP) > 1e-9) break;
    }
    const dBA = sQ * (1 / k - 1), qs = (x) => `${x < 0 ? '−' : '+'}${Math.abs(x) === 1 ? '' : Math.abs(x)}q`;
    const howK = L(`V = k·Q/r falls with 1/r: at ${k} times the distance, the potential is ${frac(1 / k)}.`, `Φ = k·Q/r nimmt mit 1/r ab: beim ${k}-fachen Abstand ist das Potential ${frac(1 / k)}.`);
    const howD = L(`V_A = ${inV0(sQ)}, V_B = ${inV0(sQ / k)}: ${vab('B', 'A')} = ${inV0(dBA)}.`, `Φ_A = ${inV0(sQ)}, Φ_B = ${inV0(sQ / k)}: ${vab('B', 'A')} = ${inV0(dBA)}.`);
    const howP = L(`Potentials add as numbers, with their signs: from Q ${inV0(sQ)}, from q₂ = ${qs(m)} at ${s2 === 1 ? 'the distance r' : `${s2}r`}: ${inV0(m / s2)}. Together V_P = ${inV0(VP)}.`, `Potentiale addieren sich als Zahlen, mit ihren Vorzeichen: von Q ${inV0(sQ)}, von q₂ = ${qs(m)} im Abstand ${s2 === 1 ? 'r' : `${s2}r`}: ${inV0(m / s2)}. Zusammen Φ_P = ${inV0(VP)}.`);
    const field = L('That is how the field falls off, with 1/r²; the potential falls with 1/r.', 'So nimmt das Feld ab, mit 1/r²; das Potential nimmt mit 1/r ab.');
    return {
      kind: 'pc', title: L('The potential of point charges', 'Das Potential von Punktladungen'),
      text: L(`<p>A point charge Q = ${qs(sQ)} (with q > 0; the potential is zero far away). Call V₀ = k·q/r. Point A is at the distance r from Q, point B at the distance ${k}r. Then a second charge q₂ = ${qs(m)} is added: the point P is at the distance r from Q and ${s2 === 1 ? 'r' : `${s2}r`} from q₂.</p>`, `<p>Eine Punktladung Q = ${qs(sQ)} (mit q > 0; weit weg ist das Potential null). Sei Φ₀ = k·q/r. Der Punkt A ist im Abstand r von Q, der Punkt B im Abstand ${k}r. Dann kommt eine zweite Ladung q₂ = ${qs(m)} dazu: Der Punkt P ist im Abstand r von Q und ${s2 === 1 ? 'r' : `${s2}r`} von q₂.</p>`),
      figs: '',
      questions: [
        choice('V', L('(a) Q alone: compared with A, the potential at B is', '(a) Q allein: Verglichen mit A ist das Potential in B'), factors(1 / k, [[1 / (k * k), field, NUDGE.field()], [k, L('Further away, the potential is smaller in size.', 'Weiter weg ist das Potential dem Betrag nach kleiner.')]], howK)),
        choice('U', L('(b) Q alone: the potential difference V_BA', '(b) Q allein: die Spannung U_BA'), values(dBA, [{ value: -dBA, tag: 'sign', why: L(`Mind the order of the indices, ${vab('B', 'A')}, and the sign of Q.`, `Achte auf die Reihenfolge der Indizes, ${vab('B', 'A')}, und auf das Vorzeichen von Q.`) }, { value: sQ * (1 / (k * k) - 1), tag: 'field', why: field, nudge: NUDGE.field() }], null, howD, { signed: true, fmt: inV0, extra: [2, 0.5] })),
        choice('P', L('(c) both charges: the potential at P', '(c) beide Ladungen: das Potential in P'), values(VP, [{ value: sQ + Math.abs(m) / s2 * sQ, tag: 'abs', why: L('Mind the signs of the charges.', 'Achte auf die Vorzeichen der Ladungen.') }, { value: sQ + m / (s2 * s2), tag: 'field', why: field, nudge: NUDGE.field() }, { value: sQ, tag: 'one', why: L('Both charges contribute.', 'Beide Ladungen tragen bei.') }], null, howP, { signed: true, fmt: inV0, extra: [2, 0.5] })),
      ],
      hints: [L(`V = k·Q/r, with the sign of Q: it falls with 1/r. The potential difference between two points: ${vab('B', 'A')}.`, `Φ = k·Q/r, mit dem Vorzeichen von Q: Es nimmt mit 1/r ab. Die Spannung zwischen zwei Punkten: ${vab('B', 'A')}.`), L('Potentials of several charges add as numbers (no directions).', 'Die Potentiale mehrerer Ladungen addieren sich als Zahlen (ohne Richtungen).')],
      solution: [howK, howD, howP], p: { sQ, k, m, s2 },
    };
  }

  const SC = [
    { id: 'four', c: [[1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, -1]], name: () => L('four equal positive charges at the corners of a square', 'vier gleiche positive Ladungen an den Ecken eines Quadrats') },
    { id: 'alt', c: [[1, 1, 1], [-1, -1, 1], [1, -1, -1], [-1, 1, -1]], name: () => L('charges +q, −q, +q, −q in turn at the corners of a square', 'Ladungen +q, −q, +q, −q abwechselnd an den Ecken eines Quadrats') },
    // flipped (turned a quarter turn): the positive charges on the right
    { id: 'halves', c: [[1, -1, 1], [1, 1, 1], [-1, 1, -1], [-1, -1, -1]], name: (flip) => (flip ? L('two positive charges on the right and two negative ones on the left, at the corners of a square', 'zwei positive Ladungen rechts und zwei negative links, an den Ecken eines Quadrats') : L('two positive charges above and two negative ones below, at the corners of a square', 'zwei positive Ladungen oben und zwei negative unten, an den Ecken eines Quadrats')) },
    { id: 'pair', c: [[1, -1.5, 0], [1, 1.5, 0]], name: () => L('two equal positive charges', 'zwei gleiche positive Ladungen') },
    { id: 'dip', c: [[1, -1.5, 0], [-1, 1.5, 0]], name: () => L('a positive and a negative charge of the same size', 'eine positive und eine negative Ladung gleichen Betrags') },
    { id: 'negpair', c: [[-1, -1.5, 0], [-1, 1.5, 0]], name: () => L('two equal negative charges', 'zwei gleiche negative Ladungen') },
    { id: 'tri', c: [[1, 0, 1.4], [1, -0.7 * Math.sqrt(3), -0.7], [1, 0.7 * Math.sqrt(3), -0.7]], name: () => L('three equal positive charges at the corners of an equilateral triangle', 'drei gleiche positive Ladungen an den Ecken eines gleichseitigen Dreiecks') },
    { id: 'fourneg', c: [[-1, 1, 1], [-1, -1, 1], [-1, -1, -1], [-1, 1, -1]], name: () => L('four equal negative charges at the corners of a square', 'vier gleiche negative Ladungen an den Ecken eines Quadrats') },
    { id: 'trineg', c: [[-1, 0, 1.4], [-1, -0.7 * Math.sqrt(3), -0.7], [-1, 0.7 * Math.sqrt(3), -0.7]], name: () => L('three equal negative charges at the corners of an equilateral triangle', 'drei gleiche negative Ladungen an den Ecken eines gleichseitigen Dreiecks') },
    { id: 'dipv', c: [[-1, 0, 1.5], [1, 0, -1.5]], name: () => L('a negative charge above and a positive charge of the same size below', 'eine negative Ladung oben und eine positive Ladung gleichen Betrags unten') },
    // charges of different sizes: M is still half-way between them
    { id: 'big', c: [[2, -1.5, 0], [1, 1.5, 0]], name: () => L('a charge +2q on the left and a charge +q on the right', 'eine Ladung +2q links und eine Ladung +q rechts') },
    { id: 'mix', c: [[2, -1.5, 0], [-1, 1.5, 0]], name: () => L('a charge +2q on the left and a charge −q on the right', 'eine Ladung +2q links und eine Ladung −q rechts'),
      more: () => L('the positive charge is twice as large, at the same distance', 'Die positive Ladung ist doppelt so gross, im selben Abstand') },
    { id: 'mixneg', c: [[1, -1.5, 0], [-2, 1.5, 0]], name: () => L('a charge +q on the left and a charge −2q on the right', 'eine Ladung +q links und eine Ladung −2q rechts'),
      more: () => L('the negative charge is twice as large, at the same distance', 'Die negative Ladung ist doppelt so gross, im selben Abstand') },
    { id: 'row', c: [[1, -2.4, 0], [-1, -1.2, 0], [-1, 1.2, 0], [1, 2.4, 0]], name: () => L('four charges in a row: two negative ones at the same distance on either side of M, and two positive ones of the same size twice as far out', 'vier Ladungen in einer Reihe: zwei negative im selben Abstand links und rechts von M und zwei gleich grosse positive doppelt so weit draussen'),
      more: () => L('the negative charges are only half as far away', 'Die negativen Ladungen sind nur halb so weit weg') },
  ];
  function scalar(seed) {
    const r = rng(seed * 67 + 37), S = r.pick(SC), flip = S.id === 'halves' && r.next() < 0.5;
    const ch = S.c.map(([q, x, y]) => ({ q, x: flip ? y : x, y: flip ? -x : y })), c = { kind: 'points', charges: ch };
    const Ev = C.field(c, 0, 0), d = Math.hypot(...Ev) < 1e-6 ? null : dirOf(Ev), V = C.potential(c, 0, 0), vs = Math.abs(V) < 1e-9 ? 0 : Math.sign(V);
    const opts = [{ d, ok: true }];
    for (const x of [null, [1, 0], [0, -1], [0, 1], [-1, 0]]) if (opts.length < 4 && !opts.some((o) => dkey(o.d) === dkey(x))) opts.push({ d: x });
    const same = ch.every((x) => x.q > 0) || ch.every((x) => x.q < 0);
    const howE = d && same ? L(`The fields add as vectors and do not cancel here: the larger charge, at the same distance, gives the stronger field; the net field points ${dirName(d)}, away from it.`, `Die Felder addieren sich als Vektoren und heben sich hier nicht auf: Die grössere Ladung gibt im selben Abstand das stärkere Feld; das Gesamtfeld zeigt ${dirName(d)}, von ihr weg.`)
      : d ? L(`The fields add as vectors and do not cancel here: the net field points ${dirName(d)}, from the positive towards the negative charges.`, `Die Felder addieren sich als Vektoren und heben sich hier nicht auf: Das Gesamtfeld zeigt ${dirName(d)}, von den positiven zu den negativen Ladungen.`)
      : L('The fields add as vectors: by symmetry they cancel at the centre.', 'Die Felder addieren sich als Vektoren: Aus Symmetriegründen heben sie sich im Mittelpunkt auf.');
    const howV = vs && !same ? L(`The potentials add as numbers: the contributions have opposite signs, but they do not cancel: ${S.more()}. So V ${vs > 0 ? '> 0' : '< 0'}, and the field is ${d ? 'not zero either' : 'zero'}.`, `Die Potentiale addieren sich als Zahlen: Die Beiträge haben entgegengesetzte Vorzeichen, heben sich aber nicht auf: ${S.more()}. Also ist Φ ${vs > 0 ? '> 0' : '< 0'}, und das Feld ist ${d ? 'auch nicht null' : 'null'}.`)
      : vs ? L(`The potentials add as numbers: all the contributions have the same sign, so V ${vs > 0 ? '> 0' : '< 0'} although ${d ? 'the field points somewhere' : 'the field is zero'}.`, `Die Potentiale addieren sich als Zahlen: Alle Beiträge haben dasselbe Vorzeichen, also ist Φ ${vs > 0 ? '> 0' : '< 0'}, obwohl ${d ? 'das Feld irgendwohin zeigt' : 'das Feld null ist'}.`)
      : L(`The potentials add as numbers: equal positive and negative contributions at equal distances cancel, V = 0, although ${d ? 'the field is not zero' : 'the field is zero too'}.`, `Die Potentiale addieren sich als Zahlen: Gleiche positive und negative Beiträge in gleichen Abständen heben sich auf, Φ = 0, obwohl ${d ? 'das Feld nicht null ist' : 'auch das Feld null ist'}.`);
    const lab = (q) => `${q > 0 ? '+' : '−'}${Math.abs(q) > 1 ? Math.abs(q) : ''}`;
    return {
      kind: 'pc', title: L('Field and potential at the centre', 'Feld und Potential im Mittelpunkt'),
      text: L(`<p>The figure shows ${S.name(flip)}. M is the centre (the potential is zero far away).</p>`, `<p>Die Abbildung zeigt ${S.name(flip)}. M ist der Mittelpunkt (weit weg ist das Potential null).</p>`),
      figs: fig(C.fig(c, { box: [-3, 3, -2.1, 2.1], labels: ch.map((s) => lab(s.q)), points: [{ x: 0, y: 0, name: 'M' }] })),
      questions: [
        tiles('E', L('(a) The field at M points', '(a) Das Feld in M zeigt'), r.shuffle(opts).map((o) => ({ html: tile(o.d, L('nowhere: it is zero', 'nirgends hin: Es ist null')), ok: !!o.ok, why: o.ok ? '' : howE }))),
        choice('V', L('(b) The potential at M is', '(b) Das Potential in M ist'), words(r, [[L('positive', 'positiv'), vs > 0, howV], [L('zero', 'null'), vs === 0, howV], [L('negative', 'negativ'), vs < 0, howV]])),
      ],
      hints: [L('Fields are vectors: they add with their directions and can cancel.', 'Felder sind Vektoren: Sie addieren sich mit ihren Richtungen und können sich aufheben.'), L('Potentials are numbers with a sign: V = k·q/r for each charge, then add.', 'Potentiale sind Zahlen mit Vorzeichen: Φ = k·q/r für jede Ladung, dann addieren.')],
      solution: [howE, howV], p: { S: S.id, flip },
    };
  }

  // ---------------------------------------------------------------- statements
  const BANK = [
    [() => L('The potential is a number with a sign, not a vector.', 'Das Potential ist eine Zahl mit Vorzeichen, kein Vektor.'), true, () => L('Potentials of several charges simply add.', 'Die Potentiale mehrerer Ladungen addieren sich einfach.')],
    [() => L('Where the field is zero, the potential is zero too.', 'Wo das Feld null ist, ist auch das Potential null.'), false, () => L('Between two equal positive charges, E = 0 at the middle, but V > 0.', 'Zwischen zwei gleichen positiven Ladungen ist in der Mitte E = 0, aber Φ > 0.')],
    [() => L('The potential falls in the direction of the field.', 'Das Potential fällt in Feldrichtung.'), true, () => L('E points from high to low potential.', 'E zeigt von hohem zu tiefem Potential.')],
    [() => L('Moving a charge along an equipotential line needs no work.', 'Eine Ladung längs einer Äquipotentiallinie zu bewegen, braucht keine Arbeit.'), true, () => L('The potential, and so the potential energy, stays the same.', 'Das Potential, und damit die potentielle Energie, bleibt gleich.')],
    [() => L('In a uniform field, the potential changes evenly along the field lines.', 'In einem homogenen Feld ändert sich das Potential längs der Feldlinien gleichmässig.'), true, () => L('ΔV = −E·Δx.', 'ΔΦ = −E·Δx.')],
    [() => L('A positive charge released at rest moves towards higher potential.', 'Eine in Ruhe losgelassene positive Ladung bewegt sich zu höherem Potential.'), false, () => L('Towards lower potential; a negative charge towards higher.', 'Zu tieferem Potential; eine negative Ladung zu höherem.')],
    [() => L('The work done by the field on a charge does not depend on its path.', 'Die Arbeit, die das Feld an einer Ladung verrichtet, hängt nicht von ihrem Weg ab.'), true, () => L('It depends only on q and the potentials at the start and the end.', 'Sie hängt nur von q und den Potentialen am Anfang und am Ende ab.')],
    [() => L('The zero of the potential can be chosen freely.', 'Der Nullpunkt des Potentials kann frei gewählt werden.'), true, () => L('Only differences of potential matter.', 'Nur Potentialdifferenzen zählen.')],
    [() => L('The potential of a negative point charge is negative everywhere (zero far away).', 'Das Potential einer negativen Punktladung ist überall negativ (weit weg null).'), true, () => L('V = k·Q/r with Q < 0.', 'Φ = k·Q/r mit Q < 0.')],
    [() => L('At the centre of a square of four equal positive charges, field and potential are both zero.', 'Im Mittelpunkt eines Quadrats aus vier gleichen positiven Ladungen sind Feld und Potential beide null.'), false, () => L('The field is zero, the potential is not: 4·k·q/r.', 'Das Feld ist null, das Potential nicht: 4·k·q/r.')],
    [() => L('Halfway between a positive and a negative charge of the same size, the potential is zero.', 'In der Mitte zwischen einer positiven und einer negativen Ladung gleichen Betrags ist das Potential null.'), true, () => L('Equal and opposite contributions; the field there is not zero.', 'Gleiche, entgegengesetzte Beiträge; das Feld dort ist nicht null.')],
    [() => L('The unit V/m for the field is the same as N/C.', 'Die Einheit V/m für das Feld ist dieselbe wie N/C.'), true, () => L('1 V/m = 1 J/(C·m) = 1 N/C.', '1 V/m = 1 J/(C·m) = 1 N/C.')],
    [() => L('Where the equipotential lines are closer together, the field is stronger.', 'Wo die Äquipotentiallinien dichter liegen, ist das Feld stärker.'), true, () => L('E = |ΔV|/Δx: the same ΔV over a shorter distance.', 'E = |U|/Δx: dieselbe Spannung U auf kürzerer Strecke.')],
    [() => L('Where the potential is constant along x, the field along x is zero.', 'Wo das Potential längs x konstant ist, ist das Feld längs x null.'), true, () => L('E = −dV/dx = 0.', 'E = −dΦ/dx = 0.')],
    [() => L('The potential energy of an electron is high where the potential is high.', 'Die potentielle Energie eines Elektrons ist dort hoch, wo das Potential hoch ist.'), false, () => L('q·V with q < 0: where V is high, its potential energy is low.', 'q·Φ mit q < 0: Wo Φ hoch ist, ist seine potentielle Energie tief.')],
    [() => L('Two charges of the same sign have more potential energy when closer together.', 'Zwei Ladungen gleichen Vorzeichens haben mehr potentielle Energie, wenn sie näher beieinander sind.'), true, () => L('E_pot = k·q₁·q₂/r > 0 grows as r shrinks: it takes work to push them together.', 'E_pot = k·q₁·q₂/r > 0 wächst, wenn r kleiner wird: Es braucht Arbeit, sie zusammenzuschieben.')],
    [() => L('The potential at a point depends on the charge placed there.', 'Das Potential in einem Punkt hängt von der Ladung ab, die man dorthin bringt.'), false, () => L('V = E_pot/q belongs to the point: twice the charge, twice the potential energy, the same potential.', 'Φ = E_pot/q gehört zum Punkt: doppelte Ladung, doppelte potentielle Energie, dasselbe Potential.')],
    [() => L('A proton and an electron at the same point have potential energies of opposite sign.', 'Ein Proton und ein Elektron im selben Punkt haben potentielle Energien mit entgegengesetztem Vorzeichen.'), true, () => L('E_pot = q·V, the same V, opposite q (unless V = 0).', 'E_pot = q·Φ, dasselbe Φ, entgegengesetztes q (ausser Φ = 0).')],
    [() => L('The voltage of a battery is a potential difference.', 'Die Spannung einer Batterie ist eine Potentialdifferenz.'), true, () => L('Between its two terminals.', 'Zwischen ihren beiden Polen.')],
    [() => L('In a uniform field, |ΔV| = E·d where d is the straight distance between the two points.', 'Im homogenen Feld ist |U| = E·d, wobei d der direkte Abstand der beiden Punkte ist.'), false, () => L('d is measured along the field lines.', 'd wird längs der Feldlinien gemessen.')],
    [() => L('The potential of a point charge falls with 1/r², like its field.', 'Das Potential einer Punktladung fällt mit 1/r², wie ihr Feld.'), false, () => L('V ∝ 1/r, E ∝ 1/r².', 'Φ ∝ 1/r, E ∝ 1/r².')],
    [() => L('A negative charge gains kinetic energy when it moves towards higher potential.', 'Eine negative Ladung gewinnt kinetische Energie, wenn sie sich zu höherem Potential bewegt.'), true, () => L('W = q·(V_A − V_B) > 0 for q < 0 and V_B > V_A.', 'W = q·(Φ_A − Φ_B) > 0 für q < 0 und Φ_B > Φ_A.')],
  ];
  function statements(seed) {
    const r = rng(seed * 101 + 67);
    for (;;) {
      const pick = r.shuffle(BANK.slice()).slice(0, 5);
      if (pick.every((s) => s[1]) || pick.every((s) => !s[1])) continue;
      return {
        kind: 'stmts', title: L('Which statements are correct?', 'Welche Aussagen sind richtig?'), text: L('<p>Tick all the statements that are correct.</p>', '<p>Kreuze alle richtigen Aussagen an.</p>'), figs: '',
        questions: [{ type: 'multi', key: 's', label: L('Which statements are correct?', 'Welche Aussagen sind richtig?'), statements: pick.map(([h, ok, why]) => ({ html: h(), ok, why: why() })) }],
        hints: [RULE(), DOWNHILL()], solution: pick.map(([h, ok, why]) => `${ok ? '✓' : '✗'} ${h()} ${why()}`), p: { s: pick.map((x) => BANK.indexOf(x)) },
      };
    }
  }

  const TYPES = {
    'which-qty': [1, whichQty], 'points-v': [2, pointsV], 'uniform-d': [2, uniformD], v2e: [2, (s) => v2e(s, false)], e2v: [3, (s) => v2e(s, true)],
    'point-v': [3, pointV], scalar: [3, scalar], 'which-way': [1, whichWay], 'gain-lose': [2, gainLose], stmts: [2, statements],
  };
  function make(type, seed) {
    const [difficulty, f] = TYPES[type];
    return { ...f(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }
  // ---------------------------------------------------------------- the check
  // The learning objectives (check.js), each with the questions it is asked about ('type:key', a
  // question of a practice exercise), its worked example and its practice topic.
  const OBJECTIVES = [
    { id: 'quantities', kinds: ['which-qty:V', 'which-qty:Ep', 'which-qty:U', 'points-v:Ep'], tutor: 0, topic: 0,
      name: () => L('Tell potential energy, potential and potential difference apart, and say which of them depends on the charge.', 'Potentielle Energie, Potential und Spannung unterscheiden und sagen, welche davon von der Ladung abhängt.') },
    { id: 'uniform', kinds: ['uniform-d:U', 'v2e:g', 'e2v:g'], tutor: 1, topic: 1,
      name: () => L('Use E = ΔV/d in a uniform field, with d measured along the field lines.', 'E = U/d im homogenen Feld anwenden, mit d längs der Feldlinien gemessen.') },
    { id: 'point', kinds: ['point-v:V', 'point-v:U', 'point-v:P'], tutor: 2, topic: 2,
      name: () => L('Predict how the potential of a point charge depends on its sign and on the distance.', 'Vorhersagen, wie das Potential einer Punktladung von ihrem Vorzeichen und vom Abstand abhängt.') },
    { id: 'energy', kinds: ['gain-lose:Ep', 'which-way:m', 'points-v:K'], tutor: 3, topic: 3,
      name: () => L('Decide whether a charge gains or loses potential energy moving between two points, from the signs of q and of ΔV.', 'Entscheiden, ob eine Ladung zwischen zwei Punkten potentielle Energie gewinnt oder verliert, aus den Vorzeichen von q und von ΔΦ.') },
  ];
  // the tags of wrong options that are typical wrong ideas (check.js: concept)
  const CONCEPT = { sign: 'sign', straight: 'along', across: 'along', copy: 'slope', steep: 'slope', field: 'vr', abs: 'scalar', one: 'scalar', z: 'charge',
    testq: 'perq', noq: 'perq', div: 'perq', diff: 'diff', point: 'diff' };
  // one question of a practice exercise, with four options (a seed further on if this one has fewer,
  // or for which-way, if the particle is neutral)
  function checkQuestion(kind, seed) {
    const [type, key] = kind.split(':');
    let e, q;
    for (let s = seed; ; s += 1000) {
      e = make(type, s); q = e.questions.find((x) => x.key === key);
      if (q.options.length === 4 && (type !== 'which-way' || e.p.q)) break;
    }
    return {
      title: e.title, text: e.text, figure: `<div class="figs">${e.figs || ''}</div>`, ask: cap(q.label.replace(/^\([a-d]\) /, '')),
      options: q.options.map((o) => ({ html: o.html || o.label, correct: o.ok, flag: o.ok ? undefined : o.tag || 'other', why: o.why })),
      explain: () => `${e.solFig || ''}<div class="steps">${e.solution.map((s) => (s.includes('<ul>') ? s : `<p>${s}</p>`)).join('')}</div>`,
      key: `${e.id}|${key}`,
    };
  }
  const api = { TYPES: Object.keys(TYPES), make, OBJECTIVES, CONCEPT, question: checkQuestion, RULE, DOWNHILL, vGraph, eGraph, SC, sgn, frac, subs };
  root.PotEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
