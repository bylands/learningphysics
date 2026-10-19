// Predict and explain: a prediction and the reason behind it, both chosen from options. A right
// prediction with a wrong reason counts as wrong, and the feedback says so. Two magnets (or a
// magnet and iron) pulling on each other.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, num, qty, o, q, two, register } = FC;
  const RIGHT = () => T('Right.', 'Richtig.');

  // ================================================================ magnets
  function magnets(r, p) {
    const variant = p.variant || r.pick(['two', 'iron']);
    const iron = variant === 'iron';
    const [mA, mB] = p.masses || r.pick([[0.5, 1], [1, 0.5], [0.5, 1.5], [1.5, 0.5], [1, 2], [2, 1]]);
    const A = T('cart A', 'Wagen A'), B = T('cart B', 'Wagen B');
    const pairWhy = T('The two carts pull on each other: the two forces are an interaction pair, and by the third law they are always equally large and opposite — however strong the magnets are and whatever the carts weigh.',
      'Die beiden Wagen ziehen aneinander: Die beiden Kräfte sind ein Wechselwirkungspaar, und nach dem dritten Newtonschen Gesetz sind sie immer gleich gross und entgegengesetzt — egal, wie stark die Magnete sind und wie schwer die Wagen.');

    function figure(o = {}) {
      const y = 150;
      let g = D.line(0, y, 420, y, 'gline');
      const cartAt = (x, label, m, mag) => D.rect(x - 45, y - 34, 90, 22, 'obj', 3) + D.ball(x - 28, y - 6, 6, 'wheel') + D.ball(x + 28, y - 6, 6, 'wheel') + mag + D.words(x, y - 74, label) + D.text(x, y + 22, `m = ${num(m, 2)} kg`, 'lbl small');
      const magnet = (x, strong) => `<rect class="${strong ? 'mag-n' : 'mag-s'}" x="${x - 14}" y="${y - 58}" width="28" height="24" rx="2"/>`;
      const ironBlock = (x) => D.rect(x - 14, y - 58, 28, 24, 'solid', 2);
      g += cartAt(130, iron ? T('A: magnet', 'A: Magnet') : T('A: strong magnet', 'A: starker Magnet'), mA, magnet(160, true));
      g += cartAt(290, iron ? T('B: iron block', 'B: Eisenklotz') : T('B: weak magnet', 'B: schwacher Magnet'), mB, iron ? ironBlock(260) : magnet(260, false));
      if (o.forces) {
        g += D.arrow(176, y - 46, 220, y - 46, 'f', '') + D.words(222, y - 92, T('B on A', 'B → A'), 'start') + D.line(214, y - 52, 222, y - 86, 'guide');
        g += D.arrow(244, y - 40, 200, y - 40, 'f', '') + D.words(196, y - 104, T('A on B', 'A → B'), 'end') + D.line(206, y - 34, 196, y - 98, 'guide');
      }
      if (o.acc) {
        const aA = 30 / mA, aB = 30 / mB, k = 50 / Math.max(aA, aB);
        g += D.arrow(130, y - 98, 130 + aA * k, y - 98, 'a', 'a_A') + D.arrow(290, y - 98, 290 - aB * k, y - 98, 'a', 'a_B', { at: [290 - aB * k - 6, y - 93], anchor: 'end' });
      }
      return D.svg(420, 180, g, T('Two carts with magnets attracting each other', 'Zwei Wagen mit Magneten, die sich anziehen'));
    }

    const preds = [
      o(T('Both forces are equally large.', 'Beide Kräfte sind gleich gross.'), 'ok', `${RIGHT()} ${pairWhy}`),
      o(T(`The force of A on B is larger.`, 'Die Kraft von A auf B ist grösser.'), 'active-wins', `${iron ? T('The magnet is not the only one pulling: the iron pulls back on it just as hard.', 'Nicht nur der Magnet zieht: Das Eisen zieht genauso stark zurück.') : T('The stronger magnet does not pull harder than it is pulled.', 'Der stärkere Magnet zieht nicht stärker, als er gezogen wird.')} ${pairWhy}`),
      o(T(`The force of B on A is larger.`, 'Die Kraft von B auf A ist grösser.'), 'other', pairWhy),
    ];
    const reasons = [o(T('The two forces are an interaction pair, and partners are always equally large.', 'Die beiden Kräfte sind ein Wechselwirkungspaar, und Kraft und Gegenkraft sind immer gleich gross.'), 'ok', `${RIGHT()} ${pairWhy}`)];
    const wrongs = [
      o(T(`The ${iron ? 'magnet' : 'stronger magnet'} does most of the pulling.`, `${iron ? 'Der Magnet' : 'Der stärkere Magnet'} übernimmt den grössten Teil des Ziehens.`), 'active-wins', pairWhy),
      o(T('The heavier cart pulls harder.', 'Der schwerere Wagen zieht stärker.'), 'mass-wins', pairWhy),
      iron
        ? o(T('Iron is not a magnet, so it cannot pull on anything.', 'Eisen ist kein Magnet, also kann es an nichts ziehen.'), 'obstacle', T(`The magnet pulls on the iron, so the iron pulls on the magnet: every force has a partner. ${pairWhy}`, `Der Magnet zieht am Eisen, also zieht das Eisen am Magneten: Jede Kraft hat eine Gegenkraft. ${pairWhy}`))
        : o(T('Both are magnets, so they pull equally hard.', 'Beides sind Magnete, also ziehen sie gleich stark.'), 'other', T(`That is not the reason: the forces would be equal even between a strong and a very weak magnet, or between a magnet and a piece of iron. ${pairWhy}`, `Das ist nicht der Grund: Die Kräfte wären auch zwischen einem starken und einem sehr schwachen Magneten gleich, oder zwischen einem Magneten und einem Stück Eisen. ${pairWhy}`)),
    ];
    reasons.push(...wrongs);
    const light = mA < mB ? 'A' : 'B', k = Math.max(mA, mB) / Math.min(mA, mB);
    const accWhy = T(`Equal forces, but a = F/m: the lighter cart ${light} gets ${num(k)} times the acceleration.`, `Gleich grosse Kräfte, aber a = F/m: Der leichtere Wagen ${light} bekommt die ${num(k)}-fache Beschleunigung.`);
    const heavy = light === 'A' ? 'B' : 'A';
    const accQ = q(r, 'acc', T('Both carts are let go at the same moment. Which one speeds up faster?', 'Beide Wagen werden gleichzeitig losgelassen. Welcher wird schneller schneller?'), [
      o(T(`Cart ${light}, the lighter one.`, `Wagen ${light}, der leichtere.`), 'ok', `${RIGHT()} ${accWhy}`),
      o(T(`Cart ${heavy}, the heavier one.`, `Wagen ${heavy}, der schwerere.`), 'mass-wins', T(`The heavier cart does not pull harder. ${accWhy}`, `Der schwerere Wagen zieht nicht stärker. ${accWhy}`)),
      o(T('Both equally fast.', 'Beide gleich schnell.'), 'other', T(`The forces are equal, the masses are not. ${accWhy}`, `Die Kräfte sind gleich, die Massen nicht. ${accWhy}`)),
      light === 'B'
        ? o(T(`Cart A, because its ${iron ? 'magnet' : 'stronger magnet'} does the pulling.`, `Wagen A, weil sein ${iron ? 'Magnet' : 'stärkerer Magnet'} zieht.`), 'active-wins', T(`Both carts are pulled equally hard. ${accWhy}`, `Beide Wagen werden gleich stark gezogen. ${accWhy}`))
        : o(T(`Cart B, because it is pulled by the ${iron ? 'magnet' : 'stronger magnet'}.`, `Wagen B, weil ${iron ? 'der Magnet' : 'der stärkere Magnet'} an ihm zieht.`), 'active-wins', T(`Both carts are pulled equally hard. ${accWhy}`, `Beide Wagen werden gleich stark gezogen. ${accWhy}`)),
    ]);

    return {
      title: iron ? T('Magnet and iron', 'Magnet und Eisen') : T('Two magnets', 'Zwei Magnete'),
      situation: T(`<p>Two carts stand on a level track (friction negligible). Cart A (${qty(mA, 'kg')}) carries ${iron ? 'a strong magnet' : 'a strong magnet'}, cart B (${qty(mB, 'kg')}) ${iron ? 'a block of iron' : 'a much weaker magnet'}. They attract each other; for now, they are held in place.</p>`,
        `<p>Zwei Wagen stehen auf einer ebenen Schiene (Reibung vernachlässigbar). Wagen A (${qty(mA, 'kg')}) trägt einen starken Magneten, Wagen B (${qty(mB, 'kg')}) ${iron ? 'einen Eisenklotz' : 'einen viel schwächeren Magneten'}. Sie ziehen sich an; vorerst werden sie festgehalten.</p>`),
      figure: figure(),
      questions: [two(r, 'force', T('How does the force of A on B compare with the force of B on A?', 'Wie gross ist die Kraft von A auf B im Vergleich zur Kraft von B auf A?'), T('Why?', 'Warum?'), preds, reasons), accQ],
      hints: [
        T(`Cart A carries a strong magnet, cart B ${iron ? 'a block of iron' : 'a much weaker magnet'}. Which force does A exert on B, and which does B exert on A? Do they belong to the same interaction?`, `Wagen A trägt einen starken Magneten, Wagen B ${iron ? 'einen Eisenklotz' : 'einen viel schwächeren Magneten'}. Welche Kraft übt A auf B aus, und welche B auf A? Gehören sie zur selben Wechselwirkung?`),
        T('Plan: compare the two forces with the third law first; only then use the second law for each cart on its own, with its own mass.', 'Plan: Vergleiche zuerst die beiden Kräfte mit dem dritten Newtonschen Gesetz; wende erst dann das zweite Gesetz auf jeden Wagen einzeln an, mit seiner eigenen Masse.'),
        T(`Recall the third law: how do F(A on B) and F(B on A) compare in size and direction — does it matter that ${iron ? 'only A carries a magnet' : 'the magnet on A is much stronger'}? Second law: a = F/m.`, `Erinnere dich an das dritte Gesetz: Wie verhalten sich F(A→B) und F(B→A) in Grösse und Richtung — spielt es eine Rolle, dass ${iron ? 'nur A einen Magneten trägt' : 'der Magnet auf A viel stärker ist'}? Zweites Gesetz: a = F/m.`),
        T(`Here ${A} has ${qty(mA, 'kg')} and ${B} ${qty(mB, 'kg')}. Once you know how the two forces compare, apply a = F/m to each cart.`, `Hier hat ${A} ${qty(mA, 'kg')} und ${B} ${qty(mB, 'kg')}. Wenn du weisst, wie sich die beiden Kräfte verhalten, wende a = F/m auf jeden Wagen an.`),
      ],
      steps: [
        { title: T('An interaction pair', 'Ein Wechselwirkungspaar'), figure: figure({ forces: true }),
          text: `${pairWhy} ${iron ? T('The iron is magnetised by the magnet and pulls back on it.', 'Das Eisen wird vom Magneten magnetisiert und zieht an ihm zurück.') : T('That the magnets are of different strength does not matter: the pull between them is one interaction.', 'Dass die Magnete verschieden stark sind, spielt keine Rolle: Die Anziehung zwischen ihnen ist eine einzige Wechselwirkung.')}` },
        { title: T('Accelerations', 'Beschleunigungen'), figure: figure({ forces: true, acc: true }), text: accWhy },
      ],
    };
  }

  register('interact', 'magnets', magnets);
})(typeof window !== 'undefined' ? window : globalThis);
