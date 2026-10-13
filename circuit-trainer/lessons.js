// The tutor's worked examples, from easy to hard, then measuring with meters. Each is solved along
// its path: frames of "quantity:rule" steps (see pathSteps in generator.js; names with V for
// voltages), checked by test/check-generator.js.
(function (root) {
  'use strict';

  const EXAMPLES = [
    {
      name: { en: 'Series', de: 'Serie' }, level: 'easy', seed: 12,
      practice: [{ types: ['series:easy'] }],
      idea: { en: 'Two resistors in series share the battery voltage in the ratio of their resistances. Knowing the voltage across one resistor gives the current.',
        de: 'Zwei Widerstände in Serie teilen sich die Batteriespannung im Verhältnis ihrer Widerstände. Die Spannung an einem Widerstand liefert den Strom.' },
      path: [['V1:vdiv'], ['I1:ohm', 'I:eqI']],
    },
    {
      name: { en: 'Parallel', de: 'Parallel' }, level: 'easy', seed: 54,
      practice: [{ types: ['parallel:easy'] }],
      idea: { en: 'Two resistors in parallel both have the full battery voltage. The currents are shared in the inverse ratio of the resistances, and they add up to the total current.',
        de: 'Zwei parallele Widerstände liegen beide an der vollen Batteriespannung. Die Ströme teilen sich im umgekehrten Verhältnis der Widerstände auf und addieren sich zum Gesamtstrom.' },
      path: [['V2:eqV', 'I2:ohm'], ['I1:iratio'], ['I:sumI']],
    },
    {
      name: { en: 'Mixed', de: 'Gemischt' }, level: 'medium', seed: 1959,
      practice: [{ types: ['mixed:medium'] }],
      idea: { en: 'A resistor in series with a parallel pair. Replace the pair by one resistor, and the voltage divider rule gives the voltage across the pair.',
        de: 'Ein Widerstand in Serie mit einem parallelen Paar. Ersetze das Paar durch einen Widerstand, dann liefert die Spannungsteilerregel die Spannung am Paar.' },
      path: [['R23:invR'], ['V23:vdiv', 'V3:eqV'], ['V1:sumV'], ['I1:ohm', 'I:eqI']],
    },
    {
      name: { en: 'Backwards', de: 'Rückwärts' }, level: 'medium', seed: 2,
      practice: [{ types: ['backwards:easy'] }, { en: 'larger circuits', de: 'grössere Schaltungen', types: ['backwards:medium'] }],
      idea: { en: 'Here a resistance is unknown, but two currents are measured. Start where enough is known, and work towards the unknowns.',
        de: 'Hier ist ein Widerstand unbekannt, dafür sind zwei Ströme gemessen. Beginne dort, wo genug bekannt ist, und arbeite dich zu den Unbekannten vor.' },
      path: [['I12:eqI'], ['I3:sumI'], ['V3:ohm'], ['V:eqV'], ['I2:eqI', 'V2:ohm'], ['V12:eqV', 'V1:sumV'], ['R1:ohm']],
    },
    {
      name: { en: 'Nested', de: 'Verschachtelt' }, level: 'hard', seed: 22,
      practice: [{ types: ['nested:medium'] }, { en: 'larger circuits', de: 'grössere Schaltungen', types: ['nested:hard'] }],
      idea: { en: 'Groups inside groups. Name each group, share voltages with the divider rule, and follow the current from branch to branch.',
        de: 'Gruppen in Gruppen. Benenne jede Gruppe, teile Spannungen mit der Teilerregel auf und verfolge den Strom von Zweig zu Zweig.' },
      path: [['V1:vratio'], ['V234:sumV'], ['V2:eqV'], ['I2:ohm'], ['I1:ohm'], ['I:eqI', 'I234:eqI', 'I34:sumI'],
        ['I3:eqI', 'V3:ohm'], ['V34:eqV', 'V4:sumV'], ['R4:vratio']],
    },
    {
      // meters: where an ammeter and a voltmeter go and what they show (meterTutorial in generator.js)
      name: { en: 'Meters', de: 'Messgeräte' }, level: 'medium', seed: 10, meters: true,
      practice: [{ types: ['meter:read'] }, { en: 'where do the meters go?', de: 'wo kommen die Messgeräte hin?', types: ['meter:place'] }, { en: 'wrongly connected meters', de: 'falsch angeschlossene Messgeräte', types: ['meter:wrong'] }],
      idea: { en: 'An ammeter goes in series, a voltmeter in parallel. Ideal meters change nothing, so they show currents and voltages you find with the rules. Connected the wrong way, a voltmeter blocks the current and an ammeter short-circuits a part.',
        de: 'Ein Amperemeter kommt in Serie, ein Voltmeter parallel. Ideale Messgeräte verändern nichts, also zeigen sie Ströme und Spannungen, die du mit den Regeln findest. Falsch angeschlossen sperrt ein Voltmeter den Strom, und ein Amperemeter schliesst einen Teil kurz.' },
      path: [['R23:invR'], ['V1:vdiv'], ['V23:sumV', 'V3:eqV'], ['I3:ohm']],
    },
  ];

  root.Lessons = { EXAMPLES };
  if (typeof module !== 'undefined') module.exports = { EXAMPLES };
})(typeof window !== 'undefined' ? window : globalThis);
