// Exercises on the slopes of motion graphs from the worksheets C1 (speed as a rate) and C2
// (velocity as a vector in one dimension), answered by choosing or entering numbers instead of
// drawing:
//   compare    two motions in one s(t) graph: which is faster, and the velocity of one (★1–2)
//   direction  a piecewise uniform s(t): when is v negative, and v in one interval (★2)
//   table      a value table of four vehicles: which always move backwards, and a velocity (★2)
//   match      a graph and the one of its slope: s(t) → v(t) (★2), v(t) → a(t) (★3), s(t) → a(t) (★4)
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
  const { graph, table: tableFig, num } = Figs;

  // The misconceptions, with what is right instead.
  const FLAGS = {
    position: () => L('a higher graph means faster or farther', 'ein höherer Graph bedeutet schneller oder weiter'),
    magnitude: () => L('a falling s(t) graph means slower', 'ein fallender s(t)-Graph bedeutet langsamer'),
    crossing: () => L('where the graphs cross, the speeds are equal', 'wo sich die Graphen schneiden, sind die Geschwindigkeiten gleich'),
    below: () => L('s < 0 means v < 0', 's < 0 bedeutet v < 0'),
    negpos: () => L('negative positions mean motion in the negative direction', 'negative Orte bedeuten Bewegung in negativer Richtung'),
    nodt: () => L('Δs instead of Δs/Δt', 'Δs statt Δs/Δt'),
    origin: () => L('s/t instead of Δs/Δt', 's/t statt Δs/Δt'),
    sign: () => L('the sign of the velocity', 'das Vorzeichen der Geschwindigkeit'),
    copy: () => L('the shape of the given graph copied', 'die Form des gegebenen Graphen übernommen'),
    value: () => L('the value of v instead of its slope', 'der Wert von v statt seiner Steigung'),
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
    position: () => L('A graph that lies higher shows a larger position, not a larger speed. The speed is the steepness of the s(t) graph: how many metres s changes per second.',
      'Ein höher liegender Graph zeigt einen grösseren Ort, keine grössere Geschwindigkeit. Die Geschwindigkeit ist die Steilheit des s(t)-Graphen: um wie viele Meter sich s pro Sekunde ändert.'),
    magnitude: () => L('A falling s(t) graph means motion in the negative direction, not slower motion. For the speed, compare how steep the graphs are, whichever way they go.',
      'Ein fallender s(t)-Graph bedeutet Bewegung in negativer Richtung, nicht langsamere Bewegung. Für das Tempo vergleichst du, wie steil die Graphen sind, egal in welche Richtung.'),
    crossing: () => L('Where the graphs cross, both are at the same place at the same moment; that says nothing about their speeds. A straight s(t) graph means a speed that stays the same all the time.',
      'Wo sich die Graphen schneiden, sind beide im selben Moment am selben Ort; das sagt nichts über ihre Geschwindigkeiten. Ein gerader s(t)-Graph bedeutet eine Geschwindigkeit, die die ganze Zeit gleich bleibt.'),
    nodt: () => L('That is the change of position Δs. The velocity is the change per second: divide by the time Δt it takes.',
      'Das ist die Ortsänderung Δs. Die Geschwindigkeit ist die Änderung pro Sekunde: Teile durch die Zeit Δt, die sie dauert.'),
    origin: () => L('That is s/t, the position divided by the time. But the body did not start at s = 0: the velocity is the change of position Δs divided by Δt.',
      'Das ist s/t, der Ort geteilt durch die Zeit. Der Körper startete aber nicht bei s = 0: Die Geschwindigkeit ist die Ortsänderung Δs geteilt durch Δt.'),
    sign: () => L('Check the sign: where s decreases, the body moves in the negative direction, so v is negative.',
      'Achte auf das Vorzeichen: Wo s abnimmt, bewegt sich der Körper in negativer Richtung, also ist v negativ.'),
    position1: () => L('That is a position read off the graph, not a velocity. The velocity is how fast the position changes: Δs/Δt.',
      'Das ist ein am Graphen abgelesener Ort, keine Geschwindigkeit. Die Geschwindigkeit sagt, wie schnell sich der Ort ändert: Δs/Δt.'),
  };

  // ---------------------------------------------------------------- compare (C1.1)
  // Two uniform motions A and B over 10 s, s between −4 and 4 m. ★1: both forward, the slower one
  // always higher. ★2: the faster one moves backwards, and the graphs cross.
  function compare(seed, d) {
    const r = rng(seed);
    d = d || r.pick([1, 2]);
    const T = 10, ints = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    let fast, slow;
    for (;;) {
      fast = [r.pick(ints), r.pick(ints)];
      slow = [r.pick(ints), r.pick(ints)];
      const vf = (fast[1] - fast[0]) / T, vs = (slow[1] - slow[0]) / T;
      if (Math.abs(vf) - Math.abs(vs) < 0.25 || Math.abs(vs) < 0.2) continue;
      if (d === 1 && !(vf > 0 && vs > 0 && slow[0] > fast[0] && slow[1] > fast[1])) continue;
      if (d === 2 && !(vf < 0 && vs > 0 && (fast[0] - slow[0]) * (fast[1] - slow[1]) < 0 && slow[1] > fast[1])) continue;
      break;
    }
    const fastIsA = r.next() < 0.5;
    const A = fastIsA ? fast : slow, B = fastIsA ? slow : fast;
    const vA = (A[1] - A[0]) / T, vB = (B[1] - B[0]) / T;
    const [F, Sl] = fastIsA ? ['A', 'B'] : ['B', 'A'];
    const cross = (A[0] - B[0]) * (A[1] - B[1]) < 0;
    // both names where the lines are farthest apart, each on the side away from the other line
    const gap = (t) => A[0] + vA * t - (B[0] + vB * t), at = Math.abs(gap(1)) > Math.abs(gap(9)) ? 1 : 9;
    const lines = () => [
      { pts: [[0, A[0]], [T, A[1]]], name: 'A', at, below: gap(at) < 0 },
      { pts: [[0, B[0]], [T, B[1]]], name: 'B', dash: true, at, below: gap(at) > 0 },
    ];
    const axis = { lo: -4, hi: 4, step: 2 };
    const fig = (o = {}) => graph('s', axis, T, lines(), { label: L('Positions of A and B against time', 'Orte von A und B gegen die Zeit'), ...o });
    const wrongSlow = d === 2 ? 'magnitude' : 'position';
    const q1 = choice('faster', L('Which of the two is faster?', 'Welches der beiden ist schneller?'), r.shuffle([
      opt(L(`${F} is faster`, `${F} ist schneller`), true, null, ''),
      opt(L(`${Sl} is faster`, `${Sl} ist schneller`), false, wrongSlow, WHY[wrongSlow]()),
      opt(L('Both are equally fast', 'Beide sind gleich schnell'), false, cross ? 'crossing' : null,
        cross ? WHY.crossing() : L('Compare the steepness of the two lines: one changes its position by more metres per second.', 'Vergleiche die Steilheit der beiden Geraden: Eine ändert ihren Ort um mehr Meter pro Sekunde.')),
      opt(L(`First ${Sl}, then ${F}`, `Zuerst ${Sl}, dann ${F}`), false, 'crossing',
        L('Each graph is a straight line, so each speed stays the same all the time. Where the graphs cross, the two are only at the same place.', 'Jeder Graph ist eine Gerade, also bleibt jede Geschwindigkeit die ganze Zeit gleich. Wo sich die Graphen schneiden, sind die beiden nur am selben Ort.')),
    ]));
    const Q = d === 2 ? F : r.pick(['A', 'B']), P = Q === 'A' ? A : B, vQ = Q === 'A' ? vA : vB;
    const q2 = numQ('v', L(`The velocity of ${Q}:`, `Die Geschwindigkeit von ${Q}:`), L(`What is the velocity of ${Q}?`, `Wie gross ist die Geschwindigkeit von ${Q}?`),
      sub('v', Q), 'm/s', vQ, [
        { value: P[1], flag: 'position', why: WHY.position1() },
        { value: P[1] - P[0], flag: 'nodt', why: WHY.nodt() },
        { value: -vQ, flag: 'sign', why: WHY.sign() },
        { value: P[1] / T, flag: 'origin', why: WHY.origin() },
      ], L(`Read where ${Q} is at t = 0 and at t = 10 s; v = Δs/Δt.`, `Lies ab, wo ${Q} bei t = 0 und bei t = 10 s ist; v = Δs/Δt.`));
    const line = (n, p, v) => L(`${n}: from ${val(p[0], 'm')} at t = 0 to ${val(p[1], 'm')} at t = 10 s, so ${sub('v', n)} = (${num(p[1])} m − ${p[0] < 0 ? `(${num(p[0])} m)` : `${num(p[0])} m`}) / 10 s = ${sval(v, 'm/s')}`,
      `${n}: von ${val(p[0], 'm')} bei t = 0 nach ${val(p[1], 'm')} bei t = 10 s, also ${sub('v', n)} = (${num(p[1])} m − ${p[0] < 0 ? `(${num(p[0])} m)` : `${num(p[0])} m`}) / 10 s = ${sval(v, 'm/s')}`);
    const dots = [[0, A[0]], [T, A[1]], [0, B[0]], [T, B[1]]];
    // a slope triangle for each line over the same 5 s, A's in the first half, B's in the second,
    // so that they do not lie on top of each other
    const H = T / 2, sA = (t) => A[0] + vA * t, sB = (t) => B[0] + vB * t;
    const dsA = vA * H, dsB = vB * H;
    const ds = (x) => `Δ<tspan class="it">s</tspan> = ${x > 0 ? '+' : ''}${num(round(x))} m`, dt = `Δ<tspan class="it">t</tspan> = ${num(H)} s`;
    const tris = [
      { t0: 0, y0: sA(0), t1: H, y1: sA(H), corner: 'end', dt, dy: ds(dsA) },
      // B's Δt inside its triangle: where the lines cross, A passes just outside it
      { t0: H, y0: sB(H), t1: T, y1: sB(T), corner: 'end', dt, dy: ds(dsB), dtIn: true },
    ];
    const rises = (v) => (v > 0 ? L('rises', 'steigt') : L('falls', 'fällt'));
    const dirOf = (v) => (v > 0 ? L('in the positive direction', 'in positiver Richtung') : L('in the negative direction', 'in negativer Richtung'));
    const PQ = Q === 'A' ? A : B, dsQ = PQ[1] - PQ[0];
    return finish('compare', seed, d, {
      data: { A, B, fast: F, asked: Q },
      title: L('Who is faster?', 'Wer ist schneller?'),
      text: L('<p>Two vehicles A and B move uniformly along a straight road. The graph shows their positions against time.</p>',
        '<p>Zwei Fahrzeuge A und B bewegen sich gleichförmig auf einer geraden Strasse. Der Graph zeigt ihre Orte gegen die Zeit.</p>'),
      figure: fig(),
      questions: [q1, q2],
      hints: [
        L('The speed is the steepness of the s(t) graph: how many metres the position changes per second. How high a graph lies is the position, not the speed.',
          'Die Geschwindigkeit ist die Steilheit des s(t)-Graphen: um wie viele Meter sich der Ort pro Sekunde ändert. Wie hoch ein Graph liegt, ist der Ort, nicht die Geschwindigkeit.'),
        L('Read off where each line is at t = 0 and at t = 10 s. The change Δs divided by Δt = 10 s is the velocity.', 'Lies ab, wo jede Gerade bei t = 0 und bei t = 10 s ist. Die Änderung Δs geteilt durch Δt = 10 s ist die Geschwindigkeit.'),
        `${line('A', A, vA)}; ${line('B', B, vB)}.`,
        L(`Compare the sizes |${sub('v', 'A')}| = ${val(Math.abs(vA), 'm/s')} and |${sub('v', 'B')}| = ${val(Math.abs(vB), 'm/s')}: for the speed, the direction (the sign) does not count.`,
          `Vergleiche die Beträge |${sub('v', 'A')}| = ${val(Math.abs(vA), 'm/s')} und |${sub('v', 'B')}| = ${val(Math.abs(vB), 'm/s')}: Für das Tempo zählt die Richtung (das Vorzeichen) nicht.`),
      ],
      steps: [
        step(L('The slope is the velocity', 'Die Steigung ist die Geschwindigkeit'),
          L('In an s(t) graph, the slope of the line is the velocity. Its <b>sign</b> gives the direction: a rising line means motion in the positive direction (v &gt; 0), a falling line motion in the negative direction (v &lt; 0). Its <b>steepness</b> gives the speed: the steeper the line, the more metres per second. How high a line lies is only the position.',
            'Im s(t)-Diagramm ist die Steigung der Geraden die Geschwindigkeit. Ihr <b>Vorzeichen</b> gibt die Richtung an: Eine steigende Gerade bedeutet Bewegung in positiver Richtung (v &gt; 0), eine fallende Bewegung in negativer Richtung (v &lt; 0). Ihre <b>Steilheit</b> gibt das Tempo an: Je steiler die Gerade, desto mehr Meter pro Sekunde. Wie hoch eine Gerade liegt, ist nur der Ort.'), fig()),
        step(L('The sign of the slope', 'Das Vorzeichen der Steigung'),
          L(`A ${rises(vA)}: it moves ${dirOf(vA)}, ${sub('v', 'A')} ${vA > 0 ? '&gt;' : '&lt;'} 0. B ${rises(vB)}: it moves ${dirOf(vB)}, ${sub('v', 'B')} ${vB > 0 ? '&gt;' : '&lt;'} 0.${d === 2 ? ' The direction says nothing yet about who is faster.' : ''}`,
            `A ${rises(vA)}: Es bewegt sich ${dirOf(vA)}, ${sub('v', 'A')} ${vA > 0 ? '&gt;' : '&lt;'} 0. B ${rises(vB)}: Es bewegt sich ${dirOf(vB)}, ${sub('v', 'B')} ${vB > 0 ? '&gt;' : '&lt;'} 0.${d === 2 ? ' Über das Tempo sagt die Richtung noch nichts.' : ''}`), fig({ dots })),
        step(L('The steepness: who is faster', 'Die Steilheit: Wer ist schneller'),
          L(`The slope triangles over the same ${num(H)} s: A changes its position by ${val(Math.abs(dsA), 'm')}, B by ${val(Math.abs(dsB), 'm')}. ${F}'s line is steeper, so <b>${F} is faster</b>.${d === 2 ? ` That ${F}'s line falls only means that ${F} moves in the negative direction; it does not make ${F} slower.` : ` ${Sl}'s line lies higher, but that is its position, not its speed.`}`,
            `Die Steigungsdreiecke über dieselben ${num(H)} s: A ändert seinen Ort um ${val(Math.abs(dsA), 'm')}, B um ${val(Math.abs(dsB), 'm')}. Die Gerade von ${F} ist steiler, also <b>ist ${F} schneller</b>.${d === 2 ? ` Dass die Gerade von ${F} fällt, heisst nur, dass sich ${F} in negativer Richtung bewegt; langsamer ist ${F} deshalb nicht.` : ` Die Gerade von ${Sl} liegt höher, aber das ist der Ort, nicht das Tempo.`}`), fig({ tris })),
        step(L(`The value of ${Q}'s slope`, `Der Wert der Steigung von ${Q}`),
          L(`The slope is Δs/Δt, with its sign: from the triangle, ${sub('v', Q)} = ${ds(vQ * H).replace(/<[^>]+>/g, '').replace('Δs = ', '')} / ${num(H)} s = ${sval(vQ, 'm/s')} (or over the whole graph: ${line(Q, PQ, vQ).replace(/^[AB]: /, '')}). The sign ${vQ > 0 ? '+' : '−'} is the direction (the line ${rises(vQ)}), the size ${val(Math.abs(vQ), 'm/s')} the speed (${val(Math.abs(dsQ), 'm')} in 10 s).`,
            `Die Steigung ist Δs/Δt, mit Vorzeichen: aus dem Dreieck ${sub('v', Q)} = ${ds(vQ * H).replace(/<[^>]+>/g, '').replace('Δs = ', '')} / ${num(H)} s = ${sval(vQ, 'm/s')} (oder über den ganzen Graphen: ${line(Q, PQ, vQ).replace(/^[AB]: /, '')}). Das Vorzeichen ${vQ > 0 ? '+' : '−'} ist die Richtung (die Gerade ${rises(vQ)}), der Betrag ${val(Math.abs(vQ), 'm/s')} das Tempo (${val(Math.abs(dsQ), 'm')} in 10 s).`), fig({ tris: tris.filter((t, k) => (k === 0) === (Q === 'A')) })),
      ],
    });
  }

  // ---------------------------------------------------------------- direction (C2.1)
  // A piecewise uniform motion over 10 s: v < 0 where s decreases, also above the t axis, and
  // v > 0 where s increases, also below it.
  function direction(seed, d) {
    const r = rng(seed);
    d = d || 2;
    let ts, ps;
    for (;;) {
      const n = r.pick([4, 5]);
      ts = [0];
      while (ts.length < n) ts.push(ts[ts.length - 1] + r.pick([1, 2, 3]));
      if (ts[ts.length - 1] >= 10) continue;
      ts.push(10);
      ps = ts.map(() => r.pick([-4, -3, -2, -1, 0, 1, 2, 3, 4]));
      const pieces = ts.slice(1).map((t1, i) => ({ t0: ts[i], t1, s0: ps[i], s1: ps[i + 1] }));
      if (pieces.some((p, i) => i && (p.s1 - p.s0) / (p.t1 - p.t0) === (pieces[i - 1].s1 - pieces[i - 1].s0) / (pieces[i - 1].t1 - pieces[i - 1].t0))) continue;
      const negAbove = pieces.some((p) => p.s1 < p.s0 && Math.min(p.s0, p.s1) >= 0);
      const posBelow = pieces.some((p) => p.s1 > p.s0 && Math.max(p.s0, p.s1) <= 0);
      const nNeg = pieces.filter((p) => p.s1 < p.s0).length;
      // no calculator: every velocity a multiple of 0.5 m/s
      if (pieces.some((p) => !Number.isInteger((2 * (p.s1 - p.s0)) / (p.t1 - p.t0)))) continue;
      if (negAbove && posBelow && nNeg >= 1 && nNeg <= pieces.length - 2) break;
    }
    const pieces = ts.slice(1).map((t1, i) => ({ t0: ts[i], t1, s0: ps[i], s1: ps[i + 1], v: (ps[i + 1] - ps[i]) / (t1 - ts[i]) }));
    const pts = ts.map((t, i) => [t, ps[i]]);
    const fig = (o = {}) => graph('s', { lo: -4, hi: 4, step: 2 }, 10, [{ pts }], { label: L('Position against time', 'Ort gegen die Zeit'), ...o });
    const options = pieces.map((p) => {
      const neg = p.v < 0, below = Math.max(p.s0, p.s1) <= 0, above = Math.min(p.s0, p.s1) >= 0;
      if (neg) {
        return opt(interval(p.t0, p.t1), true, above ? 'below' : null, above
          ? L(`Here s is positive, but it decreases: the body moves in the negative direction, so v < 0. The sign of v is the direction of the slope, not the sign of s.`,
            `Hier ist s positiv, nimmt aber ab: Der Körper bewegt sich in negativer Richtung, also v < 0. Das Vorzeichen von v ist die Richtung der Steigung, nicht das Vorzeichen von s.`)
          : L('Here s decreases, so v is negative.', 'Hier nimmt s ab, also ist v negativ.'));
      }
      if (p.v === 0) {
        return opt(interval(p.t0, p.t1), false, null, L('Here s stays the same: the body is at rest, v = 0.', 'Hier bleibt s gleich: Der Körper ruht, v = 0.'),
          L('How does the graph run in this interval, and what does that mean for v?', 'Wie verläuft der Graph in diesem Intervall, und was bedeutet das für v?'));
      }
      return opt(interval(p.t0, p.t1), false, below ? 'below' : null, below
        ? L('Here s is negative, but it increases: the body moves in the positive direction, so v > 0.', 'Hier ist s negativ, nimmt aber zu: Der Körper bewegt sich in positiver Richtung, also v > 0.')
        : L('Here s increases, so v is positive.', 'Hier nimmt s zu, also ist v positiv.'), below
        ? L('Here s is negative. Does the sign of s tell the direction, or whether s increases or decreases?', 'Hier ist s negativ. Gibt das Vorzeichen von s die Richtung an, oder ob s zu- oder abnimmt?')
        : L('Does the graph rise or fall in this interval?', 'Steigt oder fällt der Graph in diesem Intervall?'));
    });
    const q1 = multi('neg', L('In which time intervals is the velocity negative? Choose all.', 'In welchen Zeitintervallen ist die Geschwindigkeit negativ? Wähle alle.'),
      L('In which time interval is the velocity negative?', 'In welchem Zeitintervall ist die Geschwindigkeit negativ?'), options);
    // the velocity asked for: in an interval that falls above the t axis or rises below it, so its
    // sign gives nothing away about the first question
    const negs = pieces.filter((p) => p.v < 0);
    const P = r.pick([pieces.find((p) => p.v < 0 && Math.min(p.s0, p.s1) >= 0), pieces.find((p) => p.v > 0 && Math.max(p.s0, p.s1) <= 0)]);
    const q2 = numQ('v', L(`The velocity between ${interval(P.t0, P.t1)}:`, `Die Geschwindigkeit zwischen ${interval(P.t0, P.t1)}:`),
      L(`What is the velocity between ${interval(P.t0, P.t1)}?`, `Wie gross ist die Geschwindigkeit zwischen ${interval(P.t0, P.t1)}?`), it('v'), 'm/s', P.v, [
        { value: -P.v, flag: 'sign', why: WHY.sign() },
        { value: P.s1 - P.s0, flag: 'nodt', why: WHY.nodt() },
        { value: P.s1, flag: 'position', why: WHY.position1() },
      ], L('v = Δs/Δt for this interval.', 'v = Δs/Δt für dieses Intervall.'));
    // each interval by the slope of its line: the sign is the direction, the steepness the speed
    const desc = (p) => (p.v === 0
      ? L(`${interval(p.t0, p.t1)}: the line is horizontal (slope 0): s stays at ${val(p.s0, 'm')}, the body is at rest, v = 0`,
        `${interval(p.t0, p.t1)}: Die Gerade ist waagrecht (Steigung 0): s bleibt bei ${val(p.s0, 'm')}, der Körper ruht, v = 0`)
      : L(`${interval(p.t0, p.t1)}: the line ${p.v > 0 ? 'rises' : 'falls'}, so its slope is ${p.v > 0 ? 'positive' : 'negative'}: the body moves ${p.v > 0 ? 'forward' : 'backward'}. Its steepness: s changes from ${val(p.s0, 'm')} to ${val(p.s1, 'm')}, by ${num(p.s1 - p.s0)} m in ${num(p.t1 - p.t0)} s, so v = ${num(p.s1 - p.s0)} m / ${num(p.t1 - p.t0)} s = ${sval(p.v, 'm/s')}`,
        `${interval(p.t0, p.t1)}: Die Gerade ${p.v > 0 ? 'steigt' : 'fällt'}, ihre Steigung ist also ${p.v > 0 ? 'positiv' : 'negativ'}: Der Körper bewegt sich ${p.v > 0 ? 'vorwärts' : 'rückwärts'}. Ihre Steilheit: s ändert sich von ${val(p.s0, 'm')} auf ${val(p.s1, 'm')}, um ${num(p.s1 - p.s0)} m in ${num(p.t1 - p.t0)} s, also v = ${num(p.s1 - p.s0)} m / ${num(p.t1 - p.t0)} s = ${sval(p.v, 'm/s')}`));
    return finish('direction', seed, d, {
      data: { pieces, asked: P },
      title: L('Forward and backward', 'Vorwärts und rückwärts'),
      text: L('<p>A body moves along a straight line, at constant velocity in each time interval. The graph shows its position against time.</p>',
        '<p>Ein Körper bewegt sich auf einer Geraden, in jedem Zeitintervall mit konstanter Geschwindigkeit. Der Graph zeigt seinen Ort gegen die Zeit.</p>'),
      figure: fig(),
      questions: [q1, q2],
      hints: [
        L('The sign of v tells the direction of motion: v > 0 where s increases (the graph rises), v < 0 where s decreases (the graph falls).', 'Das Vorzeichen von v gibt die Bewegungsrichtung an: v > 0, wo s zunimmt (der Graph steigt), v < 0, wo s abnimmt (der Graph fällt).'),
        L('Whether s itself is positive or negative does not matter: that is where the body is, not where it is going.', 'Ob s selbst positiv oder negativ ist, spielt keine Rolle: Das sagt, wo der Körper ist, nicht wohin er sich bewegt.'),
        L(`Go through the intervals one by one: ${pieces.map((p) => interval(p.t0, p.t1)).join(', ')}. Does s rise, fall or stay the same?`, `Geh die Intervalle einzeln durch: ${pieces.map((p) => interval(p.t0, p.t1)).join(', ')}. Steigt s, fällt s oder bleibt s gleich?`),
        L(`The graph falls in ${and(negs.map((p) => interval(p.t0, p.t1)))}.`, `Der Graph fällt in ${and(negs.map((p) => interval(p.t0, p.t1)))}.`),
      ],
      steps: [
        ...pieces.map((p, i) => step(L(`Interval ${i + 1}`, `Intervall ${i + 1}`), `${desc(p)}.`, fig({ band: [p.t0, p.t1], dots: [[p.t0, p.s0], [p.t1, p.s1]] }))),
        step(L('Negative velocity', 'Negative Geschwindigkeit'), L(`v < 0 in ${and(negs.map((p) => interval(p.t0, p.t1)))}: there the slope is negative, the graph falls, wherever it lies (also above the t axis).`, `v < 0 in ${and(negs.map((p) => interval(p.t0, p.t1)))}: Dort ist die Steigung negativ, der Graph fällt, egal wo er liegt (auch über der t-Achse).`), fig()),
      ],
    });
  }

  // ---------------------------------------------------------------- table (C2.3)
  // ★2: four vehicles every 5 s; which move backwards all the time (one to three of them), and
  // the velocity of one that moves uniformly, forwards or backwards.
  const table = (seed) => table4(rng(seed), seed);

  function table4(r, seed) {
    const times = [0, 5, 10, 15, 20, 25, 30];
    const make = {
      // backwards all the time: at positive positions, across 0, or at negative ones
      down: () => { const s0 = r.pick([18, 20, 24, 25, 30]), ds = r.pick([-2, -3, -4]); return { kind: 'down', values: times.map((t, k) => s0 + ds * k), back: true, uniform: true }; },
      negdown: () => { const gaps = r.pick([[8, 7, 6, 5, 4, 3], [2, 3, 4, 5, 6, 7], [5, 5, 4, 4, 3, 3]]), s0 = r.pick([0, -2, 3]); let s = s0; return { kind: 'negdown', values: [s0, ...gaps.map((g) => (s -= g))], back: true }; },
      below: () => { const s0 = r.pick([-2, -4, -5]), ds = r.pick([-3, -4]); return { kind: 'below', values: times.map((t, k) => s0 + ds * k), back: true, uniform: true }; },
      // not all the time: forwards at negative positions, turning around, or coming to rest
      negup: () => { const s0 = r.pick([-30, -28, -25]), ds = r.pick([3, 4]); return { kind: 'negup', values: times.map((t, k) => s0 + ds * k), back: false, uniform: true }; },
      backforth: () => { const s0 = r.pick([-10, -6]), ds = r.pick([4, 5]); return { kind: 'backforth', values: times.map((t, k) => s0 - ds * Math.min(k, 3) + ds * Math.max(0, k - 3)), back: false }; },
      forthback: () => { const s0 = r.pick([-8, -6]), up = r.pick([6, 5]); return { kind: 'forthback', values: [s0, s0 + up, s0 + 2 * up, s0 + 2 * up - 2, s0 + 2 * up - 4, s0 + 2 * up - 6, s0 + 2 * up - 8], back: false }; },
      stop: () => { const s0 = r.pick([12, 15, 20]), ds = r.pick([3, 4]), k0 = r.pick([3, 4]); return { kind: 'stop', values: times.map((t, k) => s0 - ds * Math.min(k, k0)), back: false, stop: times[k0] }; },
    };
    // the velocity asked for: forwards (negup) or backwards (down, below), half of the time each
    const forward = r.next() < 0.5, ask = forward ? ['negup'] : ['down', 'below'];
    let kinds;
    for (;;) {
      const nBack = r.pick([1, 2, 2, 3]);
      kinds = r.shuffle([...r.shuffle(['down', 'negdown', 'below']).slice(0, nBack), ...r.shuffle(['negup', r.pick(['backforth', 'forthback']), 'stop']).slice(0, 4 - nBack)]);
      // a uniform one for the velocity, and the trap of negative positions
      if (kinds.some((k) => ask.includes(k)) && kinds.some((k) => ['negup', 'negdown', 'below'].includes(k))) break;
    }
    const names = ['A', 'B', 'C', 'D'];
    const rows = kinds.map((k, i) => ({ name: names[i], ...make[k]() }));
    const fig = () => tableFig(times, rows.map((x) => ({ name: x.name, values: x.values })));
    const allNeg = (x) => x.values.every((v) => v < 0);
    const options = rows.map((x) => {
      if (x.back) {
        return opt(x.name, true, x.values.some((v) => v > 0) ? 'negpos' : null, x.values.some((v) => v > 0)
          ? L(`${x.name}: the positions are positive, but they decrease every time: ${x.name} moves in the negative direction all the time.`, `${x.name}: Die Orte sind positiv, nehmen aber jedes Mal ab: ${x.name} bewegt sich die ganze Zeit in negativer Richtung.`)
          : L(`${x.name}: the position decreases from one time to the next, every time.`, `${x.name}: Der Ort nimmt von einem Zeitpunkt zum nächsten jedes Mal ab.`));
      }
      if (x.kind === 'negup') {
        return opt(x.name, false, 'negpos', L(`${x.name}: the positions are negative, but they increase: ${x.name} moves in the positive direction. The direction is in the change of s, not in its sign.`,
          `${x.name}: Die Orte sind negativ, nehmen aber zu: ${x.name} bewegt sich in positiver Richtung. Die Richtung steckt in der Änderung von s, nicht in seinem Vorzeichen.`),
        L(`${x.name}: the positions are negative. Is the direction in the sign of s, or in how s changes from one column to the next?`,
          `${x.name}: Die Orte sind negativ. Steckt die Richtung im Vorzeichen von s oder darin, wie sich s von einer Spalte zur nächsten ändert?`));
      }
      if (x.kind === 'stop') {
        return opt(x.name, false, null, L(`${x.name}: the position decreases until ${num(x.stop)} s and then stays the same: ${x.name} stops, it does not move in the negative direction all the time.`,
          `${x.name}: Der Ort nimmt bis ${num(x.stop)} s ab und bleibt dann gleich: ${x.name} hält an, bewegt sich also nicht die ganze Zeit in negativer Richtung.`),
        L(`${x.name}: check every change from one column to the next, the last ones too.`, `${x.name}: Prüfe jede Änderung von einer Spalte zur nächsten, auch die letzten.`));
      }
      return opt(x.name, false, allNeg(x) ? 'negpos' : null, L(`${x.name}: the position decreases only for a while and then increases again: ${x.name} turns around.`, `${x.name}: Der Ort nimmt nur eine Zeit lang ab und dann wieder zu: ${x.name} kehrt um.`),
        L(`${x.name}: does the position decrease from every column to the next?`, `${x.name}: Nimmt der Ort von jeder Spalte zur nächsten ab?`));
    });
    const q1 = multi('back', L('Which vehicles move in the negative direction all the time? Choose all.', 'Welche Fahrzeuge bewegen sich die ganze Zeit in negativer Richtung? Wähle alle.'),
      L('Which vehicle moves in the negative direction all the time?', 'Welches Fahrzeug bewegt sich die ganze Zeit in negativer Richtung?'), options);
    const U = r.pick(rows.filter((x) => ask.includes(x.kind))), v = (U.values[1] - U.values[0]) / 5;
    const q2 = numQ('v', L(`The velocity of ${U.name}:`, `Die Geschwindigkeit von ${U.name}:`), L(`What is the velocity of ${U.name}?`, `Wie gross ist die Geschwindigkeit von ${U.name}?`), sub('v', U.name), 'm/s', v, [
      { value: U.values[1] - U.values[0], flag: 'nodt', why: WHY.nodt() },
      { value: -v, flag: 'sign', why: WHY.sign() },
      { value: U.values[6] / 30, flag: 'origin', why: WHY.origin() },
    ], L(`${U.name} moves uniformly: v = Δs/Δt between any two times.`, `${U.name} bewegt sich gleichförmig: v = Δs/Δt zwischen zwei beliebigen Zeitpunkten.`));
    const backs = rows.filter((x) => x.back).map((x) => x.name);
    const text = L('<p>The table gives the positions of four vehicles A, B, C and D on a straight road every 5 seconds.</p>', '<p>Die Tabelle gibt die Orte von vier Fahrzeugen A, B, C und D auf einer geraden Strasse alle 5 Sekunden an.</p>');
    return finish('table', seed, 2, {
      data: { times, rows, uniform: U.name },
      title: L('Four vehicles', 'Vier Fahrzeuge'),
      text,
      figure: fig(),
      questions: [q1, q2],
      hints: [
        L('A vehicle moves in the negative direction when its position decreases. Look at the changes from one column to the next, not at the signs of the positions.', 'Ein Fahrzeug bewegt sich in negativer Richtung, wenn sein Ort abnimmt. Schau auf die Änderungen von einer Spalte zur nächsten, nicht auf die Vorzeichen der Orte.'),
        L('"All the time" means: every change must be negative. One increase, or one step without a change, is enough to rule a vehicle out.', '«Die ganze Zeit» heisst: Jede Änderung muss negativ sein. Eine einzige Zunahme oder ein Schritt ohne Änderung genügt, um ein Fahrzeug auszuschliessen.'),
        L(`${U.name} changes by the same amount every 5 s, so it moves uniformly: v = Δs/Δt.`, `${U.name} ändert sich alle 5 s um gleich viel, bewegt sich also gleichförmig: v = Δs/Δt.`),
        L(`${U.name}: Δs = ${num(U.values[1] - U.values[0])} m in Δt = 5 s.`, `${U.name}: Δs = ${num(U.values[1] - U.values[0])} m in Δt = 5 s.`),
      ],
      steps: [
        step(L('The changes', 'Die Änderungen'), rows.map((x) => `${x.name}: ${x.values.slice(1).map((v2, k) => `${v2 - x.values[k] > 0 ? '+' : ''}${num(v2 - x.values[k])}`).join(', ')} m`).join('<br>'), fig()),
        step(L('Always backwards', 'Immer rückwärts'), L(`Only ${and(backs)} ${backs.length > 1 ? 'decrease' : 'decreases'} every time. Negative positions alone do not mean negative direction.`, `Nur ${and(backs)} ${backs.length > 1 ? 'nehmen' : 'nimmt'} jedes Mal ab. Negative Orte allein bedeuten keine negative Richtung.`), fig()),
        step(L('Velocity', 'Geschwindigkeit'), L(`${U.name}: v = Δs/Δt = ${num(U.values[1] - U.values[0])} m / 5 s = ${sval(v, 'm/s')}.`, `${U.name}: v = Δs/Δt = ${num(U.values[1] - U.values[0])} m / 5 s = ${sval(v, 'm/s')}.`), fig()),
      ],
    });
  }

  // ---------------------------------------------------------------- graphs to choose from
  // A graph and three wrong ones from typical mistakes, all four on one axis (so that the scale
  // gives nothing away). A wrong graph that looks like one already chosen is left out. Gives
  // { question, right (the right graph, for the solution) }.
  const AXIS_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  function niceAxis(vals) {
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const pad = 0.12 * (hi - lo || 1);
    if (lo < 0) lo -= pad;
    if (hi > 0) hi += pad;
    const step = AXIS_STEPS.find((x) => (hi - lo) / x <= 5) || 200;
    return { lo: round(Math.floor(lo / step + 1e-9) * step), hi: round(Math.ceil(hi / step - 1e-9) * step), step };
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
    const draw = (pts, extra = {}) => graph(q, axis, T, [{ pts }], { label: QLABEL[q](), ...extra });
    return {
      question: choice(key, prompt, r.shuffle(kept.map(([pts, flag, why]) => opt(draw(pts), flag === true, flag === true ? null : flag, why || ''))), true),
      right: (extra) => draw(cands[0][0], extra),
    };
  }

  // ---------------------------------------------------------------- match: from one graph to the next
  // A graph and four graphs to choose from, over 10 s. ★2: a piecewise uniform s(t) and its v(t);
  // ★3: a piecewise linear v(t) and its a(t); ★4: an s(t) of pieces with constant acceleration
  // (parabolas and straight lines, joined without kinks) and its a(t), by way of v(t). The wrong
  // ones: the sign, the shape of the given graph copied, all v positive (★2), the mean values of
  // v instead of its slopes (★3), v(t) instead of a(t) (★4).
  function matchEx(seed, d) {
    const r = rng(seed);
    d = d || r.pick([2, 3, 4]);
    return d === 2 ? matchSV(r, seed) : d === 3 ? matchVA(r, seed) : matchSA(r, seed);
  }
  const T10 = 10, AX4 = { lo: -4, hi: 4, step: 2 };
  // breakpoints 0 < … < 10 s: four pieces of 2–4 s
  function breaks(r) {
    for (;;) {
      const ts = [0];
      while (ts.length < 4) ts.push(ts[ts.length - 1] + r.pick([2, 3, 4]));
      if (ts[3] < 9 && ts[3] >= 6) return [...ts, T10];
    }
  }
  const stepsOf = (ps, f) => ps.flatMap((p) => [[p.t0, f(p)], [p.t1, f(p)]]);
  const matchText = (q) => ({
    s: L('<p>A body moves along a straight line. The graph shows its position against time.</p>', '<p>Ein Körper bewegt sich auf einer Geraden. Der Graph zeigt seinen Ort gegen die Zeit.</p>'),
    v: L('<p>A body moves along a straight line. The graph shows its velocity against time.</p>', '<p>Ein Körper bewegt sich auf einer Geraden. Der Graph zeigt seine Geschwindigkeit gegen die Zeit.</p>'),
  }[q]);
  const matchPrompt = (q) => L(`Which ${q}(t) graph belongs to it?`, `Welcher ${q}(t)-Graph gehört dazu?`);
  const copyWhy = (from, to) => L(`This graph has the shape of the ${from}(t) graph. But ${to} is the slope of ${from}, not its value: ${to} is constant where ${from}(t) is a straight line.`,
    `Dieser Graph hat die Form des ${from}(t)-Graphen. ${to} ist aber die Steigung von ${from}, nicht sein Wert: ${to} ist konstant, wo ${from}(t) eine Gerade ist.`);

  function matchSV(r, seed) {
    let ts, ss, ps;
    for (;;) {
      ts = breaks(r);
      ss = ts.map(() => r.int(-4, 4));
      ps = ts.slice(1).map((t1, i) => ({ t0: ts[i], t1, s0: ss[i], s1: ss[i + 1], v: (ss[i + 1] - ss[i]) / (t1 - ts[i]) }));
      if (ps.some((p) => !Number.isInteger(2 * p.v) || Math.abs(p.v) > 3)) continue;
      if (ps.some((p, i) => i && p.v === ps[i - 1].v)) continue;
      if (ps.some((p) => p.v < 0) && ps.some((p) => p.v > 0)) break;
    }
    const sPts = ts.map((t, i) => [t, ss[i]]);
    const sFig = (o = {}) => graph('s', AX4, T10, [{ pts: sPts }], { label: QLABEL.s(), ...o });
    const G = graphChoice(r, 'graph', matchPrompt('v'), 'v', T10, [
      [stepsOf(ps, (p) => p.v), true],
      [stepsOf(ps, (p) => -p.v), 'sign', WHY.sign()],
      [stepsOf(ps, (p) => Math.abs(p.v)), 'sign', L('Here every velocity is positive. But where s decreases, the body moves in the negative direction: v < 0 there.', 'Hier ist jede Geschwindigkeit positiv. Wo s abnimmt, bewegt sich der Körper aber in negativer Richtung: Dort ist v < 0.')],
      [sPts, 'copy', copyWhy('s', 'v')],
      [stepsOf(ps, (p) => p.s1), 'position', WHY.position1()],
    ], { axis: AX4 });
    const desc = (p) => (p.v === 0
      ? L(`${interval(p.t0, p.t1)}: s stays at ${val(p.s0, 'm')}: v = 0.`, `${interval(p.t0, p.t1)}: s bleibt bei ${val(p.s0, 'm')}: v = 0.`)
      : L(`${interval(p.t0, p.t1)}: s ${p.v > 0 ? 'rises' : 'falls'} from ${val(p.s0, 'm')} to ${val(p.s1, 'm')}: v = ${num(p.s1 - p.s0)} m / ${num(p.t1 - p.t0)} s = ${sval(p.v, 'm/s')}.`,
        `${interval(p.t0, p.t1)}: s ${p.v > 0 ? 'steigt' : 'fällt'} von ${val(p.s0, 'm')} auf ${val(p.s1, 'm')}: v = ${num(p.s1 - p.s0)} m / ${num(p.t1 - p.t0)} s = ${sval(p.v, 'm/s')}.`));
    return finish('match', seed, 2, {
      data: { pieces: ps },
      title: L('From s(t) to v(t)', 'Von s(t) zu v(t)'),
      text: matchText('s'),
      figure: sFig(),
      questions: [G.question],
      hints: [
        L('The velocity is the slope of the s(t) graph: its sign is the direction, its steepness the speed.', 'Die Geschwindigkeit ist die Steigung des s(t)-Graphen: Ihr Vorzeichen ist die Richtung, ihre Steilheit das Tempo.'),
        L('Each straight piece of s(t) has one slope, so v is constant there: v(t) is made of horizontal pieces.', 'Jedes gerade Stück von s(t) hat eine Steigung, also ist v dort konstant: v(t) besteht aus waagrechten Stücken.'),
        L('Where s falls, v is negative, wherever the graph lies; where s is horizontal, v = 0.', 'Wo s fällt, ist v negativ, egal wo der Graph liegt; wo s waagrecht ist, ist v = 0.'),
        L(`The velocities: ${ps.map((p) => `${interval(p.t0, p.t1)}: ${sval(p.v, 'm/s')}`).join(', ')}.`, `Die Geschwindigkeiten: ${ps.map((p) => `${interval(p.t0, p.t1)}: ${sval(p.v, 'm/s')}`).join(', ')}.`),
      ],
      steps: [
        step(L('The slope is the velocity', 'Die Steigung ist die Geschwindigkeit'), L('Each piece of the s(t) graph is a straight line, so the velocity is constant in each piece: v = Δs/Δt, with its sign.', 'Jedes Stück des s(t)-Graphen ist eine Gerade, also ist die Geschwindigkeit in jedem Stück konstant: v = Δs/Δt, mit Vorzeichen.'), sFig()),
        ...ps.map((p, i) => step(L(`Piece ${i + 1}`, `Stück ${i + 1}`), desc(p), sFig({ band: [p.t0, p.t1], dots: [[p.t0, p.s0], [p.t1, p.s1]] }))),
        step(L('The v(t) graph', 'Der v(t)-Graph'), L('One horizontal piece for each straight piece of s(t), at the height of its velocity.', 'Ein waagrechtes Stück für jedes gerade Stück von s(t), auf der Höhe seiner Geschwindigkeit.'), G.right()),
      ],
    });
  }

  function matchVA(r, seed) {
    let ts, vs, ps;
    for (;;) {
      ts = breaks(r);
      vs = ts.map(() => r.int(-3, 3));
      ps = ts.slice(1).map((t1, i) => ({ t0: ts[i], t1, v0: vs[i], v1: vs[i + 1], a: (vs[i + 1] - vs[i]) / (t1 - ts[i]) }));
      if (ps.some((p) => !Number.isInteger(2 * p.a) || Math.abs(p.a) > 3)) continue;
      if (ps.some((p, i) => i && p.a === ps[i - 1].a)) continue;
      if (ps.filter((p) => p.a === 0).length > 1) continue;
      if (ps.some((p) => p.a < 0) && ps.some((p) => p.a > 0)) break;
    }
    const vPts = ts.map((t, i) => [t, vs[i]]);
    const vFig = (o = {}) => graph('v', AX4, T10, [{ pts: vPts }], { label: QLABEL.v(), ...o });
    const G = graphChoice(r, 'graph', matchPrompt('a'), 'a', T10, [
      [stepsOf(ps, (p) => p.a), true],
      [stepsOf(ps, (p) => -p.a), 'sign', L('Check the sign: where v increases, a is positive; where v decreases, a is negative, wherever the graph lies.', 'Achte auf das Vorzeichen: Wo v zunimmt, ist a positiv; wo v abnimmt, ist a negativ, egal wo der Graph liegt.')],
      [vPts, 'copy', copyWhy('v', 'a')],
      [stepsOf(ps, (p) => (p.v0 + p.v1) / 2), 'value', L('This shows the mean value of v in each piece, not its slope. The acceleration is how fast v changes: Δv/Δt.', 'Das zeigt den Mittelwert von v in jedem Stück, nicht seine Steigung. Die Beschleunigung sagt, wie schnell sich v ändert: Δv/Δt.')],
      [stepsOf(ps, (p) => p.v1), 'value', L('This shows the value of v at the end of each piece, not its slope. The acceleration is how fast v changes: Δv/Δt.', 'Das zeigt den Wert von v am Ende jedes Stücks, nicht seine Steigung. Die Beschleunigung sagt, wie schnell sich v ändert: Δv/Δt.')],
    ], { axis: AX4 });
    const desc = (p) => (p.a === 0
      ? L(`${interval(p.t0, p.t1)}: v stays at ${sval(p.v0, 'm/s')}: a = 0.`, `${interval(p.t0, p.t1)}: v bleibt bei ${sval(p.v0, 'm/s')}: a = 0.`)
      : L(`${interval(p.t0, p.t1)}: v ${p.a > 0 ? 'rises' : 'falls'} from ${sval(p.v0, 'm/s')} to ${sval(p.v1, 'm/s')}: a = ${num(p.v1 - p.v0)} m/s / ${num(p.t1 - p.t0)} s = ${sval(p.a, 'm/s²')}.`,
        `${interval(p.t0, p.t1)}: v ${p.a > 0 ? 'steigt' : 'fällt'} von ${sval(p.v0, 'm/s')} auf ${sval(p.v1, 'm/s')}: a = ${num(p.v1 - p.v0)} m/s / ${num(p.t1 - p.t0)} s = ${sval(p.a, 'm/s²')}.`));
    return finish('match', seed, 3, {
      data: { pieces: ps },
      title: L('From v(t) to a(t)', 'Von v(t) zu a(t)'),
      text: matchText('v'),
      figure: vFig(),
      questions: [G.question],
      hints: [
        L('The acceleration is the slope of the v(t) graph: how many m/s the velocity changes per second.', 'Die Beschleunigung ist die Steigung des v(t)-Graphen: um wie viele m/s sich die Geschwindigkeit pro Sekunde ändert.'),
        L('Each straight piece of v(t) has one slope, so a is constant there: a(t) is made of horizontal pieces.', 'Jedes gerade Stück von v(t) hat eine Steigung, also ist a dort konstant: a(t) besteht aus waagrechten Stücken.'),
        L('Where v falls, a is negative, also above the t axis; where v rises, a is positive, also below it.', 'Wo v fällt, ist a negativ, auch über der t-Achse; wo v steigt, ist a positiv, auch darunter.'),
        L(`The accelerations: ${ps.map((p) => `${interval(p.t0, p.t1)}: ${sval(p.a, 'm/s²')}`).join(', ')}.`, `Die Beschleunigungen: ${ps.map((p) => `${interval(p.t0, p.t1)}: ${sval(p.a, 'm/s²')}`).join(', ')}.`),
      ],
      steps: [
        step(L('The slope is the acceleration', 'Die Steigung ist die Beschleunigung'), L('Each piece of the v(t) graph is a straight line, so the acceleration is constant in each piece: a = Δv/Δt, with its sign. How high the graph lies does not matter.', 'Jedes Stück des v(t)-Graphen ist eine Gerade, also ist die Beschleunigung in jedem Stück konstant: a = Δv/Δt, mit Vorzeichen. Wie hoch der Graph liegt, spielt keine Rolle.'), vFig()),
        ...ps.map((p, i) => step(L(`Piece ${i + 1}`, `Stück ${i + 1}`), desc(p), vFig({ band: [p.t0, p.t1], dots: [[p.t0, p.v0], [p.t1, p.v1]] }))),
        step(L('The a(t) graph', 'Der a(t)-Graph'), L('One horizontal piece for each straight piece of v(t), at the height of its slope.', 'Ein waagrechtes Stück für jedes gerade Stück von v(t), auf der Höhe seiner Steigung.'), G.right()),
      ],
    });
  }

  // three pieces with constant accelerations, v continuous: s is a parabola where a ≠ 0
  const SA_LENGTHS = [[3, 3, 4], [4, 3, 3], [3, 4, 3], [2, 4, 4], [4, 2, 4], [4, 4, 2]];
  function matchSA(r, seed) {
    let ps, sPts, axis;
    for (;;) {
      const ls = r.pick(SA_LENGTHS), as = ls.map(() => r.pick([-2, -1, 0, 1, 2]));
      if (as.some((a, i) => i && a === as[i - 1]) || !as.some((a) => a > 0) || !as.some((a) => a < 0)) continue;
      let t = 0, v = r.int(-3, 3), s = r.int(-4, 4);
      ps = ls.map((l, i) => {
        const p = { t0: t, t1: t + l, a: as[i], v0: v, s0: s };
        v += as[i] * l; s += p.v0 * l + (as[i] * l * l) / 2; t += l;
        return { ...p, v1: v, s1: s };
      });
      if (ps.some((p) => Math.abs(p.v1) > 4)) continue;
      sPts = Array.from({ length: 81 }, (z, k) => {
        const tt = k / 8, p = ps.find((q) => tt <= q.t1 + 1e-9), x = tt - p.t0;
        return [tt, p.s0 + p.v0 * x + (p.a * x * x) / 2];
      });
      axis = niceAxis(sPts.map((p) => p[1]));
      // every bend visible: the parabola leaves its chord by at least 4 % of the axis
      if (ps.some((p) => p.a && (Math.abs(p.a) * (p.t1 - p.t0) ** 2) / 8 < 0.04 * (axis.hi - axis.lo))) continue;
      if (axis.hi - axis.lo > 40) continue;
      break;
    }
    const vPts = [[0, ps[0].v0], ...ps.map((p) => [p.t1, p.v1])];
    const sFig = (o = {}) => graph('s', axis, T10, [{ pts: sPts }], { label: QLABEL.s(), ...o });
    const vFig = (o = {}) => graph('v', niceAxis(vPts.map((p) => p[1])), T10, [{ pts: vPts }], { label: QLABEL.v(), ...o });
    const sMin = Math.min(...sPts.map((p) => p[1])), sMax = Math.max(...sPts.map((p) => p[1]));
    const G = graphChoice(r, 'graph', matchPrompt('a'), 'a', T10, [
      [stepsOf(ps, (p) => p.a), true],
      [stepsOf(ps, (p) => -p.a), 'sign', L('Check the sign: where s(t) curves upwards (its slope grows), a > 0; where it curves downwards, a < 0.', 'Achte auf das Vorzeichen: Wo s(t) nach oben gekrümmt ist (seine Steigung wächst), ist a > 0; wo es nach unten gekrümmt ist, a < 0.')],
      [vPts, 'skip', L('That is the v(t) graph, the slope of s(t). The acceleration is one step further: the slope of v(t).', 'Das ist der v(t)-Graph, die Steigung von s(t). Die Beschleunigung ist einen Schritt weiter: die Steigung von v(t).')],
      [sPts.map(([t, y]) => [t, -3 + (6 * (y - sMin)) / (sMax - sMin)]), 'copy', copyWhy('s', 'a')],
      [stepsOf(ps, (p) => (p.v0 + p.v1) / 2), 'skip', L('This shows the mean velocity in each piece, the slope of its chord in s(t). The acceleration is how fast v changes: the slope of v(t).', 'Das zeigt die mittlere Geschwindigkeit in jedem Stück, die Steigung seiner Sehne in s(t). Die Beschleunigung sagt, wie schnell sich v ändert: die Steigung von v(t).')],
    ], { axis: AX4 });
    const shape = (p) => (p.a === 0
      ? L('a straight line: v is constant, a = 0', 'eine Gerade: v ist konstant, a = 0')
      : p.a > 0 ? L('curved upwards: its slope v grows, a &gt; 0', 'nach oben gekrümmt: Seine Steigung v wächst, a &gt; 0')
        : L('curved downwards: its slope v shrinks, a &lt; 0', 'nach unten gekrümmt: Seine Steigung v nimmt ab, a &lt; 0'));
    const aLine = (p) => (p.a === 0
      ? `${interval(p.t0, p.t1)}: a = 0`
      : `${interval(p.t0, p.t1)}: a = (${num(p.v1)} m/s − ${p.v0 < 0 ? `(${num(p.v0)} m/s)` : `${num(p.v0)} m/s`}) / ${num(p.t1 - p.t0)} s = ${sval(p.a, 'm/s²')}`);
    return finish('match', seed, 4, {
      data: { pieces: ps },
      title: L('From s(t) to a(t)', 'Von s(t) zu a(t)'),
      text: matchText('s'),
      figure: sFig(),
      questions: [G.question],
      hints: [
        L('Two steps: the velocity is the slope of s(t), and the acceleration is the slope of v(t).', 'Zwei Schritte: Die Geschwindigkeit ist die Steigung von s(t), und die Beschleunigung ist die Steigung von v(t).'),
        L('Where s(t) is a straight line, v is constant and a = 0. Where s(t) curves upwards, its slope grows: a > 0; where it curves downwards, a < 0.', 'Wo s(t) eine Gerade ist, ist v konstant und a = 0. Wo s(t) nach oben gekrümmt ist, wächst seine Steigung: a > 0; wo es nach unten gekrümmt ist, a < 0.'),
        L('With constant acceleration in a piece, a(t) is horizontal there; s(t) is a parabola in that piece.', 'Bei konstanter Beschleunigung in einem Stück ist a(t) dort waagrecht; s(t) ist in diesem Stück eine Parabel.'),
        L(`The pieces: ${ps.map((p) => `${interval(p.t0, p.t1)}: ${p.a === 0 ? L('straight', 'gerade') : p.a > 0 ? L('curved upwards', 'nach oben gekrümmt') : L('curved downwards', 'nach unten gekrümmt')}`).join(', ')}.`,
          `Die Stücke: ${ps.map((p) => `${interval(p.t0, p.t1)}: ${p.a === 0 ? L('straight', 'gerade') : p.a > 0 ? L('curved upwards', 'nach oben gekrümmt') : L('curved downwards', 'nach unten gekrümmt')}`).join(', ')}.`),
      ],
      steps: [
        step(L('Two steps', 'Zwei Schritte'), L('From s(t) to a(t) takes two steps: v is the slope of s(t), and a is the slope of v(t). The shape of s(t) already tells the sign of a: straight means a = 0, curved upwards a &gt; 0, curved downwards a &lt; 0.',
          'Von s(t) zu a(t) braucht es zwei Schritte: v ist die Steigung von s(t), und a ist die Steigung von v(t). Die Form von s(t) verrät schon das Vorzeichen von a: gerade heisst a = 0, nach oben gekrümmt a &gt; 0, nach unten gekrümmt a &lt; 0.'), sFig()),
        ...ps.map((p, i) => step(L(`Piece ${i + 1}`, `Stück ${i + 1}`), L(`${interval(p.t0, p.t1)}: s(t) is ${shape(p)}.`, `${interval(p.t0, p.t1)}: s(t) ist ${shape(p)}.`), sFig({ band: [p.t0, p.t1] }))),
        step(L('The v(t) graph', 'Der v(t)-Graph'), L(`The slope of s(t): v changes steadily in each piece, without jumps (s(t) has no kinks). It goes through ${vPts.map(([t, v]) => `(${num(t)} s, ${sval(v, 'm/s')})`).join(', ')}.`,
          `Die Steigung von s(t): v ändert sich in jedem Stück gleichmässig, ohne Sprünge (s(t) hat keine Knicke). Es geht durch ${vPts.map(([t, v]) => `(${num(t)} s, ${sval(v, 'm/s')})`).join(', ')}.`), vFig({ dots: vPts })),
        step(L('The a(t) graph', 'Der a(t)-Graph'), L(`The slope of v(t) in each piece: ${ps.map(aLine).join('; ')}.`, `Die Steigung von v(t) in jedem Stück: ${ps.map(aLine).join('; ')}.`), G.right()),
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

  const BUILD = { compare, direction, table, match: matchEx };
  const DIFF = { compare: [1, 2], direction: [2], table: [2], match: [2, 3, 4] };
  const make = (kind, seed, d) => BUILD[kind](seed, d);
  for (const k of Object.keys(BUILD)) Motion.register(k, { difficulties: DIFF[k], make: (seed, d) => make(k, seed, d) });

  const api = { KINDS: Object.keys(BUILD), DIFF, FLAGS, make, question };
  root.Concepts = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
