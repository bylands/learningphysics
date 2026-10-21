// The check (see check.js, shared by the apps): the learning objectives, each with the exercise
// types (scenarios.js) that test it, its worked example and its practice topic (lessons.js), and
// the questions. Each asks for one answer of an exercise, with four options (see quiz() in
// generator.js): a direction, a region of the spectrum, a statement, or a number.
(function (root) {
  'use strict';

  const EW = root.EW, { practiceOf, quiz } = root.EWaves;
  const L = (en, de) => EW.L(en, de);

  const OBJECTIVES = [
    { id: 'dirs', kinds: ['eb-dir', 'eb-ratio', 'concept-eb', 'eb-dir'], tutor: 2, topic: 2,
      name: () => L('Determine the direction of propagation from E and B, which form a right-handed set with it, and get one field from the other with E = c·B.',
        'Die Ausbreitungsrichtung aus E und B bestimmen, die mit ihr ein Rechtssystem bilden, und das eine Feld mit E = c·B aus dem andern berechnen.') },
    { id: 'speed', kinds: ['medium', 'medium-back', 'concept-c'], tutor: 1, topic: 1,
      name: () => L('Use the speed c in vacuum and c/n in a medium, where the frequency stays the same and the wavelength shrinks to λ₀/n.',
        'Die Geschwindigkeit c im Vakuum und c/n in einem Medium verwenden, wobei die Frequenz gleich bleibt und die Wellenlänge auf λ₀/n schrumpft.') },
    { id: 'spectrum', kinds: ['spec-order', 'concept-spec', 'spec-order'], tutor: 0, topic: 0,
      name: () => L('Order the parts of the spectrum by wavelength, frequency and photon energy.',
        'Die Bereiche des Spektrums nach Wellenlänge, Frequenz und Photonenenergie ordnen.') },
  ];

  // The idea behind each wrong-answer flag.
  const concept = {
    inv: 'clf', clf: 'clf', order: 'order', region: 'spectrum',
    mult: 'medium', same: 'medium', ninv: 'medium',
    perp: 'dirs', hand: 'dirs', transverse: 'dirs',
    einv: 'ecb', ratio: 'ecb', phase: 'ecb', phaseother: 'ecb',
    vacuum: 'vacuum', speed: 'vacuum',
  };
  const concepts = () => ({
    clf: L('c = λ·f: λ and f mixed up', 'c = λ·f: λ und f verwechselt'),
    order: L('a shorter wave has a higher frequency and more energetic photons, not less', 'eine kürzere Welle hat eine höhere Frequenz und energiereichere Photonen, nicht weniger'),
    spectrum: L('the order of the spectrum', 'die Reihenfolge des Spektrums'),
    medium: L('in matter: f stays, v = c/n and λ shrink', 'in Materie: f bleibt, v = c/n und λ werden kleiner'),
    dirs: L('E, B and c perpendicular, as a right-handed set', 'E, B und c senkrecht, als Rechtssystem'),
    ecb: L('E = c·B, in phase', 'E = c·B, in Phase'),
    vacuum: L('in vacuum all electromagnetic waves travel at the same speed c, and need no medium', 'im Vakuum laufen alle elektromagnetischen Wellen gleich schnell, mit c, und brauchen kein Medium'),
  });

  const plain = (s) => s.replace(/<[^>]*>/g, '').replace(/:$/, '');

  function question(kind, seed) {
    const ex = practiceOf(kind, seed), qz = quiz(ex, seed), f = qz.field;
    const ask = f.type === 'num' ? L(`Find the ${plain(f.what)} $${f.sym}$.`, `Wie gross ist $${f.sym}$ (${plain(f.what)})?`) : f.ask || f.what;
    return {
      title: ex.title,
      // a statement to choose needs no words before it: the question is the ask
      text: kind.startsWith('concept') ? '' : ex.textFor(f.key),
      figure: ex.figure({ task: true }),
      ask,
      options: qz.options.map((o) => ({ html: o.html, correct: !!o.correct, flag: o.flag, why: o.why })),
      explain: () => `<div class="figs">${ex.solutionFigure() || ''}</div><div class="steps">${ex.solution.join('')}</div>`,
      key: `${kind}|${JSON.stringify(ex.p)}|${f.key}`,
    };
  }

  root.CheckSource = { id: 'emw', objectives: OBJECTIVES, question, concept, concepts };
})(typeof window !== 'undefined' ? window : globalThis);
