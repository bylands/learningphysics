// The exercises, with their texts, in the current language (the app rebuilds them when the
// language changes). Every exercise has the form
//   { id, type, kind, difficulty, title, text (HTML), figs (HTML of the given figures), pic (a
//     picture of figures.js: [name, args]), questions, draw, hints, solution (HTML paragraphs),
//     solFig (HTML), p (what makes it new to the student) }
// with questions of three kinds:
//   { type: 'pick', key, label, options: [{ html (a graph), ok, tag, why }] }   one of four graphs
//   { type: 'choice', key, label, options: [{ label, ok, tag, why }] }          one of a few values
//   { type: 'multi', key, label, statements: [{ html, ok, why }] }              statements to tick
// A wrong option may carry a nudge: shown in practice in place of a why that gives the answer away.
// and, for a drawing, draw = { kind ('flux' | 'volt'), at, spans, target, init }: the handles the
// student sets to whole values (plot.js).
// The types:
//   phi2v-lin, v2phi-lin, phi2v-smooth, v2phi-smooth   one graph given, the other chosen from four
//   value-v-lin, value-v-smooth        the voltage at two times, read off a flux graph
//   value-dphi-lin, value-dphi-smooth  the change of the flux (minus the area) and its end value
//   stmts-phi-lin, stmts-phi-smooth, stmts-v-lin, stmts-v-smooth   which statements are correct?
//   draw-v-lin, draw-v-smooth, draw-phi-lin   draw the voltage (or the flux) graph
//   loop-wide, loop-narrow, loop-num   a square loop pulled through a field region: its flux and
//                                      voltage graphs, or the numbers
//   lenz-magnet, lenz-field            the direction of the induced current (Lenz's rule)
//   lenz-gradient                      a loop moved in a field stronger on one side: the current and
//                                      the force on the loop
(function (root) {
  'use strict';

  const I = root.Induction || require('./generator.js');
  const P = root.Plot || require('./plot.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const { T, PHI_MAX, flux, volt, curved, rng, opt, differ, fits, graphFrom } = I;
  const { fluxGraph, voltGraph, optionGraph, num, dec } = P;

  // ---------------------------------------------------------------- text helpers
  // Voltage is V in English and U in German, as in the textbooks.
  const PHI = '<i>Φ</i>', DPHI = `d${PHI}/d<i>t</i>`;
  const Vi = () => L('<i>V</i><sub>ind</sub>', '<i>U</i><sub>ind</sub>');
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const r4 = (x) => Math.round(x * 1e4) / 1e4; // lengths and speeds in m from cm
  const fmt = (x) => dec(r2(x));
  const sgn = (x) => num(r2(x));
  const neg = (x) => (x === 0 ? 0 : -x);
  const par = (x) => (x < 0 ? `(${sgn(x)})` : fmt(x)); // a value in a sum
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const when = (p) => `${fmt(p.t0)}–${fmt(p.t1)} s`;
  const between = (a, b) => L(`between ${fmt(a)} s and ${fmt(b)} s`, `zwischen ${fmt(a)} s und ${fmt(b)} s`);
  const endOf = (g, p) => flux(g, p.t1 - 1e-12);
  const Fat = (g, t) => flux(g, Math.min(t, T - 1e-9));
  // where the slope of a curved piece passes through zero (a peak or valley of Φ), or null
  const zeroOf = (p) => (p.d0 * p.d1 < 0 ? p.t0 + (p.d0 / (p.d0 - p.d1)) * (p.t1 - p.t0) : null);
  const H = { flux: () => L('Magnetic flux', 'Magnetischer Fluss'), volt: () => L('Induced voltage', 'Induzierte Spannung') };
  const pairFigure = (fl, vo) => `<div class="tgraphs"><div><h3 class="qc-flux">${H.flux()} ${PHI}</h3>${fl}</div><div><h3 class="qc-volt">${H.volt()} ${Vi()}</h3>${vo}</div></div>`;
  const one = (kind, html) => `<div class="given"><h3 class="qc-${kind}">${H[kind]()}</h3>${html}</div>`;
  const ul = (items) => `<ul>${items.map((s) => `<li>${s}</li>`).join('')}</ul>`;

  // From the flux to the voltage: one piece of the flux graph.
  function describe(p) {
    const V = Vi(), s0 = p.d0, s1 = p.d1;
    if (!curved(p)) {
      return s0 === 0 ? L(`${when(p)}: ${PHI} is constant, so ${V} = 0`, `${when(p)}: ${PHI} ist konstant, also ${V} = 0`)
        : L(`${when(p)}: ${PHI} changes at ${num(s0)} mWb/s, so ${V} = ${num(neg(s0))} mV`,
          `${when(p)}: ${PHI} ändert sich mit ${num(s0)} mWb/s, also ${V} = ${num(neg(s0))} mV`);
    }
    const z = zeroOf(p), peak = s0 > 0;
    return L(`${when(p)}: the slope of ${PHI} changes steadily from ${num(s0)} to ${num(s1)} mWb/s, so ${V} goes from ${num(neg(s0))} to ${num(neg(s1))} mV along a straight line` +
      (z === null ? '' : `; at ${fmt(z)} s, ${PHI} has a ${peak ? 'peak' : 'valley'} and ${V} passes through 0`),
    `${when(p)}: Die Steigung von ${PHI} ändert sich gleichmässig von ${num(s0)} auf ${num(s1)} mWb/s, also geht ${V} auf einer Geraden von ${num(neg(s0))} auf ${num(neg(s1))} mV` +
      (z === null ? '' : `; bei ${fmt(z)} s hat ${PHI} einen ${peak ? 'Hochpunkt' : 'Tiefpunkt'}, und ${V} geht durch 0`));
  }

  // From the voltage to the flux: one piece, with the flux at its start and end.
  function describeBack(g, p) {
    const V = Vi(), a = neg(p.d0), b = neg(p.d1), len = p.t1 - p.t0, y0 = p.p0, y1 = endOf(g, p), dy = r1(y1 - y0);
    if (!curved(p)) {
      return a === 0 ? L(`${when(p)}: ${V} = 0, so ${PHI} stays at ${fmt(y0)} mWb`, `${when(p)}: ${V} = 0, also bleibt ${PHI} bei ${fmt(y0)} mWb`)
        : L(`${when(p)}: ${V} = ${num(a)} mV, so ${PHI} ${a > 0 ? 'falls' : 'rises'} at ${fmt(Math.abs(a))} mWb/s, by ${fmt(Math.abs(a))} mV · ${fmt(len)} s = ${fmt(Math.abs(dy))} mWb: from ${fmt(y0)} to ${fmt(y1)} mWb`,
          `${when(p)}: ${V} = ${num(a)} mV, also ${a > 0 ? 'sinkt' : 'steigt'} ${PHI} mit ${fmt(Math.abs(a))} mWb/s, um ${fmt(Math.abs(a))} mV · ${fmt(len)} s = ${fmt(Math.abs(dy))} mWb: von ${fmt(y0)} auf ${fmt(y1)} mWb`);
    }
    const z = zeroOf(p), peak = p.d0 > 0;
    return L(`${when(p)}: ${V} goes steadily from ${num(a)} to ${num(b)} mV, so the slope of ${PHI} goes steadily from ${num(p.d0)} to ${num(p.d1)} mWb/s: the flux graph is curved` +
      (z === null ? '' : `, with a ${peak ? 'peak' : 'valley'} at ${fmt(z)} s, where ${V} = 0`) +
      `. ${PHI} changes by minus the area under the voltage graph, −½ · (${par(a)} + ${par(b)}) mV · ${fmt(len)} s = ${num(dy)} mWb: from ${fmt(y0)} to ${fmt(y1)} mWb`,
    `${when(p)}: ${V} geht gleichmässig von ${num(a)} auf ${num(b)} mV, also geht die Steigung von ${PHI} gleichmässig von ${num(p.d0)} auf ${num(p.d1)} mWb/s: Der Flussgraph ist gekrümmt` +
      (z === null ? '' : `, mit einem ${peak ? 'Hochpunkt' : 'Tiefpunkt'} bei ${fmt(z)} s, wo ${V} = 0`) +
      `. ${PHI} ändert sich um minus die Fläche unter dem Spannungsgraphen, −½ · (${par(a)} + ${par(b)}) mV · ${fmt(len)} s = ${num(dy)} mWb: von ${fmt(y0)} auf ${fmt(y1)} mWb`);
  }
  const lines = (dir, g) => g.pieces.map((p) => (dir === 'phi2v' ? describe(p) : describeBack(g, p)));

  // The rule for the kind of graph.
  const RULE = {
    phi2v: {
      lin: () => L(`Each straight piece of the flux graph gives a constant voltage: the steeper the piece, the larger |${Vi()}|. Rising flux gives a negative voltage, falling flux a positive one. Where the slope of ${PHI} changes suddenly (at a kink), ${Vi()} jumps.`,
        `Jedes gerade Stück des Flussgraphen ergibt eine konstante Spannung: Je steiler das Stück, desto grösser |${Vi()}|. Steigender Fluss ergibt eine negative Spannung, sinkender eine positive. Wo sich die Steigung von ${PHI} plötzlich ändert (bei einem Knick), springt ${Vi()}.`),
      smooth: () => L(`The flux graph has no kinks, so ${Vi()} has no jumps. Where the flux graph bends evenly, its slope changes steadily, so ${Vi()} is a sloping straight line. At a peak or a valley of ${PHI}, ${Vi()} passes through zero; where ${PHI} is steepest, |${Vi()}| is largest.`,
        `Der Flussgraph hat keine Knicke, also hat ${Vi()} keine Sprünge. Wo sich der Flussgraph gleichmässig krümmt, ändert sich seine Steigung gleichmässig, also ist ${Vi()} eine schräge Gerade. Bei einem Hoch- oder Tiefpunkt von ${PHI} geht ${Vi()} durch null; wo ${PHI} am steilsten ist, ist |${Vi()}| am grössten.`),
    },
    v2phi: {
      lin: () => L(`Where ${Vi()} is constant, ${PHI} changes at a constant rate: a straight line with slope −${Vi()}. ${PHI} changes by −${Vi()} · Δ<i>t</i>, minus the area under the voltage graph. Where ${Vi()} jumps, the flux graph has a kink.`,
        `Wo ${Vi()} konstant ist, ändert sich ${PHI} gleichmässig: eine Gerade mit der Steigung −${Vi()}. ${PHI} ändert sich um −${Vi()} · Δ<i>t</i>, minus die Fläche unter dem Spannungsgraphen. Wo ${Vi()} springt, hat der Flussgraph einen Knick.`),
      smooth: () => L(`Where ${Vi()} changes steadily, the slope of ${PHI} changes steadily: the flux graph is curved, without kinks. Where ${Vi()} crosses zero, ${PHI} has a peak or a valley. ${PHI} changes by minus the area under the voltage graph.`,
        `Wo sich ${Vi()} gleichmässig ändert, ändert sich die Steigung von ${PHI} gleichmässig: Der Flussgraph ist gekrümmt, ohne Knicke. Wo ${Vi()} durch null geht, hat ${PHI} einen Hoch- oder Tiefpunkt. ${PHI} ändert sich um minus die Fläche unter dem Spannungsgraphen.`),
    },
  };
  const LAW = () => L(`${Vi()} = −${DPHI}: the induced voltage is the slope of the flux graph, with the opposite sign (Lenz's rule).`,
    `${Vi()} = −${DPHI}: Die induzierte Spannung ist die Steigung des Flussgraphen, mit umgekehrtem Vorzeichen (Lenzsche Regel).`);

  // A first step for the hints, in the first piece where something happens: what to read off there,
  // without the result (the student works it out).
  function example(dir, family, g) {
    const ps = g.pieces, p = (family === 'smooth' && ps.find(curved)) || ps.find((q) => q.d0 !== 0) || ps[0];
    const V = Vi(), len = p.t1 - p.t0, y1 = endOf(g, p);
    if (dir === 'v2phi') {
      const a = neg(p.d0), b = neg(p.d1);
      return curved(p)
        ? L(`For example ${between(p.t0, p.t1)}: under the voltage graph lies a trapezoid, from ${num(a)} mV to ${num(b)} mV and ${fmt(len)} s wide. Its area, with the opposite sign, is how much ${PHI} changes there; and where ${V} crosses zero, ${PHI} turns round.`,
          `Zum Beispiel ${between(p.t0, p.t1)}: Unter dem Spannungsgraphen liegt ein Trapez, von ${num(a)} mV bis ${num(b)} mV und ${fmt(len)} s breit. Seine Fläche, mit umgekehrtem Vorzeichen, ist die Änderung von ${PHI} dort; und wo ${V} durch null geht, kehrt ${PHI} um.`)
        : L(`For example ${between(p.t0, p.t1)}: under the voltage graph lies a rectangle, ${num(a)} mV high and ${fmt(len)} s wide. Its area, with the opposite sign, is how much ${PHI} changes there, starting from ${fmt(p.p0)} mWb.`,
          `Zum Beispiel ${between(p.t0, p.t1)}: Unter dem Spannungsgraphen liegt ein Rechteck, ${num(a)} mV hoch und ${fmt(len)} s breit. Seine Fläche, mit umgekehrtem Vorzeichen, ist die Änderung von ${PHI} dort, ausgehend von ${fmt(p.p0)} mWb.`);
    }
    if (curved(p)) {
      return L(`For example ${between(p.t0, p.t1)}: draw tangents to the flux graph at ${fmt(p.t0)} s and at ${fmt(p.t1)} s and read off their slopes. ${V} runs along a straight line between minus these two slopes.`,
        `Zum Beispiel ${between(p.t0, p.t1)}: Zeichne Tangenten an den Flussgraphen bei ${fmt(p.t0)} s und bei ${fmt(p.t1)} s und lies ihre Steigungen ab. ${V} verläuft auf einer Geraden zwischen minus diesen beiden Steigungen.`);
    }
    return L(`For example ${between(p.t0, p.t1)}: ${PHI} goes from ${fmt(p.p0)} mWb to ${fmt(y1)} mWb in ${fmt(len)} s. What slope is that, and so what voltage?`,
      `Zum Beispiel ${between(p.t0, p.t1)}: ${PHI} geht in ${fmt(len)} s von ${fmt(p.p0)} mWb auf ${fmt(y1)} mWb. Welche Steigung ist das, und also welche Spannung?`);
  }
  // the parts of a graph, and where the slope of the flux changes suddenly (the voltage jumps)
  const partsOf = (g) => g.pieces.map(when).join(', ');
  const kinksOf = (g) => g.pieces.slice(1).filter((p, i) => p.d0 !== g.pieces[i].d1).map((p) => `${fmt(p.t0)} s`);
  const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')}${L(' and ', ' und ')}${xs[xs.length - 1]}`);

  function graphHints(dir, family, g, phi0) {
    const V = Vi(), n = g.pieces.length, kinks = kinksOf(g), curvedParts = g.pieces.filter(curved).map(when);
    if (dir === 'phi2v') {
      return [
        L(`The flux graph has ${n} parts: ${partsOf(g)}. In each, does ${PHI} rise, fall or stay constant, and how steeply? Only that counts for ${V}, not how large ${PHI} is.`,
          `Der Flussgraph hat ${n} Teile: ${partsOf(g)}. Steigt ${PHI} in jedem davon, sinkt er oder bleibt er konstant, und wie steil? Nur das zählt für ${V}, nicht wie gross ${PHI} ist.`),
        L(`In each part, ${V} = −${DPHI}: the slope of the flux graph with the opposite sign (Lenz's rule). Rising flux gives a negative voltage, falling flux a positive one, a horizontal part zero.`,
          `In jedem Teil ist ${V} = −${DPHI}: die Steigung des Flussgraphen mit umgekehrtem Vorzeichen (Lenzsche Regel). Steigender Fluss ergibt eine negative Spannung, sinkender eine positive, ein waagrechtes Stück null.`),
        family === 'lin'
          ? L(`Here every part is straight, so each gives one constant voltage. Where does the slope change suddenly, from one part to the next? There ${V} jumps.`,
            `Hier ist jeder Teil gerade, also ergibt jeder eine konstante Spannung. Wo ändert sich die Steigung plötzlich, von einem Teil zum nächsten? Dort springt ${V}.`)
          : L(`Here the flux graph has no kinks, so ${V} has no jumps. ${curvedParts.length ? `It is curved ${listOf(curvedParts)}: there its slope changes steadily, so ${V} is a sloping straight line. ` : ''}Where does ${PHI} have a peak or a valley?`,
            `Hier hat der Flussgraph keine Knicke, also hat ${V} keine Sprünge. ${curvedParts.length ? `Gekrümmt ist er ${listOf(curvedParts)}: Dort ändert sich seine Steigung gleichmässig, also ist ${V} eine schräge Gerade. ` : ''}Wo hat ${PHI} einen Hoch- oder Tiefpunkt?`),
        example(dir, family, g),
      ];
    }
    const zs = g.pieces.map(zeroOf).filter((z) => z !== null).map((z) => `${fmt(z)} s`);
    return [
      L(`The voltage graph has ${n} parts: ${partsOf(g)}. In each, is ${V} positive, negative or zero? That tells you whether ${PHI} falls, rises or stays constant there, but not its value.`,
        `Der Spannungsgraph hat ${n} Teile: ${partsOf(g)}. Ist ${V} in jedem davon positiv, negativ oder null? Das sagt dir, ob ${PHI} dort sinkt, steigt oder konstant bleibt, aber nicht seinen Wert.`),
      L(`${DPHI} = −${V}: starting at ${fmt(phi0)} mWb, in each part ${PHI} changes by minus the area under the voltage graph (area above the axis counts positive, below negative).`,
        `${DPHI} = −${V}: Ausgehend von ${fmt(phi0)} mWb ändert sich ${PHI} in jedem Teil um minus die Fläche unter dem Spannungsgraphen (Fläche über der Achse zählt positiv, darunter negativ).`),
      family === 'lin'
        ? L(`Here ${V} is constant in each part, so the flux graph is a straight line there. ${kinks.length ? `Where ${V} jumps, at ${listOf(kinks)}, the flux graph has a kink, not a jump.` : ''}`,
          `Hier ist ${V} in jedem Teil konstant, also ist der Flussgraph dort eine Gerade. ${kinks.length ? `Wo ${V} springt, bei ${listOf(kinks)}, hat der Flussgraph einen Knick, keinen Sprung.` : ''}`).trim()
        : L(`Where ${V} is a sloping line here, the flux graph is curved, without kinks. ${zs.length ? `${V} crosses zero at ${listOf(zs)}: there ${PHI} has a peak or a valley.` : `${V} does not cross zero inside a part.`}`,
          `Wo ${V} hier eine schräge Gerade ist, ist der Flussgraph gekrümmt, ohne Knicke. ${zs.length ? `${V} geht bei ${listOf(zs)} durch null: Dort hat ${PHI} einen Hoch- oder Tiefpunkt.` : `${V} geht innerhalb eines Teils nicht durch null.`}`),
      example(dir, family, g),
    ];
  }

  // The worked solution of a graph: the rule and the graph piece by piece.
  function graphSolution(dir, g, phi0) {
    const intro = dir === 'phi2v'
      ? L(`The induced voltage is the slope of the flux graph with the opposite sign, ${Vi()} = −${DPHI}.`, `Die induzierte Spannung ist die Steigung des Flussgraphen mit umgekehrtem Vorzeichen, ${Vi()} = −${DPHI}.`)
      : L(`The voltage gives the slope of the flux graph, with the opposite sign: ${DPHI} = −${Vi()}. Starting at ${fmt(phi0)} mWb:`, `Die Spannung gibt die Steigung des Flussgraphen an, mit umgekehrtem Vorzeichen: ${DPHI} = −${Vi()}. Beginnend bei ${fmt(phi0)} mWb:`);
    return [intro, ul(lines(dir, g).map((s) => `${s}.`)),
      `<span class="note">${L('The numbers above the graphs are the slopes of the flux (in mWb/s) and the voltages (in mV) at the start and end of each part; “+2 → 0” means from +2 to 0.',
        'Die Zahlen über den Graphen sind die Steigungen des Flusses (in mWb/s) und die Spannungen (in mV) am Anfang und am Ende jedes Teils; «+2 → 0» heisst von +2 auf 0.')}</span>`];
  }
  const solGraphs = (g) => pairFigure(fluxGraph(g, true), voltGraph(g, true));

  // What a wrong graph suggests, by its tag (see generator.js).
  const WHY = {
    phi2v: {
      sign: () => L(`This graph has the wrong sign. By Lenz's rule, ${Vi()} = −${DPHI}: where ${PHI} increases, ${Vi()} is negative, and where it decreases, ${Vi()} is positive.`,
        `Dieser Graph hat das falsche Vorzeichen. Nach der Lenzschen Regel ist ${Vi()} = −${DPHI}: Wo ${PHI} zunimmt, ist ${Vi()} negativ, und wo er abnimmt, ist ${Vi()} positiv.`),
      copy: () => L(`This graph has the shape of the flux graph. But ${Vi()} does not depend on how large ${PHI} is, only on how fast it changes: where ${PHI} is constant or has a peak, ${Vi()} = 0.`,
        `Dieser Graph hat die Form des Flussgraphen. Aber ${Vi()} hängt nicht davon ab, wie gross ${PHI} ist, sondern nur davon, wie schnell er sich ändert: Wo ${PHI} konstant ist oder einen Hochpunkt hat, ist ${Vi()} = 0.`),
      steep: () => L(`The signs fit, but in one part the voltage does not match how steep the flux graph is. Read off the slope: ${Vi()} = −Δ${PHI}/Δ<i>t</i>.`,
        `Die Vorzeichen passen, aber in einem Teil passt die Spannung nicht dazu, wie steil der Flussgraph ist. Lies die Steigung ab: ${Vi()} = −Δ${PHI}/Δ<i>t</i>.`),
      average: () => L(`This graph is constant in each part, as if the flux graph were straight there. But where ${PHI} is curved, its slope changes all the time, so ${Vi()} changes too: a sloping line, not the average slope Δ${PHI}/Δ<i>t</i>.`,
        `Dieser Graph ist in jedem Teil konstant, als wäre der Flussgraph dort gerade. Aber wo ${PHI} gekrümmt ist, ändert sich seine Steigung laufend, also ändert sich auch ${Vi()}: eine schräge Gerade, nicht die mittlere Steigung Δ${PHI}/Δ<i>t</i>.`),
    },
    v2phi: {
      sign: () => L(`This flux has the wrong direction: it rises where ${Vi()} is positive. By Lenz's rule, ${Vi()} = −${DPHI}: a positive voltage means a decreasing flux.`,
        `Dieser Fluss ändert sich in die falsche Richtung: Er steigt, wo ${Vi()} positiv ist. Nach der Lenzschen Regel ist ${Vi()} = −${DPHI}: Eine positive Spannung bedeutet einen abnehmenden Fluss.`),
      copy: () => L(`This graph has the shape of the voltage graph. But the voltage gives the slope of the flux graph, not its value: where ${Vi()} = 0, ${PHI} is constant, and where ${Vi()} is constant, ${PHI} is a sloping line.`,
        `Dieser Graph hat die Form des Spannungsgraphen. Aber die Spannung gibt die Steigung des Flussgraphen an, nicht seinen Wert: Wo ${Vi()} = 0, ist ${PHI} konstant, und wo ${Vi()} konstant ist, ist ${PHI} eine schräge Gerade.`),
      steep: () => L(`The directions fit, but in one part this flux changes by the wrong amount. ${PHI} changes by minus the area under the voltage graph.`,
        `Die Richtungen passen, aber in einem Teil ändert sich dieser Fluss um den falschen Betrag. ${PHI} ändert sich um minus die Fläche unter dem Spannungsgraphen.`),
      straight: () => L(`This flux graph is made of straight lines, which would give a constant voltage in each part. But where ${Vi()} changes steadily, the slope of ${PHI} changes steadily: the flux graph is curved.`,
        `Dieser Flussgraph besteht aus Geraden, was in jedem Teil eine konstante Spannung ergäbe. Aber wo sich ${Vi()} gleichmässig ändert, ändert sich die Steigung von ${PHI} gleichmässig: Der Flussgraph ist gekrümmt.`),
    },
  };

  // In practice, while the exercise is open, a nudge in place of a reason that would give the answer
  // away (app.js); the reason itself stays for the check, the tutor and once the exercise is solved.
  const NUDGE = {
    phi2v: () => L(`Check the sign: by Lenz's rule, ${Vi()} = −${DPHI}. Where ${PHI} increases, which sign must ${Vi()} have?`,
      `Prüfe das Vorzeichen: Nach der Lenzschen Regel ist ${Vi()} = −${DPHI}. Welches Vorzeichen muss ${Vi()} haben, wo ${PHI} zunimmt?`),
    v2phi: () => L(`Check the direction: by Lenz's rule, ${Vi()} = −${DPHI}. Where ${Vi()} is positive, must ${PHI} rise or fall?`,
      `Prüfe die Richtung: Nach der Lenzschen Regel ist ${Vi()} = −${DPHI}. Muss ${PHI} steigen oder fallen, wo ${Vi()} positiv ist?`),
    signV: () => L("Check the sign: does the flux increase or decrease at this time, and what sign does that give the induced voltage (Lenz's rule)?",
      'Prüfe das Vorzeichen: Nimmt der Fluss zu dieser Zeit zu oder ab, und welches Vorzeichen gibt das der induzierten Spannung (Lenzsche Regel)?'),
    signD: () => L('Check the sign: the flux changes by minus the area under the voltage graph. Is that area positive or negative here?',
      'Prüfe das Vorzeichen: Der Fluss ändert sich um minus die Fläche unter dem Spannungsgraphen. Ist diese Fläche hier positiv oder negativ?'),
    signL: () => L("Check the sign: while the loop moves in, does the flux increase or decrease, and what sign does that give the voltage (Lenz's rule)?",
      'Prüfe das Vorzeichen: Nimmt der Fluss zu oder ab, während die Schleife hineinfährt, und welches Vorzeichen gibt das der Spannung (Lenzsche Regel)?'),
    overlap: () => L('Compare the loop with the field region: which is narrower, and how much of the loop can be in the field at most?',
      'Vergleiche die Schleife mit dem Feldgebiet: Was ist schmaler, und wie viel der Schleife kann höchstens im Feld liegen?'),
    side: () => L('Compare the loop with the field region: which is wider, and when does the flux stop growing?',
      'Vergleiche die Schleife mit dem Feldgebiet: Was ist breiter, und wann hört der Fluss auf zu wachsen?'),
    motion: () => L('Motion alone does not decide it: does the field strength inside the loop change along this path?',
      'Bewegung allein entscheidet nicht: Ändert sich die Feldstärke in der Schleife entlang dieses Weges?'),
    sense: () => L("Does the flux increase or decrease here? By Lenz's rule, should the field of the induced current inside the loop point along the outer field or against it?",
      'Nimmt der Fluss hier zu oder ab? Soll das Feld des induzierten Stroms in der Schleife nach der Lenzschen Regel in Richtung des äusseren Feldes zeigen oder dagegen?'),
    force: () => L("Which way does the loop move, and does the force, by Lenz's rule, help this motion or oppose it?",
      'In welche Richtung bewegt sich die Schleife, und hilft die Kraft nach der Lenzschen Regel dieser Bewegung, oder wirkt sie ihr entgegen?'),
  };
  // the nudge of a wrong option, where it has one
  const nudged = (o, n) => (!o.ok && n ? { ...o, nudge: n() } : o);

  const prompt = (dir, phi0) => (dir === 'phi2v'
    ? L('<p>The graph shows the magnetic flux through a conducting loop.</p>', '<p>Der Graph zeigt den magnetischen Fluss durch eine Leiterschleife.</p>')
    : L(`<p>The graph shows the voltage induced in a conducting loop. At the start, the magnetic flux through the loop is ${fmt(phi0)} mWb.</p>`,
      `<p>Der Graph zeigt die in einer Leiterschleife induzierte Spannung. Zu Beginn beträgt der magnetische Fluss durch die Schleife ${fmt(phi0)} mWb.</p>`));
  const askGraph = (dir) => (dir === 'phi2v' ? L('Which graph shows the induced voltage?', 'Welcher Graph zeigt die induzierte Spannung?')
    : L('Which graph shows the magnetic flux?', 'Welcher Graph zeigt den magnetischen Fluss?'));
  const given = (dir, g) => (dir === 'phi2v' ? one('flux', fluxGraph(g)) : one('volt', voltGraph(g)));

  // A flux graph of a family that fits the axis, at a whole starting value.
  function placed(r, family) {
    for (;;) {
      const base = family === 'lin' ? I.linGraph(r) : I.smoothGraph(r), list = base.pieces.map((p) => [p.t0, p.t1, p.d0, p.d1]);
      const g0 = graphFrom(list, 0), [lo, hi] = I.range((t) => flux(g0, t)), a = Math.ceil(-lo - 1e-9), b = Math.floor(PHI_MAX - hi + 1e-9);
      if (a <= b) { const g = graphFrom(list, r.int(a, b)); return { g, ts: base.ts, phi0: g.pieces[0].p0 }; }
    }
  }
  const keyOf = (g) => ({ d: g.pieces.map((q) => [q.t1, q.d0, q.d1]), phi0: g.pieces[0].p0 });

  // The options of a value: the right one and the mistakes (tag), then neighbours, four in all, sorted.
  function values(right, cands, unit, o = {}) {
    const out = [{ value: r2(right), ok: true, tag: 'right' }], step = o.step || 1;
    const add = (v, tag) => {
      v = r2(v);
      if (out.length < 4 && Number.isFinite(v) && (o.min == null || v >= o.min) && out.every((x) => Math.abs(x.value - v) > 0.2)) out.push({ value: v, ok: false, tag });
    };
    // signed answers: two sizes, each positive and negative, so that the sign gives nothing away
    if (o.signed && Math.abs(r2(right)) > 1e-9) {
      const R = Math.abs(r2(right)), m = [...cands.map((c) => ({ v: r2(c.value), tag: c.tag })), ...[1, 2, 3, 4].map((k) => ({ v: R + k * step, tag: 'other' }))]
        .find((c) => Number.isFinite(c.v) && Math.abs(c.v) > 1e-9 && Math.abs(Math.abs(c.v) - R) > 0.2);
      const sg = cands.find((c) => Math.abs(r2(c.value) + r2(right)) < 1e-9);
      out.push({ value: -r2(right), ok: false, tag: sg ? sg.tag : 'sign' }, { value: m.v, ok: false, tag: m.tag }, { value: -m.v, ok: false, tag: 'other' });
    }
    cands.forEach((c) => add(c.value, c.tag));
    for (const k of [1, -1, 2, -2, 3, -3, 4]) add(right + k * step, 'other');
    return out.sort((a, b) => a.value - b.value).map((x) => ({ ...x, label: `${o.signed ? sgn(x.value) : x.value < 0 ? sgn(x.value) : fmt(x.value)} ${unit}` }));
  }
  const explained = (options, whyOf, how) => options.map((x) => ({ ...x, why: x.ok ? '' : `${whyOf[x.tag] ? whyOf[x.tag]() + ' ' : ''}${how}` }));
  const choice = (key, label, options) => ({ type: 'choice', key, label, options });
  const words = (r, list) => r.shuffle(list.map(([label, ok, why]) => ({ label, ok, why: ok ? '' : why })));

  // ---------------------------------------------------------------- one graph given, four to choose from
  function pickExercise(type, seed) {
    const e = I.generate(type, seed), { dir, family, g, phi0 } = e;
    return {
      kind: 'pick', dir, family, title: dir === 'phi2v' ? L('From flux to voltage', 'Vom Fluss zur Spannung') : L('From voltage to flux', 'Von der Spannung zum Fluss'),
      text: prompt(dir, phi0), figs: given(dir, g),
      questions: [{ type: 'pick', key: 'g', label: askGraph(dir), options: e.options.map((o) => ({ html: optionGraph(o), ok: o.ok, tag: o.tag, why: o.ok ? '' : WHY[dir][o.tag]() })).map((o) => nudged(o, o.tag === 'sign' && NUDGE[dir])) }],
      hints: graphHints(dir, family, g, phi0), solution: graphSolution(dir, g, phi0), solFig: solGraphs(g), g, phi0, p: e.p,
    };
  }

  // ---------------------------------------------------------------- reading off values
  const WHYV = {
    sign: () => L("Mind the sign: where the flux increases, the induced voltage is negative (Lenz's rule).", 'Achte auf das Vorzeichen: Wo der Fluss zunimmt, ist die induzierte Spannung negativ (Lenzsche Regel).'),
    copy: () => L('That is the value of the flux at that time, not how fast it changes.', 'Das ist der Wert des Flusses zu dieser Zeit, nicht wie schnell er sich ändert.'),
    steep: () => L('That belongs to another part of the graph.', 'Das gehört zu einem anderen Teil des Graphen.'),
    delta: () => L('That is the change of the flux over the whole part: divide it by the time it takes.', 'Das ist die Änderung des Flusses über das ganze Stück: Teile sie durch die Zeit, die es dauert.'),
    zero: () => L('The flux changes here, so a voltage is induced.', 'Der Fluss ändert sich hier, also wird eine Spannung induziert.'),
    average: () => L('That is the average slope of a curved part; the voltage at a moment is given by the tangent there.', 'Das ist die mittlere Steigung eines gekrümmten Teils; die Spannung in einem Moment gibt die Tangente dort an.'),
  };
  function valueV(family, seed) {
    const r = rng(seed * 31 + 7), { g, ts } = placed(r, family), ps = g.pieces, qs = [];
    const at = [];
    if (family === 'lin') {
      const idx = r.shuffle(ps.map((p, i) => i)).slice(0, 2).sort((a, b) => a - b);
      idx.forEach((i) => at.push({ t: (ps[i].t0 + ps[i].t1) / 2, i }));
    } else {
      const ks = r.shuffle(ts.map((t, k) => k)).slice(0, 2).sort((a, b) => a - b);
      ks.forEach((k) => at.push({ t: ts[k], i: Math.min(k, ps.length - 1) }));
    }
    const hows = []; // each read-off in the solution, so that it is not given away before
    at.forEach(({ t, i }, n) => {
      const p = ps[i], tt = Math.min(t, T - 1e-9), d = I.SHAPE.poly.df(p, tt - p.t0), right = neg(r2(d)), y0 = p.p0, y1 = endOf(g, p), len = p.t1 - p.t0;
      const other = ps[i > 0 ? i - 1 : i + 1];
      const how = family === 'lin'
        ? L(`Between ${fmt(p.t0)} s and ${fmt(p.t1)} s, ${PHI} changes from ${fmt(y0)} to ${fmt(y1)} mWb in ${fmt(len)} s: the slope is ${num(p.d0)} mWb/s, so ${Vi()} = ${num(right)} mV.`,
          `Zwischen ${fmt(p.t0)} s und ${fmt(p.t1)} s ändert sich ${PHI} in ${fmt(len)} s von ${fmt(y0)} auf ${fmt(y1)} mWb: Die Steigung ist ${num(p.d0)} mWb/s, also ${Vi()} = ${num(right)} mV.`)
        : L(`At ${fmt(t)} s, the tangent to the flux graph has the slope ${sgn(d)} mWb/s, so ${Vi()} = ${num(right)} mV.`,
          `Bei ${fmt(t)} s hat die Tangente an den Flussgraphen die Steigung ${sgn(d)} mWb/s, also ${Vi()} = ${num(right)} mV.`);
      hows.push(how);
      const cands = family === 'lin'
        ? [{ value: -right, tag: 'sign' }, { value: Fat(g, t), tag: 'copy' }, { value: neg(other.d0), tag: 'steep' }, { value: -(y1 - y0), tag: 'delta' }, { value: 0, tag: 'zero' }]
        : [{ value: -right, tag: 'sign' }, { value: -(p.d0 + p.d1) / 2, tag: 'average' }, { value: Fat(g, t), tag: 'copy' }, { value: 0, tag: 'zero' }];
      qs.push(choice(`v${n}`, L(`(${'ab'[n]}) the induced voltage at <i>t</i> = ${fmt(t)} s`, `(${'ab'[n]}) die induzierte Spannung bei <i>t</i> = ${fmt(t)} s`),
        explained(values(right, r.shuffle(cands.slice(0, 1).concat(r.shuffle(cands.slice(1)))), 'mV', { signed: true }), WHYV, how).map((o) => nudged(o, o.tag === 'sign' && NUDGE.signV))));
    });
    return {
      kind: 'value', dir: 'phi2v', family, title: L('Reading off the voltage', 'Die Spannung ablesen'),
      text: L('<p>The graph shows the magnetic flux through a conducting loop. How large is the induced voltage at the two times?</p>', '<p>Der Graph zeigt den magnetischen Fluss durch eine Leiterschleife. Wie gross ist die induzierte Spannung zu den beiden Zeiten?</p>'),
      figs: one('flux', fluxGraph(g)), questions: qs,
      hints: graphHints('phi2v', family, g).slice(0, 2).concat(family === 'lin'
        ? [L(`${at.map(({ t, i }, n) => `(${'ab'[n]}) ${fmt(t)} s lies in the part ${when(ps[i])}`).join(', ')}: read off how much ${PHI} changes over each whole part and divide by its duration, ${DPHI} = Δ${PHI}/Δ<i>t</i>.`,
          `${at.map(({ t, i }, n) => `(${'ab'[n]}) ${fmt(t)} s liegt im Teil ${when(ps[i])}`).join(', ')}: Lies ab, um wie viel sich ${PHI} über den ganzen Teil ändert, und teile durch seine Dauer, ${DPHI} = Δ${PHI}/Δ<i>t</i>.`)]
        : [L(`Draw the tangent to the flux graph at ${listOf(at.map(({ t }) => `${fmt(t)} s`))} and read off its slope there, as Δ${PHI}/Δ<i>t</i> along the tangent.`, `Zeichne die Tangente an den Flussgraphen bei ${listOf(at.map(({ t }) => `${fmt(t)} s`))} und lies dort ihre Steigung ab, als Δ${PHI}/Δ<i>t</i> längs der Tangente.`)]),
      solution: graphSolution('phi2v', g).concat(hows), solFig: solGraphs(g), g, p: { ...keyOf(g), at: at.map((x) => x.t) },
    };
  }

  const WHYD = {
    sign: () => L('Mind the sign: a positive voltage means a decreasing flux.', 'Achte auf das Vorzeichen: Eine positive Spannung bedeutet einen abnehmenden Fluss.'),
    notime: () => L('The area under the voltage graph is voltage times time: multiply each voltage by how long it lasts.', 'Die Fläche unter dem Spannungsgraphen ist Spannung mal Zeit: Multipliziere jede Spannung mit ihrer Dauer.'),
    height: () => L('The voltage changes over this time: take the area of the trapezoid, the average voltage times the time.', 'Die Spannung ändert sich in dieser Zeit: Nimm die Fläche des Trapezes, die mittlere Spannung mal die Zeit.'),
    nostart: () => L('That is only the change of the flux; add it to the flux at the start.', 'Das ist nur die Änderung des Flusses; addiere sie zum Fluss zu Beginn.'),
    start: () => L('The flux changes: add the change (minus the area) to the value at the start.', 'Der Fluss ändert sich: Addiere die Änderung (minus die Fläche) zum Wert zu Beginn.'),
  };
  function areaTerms(g, a, b) {
    return g.pieces.filter((p) => p.t0 >= a - 1e-9 && p.t1 <= b + 1e-9).map((p) => (curved(p)
      ? `½ · (${par(neg(p.d0))} + ${par(neg(p.d1))}) mV · ${fmt(p.t1 - p.t0)} s` : `${par(neg(p.d0))} mV · ${fmt(p.t1 - p.t0)} s`));
  }
  function valueDphi(family, seed) {
    const r = rng(seed * 37 + 11), { g, ts, phi0 } = placed(r, family), F = (t) => Fat(g, t);
    let i, j;
    for (let k = 0; ; k++) { i = r.int(0, ts.length - 2); j = Math.min(ts.length - 1, i + r.int(1, 2)); if (Math.abs(F(ts[j]) - F(ts[i])) > 0.4 || k > 50) break; }
    const a = ts[i], b = ts[j], d = r2(F(b) - F(a)), end = r2(F(T)), total = r2(end - phi0);
    const inside = g.pieces.filter((p) => p.t0 >= a - 1e-9 && p.t1 <= b + 1e-9);
    const notime = -inside.reduce((s, p) => s + neg(p.d0), 0), height = -volt(g, a) * (b - a);
    const how1 = L(`${PHI} changes by minus the area under the voltage graph ${between(a, b)}: Δ${PHI} = −(${areaTerms(g, a, b).join(' + ')}) = ${sgn(d)} mWb.`,
      `${PHI} ändert sich um minus die Fläche unter dem Spannungsgraphen ${between(a, b)}: Δ${PHI} = −(${areaTerms(g, a, b).join(' + ')}) = ${sgn(d)} mWb.`);
    const how2 = L(`From 0 to 8 s, the flux changes by minus the whole area, ${sgn(total)} mWb: ${fmt(phi0)} mWb + (${sgn(total)} mWb) = ${fmt(end)} mWb.`,
      `Von 0 bis 8 s ändert sich der Fluss um minus die ganze Fläche, ${sgn(total)} mWb: ${fmt(phi0)} mWb + (${sgn(total)} mWb) = ${fmt(end)} mWb.`);
    const q1 = values(d, [{ value: -d, tag: 'sign' }, family === 'lin' ? { value: notime, tag: 'notime' } : { value: height, tag: 'height' }, { value: family === 'lin' ? height : notime, tag: family === 'lin' ? 'notime' : 'height' }], 'mWb', { signed: true, step: family === 'lin' ? 1 : 0.5 });
    const q2 = values(end, [{ value: phi0 - total, tag: 'sign' }, { value: total, tag: 'nostart' }, { value: phi0, tag: 'start' }], 'mWb', { step: family === 'lin' ? 1 : 0.5 });
    return {
      kind: 'value', dir: 'v2phi', family, title: L('The change of the flux', 'Die Änderung des Flusses'),
      text: prompt('v2phi', phi0) + L('<p>By how much does the flux change, and where does it end?</p>', '<p>Um wie viel ändert sich der Fluss, und wo endet er?</p>'),
      figs: one('volt', voltGraph(g)),
      questions: [
        choice('d', L(`(a) the change of the flux ${between(a, b)}`, `(a) die Änderung des Flusses ${between(a, b)}`), explained(q1, WHYD, how1).map((o) => nudged(o, o.tag === 'sign' && NUDGE.signD))),
        choice('e', L('(b) the flux at <i>t</i> = 8 s', '(b) der Fluss bei <i>t</i> = 8 s'), explained(q2, WHYD, how2).map((o) => nudged(o, o.tag === 'sign' && NUDGE.signD))),
      ],
      hints: [graphHints('v2phi', family, g, phi0)[0], graphHints('v2phi', family, g, phi0)[1],
        L(`(a) ${cap(between(a, b))} the area under the voltage graph is made of ${listOf(inside.map((p) => (curved(p) ? `a trapezoid from ${num(neg(p.d0))} to ${num(neg(p.d1))} mV, ${fmt(p.t1 - p.t0)} s wide` : `a rectangle ${num(neg(p.d0))} mV high, ${fmt(p.t1 - p.t0)} s wide`)))} (1 mV · 1 s = 1 mWb). (b) For the end value, take the whole area from 0 to 8 s and start from ${fmt(phi0)} mWb.`,
          `(a) ${cap(between(a, b))} besteht die Fläche unter dem Spannungsgraphen aus ${listOf(inside.map((p) => (curved(p) ? `einem Trapez von ${num(neg(p.d0))} bis ${num(neg(p.d1))} mV, ${fmt(p.t1 - p.t0)} s breit` : `einem Rechteck, ${num(neg(p.d0))} mV hoch, ${fmt(p.t1 - p.t0)} s breit`)))} (1 mV · 1 s = 1 mWb). (b) Für den Endwert nimm die ganze Fläche von 0 bis 8 s und geh von ${fmt(phi0)} mWb aus.`)],
      solution: [how1, how2].concat(graphSolution('v2phi', g, phi0)), solFig: solGraphs(g), g, phi0, p: { ...keyOf(g), a, b },
    };
  }

  // ---------------------------------------------------------------- statements
  const st = (html, ok, why) => ({ html, ok, why });
  function statementsPhi(family, r, g) {
    const ps = g.pieces, out = [], V = Vi(), F = (t) => Fat(g, t);
    const signOk = (p) => (family === 'lin' ? true : p.d0 * p.d1 >= 0 && (p.d0 !== 0 || p.d1 !== 0));
    const p1 = r.pick(ps.filter(signOk));
    if (p1) {
      const s = p1.d0 + p1.d1;
      out.push(st(L(`${cap(between(p1.t0, p1.t1))}, the induced voltage is positive.`, `${cap(between(p1.t0, p1.t1))} ist die induzierte Spannung positiv.`), s < 0,
        s < 0 ? L(`${PHI} decreases there, so ${V} = −${DPHI} &gt; 0.`, `${PHI} nimmt dort ab, also ${V} = −${DPHI} &gt; 0.`)
          : s > 0 ? L(`${PHI} increases there, so ${V} is negative.`, `${PHI} nimmt dort zu, also ist ${V} negativ.`) : L(`${PHI} is constant there, so ${V} = 0.`, `${PHI} ist dort konstant, also ${V} = 0.`)));
    }
    if (family === 'lin') {
      const p2 = r.pick(ps.filter((p) => p !== p1));
      out.push(st(L(`${cap(between(p2.t0, p2.t1))}, no voltage is induced.`, `${cap(between(p2.t0, p2.t1))} wird keine Spannung induziert.`), p2.d0 === 0,
        p2.d0 === 0 ? L(`${PHI} is constant there.`, `${PHI} ist dort konstant.`) : L(`${PHI} changes there at ${num(p2.d0)} mWb/s, so ${V} = ${num(neg(p2.d0))} mV.`, `${PHI} ändert sich dort mit ${num(p2.d0)} mWb/s, also ${V} = ${num(neg(p2.d0))} mV.`)));
      const m = Math.max(...ps.map((p) => Math.abs(p.d0))), top = ps.filter((p) => Math.abs(p.d0) === m);
      const p3 = top.length === 1 && r.next() < 0.5 ? top[0] : r.pick(ps.filter((p) => Math.abs(p.d0) < m));
      if (p3) {
        out.push(st(L(`The induced voltage is largest in size ${between(p3.t0, p3.t1)}.`, `Die induzierte Spannung ist ${between(p3.t0, p3.t1)} betragsmässig am grössten.`), top.length === 1 && p3 === top[0],
          L(`The flux graph is steepest where |${DPHI}| = ${m} mWb/s: ${top.map((p) => between(p.t0, p.t1)).join(L(' and ', ' und '))}.`, `Der Flussgraph ist am steilsten, wo |${DPHI}| = ${m} mWb/s: ${top.map((p) => between(p.t0, p.t1)).join(L(' and ', ' und '))}.`)));
      }
      const k = r.pick(ps.slice(1)).t0;
      out.push(st(L(`The induced voltage jumps at <i>t</i> = ${fmt(k)} s.`, `Die induzierte Spannung springt bei <i>t</i> = ${fmt(k)} s.`), true,
        L(`The flux graph has a kink there: its slope changes suddenly, so ${V} jumps.`, `Der Flussgraph hat dort einen Knick: Seine Steigung ändert sich plötzlich, also springt ${V}.`)));
      const flat = ps.find((p) => p.d0 === 0 && Math.abs(p.p0 - Math.max(...ps.map((q) => Math.max(q.p0, endOf(g, q))))) < 1e-9);
      if (flat) {
        out.push(st(L(`${cap(between(flat.t0, flat.t1))}, the flux is largest, so the induced voltage is largest there too.`, `${cap(between(flat.t0, flat.t1))} ist der Fluss am grössten, also ist dort auch die induzierte Spannung am grössten.`), false,
          L(`${V} depends on how fast ${PHI} changes, not on how large it is: there ${PHI} is constant, so ${V} = 0.`, `${V} hängt davon ab, wie schnell sich ${PHI} ändert, nicht wie gross er ist: Dort ist ${PHI} konstant, also ${V} = 0.`)));
      }
    } else {
      out.push(st(L(`Between 0 and 8 s, the induced voltage changes without jumps.`, `Zwischen 0 und 8 s ändert sich die induzierte Spannung ohne Sprünge.`), true,
        L(`The flux graph has no kinks: its slope changes steadily.`, `Der Flussgraph hat keine Knicke: Seine Steigung ändert sich gleichmässig.`)));
      const p2 = r.pick(ps);
      out.push(st(L(`${cap(between(p2.t0, p2.t1))}, the induced voltage is constant.`, `${cap(between(p2.t0, p2.t1))} ist die induzierte Spannung konstant.`), false,
        L(`The flux graph is curved there: its slope changes from ${num(p2.d0)} to ${num(p2.d1)} mWb/s, so ${V} changes steadily.`, `Der Flussgraph ist dort gekrümmt: Seine Steigung ändert sich von ${num(p2.d0)} auf ${num(p2.d1)} mWb/s, also ändert sich ${V} gleichmässig.`)));
      const zs = ps.map(zeroOf).filter((z) => z !== null);
      if (zs.length) {
        const z = r.pick(zs), peak = volt(g, z + 0.01) > 0;
        out.push(st(L(`At <i>t</i> = ${fmt(z)} s, where the flux has a ${peak ? 'peak' : 'valley'}, no voltage is induced.`, `Bei <i>t</i> = ${fmt(z)} s, wo der Fluss einen ${peak ? 'Hochpunkt' : 'Tiefpunkt'} hat, wird keine Spannung induziert.`), true,
          L(`The tangent is horizontal there: ${DPHI} = 0.`, `Die Tangente ist dort waagrecht: ${DPHI} = 0.`)));
        if (peak) {
          out.push(st(L(`The induced voltage is largest where the flux is largest.`, `Die induzierte Spannung ist dort am grössten, wo der Fluss am grössten ist.`), false,
            L(`At a peak of ${PHI}, the flux graph is horizontal, so ${V} = 0 there. ${V} depends on how fast ${PHI} changes.`, `Bei einem Hochpunkt von ${PHI} ist der Flussgraph waagrecht, also ist dort ${V} = 0. ${V} hängt davon ab, wie schnell sich ${PHI} ändert.`)));
        }
      }
      const kk = r.pick(g.pieces.map((p) => p.t0).filter((t) => volt(g, t) !== 0));
      if (kk != null) {
        out.push(st(L(`At <i>t</i> = ${fmt(kk)} s, no voltage is induced.`, `Bei <i>t</i> = ${fmt(kk)} s wird keine Spannung induziert.`), false,
          L(`The tangent at ${fmt(kk)} s has the slope ${num(-volt(g, kk))} mWb/s, so ${V} = ${num(volt(g, kk))} mV.`, `Die Tangente bei ${fmt(kk)} s hat die Steigung ${num(-volt(g, kk))} mWb/s, also ${V} = ${num(volt(g, kk))} mV.`)));
      }
    }
    const d = F(T) - F(0);
    if (Math.abs(d) > 0.4) {
      out.push(st(L('Averaged over the 8 seconds, the induced voltage is negative.', 'Über die 8 Sekunden gemittelt ist die induzierte Spannung negativ.'), d > 0,
        L(`The flux goes from ${fmt(F(0))} to ${fmt(F(T))} mWb: the average voltage is −Δ${PHI}/Δ<i>t</i> = ${sgn(-d / T)} mV.`, `Der Fluss geht von ${fmt(F(0))} auf ${fmt(F(T))} mWb: Die mittlere Spannung ist −Δ${PHI}/Δ<i>t</i> = ${sgn(-d / T)} mV.`)));
    }
    return out;
  }
  function statementsV(family, r, g) {
    const ps = g.pieces, out = [], V = Vi(), F = (t) => Fat(g, t);
    const signOk = (p) => p.d0 * p.d1 >= 0 && (p.d0 !== 0 || p.d1 !== 0);
    const p1 = r.pick(ps.filter(signOk));
    if (p1) {
      const s = p1.d0 + p1.d1;
      out.push(st(L(`${cap(between(p1.t0, p1.t1))}, the flux decreases.`, `${cap(between(p1.t0, p1.t1))} nimmt der Fluss ab.`), s < 0,
        s < 0 ? L(`${V} is positive there, so ${DPHI} = −${V} &lt; 0.`, `${V} ist dort positiv, also ${DPHI} = −${V} &lt; 0.`) : L(`${V} is negative there, so the flux increases.`, `${V} ist dort negativ, also nimmt der Fluss zu.`)));
    }
    if (family === 'lin') {
      const p2 = r.pick(ps.filter((p) => p !== p1));
      out.push(st(L(`${cap(between(p2.t0, p2.t1))}, the flux is constant.`, `${cap(between(p2.t0, p2.t1))} ist der Fluss konstant.`), p2.d0 === 0,
        p2.d0 === 0 ? L(`${V} = 0 there.`, `Dort ist ${V} = 0.`) : L(`${V} = ${num(neg(p2.d0))} mV there, so the flux changes at ${num(p2.d0)} mWb/s.`, `Dort ist ${V} = ${num(neg(p2.d0))} mV, also ändert sich der Fluss mit ${num(p2.d0)} mWb/s.`)));
      const k = r.pick(ps.slice(1)).t0;
      out.push(st(L(`At <i>t</i> = ${fmt(k)} s, the voltage jumps, so the flux jumps too.`, `Bei <i>t</i> = ${fmt(k)} s springt die Spannung, also springt auch der Fluss.`), false,
        L('Where the voltage jumps, only the slope of the flux changes suddenly: the flux graph has a kink, not a jump.', 'Wo die Spannung springt, ändert sich nur die Steigung des Flusses plötzlich: Der Flussgraph hat einen Knick, keinen Sprung.')));
      const p3 = r.pick(ps);
      out.push(st(L(`${cap(between(p3.t0, p3.t1))}, the flux graph is a straight line.`, `${cap(between(p3.t0, p3.t1))} ist der Flussgraph eine Gerade.`), true,
        L(`The voltage is constant there, so the flux changes at a constant rate.`, `Die Spannung ist dort konstant, also ändert sich der Fluss gleichmässig.`)));
    } else {
      const p3 = r.pick(ps);
      out.push(st(L(`${cap(between(p3.t0, p3.t1))}, the flux graph is a straight line.`, `${cap(between(p3.t0, p3.t1))} ist der Flussgraph eine Gerade.`), false,
        L(`The voltage changes there, so the slope of the flux changes: the flux graph is curved.`, `Die Spannung ändert sich dort, also ändert sich die Steigung des Flusses: Der Flussgraph ist gekrümmt.`)));
      const zs = ps.map(zeroOf).filter((z) => z !== null);
      if (zs.length) {
        const z = r.pick(zs), peak = volt(g, z + 0.01) > 0, say = r.next() < 0.5;
        out.push(st(L(`At <i>t</i> = ${fmt(z)} s, the flux has a ${say ? 'peak' : 'valley'}.`, `Bei <i>t</i> = ${fmt(z)} s hat der Fluss einen ${say ? 'Hochpunkt' : 'Tiefpunkt'}.`), say === peak,
          peak ? L(`The voltage changes from negative to positive there: the flux stops rising and starts to fall, a peak.`, `Die Spannung wechselt dort von negativ zu positiv: Der Fluss hört auf zu steigen und beginnt zu sinken, ein Hochpunkt.`)
            : L(`The voltage changes from positive to negative there: the flux stops falling and starts to rise, a valley.`, `Die Spannung wechselt dort von positiv zu negativ: Der Fluss hört auf zu sinken und beginnt zu steigen, ein Tiefpunkt.`)));
      }
    }
    // the largest flux: at a breakpoint or a zero of the voltage
    const cand = [...new Set([...g.pieces.map((p) => p.t0), T, ...ps.map(zeroOf).filter((z) => z !== null)])];
    const best = cand.reduce((a, b) => (F(b) > F(a) ? b : a)), unique = cand.every((t) => t === best || F(t) < F(best) - 0.3);
    const vmax = cand.reduce((a, b) => (volt(g, Math.min(b, T - 1e-9)) > volt(g, Math.min(a, T - 1e-9)) ? b : a));
    if (unique) {
      const claim = vmax !== best && r.next() < 0.6 ? vmax : best;
      out.push(st(L(`The flux is largest at <i>t</i> = ${fmt(claim)} s.`, `Der Fluss ist bei <i>t</i> = ${fmt(claim)} s am grössten.`), claim === best,
        L(`The flux is largest at ${fmt(best)} s (${fmt(F(best))} mWb): it rises (${V} &lt; 0) until then and falls afterwards (or the graph ends). Where the voltage is largest, the flux falls fastest.`,
          `Der Fluss ist bei ${fmt(best)} s am grössten (${fmt(F(best))} mWb): Er steigt bis dahin (${V} &lt; 0) und sinkt danach (oder der Graph endet). Wo die Spannung am grössten ist, sinkt der Fluss am schnellsten.`)));
    }
    const d = F(T) - F(0);
    if (Math.abs(d) > 0.4) {
      out.push(st(L('At 8 s, the flux is larger than at the start.', 'Bei 8 s ist der Fluss grösser als zu Beginn.'), d > 0,
        L(`The whole area under the voltage graph is ${sgn(-d)} mWb, so the flux changes by ${sgn(d)} mWb.`, `Die ganze Fläche unter dem Spannungsgraphen ist ${sgn(-d)} mWb, also ändert sich der Fluss um ${sgn(d)} mWb.`)));
    }
    return out;
  }
  function statements(dir, family, seed) {
    const r = rng(seed * 41 + 13);
    for (;;) {
      const { g, phi0 } = placed(r, family), pool = dir === 'phi2v' ? statementsPhi(family, r, g) : statementsV(family, r, g);
      const pick = r.shuffle(pool).slice(0, 5);
      if (pick.length < 4 || pick.every((s) => s.ok) || pick.every((s) => !s.ok)) continue;
      return {
        kind: 'stmts', dir, family, title: L('Which statements are correct?', 'Welche Aussagen sind richtig?'),
        text: prompt(dir, phi0) + L('<p>Tick all the statements that are correct.</p>', '<p>Kreuze alle richtigen Aussagen an.</p>'),
        figs: given(dir, g),
        questions: [{ type: 'multi', key: 's', label: L('Which statements are correct?', 'Welche Aussagen sind richtig?'), statements: pick }],
        hints: graphHints(dir, family, g, phi0).slice(0, 3), solution: graphSolution(dir, g, phi0), solFig: solGraphs(g), g, phi0, p: { ...keyOf(g), s: pick.map((s) => s.html) },
      };
    }
  }

  // ---------------------------------------------------------------- drawing
  function drawing(what, family, seed) {
    const r = rng(seed * 43 + 17), { g, ts, phi0 } = placed(r, family), ps = g.pieces;
    let draw;
    if (what === 'v' && family === 'lin') draw = { kind: 'volt', at: ps.map((p) => (p.t0 + p.t1) / 2), spans: ps.map((p) => [p.t0, p.t1]), target: ps.map((p) => neg(p.d0)) };
    else if (what === 'v') draw = { kind: 'volt', at: ts, target: ts.map((t) => r2(volt(g, Math.min(t, T - 1e-9)))) };
    else draw = { kind: 'flux', at: ts, target: ts.map((t) => r2(Fat(g, t))) };
    draw.init = draw.target.map(() => (draw.kind === 'flux' ? phi0 : 0));
    const dir = what === 'v' ? 'phi2v' : 'v2phi';
    const how = what === 'v'
      ? (family === 'lin' ? L('Click into the voltage graph to set the voltage in each part (the handles); the values snap to whole millivolts.', 'Klicke in den Spannungsgraphen, um die Spannung in jedem Teil festzulegen (die Griffe); die Werte rasten auf ganze Millivolt ein.')
        : L('Click into the voltage graph to set the voltage at each breakpoint (the handles); between them the graph is a straight line. The values snap to whole millivolts.', 'Klicke in den Spannungsgraphen, um die Spannung an jeder Knickstelle festzulegen (die Griffe); dazwischen ist der Graph eine Gerade. Die Werte rasten auf ganze Millivolt ein.'))
      : L('Click into the flux graph to set the flux at each breakpoint (the handles); between them the graph is a straight line. The values snap to whole milliwebers.', 'Klicke in den Flussgraphen, um den Fluss an jeder Knickstelle festzulegen (die Griffe); dazwischen ist der Graph eine Gerade. Die Werte rasten auf ganze Milliweber ein.');
    return {
      kind: 'draw', dir, family, title: what === 'v' ? L('Draw the voltage', 'Zeichne die Spannung') : L('Draw the flux', 'Zeichne den Fluss'),
      text: prompt(dir, phi0) + `<p>${what === 'v' ? L('Draw the graph of the induced voltage.', 'Zeichne den Graphen der induzierten Spannung.') : L('Draw the graph of the magnetic flux.', 'Zeichne den Graphen des magnetischen Flusses.')} ${how}</p>`,
      figs: given(dir, g), questions: [], draw,
      hints: graphHints(dir, family, g, phi0), solution: graphSolution(dir, g, phi0), solFig: solGraphs(g), g, phi0, p: keyOf(g),
    };
  }

  // ---------------------------------------------------------------- a loop through a field
  // A square loop (side s cm) moves at v cm/s through a field region w cm wide (B in T); its front
  // edge reaches the field at t0. The flux B·(area in the field) rises at B·s·v for m = min(s, w)/v
  // seconds, stays for |s − w|/v and falls back. B·s·v in mV: B · s · v · 0.1 (cm, cm/s).
  const NICE = [0.05, 0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1];
  function loopSetup(r, variant) {
    for (;;) {
      const s = r.pick([5, 10, 20]), te = r.pick([1, 2, 4]), V = r.pick([1, 2]), t0 = r.pick([1, 2]);
      if (variant === 'narrow' && te < 2) continue;
      const tw = variant === 'wide' ? te + r.int(1, 3) : variant === 'narrow' ? r.int(1, te - 1) : r.int(1, 4);
      if (tw === te) continue;
      const m = Math.min(te, tw), t3 = t0 + te + tw;
      if (t3 > T || V * m > 7) continue;
      const B = NICE.find((b) => Math.abs(b - (V * 1e-3 * te) / (s / 100) ** 2) < 1e-9);
      if (!B) continue;
      const v = s / te;
      return { s, te, tw, V, t0, B, v, w: v * tw, d: v * t0, m, t1: t0 + m, t2: t0 + m + Math.abs(te - tw), t3 };
    }
  }
  function loopGraph(L0) {
    const { t0, t1, t2, t3, V } = L0, list = [[0, t0, 0, 0], [t0, t1, V, V]];
    if (t2 > t1) list.push([t1, t2, 0, 0]);
    list.push([t2, t3, -V, -V]);
    if (t3 < T) list.push([t3, T, 0, 0]);
    return graphFrom(list, 0);
  }
  const loopText = (L0) => L(`<p>A square conducting loop with sides of ${fmt(L0.s)} cm is pulled at a constant ${fmt(L0.v)} cm/s through a region ${fmt(L0.w)} cm wide with a uniform magnetic field of ${fmt(L0.B)} T, perpendicular to the loop (see the figure). At the start, its front edge is ${fmt(L0.d)} cm from the field. The voltage counts as minus the rate of change of the flux.</p>`,
    `<p>Eine quadratische Leiterschleife mit ${fmt(L0.s)} cm Seitenlänge wird mit konstant ${fmt(L0.v)} cm/s durch ein ${fmt(L0.w)} cm breites Gebiet mit einem homogenen Magnetfeld von ${fmt(L0.B)} T gezogen, das senkrecht zur Schleife steht (siehe Abbildung). Zu Beginn ist ihre vordere Kante ${fmt(L0.d)} cm vom Feld entfernt. Die Spannung zählt als minus die Änderungsrate des Flusses.</p>`);
  function loopExplain(L0) {
    const wide = L0.tw > L0.te, Phi = r2(L0.V * L0.m);
    return [
      L(`The flux is ${PHI} = <i>B</i> · <i>A</i>, with <i>A</i> the part of the loop inside the field. The front edge reaches the field after ${fmt(L0.d)} cm / ${fmt(L0.v)} cm/s = ${fmt(L0.t0)} s.`,
        `Der Fluss ist ${PHI} = <i>B</i> · <i>A</i>, mit <i>A</i> dem Teil der Schleife im Feld. Die vordere Kante erreicht das Feld nach ${fmt(L0.d)} cm / ${fmt(L0.v)} cm/s = ${fmt(L0.t0)} s.`),
      L(`Then the area in the field grows by <i>s</i> · <i>v</i> each second, so the flux rises at <i>B</i> · <i>s</i> · <i>v</i> = ${fmt(L0.B)} T · ${dec(r4(L0.s / 100))} m · ${dec(r4(L0.v / 100))} m/s = ${fmt(L0.V)} mWb/s, and ${Vi()} = −${fmt(L0.V)} mV. This lasts ${fmt(L0.m)} s, until ${wide ? 'the whole loop is in the field' : 'the loop covers the whole field region'}: then ${PHI} = ${fmt(Phi)} mWb.`,
        `Dann wächst die Fläche im Feld jede Sekunde um <i>s</i> · <i>v</i>, also steigt der Fluss mit <i>B</i> · <i>s</i> · <i>v</i> = ${fmt(L0.B)} T · ${dec(r4(L0.s / 100))} m · ${dec(r4(L0.v / 100))} m/s = ${fmt(L0.V)} mWb/s, und ${Vi()} = −${fmt(L0.V)} mV. Das dauert ${fmt(L0.m)} s, bis ${wide ? 'die ganze Schleife im Feld ist' : 'die Schleife das ganze Feldgebiet überdeckt'}: dann ist ${PHI} = ${fmt(Phi)} mWb.`),
      L(`For the next ${fmt(L0.t2 - L0.t1)} s, the area in the field does not change: ${PHI} is constant and ${Vi()} = 0. Then the loop ${wide ? 'leaves the field' : 'moves on'}, and the flux falls back to 0 in ${fmt(L0.m)} s: ${Vi()} = +${fmt(L0.V)} mV.`,
        `Während der nächsten ${fmt(L0.t2 - L0.t1)} s ändert sich die Fläche im Feld nicht: ${PHI} ist konstant und ${Vi()} = 0. Dann ${wide ? 'verlässt die Schleife das Feld' : 'bewegt sich die Schleife weiter'}, und der Fluss sinkt in ${fmt(L0.m)} s auf 0: ${Vi()} = +${fmt(L0.V)} mV.`),
    ];
  }
  const loopHints = (L0) => [
    L(`The loop has sides of ${fmt(L0.s)} cm, the field region is ${fmt(L0.w)} cm wide, and the loop moves at ${fmt(L0.v)} cm/s, its front edge starting ${fmt(L0.d)} cm before the field. Which is wider, the loop or the field region?`,
      `Die Schleife hat ${fmt(L0.s)} cm Seitenlänge, das Feldgebiet ist ${fmt(L0.w)} cm breit, und die Schleife fährt mit ${fmt(L0.v)} cm/s, ihre vordere Kante ${fmt(L0.d)} cm vor dem Feld startend. Was ist breiter, die Schleife oder das Feldgebiet?`),
    L(`The flux is ${PHI} = <i>B</i> · <i>A</i>, with <i>A</i> the part of the loop inside the field, and ${Vi()} = −${DPHI}. While an edge crosses into or out of the field, <i>A</i> changes by <i>s</i> · <i>v</i> each second (in m² with <i>s</i> and <i>v</i> in m and m/s); while <i>A</i> stays the same, no voltage is induced.`,
      `Der Fluss ist ${PHI} = <i>B</i> · <i>A</i>, mit <i>A</i> dem Teil der Schleife im Feld, und ${Vi()} = −${DPHI}. Während eine Kante ins Feld hinein- oder aus ihm hinausfährt, ändert sich <i>A</i> jede Sekunde um <i>s</i> · <i>v</i> (in m² mit <i>s</i> und <i>v</i> in m und m/s); solange <i>A</i> gleich bleibt, wird keine Spannung induziert.`),
    L(`First the times: the front edge reaches the field after ${fmt(L0.t0)} s. From then on, when does the area in the field stop growing, and when does it start to shrink?`,
      `Zuerst die Zeiten: Die vordere Kante erreicht das Feld nach ${fmt(L0.t0)} s. Wann hört die Fläche im Feld danach auf zu wachsen, und wann beginnt sie zu schrumpfen?`),
  ];
  const WHYL = {
    width: () => L('The flux stays constant only while the whole loop is inside the field, and the loop needs time to get in and out.', 'Der Fluss bleibt nur konstant, solange die ganze Schleife im Feld ist, und die Schleife braucht Zeit, um hinein- und hinauszufahren.'),
    side: () => L('The field region is narrower than the loop: the flux stops growing as soon as the loop covers the whole field region.', 'Das Feldgebiet ist schmaler als die Schleife: Der Fluss wächst nicht mehr, sobald die Schleife das ganze Feldgebiet überdeckt.'),
    stay: () => L('Once the loop has left the field, no field passes through it: the flux is 0 again.', 'Wenn die Schleife das Feld verlassen hat, geht kein Feld mehr durch sie: Der Fluss ist wieder 0.'),
    triangle: () => L('While the area in the field does not change, the flux stays constant: the graph has a flat part.', 'Solange sich die Fläche im Feld nicht ändert, bleibt der Fluss konstant: Der Graph hat ein flaches Stück.'),
    copyF: () => L('This graph has the shape of a voltage graph. The flux is <i>B</i> times the area in the field: it grows steadily, without jumps.', 'Dieser Graph hat die Form eines Spannungsgraphen. Der Fluss ist <i>B</i> mal die Fläche im Feld: Er wächst gleichmässig, ohne Sprünge.'),
    sign: () => L('Mind the sign: while the flux increases (the loop moves in), the voltage is negative.', 'Achte auf das Vorzeichen: Während der Fluss zunimmt (die Schleife fährt hinein), ist die Spannung negativ.'),
    inside: () => L('While the area in the field does not change, the flux is constant, and no voltage is induced, although the loop moves.', 'Solange sich die Fläche im Feld nicht ändert, ist der Fluss konstant, und es wird keine Spannung induziert, obwohl sich die Schleife bewegt.'),
    once: () => L('When the loop leaves the field, the flux decreases again: a voltage of the opposite sign is induced.', 'Wenn die Schleife das Feld verlässt, nimmt der Fluss wieder ab: Es wird eine Spannung mit umgekehrtem Vorzeichen induziert.'),
    copyV: () => L('This graph has the shape of the flux graph. But the voltage depends on how fast the flux changes, not on how large it is.', 'Dieser Graph hat die Form des Flussgraphen. Aber die Spannung hängt davon ab, wie schnell sich der Fluss ändert, nicht wie gross er ist.'),
  };
  function loopOptions(r, L0, g) {
    const { t0, t1, t3, V, te, tw } = L0, wide = tw > te, F = (t) => flux(g, t), U = (t) => volt(g, t), mid = (t0 + t3) / 2;
    const br = [...new Set([0, t0, t1, L0.t2, t3, mid, t0 + te, t0 + te + tw, t0 + 2 * te + tw, T].filter((t) => t >= 0 && t <= T))].sort((a, b) => a - b);
    const ramp = (rise, plat, peak) => (t) => { const x = t - t0; return x <= 0 ? 0 : x < rise ? (peak * x) / rise : x < rise + plat ? peak : x < 2 * rise + plat ? peak * (1 - (x - rise - plat) / rise) : 0; };
    const fl = [
      wide ? opt('flux', ramp(te, tw, V * te), br, 'width') : opt('flux', ramp(te, 0, V * te), br, 'side'),
      opt('flux', (t) => (t <= t0 ? 0 : Math.min(V * (t - t0), V * L0.m)), br, 'stay'),
      opt('flux', ramp((te + tw) / 2, 0, V * (te + tw) / 2), br, 'triangle'),
      opt('flux', (t) => 3 + 1.2 * U(t), br, 'copyF'),
    ];
    const vo = [
      opt('volt', (t) => -U(t), br, 'sign'),
      opt('volt', (t) => (t < t0 || t >= t3 ? 0 : t < mid ? -V : V), br, 'inside'),
      opt('volt', (t) => (t < L0.t2 ? U(t) : 0), br, 'once'),
      opt('volt', (t) => (2.4 / Math.max(V * L0.m, 1e-9)) * F(t), br, 'copyV'),
    ];
    const four = (right, list) => {
      const out = [right];
      for (const c of r.shuffle(list)) if (out.length < 4 && fits(c) && out.every((o) => differ(o, c))) out.push(c);
      return out.length === 4 ? r.shuffle(out) : null;
    };
    return { flux: four(opt('flux', F, br, 'right'), fl), volt: four(opt('volt', U, br, 'right'), vo) };
  }
  function loopExercise(variant, seed) {
    const r = rng(seed * 47 + 19);
    for (;;) {
      const L0 = loopSetup(r, variant), g = loopGraph(L0), pic = ['loop', { s: L0.s, w: L0.w, d: L0.d, v: L0.v, B: L0.B }];
      const base = {
        kind: 'loop', title: L('A loop moves through a field', 'Eine Schleife fährt durch ein Feld'), text: loopText(L0), figs: '', pic,
        hints: loopHints(L0), solution: loopExplain(L0), solFig: solGraphs(g), g, loop: L0, p: { ...L0 },
      };
      if (variant !== 'num') {
        const o = loopOptions(r, L0, g);
        if (!o.flux || !o.volt) continue;
        const pick = (key, label, list) => ({ type: 'pick', key, label, options: list.map((x) => ({ html: optionGraph(x), ok: x.ok, tag: x.tag, why: x.ok ? '' : WHYL[x.tag]() })).map((o) => nudged(o, { sign: NUDGE.signL, side: NUDGE.side }[o.tag])) });
        return { ...base, questions: [pick('f', L('(a) Which graph shows the flux through the loop?', '(a) Welcher Graph zeigt den Fluss durch die Schleife?'), o.flux), pick('u', L('(b) Which graph shows the induced voltage?', '(b) Welcher Graph zeigt die induzierte Spannung?'), o.volt)] };
      }
      const { B, s, v, w, te, tw, V } = L0, k = 0.1;
      const how = loopExplain(L0);
      const qa = values(V, [{ value: B * s * s * k, tag: 'area' }, { value: B * w * v * k, tag: 'width' }, { value: 2 * V, tag: 'two' }], 'mV', { min: 0.1, step: 0.5 });
      const qb = values(V * L0.m, [{ value: B * s * s * k, tag: 'square' }, { value: B * s * w * k, tag: 'sw' }, { value: B * w * w * k, tag: 'ww' }], 'mWb', { min: 0.1 });
      const qc = values(Math.abs(te - tw), [{ value: tw, tag: 'tw' }, { value: te, tag: 'te' }, { value: te + tw, tag: 'total' }], 's', { min: 0 });
      const whyN = {
        area: () => L('That is <i>B</i> · <i>s</i>², a flux, not how fast it changes.', 'Das ist <i>B</i> · <i>s</i>², ein Fluss, nicht wie schnell er sich ändert.'),
        width: () => L('Only the edge of the loop that cuts across the field (length <i>s</i>) matters.', 'Es zählt nur die Kante der Schleife, die ins Feld fährt (Länge <i>s</i>).'),
        two: () => L('Only one edge of the loop is in the field while it enters.', 'Beim Hineinfahren ist nur eine Kante der Schleife im Feld.'),
        square: () => L('The field region is narrower than the loop: at most <i>s</i> · <i>w</i> of the loop is in the field.', 'Das Feldgebiet ist schmaler als die Schleife: Höchstens <i>s</i> · <i>w</i> der Schleife liegt im Feld.'),
        sw: () => L('The field is wider than the loop: at most the whole loop, <i>s</i>², is in the field.', 'Das Feld ist breiter als die Schleife: Höchstens die ganze Schleife, <i>s</i>², liegt im Feld.'),
        ww: () => L('The area in the field is a rectangle of height <i>s</i>.', 'Die Fläche im Feld ist ein Rechteck der Höhe <i>s</i>.'),
        tw: () => L('That is how long the front edge is in the field; the flux is constant only while neither edge crosses a border of the field.', 'So lange ist die vordere Kante im Feld; der Fluss ist nur konstant, solange keine Kante einen Rand des Feldes überquert.'),
        te: () => L('That is how long the loop takes to move its own length.', 'So lange braucht die Schleife, um sich um ihre eigene Länge zu bewegen.'),
        total: () => L('That is the whole time the loop overlaps the field.', 'Das ist die ganze Zeit, in der die Schleife das Feld überlappt.'),
      };
      return {
        ...base,
        questions: [
          choice('a', L('(a) the size of the induced voltage while the loop moves into the field', '(a) der Betrag der induzierten Spannung, während die Schleife ins Feld fährt'), explained(qa, whyN, how[1])),
          choice('b', L('(b) the largest flux through the loop', '(b) der grösste Fluss durch die Schleife'), explained(qb, whyN, how[1]).map((o) => nudged(o, (o.tag === 'square' || o.tag === 'sw') && NUDGE.overlap))),
          choice('c', L('(c) how long no voltage is induced while the loop overlaps the field', '(c) wie lange keine Spannung induziert wird, während die Schleife das Feld überlappt'), explained(qc, whyN, how[2])),
        ],
      };
    }
  }

  // ---------------------------------------------------------------- Lenz's rule
  const RIGHTHAND = () => L('A current that flows anticlockwise, seen from one side, makes that side a north pole: its field points towards you (right-hand rule).', 'Ein Strom, der von einer Seite gesehen im Gegenuhrzeigersinn fliesst, macht diese Seite zu einem Nordpol: Sein Feld zeigt auf dich zu (Rechte-Hand-Regel).');
  const LENZ = () => L("Lenz's rule: the induced current opposes the change that causes it.", 'Lenzsche Regel: Der induzierte Strom wirkt der Änderung entgegen, die ihn verursacht.');
  // who moves: the magnet or the ring (towards or away from each other); with no relative motion,
  // both at rest or both moved together
  function lenzMagnet(seed) {
    const r = rng(seed * 53 + 23), pole = r.pick(['N', 'S']), move = r.next() < 0.15 ? 'still' : r.pick(['toward', 'away']);
    const who = move === 'still' ? r.pick(['rest', 'together']) : r.pick(['magnet', 'ring']);
    const poleName = (p) => (p === 'N' ? L('north pole', 'Nordpol') : L('south pole', 'Südpol'));
    const face = move === 'still' ? null : move === 'toward' ? pole : pole === 'N' ? 'S' : 'N';
    const text = who === 'rest' ? L(`<p>A bar magnet is held still in front of a metal ring, its ${poleName(pole)} facing the ring.</p>`, `<p>Ein Stabmagnet wird ruhig vor einen Metallring gehalten, mit dem ${poleName(pole)} zum Ring.</p>`)
      : who === 'together' ? L(`<p>A bar magnet and a metal ring in front of it, the magnet's ${poleName(pole)} facing the ring, are carried along together at the same speed.</p>`, `<p>Ein Stabmagnet und ein Metallring davor, der ${poleName(pole)} des Magneten zum Ring, werden zusammen mit gleicher Geschwindigkeit weitergetragen.</p>`)
        : who === 'ring' ? (move === 'toward' ? L(`<p>A bar magnet is held still. A metal ring is moved towards its ${poleName(pole)}.</p>`, `<p>Ein Stabmagnet wird ruhig gehalten. Ein Metallring wird auf seinen ${poleName(pole)} zu bewegt.</p>`)
          : L(`<p>A bar magnet is held still, its ${poleName(pole)} facing a metal ring. The ring is pulled away from the magnet.</p>`, `<p>Ein Stabmagnet wird ruhig gehalten, mit dem ${poleName(pole)} zu einem Metallring. Der Ring wird vom Magneten weggezogen.</p>`))
          : move === 'toward' ? L(`<p>A bar magnet is moved towards a metal ring, its ${poleName(pole)} first.</p>`, `<p>Ein Stabmagnet wird mit dem ${poleName(pole)} voran auf einen Metallring zu bewegt.</p>`)
            : L(`<p>A bar magnet, its ${poleName(pole)} facing a metal ring, is pulled away from the ring.</p>`, `<p>Ein Stabmagnet, dessen ${poleName(pole)} zu einem Metallring zeigt, wird vom Ring weggezogen.</p>`);
    const byRing = who === 'ring';
    const why = who === 'rest' ? L('The magnet does not move: the flux through the ring does not change, so no current is induced, and there is no force.', 'Der Magnet bewegt sich nicht: Der Fluss durch den Ring ändert sich nicht, also wird kein Strom induziert, und es gibt keine Kraft.')
      : who === 'together' ? L('Magnet and ring move together, so the distance between them stays the same: the flux through the ring does not change, so no current is induced, and there is no force. Only motion of one relative to the other counts.', 'Magnet und Ring bewegen sich zusammen, der Abstand zwischen ihnen bleibt also gleich: Der Fluss durch den Ring ändert sich nicht, also wird kein Strom induziert, und es gibt keine Kraft. Es zählt nur die Bewegung des einen relativ zum anderen.')
        : move === 'toward' ? L(`The flux through the ring increases. ${LENZ()} ${byRing ? 'The magnet pushes the approaching ring back: the side of the ring' : 'The ring pushes the magnet back: its side'} facing the magnet becomes a ${poleName(face)}, like the magnet's pole. `, `Der Fluss durch den Ring nimmt zu. ${LENZ()} ${byRing ? 'Ring und Magnet stossen sich ab, der Ring wird beim Annähern gebremst' : 'Der Ring stösst den Magneten ab'}: Seine Seite zum Magneten wird ein ${poleName(face)}, wie der Pol des Magneten. `)
          : L(`The flux through the ring decreases. ${LENZ()} ${byRing ? 'The magnet holds the retreating ring back: the side of the ring' : 'The ring holds the magnet back: its side'} facing the magnet becomes a ${poleName(face)}, opposite to the magnet's pole. `, `Der Fluss durch den Ring nimmt ab. ${LENZ()} ${byRing ? 'Ring und Magnet ziehen sich an, der Ring wird beim Entfernen zurückgehalten' : 'Der Ring hält den Magneten zurück'}: Seine Seite zum Magneten wird ein ${poleName(face)}, entgegengesetzt zum Pol des Magneten. `);
    const dir = face === 'N' ? 'acw' : 'cw', full = move === 'still' ? why : why + RIGHTHAND();
    return {
      kind: 'lenz', title: L('A magnet and a ring', 'Ein Magnet und ein Ring'), text, figs: '', pic: ['magnet', { pole, move, who }],
      questions: [
        choice('face', L('(a) The side of the ring facing the magnet becomes', '(a) Die Seite des Rings zum Magneten wird'), words(r, [[L('a north pole', 'ein Nordpol'), face === 'N', why], [L('a south pole', 'ein Südpol'), face === 'S', why], [L('neither: no current flows', 'keines von beiden: Es fliesst kein Strom'), face === null, why]])),
        choice('force', L('(b) The ring is', '(b) Der Ring wird'), words(r, [[L('pushed away from the magnet', 'vom Magneten weggestossen'), move === 'toward', why], [L('pulled towards the magnet', 'zum Magneten hingezogen'), move === 'away', why], [L('neither pushed nor pulled', 'weder gestossen noch gezogen'), move === 'still', why]])),
        choice('dir', L('(c) Seen from the magnet, the current in the ring flows', '(c) Vom Magneten aus gesehen fliesst der Strom im Ring'), words(r, [[L('clockwise', 'im Uhrzeigersinn'), dir === 'cw' && face !== null, full], [L('anticlockwise', 'im Gegenuhrzeigersinn'), dir === 'acw' && face !== null, full], [L('not at all', 'gar nicht'), face === null, full]])),
      ],
      hints: [
        L(`The ${poleName(pole)} faces the ring, and ${{ rest: 'nothing moves', together: 'magnet and ring move together', magnet: `the magnet moves ${move === 'toward' ? 'towards' : 'away from'} the ring`, ring: `the ring moves ${move === 'toward' ? 'towards' : 'away from'} the magnet` }[who]}. Does the distance between them change, and so does the flux through the ring increase, decrease or stay the same?`,
          `Der ${poleName(pole)} zeigt zum Ring, und ${{ rest: 'nichts bewegt sich', together: 'Magnet und Ring bewegen sich zusammen', magnet: `der Magnet bewegt sich ${move === 'toward' ? 'auf den Ring zu' : 'vom Ring weg'}`, ring: `der Ring bewegt sich ${move === 'toward' ? 'auf den Magneten zu' : 'vom Magneten weg'}` }[who]}. Ändert sich der Abstand zwischen ihnen, und nimmt also der Fluss durch den Ring zu, ab, oder bleibt er gleich?`),
        LENZ() + ' ' + L(`If a current flows, the side of the ring facing the magnet acts as a pole: to oppose this change, must it push the magnet’s ${poleName(pole)} away or hold it back? Like poles repel, unlike poles attract.`, `Fliesst ein Strom, wirkt die Seite des Rings zum Magneten als Pol: Muss er, um dieser Änderung entgegenzuwirken, den ${poleName(pole)} des Magneten wegstossen oder zurückhalten? Gleichnamige Pole stossen sich ab, ungleichnamige ziehen sich an.`),
        L(`(c) ${RIGHTHAND()} Seen from the magnet, you look at the side of the ring facing it.`, `(c) ${RIGHTHAND()} Vom Magneten aus siehst du auf die Seite des Rings, die zu ihm zeigt.`),
      ],
      solution: [full], p: { pole, move, who },
    };
  }
  // does the flux through the loop grow (field stronger, loop pushed into the field)?
  const lenzGrows = (how) => how === 'up' || how === 'in';
  function lenzField(seed) {
    // how the flux changes: the field gets stronger (up) or weaker (down), or is switched off; the
    // loop is pulled out of the field or pushed into it, or squeezed so that its area shrinks
    const r = rng(seed * 59 + 29), into = r.next() < 0.5, how = r.pick(['up', 'down', 'out', 'in', 'shrink', 'off']);
    const grows = lenzGrows(how), indInto = grows ? !into : into, dir = indInto ? 'cw' : 'acw';
    const fieldName = (inn) => (inn ? L('into the page', 'in die Seite hinein') : L('out of the page', 'aus der Seite heraus'));
    const text = how === 'out' ? L(`<p>A conducting loop lies in a magnetic field that points ${fieldName(into)}. The loop is pulled sideways out of the field.</p>`, `<p>Eine Leiterschleife liegt in einem Magnetfeld, das ${fieldName(into)} zeigt. Die Schleife wird seitlich aus dem Feld gezogen.</p>`)
      : how === 'in' ? L(`<p>A conducting loop lies next to a region with a magnetic field that points ${fieldName(into)}. The loop is pushed sideways into the field.</p>`, `<p>Eine Leiterschleife liegt neben einem Gebiet mit einem Magnetfeld, das ${fieldName(into)} zeigt. Die Schleife wird seitlich ins Feld geschoben.</p>`)
      : how === 'shrink' ? L(`<p>A loop of flexible wire lies in a magnetic field that points ${fieldName(into)}. The loop is squeezed together, so that its area gets smaller.</p>`, `<p>Eine Schleife aus biegsamem Draht liegt in einem Magnetfeld, das ${fieldName(into)} zeigt. Die Schleife wird zusammengedrückt, sodass ihre Fläche kleiner wird.</p>`)
      : how === 'off' ? L(`<p>A conducting loop lies in a magnetic field that points ${fieldName(into)}. The field is switched off.</p>`, `<p>Eine Leiterschleife liegt in einem Magnetfeld, das ${fieldName(into)} zeigt. Das Feld wird ausgeschaltet.</p>`)
      : L(`<p>A conducting loop lies in a magnetic field that points ${fieldName(into)}. The field gets ${grows ? 'stronger' : 'weaker'}.</p>`, `<p>Eine Leiterschleife liegt in einem Magnetfeld, das ${fieldName(into)} zeigt. Das Feld wird ${grows ? 'stärker' : 'schwächer'}.</p>`);
    const cause = {
      up: () => L('The field gets stronger, so', 'Das Feld wird stärker, also'), down: () => L('The field gets weaker, so', 'Das Feld wird schwächer, also'),
      out: () => L('Less and less of the loop lies in the field, so', 'Immer weniger von der Schleife liegt im Feld, also'), in: () => L('More and more of the loop lies in the field, so', 'Immer mehr von der Schleife liegt im Feld, also'),
      shrink: () => L('The area of the loop gets smaller, so', 'Die Fläche der Schleife wird kleiner, also'), off: () => L('The field drops to zero, so', 'Das Feld sinkt auf null, also'),
    }[how]();
    const why = L(`${cause} the flux through the loop ${grows ? 'increases' : 'decreases'}. ${LENZ()} The induced current's own field inside the loop points ${grows ? 'against' : 'along'} the outer field: ${fieldName(indInto)}.`,
      `${cause} nimmt der Fluss durch die Schleife ${grows ? 'zu' : 'ab'}. ${LENZ()} Das eigene Feld des induzierten Stroms zeigt innerhalb der Schleife ${grows ? 'gegen das äussere Feld' : 'in Richtung des äusseren Feldes'}: ${fieldName(indInto)}.`);
    const turn = L(` A current flowing ${dir === 'acw' ? 'anticlockwise' : 'clockwise'} (as seen in the figure) makes a field ${fieldName(indInto)} inside the loop (right-hand rule).`, ` Ein Strom im ${dir === 'acw' ? 'Gegenuhrzeigersinn' : 'Uhrzeigersinn'} (wie in der Abbildung gesehen) erzeugt innerhalb der Schleife ein Feld ${fieldName(indInto)} (Rechte-Hand-Regel).`);
    return {
      kind: 'lenz', title: L('The direction of the current', 'Die Richtung des Stroms'), text, figs: '', pic: ['field', { into, how }],
      questions: [
        choice('ind', L("(a) Inside the loop, the field of the induced current points", '(a) Innerhalb der Schleife zeigt das Feld des induzierten Stroms'), words(r, [[cap(fieldName(true)), indInto, why], [cap(fieldName(false)), !indInto, why]])),
        choice('dir', L('(b) As seen in the figure, the induced current flows', '(b) Wie in der Abbildung gesehen fliesst der induzierte Strom'), words(r, [[L('clockwise', 'im Uhrzeigersinn'), dir === 'cw', why + turn], [L('anticlockwise', 'im Gegenuhrzeigersinn'), dir === 'acw', why + turn]])),
      ],
      hints: [
        L(`The field points ${fieldName(into)}, and ${{ up: 'it gets stronger', down: 'it gets weaker', out: 'the loop is pulled out of it', in: 'the loop is pushed into it', shrink: 'the area of the loop gets smaller', off: 'it is switched off' }[how]}: does the flux through the loop increase or decrease?`,
          `Das Feld zeigt ${fieldName(into)}, und ${{ up: 'es wird stärker', down: 'es wird schwächer', out: 'die Schleife wird aus ihm herausgezogen', in: 'die Schleife wird in es hineingeschoben', shrink: 'die Fläche der Schleife wird kleiner', off: 'es wird ausgeschaltet' }[how]}: Nimmt der Fluss durch die Schleife zu oder ab?`),
        LENZ() + ' ' + L(`(a) If the flux increases, the induced field inside the loop points against the outer field (${fieldName(into)}); if it decreases, along it.`, `(a) Nimmt der Fluss zu, zeigt das induzierte Feld innerhalb der Schleife gegen das äussere Feld (${fieldName(into)}); nimmt er ab, in seine Richtung.`),
        L('(b) Curl the fingers of your right hand in the direction of the current: your thumb shows the field inside the loop. Which way must the fingers turn, as seen in the figure, for the field from (a)?', '(b) Krümme die Finger der rechten Hand in Stromrichtung: Der Daumen zeigt das Feld innerhalb der Schleife. In welche Richtung müssen die Finger, wie in der Abbildung gesehen, drehen für das Feld aus (a)?'),
      ],
      solution: [why + turn], p: { into, how },
    };
  }

  // A loop moved sideways in a field that is stronger on one side (strong: left, right, top,
  // bottom): towards the stronger field the flux increases, towards the weaker one it decreases,
  // and along the side (the field strength the same along the path) it stays the same. The force on
  // the induced current opposes the motion: towards the weaker field when it moves to the stronger.
  const OPP = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
  const TOWARDS = { left: 'left', right: 'right', top: 'up', bottom: 'down' };
  function lenzGradient(seed) {
    const r = rng(seed * 61 + 31), into = r.next() < 0.5, strong = r.pick(['left', 'right', 'top', 'bottom']);
    const along = ['left', 'right'].includes(strong) ? ['up', 'down'] : ['left', 'right'];
    const way = r.next() < 0.2 ? 'side' : r.pick(['stronger', 'weaker']);
    const move = way === 'stronger' ? TOWARDS[strong] : way === 'weaker' ? TOWARDS[OPP[strong]] : r.pick(along);
    const grows = way === 'stronger', flows = way !== 'side', indInto = grows ? !into : into, dir = !flows ? null : indInto ? 'cw' : 'acw';
    const force = !flows ? null : grows ? 'weaker' : 'stronger';
    const fieldName = (inn) => (inn ? L('into the page', 'in die Seite hinein') : L('out of the page', 'aus der Seite heraus'));
    const where = { left: L('on the left', 'links'), right: L('on the right', 'rechts'), top: L('at the top', 'oben'), bottom: L('at the bottom', 'unten') }[strong];
    const moveName = { left: L('to the left', 'nach links'), right: L('to the right', 'nach rechts'), up: L('upwards', 'nach oben'), down: L('downwards', 'nach unten') }[move];
    const marks = into ? L('crosses', 'Kreuze') : L('dots', 'Punkte');
    const text = L(`<p>A conducting loop lies in a magnetic field that points ${fieldName(into)}. The field is not uniform: it is stronger ${where} (there the ${marks} are bigger and closer together). The loop is moved ${moveName}, without turning.</p>`,
      `<p>Eine Leiterschleife liegt in einem Magnetfeld, das ${fieldName(into)} zeigt. Das Feld ist nicht homogen: Es ist ${where} stärker (dort sind die ${marks} grösser und dichter). Die Schleife wird ${moveName} bewegt, ohne gedreht zu werden.</p>`);
    const cause = way === 'stronger' ? L('The loop moves to where the field is stronger, so', 'Die Schleife bewegt sich dorthin, wo das Feld stärker ist, also')
      : way === 'weaker' ? L('The loop moves to where the field is weaker, so', 'Die Schleife bewegt sich dorthin, wo das Feld schwächer ist, also')
        : L('The loop moves along the side, where the field is equally strong all the way, so', 'Die Schleife bewegt sich entlang der Seite, wo das Feld überall gleich stark ist, also');
    const why = flows
      ? L(`${cause} the flux through the loop ${grows ? 'increases' : 'decreases'}, although the field keeps its direction. ${LENZ()} The induced current's own field inside the loop points ${grows ? 'against' : 'along'} the outer field: ${fieldName(indInto)}.`,
        `${cause} nimmt der Fluss durch die Schleife ${grows ? 'zu' : 'ab'}, obwohl das Feld seine Richtung behält. ${LENZ()} Das eigene Feld des induzierten Stroms zeigt innerhalb der Schleife ${grows ? 'gegen das äussere Feld' : 'in Richtung des äusseren Feldes'}: ${fieldName(indInto)}.`)
      : L(`${cause} the flux through the loop does not change. No current is induced, although the loop moves, and so there is no force.`,
        `${cause} ändert sich der Fluss durch die Schleife nicht. Es wird kein Strom induziert, obwohl sich die Schleife bewegt, und so wirkt auch keine Kraft.`);
    const turn = flows ? L(` A current flowing ${dir === 'acw' ? 'anticlockwise' : 'clockwise'} (as seen in the figure) makes a field ${fieldName(indInto)} inside the loop (right-hand rule).`, ` Ein Strom im ${dir === 'acw' ? 'Gegenuhrzeigersinn' : 'Uhrzeigersinn'} (wie in der Abbildung gesehen) erzeugt innerhalb der Schleife ein Feld ${fieldName(indInto)} (Rechte-Hand-Regel).`) : '';
    const brake = flows ? L(` The force of the field on the induced current opposes the motion (Lenz's rule): it points towards the ${force} field, back to where the loop came from.`, ` Die Kraft des Feldes auf den induzierten Strom wirkt der Bewegung entgegen (Lenzsche Regel): Sie zeigt zum ${force === 'weaker' ? 'schwächeren' : 'stärkeren'} Feld hin, dorthin zurück, woher die Schleife kam.`) : '';
    // the wrong options, by the wrong idea behind them
    const whyNone = L('The field keeps its direction, but its strength inside the loop changes: so the flux changes, and a current is induced.', 'Das Feld behält seine Richtung, aber seine Stärke in der Schleife ändert sich: Also ändert sich der Fluss, und es wird ein Strom induziert.');
    const whyMotion = L('Motion alone induces nothing: along this path the field is equally strong, so the flux through the loop does not change.', 'Bewegung allein induziert nichts: Entlang dieses Weges ist das Feld gleich stark, also ändert sich der Fluss durch die Schleife nicht.');
    const whySense = L(`The induced current opposes the change of the flux: its field inside the loop points ${grows ? 'against' : 'along'} the outer field.`, `Der induzierte Strom wirkt der Änderung des Flusses entgegen: Sein Feld zeigt innerhalb der Schleife ${grows ? 'gegen das äussere Feld' : 'in Richtung des äusseren Feldes'}.`);
    const whyForce = L("By Lenz's rule, the force opposes the motion that causes the current: it does not pull the loop on in the direction it moves.", 'Nach der Lenzschen Regel wirkt die Kraft der Bewegung entgegen, die den Strom verursacht: Sie zieht die Schleife nicht weiter in ihre Bewegungsrichtung.');
    const wrongDir = (d) => (!flows ? whyMotion : d === null ? whyNone : whySense);
    const wrongForce = (f) => (!flows ? whyMotion : f === null ? whyNone : whyForce);
    const nudgeDir = (d) => (!flows ? NUDGE.motion : d === null ? null : NUDGE.sense), nudgeForce = (f) => (!flows ? NUDGE.motion : f === null ? null : NUDGE.force);
    const o3 = (label, ok, w, n) => nudged({ label, ok, why: ok ? '' : w }, n);
    return {
      kind: 'lenz', title: L('A field stronger on one side', 'Ein Feld, auf einer Seite stärker'), text, figs: '', pic: ['gradient', { into, strong, move }],
      questions: [
        choice('dir', L('(a) As seen in the figure, the induced current flows', '(a) Wie in der Abbildung gesehen fliesst der induzierte Strom'), r.shuffle([
          o3(L('clockwise', 'im Uhrzeigersinn'), dir === 'cw', wrongDir('cw'), nudgeDir('cw')), o3(L('anticlockwise', 'im Gegenuhrzeigersinn'), dir === 'acw', wrongDir('acw'), nudgeDir('acw')),
          o3(L('not at all', 'gar nicht'), dir === null, wrongDir(null), nudgeDir(null))])),
        choice('force', L('(b) The magnetic force on the loop points', '(b) Die magnetische Kraft auf die Schleife zeigt'), r.shuffle([
          o3(L('towards the stronger field', 'zum stärkeren Feld hin'), force === 'stronger', wrongForce('stronger'), nudgeForce('stronger')), o3(L('towards the weaker field', 'zum schwächeren Feld hin'), force === 'weaker', wrongForce('weaker'), nudgeForce('weaker')),
          o3(L('nowhere: there is no force', 'nirgends hin: Es wirkt keine Kraft'), force === null, wrongForce(null), nudgeForce(null))])),
      ],
      hints: [
        L(`The field (${fieldName(into)}) is stronger ${where}, and the loop moves ${moveName}: towards the stronger field, towards the weaker one, or along a line where the field is equally strong? So does the flux through the loop increase, decrease or stay the same?`,
          `Das Feld (${fieldName(into)}) ist ${where} stärker, und die Schleife bewegt sich ${moveName}: zum stärkeren Feld hin, zum schwächeren, oder entlang einer Linie, wo das Feld gleich stark ist? Nimmt also der Fluss durch die Schleife zu, ab, oder bleibt er gleich?`),
        LENZ() + ' ' + L(`If the flux increases, the induced field inside the loop points against the outer field (${fieldName(into)}); if it decreases, along it.`, `Nimmt der Fluss zu, zeigt das induzierte Feld innerhalb der Schleife gegen das äussere Feld (${fieldName(into)}); nimmt er ab, in seine Richtung.`),
        L(`(a) Curl the fingers of your right hand in the direction of the current: your thumb shows the field inside the loop. (b) If a current flows, the force on it opposes the motion ${moveName}: which side of the field is that, the stronger or the weaker?`, `(a) Krümme die Finger der rechten Hand in Stromrichtung: Der Daumen zeigt das Feld innerhalb der Schleife. (b) Fliesst ein Strom, wirkt die Kraft auf ihn der Bewegung ${moveName} entgegen: Welche Seite des Feldes ist das, die stärkere oder die schwächere?`),
      ],
      solution: [why + turn + brake], p: { into, strong, move },
    };
  }

  // ---------------------------------------------------------------- all types
  const TYPES = {
    'phi2v-lin': [1, (s) => pickExercise('phi2v-lin', s)], 'v2phi-lin': [2, (s) => pickExercise('v2phi-lin', s)],
    'phi2v-smooth': [3, (s) => pickExercise('phi2v-smooth', s)], 'v2phi-smooth': [4, (s) => pickExercise('v2phi-smooth', s)],
    'value-v-lin': [1, (s) => valueV('lin', s)], 'value-v-smooth': [3, (s) => valueV('smooth', s)],
    'value-dphi-lin': [2, (s) => valueDphi('lin', s)], 'value-dphi-smooth': [4, (s) => valueDphi('smooth', s)],
    'stmts-phi-lin': [2, (s) => statements('phi2v', 'lin', s)], 'stmts-phi-smooth': [3, (s) => statements('phi2v', 'smooth', s)],
    'stmts-v-lin': [3, (s) => statements('v2phi', 'lin', s)], 'stmts-v-smooth': [4, (s) => statements('v2phi', 'smooth', s)],
    'draw-v-lin': [2, (s) => drawing('v', 'lin', s)], 'draw-v-smooth': [3, (s) => drawing('v', 'smooth', s)], 'draw-phi-lin': [3, (s) => drawing('phi', 'lin', s)],
    'loop-wide': [2, (s) => loopExercise('wide', s)], 'loop-narrow': [3, (s) => loopExercise('narrow', s)], 'loop-num': [3, (s) => loopExercise('num', s)],
    'lenz-magnet': [2, lenzMagnet], 'lenz-field': [2, lenzField], 'lenz-gradient': [3, lenzGradient],
  };
  function make(type, seed) {
    const [difficulty, f] = TYPES[type];
    return { ...f(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }

  const api = { TYPES: Object.keys(TYPES), make, describe, describeBack, lines, RULE, LAW, WHY, prompt, askGraph, given, pairFigure, one, placed, loopSetup, loopGraph, loopExplain, fmt, sgn, neg, Vi, PHI, DPHI, zeroOf, cap, when, endOf, LENZ, RIGHTHAND, lenzGrows, OPP, TOWARDS };
  root.IndEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
