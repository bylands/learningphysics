// The tutor's worked examples, from easy to hard; the second one with the equations of the worksheet
// "S2 Charakteristische Differentialgleichung". Each is a topic of practice (see topics.js) with
// its stages: first exercises like the example, then variations with new ideas (types: the
// exercise types of scenarios.js). An example gives its parameters p, or a seed for them, and
// may go on with more exercises of its topic (more: [{ scenario, p }]). Three end with a frame
// to watch the run of one of their exercises (watch: its index, 0 the example itself, 1 the first
// of more; see generator.js), and two of these runs have a page of their own (page: its folder).
(function (root) {
  'use strict';

  const P = { c: 1.3, A: 1, m: 1, D: 4, g: 2, gamma: 0.3, B: 1, C1: 1, C2: 0.6, phi: 0.5 };
  const EXAMPLES = [
    {
      scenario: 'circle', p: { k: 2, kinds: ['late', 'right', 'proj', 'start'] }, watch: 0, page: 'turning-pointer',
      practice: [{ types: ['circle'] }],
      name: { en: 'The turning pointer', de: 'Der drehende Zeiger' },
      idea: { en: 'A simple harmonic motion is the shadow of a pointer turning evenly: y(t) = A·sin(ωt + φ₀). The length of the pointer is the amplitude, its angular velocity is ω, one turn is one period, and its angle at t = 0 is the phase φ₀.', de: 'Eine harmonische Schwingung ist der Schatten eines gleichmässig drehenden Zeigers: y(t) = A·sin(ωt + φ₀). Die Länge des Zeigers ist die Amplitude, seine Winkelgeschwindigkeit ist ω, eine Umdrehung ist eine Periode, und sein Winkel bei t = 0 ist die Phase φ₀.' },
    },
    {
      // the worksheet: one example of each answer (yes and the period; no and the mistake)
      scenario: 'shm-2', p: { eq: { form: 'inv', y: '\\xi', c: 'k', note: 'dot' }, P, seed: 11 },
      more: [
        { scenario: 'shm-2', p: { eq: { form: 'c1c2', y: '\\psi', c: '\\alpha', note: 'dot' }, P, seed: 5 } },
        { scenario: 'shm-1', p: { eq: { form: 'square', y: 'y', c: '\\delta', note: 'dot' }, P, seed: 3 } },
      ],
      practice: [{ types: ['pick-shm', 'shm-1'] }, { en: 'rearranged equations and solutions', de: 'umgeformte Gleichungen und Lösungen', types: ['shm-2'] }, { en: 'the subtle cases', de: 'die heiklen Fälle', types: ['shm-3'] }],
      name: { en: 'Harmonic or not?', de: 'Harmonisch oder nicht?' },
      idea: { en: 'A simple harmonic motion has an equation of motion ÿ = −ω²·y: the acceleration is proportional to the displacement and points back. Solve for ÿ and compare: if it fits, T = 2π/ω (the factor is ω², not ω); if not, find the term that differs.', de: 'Eine harmonische Schwingung hat eine Bewegungsgleichung ÿ = −ω²·y: Die Beschleunigung ist proportional zur Auslenkung und zeigt zurück. Löse nach ÿ auf und vergleiche: Passt sie, ist T = 2π/ω (der Faktor ist ω², nicht ω); sonst such den Term, der abweicht.' },
    },
    {
      scenario: 'match-1', seed: 2, watch: 0,
      practice: [{ types: ['match-1'] }, { en: 'damped and shifted', de: 'gedämpft und verschoben', types: ['match-2'] }, { en: 'from the graph to the equation', de: 'vom Graphen zur Gleichung', types: ['match-back'] }],
      name: { en: 'Equation and graph', de: 'Gleichung und Graph' },
      idea: { en: 'Read the form of the equation: an oscillation needs ÿ = −ω²·y; a term with ẏ damps or drives it, a constant shifts the equilibrium, a plus sign or only ẏ gives no oscillation.', de: 'Lies die Form der Gleichung: Eine Schwingung braucht ÿ = −ω²·y; ein Term mit ẏ dämpft oder treibt sie an, eine Konstante verschiebt die Gleichgewichtslage, ein Pluszeichen oder nur ẏ gibt keine Schwingung.' },
    },
    {
      scenario: 'points', p: { ask: 'aplus', us: [0.25, 0.625, 1, 1.375] },
      more: [{ scenario: 'vmax', p: { A: 0.02, w: 4 } }], watch: 1, page: 'fastest-strongest',
      practice: [{ types: ['points'] }, { en: 'how fast, how strong', de: 'wie schnell, wie stark', types: ['vmax'] }, { en: 'the other way round', de: 'umgekehrt', types: ['back-w', 'back-A'] }],
      name: { en: 'Fastest and strongest', de: 'Am schnellsten, am stärksten' },
      idea: { en: 'The velocity is the slope of y(t): largest at the equilibrium, v̂ = A·ω, and zero at the turning points. The acceleration a = −ω²·y points back to the equilibrium: largest at the turning points, â = A·ω², and zero at the equilibrium.', de: 'Die Geschwindigkeit ist die Steigung von y(t): am grössten in der Gleichgewichtslage, v̂ = A·ω, und null an den Umkehrpunkten. Die Beschleunigung a = −ω²·y zeigt zur Gleichgewichtslage zurück: am grössten an den Umkehrpunkten, â = A·ω², und null in der Gleichgewichtslage.' },
    },
    {
      scenario: 'lc-eq', p: { ask: 'T', seed: 3 },
      more: [{ scenario: 'lc-eq', p: { ask: 'whenQ', seed: 5 } }],
      practice: [{ types: ['lc-eq'] }, { en: 'changing L and C', de: 'L und C ändern', types: ['lc-scale'] }],
      name: { en: 'The LC circuit', de: 'Der Schwingkreis' },
      idea: { en: 'In an LC circuit the charge obeys L·Q̈ = −Q/C: the equation of a body on a spring, m·ÿ = −D·y, with Q for y, the current I for v, L for m and 1/C for D. So ω = 1/√(LC), and the current is zero when the charge is largest.', de: 'In einem Schwingkreis gehorcht die Ladung L·Q̈ = −Q/C: der Gleichung eines Körpers an einer Feder, m·ÿ = −D·y, mit Q für y, dem Strom I für v, L für m und 1/C für D. Also ist ω = 1/√(LC), und der Strom ist null, wenn die Ladung am grössten ist.' },
    },
  ];

  root.Lessons = { EXAMPLES };
  if (typeof module !== 'undefined') module.exports = { EXAMPLES };
})(typeof window !== 'undefined' ? window : globalThis);
