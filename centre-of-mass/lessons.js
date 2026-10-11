// The tutor's worked examples, from easy to hard: the tasks of the worksheet “Übungen Schwerpunkt”
// and more (scenario and parameters as in scenarios.js). Each is a topic of practice (see
// topics.js) with its stages: first exercises like the example, then variations with new ideas
// (types: the scenarios).
(function (root) {
  'use strict';

  const EXAMPLES = [
    {
      scenario: 'com-L', p: { h: 12, b: 8 },
      practice: [{ types: ['com-L'] }, { en: 'T, gate and E', de: 'T, Tor und E', types: ['com-T', 'com-U', 'com-E'] }, { en: 'slanted sides: triangles, house', de: 'schräge Seiten: Dreiecke, Haus', types: ['com-tri', 'com-iso', 'com-house'] }],
      name: { en: 'Centre of mass', de: 'Schwerpunkt' },
      idea: { en: 'Split the figure into simple parts, find the centre of mass of each, then combine them two at a time: the common centre divides the line between them so that m₁ · a₁ = m₂ · a₂.', de: 'Zerlege die Figur in einfache Teile, bestimme den Schwerpunkt jedes Teils und fasse sie dann schrittweise zu zweit zusammen: Der gemeinsame Schwerpunkt teilt die Verbindungslinie so, dass m₁ · a₁ = m₂ · a₂.' },
    },
    {
      scenario: 'com-sqstick', p: { h: 10, s: 5 },
      practice: [{ types: ['com-sqstick', 'com-corner', 'com-swatter', 'com-sign'] }, { en: 'two squares, stand, triangle on a stick, dumbbell', de: 'zwei Quadrate, Ständer, Dreieck auf einem Stab, Hantel', types: ['com-stack', 'com-stand', 'com-tristick', 'com-bell'] }],
      name: { en: 'Square on a stick', de: 'Quadrat auf Stab' },
      idea: { en: 'A closed figure first: opposite sides of equal length meet in the middle, so a square’s centre of mass is its centre. Then combine it with the stick.', de: 'Zuerst die geschlossene Figur: Gegenüberliegende gleich lange Seiten treffen sich in der Mitte, also ist der Schwerpunkt eines Quadrats sein Mittelpunkt. Dann mit dem Stab zusammenfassen.' },
    },
    {
      scenario: 'stability', p: { w: 60, h: 30, phi: 20, D: [15, 5] },
      practice: [{ types: ['stability'] }],
      name: { en: 'Stable or not?', de: 'Stabil oder nicht?' },
      idea: { en: 'A body on an axis rests only when its centre of mass is on the vertical through the axis: below the axis, stable; above it, unstable; at the axis, neutral.', de: 'Ein Körper an einer Achse ruht nur, wenn sein Schwerpunkt auf der Senkrechten durch die Achse liegt: unter der Achse stabil, darüber labil, in der Achse indifferent.' },
    },
    {
      scenario: 'tips', p: { bodies: [{ w: 20, h: 50, sy: 25, th: 8 }, { w: 30, h: 50, sy: 25, th: 17 }, { w: 20, h: 80, sy: 40, th: 22 }, { w: 40, h: 60, sy: 30, th: 24 }], falls: 2 },
      practice: [{ types: ['tips'] }],
      name: { en: 'Does it fall over?', de: 'Kippt er um?' },
      idea: { en: 'A tilted body falls over when the line of action of its weight, the vertical through its centre of mass, passes beyond the edge it stands on.', de: 'Ein geneigter Körper kippt um, wenn die Wirkungslinie seiner Gewichtskraft, die Senkrechte durch seinen Schwerpunkt, ausserhalb der Kante verläuft, auf der er steht.' },
    },
    {
      scenario: 'tilt', p: { w: 60, h: 120 },
      practice: [{ types: ['tilt'] }, { en: 'pushed sideways', de: 'seitlich gestossen', types: ['tip'] }],
      name: { en: 'How far can it lean?', de: 'Wie weit kann er sich neigen?' },
      idea: { en: 'Tilted onto an edge, a body falls once its centre of mass is straight above that edge; a low, wide body can lean further.', de: 'Über eine Kante geneigt, fällt ein Körper, sobald sein Schwerpunkt senkrecht über dieser Kante liegt; ein niedriger, breiter Körper kann sich weiter neigen.' },
    },
  ];

  root.Lessons = { EXAMPLES };
  if (typeof module !== 'undefined') module.exports = { EXAMPLES };
})(typeof window !== 'undefined' ? window : globalThis);
