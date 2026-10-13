// The situations of the worksheet “Übungen Schwerpunkt” and more: the centre of mass of wire
// figures, stable, unstable and neutral equilibrium, and bodies that tip over. A scenario has an
// id, a family (com, stability or tipping: the kind of task), a difficulty from 1 to 5, choice
// (true if the student only chooses, see comps, and enters no numbers), and:
//   make(r)            random parameters (null if they do not fit)
//   solve(p, o)        the wanted quantities, exact; o switches on a typical wrong idea (see why)
//                      so that wrong answers can be recognised
//   traps, why         the wrong ideas worth checking, and what each answer suggests
//   fields(p)          the wanted quantities, in order: { key, sym: [symbol, index], unit, dec, what }
//   title(p), text(p)  the situation in words
//   figure(p, v, view) the drawing: view.task (the situation only) or view.show (a Set of the
//                      parts of the solution to draw in) and view.hl (those to highlight)
//   hints(p, v), steps(p, v)  hints and the worked solution: steps { text, show, hl }
//   comps(p)           (choices) the item to choose (identify.js): { key, what, options: [{ html,
//                      right, flag, why }], value } (flag: the wrong idea behind it, for the check)
//   results(p, v)      (choices) the short result, as there are no fields
(function (root) {
  'use strict';

  const TQ = root.TQ, { Pic } = root.Draw;
  const { L, G, tq, q, num, svgSym, pick, rad } = TQ;
  // the centre of mass: G (centre of gravity) in English textbooks, S (Schwerpunkt) in German ones
  const cS = () => L('G', 'S');
  const res = (x, u, dec) => `\\htmlClass{result}{${tq(x, u, dec)}}`;
  const step = (rule, text, show = [], hl) => ({ text: (rule ? `<p class="step-rule">${rule}</p>` : '') + text, show, hl: hl || show });
  const exact = (x) => Math.round(x * 1e6) / 1e6;
  const deg = (x) => (x * 180) / Math.PI;
  // Right triangles with whole sides (3-4-5, 5-12-13, …): slanted wires of whole lengths.
  const TRIANGLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
  const kg = (m) => q(m, 'kg', 2);
  const cm = (x) => q(x, 'cm', 1);
  // a field: key, symbol, unit, decimals, what
  const field = (key, sym, unit, dec, what) => ({ key, sym, unit, dec, what });

  // A figure of thin wire of the same kind throughout: the mass of each part is proportional to its
  // length, and each part's own centre of mass is its middle. The centre of mass is the
  // length-weighted mean: x_S = Σ ℓ_i x_i / Σ ℓ_i. Coordinates in cm from the origin O, x to the
  // right and y up. A part: a straight piece { kind: 'seg', a, b } or a square
  // { kind: 'square', c, s } (its four sides as one part: opposite sides meet in the middle, so its
  // centre of mass is its centre)
  const lengthOf = (pt) => (pt.kind === 'seg' ? Math.hypot(pt.b[0] - pt.a[0], pt.b[1] - pt.a[1]) : 4 * pt.s);
  const centreOf = (pt) => (pt.kind === 'seg' ? [(pt.a[0] + pt.b[0]) / 2, (pt.a[1] + pt.b[1]) / 2] : pt.c);
  // with o.count, each part counts the same (the wrong idea)
  function comOf(parts, o = {}) {
    const w = parts.map((pt) => (o.count ? 1 : lengthOf(pt)));
    const W = w.reduce((s, x) => s + x, 0);
    return [0, 1].map((k) => exact(parts.reduce((s, pt, i) => s + w[i] * centreOf(pt)[k], 0) / W));
  }

  const seg = (a, b) => ({ kind: 'seg', a, b });
  // a right triangle with whole sides [base, height, slant], in either orientation, scaled so that
  // the slant is at most max (cm); with div, the base and height are multiples of div
  function triangle(r, max, div = 1) {
    const list = [];
    for (const [x, y, z] of TRIANGLES) for (const k of [1, 2, 3, 4]) if (k * z <= max) for (const [b, h] of [[x, y], [y, x]]) if ((k * b) % div === 0 && (k * h) % div === 0) list.push([k * b, k * h, k * z]);
    return pick(r, list);
  }
  // two sides of different lengths: with equal ones, weighting by length would make no difference
  const differ = (p) => (p.h === p.b ? null : p);
  // Step by step, as in class: combine two parts (or groups) at a time. Their common centre lies on
  // the line between their centres, closer to the heavier one: m_A a_A = m_B a_B, where a_A, a_B are
  // the distances from the common centre to each, and a_A + a_B = D. Two parts of equal mass are
  // combined first (they meet in their middle). Masses are the lengths (proportional to them).
  // Gives [{ A, B, D, aA, aB, S }] with A, B, S = { m, c, name } (name: the parts' numbers, '' for
  // the whole figure).
  function combos(parts) {
    const dirOf = (pt) => { if (pt.kind !== 'seg') return null; const d = [pt.b[0] - pt.a[0], pt.b[1] - pt.a[1]], n = Math.hypot(...d); return [d[0] / n, d[1] / n]; };
    let items = parts.map((pt, i) => ({ m: lengthOf(pt), c: centreOf(pt), name: `${i + 1}`, dir: dirOf(pt) }));
    const out = [];
    while (items.length > 1) {
      // the pair to combine: equal masses first, then a pair whose distance and common centre
      // come out in round numbers, else the first two
      const tenth = (x) => Math.abs(10 * x - Math.round(10 * x)) < 1e-9;
      let best = null;
      for (let a = 0; a < items.length; a++) {
        for (let b = a + 1; b < items.length; b++) {
          const A = items[a], B = items[b], M = A.m + B.m, D = Math.hypot(B.c[0] - A.c[0], B.c[1] - A.c[1]);
          const c = [A.c[0] + ((B.c[0] - A.c[0]) * B.m) / M, A.c[1] + ((B.c[1] - A.c[1]) * B.m) / M];
          const parallel = A.dir && B.dir && Math.abs(Math.abs(A.dir[0] * B.dir[0] + A.dir[1] * B.dir[1]) - 1) < 1e-9;
          // centres at the same point first, then mirror images (equal, parallel, the farthest apart),
          // then equal masses, then round numbers
          const score = D < 1e-9 ? 4 : Math.abs(A.m - B.m) < 1e-9 ? (parallel ? 3 + D / 1e4 : 2) : tenth(D) && c.every(tenth) ? 1 : 0;
          if (!best || score > best.score) best = { score, a, b };
        }
      }
      const i = best.a, j = best.b;
      const A = items[i], B = items[j], M = A.m + B.m, D = Math.hypot(B.c[0] - A.c[0], B.c[1] - A.c[1]);
      const S = { m: M, c: [A.c[0] + ((B.c[0] - A.c[0]) * B.m) / M, A.c[1] + ((B.c[1] - A.c[1]) * B.m) / M], name: items.length === 2 ? '' : [...(A.name + B.name)].sort().join('') };
      out.push({ A, B, D, aA: (D * B.m) / M, aB: (D * A.m) / M, S });
      items = [S, ...items.filter((x, k) => k !== i && k !== j)];
    }
    return out;
  }

  const SHAPES = {
    // the worksheet's a): a vertical side and a top bar to the right, as Γ
    L: { difficulty: 2, make: (r) => differ({ h: pick(r, [6, 8, 9, 10, 12, 15, 16, 18, 20, 24]), b: pick(r, [3, 4, 6, 8, 9, 10, 12, 15, 18]) }),
      parts: (p) => [{ kind: 'seg', a: [0, 0], b: [0, p.h], name: 'a' }, { kind: 'seg', a: [0, p.h], b: [p.b, p.h], name: 'b' }],
      title: () => L('An angle of wire', 'Ein Drahtwinkel'), ask: ['x', 'y'], offWire: true },
    U: { difficulty: 3, make: (r) => differ({ h: pick(r, [6, 8, 10, 12, 16]), b: pick(r, [6, 8, 10, 12, 16]) }),
      parts: (p) => [{ kind: 'seg', a: [0, 0], b: [0, p.h] }, { kind: 'seg', a: [0, p.h], b: [p.b, p.h] }, { kind: 'seg', a: [p.b, p.h], b: [p.b, 0] }],
      title: () => L('A gate of wire', 'Ein Drahttor'), ask: ['x', 'y'], offWire: true },
    T: { difficulty: 2, make: (r) => differ({ h: pick(r, [6, 8, 10, 12, 16]), b: pick(r, [6, 8, 10, 12, 16]) }),
      parts: (p) => [{ kind: 'seg', a: [0, p.h], b: [p.b, p.h] }, { kind: 'seg', a: [p.b / 2, 0], b: [p.b / 2, p.h] }],
      title: () => L('A T of wire', 'Ein T aus Draht'), ask: ['x', 'y'] },
    tri: { difficulty: 3, make: (r) => ({ k: pick(r, [1, 2, 3, 4]), t: pick(r, [[3, 4, 5], [4, 3, 5]]) }),
      // a right triangle with the right angle at the bottom right, legs (base, height) and hypotenuse
      parts: (p) => { const [bx, hy] = [p.t[1] * p.k, p.t[0] * p.k]; return [{ kind: 'seg', a: [0, 0], b: [bx, 0] }, { kind: 'seg', a: [bx, 0], b: [bx, hy] }, { kind: 'seg', a: [bx, hy], b: [0, 0] }]; },
      title: () => L('A triangle of wire', 'Ein Drahtdreieck'), ask: ['x', 'y'], offWire: true },
    // E: a vertical bar and three equal bars to the right, at the bottom, middle and top
    E: { difficulty: 3, make: (r) => ({ a: pick(r, [4, 5, 6, 8, 10]), b: pick(r, [4, 6, 8, 10, 12]) }),
      parts: (p) => [seg([0, 0], [0, 2 * p.a]), seg([0, 0], [p.b, 0]), seg([0, p.a], [p.b, p.a]), seg([0, 2 * p.a], [p.b, 2 * p.a])],
      title: () => L('An E of wire', 'Ein E aus Draht'), ask: ['x', 'y'] },
    // an isosceles triangle: base 2b, slanted sides c, height h (b, h, c a right triangle)
    iso: { difficulty: 3, make: (r) => { const [b, h, c] = triangle(r, 17); return { b, h, c }; },
      parts: (p) => [seg([0, 0], [2 * p.b, 0]), seg([0, 0], [p.b, p.h]), seg([2 * p.b, 0], [p.b, p.h])],
      title: () => L('A gable of wire', 'Ein Giebel aus Draht'), ask: ['x', 'y'], offWire: true },
    // a house: floor 2b, walls w, a gable roof (b, h, c a right triangle)
    house: { difficulty: 4, make: (r) => { const [b, h, c] = triangle(r, 12); return { b, h, c, w: pick(r, [4, 6, 8, 10, 12]) }; },
      parts: (p) => [seg([0, 0], [2 * p.b, 0]), seg([0, 0], [0, p.w]), seg([2 * p.b, 0], [2 * p.b, p.w]), seg([0, p.w], [p.b, p.w + p.h]), seg([2 * p.b, p.w], [p.b, p.w + p.h])],
      title: () => L('A house of wire', 'Ein Haus aus Draht'), ask: ['x', 'y'], offWire: true },
    // a square on a stick: the origin at the foot of the stick
    sqstick: { difficulty: 4, make: (r) => ({ h: pick(r, [6, 8, 10, 12, 15, 16, 20]), s: pick(r, [2, 3, 4, 5, 6, 8]) }),
      parts: (p) => [seg([0, 0], [0, p.h]), { kind: 'square', c: [0, p.h + p.s / 2], s: p.s }],
      title: () => L('A square on a stick', 'Ein Quadrat auf einem Stab'), ask: ['y'] },
    // an isosceles triangle on a stick (b, t, c a right triangle), apex up
    tristick: { difficulty: 4, make: (r) => { const [b, t, c] = triangle(r, 10); return { h: pick(r, [6, 8, 10, 12, 15, 16, 20]), b, t, c }; },
      parts: (p) => [seg([0, 0], [0, p.h]), seg([-p.b, p.h], [p.b, p.h]), seg([-p.b, p.h], [0, p.h + p.t]), seg([p.b, p.h], [0, p.h + p.t])],
      title: () => L('A triangle on a stick', 'Ein Dreieck auf einem Stab'), ask: ['y'] },
    // a dumbbell: two squares of different sizes joined by a bar; the origin at the left end
    bell: { difficulty: 5, make: (r) => { const s1 = pick(r, [2, 3, 4, 5]), s2 = s1 + pick(r, [1, 2, 3, 4]); return { s1, s2, c: pick(r, [4, 5, 6, 8, 10, 12]) }; },
      parts: (p) => [{ kind: 'square', c: [p.s1 / 2, 0], s: p.s1 }, seg([p.s1, 0], [p.s1 + p.c, 0]), { kind: 'square', c: [p.s1 + p.c + p.s2 / 2, 0], s: p.s2 }],
      title: () => L('A dumbbell of wire', 'Eine Hantel aus Draht'), ask: ['x'] },
    // a square on a stick, held at its bottom left corner (the origin at the foot of the stick)
    corner: { difficulty: 4, make: (r) => ({ h: pick(r, [6, 8, 10, 12, 16, 20]), s: pick(r, [2, 3, 4, 5, 6, 8]) }),
      parts: (p) => [seg([0, 0], [0, p.h]), { kind: 'square', c: [p.s / 2, p.h + p.s / 2], s: p.s }],
      title: () => L('A square held at its corner', 'Ein Quadrat an der Ecke gehalten'), ask: ['x', 'y'], offWire: true },
    // a fly swatter: a handle and a square at its end (the origin at the end of the handle)
    swatter: { difficulty: 4, make: (r) => ({ c: pick(r, [6, 8, 10, 12, 15, 16, 20]), s: pick(r, [2, 3, 4, 5, 6, 8]) }),
      parts: (p) => [seg([0, 0], [p.c, 0]), { kind: 'square', c: [p.c + p.s / 2, 0], s: p.s }],
      title: () => L('A fly swatter of wire', 'Eine Fliegenklatsche aus Draht'), ask: ['x'] },
    // a sign on a post: a rectangle a wide and b high on a stick (the top side first, so that its
    // width is labelled above the sign)
    sign: { difficulty: 4, make: (r) => { const a = pick(r, [4, 6, 8, 10, 12]), b = pick(r, [2, 3, 4, 5, 6]); return a === b ? null : { h: pick(r, [6, 8, 10, 12, 15, 16, 20]), a, b }; },
      parts: (p) => [seg([0, 0], [0, p.h]), seg([-p.a / 2, p.h + p.b], [p.a / 2, p.h + p.b]), seg([-p.a / 2, p.h], [p.a / 2, p.h]), seg([-p.a / 2, p.h], [-p.a / 2, p.h + p.b]), seg([p.a / 2, p.h], [p.a / 2, p.h + p.b])],
      title: () => L('A sign on a post', 'Ein Schild auf einem Pfosten'), ask: ['y'] },
    // two squares on a stick, the smaller on top
    stack: { difficulty: 5, make: (r) => { const s2 = pick(r, [2, 3, 4]), s1 = s2 + pick(r, [1, 2, 3, 4]); return { h: pick(r, [6, 8, 10, 12, 15, 16]), s1, s2 }; },
      parts: (p) => [seg([0, 0], [0, p.h]), { kind: 'square', c: [0, p.h + p.s1 / 2], s: p.s1 }, { kind: 'square', c: [0, p.h + p.s1 + p.s2 / 2], s: p.s2 }],
      title: () => L('Two squares on a stick', 'Zwei Quadrate auf einem Stab'), ask: ['y'] },
    // a square on a stand: a foot bar, a stick and a square (the origin in the middle of the foot)
    stand: { difficulty: 5, make: (r) => ({ f: pick(r, [3, 4, 5, 6, 8]), h: pick(r, [6, 8, 10, 12, 15, 16, 20]), s: pick(r, [2, 3, 4, 5, 6]) }),
      parts: (p) => [seg([-p.f, 0], [p.f, 0]), seg([0, 0], [0, p.h]), { kind: 'square', c: [0, p.h + p.s / 2], s: p.s }],
      title: () => L('A square on a stand', 'Ein Quadrat auf einem Ständer'), ask: ['y'] },
  };

  function comFigure(shape, p, v, view = {}) {
    const S = SHAPES[shape], parts = S.parts(p), show = view.show || new Set();
    const ext = parts.flatMap((pt) => (pt.kind === 'seg' ? [pt.a, pt.b] : [[pt.c[0] - pt.s / 2, pt.c[1] - pt.s / 2], [pt.c[0] + pt.s / 2, pt.c[1] + pt.s / 2]]));
    const W = Math.max(...ext.map((e) => e[0])) - Math.min(...ext.map((e) => e[0])), H = Math.max(...ext.map((e) => e[1])) - Math.min(...ext.map((e) => e[1]));
    const P = new Pic(Math.min(230 / Math.max(W, H, 1), 26), L('A figure of wire with the origin O', 'Eine Figur aus Draht mit dem Ursprung O'));
    const s = P.s, xMin = Math.min(...ext.map((e) => e[0])), yMin = Math.min(...ext.map((e) => e[1]));
    // the axes from O
    P.arrow([Math.min(0, xMin) - 12 / s, 0], [1, 0], (Math.max(...ext.map((e) => e[0])) - Math.min(0, xMin)) * s + 40, 'axis', svgSym('x'), [4, 12]);
    P.arrow([0, Math.min(0, yMin) - 12 / s], [0, 1], (Math.max(...ext.map((e) => e[1])) - Math.min(0, yMin)) * s + 40, 'axis', svgSym('y'), [-12, 2]);
    parts.forEach((pt, i) => {
      const cls = `wire${show.has(`part${i}`) ? ' hl' : ''}`;
      if (pt.kind === 'seg') P.path([pt.a, pt.b], cls);
      else if (pt.kind === 'square') { const q = pt.s / 2, [x, y] = pt.c; P.path([[x - q, y - q], [x + q, y - q], [x + q, y + q], [x - q, y + q], [x - q, y - q]], cls); }
    });
    // dimensions: each length once, next to a side of that length, outside the figure (away from
    // its middle)
    const cx = (Math.max(...ext.map((e) => e[0])) + xMin) / 2, cy = (Math.max(...ext.map((e) => e[1])) + yMin) / 2, labelled = new Set();
    // the side of a straight piece away from the middle of the figure (for its length); its centre's
    // label goes on the other side
    const outward = (pt) => {
      const len = lengthOf(pt), m = centreOf(pt);
      let n = [-(pt.b[1] - pt.a[1]) / len, (pt.b[0] - pt.a[0]) / len];
      const dot = n[0] * (m[0] - cx) + n[1] * (m[1] - cy);
      if (dot < -1e-9 || (Math.abs(dot) <= 1e-9 && (n[0] < -1e-9 || (Math.abs(n[0]) <= 1e-9 && n[1] < 0)))) n = [-n[0], -n[1]];
      return n;
    };
    parts.forEach((pt) => {
      if (pt.kind === 'square') { P.text([pt.c[0], pt.c[1] + pt.s / 2], cm(pt.s), 'lbl small dimtext', 'middle', [0, -12]); return; }
      // each length once per direction (the bars of an E, the walls of a house: one label)
      {
        const len = lengthOf(pt), mid = centreOf(pt), d0 = [(pt.b[0] - pt.a[0]) / len, (pt.b[1] - pt.a[1]) / len];
        const tag = `${num(len, 2)}:${num(Math.abs(d0[0]), 2)}:${num(d0[0] * d0[1] >= 0 ? 1 : -1, 0)}`;
        if (labelled.has(tag)) return;
        labelled.add(tag);
        const n = outward(pt), off = [14 * n[0], -14 * n[1]];
        P.text(mid, cm(len), 'lbl small dimtext', Math.abs(off[0]) < 5 ? 'middle' : off[0] > 0 ? 'start' : 'end', [off[0], off[1] + (off[1] > 0 ? 2 : 0)]);
      }
    });
    P.dot([0, 0], 'dot', 2.4);
    P.text([0, 0], 'O', 'lbl', 'end', [-6, 12]);
    const sName = (n) => `${cS()}<tspan class="sub" dy="4">${n}</tspan><tspan dy="-4">\u200b</tspan>`;
    if (show.has('mids')) {
      parts.forEach((pt, i) => {
        const n = pt.kind === 'seg' ? outward(pt) : [0.7, -0.7], off = [-12 * n[0], 12 * n[1] + 4];
        P.dot(centreOf(pt), `dot mid${show.has(`part${i}`) ? ' hl' : ''}`, 3);
        P.text(centreOf(pt), sName(i + 1), 'lbl small com-lbl', Math.abs(off[0]) < 4 ? 'middle' : off[0] > 0 ? 'start' : 'end', off);
      });
    }
    combos(parts).forEach((k, i) => {
      if (!show.has(`comb${i}`)) return;
      P.line(k.A.c, k.B.c, `join${view.hl && view.hl.has(`comb${i}`) ? ' hl' : ''}`, true);
      if (k.S.name) { P.dot(k.S.c, 'dot mid', 3.4); P.text(k.S.c, sName(k.S.name), 'lbl small com-lbl', 'end', [-6, -9]); }
    });
    if (show.has('S')) P.com(v.S, cS());
    return P.svg();
  }

  function com(shape) {
    const S = SHAPES[shape];
    const fieldsOf = () => S.ask.map((k) => ({ key: k, sym: [k === 'x' ? 'xS' : 'yS'], unit: 'cm', dec: 1, what: L('centre of mass', 'Schwerpunkt') }));
    return {
      id: `com-${shape}`, family: 'com', difficulty: S.difficulty,
      make: (r) => S.make(r),
      solve(p, o = {}) { const c = comOf(S.parts(p), o); return { x: c[0], y: c[1], S: c }; },
      traps: ['count'],
      why: {
        count: () => L('Each part counts with its mass, which is proportional to its length, not each part the same.', 'Jedes Teil zählt mit seiner Masse, und die ist proportional zu seiner Länge; nicht jedes Teil gleich viel.'),
      },
      fields: fieldsOf,
      title: () => S.title(),
      text: () => L(`A figure is bent from one piece of uniform wire. Find its centre of mass G: its coordinates in the system drawn, with the origin O.${S.ask.length === 1 ? ` (By symmetry, ${S.ask[0] === 'x' ? 'y' : 'x'}<sub>G</sub> = 0.)` : ''}`,
        `Eine Figur ist aus einem gleichmässigen Draht gebogen. Bestimme ihren Schwerpunkt S: seine Koordinaten im eingezeichneten System mit dem Ursprung O.${S.ask.length === 1 ? ` (Aus Symmetriegründen ist ${S.ask[0] === 'x' ? 'y' : 'x'}<sub>S</sub> = 0.)` : ''}`),
      figure: (p, v, view) => comFigure(shape, p, v, view),
      hints: (p) => { const hasSquare = S.parts(p).some((pt) => pt.kind === 'square'); return [
        hasSquare ? L('Split the figure into simple parts: straight pieces and squares. The mass of each part is proportional to its length (a square: its four sides).', 'Zerlege die Figur in einfache Teile: gerade Stücke und Quadrate. Die Masse jedes Teils ist proportional zu seiner Länge (beim Quadrat: seine vier Seiten).')
          : L('Split the figure into simple parts: its straight pieces. The mass of each part is proportional to its length.', 'Zerlege die Figur in einfache Teile: ihre geraden Stücke. Die Masse jedes Teils ist proportional zu seiner Länge.'),
        hasSquare ? L('Find the centre of mass of each part: the middle of a straight piece, the centre of a square (its opposite sides meet in the middle).', 'Bestimme den Schwerpunkt jedes Teils: die Mitte eines geraden Stücks, den Mittelpunkt eines Quadrats (seine gegenüberliegenden Seiten treffen sich in der Mitte).')
          : L('Find the centre of mass of each part: the middle of each straight piece.', 'Bestimme den Schwerpunkt jedes Teils: die Mitte jedes geraden Stücks.'),
        L('Combine the parts two at a time. The common centre of mass lies on the line between their centres, closer to the heavier part: m₁ · a₁ = m₂ · a₂, where a₁ and a₂ are its distances from the two centres. Then combine the result with the next part.',
          'Fasse die Teile schrittweise zu zweit zusammen. Der gemeinsame Schwerpunkt liegt auf der Verbindungslinie ihrer Schwerpunkte, näher beim schwereren Teil: m₁ · a₁ = m₂ · a₂, wobei a₁ und a₂ seine Abstände von den beiden Schwerpunkten sind. Fasse das Ergebnis dann mit dem nächsten Teil zusammen.'),
      ]; },
      steps(p, v) {
        const parts = S.parts(p), cs = parts.map(centreOf);
        const lenTex = (pt) => (pt.kind === 'square' ? `4\\cdot ${tq(pt.s, 'cm')} = ${tq(lengthOf(pt), 'cm')}` : tq(lengthOf(pt), 'cm'));
        const pt$ = (c) => `(${num(c[0], 1)}\\,|\\,${num(c[1], 1)})`;
        const rows = parts.map((pt, i) => `<li>${pt.kind === 'square' ? L('square (its centre: opposite sides meet in the middle)', 'Quadrat (sein Mittelpunkt: gegenüberliegende Seiten treffen sich in der Mitte)') : L('straight piece', 'gerades Stück')} ${i + 1}: ${L('length', 'Länge')} $${lenTex(pt)}$, ${L('centre of mass', 'Schwerpunkt')} $S_${i + 1} = ${pt$(cs[i])}$</li>`).join('');
        const out = [step(L('1 · Split into parts', '1 · In Teile zerlegen'),
          `<p>${(parts.some((pt) => pt.kind === 'square') ? L('The figure consists of these parts. Each part’s mass is proportional to its length, so the lengths can stand for the masses. A straight piece has its centre of mass in its middle, a square in its centre:', 'Die Figur besteht aus diesen Teilen. Die Masse jedes Teils ist proportional zu seiner Länge, also können die Längen für die Massen stehen. Ein gerades Stück hat seinen Schwerpunkt in seiner Mitte, ein Quadrat in seinem Mittelpunkt:') : L('The figure consists of these parts. Each part’s mass is proportional to its length, so the lengths can stand for the masses. A straight piece has its centre of mass in its middle:', 'Die Figur besteht aus diesen Teilen. Die Masse jedes Teils ist proportional zu seiner Länge, also können die Längen für die Massen stehen. Ein gerades Stück hat seinen Schwerpunkt in seiner Mitte:'))}</p><ul>${rows}</ul>`,
          ['mids', ...parts.map((x, i) => `part${i}`)], ['mids'])];
        const ks = combos(parts), sTex = (n) => (n ? `${cS()}_{${n}}` : cS()), mTex = (n) => `m_{${n}}`;
        ks.forEach((k, i) => {
          const A = k.A.name, B = k.B.name, equal = Math.abs(k.A.m - k.B.m) < 1e-9;
          const shown = ['mids', ...ks.slice(0, i + 1).map((x, j) => `comb${j}`), ...(k.S.name ? [] : ['S'])];
          const where = `$${sTex(k.S.name)} = ${k.S.name ? pt$(k.S.c) : `(${res(k.S.c[0], 'cm', 1)}\\,|\\,${res(k.S.c[1], 'cm', 1)})`}$`;
          const straight = Math.abs(k.A.c[0] - k.B.c[0]) < 1e-9 || Math.abs(k.A.c[1] - k.B.c[1]) < 1e-9;
          const f = k.B.m / (k.A.m + k.B.m), dx = k.B.c[0] - k.A.c[0], dy = k.B.c[1] - k.A.c[1];
          // an oblique line: the lever rule divides its horizontal and vertical extents alike
          const oblique = L(`The masses at $${sTex(A)}$ and $${sTex(B)}$ are in the ratio of the lengths, $${mTex(A)} : ${mTex(B)} = ${num(k.A.m, 1)} : ${num(k.B.m, 1)}$. Their common centre of mass lies on the line between them, closer to the heavier part, with $${mTex(A)}\\cdot a_{${A}} = ${mTex(B)}\\cdot a_{${B}}$: it is the fraction $\\frac{${mTex(B)}}{${mTex(A)} + ${mTex(B)}} = \\frac{${num(k.B.m, 1)}}{${num(k.A.m + k.B.m, 1)}}$ of the way from $${sTex(A)}$ to $${sTex(B)}$. The line runs ${q(Math.abs(dx), 'cm', 1)} ${dx > 0 ? 'to the right' : 'to the left'} and ${q(Math.abs(dy), 'cm', 1)} ${dy > 0 ? 'up' : 'down'}; both are divided in the same ratio:`,
            `Die Massen in $${sTex(A)}$ und $${sTex(B)}$ stehen im Verhältnis der Längen, $${mTex(A)} : ${mTex(B)} = ${num(k.A.m, 1)} : ${num(k.B.m, 1)}$. Ihr gemeinsamer Schwerpunkt liegt auf ihrer Verbindungslinie, näher beim schwereren Teil, mit $${mTex(A)}\\cdot a_{${A}} = ${mTex(B)}\\cdot a_{${B}}$: Er liegt beim Bruchteil $\\frac{${mTex(B)}}{${mTex(A)} + ${mTex(B)}} = \\frac{${num(k.B.m, 1)}}{${num(k.A.m + k.B.m, 1)}}$ des Wegs von $${sTex(A)}$ nach $${sTex(B)}$. Die Linie verläuft ${q(Math.abs(dx), 'cm', 1)} nach ${dx > 0 ? 'rechts' : 'links'} und ${q(Math.abs(dy), 'cm', 1)} nach ${dy > 0 ? 'oben' : 'unten'}; beides wird im gleichen Verhältnis geteilt:`) +
            `$$\\Delta x = ${tq(dx, 'cm', 1)}\\cdot\\frac{${num(k.B.m, 1)}}{${num(k.A.m + k.B.m, 1)}} = ${tq(dx * f, 'cm', 2)},\\qquad \\Delta y = ${tq(dy, 'cm', 1)}\\cdot\\frac{${num(k.B.m, 1)}}{${num(k.A.m + k.B.m, 1)}} = ${tq(dy * f, 'cm', 2)}$$` +
            L(`from $${sTex(A)}$: `, `von $${sTex(A)}$ aus: `);
          const body = k.D < 1e-9
            ? L(`$${sTex(A)}$ and $${sTex(B)}$ are at the same point, so their common centre of mass is there too: ${where}.`,
              `$${sTex(A)}$ und $${sTex(B)}$ liegen im selben Punkt, also liegt auch ihr gemeinsamer Schwerpunkt dort: ${where}.`)
            : equal
            ? L(`$${sTex(A)}$ and $${sTex(B)}$ belong to parts of equal mass, so their common centre of mass lies in the middle between them: ${where}.`,
              `$${sTex(A)}$ und $${sTex(B)}$ gehören zu Teilen gleicher Masse, also liegt ihr gemeinsamer Schwerpunkt in der Mitte dazwischen: ${where}.`)
            : !straight ? `${oblique}${where}.` : L(`The masses at $${sTex(A)}$ and $${sTex(B)}$ are in the ratio of the lengths, $${mTex(A)} : ${mTex(B)} = ${num(k.A.m, 1)} : ${num(k.B.m, 1)}$. Their common centre of mass lies on the line between them, ${q(k.D, 'cm', 2)} long, closer to the heavier part:`,
              `Die Massen in $${sTex(A)}$ und $${sTex(B)}$ stehen im Verhältnis der Längen, $${mTex(A)} : ${mTex(B)} = ${num(k.A.m, 1)} : ${num(k.B.m, 1)}$. Ihr gemeinsamer Schwerpunkt liegt auf ihrer Verbindungslinie, die ${q(k.D, 'cm', 2)} lang ist, näher beim schwereren Teil:`) +
              `$$${mTex(A)}\\cdot a_{${A}} = ${mTex(B)}\\cdot a_{${B}},\\quad a_{${A}} + a_{${B}} = ${tq(k.D, 'cm', 2)}$$ ` +
              `$$a_{${A}} = ${tq(k.D, 'cm', 2)}\\cdot\\frac{${mTex(B)}}{${mTex(A)} + ${mTex(B)}} = ${tq(k.D, 'cm', 2)}\\cdot\\frac{${num(k.B.m, 1)}}{${num(k.A.m + k.B.m, 1)}} = ${tq(k.aA, 'cm', 2)}$$` +
              L(`from $${sTex(A)}$ toward $${sTex(B)}$: ${where}.`, `von $${sTex(A)}$ aus in Richtung $${sTex(B)}$: ${where}.`);
          const more = k.S.name ? L(` Together they count as one part at $${sTex(k.S.name)}$, with the mass $${mTex(k.S.name)} = ${mTex(A)} + ${mTex(B)}$ (length ${q(k.S.m, 'cm', 1)}).`, ` Zusammen zählen sie als ein Teil in $${sTex(k.S.name)}$ mit der Masse $${mTex(k.S.name)} = ${mTex(A)} + ${mTex(B)}$ (Länge ${q(k.S.m, 'cm', 1)}).`)
            : S.offWire ? `</p><p>${L('G need not lie on the wire.', 'S muss nicht auf dem Draht liegen.')}` : '';
          out.push(step(L(`${i + 2} · Combine ${sTex(A).replace(/[{}]/g, '')} and ${sTex(B).replace(/[{}]/g, '')}`, `${i + 2} · ${sTex(A).replace(/[{}]/g, '')} und ${sTex(B).replace(/[{}]/g, '')} zusammenfassen`).replace(/([SG])_(\d+)/g, (x, c, n) => `${c}${n.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d])}`),
            `<p>${body}${more}</p>`, shown, [`comb${i}`, ...(k.S.name ? [] : ['S'])]));
        });
        return out;
      },
    };
  }


  // ================================================================ tipping over
  // A box (width w, height h, mass m) on the floor, pushed horizontally at the height y; the floor
  // is rough enough that it does not slide. At which force does it start to tip over its edge?
  const tip = {
    id: 'tip', family: 'tipping', difficulty: 3,
    make(r) {
      const w = pick(r, [40, 50, 60, 80]), h = pick(r, [80, 100, 120, 150, 180]), y = pick(r, [50, 60, 80, 100, 120, 150].filter((v) => v <= h && v !== h));
      if (!y) return null;
      return { w, h, y, m: pick(r, [10, 20, 30, 40, 50, 60]) };
    },
    solve(p, o = {}) { return { F: exact((p.m * G * (o.full ? p.w : p.w / 2)) / (o.top ? p.h : p.y)) }; },
    traps: ['full', 'top'],
    why: {
      full: () => L('The weight acts at the centre of mass: its lever arm about the edge is half the width.', 'Die Gewichtskraft greift im Schwerpunkt an: Ihr Hebelarm bezüglich der Kante ist die halbe Breite.'),
      top: () => L('The push acts at the height given, not at the top of the box.', 'Die Kraft greift in der angegebenen Höhe an, nicht oben an der Kiste.'),
    },
    // in practice, where the reason would give the answer away
    nudge: {
      full: () => L('Where does the weight act, and how long is its lever arm about the edge then?', 'Wo greift die Gewichtskraft an, und wie lang ist dann ihr Hebelarm bezüglich der Kante?'),
    },
    fields: () => [field('F', ['F'], 'N', 1, L('smallest force that tips it', 'kleinste Kraft, die sie kippt'))],
    title: () => L('Tipping over', 'Kippen'),
    text: (p) => L(`A box ${cm(p.w)} wide and ${cm(p.h)} high with a mass of ${kg(p.m)} stands on the floor. It is pushed horizontally ${cm(p.y)} above the floor. The floor is rough, so the box does not slide. With which force does it start to tip over? Take g = 10 m/s² and the centre of mass in the middle of the box.`,
      `Eine Kiste von ${cm(p.w)} Breite und ${cm(p.h)} Höhe und ${kg(p.m)} Masse steht auf dem Boden. Sie wird ${cm(p.y)} über dem Boden waagrecht gestossen. Der Boden ist rau, sodass die Kiste nicht rutscht. Bei welcher Kraft beginnt sie zu kippen? Rechne mit g = 10 m/s² und dem Schwerpunkt in der Mitte der Kiste.`),
    figure(p, v, view = {}) {
      const P = new Pic(1.4, L('A box on the floor, pushed sideways', 'Eine Kiste auf dem Boden, seitlich gestossen')), show = view.show || new Set();
      P.surface([-60, 0], [p.w + 50, 0]);
      P.rect([0, 0], [p.w, p.h], 'load', 2);
      P.text([p.w / 2, p.h], kg(p.m), 'lbl mass', 'middle', [0, 16]);
      P.com([p.w / 2, p.h / 2], show.has('G') ? cS() : '');
      P.arrow([-56 / P.s, p.y], [1, 0], 56, `force k-h${view.task ? '' : ' hl'}`, view.task ? `${svgSym('F')} = ?` : svgSym('F'), [-60, -12]);
      P.dot([p.w, 0], 'dot', 3);
      P.text([p.w, 0], L('edge', 'Kante'), 'lbl small', 'start', [6, 12]);
      P.dim([p.w, 0], [p.w, p.y], cm(p.y), -16 - 0);
      P.dim([0, p.h], [p.w, p.h], cm(p.w), 14);
      P.dim([p.w, 0], [p.w, p.h], cm(p.h), -64);
      if (show.has('G')) {
        P.arrow([p.w / 2, p.h / 2], [0, -1], 50, 'force k-g', svgSym('G'), [8, 6]);
        P.dim([p.w / 2, 0], [p.w, 0], `${cm(p.w / 2)}`, -30, 'dimline hl');
      }
      return P.svg();
    },
    hints: () => [
      L('When it starts to tip, the box rests only on its edge on the far side: that edge is the axis.', 'Wenn sie zu kippen beginnt, steht die Kiste nur noch auf der Kante auf der anderen Seite: Diese Kante ist die Drehachse.'),
      L('About that edge, the push has the lever arm y (its height); the weight, acting at the centre, has the lever arm w/2.', 'Bezüglich dieser Kante hat die Kraft den Hebelarm y (ihre Höhe); die Gewichtskraft, die im Schwerpunkt angreift, den Hebelarm w/2.'),
      L('It tips when F · y > m g · w/2.', 'Sie kippt, wenn F · y > m g · w/2.'),
    ],
    steps: (p, v) => [
      step(L('The axis', 'Die Drehachse'), `<p>${L('As the box starts to tip, it stands only on its far edge; the floor’s forces act there and have no torque about it. The push turns the box over the edge, the weight turns it back:', 'Beginnt die Kiste zu kippen, steht sie nur noch auf der gegenüberliegenden Kante; die Kräfte des Bodens greifen dort an und haben bezüglich dieser Kante kein Drehmoment. Die Kraft dreht die Kiste über die Kante, die Gewichtskraft dreht sie zurück:')}</p>`, ['G']),
      step(L('The force', 'Die Kraft'), `$$F\\cdot y = m\\,g\\cdot\\frac{w}{2}\\;\\Rightarrow\\; F = \\frac{m\\,g\\,w}{2\\,y} = \\frac{${tq(p.m * G, 'N')}\\cdot ${tq(p.w, 'cm')}}{2\\cdot ${tq(p.y, 'cm')}} = ${res(v.F, 'N', 1)}$$` +
        `<p>${L('The higher the push, the smaller the force that tips the box.', 'Je höher die Kraft angreift, desto kleiner ist die Kraft, die die Kiste kippt.')}</p>`, ['G']),
    ],
  };

  // A cabinet (w × h) tilted on one edge: it falls over by itself once its centre of mass is beyond
  // the edge, i.e. at the tilt θ with tan θ = w/h (from the vertical).
  const tilt = {
    id: 'tilt', family: 'tipping', difficulty: 4,
    make(r) { const w = pick(r, [30, 40, 50, 60, 80]), h = pick(r, [100, 120, 150, 160, 180, 200]); return { w, h }; },
    solve(p, o = {}) {
      const t = o.swap ? p.h / p.w : o.full ? (2 * p.w) / p.h : p.w / p.h;
      return { tan: exact(t), theta: exact(deg(Math.atan(t))) };
    },
    traps: ['swap', 'full'],
    why: {
      swap: () => L('That is the angle measured the other way: from the floor, not from the vertical.', 'Das ist der Winkel von der anderen Seite gemessen: vom Boden aus, nicht von der Senkrechten.'),
      full: () => L('The centre of mass is in the middle: what counts is half the width against half the height.', 'Der Schwerpunkt liegt in der Mitte: Es zählt die halbe Breite gegen die halbe Höhe.'),
    },
    nudge: {
      full: () => L('The centre of mass is in the middle: how far is it from the edge, horizontally and vertically?', 'Der Schwerpunkt liegt in der Mitte: Wie weit ist er von der Kante entfernt, waagrecht und senkrecht?'),
    },
    // tan θ, which needs no calculator; the angle itself is in the solution
    fields: () => [field('tan', ['tanTheta'], '', 2, L('at the tilt θ where it falls:', 'bei der Neigung θ, bei der er fällt:'))],
    title: () => L('How far can it lean?', 'Wie weit kann er sich neigen?'),
    text: (p) => L(`A cabinet ${cm(p.w)} wide and ${cm(p.h)} high, with its centre of mass in its middle, is tilted on one of its bottom edges. From which tilt angle θ against the vertical does it fall over by itself? Give tan θ.`,
      `Ein Schrank von ${cm(p.w)} Breite und ${cm(p.h)} Höhe, mit dem Schwerpunkt in seiner Mitte, wird über eine seiner unteren Kanten gekippt. Ab welchem Neigungswinkel θ gegen die Senkrechte fällt er von selbst um? Gib tan θ an.`),
    figure(p, v, view = {}) {
      const P = new Pic(1.2, L('A cabinet tilted on its edge', 'Ein über seine Kante gekippter Schrank')), show = view.show || new Set();
      // the edge at the origin; the cabinet extends to the left of it, tilted clockwise by th
      const th = rad(view.task ? Math.min(v.theta * 0.6, 12) : v.theta);
      const rotCw = ([x, y]) => [x * Math.cos(-th) - y * Math.sin(-th), x * Math.sin(-th) + y * Math.cos(-th)];
      const C = (x, y) => rotCw([x - p.w, y]);
      P.surface([-p.w - 60, 0], [p.h * 0.6, 0]);
      P.poly([C(0, 0), C(p.w, 0), C(p.w, p.h), C(0, p.h)], 'load');
      P.com(C(p.w / 2, p.h / 2), cS());
      P.dot([0, 0], 'dot', 3); P.text([0, 0], L('edge', 'Kante'), 'lbl small', 'start', [6, 12]);
      if (view.task) {
        P.dim(C(0, p.h), C(p.w, p.h), cm(p.w), 14);
        P.dim(C(0, 0), C(0, p.h), cm(p.h), 14);
      }
      if (show.has('S')) {
        P.line([0, 0], [0, p.h * 1.05], 'action', true);
        P.line([0, 0], C(p.w / 2, p.h / 2), 'arm hl', true);
        P.arc([0, 0], 46, 90 - v.theta, 90, 'θ', 12);
      }
      return P.svg();
    },
    hints: () => [
      L('Standing on its edge, the cabinet turns about that edge. Its weight acts at the centre of mass G.', 'Auf der Kante stehend dreht sich der Schrank um diese Kante. Seine Gewichtskraft greift im Schwerpunkt S an.'),
      L('As long as G is above the base (on the inner side of the edge), the weight turns it back. It falls once G is straight above the edge.', 'Solange S über der Standfläche liegt (innerhalb der Kante), dreht ihn die Gewichtskraft zurück. Er fällt, sobald S senkrecht über der Kante liegt.'),
      L('Then the line from the edge to G is vertical: tan θ = (w/2) / (h/2) = w/h.', 'Dann ist die Linie von der Kante zu S senkrecht: tan θ = (w/2) / (h/2) = w/h.'),
    ],
    steps: (p, v) => [
      step(L('Tipping point', 'Kipppunkt'), `<p>${L('The weight acts at G. While G is on the inner side of the edge, its torque turns the cabinet back; once G is straight above the edge, the torque is zero, and beyond that the cabinet falls.', 'Die Gewichtskraft greift in S an. Solange S innerhalb der Kante liegt, dreht ihr Drehmoment den Schrank zurück; liegt S senkrecht über der Kante, ist das Drehmoment null, und darüber hinaus fällt der Schrank.')}</p>`, ['S']),
      step(L('The angle', 'Der Winkel'), `<p>${L('The line from the edge to G is then vertical. In the cabinet, it runs w/2 across and h/2 up, so it leans by θ with', 'Die Linie von der Kante zu S ist dann senkrecht. Im Schrank läuft sie w/2 quer und h/2 hoch, sie ist also um θ geneigt mit')}</p>` +
        `$$\\tan\\theta = \\frac{w/2}{h/2} = \\frac{w}{h} = \\frac{${tq(p.w, 'cm')}}{${tq(p.h, 'cm')}} = ${res(v.tan, '', 2)}\\;\\Rightarrow\\; \\theta = ${tq(v.theta, 'deg', 1)}$$` +
        `<p>${L('A low, wide body is stable: its centre of mass must be lifted far before it is above the edge.', 'Ein niedriger, breiter Körper ist stabil: Sein Schwerpunkt muss weit angehoben werden, bis er über der Kante liegt.')}</p>`, ['S']),
    ],
  };


  // ================================================================ stable, unstable, neutral
  // A uniform board (w × h, cm), turned by phi (degrees, counterclockwise), can turn about a fixed
  // axis through D; its centre of mass S is its middle, at the origin. The weight has no torque
  // about D when S lies on the vertical through D: straight below D the equilibrium is stable,
  // straight above D unstable, at D neutral; elsewhere the board starts to turn. A choice only.
  const rot = ([x, y], a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [x * c - y * s, x * s + y * c]; };
  const STATES = ['stable', 'unstable', 'neutral', 'none'];
  const stateOf = (D) => (Math.abs(D[0]) > 1e-9 ? 'none' : Math.abs(D[1]) < 1e-9 ? 'neutral' : D[1] > 0 ? 'stable' : 'unstable');
  const stateName = (s) => ({
    stable: L('stable equilibrium', 'stabiles Gleichgewicht'), unstable: L('unstable equilibrium', 'labiles Gleichgewicht'),
    neutral: L('neutral equilibrium', 'indifferentes Gleichgewicht'), none: L('no equilibrium: it starts to turn', 'kein Gleichgewicht: Es beginnt sich zu drehen'),
  })[s];
  // the sense in which the weight turns the board when S is beside the vertical through D
  const turnsWord = (D) => (D[0] > 0 ? L('counterclockwise', 'im Gegenuhrzeigersinn') : L('clockwise', 'im Uhrzeigersinn'));

  // The item to choose: the four states, each wrong one with the idea behind it.
  function stateItem(p) {
    const s = stateOf(p.D);
    // why the option o does not fit, without naming the right one
    const wrong = (o) => ({
      none: ['notVertical', L('G lies on the vertical through D: in this position, the weight has no lever arm about D and does not turn the board.', 'S liegt auf der Senkrechten durch D: In dieser Lage hat die Gewichtskraft bezüglich D keinen Hebelarm und dreht das Brett nicht.')],
      neutral: ['neutral', L('Neutral only when the axis passes through G. Turn the board a little in your mind: what does the weight do?', 'Indifferent nur, wenn die Achse durch S geht. Drehe das Brett in Gedanken ein wenig: Was macht die Gewichtskraft?')],
      stable: ['upDown', L('Stable means: turned a little, the weight turns the board back. That needs G straight below D, and here it is not.', 'Stabil heisst: Ein wenig gedreht, dreht die Gewichtskraft das Brett zurück. Dazu muss S senkrecht unter D liegen, und das tut es hier nicht.')],
      unstable: ['upDown', L('Unstable means: turned a little, the weight turns the board further away. That needs G straight above D, and here it is not.', 'Labil heisst: Ein wenig gedreht, dreht die Gewichtskraft das Brett weiter weg. Dazu muss S senkrecht über D liegen, und das tut es hier nicht.')],
    })[o];
    const value = {
      stable: L('G lies straight below D. Turned a little, G rises, and the weight turns the board back.', 'S liegt senkrecht unter D. Ein wenig gedreht, hebt sich S, und die Gewichtskraft dreht das Brett zurück.'),
      unstable: L('G lies straight above D. Turned a little, G drops, and the weight turns the board further away.', 'S liegt senkrecht über D. Ein wenig gedreht, senkt sich S, und die Gewichtskraft dreht das Brett weiter weg.'),
      neutral: L('The axis passes through G: in every position, the weight has no torque about D.', 'Die Achse geht durch S: In jeder Lage hat die Gewichtskraft bezüglich D kein Drehmoment.'),
      none: L(`G is not on the vertical through D: the weight turns the board ${turnsWord(p.D)}, until G hangs straight below D.`, `S liegt nicht auf der Senkrechten durch D: Die Gewichtskraft dreht das Brett ${turnsWord(p.D)}, bis S senkrecht unter D hängt.`),
    }[s];
    return {
      key: 'state', what: L('The kind of equilibrium:', 'Die Art des Gleichgewichts:'),
      options: STATES.map((o) => (o === s ? { html: stateName(o), right: true } : (([flag, why]) => ({ html: stateName(o), right: false, flag, why }))(wrong(o)))),
      value,
    };
  }

  function boardFigure(p, v, view = {}) {
    const P = new Pic(3, L('A board that can turn about D, with its centre of mass G', 'Ein um D drehbares Brett mit seinem Schwerpunkt S')), show = view.show || new Set();
    P.poly([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => rot([(a * p.w) / 2, (b * p.h) / 2], p.phi)), 'plate');
    if (show.has('G')) {
      // the line of action of the weight: the vertical through S
      const R = Math.hypot(p.w, p.h) / 2 + 6;
      P.line([0, -R], [0, R], 'action', true);
      P.arrow([0, 0], [0, -1], 46, `force k-g${view.hl && view.hl.has('G') ? ' hl' : ''}`, svgSym('G'), [8, 4]);
    }
    // the turn around D, open at the bottom, where D's label is
    if (show.has('turn') && stateOf(p.D) === 'none') P.turn(p.D, 20, Math.sign(p.D[0]), 'turn hl', p.D[0] > 0 ? 300 : 240);
    P.pivot(p.D);
    P.com([0, 0], cS());
    // an axis through S: a ring around the centre of mass, so that both can be seen
    if (stateOf(p.D) === 'neutral') P.circle(p.D, 10 / P.s, 'w', true);
    P.text(p.D, 'D', 'lbl', 'middle', [0, 24]);
    return P.svg();
  }

  const stability = {
    id: 'stability', family: 'stability', difficulty: 2, choice: true,
    make(r) {
      const w = pick(r, [40, 50, 60, 80]), h = pick(r, [20, 30, 40]), phi = pick(r, [0, 0, 15, 30, 45, -15, -30, -45]), s = pick(r, STATES), t = pick(r, [5, 8, 10, 12, 15]);
      const D = s === 'stable' ? [0, t] : s === 'unstable' ? [0, -t] : s === 'neutral' ? [0, 0] : [pick(r, [-1, 1]) * pick(r, [8, 10, 12, 15]), pick(r, [-10, -5, 0, 5, 10])];
      // D on the board, with room around it
      const b = rot(D, -phi);
      return Math.abs(b[0]) > w / 2 - 5 || Math.abs(b[1]) > h / 2 - 5 ? null : { w, h, phi, D };
    },
    solve: (p) => ({ state: stateOf(p.D) }),
    traps: [],
    fields: () => [],
    comps: (p) => [stateItem(p)],
    results: (p) => stateName(stateOf(p.D)),
    title: () => L('Stable or not?', 'Stabil oder nicht?'),
    text: () => L('A uniform board can turn without friction about a fixed axis through D, perpendicular to the drawing. Its centre of mass G is in its middle. The board is let go at rest in the position drawn. What kind of equilibrium is it in, if any?',
      'Ein gleichmässiges Brett ist reibungsfrei um eine feste Achse durch D drehbar, die senkrecht zur Zeichnung steht. Sein Schwerpunkt S liegt in seiner Mitte. Das Brett wird in der gezeichneten Lage in Ruhe losgelassen. In welchem Gleichgewicht ist es, wenn überhaupt?'),
    figure: boardFigure,
    hints: () => [
      L('The weight acts at G, straight down. It has no torque about D if its line of action, the vertical through G, passes through D.', 'Die Gewichtskraft greift in S an, senkrecht nach unten. Sie hat bezüglich D kein Drehmoment, wenn ihre Wirkungslinie, die Senkrechte durch S, durch D geht.'),
      L('If it has no torque, turn the board a little in your mind: does the weight turn it back, further away, or not at all?', 'Hat sie kein Drehmoment, so drehe das Brett in Gedanken ein wenig: Dreht die Gewichtskraft es zurück, weiter weg oder gar nicht?'),
    ],
    steps(p) {
      const s = stateOf(p.D), a = Math.abs(p.D[0]);
      const body = {
        none: L(`The vertical through G passes ${cm(a)} ${p.D[0] > 0 ? 'to the left' : 'to the right'} of D: the weight has a lever arm of ${cm(a)} and turns the board ${turnsWord(p.D)}. <b>No equilibrium:</b> the board swings until G hangs straight below D.`,
          `Die Senkrechte durch S verläuft ${cm(a)} ${p.D[0] > 0 ? 'links' : 'rechts'} von D: Die Gewichtskraft hat einen Hebelarm von ${cm(a)} und dreht das Brett ${turnsWord(p.D)}. <b>Kein Gleichgewicht:</b> Das Brett schwingt, bis S senkrecht unter D hängt.`),
        stable: L('The vertical through G passes through D: the weight has no torque, and the board stays at rest. G lies below D. Turned a little, G moves up and to the side, and the weight turns the board back: <b>stable equilibrium</b>.',
          'Die Senkrechte durch S geht durch D: Die Gewichtskraft hat kein Drehmoment, und das Brett bleibt in Ruhe. S liegt unter D. Ein wenig gedreht, bewegt sich S nach oben und zur Seite, und die Gewichtskraft dreht das Brett zurück: <b>stabiles Gleichgewicht</b>.'),
        unstable: L('The vertical through G passes through D: the weight has no torque, and the board stays at rest. But G lies above D. Turned a little, G moves down and to the side, and the weight turns the board further away: <b>unstable equilibrium</b>.',
          'Die Senkrechte durch S geht durch D: Die Gewichtskraft hat kein Drehmoment, und das Brett bleibt in Ruhe. Aber S liegt über D. Ein wenig gedreht, bewegt sich S nach unten und zur Seite, und die Gewichtskraft dreht das Brett weiter weg: <b>labiles Gleichgewicht</b>.'),
        neutral: L('The axis passes through G: the weight acts at the axis and never has a lever arm. In every position the board stays at rest: <b>neutral equilibrium</b>.',
          'Die Achse geht durch S: Die Gewichtskraft greift in der Achse an und hat nie einen Hebelarm. In jeder Lage bleibt das Brett in Ruhe: <b>indifferentes Gleichgewicht</b>.'),
      }[s];
      return [
        step(L('The weight', 'Die Gewichtskraft'), `<p>${L('The weight acts at the centre of mass G, straight down. Its lever arm about D is the distance from D to the vertical through G.', 'Die Gewichtskraft greift im Schwerpunkt S an, senkrecht nach unten. Ihr Hebelarm bezüglich D ist der Abstand von D zur Senkrechten durch S.')}</p>`, ['G']),
        step(L('Equilibrium?', 'Gleichgewicht?'), `<p>${body}</p>`, ['G', 'turn'], ['G', 'turn']),
        step(L('The rule', 'Die Regel'), `<p>${L('A body on an axis is at rest only when G lies on the vertical through the axis: straight below it (stable), straight above it (unstable) or on the axis (neutral).', 'Ein Körper an einer Achse ist nur in Ruhe, wenn S auf der Senkrechten durch die Achse liegt: senkrecht darunter (stabil), senkrecht darüber (labil) oder auf der Achse (indifferent).')}</p>`, ['G', 'turn'], []),
      ];
    },
  };

  // ================================================================ which one falls over?
  // Four blocks (w × h, cm), each tilted clockwise by th (degrees) onto its bottom right edge. The
  // centre of mass S of each lies in the middle of its width, sy above its base (lower than the
  // middle for a block weighted at the bottom). A block falls over when the vertical through S
  // passes beyond that edge: S then lies sy·sin th − (w/2)·cos th to the right of it, more than
  // zero. A choice only.
  const beyond = (b) => exact(b.sy * Math.sin(rad(b.th)) - (b.w / 2) * Math.cos(rad(b.th)));
  const LETTERS = ['A', 'B', 'C', 'D'];
  const blockWord = (i) => L(`body ${LETTERS[i]}`, `Körper ${LETTERS[i]}`);
  // the most tilted block, which must not be the one that falls
  const mostTilted = (p) => p.bodies.reduce((m, b, i) => (b.th > p.bodies[m].th ? i : m), 0);

  function fallItem(p) {
    const most = p.slope != null ? -1 : mostTilted(p);
    return {
      key: 'falls', what: L('The body that falls over:', 'Der Körper, der umkippt:'),
      options: p.bodies.map((b, i) => (i === p.falls ? { html: LETTERS[i], right: true }
        : { html: LETTERS[i], right: false, flag: i === most ? 'tilt' : undefined,
          why: i === most ? L(`${LETTERS[i]} is tilted the most, but the vertical through its G still passes inside its edge, under its base: it falls back.`, `${LETTERS[i]} ist am stärksten geneigt, aber die Senkrechte durch seinen Schwerpunkt verläuft noch innerhalb seiner Kante, unter seiner Grundfläche: Er fällt zurück.`)
            : L(`The vertical through the G of ${LETTERS[i]} passes inside its edge, under its base: it ${p.slope != null ? 'stays standing' : 'falls back'}.`, `Die Senkrechte durch den Schwerpunkt von ${LETTERS[i]} verläuft innerhalb seiner Kante, unter seiner Grundfläche: Er ${p.slope != null ? 'bleibt stehen' : 'fällt zurück'}.`) })),
      value: L(`${LETTERS[p.falls]}: the vertical through its centre of mass passes beyond the edge it ${p.slope != null ? 'would tip over' : 'stands on'}.`, `${LETTERS[p.falls]}: Die Senkrechte durch seinen Schwerpunkt verläuft ausserhalb der Kante, ${p.slope != null ? 'über die er kippen würde' : 'auf der er steht'}.`),
    };
  }

  // The outline of a body, from its bottom right edge: x to the left (negative), y up. A box, a
  // triangular prism (apex at the top) or a trapezoid prism (top w2 wide); S in the middle of its
  // width, sy above the base.
  function outline(b) {
    if (b.shape === 'tri') return [[0, 0], [-b.w, 0], [-b.w / 2, b.h]];
    if (b.shape === 'trap') return [[0, 0], [-b.w, 0], [-(b.w + b.w2) / 2, b.h], [-(b.w - b.w2) / 2, b.h]];
    return [[0, 0], [-b.w, 0], [-b.w, b.h], [0, b.h]];
  }

  function blocksFigure(p, v, view = {}) {
    const slope = p.slope != null;
    const P = new Pic(1.6, slope ? L('Four bodies standing on a slope, with their centres of mass', 'Vier Körper auf einer schiefen Ebene mit ihren Schwerpunkten')
      : L('Four bodies tilted onto an edge, with their centres of mass', 'Vier auf eine Kante gekippte Körper mit ihren Schwerpunkten')), show = view.show || new Set();
    let x0 = 0, along = 0;
    const floor = [];
    const ts = rad(slope ? p.slope : 0), dir = [Math.cos(ts), -Math.sin(ts)];
    // on the slope: the surface through the origin, going down to the right
    const ground = (x) => (slope ? -Math.tan(ts) * x : 0);
    p.bodies.forEach((b, i) => {
      const t = rad(b.th), c = Math.cos(t), s = Math.sin(t);
      const E = slope ? [(along + b.w) * dir[0], (along + b.w) * dir[1]] : [x0 + b.w * c, 0];
      const C = (x, y) => [E[0] + x * c + y * s, E[1] - x * s + y * c];
      const S = C(-b.w / 2, b.sy);
      P.poly(outline(b).map(([x, y]) => C(x, y)), 'load');
      if (show.has('S')) P.line(S, [S[0], ground(S[0])], i === p.falls || (view.hl && view.hl.has(`b${i}`)) ? 'arm hl' : 'action', true);
      P.com(S, '');
      P.dot(E, 'dot', 2.6);
      const mid = C(-b.w / 2, 0);
      P.text(slope ? mid : [E[0] - (b.w * c) / 2, 0], LETTERS[i], 'lbl', 'middle', slope ? [8, 22] : [0, 22]);
      floor.push(x0 - 8, E[0] + b.h * s + 8);
      x0 = E[0] + Math.max(b.h * s, 0) + 22;
      along += b.w + 22;
    });
    if (slope) {
      const end = along + 10;
      P.surface([-10 * dir[0], -10 * dir[1]], [end * dir[0], end * dir[1]]);
      P.line([end * dir[0], end * dir[1]], [-10 * dir[0], end * dir[1]], 'action', true);
      P.text([end * dir[0] - 64, end * dir[1]], `${num(p.slope, 0)}°`, 'lbl small', 'middle', [0, -4]);
    } else P.surface([Math.min(...floor), 0], [Math.max(...floor), 0]);
    return P.svg();
  }

  const tips = {
    id: 'tips', family: 'tipping', difficulty: 2, choice: true,
    make(r) {
      const falls = Math.floor(r() * 4), slope = r() < 0.5 ? pick(r, [20, 25, 30, 35]) : null;
      // a body: a box (maybe weighted at the bottom), a triangular or a trapezoid prism
      const body = () => {
        const shape = pick(r, ['box', 'box', 'tri', 'trap']), w = pick(r, [20, 30, 40]), h = pick(r, [40, 50, 60, 80]);
        if (shape === 'tri') return { shape, w, h, sy: exact(h / 3) };
        if (shape === 'trap') { const w2 = w / 2; return { shape, w, w2, h, sy: exact((h * (w + 2 * w2)) / (3 * (w + w2))) }; }
        return { shape, w, h, sy: exact(h / pick(r, [2, 2, 3])) };
      };
      const crit = (b) => deg(Math.atan(b.w / 2 / b.sy));
      let bodies;
      if (slope == null) {
        // each tilted by its own angle: clearly beyond, or before, the tilt where S is above the edge
        bodies = LETTERS.map((x, i) => { const b = body(); return { ...b, th: Math.round(i === falls ? crit(b) + pick(r, [6, 8, 10, 12]) : crit(b) - pick(r, [6, 8, 10, 14])) }; });
        if (bodies.some((b) => b.th < 4 || b.th > 60)) return null;
      } else {
        // all on one slope: the one that falls tips at a smaller angle, the others at a larger one
        bodies = [];
        for (let i = 0; i < 4; i++) {
          let b = null;
          for (let k = 0; k < 40 && !b; k++) { const c = body(), cr = crit(c); if (i === falls ? cr < slope - 4 : cr > slope + 4) b = c; }
          if (!b) return null;
          bodies.push({ ...b, th: slope });
        }
      }
      const p = { bodies, falls, ...(slope != null ? { slope } : {}) };
      return slope == null && mostTilted(p) === falls ? null : p;
    },
    solve: (p) => ({ beyond: p.bodies.map(beyond) }),
    traps: [],
    fields: () => [],
    comps: (p) => [fallItem(p)],
    results: (p) => blockWord(p.falls),
    title: () => L('Which one falls over?', 'Welcher kippt um?'),
    text: (p) => (p.slope != null
      ? L(`Four bodies stand on a slope of ${p.slope}°; it is rough, so they do not slide. Their centres of mass are marked. Which body tips over? The others stay standing.`,
        `Vier Körper stehen auf einer schiefen Ebene mit ${p.slope}° Neigung; sie ist rau, sodass sie nicht rutschen. Ihre Schwerpunkte sind eingezeichnet. Welcher Körper kippt um? Die anderen bleiben stehen.`)
      : L('Four bodies are tilted onto one of their bottom edges and let go. Their centres of mass are marked; some are weighted at the bottom or narrower at the top, so that it lies lower than the middle. Which body falls over? The others fall back onto their base.',
        'Vier Körper werden auf eine ihrer unteren Kanten gekippt und losgelassen. Ihre Schwerpunkte sind eingezeichnet; einige sind unten beschwert oder oben schmaler, sodass er tiefer als die Mitte liegt. Welcher Körper kippt um? Die anderen fallen auf ihre Grundfläche zurück.')),
    figure: blocksFigure,
    hints: () => [
      L('The weight acts at the centre of mass, straight down. Draw the vertical through each centre of mass.', 'Die Gewichtskraft greift im Schwerpunkt an, senkrecht nach unten. Zeichne die Senkrechte durch jeden Schwerpunkt.'),
      L('Each body would tip over its lower edge. If the vertical through its centre of mass passes inside that edge, under its base, the weight turns it back; beyond the edge, it turns it over.', 'Jeder Körper würde über seine untere Kante kippen. Verläuft die Senkrechte durch seinen Schwerpunkt innerhalb dieser Kante, unter seiner Grundfläche, dreht ihn die Gewichtskraft zurück; ausserhalb der Kante kippt sie ihn um.'),
    ],
    steps(p, v) {
      const rows = p.bodies.map((b, i) => {
        const x = v.beyond[i];
        return `<li>${LETTERS[i]}: ${x > 0 ? L(`the vertical through G passes ${cm(x)} beyond the edge: <b>it falls over</b>.`, `Die Senkrechte durch S verläuft ${cm(x)} ausserhalb der Kante: <b>Er kippt um</b>.`)
          : L(`the vertical through G passes ${cm(-x)} inside the edge: it ${p.slope != null ? 'stays standing' : 'falls back'}.`, `Die Senkrechte durch S verläuft ${cm(-x)} innerhalb der Kante: Er ${p.slope != null ? 'bleibt stehen' : 'fällt zurück'}.`)}</li>`;
      }).join('');
      return [
        step(L('The axis', 'Die Drehachse'), `<p>${L('A body tips over its lower edge: that edge is the axis. The weight acts at the centre of mass, straight down. If the vertical through the centre of mass passes inside the edge, under the base, the weight turns the body back onto its base; if it passes beyond the edge, the weight turns it over.', 'Ein Körper kippt über seine untere Kante: Sie ist die Drehachse. Die Gewichtskraft greift im Schwerpunkt an, senkrecht nach unten. Verläuft die Senkrechte durch den Schwerpunkt innerhalb der Kante, unter der Grundfläche, dreht die Gewichtskraft den Körper auf seine Grundfläche zurück; verläuft sie ausserhalb der Kante, kippt sie ihn um.')}</p>`),
        step(L('The bodies', 'Die Körper'), `<ul>${rows}</ul><p>${L('How far a body is tilted does not settle it alone: a wide body, or one with a low centre of mass, can be tilted further.', 'Wie weit ein Körper geneigt ist, entscheidet nicht allein: Ein breiter Körper oder einer mit tiefem Schwerpunkt lässt sich weiter neigen.')}</p>`, ['S'], ['S']),
      ];
    },
  };

  const SCENARIOS = [
    com('L'), com('T'), com('U'), com('E'), com('tri'), com('iso'), com('house'), com('sqstick'), com('corner'), com('swatter'), com('sign'), com('stack'), com('stand'), com('tristick'), com('bell'),
    stability, tips, tilt, tip,
  ];

  root.Scenarios = { SCENARIOS, SHAPES, comOf, beyond, stateOf };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
