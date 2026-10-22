// The check (see check.js, shared by the apps): the learning objectives, each with the kinds of
// question that test it, its worked example and its practice topic (lessons.js), and the
// questions. Each is about one exercise that needs no calculator, with four options: a quantity
// (quiz() in generator.js), a torque with its sense of rotation, the lever arm of a beam's weight,
// or a choice of practice (a ranking, the error in a sketch).
(function (root) {
  'use strict';

  const TQ = root.TQ, { generateFor, practiceOf, quiz, SCENARIOS } = root.Torque;
  const L = (en, de) => TQ.L(en, de);

  // kinds: a situation (scenarios.js), with ':key' the quantity asked; 'torque:…' a torque of a
  // plate with its sense; 'weight-arm' the lever arm of a beam's weight
  const OBJECTIVES = [
    { id: 'arm', kinds: ['torque:plate-axis', 'torque:plate', 'angle', 'arm-error'], tutor: 0, topic: 0,
      name: () => L('Determine a torque as the force times its lever arm, the perpendicular distance from the axis to the line of action, with its sense of rotation.',
        'Ein Drehmoment als Kraft mal Hebelarm bestimmen, mit dem senkrechten Abstand der Drehachse von der Wirkungslinie, samt Drehsinn.') },
    { id: 'rank', kinds: ['rank-axis', 'rank'], tutor: 0, topic: 0,
      name: () => L('Rank the torques of forces drawn to scale.', 'Die Drehmomente von massstäblich gezeichneten Kräften der Grösse nach ordnen.') },
    { id: 'weight', kinds: ['beam-weight', 'weight-arm', 'hang:x'], tutor: 4, topic: 4,
      name: () => L('Place the weight of a body at its centre of mass.', 'Die Gewichtskraft eines Körpers in seinem Schwerpunkt ansetzen.') },
    { id: 'balance', kinds: ['hang:H', 'plank', 'arm:E'], tutor: 6, topic: 6,
      name: () => L('Apply both conditions of equilibrium, zero net force and zero net torque, including the force at the pivot.',
        'Beide Gleichgewichtsbedingungen anwenden, Kräfte und Drehmomente im Gleichgewicht, auch mit der Kraft in der Drehachse.') },
  ];

  // The idea behind each wrong-answer flag.
  const concept = {
    arm: 'arm', noAngle: 'arm', sense: 'sense', force: 'force', cos: 'angle', end: 'pivot', far: 'middle',
    noBeam: 'beam', onlyLoads: 'beam', noArm: 'beam', jointUp: 'forces', swap: 'ratio',
  };
  const concepts = () => ({
    arm: L('the distance to the point of application taken as the lever arm', 'den Abstand zum Angriffspunkt als Hebelarm genommen'),
    sense: L('the sense of rotation the wrong way round', 'den Drehsinn verkehrt'),
    force: L('the largest force taken for the largest torque', 'die grösste Kraft für das grösste Drehmoment gehalten'),
    angle: L('cosine instead of sine for a force at an angle', 'Kosinus statt Sinus bei einer schrägen Kraft'),
    pivot: L('a lever arm not measured from the axis', 'einen Hebelarm nicht von der Drehachse aus gemessen'),
    middle: L('the weight not at the centre of mass', 'die Gewichtskraft nicht im Schwerpunkt angesetzt'),
    beam: L('a body’s own weight forgotten', 'die Gewichtskraft eines Körpers vergessen'),
    forces: L('the force at the axis in the wrong direction', 'die Kraft in der Drehachse in der falschen Richtung'),
    ratio: L('lever arms or supports the wrong way round', 'Hebelarme oder Stützen vertauscht'),
  });

  const explain = (ex) => () => `<div class="figs">${ex.solutionFigure()}</div><div class="steps">${ex.solution.join('')}</div>`;
  const plain = (s) => s.replace(/<[^>]*>/g, '');
  const ask = (f) => L(`Find the ${plain(f.what)} $${TQ.tex(...f.sym)}$.`, `Wie gross ist $${TQ.tex(...f.sym)}$ (${plain(f.what)})?`);
  const common = (ex) => ({ title: ex.title, text: ex.situation || ex.text, figure: ex.figure({ task: true }), explain: explain(ex) });

  // a quantity of an exercise, as in practice
  function quantity(kind, seed) {
    const [id, key] = kind.split(':'), ex = generateFor(id, seed, { nice: true }), qz = quiz(ex, seed, key ? [key] : null), f = qz.field;
    return { ...common(ex), ask: ask(f),
      options: qz.options.map((o) => ({ html: `$${TQ.tq(o.value, f.unit, f.dec)}$`, correct: !!o.correct, flag: o.flag, why: o.why })) };
  }

  // A torque of a plate with its sense: the right one, the same size turning the other way, the
  // force times the distance to the point of application, and slips.
  function torque(id, seed) {
    const ex = generateFor(id, seed, { nice: true }), r = TQ.rng(seed);
    const cands = ex.fields.filter((f) => f.value > 0 && f.traps.length), f = cands[Math.floor(r() * cands.length)] || ex.fields.find((g) => g.value > 0);
    const s = f.senseValue, word = (x) => (x > 0 ? `↺ ${L('counterclockwise', 'im Gegenuhrzeigersinn')}` : `↻ ${L('clockwise', 'im Uhrzeigersinn')}`);
    const options = [{ value: f.value, sense: s, correct: true }];
    // the same sense only for clearly different sizes; the right size turning the other way once
    const fits = (x, sense) => Number.isFinite(x) && x > 0 && options.every((o) => o.sense !== sense || Math.abs(o.value - x) > Math.max(0.02, 0.06 * Math.max(o.value, x)));
    const add = (x, sense, more) => { x = TQ.round(x, 2); if (options.length < 4 && fits(x, sense)) options.push({ value: x, sense, ...more }); };
    add(f.value, -s, { flag: 'sense', why: L('The size is right, but not the sense: imagine the plate pinned at D and pushed by this force alone.', 'Der Betrag stimmt, aber nicht der Drehsinn: Stell dir die Platte in D festgesteckt vor, und nur diese Kraft wirkt.') });
    f.traps.forEach((t) => add(t.value, s, { flag: t.flag, why: t.why }));
    TQ.shuffle(r, ex.fields.filter((g) => g !== f && g.value > 0)).forEach((g) => add(g.value, s, {}));
    [2, 0.5, 1.5, 3, 1 / 3].forEach((k) => add(f.value * k, s, {}));
    return { ...common(ex), ask: L(`Find the torque $${TQ.tex('M', f.key.slice(1))}$ of $F_${f.key.slice(1)}$ about D, with its sense.`, `Wie gross ist das Drehmoment $${TQ.tex('M', f.key.slice(1))}$ von $F_${f.key.slice(1)}$ bezüglich D, mit Drehsinn?`),
      options: TQ.shuffle(r, options).map((o) => ({ html: `$${TQ.tq(o.value, 'Nm', 2)}$ ${word(o.sense)}`, correct: !!o.correct, flag: o.flag, why: o.why })),
      key: `${id}|${JSON.stringify(ex.p)}|${f.key}` };
  }

  // The lever arm of the weight of a heavy beam about its support: from the support to the middle.
  function weightArm(seed) {
    const ex = generateFor('beam-weight', seed, { nice: true }), p = ex.p, r = TQ.rng(seed);
    const options = [{ value: p.len / 2 - p.s, correct: true }];
    const add = (x, flag, why) => { if (options.length < 4 && x > 0 && options.every((o) => Math.abs(o.value - x) > 0.5)) options.push({ value: x, flag, why }); };
    add(p.len / 2, 'end', L('That is the distance from the end of the beam to its middle. Lever arms are measured from the support.', 'Das ist der Abstand vom Ende des Balkens zu seiner Mitte. Hebelarme werden von der Stütze aus gemessen.'));
    add(p.len - p.s, 'far', L('That is the distance to the far end. The beam’s weight acts at its centre of mass, its middle.', 'Das ist der Abstand zum anderen Ende. Die Gewichtskraft des Balkens greift in seinem Schwerpunkt an, in seiner Mitte.'));
    add(p.s, null, L('That is the lever arm of the load.', 'Das ist der Hebelarm der Last.'));
    const d = p.len / 2 - p.s;
    [p.len / 2 + p.s, p.len - 2 * p.s, 2 * d, d / 2, d + 10, d + 20].forEach((x) => add(x, null, ''));
    return { ...common(ex), ask: L('How long is the lever arm of the beam’s own weight about the support?', 'Wie lang ist der Hebelarm der Gewichtskraft des Balkens bezüglich der Stütze?'),
      options: TQ.shuffle(r, options).map((o) => ({ html: `$${TQ.tq(o.value, 'cm', 1)}$`, correct: !!o.correct, flag: o.flag, why: o.why })) };
  }

  // a choice of practice (a ranking, the error in a sketch), with its four options mixed
  function choice(id, seed) {
    const ex = practiceOf(id, seed), it = ex.comps[0];
    return { ...common(ex), ask: it.what,
      options: TQ.shuffle(TQ.rng(seed), it.options.map((o) => ({ html: o.html, correct: !!o.right, flag: o.flag, why: o.why }))) };
  }

  function question(kind, seed) {
    if (kind.startsWith('torque:')) return torque(kind.slice(7), seed);
    if (kind === 'weight-arm') return weightArm(seed);
    const scn = SCENARIOS.find((s) => s.id === kind);
    return scn && scn.choice ? choice(kind, seed) : quantity(kind, seed);
  }

  root.CheckSource = { id: 'tq', objectives: OBJECTIVES, question, concept, concepts };
  if (typeof module !== 'undefined') module.exports = root.CheckSource;
})(typeof window !== 'undefined' ? window : globalThis);
