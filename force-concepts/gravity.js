// Gravity: heavy and light balls fall alike, a body launched horizontally follows a parabola,
// and a thrown ball feels only its weight, all the way up, at the top and on the way down.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, F, cap, num, qty, noun, o, q, register } = FC;
  const G = 9.81;

  // ================================================================ drop: heavy and light
  const PAIRS = [
    { heavy: 'steel ball', light: 'wooden ball', dh: ['f', 'Stahlkugel'], dl: ['f', 'Holzkugel'] },
    { heavy: 'lead ball', light: 'plastic ball', dh: ['f', 'Bleikugel'], dl: ['f', 'Kunststoffkugel'] },
    { heavy: 'solid steel ball', light: 'hollow steel ball', dh: ['f', 'Vollkugel'], dl: ['f', 'Hohlkugel'] },
  ];

  function drop(r, p) {
    const variant = p.variant || r.pick(['drop', 'roll']);
    const pair = p.pair || r.pick(PAIRS), { heavy, light } = pair;
    const H = noun(...pair.dh), Lt = noun(...pair.dl); // German: both feminine
    const k = p.k || r.pick([2, 3, 4, 5, 8, 10]);
    const mL = p.m || r.pick([0.1, 0.2, 0.25, 0.5]), mH = k * mL;
    const h = p.h || (variant === 'drop' ? r.pick([1.8, 2.45, 3.2, 5]) : r.pick([0.8, 1.25]));
    const v = p.v || r.pick([1, 1.5, 2, 2.5]);
    const t = Math.sqrt((2 * h) / G);
    const roll = variant === 'roll';
    const kg = (m) => qty(m, 'kg', 3);
    const FG = F('G'), Fnet = F('net');
    const nameH = T(heavy, H.word), nameL = T(light, Lt.word);

    // ---------------------------------------------------------- figures
    // drop: both balls side by side at the top; roll: two tables side by side.
    function figure(o = {}) {
      if (!roll) {
        const yT = 62, yB = 206, xs = [140, 270], ms = [mH, mL], names = [nameH, nameL];
        let s = D.ground(20, 340, 218);
        s += D.arrow(70, 140, 70, yT, 'dim', '', { head: 7 }) + D.arrow(70, 140, 70, 216, 'dim', '', { head: 7 }) + D.text(78, 144, `h = ${num(h, 3)} m`, 'lbl', 'start');
        xs.forEach((x, i) => {
          s += D.words(x, 22, names[i]) + D.text(x, 38, `m = ${num(ms[i], 3)} kg`, 'lbl small');
          if (o.strobe) [0.4, 0.7, 1].forEach((f) => { s += D.ghost(D.ball(x, yT + (yB - yT) * f * f, 12, i ? 'obj' : 'obj heavy')); });
          s += D.ball(x, yT, 12, i ? 'obj' : 'obj heavy');
          if (o.forces) s += D.arrow(x, yT, x, yT + (i ? 18 : Math.min(96, 18 * k)), 'f', 'F_G');
          if (o.acc) s += D.arrow(x + 26, yT - 6, x + 26, yT + 30, 'a', 'g', { at: [x + 32, yT + 26], anchor: 'start' });
        });
        if (o.strobe) s += D.words(190, 236, T('positions at equal time intervals', 'Positionen in gleichen Zeitabständen'));
        return D.svg(360, o.strobe ? 244 : 228, s, T('Two balls of the same size at height h above the ground', 'Zwei gleich grosse Kugeln in der Höhe h über dem Boden'));
      }
      let s = '';
      [[0, nameH, mH, 'obj heavy'], [190, nameL, mL, 'obj']].forEach(([dx, name, m, cls], i) => {
        const yT = 96, yF = 218, x0 = dx + 82, y0 = yT - 11;
        s += D.ground(dx + 6, dx + 182, yF) + D.table(dx + 10, yT, 72, yF);
        s += D.words(dx + 92, 22, name) + D.text(dx + 92, 38, `m = ${num(m, 3)} kg`, 'lbl small');
        if (o.strobe) {
          const pts = Array.from({ length: 21 }, (z, j) => [x0 + 88 * (j / 20), y0 + (yF - 11 - y0) * (j / 20) ** 2]);
          s += D.poly(pts, 'trace');
          [0.25, 0.5, 0.75, 1].forEach((f) => { s += D.ghost(D.ball(x0 + 88 * f, y0 + (yF - 11 - y0) * f * f, 11, cls)); });
        }
        s += D.ball(x0 - 6, y0, 11, cls);
        if (!o.strobe && !o.forces) s += D.arrow(x0 + 6, y0, x0 + 44, y0, 'v', 'v');
        if (o.forces) s += D.arrow(x0 - 6, y0, x0 - 6, y0 + (i ? 18 : Math.min(96, 18 * k)), 'f', 'F_G', { at: [x0 + 4, y0 + 34], anchor: 'start' });
      });
      return D.svg(380, 228, s, T('Two balls of the same size rolling off two equal tables', 'Zwei gleich grosse Kugeln rollen von zwei gleichen Tischen'));
    }

    // ---------------------------------------------------------- questions
    const why = {
      same: T(`Both fall with the same acceleration <i>g</i>: the ${heavy} is pulled ${k} times as hard, but it also has ${k} times the mass to accelerate.`,
        `Beide fallen mit derselben Beschleunigung <i>g</i>: An ${H.dat} wird ${k}-mal so stark gezogen, aber sie hat auch die ${k}-fache Masse, die beschleunigt werden muss.`),
      heavier: T(`The ${heavy} is pulled ${k} times as hard, but it is also ${k} times as hard to accelerate. Its acceleration is ${FG}/<i>m</i> = <i>m·g</i>/<i>m</i> = <i>g</i>, the same as for the ${light}.`,
        `An ${H.dat} wird ${k}-mal so stark gezogen, aber sie ist auch ${k}-mal so schwer zu beschleunigen. Ihre Beschleunigung ist ${FG}/<i>m</i> = <i>m·g</i>/<i>m</i> = <i>g</i>, gleich wie bei ${Lt.dat}.`),
      lighter: T(`The ${light} is easier to accelerate, but it is also pulled less: ${FG} = <i>m·g</i>. Both effects cancel, and both balls fall with acceleration <i>g</i>.`,
        `${cap(Lt.nom)} ist leichter zu beschleunigen, wird aber auch weniger stark gezogen: ${FG} = <i>m·g</i>. Beide Effekte heben sich auf, und beide Kugeln fallen mit der Beschleunigung <i>g</i>.`),
    };
    const timeQ = q(r, 'time', roll ? T('Which ball hits the floor first?', 'Welche Kugel kommt zuerst auf dem Boden auf?') : T('Which ball hits the ground first?', 'Welche Kugel kommt zuerst am Boden an?'), [
      o(T('Both at the same time.', 'Beide gleichzeitig.'), 'ok', `${T('Right.', 'Richtig.')} ${why.same}`),
      o(T(`The ${heavy}, in about 1/${k} of the time of the ${light}.`, `${cap(H.nom)}, in etwa 1/${k} der Zeit der ${Lt.word}.`), 'heavier-faster', why.heavier),
      o(T(`The ${heavy}, though not ${k} times sooner.`, `${cap(H.nom)}, aber nicht ${k}-mal so schnell.`), 'heavier-faster', why.heavier),
      o(T(`The ${light}, because it is easier to move.`, `${cap(Lt.nom)}, weil sie leichter zu bewegen ist.`), 'other', why.lighter),
    ]);
    const questions = [];
    if (roll) {
      questions.push(q(r, 'land', T('Where do the balls land?', 'Wo landen die Kugeln?'), [
        o(T('Both at the same distance from their table.', 'Beide gleich weit von ihrem Tisch entfernt.'), 'ok',
          T(`Right. Both fall for the same time <i>t</i>, and during this time both keep the horizontal speed <i>v</i>: both land <i>v·t</i> from the table.`,
            `Richtig. Beide fallen gleich lange (<i>t</i>) und behalten während dieser Zeit die horizontale Geschwindigkeit <i>v</i>: Beide landen <i>v·t</i> vom Tisch entfernt.`)),
        o(T(`The ${heavy} lands farther from the table, because it has more momentum.`, `${cap(H.nom)} landet weiter weg, weil sie mehr Schwung hat.`), 'impetus',
          T(`After the edge nothing pushes either ball forward, and nothing slows it down: both keep the horizontal speed <i>v</i>, whatever their mass. Both fall for the same time, so they get equally far.`,
            `Nach der Tischkante treibt nichts die Kugeln weiter an, und nichts bremst sie: Beide behalten die horizontale Geschwindigkeit <i>v</i>, egal wie schwer sie sind. Beide fallen gleich lange, also kommen sie gleich weit.`)),
        o(T(`The ${heavy} lands closer to the table, because it falls faster.`, `${cap(H.nom)} landet näher am Tisch, weil sie schneller fällt.`), 'heavier-faster',
          why.heavier + T(' So both are in the air equally long and get equally far.', ' Also sind beide gleich lange in der Luft und kommen gleich weit.')),
        o(T('Both drop straight down at the edge of the table.', 'Beide fallen an der Tischkante senkrecht hinunter.'), 'active-force',
          T('Nothing has to push the balls forward: they keep their horizontal speed <i>v</i> after the edge (inertia), and move on while they fall.',
            'Es braucht keine Kraft, die die Kugeln vorwärts treibt: Sie behalten nach der Kante ihre horizontale Geschwindigkeit <i>v</i> (Trägheit) und bewegen sich weiter, während sie fallen.')),
      ]));
    } else {
      questions.push(timeQ);
      questions.push(q(r, 'force', T(`How does the gravitational force on the ${heavy} compare with that on the ${light} while they fall?`, `Wie gross ist die Gewichtskraft auf ${H.acc} im Vergleich zu der auf ${Lt.acc}, während sie fallen?`), [
        o(T(`It is ${k} times as large.`, `${k}-mal so gross.`), 'ok',
          T(`Right: ${FG} = <i>m·g</i>, and the ${heavy} has ${k} times the mass. Still both accelerate at <i>g</i>, because <i>a</i> = ${FG}/<i>m</i>.`,
            `Richtig: ${FG} = <i>m·g</i>, und ${H.nom} hat die ${k}-fache Masse. Trotzdem beschleunigen beide mit <i>g</i>, denn <i>a</i> = ${FG}/<i>m</i>.`)),
        o(T('It is the same, since both fall equally fast.', 'Gleich gross, da beide gleich schnell fallen.'), 'other',
          T(`Equal fall times mean equal accelerations, not equal forces. ${FG} = <i>m·g</i> is ${qty(mH * G, 'N')} for the ${heavy} and ${qty(mL * G, 'N')} for the ${light}.`,
            `Gleiche Fallzeiten bedeuten gleiche Beschleunigungen, nicht gleiche Kräfte. ${FG} = <i>m·g</i> beträgt ${qty(mH * G, 'N')} für ${H.acc} und ${qty(mL * G, 'N')} für ${Lt.acc}.`)),
        o(T('Both are zero: falling bodies are weightless.', 'Beide sind null: Fallende Körper sind schwerelos.'), 'other',
          T(`Falling bodies feel weightless because nothing holds them up, but gravity still pulls on them with ${FG} = <i>m·g</i> — that is why they fall.`,
            `Fallende Körper fühlen sich schwerelos an, weil nichts sie hält. Die Schwerkraft zieht aber weiterhin mit ${FG} = <i>m·g</i> an ihnen — deshalb fallen sie ja.`)),
        o(T(`It is larger, so the ${heavy} has the larger acceleration.`, `Grösser, deshalb hat ${H.nom} die grössere Beschleunigung.`), 'heavier-faster', why.heavier),
      ]));
    }
    if (roll) questions.push(timeQ);

    // ---------------------------------------------------------- solution
    const steps = [
      { title: T('Forces', 'Kräfte'), figure: figure({ forces: true }),
        text: T(`${roll ? 'Once the balls have left the tables, nothing' : 'Nothing'} touches them (air resistance is negligible). The only force on each ball is its weight ${FG} = <i>m·g</i>, straight down: ${qty(mH * G, 'N')} on the ${heavy}, ${qty(mL * G, 'N')} on the ${light} — ${k} times less.`,
          `${roll ? 'Sobald die Kugeln die Tische verlassen haben, berührt sie nichts mehr' : 'Nichts berührt die Kugeln'} (Luftwiderstand vernachlässigbar). Die einzige Kraft auf jede Kugel ist ihre Gewichtskraft ${FG} = <i>m·g</i>, senkrecht nach unten: ${qty(mH * G, 'N')} auf ${H.acc}, ${qty(mL * G, 'N')} auf ${Lt.acc} — ${k}-mal weniger.`) },
      { title: T('Acceleration', 'Beschleunigung'), figure: figure({ forces: true, acc: !roll }),
        text: T(`Newton's second law: <i>a</i> = ${FG}/<i>m</i> = <i>m·g</i>/<i>m</i> = <i>g</i> ≈ 9.8 m/s² for both balls. ${k} times the force, but also ${k} times the mass to accelerate: the mass cancels.`,
          `Zweites Newtonsches Gesetz: <i>a</i> = ${FG}/<i>m</i> = <i>m·g</i>/<i>m</i> = <i>g</i> ≈ 9.8 m/s² für beide Kugeln. ${k}-fache Kraft, aber auch ${k}-fache Masse, die beschleunigt werden muss: Die Masse kürzt sich weg.`) },
      { title: T('Fall time', 'Fallzeit'), figure: figure({ strobe: true }),
        text: T(`Same acceleration, same height, both start with no vertical speed: both take the same time, <i>t</i> = √(2<i>h</i>/<i>g</i>) ≈ ${qty(t, 's')}, and are at the same height at every moment.`,
          `Gleiche Beschleunigung, gleiche Höhe, beide starten ohne vertikale Geschwindigkeit: Beide brauchen gleich lange, <i>t</i> = √(2<i>h</i>/<i>g</i>) ≈ ${qty(t, 's')}, und sind in jedem Moment auf gleicher Höhe.`) +
          (roll ? T(` Horizontally no force acts: both keep <i>v</i> = ${qty(v, 'm/s')} and land <i>v·t</i> ≈ ${qty(v * t, 'm')} from the table.`,
            ` Horizontal wirkt keine Kraft: Beide behalten <i>v</i> = ${qty(v, 'm/s')} und landen <i>v·t</i> ≈ ${qty(v * t, 'm')} vom Tisch entfernt.`) : '') },
    ];

    return {
      title: roll ? T('Off the table', 'Vom Tisch') : T('Heavy and light', 'Schwer und leicht'),
      situation: roll
        ? T(`<p>Two balls of the same size, a ${heavy} (${kg(mH)}) and a ${light} (${kg(mL)}), roll off two equal tables (height ${qty(h, 'm', 3)}) at the same moment, both with speed <i>v</i> = ${qty(v, 'm/s')}. Air resistance is negligible.</p>`,
          `<p>Zwei gleich grosse Kugeln, ${H.ein} (${kg(mH)}) und ${Lt.ein} (${kg(mL)}), rollen im selben Moment von zwei gleichen Tischen (Höhe ${qty(h, 'm', 3)}), beide mit der Geschwindigkeit <i>v</i> = ${qty(v, 'm/s')}. Der Luftwiderstand ist vernachlässigbar.</p>`)
        : T(`<p>Two balls of the same size, a ${heavy} (${kg(mH)}) and a ${light} (${kg(mL)}), are released at the same moment from a height of ${qty(h, 'm', 3)}. Air resistance is negligible.</p>`,
          `<p>Zwei gleich grosse Kugeln, ${H.ein} (${kg(mH)}) und ${Lt.ein} (${kg(mL)}), werden im selben Moment aus ${qty(h, 'm', 3)} Höhe losgelassen. Der Luftwiderstand ist vernachlässigbar.</p>`),
      figure: figure(),
      questions,
      hints: [
        T(`The ${heavy} (${kg(mH)}) and the ${light} (${kg(mL)}) ${roll ? `leave equal tables (${qty(h, 'm', 3)}) at the same moment, both at ${qty(v, 'm/s')}` : `start at rest from the same height, ${qty(h, 'm', 3)}`}. Which forces act on each ball ${roll ? 'once it has left its table' : 'while it falls'}? Nothing touches it, and air resistance is negligible.`,
          `${cap(H.nom)} (${kg(mH)}) und ${Lt.nom} (${kg(mL)}) ${roll ? `verlassen im selben Moment gleiche Tische (${qty(h, 'm', 3)}), beide mit ${qty(v, 'm/s')}` : `starten aus der Ruhe in derselben Höhe, ${qty(h, 'm', 3)}`}. Welche Kräfte wirken auf jede Kugel, ${roll ? 'nachdem sie ihren Tisch verlassen hat' : 'während sie fällt'}? Nichts berührt sie, und der Luftwiderstand ist vernachlässigbar.`),
        T(`Plan: the weight of each ball → its acceleration (second law) → ${roll ? `the fall time from ${qty(h, 'm', 3)} → how far each gets horizontally in that time` : `the fall time from ${qty(h, 'm', 3)} for each ball`}.`,
          `Plan: Gewichtskraft jeder Kugel → ihre Beschleunigung (zweites Gesetz) → ${roll ? `Fallzeit aus ${qty(h, 'm', 3)} → wie weit jede in dieser Zeit horizontal kommt` : `Fallzeit aus ${qty(h, 'm', 3)} für jede Kugel`}.`),
        T(`Weight ${FG} = <i>m·g</i>, second law <i>a</i> = ${Fnet}/<i>m</i>. Put the weight of the ${light} into the second law, in symbols: what is left of <i>a</i>?${roll ? ' Horizontally no force acts on either ball.' : ''}`,
          `Gewichtskraft ${FG} = <i>m·g</i>, zweites Gesetz <i>a</i> = ${Fnet}/<i>m</i>. Setze die Gewichtskraft der ${Lt.word} in symbolischer Form ins zweite Gesetz ein: Was bleibt von <i>a</i> übrig?${roll ? ' Horizontal wirkt auf keine der Kugeln eine Kraft.' : ''}`),
        T(`Here the ${heavy} has ${k} times the mass of the ${light}. What does that do to its weight, and what to the mass in <i>a</i> = ${FG}/<i>m</i>?`,
          `Hier hat ${H.nom} die ${k}-fache Masse der ${Lt.word}. Was bedeutet das für ihre Gewichtskraft, und was für die Masse in <i>a</i> = ${FG}/<i>m</i>?`),
      ],
      steps,
    };
  }

  // ================================================================ rolloff: launched horizontally
  // A ball rolling off a table, a toy car driving off a table, a stone thrown from a cliff, water
  // from a garden hose held level, a crate dropped from a plane. No numbers: the questions are
  // about the path, the horizontal velocity, the fall time compared with a dropped body, and what
  // twice the speed changes.
  // a function: the texts in the current language
  const launches = () => ({
    table: { obj: 'ball', from: 'the edge of the table', after: 'after it leaves the table',
      de: ['f', 'Kugel'], gen: 'der Kugel', deFrom: 'der Tischkante', deAfter: 'nachdem sie den Tisch verlassen hat', deLeft: 'des Tisches', deLeftAcc: 'den Tisch', deEdge: 'der Tischkante',
      twin: T('a second ball', 'eine zweite Kugel'), faster: T('The ball now rolls off the table twice as fast.', 'Die Kugel rollt jetzt doppelt so schnell über die Tischkante.'),
      title: T('Off the edge', 'Über die Kante'),
      situation: T('<p>A ball rolls across a horizontal table and off its edge. Air resistance is negligible.</p>', '<p>Eine Kugel rollt über einen horizontalen Tisch und über die Kante hinaus. Der Luftwiderstand ist vernachlässigbar.</p>') },
    toycar: { obj: 'toy car', from: 'the edge of the table', after: 'after it leaves the table',
      de: ['n', 'Spielzeugauto'], gen: 'des Spielzeugautos', deFrom: 'der Tischkante', deAfter: 'nachdem es den Tisch verlassen hat', deLeft: 'des Tisches', deLeftAcc: 'den Tisch', deEdge: 'der Tischkante',
      twin: T('a marble', 'eine Murmel'), faster: T('The toy car now drives off the table twice as fast.', 'Das Spielzeugauto fährt jetzt doppelt so schnell über die Tischkante.'),
      title: T('Toy car', 'Spielzeugauto'),
      situation: T('<p>A toy car drives across a horizontal table at constant speed and off its edge. Air resistance is negligible.</p>', '<p>Ein Spielzeugauto fährt mit konstanter Geschwindigkeit über einen horizontalen Tisch und über die Kante hinaus. Der Luftwiderstand ist vernachlässigbar.</p>') },
    cliff: { obj: 'stone', from: 'the top of the cliff', after: 'after it leaves the hand',
      de: ['m', 'Stein'], gen: 'des Steins', deFrom: 'der Klippe', deAfter: 'nachdem er die Hand verlassen hat', deLeft: 'der Hand', deLeftAcc: 'die Hand', deEdge: 'dem Abwurf',
      twin: T('a second stone', 'einen zweiten Stein'), faster: T('The stone is now thrown twice as fast.', 'Der Stein wird jetzt doppelt so schnell abgeworfen.'),
      title: T('Thrown from a cliff', 'Von der Klippe'),
      situation: T('<p>From the top of a high cliff, a stone is thrown horizontally. Air resistance is negligible.</p>', '<p>Von einer hohen Klippe wird ein Stein horizontal abgeworfen. Der Luftwiderstand ist vernachlässigbar.</p>') },
    hose: { obj: 'drop', from: 'the nozzle', after: 'after it leaves the nozzle',
      de: ['m', 'Wassertropfen'], gen: 'des Wassertropfens', deFrom: 'der Düse', deAfter: 'nachdem er die Düse verlassen hat', deLeft: 'der Düse', deLeftAcc: 'die Düse', deEdge: 'der Düse',
      twin: T('a marble', 'eine Murmel'), faster: T('The water now comes out of the nozzle twice as fast.', 'Das Wasser spritzt jetzt doppelt so schnell aus der Düse.'),
      title: T('Garden hose', 'Gartenschlauch'),
      situation: T('<p>A gardener holds a garden hose level, so the water leaves the nozzle horizontally. Each drop of water flies on its own; air resistance is negligible.</p>', '<p>Ein Gärtner hält einen Gartenschlauch waagrecht, sodass das Wasser horizontal aus der Düse spritzt. Jeder Wassertropfen fliegt für sich; der Luftwiderstand ist vernachlässigbar.</p>') },
    plane: { obj: 'crate', from: 'the plane', after: 'after it is released',
      de: ['f', 'Kiste'], gen: 'der Kiste', deFrom: 'dem Flugzeug', deAfter: 'nachdem sie ausgeklinkt wurde', deLeft: 'des Flugzeugs', deLeftAcc: 'das Flugzeug', deEdge: 'dem Ausklinken',
      faster: T('The plane now flies twice as fast, at the same height.', 'Das Flugzeug fliegt jetzt in derselben Höhe doppelt so schnell.'),
      title: T('Supply drop', 'Abwurf aus dem Flugzeug'),
      situation: T('<p>A plane flies horizontally at constant speed above flat ground and drops a supply crate. Air resistance is negligible.</p>', '<p>Ein Flugzeug fliegt mit konstanter Geschwindigkeit horizontal über flachem Boden und klinkt eine Versorgungskiste aus. Der Luftwiderstand ist vernachlässigbar.</p>') },
  });

  // Small picture: the launch site and a path from L to the ground.
  function launchPic(variant, d) {
    const L = [30, 28];
    let s = D.ground(0, 150, 100);
    if (variant === 'table' || variant === 'toycar') s += D.table(0, 35, 36, 100);
    if (variant === 'cliff') s += D.rect(0, 35, 36, 65, 'solid', 0);
    if (variant === 'plane') s += D.plane(26, 22, 0.55);
    if (variant === 'hose') s += D.person(6, 100, 84, 1, 'hold') + D.rect(24, 26, 8, 4, 'solid', 1);
    s += D.path(d(L[0], L[1], 94), 'opt-path');
    s += variant === 'plane' ? D.rect(L[0] - 5, L[1] - 4, 10, 8, 'obj', 1) : variant === 'toycar' ? D.car(L[0] - 10, 35, 18) : D.ball(L[0], L[1], variant === 'hose' ? 3 : 6);
    return D.svg(150, 108, s, T('path', 'Bahn'));
  }
  const PATHS = {
    parabola: (x, y, g) => 'M' + Array.from({ length: 21 }, (z, j) => `${D.n(x + 100 * (j / 20))} ${D.n(y + (g - y) * (j / 20) ** 2)}`).join(' L'),
    cartoon: (x, y, g) => `M${x} ${y} H${x + 70} V${g}`,
    late: (x, y, g) => `M${x} ${y} H${x + 46} Q${x + 80} ${y} ${x + 86} ${g}`,
    diagonal: (x, y, g) => `M${x} ${y} L${x + 100} ${g}`,
    vertical: (x, y, g) => `M${x} ${y} V${g}`,
  };

  function rolloff(r, p) {
    const variant = p.variant || r.pick(['table', 'toycar', 'cliff', 'hose', 'plane']);
    const L = launches()[variant], obj = L.obj, N = noun(...L.de);
    const ask = p.ask || r.pick(variant === 'plane' ? ['plane', 'faster'] : ['vx', 'race', 'faster']);
    const FG = F('G');
    const Er = cap(N.er), sein = N.g === 'f' ? 'ihre' : 'seine';

    // ---------------------------------------------------------- figure
    const yG = 215;
    const P0 = { table: [99, 69], toycar: [101, 72], cliff: [92, 62], hose: [98, 104], plane: [80, 60] }[variant];
    const rad = { table: 11, toycar: 8, cliff: 7, hose: 4, plane: 11 }[variant], reach = 220;
    const at = (u) => [P0[0] + reach * u, P0[1] + (yG - rad - P0[1]) * u * u];
    const body = (x, y) => (variant === 'plane' ? D.rect(x - 9, y - 7, 18, 14, 'obj', 1) + D.line(x - 9, y, x + 9, y, 'thin')
      : variant === 'toycar' ? D.car(x - 17, y + 8, 34) : D.ball(x, y, rad));
    const US = [0.2, 0.4, 0.6, 0.8, 1];
    function figure(o = {}) {
      let s = D.ground(0, 380, yG);
      if (variant === 'table' || variant === 'toycar') s += D.table(10, 80, 100, yG);
      if (variant === 'cliff') s += D.rect(0, 70, 100, yG - 70, 'solid', 0);
      if (variant === 'hose') s += D.person(52, yG, 150, 1, 'hold') + D.rect(84, 100, 14, 8, 'solid', 1);
      if (o.trace || o.path) s += D.poly(Array.from({ length: 31 }, (z, j) => at(j / 30)), o.path ? 'trace strong' : 'trace');
      if (o.strobe) US.forEach((u) => { const [x, y] = at(u); s += D.ghost(body(x, y)); });
      if (o.horiz) {
        s += D.line(P0[0], 26, P0[0] + reach, 26, 'guide');
        [0, ...US].forEach((u) => { const [x, y] = at(u); s += D.line(x, 26, x, y, 'guide faint') + D.dot(x, 26); });
        s += D.words(P0[0] + reach / 2, 18, T('equal steps sideways', 'gleiche Schritte seitwärts'));
      }
      if (o.vert) {
        s += D.line(360, P0[1], 360, yG - rad, 'guide');
        [0, ...US].forEach((u) => { const [x, y] = at(u); s += D.line(x, y, 360, y, 'guide faint') + D.dot(360, y); });
        s += D.words(352, P0[1] - 8, T('growing steps down', 'wachsende Schritte nach unten'), 'end');
      }
      if (o.vel) [0, ...US.slice(0, 3)].forEach((u) => { const [x, y] = at(u); s += D.arrow(x, y, x + 30, y + 2 * (yG - rad - P0[1]) * u * (30 / reach), 'v'); });
      if (variant === 'plane') {
        if (o.planes) US.forEach((u) => { s += D.ghost(D.plane(P0[0] + reach * u + 2, 50)); });
        s += D.plane(P0[0] + 2, 50);
      }
      if (o.force) {
        const [x, y] = at(0.5);
        s += body(x, y) + D.arrow(x, y, x, y + 42, 'f', 'F_G');
      } else s += body(P0[0], P0[1]);
      const up = variant === 'plane' ? 26 : variant === 'toycar' ? 8 : 0;
      if (!o.force && !o.vel && !o.strobe) s += D.arrow(P0[0] + 14, P0[1] - up, P0[0] + 62, P0[1] - up, 'v', 'v');
      return D.svg(380, 228, s, T(`A ${obj} launched horizontally from ${L.from}`, `${cap(N.ein)}, horizontal abgeworfen von ${L.deFrom}`));
    }

    // ---------------------------------------------------------- questions
    const pic = (k) => launchPic(variant, PATHS[k]);
    const nothingForward = T(`After it leaves ${L.from}, nothing pushes the ${obj} forward any more — and nothing holds it back either (air resistance is negligible). So its horizontal speed stays the same all the way down`,
      `Nach dem Verlassen ${L.deLeft} treibt nichts ${N.acc} mehr vorwärts — und nichts bremst ${N.ihn} (Luftwiderstand vernachlässigbar). Also bleibt ${sein} horizontale Geschwindigkeit bis zum Boden gleich`);
    const questions = [q(r, 'path', T(`Which path does the ${obj} follow ${L.after}, as seen from the ground?`, `Welche Bahn beschreibt ${N.nom}, ${L.deAfter}, vom Boden aus gesehen?`), [
      o(pic('parabola'), 'ok', T(`Right: it keeps its horizontal speed and at the same time falls faster and faster — a parabola that starts horizontally and gets steeper and steeper.`,
        `Richtig: ${Er} behält ${sein} horizontale Geschwindigkeit und fällt gleichzeitig immer schneller — eine Parabel, die horizontal beginnt und immer steiler wird.`),
        T('a parabola that starts horizontally and gets steeper', 'eine Parabel, die horizontal beginnt und immer steiler wird')),
      o(pic('cartoon'), 'impetus', T(`${nothingForward}, and it starts falling at once: gravity acts from the first moment.`, `${nothingForward}, und ${N.er} beginnt sofort zu fallen: Die Schwerkraft wirkt vom ersten Moment an.`),
        T('straight ahead, then straight down', 'geradeaus, dann senkrecht hinunter')),
      o(pic('late'), 'impetus', T(`There is no stored “forward force” that has to be used up first. Gravity pulls the ${obj} down from the first moment, so the path bends down immediately.`,
        `Es gibt keine gespeicherte „Vorwärtskraft“, die zuerst aufgebraucht werden muss. Die Schwerkraft zieht ${N.acc} vom ersten Moment an nach unten, also krümmt sich die Bahn sofort.`),
        T('straight ahead for a while, then curving down', 'eine Weile geradeaus, dann nach unten gekrümmt')),
      o(pic('diagonal'), 'other', T(`A straight slanted line would need a constant velocity. But the ${obj} falls faster and faster, while it moves forward at constant speed: the path gets steeper and steeper.`,
        `Eine schräge Gerade würde eine konstante Geschwindigkeit bedeuten. ${cap(N.nom)} fällt aber immer schneller, während ${N.er} sich mit konstanter Geschwindigkeit vorwärts bewegt: Die Bahn wird immer steiler.`),
        T('a straight slanted line', 'eine schräge Gerade')),
      o(pic('vertical'), 'active-force', T(`${nothingForward}: it does not need a force to keep moving forward (inertia).`, `${nothingForward}: ${cap(N.er)} braucht keine Kraft, um sich weiter vorwärts zu bewegen (Trägheit).`),
        T('straight down', 'senkrecht hinunter')),
    ], true)];
    const sameTime = T('The time in the air depends only on the height: vertically every body starts with no velocity and falls with the acceleration <i>g</i>, whatever it does horizontally.',
      'Die Zeit in der Luft hängt nur von der Höhe ab: Vertikal startet jeder Körper ohne Geschwindigkeit und fällt mit der Beschleunigung <i>g</i>, egal was er horizontal tut.');
    if (ask === 'plane') {
      questions.push(q(r, 'plane', T('The plane keeps flying straight at the same speed. Where is it when the crate hits the ground?', 'Das Flugzeug fliegt geradeaus mit gleicher Geschwindigkeit weiter. Wo ist es, wenn die Kiste am Boden aufschlägt?'), [
        o(T('Directly above the crate.', 'Genau über der Kiste.'), 'ok', T('Right: the crate keeps the horizontal speed of the plane, so it stays below the plane all the way down.', 'Richtig: Die Kiste behält die horizontale Geschwindigkeit des Flugzeugs, also bleibt sie den ganzen Weg nach unten unter dem Flugzeug.')),
        o(T('Ahead of the crate: the crate slowly falls behind.', 'Vor der Kiste: Die Kiste bleibt langsam zurück.'), 'impetus',
          T(`The crate does not lose its horizontal speed: no force acts on it horizontally (air resistance negligible). It moves forward exactly like the plane.`, `Die Kiste verliert ihre horizontale Geschwindigkeit nicht: Horizontal wirkt keine Kraft auf sie (Luftwiderstand vernachlässigbar). Sie bewegt sich genau wie das Flugzeug vorwärts.`)),
        o(T('Far ahead: the crate lands right below the point where it was released.', 'Weit voraus: Die Kiste landet genau unter dem Punkt, wo sie ausgeklinkt wurde.'), 'active-force',
          T('The crate does not need an engine to keep moving forward: it keeps the plane’s horizontal speed (inertia).', 'Die Kiste braucht keinen Motor, um sich weiter vorwärts zu bewegen: Sie behält die horizontale Geschwindigkeit des Flugzeugs (Trägheit).')),
        o(T('Behind the crate.', 'Hinter der Kiste.'), 'other', T('Nothing drives the crate forward faster than the plane flies: horizontally, no force acts on it at all.', 'Nichts treibt die Kiste schneller vorwärts, als das Flugzeug fliegt: Horizontal wirkt gar keine Kraft auf sie.')),
      ]));
    } else if (ask === 'vx') {
      questions.push(q(r, 'vx', T(`How does the horizontal part of the ${obj}'s velocity change while it falls?`, `Wie ändert sich der horizontale Anteil der Geschwindigkeit ${L.gen}, während ${N.er} fällt?`), [
        o(T(`It stays the same.`, 'Er bleibt gleich.'), 'ok', T(`Right: horizontally no force acts on the ${obj}, so the horizontal part of its velocity does not change.`, `Richtig: Horizontal wirkt keine Kraft auf ${N.acc}, also ändert sich der horizontale Anteil der Geschwindigkeit nicht.`)),
        o(T(`It slowly decreases as the push wears off.`, 'Er nimmt langsam ab, weil der Schwung nachlässt.'), 'impetus', T(`The push is not stored in the ${obj}. ${nothingForward}.`, `Der Stoss wird nicht in ${N.dat} gespeichert. ${nothingForward}.`)),
        o(T(`It drops to zero right after ${L.from}.`, `Er fällt direkt nach ${L.deEdge} auf null.`), 'active-force', `${nothingForward}.`),
        o(T(`It increases, because gravity speeds the ${obj} up.`, `Er nimmt zu, weil die Schwerkraft ${N.acc} schneller macht.`), 'other',
          T(`Gravity points straight down: it only changes the vertical part of the velocity. The horizontal part stays the same.`, `Die Schwerkraft zeigt senkrecht nach unten: Sie ändert nur den vertikalen Anteil der Geschwindigkeit. Der horizontale Anteil bleibt gleich.`)),
      ]));
    } else if (ask === 'race') {
      questions.push(q(r, 'race', T(`At the moment the ${obj} leaves ${L.from}, ${L.twin} is simply dropped from the same height. Which one reaches the ground first?`,
        `Im selben Moment, in dem ${N.nom} ${L.deLeftAcc} verlässt, lässt jemand ${L.twin} aus derselben Höhe einfach fallen. Was kommt zuerst am Boden an?`), [
        o(T('Both at the same time.', 'Beide gleichzeitig.'), 'ok', `${T('Right.', 'Richtig.')} ${sameTime}`),
        o(T('The dropped one: its way down is shorter.', 'Der fallen gelassene Körper: Sein Weg nach unten ist kürzer.'), 'other',
          T(`The ${obj}'s path is longer, but it covers the extra distance sideways at the same time as it falls. ${sameTime}`, `Die Bahn ${L.gen} ist länger, aber den zusätzlichen Weg seitwärts legt ${N.er} gleichzeitig mit dem Fallen zurück. ${sameTime}`)),
        o(T(`The dropped one: the ${obj}'s forward motion keeps it up for a while.`, `Der fallen gelassene Körper: Die Vorwärtsbewegung hält ${N.acc} eine Weile oben.`), 'impetus',
          T(`Nothing holds the ${obj} up: from the first moment only its weight acts, straight down. ${sameTime}`, `Nichts hält ${N.acc} oben: Vom ersten Moment an wirkt nur ${sein} Gewichtskraft, senkrecht nach unten. ${sameTime}`)),
        o(T(`The ${obj}: it is faster.`, `${cap(N.nom)}: ${Er} ist schneller.`), 'other',
          T(`Its extra speed is horizontal, so it does not help it down. ${sameTime}`, `${cap(sein)} zusätzliche Geschwindigkeit ist horizontal und hilft nicht nach unten. ${sameTime}`)),
      ]));
    } else {
      questions.push(q(r, 'faster', T(`${L.faster} What changes for the ${obj}?`, `${L.faster} Was ändert sich für ${N.acc}?`), [
        o(T('It is in the air just as long and lands twice as far away.', `${Er} ist gleich lange in der Luft und landet doppelt so weit entfernt.`), 'ok',
          T(`Right. ${sameTime} In that same time it moves twice as fast sideways, so it gets twice as far.`, `Richtig. ${sameTime} In derselben Zeit bewegt ${N.er} sich seitwärts doppelt so schnell, also kommt ${N.er} doppelt so weit.`)),
        o(T('It is in the air longer, because it first flies straight ahead for longer, and lands more than twice as far away.', `${Er} ist länger in der Luft, weil ${N.er} zuerst länger geradeaus fliegt, und landet mehr als doppelt so weit entfernt.`), 'impetus',
          T(`The ${obj} does not fly straight ahead first: gravity pulls it down from the first moment. ${sameTime}`, `${cap(N.nom)} fliegt nicht zuerst geradeaus: Die Schwerkraft zieht ${N.ihn} vom ersten Moment an nach unten. ${sameTime}`)),
        o(T('It is in the air for a shorter time and lands about as far away.', `${Er} ist kürzer in der Luft und landet etwa gleich weit entfernt.`), 'other',
          T(`The extra speed is horizontal: it does not make the ${obj} fall faster. ${sameTime}`, `Die zusätzliche Geschwindigkeit ist horizontal: Sie lässt ${N.acc} nicht schneller fallen. ${sameTime}`)),
        o(T('It is in the air just as long and lands just as far away.', `${Er} ist gleich lange in der Luft und landet gleich weit entfernt.`), 'other',
          T(`The fall time is the same, but during it the ${obj} keeps twice the horizontal speed, so it gets twice as far.`, `Die Fallzeit ist gleich, aber während dieser Zeit behält ${N.nom} die doppelte horizontale Geschwindigkeit, also kommt ${N.er} doppelt so weit.`)),
      ]));
    }

    // ---------------------------------------------------------- solution
    const steps = [
      { title: T('Forces after release', 'Kräfte nach dem Loslassen'), figure: figure({ trace: true, force: true }),
        text: T(`Once the ${obj} has left ${L.from}, nothing touches it (air resistance is negligible). The only force is its weight ${FG}, straight down. There is no forward force: the push that started the motion stopped at the moment of release.`,
          `Sobald ${N.nom} ${L.deLeftAcc} verlassen hat, berührt ${N.ihn} nichts mehr (Luftwiderstand vernachlässigbar). Die einzige Kraft ist die Gewichtskraft ${FG}, senkrecht nach unten. Es gibt keine Vorwärtskraft: Was die Bewegung ausgelöst hat, wirkt nach dem Loslassen nicht mehr.`) },
      { title: T('Horizontally: no force', 'Horizontal: keine Kraft'), figure: figure({ trace: true, strobe: true, horiz: true }),
        text: T(`No horizontal force, so the horizontal velocity stays the same (first law). In equal time intervals the ${obj} moves equal distances forward.`,
          `Keine horizontale Kraft, also bleibt die horizontale Geschwindigkeit gleich (erstes Newtonsches Gesetz). In gleichen Zeitabständen legt ${N.nom} gleiche Strecken vorwärts zurück.`) },
      { title: T('Vertically: constant force', 'Vertikal: konstante Kraft'), figure: figure({ trace: true, strobe: true, vert: true }),
        text: T(`Vertically, the weight gives a constant acceleration <i>g</i> downward, just as for a dropped ${obj}. The distances fallen in equal time intervals grow like 1 : 3 : 5 : 7 …`,
          `Vertikal bewirkt die Gewichtskraft eine konstante Beschleunigung <i>g</i> nach unten, genau wie beim freien Fall. Die in gleichen Zeitabständen gefallenen Strecken wachsen wie 1 : 3 : 5 : 7 …`) },
      { title: T('The path', 'Die Bahn'), figure: figure({ path: true, strobe: true, vel: true, planes: variant === 'plane' }),
        text: T(`Together: a parabola that starts horizontally and gets steeper and steeper. The velocity arrows keep their horizontal part, while their downward part grows. `,
          `Zusammen: eine Parabel, die horizontal beginnt und immer steiler wird. Die Geschwindigkeitspfeile behalten ihren horizontalen Anteil, während ihr Anteil nach unten wächst. `) +
          (variant === 'plane'
            ? T('The crate keeps the plane’s horizontal speed, so it stays directly below the plane. ', 'Die Kiste behält die horizontale Geschwindigkeit des Flugzeugs, also bleibt sie genau unter ihm. ')
            : '') +
          T(`The ${obj} is in the air just as long as a body dropped from the same height; twice the speed would carry it twice as far in that time.`,
            `${cap(N.nom)} ist gleich lange in der Luft wie ein Körper, der aus derselben Höhe einfach fallen gelassen wird; mit doppelter Geschwindigkeit käme ${N.er} in dieser Zeit doppelt so weit.`) },
    ];

    return {
      title: L.title,
      situation: L.situation,
      figure: figure(),
      questions,
      hints: [
        T(`The ${obj} leaves ${L.from} horizontally. Just after that, what still touches it? Which force acts on it, and is there still anything that pushes it forward?`,
          `${cap(N.nom)} verlässt ${L.deLeftAcc} horizontal. Was berührt ${N.ihn} direkt danach noch? Welche Kraft wirkt auf ${N.ihn}, und treibt ${N.ihn} noch etwas vorwärts?`),
        T(`Plan: split the motion of the ${obj} into a horizontal and a vertical part and treat each on its own; ${{ plane: 'then compare the horizontal motion of the crate with that of the plane', vx: 'then ask what happens to the horizontal part', race: `then compare the vertical motion of the ${obj} with that of ${L.twin} that is just dropped`, faster: 'then ask which part a faster launch changes: the horizontal or the vertical one' }[ask]}.`,
          `Plan: Zerlege die Bewegung ${L.gen} in einen horizontalen und einen vertikalen Teil und behandle jeden für sich; ${{ plane: 'vergleiche dann die horizontale Bewegung der Kiste mit der des Flugzeugs', vx: 'frage dich dann, was mit dem horizontalen Teil passiert', race: `vergleiche dann die vertikale Bewegung ${L.gen} mit der von ${L.twin}, die einfach fallen gelassen wird`, faster: 'frage dich dann, welchen Teil ein schnellerer Abwurf ändert: den horizontalen oder den vertikalen' }[ask]}.`),
        T(`Second law, for each direction on its own: <i>a</i><sub>x</sub> = <i>F</i><sub>x</sub>/<i>m</i>, <i>a</i><sub>y</sub> = <i>F</i><sub>y</sub>/<i>m</i>. The only force on the ${obj}, ${FG}, points straight down: what are <i>F</i><sub>x</sub> and <i>F</i><sub>y</sub>?`,
          `Zweites Gesetz, für jede Richtung einzeln: <i>a</i><sub>x</sub> = <i>F</i><sub>x</sub>/<i>m</i>, <i>a</i><sub>y</sub> = <i>F</i><sub>y</sub>/<i>m</i>. Die einzige Kraft auf ${N.acc}, ${FG}, zeigt senkrecht nach unten: Wie gross sind <i>F</i><sub>x</sub> und <i>F</i><sub>y</sub>?`),
        T(`So in equal time steps the ${obj} moves equal distances forward and growing distances down (1 : 3 : 5 …). Which path${ask === 'plane' ? ', and which position of the plane,' : ''} fits that?`,
          `In gleichen Zeitschritten legt ${N.nom} also gleiche Strecken vorwärts und wachsende Strecken nach unten zurück (1 : 3 : 5 …). Welche Bahn${ask === 'plane' ? ' und welche Position des Flugzeugs' : ''} passt dazu?`),
      ],
      steps,
    };
  }

  // ================================================================ throw: forces during flight
  const PHASE_WORDS = {
    rising: ['on its way up', 'auf dem Weg nach oben'],
    top: ['at its highest point', 'im höchsten Punkt'],
    falling: ['on its way down', 'auf dem Weg nach unten'],
  };
  const THROWN = { ball: 'Ball', stone: 'Stein', 'tennis ball': 'Tennisball' }; // all masculine

  function throwForces(r, p) {
    const kind = p.kind || r.pick(['vertical', 'oblique']);
    const phase = p.phase || r.pick(['rising', 'top', 'falling']);
    const obj = p.obj || r.pick(['ball', 'stone', 'tennis ball']);
    const N = noun('m', THROWN[obj]);
    const vertical = kind === 'vertical', top = phase === 'top';
    const motion = vertical ? (phase === 'rising' ? T('upward', 'nach oben') : T('downward', 'nach unten')) : T('along the path', 'entlang der Bahn');
    const FG = F('G'), Fnet = F('net');

    // ---------------------------------------------------------- figure
    let P, V, traj;
    if (vertical) {
      // up and down drawn side by side, joined by a tight turn at the top (not a wide arc)
      traj = D.path('M146 205 V44 A9 9 0 0 1 164 44 V205', 'trace');
      P = { rising: [146, 125], top: [155, 35], falling: [164, 125] }[phase];
      V = { rising: [0, -46], top: [0, 0], falling: [0, 46] }[phase];
    } else {
      const y = (x) => 205 - 155 * (1 - ((x - 190) / 150) ** 2);
      const slope = (x) => (2 * 155 * (x - 190)) / 150 ** 2;
      traj = D.poly(Array.from({ length: 31 }, (z, j) => [40 + 10 * j, y(40 + 10 * j)]), 'trace');
      const x = { rising: 94, top: 190, falling: 280 }[phase];
      P = [x, y(x)];
      V = [34, 34 * slope(x)];
    }
    const W = vertical ? 300 : 380;
    function figure(o = {}) {
      let s = D.ground(10, W - 10, 216) + traj;
      if (o.strobe) {
        const pts = vertical
          ? [[146, 170, 0, -46], [146, 120, 0, -34], [146, 80, 0, -20], [164, 80, 0, 20], [164, 120, 0, 34], [164, 160, 0, 46]]
          : [60, 120, 190, 260, 320].map((x) => { const y = 205 - 155 * (1 - ((x - 190) / 150) ** 2); return [x, y, 34, 34 * (2 * 155 * (x - 190)) / 150 ** 2]; });
        pts.forEach(([x, y, vx, vy]) => { s += D.ghost(D.ball(x, y, 8)) + D.arrow(x, y, x + vx, y + vy, 'v'); });
      }
      s += D.ball(P[0], P[1], 9) + D.text(P[0] - 14, P[1] + 5, 'P', 'lbl', 'end');
      if (!o.strobe && !o.force) {
        if (V[0] || V[1]) s += D.arrow(P[0], P[1], P[0] + V[0], P[1] + V[1], 'v', 'v');
        else s += D.text(P[0] + 16, P[1] - 4, 'v = 0', 'lbl v', 'start');
      }
      if (o.force) s += D.arrow(P[0], P[1], P[0], P[1] + 44, 'f', 'F_G', { at: [P[0] + 8, P[1] + 46], anchor: 'start' });
      if (o.acc) s += D.arrow(P[0] - 22, P[1] + 4, P[0] - 22, P[1] + 40, 'a', 'a = g', { at: [P[0] - 28, P[1] + 38], anchor: 'end' });
      if (vertical) s += D.words(W / 2, 238, T('up and down drawn side by side', 'Auf- und Abweg nebeneinander gezeichnet'));
      return D.svg(W, vertical ? 246 : 226, s, T(`A ${obj} in flight at the point P`, `${cap(N.ein)} im Flug im Punkt P`));
    }

    // ---------------------------------------------------------- questions
    const only = T(`Right: nothing touches the ${obj} any more, so the only force is gravity — at every point of the flight.`,
      `Richtig: Nichts berührt ${N.acc} mehr, also ist die Schwerkraft die einzige Kraft — in jedem Punkt des Flugs.`);
    const noThrowForce = T(`The hand pushes only while it touches the ${obj}. After release there is no “force of the throw”: the ${obj} keeps moving because it already has a velocity (inertia), and gravity changes that velocity.`,
      `Die Hand stösst nur, solange sie ${N.acc} berührt. Nach dem Loslassen gibt es keine „Wurfkraft“: ${cap(N.nom)} bewegt sich weiter, weil er schon eine Geschwindigkeit hat (Trägheit), und die Schwerkraft ändert diese Geschwindigkeit.`);
    const noMotionForce = T(`A body does not need a force in the direction it moves. The ${obj} moves ${motion} because it already has that velocity; the only force on it is gravity.`,
      `Ein Körper braucht keine Kraft in Bewegungsrichtung. ${cap(N.nom)} bewegt sich ${motion}, weil er diese Geschwindigkeit schon hat; die einzige Kraft auf ihn ist die Schwerkraft.`);
    const stillPulled = T(`Gravity does not depend on the motion. At the highest point the ${vertical ? '' : 'vertical '}velocity is zero at that instant, but the ${obj} is still pulled down with ${FG} = <i>m·g</i> — otherwise it would stay up there.`,
      `Die Schwerkraft hängt nicht von der Bewegung ab. Im höchsten Punkt ist die ${vertical ? '' : 'vertikale '}Geschwindigkeit in diesem Augenblick null, aber ${N.nom} wird weiterhin mit ${FG} = <i>m·g</i> nach unten gezogen — sonst bliebe er dort oben.`);
    const forceOpts = {
      rising: [
        o(T(`Its weight and the force of the throw, which gets smaller as it rises.`, 'Die Gewichtskraft und die Wurfkraft, die beim Steigen kleiner wird.'), 'impetus', noThrowForce),
        o(T(`Its weight and a force ${vertical ? 'upward' : 'along the path'}, larger than the weight.`, `Die Gewichtskraft und eine Kraft ${vertical ? 'nach oben' : 'entlang der Bahn'}, die grösser ist als die Gewichtskraft.`), 'active-force', noMotionForce),
        o(T(`Only ${vertical ? 'an upward' : 'a forward'} force; the weight acts only on the way down.`, `Nur eine Kraft ${vertical ? 'nach oben' : 'nach vorn'}; die Gewichtskraft wirkt erst auf dem Weg nach unten.`), 'other',
          T(`The weight ${FG} = <i>m·g</i> acts all the time, also on the way up: that is what slows the ${obj}'s rise.`, `Die Gewichtskraft ${FG} = <i>m·g</i> wirkt die ganze Zeit, auch auf dem Weg nach oben: Sie bremst den Aufstieg.`)),
      ],
      top: vertical ? [
        o(T('No force at all, since its velocity is zero there.', 'Gar keine Kraft, da seine Geschwindigkeit dort null ist.'), 'rest-no-force', stillPulled),
        o(T('Its weight and an upward force just as large, so that its velocity is zero there.', 'Die Gewichtskraft und eine gleich grosse Kraft nach oben, sodass seine Geschwindigkeit dort null ist.'), 'rest-no-force',
          stillPulled + T(' Nothing pushes up on it.', ' Nichts drückt ihn nach oben.')),
        o(T('Its weight and the force of the throw, which is now just as large as the weight.', 'Die Gewichtskraft und die Wurfkraft, die jetzt gerade gleich gross ist wie die Gewichtskraft.'), 'impetus', noThrowForce),
      ] : [
        o(T(`Its weight and a horizontal force in the direction of motion.`, 'Die Gewichtskraft und eine horizontale Kraft in Bewegungsrichtung.'), 'active-force', noMotionForce),
        o(T(`Only the force of the throw, horizontally: here it neither rises nor falls.`, 'Nur die Wurfkraft, horizontal: Hier steigt und fällt er nicht.'), 'impetus', noThrowForce + ' ' + stillPulled),
        o(T('No force at all, since it neither rises nor falls at this point.', 'Gar keine Kraft, da er in diesem Punkt weder steigt noch fällt.'), 'rest-no-force', stillPulled),
      ],
      falling: [
        o(T(`Its weight and a force ${vertical ? 'downward' : 'along the path'}, in the direction of motion.`, `Die Gewichtskraft und eine Kraft ${vertical ? 'nach unten' : 'entlang der Bahn'}, in Bewegungsrichtung.`), 'active-force', noMotionForce),
        o(T(`Its weight and what is left of the force of the throw.`, 'Die Gewichtskraft und der Rest der Wurfkraft.'), 'impetus', noThrowForce),
        o(T('Only its weight, which is larger now than on the way up.', 'Nur die Gewichtskraft, die jetzt grösser ist als auf dem Weg nach oben.'), 'other',
          T(`The weight ${FG} = <i>m·g</i> does not depend on the direction of motion: it is the same at every point of the flight.`, `Die Gewichtskraft ${FG} = <i>m·g</i> hängt nicht von der Bewegungsrichtung ab: Sie ist in jedem Punkt des Flugs gleich.`)),
      ],
    }[phase];
    const zeroWhy = stillPulled + T(` The velocity is changing at this very moment, so the acceleration is not zero: it is <i>g</i>, downward.`, ` Die Geschwindigkeit ändert sich genau in diesem Moment, also ist die Beschleunigung nicht null: Sie ist <i>g</i>, nach unten.`);
    const alongNet = T(' Its acceleration points along the net force: straight down.', ' Seine Beschleunigung zeigt in Richtung der resultierenden Kraft: senkrecht nach unten.');
    const gEvery = T(`The acceleration is ${FG}/<i>m</i> = <i>g</i> at every point; the direction of motion does not matter.`, `Die Beschleunigung ist in jedem Punkt ${FG}/<i>m</i> = <i>g</i>; die Bewegungsrichtung spielt keine Rolle.`);
    const smallerG = T(`Straight down, but smaller than g, because the throw still pushes up a little.`, 'Senkrecht nach unten, aber kleiner als g, weil der Wurf noch etwas nach oben drückt.');
    const largerG = T('Straight down, and larger than g, because it is now falling.', 'Senkrecht nach unten und grösser als g, weil er jetzt fällt.');
    const along = T('Along the path, in the direction of motion.', 'Entlang der Bahn, in Bewegungsrichtung.');
    const accOpts = {
      'vertical-rising': [
        o(T('Straight up, in the direction of motion.', 'Senkrecht nach oben, in Bewegungsrichtung.'), 'active-force',
          T(`The ${obj} slows down on its way up: its velocity points up, but the change of velocity points down. The acceleration is the change of velocity per time.`,
            `${cap(N.nom)} wird auf dem Weg nach oben langsamer: Seine Geschwindigkeit zeigt nach oben, aber die Änderung der Geschwindigkeit nach unten. Die Beschleunigung ist die Geschwindigkeitsänderung pro Zeit.`)),
        o(T('Straight down, but smaller than g, because the throw still pushes up.', 'Senkrecht nach unten, aber kleiner als g, weil der Wurf noch nach oben drückt.'), 'impetus', noThrowForce),
      ],
      'vertical-top': [
        o(T(`It is zero, because the velocity of the ${obj} is zero there.`, `Sie ist null, weil ${N.nom} dort die Geschwindigkeit null hat.`), 'rest-no-force', zeroWhy),
        o(smallerG, 'impetus', noThrowForce),
      ],
      'vertical-falling': [
        o(largerG, 'other', gEvery),
        o(smallerG, 'impetus', noThrowForce),
      ],
      'oblique-rising': [
        o(along, 'active-force', noMotionForce + alongNet),
        o(T(`Along the path, backward, since the ${obj} is slowing down.`, `Entlang der Bahn nach hinten, da ${N.nom} langsamer wird.`), 'other',
          T(`Only the vertical part of the velocity changes; the horizontal part stays the same. So the change of velocity points straight down.`, `Nur der vertikale Anteil der Geschwindigkeit ändert sich; der horizontale bleibt gleich. Also zeigt die Geschwindigkeitsänderung senkrecht nach unten.`)),
      ],
      'oblique-top': [
        o(T('Horizontal, in the direction of motion.', 'Horizontal, in Bewegungsrichtung.'), 'active-force', noMotionForce + alongNet),
        o(T(`It is zero, because the ${obj} neither rises nor falls here.`, `Sie ist null, weil ${N.nom} hier weder steigt noch fällt.`), 'rest-no-force', zeroWhy),
      ],
      'oblique-falling': [
        o(along, 'active-force', noMotionForce + alongNet),
        o(largerG, 'other', gEvery),
      ],
    }[`${kind}-${phase}`];
    const questions = [
      q(r, 'forces', T(`Which forces act on the ${obj} at P?`, `Welche Kräfte wirken im Punkt P auf ${N.acc}?`), [o(T(`Only its weight ${FG}, pointing straight down.`, `Nur die Gewichtskraft ${FG}, senkrecht nach unten.`), 'ok', only), ...forceOpts]),
      q(r, 'acc', T(`Which way does the acceleration of the ${obj} point at P?`, `Wohin zeigt die Beschleunigung ${obj === 'stone' ? 'des Steins' : `des ${N.word}s`} im Punkt P?`), [
        o(T('Straight down, with size g.', 'Senkrecht nach unten, mit dem Betrag g.'), 'ok',
          T(`Right: <i>a</i> = ${FG}/<i>m</i> = <i>g</i>, straight down, at every point of the flight${top ? ' — also at the highest point' : ''}.`,
            `Richtig: <i>a</i> = ${FG}/<i>m</i> = <i>g</i>, senkrecht nach unten, in jedem Punkt des Flugs${top ? ' — auch im höchsten Punkt' : ''}.`)),
        ...accOpts]),
    ];

    // ---------------------------------------------------------- solution
    const steps = [
      { title: T('Which forces?', 'Welche Kräfte?'), figure: figure({ force: true }),
        text: T(`A force needs something that exerts it. What touches the ${obj} at P? Nothing: the hand has let go, and air resistance is negligible. What acts from a distance? The gravity of the Earth. So the only force is the weight ${FG} = <i>m·g</i>, straight down.`,
          `Eine Kraft braucht etwas, das sie ausübt. Was berührt ${N.acc} im Punkt P? Nichts: Die Hand hat losgelassen, und der Luftwiderstand ist vernachlässigbar. Was wirkt aus der Ferne? Die Schwerkraft der Erde. Die einzige Kraft ist also die Gewichtskraft ${FG} = <i>m·g</i>, senkrecht nach unten.`) },
      { title: T('Velocity is not a force', 'Geschwindigkeit ist keine Kraft'), figure: figure({ strobe: true }),
        text: T(`The ${obj} ${top ? (vertical ? 'got up to P' : 'moves on at P') : `moves ${motion} at P`} because it already has a velocity — no force is needed to keep a velocity (inertia). The weight changes the velocity: ${vertical ? `on the way up it makes the ${obj} slower, on the way down faster` : 'it makes the vertical part smaller on the way up and larger on the way down, while the horizontal part stays the same'}.`,
          `${cap(N.nom)} ${top ? (vertical ? 'ist bis P gekommen' : 'bewegt sich in P weiter') : `bewegt sich in P ${motion}`}, weil er schon eine Geschwindigkeit hat — um eine Geschwindigkeit beizubehalten, braucht es keine Kraft (Trägheit). Die Gewichtskraft ändert die Geschwindigkeit: ${vertical ? `Auf dem Weg nach oben macht sie ${N.acc} langsamer, auf dem Weg nach unten schneller` : 'Sie macht den vertikalen Anteil auf dem Weg nach oben kleiner und auf dem Weg nach unten grösser, während der horizontale Anteil gleich bleibt'}.`) },
      { title: T('Acceleration', 'Beschleunigung'), figure: figure({ force: true, acc: true }),
        text: T(`Newton's second law: <i>a</i> = ${Fnet}/<i>m</i> = ${FG}/<i>m</i> = <i>g</i>, straight down, at every point of the flight. ${top ? `At the highest point the ${vertical ? '' : 'vertical '}velocity is zero at that instant, but it is still changing, from up to down: the acceleration is not zero.` : `It does not matter which way the ${obj} moves.`}`,
          `Zweites Newtonsches Gesetz: <i>a</i> = ${Fnet}/<i>m</i> = ${FG}/<i>m</i> = <i>g</i>, senkrecht nach unten, in jedem Punkt des Flugs. ${top ? `Im höchsten Punkt ist die ${vertical ? '' : 'vertikale '}Geschwindigkeit in diesem Augenblick null, aber sie ändert sich gerade, von oben nach unten: Die Beschleunigung ist nicht null.` : `Es spielt keine Rolle, in welche Richtung sich ${N.nom} bewegt.`}`) },
    ];

    const pw = T(PHASE_WORDS[phase][0], PHASE_WORDS[phase][1]);
    return {
      title: vertical ? T('Thrown straight up', 'Senkrecht nach oben geworfen') : T('Thrown at an angle', 'Schräg geworfen'),
      situation: vertical
        ? T(`<p>A ${obj} is thrown straight up. It rises, turns round at its highest point and falls back down. Air resistance is negligible. We look at the ${obj} at the point P, ${pw}.</p>`,
          `<p>${cap(N.ein)} wird senkrecht nach oben geworfen. Er steigt, kehrt im höchsten Punkt um und fällt wieder hinunter. Der Luftwiderstand ist vernachlässigbar. Wir betrachten ${N.acc} im Punkt P, ${pw}.</p>`)
        : T(`<p>A ${obj} is thrown at an angle and flies along a curved path. Air resistance is negligible. We look at the ${obj} at the point P, ${pw}.</p>`,
          `<p>${cap(N.ein)} wird schräg geworfen und fliegt auf einer gekrümmten Bahn. Der Luftwiderstand ist vernachlässigbar. Wir betrachten ${N.acc} im Punkt P, ${pw}.</p>`),
      figure: figure(),
      questions,
      hints: [
        T(`At P the ${obj} is ${pw}: ${top ? (vertical ? 'for an instant it is at rest' : 'it moves horizontally') : `it moves ${motion}`}. The hand has let go long before. What touches the ${obj} at P? What acts on it from a distance?`,
          `In P ist ${N.nom} ${pw}: ${top ? (vertical ? 'Für einen Augenblick ist er in Ruhe' : 'Er bewegt sich horizontal') : `Er bewegt sich ${motion}`}. Die Hand hat ihn längst losgelassen. Was berührt ${N.acc} in P? Was wirkt aus der Ferne auf ihn?`),
        T(`Plan: list the forces on the ${obj} at P (each needs something that exerts it), then the second law gives its acceleration at P. The velocity arrow at P is not a force.`,
          `Plan: Zähle die Kräfte auf ${N.acc} in P auf (jede braucht etwas, das sie ausübt); das zweite Gesetz ergibt dann die Beschleunigung in P. Der Geschwindigkeitspfeil in P ist keine Kraft.`),
        T(`At P: <i>a</i> = ${Fnet}/<i>m</i>, with ${Fnet} the sum of the forces you found — ${top ? `even though the ${vertical ? '' : 'vertical '}velocity is zero there` : `whether or not one of them points ${motion}`}.`,
          `In P: <i>a</i> = ${Fnet}/<i>m</i>, wobei ${Fnet} die Summe der gefundenen Kräfte ist — ${top ? `auch wenn die ${vertical ? '' : 'vertikale '}Geschwindigkeit dort null ist` : `ob eine davon ${motion} zeigt oder nicht`}.`),
        T(`Here nothing touches the ${obj}; only the Earth pulls on it, with ${FG} = <i>m·g</i>. ${top ? 'Is the velocity still changing at P?' : `It moves ${motion} because of its velocity, not because of a force.`}`,
          `Hier berührt nichts ${N.acc}; nur die Erde zieht an ihm, mit ${FG} = <i>m·g</i>. ${top ? 'Ändert sich die Geschwindigkeit in P noch?' : `Er bewegt sich ${motion} wegen seiner Geschwindigkeit, nicht wegen einer Kraft.`}`),
      ],
      steps,
    };
  }

  register('gravity', 'drop', drop);
  register('gravity', 'rolloff', rolloff);
  register('gravity', 'throw', throwForces);
})(typeof window !== 'undefined' ? window : globalThis);
