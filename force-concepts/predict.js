// Predict and explain: a prediction and the reason behind it, both chosen from options. A right
// prediction with a wrong reason counts as wrong, and the feedback says so. A ball shot straight
// up from a moving cart, a pendulum whose string is cut, and the net force on a ball rolling up
// and down a ramp.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, FL, cap, o, two, register } = FC;
  const RIGHT = () => T('Right.', 'Richtig.');

  // ================================================================ cart with a ball launcher
  // A ball shot straight up from a cart, a ball thrown straight up by a skateboarder, a wrench
  // dropped from the top of a ship's mast; the carrier keeps its speed, speeds up or slows down.
  const carriers = () => ({ // a function: the texts in the current language
    cart: { name: 'cart', C: FC.noun('m', 'Wagen'), gen: 'des Wagens', body: 'ball', B: FC.noun('m', 'Ball'), bgen: 'des Balls', up: true, her: 'its',
      release: T('launch', 'Abschuss'), at: T('at launch', 'beim Abschuss'), left: T('the cart', 'den Wagen'),
      title: T('Ball from a moving cart', 'Ball vom fahrenden Wagen'),
      in: T('Back into the launcher.', 'Zurück in den Werfer.'), behind: T('Behind the launcher.', 'Hinter dem Werfer.'), front: T('In front of the launcher.', 'Vor dem Werfer.'),
      landsIn: T('the ball drops back into the launcher', 'Der Ball fällt zurück in den Werfer'),
      lands: { behind: T('behind the launcher', 'hinter dem Werfer'), front: T('in front of the launcher', 'vor dem Werfer') },
      situation: (ph) => T(`<p>A cart rolls along a level track. A launcher on the cart shoots a ball straight up (as seen from the cart). ${{ constant: 'The cart rolls on at constant speed (friction negligible).', speeding: 'While the ball is in the air, a constant force speeds the cart up.', slowing: 'Right after the launch, the cart brakes gently.' }[ph]} Air resistance is negligible.</p>`,
        `<p>Ein Wagen rollt auf einer ebenen Schiene. Ein Werfer auf dem Wagen schiesst einen Ball senkrecht nach oben (vom Wagen aus gesehen). ${{ constant: 'Der Wagen rollt mit konstanter Geschwindigkeit weiter (Reibung vernachlässigbar).', speeding: 'Während der Ball in der Luft ist, beschleunigt eine konstante Kraft den Wagen weiter.', slowing: 'Direkt nach dem Abschuss bremst der Wagen sanft.' }[ph]} Der Luftwiderstand ist vernachlässigbar.</p>`) },
    skater: { name: 'skater', C: FC.noun('f', 'Skaterin'), gen: 'der Skaterin', body: 'ball', B: FC.noun('m', 'Ball'), bgen: 'des Balls', up: true, her: 'her',
      release: T('the throw', 'Wurf'), at: T('at the throw', 'beim Wurf'), left: T('her hand', 'ihre Hand'),
      title: T('Catch on the skateboard', 'Fangen auf dem Skateboard'),
      in: T('Back into her hand.', 'Zurück in ihre Hand.'), behind: T('Behind her.', 'Hinter ihr.'), front: T('In front of her.', 'Vor ihr.'),
      landsIn: T('the ball drops back into her hand', 'Der Ball fällt zurück in ihre Hand'),
      lands: { behind: T('behind her', 'hinter ihr'), front: T('in front of her', 'vor ihr') },
      situation: (ph) => T(`<p>A skateboarder rolls along level ground. She throws a ball straight up (as she sees it) and wants to catch it again. ${{ constant: 'She rolls on at constant speed (friction negligible).', speeding: 'While the ball is in the air, a friend pulls her forward on a rope, so she gets faster and faster.', slowing: 'Right after the throw, she brakes gently with one foot.' }[ph]} Air resistance is negligible.</p>`,
        `<p>Eine Skaterin rollt auf ebenem Boden. Sie wirft einen Ball senkrecht nach oben (aus ihrer Sicht) und will ihn wieder fangen. ${{ constant: 'Sie rollt mit konstanter Geschwindigkeit weiter (Reibung vernachlässigbar).', speeding: 'Während der Ball in der Luft ist, zieht eine Freundin sie an einem Seil vorwärts, sodass sie immer schneller wird.', slowing: 'Direkt nach dem Wurf bremst sie sanft mit einem Fuss.' }[ph]} Der Luftwiderstand ist vernachlässigbar.</p>`) },
    ship: { name: 'ship', C: FC.noun('n', 'Schiff'), gen: 'des Schiffs', body: 'wrench', B: FC.noun('m', 'Schraubenschlüssel'), bgen: 'des Schraubenschlüssels', up: false, her: 'its',
      release: T('the moment it is let go', 'Loslassen'), at: T('when it was let go', 'beim Loslassen'), left: T('the sailor’s hand', 'die Hand des Matrosen'),
      title: T('From the top of the mast', 'Vom Mast'),
      in: T('At the foot of the mast.', 'Am Fuss des Masts.'), behind: T('Behind the mast (toward the stern).', 'Hinter dem Mast (Richtung Heck).'), front: T('In front of the mast (toward the bow).', 'Vor dem Mast (Richtung Bug).'),
      landsIn: T('the wrench lands at the foot of the mast', 'Der Schraubenschlüssel landet am Fuss des Masts'),
      lands: { behind: T('behind the mast', 'hinter dem Mast'), front: T('in front of the mast', 'vor dem Mast') },
      situation: (ph) => T(`<p>A ship moves on calm water. A sailor at the top of the mast lets a wrench drop. ${{ constant: 'The ship keeps a constant speed.', speeding: 'While the wrench falls, the ship gets faster.', slowing: 'While the wrench falls, the ship gets slower.' }[ph]} Air resistance is negligible.</p>`,
        `<p>Ein Schiff fährt auf ruhigem Wasser. Ein Matrose oben am Mast lässt einen Schraubenschlüssel fallen. ${{ constant: 'Das Schiff fährt mit konstanter Geschwindigkeit weiter.', speeding: 'Während der Schraubenschlüssel fällt, wird das Schiff schneller.', slowing: 'Während der Schraubenschlüssel fällt, wird das Schiff langsamer.' }[ph]} Der Luftwiderstand ist vernachlässigbar.</p>`) },
  });

  function cartLauncher(r, p) {
    const phase = p.phase || r.pick(['constant', 'speeding', 'slowing']);
    const K = carriers()[p.carrier || r.pick(['cart', 'skater', 'ship'])], { C, B, name, body } = K;
    const c = { constant: 0, speeding: 0.3, slowing: -0.3 }[phase]; // extra carrier travel, as a fraction
    const right = { constant: 'in', speeding: 'behind', slowing: 'front' }[phase];
    const poss = C.g === 'f' ? 'ihre' : 'seine', rel = { m: 'der', f: 'die', n: 'das' }[C.g];

    // ---------------------------------------------------------- figure
    const yT = 170, x0 = name === 'ship' ? 80 : 70, W = name === 'ship' ? 220 : 230;
    // the carrier at x, and where the body starts relative to it
    const draw = {
      cart: (x) => D.rect(x - 34, yT - 30, 68, 22, 'obj', 3) + D.ball(x - 20, yT - 6, 6, 'wheel') + D.ball(x + 20, yT - 6, 6, 'wheel') + D.rect(x - 5, yT - 50, 10, 20, 'solid', 1),
      skater: (x) => D.person(x, yT - 12, 92, 1, 'hold') + D.rect(x - 24, yT - 13, 48, 4, 'solid', 2) + D.ball(x - 15, yT - 5, 4, 'wheel') + D.ball(x + 15, yT - 5, 4, 'wheel'),
      ship: (x) => `<polygon class="obj" points="${[[x - 50, yT - 26], [x + 50, yT - 26], [x + 38, yT + 2], [x - 40, yT + 2]].map((q) => q.join(',')).join(' ')}"/>` + D.rect(x - 3, yT - 156, 6, 130, 'solid', 0),
    }[name];
    const dx = { cart: 0, skater: 28, ship: 10 }[name], y0 = { cart: yT - 58, skater: yT - 76, ship: yT - 146 }[name], yEnd = { cart: yT - 58, skater: yT - 76, ship: yT - 32 }[name];
    const bodyAt = (x, y) => (name === 'ship' ? D.rect(x - 7, y - 2.5, 14, 5, 'obj', 1) : D.ball(x, y, 7));
    const yAt = (u) => (K.up ? y0 - 150 * u * (1 - u) : y0 + (yEnd - y0) * u * u);
    const carrier = (x, ghost) => (ghost ? D.ghost(draw(x)) : draw(x));
    function figure(o = {}) {
      let g = D.line(0, yT, 420, yT, 'gline');
      if (o.strobe) {
        const us = [0, 0.25, 0.5, 0.75, 1];
        g += D.poly(Array.from({ length: 21 }, (z, j) => { const u = j / 20; return [x0 + dx + W * u, yAt(u)]; }), 'trace');
        us.forEach((u, k) => {
          const xb = x0 + dx + W * u, yb = yAt(u), xc = x0 + W * (u + c * u * u);
          g += carrier(xc, k < us.length - 1);
          g += k === us.length - 1 ? bodyAt(xb, yb) : D.ghost(bodyAt(xb, yb));
        });
        const land = x0 + dx + W, cl = x0 + dx + W * (1 + c);
        if (Math.abs(land - cl) > 1) g += D.line(land, yT + 8, cl, yT + 8, 'guide') + D.text((land + cl) / 2, yT + 22, T('gap', 'Abstand'), 'txt');
        return D.svg(420, 200, g, T(`The ${body} and the ${name} at equal time intervals`, `${cap(B.word)} und ${C.word} in gleichen Zeitabständen`));
      }
      g += carrier(x0) + bodyAt(x0 + dx, y0) + D.arrow(x0 + 52, yT - 18, x0 + 102, yT - 18, 'v', 'v');
      if (K.up) g += D.arrow(x0 + dx + 14, y0, x0 + dx + 14, y0 - 42, 'v', T(name === 'cart' ? 'launch' : 'throw', name === 'cart' ? 'Abschuss' : 'Wurf'), { cls: 'alt', at: [x0 + dx + 20, y0 - 34], anchor: 'start' });
      if (phase === 'speeding') g += name === 'ship' ? D.arrow(x0 - 40, yT - 12, x0 + 4, yT - 12, 'f', 'F') : D.arrow(x0 - 80, yT - 20, x0 - 36, yT - 20, 'f', 'F');
      if (phase === 'slowing') g += D.words(x0, yT + 22, T('braking', 'bremst'));
      return D.svg(420, 200, g, T(`A ${name} and a ${body}`, `${cap(C.ein)} und ${B.ein}`));
    }

    // ---------------------------------------------------------- the two tiers
    const cartDoes = { constant: T(`keeps ${K.her} speed`, `behält ${poss} Geschwindigkeit`), speeding: T('gets faster', 'wird schneller'), slowing: T('gets slower', 'wird langsamer') }[phase];
    const deHere = { constant: `behält ${C.nom} ${poss} Geschwindigkeit`, speeding: `wird ${C.nom} schneller`, slowing: `wird ${C.nom} langsamer` }[phase]; // after “Hier”
    const after = T(`After ${K.release} the ${body} keeps the horizontal velocity the ${name} had at that moment: no horizontal force acts on it.`,
      `Nach dem ${K.release} behält ${B.nom} die horizontale Geschwindigkeit, die ${C.nom} in diesem Moment hatte: Horizontal wirkt keine Kraft auf ${B.ihn}.`);
    const whereWhy = T(`${after} The ${name} ${cartDoes}${phase === 'constant' ? ' too' : ''}, so ${phase === 'constant' ? `both stay level horizontally: ${K.landsIn}` : `the ${name} ${phase === 'speeding' ? 'pulls ahead of' : 'falls behind'} the ${body}`}.`,
      `${after} ${cap(C.nom)} ${cartDoes}, also ${phase === 'constant' ? `bleiben beide horizontal gleichauf: ${K.landsIn}` : phase === 'speeding' ? `fährt ${C.nom} ${B.dat} davon` : `bleibt ${C.nom} hinter ${B.dat} zurück`}.`);
    const preds = [
      o(K.in, right === 'in' ? 'ok' : 'other', whereWhy),
      o(K.behind, right === 'behind' ? 'ok' : phase === 'constant' ? 'active-force' : 'other',
        right === 'behind' ? whereWhy : T(`Nothing has to carry the ${body} forward: it keeps its horizontal velocity. ${whereWhy}`, `Nichts muss ${B.acc} vorwärts tragen: ${cap(B.er)} behält seine horizontale Geschwindigkeit. ${whereWhy}`)),
      o(K.front, right === 'front' ? 'ok' : 'other', whereWhy),
    ];
    const R = {
      constant: T(`The ${body} keeps the ${name}’s horizontal velocity, and the ${name} keeps it too.`, `${cap(B.nom)} behält die horizontale Geschwindigkeit ${K.gen}, und ${C.nom} behält sie auch.`),
      speeding: T(`The ${body} keeps the horizontal velocity the ${name} had ${K.at}, while the ${name} gets faster.`, `${cap(B.nom)} behält die horizontale Geschwindigkeit, die ${C.nom} ${K.at} hatte, während ${C.nom} schneller wird.`),
      slowing: T(`The ${body} keeps the horizontal velocity the ${name} had ${K.at}, while the ${name} gets slower.`, `${cap(B.nom)} behält die horizontale Geschwindigkeit, die ${C.nom} ${K.at} hatte, während ${C.nom} langsamer wird.`),
    };
    const reasons = [o(R[phase], 'ok', `${RIGHT()} ${whereWhy}`)];
    const wrongs = [
      ...['constant', 'speeding', 'slowing'].filter((k) => k !== phase).map((k) => o(R[k], 'other', T(`That describes a ${name} that ${({ constant: `keeps ${K.her} speed`, speeding: 'gets faster', slowing: 'gets slower' })[k]}. Here the ${name} ${cartDoes}.`, `Das beschreibt ${C.einen}, ${rel} ${({ constant: `${poss} Geschwindigkeit behält`, speeding: 'schneller wird', slowing: 'langsamer wird' })[k]}. Hier ${deHere}.`))),
      o(T(`Once the ${body} has left ${K.left}, nothing carries it forward any more.`, `Sobald ${B.nom} ${K.left} verlassen hat, trägt ${B.ihn} nichts mehr vorwärts.`), 'active-force', T(`The ${body} does not need anything to carry it forward: it keeps its horizontal velocity (inertia). ${whereWhy}`, `${cap(B.nom)} braucht nichts, das ${B.ihn} vorwärts trägt: ${cap(B.er)} behält seine horizontale Geschwindigkeit (Trägheit). ${whereWhy}`)),
      o(T(`The ${body}’s forward motion slowly wears off in the air.`, `Die Vorwärtsbewegung ${K.bgen} lässt in der Luft langsam nach.`), 'impetus', T(`Nothing slows the ${body} down horizontally (air resistance negligible). ${whereWhy}`, `Horizontal bremst nichts ${B.acc} (Luftwiderstand vernachlässigbar). ${whereWhy}`)),
    ];
    reasons.push(...r.shuffle(wrongs).slice(0, 3));
    const qu = two(r, 'land', T(`Where does the ${body} land?`, `Wo landet ${B.nom}?`), T('Why?', 'Warum?'), preds, reasons);

    const steps = [
      { title: T(`The ${body}`, cap(B.nom)), figure: figure({ strobe: true }),
        text: K.up
          ? T(`At ${K.release} the ball moves forward with the ${name} and gets an extra velocity straight up. In the air only gravity acts (vertically): horizontally the ball keeps the velocity it had ${K.at}.`,
            `Beim ${K.release} bewegt sich der Ball mit ${C.dat} vorwärts und bekommt zusätzlich eine Geschwindigkeit senkrecht nach oben. In der Luft wirkt nur die Schwerkraft (vertikal): Horizontal behält der Ball die Geschwindigkeit, die er ${K.at} hatte.`)
          : T('When it is let go, the wrench moves forward with the ship; it has no vertical velocity yet. In the air only gravity acts (vertically): horizontally the wrench keeps the velocity it had at that moment.',
            'Beim Loslassen bewegt sich der Schraubenschlüssel mit dem Schiff vorwärts; eine vertikale Geschwindigkeit hat er noch nicht. In der Luft wirkt nur die Schwerkraft (vertikal): Horizontal behält der Schraubenschlüssel die Geschwindigkeit, die er in diesem Moment hatte.') },
      { title: T(`The ${name}`, cap(C.nom)), figure: figure({ strobe: true }),
        text: { constant: T(`No net horizontal force acts on the ${name} either: it keeps ${K.her} speed and stays exactly below the ${body}. ${cap(K.landsIn)}.`,
          `Auch auf ${C.acc} wirkt horizontal keine resultierende Kraft: ${cap(C.er)} behält ${poss} Geschwindigkeit und bleibt genau unter ${B.dat}. ${K.landsIn}.`),
        speeding: T(`A force keeps speeding the ${name} up, but it does not act on the ${body} in the air. The ${name} pulls ahead, and the ${body} lands ${K.lands.behind}.`,
          `Eine Kraft beschleunigt ${C.acc} weiter, wirkt aber nicht auf ${B.acc} in der Luft. ${cap(C.nom)} fährt davon, und ${B.nom} landet ${K.lands.behind}.`),
        slowing: T(`A force slows the ${name} down, but not the ${body} in the air. The ${name} falls behind, and the ${body} lands ${K.lands.front}.`,
          `Eine Kraft bremst ${C.acc}, aber nicht ${B.acc} in der Luft. ${cap(C.nom)} bleibt zurück, und ${B.nom} landet ${K.lands.front}.`) }[phase] },
    ];
    return {
      title: K.title,
      situation: K.situation(phase),
      figure: figure(),
      questions: [qu],
      hints: [
        T(`While the ${body} is in the air, the ${name} ${cartDoes}. Treat the two separately: which horizontal force acts on the ${body} once it has left ${K.left}? Which on the ${name}?`, `Während ${B.nom} in der Luft ist, ${deHere}. Betrachte die beiden getrennt: Welche horizontale Kraft wirkt auf ${B.acc}, sobald ${B.er} ${K.left} verlassen hat? Welche auf ${C.acc}?`),
        T(`Plan: ${K.at} the ${body} and the ${name} have the same horizontal velocity. Follow each of the two velocities through the flight, then compare where they are when the ${body} comes down.`, `Plan: ${cap(K.at)} haben ${B.nom} und ${C.nom} dieselbe horizontale Geschwindigkeit. Verfolge jede der beiden Geschwindigkeiten während des Flugs und vergleiche dann, wo die beiden sind, wenn ${B.nom} unten ankommt.`),
        T(`First law for the ${body} in the air: with no horizontal force, its horizontal velocity stays what it was ${K.at}. Does the same hold for the ${name}?`, `Erstes Newtonsches Gesetz für ${B.acc} in der Luft: Ohne horizontale Kraft bleibt ${B.g === 'f' ? 'ihre' : 'seine'} horizontale Geschwindigkeit so, wie sie ${K.at} war. Gilt das auch für ${C.acc}?`),
        T(`Here the ${body} keeps the ${name}’s velocity ${K.at}, and the ${name} ${cartDoes}.`, `Hier behält ${B.nom} die Geschwindigkeit ${K.gen} ${K.at}, und ${C.nom} ${cartDoes}.`),
      ],
      steps,
    };
  }

  // ================================================================ pendulum: the string is cut
  // A bob whose string is cut, a girl letting go of a rope swing, a trapeze artist letting go of
  // the bar, at one of five points of the swing (swinging to the right): the left end, on the
  // way down, the lowest point, on the way up, the right end.
  const POS = { start: -45, down: -25, bottom: 0, mid: 25, top: 45 }; // angle from the vertical, swinging to the right
  function swingers() {
    return {
      bob: { name: 'bob', it: 'it', its: 'its', N: FC.noun('m', 'Körper'), person: false,
        cut: T('the string is cut', 'die Schnur durchgeschnitten wird'), gone: T('the string is cut', 'die Schnur durch ist'), after: T('the string is cut', 'die Schnur durchgeschnitten wurde'),
        rope: T('the string', 'die Schnur'), moment: T('At the moment of the cut', 'Im Moment des Schnitts'),
        title: T('Cutting the pendulum string', 'Pendelschnur durchschneiden'),
        label: T('A pendulum; the string is cut when the bob is at P', 'Ein Pendel; die Schnur wird durchgeschnitten, wenn der Körper in P ist'),
        text: (where) => T(`A heavy bob swings on a string. The string is cut when the bob is at P, ${where}. Air resistance is negligible.`, `Ein schwerer Pendelkörper schwingt an einer Schnur. Die Schnur wird durchgeschnitten, wenn der Körper in P ist, ${where}. Der Luftwiderstand ist vernachlässigbar.`) },
      girl: { name: 'girl', it: 'she', its: 'her', N: FC.noun('n', 'Mädchen'), person: true,
        cut: T('she lets go of the rope', 'es das Seil loslässt'), gone: T('she has let go of the rope', 'es das Seil losgelassen hat'), after: T('she lets go', 'es losgelassen hat'),
        rope: T('the rope', 'das Seil'), moment: T('At the moment she lets go', 'Im Moment des Loslassens'),
        title: T('Letting go of the rope swing', 'Das Schwingseil loslassen'),
        label: T('A girl on a rope swing above a lake; she lets go at P', 'Ein Mädchen an einem Schwingseil über einem See; es lässt in P los'),
        text: (where) => T(`A girl swings on a rope that hangs from a branch above a lake. She lets go of the rope when she is at P, ${where}. Air resistance is negligible.`, `Ein Mädchen schwingt an einem Seil, das an einem Ast über einem See hängt. Es lässt das Seil los, wenn es in P ist, ${where}. Der Luftwiderstand ist vernachlässigbar.`) },
      trapeze: { name: 'trapeze artist', it: 'he', its: 'his', N: FC.noun('m', 'Trapezkünstler'), person: true, bar: true,
        cut: T('he lets go of the bar', 'er die Stange loslässt'), gone: T('he has let go of the bar', 'er die Stange losgelassen hat'), after: T('he lets go', 'er losgelassen hat'),
        rope: T('the trapeze', 'das Trapez'), moment: T('At the moment he lets go', 'Im Moment des Loslassens'),
        title: T('Letting go of the trapeze', 'Das Trapez loslassen'),
        label: T('A trapeze artist above a safety net; he lets go at P', 'Ein Trapezkünstler über einem Sicherheitsnetz; er lässt in P los'),
        text: (where) => T(`A trapeze artist swings on a trapeze high above a safety net. He lets go of the bar when he is at P, ${where}. Air resistance is negligible.`, `Ein Trapezkünstler schwingt an einem Trapez hoch über einem Sicherheitsnetz. Er lässt die Stange los, wenn er in P ist, ${where}. Der Luftwiderstand ist vernachlässigbar.`) },
    };
  }

  function pendulumCut(r, p) {
    const pos = p.pos || r.pick(['start', 'down', 'bottom', 'mid', 'top']);
    const who = p.who || r.pick(['bob', 'girl', 'trapeze']), W0 = swingers()[who], N = W0.N, name = W0.name;
    const it = W0.it, its = W0.its, It = FC.cap(it), Its = FC.cap(its), Er = FC.cap(N.er), Sein = N.g === 'f' ? 'Ihre' : 'Seine';
    const th = (POS[pos] * Math.PI) / 180, amp = (45 * Math.PI) / 180;
    const speed = Math.sqrt(Math.max(0, Math.cos(th) - Math.cos(amp)) / (1 - Math.cos(amp)));
    const tang = [Math.cos(th), -Math.sin(th)], rad = [Math.sin(th), Math.cos(th)];
    const ends = pos === 'top' || pos === 'start';
    const him = { it: 'it', she: 'her', he: 'him' }[it];

    // the swinging body at P: a bob, or a person hanging from the hands (H) on the rope or bar
    function swinger(P, small) {
      if (!W0.person || small) return D.ball(P[0], P[1], small ? 5 : 8);
      const H = [P[0], P[1] - 18]; // the hands, above the middle of the body at P
      let g = W0.bar ? D.line(H[0] - 10, H[1], H[0] + 10, H[1], 'cable') : '';
      g += D.line(H[0] - 3, H[1], H[0], H[1] + 14, 'body') + D.line(H[0] + 3, H[1], H[0], H[1] + 14, 'body') + D.ball(H[0], H[1] + 8, 4.5, 'skin');
      g += D.line(H[0], H[1] + 14, H[0], H[1] + 28, 'body') + D.line(H[0], H[1] + 28, H[0] - 5, H[1] + 42, 'body') + D.line(H[0], H[1] + 28, H[0] + 5, H[1] + 42, 'body');
      return g;
    }
    // a small pendulum picture with a path from the bob
    function scene(W, H, pv, L, path, o = {}) {
      const P = [pv[0] + L * rad[0], pv[1] + L * rad[1]];
      const arc = (a0, a1) => `M${D.n(pv[0] + L * Math.sin(a0))} ${D.n(pv[1] + L * Math.cos(a0))} A${L} ${L} 0 0 0 ${D.n(pv[0] + L * Math.sin(a1))} ${D.n(pv[1] + L * Math.cos(a1))}`;
      let g = D.ceiling(pv[0] - 30, pv[0] + 30, pv[1]) + D.path(arc(-amp, amp), 'trace') + D.ground(0, W, H - 8);
      if (o.string !== false) g += W0.person && !o.small ? D.line(pv[0], pv[1], P[0], P[1] - 18, 'cable') : D.line(pv[0], pv[1], P[0], P[1], 'cable');
      if (path) g += D.path(path(P, L), 'opt-path');
      g += swinger(P, o.small);
      if (o.vel && speed > 0.01) g += D.arrow(P[0], P[1], P[0] + 40 * speed * tang[0], P[1] + 40 * speed * tang[1], 'v', 'v');
      if (o.vel && speed <= 0.01) g += W0.person ? D.text(P[0] + 12, P[1] + 16, 'v = 0', 'lbl v', 'start') : D.text(P[0] + 12, P[1] - 6, 'v = 0', 'lbl v', 'start');
      if (o.force) g += D.arrow(P[0], P[1], P[0], P[1] + 34, 'f', FL('G'));
      return g + (o.label ? D.text(P[0] - 12, P[1] + 4, 'P', 'lbl', 'end') : '');
    }
    const ground = (H) => H - 8;
    const parabola = (H, s0) => (P) => {
      const v = [s0 * tang[0], s0 * tang[1]], g = 90, pts = [];
      for (let t = 0; t < 3; t += 0.02) { const y = P[1] + v[1] * t + 0.5 * g * t * t; pts.push([P[0] + v[0] * t, Math.min(y, ground(H))]); if (y >= ground(H)) break; }
      return 'M' + pts.map(([x, y]) => `${D.n(x)} ${D.n(y)}`).join(' L');
    };
    const PATHS = {
      down: (H) => (P) => `M${D.n(P[0])} ${D.n(P[1])} V${ground(H)}`,
      throwOff: (H) => parabola(H, 70 * Math.max(speed, 0.6)),
      arc: () => (P, L) => { const pv = [P[0] - L * rad[0], P[1] - L * rad[1]], a1 = th + 0.5; return `M${D.n(P[0])} ${D.n(P[1])} A${L} ${L} 0 0 0 ${D.n(pv[0] + L * Math.sin(a1))} ${D.n(pv[1] + L * Math.cos(a1))}`; },
      outward: () => (P) => `M${D.n(P[0])} ${D.n(P[1])} L${D.n(P[0] + 30 * rad[0] + 14 * tang[0])} ${D.n(P[1] + 30 * rad[1] + 14 * tang[1])}`,
      straight: () => (P) => `M${D.n(P[0])} ${D.n(P[1])} L${D.n(P[0] + 60 * tang[0])} ${D.n(P[1] + 60 * tang[1])}`,
    };
    const pic = (k) => D.svg(150, 150, scene(150, 150, [pos === 'start' ? 90 : 60, 12], 74, PATHS[k](150), { string: false, small: true }), T('path', 'Bahn'));
    function figure(o = {}) {
      const path = o.path ? PATHS[o.path](250) : null;
      return D.svg(320, 250, scene(320, 250, [140, 26], 140, path, { vel: !o.path || o.vel, label: true, force: o.force, string: !o.path }), W0.label);
    }

    const where = { start: T(`at the left end of the swing, where ${it} turns round to swing back down (${its} velocity is zero there)`, `am linken Ende der Schwingung, wo ${N.er} umkehrt, um wieder hinunterzuschwingen (${N.g === 'f' ? 'ihre' : 'seine'} Geschwindigkeit ist dort null)`),
      down: T(`on ${its} way down, moving down and to the right`, `auf dem Weg nach unten, wenn ${N.er} sich schräg nach rechts unten bewegt`),
      bottom: T(`at the lowest point, where ${it} moves horizontally and fastest`, `im tiefsten Punkt, wo ${N.er} sich horizontal und am schnellsten bewegt`),
      mid: T(`on ${its} way up, moving up and to the right`, `auf dem Weg nach oben, wenn ${N.er} sich schräg nach rechts oben bewegt`),
      top: T(`at the right end of the swing, where ${it} turns round (${its} velocity is zero there)`, `am rechten Ende der Schwingung, wo ${N.er} umkehrt (${N.g === 'f' ? 'ihre' : 'seine'} Geschwindigkeit ist dort null)`) }[pos];
    const rule = T(`From the moment ${W0.cut}, only gravity acts. The ${name} keeps the velocity ${it} has at that moment and falls like a thrown ball.`, `Vom Moment an, in dem ${W0.cut}, wirkt nur die Schwerkraft. ${FC.cap(N.nom)} behält die Geschwindigkeit, die ${N.er} in diesem Moment hat, und fällt wie ein geworfener Ball.`);
    const result = { bottom: T(`${Its} velocity is horizontal: ${it} flies off on a parabola that starts horizontally.`, `${Sein} Geschwindigkeit ist horizontal: ${Er} fliegt auf einer Parabel davon, die horizontal beginnt.`),
      mid: T(`${Its} velocity points along the circle, up and to the right: ${it} flies off along a parabola that starts in this direction, rises a little and then falls.`, `${Sein} Geschwindigkeit zeigt entlang des Kreises nach rechts oben: ${Er} fliegt auf einer Parabel in diese Richtung davon, steigt noch etwas und fällt dann.`),
      down: T(`${Its} velocity points along the circle, down and to the right: ${it} flies off along a parabola that starts in this direction and bends further down.`, `${Sein} Geschwindigkeit zeigt entlang des Kreises nach rechts unten: ${Er} fliegt auf einer Parabel in diese Richtung davon, die sich weiter nach unten krümmt.`),
      top: T(`${Its} velocity is zero at this moment: ${it} falls straight down.`, `${Sein} Geschwindigkeit ist in diesem Moment null: ${Er} fällt senkrecht hinunter.`) };
    result.start = result.top;
    const res = result[pos];
    const okPath = ends ? 'down' : 'throwOff';
    const predCodes = { down: 'other', throwOff: 'other', arc: 'circular-impetus', outward: 'centrifugal', straight: 'other' };
    const keysFor = { bottom: ['throwOff', 'down', 'arc', 'straight'], mid: ['throwOff', 'down', 'arc', 'outward'], down: ['throwOff', 'down', 'arc', 'outward'], top: ['down', 'throwOff', 'arc', 'outward'], start: ['down', 'throwOff', 'arc', 'outward'] }[pos];
    const pathWords = { down: T('straight down', 'senkrecht hinunter'), throwOff: ends ? T('off sideways on a curve', 'seitlich auf einer Kurve davon') : T('on a parabola, starting along its velocity', 'auf einer Parabel, die in Richtung der Geschwindigkeit beginnt'),
      arc: T('on along the circle', 'weiter auf dem Kreis'), outward: T('outward, away from the pivot', 'nach aussen, weg vom Aufhängepunkt'), straight: T('in a straight line along its velocity', 'geradlinig in Richtung der Geschwindigkeit') };
    const predWhy = {
      down: `${rule} ${res}`,
      throwOff: `${rule} ${res}`,
      arc: T(`Nothing keeps the ${name} on the circle once ${W0.gone}. ${rule} ${res}`, `Nichts hält ${N.acc} auf dem Kreis, sobald ${W0.gone}. ${rule} ${res}`),
      outward: T(`There is no force pushing the ${name} outward. ${rule} ${res}`, `Keine Kraft drückt ${N.acc} nach aussen. ${rule} ${res}`),
      straight: T(`Gravity bends the path down from the first moment. ${rule} ${res}`, `Die Schwerkraft krümmt die Bahn vom ersten Moment an nach unten. ${rule} ${res}`),
    };
    const preds = keysFor.map((k) => o(pic(k), k === okPath ? 'ok' : predCodes[k], k === okPath ? `${RIGHT()} ${rule} ${res}` : predWhy[k], pathWords[k]));
    const reasons = [
      o(T(`${It} keeps the velocity ${it} has at that moment, and from then on only gravity acts.`, `${Er} behält die Geschwindigkeit, die ${N.er} in diesem Moment hat, und von da an wirkt nur die Schwerkraft.`), 'ok', `${RIGHT()} ${rule} ${res}`),
      o(T(`Once ${W0.gone}, only gravity acts, so ${it} falls straight down.`, `Sobald ${W0.gone}, wirkt nur die Schwerkraft, also fällt ${N.er} senkrecht hinunter.`), 'other',
        ends ? T('The prediction is right here, but only because the velocity is zero at this point. Only gravity acting does not mean falling straight down: a body that is moving keeps its velocity and falls on a parabola.', 'Die Vorhersage stimmt hier, aber nur, weil die Geschwindigkeit in diesem Punkt null ist. Dass nur die Schwerkraft wirkt, heisst nicht, dass der Körper senkrecht fällt: Ein Körper in Bewegung behält seine Geschwindigkeit und fällt auf einer Parabel.')
          : T(`Only gravity acts, yes — but the ${name} keeps ${its} velocity. ${res}`, `Ja, nur die Schwerkraft wirkt — aber ${N.nom} behält ${N.g === 'f' ? 'ihre' : 'seine'} Geschwindigkeit. ${res}`)),
      o(T(`${It} keeps swinging along the circle for a moment.`, `${Er} schwingt noch einen Moment auf dem Kreis weiter.`), 'circular-impetus', predWhy.arc),
      o(T(`The centrifugal force flings ${him} outward.`, `Die Zentrifugalkraft schleudert ${N.ihn} nach aussen.`), 'centrifugal', predWhy.outward),
    ];
    const vHere = speed > 0.01 ? (pos === 'bottom' ? T('horizontal', 'horizontal') : pos === 'mid' ? T('along the circle, up and to the right', 'entlang des Kreises nach rechts oben gerichtet') : T('along the circle, down and to the right', 'entlang des Kreises nach rechts unten gerichtet')) : T('zero', 'null');

    return {
      title: W0.title,
      situation: `<p>${W0.text(where)}</p>`,
      figure: figure(),
      questions: [two(r, 'path', T(`Which path does the ${name} follow after ${W0.after}?`, `Welche Bahn beschreibt ${N.nom}, nachdem ${W0.after}?`), T('Why?', 'Warum?'), preds, reasons, true)],
      hints: [
        T(`Before ${W0.cut}, ${W0.rope} pulls on the ${name} and the Earth pulls ${him} down. Which of the two forces is left after that?`, `Bevor ${W0.cut}, zieht ${W0.rope} an ${N.dat}, und die Erde zieht ${N.ihn} nach unten. Welche der beiden Kräfte bleibt danach übrig?`),
        T(`Plan: the velocity of the ${name} at P — its direction, and whether it is zero — is the starting velocity of the flight; from then on only the weight acts.`, `Plan: Die Geschwindigkeit ${N.g === 'n' ? 'des Mädchens' : `des ${N.word}s`} in P — ihre Richtung, und ob sie null ist — ist die Anfangsgeschwindigkeit des Flugs; von da an wirkt nur noch die Gewichtskraft.`),
        T(`After ${W0.cut}: horizontally no force acts (first law), vertically the weight gives the acceleration <i>g</i> (second law). Split the velocity at P into a horizontal and a vertical part.`, `Nachdem ${W0.after}: Horizontal wirkt keine Kraft (erstes Gesetz), vertikal ergibt die Gewichtskraft die Beschleunigung <i>g</i> (zweites Gesetz). Zerlege die Geschwindigkeit in P in einen horizontalen und einen vertikalen Anteil.`),
        T(`Here at P the velocity is ${vHere}.`, `Hier in P ist die Geschwindigkeit ${vHere}.`),
      ],
      steps: [
        { title: W0.moment, figure: figure({ force: true }),
          text: T(`Before ${W0.cut}, ${W0.rope} pulls the ${name} toward the pivot and keeps ${him} on the circle. After that, only the weight acts. ${speed > 0.01 ? `At P the ${name} moves along the circle (velocity arrow).` : `At P the ${name} turns round: ${its} velocity is zero.`}`,
            `Bevor ${W0.cut}, zieht ${W0.rope} ${N.acc} zum Aufhängepunkt und hält ${N.ihn} auf dem Kreis. Danach wirkt nur noch die Gewichtskraft. ${speed > 0.01 ? `In P bewegt sich ${N.nom} entlang des Kreises (Geschwindigkeitspfeil).` : `In P kehrt ${N.nom} um: ${Sein} Geschwindigkeit ist null.`}`) },
        { title: T('The path', 'Die Bahn'), figure: figure({ path: okPath, vel: true }), text: `${rule} ${res}` },
      ],
    };
  }

  // ================================================================ ramp: net force while rolling up and down
  // A ball, a toy car or a skateboarder rolling, or a glider on a tilted air track sliding, up a
  // straight ramp and back down; the net force at a point on the way up, at the top or on the way down.
  const RAMP_BODIES = {
    ball: { g: 'f', word: 'Kugel', en: 'ball', roll: true, half: 11 },
    car: { g: 'n', word: 'Spielzeugauto', en: 'toy car', roll: true, half: 26 },
    glider: { g: 'm', word: 'Gleiter', en: 'glider', roll: false, half: 24 },
    skater: { g: 'f', word: 'Skateboarderin', en: 'skateboarder', roll: true, half: 20 },
  };
  function ramp(r, p) {
    const phase = p.phase || r.pick(['rising', 'top', 'falling']);
    const key = p.obj || r.pick(['ball', 'car', 'glider', 'skater']), RB = RAMP_BODIES[key];
    const N = FC.noun(RB.g, RB.word), name = RB.en, ball = key === 'ball';
    const its = key === 'skater' ? 'her' : 'its', Its = FC.cap(its), it = key === 'skater' ? 'she' : 'it', It = FC.cap(it);
    const poss = N.g === 'f' ? 'ihre' : 'seine', Poss = FC.cap(poss);
    const rolls = RB.roll ? 'rolls' : 'slides', rollt = RB.roll ? 'rollt' : 'gleitet';
    const ang = 22 * Math.PI / 180, A = [40, 210], Bp = [360, 210 - 320 * Math.tan(ang)];
    const u = [Math.cos(ang), -Math.sin(ang)], nrm = [Math.sin(ang), Math.cos(ang)]; // up the ramp; out of the surface (svg: up is −y)
    const s = { rising: 0.4, top: 0.72, falling: 0.4 }[phase];
    const P = [A[0] + (Bp[0] - A[0]) * s - 11 * nrm[0], A[1] + (Bp[1] - A[1]) * s - 11 * nrm[1]];
    const rot = (g) => `<g transform="rotate(-22 ${D.n(P[0])} ${D.n(P[1])})">${g}</g>`;
    function body() {
      if (key === 'car') return rot(D.car(P[0] - 26, P[1] + 11, 52));
      if (key === 'glider') return rot(D.rect(P[0] - 24, P[1] - 4, 48, 15, 'obj', 3) + D.rect(P[0] - 3, P[1] - 12, 6, 8, 'solid', 1));
      if (key === 'skater') return rot(D.line(P[0] - 18, P[1] + 4, P[0] + 18, P[1] + 4, 'skate') + D.ball(P[0] - 11, P[1] + 8, 3, 'wheel') + D.ball(P[0] + 11, P[1] + 8, 3, 'wheel')) + D.person(P[0], P[1] + 2, 58, 1, 'down');
      return D.ball(P[0], P[1], 11);
    }
    const label = { ball: T('A ball on a ramp at the point P', 'Eine Kugel auf einer Rampe im Punkt P'), car: T('A toy car on a ramp at the point P', 'Ein Spielzeugauto auf einer Rampe im Punkt P'),
      glider: T('A glider on a tilted air track at the point P', 'Ein Gleiter auf einer geneigten Luftkissenbahn im Punkt P'), skater: T('A skateboarder on a ramp at the point P', 'Eine Skateboarderin auf einer Rampe im Punkt P') }[key];
    function figure(o = {}) {
      let g = `<polygon class="solid" points="${A[0]},${A[1]} ${D.n(Bp[0])},${D.n(Bp[1])} ${Bp[0]},${A[1]}"/>` + D.ground(0, 400, A[1]);
      const lx = key === 'skater' ? 20 : RB.half > 11 ? 10 : 14, ly = key === 'skater' ? 30 : RB.half > 11 ? 22 : 12;
      g += body() + D.text(P[0] - lx, P[1] - ly, 'P', 'lbl', 'end');
      if (!o.forces) {
        const h = RB.half + 3;
        if (phase === 'top') g += D.text(P[0] + h + 2, P[1] - (key === 'skater' ? 34 : RB.half > 11 ? 24 : 14), 'v = 0', 'lbl v', 'start');
        else { const d = phase === 'rising' ? 1 : -1; g += D.arrow(P[0] + h * d * u[0] - 30 * nrm[0] * (key === 'skater'), P[1] + h * d * u[1] - 30 * nrm[1] * (key === 'skater'), P[0] + (h + 42) * d * u[0] - 30 * nrm[0] * (key === 'skater'), P[1] + (h + 42) * d * u[1] - 30 * nrm[1] * (key === 'skater'), 'v', 'v'); }
      } else {
        const Gl = 50, Nl = Gl * Math.cos(ang), Sl = Gl * Math.sin(ang);
        const M = key === 'skater' ? [P[0], P[1] - 24] : P; // the forces act at her middle
        g += D.arrow(M[0], M[1], M[0], M[1] + Gl, 'f', FL('G'));
        g += D.arrow(M[0], M[1], M[0] - Nl * nrm[0], M[1] - Nl * nrm[1], 'f', FL('N'));
        g += D.arrow(M[0] - 22 * nrm[0], M[1] - 22 * nrm[1], M[0] - 22 * nrm[0] - Sl * u[0] * 1.6, M[1] - 22 * nrm[1] - Sl * u[1] * 1.6, 'net', FL('net'));
      }
      return D.svg(400, 230, g, label);
    }
    const motion = { rising: T(`${rolls} up the ramp and gets slower`, ''), top: T(`turns round at ${its} highest point (${its} velocity is zero there)`, ''), falling: T(`${rolls} back down and gets faster`, '') }[phase];
    const deMotion = { rising: `${rollt} ${N.nom} die Rampe hinauf und wird langsamer`, top: `kehrt ${N.nom} im höchsten Punkt um (${poss} Geschwindigkeit ist dort null)`, falling: `${rollt} ${N.nom} wieder hinunter und wird schneller` }[phase]; // after “Hier” or “Im Punkt P”
    const rule = T(`The ${name} slows down on the way up and speeds up on the way down: ${its} acceleration points down the ramp all the time — also at the top, where ${its} velocity is changing from up to down. So the net force points down the ramp.`,
      `${FC.cap(N.nom)} wird auf dem Weg nach oben langsamer und auf dem Weg nach unten schneller: ${Poss} Beschleunigung zeigt die ganze Zeit die Rampe hinunter — auch oben, wo sich ${poss} Geschwindigkeit von hinauf nach hinunter ändert. Also zeigt die resultierende Kraft die Rampe hinunter.`);
    const parts = key === 'glider'
      ? T('Weight (straight down) and the push of the air cushion (at right angles to the track) add up to a net force along the track, downward.', 'Gewichtskraft (senkrecht nach unten) und Normalkraft des Luftkissens (senkrecht zur Bahn) ergeben zusammen eine resultierende Kraft entlang der Bahn nach unten.')
      : T('Weight (straight down) and the push of the ramp (at right angles to it) add up to a net force along the ramp, downward.', 'Gewichtskraft (senkrecht nach unten) und Normalkraft der Rampe (senkrecht zur Rampe) ergeben zusammen eine resultierende Kraft entlang der Rampe nach unten.');
    const upWhy = RB.roll ? T('Rolling up does not need a net force up the ramp. ', 'Um hinaufzurollen, braucht es keine resultierende Kraft die Rampe hinauf. ')
      : T('Sliding up does not need a net force up the ramp. ', 'Um hinaufzugleiten, braucht es keine resultierende Kraft die Rampe hinauf. ');
    const preds = [
      o(T('Down the ramp.', 'Die Rampe hinunter.'), 'ok', `${RIGHT()} ${rule}`),
      o(T('Up the ramp.', 'Die Rampe hinauf.'), phase === 'rising' ? 'active-force' : 'other', `${phase === 'rising' ? upWhy : ''}${rule}`),
      o(T('It is zero.', 'Sie ist null.'), phase === 'top' ? 'rest-no-force' : 'other', rule),
      o(T('Straight down.', 'Senkrecht nach unten.'), 'other', `${parts} ${rule}`),
    ];
    const reasons = [
      o(T(`${Its} acceleration points down the ramp the whole time, so the net force does too.`, `${Poss} Beschleunigung zeigt die ganze Zeit die Rampe hinunter, also auch die resultierende Kraft.`), 'ok', `${RIGHT()} ${rule}`),
      o(T(`${It} moves up the ramp, so the net force must point up the ramp.`, `${FC.cap(N.er)} bewegt sich die Rampe hinauf, also muss die resultierende Kraft die Rampe hinauf zeigen.`), 'active-force', rule),
      o(T(`At the top ${it} is at rest, so no net force acts there.`, `Oben ist ${N.er} in Ruhe, also wirkt dort keine resultierende Kraft.`), 'rest-no-force', rule),
      o(T('Only the weight counts, and it points straight down.', 'Nur die Gewichtskraft zählt, und die zeigt senkrecht nach unten.'), 'other', `${parts} ${rule}`),
      o(ball ? T('The push of the throw is used up at the top.', 'Der Schwung des Anstossens ist oben aufgebraucht.') : key === 'skater' ? T('The push from pushing off is used up at the top.', 'Der Schwung des Abstossens ist oben aufgebraucht.')
        : T(`The push ${it} was given is used up at the top.`, 'Der Schwung des Anstossens ist oben aufgebraucht.'), 'impetus',
        T(`There is no stored push: after the start only the weight and the push of the ${key === 'glider' ? 'air cushion' : 'ramp'} act. ${rule}`, `Es gibt keinen gespeicherten Schwung: Nach dem ${key === 'skater' ? 'Abstossen' : 'Anstossen'} wirken nur Gewichtskraft und Normalkraft ${key === 'glider' ? 'des Luftkissens' : 'der Rampe'}. ${rule}`)),
    ];
    const must = phase === 'rising' ? 1 : phase === 'top' ? 2 : 3;
    const pickReasons = [reasons[0], reasons[must], ...r.shuffle(reasons.slice(1).filter((x, i) => i + 1 !== must)).slice(0, 2)];
    const at = T(`At the point P, the ${name} ${motion}.`, `Im Punkt P ${deMotion}.`);
    const situation = {
      ball: T('A ball is given a push up a straight ramp. It rolls up, stops and rolls back down.', 'Eine Kugel wird eine gerade Rampe hinauf angestossen. Sie rollt hinauf, hält an und rollt wieder hinunter.'),
      car: T('A toy car is given a push up a straight ramp. It rolls up, stops and rolls back down.', 'Ein Spielzeugauto wird eine gerade Rampe hinauf angestossen. Es rollt hinauf, hält an und rollt wieder hinunter.'),
      glider: T('An air track is tilted so that it forms a straight ramp. A glider on it is given a push up the slope. It slides up, stops and slides back down.', 'Eine Luftkissenbahn ist geneigt, sodass sie eine gerade Rampe bildet. Ein Gleiter darauf wird die Bahn hinauf angestossen. Er gleitet hinauf, hält an und gleitet wieder hinunter.'),
      skater: T('A skateboarder pushes off on level ground and rolls up a straight ramp without pushing again. She rolls up, stops and rolls back down.', 'Eine Skateboarderin stösst sich auf ebenem Boden ab und rollt ohne weiteres Abstossen eine gerade Rampe hinauf. Sie rollt hinauf, hält an und rollt wieder hinunter.'),
    }[key];
    return {
      title: T('Up and down the ramp', 'Die Rampe hinauf und hinunter'),
      situation: `<p>${situation} ${T('Friction and air resistance are negligible.', 'Reibung und Luftwiderstand sind vernachlässigbar.')} ${at}</p>`,
      figure: figure(),
      questions: [two(r, 'net', T(`Which way does the net force on the ${name} point at P?`, `Wohin zeigt die resultierende Kraft auf ${N.acc} im Punkt P?`), T('Why?', 'Warum?'), preds, pickReasons)],
      hints: [
        T(`At P the ${name} ${motion}. How does ${its} velocity change from just before P to just after P?`, `Im Punkt P ${deMotion}. Wie ändert sich ${poss} Geschwindigkeit von kurz vor P bis kurz nach P?`),
        T(`Plan: that change of velocity at P → direction of the acceleration at P → direction of the net force at P. Only ${its} weight and the push of the ${key === 'glider' ? 'air cushion' : 'ramp'} act on the ${name}.`, `Plan: Diese Änderung der Geschwindigkeit in P → Richtung der Beschleunigung in P → Richtung der resultierenden Kraft in P. Auf ${N.acc} wirken nur die Gewichtskraft und die Normalkraft ${key === 'glider' ? 'des Luftkissens' : 'der Rampe'}.`),
        T(`Second law at P: ${FC.F('net')} = <i>m·a</i>, with <i>a</i> along the change of velocity${phase === 'top' ? ' — even though the velocity itself is zero at P' : `, not along the velocity (${phase === 'rising' ? 'up' : 'down'} the ramp)`}.`, `Zweites Newtonsches Gesetz in P: ${FC.F('net')} = <i>m·a</i>, mit <i>a</i> in Richtung der Änderung der Geschwindigkeit${phase === 'top' ? ' — auch wenn die Geschwindigkeit selbst in P null ist' : `, nicht in Richtung der Geschwindigkeit (die Rampe ${phase === 'rising' ? 'hinauf' : 'hinunter'})`}.`),
        T(`Here the ${name} ${motion}. Which way does ${its} velocity change?`, `Hier ${deMotion}. In welche Richtung ändert sich ${poss} Geschwindigkeit?`),
      ],
      steps: [
        { title: T('Acceleration', 'Beschleunigung'), figure: figure(), text: rule },
        { title: T('Forces', 'Kräfte'), figure: figure({ forces: true }), text: parts },
      ],
    };
  }

  register('inertia', 'cart-launcher', cartLauncher);
  register('gravity', 'pendulum-cut', pendulumCut);
  register('force', 'ramp', ramp);
})(typeof window !== 'undefined' ? window : globalThis);
