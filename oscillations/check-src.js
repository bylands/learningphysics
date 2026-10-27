// The check (see check.js, shared by the apps): the learning objectives, each with the exercise
// types (scenarios.js) that test it, its worked example and its practice topic (lessons.js), and
// the questions. Each asks for one answer of an exercise, with four options (see quiz() in
// generator.js): a graph, the period, the mistake, the harmonic one of four equations, a point on
// a graph, a number, or a quantity of the LC circuit.
(function (root) {
  'use strict';

  const OC = root.OC, { practiceOf, quiz, SCENARIOS } = root.Osc;
  const L = (en, de) => OC.L(en, de);

  const OBJECTIVES = [
    { id: 'circle', kinds: ['circle'], tutor: 0, topic: 0,
      name: () => L('Describe a simple harmonic motion as the projection of a uniform circular motion: the radius is the amplitude, the angular velocity is ω, one turn is one period.',
        'Eine harmonische Schwingung als Projektion einer gleichförmigen Kreisbewegung beschreiben: Der Radius ist die Amplitude, die Winkelgeschwindigkeit ist ω, eine Umdrehung ist eine Periode.') },
    { id: 'harmonic', kinds: ['shm-1', 'shm-2', 'pick-shm', 'match-1'], tutor: 1, topic: 1,
      name: () => L('Decide whether a system oscillates harmonically by checking that its acceleration is proportional and opposite to its displacement, and read off ω.',
        'Entscheiden, ob ein System harmonisch schwingt, indem man prüft, ob seine Beschleunigung proportional und entgegengesetzt zur Auslenkung ist, und ω ablesen.') },
    { id: 'extremes', kinds: ['points', 'vmax'], tutor: 3, topic: 3,
      name: () => L('Locate the largest speed Aω (at the equilibrium) and the largest acceleration Aω² (at the turning points) in the cycle.',
        'Die grösste Geschwindigkeit Aω (in der Gleichgewichtslage) und die grösste Beschleunigung Aω² (an den Umkehrpunkten) im Ablauf der Schwingung finden.') },
    { id: 'lc', kinds: ['lc-eq', 'lc-scale'], tutor: 4, topic: 4,
      name: () => L('Recognise the LC circuit as the same equation with other quantities: the charge for the displacement, the current for the velocity, L for the mass and 1/C for the spring constant.',
        'Den Schwingkreis als dieselbe Gleichung mit anderen Grössen erkennen: die Ladung für die Auslenkung, den Strom für die Geschwindigkeit, L für die Masse und 1/C für die Federkonstante.') },
    { id: 'damped', kinds: ['damp-match', 'damp-back', 'damp-error', 'damp-eq'], tutor: 5, topic: 5,
      name: () => L('Recognise a damped oscillation in its graph and its equation: the period stays the same while the amplitude shrinks; a term proportional to the velocity, against it, makes the amplitude decay exponentially, a constant friction force linearly.',
        'Eine gedämpfte Schwingung an ihrem Graphen und ihrer Gleichung erkennen: Die Periode bleibt gleich, während die Amplitude schrumpft; ein Term proportional zur Geschwindigkeit, gegen sie gerichtet, lässt die Amplitude exponentiell abklingen, eine konstante Reibungskraft linear.') },
    { id: 'decay', kinds: ['decay-read', 'decay-eq', 'decay-energy', 'decay-regime'], tutor: 6, topic: 6,
      name: () => L('Describe how fast a damped oscillation dies away: read δ and ω₀ off its equation, find δ and τ = 1/δ from two peaks, use E ∝ A², and tell weak, critical and strong damping apart.',
        'Beschreiben, wie schnell eine gedämpfte Schwingung abklingt: δ und ω₀ aus ihrer Gleichung ablesen, δ und τ = 1/δ aus zwei Spitzen bestimmen, E ∝ A² anwenden und schwache Dämpfung, aperiodischen Grenzfall und starke Dämpfung unterscheiden.') },
  ];

  // The idea behind each wrong-answer flag.
  const concept = {
    omega2: 'period', inverse: 'period', freq: 'period', omegaT: 'period',
    sign: 'sign', order: 'order', power: 'linear', const: 'linear', tsq: 'amp', amp: 'amp',
    shift: 'shift', form: 'form', damp: 'damp',
    square: 'square', flip: 'square',
    turn: 'circle', proj: 'circle', start: 'circle',
    map: 'lc', lcphase: 'lcphase',
    envelope: 'envelope', diff: 'envelope', grow: 'dampterm', antidamp: 'dampterm', noty: 'dampterm', nodamp: 'dampterm', dampterm: 'dampterm', norest: 'restore',
    dshape: 'dshape', noln: 'decayln', log10: 'decayln', per: 'decayln', half: 'decayln', two: 'twodelta', mass: 'twodelta', root: 'period',
    same: 'energy', sqrt: 'energy', add: 'energy', halfamp: 'energy', lin: 'energy', regime: 'regime',
  };
  const concepts = () => ({
    period: L('ω, ω² and T mixed up', 'ω, ω² und T verwechselt'),
    sign: L('the sign of the restoring acceleration', 'das Vorzeichen der rücktreibenden Beschleunigung'),
    order: L('first and second derivative', 'erste und zweite Ableitung'),
    linear: L('harmonic needs y to the first power', 'harmonisch braucht y in der ersten Potenz'),
    amp: L('a constant amplitude, a phase growing evenly', 'eine konstante Amplitude, eine gleichmässig wachsende Phase'),
    shift: L('a constant only shifts the equilibrium', 'eine Konstante verschiebt nur die Gleichgewichtslage'),
    form: L('harmless features taken for mistakes (letters, notation, rearranging)', 'harmlose Merkmale für Fehler gehalten (Buchstaben, Schreibweise, Umformen)'),
    damp: L('damping: a term with ẏ', 'Dämpfung: ein Term mit ẏ'),
    square: L('v̂ = Aω and â = Aω²', 'v̂ = Aω und â = Aω²'),
    circle: L('the displacement as the shadow of the pointer on the vertical axis, turning the way it turns', 'die Auslenkung als Schatten des Zeigers auf der vertikalen Achse, in seinem Drehsinn'),
    lc: L('which quantity of the LC circuit plays which role (1/C, not C, for the spring constant)', 'welche Grösse des Schwingkreises welche Rolle spielt (1/C, nicht C, für die Federkonstante)'),
    lcphase: L('charge and current a quarter of a period apart', 'Ladung und Strom um eine Viertelperiode verschoben'),
    dshape: L('a damped oscillation keeps its period, starts at rest and oscillates about the equilibrium', 'eine gedämpfte Schwingung behält ihre Periode, beginnt in Ruhe und schwingt um die Gleichgewichtslage'),
    envelope: L('damping ∝ v: the amplitude shrinks by equal factors; friction: by equal steps', 'Dämpfung ∝ v: Die Amplitude schrumpft um gleiche Faktoren; Reibung: um gleiche Beträge'),
    dampterm: L('the damping term: proportional to ẏ and against the motion', 'der Dämpfungsterm: proportional zu ẏ und gegen die Bewegung'),
    restore: L('an oscillation needs a restoring force (and inertia)', 'eine Schwingung braucht eine rücktreibende Kraft (und Trägheit)'),
    decayln: L('δ from the ratio of two peaks: the logarithm and the time between them', 'δ aus dem Verhältnis zweier Spitzen: der Logarithmus und die Zeit zwischen ihnen'),
    twodelta: L('the damping term is 2δ·ẏ: δ is half its factor', 'der Dämpfungsterm ist 2δ·ẏ: δ ist die Hälfte seines Faktors'),
    energy: L('the energy goes with the square of the amplitude', 'die Energie geht mit dem Quadrat der Amplitude'),
    regime: L('weak, critical and strong damping', 'schwache Dämpfung, aperiodischer Grenzfall und starke Dämpfung'),
  });

  function question(kind, seed) {
    const ex = practiceOf(kind, seed), qz = quiz(ex, seed), f = qz.field, scn = SCENARIOS.find((s) => s.id === kind);
    const ask = f.type === 'num' ? L(`Find the ${f.what.replace(/<[^>]*>/g, '')} $${f.sym}$.`, `Wie gross ist $${f.sym}$ (${f.what.replace(/<[^>]*>/g, '')})?`) : f.ask || f.what;
    return {
      title: ex.title,
      // an equation to judge needs no words; the others say what is given
      text: scn.kind === 'shm' ? '' : ex.textFor(f.key),
      figure: ex.figure({ task: true }),
      ask,
      options: qz.options.map((o) => ({ html: o.html, correct: !!o.correct, flag: o.flag, why: o.why })),
      explain: () => `<div class="figs">${ex.solutionFigure()}</div><div class="steps">${ex.solution.join('')}</div>`,
      key: `${kind}|${JSON.stringify(ex.p)}|${f.key}`,
    };
  }

  root.CheckSource = { id: 'osc', objectives: OBJECTIVES, question, concept, concepts };
})(typeof window !== 'undefined' ? window : globalThis);
