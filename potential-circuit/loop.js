// Potential in a circuit: the circuits, their potentials, the exercises, the check questions and
// the worked examples.
//
// A circuit is one loop, drawn as a rectangle with six slots, clockwise from the bottom-left corner:
// 0 the left side (upwards), 1 and 2 the top (to the right), 3 the right side (downwards), 4 and 5
// the bottom (to the left). A slot holds a wire (null) or an element:
//   { t: 'bat', V, up }       a battery; up: going clockwise, from its − to its + terminal
//   { t: 'lamp', V, n }       lamp L_n, with the voltage V across it
//   { t: 'par', V, n, I }     lamps L_n and L_n+1 in parallel (right side only), currents I = [I_n, I_n+1]
// Battery 1 is always in slot 0, its − terminal at the bottom-left corner, and the batteries
// together drive the current clockwise. The nodes 0 … 5 are the corners and the middles of the top
// and the bottom; the points A, B, … are the ends of the elements, clockwise from A, the − terminal
// of battery 1, where the potential is 0. A step is the way from one point to the next: across one
// element, or along a wire. Voltages are whole volts and currents whole multiples of 100 mA, so
// that everything can be worked out in the head.
//
// The exercises (generate(type, seed)), each { kind, type, difficulty, text, fields, hints,
// solution, results, figure(sol), p }; a field is { type: 'num', key, sym (TeX), unit, value } or
// { type: 'choice', key, label, options: [{ label, ok, why }] }:
//   pot-1, pot-2       the potentials at two points (one battery; two batteries)
//   loop-1, loop-2     the voltage across a lamp from the loop rule, and a potential
//   junction           a lamp in series with two in parallel: a current (junction rule) and the
//                      voltage across the parallel lamps (loop rule)
//   volt-1, volt-2     voltages between points (the potentials given; from the circuit)
//   error-1, error-2   a student's sketch of the potential with one wrong step: which, and why
//   sketch-1, sketch-2 the potential around the loop sketched by the student (one battery; two
//                      batteries), and sketch-eq (identical lamps, no numbers): no fields but
//                      sketch, the sketch's spec (see sketchSpec), judged by judgeSketch
// question(kind, seed) gives the check's questions (OBJECTIVES), EXAMPLES the tutor's examples.
(function (root) {
  'use strict';

  const Circuit = root.Circuit || (typeof require === 'function' ? require('./circuit.js') : null);
  const Lang = root.Lang || (typeof require === 'function' ? require('./lang.js') : null);
  const L = (en, de) => (Lang ? Lang.L(en, de) : en);

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
    const shuffle = (arr) => { const b = [...arr]; for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(next() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; };
    return { next, pick, shuffle, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)) };
  }

  // ---------------------------------------------------------------- circuits
  const W = 6, H = 3.2;
  const NODES = [[0, 0], [0, H], [W / 2, H], [W, H], [W, 0], [W / 2, 0]];
  const OUT = ['left', 'above', 'above', 'right', 'below', 'below']; // the outer side of each slot
  const AWAY = [[-1, -1], [-1, 1], [0, 1], [1, 1], [1, -1], [0, -1]]; // where a point's letter goes
  const LETTERS = 'ABCDEF';

  // the change of the potential across a slot, going clockwise (with the current)
  const jump = (el) => (!el ? 0 : el.t === 'bat' ? (el.up ? el.V : -el.V) : -el.V);

  // A circuit of six slots, with its potentials (phi at the nodes, phi[6] back at node 0), its
  // points and its steps; extra: e.g. the battery current I in mA.
  function make(slots, extra = {}) {
    let n = 0;
    for (const el of slots) if (el && el.t !== 'bat') { el.n = ++n; if (el.t === 'par') n++; }
    const phi = [0];
    for (let i = 0; i < 6; i++) phi.push(phi[i] + jump(slots[i]));
    if (phi[6] !== 0) throw new Error('the loop rule does not hold');
    const ends = new Set();
    slots.forEach((el, i) => { if (el) { ends.add(i); ends.add((i + 1) % 6); } });
    const points = [...ends].sort((a, b) => a - b).map((node, k) => ({ node, name: LETTERS[k], phi: phi[node] }));
    const steps = points.map((p, k) => {
      const to = k + 1 < points.length ? points[k + 1].node : 6, sl = [];
      for (let i = p.node; i < to; i++) sl.push(i);
      return { from: k, to: (k + 1) % points.length, slots: sl, el: sl.length === 1 ? slots[sl[0]] : null };
    });
    return { slots, phi, points, steps, ...extra };
  }
  const bat = (V, up = true) => ({ t: 'bat', V, up });
  const lamp = (V) => ({ t: 'lamp', V });
  const lampsOf = (c) => c.slots.filter((el) => el && el.t === 'lamp');
  const batteries = (c) => c.slots.filter((el) => el && el.t === 'bat');
  const against = (c) => c.slots.find((el) => el && el.t === 'bat' && !el.up);

  // n positive whole numbers that add up to total
  function split(r, total, n) {
    const cuts = r.shuffle(Array.from({ length: total - 1 }, (_, k) => k + 1)).slice(0, n - 1).sort((a, b) => a - b);
    return [...cuts, total].map((x, k) => x - (k ? cuts[k - 1] : 0));
  }
  // battery 1 in slot 0, the other elements in random slots of 1 … 5, in random order
  function place(r, els) {
    const slots = [bat(els[0])].concat([null, null, null, null, null]);
    const where = r.shuffle([1, 2, 3, 4, 5]).slice(0, els.length - 1).sort((a, b) => a - b);
    r.shuffle(els.slice(1)).forEach((el, k) => { slots[where[k]] = el; });
    return slots;
  }
  function oneBattery(r, n) {
    const V = r.pick([6, 8, 9, 10, 12]);
    return make(place(r, [V, ...split(r, V, n).map(lamp)]));
  }
  // a second battery with the first (both drive the current clockwise) or against it (the first wins)
  function twoBatteries(r, opposing) {
    const V1 = opposing ? r.pick([8, 9, 10, 12]) : r.pick([4, 6, 8, 9]);
    const V2 = r.pick(opposing ? [2, 3, 4, 5].filter((v) => V1 - v >= 4) : [2, 3, 4, 6].filter((v) => V1 + v <= 14));
    return make(place(r, [V1, bat(V2, !opposing), ...split(r, opposing ? V1 - V2 : V1 + V2, 2).map(lamp)]));
  }
  // a lamp in series with two lamps in parallel (right side), the battery current I in mA
  function branched(r) {
    const V = r.pick([6, 9, 12]), U1 = r.int(2, V - 2), I = 100 * r.int(4, 9), I2 = 100 * r.int(1, I / 100 - 1);
    const slots = [bat(V), null, null, { t: 'par', V: V - U1, I: [I2, I - I2] }, null, null];
    slots[r.pick([1, 2, 4, 5])] = lamp(U1);
    return make(slots, { I });
  }

  // ---------------------------------------------------------------- texts
  const num = (x) => String(Math.round(x * 100) / 100).replace('-', '−');
  const tv = (x) => `${Math.round(x * 100) / 100}\\,\\mathrm{V}`;
  const tma = (x) => `${x}\\,\\mathrm{mA}`;
  // English: V for the potential, ΔV for a voltage; German: φ and U
  const phi = (name) => L(`V_{\\mathrm{${name}}}`, `\\varphi_{\\mathrm{${name}}}`);
  const uxy = (a, b) => L(`\\Delta V_{\\mathrm{${a}${b}}}`, `U_{\\mathrm{${a}${b}}}`);
  const uN = (n) => L(`\\Delta V_{${n}}`, `U_{${n}}`);
  const nameOf = (c, k) => c.points[k].name;
  const stepName = (c, s) => `${nameOf(c, s.from)} → ${nameOf(c, s.to)}`;
  const lampTex = (n) => `$L_${n}$`;

  // what happens to the potential on a step
  function how(c, s) {
    const el = s.el, a = nameOf(c, s.from), b = nameOf(c, s.to);
    if (!el) return L(`${a} → ${b}, along a wire: the potential stays the same`, `${a} → ${b}, entlang eines Drahts: Das Potential bleibt gleich`);
    if (el.t === 'bat') {
      return el.up ? L(`${a} → ${b}, across the ${el.V} V battery from − to +: up by ${el.V} V`, `${a} → ${b}, über die ${el.V}-V-Batterie von − nach +: um ${el.V} V hinauf`)
        : L(`${a} → ${b}, across the ${el.V} V battery from + to −: down by ${el.V} V`, `${a} → ${b}, über die ${el.V}-V-Batterie von + nach −: um ${el.V} V hinunter`);
    }
    if (el.t === 'par') return L(`${a} → ${b}, across ${lampTex(el.n)} and ${lampTex(el.n + 1)} (in parallel, the same voltage), with the current: down by ${el.V} V`, `${a} → ${b}, über ${lampTex(el.n)} und ${lampTex(el.n + 1)} (parallel, dieselbe Spannung), mit dem Strom: um ${el.V} V hinunter`);
    return L(`${a} → ${b}, across ${lampTex(el.n)} with the current: down by ${el.V} V`, `${a} → ${b}, über ${lampTex(el.n)} mit dem Strom: um ${el.V} V hinunter`);
  }
  // a step with its result, e.g. "… : φ_C = 12 V − 5 V = 7 V"
  function stepLine(c, s) {
    const a = c.points[s.from], b = s.to ? c.points[s.to] : { name: 'A', phi: 0 }, j = s.el ? jump(s.el) : 0;
    const eq = !s.el ? `${phi(b.name)} = ${phi(a.name)} = ${tv(b.phi)}` : `${phi(b.name)} = ${tv(a.phi)} ${j > 0 ? '+' : '-'} ${tv(Math.abs(j))} = ${tv(b.phi)}`;
    return `${how(c, s)}: $${eq}$`;
  }
  const walk = (c, upTo = c.steps.length) => c.steps.slice(0, upTo).map((s) => stepLine(c, s));
  // For the hints: what lies on a step (no result), the elements met from A up to step k (all:
  // once round), and the first step as a question.
  function onStep(c, s) {
    const el = s.el;
    if (!el) return L('a wire', 'ein Draht');
    if (el.t === 'bat') return el.up ? L(`the ${el.V} V battery, from − to +`, `die ${el.V}-V-Batterie, von − nach +`) : L(`the ${el.V} V battery, from + to −`, `die ${el.V}-V-Batterie, von + nach −`);
    if (el.t === 'par') return L(`${lampTex(el.n)} and ${lampTex(el.n + 1)} in parallel`, `${lampTex(el.n)} und ${lampTex(el.n + 1)} parallel`);
    return lampTex(el.n);
  }
  const onTheWay = (c, upTo = c.steps.length) => c.steps.slice(0, upTo).map((s) => `${stepName(c, s)}: ${onStep(c, s)}`).join('; ');
  const firstStep = (c) => L(`The first step, ${stepName(c, c.steps[0])}, crosses ${onStep(c, c.steps[0])}: does the potential go up or down, and by how much?`,
    `Der erste Schritt, ${stepName(c, c.steps[0])}, geht über ${onStep(c, c.steps[0])}: Steigt oder sinkt das Potential, und um wie viel?`);
  function currentNote(c) {
    const b = batteries(c), o = against(c);
    if (b.length === 1) return L('The current flows clockwise: out of the + terminal of the battery, through the lamps and back into its − terminal.', 'Der Strom fliesst im Uhrzeigersinn: aus dem Pluspol der Batterie, durch die Lampen und zurück in ihren Minuspol.');
    if (o) return L(`The two batteries work against each other; the ${b[0].V} V battery is stronger, so the current flows clockwise, and through the ${o.V} V battery from + to −.`, `Die zwei Batterien arbeiten gegeneinander; die ${b[0].V}-V-Batterie ist stärker, also fliesst der Strom im Uhrzeigersinn, und durch die ${o.V}-V-Batterie von + nach −.`);
    return L('Both batteries drive the current clockwise.', 'Beide Batterien treiben den Strom im Uhrzeigersinn.');
  }
  const RULES = () => L('Go round from A in the direction of the current. Across a battery the potential goes up from − to + (and down from + to −), across a lamp it goes down by the voltage of the lamp, and along a wire it stays the same.',
    'Geh von A aus in Stromrichtung im Kreis herum. Über eine Batterie steigt das Potential von − nach + (und sinkt von + nach −), über eine Lampe sinkt es um die Spannung der Lampe, und entlang eines Drahts bleibt es gleich.');
  const ZERO = (c) => L(`The potential at A, the − terminal of the ${c.slots[0].V} V battery, is 0 V.`, `Das Potential in A, dem Minuspol der ${c.slots[0].V}-V-Batterie, ist 0 V.`);
  const LOOP = () => L('Going once round the loop, the potential comes back to where it started: the rises add up to the drops (loop rule).', 'Einmal im Kreis herum kommt das Potential wieder dort an, wo es begonnen hat: Die Anstiege ergeben zusammen die Abfälle (Maschenregel).');
  const back = (c) => L(`Back at A: 0 V, as it must be (loop rule: the rises, ${rises(c).join(' + ')} V, add up to the drops, ${drops(c).join(' + ')} V).`, `Zurück in A: 0 V, wie es sein muss (Maschenregel: Die Anstiege, ${rises(c).join(' + ')} V, ergeben zusammen die Abfälle, ${drops(c).join(' + ')} V).`);
  const rises = (c) => c.slots.filter((el) => el && jump(el) > 0).map((el) => el.V);
  const drops = (c) => c.slots.filter((el) => el && jump(el) < 0).map((el) => el.V);

  // ---------------------------------------------------------------- figures
  // The circuit. o: known (how many points, from A, show their potential; true: all), mark (the
  // point just found, marked), ask (the point asked for), hide (Set of 'U2', 'I3', …: values shown
  // as ?), cur (draw the current arrow I), noValues (no voltages at the lamps), bat (the label of
  // the batteries instead of their voltage).
  function draw(c, o = {}) {
    const sk = new Circuit.Sketch();
    sk.autoDots = true;
    const hide = o.hide || new Set();
    const lampLabel = (n, V) => (o.noValues ? `$L_${n}$` : `$L_${n}$: ${hide.has(`U${n}`) ? '?' : `${V} V`}`);
    const curLabel = (n, I) => `$I${n ? `_${n}` : ''}$${I == null ? '' : ` = ${hide.has(`I${n || ''}`) ? '?' : `${I} mA`}`}`;
    const dx = 0.6;
    c.slots.forEach((el, i) => {
      const p = NODES[i], q = NODES[(i + 1) % 6], side = OUT[i];
      if (!el) sk.wire(p, q);
      else if (el.t === 'bat') sk.bat(el.up ? p : q, el.up ? q : p, { l: o.bat || `${el.V} V`, ls: side });
      else if (el.t === 'lamp') sk.lamp(p, q, { l: lampLabel(el.n, el.V), ls: side });
      else {
        sk.wire([W - dx, H], [W + dx, H]).wire([W - dx, 0], [W + dx, 0]);
        sk.lamp([W - dx, H], [W - dx, 0], { l: lampLabel(el.n, el.V), ls: 'left' });
        sk.lamp([W + dx, H], [W + dx, 0], { l: lampLabel(el.n + 1, el.V), ls: 'right' });
        if (c.I) {
          sk.cur([W - dx, H], [W - dx, 0], curLabel(el.n, el.I[0]), 'left', 0.13);
          sk.cur([W + dx, H], [W + dx, 0], curLabel(el.n + 1, el.I[1]), 'right', 0.13);
        }
      }
    });
    // the current: on the first wire of the bottom or the top
    const w = [5, 4, 1, 2].find((i) => !c.slots[i]);
    if ((o.cur || c.I) && w != null) sk.cur(NODES[w], NODES[(w + 1) % 6], curLabel(0, c.I), OUT[w], 0.5);
    const par = c.slots[3] && c.slots[3].t === 'par';
    c.points.forEach((pt, k) => {
      const away = par && (pt.node === 3 || pt.node === 4) ? [0, pt.node === 3 ? 1 : -1] : AWAY[pt.node];
      const known = o.known === true || k < (o.known || 0);
      const t = known ? `${pt.name} (${num(pt.phi)} V)` : pt.name;
      const cls = k === o.mark ? 'new' : pt.name === o.ask ? 'ask' : '';
      sk.dot(NODES[pt.node]);
      const n = Math.hypot(...away), at = [NODES[pt.node][0] + 0.16 * away[0] / n, NODES[pt.node][1] + 0.16 * away[1] / n];
      sk.label(at, cls ? { t, cls } : t, away, 'lbl pt');
    });
    return `<div class="fig">${sk.toSVG('circuit')}</div>`;
  }

  // The potential around the loop, as the line of a plot from A to A: o.jumps (the change across
  // each slot; a sketch's, by default the right ones), upTo (the steps drawn), mark (a step drawn
  // in the colour of a mistake), right (also the right line, dashed). Wires are flat (or sloped,
  // in a wrong sketch), and the potential changes across the middle of an element.
  function vertices(c, jumps) {
    const v = [[0, 0]];
    let y = 0;
    c.slots.forEach((el, i) => {
      const y1 = y + jumps[i];
      if (el) v.push([i + 0.3, y], [i + 0.7, y1]);
      v.push([i + 1, y1]);
      y = y1;
    });
    return v;
  }
  const rightJumps = (c) => c.slots.map(jump);
  function plot(c, o = {}) {
    const jumps = o.jumps || rightJumps(c), mine = vertices(c, jumps), good = vertices(c, rightJumps(c));
    const nodeX = (k) => (k ? c.points[k].node : 0), endX = (st) => (st.to ? c.points[st.to].node : 6);
    const lastX = o.upTo == null ? 6 : o.upTo ? endX(c.steps[o.upTo - 1]) : 0;
    const shown = mine.filter((p) => p[0] <= lastX + 1e-9);
    const ys = [0, ...shown.map((p) => p[1]), ...good.map((p) => p[1])];
    const range = Math.max(...ys) - Math.min(...ys), step = range > 10 ? 2 : 1;
    const lo = Math.floor(Math.min(...ys) / step) * step, hi = Math.ceil(Math.max(...ys) / step) * step;
    const sx = 46, sy = Math.min(18, 190 / Math.max(1, hi - lo)), x0 = 40, y0 = 30 + (hi - lo) * sy;
    const X = (x) => (x0 + x * sx).toFixed(1), Y = (y) => (y0 - (y - lo) * sy).toFixed(1);
    const line = (pts, cls) => (pts.length > 1 ? `<polyline class="${cls}" points="${pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')}"/>` : '');
    const out = [];
    for (let y = lo; y <= hi + 1e-9; y += step) {
      out.push(`<line class="grid${y === 0 ? ' zero' : ''}" x1="${X(0)}" y1="${Y(y)}" x2="${X(6)}" y2="${Y(y)}"/>`);
      out.push(`<text class="tick" x="${x0 - 6}" y="${Y(y)}" dy="0.35em" text-anchor="end">${num(y)}</text>`);
    }
    c.points.forEach((pt) => out.push(`<line class="grid" x1="${X(pt.node)}" y1="${Y(lo)}" x2="${X(pt.node)}" y2="${Y(hi)}"/>`));
    [...c.points, { node: 6, name: 'A' }].forEach((pt) => out.push(`<text class="ptl" x="${X(pt.node)}" y="${(y0 + 16).toFixed(1)}" text-anchor="middle">${pt.name}</text>`));
    out.push(`<path class="axis" d="M${X(0)} ${Y(lo)}H${(x0 + 6 * sx + 8).toFixed(1)}M${X(0)} ${Y(lo)}V${(y0 - (hi - lo) * sy - 10).toFixed(1)}"/>`);
    out.push(`<text class="axl" x="${x0 - 8}" y="13" text-anchor="middle">${L('<tspan class="it">V</tspan> in V', '<tspan class="it">φ</tspan> in V')}</text>`);
    if (o.right) out.push(line(good, 'phi right'));
    out.push(line(shown, 'phi'));
    if (o.mark != null) {
      const s = c.steps[o.mark], a = nodeX(s.from), b = endX(s);
      out.push(line(mine.filter((p) => p[0] >= a - 1e-9 && p[0] <= b + 1e-9), 'phi bad'));
    }
    const w = x0 + 6 * sx + 16, h = y0 + 24;
    return `<div class="fig"><svg class="plot" viewBox="0 0 ${w} ${h.toFixed(0)}" width="${w}" role="img" aria-label="${L('The potential around the loop', 'Das Potential im Kreis herum')}">${out.join('')}</svg></div>`;
  }

  // ---------------------------------------------------------------- exercises
  const numField = (key, sym, unit, value) => ({ type: 'num', key, sym, unit, value });
  const pointsOf = (c) => c.points.map((p, k) => k).slice(1);

  // 1 the potentials at two points: one at the end of a wire or just after the second battery
  function pot(r, two) {
    const c = two ? twoBatteries(r, r.next() < 0.6) : oneBattery(r, r.pick([2, 3]));
    const pref = pointsOf(c).filter((k) => (two ? k > 1 && c.steps[k - 1].el && c.steps[k - 1].el.t === 'bat' : !c.steps[k - 1].el));
    const ask = pref.length ? [r.pick(pref)] : [];
    for (const k of r.shuffle(pointsOf(c))) if (ask.length < 2 && !ask.includes(k)) ask.push(k);
    ask.sort((a, b) => a - b);
    const names = ask.map((k) => nameOf(c, k));
    return {
      kind: 'pot', c, ask: names, difficulty: two ? 2 : 1,
      text: `<p>${ZERO(c)} ${L(`Find the potentials at ${names.join(' and ')}.`, `Bestimme die Potentiale in ${names.join(' und ')}.`)}</p>`,
      fields: ask.map((k) => numField(`p${nameOf(c, k)}`, phi(nameOf(c, k)), 'V', c.points[k].phi)),
      hints: [
        L(`${currentNote(c)} Walk from A (0 V) with the current to ${names[names.length - 1]}${names.length > 1 ? `, passing ${names[0]}` : ''}. On the way: ${onTheWay(c, ask[ask.length - 1])}.`, `${currentNote(c)} Geh von A (0 V) mit dem Strom bis ${names[names.length - 1]}${names.length > 1 ? `, vorbei an ${names[0]}` : ''}. Auf dem Weg: ${onTheWay(c, ask[ask.length - 1])}.`),
        RULES(),
        firstStep(c),
      ],
      solution: [currentNote(c), ...walk(c).map((x) => `${x}.`), back(c)],
      results: ask.map((k) => `$${phi(nameOf(c, k))} = ${tv(c.points[k].phi)}$`).join(', '),
      figure: (sol) => draw(c, { known: sol, cur: true, ask: sol ? null : names[0] }) + (sol ? plot(c) : ''),
      p: { slots: c.slots, ask },
    };
  }

  // 2 the voltage across a lamp from the loop rule, and the potential at its far end
  function loop(r, two) {
    const c = two ? twoBatteries(r, r.next() < 0.6) : oneBattery(r, r.pick([2, 3]));
    const u = r.pick(lampsOf(c)), s = c.steps.find((x) => x.el === u), end = s.to ? s.to : s.from;
    const eqn = `${rises(c).map(tv).join(' + ')} = ${c.slots.filter((el) => el && jump(el) < 0).map((el) => (el === u ? `${uN(u.n)}` : tv(el.V))).join(' + ')}`;
    const hide = new Set([`U${u.n}`]);
    return {
      kind: 'loop', c, difficulty: two ? 3 : 2,
      text: `<p>${ZERO(c)} ${L(`The voltage $${uN(u.n)}$ across $L_${u.n}$ is not marked. Find it, and the potential at ${nameOf(c, end)}.`, `Die Spannung $${uN(u.n)}$ an $L_${u.n}$ ist nicht angegeben. Bestimme sie und das Potential in ${nameOf(c, end)}.`)}</p>`,
      fields: [numField('U', `${uN(u.n)}`, 'V', u.V), numField(`p${nameOf(c, end)}`, phi(nameOf(c, end)), 'V', c.points[end].phi)],
      hints: [
        L(`$${uN(u.n)}$ is the one voltage not marked. Go once round the loop from A with the current: ${onTheWay(c)}. ${LOOP()}`, `$${uN(u.n)}$ ist die einzige Spannung, die nicht angegeben ist. Geh einmal mit dem Strom im Kreis herum, von A aus: ${onTheWay(c)}. ${LOOP()}`),
        L(`The rises: ${rises(c).map((v) => `${v} V`).join(' and ')}. The drops: ${lampsOf(c).map((x) => `${lampTex(x.n)} (${x === u ? `$${uN(u.n)}$` : `${x.V} V`})`).join(', ')}${against(c) ? `, and the ${against(c).V} V battery, which the current flows through from + to −` : ''}. Together the drops make up the rises.`,
          `Die Anstiege: ${rises(c).map((v) => `${v} V`).join(' und ')}. Die Abfälle: ${lampsOf(c).map((x) => `${lampTex(x.n)} (${x === u ? `$${uN(u.n)}$` : `${x.V} V`})`).join(', ')}${against(c) ? `, und die ${against(c).V}-V-Batterie, durch die der Strom von + nach − fliesst` : ''}. Zusammen ergeben die Abfälle die Anstiege.`),
        L(`Then, with $${uN(u.n)}$ known, walk from A (0 V) with the current to ${nameOf(c, end)}: up across a battery from − to +, down across a lamp and across a battery from + to −, level along a wire.`, `Dann, mit bekanntem $${uN(u.n)}$, geh von A (0 V) mit dem Strom bis ${nameOf(c, end)}: hinauf über eine Batterie von − nach +, hinunter über eine Lampe und über eine Batterie von + nach −, gleich entlang eines Drahts.`),
      ],
      solution: [`${LOOP()} $${eqn}$, ${L('so', 'also')} $${uN(u.n)} = ${tv(u.V)}$.`, ...walk(c, s.to ? c.steps.indexOf(s) + 1 : c.steps.length - 1).map((x) => `${x}.`)],
      results: `$${uN(u.n)} = ${tv(u.V)}$, $${phi(nameOf(c, end))} = ${tv(c.points[end].phi)}$`,
      figure: (sol) => draw(c, { known: sol, cur: true, hide: sol ? null : hide, ask: sol ? null : nameOf(c, end) }) + (sol ? plot(c) : ''),
      p: { slots: c.slots, u: u.n },
    };
  }

  // 3 a lamp in series with two in parallel: the unknown branch current and the parallel voltage
  function junction(r) {
    const c = branched(r), par = c.slots[3], one = c.slots.find((el) => el && el.t === 'lamp');
    const k = r.int(0, 1), n = par.n + k, m = par.n + 1 - k; // I_n asked, I_m given
    const hide = new Set([`I${n}`, `U${par.n}`, `U${par.n + 1}`]);
    const D = c.points.find((p) => p.node === 3).name, E = c.points.find((p) => p.node === 4).name;
    return {
      kind: 'junction', c, difficulty: 3,
      text: `<p>${L(`The battery drives the current $I = ${tma(c.I)}$; $I_${m} = ${tma(par.I[1 - k])}$ flows through $L_${m}$. Find $I_${n}$ and the voltage across the lamps in parallel.`, `Die Batterie treibt den Strom $I = ${tma(c.I)}$; durch $L_${m}$ fliesst $I_${m} = ${tma(par.I[1 - k])}$. Bestimme $I_${n}$ und die Spannung an den parallelen Lampen.`)}</p>`,
      fields: [numField('I', `I_${n}`, 'mA', par.I[k]), numField('U', `${uN(par.n)}`, 'V', par.V)],
      hints: [
        L(`Junction rule: at ${D} the current $I$ splits into $I_${par.n}$ and $I_${par.n + 1}$; what flows in flows out: $I = I_${par.n} + I_${par.n + 1}$. (Through $L_${one.n}$ flows all of $I$: a lamp does not use up current.)`, `Knotenregel: In ${D} teilt sich der Strom $I$ in $I_${par.n}$ und $I_${par.n + 1}$; was hineinfliesst, fliesst hinaus: $I = I_${par.n} + I_${par.n + 1}$. (Durch $L_${one.n}$ fliesst der ganze Strom $I$: Eine Lampe verbraucht keinen Strom.)`),
        L(`Loop rule for the loop through the battery, $L_${one.n}$ and $L_${par.n}$: $${U0()} = ${uN(one.n)} + ${uN(par.n)}$, with the battery voltage $${U0()}$ and $${uN(one.n)}$ from the figure.`, `Maschenregel für die Masche durch die Batterie, $L_${one.n}$ und $L_${par.n}$: $${U0()} = ${uN(one.n)} + ${uN(par.n)}$, mit der Batteriespannung $${U0()}$ und $${uN(one.n)}$ aus der Abbildung.`),
        L(`The loop through $L_${par.n + 1}$ instead gives the same: lamps in parallel have the same voltage, each the whole of it.`, `Die Masche durch $L_${par.n + 1}$ ergibt dasselbe: Parallele Lampen haben dieselbe Spannung, jede die ganze.`),
      ],
      solution: [
        L(`Junction rule at ${D}: $I = I_${par.n} + I_${par.n + 1}$, so $I_${n} = ${tma(c.I)} - ${tma(par.I[1 - k])} = ${tma(par.I[k])}$. At ${E} the two currents join again to $${tma(c.I)}$.`, `Knotenregel in ${D}: $I = I_${par.n} + I_${par.n + 1}$, also $I_${n} = ${tma(c.I)} - ${tma(par.I[1 - k])} = ${tma(par.I[k])}$. In ${E} vereinigen sich die zwei Ströme wieder zu $${tma(c.I)}$.`),
        L(`Loop rule: $${tv(c.slots[0].V)} = ${tv(one.V)} + ${uN(par.n)}$, so $${uN(par.n)} = ${uN(par.n + 1)} = ${tv(par.V)}$ (lamps in parallel: the same voltage).`, `Maschenregel: $${tv(c.slots[0].V)} = ${tv(one.V)} + ${uN(par.n)}$, also $${uN(par.n)} = ${uN(par.n + 1)} = ${tv(par.V)}$ (parallele Lampen: dieselbe Spannung).`),
      ],
      results: `$I_${n} = ${tma(par.I[k])}$, $${uN(par.n)} = ${uN(par.n + 1)} = ${tv(par.V)}$`,
      figure: (sol) => draw(c, { known: sol, hide: sol ? null : hide }),
      p: { slots: c.slots, I: c.I, k },
      asked: { n, m, k },
    };
  }

  // 4 voltages between two pairs of points: at least one negative, none zero
  function pairs(r, c, count) {
    const all = [];
    c.points.forEach((a) => c.points.forEach((b) => { if (a !== b && a.phi !== b.phi) all.push([a, b]); }));
    for (let k = 0; k < 100; k++) {
      const pick = r.shuffle(all).slice(0, count);
      if (pick.some(([a, b]) => a.phi < b.phi) && (count < 2 || pick[0][0] !== pick[1][1] || pick[0][1] !== pick[1][0])) return pick;
    }
    return all.slice(0, count);
  }
  // the points of the pairs, in the order of the loop
  const needed = (pp) => [...new Set(pp.flat())].sort((a, b) => a.node - b.node).map((x) => x.name).join(', ').replace(/, ([^,]*)$/, L(' and $1', ' und $1'));
  function volt(r, given) {
    const c = r.next() < 0.5 ? oneBattery(r, 3) : twoBatteries(r, r.next() < 0.5), pp = pairs(r, c, 2);
    const U = ([a, b]) => `$${uxy(a.name, b.name)} = ${phi(a.name)} - ${phi(b.name)} = ${tv(a.phi)} - ${b.phi < 0 ? `(${tv(b.phi)})` : tv(b.phi)} = ${tv(a.phi - b.phi)}$`;
    const names = pp.map(([a, b]) => `$${uxy(a.name, b.name)}$`);
    return {
      kind: 'volt', c, difficulty: given ? 1 : 2,
      text: `<p>${given ? L('The potentials at the points are given.', 'Die Potentiale in den Punkten sind gegeben.') : ZERO(c)} ${L(`Find the voltages ${names.join(' and ')}.`, `Bestimme die Spannungen ${names.join(' und ')}.`)}</p>`,
      fields: pp.map(([a, b]) => numField(`U${a.name}${b.name}`, uxy(a.name, b.name), 'V', a.phi - b.phi)),
      hints: [
        ...(given ? [] : [L(`First the potentials at the points you need, ${needed(pp)}, with A at 0 V. ${RULES()}`, `Zuerst die Potentiale in den Punkten, die du brauchst, ${needed(pp)}, mit A bei 0 V. ${RULES()}`)]),
        L(`The voltage between two points is the difference of their potentials, the first minus the second: ${pp.map(([a, b]) => `$${uxy(a.name, b.name)} = ${phi(a.name)} - ${phi(b.name)}$`).join(' and ')}.`, `Die Spannung zwischen zwei Punkten ist die Differenz ihrer Potentiale, das erste minus das zweite: ${pp.map(([a, b]) => `$${uxy(a.name, b.name)} = ${phi(a.name)} - ${phi(b.name)}$`).join(' und ')}.`),
        L(`Mind the order: in ${pp.map(([a, b]) => `$${uxy(a.name, b.name)}$`).join(' and ')} the first point comes first. Where the first point lies lower than the second, the voltage is negative.`, `Achte auf die Reihenfolge: In ${pp.map(([a, b]) => `$${uxy(a.name, b.name)}$`).join(' und ')} kommt der erste Punkt zuerst. Wo der erste Punkt tiefer liegt als der zweite, ist die Spannung negativ.`),
      ],
      solution: [...(given ? [] : walk(c).map((x) => `${x}.`)), ...pp.map(U)],
      results: pp.map(([a, b]) => `$${uxy(a.name, b.name)} = ${tv(a.phi - b.phi)}$`).join(', '),
      figure: (sol) => draw(c, { known: given || sol, cur: true }) + (sol ? plot(c) : ''),
      p: { slots: c.slots, pp: pp.map(([a, b]) => a.name + b.name), given },
      pairs: pp,
    };
  }

  // 5 find the error: a sketch of the potential with one wrong step (a drop along a wire, a rise
  // across a lamp, or a rise across the battery the current flows through from + to −)
  const REASON = {
    wire: () => L('The potential drops along a wire.', 'Das Potential sinkt entlang eines Drahts.'),
    load: () => L('The potential rises across a lamp.', 'Das Potential steigt über einer Lampe.'),
    battery: () => L('The potential rises across a battery that the current flows through from + to −.', 'Das Potential steigt über einer Batterie, durch die der Strom von + nach − fliesst.'),
    size: () => L('A jump has the wrong size.', 'Ein Sprung hat die falsche Grösse.'),
  };
  // why a reason that was chosen does not fit (without naming the right one)
  const NOT_REASON = {
    wire: () => L('That is not it: along every wire, the sketch stays at the same potential.', 'Das ist es nicht: Entlang jedes Drahts bleibt die Skizze beim gleichen Potential.'),
    load: () => L('That is not it: across every lamp, the sketch drops in the direction of the current.', 'Das ist es nicht: Über jeder Lampe sinkt die Skizze in Stromrichtung.'),
    battery: () => L('That is not it: every battery is drawn the right way round.', 'Das ist es nicht: Jede Batterie ist richtig herum gezeichnet.'),
    size: () => L('That is not it: the wrong step is not just too big or too small, it goes the wrong way.', 'Das ist es nicht: Der falsche Schritt ist nicht bloss zu gross oder zu klein, er geht in die falsche Richtung.'),
  };
  function error(r, two) {
    for (let t = 0; t < 200; t++) {
      const c = two ? twoBatteries(r, true) : oneBattery(r, r.pick([2, 3]));
      if (c.points.length < 4) continue;
      const wires = c.steps.filter((s) => !s.el), lamps = c.steps.filter((s) => s.el && s.el.t === 'lamp');
      const kinds = [...(wires.length ? ['wire'] : []), 'load', ...(two ? ['battery', 'battery'] : [])];
      const m = r.pick(kinds);
      const s = m === 'wire' ? r.pick(wires) : m === 'load' ? r.pick(lamps) : c.steps.find((x) => x.el && x.el.t === 'bat' && !x.el.up);
      const i = c.steps.indexOf(s), jumps = rightJumps(c), d = m === 'wire' ? r.pick([2, 3]) : 0;
      if (m === 'wire') s.slots.forEach((sl) => { jumps[sl] = -d / s.slots.length; });
      else jumps[s.slots[0]] = s.el.V;
      const end = jumps.reduce((a, b) => a + b, 0);
      const why = {
        wire: L(`Along the wire from ${stepName(c, s).replace(' → ', ' to ')} the potential stays the same; the sketch drops by ${d} V there.`, `Entlang des Drahts von ${stepName(c, s).replace(' → ', ' nach ')} bleibt das Potential gleich; die Skizze sinkt dort um ${d} V.`),
        load: s.el && L(`Across ${lampTex(s.el.n)} the potential drops by ${s.el.V} V in the direction of the current; the sketch rises by ${s.el.V} V there.`, `Über ${lampTex(s.el.n)} sinkt das Potential in Stromrichtung um ${s.el.V} V; die Skizze steigt dort um ${s.el.V} V.`),
        battery: s.el && L(`The current flows through the ${s.el.V} V battery from + to −: there the potential drops by ${s.el.V} V; the sketch rises by ${s.el.V} V.`, `Der Strom fliesst durch die ${s.el.V}-V-Batterie von + nach −: Dort sinkt das Potential um ${s.el.V} V; die Skizze steigt um ${s.el.V} V.`),
      }[m];
      const reasons = ['wire', 'load', ...(two ? ['battery'] : []), 'size'];
      return {
        kind: 'error', c, jumps, wrong: i, m, difficulty: two ? 4 : 3,
        text: `<p>${L('A student sketched the potential around the loop, from A in the direction of the current. One step of the sketch is wrong. Which, and what is wrong with it?', 'Eine Schülerin hat das Potential im Kreis herum skizziert, von A aus in Stromrichtung. Ein Schritt der Skizze ist falsch. Welcher, und was ist daran falsch?')}</p>`,
        fields: [
          { type: 'choice', key: 'step', label: L('The wrong step', 'Der falsche Schritt'), options: c.steps.map((x, k) => ({ label: stepName(c, x), ok: k === i, why: k === i ? '' : L(`${stepName(c, x)} is right: ${how(c, x).replace(/^[A-F] → [A-F], /, '')}.`, `${stepName(c, x)} stimmt: ${how(c, x).replace(/^[A-F] → [A-F], /, '')}.`) })) },
          { type: 'choice', key: 'what', label: L('What is wrong', 'Was falsch ist'), options: reasons.map((x) => ({ label: REASON[x](), ok: x === m, why: x === m ? '' : NOT_REASON[x]() })) },
        ],
        hints: [
          L(`The sketch ends at ${num(end)} V back at A, not at 0 V: it breaks the loop rule, so one of its steps is wrong.`, `Die Skizze endet zurück in A bei ${num(end)} V, nicht bei 0 V: Sie verletzt die Maschenregel, also ist einer ihrer Schritte falsch.`),
          `${currentNote(c)} ${RULES()}`,
          L(`Check the steps one at a time against the circuit (${onTheWay(c)}): should each one go up, down or stay the same, and by how much? Then compare with the sketch.`, `Prüfe die Schritte einzeln an der Schaltung (${onTheWay(c)}): Sollte jeder hinauf, hinunter gehen oder gleich bleiben, und um wie viel? Vergleiche dann mit der Skizze.`),
        ],
        solution: [`${L('Wrong', 'Falsch')}: ${stepName(c, s)}. ${why}`, L(`The right potentials: ${c.points.map((p) => `${p.name} ${num(p.phi)} V`).join(', ')}.`, `Die richtigen Potentiale: ${c.points.map((p) => `${p.name} ${num(p.phi)} V`).join(', ')}.`)],
        results: `${stepName(c, s)}: ${REASON[m]()}`,
        figure: (sol) => draw(c, { cur: true, known: sol }) + plot(c, { jumps, mark: sol ? i : null, right: sol }),
        p: { slots: c.slots, i, m, d },
      };
    }
    throw new Error('no error exercise');
  }

  // 6 sketch the potential around the loop. The student drags a handle at every point after A up
  // and down (app.js mounts the shared sketcher, sketch.js, its columns, there); A is 0 V, at both
  // ends of the axis. The line goes from point to point as in plot(): along a wire straight (level,
  // or sloped where the two ends differ), across an element level up to its middle, where it
  // steps. Values in volts, on a grid of 1 V; with identical lamps and no numbers (eq), in sixths
  // of the battery voltage (that circuit is made with a 6 V battery, so its volts are the sixths).
  //   sketchSpec(c, eq)     { eq, xs (the places of the points after A: their nodes), lo, hi (the
  //                         axis), target (the right potentials at those points) }
  //   sketchScale(spec)     x(u), y(v), inv(py), area (where a press sets a point), W, H (svg units)
  //   sketchFig(spec, label)  the empty <svg> the sketcher fills
  //   sketchBody(c, spec, vals, view)   the drawing under the handles: grid, axes, the line through
  //                         vals (the potentials at the points after A); view: marks (steps drawn
  //                         as wrong), right (the right line, dashed, laid over the sketch), active
  //                         (the handle selected: its value beside it)
  //   judgeSketch(c, spec, vals)   null (nothing drawn yet), or the problems in the order of the
  //                         loop, [{ code, steps, nudge, why }] (none: right); see below
  const U0 = () => L('\\Delta V_0', 'U_0'); // TeX
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // k sixths of the battery voltage, in TeX, on the axis and in the readout
  function sixth(k) {
    if (k === 0) return '0';
    const g = gcd(Math.abs(k), 6), a = Math.abs(k) / g, b = 6 / g, s = k < 0 ? '-' : '';
    return b === 1 ? `${s}${a === 1 ? '' : a}${U0()}` : `${s}\\tfrac{${a}}{${b}}\\,${U0()}`;
  }
  const GLYPH = ['0', '⅙', '⅓', '½', '⅔', '⅚', '1'];
  function sixthTick(k) {
    const g = gcd(Math.abs(k), 6) || 6, a = Math.abs(k) / g, b = 6 / g;
    return (k < 0 ? '−' : '') + (Math.abs(k) <= 6 ? GLYPH[Math.abs(k)] : `${a}/${b}`);
  }
  const sketchValue = (spec, v) => (spec.eq ? (v === 0 ? '0' : `${v === 6 ? '' : v === -6 ? '−' : sixthTick(v) + ' '}${L('ΔV₀', 'U₀')}`) : `${num(v)} V`);
  const amount = (spec, x) => (spec.eq ? `$${sixth(x)}$` : `${num(x)} V`);

  function sketchSpec(c, eq) {
    const target = c.points.slice(1).map((p) => p.phi);
    return { eq, xs: c.points.slice(1).map((p) => p.node), target,
      lo: Math.min(eq ? -2 : -3, Math.min(...target) - 2), hi: rises(c).reduce((a, b) => a + b, 0) + 2 };
  }
  function sketchScale(spec) {
    const sy = Math.min(24, 240 / (spec.hi - spec.lo)), y0 = 30 + (spec.hi - spec.lo) * sy;
    const x = (u) => Math.round((46 + u * 46) * 10) / 10, y = (v) => Math.round((y0 - (v - spec.lo) * sy) * 10) / 10;
    return { x, y, inv: (py) => spec.lo + (y0 - py) / sy, area: { x0: x(0.4), x1: x(6) + 10, y0: y(spec.hi) - 14, y1: y0 + 14 }, W: x(6) + 18, H: Math.round(y0 + 26) };
  }
  function sketchFig(spec, label) {
    const g = sketchScale(spec);
    return `<div class="fig"><svg class="plot sketch-plot" viewBox="0 0 ${g.W} ${g.H}" width="${Math.round(g.W * 1.25)}" style="width:${Math.round(g.W * 1.25)}px;max-width:100%;height:auto" role="group" aria-label="${label}"></svg></div>`;
  }
  // the line through the potentials phis (of every point, A first), as [place, value] vertices
  function trace(c, phis) {
    const v = [[0, phis[0]]];
    c.steps.forEach((s) => {
      const a = phis[s.from], b = phis[s.to], i = s.slots[0];
      if (s.el) v.push([i + 0.3, a], [i + 0.7, b], [i + 1, b]);
      else v.push([s.slots[s.slots.length - 1] + 1, b]);
    });
    return v;
  }
  const stepSpan = (c, s) => [c.points[s.from].node, s.to ? c.points[s.to].node : 6];
  function sketchBody(c, spec, vals, view = {}) {
    const g = sketchScale(spec), out = [], f = (x) => x.toFixed(1);
    const line = (pts, cls) => `<polyline class="${cls}" points="${pts.map(([u, v]) => `${f(g.x(u))},${f(g.y(v))}`).join(' ')}"/>`;
    const every = spec.eq || spec.hi - spec.lo <= 14 ? 1 : 2;
    (view.marks || []).forEach((k) => {
      const [a, b] = stepSpan(c, c.steps[k]);
      out.push(`<rect class="wrongband" x="${g.x(a)}" y="${g.y(spec.hi)}" width="${f(g.x(b) - g.x(a))}" height="${f(g.y(spec.lo) - g.y(spec.hi))}"/>`);
    });
    for (let v = spec.lo; v <= spec.hi; v++) {
      out.push(`<line class="grid${v === 0 ? ' zero' : ''}" x1="${g.x(0)}" y1="${g.y(v)}" x2="${g.x(6)}" y2="${g.y(v)}"/>`);
      if (v % every === 0) out.push(`<text class="tick" x="${g.x(0) - 6}" y="${g.y(v)}" dy="0.35em" text-anchor="end">${spec.eq ? sixthTick(v) : num(v)}</text>`);
    }
    spec.xs.forEach((u) => out.push(`<line class="col" x1="${g.x(u)}" y1="${g.y(spec.hi)}" x2="${g.x(u)}" y2="${g.y(spec.lo)}"/>`));
    [...c.points, { node: 6, name: 'A' }].forEach((pt) => out.push(`<text class="ptl" x="${g.x(pt.node)}" y="${f(g.y(spec.lo) + 17)}" text-anchor="middle">${pt.name}</text>`));
    out.push(`<path class="axis" d="M${g.x(0)} ${g.y(spec.lo)}H${g.x(6) + 8}M${g.x(0)} ${g.y(spec.lo)}V${g.y(spec.hi) - 12}"/>`);
    out.push(`<text class="axl" x="6" y="14">${spec.eq ? L('<tspan class="it">V</tspan> in Δ<tspan class="it">V</tspan>₀', '<tspan class="it">φ</tspan> in <tspan class="it">U</tspan>₀') : L('<tspan class="it">V</tspan> in V', '<tspan class="it">φ</tspan> in V')}</text>`);
    const mine = trace(c, [0, ...vals]);
    out.push(line(mine, 'phi'));
    (view.marks || []).forEach((k) => {
      const [a, b] = stepSpan(c, c.steps[k]);
      out.push(line(mine.filter(([u]) => u >= a - 1e-9 && u <= b + 1e-9), 'phi bad'));
    });
    if (view.right) out.push(line(trace(c, c.points.map((p) => p.phi)), 'phi right'));
    out.push(`<circle class="fixed" cx="${g.x(0)}" cy="${g.y(0)}" r="4.5"/><circle class="fixed" cx="${g.x(6)}" cy="${g.y(0)}" r="4.5"/>`);
    const h = view.active;
    if (h) {
      const left = h.t >= 4;
      out.push(`<text class="readout" x="${f(h.x + (left ? -11 : 11))}" y="${f(h.y - 10)}" text-anchor="${left ? 'end' : 'start'}">${c.points[h.i + 1].name}: ${sketchValue(spec, h.v)}</text>`);
    }
    return out.join('');
  }

  // The sketch, judged leniently, step by step: along a wire it must stay level; across an
  // element it must go the right way (up across a battery from − to +, down across a lamp and
  // across a battery the current flows through from + to −), by about the right amount (within a
  // grid step or a fifth of the jump); then, of the elements right so far, two with the same
  // voltage need steps of about the same size (within a grid step), and of two different ones the
  // larger must not get the smaller step. A problem: { code (wire, dir, size, equal, order),
  // steps (their indices), nudge (where to look, while the exercise is open), why (all of it) }.
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function judgeSketch(c, spec, vals) {
    if (vals.every((v) => v === 0)) return null;
    const phis = [0, ...vals], eq = spec.eq, amt = (x) => amount(spec, Math.abs(x)), out = [];
    const d = c.steps.map((s) => (s.to ? phis[s.to] : 0) - phis[s.from]), D = c.steps.map((s) => (s.el ? jump(s.el) : 0));
    const E = (el) => (el.t !== 'bat' ? lampTex(el.n) : eq ? L('the battery', 'die Batterie') : L(`the ${el.V} V battery`, `die ${el.V}-V-Batterie`));
    const went = (x) => (x === 0 ? L('stays level', 'bleibt gleich') : x > 0 ? L('rises', 'steigt') : L('drops', 'sinkt'));
    const ok = c.steps.map(() => true);
    c.steps.forEach((s, k) => {
      const nm = stepName(c, s), a = nameOf(c, s.from), b = nameOf(c, s.to), x = d[k], X = D[k], el = s.el;
      const add = (code, nudge, why) => { ok[k] = false; out.push({ code, steps: [k], nudge, why }); };
      if (!el) {
        if (x !== 0) add('wire', L(`${nm}: along a wire the potential does not change, so ${a} and ${b} lie at the same height.`, `${nm}: Entlang eines Drahts ändert sich das Potential nicht, also liegen ${a} und ${b} auf gleicher Höhe.`),
          L(`${nm} is a wire: the potential stays the same; your sketch ${went(x)} by ${amt(x)} there.`, `${nm} ist ein Draht: Das Potential bleibt gleich; deine Skizze ${went(x)} dort um ${amt(x)}.`));
        return;
      }
      const why = L(`${nm}: across ${E(el)} the potential ${went(X)} by ${amt(X)}`, `${nm}: Über ${E(el)} ${went(X)} das Potential um ${amt(X)}`);
      if (Math.sign(x) !== Math.sign(X)) {
        const nudge = el.t !== 'bat' ? L(`${nm}: across ${E(el)}, in the direction of the current, the potential drops.`, `${nm}: Über ${E(el)} sinkt das Potential in Stromrichtung.`)
          : el.up ? L(`${nm}: across ${E(el)}, from − to +, the potential rises.`, `${nm}: Über ${E(el)} steigt das Potential von − nach +.`)
            : L(`${nm}: the current flows through ${E(el)} from + to −, so the potential drops there.`, `${nm}: Der Strom fliesst von + nach − durch ${E(el)}, also sinkt das Potential dort.`);
        const reason = el.t !== 'bat' ? L(' in the direction of the current', ' in Stromrichtung') : el.up ? L(' from − to +', ' von − nach +') : L(' (the current flows through it from + to −)', ' (der Strom fliesst von + nach − hindurch)');
        add('dir', nudge, `${why}${reason}; ${L('your sketch', 'deine Skizze')} ${x === 0 ? L('stays level there', 'bleibt dort gleich') : `${went(x)} ${L('there', 'dort')}`}.`);
        return;
      }
      if (Math.abs(x - X) > Math.max(1, 0.2 * Math.abs(X))) {
        const big = Math.abs(x) > Math.abs(X);
        const rule = el.t === 'bat' ? L(`the potential changes by the voltage of ${E(el)}`, `das Potential ändert sich um die Spannung ${eq ? 'der Batterie' : `der ${el.V}-V-Batterie`}`)
          : eq ? L('the identical lamps share the battery voltage equally', 'die gleichen Lampen teilen sich die Batteriespannung gleichmässig')
            : L(`the potential changes by the voltage across ${E(el)}`, `das Potential ändert sich um die Spannung an ${E(el)}`);
        add('size', L(`${nm}: the step across ${E(el)} is too ${big ? 'large' : 'small'}: ${rule}.`, `${nm}: Der Schritt über ${E(el)} ist zu ${big ? 'gross' : 'klein'}: ${cap(rule)}.`),
          `${why}; ${L('your sketch by', 'deine Skizze um')} ${amt(x)}.`);
      }
    });
    const els = c.steps.map((s, k) => k).filter((k) => c.steps[k].el && ok[k]);
    els.forEach((i) => els.forEach((j) => {
      if (j <= i) return;
      const A = Math.abs(D[i]), B = Math.abs(D[j]), x = Math.abs(d[i]), y = Math.abs(d[j]), ei = E(c.steps[i].el), ej = E(c.steps[j].el);
      const yours = L(`your sketch has ${amt(x)} and ${amt(y)}`, `deine Skizze hat ${amt(x)} und ${amt(y)}`);
      if (A === B && Math.abs(x - y) > 1) {
        out.push({ code: 'equal', steps: [i, j], nudge: L(`${cap(ei)} and ${ej} have the same voltage${eq ? ' (identical lamps)' : ''}: their steps should be the same size.`, `${cap(ei)} und ${ej} haben dieselbe Spannung${eq ? ' (gleiche Lampen)' : ''}: Ihre Schritte sollten gleich gross sein.`),
          why: L(`Across ${ei} and ${ej} the potential changes by ${amt(A)} each; ${yours}.`, `Über ${ei} und ${ej} ändert sich das Potential um je ${amt(A)}; ${yours}.`) });
      } else if ((A > B && x < y) || (A < B && x > y)) {
        const [big, small] = A > B ? [ei, ej] : [ej, ei];
        out.push({ code: 'order', steps: [i, j], nudge: L(`${cap(big)} has a larger voltage than ${small}, so its step should be the larger one.`, `${cap(big)} hat eine grössere Spannung als ${small}, also sollte ihr Schritt der grössere sein.`),
          why: L(`Across ${ei} the potential changes by ${amt(A)}, across ${ej} by ${amt(B)}; ${yours}.`, `Über ${ei} ändert sich das Potential um ${amt(A)}, über ${ej} um ${amt(B)}; ${yours}.`) });
      }
    }));
    return out;
  }

  // a step with its result in sixths of the battery voltage (eq), like stepLine
  function stepLineEq(c, s) {
    const a = c.points[s.from], b = c.points[s.to], n = lampsOf(c).length;
    const how2 = !s.el ? L('along a wire: the potential stays the same', 'entlang eines Drahts: Das Potential bleibt gleich')
      : s.el.t === 'bat' ? L(`across the battery from − to +: up by $${U0()}$`, `über die Batterie von − nach +: um $${U0()}$ hinauf`)
        : L(`across ${lampTex(s.el.n)} with the current: down by $${sixth(6 / n)}$ (the ${n} identical lamps share $${U0()}$ equally)`, `über ${lampTex(s.el.n)} mit dem Strom: um $${sixth(6 / n)}$ hinunter (die ${n} gleichen Lampen teilen sich $${U0()}$ gleichmässig)`);
    const eqn = !s.el ? `${phi(b.name)} = ${phi(a.name)} = ${sixth(b.phi)}` : `${phi(b.name)} = ${sixth(b.phi)}`;
    return `${stepName(c, s)}, ${how2}: $${eqn}$`;
  }
  function sketchEx(r, how2) {
    const eq = how2 === 'eq', n = r.pick([2, 3]);
    const c = eq ? make(place(r, [6, ...Array.from({ length: n }, () => lamp(6 / n))])) : how2 === '2' ? twoBatteries(r, r.next() < 0.6) : oneBattery(r, r.pick([2, 3]));
    const spec = sketchSpec(c, eq), pts = c.points.slice(1);
    const intro = eq ? L(`The battery has the voltage $${U0()}$, and the ${n} lamps are identical. The potential at A, the − terminal of the battery, is 0.`, `Die Batterie hat die Spannung $${U0()}$, und die ${n} Lampen sind gleich. Das Potential in A, dem Minuspol der Batterie, ist 0.`) : ZERO(c);
    return {
      kind: 'sketch', c, sketch: spec, difficulty: how2 === '2' ? 3 : 2,
      text: `<p>${intro} ${L('Sketch the potential around the loop, from A in the direction of the current back to A.', 'Skizziere das Potential im Kreis herum, von A in Stromrichtung zurück nach A.')}</p>`,
      fields: [],
      hints: [currentNote(c), RULES(), eq ? L(`The battery raises the potential by $${U0()}$; the ${n} identical lamps share it equally, so across each one it drops by $${sixth(6 / n)}$.`, `Die Batterie erhöht das Potential um $${U0()}$; die ${n} gleichen Lampen teilen sich das gleichmässig, also sinkt es über jeder um $${sixth(6 / n)}$.`)
        : `${L(`Round the loop from A: ${onTheWay(c)}.`, `Im Kreis herum von A aus: ${onTheWay(c)}.`)} ${firstStep(c)}`],
      solution: [currentNote(c), ...(eq ? c.steps.map((s) => `${stepLineEq(c, s)}.`) : walk(c).map((x) => `${x}.`)),
        eq ? L(`Back at A: 0, as it must be (loop rule: the drops, ${n} × $${sixth(6 / n)}$, add up to the rise $${U0()}$).`, `Zurück in A: 0, wie es sein muss (Maschenregel: Die Abfälle, ${n} × $${sixth(6 / n)}$, ergeben zusammen den Anstieg $${U0()}$).`) : back(c),
        L('The right graph is laid over your sketch, dashed.', 'Der richtige Graph liegt gestrichelt über deiner Skizze.')],
      results: pts.map((p) => `$${phi(p.name)} = ${eq ? sixth(p.phi) : tv(p.phi)}$`).join(', '),
      figure: (sol) => draw(c, { known: sol && !eq ? true : 1, cur: true, noValues: eq, bat: eq ? L('$ΔV_0$', '$U_0$') : null }),
      p: { slots: c.slots, how: how2 },
    };
  }

  const TYPES = ['pot-1', 'pot-2', 'loop-1', 'loop-2', 'junction', 'volt-1', 'volt-2', 'error-1', 'error-2', 'sketch-1', 'sketch-2', 'sketch-eq'];
  function generate(type, seed) {
    const r = rng(seed), [kind, lv] = type.split('-'), two = lv === '2';
    const e = kind === 'pot' ? pot(r, two) : kind === 'loop' ? loop(r, two) : kind === 'junction' ? junction(r)
      : kind === 'volt' ? volt(r, lv === '1') : kind === 'sketch' ? sketchEx(r, lv) : error(r, two);
    e.p = JSON.stringify({ type, ...e.p });
    return { ...e, type, seed };
  }

  // ---------------------------------------------------------------- check
  // The learning objectives, each with the question kinds it is asked about, its worked example
  // and its practice topic. Four options each; the wrong ones from typical mistakes (flags).
  const OBJECTIVES = [
    { id: 'track', kinds: ['pot1', 'pot2'], tutor: 0, topic: 0,
      name: () => L('Track the potential around a circuit: it rises across a source from − to +, drops across a load in the direction of the current and stays the same along a wire.',
        'Das Potential im Stromkreis verfolgen: Es steigt über einer Quelle von − nach +, sinkt über einem Verbraucher in Stromrichtung und bleibt entlang eines Drahts gleich.') },
    { id: 'rules', kinds: ['loop', 'junction'], tutor: 2, topic: 1,
      name: () => L('Apply the loop rule (around a loop the rises add up to the drops) and the junction rule (the currents into a junction add up to the currents out of it).',
        'Die Maschenregel (in einer Masche ergeben die Anstiege zusammen die Abfälle) und die Knotenregel (die Ströme in einen Knoten ergeben zusammen die Ströme hinaus) anwenden.') },
    { id: 'voltage', kinds: ['volt1', 'volt2'], tutor: 3, topic: 2,
      name: () => L('Find the voltage between any two points as the difference of their potentials.',
        'Die Spannung zwischen zwei beliebigen Punkten als Differenz ihrer Potentiale bestimmen.') },
    { id: 'error', kinds: ['error'], tutor: 4, topic: 3,
      name: () => L('Find the wrong step in a sketch of the potential around a circuit.', 'Den falschen Schritt in einer Skizze des Potentials im Stromkreis finden.') },
  ];
  const CONCEPT = { source: 'source', load: 'load', wire: 'wire', whole: 'whole', parallel: 'parallel', junction: 'junction', sign: 'sign' };
  const concepts = () => ({
    source: L('every battery raising the potential, whatever its polarity', 'jede Batterie erhöht das Potential, unabhängig von ihrer Polung'),
    load: L('the potential rising across a lamp', 'das Potential steigt über einer Lampe'),
    wire: L('the potential dropping along a wire', 'das Potential sinkt entlang eines Drahts'),
    whole: L('one lamp getting the whole battery voltage or the whole current', 'eine Lampe bekommt die ganze Batteriespannung oder den ganzen Strom'),
    parallel: L('lamps in parallel sharing the voltage', 'parallele Lampen teilen sich die Spannung'),
    junction: L('currents at a junction subtracted where they add up', 'Ströme an einem Knoten subtrahiert, wo sie sich addieren'),
    sign: L('the voltage taken the wrong way round (second minus first)', 'die Spannung verkehrt herum (zweites minus erstes)'),
  });

  // four options: the right value first, then the wrong ones with their flags, then fillers;
  // distinct (and positive, if pos), in order of size
  function options(right, wrong, fill, unit, pos) {
    const out = [{ value: right, correct: true }];
    const fits = (x) => Number.isFinite(x) && (!pos || x > 0) && out.every((o) => Math.abs(o.value - x) > 1e-9);
    for (const w of wrong) if (out.length < 4 && fits(w.value)) out.push(w);
    for (const x of fill) if (out.length < 4 && fits(x)) out.push({ value: x, flag: null, why: null });
    out.sort((a, b) => a.value - b.value);
    return out.map((o) => ({ html: `$${num(o.value).replace('−', '-')}\\,\\mathrm{${unit}}$`, correct: !!o.correct, flag: o.flag || null, why: o.why || null }));
  }
  // the potential at point k, if one were to treat lamps (load) or batteries against the current
  // (source) the wrong way
  function phiWrong(c, k, how2) {
    let y = 0;
    for (let i = 0; i < c.points[k].node; i++) {
      const el = c.slots[i];
      if (el && el.t !== 'bat' && how2 === 'load') y += el.V;
      else if (el && el.t === 'bat' && !el.up && how2 === 'source') y += el.V;
      else y += jump(el);
    }
    return y;
  }
  const solved = (e) => () => `<div class="figs">${e.figure(true)}</div><div class="steps">${e.solution.map((p) => `<p>${p}</p>`).join('')}</div>`;

  function question(kind, seed) {
    const r = rng(seed * 31 + 7);
    if (kind === 'pot1' || kind === 'pot2') {
      const e = generate(kind === 'pot1' ? 'pot-1' : 'pot-2', seed), name = e.ask[r.int(0, e.ask.length - 1)];
      const k = e.c.points.findIndex((p) => p.name === name), c = e.c, y = c.points[k].phi, o = against(c);
      const wrong = [
        { value: phiWrong(c, k, 'load'), flag: 'load', why: L('Across a lamp the potential drops in the direction of the current; it does not rise.', 'Über einer Lampe sinkt das Potential in Stromrichtung; es steigt nicht.') },
        ...(o ? [{ value: phiWrong(c, k, 'source'), flag: 'source', why: L(`The current flows through the ${o.V} V battery from + to −: there the potential drops by ${o.V} V.`, `Der Strom fliesst durch die ${o.V}-V-Batterie von + nach −: Dort sinkt das Potential um ${o.V} V.`) }] : []),
        ...[k - 1, k + 1].filter((j) => j > 0 && j < c.points.length).map((j) => ({ value: c.points[j].phi, flag: null, why: L(`That is the potential at ${c.points[j].name}.`, `Das ist das Potential in ${c.points[j].name}.`) })),
      ];
      return {
        title: L('The potential at a point', 'Das Potential in einem Punkt'),
        text: `<p>${ZERO(c)}</p>`, figure: draw(c, { cur: true, ask: name }),
        ask: L(`Find $${phi(name)}$.`, `Wie gross ist $${phi(name)}$?`),
        options: options(y, r.shuffle(wrong), r.shuffle([y + 1, y - 1, y + 2, y - 2, y + 3]), 'V'),
        explain: solved(e), key: `${e.p}|${name}`,
      };
    }
    if (kind === 'loop') {
      if (r.next() < 0.35) {
        const e = generate('junction', seed), c = e.c, par = c.slots[3], one = c.slots.find((el) => el && el.t === 'lamp'), V = c.slots[0].V;
        return {
          title: L('Lamps in parallel', 'Parallele Lampen'), text: '', figure: draw(c, { hide: new Set([`U${par.n}`, `U${par.n + 1}`]) }),
          ask: L(`Find the voltage $${uN(par.n)}$ across $L_${par.n}$.`, `Wie gross ist die Spannung $${uN(par.n)}$ an $L_${par.n}$?`),
          options: options(par.V, [
            { value: par.V / 2, flag: 'parallel', why: L('Lamps in parallel do not share the voltage: each one gets all of it.', 'Parallele Lampen teilen sich die Spannung nicht: Jede bekommt die ganze.') },
            { value: V, flag: 'whole', why: L(`$L_${one.n}$ in series takes its share of the battery voltage.`, `$L_${one.n}$ in Serie nimmt ihren Teil der Batteriespannung.`) },
            { value: V + one.V, flag: null, why: null },
          ], [par.V + 1, par.V - 1, par.V + 2], 'V', true),
          explain: solved(e), key: e.p,
        };
      }
      const e = generate(r.next() < 0.5 ? 'loop-1' : 'loop-2', seed), c = e.c, u = c.slots.find((el) => el && el.n === JSON.parse(e.p).u), o = against(c);
      const others = c.slots.filter((el) => el && el.t === 'lamp' && el !== u).reduce((a, el) => a + el.V, 0);
      return {
        title: L('The loop rule', 'Die Maschenregel'), text: '', figure: draw(c, { cur: true, hide: new Set([`U${u.n}`]) }),
        ask: L(`Find the voltage $${uN(u.n)}$ across $L_${u.n}$.`, `Wie gross ist die Spannung $${uN(u.n)}$ an $L_${u.n}$?`),
        options: options(u.V, [
          ...(o ? [{ value: c.slots[0].V + o.V - others, flag: 'source', why: L(`The current flows through the ${o.V} V battery from + to −: it is a drop, not a rise.`, `Der Strom fliesst durch die ${o.V}-V-Batterie von + nach −: Sie ist ein Abfall, kein Anstieg.`) }] : []),
          { value: c.slots[0].V, flag: 'whole', why: L('The battery voltage is shared by all the lamps in the loop.', 'Die Batteriespannung teilen sich alle Lampen der Masche.') },
          { value: rises(c).reduce((a, b) => a + b, 0) + others, flag: null, why: null },
        ], [u.V + 1, u.V - 1, u.V + 2, u.V + 3], 'V', true),
        explain: solved(e), key: e.p,
      };
    }
    if (kind === 'junction') {
      const e = generate('junction', seed), c = e.c, par = c.slots[3], { n, m, k } = e.asked, x = par.I[k], g = par.I[1 - k];
      return {
        title: L('The junction rule', 'Die Knotenregel'), text: '', figure: draw(c, { hide: new Set([`I${n}`]) }),
        ask: L(`Find the current $I_${n}$ through $L_${n}$.`, `Wie gross ist der Strom $I_${n}$ durch $L_${n}$?`),
        options: options(x, [
          { value: c.I + g, flag: 'junction', why: L(`At the junction $I$ splits up: $I = I_${par.n} + I_${par.n + 1}$.`, `Am Knoten teilt sich $I$ auf: $I = I_${par.n} + I_${par.n + 1}$.`) },
          { value: c.I, flag: 'whole', why: L('The battery current splits between the two lamps in parallel.', 'Der Batteriestrom teilt sich auf die zwei parallelen Lampen auf.') },
          { value: g, flag: null, why: L(`That is $I_${m}$: the two currents need not be the same.`, `Das ist $I_${m}$: Die zwei Ströme müssen nicht gleich sein.`) },
        ], [x + 100, x - 100, x + 200], 'mA', true),
        explain: solved(e), key: e.p,
      };
    }
    if (kind === 'volt1' || kind === 'volt2') {
      const e = generate(kind === 'volt1' ? 'volt-1' : 'volt-2', seed), c = e.c, [a, b] = e.pairs[r.int(0, 1)], U = a.phi - b.phi;
      return {
        title: L('The voltage between two points', 'Die Spannung zwischen zwei Punkten'),
        text: `<p>${kind === 'volt1' ? L('The potentials at the points are given.', 'Die Potentiale in den Punkten sind gegeben.') : ZERO(c)}</p>`,
        figure: draw(c, { known: kind === 'volt1', cur: true }),
        ask: L(`Find the voltage $${uxy(a.name, b.name)}$.`, `Wie gross ist die Spannung $${uxy(a.name, b.name)}$?`),
        options: options(U, [
          { value: -U, flag: 'sign', why: L(`$${uxy(a.name, b.name)} = ${phi(a.name)} - ${phi(b.name)}$: the first point's potential minus the second's.`, `$${uxy(a.name, b.name)} = ${phi(a.name)} - ${phi(b.name)}$: das Potential des ersten Punkts minus das des zweiten.`) },
          { value: a.phi + b.phi, flag: null, why: L('A voltage is the difference of two potentials, not their sum.', 'Eine Spannung ist die Differenz zweier Potentiale, nicht ihre Summe.') },
          { value: a.phi, flag: null, why: L(`That is only the potential at ${a.name}, the voltage between ${a.name} and A.`, `Das ist nur das Potential in ${a.name}, die Spannung zwischen ${a.name} und A.`) },
        ], [U + 1, U - 1, U + 2, U - 2], 'V'),
        explain: solved(e), key: `${e.p}|${a.name}${b.name}`,
      };
    }
    // find the error: the wrong step and three others, in the order of the loop
    const e = generate(r.next() < 0.5 ? 'error-1' : 'error-2', seed), c = e.c;
    const others = r.shuffle(c.steps.map((_, k) => k).filter((k) => k !== e.wrong)).slice(0, 3);
    const flagOf = (s) => (!s.el ? 'wire' : s.el.t === 'bat' ? (s.el.up ? null : 'source') : 'load');
    return {
      title: L('Find the error', 'Finde den Fehler'),
      text: `<p>${L('A student sketched the potential around the loop, from A in the direction of the current. One step is wrong.', 'Eine Schülerin hat das Potential im Kreis herum skizziert, von A aus in Stromrichtung. Ein Schritt ist falsch.')}</p>`,
      figure: e.figure(false), ask: L('Which step is wrong?', 'Welcher Schritt ist falsch?'),
      options: [e.wrong, ...others].sort((a, b) => a - b).map((k) => ({
        html: stepName(c, c.steps[k]), correct: k === e.wrong, flag: k === e.wrong ? null : flagOf(c.steps[k]),
        why: k === e.wrong ? null : e.fields[0].options[k].why,
      })),
      explain: solved(e), key: e.p,
    };
  }

  // ---------------------------------------------------------------- worked examples
  // Each { topic, name(), idea(), frames(), sketch() (optional: its circuit, for Your turn) },
  // frames [{ text, figure }]: the circuit with the potentials found so far, and the potential
  // plotted around the loop.
  const frame = (title, text, figure) => ({ text: `<div class="step-rule">${title}</div>${text}`, figure });
  const P = (...xs) => xs.map((x) => `<p>${x}</p>`).join('');
  // a simple loop: 12 V, wire, L1 5 V, L2 4 V, wire, L3 3 V
  const SIMPLE = () => make([bat(12), null, lamp(5), lamp(4), null, lamp(3)]);
  // two batteries against each other: 12 V, L1 3 V, wire, 4 V against, wire, L2 5 V
  const AGAINST = () => make([bat(12), lamp(3), null, bat(4, false), null, lamp(5)]);
  // the lecture's exercise: 9 V, L1 3 V in series with L2 and L3 in parallel, I = 600 mA, I2 = 200 mA
  const BRANCHED = () => make([bat(9), null, lamp(3), { t: 'par', V: 6, I: [200, 400] }, null, null], { I: 600 });

  // frames that walk round a loop, one step (or a wire and a step) at a time
  function walkFrames(c, notes = {}) {
    const out = [];
    for (let k = 0; k < c.steps.length; k++) {
      const s = c.steps[k], last = k === c.steps.length - 1;
      out.push(frame(stepName(c, s), P(`${stepLine(c, s)}.`, ...(notes[k] ? [notes[k]] : []), ...(last ? [back(c)] : [])),
        draw(c, { known: last ? true : k + 2, mark: last ? 0 : k + 1, cur: true }) + plot(c, { upTo: k + 1 })));
    }
    return out;
  }

  // Your turn: the student sketches the potential of the example's circuit before the walk round
  // it (app.js mounts the sketcher in the empty <svg>, and Check in .t-draw), or simply goes on
  const yourTurn = (c) => frame(L('Your turn', 'Du bist dran'),
    P(L('Before we go round step by step: sketch the potential yourself, from A round the loop back to A, and check your sketch. Or simply go on.', 'Bevor wir Schritt für Schritt herumgehen: Skizziere das Potential selbst, von A im Kreis herum zurück nach A, und prüfe deine Skizze. Oder geh einfach weiter.')) + '<div class="t-draw"></div>',
    draw(c, { known: 1, cur: true }) + sketchFig(sketchSpec(c, false), L('Your sketch of the potential around the loop', 'Deine Skizze des Potentials im Kreis herum')));

  const EXAMPLES = [
    {
      topic: 0, name: () => L('Round the loop', 'Im Kreis herum'), sketch: SIMPLE,
      idea: () => L('Set 0 V at the − terminal of the battery and go round with the current: up across the battery, down across each lamp, flat along the wires.', 'Setze 0 V an den Minuspol der Batterie und geh mit dem Strom im Kreis herum: hinauf über die Batterie, hinunter über jede Lampe, flach entlang der Drähte.'),
      frames: () => {
        const c = SIMPLE();
        return [
          frame(L('The task', 'Die Aufgabe'), P(L('Find the potential at the points B to F.', 'Bestimme das Potential in den Punkten B bis F.'),
            L('Only differences of the potential are fixed, so we may choose where it is 0 V: at A, the − terminal of the battery, the lowest point of the circuit.', 'Festgelegt sind nur Differenzen des Potentials; wo es 0 V ist, dürfen wir wählen: in A, dem Minuspol der Batterie, dem tiefsten Punkt der Schaltung.'),
            currentNote(c)), draw(c, { known: 1, cur: true }) + plot(c, { upTo: 0 })),
          yourTurn(c),
          ...walkFrames(c, {
            0: L('The battery lifts the charges to a higher potential: it gives them energy, 12 J per coulomb.', 'Die Batterie hebt die Ladungen auf ein höheres Potential: Sie gibt ihnen Energie, 12 J pro Coulomb.'),
            1: L('A wire is taken as a perfect conductor: no voltage across it, the potential does not change. B and C are at the same potential.', 'Ein Draht gilt als idealer Leiter: keine Spannung darüber, das Potential ändert sich nicht. B und C liegen auf demselben Potential.'),
            2: L('In the lamp the charges give their energy away (light, heat): the potential drops, in the direction of the current.', 'In der Lampe geben die Ladungen ihre Energie ab (Licht, Wärme): Das Potential sinkt, in Stromrichtung.'),
          }),
          frame(L('Typical mistakes', 'Typische Fehler'), P(
            L('“The lamps use up the current.” No: the same current flows everywhere in the loop, through every lamp. What the lamps use up is the energy of the charges: the potential drops.', '«Die Lampen verbrauchen den Strom.» Nein: Überall im Kreis fliesst derselbe Strom, durch jede Lampe. Was die Lampen verbrauchen, ist die Energie der Ladungen: Das Potential sinkt.'),
            L('“The potential drops slowly along the wires.” No: along a (perfect) wire it stays the same; it changes only across the elements.', '«Das Potential sinkt entlang der Drähte langsam ab.» Nein: Entlang eines (idealen) Drahts bleibt es gleich; es ändert sich nur über den Elementen.'),
            L('“Across a lamp the potential goes up.” No: across a lamp it always drops in the direction of the current.', '«Über einer Lampe steigt das Potential.» Nein: Über einer Lampe sinkt es in Stromrichtung immer.')),
          draw(c, { known: true, cur: true }) + plot(c)),
        ];
      },
    },
    {
      topic: 0, name: () => L('Two batteries', 'Zwei Batterien'), sketch: AGAINST,
      idea: () => L('A battery raises the potential only from − to +. If the current flows through it from + to −, the potential drops there.', 'Eine Batterie erhöht das Potential nur von − nach +. Fliesst der Strom von + nach − durch sie, sinkt das Potential dort.'),
      frames: () => {
        const c = AGAINST();
        return [
          frame(L('The task', 'Die Aufgabe'), P(L('Two batteries with opposite polarities and two lamps in series. Find the potential at B to F, with 0 V at A.', 'Zwei Batterien mit entgegengesetzter Polung und zwei Lampen in Serie. Bestimme das Potential in B bis F, mit 0 V in A.'),
            currentNote(c)), draw(c, { known: 1, cur: true }) + plot(c, { upTo: 0 })),
          yourTurn(c),
          ...walkFrames(c, {
            3: L('Here the current flows into the + terminal: the battery is charged, the charges give it energy. So the potential drops, just as across a lamp.', 'Hier fliesst der Strom in den Pluspol: Die Batterie wird geladen, die Ladungen geben ihr Energie ab. Also sinkt das Potential, gleich wie über einer Lampe.'),
          }),
          frame(L('Typical mistake', 'Typischer Fehler'), P(
            L('“A battery always raises the potential.” No: only in the direction from − to +. Look at the polarity, and at the direction of the current.', '«Eine Batterie erhöht das Potential immer.» Nein: nur in der Richtung von − nach +. Schau auf die Polung und auf die Stromrichtung.'),
            L('With the 4 V battery counted as a rise, the drops would be 3 V + 5 V = 8 V, but the rises 16 V: the loop rule would not hold.', 'Würde man die 4-V-Batterie als Anstieg zählen, wären die Abfälle 3 V + 5 V = 8 V, die Anstiege aber 16 V: Die Maschenregel wäre verletzt.')),
          draw(c, { known: true, cur: true }) + plot(c)),
        ];
      },
    },
    {
      topic: 1, name: () => L('Loop rule and junction rule', 'Maschenregel und Knotenregel'),
      idea: () => L('At a junction, the currents in add up to the currents out. Around any loop, the rises add up to the drops.', 'An einem Knoten ergeben die Ströme hinein zusammen die Ströme hinaus. In jeder Masche ergeben die Anstiege zusammen die Abfälle.'),
      frames: () => {
        const c = BRANCHED();
        return [
          frame(L('The task', 'Die Aufgabe'), P(L('The battery (9 V) drives $I = 600\\,\\mathrm{mA}$; $\\Delta V_1 = 3\\,\\mathrm{V}$, and $I_2 = 200\\,\\mathrm{mA}$ flows through $L_2$. Find the currents $I_1$ and $I_3$, the voltages across $L_2$ and $L_3$, and the potentials at B to E.', 'Die Batterie (9 V) treibt $I = 600\\,\\mathrm{mA}$; $U_1 = 3\\,\\mathrm{V}$, und durch $L_2$ fliesst $I_2 = 200\\,\\mathrm{mA}$. Bestimme die Ströme $I_1$ und $I_3$, die Spannungen an $L_2$ und $L_3$ und die Potentiale in B bis E.')),
          draw(c, { known: 1, hide: new Set(['I3', 'U2', 'U3']) })),
          frame(L('The current through $L_1$', 'Der Strom durch $L_1$'), P(L('$L_1$ is in series with the battery: all of $I$ flows through it, $I_1 = I = 600\\,\\mathrm{mA}$. A lamp does not use up current.', '$L_1$ ist in Serie mit der Batterie: Der ganze Strom fliesst durch sie, $I_1 = I = 600\\,\\mathrm{mA}$. Eine Lampe verbraucht keinen Strom.')),
          draw(c, { known: 1, hide: new Set(['I3', 'U2', 'U3']) })),
          frame(L('Junction rule', 'Knotenregel'), P(L('At D the current splits: what flows in flows out, $I = I_2 + I_3$, so $I_3 = 600\\,\\mathrm{mA} - 200\\,\\mathrm{mA} = 400\\,\\mathrm{mA}$. At E the two join again to 600 mA.', 'In D teilt sich der Strom: Was hineinfliesst, fliesst hinaus, $I = I_2 + I_3$, also $I_3 = 600\\,\\mathrm{mA} - 200\\,\\mathrm{mA} = 400\\,\\mathrm{mA}$. In E vereinigen sich die beiden wieder zu 600 mA.')),
          draw(c, { known: 1, hide: new Set(['U2', 'U3']) })),
          frame(L('Loop rule', 'Maschenregel'), P(L('The loop through the battery, $L_1$ and $L_2$: the rise of 9 V equals the drops, $9\\,\\mathrm{V} = 3\\,\\mathrm{V} + \\Delta V_2$, so $\\Delta V_2 = 6\\,\\mathrm{V}$.', 'Die Masche durch die Batterie, $L_1$ und $L_2$: Der Anstieg von 9 V ist gleich den Abfällen, $9\\,\\mathrm{V} = 3\\,\\mathrm{V} + U_2$, also $U_2 = 6\\,\\mathrm{V}$.'),
            L('The loop through $L_3$ instead gives $\\Delta V_3 = 6\\,\\mathrm{V}$ too: lamps in parallel have the same voltage, each the whole of it. They do not share it.', 'Die Masche durch $L_3$ ergibt ebenso $U_3 = 6\\,\\mathrm{V}$: Parallele Lampen haben dieselbe Spannung, jede die ganze. Sie teilen sie nicht.')),
          draw(c, { known: 1 })),
          frame(L('The potentials', 'Die Potentiale'), P(...walk(c).map((x) => `${x}.`), L('E is joined to A by a wire: 0 V.', 'E ist durch einen Draht mit A verbunden: 0 V.')), draw(c, { known: true }) + plot(c)),
          frame(L('Typical mistakes', 'Typische Fehler'), P(
            L('“$L_2$ and $L_3$ share the 6 V, 3 V each.” No: each lies between D and E, so each has the whole voltage $V_{\\mathrm{D}} - V_{\\mathrm{E}}$.', '«$L_2$ und $L_3$ teilen sich die 6 V, je 3 V.» Nein: Jede liegt zwischen D und E, also hat jede die ganze Spannung $\\varphi_{\\mathrm{D}} - \\varphi_{\\mathrm{E}}$.'),
            L('“The currents in parallel are equal.” Only for equal lamps; the junction rule only says that they add up to $I$.', '«Die Ströme parallel sind gleich.» Nur bei gleichen Lampen; die Knotenregel sagt nur, dass sie zusammen $I$ ergeben.')),
          draw(c, { known: true })),
        ];
      },
    },
    {
      topic: 2, name: () => L('Voltage between two points', 'Spannung zwischen zwei Punkten'),
      idea: () => L('The voltage between X and Y is the difference of the potentials, the first minus the second: ΔV_XY = V_X − V_Y.', 'Die Spannung zwischen X und Y ist die Differenz der Potentiale, das erste minus das zweite: U_XY = φ_X − φ_Y.'),
      frames: () => {
        const c = AGAINST(), fig = draw(c, { known: true, cur: true }) + plot(c);
        return [
          frame(L('The potentials', 'Die Potentiale'), P(L('From example 2: A 0 V, B 12 V, C 9 V, D 9 V, E 5 V, F 5 V. A voltmeter between two points shows the difference of their potentials.', 'Aus Beispiel 2: A 0 V, B 12 V, C 9 V, D 9 V, E 5 V, F 5 V. Ein Voltmeter zwischen zwei Punkten zeigt die Differenz ihrer Potentiale.')), fig),
          frame(`$${uxy('B', 'E')}$`, P(`$${uxy('B', 'E')} = ${phi('B')} - ${phi('E')} = 12\\,\\mathrm{V} - 5\\,\\mathrm{V} = 7\\,\\mathrm{V}$.`, L('The two points need not be the ends of one element: from B to E lie $L_1$, a wire and the 4 V battery, 3 V + 0 V + 4 V = 7 V.', 'Die zwei Punkte müssen nicht die Enden eines Elements sein: Von B nach E liegen $L_1$, ein Draht und die 4-V-Batterie, 3 V + 0 V + 4 V = 7 V.')), fig),
          frame(`$${uxy('E', 'B')}$`, P(`$${uxy('E', 'B')} = ${phi('E')} - ${phi('B')} = 5\\,\\mathrm{V} - 12\\,\\mathrm{V} = -7\\,\\mathrm{V}$.`, L('The order matters: the voltage is negative when the first point lies lower. A voltmeter with its leads swapped shows −7 V.', 'Die Reihenfolge zählt: Die Spannung ist negativ, wenn der erste Punkt tiefer liegt. Ein Voltmeter mit vertauschten Anschlüssen zeigt −7 V.')), fig),
          frame(`$${uxy('C', 'D')}$`, P(`$${uxy('C', 'D')} = 9\\,\\mathrm{V} - 9\\,\\mathrm{V} = 0\\,\\mathrm{V}$.`, L('C and D lie on the same wire: no voltage between them.', 'C und D liegen am selben Draht: keine Spannung zwischen ihnen.')), fig),
          frame(L('Typical mistakes', 'Typische Fehler'), P(
            L('“The voltage at B is 12 V.” A voltage is always between two points; 12 V is the potential at B, which is the voltage between B and A, where we set 0 V.', '«Die Spannung in B ist 12 V.» Eine Spannung liegt immer zwischen zwei Punkten; 12 V ist das Potential in B, also die Spannung zwischen B und A, wo wir 0 V gesetzt haben.'),
            L('The second potential minus the first gives the wrong sign.', 'Das zweite Potential minus das erste gibt das falsche Vorzeichen.')), fig),
        ];
      },
    },
    {
      topic: 3, name: () => L('Checking a sketch', 'Eine Skizze prüfen'),
      idea: () => L('A sketch of the potential must come back to 0 V at A. If it does not, check each step: up or down across which element, and by how much?', 'Eine Skizze des Potentials muss in A wieder bei 0 V ankommen. Tut sie das nicht, prüfe jeden Schritt: hinauf oder hinunter über welchem Element, und um wie viel?'),
      frames: () => {
        const c = SIMPLE(), jumps = rightJumps(c);
        jumps[1] = -2; // the wire B → C drawn sloping down by 2 V
        const sketch = (o) => draw(c, { cur: true }) + plot(c, { jumps, ...o });
        return [
          frame(L('The sketch', 'Die Skizze'), P(L('A student sketched the potential around the loop of example 1. One step is wrong: which?', 'Eine Schülerin hat das Potential im Kreis von Beispiel 1 skizziert. Ein Schritt ist falsch: welcher?')), sketch({})),
          frame(L('First: the end', 'Zuerst: das Ende'), P(L('The sketch ends at −2 V back at A, not at 0 V. That breaks the loop rule: some step is wrong.', 'Die Skizze endet zurück in A bei −2 V, nicht bei 0 V. Das verletzt die Maschenregel: Ein Schritt ist falsch.')), sketch({})),
          frame(L('Step by step', 'Schritt für Schritt'), P(L('A → B: across the battery from − to +, up by 12 V: right.', 'A → B: über die Batterie von − nach +, um 12 V hinauf: richtig.'),
            L('B → C: along a wire, but the sketch drops by 2 V: wrong. Along a wire the potential stays the same.', 'B → C: entlang eines Drahts, aber die Skizze sinkt um 2 V: falsch. Entlang eines Drahts bleibt das Potential gleich.')), sketch({ mark: 1 })),
          frame(L('The rest', 'Der Rest'), P(L('The other steps have the right jumps (down 5 V, 4 V, 3 V), only 2 V too low from C on. The right sketch is dashed.', 'Die übrigen Schritte haben die richtigen Sprünge (5 V, 4 V, 3 V hinunter), nur ab C um 2 V zu tief. Die richtige Skizze ist gestrichelt.')), sketch({ mark: 1, right: true })),
          frame(L('Other typical errors', 'Andere typische Fehler'), P(L('A rise across a lamp (it must drop in the direction of the current); a battery that the current flows through from + to − drawn as a rise (example 2); a jump that is not the voltage of its element.', 'Ein Anstieg über einer Lampe (in Stromrichtung muss das Potential sinken); eine Batterie, durch die der Strom von + nach − fliesst, als Anstieg gezeichnet (Beispiel 2); ein Sprung, der nicht der Spannung seines Elements entspricht.')), draw(c, { cur: true, known: true }) + plot(c)),
        ];
      },
    },
  ];

  const api = { rng, W, H, NODES, make, jump, split, oneBattery, twoBatteries, branched, draw, plot, vertices, rightJumps, generate, TYPES, sketchSpec, sketchScale, sketchFig, sketchBody, sketchValue, judgeSketch, OBJECTIVES, CONCEPT, concepts, question, EXAMPLES, phiWrong };
  root.Loop = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
