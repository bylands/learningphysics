(function () {
  'use strict';

  const { generate, KINDS, TASKS, register, rng, quiz, flaw, evaluate, copied, sloped, len } = window.Motion;
  const Concepts = window.Concepts, Quiz = window.Quiz;
  const Plot = window.Plot, { sourceGraph, UNIT, dec } = Plot;
  const Lang = window.Lang, Check = window.Check, L = Lang.L;
  const NARROW = 560;
  const $ = (sel) => document.querySelector(sel);
  const MAX_TRIES = 3;
  const LABEL = { sv: 's → v', va: 'v → a' };

  // ---------------------------------------------------------------- interface texts
  const UI = {
    en: {
      title: 'Slopes of Motion Graphs', mode: 'Mode', difficulty: 'Difficulty', example: 'Example',
      tutor: 'Tutor', practice: 'Practice', checkMode: 'Check', new: 'New exercise',
      tutorNote: 'Use the arrow keys ← → to step through. The piece a step is about is <span class="k-band">highlighted</span> in both graphs; dashed lines are chords (mean values), and short lines tangents.',
      given: 'Given', yours: 'Your graph', answer: 'Answer', sketch: 'Sketch',
      check: 'Check', reset: 'Reset drawing', reveal: 'Show solution', hints: 'Hints', solution: 'Solution',
      revealNote: 'The solution unlocks once you have solved the exercise, used all hints or made three attempts.',
      levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard', mixed: 'Mixed' },
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
      title: 'Steigungen in Bewegungsdiagrammen', mode: 'Modus', difficulty: 'Schwierigkeit', example: 'Beispiel',
      tutor: 'Tutor', practice: 'Üben', checkMode: 'Check', new: 'Neue Aufgabe',
      tutorNote: 'Mit den Pfeiltasten ← → blätterst du weiter. Das Stück, um das es in einem Schritt geht, ist in beiden Graphen <span class="k-band">hervorgehoben</span>; gestrichelte Linien sind Sekanten (Mittelwerte), und kurze Linien Tangenten.',
      given: 'Gegeben', yours: 'Dein Graph', answer: 'Lösung', sketch: 'Skizze',
      check: 'Prüfen', reset: 'Zeichnung zurücksetzen', reveal: 'Lösung zeigen', hints: 'Tipps', solution: 'Lösung',
      revealNote: 'Die Lösung wird freigeschaltet, sobald du die Aufgabe gelöst, alle Tipps genutzt oder drei Versuche gemacht hast.',
      levels: { easy: 'Einfach', medium: 'Mittel', hard: 'Schwierig', mixed: 'Gemischt' },
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
    const s = stored('mg-score', { solved: 0, clean: 0 });
    $('#score').textContent = s.solved ? ui().score(s.solved, s.clean) : '';
  }

  // ---------------------------------------------------------------- names and formatting
  const NAME = () => L({ s: 'position', v: 'velocity', a: 'acceleration' }, { s: 'Ort', v: 'Geschwindigkeit', a: 'Beschleunigung' });
  // “its position”, in German in the accusative
  const its = (q) => L(`its ${NAME()[q]}`, { s: 'seinen Ort', v: 'seine Geschwindigkeit', a: 'seine Beschleunigung' }[q]);
  // “the velocity–time graph”, German “den Graphen der Geschwindigkeit” (accusative)
  const graphOf = (q) => L(`the matching ${NAME()[q]}–time graph`, `den passenden Graphen ${{ s: 'des Orts', v: 'der Geschwindigkeit', a: 'der Beschleunigung' }[q]}`);
  // the mean velocity (or acceleration), with the article; c: the German case (nom, acc, dat)
  const M = (c = 'nom') => L(`the mean ${NAME()[ex.to]}`, `${c === 'dat' ? 'der mittleren' : 'die mittlere'} ${NAME()[ex.to]}`);
  const MB = () => L(`Mean ${NAME()[ex.to]}`, `Mittlere ${NAME()[ex.to]}`);
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
  const indices = (test) => ex.pieces.map((p, i) => i).filter((i) => test(ex.pieces[i], i));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // The text helpers read the exercise from ex; withEx(e, f) runs f for another exercise.
  function withEx(e, f) {
    const saved = ex;
    ex = e;
    try { return f(); } finally { ex = saved; }
  }

  // ---------------------------------------------------------------- the slope: s → v, v → a
  // F is the given graph (G), f the one to draw (g). Parabolas are solved with the mean velocity
  // (or mean acceleration) f̄ = ΔF/Δt: f changes linearly, so f̄ is the mean of f at the start and
  // at the end, and f passes through f̄ in the middle of the piece.
  const BAR = { v: '<i class="bar">v</i>', a: '<i class="bar">a</i>' };
  const mean = (p) => (p.G1 - p.G0) / len(p);
  const paren = (x) => (r2(x) < 0 ? `(${fmt(x)})` : fmt(x));

  // Why f is known at one end of piece i; `withValue` also names the value (in the solution).
  function whyEnd(p, i, end, withValue) {
    const F = Q(ex.from), f = Q(ex.to), t = end === 'start' ? p.t0 : p.t1;
    const why = ex.how[i][end], k = end === 'start' ? i : i + 2;
    if (why === 'vertex' && withValue) return L(`${F} has a horizontal tangent at ${fmt(t)} s, so ${at(ex.to, t)} = 0.`, `${F} hat bei ${fmt(t)} s eine waagrechte Tangente, also ${at(ex.to, t)} = 0.`);
    if (why === 'vertex') return L(`${F} has a horizontal tangent at ${fmt(t)} s: what does that tell you about ${at(ex.to, t)}?`, `${F} hat bei ${fmt(t)} s eine waagrechte Tangente: Was sagt das über ${at(ex.to, t)}?`);
    if (why === 'join' && withValue) {
      const v = sval(end === 'start' ? p.g0 : p.g1, ex.to);
      return L(`${F} joins piece ${k} smoothly at ${fmt(t)} s (no kink), so ${at(ex.to, t)} = ${v}, the same as in piece ${k}.`,
        `${F} geht bei ${fmt(t)} s glatt (ohne Knick) in Stück ${k} über, also ${at(ex.to, t)} = ${v}, gleich wie in Stück ${k}.`);
    }
    if (why === 'join') {
      return L(`${F} joins piece ${k} smoothly at ${fmt(t)} s (no kink), so ${f} has the same value on both sides.`,
        `${F} geht bei ${fmt(t)} s glatt (ohne Knick) in Stück ${k} über, also hat ${f} auf beiden Seiten denselben Wert.`);
    }
    return L(`${at(ex.to, t)} follows from ${M()} ${BAR[ex.to]} = (${at(ex.to, p.t0)} + ${at(ex.to, p.t1)})/2.`,
      `${at(ex.to, t)} folgt aus ${M('dat')} ${BAR[ex.to]} = (${at(ex.to, p.t0)} + ${at(ex.to, p.t1)})/2.`);
  }

  function hintsDiff() {
    const F = Q(ex.from), f = Q(ex.to), fb = BAR[ex.to], ps = ex.pieces;
    const straight = indices((p) => !sloped(p)), curved = indices(sloped);
    const many = (is) => is.length > 1;
    const h1 = L(`${F}(<i>t</i>) has five pieces. ${pieceList(straight)} ${many(straight) ? 'are' : 'is'} straight, so ${f} is constant there. ` +
      `${pieceList(curved)} ${many(curved) ? 'are parabolas' : 'is a parabola'}: there the slope of ${F} changes steadily, so ${f} is a sloped straight line. ` +
      `At every breakpoint, ${F} joins smoothly (no kink), so ${f} does not jump: the ${f} graph is one connected line.`,
    `${F}(<i>t</i>) hat fünf Stücke. ${pieceList(straight)} ${many(straight) ? 'sind' : 'ist'} gerade, also ist ${f} dort konstant. ` +
      `${pieceList(curved)} ${many(curved) ? 'sind Parabeln' : 'ist eine Parabel'}: Dort ändert sich die Steigung von ${F} gleichmässig, also ist ${f} eine schräge Gerade. ` +
      `An jeder Übergangsstelle geht ${F} glatt (ohne Knick) weiter, also springt ${f} nicht: Der ${f}-Graph ist eine zusammenhängende Linie.`);
    const plan = curved.map((i) => {
      const p = ps[i], h = ex.how[i];
      const first = h.start === 'mean' ? 'end' : 'start', second = first === 'start' ? 'end' : 'start';
      return `<li>${piece(i + 1)}: ${whyEnd(p, i, first)} ${h[second] === 'mean' ? `${L('Then', 'Dann:')} ${whyEnd(p, i, second)}` : whyEnd(p, i, second)}</li>`;
    });
    const h2 = L(`${f} is the slope of the ${F}(<i>t</i>) graph. In every piece, ${M()} is ${fb} = Δ${F}/Δ<i>t</i>. In a straight piece, ${f} = ${fb}. ` +
      `In a parabola, ${f} changes linearly, so ${fb} is the mean of ${f} at the start and at the end (and ${f} = ${fb} in the middle of the piece). ` +
      `Read ${f} at the end where you can (a horizontal tangent, or the smooth join to a piece you know), then get the other end from ${fb}:`,
    `${f} ist die Steigung des ${F}(<i>t</i>)-Graphen. In jedem Stück ist ${M()} ${fb} = Δ${F}/Δ<i>t</i>. In einem geraden Stück ist ${f} = ${fb}. ` +
      `In einer Parabel ändert sich ${f} linear, also ist ${fb} der Mittelwert von ${f} am Anfang und am Ende (und in der Mitte des Stücks ist ${f} = ${fb}). ` +
      `Lies ${f} an dem Ende ab, wo das geht (eine waagrechte Tangente oder der glatte Übergang zu einem bekannten Stück), und bestimme dann das andere Ende aus ${fb}:`) +
      `<ul>${plan.join('')}</ul>`;
    const formulas = ps.map((p, i) => {
      const dF = `(${at(ex.from, p.t1)} − ${at(ex.from, p.t0)}) / ${len(p)} s`;
      if (!sloped(p)) return `<li>${piece(i + 1)}: ${f} = ${fb} = ${dF}</li>`;
      const known = ex.how[i].start === 'mean' ? 'end' : 'start', other = known === 'start' ? p.t1 : p.t0;
      return `<li>${piece(i + 1)}: ${fb} = ${dF}, ${L('then', 'dann')} ${at(ex.to, other)} = 2 · ${fb} − ${at(ex.to, known === 'start' ? p.t0 : p.t1)}</li>`;
    });
    const h3 = `${L('Formulas, piece by piece:', 'Formeln, Stück für Stück:')}<ul>${formulas.join('')}</ul>`;
    const avgs = ps.map((p, i) => `${L('piece', 'Stück')} ${i + 1}: ${sval(mean(p), ex.to)}`);
    const h4 = L(`${MB()} ${fb} per piece: ${and(avgs)}. In a straight piece, this is ${f}; in a parabola, it is ${f} in the middle of the piece, halfway between the start and end values.`,
      `${MB()} ${fb} pro Stück: ${and(avgs)}. In einem geraden Stück ist das ${f}; in einer Parabel ist es ${f} in der Mitte des Stücks, halbwegs zwischen Anfangs- und Endwert.`);
    return [h1, h2, h3, h4];
  }

  function describeDiff(p, i) {
    const F = Q(ex.from), f = Q(ex.to), fb = BAR[ex.to], dF = p.G1 - p.G0, T = len(p), m = mean(p);
    const head = `<b>${piece(i + 1)} (${when(p)})</b>: `;
    const meanIs = `${fb} = Δ${F}/Δ<i>t</i> = ${sval(dF, ex.from)} / ${T} s = ${sval(m, ex.to)}`;
    if (!sloped(p)) {
      if (p.g0 === 0) {
        return head + L(`${F} stays at ${val(p.G0, ex.from)}${ex.from === 's' ? ' (the body is at rest)' : ' (the velocity is constant)'}, so ${f} = 0.`,
          `${F} bleibt bei ${val(p.G0, ex.from)}${ex.from === 's' ? ' (der Körper ist in Ruhe)' : ' (die Geschwindigkeit ist konstant)'}, also ${f} = 0.`);
      }
      return head + L(`${F} changes steadily from ${val(p.G0, ex.from)} to ${val(p.G1, ex.from)}, so ${f} is constant and equal to ${M()}: ${f} = ${meanIs}.`,
        `${F} ändert sich gleichmässig von ${val(p.G0, ex.from)} auf ${val(p.G1, ex.from)}, also ist ${f} konstant und gleich ${M('dat')}: ${f} = ${meanIs}.`);
    }
    const tm = (p.t0 + p.t1) / 2, up = p.g1 > p.g0;
    const out = head + L(`${F} is a parabola (it curves ${up ? 'upward' : 'downward'}), so ${f} changes linearly. ${cap(M())} is ${meanIs}. ` +
      `Because ${f} changes linearly, ${fb} is the mean of the start and end values, ${fb} = (${at(ex.to, p.t0)} + ${at(ex.to, p.t1)})/2, and ${f} = ${fb} in the middle of the piece, at ${fmt(tm)} s. `,
    `${F} ist eine Parabel (sie krümmt sich nach ${up ? 'oben' : 'unten'}), also ändert sich ${f} linear. ${cap(M())} ist ${meanIs}. ` +
      `Weil sich ${f} linear ändert, ist ${fb} der Mittelwert von Anfangs- und Endwert, ${fb} = (${at(ex.to, p.t0)} + ${at(ex.to, p.t1)})/2, und in der Mitte des Stücks, bei ${fmt(tm)} s, ist ${f} = ${fb}. `);
    const h = ex.how[i];
    if (h.start !== 'mean' && h.end !== 'mean') {
      return out + `${whyEnd(p, i, 'start', true)} ${whyEnd(p, i, 'end', true)} ${L('Check', 'Kontrolle')}: (${plus(p.g0, p.g1)})/2 ${UNIT[ex.to]} = ${sval(m, ex.to)} = ${fb}.`;
    }
    const known = h.start === 'mean' ? 'end' : 'start';
    const [tk, vk, to, vo] = known === 'start' ? [p.t0, p.g0, p.t1, p.g1] : [p.t1, p.g1, p.t0, p.g0];
    return out + `${whyEnd(p, i, known, true)} ${L('So', 'Also')} ${at(ex.to, to)} = 2 · ${fb} − ${at(ex.to, tk)} = 2 · ${paren(m)} − ${paren(vk)} = ${sval(vo, ex.to)}.`;
  }

  function whyDiff(code, p, i) {
    const F = Q(ex.from), f = Q(ex.to), fb = BAR[ex.to];
    switch (code) {
      case 'sign': return L(`Check the sign: where ${F} increases, ${f} is positive; where it decreases, ${f} is negative.`,
        `Achte auf das Vorzeichen: Wo ${F} zunimmt, ist ${f} positiv; wo ${F} abnimmt, ist ${f} negativ.`);
      case 'notConst': return L(`${F} is a straight line here: does its slope change along the piece, and what does that mean for the shape of ${f}?`,
        `${F} ist hier eine Gerade: Ändert sich ihre Steigung im Lauf des Stücks, und was bedeutet das für die Form von ${f}?`);
      case 'value': return p.g0 === 0
        ? L(`${F} is horizontal here${ex.from === 's' ? ' (the body is at rest)' : ''}: what slope does that mean, and so what value of ${f}?`, `${F} ist hier waagrecht${ex.from === 's' ? ' (der Körper ist in Ruhe)' : ''}: Welche Steigung bedeutet das, und also welcher Wert von ${f}?`)
        : L(`${f} is constant here, but check its value: ${f} equals ${M()} ${fb} = Δ${F}/Δ<i>t</i>. Read the change of ${F} and the duration of the piece from the graph.`,
          `${f} ist hier konstant, aber prüfe den Wert: ${f} ist gleich ${M('dat')} ${fb} = Δ${F}/Δ<i>t</i>. Lies die Änderung von ${F} und die Dauer des Stücks am Graphen ab.`);
      case 'average': return L(`You drew ${M()} ${fb} = Δ${F}/Δ<i>t</i> for the whole piece. But ${F} is curved here: is its slope the same all along the piece?`,
        `Du hast ${M('acc')} ${fb} = Δ${F}/Δ<i>t</i> für das ganze Stück gezeichnet. Aber ${F} ist hier gekrümmt: Ist seine Steigung im ganzen Stück gleich?`);
      case 'notLinear': return L(`${F} is curved here: does its slope stay the same along the piece, and what does that mean for ${f}?`,
        `${F} ist hier gekrümmt: Bleibt seine Steigung im Lauf des Stücks gleich, und was bedeutet das für ${f}?`);
      case 'direction': return L(`Does ${F} curve upward or downward in this piece? So does its slope, ${f}, increase or decrease?`,
        `Krümmt sich ${F} in diesem Stück nach oben oder nach unten? Nimmt seine Steigung ${f} also zu oder ab?`);
      case 'start': case 'end': return `${L(`The value at the ${code} of the piece is off.`, `Der Wert am ${code === 'start' ? 'Anfang' : 'Ende'} des Stücks stimmt nicht.`)} ${whyEnd(p, i, code)}`;
      default: return `${L(`Both end values are off: ${f} is the slope of the tangent to ${F} at the start and at the end of the piece, and their mean is ${M()} ${fb} = Δ${F}/Δ<i>t</i>.`,
        `Beide Endwerte stimmen nicht: ${f} ist die Steigung der Tangente an ${F} am Anfang und am Ende des Stücks, und ihr Mittelwert ist ${M()} ${fb} = Δ${F}/Δ<i>t</i>.`)} ${whyEnd(p, i, ex.how[i].start === 'mean' ? 'end' : 'start')}`;
    }
  }

  // The drawing (or a check option) has the shape of the given graph.
  function copiedText(start) {
    const F = Q(ex.from), f = Q(ex.to);
    return start + ' ' + L(`But ${f} is the <em>slope</em> of ${F}, not its value: where ${F} is large but constant, ${f} = 0.`,
      `Aber ${f} ist die <em>Steigung</em> von ${F}, nicht sein Wert: Wo ${F} gross, aber konstant ist, ist ${f} = 0.`);
  }

  // ---------------------------------------------------------------- exercise text
  const taskTitle = (e) => `${LABEL[e.task]}: ${L('from a graph to its slope', 'vom Graphen zu seiner Steigung')}`;
  function statement() {
    const { from, to } = ex;
    return L(`A body moves along a straight line. The graph shows ${its(from)} ${Q(from)}(<i>t</i>), made of straight and parabolic pieces. Draw ${graphOf(to)} ${Q(to)}(<i>t</i>).`,
      `Ein Körper bewegt sich auf einer Geraden. Der Graph zeigt ${its(from)} ${Q(from)}(<i>t</i>), zusammengesetzt aus geraden und parabelförmigen Stücken. Zeichne ${graphOf(to)} ${Q(to)}(<i>t</i>).`);
  }
  function howTo() {
    const q = Q(ex.to);
    return L(`Drag the dots at the breakpoints to set ${q} there, or drag the line of a piece to move both of its ends.`,
      `Zieh die Punkte an den Übergangsstellen, um ${q} dort festzulegen, oder zieh die Linie eines Stücks, um beide Enden zu verschieben.`) +
      L(' Keyboard: Tab to the graph, ←/→ choose a point, ↑/↓ move it.', ' Tastatur: Mit Tab zum Graphen, ←/→ wählt einen Punkt, ↑/↓ verschiebt ihn.');
  }

  const ruleText = () => {
    const F = Q(ex.from), f = Q(ex.to);
    return L(`${f} is the slope of the ${F}(<i>t</i>) graph: constant where ${F} is straight, a sloped straight line where ${F} is a parabola. ${F} has no kinks, so ${f} does not jump.`,
      `${f} ist die Steigung des ${F}(<i>t</i>)-Graphen: konstant, wo ${F} gerade ist, eine schräge Gerade, wo ${F} eine Parabel ist. ${F} hat keine Knicke, also springt ${f} nicht.`);
  };

  const describe = describeDiff;
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
    el.setAttribute('aria-label', L(`Graph of ${NAME()[ex.to]} against time to draw. Handles at the breakpoints. Use the arrow keys.`,
      `Zu zeichnender Graph ${{ s: 'des Orts', v: 'der Geschwindigkeit', a: 'der Beschleunigung' }[ex.to]} gegen die Zeit. Griffe an den Übergangsstellen. Mit den Pfeiltasten bedienbar.`));
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
    const items = st.res.map((r, i) => (r.ok ? '' : `<li><b>${piece(i + 1)} (${when(ex.pieces[i])})</b>: ${r.codes.map((c) => whyDiff(c, ex.pieces[i], i)).join(' ')}</li>`));
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
  const hintsOf = () => (isQuiz() ? ex.hints : hintsDiff());

  // Practice comes back more often to the types of exercise that were hard (shared practice.js).
  const PRACTICE = 'mg', typeOf = (e) => e.kind || e.task;
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
  // an exercise of a practice type: a task (sv, …) or a kind of question with its difficulty (compare:2)
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
        const s = stored('mg-score', { solved: 0, clean: 0 });
        s.solved++;
        if (st.tries === 1 && st.hints === 0) s.clean++;
        store('mg-score', s);
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
          const s = stored('mg-score', { solved: 0, clean: 0 });
          s.solved++;
          if (st.tries === 1 && st.hints === 0) s.clean++;
          store('mg-score', s);
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
  // A student's sketch of v(t) for a given s(t) (or of a(t) for a given v(t)) with one piece wrong
  // (flaw() in generator.js): which piece is wrong, and what is wrong with it. An exercise like
  // those of concepts.js (answered with quiz.js), made here because it uses the texts of the
  // drawing exercises. Its graphs are drawn narrow, to fit side by side.
  const FLAW_TEXT = {
    height: () => L(`It shows the value of ${Q(ex.from)}, not its slope.`, `Es zeigt den Wert von ${Q(ex.from)}, nicht seine Steigung.`),
    sign: () => L('Its sign is wrong.', 'Sein Vorzeichen ist falsch.'),
    average: () => L(`It is constant at the mean value ${BAR[ex.to]}, but ${Q(ex.to)} changes in this piece.`, `Es ist konstant beim Mittelwert ${BAR[ex.to]}, aber ${Q(ex.to)} ändert sich in diesem Stück.`),
    direction: () => L(`${Q(ex.to)} changes the wrong way.`, `${Q(ex.to)} ändert sich in die falsche Richtung.`),
    curve: () => L(`It is curved, but ${Q(ex.to)} changes linearly here.`, `Es ist gekrümmt, aber ${Q(ex.to)} ändert sich hier linear.`),
    value: () => L(`It starts or ends at the wrong value: not the slope of ${Q(ex.from)} there.`, `Es beginnt oder endet beim falschen Wert: nicht bei der Steigung von ${Q(ex.from)} dort.`),
  };
  // why a mistake c that was chosen does not describe the wrong piece (without naming the right one)
  function notWhy(c) {
    const F = Q(ex.from), f = Q(ex.to);
    return `${L('That is not the mistake in this piece:', 'Das ist nicht der Fehler in diesem Stück:')} ${{
      height: L(`it does not show the value of ${F}.`, `Es zeigt nicht den Wert von ${F}.`),
      sign: L('its sign is right.', 'Sein Vorzeichen stimmt.'),
      average: L('it is not constant at the mean value.', 'Es ist nicht konstant beim Mittelwert.'),
      direction: L(`${f} does not change the wrong way.`, `${f} ändert sich nicht in die falsche Richtung.`),
      curve: L('it is not curved where it should be straight.', 'Es ist nicht gekrümmt, wo es gerade sein sollte.'),
      value: L('it is not just a wrong value at the start or the end.', 'Es ist nicht bloss ein falscher Wert am Anfang oder am Ende.'),
    }[c]}`;
  }
  // what the sketch shows in its wrong piece p, and why that is wrong
  function flawWhy(code, p) {
    const F = Q(ex.from), f = Q(ex.to), fb = BAR[ex.to], up = p.g1 > p.g0;
    switch (code) {
      case 'height': return L(`The sketch copies the value of ${F} in this piece instead of its slope. But ${f} is how steep the ${F}(<i>t</i>) graph is, not how high it lies.`,
        `Die Skizze übernimmt in diesem Stück den Wert von ${F} statt seiner Steigung. ${f} ist aber, wie steil der ${F}(<i>t</i>)-Graph ist, nicht wie hoch er liegt.`);
      case 'sign': return `${L('The sketch has the wrong sign here.', 'Die Skizze hat hier das falsche Vorzeichen.')} ${whyDiff('sign', p)}`;
      case 'average': return L(`The sketch shows the mean value ${fb} = Δ${F}/Δ<i>t</i> for the whole piece. But ${F} is curved here, so ${f} changes steadily: it equals ${fb} only in the middle of the piece.`,
        `Die Skizze zeigt den Mittelwert ${fb} = Δ${F}/Δ<i>t</i> für das ganze Stück. ${F} ist hier aber gekrümmt, also ändert sich ${f} gleichmässig: Es ist nur in der Mitte des Stücks gleich ${fb}.`);
      case 'value': {
        const first = p.t0 === 0, t = first ? p.t0 : p.t1, y = first ? p.g0 : p.g1;
        return L(`The sketch ${first ? 'starts' : 'ends'} at the wrong value. At ${fmt(t)} s, the tangent to the ${F}(<i>t</i>) graph has the slope ${val(y, ex.to)}, so ${f}(${fmt(t)} s) = ${val(y, ex.to)}.${sloped(p) ? '' : ` In this piece ${F} is a straight line, so ${f} is constant.`}`,
          `Die Skizze ${first ? 'beginnt' : 'endet'} beim falschen Wert. Bei ${fmt(t)} s hat die Tangente an den ${F}(<i>t</i>)-Graphen die Steigung ${val(y, ex.to)}, also ist ${f}(${fmt(t)} s) = ${val(y, ex.to)}.${sloped(p) ? '' : ` In diesem Stück ist ${F} eine Gerade, also ist ${f} konstant.`}`);
      }
      case 'curve': return L(`The sketch is curved in this piece, like the ${F}(<i>t</i>) graph. But ${F} is a parabola here, so its slope ${f} changes at a steady rate: the ${f}(<i>t</i>) graph is a straight line.`,
        `Die Skizze ist in diesem Stück gekrümmt, wie der ${F}(<i>t</i>)-Graph. ${F} ist hier aber eine Parabel, also ändert sich seine Steigung ${f} gleichmässig: Der ${f}(<i>t</i>)-Graph ist eine Gerade.`);
      default: return L(`In the sketch, ${f} ${up ? 'decreases' : 'increases'} in this piece. But ${F} curves ${up ? 'upward' : 'downward'} here: its slope ${up ? 'increases' : 'decreases'}, and so does ${f}.`,
        `In der Skizze nimmt ${f} in diesem Stück ${up ? 'ab' : 'zu'}. ${F} krümmt sich hier aber nach ${up ? 'oben' : 'unten'}: Seine Steigung nimmt ${up ? 'zu' : 'ab'}, und damit auch ${f}.`);
    }
  }
  function errorEx(seed) {
    const r = rng(seed), e = generate(r.next() < 0.7 ? 'sv' : 'va', seed), f = flaw(e, seed), i = f.piece, p = e.pieces[i];
    return withEx(e, () => narrowed(() => {
      const F = Q(e.from), g = Q(e.to);
      const sketch = (o = {}) => Plot.answerGraph(e, { vals: f.vals, ...o });
      const fig = (given, drawn) => `<div class="tgraphs"><div><h3>${ui().given}: ${qc(e.from)}</h3><div class="plot">${given}</div></div>` +
        `<div><h3>${ui().sketch}: ${qc(e.to)}</h3><div class="plot">${drawn}</div></div></div>`;
      const marks = e.pieces.map((x, k) => (k === i ? 'focus' : ''));
      const right = (k) => describe(e.pieces[k], k).replace(/^<b>[^<]*<\/b>: /, '');
      const questions = [
        { type: 'choice', key: 'piece', prompt: L('Which piece of the sketch is wrong?', 'Welches Stück der Skizze ist falsch?'),
          options: e.pieces.map((x, k) => ({ html: `${piece(k + 1)} (${when(x)})`, correct: k === i, flag: null, why: k === i ? '' : `${L(`${piece(k + 1)} is right:`, `${piece(k + 1)} stimmt:`)} ${right(k)}` })) },
        { type: 'choice', key: 'what', prompt: L('What is wrong with it?', 'Was ist daran falsch?'),
          options: window.Motion.FLAWS.map((c) => ({ html: FLAW_TEXT[c](), correct: c === f.code, flag: null, why: c === f.code ? '' : notWhy(c) })) },
      ];
      return {
        kind: 'error', id: `error-${seed}`, seed, difficulty: 4, flaw: f,
        title: L('Find the error', 'Finde den Fehler'),
        text: L(`<p>A body moves along a straight line. The given graph shows ${its(e.from)} ${F}(<i>t</i>). A student sketched ${graphOf(e.to)} ${g}(<i>t</i>) for it; one of its five pieces is wrong.</p>`,
          `<p>Ein Körper bewegt sich auf einer Geraden. Der gegebene Graph zeigt ${its(e.from)} ${F}(<i>t</i>). Eine Schülerin hat dazu ${graphOf(e.to)} ${g}(<i>t</i>) skizziert; eines der fünf Stücke ist falsch.</p>`),
        figure: fig(sourceGraph(e), sketch()),
        questions,
        hints: [
          ruleText(),
          L(`Check the sketch piece by piece: is ${g} constant where ${F} is straight, and a sloped line where ${F} curves? Does its sign match whether ${F} rises or falls? Is its value the slope of ${F}, not its height?`,
            `Prüfe die Skizze Stück für Stück: Ist ${g} konstant, wo ${F} gerade ist, und eine schräge Gerade, wo ${F} gekrümmt ist? Passt das Vorzeichen dazu, ob ${F} steigt oder fällt? Ist der Wert die Steigung von ${F}, nicht seine Höhe?`),
          L(`${piece(i + 1)} (${when(p)}) is wrong.`, `${piece(i + 1)} (${when(p)}) ist falsch.`),
        ],
        steps: [
          { title: L('Piece by piece', 'Stück für Stück'), text: `${ruleText()} ${L(`Compare each piece of the sketch with the slope of the ${F}(<i>t</i>) graph.`, `Vergleiche jedes Stück der Skizze mit der Steigung des ${F}(<i>t</i>)-Graphen.`)}`, figure: fig(sourceGraph(e), sketch()) },
          { title: `${piece(i + 1)} (${when(p)})`, text: `${flawWhy(f.code, p)} ${L('Right', 'Richtig')}: ${right(i)}`, figure: fig(sourceGraph(e, { marks }), sketch({ marks })) },
          { title: L('The right graph', 'Der richtige Graph'), text: f.code === 'curve'
            ? L(`The other pieces of the sketch are right. With ${piece(i + 1).toLowerCase()} corrected, ${g}(<i>t</i>) is straight in every piece where ${F} is a parabola.`, `Die anderen Stücke der Skizze stimmen. Mit korrigiertem ${piece(i + 1)} ist ${g}(<i>t</i>) in jedem Stück gerade, in dem ${F} eine Parabel ist.`)
            : f.edge ? L(`The other pieces of the sketch are right. The wrong piece joined its neighbour without a jump: a sketch in one line can still be wrong, so check every piece, the first and the last included.`, `Die anderen Stücke der Skizze stimmen. Das falsche Stück schloss ohne Sprung an seinen Nachbarn an: Auch eine zusammenhängende Skizze kann falsch sein, also prüfe jedes Stück, auch das erste und das letzte.`)
            : L(`The other pieces of the sketch are right. With ${piece(i + 1).toLowerCase()} corrected, ${g}(<i>t</i>) is one connected line again.`, `Die anderen Stücke der Skizze stimmen. Mit korrigiertem ${piece(i + 1)} ist ${g}(<i>t</i>) wieder eine zusammenhängende Linie.`), figure: fig(sourceGraph(e), Plot.answerGraph(e, { marks })) },
        ],
        answers: questions.map((q) => q.options.find((o) => o.correct).html),
      };
    }));
  }
  register('error', { difficulties: [4], make: (seed) => errorEx(seed) });

  // ---------------------------------------------------------------- tutor
  // Worked examples: the exercises of concepts.js and find the error with their worked steps, and
  // the drawing task s → v piece by piece: the piece is highlighted in both graphs, with the
  // chord of the given graph (its mean slope) and, for a parabola, the tangents at its ends.
  const LESSONS = [
    { name: () => L('Faster', 'Schneller'), kind: 'compare', d: 2, seed: 1, practice: [{ types: ['compare:1', 'compare:2'] }],
      idea: () => L('The speed is the steepness of the s(t) graph, not its height; a falling graph means motion in the negative direction.',
        'Die Geschwindigkeit ist die Steilheit des s(t)-Graphen, nicht seine Höhe; ein fallender Graph bedeutet Bewegung in negativer Richtung.') },
    { name: () => L('Direction', 'Richtung'), kind: 'direction', d: 2, seed: 1, practice: [{ types: ['direction:2'] }],
      idea: () => L('The sign of v is the direction of motion: negative where s decreases, wherever the graph lies.',
        'Das Vorzeichen von v ist die Bewegungsrichtung: negativ, wo s abnimmt, egal wo der Graph liegt.') },
    { name: () => L('Value table', 'Wertetabelle'), kind: 'table', d: 2, seed: 1, practice: [{ types: ['table:2'] }],
      idea: () => L('In a value table, the direction shows in the changes from one time to the next, not in the signs of the positions.',
        'In einer Wertetabelle zeigt sich die Richtung in den Änderungen von einem Zeitpunkt zum nächsten, nicht in den Vorzeichen der Orte.') },
    { name: 's → v', task: 'sv', seed: 17, practice: [{ types: ['sv'] }, { name: () => L('from v to a', 'von v zu a'), types: ['va'] }],
      idea: () => L('The velocity is the slope of the position graph: read it piece by piece, from straight lines and from the tangents to the curves.',
        'Die Geschwindigkeit ist die Steigung des Ort-Zeit-Graphen: Lies sie Stück für Stück ab, an Geraden und an den Tangenten der Kurven.') },
    { name: () => L('Matching graphs', 'Graphen zuordnen'), kind: 'match', d: 4, seed: 1, practice: [{ types: ['match:2'] }, { name: () => L('from v to a', 'von v zu a'), types: ['match:3'] }, { name: () => L('from s to a', 'von s zu a'), types: ['match:4'] }],
      idea: () => L('v(t) is the slope of s(t), and a(t) the slope of v(t): a uniform acceleration is a parabola in s(t), a sloped straight line in v(t) and a horizontal line in a(t).',
        'v(t) ist die Steigung von s(t), und a(t) die Steigung von v(t): Eine gleichmässige Beschleunigung ist eine Parabel in s(t), eine schräge Gerade in v(t) und eine waagrechte Gerade in a(t).') },
    { name: () => L('Find the error', 'Finde den Fehler'), kind: 'error', d: 4, seed: 2, practice: [{ types: ['error'] }],
      idea: () => L('A sketch of v(t) is checked piece by piece against the slope of s(t): constant where s is straight, sloped where s curves, with the sign of the slope and not the height of s.',
        'Eine Skizze von v(t) prüft man Stück für Stück an der Steigung von s(t): konstant, wo s gerade ist, schräg, wo s gekrümmt ist, mit dem Vorzeichen der Steigung und nicht der Höhe von s.') },
  ];
  const bar = (q) => `${q}̄`; // q with a bar: the mean value
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
        const tm = (p.t0 + p.t1) / 2, m = (p.G1 - p.G0) / len(p);
        const over = (s) => Tut.chord(s, p.t0, p.G0, p.t1, p.G1) + Tut.dot(s, p.t0, p.G0) + Tut.dot(s, p.t1, p.G1) +
          (sloped(p) ? Tut.tangent(s, p.t0, p.G0, p.g0) + Tut.tangent(s, p.t1, p.G1, p.g1) : '') +
          Tut.tag(s, tm, (p.G0 + p.G1) / 2, `${sloped(p) ? bar(g) : g} = ${num(m)} ${UNIT[g]}`, m >= 0 ? 'left' : 'right');
        const ans = (s) => Tut.dot(s, p.t0, p.g0) + Tut.dot(s, p.t1, p.g1) +
          (sloped(p) ? Tut.dot(s, tm, m, 'mean') + Tut.tag(s, tm, m, bar(g), p.g1 > p.g0 ? 'left' : 'right') : '') +
          Tut.tag(s, p.t1, p.g1, num(p.g1), p.g1 >= p.g0 ? 'above' : 'below');
        const text = describe(p, i).replace(/^<b>[^<]*<\/b>: /, '');
        frames.push({
          text: `<p class="step-rule">${L(`Piece ${i + 1} of ${n}`, `Stück ${i + 1} von ${n}`)} (${when(p)})</p><p>${text}</p>`,
          figure: pairFigure(e, sourceGraph(e, { marks: marks(i), overlay: over }), Plot.answerGraph(e, { upto: i + 1, marks: marks(i), overlay: ans }), true),
        });
      });
      const F = Q(e.from), G = Q(g);
      const check = L(`Check: where ${F} has a horizontal tangent, ${G} = 0; where ${F} rises, ${G} &gt; 0; where it falls, ${G} &lt; 0.`,
        `Kontrolle: Wo ${F} eine waagrechte Tangente hat, ist ${G} = 0; wo ${F} steigt, ist ${G} &gt; 0; wo ${F} fällt, ist ${G} &lt; 0.`);
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
  // worked example and its practice topic. A drawing task (sv, va) shows the given graph and four
  // graphs to choose from (quiz() in generator.js); find the error asks for the wrong piece of a
  // sketch; the other kinds ask one question of an exercise of concepts.js, with four options.
  const OBJECTIVES = [
    { id: 'slope', kinds: ['compare:1', 'compare:2'], tutor: 0, topic: 0,
      name: () => L('Read a velocity as the slope of the s(t) graph, not as its height.', 'Eine Geschwindigkeit als Steigung des s(t)-Graphen lesen, nicht als seine Höhe.') },
    { id: 'negative', kinds: ['direction:2', 'table:2'], tutor: 1, topic: 1,
      name: () => L('Recognise a negative velocity in a falling s(t) graph or in decreasing positions in a value table.', 'Eine negative Geschwindigkeit an einem fallenden s(t)-Graphen oder an abnehmenden Orten in einer Wertetabelle erkennen.') },
    { id: 'sketch', kinds: ['sv', 'va', 'match:2', 'error'], tutor: 3, topic: 3,
      name: () => L('Sketch v(t) from s(t), and a(t) from v(t), and find the error in such a sketch.', 'v(t) aus s(t) und a(t) aus v(t) skizzieren und den Fehler in einer solchen Skizze finden.') },
    { id: 'uniform', kinds: ['match:3', 'match:4'], tutor: 4, topic: 4,
      name: () => L('Recognise a uniform acceleration as a straight line in v(t) and as a parabola in s(t).', 'Eine gleichmässige Beschleunigung als Gerade im v(t)-Diagramm und als Parabel im s(t)-Diagramm erkennen.') },
  ];
  // The graphs are drawn narrow, to fit two side by side.
  function narrowed(f) {
    const wide = Plot.W >= 640;
    Plot.setNarrow(true);
    try { return f(); } finally { Plot.setNarrow(!wide); }
  }
  // What a wrong graph shows, by its flag (quiz() in generator.js).
  function graphWhy(flag) {
    const F = Q(ex.from), f = Q(ex.to), fb = BAR[ex.to];
    if (flag === 'copy') return copiedText(L('This graph has the shape of the given one.', 'Dieser Graph hat die Form des gegebenen.'));
    if (flag === 'sign') return whyDiff('sign');
    return L(`This graph shows ${M()} ${fb} = Δ${F}/Δ<i>t</i> for each whole piece. But where ${F} is curved, ${f} changes steadily: it equals ${fb} only in the middle of the piece.`,
      `Dieser Graph zeigt für jedes ganze Stück ${M('acc')} ${fb} = Δ${F}/Δ<i>t</i>. Aber wo ${F} gekrümmt ist, ändert sich ${f} gleichmässig: Es ist nur in der Mitte des Stücks gleich ${fb}.`);
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
    const [k, d] = kind.split(':');
    if (TASKS[k]) return graphQuestion(k, seed);
    if (k === 'error') return errorQuestion(seed);
    const e = KINDS[k].make(seed, Number(d)), a = Concepts.question(e, seed);
    return {
      title: e.title, text: e.text, figure: e.figure.startsWith('<div') ? e.figure : `<figure class="fig">${e.figure}</figure>`, ask: a.ask,
      options: a.options.map((o) => ({ html: o.html, correct: o.correct, flag: o.correct ? null : o.flag, why: o.correct ? '' : o.why })),
      explain: () => `<div class="steps">${stepsHtml(e)}</div>`,
    };
  }
  const IDEAS = ['position', 'magnitude', 'crossing', 'below', 'negpos', 'nodt', 'origin', 'value', 'skip'];
  const checkSource = {
    id: 'mg',
    objectives: OBJECTIVES,
    question: checkQuestion,
    concept: { copy: 'copy', sign: 'sign', average: 'mean', ...Object.fromEntries(IDEAS.map((f) => [f, f])) },
    concepts: () => ({
      ...Object.fromEntries(IDEAS.map((f) => [f, Concepts.FLAGS[f]()])),
      copy: L('the value instead of the slope', 'der Wert statt der Steigung'),
      sign: L('the sign', 'das Vorzeichen'),
      mean: L('the mean value for a whole piece', 'der Mittelwert für ein ganzes Stück'),
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
      ex = topics.parse(id) || generate(old[1], Number(old[2])); // links of earlier versions name a kind
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
    store('mg-mode', m);
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
    // the arcade of earlier versions is now the check
    if (h === 'check' || h === 'arcade') { if ($('#ck').hidden) checkMode(); return true; }
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
    // (older links) a task or kind of this module
    m = h.match(/^(sv|va|compare|direction|table|match|error)-(\d+)$/);
    if (!m) return false;
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
    const last = stored('mg-mode', 'tutor');
    if (last === 'tutor') { setMode('tutor'); tutor.open(0); } else if (last === 'check' || last === 'arcade') checkMode(); else { setMode('practice'); fresh(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
