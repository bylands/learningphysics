// Random switching RL circuits: find the currents immediately after a switch is closed or opened.
//
// A circuit is a battery (voltage V, + at the top) and a main line along the top wire with an
// optional resistor R1, followed by a group of parallel branches between a top and a bottom
// rail. A branch is a resistor, an inductor, or both in series. The switch S sits in the main
// line, in a branch without an inductor, or across R1 (closed, it bridges R1).
//
// Before t = 0 the switch has been in its first state for a long time: the currents are
// constant, so no emf is induced and the inductors act like wires. At t = 0 the switch
// changes. The current through an inductor cannot jump, so immediately afterwards every
// inductor keeps its current (it acts like a current source), and the other currents follow
// from Kirchhoff's rules. With U the voltage across the branches (top rail − bottom rail):
//   junction rule   I = Σ I_L + Σ U/R_k    (branches without an inductor that are closed)
//   loop rule       V = r·I + U            (main line closed; r = R1, or 0 if R1 is bridged)
// Currents count along the arrows in the diagram: to the right through R1, down through the
// branches, so a current flowing the other way is negative. V_L is the voltage across an
// inductor in the direction of its arrow, V_L = L·ΔI/Δt; the self-induced emf of the coil is
// 𝓔_i = −L·ΔI/Δt = −V_L. Values are exact fractions
// (V, Ω, A); V is chosen so that every value in the solution is a multiple of 0.1.
(function (root) {
  'use strict';

  const Circuit = root.Circuit || require('./circuit.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  // decimals: a point in both languages
  const comma = (s) => s;
  const M = String.raw;
  const RS = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 400, 500]; // Ω
  const LS = [0.1, 0.2, 0.5, 1, 2];              // H: irrelevant right after switching
  const VS = [3, 4.5, 6, 9, 12, 15, 18, 24, 30, 36, 48]; // V
  const LEVELS = { easy: { name: () => L('Easy', 'Einfach') }, medium: { name: () => L('Medium', 'Mittel') }, hard: { name: () => L('Hard', 'Schwierig') }, mixed: { name: () => L('Mixed', 'Gemischt') } };

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
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    return {
      next, int,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    };
  }

  // ---------------------------------------------------------------- exact fractions
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  function F(n, d = 1) {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    return { n: n / g + 0, d: d / g };
  }
  const ZERO = F(0), ONE = F(1), MA = F(1000); // currents are shown in mA
  const fadd = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const fsub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => F(a.n * b.n, a.d * b.d);
  const fdiv = (a, b) => F(a.n * b.d, a.d * b.n);
  const fneg = (a) => F(-a.n, a.d);
  const fabs = (a) => F(Math.abs(a.n), a.d);
  const fval = (f) => f.n / f.d;
  const isZero = (f) => f.n === 0;
  const feq = (a, b) => a.n === b.n && a.d === b.d;

  function fmt(x) {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    return String(parseFloat(x.toFixed(2)));
  }
  // Decimal if it terminates within two places, otherwise a fraction (LaTeX).
  const ftex = (f) => (f.d === 1 || 100 % f.d === 0 ? comma(fmt(fval(f)), true) : `${f.n < 0 ? '-' : ''}\\tfrac{${Math.abs(f.n)}}{${f.d}}`);
  // The same as plain text (diagram labels): 2/3 instead of \tfrac.
  const ftxt = (f) => (f.d === 1 || 100 % f.d === 0 ? comma(fmt(fval(f))) : `${f.n}/${f.d}`).replace('-', '−');

  // ---------------------------------------------------------------- the physics
  // c = { r1: F | null, branches: [{ R: F | null, L: bool, H: henry, sw: bool }],
  //       sw: { at: 'main' | 'branch' | 'bridge', j: branch, before: 'open' | 'closed' }, V: F }
  function config(c, closed) {
    const main = !(c.sw.at === 'main' && !closed);
    const bridged = c.sw.at === 'bridge' && closed;
    const r = c.r1 && !bridged ? c.r1 : ZERO;
    const active = c.branches.map((b, j) => !(c.sw.at === 'branch' && c.sw.j === j && !closed));
    return { main, bridged, r, active };
  }

  // Long after the switch was set (inductors act like wires): { I, U, Ib, IR1 }, or null if the
  // battery would be shorted or two inductors would share a current in an undefined way.
  function steady(c, closed) {
    const { main, bridged, r, active } = config(c, closed), V = c.V, n = c.branches.length;
    const zeros = { I: ZERO, U: ZERO, Ib: new Array(n).fill(ZERO), IR1: ZERO };
    if (!main) return zeros;
    const on = c.branches.map((b, j) => j).filter((j) => active[j]);
    const wires = on.filter((j) => c.branches[j].L && !c.branches[j].R);
    if (wires.length > 1) return null;
    if (wires.length === 1) {
      if (isZero(r)) return null;
      const I = fdiv(V, r), Ib = zeros.Ib.slice();
      Ib[wires[0]] = I;
      return { I, U: ZERO, Ib, IR1: bridged ? ZERO : I };
    }
    if (!on.length) return zeros;
    const G = on.reduce((s, j) => fadd(s, fdiv(ONE, c.branches[j].R)), ZERO);
    const U = isZero(r) ? V : fdiv(V, fadd(ONE, fmul(r, G))); // V = r·I + U with I = U·G
    const I = fmul(U, G);
    return { I, U, Ib: c.branches.map((b, j) => (active[j] ? fdiv(U, b.R) : ZERO)), IR1: bridged ? ZERO : I, G };
  }

  // Immediately after the switch was set, with the inductor currents IL (per branch, zero where
  // there is no inductor): { I, U, Ib, VL, IR1 }, or null if an inductor current has no path.
  function after(c, closed, IL) {
    const { main, bridged, r, active } = config(c, closed), V = c.V;
    const sumIL = IL.reduce(fadd, ZERO);
    const res = c.branches.map((b, j) => j).filter((j) => active[j] && !c.branches[j].L);
    const G = res.reduce((s, j) => fadd(s, fdiv(ONE, c.branches[j].R)), ZERO);
    let U;
    if (main && !isZero(r)) U = fdiv(fsub(V, fmul(r, sumIL)), fadd(ONE, fmul(r, G)));
    else if (main) U = V;
    else if (isZero(G)) return null;
    else U = fdiv(fneg(sumIL), G);
    const Ib = c.branches.map((b, j) => (b.L ? IL[j] : active[j] ? fdiv(U, b.R) : ZERO));
    const I = main ? Ib.reduce(fadd, ZERO) : ZERO;
    const VL = c.branches.map((b, j) => (b.L ? fsub(U, b.R ? fmul(b.R, IL[j]) : ZERO) : null));
    return { I, U, Ib, VL, IR1: bridged ? ZERO : I, sumIL, G, main, r, bridged, res };
  }

  // ---------------------------------------------------------------- names
  // Resistors R1, R2, … in reading order (main line first), inductors L (or L1, L2, …).
  function namer(c) {
    let k = 0, m = 0;
    const nL = c.branches.filter((b) => b.L).length;
    const r1 = c.r1 ? ++k : null;
    const br = c.branches.map((b) => ({ R: b.R ? ++k : null, L: b.L ? (nL > 1 ? ++m : 0) : null }));
    const Lname = (m) => (m ? `L_{${m}}` : 'L');
    const Lsub = (m) => (m ? `L${m}` : 'L');
    return {
      r1, br,
      R: (k) => `R_{${k}}`,
      L: (j) => Lname(br[j].L),
      // current through branch j: named after its resistor, or its inductor
      Ib: (j) => (br[j].R ? `I_{${br[j].R}}` : `I_{${Lsub(br[j].L)}}`),
      IL: (j) => `I_{${Lsub(br[j].L)}}`,
      VL: (j) => L(`V_{${Lsub(br[j].L)}}`, `U_{${Lsub(br[j].L)}}`),
      EMFsvg: (j) => (br[j].L ? L(`ℰ_{i,${br[j].L}}`, `U_{ind,${br[j].L}}`) : L('ℰ_{i}', 'U_{ind}')),
      EMF: (j) => (br[j].L ? L(`\\mathcal{E}_{\\mathrm{i},${br[j].L}}`, `U_{\\mathrm{ind},${br[j].L}}`) : L('\\mathcal{E}_\\mathrm{i}', 'U_\\mathrm{ind}')),
      IR1: () => `I_{${r1}}`,
      main: () => (r1 ? `I_{${r1}}` : 'I'),
    };
  }

  // ---------------------------------------------------------------- random circuits
  const branch = (r, R, L) => ({ R: R ? F(r.pick(RS)) : null, L, H: L ? r.pick(LS) : null, sw: false });

  // Mostly, a current already flows through the inductors before t = 0: a switch in the main
  // line is usually opened after a long time closed, and switches in a branch or across R1
  // change a circuit that is already on. Closing the main switch from rest (all inductor
  // currents zero) is the exception, with the share FROM_REST.
  const FROM_REST = 0.1;
  const mainBefore = (r) => (r.next() < FROM_REST ? 'open' : 'closed');

  function randomCircuit(level, r) {
    if (level === 'easy') {
      const before = mainBefore(r);
      // a single RL loop cannot be opened: the inductor current would have no path
      const shape = r.pick(before === 'open' ? ['loop', 'RL', 'RRL', 'noR1'] : ['RL', 'RRL', 'RRL', 'noR1']);
      const b = {
        loop: () => [branch(r, false, true)],
        RL: () => [branch(r, true, false), branch(r, false, true)],
        RRL: () => [branch(r, true, true), branch(r, true, false)],
        noR1: () => [branch(r, true, false), branch(r, true, true)],
      }[shape]();
      return { r1: shape === 'noR1' ? null : F(r.pick(RS)), branches: r.shuffle(b), sw: { at: 'main', before } };
    }
    if (level === 'medium') {
      const b = r.shuffle([branch(r, r.next() < 0.6, true), branch(r, true, false)]);
      const c = { r1: r.next() < 0.75 ? F(r.pick(RS)) : null, branches: b, sw: { at: 'main', before: mainBefore(r) } };
      if (r.next() < 0.3) { // a switch in the resistor branch, opened or closed
        c.sw = { at: 'branch', j: b.findIndex((x) => !x.L), before: r.pick(['open', 'closed']) };
        b[c.sw.j].sw = true;
      }
      return c;
    }
    const n = r.int(2, 3), nL = n === 3 && r.next() < 0.5 ? 2 : 1;
    const b = [];
    for (let j = 0; j < n; j++) b.push(j < nL ? branch(r, j > 0 || r.next() < 0.6, true) : branch(r, true, false));
    r.shuffle(b);
    const c = { r1: r.next() < 0.85 ? F(r.pick(RS)) : null, branches: b, sw: { at: 'main', before: mainBefore(r) } };
    const at = r.pick(['main', 'branch', 'branch', 'bridge', 'bridge']);
    const plain = b.map((x, j) => j).filter((j) => !b[j].L);
    const before = r.pick(['open', 'closed']);
    if (at === 'branch' && plain.length) { c.sw = { at, j: r.pick(plain), before }; b[c.sw.j].sw = true; }
    if (at === 'bridge' && c.r1) c.sw = { at, before };
    return c;
  }

  // ---------------------------------------------------------------- exercises
  // Everything about circuit c (with its voltage set): the states and the answers, or null if
  // the circuit is not usable (a short, or an inductor current without a path).
  function solve(c) {
    const first = c.sw.before === 'closed', then = !first;
    const s0 = steady(c, first), s2 = steady(c, then);
    if (!s0 || !s2) return null;
    const IL = c.branches.map((b, j) => (b.L ? s0.Ib[j] : ZERO));
    const s1 = after(c, then, IL);
    if (!s1) return null;
    return { s0, s1, s2, IL, first, then };
  }

  // The quantities asked for, in reading order: the currents right after switching through
  // the resistors and through inductors without a resistor (in mA, signed along the arrows),
  // then the size of the emf induced in each coil, |𝓔_i| = |V_L|.
  function targets(c, nm, st) {
    const out = [];
    if (c.r1) out.push({ key: 'IR1', sym: nm.IR1(), unit: 'mA', value: fmul(st.s1.IR1, MA) });
    c.branches.forEach((b, j) => out.push({ key: `I${j}`, sym: nm.Ib(j), unit: 'mA', value: fmul(st.s1.Ib[j], MA), j }));
    c.branches.forEach((b, j) => { if (b.L) out.push({ key: `E${j}`, sym: `|${nm.EMF(j)}|`, unit: 'V', value: fabs(st.s1.VL[j]), j, abs: true }); });
    return out;
  }

  // Values of the targets under the typical wrong ideas, for feedback: the inductor acts like a
  // wire at once (wire), its current drops to zero (zero), or nothing changes (same).
  function models(c, st, list) {
    const zero = after(c, st.then, c.branches.map(() => ZERO));
    const pick = (s, t) => {
      if (!s) return null;
      if (t.key === 'IR1') return fmul(s.IR1, MA);
      if (t.key[0] === 'I') return fmul(s.Ib[t.j], MA);
      return s.VL ? fabs(s.VL[t.j]) : ZERO; // an inductor acting like a wire has no emf
    };
    return list.map((t) => ({ wire: pick(st.s2, t), zero: pick(zero, t), same: pick(st.s0, t) }));
  }

  // Choose V (from VS) so that every current is a whole number of mA and every voltage a
  // multiple of 0.1 V; all values are proportional to V. Voltages given in tenths (4.5 V) count
  // as 45 tenths.
  function withVoltage(c, r) {
    c.V = ONE;
    const st = solve(c);
    if (!st) return null;
    const amps = [st.s0.I, ...st.s0.Ib, st.s1.I, ...st.s1.Ib, st.s2.I, ...st.s2.Ib];
    const volts = [st.s0.U, st.s1.U, ...st.s1.VL.filter(Boolean)];
    const ok = (V) => amps.every((a) => (a.n * V * 100) % a.d === 0) && volts.every((v) => (v.n * V) % v.d === 0);
    const choices = VS.filter((V) => ok(Math.round(V * 10)));
    if (!choices.length) return null;
    c.V = F(Math.round(r.pick(choices) * 10), 10);
    return solve(c);
  }

  function usable(c, st, level) {
    const all = [...st.s1.Ib, st.s1.I, ...st.s0.Ib, st.s0.I].map(fval);
    if (all.some((x) => Math.abs(x) > 1 || (x !== 0 && Math.abs(x) < 0.002 - 1e-12))) return false;
    if (st.s1.VL.some((v) => v && Math.abs(fval(v)) > 200)) return false;
    if (level === 'easy') return true;
    // The inductor matters: right after switching, some current has changed (so “nothing
    // changes” is wrong) and some current is not yet at its final value (so “the inductor acts
    // like a wire at once” is wrong).
    const cur = (s) => [s.IR1, ...s.Ib].map(fval);
    const a = cur(st.s0), b = cur(st.s1), z = cur(st.s2);
    return b.some((x, k) => Math.abs(x - a[k]) > 1e-9) && b.some((x, k) => Math.abs(x - z[k]) > 1e-9);
  }

  function build(level, seed) {
    const r = rng(seed);
    for (let attempt = 0; attempt < 5000; attempt++) {
      const c = randomCircuit(level, r);
      const st = withVoltage(c, r);
      if (!st || !usable(c, st, level)) continue;
      // No inductor current before t = 0 by accident (e.g. an inductor bridged by another):
      // only now and then. (Closing the main switch from rest was chosen on purpose.)
      const fromRest = c.sw.at === 'main' && c.sw.before === 'open';
      if (st.IL.every(isZero) && !fromRest && r.next() > FROM_REST) continue;
      return { c, st };
    }
    throw new Error(`No ${level} exercise found for seed ${seed}`);
  }

  // ---------------------------------------------------------------- text
  // English or German (lang.js), with the symbols of each language's textbooks: the battery
  // voltage V / U₀, the voltage across a coil V_L / U_L, the induced emf 𝓔_i / induzierte
  // Spannung U_ind. U is the voltage across the branches in both.
  // A value with its unit; currents (u = 'A', given in A) are shown in mA.
  const UNIT_TEX = { A: M`\mathrm{mA}`, mA: M`\mathrm{mA}`, V: M`\mathrm{V}`, O: M`\Omega` };
  const q = (f, u) => `${ftex(u === 'A' ? fmul(f, MA) : f)}\\,${UNIT_TEX[u]}`;
  const listing = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${L('and', 'und')} ${items[items.length - 1]}`);
  const al = (...lines) => M`$$\begin{aligned}` + lines.join(M` \\ `) + M`\end{aligned}$$`;
  const verb = (closed) => (closed ? L('closed', 'geschlossen') : L('opened', 'geöffnet'));
  const state = (closed) => (closed ? L('closed', 'geschlossen') : L('open', 'offen'));
  const VB = () => L('V', 'U_0'); // the battery voltage
  const EMF = () => L(M`\mathcal{E}_\mathrm{i}`, M`U_\mathrm{ind}`);
  const pl = (n, one, many) => (n > 1 ? many : one);

  function where(c, nm) {
    if (c.sw.at === 'main') return L('in the main line', 'in der Hauptleitung');
    if (c.sw.at === 'bridge') return L(`across $${nm.R(nm.r1)}$`, `parallel zu $${nm.R(nm.r1)}$`);
    return L(`in the branch of $${nm.R(nm.br[c.sw.j].R)}$`, `im Zweig von $${nm.R(nm.br[c.sw.j].R)}$`);
  }

  // The situation, without the question: what the switch does, and the arrows.
  function situation(c, nm) {
    const first = c.sw.before === 'closed';
    return L(`The switch S ${where(c, nm)} has been ${state(first)} for a long time. At $t = 0$ it is ${verb(!first)}. The arrows show the positive direction of the currents.`,
      `Der Schalter S ${where(c, nm)} ist seit langer Zeit ${state(first)}. Zur Zeit $t = 0$ wird er ${verb(!first)}. Die Pfeile zeigen die positive Richtung der Ströme.`);
  }

  function taskText(c, nm, list) {
    const first = c.sw.before === 'closed';
    const cur = list.filter((t) => t.unit === 'mA').map((t) => `$${t.sym}$`);
    const emf = list.filter((t) => t.unit === 'V').map((t) => `$${t.sym.replace(/\|/g, '')}$`);
    return L(`The switch S ${where(c, nm)} has been ${state(first)} for a long time. At $t = 0$ it is ${verb(!first)}. ` +
      `Find the currents ${listing(cur)} and the size of the emf ${listing(emf)} induced in the inductor${emf.length > 1 ? 's' : ''} immediately after the switch is ${verb(!first)}. ` +
      'The arrows show the positive direction of the currents.',
    `Der Schalter S ${where(c, nm)} ist seit langer Zeit ${state(first)}. Zur Zeit $t = 0$ wird er ${verb(!first)}. ` +
      `Bestimme die Ströme ${listing(cur)} und den Betrag der in ${pl(emf.length, 'der Spule', 'den Spulen')} induzierten Spannung ${listing(emf)} unmittelbar nachdem der Schalter ${verb(!first)} wurde. ` +
      'Die Pfeile zeigen die positive Richtung der Ströme.');
  }

  // Before t = 0: the steady currents, in particular the inductor currents.
  function beforeText(c, nm, st) {
    const { main, r, active, bridged } = config(c, st.first), s = st.s0, V = c.V;
    const Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L), n = Ls.length;
    const ILs = listing(Ls.map((j) => `$${nm.IL(j)} = ${q(s.Ib[j], 'A')}$`));
    const out = [L(`Before $t = 0$, the switch has been ${state(st.first)} for a long time.`, `Vor $t = 0$ ist der Schalter seit langer Zeit ${state(st.first)}.`)];
    if (!main) {
      out.push(L(`The circuit is open, so no current flows: ${ILs}.`, `Der Stromkreis ist offen, also fliesst kein Strom: ${ILs}.`));
      return out;
    }
    out.push(L(`The currents have become constant, so the self-induced emf $${EMF()} = -L\\,\\frac{\\Delta I}{\\Delta t}$ is zero, and so is the voltage across ${pl(n, 'the coil', 'each coil')}: ${pl(n, 'the inductor acts like a wire', 'the inductors act like wires')}.`,
      `Die Ströme sind konstant geworden, also ist die induzierte Spannung $${EMF()} = -L\\,\\frac{\\Delta I}{\\Delta t}$ null, ebenso die Spannung über ${pl(n, 'der Spule', 'jeder Spule')}: ${pl(n, 'Die Spule wirkt wie ein Draht', 'Die Spulen wirken wie Drähte')}.`));
    if (!active.every(Boolean)) out.push(L(`The branch of $${nm.R(nm.br[c.sw.j].R)}$ is open, so no current flows through it.`, `Der Zweig von $${nm.R(nm.br[c.sw.j].R)}$ ist offen, also fliesst kein Strom durch ihn.`));
    if (bridged) out.push(L(`The closed switch bridges $${nm.R(nm.r1)}$: no current flows through $${nm.R(nm.r1)}$.`, `Der geschlossene Schalter überbrückt $${nm.R(nm.r1)}$: Durch $${nm.R(nm.r1)}$ fliesst kein Strom.`));
    const on = c.branches.map((b, j) => j).filter((j) => active[j]);
    const wire = on.find((j) => c.branches[j].L && !c.branches[j].R);
    if (wire !== undefined) {
      out.push(L(`The inductor $${nm.L(wire)}$ alone connects the rails like a wire, so there is no voltage across the other branches and no current through them. All the current flows through $${nm.R(nm.r1)}$ and $${nm.L(wire)}$:`,
        `Die Spule $${nm.L(wire)}$ allein verbindet die beiden Schienen wie ein Draht, also liegt an den anderen Zweigen keine Spannung, und durch sie fliesst kein Strom. Der ganze Strom fliesst durch $${nm.R(nm.r1)}$ und $${nm.L(wire)}$:`) +
        al(M`${nm.IL(wire)} &= \frac{${VB()}}{${nm.R(nm.r1)}} = \frac{${q(V, 'V')}}{${q(c.r1, 'O')}} = ${q(s.I, 'A')}`));
      return out;
    }
    const Rs = on.map((j) => nm.R(nm.br[j].R));
    const Rp = fdiv(ONE, s.G);
    if (isZero(r)) {
      out.push(L(`The battery is connected directly across the branches, so $U = ${VB()} = ${q(V, 'V')}$.`, `Die Batterie liegt direkt an den Zweigen, also ist $U = ${VB()} = ${q(V, 'V')}$.`));
    } else {
      const rp = on.length > 1
        ? M`R_\text{p} &= \left(${Rs.map((x) => M`\frac{1}{${x}}`).join(' + ')}\right)^{-1} = ${q(Rp, 'O')}`
        : M`R_\text{p} &= ${Rs[0]} = ${q(Rp, 'O')}`;
      const parallel = on.length > 1
        ? L(`the branches ${listing(Rs.map((x) => `$${x}$`))} are in parallel`, `sind die Zweige ${listing(Rs.map((x) => `$${x}$`))} parallel geschaltet`)
        : L(`the branch is just $${Rs[0]}$`, `besteht der Zweig nur aus $${Rs[0]}$`);
      out.push(L(`With ${pl(n, 'the inductor as a wire', 'the inductors as wires')}, ${parallel}, in series with $${nm.R(nm.r1)}$:`,
        `Mit ${pl(n, 'der Spule als Draht', 'den Spulen als Drähten')} ${parallel}, in Serie mit $${nm.R(nm.r1)}$:`) +
        al(rp, M`${nm.main()} &= \frac{${VB()}}{${nm.R(nm.r1)} + R_\text{p}} = \frac{${q(V, 'V')}}{${q(c.r1, 'O')} + ${q(Rp, 'O')}} = ${q(s.I, 'A')}`,
          M`U &= R_\text{p}\,${nm.main()} = ${q(s.U, 'V')}`));
    }
    const lines = Ls.map((j) => M`${nm.IL(j)} &= \frac{U}{${nm.R(nm.br[j].R)}} = \frac{${q(s.U, 'V')}}{${q(c.branches[j].R, 'O')}} = ${q(s.Ib[j], 'A')}`);
    out.push(L(`$U$ is the voltage across the branches. The current through ${pl(n, 'the inductor', 'each inductor')} is the current through the resistor in its branch:`,
      `$U$ ist die Spannung über den Zweigen. Der Strom durch ${pl(n, 'die Spule', 'jede Spule')} ist der Strom durch den Widerstand in ihrem Zweig:`) + al(...lines));
    return out;
  }

  // At t = 0: the inductor currents do not jump.
  function jumpText(c, nm, st) {
    const Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L), n = Ls.length;
    const vals = listing(Ls.map((j) => `$${nm.IL(j)} = ${q(st.IL[j], 'A')}$`));
    const zero = Ls.every((j) => isZero(st.IL[j]));
    return [L(`At $t = 0$ the switch is ${verb(st.then)}. The current through an inductor cannot change suddenly: a jump ($\\Delta t \\to 0$) would induce an infinite emf $${EMF()} = -L\\,\\frac{\\Delta I}{\\Delta t}$. ` +
      `So right after switching, ${pl(n, 'the inductor still carries', 'the inductors still carry')} ${vals}.` +
      (zero ? ' A branch with an inductor therefore carries no current yet, as if it were cut.' : ` ${pl(n, 'The inductor acts like a current source.', 'The inductors act like current sources.')}`),
    `Zur Zeit $t = 0$ wird der Schalter ${verb(st.then)}. Der Strom durch eine Spule kann sich nicht sprunghaft ändern: Ein Sprung ($\\Delta t \\to 0$) würde eine unendlich grosse Spannung $${EMF()} = -L\\,\\frac{\\Delta I}{\\Delta t}$ induzieren. ` +
      `Unmittelbar nach dem Schalten ${pl(n, 'führt die Spule', 'führen die Spulen')} also noch ${vals}.` +
      (zero ? ' Ein Zweig mit einer Spule führt deshalb noch keinen Strom, als wäre er unterbrochen.' : ` ${pl(n, 'Die Spule wirkt wie eine Stromquelle.', 'Die Spulen wirken wie Stromquellen.')}`))];
  }

  // The voltage across the branches: U, or V_L if an inductor forms a branch on its own (then
  // the two are the same, and V_L is the quantity asked for).
  function uSym(c, nm) {
    const j = c.branches.findIndex((b) => b.L && !b.R);
    return j < 0 ? 'U' : nm.VL(j);
  }
  // U and what it is, after "with" ("mit")
  function uIs(c, nm) {
    const j = c.branches.findIndex((b) => b.L && !b.R);
    return j < 0 ? L('$U$ the voltage across the branches', '$U$ als Spannung über den Zweigen')
      : L(`$${nm.VL(j)}$ the voltage across $${nm.L(j)}$, which is the voltage across all branches`, `$${nm.VL(j)}$ als Spannung über $${nm.L(j)}$, die gleich der Spannung über allen Zweigen ist`);
  }

  // Right after t = 0: the other currents from Kirchhoff's rules.
  function afterText(c, nm, st) {
    const s = st.s1, V = c.V, out = [], U = uSym(c, nm), Uis = uIs(c, nm);
    const Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L), n = Ls.length;
    const IL = Ls.map((j) => nm.IL(j)), ILv = Ls.map((j) => q(st.IL[j], 'A'));
    const sumSym = IL.join(' + '), sumNum = ILv.map((x) => (x.startsWith('-') ? `(${x})` : x)).join(' + ');
    const res = s.res, Rs = res.map((j) => nm.R(nm.br[j].R));
    const currents = res.map((j) => M`${nm.Ib(j)} &= \frac{${U}}{${nm.R(nm.br[j].R)}} = \frac{${q(s.U, 'V')}}{${q(c.branches[j].R, 'O')}} = ${q(s.Ib[j], 'A')}`);
    if (c.sw.at === 'branch' && !config(c, st.then).active[c.sw.j]) out.push(L(`The branch of $${nm.R(nm.br[c.sw.j].R)}$ is open now: $${nm.Ib(c.sw.j)} = 0$.`, `Der Zweig von $${nm.R(nm.br[c.sw.j].R)}$ ist jetzt offen: $${nm.Ib(c.sw.j)} = 0$.`));
    if (!s.main) {
      out.push(L(`The main line is open now: no current flows through the battery${c.r1 ? ` or $${nm.R(nm.r1)}$ ($${nm.IR1()} = 0$)` : ''}. ` +
        `The inductor current has to flow back through the other branch${res.length > 1 ? 'es' : ''}. Junction rule at the top rail, with ${Uis}:`,
      `Die Hauptleitung ist jetzt offen: Durch die Batterie${c.r1 ? ` und $${nm.R(nm.r1)}$ ($${nm.IR1()} = 0$)` : ''} fliesst kein Strom. ` +
        `Der Spulenstrom muss durch ${pl(res.length, 'den anderen Zweig', 'die anderen Zweige')} zurückfliessen. Knotenregel an der oberen Schiene, mit ${Uis}:`) +
        al(M`0 &= ${sumSym} + ${Rs.map((x) => M`\frac{${U}}{${x}}`).join(' + ')}`,
          res.length > 1
            ? M`${U} &= -\frac{${sumSym}}{${Rs.map((x) => M`\frac{1}{${x}}`).join(' + ')}} = ${q(s.U, 'V')}`
            : M`${U} &= -${Rs[0]}\,${n > 1 ? `(${sumSym})` : sumSym} = -${q(c.branches[res[0]].R, 'O')}\cdot ${n > 1 ? `(${sumNum})` : sumNum} = ${q(s.U, 'V')}`,
          ...currents) +
        L(`The negative sign${res.length > 1 ? 's' : ''}: the current flows upwards, against the arrow.`, `${pl(res.length, 'Das negative Vorzeichen', 'Die negativen Vorzeichen')}: Der Strom fliesst nach oben, gegen den Pfeil.`));
      return out;
    }
    if (isZero(s.r)) {
      out.push(L((s.bridged ? `The closed switch bridges $${nm.R(nm.r1)}$ ($${nm.IR1()} = 0$), so the battery` : 'The battery') + ` is connected directly across the branches: $${U} = ${VB()} = ${q(V, 'V')}$.`,
        (s.bridged ? `Der geschlossene Schalter überbrückt $${nm.R(nm.r1)}$ ($${nm.IR1()} = 0$), also liegt die Batterie` : 'Die Batterie liegt') + ` direkt an den Zweigen: $${U} = ${VB()} = ${q(V, 'V')}$.`) +
        (currents.length ? al(...currents) : ''));
      return out;
    }
    const R1 = nm.R(nm.r1), sumIsZero = isZero(s.sumIL);
    if (!res.length) {
      out.push(L(`No other branch can take current, so $${nm.IR1()} = ${sumSym} = ${q(s.I, 'A')}$, and the rest of the battery voltage is across the branch${n > 1 ? 'es' : ''}:`,
        `Kein anderer Zweig kann Strom aufnehmen, also ist $${nm.IR1()} = ${sumSym} = ${q(s.I, 'A')}$, und der Rest der Batteriespannung liegt über ${pl(n, 'dem Zweig', 'den Zweigen')}:`) +
        al(M`${U} &= ${VB()} - ${R1}\,${nm.IR1()} = ${q(V, 'V')} - ${q(c.r1, 'O')}\cdot${q(s.I, 'A')} = ${q(s.U, 'V')}`));
      return out;
    }
    if (sumIsZero) {
      const Rp = fdiv(ONE, s.G);
      const rp = res.length > 1 ? M`R_\text{p} &= \left(${Rs.map((x) => M`\frac{1}{${x}}`).join(' + ')}\right)^{-1} = ${q(Rp, 'O')}` : null;
      const wire = c.branches.findIndex((b) => b.L && !b.R);
      const list = listing(Rs.map((x) => `$${x}$`));
      const why = wire < 0 ? '' : L(` The inductor $${nm.L(wire)}$ is in parallel with ${list}, so ${res.length > 1 ? 'they all have' : 'both have'} the same voltage $${U}$.`,
        ` Die Spule $${nm.L(wire)}$ ist parallel zu ${list}, also liegt an ${res.length > 1 ? 'allen' : 'beiden'} dieselbe Spannung $${U}$.`);
      out.push(L(`The inductor branch${n > 1 ? 'es carry' : ' carries'} no current, so the current flows through $${R1}$ and ${res.length > 1 ? `the parallel branches ${list}` : `$${Rs[0]}$, in series`}.${why}`,
        `${pl(n, 'Der Spulenzweig führt', 'Die Spulenzweige führen')} keinen Strom, also fliesst der Strom durch $${R1}$ und ${res.length > 1 ? `die parallelen Zweige ${list}` : `$${Rs[0]}$, in Serie`}.${why}`) +
        al(...(rp ? [rp] : []), M`${nm.IR1()} &= \frac{${VB()}}{${R1} + ${rp ? M`R_\text{p}` : Rs[0]}} = \frac{${q(V, 'V')}}{${q(c.r1, 'O')} + ${q(Rp, 'O')}} = ${q(s.I, 'A')}`,
          M`${U} &= ${rp ? M`R_\text{p}` : Rs[0]}\,${nm.IR1()} = ${q(s.U, 'V')}`, ...currents));
      return out;
    }
    out.push(L(`With ${Uis}, the loop rule through the battery and the junction rule at the top rail give`, `Mit ${Uis} ergeben die Maschenregel durch die Batterie und die Knotenregel an der oberen Schiene`) +
      al(M`${VB()} &= ${R1}\,${nm.IR1()} + ${U}`, M`${nm.IR1()} &= ${sumSym} + ${Rs.map((x) => M`\frac{${U}}{${x}}`).join(' + ')}`) +
      L(`Put the second equation into the first and solve for $${U}$:`, `Setze die zweite Gleichung in die erste ein und löse nach $${U}$ auf:`) +
      al(M`${U} &= \frac{${VB()} - ${R1}\,${n > 1 ? `(${sumSym})` : sumSym}}{1 + ${Rs.map((x) => M`\frac{${R1}}{${x}}`).join(' + ')}} = \frac{${q(V, 'V')} - ${q(c.r1, 'O')}\cdot ${sumNum}}{1 + ${res.map((j) => M`\frac{${q(c.r1, 'O')}}{${q(c.branches[j].R, 'O')}}`).join(' + ')}} = ${q(s.U, 'V')}`,
        ...currents, M`${nm.IR1()} &= \frac{${VB()} - ${U}}{${R1}} = \frac{${q(V, 'V')} - ${q(s.U, 'V')}}{${q(c.r1, 'O')}} = ${q(s.I, 'A')}`));
    return out;
  }

  function voltText(c, nm, st) {
    const s = st.s1, U = uSym(c, nm);
    const Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L);
    const wire = Ls.find((j) => !c.branches[j].R), series = Ls.filter((j) => c.branches[j].R);
    const out = wire !== undefined ? [L(`The inductor $${nm.L(wire)}$ is a branch on its own, so the voltage across it is the voltage across the branches, found above: $${nm.VL(wire)} = ${q(s.VL[wire], 'V')}$.`,
      `Die Spule $${nm.L(wire)}$ bildet allein einen Zweig, also ist die Spannung über ihr die oben bestimmte Spannung über den Zweigen: $${nm.VL(wire)} = ${q(s.VL[wire], 'V')}$.`)] : [];
    if (series.length) {
      out.push(L(`The voltage across ${series.length > 1 ? 'an inductor' : 'the inductor'} in series with a resistor is the voltage $${U}$ across the branch minus the voltage across the resistor:`,
        `Die Spannung über ${series.length > 1 ? 'einer Spule' : 'der Spule'} in Serie mit einem Widerstand ist die Spannung $${U}$ über dem Zweig minus die Spannung über dem Widerstand:`) +
        al(...series.map((j) => M`${nm.VL(j)} &= ${U} - ${nm.R(nm.br[j].R)}\,${nm.IL(j)} = ${q(s.U, 'V')} - ${q(c.branches[j].R, 'O')}\cdot ${q(st.IL[j], 'A')} = ${q(s.VL[j], 'V')}`)));
    }
    // The induced emf and the rate of change: only here does the inductance matter.
    for (const j of Ls) {
      const H = c.branches[j].H, vl = fval(s.VL[j]), E = nm.EMF(j);
      const how = vl > 0
        ? L('the current is growing in the direction of the arrow, and the emf acts against the arrow, against this growth (Lenz\'s rule)', 'Der Strom wächst in Pfeilrichtung, und die induzierte Spannung wirkt gegen den Pfeil, gegen dieses Wachsen (Lenzsche Regel)')
        : vl < 0 ? L('the current is falling in the direction of the arrow, and the emf acts along the arrow, against this fall (Lenz\'s rule)', 'Der Strom nimmt in Pfeilrichtung ab, und die induzierte Spannung wirkt in Pfeilrichtung, gegen diese Abnahme (Lenzsche Regel)')
          : L('the current does not change at this moment', 'Der Strom ändert sich in diesem Moment nicht');
      out.push(L(`The self-induced emf of $${nm.L(j)}$: ${how}. The inductance decides how fast the current changes; it does not change the values right after switching.`,
        `Die induzierte Spannung der Spule $${nm.L(j)}$: ${how}. Die Induktivität bestimmt, wie schnell sich der Strom ändert; die Werte unmittelbar nach dem Schalten ändert sie nicht.`) +
        al(M`${E} &= -${nm.VL(j)} = ${q(fneg(s.VL[j]), 'V')}, \quad |${E}| = ${q(fabs(s.VL[j]), 'V')}`,
          M`\frac{\Delta ${nm.IL(j)}}{\Delta t} &= \frac{${nm.VL(j)}}{${nm.L(j)}} = \frac{${q(s.VL[j], 'V')}}{${comma(fmt(H), true)}\,\mathrm{H}} = ${comma(fmt(vl / H), true)}\,\mathrm{A/s}`));
    }
    return out;
  }

  // The hints: the circuit before t = 0 with the inductors as wires (what carries current, and
  // how the inductor currents follow), the jump with the circuit as it is after switching, and
  // the order of the work. No value of a current or emf asked for: every branch current right
  // after switching is asked, and an inductor current keeps its value from before.
  function hints(c, nm, st) {
    const U = uSym(c, nm), V = VB();
    const Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L), n = Ls.length;
    const IL = listing(Ls.map((j) => `$${nm.IL(j)}$`)), Lnames = listing(Ls.map((j) => `$${nm.L(j)}$`));
    const R1 = c.r1 ? nm.R(nm.r1) : null;
    // before t = 0
    const b = config(c, st.first), s0 = st.s0;
    const on = c.branches.map((x, j) => j).filter((j) => b.active[j]);
    const wire0 = b.main ? on.find((j) => c.branches[j].L && !c.branches[j].R) : undefined;
    const Rs0 = on.filter((j) => c.branches[j].R).map((j) => nm.R(nm.br[j].R));
    const own = L(`and ${pl(n, 'the inductor current is', 'each inductor current is')} the current through the resistor in the same branch, $\\frac{U}{R}$ of that branch`,
      `und ${pl(n, 'der Spulenstrom ist', 'jeder Spulenstrom ist')} der Strom durch den Widerstand im selben Zweig, $\\frac{U}{R}$ dieses Zweigs`);
    let before;
    if (!b.main) {
      before = L(`Before $t = 0$ the main line is open: nothing drives a current. What ${pl(n, 'is', 'are')} ${IL} then?`, `Vor $t = 0$ ist die Hauptleitung offen: Nichts treibt einen Strom an. Wie gross ${pl(n, 'ist', 'sind')} dann ${IL}?`);
    } else if (wire0 !== undefined) {
      before = L(`Before $t = 0$, $${nm.L(wire0)}$ alone connects the two rails like a wire: no voltage is left for the other branches. So the whole current flows through $${R1}$ and $${nm.L(wire0)}$, limited by $${R1}$ alone: $${nm.IL(wire0)} = \\frac{${V}}{${R1}}$.`,
        `Vor $t = 0$ verbindet $${nm.L(wire0)}$ allein die beiden Schienen wie ein Draht: Für die anderen Zweige bleibt keine Spannung. Also fliesst der ganze Strom durch $${R1}$ und $${nm.L(wire0)}$, begrenzt nur durch $${R1}$: $${nm.IL(wire0)} = \\frac{${V}}{${R1}}$.`);
    } else if (isZero(b.r)) {
      before = L(`Before $t = 0$ the battery is connected directly across the branches${b.bridged ? ` (S bridges $${R1}$)` : ''}: $U = ${V}$, ${own}.`,
        `Vor $t = 0$ liegt die Batterie direkt an den Zweigen${b.bridged ? ` (S überbrückt $${R1}$)` : ''}: $U = ${V}$, ${own}.`);
    } else {
      const Rp0 = s0.G ? fdiv(ONE, s0.G) : ZERO;
      const par = Rs0.length > 1 ? L(`the branches ${listing(Rs0.map((x) => `$${x}$`))} in parallel`, `die parallelen Zweige ${listing(Rs0.map((x) => `$${x}$`))}`) : `$${Rs0[0]}$`;
      before = L(`Before $t = 0$, with ${pl(n, 'the inductor as a wire', 'the inductors as wires')}, ${par} ${Rs0.length > 1 ? 'are' : 'is'} in series with $${R1}$. Here $R_\\text{p} = ${q(Rp0, 'O')}$: first $${nm.main()} = \\frac{${V}}{${R1} + R_\\text{p}}$, then the voltage across the branches $U = R_\\text{p}\\,${nm.main()}$, ${own}.`,
        `Vor $t = 0$, mit ${pl(n, 'der Spule als Draht', 'den Spulen als Drähten')}, ${Rs0.length > 1 ? 'sind' : 'ist'} ${par} in Serie mit $${R1}$. Hier ist $R_\\text{p} = ${q(Rp0, 'O')}$: zuerst $${nm.main()} = \\frac{${V}}{${R1} + R_\\text{p}}$, dann die Spannung über den Zweigen $U = R_\\text{p}\\,${nm.main()}$, ${own}.`);
    }
    // right after t = 0
    const s = st.s1, res = s.res, Rs = res.map((j) => nm.R(nm.br[j].R));
    const sumSym = Ls.map((j) => nm.IL(j)).join(' + ');
    let rules;
    if (!s.main) {
      rules = L(`The main line is open now: no current flows through the battery${R1 ? ` or $${R1}$` : ''}. The inductor current has to flow back through ${listing(Rs.map((x) => `$${x}$`))}: junction rule at the top rail, $0 = ${sumSym} + ${Rs.map((x) => M`\frac{${U}}{${x}}`).join(' + ')}$.`,
        `Die Hauptleitung ist jetzt offen: Durch die Batterie${R1 ? ` und $${R1}$` : ''} fliesst kein Strom. Der Spulenstrom muss durch ${listing(Rs.map((x) => `$${x}$`))} zurückfliessen: Knotenregel an der oberen Schiene, $0 = ${sumSym} + ${Rs.map((x) => M`\frac{${U}}{${x}}`).join(' + ')}$.`);
    } else if (isZero(s.r)) {
      rules = L(`Now the battery is connected directly across the branches${s.bridged ? ` (the closed S bridges $${R1}$)` : ''}: $${U} = ${V}$.`, `Jetzt liegt die Batterie direkt an den Zweigen${s.bridged ? ` (der geschlossene S überbrückt $${R1}$)` : ''}: $${U} = ${V}$.`);
    } else if (!res.length) {
      rules = L(`No other branch can take current: the inductor current flows through $${R1}$, $${nm.IR1()} = ${sumSym}$, and the loop rule gives the rest of the battery voltage across the branches, $${V} = ${R1}\\,${nm.IR1()} + ${U}$.`,
        `Kein anderer Zweig kann Strom aufnehmen: Der Spulenstrom fliesst durch $${R1}$, $${nm.IR1()} = ${sumSym}$, und die Maschenregel gibt den Rest der Batteriespannung über den Zweigen, $${V} = ${R1}\\,${nm.IR1()} + ${U}$.`);
    } else {
      rules = L(`Loop rule through the battery, $${V} = ${R1}\\,${nm.IR1()} + ${U}$, and junction rule at the top rail, $${nm.IR1()} = ${sumSym} + ${Rs.map((x) => M`\frac{${U}}{${x}}`).join(' + ')}$.`,
        `Maschenregel durch die Batterie, $${V} = ${R1}\\,${nm.IR1()} + ${U}$, und Knotenregel an der oberen Schiene, $${nm.IR1()} = ${sumSym} + ${Rs.map((x) => M`\frac{${U}}{${x}}`).join(' + ')}$.`);
    }
    const emfSer = L('$V_L = U - R\\,I_L$ for an inductor with a resistor in its branch', '$U_L = U - R\\,I_L$ für eine Spule mit einem Widerstand in ihrem Zweig');
    const emfWire = L('across an inductor that is a branch on its own, the voltage across the branches', 'über einer Spule, die allein einen Zweig bildet, die Spannung über den Zweigen');
    const emf = [Ls.some((j) => c.branches[j].R) && emfSer, Ls.some((j) => !c.branches[j].R) && emfWire].filter(Boolean).join('; ');
    return [
      L(`Before $t = 0$, S ${where(c, nm)} has been ${state(st.first)} for a long time: the currents are constant, so ${Lnames} ${pl(n, 'acts like a wire', 'act like wires')}. Draw the circuit like that: which resistors carry current, and which way does ${pl(n, 'the current through', 'the current through each of')} ${Lnames} flow?`,
        `Vor $t = 0$ ist S ${where(c, nm)} seit langer Zeit ${state(st.first)}: Die Ströme sind konstant, also ${pl(n, 'wirkt', 'wirken')} ${Lnames} wie ${pl(n, 'ein Draht', 'Drähte')}. Zeichne die Schaltung so: Welche Widerstände führen Strom, und in welche Richtung fliesst der Strom durch ${Lnames}?`),
      before,
      L(`At $t = 0$ S is ${verb(st.then)}, but ${IL} cannot jump: right after switching, ${pl(n, 'the inductor', 'each inductor')} still carries its current from before, like a current source. ${rules}`,
        `Bei $t = 0$ wird S ${verb(st.then)}, aber ${IL} ${pl(n, 'kann', 'können')} nicht springen: Unmittelbar nach dem Schalten führt ${pl(n, 'die Spule', 'jede Spule')} noch ihren Strom von vorher, wie eine Stromquelle. ${rules}`),
      L(`Get $${U}$ from this first; then every resistor current is $\\frac{${U}}{R}$ of its branch${n ? `, and for the emf: ${emf}; $|${EMF()}| = |V_L|$` : ''}.`,
        `Bestimme daraus zuerst $${U}$; dann ist jeder Widerstandsstrom $\\frac{${U}}{R}$ seines Zweigs${n ? `, und für die induzierte Spannung: ${emf}; $|${EMF()}| = |U_L|$` : ''}.`),
    ];
  }

  // ---------------------------------------------------------------- drawing
  const UNIT = { A: 'A', V: 'V' };
  const label = (f, u) => (u === 'A' ? `${ftxt(fmul(f, MA))} mA` : `${ftxt(f)} ${u}`); // currents given in A, shown in mA

  // Layout: battery on the left wire, the main line (switch, R1) along the top, branches as
  // columns between the top and the bottom rail. view: { closed (switch drawn closed),
  // cur: key → label text or null (keys IR1, I0, I1, …), focus: key → 'new' | 'use', notes:
  // branch → text next to the inductor, hl: Set of 'R1' | 'S' | branch index, dim: Set of
  // branch indices | 'main', swNote: text under the switch, gaps: least distances between the
  // columns (to keep them in place from one picture to the next) }. The sketch keeps the
  // distances used as s.gaps.
  function draw(c, nm, view) {
    const s = new Circuit.Sketch();
    s.autoDots = true;
    const focus = view.focus || new Map(), hl = view.hl || new Set(), dim = view.dim || new Set();
    const cur = (key) => {
      const t = view.cur ? view.cur[key] : null;
      return t != null && focus.has(key) ? { t, cls: focus.get(key) } : t;
    };
    // the height of a branch: 1.3 per element, an inductor a little more (its label has a note)
    const tall = (b) => ((b.sw ? 1 : 0) + (b.R ? 1 : 0)) * 1.3 + (b.L ? 1.6 : 0);
    const H = Math.max(3.2, 0.9 + Math.max(...c.branches.map(tall)));
    const sw = (p, q2, extra) => s.sw(p, q2, { l: 'S', closed: view.closed, note: view.swNote, hl: hl.has('S'), hit: view.hit, ...extra });

    // Main line: the switch on the top wire, R1 on the bottom wire (the current goes back to
    // the battery through it, so its arrow points left), a bridge switch below R1.
    const top = c.sw.at === 'main' ? 2.6 : 1, bottom = c.r1 ? (c.sw.at === 'bridge' ? 3.2 : 2.8) : 1;
    const x = Math.max(top, bottom) + 0.3;
    s.dim = dim.has('main');
    if (c.sw.at === 'main') {
      s.wire([0, 0], [0.8, 0]).wire([2.2, 0], [x, 0]);
      sw([0.8, 0], [2.2, 0]);
    } else {
      s.wire([0, 0], [x, 0]);
    }
    // A column is followed by the widest label on its right, with some room to spare.
    const wide = (l, at) => (l == null ? 0 : at + Circuit.textWidth(typeof l === 'object' ? l.t : l) / Circuit.S);
    const labels = (b, j) => ({
      R: b.R && `$${nm.R(nm.br[j].R)}$ = ${ftxt(b.R)} Ω`,
      L: b.L && `$${nm.L(j).replace(/[{}]/g, '')}$ = ${comma(String(b.H))} H`,
    });
    const gaps = c.branches.map((b, j) => {
      const l = labels(b, j);
      const room = Math.max(wide(cur(`I${j}`), 0.22), b.R ? wide(l.R, 0.3) : 0, b.L ? Math.max(wide(l.L, 0.42), wide(view.notes && view.notes[j], 0.42)) : 0,
        b.sw ? Math.max(wide('S', 0.55), wide(view.swNote, 0.55)) : 0);
      return Math.max(2.9, room + 0.5, (view.gaps || [])[j] || 0);
    });
    s.gaps = gaps;
    const cols = c.branches.map((b, j) => x + gaps.slice(0, j).reduce((a, g) => a + g, 0)), last = cols[cols.length - 1];
    s.dim = false;
    s.wire([x, 0], [last, 0]).wire([last, -H], [x, -H]);
    c.branches.forEach((b, j) => {
      const cx = cols[j];
      s.dim = dim.has(j);
      s.wire([cx, 0], [cx, -0.9]).cur([cx, 0], [cx, -0.9], cur(`I${j}`), 'right', 0.5);
      const parts = [b.sw && 'S', b.R && 'R', b.L && 'L'].filter(Boolean), seg = (H - 0.9) / parts.length;
      parts.forEach((kind, k) => {
        const p = [cx, -0.9 - k * seg], q2 = [cx, -0.9 - (k + 1) * seg];
        if (kind === 'S') sw(p, q2, { ls: 'right' });
        if (kind === 'R') s.res(p, q2, { l: labels(b, j).R, ls: 'right', hl: hl.has(j) && !b.L });
        if (kind === 'L') s.ind(p, q2, { l: labels(b, j).L, ls: 'right', hl: hl.has(j), note: view.notes && view.notes[j] });
      });
    });
    s.dim = dim.has('main');
    if (c.r1) {
      const R1 = `$${nm.R(nm.r1)}$ = ${ftxt(c.r1)} Ω`, a = x - 0.3, b = a - 2.2, bridge = c.sw.at === 'bridge';
      s.wire([x, -H], [a, -H]);
      s.dim = dim.has('main') || dim.has('R1');
      s.res([a, -H], [b, -H], { l: R1, ls: bridge ? 'above' : 'below', hl: hl.has('R1'), i: cur('IR1'), is: bridge ? 'below' : 'above', it: 0.86 });
      s.dim = dim.has('main');
      if (bridge) {
        s.wire([a, -H], [a, -H - 1.2]).wire([b, -H - 1.2], [b, -H]);
        sw([a, -H - 1.2], [b, -H - 1.2], { ls: 'below' });
      }
      s.wire([b, -H], [0, -H]);
    } else {
      s.wire([x, -H], [0, -H]);
    }
    s.bat([0, -H], [0, 0], { l: `${ftxt(c.V)} V` });
    s.dim = false;
    return s;
  }

  // ---------------------------------------------------------------- assembly
  // Parts without current in switch state `closed`, for view.dim: the main line, open
  // branches, a bridged R1.
  function dead(c, closed) {
    const { main, active, bridged } = config(c, closed), out = new Set();
    if (!main) out.add('main');
    c.branches.forEach((b, j) => { if (!active[j]) out.add(j); });
    if (bridged) out.add('R1');
    return out;
  }

  // the note under the switch in the task, and once it has been switched (the animation)
  const swNote = (closed) => (closed ? L('opens at t = 0', 'öffnet bei t = 0') : L('closes at t = 0', 'schliesst bei t = 0'));
  const swDone = (closed) => (closed ? L('closed at t = 0', 'bei t = 0 geschlossen') : L('opened at t = 0', 'bei t = 0 geöffnet'));

  // ---------------------------------------------------------------- the currents in time
  // Immediately after switching, as after(), in plain numbers (A, V) for any inductor currents IL.
  function afterNum(c, closed, IL) {
    const { main, bridged, r, active } = config(c, closed), V = fval(c.V), rr = fval(r);
    const sumIL = IL.reduce((a, b) => a + b, 0);
    const res = c.branches.map((b, j) => j).filter((j) => active[j] && !c.branches[j].L);
    const G = res.reduce((sum, j) => sum + 1 / fval(c.branches[j].R), 0);
    let U;
    if (main && rr) U = (V - rr * sumIL) / (1 + rr * G);
    else if (main) U = V;
    else if (!G) return null;
    else U = -sumIL / G;
    const Ib = c.branches.map((b, j) => (b.L ? IL[j] : active[j] ? U / fval(b.R) : 0));
    const I = main ? Ib.reduce((a, b) => a + b, 0) : 0;
    const VL = c.branches.map((b, j) => (b.L ? U - (b.R ? fval(b.R) * IL[j] : 0) : null));
    return { I, U, Ib, VL, IR1: bridged ? 0 : I };
  }

  // How the currents run after switching, from their values right after (s1) to those long after
  // (s2): each inductor current changes at the rate V_L / L (V_L from Kirchhoff's rules, as right
  // after switching), integrated (Runge–Kutta) up to T = 6 times the longest time constant.
  // Returns { T, taus, at(t) → { IR1, Ib } in A }; before t = 0, the values before switching (s0).
  function curves(c, st) {
    const n = c.branches.length, Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L);
    const rate = (IL) => { const a = afterNum(c, st.then, IL); return IL.map((x, j) => (c.branches[j].L ? a.VL[j] / c.branches[j].H : 0)); };
    // the rates are linear in the inductor currents: dIL/dt = A·IL + b
    const zero = new Array(n).fill(0), b0 = rate(zero);
    const A = Ls.map((k) => Ls.map((l) => { const e = zero.slice(); e[l] = 1; return rate(e)[k] - b0[k]; }));
    let lams;
    if (Ls.length === 1) lams = [A[0][0]];
    else {
      const tr = A[0][0] + A[1][1], det = A[0][0] * A[1][1] - A[0][1] * A[1][0], disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
      lams = [(tr + disc) / 2, (tr - disc) / 2];
    }
    const taus = lams.map((l) => -1 / l);
    const T = 6 * Math.max(...taus), steps = Math.min(20000, Math.max(600, Math.ceil((40 * T) / Math.min(...taus))));
    const dt = T / steps, IL0 = st.IL.map(fval), path = [IL0];
    const plus = (x, k, h) => x.map((v, j) => v + h * k[j]);
    let IL = IL0;
    for (let k = 0; k < steps; k++) {
      const k1 = rate(IL), k2 = rate(plus(IL, k1, dt / 2)), k3 = rate(plus(IL, k2, dt / 2)), k4 = rate(plus(IL, k3, dt));
      IL = IL.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      path.push(IL);
    }
    const s0 = { IR1: fval(st.s0.IR1), Ib: st.s0.Ib.map(fval) };
    function at(t) {
      if (t < 0) return s0;
      const x = Math.min(steps, t / dt), k = Math.min(steps - 1, Math.floor(x)), f = x - k;
      const a = afterNum(c, st.then, path[k].map((v, j) => v + f * (path[k + 1][j] - v)));
      return { IR1: a.IR1, Ib: a.Ib };
    }
    return { T, taus, at };
  }

  // Difficulty for the stars and the arcade: easy 1 (switched on from rest, or a single loop) or
  // 2; medium 3; hard 4, or 5 with three branches, two inductors or the switch across R1.
  function difficulty(c, level) {
    if (level === 'easy') return c.sw.before === 'open' || c.branches.length === 1 ? 1 : 2;
    if (level === 'medium') return 3;
    const nL = c.branches.filter((b) => b.L).length;
    return c.branches.length > 2 || nL > 1 || c.sw.at === 'bridge' ? 5 : 4;
  }

  function exercise(c, st, level, id) {
    const nm = namer(c), list = targets(c, nm, st, LEVELS[level] ? LEVELS[level].vl : true);
    const syms = (show) => Object.fromEntries(list.filter((t) => t.unit === 'mA').map((t) => [t.key, show(t)]));
    const emfNote = (j) => `$${nm.EMFsvg(j)}$ = ${label(fneg(st.s1.VL[j]), 'V')}`;
    // the solution (sol) or the task, with the quantity asked for (ask: its key) in colour
    const figure = (sol, ask) => {
      const view = sol
        ? { closed: st.then, dim: dead(c, st.then), cur: syms((t) => label(t.value, 'mA')), notes: Object.fromEntries(c.branches.map((b, j) => [j, b.L ? emfNote(j) : null])) }
        : { closed: st.first, cur: syms((t) => (t.key === ask ? { t: `$${t.sym}$`, cls: 'ask' } : `$${t.sym}$`)), swNote: swNote(st.first) };
      return `<div class="fig">${draw(c, nm, view).toSVG()}</div>`;
    };
    // The circuit before and after switching, the switch the one the student flips (play.js), in
    // the same frame: [before, after].
    const watch = () => {
      const views = [{ closed: st.first, cur: syms((t) => `$${t.sym}$`), swNote: swNote(st.first), hit: true },
        { closed: st.then, cur: syms((t) => `$${t.sym}$`), dim: dead(c, st.then), swNote: swDone(st.then), hit: true }];
      const gaps = views.reduce((g, v) => draw(c, nm, v).gaps.map((x, j) => Math.max(x, g[j] || 0)), []);
      const sk = views.map((v) => draw(c, nm, { ...v, gaps }));
      const box = sk.reduce((b, k) => [Math.min(b[0], k.box[0]), Math.min(b[1], k.box[1]), Math.max(b[2], k.box[2]), Math.max(b[3], k.box[3])], [Infinity, Infinity, -Infinity, -Infinity]);
      return sk.map((k) => `<div class="fig">${k.toSVG('circuit', box)}</div>`);
    };
    let run = null;
    return {
      id, level, circuit: c, st, nm, watch, curves: () => (run = run || curves(c, st)),
      title: `${LEVELS[level] ? LEVELS[level].name() : L('Example', 'Beispiel')} · ${st.first ? L('switch opened', 'Schalter geöffnet') : L('switch closed', 'Schalter geschlossen')}`,
      difficulty: difficulty(c, level),
      text: taskText(c, nm, list),
      situation: situation(c, nm),
      fields: list.map((t) => ({ key: t.key, sym: t.sym, unit: t.unit, value: fval(t.value), abs: !!t.abs })),
      models: models(c, st, list).map((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v === null ? null : fval(v)]))),
      tol: 0.01,
      figure,
      hints: hints(c, nm, st),
      solution: [...beforeText(c, nm, st), ...jumpText(c, nm, st), ...afterText(c, nm, st), ...(list.some((t) => t.unit === 'V') ? voltText(c, nm, st) : [])],
      results: list.map((t) => `$${t.sym} = ${q(t.value, t.unit)}$`).join(', '),
    };
  }

  // Mixed: easy, medium or hard, chosen by the seed (the exercise is named after its level).
  function generate(level, seed) {
    const lv = level === 'mixed' ? ['easy', 'medium', 'hard'][rng(seed * 7 + 3).int(0, 2)] : level;
    const { c, st } = build(lv, seed);
    return exercise(c, st, lv, `${level}-${seed}`);
  }

  // ---------------------------------------------------------------- tutorial
  // A worked example as frames { text, figure }: the task, the state before t = 0 (inductors
  // as wires), the moment of switching (inductor currents kept), the currents right after, the
  // inductor voltage, and a comparison of before / right after / long after.
  // def = { r1, branches: [[R, L, H?, sw?]], sw: { at, j, before }, V }
  function fromDef(def) {
    const c = {
      r1: def.r1 ? F(def.r1) : null,
      branches: def.branches.map(([R, L, H, sw]) => ({ R: R ? F(R) : null, L: !!L, H: L ? H || 1 : null, sw: !!sw })),
      sw: { ...def.sw }, V: F(def.V),
    };
    return c;
  }

  function tutorial(def) {
    const c = fromDef(def), st = solve(c);
    if (!st) throw new Error('tutorial circuit not usable');
    const ex = exercise(c, st, 'tutor', 'tutor'), nm = ex.nm, list = targets(c, nm, st, true);
    const frames = [];
    const Ls = c.branches.map((b, j) => j).filter((j) => c.branches[j].L);
    const curs = (s) => ({ IR1: c.r1 ? label(s.IR1, 'A') : null, ...Object.fromEntries(c.branches.map((b, j) => [`I${j}`, label(s.Ib[j], 'A')])) });
    const symbols = () => ({ IR1: c.r1 ? `$${nm.IR1()}$` : null, ...Object.fromEntries(c.branches.map((b, j) => [`I${j}`, `$${nm.Ib(j)}$`])) });
    const frame = (title, paras, view) => frames.push({ text: `<p class="step-rule">${title}</p>${paras.map((p) => `<p>${p}</p>`).join('')}`, view });
    const hlL = new Set(Ls);

    frame(L('The task', 'Die Aufgabe'), [ex.text], { closed: st.first, cur: symbols(), swNote: swNote(st.first) });
    frame(L('Before t = 0', 'Vor t = 0'), beforeText(c, nm, st), {
      closed: st.first, cur: curs(st.s0), dim: dead(c, st.first), hl: hlL,
      focus: new Map(Ls.map((j) => [`I${j}`, 'new'])),
      notes: Object.fromEntries(Ls.map((j) => [j, config(c, st.first).main ? L('acts like a wire', 'wirkt wie ein Draht') : L('no current', 'kein Strom')])),
    });
    const kept = Object.fromEntries(Ls.map((j) => [j, L(`keeps ${label(st.IL[j], 'A')}`, `behält ${label(st.IL[j], 'A')}`)]));
    frame(L('The moment of switching', 'Der Moment des Schaltens'), jumpText(c, nm, st), {
      closed: st.then, hl: new Set([...hlL, 'S']), dim: dead(c, st.then), notes: kept,
      cur: { ...symbols(), ...Object.fromEntries(Ls.map((j) => [`I${j}`, label(st.IL[j], 'A')])) },
      focus: new Map(Ls.map((j) => [`I${j}`, 'use'])),
    });
    frame(L('Right after switching', 'Unmittelbar nach dem Schalten'), afterText(c, nm, st), {
      closed: st.then, cur: curs(st.s1), dim: dead(c, st.then), notes: kept,
      focus: new Map([...list.filter((t) => t.unit === 'mA' && !(t.j !== undefined && c.branches[t.j].L)).map((t) => [t.key, 'new']), ...Ls.map((j) => [`I${j}`, 'use'])]),
    });
    frame(L('The induced emf', 'Die induzierte Spannung'), voltText(c, nm, st), {
      closed: st.then, cur: curs(st.s1), dim: dead(c, st.then), hl: hlL,
      notes: Object.fromEntries(Ls.map((j) => [j, `$${nm.EMFsvg(j)}$ = ${label(fneg(st.s1.VL[j]), 'V')}`])),
    });
    const row = (name, s) => `<tr><th>${name}</th>${list.filter((t) => t.unit === 'mA').map((t) => `<td>${label(t.key === 'IR1' ? s.IR1 : s.Ib[t.j], 'A')}</td>`).join('')}</tr>`;
    const table = `<table class="compare"><tr><th></th>${list.filter((t) => t.unit === 'mA').map((t) => `<th>$${t.sym}$</th>`).join('')}</tr>` +
      row(L('before $t = 0$', 'vor $t = 0$'), st.s0) + row(L('right after', 'unmittelbar danach'), st.s1) + row(L('long after', 'lange danach'), st.s2) + '</table>';
    frame(L('Before, right after, long after', 'Vorher, unmittelbar danach, lange danach'), [
      L(`Only the inductor current${Ls.length > 1 ? 's are' : ' is'} the same just before and right after switching; the other currents jump. ` +
        `Long after switching, the currents are constant again and the inductor${Ls.length > 1 ? 's act' : ' acts'} like a wire once more.`,
      `Nur ${Ls.length > 1 ? 'die Spulenströme sind' : 'der Spulenstrom ist'} unmittelbar vor und nach dem Schalten gleich; die anderen Ströme springen. ` +
        `Lange nach dem Schalten sind die Ströme wieder konstant, und ${Ls.length > 1 ? 'die Spulen wirken' : 'die Spule wirkt'} wieder wie ${Ls.length > 1 ? 'Drähte' : 'ein Draht'}.`) + table,
    ], { closed: st.then, cur: curs(st.s2), dim: dead(c, st.then), notes: Object.fromEntries(Ls.map((j) => [j, L('long after: a wire', 'lange danach: ein Draht')])) });

    // The same columns and one viewBox for all frames, so that the diagram does not jump while
    // stepping through.
    const gaps = frames.reduce((g, f) => draw(c, nm, f.view).gaps.map((x, j) => Math.max(x, g[j] || 0)), []);
    frames.forEach((f) => { f.sketch = draw(c, nm, { ...f.view, gaps }); });
    const box = frames.reduce((b, f) => {
      const x = f.sketch.box;
      return [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])];
    }, [Infinity, Infinity, -Infinity, -Infinity]);
    return { frames: frames.map((f) => ({ text: f.text, figure: `<div class="fig">${f.sketch.toSVG('circuit', box)}</div>` })), ex };
  }

  const api = { LEVELS, generate, tutorial, solve, fromDef, steady, after, afterNum, curves, config, F, fval, difficulty };
  root.Switching = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
