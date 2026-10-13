// Matching: match forces with their third-law partners (dragged into pairs, see questions.js).
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, match, register } = FC;

  // ================================================================ third-law partners
  function scenes() {
    return {
      book: {
        title: T('Book on a table', 'Buch auf dem Tisch'),
        text: T('A book lies at rest on a table. Four forces are numbered in the picture.', 'Ein Buch liegt ruhig auf einem Tisch. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The Earth pulls the book down.', 'Die Erde zieht das Buch nach unten.'), T('The table pushes the book up.', 'Der Tisch drückt das Buch nach oben.'),
          T('The book pushes the table down.', 'Das Buch drückt den Tisch nach unten.'), T('The book pulls the Earth up.', 'Das Buch zieht die Erde nach oben.')],
        pairs: [[0, 3], [1, 2]], balance: [0, 1],
        draw: () => D.ground(20, 340, 200) + D.table(110, 120, 140, 200) + D.rect(150, 104, 60, 16, 'obj', 2) +
          D.arrow(172, 112, 172, 160, 'f', '') + D.arrow(188, 120, 188, 72, 'f', '') + D.arrow(204, 120, 204, 162, 'f', '', { cls: 'pair' }) + D.arrow(60, 200, 60, 152, 'f', '', { cls: 'pair' }) +
          D.text(164, 160, '1', 'lbl f', 'end') + D.text(196, 76, '2', 'lbl f', 'start') + D.text(212, 160, '3', 'lbl f', 'start') + D.text(68, 156, '4', 'lbl f', 'start') + D.words(68, 216, T('(on the Earth)', '(auf die Erde)'), 'start'),
      },
      lamp: {
        title: T('Hanging lamp', 'Hängende Lampe'),
        text: T('A lamp hangs at rest from a cord. Four forces are numbered in the picture.', 'Eine Lampe hängt ruhig an einem Kabel. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The Earth pulls the lamp down.', 'Die Erde zieht die Lampe nach unten.'), T('The cord pulls the lamp up.', 'Das Kabel zieht die Lampe nach oben.'),
          T('The lamp pulls the cord down.', 'Die Lampe zieht das Kabel nach unten.'), T('The lamp pulls the Earth up.', 'Die Lampe zieht die Erde nach oben.')],
        pairs: [[0, 3], [1, 2]], balance: [0, 1],
        draw: () => D.ceiling(110, 250, 18) + D.line(180, 18, 180, 104, 'cable') + `<polygon class="obj" points="164,104 196,104 214,140 146,140"/>` + D.ground(20, 340, 210) +
          D.arrow(170, 122, 170, 170, 'f', '') + D.arrow(188, 106, 188, 60, 'f', '') + D.arrow(180, 104, 180, 140, 'f', '', { cls: 'pair' }) + D.arrow(60, 210, 60, 162, 'f', '', { cls: 'pair' }) +
          D.text(162, 170, '1', 'lbl f', 'end') + D.text(180, 62, '2', 'lbl f', 'end') + D.text(188, 136, '3', 'lbl f', 'start') + D.text(68, 166, '4', 'lbl f', 'start') + D.words(68, 204, T('(on the Earth)', '(auf die Erde)'), 'start'),
      },
      wall: {
        title: T('Pushing a wall', 'Gegen eine Wand drücken'),
        text: T('A person stands still and pushes against a wall with both hands. Four forces are numbered in the picture.', 'Eine Person steht still und drückt mit beiden Händen gegen eine Wand. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The person pushes the wall to the right.', 'Die Person drückt die Wand nach rechts.'), T('The wall pushes the person to the left.', 'Die Wand drückt die Person nach links.'),
          T('The floor pushes the person’s feet to the right (friction).', 'Der Boden drückt die Füsse der Person nach rechts (Reibung).'), T('The person’s feet push the floor to the left.', 'Die Füsse der Person drücken den Boden nach links.')],
        pairs: [[0, 1], [2, 3]], balance: [1, 2],
        draw: () => D.ground(20, 340, 190) + D.rect(250, 40, 20, 150, 'solid', 0) + `<g transform="rotate(14 190 190)">${D.person(190, 190, 120, 1, 'push')}</g>` +
          D.arrow(252, 100, 296, 100, 'f', '', { cls: 'pair' }) + D.arrow(244, 112, 200, 112, 'f', '') + D.arrow(170, 182, 214, 182, 'f', '') + D.arrow(176, 198, 132, 198, 'f', '', { cls: 'pair' }) +
          D.text(300, 96, '1', 'lbl f', 'start') + D.text(196, 108, '2', 'lbl f', 'end') + D.text(218, 178, '3', 'lbl f', 'start') + D.text(128, 202, '4', 'lbl f', 'end'),
      },
      car: {
        title: T('A car speeding up', 'Ein Auto beschleunigt'),
        text: T('A car speeds up on a level road. Four forces are numbered in the picture.', 'Ein Auto beschleunigt auf einer ebenen Strasse. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The road pushes the car’s tyres forward.', 'Die Strasse drückt die Reifen des Autos nach vorn.'), T('The tyres push the road backward.', 'Die Reifen drücken die Strasse nach hinten.'),
          T('The air pushes the car backward (air resistance).', 'Die Luft drückt das Auto nach hinten (Luftwiderstand).'), T('The car pushes the air forward.', 'Das Auto drückt die Luft nach vorn.')],
        pairs: [[0, 1], [2, 3]], balance: [0, 2],
        draw: () => D.line(0, 170, 360, 170, 'gline') + D.car(110, 170, 140) +
          D.arrow(146, 168, 190, 168, 'f', '') + D.arrow(146, 178, 102, 178, 'f', '', { cls: 'pair' }) + D.arrow(250, 130, 214, 130, 'f', '') + D.arrow(256, 116, 300, 116, 'f', '', { cls: 'pair' }) +
          D.text(194, 166, '1', 'lbl f', 'start') + D.text(98, 182, '2', 'lbl f', 'end') + D.text(210, 126, '3', 'lbl f', 'end') + D.text(304, 120, '4', 'lbl f', 'start') + D.arrow(30, 40, 80, 40, 'm', '', { head: 7 }) + D.words(88, 44, T('speeding up', 'wird schneller'), 'start'),
      },
      fridge: {
        title: T('Magnet on a fridge', 'Magnet am Kühlschrank'),
        text: T('A magnet sticks at rest to the side of a steel fridge. The four horizontal forces between the magnet and the fridge are numbered in the picture.', 'Ein Magnet haftet ruhig an der Seitenwand eines Kühlschranks aus Stahl. Die vier waagrechten Kräfte zwischen Magnet und Kühlschrank sind im Bild nummeriert.'),
        forces: [T('The fridge pulls the magnet to the right.', 'Der Kühlschrank zieht den Magneten nach rechts.'), T('The magnet pushes the fridge to the right.', 'Der Magnet drückt den Kühlschrank nach rechts.'),
          T('The fridge pushes the magnet to the left.', 'Der Kühlschrank drückt den Magneten nach links.'), T('The magnet pulls the fridge to the left.', 'Der Magnet zieht den Kühlschrank nach links.')],
        pairs: [[0, 3], [1, 2]], balance: [0, 2],
        draw: () => D.ground(20, 340, 214) + D.rect(200, 20, 120, 194, 'obj', 4) + D.rect(176, 88, 24, 46, 'mag-n', 2) +
          D.arrow(186, 96, 230, 96, 'f', '') + D.arrow(200, 126, 244, 126, 'f', '', { cls: 'pair' }) + D.arrow(192, 116, 148, 116, 'f', '') + D.arrow(200, 106, 156, 106, 'f', '', { cls: 'pair' }) +
          D.text(234, 100, '1', 'lbl f', 'start') + D.text(248, 130, '2', 'lbl f', 'start') + D.text(144, 124, '3', 'lbl f', 'end') + D.text(152, 106, '4', 'lbl f', 'end') + D.words(260, 200, T('fridge', 'Kühlschrank')),
      },
      trailer: {
        title: T('Car with a trailer', 'Auto mit Anhänger'),
        text: T('A car pulls a trailer along a level road at constant speed; air resistance is negligible. Four forces are numbered in the picture.', 'Ein Auto zieht einen Anhänger mit konstanter Geschwindigkeit über eine ebene Strasse; der Luftwiderstand ist vernachlässigbar. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The car pulls the trailer forward.', 'Das Auto zieht den Anhänger nach vorn.'), T('The road pushes the trailer backward (friction).', 'Die Strasse drückt den Anhänger nach hinten (Reibung).'),
          T('The trailer pushes the road forward.', 'Der Anhänger drückt die Strasse nach vorn.'), T('The trailer pulls the car backward.', 'Der Anhänger zieht das Auto nach hinten.')],
        pairs: [[0, 3], [1, 2]], balance: [0, 1], state: 'constant',
        draw: () => D.line(0, 176, 360, 176, 'gline') + D.rect(40, 120, 120, 40, 'obj', 3) + D.ball(70, 164, 12, 'wheel') + D.line(160, 150, 192, 150, 'cable') + D.car(190, 176, 140) +
          D.arrow(160, 144, 204, 144, 'f', '') + D.arrow(70, 174, 26, 174, 'f', '') + D.arrow(70, 186, 114, 186, 'f', '', { cls: 'pair' }) + D.arrow(192, 156, 148, 156, 'f', '', { cls: 'pair' }) +
          D.text(206, 138, '1', 'lbl f', 'start') + D.text(30, 166, '2', 'lbl f', 'start') + D.text(118, 190, '3', 'lbl f', 'start') + D.text(144, 166, '4', 'lbl f', 'end') +
          D.arrow(30, 40, 80, 40, 'm', '', { head: 7 }) + D.words(88, 44, T('constant speed', 'gleichförmig'), 'start'),
      },
      boat: {
        title: T('A floating boat', 'Ein schwimmendes Boot'),
        text: T('A boat floats at rest on a lake. Four forces are numbered in the picture.', 'Ein Boot schwimmt ruhig auf einem See. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The water pushes the boat up.', 'Das Wasser drückt das Boot nach oben.'), T('The boat pulls the Earth up.', 'Das Boot zieht die Erde nach oben.'),
          T('The Earth pulls the boat down.', 'Die Erde zieht das Boot nach unten.'), T('The boat pushes the water down.', 'Das Boot drückt das Wasser nach unten.')],
        pairs: [[0, 3], [1, 2]], balance: [0, 2],
        draw: () => D.rect(0, 130, 360, 70, 'ice', 0) + D.line(0, 130, 360, 130, 'ln') + D.ground(0, 360, 200) + `<polygon class="obj" points="120,104 240,104 220,146 140,146"/>` +
          D.arrow(196, 146, 196, 96, 'f', '') + D.arrow(164, 112, 164, 160, 'f', '') + D.arrow(210, 146, 210, 190, 'f', '', { cls: 'pair' }) + D.arrow(60, 200, 60, 156, 'f', '', { cls: 'pair' }) +
          D.text(204, 100, '1', 'lbl f', 'start') + D.text(156, 160, '3', 'lbl f', 'end') + D.text(218, 188, '4', 'lbl f', 'start') + D.text(68, 162, '2', 'lbl f', 'start') + D.words(68, 194, T('(on the Earth)', '(auf die Erde)'), 'start'),
      },
      helicopter: {
        title: T('A hovering helicopter', 'Ein schwebender Helikopter'),
        text: T('A helicopter hovers at rest above the ground; its rotor pushes air down. Four forces are numbered in the picture.', 'Ein Helikopter schwebt ruhig über dem Boden; sein Rotor drückt Luft nach unten. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The helicopter pushes the air down.', 'Der Helikopter drückt die Luft nach unten.'), T('The Earth pulls the helicopter down.', 'Die Erde zieht den Helikopter nach unten.'),
          T('The helicopter pulls the Earth up.', 'Der Helikopter zieht die Erde nach oben.'), T('The air pushes the helicopter up.', 'Die Luft drückt den Helikopter nach oben.')],
        pairs: [[0, 3], [1, 2]], balance: [1, 3],
        draw: () => D.ground(20, 340, 210) + `<path class="trace" d="M108 66 v44 M244 66 v44"/>` + D.line(220, 88, 300, 80, 'body') + D.line(300, 70, 300, 92, 'body') +
          `<ellipse class="obj" cx="180" cy="92" rx="42" ry="22"/>` + D.line(110, 58, 250, 58, 'body') + D.line(180, 58, 180, 70, 'body') + D.line(150, 130, 214, 130, 'body') + D.line(164, 112, 160, 130, 'body') + D.line(198, 112, 202, 130, 'body') +
          D.arrow(130, 66, 130, 110, 'f', '', { cls: 'pair' }) + D.arrow(166, 98, 166, 144, 'f', '') + D.arrow(60, 210, 60, 166, 'f', '', { cls: 'pair' }) + D.arrow(196, 86, 196, 40, 'f', '') +
          D.text(138, 108, '1', 'lbl f', 'start') + D.text(158, 148, '2', 'lbl f', 'end') + D.text(68, 172, '3', 'lbl f', 'start') + D.text(204, 44, '4', 'lbl f', 'start') + D.words(68, 204, T('(on the Earth)', '(auf die Erde)'), 'start'),
      },
      float: {
        title: T('A floating magnet', 'Ein schwebender Magnet'),
        text: T('A ring magnet floats at rest above another ring magnet that lies on a table; a smooth rod through both keeps it from sliding off sideways. Four forces are numbered in the picture.', 'Ein Ringmagnet schwebt ruhig über einem anderen Ringmagneten, der auf einem Tisch liegt; ein glatter Stab durch beide verhindert, dass er seitlich wegrutscht. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The lower magnet pushes the upper magnet up.', 'Der untere Magnet drückt den oberen Magneten nach oben.'), T('The upper magnet pushes the lower magnet down.', 'Der obere Magnet drückt den unteren Magneten nach unten.'),
          T('The Earth pulls the upper magnet down.', 'Die Erde zieht den oberen Magneten nach unten.'), T('The upper magnet pulls the Earth up.', 'Der obere Magnet zieht die Erde nach oben.')],
        pairs: [[0, 1], [2, 3]], balance: [0, 2],
        draw: () => D.ground(20, 340, 214) + D.table(90, 160, 180, 214) + D.line(180, 50, 180, 160, 'cable') +
          D.rect(150, 80, 60, 10, 'mag-s', 1) + D.rect(150, 90, 60, 10, 'mag-n', 1) + D.rect(150, 140, 60, 10, 'mag-n', 1) + D.rect(150, 150, 60, 10, 'mag-s', 1) +
          D.arrow(196, 92, 196, 46, 'f', '') + D.arrow(204, 140, 204, 184, 'f', '', { cls: 'pair' }) + D.arrow(164, 92, 164, 134, 'f', '') + D.arrow(300, 214, 300, 172, 'f', '', { cls: 'pair' }) +
          D.text(204, 50, '1', 'lbl f', 'start') + D.text(212, 182, '2', 'lbl f', 'start') + D.text(156, 132, '3', 'lbl f', 'end') + D.text(308, 178, '4', 'lbl f', 'start') + D.words(304, 160, T('(on the Earth)', '(auf die Erde)')),
      },
      rocket: {
        title: T('A rising rocket', 'Eine steigende Rakete'),
        text: T('A rocket rises vertically at constant speed; air resistance is negligible. Its engine pushes hot gas out downward. Four forces are numbered in the picture.', 'Eine Rakete steigt mit konstanter Geschwindigkeit senkrecht auf; der Luftwiderstand ist vernachlässigbar. Ihr Triebwerk stösst heisses Gas nach unten aus. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The Earth pulls the rocket down.', 'Die Erde zieht die Rakete nach unten.'), T('The rocket pushes the gas down.', 'Die Rakete drückt das Gas nach unten.'),
          T('The gas pushes the rocket up.', 'Das Gas drückt die Rakete nach oben.'), T('The rocket pulls the Earth up.', 'Die Rakete zieht die Erde nach oben.')],
        pairs: [[0, 3], [1, 2]], balance: [0, 2], state: 'constant',
        draw: () => D.ground(20, 340, 214) + `<polygon class="flame" points="168,138 192,138 180,184"/>` + `<polygon class="obj" points="165,112 150,138 165,132"/>` + `<polygon class="obj" points="195,112 210,138 195,132"/>` +
          D.rect(165, 40, 30, 98, 'obj', 3) + `<polygon class="obj" points="165,40 180,12 195,40"/>` +
          D.arrow(144, 72, 144, 118, 'f', '') + D.arrow(196, 140, 196, 186, 'f', '', { cls: 'pair' }) + D.arrow(206, 132, 206, 86, 'f', '') + D.arrow(60, 214, 60, 170, 'f', '', { cls: 'pair' }) +
          D.text(136, 118, '1', 'lbl f', 'end') + D.text(204, 184, '2', 'lbl f', 'start') + D.text(214, 90, '3', 'lbl f', 'start') + D.text(68, 176, '4', 'lbl f', 'start') + D.words(68, 208, T('(on the Earth)', '(auf die Erde)'), 'start') +
          D.arrow(296, 110, 296, 60, 'm', '', { head: 7 }) + D.words(296, 128, T('constant speed', 'gleichförmig')),
      },
      crate: {
        title: T('Pushing a crate', 'Eine Kiste schieben'),
        text: T('A worker pushes a crate across the floor at constant speed. Four forces are numbered in the picture.', 'Ein Arbeiter schiebt eine Kiste mit konstanter Geschwindigkeit über den Boden. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The floor pushes the crate backward (friction).', 'Der Boden drückt die Kiste nach hinten (Reibung).'), T('The worker pushes the crate forward.', 'Der Arbeiter drückt die Kiste nach vorn.'),
          T('The crate pushes the floor forward.', 'Die Kiste drückt den Boden nach vorn.'), T('The crate pushes the worker backward.', 'Die Kiste drückt den Arbeiter nach hinten.')],
        pairs: [[0, 2], [1, 3]], balance: [0, 1], state: 'constant',
        draw: () => D.ground(20, 340, 190) + D.rect(190, 100, 90, 90, 'obj', 2) + `<g transform="rotate(10 140 190)">${D.person(140, 190, 116, 1, 'push')}</g>` +
          D.arrow(258, 182, 214, 182, 'f', '') + D.arrow(196, 116, 240, 116, 'f', '') + D.arrow(240, 198, 284, 198, 'f', '', { cls: 'pair' }) + D.arrow(192, 116, 148, 116, 'f', '', { cls: 'pair' }) +
          D.text(210, 178, '1', 'lbl f', 'end') + D.text(244, 120, '2', 'lbl f', 'start') + D.text(288, 202, '3', 'lbl f', 'start') + D.text(146, 130, '4', 'lbl f', 'end') +
          D.arrow(30, 40, 80, 40, 'm', '', { head: 7 }) + D.words(88, 44, T('constant speed', 'gleichförmig'), 'start'),
      },
      scales: {
        title: T('Standing on scales', 'Auf der Personenwaage'),
        text: T('A boy stands at rest on bathroom scales. Four forces are numbered in the picture.', 'Ein Junge steht ruhig auf einer Personenwaage. Im Bild sind vier Kräfte nummeriert.'),
        forces: [T('The boy pushes the scales down.', 'Der Junge drückt die Waage nach unten.'), T('The Earth pulls the boy down.', 'Die Erde zieht den Jungen nach unten.'),
          T('The scales push the boy up.', 'Die Waage drückt den Jungen nach oben.'), T('The boy pulls the Earth up.', 'Der Junge zieht die Erde nach oben.')],
        pairs: [[0, 2], [1, 3]], balance: [1, 2],
        draw: () => D.ground(20, 340, 200) + D.rect(136, 186, 88, 14, 'obj', 3) + D.rect(172, 189, 16, 6, 'win', 1) + D.person(180, 186, 120, 1, 'down') +
          D.arrow(194, 188, 194, 228, 'f', '', { cls: 'pair' }) + D.arrow(180, 138, 180, 184, 'f', '') + D.arrow(163, 186, 163, 140, 'f', '') + D.arrow(40, 200, 40, 156, 'f', '', { cls: 'pair' }) +
          D.text(202, 226, '1', 'lbl f', 'start') + D.text(198, 170, '2', 'lbl f', 'start') + D.text(155, 144, '3', 'lbl f', 'end') + D.text(48, 162, '4', 'lbl f', 'start') + D.words(24, 146, T('(on the Earth)', '(auf die Erde)'), 'start'),
      },
    };
  }

  function matchPartners(r, p) {
    const key = p.scene || r.pick(Object.keys(scenes()));
    const sc = scenes()[key];
    const partner = (i) => { const pr = sc.pairs.find((x) => x.includes(i)); return pr[0] === i ? pr[1] : pr[0]; };
    const num = (i) => String(i + 1);
    const choices = sc.forces.map((f, i) => ({ id: num(i), label: `<b>${i + 1}</b> ${f}`, name: num(i) }));
    const swap = T('Third-law partners belong to the same interaction: the same two bodies, swapped.', 'Kraft und Gegenkraft gehören zur selben Wechselwirkung: dieselben zwei Körper, vertauscht.');
    const items = sc.forces.map((f, i) => {
      const wrong = {};
      if (sc.balance.includes(i)) {
        const other = sc.balance[0] === i ? sc.balance[1] : sc.balance[0];
        wrong[num(other)] = { code: 'pair-confusion', why: T(`Forces ${i + 1} and ${other + 1} both act on the same body. ${key === 'car' ? 'They may even balance' : 'They balance'}, but they are not a third-law pair. ${swap}`,
          `Die Kräfte ${i + 1} und ${other + 1} wirken beide auf denselben Körper. ${key === 'car' ? 'Sie können sich sogar aufheben' : 'Sie heben sich auf'}, sind aber kein Kraft-Gegenkraft-Paar. ${swap}`) };
      }
      wrong[num(i)] = { code: 'other', why: T('A force is not its own partner: the partner acts on the other body.', 'Eine Kraft ist nicht ihre eigene Gegenkraft: Die Gegenkraft wirkt auf den anderen Körper.') };
      return { label: `<b>${i + 1}</b> ${f}`, name: num(i), answer: num(partner(i)), wrong,
        other: T(`That is not its partner. ${swap}`, `Das ist nicht ihre Gegenkraft. ${swap}`),
        why: T(`${i + 1} ↔ ${partner(i) + 1}: ${swap}`, `${i + 1} ↔ ${partner(i) + 1}: ${swap}`) };
    });
    const figure = (o = {}) => D.svg(360, 232, sc.draw(o), sc.title);
    const pairsText = sc.pairs.map(([a, b]) => `${a + 1} ↔ ${b + 1}`).join(T(' and ', ' und '));
    const q = match('partners', T('Match each force with its third-law partner (the force with which the other body pushes or pulls back).', 'Ordne jeder Kraft ihre Gegenkraft zu (die Kraft, mit der der andere Körper zurückdrückt oder zurückzieht).'), items, choices);
    q.same = true; // the choices are the items themselves
    return {
      title: sc.title,
      situation: `<p>${sc.text}</p>`,
      figure: figure(),
      questions: [q],
      hints: [
        T('For each force, name the two bodies: who exerts it, and on whom?', 'Nenne für jede Kraft die beiden Körper: Wer übt sie aus, und auf wen?'),
        T('Plan: the partner of “A acts on B” is “B acts on A” — find the force with the two bodies swapped.', 'Plan: Die Gegenkraft zu „A wirkt auf B“ ist „B wirkt auf A“ — suche die Kraft mit den vertauschten Körpern.'),
        T('Recall the third law: what do the two forces of a pair have in common, and on which bodies do they act?', 'Erinnere dich an das dritte Gesetz: Was haben die beiden Kräfte eines Paars gemeinsam, und auf welche Körper wirken sie?'),
        T('Here: check every pair you matched. Do its two forces act on two different bodies, and are these the same two bodies, swapped?', 'Hier: Prüfe jedes Paar, das du gebildet hast. Wirken seine beiden Kräfte auf zwei verschiedene Körper, und sind es dieselben zwei Körper, vertauscht?'),
      ],
      steps: [
        { title: T('Interactions', 'Wechselwirkungen'), figure: figure(),
          text: T(`Each force belongs to an interaction between two bodies. Swapping the bodies gives the partner: ${pairsText}.`, `Jede Kraft gehört zu einer Wechselwirkung zwischen zwei Körpern. Vertauscht man die Körper, erhält man die Gegenkraft: ${pairsText}.`) },
        { title: T('Balanced is not a pair', 'Gleichgewicht ist kein Paar'), figure: figure(),
          text: T(`Forces ${sc.balance[0] + 1} and ${sc.balance[1] + 1} both act on the same body. ${key === 'car' ? 'At constant speed they would balance' : sc.state === 'constant' ? 'They balance, because the body moves at constant velocity' : 'They balance, because the body is at rest'} — but they belong to different interactions, so they are not partners.`,
            `Die Kräfte ${sc.balance[0] + 1} und ${sc.balance[1] + 1} wirken beide auf denselben Körper. ${key === 'car' ? 'Bei konstanter Geschwindigkeit würden sie sich aufheben' : sc.state === 'constant' ? 'Sie heben sich auf, weil sich der Körper mit konstanter Geschwindigkeit bewegt' : 'Sie heben sich auf, weil der Körper in Ruhe ist'} — aber sie gehören zu verschiedenen Wechselwirkungen, also sind sie kein Paar.`) },
      ],
    };
  }

  register('interact', 'match-partners', matchPartners);
})(typeof window !== 'undefined' ? window : globalThis);
