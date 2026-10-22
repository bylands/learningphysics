// The exercise types of the app. practiceOf(type, seed) gives an exercise { type, difficulty,
// title, text, fields, figure(), solutionFigure(), hints, solution, results, p }; quiz(ex, seed)
// a multiple-choice question about one of its fields (for the check).
// A field is a number { key, type: 'num', sym, unit, what, value, tol, traps: [{ value, why, flag }] }
// (traps: the answers under typical wrong ideas) or a choice { key, type: 'choice', what, value,
// options: [{ v, html, why, flag }], pics (the options are graphs), stack (one below the other) }.
//
//   combining      pair (two capacitors in series or in parallel), bounds (without numbers: where
//                  the total lies and how a change moves it, which capacitor has the largest
//                  voltage or charge, a capacitor and a pair, equal capacitors), mixed (one
//                  capacitor in series or in parallel with a pair: the block first), network (four
//                  or five capacitors, nested)
//   time curves    curve-u, curve-i, curve-r (which graph shows U_C, the current, U_R while
//                  charging), curve-u-d, curve-i-d, curve-r-d (the same while discharging), loop and
//                  loop-d (U_R, I or U_C at a moment, with numbers: the loop rule)
//   time constant  read-half (T½ and 2 or 3·T½ read from a graph), read-tau (τ read from a graph),
//                  predict (R or C changed: τ, the current at the start, the final voltage),
//                  predict-graph (which graph shows the charging with R or C changed)
// Capacitances in µF are chosen so that the totals come out round (mental arithmetic). The time
// curves are the exponentials of the lecture notes: discharging U_C = U₀·e^(−t/τ), charging
// U_C = U₀·(1 − e^(−t/τ)), the current I = (U₀/R)·e^(−t/τ) in both cases, τ = R·C and
// T½ = τ·ln 2 ≈ 0.69·τ.
(function (root) {
  'use strict';

  const Lang = root.Lang || require('./lang.js');
  const Fg = root.Figures || require('./figures.js');
  const L = (en, de) => Lang.L(en, de);

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

  // ---------------------------------------------------------------- helpers
  const num = (x) => String(Math.round(x * 100) / 100).replace('-', '−');
  const TEXU = { 'µF': '\\mu\\mathrm{F}', s: '\\mathrm{s}', ms: '\\mathrm{ms}', V: '\\mathrm{V}', mA: '\\mathrm{mA}', 'kΩ': '\\mathrm{k\\Omega}' };
  const tq = (x, u) => `${num(x).replace('−', '-')}\\,${TEXU[u]}`;
  const p$ = (s) => `<p>${s}</p>`;
  const step = (rule, html) => `<p class="step-rule">${rule}</p>${html}`;
  const numF = (key, sym, unit, what, value, traps = [], tol = 0.01) => ({ key, type: 'num', sym, unit, what, value, tol, traps: traps.filter((t) => Number.isFinite(t.value) && Math.abs(t.value - value) > 2 * tol * value) });
  const choiceF = (key, what, value, options, o = {}) => ({ key, type: 'choice', what, value, options, ...o });
  // nudge: what a wrong choice is told while the exercise is open, when why would give the answer away
  const opt = (v, html, why = '', flag = null, nudge = null) => ({ v, html, why, flag, ...(nudge ? { nudge } : {}) });
  const ofKey = (ex, key) => ex.fields.find((f) => f.key === key);

  // ================================================================ combining capacitors
  const VALS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 60];
  const ser2 = (a, b) => (a * b) / (a + b);
  const half = (x) => Math.abs(2 * x - Math.round(2 * x)) < 1e-9; // a multiple of 0.5
  // pairs (a, b) whose series total is a whole number of µF (or half of two equal ones)
  const NICE = [];
  VALS.forEach((a) => VALS.forEach((b) => { if (a <= b && b <= 5 * a && a + b <= 60 && (a === b ? half(ser2(a, b)) : Number.isInteger(ser2(a, b)))) NICE.push([a, b]); }));
  const leaf = (c, v) => ({ c, v });

  const RULES = {
    par: () => L('In parallel, the capacitors have the same voltage $\\Delta V$, and their charges add: $Q = C_1\\Delta V + C_2\\Delta V$. So the capacitances add: $C = C_1 + C_2$.', 'Parallel geschaltete Kondensatoren haben dieselbe Spannung $U$, und ihre Ladungen addieren sich: $Q = C_1U + C_2U$. Also addieren sich die Kapazitäten: $C = C_1 + C_2$.'),
    ser: () => L('In series, the capacitors carry the same charge $Q$ (what leaves one plate arrives on the next), and their voltages add: $\\Delta V = Q/C_1 + Q/C_2$. So the reciprocals add: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2}$, for two capacitors $C = \\frac{C_1C_2}{C_1 + C_2}$.', 'In Serie tragen die Kondensatoren dieselbe Ladung $Q$ (was eine Platte verlässt, kommt auf der nächsten an), und ihre Spannungen addieren sich: $U = Q/C_1 + Q/C_2$. Also addieren sich die Kehrwerte: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2}$, für zwei Kondensatoren $C = \\frac{C_1C_2}{C_1 + C_2}$.'),
    swap: () => L('These are the rules of resistors, swapped: resistors add in series, capacitors in parallel.', 'Das sind die Regeln der Widerstände, vertauscht: Widerstände addieren sich in Serie, Kapazitäten parallel.'),
  };
  const WHY_SWAP = {
    ser: () => L('That is the rule for resistors in series. Capacitors in series carry the same charge and their voltages add: the reciprocals add, and the total is smaller than the smallest capacitance.', 'Das ist die Regel für Widerstände in Serie. Kondensatoren in Serie tragen dieselbe Ladung, und ihre Spannungen addieren sich: Die Kehrwerte addieren sich, und die Gesamtkapazität ist kleiner als die kleinste.'),
    par: () => L('That is the rule for resistors in parallel. Capacitors in parallel have the same voltage and their charges add: the capacitances add.', 'Das ist die Regel für parallele Widerstände. Parallele Kondensatoren haben dieselbe Spannung, und ihre Ladungen addieren sich: Die Kapazitäten addieren sich.'),
  };
  const WHY_INVERT = () => L('That is $1/C$ in $1/\\mu\\mathrm{F}$: take the reciprocal to get $C$.', 'Das ist $1/C$ in $1/\\mu\\mathrm{F}$: Nimm den Kehrwert, um $C$ zu erhalten.');
  const inWords = (ser) => (ser ? L('in series', 'in Serie') : L('in parallel', 'parallel'));
  // the total of two, worked out
  const work = (ser, a, b, n1, n2, name) => (ser
    ? `$\\frac{1}{${name}} = \\frac{1}{${n1}} + \\frac{1}{${n2}}$, ${L('so', 'also')} $${name} = \\frac{${n1}\\cdot ${n2}}{${n1} + ${n2}} = \\frac{${num(a)}\\cdot ${num(b)}}{${num(a)} + ${num(b)}}\\,\\mu\\mathrm{F} = \\htmlClass{result}{${tq(ser2(a, b), 'µF')}}$`
    : `$${name} = ${n1} + ${n2} = ${num(a)}\\,\\mu\\mathrm{F} + ${num(b)}\\,\\mu\\mathrm{F} = \\htmlClass{result}{${tq(a + b, 'µF')}}$`);
  const totalWhat = () => L('total capacitance', 'Gesamtkapazität');

  const pair = {
    difficulty: 1,
    title: () => L('Two capacitors', 'Zwei Kondensatoren'),
    make: (r) => { const [a, b] = r.pick(NICE), flip = r.next() < 0.5; return { ser: r.next() < 0.5, a: flip ? b : a, b: flip ? a : b }; },
    build(p) {
      const { ser, a, b } = p, value = ser ? ser2(a, b) : a + b, net = ser ? { s: [leaf('1', a), leaf('2', b)] } : { p: [leaf('1', a), leaf('2', b)] };
      const traps = [{ value: ser ? a + b : ser2(a, b), why: WHY_SWAP[ser ? 'ser' : 'par'](), flag: 'swap' }];
      if (ser) traps.push({ value: 1 / a + 1 / b, why: WHY_INVERT(), flag: 'invert' });
      return {
        text: p$(L(`Two capacitors, $C_1 = ${tq(a, 'µF')}$ and $C_2 = ${tq(b, 'µF')}$, are connected ${inWords(ser)} between A and B. Find the total capacitance.`, `Zwei Kondensatoren, $C_1 = ${tq(a, 'µF')}$ und $C_2 = ${tq(b, 'µF')}$, sind zwischen A und B ${inWords(ser)} geschaltet. Bestimme die Gesamtkapazität.`)),
        fields: [numF('C', 'C', 'µF', totalWhat(), value, traps)],
        figure: () => Fg.network(net),
        solutionFigure: () => Fg.network(net, { reduce: [[net, '', value]] }),
        hints: [
          L(`$C_1 = ${tq(a, 'µF')}$ and $C_2 = ${tq(b, 'µF')}$ are ${inWords(ser)}: which quantity do they share, the charge or the voltage, and which one adds up?`, `$C_1 = ${tq(a, 'µF')}$ und $C_2 = ${tq(b, 'µF')}$ sind ${inWords(ser)} geschaltet: Welche Grösse haben sie gemeinsam, die Ladung oder die Spannung, und welche addiert sich?`),
          ser ? L('The same charge $Q$, and the voltages add: $\\Delta V = \\frac{Q}{C_1} + \\frac{Q}{C_2}$. So the reciprocals add: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2}$, with both capacitances in µF.', 'Dieselbe Ladung $Q$, und die Spannungen addieren sich: $U = \\frac{Q}{C_1} + \\frac{Q}{C_2}$. Also addieren sich die Kehrwerte: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2}$, mit beiden Kapazitäten in µF.')
            : L('The same voltage $\\Delta V$, and the charges add: $Q = C_1\\Delta V + C_2\\Delta V = (C_1 + C_2)\\cdot\\Delta V$. The total capacitance is the factor in front of $\\Delta V$.', 'Dieselbe Spannung $U$, und die Ladungen addieren sich: $Q = C_1U + C_2U = (C_1 + C_2)\\cdot U$. Die Gesamtkapazität ist der Faktor vor $U$.'),
          ser ? L(`For two capacitors this is $C = \\frac{C_1C_2}{C_1 + C_2}$: the product of the two capacitances over their sum. Check: in series the total is smaller than the smaller one, $${tq(Math.min(a, b), 'µF')}$ (adding $C_1 + C_2$ is the rule of resistors).`, `Für zwei Kondensatoren ist das $C = \\frac{C_1C_2}{C_1 + C_2}$: das Produkt der beiden Kapazitäten durch ihre Summe. Kontrolle: In Serie ist die Gesamtkapazität kleiner als die kleinere, $${tq(Math.min(a, b), 'µF')}$ (das Addieren $C_1 + C_2$ ist die Regel der Widerstände).`)
            : L(`Check: in parallel the total is larger than the larger one, $${tq(Math.max(a, b), 'µF')}$ (adding the reciprocals is the rule of resistors).`, `Kontrolle: Parallel ist die Gesamtkapazität grösser als die grössere, $${tq(Math.max(a, b), 'µF')}$ (das Addieren der Kehrwerte ist die Regel der Widerstände).`),
        ],
        solution: [
          step(L(ser ? 'Series: the same charge' : 'Parallel: the same voltage', ser ? 'Serie: dieselbe Ladung' : 'Parallel: dieselbe Spannung'), p$(RULES[ser ? 'ser' : 'par']())),
          step(L('The total', 'Die Gesamtkapazität'), p$(work(ser, a, b, 'C_1', 'C_2', 'C'))),
          step(L('Check', 'Kontrolle'), p$(ser ? L('In series the total is smaller than the smallest capacitance. ', 'In Serie ist die Gesamtkapazität kleiner als die kleinste Kapazität. ') + RULES.swap() : L('In parallel the total is larger than the largest capacitance. ', 'Parallel ist die Gesamtkapazität grösser als die grösste Kapazität. ') + RULES.swap())),
        ],
        results: `$C = ${tq(value, 'µF')}$`,
      };
    },
    check: ['C'],
  };

  // one capacitor in series with a parallel pair ('sp'), or in parallel with a series pair ('ps')
  const mixed = {
    difficulty: 3,
    title: () => L('Three capacitors', 'Drei Kondensatoren'),
    make(r) {
      if (r.next() < 0.5) {
        // C₁ in series with C₂ ∥ C₃: C₁ and the block form a nice pair, the block splits into two
        for (let k = 0; k < 200; k++) {
          const [x, y] = r.pick(NICE), [a, block] = r.next() < 0.5 ? [x, y] : [y, x];
          const splits = VALS.filter((b) => VALS.includes(block - b) && b < block);
          if (block >= 2 && splits.length) { const b = r.pick(splits); return { shape: 'sp', a, b, c: block - b }; }
        }
      }
      const [b, c] = r.pick(NICE);
      return { shape: 'ps', a: r.pick(VALS.filter((v) => v <= 20)), b, c };
    },
    build(p) {
      const { shape, a, b, c } = p, sp = shape === 'sp';
      const block = sp ? { p: [leaf('2', b), leaf('3', c)] } : { s: [leaf('2', b), leaf('3', c)] };
      const net = sp ? { s: [leaf('1', a), block] } : { p: [leaf('1', a), block] };
      const vb = sp ? b + c : ser2(b, c), value = sp ? ser2(a, vb) : a + vb;
      const swb = sp ? ser2(b, c) : b + c;
      const fb = [{ value: swb, why: WHY_SWAP[sp ? 'par' : 'ser'](), flag: 'swap' }];
      const ft = [
        { value: sp ? a + vb : ser2(a, vb), why: WHY_SWAP[sp ? 'ser' : 'par'](), flag: 'swap' },
        { value: sp ? a + swb : ser2(a, swb), why: `${L('Resistor rules used throughout.', 'Durchwegs die Regeln der Widerstände verwendet.')} ${RULES.swap()}`, flag: 'swap' },
      ];
      if (sp) ft.push({ value: 1 / a + 1 / vb, why: WHY_INVERT(), flag: 'invert' });
      return {
        text: p$(L(`Find the capacitance $C_{23}$ of the block of $C_2$ and $C_3$, then the total capacitance between A and B.`, `Bestimme die Kapazität $C_{23}$ des Blocks aus $C_2$ und $C_3$, dann die Gesamtkapazität zwischen A und B.`)),
        situation: p$(L('The capacitors are connected between A and B as shown.', 'Die Kondensatoren sind wie gezeigt zwischen A und B geschaltet.')),
        fields: [numF('C23', 'C_{23}', 'µF', L('block', 'Block'), vb, fb), numF('C', 'C', 'µF', totalWhat(), value, ft)],
        figure: () => Fg.network(net, { hl: block, cap: '$C_{23}$' }),
        solutionFigure: () => Fg.network(net, { reduce: [[block, '23', vb]] }),
        hints: [
          L(`The block first: are $C_2 = ${tq(b, 'µF')}$ and $C_3 = ${tq(c, 'µF')}$ in series or in parallel with each other? And how is $C_1 = ${tq(a, 'µF')}$ connected to the block?`, `Zuerst der Block: Sind $C_2 = ${tq(b, 'µF')}$ und $C_3 = ${tq(c, 'µF')}$ in Serie oder parallel zueinander? Und wie ist $C_1 = ${tq(a, 'µF')}$ mit dem Block verbunden?`),
          sp ? L('$C_2$ and $C_3$ have the same voltage, their charges add: $C_{23} = C_2 + C_3$ (capacitors add in parallel, resistors in series).', '$C_2$ und $C_3$ haben dieselbe Spannung, ihre Ladungen addieren sich: $C_{23} = C_2 + C_3$ (Kapazitäten addieren sich parallel, Widerstände in Serie).')
            : L('$C_2$ and $C_3$ carry the same charge, their voltages add: $\\frac{1}{C_{23}} = \\frac{1}{C_2} + \\frac{1}{C_3}$ (in series the reciprocals add, the other way round than for resistors).', '$C_2$ und $C_3$ tragen dieselbe Ladung, ihre Spannungen addieren sich: $\\frac{1}{C_{23}} = \\frac{1}{C_2} + \\frac{1}{C_3}$ (in Serie addieren sich die Kehrwerte, umgekehrt als bei Widerständen).'),
          sp ? L('Then $C_1$ and the block $C_{23}$ in series: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_{23}}$, and $C$ must come out smaller than both.', 'Dann $C_1$ und der Block $C_{23}$ in Serie: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_{23}}$, und $C$ muss kleiner als beide herauskommen.')
            : L('Then $C_1$ and the block $C_{23}$ in parallel: $C = C_1 + C_{23}$, larger than both.', 'Dann $C_1$ und der Block $C_{23}$ parallel: $C = C_1 + C_{23}$, grösser als beide.'),
        ],
        solution: [
          step(L('The block', 'Der Block'), p$(`${L(`$C_2$ and $C_3$ are ${inWords(!sp)}:`, `$C_2$ und $C_3$ sind ${inWords(!sp)} geschaltet:`)} ${work(!sp, b, c, 'C_2', 'C_3', 'C_{23}')}.`)),
          step(L('The total', 'Die Gesamtkapazität'), p$(`${L(`$C_1$ and the block are ${inWords(sp)}:`, `$C_1$ und der Block sind ${inWords(sp)} geschaltet:`)} ${work(sp, a, vb, 'C_1', 'C_{23}', 'C')}.`)),
          step(L('Check', 'Kontrolle'), p$(sp ? L(`In series the total is smaller than each part: $C < C_1$ and $C < C_{23}$.`, `In Serie ist die Gesamtkapazität kleiner als jeder Teil: $C < C_1$ und $C < C_{23}$.`) : L(`In parallel the total is larger than each part: $C > C_1$ and $C > C_{23}$.`, `Parallel ist die Gesamtkapazität grösser als jeder Teil: $C > C_1$ und $C > C_{23}$.`))),
        ],
        results: `$C_{23} = ${tq(vb, 'µF')}$, $C = ${tq(value, 'µF')}$`,
      };
    },
    check: ['C', 'C23'],
  };

  // Without calculating, in four kinds (p.kind):
  //   where   three capacitors in series or in parallel: where does the total lie? Then one of
  //           them is added, removed, or replaced by a larger or a smaller one (p.change)
  //   share   three in series or in parallel on a battery: which one has the largest voltage,
  //           which one the largest charge?
  //   mixed   C₁ in series with a parallel pair (p.ser) or in parallel with a series pair: the
  //           total compared with C₁ alone and with the pair alone
  //   equal   n equal capacitors in series or in parallel: the total, and the voltage of each
  const KINDS = ['where', 'where', 'share', 'mixed', 'equal'], CHANGE = ['add', 'remove', 'larger', 'smaller'];
  const capList = (vals) => vals.map((v, i) => `$C_${i + 1} = ${tq(v, 'µF')}$`).join(', ');
  const bigSmall = (v) => ({ up: L('larger', 'grösser'), down: L('smaller', 'kleiner'), same: L('the same', 'gleich') }[v]);

  function boundsWhere(p) {
    const { ser, vals, change } = p, lo = Math.min(...vals), hi = Math.max(...vals), sum = vals.reduce((s, v) => s + v, 0);
    const inv = vals.reduce((s, v) => s + 1 / v, 0), net = { [ser ? 's' : 'p']: vals.map((v, i) => leaf(String(i + 1), v)) };
    const why = {
      ser: L('In series the reciprocals add: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\frac{1}{C_3}$ is larger than each $\\frac{1}{C_k}$, so $C$ is smaller than each $C_k$.', 'In Serie addieren sich die Kehrwerte: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\frac{1}{C_3}$ ist grösser als jedes $\\frac{1}{C_k}$, also ist $C$ kleiner als jedes $C_k$.'),
      par: L(`In parallel the capacitances add: $C = C_1 + C_2 + C_3 = ${tq(sum, 'µF')}$, larger than each one.`, `Parallel addieren sich die Kapazitäten: $C = C_1 + C_2 + C_3 = ${tq(sum, 'µF')}$, grösser als jede einzelne.`),
    }[ser ? 'ser' : 'par'];
    const nudge = ser ? L('In series the reciprocals add: is $\\frac{1}{C}$ then larger or smaller than each $\\frac{1}{C_k}$?', 'In Serie addieren sich die Kehrwerte: Ist $\\frac{1}{C}$ dann grösser oder kleiner als jedes $\\frac{1}{C_k}$?')
      : L('In parallel the capacitances add: how does their sum compare with the largest one?', 'Parallel addieren sich die Kapazitäten: Wie verhält sich ihre Summe zur grössten?');
    const where = choiceF('where', L('The total capacitance is', 'Die Gesamtkapazität ist'), ser ? 'below' : 'above', [
      opt('below', L(`smaller than the smallest: $C < ${tq(lo, 'µF')}$`, `kleiner als die kleinste: $C < ${tq(lo, 'µF')}$`), why, ser ? null : 'swap', nudge),
      opt('edge', ser ? L(`equal to the smallest: $C = ${tq(lo, 'µF')}$`, `gleich der kleinsten: $C = ${tq(lo, 'µF')}$`) : L(`equal to the largest: $C = ${tq(hi, 'µF')}$`, `gleich der grössten: $C = ${tq(hi, 'µF')}$`), `${L('Each capacitor counts.', 'Jeder Kondensator zählt.')} ${why}`, 'edge', `${L('Each capacitor counts.', 'Jeder Kondensator zählt.')} ${nudge}`),
      opt('between', L(`between the smallest and the largest`, `zwischen der kleinsten und der grössten`), `${L('That would be some kind of average.', 'Das wäre eine Art Mittelwert.')} ${why}`, 'avg', `${L('That would be some kind of average.', 'Das wäre eine Art Mittelwert.')} ${nudge}`),
      opt('above', L(`larger than the largest: $C > ${tq(hi, 'µF')}$`, `grösser als die grösste: $C > ${tq(hi, 'µF')}$`), why, ser ? 'swap' : null, nudge),
    ].map((o) => (o.v === (ser ? 'below' : 'above') ? { ...o, why: '' } : o)), { stack: true, ask: L('Where does the total capacitance lie?', 'Wo liegt die Gesamtkapazität?') });
    // the change: what is done, the answer, why, and the flag of the opposite answer
    const ch = {
      add: { text: ser ? L('A fourth capacitor is added in series.', 'Ein vierter Kondensator wird in Serie dazugeschaltet.') : L('A fourth capacitor is added in parallel.', 'Ein vierter Kondensator wird parallel dazugeschaltet.'), v: ser ? 'down' : 'up', flag: 'swap',
        why: ser ? L('One more term $\\frac{1}{C_4}$ makes $\\frac{1}{C}$ larger, so $C$ smaller. (Like resistors in parallel: each one added lowers the total.)', 'Ein weiterer Summand $\\frac{1}{C_4}$ macht $\\frac{1}{C}$ grösser, also $C$ kleiner. (Wie bei parallelen Widerständen: Jeder weitere senkt den Gesamtwiderstand.)') : L('In parallel one more capacitance is added to the sum: $C$ becomes larger. (Like resistors in series.)', 'Parallel kommt eine weitere Kapazität zur Summe dazu: $C$ wird grösser. (Wie bei Widerständen in Serie.)') },
      remove: { text: ser ? L('$C_3$ is taken out and replaced by a wire.', '$C_3$ wird entfernt und durch einen Draht ersetzt.') : L('$C_3$ is taken out (its branch is left open).', '$C_3$ wird entfernt (sein Zweig bleibt offen).'), v: ser ? 'up' : 'down', flag: 'swap',
        why: ser ? L('One term $\\frac{1}{C_3}$ less makes $\\frac{1}{C}$ smaller, so $C$ larger: two capacitors in series store more charge at the same voltage than three.', 'Ein Summand $\\frac{1}{C_3}$ weniger macht $\\frac{1}{C}$ kleiner, also $C$ grösser: Zwei Kondensatoren in Serie speichern bei derselben Spannung mehr Ladung als drei.') : L('In parallel one capacitance less is added: $C$ becomes smaller.', 'Parallel wird eine Kapazität weniger addiert: $C$ wird kleiner.') },
      larger: { text: L('$C_1$ is replaced by a capacitor with a larger capacitance.', '$C_1$ wird durch einen Kondensator mit grösserer Kapazität ersetzt.'), v: 'up', flag: null,
        why: ser ? L('A larger $C_1$ makes $\\frac{1}{C_1}$ smaller, so $\\frac{1}{C}$ smaller and $C$ larger.', 'Ein grösseres $C_1$ macht $\\frac{1}{C_1}$ kleiner, also $\\frac{1}{C}$ kleiner und $C$ grösser.') : L('A larger $C_1$ makes the sum $C_1 + C_2 + C_3$ larger.', 'Ein grösseres $C_1$ macht die Summe $C_1 + C_2 + C_3$ grösser.') },
      smaller: { text: L('$C_1$ is replaced by a capacitor with a smaller capacitance.', '$C_1$ wird durch einen Kondensator mit kleinerer Kapazität ersetzt.'), v: 'down', flag: null,
        why: ser ? L('A smaller $C_1$ makes $\\frac{1}{C_1}$ larger, so $\\frac{1}{C}$ larger and $C$ smaller.', 'Ein kleineres $C_1$ macht $\\frac{1}{C_1}$ grösser, also $\\frac{1}{C}$ grösser und $C$ kleiner.') : L('A smaller $C_1$ makes the sum $C_1 + C_2 + C_3$ smaller.', 'Ein kleineres $C_1$ macht die Summe $C_1 + C_2 + C_3$ kleiner.') },
    }[change];
    const chNudge = ser ? L('In series the reciprocals add: how does this change alter $\\frac{1}{C}$, and so $C$?', 'In Serie addieren sich die Kehrwerte: Wie ändert diese Änderung $\\frac{1}{C}$, und damit $C$?')
      : L('In parallel the capacitances add: how does this change alter their sum?', 'Parallel addieren sich die Kapazitäten: Wie ändert diese Änderung ihre Summe?');
    const more = choiceF('more', `${ch.text} ${L('The total capacitance becomes', 'Die Gesamtkapazität wird')}`, ch.v, ['up', 'down', 'same'].map((v) => opt(v, bigSmall(v),
      v === ch.v ? '' : v === 'same' ? `${L('Every capacitor counts in the total.', 'Jeder Kondensator zählt bei der Gesamtkapazität mit.')} ${ch.why}` : ch.why, v === ch.v ? null : v === 'same' ? 'edge' : ch.flag,
      v === 'same' ? `${L('Every capacitor counts in the total.', 'Jeder Kondensator zählt bei der Gesamtkapazität mit.')} ${chNudge}` : chNudge)));
    return {
      text: p$(L(`Three capacitors, ${capList(vals)}, are connected ${inWords(ser)}. Without calculating: where does the total capacitance lie?`, `Drei Kondensatoren, ${capList(vals)}, sind ${inWords(ser)} geschaltet. Ohne zu rechnen: Wo liegt die Gesamtkapazität?`)),
      fields: [where, more],
      figure: () => Fg.network(net),
      solutionFigure: () => Fg.network(net, { reduce: [[net, '', ser ? 1 / inv : sum]] }),
      hints: [
        L(`${capList(vals)} are ${inWords(ser)}: do they share the charge or the voltage? So what adds up here, the capacitances or their reciprocals?`, `${capList(vals)} sind ${inWords(ser)} geschaltet: Haben sie die Ladung oder die Spannung gemeinsam? Was addiert sich also hier, die Kapazitäten oder ihre Kehrwerte?`),
        ser ? L(`In series $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\frac{1}{C_3}$. Compare this sum with its largest term, the one of the smallest capacitance, $${tq(lo, 'µF')}$.`, `In Serie ist $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\frac{1}{C_3}$. Vergleiche diese Summe mit ihrem grössten Summanden, dem der kleinsten Kapazität, $${tq(lo, 'µF')}$.`)
          : L(`In parallel $C = C_1 + C_2 + C_3$. Compare this sum with the largest capacitance, $${tq(hi, 'µF')}$.`, `Parallel ist $C = C_1 + C_2 + C_3$. Vergleiche diese Summe mit der grössten Kapazität, $${tq(hi, 'µF')}$.`),
        {
          add: ser ? L('Then a fourth capacitor joins in series: one more term $\\frac{1}{C_4}$ in the sum for $\\frac{1}{C}$. What does that do to $\\frac{1}{C}$, and so to $C$?', 'Dann kommt ein vierter Kondensator in Serie dazu: ein Summand $\\frac{1}{C_4}$ mehr in der Summe für $\\frac{1}{C}$. Was macht das mit $\\frac{1}{C}$, und damit mit $C$?')
            : L('Then a fourth capacitor joins in parallel: one more term $C_4$ in the sum. What does that do to $C$?', 'Dann kommt ein vierter Kondensator parallel dazu: ein Summand $C_4$ mehr in der Summe. Was macht das mit $C$?'),
          remove: ser ? L(`Then $C_3 = ${tq(vals[2], 'µF')}$ is replaced by a wire: the term $\\frac{1}{C_3}$ drops out of the sum for $\\frac{1}{C}$. What does that do to $\\frac{1}{C}$, and so to $C$?`, `Dann wird $C_3 = ${tq(vals[2], 'µF')}$ durch einen Draht ersetzt: Der Summand $\\frac{1}{C_3}$ fällt aus der Summe für $\\frac{1}{C}$. Was macht das mit $\\frac{1}{C}$, und damit mit $C$?`)
            : L(`Then $C_3 = ${tq(vals[2], 'µF')}$ is taken out: its term drops out of the sum. What does that do to $C$?`, `Dann wird $C_3 = ${tq(vals[2], 'µF')}$ entfernt: Sein Summand fällt aus der Summe. Was macht das mit $C$?`),
          larger: ser ? L(`Then $C_1 = ${tq(vals[0], 'µF')}$ is replaced by a larger capacitance: what happens to its term $\\frac{1}{C_1}$, to $\\frac{1}{C}$, and so to $C$?`, `Dann wird $C_1 = ${tq(vals[0], 'µF')}$ durch eine grössere Kapazität ersetzt: Was geschieht mit seinem Summanden $\\frac{1}{C_1}$, mit $\\frac{1}{C}$, und damit mit $C$?`)
            : L(`Then $C_1 = ${tq(vals[0], 'µF')}$ is replaced by a larger capacitance: what happens to the sum?`, `Dann wird $C_1 = ${tq(vals[0], 'µF')}$ durch eine grössere Kapazität ersetzt: Was geschieht mit der Summe?`),
          smaller: ser ? L(`Then $C_1 = ${tq(vals[0], 'µF')}$ is replaced by a smaller capacitance: what happens to its term $\\frac{1}{C_1}$, to $\\frac{1}{C}$, and so to $C$?`, `Dann wird $C_1 = ${tq(vals[0], 'µF')}$ durch eine kleinere Kapazität ersetzt: Was geschieht mit seinem Summanden $\\frac{1}{C_1}$, mit $\\frac{1}{C}$, und damit mit $C$?`)
            : L(`Then $C_1 = ${tq(vals[0], 'µF')}$ is replaced by a smaller capacitance: what happens to the sum?`, `Dann wird $C_1 = ${tq(vals[0], 'µF')}$ durch eine kleinere Kapazität ersetzt: Was geschieht mit der Summe?`),
        }[change],
      ],
      solution: [
        step(L('Where the total lies', 'Wo die Gesamtkapazität liegt'), p$(why) + (ser ? p$(L(`Here: $\\frac{1}{C} = ${vals.map((v) => `\\frac{1}{${v}}`).join(' + ')}\\,\\frac{1}{\\mu\\mathrm{F}}$, so $C \\approx ${tq(1 / inv, 'µF')}$, less than $${tq(lo, 'µF')}$.`, `Hier: $\\frac{1}{C} = ${vals.map((v) => `\\frac{1}{${v}}`).join(' + ')}\\,\\frac{1}{\\mu\\mathrm{F}}$, also $C \\approx ${tq(1 / inv, 'µF')}$, weniger als $${tq(lo, 'µF')}$.`)) : '')),
        step(L('The change', 'Die Änderung'), p$(`${ch.why} ${L('The total becomes', 'Die Gesamtkapazität wird')} <span class="result">${bigSmall(ch.v)}</span>.`)),
      ],
      results: `${ser ? L('smaller than the smallest', 'kleiner als die kleinste') : L('larger than the largest', 'grösser als die grösste')}; ${bigSmall(ch.v)}`,
    };
  }

  function boundsShare(p) {
    const { ser, vals } = p, net = { [ser ? 's' : 'p']: vals.map((v, i) => leaf(String(i + 1), v)) };
    const k = 1 + vals.indexOf(ser ? Math.min(...vals) : Math.max(...vals)), right = `c${k}`;
    const same = ser ? L('In series all carry the same charge $Q$: what leaves one plate arrives on the next.', 'In Serie tragen alle dieselbe Ladung $Q$: Was eine Platte verlässt, kommt auf der nächsten an.') : L('In parallel all are connected to the same two points: they have the same voltage $\\Delta V$.', 'Parallel sind alle an dieselben zwei Punkte angeschlossen: Sie haben dieselbe Spannung $U$.');
    const most = ser ? L('So the voltages differ: $\\Delta V_k = Q/C_k$, the smallest capacitance has the largest voltage.', 'Also sind die Spannungen verschieden: $U_k = Q/C_k$, die kleinste Kapazität hat die grösste Spannung.') : L('So the charges differ: $Q_k = C_k\\,\\Delta V$, the largest capacitance carries the largest charge.', 'Also sind die Ladungen verschieden: $Q_k = C_k U$, die grösste Kapazität trägt die grösste Ladung.');
    const options = (r, why, nudge) => [...vals.map((_, i) => [`c${i + 1}`, `$C_${i + 1}$`]), ['same', L('all the same', 'alle gleich')]].map(([v, h]) => opt(v, h, v === r ? '' : why, v === r ? null : 'share', nudge));
    const nudgeMost = ser ? L('In series: which quantity is the same for all capacitors? What does $Q = C\\cdot\\Delta V$ then say about their voltages?', 'In Serie: Welche Grösse ist für alle Kondensatoren gleich? Was sagt $Q = C\\cdot U$ dann über ihre Spannungen?')
      : L('In parallel: which quantity is the same for all capacitors? What does $Q = C\\cdot\\Delta V$ then say about their charges?', 'Parallel: Welche Grösse ist für alle Kondensatoren gleich? Was sagt $Q = C\\cdot U$ dann über ihre Ladungen?');
    const nudgeSame = ser ? L('In series: where does the charge that leaves one plate go?', 'In Serie: Wohin geht die Ladung, die eine Platte verlässt?')
      : L('In parallel: to which two points is each capacitor connected?', 'Parallel: An welche zwei Punkte ist jeder Kondensator angeschlossen?');
    const qV = L('Which capacitor has the largest voltage?', 'Welcher Kondensator hat die grösste Spannung?'), qQ = L('Which capacitor carries the largest charge?', 'Welcher Kondensator trägt die grösste Ladung?');
    return {
      text: p$(L(`Three capacitors, ${capList(vals)}, are connected ${inWords(ser)} between A and B, and a battery is connected to A and B. Without calculating: which capacitor has the largest voltage, which one the largest charge?`, `Drei Kondensatoren, ${capList(vals)}, sind zwischen A und B ${inWords(ser)} geschaltet, und an A und B wird eine Batterie angeschlossen. Ohne zu rechnen: Welcher Kondensator hat die grösste Spannung, welcher die grösste Ladung?`)),
      fields: [
        choiceF('where', ser ? qV : qQ, right, options(right, `${same} ${most}`, nudgeMost), { ask: ser ? qV : qQ }),
        choiceF('more', ser ? qQ : qV, 'same', options('same', same, nudgeSame), { ask: ser ? qQ : qV }),
      ],
      figure: () => Fg.network(net),
      solutionFigure: () => Fg.network(net),
      hints: [
        ser ? L(`${capList(vals)} sit one after the other between A and B: the charge that leaves a plate of one capacitor, where does it go? So which quantity is the same for all three?`, `${capList(vals)} sitzen hintereinander zwischen A und B: Die Ladung, die eine Platte eines Kondensators verlässt, wohin geht sie? Welche Grösse ist also für alle drei gleich?`)
          : L(`${capList(vals)} are each connected to A and B: to which voltage? So which quantity is the same for all three?`, `${capList(vals)} sind alle an A und B angeschlossen: An welcher Spannung liegen sie? Welche Grösse ist also für alle drei gleich?`),
        L('Each of the three capacitors obeys $Q_k = C_k\\cdot\\Delta V_k$, with its own capacitance $C_k$. Which of $Q_k$ and $\\Delta V_k$ is the same for all three here, and which one then differs?', 'Jeder der drei Kondensatoren erfüllt $Q_k = C_k\\cdot U_k$, mit seiner eigenen Kapazität $C_k$. Welche von $Q_k$ und $U_k$ ist hier für alle drei gleich, und welche ist dann verschieden?'),
        L(`A shared charge $Q$ gives $\\Delta V_k = \\frac{Q}{C_k}$, a shared voltage gives $Q_k = C_k\\cdot\\Delta V$. Take the one that holds here and see how the other quantity depends on $C_k$: which of ${vals.map((v) => `$${tq(v, 'µF')}$`).join(', ')} makes it largest?`, `Eine gemeinsame Ladung $Q$ gibt $U_k = \\frac{Q}{C_k}$, eine gemeinsame Spannung $Q_k = C_k\\cdot U$. Nimm das, was hier gilt, und schau, wie die andere Grösse von $C_k$ abhängt: Welche von ${vals.map((v) => `$${tq(v, 'µF')}$`).join(', ')} macht sie am grössten?`),
      ],
      solution: [
        step(ser ? L('Series: the same charge', 'Serie: dieselbe Ladung') : L('Parallel: the same voltage', 'Parallel: dieselbe Spannung'), p$(`${same} ${L('So', 'Also')} <span class="result">${ser ? L('the charge is the same for all', 'die Ladung ist für alle gleich') : L('the voltage is the same for all', 'die Spannung ist für alle gleich')}</span>.`)),
        step(ser ? L('The voltages', 'Die Spannungen') : L('The charges', 'Die Ladungen'), p$(`${most} ${L('Here that is', 'Hier ist das')} <span class="result">$C_${k}$</span> ($${tq(vals[k - 1], 'µF')}$).`)),
      ],
      results: ser ? L(`the largest voltage: $C_${k}$; the charge: the same for all`, `die grösste Spannung: $C_${k}$; die Ladung: für alle gleich`) : L(`the largest charge: $C_${k}$; the voltage: the same for all`, `die grösste Ladung: $C_${k}$; die Spannung: für alle gleich`),
    };
  }

  function boundsMixed(p) {
    const { ser, vals: [a, b, c] } = p;
    const block = ser ? { p: [leaf('2', b), leaf('3', c)] } : { s: [leaf('2', b), leaf('3', c)] }, net = ser ? { s: [leaf('1', a), block] } : { p: [leaf('1', a), block] };
    const vb = ser ? b + c : ser2(b, c), total = ser ? ser2(a, vb) : a + vb, v = ser ? 'below' : 'above';
    const why = ser ? L('$C_1$ and the block $C_{23}$ are in series: the total is smaller than each of them, whatever the values.', '$C_1$ und der Block $C_{23}$ sind in Serie: Die Gesamtkapazität ist kleiner als jeder der beiden, was immer die Werte sind.') : L('$C_1$ and the block $C_{23}$ are in parallel: the total is their sum, larger than each of them, whatever the values.', '$C_1$ und der Block $C_{23}$ sind parallel: Die Gesamtkapazität ist ihre Summe, grösser als jeder der beiden, was immer die Werte sind.');
    const nudge = L('Think of the block $C_{23}$ as one capacitor: how is it connected to $C_1$, and what does that mean for the total?', 'Stell dir den Block $C_{23}$ als einen Kondensator vor: Wie ist er mit $C_1$ verbunden, und was bedeutet das für die Gesamtkapazität?');
    const cmp = (key, name) => choiceF(key, L(`Compared with ${name} alone, the total capacitance is`, `Verglichen mit ${name} allein ist die Gesamtkapazität`), v, [
      ['below', L('smaller', 'kleiner'), ser ? null : 'swap'], ['edge', L('the same', 'gleich gross'), 'edge'], ['above', L('larger', 'grösser'), ser ? 'swap' : null], ['depends', L('it depends on the values', 'es hängt von den Werten ab'), 'edge'],
    ].map(([o, h, f]) => opt(o, h, o === v ? '' : why, o === v ? null : f, nudge)), { stack: true, ask: L(`Compared with ${name} alone: is the total capacitance smaller or larger?`, `Verglichen mit ${name} allein: Ist die Gesamtkapazität kleiner oder grösser?`) });
    return {
      text: p$(L(`Three capacitors, ${capList([a, b, c])}, are connected as shown. Without calculating: how does the total capacitance compare with $C_1$ alone, and with the block $C_{23}$ of $C_2$ and $C_3$ alone?`, `Drei Kondensatoren, ${capList([a, b, c])}, sind wie gezeigt geschaltet. Ohne zu rechnen: Wie verhält sich die Gesamtkapazität zu $C_1$ allein und zum Block $C_{23}$ aus $C_2$ und $C_3$ allein?`)),
      situation: p$(L(`Three capacitors, ${capList([a, b, c])}, are connected as shown; $C_2$ and $C_3$ form the block $C_{23}$. Answer without calculating.`, `Drei Kondensatoren, ${capList([a, b, c])}, sind wie gezeigt geschaltet; $C_2$ und $C_3$ bilden den Block $C_{23}$. Antworte, ohne zu rechnen.`)),
      fields: [cmp('where', '$C_1$'), cmp('more', L('the block $C_{23}$', 'dem Block $C_{23}$'))],
      figure: () => Fg.network(net, { hl: block, cap: '$C_{23}$' }),
      solutionFigure: () => Fg.network(net, { reduce: [[block, '23', vb]] }),
      hints: [
        L(`$C_2 = ${tq(b, 'µF')}$ and $C_3 = ${tq(c, 'µF')}$ form the block $C_{23}$; think of it as one capacitor. Is it in series or in parallel with $C_1 = ${tq(a, 'µF')}$?`, `$C_2 = ${tq(b, 'µF')}$ und $C_3 = ${tq(c, 'µF')}$ bilden den Block $C_{23}$; stell ihn dir als einen Kondensator vor. Ist er in Serie oder parallel zu $C_1 = ${tq(a, 'µF')}$?`),
        ser ? L(`$C_1$ and the block are ${inWords(ser)}: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_{23}}$.`, `$C_1$ und der Block sind ${inWords(ser)} geschaltet: $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_{23}}$.`)
          : L(`$C_1$ and the block are ${inWords(ser)}: $C = C_1 + C_{23}$.`, `$C_1$ und der Block sind ${inWords(ser)} geschaltet: $C = C_1 + C_{23}$.`),
        ser ? L('Both terms are positive: is $\\frac{1}{C}$ larger or smaller than $\\frac{1}{C_1}$ alone, and than $\\frac{1}{C_{23}}$ alone? What does that mean for $C$? You need no value of $C_{23}$ for this.', 'Beide Summanden sind positiv: Ist $\\frac{1}{C}$ grösser oder kleiner als $\\frac{1}{C_1}$ allein, und als $\\frac{1}{C_{23}}$ allein? Was heisst das für $C$? Dafür brauchst du keinen Wert von $C_{23}$.')
          : L('Both terms are positive: is the sum larger or smaller than $C_1$ alone, and than $C_{23}$ alone? You need no value of $C_{23}$ for this.', 'Beide Summanden sind positiv: Ist die Summe grösser oder kleiner als $C_1$ allein, und als $C_{23}$ allein? Dafür brauchst du keinen Wert von $C_{23}$.'),
      ],
      solution: [
        step(L('The block', 'Der Block'), p$(L(`$C_2$ and $C_3$ are ${inWords(!ser)}: they act like one capacitor $C_{23}$.`, `$C_2$ und $C_3$ sind ${inWords(!ser)} geschaltet: Sie wirken wie ein Kondensator $C_{23}$.`))),
        step(L('The block and $C_1$', 'Der Block und $C_1$'), p$(`${why} ${L('The total is', 'Die Gesamtkapazität ist')} <span class="result">${ser ? L('smaller than both', 'kleiner als beide') : L('larger than both', 'grösser als beide')}</span>.`) +
          p$(L(`Here: $C_{23} \\approx ${tq(vb, 'µF')}$ and $C \\approx ${tq(total, 'µF')}$.`, `Hier: $C_{23} \\approx ${tq(vb, 'µF')}$ und $C \\approx ${tq(total, 'µF')}$.`))),
      ],
      results: ser ? L('smaller than $C_1$; smaller than $C_{23}$', 'kleiner als $C_1$; kleiner als $C_{23}$') : L('larger than $C_1$; larger than $C_{23}$', 'grösser als $C_1$; grösser als $C_{23}$'),
    };
  }

  function boundsEqual(p) {
    const { ser, n, c } = p, value = ser ? c / n : n * c, net = { [ser ? 's' : 'p']: Array.from({ length: n }, (_, i) => leaf(String(i + 1), c)) };
    const why = ser ? L(`In series the reciprocals add: $\\frac{1}{C} = ${n}\\cdot\\frac{1}{C_1}$, so $C = C_1/${n}$.`, `In Serie addieren sich die Kehrwerte: $\\frac{1}{C} = ${n}\\cdot\\frac{1}{C_1}$, also $C = C_1/${n}$.`) : L(`In parallel the capacitances add: $C = ${n}\\cdot C_1$.`, `Parallel addieren sich die Kapazitäten: $C = ${n}\\cdot C_1$.`);
    const totals = [[c / n, ser ? null : 'swap'], [n * c, ser ? 'swap' : null], [c, 'edge'], [ser ? c / (n * n) : n * n * c, null]];
    const share = ser ? L(`In series the ${n} voltages add up to $\\Delta V$. All carry the same charge, and equal capacitors with the same charge have the same voltage: $\\Delta V/${n}$ each.`, `In Serie addieren sich die ${n} Spannungen zu $U$. Alle tragen dieselbe Ladung, und gleiche Kondensatoren mit derselben Ladung haben dieselbe Spannung: je $U/${n}$.`) : L('In parallel each capacitor is connected to A and B: each has the whole voltage $\\Delta V$.', 'Parallel ist jeder Kondensator an A und B angeschlossen: Jeder hat die ganze Spannung $U$.');
    const each = ser ? 'part' : 'all';
    const nudgeTotal = ser ? L(`In series the reciprocals add: what is $\\frac{1}{C}$ for ${n} equal capacitors?`, `In Serie addieren sich die Kehrwerte: Was ist $\\frac{1}{C}$ bei ${n} gleichen Kondensatoren?`)
      : L(`In parallel the capacitances add: what does that give for ${n} equal capacitors?`, `Parallel addieren sich die Kapazitäten: Was ergibt das bei ${n} gleichen Kondensatoren?`);
    const nudgeShare = ser ? L('In series: how do the voltages of the capacitors add up to $\\Delta V$, and do equal capacitors with the same charge differ?', 'In Serie: Wie ergeben die Spannungen der Kondensatoren zusammen $U$, und unterscheiden sich gleiche Kondensatoren mit derselben Ladung?')
      : L('In parallel: to which two points is each capacitor connected?', 'Parallel: An welche zwei Punkte ist jeder Kondensator angeschlossen?');
    return {
      text: p$(L(`${n} equal capacitors, each with $C_1 = ${tq(c, 'µF')}$, are connected ${inWords(ser)} between A and B. Without a calculator: what is the total capacitance? A battery with voltage $\\Delta V$ is connected to A and B: what is the voltage of each capacitor?`, `${n} gleiche Kondensatoren mit je $C_1 = ${tq(c, 'µF')}$ sind zwischen A und B ${inWords(ser)} geschaltet. Ohne Rechner: Wie gross ist die Gesamtkapazität? An A und B wird eine Batterie mit der Spannung $U$ angeschlossen: Welche Spannung hat jeder Kondensator?`)),
      fields: [
        choiceF('where', L('The total capacitance:', 'Die Gesamtkapazität:'), String(value), totals.map(([x, f]) => opt(String(x), `$C = ${tq(x, 'µF')}$`, x === value ? '' : why, x === value ? null : f, nudgeTotal)), { ask: L('What is the total capacitance?', 'Wie gross ist die Gesamtkapazität?') }),
        choiceF('more', L('The voltage of each capacitor:', 'Die Spannung jedes Kondensators:'), each, [['part', L(`$\\Delta V/${n}$`, `$U/${n}$`)], ['all', L('$\\Delta V$', '$U$')], ['more', L(`$${n}\\,\\Delta V$`, `$${n}\\,U$`)]].map(([v, h]) => opt(v, h, v === each ? '' : share, v === each ? null : 'share', nudgeShare))),
      ],
      figure: () => Fg.network(net),
      solutionFigure: () => Fg.network(net, { reduce: [[net, '', value]] }),
      hints: [
        L(`${n} capacitors of $${tq(c, 'µF')}$ each, ${inWords(ser)}: what adds up, the capacitances or their reciprocals? (For capacitors it is the other way round than for resistors.)`, `${n} Kondensatoren mit je $${tq(c, 'µF')}$, ${inWords(ser)}: Was addiert sich, die Kapazitäten oder ihre Kehrwerte? (Bei Kondensatoren ist es umgekehrt als bei Widerständen.)`),
        ser ? L(`In series $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\dots$: here a sum of ${n} equal terms $\\frac{1}{C_1}$. Write it as one product, then take the reciprocal.`, `In Serie ist $\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\dots$: hier eine Summe von ${n} gleichen Summanden $\\frac{1}{C_1}$. Schreib sie als ein Produkt und nimm dann den Kehrwert.`)
          : L(`In parallel $C = C_1 + C_2 + \\dots$: here a sum of ${n} equal terms $C_1$.`, `Parallel ist $C = C_1 + C_2 + \\dots$: hier eine Summe von ${n} gleichen Summanden $C_1$.`),
        ser ? L(`The voltage: the ${n} capacitors carry the same charge, and their ${n} voltages add up to $\\Delta V$. Can equal capacitors with the same charge have different voltages?`, `Die Spannung: Die ${n} Kondensatoren tragen dieselbe Ladung, und ihre ${n} Spannungen ergeben zusammen $U$. Können gleiche Kondensatoren mit derselben Ladung verschiedene Spannungen haben?`)
          : L(`The voltage: each of the ${n} capacitors is connected straight to A and B. Which voltage is between A and B?`, `Die Spannung: Jeder der ${n} Kondensatoren ist direkt an A und B angeschlossen. Welche Spannung liegt zwischen A und B?`),
      ],
      solution: [
        step(L('The total', 'Die Gesamtkapazität'), p$(`${why} ${L('Here', 'Hier')}: $C = \\htmlClass{result}{${tq(value, 'µF')}}$.`)),
        step(L('The voltage of each', 'Die Spannung jedes Kondensators'), p$(`${share}`)),
      ],
      results: `$C = ${tq(value, 'µF')}$; ${ser ? L(`$\\Delta V/${n}$ each`, `je $U/${n}$`) : L('$\\Delta V$ each', 'je $U$')}`,
    };
  }

  const BOUNDS = { where: boundsWhere, share: boundsShare, mixed: boundsMixed, equal: boundsEqual };
  const bounds = {
    difficulty: 2,
    title: () => L('Larger or smaller?', 'Grösser oder kleiner?'),
    make(r) {
      const kind = r.pick(KINDS), ser = r.next() < 0.5, vals = r.shuffle(VALS.slice(1, 10)).slice(0, 3);
      if (kind === 'where') return { kind, ser, vals, change: r.pick(CHANGE) };
      if (kind === 'equal') { const n = r.int(2, 4); return { kind, ser, n, c: r.pick([4, 6, 8, 12].filter((x) => x % n === 0)) }; }
      return { kind, ser, vals };
    },
    build: (p) => BOUNDS[p.kind](p),
    check: ['where'],
  };

  // ---------------------------------------------------------------- four or five capacitors
  // The shapes of the networks (0: a capacitor), the leaves numbered in the order drawn; the
  // capacitances chosen so that every block comes out as a multiple of 0.5 µF.
  const SHAPES = [
    ['s', ['p', 0, 0], ['p', 0, 0]],
    ['p', ['s', 0, 0], ['s', 0, 0]],
    ['s', 0, ['p', 0, ['s', 0, 0]]],
    ['p', 0, ['s', 0, ['p', 0, 0]]],
    ['s', ['p', 0, 0], ['p', 0, 0, 0]],
    ['p', ['s', 0, 0], ['s', 0, ['p', 0, 0]]],
  ];
  const nLeaves = (sh) => (Array.isArray(sh) ? sh.slice(1).reduce((s, x) => s + nLeaves(x), 0) : 1);
  function netOf(sh, vals, at = { k: 0 }) {
    if (!Array.isArray(sh)) { const i = at.k++; return leaf(String(i + 1), vals[i]); }
    return { [sh[0]]: sh.slice(1).map((x) => netOf(x, vals, at)) };
  }
  const leaves = (n) => (n.c ? [n.c] : (n.s || n.p).flatMap(leaves));
  const groups = (n) => (n.c ? [] : [...(n.s || n.p).flatMap(groups), n]); // inside out
  // the capacitance of a net (swap: with the rules of resistors)
  const capOf = (n, swap = false) => (n.c ? n.v : ((n.s && !swap) || (n.p && swap))
    ? 1 / (n.s || n.p).reduce((s, m) => s + 1 / capOf(m, swap), 0) : (n.s || n.p).reduce((s, m) => s + capOf(m, swap), 0));
  const workN = (ser, parts, name) => (parts.length === 2 ? work(ser, parts[0].v, parts[1].v, parts[0].name, parts[1].name, name) : ser
    ? `$\\frac{1}{${name}} = ${parts.map((q) => `\\frac{1}{${q.name}}`).join(' + ')}$, ${L('so', 'also')} $${name} = \\htmlClass{result}{${tq(1 / parts.reduce((s, q) => s + 1 / q.v, 0), 'µF')}}$`
    : `$${name} = ${parts.map((q) => q.name).join(' + ')} = ${parts.map((q) => `${num(q.v)}\\,\\mu\\mathrm{F}`).join(' + ')} = \\htmlClass{result}{${tq(parts.reduce((s, q) => s + q.v, 0), 'µF')}}$`);
  const network = {
    difficulty: 4,
    title: (p) => (p.vals.length === 4 ? L('Four capacitors', 'Vier Kondensatoren') : L('Five capacitors', 'Fünf Kondensatoren')),
    make(r) {
      const shape = r.int(0, SHAPES.length - 1), n = nLeaves(SHAPES[shape]);
      for (let k = 0; k < 4000; k++) {
        const vals = Array.from({ length: n }, () => r.pick(VALS.slice(0, 11))), net = netOf(SHAPES[shape], vals);
        if (groups(net).every((g) => half(capOf(g))) && capOf(net) <= 60) return { shape, vals };
      }
      return { shape: 0, vals: [2, 4, 3, 3] };
    },
    build(p) {
      const net = netOf(SHAPES[p.shape], p.vals), value = capOf(net), n = p.vals.length;
      const nameOf = (m) => (m === net ? 'C' : m.c ? `C_${m.c}` : `C_{${leaves(m).join('')}}`);
      const and = (names) => names.map((x) => `$${x}$`).join(', ').replace(/, ([^,]*)$/, L(' and $1', ' und $1'));
      const solution = groups(net).map((g) => {
        const ser = !!g.s, parts = (g.s || g.p).map((m) => ({ name: nameOf(m), v: capOf(m) }));
        return step(ser ? L('Series: the same charge', 'Serie: dieselbe Ladung') : L('Parallel: the same voltage', 'Parallel: dieselbe Spannung'),
          p$(`${L(`${and(parts.map((q) => q.name))} are ${inWords(ser)}:`, `${and(parts.map((q) => q.name))} sind ${inWords(ser)} geschaltet:`)} ${workN(ser, parts, nameOf(g))}.`));
      });
      const tops = (net.s || net.p).filter((m) => !m.c);
      // the hints: the first group from inside (its parts are capacitors), then the blocks in turn
      const [g0, ...later] = groups(net), ser0 = !!g0.s, parts0 = (g0.s || g0.p).map((m) => ({ name: nameOf(m), v: capOf(m) }));
      const items0 = parts0.map((q) => `$${q.name} = ${tq(q.v, 'µF')}$`), list0 = `${items0.slice(0, -1).join(', ')}${L(' and ', ' und ')}${items0[items0.length - 1]}`;
      const rule0 = ser0 ? `$\\frac{1}{${nameOf(g0)}} = ${parts0.map((q) => `\\frac{1}{${q.name}}`).join(' + ')}$` : `$${nameOf(g0)} = ${parts0.map((q) => q.name).join(' + ')}$`;
      return {
        text: p$(L(`${n === 4 ? 'Four' : 'Five'} capacitors are connected between A and B as shown. Find the total capacitance.`, `${n === 4 ? 'Vier' : 'Fünf'} Kondensatoren sind wie gezeigt zwischen A und B geschaltet. Bestimme die Gesamtkapazität.`)),
        fields: [numF('C', 'C', 'µF', totalWhat(), value, [{ value: capOf(net, true), why: `${L('Resistor rules used.', 'Die Regeln der Widerstände verwendet.')} ${RULES.swap()}`, flag: 'swap' }])],
        figure: () => Fg.network(net),
        solutionFigure: () => Fg.network(net, { reduce: tops.map((m) => [m, leaves(m).join(''), capOf(m)]) }),
        hints: [
          L(`Start inside, with a small group: ${list0}. Are they in series or in parallel with each other?`, `Beginne innen, mit einer kleinen Gruppe: ${list0}. Sind sie in Serie oder parallel zueinander?`),
          ser0 ? L(`They are in series, so the reciprocals add (the other way round than for resistors): ${rule0}.`, `Sie sind in Serie, also addieren sich die Kehrwerte (umgekehrt als bei Widerständen): ${rule0}.`)
            : L(`They are in parallel, so the capacitances add (the other way round than for resistors): ${rule0}.`, `Sie sind parallel, also addieren sich die Kapazitäten (umgekehrt als bei Widerständen): ${rule0}.`),
          L(`That gives $${nameOf(g0)} = ${tq(capOf(g0), 'µF')}$. Replace the group by this one capacitor and go on in the same way: ${and(later.map(nameOf))}, one after the other.`, `Das gibt $${nameOf(g0)} = ${tq(capOf(g0), 'µF')}$. Ersetze die Gruppe durch diesen einen Kondensator und mach gleich weiter: ${and(later.map(nameOf))}, einer nach dem anderen.`),
        ],
        solution,
        results: `$C = ${tq(value, 'µF')}$`,
      };
    },
    check: ['C'],
  };

  // ================================================================ time curves
  // In units of U₀ (or I₀) and τ; a graph runs to 5τ.
  const E = Math.exp, T_END = 5;
  const CURVES = {
    up: (t) => 1 - E(-t), down: (t) => E(-t),
    linUp: (t) => Math.min(1, t / 3), linDown: (t) => Math.max(0, 1 - t / 3),
    // slow at first, then faster: the wrong curvature
    slowUp: (t) => (t >= 3 ? 1 : (E(1.2 * t) - 1) / (E(3.6) - 1)), slowDown: (t) => (t >= 3 ? 0 : 1 - (E(1.2 * t) - 1) / (E(3.6) - 1)),
    // from zero, up to a peak, then down
    hump: (t) => t * E(1 - t),
  };
  const STEPUP = [[0, 0], [1.5, 0], [1.5, 1], [T_END, 1]], STEPDOWN = [[0, 1], [1.5, 1], [1.5, 0], [T_END, 0]];
  const CONST = [[0, 1], [2.5, 1], [2.5, 0], [T_END, 0]];
  const sym = { U: ['U', 'C'], I: ['I', ''], R: ['U', 'R'] };
  const LEVEL = { U: () => `${Fg.Uq()}₀`, I: () => '<tspan class="it">I</tspan>₀', R: () => `${Fg.Uq()}₀` };
  const curveGraph = (q, c, label) => Fg.graph({ curves: [c.pts ? { pts: c.pts } : { f: c.f }], tEnd: T_END, yMax: 1.2, bare: true, name: sym[q], levels: [{ y: 1, label: LEVEL[q]() }], label });
  // the options of a graph question: the right curve and three of four wrong ones (p.drop is
  // left out), in the order p.perm
  function curveField(p, q, list) {
    const wrong = list.slice(1).filter((_, i) => i !== p.drop % (list.length - 1));
    const opts = [list[0], ...wrong].map((c, k) => ({ v: c.id, html: curveGraph(q, c, L(`Graph ${k + 1}`, `Graph ${k + 1}`)), why: c.why || '', flag: c.flag || null, ...(c.nudge ? { nudge: c.nudge } : {}) }));
    rng(p.perm).shuffle(opts);
    const what = { U: L('The voltage $\\Delta V_C$ across the capacitor:', 'Die Spannung $U_C$ über dem Kondensator:'), I: L('The current $I$ (its size):', 'Der Strom $I$ (sein Betrag):'), R: L('The voltage $\\Delta V_R$ across the resistor:', 'Die Spannung $U_R$ über dem Widerstand:') }[q];
    return choiceF('graph', what, list[0].id, opts, { pics: true });
  }
  const WHY = {
    shape: () => L('The change is fastest at the start and then slows down, the closer the capacitor gets to its final voltage: the curve is steepest at $t = 0$ and levels off (an exponential).', 'Die Änderung ist am Anfang am schnellsten und wird dann langsamer, je näher der Kondensator seiner Endspannung kommt: Die Kurve ist bei $t = 0$ am steilsten und flacht ab (eine Exponentialfunktion).'),
    jump: () => L('The voltage of a capacitor cannot jump: it takes time for the charge to flow on or off the plates through the resistor.', 'Die Spannung eines Kondensators kann nicht springen: Es braucht Zeit, bis die Ladung durch den Widerstand auf die Platten oder von ihnen weg geflossen ist.'),
    direction: () => L('That is the other process: charging and discharging swapped.', 'Das ist der andere Vorgang: Laden und Entladen vertauscht.'),
    start: () => L('Right after the switch closes, the current is largest: the whole voltage $\\Delta V_0$ is across the resistor, $I_0 = \\Delta V_0/R$. The current can jump; only the capacitor voltage cannot.', 'Unmittelbar nach dem Schliessen des Schalters ist der Strom am grössten: Die ganze Spannung $U_0$ liegt über dem Widerstand, $I_0 = U_0/R$. Der Strom kann springen, nur die Kondensatorspannung nicht.'),
    current: () => L('The current does not follow the capacitor voltage: it is largest at the start and falls as the capacitor fills, $I = (\\Delta V_0 - \\Delta V_C)/R$.', 'Der Strom folgt nicht der Kondensatorspannung: Er ist am Anfang am grössten und nimmt ab, während sich der Kondensator füllt, $I = (U_0 - U_C)/R$.'),
    constant: () => L('The current is not constant: it falls as the voltage that drives it falls.', 'Der Strom ist nicht konstant: Er nimmt ab, wie die Spannung, die ihn antreibt.'),
  };
  // while the exercise is open: a nudge instead of the explanation, which would give the answer away
  const NUDGE = {
    shape: () => L('Check the shape: when is the change fastest, and why?', 'Prüfe die Form: Wann ist die Änderung am schnellsten, und warum?'),
    direction: () => L('Is the capacitor being charged or discharged here? Does the curve fit that?', 'Wird der Kondensator hier geladen oder entladen? Passt die Kurve dazu?'),
    start: () => L('How large is the current right after the switch closes? Which voltage is across the resistor then?', 'Wie gross ist der Strom unmittelbar nach dem Schliessen des Schalters? Welche Spannung liegt dann über dem Widerstand?'),
    current: () => L('The current does not follow the capacitor voltage: which voltage drives it through the resistor, and how does that voltage change?', 'Der Strom folgt nicht der Kondensatorspannung: Welche Spannung treibt ihn durch den Widerstand, und wie ändert sich diese Spannung?'),
    constant: () => L('Is the current really constant? How does the voltage that drives it change?', 'Ist der Strom wirklich konstant? Wie ändert sich die Spannung, die ihn antreibt?'),
    loop: (charge) => (charge ? L('What does the loop rule say about $\\Delta V_0$, $\\Delta V_R$ and $\\Delta V_C$ at every moment?', 'Was sagt die Maschenregel in jedem Moment über $U_0$, $U_R$ und $U_C$?')
      : L('While discharging there is no battery: how is the resistor connected to the capacitor?', 'Beim Entladen gibt es keine Batterie: Wie ist der Widerstand mit dem Kondensator verbunden?')),
  };
  // the graphs of U_C, I and U_R: the right one first
  const LISTS = {
    U: (charge) => [
      { id: 'exp', f: charge ? CURVES.up : CURVES.down },
      { id: 'other', f: charge ? CURVES.down : CURVES.up, why: WHY.direction(), flag: 'direction', nudge: NUDGE.direction() },
      { id: 'lin', f: charge ? CURVES.linUp : CURVES.linDown, why: WHY.shape(), flag: 'shape', nudge: NUDGE.shape() },
      { id: 'slow', f: charge ? CURVES.slowUp : CURVES.slowDown, why: WHY.shape(), flag: 'shape', nudge: NUDGE.shape() },
      { id: 'step', pts: charge ? STEPUP : STEPDOWN, why: WHY.jump(), flag: 'jump' },
    ],
    I: (charge) => [
      { id: 'exp', f: CURVES.down },
      { id: 'rise', f: CURVES.up, why: charge ? WHY.current() : WHY.start(), flag: charge ? 'current' : 'start', nudge: charge ? NUDGE.current() : NUDGE.start() },
      { id: 'hump', f: CURVES.hump, why: WHY.start(), flag: 'start', nudge: NUDGE.start() },
      { id: 'lin', f: CURVES.linDown, why: WHY.shape(), flag: 'shape', nudge: NUDGE.shape() },
      { id: 'const', pts: CONST, why: WHY.constant(), flag: 'shape', nudge: NUDGE.constant() },
    ],
  };
  // U_R = R·I follows the current: while charging it is the rest, U₀ − U_C; while discharging the
  // resistor is connected straight across the capacitor, U_R = U_C
  LISTS.R = (charge) => LISTS.I(charge).map((c) => (c.id !== 'rise' ? c : charge
    ? { ...c, why: L('That is $\\Delta V_C$. Across the resistor is the rest, $\\Delta V_R = \\Delta V_0 - \\Delta V_C = R\\cdot I$: it follows the current.', 'Das ist $U_C$. Über dem Widerstand liegt der Rest, $U_R = U_0 - U_C = R\\cdot I$: Sie folgt dem Strom.'),
      nudge: L(`That is $\\Delta V_C$. ${NUDGE.loop(true)}`, `Das ist $U_C$. ${NUDGE.loop(true)}`) }
    : { ...c, why: L('While discharging, the resistor is connected straight across the capacitor: $\\Delta V_R = \\Delta V_C$, which falls. A rising curve would be charging.', 'Beim Entladen ist der Widerstand direkt an den Kondensator angeschlossen: $U_R = U_C$, und das nimmt ab. Eine steigende Kurve wäre Laden.'), flag: 'direction',
      nudge: L('While discharging: how is the resistor connected to the capacitor, and what does the capacitor voltage do?', 'Beim Entladen: Wie ist der Widerstand mit dem Kondensator verbunden, und was macht die Kondensatorspannung?') }));

  const SITUATION = {
    charge: () => L('An uncharged capacitor $C$ is connected through a resistor $R$ to a battery with voltage $\\Delta V_0$. At $t = 0$ the switch S is closed.', 'Ein ungeladener Kondensator $C$ ist über einen Widerstand $R$ mit einer Batterie der Spannung $U_0$ verbunden. Bei $t = 0$ wird der Schalter S geschlossen.'),
    discharge: () => L('A capacitor $C$ charged to the voltage $\\Delta V_0$ is discharged through a resistor $R$: at $t = 0$ the switch S is closed.', 'Ein auf die Spannung $U_0$ geladener Kondensator $C$ wird über einen Widerstand $R$ entladen: Bei $t = 0$ wird der Schalter S geschlossen.'),
  };
  const ASK = {
    U: () => L('Which graph shows the voltage $\\Delta V_C$ across the capacitor against time?', 'Welcher Graph zeigt die Spannung $U_C$ über dem Kondensator gegen die Zeit?'),
    I: () => L('Which graph shows the current $I$ (its size) against time?', 'Welcher Graph zeigt den Strom $I$ (seinen Betrag) gegen die Zeit?'),
    R: () => L('Which graph shows the voltage $\\Delta V_R$ across the resistor against time?', 'Welcher Graph zeigt die Spannung $U_R$ über dem Widerstand gegen die Zeit?'),
  };
  // the steps: the start, the end, and the shape between
  function curveSteps(q, charge) {
    const start = charge
      ? L('At $t = 0$ the capacitor is empty, $\\Delta V_C = 0$: its voltage cannot jump. So the whole voltage $\\Delta V_0$ is across the resistor, $\\Delta V_R = \\Delta V_0$, and the current is largest, $I_0 = \\Delta V_0/R$.', 'Bei $t = 0$ ist der Kondensator leer, $U_C = 0$: Seine Spannung kann nicht springen. Also liegt die ganze Spannung $U_0$ über dem Widerstand, $U_R = U_0$, und der Strom ist am grössten, $I_0 = U_0/R$.')
      : L('At $t = 0$ the capacitor still has its full voltage $\\Delta V_C = \\Delta V_0$: its voltage cannot jump. This voltage is across the resistor, so the current is largest at the start, $I_0 = \\Delta V_0/R$.', 'Bei $t = 0$ hat der Kondensator noch seine volle Spannung $U_C = U_0$: Seine Spannung kann nicht springen. Diese Spannung liegt über dem Widerstand, also ist der Strom am Anfang am grössten, $I_0 = U_0/R$.');
    const end = charge
      ? L('Long after, the capacitor is full: $\\Delta V_C = \\Delta V_0$, no current flows, $\\Delta V_R = 0$.', 'Lange danach ist der Kondensator voll: $U_C = U_0$, es fliesst kein Strom, $U_R = 0$.')
      : L('Long after, the capacitor is empty: $\\Delta V_C = 0$ and no current flows.', 'Lange danach ist der Kondensator leer: $U_C = 0$, und es fliesst kein Strom.');
    const between = charge
      ? L('In between, the fuller the capacitor, the smaller the voltage left for the resistor, so the smaller the current, and the more slowly the capacitor charges: $\\Delta V_C = \\Delta V_0\\left(1 - e^{-t/\\tau}\\right)$ rises steeply at first and levels off; $I = I_0\\,e^{-t/\\tau}$ and $\\Delta V_R = \\Delta V_0\\,e^{-t/\\tau}$ fall, steeply at first.', 'Dazwischen gilt: Je voller der Kondensator, desto kleiner die Spannung, die für den Widerstand bleibt, desto kleiner der Strom, und desto langsamer lädt sich der Kondensator: $U_C = U_0\\left(1 - e^{-t/\\tau}\\right)$ steigt zuerst steil an und flacht ab; $I = I_0\\,e^{-t/\\tau}$ und $U_R = U_0\\,e^{-t/\\tau}$ fallen, zuerst steil.')
      : L('In between, the less charge is left, the smaller the voltage, the smaller the current, and the more slowly the charge flows off: $\\Delta V_C = \\Delta V_0\\,e^{-t/\\tau}$ and $I = I_0\\,e^{-t/\\tau}$ fall steeply at first and then more and more slowly.', 'Dazwischen gilt: Je weniger Ladung übrig ist, desto kleiner die Spannung, desto kleiner der Strom, und desto langsamer fliesst die Ladung ab: $U_C = U_0\\,e^{-t/\\tau}$ und $I = I_0\\,e^{-t/\\tau}$ fallen zuerst steil und dann immer langsamer.');
    const which = { U: L('the voltage $\\Delta V_C$', 'die Spannung $U_C$'), I: L('the current', 'der Strom'), R: L('the voltage $\\Delta V_R$', 'die Spannung $U_R$') }[q];
    const across = q === 'R' && !charge ? p$(L('The resistor is connected straight across the capacitor: $\\Delta V_R = \\Delta V_C$ at every moment.', 'Der Widerstand ist direkt an den Kondensator angeschlossen: $U_R = U_C$ in jedem Moment.')) : '';
    return [step(L('Right after switching', 'Unmittelbar nach dem Schalten'), across + p$(start)), step(L('Long after', 'Lange danach'), p$(end)), step(L('In between', 'Dazwischen'), p$(between) + p$(L(`So ${which} follows the <span class="result">curve of the right graph</span>.`, `Also folgt ${which} der <span class="result">Kurve des richtigen Graphen</span>.`)))];
  }
  // the hints of a graph question: the start, the end and the shape between, for this quantity
  // while charging or discharging
  const curveHints = (q, charge) => {
    const name = { U: L('$\\Delta V_C$', '$U_C$'), I: L('the current $I$', 'der Strom $I$'), R: L('$\\Delta V_R$', '$U_R$') }[q];
    const start = charge
      ? { U: L('At $t = 0$ the capacitor is still empty, and its voltage cannot jump: where does the graph of $\\Delta V_C$ start?', 'Bei $t = 0$ ist der Kondensator noch leer, und seine Spannung kann nicht springen: Wo beginnt der Graph von $U_C$?'),
        I: L('At $t = 0$ the capacitor is still empty ($\\Delta V_C = 0$, it cannot jump): which voltage is across $R$ right after closing S, and so how large is $I$ then?', 'Bei $t = 0$ ist der Kondensator noch leer ($U_C = 0$, seine Spannung kann nicht springen): Welche Spannung liegt unmittelbar nach dem Schliessen von S über $R$, und wie gross ist also $I$?'),
        R: L('At $t = 0$ the capacitor is still empty ($\\Delta V_C = 0$, it cannot jump). With the loop rule $\\Delta V_0 = \\Delta V_R + \\Delta V_C$: what is $\\Delta V_R$ right after closing S?', 'Bei $t = 0$ ist der Kondensator noch leer ($U_C = 0$, seine Spannung kann nicht springen). Mit der Maschenregel $U_0 = U_R + U_C$: Wie gross ist $U_R$ unmittelbar nach dem Schliessen von S?') }[q]
      : { U: L('At $t = 0$ the capacitor still has its voltage $\\Delta V_0$, which cannot jump: where does the graph of $\\Delta V_C$ start?', 'Bei $t = 0$ hat der Kondensator noch seine Spannung $U_0$, die nicht springen kann: Wo beginnt der Graph von $U_C$?'),
        I: L('There is no battery: $R$ is connected straight across the capacitor, which still has $\\Delta V_0$ at $t = 0$. How large is $I$ right after closing S?', 'Es gibt keine Batterie: $R$ ist direkt an den Kondensator angeschlossen, der bei $t = 0$ noch $U_0$ hat. Wie gross ist $I$ unmittelbar nach dem Schliessen von S?'),
        R: L('There is no battery: $R$ is connected straight across the capacitor, so $\\Delta V_R = \\Delta V_C$ at every moment. Where does it start at $t = 0$?', 'Es gibt keine Batterie: $R$ ist direkt an den Kondensator angeschlossen, also $U_R = U_C$ in jedem Moment. Wo beginnt sie bei $t = 0$?') }[q];
    const end = charge
      ? L(`Long after closing S the capacitor is full, $\\Delta V_C = \\Delta V_0$, and no current flows any more. Where does ${name} end?`, `Lange nach dem Schliessen von S ist der Kondensator voll, $U_C = U_0$, und es fliesst kein Strom mehr. Wo endet ${name}?`)
      : L(`Long after closing S all the charge has flowed off through $R$ and no current flows any more. Where does ${name} end?`, `Lange nach dem Schliessen von S ist alle Ladung über $R$ abgeflossen, und es fliesst kein Strom mehr. Wo endet ${name}?`);
    const between = charge
      ? L(`In between, the current $I = \\frac{\\Delta V_0 - \\Delta V_C}{R}$ is driven by what is left of $\\Delta V_0$: when is it largest, and so when does ${name} change fastest?`, `Dazwischen wird der Strom $I = \\frac{U_0 - U_C}{R}$ vom Rest von $U_0$ angetrieben: Wann ist er am grössten, und wann ändert sich also ${name} am schnellsten?`)
      : L(`In between, the current $I = \\frac{\\Delta V_C}{R}$ is driven by the capacitor itself: when is it largest, and so when does ${name} change fastest?`, `Dazwischen wird der Strom $I = \\frac{U_C}{R}$ vom Kondensator selbst angetrieben: Wann ist er am grössten, und wann ändert sich also ${name} am schnellsten?`);
    return [start, end, between];
  };
  const curveType = (q, difficulty, charge) => ({
    difficulty,
    title: () => ({ U: L('Voltage of the capacitor', 'Spannung des Kondensators'), I: L('The current', 'Der Strom'), R: L('Voltage of the resistor', 'Spannung des Widerstands') }[q]),
    make: (r) => ({ charge, drop: r.int(0, 3), perm: r.int(1, 99999) }),
    build(p) {
      const kind = p.charge ? 'charge' : 'discharge';
      return {
        text: p$(SITUATION[kind]()) + p$(ASK[q]()),
        situation: p$(SITUATION[kind]()),
        fields: [curveField(p, q, LISTS[q](p.charge))],
        figure: () => Fg.rc(kind),
        solutionFigure: () => `<div class="fig">${Fg.graph({ curves: [{ f: (q === 'U' && p.charge) ? CURVES.up : CURVES.down }], tEnd: T_END, yMax: 1.2, bare: true, name: sym[q], levels: [{ y: 1, label: LEVEL[q]() }], marks: [{ t: 1, label: '<tspan class="it">τ</tspan>' }] })}</div>`,
        hints: curveHints(q, p.charge),
        solution: curveSteps(q, p.charge),
        results: L('the exponential curve', 'die Exponentialkurve'),
        ask: ASK[q](),
        watch: () => rcWatch({ charge: p.charge, U0: 1, I0: 1, tau: 1, unit: 'τ', norm: true, marks: graphMarks(q, p.charge) }),
      };
    },
    check: ['graph'],
  });

  // The voltages and the current at a moment, with numbers: right after switching ('start'), when
  // the capacitor has the voltage U_C ('mid'), or when the current is I ('fromI'). While charging
  // the loop rule U₀ = U_R + U_C, while discharging U_R = U_C; and I = U_R/R (kΩ, mA).
  const Vs = (i) => L(`\\Delta V_${i}`, `U_${i}`);
  const loopType = (charge) => ({
    difficulty: 2,
    title: () => (charge ? L('Charging with numbers', 'Laden mit Zahlen') : L('Discharging with numbers', 'Entladen mit Zahlen')),
    make(r) {
      const U0 = r.pick([6, 8, 9, 10, 12, 20]), R = r.pick([1, 2, 4, 5, 10]), moment = r.pick(['start', 'mid', 'mid', 'fromI']);
      const [a, b] = r.pick([[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]].filter(([x, y]) => (U0 * x) % y === 0));
      return { charge, U0, R, moment, UC: (U0 * a) / b };
    },
    build(p) {
      const { U0, R, moment } = p, kind = charge ? 'charge' : 'discharge';
      const UC = moment === 'start' ? (charge ? 0 : U0) : p.UC, UR = charge ? U0 - UC : UC, I = UR / R;
      const tm = moment === 'start' ? 0 : charge ? -Math.log(1 - UC / U0) : Math.log(U0 / UC); // in units of τ
      const rule = charge ? L('The loop rule holds at every moment: $\\Delta V_0 = \\Delta V_R + \\Delta V_C$.', 'Die Maschenregel gilt in jedem Moment: $U_0 = U_R + U_C$.')
        : L('The resistor is connected straight across the capacitor: $\\Delta V_R = \\Delta V_C$ at every moment.', 'Der Widerstand ist direkt an den Kondensator angeschlossen: $U_R = U_C$ in jedem Moment.');
      const ohm = L('The current through the resistor is $I = \\Delta V_R/R$; with $R$ in kΩ it comes out in mA.', 'Der Strom durch den Widerstand ist $I = U_R/R$; mit $R$ in kΩ ergibt er sich in mA.');
      const sit = charge
        ? L(`An uncharged capacitor is connected through a resistor $R = ${tq(R, 'kΩ')}$ to a battery with the voltage $\\Delta V_0 = ${tq(U0, 'V')}$. At $t = 0$ the switch S is closed.`, `Ein ungeladener Kondensator ist über einen Widerstand $R = ${tq(R, 'kΩ')}$ mit einer Batterie der Spannung $U_0 = ${tq(U0, 'V')}$ verbunden. Bei $t = 0$ wird der Schalter S geschlossen.`)
        : L(`A capacitor charged to $\\Delta V_0 = ${tq(U0, 'V')}$ is discharged through a resistor $R = ${tq(R, 'kΩ')}$: at $t = 0$ the switch S is closed.`, `Ein auf $U_0 = ${tq(U0, 'V')}$ geladener Kondensator wird über einen Widerstand $R = ${tq(R, 'kΩ')}$ entladen: Bei $t = 0$ wird der Schalter S geschlossen.`);
      const ask = {
        start: L('Right after the switch is closed: find the voltage $\\Delta V_R$ across the resistor and the current $I$.', 'Unmittelbar nach dem Schliessen des Schalters: Bestimme die Spannung $U_R$ über dem Widerstand und den Strom $I$.'),
        mid: L(`Some time later the capacitor has the voltage $\\Delta V_C = ${tq(UC, 'V')}$. Find $\\Delta V_R$ and $I$ at this moment.`, `Etwas später hat der Kondensator die Spannung $U_C = ${tq(UC, 'V')}$. Bestimme $U_R$ und $I$ in diesem Moment.`),
        fromI: L(`Some time later the current is $I = ${tq(I, 'mA')}$. Find the voltages $\\Delta V_R$ and $\\Delta V_C$ at this moment.`, `Etwas später ist der Strom $I = ${tq(I, 'mA')}$. Bestimme die Spannungen $U_R$ und $U_C$ in diesem Moment.`),
      }[moment];
      // the moment without the question (for the check, which asks for one of the two)
      const when = {
        start: L('Look at the moment right after the switch is closed.', 'Betrachte den Moment unmittelbar nach dem Schliessen des Schalters.'),
        mid: L(`Some time later the capacitor has the voltage $\\Delta V_C = ${tq(UC, 'V')}$.`, `Etwas später hat der Kondensator die Spannung $U_C = ${tq(UC, 'V')}$.`),
        fromI: L(`Some time later the current is $I = ${tq(I, 'mA')}$.`, `Etwas später ist der Strom $I = ${tq(I, 'mA')}$.`),
      }[moment];
      const LOOP = charge ? L('Across the resistor is the rest: $\\Delta V_R = \\Delta V_0 - \\Delta V_C$, not $\\Delta V_C$ itself.', 'Über dem Widerstand liegt der Rest: $U_R = U_0 - U_C$, nicht $U_C$ selbst.')
        : L('While discharging there is no battery: the resistor is connected straight across the capacitor, $\\Delta V_R = \\Delta V_C$.', 'Beim Entladen gibt es keine Batterie: Der Widerstand ist direkt an den Kondensator angeschlossen, $U_R = U_C$.');
      const loopNudge = NUDGE.loop(charge);
      const START = L('That is the current at the start, $I_0 = \\Delta V_0/R$. Since then it has fallen, with the voltage across the resistor.', 'Das ist der Strom am Anfang, $I_0 = U_0/R$. Seither hat er abgenommen, mit der Spannung über dem Widerstand.');
      const urF = numF('UR', Vs('R'), 'V', L('across the resistor', 'über dem Widerstand'), UR, moment === 'start' ? [] : moment === 'fromI' ? [{ value: I / R, why: ohm, flag: null }]
        : charge ? [{ value: UC, why: LOOP, flag: 'loop', nudge: loopNudge }, { value: U0, why: START, flag: 'loop' }] : [{ value: U0 - UC, why: LOOP, flag: 'direction', nudge: loopNudge }, { value: U0, why: START, flag: 'loop' }]);
      const second = moment === 'fromI'
        ? numF('UC', Vs('C'), 'V', L('across the capacitor', 'über dem Kondensator'), UC, [{ value: charge ? UR : U0 - UR, why: LOOP, flag: charge ? 'loop' : 'direction', nudge: loopNudge }])
        : numF('I', 'I', 'mA', L('current', 'Strom'), I, moment === 'start' ? [{ value: U0 * R, why: ohm, flag: null }]
          : [{ value: charge ? UC / R : (U0 - UC) / R, why: charge ? WHY.current() : LOOP, flag: charge ? 'current' : 'direction', nudge: charge ? NUDGE.current() : loopNudge }, { value: U0 / R, why: START, flag: 'loop' }]);
      const solution = [];
      if (moment === 'start') {
        solution.push(step(L('Right after switching', 'Unmittelbar nach dem Schalten'), p$(charge
          ? L(`The capacitor is still empty, $\\Delta V_C = 0$: its voltage cannot jump. So the whole battery voltage is across the resistor: $\\Delta V_R = \\Delta V_0 = \\htmlClass{result}{${tq(UR, 'V')}}$.`, `Der Kondensator ist noch leer, $U_C = 0$: Seine Spannung kann nicht springen. Also liegt die ganze Batteriespannung über dem Widerstand: $U_R = U_0 = \\htmlClass{result}{${tq(UR, 'V')}}$.`)
          : L(`The capacitor still has its whole voltage, $\\Delta V_C = \\Delta V_0$: its voltage cannot jump. The resistor is connected straight across it: $\\Delta V_R = \\Delta V_C = \\htmlClass{result}{${tq(UR, 'V')}}$.`, `Der Kondensator hat noch seine ganze Spannung, $U_C = U_0$: Seine Spannung kann nicht springen. Der Widerstand ist direkt an ihn angeschlossen: $U_R = U_C = \\htmlClass{result}{${tq(UR, 'V')}}$.`))));
      } else if (moment === 'mid') {
        solution.push(step(L('The voltage of the resistor', 'Die Spannung des Widerstands'), p$(rule) + p$(charge ? `$${Vs('R')} = ${Vs('0')} - ${Vs('C')} = ${tq(U0, 'V')} - ${tq(UC, 'V')} = \\htmlClass{result}{${tq(UR, 'V')}}$` : `$${Vs('R')} = ${Vs('C')} = \\htmlClass{result}{${tq(UR, 'V')}}$`)));
      } else {
        solution.push(step(L('The voltage of the resistor', 'Die Spannung des Widerstands'), p$(`$${Vs('R')} = R\\cdot I = ${tq(R, 'kΩ')}\\cdot ${tq(I, 'mA')} = \\htmlClass{result}{${tq(UR, 'V')}}$`)));
        solution.push(step(L('The voltage of the capacitor', 'Die Spannung des Kondensators'), p$(rule) + p$(charge ? `$${Vs('C')} = ${Vs('0')} - ${Vs('R')} = ${tq(U0, 'V')} - ${tq(UR, 'V')} = \\htmlClass{result}{${tq(UC, 'V')}}$` : `$${Vs('C')} = ${Vs('R')} = \\htmlClass{result}{${tq(UC, 'V')}}$`)));
      }
      if (moment !== 'fromI') solution.push(step(L('The current', 'Der Strom'), p$(`$I = \\frac{${Vs('R')}}{R} = \\frac{${tq(UR, 'V')}}{${tq(R, 'kΩ')}} = \\htmlClass{result}{${tq(I, 'mA')}}$`)));
      return {
        text: p$(sit) + p$(ask),
        situation: p$(sit) + p$(when),
        fields: [urF, second],
        figure: () => Fg.rc(kind, { R: `${num(R)} kΩ`, U0: `${num(U0)} V` }),
        solutionFigure: () => Fg.rc(kind, { closed: true, cur: true, R: `${num(R)} kΩ`, U0: `${num(U0)} V` }),
        hints: (() => {
          const ohmV = L(`Then Ohm's law for the resistor, $I = \\frac{${Vs('R')}}{R}$, with $R = ${tq(R, 'kΩ')}$: volts divided by kilohms give milliamperes.`, `Dann das ohmsche Gesetz für den Widerstand, $I = \\frac{${Vs('R')}}{R}$, mit $R = ${tq(R, 'kΩ')}$: Volt durch Kiloohm gibt Milliampere.`);
          if (moment === 'start') return [
            charge ? L('Right after closing S the capacitor is still uncharged, and its voltage cannot jump: what is $\\Delta V_C$ at this moment?', 'Unmittelbar nach dem Schliessen von S ist der Kondensator noch ungeladen, und seine Spannung kann nicht springen: Wie gross ist $U_C$ in diesem Moment?')
              : L(`Right after closing S: what voltage does the capacitor still have (it cannot jump)? There is no battery: how is $R = ${tq(R, 'kΩ')}$ connected to it?`, `Unmittelbar nach dem Schliessen von S: Welche Spannung hat der Kondensator noch (sie kann nicht springen)? Es gibt keine Batterie: Wie ist $R = ${tq(R, 'kΩ')}$ an ihn angeschlossen?`),
            charge ? L(`${rule} $${Vs('0')}$ is the battery's $${tq(U0, 'V')}$: with the capacitor's voltage at this moment, what is left for $${Vs('R')}$?`, `${rule} $${Vs('0')}$ sind die $${tq(U0, 'V')}$ der Batterie: Was bleibt mit der Spannung des Kondensators in diesem Moment für $${Vs('R')}$?`) : rule,
            ohmV,
          ];
          if (moment === 'mid') return [
            charge ? L(`The battery gives $${tq(U0, 'V')}$, of which the capacitor now has $${tq(UC, 'V')}$: how much is left for the resistor?`, `Die Batterie gibt $${tq(U0, 'V')}$, davon hat der Kondensator jetzt $${tq(UC, 'V')}$: Wie viel bleibt für den Widerstand?`)
              : L(`The capacitor is down to $${tq(UC, 'V')}$ from $${tq(U0, 'V')}$. There is no battery: how is the resistor connected to the capacitor?`, `Der Kondensator ist von $${tq(U0, 'V')}$ auf $${tq(UC, 'V')}$ gesunken. Es gibt keine Batterie: Wie ist der Widerstand mit dem Kondensator verbunden?`),
            charge ? L(`${rule} Two of the three voltages are given here: solve for $${Vs('R')}$.`, `${rule} Zwei der drei Spannungen sind hier gegeben: Löse nach $${Vs('R')}$ auf.`)
              : L(`${rule} The $${tq(U0, 'V')}$ of the start no longer count.`, `${rule} Die $${tq(U0, 'V')}$ vom Anfang zählen nicht mehr.`),
            ohmV,
          ];
          return [
            L(`The current $${tq(I, 'mA')}$ flows through $R = ${tq(R, 'kΩ')}$: which of the voltages does it tell you directly?`, `Der Strom $${tq(I, 'mA')}$ fliesst durch $R = ${tq(R, 'kΩ')}$: Welche der Spannungen verrät er dir direkt?`),
            L(`Ohm's law for the resistor, $${Vs('R')} = R\\cdot I$, with $R$ in kΩ and $I$ in mA: kilohms times milliamperes give volts.`, `Ohmsches Gesetz für den Widerstand, $${Vs('R')} = R\\cdot I$, mit $R$ in kΩ und $I$ in mA: Kiloohm mal Milliampere gibt Volt.`),
            charge ? L(`Then the capacitor: ${rule.charAt(0).toLowerCase() + rule.slice(1)} Here $${Vs('0')} = ${tq(U0, 'V')}$.`, `Dann der Kondensator: ${rule} Hier ist $${Vs('0')} = ${tq(U0, 'V')}$.`)
              : L('Then the capacitor: while discharging there is no battery, and the resistor is connected straight across the capacitor.', 'Dann der Kondensator: Beim Entladen gibt es keine Batterie, und der Widerstand ist direkt an den Kondensator angeschlossen.'),
          ];
        })(),
        solution,
        results: moment === 'fromI' ? `$${Vs('R')} = ${tq(UR, 'V')}$, $${Vs('C')} = ${tq(UC, 'V')}$` : `$${Vs('R')} = ${tq(UR, 'V')}$, $I = ${tq(I, 'mA')}$`,
        // τ is not known: times in units of τ; the moment asked for, where U_C has its value
        watch: () => rcWatch({ charge, U0, I0: U0 / R, tau: 1, unit: 'τ', R: `${num(R)} kΩ`, U0l: `${num(U0)} V`, moment: tm,
          marks: (w, get) => [['UR', 'UR', 'V'], moment === 'fromI' ? ['UC', 'UC', 'V'] : ['I', 'I', 'mA']].map(([key, q, u]) => {
            const x = get(key), when = moment === 'start' ? '<i>t</i> = 0⁺' : `<i>t</i> ≈ ${tH(w, tm)}`;
            return numMark(key, q, tm, x, `${yourAnswer()} (${when}): ${QH[q]()} = ${num(x)} ${u}`);
          }) }),
      };
    },
    check: ['UR'],
  });

  // ================================================================ the time constant
  const LN2 = Math.LN2;
  const tUnitOf = (p) => p.unit;
  const WHY_HALF = () => L('That is where the voltage is $\\Delta V_0/2$: the half-life $T_{1/2} = \\tau\\cdot\\ln 2 \\approx 0.69\\,\\tau$, shorter than $\\tau$.', 'Dort ist die Spannung $U_0/2$: die Halbwertszeit $T_{1/2} = \\tau\\cdot\\ln 2 \\approx 0.69\\,\\tau$, kürzer als $\\tau$.');
  const WHY_TAU = () => L('That is the time constant $\\tau$, where the voltage has fallen to 37 % (or risen to 63 %). The half-life is where it is $\\Delta V_0/2$.', 'Das ist die Zeitkonstante $\\tau$, bei der die Spannung auf 37 % gefallen (oder auf 63 % gestiegen) ist. Die Halbwertszeit ist dort, wo sie $U_0/2$ ist.');
  const WHY_LEVEL = (charge) => (charge ? L('After $\\tau$ the capacitor is charged to 63 % of $\\Delta V_0$ (it has $e^{-1} \\approx 37\\,\\%$ to go), not to 37 %.', 'Nach $\\tau$ ist der Kondensator auf 63 % von $U_0$ geladen (es fehlen noch $e^{-1} \\approx 37\\,\\%$), nicht auf 37 %.') : L('After $\\tau$ the voltage has fallen to 37 % of $\\Delta V_0$ ($e^{-1} \\approx 0.37$), not to 63 %.', 'Nach $\\tau$ ist die Spannung auf 37 % von $U_0$ gefallen ($e^{-1} \\approx 0.37$), nicht auf 63 %.'));
  // the graph of U_C(t) of a reading exercise, with its levels and marks as asked
  function readGraph(p, tau, o = {}) {
    const f = p.charge ? (t) => p.U0 * (1 - E(-t / tau)) : (t) => p.U0 * E(-t / tau);
    return `<div class="fig">${Fg.graph({ curves: [{ f }], tEnd: p.tEnd, yMax: p.U0 * 1.1, tStep: p.tStep, yStep: p.U0 <= 6 ? 1 : p.U0 <= 12 ? 2 : 4, name: ['U', 'C'], unit: 'V', tUnit: tUnitOf(p), levels: o.levels, marks: o.marks, dots: o.dots, lines: o.lines, read: o.read && { m: o.read, U0: p.U0, tau, charge: p.charge }, label: L('The voltage across the capacitor against time', 'Die Spannung über dem Kondensator gegen die Zeit') })}</div>`;
  }

  // T½, then after k = 2 or 3 half-lives: the time until the voltage (while charging: the gap to
  // U₀) is down to 1/2^k ('time'), or the voltage at t = k·T½ ('volt')
  const FRAC = { 2: ['\\tfrac{1}{4}', '\\tfrac{3}{4}', '¼', '¾'], 3: ['\\tfrac{1}{8}', '\\tfrac{7}{8}', '⅛', '⅞'] };
  const readHalf = {
    difficulty: 2,
    title: () => L('The half-life', 'Die Halbwertszeit'),
    make(r) {
      // about ten labels on the time axis; T½ on a line of the grid
      const th = r.pick([1, 2, 3, 4, 6, 8]), unit = r.pick(['s', 'ms']), tStep = [0.5, 1, 2, 4].find((x) => (4.5 * th) / x <= 10);
      return { charge: r.next() < 0.4, U0: r.pick([6, 8, 10, 12]), th, unit, tStep, tEnd: Math.ceil((4.5 * th) / tStep) * tStep, k: r.pick([2, 3]), ask: r.pick(['time', 'volt']) };
    },
    build(p) {
      const { th, U0, charge, unit, k, ask } = p, tau = th / LN2, part = 1 / 2 ** k;
      const q = charge ? U0 * (1 - part) : U0 * part, frac = FRAC[k][charge ? 1 : 0], fr = FRAC[k][charge ? 3 : 2], t2 = k * th;
      const halves = charge ? L('While charging, the gap to $\\Delta V_0$ halves in every half-life: after one it is $\\Delta V_0/2$, after two $\\Delta V_0/4$, after three $\\Delta V_0/8$.', 'Beim Laden halbiert sich der Abstand zu $U_0$ in jeder Halbwertszeit: Nach einer ist er $U_0/2$, nach zweien $U_0/4$, nach dreien $U_0/8$.')
        : L('While discharging, the voltage halves in every half-life: $\\Delta V_0 \\to \\Delta V_0/2 \\to \\Delta V_0/4 \\to \\Delta V_0/8$.', 'Beim Entladen halbiert sich die Spannung in jeder Halbwertszeit: $U_0 \\to U_0/2 \\to U_0/4 \\to U_0/8$.');
      const COUNT = L('In every half-life the voltage halves again (while charging, the gap to $\\Delta V_0$): count the half-lives, one by one.', 'In jeder Halbwertszeit halbiert sich die Spannung wieder (beim Laden der Abstand zu $U_0$): Zähle die Halbwertszeiten, eine nach der anderen.');
      const second = ask === 'time'
        ? numF('t2', 't_2', unit, L(`until ${fr} ΔV₀`, `bis ${fr} U₀`), t2, [{ value: (k - 0.5) * th, why: COUNT, flag: 'shape' }, { value: k * tau, why: WHY_TAU(), flag: 'half' }], 0.08)
        : numF('t2', Vs('2'), 'V', L(`at t = ${num(t2)} ${unit}`, `bei t = ${num(t2)} ${unit}`), q, [{ value: charge ? U0 * (1 - 2 * part) : 2 * U0 * part, why: COUNT, flag: null }], 0.1);
      const askText = ask === 'time'
        ? (charge ? L(`and the time $t_2$ until it is charged to $${frac}\\,\\Delta V_0 = ${tq(q, 'V')}$.`, `und die Zeit $t_2$, bis er auf $${frac}\\,U_0 = ${tq(q, 'V')}$ geladen ist.`) : L(`and the time $t_2$ until the voltage has fallen to $${frac}\\,\\Delta V_0 = ${tq(q, 'V')}$.`, `und die Zeit $t_2$, bis die Spannung auf $${frac}\\,U_0 = ${tq(q, 'V')}$ gefallen ist.`))
        : L(`and the voltage $\\Delta V_2$ at $t = ${tq(t2, unit)}$.`, `und die Spannung $U_2$ bei $t = ${tq(t2, unit)}$.`);
      const twoText = ask === 'time'
        ? L(`After ${k} half-lives the ${charge ? 'gap to $\\Delta V_0$' : 'voltage'} is down to $${FRAC[k][0]}$ of $\\Delta V_0$${charge ? `, so the capacitor is at $${frac}\\,\\Delta V_0$` : ''}: $t_2 = ${k}\\,T_{1/2} = \\htmlClass{result}{${tq(t2, unit)}}$.`, `Nach ${k} Halbwertszeiten ist ${charge ? 'der Abstand zu $U_0$' : 'die Spannung'} auf $${FRAC[k][0]}$ von $U_0$ gesunken${charge ? `, der Kondensator also bei $${frac}\\,U_0$` : ''}: $t_2 = ${k}\\,T_{1/2} = \\htmlClass{result}{${tq(t2, unit)}}$.`)
        : L(`$t = ${tq(t2, unit)}$ is ${k} half-lives: the ${charge ? 'gap to $\\Delta V_0$' : 'voltage'} is down to $${FRAC[k][0]}$ of $\\Delta V_0$, so $\\Delta V_2 = ${frac}\\cdot ${tq(U0, 'V')} = \\htmlClass{result}{${tq(q, 'V')}}$.`, `$t = ${tq(t2, unit)}$ sind ${k} Halbwertszeiten: ${charge ? 'Der Abstand zu $U_0$' : 'Die Spannung'} ist auf $${FRAC[k][0]}$ von $U_0$ gesunken, also $U_2 = ${frac}\\cdot ${tq(U0, 'V')} = \\htmlClass{result}{${tq(q, 'V')}}$.`);
      const given = p$(charge ? L(`A capacitor is charged through a resistor to $\\Delta V_0 = ${tq(U0, 'V')}$. The graph shows its voltage against time.`, `Ein Kondensator wird über einen Widerstand auf $U_0 = ${tq(U0, 'V')}$ geladen. Der Graph zeigt seine Spannung gegen die Zeit.`) : L(`A capacitor charged to $\\Delta V_0 = ${tq(U0, 'V')}$ is discharged through a resistor. The graph shows its voltage against time.`, `Ein auf $U_0 = ${tq(U0, 'V')}$ geladener Kondensator wird über einen Widerstand entladen. Der Graph zeigt seine Spannung gegen die Zeit.`));
      const point = p$(`<span class="note">${L('Point at the graph to read its coordinates.', 'Zeige auf den Graphen, um seine Koordinaten abzulesen.')}</span>`);
      return {
        situation: given + point,
        text: given +
          p$(`${charge ? L('Read the half-life $T_{1/2}$ (the time until the capacitor is charged to $\\Delta V_0/2$),', 'Lies die Halbwertszeit $T_{1/2}$ ab (die Zeit, bis der Kondensator auf $U_0/2$ geladen ist)') : L('Read the half-life $T_{1/2}$,', 'Lies die Halbwertszeit $T_{1/2}$ ab')} ${askText}`) + point,
        fields: [
          numF('th', 'T_{1/2}', unit, L('half-life', 'Halbwertszeit'), th, [{ value: tau, why: WHY_TAU(), flag: 'half' }, { value: t2, why: L(`At $t = ${tq(t2, unit)}$ the voltage is $${frac}\\,\\Delta V_0$: that is $${k}\\,T_{1/2}$.`, `Bei $t = ${tq(t2, unit)}$ ist die Spannung $${frac}\\,U_0$: Das ist $${k}\\,T_{1/2}$.`), flag: null,
            nudge: L(`At $t = ${tq(t2, unit)}$ the voltage is $${frac}\\,\\Delta V_0$, not $\\Delta V_0/2$. Where does the curve reach $\\Delta V_0/2$?`, `Bei $t = ${tq(t2, unit)}$ ist die Spannung $${frac}\\,U_0$, nicht $U_0/2$. Wo erreicht die Kurve $U_0/2$?`) }], 0.08),
          second,
        ],
        figure: () => readGraph(p, tau, { levels: [{ y: U0 }], read: 'xy' }),
        solutionFigure: () => readGraph(p, tau, { levels: [{ y: U0 / 2 }, { y: q }], marks: [{ t: th }, { t: t2 }], dots: [[th, U0 / 2], [t2, q]] }),
        hints: [
          L(`The half-life is the time until the voltage is $\\Delta V_0/2 = ${tq(U0 / 2, 'V')}$: find that height on the vertical axis, go across to the curve and down to the time axis.`, `Die Halbwertszeit ist die Zeit, bis die Spannung $U_0/2 = ${tq(U0 / 2, 'V')}$ ist: Suche diese Höhe auf der senkrechten Achse, geh hinüber zur Kurve und hinunter zur Zeitachse.`),
          ask === 'time'
            ? (charge ? L(`Charged to $${frac}\\,\\Delta V_0$ means a gap of $${FRAC[k][0]}\\,\\Delta V_0$ left to $\\Delta V_0 = ${tq(U0, 'V')}$. The gap halves in every half-life, $${tq(U0, 'V')} \\to ${tq(U0 / 2, 'V')} \\to \\dots$: how many halvings until it is $${tq(U0 - q, 'V')}$?`, `Auf $${frac}\\,U_0$ geladen heisst: Bis $U_0 = ${tq(U0, 'V')}$ fehlt noch $${FRAC[k][0]}\\,U_0$. Dieser Abstand halbiert sich in jeder Halbwertszeit, $${tq(U0, 'V')} \\to ${tq(U0 / 2, 'V')} \\to \\dots$: Wie viele Halbierungen, bis er $${tq(U0 - q, 'V')}$ ist?`)
              : L(`The voltage halves in every half-life, $${tq(U0, 'V')} \\to ${tq(U0 / 2, 'V')} \\to \\dots$: how many halvings until it is $${tq(q, 'V')}$?`, `Die Spannung halbiert sich in jeder Halbwertszeit, $${tq(U0, 'V')} \\to ${tq(U0 / 2, 'V')} \\to \\dots$: Wie viele Halbierungen, bis sie $${tq(q, 'V')}$ ist?`))
            : L(`How many half-lives $T_{1/2}$ fit into $t = ${tq(t2, unit)}$? In each one the ${charge ? 'gap to $\\Delta V_0$' : 'voltage'} halves, starting from $${tq(U0, 'V')} \\to ${tq(U0 / 2, 'V')}$.`, `Wie viele Halbwertszeiten $T_{1/2}$ passen in $t = ${tq(t2, unit)}$? In jeder halbiert sich ${charge ? 'der Abstand zu $U_0$' : 'die Spannung'}, von $${tq(U0, 'V')} \\to ${tq(U0 / 2, 'V')}$ an.`),
        ],
        solution: [
          step(L('The half-life', 'Die Halbwertszeit'), p$(L(`The curve reaches $\\Delta V_0/2 = ${tq(U0 / 2, 'V')}$ at $T_{1/2} = \\htmlClass{result}{${tq(th, unit)}}$.`, `Die Kurve erreicht $U_0/2 = ${tq(U0 / 2, 'V')}$ bei $T_{1/2} = \\htmlClass{result}{${tq(th, unit)}}$.`))),
          step(L(`${k === 2 ? 'Two' : 'Three'} half-lives`, `${k === 2 ? 'Zwei' : 'Drei'} Halbwertszeiten`), p$(halves) + p$(twoText)),
          step(L('The time constant', 'Die Zeitkonstante'), p$(L(`From $T_{1/2} = \\tau\\cdot\\ln 2$: $\\tau = T_{1/2}/\\ln 2 \\approx 1.44\\cdot ${tq(th, unit)} \\approx ${tq(tau, unit)}$.`, `Aus $T_{1/2} = \\tau\\cdot\\ln 2$: $\\tau = T_{1/2}/\\ln 2 \\approx 1.44\\cdot ${tq(th, unit)} \\approx ${tq(tau, unit)}$.`))),
        ],
        results: `$T_{1/2} = ${tq(th, unit)}$, ${ask === 'time' ? `$t_2 = ${tq(t2, unit)}$` : `$${Vs('2')} = ${tq(q, 'V')}$`}`,
        watch: () => rcWatch({ charge, U0, I0: null, tau, unit, U0l: `${num(U0)} V`, keep: true,
          marks: (w, get) => {
            const a = get('th'), b = get('t2');
            return [numMark('th', 'UC', a, U0 / 2, `${yourAnswer()}: <i>T</i><sub>½</sub> = ${tH(w, a)}`),
              ask === 'time' ? numMark('t2', 'UC', b, q, `${yourAnswer()}: <i>t</i><sub>2</sub> = ${tH(w, b)}`) : numMark('t2', 'UC', t2, b, `${yourAnswer()}: ${Vh('2')} = ${num(b)} V`)];
          } }),
      };
    },
    check: ['th', 't2'],
  };

  const readTau = {
    difficulty: 3,
    title: () => L('The time constant', 'Die Zeitkonstante'),
    make(r) {
      const tau = r.pick([1, 2, 4, 10, 20]);
      return { charge: r.next() < 0.5, U0: r.pick([10, 10, 20]), tau, unit: r.pick(['s', 'ms']), tStep: tau / 2, tEnd: 5 * tau };
    },
    build(p) {
      const { tau, U0, charge, unit } = p, lvl = charge ? 0.63 * U0 : 0.37 * U0;
      const tangent = charge ? [[0, 0], [tau, U0]] : [[0, U0], [tau, 0]];
      return {
        text: p$(charge ? L(`A capacitor is charged through a resistor to $\\Delta V_0 = ${tq(U0, 'V')}$.`, `Ein Kondensator wird über einen Widerstand auf $U_0 = ${tq(U0, 'V')}$ geladen.`) : L(`A capacitor charged to $\\Delta V_0 = ${tq(U0, 'V')}$ is discharged through a resistor.`, `Ein auf $U_0 = ${tq(U0, 'V')}$ geladener Kondensator wird über einen Widerstand entladen.`)) +
          p$(L('Read the time constant $\\tau = R\\cdot C$ from the graph.', 'Lies die Zeitkonstante $\\tau = R\\cdot C$ aus dem Graphen ab.')) +
          p$(`<span class="note">${L('Point at the graph to see the tangent to the curve there.', 'Zeige auf den Graphen, um dort die Tangente an die Kurve zu sehen.')}</span>`),
        fields: [numF('tau', '\\tau', unit, L('time constant', 'Zeitkonstante'), tau, [
          { value: tau * LN2, why: WHY_HALF(), flag: 'half' },
          { value: tau * Math.log(1 / 0.63), why: WHY_LEVEL(charge), flag: 'level' },
        ], 0.1)],
        figure: () => readGraph(p, tau, { levels: [{ y: U0 }], read: 'tan' }),
        solutionFigure: () => readGraph(p, tau, { levels: [{ y: U0 }, { y: lvl }], marks: [{ t: tau }], dots: [[tau, lvl]], lines: [tangent] }),
        hints: [
          charge ? L('After one time constant $\\tau$ the capacitor is charged to $1 - e^{-1} \\approx 63\\,\\%$ of $\\Delta V_0$.', 'Nach einer Zeitkonstante $\\tau$ ist der Kondensator auf $1 - e^{-1} \\approx 63\\,\\%$ von $U_0$ geladen.') : L('After one time constant $\\tau$ the voltage has fallen to $e^{-1} \\approx 37\\,\\%$ of $\\Delta V_0$.', 'Nach einer Zeitkonstante $\\tau$ ist die Spannung auf $e^{-1} \\approx 37\\,\\%$ von $U_0$ gefallen.'),
          L(`Here that is $${tq(lvl, 'V')}$: find it on the vertical axis, go across to the curve and down to the time axis.`, `Hier sind das $${tq(lvl, 'V')}$: Suche das auf der senkrechten Achse, geh hinüber zur Kurve und hinunter zur Zeitachse.`),
          L(`Or: the tangent at $t = 0$ reaches ${charge ? '$\\Delta V_0$' : 'zero'} at $t = \\tau$.`, `Oder: Die Tangente bei $t = 0$ erreicht ${charge ? '$U_0$' : 'null'} bei $t = \\tau$.`),
        ],
        solution: [
          step(L('The level after one τ', 'Die Höhe nach einem τ'), p$(charge ? L(`$\\Delta V_C(\\tau) = \\Delta V_0\\left(1 - e^{-1}\\right) \\approx 0.63\\cdot ${tq(U0, 'V')} = ${tq(lvl, 'V')}$.`, `$U_C(\\tau) = U_0\\left(1 - e^{-1}\\right) \\approx 0.63\\cdot ${tq(U0, 'V')} = ${tq(lvl, 'V')}$.`) : `$${Vs('C')}(\\tau) = ${Vs('0')}\\,e^{-1} \\approx 0.37\\cdot ${tq(U0, 'V')} = ${tq(lvl, 'V')}$.`)),
          step(L('Read off', 'Ablesen'), p$(L(`The curve reaches $${tq(lvl, 'V')}$ at $\\tau = \\htmlClass{result}{${tq(tau, unit)}}$. The tangent at $t = 0$ (dashed) gives the same: it reaches ${charge ? '$\\Delta V_0$' : 'zero'} at $t = \\tau$.`, `Die Kurve erreicht $${tq(lvl, 'V')}$ bei $\\tau = \\htmlClass{result}{${tq(tau, unit)}}$. Die Tangente bei $t = 0$ (gestrichelt) gibt dasselbe: Sie erreicht ${charge ? '$U_0$' : 'null'} bei $t = \\tau$.`))),
          step(L('Not the half-life', 'Nicht die Halbwertszeit'), p$(L(`At $\\Delta V_0/2$ you would read the half-life, $T_{1/2} = \\tau\\cdot\\ln 2 \\approx ${tq(tau * LN2, unit)}$, shorter than $\\tau$.`, `Bei $U_0/2$ liest man die Halbwertszeit ab, $T_{1/2} = \\tau\\cdot\\ln 2 \\approx ${tq(tau * LN2, unit)}$, kürzer als $\\tau$.`))),
        ],
        results: `$\\tau = ${tq(tau, unit)}$`,
        watch: () => rcWatch({ charge, U0, I0: null, tau, unit, U0l: `${num(U0)} V`, keep: true,
          marks: (w, get) => [numMark('tau', 'UC', get('tau'), charge ? U0 * (1 - E(-1)) : U0 * E(-1), `${yourAnswer()}: <i>τ</i> = ${tH(w, get('tau'))}`)] }),
      };
    },
    check: ['tau'],
  };

  // R or C changed (charging): the factors on R and C, and how the change is put
  const CHANGES = [
    { id: 'R2', kR: 2, kC: 1, en: 'a resistor with twice the resistance', de: 'einem Widerstand mit doppeltem Widerstandswert' },
    { id: 'Rh', kR: 0.5, kC: 1, en: 'a resistor with half the resistance', de: 'einem Widerstand mit halbem Widerstandswert' },
    { id: 'C2', kR: 1, kC: 2, en: 'a capacitor with twice the capacitance', de: 'einem Kondensator mit doppelter Kapazität' },
    { id: 'Ch', kR: 1, kC: 0.5, en: 'a capacitor with half the capacitance', de: 'einem Kondensator mit halber Kapazität' },
    { id: 'par', kR: 1, kC: 2, en: 'a second, equal capacitor connected in parallel to the first', de: 'einem zweiten, gleichen Kondensator parallel zum ersten' },
    { id: 'ser', kR: 1, kC: 0.5, en: 'a second, equal capacitor connected in series with the first', de: 'einem zweiten, gleichen Kondensator in Serie zum ersten' },
    { id: 'RC', kR: 2, kC: 2, en: 'twice the resistance and twice the capacitance', de: 'doppeltem Widerstand und doppelter Kapazität' },
    { id: 'Rc', kR: 2, kC: 0.5, en: 'twice the resistance and half the capacitance', de: 'doppeltem Widerstand und halber Kapazität' },
  ];
  const changeOf = (p) => CHANGES.find((c) => c.id === p.ch);
  const factor = (k) => (k === 1 ? L('unchanged', 'gleich') : k > 1 ? `×${k}` : `×${{ 0.5: '½', 0.25: '¼' }[k]}`);
  const kText = (k) => (k === 2 ? L('doubles', 'verdoppelt sich') : k === 4 ? L('becomes four times as long', 'wird viermal so lang') : k === 0.5 ? L('halves', 'halbiert sich') : k === 0.25 ? L('becomes a quarter', 'wird ein Viertel') : L('stays the same', 'bleibt gleich'));
  const WHY_FACTOR = () => L('$\\tau = R\\cdot C$: a larger resistance lets less current flow, a larger capacitance needs more charge. Both make the charging slower, $\\tau$ longer.', '$\\tau = R\\cdot C$: Ein grösserer Widerstand lässt weniger Strom fliessen, eine grössere Kapazität braucht mehr Ladung. Beides macht das Laden langsamer, $\\tau$ länger.');
  const WHY_FINAL = () => L('The capacitor charges until its voltage is $\\Delta V_0$, whatever $R$ and $C$: they change how fast, not how far. (A larger $C$ stores more charge at the same voltage.)', 'Der Kondensator lädt sich auf, bis seine Spannung $U_0$ ist, was immer $R$ und $C$ sind: Sie ändern, wie schnell, nicht wie weit. (Ein grösseres $C$ speichert bei derselben Spannung mehr Ladung.)');
  const WHY_I0 = () => L('Right after closing the switch the capacitor is empty, the whole $\\Delta V_0$ is across $R$: $I_0 = \\Delta V_0/R$. Only $R$ counts.', 'Unmittelbar nach dem Schliessen ist der Kondensator leer, die ganze Spannung $U_0$ liegt über $R$: $I_0 = U_0/R$. Nur $R$ zählt.');
  const changeText = (c) => p$(L(`A capacitor is charged through a resistor $R$ by a battery with voltage $\\Delta V_0$. The experiment is repeated with ${c.en}.`, `Ein Kondensator wird über einen Widerstand $R$ von einer Batterie mit der Spannung $U_0$ geladen. Das Experiment wird mit ${c.de} wiederholt.`));
  const changeSteps = (c, k) => [
    step(L('What changes', 'Was sich ändert'), p$(c.id === 'par' || c.id === 'ser' ? L(`Two equal capacitors ${c.id === 'par' ? 'in parallel have twice the capacitance, $2C$' : 'in series have half the capacitance, $C/2$'}.`, `Zwei gleiche Kondensatoren ${c.id === 'par' ? 'parallel haben die doppelte Kapazität, $2C$' : 'in Serie haben die halbe Kapazität, $C/2$'}.`) + ' ' : '') + p$(L(`$R$ ${factor(c.kR)}, $C$ ${factor(c.kC)}.`, `$R$ ${factor(c.kR)}, $C$ ${factor(c.kC)}.`))),
    step(L('The time constant', 'Die Zeitkonstante'), p$(L(`$\\tau = R\\cdot C$ ${kText(k)}: <span class="result">${factor(k)}</span>. The curve is stretched (or squeezed) along the time axis by this factor.`, `$\\tau = R\\cdot C$ ${kText(k)}: <span class="result">${factor(k)}</span>. Die Kurve wird um diesen Faktor entlang der Zeitachse gestreckt (oder gestaucht).`))),
    step(L('Start and end', 'Anfang und Ende'), p$(`${WHY_I0()} ${L(`So $I_0$ is <span class="result">${c.kR > 1 ? 'smaller' : c.kR < 1 ? 'larger' : 'the same'}</span>.`, `Also ist $I_0$ <span class="result">${c.kR > 1 ? 'kleiner' : c.kR < 1 ? 'grösser' : 'gleich'}</span>.`)} ${WHY_FINAL()}`)),
  ];
  // the first hint of a change: what it does to R and to C
  const changeHint = (c) => (c.id === 'par' || c.id === 'ser'
    ? L(`The experiment is repeated with ${c.en}: $R$ stays. What is the capacitance of the two equal capacitors together, compared with $C$?`, `Das Experiment wird mit ${c.de} wiederholt: $R$ bleibt. Welche Kapazität haben die beiden gleichen Kondensatoren zusammen, verglichen mit $C$?`)
    : L(`The experiment is repeated with ${c.en}: by what factor does $R$ change, and by what factor $C$?`, `Das Experiment wird mit ${c.de} wiederholt: Um welchen Faktor ändert sich $R$, um welchen $C$?`));
  // watching the new charging (τ × kR·kC, I₀ × 1/kR) beside the first one (grey), in units of the
  // first τ, U₀ and I₀
  const changeWatch = (c, marks) => rcWatch({ charge: true, U0: 1, I0: 1 / c.kR, tau: c.kR * c.kC, unit: 'τ', norm: true, ghost: { tau: 1, I0: 1 }, marks });
  // the factor on τ: the right one, the inverse one (the typical wrong idea), then the nearest
  const tauField = (k) => {
    const near = [4, 2, 1, 0.5, 0.25].filter((x) => x !== k && x !== 1 / k).sort((a, b) => Math.abs(Math.log(a / k)) - Math.abs(Math.log(b / k)) || b - a);
    const shown = [k, ...(k !== 1 ? [1 / k] : []), ...near].slice(0, 4).sort((a, b) => b - a);
    return choiceF('tau', L('The time constant τ:', 'Die Zeitkonstante τ:'), String(k), shown.map((x) => opt(String(x), factor(x), x === k ? '' : WHY_FACTOR(), x === k ? null : 'factor')), { ask: L('How does the time constant τ change?', 'Wie ändert sich die Zeitkonstante τ?') });
  };

  const predict = {
    difficulty: 3,
    title: () => L('Changing R or C', 'R oder C ändern'),
    make: (r) => ({ ch: r.pick(CHANGES).id }),
    build(p) {
      const c = changeOf(p), k = c.kR * c.kC, i0 = c.kR > 1 ? 'down' : c.kR < 1 ? 'up' : 'same';
      const i0Why = (v) => (v === 'zero' ? WHY.start() : WHY_I0());
      const fields = [
          tauField(k),
          choiceF('i0', L('The current right after closing the switch:', 'Der Strom unmittelbar nach dem Schliessen:'), i0,
            [['up', L('larger', 'grösser')], ['down', L('smaller', 'kleiner')], ['same', L('the same', 'gleich')], ['zero', L('zero in both', 'in beiden null')]]
              .map(([v, h]) => opt(v, h, v === i0 ? '' : i0Why(v), v === i0 ? null : v === 'zero' ? 'start' : 'i0')), { ask: L('How does the current right after closing the switch change?', 'Wie ändert sich der Strom unmittelbar nach dem Schliessen?') }),
          choiceF('fin', L('The voltage of the capacitor at the end:', 'Die Spannung des Kondensators am Schluss:'), 'same',
            [['up', L('larger', 'grösser')], ['down', L('smaller', 'kleiner')], ['same', L('the same, ΔV₀', 'gleich, U₀')]].map(([v, h]) => opt(v, h, v === 'same' ? '' : WHY_FINAL(), v === 'same' ? null : 'final'))),
      ];
      // larger, smaller: twice or half (R and C change by these factors)
      const LV = { up: 2, down: 0.5, same: 1, zero: 0 };
      const chosen = (key, v) => fields.find((f) => f.key === key).options.find((o) => o.v === v);
      return {
        text: changeText(c) + p$(L('Compare with the first charging:', 'Vergleiche mit dem ersten Laden:')),
        fields,
        watch: () => changeWatch(c, (w, get) => {
          const on = (q, t, y) => Math.abs(y - w.at(t)[q]) <= 0.04, out = [], a = get('tau'), b = get('i0'), f = get('fin');
          if (a != null && chosen('tau', a)) { const x = Number(a); out.push({ key: 'tau', q: 'UC', t: x, y: 1 - E(-1), ok: on('UC', x, 1 - E(-1)), say: `${yourAnswer()}: <i>τ</i> ${factor(x)} (63&#8202;% ${L('at', 'bei')} ${tH(w, x)})` }); }
          if (b != null && chosen('i0', b)) out.push({ key: 'i0', q: 'I', t: 0, y: LV[b], ok: on('I', 0, LV[b]), say: `${yourAnswer()}: <i>I</i><sub>0</sub> ${chosen('i0', b).html}` });
          if (f != null && chosen('fin', f)) out.push({ key: 'fin', q: 'UC', t: w.T, y: LV[f], ok: on('UC', w.T, LV[f]), say: `${yourAnswer()}: ${L('at the end', 'am Schluss')} ${chosen('fin', f).html}` });
          return out;
        }),
        figure: () => Fg.rc('charge'),
        solutionFigure: () => `<div class="fig">${predictGraph(k, 1, true)}</div>`,
        hints: [
          changeHint(c),
          L('The time constant is $\\tau = R\\cdot C$: multiply the factor by which $R$ changes by the factor by which $C$ changes.', 'Die Zeitkonstante ist $\\tau = R\\cdot C$: Multipliziere den Faktor, um den sich $R$ ändert, mit dem Faktor, um den sich $C$ ändert.'),
          L(`Right after closing S the capacitor is empty, so the whole $\\Delta V_0$ is across the resistor: $I_0 = \\frac{\\Delta V_0}{R}$. Does ${c.en} change anything in this fraction? And at the end no current flows, $\\Delta V_R = 0$: so $\\Delta V_C = \\dots$`, `Unmittelbar nach dem Schliessen ist der Kondensator leer, also liegt die ganze Spannung $U_0$ über dem Widerstand: $I_0 = \\frac{U_0}{R}$. Ändert sich mit ${c.de} etwas an diesem Bruch? Und am Schluss fliesst kein Strom mehr, $U_R = 0$: also $U_C = \\dots$`),
        ],
        solution: changeSteps(c, k),
        results: L(`τ ${factor(k)}; I₀ ${{ up: 'larger', down: 'smaller', same: 'the same' }[i0]}; the final voltage the same`, `τ ${factor(k)}; I₀ ${{ up: 'grösser', down: 'kleiner', same: 'gleich' }[i0]}; die Endspannung gleich`),
      };
    },
    check: ['tau', 'i0'],
  };

  // the first charging (grey) and one with τ × k and the final voltage × m (U₀ = 1, τ = 1)
  function predictGraph(k, m, solved) {
    const T = 8;
    return Fg.graph({
      curves: [{ f: (t) => 1 - E(-t), cls: 'ghost' }, { f: (t) => m * (1 - E(-t / k)) }],
      tEnd: T, yMax: 2.1, bare: true, name: ['U', 'C'], levels: [{ y: 1, label: `${Fg.Uq()}₀` }],
      marks: solved ? [{ t: 1, label: '<tspan class="it">τ</tspan>' }, { t: k, label: k === 1 ? '' : `${k === 0.5 ? '½' : k === 0.25 ? '¼' : k}<tspan class="it">τ</tspan>` }] : [],
      label: L('The first charging (grey) and the new one', 'Das erste Laden (grau) und das neue'),
    });
  }
  const predictGraphType = {
    difficulty: 3,
    title: () => L('The new curve', 'Die neue Kurve'),
    make: (r) => ({ ch: r.pick(CHANGES.filter((c) => c.kR * c.kC !== 1)).id, perm: r.int(1, 99999) }),
    build(p) {
      const c = changeOf(p), k = c.kR * c.kC, m = c.kC > 1 ? 2 : c.kC < 1 ? 0.5 : (c.kR > 1 ? 0.5 : 2);
      const opts = [
        opt('ok', predictGraph(k, 1), '', null),
        opt('inv', predictGraph(1 / k, 1), WHY_FACTOR(), 'factor'),
        opt('lvl', predictGraph(k, m), WHY_FINAL(), 'final'),
        opt('lvl1', predictGraph(1, m), `${WHY_FINAL()} ${WHY_FACTOR()}`, 'final'),
      ];
      rng(p.perm).shuffle(opts);
      opts.forEach((o, i) => { o.html = o.html.replace(/aria-label="[^"]*"/, `aria-label="${L(`Graph ${i + 1}`, `Graph ${i + 1}`)}"`); });
      return {
        text: changeText(c) + p$(L('The grey curve shows the voltage $\\Delta V_C$ of the first charging. Which graph shows the new one?', 'Die graue Kurve zeigt die Spannung $U_C$ beim ersten Laden. Welcher Graph zeigt die neue?')),
        fields: [choiceF('graph', L('The new charging:', 'Das neue Laden:'), 'ok', opts, { pics: true })],
        figure: () => Fg.rc('charge'),
        solutionFigure: () => `<div class="fig">${predictGraph(k, 1, true)}</div>`,
        hints: [
          changeHint(c),
          L('The time constant is $\\tau = R\\cdot C$: by what factor does it change here? A longer $\\tau$ stretches the grey curve along the time axis, a shorter one squeezes it.', 'Die Zeitkonstante ist $\\tau = R\\cdot C$: Um welchen Faktor ändert sie sich hier? Ein längeres $\\tau$ streckt die graue Kurve entlang der Zeitachse, ein kürzeres staucht sie.'),
          L(`Up to which voltage does the capacitor charge with ${c.en}? At the end no current flows, $\\Delta V_R = 0$.`, `Bis zu welcher Spannung lädt sich der Kondensator mit ${c.de} auf? Am Schluss fliesst kein Strom mehr, $U_R = 0$.`),
        ],
        solution: changeSteps(c, k),
        results: L(`τ ${factor(k)}, the same final voltage ΔV₀`, `τ ${factor(k)}, dieselbe Endspannung U₀`),
        ask: L('Which graph shows the new charging?', 'Welcher Graph zeigt das neue Laden?'),
        // the chosen graph (τ × k', final voltage × m') at its τ and at the end
        watch: () => changeWatch(c, (w, get) => {
          const km = { ok: [k, 1], inv: [1 / k, 1], lvl: [k, m], lvl1: [1, m] }[get('graph')];
          if (!km) return [];
          const [k1, m1] = km;
          return [[k1, L(`at <i>t</i> = ${tH(w, k1)}`, `bei <i>t</i> = ${tH(w, k1)}`)], [w.T, L('at the end', 'am Schluss')]].map(([t, when]) => {
            const y = m1 * (1 - E(-t / k1));
            return { key: 'graph', q: 'UC', t, y, ok: Math.abs(y - w.at(t).UC) <= 0.04, say: `${yourGraph()} ${when}: ${yH(w, 'UC', y)}` };
          });
        }),
      };
    },
    check: ['graph'],
  };

  // ================================================================ watching
  // Once an exercise on charging or discharging is solved or its solution shown (and in the last
  // frame of the worked examples on it), the student closes the switch S in the circuit and
  // watches the run (app.js, play.js): rcWatch(o), o = { charge, U0 (V; 1: in units of U₀), I0
  // (mA, the current right after switching; 1: in units of I₀; null: R not known, no current
  // shown), tau, unit ('s' or 'ms'; 'τ': times in units of τ), norm (values in units of U₀ and
  // I₀), R, U0l (labels in the circuit), ghost { tau, I0 } (the first charging, drawn grey: R or C
  // changed), keep (the figure of the exercise stays, the circuit to watch below it: a graph to
  // read), marks(run, get) (the student's answers, see below) }.
  // It returns o with T (5τ, or five of the first τ if longer), at(t) → { UC, UR, I }, ghostAt(t),
  // figures() → [before, after] and marks(get). Before t = 0 the switch is open: no current, U_C
  // as before (0 while charging, U₀ while discharging). After: U_C = U₀(1 − e^(−t/τ)) or
  // U₀·e^(−t/τ); U_R = U₀ − U_C (charging) or U_C (discharging) = U₀·e^(−t/τ); I = U_R/R =
  // I₀·e^(−t/τ) (its size).
  // marks(get): get(key) is the answer of a field (a number, NaN if none, or the option chosen,
  // null if none); each mark is { key, q ('UC', 'UR' or 'I': the curve it belongs to), t, y, ok
  // (for a choice: whether the point lies on the curve; for a number null: the app judges it as
  // in the feedback), say (html: what the answer was) }.
  const Vh = (i) => L(`Δ<i>V</i><sub>${i}</sub>`, `<i>U</i><sub>${i}</sub>`);
  const QH = { UC: () => Vh('C'), UR: () => Vh('R'), I: () => '<i>I</i>' };
  const yourAnswer = () => L('your answer', 'deine Antwort');
  const yourGraph = () => L('your graph', 'dein Graph');
  function rcWatch(o) {
    const T = 5 * Math.max(o.tau, o.ghost ? o.ghost.tau : 0);
    const run = (tau, I0) => (t) => {
      if (t < 0) return { UC: o.charge ? 0 : o.U0, UR: 0, I: I0 == null ? null : 0 };
      const e = E(-t / tau);
      return { UC: o.charge ? o.U0 * (1 - e) : o.U0 * e, UR: o.U0 * e, I: I0 == null ? null : I0 * e };
    };
    const w = { ...o, T, at: run(o.tau, o.I0), ghostAt: o.ghost ? run(o.ghost.tau, o.ghost.I0) : null };
    w.figures = () => Fg.rcWatch(o.charge ? 'charge' : 'discharge', { R: o.R, U0: o.U0l });
    w.marks = (get) => (o.marks ? o.marks(w, get) : []).filter((m) => Number.isFinite(m.t) && Number.isFinite(m.y));
    return w;
  }
  // a time and a value for the texts: 1.4 s, 0.63 ΔV₀
  const tH = (w, t) => (w.unit === 'τ' ? `${num(t)}&#8202;<i>τ</i>` : `${num(t)} ${w.unit}`);
  const yH = (w, q, y) => (w.norm ? `${num(y)}&#8202;${q === 'I' ? '<i>I</i><sub>0</sub>' : Vh('0')}` : `${num(y)} ${q === 'I' ? 'mA' : 'V'}`);
  // a choice of graphs: the chosen one at t = 0⁺, at τ and at the end (5τ)
  const graphMarks = (q, charge) => (w, get) => {
    const v = get('graph'), c = v != null && LISTS[q](charge).find((x) => x.id === v);
    if (!c) return [];
    const at = (t) => (c.f ? c.f(t) : interp(c.pts, t)), key = { U: 'UC', I: 'I', R: 'UR' }[q];
    return [[1e-9, '0⁺'], [1, '<i>τ</i>'], [5, '5&#8202;<i>τ</i>']].map(([t, when]) => {
      const y = at(t);
      return { key: 'graph', q: key, t, y, ok: Math.abs(y - w.at(t)[key]) <= 0.04, say: L(`${yourGraph()} at <i>t</i> = ${when}: ${yH(w, key, y)}`, `${yourGraph()} bei <i>t</i> = ${when}: ${yH(w, key, y)}`) };
    });
  };
  // a polyline [[t, y]] at t (a jump: the later point)
  function interp(pts, t) {
    for (let k = pts.length - 1; k > 0; k--) {
      const [ta, ya] = pts[k - 1], [tb, yb] = pts[k];
      if (t >= ta && t <= tb) return tb === ta ? yb : ya + ((t - ta) / (tb - ta)) * (yb - ya);
    }
    return pts[pts.length - 1][1];
  }
  // a number answered: the ring at (t, y) on the curve q
  const numMark = (key, q, t, y, say) => ({ key, q, t, y, ok: null, say });

  // ================================================================ exercises
  const TYPES = {
    pair, bounds, mixed, network,
    'curve-u-d': curveType('U', 1, false), 'curve-i-d': curveType('I', 2, false), 'curve-r-d': curveType('R', 2, false), 'loop-d': loopType(false),
    'curve-u': curveType('U', 1, true), 'curve-i': curveType('I', 2, true), 'curve-r': curveType('R', 3, true), loop: loopType(true),
    'read-half': readHalf, 'read-tau': readTau, predict, 'predict-graph': predictGraphType,
  };

  function practiceOf(type, seed) {
    const T = TYPES[type], p = T.make(rng(seed)), b = T.build(p);
    return { type, seed, difficulty: T.difficulty, title: T.title(p), p, ...b };
  }

  // A multiple-choice question about one field of an exercise (one of those its type names for the
  // check, by the seed): a choice as it is, its right option and three wrong ones; a number with
  // the right value and three wrong ones (typical wrong ideas first, then simple slips). The
  // options in a random order (by the seed), numbers from small to large.
  function quiz(ex, seed) {
    const r = rng(seed * 31 + 7), keys = TYPES[ex.type].check, f = ofKey(ex, keys[seed % keys.length]);
    if (f.type === 'choice') {
      const right = f.options.find((o) => o.v === f.value), wrong = f.options.filter((o) => o !== right);
      const flagged = r.shuffle(wrong.filter((o) => o.flag)), rest = r.shuffle(wrong.filter((o) => !o.flag));
      const chosen = [right, ...[...flagged, ...rest].slice(0, 3)];
      const options = f.pics || f.stack ? f.options.filter((o) => chosen.includes(o)) : r.shuffle(chosen);
      return { field: f, options: options.map((o) => ({ html: o.html, correct: o === right, flag: o === right ? null : o.flag, why: o === right ? '' : o.why })) };
    }
    const v = f.value, options = [{ value: v, correct: true }];
    const fits = (x) => Number.isFinite(x) && x > 0 && options.every((o) => Math.abs(o.value - x) > Math.max(0.12 * Math.max(o.value, x), 0.05));
    const round = (x) => Math.round(x * (x < 10 ? 10 : 1)) / (x < 10 ? 10 : 1);
    for (const t of f.traps) if (options.length < 4 && fits(round(t.value))) options.push({ value: round(t.value), flag: t.flag, why: t.why });
    for (const x of r.shuffle([2 * v, v / 2, 3 * v, v / 3, 1.5 * v, 4 * v])) if (options.length < 4 && fits(round(x))) options.push({ value: round(x), flag: null, why: '' });
    options.sort((a, b) => a.value - b.value);
    return { field: f, options: options.map((o) => ({ html: `$${tq(o.value, f.unit)}$`, correct: !!o.correct, flag: o.flag || null, why: o.why || '' })) };
  }

  const api = { TYPES, practiceOf, quiz, rng, num, tq, NICE, CURVES, ser2, rcWatch };
  root.Caps = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
