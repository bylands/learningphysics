// The check (see check.js, shared by the apps): the learning objectives, each with its question
// kinds (the exercise types of generator.js), its worked example and its practice topic
// (lessons.js), and the questions. A question asks for one answer of an exercise, with four
// options (see quiz() in generator.js): a capacitance, where the total lies, a graph, a time read
// from a graph, or how the time constant or the current at the start changes.
(function (root) {
  'use strict';

  const { practiceOf, quiz } = root.Caps || require('./generator.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);

  const OBJECTIVES = [
    { id: 'combine', kinds: ['pair', 'bounds', 'mixed', 'network'], tutor: 0, topic: 0,
      name: () => L('Combine capacitors in series and in parallel: in parallel the capacitances add, in series their reciprocals add (the rules of resistors, swapped).',
        'Kondensatoren in Serie und parallel kombinieren: Parallel addieren sich die Kapazitäten, in Serie ihre Kehrwerte (die Regeln der Widerstände, vertauscht).') },
    { id: 'sketch', kinds: ['curve-u-d', 'curve-i-d', 'curve-r-d', 'loop-d', 'curve-u', 'curve-i', 'curve-r', 'loop'], tutor: 1, topic: 1,
      name: () => L('Sketch the voltages and the current against time while a capacitor charges or discharges, and find them at a moment with the loop rule.',
        'Die Spannungen und den Strom gegen die Zeit skizzieren, während ein Kondensator geladen oder entladen wird, und sie in einem Moment mit der Maschenregel bestimmen.') },
    { id: 'tau', kinds: ['read-half', 'read-tau', 'predict', 'predict-graph'], tutor: 3, topic: 2,
      name: () => L('Read the time constant τ = R·C or the half-life from a graph, and predict what a change of R or C does.',
        'Die Zeitkonstante τ = R·C oder die Halbwertszeit aus einem Graphen ablesen und vorhersagen, was eine Änderung von R oder C bewirkt.') },
  ];
  const plain = (s) => s.replace(/<[^>]*>/g, '').replace(/:$/, '');
  function checkQuestion(kind, seed) {
    const e = practiceOf(kind, seed), qz = quiz(e, seed), f = qz.field;
    const ask = f.type === 'num' ? L(`Find $${f.sym}$ (${plain(f.what)}).`, `Wie gross ist $${f.sym}$ (${plain(f.what)})?`) : f.ask || e.ask || plain(f.what);
    return {
      title: e.title,
      text: e.situation || e.text,
      figure: e.figure(),
      ask,
      options: qz.options.map((o) => ({ html: o.html, correct: o.correct, flag: o.flag, why: o.why })),
      explain: () => `<div class="figs">${e.solutionFigure()}</div><div class="steps">${e.solution.join('')}</div>`,
      key: `${kind}|${JSON.stringify(e.p)}|${f.key}`,
    };
  }
  root.CheckSource = {
    id: 'cap',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { swap: 'rules', avg: 'rules', edge: 'rules', shape: 'shape', jump: 'jump', direction: 'direction', start: 'start', current: 'current', half: 'half', level: 'level', loop: 'loop', share: 'share', factor: 'factor', final: 'final', i0: 'i0' },
    concepts: () => ({
      rules: L('the rules of resistors used for capacitors', 'die Regeln der Widerstände für Kondensatoren verwendet'),
      shape: L('a straight line, or the wrong curvature: the change is fastest at the start', 'eine Gerade oder die falsche Krümmung: Die Änderung ist am Anfang am schnellsten'),
      jump: L('the voltage of a capacitor jumping', 'die Spannung eines Kondensators springt'),
      direction: L('charging and discharging swapped', 'Laden und Entladen vertauscht'),
      start: L('the current starting at zero: it is largest at the start', 'der Strom beginnt bei null: Er ist am Anfang am grössten'),
      current: L('the current following the voltage of the capacitor', 'der Strom folgt der Spannung des Kondensators'),
      loop: L('the loop rule not used: ΔV₀ = ΔV_R + ΔV_C while charging, ΔV_R = ΔV_C while discharging', 'die Maschenregel nicht verwendet: U₀ = U_R + U_C beim Laden, U_R = U_C beim Entladen'),
      share: L('the same charge (in series) and the same voltage (in parallel) mixed up', 'dieselbe Ladung (in Serie) und dieselbe Spannung (parallel) verwechselt'),
      half: L('half-life and time constant mixed up', 'Halbwertszeit und Zeitkonstante verwechselt'),
      level: L('37 % and 63 % mixed up', '37 % und 63 % verwechselt'),
      factor: L('τ = R·C: the effect of R or C turned round', 'τ = R·C: die Wirkung von R oder C umgekehrt'),
      final: L('R or C changing the final voltage', 'R oder C ändert die Endspannung'),
      i0: L('the current at the start depending on C: I₀ = ΔV₀/R', 'der Strom am Anfang hängt von C ab: I₀ = U₀/R'),
    }),
  };

  if (typeof module !== 'undefined') module.exports = root.CheckSource;
})(typeof window !== 'undefined' ? window : globalThis);
