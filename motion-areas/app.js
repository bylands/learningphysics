(function () {
  'use strict';

  const { generate, KINDS, TASKS, register, rng, quiz, flaw, evaluate, copied, sloped, len, rate, area } = window.Motion;
  const Concepts = window.Concepts, Quiz = window.Quiz;
  const Plot = window.Plot, { sourceGraph, UNIT, dec } = Plot;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const NARROW = 560;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;
  const LABEL = { vs: 'v → s', av: 'a → v' };

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Areas under Motion Graphs', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. The piece a step is about is <span class="k-band">highlighted</span> in both graphs; short lines are tangents, and shaded areas count <span class="k-pos">positive</span> above and <span class="k-neg">negative</span> below the time axis.',
      given: 'Given', yours: 'Your graph', answer: 'Answer', sketch: 'Sketch',
      check: 'Check', reset: 'Reset drawing', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: 'The solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      stars: (d) => `Difficulty: ${d} of 5`,
      score: (s, c) => `Solved: ${s} · first try without hints: ${c}`,
      hint: (n) => `Hint (${n} left)`, noHints: 'No more hints', unlocks: (n) => `Unlocks after all hints or ${n} attempts`,
      ok: 'All five pieces are correct, well done!',
      some: (r, n, k) => `${r} of ${n} pieces are correct (attempt ${k}).`,
      canReveal: ' You can take a hint or look at the solution.', tryAgain: ' Correct the pieces marked ✗ and check again, or take a hint.',
      shown: 'The correct graph is now shown as a dashed black line.',
      choose: 'Answer every question, then check again.',
      qOk: 'All answers are correct, well done!',
      qSome: (r, n, k) => `${r} of ${n} answers are correct (attempt ${k}).`,
      qTry: ' Correct the answers marked ✗ and check again, or take a hint.',
      qShown: 'The worked solution is shown below.',
      answers: 'Answers', wrongs: 'Typical wrong answers',
    },
    de: {
      title: 'Flächen unter Bewegungsdiagrammen', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Das Stück, um das es in einem Schritt geht, ist in beiden Graphen <span class="k-band">hervorgehoben</span>; kurze Linien sind Tangenten, und schattierte Flächen zählen über der Zeitachse <span class="k-pos">positiv</span> und darunter <span class="k-neg">negativ</span>.',
      given: 'Gegeben', yours: 'Dein Graph', answer: 'Lösung', sketch: 'Skizze',
      check: 'Prüfen', reset: 'Zeichnung zurücksetzen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: 'Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      stars: (d) => `Schwierigkeit: ${d} von 5`,
      score: (s, c) => `Gelöst: ${s} · beim ersten Versuch ohne Tipps: ${c}`,
      hint: (n) => `Tipp (${n} übrig)`, noHints: 'Keine Tipps mehr', unlocks: (n) => `Wird nach allen Tipps oder ${n} Versuchen freigeschaltet`,
      ok: 'Alle fünf Stücke sind richtig, gut gemacht!',
      some: (r, n, k) => `${r} von ${n} Stücken sind richtig (Versuch ${k}).`,
      canReveal: ' Du kannst einen Tipp nehmen oder die Lösung anschauen.', tryAgain: ' Korrigiere die mit ✗ markierten Stücke und prüfe nochmals, oder nimm einen Tipp.',
      shown: 'Der richtige Graph ist jetzt schwarz gestrichelt eingezeichnet.',
      choose: 'Beantworte jede Frage und prüfe dann nochmals.',
      qOk: 'Alle Antworten sind richtig, gut gemacht!',
      qSome: (r, n, k) => `${r} von ${n} Antworten sind richtig (Versuch ${k}).`,
      qTry: ' Korrigiere die mit ✗ markierten Antworten und prüfe nochmals, oder nimm einen Tipp.',
      qShown: 'Die ausführliche Lösung steht unten.',
      answers: 'Antworten', wrongs: 'Typische falsche Antworten',
    },
  };
  const ui = () => UI[Lang.get()];

  let ex = null, editor = null, tutor = null, checker = null, topics = null;
  // tries, hints used, solved, revealed, res: the result of the last check (null after an edit)
  let st = null;

  // ---------------------------------------------------------------- persistence
  function stored(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function showScore() {
    const s = stored('ma-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  // ---------------------------------------------------------------- names and formatting
  const NAME = () => L({ s: 'position', v: 'velocity', a: 'acceleration' }, { s: 'Ort', v: 'Geschwindigkeit', a: 'Beschleunigung' });
  // “its position”, in German in the accusative
  const its = (q) => L(`its ${NAME()[q]}`, { s: 'seinen Ort', v: 'seine Geschwindigkeit', a: 'seine Beschleunigung' }[q]);
  // “the velocity–time graph”, German “den Graphen der Geschwindigkeit” (accusative)
  const graphOf = (q) => L(`the matching ${NAME()[q]}–time graph`, `den passenden Graphen ${{ s: 'des Orts', v: 'der Geschwindigkeit', a: 'der Beschleunigung' }[q]}`);
  const Q = (q) => `<i>${q}</i>`;
  const r2 = (x) => Math.round(x * 100) / 100 + 0;
  const fmt = (x) => (r2(x) < 0 ? '−' + dec(-r2(x)) : dec(r2(x)));
  const sgn = (x) => (r2(x) > 0 ? '+' + dec(r2(x)) : fmt(x));
  const val = (x, q) => `${fmt(x)} ${UNIT[q]}`;
  const sval = (x, q) => `${sgn(x)} ${UNIT[q]}`;
  const plus = (a, b) => `${fmt(a)} ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}`;
  const at = (q, t) => `${Q(q)}(${t ? fmt(t) + ' s' : 0})`;
  const when = (p) => `${p.t0}–${p.t1} s`;
  const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L('and', 'und')} ${xs[xs.length - 1]}`);
  // “Pieces 1 and 3”; c: 'nom' (start of a sentence) or 'in' (after “in”)
  const pieceList = (is, c = 'nom') => {
    const many = is.length > 1, ns = and(is.map((i) => i + 1));
    if (c === 'in') return L(`${many ? 'pieces' : 'piece'} ${ns}`, `${many ? 'den Stücken' : 'Stück'} ${ns}`);
    return L(`${many ? 'Pieces' : 'Piece'} ${ns}`, `${many ? 'Die Stücke' : 'Stück'} ${ns}`);
  };
  const piece = (i) => L(`Piece ${i}`, `Stück ${i}`);
  const times = (ts) => and(ts.map((t) => `${fmt(t)} s`));
  const indices = (test) => ex.pieces.map((p, i) => i).filter((i) => test(ex.pieces[i], i));
  // Where g is zero inside a sloped piece or at one of its ends (G has a horizontal tangent).
  function zeros() {
    const out = [];
    for (const p of ex.pieces) {
      if (!sloped(p)) continue;
      const x = -p.g0 / rate(p);
      if (x >= 0 && x <= len(p) && !out.includes(p.t0 + x)) out.push(p.t0 + x);
    }
    return out.sort((a, b) => a - b);
  }

  // The text helpers read the exercise from ex; withEx(e, f) runs f for another exercise.
  function withEx(e, f) {
    const saved = ex;
    ex = e;
    try { return f(); } finally { ex = saved; }
  }

  // ---------------------------------------------------------------- the area: v → s, a → v
  // g is the given graph, G the one to draw.
  function hintsInt() {
    const g = Q(ex.from), G = Q(ex.to), ps = ex.pieces;
    const constant = indices((p) => !sloped(p)), changing = indices(sloped);
    const zs = zeros(), rest = indices((p) => !sloped(p) && p.g0 === 0);
    const h1 = L(`${g}(<i>t</i>) has five straight pieces. In ${pieceList(constant, 'in')}, ${g} is constant, so ${G} is a straight line there. ` +
      `In ${pieceList(changing, 'in')}, ${g} changes steadily, so ${G} is a parabola there. ${g} does not jump, so ${G} joins smoothly (without a kink) at every breakpoint.` +
      (zs.length ? ` ${g} = 0 at ${times(zs)}: ${G} has a horizontal tangent there.` : '') +
      (rest.length ? ` In ${pieceList(rest, 'in')}, ${g} = 0, so ${G} stays constant.` : ''),
    `${g}(<i>t</i>) hat fünf gerade Stücke. In ${pieceList(constant, 'in')} ist ${g} konstant, also ist ${G} dort eine Gerade. ` +
      `In ${pieceList(changing, 'in')} ändert sich ${g} gleichmässig, also ist ${G} dort eine Parabel. ${g} springt nicht, also geht ${G} an jeder Übergangsstelle glatt (ohne Knick) weiter.` +
      (zs.length ? ` Bei ${times(zs)} ist ${g} = 0: Dort hat ${G} eine waagrechte Tangente.` : '') +
      (rest.length ? ` In ${pieceList(rest, 'in')} ist ${g} = 0, also bleibt ${G} konstant.` : ''));
    const h2 = L(`Start at ${at(ex.to, 0)} = ${val(ex.pieces[0].G0, ex.to)}. In every piece, the change Δ${G} is the area between the ${g} graph and the <i>t</i> axis (area below the axis counts negative). ` +
      `Mark ${G} at the breakpoints piece by piece, then draw the shape: straight where ${g} is constant; where ${g} increases, ${G} curves upward, and where ${g} decreases, ${G} curves downward. ` +
      `At every instant, the slope of ${G} is ${g}. For a curved piece, put the diamond in the middle at ${G} at its start plus the area under ${g} over its first half.`,
    `Beginne bei ${at(ex.to, 0)} = ${val(ex.pieces[0].G0, ex.to)}. In jedem Stück ist die Änderung Δ${G} die Fläche zwischen dem ${g}-Graphen und der <i>t</i>-Achse (Fläche unter der Achse zählt negativ). ` +
      `Markiere ${G} an den Übergangsstellen Stück für Stück und zeichne dann die Form: gerade, wo ${g} konstant ist; wo ${g} zunimmt, krümmt sich ${G} nach oben, und wo ${g} abnimmt, nach unten. ` +
      `In jedem Moment ist die Steigung von ${G} gleich ${g}. Bei einem gekrümmten Stück setzt du die Raute in der Mitte auf ${G} an seinem Anfang plus die Fläche unter ${g} über seine erste Hälfte.`);
    const formulas = ps.map((p, i) => {
      if (!sloped(p)) return `<li>${piece(i + 1)} (${L('rectangle', 'Rechteck')}): Δ${G} = ${g} · Δ<i>t</i> = ${at(ex.from, p.t0)} · ${len(p)} s</li>`;
      const cross = p.g0 * p.g1 < 0 ? L('; the triangles above and below the axis partly cancel', '; die Dreiecke über und unter der Achse heben sich teilweise auf') : '';
      return `<li>${piece(i + 1)} (${L('trapezoid', 'Trapez')}): Δ${G} = (${at(ex.from, p.t0)} + ${at(ex.from, p.t1)})/2 · ${len(p)} s${cross}</li>`;
    });
    const h3 = `${L('Formulas, piece by piece:', 'Formeln, Stück für Stück:')}<ul>${formulas.join('')}</ul>`;
    const h4 = `Δ${G} ${L('per piece', 'pro Stück')}: ${and(ps.map((p, i) => `${L('piece', 'Stück')} ${i + 1}: ${sval(area(p), ex.to)}`))}.`;
    return [h1, h2, h3, h4];
  }

  // The middle of a curved piece of the integral, where the editor's diamond sits: its value is
  // the start value plus the area under the given graph over the first half of the piece (a
  // trapezoid of half the width); dev is how far it lies above (+) or below (−) the straight line
  // between the ends, (g0 − g1)·Δt/8.
  function midOf(p) {
    const T = len(p), tm = (p.t0 + p.t1) / 2, gm = (p.g0 + p.g1) / 2, Gm = p.G0 + ((p.g0 + gm) / 2) * (T / 2);
    return { T, tm, gm, Gm, dev: Gm - (p.G0 + p.G1) / 2 };
  }

  function describeInt(p, i) {
    const g = Q(ex.from), G = Q(ex.to), T = len(p), dG = area(p);
    const head = `<b>${piece(i + 1)} (${when(p)})</b>: `;
    const span = L(`from ${val(p.G0, ex.to)} to ${val(p.G1, ex.to)}`, `von ${val(p.G0, ex.to)} auf ${val(p.G1, ex.to)}`);
    if (!sloped(p)) {
      if (p.g0 === 0) return head + L(`${g} = 0, so ${G} stays at ${val(p.G0, ex.to)}.`, `${g} = 0, also bleibt ${G} bei ${val(p.G0, ex.to)}.`);
      return head + L(`${g} = ${sval(p.g0, ex.from)} is constant, so ${G} is a straight line: Δ${G} = ${sval(p.g0, ex.from)} · ${T} s = ${sval(dG, ex.to)}, ${span}.`,
        `${g} = ${sval(p.g0, ex.from)} ist konstant, also ist ${G} eine Gerade: Δ${G} = ${sval(p.g0, ex.from)} · ${T} s = ${sval(dG, ex.to)}, ${span}.`);
    }
    const x = -p.g0 / rate(p), up = p.g1 > p.g0;
    const turn = x > 0 && x < T ? L(` ${g} = 0 at ${fmt(p.t0 + x)} s, where ${G} has a horizontal tangent.`, ` Bei ${fmt(p.t0 + x)} s ist ${g} = 0; dort hat ${G} eine waagrechte Tangente.`) : '';
    // how strongly it curves: set by the diamond in the middle of the piece, at the start value
    // plus the area under g over the first half
    const mid = midOf(p), half = fmt(mid.T / 2), side = mid.dev < 0 ? L('below', 'unter') : L('above', 'über');
    const bend = L(`How strongly it curves is set by the diamond in the middle of the piece, at ${fmt(mid.tm)} s. The middle point follows from the area under ${g} over the first half of the piece, a trapezoid of width ${half} s: ` +
      `${at(ex.to, mid.tm)} = ${val(p.G0, ex.to)} + (${plus(p.g0, mid.gm)})/2 ${UNIT[ex.from]} · ${half} s = ${val(mid.Gm, ex.to)}. That is ${val(Math.abs(mid.dev), ex.to)} ${side} the straight line between the ends of the piece. ` +
      `(The slope of ${G} is ${g}: the tangents at the ends have the slopes ${sval(p.g0, ex.from)} and ${sval(p.g1, ex.from)}, the short lines.) `,
    `Wie stark sie sich krümmt, stellst du mit der Raute in der Mitte des Stücks ein, bei ${fmt(mid.tm)} s. Der Mittelpunkt folgt aus der Fläche unter ${g} über die erste Hälfte des Stücks, einem Trapez der Breite ${half} s: ` +
      `${at(ex.to, mid.tm)} = ${val(p.G0, ex.to)} + (${plus(p.g0, mid.gm)})/2 ${UNIT[ex.from]} · ${half} s = ${val(mid.Gm, ex.to)}. Das ist ${val(Math.abs(mid.dev), ex.to)} ${side} der Geraden zwischen den Enden des Stücks. ` +
      `(Die Steigung von ${G} ist ${g}: Die Tangenten an den Enden haben die Steigungen ${sval(p.g0, ex.from)} und ${sval(p.g1, ex.from)}, die kurzen Linien.) `);
    return head + L(`${g} changes from ${sval(p.g0, ex.from)} to ${sval(p.g1, ex.from)}, so ${G} is a parabola that curves ${up ? 'upward' : 'downward'}. `,
      `${g} ändert sich von ${sval(p.g0, ex.from)} auf ${sval(p.g1, ex.from)}, also ist ${G} eine Parabel, die sich nach ${up ? 'oben' : 'unten'} krümmt. `) + bend +
      `Δ${G} = (${plus(p.g0, p.g1)})/2 ${UNIT[ex.from]} · ${T} s = ${sval(dG, ex.to)}, ${span}.${turn}`;
  }

  function whyInt(code, p) {
    const g = Q(ex.from), G = Q(ex.to), dG = area(p), pos = dG > 0;
    switch (code) {
      case 'sign': return p.g0 * p.g1 < 0
        ? L(`${G} changes the wrong way. The area ${pos ? 'above' : 'below'} the <i>t</i> axis is larger than the one ${pos ? 'below' : 'above'}, so ${G} ${pos ? 'increases' : 'decreases'} overall.`,
          `${G} ändert sich in die falsche Richtung. Die Fläche ${pos ? 'über' : 'unter'} der <i>t</i>-Achse ist grösser als jene ${pos ? 'darunter' : 'darüber'}, also nimmt ${G} insgesamt ${pos ? 'zu' : 'ab'}.`)
        : L(`${G} changes the wrong way: ${g} is ${pos ? 'positive' : 'negative'} here, so ${G} ${pos ? 'increases' : 'decreases'}.`,
          `${G} ändert sich in die falsche Richtung: ${g} ist hier ${pos ? 'positiv' : 'negativ'}, also nimmt ${G} ${pos ? 'zu' : 'ab'}.`);
      case 'rectStart': case 'rectEnd': {
        const t = code === 'rectStart' ? p.t0 : p.t1;
        return L(`Your change of ${G} is ${at(ex.from, t)} · Δ<i>t</i>. But ${g} changes in this piece: Δ${G} is the area of the trapezoid under the ${g} graph, (${at(ex.from, p.t0)} + ${at(ex.from, p.t1)})/2 · Δ<i>t</i>.`,
          `Deine Änderung von ${G} ist ${at(ex.from, t)} · Δ<i>t</i>. Aber ${g} ändert sich in diesem Stück: Δ${G} ist die Fläche des Trapezes unter dem ${g}-Graphen, (${at(ex.from, p.t0)} + ${at(ex.from, p.t1)})/2 · Δ<i>t</i>.`);
      }
      case 'unsigned': return L(`${g} changes sign in this piece: the area below the <i>t</i> axis counts negative.`, `${g} wechselt in diesem Stück das Vorzeichen: Die Fläche unter der <i>t</i>-Achse zählt negativ.`);
      case 'area': return L(`Check the change of ${G}: Δ${G} is the area between the ${g} graph and the <i>t</i> axis from ${p.t0} s to ${p.t1} s.`,
        `Prüfe die Änderung von ${G}: Δ${G} ist die Fläche zwischen dem ${g}-Graphen und der <i>t</i>-Achse von ${p.t0} s bis ${p.t1} s.`);
      case 'straight': return L(`${g} is constant here, so ${G} is a straight line: drag the diamond back onto the line between the ends.`,
        `${g} ist hier konstant, also ist ${G} eine Gerade: Zieh die Raute zurück auf die Linie zwischen den Enden.`);
      case 'curve': return L(`${g} changes here, so ${G} is curved (a parabola): drag the diamond to bend the piece.`,
        `${g} ändert sich hier, also ist ${G} gekrümmt (eine Parabel): Zieh an der Raute, um das Stück zu biegen.`);
      case 'bendDir': return p.g1 > p.g0
        ? L(`${g} increases here, so the slope of ${G} increases: ${G} curves upward (the middle lies below the straight line between the ends).`,
          `${g} nimmt hier zu, also nimmt die Steigung von ${G} zu: ${G} krümmt sich nach oben (die Mitte liegt unter der Geraden zwischen den Enden).`)
        : L(`${g} decreases here, so the slope of ${G} decreases: ${G} curves downward (the middle lies above the straight line between the ends).`,
          `${g} nimmt hier ab, also nimmt die Steigung von ${G} ab: ${G} krümmt sich nach unten (die Mitte liegt über der Geraden zwischen den Enden).`);
      default: return L(`${G} bends the right way, but too ${code === 'bendMore' ? 'little' : 'much'}. The diamond in the middle belongs at ${G} at the start of the piece plus the area under ${g} over the first half of the piece (a trapezoid of half the width).`,
        `${G} krümmt sich in die richtige Richtung, aber zu ${code === 'bendMore' ? 'wenig' : 'stark'}. Die Raute in der Mitte gehört auf ${G} am Anfang des Stücks plus die Fläche unter ${g} über die erste Hälfte des Stücks (ein Trapez der halben Breite).`);
    }
  }

  // The drawing (or a check option) has the shape of the given graph.
  function copiedText(start) {
    const F = Q(ex.from), f = Q(ex.to);
    return start + ' ' + L(`But ${F} is the <em>slope</em> of ${f}: where ${F} is constant, ${f} changes steadily.`,
      `Aber ${F} ist die <em>Steigung</em> von ${f}: Wo ${F} konstant ist, ändert sich ${f} gleichmässig.`);
  }

  // ---------------------------------------------------------------- exercise text
  const taskTitle = (e) => `${LABEL[e.task]}: ${L('from a graph to the area under it', 'vom Graphen zur Fläche darunter')}`;
  function statement() {
    const { from, to } = ex;
    return L(`A body moves along a straight line. The graph shows ${its(from)} ${Q(from)}(<i>t</i>), made of straight pieces. At <i>t</i> = 0, ${at(to, 0)} = ${val(ex.pieces[0].G0, to)}. Draw ${graphOf(to)} ${Q(to)}(<i>t</i>).`,
      `Ein Körper bewegt sich auf einer Geraden. Der Graph zeigt ${its(from)} ${Q(from)}(<i>t</i>), zusammengesetzt aus geraden Stücken. Bei <i>t</i> = 0 ist ${at(to, 0)} = ${val(ex.pieces[0].G0, to)}. Zeichne ${graphOf(to)} ${Q(to)}(<i>t</i>).`);
  }
  function howTo() {
    const q = Q(ex.to);
    const keys = L(' Keyboard: Tab to the graph, ←/→ choose a point, ↑/↓ move it.', ' Tastatur: Mit Tab zum Graphen, ←/→ wählt einen Punkt, ↑/↓ verschiebt ihn.');
    return L(`Drag the dots at the breakpoints to set ${q} there (${at(ex.to, 0)} is given), and the diamond in the middle of a piece to bend it into a parabola. Each piece is judged by how much ${q} changes in it, so a mistake only counts once.`,
      `Zieh die Punkte an den Übergangsstellen, um ${q} dort festzulegen (${at(ex.to, 0)} ist gegeben), und die Raute in der Mitte eines Stücks, um es zu einer Parabel zu biegen. Jedes Stück wird danach beurteilt, wie stark sich ${q} darin ändert, also zählt ein Fehler nur einmal.`) + keys;
  }

  const ruleText = () => {
    const F = Q(ex.from), f = Q(ex.to);
    return L(`The change of ${f} is the area under the ${F}(<i>t</i>) graph, and the slope of ${f} is ${F}: a straight line where ${F} is constant, a parabola where it changes linearly. ${F} does not jump, so ${f} has no kinks.`,
      `Die Änderung von ${f} ist die Fläche unter dem ${F}(<i>t</i>)-Graphen, und die Steigung von ${f} ist ${F}: eine Gerade, wo ${F} konstant ist, eine Parabel, wo sich ${F} linear ändert. ${F} springt nicht, also hat ${f} keine Knicke.`);
  };

  const describe = describeInt;
  // the worked steps of a quiz exercise, then the answers
  const stepsHtml = (e) => e.steps.map((x) => `<p class="step-rule">${x.title}</p><div class="figs">${x.figure.startsWith('<div') ? x.figure : `<figure class="fig">${x.figure}</figure>`}</div><p>${x.text}</p>`).join('') +
    `<ul class="short">${e.questions.map((q, k) => `<li><span class="qn">${k + 1}</span>${e.answers[k]}</li>`).join('')}</ul>`;
  function solution() {
    if (isQuiz()) return `<div class="steps">${stepsHtml(ex)}</div>`;
    const rows = ex.pieces.map((p, i) => `<li>${describe(p, i)}</li>`);
    return `<p>${ruleText()} ${L('The correct graph is drawn as a dashed black line.', 'Der richtige Graph ist schwarz gestrichelt eingezeichnet.')}</p><ul class="pieces">${rows.join('')}</ul>`;
  }

  // ---------------------------------------------------------------- rendering
  const starsOf = (d) => `<span class="stars" role="img" aria-label="${ui().stars(d)}" title="${ui().stars(d)}">${'★'.repeat(d)}${'☆'.repeat(5 - d)}</span>`;
  const qc = (q) => `<span class="qc-${q}">${NAME()[q]} ${Q(q)}(<i>t</i>)</span>`;

  // The exercise as it stands (st): texts, graphs, the drawing (saved: the editor's drawing to keep).
  // The exercises of concepts.js (ex.kind) are answered by choosing and entering numbers (quiz.js),
  // the others by drawing.
  const isQuiz = () => !!(ex && ex.kind);

  function render(saved) {
    $('#drawing').hidden = isQuiz();
    $('#quiz').hidden = !isQuiz();
    $('#reset').hidden = isQuiz();
    if (isQuiz()) { renderQuiz(saved); return; }
    $('#title').innerHTML = `${taskTitle(ex)} ${starsOf(ex.difficulty)}`;
    $('#statement').innerHTML = statement();
    $('#howto').innerHTML = howTo();
    $('#given-title').innerHTML = `${ui().given}: ${qc(ex.from)}`;
    $('#draw-title').innerHTML = `${ui().yours}: ${qc(ex.to)}`;
    Plot.setNarrow(narrow());
    $('#given').innerHTML = sourceGraph(ex);

    const old = $('#draw');
    const el = old.cloneNode(false); // drop the listeners of the previous editor
    old.replaceWith(el);
    el.setAttribute('viewBox', `0 0 ${Plot.W} ${Plot.H}`);
    el.setAttribute('aria-label', L(`Graph of ${NAME()[ex.to]} against time to draw. Handles at the breakpoints and in the middle of each piece. Use the arrow keys.`,
      `Zu zeichnender Graph ${{ s: 'des Orts', v: 'der Geschwindigkeit', a: 'der Beschleunigung' }[ex.to]} gegen die Zeit. Griffe an den Übergangsstellen und in der Mitte jedes Stücks. Mit den Pfeiltasten bedienbar.`));
    editor = window.createEditor(el, ex, onEdit);
    if (saved) editor.restore(saved);
    showDrawing();
    showHints();
    showFeedback();
    $('#solution').hidden = !st.revealed;
    $('#sol-text').innerHTML = st.revealed ? solution() : '';
    updateButtons();
  }

  // saved: the answers to keep, by question key
  function renderQuiz(saved) {
    $('#title').innerHTML = `${ex.title} ${starsOf(ex.difficulty)}`;
    $('#statement').innerHTML = ex.text;
    $('#q-figure').innerHTML = ex.figure.startsWith('<div') ? ex.figure : `<figure class="fig">${ex.figure}</figure>`;
    $('#q-fields').innerHTML = ex.questions.map((q, k) => Quiz.html(q, k)).join('');
    if (saved) ex.questions.forEach((q) => { if (q.key in saved) Quiz.setState(q, saved[q.key]); });
    showHints();
    showFeedback();
    $('#solution').hidden = !st.revealed;
    $('#sol-text').innerHTML = st.revealed ? solution() : '';
    updateButtons();
  }
  const quizAnswers = () => Object.fromEntries(ex.questions.map((q) => [q.key, Quiz.state(q)]));

  // Marks, solution and lock of the drawing.
  function showDrawing() {
    const marks = st.res ? st.res.map((r) => (r.ok ? 'ok' : 'bad')) : null;
    if (st.revealed) editor.show({ solution: true, locked: true, marks: evaluate(ex, editor.values()).map((r) => (r.ok ? 'ok' : 'bad')) });
    else editor.show({ marks, locked: st.solved });
  }

  // The result of the last check (kept when the language changes).
  function showFeedback() {
    const status = $('#status');
    status.className = 'status';
    status.textContent = '';
    $('#feedback').innerHTML = '';
    if (isQuiz()) { showQuizFeedback(); return; }
    if (st.revealed && !st.solved) { status.textContent = ui().shown; return; }
    if (!st.res) return;
    const right = st.res.filter((r) => r.ok).length;
    if (right === st.res.length) {
      status.textContent = ui().ok + (st.advance ? ` ${st.advance}` : '');
      status.className = 'status ok';
      return;
    }
    status.textContent = ui().some(right, st.res.length, st.tries) + (canReveal() ? ui().canReveal : ui().tryAgain);
    status.className = 'status bad';
    const items = st.res.map((r, i) => (r.ok ? '' : `<li><b>${piece(i + 1)} (${when(ex.pieces[i])})</b>: ${r.codes.map((c) => whyInt(c, ex.pieces[i])).join(' ')}</li>`));
    if (st.copied) items.unshift(`<li>${copiedText(L('Your graph has the same shape as the given one.', 'Dein Graph hat dieselbe Form wie der gegebene.'))}</li>`);
    $('#feedback').innerHTML = items.join('');
  }

  // The marks of the last check, on the questions whose answers have not changed since.
  function showQuizFeedback() {
    const status = $('#status');
    const now = quizAnswers();
    ex.questions.forEach((q) => {
      const then = st.checked && st.checked[q.key];
      const same = st.checked && JSON.stringify(then) === JSON.stringify(now[q.key]);
      Quiz.paint(q, same ? Quiz.evaluate(q, then) : null, now[q.key], !st.solved && !st.revealed);
    });
    if (st.revealed && !st.solved) { status.textContent = ui().qShown; return; }
    if (!st.checked) return;
    const evs = ex.questions.map((q) => Quiz.evaluate(q, st.checked[q.key]));
    if (evs.some((e) => !e.complete)) { status.textContent = ui().choose; return; }
    const right = evs.filter((e) => e.ok).length;
    if (right === evs.length) { status.textContent = ui().qOk + (st.advance ? ` ${st.advance}` : ''); status.className = 'status ok'; return; }
    status.textContent = ui().qSome(right, evs.length, st.tries) + (canReveal() ? ui().canReveal : ui().qTry);
    status.className = 'status bad';
  }

  function onEdit() {
    if (st.revealed) return;
    if (st.res && !st.solved) { st.res = null; st.copied = false; showFeedback(); }
  }

  // Redraw both graphs when the screen gets narrow or wide (the drawing is kept).
  const narrow = () => $('#given').clientWidth < NARROW;
  function relayout() {
    if (!ex || isQuiz() || $('#task').hidden || (Plot.W < 640) === narrow()) return;
    Plot.setNarrow(narrow());
    $('#given').innerHTML = sourceGraph(ex);
    $('#draw').setAttribute('viewBox', `0 0 ${Plot.W} ${Plot.H}`);
    editor.show({});
  }

  // Coordinates of the grid point or crossing under the mouse on the given graph.
  function hoverGiven(evt) {
    const el = $('#given svg');
    if (!ex || isQuiz() || !el) return;
    const old = el.querySelector('.hover');
    if (old) old.remove();
    if (evt.type === 'pointerleave' || evt.pointerType === 'touch') return;
    const pt = Plot.svgPoint(el, evt), axis = ex.axes.source;
    el.firstElementChild.insertAdjacentHTML('beforeend', Plot.hoverMark(axis, ex.from, Plot.hoverPoint(ex, axis, [ex.source], pt.x, pt.y)));
  }

  // ---------------------------------------------------------------- exercise lifecycle
  // solved now, or solved before (its solution can be looked at again)
  const canReveal = () => st.solved || Practice.solvedBefore(PRACTICE, ex.id) || st.hints >= ex.hints.length || st.tries >= MAX_TRIES;
  const hintsOf = () => (isQuiz() ? ex.hints : hintsInt());

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'ma', typeOf = (e) => e.kind || e.task;
  const finish = () => { if (ex && st) Practice.finish(PRACTICE, typeOf(ex), st); };

  function open(exercise) {
    finish(); // the student moves on
    ex = exercise;
    ex.hints = hintsOf();
    st = { tries: 0, hints: 0, solved: false, revealed: false, res: null, copied: false, checked: null };
    const hash = `#${ex.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render();
    topics.shown(ex);
  }

  // A new exercise of the topic and stage chosen (topics.js), of another type than the current one if possible.
  function fresh() { open(topics.next(ex)); }
  // an exercise of a practice type: a task (vs, av) or a kind of question with its difficulty (area:3)
  const ofType = (type, seed) => { const [k, d] = type.split(':'); return d ? KINDS[k].make(seed, Number(d)) : generate(k, seed); };

  function updateButtons() {
    const left = ex.hints.length - st.hints;
    const hb = $('#hint');
    hb.disabled = left === 0 || st.revealed;
    hb.textContent = left ? ui().hint(left) : ui().noHints;
    const rb = $('#reveal');
    rb.disabled = !canReveal() || st.revealed;
    rb.title = canReveal() ? '' : ui().unlocks(MAX_TRIES);
    $('#reveal-note').hidden = canReveal() || st.revealed;
    $('#reset').disabled = st.revealed || st.solved;
    // once everything is right, Check becomes New exercise, like the button at the top
    const cb = $('#check');
    cb.textContent = st.solved ? ui().new : ui().check;
    cb.classList.toggle('primary', !st.solved);
    cb.classList.toggle('new-btn', st.solved);
    cb.disabled = st.revealed && !st.solved;
  }

  function check() {
    if (st.solved) { fresh(); return; } // the button reads New exercise
    if (isQuiz()) { checkQuiz(); return; }
    const ans = editor.values();
    st.tries++;
    st.res = evaluate(ex, ans);
    st.copied = copied(ex, ans);
    if (st.res.every((r) => r.ok)) {
      if (!st.revealed) {
        const s = stored('ma-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('ma-score', s);
        showScore();
      }
      st.solved = true;
      Practice.markSolved(PRACTICE, ex.id);
      st.advance = topics.solved(st, ex);
      finish();
    }
    showDrawing();
    showFeedback();
    updateButtons();
  }

  function checkQuiz() {
    const ans = quizAnswers(), evs = ex.questions.map((q) => Quiz.evaluate(q, ans[q.key]));
    st.checked = ans;
    if (evs.every((e) => e.complete)) {
      st.tries++;
      if (evs.every((e) => e.ok)) {
        if (!st.revealed) {
          const s = stored('ma-score', { solved: 0, clean: 0 });
          s.solved++;
          if (st.tries === 1 && st.hints === 0) s.clean++;
          store('ma-score', s);
          showScore();
        }
        st.solved = true;
        Practice.markSolved(PRACTICE, ex.id);
        st.advance = topics.solved(st, ex);
        finish();
      }
    }
    showFeedback();
    updateButtons();
  }

  function showHints() {
    $('#hint-list').innerHTML = ex.hints.slice(0, st.hints).map((h) => `<li>${h}</li>`).join('');
    $('#hints').hidden = !st.hints;
  }
  function hint() {
    if (st.hints >= ex.hints.length) return;
    st.hints++;
    showHints();
    updateButtons();
    $('#hint-list').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function reveal() {
    if (!canReveal()) return;
    st.revealed = true;
    finish();
    if (!isQuiz()) showDrawing();
    $('#sol-text').innerHTML = solution();
    $('#solution').hidden = false;
    showFeedback();
    updateButtons();
    $('#solution').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- find the error
  // A student's sketch of s(t) for a given v(t) (or of v(t) for a given a(t)) with one piece wrong
  // (flaw() in generator.js): which piece is wrong, and what is wrong with it. An exercise like
  // those of concepts.js (answered with quiz.js), made here because it uses the texts of the
  // drawing exercises. Its graphs are drawn narrow, to fit side by side.
  const FLAW_TEXT = {
    unsigned: () => L('It counts the area below the <i>t</i> axis as positive.', 'Es zählt die Fläche unter der <i>t</i>-Achse positiv.'),
    rect: () => L(`Its change is ${Q(ex.from)} at the start times Δ<i>t</i>, a rectangle.`, `Seine Änderung ist ${Q(ex.from)} am Anfang mal Δ<i>t</i>, ein Rechteck.`),
    curve: () => L(`It is a straight line, but ${Q(ex.to)} is a parabola here.`, `Es ist eine Gerade, aber ${Q(ex.to)} ist hier eine Parabel.`),
    bendDir: () => L('It curves the wrong way.', 'Es ist falsch herum gekrümmt.'),
  };
  // why a mistake c that was chosen does not describe the wrong piece (without naming the right one)
  function notWhy(c) {
    const g = Q(ex.from);
    return `${L('That is not the mistake in this piece:', 'Das ist nicht der Fehler in diesem Stück:')} ${{
      unsigned: L(`the sign of its change is right (it decreases where ${g} is negative).`, `Das Vorzeichen seiner Änderung stimmt (es nimmt ab, wo ${g} negativ ist).`),
      rect: L(`its change is not ${g} at the start times Δ<i>t</i>.`, `Seine Änderung ist nicht ${g} am Anfang mal Δ<i>t</i>.`),
      curve: L('it is not straight where it should be curved.', 'Es ist nicht gerade, wo es gekrümmt sein sollte.'),
      bendDir: L('more than its curvature is wrong.', 'Falsch ist mehr als nur seine Krümmung.'),
    }[c]}`;
  }
  // what the sketch shows in its wrong piece p, and why that is wrong
  function flawWhy(code, p) {
    const g = Q(ex.from), G = Q(ex.to);
    switch (code) {
      case 'unsigned': return L(`In this piece, ${g} is negative${p.g0 * p.g1 < 0 ? ' for a while' : ''}, but the sketch counts the area below the <i>t</i> axis as positive: there ${G} must decrease. Δ${G} is the area with its sign.`,
        `In diesem Stück ist ${g}${p.g0 * p.g1 < 0 ? ' eine Zeit lang' : ''} negativ, aber die Skizze zählt die Fläche unter der <i>t</i>-Achse positiv: Dort muss ${G} abnehmen. Δ${G} ist die Fläche mit ihrem Vorzeichen.`);
      case 'rect': return L(`The sketch changes by ${at(ex.from, p.t0)} · Δ<i>t</i> in this piece, a rectangle. But ${g} changes here: Δ${G} is the area of the trapezoid under ${g}, (${at(ex.from, p.t0)} + ${at(ex.from, p.t1)})/2 · Δ<i>t</i>.`,
        `Die Skizze ändert sich in diesem Stück um ${at(ex.from, p.t0)} · Δ<i>t</i>, ein Rechteck. Aber ${g} ändert sich hier: Δ${G} ist die Fläche des Trapezes unter ${g}, (${at(ex.from, p.t0)} + ${at(ex.from, p.t1)})/2 · Δ<i>t</i>.`);
      case 'curve': return L(`The sketch is straight in this piece, so its slope is constant. But ${g} changes here, and ${g} is the slope of ${G}: ${G} is a parabola.`,
        `Die Skizze ist in diesem Stück gerade, ihre Steigung also konstant. Aber ${g} ändert sich hier, und ${g} ist die Steigung von ${G}: ${G} ist eine Parabel.`);
      default: return p.g1 > p.g0
        ? L(`${g} increases here, so the slope of ${G} increases: ${G} curves upward. The sketch curves downward.`, `${g} nimmt hier zu, also nimmt die Steigung von ${G} zu: ${G} krümmt sich nach oben. Die Skizze krümmt sich nach unten.`)
        : L(`${g} decreases here, so the slope of ${G} decreases: ${G} curves downward. The sketch curves upward.`, `${g} nimmt hier ab, also nimmt die Steigung von ${G} ab: ${G} krümmt sich nach unten. Die Skizze krümmt sich nach oben.`);
    }
  }
  function errorEx(seed) {
    let e, f;
    for (let k = 0; !f; k++) {
      const s = (seed + 7919 * k) >>> 0;
      e = generate(rng(s).next() < 0.7 ? 'vs' : 'av', s);
      f = flaw(e, s);
    }
    const i = f.piece, p = e.pieces[i];
    return withEx(e, () => narrowed(() => {
      const g = Q(e.from), G = Q(e.to);
      const sketch = (o = {}) => Plot.answerGraph(e, { vals: f.vals, ...o });
      const fig = (given, drawn) => `<div class="tgraphs"><div><h3>${ui().given}: ${qc(e.from)}</h3><div class="plot">${given}</div></div>` +
        `<div><h3>${ui().sketch}: ${qc(e.to)}</h3><div class="plot">${drawn}</div></div></div>`;
      const marks = e.pieces.map((x, k) => (k === i ? 'focus' : ''));
      const right = (k) => describe(e.pieces[k], k).replace(/^<b>[^<]*<\/b>: /, '');
      const area = (s) => Plot.Tut.area(s, p.t0, p.g0, p.t1, p.g1);
      const areas = (s) => e.pieces.map((x) => Plot.Tut.area(s, x.t0, x.g0, x.t1, x.g1)).join('');
      // each piece: its area, and the change of the sketch (right or not)
      const changes = e.pieces.map((x, k) => {
        const A = window.Motion.area(x), d = f.vals[k].y1 - f.vals[k].y0, ok = Math.abs(A - d) < 0.05;
        return `${piece(k + 1)}: ${L('area', 'Fläche')} ${sval(A, e.to)}, ${L('sketch', 'Skizze')} ${sval(d, e.to)} ${ok ? '✓' : '✗'}`;
      }).join('<br>');
      const questions = [
        { type: 'choice', key: 'piece', prompt: L('Which piece of the sketch is wrong?', 'Welches Stück der Skizze ist falsch?'),
          options: e.pieces.map((x, k) => ({ html: `${piece(k + 1)} (${when(x)})`, correct: k === i, flag: null, why: k === i ? '' : `${L(`${piece(k + 1)} is right:`, `${piece(k + 1)} stimmt:`)} ${right(k)}` })) },
        { type: 'choice', key: 'what', prompt: L('What is wrong with it?', 'Was ist daran falsch?'),
          options: window.Motion.FLAWS.map((c) => ({ html: FLAW_TEXT[c](), correct: c === f.code, flag: null, why: c === f.code ? '' : notWhy(c) })) },
      ];
      return {
        kind: 'error', id: `error-${seed}`, seed, difficulty: 4, flaw: f,
        title: L('Find the error', 'Finde den Fehler'),
        text: L(`<p>A body moves along a straight line. The given graph shows ${its(e.from)} ${g}(<i>t</i>), and ${at(e.to, 0)} = ${val(e.pieces[0].G0, e.to)}. A student sketched ${graphOf(e.to)} ${G}(<i>t</i>) for it; one of its five pieces is wrong.</p>`,
          `<p>Ein Körper bewegt sich auf einer Geraden. Der gegebene Graph zeigt ${its(e.from)} ${g}(<i>t</i>), und ${at(e.to, 0)} = ${val(e.pieces[0].G0, e.to)}. Eine Schülerin hat dazu ${graphOf(e.to)} ${G}(<i>t</i>) skizziert; eines der fünf Stücke ist falsch.</p>`),
        figure: fig(sourceGraph(e), sketch()),
        questions,
        hints: [
          ruleText(),
          L(`Check the sketch piece by piece: does ${G} change by the area under ${g} in it, with its sign? Is it straight where ${g} is constant, and curved the right way where ${g} changes? A wrong piece shifts all the pieces after it, but they still change by the right amount.`,
            `Prüfe die Skizze Stück für Stück: Ändert sich ${G} darin um die Fläche unter ${g}, mit Vorzeichen? Ist sie gerade, wo ${g} konstant ist, und richtig gekrümmt, wo sich ${g} ändert? Ein falsches Stück verschiebt alle Stücke danach, aber diese ändern sich immer noch um den richtigen Betrag.`),
          L(`${piece(i + 1)} (${when(p)}) is wrong.`, `${piece(i + 1)} (${when(p)}) ist falsch.`),
        ],
        steps: [
          { title: L('Piece by piece', 'Stück für Stück'), text: `${ruleText()} ${L(`Compare how much the sketch changes in each piece with the area under the ${g}(<i>t</i>) graph, and its shape with how ${g} changes.`, `Vergleiche, wie stark sich die Skizze in jedem Stück ändert, mit der Fläche unter dem ${g}(<i>t</i>)-Graphen, und ihre Form damit, wie sich ${g} ändert.`)}`, figure: fig(sourceGraph(e), sketch()) },
          { title: L('The areas', 'Die Flächen'), text: `${L(`The area under ${g} in each piece, and how much the sketch changes there:`, `Die Fläche unter ${g} in jedem Stück und wie stark sich die Skizze dort ändert:`)}<br>${changes}${f.code === 'curve' || f.code === 'bendDir'
            ? L(`<br>Every piece changes by its area: the mistake is in the shape.`, `<br>Jedes Stück ändert sich um seine Fläche: Der Fehler liegt in der Form.`)
            : L(`<br>In ${piece(i + 1).toLowerCase()}, the change does not match the area.`, `<br>In ${piece(i + 1)} passt die Änderung nicht zur Fläche.`)}`, figure: fig(sourceGraph(e, { under: areas }), sketch()) },
          { title: `${piece(i + 1)} (${when(p)})`, text: `${flawWhy(f.code, p)} ${L('Right', 'Richtig')}: ${right(i)}`, figure: fig(sourceGraph(e, { marks, under: area }), sketch({ marks })) },
          { title: L('The right graph', 'Der richtige Graph'), text: L(`The other pieces of the sketch change by the right amounts${f.code === 'unsigned' || f.code === 'rect' ? `; after ${piece(i + 1).toLowerCase()} they are only shifted` : ''}. With ${piece(i + 1).toLowerCase()} corrected, the sketch is ${G}(<i>t</i>).`,
            `Die anderen Stücke der Skizze ändern sich um die richtigen Beträge${f.code === 'unsigned' || f.code === 'rect' ? `; nach ${piece(i + 1)} sind sie nur verschoben` : ''}. Mit korrigiertem ${piece(i + 1)} ist die Skizze ${G}(<i>t</i>).`), figure: fig(sourceGraph(e), Plot.answerGraph(e, { marks })) },
        ],
        answers: questions.map((q) => q.options.find((o) => o.correct).html),
      };
    }));
  }
  register('error', { difficulties: [4], make: (seed) => errorEx(seed) });

  // ---------------------------------------------------------------- tutor
  // Worked examples: the exercises of concepts.js and find the error with their worked steps, and
  // the drawing tasks v → s and a → v piece by piece: the piece is highlighted in both graphs,
  // with the area under the given graph and the tangents at the ends of the piece drawn.
  const LESSONS = [
    { name: () => L('Area', 'Fläche'), kind: 'area', d: 4, seed: 1, practice: [{ types: ['area:3'] }, { name: () => L('displacement and distance', 'Ortsänderung und Weg'), types: ['area:4'] }],
      idea: () => L('The area under v(t) is the displacement (below the axis negative); counting all areas positive gives the distance travelled.',
        'Die Fläche unter v(t) ist die Ortsänderung (unter der Achse negativ); zählt man alle Flächen positiv, erhält man den zurückgelegten Weg.') },
    { name: () => L('Who is farther?', 'Wer ist weiter weg?'), kind: 'race', d: 4, seed: 1, practice: [{ types: ['race:4'] }],
      idea: () => L('How far a body is from its start is the area under its v(t) graph up to then, not the height of the graph at that time.',
        'Wie weit ein Körper von seinem Start entfernt ist, ist die Fläche unter seinem v(t)-Graphen bis dahin, nicht die Höhe des Graphen zu diesem Zeitpunkt.') },
    { name: () => L('Mean velocity', 'Mittlere Geschwindigkeit'), kind: 'mean', d: 4, seed: 1, practice: [{ types: ['mean:3'] }, { name: () => L('also backwards', 'auch rückwärts'), types: ['mean:4'] }],
      idea: () => L('The mean velocity is the displacement divided by the time, v̄ = Δs/Δt: the height of the rectangle with the same area as under v(t). The mean of the start and end velocities is right only where v(t) is one straight line.',
        'Die mittlere Geschwindigkeit ist die Ortsänderung geteilt durch die Zeit, v̄ = Δs/Δt: die Höhe des Rechtecks mit derselben Fläche wie unter v(t). Der Mittelwert von Anfangs- und Endgeschwindigkeit stimmt nur, wo v(t) eine einzige Gerade ist.') },
    { name: 'v → s', task: 'vs', seed: 45, practice: [{ types: ['vs'] }],
      idea: () => L('The change of position in a piece is the area between the velocity graph and the time axis; below the axis it counts negative.',
        'Die Ortsänderung in einem Stück ist die Fläche zwischen dem Geschwindigkeit-Zeit-Graphen und der Zeitachse; unter der Achse zählt sie negativ.') },
    { name: 'a → v', task: 'av', seed: 12, practice: [{ types: ['av'] }],
      idea: () => L('The change of velocity is the area under the acceleration graph, and the acceleration is the slope of the velocity graph.',
        'Die Geschwindigkeitsänderung ist die Fläche unter dem Beschleunigung-Zeit-Graphen, und die Beschleunigung ist die Steigung des Geschwindigkeit-Zeit-Graphen.') },
    { name: () => L('Find the error', 'Finde den Fehler'), kind: 'error', d: 4, seed: 1, practice: [{ types: ['error'] }],
      idea: () => L('A sketch of s(t) is checked piece by piece against the areas under v(t): each piece changes by its area, with its sign, straight where v is constant and curved where v changes.',
        'Eine Skizze von s(t) prüft man Stück für Stück an den Flächen unter v(t): Jedes Stück ändert sich um seine Fläche, mit Vorzeichen, gerade, wo v konstant ist, und gekrümmt, wo sich v ändert.') },
  ];
  // A given graph and its answer side by side, or (stack: in the tutor) the answer below the given
  // graph, so that both can be larger.
  const pairFigure = (e, given, answer, stack) => `<div class="tgraphs${stack ? ' stack' : ''}"><div><h3>${ui().given}: ${qc(e.from)}</h3><div class="plot">${given}</div></div>` +
    `<div><h3>${ui().answer}: ${qc(e.to)}</h3><div class="plot">${answer}</div></div></div>`;

  function lesson(def) {
    const e = generate(def.task, def.seed);
    return withEx(e, () => {
      const { Tut } = Plot, g = e.to, ps = e.pieces, n = ps.length;
      const marks = (i) => ps.map((p, k) => (k === i ? 'focus' : ''));
      const num = (x) => (r2(x) > 0 ? '+' : '') + fmt(x);
      const frames = [{
        text: `<p class="step-rule">${L('The task', 'Die Aufgabe')}</p><p>${statement()}</p><p>${ruleText()} ${L('We go through the graph piece by piece.', 'Wir gehen den Graphen Stück für Stück durch.')}</p>`,
        figure: pairFigure(e, sourceGraph(e), Plot.answerGraph(e, { upto: 0 }), true),
      }];
      ps.forEach((p, i) => {
        const tm = (p.t0 + p.t1) / 2, dG = area(p);
        const under = (s) => Tut.area(s, p.t0, p.g0, p.t1, p.g1);
        // the label just outside the shaded area: above it if the area counts positive, else below
        const over = (s) => Tut.tag(s, tm, dG >= 0 ? Math.max(p.g0, p.g1, 0) : Math.min(p.g0, p.g1, 0), `Δ${g} = ${num(dG)} ${UNIT[g]}`, dG >= 0 ? 'above' : 'below');
        const ans = (s) => Tut.dot(s, p.t0, p.G0) + Tut.dot(s, p.t1, p.G1) +
          (sloped(p) ? Tut.dot(s, tm, midOf(p).Gm, 'mean') : '') + // the middle point, where the diamond goes
          Tut.tangent(s, p.t0, p.G0, p.g0) + Tut.tangent(s, p.t1, p.G1, p.g1) +
          Tut.tag(s, p.t1, p.G1, `${num(p.G1)} ${UNIT[g]}`, dG >= 0 ? 'above' : 'below');
        const text = describe(p, i).replace(/^<b>[^<]*<\/b>: /, '');
        frames.push({
          text: `<p class="step-rule">${L(`Piece ${i + 1} of ${n}`, `Stück ${i + 1} von ${n}`)} (${when(p)})</p><p>${text}</p>`,
          figure: pairFigure(e, sourceGraph(e, { marks: marks(i), under, overlay: over }), Plot.answerGraph(e, { upto: i + 1, marks: marks(i), overlay: ans }), true),
        });
      });
      const F = Q(e.from), G = Q(g);
      const check = L(`Check: where ${F} = 0, the ${G} graph is horizontal; where ${F} &gt; 0, ${G} rises; where ${F} &lt; 0, it falls.`,
        `Kontrolle: Wo ${F} = 0 ist, ist der ${G}-Graph waagrecht; wo ${F} &gt; 0 ist, steigt ${G}; wo ${F} &lt; 0 ist, fällt ${G}.`);
      frames.push({ text: `<p class="step-rule">${L('The whole graph', 'Der ganze Graph')}</p><p>${ruleText()}</p><p>${check}</p>`, figure: pairFigure(e, sourceGraph(e), Plot.answerGraph(e), true) });
      return frames;
    });
  }
  // On a phone, the worked examples use the narrow drawings too (see Plot.setNarrow).
  const phone = () => window.matchMedia('(max-width: 640px)').matches;
  // A worked example of a quiz exercise: the task, its worked steps, then the answers with the
  // typical wrong ones and the misconception behind each.
  const figOf = (f) => `<div class="figs">${f.startsWith('<div') ? f : `<figure class="fig">${f}</figure>`}</div>`;
  function quizLesson(def) {
    const e = KINDS[def.kind].make(def.seed, def.d);
    // a choice of graphs shows its graphs with the question
    const pics = (q) => (q.pics ? `<div class="qopts pics tq-pics">${q.options.map((o) => `<div class="qopt"><span class="qval">${o.html}</span></div>`).join('')}</div>` : '');
    const task = { text: `<p class="step-rule">${L('The task', 'Die Aufgabe')}</p>${e.text}<ol class="tq">${e.questions.map((q) => `<li>${q.prompt}${pics(q)}</li>`).join('')}</ol>`, figure: figOf(e.figure) };
    const steps = e.steps.map((x) => ({ text: `<p class="step-rule">${x.title}</p><p>${x.text}</p>`, figure: figOf(x.figure) }));
    const wrongs = (q) => (q.type === 'num' ? q.traps.map((t) => ({ html: `${fmt(t.value)} ${q.unit}`, flag: t.flag, why: t.why })) : q.options.filter((o) => !o.correct))
      .filter((o) => o.flag).map((o) => `<li>${o.html.startsWith('<svg') ? '' : `<i>${o.html}</i> `}<span class="tag">${Concepts.FLAGS[o.flag]()}</span><br>${o.why}</li>`).join('');
    const answers = e.questions.map((q, k) => `<p><span class="qn">${k + 1}</span>${q.prompt} <b>${e.answers[k]}</b></p>` +
      (wrongs(q) ? `<details><summary>${ui().wrongs}</summary><ul class="wrong">${wrongs(q)}</ul></details>` : '')).join('');
    return [task, ...steps, { text: `<p class="step-rule">${ui().answers}</p>${answers}`, figure: steps[steps.length - 1].figure }];
  }
  const nameOf = (l) => (typeof l.name === 'function' ? l.name() : l.name);
  const lessons = () => LESSONS.map((l, i) => ({ name: nameOf(l), idea: l.idea(), also: topics.also(i), frames: () => (l.kind ? quizLesson(l) : phone() ? narrowed(() => lesson(l)) : lesson(l)) }));

  // ---------------------------------------------------------------- check
  // The learning objectives (check.js), each with the kinds of question it is asked with, its
  // worked example and its practice topic. A drawing task (vs, av) shows the given graph and four
  // graphs to choose from (quiz() in generator.js); find the error asks for the wrong piece of a
  // sketch; the other kinds ask one question of an exercise of concepts.js (kind:d, or kind:d:key
  // for a given question), with four options.
  const OBJECTIVES = [
    { id: 'area', kinds: ['area:3', 'area:4'], tutor: 0, topic: 0,
      name: () => L('Find the displacement as the area under v(t), counting the area below the t axis as negative.', 'Die Ortsänderung als Fläche unter v(t) bestimmen und dabei die Fläche unter der t-Achse negativ zählen.') },
    { id: 'farther', kinds: ['race:4:far', 'race:4:sB'], tutor: 1, topic: 1,
      name: () => L('Decide from v(t) graphs which body is farther from its start at a given time.', 'An v(t)-Graphen entscheiden, welcher Körper zu einem bestimmten Zeitpunkt weiter von seinem Start entfernt ist.') },
    { id: 'mean', kinds: ['mean:3:vm', 'mean:4:vm'], tutor: 2, topic: 2,
      name: () => L('Determine the mean velocity from a v(t) graph.', 'Die mittlere Geschwindigkeit aus einem v(t)-Graphen bestimmen.') },
    { id: 'sketch', kinds: ['vs', 'av', 'error'], tutor: 3, topic: 3,
      name: () => L('Sketch s(t) from v(t), and v(t) from a(t), and find the error in such a sketch.', 's(t) aus v(t) und v(t) aus a(t) skizzieren und den Fehler in einer solchen Skizze finden.') },
  ];
  // The graphs are drawn narrow, to fit two side by side.
  function narrowed(f) {
    const wide = Plot.W >= 640;
    Plot.setNarrow(true);
    try { return f(); } finally { Plot.setNarrow(!wide); }
  }
  // What a wrong graph shows, by its flag (quiz() in generator.js).
  function graphWhy(flag) {
    const F = Q(ex.from), f = Q(ex.to);
    switch (flag) {
      case 'copy': return copiedText(L('This graph has the shape of the given one.', 'Dieser Graph hat die Form des gegebenen.'));
      case 'sign': return L(`This graph changes the wrong way: where ${F} is positive, ${f} increases; where it is negative, ${f} decreases.`,
        `Dieser Graph ändert sich in die falsche Richtung: Wo ${F} positiv ist, nimmt ${f} zu; wo ${F} negativ ist, nimmt ${f} ab.`);
      case 'rectStart': return L(`This graph takes the change of ${f} in each piece as the value of ${F} at its start times Δ<i>t</i>. But where ${F} changes, Δ${f} is the area of a trapezoid: (start + end)/2 · Δ<i>t</i>.`,
        `Dieser Graph nimmt als Änderung von ${f} in jedem Stück den Wert von ${F} am Anfang mal Δ<i>t</i>. Aber wo sich ${F} ändert, ist Δ${f} die Fläche eines Trapezes: (Anfang + Ende)/2 · Δ<i>t</i>.`);
      default: return L(`The values at the breakpoints are right, but where ${F} changes, the slope of ${f} changes too: ${f} is a parabola there, not a straight line.`,
        `Die Werte an den Übergangsstellen stimmen, aber wo sich ${F} ändert, ändert sich auch die Steigung von ${f}: ${f} ist dort eine Parabel, keine Gerade.`);
    }
  }
  function graphQuestion(task, seed) {
    let e = null, q = null;
    for (let k = 0; !q; k++) {
      e = generate(task, (seed + 7919 * k) >>> 0);
      q = quiz(e, seed);
    }
    return withEx(e, () => narrowed(() => ({
      title: taskTitle(e),
      text: `<p>${statement().replace(/ (Draw|Zeichne) .*$/, '')}</p>`,
      figure: `<figure class="fig">${sourceGraph(e)}</figure>`,
      ask: L(`Which graph shows ${its(e.to)} ${Q(e.to)}(<i>t</i>)?`, `Welcher Graph zeigt ${its(e.to)} ${Q(e.to)}(<i>t</i>)?`),
      options: q.options.map((o) => ({ html: Plot.answerGraph(e, { vals: o.vals, axis: o.axis }), correct: !!o.correct, flag: o.flag, why: o.correct ? '' : graphWhy(o.flag) })),
      explain: () => withEx(e, () => narrowed(() => `${pairFigure(e, sourceGraph(e), Plot.answerGraph(e))}` +
        `<div class="steps"><p>${ruleText()}</p><ul>${e.pieces.map((p, i) => `<li>${describe(p, i)}</li>`).join('')}</ul></div>`)),
    })));
  }
  // find the error: the wrong piece among four
  function errorQuestion(seed) {
    const e = errorEx(seed), i = e.flaw.piece, r = rng(seed ^ 0x51ed), q = e.questions[0];
    const shown = [i, ...r.shuffle([0, 1, 2, 3, 4].filter((k) => k !== i)).slice(0, 3)].sort((a, b) => a - b);
    return { title: e.title, text: e.text, figure: e.figure, ask: q.prompt, options: shown.map((k) => q.options[k]), explain: () => `<div class="steps">${stepsHtml(e)}</div>` };
  }
  function checkQuestion(kind, seed) {
    const [k, d, key] = kind.split(':');
    if (TASKS[k]) return graphQuestion(k, seed);
    if (k === 'error') return errorQuestion(seed);
    const e = KINDS[k].make(seed, Number(d)), a = Concepts.question(e, seed, key);
    return {
      title: e.title, text: e.text, figure: e.figure.startsWith('<div') ? e.figure : `<figure class="fig">${e.figure}</figure>`, ask: a.ask,
      options: a.options.map((o) => ({ html: o.html, correct: o.correct, flag: o.correct ? null : o.flag, why: o.correct ? '' : o.why })),
      explain: () => `<div class="steps">${stepsHtml(e)}</div>`,
    };
  }
  const IDEAS = ['height', 'unsigned', 'rect', 'ends', 'nodt'];
  const checkSource = {
    id: 'ma',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { copy: 'copy', sign: 'sign', rectStart: 'rect', curve: 'shape', ...Object.fromEntries(IDEAS.map((f) => [f, f])) },
    concepts: () => ({
      ...Object.fromEntries(IDEAS.map((f) => [f, Concepts.FLAGS[f]()])),
      copy: L('the value instead of the slope', 'der Wert statt der Steigung'),
      sign: L('the sign of the area', 'das Vorzeichen der Fläche'),
      shape: L('straight instead of curved', 'gerade statt gekrümmt'),
    }),
  };

  // ---------------------------------------------------------------- language
  function applyStatic() {
    document.title = ui().title;
    Lang.apply(ui());
    if (topics) topics.relabel();
  }

  // The same exercise in the other language, with the drawing, feedback, hints and solution kept.
  function switchLang() {
    applyStatic();
    showScore();
    if (ex && isQuiz()) {
      const keep = quizAnswers(), id = ex.id, old = /^([a-z]+)-(\d+)$/.exec(id);
      ex = topics.parse(id) || generate(old[1], Number(old[2]));
      ex.id = id;
      render(keep);
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
    } else if (ex) {
      ex.hints = hintsOf();
      render(editor.state());
      if ($('#task').hidden) { $('#hints').hidden = true; $('#solution').hidden = true; }
    }
    tutor.relabel(lessons());
    checker.relabel();
  }

  // ---------------------------------------------------------------- modes
  // Practice: random exercises; tutor: worked examples; check: a short test on the learning
  // objectives (check.js). Hints and solution belong to practice.
  const mode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || 'practice';
  function setMode(m) {
    document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
    store('ma-mode', m);
    document.querySelectorAll('.practice').forEach((el) => { el.hidden = m !== 'practice'; });
    $('#tutor').hidden = m !== 'tutor';
    $('#ck').hidden = m !== 'check';
    if (m !== 'practice') { $('#hints').hidden = true; $('#solution').hidden = true; }
  }
  function practise() {
    setMode('practice');
    if (ex) { history.replaceState(null, '', `#${ex.id}`); $('#hints').hidden = !st.hints; $('#solution').hidden = !st.revealed; relayout(); } else fresh();
  }
  function checkMode() {
    setMode('check');
    checker.show();
    if (location.hash !== '#check') history.replaceState(null, '', '#check');
  }

  function fromHash() {
    const h = location.hash.slice(1);
    if (h === 'check') { if ($('#ck').hidden) checkMode(); return true; }
    let m = h.match(/^tutor-(\d+)$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= tutor.count) {
      setMode('tutor');
      if (tutor.current() !== Number(m[1]) - 1 || !tutor.shown()) tutor.open(Number(m[1]) - 1);
      return true;
    }
    const te = topics.parse(h);
    if (te) {
      setMode('practice');
      if (!ex || ex.id !== h) open(te);
      return true;
    }
    // a task or kind of this module
    m = h.match(/^([a-z]+)-(\d+)$/);
    if (!m || !(TASKS[m[1]] || KINDS[m[1]])) return false;
    setMode('practice');
    if (!ex || ex.id !== h) open(generate(m[1], Number(m[2])));
    return true;
  }

  // ---------------------------------------------------------------- init
  function init() {
    Lang.init(); // see lang.js
    document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML);
    applyStatic();
    Lang.wire(switchLang);
    topics = window.Topics.create({
      app: PRACTICE,
      topics: LESSONS.map((l) => ({ name: () => nameOf(l), stages: l.practice.map((st) => ({ name: st.name || null, types: st.types })) })),
      make: ofType, typeOf,
      onChange: fresh,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
    });
    topics.mount($('#levels'));
    $('#new').addEventListener('click', fresh);
    $('#q-fields').addEventListener('input', () => { if (st && !st.solved) showFeedback(); });
    $('#q-fields').addEventListener('change', () => { if (st && !st.solved) showFeedback(); });
    $('#given').addEventListener('pointermove', hoverGiven);
    $('#given').addEventListener('pointerleave', hoverGiven);
    $('#check').addEventListener('click', check);
    $('#hint').addEventListener('click', hint);
    $('#reset').addEventListener('click', () => editor.reset());
    $('#reveal').addEventListener('click', reveal);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', relayout);
    tutor = window.createTutor(lessons(), { done: practise, practise: (i) => { topics.go(i); setMode('practice'); fresh(); } });
    checker = Check.create(checkSource, {
      math: () => {}, markScrollable: () => {}, stored, store,
      tutor: (i) => { setMode('tutor'); tutor.open(i); },
      practise: (i) => { topics.go(i); setMode('practice'); fresh(); },
    });
    $('#modes').addEventListener('change', () => {
      if (mode() === 'tutor') { setMode('tutor'); tutor.open(tutor.current()); } else if (mode() === 'check') checkMode(); else practise();
    });
    showScore();
    if (fromHash()) return;
    // First visit: start with the first worked example.
    const last = stored('ma-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
