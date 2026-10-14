// Impedance curves Z(ω) of ac circuits: R with L, C or both, in series or in parallel.
// The student reads R, L and C off the graph: the value at ω → 0, the asymptote for large ω, the
// slope of the tangent (dZ/dω in Ω·s, which is H since ω is in rad/s), the corner frequency where
// Z = √2·R or R/√2, and the minimum or maximum Z = R at resonance, ω₀ = 1/√(LC).
//
// A circuit is { kind: 'RL' | 'RC' | 'RLC', conn: 'series' | 'parallel', R (Ω), L (H), C (F) }
// (L or C null when missing). Its axes are fixed by its characteristic frequency (R/L, 1/(RC) or
// ω₀): linear axes 0 … wmax, 0 … ztop that show every feature the method needs (and log-log
// axes over whole decades, no longer offered in the app). analysis() gives the worked method (steps with annotations for the
// graph, hints, the estimated values), shared by the tutor, the hints and the solution.
(function (root) {
  'use strict';

  // The page language (lang.js, shared by the apps); English where it is not loaded.
  const Lang = root.Lang || (typeof require === 'function' ? require('./lang.js') : null);
  const L = (en, de) => (Lang ? Lang.L(en, de) : en);

  const TOL = 0.05;                     // answers within 5 % are right
  // Difficulty 1–5 of each kind of circuit, and the practice levels made of them.
  const DIFFICULTY = { 'series RL': 1, 'series RC': 2, 'parallel RL': 3, 'parallel RC': 3, 'series RLC': 4, 'parallel RLC': 5 };
  const LEVELS = {
    easy: { name: () => L('Easy', 'Einfach'), kinds: ['series RL', 'series RC'] },
    medium: { name: () => L('Medium', 'Mittel'), kinds: ['parallel RL', 'parallel RC'] },
    hard: { name: () => L('Hard', 'Schwierig'), kinds: ['series RLC', 'parallel RLC'] },
    mixed: { name: () => L('Mixed', 'Gemischt'), kinds: Object.keys(DIFFICULTY) },
  };
  const UNKNOWNS = { RL: ['R', 'L'], RC: ['R', 'C'], RLC: ['R', 'L', 'C'], LC: ['L', 'C'], R: ['R'], L: ['L'], C: ['C'] }; // LC and one element: matching only (match.js)
  const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const E6 = [1, 1.5, 2.2, 3.3, 4.7, 6.8];
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const p3 = (x) => Number(x.toPrecision(3));
  const R_VALUES = [10, 100].flatMap((k) => E12.map((m) => p3(m * k))).concat([1000]); // Ω
  const L_VALUES = [0.01, 0.1].flatMap((k) => E6.map((m) => p3(m * k)));              // H: 10 … 680 mH
  const C_VALUES = [1e-7, 1e-6, 1e-5].flatMap((k) => E6.map((m) => p3(m * k)));       // F: 0.1 … 68 µF

  // ---------------------------------------------------------------- random numbers
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return { next, pick: (arr) => arr[Math.floor(next() * arr.length)] };
  }

  // ---------------------------------------------------------------- impedance
  // Series: Z = √(R² + X²), X = ωL − 1/(ωC). Parallel: 1/Z = √(1/R² + B²), B = ωC − 1/(ωL).
  // Without R (an LC circuit, R null) the R terms drop out. Two more circuits of the matching
  // exercise (match.js), with R, L and C: 'series-parallel', R in series with the pair L ∥ C
  // (reactance X = 1/(1/(ωL) − ωC)), and 'parallel-series', R in parallel with the pair L + C
  // (reactance X = ωL − 1/(ωC)).
  // A device with its own curve gives its impedance as a function c.fn of the variable
  // of its axis, there the frequency f in Hz.
  function Z(c, w) {
    if (c.fn) return c.fn(w);
    const G = c.R ? 1 / c.R : 0;
    if (c.conn === 'series') {
      const X = (c.L ? w * c.L : 0) - (c.C ? 1 / (w * c.C) : 0);
      return Math.sqrt((c.R || 0) ** 2 + X * X);
    }
    if (c.conn === 'parallel') {
      const B = (c.C ? w * c.C : 0) - (c.L ? 1 / (w * c.L) : 0);
      return 1 / Math.sqrt(G * G + B * B);
    }
    if (c.conn === 'series-parallel') {
      const X = 1 / (1 / (w * c.L) - w * c.C);
      return Math.sqrt(c.R * c.R + X * X);
    }
    const X = w * c.L - 1 / (w * c.C);
    return 1 / Math.sqrt(G * G + 1 / (X * X));
  }
  // Slope of the tangent dZ/dω (Ω·s).
  function dZ(c, w) {
    if (c.fn) { const h = w * 1e-6; return (c.fn(w + h) - c.fn(w - h)) / (2 * h); }
    if (c.conn === 'series') {
      const X = (c.L ? w * c.L : 0) - (c.C ? 1 / (w * c.C) : 0);
      const dX = (c.L || 0) + (c.C ? 1 / (w * w * c.C) : 0);
      return (X * dX) / Z(c, w);
    }
    const B = (c.C ? w * c.C : 0) - (c.L ? 1 / (w * c.L) : 0);
    const dB = (c.C || 0) + (c.L ? 1 / (w * w * c.L) : 0);
    const z = Z(c, w);
    return -z * z * z * B * dB;
  }
  // Characteristic frequency: corner R/L or 1/(RC), or the resonance ω₀ = 1/√(LC).
  function feature(c) {
    if (c.kind === 'RL') return c.R / c.L;
    if (c.kind === 'RC') return 1 / (c.R * c.C);
    return 1 / Math.sqrt(c.L * c.C);
  }
  // Quality factor of an RLC circuit (how sharp the minimum or maximum is).
  const quality = (c) => (c.conn === 'series' ? (feature(c) * c.L) / c.R : c.R / (feature(c) * c.L));

  function niceUp(x) {
    const e = Math.floor(Math.log10(x));
    for (const m of NICE) if (m * 10 ** e >= x * (1 - 1e-9)) return p3(m * 10 ** e);
    return 10 ** (e + 1);
  }

  // Axes: linear { wmax, ztop } and log-log { w0, w1, z0, z1 } (decades).
  function axesFor(c) {
    const wf = feature(c), rlc = c.kind === 'RLC';
    const wmax = niceUp((rlc ? (c.conn === 'series' ? 6.5 : 2.3) : 6) * wf);
    let ztop;
    if (c.conn === 'parallel') ztop = niceUp(1.15 * c.R);
    else if (c.kind === 'RC') ztop = niceUp(5 * c.R);
    else ztop = niceUp(1.05 * Z(c, wmax));
    const w0 = 10 ** Math.floor(Math.log10(wf / 30)), w1 = 10 ** Math.ceil(Math.log10(wf * 30));
    let lo = Infinity, hi = 0;
    for (let k = 0; k <= 200; k++) { const z = Z(c, w0 * (w1 / w0) ** (k / 200)); lo = Math.min(lo, z); hi = Math.max(hi, z); }
    // R (the minimum or maximum, or where the curve levels off) never lies on the edge
    let z0 = 10 ** Math.floor(Math.log10(Math.min(lo, c.R)) - 1e-9), z1 = 10 ** Math.ceil(Math.log10(Math.max(hi, c.R)) + 1e-9);
    if (z1 / z0 > 1e4) { if (c.conn === 'series') z1 = z0 * 1e4; else z0 = z1 / 1e4; }
    return { lin: { wmax, ztop }, log: { w0, w1, z0, z1 } };
  }

  // Every feature the method needs is on the graph and readable.
  function usable(c, ax) {
    const wf = feature(c), { wmax, ztop } = ax.lin;
    if (wf < 50 || wf > 50000) return false;
    if (c.kind === 'RLC') {
      const Q = quality(c);
      if (c.conn === 'series') return Q >= 0.7 && Q <= 1.6 && wmax / wf <= 8 && ztop / c.R <= 14;
      return Q >= 1.2 && Q <= 5 && wmax / wf <= 3;
    }
    if (wmax / wf > 9) return false;
    return !(c.conn === 'series' && c.kind === 'RL' && ztop / c.R > 12);
  }

  // ---------------------------------------------------------------- numbers
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (n) => String(n).split('').map((ch) => SUP[ch]).join('');
  // n significant digits, three by default (trailing zeros kept), with a proper minus sign.
  function digits(x, n = 3) {
    if (Math.abs(x) < 1e-12) return '0';
    let s = Math.abs(x).toPrecision(n);
    if (s.includes('e')) s = String(Number(Math.abs(x).toPrecision(n)));
    return (x < 0 ? '−' : '') + s;
  }
  const UNITS = {
    ohm: { html: 'Ω', tex: '\\Omega', prefixes: [0, 3, 6] },
    H: { html: 'H', tex: '\\mathrm{H}', prefixes: [-6, -3, 0] },
    F: { html: 'F', tex: '\\mathrm{F}', prefixes: [-15, -12, -9, -6, -3] },
    Hz: { html: 'Hz', tex: '\\mathrm{Hz}', prefixes: [0, 3, 6] },
    m: { html: 'm', tex: '\\mathrm{m}', prefixes: [0] },
    ohms: { html: 'Ω·s', tex: '\\Omega\\,\\mathrm{s}', prefixes: [-6, -3, 0] },
  };
  const PREFIX = { '-15': ['f', '\\mathrm{f}'], '-12': ['p', '\\mathrm{p}'], 6: ['M', '\\mathrm{M}'], '-9': ['n', '\\mathrm{n}'], '-6': ['µ', '\\mu'], '-3': ['m', '\\mathrm{m}'], 0: ['', ''], 3: ['k', '\\mathrm{k}'] };
  // A value with a unit and n significant digits: { html, tex }. Units: ohm, H, F, ohms (Ω·s), Hz, m,
  // w (rad/s) and s2 (s², for ω⁻²).
  function q(x, unit, n = 3) {
    // s² (the probe's ω⁻²): plain from 0.01 to 999, else with a power of ten
    if (unit === 's2') {
      let e = Math.floor(Math.log10(Math.abs(x))), m = Number((x / 10 ** e).toPrecision(n));
      if (Math.abs(m) >= 10) { m /= 10; e++; }
      if (e >= -2 && e <= 2) return { html: `${digits(x, n)} s²`, tex: `${digits(x, n).replace('−', '-')}\\,\\mathrm{s^2}` };
      return { html: `${digits(m, n)}·10${sup(e)} s²`, tex: `${digits(m, n).replace('−', '-')}\\cdot 10^{${e}}\\,\\mathrm{s^2}` };
    }
    if (unit === 'w') {
      if (Math.abs(x) < 1e4) return { html: `${digits(x)} rad/s`, tex: `${digits(x).replace('−', '-')}\\,\\mathrm{rad/s}` };
      const e = 3 * Math.floor(Math.log10(Math.abs(x) * (1 + 1e-12)) / 3), d = digits(x / 10 ** e);
      return { html: `${d}·10${sup(e)} rad/s`, tex: `${d.replace('−', '-')}\\cdot 10^{${e}}\\,\\mathrm{rad/s}` };
    }
    const u = UNITS[unit], ps = u.prefixes;
    let p = ps[0];
    for (const k of ps) if (Math.abs(x) >= 10 ** k * (1 - 5e-4)) p = k;
    const d = digits(x / 10 ** p, n), [ph, pt] = PREFIX[p];
    return { html: `${d} ${ph}${u.html}`, tex: `${d.replace('−', '-')}\\,${pt}${u.tex}` };
  }
  const H = (x, unit, n) => q(x, unit, n).html;
  const T = (x, unit) => q(x, unit).tex;

  // ---------------------------------------------------------------- the method
  // Annotations for the graph: pt (point), h (horizontal line), v (vertical line), line (straight
  // line through (w, z) with slope s), tan (tangent to the curve at w), fn (dashed curve f(ω)).
  const pt = (w, z, label) => ({ t: 'pt', w, z, label });
  const hl = (z, label) => ({ t: 'h', z, label });
  const vl = (w, label) => ({ t: 'v', w, label });
  const line = (w, z, s, label) => ({ t: 'line', w, z, s, label });
  const tan = (w, label) => ({ t: 'tan', w, label });
  const fn = (f, label) => ({ t: 'fn', f, label });

  // Worked analysis of circuit c with axes ax. Returns { intro, steps: [{ title, text, ann }],
  // plan, formulas, readings (per unknown), est (values found from the readings) }.
  function analysis(c, ax) {
    const { R, L: Lc, C } = c, wf = feature(c), wR = ax.lin.wmax, wS = ax.lin.wmax / 400;
    const series = c.conn === 'series';
    const Rh = H(R, 'ohm'), Rt = T(R, 'ohm');
    const sR = p3(dZ(c, wR)), sS = p3(dZ(c, wS)), w0 = p3(wf);
    const slopeNote = L('Since $\\omega$ is in rad/s, a slope of $1\\,\\Omega\\,\\mathrm{s}$ is $1\\,\\mathrm{H}$.', 'Da $\\omega$ in rad/s gemessen wird, entspricht eine Steigung von $1\\,\\Omega\\,\\mathrm{s}$ genau $1\\,\\mathrm{H}$.');
    const slope = L('slope', 'Steigung');
    const steps = [], plan = {}, formulas = {}, readings = {}, est = { R };
    const triangle = L('In series, resistance and reactance add like the sides of a right triangle:', 'In Serie addieren sich Widerstand und Blindwiderstand wie die Seiten eines rechtwinkligen Dreiecks:');
    const triangleP = L('In parallel, the admittances add like the sides of a right triangle:', 'Parallel addieren sich die Leitwerte wie die Seiten eines rechtwinkligen Dreiecks:');
    const levelsOff = (Rh2) => L(`the graph levels off at ${Rh2}`, `der Graph nähert sich ${Rh2}`);
    let intro;

    if (c.kind === 'RL') {
      const corner = { title: L('Check: the corner', 'Kontrolle: die Grenzfrequenz'), ann: [vl(wf, 'ω = R/L')] };
      if (series) {
        intro = `${triangle} $$Z = \\sqrt{R^2 + (\\omega L)^2}$$`;
        steps.push({ title: L('Small ω: the inductor is a wire', 'Kleines ω: Die Spule ist ein Draht'), ann: [pt(0, R, 'Z(0) = R')],
          text: L(`At $\\omega = 0$ the reactance $\\omega L$ is zero, so the impedance is just the resistance: $Z(0) = R$. The graph starts at $Z(0) = ${Rt}$, so $R = ${Rt}$.`,
            `Bei $\\omega = 0$ ist der Blindwiderstand $\\omega L$ null, die Impedanz ist also einfach der Widerstand: $Z(0) = R$. Der Graph beginnt bei $Z(0) = ${Rt}$, also ist $R = ${Rt}$.`) });
        est.L = sR;
        steps.push({ title: L('Large ω: the inductor dominates', 'Grosses ω: Die Spule dominiert'), ann: [line(0, 0, Lc, 'Z = ωL'), tan(wR, slope)],
          text: L(`For large $\\omega$, $\\omega L \\gg R$ and $Z \\approx \\omega L$: the graph approaches a straight line through the origin with slope $L$. The tangent at the right end, $\\omega = ${T(wR, 'w')}$, has the slope $\\frac{dZ}{d\\omega} \\approx ${T(sR, 'ohms')}$, so $L \\approx ${T(sR, 'H')}$. ${slopeNote}`,
            `Für grosses $\\omega$ ist $\\omega L \\gg R$ und $Z \\approx \\omega L$: Der Graph nähert sich einer Geraden durch den Ursprung mit der Steigung $L$. Die Tangente am rechten Rand, bei $\\omega = ${T(wR, 'w')}$, hat die Steigung $\\frac{dZ}{d\\omega} \\approx ${T(sR, 'ohms')}$, also ist $L \\approx ${T(sR, 'H')}$. ${slopeNote}`) });
        corner.ann.push(pt(wf, Math.SQRT2 * R, 'Z = √2·R'));
        corner.text = L(`Where $\\omega L = R$, at $\\omega = R/L = ${T(wf, 'w')}$, the impedance is $Z = \\sqrt{2}\\,R = ${T(Math.SQRT2 * R, 'ohm')}$: the graph passes through this point.`,
          `Wo $\\omega L = R$ ist, bei $\\omega = R/L = ${T(wf, 'w')}$, beträgt die Impedanz $Z = \\sqrt{2}\\,R = ${T(Math.SQRT2 * R, 'ohm')}$: Der Graph geht durch diesen Punkt.`);
        plan.R = L('the value at ω = 0', 'dem Wert bei ω = 0'); formulas.R = 'R = Z(0)'; readings.R = `Z(0) = ${Rh}`;
        plan.L = L('the slope of the tangent at the right end (the asymptote Z ≈ ωL)', 'der Steigung der Tangente am rechten Rand (der Asymptote Z ≈ ωL)'); formulas.L = L('L = \\frac{dZ}{d\\omega}\\ \\text{(large } \\omega)', 'L = \\frac{dZ}{d\\omega}\\ \\text{(grosses } \\omega)');
        readings.L = L(`the tangent at ω = ${H(wR, 'w')} has the slope ${H(sR, 'ohms')}`, `die Tangente bei ω = ${H(wR, 'w')} hat die Steigung ${H(sR, 'ohms')}`);
      } else {
        intro = `${triangleP} $$\\frac{1}{Z} = \\sqrt{\\frac{1}{R^2} + \\frac{1}{(\\omega L)^2}}$$`;
        est.L = sS;
        steps.push({ title: L('Small ω: the inductor short-circuits', 'Kleines ω: Die Spule schliesst kurz'), ann: [line(0, 0, Lc, 'Z = ωL'), tan(wS, slope)],
          text: L(`For small $\\omega$ the inductor has a small reactance $\\omega L$ and takes almost all the current: $Z \\approx \\omega L$. So the graph starts at $Z = 0$ with the slope $L$. The tangent at the origin has the slope $\\frac{dZ}{d\\omega} \\approx ${T(sS, 'ohms')}$, so $L \\approx ${T(sS, 'H')}$. ${slopeNote}`,
            `Für kleines $\\omega$ hat die Spule einen kleinen Blindwiderstand $\\omega L$ und nimmt fast den ganzen Strom: $Z \\approx \\omega L$. Der Graph beginnt also bei $Z = 0$ mit der Steigung $L$. Die Tangente im Ursprung hat die Steigung $\\frac{dZ}{d\\omega} \\approx ${T(sS, 'ohms')}$, also ist $L \\approx ${T(sS, 'H')}$. ${slopeNote}`) });
        steps.push({ title: L('Large ω: only the resistor carries current', 'Grosses ω: Nur der Widerstand führt Strom'), ann: [hl(R, 'Z → R')],
          text: L(`For large $\\omega$ the reactance $\\omega L$ is large and the current flows through the resistor: $Z \\to R$. The graph levels off at $${Rt}$, so $R = ${Rt}$.`,
            `Für grosses $\\omega$ ist der Blindwiderstand $\\omega L$ gross, und der Strom fliesst durch den Widerstand: $Z \\to R$. Der Graph nähert sich $${Rt}$, also ist $R = ${Rt}$.`) });
        corner.ann.push(pt(wf, R / Math.SQRT2, 'Z = R/√2'));
        corner.text = L(`Where $\\omega L = R$, at $\\omega = R/L = ${T(wf, 'w')}$, the impedance is $Z = R/\\sqrt{2} = ${T(R / Math.SQRT2, 'ohm')}$: the graph passes through this point.`,
          `Wo $\\omega L = R$ ist, bei $\\omega = R/L = ${T(wf, 'w')}$, beträgt die Impedanz $Z = R/\\sqrt{2} = ${T(R / Math.SQRT2, 'ohm')}$: Der Graph geht durch diesen Punkt.`);
        plan.R = L('the value the graph levels off at for large ω', 'dem Wert, dem sich der Graph für grosses ω nähert'); formulas.R = 'R = Z(\\omega \\to \\infty)'; readings.R = levelsOff(Rh);
        plan.L = L('the slope of the tangent at the origin (Z ≈ ωL for small ω)', 'der Steigung der Tangente im Ursprung (Z ≈ ωL für kleines ω)'); formulas.L = L('L = \\frac{dZ}{d\\omega}\\ \\text{(at } \\omega = 0)', 'L = \\frac{dZ}{d\\omega}\\ \\text{(bei } \\omega = 0)');
        readings.L = L(`the tangent at the origin has the slope ${H(sS, 'ohms')}`, `die Tangente im Ursprung hat die Steigung ${H(sS, 'ohms')}`);
      }
      steps.push(corner);
    } else if (c.kind === 'RC') {
      const wc = p3(wf), Zc = series ? Math.SQRT2 * R : R / Math.SQRT2;
      est.C = p3(1 / (wc * R));
      const cornerText = L(`The corner frequency is where the reactance $\\frac{1}{\\omega C}$ equals $R$; there $Z = ${series ? '\\sqrt{2}\\,R' : 'R/\\sqrt{2}'} = ${T(Zc, 'ohm')}$. The graph reaches this value at $\\omega_c \\approx ${T(wc, 'w')}$. From $\\frac{1}{\\omega_c C} = R$: $$C = \\frac{1}{\\omega_c R} = \\frac{1}{${T(wc, 'w')} \\cdot ${Rt}} = ${T(est.C, 'F')}$$`,
        `Bei der Grenzfrequenz ist der Blindwiderstand $\\frac{1}{\\omega C}$ gleich $R$; dort ist $Z = ${series ? '\\sqrt{2}\\,R' : 'R/\\sqrt{2}'} = ${T(Zc, 'ohm')}$. Der Graph erreicht diesen Wert bei $\\omega_c \\approx ${T(wc, 'w')}$. Aus $\\frac{1}{\\omega_c C} = R$ folgt $$C = \\frac{1}{\\omega_c R} = \\frac{1}{${T(wc, 'w')} \\cdot ${Rt}} = ${T(est.C, 'F')}$$`);
      if (series) {
        intro = `${triangle} $$Z = \\sqrt{R^2 + \\frac{1}{(\\omega C)^2}}$$`;
        steps.push({ title: L('Small ω: the capacitor blocks', 'Kleines ω: Der Kondensator sperrt'), ann: [fn((w) => 1 / (w * C), 'Z ≈ 1/(ωC)')],
          text: L('For small $\\omega$ the reactance $\\frac{1}{\\omega C}$ of the capacitor is huge: $Z \\approx \\frac{1}{\\omega C}$ goes to infinity as $\\omega \\to 0$.',
            'Für kleines $\\omega$ ist der Blindwiderstand $\\frac{1}{\\omega C}$ des Kondensators riesig: $Z \\approx \\frac{1}{\\omega C}$ geht für $\\omega \\to 0$ gegen unendlich.') });
        steps.push({ title: L('Large ω: only the resistor is left', 'Grosses ω: Nur der Widerstand bleibt'), ann: [hl(R, 'Z → R')],
          text: L(`For large $\\omega$ the capacitor acts like a wire, and $Z \\to R$. The graph levels off at $${Rt}$, so $R = ${Rt}$.`,
            `Für grosses $\\omega$ wirkt der Kondensator wie ein Draht, und $Z \\to R$. Der Graph nähert sich $${Rt}$, also ist $R = ${Rt}$.`) });
        plan.R = L('the value the graph levels off at for large ω', 'dem Wert, dem sich der Graph für grosses ω nähert'); formulas.R = 'R = Z(\\omega \\to \\infty)'; readings.R = levelsOff(Rh);
      } else {
        intro = `${triangleP} $$\\frac{1}{Z} = \\sqrt{\\frac{1}{R^2} + (\\omega C)^2}$$`;
        steps.push({ title: L('Small ω: the capacitor blocks', 'Kleines ω: Der Kondensator sperrt'), ann: [pt(0, R, 'Z(0) = R')],
          text: L(`At $\\omega = 0$ no current flows through the capacitor, only through the resistor: $Z(0) = R$. The graph starts at $${Rt}$, so $R = ${Rt}$.`,
            `Bei $\\omega = 0$ fliesst kein Strom durch den Kondensator, nur durch den Widerstand: $Z(0) = R$. Der Graph beginnt bei $${Rt}$, also ist $R = ${Rt}$.`) });
        steps.push({ title: L('Large ω: the capacitor short-circuits', 'Grosses ω: Der Kondensator schliesst kurz'), ann: [fn((w) => 1 / (w * C), 'Z ≈ 1/(ωC)')],
          text: L('For large $\\omega$ the capacitor takes almost all the current: $Z \\approx \\frac{1}{\\omega C} \\to 0$.', 'Für grosses $\\omega$ nimmt der Kondensator fast den ganzen Strom: $Z \\approx \\frac{1}{\\omega C} \\to 0$.') });
        plan.R = L('the value at ω = 0', 'dem Wert bei ω = 0'); formulas.R = 'R = Z(0)'; readings.R = `Z(0) = ${Rh}`;
      }
      steps.push({ title: L('The corner frequency gives C', 'Die Grenzfrequenz liefert C'), ann: [hl(Zc, series ? 'Z = √2·R' : 'Z = R/√2'), pt(wc, Zc, 'ω_c'), vl(wc, '')], text: cornerText });
      plan.C = L(`the corner frequency ω<sub>c</sub>, where Z = ${series ? '√2·R' : 'R/√2'}`, `der Grenzfrequenz ω<sub>c</sub>, bei der Z = ${series ? '√2·R' : 'R/√2'} ist`); formulas.C = 'C = \\frac{1}{\\omega_c R}';
      readings.C = L(`Z = ${H(Zc, 'ohm')} at ω<sub>c</sub> ≈ ${H(wc, 'w')}`, `Z = ${H(Zc, 'ohm')} bei ω<sub>c</sub> ≈ ${H(wc, 'w')}`);
    } else {
      if (series) {
        intro = L('In series, the reactances of the coil and the capacitor partly cancel:', 'In Serie heben sich die Blindwiderstände von Spule und Kondensator teilweise auf:') + ' $$Z = \\sqrt{R^2 + \\left(\\omega L - \\frac{1}{\\omega C}\\right)^2}$$';
        steps.push({ title: L('Small ω: the capacitor blocks', 'Kleines ω: Der Kondensator sperrt'), ann: [fn((w) => 1 / (w * C), 'Z ≈ 1/(ωC)')],
          text: L('For small $\\omega$ the reactance of the capacitor dominates: $Z \\approx \\frac{1}{\\omega C} \\to \\infty$.', 'Für kleines $\\omega$ dominiert der Blindwiderstand des Kondensators: $Z \\approx \\frac{1}{\\omega C} \\to \\infty$.') });
        est.L = sR;
        steps.push({ title: L('Large ω: the inductor dominates', 'Grosses ω: Die Spule dominiert'), ann: [tan(wR, slope)],
          text: L(`For large $\\omega$, $Z \\approx \\omega L$: the slope of the tangent approaches $L$. At the right end, $\\omega = ${T(wR, 'w')}$, it is $\\frac{dZ}{d\\omega} \\approx ${T(sR, 'ohms')}$, so $L \\approx ${T(sR, 'H')}$. ${slopeNote}`,
            `Für grosses $\\omega$ ist $Z \\approx \\omega L$: Die Steigung der Tangente nähert sich $L$. Am rechten Rand, bei $\\omega = ${T(wR, 'w')}$, beträgt sie $\\frac{dZ}{d\\omega} \\approx ${T(sR, 'ohms')}$, also ist $L \\approx ${T(sR, 'H')}$. ${slopeNote}`) });
        steps.push({ title: L('Resonance: the minimum', 'Resonanz: das Minimum'), ann: [pt(w0, R, 'Z_min = R'), tan(w0, '')],
          text: L(`At the resonance frequency $\\omega_0$ the two reactances cancel, $\\omega_0 L = \\frac{1}{\\omega_0 C}$, and $Z$ is smallest: $Z_{\\min} = R$. The tangent is horizontal at $\\omega_0 \\approx ${T(w0, 'w')}$, where $Z = ${Rt}$. So $R = ${Rt}$.`,
            `Bei der Resonanzfrequenz $\\omega_0$ heben sich die beiden Blindwiderstände auf, $\\omega_0 L = \\frac{1}{\\omega_0 C}$, und $Z$ ist am kleinsten: $Z_{\\min} = R$. Die Tangente ist bei $\\omega_0 \\approx ${T(w0, 'w')}$ waagrecht, dort ist $Z = ${Rt}$. Also ist $R = ${Rt}$.`) });
        plan.R = L('the minimum of Z', 'dem Minimum von Z'); formulas.R = 'R = Z_{\\min}'; readings.R = L(`the minimum is Z = ${Rh}`, `das Minimum ist Z = ${Rh}`);
        plan.L = L('the slope of the tangent at the right end (Z ≈ ωL for large ω)', 'der Steigung der Tangente am rechten Rand (Z ≈ ωL für grosses ω)'); formulas.L = L('L = \\frac{dZ}{d\\omega}\\ \\text{(large } \\omega)', 'L = \\frac{dZ}{d\\omega}\\ \\text{(grosses } \\omega)');
        readings.L = L(`the tangent at ω = ${H(wR, 'w')} has the slope ${H(sR, 'ohms')}`, `die Tangente bei ω = ${H(wR, 'w')} hat die Steigung ${H(sR, 'ohms')}`);
      } else {
        intro = L('In parallel, the susceptances of the coil and the capacitor partly cancel:', 'Parallel heben sich die Blindleitwerte von Spule und Kondensator teilweise auf:') + ' $$\\frac{1}{Z} = \\sqrt{\\frac{1}{R^2} + \\left(\\omega C - \\frac{1}{\\omega L}\\right)^2}$$';
        est.L = sS;
        steps.push({ title: L('Small ω: the inductor short-circuits', 'Kleines ω: Die Spule schliesst kurz'), ann: [line(0, 0, Lc, 'Z = ωL'), tan(wS, slope)],
          text: L(`For small $\\omega$ the coil takes almost all the current: $Z \\approx \\omega L$. The tangent at the origin has the slope $\\frac{dZ}{d\\omega} \\approx ${T(sS, 'ohms')}$, so $L \\approx ${T(sS, 'H')}$. ${slopeNote}`,
            `Für kleines $\\omega$ nimmt die Spule fast den ganzen Strom: $Z \\approx \\omega L$. Die Tangente im Ursprung hat die Steigung $\\frac{dZ}{d\\omega} \\approx ${T(sS, 'ohms')}$, also ist $L \\approx ${T(sS, 'H')}$. ${slopeNote}`) });
        steps.push({ title: L('Large ω: the capacitor short-circuits', 'Grosses ω: Der Kondensator schliesst kurz'), ann: [fn((w) => 1 / (w * C), 'Z ≈ 1/(ωC)')],
          text: L('For large $\\omega$ the capacitor takes almost all the current: $Z \\approx \\frac{1}{\\omega C} \\to 0$.', 'Für grosses $\\omega$ nimmt der Kondensator fast den ganzen Strom: $Z \\approx \\frac{1}{\\omega C} \\to 0$.') });
        steps.push({ title: L('Resonance: the maximum', 'Resonanz: das Maximum'), ann: [pt(w0, R, 'Z_max = R'), tan(w0, '')],
          text: L(`At the resonance frequency $\\omega_0$ the currents through coil and capacitor cancel, and only the resistor counts: $Z_{\\max} = R$. The tangent is horizontal at $\\omega_0 \\approx ${T(w0, 'w')}$, where $Z = ${Rt}$. So $R = ${Rt}$.`,
            `Bei der Resonanzfrequenz $\\omega_0$ heben sich die Ströme durch Spule und Kondensator auf, und nur der Widerstand zählt: $Z_{\\max} = R$. Die Tangente ist bei $\\omega_0 \\approx ${T(w0, 'w')}$ waagrecht, dort ist $Z = ${Rt}$. Also ist $R = ${Rt}$.`) });
        plan.R = L('the maximum of Z', 'dem Maximum von Z'); formulas.R = 'R = Z_{\\max}'; readings.R = L(`the maximum is Z = ${Rh}`, `das Maximum ist Z = ${Rh}`);
        plan.L = L('the slope of the tangent at the origin (Z ≈ ωL for small ω)', 'der Steigung der Tangente im Ursprung (Z ≈ ωL für kleines ω)'); formulas.L = L('L = \\frac{dZ}{d\\omega}\\ \\text{(at } \\omega = 0)', 'L = \\frac{dZ}{d\\omega}\\ \\text{(bei } \\omega = 0)');
        readings.L = L(`the tangent at the origin has the slope ${H(sS, 'ohms')}`, `die Tangente im Ursprung hat die Steigung ${H(sS, 'ohms')}`);
      }
      est.C = p3(1 / (w0 * w0 * est.L));
      steps.push({ title: L('C from the resonance frequency', 'C aus der Resonanzfrequenz'), ann: [vl(w0, 'ω₀')],
        text: L(`The resonance frequency is $\\omega_0 = \\frac{1}{\\sqrt{LC}}$, so $$C = \\frac{1}{\\omega_0^2 L} = \\frac{1}{(${T(w0, 'w')})^2 \\cdot ${T(est.L, 'H')}} = ${T(est.C, 'F')}$$`,
          `Die Resonanzfrequenz ist $\\omega_0 = \\frac{1}{\\sqrt{LC}}$, also $$C = \\frac{1}{\\omega_0^2 L} = \\frac{1}{(${T(w0, 'w')})^2 \\cdot ${T(est.L, 'H')}} = ${T(est.C, 'F')}$$`) });
      plan.C = L('the resonance frequency ω₀ (horizontal tangent) together with L', 'der Resonanzfrequenz ω₀ (waagrechte Tangente) zusammen mit L'); formulas.C = 'C = \\frac{1}{\\omega_0^2 L}';
      readings.C = L(`the tangent is horizontal at ω₀ ≈ ${H(w0, 'w')}`, `die Tangente ist bei ω₀ ≈ ${H(w0, 'w')} waagrecht`);
    }
    return { intro, steps, plan, formulas, readings, est };
  }

  // What Z does at the ends and in between, for the first hint.
  function shape(c) {
    const s = {
      'series RL': L('Z starts at R for ω = 0 and then grows, for large ω almost like the straight line ωL.', 'Z beginnt bei ω = 0 bei R und wächst dann, für grosses ω fast wie die Gerade ωL.'),
      'parallel RL': L('Z starts at 0 with the slope L and levels off at R for large ω.', 'Z beginnt bei 0 mit der Steigung L und nähert sich für grosses ω dem Wert R.'),
      'series RC': L('Z comes down from infinity (like 1/(ωC)) and levels off at R for large ω.', 'Z kommt von unendlich herunter (wie 1/(ωC)) und nähert sich für grosses ω dem Wert R.'),
      'parallel RC': L('Z starts at R for ω = 0 and falls towards 0 (like 1/(ωC)) for large ω.', 'Z beginnt bei ω = 0 bei R und fällt für grosses ω gegen 0 (wie 1/(ωC)).'),
      'series RLC': L('Z comes down from infinity (capacitor), has its minimum R at the resonance frequency ω₀ and grows again (coil), for large ω with the slope L.',
        'Z kommt von unendlich herunter (Kondensator), hat bei der Resonanzfrequenz ω₀ das Minimum R und wächst dann wieder (Spule), für grosses ω mit der Steigung L.'),
      'parallel RLC': L('Z starts at 0 with the slope L (coil), has its maximum R at the resonance frequency ω₀ and falls towards 0 (capacitor).',
        'Z beginnt bei 0 mit der Steigung L (Spule), hat bei der Resonanzfrequenz ω₀ das Maximum R und fällt dann gegen 0 (Kondensator).'),
    };
    return s[`${c.conn} ${c.kind}`];
  }

  // The worked example of a series RL or RC circuit (the tutor, lessons.js): the right triangle
  // Z = √(R² + X²), both ends of the ω axis (from analysis()), one point read off the curve at w1
  // that gives the reactance X and from it L or C, the corner, and the usual mistakes (R + X added
  // like numbers; the ends swapped). Returns { steps: [{ title, text, ann, tri }], read: { w, z, X,
  // value } } with tri (optional) the triangle to draw: { R, X, cap, labels: { R, X, Z } }.
  function pairAnalysis(c, ax, w1) {
    const an = analysis(c, ax), rl = c.kind === 'RL', R = c.R, Rt = T(R, 'ohm');
    const Xof = (w) => (rl ? w * c.L : 1 / (w * c.C));
    const X = Xof(w1), z = Z(c, w1), value = rl ? X / w1 : 1 / (w1 * X), wf = feature(c);
    const Xt = rl ? '\\omega L' : '\\frac{1}{\\omega C}', Xh = rl ? 'ωL' : '1/(ωC)';
    const el = rl ? L('coil', 'Spule') : L('capacitor', 'Kondensator');
    const theEl = rl ? L('the coil', 'die Spule') : L('the capacitor', 'der Kondensator');
    const given = rl ? `L = ${T(c.L, 'H')}` : `C = ${T(c.C, 'F')}`;
    const tri = (labels) => ({ R, X, cap: !rl, labels });
    const symbolic = tri({ R: 'R', X: `X = ${Xh}`, Z: 'Z' });
    const numeric = tri({ R: `R = ${H(R, 'ohm')}`, X: `X = ${H(X, 'ohm')}`, Z: `Z = ${H(z, 'ohm')}` });
    const readPt = pt(w1, z, `Z = ${H(z, 'ohm')}`);
    const steps = [];
    steps.push({ title: L('The circuit', 'Die Schaltung'), ann: [], tri: symbolic,
      text: L(`The same current flows through the resistor and the ${el}. The voltage across the resistor is in phase with the current, the voltage across the ${el} is shifted by 90°: the two peak at different times. So the resistance $R$ and the reactance $X = ${Xt}$ do not simply add: they are the two shorter sides of a right triangle, and the impedance is its hypotenuse, $$Z = \\sqrt{R^2 + X^2} = \\sqrt{R^2 + \\left(${Xt}\\right)^2}$$ The curve is drawn for $R = ${Rt}$ and $${given}$.`,
        `Durch den Widerstand und ${rl ? 'die Spule' : 'den Kondensator'} fliesst derselbe Strom. Die Spannung am Widerstand ist in Phase mit dem Strom, die Spannung ${rl ? 'an der Spule' : 'am Kondensator'} um 90° verschoben: Die beiden sind zu verschiedenen Zeiten am grössten. Der Widerstand $R$ und der Blindwiderstand $X = ${Xt}$ addieren sich darum nicht einfach: Sie sind die Katheten eines rechtwinkligen Dreiecks, und die Impedanz ist seine Hypotenuse, $$Z = \\sqrt{R^2 + X^2} = \\sqrt{R^2 + \\left(${Xt}\\right)^2}$$ Die Kurve ist für $R = ${Rt}$ und $${given}$ gezeichnet.`) });
    // both ends, as in the practice solution, with which element dominates there
    const domLo = rl ? L('Here the resistor dominates: $X \\ll R$.', 'Hier dominiert der Widerstand: $X \\ll R$.') : L('Here the capacitor dominates: $X \\gg R$.', 'Hier dominiert der Kondensator: $X \\gg R$.');
    const domHi = rl ? L('Here the coil dominates: $X \\gg R$.', 'Hier dominiert die Spule: $X \\gg R$.') : L('Here the resistor dominates: $X \\ll R$.', 'Hier dominiert der Widerstand: $X \\ll R$.');
    steps.push({ ...an.steps[0], text: `${an.steps[0].text} ${domLo}` });
    steps.push({ ...an.steps[1], text: `${an.steps[1].text} ${domHi}` });
    // one point off the curve
    const sq = `X = \\sqrt{Z^2 - R^2} = \\sqrt{(${T(z, 'ohm')})^2 - (${Rt})^2} = ${T(X, 'ohm')}`;
    const Rfrom = rl ? L('from the start of the curve', 'vom Anfang der Kurve') : L('from where the curve levels off', 'von dort, wo die Kurve flach wird');
    let text = L(`Read one point: at $\\omega = ${T(w1, 'w')}$ the curve shows $Z = ${T(z, 'ohm')}$. With $R = ${Rt}$ ${Rfrom}, the triangle gives the reactance $$${sq}$$`,
      `Lies einen Punkt ab: Bei $\\omega = ${T(w1, 'w')}$ zeigt die Kurve $Z = ${T(z, 'ohm')}$. Mit $R = ${Rt}$ ${Rfrom} liefert das Dreieck den Blindwiderstand $$${sq}$$`);
    if (rl) {
      text += L(`and from $X = \\omega L$: $$L = \\frac{X}{\\omega} = \\frac{${T(X, 'ohm')}}{${T(w1, 'w')}} = ${T(value, 'H')}$$ The same as the slope for large $\\omega$, but from a single point.`,
        `und aus $X = \\omega L$: $$L = \\frac{X}{\\omega} = \\frac{${T(X, 'ohm')}}{${T(w1, 'w')}} = ${T(value, 'H')}$$ Dasselbe wie die Steigung für grosses $\\omega$, aber aus einem einzigen Punkt.`);
    } else {
      text += L(`and from $X = \\frac{1}{\\omega C}$: $$C = \\frac{1}{\\omega X} = \\frac{1}{${T(w1, 'w')} \\cdot ${T(X, 'ohm')}} = ${T(value, 'F')}$$ Squaring gives a straight line in $\\omega^{-2}$: $Z^2 = R^2 + \\frac{1}{C^2}\\,\\omega^{-2}$. Plotted against $\\omega^{-2}$ (here $\\omega^{-2} = ${T(1 / (w1 * w1), 's2')}$), $Z^2$ is a straight line with the intercept $R^2$ and the slope $1/C^2$; that is why the probe in practice also shows $\\omega^{-2}$.`,
        `und aus $X = \\frac{1}{\\omega C}$: $$C = \\frac{1}{\\omega X} = \\frac{1}{${T(w1, 'w')} \\cdot ${T(X, 'ohm')}} = ${T(value, 'F')}$$ Quadriert ergibt das eine Gerade in $\\omega^{-2}$: $Z^2 = R^2 + \\frac{1}{C^2}\\,\\omega^{-2}$. Gegen $\\omega^{-2}$ aufgetragen (hier $\\omega^{-2} = ${T(1 / (w1 * w1), 's2')}$) ist $Z^2$ eine Gerade mit dem Achsenabschnitt $R^2$ und der Steigung $1/C^2$; darum zeigt die Sonde beim Üben auch $\\omega^{-2}$.`);
    }
    steps.push({ title: L('Reading a point off the curve', 'Einen Punkt ablesen'), ann: [hl(R, 'R'), vl(w1, ''), readPt], tri: numeric, text });
    // the corner: X = R
    steps.push(an.steps[2]);
    // the mistakes
    const sum = R + X;
    steps.push({ title: L('Not R + X', 'Nicht R + X'), ann: [fn((w) => R + Xof(w), `R + ${Xh} ✗`), readPt, pt(w1, sum, `R + X = ${H(sum, 'ohm')}`)], tri: numeric,
      text: L(`A frequent mistake is to add $R$ and $X$ like numbers. At $\\omega = ${T(w1, 'w')}$ that would give $R + X = ${T(R, 'ohm')} + ${T(X, 'ohm')} = ${T(sum, 'ohm')}$ (dashed curve), but the curve shows $Z = ${T(z, 'ohm')}$. Since the two voltages peak at different times, they add like the sides of a right triangle: $Z$ is less than $R + X$ and more than $R$ or $X$ alone. Don't swap the ends either: in a series ${rl ? 'RL' : 'RC'} circuit ${rl ? 'the resistor dominates for small $\\omega$ ($Z \\to R$) and the coil for large $\\omega$ ($Z \\approx \\omega L$, rising without bound)' : 'the capacitor dominates for small $\\omega$ ($Z \\approx \\frac{1}{\\omega C} \\to \\infty$) and the resistor for large $\\omega$ ($Z \\to R$)'}; in a series ${rl ? 'RC' : 'RL'} circuit it is the other way round.`,
        `Ein häufiger Fehler ist, $R$ und $X$ wie Zahlen zu addieren. Bei $\\omega = ${T(w1, 'w')}$ gäbe das $R + X = ${T(R, 'ohm')} + ${T(X, 'ohm')} = ${T(sum, 'ohm')}$ (gestrichelte Kurve), aber die Kurve zeigt $Z = ${T(z, 'ohm')}$. Weil die beiden Spannungen zu verschiedenen Zeiten am grössten sind, addieren sie sich wie die Seiten eines rechtwinkligen Dreiecks: $Z$ ist kleiner als $R + X$ und grösser als $R$ oder $X$ allein. Vertausche auch die Enden nicht: In einer ${rl ? 'RL' : 'RC'}-Serieschaltung dominiert ${rl ? 'für kleines $\\omega$ der Widerstand ($Z \\to R$) und für grosses $\\omega$ die Spule ($Z \\approx \\omega L$, wächst über alle Grenzen)' : 'für kleines $\\omega$ der Kondensator ($Z \\approx \\frac{1}{\\omega C} \\to \\infty$) und für grosses $\\omega$ der Widerstand ($Z \\to R$)'}; in einer ${rl ? 'RC' : 'RL'}-Serieschaltung ist es umgekehrt.`) });
    steps.push({ title: L('In short', 'Kurz'), ann: [...an.steps.flatMap((s) => s.ann), readPt], tri: symbolic,
      text: L(`$Z = \\sqrt{R^2 + X^2}$ with $X = ${Xt}$. ${rl ? 'The curve starts at $R$ and approaches the straight line $\\omega L$' : 'The curve comes down from infinity like $\\frac{1}{\\omega C}$ and levels off at $R$'}; at the corner $\\omega = ${rl ? 'R/L' : '1/(RC)'} \\approx ${T(wf, 'w')}$ it is $\\sqrt{2}\\,R$. $R$ comes from the end where ${theEl} does not count; then any point $(\\omega, Z)$ gives $X = \\sqrt{Z^2 - R^2}$ and from it ${rl ? '$L = X/\\omega$' : '$C = 1/(\\omega X)$'}.`,
        `$Z = \\sqrt{R^2 + X^2}$ mit $X = ${Xt}$. ${rl ? 'Die Kurve beginnt bei $R$ und nähert sich der Geraden $\\omega L$' : 'Die Kurve kommt wie $\\frac{1}{\\omega C}$ von unendlich herunter und nähert sich $R$'}; bei der Grenzfrequenz $\\omega = ${rl ? 'R/L' : '1/(RC)'} \\approx ${T(wf, 'w')}$ ist sie $\\sqrt{2}\\,R$. $R$ folgt aus dem Ende, an dem ${theEl} nicht zählt; dann liefert jeder Punkt $(\\omega, Z)$ den Blindwiderstand $X = \\sqrt{Z^2 - R^2}$ und daraus ${rl ? '$L = X/\\omega$' : '$C = 1/(\\omega X)$'}.`) });
    return { steps, read: { w: w1, z, X, value } };
  }

  // ---------------------------------------------------------------- answer options
  // Each unknown is chosen from OPTIONS values: the right one and wrong ones that follow from typical
  // mistakes, each with the explanation shown when it is picked. Wrong values have two significant
  // digits like the component values, and all options differ by at least the factor GAP, far more
  // than a careful reading of the graph is off (TOL).
  const OPTIONS = 4, GAP = 1.2;
  const UNIT = { R: 'ohm', L: 'H', C: 'F' };
  const SQ2 = Math.SQRT2, TWO_PI = 2 * Math.PI;

  // Where a student might take the tangent before Z ≈ ωL holds: at the corner of an RL circuit, at
  // half the resonance frequency of an RLC circuit (for series RLC on the falling branch).
  const early = (c) => (c.kind === 'RLC' ? feature(c) / 2 : feature(c));
  function earlyWhy(c) {
    const at = L(`the tangent at ω = ${H(early(c), 'w')}`, `der Tangente bei ω = ${H(early(c), 'w')}`);
    return c.kind === 'RLC' && c.conn === 'series' ? L(`${at}, on the falling branch where the capacitor dominates`, `${at}, auf dem fallenden Ast, wo der Kondensator dominiert`)
      : L(`${at}, where the curve is not straight yet`, `${at}, wo die Kurve noch nicht gerade ist`);
  }

  // Wrong values for unknown key, most telling first: [{ tag, value, why }].
  function mistakes(c, ax, an, key) {
    const { R, L: Li, C } = c, wf = feature(c), wmax = ax.lin.wmax;
    const series = c.conn === 'series', rlc = c.kind === 'RLC';
    const from = L(`${key} comes from ${an.plan[key]}.`, `${key} folgt aus ${an.plan[key]}.`);
    const out = [];
    const add = (tag, value, why) => out.push({ tag, value, why });

    if (key === 'R') {
      if (rlc) {
        add('reactance', wf * Li, L(`That is the reactance ω₀L of the coil at resonance. There the ${series ? 'reactances' : 'currents'} of coil and capacitor cancel, so Z<sub>${series ? 'min' : 'max'}</sub> = R.`,
          `Das ist der Blindwiderstand ω₀L der Spule bei der Resonanz. Dort heben sich die ${series ? 'Blindwiderstände' : 'Ströme'} von Spule und Kondensator auf, also ist Z<sub>${series ? 'min' : 'max'}</sub> = R.`));
        add('sqrt2', series ? SQ2 * R : R / SQ2, L(`Z = ${series ? '√2·R' : 'R/√2'} where the net reactance equals R, on either side of the resonance. ${from}`,
          `Z = ${series ? '√2·R' : 'R/√2'} gilt dort, wo der gesamte Blindwiderstand gleich R ist, links und rechts der Resonanz. ${from}`));
      } else {
        add('corner', series ? SQ2 * R : R / SQ2, L(`That is Z at the corner frequency, where the reactance equals R: Z = ${series ? '√2·R' : 'R/√2'}. ${from}`,
          `Das ist Z bei der Grenzfrequenz, wo der Blindwiderstand gleich R ist: Z = ${series ? '√2·R' : 'R/√2'}. ${from}`));
      }
      if (series && c.kind !== 'RC') add('end', Z(c, wmax), L(`That is Z at the right end of the graph, where the coil dominates. ${from}`, `Das ist Z am rechten Rand des Graphen, wo die Spule dominiert. ${from}`));
      if (!series && c.kind === 'RC') add('end', Z(c, wmax), L(`That is Z at the right end of the graph, where the capacitor already takes most of the current. ${from}`, `Das ist Z am rechten Rand des Graphen, wo der Kondensator schon den grössten Teil des Stroms nimmt. ${from}`));
      if (!series) add('half', 2 * R, c.kind === 'RLC'
        ? L('At resonance coil and capacitor together carry no net current, so the resistor is on its own: Z<sub>max</sub> = R, not R/2.', 'Bei der Resonanz führen Spule und Kondensator zusammen keinen Strom, der Widerstand ist also allein: Z<sub>max</sub> = R, nicht R/2.')
        : L(`Nothing halves R here: where the graph ${c.kind === 'RL' ? 'levels off' : 'starts'}, the ${c.kind === 'RL' ? 'coil' : 'capacitor'} carries no current, so the resistor is on its own.`,
          `Hier halbiert nichts R: Wo der Graph ${c.kind === 'RL' ? 'flach wird' : 'beginnt'}, führt ${c.kind === 'RL' ? 'die Spule' : 'der Kondensator'} keinen Strom, der Widerstand ist also allein.`));
      if (!rlc) add('side', series ? R / SQ2 : SQ2 * R, series
        ? L(`In series Z = √(R² + X²) is never smaller than R. ${from}`, `In Serie ist Z = √(R² + X²) nie kleiner als R. ${from}`)
        : L(`In parallel a second branch only lets more current through, so Z is never larger than R. ${from}`, `Parallel lässt ein zweiter Zweig nur mehr Strom durch, also ist Z nie grösser als R. ${from}`));
    }

    if (key === 'L') {
      const where = rlc ? L('the resonance', 'der Resonanz') : L('the corner', 'der Grenzfrequenz');
      add('secant', Z(c, wf) / wf, L(`That is Z/ω at ${where}, ω = ${H(wf, 'w')}: the slope of the line from the origin to the curve, not of the tangent. Z ≈ ωL only holds for ${series ? 'large' : 'small'} ω. ${from}`,
        `Das ist Z/ω bei ${where}, ω = ${H(wf, 'w')}: die Steigung der Geraden vom Ursprung zur Kurve, nicht die der Tangente. Z ≈ ωL gilt nur für ${series ? 'grosses' : 'kleines'} ω. ${from}`));
      const wt = early(c);
      add('tangent', Math.abs(dZ(c, wt)), L(`That is the steepness of ${earlyWhy(c)}. ${from}`, `Das ist die Steigung ${earlyWhy(c)}. ${from}`));
      if (series && c.kind === 'RL') add('chord', (Z(c, wmax) - R) / wmax, L(`That is the slope of the line from the start of the graph to its right end. The curve only becomes straight for large ω. ${from}`,
        `Das ist die Steigung der Geraden vom Anfang des Graphen zu seinem rechten Rand. Die Kurve wird erst für grosses ω gerade. ${from}`));
      const no2pi = L('The 2π is not needed: ω is already the angular frequency in rad/s, so a slope of 1 Ω·s is 1 H.', 'Das 2π braucht es nicht: ω ist schon die Kreisfrequenz in rad/s, eine Steigung von 1 Ω·s ist also 1 H.');
      add('2pi', Li / TWO_PI, no2pi);
      add('2pi', Li * TWO_PI, no2pi);
      add('inverse', 1 / Li, L('That is the inverse of the slope, Δω/ΔZ. The slope of the tangent is ΔZ/Δω, in Ω·s = H.', 'Das ist der Kehrwert der Steigung, Δω/ΔZ. Die Steigung der Tangente ist ΔZ/Δω, in Ω·s = H.'));
      const prefixL = L('Off by a factor 1000: a slope of 1 Ω·s is 1 H = 1000 mH.', 'Um den Faktor 1000 daneben: Eine Steigung von 1 Ω·s ist 1 H = 1000 mH.');
      add('prefix', Li * 1000, prefixL);
      add('prefix', Li / 1000, prefixL);
    }

    if (key === 'C' && !rlc) {
      add('corner-z', series ? C / SQ2 : SQ2 * C, L(`In C = 1/(ω<sub>c</sub>R) use the resistance R, not the impedance ${series ? '√2·R' : 'R/√2'} at the corner.`,
        `In C = 1/(ω<sub>c</sub>R) gehört der Widerstand R, nicht die Impedanz ${series ? '√2·R' : 'R/√2'} bei der Grenzfrequenz.`));
      add('half', series ? Math.sqrt(3) * C : C / Math.sqrt(3), L(`That uses the frequency where Z = ${series ? '2R' : 'R/2'}. The corner frequency ω<sub>c</sub> is where Z = ${series ? '√2·R' : 'R/√2'}.`,
        `Das verwendet die Frequenz, bei der Z = ${series ? '2R' : 'R/2'} ist. Die Grenzfrequenz ω<sub>c</sub> ist dort, wo Z = ${series ? '√2·R' : 'R/√2'} ist.`));
      const no2pi = L('The 2π is not needed: ω<sub>c</sub> is already an angular frequency, and C = 1/(ω<sub>c</sub>R).', 'Das 2π braucht es nicht: ω<sub>c</sub> ist schon eine Kreisfrequenz, und C = 1/(ω<sub>c</sub>R).');
      add('2pi', C / TWO_PI, no2pi);
      add('2pi', C * TWO_PI, no2pi);
    }
    if (key === 'C' && rlc) {
      const wt = early(c), fromL = L(`L comes from ${an.plan.L}; then C = 1/(ω₀²L).`, `L folgt aus ${an.plan.L}; dann ist C = 1/(ω₀²L).`);
      add('secant', 1 / (wf * R), L(`That uses L = Z/ω at the resonance instead of the slope of the tangent. ${fromL}`, `Das verwendet L = Z/ω bei der Resonanz statt der Steigung der Tangente. ${fromL}`));
      add('tangent', 1 / (wf * wf * Math.abs(dZ(c, wt))), L(`That uses L from the steepness of ${earlyWhy(c)}. ${fromL}`, `Das verwendet L aus der Steigung ${earlyWhy(c)}. ${fromL}`));
      const no2pi = L('The 2π is not needed: ω₀ is already the angular frequency, so C = 1/(ω₀²L).', 'Das 2π braucht es nicht: ω₀ ist schon die Kreisfrequenz, also C = 1/(ω₀²L).');
      add('2pi', C / (TWO_PI * TWO_PI), no2pi);
      add('2pi', C * TWO_PI * TWO_PI, no2pi);
      add('square', 1 / (wf * Li), L('C = 1/(ω₀L) misses the square: ω₀ = 1/√(LC) gives C = 1/(ω₀²L).', 'Bei C = 1/(ω₀L) fehlt das Quadrat: Aus ω₀ = 1/√(LC) folgt C = 1/(ω₀²L).'));
    }
    if (key === 'C') {
      const prefixC = L('Off by a factor 1000: check the unit prefix (1 µF = 1000 nF).', 'Um den Faktor 1000 daneben: Prüfe die Vorsilbe der Einheit (1 µF = 1000 nF).');
      add('prefix', C * 1000, prefixC);
      add('prefix', C / 1000, prefixC);
    }
    for (const k of [2, 0.5, 3, 1 / 3, 5, 0.2]) add('other', c[key] * k, `${L('Not correct.', 'Nicht richtig.')} ${from}`);
    return out;
  }

  // The options for unknown key, in increasing order: [{ value, label, ok, tag, why }].
  function choices(c, ax, an, key) {
    const opts = [{ value: c[key], ok: true, tag: 'ok' }];
    const apart = (x) => opts.every((o) => Math.abs(Math.log(x / o.value)) >= Math.log(GAP) * (1 - 1e-9));
    for (const m of mistakes(c, ax, an, key)) {
      if (opts.length === OPTIONS) break;
      const x = Number(m.value.toPrecision(2));
      if (Number.isFinite(x) && x > 0 && apart(x)) opts.push({ value: x, ok: false, tag: m.tag, why: m.why });
    }
    return opts.sort((a, b) => a.value - b.value).map((o) => ({ ...o, label: H(o.value, UNIT[key], 2) }));
  }

  function exercise(c, id) {
    const ax = axesFor(c), an = analysis(c, ax);
    const fields = UNKNOWNS[c.kind].map((k) => ({ key: k, options: choices(c, ax, an, k) }));
    return { id, c, ax, an, fields, difficulty: DIFFICULTY[`${c.conn} ${c.kind}`] };
  }

  function build(r, kind, conn) {
    const c = { kind, conn, R: r.pick(R_VALUES), L: kind === 'RC' ? null : r.pick(L_VALUES), C: kind === 'RL' ? null : r.pick(C_VALUES) };
    return usable(c, axesFor(c)) ? c : null;
  }

  // level: easy, medium, hard or mixed (see LEVELS), or a kind of circuit such as 'series RL'.
  function generate(level, seed) {
    const r = rng(seed);
    // the kind of circuit first, so that every kind comes up equally often
    const [conn, kind] = (LEVELS[level] ? r.pick(LEVELS[level].kinds) : level).split(' ');
    for (let k = 0; k < 100000; k++) {
      const c = build(r, kind, conn);
      if (c) return exercise(c, `${level}-${seed}`);
    }
    throw new Error(`no exercise for ${level}-${seed}`);
  }

  const api = {
    rng, TOL, GAP, OPTIONS, LEVELS, DIFFICULTY, UNKNOWNS, Z, dZ, feature, quality, axesFor, usable, analysis, pairAnalysis, shape, mistakes, choices, exercise, generate,
    q, H, T, digits, sup, p3, niceUp,
  };
  root.Impedance = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
