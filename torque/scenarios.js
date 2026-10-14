// The situations of the worksheet “Übungen Drehmomente”: torques of forces on a plate, levers in
// balance and where to hang a beam. A scenario has an id, a family (torque, lever or hang: the kind
// of task), a difficulty from 1 to 5 (for the practice levels of earlier links), calc ('always' if
// its results need a calculator, 'trig' if only some of its angles do), choice (true if the student
// only chooses, see comps, and enters no numbers), and:
//   make(r, o)         random parameters (null if they do not fit); with o.nice, no calculator
//                      is needed (angles of 30°, 90° or 150°)
//   solve(p, o)        the wanted quantities, exact; o switches on a typical wrong idea (see why)
//                      so that wrong answers can be recognised
//   traps, why         the wrong ideas worth checking, and what each answer suggests
//   fields(p)          the wanted quantities, in order: { key, sym: [symbol, index], unit, dec,
//                      what, sense (a torque: its size and its sense of rotation), wanted (optional:
//                      the quantity in words with its symbol, for the tutor's “Wanted:”) }
//   title(p), text(p)  the situation in words
//   figure(p, v, view) the drawing: view.task (the situation only) or view.show (a Set of the
//                      parts of the solution to draw in) and view.hl (those to highlight)
//   hints(p, v), steps(p, v)  hints and the worked solution: steps { text, show, hl }
//   comps(p)           what the student identifies first in practice (identify.js), whose value
//                      the app then gives: a component { key, what, sym, base, baseVal, fn, unit,
//                      why } or a ready item { key, what, options, value } (options may carry the
//                      flag of a wrong idea, for the check)
//   results(p, v)      (optional) the short result, where there are no fields
(function (root) {
  'use strict';

  const TQ = root.TQ, { Pic } = root.Draw;
  const { L, G, tex: T, tq, q, svgSym, pick, rad } = TQ;
  const res = (x, u, dec) => `\\htmlClass{result}{${tq(x, u, dec)}}`;
  const m$ = (s) => `$${s}$`;
  // Angles of right triangles with whole sides (3-4-5, 5-12-13, …): with a length that is a multiple
  // of the hypotenuse, the lever arm is a whole number.
  const TRIANGLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
  const PYTH = TRIANGLES.flatMap(([a, b]) => [Math.atan2(a, b), Math.atan2(b, a)].map((x) => (x * 180) / Math.PI));
  const step = (rule, text, show = [], hl) => ({ text: (rule ? `<p class="step-rule">${rule}</p>` : '') + text, show, hl: hl || show });
  const exact = (x) => Math.round(x * 1e6) / 1e6;
  const CCW = () => L('counterclockwise', 'im Gegenuhrzeigersinn'), CW = () => L('clockwise', 'im Uhrzeigersinn');
  const senseWord = (M) => (Math.abs(M) < 1e-9 ? L('no rotation', 'keine Drehung') : M > 0 ? CCW() : CW());

  // ================================================================ torques on a plate
  // A plate that can turn about an axis through D, on a grid of 10 cm squares; forces F_i act at
  // grid points, along the grid (axis) or in 3-4-5 directions (oblique). The torque M = F·d,
  // with d the lever arm: the distance from D to the line of action. Positive: counterclockwise.
  const UNIT = 10; // cm per square
  const PX = 30; // px per square
  // the grid: its lines through the grid points from −x to x and −y to y (squares), D at 0, 0
  const GRID = { x: 6, y: 5, px: PX, unit: UNIT };
  // The situations drawn on this grid, where the app offers its ruler (app.js): the plates, their
  // rankings and the student's sketch. The beams have no grid; their lengths are given.
  const RULER = ['plate-axis', 'plate', 'rank-axis', 'rank', 'arm-error'];
  const AXIS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const OBLIQUE = [[3, 4], [4, 3], [-3, 4], [-4, 3], [3, -4], [4, -3], [-3, -4], [-4, -3]].map(([a, b]) => [a / 5, b / 5]);
  const arrowLen = (F) => 16 + 9 * F; // px
  const segDist = (p, a, b) => {
    const d = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2)));
    return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]);
  };
  const cross = (a, b, c, d) => {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  // the torque about D (N·m) of a force F (N) along u at the grid point P
  const torqueOf = (f) => exact(((f.P[0] * f.u[1] - f.P[1] * f.u[0]) * f.F * UNIT) / 100);

  function plateMake(r, n, oblique) {
    const fs = [], zero = oblique && r() < 0.5 ? Math.floor(r() * n) : -1;
    for (let i = 0; i < n; i++) {
      let P, u;
      if (i === zero) { // its line of action passes through D
        const k = pick(r, [2, 3]), a = pick(r, AXIS);
        P = [a[0] * k, a[1] * k]; u = pick(r, [a, [-a[0], -a[1]]]);
      } else {
        P = [Math.floor(r() * 9) - 4, Math.floor(r() * 7) - 3];
        u = oblique && (i < 2 || r() < 0.4) ? pick(r, OBLIQUE) : pick(r, AXIS);
      }
      const F = 2 + Math.floor(r() * 7);
      const f = { P, u, F };
      f.tip = [P[0] + (u[0] * arrowLen(F)) / PX, P[1] + (u[1] * arrowLen(F)) / PX];
      f.M = torqueOf(f);
      fs.push(f);
    }
    const ok = fs.every((f, i) => {
      if (Math.hypot(...f.P) < 1.5 || Math.abs(f.tip[0]) > 6.2 || Math.abs(f.tip[1]) > 4.6) return false;
      if (i !== zero && (Math.abs(f.M) < 0.05 || segDist([0, 0], f.P, f.tip) < 0.8)) return false;
      if (i === zero && segDist([0, 0], f.P, f.tip) < 0.8) return false;
      return fs.every((g, j) => j <= i || (Math.hypot(f.P[0] - g.P[0], f.P[1] - g.P[1]) >= 2 && Math.hypot(f.tip[0] - g.tip[0], f.tip[1] - g.tip[1]) >= 2.4
        && !cross(f.P, f.tip, g.P, g.tip) && segDist(g.tip, f.P, f.tip) > 1 && segDist(f.tip, g.P, g.tip) > 1
        && segDist(g.P, f.P, f.tip) > 0.6 && segDist(f.P, g.P, g.tip) > 0.6 && Math.abs(Math.abs(f.M) - Math.abs(g.M)) >= 0.03));
    });
    // the distance to the point of application must mislead for at least one force
    if (!ok || !fs.some((f) => Math.abs(Math.abs(f.M) - (f.F * Math.hypot(...f.P) * UNIT) / 100) > 0.05)) return null;
    return { forces: fs.map(({ P, u, F }) => ({ P, u, F })) };
  }

  // The lever arm (cm) and the foot of the perpendicular from D onto the line of action (grid units).
  const armOf = (f) => {
    const t = -(f.P[0] * f.u[0] + f.P[1] * f.u[1]), foot = [f.P[0] + t * f.u[0], f.P[1] + t * f.u[1]];
    return { d: exact(Math.hypot(...foot) * UNIT), foot };
  };
  const isAxis = (f) => f.u[0] === 0 || f.u[1] === 0;

  function plateFigure(p, v, view = {}) {
    const P = new Pic(PX, L('A plate that can turn about D, with the forces acting on it', 'Eine um D drehbare Platte mit den Kräften, die auf sie wirken'));
    const show = view.show || new Set(), hl = view.hl || new Set();
    const xs = p.forces.flatMap((f) => [f.P[0], f.tip ? f.tip[0] : f.P[0]]);
    P.grid(-GRID.x, -GRID.y, GRID.x, GRID.y, 1); // lines through the grid points, where D and the forces are
    // the plate: a rounded rectangle around D and the points of application
    const px = [0, ...p.forces.map((f) => f.P[0])], py = [0, ...p.forces.map((f) => f.P[1])];
    P.rect([Math.min(...px) - 0.9, Math.min(...py) - 0.9], [Math.max(...px) + 0.9, Math.max(...py) + 0.9], 'plate', 16);
    void xs;
    // a lever arm from D to the point e, with its label (and, at the foot of a perpendicular, the
    // right angle with the line of action along u)
    const armTo = (e, k, cls, u) => {
      P.line([0, 0], e, cls, true);
      P.dot(e, 'dot small', 2);
      if (u) {
        const n = Math.hypot(...e), a = 0.28, w = [(-e[0] / n) * a, (-e[1] / n) * a], along = [u[0] * a, u[1] * a];
        P.path([[e[0] + w[0], e[1] + w[1]], [e[0] + w[0] - along[0], e[1] + w[1] - along[1]], [e[0] - along[0], e[1] - along[1]]], 'w thin', true);
      }
      if (k) P.text([e[0] / 2, e[1] / 2], `<tspan font-style="italic">d</tspan><tspan class="sub" dy="4">${k}</tspan>`, 'lbl arm-lbl', 'middle', [e[1] >= 0 && Math.abs(e[0]) > 0.1 ? -10 : 10, Math.abs(e[0]) < 0.1 ? 0 : -10]);
    };
    // a student's sketch (find the error): every lever arm drawn, one of them (p.wrong) to the point
    // of application; with show 'fix', the right one beside it
    const student = p.wrong != null;
    p.forces.forEach((f, i) => {
      const k = i + 1, tip = [f.P[0] + (f.u[0] * arrowLen(f.F)) / PX, f.P[1] + (f.u[1] * arrowLen(f.F)) / PX];
      if (student || show.has(`arm${k}`)) {
        const { foot } = armOf(f);
        // the line of action, as far as the grid goes
        const ts = [[-GRID.x, GRID.x, 0], [-GRID.y, GRID.y, 1]].flatMap(([lo, hi, k]) => (Math.abs(f.u[k]) < 1e-9 ? [] : [(lo - f.P[k]) / f.u[k], (hi - f.P[k]) / f.u[k]]));
        const inside = (t) => Math.abs(f.P[0] + t * f.u[0]) <= GRID.x + 1e-9 && Math.abs(f.P[1] + t * f.u[1]) <= GRID.y + 1e-9;
        const tt = ts.filter(inside), t0 = Math.min(...tt), t1 = Math.max(...tt);
        P.line([f.P[0] + t0 * f.u[0], f.P[1] + t0 * f.u[1]], [f.P[0] + t1 * f.u[0], f.P[1] + t1 * f.u[1]], 'action', true);
        const cls = `arm${hl.has(`arm${k}`) ? ' hl' : ''}`;
        if (student && i === p.wrong) {
          if (show.has('fix')) { armTo(f.P, 0, 'arm wrong', null); armTo(foot, k, cls, f.u); } else armTo(f.P, k, cls, null);
        } else if (v.M[i] !== 0) armTo(foot, k, cls, f.u);
      }
      const cls = `force${hl.size && !hl.has(`F${k}`) && !hl.has(`arm${k}`) ? ' dim' : ''}${hl.has(`F${k}`) || hl.has(`arm${k}`) ? ' hl' : ''}`;
      const off = [f.u[0] * 12 + (Math.abs(f.u[0]) < 0.5 ? 8 : 0), -f.u[1] * 12 + (Math.abs(f.u[1]) < 0.5 ? 0 : f.u[1] > 0 ? -2 : 4)];
      P.arrow(f.P, f.u, arrowLen(f.F), cls, `${svgSym('F', k)} = ${f.F} N`, off);
      if (show.has(`turn${k}`) && v.M[i] !== 0) P.turn([0, 0], 26, Math.sign(v.M[i]), 'turn hl', v.M[i] > 0 ? 120 : 0); // open at the top right, where D's label is
      void tip;
    });
    P.pivot([0, 0]);
    P.text([0, 0], 'D', 'lbl', 'start', [7, -10]);
    P.text([-GRID.x, -GRID.y], L('squares: 10 cm', 'Kästchen: 10 cm'), 'lbl note', 'start', [0, 16]);
    return P.svg();
  }

  const plateWhat = (k) => L(`torque of $F_${k}$`, `Drehmoment von $F_${k}$`);
  function plate(id, difficulty, n, oblique) {
    return {
      id, family: 'torque', difficulty,
      make: (r) => plateMake(r, n, oblique),
      solve(p, o = {}) {
        const out = { M: p.forces.map((f) => (o.arm ? Math.sign(torqueOf(f)) * exact((f.F * Math.hypot(...f.P) * UNIT) / 100) : torqueOf(f))) };
        p.forces.forEach((f, i) => { out[`M${i + 1}`] = out.M[i]; });
        return out;
      },
      traps: ['arm'],
      why: { arm: () => L('That is the force times the distance from D to where the force acts. The lever arm is the distance from D to the line of action.', 'Das ist die Kraft mal den Abstand von D zum Angriffspunkt. Der Hebelarm ist der Abstand von D zur Wirkungslinie.') },
      fields: (p) => p.forces.map((f, i) => ({ key: `M${i + 1}`, sym: ['M', i + 1], unit: 'Nm', dec: 2, what: plateWhat(i + 1), sense: true,
        wanted: L(`the torque $M_${i + 1}$ of $F_${i + 1}$`, `das Drehmoment $M_${i + 1}$ von $F_${i + 1}$`) })),
      title: () => (oblique ? L('Torques on a plate', 'Drehmomente auf eine Platte') : L('Forces along the grid', 'Kräfte entlang des Gitters')),
      text: () => L(`A flat plate can turn about a fixed axis through D, perpendicular to the plate. ${n} forces act on it, drawn on a grid of 10 cm squares. Find the torque of each force about D and the sense in which it would turn the plate. Then rank the torques by size.`,
        `Eine flache Platte ist um eine feste Achse durch D drehbar, die senkrecht zur Platte steht. ${n === 3 ? 'Drei' : n === 4 ? 'Vier' : 'Fünf'} Kräfte wirken auf sie, gezeichnet auf einem Gitter aus Kästchen von 10 cm. Bestimme das Drehmoment jeder Kraft bezüglich D und den Drehsinn, in dem sie die Platte drehen würde. Ordne die Drehmomente dann nach ihrem Betrag.`),
      figure: plateFigure,
      hints: (p) => [
        L('The torque of a force is M = F · d, where the lever arm d is the distance from the axis D to the line of action of the force (not to the point where it acts).',
          'Das Drehmoment einer Kraft ist M = F · d; der Hebelarm d ist der Abstand der Drehachse D von der Wirkungslinie der Kraft (nicht vom Angriffspunkt).'),
        L('Extend each arrow to a line: the line of action. For a force along the grid, the lever arm is the number of squares from D to that line (times 10 cm).',
          'Verlängere jeden Pfeil zu einer Geraden, der Wirkungslinie. Bei einer Kraft entlang des Gitters ist der Hebelarm die Anzahl Kästchen von D bis zu dieser Geraden (mal 10 cm).'),
        ...(oblique ? [L('An oblique force has the steepness 3 : 4 or 4 : 3. Split it into a horizontal and a vertical component (0.6 F and 0.8 F). Each has a lever arm you can read off the grid; their torques add, or subtract if they turn opposite ways.',
          'Eine schräge Kraft hat die Steigung 3 : 4 oder 4 : 3. Zerlege sie in eine horizontale und eine vertikale Komponente (0.6 F und 0.8 F). Jede hat einen Hebelarm, den du am Gitter ablesen kannst; ihre Drehmomente addieren sich, oder sie subtrahieren sich, wenn sie gegeneinander drehen.')] : []),
        L(`Sense of rotation: imagine the plate pinned at D and pushed only by this force. If the line of action passes through D, the torque is zero.`,
          'Drehsinn: Stell dir vor, die Platte sei in D festgesteckt und nur diese Kraft wirke. Geht die Wirkungslinie durch D, ist das Drehmoment null.'),
      ],
      steps(p, v) {
        const out = [step(L('Torque', 'Drehmoment'),
          `<p>${L('The torque of a force about D is the force times its lever arm, the distance from D to the line of action:', 'Das Drehmoment einer Kraft bezüglich D ist die Kraft mal ihr Hebelarm, der Abstand von D zur Wirkungslinie:')}</p>$$M = F\\cdot d$$` +
          `<p>${L('Its sense is the way the force alone would turn the plate about D.', 'Sein Drehsinn ist die Richtung, in die die Kraft allein die Platte um D drehen würde.')}</p>`)];
        p.forces.forEach((f, i) => {
          const k = i + 1, M = v.M[i], { d } = armOf(f), sh = [`arm${k}`, `turn${k}`];
          let body;
          if (M === 0) {
            body = L(`The line of action of $F_${k}$ passes through D: its lever arm is zero, so $M_${k} = ${res(0, 'Nm')}$. It does not turn the plate.`,
              `Die Wirkungslinie von $F_${k}$ geht durch D: Ihr Hebelarm ist null, also $M_${k} = ${res(0, 'Nm')}$. Sie dreht die Platte nicht.`);
          } else if (isAxis(f)) {
            body = L(`The line of action of $F_${k}$ is ${f.u[0] === 0 ? 'vertical' : 'horizontal'}, ${d / UNIT} squares from D: $d_${k} = ${tq(d, 'cm')} = ${tq(d / 100, 'm')}$.`,
              `Die Wirkungslinie von $F_${k}$ ist ${f.u[0] === 0 ? 'senkrecht' : 'waagrecht'}, ${d / UNIT} Kästchen von D entfernt: $d_${k} = ${tq(d, 'cm')} = ${tq(d / 100, 'm')}$.`) +
              `$$M_${k} = F_${k}\\cdot d_${k} = ${tq(f.F, 'N')}\\cdot ${tq(d / 100, 'm')} = ${res(Math.abs(M), 'Nm')}$$` +
              L(`It turns the plate ${senseWord(M)}.`, `Sie dreht die Platte ${senseWord(M)}.`);
          } else {
            const Fx = exact(f.F * f.u[0]), Fy = exact(f.F * f.u[1]), dx = f.P[0] * UNIT, dy = f.P[1] * UNIT;
            const Mx = exact((-f.P[1] * Fx * UNIT) / 100), My = exact((f.P[0] * Fy * UNIT) / 100);
            const part = (Mc) => `${q(Math.abs(Mc), 'Nm')} ${Mc > 0 ? '↺' : Mc < 0 ? '↻' : ''}`;
            body = L(`$F_${k}$ is oblique. Split it into a horizontal component of ${q(Math.abs(Fx), 'N')} and a vertical one of ${q(Math.abs(Fy), 'N')}. ` +
              `The horizontal component acts ${Math.abs(dy)} cm ${dy >= 0 ? 'above' : 'below'} D, the vertical one ${Math.abs(dx)} cm ${dx >= 0 ? 'right of' : 'left of'} D; so their torques are ${part(Mx)} and ${part(My)}.`,
            `$F_${k}$ ist schräg. Zerlege sie in eine horizontale Komponente von ${q(Math.abs(Fx), 'N')} und eine vertikale von ${q(Math.abs(Fy), 'N')}. ` +
              `Die horizontale Komponente greift ${Math.abs(dy)} cm ${dy >= 0 ? 'über' : 'unter'} D an, die vertikale ${Math.abs(dx)} cm ${dx >= 0 ? 'rechts' : 'links'} von D; ihre Drehmomente sind also ${part(Mx)} und ${part(My)}.`) +
              `$$M_${k} = ${res(Math.abs(M), 'Nm')}$$` +
              L(`together, ${senseWord(M)}. The lever arm of the whole force is $d_${k} = M_${k}/F_${k} = ${tq(d, 'cm', 1)}$ (drawn in): less than the distance from D to where the force acts.`,
                `zusammen, ${senseWord(M)}. Der Hebelarm der ganzen Kraft ist $d_${k} = M_${k}/F_${k} = ${tq(d, 'cm', 1)}$ (eingezeichnet): kleiner als der Abstand von D zum Angriffspunkt.`);
          }
          out.push(step(L(`Force ${k}`, `Kraft ${k}`), `<p>${body}</p>`, sh, [`arm${k}`]));
        });
        const order = v.M.map((M, i) => ({ M, i })).sort((a, b) => Math.abs(a.M) - Math.abs(b.M));
        out.push(step(L('Ranking', 'Rangfolge'),
          `$$${order.map((o) => `M_${o.i + 1}`).join(' < ')}$$<p>${order.map((o) => `$M_${o.i + 1} = ${tq(Math.abs(o.M), 'Nm')}$ ${o.M > 0 ? '↺' : o.M < 0 ? '↻' : ''}`).join(', ')}</p>`,
          p.forces.map((f, i) => `arm${i + 1}`), []));
        return out;
      },
    };
  }

  // ================================================================ ranking and finding the error
  // Choices only, no numbers to enter (choice: true): the item to choose is in comps. Ranking: the
  // order of the torques of a plate by size. Find the error: a student's sketch of the lever arms,
  // one of them drawn to the point of application instead of to the line of action.
  const orderTex = (o) => `$${o.map((i) => `M_${i + 1}`).join(' < ')}$`;
  // all orders of the indices 0 … n−1
  const perms = (n) => (n <= 1 ? [[0]] : perms(n - 1).flatMap((q) => Array.from({ length: n }, (_, k) => [...q.slice(0, k), n - 1, ...q.slice(k)])));
  const orderBy = (xs) => xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x || a.i - b.i).map((o) => o.i);
  // The ranking to choose: the right one, the order of the forces alone, the order of F times the
  // distance to the point of application (the wrong idea of the lever arm), then other orders. In
  // the order of their texts, so that the right one is not always first.
  function rankItem(p) {
    const v = p.forces.map((f) => Math.abs(torqueOf(f))), wrongArm = p.forces.map((f) => f.F * Math.hypot(...f.P));
    const opts = [{ order: orderBy(v), right: true }];
    const add = (order, flag, why) => { if (opts.length < 4 && !opts.some((o) => o.order.join() === order.join())) opts.push({ order, flag, why }); };
    add(orderBy(p.forces.map((f) => f.F)), 'force', L('That is the order of the forces. A torque depends on the lever arm as well: M = F · d.', 'Das ist die Reihenfolge der Kräfte. Ein Drehmoment hängt auch vom Hebelarm ab: M = F · d.'));
    add(orderBy(wrongArm), 'arm', L('That is the order of F times the distance from D to where the force acts. The lever arm is the distance from D to the line of action.', 'Das ist die Reihenfolge von F mal dem Abstand von D zum Angriffspunkt. Der Hebelarm ist der Abstand von D zur Wirkungslinie.'));
    perms(p.forces.length).forEach((o) => add(o, null, L('Work out F · d for each force, with d the lever arm.', 'Bestimme F · d für jede Kraft, mit d dem Hebelarm.')));
    opts.sort((a, b) => (orderTex(a.order) < orderTex(b.order) ? -1 : 1));
    const right = opts.find((o) => o.right).order;
    return {
      key: 'rank', what: L('The torques by size, the smallest first:', 'Die Drehmomente nach Betrag, das kleinste zuerst:'),
      options: opts.map((o) => ({ html: orderTex(o.order), right: !!o.right, flag: o.flag, why: o.why })),
      value: `${orderTex(right)}: ${right.map((i) => `$M_${i + 1} = ${tq(v[i], 'Nm')}$`).join(', ')}`,
    };
  }
  function rank(id, difficulty, n, oblique) {
    const base = plate(id, difficulty, n, oblique);
    return {
      ...base, family: 'torque', choice: true,
      // the largest force must not settle it: its order differs from that of the torques
      make: (r) => { const p = plateMake(r, n, oblique); return p && orderBy(p.forces.map((f) => f.F)).join() !== orderBy(p.forces.map((f) => Math.abs(torqueOf(f)))).join() ? p : null; },
      traps: [],
      fields: () => [],
      comps: (p) => [rankItem(p)],
      results: (p) => rankItem(p).value,
      title: () => L('Ranking torques', 'Drehmomente ordnen'),
      text: () => L(`A flat plate can turn about a fixed axis through D, perpendicular to the plate. ${n === 3 ? 'Three' : 'Four'} forces act on it, drawn on a grid of 10 cm squares. Rank their torques about D by size.`,
        `Eine flache Platte ist um eine feste Achse durch D drehbar, die senkrecht zur Platte steht. ${n === 3 ? 'Drei' : 'Vier'} Kräfte wirken auf sie, gezeichnet auf einem Gitter aus Kästchen von 10 cm. Ordne ihre Drehmomente bezüglich D nach dem Betrag.`),
      hints: (p) => [...base.hints(p).slice(0, -1),
        L('Work out M = F · d for each force. The largest force need not have the largest torque.', 'Bestimme M = F · d für jede Kraft. Die grösste Kraft hat nicht unbedingt das grösste Drehmoment.')],
    };
  }

  // A student's sketch: three forces along the grid, every lever arm drawn, one (wrong) from D to
  // the point of application. Each force acts away from the foot of its perpendicular, so that the
  // wrong arm can be told from the right ones.
  const student = (p, i) => { const f = p.forces[i]; return i === p.wrong ? Math.hypot(...f.P) * UNIT : armOf(f).d; };
  const armError = {
    id: 'arm-error', family: 'torque', difficulty: 2, choice: true,
    make(r) {
      const p = plateMake(r, 3, false);
      if (!p || !p.forces.every((f) => { const { foot } = armOf(f); return Math.hypot(f.P[0] - foot[0], f.P[1] - foot[1]) >= 1; })) return null;
      return { ...p, wrong: Math.floor(r() * 3) };
    },
    solve: (p) => plate('', 0, 3, false).solve(p),
    traps: [],
    fields: () => [],
    comps: (p) => [{
      key: 'wrong', what: L('The lever arm drawn wrong:', 'Der falsch gezeichnete Hebelarm:'),
      options: [...p.forces.map((f, i) => ({ html: `$d_${i + 1}$`, right: i === p.wrong, flag: i === p.wrong ? undefined : 'arm',
        why: L(`$d_${i + 1}$ runs from D to the line of action of $F_${i + 1}$ and meets it at a right angle: that is its lever arm.`, `$d_${i + 1}$ führt von D zur Wirkungslinie von $F_${i + 1}$ und trifft sie rechtwinklig: Das ist ihr Hebelarm.`) })),
      { html: L('none', 'keiner'), right: false, flag: 'arm', why: L('Check whether each lever arm meets the line of action at a right angle.', 'Prüfe, ob jeder Hebelarm die Wirkungslinie rechtwinklig trifft.') }],
      value: L(`$d_${p.wrong + 1}$ runs to the point where $F_${p.wrong + 1}$ acts, not perpendicular to its line of action.`, `$d_${p.wrong + 1}$ führt zum Angriffspunkt von $F_${p.wrong + 1}$, nicht senkrecht zu ihrer Wirkungslinie.`),
    }],
    results: (p) => L(`the lever arm $d_${p.wrong + 1}$`, `der Hebelarm $d_${p.wrong + 1}$`),
    title: () => L('Find the error', 'Finde den Fehler'),
    text: (p) => L(`A plate can turn about an axis through D; three forces act on it (squares of 10 cm). A student drew the lines of action and the lever arms and found the torques:`,
      `Eine Platte ist um eine Achse durch D drehbar; drei Kräfte wirken auf sie (Kästchen von 10 cm). Eine Schülerin hat die Wirkungslinien und die Hebelarme gezeichnet und die Drehmomente bestimmt:`) +
      `</p><p>${p.forces.map((f, i) => `$M_${i + 1} = ${f.F}\\,\\mathrm{N}\\cdot ${tq(student(p, i) / 100, 'm', 3)} = ${tq((f.F * student(p, i)) / 100, 'Nm', 2)}$`).join(', ')}.</p><p>` +
      L('One of the lever arms is drawn wrong. Which?', 'Einer der Hebelarme ist falsch gezeichnet. Welcher?'),
    figure: plateFigure,
    hints: () => [
      L('The lever arm is the distance from D to the line of action: the perpendicular from D onto the extended arrow.', 'Der Hebelarm ist der Abstand von D zur Wirkungslinie: das Lot von D auf den verlängerten Pfeil.'),
      L('A lever arm meets the line of action at a right angle. It need not end where the force acts.', 'Ein Hebelarm trifft die Wirkungslinie rechtwinklig. Er muss nicht dort enden, wo die Kraft angreift.'),
    ],
    steps(p, v) {
      const out = [step(L('The lever arm', 'Der Hebelarm'),
        `<p>${L('The lever arm of a force is the distance from the axis D to its line of action: the perpendicular from D onto the extended arrow. It meets the line of action at a right angle and need not end where the force acts. Check each arm in the sketch:', 'Der Hebelarm einer Kraft ist der Abstand der Drehachse D von ihrer Wirkungslinie: das Lot von D auf den verlängerten Pfeil. Er trifft die Wirkungslinie rechtwinklig und muss nicht dort enden, wo die Kraft angreift. Prüfe jeden Arm in der Skizze:')}</p>`)];
      p.forces.forEach((f, i) => {
        const k = i + 1, d = armOf(f).d, M = Math.abs(v.M[i]);
        const body = i === p.wrong
          ? L(`$d_${k}$ runs from D to the point where $F_${k}$ acts; it does not meet the line of action at a right angle. <b>This is the error.</b> The lever arm is the perpendicular onto the line of action, $d_${k} = ${tq(d, 'cm')}$, so $M_${k} = ${f.F}\\,\\mathrm{N}\\cdot ${tq(d / 100, 'm')} = ${res(M, 'Nm')}$, not ${q((f.F * student(p, i)) / 100, 'Nm', 2)}.`,
            `$d_${k}$ führt von D zum Angriffspunkt von $F_${k}$; er trifft die Wirkungslinie nicht rechtwinklig. <b>Das ist der Fehler.</b> Der Hebelarm ist das Lot auf die Wirkungslinie, $d_${k} = ${tq(d, 'cm')}$, also $M_${k} = ${f.F}\\,\\mathrm{N}\\cdot ${tq(d / 100, 'm')} = ${res(M, 'Nm')}$, nicht ${q((f.F * student(p, i)) / 100, 'Nm', 2)}.`)
          : L(`$d_${k}$ meets the line of action of $F_${k}$ at a right angle: right. $M_${k} = ${tq(M, 'Nm')}$.`, `$d_${k}$ trifft die Wirkungslinie von $F_${k}$ rechtwinklig: richtig. $M_${k} = ${tq(M, 'Nm')}$.`);
        out.push(step(L(`Force ${k}`, `Kraft ${k}`), `<p>${body}</p>`, i >= p.wrong ? ['fix'] : [], [`arm${k}`]));
      });
      return out;
    },
  };

  // ================================================================ levers in balance
  // A beam on a support or an axis: the torques that turn it one way balance those that turn it
  // the other way. Beams are drawn at a scale that fits them into about 360 px.
  const BEAM_PX = 360;
  const kg = (m) => q(m, 'kg', 2);
  const cm = (x) => q(x, 'cm', 1);
  const N = (F) => q(F, 'N', 1);

  // A beam from x = 0 to len (cm), its scale, and helpers: the support or axis at s, loads.
  function beamPic(len, label, thick = 3) {
    const P = new Pic(BEAM_PX / len, label), h = 10 / P.s;
    P.rect([0, 0], [len, h], 'beam', 2);
    void thick;
    return { P, h, top: (x) => [x, h], bottom: (x) => [x, 0], mid: (x) => [x, h / 2] };
  }

  // the seesaw: a light beam on a support in its middle; m1 at a1 on the left; on the right m2 at
  // x (find x) or at a2 (find m2)
  const seesaw = {
    id: 'seesaw', family: 'lever', difficulty: 1,
    make(r) {
      const find = pick(r, ['x', 'm']), m1 = pick(r, [0.5, 1, 1.5, 2, 2.5, 3, 4]), a1 = pick(r, [10, 15, 20, 25, 30, 40, 45, 50]);
      const m2 = pick(r, [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
      if (m2 === m1) return null;
      const x = (m1 * a1) / m2;
      if (x > 60 || x < 5) return null;
      return find === 'x' ? { find, m1, a1, m2 } : { find, m1, a1, a2: x, m2 };
    },
    solve(p, o = {}) {
      if (p.find === 'x') return { x: exact(o.swap ? (p.m2 * p.a1) / p.m1 : (p.m1 * p.a1) / p.m2) };
      return { m: exact(o.swap ? (p.m1 * p.a2) / p.a1 : (p.m1 * p.a1) / p.a2) };
    },
    traps: ['swap'],
    why: { swap: () => L('Reversed: the heavier mass needs the shorter lever arm.', 'Umgekehrt: Die schwerere Masse braucht den kürzeren Hebelarm.') },
    // in practice, where the reason would give the answer away
    nudge: { swap: () => L('Which lever arm belongs to which mass? Check which side turns the beam more.', 'Welcher Hebelarm gehört zu welcher Masse? Prüfe, welche Seite den Balken stärker dreht.') },
    fields: (p) => (p.find === 'x' ? [{ key: 'x', sym: ['x'], unit: 'cm', dec: 1, what: L('distance from the support', 'Abstand von der Stütze') }]
      : [{ key: 'm', sym: ['m', 2], unit: 'kg', dec: 2, what: L('mass on the right', 'Masse rechts') }]),
    title: () => L('Balancing a lever', 'Ein Hebel im Gleichgewicht'),
    text: (p) => (p.find === 'x'
      ? L(`A light beam rests on a support in its middle. A mass of ${kg(p.m1)} hangs ${cm(p.a1)} to the left of the support. How far to the right of the support must a mass of ${kg(p.m2)} hang so that the beam is balanced?`,
        `Ein leichter Balken liegt in seiner Mitte auf einer Stütze. ${cm(p.a1)} links der Stütze hängt eine Masse von ${kg(p.m1)}. Wie weit rechts der Stütze muss eine Masse von ${kg(p.m2)} hängen, damit der Balken im Gleichgewicht ist?`)
      : L(`A light beam rests on a support in its middle. A mass of ${kg(p.m1)} hangs ${cm(p.a1)} to the left of the support. Which mass must hang ${cm(p.a2)} to the right of the support so that the beam is balanced?`,
        `Ein leichter Balken liegt in seiner Mitte auf einer Stütze. ${cm(p.a1)} links der Stütze hängt eine Masse von ${kg(p.m1)}. Welche Masse muss ${cm(p.a2)} rechts der Stütze hängen, damit der Balken im Gleichgewicht ist?`)),
    figure(p, v, view = {}) {
      const a2 = p.find === 'x' ? (view.task ? null : v.x) : p.a2, half = Math.max(p.a1, a2 || 0, p.find === 'x' ? 40 : 0) + 10;
      const B = beamPic(2 * half, L('A beam on a support with a load on each side', 'Ein Balken auf einer Stütze mit einer Last auf jeder Seite')), P = B.P, c = half;
      P.support(B.bottom(c));
      P.mass(B.bottom(c - p.a1), 40, kg(p.m1));
      const m2 = p.find === 'm' ? (view.task ? '?' : kg(v.m)) : kg(p.m2);
      if (a2 != null) P.mass(B.bottom(c + a2), 40, m2, `load${p.find === 'm' ? ' unknown' : ''}`);
      else P.mass(B.bottom(c + 30), 40, m2, 'load ghost');
      P.dim(B.top(c - p.a1), B.top(c), cm(p.a1), 14);
      if (a2 != null) P.dim(B.top(c), B.top(c + a2), p.find === 'x' && view.task ? svgSym('x') : cm(a2), 14, `dimline${p.find === 'x' ? ' hl' : ''}`);
      else P.dim(B.top(c), B.top(c + 30), svgSym('x') + ' = ?', 14, 'dimline hl');
      return P.svg();
    },
    hints: (p) => [
      L('Each weight turns the beam about the support: the left one counterclockwise, the right one clockwise. In balance the two torques are equal.', 'Jede Gewichtskraft dreht den Balken um die Stütze: die linke im Gegenuhrzeigersinn, die rechte im Uhrzeigersinn. Im Gleichgewicht sind die beiden Drehmomente gleich gross.'),
      L('Torque = weight × lever arm, and the weight is m g. So m₁ g a₁ = m₂ g a₂: g cancels.', 'Drehmoment = Gewichtskraft × Hebelarm, und die Gewichtskraft ist m g. Also m₁ g a₁ = m₂ g a₂: g kürzt sich weg.'),
      p.find === 'x' ? L('Solve for the unknown arm: x = m₁ a₁ / m₂.', 'Löse nach dem unbekannten Hebelarm auf: x = m₁ a₁ / m₂.') : L('Solve for the unknown mass: m₂ = m₁ a₁ / a₂.', 'Löse nach der unbekannten Masse auf: m₂ = m₁ a₁ / a₂.'),
    ],
    steps(p, v) {
      const law = `m_1\\,g\\,a_1 = m_2\\,g\\,${p.find === 'x' ? 'x' : 'a_2'}`;
      return [
        step(L('Balance of torques', 'Gleichgewicht der Drehmomente'),
          `<p>${L('The left load turns the beam counterclockwise about the support, the right one clockwise. The beam is balanced if both torques are equal; each is the weight m g times its lever arm:', 'Die linke Last dreht den Balken im Gegenuhrzeigersinn um die Stütze, die rechte im Uhrzeigersinn. Der Balken ist im Gleichgewicht, wenn beide Drehmomente gleich gross sind; jedes ist die Gewichtskraft m g mal ihr Hebelarm:')}</p>$$${law}$$`),
        p.find === 'x'
          ? step(L('Formula, then numbers', 'Formel, dann Zahlen'), `<p>${L('g cancels; solve for x:', 'g kürzt sich weg; nach x auflösen:')}</p>$$x = \\frac{m_1\\,a_1}{m_2} = \\frac{${tq(p.m1, 'kg')}\\cdot ${tq(p.a1, 'cm')}}{${tq(p.m2, 'kg')}} = ${res(v.x, 'cm', 1)}$$<p>${L('The lighter mass needs the longer lever arm.', 'Die leichtere Masse braucht den längeren Hebelarm.')}</p>`)
          : step(L('Formula, then numbers', 'Formel, dann Zahlen'), `<p>${L('g cancels; solve for m₂:', 'g kürzt sich weg; nach m₂ auflösen:')}</p>$$m_2 = \\frac{m_1\\,a_1}{a_2} = \\frac{${tq(p.m1, 'kg')}\\cdot ${tq(p.a1, 'cm')}}{${tq(p.a2, 'cm')}} = ${res(v.m, 'kg', 2)}$$`),
      ];
    },
  };

  // three loads: m1 at a1 and m2 at a2 on the left, m3 on the right at x (find x)
  const lever3 = {
    id: 'lever3', family: 'lever', difficulty: 2,
    make(r) {
      const m1 = pick(r, [0.5, 1, 1.5, 2, 3]), m2 = pick(r, [0.5, 1, 1.5, 2, 3]), a1 = pick(r, [10, 20, 30]), a2 = a1 + pick(r, [10, 20, 30]);
      const m3 = pick(r, [1, 1.5, 2, 2.5, 3, 4, 5]), x = (m1 * a1 + m2 * a2) / m3;
      if (x > 70 || x < 10) return null;
      return { m1, m2, a1, a2, m3 };
    },
    solve(p, o = {}) {
      if (o.oneLoad) return { x: exact((p.m2 * p.a2) / p.m3) };
      if (o.sumMass) return { x: exact(((p.m1 + p.m2) * p.a2) / p.m3) };
      return { x: exact((p.m1 * p.a1 + p.m2 * p.a2) / p.m3) };
    },
    traps: ['oneLoad', 'sumMass'],
    why: {
      oneLoad: () => L('Both loads on the left turn the beam: add their torques.', 'Beide Lasten links drehen den Balken: Addiere ihre Drehmomente.'),
      sumMass: () => L('Each load has its own lever arm: add the torques, not the masses.', 'Jede Last hat ihren eigenen Hebelarm: Addiere die Drehmomente, nicht die Massen.'),
    },
    fields: () => [{ key: 'x', sym: ['x'], unit: 'cm', dec: 1, what: L('distance from the support', 'Abstand von der Stütze') }],
    title: () => L('Two loads against one', 'Zwei Lasten gegen eine'),
    text: (p) => L(`A light beam rests on a support in its middle. On the left, a mass of ${kg(p.m1)} hangs ${cm(p.a1)} from the support and a mass of ${kg(p.m2)} ${cm(p.a2)} from it. How far to the right of the support must a mass of ${kg(p.m3)} hang so that the beam is balanced?`,
      `Ein leichter Balken liegt in seiner Mitte auf einer Stütze. Links hängt eine Masse von ${kg(p.m1)} ${cm(p.a1)} von der Stütze entfernt und eine Masse von ${kg(p.m2)} ${cm(p.a2)} von ihr entfernt. Wie weit rechts der Stütze muss eine Masse von ${kg(p.m3)} hängen, damit der Balken im Gleichgewicht ist?`),
    figure(p, v, view = {}) {
      const x = view.task ? null : v.x, half = Math.max(p.a2, x || 40) + 10;
      const B = beamPic(2 * half, L('A beam on a support with two loads on the left and one on the right', 'Ein Balken auf einer Stütze mit zwei Lasten links und einer rechts')), P = B.P, c = half;
      P.support(B.bottom(c));
      P.mass(B.bottom(c - p.a1), 34, kg(p.m1));
      P.mass(B.bottom(c - p.a2), 34, kg(p.m2));
      P.dim(B.top(c - p.a1), B.top(c), cm(p.a1), 14);
      P.dim(B.top(c - p.a2), B.top(c), cm(p.a2), 38);
      const xr = x == null ? 30 : x;
      P.mass(B.bottom(c + xr), 34, kg(p.m3), x == null ? 'load ghost' : 'load');
      P.dim(B.top(c), B.top(c + xr), x == null ? svgSym('x') + ' = ?' : cm(x), 14, 'dimline hl');
      return P.svg();
    },
    hints: () => [
      L('Both loads on the left turn the beam counterclockwise; the load on the right turns it clockwise.', 'Beide Lasten links drehen den Balken im Gegenuhrzeigersinn, die Last rechts im Uhrzeigersinn.'),
      L('In balance, the sum of the counterclockwise torques equals the sum of the clockwise ones: m₁ g a₁ + m₂ g a₂ = m₃ g x.', 'Im Gleichgewicht ist die Summe der Drehmomente im Gegenuhrzeigersinn gleich der Summe derjenigen im Uhrzeigersinn: m₁ g a₁ + m₂ g a₂ = m₃ g x.'),
    ],
    steps: (p, v) => [
      step(L('Balance of torques', 'Gleichgewicht der Drehmomente'),
        `<p>${L('Both loads on the left turn the beam counterclockwise, the one on the right clockwise. In balance the torques of both senses are equal:', 'Beide Lasten links drehen den Balken im Gegenuhrzeigersinn, die rechte im Uhrzeigersinn. Im Gleichgewicht sind die Drehmomente beider Drehsinne gleich gross:')}</p>$$m_1\\,g\\,a_1 + m_2\\,g\\,a_2 = m_3\\,g\\,x$$`),
      step(L('Formula, then numbers', 'Formel, dann Zahlen'),
        `$$x = \\frac{m_1\\,a_1 + m_2\\,a_2}{m_3} = \\frac{${tq(p.m1, 'kg')}\\cdot ${tq(p.a1, 'cm')} + ${tq(p.m2, 'kg')}\\cdot ${tq(p.a2, 'cm')}}{${tq(p.m3, 'kg')}} = ${res(v.x, 'cm', 1)}$$`),
    ],
  };

  // a heavy beam (mass mb, length len) on a support at s from its left end (left of the middle);
  // a load m hangs at the left end. Find m (the beam's mass given) or mb (the load given).
  const beamWeight = {
    id: 'beam-weight', family: 'lever', difficulty: 3,
    make(r) {
      const len = pick(r, [60, 80, 100, 120]), s = pick(r, [10, 15, 20, 25, 30, 40].filter((x) => x < len / 2 - 5)), find = pick(r, ['m', 'mb']);
      const mb = pick(r, [0.5, 1, 1.5, 2, 3, 4]), m = (mb * (len / 2 - s)) / s;
      if (m > 10 || m < 0.2) return null;
      if (find === 'mb' && Math.abs(m * 20 - Math.round(m * 20)) > 1e-9) return null; // a given mass in steps of 50 g
      return find === 'm' ? { len, s, find, mb } : { len, s, find, m: exact(m) };
    },
    solve(p, o = {}) {
      const arm = o.end ? p.len / 2 : p.len / 2 - p.s;
      return p.find === 'm' ? { m: exact((p.mb * arm) / p.s) } : { mb: exact((p.m * p.s) / arm) };
    },
    traps: ['end'],
    why: { end: () => L('The lever arm of the beam’s weight is measured from the support to the middle of the beam, not from the end.', 'Der Hebelarm der Gewichtskraft des Balkens wird von der Stütze bis zur Balkenmitte gemessen, nicht vom Ende.') },
    fields: (p) => (p.find === 'm' ? [{ key: 'm', sym: ['m'], unit: 'kg', dec: 2, what: L('mass of the load', 'Masse der Last') }]
      : [{ key: 'mb', sym: ['m', 'B'], unit: 'kg', dec: 2, what: L('mass of the beam', 'Masse des Balkens') }]),
    title: () => L('A heavy beam', 'Ein schwerer Balken'),
    text: (p) => (p.find === 'm'
      ? L(`A uniform beam ${cm(p.len)} long with a mass of ${kg(p.mb)} rests on a support ${cm(p.s)} from its left end. Which mass must hang at the left end so that the beam is balanced?`,
        `Ein gleichmässiger Balken von ${cm(p.len)} Länge und ${kg(p.mb)} Masse liegt ${cm(p.s)} von seinem linken Ende entfernt auf einer Stütze. Welche Masse muss am linken Ende hängen, damit der Balken im Gleichgewicht ist?`)
      : L(`A uniform beam ${cm(p.len)} long rests on a support ${cm(p.s)} from its left end. With a mass of ${kg(p.m)} hanging at its left end, it is balanced. What is the mass of the beam?`,
        `Ein gleichmässiger Balken von ${cm(p.len)} Länge liegt ${cm(p.s)} von seinem linken Ende entfernt auf einer Stütze. Hängt an seinem linken Ende eine Masse von ${kg(p.m)}, ist er im Gleichgewicht. Wie gross ist die Masse des Balkens?`)),
    figure(p, v, view = {}) {
      const B = beamPic(p.len, L('A beam on a support near its left end, with a load at that end', 'Ein Balken auf einer Stütze nahe seinem linken Ende, mit einer Last an diesem Ende')), P = B.P;
      const show = view.show || new Set();
      P.support(B.bottom(p.s));
      P.mass(B.bottom(0), 40, p.find === 'm' ? (view.task ? '?' : kg(v.m)) : kg(p.m), `load${p.find === 'm' ? ' unknown' : ''}`);
      P.text(B.bottom(p.len * 0.78), p.find === 'mb' ? (view.task ? `${svgSym('m', 'B')} = ?` : `${svgSym('m', 'B')} = ${kg(v.mb)}`) : `${svgSym('m', 'B')} = ${kg(p.mb)}`, 'lbl mass', 'middle', [0, 16]);
      P.dim(B.top(0), B.top(p.len), cm(p.len), 38);
      P.dim(B.top(0), B.top(p.s), cm(p.s), 14);
      if (show.has('G')) {
        P.dot(B.mid(p.len / 2), 'dot', 2.4);
        P.arrow(B.mid(p.len / 2), [0, -1], 50, 'force k-g hl', svgSym('G', 'B'), [8, 0]);
        P.dim(B.top(p.s), B.top(p.len / 2), L('arm', 'Arm'), 14, 'dimline hl');
      }
      return P.svg();
    },
    hints: () => [
      L('The beam’s own weight acts at its middle. It turns the beam the other way than the load.', 'Die Gewichtskraft des Balkens greift in seiner Mitte an. Sie dreht den Balken in die andere Richtung als die Last.'),
      L('Lever arms are measured from the support: the load’s is the distance from the support to the left end, the beam’s is the distance from the support to the middle.', 'Hebelarme werden von der Stütze aus gemessen: Der der Last ist der Abstand von der Stütze zum linken Ende, der des Balkens der Abstand von der Stütze zur Mitte.'),
      L('Balance: m g s = m_B g (ℓ/2 − s).', 'Gleichgewicht: m g s = m_B g (ℓ/2 − s).'),
    ],
    steps(p, v) {
      const arm = p.len / 2 - p.s;
      return [
        step(L('The beam’s weight', 'Die Gewichtskraft des Balkens'),
          `<p>${L(`The beam’s weight acts at its middle, ${cm(p.len / 2)} from the left end, so ${cm(arm)} to the right of the support. It turns the beam clockwise; the load at the left end turns it counterclockwise, with the lever arm ${cm(p.s)}.`, `Die Gewichtskraft des Balkens greift in seiner Mitte an, ${cm(p.len / 2)} vom linken Ende entfernt, also ${cm(arm)} rechts der Stütze. Sie dreht den Balken im Uhrzeigersinn; die Last am linken Ende dreht ihn im Gegenuhrzeigersinn, mit dem Hebelarm ${cm(p.s)}.`)}</p>`, ['G']),
        step(L('Balance of torques', 'Gleichgewicht der Drehmomente'), `$$m\\,g\\cdot s = m_\\mathrm{B}\\,g\\cdot\\left(\\tfrac{\\ell}{2} - s\\right)$$ ` +
          (p.find === 'm'
            ? `$$m = \\frac{m_\\mathrm{B}\\,(\\ell/2 - s)}{s} = \\frac{${tq(p.mb, 'kg')}\\cdot ${tq(arm, 'cm')}}{${tq(p.s, 'cm')}} = ${res(v.m, 'kg', 2)}$$`
            : `$$m_\\mathrm{B} = \\frac{m\\,s}{\\ell/2 - s} = \\frac{${tq(p.m, 'kg')}\\cdot ${tq(p.s, 'cm')}}{${tq(arm, 'cm')}} = ${res(v.mb, 'kg', 2)}$$`), ['G']),
      ];
    },
  };

  // Where must the load hang? A heavy beam (mass mb, length len) on a support at s from its left end
  // (left of the middle); a load m is to hang on the left of the support, at the distance x from it
  // (from: 'support') or e = s − x from the left end (from: 'end'). The support is given: one balance
  // of torques about it gives the load's lever arm. (Unlike hanging a beam, where the point of
  // suspension is wanted, and with it the holding force.)
  const beamArm = {
    id: 'beam-arm', family: 'lever', difficulty: 3, topicOnly: true,
    make(r) {
      const len = pick(r, [60, 80, 100, 120]), s = pick(r, [20, 25, 30, 40].filter((x) => x < len / 2 - 5));
      const mb = pick(r, [1, 1.5, 2, 3, 4, 5, 6]), m = pick(r, [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]), from = pick(r, ['support', 'end']);
      const x = (mb * (len / 2 - s)) / m;
      if (m === mb || x < 5 || x > s - 5 || (from === 'end' && x === s / 2)) return null;
      return { len, s, mb, m, from };
    },
    solve(p, o = {}) {
      const x = exact((p.mb * (o.end ? p.len / 2 : p.len / 2 - p.s)) / p.m);
      return { x: p.from === 'end' && !o.fromSupport ? exact(p.s - x) : x };
    },
    traps: ['end', 'fromSupport'],
    why: {
      end: () => L('The lever arm of the beam’s weight is measured from the support to the middle of the beam, not from the end.', 'Der Hebelarm der Gewichtskraft des Balkens wird von der Stütze bis zur Balkenmitte gemessen, nicht vom Ende.'),
      fromSupport: () => L('That is the load’s distance from the support, its lever arm. The question asks for its distance from the left end.', 'Das ist der Abstand der Last von der Stütze, ihr Hebelarm. Gefragt ist ihr Abstand vom linken Ende.'),
    },
    fields: (p) => [{ key: 'x', sym: p.from === 'end' ? ['x', 'L'] : ['x'], unit: 'cm', dec: 1,
      what: p.from === 'end' ? L('distance of the load from the left end', 'Abstand der Last vom linken Ende') : L('distance of the load from the support', 'Abstand der Last von der Stütze') }],
    title: () => L('Where must the load hang?', 'Wo muss die Last hängen?'),
    text: (p) => L(`A uniform beam ${cm(p.len)} long with a mass of ${kg(p.mb)} rests on a support ${cm(p.s)} from its left end. A load of ${kg(p.m)} is to hang to the left of the support so that the beam is balanced. ${p.from === 'end' ? 'How far from the left end of the beam must it hang?' : 'How far from the support must it hang?'}`,
      `Ein gleichmässiger Balken von ${cm(p.len)} Länge und ${kg(p.mb)} Masse liegt ${cm(p.s)} von seinem linken Ende entfernt auf einer Stütze. Links der Stütze soll eine Last von ${kg(p.m)} hängen, sodass der Balken im Gleichgewicht ist. ${p.from === 'end' ? 'Wie weit vom linken Ende des Balkens entfernt muss sie hängen?' : 'Wie weit von der Stütze entfernt muss sie hängen?'}`),
    figure(p, v, view = {}) {
      const B = beamPic(p.len, L('A heavy beam on a support near its left end, with a load to be hung on the left of the support', 'Ein schwerer Balken auf einer Stütze nahe seinem linken Ende, mit einer Last, die links der Stütze hängen soll')), P = B.P;
      const show = view.show || new Set(), x = (p.mb * (p.len / 2 - p.s)) / p.m, pos = view.task ? p.s * 0.45 : p.s - x;
      const sym = p.from === 'end' ? svgSym('x', 'L') : svgSym('x');
      P.support(B.bottom(p.s));
      P.mass(B.bottom(pos), 40, kg(p.m), view.task ? 'load ghost' : 'load');
      P.text(B.bottom(p.len * 0.78), `${svgSym('m', 'B')} = ${kg(p.mb)}`, 'lbl mass', 'middle', [0, 16]);
      // above the beam: the wanted distance (nearest), the support's distance from the end, the length
      const lbl = view.task ? `${sym} = ?` : cm(p.from === 'end' ? pos : x);
      if (p.from === 'end') P.dim(B.top(0), B.top(pos), lbl, 14, 'dimline hl');
      else P.dim(B.top(pos), B.top(p.s), lbl, 14, 'dimline hl');
      P.dim(B.top(0), B.top(p.s), cm(p.s), 38);
      P.dim(B.top(0), B.top(p.len), cm(p.len), 62);
      if (show.has('G')) {
        P.dot(B.mid(p.len / 2), 'dot', 2.4);
        P.arrow(B.mid(p.len / 2), [0, -1], 50, 'force k-g hl', svgSym('G', 'B'), [8, 0]);
        P.dim(B.top(p.s), B.top(p.len / 2), L('arm', 'Arm'), 14, 'dimline');
      }
      if (show.has('x') && p.from === 'end') P.dim(B.top(pos), B.top(p.s), cm(x), 14, 'dimline');
      return P.svg();
    },
    hints: (p) => [
      L('The beam’s own weight acts at its middle, to the right of the support: it turns the beam clockwise. The load on the left turns it counterclockwise.', 'Die Gewichtskraft des Balkens greift in seiner Mitte an, rechts der Stütze: Sie dreht den Balken im Uhrzeigersinn. Die Last links dreht ihn im Gegenuhrzeigersinn.'),
      L('Lever arms are measured from the support: the beam’s is ℓ/2 − s, the load’s is the unknown distance x from the support.', 'Hebelarme werden von der Stütze aus gemessen: Der des Balkens ist ℓ/2 − s, der der Last der unbekannte Abstand x von der Stütze.'),
      L(`Balance: m g x = m_B g (ℓ/2 − s), so x = m_B (ℓ/2 − s) / m.${p.from === 'end' ? ' Then the distance from the left end is s − x.' : ''}`, `Gleichgewicht: m g x = m_B g (ℓ/2 − s), also x = m_B (ℓ/2 − s) / m.${p.from === 'end' ? ' Der Abstand vom linken Ende ist dann s − x.' : ''}`),
    ],
    steps(p, v) {
      const arm = p.len / 2 - p.s, x = exact((p.mb * arm) / p.m), end = p.from === 'end';
      return [
        step(L('The beam’s weight', 'Die Gewichtskraft des Balkens'),
          `<p>${L(`The beam’s weight acts at its middle, ${cm(p.len / 2)} from the left end, so ${cm(arm)} to the right of the support: it turns the beam clockwise. The load on the left turns it counterclockwise, with its distance x from the support as the lever arm.`, `Die Gewichtskraft des Balkens greift in seiner Mitte an, ${cm(p.len / 2)} vom linken Ende entfernt, also ${cm(arm)} rechts der Stütze: Sie dreht den Balken im Uhrzeigersinn. Die Last links dreht ihn im Gegenuhrzeigersinn, mit ihrem Abstand x von der Stütze als Hebelarm.`)}</p>`, ['G']),
        step(L('Balance of torques', 'Gleichgewicht der Drehmomente'), `$$m\\,g\\cdot x = m_\\mathrm{B}\\,g\\cdot\\left(\\tfrac{\\ell}{2} - s\\right)$$ ` +
          `$$x = \\frac{m_\\mathrm{B}\\,(\\ell/2 - s)}{m} = \\frac{${tq(p.mb, 'kg')}\\cdot ${tq(arm, 'cm')}}{${tq(p.m, 'kg')}} = ${end ? tq(x, 'cm', 1) : res(x, 'cm', 1)}$$` +
          `<p>${L(`The ${p.m > p.mb ? 'heavier' : 'lighter'} load needs ${p.m > p.mb ? 'a shorter' : 'a longer'} lever arm than the beam’s weight.`, `Die ${p.m > p.mb ? 'schwerere' : 'leichtere'} Last braucht einen ${p.m > p.mb ? 'kürzeren' : 'längeren'} Hebelarm als die Gewichtskraft des Balkens.`)}</p>`, ['G', 'x']),
        ...(end ? [step(L('From the left end', 'Vom linken Ende'), `<p>${L('The load hangs x to the left of the support, the support is s from the left end:', 'Die Last hängt x links der Stütze, die Stütze ist s vom linken Ende entfernt:')}</p>` +
          `$$${T('x', 'L')} = s - x = ${tq(p.s, 'cm')} - ${tq(x, 'cm', 1)} = ${res(v.x, 'cm', 1)}$$`, ['G', 'x'], ['x'])] : []),
      ];
    },
  };

  // Practice of the beam held at an angle: which of four segments drawn in is the lever arm of F?
  // The right one (from D perpendicular to the line of action, b sin α) and three wrong ideas: the
  // distance b from D to where F acts, a segment along the line of action (b cos α), and the
  // perpendicular from the beam's middle instead of from D. In world units (cm) of the drawing;
  // numbered 1 to 4 in an order that depends on the exercise.
  const ORDERS = perms(4);
  function angleCands(p) {
    const s = BEAM_PX / p.len, h = 10 / s, D = p.len / 2 + p.a, at = (x) => [x, h / 2];
    const Dp = at(D), A = at(D - p.b), S = at(p.len / 2), dir = [Math.cos(rad(180 - p.alpha)), Math.sin(rad(180 - p.alpha))];
    const foot = (Q) => { const t = (Q[0] - A[0]) * dir[0] + (Q[1] - A[1]) * dir[1]; return [A[0] + t * dir[0], A[1] + t * dir[1]]; };
    const F = foot(Dp), t = (F[0] - A[0]) * dir[0] + (F[1] - A[1]) * dir[1];
    // along the line of action: from A to the foot; where that would run along the arrow (the force
    // pulls toward D), the same length from D, parallel to the force, on the other side of the beam
    const along = t > 0 ? [Dp, [Dp[0] - t * dir[0], Dp[1] - t * dir[1]]] : [A, F];
    const list = [
      { kind: 'arm', ends: [Dp, F], right: true },
      { kind: 'dist', ends: [Dp, A], flag: 'noAngle', why: L('That is the distance b from D to where F acts. The lever arm is the distance from D to the line of action, measured at a right angle to it.', 'Das ist der Abstand b von D zum Angriffspunkt von F. Der Hebelarm ist der Abstand von D zur Wirkungslinie, rechtwinklig zu ihr gemessen.') },
      { kind: 'along', ends: along, flag: 'cos', why: L('That segment runs along the line of action (or parallel to it), so it is b cos α. The lever arm meets the line of action at a right angle.', 'Diese Strecke verläuft entlang der Wirkungslinie (oder parallel zu ihr), sie ist also b cos α. Der Hebelarm trifft die Wirkungslinie rechtwinklig.') },
      { kind: 'centre', ends: [S, foot(S)], flag: 'end', why: L('That segment is perpendicular to the line of action, but it starts at the beam’s middle, not at the axis D. Lever arms are measured from the axis.', 'Diese Strecke steht senkrecht auf der Wirkungslinie, aber sie beginnt in der Mitte des Balkens, nicht in der Drehachse D. Hebelarme werden von der Drehachse aus gemessen.') },
    ];
    const order = ORDERS[(Math.round(p.alpha * 10) + 7 * p.b + 3 * p.a + p.len) % ORDERS.length];
    return order.map((k, i) => ({ ...list[k], n: i + 1 }));
  }
  const segName = (n) => L(`segment ${n}`, `Strecke ${n}`);
  function angleItem(p) {
    const cands = angleCands(p), right = cands.find((c) => c.right), d = p.b * Math.sin(rad(p.alpha));
    return {
      key: 'd', fig: 'arm', baseVal: p.b, fn: 'sin',
      what: L('Which of the segments drawn in dashed is the lever arm $d$ of F about D? Their lengths are given.', 'Welche der gestrichelt eingezeichneten Strecken ist der Hebelarm $d$ von F bezüglich D? Ihre Längen sind angegeben.'),
      // each with its length, so that no trigonometry is needed
      options: cands.map((c) => ({ html: `${segName(c.n)}: ${cm(Math.round(Math.hypot(c.ends[1][0] - c.ends[0][0], c.ends[1][1] - c.ends[0][1]) * 10) / 10)}`, right: !!c.right, flag: c.flag, why: c.why })),
      value: L(`Right: ${segName(right.n)} runs from D to the line of action and meets it at a right angle. So the lever arm is `, `Richtig: ${segName(right.n)} führt von D zur Wirkungslinie und trifft sie rechtwinklig. Der Hebelarm ist also `) +
        `$d = ${tq(d, 'cm')}$`,
    };
  }
  // The candidates: dashed segments, each with its number in a small disc along it, placed away
  // from the numbers before it and from D, the point of application and the middle of the beam.
  function drawCands(P, p) {
    const s = P.s, h = 10 / s, D = p.len / 2 + p.a, placed = [];
    // the arrow of F (70 px) and its label at the tip
    const dir = [Math.cos(rad(180 - p.alpha)), Math.sin(rad(180 - p.alpha))], tip = [D - p.b + (dir[0] * 80) / s, h / 2 + (dir[1] * 80) / s];
    const fixed = [...[D, D - p.b, p.len / 2].map((x) => [[x, h / 2], 14]), [tip, 30]];
    angleCands(p).forEach((c) => {
      const [a, b] = c.ends, at = (t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const room = (q) => Math.min(...[...fixed, ...placed.map((o) => [o, 24])].map(([o, r]) => Math.hypot(q[0] - o[0], q[1] - o[1]) * s - r));
      const spots = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78].map(at);
      const spot = spots.find((q) => room(q) >= 0) || spots.reduce((x, y) => (room(y) > room(x) ? y : x));
      placed.push(spot);
      P.line(a, b, 'cand', true);
      P.circle(spot, 9 / s, 'cand-disc', true);
      P.text(spot, String(c.n), 'lbl cand-n', 'middle', [0, 0]);
    });
  }

  // The worksheet's beam b: a uniform beam (mass m) on an axis D, held level by a force F that
  // pulls at the angle α to the beam, at the distance b from D; the beam's middle is a from D.
  const angled = {
    id: 'angle', family: 'lever', difficulty: 4, calc: 'trig',
    make(r, o = {}) {
      const m = pick(r, [1, 2, 3, 4, 5]), len = pick(r, [40, 60, 80, 100, 120]);
      const a = pick(r, [5, 10, 15, 20, 25, 30].filter((x) => x <= len / 2 - 5)), b = pick(r, (o.pyth ? [10, 13, 15, 17, 20, 25, 26, 29, 30, 34, 39, 40, 50, 51, 52] : [10, 20, 30, 40, 50, 60]).filter((x) => x <= len / 2 + a && x > a));
      if (!a || !b) return null;
      const alpha = o.nice ? pick(r, [30, 90, 150]) : o.pyth ? pick(r, [...PYTH, ...PYTH.map((x) => 180 - x)]) : pick(r, [30, 40, 45, 50, 60, 70, 110, 120, 135, 150]);
      // practice: the student picks the lever arm among segments drawn in (cands); they need room
      if (o.pyth) {
        const px = BEAM_PX / len, sn = Math.sin(rad(alpha)), cs = Math.abs(Math.cos(rad(alpha)));
        const p = { m, len, a, b, alpha, cands: true }, lens = angleCands(p).map((c) => Math.round(Math.hypot(c.ends[1][0] - c.ends[0][0], c.ends[1][1] - c.ends[0][1]) * 10));
        return b * px >= 150 && b * sn * px >= 40 && (b - a) * sn * px >= 26 && b * cs * px >= 26 && new Set(lens).size === 4 ? p : null; // four different lengths
      }
      return { m, len, a, b, alpha };
    },
    solve(p, o = {}) {
      const s = o.cos ? Math.abs(Math.cos(rad(p.alpha))) : o.noAngle ? 1 : Math.sin(rad(p.alpha));
      return { F: exact((p.m * G * p.a) / (p.b * s)) };
    },
    traps: ['cos', 'noAngle'],
    why: {
      cos: () => L('Cosine instead of sine? Only the component of F perpendicular to the beam turns it.', 'Kosinus statt Sinus? Nur die Komponente von F senkrecht zum Balken dreht ihn.'),
      noAngle: () => L('F pulls at an angle: its lever arm is b · sin α, not b.', 'F zieht schräg: Ihr Hebelarm ist b · sin α, nicht b.'),
    },
    nudge: {
      cos: () => L('Only the component of F perpendicular to the beam turns it. Where is α, and which function of α gives that component?', 'Nur die Komponente von F senkrecht zum Balken dreht ihn. Wo liegt α, und welche Winkelfunktion gibt diese Komponente?'),
      noAngle: () => L('F pulls at an angle: is its lever arm really b? Measure it at a right angle to the line of action.', 'F zieht schräg: Ist ihr Hebelarm wirklich b? Miss ihn rechtwinklig zur Wirkungslinie.'),
    },
    fields: () => [{ key: 'F', sym: ['F'], unit: 'N', dec: 1, what: L('force', 'Kraft') }],
    // the lever arm, chosen among four segments drawn in (see angleCands); its value is then given
    comps: (p) => [angleItem(p)],
    title: () => L('Held at an angle', 'Schräg gehalten'),
    text: (p) => L(`A uniform beam with a mass of ${kg(p.m)} can turn about an axis through D. Its middle is ${cm(p.a)} to the left of D. A rope pulls on the beam ${cm(p.b)} to the left of D, at an angle of ${q(p.alpha, 'deg', 1)} to the beam, and holds it level. How large is the force F of the rope? Take g = 10 m/s².`,
      `Ein gleichmässiger Balken mit der Masse ${kg(p.m)} ist um eine Achse durch D drehbar. Seine Mitte liegt ${cm(p.a)} links von D. Ein Seil zieht ${cm(p.b)} links von D unter einem Winkel von ${q(p.alpha, 'deg', 1)} zum Balken am Balken und hält ihn waagrecht. Wie gross ist die Kraft F des Seils? Rechne mit g = 10 m/s².`),
    figure(p, v, view = {}) {
      const D = p.len / 2 + p.a; // the axis, from the left end
      const B = beamPic(p.len, L('A beam on an axis D, held by a force at an angle', 'Ein Balken auf einer Achse D, schräg gehalten von einer Kraft')), P = B.P;
      const show = view.show || new Set(), xF = D - p.b, c = p.len / 2;
      P.pivot(B.mid(D)); P.text(B.mid(D), 'D', 'lbl', 'start', [8, 12]);
      P.dot(B.mid(c), 'dot', 2.4);
      // while the student picks the lever arm among the segments drawn in, no dimensions (the text
      // gives them) and the mass at the left end, out of their way
      const cands = p.cands && view.task && !show.has('arm');
      if (cands) P.text(B.bottom(0), `m = ${kg(p.m)}`, 'lbl mass', 'start', [0, 16]);
      else if (!show.has('G')) P.text(B.bottom(c), `m = ${kg(p.m)}`, 'lbl mass', 'middle', [0, 16]);
      // the force: from the point of application, at α to the beam, measured from the beam's
      // direction toward D (to the right) — the rope pulls up
      const dir = [Math.cos(rad(180 - p.alpha)), Math.sin(rad(180 - p.alpha))];
      P.arrow(B.mid(xF), dir, 70, `force k-s${show.has('perp') ? ' dim' : ''}`, view.task ? `${svgSym('F')} = ?` : svgSym('F'), [dir[0] * 10 - 4, -dir[1] * 10 - 4]);
      P.arc(B.mid(xF), 24, 180 - p.alpha, 180, q(p.alpha, 'deg', 1), 12);
      if (!cands) {
        P.dim(B.top(xF), B.top(D), cm(p.b), 40);
        P.dim(B.top(c), B.top(D), cm(p.a), 16);
      }
      if (show.has('G')) P.arrow(B.mid(c), [0, -1], 50, 'force k-g hl', svgSym('G'), [8, 0]);
      // the lever arm of F: from D perpendicular to the line of action (once identified)
      if (show.has('arm')) {
        const A = B.mid(xF), Dp = B.mid(D), t = (Dp[0] - A[0]) * dir[0] + (Dp[1] - A[1]) * dir[1], foot = [A[0] + t * dir[0], A[1] + t * dir[1]];
        const back = Math.min(0, t) - 20 / P.s, ahead = Math.max(0, t) + 20 / P.s;
        P.line([A[0] + back * dir[0], A[1] + back * dir[1]], [A[0] + ahead * dir[0], A[1] + ahead * dir[1]], 'action', true);
        P.line(Dp, foot, 'arm hl', true);
        P.dot(foot, 'dot small', 2);
        P.text([(Dp[0] + foot[0]) / 2, (Dp[1] + foot[1]) / 2], '<tspan font-style="italic">d</tspan>', 'lbl arm-lbl', 'start', [8, 4]);
      }
      if (cands) drawCands(P, p);
      if (show.has('perp')) {
        const s = Math.sin(rad(p.alpha));
        P.arrow(B.mid(xF), [0, 1], 70 * s, 'force k-s hl', `${svgSym('F')}<tspan class="sub" dy="4">⊥</tspan><tspan dy="-4">​</tspan>`, [-10, 0]);
      }
      return P.svg();
    },
    hints: (p) => [
      L('Two torques about D: the beam’s weight (at its middle) and the rope force. In balance they are equal.', 'Zwei Drehmomente bezüglich D: das der Gewichtskraft des Balkens (in seiner Mitte) und das der Seilkraft. Im Gleichgewicht sind sie gleich gross.'),
      L('Only the part of F perpendicular to the beam turns it: F⊥ = F · sin α. Equivalently, the lever arm of F is b · sin α.', 'Nur der Anteil von F senkrecht zum Balken dreht ihn: F⊥ = F · sin α. Gleichwertig: Der Hebelarm von F ist b · sin α.'),
      L(`Balance: m g · a = F · sin α · b, so F = m g a / (b sin α).${p.alpha === 90 ? '' : ''}`, 'Gleichgewicht: m g · a = F · sin α · b, also F = m g a / (b sin α).'),
    ],
    steps(p, v) {
      const d = p.b * Math.sin(rad(p.alpha));
      return [
        step(L('Torque of the weight', 'Drehmoment der Gewichtskraft'),
          `<p>${L(`The weight acts at the middle, ${cm(p.a)} from D, and turns the beam counterclockwise:`, `Die Gewichtskraft greift in der Mitte an, ${cm(p.a)} von D entfernt, und dreht den Balken im Gegenuhrzeigersinn:`)}</p>$$M_\\mathrm{G} = m\\,g\\,a = ${tq(p.m, 'kg')}\\cdot ${tq(G, 'N')}/\\mathrm{kg}\\cdot ${tq(p.a / 100, 'm')} = ${tq(p.m * G * p.a / 100, 'Nm')}$$`, ['G']),
        p.cands ? step(L('Torque of the rope', 'Drehmoment der Seilkraft'),
          `<p>${L(`The lever arm of F is the segment from D perpendicular to the line of action, $d = ${tq(d, 'cm')}$. It turns the beam clockwise:`, `Der Hebelarm von F ist die Strecke von D senkrecht zur Wirkungslinie, $d = ${tq(d, 'cm')}$. Sie dreht den Balken im Uhrzeigersinn:`)}</p>$$M_F = F\\cdot d$$`, ['G', 'arm'])
        : step(L('Torque of the rope', 'Drehmoment der Seilkraft'),
          `<p>${L('Only the component of F perpendicular to the beam turns it (the other pulls along the beam, through D):', 'Nur die Komponente von F senkrecht zum Balken dreht ihn (die andere zieht entlang des Balkens, durch D):')}</p>$$F_\\perp = F\\sin\\alpha,\\qquad M_F = F\\sin\\alpha\\cdot b$$<p>${L('It turns the beam clockwise.', 'Sie dreht den Balken im Uhrzeigersinn.')}</p>`, ['G', 'perp'], ['perp']),
        p.cands ? step(L('Balance', 'Gleichgewicht'),
          `$$F\\cdot d = m\\,g\\,a\\;\\Rightarrow\\; F = \\frac{m\\,g\\,a}{d} = \\frac{${tq(p.m * G, 'N')}\\cdot ${tq(p.a, 'cm')}}{${tq(d, 'cm')}} = ${res(v.F, 'N', 1)}$$`, ['G', 'arm'], [])
        : step(L('Balance', 'Gleichgewicht'),
          `$$F\\sin\\alpha\\cdot b = m\\,g\\,a\\;\\Rightarrow\\; F = \\frac{m\\,g\\,a}{b\\,\\sin\\alpha} = \\frac{${tq(p.m * G, 'N')}\\cdot ${tq(p.a, 'cm')}}{${tq(p.b, 'cm')}\\cdot\\sin${tq(p.alpha, 'deg', 1)}} = ${res(v.F, 'N', 1)}$$`, ['G', 'perp'], []),
      ];
    },
  };

  // ================================================================ hanging a beam
  // A uniform beam (mass m, length len) with a load F at its right end (and F1 at its left end):
  // where must it hang (x from the left end), and with which force F_H must it be held?
  function hangMake(r, two) {
    const len = pick(r, [20, 24, 30, 40, 50, 60, 80, 100]), m = pick(r, [0.5, 1, 1.5, 2, 3, 4, 5]);
    const F2 = pick(r, [5, 10, 15, 20, 25, 30, 40]), F1 = two ? pick(r, [5, 10, 15, 20, 30]) : 0;
    if (two && F1 === F2) return null;
    return two ? { len, m, F1, F2 } : { len, m, F2 };
  }
  const hangSolve = (p, o = {}) => {
    const W = o.noBeam ? 0 : p.m * G, F1 = p.F1 || 0;
    return { x: exact((W * p.len / 2 + p.F2 * p.len) / (W + F1 + p.F2)), H: exact(o.onlyLoads ? F1 + p.F2 : W + F1 + p.F2) };
  };
  function hangFigure(p, v, view = {}) {
    const B = beamPic(p.len, L('A beam with loads at its ends, to be hung up', 'Ein Balken mit Lasten an den Enden, der aufgehängt werden soll')), P = B.P;
    const show = view.show || new Set();
    if (!show.has('G')) P.text(B.bottom(p.len / 2), `m = ${kg(p.m)}`, 'lbl mass', 'middle', [0, 16]);
    P.dim(B.bottom(0), B.bottom(p.len), cm(p.len), -62);
    P.arrow(B.bottom(p.len), [0, -1], 46, 'force k-s', N(p.F2), [8, 2]);
    if (p.F1) P.arrow(B.bottom(0), [0, -1], 46, 'force k-s', N(p.F1), [-8, 2]);
    if (show.has('G')) { P.dot(B.mid(p.len / 2), 'dot', 2.4); P.arrow(B.mid(p.len / 2), [0, -1], 46, 'force k-g hl', svgSym('G'), [8, 6]); }
    if (!view.task) {
      P.line(B.top(v.x), [v.x, B.h + 44 / P.s], 'w rope', true);
      P.dot(B.top(v.x), 'dot', 2.4);
      if (show.has('H')) P.arrow(B.top(v.x), [0, 1], 46, 'force k-h hl', svgSym('H'), [8, 4]);
      P.dim(B.top(0), B.top(v.x), `${svgSym('x')} = ${cm(v.x)}`, 18, 'dimline hl');
    } else P.text(B.top(p.len * 0.4), `${svgSym('x')} = ?`, 'lbl', 'middle', [0, -22]);
    return P.svg();
  }
  function hang(id, difficulty, two) {
    return {
      id, family: 'hang', difficulty,
      make: (r) => hangMake(r, two),
      solve: hangSolve,
      traps: ['noBeam', 'onlyLoads'],
      why: {
        noBeam: () => L('The beam’s own weight is missing: it acts at the beam’s middle.', 'Die Gewichtskraft des Balkens fehlt: Sie greift in der Balkenmitte an.'),
        onlyLoads: () => L('The holding force carries everything: the loads and the beam itself.', 'Die Haltekraft trägt alles: die Lasten und den Balken selbst.'),
      },
      fields: () => [{ key: 'x', sym: ['x'], unit: 'cm', dec: 1, what: L('distance from the left end', 'Abstand vom linken Ende') }, { key: 'H', sym: ['H'], unit: 'N', dec: 1, what: L('holding force', 'Haltekraft') }],
      title: () => (two ? L('Loads at both ends', 'Lasten an beiden Enden') : L('Where to hang the beam?', 'Wo aufhängen?')),
      text: (p) => (two
        ? L(`A uniform beam ${cm(p.len)} long with a mass of ${kg(p.m)} carries a load of ${N(p.F1)} at its left end and one of ${N(p.F2)} at its right end. At which distance from the left end must it be hung up so that it stays level? How large is the force with which it must be held? Take g = 10 m/s².`,
          `Ein gleichmässiger Balken von ${cm(p.len)} Länge und ${kg(p.m)} Masse trägt an seinem linken Ende eine Last von ${N(p.F1)} und an seinem rechten eine von ${N(p.F2)}. In welchem Abstand vom linken Ende muss er aufgehängt werden, damit er waagrecht bleibt? Wie gross ist die Kraft, mit der er gehalten werden muss? Rechne mit g = 10 m/s².`)
        : L(`A uniform beam ${cm(p.len)} long with a mass of ${kg(p.m)} carries a load of ${N(p.F2)} at its right end. At which distance from the left end must it be hung up so that it stays level? How large is the force with which it must be held? Take g = 10 m/s².`,
          `Ein gleichmässiger Balken von ${cm(p.len)} Länge und ${kg(p.m)} Masse trägt an seinem rechten Ende eine Last von ${N(p.F2)}. In welchem Abstand vom linken Ende muss er aufgehängt werden, damit er waagrecht bleibt? Wie gross ist die Kraft, mit der er gehalten werden muss? Rechne mit g = 10 m/s².`)),
      figure: hangFigure,
      hints: () => [
        L('Two conditions: the forces balance (the holding force carries everything), and the torques balance about the suspension point.', 'Zwei Bedingungen: Die Kräfte heben sich auf (die Haltekraft trägt alles), und die Drehmomente bezüglich des Aufhängepunkts heben sich auf.'),
        L('The beam’s weight m g acts at its middle. Choose the left end as the axis: the holding force F_H at x balances the torques of the weight and the loads.', 'Die Gewichtskraft m g des Balkens greift in seiner Mitte an. Wähle das linke Ende als Drehachse: Die Haltekraft F_H bei x hält den Drehmomenten der Gewichtskraft und der Lasten das Gleichgewicht.'),
        L('About the left end: F_H · x = m g · ℓ/2 + F · ℓ. Solve for x.', 'Bezüglich des linken Endes: F_H · x = m g · ℓ/2 + F · ℓ. Nach x auflösen.'),
      ],
      steps(p, v) {
        const W = p.m * G;
        const sumF = two ? `${tq(W, 'N')} + ${tq(p.F1, 'N')} + ${tq(p.F2, 'N')}` : `${tq(W, 'N')} + ${tq(p.F2, 'N')}`;
        return [
          step(L('Holding force', 'Haltekraft'),
            `<p>${L('The beam stays at rest, so the holding force carries the beam’s weight and the loads:', 'Der Balken bleibt in Ruhe, also trägt die Haltekraft die Gewichtskraft des Balkens und die Lasten:')}</p>` +
            `$$${T('H')} = m\\,g + ${two ? 'F_1 + F_2' : 'F'} = ${sumF} = ${res(v.H, 'N', 1)}$$`, ['G', 'H'], ['H']),
          step(L('Torques about the left end', 'Drehmomente bezüglich des linken Endes'),
            `<p>${L('Any point can serve as the axis when nothing turns. About the left end, the left load has no lever arm; the holding force turns the beam one way, the weight (at the middle) and the right load the other way:', 'Dreht sich nichts, kann jeder Punkt als Drehachse dienen. Bezüglich des linken Endes hat die linke Last keinen Hebelarm; die Haltekraft dreht den Balken in die eine Richtung, die Gewichtskraft (in der Mitte) und die rechte Last in die andere:')}</p>` +
            `$$${T('H')}\\cdot x = m\\,g\\cdot\\frac{\\ell}{2} + ${two ? 'F_2' : 'F'}\\cdot \\ell$$`, ['G', 'H'], ['G']),
          step(L('Position', 'Position'),
            `$$x = \\frac{m\\,g\\,\\ell/2 + ${two ? 'F_2' : 'F'}\\,\\ell}{${T('H')}} = \\frac{${tq(W, 'N')}\\cdot ${tq(p.len / 2, 'cm')} + ${tq(p.F2, 'N')}\\cdot ${tq(p.len, 'cm')}}{${tq(v.H, 'N')}} = ${res(v.x, 'cm', 1)}$$` +
            `<p>${L('The beam hangs closer to the heavier end.', 'Der Balken hängt näher am schwereren Ende.')}</p>`, ['G', 'H'], ['H']),
        ];
      },
    };
  }

  const SCENARIOS = [
    plate('plate-axis', 2, 3, false),
    plate('plate', 4, 4, true),
    seesaw,
    lever3,
    beamWeight,
    angled,
    hang('hang', 3, false),
    hang('hang2', 4, true),
    rank('rank-axis', 2, 3, false),
    rank('rank', 4, 4, true),
    armError,
    beamArm,
  ];

  // helpers for the situations of statics.js, which adds its own to SCENARIOS
  const H = { step, res, exact, beamPic, kg, cm, N, senseWord };
  root.Scenarios = { SCENARIOS, armOf, torqueOf, angleCands, UNIT, GRID, RULER, H };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
