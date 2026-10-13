// Equations of motion and their solutions: which of them describe a simple harmonic motion (SHM),
// as on the worksheet "S2 Charakteristische Differentialgleichung". An SHM is a motion
// y(t) = A·cos(ω·t − φ₀) (around an equilibrium, which may be shifted); its equation of motion
// can be brought into the form ÿ = −ω²·y (or ÿ = −ω²·(y − y₀)), and its period is T = 2π/ω.
// Every form of equation has
//   { id, kind: 'ode' | 'sol', level (★1–3), shm, tex(s) (KaTeX, s: the symbols, see symbols()),
//     SHM:  std(s): the standard form, w2(s): ω², w(s): ω, T: [right, [wrong, flag] …] (TeX),
//           period(P): the period for the numbers P
//     else: mistake (see MISTAKES),
//     motion(P): { order: 2, acc(y, v, t) } | { order: 1, rate(y, t) } | { sol(t) }, for the
//     graphs and the tests }
// with P the numbers of the constants: { c, A, m, D, g, gamma, B, C1, C2, phi }.
(function (root) {
  'use strict';

  const OC = root.OC || require('./core.js');
  const { L, pick } = OC;

  // the letters of the worksheet and a few more; the constant never the same letter as the variable
  const VARS = ['x', 'y', 's', '\\xi', '\\psi', 'u', 'r', 'z', '\\varphi'];
  const CONSTS = ['k', '\\alpha', '\\beta', '\\delta', '\\kappa', '\\lambda'];

  // The symbols of an equation: the variable y, the constant c, and the notation (dots or
  // Leibniz's d²y/dt²).
  function symbols(y, c, note) {
    const dot = note === 'dot';
    return {
      y, c, note,
      Y: dot ? `${y}(t)` : y,
      Yt: `${y}(t)`,
      Yp: (n) => (dot ? `${y}^{${n}}(t)` : `${y}^{${n}}`),
      D1: dot ? `\\dot{${y}}(t)` : `\\frac{\\mathrm{d}${y}}{\\mathrm{d}t}`,
      D2: dot ? `\\ddot{${y}}(t)` : `\\frac{\\mathrm{d}^2${y}}{\\mathrm{d}t^2}`,
      dd: `\\ddot{${y}}`, // in the steps: always dots
    };
  }

  // What is wrong with an equation that is no SHM: the short answer and the explanation.
  const MISTAKES = {
    sign: {
      short: () => L('The sign: the acceleration points away from the equilibrium.', 'Das Vorzeichen: Die Beschleunigung zeigt von der Gleichgewichtslage weg.'),
      why: () => L('With a plus sign, the further the body is from the equilibrium, the more it is pushed away: it runs away exponentially instead of oscillating. A restoring force needs ÿ = −ω²·y.',
        'Mit einem Pluszeichen wird der Körper umso stärker weggestossen, je weiter er von der Gleichgewichtslage entfernt ist: Er läuft exponentiell davon, statt zu schwingen. Eine rücktreibende Kraft braucht ÿ = −ω²·y.'),
    },
    order: {
      short: () => L('Only the first derivative: the velocity, not the acceleration.', 'Nur die erste Ableitung: die Geschwindigkeit, nicht die Beschleunigung.'),
      why: () => L('Here the velocity is proportional to the displacement, not the acceleration. Such a motion dies away (or grows) exponentially and never turns back: no oscillation.',
        'Hier ist die Geschwindigkeit proportional zur Auslenkung, nicht die Beschleunigung. Eine solche Bewegung klingt exponentiell ab (oder wächst) und kehrt nie um: keine Schwingung.'),
    },
    power: {
      short: () => L('The displacement is not to the first power.', 'Die Auslenkung steht nicht in der ersten Potenz.'),
      why: () => L('In an SHM, the acceleration is proportional to the displacement itself (a linear equation). With y² or y³, the restoring force grows differently: the motion is not harmonic (with y², not even an oscillation), and its period would depend on the amplitude.',
        'Bei einer harmonischen Schwingung ist die Beschleunigung proportional zur Auslenkung selbst (eine lineare Gleichung). Mit y² oder y³ wächst die rücktreibende Kraft anders: Die Bewegung ist nicht harmonisch (mit y² nicht einmal eine Schwingung), und ihre Periode hinge von der Amplitude ab.'),
    },
    tsq: {
      short: () => L('t² in the argument: the oscillation gets faster and faster.', 't² im Argument: Die Schwingung wird immer schneller.'),
      why: () => L('In an SHM, the phase grows evenly with time: ω·t. With t², the phase grows faster and faster: the oscillation speeds up and has no fixed period.',
        'Bei einer harmonischen Schwingung wächst die Phase gleichmässig mit der Zeit: ω·t. Mit t² wächst die Phase immer schneller: Die Schwingung wird schneller und hat keine feste Periode.'),
    },
    amp: {
      short: () => L('The amplitude changes with time.', 'Die Amplitude ändert sich mit der Zeit.'),
      why: () => L('In an SHM, the amplitude stays the same. Here the factor in front of the cosine depends on t: the oscillation grows or dies away.',
        'Bei einer harmonischen Schwingung bleibt die Amplitude gleich. Hier hängt der Faktor vor dem Kosinus von t ab: Die Schwingung wächst oder klingt ab.'),
    },
    const: {
      short: () => L('The acceleration does not depend on the displacement.', 'Die Beschleunigung hängt nicht von der Auslenkung ab.'),
      why: () => L('A constant acceleration, as in a throw: no restoring force that grows with the displacement. The graph is a parabola, not an oscillation.',
        'Eine konstante Beschleunigung, wie bei einem Wurf: keine rücktreibende Kraft, die mit der Auslenkung wächst. Der Graph ist eine Parabel, keine Schwingung.'),
    },
    damp: {
      short: () => L('A term with the velocity: the oscillation is damped.', 'Ein Term mit der Geschwindigkeit: Die Schwingung ist gedämpft.'),
      why: () => L('The term with the velocity ẏ acts like friction: the amplitude dies away. A damped oscillation is not an SHM.',
        'Der Term mit der Geschwindigkeit ẏ wirkt wie Reibung: Die Amplitude klingt ab. Eine gedämpfte Schwingung ist keine harmonische Schwingung.'),
    },
  };

  // The usual wrong periods, by their flags.
  const PWHY = {
    omega2: () => L('Compare with ÿ = −ω²·y: what stands there is ω², not ω. Take the square root first.', 'Vergleiche mit ÿ = −ω²·y: Dort steht ω², nicht ω. Zieh zuerst die Wurzel.'),
    inverse: () => L('Upside down: T = 2π/ω. Bring the equation into the form ÿ = −ω²·y first (divide by the factor in front of ÿ).', 'Kehrwert verwechselt: T = 2π/ω. Bring die Gleichung zuerst in die Form ÿ = −ω²·y (teile durch den Faktor vor ÿ).'),
    freq: () => L('That is the frequency f = ω/(2π), the number of oscillations per second. The period is its inverse: T = 2π/ω.', 'Das ist die Frequenz f = ω/(2π), die Anzahl Schwingungen pro Sekunde. Die Periode ist ihr Kehrwert: T = 2π/ω.'),
    omegaT: () => L('That is the angular frequency ω, not the period. One period is the time for the phase ω·t to grow by 2π: T = 2π/ω.', 'Das ist die Kreisfrequenz ω, nicht die Periode. Eine Periode ist die Zeit, in der die Phase ω·t um 2π wächst: T = 2π/ω.'),
  };

  // the nudges after such a wrong period in practice (PWHY stays for the check's explanation)
  const PNUDGE = {
    omega2: () => L('Compare with ÿ = −ω²·y: does ω or ω² stand there?', 'Vergleiche mit ÿ = −ω²·y: Steht dort ω oder ω²?'),
    inverse: () => L('How are T and ω related? Bring the equation into the form ÿ = −ω²·y first (divide by the factor in front of ÿ) and read off ω.', 'Wie hängen T und ω zusammen? Bring die Gleichung zuerst in die Form ÿ = −ω²·y (teile durch den Faktor vor ÿ) und lies ω ab.'),
    freq: () => L('That is the frequency f = ω/(2π), the number of oscillations per second. How is the period related to it?', 'Das ist die Frequenz f = ω/(2π), die Anzahl Schwingungen pro Sekunde. Wie hängt die Periode mit ihr zusammen?'),
    omegaT: () => L('That is the angular frequency ω, not the period. In what time does the phase ω·t grow by 2π?', 'Das ist die Kreisfrequenz ω, nicht die Periode. In welcher Zeit wächst die Phase ω·t um 2π?'),
  };

  const cos = Math.cos, sin = Math.sin, exp = Math.exp;
  const harmonic = (P, w, y0 = 0) => ({ order: 2, acc: (y) => -w * w * (y - y0) });
  // the usual wrong periods for ω = c, as ODE (ω² read as ω) or as solution (ω taken for T)
  const T_STD = (s) => [`\\frac{2\\pi}{${s.c}}`, [`\\frac{2\\pi}{${s.c}^2}`, 'omega2'], [`2\\pi\\cdot ${s.c}`, 'inverse'], [`\\frac{${s.c}}{2\\pi}`, 'freq']];
  const T_SOL = (s) => [`\\frac{2\\pi}{${s.c}}`, [s.c, 'omegaT'], [`2\\pi\\cdot ${s.c}`, 'inverse'], [`\\frac{${s.c}}{2\\pi}`, 'freq']];
  const T_INV = (s) => [`2\\pi\\cdot ${s.c}`, [`\\frac{2\\pi}{${s.c}}`, 'inverse'], [`2\\pi\\cdot ${s.c}^2`, 'omega2'], [`\\frac{1}{2\\pi\\cdot ${s.c}}`, 'freq']];

  const FORMS = [
    // ---------------------------------------------------------------- SHM
    { id: 'std', kind: 'ode', level: 1, shm: true, tex: (s) => `${s.D2} = -${s.c}^2\\cdot ${s.Y}`,
      std: (s) => `${s.dd} = -${s.c}^2\\cdot ${s.y}`, w2: (s) => `${s.c}^2`, w: (s) => s.c, T: T_STD, period: (P) => (2 * Math.PI) / P.c, motion: (P) => harmonic(P, P.c) },
    { id: 'std0', kind: 'ode', level: 1, shm: true, tex: (s) => `${s.D2} + ${s.c}^2\\cdot ${s.Y} = 0`,
      std: (s) => `${s.dd} = -${s.c}^2\\cdot ${s.y}`, w2: (s) => `${s.c}^2`, w: (s) => s.c, T: T_STD, period: (P) => (2 * Math.PI) / P.c, motion: (P) => harmonic(P, P.c) },
    { id: 'cos', kind: 'sol', level: 1, shm: true, tex: (s) => `${s.Yt} = A\\cdot\\cos(${s.c}\\cdot t)`,
      std: (s) => `${s.y}(t) = A\\cdot\\cos(\\omega\\, t)`, w: (s) => s.c, T: T_SOL, period: (P) => (2 * Math.PI) / P.c, motion: (P) => ({ sol: (t) => P.A * cos(P.c * t) }) },
    { id: 'inv', kind: 'ode', level: 2, shm: true, tex: (s) => `${s.Y} + ${s.c}^2\\cdot ${s.D2} = 0`,
      std: (s) => `${s.dd} = -\\frac{1}{${s.c}^2}\\cdot ${s.y}`, w2: (s) => `\\frac{1}{${s.c}^2}`, w: (s) => `\\frac{1}{${s.c}}`, T: T_INV, period: (P) => 2 * Math.PI * P.c, motion: (P) => harmonic(P, 1 / P.c) },
    { id: 'frac', kind: 'ode', level: 2, shm: true, tex: (s) => `${s.D2} = -\\frac{${s.Y}}{${s.c}^2}`,
      std: (s) => `${s.dd} = -\\frac{1}{${s.c}^2}\\cdot ${s.y}`, w2: (s) => `\\frac{1}{${s.c}^2}`, w: (s) => `\\frac{1}{${s.c}}`, T: T_INV, period: (P) => 2 * Math.PI * P.c, motion: (P) => harmonic(P, 1 / P.c) },
    { id: 'lin', kind: 'ode', level: 2, shm: true, tex: (s) => `${s.D2} = -${s.c}\\cdot ${s.Y}`,
      std: (s) => `${s.dd} = -${s.c}\\cdot ${s.y}`, w2: (s) => s.c, w: (s) => `\\sqrt{${s.c}}`,
      T: (s) => [`\\frac{2\\pi}{\\sqrt{${s.c}}}`, [`\\frac{2\\pi}{${s.c}}`, 'omega2'], [`2\\pi\\cdot\\sqrt{${s.c}}`, 'inverse'], [`\\frac{\\sqrt{${s.c}}}{2\\pi}`, 'freq']],
      period: (P) => (2 * Math.PI) / Math.sqrt(P.c), motion: (P) => harmonic(P, Math.sqrt(P.c)) },
    { id: 'mD', kind: 'ode', level: 2, shm: true, tex: (s) => `m\\cdot ${s.D2} + D\\cdot ${s.Y} = 0`,
      std: (s) => `${s.dd} = -\\frac{D}{m}\\cdot ${s.y}`, w2: () => '\\frac{D}{m}', w: () => '\\sqrt{\\frac{D}{m}}',
      T: () => ['2\\pi\\sqrt{\\frac{m}{D}}', ['2\\pi\\sqrt{\\frac{D}{m}}', 'inverse'], ['2\\pi\\cdot\\frac{m}{D}', 'omega2'], ['\\frac{1}{2\\pi}\\sqrt{\\frac{D}{m}}', 'freq']],
      period: (P) => 2 * Math.PI * Math.sqrt(P.m / P.D), motion: (P) => harmonic(P, Math.sqrt(P.D / P.m)) },
    { id: 'sinphi', kind: 'sol', level: 2, shm: true, noVar: '\\varphi', tex: (s) => `${s.Yt} = A\\cdot\\sin(${s.c}\\cdot t + \\varphi_0)`,
      std: (s) => `${s.y}(t) = A\\cdot\\sin(\\omega\\, t + \\varphi_0)`, w: (s) => s.c, T: T_SOL, period: (P) => (2 * Math.PI) / P.c, motion: (P) => ({ sol: (t) => P.A * sin(P.c * t + P.phi) }) },
    { id: 'c1c2', kind: 'sol', level: 2, shm: true, tex: (s) => `${s.Yt} = C_1\\cdot\\cos(${s.c}\\cdot t) - C_2\\cdot\\sin(${s.c}\\cdot t)`,
      std: (s) => `${s.y}(t) = A\\cdot\\cos(\\omega\\, t - \\varphi_0)`, w: (s) => s.c, T: T_SOL, period: (P) => (2 * Math.PI) / P.c, motion: (P) => ({ sol: (t) => P.C1 * cos(P.c * t) - P.C2 * sin(P.c * t) }) },
    { id: 'Tform', kind: 'sol', level: 2, shm: true, tex: (s) => `${s.Yt} = A\\cdot\\cos\\!\\left(\\frac{2\\pi\\, t}{${s.c}}\\right)`,
      std: (s) => `${s.y}(t) = A\\cdot\\cos(\\omega\\, t)`, w: (s) => `\\frac{2\\pi}{${s.c}}`,
      T: (s) => [s.c, [`\\frac{2\\pi}{${s.c}}`, 'omegaT'], [`2\\pi\\cdot ${s.c}`, 'inverse'], [`\\frac{${s.c}}{2\\pi}`, 'freq']],
      period: (P) => P.c, motion: (P) => ({ sol: (t) => P.A * cos((2 * Math.PI * t) / P.c) }) },
    { id: 'cinv', kind: 'ode', level: 3, shm: true, tex: (s) => `${s.c}\\cdot ${s.D2} = -${s.Y}`,
      std: (s) => `${s.dd} = -\\frac{1}{${s.c}}\\cdot ${s.y}`, w2: (s) => `\\frac{1}{${s.c}}`, w: (s) => `\\frac{1}{\\sqrt{${s.c}}}`,
      T: (s) => [`2\\pi\\sqrt{${s.c}}`, [`\\frac{2\\pi}{\\sqrt{${s.c}}}`, 'inverse'], [`2\\pi\\cdot ${s.c}`, 'omega2'], [`\\frac{1}{2\\pi\\sqrt{${s.c}}}`, 'freq']],
      period: (P) => 2 * Math.PI * Math.sqrt(P.c), motion: (P) => harmonic(P, 1 / Math.sqrt(P.c)) },
    { id: 'shift', kind: 'ode', level: 3, shm: true, shifted: true, tex: (s) => `${s.D2} + ${s.c}^2\\cdot ${s.Y} = g`,
      std: (s) => `${s.dd} = -${s.c}^2\\cdot\\left(${s.y} - \\frac{g}{${s.c}^2}\\right)`, w2: (s) => `${s.c}^2`, w: (s) => s.c, T: T_STD,
      period: (P) => (2 * Math.PI) / P.c, motion: (P) => harmonic(P, P.c, P.g / (P.c * P.c)) },
    { id: 'solshift', kind: 'sol', level: 3, shm: true, shifted: true, tex: (s) => `${s.Yt} = A\\cdot\\cos(${s.c}\\cdot t) + B`,
      std: (s) => `${s.y}(t) = A\\cdot\\cos(\\omega\\, t) + B`, w: (s) => s.c, T: T_SOL, period: (P) => (2 * Math.PI) / P.c, motion: (P) => ({ sol: (t) => P.A * cos(P.c * t) + P.B }) },
    // ---------------------------------------------------------------- no SHM
    { id: 'plus', kind: 'ode', level: 1, shm: false, mistake: 'sign', tex: (s) => `${s.D2} = ${s.c}^2\\cdot ${s.Y}`, motion: (P) => ({ order: 2, acc: (y) => P.c * P.c * y }) },
    { id: 'first', kind: 'ode', level: 1, shm: false, mistake: 'order', tex: (s) => `${s.D1} = -${s.c}^2\\cdot ${s.Y}`, motion: (P) => ({ order: 1, rate: (y) => -P.c * P.c * y }) },
    { id: 'square', kind: 'ode', level: 1, shm: false, mistake: 'power', tex: (s) => `${s.D2} = -${s.c}^2\\cdot ${s.Yp(2)}`, motion: (P) => ({ order: 2, acc: (y) => -P.c * P.c * y * y }) },
    { id: 'tsq', kind: 'sol', level: 1, shm: false, mistake: 'tsq', tex: (s) => `${s.Yt} = A\\cdot\\cos(${s.c}\\cdot t^2)`, motion: (P) => ({ sol: (t) => P.A * cos(P.c * t * t) }) },
    { id: 'const', kind: 'ode', level: 2, shm: false, mistake: 'const', tex: (s) => `${s.D2} = -${s.c}^2`, motion: (P) => ({ order: 2, acc: () => -P.c * P.c }) },
    { id: 'amp', kind: 'sol', level: 2, shm: false, mistake: 'amp', tex: (s) => `${s.Yt} = A\\cdot t\\cdot\\cos(${s.c}\\cdot t)`, motion: (P) => ({ sol: (t) => P.A * t * cos(P.c * t) }) },
    { id: 'damp', kind: 'ode', level: 2, shm: false, mistake: 'damp', tex: (s) => `${s.D2} + \\gamma\\cdot ${s.D1} + ${s.c}^2\\cdot ${s.Y} = 0`, motion: (P) => ({ order: 2, acc: (y, v) => -P.gamma * v - P.c * P.c * y }) },
    { id: 'plusinv', kind: 'ode', level: 2, shm: false, mistake: 'sign', tex: (s) => `${s.Y} - ${s.c}^2\\cdot ${s.D2} = 0`, motion: (P) => ({ order: 2, acc: (y) => y / (P.c * P.c) }) },
    { id: 'cube', kind: 'ode', level: 3, shm: false, mistake: 'power', tex: (s) => `${s.D2} = -${s.c}^2\\cdot ${s.Yp(3)}`, motion: (P) => ({ order: 2, acc: (y) => -P.c * P.c * y * y * y }) },
    { id: 'expamp', kind: 'sol', level: 3, shm: false, mistake: 'amp', tex: (s) => `${s.Yt} = A\\cdot e^{-\\gamma t}\\cdot\\cos(${s.c}\\cdot t)`, motion: (P) => ({ sol: (t) => P.A * exp(-P.gamma * t) * cos(P.c * t) }) },
  ];
  const byId = (id) => FORMS.find((f) => f.id === id);

  // An equation: a form with its letters and notation (r: random numbers).
  function make(r, form) {
    const f = typeof form === 'string' ? byId(form) : form;
    const y = pick(r, VARS.filter((v) => v !== f.noVar));
    const c = pick(r, CONSTS);
    const note = f.kind === 'ode' && r() < 0.35 ? 'leib' : 'dot';
    return { form: f.id, y, c, note };
  }
  const sym = (eq) => symbols(eq.y, eq.c, eq.note);
  const tex = (eq) => byId(eq.form).tex(sym(eq));

  // ---------------------------------------------------------------- motion
  // y(t) at n + 1 times from 0 to tEnd, from y(0) = y0 and ẏ(0) = 0 (for an ODE), by RK4 with
  // small steps.
  function trace(m, tEnd, n = 200, y0 = 1) {
    const out = [];
    if (m.sol) { for (let k = 0; k <= n; k++) { const t = (k * tEnd) / n; out.push([t, m.sol(t)]); } return out; }
    const sub = 20, h = tEnd / n / sub;
    let y = y0, v = 0, t = 0;
    out.push([0, y]);
    for (let k = 1; k <= n; k++) {
      for (let j = 0; j < sub; j++) {
        if (m.order === 1) {
          const k1 = m.rate(y, t), k2 = m.rate(y + (h / 2) * k1, t + h / 2), k3 = m.rate(y + (h / 2) * k2, t + h / 2), k4 = m.rate(y + h * k3, t + h);
          y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        } else {
          const a1 = m.acc(y, v, t), v1 = v;
          const a2 = m.acc(y + (h / 2) * v1, v + (h / 2) * a1, t + h / 2), v2 = v + (h / 2) * a1;
          const a3 = m.acc(y + (h / 2) * v2, v + (h / 2) * a2, t + h / 2), v3 = v + (h / 2) * a2;
          const a4 = m.acc(y + h * v3, v + h * a3, t + h), v4 = v + h * a3;
          y += (h / 6) * (v1 + 2 * v2 + 2 * v3 + v4);
          v += (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
        }
        t += h;
        if (!Number.isFinite(y) || Math.abs(y) > 1e6) { y = Math.sign(y || 1) * 1e6; v = 0; }
      }
      out.push([t, y]);
    }
    return out;
  }

  // The numbers for the constants of a form (for the tests and the graphs).
  // (g: the shifted equilibrium g/c² between 2 and 3, away from the start at 1)
  const numbers = (r) => { const c = 0.8 + 1.4 * r(); return { c, A: 1, m: 0.5 + r(), D: 2 + 4 * r(), g: c * c * (2 + r()), gamma: 0.2 + 0.3 * r(), B: 0.5 + r(), C1: 0.6 + r(), C2: 0.3 + r(), phi: 0.4 + r() }; };

  root.Equations = { VARS, CONSTS, MISTAKES, PWHY, PNUDGE, FORMS, byId, make, sym, tex, symbols, trace, numbers };
  if (typeof module !== 'undefined') module.exports = root.Equations;
})(typeof window !== 'undefined' ? window : globalThis);
