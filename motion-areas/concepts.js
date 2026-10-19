// Exercises on the areas under v(t) graphs from the worksheet C4 (distance as the area under
// v(t)), answered by choosing or entering numbers:
//   area       v(t): displacement (★3) and distance (★4) between two times
//   race       the v(t) graphs of two motions: which is farther from the start, and a displacement (★4)
//   mean       v(t): the displacement and the mean velocity between two times (★3: v ≥ 0; ★4: v
//              changes sign)
// make(kind, seed, d) gives { kind, id, difficulty, title, text, figure, questions, hints, steps,
// answers, data } in the current language (Lang); data: the motion behind it, for the tests.
// Questions:
//   { type: 'choice', key, prompt, options: [{ html, correct, flag, why }] }
//   { type: 'num', key, prompt, ask, sym, unit, value, traps: [{ value, flag, why }], why }
// A wrong option's flag names the misconception behind it (FLAGS), or is null. The numbers need
// no calculator: whole seconds, whole or half metres, velocities in steps of 0.05 m/s.
(function (root) {
  'use strict';

  const Motion = root.Motion || require('./generator.js');
  const Figs = root.Figs || require('./figs.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const { rng } = Motion;
  const { graph, num } = Figs;

  // The misconceptions, with what is right instead.
  const FLAGS = {
    nodt: () => L('Δs instead of Δs/Δt', 'Δs statt Δs/Δt'),
    height: () => L('the velocity taken for the distance', 'die Geschwindigkeit für den Weg gehalten'),
    unsigned: () => L('distance and displacement mixed up', 'Weg und Ortsänderung verwechselt'),
    rect: () => L('a rectangle instead of the trapezoid', 'ein Rechteck statt des Trapezes'),
    ends: () => L('the mean of the velocities at the start and at the end', 'der Mittelwert der Geschwindigkeiten am Anfang und am Ende'),
  };

  // ---------------------------------------------------------------- helpers
  const sub = (q, i) => `<i>${q}</i><sub>${i}</sub>`;
  const val = (x, u) => `${num(round(x))}&nbsp;${u}`;
  const sval = (x, u) => `${round(x) > 0 ? '+' : ''}${num(round(x))}&nbsp;${u}`;
  const round = (x) => Math.round(x * 100) / 100 + 0;
  // a number as plain as the answers (a multiple of 0.05): other trap values would give themselves away
  const nice = (x) => Math.abs(x * 20 - Math.round(x * 20)) < 1e-9;
  const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L('and', 'und')} ${xs[xs.length - 1]}`);
  // a right option keeps its flag only in a multi: there, missing it is the mistake
  const opt = (html, correct, flag, why) => ({ html, correct, flag: flag || null, why });
  const choice = (key, prompt, options, pics = false) => ({ type: 'choice', key, prompt, options: options.map((o) => (o.correct ? { ...o, flag: null } : o)), pics });
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

  // ---------------------------------------------------------------- area (C4.1, C4.2)
  // The displacement is the area between v(t) and the t axis, below the axis negative; the
  // distance counts every area positive. ★3: v ≥ 0, with a trapezoid; ★4: v changes sign
  // (displacement and distance).
  function integrate(pts, a, b, abs) {
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
      const lo = Math.max(a, t0), hi = Math.min(b, t1);
      if (hi <= lo) continue;
      const at = (t) => v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
      const va = at(lo), vb = at(hi);
      if (!abs || va * vb >= 0) sum += (abs ? Math.abs(va + vb) : va + vb) / 2 * (hi - lo);
      else { const tc = lo + ((hi - lo) * va) / (va - vb); sum += (Math.abs(va) * (tc - lo) + Math.abs(vb) * (hi - tc)) / 2; }
    }
    return sum;
  }
  // A v(t) of 3–4 straight pieces over 10 s, whole values at whole seconds; where it changes sign,
  // it does so at a whole second (so all areas are multiples of 0.5 m).
  function vProfile(r, signs) {
    for (;;) {
      const ts = [0];
      while (ts[ts.length - 1] < 10) ts.push(Math.min(10, ts[ts.length - 1] + r.pick([2, 3, 4])));
      if (ts.length < 4 || ts.length > 5) continue;
      const vs = ts.map(() => r.pick(signs === 'pos' ? [0, 1, 2, 3] : [-3, -2, -1, 0, 1, 2, 3]));
      const pts = ts.map((t, i) => [t, vs[i]]);
      let ok = true;
      for (let i = 1; i < pts.length; i++) {
        const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
        if (v0 * v1 < 0 && !Number.isInteger(t0 + ((t1 - t0) * v0) / (v0 - v1))) ok = false;
      }
      if (ok) return pts;
    }
  }
  function areaEx(seed, d) {
    const r = rng(seed);
    d = d || r.pick([3, 4]);
    let pts, a, b, ds, dist;
    for (let k = 0; ; k++) {
      pts = vProfile(r, d === 3 ? 'pos' : 'any');
      a = r.pick([0, 1, 2, 3]); b = r.pick([6, 7, 8, 9, 10]);
      ds = integrate(pts, a, b, false); dist = integrate(pts, a, b, true);
      const sloped = pts.some((p, i) => i && p[1] !== pts[i - 1][1] && pts[i - 1][0] < b && p[0] > a);
      if (!sloped || dist < 2) continue;
      if (!Number.isInteger(2 * ds) || !Number.isInteger(2 * dist)) continue; // no calculator: halves of metres
      if (d === 3 && Math.abs(ds - dist) < 1e-9) break;
      if (d === 4 && dist - Math.abs(ds) >= 1 && Math.abs(ds) >= 0.5) break;
    }
    const at = (t) => Figs.valueAt(pts, t);
    const pieces = pts.slice(1).map((p, i) => [pts[i][0], pts[i][1], p[0], p[1]]);
    const clipped = pieces.map(([t0, v0, t1, v1]) => {
      const lo = Math.max(a, t0), hi = Math.min(b, t1);
      return hi > lo ? [lo, Figs.valueAt([[t0, v0], [t1, v1]], lo), hi, Figs.valueAt([[t0, v0], [t1, v1]], hi)] : null;
    }).filter(Boolean)
      // split where v changes sign (at a whole second), so each piece lies on one side of the t axis
      .flatMap(([t0, v0, t1, v1]) => {
        if (v0 * v1 >= 0) return [[t0, v0, t1, v1]];
        const tc = t0 + ((t1 - t0) * v0) / (v0 - v1);
        return [[t0, v0, tc, 0], [tc, 0, t1, v1]];
      });
    const fig = (o = {}) => graph('v', { lo: -4, hi: 4, step: 2 }, 10, [{ pts }], { label: L('Velocity against time', 'Geschwindigkeit gegen die Zeit'), marks: [a, b], ...o });
    const rectV = at(a) * (b - a);
    const qs = [numQ('ds', L(`The displacement between ${num(a)} s and ${num(b)} s:`, `Die Ortsänderung zwischen ${num(a)} s und ${num(b)} s:`), L(`What is the displacement Δs between ${num(a)} s and ${num(b)} s?`, `Wie gross ist die Ortsänderung Δs zwischen ${num(a)} s und ${num(b)} s?`),
      'Δ<i>s</i>', 'm', ds, [
        { value: dist, flag: 'unsigned', why: L('That is the distance travelled. For the displacement, the area below the t axis counts negative: the body moves backwards there.', 'Das ist der zurückgelegte Weg. Für die Ortsänderung zählt die Fläche unter der t-Achse negativ: Dort bewegt sich der Körper rückwärts.') },
        { value: at(b), flag: 'height', why: L('That is the velocity at the end, read off the graph. The displacement is the area under the v(t) graph.', 'Das ist die Geschwindigkeit am Ende, am Graphen abgelesen. Die Ortsänderung ist die Fläche unter dem v(t)-Graphen.') },
        { value: rectV, flag: 'rect', why: L('That is v at the start times Δt, a rectangle. But v changes: add up the areas piece by piece, trapezoids and triangles included.', 'Das ist v am Anfang mal Δt, ein Rechteck. Aber v ändert sich: Zähle die Flächen Stück für Stück zusammen, Trapeze und Dreiecke eingeschlossen.') },
      ], L('The area between the v(t) graph and the t axis, below the axis negative.', 'Die Fläche zwischen dem v(t)-Graphen und der t-Achse, unter der Achse negativ.'))];
    if (d === 4) {
      qs.push(numQ('dist', L(`The distance travelled between ${num(a)} s and ${num(b)} s:`, `Der zurückgelegte Weg zwischen ${num(a)} s und ${num(b)} s:`), L(`What distance does the body travel between ${num(a)} s and ${num(b)} s?`, `Welchen Weg legt der Körper zwischen ${num(a)} s und ${num(b)} s zurück?`),
        L('distance', 'Weg'), 'm', dist, [
          { value: Math.abs(ds), flag: 'unsigned', why: L('That is the size of the displacement: forward and backward cancel there. The distance counts every metre, so all areas count positive.', 'Das ist der Betrag der Ortsänderung: Dabei heben sich vorwärts und rückwärts auf. Der Weg zählt jeden Meter, also zählen alle Flächen positiv.') },
          { value: ds, flag: 'unsigned', why: L('That is the displacement. The distance counts every metre, so the area below the axis counts positive too.', 'Das ist die Ortsänderung. Der Weg zählt jeden Meter, also zählt auch die Fläche unter der Achse positiv.') },
        ], L('The areas between the v(t) graph and the t axis, all counted positive.', 'Die Flächen zwischen dem v(t)-Graphen und der t-Achse, alle positiv gezählt.')));
    }
    const areaOf = ([t0, v0, t1, v1]) => ((v0 + v1) / 2) * (t1 - t0);
    const areas = clipped.map(areaOf).filter((x) => Math.abs(x) > 1e-9);
    // the areas added up: with their signs, or all positive
    const sumText = (abs) => areas.map((x, k) => (abs ? `${k ? ' + ' : ''}${num(Math.abs(x))} m` : k ? ` ${x < 0 ? '−' : '+'} ${num(Math.abs(x))} m` : `${x < 0 ? '−' : ''}${num(Math.abs(x))} m`)).join('');
    const par = (x) => (x < 0 ? `(${num(x)})` : num(x));
    const pieceText = clipped.map(([t0, v0, t1, v1]) => `${interval(t0, t1)}: ${v0 === v1 ? `${num(v0)} m/s · ${num(t1 - t0)} s` : `(${num(v0)} + ${par(v1)}) / 2 m/s · ${num(t1 - t0)} s`} = ${sval((v0 + v1) / 2 * (t1 - t0), 'm')}`).join('<br>');
    return finish('area', seed, d, {
      data: { pts, a, b },
      title: L('Distance as an area', 'Weg als Fläche'),
      text: L(`<p>A body moves along a straight line. The graph shows its velocity against time.</p>`, `<p>Ein Körper bewegt sich auf einer Geraden. Der Graph zeigt seine Geschwindigkeit gegen die Zeit.</p>`),
      figure: fig(),
      questions: qs,
      hints: [
        L(`Look at the graph between the marks at ${num(a)} s and ${num(b)} s: it falls into ${clipped.length} pieces, ${clipped.map(([t0, , t1]) => interval(t0, t1)).join(', ')}.${d === 4 ? ' In which of them does it lie below the t axis?' : ' Which of them are horizontal, which sloped?'}`,
          `Schau dir den Graphen zwischen den Marken bei ${num(a)} s und ${num(b)} s an: Er zerfällt in ${clipped.length} Stücke, ${clipped.map(([t0, , t1]) => interval(t0, t1)).join(', ')}.${d === 4 ? ' In welchen liegt er unter der t-Achse?' : ' Welche davon sind waagrecht, welche schräg?'}`),
        L(`In every short time the body moves v · Δt, a narrow strip under the graph: the displacement is the area between v(t) and the t axis — a rectangle v · Δt, a triangle ½ · v · Δt or a trapezoid (v at the start + v at the end) / 2 · Δt. Below the t axis the body moves backwards: that area counts negative${d === 4 ? ' for the displacement, but positive for the distance' : ''}.`,
          `In jeder kurzen Zeit bewegt sich der Körper um v · Δt, ein schmaler Streifen unter dem Graphen: Die Ortsänderung ist die Fläche zwischen v(t) und der t-Achse — ein Rechteck v · Δt, ein Dreieck ½ · v · Δt oder ein Trapez (v am Anfang + v am Ende) / 2 · Δt. Unter der t-Achse bewegt sich der Körper rückwärts: Diese Fläche zählt negativ${d === 4 ? ' für die Ortsänderung, für den Weg aber positiv' : ''}.`),
        L(`Start with ${interval(clipped[0][0], clipped[0][2])}: there v goes from ${sval(clipped[0][1], 'm/s')} to ${sval(clipped[0][3], 'm/s')}, over Δt = ${num(clipped[0][2] - clipped[0][0])} s. Which shape is that area, and is it above or below the axis?`,
          `Beginne mit ${interval(clipped[0][0], clipped[0][2])}: Dort geht v in Δt = ${num(clipped[0][2] - clipped[0][0])} s von ${sval(clipped[0][1], 'm/s')} auf ${sval(clipped[0][3], 'm/s')}. Welche Form hat diese Fläche, und liegt sie über oder unter der Achse?`),
        L(`Then the other pieces in the same way, and add up the areas of all ${clipped.length} pieces with their signs${d === 4 ? '; for the distance, add up their sizes' : ''}.`, `Dann die übrigen Stücke ebenso, und zähle die Flächen aller ${clipped.length} Stücke mit ihren Vorzeichen zusammen${d === 4 ? '; für den Weg zählst du ihre Beträge zusammen' : ''}.`),
      ],
      steps: [
        step(L('The area', 'Die Fläche'), L(`The change of position between ${num(a)} s and ${num(b)} s is the area between the graph and the t axis (shaded; below the axis negative).`, `Die Ortsänderung zwischen ${num(a)} s und ${num(b)} s ist die Fläche zwischen dem Graphen und der t-Achse (schattiert; unter der Achse negativ).`), fig({ areas: clipped })),
        step(L('Piece by piece', 'Stück für Stück'), pieceText, fig({ areas: clipped })),
        step(L('Result', 'Resultat'), d === 4
          ? L(`Displacement: the areas with their signs, Δs = ${sumText(false)} = ${sval(ds, 'm')}.<br>Distance: every area positive, since each metre counts, forward or back: ${sumText(true)} = ${val(dist, 'm')}.`,
            `Ortsänderung: die Flächen mit ihren Vorzeichen, Δs = ${sumText(false)} = ${sval(ds, 'm')}.<br>Weg: jede Fläche positiv, denn jeder Meter zählt, vorwärts wie rückwärts: ${sumText(true)} = ${val(dist, 'm')}.`)
          : L(`Δs = ${sval(ds, 'm')}. The body only moves forward here, so the distance is the same.`, `Δs = ${sval(ds, 'm')}. Der Körper bewegt sich hier nur vorwärts, also ist der Weg gleich gross.`), fig({ areas: clipped })),
      ],
    });
  }

  // ---------------------------------------------------------------- race: who is farther? (C4.2)
  // Two motions A and B from the same start: which is farther from it at time t*? The one with the
  // larger velocity at t* is not (the trap). ★4.
  function race(seed) {
    const r = rng(seed);
    let A, B, tq, sA, sB;
    for (;;) {
      A = vProfile(r, 'any'); B = vProfile(r, 'any');
      tq = r.pick([4, 5, 6, 7, 8]);
      sA = integrate(A, 0, tq, false); sB = integrate(B, 0, tq, false);
      const vA = Figs.valueAt(A, tq), vB = Figs.valueAt(B, tq);
      if (Math.abs(Math.abs(sA) - Math.abs(sB)) < 1) continue;
      if (!Number.isInteger(2 * sA) || !Number.isInteger(2 * sB) || !Number.isInteger(2 * integrate(B, 0, tq, true))) continue;
      const farA = Math.abs(sA) > Math.abs(sB);
      if ((farA ? vB > vA : vA > vB) && Math.abs(sB) >= 0.5) break; // the closer one is faster at t*
    }
    const far = Math.abs(sA) > Math.abs(sB) ? 'A' : 'B', near = far === 'A' ? 'B' : 'A';
    const areasOf = (pts) => pts.slice(1).map((p, i) => [pts[i][0], pts[i][1], p[0], p[1]]).filter(([t0]) => t0 < tq).map(([t0, v0, t1, v1]) => [t0, v0, Math.min(t1, tq), Figs.valueAt([[t0, v0], [t1, v1]], Math.min(t1, tq))]);
    const two = (o = {}) => `<div class="figs pair">${['A', 'B'].map((n) => `<figure class="fig">${graph('v', { lo: -4, hi: 4, step: 2 }, 10, [{ pts: n === 'A' ? A : B }], { marks: [tq], label: n, ...(o.areas ? { areas: areasOf(n === 'A' ? A : B) } : {}) })}<figcaption>${n}</figcaption></figure>`).join('')}</div>`;
    const q1 = choice('far', L(`Both start at the same point at t = 0. Which is farther from the start at t = ${num(tq)} s?`, `Beide starten bei t = 0 am selben Punkt. Welcher ist bei t = ${num(tq)} s weiter vom Start entfernt?`), r.shuffle([
      opt('A', far === 'A', 'height', L(`At ${num(tq)} s, ${near} is faster, but the distance from the start is the area under the v(t) graph up to then, not the height of the graph.`, `Bei ${num(tq)} s ist ${near} schneller, aber die Entfernung vom Start ist die Fläche unter dem v(t)-Graphen bis dahin, nicht die Höhe des Graphen.`)),
      opt('B', far === 'B', 'height', L(`At ${num(tq)} s, ${near} is faster, but the distance from the start is the area under the v(t) graph up to then, not the height of the graph.`, `Bei ${num(tq)} s ist ${near} schneller, aber die Entfernung vom Start ist die Fläche unter dem v(t)-Graphen bis dahin, nicht die Höhe des Graphen.`)),
      opt(L('Equally far', 'Gleich weit'), false, null, L('Compare the areas under the two graphs up to that time.', 'Vergleiche die Flächen unter den beiden Graphen bis zu diesem Zeitpunkt.')),
      opt(L('Both are back at the start', 'Beide sind wieder am Start'), false, 'unsigned', L('Only areas above and below the axis that are equal would cancel. Add up the areas with their signs.', 'Nur gleich grosse Flächen über und unter der Achse würden sich aufheben. Zähle die Flächen mit ihren Vorzeichen zusammen.')),
    ]));
    const q2 = numQ('sB', L(`The displacement of B from 0 to ${num(tq)} s:`, `Die Ortsänderung von B von 0 bis ${num(tq)} s:`), L(`What is the displacement of B from 0 to ${num(tq)} s?`, `Wie gross ist die Ortsänderung von B von 0 bis ${num(tq)} s?`),
      `Δ${sub('s', 'B')}`, 'm', sB, [
        { value: integrate(B, 0, tq, true), flag: 'unsigned', why: L('That is the distance travelled: the area below the t axis counts negative for the displacement.', 'Das ist der zurückgelegte Weg: Für die Ortsänderung zählt die Fläche unter der t-Achse negativ.') },
        { value: Figs.valueAt(B, tq), flag: 'height', why: L('That is the velocity at that time. The displacement is the area under the graph.', 'Das ist die Geschwindigkeit zu diesem Zeitpunkt. Die Ortsänderung ist die Fläche unter dem Graphen.') },
      ], L('The area under the v(t) graph of B, below the axis negative.', 'Die Fläche unter dem v(t)-Graphen von B, unter der Achse negativ.'));
    return finish('race', seed, 4, {
      data: { A, B, tq, far },
      title: L('Who is farther?', 'Wer ist weiter weg?'),
      text: L('<p>The graphs show the velocities of two bodies A and B moving along the same straight line.</p>', '<p>Die Graphen zeigen die Geschwindigkeiten von zwei Körpern A und B, die sich auf derselben Geraden bewegen.</p>'),
      figure: two(),
      questions: [q1, q2],
      hints: [
        L(`Both start at the same point. Follow A and B from t = 0 to the mark at ${num(tq)} s: where does each graph lie above, where below the t axis? The height at ${num(tq)} s only says who is faster right then, not how far each has come.`,
          `Beide starten am selben Punkt. Verfolge A und B von t = 0 bis zur Marke bei ${num(tq)} s: Wo liegt jeder Graph über, wo unter der t-Achse? Die Höhe bei ${num(tq)} s sagt nur, wer gerade dann schneller ist, nicht wie weit jeder schon gekommen ist.`),
        L(`How far a body is from its start is its displacement Δs: the area under its v(t) graph from t = 0 to ${num(tq)} s, below the axis negative. Farther from the start means the larger |Δs|.`,
          `Wie weit ein Körper von seinem Start entfernt ist, ist seine Ortsänderung Δs: die Fläche unter seinem v(t)-Graphen von t = 0 bis ${num(tq)} s, unter der Achse negativ. Weiter vom Start heisst grösseres |Δs|.`),
        L(`For A the areas up to ${num(tq)} s add up to Δs_A = ${sval(sA, 'm')}. Now do the same for B, piece by piece, with the signs.`, `Bei A ergeben die Flächen bis ${num(tq)} s zusammen Δs_A = ${sval(sA, 'm')}. Mach dasselbe nun für B, Stück für Stück, mit den Vorzeichen.`),
        L('Then compare |Δs_A| and |Δs_B|: the sign only tells on which side of the start each one is.', 'Vergleiche dann |Δs_A| und |Δs_B|: Das Vorzeichen sagt nur, auf welcher Seite des Starts jeder ist.'),
      ],
      steps: [
        step(L('The areas', 'Die Flächen'), L(`Up to ${num(tq)} s, A has moved ${sval(sA, 'm')} and B ${sval(sB, 'm')} (the areas with their signs).`, `Bis ${num(tq)} s hat sich A um ${sval(sA, 'm')} und B um ${sval(sB, 'm')} bewegt (die Flächen mit ihren Vorzeichen).`), two({ areas: true })),
        step(L('Comparing', 'Vergleichen'), L(`${far} is farther from the start (${val(Math.abs(far === 'A' ? sA : sB), 'm')} against ${val(Math.abs(far === 'A' ? sB : sA), 'm')}), although ${near} is faster at ${num(tq)} s.`, `${far} ist weiter vom Start entfernt (${val(Math.abs(far === 'A' ? sA : sB), 'm')} gegen ${val(Math.abs(far === 'A' ? sB : sA), 'm')}), obwohl ${near} bei ${num(tq)} s schneller ist.`), two({ areas: true })),
      ],
    });
  }

  // ---------------------------------------------------------------- mean: the mean velocity
  // The mean velocity between two times is the displacement (the area under v(t), below the axis
  // negative) divided by the time: v̄ = Δs/Δt, the height of the rectangle with the same area.
  // ★3: v ≥ 0; ★4: v changes sign. The traps: the mean of the velocities at the two ends (right
  // only where v(t) is one straight line), the distance travelled divided by the time, and the
  // displacement itself.
  function meanEx(seed, d) {
    const r = rng(seed);
    d = d || r.pick([3, 4]);
    let pts, a, b, ds, dist, vm, ends;
    const at = (t) => Figs.valueAt(pts, t);
    for (;;) {
      pts = vProfile(r, d === 3 ? 'pos' : 'any');
      a = r.pick([0, 0, 1, 2]); b = a + r.pick([4, 5, 6, 8]);
      if (b > 10) continue;
      ds = integrate(pts, a, b, false); dist = integrate(pts, a, b, true);
      vm = ds / (b - a); ends = (at(a) + at(b)) / 2;
      if (!Number.isInteger(2 * ds) || !nice(vm) || Math.abs(vm - ends) < 0.25 || Math.abs(vm) < 0.1) continue;
      if (d === 3 && Math.abs(ds - dist) < 1e-9) break;
      if (d === 4 && dist - Math.abs(ds) >= 1 && nice(dist / (b - a))) break;
    }
    const T = b - a;
    const clipped = pts.slice(1).map((p, i) => [pts[i][0], pts[i][1], p[0], p[1]]).map(([t0, v0, t1, v1]) => {
      const lo = Math.max(a, t0), hi = Math.min(b, t1);
      return hi > lo ? [lo, Figs.valueAt([[t0, v0], [t1, v1]], lo), hi, Figs.valueAt([[t0, v0], [t1, v1]], hi)] : null;
    }).filter(Boolean);
    const fig = (o = {}) => graph('v', { lo: -4, hi: 4, step: 2 }, 10, [{ pts }, ...(o.mean ? [{ pts: [[a, vm], [b, vm]], dash: true }] : [])],
      { label: L('Velocity against time', 'Geschwindigkeit gegen die Zeit'), marks: [a, b], ...(o.areas ? { areas: clipped } : {}) });
    const q1 = numQ('ds', L(`The displacement between ${num(a)} s and ${num(b)} s:`, `Die Ortsänderung zwischen ${num(a)} s und ${num(b)} s:`), L(`What is the displacement Δs between ${num(a)} s and ${num(b)} s?`, `Wie gross ist die Ortsänderung Δs zwischen ${num(a)} s und ${num(b)} s?`),
      'Δ<i>s</i>', 'm', ds, [
        { value: dist, flag: 'unsigned', why: L('That is the distance travelled. For the displacement, the area below the t axis counts negative: the body moves backwards there.', 'Das ist der zurückgelegte Weg. Für die Ortsänderung zählt die Fläche unter der t-Achse negativ: Dort bewegt sich der Körper rückwärts.') },
        { value: at(a) * T, flag: 'rect', why: L('That is v at the start times Δt, a rectangle. But v changes: add up the areas piece by piece.', 'Das ist v am Anfang mal Δt, ein Rechteck. Aber v ändert sich: Zähle die Flächen Stück für Stück zusammen.') },
      ], L('The area between the v(t) graph and the t axis, below the axis negative.', 'Die Fläche zwischen dem v(t)-Graphen und der t-Achse, unter der Achse negativ.'));
    const q2 = numQ('vm', L(`The mean velocity between ${num(a)} s and ${num(b)} s:`, `Die mittlere Geschwindigkeit zwischen ${num(a)} s und ${num(b)} s:`), L(`What is the mean velocity between ${num(a)} s and ${num(b)} s?`, `Wie gross ist die mittlere Geschwindigkeit zwischen ${num(a)} s und ${num(b)} s?`),
      '<i class="bar">v</i>', 'm/s', vm, [
        { value: ends, flag: 'ends', why: L(`That is the mean of the velocities at ${num(a)} s and at ${num(b)} s. It would be right only if v(t) were one straight line in between; here it bends. The mean velocity is the displacement divided by the time: v̄ = Δs/Δt.`,
          `Das ist der Mittelwert der Geschwindigkeiten bei ${num(a)} s und bei ${num(b)} s. Er wäre nur richtig, wenn v(t) dazwischen eine einzige Gerade wäre; hier knickt sie. Die mittlere Geschwindigkeit ist die Ortsänderung geteilt durch die Zeit: v̄ = Δs/Δt.`) },
        { value: dist / T, flag: 'unsigned', why: L('That is the distance travelled divided by the time, the mean speed. For the mean velocity, the area below the t axis counts negative.', 'Das ist der zurückgelegte Weg geteilt durch die Zeit, das mittlere Tempo. Für die mittlere Geschwindigkeit zählt die Fläche unter der t-Achse negativ.') },
        { value: ds, flag: 'nodt', why: L(`That is the displacement Δs. The mean velocity is the displacement per second: divide by Δt = ${num(T)} s.`, `Das ist die Ortsänderung Δs. Die mittlere Geschwindigkeit ist die Ortsänderung pro Sekunde: Teile durch Δt = ${num(T)} s.`) },
      ], L('v̄ = Δs/Δt: the area under v(t), divided by the time.', 'v̄ = Δs/Δt: die Fläche unter v(t), geteilt durch die Zeit.'));
    const areaOf = ([t0, v0, t1, v1]) => ((v0 + v1) / 2) * (t1 - t0);
    const areas = clipped.map(areaOf).filter((x) => Math.abs(x) > 1e-9);
    // the areas added up: with their signs, or all positive
    const sumText = (abs) => areas.map((x, k) => (abs ? `${k ? ' + ' : ''}${num(Math.abs(x))} m` : k ? ` ${x < 0 ? '−' : '+'} ${num(Math.abs(x))} m` : `${x < 0 ? '−' : ''}${num(Math.abs(x))} m`)).join('');
    const par = (x) => (x < 0 ? `(${num(x)})` : num(x));
    const pieceText = clipped.map(([t0, v0, t1, v1]) => `${interval(t0, t1)}: ${sval((v0 + v1) / 2 * (t1 - t0), 'm')}`).join(', ');
    return finish('mean', seed, d, {
      data: { pts, a, b },
      title: L('Mean velocity', 'Mittlere Geschwindigkeit'),
      text: L('<p>A body moves along a straight line. The graph shows its velocity against time.</p>', '<p>Ein Körper bewegt sich auf einer Geraden. Der Graph zeigt seine Geschwindigkeit gegen die Zeit.</p>'),
      figure: fig(),
      questions: [q1, q2],
      hints: [
        L(`Between ${num(a)} s and ${num(b)} s the graph has ${clipped.length} straight pieces: ${clipped.map(([t0, , t1]) => interval(t0, t1)).join(', ')}. It bends in between, so the mean of the velocities at ${num(a)} s and ${num(b)} s is not the mean velocity.${d === 4 ? ' Where does it lie below the t axis?' : ''}`,
          `Zwischen ${num(a)} s und ${num(b)} s hat der Graph ${clipped.length} gerade Stücke: ${clipped.map(([t0, , t1]) => interval(t0, t1)).join(', ')}. Er knickt dazwischen, also ist der Mittelwert der Geschwindigkeiten bei ${num(a)} s und ${num(b)} s nicht die mittlere Geschwindigkeit.${d === 4 ? ' Wo liegt er unter der t-Achse?' : ''}`),
        L(`The mean velocity is v̄ = Δs/Δt: the displacement Δs, the area under v(t) from ${num(a)} s to ${num(b)} s${d === 4 ? ' (below the t axis negative)' : ''}, divided by the whole time Δt.`,
          `Die mittlere Geschwindigkeit ist v̄ = Δs/Δt: die Ortsänderung Δs, die Fläche unter v(t) von ${num(a)} s bis ${num(b)} s${d === 4 ? ' (unter der t-Achse negativ)' : ''}, geteilt durch die ganze Zeit Δt.`),
        L(`Start with ${interval(clipped[0][0], clipped[0][2])}: there v goes from ${sval(clipped[0][1], 'm/s')} to ${sval(clipped[0][3], 'm/s')}, over ${num(clipped[0][2] - clipped[0][0])} s. Which shape is that area?`,
          `Beginne mit ${interval(clipped[0][0], clipped[0][2])}: Dort geht v in ${num(clipped[0][2] - clipped[0][0])} s von ${sval(clipped[0][1], 'm/s')} auf ${sval(clipped[0][3], 'm/s')}. Welche Form hat diese Fläche?`),
        L(`Then add the areas of all ${clipped.length} pieces${d === 4 ? ' with their signs' : ''} to get Δs, and divide by the time from ${num(a)} s to ${num(b)} s.`, `Zähle dann die Flächen aller ${clipped.length} Stücke${d === 4 ? ' mit ihren Vorzeichen' : ''} zu Δs zusammen und teile durch die Zeit von ${num(a)} s bis ${num(b)} s.`),
      ],
      steps: [
        step(L('The displacement', 'Die Ortsänderung'), L(`The area between the graph and the t axis from ${num(a)} s to ${num(b)} s, piece by piece: ${pieceText}. Together Δs = ${sval(ds, 'm')}.`,
          `Die Fläche zwischen dem Graphen und der t-Achse von ${num(a)} s bis ${num(b)} s, Stück für Stück: ${pieceText}. Zusammen Δs = ${sval(ds, 'm')}.`), fig({ areas: true })),
        step(L('The mean velocity', 'Die mittlere Geschwindigkeit'), L(`v̄ = Δs/Δt = ${sval(ds, 'm')} / ${num(T)} s = ${sval(vm, 'm/s')}. A body moving at this constant velocity (dashed) would get just as far in the same time: the rectangle under it has the same area. The mean of the velocities at the ends, ${sval(ends, 'm/s')}, is not the same.`,
          `v̄ = Δs/Δt = ${sval(ds, 'm')} / ${num(T)} s = ${sval(vm, 'm/s')}. Ein Körper mit dieser konstanten Geschwindigkeit (gestrichelt) käme in derselben Zeit gleich weit: Das Rechteck darunter hat dieselbe Fläche. Der Mittelwert der Geschwindigkeiten an den Enden, ${sval(ends, 'm/s')}, ist nicht dasselbe.`), fig({ mean: true })),
      ],
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

  const BUILD = { area: areaEx, race, mean: meanEx };
  const DIFF = { area: [3, 4], race: [4], mean: [3, 4] };
  const make = (kind, seed, d) => BUILD[kind](seed, d);
  for (const k of Object.keys(BUILD)) Motion.register(k, { difficulties: DIFF[k], make: (seed, d) => make(k, seed, d) });

  const api = { KINDS: Object.keys(BUILD), DIFF, FLAGS, make, question, integrate };
  root.Concepts = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
