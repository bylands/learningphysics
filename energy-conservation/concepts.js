// Questions on energy bookkeeping, with four options each: for the check (check.js) and as choice
// exercises in practice. The situations are those of scenarios.js, with symbols; what is asked is
// the bookkeeping, not a result to calculate:
//   bars      which bar chart shows the energy in the states
//   forms     which forms of energy a state has
//   balance   which equation is the energy balance of two states
//   error     a student's energy table with one wrong entry: which
//   scale     a ratio: the compression, the speed or the height n times as large
//   path      lifting work and speed do not depend on the path
//   friction  where the work done by friction goes
//   turn      the turning point of a bungee jump (v = 0) and its equilibrium (largest speed)
//   hang      a block on a spring: the lowest point is twice as far down as the equilibrium
// question(kind, seed) gives { title, text, figure, ask, options: [{ html, correct, flag, why }],
// explain(), hints, motion }, exercise(kind, seed) the same as a practice exercise (motion: the
// situation's exercise, whose animation practice shows once the question is answered, if the
// question is about the situation as it is drawn); CHECK is the source of
// the check (objectives, question, concepts), errorLesson() the frames of the tutor's example.
(function (root) {
  'use strict';

  const EC = root.EC, Energy = root.Energy, { Fig } = root.Draw;
  const { L, rng, pick, CIRCLED, etex } = EC;

  const byId = (id) => Energy.SCENARIOS.find((s) => s.id === id);
  const shuffle = (r, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const kin = (v) => `\\tfrac{1}{2}\\,m\\,${v}^2`;
  const FORMS3 = ['pot', 'kin', 'el'];

  // A situation of scenarios.js with symbols: the exercise, its energies as formulas and values.
  function situation(id, seed) {
    const ex = Energy.generateFor(id, seed, true), scn = byId(id);
    return { ex, scn, p: ex.p, en: scn.energies(ex.p), states: scn.states(ex.p), forms: ex.forms };
  }
  // the situation in words and the zero level, without the question of the exercise
  const zeroNote = (s) => `<p class="note">${L('Zero level of the potential energy', 'Nullniveau der Lageenergie')}: ${s.ex.zero}. ${L('No friction, no air resistance.', 'Ohne Reibung und Luftwiderstand.')}</p>`;
  // the questions of the exercise (what to find, in terms of what) are left out: only the energy is asked
  const ASKS = /^(Find|Give|Gib)\b|\b([Ee]xpress|[Dd]rücke)\b/;
  const situationText = (s) => s.ex.text.replace(/<p class="note">.*?<\/p>/, '').replace(/^<p>|<\/p>$/g, '')
    .split(/(?<=[.?!])\s+(?=[A-Z])/).filter((x) => !/\?$/.test(x) && !ASKS.test(x)).join(' ');
  const prompt = (s) => `<p>${situationText(s)}</p>${zeroNote(s)}`;
  const sum = (e) => FORMS3.filter((k) => e[k]).map((k) => e[k]).join(' + ') || '0';
  // The length of an option as shown, roughly one per letter or symbol (½ counts as three): the
  // right option should not stand out as the longest or the shortest.
  const shown = (html) => {
    let t = html.replace(/<[^>]*>/g, '');
    for (let k = 0; k < 3; k++) t = t.replace(/\\[td]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
    return t.replace(/\\mathrm\{([^{}]*)\}/g, '$1').replace(/\\(left|right)/g, '').replace(/\\[,;!]/g, '')
      .replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}^_$]/g, '').replace(/\s+/g, ' ').trim().length;
  };
  // Three wrong options of a list, so that the right one is the longest, the shortest or in
  // between about equally often: t of them (0 to 3, at random where the list allows) at least as
  // long as the right one, the others shorter.
  function threeByLength(r, right, list, key) {
    const n = shown(right), longer = list.filter((x) => shown(x.html) >= n), rest = list.filter((x) => shown(x.html) < n);
    const t = Math.max(3 - rest.length, Math.min(longer.length, Math.floor(r() * 4)));
    return [...three(r, longer, key).slice(0, t), ...three(r, rest, key).slice(0, 3 - t)];
  }

  // ---------------------------------------------------------------- why a state has a form or not
  // In state i the form k is there (has) or not.
  const reason = {
    kin: (c, has) => (has ? L(`In ${c} the body is moving: it has kinetic energy.`, `In ${c} bewegt sich der Körper: Er hat kinetische Energie.`)
      : L(`In ${c} the body is at rest ($v = 0$, a turning point): it has no kinetic energy.`, `In ${c} ruht der Körper ($v = 0$, ein Umkehrpunkt): Er hat keine kinetische Energie.`)),
    pot: (c, has) => (has ? L(`In ${c} the body is above the zero level: it has potential energy.`, `In ${c} ist der Körper über dem Nullniveau: Er hat Lageenergie.`)
      : L(`In ${c} the body is at the zero level ($h = 0$): it has no potential energy.`, `In ${c} ist der Körper auf dem Nullniveau ($h = 0$): Er hat keine Lageenergie.`)),
    el: (c, has) => (has ? L(`In ${c} the spring is stretched or compressed: it stores elastic energy.`, `In ${c} ist die Feder gedehnt oder gestaucht: Sie speichert Spannenergie.`)
      : L(`In ${c} the spring is relaxed: it stores no elastic energy.`, `In ${c} ist die Feder entspannt: Sie speichert keine Spannenergie.`)),
  };
  // The same as a question, for a wrong answer in practice: what to check in state c, without the
  // verdict (whether the form is there or not).
  const ask = {
    kin: (c) => L(`In ${c}: is the body moving? What does that mean for its kinetic energy?`, `In ${c}: Bewegt sich der Körper? Was heisst das für seine kinetische Energie?`),
    pot: (c) => L(`In ${c}: how high is the body above the zero level? What does that mean for its potential energy?`, `In ${c}: Wie hoch ist der Körper über dem Nullniveau? Was heisst das für seine Lageenergie?`),
    el: (c) => L(`In ${c}: is the spring stretched or compressed? What does that mean for its elastic energy?`, `In ${c}: Ist die Feder gedehnt oder gestaucht? Was heisst das für ihre Spannenergie?`),
    level: (c) => L(`In ${c}: from where do you measure the height? How high is the body above the zero level?`, `In ${c}: Von wo aus misst du die Höhe? Wie hoch ist der Körper über dem Nullniveau?`),
  };
  // the wrong idea of a form put where it is not: kinetic energy at rest, potential energy at the
  // zero level, elastic energy in a relaxed spring; a form left out: forgotten
  const ADDED = { kin: 'rest', pot: 'level', el: 'relaxed' };

  // Wrong entries of the energy table: [{ i, k, tex, flag, why }]. A form that is there is left
  // out (only where the state has another), one that is not is put in (with a formula of another
  // state), and a height is measured from the wrong level (the scenario's slips).
  function slipsOf(s) {
    const out = [];
    s.en.forEach((e, i) => {
      const c = CIRCLED[i], here = s.forms.filter((k) => e[k]);
      s.forms.forEach((k) => {
        if (e[k]) {
          if (here.length > 1) out.push({ i, k, tex: '0', flag: 'forgot', why: reason[k](c, true), nudge: ask[k](c) });
          return;
        }
        const other = s.en.map((x) => x[k]).find(Boolean) || (k === 'kin' ? kin('v') : null);
        if (other) out.push({ i, k, tex: other, flag: ADDED[k], why: reason[k](c, false), nudge: ask[k](c) });
      });
    });
    for (const x of s.scn.slips ? s.scn.slips(s.p) : []) if (x.tex !== s.en[x.i][x.k]) out.push({ ...x, flag: 'level', why: x.why(), nudge: ask.level(CIRCLED[x.i]) });
    return out;
  }
  // Kinetic or elastic energy without the factor ½ or without the square: ½ m v² as m v² or ½ m v.
  function squareSlips(s) {
    const out = [], half = '\\tfrac{1}{2}\\,';
    s.en.forEach((e, i) => ['kin', 'el'].forEach((k) => {
      const t = e[k];
      if (!t || !t.startsWith(half) || !t.endsWith('^2')) return;
      const what = k === 'kin' ? L('kinetic energy', 'kinetische Energie') : L('elastic energy', 'Spannenergie');
      const full = k === 'kin' ? '\\tfrac{1}{2}\\,m\\,v^2' : '\\tfrac{1}{2}\\,k\\,s^2';
      out.push({ i, k, tex: t.slice(half.length), flag: 'half', why: L(`In ${CIRCLED[i]} the factor ½ is missing: the ${what} is $${etex(k)} = ${full}$.`, `In ${CIRCLED[i]} fehlt der Faktor ½: Die ${what} ist $${etex(k)} = ${full}$.`) });
      out.push({ i, k, tex: t.slice(0, -2), flag: 'linear', why: L(`In ${CIRCLED[i]} the square is missing: the ${what} grows with the square, $${etex(k)} = ${full}$.`, `In ${CIRCLED[i]} fehlt das Quadrat: Die ${what} wächst mit dem Quadrat, $${etex(k)} = ${full}$.`) });
    }));
    return out;
  }
  const cellTex = (s, i, k) => s.en[i][k] || '0';
  const withSlip = (s, x) => s.en.map((e, i) => (i === x.i ? { ...e, [x.k]: x.tex === '0' ? null : x.tex } : e));

  // The energy table as HTML: a row per state, a column per form; mark: { i, k } a cell to point out.
  function tableHtml(s, en, mark) {
    const head = s.forms.map((k) => `<th scope="col" class="k-${k}">$${etex(k)}$</th>`).join('');
    const rows = en.map((e, i) => `<tr><th scope="row">${CIRCLED[i]}</th>${s.forms.map((k) => `<td${mark && mark.i === i && mark.k === k ? ' class="mark"' : ''}>$${e[k] || '0'}$</td>`).join('')}</tr>`).join('');
    return `<table class="etable etex"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ---------------------------------------------------------------- bar charts
  // The energy bar charts of the states, as in the solutions, on their own.
  function chart(states, forms) {
    const fig = new Fig(L('Energy bar charts', 'Energie-Balkendiagramme'));
    fig.see(0, 0);
    fig.see(states.length * 120, 0);
    return fig.bars(states, forms).render();
  }
  // Charts with the energy of one state shared out wrongly, the total kept: all of it in a form it
  // does not have, half of it moved there, or all of it in one of two forms it has.
  function wrongCharts(s) {
    const out = [];
    s.states.forEach((st, i) => {
      const c = CIRCLED[i], here = s.forms.filter((k) => (st[k] || 0) > 1e-9), T = here.reduce((a, k) => a + st[k], 0);
      s.forms.filter((k) => !here.includes(k)).forEach((k) => {
        out.push({ i, st: { [k]: T }, flag: ADDED[k], why: `${reason[k](c, false)} ${here.map((x) => reason[x](c, true)).join(' ')}`, nudge: [k, ...here].map((x) => ask[x](c)).join(' ') });
        if (here.length === 1) out.push({ i, st: { [here[0]]: T / 2, [k]: T / 2 }, flag: ADDED[k], why: reason[k](c, false), nudge: ask[k](c) });
      });
      if (here.length > 1) here.forEach((k) => out.push({ i, st: { [k]: T }, flag: 'forgot', why: here.filter((x) => x !== k).map((x) => reason[x](c, true)).join(' '), nudge: here.filter((x) => x !== k).map((x) => ask[x](c)).join(' ') }));
    });
    return out;
  }
  // three of a list, from different states and wrong ideas first
  function three(r, list, key) {
    const pool = shuffle(r, [...list]), picked = [];
    const rounds = [(x) => !picked.some((y) => y.i === x.i || y.flag === x.flag), (x) => !picked.some((y) => y.i === x.i && y.flag === x.flag), () => true];
    for (const ok of rounds) for (const x of pool) if (picked.length < 3 && !picked.some((y) => key(y) === key(x)) && ok(x)) picked.push(x);
    return picked;
  }
  const explainTable = (s, note) => () => `<div class="figs">${s.ex.solutionFigure()}</div>${note ? `<p>${note}</p>` : ''}${tableHtml(s, s.en)}`;
  const andList = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} ${L('and', 'und')} ${a[a.length - 1]}` : a[0]);
  const named = (idx) => andList(idx.map((i) => CIRCLED[i]));
  const allStates = (s) => s.states.map((_, i) => i);
  // what to look at in the states idx of the situation s, with its zero level
  const hintStates = (s, idx) => L(`Zero level: ${s.ex.zero}. Go through ${idx.length > 1 ? 'the states' : 'state'} ${named(idx)} in the drawing: is the body moving (kinetic energy)? Is it above the zero level (potential energy)?${s.scn.spring ? ' Is the spring stretched or compressed (elastic energy)?' : ''}`,
    `Nullniveau: ${s.ex.zero}. Geh ${idx.length > 1 ? 'die Zustände' : 'den Zustand'} ${named(idx)} in der Zeichnung durch: Bewegt sich der Körper (kinetische Energie)? Ist er über dem Nullniveau (Lageenergie)?${s.scn.spring ? ' Ist die Feder gedehnt oder gestaucht (Spannenergie)?' : ''}`);

  const SPRINGS = ['launcher', 'buffer', 'spring-up', 'drop-spring', 'bungee', 'twice', 'spring-hang', 'slope-launch', 'ramp-spring'];
  const ALL = [...SPRINGS, 'fall', 'part-drop', 'ekin-epot', 'incline', 'pendulum', 'ramp', 'tower', 'speed-fraction'];

  function bars(seed) {
    const r = rng(seed), s = situation(pick(r, ALL), seed), opts = three(r, wrongCharts(s), (x) => JSON.stringify([x.i, x.st]));
    const right = { html: chart(s.states, s.forms), correct: true };
    const wrong = opts.map((x) => ({ html: chart(s.states.map((st, i) => (i === x.i ? x.st : st)), s.forms), correct: false, flag: x.flag, why: x.why, nudge: x.nudge }));
    return {
      title: s.ex.title, text: prompt(s), figure: s.ex.figure({}), motion: s.ex,
      ask: L(`Which bar charts show the energy in the states ${CIRCLED.slice(0, s.states.length).join(', ')}?`, `Welche Balkendiagramme zeigen die Energie in den Zuständen ${CIRCLED.slice(0, s.states.length).join(', ')}?`),
      options: shuffle(r, [right, ...wrong]),
      explain: explainTable(s, s.states.map((st, i) => s.forms.filter((k) => (st[k] || 0) > 1e-9).map((k) => reason[k](CIRCLED[i], true)).join(' ')).join(' ')),
      hints: [hintStates(s, allStates(s)), L(`The total energy, the dashed line, is the same in ${named(allStates(s))}: in each chart, check how it is shared out among the forms in every state.`, `Die Gesamtenergie, die gestrichelte Linie, ist in ${named(allStates(s))} gleich: Prüfe in jedem Diagramm, wie sie in jedem Zustand auf die Formen verteilt ist.`)],
    };
  }

  // ---------------------------------------------------------------- forms of one state
  // a set of forms as all three, each zero or not: every option names the same three forms, so
  // that a state with more forms does not give a longer option
  const setName = (set) => FORMS3.map((k) => `$${etex(k)} ${set.includes(k) ? '\\neq' : '='} 0$`).join(', ');
  function forms(seed) {
    const r = rng(seed), s = situation(pick(r, SPRINGS), seed), i = Math.floor(r() * s.states.length), c = CIRCLED[i];
    const has = FORMS3.filter((k) => (s.states[i][k] || 0) > 1e-9);
    // the sets that differ by one form (or two), none empty
    const sets = [];
    for (let m = 1; m < 8; m++) {
      const set = FORMS3.filter((_, j) => m & (1 << j)), diff = FORMS3.filter((k) => set.includes(k) !== has.includes(k));
      if (diff.length) sets.push({ set, diff });
    }
    const near = shuffle(r, sets.filter((x) => x.diff.length === 1)), far = shuffle(r, sets.filter((x) => x.diff.length > 1));
    const wrong = [...near, ...far].slice(0, 3).map(({ set, diff }) => {
      const added = diff.find((k) => set.includes(k));
      return { html: setName(set), correct: false, flag: added ? ADDED[added] : 'forgot', why: diff.map((k) => reason[k](c, has.includes(k))).join(' '), nudge: diff.map((k) => ask[k](c)).join(' ') };
    });
    return {
      title: s.ex.title, text: prompt(s), figure: s.ex.figure({ hl: new Set([i]) }), motion: s.ex,
      ask: L(`Which forms of energy are zero in state ${c}, and which are not?`, `Welche Energieformen sind im Zustand ${c} null, welche nicht?`),
      options: shuffle(r, [{ html: setName(has), correct: true }, ...wrong]),
      explain: explainTable(s, FORMS3.map((k) => reason[k](c, has.includes(k))).join(' ')),
      hints: [hintStates(s, [i])],
    };
  }

  // ---------------------------------------------------------------- the energy balance
  function balance(seed) {
    const r = rng(seed);
    for (let k = 0; ; k++) {
      const s = situation(pick(r, ALL), seed + k), n = s.en.length;
      // initial and final state, or (with three states) another pair
      const [a, b] = n === 3 && r() < 0.35 ? pick(r, [[0, 1], [1, 2]]) : [0, n - 1];
      const eq = (en) => `${sum(en[a])} = ${sum(en[b])}`, right = eq(s.en);
      const cand = [...slipsOf(s), ...squareSlips(s)].filter((x) => x.i === a || x.i === b)
        .map((x) => ({ ...x, eq: eq(withSlip(s, x)) })).filter((x) => x.eq !== right)
        .map((x) => ({ ...x, html: `$${x.eq}$` }));
      const opts = threeByLength(r, `$${right}$`, cand, (x) => x.eq);
      if (opts.length < 3 && k < 50) continue;
      return {
        title: s.ex.title, text: prompt(s), figure: s.ex.figure({ hl: new Set([a, b]) }), motion: s.ex,
        ask: L(`Which equation is the energy balance $E_${a + 1} = E_${b + 1}$?`, `Welche Gleichung ist die Energiebilanz $E_${a + 1} = E_${b + 1}$?`),
        options: shuffle(r, [{ html: `$${right}$`, correct: true }, ...opts.map((x) => ({ html: `$${x.eq}$`, correct: false, flag: x.flag, why: x.why, nudge: x.nudge }))]),
        explain: explainTable(s, L(`Add up the energy of each state and set the sums equal: $${right}$. Only then solve for the wanted quantity, with symbols.`, `Addiere die Energie jedes Zustands und setze die Summen gleich: $${right}$. Erst dann nach der gesuchten Grösse auflösen, mit Symbolen.`)),
        hints: [hintStates(s, [a, b]), L(`Write $E_${a + 1}$ and $E_${b + 1}$ each as the sum of the forms you found, every height measured from the zero level; then compare the options with it term by term.`, `Schreibe $E_${a + 1}$ und $E_${b + 1}$ je als Summe der Formen, die du gefunden hast, jede Höhe ab dem Nullniveau gemessen; vergleiche dann die Optionen Term für Term damit.`)],
      };
    }
  }

  // ---------------------------------------------------------------- find the error
  function error(seed) {
    const r = rng(seed), s = situation(pick(r, ALL), seed), list = slipsOf(s);
    // kinetic energy at a turning point and heights from the wrong level come up more often
    const weighted = list.flatMap((x) => (x.flag === 'rest' || x.flag === 'level' ? [x, x] : [x]));
    const x = pick(r, weighted), en = withSlip(s, x);
    // three right entries, from different states, not all of them zero, and some longer, some
    // shorter than the wrong one (which is not given away by its length)
    const label = (i, k, tex) => `${CIRCLED[i]} $${etex(k)} = ${tex}$`;
    const cells = s.en.flatMap((_, i) => s.forms.map((k) => ({ i, k, html: label(i, k, cellTex(s, i, k)) }))).filter((c) => !(c.i === x.i && c.k === x.k));
    let right = threeByLength(r, label(x.i, x.k, x.tex), cells, (c) => c.html);
    if (right.every((c) => !s.en[c.i][c.k])) right = [...right.slice(0, 2), cells.find((c) => s.en[c.i][c.k] && !right.includes(c))];
    return {
      title: L('Find the error', 'Finde den Fehler'),
      text: `${prompt(s)}<p>${L('A student has filled in this energy table:', 'Ein Schüler hat diese Energietabelle ausgefüllt:')}</p>${tableHtml(s, en)}`,
      figure: s.ex.figure({}), motion: s.ex,
      ask: L('One entry of the table is wrong. Which one?', 'Ein Eintrag der Tabelle ist falsch. Welcher?'),
      options: shuffle(r, [{ html: label(x.i, x.k, x.tex), correct: true },
        ...right.map((c) => ({ html: label(c.i, c.k, cellTex(s, c.i, c.k)), correct: false, flag: 'table', why: reason[c.k](CIRCLED[c.i], !!s.en[c.i][c.k]) }))]),
      explain: () => `<div class="figs">${s.ex.solutionFigure()}</div><p>${L('Wrong', 'Falsch')}: ${label(x.i, x.k, x.tex)}. ${x.why}</p><p>${L('The right table:', 'Die richtige Tabelle:')}</p>${tableHtml(s, s.en, { i: x.i, k: x.k })}`,
      hints: [hintStates(s, allStates(s)), L(`Check the table row by row, ${named(allStates(s))}, against the drawing: is the body moving where the row has kinetic energy, and is each height measured from the zero level?`, `Prüfe die Tabelle Zeile für Zeile, ${named(allStates(s))}, an der Zeichnung: Bewegt sich der Körper, wo die Zeile kinetische Energie hat, und ist jede Höhe ab dem Nullniveau gemessen?`)],
    };
  }

  // ---------------------------------------------------------------- ratios
  const N = { 2: { en: 'twice', de: 'doppelt so' }, 3: { en: 'three times', de: 'dreimal so' } };
  const times = (n) => N[n][EC.getLang()];
  const FACTORS = (n) => [
    { id: 'sq', v: n * n, tex: String(n * n) }, { id: 'lin', v: n, tex: String(n) }, { id: 'root', v: Math.sqrt(n), tex: `\\sqrt{${n}}` },
    { id: 'cube', v: n * n * n, tex: String(n * n * n) }, { id: 'dbl', v: 2 * n, tex: String(2 * n) },
  ];
  // what changes n times, what is asked, the right factor ('sq', 'lin' or 'root') and why
  const SCALE = [
    { what: () => L((n) => `A spring is compressed ${times(n)} as far.`, (n) => `Eine Feder wird ${times(n)} weit zusammengedrückt.`), ask: () => L('By what factor does its elastic energy grow?', 'Um welchen Faktor wächst ihre Spannenergie?'),
      c: 's', w: 'E_{\\mathrm{S}}', eq: 'E_{\\mathrm{S}} = \\tfrac{1}{2}\\,k\\,s^2',
      ans: 'sq', why: (n) => `E_{\\mathrm{S}} = \\tfrac{1}{2}\\,k\\,(${n}s)^2 = ${n * n}\\cdot\\tfrac{1}{2}\\,k\\,s^2` },
    { what: () => L((n) => `A spring launcher is compressed ${times(n)} as far before it shoots the same block across a smooth table.`, (n) => `Ein Federkatapult wird ${times(n)} weit gespannt, bevor es denselben Klotz über einen glatten Tisch schiesst.`), ask: () => L('By what factor does the launch speed grow?', 'Um welchen Faktor wächst die Abschussgeschwindigkeit?'),
      c: 's', w: 'v', eq: '\\tfrac{1}{2}\\,k\\,s^2 = \\tfrac{1}{2}\\,m\\,v^2',
      ans: 'lin', why: (n) => `\\tfrac{1}{2}\\,m\\,v^2 = \\tfrac{1}{2}\\,k\\,s^2 \\;\\Rightarrow\\; v = s\\sqrt{k/m} \\propto s:\\; ${n}s \\to ${n}v` },
    { what: () => L((n) => `A ball is shot straight up by a spring compressed ${times(n)} as far.`, (n) => `Ein Ball wird von einer Feder senkrecht hochgeschossen, die ${times(n)} weit zusammengedrückt ist.`), ask: () => L('By what factor does the height it reaches grow (measured from where it starts)?', 'Um welchen Faktor wächst die Höhe, die er erreicht (ab dem Startpunkt gemessen)?'),
      c: 's', w: 'h', eq: '\\tfrac{1}{2}\\,k\\,s^2 = m\\,g\\,h',
      ans: 'sq', why: (n) => `m\\,g\\,h = \\tfrac{1}{2}\\,k\\,s^2 \\;\\Rightarrow\\; h \\propto s^2:\\; ${n}s \\to ${n * n}h` },
    { what: () => L((n) => `A ball is thrown straight up ${times(n)} as fast.`, (n) => `Ein Ball wird ${times(n)} schnell senkrecht hochgeworfen.`), ask: () => L('By what factor does the height it reaches grow?', 'Um welchen Faktor wächst die Höhe, die er erreicht?'),
      c: 'v_0', w: 'h', eq: '\\tfrac{1}{2}\\,m\\,v_0^2 = m\\,g\\,h',
      ans: 'sq', why: (n) => `m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v_0^2 \\;\\Rightarrow\\; h \\propto v_0^2:\\; ${n}v_0 \\to ${n * n}h` },
    { what: () => L((n) => `A ball is dropped from ${n === 2 ? 'twice' : 'three times'} the height.`, (n) => `Ein Ball wird aus der ${n === 2 ? 'doppelten' : 'dreifachen'} Höhe fallen gelassen.`), ask: () => L('By what factor does its speed at the ground grow?', 'Um welchen Faktor wächst seine Geschwindigkeit am Boden?'),
      c: 'h', w: 'v', eq: 'm\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2',
      ans: 'root', why: (n) => `\\tfrac{1}{2}\\,m\\,v^2 = m\\,g\\,h \\;\\Rightarrow\\; v = \\sqrt{2\\,g\\,h} \\propto \\sqrt{h}:\\; ${n}h \\to \\sqrt{${n}}\\,v` },
    { what: () => L((n) => `A cart runs into a spring buffer ${times(n)} as fast.`, (n) => `Ein Wagen fährt ${times(n)} schnell auf einen Federpuffer.`), ask: () => L('By what factor does the largest compression of the buffer grow?', 'Um welchen Faktor wächst die grösste Stauchung des Puffers?'),
      c: 'v', w: 's', eq: '\\tfrac{1}{2}\\,m\\,v^2 = \\tfrac{1}{2}\\,k\\,s^2',
      ans: 'lin', why: (n) => `\\tfrac{1}{2}\\,k\\,s^2 = \\tfrac{1}{2}\\,m\\,v^2 \\;\\Rightarrow\\; s = v\\sqrt{m/k} \\propto v:\\; ${n}v \\to ${n}s` },
  ];
  function scale(seed) {
    const r = rng(seed), t = pick(r, SCALE), n = pick(r, [2, 3]), all = FACTORS(n), right = all.find((f) => f.id === t.ans);
    const others = shuffle(r, all.filter((f, j) => f.v !== right.v && all.findIndex((g) => g.v === f.v) === j));
    // the wrong idea first: energy proportional to the compression or speed, or the square once too often
    const first = { sq: 'lin', lin: 'sq', root: 'lin' }[t.ans];
    others.sort((a, b) => (b.id === first) - (a.id === first));
    const flag = (f) => (f.id === first ? (t.ans === 'lin' ? 'square' : 'linear') : 'ratio');
    const opt = (f) => L(`$${f.tex}$ times`, `$${f.tex}$-mal`);
    const why = `$${t.why(n)}$`, direct = t.eq.startsWith(`${t.w} =`); // direct: the energy itself is asked
    return {
      title: L('Ratios', 'Verhältnisse'), text: `<p>${t.what()(n)}</p>`, figure: '', ask: t.ask(),
      options: shuffle(r, [{ html: opt(right), correct: true }, ...others.slice(0, 3).map((f) => ({ html: opt(f), correct: false, flag: flag(f), why: L(`The energy grows with the square of the speed and of the compression: ${why}.`, `Die Energie wächst mit dem Quadrat der Geschwindigkeit und der Stauchung: ${why}.`),
        nudge: L('Set up the energy balance with symbols: how does the wanted quantity depend on the changed one?', 'Stelle die Energiebilanz mit Symbolen auf: Wie hängt die gesuchte Grösse von der veränderten ab?') }))]),
      explain: () => `<p>${L('Set up the energy balance with symbols and see how the wanted quantity depends on the changed one:', 'Stelle die Energiebilanz mit Symbolen auf und schau, wie die gesuchte Grösse von der veränderten abhängt:')}</p><p>${why}</p>`,
      hints: [L(`Here $${t.c}$ becomes ${n} times as large, $${t.c} \\to ${n}\\,${t.c}$, and you want the factor for $${t.w}$.${direct ? '' : ' Which energy becomes which?'}`, `Hier wird $${t.c}$ ${n}-mal so gross, $${t.c} \\to ${n}\\,${t.c}$, und gesucht ist der Faktor für $${t.w}$.${direct ? '' : ' Welche Energie wird zu welcher?'}`),
        direct ? L(`$${t.eq}$: what becomes of $${t.c}^2$ when $${t.c}$ is ${n} times as large?`, `$${t.eq}$: Was wird aus $${t.c}^2$, wenn $${t.c}$ ${n}-mal so gross ist?`)
          : L(`The balance with symbols: $${t.eq}$. Solve it for $${t.w}$ first, then put in $${n}\\,${t.c}$ for $${t.c}$.`, `Die Bilanz mit Symbolen: $${t.eq}$. Löse sie zuerst nach $${t.w}$ auf und setze dann $${n}\\,${t.c}$ für $${t.c}$ ein.`)],
    };
  }

  // ---------------------------------------------------------------- the path does not matter
  // a question of fixed options: { title, text, ask, right, wrong: [[html, flag, why, nudge]], explain }
  // (nudge: shown in practice instead of why, where why would give the answer away);
  // of more than three wrong ones, three at random (written about as long as the right one, some
  // longer, some shorter, so that its length gives nothing away)
  const choice = (r, q) => ({
    title: q.title, text: q.text, figure: q.figure || '', ask: q.ask,
    options: shuffle(r, [{ html: q.right, correct: true }, ...shuffle(r, [...q.wrong]).slice(0, 3).map(([html, flag, why, nudge]) => ({ html, correct: false, flag, why, nudge }))]),
    explain: () => q.explain, hints: q.hints || [], motion: q.motion,
  });
  const PATH_EXPLAIN = () => L('Lifting work changes the potential energy, and that depends only on the height: $W = m\\,g\\,h$ on every path. On a ramp $n$ times as long as it is high, the force needed is $n$ times smaller, $m\\,g/n$, but it acts over an $n$ times longer path: $W = \\frac{m\\,g}{n}\\cdot n\\,h = m\\,g\\,h$.',
    'Die Hubarbeit ändert die Lageenergie, und die hängt nur von der Höhe ab: $W = m\\,g\\,h$ auf jedem Weg. Auf einer Rampe, die $n$-mal so lang wie hoch ist, braucht es eine $n$-mal kleinere Kraft, $m\\,g/n$, aber über einen $n$-mal längeren Weg: $W = \\frac{m\\,g}{n}\\cdot n\\,h = m\\,g\\,h$.');
  function path(seed) {
    const r = rng(seed), v = Math.floor(r() * 3);
    if (v === 0) {
      const n = pick(r, [2, 3, 4, 5]);
      return choice(r, {
        title: L('Lifting work', 'Hubarbeit'),
        hints: [L(`Both ways the crate ends up $h$ higher. The ramp is ${n} times as long as it is high: by what factor is the force needed on it smaller than $m\\,g$, and by what factor is the path longer?`, `Auf beiden Wegen ist die Kiste am Ende um $h$ höher. Die Rampe ist ${n}-mal so lang wie hoch: Um welchen Faktor ist die nötige Kraft auf ihr kleiner als $m\\,g$, und um welchen Faktor ist der Weg länger?`)],
        text: L(`<p>A crate of mass $m$ is raised by a height $h$, once lifted straight up (work $W_A$), once pushed slowly up a smooth ramp ${n} times as long as it is high (work $W_B$).</p>`, `<p>Eine Kiste der Masse $m$ wird um die Höhe $h$ angehoben, einmal senkrecht hochgehoben (Arbeit $W_A$), einmal langsam eine glatte Rampe hinaufgeschoben, die ${n}-mal so lang wie hoch ist (Arbeit $W_B$).</p>`),
        ask: L('How do the two works compare?', 'Wie verhalten sich die beiden Arbeiten?'),
        right: '$W_B = W_A$',
        wrong: [[`$W_B = ${n}\\,W_A$`, 'path', L('The path is longer, but the force needed on the ramp is smaller by the same factor.', 'Der Weg ist länger, aber die nötige Kraft auf der Rampe ist um denselben Faktor kleiner.'), L('The path is longer. And the force needed on the ramp: by what factor is it smaller?', 'Der Weg ist länger. Und die nötige Kraft auf der Rampe: Um welchen Faktor ist sie kleiner?')],
          [`$W_B = \\tfrac{1}{${n}}\\,W_A$`, 'path', L('The force is smaller, but it acts over a longer path, by the same factor.', 'Die Kraft ist kleiner, aber sie wirkt über einen längeren Weg, um denselben Faktor.'), L('The force is smaller. And the path on the ramp: by what factor is it longer?', 'Die Kraft ist kleiner. Und der Weg auf der Rampe: Um welchen Faktor ist er länger?')],
          ['$W_B = 0$', 'other', L('The ramp carries part of the weight, but the crate still gains the potential energy m g h.', 'Die Rampe trägt einen Teil des Gewichts, aber die Kiste gewinnt trotzdem die Lageenergie m g h.'), L('The ramp carries part of the weight. But how much potential energy does the crate gain on the way up?', 'Die Rampe trägt einen Teil des Gewichts. Aber wie viel Lageenergie gewinnt die Kiste auf dem Weg nach oben?')]],
        explain: `<p>${PATH_EXPLAIN()}</p>`,
      });
    }
    if (v === 1) {
      const [a, b] = pick(r, [[L('a steep slide', 'eine steile Rutsche'), L('a gentle one', 'eine flache')], [L('a straight slide', 'eine gerade Rutsche'), L('a curved one', 'eine gekrümmte')], [L('a short, steep slide', 'eine kurze, steile Rutsche'), L('a long, gentle one', 'eine lange, flache')]]);
      return choice(r, {
        title: L('Two slides', 'Zwei Rutschen'),
        hints: [L(`Both children start at rest at the same height $h$ and end at the bottom. Write $E_1 = E_2$ for one of them: does anything in it depend on the shape of the slide or on the mass?`, `Beide Kinder starten in Ruhe auf der Höhe $h$ und enden unten. Schreibe $E_1 = E_2$ für eines davon auf: Hängt darin etwas von der Form der Rutsche oder von der Masse ab?`)],
        text: L(`<p>Two children start at rest from the same height $h$, one down ${a}, the other down ${b}. Friction is negligible.</p>`, `<p>Zwei Kinder starten in Ruhe auf derselben Höhe $h$, eines auf ${a}, das andere auf ${b}. Die Reibung ist vernachlässigbar.</p>`),
        ask: L('How fast are they at the bottom?', 'Wie schnell sind sie unten?'),
        right: L('Equally fast: only the height counts, so both have $v = \\sqrt{2\\,g\\,h}$', 'Gleich schnell: Nur die Höhe zählt, also haben beide unten $v = \\sqrt{2\\,g\\,h}$'),
        wrong: [[L('The one on the steeper or straighter slide is faster', 'Das Kind auf der steileren oder geraderen Rutsche ist schneller'), 'path', L('It gets there sooner, but not faster: only the height counts.', 'Es ist früher unten, aber nicht schneller: Nur die Höhe zählt.'), L('It gets there sooner, but is it also faster? What counts in the energy balance?', 'Es ist früher unten, aber ist es auch schneller? Was zählt in der Energiebilanz?')],
          [L('The one on the longer slide is faster: it speeds up for longer', 'Das Kind auf der längeren Rutsche ist schneller: Es beschleunigt länger'), 'path', L('On the longer slide it speeds up for longer, but more gently: only the height counts.', 'Auf der längeren Rutsche beschleunigt es länger, aber schwächer: Nur die Höhe zählt.'), L('On the longer slide it speeds up for longer, but more gently. What counts in the energy balance?', 'Auf der längeren Rutsche beschleunigt es länger, aber schwächer. Was zählt in der Energiebilanz?')],
          [L('The heavier child is faster: it is pulled down harder', 'Das schwerere Kind ist schneller: Es wird stärker gezogen'), 'other', L('The mass cancels out: $m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2$.', 'Die Masse kürzt sich weg: $m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2$.'), L('Write the energy balance: does the speed at the bottom depend on the mass?', 'Stelle die Energiebilanz auf: Hängt die Geschwindigkeit unten von der Masse ab?')],
          [L('Neither reaches $\\sqrt{2\\,g\\,h}$: some energy goes into pressing on the slide', 'Keines erreicht $\\sqrt{2\\,g\\,h}$: Etwas Energie geht ins Drücken auf die Rutsche'), 'other', L('The slide pushes at right angles to the motion: it does no work, and all of m g h becomes kinetic energy.', 'Die Rutsche drückt senkrecht zur Bewegung: Sie verrichtet keine Arbeit, und das ganze m g h wird zu kinetischer Energie.'), L('The slide pushes at right angles to the motion: does it do any work? Where does m g h go, then?', 'Die Rutsche drückt senkrecht zur Bewegung: Verrichtet sie Arbeit? Wohin geht dann m g h?')]],
        explain: `<p>${L('$E_1 = E_2$: $m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2$, so $v = \\sqrt{2\\,g\\,h}$ on every slide. The shape decides how long the ride takes, not the speed at the bottom.', '$E_1 = E_2$: $m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2$, also $v = \\sqrt{2\\,g\\,h}$ auf jeder Rutsche. Die Form bestimmt, wie lange die Fahrt dauert, nicht die Geschwindigkeit unten.')}</p>`,
      });
    }
    return choice(r, {
      title: L('Lifting work', 'Hubarbeit'),
      hints: [L('Work is force times path. Compare lifting straight up with pushing up a ramp twice as long as it is high: how do the force needed and the path change?', 'Arbeit ist Kraft mal Weg. Vergleiche das senkrechte Heben mit dem Hinaufschieben auf einer Rampe, die doppelt so lang wie hoch ist: Wie ändern sich die nötige Kraft und der Weg?')],
      text: `<p>${L('Without friction, the work needed to lift a body by a height $h$ is $m\\,g\\,h$, whatever the path.', 'Ohne Reibung ist die Arbeit, um einen Körper um die Höhe $h$ anzuheben, $m\\,g\\,h$, egal auf welchem Weg.')}</p>`,
      ask: L('Why does the path not matter?', 'Warum spielt der Weg keine Rolle?'),
      right: L('A longer path needs a force smaller by the same factor: force times path stays $m\\,g\\,h$', 'Ein längerer Weg braucht eine um denselben Faktor kleinere Kraft: Kraft mal Weg bleibt $m\\,g\\,h$'),
      wrong: [[L('The force needed is the same, $m\\,g$, on every path, so a ramp does not help at all', 'Die nötige Kraft ist auf jedem Weg gleich, $m\\,g$, eine Rampe hilft also gar nicht'), 'path', L('On a ramp the force needed is smaller than m g; the path is longer.', 'Auf einer Rampe ist die nötige Kraft kleiner als m g; dafür ist der Weg länger.')],
        [L('All routes from the bottom to the top are equally long, so force and path are the same', 'Alle Wege von unten nach oben sind gleich lang, also sind auch Kraft und Weg überall dieselben'), 'path', L('The paths differ in length; the force differs too, by the inverse factor.', 'Die Wege sind verschieden lang; die Kraft unterscheidet sich auch, um den umgekehrten Faktor.'), L('Are all paths equally long? And how does the force needed change on a longer path?', 'Sind alle Wege gleich lang? Und wie ändert sich die nötige Kraft auf einem längeren Weg?')],
        [L('Work does not depend on the force: the height alone sets it, however hard one pushes', 'Die Arbeit hängt nicht von der Kraft ab: Die Höhe allein bestimmt sie, egal wie stark man schiebt'), 'other', L('Work is force times path: both change on a ramp, and their product stays m g h.', 'Arbeit ist Kraft mal Weg: Beide ändern sich auf einer Rampe, und ihr Produkt bleibt m g h.'), L('Work is force times path: how do the force and the path change on a ramp?', 'Arbeit ist Kraft mal Weg: Wie ändern sich die Kraft und der Weg auf einer Rampe?')],
        [L('A longer path needs more work, but without friction the extra work is given back', 'Ein längerer Weg braucht mehr Arbeit, aber ohne Reibung wird die Mehrarbeit zurückgegeben'), 'path', L('A longer path needs no more work: the force needed is smaller by the same factor as the path is longer.', 'Ein längerer Weg braucht nicht mehr Arbeit: Die nötige Kraft ist um denselben Faktor kleiner, um den der Weg länger ist.'), L('Does a longer path really need more work? Compare by what factor the path is longer and the force needed smaller.', 'Braucht ein längerer Weg wirklich mehr Arbeit? Vergleiche, um welchen Faktor der Weg länger und die nötige Kraft kleiner ist.')]],
      explain: `<p>${PATH_EXPLAIN()}</p>`,
    });
  }

  // ---------------------------------------------------------------- friction
  const FR = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]];
  const ftex = (n, d) => (n === 0 ? '0' : n === d ? '' : `\\tfrac{${n}}{${d}}\\,`);
  function friction(seed) {
    const r = rng(seed);
    if (r() < 0.45) {
      return choice(r, {
        title: L('Friction', 'Reibung'),
        hints: [L('The sled starts at rest with $m\\,g\\,h$ and reaches the bottom with less kinetic energy. Energy is not lost: what happens to the runners and the snow when they rub against each other?', 'Der Schlitten startet in Ruhe mit $m\\,g\\,h$ und kommt unten mit weniger kinetischer Energie an. Energie geht nicht verloren: Was geschieht mit den Kufen und dem Schnee, wenn sie aneinander reiben?')],
        text: L('<p>A sled starts at rest at a height $h$ and slides down a slope with friction. At the bottom its kinetic energy is less than $m\\,g\\,h$.</p>', '<p>Ein Schlitten startet in Ruhe auf der Höhe $h$ und gleitet mit Reibung einen Hang hinunter. Unten ist seine kinetische Energie kleiner als $m\\,g\\,h$.</p>'),
        ask: L('Where has the rest of the energy gone?', 'Wo ist der Rest der Energie?'),
        right: L('Into thermal energy: friction warms the runners and the snow', 'In thermische Energie: Die Reibung erwärmt die Kufen und den Schnee'),
        wrong: [[L('Nowhere: friction destroys the energy the sled loses', 'Nirgends: Die Reibung vernichtet die Energie, die der Schlitten verliert'), 'lost', L('Energy is never destroyed: friction turns it into thermal energy.', 'Energie wird nie vernichtet: Die Reibung wandelt sie in thermische Energie um.'), L('Can energy be destroyed? Into what form does friction turn it?', 'Kann Energie vernichtet werden? In welche Form wandelt die Reibung sie um?')],
          [L('It is used up by the friction force, which needs energy to act', 'Sie wird von der Reibungskraft verbraucht, die zum Wirken Energie braucht'), 'lost', L('A force does not use up energy: the work done by friction becomes thermal energy.', 'Eine Kraft verbraucht keine Energie: Die Reibungsarbeit wird zu thermischer Energie.'), L('Can a force use up energy? Into what form does the work done by friction go?', 'Kann eine Kraft Energie verbrauchen? In welche Form geht die Reibungsarbeit über?')],
          [L('It is still stored in the sled as potential energy', 'Sie ist noch als Lageenergie im Schlitten gespeichert'), 'other', L('At the bottom the sled is at the zero level: it has no potential energy left.', 'Unten ist der Schlitten auf dem Nullniveau: Er hat keine Lageenergie mehr.')],
          [L('It was never there: on a slope the potential energy is only $m\\,g\\,h\\sin\\alpha$', 'Sie war nie da: Auf einem Hang ist die Lageenergie nur $m\\,g\\,h\\sin\\alpha$'), 'path', L('The potential energy is m g h, whatever the slope: only the height counts.', 'Die Lageenergie ist m g h, egal wie steil der Hang ist: Nur die Höhe zählt.')]],
        explain: `<p>${L('The energy balance with friction: $m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2 + E_{\\mathrm{th}}$. The work done by friction, $E_{\\mathrm{th}}$, is the thermal energy of runners and snow: the total energy stays the same.', 'Die Energiebilanz mit Reibung: $m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2 + E_{\\mathrm{th}}$. Die Reibungsarbeit, $E_{\\mathrm{th}}$, ist die thermische Energie von Kufen und Schnee: Die Gesamtenergie bleibt gleich.')}</p>`,
      });
    }
    const [n, d] = pick(r, FR), e = (k) => (k === 0 ? '$0$' : `$${ftex(k, d)}m\\,g\\,h$`);
    // the fractions of m g h first (swapped, added up), so that the right one is not the only
    // fraction among 0 and m g h
    const plain = r() < 0.5 ? [[0, 'lost'], [d, 'all']] : [[d, 'all'], [0, 'lost']];
    const cand = [[n, 'swap'], [d + n, 'sum'], ...plain];
    const seen = new Set([d - n]), wrong = [];
    for (const [k, tag] of cand) if (!seen.has(k) && wrong.length < 3) { seen.add(k); wrong.push([k, tag]); }
    const WHY = {
      swap: L('That is the kinetic energy at the bottom; the thermal energy is the rest of m g h.', 'Das ist die kinetische Energie unten; die thermische Energie ist der Rest von m g h.'),
      lost: L('Energy is not lost: what is missing from the kinetic energy has become thermal energy.', 'Energie geht nicht verloren: Was der kinetischen Energie fehlt, ist thermische Energie geworden.'),
      all: L('Not all of m g h: part of it is the kinetic energy at the bottom.', 'Nicht das ganze m g h: Ein Teil davon ist die kinetische Energie unten.'),
      sum: L('The thermal energy and the kinetic energy at the bottom add up to m g h, not more.', 'Thermische und kinetische Energie unten ergeben zusammen m g h, nicht mehr.'),
    };
    const NUDGE = {
      swap: L('That is the kinetic energy at the bottom. Which part of m g h is missing from it?', 'Das ist die kinetische Energie unten. Welcher Teil von m g h fehlt ihr?'),
      lost: L('Energy is not lost: where has what is missing from the kinetic energy at the bottom gone?', 'Energie geht nicht verloren: Wo steckt, was der kinetischen Energie unten fehlt?'),
    };
    return choice(r, {
      title: L('Friction', 'Reibung'),
      hints: [L(`The sled starts with $m\\,g\\,h$ and still has ${e(n)} of kinetic energy at the bottom. Energy balance with friction: $m\\,g\\,h = E_{\\mathrm{kin}} + E_{\\mathrm{th}}$. Which part of $m\\,g\\,h$ is missing?`, `Der Schlitten startet mit $m\\,g\\,h$ und hat unten noch ${e(n)} kinetische Energie. Energiebilanz mit Reibung: $m\\,g\\,h = E_{\\mathrm{kin}} + E_{\\mathrm{th}}$. Welcher Teil von $m\\,g\\,h$ fehlt?`)],
      text: L(`<p>A sled starts at rest at a height $h$ and slides down a slope with friction. At the bottom its kinetic energy is only ${e(n)}.</p>`, `<p>Ein Schlitten startet in Ruhe auf der Höhe $h$ und gleitet mit Reibung einen Hang hinunter. Unten hat er nur noch die kinetische Energie ${e(n)}.</p>`),
      ask: L('How much thermal energy has friction produced?', 'Wie viel thermische Energie hat die Reibung erzeugt?'),
      right: e(d - n),
      wrong: wrong.map(([k, tag]) => [e(k), tag === 'lost' ? 'lost' : 'other', WHY[tag], NUDGE[tag]]),
      explain: `<p>${L('The energy balance with friction', 'Die Energiebilanz mit Reibung')}: $m\\,g\\,h = ${ftex(n, d)}m\\,g\\,h + E_{\\mathrm{th}}$, ${L('so', 'also')} $E_{\\mathrm{th}} = ${ftex(d - n, d)}m\\,g\\,h$.</p>`,
    });
  }

  // ---------------------------------------------------------------- turning point and equilibrium
  const EQ_EXPLAIN = () => L('At the lowest point the jumper is at rest for an instant ($v = 0$, all the energy is in the rope) and the rope pulls harder than the weight: the jumper turns round. Where the rope pulls exactly as hard as the weight, $k\\,x_0 = m\\,g$, the jumper stops speeding up: there the speed is largest. That equilibrium position lies above the lowest point.',
    'Im tiefsten Punkt ruht die Springerin für einen Augenblick ($v = 0$, die ganze Energie steckt im Seil), und das Seil zieht stärker als die Gewichtskraft: Sie kehrt um. Wo das Seil genau so stark zieht wie die Gewichtskraft, $k\\,x_0 = m\\,g$, wird sie nicht mehr schneller: Dort ist die Geschwindigkeit am grössten. Diese Gleichgewichtslage liegt über dem tiefsten Punkt.');
  function turn(seed) {
    const r = rng(seed), s = situation('bungee', seed), v = Math.floor(r() * 3);
    const base = { title: L('Bungee jump', 'Bungee-Sprung'), text: `<p>${L('A bungee jumper steps off a bridge: free fall until ②, where the rope starts to stretch; at ③ the jumper is at the lowest point.', 'Eine Bungee-Springerin lässt sich von einer Brücke fallen: freier Fall bis ②, wo sich das Seil zu dehnen beginnt; in ③ ist sie im tiefsten Punkt.')}</p>`,
      figure: s.ex.figure({}), motion: s.ex, explain: `<p>${EQ_EXPLAIN()}</p>`, hints: [L('Where does the rope pull harder than the weight, and where less?', 'Wo zieht das Seil stärker als die Gewichtskraft, wo schwächer?')] };
    if (v === 0) return choice(r, { ...base,
      ask: L('Where is the jumper fastest?', 'Wo ist die Springerin am schnellsten?'),
      right: L('Between ② and ③, where the rope pulls as hard as the weight', 'Zwischen ② und ③, wo die Seilkraft gleich der Gewichtskraft ist'),
      wrong: [[L('At ②, where the free fall ends and the rope starts to stretch', 'In ②, wo der freie Fall endet und sich das Seil zu dehnen beginnt'), 'stretch', L('Just below ② the rope still pulls less than the weight: the jumper keeps speeding up.', 'Knapp unter ② zieht das Seil noch schwächer als die Gewichtskraft: Die Springerin wird noch schneller.')],
        [L('At ③, the lowest point, where the rope is stretched furthest', 'In ③, im tiefsten Punkt, wo das Seil am stärksten gedehnt ist'), 'turn', L('At the lowest point the jumper turns round: the speed is zero there.', 'Im tiefsten Punkt kehrt die Springerin um: Dort ist die Geschwindigkeit null.')],
        [L('Halfway between ① and ③, in the middle of the whole drop', 'In der Mitte zwischen ① und ③, nach der Hälfte des ganzen Falls'), 'other', L('The jumper speeds up as long as the weight is larger than the pull of the rope, which is below ②.', 'Die Springerin wird schneller, solange die Gewichtskraft grösser ist als der Zug des Seils, also bis unter ②.'), L('How long does the jumper keep speeding up? Compare the weight with the pull of the rope.', 'Wie lange wird die Springerin schneller? Vergleiche die Gewichtskraft mit dem Zug des Seils.')],
        [L('Between ① and ②, in the free fall, before the rope pulls', 'Zwischen ① und ②, im freien Fall, bevor das Seil zieht'), 'other', L('In the free fall the jumper keeps speeding up, and still does just below ②, while the rope pulls less than the weight.', 'Im freien Fall wird die Springerin immer schneller, und knapp unter ② noch immer, solange das Seil schwächer zieht als die Gewichtskraft.'), L('Does the jumper already slow down at ②? Compare the pull of the rope with the weight just below ②.', 'Wird die Springerin bei ② schon langsamer? Vergleiche knapp unter ② den Zug des Seils mit der Gewichtskraft.')]] });
    if (v === 1) return choice(r, { ...base,
      ask: L('What holds at the lowest point ③?', 'Was gilt im tiefsten Punkt ③?'),
      right: L('$v = 0$, and the rope pulls harder than the weight', '$v = 0$, und das Seil zieht dort stärker als die Gewichtskraft'),
      wrong: [[L('$v = 0$, and the rope pulls as hard as the weight', '$v = 0$, und das Seil zieht so stark wie die Gewichtskraft'), 'equil', L('Then the jumper would stay there. The lowest point is not the equilibrium: the rope pulls harder, and the jumper goes back up.', 'Dann bliebe die Springerin dort. Der tiefste Punkt ist nicht die Gleichgewichtslage: Das Seil zieht stärker, und sie geht wieder hoch.'), L('Then the jumper would stay there. Is the lowest point the equilibrium? Compare the pull of the rope there with the weight.', 'Dann bliebe die Springerin dort. Ist der tiefste Punkt die Gleichgewichtslage? Vergleiche dort den Zug des Seils mit der Gewichtskraft.')],
        [L('The speed is largest, as the jumper has fallen furthest', 'Die Geschwindigkeit ist am grössten, weil sie am weitesten gefallen ist'), 'turn', L('At the lowest point the jumper turns round: v = 0.', 'Im tiefsten Punkt kehrt die Springerin um: v = 0.')],
        [L('The elastic energy is zero, as the jumper is at rest', 'Die Spannenergie ist null, weil die Springerin ruht'), 'forgot', L('The rope is stretched most there: all the energy is elastic energy.', 'Das Seil ist dort am stärksten gedehnt: Die ganze Energie ist Spannenergie.'), L('Is the rope stretched there? What does that mean for the elastic energy?', 'Ist das Seil dort gedehnt? Was heisst das für die Spannenergie?')],
        [L('$v = 0$, and the rope pulls less than the weight', '$v = 0$, und das Seil zieht dort schwächer als die Gewichtskraft'), 'other', L('Then the jumper would go on down. At the lowest point the rope is stretched most and pulls harder than the weight.', 'Dann sänke die Springerin weiter. Im tiefsten Punkt ist das Seil am stärksten gedehnt und zieht stärker als die Gewichtskraft.'), L('Then the jumper would go on down. How far is the rope stretched at the lowest point, and how hard does it pull there?', 'Dann sänke die Springerin weiter. Wie stark ist das Seil im tiefsten Punkt gedehnt, und wie stark zieht es dann?')]] });
    return choice(r, { ...base,
      ask: L('What holds where the rope pulls as hard as the weight ($k\\,x_0 = m\\,g$)?', 'Was gilt dort, wo das Seil so stark zieht wie die Gewichtskraft ($k\\,x_0 = m\\,g$)?'),
      right: L('The speed is largest there; the jumper passes right through', 'Die Geschwindigkeit ist am grössten; die Springerin fliegt durch'),
      wrong: [[L('The jumper is at rest there: $v = 0$, as the forces balance', 'Die Springerin ruht dort: $v = 0$, weil sich die Kräfte aufheben'), 'equil', L('v = 0 only at the turning points. In the equilibrium position the jumper stops speeding up, at the largest speed.', 'v = 0 nur in den Umkehrpunkten. In der Gleichgewichtslage wird die Springerin nicht mehr schneller, sie hat dort die grösste Geschwindigkeit.'), L('v = 0 only at the turning points. Is the equilibrium position a turning point? Does the jumper still speed up there?', 'v = 0 nur in den Umkehrpunkten. Ist die Gleichgewichtslage ein Umkehrpunkt? Wird die Springerin dort noch schneller?')],
        [L('It is the lowest point, where the jumper turns round', 'Es ist der tiefste Punkt, wo die Springerin umkehrt'), 'equil', L('The jumper passes it with the largest speed and goes on down to the lowest point.', 'Die Springerin passiert sie mit der grössten Geschwindigkeit und sinkt weiter bis zum tiefsten Punkt.'), L('Does the jumper stop there? Is she still speeding up there, or already slowing down?', 'Bleibt die Springerin dort stehen? Wird sie dort noch schneller oder schon langsamer?')],
        [L('The rope is not stretched yet: it is about to start pulling', 'Das Seil ist dort noch nicht gedehnt: Es beginnt erst gleich zu ziehen'), 'stretch', L('A slack rope does not pull; at the equilibrium it is stretched by $x_0 = m\\,g/k$.', 'Ein schlaffes Seil zieht nicht; in der Gleichgewichtslage ist es um $x_0 = m\\,g/k$ gedehnt.'), L('Can a slack rope pull? Where does the rope pull as hard as the weight?', 'Kann ein schlaffes Seil ziehen? Wo zieht das Seil so stark wie die Gewichtskraft?')],
        [L('The jumper speeds up most, as the net force is largest there', 'Sie wird dort am stärksten schneller, weil die resultierende Kraft am grössten ist'), 'other', L('There the net force is zero: the jumper stops speeding up and is fastest.', 'Dort ist die resultierende Kraft null: Die Springerin wird nicht mehr schneller und ist am schnellsten.'), L('How large is the net force there? What does that mean for the acceleration?', 'Wie gross ist dort die resultierende Kraft? Was heisst das für die Beschleunigung?')]] });
  }
  function hang(seed) {
    const r = rng(seed), s = situation('spring-hang', seed), v = Math.floor(r() * 3);
    const why = L('From the energy: $m\\,g\\,s = \\tfrac{1}{2}\\,k\\,s^2$, so $k = \\frac{2\\,m\\,g}{s}$. At rest: $k\\,x_0 = m\\,g$, so $x_0 = \\frac{m\\,g}{k} = \\tfrac{1}{2}\\,s$. The block swings about the equilibrium, from $0$ down to $s = 2\\,x_0$ and back; it is fastest at $x_0$.',
      'Aus der Energie: $m\\,g\\,s = \\tfrac{1}{2}\\,k\\,s^2$, also $k = \\frac{2\\,m\\,g}{s}$. In Ruhe: $k\\,x_0 = m\\,g$, also $x_0 = \\frac{m\\,g}{k} = \\tfrac{1}{2}\\,s$. Der Klotz schwingt um die Gleichgewichtslage, von $0$ bis $s = 2\\,x_0$ hinunter und zurück; bei $x_0$ ist er am schnellsten.');
    const base = { title: L('A block on a spring', 'Ein Klotz an der Feder'), figure: '', explain: `<p>${why}</p>`,
      hints: [L('Lowest point: energy, $m\\,g\\,s = \\tfrac{1}{2}\\,k\\,s^2$. At rest: forces, $k\\,x_0 = m\\,g$.', 'Tiefster Punkt: Energie, $m\\,g\\,s = \\tfrac{1}{2}\\,k\\,s^2$. In Ruhe: Kräfte, $k\\,x_0 = m\\,g$.')] };
    const start = L('<p>A block hangs on a relaxed spring and is released from rest. It drops by $s$ to its lowest point and turns round there.</p>', '<p>Ein Klotz hängt an einer entspannten Feder und wird aus der Ruhe losgelassen. Er sinkt um $s$ bis zum tiefsten Punkt und kehrt dort um.</p>');
    if (v === 0) return choice(r, { ...base, text: start, figure: s.ex.figure({}), motion: s.ex,
      ask: L('How far below the start would the block hang at rest?', 'Wie weit unter dem Start würde der Klotz in Ruhe hängen?'),
      right: '$\\tfrac{1}{2}\\,s$',
      wrong: [['$s$', 'equil', L('The lowest point is not the equilibrium: there the spring pulls with 2 m g, twice the weight.', 'Der tiefste Punkt ist nicht die Ruhelage: Dort zieht die Feder mit 2 m g, doppelt so stark wie die Gewichtskraft.'), L('Is the lowest point the equilibrium? Compare the spring force there with the weight.', 'Ist der tiefste Punkt die Ruhelage? Vergleiche dort die Federkraft mit der Gewichtskraft.')],
        ['$\\tfrac{1}{4}\\,s$', 'other', L('At rest k x₀ = m g with k = 2 m g/s, so x₀ = s/2.', 'In Ruhe gilt k x₀ = m g mit k = 2 m g/s, also x₀ = s/2.'), L('Find k from the energy at the lowest point; then at rest k x₀ = m g.', 'Bestimme k aus der Energie im tiefsten Punkt; in Ruhe gilt dann k x₀ = m g.')],
        ['$\\tfrac{1}{\\sqrt{2}}\\,s$', 'other', L('The spring force grows in proportion to the stretch: k x₀ = m g gives x₀ = s/2.', 'Die Federkraft wächst proportional zur Dehnung: k x₀ = m g ergibt x₀ = s/2.'), L('The spring force grows in proportion to the stretch: at what stretch does it equal the weight?', 'Die Federkraft wächst proportional zur Dehnung: Bei welcher Dehnung ist sie gleich der Gewichtskraft?')]] });
    if (v === 1) return choice(r, { ...base, text: start, figure: s.ex.figure({}), motion: s.ex,
      ask: L('Where is the block fastest?', 'Wo ist der Klotz am schnellsten?'),
      right: L('$\\tfrac{1}{2}\\,s$ below the start, where the spring force equals the weight', '$\\tfrac{1}{2}\\,s$ unter dem Start, wo Federkraft und Gewichtskraft gleich sind'),
      wrong: [[L('At the lowest point, $s$ below the start, where the spring is stretched most', 'Im tiefsten Punkt, $s$ unter dem Start, wo die Feder am stärksten gedehnt ist'), 'turn', L('The block turns round there: v = 0.', 'Dort kehrt der Klotz um: v = 0.')],
        [L('Just after the release, while the spring hardly pulls yet', 'Gleich nach dem Loslassen, solange die Feder noch kaum zieht'), 'other', L('It starts from rest and speeds up as long as the weight is larger than the spring force.', 'Er startet aus der Ruhe und wird schneller, solange die Gewichtskraft grösser ist als die Federkraft.')],
        [L('$\\tfrac{1}{4}\\,s$ below the start, before the spring starts to pull hard', '$\\tfrac{1}{4}\\,s$ unter dem Start, bevor die Feder richtig zu ziehen beginnt'), 'other', L('There the spring pulls less than the weight: the block is still speeding up.', 'Dort zieht die Feder schwächer als die Gewichtskraft: Der Klotz wird noch schneller.')]] });
    return choice(r, { ...base,
      text: L('<p>A block hangs at rest on a spring, which is stretched by $x_0$. It is lifted until the spring is relaxed and released from rest there.</p>', '<p>Ein Klotz hängt in Ruhe an einer Feder, die um $x_0$ gedehnt ist. Er wird angehoben, bis die Feder entspannt ist, und dort aus der Ruhe losgelassen.</p>'),
      ask: L('How far does it drop before it turns round?', 'Wie weit sinkt er, bevor er umkehrt?'),
      right: '$2\\,x_0$',
      wrong: [['$x_0$', 'equil', L('At x₀ it passes the equilibrium with its largest speed and drops further.', 'Bei x₀ passiert er die Ruhelage mit der grössten Geschwindigkeit und sinkt weiter.')],
        ['$4\\,x_0$', 'other', L('Energy: m g s = ½ k s² with k = m g/x₀ gives s = 2 x₀.', 'Energie: m g s = ½ k s² mit k = m g/x₀ ergibt s = 2 x₀.'), L('Write the energy balance from the start to the lowest point and put in k = m g/x₀.', 'Stelle die Energiebilanz vom Start bis zum tiefsten Punkt auf und setze k = m g/x₀ ein.')],
        ['$\\sqrt{2}\\,x_0$', 'other', L('Energy: m g s = ½ k s² with k = m g/x₀ gives s = 2 x₀.', 'Energie: m g s = ½ k s² mit k = m g/x₀ ergibt s = 2 x₀.'), L('Write the energy balance from the start to the lowest point and put in k = m g/x₀.', 'Stelle die Energiebilanz vom Start bis zum tiefsten Punkt auf und setze k = m g/x₀ ein.')]] });
  }

  const KINDS = { bars, forms, balance, error, scale, path, friction, turn, hang };
  const DIFFICULTY = { bars: 2, forms: 2, balance: 3, error: 3, scale: 3, path: 2, friction: 3, turn: 4, hang: 4 };
  const question = (kind, seed) => KINDS[kind](seed);

  // A choice exercise of practice: the question, its hints and its explanation as the solution.
  function exercise(kind, seed) {
    const q = question(kind, seed);
    return {
      choice: true, scenario: kind, difficulty: DIFFICULTY[kind], formal: true, seed,
      title: q.title, text: q.text, ask: q.ask, options: q.options,
      figure: () => q.figure, solutionFigure: () => '', hints: q.hints,
      solution: [q.explain()], results: q.options.find((o) => o.correct).html, motion: q.motion || null,
      key: `${q.title}|${q.text}|${q.ask}|${q.options.map((o) => o.html).join('|')}`,
    };
  }

  // ---------------------------------------------------------------- the tutor's example
  // Find the error: a student's energy table of the bungee jump, checked entry by entry.
  function errorLesson() {
    const s = situation('bungee', 7), slip = slipsOf(s).find((x) => x.flag === 'rest' && x.i === 2);
    const level = (s.scn.slips(s.p))[0];
    const wrong = withSlip(s, slip), fig = s.ex.figure({});
    const bars = s.ex.figure({ bars: null });
    const frame = (rule, text, figure) => ({ text: `<p class="step-rule">${rule}</p>${text}`, figure });
    return [
      frame(L('The student’s table', 'Die Tabelle des Schülers'), `${prompt(s)}<p>${L('A student has filled in the energy table of the jump. One entry is wrong: which one?', 'Ein Schüler hat die Energietabelle des Sprungs ausgefüllt. Ein Eintrag ist falsch: welcher?')}</p>${tableHtml(s, wrong)}`, fig),
      frame(L('Check systematically', 'Systematisch prüfen'), `<p>${L('Check every state against the drawing, one form at a time:', 'Prüfe jeden Zustand an der Zeichnung, eine Energieform nach der anderen:')}</p><ul><li>${L('Is the body moving? Then it has kinetic energy, else none.', 'Bewegt sich der Körper? Dann hat er kinetische Energie, sonst keine.')}</li><li>${L('How high is it above the zero level? That height goes into $m\\,g\\,h$.', 'Wie hoch ist er über dem Nullniveau? Diese Höhe gehört in $m\\,g\\,h$.')}</li><li>${L('Is the spring (the rope) stretched? By how much?', 'Ist die Feder (das Seil) gedehnt? Um wie viel?')}</li></ul>`, fig),
      frame('①, ②', `<p>${L('① The jumper is at rest on the bridge, $\\ell + s$ above the lowest point; the rope is slack: only $m\\,g\\,(\\ell + s)$. ② After the free fall: moving, $s$ above the lowest point, rope still slack: $m\\,g\\,s + \\tfrac{1}{2}\\,m\\,v^2$. Both rows are right.', '① Die Springerin ruht auf der Brücke, $\\ell + s$ über dem tiefsten Punkt; das Seil ist schlaff: nur $m\\,g\\,(\\ell + s)$. ② Nach dem freien Fall: in Bewegung, $s$ über dem tiefsten Punkt, Seil noch schlaff: $m\\,g\\,s + \\tfrac{1}{2}\\,m\\,v^2$. Beide Zeilen stimmen.')}</p>${tableHtml(s, wrong)}`, bars),
      frame('③', `<p>${L('③ is the lowest point, a turning point: $v = 0$, so the kinetic energy is zero. The student’s ③ has $\\tfrac{1}{2}\\,m\\,v^2$ in it: that is the error. All the energy is in the rope there.', '③ ist der tiefste Punkt, ein Umkehrpunkt: $v = 0$, die kinetische Energie ist also null. In der Zeile ③ des Schülers steht $\\tfrac{1}{2}\\,m\\,v^2$: Das ist der Fehler. Die ganze Energie steckt dort im Seil.')}</p>${tableHtml(s, s.en, { i: slip.i, k: slip.k })}`, bars),
      frame(L('Another typical error', 'Ein anderer typischer Fehler'), `<p>${L(`Measuring a height from the wrong level: $${level.tex}$ in ① would count the height above ②, where the rope starts to stretch. The zero level is the lowest point, so ① is $\\ell + s$ above it. Choose the zero level once and measure every height from it.`, `Eine Höhe vom falschen Niveau aus messen: $${level.tex}$ in ① zählte die Höhe über ②, wo sich das Seil zu dehnen beginnt. Das Nullniveau ist der tiefste Punkt, ① liegt also $\\ell + s$ darüber. Wähle das Nullniveau einmal und miss jede Höhe von ihm aus.`)}</p>`, fig),
    ];
  }

  // ---------------------------------------------------------------- the check
  // The learning objectives, each with its question kinds, worked example and practice topic
  // (lessons.js).
  const OBJECTIVES = [
    { id: 'forms', kinds: ['bars', 'forms'], tutor: 0, topic: 0,
      name: () => L('Identify the forms of energy (kinetic, gravitational, elastic) in the initial and the final state, and show them in bar charts.', 'Die Energieformen (kinetische, Lage- und Spannenergie) im Anfangs- und im Endzustand erkennen und in Balkendiagrammen darstellen.') },
    { id: 'balance', kinds: ['balance', 'scale'], tutor: 1, topic: 1,
      name: () => L('Set up the energy balance of two states and solve it with symbols before inserting numbers, e.g. to see how a height or speed scales.', 'Die Energiebilanz zweier Zustände aufstellen und mit Symbolen auflösen, bevor Zahlen eingesetzt werden, z. B. um zu sehen, wie eine Höhe oder Geschwindigkeit skaliert.') },
    { id: 'path', kinds: ['path', 'friction'], tutor: 2, topic: 2,
      name: () => L('Explain why lifting work does not depend on the path, and where the work done by friction goes.', 'Erklären, warum die Hubarbeit nicht vom Weg abhängt und wohin die Reibungsarbeit geht.') },
    { id: 'turn', kinds: ['turn', 'hang'], tutor: 5, topic: 5,
      name: () => L('Tell the turning point of a bungee jump or a spring (v = 0) from its equilibrium position (largest speed).', 'Den Umkehrpunkt eines Bungee-Sprungs oder einer Feder (v = 0) von der Gleichgewichtslage (grösste Geschwindigkeit) unterscheiden.') },
    { id: 'error', kinds: ['error'], tutor: 7, topic: 7,
      name: () => L('Find the wrong entry in an energy table.', 'Den falschen Eintrag in einer Energietabelle finden.') },
  ];
  const CHECK = {
    id: 'ec',
    objectives: OBJECTIVES,
    question,
    concept: { rest: 'rest', level: 'level', relaxed: 'relaxed', forgot: 'forgot', linear: 'linear', path: 'path', lost: 'lost', equil: 'equil', turn: 'equil', stretch: 'stretch' },
    concepts: () => ({
      rest: L('kinetic energy where the body is at rest (a turning point)', 'kinetische Energie, wo der Körper ruht (in einem Umkehrpunkt)'),
      level: L('a height not measured from the zero level', 'eine Höhe nicht vom Nullniveau aus gemessen'),
      relaxed: L('elastic energy in a relaxed spring', 'Spannenergie in einer entspannten Feder'),
      forgot: L('a form of energy overlooked', 'eine Energieform übersehen'),
      linear: L('energy taken as proportional to the speed or the compression, not to its square', 'Energie proportional zur Geschwindigkeit oder Stauchung statt zu deren Quadrat'),
      path: L('the work or the speed taken to depend on the path', 'Arbeit oder Geschwindigkeit hängen angeblich vom Weg ab'),
      lost: L('energy taken as destroyed by friction', 'Energie wird angeblich durch Reibung vernichtet'),
      equil: L('the turning point (v = 0) taken for the equilibrium position (largest speed)', 'den Umkehrpunkt (v = 0) mit der Gleichgewichtslage (grösste Geschwindigkeit) verwechselt'),
      stretch: L('the rope taken to brake as soon as it starts to stretch', 'das Seil bremst angeblich, sobald es sich zu dehnen beginnt'),
    }),
  };

  root.EnergyConcepts = { KINDS: Object.keys(KINDS), question, exercise, errorLesson, tableHtml, CHECK };
  if (typeof module !== 'undefined') module.exports = root.EnergyConcepts;
})(typeof window !== 'undefined' ? window : globalThis);
