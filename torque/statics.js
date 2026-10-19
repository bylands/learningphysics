// More situations, beyond the worksheets (same form as in scenarios.js, which they join): a plank
// on two supports, and forearm and biceps, where both the forces and the torques balance.
(function (root) {
  'use strict';

  const { SCENARIOS, H } = root.Scenarios;
  const { L, G, tex: T, tq, q, num, svgSym, pick } = root.TQ;
  const { step, res, exact, beamPic, kg, cm } = H;
  const m$ = (s) => `$${s}$`;
  const m_ = (x) => q(x, 'm', 2);
  // a field: key, symbol, unit, decimals, what
  const field = (key, sym, unit, dec, what) => ({ key, sym, unit, dec, what });
  // a box standing on the beam at x (world units), w × h px, with a label
  function block(P, x, y, w, h, label) {
    P.rect([x - w / 2 / P.s, y], [x + w / 2 / P.s, y + h / P.s], 'load', 2);
    if (label) P.text([x, y + h / P.s], label, 'lbl mass', 'middle', [0, -12]);
  }

  // ================================================================ plank on two supports
  // A uniform plank (length len, mass m) on supports A (its left end) and B (b from A); a load M
  // stands at x from A. The supports push up with F_A and F_B. Lengths in m.
  const plank = {
    id: 'plank', family: 'supports', difficulty: 3,
    make(r) {
      const len = pick(r, [2, 3, 4, 5, 6]), b = len - pick(r, [0, 0, 0.5, 1]), x = pick(r, [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].filter((v) => v < len));
      const m = pick(r, [10, 15, 20, 25, 30, 40]), M = pick(r, [20, 30, 40, 50, 60, 70, 80]);
      const v = plank.solve({ len, b, x, m, M });
      if (v.A < 20 || v.B < 20 || Math.abs(x - b) < 0.2 || x === len / 2) return null;
      return { len, b, x, m, M };
    },
    solve(p, o = {}) {
      const W = o.noBeam ? 0 : p.m * G, B = (W * p.len / 2 + p.M * G * p.x) / p.b, A = W + p.M * G - B;
      return o.swap ? { A: exact(B), B: exact(A) } : { A: exact(A), B: exact(B) };
    },
    traps: ['noBeam', 'swap'],
    why: {
      noBeam: () => L('The plank’s own weight is missing: it acts at the plank’s middle.', 'Die Gewichtskraft des Bretts fehlt: Sie greift in der Mitte des Bretts an.'),
      swap: () => L('Swapped: the support nearer to a load carries more of it.', 'Vertauscht: Die Stütze, die näher bei einer Last ist, trägt mehr davon.'),
    },
    // in practice, where the reason would give the answer away
    nudge: {
      swap: () => L('Which support is nearer to the loads? Check the torques about the other support again.', 'Welche Stütze ist näher bei den Lasten? Prüfe die Drehmomente um die andere Stütze nochmals.'),
    },
    fields: () => [field('A', ['A'], 'N', 1, L('force of support A', 'Kraft der Stütze A')), field('B', ['B'], 'N', 1, L('force of support B', 'Kraft der Stütze B'))],
    title: () => L('A plank on two supports', 'Ein Brett auf zwei Stützen'),
    text: (p) => L(`A uniform plank ${m_(p.len)} long with a mass of ${kg(p.m)} rests on two supports: A at its left end and B ${m_(p.b)} from A${p.b === p.len ? ', at its right end' : ''}. A person of ${kg(p.M)} stands ${m_(p.x)} from A. With which forces do the supports push on the plank? Take g = 10 m/s².`,
      `Ein gleichmässiges Brett von ${m_(p.len)} Länge und ${kg(p.m)} Masse liegt auf zwei Stützen: A an seinem linken Ende und B ${m_(p.b)} von A entfernt${p.b === p.len ? ', an seinem rechten Ende' : ''}. Eine Person von ${kg(p.M)} steht ${m_(p.x)} von A entfernt. Mit welchen Kräften drücken die Stützen auf das Brett? Rechne mit g = 10 m/s².`),
    figure(p, v, view = {}) {
      const B = beamPic(p.len, L('A plank on two supports with a person on it', 'Ein Brett auf zwei Stützen mit einer Person darauf')), P = B.P, show = view.show || new Set();
      P.support(B.bottom(0)); P.support(B.bottom(p.b));
      P.text(B.bottom(0), 'A', 'lbl', 'end', [-14, 14]); P.text(B.bottom(p.b), 'B', 'lbl', 'start', [14, 14]);
      block(P, p.x, B.h, 26, 34, kg(p.M));
      if (!show.has('G')) P.text(B.bottom(p.len / 2), `m = ${kg(p.m)}`, 'lbl mass', 'middle', [0, 16]);
      P.dim(B.top(0), B.top(p.x), m_(p.x), 56);
      P.dim(B.bottom(0), B.bottom(p.b), m_(p.b), -50);
      if (p.b !== p.len) P.dim(B.bottom(0), B.bottom(p.len), m_(p.len), -72);
      if (show.has('G')) {
        P.arrow(B.mid(p.len / 2), [0, -1], 30, 'force k-g', svgSym('G'), [8, 4]);
        P.arrow([p.x, B.h], [0, -1], 30, 'force k-g', `${svgSym('G', '')}<tspan dy="0">′</tspan>`, [8, 8]);
      }
      if (show.has('AB')) {
        P.arrow(B.top(0), [0, 1], 46, `force k-h${view.hl && view.hl.has('A') ? ' hl' : ''}`, svgSym('A'), [8, 2]);
        P.arrow(B.top(p.b), [0, 1], 46, `force k-h${view.hl && view.hl.has('B') ? ' hl' : ''}`, svgSym('B'), [8, 2]);
      }
      return P.svg();
    },
    hints: (p) => [
      L(`Down: the plank’s weight at its middle, ${m_(p.len / 2)} from A, and the person’s weight, ${m_(p.x)} from A. Up: support A at the left end and support B ${m_(p.b)} from A. The plank is at rest: which two balances hold?`,
        `Nach unten: die Gewichtskraft des Bretts in seiner Mitte, ${m_(p.len / 2)} von A, und die der Person, ${m_(p.x)} von A. Nach oben: die Stütze A am linken Ende und die Stütze B ${m_(p.b)} von A. Das Brett ruht: Welche zwei Gleichgewichte gelten?`),
      L(`Take A as the axis: ${m$(`${T('A')}`)} has no lever arm there, so the torques give ${m$(`${T('B')}`)} alone, ${m$(`${T('B')}\\cdot b = m\\,g\\cdot\\tfrac{\\ell}{2} + M\\,g\\cdot x`)}. Then the forces: ${m$(`${T('A')} + ${T('B')} = m\\,g + M\\,g`)}.`,
        `Nimm A als Drehachse: ${m$(`${T('A')}`)} hat dort keinen Hebelarm, also liefern die Drehmomente ${m$(`${T('B')}`)} allein, ${m$(`${T('B')}\\cdot b = m\\,g\\cdot\\tfrac{\\ell}{2} + M\\,g\\cdot x`)}. Dann die Kräfte: ${m$(`${T('A')} + ${T('B')} = m\\,g + M\\,g`)}.`),
      L(`The weights first: the plank’s is ${m$(tq(p.m * G, 'N'))}, the person’s ${m$(tq(p.M * G, 'N'))}; together the supports carry ${m$(tq((p.m + p.M) * G, 'N'))}.`,
        `Zuerst die Gewichtskräfte: Die des Bretts ist ${m$(tq(p.m * G, 'N'))}, die der Person ${m$(tq(p.M * G, 'N'))}; zusammen tragen die Stützen ${m$(tq((p.m + p.M) * G, 'N'))}.`),
    ],
    steps(p, v) {
      const W = p.m * G, Wp = p.M * G;
      return [
        step(L('Forces', 'Kräfte'), `<p>${L(`Down: the plank’s weight $m\\,g = ${tq(W, 'N')}$ at its middle and the person’s weight $M\\,g = ${tq(Wp, 'N')}$. Up: the supports, with ${'$' + T('A') + '$'} and ${'$' + T('B') + '$'}.`, `Nach unten: die Gewichtskraft des Bretts $m\\,g = ${tq(W, 'N')}$ in seiner Mitte und die der Person $M\\,g = ${tq(Wp, 'N')}$. Nach oben: die Stützen mit ${'$' + T('A') + '$'} und ${'$' + T('B') + '$'}.`)}</p>`, ['G', 'AB'], ['G']),
        step(L('Torques about A', 'Drehmomente bezüglich A'), `<p>${L('With A as the axis, F_A has no lever arm. F_B turns the plank counterclockwise, the weights clockwise:', 'Mit A als Drehachse hat F_A keinen Hebelarm. F_B dreht das Brett im Gegenuhrzeigersinn, die Gewichtskräfte im Uhrzeigersinn:')}</p>` +
          `$$${T('B')}\\cdot b = m\\,g\\cdot\\frac{\\ell}{2} + M\\,g\\cdot x\\;\\Rightarrow\\; ${T('B')} = \\frac{${tq(W, 'N')}\\cdot ${tq(p.len / 2, 'm')} + ${tq(Wp, 'N')}\\cdot ${tq(p.x, 'm')}}{${tq(p.b, 'm')}} = ${res(v.B, 'N', 1)}$$`, ['G', 'AB'], ['B']),
        step(L('Forces', 'Kräfte'), `<p>${L('Up equals down:', 'Nach oben gleich nach unten:')}</p>$$${T('A')} = m\\,g + M\\,g - ${T('B')} = ${tq(W + Wp, 'N')} - ${tq(v.B, 'N', 1)} = ${res(v.A, 'N', 1)}$$`, ['G', 'AB'], ['A']),
      ];
    },
  };

  // ================================================================ forearm and biceps
  // The forearm held level, with the elbow as the axis; the biceps pulls straight up at d from the
  // elbow, the forearm's weight acts at c, a ball in the hand at a. Find the muscle force and the
  // force of the joint on the forearm (down). Lengths in cm.
  const arm = {
    id: 'arm', family: 'supports', difficulty: 3,
    make(r) {
      const d = pick(r, [3, 4, 5]), a = pick(r, [30, 32, 33, 34, 35, 36]), c = pick(r, [14, 15, 16]), mA = pick(r, [1, 1.2, 1.5, 2]), M = pick(r, [1, 2, 3, 4, 5, 6]);
      return { d, a, c, mA, M };
    },
    solve(p, o = {}) {
      const WA = o.noArm ? 0 : p.mA * G, Fm = (WA * p.c + p.M * G * p.a) / p.d;
      return { Fm: exact(Fm), E: exact(o.jointUp ? Fm + WA + p.M * G : Fm - WA - p.M * G) };
    },
    traps: ['noArm', 'jointUp'],
    why: {
      noArm: () => L('The forearm’s own weight is missing.', 'Die Gewichtskraft des Unterarms fehlt.'),
      jointUp: () => L('The joint pushes down on the forearm: the muscle pulls up more than the weights pull down, and the joint takes up the difference.', 'Das Gelenk drückt auf den Unterarm nach unten: Der Muskel zieht stärker nach oben, als die Gewichtskräfte nach unten ziehen, und das Gelenk nimmt die Differenz auf.'),
    },
    nudge: {
      jointUp: () => L('Which forces on the forearm point up, which down? Their sum is zero.', 'Welche Kräfte auf den Unterarm zeigen nach oben, welche nach unten? Ihre Summe ist null.'),
    },
    fields: () => [field('Fm', ['Fm'], 'N', 1, L('muscle force', 'Muskelkraft')), field('E', ['E'], 'N', 1, L('force in the elbow joint', 'Kraft im Ellbogengelenk'))],
    title: () => L('Holding a ball', 'Einen Ball halten'),
    text: (p) => L(`A forearm is held level and carries a ball of ${kg(p.M)} in the hand, ${cm(p.a)} from the elbow. The forearm’s mass is ${kg(p.mA)}, with its centre of mass ${cm(p.c)} from the elbow. The biceps pulls straight up on the forearm ${cm(p.d)} from the elbow. How large is the muscle force, and how large the force with which the elbow joint pushes down on the forearm? Take g = 10 m/s².`,
      `Ein Unterarm wird waagrecht gehalten und trägt in der Hand, ${cm(p.a)} vom Ellbogen entfernt, einen Ball von ${kg(p.M)}. Der Unterarm hat die Masse ${kg(p.mA)}, sein Schwerpunkt liegt ${cm(p.c)} vom Ellbogen entfernt. Der Bizeps zieht ${cm(p.d)} vom Ellbogen entfernt senkrecht nach oben am Unterarm. Wie gross ist die Muskelkraft, und wie gross die Kraft, mit der das Ellbogengelenk auf den Unterarm nach unten drückt? Rechne mit g = 10 m/s².`),
    figure(p, v, view = {}) {
      const len = p.a + 6, B = beamPic(len, L('A forearm held level with a ball in the hand; the biceps pulls up near the elbow', 'Ein waagrecht gehaltener Unterarm mit einem Ball in der Hand; der Bizeps zieht nahe am Ellbogen nach oben')), P = B.P, show = view.show || new Set();
      const up = 120 / P.s;
      P.rect([-6 / P.s, B.h], [6 / P.s, B.h + up], 'beam', 4); // the upper arm
      P.line(B.top(p.d), [6 / P.s, B.h + up * 0.75], 'muscle', true);
      P.pivot(B.mid(0)); P.text(B.mid(0), L('elbow', 'Ellbogen'), 'lbl small', 'end', [-12, 8]);
      P.circle([p.a, B.h + 13 / P.s], 13 / P.s, 'ball');
      P.text([p.a, B.h + 26 / P.s], kg(p.M), 'lbl mass', 'middle', [0, -10]);
      P.dot(B.mid(p.c), 'dot', 2.2);
      P.dim(B.bottom(0), B.bottom(p.d), cm(p.d), -48);
      P.dim(B.bottom(0), B.bottom(p.c), cm(p.c), -70);
      P.dim(B.bottom(0), B.bottom(p.a), cm(p.a), -92);
      if (show.has('F')) {
        P.arrow(B.top(p.d), [0, 1], 70, `force k-h${view.hl && view.hl.has('Fm') ? ' hl' : ''}`, svgSym('Fm'), [8, 4]);
        P.arrow(B.mid(p.c), [0, -1], 30, 'force k-g', svgSym('G'), [8, 2]);
        P.arrow([p.a, B.h / 2], [0, -1], 30, 'force k-g', `${svgSym('G')}<tspan>′</tspan>`, [8, 6]);
      }
      // the force along the (slanting) muscle: longer than its vertical component F_M
      if (show.has('slant')) {
        const from = B.top(p.d), to = [6 / P.s, B.h + up * 0.75], dx = to[0] - from[0], dy = to[1] - from[1], n = Math.hypot(dx, dy), u = [dx / n, dy / n];
        const len = 70 / u[1], tip = [from[0] + (u[0] * len) / P.s, from[1] + (u[1] * len) / P.s];
        P.line(tip, [from[0], from[1] + 70 / P.s], 'action', true);
        P.arrow(from, u, len, 'force k-h hl', L('along the muscle', 'entlang des Muskels'), [-22, 2]);
      }
      if (show.has('E')) P.arrow(B.mid(0), [0, -1], 34, `force k-s${view.hl && view.hl.has('E') ? ' hl' : ''}`, svgSym('E'), [-8, 6]);
      return P.svg();
    },
    hints: (p) => [
      L(`Take the elbow as the axis. The biceps pulls up ${cm(p.d)} from it; the forearm’s weight acts ${cm(p.c)} from it, the ball’s ${cm(p.a)} from it. Which of them turn the forearm up, which down? Does the joint’s force have a torque about the elbow?`,
        `Nimm den Ellbogen als Drehachse. Der Bizeps zieht ${cm(p.d)} davon entfernt nach oben; die Gewichtskraft des Unterarms greift ${cm(p.c)} davon entfernt an, die des Balls ${cm(p.a)}. Welche drehen den Unterarm nach oben, welche nach unten? Hat die Kraft des Gelenks ein Drehmoment bezüglich des Ellbogens?`),
      L(`Torques about the elbow: ${m$(`${T('Fm')}\\cdot d = m_\\mathrm{A}\\,g\\cdot c + M\\,g\\cdot a`)}. Then the forces: up ${m$(T('Fm'))}, down the two weights and the joint’s ${m$(T('E'))}.`,
        `Drehmomente bezüglich des Ellbogens: ${m$(`${T('Fm')}\\cdot d = m_\\mathrm{A}\\,g\\cdot c + M\\,g\\cdot a`)}. Dann die Kräfte: nach oben ${m$(T('Fm'))}, nach unten die zwei Gewichtskräfte und die Kraft ${m$(T('E'))} des Gelenks.`),
      L(`The weights first: the forearm’s is ${m$(tq(p.mA * G, 'N'))}, the ball’s ${m$(tq(p.M * G, 'N'))}. The muscle’s lever arm, ${cm(p.d)}, is much shorter than theirs: its force must be many times larger.`,
        `Zuerst die Gewichtskräfte: Die des Unterarms ist ${m$(tq(p.mA * G, 'N'))}, die des Balls ${m$(tq(p.M * G, 'N'))}. Der Hebelarm des Muskels, ${cm(p.d)}, ist viel kürzer als ihre: Seine Kraft muss viel grösser sein.`),
    ],
    steps(p, v) {
      const WA = p.mA * G, WB = p.M * G;
      return [
        step(L('Torques about the elbow', 'Drehmomente bezüglich des Ellbogens'),
          `<p>${L('The joint’s force acts at the axis and has no torque. The muscle turns the forearm counterclockwise, the two weights clockwise:', 'Die Kraft des Gelenks greift in der Drehachse an und hat kein Drehmoment. Der Muskel dreht den Unterarm im Gegenuhrzeigersinn, die zwei Gewichtskräfte im Uhrzeigersinn:')}</p>` +
          `$$${T('Fm')}\\cdot d = m_\\mathrm{A}\\,g\\cdot c + M\\,g\\cdot a$$ $$${T('Fm')} = \\frac{${tq(WA, 'N')}\\cdot ${tq(p.c, 'cm')} + ${tq(WB, 'N')}\\cdot ${tq(p.a, 'cm')}}{${tq(p.d, 'cm')}} = ${res(v.Fm, 'N', 1)}$$` +
          `<p>${L(`About ${num(v.Fm / WB, 0)} times the ball’s weight: the muscle has a very short lever arm.`, `Etwa ${num(v.Fm / WB, 0)}-mal die Gewichtskraft des Balls: Der Muskel hat einen sehr kurzen Hebelarm.`)}</p>`, ['F'], ['Fm']),
        step(L('Force in the joint', 'Kraft im Gelenk'),
          `<p>${L('The forces balance as well: the muscle pulls up more than the weights pull down, so the joint pushes down on the forearm:', 'Auch die Kräfte heben sich auf: Der Muskel zieht stärker nach oben, als die Gewichtskräfte nach unten ziehen, also drückt das Gelenk auf den Unterarm nach unten:')}</p>` +
          `$$${T('E')} = ${T('Fm')} - m_\\mathrm{A}\\,g - M\\,g = ${tq(v.Fm, 'N', 1)} - ${tq(WA, 'N')} - ${tq(WB, 'N')} = ${res(v.E, 'N', 1)}$$`, ['F', 'E'], ['E']),
        step(L('A remark', 'Eine Bemerkung'),
          `<p>${L(`Here the biceps pulls straight up. In fact it runs at a slant, from the forearm up to the shoulder. Then only the vertical component of its force turns the forearm against the weights; the other component pulls along the forearm, through the elbow, and has no torque about it. So the vertical component must still be ${q(v.Fm, 'N', 1)}, and the force along the muscle is even greater than that.`,
            `Hier zieht der Bizeps senkrecht nach oben. In Wirklichkeit verläuft er schräg, vom Unterarm hinauf zur Schulter. Dann dreht nur die senkrechte Komponente seiner Kraft den Unterarm gegen die Gewichtskräfte; die andere Komponente zieht entlang des Unterarms, durch den Ellbogen, und hat bezüglich des Ellbogens kein Drehmoment. Die senkrechte Komponente muss also immer noch ${q(v.Fm, 'N', 1)} betragen, und die Kraft entlang des Muskels ist sogar noch grösser.`)}</p>`, ['F', 'slant'], ['slant']),
      ];
    },
  };

  SCENARIOS.push(plank, arm);
})(typeof window !== 'undefined' ? window : globalThis);
