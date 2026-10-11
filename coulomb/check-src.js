// The check (see check.js, shared by the apps): the learning objectives, each with the kinds of
// question that test it, its worked example and its practice topic (lessons.js), and the
// questions. Each asks for one answer of a practice exercise, with four options (see quiz() in
// generator.js): a number, a direction or a ranking, the answers of typical wrong ideas first.
(function (root) {
  'use strict';

  const CL = root.CL, { practiceOf, quiz } = root.Coulomb;
  const L = (en, de) => CL.L(en, de);

  const OBJECTIVES = [
    { id: 'direction', kinds: ['pair-dir', 'pair-back'], tutor: 0, topic: 0,
      name: () => L('Find the direction of the Coulomb force: along the line through the two charges, like charges repelling, unlike charges attracting, and the two forces equal and opposite.',
        'Die Richtung der Coulombkraft bestimmen: entlang der Geraden durch die beiden Ladungen, gleichnamige stossen sich ab, ungleichnamige ziehen sich an, und die beiden Kräfte sind gleich gross und entgegengesetzt.') },
    { id: 'factor', kinds: ['factor', 'factor-mix', 'factor-find'], tutor: 1, topic: 1,
      name: () => L('Predict by what factor the force changes when the charges or their distance change (the inverse square law).',
        'Vorhersagen, um welchen Faktor sich die Kraft ändert, wenn sich die Ladungen oder ihr Abstand ändern (das 1/r²-Gesetz).') },
    { id: 'vector', kinds: ['which-tri', 'rank', 'right', 'zero-like', 'which-square', 'nudge-along', 'field-sum'], tutor: 2, topic: 2,
      name: () => L('Add the forces of several charges as vectors: the net force, its direction, and where it is zero.',
        'Die Kräfte mehrerer Ladungen als Vektoren addieren: die resultierende Kraft, ihre Richtung und wo sie null ist.') },
    { id: 'field', kinds: ['field-strength', 'field-force', 'field-dir', 'field-neg'], tutor: 8, topic: 8,
      name: () => L('Relate field and force with E = F/q: the force on a positive charge along the field, on a negative charge against it.',
        'Feld und Kraft mit E = F/q verknüpfen: die Kraft auf eine positive Ladung in Feldrichtung, auf eine negative entgegen.') },
  ];

  // The kinds that ask for another answer than the first of their exercise: [situation, field].
  const ASKED = { 'pair-back': ['pair-dir', 'dA'], 'field-strength': ['field-force', 'E'], 'field-force': ['field-force', 'F2'], 'field-dir': ['field-force', 'dir'], 'field-neg': ['field-sum', 'F'] };
  // the question for a direction
  const towards = () => ({
    dB: L('In which direction does the force on B point?', 'In welche Richtung zeigt die Kraft auf B?'),
    dA: L('In which direction does the force on A point?', 'In welche Richtung zeigt die Kraft auf A?'),
    E: L('In which direction does the net field at P point?', 'In welche Richtung zeigt das Gesamtfeld in P?'),
    F: L('In which direction does the force on a negative charge at P point?', 'In welche Richtung zeigt die Kraft auf eine negative Ladung in P?'),
    dir: L('In which direction does the force on the second charge point?', 'In welche Richtung zeigt die Kraft auf die zweite Ladung?'),
  });

  // The idea behind each wrong-answer flag.
  const concept = {
    noSquare: 'square', noRoot: 'square', wrongWay: 'square', oneCharge: 'charges', noSigns: 'vector', sum: 'vector', largest: 'vector', sameDist: 'distance',
    between: 'zero', other: 'zero', signs: 'signs', third: 'third', fieldSign: 'fieldDir', negAlong: 'negative', against: 'negative', sameF: 'perCharge', inverse: 'perCharge',
  };
  const concepts = () => ({
    square: L('the distance not squared', 'Abstand nicht quadriert'),
    charges: L('not both charges counted', 'nicht beide Ladungen berücksichtigt'),
    vector: L('forces added as numbers, not as arrows', 'Kräfte als Zahlen statt als Pfeile addiert'),
    distance: L('a distance measured from the wrong charge', 'einen Abstand von der falschen Ladung aus gemessen'),
    zero: L('where the forces can cancel', 'wo sich die Kräfte aufheben können'),
    signs: L('like and unlike charges mixed up', 'gleichnamige und ungleichnamige Ladungen verwechselt'),
    third: L('unequal forces on the two charges (Newton’s third law)', 'ungleiche Kräfte auf die beiden Ladungen (actio = reactio)'),
    fieldDir: L('the field of a charge the wrong way round', 'das Feld einer Ladung falsch herum'),
    negative: L('the force on a negative charge along the field', 'die Kraft auf eine negative Ladung in Feldrichtung'),
    perCharge: L('the force taken as independent of the charge', 'die Kraft als unabhängig von der Ladung angenommen'),
  });

  function question(kind, seed) {
    const [scenario, key] = ASKED[kind] || [kind], ex = practiceOf(scenario, seed), qz = quiz(ex, seed, key), f = qz.field;
    const ask = f.type === 'num' ? L(`Find the ${f.what.replace(/<[^>]*>/g, '')} $${f.sym}$.`, `Wie gross ist $${f.sym}$ (${f.what.replace(/<[^>]*>/g, '')})?`)
      : f.type === 'dir' ? towards()[f.key] || L('In which direction does the net force point?', 'In welche Richtung zeigt die resultierende Kraft?')
        : f.type === 'rank' ? L('Which order is right, from the largest net force to the smallest?', 'Welche Reihenfolge stimmt, von der grössten resultierenden Kraft zur kleinsten?')
          : f.what;
    return {
      title: ex.title,
      text: ex.text,
      figure: ex.figure({ task: true }),
      ask,
      options: qz.options.map((o) => ({ html: o.html, correct: !!o.correct, flag: o.flag, why: o.why })),
      explain: () => `<div class="figs">${ex.solutionFigure()}</div><div class="steps">${ex.solution.join('')}</div>`,
      key: `${scenario}|${f.key}|${JSON.stringify(ex.p)}`,
    };
  }

  root.CheckSource = { id: 'cl', objectives: OBJECTIVES, question, concept, concepts };
  if (typeof module !== 'undefined') module.exports = root.CheckSource;
})(typeof window !== 'undefined' ? window : globalThis);
