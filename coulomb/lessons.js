// The tutor's worked examples, from easy to hard, with the tasks of the worksheet “Force Vectors”
// (the ranking of arrangements A, B and C, and the charge in B moved slightly), then the field: the
// force per charge, and the fields of several charges added. Each is a topic of
// practice (see topics.js) with its stages: first exercises like the example, then variations
// with new ideas (types: the situations of scenarios.js).
(function (root) {
  'use strict';

  const h = Math.sqrt(3) / 2;
  const EXAMPLES = [
    {
      scenario: 'pair-dir', p: { a: [0, 0], b: [1, 1], qa: 3e-6, qb: -1e-6 },
      practice: [{ types: ['pair-dir'] }, { en: 'with numbers: Coulomb’s law', de: 'mit Zahlen: Coulombgesetz', types: ['pair'] }],
      name: { en: 'Two charges', de: 'Zwei Ladungen' },
      idea: { en: 'The force lies on the line through the two charges: like charges repel, unlike charges attract. Both charges feel a force of the same size, F = k |q<sub>A</sub>| |q<sub>B</sub>|/r², in opposite directions, however different the charges.', de: 'Die Kraft liegt auf der Geraden durch die beiden Ladungen: Gleichnamige Ladungen stossen sich ab, ungleichnamige ziehen sich an. Beide Ladungen spüren eine gleich grosse Kraft, F = k |q<sub>A</sub>| |q<sub>B</sub>|/r², in entgegengesetzte Richtungen, wie verschieden die Ladungen auch sind.' },
    },
    {
      scenario: 'factor', p: { what: 'r', n: 2, a: 1, b: 1, s1: 1, s2: 1 },
      practice: [{ types: ['factor'] }, { en: 'several changes, or the distance wanted', de: 'mehrere Änderungen, oder der Abstand gesucht', types: ['factor-mix', 'factor-find'] }],
      name: { en: 'Twice as far', de: 'Doppelt so weit' },
      idea: { en: 'Without numbers: compare the new force with the old one, and everything that stays the same cancels.', de: 'Ohne Zahlen: Vergleiche die neue Kraft mit der alten, und alles Gleichbleibende kürzt sich.' },
    },
    {
      scenario: 'line-end', p: { mid: false, t: 1, qa: -3, qb: 4, xa: 1, xb: 2 },
      practice: [{ types: ['line-end'] }, { en: 'the charge in the middle', de: 'die Ladung in der Mitte', types: ['line-mid'] }],
      name: { en: 'Three in a line', de: 'Drei auf einer Geraden' },
      idea: { en: 'Each charge exerts its own force, as if the others were not there; the net force is their sum (superposition). In units of F₀ = k q²/d², no calculation is needed to see which force wins.', de: 'Jede Ladung übt ihre eigene Kraft aus, als ob die anderen nicht da wären; die resultierende Kraft ist ihre Summe (Superposition). In Einheiten von F₀ = k q²/d² sieht man ohne Rechnung, welche Kraft gewinnt.' },
    },
    {
      scenario: 'which-tri', p: { shape: 'tri', scaleF: 1.96, pts: [{ c: [0, 1.4 * h * 2 / 3], s: 1 }, { c: [-0.7, -1.4 * h / 3], s: -1 }, { c: [0.7, -1.4 * h / 3], s: 1 }] },
      practice: [{ types: ['which-tri'] }, { en: 'squares and grids', de: 'Quadrate und Gitter', types: ['which-square'] }],
      name: { en: 'Which way?', de: 'Wohin?' },
      idea: { en: 'Equal charges at equal distances: draw the forces as arrows and let symmetry tell what cancels.', de: 'Gleiche Ladungen in gleichen Abständen: Zeichne die Kräfte als Pfeile und lass die Symmetrie sagen, was sich aufhebt.' },
    },
    {
      scenario: 'rank', p: { s: [-1, -1], keys: ['end', 'mid', 'right'] },
      practice: [{ types: ['rank'] }, { en: 'four arrangements', de: 'vier Anordnungen', types: ['rank4'] }],
      name: { en: 'Ranking arrangements', de: 'Anordnungen ordnen' },
      idea: { en: 'Measure the forces in units of F₀ = k q²/d²: at twice the distance a quarter, and add them as arrows.', de: 'Miss die Kräfte in Einheiten von F₀ = k q²/d²: im doppelten Abstand ein Viertel, und addiere sie als Pfeile.' },
    },
    {
      scenario: 'right', p: { t: 2e-6, q1: 3e-6, q2: -4e-6, x1: 0.2, y2: 0.2, F1: 0.6 },
      practice: [{ types: ['right'] }, { en: 'different distances', de: 'verschiedene Abstände', types: ['right-dist'] }],
      name: { en: 'At a right angle', de: 'Im rechten Winkel' },
      idea: { en: 'One force is given, the other follows from the ratio of the charges and distances. Perpendicular forces add like the sides of a rectangle: the net force is its diagonal (Pythagoras).', de: 'Eine Kraft ist gegeben, die andere folgt aus dem Verhältnis der Ladungen und Abstände. Senkrechte Kräfte addieren sich wie die Seiten eines Rechtecks: Die resultierende Kraft ist seine Diagonale (Pythagoras).' },
    },
    {
      scenario: 'zero-like', p: { q1: 1e-6, q2: 4e-6, d: 0.6, like: true },
      practice: [{ types: ['zero-like'] }, { en: 'unlike charges', de: 'ungleichnamige Ladungen', types: ['zero-unlike'] }],
      name: { en: 'Where is the force zero?', de: 'Wo ist die Kraft null?' },
      idea: { en: 'First where: the two forces must point in opposite directions. Then how far: equal forces, and the distances in the ratio of the square roots of the charges.', de: 'Zuerst wo: Die beiden Kräfte müssen entgegengesetzt zeigen. Dann wie weit: gleiche Kräfte, und die Abstände im Verhältnis der Wurzeln der Ladungen.' },
    },
    {
      scenario: 'nudge-along', p: { across: false, so: -1, sm: 1, dir: 'E', vert: false },
      practice: [{ types: ['nudge-along'] }, { en: 'moved off the line', de: 'neben die Gerade verschoben', types: ['nudge-across'] }],
      name: { en: 'Moved slightly', de: 'Leicht verschoben' },
      idea: { en: 'In the middle the forces cancel. Moved slightly, the nearer charge acts more strongly: does the net force push the charge back, or further away?', de: 'In der Mitte heben sich die Kräfte auf. Leicht verschoben wirkt die nähere Ladung stärker: Treibt die resultierende Kraft die Ladung zurück oder weiter weg?' },
    },
    {
      scenario: 'field-force', p: { q1: 2e-9, E: 3000, d: 'E', q2: -4e-9 },
      practice: [{ types: ['field-force'] }],
      name: { en: 'Field and force', de: 'Feld und Kraft' },
      idea: { en: 'The field at a point is the force per charge, E = F/q: it belongs to the point, not to the test charge. A positive charge is pushed along the field, a negative charge against it.', de: 'Das Feld in einem Punkt ist die Kraft pro Ladung, E = F/q: Es gehört zum Punkt, nicht zur Probeladung. Eine positive Ladung wird in Feldrichtung gestossen, eine negative entgegen.' },
    },
    {
      scenario: 'field-sum', p: { ch: [{ c: [-1, 1], s: 1 }, { c: [1, 1], s: -1 }, { c: [-2, 0], s: 1 }] },
      practice: [{ types: ['field-sum'] }],
      name: { en: 'Fields add up', de: 'Felder addieren sich' },
      idea: { en: 'Like forces, the fields of several charges add up as arrows. The force on a charge at that point follows from the net field.', de: 'Wie Kräfte addieren sich die Felder mehrerer Ladungen als Pfeile. Die Kraft auf eine Ladung in diesem Punkt folgt aus dem Gesamtfeld.' },
    },
  ];

  root.Lessons = { EXAMPLES };
  if (typeof module !== 'undefined') module.exports = { EXAMPLES };
})(typeof window !== 'undefined' ? window : globalThis);
