// Cyclic processes of an ideal gas in state diagrams: the model and the exercises.
//
// A state is { p, V } in units of p₀ and V₀ (whole numbers 1 … 8, so that it lies on the ticks of
// a diagram); its temperature is T = pV in units of T₀ = p₀V₀/(nR). A process from one state to the
// next is isobaric (p constant), isochoric (V constant), isothermal (T constant) or, for the step
// back to the start, general (none of them, drawn as a straight line in the p(V) diagram). A step
// of a description is { type, k, say }: the factor k (2, 3, ½, ⅓) by which V changes (isobaric,
// isothermal) or p changes (isochoric), and the quantity named in the text (say: p, V or T).
// A cycle is { states: [A, B, …], segs: [{ type, k?, say?, from, to }] }, the last segment back to A.
//
// Diagrams: 'pV' (p against V), 'pT' (p against T) and 'VT' (V against T), as in the worksheet:
// p(V), p(T), V(T). The same process has a different shape in each (SHAPE).
//
// The exercises (EXERCISES), each { kind, diagram, …, questions, hints, solution, difficulty }:
//   match      description → diagram: which of four diagrams shows the cycle described
//   close      the step back to A: how is it best described
//   statements diagram → which statements are correct
//   switch     a cycle in one diagram: which diagram shows it in another
//   lines      which line is an isobar, isochore or isotherm, and which of two has the larger value
//   draw       the cycle drawn on the grid, state by state
//   error      a student's sketch with one wrong step: which, and what is wrong
//   table      p, V and T of the states, from those of A and the description
// The wrong options come from typical mistakes (another kind of process, the factor upside down,
// an isotherm drawn straight, the cycle run backwards, a diagram copied without changing it).
(function (root) {
  'use strict';

  const Lang = root.Lang || (typeof require === 'function' ? require('./lang.js') : null);
  const L = (en, de) => (Lang ? Lang.L(en, de) : en);
  const de = () => !!Lang && Lang.get() === 'de';

  // ---------------------------------------------------------------- random numbers
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (arr) => arr[Math.floor(next() * arr.length)];
    const shuffle = (arr) => { const a2 = [...arr]; for (let k = a2.length - 1; k > 0; k--) { const j = Math.floor(next() * (k + 1)); [a2[k], a2[j]] = [a2[j], a2[k]]; } return a2; };
    return { next, pick, shuffle, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)) };
  }

  // ---------------------------------------------------------------- states and processes
  const MAX = 8, TYPES = ['isobaric', 'isochoric', 'isothermal'], FACTORS = [2, 3, 1 / 2, 1 / 3];
  const T = (s) => s.p * s.V;
  const eq = (a, b) => Math.abs(a - b) < 1e-9;
  const same = (a, b) => eq(a.p, b.p) && eq(a.V, b.V);
  const VARS = { p: (s) => s.p, V: (s) => s.V, T };

  function apply(s, step) {
    if (step.type === 'isobaric') return { p: s.p, V: s.V * step.k };
    if (step.type === 'isochoric') return { p: s.p * step.k, V: s.V };
    return { p: s.p / step.k, V: s.V * step.k };
  }
  // the kind of process from a to b
  function classify(a, b) {
    if (eq(a.p, b.p)) return 'isobaric';
    if (eq(a.V, b.V)) return 'isochoric';
    if (eq(T(a), T(b))) return 'isothermal';
    return 'general';
  }
  // the constant of a process (p, V or T), for telling whether two steps lie on the same line
  const constOf = (type, s) => ({ isobaric: s.p, isochoric: s.V, isothermal: T(s) }[type]);

  // A cycle from A and the steps described; the last segment goes back to A.
  function cycleOf(A, steps) {
    const states = [A];
    steps.forEach((st) => states.push(apply(states[states.length - 1], st)));
    const segs = steps.map((st, i) => ({ ...st, from: i, to: i + 1 }));
    const last = states[states.length - 1];
    segs.push({ type: classify(last, A), from: states.length - 1, to: 0, closing: true });
    return { states, segs };
  }
  const onGrid = (s) => [s.p, s.V].every((x) => x >= 1 - 1e-9 && x <= MAX + 1e-9 && eq(x, Math.round(x)));

  // Points along a segment in (p, V): the variable that changes runs evenly (V for isobaric and
  // isothermal, p for isochoric, both for a general one, which is straight in p(V)).
  function sample(c, seg, n = 48, straight = false) {
    const a = c.states[seg.from], b = c.states[seg.to], pts = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n, V = a.V + (b.V - a.V) * u;
      if (seg.type === 'isothermal' && !straight) pts.push({ p: T(a) / V, V });
      else pts.push({ p: a.p + (b.p - a.p) * u, V });
    }
    return pts;
  }

  // A good cycle: states on the grid and distinct, no two neighbouring steps on the same line
  // (they would be one process), the step back non-degenerate, the loop not crossing itself.
  function valid(c) {
    const n = c.states.length;
    if (!c.states.every(onGrid)) return false;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (same(c.states[i], c.states[j])) return false;
    for (let i = 0; i < c.segs.length; i++) {
      const a = c.segs[i], b = c.segs[(i + 1) % c.segs.length];
      if (a.type === b.type && a.type !== 'general' && eq(constOf(a.type, c.states[a.from]), constOf(b.type, c.states[b.from]))) return false;
    }
    // crossing: sampled polylines of non-neighbouring segments in p(V)
    const lines = c.segs.map((s) => sample(c, s, 24));
    const cross = (p1, p2, p3, p4) => {
      const d = (a, b, q) => (b.V - a.V) * (q.p - a.p) - (b.p - a.p) * (q.V - a.V);
      return d(p1, p2, p3) * d(p1, p2, p4) <= 1e-12 && d(p3, p4, p1) * d(p3, p4, p2) <= 1e-12; // touching counts: steps that are no neighbours never meet
    };
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 2; j < lines.length; j++) {
        if (i === 0 && j === lines.length - 1) continue;
        for (let a = 0; a < lines[i].length - 1; a++) for (let b = 0; b < lines[j].length - 1; b++) if (cross(lines[i][a], lines[i][a + 1], lines[j][b], lines[j][b + 1])) return false;
      }
    }
    return true;
  }

  // A random cycle of n steps described (and the step back), valid, and with (o.standard) a step
  // back that is one of the three processes, or (o.general) one that is not.
  function randomCycle(r, n, o = {}) {
    for (let k = 0; k < 20000; k++) {
      const A = { p: r.int(1, MAX), V: r.int(1, MAX) }, steps = [];
      let prev = null;
      for (let i = 0; i < n; i++) {
        const type = r.pick(TYPES.filter((t) => t !== prev));
        steps.push({ type, k: r.pick(FACTORS), say: type === 'isothermal' ? 'V' : r.pick(type === 'isobaric' ? ['V', 'T'] : ['p', 'T']) });
        prev = type;
      }
      const c = cycleOf(A, steps), back = c.segs[c.segs.length - 1].type;
      if (o.standard && back === 'general') continue;
      if (o.general && back !== 'general') continue;
      if (o.fits && !o.fits(c)) continue;
      if (valid(c)) return c;
    }
    throw new Error('no cycle');
  }

  // ---------------------------------------------------------------- diagrams
  const DIAGRAMS = ['pV', 'pT', 'VT'];
  const AXES = { pV: ['V', 'p'], pT: ['T', 'p'], VT: ['T', 'V'] };
  const coord = (d, s) => { const [x, y] = AXES[d]; return [VARS[x](s), VARS[y](s)]; };
  // a state from a point of a diagram
  function stateAt(d, x, y) {
    if (d === 'pV') return { p: y, V: x };
    if (d === 'pT') return { p: y, V: x / y };
    return { p: x / y, V: y };
  }
  const dname = (d) => ({ pV: '<i>p</i>(<i>V</i>)', pT: '<i>p</i>(<i>T</i>)', VT: '<i>V</i>(<i>T</i>)' }[d]);
  // The shape of a process in a diagram.
  function shape(type, d) {
    const S = {
      pV: { isobaric: L('a horizontal line', 'eine waagrechte Gerade'), isochoric: L('a vertical line', 'eine senkrechte Gerade'), isothermal: L('a hyperbola, p ∝ 1/V', 'eine Hyperbel, p ∝ 1/V') },
      pT: { isobaric: L('a horizontal line', 'eine waagrechte Gerade'), isochoric: L('a line through the origin, p ∝ T', 'eine Gerade durch den Ursprung, p ∝ T'), isothermal: L('a vertical line', 'eine senkrechte Gerade') },
      VT: { isobaric: L('a line through the origin, V ∝ T', 'eine Gerade durch den Ursprung, V ∝ T'), isochoric: L('a horizontal line', 'eine waagrechte Gerade'), isothermal: L('a vertical line', 'eine senkrechte Gerade') },
    };
    return type === 'general' ? L('none of these lines', 'keine dieser Linien') : S[d][type];
  }
  // The axes of a diagram for a set of states: whole units on the ticks, T in steps of 1 to 6 so
  // that there are at most 12 ticks; onTicks tells whether every state lies on a tick of both axes.
  function axesFor(d, states, extra = 1.2) {
    const [x, y] = AXES[d], ax = {};
    for (const [key, v] of [['x', x], ['y', y]]) {
      const vals = states.map(VARS[v]), max = Math.max(...vals);
      let step = 1;
      if (v === 'T') step = [1, 2, 3, 4, 6, 8, 12].find((s) => (max * extra) / s <= 12 && vals.every((t) => eq(t / s, Math.round(t / s)))) || [1, 2, 3, 4, 6, 8, 12].find((s) => (max * extra) / s <= 12);
      const ticks = Math.max(4, Math.ceil((max * extra) / step));
      ax[key] = { v, step, ticks, max: step * ticks };
    }
    ax.onTicks = states.every((s) => { const [cx, cy] = coord(d, s); return eq(cx / ax.x.step, Math.round(cx / ax.x.step)) && eq(cy / ax.y.step, Math.round(cy / ax.y.step)); });
    return ax;
  }

  // ---------------------------------------------------------------- words
  const LETTERS = 'ABCDE';
  const nameOf = (i) => LETTERS[i];
  const arrow = (seg) => `${nameOf(seg.from)} → ${nameOf(seg.to)}`;
  const ADJ = {
    isobaric: () => L('isobaric', 'isobar'), isochoric: () => L('isochoric', 'isochor'), isothermal: () => L('isothermal', 'isotherm'),
    general: () => L('none of the three', 'keiner der drei'),
  };
  // the adjective before a feminine German noun (isobare Expansion)
  const ADJ_F = { isobaric: () => L('isobaric', 'isobare'), isochoric: () => L('isochoric', 'isochore'), isothermal: () => L('isothermal', 'isotherme') };
  const NOUN = { up: { V: () => L('expansion', 'Expansion'), T: () => L('heating', 'Erwärmung'), p: () => L('heating', 'Erwärmung') }, down: { V: () => L('compression', 'Kompression'), T: () => L('cooling', 'Abkühlung'), p: () => L('cooling', 'Abkühlung') } };
  const QTY = { p: () => L('pressure', 'Druck'), V: () => L('volume', 'Volumen'), T: () => L('temperature', 'Temperatur') };
  const SYM = { p: '<i>p</i>', V: '<i>V</i>', T: '<i>T</i>' };
  // "to three times the volume", "auf das dreifache Volumen"
  function toFactor(v, k) {
    if (v === 'p') {
      const en = { 2: 'until the pressure has doubled', 3: 'until the pressure has tripled', 0.5: 'until the pressure has halved', [1 / 3]: 'until the pressure has fallen to a third' }[k];
      const dd = { 2: 'bis sich der Druck verdoppelt hat', 3: 'bis sich der Druck verdreifacht hat', 0.5: 'bis sich der Druck halbiert hat', [1 / 3]: 'bis der Druck auf 1/3 gesunken ist' }[k];
      return L(en, dd);
    }
    const en = { 2: `to twice the ${v === 'V' ? 'volume' : 'temperature'}`, 3: `to three times the ${v === 'V' ? 'volume' : 'temperature'}`, 0.5: `to half the ${v === 'V' ? 'volume' : 'temperature'}`, [1 / 3]: `to a third of the ${v === 'V' ? 'volume' : 'temperature'}` }[k];
    const dd = v === 'V'
      ? { 2: 'auf das doppelte Volumen', 3: 'auf das dreifache Volumen', 0.5: 'auf das halbe Volumen', [1 / 3]: 'auf 1/3 des Volumens' }[k]
      : { 2: 'auf die doppelte Temperatur', 3: 'auf die dreifache Temperatur', 0.5: 'auf die halbe Temperatur', [1 / 3]: 'auf 1/3 der Temperatur' }[k];
    return L(en, dd);
  }
  // the factor by which the named quantity changes in a step
  const factorOf = (step) => step.k;
  // A step in words: "isothermal compression to a third of the volume".
  function describe(step) {
    const dir = step.k > 1 ? 'up' : 'down';
    const v = step.say;
    const noun = NOUN[dir][v === 'p' ? 'p' : v]();
    return `${ADJ_F[step.type]()} ${noun}${v === 'p' && de() ? ',' : ''} ${toFactor(v, factorOf(step))}`; // German: a comma before "bis sich …"
  }
  const describeCycle = (c) => c.segs.filter((s) => !s.closing).map((s) => L(`from ${nameOf(s.from)}: ${describe(s)} → state ${nameOf(s.to)}`, `von ${nameOf(s.from)} aus: ${describe(s)} → Zustand ${nameOf(s.to)}`));

  // how a quantity changes from a to b: 'up', 'down' or 'same'
  const change = (v, a, b) => (eq(VARS[v](a), VARS[v](b)) ? 'same' : VARS[v](b) > VARS[v](a) ? 'up' : 'down');
  // a ratio as a word: "twice", "a third", "3/2 times"
  function ratioWord(r) {
    const w = { 2: L('twice', 'verdoppelt'), 3: L('three times', 'verdreifacht'), 4: L('four times', 'vervierfacht'), 0.5: L('half', 'halbiert'), [1 / 3]: L('a third', 'gedrittelt'), 0.25: L('a quarter', 'geviertelt') };
    for (const k of Object.keys(w)) if (eq(Number(k), r)) return w[k];
    return L(`${frac(r)} times`, `auf das ${frac(r)}-fache`);
  }
  function frac(r) {
    for (let q = 1; q <= 12; q++) { const pp = Math.round(r * q); if (eq(pp / q, r)) return q === 1 ? `${pp}` : `${pp}/${q}`; }
    return r.toFixed(2);
  }
  // a factor as a verb: "doubles", "falls to a third"; German verb first ("verdoppelt sich der Druck")
  function grows(k) {
    const W = { 2: ['doubles', 'verdoppelt sich', ''], 3: ['triples', 'verdreifacht sich', ''], 0.5: ['halves', 'halbiert sich', ''], [1 / 3]: ['falls to a third', 'sinkt', ' auf einen Drittel'] };
    for (const key of Object.keys(W)) if (eq(Number(key), k)) return { en: W[key][0], de: W[key][1], deEnd: W[key][2] };
    return k > 1 ? { en: `grows to ${frac(k)} times its value`, de: 'steigt', deEnd: ` auf das ${frac(k)}-fache` } : { en: `falls to ${frac(k)} of its value`, de: 'sinkt', deEnd: ` auf ${frac(k)}` };
  }
  const CHANGE = {
    up: { p: () => L('the pressure rises', 'der Druck steigt'), V: () => L('the volume grows (expansion)', 'das Volumen wächst (Expansion)'), T: () => L('the temperature rises', 'die Temperatur steigt') },
    down: { p: () => L('the pressure falls', 'der Druck sinkt'), V: () => L('the volume shrinks (compression)', 'das Volumen nimmt ab (Kompression)'), T: () => L('the temperature falls', 'die Temperatur sinkt') },
    same: { p: () => L('the pressure stays the same', 'der Druck bleibt gleich'), V: () => L('the volume stays the same', 'das Volumen bleibt gleich'), T: () => L('the temperature stays the same', 'die Temperatur bleibt gleich') },
  };
  // What happens in a segment: "B → C is isochoric: the volume stays the same, the pressure falls
  // to a third, and so does the temperature (T ∝ pV)."
  function summary(c, seg) {
    const a = c.states[seg.from], b = c.states[seg.to];
    const parts = ['p', 'V', 'T'].map((v) => {
      const ch = change(v, a, b), base = CHANGE[ch][v]();
      return ch === 'same' ? base : `${base} (${L('×', '×')}${frac(VARS[v](b) / VARS[v](a))})`;
    });
    const kind = seg.type === 'general' ? L('is none of the three processes', 'ist keiner der drei Prozesse') : L(`is ${ADJ[seg.type]()}`, `ist ${ADJ[seg.type]()}`);
    return `${arrow(seg)} ${kind}: ${parts.join(', ')}.`;
  }
  const ruleT = () => L('T ∝ pV: the temperature is proportional to the product of pressure and volume.', 'T ∝ pV: Die Temperatur ist proportional zum Produkt aus Druck und Volumen.');
  // for the hints: the described steps by kind ("A → B isobaric, B → C isothermal"), and where a
  // state lies in a diagram ("p = 3 p₀, V = 2 V₀")
  const kindsOf = (c) => c.segs.filter((s) => !s.closing).map((s) => `${arrow(s)} ${ADJ[s.type]()}`).join(', ');
  const at = (d, s) => { const [x, y] = AXES[d]; return `${y} = ${frac(VARS[y](s))} ${y}₀, ${x} = ${frac(VARS[x](s))} ${x}₀`; };
  const shapes = (d) => L(`In the ${dname(d)} diagram: isobaric is ${shape('isobaric', d)}, isochoric ${shape('isochoric', d)}, isothermal ${shape('isothermal', d)}.`, `Im ${dname(d)}-Diagramm: isobar ist ${shape('isobaric', d)}, isochor ${shape('isochoric', d)}, isotherm ${shape('isothermal', d)}.`);

  // ---------------------------------------------------------------- mistakes: other cycles
  // Variants of a cycle as a student might get it wrong: one step of another kind, one factor
  // upside down; each valid and different from the right one. [{ tag, cycle, why, nudge }]
  // (nudge: shown in practice while the exercise is open, in place of a why that gives the answer
  // away; the why stays for the check and once the exercise is solved)
  function variants(c) {
    const steps = c.segs.filter((s) => !s.closing).map(({ type, k, say }) => ({ type, k, say }));
    const out = [];
    steps.forEach((st, i) => {
      for (const t of TYPES.filter((x) => x !== st.type)) {
        const s2 = steps.map((x, j) => (j === i ? { ...x, type: t, say: t === 'isothermal' ? 'V' : x.say === 'p' && t === 'isobaric' ? 'V' : x.say === 'V' && t === 'isochoric' ? 'p' : x.say } : x));
        out.push({ tag: 'type', step: i, cycle: cycleOf(c.states[0], s2), why: L(`${nameOf(i)} → ${nameOf(i + 1)} is drawn ${ADJ[t]()}, but it is ${ADJ[st.type]()}.`, `${nameOf(i)} → ${nameOf(i + 1)} ist ${ADJ[t]()} gezeichnet, ist aber ${ADJ[st.type]()}.`), nudge: NUDGE.type(i) });
      }
      const s3 = steps.map((x, j) => (j === i ? { ...x, k: 1 / x.k } : x));
      out.push({ tag: 'factor', step: i, cycle: cycleOf(c.states[0], s3), why: L(`In ${nameOf(i)} → ${nameOf(i + 1)} the factor is upside down: ${describe(st)}.`, `Bei ${nameOf(i)} → ${nameOf(i + 1)} ist der Faktor umgekehrt: ${describe(st)}.`), nudge: NUDGE.factor(i) });
    });
    return out.filter((v) => valid(v.cycle) && !sameCycle(v.cycle, c));
  }
  // nudges in place of a why that gives the answer away (see variants)
  const NUDGE = {
    type: (i) => L(`Check ${nameOf(i)} → ${nameOf(i + 1)}: what kind of process is it, and what shape does that have in this diagram?`, `Prüfe ${nameOf(i)} → ${nameOf(i + 1)}: Welche Art von Prozess ist das, und welche Form hat er in diesem Diagramm?`),
    factor: (i) => L(`Check ${nameOf(i)} → ${nameOf(i + 1)}: by what factor does it change, and which way?`, `Prüfe ${nameOf(i)} → ${nameOf(i + 1)}: Um welchen Faktor ändert sich die Grösse, und in welche Richtung?`),
    reverse: () => L('Check the direction of the arrows: in which order does the cycle run through the states?', 'Prüfe die Richtung der Pfeile: In welcher Reihenfolge durchläuft der Kreisprozess die Zustände?'),
    shape: () => L('Check the shape of each line: what does an isotherm look like in the p(V) diagram?', 'Prüfe die Form jeder Linie: Wie sieht eine Isotherme im p(V)-Diagramm aus?'),
    back: () => L('Check the direction: going from D to A, which of p, V and T rise, and which fall?', 'Prüfe die Richtung: Welche von p, V und T steigen von D nach A, und welche sinken?'),
  };
  const sameCycle = (a, b) => a.states.length === b.states.length && a.states.every((s, i) => same(s, b.states[i]));

  // ---------------------------------------------------------------- the exercises
  const ok = (html, why = '') => ({ html, ok: true, why });
  const no = (html, why, tag, nudge) => ({ html, ok: false, why, tag, ...(nudge ? { nudge } : {}) });

  // 1 description → diagram: four diagrams of the same kind, one right.
  function match(r, o = {}) {
    const d = o.diagram || r.pick(DIAGRAMS);
    for (let tries = 0; ; tries++) {
      const e = matchOnce(r, d);
      if (e.questions[0].options.length === 4 || tries > 50) return e;
    }
  }
  // 1b the same with diagrams of different kinds side by side (two of one kind, one each of the
  // others): the right cycle in one of them, three wrong ones in the others.
  function matchMix(r) {
    for (let tries = 0; ; tries++) {
      const e = matchMixOnce(r);
      if (e.questions[0].options.length === 4 || tries > 50) return e;
    }
  }
  function matchMixOnce(r) {
    const c = randomCycle(r, 3);
    const slots = r.shuffle([r.pick(DIAGRAMS), ...DIAGRAMS]), d = slots.shift();
    const opts = [{ ok: true, fig: { cycle: c, diagram: d }, why: '' }];
    const pool = r.shuffle(variants(c));
    const iso = c.segs.findIndex((s) => s.type === 'isothermal');
    if (iso >= 0 && slots.includes('pV')) pool.unshift({ tag: 'shape', cycle: c, straight: iso, why: L(`${arrow(c.segs[iso])} is isothermal: in the p(V) diagram it is a hyperbola (p ∝ 1/V), not a straight line.`, `${arrow(c.segs[iso])} ist isotherm: Im p(V)-Diagramm ist das eine Hyperbel (p ∝ 1/V), keine Gerade.`), nudge: NUDGE.shape() });
    pool.splice(Math.min(pool.length, 2), 0, { tag: 'reverse', cycle: c, reverse: true, why: L('The arrows point the wrong way: the cycle runs A → B → C → D → A.', 'Die Pfeile zeigen in die falsche Richtung: Der Kreisprozess läuft A → B → C → D → A.'), nudge: NUDGE.reverse() });
    const used = new Set();
    for (const v of pool) {
      if (!slots.length) break;
      const key = `${v.tag === 'reverse' ? 'rev' : ''}${v.straight != null ? 'str' : ''}${JSON.stringify(v.cycle.states)}`;
      if (used.has(key) || (v.tag !== 'reverse' && v.straight == null && sameCycle(v.cycle, c))) continue;
      // a straight isotherm only makes sense in p(V)
      const k = v.straight != null ? slots.indexOf('pV') : 0;
      if (k < 0) continue;
      used.add(key);
      const [dv] = slots.splice(k, 1);
      opts.push({ ok: false, tag: v.tag, fig: { cycle: v.cycle, diagram: dv, reverse: v.reverse, straight: v.straight }, why: v.why, nudge: v.nudge });
    }
    const options = r.shuffle(opts);
    return {
      kind: 'match', diagram: d, mixed: true, cycle: c, difficulty: 4,
      text: L(`A fixed amount of an ideal gas runs through a cyclic process: <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>from D straight back to A</li></ul> The diagrams are of different kinds. Which one shows the process?`,
        `Eine feste Menge eines idealen Gases durchläuft einen Kreisprozess: <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>von D direkt zurück nach A</li></ul> Die Diagramme sind von verschiedener Art. Welches zeigt den Prozess?`),
      questions: [{ type: 'pick', key: 'fig', options }],
      hints: [
        L(`Here the steps are ${kindsOf(c)}, then D straight back to A. First read the axes of the four diagrams: which is a p(V), a p(T) or a V(T) diagram?`, `Hier sind die Schritte ${kindsOf(c)}, dann D direkt zurück nach A. Lies zuerst die Achsen der vier Diagramme: Welches ist ein p(V)-, ein p(T)- oder ein V(T)-Diagramm?`),
        L(`Isobaric is ${shape('isobaric', 'pV')} in p(V), ${shape('isobaric', 'pT')} in p(T) and ${shape('isobaric', 'VT')} in V(T); isochoric is ${shape('isochoric', 'pV')}, ${shape('isochoric', 'pT')} and ${shape('isochoric', 'VT')}; isothermal ${shape('isothermal', 'pV')}, ${shape('isothermal', 'pT')} and ${shape('isothermal', 'VT')}.`,
          `Isobar ist im p(V)-Diagramm ${shape('isobaric', 'pV')}, im p(T)-Diagramm ${shape('isobaric', 'pT')} und im V(T)-Diagramm ${shape('isobaric', 'VT')}; isochor ${shape('isochoric', 'pV')}, ${shape('isochoric', 'pT')} und ${shape('isochoric', 'VT')}; isotherm ${shape('isothermal', 'pV')}, ${shape('isothermal', 'pT')} und ${shape('isothermal', 'VT')}.`),
        L(`Start with A → B, ${describe(c.segs[0])}: in each diagram, does the first step have that shape, go the right way, and change by that factor?`, `Beginne mit A → B, ${describe(c.segs[0])}: Hat der erste Schritt in jedem Diagramm diese Form, geht er in die richtige Richtung und um diesen Faktor?`),
        L(`${ruleT()} In the diagrams with a T axis, work out from p and V how T changes in A → B, then in the next steps.`, `${ruleT()} In den Diagrammen mit einer T-Achse bestimme aus p und V, wie sich T bei A → B ändert, dann bei den nächsten Schritten.`),
      ],
      solution: c.segs.map((s) => summary(c, s)),
      p: { kind: 'match', d: 'mix', s: c.states },
    };
  }
  function matchOnce(r, d) {
    const c = randomCycle(r, 3);
    const opts = [{ ok: true, fig: { cycle: c, diagram: d }, why: '' }];
    const pool = r.shuffle(variants(c));
    // an isotherm drawn straight in p(V), and the cycle run backwards
    const iso = c.segs.findIndex((s) => s.type === 'isothermal');
    if (d === 'pV' && iso >= 0) pool.unshift({ tag: 'shape', cycle: c, straight: iso, why: L(`${arrow(c.segs[iso])} is isothermal: in the p(V) diagram it is a hyperbola (p ∝ 1/V), not a straight line.`, `${arrow(c.segs[iso])} ist isotherm: Im p(V)-Diagramm ist das eine Hyperbel (p ∝ 1/V), keine Gerade.`), nudge: NUDGE.shape() });
    pool.splice(Math.min(pool.length, 2), 0, { tag: 'reverse', cycle: c, reverse: true, why: L('The arrows point the wrong way: the cycle runs A → B → C → D → A.', 'Die Pfeile zeigen in die falsche Richtung: Der Kreisprozess läuft A → B → C → D → A.'), nudge: NUDGE.reverse() });
    const used = new Set();
    for (const v of pool) {
      if (opts.length === 4) break;
      const key = `${v.tag === 'reverse' ? 'rev' : ''}${v.straight != null ? 'str' : ''}${JSON.stringify(v.cycle.states)}`;
      if (used.has(key) || (v.tag !== 'reverse' && v.straight == null && sameCycle(v.cycle, c))) continue;
      used.add(key);
      opts.push({ ok: false, tag: v.tag, fig: { cycle: v.cycle, diagram: d, reverse: v.reverse, straight: v.straight }, why: v.why, nudge: v.nudge });
    }
    const options = r.shuffle(opts);
    return {
      kind: 'match', diagram: d, cycle: c, difficulty: d === 'pV' ? 2 : 3,
      text: L(`A fixed amount of an ideal gas runs through a cyclic process: <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>from D straight back to A</li></ul> Which ${dname(d)} diagram shows it?`,
        `Eine feste Menge eines idealen Gases durchläuft einen Kreisprozess: <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>von D direkt zurück nach A</li></ul> Welches ${dname(d)}-Diagramm zeigt ihn?`),
      questions: [{ type: 'pick', key: 'fig', options }],
      hints: [
        L(`Here the steps are ${kindsOf(c)}, then D straight back to A. Which quantity stays the same in each, and which changes by which factor?`, `Hier sind die Schritte ${kindsOf(c)}, dann D direkt zurück nach A. Welche Grösse bleibt bei jedem gleich, und welche ändert sich um welchen Faktor?`),
        `${shapes(d)}${d === 'pV' ? '' : ` ${ruleT()}`}`,
        L(`Start with A → B, ${describe(c.segs[0])}: which diagrams have a first step of that shape, in that direction and by that factor? Then check B → C in those.`, `Beginne mit A → B, ${describe(c.segs[0])}: Welche Diagramme haben einen ersten Schritt mit dieser Form, in diese Richtung und um diesen Faktor? Prüfe dann bei diesen B → C.`),
      ],
      solution: c.segs.map((s) => summary(c, s)),
      p: { kind: 'match', d, s: c.states },
    };
  }

  // The step back to A described: "isochoric heating", "neither: p and V both rise".
  function closingWords(c, seg) {
    const a = c.states[seg.from], b = c.states[seg.to];
    if (seg.type === 'general') {
      const ch = (v) => ({ up: L('rises', 'steigt'), down: L('falls', 'sinkt'), same: L('stays', 'bleibt') }[change(v, a, b)]);
      return L(`none of the three: p ${ch('p')}, V ${ch('V')} and T ${ch('T')}`, `keiner der drei: p ${ch('p')}, V ${ch('V')} und T ${ch('T')}`);
    }
    const v = seg.type === 'isochoric' ? 'p' : 'V', dir = change(v === 'p' ? 'T' : 'V', a, b) === 'up' ? 'up' : 'down';
    return `${ADJ_F[seg.type]()} ${NOUN[dir][seg.type === 'isochoric' ? 'T' : 'V']()}`;
  }
  // 4 the step back: three steps described (and drawn), how is D → A best described?
  function close(r, o = {}) {
    const d = o.diagram || r.pick(DIAGRAMS), c = randomCycle(r, 3, { general: r.next() < 0.3 }), back = c.segs[c.segs.length - 1];
    const right = closingWords(c, back), a = c.states[back.from], b = c.states[back.to];
    const opts = [ok(right)];
    // the same kind the other way, the other kinds, and "none of the three"
    const words = new Set([right]);
    const add = (html, why, tag, nudge) => { if (!words.has(html) && opts.length < 4) { words.add(html); opts.push(no(html, why, tag, nudge)); } };
    const why = summary(c, back);
    if (back.type !== 'general') {
      const flipped = { ...back, from: back.to, to: back.from };
      add(closingWords({ states: c.states }, flipped), `${L('The other way round.', 'Umgekehrt.')} ${why}`, 'reverse', NUDGE.back());
    }
    for (const t of r.shuffle(TYPES.filter((x) => x !== back.type))) {
      for (const dir of r.shuffle(['up', 'down'])) add(`${ADJ_F[t]()} ${NOUN[dir][t === 'isochoric' ? 'T' : 'V']()}`, why, 'type');
    }
    if (back.type !== 'general') add(L(`none of the three: p ${change('p', a, b) === 'up' ? 'falls' : 'rises'} and V ${change('V', a, b) === 'up' ? 'falls' : 'rises'}`, `keiner der drei: p ${change('p', a, b) === 'up' ? 'sinkt' : 'steigt'} und V ${change('V', a, b) === 'up' ? 'sinkt' : 'steigt'}`), why, 'general');
    return {
      kind: 'close', diagram: d, cycle: c, difficulty: 3,
      text: L(`A fixed amount of an ideal gas runs through the steps <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}</ul> and then straight back from D to A. The diagram shows the first three steps. How is the step D → A best described?`,
        `Eine feste Menge eines idealen Gases durchläuft die Schritte <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}</ul> und dann direkt von D zurück nach A. Das Diagramm zeigt die ersten drei Schritte. Wie lässt sich der Schritt D → A am besten beschreiben?`),
      questions: [{ type: 'choice', key: 'back', label: 'D → A', options: r.shuffle(opts).map((x) => ({ ...x, label: x.html })) }],
      hints: [
        L(`A is at ${at(d, c.states[0])}. Read off D in the ${dname(d)} diagram, or follow the three steps from A: from D to A, which of p, V and T stay the same, which grow, which shrink?`,
          `A liegt bei ${at(d, c.states[0])}. Lies D im ${dname(d)}-Diagramm ab oder folge den drei Schritten ab A: Welche von p, V und T bleiben von D nach A gleich, welche wachsen, welche nehmen ab?`),
        L('Same p: isobaric; same V: isochoric; same T = pV (in units of T₀): isothermal; else none of them. Then the direction from D to A: does V grow (expansion) or shrink, or, at constant V, does T rise (heating) or fall?',
          'Gleiches p: isobar; gleiches V: isochor; gleiches T = pV (in Einheiten von T₀): isotherm; sonst keiner davon. Dann die Richtung von D nach A: Wächst V (Expansion) oder nimmt es ab, oder, bei konstantem V, steigt T (Erwärmung) oder sinkt es?'),
      ],
      solution: [summary(c, back)],
      p: { kind: 'close', d, s: c.states },
    };
  }

  // 2 diagram → statements: five statements on the cycle shown, between one and four true.
  function statementPool(c, r) {
    const pool = [], segs = c.segs, n = c.states.length;
    const add = (html, truth, why, topic) => pool.push({ html, ok: truth, why, topic });
    for (const s of segs) {
      const a = c.states[s.from], b = c.states[s.to], why = summary(c, s);
      // the kind of process: the right one, and a wrong one
      if (s.type !== 'general') add(L(`${arrow(s)} is ${ADJ[s.type]()}.`, `${arrow(s)} ist ${ADJ[s.type]()}.`), true, why, `kind${s.from}`);
      const wrong = r.pick(TYPES.filter((t) => t !== s.type));
      add(L(`${arrow(s)} is ${ADJ[wrong]()}.`, `${arrow(s)} ist ${ADJ[wrong]()}.`), false, why, `kind${s.from}`);
      // how p, V or T change
      for (const v of ['p', 'V', 'T']) {
        const ch = change(v, a, b);
        add(L(`In ${arrow(s)}, ${CHANGE[ch][v]()}.`, `Bei ${arrow(s)} ${verbFirst(CHANGE[ch][v]())}.`), true, why, `chg${s.from}${v}`);
        const other = r.pick(['up', 'down', 'same'].filter((x) => x !== ch));
        add(L(`In ${arrow(s)}, ${CHANGE[other][v]()}.`, `Bei ${arrow(s)} ${verbFirst(CHANGE[other][v]())}.`), false, why, `chg${s.from}${v}`);
      }
      // by what factor
      const v = r.pick(['p', 'V', 'T'].filter((x) => change(x, a, b) !== 'same'));
      if (v) {
        const k = VARS[v](b) / VARS[v](a), wrongK = r.pick([1 / k, k * 2, k / 2].filter((x) => !eq(x, k) && !eq(x, 1)));
        const say = (kk) => L(`In ${arrow(s)}, the ${QTY[v]()} ${grows(kk).en}.`, `Bei ${arrow(s)} ${grows(kk).de} ${v === 'p' ? 'der Druck' : v === 'V' ? 'das Volumen' : 'die Temperatur'}${grows(kk).deEnd}.`);
        add(say(k), true, why, `chg${s.from}${v}`);
        add(say(wrongK), false, why, `chg${s.from}${v}`);
      }
    }
    // extremes and comparisons
    for (const v of ['p', 'V', 'T']) {
      const vals = c.states.map(VARS[v]), max = Math.max(...vals), at = vals.findIndex((x) => eq(x, max));
      if (vals.filter((x) => eq(x, max)).length === 1) {
        const why = L(`${QTY[v]()[0].toUpperCase() + QTY[v]().slice(1)} in the states: ${c.states.map((s, i) => `${nameOf(i)}: ${frac(VARS[v](s))}`).join(', ')} (in units of ${v}₀)${v === 'T' ? `. ${ruleT()}` : '.'}`, `${QTY[v]()} in den Zuständen: ${c.states.map((s, i) => `${nameOf(i)}: ${frac(VARS[v](s))}`).join(', ')} (in Einheiten von ${v}₀)${v === 'T' ? `. ${ruleT()}` : '.'}`);
        add(L(`The ${QTY[v]()} is highest in ${nameOf(at)}.`, `${v === 'p' ? 'Der Druck' : v === 'V' ? 'Das Volumen' : 'Die Temperatur'} ist in ${nameOf(at)} am grössten.`), true, why, `max${v}`);
        const other = r.pick(c.states.map((x, i) => i).filter((i) => i !== at));
        add(L(`The ${QTY[v]()} is highest in ${nameOf(other)}.`, `${v === 'p' ? 'Der Druck' : v === 'V' ? 'Das Volumen' : 'Die Temperatur'} ist in ${nameOf(other)} am grössten.`), false, why, `max${v}`);
      }
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          const truth = eq(VARS[v](c.states[i]), VARS[v](c.states[j]));
          const why = L(`${nameOf(i)}: ${v} = ${frac(VARS[v](c.states[i]))} ${v}₀, ${nameOf(j)}: ${v} = ${frac(VARS[v](c.states[j]))} ${v}₀.`, `${nameOf(i)}: ${v} = ${frac(VARS[v](c.states[i]))} ${v}₀, ${nameOf(j)}: ${v} = ${frac(VARS[v](c.states[j]))} ${v}₀.`);
          add(L(`The ${QTY[v]()} in ${nameOf(i)} is the same as in ${nameOf(j)}.`, `${v === 'p' ? 'Der Druck' : v === 'V' ? 'Das Volumen' : 'Die Temperatur'} in ${nameOf(i)} ist gleich wie in ${nameOf(j)}.`), truth, why, `eq${v}${i}${j}`);
        }
      }
    }
    return pool;
  }
  // German: "der Druck steigt" → "steigt der Druck" after "Bei A → B"
  function verbFirst(s) {
    const m = /^(der Druck|das Volumen|die Temperatur) (\S+)(.*)$/.exec(s);
    return m ? `${m[2]} ${m[1]}${m[3]}` : s;
  }
  function statements(r, o = {}) {
    const d = o.diagram || r.pick(DIAGRAMS), c = randomCycle(r, r.next() < 0.5 ? 3 : 2, { standard: true });
    const pool = r.shuffle(statementPool(c, r)), nTrue = r.int(1, 4), picked = [];
    // no two statements on the same thing (a segment's kind, a quantity in a segment, …)
    const topic = (s) => s.topic, topics = new Set();
    for (const want of [true, false]) {
      for (const s of pool) {
        if (picked.filter((x) => x.ok === want).length >= (want ? nTrue : 5 - nTrue)) break;
        if (s.ok !== want || topics.has(topic(s))) continue;
        topics.add(topic(s));
        picked.push(s);
      }
    }
    return {
      kind: 'statements', diagram: d, cycle: c, difficulty: d === 'pV' ? 2 : 3,
      text: L(`The ${dname(d)} diagram shows a cyclic process of a fixed amount of an ideal gas. Which statements are correct? Tick all of them.`, `Das ${dname(d)}-Diagramm zeigt einen Kreisprozess einer festen Menge eines idealen Gases. Welche Aussagen sind richtig? Kreuze alle an.`),
      questions: [{ type: 'multi', key: 'st', statements: r.shuffle(picked) }],
      hints: [
        L(`The cycle has ${c.segs.length} steps, ${c.segs.map(arrow).join(', ')}. ${shapes(d)} What kind is each step here?`, `Der Kreisprozess hat ${c.segs.length} Schritte, ${c.segs.map(arrow).join(', ')}. ${shapes(d)} Welche Art ist jeder Schritt hier?`),
        L(`Write down ${AXES[d][1]} and ${AXES[d][0]} of A, B, … by counting the ticks${d === 'pV' ? ', and T ∝ pV for the temperature.' : `, and the third quantity from ${ruleT()}`} Then check each statement against these values, starting with the first one.`,
          `Schreib ${AXES[d][1]} und ${AXES[d][0]} von A, B, … auf, indem du die Teilstriche zählst${d === 'pV' ? ', und T ∝ pV für die Temperatur.' : `, und die dritte Grösse aus ${ruleT()}`} Prüfe dann jede Aussage an diesen Werten, beginnend mit der ersten.`),
      ],
      solution: c.segs.map((s) => summary(c, s)),
      p: { kind: 'statements', d, s: c.states },
    };
  }

  // 3 switching diagrams: the cycle in one diagram, which diagram shows it in another?
  function switchEx(r, o = {}) {
    const from = o.from || r.pick(DIAGRAMS), to = o.to || r.pick(DIAGRAMS.filter((x) => x !== from));
    for (let tries = 0; ; tries++) {
      const e = switchOnce(r, from, to);
      if (e.questions[0].options.length === 4 || tries > 50) return e;
    }
  }
  function switchOnce(r, from, to) {
    const c = randomCycle(r, r.next() < 0.6 ? 3 : 2, { standard: true });
    // the given cycle's steps, as variants of a description
    const opts = [{ ok: true, fig: { cycle: c, diagram: to }, why: '' }];
    const pool = [
      { tag: 'copy', fig: { cycle: c, diagram: to, copyFrom: from }, why: L(`That is the ${dname(from)} diagram with other names on the axes: each process has a different shape in the ${dname(to)} diagram.`, `Das ist das ${dname(from)}-Diagramm mit anderen Namen an den Achsen: Jeder Prozess hat im ${dname(to)}-Diagramm eine andere Form.`) },
      { tag: 'reverse', fig: { cycle: c, diagram: to, reverse: true }, why: L('The arrows point the wrong way.', 'Die Pfeile zeigen in die falsche Richtung.'), nudge: NUDGE.reverse() },
      ...r.shuffle(variants(c)).map((v) => ({ tag: v.tag, fig: { cycle: v.cycle, diagram: to }, why: v.why, nudge: v.nudge })),
    ];
    // a copy is no mistake where it happens to look the same (e.g. p(V) → p(T) with only isobars)
    for (const v of pool) if (opts.length < 4 && !(v.tag === 'copy' && copyLooksRight(c, from, to))) opts.push({ ok: false, ...v });
    return {
      kind: 'switch', diagram: from, to, cycle: c, difficulty: 4,
      text: L(`The ${dname(from)} diagram shows a cyclic process of a fixed amount of an ideal gas. Which ${dname(to)} diagram shows the same process?`, `Das ${dname(from)}-Diagramm zeigt einen Kreisprozess einer festen Menge eines idealen Gases. Welches ${dname(to)}-Diagramm zeigt denselben Prozess?`),
      questions: [{ type: 'pick', key: 'fig', options: r.shuffle(opts) }],
      hints: [
        L(`The ${dname(from)} diagram shows ${c.segs.map(arrow).join(', ')}. Name each step from it: in the ${dname(from)} diagram, isobaric is ${shape('isobaric', from)}, isochoric ${shape('isochoric', from)}, isothermal ${shape('isothermal', from)}. Which way does each go?`,
          `Das ${dname(from)}-Diagramm zeigt ${c.segs.map(arrow).join(', ')}. Benenne daraus jeden Schritt: Im ${dname(from)}-Diagramm ist isobar ${shape('isobaric', from)}, isochor ${shape('isochoric', from)}, isotherm ${shape('isothermal', from)}. In welche Richtung geht jeder?`),
        L(`Then each step keeps its kind, but takes the shape of the ${dname(to)} diagram: isobaric is ${shape('isobaric', to)} there, isochoric ${shape('isochoric', to)}, isothermal ${shape('isothermal', to)}. ${ruleT()}`,
          `Dann behält jeder Schritt seine Art, nimmt aber die Form im ${dname(to)}-Diagramm an: Isobar ist dort ${shape('isobaric', to)}, isochor ${shape('isochoric', to)}, isotherm ${shape('isothermal', to)}. ${ruleT()}`),
        L(`Start with A, at ${at(from, c.states[0])}: where does it lie in the ${dname(to)} diagram, and which options start A → B there with the right shape?`,
          `Beginne mit A, bei ${at(from, c.states[0])}: Wo liegt es im ${dname(to)}-Diagramm, und welche Optionen beginnen dort A → B mit der richtigen Form?`),
      ],
      solution: c.segs.map((s) => summary(c, s)),
      p: { kind: 'switch', from, to, s: c.states },
    };
  }
  // whether copying the shape from one diagram to the other happens to give the right picture
  function copyLooksRight(c, from, to) {
    const ax1 = axesFor(from, c.states), ax2 = axesFor(to, c.states);
    return c.states.every((s) => { const [x1, y1] = coord(from, s), [x2, y2] = coord(to, s); return eq(x1 / ax1.x.max, x2 / ax2.x.max) && eq(y1 / ax1.y.max, y2 / ax2.y.max); });
  }

  // 5 which line is which: four lines, two of one kind; their kinds, and which of the two has the
  // larger value.
  function lines(r, o = {}) {
    const d = o.diagram || r.pick(DIAGRAMS), pair = r.pick(TYPES), others = TYPES.filter((t) => t !== pair);
    const v = { isobaric: 'p', isochoric: 'V', isothermal: 'T' };
    const cs = r.shuffle([2, 3, 4, 5, 6]).slice(0, 2).sort((a, b) => a - b).map((x) => (pair === 'isothermal' ? 2 * x : x));
    const ls = [{ type: pair, c: cs[0] }, { type: pair, c: cs[1] }, ...others.map((t) => ({ type: t, c: t === 'isothermal' ? 2 * r.int(2, 5) : r.int(2, 5) }))];
    const order = r.shuffle(ls.map((x, i) => i)), numbered = order.map((i) => ls[i]);
    const a = numbered.findIndex((x) => x === ls[0]) + 1, b = numbered.findIndex((x) => x === ls[1]) + 1;
    const kinds = { isobaric: () => L('isobar', 'Isobare'), isochoric: () => L('isochore', 'Isochore'), isothermal: () => L('isotherm', 'Isotherme') };
    const typeQ = numbered.map((ln, i) => ({
      type: 'choice', key: `l${i + 1}`, label: L(`line ${i + 1}`, `Linie ${i + 1}`),
      options: TYPES.map((t) => ({ label: kinds[t](), ok: t === ln.type, why: L(`In the ${dname(d)} diagram, ${kinds[t]()}s are ${shape(t, d)}: does line ${i + 1} look like that?`, `Im ${dname(d)}-Diagramm sind ${kinds[t]()}n ${shape(t, d)}: Sieht Linie ${i + 1} so aus?`) })),
    }));
    const bigger = a < b ? [a, b] : [b, a], hi = numbered[bigger[1] - 1].c > numbered[bigger[0] - 1].c ? bigger[1] : bigger[0];
    const qv = v[pair], why = orderWhy(pair, d);
    // for the hint: two vertical lines are compared at the same value of the vertical axis, others at the same value of the horizontal one
    const cut = AXES[d][shape(pair, d) === shape('isochoric', 'pV') ? 1 : 0];
    // asked only once the kinds are right: it names the kind of two lines
    const orderQ = {
      type: 'choice', key: 'order', after: true, label: L(`Lines ${bigger[0]} and ${bigger[1]} are both ${kinds[pair]()}s: which has the larger ${QTY[qv]()}?`, `Die Linien ${bigger[0]} und ${bigger[1]} sind beide ${kinds[pair]()}n: Welche hat ${qv === 'p' ? 'den grösseren Druck' : qv === 'V' ? 'das grössere Volumen' : 'die grössere Temperatur'}?`),
      options: bigger.map((k) => ({ label: L(`line ${k}`, `Linie ${k}`), ok: k === hi, why })),
    };
    return {
      kind: 'lines', diagram: d, lines: numbered, difficulty: d === 'pV' ? 1 : 2,
      text: L(`The ${dname(d)} diagram shows four lines, each an isobar (constant p), an isochore (constant V) or an isotherm (constant T) of a fixed amount of an ideal gas. Which is which?`, `Das ${dname(d)}-Diagramm zeigt vier Linien, jede eine Isobare (p konstant), eine Isochore (V konstant) oder eine Isotherme (T konstant) einer festen Menge eines idealen Gases. Welche ist welche?`),
      questions: [...typeQ, orderQ],
      hints: [
        L(`Here ${AXES[d][1]} is up and ${AXES[d][0]} to the right. For each of the lines 1 to 4: is it horizontal, vertical, a line through the origin or a curve, and which quantity stays the same along it?`,
          `Hier ist ${AXES[d][1]} nach oben und ${AXES[d][0]} nach rechts aufgetragen. Für jede der Linien 1 bis 4: Ist sie waagrecht, senkrecht, eine Gerade durch den Ursprung oder eine Kurve, und welche Grösse bleibt entlang der Linie gleich?`),
        L(`Along a horizontal line ${AXES[d][1]} stays the same, along a vertical one ${AXES[d][0]}. For the third quantity, ${['p', 'V', 'T'].find((x) => !AXES[d].includes(x))}, use pV ∝ T: what shape does a line have along which it stays the same?`,
          `Entlang einer waagrechten Linie bleibt ${AXES[d][1]} gleich, entlang einer senkrechten ${AXES[d][0]}. Für die dritte Grösse, ${['p', 'V', 'T'].find((x) => !AXES[d].includes(x))}, nimm pV ∝ T: Welche Form hat eine Linie, entlang der sie gleich bleibt?`),
        L(`Start with line 1. For the last question, compare the two lines of the same kind at the same ${cut}: which value of the constant quantity does each give there?`,
          `Beginne mit Linie 1. Für die letzte Frage vergleiche die zwei Linien derselben Art beim gleichen ${cut}: Welchen Wert der konstanten Grösse gibt jede dort?`),
      ],
      solution: [L(`In the ${dname(d)} diagram: isobars are ${shape('isobaric', d)}, isochores ${shape('isochoric', d)}, isotherms ${shape('isothermal', d)}.`, `Im ${dname(d)}-Diagramm: Isobaren sind ${shape('isobaric', d)}, Isochoren ${shape('isochoric', d)}, Isothermen ${shape('isothermal', d)}.`), why],
      p: { kind: 'lines', d, ls: numbered },
    };
  }
  function orderWhy(type, d) {
    const W = {
      pV: { isobaric: L('The higher horizontal line has the larger pressure.', 'Die höhere waagrechte Linie hat den grösseren Druck.'), isochoric: L('The vertical line further right has the larger volume.', 'Die senkrechte Linie weiter rechts hat das grössere Volumen.'), isothermal: L('pV ∝ T: the hyperbola further out (larger pV) has the larger temperature.', 'pV ∝ T: Die Hyperbel weiter aussen (grösseres pV) hat die grössere Temperatur.') },
      pT: { isobaric: L('The higher horizontal line has the larger pressure.', 'Die höhere waagrechte Linie hat den grösseren Druck.'), isochoric: L('p = (nR/V)·T: the steeper line has the smaller volume, so the flatter one the larger.', 'p = (nR/V)·T: Die steilere Gerade hat das kleinere Volumen, die flachere also das grössere.'), isothermal: L('The vertical line further right has the larger temperature.', 'Die senkrechte Linie weiter rechts hat die grössere Temperatur.') },
      VT: { isobaric: L('V = (nR/p)·T: the steeper line has the smaller pressure, so the flatter one the larger.', 'V = (nR/p)·T: Die steilere Gerade hat den kleineren Druck, die flachere also den grösseren.'), isochoric: L('The higher horizontal line has the larger volume.', 'Die höhere waagrechte Linie hat das grössere Volumen.'), isothermal: L('The vertical line further right has the larger temperature.', 'Die senkrechte Linie weiter rechts hat die grössere Temperatur.') },
    };
    return W[d][type];
  }

  // 6 draw it: the states one by one on the grid of a diagram, then the step back.
  function draw(r, o = {}) {
    const d = o.diagram || r.pick(DIAGRAMS);
    const c = randomCycle(r, 3, { standard: r.next() < 0.7, fits: (cc) => axesFor(d, cc.states).onTicks });
    const back = c.segs[c.segs.length - 1];
    return {
      kind: 'draw', diagram: d, cycle: c, ax: axesFor(d, c.states), difficulty: d === 'pV' ? 3 : 4,
      text: L(`Draw the cyclic process of a fixed amount of an ideal gas in the ${dname(d)} diagram: click where each state lies. <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>from D straight back to A</li></ul>`,
        `Zeichne den Kreisprozess einer festen Menge eines idealen Gases ins ${dname(d)}-Diagramm: Klicke dorthin, wo jeder Zustand liegt. <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>von D direkt zurück nach A</li></ul>`),
      steps: c.segs.filter((s) => !s.closing).map((s) => ({ to: s.to, html: `${nameOf(s.to)}: ${describe(s)}` })),
      questions: [{ type: 'choice', key: 'back', label: L('Finally: how is D → A best described?', 'Zum Schluss: Wie lässt sich D → A am besten beschreiben?'), after: true, options: close2(r, c, back) }],
      hints: [
        L(`A is at ${at(d, c.states[0])}${d === 'pV' ? '' : ` (T = pV in units of T₀)`}. The steps are ${kindsOf(c)}. ${shapes(d)}`, `A liegt bei ${at(d, c.states[0])}${d === 'pV' ? '' : ` (T = pV in Einheiten von T₀)`}. Die Schritte sind ${kindsOf(c)}. ${shapes(d)}`),
        L(`${ruleT()} Isobaric: V and T change by the same factor. Isochoric: p and T change by the same factor. Isothermal: p changes by the inverse factor of V.`, `${ruleT()} Isobar: V und T ändern sich um denselben Faktor. Isochor: p und T ändern sich um denselben Faktor. Isotherm: p ändert sich um den Kehrwert des Faktors von V.`),
        L(`Start with B: from A, ${describe(c.segs[0])}. Which of ${AXES[d][1]} and ${AXES[d][0]} change, and by which factor? Then go on from B in the same way.`, `Beginne mit B: von A aus ${describe(c.segs[0])}. Welche von ${AXES[d][1]} und ${AXES[d][0]} ändern sich, und um welchen Faktor? Geh dann von B aus gleich weiter.`),
      ],
      solution: c.segs.map((s) => summary(c, s)),
      p: { kind: 'draw', d, s: c.states },
    };
  }
  // the options for the step back (as in close)
  function close2(r, c, back) {
    const right = closingWords(c, back), a = c.states[back.from], b = c.states[back.to], why = summary(c, back);
    const opts = [{ label: right, ok: true, why }], seen = new Set([right]);
    const add = (label, tag) => { if (!seen.has(label) && opts.length < 4) { seen.add(label); opts.push({ label, ok: false, why, tag }); } };
    if (back.type !== 'general') add(closingWords({ states: c.states }, { ...back, from: back.to, to: back.from }), 'reverse');
    for (const t of r.shuffle(TYPES.filter((x) => x !== back.type))) for (const dir of r.shuffle(['up', 'down'])) add(`${ADJ_F[t]()} ${NOUN[dir][t === 'isochoric' ? 'T' : 'V']()}`, 'type');
    if (back.type !== 'general') add(L(`none of the three: p ${change('p', a, b) === 'up' ? 'falls' : 'rises'} and V ${change('V', a, b) === 'up' ? 'falls' : 'rises'}`, `keiner der drei: p ${change('p', a, b) === 'up' ? 'sinkt' : 'steigt'} und V ${change('V', a, b) === 'up' ? 'sinkt' : 'steigt'}`), 'general');
    return r.shuffle(opts);
  }
  // What a click at (x, y) of diagram d would mean for the step from state a, compared with the
  // right state b: '' if right, else why not.
  function judgePoint(d, step, a, b, x, y) {
    const s = stateAt(d, x, y);
    if (same(s, b)) return '';
    if (same(s, a)) return L('That is the state the step starts from.', 'Das ist der Zustand, von dem der Schritt ausgeht.');
    const kind = classify(a, s);
    if (kind === step.type) {
      const v = step.type === 'isochoric' ? 'p' : 'V', got = VARS[v](s) / VARS[v](a);
      if (eq(got, 1 / step.k)) return L(`The right kind of process, but check the direction of the change: ${describe(step)}.`, `Die richtige Art von Prozess, aber prüfe die Richtung der Änderung: ${describe(step)}.`);
      return L(`The right kind of process, but the wrong factor: ${describe(step)}.`, `Die richtige Art von Prozess, aber der falsche Faktor: ${describe(step)}.`);
    }
    const what = kind === 'general' ? L('That point is not reached by any of the three processes from there.', 'Dieser Punkt wird von dort mit keinem der drei Prozesse erreicht.') : L(`From there that would be ${ADJ[kind]()}.`, `Von dort aus wäre das ${ADJ[kind]()}.`);
    return `${what} ${L(`This step is ${ADJ[step.type]()}: what does that look like in the ${dname(d)} diagram?`, `Dieser Schritt ist ${ADJ[step.type]()}: Wie sieht das im ${dname(d)}-Diagramm aus?`)}`;
  }

  // 7 find the error: a student's sketch of a description, with one step wrong.
  function error(r, o = {}) {
    const d = o.diagram || r.pick(DIAGRAMS);
    for (let k = 0; k < 200; k++) {
      const c = randomCycle(r, 3), steps = c.segs.filter((s) => !s.closing).map(({ type, k: f, say }) => ({ type, k: f, say }));
      const i = r.int(0, 2), st = steps[i];
      const kinds = ['type', 'factor'];
      if (d === 'pV' && st.type === 'isothermal') kinds.push('shape', 'shape');
      const m = r.pick(kinds);
      let wrong, straight = null;
      if (m === 'shape') { wrong = c; straight = i; } else {
        const s2 = steps.map((x, j) => (j === i ? (m === 'factor' ? { ...x, k: r.pick(FACTORS.filter((f) => !eq(f, x.k))) } : { ...x, type: r.pick(TYPES.filter((t) => t !== x.type)) }) : x));
        wrong = cycleOf(c.states[0], s2);
        if (!valid(wrong)) continue;
      }
      const reasons = [
        { tag: 'type', label: L('the wrong kind of process', 'die falsche Art von Prozess') },
        { tag: 'factor', label: L('the wrong factor', 'der falsche Faktor') },
        { tag: 'shape', label: L('the right states, but the wrong shape of the line', 'die richtigen Zustände, aber die falsche Form der Linie') },
      ];
      const truth = summary(c, c.segs[i]);
      const whyOf = { type: L(`It should be ${ADJ[st.type]()}: in the ${dname(d)} diagram ${shape(st.type, d)}.`, `Er müsste ${ADJ[st.type]()} sein: im ${dname(d)}-Diagramm ${shape(st.type, d)}.`), factor: L(`The kind of process is right, the factor is not: ${describe(st)}.`, `Die Art des Prozesses stimmt, der Faktor nicht: ${describe(st)}.`), shape: L('Both states are right, but an isotherm in the p(V) diagram is a hyperbola (p ∝ 1/V), not a straight line.', 'Beide Zustände stimmen, aber eine Isotherme ist im p(V)-Diagramm eine Hyperbel (p ∝ 1/V), keine Gerade.') };
      return {
        kind: 'error', diagram: d, cycle: wrong, straight, wrongStep: i, difficulty: 4,
        text: L(`A student drew this cyclic process in the ${dname(d)} diagram: <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>from D straight back to A</li></ul> One of the first three steps is wrong. Which, and what is wrong with it?`,
          `Eine Schülerin hat diesen Kreisprozess ins ${dname(d)}-Diagramm gezeichnet: <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>von D direkt zurück nach A</li></ul> Einer der ersten drei Schritte ist falsch. Welcher, und was ist daran falsch?`),
        questions: [
          { type: 'choice', key: 'step', label: L('The wrong step', 'Der falsche Schritt'), options: [0, 1, 2].map((j) => ({ label: `${nameOf(j)} → ${nameOf(j + 1)}`, ok: j === i, why: j === i ? '' : L(`${nameOf(j)} → ${nameOf(j + 1)} is drawn as described. Check each step against its description, starting from where the drawing puts its first state.`, `${nameOf(j)} → ${nameOf(j + 1)} ist wie beschrieben gezeichnet. Prüfe jeden Schritt an seiner Beschreibung, ausgehend davon, wo die Zeichnung seinen ersten Zustand hinlegt.`) })) },
          { type: 'choice', key: 'what', label: L('What is wrong', 'Was falsch ist'), options: reasons.filter((x) => x.tag !== 'shape' || d === 'pV').map((x) => ({ label: x.label, ok: x.tag === m, why: whyOf[m] })) },
        ],
        hints: [
          L(`The description says ${kindsOf(c)}. Check A → B, B → C and C → D one at a time, each from where the drawing starts it: its shape, its direction and its factor.`, `Die Beschreibung sagt ${kindsOf(c)}. Prüfe A → B, B → C und C → D einzeln, jeden von dort aus, wo die Zeichnung ihn beginnt: seine Form, seine Richtung und seinen Faktor.`),
          L(`${shapes(d)} Start with A → B, ${describe(c.segs[0])}: read off A and B in the drawing and compare.`, `${shapes(d)} Beginne mit A → B, ${describe(c.segs[0])}: Lies A und B in der Zeichnung ab und vergleiche.`),
        ],
        solution: [`${L('Wrong', 'Falsch')}: ${nameOf(i)} → ${nameOf(i + 1)}. ${whyOf[m]}`, `${L('As described', 'Wie beschrieben')}: ${truth}`],
        p: { kind: 'error', d, s: c.states, i, m },
      };
    }
    throw new Error('no error exercise');
  }

  // 8 the state table: p, V and T in A given, three of the other values asked.
  const UNIT = { p: 'kPa', V: 'L', T: 'K' };
  function table(r) {
    const c = randomCycle(r, 3, { standard: r.next() < 0.7 });
    const A = c.states[0], real = { p: r.pick([100, 120, 150, 200]) / A.p, V: r.pick([1, 1.5, 2, 3]) / A.V, T: r.pick([250, 300, 360, 400]) / T(A) };
    const val = (v, s) => VARS[v](s) * real[v];
    const nice = (x) => Number(x.toPrecision(3));
    const cells = [];
    for (let i = 1; i < c.states.length; i++) for (const v of ['p', 'V', 'T']) cells.push({ i, v });
    const asked = r.shuffle(cells).filter((x) => change(x.v, c.states[x.i - 1], c.states[x.i]) !== 'same' || r.next() < 0.3).slice(0, 3).sort((a, b) => a.i - b.i || 'pVT'.indexOf(a.v) - 'pVT'.indexOf(b.v));
    const steps = [];
    const questions = asked.map(({ i, v }) => {
      const prev = c.states[i - 1], s = c.states[i], seg = c.segs[i - 1], right = val(v, s), k = VARS[v](s) / VARS[v](prev), pv = val(v, prev);
      const step = L(`So ${v} in ${nameOf(i)} = ${frac(k)} × ${nice(pv)} ${UNIT[v]} = ${nice(right)} ${UNIT[v]}.`, `Also ${v} in ${nameOf(i)} = ${frac(k)} × ${nice(pv)} ${UNIT[v]} = ${nice(right)} ${UNIT[v]}.`);
      steps.push(step); // in the solution, so that it is not given away before
      const why = `${summary(c, seg)} ${step}`;
      const cand = [{ x: right, ok: true }, { x: pv / k, tag: 'inverse' }, { x: pv, tag: 'same' }, { x: pv * k * k, tag: 'other' }, { x: pv * 2, tag: 'other' }, { x: pv / 2, tag: 'other' }, { x: pv * 3, tag: 'other' }];
      if (v === 'T') cand.splice(1, 0, { x: (pv - 273) * k + 273, tag: 'celsius' });
      const opts = [];
      for (const cnd of cand) {
        if (opts.length === 4) break;
        const x = nice(cnd.x);
        if (x > 0 && opts.every((o) => Math.abs(Math.log(x / o.value)) > Math.log(1.08))) opts.push({ value: x, ok: !!cnd.ok, tag: cnd.tag, why: cnd.tag === 'celsius' ? L(`The factors of the gas laws hold for the absolute temperature in kelvin, not in °C. ${why}`, `Die Faktoren der Gasgesetze gelten für die absolute Temperatur in Kelvin, nicht in °C. ${why}`) : why });
      }
      return { type: 'choice', key: `${nameOf(i)}${v}`, label: `${SYM[v]}<sub>${nameOf(i)}</sub>`, options: opts.sort((a, b) => a.value - b.value).map((o) => ({ ...o, label: `${o.value} ${UNIT[v]}` })) };
    });
    return {
      kind: 'table', diagram: 'pV', cycle: c, real, difficulty: 3,
      text: L(`A fixed amount of an ideal gas starts in state A with p = ${nice(val('p', A))} kPa, V = ${nice(val('V', A))} L and T = ${nice(val('T', A))} K, and runs through <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>from D straight back to A</li></ul> Find the missing values of the table.`,
        `Eine feste Menge eines idealen Gases beginnt im Zustand A mit p = ${nice(val('p', A))} kPa, V = ${nice(val('V', A))} L und T = ${nice(val('T', A))} K und durchläuft <ul>${describeCycle(c).map((x) => `<li>${x}</li>`).join('')}<li>von D direkt zurück nach A</li></ul> Bestimme die fehlenden Werte der Tabelle.`),
      rows: c.states.map((s, i) => ({ name: nameOf(i), p: i === 0 ? nice(val('p', s)) : null, V: i === 0 ? nice(val('V', s)) : null, T: i === 0 ? nice(val('T', s)) : null })),
      asked: asked.map(({ i, v }) => `${nameOf(i)}${v}`),
      questions,
      hints: [
        L(`Asked are ${asked.map(({ i, v }) => `${v} in ${nameOf(i)}`).join(', ')}. Each state follows from the one before it, starting from A with ${nice(val('p', A))} kPa, ${nice(val('V', A))} L and ${nice(val('T', A))} K: which step leads to each asked state, and of which kind is it?`,
          `Gesucht sind ${asked.map(({ i, v }) => `${v} in ${nameOf(i)}`).join(', ')}. Jeder Zustand folgt aus dem vorherigen, ab A mit ${nice(val('p', A))} kPa, ${nice(val('V', A))} L und ${nice(val('T', A))} K: Welcher Schritt führt zu jedem gesuchten Zustand, und welcher Art ist er?`),
        L('pV/T stays the same in every state. So isobaric: p stays, V and T change by the same factor. Isochoric: V stays, p and T change by the same factor. Isothermal: T stays, p changes by the inverse factor of V. T in kelvin.',
          'pV/T bleibt in jedem Zustand gleich. Also isobar: p bleibt, V und T ändern sich um denselben Faktor. Isochor: V bleibt, p und T ändern sich um denselben Faktor. Isotherm: T bleibt, p ändert sich um den Kehrwert des Faktors von V. T in Kelvin.'),
        (() => {
          const { i, v } = asked[0], seg = c.segs[i - 1];
          return L(`Start with ${v} in ${nameOf(i)}: ${arrow(seg)} is an ${describe(seg)}. By which factor does ${v} change in this step? Multiply ${v} in ${nameOf(i - 1)}${i > 1 ? ', found from the steps before,' : ''} by it.`,
            `Beginne mit ${v} in ${nameOf(i)}: ${arrow(seg)} ist eine ${describe(seg)}. Um welchen Faktor ändert sich ${v} bei diesem Schritt? Multipliziere ${v} in ${nameOf(i - 1)}${i > 1 ? ', aus den Schritten davor bestimmt,' : ''} damit.`);
        })(),
      ],
      solution: c.segs.filter((s) => !s.closing).map((s) => summary(c, s)).concat(steps, [c.states.map((s, i) => `${nameOf(i)}: p = ${nice(val('p', s))} kPa, V = ${nice(val('V', s))} L, T = ${nice(val('T', s))} K`).join('; ')]),
      p: { kind: 'table', s: c.states, real },
    };
  }

  const EXERCISES = { match, close, statements, switch: switchEx, lines, draw, error, table };
  // An exercise of a type ('match', 'statements-pV', 'switch-VT-pV', …) and a seed.
  function generate(type, seed) {
    const r = rng(seed), [kind, a, b] = type.split('-');
    const o = kind === 'switch' ? { from: a, to: b } : { diagram: a };
    if (type === 'match-mix') return { ...matchMix(r), type, seed };
    return { ...EXERCISES[kind](r, o), type, seed };
  }

  const api = {
    rng, MAX, TYPES, FACTORS, DIAGRAMS, AXES, T, apply, classify, cycleOf, sample, valid, randomCycle, coord, stateAt, axesFor, shape, dname,
    describe, describeCycle, summary, change, frac, nameOf, variants, judgePoint, closingWords, statementPool, EXERCISES, generate, ADJ,
  };
  root.Cycles = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
