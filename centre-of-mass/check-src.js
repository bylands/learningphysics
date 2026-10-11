// The check (see check.js, shared by the apps): the learning objectives, each with the kinds of
// question that test it, its worked example and its practice topic (lessons.js), and the
// questions. Each is about one exercise that needs no calculator, with four options: a quantity
// (quiz() in generator.js) or a choice of practice (the kind of equilibrium, the block that falls).
(function (root) {
  'use strict';

  const TQ = root.TQ, { generateFor, practiceOf, quiz, SCENARIOS } = root.Com;
  const L = (en, de) => TQ.L(en, de);

  // kinds: the situations of scenarios.js
  const OBJECTIVES = [
    { id: 'locate', kinds: ['com-L', 'com-T', 'com-U', 'com-E', 'com-iso', 'com-sqstick', 'com-bell'], tutor: 0, topic: 0,
      name: () => L('Locate the centre of mass of a composite figure, such as a wire figure whose pieces have masses proportional to their lengths.',
        'Den Schwerpunkt einer zusammengesetzten Figur bestimmen, etwa einer Drahtfigur, deren Teile Massen proportional zu ihren Längen haben.') },
    { id: 'stability', kinds: ['stability'], tutor: 2, topic: 2,
      name: () => L('Classify an equilibrium as stable, unstable or neutral from the position of the centre of mass.',
        'Ein Gleichgewicht anhand der Lage des Schwerpunkts als stabil, labil oder indifferent einordnen.') },
    { id: 'tipping', kinds: ['tips', 'tilt'], tutor: 3, topic: 3,
      name: () => L('Predict whether a body tips over by checking whether the line of action of its weight leaves the base.',
        'Vorhersagen, ob ein Körper kippt, indem man prüft, ob die Wirkungslinie seiner Gewichtskraft die Standfläche verlässt.') },
  ];

  // The idea behind each wrong-answer flag.
  const concept = { count: 'length', upDown: 'updown', notVertical: 'vertical', neutral: 'neutral', tilt: 'tilt', swap: 'edge', full: 'middle' };
  const concepts = () => ({
    length: L('the parts not weighted by their length', 'die Teile nicht nach ihrer Länge gewichtet'),
    updown: L('stable and unstable mixed up', 'stabil und labil verwechselt'),
    vertical: L('not checked whether the centre of mass is on the vertical through the axis', 'nicht geprüft, ob der Schwerpunkt auf der Senkrechten durch die Achse liegt'),
    neutral: L('neutral equilibrium without the axis through the centre of mass', 'indifferentes Gleichgewicht ohne Achse durch den Schwerpunkt'),
    tilt: L('judged by the tilt alone, not by the line of action of the weight', 'nur nach der Neigung geurteilt, nicht nach der Wirkungslinie der Gewichtskraft'),
    edge: L('the tilt angle measured from the floor instead of from the vertical', 'den Neigungswinkel vom Boden statt von der Senkrechten aus gemessen'),
    middle: L('the weight not at the centre of mass', 'die Gewichtskraft nicht im Schwerpunkt angesetzt'),
  });
  // what is correct instead (the typical slips in practice, slips.js)
  const fixes = () => ({
    length: L('Each piece counts with its mass, here proportional to its length: a piece twice as long pulls the centre of mass twice as strongly.',
      'Jedes Teil zählt mit seiner Masse, hier proportional zu seiner Länge: Ein doppelt so langes Teil zieht den Schwerpunkt doppelt so stark zu sich.'),
    updown: L('Stable: the centre of mass lies below the axis and rises when the body is turned. Unstable: it lies above the axis and falls.',
      'Stabil: Der Schwerpunkt liegt unter der Achse und hebt sich beim Drehen. Labil: Er liegt über der Achse und senkt sich.'),
    vertical: L('A body is in equilibrium only if its centre of mass lies on the vertical through the axis; otherwise the weight turns it.',
      'Ein Körper ist nur im Gleichgewicht, wenn sein Schwerpunkt auf der Senkrechten durch die Achse liegt; sonst dreht ihn die Gewichtskraft.'),
    neutral: L('Neutral equilibrium needs the axis through the centre of mass: then turning neither raises nor lowers it.',
      'Indifferentes Gleichgewicht braucht eine Achse durch den Schwerpunkt: Dann hebt und senkt er sich beim Drehen nicht.'),
    tilt: L('A body tips over when the vertical line through its centre of mass leaves the base, not because it stands tilted.',
      'Ein Körper kippt, wenn die Senkrechte durch seinen Schwerpunkt die Standfläche verlässt, nicht weil er schräg steht.'),
    edge: L('The tilt angle at which a body tips is measured from the vertical: the line from the edge to the centre of mass must become vertical.',
      'Der Kippwinkel wird von der Senkrechten aus gemessen: Die Linie von der Kante zum Schwerpunkt muss senkrecht werden.'),
    middle: L('The weight acts at the centre of mass, not at the middle of the base or of the outline.',
      'Die Gewichtskraft greift im Schwerpunkt an, nicht in der Mitte der Standfläche oder des Umrisses.'),
  });

  const explain = (ex) => () => `<div class="figs">${ex.solutionFigure()}</div><div class="steps">${ex.solution.join('')}</div>`;
  const plain = (s) => s.replace(/<[^>]*>/g, '').replace(/:$/, '');
  const ask = (f) => L(`Find $${TQ.tex(...f.sym)}$ (${plain(f.what)}).`, `Wie gross ist $${TQ.tex(...f.sym)}$ (${plain(f.what)})?`);
  const common = (ex) => ({ title: ex.title, text: ex.text, figure: ex.figure({ task: true }), explain: explain(ex) });

  // a quantity of an exercise, as in practice
  function quantity(kind, seed) {
    const ex = generateFor(kind, seed), qz = quiz(ex, seed), f = qz.field;
    return { ...common(ex), ask: ask(f),
      options: qz.options.map((o) => ({ html: `$${TQ.tq(o.value, f.unit, f.dec)}$`, correct: !!o.correct, flag: o.flag, why: o.why })) };
  }

  // a choice of practice (the kind of equilibrium, the block that falls), with its options as there
  function choice(id, seed) {
    const ex = practiceOf(id, seed), it = ex.comps[0];
    return { ...common(ex), ask: it.what, options: it.options.map((o) => ({ html: o.html, correct: !!o.right, flag: o.flag, why: o.why })) };
  }

  function question(kind, seed) {
    const scn = SCENARIOS.find((s) => s.id === kind);
    return scn.choice ? choice(kind, seed) : quantity(kind, seed);
  }

  root.CheckSource = { id: 'cm', objectives: OBJECTIVES, question, concept, concepts, fixes };
  if (typeof module !== 'undefined') module.exports = root.CheckSource;
})(typeof window !== 'undefined' ? window : globalThis);
