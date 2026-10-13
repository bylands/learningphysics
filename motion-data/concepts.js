// Exercises on motion data from the worksheets C1 (stroboscope pictures) and C2 (value tables),
// answered by choosing or entering numbers:
//   table      a value table of two uniform vehicles with gaps: their velocities and two missing
//              positions (★3)
//   atable     value table of a constantly accelerated cart: missing positions and the acceleration
//              (★3: steps of 1 or 2 s; ★4: of 0.5–5 s, and a velocity)
//   strobe     a stroboscope picture of a constantly accelerated cart: in which second it is
//              fastest (★2), how it moves, and (★3) its acceleration
//   tablegraph, atablegraph, strobegraph   tables and pictures with one graph to choose: s(t) of
//              the vehicle that turns among four (★2) or v(t) of two uniform ones (★3); s(t), v(t)
//              or a(t) (★3–4); s(t) (★2), v(t) or a(t) (★3)
// make(kind, seed, d) gives { kind, id, difficulty, title, text, figure, questions, hints, steps,
// answers, data } in the current language (Lang); data: the motion behind it, for the tests.
// Questions:
//   { type: 'choice', key, prompt, options: [{ html, correct, flag, why }], pics (the options are graphs) }
//   { type: 'multi', key, prompt, single, options: [...] } (any number right; single: the prompt
//     for one right answer, in the check); for a right option, why says why it belongs
//   { type: 'num', key, prompt, ask, sym, unit, value, traps: [{ value, flag, why }], why }
// A wrong option's flag names the misconception behind it (FLAGS), or is null. The numbers need
// no calculator: whole seconds (or halves), whole metres (or halves), velocities in tenths or
// halves of m/s.
(function (root) {
  'use strict';


  const Motion = root.Motion || require('./generator.js');
  const Figs = root.Figs || require('./figs.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const { rng } = Motion;
  const { graph, strobe, table, num } = Figs;

  // The misconceptions, with what is right instead.
  const FLAGS = {
    negpos: () => L('negative positions mean motion in the negative direction', 'negative Orte bedeuten Bewegung in negativer Richtung'),
    nodt: () => L('Δs instead of Δs/Δt', 'Δs statt Δs/Δt'),
    origin: () => L('s/t instead of Δs/Δt', 's/t statt Δs/Δt'),
    sign: () => L('the sign of the velocity', 'das Vorzeichen der Geschwindigkeit'),
    gaps: () => L('large gaps read as slow', 'grosse Abstände als langsam gelesen'),
    order: () => L('the time order of the dots', 'die zeitliche Reihenfolge der Punkte'),
    linear: () => L('a steady velocity assumed (continued in a straight line)', 'eine konstante Geschwindigkeit angenommen (linear fortgesetzt)'),
    steps: () => L('the time step forgotten: Δ(Δs) = a · (Δt)²', 'den Zeitschritt vergessen: Δ(Δs) = a · (Δt)²'),
    skip: () => L('v(t) taken for a(t)', 'v(t) für a(t) gehalten'),
  };


  // ---------------------------------------------------------------- helpers
  const it = (s) => `<i>${s}</i>`;
  const sub = (q, i) => `<i>${q}</i><sub>${i}</sub>`;
  const val = (x, u) => `${num(round(x))}&nbsp;${u}`;
  const sval = (x, u) => `${round(x) > 0 ? '+' : ''}${num(round(x))}&nbsp;${u}`;
  const round = (x) => Math.round(x * 100) / 100 + 0;
  // a number as plain as the answers (a multiple of 0.05): other trap values would give themselves away
  const nice = (x) => Math.abs(x * 20 - Math.round(x * 20)) < 1e-9;
  const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L('and', 'und')} ${xs[xs.length - 1]}`);
  // a right option keeps its flag only in a multi: there, missing it is the mistake
  // nudge: what a wrong choice is told while the exercise is open, when why would give the answer away
  const opt = (html, correct, flag, why, nudge) => ({ html, correct, flag: flag || null, why, ...(nudge ? { nudge } : {}) });
  const choice = (key, prompt, options, pics = false) => ({ type: 'choice', key, prompt, options: options.map((o) => (o.correct ? { ...o, flag: null } : o)), pics });
  const multi = (key, prompt, single, options) => ({ type: 'multi', key, prompt, single, options });
  const numQ = (key, prompt, ask, sym, unit, value, traps, why) =>
    ({ type: 'num', key, prompt, ask, sym, unit, value: round(value), traps: traps.filter((t) => Math.abs(t.value - value) > 0.05 && nice(t.value)).map((t) => ({ ...t, value: round(t.value) })), why });
  const step = (title, text, figure) => ({ title, text, figure });
  const interval = (t0, t1) => `${num(t0)}–${num(t1)}&nbsp;s`;

  // the right answer to a question, as HTML
  function answerOf(q) {
    if (q.type === 'num') return `${q.sym} = ${val(q.value, q.unit)}`;
    const right = q.options.filter((o) => o.correct).map((o) => o.html);
    return q.type === 'multi' ? (right.length ? and(right) : L('none', 'keines')) : right[0];
  }
  function finish(kind, seed, d, ex) {
    ex = { kind, id: `${kind}-${seed}`, seed, difficulty: d, ...ex };
    ex.answers = ex.questions.map(answerOf);
    return ex;
  }

  // The usual explanations.
  const WHY = {
    nodt: () => L('That is the change of position Δs. The velocity is the change per second: divide by the time Δt it takes.',
      'Das ist die Ortsänderung Δs. Die Geschwindigkeit ist die Änderung pro Sekunde: Teile durch die Zeit Δt, die sie dauert.'),
    origin: () => L('That is s/t, the position divided by the time. But the body did not start at s = 0: the velocity is the change of position Δs divided by Δt.',
      'Das ist s/t, der Ort geteilt durch die Zeit. Der Körper startete aber nicht bei s = 0: Die Geschwindigkeit ist die Ortsänderung Δs geteilt durch Δt.'),
    sign: () => L('Check the sign: where s decreases, the body moves in the negative direction, so v is negative.',
      'Achte auf das Vorzeichen: Wo s abnimmt, bewegt sich der Körper in negativer Richtung, also ist v negativ.'),
  };


  // ---------------------------------------------------------------- table (C2.3, C2.5)
  // ★3: two uniform vehicles with gaps in the table; their velocities and two missing positions.
  // With a graph to choose instead (kind tablegraph): ★2 the s(t) graph of the one of four
  // vehicles that turns, ★3 the v(t) graph of the two uniform ones.
  const tableEx = (seed) => table2(rng(seed), seed, false);
  function tableGraph(seed, d) {
    const r = rng(seed);
    d = d || r.pick([2, 3]);
    return d === 2 ? table4(r, seed) : table2(r, seed, true);
  }

  function table4(r, seed) {
    const times = [0, 5, 10, 15, 20, 25, 30];
    const make = {
      down: () => { const s0 = r.pick([18, 20, 24, 25, 30]), ds = r.pick([-2, -3, -4]); return { kind: 'down', values: times.map((t, k) => s0 + ds * k), back: true, uniform: true }; },
      negdown: () => { const gaps = r.pick([[8, 7, 6, 5, 4, 3], [2, 3, 4, 5, 6, 7], [5, 5, 4, 4, 3, 3]]), s0 = r.pick([0, -2, 3]); let s = s0; return { kind: 'negdown', values: [s0, ...gaps.map((g) => (s -= g))], back: true }; },
      negup: () => { const s0 = r.pick([-30, -28, -25]), ds = r.pick([3, 4]); return { kind: 'negup', values: times.map((t, k) => s0 + ds * k), back: false, uniform: true }; },
      backforth: () => { const s0 = r.pick([-10, -6]), ds = r.pick([4, 5]); return { kind: 'backforth', values: times.map((t, k) => s0 - ds * Math.min(k, 3) + ds * Math.max(0, k - 3)), back: false }; },
      forthback: () => { const s0 = r.pick([-8, -6]), up = r.pick([6, 5]); return { kind: 'forthback', values: [s0, s0 + up, s0 + 2 * up, s0 + 2 * up - 2, s0 + 2 * up - 4, s0 + 2 * up - 6, s0 + 2 * up - 8], back: false }; },
    };
    const kinds = r.shuffle(['down', 'negdown', 'negup', r.pick(['backforth', 'forthback'])]);
    const names = ['A', 'B', 'C', 'D'];
    const rows = kinds.map((k, i) => ({ name: names[i], ...make[k]() }));
    const fig = () => table(times, rows.map((x) => ({ name: x.name, values: x.values })));
    // the s(t) graph of the vehicle that turns: straight between the times of the table
    const Tn = rows.find((x) => x.kind === 'backforth' || x.kind === 'forthback');
    const others = (k) => rows.find((x) => x.kind === k);
    const ptsOf = (vals) => times.map((t, k) => [t, vals[k]]);
    const G = graphChoice(r, 'graph', L(`Which s(t) graph belongs to ${Tn.name}?`, `Welcher s(t)-Graph gehört zu ${Tn.name}?`), 's', 30, [
      [ptsOf(Tn.values), true],
      [ptsOf(Tn.values.slice().reverse()), 'order', L('This graph runs backwards in time: it starts with the last position of the table. Start at t = 0.', 'Dieser Graph läuft rückwärts in der Zeit: Er beginnt mit dem letzten Ort der Tabelle. Beginne bei t = 0.')],
      [ptsOf(Tn.values.map((v) => -v)), 'sign', L('This graph is mirrored: its positions have the wrong sign. Read the positions with their signs.', 'Dieser Graph ist gespiegelt: Seine Orte haben das falsche Vorzeichen. Lies die Orte mit ihren Vorzeichen.')],
      [ptsOf([0, ...Tn.values.slice(1).map((x, k) => x - Tn.values[k])]), null, L('This graph shows the changes of position from one column to the next, not the positions themselves.', 'Dieser Graph zeigt die Ortsänderungen von einer Spalte zur nächsten, nicht die Orte selbst.')],
      [[[0, Tn.values[0]], [30, Tn.values[6]]], null, L(`This graph joins the first and the last position with a straight line. But in between, ${Tn.name} turns around: draw a point for every column.`, `Dieser Graph verbindet den ersten und den letzten Ort mit einer Geraden. Dazwischen kehrt ${Tn.name} aber um: Zeichne für jede Spalte einen Punkt.`)],
      // (as a last resort, the graphs of other vehicles, on a larger scale)
      [ptsOf(others('negup').values), null, L(`That is the graph of ${others('negup').name}, which moves in the positive direction all the time.`, `Das ist der Graph von ${others('negup').name}, das sich die ganze Zeit in positiver Richtung bewegt.`)],
      [ptsOf(others('down').values), null, L(`That is the graph of ${others('down').name}, which moves in the negative direction all the time.`, `Das ist der Graph von ${others('down').name}, das sich die ganze Zeit in negativer Richtung bewegt.`)],
    ]);
    const graphStep = step(L(`The s(t) graph of ${Tn.name}`, `Der s(t)-Graph von ${Tn.name}`), L(`Each column of the table gives a point (t, s) of ${Tn.name}: ${Tn.values.map((x, k) => `(${times[k]} s, ${num(x)} m)`).join(', ')}. The graph ${Tn.kind === 'backforth' ? 'falls first and then rises' : 'rises first and then falls'}: ${Tn.name} turns around.`,
      `Jede Spalte der Tabelle gibt einen Punkt (t, s) von ${Tn.name}: ${Tn.values.map((x, k) => `(${times[k]} s, ${num(x)} m)`).join(', ')}. Der Graph ${Tn.kind === 'backforth' ? 'fällt zuerst und steigt dann' : 'steigt zuerst und fällt dann'}: ${Tn.name} kehrt um.`), G.right({ dots: ptsOf(Tn.values) }));
    const text = L('<p>The table gives the positions of four vehicles A, B, C and D on a straight road every 5 seconds.</p>', '<p>Die Tabelle gibt die Orte von vier Fahrzeugen A, B, C und D auf einer geraden Strasse alle 5 Sekunden an.</p>');
    return finish('tablegraph', seed, 2, {
      data: { times, rows, turning: Tn.name },
      title: L('From the table to the graph', 'Von der Tabelle zum Graphen'),
      text, figure: fig(), questions: [G.question],
      hints: [
        L('Each column of the table gives a point (t, s) of the graph.', 'Jede Spalte der Tabelle gibt einen Punkt (t, s) des Graphen.'),
        L(`Read the row of ${Tn.name} from left to right: where does s increase, where does it decrease?`, `Lies die Zeile von ${Tn.name} von links nach rechts: Wo nimmt s zu, wo nimmt es ab?`),
        L(`${Tn.name} starts at ${val(Tn.values[0], 'm')} and ends at ${val(Tn.values[6], 'm')}.`, `${Tn.name} startet bei ${val(Tn.values[0], 'm')} und endet bei ${val(Tn.values[6], 'm')}.`),
      ],
      steps: [step(L('The changes', 'Die Änderungen'), `${Tn.name}: ${Tn.values.slice(1).map((v2, k) => `${v2 - Tn.values[k] > 0 ? '+' : ''}${num(v2 - Tn.values[k])}`).join(', ')} m`, fig()), graphStep],
    });
  }

  // ★3: the times vary; each vehicle has two known positions and one asked for, before, between
  // or after them (not at the same time for both).
  const TIMES = [[0, 2, 4, 6, 10, 20], [0, 1, 3, 5, 8, 12], [0, 3, 6, 9, 12, 15], [0, 5, 10, 15, 20, 30], [0, 2, 5, 8, 10, 16], [0, 4, 8, 10, 14, 20], [0, 1, 2, 4, 7, 10]];
  function table2(r, seed, gmode) {
    const times = r.pick(TIMES), T = times[times.length - 1];
    const vs = [-3, -2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3];
    const s = (m, t) => round(m.s0 + m.v * t);
    const cols = Array.from(times, (t, k) => k);
    // two known columns and one asked for
    const plan = () => {
      const [i, j] = r.shuffle(cols.slice()).slice(0, 2).sort((p, q) => p - q);
      return { known: [i, j], asked: r.pick(cols.filter((k) => k !== i && k !== j)) };
    };
    let A, B;
    for (;;) {
      A = { s0: r.int(-12, 12), v: r.pick(vs), ...plan() };
      B = { s0: r.int(-12, 12), v: r.pick(vs), ...plan() };
      // opposite directions, and different speeds (else swapping A and B would look like swapping the signs)
      if (Math.sign(A.v) === Math.sign(B.v) || Math.abs(A.v) === Math.abs(B.v) || A.asked === B.asked) continue;
      const shown = (m) => [...m.known, m.asked].map((k) => s(m, times[k]));
      if (![A, B].every((m) => shown(m).every((x) => Number.isInteger(x) && Math.abs(x) <= 40))) continue;
      // at least one of the asked positions outside the two known ones (going back or forward)
      if ([A, B].every((m) => m.asked > m.known[0] && m.asked < m.known[1])) continue;
      break;
    }
    const M = { A, B };
    // (with a graph to choose, no position is asked for: the gaps stay empty)
    const rows = ['A', 'B'].map((n) => ({ name: n, values: times.map((t, k) => (M[n].known.includes(k) ? s(M[n], t) : M[n].asked === k && !gmode ? null : '')) }));
    const fig = () => table(times, rows);
    const br = (x) => (x < 0 ? `(${num(x)} m)` : `${num(x)} m`);
    // the velocity from the two known positions; the asked one from the nearer known one
    const facts = (n) => {
      const m = M[n], [i, j] = m.known, k = m.asked;
      const base = Math.abs(times[k] - times[i]) <= Math.abs(times[k] - times[j]) ? i : j;
      return { m, ti: times[i], tj: times[j], si: s(m, times[i]), sj: s(m, times[j]), tk: times[k], sk: s(m, times[k]), tb: times[base], sb: s(m, times[base]) };
    };
    const F = { A: facts('A'), B: facts('B') };
    const vQ = (n) => {
      const f = F[n], dt = f.tj - f.ti, ds = f.sj - f.si;
      return numQ(`v${n}`, L(`The velocity of ${n}:`, `Die Geschwindigkeit von ${n}:`), L(`What is the velocity of ${n}?`, `Wie gross ist die Geschwindigkeit von ${n}?`), sub('v', n), 'm/s', f.m.v, [
        { value: ds, flag: 'nodt', why: WHY.nodt() }, { value: -f.m.v, flag: 'sign', why: WHY.sign() }, ...(f.ti ? [{ value: f.sj / f.tj, flag: 'origin', why: WHY.origin() }] : []),
        ...(dt !== 1 ? [{ value: ds / f.tj, flag: null, why: L(`Divide by the time between the two positions, Δt = ${num(f.tj)} s − ${num(f.ti)} s = ${num(dt)} s.`, `Teile durch die Zeit zwischen den beiden Orten, Δt = ${num(f.tj)} s − ${num(f.ti)} s = ${num(dt)} s.`) }] : []),
      ], L(`v = Δs/Δt from the two known positions of ${n}.`, `v = Δs/Δt aus den zwei bekannten Orten von ${n}.`));
    };
    const sQ = (n) => {
      const f = F[n], dt = f.tk - f.tb, back = dt < 0;
      return numQ(`s${n}`, L(`The position of ${n} at ${num(f.tk)} s:`, `Der Ort von ${n} bei ${num(f.tk)} s:`), L(`Where is ${n} at t = ${num(f.tk)} s?`, `Wo ist ${n} bei t = ${num(f.tk)} s?`), `${sub('s', n)}(${num(f.tk)}&nbsp;s)`, 'm', f.sk, [
        { value: f.sb - f.m.v * dt, flag: 'sign', why: back
          ? L(`Going back in time, the position changes the other way: Δt = ${num(f.tk)} s − ${num(f.tb)} s = ${num(dt)} s is negative.`, `Rückwärts in der Zeit ändert sich der Ort umgekehrt: Δt = ${num(f.tk)} s − ${num(f.tb)} s = ${num(dt)} s ist negativ.`)
          : WHY.sign() },
        ...(f.tb ? [{ value: f.sb + f.m.v * f.tk, flag: 'origin', why: L(`From ${num(f.tb)} s to ${num(f.tk)} s, the time is Δt = ${num(dt)} s, not ${num(f.tk)} s.`, `Von ${num(f.tb)} s bis ${num(f.tk)} s vergeht Δt = ${num(dt)} s, nicht ${num(f.tk)} s.`) }] : []),
        ...(f.tb === 0 && f.sb ? [{ value: f.m.v * f.tk, flag: 'origin', why: L(`v · t is how far ${n} has moved since t = 0; add the position where it started.`, `v · t ist, wie weit sich ${n} seit t = 0 bewegt hat; zähle den Ort dazu, wo es gestartet ist.`) }] : []),
        { value: f.sb, flag: null, why: L(`That is the position at ${num(f.tb)} s. ${n} moves on in between.`, `Das ist der Ort bei ${num(f.tb)} s. ${n} bewegt sich dazwischen weiter.`) },
      ], L(`Start from a known position of ${n} and add v · Δt.`, `Geh von einem bekannten Ort von ${n} aus und zähle v · Δt dazu.`));
    };
    const vLine = (n) => { const f = F[n]; return `${sub('v', n)} = (${num(f.sj)} m − ${br(f.si)}) / (${num(f.tj)} s − ${num(f.ti)} s) = ${sval(f.m.v, 'm/s')}`; };
    const sLine = (n) => { const f = F[n], dt = f.tk - f.tb; return `${sub('s', n)}(${num(f.tk)} s) = ${num(f.sb)} m + (${sval(f.m.v, 'm/s')}) · ${dt < 0 ? `(${num(dt)} s)` : `${num(dt)} s`} = ${val(f.sk, 'm')}`; };
    // the v(t) graph of both: two horizontal lines
    const vAx = { lo: -4, hi: 4, step: 2 };
    const vFig = (a, b) => graph('v', vAx, T, [
      { pts: [[0, a], [T, a]], name: 'A', at: T * 0.2, below: a < b },
      { pts: [[0, b], [T, b]], name: 'B', dash: true, at: T * 0.8, below: b < a },
    ], { label: L('Velocities of A and B against time', 'Geschwindigkeiten von A und B gegen die Zeit'), ...tTicks(T) });
    const q5 = choice('graph', L('Which v(t) graph belongs to A and B?', 'Welcher v(t)-Graph gehört zu A und B?'), r.shuffle([
      opt(vFig(A.v, B.v), true, null, ''),
      opt(vFig(-A.v, -B.v), false, 'sign', L('The signs are swapped: a vehicle whose position increases has v > 0, one whose position decreases v < 0.', 'Die Vorzeichen sind vertauscht: Ein Fahrzeug, dessen Ort zunimmt, hat v > 0, eines, dessen Ort abnimmt, v < 0.')),
      opt(vFig(B.v, A.v), false, null, L('This graph swaps A and B.', 'Dieser Graph vertauscht A und B.')),
      opt(vFig(Math.abs(A.v), Math.abs(B.v)), false, 'sign', L(`Both velocities are positive here. But ${A.v < 0 ? 'A' : 'B'} moves in the negative direction: its position decreases, so its v is negative.`, `Hier sind beide Geschwindigkeiten positiv. ${A.v < 0 ? 'A' : 'B'} bewegt sich aber in negativer Richtung: Sein Ort nimmt ab, also ist sein v negativ.`),
        L('Here both velocities are positive. Do the positions of both vehicles increase?', 'Hier sind beide Geschwindigkeiten positiv. Nehmen die Orte beider Fahrzeuge zu?')),
    ]), true);
    const velSteps = [
      step(L('Velocity of A', 'Geschwindigkeit von A'), L(`A moves uniformly, so the velocity follows from its two known positions: ${vLine('A')}.`, `A bewegt sich gleichförmig, also folgt die Geschwindigkeit aus seinen zwei bekannten Orten: ${vLine('A')}.`), fig()),
      step(L('Velocity of B', 'Geschwindigkeit von B'), L(`The same for B: ${vLine('B')}.`, `Dasselbe für B: ${vLine('B')}.`), fig()),
    ];
    if (gmode) {
      return finish('tablegraph', seed, 3, {
        data: { times, A, B },
        title: L('From the table to the graph', 'Von der Tabelle zum Graphen'),
        text: L('<p>Two vehicles A and B move uniformly. The table gives some of their positions.</p>', '<p>Zwei Fahrzeuge A und B bewegen sich gleichförmig. Die Tabelle gibt einige ihrer Orte an.</p>'),
        figure: fig(), questions: [q5],
        hints: [
          L('Uniform motion: the velocity is the same all the time, v = Δs/Δt from the two known positions.', 'Gleichförmige Bewegung: Die Geschwindigkeit ist die ganze Zeit gleich, v = Δs/Δt aus den zwei bekannten Orten.'),
          ['A', 'B'].map((n) => { const f = F[n]; return L(`${n}: Δs = ${num(f.sj)} m − ${br(f.si)} in Δt = ${num(f.tj - f.ti)} s.`, `${n}: Δs = ${num(f.sj)} m − ${br(f.si)} in Δt = ${num(f.tj - f.ti)} s.`); }).join(' '),
          L('In a v(t) graph, a uniform motion is a horizontal line at the height of its velocity, with its sign.', 'Im v(t)-Diagramm ist eine gleichförmige Bewegung eine waagrechte Gerade auf der Höhe ihrer Geschwindigkeit, mit Vorzeichen.'),
        ],
        steps: [...velSteps, step(L('The v(t) graph', 'Der v(t)-Graph'), L(`Each velocity stays the same all the time: two horizontal lines, A at ${sval(A.v, 'm/s')} and B at ${sval(B.v, 'm/s')}.`, `Jede Geschwindigkeit bleibt die ganze Zeit gleich: zwei waagrechte Geraden, A bei ${sval(A.v, 'm/s')} und B bei ${sval(B.v, 'm/s')}.`), vFig(A.v, B.v))],
      });
    }
    return finish('table', seed, 3, {
      data: { times, A, B },
      title: L('Completing a value table', 'Wertetabelle ergänzen'),
      text: L('<p>Two vehicles A and B move uniformly. The table gives some of their positions; complete it.</p>', '<p>Zwei Fahrzeuge A und B bewegen sich gleichförmig. Die Tabelle gibt einige ihrer Orte an; ergänze sie.</p>'),
      figure: fig(),
      questions: [vQ('A'), vQ('B'), sQ('A'), sQ('B')],
      hints: [
        L('Uniform motion: the position changes by the same amount in every second. So v = Δs/Δt from any two known positions.', 'Gleichförmige Bewegung: Der Ort ändert sich in jeder Sekunde um gleich viel. Also v = Δs/Δt aus zwei beliebigen bekannten Orten.'),
        ['A', 'B'].map((n) => { const f = F[n]; return L(`${n}: Δs = ${num(f.sj)} m − ${br(f.si)} in Δt = ${num(f.tj - f.ti)} s.`, `${n}: Δs = ${num(f.sj)} m − ${br(f.si)} in Δt = ${num(f.tj - f.ti)} s.`); }).join(' '),
        L('A missing position: start from a known one and add v · Δt (going back in time, Δt is negative).', 'Ein fehlender Ort: Geh von einem bekannten aus und zähle v · Δt dazu (rückwärts in der Zeit ist Δt negativ).'),
      ],
      steps: [
        ...velSteps,
        step(L('Missing positions', 'Fehlende Orte'), L(`From the nearest known position, add v · Δt (Δt negative when going back in time): ${sLine('A')}; ${sLine('B')}.`,
          `Vom nächsten bekannten Ort aus zählt man v · Δt dazu (Δt negativ, wenn man in der Zeit zurückgeht): ${sLine('A')}; ${sLine('B')}.`), fig()),
      ],
    });
  }

  // ---------------------------------------------------------------- graphs of a constantly accelerated motion
  // The s(t), v(t) or a(t) graph of s(t) = s₀ + v₀·t + a·t²/2 over 0 … T, to choose among three
  // wrong ones from typical mistakes, all four on one axis (so that the scale gives nothing away).
  // tau: the time step of the table or the picture (for the v(t) made of the mean velocities of
  // the steps, and for Δ(Δs) = a·τ² taken for a). A wrong graph that looks like one already
  // chosen is left out. Gives { question, right (the right graph, for the solution) }.
  const AXIS_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  function niceAxis(vals) {
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const pad = 0.12 * (hi - lo || 1);
    if (lo < 0) lo -= pad;
    if (hi > 0) hi += pad;
    const step = AXIS_STEPS.find((x) => (hi - lo) / x <= 5) || 200;
    return { lo: round(Math.floor(lo / step + 1e-9) * step), hi: round(Math.ceil(hi / step - 1e-9) * step), step };
  }
  // the time axis: a label every tau (or a step that divides T), grid lines in between
  function tTicks(T, tau) {
    if (tau) return { tLabel: tau, tStep: tau / 2 };
    if (T <= 6) return {};
    const lab = [1, 2, 5, 10].find((x) => T / x <= 8 && Number.isInteger(T / x)) || 5;
    return { tLabel: lab, tStep: lab >= 5 ? lab / 5 : lab / 2 };
  }
  // four graphs of quantity q, one right: options [[pts, flag (true: the right one), why], …];
  // the ones that look like an earlier one are left out
  const QLABEL = {
    s: () => L('Position against time', 'Ort gegen die Zeit'),
    v: () => L('Velocity against time', 'Geschwindigkeit gegen die Zeit'),
    a: () => L('Acceleration against time', 'Beschleunigung gegen die Zeit'),
  };
  function graphChoice(r, key, prompt, q, T, cands, o = {}) {
    const ts = Array.from({ length: 81 }, (z, k) => (k * T) / 80);
    const ys = (pts) => ts.map((t) => Figs.valueAt(pts, t));
    // alike: nowhere more than 6 % of the range of the right graph apart
    const own = niceAxis(cands[0][0].map((p) => p[1]));
    const span = own.hi - own.lo, kept = [], seen = [];
    for (const c of cands) {
      if (kept.length === 4) break;
      const y = ys(c[0]);
      if (seen.some((z) => Math.max(...z.map((w, i) => Math.abs(w - y[i]))) < 0.06 * span)) continue;
      kept.push(c); seen.push(y);
    }
    const axis = o.axis || niceAxis(kept.flatMap(([pts]) => pts.map((p) => p[1])));
    const draw = (pts, extra = {}) => graph(q, axis, T, [{ pts }], { label: QLABEL[q](), ...tTicks(T, o.tau), ...extra });
    return {
      question: choice(key, prompt, r.shuffle(kept.map(([pts, flag, why]) => opt(draw(pts), flag === true, flag === true ? null : flag, why || ''))), true),
      right: (extra) => draw(cands[0][0], extra),
    };
  }
  function accChoice(r, key, q, m) {
    const { s0, v0, a, T, tau } = m;
    const s = (t) => s0 + v0 * t + (a * t * t) / 2, vT = v0 + a * T;
    const curve = (f) => Array.from({ length: 41 }, (z, k) => [(k * T) / 40, f((k * T) / 40)]);
    const flat = (y) => [[0, y], [T, y]];
    const n = Math.round(T / tau);
    const means = Array.from({ length: n }, (z, k) => (s((k + 1) * tau) - s(k * tau)) / tau);
    const jumps = means.flatMap((g, k) => [[k * tau, g], [(k + 1) * tau, g]]);
    const dd = a * tau * tau;
    const prompt = L(`Which ${q}(t) graph belongs to this motion?`, `Welcher ${q}(t)-Graph gehört zu dieser Bewegung?`);
    const steadyWhy = L('This graph has the right start and end, but is a straight line: a constant velocity. The changes of position in equal times are not all the same, so the velocity changes.',
      'Dieser Graph hat den richtigen Anfang und das richtige Ende, ist aber eine Gerade: eine konstante Geschwindigkeit. Die Ortsänderungen in gleichen Zeiten sind nicht alle gleich, also ändert sich die Geschwindigkeit.');
    let cands, axis;
    if (q === 's') {
      cands = [
        [curve(s), true],
        [curve((t) => s0 + vT * t - (a * t * t) / 2), 'gaps', L('This graph has the right start and end, but it curves the other way: in it, the changes of position in equal times shrink where they grow in the motion, or grow where they shrink.',
          'Dieser Graph hat den richtigen Anfang und das richtige Ende, ist aber andersherum gekrümmt: In ihm schrumpfen die Ortsänderungen in gleichen Zeiten, wo sie in der Bewegung wachsen, oder wachsen, wo sie schrumpfen.')],
        [curve((t) => s(T - t)), 'order', L('This graph runs backwards in time: it starts where the motion ends. Start at t = 0 and follow the positions in the order of their times.',
          'Dieser Graph läuft rückwärts in der Zeit: Er beginnt, wo die Bewegung endet. Beginne bei t = 0 und folge den Orten in der Reihenfolge ihrer Zeiten.')],
        [[[0, s0], [T, s(T)]], null, steadyWhy],
        [curve((t) => s0 + v0 * t - (a * t * t) / 2), 'sign', L('This graph starts right, but curves the wrong way: the acceleration has the wrong sign. Where the changes of position in equal times grow (with their signs), a > 0.',
          'Dieser Graph beginnt richtig, ist aber falsch gekrümmt: Die Beschleunigung hat das falsche Vorzeichen. Wo die Ortsänderungen in gleichen Zeiten (mit Vorzeichen) wachsen, ist a > 0.')],
        [curve((t) => -s(t)), 'sign', L('This graph is mirrored: its positions have the wrong sign. Read the positions with their signs.', 'Dieser Graph ist gespiegelt: Seine Orte haben das falsche Vorzeichen. Lies die Orte mit ihren Vorzeichen.')],
      ];
    } else if (q === 'v') {
      cands = [
        [[[0, v0], [T, vT]], true],
        [[[0, vT], [T, v0]], 'gaps', L('This graph has the opposite slope: it starts with the final velocity and ends with the initial one. Large changes of position in equal times mean a large velocity.',
          'Dieser Graph hat die entgegengesetzte Steigung: Er beginnt mit der End- und endet mit der Anfangsgeschwindigkeit. Grosse Ortsänderungen in gleichen Zeiten bedeuten eine grosse Geschwindigkeit.')],
        [[[0, -v0], [T, -vT]], 'sign', L('Check the sign: where the position increases, v is positive; where it decreases, v is negative.', 'Achte auf das Vorzeichen: Wo der Ort zunimmt, ist v positiv; wo er abnimmt, ist v negativ.')],
        [jumps, null, L('With a constant acceleration, the velocity changes steadily, not in jumps: the change of position per time step is only its mean in that step, reached in its middle.',
          'Bei konstanter Beschleunigung ändert sich die Geschwindigkeit gleichmässig, nicht sprunghaft: Die Ortsänderung pro Zeitschritt ist nur ihr Mittelwert in diesem Schritt, erreicht in dessen Mitte.')],
        [[[0, 0], [T, vT]], null, L('This graph starts at rest. But already in the first time step the position changes: v is not 0 at t = 0.', 'Dieser Graph beginnt in Ruhe. Aber schon im ersten Zeitschritt ändert sich der Ort: v ist bei t = 0 nicht 0.')],
        [flat((s(T) - s0) / T), null, L('That is the mean velocity over the whole time, a constant. But the changes of position in equal times change, and so does v.', 'Das ist die mittlere Geschwindigkeit über die ganze Zeit, eine Konstante. Aber die Ortsänderungen in gleichen Zeiten ändern sich, und damit auch v.')],
      ];
    } else {
      const aVals = [a, -a, 0, ...(tau !== 1 && Math.abs(dd) <= 4 * Math.abs(a) ? [dd] : [])];
      axis = niceAxis(aVals);
      // v(t) taken for a(t): its shape, squeezed onto the axis of a if need be
      const k = Math.min(1, ...[v0, vT].map((y) => (y > 0 ? (0.9 * axis.hi) / y : y < 0 ? (0.9 * axis.lo) / y : 1)));
      cands = [
        [flat(a), true],
        [flat(-a), 'sign', L('The sign of a: a > 0 when v increases (with its sign), a < 0 when it decreases. Look at how the changes of position in equal times change, with their signs.',
          'Das Vorzeichen von a: a > 0, wenn v zunimmt (mit Vorzeichen), a < 0, wenn v abnimmt. Schau, wie sich die Ortsänderungen in gleichen Zeiten ändern, mit ihren Vorzeichen.')],
        [[[0, k * v0], [T, k * vT]], 'skip', L('That has the shape of the v(t) graph, a sloped line. The acceleration is the slope of v(t): with constant acceleration, a(t) is a horizontal line.',
          'Das hat die Form des v(t)-Graphen, eine schräge Gerade. Die Beschleunigung ist die Steigung von v(t): Bei konstanter Beschleunigung ist a(t) eine waagrechte Gerade.')],
        ...(aVals.length > 3 ? [[flat(dd), 'steps', L(`That is Δ(Δs) itself, in m. With time steps of ${num(tau)} s, Δ(Δs) = a · (${num(tau)} s)².`, `Das ist Δ(Δs) selbst, in m. Bei Zeitschritten von ${num(tau)} s ist Δ(Δs) = a · (${num(tau)} s)².`)]] : []),
        [flat(0), null, L('a = 0 would mean a constant velocity: equal changes of position in equal times. Here they change.', 'a = 0 hiesse konstante Geschwindigkeit: gleiche Ortsänderungen in gleichen Zeiten. Hier ändern sie sich.')],
      ];
    }
    return graphChoice(r, key, prompt, q, T, cands, { tau, axis });
  }

  // ---------------------------------------------------------------- atable: value table, constant acceleration
  // A cart (or, with long time steps, a car) with constant acceleration a, its positions at six
  // times τ apart: s(t) = s₀ + v₀·t + a·t²/2. The changes of position Δs over successive steps
  // change by the same Δ(Δs) = a·τ². Three neighbouring positions are given, so two Δs and their
  // change; of the other three, two are asked for (before, between or after them) and one is
  // given. Then the acceleration a = Δ(Δs)/τ², (★4) the velocity in the middle of the three, and
  // the s(t), v(t) or a(t) graph. ★3: τ = 1 or 2 s; ★4: τ = 0.5, 2, 3, 4 or 5 s.
  const TAU = {
    0.5: { as: [-4, -2, 2, 4], g: 3, max: 20 },
    1: { as: [-2, -1, 1, 2], g: 6, max: 40 },
    2: { as: [-2, -1, -0.5, 0.5, 1, 2], g: 12, max: 60 },
    3: { as: [-2, -1, 1, 2], g: 20, max: 120 },
    4: { as: [-1, -0.5, 0.5, 1], g: 30, max: 150 },
    5: { as: [-0.8, -0.4, 0.4, 0.8], g: 40, max: 200 },
  };
  function atable(seed, d, gmode = false) {
    const r = rng(seed);
    d = d || r.pick([3, 4]);
    const tau = r.pick(d === 3 ? [1, 2] : [0.5, 2, 3, 4, 5]), P = TAU[tau], n = 6;
    const times = Array.from({ length: n }, (z, k) => k * tau), cols = times.map((t, k) => k);
    const u = tau < 1 ? 0.5 : 1; // the first Δs in steps of u
    let a, g0, xs, b, asked, extra, vm;
    for (;;) {
      a = r.pick(P.as);
      g0 = u * r.int(-P.g / u, P.g / u);
      if (!g0) continue;
      xs = [r.int(-Math.round(P.max / 4), Math.round(P.max / 4))];
      for (let k = 0; k < n - 1; k++) xs.push(round(xs[k] + g0 + a * tau * tau * k));
      if (xs.some((x) => Math.abs(x) > P.max) || new Set(xs).size < n - 1) continue;
      b = r.int(0, n - 3); // the three neighbouring positions b, b + 1, b + 2
      const others = cols.filter((k) => k < b || k > b + 2);
      asked = r.shuffle(others.slice()).slice(0, 2).sort((p, q) => p - q);
      extra = others.find((k) => !asked.includes(k));
      vm = round((xs[b + 2] - xs[b]) / (2 * tau)); // the velocity at the middle one, (b + 1)·τ
      if (d === 4 && !nice(vm)) continue;
      break;
    }
    const DD = round(a * tau * tau), v0 = g0 / tau - (a * tau) / 2;
    const gaps = xs.slice(1).map((x, k) => round(x - xs[k]));
    // with a graph to choose, the table is complete
    if (gmode) asked = [];
    const known = gmode ? cols.slice() : [b, b + 1, b + 2, extra];
    // each missing position from a neighbour already known: forward from the left or back from the right
    const how = {}, have = new Set(known), order = [];
    while (order.length < asked.length) {
      for (const k of asked) {
        if (k in how) continue;
        if (have.has(k - 1)) how[k] = 'fwd';
        else if (have.has(k + 1)) how[k] = 'back';
        else continue;
        have.add(k); order.push(k);
      }
    }
    const car = tau >= 3;
    const body = () => (car ? L('car', 'Wagen') : L('cart', 'Wagen'));
    const sv = (x, unit) => sval(x, unit), dif = (x) => `${x > 0 ? '+' : ''}${num(x)}`;
    const pm = (x) => `${x < 0 ? '−' : '+'} ${num(Math.abs(x))}`;
    const ts = `${num(tau)}&nbsp;s`;
    const sAt = (k) => `${it('s')}(${num(times[k])}&nbsp;s)`;
    const row = (all) => ({ name: '', values: times.map((t, k) => (known.includes(k) || all ? xs[k] : asked.includes(k) ? null : '')) });
    const shown = (k) => known.includes(k) && known.includes(k + 1); // Δs from column k to k + 1 given at the start
    // all: every value; 'blank': fields for the student to fill in
    const dsRow = (all) => ({ head: 'Δ<i>s</i> in m', values: ['', ...gaps.map((g, k) => (all === 'blank' ? null : all || shown(k) ? dif(g) : ''))] });
    const ddRow = (all) => ({ head: 'Δ(Δ<i>s</i>) in m', values: ['', '', ...gaps.slice(1).map((g, k) => (all === 'blank' ? null : all || (shown(k) && shown(k + 1)) ? dif(DD) : ''))] });
    const fig = (o = {}) => table(times, [row(!!o.all), ...(o.rows || [])]);
    // the task's table, with empty rows for the changes of position and their change
    const taskFig = () => fig({ rows: [dsRow('blank'), ddRow('blank')] });
    const linear = L(`That continues with the neighbouring change of position, as if the velocity stayed the same. But with the acceleration, Δs changes by Δ(Δs) every ${num(tau)} s.`,
      `Das setzt mit der benachbarten Ortsänderung fort, als bliebe die Geschwindigkeit gleich. Mit der Beschleunigung ändert sich Δs aber alle ${num(tau)} s um Δ(Δs).`);
    const questions = order.map((k) => {
      const fwd = how[k] === 'fwd';
      const traps = fwd
        ? (k >= 2 ? [
          { value: xs[k - 1] + gaps[k - 2], flag: 'linear', why: linear },
          { value: xs[k - 1] + gaps[k - 2] - DD, flag: 'sign', why: L('Δs changes by Δ(Δs) every step, with its sign: the next Δs is the one before plus Δ(Δs).', 'Δs ändert sich jeden Schritt um Δ(Δs), mit Vorzeichen: Das nächste Δs ist das vorherige plus Δ(Δs).') },
        ] : [])
        : (k + 1 <= n - 2 ? [
          { value: xs[k + 1] - gaps[k + 1], flag: 'linear', why: linear },
          { value: xs[k + 1] - gaps[k + 1] - DD, flag: 'sign', why: L('Going back, each Δs is the one after it minus Δ(Δs), with its sign.', 'Rückwärts ist jedes Δs das nachfolgende minus Δ(Δs), mit Vorzeichen.') },
        ] : []).concat([
          { value: xs[k + 1] + gaps[k], flag: null, why: L(`Going back in time from ${sAt(k + 1)}, subtract the Δs of that step.`, `Rückwärts in der Zeit von ${sAt(k + 1)} aus ziehst du das Δs dieses Schritts ab.`) },
        ]);
      return numQ(`s${k}`, L(`The position at ${num(times[k])} s:`, `Der Ort bei ${num(times[k])} s:`), L(`Where is the ${body()} at t = ${num(times[k])} s?`, `Wo ist der Wagen bei t = ${num(times[k])} s?`), sAt(k), 'm', xs[k], traps,
        fwd ? L('The next Δs is the one before plus Δ(Δs).', 'Das nächste Δs ist das vorherige plus Δ(Δs).') : L('Going back, each Δs is the one after it minus Δ(Δs).', 'Rückwärts ist jedes Δs das nachfolgende minus Δ(Δs).'));
    });
    questions.push(numQ('a', L(`The acceleration of the ${body()}:`, 'Die Beschleunigung des Wagens:'), L(`What is the acceleration of the ${body()}?`, 'Wie gross ist die Beschleunigung des Wagens?'), it('a'), 'm/s²', a, [
      { value: -a, flag: 'sign', why: L(`Take the changes with their signs: from ${sv(gaps[b], 'm')} to ${sv(gaps[b + 1], 'm')} is a change of ${sv(DD, 'm')}.`, `Nimm die Änderungen mit Vorzeichen: Von ${sv(gaps[b], 'm')} zu ${sv(gaps[b + 1], 'm')} ist eine Änderung von ${sv(DD, 'm')}.`) },
      ...(tau !== 1 ? [
        { value: DD, flag: 'steps', why: L(`That is Δ(Δs) itself. The time step is ${ts}, so Δ(Δs) = a · (${ts})²: divide by ${num(tau * tau)} s².`, `Das ist Δ(Δs) selbst. Der Zeitschritt ist ${ts}, also ist Δ(Δs) = a · (${ts})²: Teile durch ${num(tau * tau)} s².`) },
        { value: DD / tau, flag: 'steps', why: L(`Δ(Δs) = a · (${ts})²: divide by the square of the time step, not by the time step.`, `Δ(Δs) = a · (${ts})²: Teile durch das Quadrat des Zeitschritts, nicht durch den Zeitschritt.`) },
      ] : [
        { value: a / 2, flag: null, why: L('The Δs change by a · (1 s)² from one second to the next: a is that change itself, not half of it.', 'Die Δs ändern sich von einer Sekunde zur nächsten um a · (1 s)²: a ist diese Änderung selbst, nicht die Hälfte davon.') },
        { value: gaps[b + 1], flag: null, why: L('That is a change of position in one second, which corresponds to a mean velocity. The acceleration is how much it changes from one second to the next, divided by (1 s)².', 'Das ist eine Ortsänderung in einer Sekunde, sie entspricht einer mittleren Geschwindigkeit. Die Beschleunigung ist, um wie viel sie sich von einer Sekunde zur nächsten ändert, geteilt durch (1 s)².') },
      ]),
    ], L(`a = Δ(Δs) / (${ts})².`, `a = Δ(Δs) / (${ts})².`)));
    const tm = times[b + 1];
    if (d === 4) {
      questions.push(numQ('vm', L(`The velocity at ${num(tm)} s:`, `Die Geschwindigkeit bei ${num(tm)} s:`), L(`What is the velocity of the ${body()} at t = ${num(tm)} s?`, `Wie gross ist die Geschwindigkeit des Wagens bei t = ${num(tm)} s?`), `${it('v')}(${num(tm)}&nbsp;s)`, 'm/s', vm, [
        { value: gaps[b] / tau, flag: null, why: L(`That is the mean velocity from ${num(times[b])} s to ${num(tm)} s, reached in the middle of that step. For ${num(tm)} s, take the interval around it: from ${num(times[b])} s to ${num(times[b + 2])} s.`, `Das ist die mittlere Geschwindigkeit von ${num(times[b])} s bis ${num(tm)} s, erreicht in der Mitte dieses Schritts. Für ${num(tm)} s nimm das Intervall darum herum: von ${num(times[b])} s bis ${num(times[b + 2])} s.`) },
        { value: gaps[b + 1] / tau, flag: null, why: L(`That is the mean velocity from ${num(tm)} s to ${num(times[b + 2])} s, reached in the middle of that step. For ${num(tm)} s, take the interval around it: from ${num(times[b])} s to ${num(times[b + 2])} s.`, `Das ist die mittlere Geschwindigkeit von ${num(tm)} s bis ${num(times[b + 2])} s, erreicht in der Mitte dieses Schritts. Für ${num(tm)} s nimm das Intervall darum herum: von ${num(times[b])} s bis ${num(times[b + 2])} s.`) },
        { value: xs[b + 1] / tm, flag: 'origin', why: WHY.origin() },
        ...(tau !== 1 ? [{ value: (xs[b + 2] - xs[b]) / 2, flag: 'nodt', why: WHY.nodt() }] : []),
      ], L(`With constant acceleration, the mean velocity from ${num(times[b])} s to ${num(times[b + 2])} s is the velocity in the middle, at ${num(tm)} s.`, `Bei konstanter Beschleunigung ist die mittlere Geschwindigkeit von ${num(times[b])} s bis ${num(times[b + 2])} s die Geschwindigkeit in der Mitte, bei ${num(tm)} s.`)));
    }
    const gq = r.pick(['s', 'v', 'a']);
    const G = accChoice(r, 'graph', gq, { s0: xs[0], v0, a, T: times[n - 1], tau });
    const fill = order.map((k) => (how[k] === 'fwd'
      ? `${sAt(k)} = ${num(xs[k - 1])} m ${pm(gaps[k - 1])} m = ${val(xs[k], 'm')}`
      : `${sAt(k)} = ${num(xs[k + 1])} m ${pm(-gaps[k])} m = ${val(xs[k], 'm')}`));
    const back = order.some((k) => how[k] === 'back'), fwd = order.some((k) => how[k] === 'fwd');
    const graphText = {
      s: L(`With constant acceleration, s(t) is a parabola through the points of the table, curved ${a > 0 ? 'upwards (a &gt; 0)' : 'downwards (a &lt; 0)'}.`, `Bei konstanter Beschleunigung ist s(t) eine Parabel durch die Punkte der Tabelle, ${a > 0 ? 'nach oben gekrümmt (a &gt; 0)' : 'nach unten gekrümmt (a &lt; 0)'}.`),
      v: L(`With constant acceleration, v(t) is a straight line with slope a = ${sv(a, 'm/s²')}, from ${sv(v0, 'm/s')} at t = 0 to ${sv(v0 + a * times[n - 1], 'm/s')} at ${num(times[n - 1])} s.`, `Bei konstanter Beschleunigung ist v(t) eine Gerade mit der Steigung a = ${sv(a, 'm/s²')}, von ${sv(v0, 'm/s')} bei t = 0 bis ${sv(v0 + a * times[n - 1], 'm/s')} bei ${num(times[n - 1])} s.`),
      a: L(`The acceleration is the same all the time: a(t) is a horizontal line at a = ${sv(a, 'm/s²')}.`, `Die Beschleunigung ist die ganze Zeit gleich: a(t) ist eine waagrechte Gerade bei a = ${sv(a, 'm/s²')}.`),
    }[gq];
    const hints = [
      L(`The positions are given every ${ts}. Where two neighbouring positions are given, work out the change of position Δs from one column to the next.`, `Die Orte sind alle ${ts} gegeben. Wo zwei benachbarte Orte gegeben sind, bestimme die Ortsänderung Δs von einer Spalte zur nächsten.`),
      L(`From ${sAt(b)} to ${sAt(b + 2)}: Δs = ${dif(gaps[b])} m and ${dif(gaps[b + 1])} m, a change of Δ(Δs) = ${dif(DD)} m. With constant acceleration, Δs changes by this same amount every ${ts}.`,
        `Von ${sAt(b)} bis ${sAt(b + 2)}: Δs = ${dif(gaps[b])} m und ${dif(gaps[b + 1])} m, eine Änderung von Δ(Δs) = ${dif(DD)} m. Bei konstanter Beschleunigung ändert sich Δs alle ${ts} um genau so viel.`),
      L(`Continue the Δs${fwd ? ' forwards (add Δ(Δs))' : ''}${fwd && back ? ' and' : ''}${back ? ' backwards (subtract Δ(Δs))' : ''}, and add them to the positions. The acceleration follows from Δ(Δs) = a · (${ts})².`,
        `Setze die Δs fort${fwd ? ' vorwärts (Δ(Δs) dazuzählen)' : ''}${fwd && back ? ' und' : ''}${back ? ' rückwärts (Δ(Δs) abziehen)' : ''}, und zähle sie zu den Orten dazu. Die Beschleunigung folgt aus Δ(Δs) = a · (${ts})².`),
      ...(d === 4 ? [L(`With constant acceleration, the mean velocity over an interval is the velocity in its middle: v(${num(tm)} s) = (${sAt(b + 2)} − ${sAt(b)}) / ${num(2 * tau)} s.`, `Bei konstanter Beschleunigung ist die mittlere Geschwindigkeit über ein Intervall gleich der Geschwindigkeit in seiner Mitte: v(${num(tm)} s) = (${sAt(b + 2)} − ${sAt(b)}) / ${num(2 * tau)} s.`)] : []),
    ];
    const steps = [
      step(L(`Changes of position per ${num(tau)} s`, `Ortsänderungen pro ${num(tau)} s`),
        L(`The positions are given at times ${ts} apart. So first work out how far the ${body()} moves in each step: Δs = s(t + ${ts}) − s(t), from one column to the next, where both positions are given.`,
          `Die Orte sind zu Zeiten im Abstand von ${ts} gegeben. Bestimme also zuerst, wie weit der Wagen in jedem Schritt fährt: Δs = s(t + ${ts}) − s(t), von einer Spalte zur nächsten, wo beide Orte gegeben sind.`),
        fig({ rows: [dsRow(false)] })),
      step(L('A constant change of Δs', 'Eine konstante Änderung von Δs'),
        L(`The Δs themselves change by the same amount from one step to the next: Δ(Δs) = ${dif(DD)} m. That is what constant acceleration means, and it lets us continue the table.`, `Die Δs ändern sich selbst von einem Schritt zum nächsten um gleich viel: Δ(Δs) = ${dif(DD)} m. Das bedeutet konstante Beschleunigung, und damit lässt sich die Tabelle fortsetzen.`),
        fig({ rows: [dsRow(false), ddRow(false)] })),
      step(L('The missing Δs', 'Die fehlenden Δs'),
        L(`${fwd ? `Forwards, each Δs is the one before plus Δ(Δs) = ${dif(DD)} m. ` : ''}${back ? `Backwards, each Δs is the one after it minus Δ(Δs). ` : ''}So the Δs are ${gaps.map(dif).join(', ')} m.`,
          `${fwd ? `Vorwärts ist jedes Δs das vorherige plus Δ(Δs) = ${dif(DD)} m. ` : ''}${back ? `Rückwärts ist jedes Δs das nachfolgende minus Δ(Δs). ` : ''}Die Δs sind also ${gaps.map(dif).join(', ')} m.`),
        fig({ rows: [dsRow(true), ddRow(true)] })),
      step(L('The missing positions', 'Die fehlenden Orte'),
        L(`Step by step from a known neighbour: ${fill.join(', ')}.`, `Schritt für Schritt von einem bekannten Nachbarn aus: ${fill.join(', ')}.`),
        fig({ all: true, rows: [dsRow(true), ddRow(true)] })),
      step(L('The acceleration', 'Die Beschleunigung'),
        tau === 1
          ? L(`Each Δs corresponds to the mean velocity in that second, so Δ(Δs) is how much this velocity grows from one second to the next: Δ(Δs) = a · (1 s)², so a = ${dif(DD)} m / (1 s)² = ${sv(a, 'm/s²')}.`, `Jedes Δs entspricht der mittleren Geschwindigkeit in dieser Sekunde, also sagt Δ(Δs), um wie viel diese Geschwindigkeit von einer Sekunde zur nächsten zunimmt: Δ(Δs) = a · (1 s)², also a = ${dif(DD)} m / (1 s)² = ${sv(a, 'm/s²')}.`)
          : L(`Each Δs is the mean velocity in its step times ${ts}, and that mean velocity changes by a · ${ts} from one step to the next. So Δ(Δs) = a · (${ts})² = a · ${num(tau * tau)} s²: a = ${dif(DD)} m / ${num(tau * tau)} s² = ${sv(a, 'm/s²')}.`,
            `Jedes Δs ist die mittlere Geschwindigkeit in seinem Schritt mal ${ts}, und diese mittlere Geschwindigkeit ändert sich von einem Schritt zum nächsten um a · ${ts}. Also ist Δ(Δs) = a · (${ts})² = a · ${num(tau * tau)} s²: a = ${dif(DD)} m / ${num(tau * tau)} s² = ${sv(a, 'm/s²')}.`),
        fig({ all: true, rows: [dsRow(true), ddRow(true)] })),
      ...(d === 4 ? [step(L(`The velocity at ${num(tm)} s`, `Die Geschwindigkeit bei ${num(tm)} s`),
        L(`With constant acceleration, the mean velocity over an interval is reached in its middle. ${num(tm)} s is the middle of ${interval(times[b], times[b + 2])}: v(${num(tm)} s) = (${num(xs[b + 2])} m − ${xs[b] < 0 ? `(${num(xs[b])} m)` : `${num(xs[b])} m`}) / ${num(2 * tau)} s = ${sv(vm, 'm/s')}.`,
          `Bei konstanter Beschleunigung wird die mittlere Geschwindigkeit eines Intervalls in seiner Mitte erreicht. ${num(tm)} s ist die Mitte von ${interval(times[b], times[b + 2])}: v(${num(tm)} s) = (${num(xs[b + 2])} m − ${xs[b] < 0 ? `(${num(xs[b])} m)` : `${num(xs[b])} m`}) / ${num(2 * tau)} s = ${sv(vm, 'm/s')}.`),
        fig({ all: true, rows: [dsRow(true), ddRow(true)] }))] : []),
    ];
    const graphStep = step(L(`The ${gq}(t) graph`, `Der ${gq}(t)-Graph`), graphText, G.right(gq === 's' ? { dots: xs.map((x, k) => [times[k], x]) } : {}));
    if (gmode) {
      // the changes of position, their constant change and the acceleration, then the graph
      return finish('atablegraph', seed, d, {
        data: { times, xs, a, step: tau, graph: gq },
        title: L('From the table to the graph', 'Von der Tabelle zum Graphen'),
        text: L(`<p>A ${body()} moves along a straight ${car ? 'road' : 'track'} with constant acceleration. The table gives its position every ${ts}.</p>`,
          `<p>Ein Wagen bewegt sich mit konstanter Beschleunigung auf einer geraden ${car ? 'Strasse' : 'Bahn'}. Die Tabelle gibt seinen Ort alle ${ts} an.</p>`),
        figure: taskFig(), questions: [G.question],
        hints: [hints[0], L(`The Δs change by Δ(Δs) = ${dif(DD)} m from step to step: Δ(Δs) = a · (${ts})².`, `Die Δs ändern sich von Schritt zu Schritt um Δ(Δs) = ${dif(DD)} m: Δ(Δs) = a · (${ts})².`),
          { s: L('s(t) is a parabola through the points of the table.', 's(t) ist eine Parabel durch die Punkte der Tabelle.'), v: L('With constant acceleration, v(t) is a straight line; each Δs/Δt is the velocity in the middle of its step.', 'Bei konstanter Beschleunigung ist v(t) eine Gerade; jedes Δs/Δt ist die Geschwindigkeit in der Mitte seines Schritts.'), a: L('With constant acceleration, a(t) is a horizontal line at the value of a.', 'Bei konstanter Beschleunigung ist a(t) eine waagrechte Gerade beim Wert von a.') }[gq]],
        steps: [steps[0], steps[1], steps[4], graphStep],
      });
    }
    return finish('atable', seed, d, {
      data: { times, xs, a, step: tau, b, asked, order, vm },
      title: L('Value table with acceleration', 'Wertetabelle mit Beschleunigung'),
      text: L(`<p>A ${body()} moves along a straight ${car ? 'road' : 'track'} with constant acceleration. The table gives its position every ${ts}, with gaps; complete it.</p>`,
        `<p>Ein Wagen bewegt sich mit konstanter Beschleunigung auf einer geraden ${car ? 'Strasse' : 'Bahn'}. Die Tabelle gibt seinen Ort alle ${ts} an, mit Lücken; ergänze sie.</p>`),
      figure: taskFig(),
      questions,
      hints,
      steps,
    });
  }

  // ---------------------------------------------------------------- strobe (C1.3, C1.4)
  // A cart with constant acceleration, one dot per second on a number line from −7 to 7 m:
  // s(t) = s₀ + v₀·t + a·t²/2. The distances moved in successive seconds then change by the same
  // amount a·(1 s)² each second; each one corresponds to the mean velocity in that second, which the cart
  // reaches in its middle, so v(t) is the straight line through them. The patterns below keep
  // the positions whole metres. ★2: which s(t) graph fits; ★3: which v(t) graph, and the
  // acceleration.
  const PATTERNS = [
    { gaps: [1, 2, 3, 4], how: 'speedup' },
    { gaps: [2, 3, 4, 5], how: 'speedup' },
    { gaps: [1, 3, 5], how: 'speedup' }, // from rest
    { gaps: [4, 3, 2, 1], how: 'slowdown' },
    { gaps: [5, 3, 1], how: 'slowdown' }, // to rest
    { gaps: [3, 1, -1, -3, -5], how: 'turn' },
    { gaps: [5, 3, 1, -1, -3], how: 'turn' },
  ];
  function strobeEx(seed, d, gmode = false) {
    const r = rng(seed);
    d = d || r.pick([2, 3]);
    const pat = r.pick(PATTERNS), dir = r.pick([1, -1]);
    const gaps = pat.gaps.map((g) => dir * g), n = gaps.length;
    const acc = gaps[1] - gaps[0];                       // m/s²
    const v0 = gaps[0] - acc / 2;                        // m/s, at t = 0
    const posOf = (gs, x0) => gs.reduce((xs, g) => [...xs, xs[xs.length - 1] + g], [x0]);
    // the wrong patterns: the distances in the opposite order (large ↔ small, the opposite
    // acceleration), the time order reversed, and a steady motion between the same ends
    const inv = gaps.slice().reverse();
    // a start that keeps the motion and the reversed one on the number line
    const span = [...posOf(gaps, 0), ...posOf(inv, 0)], lo = Math.min(...span), hi = Math.max(...span);
    const x0 = r.pick(Array.from({ length: 15 }, (x, k) => k - 7).filter((x) => x + lo >= -7 && x + hi <= 7));
    const xs = posOf(gaps, x0);
    const sAt = (gs, x, t) => { const a = gs[1] - gs[0], u = gs[0] - a / 2; return x + u * t + (a * t * t) / 2; };
    const curve = (gs, x) => Array.from({ length: 4 * n + 1 }, (z, k) => [k / 4, sAt(gs, x, k / 4)]);
    const sAxis = { lo: -8, hi: 8, step: 4 }, vAxis = { lo: -6, hi: 6, step: 2 };
    const sGraph = (pts, o = {}) => graph('s', sAxis, n, [{ pts }], { label: L('Position against time', 'Ort gegen die Zeit'), ...o });
    const vLine = (gs) => { const a = gs[1] - gs[0], u = gs[0] - a / 2; return [[0, u], [n, u + a * n]]; };
    const vGraph = (pts, o = {}) => graph('v', vAxis, n, [{ pts }], { label: L('Velocity against time', 'Geschwindigkeit gegen die Zeit'), ...o });
    const steps = (gs) => gs.flatMap((g, k) => [[k, g], [k + 1, g]]);
    const means = gaps.map((g, k) => [k + 0.5, g]);
    const WHYG = {
      gaps: () => L('Large gaps between neighbouring dots mean many metres in one second: fast, not slow. Read the dots in the order of their times.', 'Grosse Abstände zwischen benachbarten Punkten bedeuten viele Meter in einer Sekunde: schnell, nicht langsam. Lies die Punkte in der Reihenfolge ihrer Zeiten.'),
      order: () => L('Start at t = 0: the graph starts where the dot of t = 0 is, and follows the dots in the order of their times.', 'Beginne bei t = 0: Der Graph beginnt dort, wo der Punkt von t = 0 liegt, und folgt den Punkten in der Reihenfolge ihrer Zeiten.'),
      steady: () => L('This graph has the right start and end, but a constant velocity. In the picture, the distances between the dots change: the velocity changes.', 'Dieser Graph hat den richtigen Anfang und das richtige Ende, aber eine konstante Geschwindigkeit. Im Bild ändern sich die Abstände zwischen den Punkten: Die Geschwindigkeit ändert sich.'),
      sign: () => L(`At first the dots move towards ${dir > 0 ? 'larger' : 'smaller'} s, so v starts ${dir > 0 ? 'positive' : 'negative'}.`, `Zuerst wandern die Punkte zu ${dir > 0 ? 'grösseren' : 'kleineren'} s, also ist v zuerst ${dir > 0 ? 'positiv' : 'negativ'}.`),
      signNudge: () => L('Check the sign of v: which way do the dots move at first?', 'Prüfe das Vorzeichen von v: In welche Richtung wandern die Punkte zuerst?'),
      jumps: () => L('With a constant acceleration, the velocity changes steadily, not in jumps once a second: the distance per second is only its mean in that second, reached in its middle.', 'Bei konstanter Beschleunigung ändert sich die Geschwindigkeit gleichmässig, nicht sprunghaft einmal pro Sekunde: Der Abstand pro Sekunde ist nur ihr Mittelwert in dieser Sekunde, erreicht in deren Mitte.'),
    };
    // with a graph to choose: ★2 the s(t) graph, ★3 the v(t) or the a(t) graph; else questions
    const gq = d === 2 ? 's' : r.pick(['v', 'a']);
    const graphQs = [];
    if (gq === 's') {
      graphQs.push(choice('graph', L('Which s(t) graph belongs to this motion?', 'Welcher s(t)-Graph gehört zu dieser Bewegung?'), r.shuffle([
        opt(sGraph(curve(gaps, x0)), true, null, ''),
        opt(sGraph(curve(inv, x0)), false, 'gaps', WHYG.gaps()),
        opt(sGraph(curve(gaps, x0).map(([t]) => [t, sAt(gaps, x0, n - t)])), false, 'order', WHYG.order()),
        opt(sGraph([[0, xs[0]], [n, xs[n]]]), false, null, WHYG.steady()),
      ]), true));
    } else if (gq === 'v') {
      graphQs.push(choice('graph', L('Which v(t) graph belongs to this motion?', 'Welcher v(t)-Graph gehört zu dieser Bewegung?'), r.shuffle([
        opt(vGraph(vLine(gaps)), true, null, ''),
        opt(vGraph(vLine(inv)), false, 'gaps', WHYG.gaps()),
        opt(vGraph(vLine(gaps.map((g) => -g))), false, 'sign', WHYG.sign(), WHYG.signNudge()),
        opt(vGraph(steps(gaps)), false, null, WHYG.jumps()),
      ]), true));
    }
    const A = gq === 'a' ? accChoice(r, 'graph', 'a', { s0: x0, v0, a: acc, T: n, tau: 1 }) : null;
    if (A) graphQs.push(A.question);
    const questions = [];
    // ★2: in which second the cart is fastest (the largest distance between neighbouring dots)
    if (d === 2) {
      const ks = gaps.map((g, k) => k), fast = ks.reduce((m, k) => (Math.abs(gaps[k]) > Math.abs(gaps[m]) ? k : m), 0);
      const slow = ks.reduce((m, k) => (Math.abs(gaps[k]) < Math.abs(gaps[m]) ? k : m), 0);
      const pickK = [fast, slow, ...r.shuffle(ks.filter((k) => k !== fast && k !== slow))].slice(0, 4).sort((x, y) => x - y);
      questions.push(choice('fastest', L('In which second does the cart move fastest?', 'In welcher Sekunde fährt der Wagen am schnellsten?'), pickK.map((k) =>
        opt(interval(k, k + 1), k === fast, k === slow ? 'gaps' : null, k === slow ? WHYG.gaps()
          : L(`In this second the cart moves ${val(Math.abs(gaps[k]), 'm')}: compare with the distances in the other seconds.`, `In dieser Sekunde fährt der Wagen ${val(Math.abs(gaps[k]), 'm')}: Vergleiche mit den Strecken in den anderen Sekunden.`)))));
    }
    // how the cart moves, as the answer and in the sentence "So the cart …"
    const HOW = {
      speedup: () => L('gets faster and faster', 'wird immer schneller'),
      slowdown: () => L('gets slower and slower', 'wird immer langsamer'),
      steady: () => L('moves at a steady speed', 'fährt immer gleich schnell'),
      turn: () => L('slows down and turns back', 'bremst ab und kehrt um'),
    };
    const invHow = { speedup: 'slowdown', slowdown: 'speedup', turn: 'steady' }[pat.how];
    questions.push(choice('how', L('How does the cart move?', 'Wie bewegt sich der Wagen?'), r.shuffle(['speedup', 'slowdown', 'steady', 'turn'].map((h) =>
      opt(HOW[h](), h === pat.how, h === invHow && pat.how !== 'turn' ? 'gaps' : null, h === invHow && pat.how !== 'turn' ? WHYG.gaps()
        : h === 'turn' ? L('The dots keep moving the same way; the cart does not come back.', 'Die Punkte wandern immer in dieselbe Richtung; der Wagen kommt nicht zurück.')
          : pat.how === 'turn' ? L('Look at the times: after a while the dots come back towards the start.', 'Schau auf die Zeiten: Nach einer Weile kommen die Punkte zum Start zurück.')
            : L('Compare the distances between neighbouring dots: they are not all the same.', 'Vergleiche die Abstände zwischen benachbarten Punkten: Sie sind nicht alle gleich.'))))));
    if (d === 3) {
      questions.push(numQ('a', L('The acceleration of the cart:', 'Die Beschleunigung des Wagens:'), L('What is the acceleration of the cart?', 'Wie gross ist die Beschleunigung des Wagens?'), it('a'), 'm/s²', acc, [
        { value: -acc, flag: 'sign', why: L(`The distances per second ${acc * dir > 0 ? 'grow' : 'shrink'} in the direction of motion${pat.how === 'turn' ? ' at first' : ''}: work out the sign from how the signed distance changes, from ${sval(gaps[0], 'm')} to ${sval(gaps[1], 'm')}.`,
          `Die Abstände pro Sekunde ${acc * dir > 0 ? 'wachsen' : 'schrumpfen'}${pat.how === 'turn' ? ' zuerst' : ''} in Bewegungsrichtung: Bestimme das Vorzeichen daraus, wie sich der Abstand mit Vorzeichen ändert, von ${sval(gaps[0], 'm')} auf ${sval(gaps[1], 'm')}.`),
          nudge: L(`Check the sign: how does the signed distance per second change, from ${sval(gaps[0], 'm')} to ${sval(gaps[1], 'm')}?`,
            `Prüfe das Vorzeichen: Wie ändert sich der Abstand pro Sekunde mit Vorzeichen, von ${sval(gaps[0], 'm')} auf ${sval(gaps[1], 'm')}?`) },
        { value: gaps[n - 1], flag: null, why: L('That is the distance moved in the last second, which corresponds to a mean velocity. The acceleration is how much this distance changes from one second to the next, per second squared.', 'Das ist der Abstand in der letzten Sekunde, er entspricht einer mittleren Geschwindigkeit. Die Beschleunigung ist, um wie viel sich dieser Abstand von einer Sekunde zur nächsten ändert, pro Sekunde im Quadrat.') },
        { value: acc / 2, flag: null, why: L('The distances per second change by a · (1 s)² from one second to the next, so a is that change itself, not half of it.', 'Die Abstände pro Sekunde ändern sich von einer Sekunde zur nächsten um a · (1 s)², also ist a diese Änderung selbst, nicht die Hälfte davon.') },
      ], L('a = (change of the distance per second) / (1 s)².', 'a = (Änderung des Abstands pro Sekunde) / (1 s)².')));
    }
    const fig = () => strobe(xs, -7, 7, { label: L('Stroboscope picture: one dot per second', 'Stroboskopaufnahme: ein Punkt pro Sekunde') });
    const gapText = gaps.map((g, k) => `${k}–${k + 1} s: ${g > 0 ? '+' : ''}${num(g)} m`).join(', ');
    const S = {
      gaps: step(L('Distances per second', 'Abstände pro Sekunde'), L(`From one dot to the next, the cart moves: ${gapText}. They change by ${sval(acc, 'm')} each second: a constant acceleration a = ${sval(acc, 'm/s²')}.`,
        `Von einem Punkt zum nächsten fährt der Wagen: ${gapText}. Sie ändern sich jede Sekunde um ${sval(acc, 'm')}: eine konstante Beschleunigung a = ${sval(acc, 'm/s²')}.`), fig()),
      s: step(L('The s(t) graph', 'Der s(t)-Graph'), L('Each dot gives a point (t, s). With constant acceleration, s(t) is a parabola through these points.', 'Jeder Punkt gibt einen Punkt (t, s). Bei konstanter Beschleunigung ist s(t) eine Parabel durch diese Punkte.'),
        sGraph(curve(gaps, x0), { dots: xs.map((x, k) => [k, x]) })),
      v: step(L('The v(t) graph', 'Der v(t)-Graph'), L(`The distance in each second corresponds to the mean velocity in that second, reached in its middle (dots). v(t) is the straight line through them, from ${sval(v0, 'm/s')} at t = 0 with slope a = ${sval(acc, 'm/s²')}. So the cart ${HOW[pat.how]()}.`,
        `Der Abstand in jeder Sekunde entspricht der mittleren Geschwindigkeit in dieser Sekunde, erreicht in deren Mitte (Punkte). v(t) ist die Gerade durch sie, von ${sval(v0, 'm/s')} bei t = 0 mit der Steigung a = ${sval(acc, 'm/s²')}. Der Wagen ${HOW[pat.how]()}.`),
        vGraph(vLine(gaps), { dots: means })),
      a: () => step(L('The a(t) graph', 'Der a(t)-Graph'), L(`The acceleration is the slope of v(t), the same all the time: a(t) is a horizontal line at a = ${sval(acc, 'm/s²')}.`,
        `Die Beschleunigung ist die Steigung von v(t), die ganze Zeit gleich: a(t) ist eine waagrechte Gerade bei a = ${sval(acc, 'm/s²')}.`), A.right()),
    };
    const text = L('<p>A cart moves along a straight track with constant acceleration. The stroboscope picture shows where it is every second, from t = 0 (the numbers above the dots are the times in s).</p>',
      '<p>Ein Wagen bewegt sich mit konstanter Beschleunigung auf einer geraden Bahn. Die Stroboskopaufnahme zeigt, wo er jede Sekunde ist, ab t = 0 (die Zahlen über den Punkten sind die Zeiten in s).</p>');
    const hint0 = L('The distance between two neighbouring dots is how far the cart moves in one second, and corresponds to its mean velocity in that second: a large distance means fast, a small one slow.', 'Der Abstand zwischen zwei benachbarten Punkten ist, wie weit der Wagen in einer Sekunde fährt, und entspricht seiner mittleren Geschwindigkeit in dieser Sekunde: Ein grosser Abstand bedeutet schnell, ein kleiner langsam.');
    if (gmode) {
      return finish('strobegraph', seed, d, {
        data: { xs, gaps, acc, v0, graph: gq },
        title: L('From the picture to the graph', 'Vom Bild zum Graphen'),
        text, figure: fig(), questions: graphQs,
        hints: [hint0, L(`The changes of position per second: ${gapText}.`, `Die Ortsänderungen pro Sekunde: ${gapText}.`), {
          s: L(`So the s(t) graph goes through ${xs.map((x, k) => `(${k} s, ${num(x)} m)`).join(', ')}, curved like a parabola.`, `Der s(t)-Graph geht also durch ${xs.map((x, k) => `(${k} s, ${num(x)} m)`).join(', ')}, gekrümmt wie eine Parabel.`),
          v: L(`The mean velocity in each second is reached in its middle: v(0.5 s) = ${sval(gaps[0], 'm/s')}, v(1.5 s) = ${sval(gaps[1], 'm/s')}, …; v(t) is the straight line through these points.`, `Die mittlere Geschwindigkeit jeder Sekunde wird in deren Mitte erreicht: v(0.5 s) = ${sval(gaps[0], 'm/s')}, v(1.5 s) = ${sval(gaps[1], 'm/s')}, …; v(t) ist die Gerade durch diese Punkte.`),
          a: L('The distances per second change by the same amount each second: a constant acceleration, a horizontal line in the a(t) graph.', 'Die Abstände pro Sekunde ändern sich jede Sekunde um gleich viel: eine konstante Beschleunigung, eine waagrechte Gerade im a(t)-Graphen.'),
        }[gq]],
        steps: gq === 's' ? [S.gaps, S.s] : gq === 'v' ? [S.gaps, S.v] : [S.gaps, S.v, S.a()],
      });
    }
    return finish('strobe', seed, d, {
      data: { xs, gaps, how: pat.how, acc, v0 },
      title: L('Stroboscope picture', 'Stroboskopaufnahme'),
      text: L('<p>A cart moves along a straight track with constant acceleration. The stroboscope picture shows where it is every second, from t = 0 (the numbers above the dots are the times in s).</p>',
        '<p>Ein Wagen bewegt sich mit konstanter Beschleunigung auf einer geraden Bahn. Die Stroboskopaufnahme zeigt, wo er jede Sekunde ist, ab t = 0 (die Zahlen über den Punkten sind die Zeiten in s).</p>'),
      figure: fig(),
      questions,
      hints: [
        hint0,
        L('With constant acceleration, the distances per second change by the same amount each second.', 'Bei konstanter Beschleunigung ändern sich die Abstände pro Sekunde jede Sekunde um gleich viel.'),
        L(`The changes of position per second: ${gapText}.`, `Die Ortsänderungen pro Sekunde: ${gapText}.`),
      ],
      steps: [S.gaps, S.v],
    });
  }

  // ---------------------------------------------------------------- check: one question, four options
  // One question of an exercise with four options, for the check: the question with the given
  // key, or one picked at random among those that can be asked so. A choice with four options as
  // it is; a number question with the right value and three trap values (or nearby values); one
  // right and three wrong options of a multi. Gives { ask, options, pics }.
  function question(ex, seed, key) {
    const r = rng((seed ^ 0x2f1e) >>> 0);
    const can = (q) => (q.type === 'choice' ? q.options.length === 4 : q.type === 'multi' ? q.options.some((o) => o.correct) && q.options.filter((o) => !o.correct).length >= 3 : true);
    const q = key ? ex.questions.find((x) => x.key === key) : r.pick(ex.questions.filter(can));
    if (q.type === 'choice') return { ask: q.prompt, options: q.options, pics: q.pics };
    if (q.type === 'multi') {
      const right = r.pick(q.options.filter((o) => o.correct)), wrong = r.shuffle(q.options.filter((o) => !o.correct)).slice(0, 3);
      return { ask: q.single, options: r.shuffle([right, ...wrong]) };
    }
    const vals = [{ value: q.value, correct: true }];
    for (const t of q.traps) if (vals.length < 4 && !vals.some((v) => Math.abs(v.value - t.value) < 0.05)) vals.push(t);
    for (let k = 1; vals.length < 4; k++) for (const v of [q.value + k, q.value - k]) if (vals.length < 4 && !vals.some((w) => Math.abs(w.value - v) < 0.05)) vals.push({ value: v, flag: null, why: q.why });
    return { ask: q.ask, options: r.shuffle(vals.map((v) => ({ html: val(v.value, q.unit), correct: !!v.correct, flag: v.correct ? null : v.flag, why: v.correct ? '' : v.why }))) };
  }

  const BUILD = { table: tableEx, tablegraph: tableGraph, atable, atablegraph: (seed, d) => atable(seed, d, true), strobe: strobeEx, strobegraph: (seed, d) => strobeEx(seed, d, true) };
  const DIFF = { table: [3], tablegraph: [2, 3], atable: [3, 4], atablegraph: [3, 4], strobe: [2, 3], strobegraph: [2, 3] };
  const make = (kind, seed, d) => BUILD[kind](seed, d);
  for (const k of Object.keys(BUILD)) Motion.register(k, { difficulties: DIFF[k], make: (seed, d) => make(k, seed, d) });

  const api = { KINDS: Object.keys(BUILD), DIFF, FLAGS, make, question };
  root.Concepts = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
