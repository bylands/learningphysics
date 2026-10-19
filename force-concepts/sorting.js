// Sorting and matching: rank the cable force of an elevator in four states of motion (and match
// each with the direction of its net force), and match situations with free-body diagrams.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, F, FL, cap, rank, match, ranksOf, register } = FC;
  const LETTERS = 'ABCDEF';
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // ================================================================ elevator: rank the cable force
  const CASES = [[1, 1], [1, 0], [1, -1], [-1, 1], [-1, 0], [-1, -1], [0, 0]]; // [direction, speed change]

  function rankElevator(r) {
    // Four cases with at least one tie between different motions, where neither the direction of
    // motion nor speeding up/slowing down alone gives the right order.
    let cs;
    for (let tries = 0; tries < 200; tries++) {
      cs = r.shuffle(CASES).slice(0, 4);
      const a = cs.map(([d, s]) => d * s), rk = ranksOf(a);
      const tie = rk.some((x, i) => rk.indexOf(x) !== i);
      if (new Set(a).size >= 2 && tie && !same(ranksOf(cs.map(([d]) => d)), rk) && !same(ranksOf(cs.map(([, s]) => s)), rk)) break;
    }
    const acc = cs.map(([d, s]) => d * s);
    const moving = (d) => (d > 0 ? T('moving up', 'fährt hoch') : d < 0 ? T('moving down', 'fährt runter') : T('at rest', 'steht still'));
    const change = (d, s) => (d === 0 ? '' : s > 0 ? T('speeding up', 'wird schneller') : s < 0 ? T('slowing down', 'wird langsamer') : T('constant speed', 'gleich schnell'));
    const describe = ([d, s]) => (d === 0 ? moving(d) : `${moving(d)}, ${change(d, s)}`);
    const accWord = (a) => (a > 0 ? T('up', 'nach oben') : a < 0 ? T('down', 'nach unten') : T('zero', 'null'));
    const FT = F('T'), FG = F('G');

    // ---------------------------------------------------------- figure: four panels A–D
    function figure(o = {}) {
      let g = '';
      cs.forEach(([d, s], i) => {
        const x0 = i * 110, cy = 92;
        g += D.text(x0 + 10, 22, LETTERS[i], 'lbl', 'start');
        g += D.ceiling(x0 + 22, x0 + 88, 30) + D.line(x0 + 26, 30, x0 + 26, 150, 'shaft') + D.line(x0 + 84, 30, x0 + 84, 150, 'shaft');
        g += D.elevator(x0 + 36, cy - 18, 38, 36, 30);
        if (d && !o.forces) g += D.arrow(x0 + 97, cy + 22 * d, x0 + 97, cy - 22 * d, 'v', 'v', { at: [x0 + 100, d > 0 ? cy - 28 : cy + 36], anchor: 'middle' });
        if (o.acc) g += acc[i] ? D.arrow(x0 + 12, cy + 16 * acc[i], x0 + 12, cy - 16 * acc[i], 'a', '') : D.text(x0 + 12, cy + 4, 'a=0', 'lbl a small');
        if (o.forces) {
          // Both forces start at the dot in the middle of the cabin, so their lengths compare
          // directly: the weight is always 34, the cable force 34 ± 14 with the acceleration.
          const cx = x0 + 55, lt = 34 + 14 * acc[i];
          g += D.arrow(cx, cy, cx, cy - lt, 'f', FL('T'), { at: [cx + 7, cy - lt - 1], anchor: 'start' });
          g += D.arrow(cx, cy, cx, cy + 34, 'f', FL('G'), { at: [cx + 7, cy + 34], anchor: 'start' });
          g += D.dot(cx, cy, 3, 'pt');
        }
        g += D.words(x0 + 55, 168, moving(d)) + D.words(x0 + 55, 182, change(d, s));
      });
      return D.svg(440, 190, g, T('Four elevator cabins A to D in different states of motion', 'Vier Liftkabinen A bis D in verschiedenen Bewegungszuständen'));
    }

    // ---------------------------------------------------------- questions
    const items = cs.map((c, i) => ({
      label: `<b>${LETTERS[i]}</b> ${describe(c)}`, name: LETTERS[i], value: acc[i],
      alt: { velocity: c[0], speedup: c[1] },
    }));
    const rule = T(`The tension is ${FT} = <i>m</i>(<i>g</i> + <i>a</i>), with <i>a</i> counted upward: it depends on the acceleration, not on the velocity.`,
      `Die Seilkraft ist ${FT} = <i>m</i>(<i>g</i> + <i>a</i>), mit <i>a</i> nach oben positiv: Sie hängt von der Beschleunigung ab, nicht von der Geschwindigkeit.`);
    const sorting = rank('tension', T('Rank the cable force in the four cases, from the largest (1) to the smallest. Equal forces get the same rank.',
      'Ordne die Seilkraft in den vier Fällen, von der grössten (1) zur kleinsten. Gleich grosse Kräfte bekommen denselben Rang.'), items, [
      { key: 'velocity', code: 'active-force', why: T(`You ranked by the direction of motion: moving up → large force, moving down → small force. But moving up does not need a net force up. ${rule}`,
        `Du hast nach der Bewegungsrichtung geordnet: nach oben → grosse Kraft, nach unten → kleine Kraft. Um nach oben zu fahren, braucht es aber keine resultierende Kraft nach oben. ${rule}`) },
      { key: 'speedup', code: 'other', why: T(`You ranked by “speeding up” and “slowing down” alone. A cabin that speeds up while moving down accelerates downward: the cable pulls less. ${rule}`,
        `Du hast nur nach „wird schneller“ und „wird langsamer“ geordnet. Eine Kabine, die nach unten schneller wird, beschleunigt nach unten: Das Seil zieht weniger. ${rule}`) },
    ], T(`Right. ${rule}`, `Richtig. ${rule}`));
    const choices = [
      { id: 'up', label: T('up', 'nach oben'), name: T('up', 'nach oben') },
      { id: 'zero', label: T('zero (no net force)', 'null (keine resultierende Kraft)'), name: T('zero', 'null') },
      { id: 'down', label: T('down', 'nach unten'), name: T('down', 'nach unten') },
    ];
    const idOf = (a) => (a > 0 ? 'up' : a < 0 ? 'down' : 'zero');
    const matching = match('net', T('Match each case with the direction of the net force on the cabin.', 'Ordne jedem Fall die Richtung der resultierenden Kraft auf die Kabine zu.'),
      cs.map(([d, s], i) => {
        const right = idOf(acc[i]), vel = idOf(d), wrong = {};
        if (vel !== right) wrong[vel] = { code: 'active-force', why: T(`Case ${LETTERS[i]}: the net force does not point the way the cabin moves, but the way it accelerates.`, `Fall ${LETTERS[i]}: Die resultierende Kraft zeigt nicht in Bewegungsrichtung, sondern in Richtung der Beschleunigung.`) };
        return {
          label: `<b>${LETTERS[i]}</b> ${describe(cs[i])}`, name: LETTERS[i], answer: right, wrong,
          other: T(`Case ${LETTERS[i]} (${describe(cs[i])}): find the acceleration first (speeding up, slowing down or steady?); the net force points like the acceleration.`, `Fall ${LETTERS[i]} (${describe(cs[i])}): Bestimme zuerst die Beschleunigung (wird schneller, langsamer oder gleich schnell?); die resultierende Kraft zeigt wie die Beschleunigung.`),
          why: T(`Case ${LETTERS[i]} (${describe(cs[i])}): the acceleration is ${accWord(acc[i])}, so the net force is ${accWord(acc[i])} too.`, `Fall ${LETTERS[i]} (${describe(cs[i])}): Die Beschleunigung ist ${accWord(acc[i])}, also auch die resultierende Kraft.`),
        };
      }), choices);

    const accLines = cs.map(([d, s], i) => `${LETTERS[i]}: ${describe([d, s])} → <i>a</i> ${accWord(acc[i])}`).join('; ');
    const steps = [
      { title: T('Acceleration in each case', 'Beschleunigung in jedem Fall'), figure: figure({ acc: true }),
        text: T(`Speeding up: the acceleration points along the velocity; slowing down: against it; constant speed or at rest: zero. ${accLines}.`,
          `Wird schneller: Die Beschleunigung zeigt in Richtung der Geschwindigkeit; wird langsamer: entgegen; gleich schnell oder in Ruhe: null. ${accLines}.`) },
      { title: T('Net force and cable force', 'Resultierende Kraft und Seilkraft'), figure: figure({ forces: true }),
        text: T(`Second law: the net force ${FT} − ${FG} = <i>m·a</i> points like the acceleration. The weight ${FG} is the same in all cases. Acceleration up: ${FT} > ${FG}; zero: ${FT} = ${FG}; down: ${FT} < ${FG}.`,
          `Zweites Newtonsches Gesetz: Die resultierende Kraft ${FT} − ${FG} = <i>m·a</i> zeigt wie die Beschleunigung. Die Gewichtskraft ${FG} ist in allen Fällen gleich. Beschleunigung nach oben: ${FT} > ${FG}; null: ${FT} = ${FG}; nach unten: ${FT} < ${FG}.`) },
      { title: T('The ranking', 'Die Rangfolge'), figure: figure({ forces: true }),
        text: T(`So the cable force ranks ${FC.rankText(items, acc)}. Cases with the same acceleration have the same cable force, however different their motion looks.`,
          `Die Seilkraft ordnet sich also ${FC.rankText(items, acc)}. Fälle mit gleicher Beschleunigung haben dieselbe Seilkraft, auch wenn ihre Bewegung verschieden aussieht.`) },
    ];

    return {
      title: T('Four elevator rides', 'Vier Liftfahrten'),
      situation: T(`<p>The same elevator cabin is shown in four states of motion, A to D. Whenever it speeds up or slows down, it does so equally quickly. Air resistance and friction are negligible.</p>`,
        `<p>Dieselbe Liftkabine ist in vier Bewegungszuständen A bis D gezeigt. Wenn sie schneller oder langsamer wird, dann jeweils gleich rasch. Luftwiderstand und Reibung sind vernachlässigbar.</p>`),
      figure: figure(),
      questions: [sorting, matching],
      hints: [
        T(`The four cases: ${cs.map((c, i) => `${LETTERS[i]} ${describe(c)}`).join('; ')}. In which of them does the speed change at all, and which way does the cabin move there?`,
          `Die vier Fälle: ${cs.map((c, i) => `${LETTERS[i]} ${describe(c)}`).join('; ')}. In welchen ändert sich das Tempo überhaupt, und wohin fährt die Kabine dort?`),
        T(`Plan: for each of A–D the acceleration → the direction of the net force → compare ${FT} with the weight ${FG}, which is the same in all four cases.`, `Plan: Für jeden der Fälle A–D die Beschleunigung → die Richtung der resultierenden Kraft → ${FT} mit der Gewichtskraft ${FG} vergleichen, die in allen vier Fällen gleich ist.`),
        T(`On the cabin act only ${FT} up and ${FG} down: ${FT} − ${FG} = <i>m·a</i> (<i>a</i> counted upward), so ${FT} = <i>m</i>(<i>g</i> + <i>a</i>). Equal accelerations, equal ${FT}.`, `Auf die Kabine wirken nur ${FT} nach oben und ${FG} nach unten: ${FT} − ${FG} = <i>m·a</i> (<i>a</i> nach oben positiv), also ${FT} = <i>m</i>(<i>g</i> + <i>a</i>). Gleiche Beschleunigung, gleiche ${FT}.`),
        T(`Here: ${cs.map(([d, s], i) => `${LETTERS[i]}: ${describe([d, s])} → <i>a</i> ${!d || !s ? 'zero' : s > 0 ? 'along the velocity' : 'against the velocity'}`).join('; ')}. Which way is that, up or down?`,
          `Hier: ${cs.map(([d, s], i) => `${LETTERS[i]}: ${describe([d, s])} → <i>a</i> ${!d || !s ? 'null' : s > 0 ? 'in Richtung der Geschwindigkeit' : 'gegen die Geschwindigkeit'}`).join('; ')}. Ist das nach oben oder nach unten?`),
      ],
      steps,
    };
  }

  // ================================================================ free-body diagrams
  // Generic diagrams: weight down (G), an upward force (U), forward (Fw) and backward (Bk) forces;
  // lengths show which is larger.
  const DIAG = {
    G: { arrows: { G: 40 }, en: 'only the weight', de: 'nur die Gewichtskraft' },
    GN: { arrows: { G: 36, U: 36 }, en: 'the weight and an equally large upward force', de: 'die Gewichtskraft und eine gleich grosse Kraft nach oben' },
    Ufwd_gt: { arrows: { G: 30, U: 30, Fw: 40, Bk: 22 }, en: 'weight and upward force equal; the forward force larger than the backward force', de: 'Gewichtskraft und Kraft nach oben gleich; Kraft nach vorn grösser als die nach hinten' },
    Ufwd_eq: { arrows: { G: 30, U: 30, Fw: 30, Bk: 30 }, en: 'weight and upward force equal; forward and backward forces equal', de: 'Gewichtskraft und Kraft nach oben gleich; Kräfte nach vorn und nach hinten gleich' },
    Ubk: { arrows: { G: 30, U: 30, Bk: 30 }, en: 'weight and upward force equal; only a backward force', de: 'Gewichtskraft und Kraft nach oben gleich; nur eine Kraft nach hinten' },
    Ufwd: { arrows: { G: 30, U: 30, Fw: 30 }, en: 'weight and upward force equal; only a forward force', de: 'Gewichtskraft und Kraft nach oben gleich; nur eine Kraft nach vorn' },
    up_lt: { arrows: { G: 40, U: 22 }, en: 'the weight and a smaller upward force', de: 'die Gewichtskraft und eine kleinere Kraft nach oben' },
    up_gt: { arrows: { G: 28, U: 46 }, en: 'the weight and a larger upward force', de: 'die Gewichtskraft und eine grössere Kraft nach oben' },
    Gfwd: { arrows: { G: 40, D: 34 }, en: 'the weight and a force along the motion', de: 'die Gewichtskraft und eine Kraft in Bewegungsrichtung' },
  };
  function diagram(key) {
    const c = [65, 62], a = DIAG[key].arrows;
    let g = D.rect(c[0] - 16, c[1] - 12, 32, 24, 'obj', 2);
    if (a.G) g += D.arrow(c[0], c[1], c[0], c[1] + a.G, 'f', '');
    if (a.U) g += D.arrow(c[0], c[1], c[0], c[1] - a.U, 'f', '');
    if (a.Fw) g += D.arrow(c[0], c[1], c[0] + a.Fw + 8, c[1], 'f', '');
    if (a.Bk) g += D.arrow(c[0], c[1], c[0] - a.Bk - 8, c[1], 'f', '');
    if (a.D) g += D.arrow(c[0], c[1], c[0] + a.D * 0.8, c[1] - a.D * 0.8, 'f', '');
    g += D.dot(c[0], c[1], 2.5, 'pt') + D.arrow(100, 116, 124, 116, 'm', '', { head: 6 });
    return D.svg(130, 124, g, T(DIAG[key].en, DIAG[key].de));
  }

  // How to read the diagrams.
  function legend() {
    const c = [230, 58];
    let g = D.rect(c[0] - 16, c[1] - 12, 32, 24, 'obj', 2);
    g += D.arrow(c[0], c[1], c[0], c[1] + 40, 'f', '') + D.arrow(c[0], c[1], c[0], c[1] - 40, 'f', '') + D.arrow(c[0], c[1], c[0] + 52, c[1], 'f', '') + D.arrow(c[0], c[1], c[0] - 52, c[1], 'f', '');
    g += D.dot(c[0], c[1], 2.5, 'pt');  // all forces start here, as in the diagrams
    g += D.words(c[0] + 8, c[1] + 44, T('weight', 'Gewichtskraft'), 'start') + D.words(c[0] + 8, c[1] - 34, T('upward force', 'Kraft nach oben'), 'start');
    g += D.words(c[0] + 58, c[1] + 4, T('forward force', 'Kraft nach vorn'), 'start') + D.words(c[0] - 58, c[1] + 4, T('backward force', 'Kraft nach hinten'), 'end');
    g += D.arrow(12, 108, 52, 108, 'm', '', { head: 6 }) + D.words(58, 112, T('direction of motion', 'Bewegungsrichtung'), 'start');
    return D.svg(400, 118, g, T('How to read the diagrams', 'So sind die Diagramme zu lesen'));
  }

  // Situations: the right diagram and typical wrong ones. The arrow at the bottom right of each
  // diagram shows “forward”, the direction of motion.
  function situations() {
    return {
      thrown: { key: 'G', name: T('ball in flight', 'Ball im Flug'), text: T('A ball flies through the air after it has been thrown forward and up (air resistance negligible).', 'Ein Ball fliegt nach dem Wurf schräg nach vorn oben durch die Luft (Luftwiderstand vernachlässigbar).'),
        why: T('Nothing touches the ball any more: only its weight acts.', 'Nichts berührt den Ball mehr: Nur die Gewichtskraft wirkt.'),
        wrong: { Gfwd: { code: 'impetus', why: T('There is no “force of the throw” after release: the ball moves on because of its velocity.', 'Nach dem Loslassen gibt es keine „Wurfkraft“: Der Ball bewegt sich wegen seiner Geschwindigkeit weiter.') },
          GN: { code: 'other', why: T('Nothing pushes the ball up: it is in the air, nothing supports it.', 'Nichts drückt den Ball nach oben: Er ist in der Luft, nichts stützt ihn.') } } },
      book: { key: 'GN', name: T('book on a table', 'Buch auf dem Tisch'), text: T('A book lies at rest on a table.', 'Ein Buch liegt ruhig auf einem Tisch.'),
        why: T('The Earth pulls the book down, the table pushes it up just as hard: it stays at rest.', 'Die Erde zieht das Buch nach unten, der Tisch drückt es gleich stark nach oben: Es bleibt in Ruhe.'),
        wrong: { G: { code: 'obstacle', why: T('The table does push up on the book; with only the weight acting, the book would fall.', 'Der Tisch drückt das Buch sehr wohl nach oben; wirkte nur die Gewichtskraft, würde das Buch fallen.') } } },
      pushConst: { key: 'Ufwd_eq', name: T('crate pushed steadily', 'Kiste gleichmässig geschoben'), text: T('A crate is pushed across a rough floor at constant speed.', 'Eine Kiste wird mit konstanter Geschwindigkeit über einen rauen Boden geschoben.'),
        why: T('Constant speed: the net force is zero, so the push is as large as the friction.', 'Konstante Geschwindigkeit: Die resultierende Kraft ist null, also ist die Druckkraft so gross wie die Reibung.'),
        wrong: { Ufwd_gt: { code: 'active-force', why: T('Moving at constant speed does not need a net force forward: push and friction are equal.', 'Für eine konstante Geschwindigkeit braucht es keine resultierende Kraft nach vorn: Druckkraft und Reibung sind gleich.') },
          Ufwd: { code: 'other', why: T('On a rough floor friction acts backward.', 'Auf einem rauen Boden wirkt die Reibung nach hinten.') } } },
      slide: { key: 'Ubk', name: T('crate sliding to a stop', 'Kiste gleitet aus'), text: T('After a push, a crate slides on across a rough floor and slows down.', 'Nach einem Stoss gleitet eine Kiste über einen rauen Boden weiter und wird langsamer.'),
        why: T('Nothing pushes any more; only friction acts along the floor, backward — that is why the crate slows down.', 'Nichts schiebt mehr; entlang des Bodens wirkt nur die Reibung, nach hinten — deshalb wird die Kiste langsamer.'),
        wrong: { Ufwd_gt: { code: 'impetus', why: T('The push has ended: no forward force is stored in the crate.', 'Der Stoss ist vorbei: In der Kiste ist keine Kraft nach vorn gespeichert.') },
          Ufwd_eq: { code: 'impetus', why: T('There is no forward force any more, so nothing balances the friction: the crate slows down.', 'Es gibt keine Kraft nach vorn mehr, also hält nichts der Reibung das Gleichgewicht: Die Kiste wird langsamer.') } } },
      puck: { key: 'GN', name: T('puck on smooth ice', 'Puck auf glattem Eis'), text: T('A puck slides across smooth ice at constant speed (friction negligible).', 'Ein Puck gleitet mit konstanter Geschwindigkeit über glattes Eis (Reibung vernachlässigbar).'),
        why: T('Only the weight and the push of the ice act, and they cancel: the puck keeps its velocity.', 'Es wirken nur die Gewichtskraft und die Normalkraft des Eises, und sie heben sich auf: Der Puck behält seine Geschwindigkeit.'),
        wrong: { Ufwd: { code: 'active-force', why: T('No forward force is needed to keep sliding at constant speed.', 'Um mit konstanter Geschwindigkeit weiterzugleiten, braucht es keine Kraft nach vorn.') },
          Ubk: { code: 'other', why: T('On smooth ice there is no friction, so no backward force: that is why the puck does not slow down.', 'Auf glattem Eis gibt es keine Reibung, also keine Kraft nach hinten: Deshalb wird der Puck nicht langsamer.') } } },
      skyConst: { key: 'GN', name: T('skydiver at constant speed', 'Fallschirmspringer, gleich schnell'), text: T('A skydiver falls at constant speed.', 'Ein Fallschirmspringer fällt mit konstanter Geschwindigkeit.'),
        why: T('Constant speed: the air resistance up is as large as the weight.', 'Konstante Geschwindigkeit: Der Luftwiderstand nach oben ist so gross wie die Gewichtskraft.'),
        wrong: { up_lt: { code: 'active-force', why: T('Falling at constant speed does not need a net force down: drag and weight are equal.', 'Um mit konstanter Geschwindigkeit zu fallen, braucht es keine resultierende Kraft nach unten: Luftwiderstand und Gewichtskraft sind gleich.') },
          G: { code: 'other', why: T('A falling skydiver feels a strong air resistance upward.', 'Auf einen fallenden Fallschirmspringer wirkt ein starker Luftwiderstand nach oben.') } } },
      liftUp: { key: 'up_gt', name: T('elevator starting up', 'Lift fährt an'), text: T('An elevator cabin starts moving up and gets faster.', 'Eine Liftkabine fährt nach oben an und wird schneller.'),
        why: T('It speeds up upward: the net force points up, so the cable pulls harder than the weight.', 'Sie wird nach oben schneller: Die resultierende Kraft zeigt nach oben, also zieht das Seil stärker, als die Gewichtskraft beträgt.'),
        wrong: { GN: { code: 'other', why: T('With equal forces the cabin could not speed up.', 'Mit gleich grossen Kräften könnte die Kabine nicht schneller werden.') } } },
      lamp: { key: 'GN', name: T('hanging lamp', 'hängende Lampe'), text: T('A lamp hangs at rest from a cord.', 'Eine Lampe hängt ruhig an einem Kabel.'),
        why: T('The cord pulls up as hard as the Earth pulls down.', 'Das Kabel zieht so stark nach oben, wie die Erde nach unten zieht.'),
        wrong: { G: { code: 'obstacle', why: T('The cord does pull: otherwise the lamp would fall.', 'Das Kabel zieht sehr wohl: Sonst würde die Lampe fallen.') } } },
      parachute: { key: 'up_gt', name: T('parachute just opened', 'Fallschirm eben geöffnet'), text: T('A skydiver has just opened the parachute and is slowing down while falling.', 'Ein Fallschirmspringer hat eben den Fallschirm geöffnet und wird beim Fallen langsamer.'),
        why: T('Slowing down while falling means an acceleration upward: the drag is larger than the weight.', 'Beim Fallen langsamer werden heisst Beschleunigung nach oben: Der Luftwiderstand ist grösser als die Gewichtskraft.'),
        wrong: { up_lt: { code: 'active-force', why: T('Falling does not need a net force down: the skydiver slows down, so the net force points up.', 'Fallen braucht keine resultierende Kraft nach unten: Der Fallschirmspringer wird langsamer, also zeigt die resultierende Kraft nach oben.') } } },
      carFast: { key: 'Ufwd_gt', name: T('car speeding up', 'Auto wird schneller'), text: T('A car speeds up on a straight, level road.', 'Ein Auto wird auf einer geraden, ebenen Strasse schneller.'),
        why: T('It speeds up: the driving force forward is larger than friction and air resistance backward; weight and the push of the road balance.', 'Es wird schneller: Die Antriebskraft nach vorn ist grösser als Reibung und Luftwiderstand nach hinten; Gewichtskraft und Normalkraft der Strasse heben sich auf.'),
        wrong: { Ufwd_eq: { code: 'other', why: T('With equal forward and backward forces the car could not speed up.', 'Mit gleich grossen Kräften nach vorn und nach hinten könnte das Auto nicht schneller werden.') },
          Ufwd: { code: 'other', why: T('Friction and air resistance act backward on a moving car.', 'Auf ein fahrendes Auto wirken Reibung und Luftwiderstand nach hinten.') } } },
      carConst: { key: 'Ufwd_eq', name: T('car at constant speed', 'Auto, gleich schnell'), text: T('A car drives at constant speed along a straight, level road.', 'Ein Auto fährt mit konstanter Geschwindigkeit auf einer geraden, ebenen Strasse.'),
        why: T('Constant speed: the driving force is as large as friction and air resistance together.', 'Konstante Geschwindigkeit: Die Antriebskraft ist so gross wie Reibung und Luftwiderstand zusammen.'),
        wrong: { Ufwd_gt: { code: 'active-force', why: T('Driving at constant speed does not need a net force forward: the forces balance.', 'Für eine konstante Geschwindigkeit braucht es keine resultierende Kraft nach vorn: Die Kräfte heben sich auf.') },
          Ufwd: { code: 'other', why: T('Friction and air resistance act backward on a moving car.', 'Auf ein fahrendes Auto wirken Reibung und Luftwiderstand nach hinten.') } } },
      carBrake: { key: 'Ubk', name: T('car braking', 'Auto bremst'), text: T('A car brakes on a level road; the engine is disengaged.', 'Ein Auto bremst auf einer ebenen Strasse; der Motor ist ausgekuppelt.'),
        why: T('Nothing drives the car forward; the braking force acts backward — that is why it slows down.', 'Nichts treibt das Auto nach vorn an; die Bremskraft wirkt nach hinten — deshalb wird es langsamer.'),
        wrong: { Ufwd_gt: { code: 'active-force', why: T('Moving forward does not need a forward force: the car slows down, so the net force points backward.', 'Vorwärts fahren braucht keine Kraft nach vorn: Das Auto wird langsamer, also zeigt die resultierende Kraft nach hinten.') },
          Ufwd_eq: { code: 'impetus', why: T('There is no forward force any more, so nothing balances the braking force: the car slows down.', 'Es gibt keine Kraft nach vorn mehr, also hält nichts der Bremskraft das Gleichgewicht: Das Auto wird langsamer.') } } },
      skyStart: { key: 'up_lt', name: T('skydiver just after the jump', 'Fallschirmspringer kurz nach dem Absprung'), text: T('A skydiver has just jumped and is still falling faster and faster.', 'Ein Fallschirmspringer ist eben abgesprungen und fällt noch immer schneller.'),
        why: T('Getting faster downward: the net force points down, so the air resistance up is still smaller than the weight.', 'Nach unten schneller werden: Die resultierende Kraft zeigt nach unten, also ist der Luftwiderstand nach oben noch kleiner als die Gewichtskraft.'),
        wrong: { GN: { code: 'other', why: T('With equal forces the skydiver could not get faster.', 'Mit gleich grossen Kräften könnte der Fallschirmspringer nicht schneller werden.') },
          G: { code: 'other', why: T('As soon as the skydiver moves through the air, air resistance acts upward.', 'Sobald sich der Fallschirmspringer durch die Luft bewegt, wirkt ein Luftwiderstand nach oben.') } } },
      liftDownStop: { key: 'up_gt', name: T('elevator stopping on the way down', 'Lift hält abwärts an'), text: T('An elevator cabin moving down slows down before the ground floor.', 'Eine Liftkabine fährt nach unten und wird vor dem Erdgeschoss langsamer.'),
        why: T('Slowing down while moving down means an acceleration upward: the cable pulls harder than the weight.', 'Beim Abwärtsfahren langsamer werden heisst Beschleunigung nach oben: Das Seil zieht stärker als die Gewichtskraft.'),
        wrong: { up_lt: { code: 'active-force', why: T('Moving down does not need a net force down: the cabin slows down, so the net force points up.', 'Abwärtsfahren braucht keine resultierende Kraft nach unten: Die Kabine wird langsamer, also zeigt die resultierende Kraft nach oben.') },
          GN: { code: 'other', why: T('With equal forces the cabin could not slow down.', 'Mit gleich grossen Kräften könnte die Kabine nicht langsamer werden.') } } },
      liftUpStop: { key: 'up_lt', name: T('elevator stopping on the way up', 'Lift hält aufwärts an'), text: T('An elevator cabin moving up slows down before the top floor.', 'Eine Liftkabine fährt nach oben und wird vor dem obersten Stock langsamer.'),
        why: T('Slowing down while moving up means an acceleration downward: the cable pulls less than the weight.', 'Beim Aufwärtsfahren langsamer werden heisst Beschleunigung nach unten: Das Seil zieht weniger stark als die Gewichtskraft.'),
        wrong: { up_gt: { code: 'active-force', why: T('Moving up does not need a net force up: the cabin slows down, so the net force points down.', 'Aufwärtsfahren braucht keine resultierende Kraft nach oben: Die Kabine wird langsamer, also zeigt die resultierende Kraft nach unten.') },
          GN: { code: 'other', why: T('With equal forces the cabin could not slow down.', 'Mit gleich grossen Kräften könnte die Kabine nicht langsamer werden.') } } },
      liftConst: { key: 'GN', name: T('elevator at constant speed', 'Lift, gleich schnell'), text: T('An elevator cabin moves up at constant speed.', 'Eine Liftkabine fährt mit konstanter Geschwindigkeit nach oben.'),
        why: T('Constant speed: the cable pulls exactly as hard as the weight.', 'Konstante Geschwindigkeit: Das Seil zieht genau so stark wie die Gewichtskraft.'),
        wrong: { up_gt: { code: 'active-force', why: T('Moving up at constant speed does not need a net force up: the forces balance.', 'Für eine konstante Geschwindigkeit nach oben braucht es keine resultierende Kraft nach oben: Die Kräfte heben sich auf.') },
          G: { code: 'obstacle', why: T('The cable does pull: otherwise the cabin would fall.', 'Das Seil zieht sehr wohl: Sonst würde die Kabine fallen.') } } },
      ballUp: { key: 'G', name: T('ball on the way up', 'Ball auf dem Weg nach oben'), text: T('A ball thrown straight up is still rising (air resistance negligible).', 'Ein senkrecht hochgeworfener Ball steigt noch (Luftwiderstand vernachlässigbar).'),
        why: T('Nothing touches the ball: only its weight acts, also on the way up — that is why it slows down.', 'Nichts berührt den Ball: Nur die Gewichtskraft wirkt, auch auf dem Weg nach oben — deshalb wird er langsamer.'),
        wrong: { up_lt: { code: 'impetus', why: T('There is no upward “force of the throw” after release: the ball rises because of its velocity.', 'Nach dem Loslassen gibt es keine „Wurfkraft“ nach oben: Der Ball steigt wegen seiner Geschwindigkeit.') },
          GN: { code: 'other', why: T('Nothing pushes the ball up: it is in the air, nothing supports it.', 'Nichts drückt den Ball nach oben: Er ist in der Luft, nichts stützt ihn.') } } },
      stone: { key: 'G', name: T('falling stone', 'fallender Stein'), text: T('A stone falls from a bridge (air resistance negligible).', 'Ein Stein fällt von einer Brücke (Luftwiderstand vernachlässigbar).'),
        why: T('Nothing touches the stone: only its weight acts.', 'Nichts berührt den Stein: Nur die Gewichtskraft wirkt.'),
        wrong: { GN: { code: 'other', why: T('With equal forces the stone could not fall faster and faster.', 'Mit gleich grossen Kräften könnte der Stein nicht immer schneller fallen.') },
          up_lt: { code: 'other', why: T('Air resistance is negligible here, and nothing else pushes the stone up.', 'Der Luftwiderstand ist hier vernachlässigbar, und sonst drückt nichts den Stein nach oben.') } } },
    };
  }
  const SIT_POOLS = {
    force: ['thrown', 'book', 'pushConst', 'slide', 'puck', 'skyConst', 'liftUp', 'lamp', 'parachute', 'carFast', 'carConst', 'carBrake', 'skyStart', 'liftDownStop', 'liftUpStop', 'liftConst', 'ballUp', 'stone'],
    inertia: ['thrown', 'book', 'pushConst', 'slide', 'puck', 'skyConst', 'carConst', 'liftConst', 'lamp', 'ballUp', 'stone', 'carBrake'],
  };

  function matchDiagrams(r, p) {
    const S = situations();
    let picks;
    for (let tries = 0; tries < 200; tries++) {
      picks = r.shuffle(SIT_POOLS[p.pool || 'force']).slice(0, 4);
      if (new Set(picks.map((k) => S[k].key)).size >= 3) break;
    }
    const rightKeys = [...new Set(picks.map((k) => S[k].key))];
    const extra = r.shuffle([...new Set(picks.flatMap((k) => Object.keys(S[k].wrong)))].filter((k) => !rightKeys.includes(k))).slice(0, 5 - rightKeys.length);
    const keys = r.shuffle([...rightKeys, ...extra]);
    const choices = keys.map((k, i) => ({ id: k, label: diagram(k), name: LETTERS[i] }));
    const items = picks.map((k) => {
      const s = S[k], wrong = {};
      for (const [dk, w] of Object.entries(s.wrong)) if (keys.includes(dk)) wrong[dk] = w;
      return { label: s.text, name: s.name, answer: s.key, why: `${cap(T(DIAG[s.key].en, DIAG[s.key].de))}: ${s.why}`, wrong,
        other: T('This diagram does not fit. Go through the forces: the weight, and one force from everything that touches the body.', 'Dieses Diagramm passt nicht. Geh die Kräfte durch: die Gewichtskraft und je eine Kraft von allem, was den Körper berührt.') };
    });

    const listed = (fn) => picks.map((k) => `<li><b>${S[k].name}</b>: ${fn(S[k])}</li>`).join('');
    const rightFigs = picks.map((k) => diagram(S[k].key)).join('');
    const steps = [
      { title: T('Which forces?', 'Welche Kräfte?'), figure: rightFigs,
        text: T(`For each body: the Earth pulls it down (weight); anything that touches it can push or pull (support, rope, floor, air). <ul>${listed((s) => s.why)}</ul>`,
          `Für jeden Körper: Die Erde zieht ihn nach unten (Gewichtskraft); alles, was ihn berührt, kann drücken oder ziehen (Unterlage, Seil, Boden, Luft). <ul>${listed((s) => s.why)}</ul>`) },
      { title: T('How large?', 'Wie gross?'), figure: rightFigs,
        text: T('The motion tells the net force: constant velocity or rest → the forces balance; speeding up or slowing down → the net force points along the acceleration. The diagrams in order: ' + picks.map((k) => `${S[k].name} → ${choices[keys.indexOf(S[k].key)].name}`).join('; ') + '.',
          'Die Bewegung verrät die resultierende Kraft: konstante Geschwindigkeit oder Ruhe → die Kräfte heben sich auf; schneller oder langsamer werden → die resultierende Kraft zeigt in Richtung der Beschleunigung. Die Diagramme der Reihe nach: ' + picks.map((k) => `${S[k].name} → ${choices[keys.indexOf(S[k].key)].name}`).join('; ') + '.') },
    ];

    return {
      title: T('Free-body diagrams', 'Kräftediagramme'),
      situation: T('<p>Each of the diagrams A–E shows the forces on a body, drawn from its centre; longer arrows mean larger forces. The small arrow at the bottom right shows the direction of motion (“forward”).</p>',
        '<p>Jedes der Diagramme A–E zeigt die Kräfte auf einen Körper, vom Mittelpunkt aus gezeichnet; längere Pfeile bedeuten grössere Kräfte. Der kleine Pfeil unten rechts zeigt die Bewegungsrichtung („vorn“).</p>').replace('A–E', `A–${LETTERS[keys.length - 1]}`),
      figure: legend(),
      questions: [match('diagrams', T('Match each situation with its free-body diagram. A diagram may fit more than one situation, or none.', 'Ordne jeder Situation ihr Kräftediagramm zu. Ein Diagramm kann zu mehreren Situationen passen oder zu keiner.'), items, choices, true)],
      hints: [
        T(`The four situations: ${picks.map((k) => S[k].name).join(', ')}. For each body: what pulls on it from a distance, and what touches it?`, `Die vier Situationen: ${picks.map((k) => S[k].name).join(', ')}. Für jeden Körper: Was zieht aus der Ferne an ihm, und was berührt ihn?`),
        T(`Plan: list the forces on each of the four bodies, then let its motion decide — at rest or constant velocity: they balance (first law); speeding up or slowing down: the net force points along the acceleration (second law). Only then look for the diagram among A–${LETTERS[keys.length - 1]}.`,
          `Plan: Zähle die Kräfte auf jeden der vier Körper auf und lass dann seine Bewegung entscheiden — Ruhe oder konstante Geschwindigkeit: Sie heben sich auf (erstes Gesetz); schneller oder langsamer werden: Die resultierende Kraft zeigt in Richtung der Beschleunigung (zweites Gesetz). Suche erst dann das Diagramm unter A–${LETTERS[keys.length - 1]}.`),
        T(`Start with the ${S[picks[0]].name}: ${S[picks[0]].text} Which forces act on it, and do they balance? Look for a diagram with exactly these arrows.`, `Beginne mit „${S[picks[0]].name}“: ${S[picks[0]].text} Welche Kräfte wirken, und heben sie sich auf? Suche ein Diagramm mit genau diesen Pfeilen.`),
        `<ul>${listed((s) => s.why)}</ul>`,
      ],
      steps,
    };
  }

  register('force', 'rank-elevator', rankElevator);
  register('force', 'match-diagrams', matchDiagrams);
  register('inertia', 'match-diagrams', matchDiagrams, { pool: 'inertia' });
})(typeof window !== 'undefined' ? window : globalThis);
