// Inertia: without a net force a body keeps its velocity. A brief kick adds a velocity (as an
// arrow), a body released from a circle goes straight on along the tangent, and a probe whose
// engine is switched off keeps its speed.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, F, FL, cap, num, qty, deg, noun, o, q, register } = FC;
  // German possessive for a feminine thing (Geschwindigkeit) owned by N: seine/ihre.
  const poss = (N) => (N.g === 'f' ? 'ihre' : 'seine');

  // ================================================================ kick: a brief push sideways
  const TRIPLES = [[4, 3], [3, 4], [8, 6], [6, 8], [12, 5], [5, 12]];

  function kick(r, p) {
    const obj = p.obj || r.pick(['puck', 'probe']);
    const [v, u] = p.vu || r.pick(TRIPLES);
    const s = p.side || r.pick([1, -1]); // 1: kick to the north (up in the picture)
    const side = s > 0 ? 'north' : 'south';
    const w = Math.hypot(v, u), th = Math.atan2(u, v);
    const puckish = obj === 'puck';
    const name = puckish ? 'puck' : 'probe';
    const N = puckish ? noun('m', 'Puck') : noun('f', 'Sonde');
    const K = puckish ? noun('m', 'Schlag') : noun('m', 'Schub'); // the kick, in German
    const dSide = s > 0 ? 'Norden' : 'Süden', dAdj = s > 0 ? 'nördlich' : 'südlich';

    // ---------------------------------------------------------- figure (top view, north up)
    const Py = s > 0 ? 150 : 50, P = [150, Py], k = 64 / Math.max(v, u);
    const body = (x, y, cls, fire) => {
      const b = puckish ? D.puck(x, y, 10) : D.probe(x, y, [1, 0], fire ? [0, -s] : null, 0.75);
      return cls ? D.ghost(b) : b;
    };
    function figure(o = {}) {
      let g = D.rect(0, 0, 380, 200, puckish ? 'ice' : 'space', 6);
      g += D.arrow(352, 46, 352, 18, 'ax', 'N', { head: 7, at: [352, 58] });
      g += D.line(10, Py, P[0], Py, 'trace');
      [30, 70, 110].forEach((x) => { g += body(x, Py, 'ghost'); });
      if (o.after) {
        // to the edge of the picture; ghosts every 50 px along the way
        const len = Math.min(200 / Math.cos(th), (Py - 10 > 0 && s > 0 ? Py - 10 : 190 - Py) / Math.sin(th));
        const step = 50;
        const ex = P[0] + len * Math.cos(th), ey = Py - s * len * Math.sin(th);
        g += D.line(P[0], Py, ex, ey, 'trace strong');
        [1, 2, 3].filter((j) => j * step < len - 12).forEach((j) => { g += body(P[0] + j * step * Math.cos(th), Py - s * j * step * Math.sin(th), 'ghost'); });
        g += D.line(P[0], Py, P[0] + 60, Py, 'guide') + D.text(P[0] + 64, Py - s * 12 + 4, `θ ≈ ${deg(th)}°`, 'lbl small', 'start');
      }
      if (o.triangle) {
        const tx = P[0] + k * v;
        g += D.arrow(P[0], Py, tx, Py, 'v', 'v', { at: [(P[0] + tx) / 2, Py + s * 18 + 4] });
        g += D.arrow(tx, Py, tx, Py - s * k * u, 'v', 'u', { cls: 'alt', at: [tx + 10, Py - s * k * u * 0.5 + 4], anchor: 'start' });
        g += D.arrow(P[0], Py, tx, Py - s * k * u, 'v', "v'", { cls: 'strong', at: [P[0] + k * v * 0.45 - 10, Py - s * k * u * 0.5 - 4], anchor: 'end' });
      } else if (!o.after) {
        g += D.arrow(P[0] + 16, Py, P[0] + 16 + k * v, Py, 'v', 'v');
      }
      if (o.kick !== false && !o.after && !o.triangle) g += D.arrow(P[0] + (puckish ? 0 : 26), Py + s * 50, P[0] + (puckish ? 0 : 26), Py + s * 15, 'f', puckish ? T('kick', 'Schlag') : T('burst', 'Schub'), { at: [P[0] + (puckish ? 8 : 34), Py + s * 40 + 4], anchor: 'start', head: 12 });
      g += body(P[0], Py, false, !puckish && o.kick !== false && !o.after && !o.triangle) + D.text(P[0] - 14, Py + s * 16 + 4, 'P', 'lbl', 'end');
      return D.svg(380, 200, g, T(`Top view: the ${name} moves east and is pushed ${side} at P`, `Ansicht von oben: ${N.nom} bewegt sich nach Osten und wird in P nach ${dSide} gestossen`));
    }

    // Options: paths from P (small top views).
    const pic = (d) => {
      const y = s > 0 ? 92 : 18;
      const g = D.line(2, y, 28, y, 'trace') + D.path(d(28, y), 'opt-path') + (puckish ? D.puck(28, y, 6) : D.probe(28, y, [1, 0], null, 0.45));
      return D.svg(150, 110, g, T('path', 'Bahn'));
    };
    const L = 82;
    const PATH = {
      ok: (x, y) => `M${x} ${y} L${D.n(x + L * Math.cos(th))} ${D.n(y - s * L * Math.sin(th))}`,
      north: (x, y) => `M${x} ${y} V${y - s * 74}`,
      east: (x, y) => `M${x} ${y} H${x + 112}`,
      curve: (x, y) => `M${x} ${y} Q${x + 62} ${y} ${x + 68} ${y - s * 74}`,
    };
    const kickWord = puckish ? 'kick' : 'burst of the thruster';
    const nach = T('after the ' + kickWord, `nach ${K.dat}`); // “nach dem Schlag”
    const after = T(`After the ${kickWord}, no force acts any more, so the ${name} moves in a straight line at constant speed`,
      `Nach ${K.dat} wirkt keine Kraft mehr, also bewegt sich ${N.nom} geradlinig mit konstanter Geschwindigkeit`);
    const root2 = `√(${v}² + ${u}²)`;
    const questions = [
      q(r, 'path', T(`Which path does the ${name} follow after the ${kickWord}?`, `Welche Bahn beschreibt ${N.nom} ${nach}?`), [
        o(pic(PATH.ok), 'ok', T(`Right: the ${kickWord} adds a velocity ${side}ward to the velocity east. ${after}, in the direction of the new velocity.`,
          `Richtig: ${cap(K.nom)} fügt zur Geschwindigkeit nach Osten eine Geschwindigkeit nach ${dSide} hinzu. ${after}, in Richtung der neuen Geschwindigkeit.`),
          T(`a straight line, slanting ${side} of east by about ${deg(th)}°`, `eine Gerade, etwa ${deg(th)}° ${dAdj} von Osten`)),
        o(pic(PATH.north), 'last-force', T(`The ${name} does not forget its velocity east: the ${kickWord} only adds a velocity ${side}ward. The new velocity is the sum of both.`,
          `${cap(N.nom)} vergisst ${poss(N)} Geschwindigkeit nach Osten nicht: ${cap(K.nom)} fügt nur eine Geschwindigkeit nach ${dSide} hinzu. Die neue Geschwindigkeit ist die Summe von beiden.`),
          T(`straight ${side}`, `geradeaus nach ${dSide}`)),
        o(pic(PATH.east), 'other', T(`The ${kickWord} is short, but it does change the velocity: it adds ${qty(u, 'm/s')} ${side}ward, which stays after the ${kickWord}.`,
          `${cap(K.nom)} ist kurz, aber er ändert die Geschwindigkeit: Er fügt ${qty(u, 'm/s')} nach ${dSide} hinzu, und das bleibt auch ${nach}.`),
          T('straight on to the east', 'geradeaus weiter nach Osten')),
        o(pic(PATH.curve), 'impetus', T(`There is no old motion that dies away and a new one that takes over. ${after}: a straight line.`,
          `Es gibt keine alte Bewegung, die abklingt, und keine neue, die übernimmt. ${after}: eine Gerade.`),
          T(`a curve that turns from east to ${side}`, `eine Kurve, die von Osten nach ${dSide} dreht`)),
      ], true),
      q(r, 'speed', T(`What is the speed of the ${name} right after the ${kickWord}?`, `Wie gross ist die Geschwindigkeit ${puckish ? 'des Pucks' : 'der Sonde'} direkt ${nach}?`), [
        o(qty(w, 'm/s'), 'ok', T(`Right: the velocities add as arrows at right angles: ${root2} m/s = ${num(w)} m/s.`, `Richtig: Die Geschwindigkeiten addieren sich als Pfeile im rechten Winkel: ${root2} m/s = ${num(w)} m/s.`)),
        o(qty(v + u, 'm/s'), 'vector-add', T(`${v} + ${u} would be right if both velocities pointed the same way. At right angles they add as arrows: ${root2}.`,
          `${v} + ${u} wäre richtig, wenn beide Geschwindigkeiten in dieselbe Richtung zeigten. Im rechten Winkel addieren sie sich als Pfeile: ${root2}.`)),
        o(qty(v, 'm/s'), 'other', T(`The ${kickWord} does not only turn the velocity, it adds a velocity ${side}ward: the speed becomes ${root2}.`,
          `${cap(K.nom)} dreht die Geschwindigkeit nicht nur, er fügt eine Geschwindigkeit nach ${dSide} hinzu: Der Betrag wird ${root2}.`)),
        o(qty(u, 'm/s'), 'last-force', T(`The velocity east is not lost: the new velocity is the sum of ${v} m/s east and ${u} m/s ${side}.`,
          `Die Geschwindigkeit nach Osten geht nicht verloren: Die neue Geschwindigkeit ist die Summe von ${v} m/s nach Osten und ${u} m/s nach ${dSide}.`)),
        o(qty(Math.abs(v - u), 'm/s'), 'vector-add', T(`Subtracting would be right if the two velocities pointed in opposite directions. At right angles they add as arrows: ${root2}.`,
          `Subtrahieren wäre richtig, wenn die beiden Geschwindigkeiten entgegengesetzt wären. Im rechten Winkel addieren sie sich als Pfeile: ${root2}.`)),
      ]),
    ];

    const steps = [
      { title: T('Before the kick', `Vor ${K.dat}`), figure: figure({ kick: false }),
        text: T(`${puckish ? `On the smooth ice no horizontal force acts on the puck (its weight and the push of the ice cancel).` : `Far from any planet, with the engine off, no force acts on the probe.`} So it moves in a straight line at constant speed, <i>v</i> = ${qty(v, 'm/s')} east.`,
          `${puckish ? 'Auf dem glatten Eis wirkt keine horizontale Kraft auf den Puck (Gewichtskraft und Normalkraft des Eises heben sich auf).' : 'Weit weg von jedem Planeten und mit abgeschaltetem Triebwerk wirkt keine Kraft auf die Sonde.'} Also bewegt ${puckish ? 'er' : 'sie'} sich geradlinig mit konstanter Geschwindigkeit, <i>v</i> = ${qty(v, 'm/s')} nach Osten.`) },
      { title: T(`During the ${kickWord}`, `Während ${puckish ? 'des Schlags' : 'des Schubs'}`), figure: figure({ triangle: true }),
        text: T(`For a moment a force acts ${side}ward. It changes the velocity: on its own it would give the ${name} ${qty(u, 'm/s')} ${side}ward, so it adds <i>u</i> = ${qty(u, 'm/s')} ${side}ward to the velocity. Velocities add as arrows: <i>v'</i> = <i>v</i> + <i>u</i> (head to tail), with size ${root2} m/s = ${qty(w, 'm/s')}.`,
          `Einen Moment lang wirkt eine Kraft nach ${dSide}. Sie ändert die Geschwindigkeit: Allein würde sie ${N.dat} ${qty(u, 'm/s')} nach ${dSide} geben, also fügt sie der Geschwindigkeit <i>u</i> = ${qty(u, 'm/s')} nach ${dSide} hinzu. Geschwindigkeiten addieren sich als Pfeile: <i>v'</i> = <i>v</i> + <i>u</i> (Pfeile aneinanderhängen), mit dem Betrag ${root2} m/s = ${qty(w, 'm/s')}.`) },
      { title: T(`After the ${kickWord}`, cap(nach)), figure: figure({ after: true }),
        text: T(`Again no force acts: the ${name} moves on in a straight line at constant speed ${qty(w, 'm/s')}, in the direction of <i>v'</i>: tan θ = <i>u</i>/<i>v</i> = ${u}/${v}, so θ ≈ ${deg(th)}° ${side} of east.`,
          `Wieder wirkt keine Kraft: ${cap(N.nom)} bewegt sich geradlinig mit konstant ${qty(w, 'm/s')} weiter, in Richtung von <i>v'</i>: tan θ = <i>u</i>/<i>v</i> = ${u}/${v}, also θ ≈ ${deg(th)}° ${dAdj} von Osten.`) },
    ];

    return {
      title: puckish ? T('A kick on the ice', 'Ein Schlag auf dem Eis') : T('A side thruster', 'Eine Seitendüse'),
      situation: puckish
        ? T(`<p>A puck slides east on smooth ice (friction is negligible) at <i>v</i> = ${qty(v, 'm/s')}. At the point P it gets a short, sharp kick toward the ${side}. On its own, this kick would give a resting puck a speed of <i>u</i> = ${qty(u, 'm/s')}. The picture shows the ice from above.</p>`,
          `<p>Ein Puck gleitet mit <i>v</i> = ${qty(v, 'm/s')} auf glattem Eis nach Osten (Reibung vernachlässigbar). Im Punkt P bekommt er einen kurzen, harten Schlag nach ${dSide}. Allein würde dieser Schlag einem ruhenden Puck die Geschwindigkeit <i>u</i> = ${qty(u, 'm/s')} geben. Das Bild zeigt das Eis von oben.</p>`)
        : T(`<p>A space probe drifts east with its engine off, far from any planet, at <i>v</i> = ${qty(v, 'm/s')}. At the point P a side thruster fires a short burst toward the ${side}. On its own, this burst would give a resting probe a speed of <i>u</i> = ${qty(u, 'm/s')}. The picture shows the probe from above.</p>`,
          `<p>Eine Raumsonde treibt weit weg von jedem Planeten mit abgeschaltetem Triebwerk nach Osten, mit <i>v</i> = ${qty(v, 'm/s')}. Im Punkt P gibt eine Seitendüse einen kurzen Schub nach ${dSide}. Allein würde dieser Schub einer ruhenden Sonde die Geschwindigkeit <i>u</i> = ${qty(u, 'm/s')} geben. Das Bild zeigt die Sonde von oben.</p>`),
      figure: figure(),
      questions,
      hints: [
        T(`Before the ${kickWord} the ${name} moves east at ${qty(v, 'm/s')}; the ${kickWord} pushes it ${side}. Which force acts on the ${name} before, during and after the ${kickWord}?`,
          `Vor ${K.dat} bewegt sich ${N.nom} mit ${qty(v, 'm/s')} nach Osten; ${K.nom} stösst ${N.ihn} nach ${dSide}. Welche Kraft wirkt vor, während und ${nach} auf ${N.acc}?`),
        T(`Plan: the new velocity <i>v'</i> right after the ${kickWord} is the old velocity east plus the velocity the ${kickWord} adds ${side}ward; after that, the first law keeps <i>v'</i>.`,
          `Plan: Die neue Geschwindigkeit <i>v'</i> direkt ${nach} ist die alte Geschwindigkeit nach Osten plus die Geschwindigkeit, die ${K.nom} nach ${dSide} hinzufügt; danach bleibt <i>v'</i> nach dem ersten Newtonschen Gesetz erhalten.`),
        T(`Velocities add as arrows: <i>v'</i> = <i>v</i> + <i>u</i>, with <i>v</i> east and <i>u</i> ${side}, at right angles. So the size of <i>v'</i> follows from Pythagoras, √(<i>v</i>² + <i>u</i>²), and its direction from tan θ = <i>u</i>/<i>v</i>.`,
          `Geschwindigkeiten addieren sich als Pfeile: <i>v'</i> = <i>v</i> + <i>u</i>, mit <i>v</i> nach Osten und <i>u</i> nach ${dSide}, im rechten Winkel. Der Betrag von <i>v'</i> folgt also aus Pythagoras, √(<i>v</i>² + <i>u</i>²), die Richtung aus tan θ = <i>u</i>/<i>v</i>.`),
        T(`Here: ${qty(v, 'm/s')} east plus ${qty(u, 'm/s')} ${side}. Draw the two arrows head to tail. After the ${kickWord}, no force acts.`,
          `Hier: ${qty(v, 'm/s')} nach Osten plus ${qty(u, 'm/s')} nach ${dSide}. Zeichne die beiden Pfeile aneinandergehängt. ${cap(nach)} wirkt keine Kraft.`),
      ],
      steps,
    };
  }

  // ================================================================ circle: leaving a circular path
  // Something goes round a horizontal circle and the force that bends its path stops at P: a ball
  // leaving a curved channel, a stone whose string breaks, a car on black ice, the last skater of a
  // chain letting go, a water drop at a hole of a salad spinner, a hammer released by the thrower.
  // Seen from above, it goes on along the tangent.
  function circleCases() {
    return {
      channel: { obj: 'ball', N: noun('f', 'Kugel'), sym: 'N', bg: 'table-top',
        release: T('leaves the channel', 'die Rinne verlassen hat'), gone: T(': the channel wall is gone', ': Die Wand der Rinne ist weg'),
        holder: T('The channel wall', 'Die Wand der Rinne'), held: (N) => T('the wall pushed it', `die Wand ${N.ihn} nach innen gedrückt`), verb: 'gedrückt',
        touch: T('it touches the ball', 'sie die Kugel berührt'),
        vert: T('the weight and the push of the table are vertical and cancel', 'Gewichtskraft und Normalkraft des Tisches sind vertikal und heben sich auf'),
        inward: (FN) => T(`the outer wall of the channel pushes it toward the centre (normal force ${FN})`, `drückt die äussere Wand der Rinne sie zum Zentrum hin (Normalkraft ${FN})`),
        hint: T('the wall no longer touches the ball', 'berührt die Wand die Kugel nach P nicht mehr'),
        title: T('Out of the channel', 'Aus der Rinne'),
        label: T('Top view: a ball rolls through a curved channel and leaves it at P', 'Ansicht von oben: Eine Kugel rollt durch eine gebogene Rinne und verlässt sie in P'),
        text: (sense) => T(`A curved channel lies flat on a table. A ball rolls through it, ${sense} as seen from above, and leaves it at P. Friction is negligible.`,
          `Eine gebogene Rinne liegt flach auf einem Tisch. Eine Kugel rollt hindurch, von oben gesehen ${sense}, und verlässt sie in P. Die Reibung ist vernachlässigbar.`) },
      string: { obj: 'stone', N: noun('m', 'Stein'), sym: 'T', bg: 'ice',
        release: T('is released', 'losgelassen wurde'), gone: T(': the string no longer pulls', ': Die Schnur zieht nicht mehr'),
        holder: T('The string', 'Die Schnur'), held: (N) => T('the string pulled it', `die Schnur ${N.ihn} nach innen gezogen`), verb: 'gezogen',
        touch: T('it is attached', 'sie befestigt ist'),
        vert: T('the weight and the push of the ice are vertical and cancel', 'Gewichtskraft und Normalkraft des Eises sind vertikal und heben sich auf'),
        inward: (FN, FT) => T(`the string pulls it toward the centre (tension ${FT})`, `zieht die Schnur ihn zum Zentrum hin (Seilkraft ${FT})`),
        hint: T('the string no longer pulls', 'zieht die Schnur nach P nicht mehr'),
        title: T('The string breaks', 'Die Schnur reisst'),
        label: T('Top view: a stone whirled on a string; the string breaks at P', 'Ansicht von oben: ein Stein an einer Schnur im Kreis; in P reisst die Schnur'),
        text: (sense) => T(`A stone tied to a string slides around a pin on smooth ice, in a circle, ${sense} as seen from above. At P the string breaks. Friction is negligible.`,
          `Ein Stein an einer Schnur gleitet auf glattem Eis im Kreis um einen Pfosten, von oben gesehen ${sense}. In P reisst die Schnur. Die Reibung ist vernachlässigbar.`) },
      car: { obj: 'car', N: noun('n', 'Auto'), sym: 'f', bg: 'table-top', goes: 'fährt',
        release: T('reaches the black ice', 'das Glatteis erreicht hat'), gone: T(': on the black ice the tyres have no grip', ': Auf dem Glatteis haften die Reifen nicht mehr'),
        holder: T('The friction of the road', 'Die Reibungskraft der Strasse'), held: (N) => T('the friction of the road pushed it', `die Reibung der Strasse ${N.ihn} nach innen gedrückt`), verb: 'gewirkt',
        touch: T('the tyres grip the road', 'die Reifen auf der Strasse haften'),
        vert: T('the weight and the push of the road are vertical and cancel; air resistance is negligible', 'Gewichtskraft und Normalkraft der Strasse sind vertikal und heben sich auf; der Luftwiderstand ist vernachlässigbar'),
        inward: (FN, FT, Ff) => T(`the friction of the road on the tyres pushes it toward the centre (friction ${Ff})`, `drückt die Reibungskraft der Strasse auf die Reifen es zum Zentrum hin (Reibungskraft ${Ff})`),
        hint: T('the tyres no longer grip', 'haften die Reifen nach P nicht mehr'),
        title: T('Black ice', 'Glatteis'),
        label: T('Top view: a car in a circular bend runs onto black ice at P', 'Ansicht von oben: Ein Auto in einer kreisförmigen Kurve gerät in P auf Glatteis'),
        text: (sense) => T(`A car drives round a flat, circular bend at constant speed, ${sense} as seen from above. At P it runs onto a patch of black ice, where the tyres have no grip at all. Air resistance is negligible.`,
          `Ein Auto fährt mit konstanter Geschwindigkeit durch eine flache, kreisförmige Kurve, von oben gesehen ${sense}. In P gerät es auf Glatteis, wo die Reifen überhaupt nicht mehr haften. Der Luftwiderstand ist vernachlässigbar.`) },
      skater: { obj: 'skater', it: 'she', its: 'her', him: 'her', N: noun('f', 'Eisläuferin'), sym: 'T', bg: 'ice',
        release: T('lets go', 'losgelassen hat'), gone: T(': she no longer holds on to her neighbour', ': Sie hält sich nicht mehr an der Nachbarin fest'),
        holder: T('Her neighbour’s hand', 'Die Hand ihrer Nachbarin'), held: (N) => T('her neighbour’s hand pulled her', `die Hand der Nachbarin ${N.ihn} nach innen gezogen`), verb: 'gezogen',
        touch: T('the two hold hands', 'die beiden sich an den Händen halten'),
        vert: T('her weight and the push of the ice are vertical and cancel; friction is negligible', 'Gewichtskraft und Normalkraft des Eises sind vertikal und heben sich auf; die Reibung ist vernachlässigbar'),
        inward: (FN, FT) => T(`the hand of her neighbour in the chain pulls her toward the centre (pull ${FT})`, `zieht die Hand ihrer Nachbarin in der Kette sie zum Zentrum hin (Zugkraft ${FT})`),
        hint: T('her neighbour no longer pulls her', 'zieht die Nachbarin sie nach P nicht mehr'),
        title: T('Crack the whip', 'Die Peitsche'),
        label: T('Top view: a chain of skaters turning round the first one; the last skater lets go at P', 'Ansicht von oben: eine Kette von Eisläuferinnen dreht sich um die erste; die letzte lässt in P los'),
        text: (sense) => T(`Skaters hold hands in a long, straight chain that turns round the first skater, who stays on the spot. The last skater goes round in a circle at constant speed, ${sense} as seen from above. At P she lets go. Friction is negligible.`,
          `Eisläuferinnen bilden eine lange, gerade Kette, die sich um die erste Läuferin dreht; diese bleibt an Ort. Die letzte Läuferin bewegt sich mit konstanter Geschwindigkeit im Kreis, von oben gesehen ${sense}. In P lässt sie los. Die Reibung ist vernachlässigbar.`) },
      drop: { obj: 'water drop', N: noun('m', 'Wassertropfen'), sym: 'N', bg: 'table-top', above: true,
        release: T('flies out through a hole in the wall', 'durch ein Loch in der Wand hinausgeflogen ist'), gone: T(': there is no wall at the hole', ': Beim Loch fehlt die Wand'),
        holder: T('The basket wall', 'Die Korbwand'), held: (N) => T('the basket wall pushed it', `die Korbwand ${N.ihn} nach innen gedrückt`), verb: 'gedrückt',
        touch: T('it touches the drop', 'sie den Tropfen berührt'),
        vert: T('its weight is vertical: it makes the drop fall, but seen from above it does not bend the path; air resistance is negligible', 'seine Gewichtskraft ist vertikal: Sie lässt den Tropfen fallen, krümmt aber die Bahn von oben gesehen nicht; der Luftwiderstand ist vernachlässigbar'),
        inward: (FN) => T(`the wall of the basket pushes it toward the centre (normal force ${FN})`, `drückt die Wand des Korbs ihn zum Zentrum hin (Normalkraft ${FN})`),
        hint: T('there is no wall at the hole', 'fehlt die Wand nach P'),
        title: T('The salad spinner', 'Die Salatschleuder'),
        label: T('Top view: a water drop on the wall of a turning salad spinner reaches a hole at P', 'Ansicht von oben: Ein Wassertropfen an der Wand einer drehenden Salatschleuder erreicht in P ein Loch'),
        text: (sense) => T(`A salad spinner is turning. A water drop on the wall of its basket goes round at constant speed, ${sense} as seen from above. At P it reaches a hole in the wall and flies out. Air resistance is negligible.`,
          `Eine Salatschleuder dreht sich. Ein Wassertropfen an der Wand ihres Korbs läuft mit konstanter Geschwindigkeit im Kreis, von oben gesehen ${sense}. In P kommt er zu einem Loch in der Wand und fliegt hinaus. Der Luftwiderstand ist vernachlässigbar.`) },
      hammer: { obj: 'hammer', N: noun('m', 'Hammer'), sym: 'T', bg: 'table-top', above: true, goes: 'fliegt',
        release: T('is released', 'losgelassen wurde'), gone: T(': the wire no longer pulls', ': Der Draht zieht nicht mehr'),
        holder: T('The wire', 'Der Draht'), held: (N) => T('the wire pulled it', `der Draht ${N.ihn} nach innen gezogen`), verb: 'gezogen',
        touch: T('it is held', 'er gehalten wird'),
        vert: T('its weight is vertical: it makes the hammer fall, but seen from above it does not bend the path; air resistance is negligible', 'seine Gewichtskraft ist vertikal: Sie lässt den Hammer fallen, krümmt aber die Bahn von oben gesehen nicht; der Luftwiderstand ist vernachlässigbar'),
        inward: (FN, FT) => T(`the wire pulls it toward the centre (tension ${FT})`, `zieht der Draht ihn zum Zentrum hin (Seilkraft ${FT})`),
        hint: T('the wire no longer pulls', 'zieht der Draht nach P nicht mehr'),
        title: T('Hammer throw', 'Hammerwurf'),
        label: T('Top view: a hammer thrower swings the hammer round and lets go at P', 'Ansicht von oben: Eine Hammerwerferin schwingt den Hammer im Kreis und lässt in P los'),
        text: (sense) => T(`A hammer thrower turns on the spot and swings the hammer, a heavy ball on a wire, round in a circle at constant speed, ${sense} as seen from above. At P she lets go. Take the circle as horizontal; air resistance is negligible. The questions are about the motion seen from above.`,
          `Eine Hammerwerferin dreht sich an Ort und schwingt den Hammer, eine schwere Kugel an einem Draht, mit konstanter Geschwindigkeit im Kreis, von oben gesehen ${sense}. In P lässt sie los. Nimm den Kreis als horizontal an; der Luftwiderstand ist vernachlässigbar. Gefragt ist nach der Bewegung von oben gesehen.`) },
    };
  }

  function circle(r, p) {
    const variant = p.variant || r.pick(['channel', 'string', 'car', 'skater', 'drop', 'hammer']);
    const s = p.sense || r.pick([1, -1]); // 1: clockwise in the picture
    const phi = ((p.angle != null ? p.angle : r.pick([0, 45, 90, 135, 180, 225, 270, 315])) * Math.PI) / 180;
    const K = circleCases()[variant], channel = variant === 'channel', obj = K.obj, N = K.N;
    const it = K.it || 'it', its = K.its || 'its', him = K.him || 'it';
    const n = [Math.cos(phi), Math.sin(phi)], t = [-s * Math.sin(phi), s * Math.cos(phi)];
    const vert = K.vert;

    const pt = (c, R, a) => [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)];
    // Arc of radius R around c from angle a0 to a1 (in the sense s).
    const arc = (c, R, a0, a1) => {
      const [x0, y0] = pt(c, R, a0), [x1, y1] = pt(c, R, a1);
      return `M${D.n(x0)} ${D.n(y0)} A${R} ${R} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${s > 0 ? 1 : 0} ${D.n(x1)} ${D.n(y1)}`;
    };
    const start = phi - s * 1.5 * Math.PI;
    function track(c, R, wide) {
      if (channel || variant === 'car') return D.path(arc(c, R, start, phi), 'channel' + (wide ? '' : ' thin-ch')) + (channel ? D.path(arc(c, R, start, phi), 'channel-mid') : '');
      if (variant === 'drop') return `<circle class="channel thin-ch" cx="${D.n(c[0])}" cy="${D.n(c[1])}" r="${D.n(R + (wide ? 9 : 4))}"/>` + D.dot(c[0], c[1], 3.5, 'pin');
      return `<circle class="trace" cx="${D.n(c[0])}" cy="${D.n(c[1])}" r="${R}" fill="none"/>` + D.dot(c[0], c[1], 3.5, 'pin');
    }
    // the body at angle a on the circle of radius R round c
    function body(c, R, a, size = 8) {
      const [x, y] = pt(c, R, a);
      if (variant === 'car') return `<g transform="rotate(${D.n((a * 180) / Math.PI)} ${D.n(x)} ${D.n(y)})">${D.rect(x - size, y - 1.9 * size, 2 * size, 3.8 * size, 'obj', size / 2)}</g>`;
      if (variant === 'drop') return D.ball(x, y, size * 0.7);
      if (variant === 'hammer') return D.ball(x, y, size, 'obj heavy');
      return D.ball(x, y, size);
    }

    // ---------------------------------------------------------- figure (top view)
    const C = [170, 135], R = 80, P = pt(C, R, phi);
    function figure(o = {}) {
      let g = D.rect(0, 0, 340, 270, K.bg, 6) + track(C, R, true);
      if (variant === 'car') {
        const m = [P[0] + 40 * t[0], P[1] + 40 * t[1]];
        g += `<ellipse class="ice" cx="${D.n(m[0])}" cy="${D.n(m[1])}" rx="58" ry="26" transform="rotate(${D.n((Math.atan2(t[1], t[0]) * 180) / Math.PI)} ${D.n(m[0])} ${D.n(m[1])})"/>`;
      }
      if (o.inward) [-0.5, -1.1, -1.7].forEach((da, i) => {
        const a = phi + s * da, [x, y] = pt(C, R, a);
        g += D.ghost(body(C, R, a)) + D.arrow(x, y, x - 34 * Math.cos(a), y - 34 * Math.sin(a), 'f', i ? '' : FL(K.sym), { at: [x - 44 * Math.cos(a), y - 44 * Math.sin(a) + 4], anchor: 'middle' });
      });
      if (o.tangent) {
        g += D.line(P[0], P[1], P[0] + 170 * t[0], P[1] + 170 * t[1], 'trace strong');
        [1, 2, 3].forEach((j) => { g += D.ghost(D.ball(P[0] + 42 * j * t[0], P[1] + 42 * j * t[1], variant === 'drop' ? 6 : 8)); });
      }
      if (o.compare) {
        g += D.path(arc(C, R, phi, phi + s * 0.5 * Math.PI), 'guide');
        g += D.line(P[0], P[1], P[0] + 60 * n[0], P[1] + 60 * n[1], 'guide');
      }
      if (!o.tangent && (variant === 'string' || variant === 'skater' || variant === 'hammer')) {
        g += D.line(C[0], C[1], P[0], P[1], 'cable');
        if (variant === 'skater') [0, 1, 2].forEach((j) => { const [x, y] = pt(C, 20 * j + 14, phi); g += D.ball(x, y, 6); });
      }
      if (variant === 'hammer') g += D.ball(C[0], C[1], 8, 'skin');
      g += body(C, R, phi) + D.text(P[0] + 18 * n[0] - 12 * t[0], P[1] + 18 * n[1] - 12 * t[1] + 4, 'P', 'lbl');
      if (!o.inward && !o.tangent) g += D.arrow(P[0] + 10 * t[0], P[1] + 10 * t[1], P[0] + 52 * t[0], P[1] + 52 * t[1], 'v', 'v');
      return D.svg(340, 270, g, K.label);
    }

    const c2 = [75, 75], R2 = 34, P2 = pt(c2, R2, phi);
    const pic = (d) => D.svg(150, 150, track(c2, R2, false) + D.path(d, 'opt-path') + D.ball(P2[0], P2[1], 5), T('path', 'Bahn'));
    const seg = (dx, dy) => `M${D.n(P2[0])} ${D.n(P2[1])} L${D.n(P2[0] + dx)} ${D.n(P2[1] + dy)}`;
    const PATH = {
      tangent: seg(56 * t[0], 56 * t[1]),
      circle: arc(c2, R2, phi, phi + s * 0.47 * Math.PI),
      radial: seg(38 * n[0], 38 * n[1]),
      outward: `M${D.n(P2[0])} ${D.n(P2[1])} Q${D.n(P2[0] + 28 * t[0])} ${D.n(P2[1] + 28 * t[1])} ${D.n(P2[0] + 30 * t[0] + 32 * n[0])} ${D.n(P2[1] + 30 * t[1] + 32 * n[1])}`,
    };
    const release = K.release;
    const noSide = T(`After P nothing pushes the ${obj} sideways any more${K.gone}.`, `Nach P drückt nichts mehr seitlich auf ${N.acc}${K.gone}.`);
    const holder = K.holder;
    const seen = K.above ? T(' (seen from above)', ' (von oben gesehen)') : '';
    const questions = [
      q(r, 'path', T(`Which path does the ${obj} follow after ${it} ${release} at P${seen}?`, `Welche Bahn beschreibt ${N.nom}${seen}, nachdem ${N.er} in P ${release}?`), [
        o(pic(PATH.tangent), 'ok', T(`Right: ${noSide} With no horizontal force, ${it} goes straight on in the direction ${it} had at P — along the tangent.`,
          `Richtig: ${noSide} Ohne horizontale Kraft bewegt ${N.er} sich geradeaus weiter, in der Richtung, die ${N.er} in P hatte — entlang der Tangente.`),
          T('straight on along the tangent', 'geradeaus entlang der Tangente')),
        o(pic(PATH.circle), 'circular-impetus', T(`The ${obj} does not “remember” the circle. ${noSide} Without a force toward the centre, the path is not bent any more.`,
          `${cap(N.nom)} „erinnert“ sich nicht an den Kreis. ${noSide} Ohne Kraft zum Zentrum hin wird die Bahn nicht mehr gekrümmt.`),
          T('on along the circle', 'weiter auf dem Kreis')),
        o(pic(PATH.radial), 'centrifugal', T(`There is no outward force. ${holder} only ${K.verb === 'gedrückt' ? 'pushed' : 'pulled'} toward the centre. When that stops, the ${obj} keeps the velocity ${it} had at P, which points along the tangent.`,
          `Es gibt keine Kraft nach aussen. ${holder} hat nur zum Zentrum hin ${K.verb}. Fällt das weg, behält ${N.nom} die Geschwindigkeit, die ${N.er} in P hatte — und die zeigt entlang der Tangente.`),
          T('straight outward, away from the centre', 'geradlinig nach aussen, weg vom Zentrum')),
        o(pic(PATH.outward), 'centrifugal', T(`No force pushes the ${obj} outward, so ${its} path does not bend outward. Without any horizontal force, ${it} moves in a straight line along the tangent.`,
          `Keine Kraft drückt ${N.acc} nach aussen, also krümmt sich die Bahn nicht nach aussen. Ohne horizontale Kraft bewegt ${N.er} sich geradlinig entlang der Tangente.`),
          T('a curve bending outward', 'eine nach aussen gekrümmte Kurve')),
      ], true),
      q(r, 'force', T(`Which horizontal forces act on the ${obj} after P?`, `Welche horizontalen Kräfte wirken nach P auf ${N.acc}?`), [
        o(T('None.', 'Keine.'), 'ok', T(`Right: ${noSide} (${cap(vert)}.)`, `Richtig: ${noSide} (${cap(vert)}.)`)),
        o(T(`A force in ${its} direction of motion, which keeps ${him} moving.`, 'Eine Kraft in Bewegungsrichtung, die die Bewegung aufrechterhält.'), 'active-force',
          T(`The ${obj} keeps moving without a force (inertia). A force along the motion would make ${him} faster.`, `${cap(N.nom)} bewegt sich ohne Kraft weiter (Trägheit). Eine Kraft in Bewegungsrichtung würde ${N.ihn} schneller machen.`)),
        o(T('A centrifugal force, outward from the centre.', 'Eine Zentrifugalkraft, vom Zentrum weg nach aussen.'), 'centrifugal',
          T(`Nothing pushes the ${obj} outward. In the circle, ${K.held(N)} inward; after P, no horizontal force acts at all.`,
            `Nichts drückt ${N.acc} nach aussen. Auf dem Kreis hat ${K.held(N)}; nach P wirkt gar keine horizontale Kraft.`)),
        o(T('A force toward the centre that slowly fades away.', 'Eine Kraft zum Zentrum hin, die langsam abklingt.'), 'circular-impetus',
          T(`${holder} can only pull or push while ${K.touch}. ${noSide}`, `${holder} kann nur ziehen oder drücken, solange ${K.touch}. ${noSide}`)),
      ]),
    ];

    const FN = F('N'), FT = F('T'), Ff = F('f');
    const inward = K.inward(FN, FT, Ff);
    const steps = [
      { title: T('In the circle', 'Auf dem Kreis'), figure: figure({ inward: true }),
        text: T(`While the ${obj} goes round, ${inward}. This sideways force keeps bending ${its} path. Without it, the ${obj} would go straight on.`,
          `Solange ${N.nom} im Kreis ${K.goes || 'läuft'}, ${inward}. Diese seitliche Kraft krümmt die Bahn ständig. Ohne sie würde ${N.nom} geradeaus weiterlaufen.`) },
      { title: T('After P', 'Nach P'), figure: figure({ tangent: true }),
        text: T(`${noSide} No horizontal force acts (${vert}). First law${K.above ? ', for the horizontal motion' : ''}: the ${obj} moves in a straight line at constant speed${K.above ? ' as seen from above' : ''}, with the velocity ${it} had at P — along the tangent.`,
          `${noSide} Keine horizontale Kraft wirkt (${vert}). Erstes Newtonsches Gesetz${K.above ? ' für die horizontale Bewegung' : ''}: ${cap(N.nom)} bewegt sich${K.above ? ' von oben gesehen' : ''} geradlinig mit konstanter Geschwindigkeit, mit der Geschwindigkeit aus P — entlang der Tangente.`) },
      { title: T('Neither curved nor outward', 'Weder gekrümmt noch nach aussen'), figure: figure({ tangent: true, compare: true }),
        text: T(`To keep curving (dashed arc) ${it} would need a force toward the centre. To fly outward (dashed line) ${it} would need a force pointing outward. Neither exists after P: there is no “centrifugal force” that pushes ${him} out.`,
          `Um weiter im Bogen zu laufen (gestrichelter Bogen), bräuchte ${N.nom} eine Kraft zum Zentrum. Um nach aussen zu fliegen (gestrichelte Linie), bräuchte ${N.er} eine Kraft nach aussen. Nach P gibt es keine von beiden: Es gibt keine „Zentrifugalkraft“, die ${N.ihn} hinausdrückt.`) },
    ];

    const sense = s > 0 ? T('clockwise', 'im Uhrzeigersinn') : T('counterclockwise', 'im Gegenuhrzeigersinn');
    return {
      title: K.title,
      situation: `<p>${K.text(sense)}</p>`,
      figure: figure(),
      questions,
      hints: [
        T(`On the circle, ${inward}. Now look at the ${obj} after ${it} ${K.release} at P: which horizontal forces are left, and which way does the velocity arrow at P point?`,
          `Auf dem Kreis ${inward}. Betrachte nun ${N.acc}, nachdem ${N.er} in P ${K.release}: Welche horizontalen Kräfte bleiben übrig, und wohin zeigt der Geschwindigkeitspfeil in P?`),
        T(`Plan: list the horizontal forces on the ${obj} after P, then apply the first law${K.above ? ' to the motion seen from above' : ''}, starting from the velocity ${it} has at P.`,
          `Plan: Zähle die horizontalen Kräfte auf ${N.acc} nach P auf und wende dann das erste Newtonsche Gesetz${K.above ? ' auf die Bewegung von oben gesehen' : ''} an, ausgehend von der Geschwindigkeit in P.`),
        T(`First law: if the horizontal net force on the ${obj} is zero, its velocity from P stays the same in size and direction; only a force toward the inside could bend the path. (${cap(vert)}.)`,
          `Erstes Newtonsches Gesetz: Ist die horizontale resultierende Kraft auf ${N.acc} null, bleibt die Geschwindigkeit aus P nach Betrag und Richtung gleich; nur eine Kraft zur Innenseite könnte die Bahn krümmen. (${cap(vert)}.)`),
        T(`Here, after P, ${K.hint}. Which velocity does the ${obj} have at P, and which way does it point?`,
          `Hier ${K.hint}. Welche Geschwindigkeit hat ${N.nom} in P, und wohin zeigt sie?`),
      ],
      steps,
    };
  }

  // ================================================================ engine: on, then off
  // The body: a probe or an astronaut in space, a glider on an air track or a fan cart on a level
  // track. start: at rest, drifting at v0 (the force along the motion), or drifting and braked (the
  // force against the motion, too short to stop it).
  function engines() {
    return {
      probe: { name: 'probe', N: noun('f', 'Sonde'), gen: 'der Sonde', E: noun('n', 'Triebwerk'), Egen: 'des Triebwerks', eng: 'engine', space: true,
        title: T('Engine on, engine off', 'Triebwerk an, Triebwerk aus'),
        noFriction: T('In space nothing slows the probe down', 'Im Weltraum bremst nichts die Sonde'),
        who: (st) => T(`A space probe far from any planet ${st}`, `Eine Raumsonde weit weg von jedem Planeten ${st}`),
        what: T('its engine', 'ihr Triebwerk'), on: T('engine on', 'Triebwerk an') },
      glider: { name: 'glider', N: noun('m', 'Gleiter'), gen: 'des Gleiters', E: noun('m', 'Propeller'), Egen: 'des Propellers', eng: 'fan',
        title: T('A glider with a fan', 'Ein Gleiter mit Propeller'),
        noFriction: T('On the air track nothing slows the glider down (friction is negligible)', 'Auf der Luftkissenbahn bremst nichts den Gleiter (Reibung vernachlässigbar)'),
        who: (st) => T(`A glider on an air track (friction is negligible) ${st}`, `Ein Gleiter auf einer Luftkissenbahn (Reibung vernachlässigbar) ${st}`),
        what: T('a fan on the glider', 'ein Propeller auf dem Gleiter'), on: T('fan on', 'Propeller an') },
      astronaut: { name: 'astronaut', N: noun('f', 'Astronautin'), gen: 'der Astronautin', E: noun('m', 'Düsenrucksack'), Egen: 'des Düsenrucksacks', eng: 'jet pack', space: true,
        title: T('Jet pack on, jet pack off', 'Düsenrucksack an, Düsenrucksack aus'),
        noFriction: T('In space nothing slows the astronaut down', 'Im Weltraum bremst nichts die Astronautin'),
        who: (st) => T(`An astronaut in her spacesuit, far from any planet, ${st}`, `Eine Astronautin im Raumanzug, weit weg von jedem Planeten, ${st}`),
        what: T('her jet pack', 'ihr Düsenrucksack'), on: T('jet pack on', 'Düsenrucksack an') },
      cart: { name: 'cart', N: noun('m', 'Wagen'), gen: 'des Wagens', E: noun('m', 'Propeller'), Egen: 'des Propellers', eng: 'fan',
        title: T('A cart with a fan', 'Ein Wagen mit Propeller'),
        noFriction: T('On the level track nothing slows the cart down (friction is negligible)', 'Auf der ebenen Schiene bremst nichts den Wagen (Reibung vernachlässigbar)'),
        who: (st) => T(`A fan cart on a long, level track (friction is negligible) ${st}`, `Ein Propellerwagen auf einer langen, ebenen Schiene (Reibung vernachlässigbar) ${st}`),
        what: T('the fan on the cart', 'der Propeller auf dem Wagen'), on: T('fan on', 'Propeller an') },
    };
  }

  function engine(r, p) {
    const obj = p.obj || r.pick(['probe', 'glider', 'astronaut', 'cart']);
    const start = p.start || r.pick(['rest', 'drift', 'brake']);
    const B = engines()[obj], name = B.name, N = B.N, E = B.E, eng = B.eng;
    const rest = start === 'rest', brake = start === 'brake';
    const t1 = '<i>t</i><sub>1</sub>', t2 = '<i>t</i><sub>2</sub>';
    const she = N.g === 'f' && obj === 'astronaut', it = she ? 'she' : 'it', its = she ? 'her' : 'its', him = she ? 'her' : 'it';

    // ---------------------------------------------------------- figure
    function figure() {
      let g = '';
      const y = 64, dir = brake ? -1 : 1; // the force: right, or left (braking)
      if (obj === 'probe') {
        g += D.rect(0, 0, 380, 150, 'space', 6) + D.probe(150, y, [1, 0], brake ? null : [1, 0]);
        if (brake) g += `<polygon class="flame" points="168,${y - 5} 188,${y} 168,${y + 5}"/>`;
      } else if (obj === 'astronaut') {
        g += D.rect(0, 0, 380, 150, 'space', 6);
        // seen from the side, facing right; the jet pack on her back (nozzles to the back, or forward when braking)
        g += D.rect(128, y - 22, 12, 30, 'solid', 2) + D.person(150, y + 30, 64, 1, 'hold');
        g += brake ? `<polygon class="flame" points="141,${y + 3} 160,${y + 8} 141,${y + 13}"/>` : `<polygon class="flame" points="128,${y - 4} 108,${y + 1} 128,${y + 6}"/>`;
      } else if (obj === 'glider') {
        g += D.rect(20, y + 16, 340, 10, 'solid', 2) + D.rect(128, y - 12, 50, 28, 'obj', 3) + D.rect(146, y - 26, 4, 14, 'solid', 1) + `<ellipse class="fan" cx="148" cy="${y - 28}" rx="3" ry="11"/>`;
      } else {
        g += D.ground(20, 360, y + 26) + D.rect(126, y - 6, 54, 22, 'obj', 3) + D.ball(138, y + 20, 6, 'wheel') + D.ball(168, y + 20, 6, 'wheel');
        g += D.rect(150, y - 22, 4, 16, 'solid', 1) + `<ellipse class="fan" cx="152" cy="${y - 24}" rx="3" ry="11"/>`;
      }
      const fx = obj === 'probe' || obj === 'astronaut' ? (brake ? 132 : 168) : brake ? 124 : 182;
      g += D.arrow(fx, y, fx + dir * 58, y, 'f', 'F', {});
      if (!rest) {
        const vy = obj === 'probe' ? y - 30 : obj === 'astronaut' ? y - 46 : y - 26;
        const vx = obj === 'probe' ? 132 : obj === 'astronaut' ? 162 : 190;
        g += D.arrow(vx, vy, vx + 44, vy, 'v', 'v_0');
      }
      const ty = 128;
      g += D.line(30, ty, 350, ty, 'gline') + D.rect(130, ty - 4, 120, 8, 'on', 2);
      g += D.text(130, ty - 9, 't_1', 'lbl small') + D.text(250, ty - 9, 't_2', 'lbl small') + D.words(190, ty + 18, B.on);
      return D.svg(380, 150, g, T(`The ${name} with ${its} ${eng} running from t1 to t2`, `${cap(N.nom)}; ${E.nom} läuft von t1 bis t2`));
    }

    // v–t graphs: shapes as paths in a small frame (origin 20/92), t1 at 56, t2 at 100. hi and
    // lo: the speeds at t1 and t2 (small y: fast).
    const [y0, y2] = brake ? [40, 74] : [rest ? 92 : 74, 34];
    const SHAPES = brake ? {
      ok: `M20 ${y0} H56 L100 ${y2} H146`,
      fade: `M20 ${y0} H56 L100 ${y2} L132 92 H146`,
      drop: `M20 ${y0} H56 L100 ${y2} V92 H146`,
      step: `M20 ${y0} H56 V${y2 - 10} H100 V${y0} H146`,
      level: `M20 ${y0} H56 Q66 ${y2} 80 ${y2} H146`,
    } : {
      ok: `M20 ${y0} H56 L100 ${y2} H146`,
      fade: `M20 ${y0} H56 L100 ${y2} L146 ${y0}`,
      drop: `M20 ${y0} H56 L100 ${y2} V${y0} H146`,
      step: `M20 ${y0} H56 V${y2 + 10} H100 V${y0} H146`,
      level: `M20 ${y0} H56 Q66 ${y2} 80 ${y2} H146`,
    };
    const vt = T('speed against time', 'Geschwindigkeit gegen Zeit');
    const graph = (d) => {
      let g = D.axes(20, 92, 132, 84, 't', 'v') + D.line(56, 92, 56, 95, 'ln') + D.line(100, 92, 100, 95, 'ln');
      g += D.text(56, 106, 't_1', 'lbl small') + D.text(100, 106, 't_2', 'lbl small') + D.path(d, 'opt-path');
      return D.svg(160, 112, g, vt);
    };
    const bigGraph = (stage) => {
      const X = (x) => 30 + (x - 20) * 2.1, Y = (y) => 24 + (y - 10) * 1.85;
      let g = D.axes(X(20), Y(92), 290, 160, 't', 'v') + D.text(X(56), Y(92) + 18, 't_1', 'lbl small') + D.text(X(100), Y(92) + 18, 't_2', 'lbl small');
      g += D.line(X(56), Y(92), X(56), Y(Math.min(y0, y2)), 'guide faint') + D.line(X(100), Y(92), X(100), Y(Math.min(y0, y2)), 'guide faint');
      const segs = [[[20, y0], [56, y0]], [[56, y0], [100, y2]], [[100, y2], [146, y2]]];
      segs.forEach((sg, i) => { if (i <= stage) g += D.poly(sg.map(([x, y]) => [X(x), Y(y)]), i === stage ? 'opt-path' : 'trace strong'); });
      if (!rest) g += D.text(X(20) - 6, Y(y0) + 4, 'v_0', 'lbl small', 'end');
      return D.svg(360, 200, g, vt);
    };

    const noFriction = B.noFriction;
    const lower = noFriction.charAt(0).toLowerCase() + noFriction.slice(1);
    const graphQ = brake ? [
      o(graph(SHAPES.ok), 'ok', T(`Right: while the ${eng} runs, the constant force against the motion gives a constant deceleration, so the speed falls steadily. After ${t2}, no force acts and the speed stays the same.`,
        `Richtig: Solange ${E.nom} läuft, bewirkt die konstante Kraft gegen die Bewegung eine konstante Verzögerung, also sinkt die Geschwindigkeit gleichmässig. Nach ${t2} wirkt keine Kraft, und die Geschwindigkeit bleibt gleich.`),
        T('falls steadily from t₁ to t₂, then stays constant', 'sinkt von t₁ bis t₂ gleichmässig, bleibt dann konstant')),
      o(graph(SHAPES.fade), 'active-force', T(`${noFriction}: after ${t2} no force acts, so the speed does not change. The ${name} does not need a force to keep moving, so ${it} does not run down to a stop.`,
        `${noFriction}: Nach ${t2} wirkt keine Kraft, also ändert sich die Geschwindigkeit nicht. ${cap(N.nom)} braucht keine Kraft, um sich weiterzubewegen, und kommt deshalb nicht zum Stehen.`),
        T('falls, then keeps falling until it stops', 'sinkt, sinkt dann weiter, bis sie null ist')),
      o(graph(SHAPES.drop), 'active-force', T(`Switching off the ${eng} does not stop the ${name}: no force acts after ${t2}, so ${it} keeps the speed ${it} has at ${t2}.`,
        `Das Abschalten ${B.Egen} hält ${N.acc} nicht an: Nach ${t2} wirkt keine Kraft, also behält ${N.er} die Geschwindigkeit, die ${N.er} bei ${t2} hat.`),
        T('falls, then drops to zero at t₂', 'sinkt, fällt dann bei t₂ auf null')),
      o(graph(SHAPES.step), 'active-force', T(`A force does not set a speed, it changes the speed: a constant force against the motion gives a steadily falling speed, not a jump. And after ${t2} nothing brings the old speed back.`,
        `Eine Kraft legt keine Geschwindigkeit fest, sie ändert die Geschwindigkeit: Eine konstante Kraft gegen die Bewegung ergibt eine gleichmässig sinkende Geschwindigkeit, keinen Sprung. Und nach ${t2} bringt nichts die alte Geschwindigkeit zurück.`),
        T('jumps down at t₁ and back up at t₂', 'springt bei t₁ hinunter und bei t₂ zurück')),
      o(graph(SHAPES.level), 'active-force', T(`As long as the force acts, the speed keeps falling at the same rate: <i>a</i> = <i>F</i>/<i>m</i> stays the same. ${noFriction}, so nothing balances the force.`,
        `Solange die Kraft wirkt, sinkt die Geschwindigkeit gleich schnell weiter: <i>a</i> = <i>F</i>/<i>m</i> bleibt gleich. ${noFriction}, also hebt nichts die Kraft auf.`),
        T('falls and levels off while the brake force still acts', 'sinkt und flacht ab, während die Bremskraft noch wirkt')),
    ] : [
      o(graph(SHAPES.ok), 'ok', T(`Right: while the ${eng} runs, the constant force gives a constant acceleration, so the speed rises steadily. After ${t2}, no force acts and the speed stays the same.`,
        `Richtig: Solange ${E.nom} läuft, bewirkt die konstante Kraft eine konstante Beschleunigung, also steigt die Geschwindigkeit gleichmässig. Nach ${t2} wirkt keine Kraft, und die Geschwindigkeit bleibt gleich.`),
        T('rises steadily from t₁ to t₂, then stays constant', 'steigt von t₁ bis t₂ gleichmässig, bleibt dann konstant')),
      o(graph(SHAPES.fade), 'impetus', T(`${noFriction}: there is no force after ${t2}, so the speed does not change. The push is not stored up and used up.`,
        `${noFriction}: Nach ${t2} wirkt keine Kraft, also ändert sich die Geschwindigkeit nicht. Der Schub wird nicht gespeichert und aufgebraucht.`),
        T('rises, then slowly falls again', 'steigt, fällt dann langsam wieder')),
      o(graph(SHAPES.drop), 'active-force', T(`The ${name} does not need a force to keep moving. After ${t2}, no force acts, so ${its} speed stays what it was at ${t2}.`,
        `${cap(N.nom)} braucht keine Kraft, um sich weiterzubewegen. Nach ${t2} wirkt keine Kraft, also bleibt die Geschwindigkeit so, wie sie bei ${t2} war.`),
        T('rises, then drops back at once', 'steigt, fällt dann sofort zurück')),
      o(graph(SHAPES.step), 'active-force', T(`A force does not set a speed, it changes the speed: a constant force gives a steadily rising speed, not a jump to a fixed value.`,
        `Eine Kraft legt keine Geschwindigkeit fest, sie ändert die Geschwindigkeit: Eine konstante Kraft ergibt eine gleichmässig steigende Geschwindigkeit, keinen Sprung auf einen festen Wert.`),
        T('jumps up at t₁ and back down at t₂', 'springt bei t₁ hoch und bei t₂ zurück')),
      o(graph(SHAPES.level), 'active-force', T(`As long as the force acts, the speed keeps rising at the same rate: <i>a</i> = <i>F</i>/<i>m</i> stays the same. ${noFriction}, so nothing balances the force.`,
        `Solange die Kraft wirkt, steigt die Geschwindigkeit gleich schnell weiter: <i>a</i> = <i>F</i>/<i>m</i> bleibt gleich. ${noFriction}, also hebt nichts die Kraft auf.`),
        T(`rises and levels off while the ${eng} still runs`, 'steigt und flacht ab, während der Antrieb noch läuft')),
    ];
    const questions = [
      q(r, 'graph', T(`Which graph shows the speed of the ${name} against time?`, `Welcher Graph zeigt die Geschwindigkeit ${B.gen} in Abhängigkeit von der Zeit?`), graphQ, true),
      q(r, 'after', T(`What does it take to keep the ${name} moving at constant speed after ${t2}?`, `Was braucht es, damit sich ${N.nom} nach ${t2} mit konstanter Geschwindigkeit weiterbewegt?`), [
        o(T('Nothing: no force is needed.', 'Nichts: Es braucht keine Kraft.'), 'ok', T(`Right: ${lower}, so without any force ${it} keeps ${its} velocity (first law).`, `Richtig: ${lower}, also behält ${N.nom} ohne jede Kraft ${poss(N)} Geschwindigkeit (erstes Newtonsches Gesetz).`)),
        o(T(`A force as large as the ${eng}'s force.`, `Eine Kraft so gross wie die ${B.Egen}.`), 'active-force',
          T(`That force would keep ${brake ? `slowing the ${name} down` : `speeding the ${name} up`}. To move at constant speed, the net force must be zero.`, `Diese Kraft würde ${N.acc} weiter ${brake ? 'abbremsen' : 'beschleunigen'}. Für konstante Geschwindigkeit muss die resultierende Kraft null sein.`)),
        o(T('A smaller force, to make up for the push that wears off.', 'Eine kleinere Kraft, die den nachlassenden Schwung ausgleicht.'), 'impetus',
          T(`There is no push that wears off. ${noFriction}: with no force at all, the speed stays constant.`, `Es gibt keinen Schwung, der nachlässt. ${noFriction}: Ganz ohne Kraft bleibt die Geschwindigkeit konstant.`)),
      ]),
    ];

    const steps = [
      { title: T('Before t₁', 'Vor t₁'), figure: bigGraph(0),
        text: T(`${noFriction}, and no other force acts: the ${name} ${rest ? 'stays at rest' : `keeps ${its} speed <i>v</i><sub>0</sub>`} (first law).`,
          `${noFriction}, und keine andere Kraft wirkt: ${cap(N.nom)} ${rest ? 'bleibt in Ruhe' : `behält ${poss(N)} Geschwindigkeit <i>v</i><sub>0</sub>`} (erstes Newtonsches Gesetz).`) },
      { title: T('From t₁ to t₂', 'Von t₁ bis t₂'), figure: bigGraph(1),
        text: brake
          ? T(`The ${eng} pushes with a constant force <i>F</i> against the direction of motion. Second law: constant acceleration <i>a</i> = <i>F</i>/<i>m</i>, backward, so the speed falls at a steady rate: a straight falling line. The ${eng} is switched off before the ${name} stops.`,
            `${cap(E.nom)} übt eine konstante Kraft <i>F</i> gegen die Bewegungsrichtung aus. Zweites Newtonsches Gesetz: konstante Beschleunigung <i>a</i> = <i>F</i>/<i>m</i>, nach hinten, also sinkt die Geschwindigkeit gleichmässig: eine fallende Gerade. ${cap(E.nom)} wird abgeschaltet, bevor ${N.nom} stillsteht.`)
          : T(`The ${eng} pushes with a constant force <i>F</i> in the direction of motion. Second law: constant acceleration <i>a</i> = <i>F</i>/<i>m</i>, so the speed rises at a steady rate: a straight rising line.`,
            `${cap(E.nom)} übt eine konstante Kraft <i>F</i> in Bewegungsrichtung aus. Zweites Newtonsches Gesetz: konstante Beschleunigung <i>a</i> = <i>F</i>/<i>m</i>, also steigt die Geschwindigkeit gleichmässig: eine steigende Gerade.`) },
      { title: T('After t₂', 'Nach t₂'), figure: bigGraph(2),
        text: T(`No force acts any more. First law: the ${name} keeps the speed ${it} has at ${t2}, for ever — a horizontal line. ${cap(it)} ${brake ? 'does not slow down further and does not stop' : 'does not slow down'}: there is nothing that would slow ${him} down.`,
          `Es wirkt keine Kraft mehr. Erstes Newtonsches Gesetz: ${cap(N.nom)} behält die Geschwindigkeit, die ${N.er} bei ${t2} hat, für immer — eine horizontale Linie. ${cap(N.er)} wird nicht ${brake ? 'weiter langsamer und bleibt nicht stehen' : 'langsamer'}: Es gibt nichts, was ${N.ihn} bremsen würde.`) },
    ];

    const state = rest ? T('is at rest', 'ist in Ruhe') : obj === 'probe' || obj === 'astronaut' ? T('drifts at speed <i>v</i><sub>0</sub>', 'treibt mit der Geschwindigkeit <i>v</i><sub>0</sub>') : T('moves at speed <i>v</i><sub>0</sub>', 'bewegt sich mit der Geschwindigkeit <i>v</i><sub>0</sub>');
    const pron = him;
    const pushes = brake
      ? T(`From the time ${t1} to ${t2} ${B.what} brakes ${pron}: it pushes ${pron} with a constant force against the direction of motion`,
        `Vom Zeitpunkt ${t1} bis ${t2} bremst ${B.what} ${N.ihn} mit einer konstanten Kraft, die gegen die Bewegungsrichtung zeigt`)
      : T(`From the time ${t1} to ${t2} ${B.what} pushes ${pron} with a constant force in the direction of ${rest ? 'the arrow' : 'motion'}`,
        `Vom Zeitpunkt ${t1} bis ${t2} übt ${B.what} eine konstante Kraft in ${rest ? 'Pfeilrichtung' : 'Bewegungsrichtung'} auf ${N.ihn} aus`);
    const off = T(`; then the ${eng} is switched off${brake ? `, while the ${name} is still moving forward` : ''}.`, `; danach wird ${E.nom} abgeschaltet${brake ? `, während ${N.nom} sich noch vorwärts bewegt` : ''}.`);
    return {
      title: brake ? T(`Braking with the ${eng}`, `Bremsen mit ${E.dat}`) : B.title,
      situation: `<p>${B.who(state)}. ${pushes}${off}</p>`,
      figure: figure(),
      questions,
      hints: [
        T(`Until ${t1} the ${name} ${state}; from ${t1} to ${t2} the ${eng} ${brake ? 'brakes' : 'pushes'} ${him}; after ${t2} it is off. Which force acts on the ${name} in each of these three parts?`,
          `${cap(N.nom)} ${state} bis ${t1}; von ${t1} bis ${t2} ${brake ? 'bremst' : 'schiebt'} ${E.nom} ${N.ihn}${brake ? '' : ' an'}; nach ${t2} ist ${E.nom} aus. Welche Kraft wirkt in jedem der drei Abschnitte auf ${N.acc}?`),
        T(`Plan: for each of the three parts, the force → the acceleration of the ${name} (zero or constant) → the shape of the speed graph there (horizontal, a straight sloping line, or a curve). Then join the parts at ${t1} and ${t2}.`,
          `Plan: Für jeden der drei Abschnitte die Kraft → die Beschleunigung ${B.gen} (null oder konstant) → die Form des Geschwindigkeitsgraphen dort (horizontal, eine schräge Gerade oder eine Kurve). Verbinde dann die Abschnitte bei ${t1} und ${t2}.`),
        T(`First law: no force → constant velocity. Second law: <i>a</i> = <i>F</i>/<i>m</i>; a constant force gives a constant acceleration, a speed that ${brake ? 'falls' : 'rises'} steadily${brake ? ' when the force points against the motion' : ''}.`,
          `Erstes Gesetz: keine Kraft → konstante Geschwindigkeit. Zweites Gesetz: <i>a</i> = <i>F</i>/<i>m</i>; eine konstante Kraft ergibt eine konstante Beschleunigung, eine Geschwindigkeit, die gleichmässig ${brake ? 'sinkt, wenn die Kraft gegen die Bewegung zeigt' : 'steigt'}.`),
        T(`Here, ${lower}. So between ${t1} and ${t2} the speed ${brake ? 'falls' : 'rises'} steadily — and what happens to it once the force is gone?`,
          `Hier gilt: ${lower}. Zwischen ${t1} und ${t2} ${brake ? 'sinkt' : 'steigt'} die Geschwindigkeit also gleichmässig — und was passiert mit ihr, wenn die Kraft weg ist?`),
      ],
      steps,
    };
  }

  register('inertia', 'kick', kick);
  register('inertia', 'circle', circle);
  register('inertia', 'engine', engine);
})(typeof window !== 'undefined' ? window : globalThis);
