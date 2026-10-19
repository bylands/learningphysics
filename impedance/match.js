// Which curve belongs to the circuit, or (inverse) which circuit to the curve? In the first, the
// student sees a circuit and four sketches of Z(ω) (plot.js
// sketch(): no numbers, only the level R and the resonance frequency ω₀) and first reasons: what Z
// does for ω → 0 and for ω → ∞, and at ω₀ = 1/√(LC) if the circuit has both a coil and a
// capacitor. Each right answer rules out the curves that do not fit, until one is left.
//
// Thirteen circuits (NETS): a resistor, a coil or a capacitor alone; R with L or C, in series or
// in parallel; RLC and LC, in series or in parallel; R in series with the pair L ∥ C; R in parallel
// with the pair L + C. Their features
// { lo, hi, res } all differ. They follow from the rules the student uses, worked out on the
// circuit as a tree of series (s) and parallel (p) connections: for ω → 0 the coil is a wire and
// the capacitor a gap, for ω → ∞ the other way round; at ω₀ coil and capacitor in series act
// like a wire, in parallel like a gap. A gap in series blocks (Z → ∞), a wire in parallel
// short-circuits (Z → 0); otherwise only R is left. test/check-match.js checks them against Z(ω).
//
// The wrong curves come from circuits that share features with the right one, so that no single
// feature is enough: for each feature, one of them has it too (where the pool allows).
//   NETS[id]               { kind, conn, tree, level } (level 0: one element, 1: two elements, 2: RLC
//                          and LC, 3: R with a pair L ∥ C or L + C)
//   features(id)           { lo: '0' | 'R' | 'inf', hi: …, res: 'none' | 'minR' | 'maxR' | 'zero' | 'inf' }
//   circuit(id, q)         the circuit with R = 1 Ω, L = q H, C = 1/q F: ω₀ = 1 rad/s for all
//   generate(id, seed, inverse)  { match: true, inverse, net, q, cands: [id] (four), right
//                          (index), difficulty, p }; inverse: the curve is given and the circuits
//                          are the options (curve → circuit), its questions what the curve tells
//                          about the circuit
//   items(ex)              the reasoning questions for identify.js (keys lo, hi and res; for one
//                          element also phase: how the current is shifted against the voltage)
//   phaseItem(id)          that question for element id (R, L or C)
//   fits(ex, k, state)     whether candidate k agrees with the answers given so far
//   mismatch(ex, k, name, nudge)  why candidate k is not the curve (its first feature that differs)
//   reason(id, phase)      the reasoning for phase lo, hi or res (HTML)
//   hints(ex), solution(ex)  for practice (ex.direct: picked without the questions, so the hints ask
//                          them); dual(id), swapLC(id): the circuit with series and
//                          parallel or coil and capacitor swapped (the check's misconceptions)
(function (root) {
  'use strict';

  const I = root.Impedance || require('./generator.js');
  const Lang = root.Lang || (typeof require === 'function' ? require('./lang.js') : null);
  const L = (en, de) => (Lang ? Lang.L(en, de) : en);

  const s = (...parts) => ({ op: 's', parts }), p = (...parts) => ({ op: 'p', parts });
  const NETS = {
    R: { kind: 'R', conn: 'series', tree: 'R', level: 0 },
    L: { kind: 'L', conn: 'series', tree: 'L', level: 0 },
    C: { kind: 'C', conn: 'series', tree: 'C', level: 0 },
    'RL-series': { kind: 'RL', conn: 'series', tree: s('R', 'L'), level: 1 },
    'RC-series': { kind: 'RC', conn: 'series', tree: s('R', 'C'), level: 1 },
    'RL-parallel': { kind: 'RL', conn: 'parallel', tree: p('R', 'L'), level: 1 },
    'RC-parallel': { kind: 'RC', conn: 'parallel', tree: p('R', 'C'), level: 1 },
    'RLC-series': { kind: 'RLC', conn: 'series', tree: s('R', s('L', 'C')), level: 2 },
    'RLC-parallel': { kind: 'RLC', conn: 'parallel', tree: p('R', p('L', 'C')), level: 2 },
    'LC-series': { kind: 'LC', conn: 'series', tree: s('L', 'C'), level: 2 },
    'LC-parallel': { kind: 'LC', conn: 'parallel', tree: p('L', 'C'), level: 2 },
    'RLC-series-parallel': { kind: 'RLC', conn: 'series-parallel', tree: s('R', p('L', 'C')), level: 3 },
    'RLC-parallel-series': { kind: 'RLC', conn: 'parallel-series', tree: p('R', s('L', 'C')), level: 3 },
  };
  const IDS = Object.keys(NETS);
  const DIFFICULTY = { 0: 1, 1: 2, 2: 3, 3: 4 };
  const DUAL = { series: 'parallel', parallel: 'series', 'series-parallel': 'parallel-series', 'parallel-series': 'series-parallel' };
  const single = (id) => NETS[id].level === 0;
  const dual = (id) => (single(id) ? null : `${NETS[id].kind}-${DUAL[NETS[id].conn]}`);
  const SWAP = { RL: 'RC', RC: 'RL', L: 'C', C: 'L' };
  const swapLC = (id) => (!SWAP[NETS[id].kind] ? null : single(id) ? SWAP[id] : `${SWAP[NETS[id].kind]}-${NETS[id].conn}`);

  // ---------------------------------------------------------------- the features
  // What a part is at the end of the ω axis: R, a wire (short) or a gap (open).
  const LEAF = { lo: { R: 'R', L: 'short', C: 'open' }, hi: { R: 'R', L: 'open', C: 'short' }, res: { R: 'R' } }; // at ω₀, L and C only come as a pair
  const isPair = (t) => typeof t === 'object' && t.parts.every((x) => x === 'L' || x === 'C');
  function state(t, phase) {
    if (typeof t === 'string') return LEAF[phase][t];
    if (phase === 'res' && isPair(t)) return t.op === 's' ? 'short' : 'open';
    const xs = t.parts.map((x) => state(x, phase));
    if (t.op === 's') return xs.includes('open') ? 'open' : xs.includes('R') ? 'R' : 'short';
    return xs.includes('short') ? 'short' : xs.includes('R') ? 'R' : 'open';
  }
  const pairOf = (t) => (isPair(t) ? t : typeof t === 'object' ? t.parts.map(pairOf).find(Boolean) : null);
  const VALUE = { short: '0', R: 'R', open: 'inf' };
  function features(id) {
    const t = NETS[id].tree, pair = pairOf(t);
    let res = 'none';
    if (pair) {
      const v = state(t, 'res');
      res = v === 'R' ? (pair.op === 's' ? 'minR' : 'maxR') : v === 'short' ? 'zero' : 'inf';
    }
    return { lo: VALUE[state(t, 'lo')], hi: VALUE[state(t, 'hi')], res };
  }
  const has = (id, part) => NETS[id].kind.includes(part);
  const resonant = (id) => features(id).res !== 'none';

  function circuit(id, q) {
    const n = NETS[id];
    return { kind: n.kind, conn: n.conn, R: has(id, 'R') ? 1 : null, L: has(id, 'L') ? q : null, C: has(id, 'C') ? 1 / q : null };
  }

  // ---------------------------------------------------------------- texts
  const PHASE = { lo: () => L('For <i>ω</i> → 0', 'Für <i>ω</i> → 0'), hi: () => L('For <i>ω</i> → ∞', 'Für <i>ω</i> → ∞') };
  const Zis = { 0: '<i>Z</i> → 0', R: '<i>Z</i> → <i>R</i>', inf: '<i>Z</i> → ∞' };
  const RES = {
    minR: () => L('<i>Z</i> = <i>R</i>, a minimum', '<i>Z</i> = <i>R</i>, ein Minimum'),
    maxR: () => L('<i>Z</i> = <i>R</i>, a maximum', '<i>Z</i> = <i>R</i>, ein Maximum'),
    zero: () => '<i>Z</i> = 0',
    inf: () => '<i>Z</i> → ∞',
  };
  // what a curve does, for the feedback on a wrong one
  const DOES = {
    lo: { 0: () => L('starts at 0', 'beginnt bei 0'), R: () => L('starts at <i>R</i>', 'beginnt bei <i>R</i>'), inf: () => L('comes down from infinity', 'kommt von unendlich herunter') },
    hi: { 0: () => L('falls towards 0', 'fällt gegen 0'), R: () => L('levels off at <i>R</i>', 'nähert sich <i>R</i>'), inf: () => L('grows without bound', 'wächst über alle Grenzen') },
    res: {
      none: () => L('has no minimum or maximum', 'hat kein Minimum und kein Maximum'), minR: () => L('has its minimum <i>R</i> at <i>ω</i>₀', 'hat bei <i>ω</i>₀ das Minimum <i>R</i>'),
      maxR: () => L('has its maximum <i>R</i> at <i>ω</i>₀', 'hat bei <i>ω</i>₀ das Maximum <i>R</i>'), zero: () => L('drops to 0 at <i>ω</i>₀', 'fällt bei <i>ω</i>₀ auf 0'),
      inf: () => L('shoots up to infinity at <i>ω</i>₀', 'schiesst bei <i>ω</i>₀ gegen unendlich'),
    },
  };

  // the same in a German subordinate clause (verb last)
  const DOES_DE_SUB = {
    lo: { 0: 'bei 0 beginnt', R: 'bei <i>R</i> beginnt', inf: 'von unendlich herunterkommt' },
    hi: { 0: 'gegen 0 fällt', R: 'sich <i>R</i> nähert', inf: 'über alle Grenzen wächst' },
    res: { none: 'kein Minimum und kein Maximum hat', minR: 'bei <i>ω</i>₀ das Minimum <i>R</i> hat', maxR: 'bei <i>ω</i>₀ das Maximum <i>R</i> hat', zero: 'bei <i>ω</i>₀ auf 0 fällt', inf: 'bei <i>ω</i>₀ gegen unendlich schiesst' },
  };

  // How the coil and the capacitor of circuit id behave in phase lo or hi.
  function facts(id, phase) {
    const coil = phase === 'lo' ? L('the coil acts like a wire (<i>ωL</i> → 0)', 'wirkt die Spule wie ein Draht (<i>ωL</i> → 0)') : L('the coil acts like a gap (<i>ωL</i> → ∞)', 'wirkt die Spule wie ein Unterbruch (<i>ωL</i> → ∞)');
    const cap = phase === 'lo' ? L('the capacitor like a gap (1/(<i>ωC</i>) → ∞)', 'der Kondensator wie ein Unterbruch (1/(<i>ωC</i>) → ∞)') : L('the capacitor like a wire (1/(<i>ωC</i>) → 0)', 'der Kondensator wie ein Draht (1/(<i>ωC</i>) → 0)');
    const capAlone = phase === 'lo' ? L('the capacitor acts like a gap (1/(<i>ωC</i>) → ∞)', 'wirkt der Kondensator wie ein Unterbruch (1/(<i>ωC</i>) → ∞)') : L('the capacitor acts like a wire (1/(<i>ωC</i>) → 0)', 'wirkt der Kondensator wie ein Draht (1/(<i>ωC</i>) → 0)');
    const xs = has(id, 'L') && has(id, 'C') ? `${coil} ${L('and', 'und')} ${cap}` : has(id, 'L') ? coil : capAlone;
    return `${PHASE[phase]()} ${xs}.`;
  }
  const RES_FACT = () => L('At the resonance frequency <i>ω</i>₀ = 1/√(<i>LC</i>) the reactances of coil and capacitor are equal, <i>ω</i>₀<i>L</i> = 1/(<i>ω</i>₀<i>C</i>).',
    'Bei der Resonanzfrequenz <i>ω</i>₀ = 1/√(<i>LC</i>) sind die Blindwiderstände von Spule und Kondensator gleich gross, <i>ω</i>₀<i>L</i> = 1/(<i>ω</i>₀<i>C</i>).');

  // What the whole circuit does in a phase: in a circuit with a pair in the other kind of
  // connection (R with L ∥ C, or R with L + C), what the pair does first.
  function whole(id, phase) {
    const t = NETS[id].tree, v = state(t, phase), pair = pairOf(t), f = features(id);
    let first = '';
    if (phase === 'res') {
      first = pair.op === 's'
        ? L('In series they cancel: together, coil and capacitor act like a wire.', 'In Serie heben sie sich auf: Zusammen wirken Spule und Kondensator wie ein Draht.')
        : L('In parallel their currents cancel: together, coil and capacitor act like a gap.', 'Parallel heben sich ihre Ströme auf: Zusammen wirken Spule und Kondensator wie ein Unterbruch.');
    } else if (pair && pair !== t && pair.op !== t.op) {
      const coil = L('the coil', 'die Spule'), cap = L('the capacitor', 'der Kondensator');
      first = pair.op === 's'
        ? L(`Coil and capacitor are in series: the gap (${phase === 'lo' ? cap : coil}) blocks this pair, so it acts like a gap.`, `Spule und Kondensator sind in Serie: Der Unterbruch (${phase === 'lo' ? cap : coil}) sperrt dieses Paar, es wirkt also wie ein Unterbruch.`)
        : L(`Coil and capacitor are in parallel: the wire (${phase === 'lo' ? coil : cap}) short-circuits this pair, so it acts like a wire.`, `Spule und Kondensator sind parallel: Der Draht (${phase === 'lo' ? coil : cap}) schliesst dieses Paar kurz, es wirkt also wie ein Draht.`);
    }
    let then;
    if (phase === 'res' && f.res === 'minR') then = L('A wire in series adds nothing: <i>Z</i> = <i>R</i>. This is the minimum, since away from <i>ω</i>₀ the pair adds a reactance.', 'Ein Draht in Serie trägt nichts bei: <i>Z</i> = <i>R</i>. Das ist das Minimum, denn neben <i>ω</i>₀ kommt der Blindwiderstand des Paars dazu.');
    else if (phase === 'res' && f.res === 'maxR') then = L('A gap in parallel carries no current: <i>Z</i> = <i>R</i>. This is the maximum, since away from <i>ω</i>₀ some current passes the pair, beside <i>R</i>.', 'Ein Unterbruch parallel führt keinen Strom: <i>Z</i> = <i>R</i>. Das ist das Maximum, denn neben <i>ω</i>₀ fliesst ein Teil des Stroms neben <i>R</i> durch das Paar.');
    else if (phase === 'res' && pair === t) then = f.res === 'zero' ? L('So <i>Z</i> = 0.', 'Also ist <i>Z</i> = 0.') : L('So <i>Z</i> → ∞.', 'Also geht <i>Z</i> → ∞.');
    else if (v === 'open') then = L('A gap in series blocks the current: <i>Z</i> → ∞.', 'Ein Unterbruch in Serie sperrt den Strom: <i>Z</i> → ∞.');
    else if (v === 'short') then = L(`A wire in parallel short-circuits ${has(id, 'R') ? 'the resistor' : 'the rest'}: <i>Z</i> ${phase === 'res' ? '=' : '→'} 0.`, `Ein Draht parallel schliesst ${has(id, 'R') ? 'den Widerstand' : 'den Rest'} kurz: <i>Z</i> ${phase === 'res' ? '=' : '→'} 0.`);
    else if (t.op === 's') then = L('A wire in series adds nothing: only <i>R</i> is left, <i>Z</i> → <i>R</i>.', 'Ein Draht in Serie trägt nichts bei: Nur <i>R</i> bleibt, <i>Z</i> → <i>R</i>.');
    else then = L('A gap in parallel carries no current: only <i>R</i> is left, <i>Z</i> → <i>R</i>.', 'Ein Unterbruch parallel führt keinen Strom: Nur <i>R</i> bleibt, <i>Z</i> → <i>R</i>.');
    return first ? `${first} ${then}` : then;
  }

  // One element alone: its impedance, and what it does at an end of the ω axis.
  const ZOF = { R: '<i>Z</i> = <i>R</i>', L: '<i>Z</i> = <i>ωL</i>', C: '<i>Z</i> = 1/(<i>ωC</i>)' };
  function alone(id, phase) {
    if (id === 'R') return L(`A resistor has ${ZOF.R} at every <i>ω</i>: the curve is a horizontal line at <i>R</i>.`, `Ein Widerstand hat ${ZOF.R} bei jedem <i>ω</i>: Die Kurve ist eine waagrechte Linie bei <i>R</i>.`);
    const lo = phase === 'lo';
    if (id === 'L') {
      return lo ? L(`${ZOF.L} → 0: for small <i>ω</i> the coil acts like a wire.`, `${ZOF.L} → 0: Für kleines <i>ω</i> wirkt die Spule wie ein Draht.`)
        : L(`${ZOF.L} → ∞: for large <i>ω</i> the coil acts like a gap. <i>Z</i> grows in proportion to <i>ω</i>, a straight line through the origin.`, `${ZOF.L} → ∞: Für grosses <i>ω</i> wirkt die Spule wie ein Unterbruch. <i>Z</i> wächst proportional zu <i>ω</i>, eine Gerade durch den Ursprung.`);
    }
    return lo ? L(`${ZOF.C} → ∞: for small <i>ω</i> the capacitor acts like a gap; it blocks a direct current.`, `${ZOF.C} → ∞: Für kleines <i>ω</i> wirkt der Kondensator wie ein Unterbruch; er sperrt einen Gleichstrom.`)
      : L(`${ZOF.C} → 0: for large <i>ω</i> the capacitor acts like a wire. <i>Z</i> is inversely proportional to <i>ω</i>, a hyperbola.`, `${ZOF.C} → 0: Für grosses <i>ω</i> wirkt der Kondensator wie ein Draht. <i>Z</i> ist umgekehrt proportional zu <i>ω</i>, eine Hyperbel.`);
  }

  // How the current is shifted against the voltage in element id: the options and the reasoning.
  const SHIFT = {
    same: () => L('In phase', 'In Phase'),
    lag: () => L('The current lags 90° behind the voltage', 'Der Strom hinkt der Spannung um 90° nach'),
    lead: () => L('The current leads the voltage by 90°', 'Der Strom eilt der Spannung um 90° voraus'),
    omega: () => L('It depends on <i>ω</i>', 'Das hängt von <i>ω</i> ab'),
  };
  const SHIFT_OF = { R: 'same', L: 'lag', C: 'lead' };
  function shiftWhy(id) {
    return {
      R: L('In a resistor <i>u</i> = <i>R</i>·<i>i</i> at every moment: current and voltage peak together. They are in phase, at every <i>ω</i>.',
        'In einem Widerstand gilt in jedem Moment <i>u</i> = <i>R</i>·<i>i</i>: Strom und Spannung erreichen ihr Maximum gleichzeitig. Sie sind in Phase, bei jedem <i>ω</i>.'),
      L: L('In a coil the voltage is <i>u</i> = <i>L</i>·d<i>i</i>/d<i>t</i>: it peaks where the current changes fastest, a quarter period before the current peaks. The current lags 90° behind the voltage, at every <i>ω</i>.',
        'An einer Spule ist die Spannung <i>u</i> = <i>L</i>·d<i>i</i>/d<i>t</i>: Sie ist am grössten, wo sich der Strom am schnellsten ändert, eine Viertelperiode vor dem Maximum des Stroms. Der Strom hinkt der Spannung um 90° nach, bei jedem <i>ω</i>.'),
      C: L('In a capacitor the current is <i>i</i> = <i>C</i>·d<i>u</i>/d<i>t</i>: it peaks where the voltage changes fastest, a quarter period before the voltage peaks. The current leads the voltage by 90°, at every <i>ω</i>.',
        'Bei einem Kondensator ist der Strom <i>i</i> = <i>C</i>·d<i>u</i>/d<i>t</i>: Er ist am grössten, wo sich die Spannung am schnellsten ändert, eine Viertelperiode vor dem Maximum der Spannung. Der Strom eilt der Spannung um 90° voraus, bei jedem <i>ω</i>.'),
    }[id];
  }
  function phaseItem(id, n = 3) {
    return {
      key: 'phase',
      what: L(`${n} · How is the current shifted against the voltage?`, `${n} · Wie ist der Strom gegenüber der Spannung verschoben?`),
      options: ['same', 'lag', 'lead', 'omega'].map((v) => ({ html: SHIFT[v](), right: SHIFT_OF[id] === v, flag: v === 'omega' ? 'omega' : (v === 'lag' && id === 'C') || (v === 'lead' && id === 'L') ? 'swap' : 'other',
        why: v === 'omega' ? L('Only the size of <i>Z</i> depends on <i>ω</i>; the shift of one element alone does not.', 'Nur die Grösse von <i>Z</i> hängt von <i>ω</i> ab, die Verschiebung bei einem Bauteil allein nicht.')
          : { R: L('Think of <i>u</i> = <i>R</i>·<i>i</i> at each moment.', 'Denke an <i>u</i> = <i>R</i>·<i>i</i> in jedem Moment.'), L: L('Think of <i>u</i> = <i>L</i>·d<i>i</i>/d<i>t</i>: when is the voltage largest?', 'Denke an <i>u</i> = <i>L</i>·d<i>i</i>/d<i>t</i>: Wann ist die Spannung am grössten?'), C: L('Think of <i>i</i> = <i>C</i>·d<i>u</i>/d<i>t</i>: when is the current largest?', 'Denke an <i>i</i> = <i>C</i>·d<i>u</i>/d<i>t</i>: Wann ist der Strom am grössten?') }[id] })),
      value: shiftWhy(id),
    };
  }

  // The reasoning for phase lo, hi or res (HTML).
  function reason(id, phase) {
    if (single(id)) return alone(id, phase);
    if (phase === 'res') {
      if (!resonant(id)) return L('Without both a coil and a capacitor there is no resonance: <i>Z</i> changes steadily, without a minimum or maximum.', 'Ohne Spule und Kondensator zusammen gibt es keine Resonanz: <i>Z</i> ändert sich stetig, ohne Minimum oder Maximum.');
      return `${RES_FACT()} ${whole(id, 'res')}`;
    }
    return `${facts(id, phase)} ${whole(id, phase)}`;
  }

  // ---------------------------------------------------------------- exercises
  const ORDER = ['lo', 'hi', 'res'];
  const phases = (id) => (resonant(id) ? ORDER : ['lo', 'hi']);
  const shared = (a, b) => phases(a).filter((k) => features(a)[k] === features(b)[k]);

  function generate(id, seed, inverse) {
    const r = I.rng(seed), n = NETS[id];
    const shuffle = (xs) => { const a = [...xs]; for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(r.next() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
    const q = r.pick([0.7, 0.8, 1, 1.2, 1.4]);
    // two elements: the other circuits of two elements; else any other circuit, the ones sharing
    // most features first, and for each feature one that shares it
    const pool = shuffle(IDS.filter((x) => x !== id && (n.level <= 1 ? NETS[x].level === n.level || NETS[x].level === 1 : NETS[x].level > 0)))
      .sort((a, b) => shared(id, b).length - shared(id, a).length);
    const picked = [];
    // one element: the other two elements, and a circuit of two that shares a feature
    if (n.level === 0) picked.push(...IDS.filter((x) => x !== id && single(x)), pool.find((x) => NETS[x].level === 1 && shared(id, x).length));
    for (const k of phases(id)) {
      if (picked.some((x) => shared(id, x).includes(k))) continue;
      const x = pool.find((y) => !picked.includes(y) && shared(id, y).includes(k));
      if (x) picked.push(x);
    }
    for (const x of pool) if (picked.length < 3 && !picked.includes(x)) picked.push(x);
    const cands = shuffle([id, ...picked.slice(0, 3)]);
    // backwards (from the curve to the circuit) is one star harder
    return { match: true, inverse: !!inverse, net: id, q, cands, right: cands.indexOf(id), difficulty: Math.min(5, DIFFICULTY[n.level] + (inverse ? 1 : 0)), p: { net: id, others: [...picked].sort(), inverse: !!inverse } };
  }

  // The reasoning questions (identify.js): their options, the explanation of a wrong one, and the
  // reasoning once right.
  function items(ex) {
    if (ex.inverse) return inverseItems(ex);
    const id = ex.net, f = features(id), noR = !has(id, 'R');
    const end = (k) => ({
      key: k,
      what: k === 'lo' ? L('1 · What does <i>Z</i> do for <i>ω</i> → 0?', '1 · Was macht <i>Z</i> für <i>ω</i> → 0?') : L('2 · What does <i>Z</i> do for <i>ω</i> → ∞?', '2 · Was macht <i>Z</i> für <i>ω</i> → ∞?'),
      options: ['0', 'R', 'inf'].map((v) => ({ html: Zis[v], right: f[k] === v, why: v === 'R' && noR ? L('There is no resistor in this circuit.', 'In dieser Schaltung gibt es keinen Widerstand.')
        : single(id) ? L(`Here ${ZOF[id]}. What does that do for <i>ω</i> → ${k === 'lo' ? '0' : '∞'}?`, `Hier ist ${ZOF[id]}. Was macht das für <i>ω</i> → ${k === 'lo' ? '0' : '∞'}?`) : facts(id, k) })),
      value: reason(id, k),
    });
    const out = [end('lo'), end('hi')];
    if (single(id)) out.push(phaseItem(id));
    if (resonant(id)) {
      out.push({
        key: 'res',
        what: L('3 · And at the resonance frequency <i>ω</i>₀?', '3 · Und bei der Resonanzfrequenz <i>ω</i>₀?'),
        options: ['minR', 'maxR', 'zero', 'inf'].map((v) => ({ html: RES[v](), right: f.res === v,
          why: (v === 'minR' || v === 'maxR') && noR ? L('There is no resistor in this circuit.', 'In dieser Schaltung gibt es keinen Widerstand.')
            : `${RES_FACT()} ${L('In series coil and capacitor then act together like a wire, in parallel like a gap.', 'In Serie wirken Spule und Kondensator dann zusammen wie ein Draht, parallel wie ein Unterbruch.')}` })),
        value: reason(id, 'res'),
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- curve → circuit
  // What the curve tells about the circuit, per phase and feature: the option and, once right, the
  // reasoning. For ω → 0 only a capacitor can block and only a coil short-circuit; for ω → ∞ the
  // other way round; at ω₀ the pair of coil and capacitor does.
  function inverseText(phase, v) {
    if (phase === 'res') {
      return {
        minR: { opt: L('Coil and capacitor in series with each other and with <i>R</i>', 'Spule und Kondensator in Serie zueinander und zu <i>R</i>'),
          value: L('A minimum <i>Z</i> = <i>R</i> at <i>ω</i>₀: there only <i>R</i> counts, and away from <i>ω</i>₀ a reactance adds to it. So coil and capacitor are in series with each other (together a wire at <i>ω</i>₀) and with <i>R</i>.',
            'Ein Minimum <i>Z</i> = <i>R</i> bei <i>ω</i>₀: Dort zählt nur <i>R</i>, und neben <i>ω</i>₀ kommt ein Blindwiderstand dazu. Spule und Kondensator sind also in Serie zueinander (zusammen ein Draht bei <i>ω</i>₀) und zu <i>R</i>.') },
        maxR: { opt: L('Coil and capacitor parallel to each other and to <i>R</i>', 'Spule und Kondensator parallel zueinander und zu <i>R</i>'),
          value: L('A maximum <i>Z</i> = <i>R</i> at <i>ω</i>₀: there only <i>R</i> counts, and away from <i>ω</i>₀ some current also passes beside <i>R</i>. So coil and capacitor are parallel to each other (together a gap at <i>ω</i>₀) and to <i>R</i>.',
            'Ein Maximum <i>Z</i> = <i>R</i> bei <i>ω</i>₀: Dort zählt nur <i>R</i>, und neben <i>ω</i>₀ fliesst auch Strom neben <i>R</i> vorbei. Spule und Kondensator sind also parallel zueinander (zusammen ein Unterbruch bei <i>ω</i>₀) und zu <i>R</i>.') },
        zero: { opt: L('Coil and capacitor in series with each other, parallel to everything else', 'Spule und Kondensator in Serie zueinander, parallel zu allem anderen'),
          value: L('<i>Z</i> = 0 at <i>ω</i>₀: something short-circuits everything. At <i>ω</i>₀ coil and capacitor in series act like a wire, so they are in series with each other and parallel to everything else.',
            '<i>Z</i> = 0 bei <i>ω</i>₀: Etwas schliesst alles kurz. Bei <i>ω</i>₀ wirken Spule und Kondensator in Serie wie ein Draht, sie sind also in Serie zueinander und parallel zu allem anderen.') },
        inf: { opt: L('Coil and capacitor parallel to each other, in series with everything else', 'Spule und Kondensator parallel zueinander, in Serie zu allem anderen'),
          value: L('<i>Z</i> → ∞ at <i>ω</i>₀: something blocks the whole current. At <i>ω</i>₀ coil and capacitor in parallel act like a gap, so they are parallel to each other and in series with everything else.',
            '<i>Z</i> → ∞ bei <i>ω</i>₀: Etwas sperrt den ganzen Strom. Bei <i>ω</i>₀ wirken Spule und Kondensator parallel wie ein Unterbruch, sie sind also parallel zueinander und in Serie zu allem anderen.') },
      }[v];
    }
    const lo = phase === 'lo', cap = { en: 'capacitor', a: 'ein Kondensator', no: 'kein Kondensator' }, coil = { en: 'coil', a: 'eine Spule', no: 'keine Spule' };
    const blocker = lo ? cap : coil, shorter = lo ? coil : cap, up = (x) => x[0].toUpperCase() + x.slice(1);
    const when = lo ? L('for <i>ω</i> → 0', 'für <i>ω</i> → 0') : L('for <i>ω</i> → ∞', 'für <i>ω</i> → ∞');
    const small = lo ? L('small', 'kleines') : L('large', 'grosses');
    return {
      inf: { opt: L(`A ${blocker.en} in series with everything else`, `${up(blocker.a)} in Serie zu allem anderen`),
        value: L(`<i>Z</i> → ∞ ${when}: something blocks the whole current. For ${small} <i>ω</i> only a ${blocker.en} acts like a gap, so a ${blocker.en} is in series with everything else.`,
          `<i>Z</i> → ∞ ${when}: Etwas sperrt den ganzen Strom. Für ${small} <i>ω</i> wirkt nur ${blocker.a} wie ein Unterbruch, also ist ${blocker.a} in Serie zu allem anderen.`) },
      0: { opt: L(`A ${shorter.en} parallel to everything else`, `${up(shorter.a)} parallel zu allem anderen`),
        value: L(`<i>Z</i> → 0 ${when}: something short-circuits everything. For ${small} <i>ω</i> only a ${shorter.en} acts like a wire, so a ${shorter.en} is parallel to everything else.`,
          `<i>Z</i> → 0 ${when}: Etwas schliesst alles kurz. Für ${small} <i>ω</i> wirkt nur ${shorter.a} wie ein Draht, also ist ${shorter.a} parallel zu allem anderen.`) },
      R: { opt: L('Neither: only a resistor is left', 'Weder noch: Nur ein Widerstand bleibt'),
        value: L(`<i>Z</i> → <i>R</i> ${when}: nothing blocks the whole current and nothing short-circuits everything, so only a resistor counts. There is a resistor, no ${blocker.en} is in series with everything else, and no ${shorter.en} is parallel to everything else.`,
          `<i>Z</i> → <i>R</i> ${when}: Nichts sperrt den ganzen Strom, und nichts schliesst alles kurz, also zählt nur ein Widerstand. Es gibt einen Widerstand, ${blocker.no} ist in Serie zu allem anderen, und ${shorter.no} ist parallel zu allem anderen.`) },
    }[v];
  }

  function inverseItems(ex) {
    const id = ex.net, f = features(id);
    const why = (k) => (k === 'lo'
      ? L('For <i>ω</i> → 0 the coil acts like a wire and the capacitor like a gap. What does the curve do there: does it grow without bound, fall to 0, or level off?', 'Für <i>ω</i> → 0 wirkt die Spule wie ein Draht und der Kondensator wie ein Unterbruch. Was macht die Kurve dort: wächst sie über alle Grenzen, fällt sie auf 0, oder wird sie flach?')
      : k === 'hi' ? L('For <i>ω</i> → ∞ the coil acts like a gap and the capacitor like a wire. What does the curve do there: does it grow without bound, fall to 0, or level off?', 'Für <i>ω</i> → ∞ wirkt die Spule wie ein Unterbruch und der Kondensator wie ein Draht. Was macht die Kurve dort: wächst sie über alle Grenzen, fällt sie auf 0, oder wird sie flach?')
        : `${RES_FACT()} ${L('In series coil and capacitor then act together like a wire, in parallel like a gap.', 'In Serie wirken Spule und Kondensator dann zusammen wie ein Draht, parallel wie ein Unterbruch.')}`);
    const what = {
      lo: L('1 · What does the curve for <i>ω</i> → 0 tell you about the circuit?', '1 · Was verrät die Kurve für <i>ω</i> → 0 über die Schaltung?'),
      hi: L('2 · And the curve for <i>ω</i> → ∞?', '2 · Und die Kurve für <i>ω</i> → ∞?'),
      res: L('3 · And its minimum or maximum at <i>ω</i>₀?', '3 · Und ihr Minimum oder Maximum bei <i>ω</i>₀?'),
    };
    return phases(id).map((k) => ({
      key: k, what: what[k],
      options: (k === 'res' ? ['minR', 'maxR', 'zero', 'inf'] : ['inf', '0', 'R']).map((v) => ({ html: inverseText(k, v).opt, right: f[k] === v, why: why(k) })),
      value: inverseText(k, f[k]).value,
    }));
  }

  // Whether candidate k agrees with the features answered right so far (state: { key: option }).
  function fits(ex, k, answered) {
    const f = features(ex.cands[k]), t = features(ex.net);
    return answered.every((key) => f[key] === t[key]);
  }

  const letter = (k) => 'ABCD'[k];
  const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L('and', 'und')} ${xs[xs.length - 1]}`);
  // Why candidate k is not the curve: its first feature that differs. name(k): how the curve is
  // called (by default its letter; the arcade numbers its options).
  // nudge: while the exercise is open, a curve picked wrongly is not told what the right curve does
  // (in the inverse, the curve is given, so naming what it does gives nothing away)
  function mismatch(ex, k, name = letter, nudge = false) {
    const f = features(ex.cands[k]), t = features(ex.net), key = ORDER.find((x) => f[x] !== t[x]);
    if (nudge && !ex.inverse) {
      const at = { lo: L('for <i>ω</i> → 0', 'für <i>ω</i> → 0'), hi: L('for <i>ω</i> → ∞', 'für <i>ω</i> → ∞'), res: L('at <i>ω</i>₀', 'bei <i>ω</i>₀') }[key];
      return L(`Curve ${name(k)} ${DOES[key][f[key]]()}. What does the impedance of this circuit do ${at}?`,
        `Kurve ${name(k)} ${DOES[key][f[key]]()}. Was macht die Impedanz dieser Schaltung ${at}?`);
    }
    if (ex.inverse) {
      return L(`Circuit ${name(k)} gives a curve that ${DOES[key][f[key]]()}, but this curve ${DOES[key][t[key]]()}.`,
        `Schaltung ${name(k)} ergibt eine Kurve, die ${DOES_DE_SUB[key][f[key]]}, aber diese Kurve ${DOES[key][t[key]]()}.`);
    }
    return L(`Curve ${name(k)} ${DOES[key][f[key]]()}, but the curve of this circuit ${DOES[key][t[key]]()}.`,
      `Kurve ${name(k)} ${DOES[key][f[key]]()}, aber die Kurve dieser Schaltung ${DOES[key][t[key]]()}.`);
  }

  // The circuit in words, for the hints.
  const DESC = {
    R: () => L('a resistor alone', 'ein Widerstand allein'),
    L: () => L('a coil alone', 'eine Spule allein'),
    C: () => L('a capacitor alone', 'ein Kondensator allein'),
    'RL-series': () => L('<i>R</i> and <i>L</i> in series', '<i>R</i> und <i>L</i> in Serie'),
    'RC-series': () => L('<i>R</i> and <i>C</i> in series', '<i>R</i> und <i>C</i> in Serie'),
    'RL-parallel': () => L('<i>R</i> and <i>L</i> in parallel', '<i>R</i> und <i>L</i> parallel'),
    'RC-parallel': () => L('<i>R</i> and <i>C</i> in parallel', '<i>R</i> und <i>C</i> parallel'),
    'RLC-series': () => L('<i>R</i>, <i>L</i> and <i>C</i> all in series', '<i>R</i>, <i>L</i> und <i>C</i> alle in Serie'),
    'RLC-parallel': () => L('<i>R</i>, <i>L</i> and <i>C</i> all in parallel', '<i>R</i>, <i>L</i> und <i>C</i> alle parallel'),
    'LC-series': () => L('<i>L</i> and <i>C</i> in series, without a resistor', '<i>L</i> und <i>C</i> in Serie, ohne Widerstand'),
    'LC-parallel': () => L('<i>L</i> and <i>C</i> in parallel, without a resistor', '<i>L</i> und <i>C</i> parallel, ohne Widerstand'),
    'RLC-series-parallel': () => L('<i>R</i> in series with the pair <i>L</i> ∥ <i>C</i> (coil and capacitor parallel to each other)', '<i>R</i> in Serie mit dem Paar <i>L</i> ∥ <i>C</i> (Spule und Kondensator parallel zueinander)'),
    'RLC-parallel-series': () => L('<i>R</i> in parallel with the pair <i>L</i> + <i>C</i> (coil and capacitor in series with each other)', '<i>R</i> parallel zum Paar <i>L</i> + <i>C</i> (Spule und Kondensator in Serie zueinander)'),
  };
  // The hints: this circuit (or this curve) first, then the behaviour of its own parts at the
  // ends of the ω axis, the rule for series and parallel, and where to start. They do not say
  // what Z does at an end or at ω₀ (the questions of identify.js) nor which curve or circuit fits.
  function hints(ex) {
    const id = ex.net, f = features(id), res = resonant(id);
    const parts = (x) => [has(x, 'L') && L('Coil: its reactance <i>ωL</i> is small for small <i>ω</i> (a wire) and large for large <i>ω</i> (a gap).', 'Spule: Ihr Blindwiderstand <i>ωL</i> ist für kleines <i>ω</i> klein (ein Draht) und für grosses <i>ω</i> gross (ein Unterbruch).'),
      has(x, 'C') && L('Capacitor: its reactance 1/(<i>ωC</i>) is large for small <i>ω</i> (a gap) and small for large <i>ω</i> (a wire).', 'Kondensator: Sein Blindwiderstand 1/(<i>ωC</i>) ist für kleines <i>ω</i> gross (ein Unterbruch) und für grosses <i>ω</i> klein (ein Draht).')].filter(Boolean).join(' ');
    const curve = () => `${[DOES.lo[f.lo](), DOES.hi[f.hi](), ...(res ? [DOES.res[f.res]()] : [])].join(', ').replace(/, ([^,]*)$/, L(' and $1', ' und $1'))}`;
    if (single(id)) {
      const rules = L('Resistor: <i>Z</i> = <i>R</i> at every <i>ω</i>. Coil: <i>Z</i> = <i>ωL</i>, small for small <i>ω</i> (a wire) and large for large <i>ω</i> (a gap). Capacitor: <i>Z</i> = 1/(<i>ωC</i>), large for small <i>ω</i> (a gap) and small for large <i>ω</i> (a wire).',
        'Widerstand: <i>Z</i> = <i>R</i> bei jedem <i>ω</i>. Spule: <i>Z</i> = <i>ωL</i>, klein für kleines <i>ω</i> (ein Draht) und gross für grosses <i>ω</i> (ein Unterbruch). Kondensator: <i>Z</i> = 1/(<i>ωC</i>), gross für kleines <i>ω</i> (ein Unterbruch) und klein für grosses <i>ω</i> (ein Draht).');
      // directly, without the questions: the hints ask them instead (both ends of the ω axis)
      if (ex.direct && ex.inverse) {
        return [L(`This curve ${curve()}. Which single element has an impedance that does this?`, `Diese Kurve ${curve()}. Welches einzelne Bauteil hat eine Impedanz, die das tut?`),
          rules,
          L('Only a capacitor blocks for small <i>ω</i>, only a coil for large <i>ω</i>; a resistor alone gives a horizontal line. Compare that with this curve for <i>ω</i> → 0 and for <i>ω</i> → ∞.',
            'Nur ein Kondensator sperrt für kleines <i>ω</i>, nur eine Spule für grosses <i>ω</i>; ein Widerstand allein ergibt eine waagrechte Linie. Vergleiche das mit dieser Kurve für <i>ω</i> → 0 und für <i>ω</i> → ∞.')];
      }
      const el = { R: L('a resistor', 'ein Widerstand'), L: L('a coil', 'eine Spule'), C: L('a capacitor', 'ein Kondensator') }[id];
      const first = L(`The circuit is ${el} alone, with ${ZOF[id]}. What does that give for <i>ω</i> → 0, and for <i>ω</i> → ∞?`, `Die Schaltung ist ${el} allein, mit ${ZOF[id]}. Was ergibt das für <i>ω</i> → 0, und für <i>ω</i> → ∞?`);
      const step = { R: L('<i>ω</i> does not appear in <i>Z</i> = <i>R</i>: the same value at every <i>ω</i>.', '<i>ω</i> kommt in <i>Z</i> = <i>R</i> nicht vor: derselbe Wert bei jedem <i>ω</i>.'),
        L: L('Put <i>ω</i> = 0 into <i>ωL</i>, then let <i>ω</i> grow: does <i>Z</i> grow in proportion to <i>ω</i> or like 1/<i>ω</i>?', 'Setze <i>ω</i> = 0 in <i>ωL</i> ein und lass dann <i>ω</i> wachsen: Wächst <i>Z</i> proportional zu <i>ω</i> oder wie 1/<i>ω</i>?'),
        C: L('Let <i>ω</i> get very small in 1/(<i>ωC</i>), then very large: what happens to the fraction?', 'Lass <i>ω</i> in 1/(<i>ωC</i>) sehr klein werden, dann sehr gross: Was geschieht mit dem Bruch?') }[id];
      if (ex.direct) return [first, rules, step];
      const shift = { R: L('The shift: in the resistor <i>u</i> = <i>R</i>·<i>i</i> at every moment. Do current and voltage peak at the same time?', 'Die Verschiebung: Im Widerstand gilt in jedem Moment <i>u</i> = <i>R</i>·<i>i</i>. Erreichen Strom und Spannung ihr Maximum gleichzeitig?'),
        L: L('The shift: in the coil <i>u</i> = <i>L</i>·d<i>i</i>/d<i>t</i>. The voltage is largest where the current changes fastest: before or after the current peaks?', 'Die Verschiebung: An der Spule gilt <i>u</i> = <i>L</i>·d<i>i</i>/d<i>t</i>. Die Spannung ist am grössten, wo sich der Strom am schnellsten ändert: vor oder nach dem Maximum des Stroms?'),
        C: L('The shift: in the capacitor <i>i</i> = <i>C</i>·d<i>u</i>/d<i>t</i>. The current is largest where the voltage changes fastest: before or after the voltage peaks?', 'Die Verschiebung: Beim Kondensator gilt <i>i</i> = <i>C</i>·d<i>u</i>/d<i>t</i>. Der Strom ist am grössten, wo sich die Spannung am schnellsten ändert: vor oder nach dem Maximum der Spannung?') }[id];
      return [first, shift, step];
    }
    const rule = L('In series, a gap blocks the current (<i>Z</i> → ∞) and a wire adds nothing. In parallel, a wire short-circuits everything else (<i>Z</i> → 0) and a gap carries no current.',
      'In Serie sperrt ein Unterbruch den Strom (<i>Z</i> → ∞), und ein Draht trägt nichts bei. Parallel schliesst ein Draht alles andere kurz (<i>Z</i> → 0), und ein Unterbruch führt keinen Strom.');
    const pair = pairOf(NETS[id].tree);
    const resRule = !res ? '' : ` ${pair.op === 's'
      ? L('Here coil and capacitor are in series with each other: at <i>ω</i>₀ = 1/√(<i>LC</i>) their reactances are equal and cancel, so the two together act like a wire.', 'Hier sind Spule und Kondensator in Serie zueinander: Bei <i>ω</i>₀ = 1/√(<i>LC</i>) sind ihre Blindwiderstände gleich gross und heben sich auf, die beiden wirken also zusammen wie ein Draht.')
      : L('Here coil and capacitor are in parallel with each other: at <i>ω</i>₀ = 1/√(<i>LC</i>) their currents cancel, so the two together act like a gap.', 'Hier sind Spule und Kondensator parallel zueinander: Bei <i>ω</i>₀ = 1/√(<i>LC</i>) heben sich ihre Ströme auf, die beiden wirken also zusammen wie ein Unterbruch.')}`;
    if (ex.inverse) {
      return [
        L(`This curve ${curve()}. For each of these, ask what in a circuit can do it.`, `Diese Kurve ${curve()}. Frage dich bei jedem davon, was in einer Schaltung das bewirken kann.`),
        parts('LC-series'),
        rule + (res ? ` ${RES_FACT()} ${L('In series coil and capacitor then act together like a wire, in parallel like a gap.', 'In Serie wirken Spule und Kondensator dann zusammen wie ein Draht, parallel wie ein Unterbruch.')}` : ''),
        L(`Start with <i>ω</i> → 0: which element acts like a gap there, which like a wire, and what would have to sit where so that the curve ${DOES.lo[f.lo]()}?`, `Beginne mit <i>ω</i> → 0: Welches Bauteil wirkt dort wie ein Unterbruch, welches wie ein Draht, und was müsste wo sitzen, damit die Kurve ${DOES_DE_SUB.lo[f.lo]}?`),
      ];
    }
    return [
      L(`This circuit: ${DESC[id]()}. For ${res ? 'both ends of the <i>ω</i> axis and at <i>ω</i>₀' : 'both ends of the <i>ω</i> axis'}, ask which of its parts acts like a wire and which like a gap.`,
        `Diese Schaltung: ${DESC[id]()}. Frage dich für ${res ? 'beide Enden der <i>ω</i>-Achse und bei <i>ω</i>₀' : 'beide Enden der <i>ω</i>-Achse'}, welcher ihrer Teile wie ein Draht und welcher wie ein Unterbruch wirkt.`),
      parts(id),
      rule + resRule,
      `${facts(id, 'lo')} ${L(`Redraw the circuit like that: is there a gap in series with everything, a wire parallel to everything, or ${has(id, 'R') ? 'only <i>R</i>' : 'neither'}? Then the same for <i>ω</i> → ∞.`, `Zeichne die Schaltung so neu: Gibt es einen Unterbruch in Serie zu allem, einen Draht parallel zu allem, oder ${has(id, 'R') ? 'nur <i>R</i>' : 'keines von beiden'}? Dann dasselbe für <i>ω</i> → ∞.`)}`,
    ];
  }

  // The labels at the ends and at ω₀ of the right curve, for the solution.
  function marks(id) {
    const f = features(id), m = { lo: Zis[f.lo], hi: Zis[f.hi] };
    const plain = (h) => h.replace(/<\/?i>/g, '');
    const out = { lo: { text: plain(m.lo), v: f.lo }, hi: { text: plain(m.hi), v: f.hi } };
    if (f.res !== 'none') out.res = { minR: 'Z_min = R', maxR: 'Z_max = R', zero: 'Z = 0', inf: 'Z → ∞' }[f.res];
    return out;
  }

  // The worked solution: { steps: [{ title, text }], verdict, others: [text] }.
  function solution(ex) {
    const id = ex.net;
    const title = { lo: L('Small ω', 'Kleines ω'), hi: L('Large ω', 'Grosses ω'), res: L('At the resonance frequency', 'Bei der Resonanzfrequenz') };
    // one element backwards: what the curve does, and which element does that
    const back = (k) => (single(id) ? `${L(`The curve ${DOES[k][features(id)[k]]()}.`, `Die Kurve ${DOES[k][features(id)[k]]()}.`)} ${reason(id, k)}` : inverseText(k, features(id)[k]).value);
    const steps = phases(id).map((k) => ({ title: title[k], text: ex.inverse ? back(k) : reason(id, k) }));
    if (single(id) && !ex.direct) steps.push({ title: L('The shift', 'Die Verschiebung'), text: shiftWhy(id) }); // asked only with the questions
    return {
      steps,
      verdict: ex.inverse ? L(`Only circuit ${letter(ex.right)} fits all of this.`, `Nur Schaltung ${letter(ex.right)} passt zu all dem.`) : L(`Only curve ${letter(ex.right)} does all of this.`, `Nur Kurve ${letter(ex.right)} tut all das.`),
      others: ex.cands.map((x, k) => k).filter((k) => k !== ex.right).map((k) => mismatch(ex, k)),
    };
  }

  const api = { inverseText, and, NETS, IDS, single, phaseItem, shiftWhy, DIFFICULTY, features, circuit, generate, items, fits, mismatch, reason, hints, solution, marks, phases, dual, swapLC, letter, resonant };
  root.Match = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
