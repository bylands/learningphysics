// The situations of the worksheet “Übungen Kräftesysteme”: one box at rest or pulled across the
// floor, two boxes pushed or joined by a rope, pulleys and slopes. A scenario has an id, a
// difficulty from 1 to 5, trig if its results need sine or cosine, and:
//   make(r, o)         random parameters (null if they do not fit); with o.nice (practice), angles
//                      whose sine and cosine the text gives as short decimals (NICE: 37° and 53°
//                      with 0.6 and 0.8, 30° and 60° with 0.5 and 0.87), so that everything can be
//                      worked out in the head: the student identifies each component, the app gives
//                      its value (comps), and the student works out a result (nums)
//   solve(p)           the wanted quantities (for the tutor's worked solutions)
//   fields(p)          the wanted quantities, in order: { key, sym: [symbol, index], unit, what }
//   text(p), scene(p)  the situation, in words and as a drawing (see draw.js)
//   hints(p, v), steps(p, v)  hints and the worked solution: steps { text, show, hl } that say
//                      which forces of the drawing to show and highlight
//   comps(p)           the components the student identifies first (see identify.js): { key, what,
//                      sym, base, baseVal, fn }, with the angle p.alpha
//   nums(p, v)         the results the student works out (practice), each a choice of four values:
//                      { key, what, sym, unit, value, calc (TeX: the calculation), wrongs: [[value,
//                      flag, why]] } with the wrong values of typical mistakes (see generator.js)
//   still              the box stands still (its friction, if any, is static friction)
//   boxes(p)           (two boxes) the names of box 1 and box 2, for the table of forces;
//                      forceOn { id: box } where a force without index 2 acts on box 2 (index 1)
// Values come out exact; the texts round them. The equations to set up are in equations.js.
(function (root) {
  'use strict';

  const FS = root.FS, { Scene } = root.Draw;
  const { L, G, tex: T, tq, q, num, svgSym, pick, rad } = FS;
  const res = (x, u) => `\\htmlClass{result}{${tq(x, u)}}`;
  // Box sizes [width, height]: within a drawing, the area is proportional to the mass and all boxes
  // have the same shape. The scale suits the drawing's masses ms, so that the lightest box is big
  // enough for its arrows.
  const dims = (m, ms = [m]) => { const h = Math.max(44, 64 / Math.sqrt(Math.min(...ms))) * Math.sqrt(m); return [1.25 * h, h]; };
  const kg = (m) => q(m, 'kg');

  const WHAT = {
    G: () => L('weight of the box', 'Gewichtskraft auf die Kiste'),
    N: () => L('normal force on the box', 'Normalkraft auf die Kiste'),
    R: () => L('friction force', 'Reibungskraft'),
    res: () => L('net force on the whole system', 'resultierende Kraft auf das ganze System'),
    a: () => L('acceleration', 'Beschleunigung'),
    F: () => L('pulling force', 'Zugkraft'),
    S: () => L('rope force', 'Seilkraft'),
    K: () => L('force between the boxes', 'Kraft zwischen den Kisten'),
  };
  const field = (key, idx = '', what) => ({ key: key + idx, sym: [key === 'a' ? 'a' : key, idx], unit: key === 'a' ? 'a' : 'N', what: what || WHAT[key]() });
  const m$ = (s) => `$${s}$`;

  // Angles for practice whose sine and cosine are short decimals, given in the text (as on a
  // worksheet without a calculator); with them, the app computes the values it shows (p.nice).
  // 45° is left out: there sine and cosine are equal, so mixing them up would go unnoticed.
  const NICE = { 30: { sin: 0.5, cos: 0.87 }, 37: { sin: 0.6, cos: 0.8 }, 53: { sin: 0.8, cos: 0.6 }, 60: { sin: 0.87, cos: 0.5 } };
  const sinOf = (p) => (p.nice ? NICE[p.alpha].sin : Math.sin(rad(p.alpha)));
  const cosOf = (p) => (p.nice ? NICE[p.alpha].cos : Math.cos(rad(p.alpha)));
  const angleLabel = (p) => q(p.alpha, 'deg');
  // sin α or cos α in a calculation: sin 30°, or with nice angles its value (0.5)
  const trig = (fn, p) => (p.nice ? FS.texNum(NICE[p.alpha][fn], 2) : `\\${fn}${tq(p.alpha, 'deg')}`);

  // A result to work out (nums): its wrong values with the idea behind each (see generator.js).
  const num$ = (key, what, sym, unit, value, calc, wrongs) => ({ key, what, sym, unit, value, calc, wrongs });
  const WRONG = {
    flatN: () => L('The normal force equals the weight only when nothing else pushes or pulls perpendicular to the surface.', 'Die Normalkraft ist nur dann gleich der Gewichtskraft, wenn sonst nichts senkrecht zur Unterlage drückt oder zieht.'),
    swap: () => L('Sine and cosine swapped: the component next to the angle is the force times cos α, the one opposite it times sin α.', 'Sinus und Kosinus vertauscht: Die Komponente am Winkel ist die Kraft mal cos α, die gegenüber mal sin α.'),
    whole: () => L('Only a component of the force acts in this direction, not the whole force.', 'In diese Richtung wirkt nur eine Komponente der Kraft, nicht die ganze Kraft.'),
    noFric: () => L('Friction is missing: it acts against the motion.', 'Die Reibung fehlt: Sie wirkt gegen die Bewegung.'),
    noSlope: () => L('The component of the weight down the slope is missing.', 'Die Hangabtriebskraft fehlt.'),
    rope: () => L('The rope force is not the weight of the hanging box: that box accelerates, so the rope holds it with less than its weight.', 'Die Seilkraft ist nicht die Gewichtskraft der hängenden Kiste: Diese Kiste wird beschleunigt, also hält das Seil sie mit weniger als ihrer Gewichtskraft.'),
    mass: () => L('Divide by the mass of the system whose forces you added: here both boxes together.', 'Teile durch die Masse des Systems, dessen Kräfte du addiert hast: hier beide Kisten zusammen.'),
    net: () => L('That is the net force; the acceleration is the net force divided by the mass.', 'Das ist die resultierende Kraft; die Beschleunigung ist die resultierende Kraft geteilt durch die Masse.'),
  };

  const step = (rule, text, show, hl) => ({ text: (rule ? `<p class="step-rule">${rule}</p>` : '') + text, show, hl: hl || show });

  // ---------------------------------------------------------------- one box on the floor
  // The floor, a box and the usual points where forces act.
  function floorBox(m, mu, w = 500, h = 300) {
    const sc = new Scene(w, h, L('A box on the floor', 'Eine Kiste auf dem Boden'));
    const y0 = h - 76, [bw, bh] = dims(m), x0 = (w - bw) / 2;
    sc.surface([40, y0], [w - 40, y0]);
    const at = sc.box([x0, y0], [1, 0], [0, -1], bw, bh, kg(m));
    if (mu != null) sc.text(48, y0 + 22, `${svgSym('mu')} = ${num(mu, 2)}`, 'lbl small', 'start');
    const c = at(bw / 2, bh / 2);
    return {
      sc, at, bw, bh, y0, c,
      weight: (id = 'G', sym = ['G']) => sc.force({ id, kind: 'g', at: [c[0] - 6, c[1]], dir: [0, 1], sym, lab: [6, 6] }),
      normal: (id = 'N', sym = ['N']) => sc.force({ id, kind: 'n', at: [c[0] + 6, y0], dir: [0, -1], sym, lab: [8, 4] }),
      friction: (id = 'R', sym = ['R']) => sc.force({ id, kind: 'r', at: [x0 + 0.3 * bw, y0], dir: [-1, 0], sym, lab: [-4, 16] }),
    };
  }
  // Fills in the magnitudes of a scene's forces from { id: value }.
  const sized = (sc, mags) => { sc.forces.forEach((s) => { if (mags[s.id] != null) s.mag = mags[s.id]; }); return sc; };

  const restUp = {
    id: 'rest-up', difficulty: 1, still: true,
    make(r) {
      const m = pick(r, [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]), dir = pick(r, ['up', 'down']);
      const list = [2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 25, 30, 40, 50].filter((F) => F >= 0.1 * m * G && F <= (dir === 'up' ? 0.85 : 1.2) * m * G);
      return list.length ? { m, dir, F: pick(r, list) } : null;
    },
    solve(p) {
      const FG = p.m * G;
      return { G: FG, N: p.dir === 'up' ? FG - p.F : FG + p.F };
    },
    fields: () => [field('G'), field('N')],
    title: (p) => (p.dir === 'up' ? L('Lifted, but not enough', 'Angehoben, aber zu wenig') : L('Pressed onto the floor', 'Auf den Boden gedrückt')),
    text: (p) => (p.dir === 'up'
      ? L(`A box with a mass of ${kg(p.m)} stands still on the floor. A rope pulls it vertically upwards with a force of ${q(p.F, 'N')}.`,
        `Eine Kiste mit der Masse ${kg(p.m)} steht still auf dem Boden. Ein Seil zieht sie mit einer Kraft von ${q(p.F, 'N')} senkrecht nach oben.`)
      : L(`A box with a mass of ${kg(p.m)} stands still on the floor. A hand pushes it vertically downwards with a force of ${q(p.F, 'N')}.`,
        `Eine Kiste mit der Masse ${kg(p.m)} steht still auf dem Boden. Eine Hand drückt sie mit einer Kraft von ${q(p.F, 'N')} senkrecht nach unten.`)),
    scene(p, v) {
      const b = floorBox(p.m, null);
      b.weight(); b.normal();
      // the rope pulls at the top, in line with the weight; the hand pushes on the top, right of the normal force
      if (p.dir === 'up') b.sc.force({ id: 'F', kind: 's', at: b.at(b.bw / 2 - 6, b.bh), dir: [0, -1], sym: ['F'], value: q(p.F, 'N'), task: 'value', lab: [-8, 4] });
      else b.sc.force({ id: 'F', kind: 's', at: b.at(b.bw / 2 + 20, b.bh), dir: [0, 1], max: 0.75 * b.bh, labTail: true, sym: ['F'], value: q(p.F, 'N'), task: 'value', lab: [6, -12] });
      return sized(b.sc, { G: v.G, N: v.N, F: p.F });
    },
    hints: (p) => [
      L('Find all forces on the box: its weight, the force of the floor and the force of the rope or hand.', 'Bestimme alle Kräfte auf die Kiste: die Gewichtskraft, die Kraft des Bodens und die Kraft des Seils bzw. der Hand.'),
      L(`The box stands still, so the net force on it is zero: the upward forces balance the downward ones.`, `Die Kiste ruht, also ist die resultierende Kraft null: Die Kräfte nach oben heben die Kräfte nach unten auf.`),
      p.dir === 'up' ? m$(`${T('N')} + ${T('F')} = ${T('G')}`) : m$(`${T('N')} = ${T('G')} + ${T('F')}`),
    ],
    nums(p, v) {
      const up = p.dir === 'up', FG = p.m * G;
      return [num$('N', L('The normal force of the floor:', 'Die Normalkraft des Bodens:'), T('N'), 'N', v.N,
        `${T('m')}\\,g ${up ? '-' : '+'} ${T('F')} = ${tq(FG, 'N')} ${up ? '-' : '+'} ${tq(p.F, 'N')} = ${tq(v.N, 'N')}`, [
          [up ? FG + p.F : FG - p.F, 'dir', up ? L('The rope pulls up: it carries part of the weight, so the floor pushes less than the weight, not more.', 'Das Seil zieht nach oben: Es trägt einen Teil der Gewichtskraft, darum drückt der Boden weniger als die Gewichtskraft, nicht mehr.')
            : L('The hand pushes down: the floor has to hold the hand as well, so it pushes more than the weight, not less.', 'Die Hand drückt nach unten: Der Boden muss auch die Hand halten, darum drückt er mehr als die Gewichtskraft, nicht weniger.')],
          [FG, 'flatN', WRONG.flatN()],
          [p.F, 'other', up ? L('That is the force of the rope, not of the floor.', 'Das ist die Kraft des Seils, nicht die des Bodens.') : L('That is the force of the hand, not of the floor.', 'Das ist die Kraft der Hand, nicht die des Bodens.')],
        ])];
    },
    steps(p, v) {
      const up = p.dir === 'up';
      return [
        step(L('Weight', 'Gewichtskraft'), `<p>${L('The Earth pulls the box down with', 'Die Erde zieht die Kiste nach unten mit')} $$${T('G')} = ${T('m')}\\,g = ${tq(p.m, 'kg')}\\cdot ${tq(G, 'a')} = ${res(v.G, 'N')}.$$</p>`, ['G']),
        step(L('Forces on the box', 'Kräfte auf die Kiste'),
          `<p>${up ? L(`The rope pulls up with ${m$(T('F'))}, the floor pushes up with the normal force ${m$(T('N'))}.`, `Das Seil zieht mit ${m$(T('F'))} nach oben, der Boden drückt mit der Normalkraft ${m$(T('N'))} nach oben.`)
            : L(`The hand pushes down with ${m$(T('F'))}, the floor pushes up with the normal force ${m$(T('N'))}.`, `Die Hand drückt mit ${m$(T('F'))} nach unten, der Boden drückt mit der Normalkraft ${m$(T('N'))} nach oben.`)}</p>`,
          ['G', 'F', 'N'], ['F', 'N']),
        step(L('Balance', 'Gleichgewicht'),
          `<p>${L('The box stands still, so the net force is zero: up equals down.', 'Die Kiste ruht, also ist die resultierende Kraft null: Die Kräfte nach oben sind gleich gross wie die nach unten.')}</p>` +
          (up ? `$$${T('N')} + ${T('F')} = ${T('G')} \\;\\Rightarrow\\; ${T('N')} = ${T('G')} - ${T('F')} = ${tq(v.G, 'N')} - ${tq(p.F, 'N')} = ${res(v.N, 'N')}$$`
            : `$$${T('N')} = ${T('G')} + ${T('F')} = ${tq(v.G, 'N')} + ${tq(p.F, 'N')} = ${res(v.N, 'N')}$$`) +
          `<p>${up ? L('The rope carries part of the weight, so the floor has to push less.', 'Das Seil trägt einen Teil der Gewichtskraft, darum muss der Boden weniger stark drücken.')
            : L('The floor has to hold the box and the hand.', 'Der Boden muss die Kiste und die Hand halten.')}</p>`,
          ['G', 'F', 'N'], ['N']),
      ];
    },
  };

  const restAngle = {
    id: 'rest-angle', difficulty: 2, trig: true, still: true,
    make(r, o = {}) {
      const m = pick(r, [1, 1.5, 2, 2.5, 3, 4, 5, 6]), ref = pick(r, ['v', 'h']), alpha = o.nice ? pick(r, [30, 37, 53, 60]) : pick(r, [20, 25, 30, 35, 40, 45, 50, 60]);
      const F = pick(r, o.nice ? [5, 10, 15, 20, 25, 30, 40, 50] : [4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 25, 30, 40]);
      const p = o.nice ? { m, F, alpha, ref, nice: true } : { m, F, alpha, ref };
      const up = F * (ref === 'v' ? cosOf(p) : sinOf(p));
      if (up > 0.8 * m * G || F * Math.min(sinOf(p), cosOf(p)) < 1.5 || (o.nice && F < 0.4 * m * G)) return null; // (practice: a pull large enough to draw its components)
      if (o.nice && F * (ref === 'v' ? sinOf(p) : cosOf(p)) > m * G - up) return null; // static friction at most the normal force (μ ≤ 1)
      return p;
    },
    solve(p) {
      const [up, side] = p.ref === 'v' ? [cosOf(p), sinOf(p)] : [sinOf(p), cosOf(p)];
      return { N: p.m * G - p.F * up, R: p.F * side };
    },
    fields: () => [field('N'), field('R', '', L('static friction force', 'Haftreibungskraft'))],
    comps: (p) => [
      { key: 'up', what: L('The vertical component of the pull:', 'Die senkrechte Komponente der Zugkraft:'), sym: 'F_\\uparrow', base: T('F'), baseVal: p.F, fn: p.ref === 'v' ? 'cos' : 'sin', fig: 'Fv' },
      { key: 'side', what: L('The horizontal component of the pull:', 'Die waagrechte Komponente der Zugkraft:'), sym: 'F_\\rightarrow', base: T('F'), baseVal: p.F, fn: p.ref === 'v' ? 'sin' : 'cos', fig: 'Fh' },
    ],
    title: () => L('Pulled at an angle', 'Schräg gezogen'),
    text: (p) => L(`A box with a mass of ${kg(p.m)} stands still on the floor, although a rope pulls on it with a force of ${q(p.F, 'N')}, at an angle of ${q(p.alpha, 'deg')} to the ${p.ref === 'v' ? 'vertical' : 'horizontal'}.`,
      `Eine Kiste mit der Masse ${kg(p.m)} steht still auf dem Boden, obwohl ein Seil mit einer Kraft von ${q(p.F, 'N')} unter einem Winkel von ${q(p.alpha, 'deg')} zur ${p.ref === 'v' ? 'Senkrechten' : 'Waagrechten'} an ihr zieht.`),
    scene(p, v) {
      const b = floorBox(p.m, null), a = rad(p.alpha);
      b.weight(); b.normal(); b.friction();
      const top = b.at(b.bw / 2, b.bh);
      const dir = p.ref === 'v' ? [Math.sin(a), -Math.cos(a)] : [Math.cos(a), -Math.sin(a)];
      if (p.ref === 'v') { b.sc.line(top[0], top[1], top[0], top[1] - 62, 'w dash'); b.sc.angle(top, 34, 90 - p.alpha, 90, angleLabel(p), 16); }
      else { b.sc.line(top[0], top[1], top[0] + 70, top[1], 'w dash'); b.sc.angle(top, 34, 0, p.alpha, angleLabel(p), 16); }
      b.sc.force({ id: 'F', kind: 's', at: top, dir, sym: ['F'], value: q(p.F, 'N'), task: 'value', lab: [8, -6] });
      // its components, drawn once identified (and in the solution)
      const [cu, cs] = p.ref === 'v' ? [cosOf(p), sinOf(p)] : [sinOf(p), cosOf(p)];
      b.sc.force({ id: 'Fv', kind: 'comp', at: top, dir: [0, -1], sym: ['F', '↑'], value: q(p.F * cu, 'N'), lab: [-8, 2] });
      b.sc.force({ id: 'Fh', kind: 'comp', at: top, dir: [1, 0], sym: ['F', '→'], value: q(p.F * cs, 'N'), lab: [4, 14] });
      return sized(b.sc, { G: p.m * G, N: v.N, R: v.R, F: p.F, Fv: p.F * cu, Fh: p.F * cs });
    },
    hints: (p) => [
      L('Split the pull into a vertical and a horizontal component.', 'Zerlege die Zugkraft in eine senkrechte und eine waagrechte Komponente.'),
      L('The box stands still: vertically, the floor and the pull together balance the weight; horizontally, static friction balances the pull.', 'Die Kiste ruht: Senkrecht halten Boden und Zugkraft zusammen der Gewichtskraft das Gleichgewicht, waagrecht hält die Haftreibung der Zugkraft das Gleichgewicht.'),
      p.ref === 'v' ? L(`The angle is measured from the vertical: the vertical component is ${m$(`${T('F')}\\cos\\alpha`)}.`, `Der Winkel ist von der Senkrechten aus gemessen: Die senkrechte Komponente ist ${m$(`${T('F')}\\cos\\alpha`)}.`)
        : L(`The angle is measured from the horizontal: the vertical component is ${m$(`${T('F')}\\sin\\alpha`)}.`, `Der Winkel ist von der Waagrechten aus gemessen: Die senkrechte Komponente ist ${m$(`${T('F')}\\sin\\alpha`)}.`),
    ],
    nums(p, v) {
      const FG = p.m * G, [up, side] = p.ref === 'v' ? [cosOf(p), sinOf(p)] : [sinOf(p), cosOf(p)], fn = p.ref === 'v' ? '\\cos' : '\\sin';
      return [num$('N', L('The normal force of the floor:', 'Die Normalkraft des Bodens:'), T('N'), 'N', v.N,
        `${T('m')}\\,g - ${T('F')}${fn}\\alpha = ${tq(FG, 'N')} - ${tq(p.F * up, 'N')} = ${tq(v.N, 'N')}`, [
          [FG - p.F * side, 'swap', WRONG.swap()],
          [FG - p.F, 'whole', L('Only the vertical component of the pull carries part of the weight, not the whole pull.', 'Nur die senkrechte Komponente der Zugkraft trägt einen Teil der Gewichtskraft, nicht die ganze Zugkraft.')],
          [FG, 'flatN', WRONG.flatN()],
          [FG + p.F * up, 'dir', L('The rope pulls upwards: it carries part of the weight, so the floor pushes less than the weight, not more.', 'Das Seil zieht nach oben: Es trägt einen Teil der Gewichtskraft, darum drückt der Boden weniger als die Gewichtskraft, nicht mehr.')],
        ])];
    },
    steps(p, v) {
      const [up, sd] = p.ref === 'v' ? ['\\cos', '\\sin'] : ['\\sin', '\\cos'];
      const FG = p.m * G;
      return [
        step(L('Forces on the box', 'Kräfte auf die Kiste'),
          `<p>${L(`Weight ${m$(`${T('G')} = ${T('m')}\\,g = ${tq(FG, 'N')}`)} down, the pull ${m$(T('F'))} at an angle, the normal force ${m$(T('N'))} up, and static friction ${m$(T('R'))} along the floor, against the horizontal part of the pull.`,
            `Gewichtskraft ${m$(`${T('G')} = ${T('m')}\\,g = ${tq(FG, 'N')}`)} nach unten, die Zugkraft ${m$(T('F'))} schräg, die Normalkraft ${m$(T('N'))} nach oben und die Haftreibung ${m$(T('R'))} entlang des Bodens, gegen den waagrechten Teil der Zugkraft.`)}</p>`,
          ['G', 'F', 'N', 'R']),
        step(L('Components of the pull', 'Komponenten der Zugkraft'),
          `<p>${L(`The angle is measured from the ${p.ref === 'v' ? 'vertical' : 'horizontal'}, so`, `Der Winkel ist von der ${p.ref === 'v' ? 'Senkrechten' : 'Waagrechten'} aus gemessen, also`)}</p>` +
          `$$F_\\uparrow = ${T('F')}${up}\\alpha = ${tq(p.F, 'N')}\\cdot ${trig(up.slice(1), p)} = ${tq(FG - v.N, 'N')}$$` +
          `$$F_\\rightarrow = ${T('F')}${sd}\\alpha = ${tq(p.F, 'N')}\\cdot ${trig(sd.slice(1), p)} = ${tq(v.R, 'N')}$$`,
          ['F', 'Fv', 'Fh'], ['Fv', 'Fh']),
        step(L('Vertical: balance', 'Senkrecht: Gleichgewicht'),
          `<p>${L('The box stands still, so up equals down:', 'Die Kiste ruht, also sind die Kräfte nach oben und unten gleich gross:')}</p>` +
          `$$${T('N')} + F_\\uparrow = ${T('G')} \\;\\Rightarrow\\; ${T('N')} = ${T('m')}\\,g - ${T('F')}${up}\\alpha = ${tq(FG, 'N')} - ${tq(FG - v.N, 'N')} = ${res(v.N, 'N')}$$`,
          ['G', 'F', 'N'], ['G', 'N']),
        step(L('Horizontal: balance', 'Waagrecht: Gleichgewicht'),
          `<p>${L('Horizontally, too, the forces balance: static friction holds the box against the horizontal part of the pull.', 'Auch waagrecht heben sich die Kräfte auf: Die Haftreibung hält die Kiste gegen den waagrechten Teil der Zugkraft fest.')}</p>` +
          `$$${T('R')} = F_\\rightarrow = ${T('F')}${sd}\\alpha = ${res(v.R, 'N')}$$`,
          ['G', 'F', 'N', 'R'], ['R']),
      ];
    },
  };

  const pullFriction = {
    id: 'pull-friction', difficulty: 2,
    make(r) {
      const m = pick(r, [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]), mu = pick(r, [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]);
      if (r() < 0.5) return { m, mu, given: 'a', a: pick(r, [0.5, 1, 1.5, 2, 2.5, 3, 4]) };
      const lo = Math.ceil(mu * m * G + 0.5 * m), hi = Math.floor(mu * m * G + 4 * m);
      if (hi < lo) return null;
      return { m, mu, given: 'F', F: lo + Math.floor(r() * (hi - lo + 1)) };
    },
    solve(p) {
      const R = p.mu * p.m * G;
      if (p.given === 'a') return { res: p.m * p.a, R, F: p.m * p.a + R };
      return { R, res: p.F - R, a: (p.F - R) / p.m };
    },
    fields: (p) => (p.given === 'a' ? [field('res', '', L('net force on the box', 'resultierende Kraft auf die Kiste')), field('R'), field('F')] : [field('R'), field('res', '', L('net force on the box', 'resultierende Kraft auf die Kiste')), field('a')]),
    title: () => L('Pulled across the floor', 'Über den Boden gezogen'),
    text: (p) => L(`A box with a mass of ${kg(p.m)} is pulled horizontally across the floor${p.given === 'a' ? `, with an acceleration of ${q(p.a, 'a')}` : ` with a force of ${q(p.F, 'N')}`}. The coefficient of kinetic friction between box and floor is ${num(p.mu, 2)}.`,
      `Eine Kiste mit der Masse ${kg(p.m)} wird ${p.given === 'a' ? `mit einer Beschleunigung von ${q(p.a, 'a')} ` : `mit einer Kraft von ${q(p.F, 'N')} `}horizontal über den Boden gezogen. Die Gleitreibungszahl zwischen Kiste und Boden beträgt ${num(p.mu, 2)}.`),
    scene(p, v) {
      const b = floorBox(p.m, p.mu);
      b.weight(); b.normal(); b.friction();
      const right = b.at(b.bw, b.bh / 2), top = b.at(b.bw / 2, b.bh);
      const F = p.given === 'a' ? v.F : p.F;
      b.sc.force({ id: 'F', kind: 's', at: right, dir: [1, 0], sym: ['F'], value: q(F, 'N'), task: p.given === 'F' ? 'value' : 'sym', lab: [0, -12] });
      b.sc.accel({ id: 'a', at: [top[0] - 76, top[1] - 18], dir: [1, 0], sym: ['a'], value: q(p.a || v.a, 'a'), task: p.given === 'a' ? 'value' : 'sym', lab: [0, -12] });
      return sized(b.sc, { G: p.m * G, N: p.m * G, R: v.R, F });
    },
    hints: (p) => [
      L('Find all forces on the box. Vertically, weight and normal force balance; horizontally, the pull and friction act.', 'Bestimme alle Kräfte auf die Kiste. Senkrecht heben sich Gewichtskraft und Normalkraft auf, waagrecht wirken Zugkraft und Reibung.'),
      L(`Friction: ${m$(`${T('R')} = ${T('mu')}\\,${T('N')}`)}, and here the normal force equals the weight.`, `Reibung: ${m$(`${T('R')} = ${T('mu')}\\,${T('N')}`)}, und hier ist die Normalkraft gleich der Gewichtskraft.`),
      L(`Only what is left of the pull after friction accelerates the box: ${m$(`${T('res')} = ${T('F')} - ${T('R')} = ${T('m')}\\,${T('a')}`)}.`, `Nur was nach Abzug der Reibung von der Zugkraft übrig bleibt, beschleunigt die Kiste: ${m$(`${T('res')} = ${T('F')} - ${T('R')} = ${T('m')}\\,${T('a')}`)}.`),
    ],
    nums(p, v) {
      const R = v.R, fric = L('Friction is μ times the normal force, μ m g: do not forget g.', 'Die Reibung ist μ mal die Normalkraft, μ m g: Vergiss g nicht.');
      if (p.given === 'a') {
        const ma = p.m * p.a;
        return [num$('F', L('The pulling force:', 'Die Zugkraft:'), T('F'), 'N', v.F,
          `${T('m')}\\,${T('a')} + ${T('mu')}\\,${T('m')}\\,g = ${tq(ma, 'N')} + ${tq(R, 'N')} = ${tq(v.F, 'N')}`, [
            [ma, 'noFric', WRONG.noFric()],
            [R, 'balance', L('The box accelerates: the pull has to overcome friction and provide the net force m a as well.', 'Die Kiste wird beschleunigt: Die Zugkraft muss die Reibung überwinden und zusätzlich die resultierende Kraft m a liefern.')],
            [ma - R, 'dir', L('Friction acts against the pull: the pull has to be larger than m a, not smaller.', 'Die Reibung wirkt gegen die Zugkraft: Die Zugkraft muss grösser sein als m a, nicht kleiner.')],
            [ma + p.mu * p.m, 'fric', fric],
          ])];
      }
      return [num$('a', L('The acceleration:', 'Die Beschleunigung:'), T('a'), 'a', v.a,
        `\\frac{${T('F')} - ${T('mu')}\\,${T('m')}\\,g}{${T('m')}} = \\frac{${tq(p.F, 'N')} - ${tq(R, 'N')}}{${tq(p.m, 'kg')}} = ${tq(v.a, 'a')}`, [
          [p.F / p.m, 'noFric', WRONG.noFric()],
          [(p.F + R) / p.m, 'dir', L('Friction acts against the pull: subtract it.', 'Die Reibung wirkt gegen die Zugkraft: Zieh sie ab.')],
          [p.F - R, 'net', WRONG.net()],
          [(p.F - p.mu * p.m) / p.m, 'fric', fric],
        ])];
    },
    steps(p, v) {
      const FG = p.m * G, all = ['G', 'N', 'R', 'F', 'a'];
      const s = [
        step(L('Forces on the box', 'Kräfte auf die Kiste'),
          `<p>${L(`Weight ${m$(T('G'))} down, normal force ${m$(T('N'))} up, the pull ${m$(T('F'))} forward and friction ${m$(T('R'))} backward, against the motion.`, `Gewichtskraft ${m$(T('G'))} nach unten, Normalkraft ${m$(T('N'))} nach oben, die Zugkraft ${m$(T('F'))} nach vorn und die Reibung ${m$(T('R'))} nach hinten, gegen die Bewegung.`)}</p>`,
          ['G', 'N', 'R', 'F']),
        step(L('Vertical: balance', 'Senkrecht: Gleichgewicht'),
          `<p>${L('The box does not move up or down, so the normal force balances the weight:', 'Die Kiste bewegt sich weder nach oben noch nach unten, also hält die Normalkraft der Gewichtskraft das Gleichgewicht:')} $$${T('N')} = ${T('G')} = ${T('m')}\\,g = ${tq(FG, 'N')}$$</p>`,
          ['G', 'N', 'R', 'F'], ['G', 'N']),
        step(L('Friction', 'Reibung'),
          `<p>${L('The box slides over the floor, so friction acts against the motion: the friction coefficient times the normal force, which here equals the weight:', 'Die Kiste gleitet über den Boden, also wirkt die Reibung gegen die Bewegung: die Reibungszahl mal die Normalkraft, die hier gleich der Gewichtskraft ist:')}</p>` +
          `$$${T('R')} = ${T('mu')}\\,${T('N')} = ${T('mu')}\\,${T('m')}\\,g = ${FS.texNum(p.mu, 2)}\\cdot${tq(FG, 'N')} = ${res(v.R, 'N')}$$`,
          ['G', 'N', 'R', 'F'], ['R']),
      ];
      if (p.given === 'a') {
        s.push(step(L('Newton’s second law', 'Aktionsprinzip'),
          `<p>${L('The net force accelerates the box:', 'Die resultierende Kraft beschleunigt die Kiste:')} $$${T('res')} = ${T('m')}\\,${T('a')} = ${tq(p.m, 'kg')}\\cdot${tq(p.a, 'a')} = ${res(v.res, 'N')}$$</p>`, all, ['a']));
        s.push(step(L('Pulling force', 'Zugkraft'),
          `<p>${L('The pull has to overcome friction and provide the net force:', 'Die Zugkraft muss die Reibung überwinden und die resultierende Kraft liefern:')}</p>$$${T('res')} = ${T('F')} - ${T('R')} \\;\\Rightarrow\\; ${T('F')} = ${T('m')}\\,${T('a')} + ${T('mu')}\\,${T('m')}\\,g = ${tq(v.res, 'N')} + ${tq(v.R, 'N')} = ${res(v.F, 'N')}$$`, all, ['F', 'R']));
      } else {
        s.push(step(L('Net force', 'Resultierende Kraft'),
          `<p>${L('Pull and friction point in opposite directions:', 'Zugkraft und Reibung zeigen in entgegengesetzte Richtungen:')} $$${T('res')} = ${T('F')} - ${T('R')} = ${tq(p.F, 'N')} - ${tq(v.R, 'N')} = ${res(v.res, 'N')}$$</p>`, all, ['F', 'R']));
        s.push(step(L('Newton’s second law', 'Aktionsprinzip'),
          `<p>${L('Only the net force accelerates the box: divide it by the mass.', 'Nur die resultierende Kraft beschleunigt die Kiste: Teile sie durch die Masse.')}</p>` +
          `$$${T('a')} = \\frac{${T('res')}}{${T('m')}} = \\frac{${T('F')} - ${T('mu')}\\,${T('m')}\\,g}{${T('m')}} = \\frac{${tq(v.res, 'N')}}{${tq(p.m, 'kg')}} = ${res(v.a, 'a')}$$`, all, ['a']));
      }
      return s;
    },
  };

  // ---------------------------------------------------------------- two boxes on the floor
  function floorPair(p, gap) {
    const w = 720, h = 330, sc = new Scene(w, h, L('Two boxes on the floor', 'Zwei Kisten auf dem Boden'));
    const y0 = h - 80, [w1, h1] = dims(p.m1, [p.m1, p.m2]), [w2, h2] = dims(p.m2, [p.m1, p.m2]);
    const x1 = (w - w1 - gap - w2) / 2, x2 = x1 + w1 + gap;
    sc.surface([30, y0], [w - 30, y0]);
    const at1 = sc.box([x1, y0], [1, 0], [0, -1], w1, h1, kg(p.m1));
    const at2 = sc.box([x2, y0], [1, 0], [0, -1], w2, h2, kg(p.m2));
    const c1 = at1(w1 / 2, h1 / 2), c2 = at2(w2 / 2, h2 / 2);
    for (const [i, c] of [[1, c1], [2, c2]]) {
      sc.force({ id: `G${i}`, kind: 'g', at: [c[0] - 6, c[1]], dir: [0, 1], sym: ['G', i], lab: [6, 6] });
      sc.force({ id: `N${i}`, kind: 'n', at: [c[0] + 6, y0], dir: [0, -1], sym: ['N', i], lab: [7, 4] });
      sc.force({ id: `R${i}`, kind: 'r', at: [c[0] - 0.2 * (i === 1 ? w1 : w2), y0], dir: [-1, 0], sym: ['R', i], lab: [-4, 16] });
    }
    const top = Math.min(at1(0, h1)[1], at2(0, h2)[1]);
    sc.accel({ id: 'a', at: [x1 + 4, top - 22], dir: [1, 0], sym: ['a'], value: p.a != null ? q(p.a, 'a') : '', task: p.a != null ? 'value' : 'sym', lab: [0, -12] });
    return { sc, at1, at2, w1, h1, w2, h2, y0, x1, x2 };
  }

  const pushPair = {
    id: 'push-pair', difficulty: 3,
    boxes: (p) => [L(`the left box (${kg(p.m1)})`, `die linke Kiste (${kg(p.m1)})`), L(`the right box (${kg(p.m2)})`, `die rechte Kiste (${kg(p.m2)})`)],
    make(r) {
      const m1 = pick(r, [1, 2, 3, 4, 5, 6]), m2 = pick(r, [1, 1.5, 2, 3, 4]);
      const mu = r() < 0.5 ? 0 : pick(r, [0.1, 0.2, 0.3]);
      const fr = mu * (m1 + m2) * G;
      const F = Math.round(fr + (m1 + m2) * pick(r, [0.5, 1, 1.5, 2, 3, 4]));
      return F > fr + 0.3 * (m1 + m2) ? { m1, m2, mu, F } : null;
    },
    solve(p) {
      const M = p.m1 + p.m2, net = p.F - p.mu * M * G, a = net / M;
      const v = { res: net, a, K: p.m2 * a + p.mu * p.m2 * G };
      if (p.mu) v.R = p.mu * M * G;
      return v;
    },
    fields: (p) => [...(p.mu ? [field('R', '', L('total friction force', 'gesamte Reibungskraft'))] : []), field('res'), field('a'), field('K', '', L('force of the left box on the right box', 'Kraft der linken auf die rechte Kiste'))],
    title: () => L('Pushing two boxes', 'Zwei Kisten schieben'),
    text: (p) => L(`Two boxes with masses of ${kg(p.m1)} (left) and ${kg(p.m2)} (right) stand next to each other on the floor. A force of ${q(p.F, 'N')} pushes the left box horizontally to the right, so that it pushes the right box along. ${p.mu ? `The coefficient of kinetic friction for both boxes is ${num(p.mu, 2)}.` : 'There is no friction.'}`,
      `Zwei Kisten mit den Massen ${kg(p.m1)} (links) und ${kg(p.m2)} (rechts) stehen nebeneinander auf dem Boden. Die linke Kiste wird mit einer Kraft von ${q(p.F, 'N')} horizontal nach rechts geschoben und schiebt dabei die rechte Kiste vor sich her. ${p.mu ? `Die Gleitreibungszahl beträgt für beide Kisten ${num(p.mu, 2)}.` : 'Es gibt keine Reibung.'}`),
    // In the free-body diagram, the boxes are drawn apart, so that each contact force sits on its box.
    scene(p, v, view = {}) {
      const b = floorPair(p, view.task ? 0 : 64), sc = b.sc;
      if (p.mu) sc.text(36, b.y0 + 22, `${svgSym('mu')} = ${num(p.mu, 2)}`, 'lbl small', 'start'); // else the text says: no friction
      sc.force({ id: 'F', kind: 's', at: b.at1(0, 0.36 * b.h1), dir: [1, 0], sym: ['F'], value: q(p.F, 'N'), task: 'value', lab: [0, -12] });
      const hm = Math.min(b.h1, b.h2);
      sc.force({ id: 'K2', kind: 'k', at: [b.x2, b.y0 - 0.38 * hm], dir: [1, 0], sym: ['K'], lab: [0, -12] });
      sc.force({ id: 'K1', kind: 'k', at: [b.x1 + b.w1, b.y0 - 0.62 * hm], dir: [-1, 0], sym: ['K'], lab: [0, -12] });
      return sized(sc, { G1: p.m1 * G, G2: p.m2 * G, N1: p.m1 * G, N2: p.m2 * G, R1: p.mu * p.m1 * G, R2: p.mu * p.m2 * G, F: p.F, K1: v.K, K2: v.K });
    },
    hints: (p) => [
      L('First look at both boxes together: they move together, with the same acceleration.', 'Betrachte zuerst beide Kisten zusammen: Sie bewegen sich gemeinsam, mit derselben Beschleunigung.'),
      L(`For both boxes together, ${m$(`${T('res')} = ${p.mu ? `${T('F')} - ${T('R')}` : T('F')}`)} and ${m$(`${T('res')} = (${T('m')}_1 + ${T('m')}_2)\\,${T('a')}`)}.`, `Für beide Kisten zusammen gilt ${m$(`${T('res')} = ${p.mu ? `${T('F')} - ${T('R')}` : T('F')}`)} und ${m$(`${T('res')} = (${T('m')}_1 + ${T('m')}_2)\\,${T('a')}`)}.`),
      L(`Then look at the right box alone: only ${m$(T('K'))}${p.mu ? ' and its own friction act' : ' acts'} on it horizontally, and it has the same acceleration.`, `Betrachte dann die rechte Kiste allein: Waagrecht wirkt auf sie nur ${m$(T('K'))}${p.mu ? ' und ihre eigene Reibung' : ''}, und sie hat dieselbe Beschleunigung.`),
    ],
    steps(p, v) {
      const M = p.m1 + p.m2, fr = p.mu > 0;
      const vert = ['G1', 'N1', 'G2', 'N2'], hor = fr ? ['F', 'R1', 'R2'] : ['F'], all = [...vert, ...hor, 'K1', 'K2', 'a'];
      const s = [
        step(L('Forces', 'Kräfte'),
          `<p>${L(`On each box: its weight and the normal force from the floor, which balance${fr ? ', and friction against the motion' : ''}. The push ${m$(T('F'))} acts on the left box only. Where the boxes touch, they push each other with ${m$(T('K'))}: the left box pushes the right one forward, the right box pushes the left one back.`,
            `Auf jede Kiste: ihre Gewichtskraft und die Normalkraft des Bodens, die sich aufheben${fr ? ', und die Reibung gegen die Bewegung' : ''}. Die Kraft ${m$(T('F'))} wirkt nur auf die linke Kiste. Wo sich die Kisten berühren, drücken sie mit ${m$(T('K'))} aufeinander: Die linke Kiste schiebt die rechte nach vorn, die rechte drückt die linke zurück.`)}</p>`,
          [...vert, ...hor, 'K1', 'K2']),
      ];
      if (fr) {
        s.push(step(L('Friction', 'Reibung'),
          `<p>${L('Both boxes slide over the floor. For the two together, the friction is the friction coefficient times their total normal force, which equals their total weight:', 'Beide Kisten gleiten über den Boden. Für beide zusammen ist die Reibung die Reibungszahl mal ihre gesamte Normalkraft, die gleich ihrer gesamten Gewichtskraft ist:')}</p>` +
          `$$${T('R')} = ${T('mu')}\\,(${T('m')}_1 + ${T('m')}_2)\\,g = ${FS.texNum(p.mu, 2)}\\cdot${tq(M, 'kg')}\\cdot${tq(G, 'a')} = ${res(v.R, 'N')}$$`, all.filter((x) => x !== 'a'), ['R1', 'R2']));
      }
      s.push(step(L('Both boxes together', 'Beide Kisten zusammen'),
        `<p>${L('Seen as one system, the two forces between the boxes cancel: they are internal forces. Only the push' + (fr ? ' and friction' : '') + ' remain:', 'Als ein System betrachtet, heben sich die beiden Kräfte zwischen den Kisten auf: Es sind innere Kräfte. Es bleiben nur die äussere Kraft' + (fr ? ' und die Reibung' : '') + ':')}</p>` +
        `$$${T('res')} = ${fr ? `${T('F')} - ${T('R')} = ${tq(p.F, 'N')} - ${tq(v.R, 'N')} = ` : `${T('F')} = `}${res(v.res, 'N')}$$` +
        `$$${T('a')} = \\frac{${T('res')}}{${T('m')}_1 + ${T('m')}_2} = \\frac{${tq(v.res, 'N')}}{${tq(M, 'kg')}} = ${res(v.a, 'a')}$$`,
        all, ['F', ...(fr ? ['R1', 'R2'] : []), 'a']));
      s.push(step(L('The right box alone', 'Die rechte Kiste allein'),
        `<p>${L(`The right box is accelerated only by ${m$(T('K'))}${fr ? ', minus its own friction' : ''}:`, `Die rechte Kiste wird nur durch ${m$(T('K'))} beschleunigt${fr ? ', abzüglich ihrer eigenen Reibung' : ''}:`)}</p>` +
        `$$${fr ? `${T('K')} - ${T('mu')}\\,${T('m')}_2\\,g = ${T('m')}_2\\,${T('a')} \\;\\Rightarrow\\; ${T('K')} = ${T('m')}_2\\,(${T('a')} + ${T('mu')}\\,g)` : `${T('K')} = ${T('m')}_2\\,${T('a')}`} = ${res(v.K, 'N')}$$` +
        `<p>${L(`The left box passes on only part of the push; the rest, ${m$(`${T('F')} - ${T('K')} = ${tq(p.F - v.K, 'N')}`)}, accelerates${fr ? ' and drags' : ''} the left box itself.`, `Die linke Kiste gibt nur einen Teil der Kraft weiter; der Rest, ${m$(`${T('F')} - ${T('K')} = ${tq(p.F - v.K, 'N')}`)}, beschleunigt${fr ? ' und schleift' : ''} die linke Kiste selbst.`)}</p>`,
        all, ['K2', ...(fr ? ['R2'] : [])]));
      return s;
    },
  };

  const ropePair = {
    id: 'rope-pair', difficulty: 3,
    boxes: (p) => [L(`the left box (${kg(p.m1)})`, `die linke Kiste (${kg(p.m1)})`), L(`the right box (${kg(p.m2)})`, `die rechte Kiste (${kg(p.m2)})`)],
    forceOn: { F: 1 }, // the pull acts on the right box
    make(r) {
      const m1 = pick(r, [2, 3, 4, 5, 6]), m2 = pick(r, [1, 2, 3, 4]);
      const mu1 = pick(r, [0.1, 0.2, 0.3, 0.4, 0.5]), mu2 = r() < 0.6 ? 0 : pick(r, [0.1, 0.2, 0.3]);
      const fr = (mu1 * m1 + mu2 * m2) * G;
      const F = Math.round(fr + (m1 + m2) * pick(r, [0.5, 1, 1.5, 2, 3]));
      return F > fr + 0.3 * (m1 + m2) ? { m1, m2, mu1, mu2, F } : null;
    },
    solve(p) {
      const R1 = p.mu1 * p.m1 * G, R2 = p.mu2 * p.m2 * G, net = p.F - R1 - R2, a = net / (p.m1 + p.m2);
      const v = { R1, res: net, a, S: p.m1 * a + R1 };
      if (p.mu2) v.R2 = R2;
      return v;
    },
    fields: (p) => [field('R', 1, L('friction on the left box', 'Reibung auf die linke Kiste')), ...(p.mu2 ? [field('R', 2, L('friction on the right box', 'Reibung auf die rechte Kiste'))] : []), field('res'), field('a'), field('S')],
    title: () => L('Two boxes on a rope', 'Zwei Kisten am Seil'),
    text: (p) => L(`Two boxes with masses of ${kg(p.m1)} (left) and ${kg(p.m2)} (right) are joined by a rope. A force of ${q(p.F, 'N')} pulls the right box horizontally to the right. The coefficient of kinetic friction is ${num(p.mu1, 2)} for the left box and ${num(p.mu2, 2)} for the right box.`,
      `Zwei Kisten mit den Massen ${kg(p.m1)} (links) und ${kg(p.m2)} (rechts) sind durch ein Seil verbunden. Eine Kraft von ${q(p.F, 'N')} zieht die rechte Kiste horizontal nach rechts. Die Gleitreibungszahl beträgt ${num(p.mu1, 2)} für die linke und ${num(p.mu2, 2)} für die rechte Kiste.`),
    scene(p, v) {
      const b = floorPair(p, 110), sc = b.sc;
      const yr = b.y0 - Math.min(b.h1, b.h2) / 2;
      sc.line(b.x1 + b.w1, yr, b.x2, yr, 'w rope');
      sc.text(b.x1 - 6, b.y0 + 40, `${svgSym('mu')} = ${num(p.mu1, 2)}`, 'lbl small', 'end');
      sc.text(b.x2 - 6, b.y0 + 40, `${svgSym('mu')} = ${num(p.mu2, 2)}`, 'lbl small', 'end');
      sc.force({ id: 'S1', kind: 'k', at: [b.x1 + b.w1, yr], dir: [1, 0], sym: ['S'], lab: [-4, 18] });
      sc.force({ id: 'S2', kind: 'k', at: [b.x2, yr], dir: [-1, 0], sym: ['S'], lab: [4, -12] });
      sc.force({ id: 'F', kind: 's', at: b.at2(b.w2, b.h2 / 2), dir: [1, 0], sym: ['F'], value: q(p.F, 'N'), task: 'value', lab: [0, -12] });
      return sized(sc, { G1: p.m1 * G, G2: p.m2 * G, N1: p.m1 * G, N2: p.m2 * G, R1: v.R1, R2: p.mu2 * p.m2 * G, F: p.F, S1: v.S, S2: v.S });
    },
    hints: (p) => [
      L('Friction on each box: coefficient times normal force, and here the normal force equals the weight of that box.', 'Reibung auf jede Kiste: Reibungszahl mal Normalkraft, und hier ist die Normalkraft gleich der Gewichtskraft der Kiste.'),
      L(`Both boxes together: ${m$(`${T('res')} = ${T('F')} - ${T('R', 1)}${p.mu2 ? ` - ${T('R', 2)}` : ''} = (${T('m')}_1 + ${T('m')}_2)\\,${T('a')}`)}; the rope forces are internal and cancel.`, `Beide Kisten zusammen: ${m$(`${T('res')} = ${T('F')} - ${T('R', 1)}${p.mu2 ? ` - ${T('R', 2)}` : ''} = (${T('m')}_1 + ${T('m')}_2)\\,${T('a')}`)}; die Seilkräfte sind innere Kräfte und heben sich auf.`),
      L(`The left box alone: the rope pulls it forward, friction holds it back, ${m$(`${T('S')} - ${T('R', 1)} = ${T('m')}_1\\,${T('a')}`)}.`, `Die linke Kiste allein: Das Seil zieht sie nach vorn, die Reibung hält sie zurück, ${m$(`${T('S')} - ${T('R', 1)} = ${T('m')}_1\\,${T('a')}`)}.`),
    ],
    steps(p, v) {
      const M = p.m1 + p.m2, f2 = p.mu2 > 0;
      const vert = ['G1', 'N1', 'G2', 'N2'], all = [...vert, 'R1', 'R2', 'F', 'S1', 'S2', 'a'];
      return [
        step(L('Forces', 'Kräfte'),
          `<p>${L(`On each box: weight and normal force, which balance, and friction against the motion${f2 ? '' : ' (none on the right box)'}. The rope pulls the left box forward with ${m$(T('S'))} and the right box back with the same force. The pull ${m$(T('F'))} acts on the right box.`,
            `Auf jede Kiste: Gewichtskraft und Normalkraft, die sich aufheben, und die Reibung gegen die Bewegung${f2 ? '' : ' (keine auf die rechte Kiste)'}. Das Seil zieht die linke Kiste mit ${m$(T('S'))} nach vorn und die rechte mit gleich grosser Kraft zurück. Die Zugkraft ${m$(T('F'))} wirkt auf die rechte Kiste.`)}</p>`,
          all.filter((x) => x !== 'a')),
        step(L('Friction', 'Reibung'),
          `<p>${L('A box sliding over the floor feels friction against its motion: its friction coefficient times its normal force, which here equals its weight:', 'Eine Kiste, die über den Boden gleitet, erfährt Reibung gegen ihre Bewegung: ihre Reibungszahl mal ihre Normalkraft, die hier gleich ihrer Gewichtskraft ist:')}</p>` +
          `$$${T('R', 1)} = ${T('mu', 1)}\\,${T('m')}_1\\,g = ${FS.texNum(p.mu1, 2)}\\cdot${tq(p.m1 * G, 'N')} = ${res(v.R1, 'N')}$$` +
          (f2 ? `$$${T('R', 2)} = ${T('mu', 2)}\\,${T('m')}_2\\,g = ${FS.texNum(p.mu2, 2)}\\cdot${tq(p.m2 * G, 'N')} = ${res(v.R2, 'N')}$$` : ''),
          all.filter((x) => x !== 'a'), ['R1', 'R2']),
        step(L('Both boxes together', 'Beide Kisten zusammen'),
          `<p>${L('The rope forces are internal forces of the system and cancel. The pull minus friction accelerates both boxes:', 'Die Seilkräfte sind innere Kräfte des Systems und heben sich auf. Die Zugkraft minus die Reibung beschleunigt beide Kisten:')}</p>` +
          `$$${T('res')} = ${T('F')} - ${T('R', 1)}${f2 ? ` - ${T('R', 2)}` : ''} = ${res(v.res, 'N')}$$` +
          `$$${T('a')} = \\frac{${T('res')}}{${T('m')}_1 + ${T('m')}_2} = \\frac{${tq(v.res, 'N')}}{${tq(M, 'kg')}} = ${res(v.a, 'a')}$$`,
          all, ['F', 'R1', 'R2', 'a']),
        step(L('The left box alone', 'Die linke Kiste allein'),
          `<p>${L('Only the rope pulls the left box forward; friction holds it back:', 'Nur das Seil zieht die linke Kiste nach vorn, die Reibung hält sie zurück:')}</p>` +
          `$$${T('S')} - ${T('R', 1)} = ${T('m')}_1\\,${T('a')} \\;\\Rightarrow\\; ${T('S')} = ${T('m')}_1\\,${T('a')} + ${T('R', 1)} = ${tq(p.m1 * v.a, 'N')} + ${tq(v.R1, 'N')} = ${res(v.S, 'N')}$$`,
          all, ['S1', 'R1']),
      ];
    },
  };

  // ---------------------------------------------------------------- pulleys
  const atwood = {
    id: 'atwood', difficulty: 3,
    boxes: (p) => [L(`the left box (${kg(p.m1)})`, `die linke Kiste (${kg(p.m1)})`), L(`the right box (${kg(p.m2)})`, `die rechte Kiste (${kg(p.m2)})`)],
    make(r) {
      const ms = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 12], m1 = pick(r, ms), m2 = pick(r, ms);
      // at most 6 times heavier, so that both boxes fit the drawing (sizes follow the masses)
      return m1 === m2 || Math.max(m1, m2) > 6 * Math.min(m1, m2) ? null : { m1, m2 };
    },
    solve(p) {
      const hv = Math.max(p.m1, p.m2), lt = Math.min(p.m1, p.m2), net = (hv - lt) * G, a = net / (p.m1 + p.m2);
      return { res: net, a, S: lt * (G + a) };
    },
    fields: () => [field('res'), field('a'), field('S')],
    title: () => L('Two boxes over a pulley', 'Zwei Kisten über eine Rolle'),
    text: (p) => L(`Two boxes hang from a rope over a pulley: ${kg(p.m1)} on the left and ${kg(p.m2)} on the right. The pulley and the rope have no mass and there is no friction.`,
      `Zwei Kisten hängen an einem Seil über einer Rolle: ${kg(p.m1)} links und ${kg(p.m2)} rechts. Rolle und Seil sind masselos, und es gibt keine Reibung.`),
    scene(p, v) {
      const sc = new Scene(440, 400, L('Two boxes over a pulley', 'Zwei Kisten über eine Rolle'));
      // the lighter box hangs higher; the pulley is just wide enough for the heavier box's rope to pass it
      const [wl, hl] = dims(Math.min(p.m1, p.m2), [p.m1, p.m2]), r = Math.max(28, wl / 4 + 8), cx = 220, cy = 24 + r;
      sc.surface([cx - r - 40, 14], [cx + r + 40, 14], -1); sc.line(cx, 14, cx, cy, 'w');
      sc.pulley(cx, cy, r);
      const heavyLeft = p.m1 > p.m2;
      const box = (i, m, x, ytop) => {
        const [bw, bh] = dims(m, [p.m1, p.m2]), at = sc.box([x - bw / 2, ytop + bh], [1, 0], [0, -1], bw, bh, kg(m));
        sc.line(x, cy, x, ytop, 'w rope');
        const c = at(bw / 2, bh / 2), down = (i === 1) === heavyLeft;
        sc.force({ id: `G${i}`, kind: 'g', at: c, dir: [0, 1], sym: ['G', i], lab: [8, 6] });
        sc.force({ id: `S${i}`, kind: 'k', at: [x, ytop], dir: [0, -1], sym: ['S'], lab: [8, 10] });
        const ax = i === 1 ? x - bw / 2 - 22 : x + bw / 2 + 22;
        sc.accel({ id: `a${i}`, at: [ax, c[1] + (down ? -23 : 23)], dir: [0, down ? 1 : -1], sym: ['a'], task: 'sym', lab: [i === 1 ? -8 : 8, 0] });
      };
      const yl = cy + r + 36, yh = yl + hl + 24;
      box(1, p.m1, cx - r, heavyLeft ? yh : yl);
      box(2, p.m2, cx + r, heavyLeft ? yl : yh);
      return sized(sc, { G1: p.m1 * G, G2: p.m2 * G, S1: v.S, S2: v.S });
    },
    hints: () => [
      L('The heavier box goes down, the lighter one up, both with the same acceleration.', 'Die schwerere Kiste sinkt, die leichtere steigt, beide mit derselben Beschleunigung.'),
      L(`Seen as one system along the rope, the difference of the two weights accelerates both masses: ${m$(`${T('res')} = (${T('m')}_\\text{heavy} - ${T('m')}_\\text{light})\\,g`)}.`, `Als ein System entlang des Seils betrachtet, beschleunigt die Differenz der Gewichtskräfte beide Massen: ${m$(`${T('res')} = (${T('m')}_\\text{schwer} - ${T('m')}_\\text{leicht})\\,g`)}.`),
      L(`For the rope force, look at one box alone, e.g. the lighter one: ${m$(`${T('S')} - ${T('m')}\\,g = ${T('m')}\\,${T('a')}`)}.`, `Für die Seilkraft betrachte eine Kiste allein, z.B. die leichtere: ${m$(`${T('S')} - ${T('m')}\\,g = ${T('m')}\\,${T('a')}`)}.`),
    ],
    steps(p, v) {
      const hi = p.m1 > p.m2 ? 1 : 2, lo = 3 - hi, mh = Math.max(p.m1, p.m2), ml = Math.min(p.m1, p.m2), all = ['G1', 'G2', 'S1', 'S2', 'a1', 'a2'];
      return [
        step(L('Forces', 'Kräfte'),
          `<p>${L(`On each box: its weight down and the rope force up. The rope is massless, so it pulls both boxes with the same force ${m$(T('S'))}.`, `Auf jede Kiste: ihre Gewichtskraft nach unten und die Seilkraft nach oben. Das Seil ist masselos, also zieht es beide Kisten mit derselben Kraft ${m$(T('S'))}.`)}</p>`,
          ['G1', 'G2', 'S1', 'S2']),
        step(L('Both boxes together', 'Beide Kisten zusammen'),
          `<p>${L(`The ${kg(mh)} box goes down, the ${kg(ml)} box up. Along the rope, the weight of the heavier box drives the motion, the weight of the lighter box acts against it; the rope forces are internal and cancel.`, `Die Kiste mit ${kg(mh)} sinkt, die mit ${kg(ml)} steigt. Entlang des Seils treibt die Gewichtskraft der schwereren Kiste die Bewegung an, die der leichteren wirkt dagegen; die Seilkräfte sind innere Kräfte und heben sich auf.`)}</p>` +
          `$$${T('res')} = ${T('G', hi)} - ${T('G', lo)} = (${T('m')}_${hi} - ${T('m')}_${lo})\\,g = ${tq(mh * G, 'N')} - ${tq(ml * G, 'N')} = ${res(v.res, 'N')}$$`,
          all, [`G${hi}`, `G${lo}`]),
        step(L('Acceleration', 'Beschleunigung'),
          `<p>${L('The net force accelerates both masses:', 'Die resultierende Kraft beschleunigt beide Massen:')}</p>$$${T('a')} = \\frac{${T('res')}}{${T('m')}_1 + ${T('m')}_2} = \\frac{${tq(v.res, 'N')}}{${tq(p.m1 + p.m2, 'kg')}} = ${res(v.a, 'a')}$$`,
          all, ['a1', 'a2']),
        step(L('Rope force', 'Seilkraft'),
          `<p>${L(`The lighter box alone: the rope pulls it up, its weight down, and it accelerates upwards:`, `Die leichtere Kiste allein: Das Seil zieht sie nach oben, die Gewichtskraft nach unten, und sie wird nach oben beschleunigt:`)}</p>` +
          `$$${T('S')} - ${T('m')}_${lo}\\,g = ${T('m')}_${lo}\\,${T('a')} \\;\\Rightarrow\\; ${T('S')} = ${T('m')}_${lo}\\,(g + ${T('a')}) = ${tq(ml, 'kg')}\\cdot${tq(G + v.a, 'a')} = ${res(v.S, 'N')}$$` +
          `<p>${L(`Check with the heavier box: ${m$(`${T('m')}_${hi}\\,(g - ${T('a')}) = ${tq(mh * (G - v.a), 'N')}`)}. The rope force lies between the two weights.`, `Kontrolle mit der schwereren Kiste: ${m$(`${T('m')}_${hi}\\,(g - ${T('a')}) = ${tq(mh * (G - v.a), 'N')}`)}. Die Seilkraft liegt zwischen den beiden Gewichtskräften.`)}</p>`,
          all, [`S${lo}`, `G${lo}`, `a${lo}`]),
      ];
    },
  };

  const tablePulley = {
    id: 'table-pulley', difficulty: 4,
    boxes: (p) => [L(`the box on the table (${kg(p.m1)})`, `die Kiste auf dem Tisch (${kg(p.m1)})`), L(`the hanging box (${kg(p.m2)})`, `die hängende Kiste (${kg(p.m2)})`)],
    make(r, o = {}) {
      const m1 = pick(r, [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]), m2 = pick(r, o.nice ? [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9] : [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6]), mu = pick(r, [0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
      if (Math.max(m1, m2) > 6 * Math.min(m1, m2)) return null; // see atwood
      if (o.nice && m1 === m2) return null; // in practice: friction μ m₂ g would be right by chance
      return m2 * G > mu * m1 * G + 0.3 * (m1 + m2) ? { m1, m2, mu } : null;
    },
    solve(p) {
      const R = p.mu * p.m1 * G, net = p.m2 * G - R, a = net / (p.m1 + p.m2);
      return { R, res: net, a, S: p.m1 * a + R };
    },
    fields: () => [field('R', '', L('friction on the box on the table', 'Reibung auf die Kiste auf dem Tisch')), field('res'), field('a'), field('S')],
    title: () => L('Pulled off the table', 'Vom Tisch gezogen'),
    text: (p) => L(`A box with a mass of ${kg(p.m1)} lies on a table. A rope runs from it over a pulley at the edge of the table to a hanging box with a mass of ${kg(p.m2)}, which pulls it along. The coefficient of kinetic friction between box and table is ${num(p.mu, 2)}.`,
      `Eine Kiste mit der Masse ${kg(p.m1)} liegt auf einem Tisch. Ein Seil führt von ihr über eine Rolle an der Tischkante zu einer hängenden Kiste mit der Masse ${kg(p.m2)}, die sie mitzieht. Die Gleitreibungszahl zwischen Kiste und Tisch beträgt ${num(p.mu, 2)}.`),
    scene(p, v) {
      const sc = new Scene(480, 420, L('A box on a table, pulled by a hanging box', 'Eine Kiste auf einem Tisch, von einer hängenden Kiste gezogen'));
      const y0 = 200, xe = 350, r = 16, [w1, h1] = dims(p.m1, [p.m1, p.m2]), x1 = 100;
      const yr = y0 - h1 / 2, cx = xe + 4, cy = yr + r;
      sc.surface([20, y0], [xe, y0]); sc.surface([xe, y0], [xe, y0 + 60], 1, 'w');
      sc.line(xe - 6, y0, cx, cy, 'w'); sc.pulley(cx, cy, r);
      const at1 = sc.box([x1, y0], [1, 0], [0, -1], w1, h1, kg(p.m1));
      sc.text(28, y0 + 42, `${svgSym('mu')} = ${num(p.mu, 2)}`, 'lbl small', 'start');
      sc.line(x1 + w1, yr, cx, yr, 'w rope');
      const [w2, h2] = dims(p.m2, [p.m1, p.m2]), x2 = cx + r, ytop = y0 + 90;
      sc.line(x2, cy, x2, ytop, 'w rope');
      const at2 = sc.box([x2 - w2 / 2, ytop + h2], [1, 0], [0, -1], w2, h2, kg(p.m2));
      const c1 = at1(w1 / 2, h1 / 2), c2 = at2(w2 / 2, h2 / 2);
      sc.force({ id: 'G1', kind: 'g', at: [c1[0] - 6, c1[1]], dir: [0, 1], sym: ['G', 1], lab: [6, 6] });
      sc.force({ id: 'N', kind: 'n', at: [c1[0] + 6, y0], dir: [0, -1], sym: ['N'], lab: [8, 4] });
      sc.force({ id: 'R', kind: 'r', at: [x1 + 0.3 * w1, y0], dir: [-1, 0], sym: ['R'], lab: [-4, 16] });
      sc.force({ id: 'S1', kind: 'k', at: [x1 + w1, yr], dir: [1, 0], sym: ['S'], lab: [0, -10] });
      sc.force({ id: 'G2', kind: 'g', at: c2, dir: [0, 1], sym: ['G', 2], lab: [8, 6] });
      sc.force({ id: 'S2', kind: 'k', at: [x2, ytop], dir: [0, -1], sym: ['S'], lab: [8, 10] });
      sc.accel({ id: 'a1', at: [c1[0] - 23, y0 - h1 - 16], dir: [1, 0], sym: ['a'], task: 'sym', lab: [0, -12] });
      sc.accel({ id: 'a2', at: [x2 + w2 / 2 + 22, c2[1] - 23], dir: [0, 1], sym: ['a'], task: 'sym', lab: [8, 0] });
      return sized(sc, { G1: p.m1 * G, N: p.m1 * G, R: v.R, S1: v.S, G2: p.m2 * G, S2: v.S });
    },
    hints: () => [
      L('The weight of the hanging box drives both boxes; friction on the table holds them back.', 'Die Gewichtskraft der hängenden Kiste treibt beide Kisten an; die Reibung auf dem Tisch bremst sie.'),
      L(`Along the rope: ${m$(`${T('res')} = ${T('m')}_2\\,g - ${T('R')} = (${T('m')}_1 + ${T('m')}_2)\\,${T('a')}`)}.`, `Entlang des Seils: ${m$(`${T('res')} = ${T('m')}_2\\,g - ${T('R')} = (${T('m')}_1 + ${T('m')}_2)\\,${T('a')}`)}.`),
      L(`The box on the table alone: ${m$(`${T('S')} - ${T('R')} = ${T('m')}_1\\,${T('a')}`)}.`, `Die Kiste auf dem Tisch allein: ${m$(`${T('S')} - ${T('R')} = ${T('m')}_1\\,${T('a')}`)}.`),
    ],
    nums(p, v) {
      const M = p.m1 + p.m2, W = p.m2 * G;
      return [
        num$('a', L('The acceleration:', 'Die Beschleunigung:'), T('a'), 'a', v.a,
          `\\frac{${T('m')}_2\\,g - ${T('mu')}\\,${T('m')}_1\\,g}{${T('m')}_1 + ${T('m')}_2} = \\frac{${tq(W, 'N')} - ${tq(v.R, 'N')}}{${tq(M, 'kg')}} = ${tq(v.a, 'a')}`, [
            [W / M, 'noFric', WRONG.noFric()],
            [v.res / p.m2, 'mass', WRONG.mass()],
            [(W + v.R) / M, 'dir', L('Friction acts against the motion: subtract it.', 'Die Reibung wirkt gegen die Bewegung: Zieh sie ab.')],
            [v.res / p.m1, 'mass', WRONG.mass()],
          ]),
        num$('S', L('The rope force:', 'Die Seilkraft:'), T('S'), 'N', v.S,
          `${T('m')}_1\\,${T('a')} + ${T('R')} = ${tq(p.m1 * v.a, 'N')} + ${tq(v.R, 'N')} = ${tq(v.S, 'N')}`, [
            [W, 'rope', WRONG.rope()],
            [p.m1 * v.a, 'noFric', L('Friction on the box on the table is missing: the rope has to overcome it as well.', 'Die Reibung auf die Kiste auf dem Tisch fehlt: Das Seil muss sie auch überwinden.')],
            [p.m2 * (G + v.a), 'dir', L('The hanging box accelerates downwards: the rope holds it with less than its weight, not more.', 'Die hängende Kiste wird nach unten beschleunigt: Das Seil hält sie mit weniger als ihrer Gewichtskraft, nicht mit mehr.')],
          ]),
      ];
    },
    steps(p, v) {
      const all = ['G1', 'N', 'R', 'S1', 'G2', 'S2', 'a1', 'a2'];
      return [
        step(L('Forces', 'Kräfte'),
          `<p>${L(`On the box on the table: weight and normal force, which balance, friction ${m$(T('R'))} backwards and the rope force ${m$(T('S'))} forwards. On the hanging box: its weight down and the rope force up. The pulley only turns the rope around: the rope pulls both boxes with the same force.`,
            `Auf die Kiste auf dem Tisch: Gewichtskraft und Normalkraft, die sich aufheben, die Reibung ${m$(T('R'))} nach hinten und die Seilkraft ${m$(T('S'))} nach vorn. Auf die hängende Kiste: ihre Gewichtskraft nach unten und die Seilkraft nach oben. Die Rolle lenkt das Seil nur um: Es zieht beide Kisten mit derselben Kraft.`)}</p>`,
          all.filter((x) => x[0] !== 'a')),
        step(L('Friction', 'Reibung'),
          `<p>${L('Only the box on the table rubs: its friction is the friction coefficient times its normal force, which equals its weight, as the table is level:', 'Nur die Kiste auf dem Tisch reibt: Ihre Reibung ist die Reibungszahl mal ihre Normalkraft, die gleich ihrer Gewichtskraft ist, weil der Tisch waagrecht ist:')}</p>` +
          `$$${T('R')} = ${T('mu')}\\,${T('N')} = ${T('mu')}\\,${T('m')}_1\\,g = ${FS.texNum(p.mu, 2)}\\cdot${tq(p.m1 * G, 'N')} = ${res(v.R, 'N')}$$`,
          all.filter((x) => x[0] !== 'a'), ['N', 'R']),
        step(L('Both boxes together', 'Beide Kisten zusammen'),
          `<p>${L('Along the rope, the weight of the hanging box drives the motion and friction acts against it:', 'Entlang des Seils treibt die Gewichtskraft der hängenden Kiste die Bewegung an, und die Reibung wirkt dagegen:')}</p>` +
          `$$${T('res')} = ${T('m')}_2\\,g - ${T('R')} = ${tq(p.m2 * G, 'N')} - ${tq(v.R, 'N')} = ${res(v.res, 'N')}$$` +
          `$$${T('a')} = \\frac{${T('res')}}{${T('m')}_1 + ${T('m')}_2} = \\frac{${tq(v.res, 'N')}}{${tq(p.m1 + p.m2, 'kg')}} = ${res(v.a, 'a')}$$`,
          all, ['G2', 'R', 'a1', 'a2']),
        step(L('Rope force', 'Seilkraft'),
          `<p>${L('The box on the table alone:', 'Die Kiste auf dem Tisch allein:')}</p>` +
          `$$${T('S')} - ${T('R')} = ${T('m')}_1\\,${T('a')} \\;\\Rightarrow\\; ${T('S')} = ${T('m')}_1\\,${T('a')} + ${T('R')} = ${tq(p.m1 * v.a, 'N')} + ${tq(v.R, 'N')} = ${res(v.S, 'N')}$$` +
          `<p>${L(`Check with the hanging box: ${m$(`${T('m')}_2\\,(g - ${T('a')}) = ${tq(p.m2 * (G - v.a), 'N')}`)}, less than its weight, because it accelerates downwards.`, `Kontrolle mit der hängenden Kiste: ${m$(`${T('m')}_2\\,(g - ${T('a')}) = ${tq(p.m2 * (G - v.a), 'N')}`)}, weniger als ihre Gewichtskraft, weil sie nach unten beschleunigt wird.`)}</p>`,
          all, ['S1', 'S2']),
      ];
    },
  };

  // ---------------------------------------------------------------- slopes
  // A slope rising to the right at angle α from the corner O; the box sits at distance s along it.
  function slope(p, w, h, len, o, label, groundEnd) {
    const sc = new Scene(w, h, label), a = rad(p.alpha);
    const u = [Math.cos(a), -Math.sin(a)], n = [-Math.sin(a), -Math.cos(a)];
    const top = [o[0] + len * u[0], o[1] + len * u[1]];
    sc.poly([o, top, [top[0], o[1]]], 'slope');
    sc.surface([o[0] - 20, o[1]], [groundEnd || top[0] + 20, o[1]]);
    sc.angle(o, 40, 0, p.alpha, angleLabel(p), 16);
    return { sc, u, n, top };
  }
  // The box on the slope with weight (and its components), normal force and friction.
  function slopeBox(sl, p, o, s, m, i = '', ms = [m]) {
    const { sc, u, n } = sl, [bw, bh] = dims(m, ms);
    const base = [o[0] + s * u[0], o[1] + s * u[1]];
    const at = sc.box(base, u, n, bw, bh, kg(m), true);
    const c = at(bw / 2, bh / 2);
    // the coefficient of friction inside the slope, clear of the box and its arrows
    const mu = [o[0] + 0.8 * (sl.top[0] - o[0]) + 28 * n[0] * -1, o[1] + 0.8 * (sl.top[1] - o[1]) + 28 * n[1] * -1];
    sc.text(mu[0], mu[1], `${svgSym('mu')} = ${num(p.mu, 2)}`, 'lbl small', 'end');
    sc.force({ id: 'G', kind: 'g', at: c, dir: [0, 1], sym: ['G', i], lab: [8, 10] }); // (its label right of the tip, clear of friction)
    sc.force({ id: 'Gp', kind: 'comp', at: c, dir: [-u[0], -u[1]], sym: ['G', i ? `${i}∥` : '∥'], lab: [-6, -8] });
    sc.force({ id: 'Gn', kind: 'comp', at: c, dir: [-n[0], -n[1]], sym: ['G', i ? `${i}⊥` : '⊥'], lab: [8, 6] });
    sc.force({ id: 'N', kind: 'n', at: at(bw / 2 + 6, 0), dir: n, sym: ['N'], lab: [-8, -4] });
    sc.force({ id: 'R', kind: 'r', at: at(0.3 * bw, 0), dir: [-u[0], -u[1]], sym: ['R'], lab: [-8, -6] });
    return { at, bw, bh, c, mags: { G: m * G, Gp: m * G * sinOf(p), Gn: m * G * cosOf(p), N: m * G * cosOf(p) } };
  }
  // a slope: steeper than 50° is no slope to pull a box up; with o.nice, 30° or 37°
  const slopeMake = (r, o = {}) => ({
    alpha: o.nice ? pick(r, [30, 37]) : pick(r, [15, 20, 25, 30, 35, 40, 45]),
    mu: pick(r, o.nice ? [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5] : [0.1, 0.2, 0.3, 0.4, 0.5]), ...(o.nice ? { nice: true } : {}),
  });
  const slopeComps = (p, i = '') => [
    { key: 'Gp', what: L(`The component of the weight${i ? ' of box 1' : ''} along the slope:`, `Die Komponente der Gewichtskraft${i ? ' von Kiste 1' : ''} entlang der Unterlage:`), sym: T('G', `${i}∥`), base: `${T('m')}${i ? `_${i}` : ''}\\,g`, baseVal: (i ? p.m1 : p.m) * G, fn: 'sin', fig: 'Gp' },
    { key: 'Gn', what: L(`The component of the weight${i ? ' of box 1' : ''} perpendicular to the slope:`, `Die Komponente der Gewichtskraft${i ? ' von Kiste 1' : ''} senkrecht zur Unterlage:`), sym: T('G', `${i}⊥`), base: `${T('m')}${i ? `_${i}` : ''}\\,g`, baseVal: (i ? p.m1 : p.m) * G, fn: 'cos', fig: 'Gn' },
  ];

  const inclinePull = {
    id: 'incline-pull', difficulty: 4, trig: true,
    make(r, o = {}) {
      return { ...slopeMake(r, o), m: pick(r, [1, 2, 3, 4, 5, 6, 8]), a: r() < 0.2 ? 0 : pick(r, [0.5, 1, 1.5, 2, 3]) };
    },
    solve(p) {
      const N = p.m * G * cosOf(p), R = p.mu * N;
      return { res: p.m * p.a, N, R, F: p.m * p.a + p.m * G * sinOf(p) + R };
    },
    fields: () => [field('res', '', L('net force on the box', 'resultierende Kraft auf die Kiste')), field('N'), field('R'), field('F')],
    comps: (p) => slopeComps(p),
    title: () => L('Pulled up a slope', 'Den Hang hinauf gezogen'),
    text: (p) => L(`A box with a mass of ${kg(p.m)} is pulled up a slope of ${q(p.alpha, 'deg')} by a rope parallel to the slope${p.a ? `, with an acceleration of ${q(p.a, 'a')}` : ', at constant speed'}. The coefficient of kinetic friction is ${num(p.mu, 2)}.`,
      `Eine Kiste mit der Masse ${kg(p.m)} wird von einem Seil parallel zur Unterlage ${p.a ? `mit einer Beschleunigung von ${q(p.a, 'a')} ` : 'mit konstanter Geschwindigkeit '}einen Hang mit ${q(p.alpha, 'deg')} Neigung hinaufgezogen. Die Gleitreibungszahl beträgt ${num(p.mu, 2)}.`),
    scene(p, v) {
      const a = rad(p.alpha), len = Math.min(440, 250 / Math.sin(a)), o = [50, 290];
      const w = Math.ceil(o[0] + len * Math.cos(a) + 70), sl = slope(p, w, 320, len, o, L('A box on a slope', 'Eine Kiste auf einer schiefen Ebene'));
      const b = slopeBox(sl, p, o, len * 0.38, p.m);
      sl.sc.force({ id: 'F', kind: 's', at: b.at(b.bw, b.bh / 2), dir: sl.u, sym: ['F'], task: 'sym', lab: [-6, -12] });
      if (p.a) sl.sc.accel({ id: 'a', at: b.at(b.bw / 2 - 23, b.bh + 18), dir: sl.u, sym: ['a'], value: q(p.a, 'a'), task: 'value', lab: [-6, -12] });
      return sized(sl.sc, { ...b.mags, R: v.R, F: v.F });
    },
    hints: (p) => [
      L('Split the weight into a component down the slope and one perpendicular to it.', 'Zerlege die Gewichtskraft in eine Komponente hangabwärts und eine senkrecht zur Unterlage.'),
      L(`Perpendicular to the slope, nothing moves: ${m$(`${T('N')} = ${T('m')}\\,g\\cos\\alpha`)}; friction ${m$(`${T('R')} = ${T('mu')}\\,${T('N')}`)}.`, `Senkrecht zur Unterlage bewegt sich nichts: ${m$(`${T('N')} = ${T('m')}\\,g\\cos\\alpha`)}; Reibung ${m$(`${T('R')} = ${T('mu')}\\,${T('N')}`)}.`),
      L(`Along the slope: ${m$(`${T('F')} - ${T('m')}\\,g\\sin\\alpha - ${T('R')} = ${T('m')}\\,${T('a')}`)}.`, `Entlang der Unterlage: ${m$(`${T('F')} - ${T('m')}\\,g\\sin\\alpha - ${T('R')} = ${T('m')}\\,${T('a')}`)}.`),
    ],
    nums(p, v) {
      const FG = p.m * G, ma = p.m * p.a, Gp = FG * sinOf(p), Gn = FG * cosOf(p);
      return [num$('F', L('The pulling force:', 'Die Zugkraft:'), T('F'), 'N', v.F,
        `${T('m')}\\,${T('a')} + ${T('m')}\\,g\\sin\\alpha + ${T('mu')}\\,${T('m')}\\,g\\cos\\alpha = ${tq(ma, 'N')} + ${tq(Gp, 'N')} + ${tq(v.R, 'N')} = ${tq(v.F, 'N')}`, [
          [ma + v.R, 'noSlope', WRONG.noSlope()],
          [ma + Gp, 'noFric', WRONG.noFric()],
          [ma + Gn + p.mu * Gp, 'swap', WRONG.swap()],
          [ma + Gp + p.mu * FG, 'flatN', L('On the slope, the normal force is m g cos α, not m g: friction is μ m g cos α.', 'Auf der schiefen Ebene ist die Normalkraft m g cos α, nicht m g: Die Reibung ist μ m g cos α.')],
        ])];
    },
    steps(p, v) {
      const FG = p.m * G, all = ['G', 'N', 'R', 'F', 'a'];
      return [
        step(L('Forces', 'Kräfte'),
          `<p>${L(`Weight ${m$(`${T('G')} = ${tq(FG, 'N')}`)} straight down, the normal force ${m$(T('N'))} perpendicular to the slope, friction ${m$(T('R'))} down the slope (against the motion) and the pull ${m$(T('F'))} up the slope.`, `Gewichtskraft ${m$(`${T('G')} = ${tq(FG, 'N')}`)} senkrecht nach unten, die Normalkraft ${m$(T('N'))} senkrecht zur Unterlage, die Reibung ${m$(T('R'))} hangabwärts (gegen die Bewegung) und die Zugkraft ${m$(T('F'))} hangaufwärts.`)}</p>`,
          ['G', 'N', 'R', 'F']),
        step(L('Components of the weight', 'Komponenten der Gewichtskraft'),
          `<p>${L('Split the weight into a part along the slope and a part perpendicular to it:', 'Zerlege die Gewichtskraft in einen Teil entlang und einen Teil senkrecht zur Unterlage:')}</p>` +
          `$$${T('G', '∥')} = ${T('m')}\\,g\\sin\\alpha = ${tq(FG, 'N')}\\cdot ${trig('sin', p)} = ${tq(FG * sinOf(p), 'N')}$$` +
          `$$${T('G', '⊥')} = ${T('m')}\\,g\\cos\\alpha = ${tq(FG, 'N')}\\cdot ${trig('cos', p)} = ${tq(FG * cosOf(p), 'N')}$$`,
          ['G', 'Gp', 'Gn', 'N', 'R', 'F'], ['G', 'Gp', 'Gn']),
        step(L('Perpendicular to the slope', 'Senkrecht zur Unterlage'),
          `<p>${L('The box does not move into the slope or away from it, so the normal force balances the perpendicular component:', 'Die Kiste bewegt sich weder in die Unterlage hinein noch von ihr weg, also hält die Normalkraft der senkrechten Komponente das Gleichgewicht:')}</p>` +
          `$$${T('N')} = ${T('G', '⊥')} = ${T('m')}\\,g\\cos\\alpha = ${res(v.N, 'N')}$$`,
          ['Gp', 'Gn', 'N', 'R', 'F'], ['Gn', 'N']),
        step(L('Friction', 'Reibung'),
          `<p>${L('The box slides up the slope, so friction acts down the slope: the friction coefficient times the normal force found above (not times the weight):', 'Die Kiste gleitet den Hang hinauf, also wirkt die Reibung hangabwärts: die Reibungszahl mal die oben bestimmte Normalkraft (nicht mal die Gewichtskraft):')}</p>` +
          `$$${T('R')} = ${T('mu')}\\,${T('N')} = ${FS.texNum(p.mu, 2)}\\cdot${tq(v.N, 'N')} = ${res(v.R, 'N')}$$`,
          ['Gp', 'Gn', 'N', 'R', 'F'], ['R']),
        step(L('Along the slope', 'Entlang der Unterlage'),
          `<p>${p.a ? L('The net force accelerates the box up the slope:', 'Die resultierende Kraft beschleunigt die Kiste hangaufwärts:') : L('The box moves at constant speed, so the net force is zero:', 'Die Kiste bewegt sich mit konstanter Geschwindigkeit, also ist die resultierende Kraft null:')}` +
          ` $$${T('res')} = ${T('m')}\\,${T('a')} = ${res(v.res, 'N')}$$</p>` +
          `<p>${L('The pull has to overcome the component down the slope and friction, and provide the net force:', 'Die Zugkraft muss die Hangabtriebskraft und die Reibung überwinden und die resultierende Kraft liefern:')}</p>` +
          `$$${T('F')} = ${T('m')}\\,${T('a')} + ${T('m')}\\,g\\sin\\alpha + ${T('R')} = ${tq(v.res, 'N')} + ${tq(FG * sinOf(p), 'N')} + ${tq(v.R, 'N')} = ${res(v.F, 'N')}$$`,
          ['Gp', 'Gn', 'N', 'R', 'F', 'a'], ['Gp', 'R', 'F']),
      ];
    },
  };

  const inclinePulley = {
    id: 'incline-pulley', difficulty: 5, trig: true,
    boxes: (p) => [L(`the box on the slope (${kg(p.m1)})`, `die Kiste auf dem Hang (${kg(p.m1)})`), L(`the hanging box (${kg(p.m2)})`, `die hängende Kiste (${kg(p.m2)})`)],
    make(r, o = {}) {
      // practice: 37° or 53° (a hanging box pulls a box up a steep slope as well)
      const sl = { ...slopeMake(r, o), ...(o.nice ? { alpha: pick(r, [37, 53]) } : {}) };
      const m1 = pick(r, o.nice ? [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6] : [1, 2, 3, 4, 5, 6]), m2 = pick(r, o.nice ? [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 8]), p = { ...sl, m1, m2 };
      const drive = m2 * G - m1 * G * (sinOf(p) + p.mu * cosOf(p));
      if (o.nice && m2 > 2 * m1) return null; // practice: the weight on the slope large enough to draw its components
      return drive > 0.3 * (m1 + m2) ? p : null;
    },
    solve(p) {
      const N = p.m1 * G * cosOf(p), R = p.mu * N;
      const net = p.m2 * G - p.m1 * G * sinOf(p) - R, acc = net / (p.m1 + p.m2);
      return { N, R, res: net, a: acc, S: p.m2 * (G - acc) };
    },
    comps: (p) => slopeComps(p, 1),
    fields: () => [field('N', '', L('normal force on the box on the slope', 'Normalkraft auf die Kiste auf der Unterlage')), field('R', '', L('friction on the box on the slope', 'Reibung auf die Kiste auf der Unterlage')), field('res'), field('a'), field('S')],
    title: () => L('Pulled up by a hanging box', 'Von einer hängenden Kiste hinaufgezogen'),
    text: (p) => L(`A box with a mass of ${kg(p.m1)} lies on a slope of ${q(p.alpha, 'deg')}. A rope parallel to the slope runs from it over a pulley at the top to a hanging box with a mass of ${kg(p.m2)}, which goes down and pulls the first box up the slope. The coefficient of kinetic friction on the slope is ${num(p.mu, 2)}.`,
      `Eine Kiste mit der Masse ${kg(p.m1)} liegt auf einer schiefen Ebene mit ${q(p.alpha, 'deg')} Neigung. Ein Seil parallel zur Unterlage führt von ihr über eine Rolle oben am Hang zu einer hängenden Kiste mit der Masse ${kg(p.m2)}, die sinkt und die erste Kiste den Hang hinaufzieht. Die Gleitreibungszahl auf der Unterlage beträgt ${num(p.mu, 2)}.`),
    scene(p, v) {
      const a = rad(p.alpha), len = Math.min(380, 230 / Math.sin(a)), o = [40, 300], r = 16;
      const sl0 = { w: Math.ceil(o[0] + len * Math.cos(a) + 120) };
      const [w2, h2] = dims(p.m2, [p.m1, p.m2]), endX = o[0] + len * Math.cos(a);
      const sl = slope(p, sl0.w, 440, len, o, L('A box on a slope, pulled by a hanging box', 'Eine Kiste auf einer schiefen Ebene, von einer hängenden Kiste gezogen'), endX);
      const { sc, u, n, top } = sl;
      const b = slopeBox(sl, p, o, len * 0.3, p.m1, 1, [p.m1, p.m2]);
      // the pulley sticks out past the top, so that the box hangs clear of the slope
      const d = b.bh / 2, out = Math.max(0, (w2 / 2 - r + 8 - (d - r) * n[0]) / u[0]);
      const C = [top[0] + (d - r) * n[0] + out * u[0], top[1] + (d - r) * n[1] + out * u[1]];
      sc.line(top[0], top[1], C[0], C[1], 'w'); sc.pulley(C[0], C[1], r);
      const att = b.at(b.bw, d), tan = [C[0] + r * n[0], C[1] + r * n[1]];
      sc.line(att[0], att[1], tan[0], tan[1], 'w rope');
      const x2 = C[0] + r, ytop = C[1] + 0.5 * (o[1] - C[1]);
      sc.line(x2, C[1], x2, ytop, 'w rope');
      const at2 = sc.box([x2 - w2 / 2, ytop + h2], [1, 0], [0, -1], w2, h2, kg(p.m2)), c2 = at2(w2 / 2, h2 / 2);
      sc.force({ id: 'S1', kind: 'k', at: att, dir: u, sym: ['S'], lab: [-6, -12] });
      sc.force({ id: 'G2', kind: 'g', at: c2, dir: [0, 1], sym: ['G', 2], lab: [8, 6] });
      sc.force({ id: 'S2', kind: 'k', at: [x2, ytop], dir: [0, -1], sym: ['S'], lab: [8, 10] });
      sc.accel({ id: 'a1', at: b.at(b.bw / 2 - 23, b.bh + 18), dir: u, sym: ['a'], task: 'sym', lab: [-6, -12] });
      sc.accel({ id: 'a2', at: [x2 + w2 / 2 + 20, c2[1] - 23], dir: [0, 1], sym: ['a'], task: 'sym', lab: [8, 0] });
      return sized(sc, { ...b.mags, R: v.R, S1: v.S, S2: v.S, G2: p.m2 * G });
    },
    hints: () => [
      L('The box on the slope: split its weight into a component down the slope and one perpendicular to it.', 'Die Kiste auf der Unterlage: Zerlege ihre Gewichtskraft in eine Komponente hangabwärts und eine senkrecht zur Unterlage.'),
      L(`Along the rope, the weight of the hanging box drives both boxes; the component down the slope and friction act against it: ${m$(`${T('res')} = ${T('m')}_2\\,g - ${T('m')}_1\\,g\\sin\\alpha - ${T('R')}`)}.`, `Entlang des Seils treibt die Gewichtskraft der hängenden Kiste beide Kisten an; Hangabtriebskraft und Reibung wirken dagegen: ${m$(`${T('res')} = ${T('m')}_2\\,g - ${T('m')}_1\\,g\\sin\\alpha - ${T('R')}`)}.`),
      L(`The hanging box alone: ${m$(`${T('m')}_2\\,g - ${T('S')} = ${T('m')}_2\\,${T('a')}`)}.`, `Die hängende Kiste allein: ${m$(`${T('m')}_2\\,g - ${T('S')} = ${T('m')}_2\\,${T('a')}`)}.`),
    ],
    nums(p, v) {
      const M = p.m1 + p.m2, W = p.m2 * G, F1 = p.m1 * G, Gp = F1 * sinOf(p), Gn = F1 * cosOf(p);
      return [
        num$('a', L('The acceleration:', 'Die Beschleunigung:'), T('a'), 'a', v.a,
          `\\frac{${T('m')}_2\\,g - ${T('m')}_1\\,g\\sin\\alpha - ${T('R')}}{${T('m')}_1 + ${T('m')}_2} = \\frac{${tq(W, 'N')} - ${tq(Gp, 'N')} - ${tq(v.R, 'N')}}{${tq(M, 'kg')}} = ${tq(v.a, 'a')}`, [
            [(W - v.R) / M, 'noSlope', WRONG.noSlope()],
            [(W - Gp) / M, 'noFric', WRONG.noFric()],
            [(W - Gn - p.mu * Gp) / M, 'swap', WRONG.swap()],
            [v.res / p.m2, 'mass', WRONG.mass()],
          ]),
        num$('S', L('The rope force:', 'Die Seilkraft:'), T('S'), 'N', v.S,
          `${T('m')}_2\\,(g - ${T('a')}) = ${tq(p.m2, 'kg')}\\cdot${tq(G - v.a, 'a')} = ${tq(v.S, 'N')}`, [
            [W, 'rope', WRONG.rope()],
            [p.m2 * (G + v.a), 'dir', L('The hanging box accelerates downwards: the rope holds it with less than its weight, not more.', 'Die hängende Kiste wird nach unten beschleunigt: Das Seil hält sie mit weniger als ihrer Gewichtskraft, nicht mit mehr.')],
            [p.m1 * v.a + Gp, 'noFric', L('Friction on the box on the slope is missing: the rope has to overcome it as well.', 'Die Reibung auf die Kiste auf dem Hang fehlt: Das Seil muss sie auch überwinden.')],
          ]),
      ];
    },
    steps(p, v) {
      const F1 = p.m1 * G, base = ['G', 'N', 'R', 'S1', 'G2', 'S2'], comp = ['Gp', 'Gn', 'N', 'R', 'S1', 'G2', 'S2'], all = [...comp, 'a1', 'a2'];
      return [
        step(L('Forces', 'Kräfte'),
          `<p>${L(`On the box on the slope: its weight, the normal force, friction down the slope and the rope force up the slope. On the hanging box: its weight and the rope force. The pulley turns the rope around: it pulls both boxes with the same force ${m$(T('S'))}.`, `Auf die Kiste auf der Unterlage: ihre Gewichtskraft, die Normalkraft, die Reibung hangabwärts und die Seilkraft hangaufwärts. Auf die hängende Kiste: ihre Gewichtskraft und die Seilkraft. Die Rolle lenkt das Seil um: Es zieht beide Kisten mit derselben Kraft ${m$(T('S'))}.`)}</p>`,
          base),
        step(L('Components of the weight', 'Komponenten der Gewichtskraft'),
          `<p>${L('Split the weight of box 1 into a part along the slope, which pulls it down the slope, and a part perpendicular to it, which presses it onto the slope:', 'Zerlege die Gewichtskraft von Kiste 1 in einen Teil entlang der Unterlage, der sie hangabwärts zieht, und einen Teil senkrecht dazu, der sie auf die Unterlage drückt:')}</p>` +
          `$$${T('G', '1∥')} = ${T('m')}_1\\,g\\sin\\alpha = ${tq(F1, 'N')}\\cdot ${trig('sin', p)} = ${tq(F1 * sinOf(p), 'N')}, \\qquad ${T('G', '1⊥')} = ${T('m')}_1\\,g\\cos\\alpha = ${tq(F1, 'N')}\\cdot ${trig('cos', p)} = ${tq(F1 * cosOf(p), 'N')}$$`,
          ['G', ...comp], ['G', 'Gp', 'Gn']),
        step(L('Normal force and friction', 'Normalkraft und Reibung'),
          `<p>${L('Perpendicular to the slope, the forces balance:', 'Senkrecht zur Unterlage heben sich die Kräfte auf:')}</p>` +
          `$$${T('N')} = ${T('m')}_1\\,g\\cos\\alpha = ${res(v.N, 'N')}, \\qquad ${T('R')} = ${T('mu')}\\,${T('N')} = ${FS.texNum(p.mu, 2)}\\cdot${tq(v.N, 'N')} = ${res(v.R, 'N')}$$`,
          comp, ['Gn', 'N', 'R']),
        step(L('Both boxes together', 'Beide Kisten zusammen'),
          `<p>${L('Along the rope, the weight of the hanging box drives the motion; the component down the slope and friction act against it:', 'Entlang des Seils treibt die Gewichtskraft der hängenden Kiste die Bewegung an; Hangabtriebskraft und Reibung wirken dagegen:')}</p>` +
          `$$${T('res')} = ${T('m')}_2\\,g - ${T('m')}_1\\,g\\sin\\alpha - ${T('R')} = ${tq(p.m2 * G, 'N')} - ${tq(F1 * sinOf(p), 'N')} - ${tq(v.R, 'N')} = ${res(v.res, 'N')}$$` +
          `$$${T('a')} = \\frac{${T('res')}}{${T('m')}_1 + ${T('m')}_2} = \\frac{${tq(v.res, 'N')}}{${tq(p.m1 + p.m2, 'kg')}} = ${res(v.a, 'a')}$$`,
          all, ['G2', 'Gp', 'R', 'a1', 'a2']),
        step(L('Rope force', 'Seilkraft'),
          `<p>${L('The hanging box alone: its weight pulls it down, the rope holds it back.', 'Die hängende Kiste allein: Ihre Gewichtskraft zieht sie nach unten, das Seil hält sie zurück.')}</p>` +
          `$$${T('m')}_2\\,g - ${T('S')} = ${T('m')}_2\\,${T('a')} \\;\\Rightarrow\\; ${T('S')} = ${T('m')}_2\\,(g - ${T('a')}) = ${tq(p.m2, 'kg')}\\cdot${tq(G - v.a, 'a')} = ${res(v.S, 'N')}$$`,
          all, ['S2', 'G2']),
      ];
    },
  };

  // ---------------------------------------------------------------- springs and drag
  // Two kinds of force of their own (scn.extra, see generator.js): the spring force, where the
  // spring is attached, back towards the spring's relaxed length (a stretched spring pulls, a
  // compressed one pushes), F = k Δx; and air resistance (drag), against the velocity, growing
  // with speed. Drawings mark the relaxed length (dashed) and Δx; moving bodies get a velocity
  // arrow v as well as an acceleration arrow.
  const tenth = (x) => Math.abs(10 * x - Math.round(10 * x)) < 1e-9;
  const cm = (x) => q(x, 'cm'), Nm = (x) => q(x, 'Nm');
  const SPRING_WHAT = {
    Fs: () => L('spring force on the box', 'Federkraft auf die Kiste'),
    dx: (p) => (p.state === 'stand' || p.state === 'compress' ? L('compression of the spring', 'Stauchung der Feder') : L('extension of the spring', 'Dehnung der Feder')),
    k: () => L('spring constant', 'Federkonstante'),
  };
  // the marks of a spring: its relaxed end (dashed, across the spring at rel) and Δx from there
  // to its end now (end), at a distance side along the normal nrm; the dashed line starts at from
  function springMarks(sc, rel, end, nrm, side = 30, from = -14) {
    const off = (p, d) => [p[0] + d * nrm[0], p[1] + d * nrm[1]];
    sc.line(...off(rel, from), ...off(rel, side + 10), 'w dash');
    sc.line(...off(rel, side), ...off(end, side), 'w thin');
    const mid = off([(rel[0] + end[0]) / 2, (rel[1] + end[1]) / 2], side + (nrm[0] ? 8 : 0));
    sc.text(mid[0] + (nrm[0] ? 4 : 0), mid[1] + (nrm[1] ? side > 0 ? 16 : -6 : 5), svgSym('dx'), 'lbl small', nrm[0] ? 'start' : 'middle');
  }

  const springHang = {
    id: 'spring-hang', difficulty: 2, still: true, extra: ['f', 'd'],
    make(r) {
      const m = pick(r, [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2]), k = pick(r, [20, 25, 40, 50, 80, 100, 200, 250, 400, 500]);
      const dx = (m * G * 100) / k; // cm
      if (!tenth(dx) || dx < 1 || dx > 25) return null;
      return { m, k, state: pick(r, ['hang', 'stand']), given: pick(r, ['k', 'dx']) };
    },
    solve: (p) => ({ Fs: p.m * G, dx: (p.m * G * 100) / p.k, k: p.k, a: 0 }),
    fields: (p) => [{ key: 'Fs', sym: ['Fs'], unit: 'N', what: SPRING_WHAT.Fs() },
      p.given === 'k' ? { key: 'dx', sym: ['dx'], unit: 'cm', what: SPRING_WHAT.dx(p) } : { key: 'k', sym: ['k'], unit: 'Nm', what: SPRING_WHAT.k() }],
    title: (p) => (p.state === 'hang' ? L('Hanging from a spring', 'An einer Feder hängend') : L('Resting on a spring', 'Auf einer Feder liegend')),
    text: (p) => {
      const dx = (p.m * G * 100) / p.k;
      const given = p.given === 'k' ? L(`The spring constant is ${Nm(p.k)}.`, `Die Federkonstante beträgt ${Nm(p.k)}.`)
        : (p.state === 'hang' ? L(`The spring is stretched by ${cm(dx)}.`, `Die Feder ist um ${cm(dx)} gedehnt.`) : L(`The spring is compressed by ${cm(dx)}.`, `Die Feder ist um ${cm(dx)} gestaucht.`));
      return (p.state === 'hang'
        ? L(`A box with a mass of ${kg(p.m)} hangs at rest from a spring fixed to the ceiling.`, `Eine Kiste mit der Masse ${kg(p.m)} hängt ruhig an einer Feder, die an der Decke befestigt ist.`)
        : L(`A box with a mass of ${kg(p.m)} rests on top of a vertical spring that stands on the floor.`, `Eine Kiste mit der Masse ${kg(p.m)} liegt ruhig auf einer senkrechten Feder, die auf dem Boden steht.`)) + ` ${given}`;
    },
    boxes: (p) => [L(`the box (${kg(p.m)})`, `die Kiste (${kg(p.m)})`)],
    scene(p, v) {
      const sc = new Scene(300, 380, p.state === 'hang' ? L('A box hanging from a spring', 'Eine Kiste an einer Feder') : L('A box on a spring', 'Eine Kiste auf einer Feder'));
      const bw = 70, bh = 56, cx = 150, rel = p.state === 'hang' ? 92 : 132, s = Math.min(46, 10 + 1.6 * v.dx);
      let c, att;
      if (p.state === 'hang') {
        sc.surface([cx + 60, 24], [cx - 60, 24], 1);
        const yE = 24 + rel + s;
        sc.spring([cx, 24], [cx, yE]);
        springMarks(sc, [cx, 24 + rel], [cx, yE], [1, 0], 34);
        const at = sc.box([cx - bw / 2, yE + bh], [1, 0], [0, -1], bw, bh, kg(p.m));
        c = at(bw / 2, bh / 2); att = [cx, yE];
      } else {
        const y0 = 360;
        sc.surface([cx - 60, y0], [cx + 60, y0]);
        const yE = y0 - rel + s;
        sc.spring([cx, y0], [cx, yE], 6);
        springMarks(sc, [cx, y0 - rel], [cx, yE], [1, 0], 48);
        const at = sc.box([cx - bw / 2, yE], [1, 0], [0, -1], bw, bh, kg(p.m));
        c = at(bw / 2, bh / 2); att = [cx + 6, yE];
      }
      sc.force({ id: 'G', kind: 'g', at: [c[0] - 6, c[1]], dir: [0, 1], sym: ['G'], lab: [-8, 6] });
      sc.force({ id: 'Fs', kind: 'f', at: att, dir: [0, -1], sym: ['Fs'], lab: [p.state === 'hang' ? -10 : 8, p.state === 'hang' ? 8 : 4] });
      return sized(sc, { G: p.m * G, Fs: v.Fs });
    },
    hints: (p) => [
      L('Which bodies touch the box? Only the spring. Besides, the Earth pulls it down.', 'Welche Körper berühren die Kiste? Nur die Feder. Ausserdem zieht die Erde sie nach unten.'),
      p.state === 'hang' ? L('The spring is stretched: it pulls the box back towards its relaxed length, that is up.', 'Die Feder ist gedehnt: Sie zieht die Kiste zurück zu ihrer entspannten Länge, also nach oben.')
        : L('The spring is compressed: it pushes the box back towards its relaxed length, that is up.', 'Die Feder ist gestaucht: Sie drückt die Kiste zurück zu ihrer entspannten Länge, also nach oben.'),
      L(`The box is at rest: ${m$(`${T('Fs')} = ${T('m')}\\,g`)}, and ${m$(`${T('Fs')} = k\\,\\Delta x`)} with ${m$('\\Delta x')} in metres.`, `Die Kiste ruht: ${m$(`${T('Fs')} = ${T('m')}\\,g`)}, und ${m$(`${T('Fs')} = k\\,\\Delta x`)} mit ${m$('\\Delta x')} in Metern.`),
    ],
    nums(p, v) {
      const FG = p.m * G, dm = v.dx / 100;
      const unit = L(`F / k gives Δx in metres: ${num(dm, 3)} m = ${num(v.dx)} cm.`, `F / k ergibt Δx in Metern: ${num(dm, 3)} m = ${num(v.dx)} cm.`);
      const mass = L('The spring holds the weight m g, in newtons, not the mass.', 'Die Feder hält die Gewichtskraft m g, in Newton, nicht die Masse.');
      const flip = L('The law of the spring is F = k Δx: divide the force by k (or the force by Δx), not the other way round.', 'Das Federgesetz lautet F = k Δx: Teile die Kraft durch k (bzw. die Kraft durch Δx), nicht umgekehrt.');
      if (p.given === 'k') {
        return [num$('dx', SPRING_WHAT.dx(p), '\\Delta x', 'cm', v.dx,
          `\\frac{${T('m')}\\,g}{k} = \\frac{${tq(FG, 'N')}}{${tq(p.k, 'Nm')}} = ${FS.texNum(dm, 3)}\\,\\mathrm{m} = ${tq(v.dx, 'cm')}`, [
            [dm, 'hooke', unit], [v.dx / G, 'hooke', mass], [p.k / FG, 'hooke', flip],
          ])];
      }
      return [num$('k', SPRING_WHAT.k(), 'k', 'Nm', p.k,
        `\\frac{${T('m')}\\,g}{\\Delta x} = \\frac{${tq(FG, 'N')}}{${FS.texNum(dm, 3)}\\,\\mathrm{m}} = ${tq(p.k, 'Nm')}`, [
          [FG / v.dx, 'hooke', L(`Δx must be in metres: ${num(v.dx)} cm = ${num(dm, 3)} m.`, `Δx muss in Metern stehen: ${num(v.dx)} cm = ${num(dm, 3)} m.`)], [p.k / G, 'hooke', mass], [FG * dm, 'hooke', flip],
        ])];
    },
    steps(p, v) {
      const hang = p.state === 'hang', dm = v.dx / 100;
      return [
        step(L('Forces on the box', 'Kräfte auf die Kiste'),
          `<p>${L(`The Earth pulls the box down with its weight ${m$(T('G'))}. The only body that touches the box is the spring: it acts where it is attached, with the spring force ${m$(T('Fs'))}.`, `Die Erde zieht die Kiste mit ihrer Gewichtskraft ${m$(T('G'))} nach unten. Der einzige Körper, der die Kiste berührt, ist die Feder: Sie wirkt dort, wo sie befestigt ist, mit der Federkraft ${m$(T('Fs'))}.`)}</p>` +
          `<p>${hang ? L('The spring is stretched downwards. But the spring force does not point along the stretch: a stretched spring pulls back towards its relaxed length (dashed), so on the box it points up.', 'Die Feder ist nach unten gedehnt. Doch die Federkraft zeigt nicht in Richtung der Dehnung: Eine gedehnte Feder zieht zurück zu ihrer entspannten Länge (gestrichelt), auf die Kiste also nach oben.')
            : L('The spring is compressed downwards. But the spring force does not point along the compression: a compressed spring pushes back towards its relaxed length (dashed), so on the box it points up.', 'Die Feder ist nach unten gestaucht. Doch die Federkraft zeigt nicht in Richtung der Stauchung: Eine gestauchte Feder drückt zurück zu ihrer entspannten Länge (gestrichelt), auf die Kiste also nach oben.')}</p>`,
          ['G', 'Fs'], ['Fs']),
        step(L('Balance', 'Gleichgewicht'),
          `<p>${L('The box is at rest, so the spring force balances the weight:', 'Die Kiste ruht, also hält die Federkraft der Gewichtskraft das Gleichgewicht:')} $$${T('Fs')} = ${T('G')} = ${T('m')}\\,g = ${tq(p.m, 'kg')}\\cdot${tq(G, 'a')} = ${res(v.Fs, 'N')}$$</p>`,
          ['G', 'Fs'], ['G', 'Fs']),
        step(L('Law of the spring', 'Federgesetz'),
          `<p>${L(`The spring force is the spring constant times the ${hang ? 'extension' : 'compression'} ${m$('\\Delta x')}, in metres:`, `Die Federkraft ist die Federkonstante mal die ${hang ? 'Dehnung' : 'Stauchung'} ${m$('\\Delta x')}, in Metern:`)}</p>` +
          (p.given === 'k'
            ? `$$${T('Fs')} = k\\,\\Delta x \\;\\Rightarrow\\; \\Delta x = \\frac{${T('Fs')}}{k} = \\frac{${tq(v.Fs, 'N')}}{${tq(p.k, 'Nm')}} = ${FS.texNum(dm, 3)}\\,\\mathrm{m} = ${res(v.dx, 'cm')}$$`
            : `$$${T('Fs')} = k\\,\\Delta x \\;\\Rightarrow\\; k = \\frac{${T('Fs')}}{\\Delta x} = \\frac{${tq(v.Fs, 'N')}}{${FS.texNum(dm, 3)}\\,\\mathrm{m}} = ${res(p.k, 'Nm')}$$`),
          ['G', 'Fs'], ['Fs']),
      ];
    },
  };

  const springFloor = {
    id: 'spring-floor', difficulty: 3, extra: ['f', 'd'],
    make(r) {
      const m = pick(r, [0.5, 1, 1.5, 2, 2.5, 3, 4]), k = pick(r, [50, 100, 150, 200, 250, 300, 400, 500]), dx = pick(r, [2, 4, 5, 6, 8, 10, 12, 15, 20]);
      const mu = pick(r, [0.1, 0.2, 0.25, 0.3, 0.4, 0.5]), Fs = (k * dx) / 100, R = mu * m * G, a = (Fs - R) / m;
      if (Fs > 60 || !tenth(Fs) || !tenth(R) || a < 0.5 || a > 15 || !tenth(a)) return null;
      return { m, k, dx, mu, state: pick(r, ['stretch', 'compress']) };
    },
    solve(p) {
      const Fs = (p.k * p.dx) / 100, R = p.mu * p.m * G;
      return { Fs, R, a: (Fs - R) / p.m };
    },
    fields: () => [{ key: 'Fs', sym: ['Fs'], unit: 'N', what: SPRING_WHAT.Fs() }, field('R'), field('a')],
    title: (p) => (p.state === 'stretch' ? L('Pulled back by a spring', 'Von einer Feder zurückgezogen') : L('Pushed away by a spring', 'Von einer Feder weggestossen')),
    text: (p) => (p.state === 'stretch'
      ? L(`A box with a mass of ${kg(p.m)} lies on the floor, joined to a wall by a horizontal spring with a spring constant of ${Nm(p.k)}. The box is pulled away from the wall, so that the spring is stretched by ${cm(p.dx)}, and released. It starts to slide back towards the wall. The coefficient of kinetic friction is ${num(p.mu, 2)}. Find the forces and the acceleration just after it starts to slide.`,
        `Eine Kiste mit der Masse ${kg(p.m)} liegt auf dem Boden und ist mit einer waagrechten Feder mit der Federkonstante ${Nm(p.k)} an einer Wand befestigt. Die Kiste wird von der Wand weggezogen, sodass die Feder um ${cm(p.dx)} gedehnt ist, und losgelassen. Sie beginnt, zur Wand zurückzugleiten. Die Gleitreibungszahl beträgt ${num(p.mu, 2)}. Bestimme die Kräfte und die Beschleunigung gleich nachdem sie zu gleiten beginnt.`)
      : L(`A box with a mass of ${kg(p.m)} lies on the floor, joined to a wall by a horizontal spring with a spring constant of ${Nm(p.k)}. The box is pushed towards the wall, so that the spring is compressed by ${cm(p.dx)}, and released. It starts to slide away from the wall. The coefficient of kinetic friction is ${num(p.mu, 2)}. Find the forces and the acceleration just after it starts to slide.`,
        `Eine Kiste mit der Masse ${kg(p.m)} liegt auf dem Boden und ist mit einer waagrechten Feder mit der Federkonstante ${Nm(p.k)} an einer Wand befestigt. Die Kiste wird gegen die Wand geschoben, sodass die Feder um ${cm(p.dx)} gestaucht ist, und losgelassen. Sie beginnt, von der Wand weg zu gleiten. Die Gleitreibungszahl beträgt ${num(p.mu, 2)}. Bestimme die Kräfte und die Beschleunigung gleich nachdem sie zu gleiten beginnt.`)),
    scene(p, v) {
      const b = floorBox(p.m, p.mu, 520), str = p.state === 'stretch', rel = 112, s = Math.min(42, 14 + 1.6 * p.dx);
      // the wall, so that the spring ends at the box
      const wall = b.at(0, 0)[0] - (rel + (str ? s : -s)), ys = b.y0 - 0.5 * b.bh, y0 = b.y0;
      b.sc.surface([wall, y0 - b.bh - 40], [wall, y0], -1);
      const att = b.at(0, 0.5 * b.bh);
      b.sc.spring([wall, ys], att, 8, 7);
      springMarks(b.sc, [wall + rel, ys], [att[0], ys], [0, -1], 0.5 * b.bh + 24, 0.5 * b.bh + 6);
      b.weight(); b.normal();
      b.sc.forces[0].lab = [-8, 6]; // the weight's label left of it, clear of friction
      const dir = str ? [-1, 0] : [1, 0];
      b.sc.force({ id: 'R', kind: 'r', at: [b.at(0, 0)[0] + (str ? 0.7 : 0.3) * b.bw, y0], dir: [-dir[0], 0], sym: ['R'], lab: [str ? 4 : -4, 16] });
      b.sc.force({ id: 'Fs', kind: 'f', at: att, dir, sym: ['Fs'], ...(str ? { lab: [-4, -12] } : { labTail: true, lab: [-8, -12] }) });
      const top = b.at(b.bw / 2, b.bh);
      b.sc.accel({ id: 'a', at: [top[0] + (str ? 23 : -23), top[1] - 46], dir, sym: ['a'], task: 'sym', lab: [0, -12] });
      return sized(b.sc, { G: p.m * G, N: p.m * G, R: v.R, Fs: v.Fs });
    },
    hints: (p) => [
      L('Which bodies touch the box? The floor (normal force and friction) and the spring. Besides, the Earth pulls it down.', 'Welche Körper berühren die Kiste? Der Boden (Normalkraft und Reibung) und die Feder. Ausserdem zieht die Erde sie nach unten.'),
      p.state === 'stretch' ? L('The stretched spring pulls the box back towards its relaxed length, towards the wall. Friction acts against the motion.', 'Die gedehnte Feder zieht die Kiste zurück zu ihrer entspannten Länge, zur Wand hin. Die Reibung wirkt gegen die Bewegung.')
        : L('The compressed spring pushes the box back towards its relaxed length, away from the wall. Friction acts against the motion.', 'Die gestauchte Feder drückt die Kiste zurück zu ihrer entspannten Länge, von der Wand weg. Die Reibung wirkt gegen die Bewegung.'),
      L(`${m$(`${T('Fs')} = k\\,\\Delta x`)} with ${m$('\\Delta x')} in metres, ${m$(`${T('R')} = ${T('mu')}\\,${T('m')}\\,g`)}, and ${m$(`${T('Fs')} - ${T('R')} = ${T('m')}\\,${T('a')}`)}.`, `${m$(`${T('Fs')} = k\\,\\Delta x`)} mit ${m$('\\Delta x')} in Metern, ${m$(`${T('R')} = ${T('mu')}\\,${T('m')}\\,g`)} und ${m$(`${T('Fs')} - ${T('R')} = ${T('m')}\\,${T('a')}`)}.`),
    ],
    nums(p, v) {
      return [num$('a', L('The acceleration just after it starts to slide:', 'Die Beschleunigung gleich nachdem sie zu gleiten beginnt:'), T('a'), 'a', v.a,
        `\\frac{k\\,\\Delta x - ${T('mu')}\\,${T('m')}\\,g}{${T('m')}} = \\frac{${tq(v.Fs, 'N')} - ${tq(v.R, 'N')}}{${tq(p.m, 'kg')}} = ${tq(v.a, 'a')}`, [
          [v.Fs / p.m, 'noFric', WRONG.noFric()],
          [(v.Fs + v.R) / p.m, 'dir', L('Friction acts against the motion: subtract it.', 'Die Reibung wirkt gegen die Bewegung: Zieh sie ab.')],
          [v.Fs - v.R, 'net', WRONG.net()],
          [(p.k * p.dx - v.R) / p.m, 'hooke', L(`Δx must be in metres: ${num(p.dx)} cm = ${num(p.dx / 100, 3)} m.`, `Δx muss in Metern stehen: ${num(p.dx)} cm = ${num(p.dx / 100, 3)} m.`)],
        ])];
    },
    steps(p, v) {
      const str = p.state === 'stretch', FG = p.m * G, base = ['G', 'N', 'R', 'Fs'], all = [...base, 'a'];
      return [
        step(L('Forces on the box', 'Kräfte auf die Kiste'),
          `<p>${L(`Weight ${m$(T('G'))} down, normal force ${m$(T('N'))} up, and where the spring is attached, the spring force ${m$(T('Fs'))}.`, `Gewichtskraft ${m$(T('G'))} nach unten, Normalkraft ${m$(T('N'))} nach oben und dort, wo die Feder befestigt ist, die Federkraft ${m$(T('Fs'))}.`)} ` +
          (str ? L('The spring is stretched (away from the wall), but it pulls the box back towards its relaxed length (dashed): towards the wall. The spring force never points along the stretch.', 'Die Feder ist gedehnt (von der Wand weg), aber sie zieht die Kiste zurück zu ihrer entspannten Länge (gestrichelt): zur Wand hin. Die Federkraft zeigt nie in Richtung der Dehnung.')
            : L('The spring is compressed (towards the wall), but it pushes the box back towards its relaxed length (dashed): away from the wall. The spring force never points along the compression.', 'Die Feder ist gestaucht (zur Wand hin), aber sie drückt die Kiste zurück zu ihrer entspannten Länge (gestrichelt): von der Wand weg. Die Federkraft zeigt nie in Richtung der Stauchung.')) +
          ` ${L(`The box slides that way, so kinetic friction ${m$(T('R'))} acts the other way.`, `Die Kiste gleitet in diese Richtung, also wirkt die Gleitreibung ${m$(T('R'))} in die andere.`)}</p>`,
          base, ['Fs', 'R']),
        step(L('Law of the spring', 'Federgesetz'),
          `<p>${L(`The spring force is the spring constant times the ${str ? 'extension' : 'compression'}, in metres: ${m$(`\\Delta x = ${tq(p.dx, 'cm')} = ${FS.texNum(p.dx / 100, 3)}\\,\\mathrm{m}`)}.`, `Die Federkraft ist die Federkonstante mal die ${str ? 'Dehnung' : 'Stauchung'}, in Metern: ${m$(`\\Delta x = ${tq(p.dx, 'cm')} = ${FS.texNum(p.dx / 100, 3)}\\,\\mathrm{m}`)}.`)}</p>` +
          `$$${T('Fs')} = k\\,\\Delta x = ${tq(p.k, 'Nm')}\\cdot${FS.texNum(p.dx / 100, 3)}\\,\\mathrm{m} = ${res(v.Fs, 'N')}$$`,
          base, ['Fs']),
        step(L('Vertical: balance; friction', 'Senkrecht: Gleichgewicht; Reibung'),
          `<p>${L('Vertically, nothing accelerates: the normal force equals the weight. Friction is the friction coefficient times the normal force:', 'Senkrecht wird nichts beschleunigt: Die Normalkraft ist gleich der Gewichtskraft. Die Reibung ist die Reibungszahl mal die Normalkraft:')}</p>` +
          `$$${T('N')} = ${T('m')}\\,g = ${tq(FG, 'N')}, \\qquad ${T('R')} = ${T('mu')}\\,${T('N')} = ${FS.texNum(p.mu, 2)}\\cdot${tq(FG, 'N')} = ${res(v.R, 'N')}$$`,
          base, ['G', 'N', 'R']),
        step(L('Newton’s second law', 'Aktionsprinzip'),
          `<p>${L('Horizontally, in the direction the box starts to move (positive): the spring force minus friction accelerates it.', 'Waagrecht, in die Richtung, in die sich die Kiste zu bewegen beginnt (positiv): Die Federkraft minus die Reibung beschleunigt sie.')}</p>` +
          `$$${T('Fs')} - ${T('R')} = ${T('m')}\\,${T('a')} \\;\\Rightarrow\\; ${T('a')} = \\frac{${tq(v.Fs, 'N')} - ${tq(v.R, 'N')}}{${tq(p.m, 'kg')}} = ${res(v.a, 'a')}$$`,
          all, ['Fs', 'R', 'a']),
      ];
    },
  };

  // A skydiver: a body (drawn as a box, under a canopy once the parachute is open), falling.
  // phase: 'early' (drag less than the weight, she gets faster), 'terminal' (drag equals the
  // weight, constant speed) or 'chute' (parachute open: drag more than the weight, she slows down).
  const dragFall = {
    id: 'drag-fall', difficulty: 2, extra: ['f', 'd'],
    make(r, o = {}) {
      const m = pick(r, [50, 60, 70, 75, 80, 90, 100]), phase = o.phase || pick(r, ['early', 'terminal', 'chute']);
      if (phase === 'terminal') return { m, phase, u: pick(r, [50, 55, 60]) };
      const a = pick(r, phase === 'early' ? [2, 4, 5, 6, 8] : [2, 5, 10, 15]);
      return { m, phase, a, D: m * (phase === 'early' ? G - a : G + a), u: pick(r, phase === 'early' ? [10, 20, 25, 30, 40] : [40, 45, 50]) };
    },
    solve: (p) => (p.phase === 'terminal' ? { D: p.m * G, a: 0 } : { res: Math.abs(p.m * G - p.D), a: Math.abs(p.m * G - p.D) / p.m }),
    fields: (p) => (p.phase === 'terminal' ? [{ key: 'D', sym: ['D'], unit: 'N', what: L('air resistance', 'Luftwiderstand') }]
      : [field('res', '', L('net force on the skydiver', 'resultierende Kraft auf die Fallschirmspringerin')), field('a', '', p.phase === 'chute' ? L('acceleration (upwards: she slows down)', 'Beschleunigung (nach oben: sie wird langsamer)') : L('acceleration', 'Beschleunigung'))]),
    boxes: (p) => [L(`the skydiver (${kg(p.m)})`, `die Fallschirmspringerin (${kg(p.m)})`)],
    title: (p) => ({ early: L('Falling faster and faster', 'Immer schneller fallen'), terminal: L('Terminal velocity', 'Endgeschwindigkeit'), chute: L('The parachute opens', 'Der Fallschirm öffnet sich') }[p.phase]),
    text: (p) => ({
      early: L(`A skydiver with a mass of ${kg(p.m)} (with her equipment) has jumped from a plane. At a speed of ${q(p.u, 'v')}, falling straight down with her parachute still closed, the air resistance on her is ${q(p.D, 'N')}.`,
        `Eine Fallschirmspringerin mit der Masse ${kg(p.m)} (mit Ausrüstung) ist aus einem Flugzeug gesprungen. Bei einer Geschwindigkeit von ${q(p.u, 'v')}, senkrecht nach unten und mit noch geschlossenem Fallschirm, beträgt der Luftwiderstand auf sie ${q(p.D, 'N')}.`),
      terminal: L(`A skydiver with a mass of ${kg(p.m)} (with her equipment) falls straight down with her parachute still closed, at a constant speed of ${q(p.u, 'v')} (her terminal velocity).`,
        `Eine Fallschirmspringerin mit der Masse ${kg(p.m)} (mit Ausrüstung) fällt mit noch geschlossenem Fallschirm senkrecht nach unten, mit der konstanten Geschwindigkeit ${q(p.u, 'v')} (ihrer Endgeschwindigkeit).`),
      chute: L(`A skydiver with a mass of ${kg(p.m)} (with her equipment and parachute) has just opened her parachute. She still falls at ${q(p.u, 'v')}, but the air resistance on her and the parachute is now ${q(p.D, 'N')}.`,
        `Eine Fallschirmspringerin mit der Masse ${kg(p.m)} (mit Ausrüstung und Fallschirm) hat gerade ihren Fallschirm geöffnet. Sie fällt noch mit ${q(p.u, 'v')}, aber der Luftwiderstand auf sie und den Fallschirm beträgt jetzt ${q(p.D, 'N')}.`),
    }[p.phase]),
    scene(p, v) {
      const sc = new Scene(320, 360, L('A falling skydiver', 'Eine fallende Fallschirmspringerin'));
      const bw = 78, bh = 66, cx = 160, top = 130, D = p.phase === 'terminal' ? v.D : p.D, y = 34;
      // the forces act at her centre (with the parachute open, on her and the parachute as one
      // body): the weight down, a little left of it, and air resistance up, a little right
      if (p.phase === 'chute') {
        // the canopy, with its lines to the shoulders
        const hw = 74;
        sc.see(cx - hw, y - 30); sc.see(cx + hw, y + 14);
        sc.add(`<path class="canopy" d="M${cx - hw} ${y + 14} Q${cx - hw} ${y - 30} ${cx} ${y - 30} Q${cx + hw} ${y - 30} ${cx + hw} ${y + 14} Q${cx} ${y} ${cx - hw} ${y + 14} Z"/>`);
        sc.line(cx - hw, y + 14, cx - bw / 2, top, 'w thin'); sc.line(cx + hw, y + 14, cx + bw / 2, top, 'w thin');
      }
      const at = sc.box([cx - bw / 2, top + bh], [1, 0], [0, -1], bw, bh, kg(p.m)), c = at(bw / 2, bh / 2);
      sc.force({ id: 'G', kind: 'g', at: [c[0] - 6, c[1]], dir: [0, 1], sym: ['G'], lab: [-8, 6] });
      sc.force({ id: 'D', kind: 'd', at: [c[0] + 8, c[1]], dir: [0, -1], sym: ['D'], lab: [8, 4], ...(p.phase === 'terminal' ? {} : { value: q(p.D, 'N'), task: 'value' }) });
      sc.accel({ id: 'v', kind: 'v', at: [cx + bw / 2 + 24, c[1] - 23], dir: [0, 1], sym: ['v'], task: 'sym', lab: [8, 0] });
      if (p.phase !== 'terminal') sc.accel({ id: 'a', at: [cx - bw / 2 - 24, c[1] + (p.phase === 'early' ? -23 : 23)], dir: [0, p.phase === 'early' ? 1 : -1], sym: ['a'], task: 'sym', lab: [-8, 0] });
      return sized(sc, { G: p.m * G, D });
    },
    hints: (p) => [
      L('Which bodies act on the skydiver? The Earth (her weight) and the air, against her velocity. Nothing else pushes her down.', 'Welche Körper wirken auf die Fallschirmspringerin? Die Erde (ihre Gewichtskraft) und die Luft, gegen ihre Geschwindigkeit. Sonst drückt sie nichts nach unten.'),
      ...{
        early: [L(`Downwards positive: ${m$(`${T('m')}\\,g - ${T('D')} = ${T('m')}\\,${T('a')}`)}.`, `Nach unten positiv: ${m$(`${T('m')}\\,g - ${T('D')} = ${T('m')}\\,${T('a')}`)}.`)],
        terminal: [L('Her speed is constant: the forces balance.', 'Ihre Geschwindigkeit ist konstant: Die Kräfte heben sich auf.')],
        chute: [L('She still moves down, so the air resistance still points up. It is now larger than her weight: she slows down.', 'Sie bewegt sich noch nach unten, also zeigt der Luftwiderstand noch nach oben. Er ist jetzt grösser als ihre Gewichtskraft: Sie wird langsamer.'),
          L(`Upwards positive: ${m$(`${T('D')} - ${T('m')}\\,g = ${T('m')}\\,${T('a')}`)}.`, `Nach oben positiv: ${m$(`${T('D')} - ${T('m')}\\,g = ${T('m')}\\,${T('a')}`)}.`)],
      }[p.phase],
    ],
    nums(p, v) {
      const FG = p.m * G;
      if (p.phase === 'terminal') {
        return [num$('D', L('The air resistance on her:', 'Der Luftwiderstand auf sie:'), T('D'), 'N', v.D, `${T('m')}\\,g = ${tq(p.m, 'kg')}\\cdot${tq(G, 'a')} = ${tq(v.D, 'N')}`, [
          [p.m, 'other', L('Her weight is m g, in newtons: the mass times g.', 'Ihre Gewichtskraft ist m g, in Newton: die Masse mal g.')],
          [0, 'noDrag', L('Air resistance does not vanish at a constant speed: it is there and balances her weight.', 'Der Luftwiderstand verschwindet bei konstanter Geschwindigkeit nicht: Er ist da und hält ihrer Gewichtskraft das Gleichgewicht.')],
          [p.m * p.u, 'motion', L('There is no force m v: at a constant speed the forces balance, so the air resistance equals her weight.', 'Es gibt keine Kraft m v: Bei konstanter Geschwindigkeit heben sich die Kräfte auf, also ist der Luftwiderstand gleich ihrer Gewichtskraft.')],
        ])];
      }
      const early = p.phase === 'early', net = early ? `${T('m')}\\,g - ${T('D')}` : `${T('D')} - ${T('m')}\\,g`;
      const nets = early ? `${tq(FG, 'N')} - ${tq(p.D, 'N')}` : `${tq(p.D, 'N')} - ${tq(FG, 'N')}`;
      const terminal = early ? L('Her speed still changes: the forces do not balance yet, so there is a net force.', 'Ihre Geschwindigkeit ändert sich noch: Die Kräfte heben sich noch nicht auf, also gibt es eine resultierende Kraft.')
        : L('She slows down: the forces do not balance, so there is a net force.', 'Sie wird langsamer: Die Kräfte heben sich nicht auf, also gibt es eine resultierende Kraft.');
      const dir = L('Weight and air resistance point in opposite directions: subtract them.', 'Gewichtskraft und Luftwiderstand zeigen in entgegengesetzte Richtungen: Zieh sie voneinander ab.');
      return [
        num$('res', L('The net force on her:', 'Die resultierende Kraft auf sie:'), T('res'), 'N', v.res, `${net} = ${nets} = ${tq(v.res, 'N')}`, [
          [FG + p.D, 'dir', dir], [0, 'terminal', terminal],
          early ? [p.D, 'other', L('The air resistance alone is not the net force: her weight acts too.', 'Der Luftwiderstand allein ist nicht die resultierende Kraft: Ihre Gewichtskraft wirkt auch.')]
            : [FG, 'other', L('The weight alone is not the net force: the air resistance acts too.', 'Die Gewichtskraft allein ist nicht die resultierende Kraft: Der Luftwiderstand wirkt auch.')],
        ]),
        num$('a', early ? L('Her acceleration:', 'Ihre Beschleunigung:') : L('Her acceleration (upwards: she slows down):', 'Ihre Beschleunigung (nach oben: sie wird langsamer):'), T('a'), 'a', v.a,
          `\\frac{${T('res')}}{${T('m')}} = \\frac{${tq(v.res, 'N')}}{${tq(p.m, 'kg')}} = ${tq(v.a, 'a')}`, [
            [G, 'noDrag', L('She does not fall freely: the air resistance acts against her velocity.', 'Sie fällt nicht frei: Der Luftwiderstand wirkt gegen ihre Geschwindigkeit.')],
            [0, 'terminal', terminal],
            [p.D / p.m, 'other', L('Divide the net force by the mass, not the air resistance alone.', 'Teile die resultierende Kraft durch die Masse, nicht den Luftwiderstand allein.')],
            [(FG + p.D) / p.m, 'dir', dir],
          ]),
      ];
    },
    steps(p, v) {
      const FG = p.m * G, base = ['G', 'D'], all = ['G', 'D', 'v', 'a'];
      const forces = step(L('Forces on the skydiver', 'Kräfte auf die Fallschirmspringerin'),
        `<p>${L(`The Earth pulls her down with her weight ${m$(`${T('G')} = ${T('m')}\\,g = ${tq(FG, 'N')}`)}. The air acts against her velocity: she falls down, so the air resistance ${m$(T('D'))} points up.`, `Die Erde zieht sie mit ihrer Gewichtskraft ${m$(`${T('G')} = ${T('m')}\\,g = ${tq(FG, 'N')}`)} nach unten. Die Luft wirkt gegen ihre Geschwindigkeit: Sie fällt nach unten, also zeigt der Luftwiderstand ${m$(T('D'))} nach oben.`)} ` +
        `${L('There is no other force: nothing pushes her along in the direction of motion. She keeps falling because the Earth pulls her, not because of a “force of motion”.', 'Weitere Kräfte gibt es nicht: Nichts treibt sie in Bewegungsrichtung an. Sie fällt weiter, weil die Erde sie anzieht, nicht wegen einer „Bewegungskraft“.')}</p>`,
        p.phase === 'terminal' ? [...base, 'v'] : all, ['D', 'v']);
      if (p.phase === 'terminal') {
        return [forces,
          step(L('Constant speed: balance', 'Konstante Geschwindigkeit: Gleichgewicht'),
            `<p>${L('Her speed does not change, so her acceleration is zero and the net force is zero: the air resistance balances her weight.', 'Ihre Geschwindigkeit ändert sich nicht, also ist ihre Beschleunigung null und die resultierende Kraft null: Der Luftwiderstand hält ihrer Gewichtskraft das Gleichgewicht.')}</p>` +
            `$$${T('m')}\\,g - ${T('D')} = 0 \\;\\Rightarrow\\; ${T('D')} = ${T('m')}\\,g = ${res(v.D, 'N')}$$`, [...base, 'v'], base),
          step(L('Why constant?', 'Warum konstant?'),
            `<p>${L('Air resistance grows with speed. Earlier, when she was slower, it was smaller than her weight and she got faster; now it has grown until it equals her weight. A constant speed needs no net force: she does not need a force downwards to keep falling.', 'Der Luftwiderstand wächst mit der Geschwindigkeit. Vorher, als sie langsamer war, war er kleiner als ihre Gewichtskraft, und sie wurde schneller; jetzt ist er gewachsen, bis er gleich ihrer Gewichtskraft ist. Eine konstante Geschwindigkeit braucht keine resultierende Kraft: Sie braucht keine Kraft nach unten, um weiterzufallen.')}</p>`, [...base, 'v'], ['D']),
        ];
      }
      if (p.phase === 'early') {
        return [forces,
          step(L('Newton’s second law', 'Aktionsprinzip'),
            `<p>${L('Downwards positive: her weight minus the air resistance is the net force, which accelerates her.', 'Nach unten positiv: Ihre Gewichtskraft minus der Luftwiderstand ist die resultierende Kraft, die sie beschleunigt.')}</p>` +
            `$$${T('res')} = ${T('m')}\\,g - ${T('D')} = ${tq(FG, 'N')} - ${tq(p.D, 'N')} = ${res(v.res, 'N')}$$` +
            `$$${T('a')} = \\frac{${T('res')}}{${T('m')}} = \\frac{${tq(v.res, 'N')}}{${tq(p.m, 'kg')}} = ${res(v.a, 'a')}$$`, all, ['G', 'D', 'a']),
          step(L('Faster and faster, up to terminal velocity', 'Immer schneller, bis zur Endgeschwindigkeit'),
            `<p>${L(`As she gets faster, the air resistance grows, the net force shrinks, and so does her acceleration. Once the air resistance is as large as her weight, ${m$(tq(FG, 'N'))}, the forces balance: she falls at a constant speed, her terminal velocity.`, `Während sie schneller wird, wächst der Luftwiderstand, die resultierende Kraft wird kleiner und damit auch ihre Beschleunigung. Sobald der Luftwiderstand so gross ist wie ihre Gewichtskraft, ${m$(tq(FG, 'N'))}, heben sich die Kräfte auf: Sie fällt mit konstanter Geschwindigkeit, ihrer Endgeschwindigkeit.`)}</p>`, all, ['G', 'D']),
          step(L('Against the velocity, not the acceleration', 'Gegen die Geschwindigkeit, nicht gegen die Beschleunigung'),
            `<p>${L('Here the velocity and the acceleration both point down, so the air resistance is against both. But it is the velocity that counts: once she opens her parachute, she still falls but slows down. Her acceleration then points up, and the air resistance still points up, against her velocity.', 'Hier zeigen Geschwindigkeit und Beschleunigung beide nach unten, also wirkt der Luftwiderstand gegen beide. Aber es zählt die Geschwindigkeit: Sobald sie den Fallschirm öffnet, fällt sie weiter, wird aber langsamer. Ihre Beschleunigung zeigt dann nach oben, und der Luftwiderstand zeigt immer noch nach oben, gegen ihre Geschwindigkeit.')}</p>`, all, ['D', 'v']),
        ];
      }
      return [forces,
        step(L('Newton’s second law', 'Aktionsprinzip'),
          `<p>${L('She slows down, so her acceleration points up, against her velocity. Upwards positive: the air resistance minus her weight is the net force.', 'Sie wird langsamer, also zeigt ihre Beschleunigung nach oben, gegen ihre Geschwindigkeit. Nach oben positiv: Der Luftwiderstand minus ihre Gewichtskraft ist die resultierende Kraft.')}</p>` +
          `$$${T('res')} = ${T('D')} - ${T('m')}\\,g = ${tq(p.D, 'N')} - ${tq(FG, 'N')} = ${res(v.res, 'N')}$$` +
          `$$${T('a')} = \\frac{${T('res')}}{${T('m')}} = \\frac{${tq(v.res, 'N')}}{${tq(p.m, 'kg')}} = ${res(v.a, 'a')}$$`, all, ['G', 'D', 'a']),
        step(L('Against the velocity, not the acceleration', 'Gegen die Geschwindigkeit, nicht gegen die Beschleunigung'),
          `<p>${L('Air resistance and acceleration both point up here. The air resistance does not point against the acceleration: it points against the velocity, and she still moves down. As she slows down, it shrinks, until it equals her weight again at a new, smaller terminal velocity.', 'Luftwiderstand und Beschleunigung zeigen hier beide nach oben. Der Luftwiderstand zeigt nicht gegen die Beschleunigung: Er zeigt gegen die Geschwindigkeit, und sie bewegt sich noch nach unten. Während sie langsamer wird, nimmt er ab, bis er bei einer neuen, kleineren Endgeschwindigkeit wieder gleich ihrer Gewichtskraft ist.')}</p>`, all, ['D', 'v', 'a']),
      ];
    },
  };

  // A cyclist who stops pedalling and coasts on a level road: drag slows her down.
  const dragBike = {
    id: 'drag-bike', difficulty: 2, extra: ['f', 'd'],
    make(r) {
      const m = pick(r, [50, 60, 70, 75, 80, 90, 100]), D = pick(r, [10, 15, 20, 24, 25, 30, 36, 40, 45, 50, 60, 75]), a = D / m;
      return tenth(a) && a > 0 ? { m, D, u: pick(r, [6, 8, 10, 12, 15]) } : null;
    },
    solve: (p) => ({ N: p.m * G, a: p.D / p.m }),
    fields: () => [field('N', '', L('normal force from the road', 'Normalkraft der Strasse')), field('a', '', L('acceleration (backwards: she slows down)', 'Beschleunigung (nach hinten: sie wird langsamer)'))],
    boxes: (p) => [L(`the cyclist and her bike (${kg(p.m)})`, `die Radfahrerin mit Velo (${kg(p.m)})`)],
    title: () => L('Coasting on a bike', 'Mit dem Velo ausrollen'),
    text: (p) => L(`A cyclist stops pedalling and coasts along a level road; together with her bike she has a mass of ${kg(p.m)}. At a speed of ${q(p.u, 'v')}, the air resistance on her is ${q(p.D, 'N')}. Rolling resistance is negligible.`,
      `Eine Radfahrerin hört auf zu treten und rollt auf einer waagrechten Strasse aus; zusammen mit ihrem Velo hat sie die Masse ${kg(p.m)}. Bei einer Geschwindigkeit von ${q(p.u, 'v')} beträgt der Luftwiderstand auf sie ${q(p.D, 'N')}. Der Rollwiderstand ist vernachlässigbar.`),
    scene(p, v) {
      const sc = new Scene(460, 300, L('A cyclist coasting on a level road', 'Eine Radfahrerin rollt auf einer waagrechten Strasse aus'));
      const y0 = 230, bw = 96, bh = 56, rw = 17, x0 = (460 - bw) / 2;
      sc.surface([40, y0], [420, y0]);
      [x0 + rw, x0 + bw - rw].forEach((x) => { sc.circle(x, y0 - rw, rw, 'pulley'); sc.circle(x, y0 - rw, 2.5, 'dot'); });
      const at = sc.box([x0, y0 - 2 * rw], [1, 0], [0, -1], bw, bh, kg(p.m)), c = at(bw / 2, bh / 2), top = at(bw / 2, bh);
      sc.force({ id: 'G', kind: 'g', at: [c[0] - 6, c[1]], dir: [0, 1], sym: ['G'], lab: [-8, 10] });
      sc.force({ id: 'N', kind: 'n', at: [c[0] + 6, y0], dir: [0, -1], sym: ['N'], lab: [8, 4] });
      // air resistance acts at the centre, like the weight (just below it, its label under the
      // arrow, clear of the mass in the corner)
      sc.force({ id: 'D', kind: 'd', at: [c[0], c[1] + 4], dir: [-1, 0], sym: ['D'], value: q(p.D, 'N'), task: 'value', lab: [-2, 16] });
      sc.accel({ id: 'v', kind: 'v', at: [top[0] - 23, top[1] - 16], dir: [1, 0], sym: ['v'], task: 'sym', lab: [0, -12] });
      sc.accel({ id: 'a', at: [top[0] + 23, top[1] - 48], dir: [-1, 0], sym: ['a'], task: 'sym', lab: [0, -12] });
      return sized(sc, { G: p.m * G, N: p.m * G, D: p.D });
    },
    hints: () => [
      L('Which bodies act on her? The Earth, the road (only up: rolling resistance is negligible) and the air. Once she stops pedalling, nothing pushes her forward.', 'Welche Körper wirken auf sie? Die Erde, die Strasse (nur nach oben: der Rollwiderstand ist vernachlässigbar) und die Luft. Sobald sie nicht mehr tritt, treibt sie nichts mehr nach vorn an.'),
      L('The air resistance points against her velocity: backwards.', 'Der Luftwiderstand zeigt gegen ihre Geschwindigkeit: nach hinten.'),
      L(`Backwards positive: ${m$(`${T('D')} = ${T('m')}\\,${T('a')}`)}.`, `Nach hinten positiv: ${m$(`${T('D')} = ${T('m')}\\,${T('a')}`)}.`),
    ],
    nums(p, v) {
      return [num$('a', L('Her acceleration (backwards: she slows down):', 'Ihre Beschleunigung (nach hinten: sie wird langsamer):'), T('a'), 'a', v.a,
        `\\frac{${T('D')}}{${T('m')}} = \\frac{${tq(p.D, 'N')}}{${tq(p.m, 'kg')}} = ${tq(v.a, 'a')}`, [
          [p.D / (p.m * G), 'mass', L('Divide by her mass, in kilograms, not by her weight.', 'Teile durch ihre Masse, in Kilogramm, nicht durch ihre Gewichtskraft.')],
          [0, 'motion', L('She does not keep her speed: nothing pushes her forwards, so the air resistance is the net force and slows her down.', 'Sie behält ihre Geschwindigkeit nicht: Nichts treibt sie nach vorn an, also ist der Luftwiderstand die resultierende Kraft und bremst sie ab.')],
          [(p.m * G - p.D) / p.m, 'other', L('Her weight acts vertically, not along the road: it does not change her speed.', 'Ihre Gewichtskraft wirkt senkrecht, nicht entlang der Strasse: Sie ändert ihre Geschwindigkeit nicht.')],
        ])];
    },
    steps(p, v) {
      const FG = p.m * G, base = ['G', 'N', 'D', 'v'], all = [...base, 'a'];
      return [
        step(L('Forces on the cyclist', 'Kräfte auf die Radfahrerin'),
          `<p>${L(`Her weight ${m$(T('G'))} down, the normal force ${m$(T('N'))} of the road up, and the air resistance ${m$(T('D'))} against her velocity: backwards. Nothing pushes her forward: there is no “force of motion”. She keeps rolling because nothing stops her at once (inertia), not because a force drives her.`, `Ihre Gewichtskraft ${m$(T('G'))} nach unten, die Normalkraft ${m$(T('N'))} der Strasse nach oben und der Luftwiderstand ${m$(T('D'))} gegen ihre Geschwindigkeit: nach hinten. Nichts treibt sie nach vorn an: Es gibt keine „Bewegungskraft“. Sie rollt weiter, weil nichts sie sofort anhält (Trägheit), nicht weil eine Kraft sie antreibt.`)}</p>`,
          base, ['D', 'v']),
        step(L('Vertical: balance', 'Senkrecht: Gleichgewicht'),
          `<p>${L('She does not move up or down:', 'Sie bewegt sich weder nach oben noch nach unten:')} $$${T('N')} = ${T('m')}\\,g = ${res(v.N, 'N')}$$</p>`, base, ['G', 'N']),
        step(L('Horizontal: Newton’s second law', 'Waagrecht: Aktionsprinzip'),
          `<p>${L('The air resistance is the only horizontal force, so it is the net force. Backwards positive:', 'Der Luftwiderstand ist die einzige waagrechte Kraft, also ist er die resultierende Kraft. Nach hinten positiv:')}</p>` +
          `$$${T('D')} = ${T('m')}\\,${T('a')} \\;\\Rightarrow\\; ${T('a')} = \\frac{${tq(p.D, 'N')}}{${tq(p.m, 'kg')}} = ${res(v.a, 'a')}$$` +
          `<p>${L('Her acceleration points backwards: she slows down. As she gets slower, the air resistance shrinks, and she slows down less and less quickly.', 'Ihre Beschleunigung zeigt nach hinten: Sie wird langsamer. Je langsamer sie wird, desto kleiner wird der Luftwiderstand, und sie bremst immer weniger stark ab.')}</p>`,
          all, ['D', 'a']),
        step(L('Against the velocity, not the acceleration', 'Gegen die Geschwindigkeit, nicht gegen die Beschleunigung'),
          `<p>${L('The air resistance points backwards, against her velocity, and so does her acceleration. Drawn against the acceleration, it would point forwards and speed her up: wrong.', 'Der Luftwiderstand zeigt nach hinten, gegen ihre Geschwindigkeit, und ihre Beschleunigung ebenfalls. Gegen die Beschleunigung gezeichnet, zeigte er nach vorn und würde sie schneller machen: falsch.')}</p>`,
          all, ['D', 'v', 'a']),
      ];
    },
  };

  const SCENARIOS = [restUp, restAngle, pullFriction, pushPair, ropePair, atwood, tablePulley, inclinePull, inclinePulley, springHang, springFloor, dragFall, dragBike];

  root.Scenarios = { SCENARIOS, NICE };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
