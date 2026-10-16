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

  // ---------------------------------------------------------------- sketching the potential
  // The student sketches the potential (app.js mounts the shared sketcher, sketch.js, on the
  // drawing made here); no questions, but ex.sketch, the sketch's spec:
  //   sk-plates  thick metal plates at given potentials (two, or three), or the middle one of three
  //              uncharged and isolated: level in the metal, straight in the gaps. The pieces
  //              model, a breakpoint at each face of the metal.
  //   sk-e2v     V(x) from a graph E(x) and V(0): the pieces model, a breakpoint at each break of
  //              E, the first one given.
  //   sk-point   a point charge, the size of its potential at one distance given: V at r … 6r, the
  //              columns model (a value at each distance, the line through them).
  // A spec: { kind, model, ts (pieces: the breakpoints) or xs (columns), fixed (pieces: the
  // breakpoints given), x0, x1 (the horizontal axis: mm, or r), lo, hi, step (the values, in V),
  // init (the state to start from: nothing drawn), target (the right values at the handles), and
  // per kind: plates { how, metal: [{ k (its piece), name, V, iso }] }; e2v { sl (the slopes, in
  // V/mm: E = −sl), v0 }; point { s (the sign of Q), Vr (the size of V at r), ref (where it is given) } }.
  //   sketchScale(spec)          x(u), y(v), inv(py), area (where a press sets a column), W, H
  //   sketchFig(spec, label)     the empty <svg> the sketcher fills
  //   sketchBody(spec, st, view) the drawing under the handles (st: the sketcher's state): grid,
  //                              axes, the metal or the charge, the sketched line; view: marks (the
  //                              pieces or columns drawn as wrong), right (the right graph laid
  //                              over, dashed), active (the handle selected: its value beside it),
  //                              solid (only the right graph, as a line: for a worked example)
  //   sketchHandle(spec, h)      a handle's { label, text } for screen readers
  //   judgeSketch(spec, st)      null (nothing drawn yet), or the problems from left to right,
  //                              [{ code, at (pieces or columns), nudge, why }] (none: right); the
  //                              judging is lenient, see each kind
  const LR = (en, de) => E.L(en, de); // a label of a drawing (C.txt sets its indices)
  const vals = (spec, st) => (spec.model === 'pieces' ? st.nodes : st);
  const mm = (x) => `${nice(x)} mm`;
  const went = (x) => (x === 0 ? L('stays level', 'bleibt gleich') : x > 0 ? L(`rises by ${num(x)} V`, `steigt um ${num(x)} V`) : L(`falls by ${num(-x)} V`, `fällt um ${num(-x)} V`));
  const SAME = () => L('The right graph is laid over your sketch, dashed.', 'Der richtige Graph liegt gestrichelt über deiner Skizze.');
  // the state of the right sketch
  const rightState = (spec) => (spec.model === 'pieces' ? { nodes: [...spec.target], bends: spec.target.slice(1).map(() => 0) } : [...spec.target]);

  // metal plates: [0, a] plate A, [b, 8] the last one, between them a gap or a plate of thickness t
  // (B, given or isolated) with gaps on either side
  function platesSpec(r, how) {
    for (;;) {
      const a = r.pick([1, 2]), b = 8 - r.pick([1, 2]), t = r.pick([1, 2]);
      let ts, metal;
      if (how === 'two') {
        const VA = r.int(0, 8), VB = r.int(0, 8);
        if (Math.abs(VA - VB) < 3) continue;
        ts = [0, a, b, 8];
        metal = [{ k: 0, name: 'A', V: VA }, { k: 2, name: 'B', V: VB }];
      } else {
        const g = b - a - t, g1 = r.int(1, g - 1), VA = r.int(0, 8);
        let VB, VC;
        if (how === 'iso') {
          // the field the same in both gaps: V_C − V_A a multiple of the gaps together, at least 1 V/mm
          const U = r.pick([-2, -1, 1, 2]) * g;
          if (Math.abs(U) > 8) continue;
          VC = VA + U; VB = VA + (U * g1) / g;
        } else {
          VB = r.int(0, 8); VC = r.int(0, 8);
          // B not between A and C on a line (then it would look like the isolated plate), and the
          // potential not level in both gaps
          if ((VB - VA) * (VC - VB) > 0 && Math.abs((VB - VA) / g1 - (VC - VB) / (g - g1)) < 0.5) continue;
          if (VB === VA && VB === VC) continue;
          if (Math.abs(VB - VA) + Math.abs(VC - VB) < 4) continue;
        }
        if (VC < 0 || VC > 8) continue;
        ts = [0, a, a + g1, a + g1 + t, b, 8];
        metal = [{ k: 0, name: 'A', V: VA }, { k: 2, name: 'B', V: VB, ...(how === 'iso' ? { iso: true } : {}) }, { k: 4, name: 'C', V: VC }];
      }
      const target = ts.map((x, i) => metal.find((m) => i === m.k || i === m.k + 1).V);
      return { kind: 'plates', how, model: 'pieces', ts, metal, x0: 0, x1: 8, lo: -1, hi: 9, step: 1, init: { nodes: ts.map(() => 0), bends: ts.slice(1).map(() => 0) }, target };
    }
  }
  // V(x) from E(x) (as in v2e): the breakpoints at the breaks, the first one given
  function e2vSpec(br, sl, v0) {
    const target = [v0];
    sl.forEach((s, i) => target.push(target[i] + s * (br[i + 1] - br[i])));
    return { kind: 'e2v', model: 'pieces', ts: br, fixed: [0], sl, v0, x0: 0, x1: 8, lo: -2, hi: 10, step: 1, init: { nodes: br.map(() => v0), bends: br.slice(1).map(() => 0) }, target };
  }
  // a point charge of sign s; V is Vr in size at r, given at ref·r (Vr/ref)
  const POINT_XS = [1, 1.5, 2, 3, 4, 6];
  function pointSpec(s, Vr, ref) {
    const step = Vr / 12, hi = s > 0 ? Vr + 2 * step : Vr / 3, lo = s > 0 ? -Vr / 3 : -Vr - 2 * step;
    return { kind: 'point', model: 'columns', xs: POINT_XS, s, Vr, ref, x0: 0, x1: 6.4, lo, hi, step, init: POINT_XS.map(() => 0), target: POINT_XS.map((x) => (s * Vr) / x) };
  }

  // the drawing: the axes of lineGraph (x in mm, 36 units left, 34 right), taller
  function sketchScale(spec) {
    const W = 320, L0 = 36, R = 34, T = 28, P = 220, B = 26, sy = P / (spec.hi - spec.lo);
    const x = (u) => Math.round((L0 + ((u - spec.x0) / (spec.x1 - spec.x0)) * (W - L0 - R)) * 10) / 10;
    const y = (v) => Math.round((T + (spec.hi - v) * sy) * 10) / 10;
    return { x, y, inv: (py) => spec.hi - (py - T) / sy, area: { x0: x(0.6), x1: x(spec.x1) + 10, y0: T - 14, y1: T + P + 14 }, W, H: T + P + B };
  }
  function sketchFig(spec, label) {
    const g = sketchScale(spec);
    return `<div class="fig"><svg class="ef sketch-plot" viewBox="0 0 ${g.W} ${g.H}" role="group" aria-label="${label}"></svg></div>`;
  }
  const xName = (spec, u) => (spec.kind === 'point' ? `${u === 1 ? '' : nice(u)}r` : LR(`x = ${nice(u)} mm`, `x = ${nice(u)} mm`));
  const sketchHandle = (spec, h) => ({ label: LR(`V at ${xName(spec, h.t)}`, `Φ bei ${xName(spec, h.t)}`), text: `${num(Math.round(h.v * 100) / 100)} V` });
  // the span of a piece or a column (between the middles to its neighbours)
  function spanOf(spec, k) {
    if (spec.model === 'pieces') return [spec.ts[k], spec.ts[k + 1]];
    const xs = spec.xs;
    return [k ? (xs[k - 1] + xs[k]) / 2 : xs[0] - 0.25, k < xs.length - 1 ? (xs[k] + xs[k + 1]) / 2 : xs[k] + 0.4];
  }
  function sketchBody(spec, st, view = {}) {
    const g = sketchScale(spec), out = [], f = (x) => x.toFixed(1), v = vals(spec, st);
    const X = g.x, Y = g.y, top = Y(spec.hi), bot = Y(spec.lo), point = spec.kind === 'point';
    const line = (pts, cls) => `<polyline class="${cls}" points="${pts.map(([u, w]) => `${f(X(u))},${f(Y(w))}`).join(' ')}"/>`;
    out.push(`<rect class="bg" x="0" y="0" width="${g.W}" height="${g.H}"/>`);
    // the metal: grey bands, each plate's name above
    for (const m of spec.metal || []) {
      const [a, b] = [spec.ts[m.k], spec.ts[m.k + 1]];
      out.push(`<rect class="metalband" x="${X(a)}" y="${top}" width="${f(X(b) - X(a))}" height="${f(bot - top)}"/>`);
      out.push(C.txt((X(a) + X(b)) / 2, top + 15, m.name, 'lbl name'));
    }
    for (const k of view.marks || []) {
      const [a, b] = spanOf(spec, k);
      out.push(`<rect class="wrongband" x="${X(a)}" y="${top}" width="${f(X(b) - X(a))}" height="${f(bot - top)}"/>`);
    }
    // the grid: whole mm (or r), and the values: every step, labelled at most 7 times
    for (let u = Math.floor(spec.x0) + 1; u <= spec.x1; u++) out.push(`<line class="grid" x1="${X(u)}" y1="${top}" x2="${X(u)}" y2="${bot}"/>`);
    const every = [1, 2, 4, 5, 10].map((k) => k * spec.step).find((k) => (spec.hi - spec.lo) / k <= 7);
    for (let w = Math.ceil(spec.lo / spec.step) * spec.step; w <= spec.hi + 1e-9; w += spec.step) {
      if (Math.abs(w) > 1e-9) out.push(`<line class="grid" x1="${X(spec.x0)}" y1="${Y(w)}" x2="${X(spec.x1)}" y2="${Y(w)}"/>`);
      // (not 0 beside the point charge, which sits there)
      if (Math.abs(w / every - Math.round(w / every)) < 1e-9 && !(point && Math.abs(w) < 1e-9)) out.push(C.txt(X(spec.x0) - 5, Y(w) + 4, num(Math.round(w * 100) / 100), 'tick', 'end'));
    }
    out.push(`<line class="axisline" x1="${X(spec.x0)}" y1="${bot}" x2="${X(spec.x0)}" y2="${top - 6}"/><line class="axisline" x1="${X(spec.x0)}" y1="${Y(0)}" x2="${X(spec.x1) + 6}" y2="${Y(0)}"/>`);
    if (point) {
      for (let u = 1; u <= 6; u++) out.push(C.txt(X(u), bot + 17, `${u === 1 ? '' : u}r`, 'tick'));
    } else {
      for (let u = 0; u <= 6; u += 2) out.push(C.txt(X(u), bot + 17, String(u), 'tick'));
      out.push(C.txt(g.W - 2, bot + 17, '<tspan class="it">x</tspan> in mm', 'tick', 'end'));
    }
    out.push(C.txt(X(spec.x0) + 6, 13, LR('<tspan class="it">V</tspan> in V', '<tspan class="it">Φ</tspan> in V'), 'lbl small skname', 'start'));
    // the sketched line, the parts marked wrong, the right graph
    const ux = spec.model === 'pieces' ? spec.ts : spec.xs, mine = ux.map((u, i) => [u, v[i]]);
    if (!view.solid) out.push(line(mine, 'skline'));
    for (const k of view.marks || []) {
      out.push(spec.model === 'pieces' ? line(mine.slice(k, k + 2), 'skline bad') : `<circle class="skbad" cx="${X(mine[k][0])}" cy="${Y(mine[k][1])}" r="11"/>`);
    }
    if (view.right || view.solid) {
      // a point charge: the curve 1/r, from the top of the axis on
      const u0 = point ? spec.Vr / (spec.s > 0 ? spec.hi : -spec.lo) : 0;
      const right = point ? Array.from({ length: 81 }, (_, i) => u0 + ((6.2 - u0) * i) / 80).map((u) => [u, (spec.s * spec.Vr) / u]) : ux.map((u, i) => [u, spec.target[i]]);
      out.push(line(right, view.solid ? 'skline' : 'skline right'));
    }
    // the charge at r = 0, on the axis; the breakpoints given
    if (point) out.push(C.charge(X(0), Y(0), spec.s));
    for (const i of spec.fixed || []) out.push(`<circle class="pt" cx="${X(spec.ts[i])}" cy="${Y(spec.target[i])}" r="4.5"/>`);
    const h = view.active;
    if (h) {
      const left = h.t > (spec.x0 + spec.x1) / 2;
      out.push(C.txt(h.x + (left ? -11 : 11), h.y - 10, `${xName(spec, h.t)}: ${num(Math.round(h.v * 100) / 100)} V`, 'lbl small readout', left ? 'end' : 'start'));
    }
    return out.join('');
  }

  const signed = (x) => `${num(x)} V`;
  // Plates, judged leniently, from left to right: in the metal the line must be level; a plate
  // whose potential is given must lie within 1 V of it; the isolated plate (iso) within 1 V of where
  // the field is the same in both gaps. The gaps are straight anyway (one piece each).
  function judgePlates(spec, v) {
    const out = [];
    for (const m of spec.metal) {
      const k = m.k, a = spec.ts[k], b = spec.ts[k + 1], d = v[k + 1] - v[k], at = v[k];
      if (d !== 0) {
        out.push({ code: 'metal', at: [k], nudge: L(`Inside plate ${m.name} (${a}–${b} mm) there is no field: the potential is the same all through the metal.`, `In der Platte ${m.name} (${a}–${b} mm) gibt es kein Feld: Das Potential ist im ganzen Metall gleich.`),
          why: L(`Plate ${m.name} is a conductor: there is no field in it, so the potential stays at ${signed(m.V)} all through it; your sketch ${went(d)} there.`, `Die Platte ${m.name} ist ein Leiter: In ihr gibt es kein Feld, also bleibt das Potential überall bei ${signed(m.V)}; deine Skizze ${went(d)} dort.`) });
      } else if (Math.abs(at - m.V) > 1 && !m.iso) {
        out.push({ code: 'value', at: [k], nudge: L(`Plate ${m.name} is at ${signed(m.V)}: its piece lies at that height.`, `Die Platte ${m.name} liegt auf ${signed(m.V)}: Ihr Stück liegt auf dieser Höhe.`),
          why: L(`Plate ${m.name} is at ${signed(m.V)}; your sketch has it at ${signed(at)}.`, `Die Platte ${m.name} liegt auf ${signed(m.V)}; deine Skizze hat sie auf ${signed(at)}.`) });
      } else if (Math.abs(at - m.V) > 1) {
        const g1 = spec.ts[k] - spec.ts[k - 1], g2 = spec.ts[k + 2] - spec.ts[k + 1];
        out.push({ code: 'iso', at: [k - 1, k, k + 1], nudge: L(`Plate ${m.name} is uncharged: the field is the same on both sides of it, so the potential changes just as steeply in both gaps.`, `Die Platte ${m.name} ist ungeladen: Das Feld ist auf beiden Seiten gleich, also ändert sich das Potential in beiden Lücken gleich steil.`),
          why: L(`Plate ${m.name} is uncharged: the field is the same in both gaps (${mm(g1)} and ${mm(g2)}), so plate ${m.name} is at ${signed(m.V)}; your sketch has it at ${signed(at)}.`, `Die Platte ${m.name} ist ungeladen: Das Feld ist in beiden Lücken (${mm(g1)} und ${mm(g2)}) gleich, also liegt die Platte ${m.name} auf ${signed(m.V)}; deine Skizze hat sie auf ${signed(at)}.`) });
      }
    }
    return out;
  }
  // E → V, judged leniently, piece by piece: where E = 0 the line must be level; elsewhere it must
  // fall where E > 0 and rise where E < 0, by about −E·Δx (within 1 V or a quarter); then, of the
  // pieces right so far, where |E| is larger the line must not be less steep; and last, with all
  // that right, no breakpoint more than 2 V off (the small errors adding up).
  function judgeE2V(spec, v) {
    const out = [], ts = spec.ts, ok = [];
    spec.sl.forEach((s, k) => {
      const a = ts[k], b = ts[k + 1], len = b - a, D = s * len, d = v[k + 1] - v[k], Ef = -s, part = `${a}–${b} mm`;
      const add = (code, nudge, why) => out.push({ code, at: [k], nudge, why });
      const rule = L(`${part}: E = ${sgn(Ef)} kV/m, so V changes by −E·Δx = ${sgn(D)} V`, `${part}: E = ${sgn(Ef)} kV/m, also ändert sich Φ um −E·Δx = ${sgn(D)} V`);
      const yours = L(`your sketch ${went(d)} there`, `deine Skizze ${went(d)} dort`);
      if (Ef === 0) {
        if (d !== 0) add('level', L(`From ${a} to ${b} mm, E = 0: there the potential does not change.`, `Von ${a} bis ${b} mm ist E = 0: Dort ändert sich das Potential nicht.`), `${rule}; ${yours}.`);
      } else if (Math.sign(d) !== Math.sign(D)) {
        add('dir', Ef > 0 ? L(`From ${a} to ${b} mm, E is positive (it points along +x): the potential falls in the direction of the field.`, `Von ${a} bis ${b} mm ist E positiv (es zeigt in +x-Richtung): Das Potential fällt in Feldrichtung.`)
          : L(`From ${a} to ${b} mm, E is negative (it points along −x): going along +x, against the field, the potential rises.`, `Von ${a} bis ${b} mm ist E negativ (es zeigt in −x-Richtung): In +x-Richtung, gegen das Feld, steigt das Potential.`), `${rule}; ${yours}.`);
      } else if (Math.abs(d - D) > Math.max(1, 0.25 * Math.abs(D))) {
        const big = Math.abs(d) > Math.abs(D);
        add('size', L(`From ${a} to ${b} mm your sketch changes by too ${big ? 'much' : 'little'}: V changes by −E·Δx (1 kV/m = 1 V/mm).`, `Von ${a} bis ${b} mm ändert sich deine Skizze um zu ${big ? 'viel' : 'wenig'}: Φ ändert sich um −E·Δx (1 kV/m = 1 V/mm).`), `${rule}; ${yours}.`);
      } else ok.push(k);
    });
    const steep = (k) => Math.abs(v[k + 1] - v[k]) / (ts[k + 1] - ts[k]);
    ok.forEach((i) => ok.forEach((j) => {
      const A = Math.abs(spec.sl[i]), B = Math.abs(spec.sl[j]);
      if (j <= i || A === B || !A || !B || (A > B ? steep(i) >= steep(j) : steep(j) >= steep(i))) return;
      const [p, q] = A > B ? [i, j] : [j, i], P = `${ts[p]}–${ts[p + 1]} mm`, Q = `${ts[q]}–${ts[q + 1]} mm`;
      out.push({ code: 'order', at: [i, j], nudge: L(`The field is stronger at ${P} than at ${Q}: there the potential must change more steeply.`, `Das Feld ist bei ${P} stärker als bei ${Q}: Dort muss sich das Potential steiler ändern.`),
        why: L(`|E| is ${Math.max(A, B)} kV/m at ${P} but only ${Math.min(A, B)} kV/m at ${Q}, so the potential is steeper at ${P}; your sketch is steeper at ${Q}.`, `|E| ist ${Math.max(A, B)} kV/m bei ${P}, aber nur ${Math.min(A, B)} kV/m bei ${Q}, also ist das Potential bei ${P} steiler; deine Skizze ist bei ${Q} steiler.`) });
    }));
    if (!out.length) {
      const k = v.findIndex((w, i) => Math.abs(w - spec.target[i]) > 2);
      if (k > 0) out.push({ code: 'drift', at: [k - 1], nudge: L(`Each part is about right, but at x = ${mm(ts[k])} your sketch is ${num(Math.abs(v[k] - spec.target[k]))} V off: the small errors add up. Check each step, ΔV = −E·Δx.`, `Jeder Teil stimmt ungefähr, aber bei x = ${mm(ts[k])} liegt deine Skizze ${num(Math.abs(v[k] - spec.target[k]))} V daneben: Die kleinen Fehler summieren sich. Prüfe jeden Schritt, ΔΦ = −E·Δx.`),
        why: L(`At x = ${mm(ts[k])} the potential is ${signed(spec.target[k])}; your sketch has ${signed(v[k])}.`, `Bei x = ${mm(ts[k])} ist das Potential ${signed(spec.target[k])}; deine Skizze hat ${signed(v[k])}.`) });
    }
    return out;
  }
  // A point charge, judged leniently: the sign everywhere that of Q, nowhere zero, falling in size
  // with the distance; the given value within a grid step; and the shape 1/r: each value within a
  // grid step or a quarter (so 1/r², a quarter at 2r, or a straight line down to zero are found).
  function judgePoint(spec, v) {
    const out = [], s = spec.s, xs = spec.xs, Q = s > 0 ? L('positive', 'positiv') : L('negative', 'negativ');
    const at = (x) => xName(spec, x), cols = (ks) => ks.map((k) => at(xs[k])).join(', ');
    const wrong = xs.map((x, k) => k).filter((k) => v[k] * s < 0), zero = xs.map((x, k) => k).filter((k) => v[k] === 0);
    if (wrong.length) out.push({ code: 'sign', at: wrong, nudge: L(`Q is ${Q}: what sign does V = k·Q/r have?`, `Q ist ${Q}: Welches Vorzeichen hat Φ = k·Q/r?`),
      why: L(`Q is ${Q}, so V = k·Q/r is ${Q} at every distance; your sketch has the other sign at ${cols(wrong)}.`, `Q ist ${Q}, also ist Φ = k·Q/r in jedem Abstand ${Q}; deine Skizze hat bei ${cols(wrong)} das andere Vorzeichen.`) });
    if (zero.length) out.push({ code: 'zero', at: zero, nudge: L('Does the potential of a point charge reach zero at any distance?', 'Erreicht das Potential einer Punktladung in irgendeinem Abstand null?'),
      why: L(`V = k·Q/r reaches zero only far away; at 6r it is still ${signed(spec.target[xs.length - 1])}; your sketch is zero at ${cols(zero)}.`, `Φ = k·Q/r wird erst weit weg null; bei 6r ist es noch ${signed(spec.target[xs.length - 1])}; deine Skizze ist bei ${cols(zero)} null.`) });
    const k = xs.findIndex((x, i) => i && Math.abs(v[i]) > Math.abs(v[i - 1]));
    if (k > 0) out.push({ code: 'grow', at: [k - 1, k], nudge: L('Further from the charge, is the potential larger or smaller in size?', 'Ist das Potential weiter weg von der Ladung dem Betrag nach grösser oder kleiner?'),
      why: L(`V = k·Q/r gets smaller in size with the distance; your sketch is larger at ${at(xs[k])} than at ${at(xs[k - 1])}.`, `Φ = k·Q/r wird mit dem Abstand dem Betrag nach kleiner; deine Skizze ist bei ${at(xs[k])} grösser als bei ${at(xs[k - 1])}.`) });
    if (out.length) return out;
    const r = xs.indexOf(spec.ref), Vref = spec.target[r];
    if (Math.abs(v[r] - Vref) > spec.step + 1e-9) {
      return [{ code: 'ref', at: [r], nudge: L(`At ${at(spec.ref)} the potential is given: ${num(Math.abs(Vref))} V in size.`, `Bei ${at(spec.ref)} ist das Potential gegeben: Sein Betrag ist ${num(Math.abs(Vref))} V.`),
        why: L(`At ${at(spec.ref)}, V = ${signed(Vref)} (given, with the sign of Q); your sketch has ${signed(v[r])}.`, `Bei ${at(spec.ref)} ist Φ = ${signed(Vref)} (gegeben, mit dem Vorzeichen von Q); deine Skizze hat ${signed(v[r])}.`) }];
    }
    const off = xs.map((x, i) => i).filter((i) => Math.abs(v[i] - spec.target[i]) > Math.max(spec.step, 0.25 * Math.abs(spec.target[i])) + 1e-9);
    if (off.length) {
      // further out than the given point too small, or nearer too large: it falls off too fast
      const fast = (Math.abs(v[off[0]]) < Math.abs(spec.target[off[0]])) === (xs[off[0]] > spec.ref);
      out.push({ code: 'shape', at: off, nudge: L(`Your potential falls off too ${fast ? 'fast' : 'slowly'} with the distance (at ${at(xs[off[0]])}): how does the potential of a point charge depend on r?`, `Dein Potential nimmt mit dem Abstand zu ${fast ? 'schnell' : 'langsam'} ab (bei ${at(xs[off[0]])}): Wie hängt das Potential einer Punktladung von r ab?`),
        why: L(`V = k·Q/r falls with 1/r${fast ? ' (not 1/r², like the field)' : ''}: ${xs.map((x, i) => `${signed(spec.target[i])} at ${at(x)}`).join(', ')}; your sketch is off at ${cols(off)}.`, `Φ = k·Q/r nimmt mit 1/r ab${fast ? ' (nicht mit 1/r², wie das Feld)' : ''}: ${xs.map((x, i) => `${signed(spec.target[i])} bei ${at(x)}`).join(', ')}; deine Skizze liegt bei ${cols(off)} daneben.`) });
    }
    return out;
  }
  function judgeSketch(spec, st) {
    const v = vals(spec, st), init = vals(spec, spec.init);
    if (v.every((w, i) => w === init[i])) return null;
    return spec.kind === 'plates' ? judgePlates(spec, v) : spec.kind === 'e2v' ? judgeE2V(spec, v) : judgePoint(spec, v);
  }

  // the exercises
  const NO_FIELD = () => L('Inside a metal (a conductor, with no current flowing) there is no field: the potential is the same all through it.', 'In einem Metall (einem Leiter, in dem kein Strom fliesst) gibt es kein Feld: Das Potential ist überall darin gleich.');
  function platesFig(spec) {
    const g = sketchScale(spec), W = g.W, H = 104, X = g.x, y0 = 30, y1 = 82;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    for (const m of spec.metal) {
      const a = X(spec.ts[m.k]), b = X(spec.ts[m.k + 1]);
      s += `<rect class="metal" x="${a}" y="${y0}" width="${(b - a).toFixed(1)}" height="${y1 - y0}"/><rect class="metal-edge" fill="none" x="${a}" y="${y0}" width="${(b - a).toFixed(1)}" height="${y1 - y0}"/>`;
      s += C.txt((a + b) / 2, y0 + 31, m.name, 'lbl name') + C.txt((a + b) / 2, 18, m.iso ? LR('uncharged', 'ungeladen') : `${num(m.V)} V`, 'lbl small');
    }
    s += `<line class="axisline" x1="${X(0)}" y1="${y1 + 6}" x2="${X(8) + 6}" y2="${y1 + 6}"/>`;
    for (let u = 0; u <= 6; u += 2) s += C.txt(X(u), H - 2, String(u), 'tick');
    s += C.txt(W - 2, H - 2, '<tspan class="it">x</tspan> in mm', 'tick', 'end');
    return C.svg(W, H, s, LR('Metal plates and their potentials', 'Metallplatten und ihre Potentiale'));
  }
  function sketchPlates(seed) {
    const r = rng(seed * 113 + 79), how = r.pick(['two', 'three', 'three', 'iso']), spec = platesSpec(r, how), [A, B, Cc] = spec.metal;
    const ts = spec.ts, gaps = ts.slice(0, -1).map((a, k) => k).filter((k) => !spec.metal.some((m) => m.k === k));
    const intro = how === 'two' ? L(`Two thick metal plates A and B face each other, A at ${signed(A.V)} and B at ${signed(B.V)}.`, `Zwei dicke Metallplatten A und B stehen einander gegenüber, A auf ${signed(A.V)} und B auf ${signed(B.V)}.`)
      : how === 'iso' ? L(`Between the thick metal plates A (${signed(A.V)}) and C (${signed(Cc.V)}) stands the metal plate B, uncharged and isolated (connected to nothing).`, `Zwischen den dicken Metallplatten A (${signed(A.V)}) und C (${signed(Cc.V)}) steht die Metallplatte B, ungeladen und isoliert (mit nichts verbunden).`)
        : L(`Three thick metal plates A, B and C are at ${signed(A.V)}, ${signed(B.V)} and ${signed(Cc.V)}.`, `Drei dicke Metallplatten A, B und C liegen auf ${signed(A.V)}, ${signed(B.V)} und ${signed(Cc.V)}.`);
    const fieldOf = (k) => (spec.target[k] - spec.target[k + 1]) / (ts[k + 1] - ts[k]); // kV/m along +x
    const gapLine = (k) => {
      const a = ts[k], b = ts[k + 1], V1 = spec.target[k], V2 = spec.target[k + 1], Ef = fieldOf(k);
      return V1 === V2 ? L(`${a}–${b} mm, the gap: both plates at ${signed(V1)}, so no field; the potential stays level.`, `${a}–${b} mm, die Lücke: beide Platten auf ${signed(V1)}, also kein Feld; das Potential bleibt gleich.`)
        : L(`${a}–${b} mm, the gap: a uniform field, so a straight line from ${signed(V1)} to ${signed(V2)}; E = ${num(Math.abs(V1 - V2))} V / ${mm(b - a)} = ${nice(Math.abs(Ef))} kV/m, pointing ${Ef > 0 ? 'to the right' : 'to the left'} (towards lower potential).`,
          `${a}–${b} mm, die Lücke: ein homogenes Feld, also eine Gerade von ${signed(V1)} bis ${signed(V2)}; E = ${num(Math.abs(V1 - V2))} V / ${mm(b - a)} = ${nice(Math.abs(Ef))} kV/m, ${Ef > 0 ? 'nach rechts' : 'nach links'} gerichtet (zu tieferem Potential).`);
    };
    const metalLine = (m) => L(`${ts[m.k]}–${ts[m.k + 1]} mm, in plate ${m.name}: no field in the metal, so V = ${signed(m.V)} throughout (level).`, `${ts[m.k]}–${ts[m.k + 1]} mm, in der Platte ${m.name}: kein Feld im Metall, also Φ = ${signed(m.V)} überall (waagrecht).`);
    const sol = [];
    if (how === 'iso') {
      const g = gaps.reduce((t, k) => t + ts[k + 1] - ts[k], 0), g1 = ts[2] - ts[1], U = Cc.V - A.V;
      sol.push(L(`Plate B is uncharged and isolated: the charges on its two faces are equal and opposite, so the field is the same in both gaps: E = ${num(Math.abs(U))} V / ${mm(g)} = ${nice(Math.abs(U) / g)} kV/m (the two gaps together, ${mm(g)}; none in the metal). Across the first gap, ${mm(g1)}, the potential changes by ${num(Math.abs(U) / g)} V/mm · ${mm(g1)} = ${num(Math.abs(B.V - A.V))} V: V_B = ${signed(B.V)}.`,
        `Die Platte B ist ungeladen und isoliert: Die Ladungen auf ihren beiden Seiten sind entgegengesetzt gleich, also ist das Feld in beiden Lücken gleich: E = ${num(Math.abs(U))} V / ${mm(g)} = ${nice(Math.abs(U) / g)} kV/m (die beiden Lücken zusammen, ${mm(g)}; im Metall keines). Über die erste Lücke, ${mm(g1)}, ändert sich das Potential um ${num(Math.abs(U) / g)} V/mm · ${mm(g1)} = ${num(Math.abs(B.V - A.V))} V: Φ_B = ${signed(B.V)}.`));
    }
    ts.slice(0, -1).forEach((a, k) => { const m = spec.metal.find((x) => x.k === k); sol.push(m ? metalLine(m) : gapLine(k)); });
    const fs = gaps.map((k) => Math.abs(fieldOf(k)));
    if (fs.length > 1 && fs[0] !== fs[1] && fs[0] && fs[1]) sol.push(L(`The field is stronger in the ${fs[0] > fs[1] ? 'first' : 'second'} gap: there the line is steeper.`, `Das Feld ist in der ${fs[0] > fs[1] ? 'ersten' : 'zweiten'} Lücke stärker: Dort ist die Linie steiler.`));
    sol.push(SAME());
    return {
      kind: 'sketch', title: L('Sketch the potential: metal plates', 'Das Potential skizzieren: Metallplatten'),
      text: `<p>${intro} ${L('The plates are large; x is measured across them (in mm). Sketch the potential V(x) from x = 0 to 8 mm, through the metal and the gaps.', 'Die Platten sind gross; x wird quer zu ihnen gemessen (in mm). Skizziere das Potential Φ(x) von x = 0 bis 8 mm, durch das Metall und die Lücken.')}</p>`,
      figs: fig(platesFig(spec)), questions: [], sketch: spec,
      hints: [NO_FIELD(), L('Between two large plates the field is uniform: the potential changes evenly, along a straight line.', 'Zwischen zwei grossen Platten ist das Feld homogen: Das Potential ändert sich gleichmässig, entlang einer Geraden.'),
        how === 'iso' ? L('The uncharged plate B has as much positive charge on one face as negative charge on the other: the field is the same on both sides of it.', 'Die ungeladene Platte B trägt auf einer Seite so viel positive Ladung wie negative auf der anderen: Das Feld ist auf beiden Seiten gleich.')
          : L('Put each plate\'s piece level at its potential, then join them.', 'Lege das Stück jeder Platte waagrecht auf ihr Potential und verbinde sie dann.')],
      solution: sol, p: { how, ts: ts.join(','), V: spec.metal.map((m) => m.V).join(',') },
    };
  }
  function sketchE2V(seed) {
    const r = rng(seed * 127 + 83), g = vPieces(r), spec = e2vSpec(g.br, g.sl, g.v0), br = g.br;
    const lines = g.sl.map((s, i) => L(`${br[i]}–${br[i + 1]} mm: E = ${sgn(-s)} kV/m, so V ${s === 0 ? 'stays level' : `changes by −E·Δx = ${sgn(s * (br[i + 1] - br[i]))} V`}, to ${signed(spec.target[i + 1])}.`,
      `${br[i]}–${br[i + 1]} mm: E = ${sgn(-s)} kV/m, also ${s === 0 ? 'bleibt Φ gleich' : `ändert sich Φ um −E·Δx = ${sgn(s * (br[i + 1] - br[i]))} V`}, auf ${signed(spec.target[i + 1])}.`));
    return {
      kind: 'sketch', title: L('Sketch V from E', 'Φ aus E skizzieren'),
      text: L(`<p>The graph shows the field E along the x axis. At x = 0 the potential is ${signed(g.v0)}. Sketch the potential V(x) from x = 0 to 8 mm.</p>`, `<p>Der Graph zeigt das Feld E längs der x-Achse. Bei x = 0 ist das Potential ${signed(g.v0)}. Skizziere das Potential Φ(x) von x = 0 bis 8 mm.</p>`),
      figs: fig(eGraph(g.E, br)), questions: [], sketch: spec,
      hints: [L('E = −dV/dx: where E is positive, V falls; where E is negative, V rises; where E = 0, V stays level.', 'E = −dΦ/dx: Wo E positiv ist, fällt Φ; wo E negativ ist, steigt Φ; wo E = 0 ist, bleibt Φ gleich.'),
        L('The stronger the field, the steeper the potential: V changes by −E·Δx (1 kV/m · 1 mm = 1 V).', 'Je stärker das Feld, desto steiler das Potential: Φ ändert sich um −E·Δx (1 kV/m · 1 mm = 1 V).'),
        `${L('The first part', 'Der erste Teil')}: ${lines[0]}`],
      solution: [L(`E = −dV/dx: the potential falls where E is positive, by E·Δx (1 kV/m · 1 mm = 1 V), starting from V(0) = ${signed(g.v0)}.`, `E = −dΦ/dx: Das Potential fällt, wo E positiv ist, um E·Δx (1 kV/m · 1 mm = 1 V), ausgehend von Φ(0) = ${signed(g.v0)}.`) + `<ul>${lines.map((x) => `<li>${x}</li>`).join('')}</ul>`, SAME()],
      solFig: `<div class="figs">${fig(eGraph(g.E, br))}${fig(vGraph(g.V, br))}</div>`, p: { br: br.join(','), sl: g.sl.join(','), v0: g.v0 },
    };
  }
  function sketchPoint(seed) {
    const r = rng(seed * 131 + 89), s = r.pick([1, -1]), Vr = r.pick([12, 24]), ref = r.pick([1, 2, 3]), spec = pointSpec(s, Vr, ref);
    const Q = s > 0 ? L('positive', 'positiv') : L('negative', 'negativ'), at = (x) => xName(spec, x), Vref = Vr / ref;
    const list = POINT_XS.map((x, i) => `${at(x)}: ${signed(spec.target[i])}`).join(', ');
    return {
      kind: 'sketch', title: L('Sketch the potential of a point charge', 'Das Potential einer Punktladung skizzieren'),
      text: L(`<p>A ${Q} point charge Q sits at r = 0. At the distance ${at(ref)} from it, the potential is ${num(Vref)} V in size (zero far away). Sketch the potential V along a line away from the charge, from r to 6r.</p>`,
        `<p>Eine ${Q}e Punktladung Q sitzt bei r = 0. Im Abstand ${at(ref)} hat das Potential den Betrag ${num(Vref)} V (weit weg null). Skizziere das Potential Φ längs einer Linie weg von der Ladung, von r bis 6r.</p>`),
      figs: '', questions: [], sketch: spec,
      hints: [L(`V = k·Q/r, with the sign of Q: here it is ${Q} everywhere, and zero only far away.`, `Φ = k·Q/r, mit dem Vorzeichen von Q: Hier ist es überall ${Q} und erst weit weg null.`),
        L('V falls with 1/r: at twice the distance half as much, at three times a third (not a quarter and a ninth: that is the field, 1/r²).', 'Φ nimmt mit 1/r ab: im doppelten Abstand halb so viel, im dreifachen ein Drittel (nicht ein Viertel und ein Neuntel: Das ist das Feld, 1/r²).'),
        ref === 1 ? L(`From ${num(Vref)} V at r: what is it at 2r, 3r, 4r, 6r?`, `Von ${num(Vref)} V bei r aus: Wie gross ist es bei 2r, 3r, 4r, 6r?`) : L(`At ${at(ref)} it is ${num(Vref)} V in size; at r, ${ref} times nearer, it is ${ref} times as much.`, `Bei ${at(ref)} ist der Betrag ${num(Vref)} V; bei r, ${ref}-mal näher, ist er ${ref}-mal so gross.`)],
      solution: [L(`Q is ${Q}: V = k·Q/r is ${Q} at every distance and reaches zero only far away.`, `Q ist ${Q}: Φ = k·Q/r ist in jedem Abstand ${Q} und wird erst weit weg null.`),
        L(`V falls in size with 1/r (not with 1/r², like the field)${ref === 1 ? '' : `: at ${at(ref)} it is ${signed(s * Vref)}, so at r, ${ref} times nearer, ${signed(s * Vr)}`}. So ${list}.`, `Φ nimmt dem Betrag nach mit 1/r ab (nicht mit 1/r², wie das Feld)${ref === 1 ? '' : `: Bei ${at(ref)} ist es ${signed(s * Vref)}, also bei r, ${ref}-mal näher, ${signed(s * Vr)}`}. Also ${list}.`),
        L('Near the charge the curve is steep (a strong field), further out flatter.', 'Nahe der Ladung ist die Kurve steil (ein starkes Feld), weiter weg flacher.'), SAME()],
      p: { s, Vr, ref },
    };
  }

  const TYPES = {
    'which-qty': [1, whichQty], 'points-v': [2, pointsV], 'uniform-d': [2, uniformD], v2e: [2, (s) => v2e(s, false)], e2v: [3, (s) => v2e(s, true)],
    'point-v': [3, pointV], scalar: [3, scalar], 'which-way': [1, whichWay], 'gain-lose': [2, gainLose], stmts: [2, statements],
    'sk-plates': [2, sketchPlates], 'sk-e2v': [3, sketchE2V], 'sk-point': [2, sketchPoint],
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
  const api = { TYPES: Object.keys(TYPES), make, OBJECTIVES, CONCEPT, question: checkQuestion, RULE, DOWNHILL, vGraph, eGraph, SC, sgn, frac, subs,
    platesSpec, e2vSpec, pointSpec, sketchScale, sketchFig, sketchBody, sketchHandle, judgeSketch, rightState };
  root.PotEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
