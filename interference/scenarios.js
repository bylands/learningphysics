// The exercise types of the app. Each:
//   { id, difficulty, title(p), make(r) → parameters p (or null: draw again), solve(p, o) → values v
//     (SI; with a flag of traps set in o: the result of that wrong idea), traps: [flag],
//     why: { flag: () => text }, fields(p, v) → [field], text(p), hints(p, v), steps(p, v) → [{ text,
//     show: [keys] }], figure(p, v, view), quizChoice (the check asks the choice, not a number) }
// A field is a number { key, type: 'num', sym, unit, what, sci } (its value in the unit), or a
// choice { key, type: 'choice', what, ask (for the check), options: [[value, html, why, flag]],
// stack (one option below the other), pics (pictures) }; the value of a choice comes from v[key].
// view: { task: true } the task; { show: Set } the solution (or a step of it).
//
//   Huygens          gap (which picture shows the waves behind a gap: narrow or wide compared
//                    with λ)
//   double slit      path (bright or dark at P, from the path difference), ds-pos (the position of
//                    a bright fringe, y = k·λ·L/d), ds-lam (the wavelength from the fringes)
//   grating          grating (d = 1/n and the position of a maximum), grating-max (sin α = k·λ/d
//                    and the highest order)
//   changes          change (how the pattern changes when λ, L, d, b or N changes), single (the
//                    central fringe of a single slit, w = 2·λ·L/b, or the width of a hair from it)
//   resolving power  res-change (how θₘᵢₙ = 1.22·λ/D changes), res-scale (θₘᵢₙ or D by ratios),
//                    res-far (how far two lamps are seen as two, how small craters on the Moon)
//   concepts         concept-huy, concept-ds, concept-pat, concept-res (which statement is right)
// The numbers are chosen so that the results come out round: small angles and ratios, no
// calculator.
(function (root) {
  'use strict';

  const IW = root.IW || require('./core.js');
  const { L, pick, shuffle, tnum, q, tq, sig } = IW;
  const Fg = () => root.Figures;

  // ---------------------------------------------------------------- helpers
  const step = (rule, html, show = []) => ({ text: `<p class="step-rule">${rule}</p>${html}`, show });
  const p$ = (s) => `<p>${s}</p>`;
  const res = (x) => `\\htmlClass{result}{${x}}`;
  const num$ = (key, sym, unit, what, o = {}) => ({ key, type: 'num', sym, unit, what, ...o });
  const choice = (key, what, options, o = {}) => ({ key, type: 'choice', what, options, ...o });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // a whole number of tenths (of the unit u): a result for mental arithmetic
  const tidy = (x, u, per = 10) => { const y = IW.inUnit(x, u) * per; return Math.abs(y - Math.round(y)) < 1e-6; };
  const nm = (x) => x * 1e-9, mm = (x) => x * 1e-3;
  const ord = (k) => L(['', '1st', '2nd', '3rd'][k] || `${k}th`, `${k}.`);

  // ================================================================ 1 Huygens: waves at a gap
  // the medium, the wavelengths (in its unit) and the gap's widths in wavelengths
  const GAP_MEDIA = [
    { en: 'Straight water waves in a ripple tank', de: 'Gerade Wasserwellen in einer Wellenwanne', lam: [1, 1.5, 2, 3], u: 'cm' },
    { en: 'Sound waves from a distant loudspeaker (with straight fronts)', de: 'Schallwellen eines fernen Lautsprechers (mit geraden Fronten)', lam: [0.4, 0.5, 1], u: 'm' },
  ];
  const GAPS = [0.5, 1, 4, 5];
  const GAP_KEYS = ['arcs', 'beam', 'shadow', 'short'];
  const WHY_GAP = {
    narrow: () => L('This gap is no wider than about one wavelength: it acts like a single source of wavelets, and circular waves spread into the whole space behind the wall.', 'Diese Öffnung ist nicht breiter als etwa eine Wellenlänge: Sie wirkt wie eine einzige Quelle von Elementarwellen, und Kreiswellen breiten sich im ganzen Raum hinter der Wand aus.'),
    wide: () => L('Circular waves come from a gap about one wavelength wide or narrower. This gap is several wavelengths wide: the wavelets of its points add up to a straight front; only at its ends does the wave bend into the shadow.', 'Kreiswellen entstehen an einer Öffnung, die etwa eine Wellenlänge breit oder schmaler ist. Diese Öffnung ist mehrere Wellenlängen breit: Die Elementarwellen ihrer Punkte setzen sich zu einer geraden Front zusammen; nur an ihren Enden biegt die Welle in den Schatten.'),
    ray: () => L('Waves do not stop at the edge of the shadow: the points at the edges of the gap send wavelets into it too (Huygens).', 'Wellen hören am Rand des Schattens nicht auf: Auch die Punkte am Rand der Öffnung senden Elementarwellen in ihn hinein (Huygens).'),
    lambda: () => L('Behind the wall the wave is in the same medium, at the same speed and the same frequency: its wavelength stays the same.', 'Hinter der Wand ist die Welle im selben Medium, mit derselben Geschwindigkeit und derselben Frequenz: Ihre Wellenlänge bleibt gleich.'),
  };
  const HUYGENS = () => L('Huygens: every point of a wave front is the source of a wavelet; the new front is the envelope of the wavelets.', 'Huygens: Jeder Punkt einer Wellenfront ist Quelle einer Elementarwelle; die neue Front ist die Einhüllende der Elementarwellen.');
  const gap = {
    id: 'gap', difficulty: 1, quizChoice: true,
    title: () => L('Waves at a gap', 'Wellen an einer Öffnung'),
    make: (r) => { const m = Math.floor(r() * GAP_MEDIA.length); return { m, lam: pick(r, GAP_MEDIA[m].lam), a: pick(r, GAPS), order: shuffle(r, GAP_KEYS.slice()) }; },
    solve: (p) => ({ ans: p.a <= 1 ? 'arcs' : 'beam' }),
    traps: [],
    fields: (p, v) => {
      const why = (k) => (k === 'shadow' ? WHY_GAP.ray() : k === 'short' ? WHY_GAP.lambda() : v.ans === 'arcs' ? WHY_GAP.narrow() : WHY_GAP.wide());
      const flag = (k) => ({ shadow: 'ray', short: 'lambda' })[k] || 'size';
      // the nudge after a wrong answer in practice, where why (shown in the check) would give the answer away
      const nudge = (k) => (k === 'shadow' || k === 'short' ? '' : v.ans === 'arcs'
        ? L('How wide is the gap, in wavelengths? With Huygens, what does a gap that narrow send out?', 'Wie breit ist die Öffnung, in Wellenlängen gemessen? Was sendet eine so schmale Öffnung nach Huygens aus?')
        : L('How wide is the gap, in wavelengths? What do the wavelets of its many points add up to?', 'Wie breit ist die Öffnung, in Wellenlängen gemessen? Was ergeben die Elementarwellen ihrer vielen Punkte zusammen?'));
      const opts = p.order.map((k) => [k, Fg().waves({ small: true, a: p.a, behind: k === 'short' ? v.ans : k, short: k === 'short' }), k === v.ans ? '' : why(k), k === v.ans ? null : flag(k), k === v.ans ? '' : nudge(k)]);
      return [choice('ans', L('The waves behind the wall:', 'Die Wellen hinter der Wand:'), opts, { pics: true, ask: L('Which picture shows the waves behind the wall?', 'Welches Bild zeigt die Wellen hinter der Wand?') })];
    },
    text: (p) => {
      const g = GAP_MEDIA[p.m], lam = p.lam * IW.UNITS[g.u][0];
      return L(`${g.en} with a wavelength of ${q(lam, g.u)} meet a wall with a gap ${q(p.a * lam, g.u)} wide. Which picture shows the waves behind the wall (seen from above)?`,
        `${g.de} mit einer Wellenlänge von ${q(lam, g.u)} treffen auf eine Wand mit einer Öffnung von ${q(p.a * lam, g.u)} Breite. Welches Bild zeigt die Wellen hinter der Wand (von oben gesehen)?`);
    },
    hints: (p) => {
      const g = GAP_MEDIA[p.m], lam = p.lam * IW.UNITS[g.u][0];
      return [
        L(`The wavelength is ${q(lam, g.u)}, the gap ${q(p.a * lam, g.u)} wide. How many wavelengths wide is the gap: about one or less, or several?`, `Die Wellenlänge ist ${q(lam, g.u)}, die Öffnung ${q(p.a * lam, g.u)} breit. Wie viele Wellenlängen breit ist die Öffnung: etwa eine oder weniger, oder mehrere?`),
        L(`${HUYGENS()} So: how many wavelet sources fit across a gap of that width, and what do they send out behind the wall?`, `${HUYGENS()} Also: Wie viele Quellen von Elementarwellen haben in einer Öffnung dieser Breite Platz, und was senden sie hinter die Wand?`),
        L(`Behind the wall the ${g.u === 'cm' ? 'water' : 'air'} is the same: is the wavelength there still ${q(lam, g.u)}? Check that in each picture too.`, `Hinter der Wand ist ${g.u === 'cm' ? 'das Wasser' : 'die Luft'} dieselbe: Ist die Wellenlänge dort immer noch ${q(lam, g.u)}? Prüfe das auch in jedem Bild.`),
      ];
    },
    steps: (p, v) => [
      step(L('Gap and wavelength', 'Öffnung und Wellenlänge'), p$(L(`The gap is ${p.a === 0.5 ? 'half a wavelength' : p.a === 1 ? 'one wavelength' : `${p.a} wavelengths`} wide: $a/\\lambda = ${p.a}$.`, `Die Öffnung ist ${p.a === 0.5 ? 'eine halbe Wellenlänge' : p.a === 1 ? 'eine Wellenlänge' : `${p.a} Wellenlängen`} breit: $a/\\lambda = ${p.a}$.`)), ['wavelets']),
      step(L('The wavelets', 'Die Elementarwellen'), p$(`${HUYGENS()} ${v.ans === 'arcs'
        ? L('In a gap this narrow, the few wavelets act like one point source: <span class="result">circular waves</span> spread into the whole space behind the wall, also into the shadow.', 'In einer so schmalen Öffnung wirken die wenigen Elementarwellen wie eine einzige punktförmige Quelle: <span class="result">Kreiswellen</span> breiten sich im ganzen Raum hinter der Wand aus, auch im Schatten.')
        : L('In a gap this wide, the wavelets of its many points add up to a <span class="result">straight front</span>; only at its ends does the wave bend a little into the shadow. The narrower the gap compared with λ, the more the wave spreads.', 'In einer so breiten Öffnung setzen sich die Elementarwellen ihrer vielen Punkte zu einer <span class="result">geraden Front</span> zusammen; nur an ihren Enden biegt die Welle etwas in den Schatten. Je schmaler die Öffnung im Vergleich zu λ, desto stärker breitet sich die Welle aus.')}`) +
        p$(L('The wavelength stays the same: same medium, same speed, same frequency.', 'Die Wellenlänge bleibt gleich: dasselbe Medium, dieselbe Geschwindigkeit, dieselbe Frequenz.')), ['wavelets', 'behind']),
    ],
    figure: (p, v, view) => Fg().waves({ a: p.a, dims: true, behind: view.task || !view.show.has('behind') ? null : v.ans, wavelets: !view.task && view.show.has('wavelets') }),
  };

  // ================================================================ 2 path difference
  // bright (loud) where Δs = m·λ, dark (quiet) where Δs = (m + ½)·λ; the choices in the order of Δs
  const MS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  const WHY_HALF = () => L('Bright where the path difference is a whole number of wavelengths (crest meets crest), dark where it is an odd number of half wavelengths (crest meets trough).', 'Hell, wo der Gangunterschied eine ganze Zahl von Wellenlängen ist (Berg trifft Berg), dunkel, wo er eine ungerade Zahl halber Wellenlängen ist (Berg trifft Tal).');
  const WHY_ORDER = () => L('The order is the path difference counted in wavelengths: $\\Delta s = k\\cdot\\lambda$ for the maximum of order $k$, $\\Delta s = (k + \\tfrac12)\\cdot\\lambda$ for the minimum after it.', 'Die Ordnung ist der Gangunterschied in Wellenlängen gezählt: $\\Delta s = k\\cdot\\lambda$ für das Maximum der Ordnung $k$, $\\Delta s = (k + \\tfrac12)\\cdot\\lambda$ für das Minimum danach.');
  const NUDGE_HALF = () => L('How many wavelengths is the path difference? Does crest then meet crest, or trough?', 'Wie viele Wellenlängen beträgt der Gangunterschied? Trifft dann Berg auf Berg oder Berg auf Tal?');
  const NUDGE_ORDER = () => L('The kind of fringe is right. Count the path difference in wavelengths: which order does that give?', 'Die Art des Streifens stimmt. Zähle den Gangunterschied in Wellenlängen: Welche Ordnung ergibt das?');
  function fringeName(m, sound) {
    const k = Math.floor(m);
    if (m === k) return sound ? L(`loud: maximum of order ${k}`, `laut: Maximum ${k}. Ordnung`) : L(`bright: maximum of order ${k}`, `hell: Maximum ${k}. Ordnung`);
    return `${sound ? L('quiet', 'leise') : L('dark', 'dunkel')}: ${L(`minimum between the orders ${k} and ${k + 1}`, `Minimum zwischen der ${k}. und ${k + 1}. Ordnung`)}`;
  }
  const path = {
    id: 'path', difficulty: 1, quizChoice: true,
    title: () => L('Bright or dark?', 'Hell oder dunkel?'),
    make: (r) => {
      const sound = r() < 0.5, m = pick(r, MS.slice(0, 6));
      return sound ? { sound, m, lam: pick(r, [0.2, 0.4, 0.5, 0.8]), r1: pick(r, [2, 3, 4, 5]), off: Math.floor(r() * 4) }
        : { sound, m, lam: nm(pick(r, [400, 500, 600, 700])), off: Math.floor(r() * 4) };
    },
    solve: (p) => ({ ds: p.m * p.lam, ans: String(p.m) }),
    traps: [],
    fields: (p, v) => {
      const i = MS.indexOf(p.m), lo = Math.max(0, Math.min(MS.length - 4, i - p.off));
      const opts = MS.slice(lo, lo + 4).map((m) => [String(m), fringeName(m, p.sound), m === p.m ? '' : (m % 1 === 0) !== (p.m % 1 === 0) ? WHY_HALF() : WHY_ORDER(), m === p.m ? null : (m % 1 === 0) !== (p.m % 1 === 0) ? 'half' : 'order', m === p.m ? '' : (m % 1 === 0) !== (p.m % 1 === 0) ? NUDGE_HALF() : NUDGE_ORDER()]);
      const f = [choice('ans', L('At P:', 'Bei P:'), opts, { stack: true, ask: p.sound ? L('What does the microphone at P pick up?', 'Was nimmt das Mikrofon bei P auf?') : L('What is there at P on the screen?', 'Was ist bei P auf dem Schirm?') })];
      return p.sound ? [num$('ds', '\\Delta s', 'cm', L('path difference', 'Gangunterschied')), ...f] : f;
    },
    text: (p) => (p.sound
      ? L(`Two loudspeakers S₁ and S₂, driven by the same generator, send out sound in step, with a wavelength of ${q(p.lam, 'cm')}. A microphone at P is ${q(p.r1, 'm')} from S₁ and ${q(p.r1 + p.m * p.lam, 'm')} from S₂. What is the path difference, and is the sound at P loud or quiet?`,
        `Zwei Lautsprecher S₁ und S₂ am selben Generator senden im Gleichtakt Schall mit einer Wellenlänge von ${q(p.lam, 'cm')} aus. Ein Mikrofon bei P ist ${q(p.r1, 'm')} von S₁ und ${q(p.r1 + p.m * p.lam, 'm')} von S₂ entfernt. Wie gross ist der Gangunterschied, und ist der Schall bei P laut oder leise?`)
      : L(`Light with a wavelength of ${q(p.lam, 'nm')} falls on a double slit. At a point P on the screen, the light from one slit has travelled ${q(p.m * p.lam, p.m * p.lam >= 1e-6 ? 'μm' : 'nm')} further than the light from the other. Is P bright or dark, and which fringe is it?`,
        `Licht mit einer Wellenlänge von ${q(p.lam, 'nm')} fällt auf einen Doppelspalt. Zu einem Punkt P auf dem Schirm hat das Licht des einen Spalts einen um ${q(p.m * p.lam, p.m * p.lam >= 1e-6 ? 'μm' : 'nm')} längeren Weg als das des anderen. Ist P hell oder dunkel, und welcher Streifen ist es?`)),
    hints: (p) => {
      const u = p.sound ? 'cm' : p.m * p.lam >= 1e-6 ? 'μm' : 'nm';
      return [
        p.sound ? L(`The microphone is ${q(p.r1, 'm')} from S₁ and ${q(p.r1 + p.m * p.lam, 'm')} from S₂. The path difference is how much further the sound from S₂ travels: $\\Delta s = r_2 - r_1$.`, `Das Mikrofon ist ${q(p.r1, 'm')} von S₁ und ${q(p.r1 + p.m * p.lam, 'm')} von S₂ entfernt. Der Gangunterschied ist, wie viel weiter der Schall von S₂ läuft: $\\Delta s = r_2 - r_1$.`)
          : L(`The path difference is given: ${q(p.m * p.lam, u)}, with a wavelength of ${q(p.lam, 'nm')}.`, `Der Gangunterschied ist gegeben: ${q(p.m * p.lam, u)}, bei einer Wellenlänge von ${q(p.lam, 'nm')}.`),
        L(`Count the path difference in wavelengths, $\\Delta s/\\lambda$, with both in the same unit (${p.sound ? 'cm' : 'nm'}).`, `Zähle den Gangunterschied in Wellenlängen, $\\Delta s/\\lambda$, beide in derselben Einheit (${p.sound ? 'cm' : 'nm'}).`),
        p.sound ? L('A whole number of wavelengths: crest meets crest, loud, and the number is the order. A whole number and a half: crest meets trough, quiet, between two orders.', 'Eine ganze Zahl von Wellenlängen: Berg trifft Berg, laut, und die Zahl ist die Ordnung. Eine ganze Zahl und eine halbe: Berg trifft Tal, leise, zwischen zwei Ordnungen.')
          : L('A whole number of wavelengths: crest meets crest, bright, and the number is the order. A whole number and a half: crest meets trough, dark, between two orders.', 'Eine ganze Zahl von Wellenlängen: Berg trifft Berg, hell, und die Zahl ist die Ordnung. Eine ganze Zahl und eine halbe: Berg trifft Tal, dunkel, zwischen zwei Ordnungen.'),
      ];
    },
    steps: (p, v) => {
      const u = p.sound ? 'cm' : 'nm', k = Math.floor(p.m), whole = p.m === k;
      return [
        step(L('The path difference', 'Der Gangunterschied'), (p.sound ? `$$\\Delta s = r_2 - r_1 = ${tq(p.r1 + p.m * p.lam, 'm')} - ${tq(p.r1, 'm')} = ${res(tq(v.ds, 'cm'))}$$` : p$(L(`$\\Delta s = ${tq(v.ds, 'nm')}$.`, `$\\Delta s = ${tq(v.ds, 'nm')}$.`))) +
          p$(L('In wavelengths:', 'In Wellenlängen:')) + `$$\\frac{\\Delta s}{\\lambda} = \\frac{${tq(v.ds, u)}}{${tq(p.lam, u)}} = ${p.m}$$`, ['ds']),
        step(whole ? L('A whole number of wavelengths', 'Eine ganze Zahl von Wellenlängen') : L('An odd number of half wavelengths', 'Eine ungerade Zahl halber Wellenlängen'), p$(whole
          ? L(`The wave from S₂ arrives exactly ${k === 1 ? 'one wavelength' : `${k} wavelengths`} later: crest meets crest, constructive interference. P is the <span class="result">maximum of order ${k}</span>.`, `Die Welle von S₂ kommt genau ${k === 1 ? 'eine Wellenlänge' : `${k} Wellenlängen`} später an: Berg trifft Berg, konstruktive Interferenz. P ist das <span class="result">Maximum ${k}. Ordnung</span>.`)
          : L(`The wave from S₂ arrives ${p.m} wavelengths later: crest meets trough, destructive interference. P is ${p.sound ? 'quiet' : 'dark'}: the <span class="result">minimum between the orders ${k} and ${k + 1}</span>.`, `Die Welle von S₂ kommt ${p.m} Wellenlängen später an: Berg trifft Tal, destruktive Interferenz. P ist ${p.sound ? 'leise' : 'dunkel'}: das <span class="result">Minimum zwischen der ${k}. und ${k + 1}. Ordnung</span>.`)), ['ds']),
      ];
    },
    figure: (p, v, view) => Fg().sources({ kind: p.sound ? 'speaker' : 'slit', r1: p.sound ? q(p.r1, 'm') : '', r2: p.sound ? q(p.r1 + p.m * p.lam, 'm') : '', ds: !view.task && view.show.has('ds') }),
  };

  // ================================================================ 3 the double slit
  // y_k = k·λ·L/d for small angles; λ, d and L chosen so that y comes out in whole tenths of a mm
  // without a calculator: λ/d (or λ/b) a whole number of thousandths, L a whole number of metres
  const DS_LAM = [400, 500, 600, 700].map(nm), DS_D = [0.1, 0.2, 0.25, 0.3, 0.5].map(mm), DS_L = [1, 2, 3];
  const permille = (x) => Math.abs(x * 1e3 - Math.round(x * 1e3)) < 1e-9;
  const dsMake = (r) => {
    const p = { lam: pick(r, DS_LAM), d: pick(r, DS_D), L: pick(r, DS_L), k: pick(r, [1, 2, 3]) }, y1 = (p.lam * p.L) / p.d;
    return permille(p.lam / p.d) && y1 >= 1e-3 && p.k * y1 <= 30e-3 ? p : null;
  };
  // the way without a calculator: the ratio λ/d first, a small pure number
  const ratio = (a, b, sa, sb) => `\\frac{${sa}}{${sb}} = \\frac{${tq(a, a < 1e-6 ? 'nm' : 'μm')}}{${tq(b, b < 1e-3 ? 'μm' : 'mm')}} = ${tnum(a / b)}`;
  const NOCALC = () => L('Without a calculator:', 'Ohne Rechner:');
  const SMALL = () => L('For small angles, $\\sin\\alpha \\approx \\tan\\alpha = y/L$: the bright fringe of order $k$ lies at $y_k = k\\cdot\\dfrac{\\lambda L}{d}$, and neighbouring fringes are $\\Delta y = \\dfrac{\\lambda L}{d}$ apart.', 'Für kleine Winkel ist $\\sin\\alpha \\approx \\tan\\alpha = y/L$: Der helle Streifen der Ordnung $k$ liegt bei $y_k = k\\cdot\\dfrac{\\lambda L}{d}$, und benachbarte Streifen sind $\\Delta y = \\dfrac{\\lambda L}{d}$ voneinander entfernt.');
  const DSIN = () => L('Bright where the path difference is a whole number of wavelengths: $\\Delta s = d\\cdot\\sin\\alpha = k\\cdot\\lambda$.', 'Hell, wo der Gangunterschied eine ganze Zahl von Wellenlängen ist: $\\Delta s = d\\cdot\\sin\\alpha = k\\cdot\\lambda$.');
  const WHY_K = () => L('That is the first bright fringe; the one of order $k$ is $k$ times as far from the centre: $y_k = k\\cdot\\lambda L/d$.', 'Das ist der erste helle Streifen; der der Ordnung $k$ ist $k$-mal so weit von der Mitte entfernt: $y_k = k\\cdot\\lambda L/d$.');
  const WHY_YHALF = () => L('That is a dark fringe: $\\Delta s = (k - \\tfrac12)\\cdot\\lambda$. Bright needs a whole number of wavelengths.', 'Das ist ein dunkler Streifen: $\\Delta s = (k - \\tfrac12)\\cdot\\lambda$. Hell braucht eine ganze Zahl von Wellenlängen.');
  const NUDGE_K = () => L('That is the first bright fringe. How far from the centre is the fringe of the order asked?', 'Das ist der erste helle Streifen. Wie weit von der Mitte ist der Streifen der gefragten Ordnung entfernt?');
  const NUDGE_YHALF = () => L('That is where a dark fringe lies. What must the path difference be at a bright fringe?', 'Dort liegt ein dunkler Streifen. Wie gross muss der Gangunterschied bei einem hellen Streifen sein?');
  // the pattern of a double slit (narrow slits) with the bright fringe of order k marked
  const dsPattern = (lam, L0, d, k, n = 2) => { const y1 = (lam * L0) / d; return Fg().pattern([{ lam, L: L0, d, N: n, b: 0 }], { Y: (Math.max(k, 2) + 1.4) * y1, ticks: Array.from({ length: Math.max(k, 2) + 1 }, (_, j) => j + 1).flatMap((j) => [[j * y1, j === k ? `${it$('y')}${sub$(k)}` : ''], [-j * y1, '']]) }); };
  const it$ = (s) => `<tspan font-style="italic">${s}</tspan>`, sub$ = (s) => `<tspan font-size="72%" dy="4">${s}</tspan><tspan dy="-4">​</tspan>`;
  const dsPos = {
    id: 'ds-pos', difficulty: 2,
    title: () => L('Where are the bright fringes?', 'Wo sind die hellen Streifen?'),
    make: dsMake,
    solve: (p, o = {}) => ({ y: ((o.half ? p.k - 0.5 : o.k ? 1 : p.k) * p.lam * p.L) / p.d }),
    traps: ['half', 'k'],
    why: { half: WHY_YHALF, k: WHY_K },
    nudge: { half: NUDGE_YHALF, k: NUDGE_K },
    fields: (p) => [num$('y', 'y_{' + p.k + '}', 'mm', p.k === 1 ? L('distance of the first bright fringe beside the centre', 'Abstand des ersten hellen Streifens neben der Mitte') : L(`distance of the ${ord(p.k)} order bright fringe from the centre`, `Abstand des hellen Streifens ${ord(p.k)} Ordnung von der Mitte`))],
    text: (p) => L(`Laser light with a wavelength of ${q(p.lam, 'nm')} falls on a double slit with a slit spacing of ${q(p.d, 'mm')}. The screen is ${q(p.L, 'm')} away. How far from the central bright fringe is the bright fringe of order ${p.k}?`,
      `Laserlicht mit einer Wellenlänge von ${q(p.lam, 'nm')} fällt auf einen Doppelspalt mit einem Spaltabstand von ${q(p.d, 'mm')}. Der Schirm ist ${q(p.L, 'm')} entfernt. Wie weit vom hellen Streifen in der Mitte ist der helle Streifen der Ordnung ${p.k} entfernt?`),
    hints: (p) => [
      L(`Given are the wavelength ${q(p.lam, 'nm')}, the slit spacing ${q(p.d, 'mm')} and the distance ${q(p.L, 'm')} to the screen; asked is the bright fringe of order ${p.k}. What must the path difference from the two slits be there?`, `Gegeben sind die Wellenlänge ${q(p.lam, 'nm')}, der Spaltabstand ${q(p.d, 'mm')} und der Abstand ${q(p.L, 'm')} zum Schirm; gefragt ist der helle Streifen der Ordnung ${p.k}. Wie gross muss der Gangunterschied der beiden Spalte dort sein?`),
      L(`${DSIN()} The angle is small, $\\sin\\alpha \\approx y/L$, so $y_k = k\\cdot\\lambda L/d$: here with $k = ${p.k}$, and $\\lambda$, $L$, $d$ in metres.`, `${DSIN()} Der Winkel ist klein, $\\sin\\alpha \\approx y/L$, also $y_k = k\\cdot\\lambda L/d$: hier mit $k = ${p.k}$, und $\\lambda$, $L$, $d$ in Metern.`),
      L(`Without a calculator, the ratio first: $\\lambda/d$ is a small pure number, here $${tnum(p.lam / p.d)}$. Then multiply by $k$ and by $L$.`, `Ohne Rechner zuerst das Verhältnis: $\\lambda/d$ ist eine kleine reine Zahl, hier $${tnum(p.lam / p.d)}$. Multipliziere dann mit $k$ und mit $L$.`),
    ],
    steps: (p, v) => [
      step(L('The path difference', 'Der Gangunterschied'), p$(L('From two slits at the distance $d$, the rays to a far point are almost parallel; the one from the lower slit is longer by $\\Delta s = d\\cdot\\sin\\alpha$.', 'Von zwei Spalten im Abstand $d$ sind die Strahlen zu einem fernen Punkt fast parallel; der vom unteren Spalt ist um $\\Delta s = d\\cdot\\sin\\alpha$ länger.')) + p$(DSIN()), ['zoom']),
      step(L('Small angles', 'Kleine Winkel'), p$(SMALL()), ['geo']),
      step(L('The numbers', 'Die Zahlen'), `$$y_{${p.k}} = \\frac{${p.k}\\cdot\\lambda\\cdot L}{d} = \\frac{${p.k}\\cdot ${tq(p.lam, 'm')}\\cdot ${tq(p.L, 'm')}}{${tq(p.d, 'm')}} = ${res(tq(v.y, 'mm'))}$$` +
        p$(`${NOCALC()} $${ratio(p.lam, p.d, '\\lambda', 'd')}$ ${L('(a small angle indeed), so', '(tatsächlich ein kleiner Winkel), also')} $y_{${p.k}} = ${p.k}\\cdot ${tq(p.L, 'm')}\\cdot ${tnum(p.lam / p.d)} = ${tq(v.y, 'mm')}$.`), ['pat']),
    ],
    // the task: the set-up; the steps: the path difference close up, the set-up, the pattern
    figure: (p, v, view) => {
      if (view.task || (view.show.has('geo') && !view.show.has('pat'))) return Fg().geometry();
      return view.show.has('zoom') && !view.show.has('pat') ? Fg().pathDiff() : dsPattern(p.lam, p.L, p.d, p.k);
    },
  };

  // the wavelength from the fringes (as with a HeNe laser in the notes)
  const dsLam = {
    id: 'ds-lam', difficulty: 3,
    title: () => L('Measuring a wavelength', 'Eine Wellenlänge messen'),
    make: (r) => { const p = dsMake(r); if (!p || p.k === 3) return null; p.both = r() < 0.5; return p; },
    solve: (p, o = {}) => { const D = ((p.both ? 2 : 1) * p.k * p.lam * p.L) / p.d, y = o.both ? D : p.both ? D / 2 : D; return { D, lam: (y * p.d) / (o.k ? 1 : p.k) / p.L }; },
    traps: ['both', 'k'],
    nudge: {
      both: () => L('From which fringe to which does the distance given reach? Which distance from the centre do you need?', 'Von welchem Streifen zu welchem reicht der gegebene Abstand? Welchen Abstand von der Mitte brauchst du?'),
      k: () => L('Of which order is the fringe? Have you taken it into account in the formula?', 'Welche Ordnung hat der Streifen? Hast du sie in der Formel berücksichtigt?'),
    },
    why: { both: () => L('Those are the fringes on both sides: the distance from the centre to one of them is half of it.', 'Das sind die Streifen auf beiden Seiten: Der Abstand von der Mitte zu einem von ihnen ist die Hälfte davon.'), k: () => L('The fringe of order $k$ lies at $y_k = k\\cdot\\lambda L/d$: divide by $k$ too.', 'Der Streifen der Ordnung $k$ liegt bei $y_k = k\\cdot\\lambda L/d$: Teile auch durch $k$.') },
    fields: () => [num$('lam', '\\lambda', 'nm', L('wavelength', 'Wellenlänge'))],
    text: (p) => {
      const D = ((p.both ? 2 : 1) * p.k * p.lam * p.L) / p.d;
      return p.both ? L(`Laser light falls on a double slit with a slit spacing of ${q(p.d, 'mm')}. On a screen ${q(p.L, 'm')} away, the two bright fringes of order ${p.k} on either side of the centre are ${q(D, 'mm')} apart. What is the wavelength?`, `Laserlicht fällt auf einen Doppelspalt mit einem Spaltabstand von ${q(p.d, 'mm')}. Auf einem Schirm in ${q(p.L, 'm')} Entfernung sind die beiden hellen Streifen der Ordnung ${p.k} links und rechts der Mitte ${q(D, 'mm')} voneinander entfernt. Wie gross ist die Wellenlänge?`)
        : L(`Laser light falls on a double slit with a slit spacing of ${q(p.d, 'mm')}. On a screen ${q(p.L, 'm')} away, the bright fringe of order ${p.k} is ${q(D, 'mm')} from the central one. What is the wavelength?`, `Laserlicht fällt auf einen Doppelspalt mit einem Spaltabstand von ${q(p.d, 'mm')}. Auf einem Schirm in ${q(p.L, 'm')} Entfernung ist der helle Streifen der Ordnung ${p.k} vom mittleren ${q(D, 'mm')} entfernt. Wie gross ist die Wellenlänge?`);
    },
    hints: (p) => {
      const D = ((p.both ? 2 : 1) * p.k * p.lam * p.L) / p.d;
      return [
        p.both ? L(`The ${q(D, 'mm')} reach from the bright fringe of order ${p.k} on one side to the one on the other. How far is one of them from the centre?`, `Die ${q(D, 'mm')} reichen vom hellen Streifen der Ordnung ${p.k} auf der einen Seite bis zu jenem auf der anderen. Wie weit ist einer von ihnen von der Mitte entfernt?`)
          : L(`The bright fringe of order ${p.k} is ${q(D, 'mm')} from the centre; the slits are ${q(p.d, 'mm')} apart, the screen ${q(p.L, 'm')} away.`, `Der helle Streifen der Ordnung ${p.k} ist ${q(D, 'mm')} von der Mitte entfernt; die Spalte sind ${q(p.d, 'mm')} voneinander entfernt, der Schirm ${q(p.L, 'm')}.`),
        L(`${SMALL()} Solve $y_k = k\\cdot\\lambda L/d$ for $\\lambda$, with $k = ${p.k}$ and $y_${p.k}$ the distance from the centre.`, `${SMALL()} Löse $y_k = k\\cdot\\lambda L/d$ nach $\\lambda$ auf, mit $k = ${p.k}$ und $y_${p.k}$ dem Abstand von der Mitte.`),
        L(`Without a calculator: first $${p.k === 1 ? 'y_1/L' : `y_${p.k}/(${p.k}\\cdot L)`}$, with $y$ in mm and $L$ in m (a small pure number, in thousandths), then multiply by $d$.`, `Ohne Rechner: zuerst $${p.k === 1 ? 'y_1/L' : `y_${p.k}/(${p.k}\\cdot L)`}$, mit $y$ in mm und $L$ in m (eine kleine reine Zahl, in Tausendsteln), dann mal $d$.`),
      ];
    },
    steps: (p, v) => {
      const y = p.both ? v.D / 2 : v.D;
      return [
        step(L('From the centre', 'Von der Mitte aus'), p$(p.both ? L(`The fringe of order ${p.k} is half of that from the centre: $y_{${p.k}} = ${tq(y, 'mm')}$.`, `Der Streifen der Ordnung ${p.k} ist halb so weit von der Mitte entfernt: $y_{${p.k}} = ${tq(y, 'mm')}$.`) : L(`$y_{${p.k}} = ${tq(y, 'mm')}$ from the centre.`, `$y_{${p.k}} = ${tq(y, 'mm')}$ von der Mitte aus.`)) + p$(SMALL()), ['pat']),
        step(L('The wavelength', 'Die Wellenlänge'), `$$\\lambda = \\frac{y_{${p.k}}\\cdot d}{${p.k}\\cdot L} = \\frac{${tq(y, 'm')}\\cdot ${tq(p.d, 'm')}}{${p.k}\\cdot ${tq(p.L, 'm')}} = ${res(tq(v.lam, 'nm'))}$$` +
          p$(`${NOCALC()} $\\frac{y_{${p.k}}}{${p.k}\\cdot L} = \\frac{${tq(y, 'mm')}}{${tq(p.k * p.L, 'm')}} = ${tnum(y / (p.k * p.L))}$, ${L('so', 'also')} $\\lambda = ${tnum(y / (p.k * p.L))}\\cdot ${tq(p.d, 'mm')} = ${tq(v.lam, 'nm')}$.`), ['pat']),
      ];
    },
    figure: (p, v, view) => (view.task ? Fg().geometry() : dsPattern(p.lam, p.L, p.d, p.k)),
  };

  // ================================================================ 4 the grating
  // n lines per mm: d = 1/n; the same positions as a double slit with that spacing, much sharper
  const GRATING = () => L('A grating has its maxima where a double slit with the same spacing $d$ has them: $d\\cdot\\sin\\alpha = k\\cdot\\lambda$. With many slits they are much sharper and brighter.', 'Ein Gitter hat seine Maxima dort, wo ein Doppelspalt mit demselben Abstand $d$ sie hat: $d\\cdot\\sin\\alpha = k\\cdot\\lambda$. Mit vielen Spalten sind sie viel schärfer und heller.');
  const grating = {
    id: 'grating', difficulty: 2,
    title: () => L('A grating', 'Ein Gitter'),
    make: (r) => {
      const p = { n: pick(r, [50, 100, 200]), lam: pick(r, DS_LAM), L: pick(r, [0.5, 1, 2]), k: pick(r, [1, 2]) }, d = 1e-3 / p.n;
      return (p.k * p.lam) / d <= 0.1 && tidy((p.k * p.lam * p.L) / d, 'cm') ? p : null;
    },
    solve: (p, o = {}) => { const d = 1e-3 / p.n; return { d, y: ((o.half ? p.k - 0.5 : o.k ? 1 : p.k) * p.lam * p.L) / d }; },
    traps: ['half', 'k'],
    why: { half: WHY_YHALF, k: WHY_K },
    nudge: { half: NUDGE_YHALF, k: NUDGE_K },
    fields: (p) => [num$('d', 'd', 'μm', L('slit spacing', 'Spaltabstand')), num$('y', `y_{${p.k}}`, 'cm', L(`distance of the maximum of order ${p.k} from the centre`, `Abstand des Maximums ${p.k}. Ordnung von der Mitte`))],
    text: (p) => L(`A grating with ${p.n} lines per millimetre is lit by laser light with a wavelength of ${q(p.lam, 'nm')}. The screen is ${q(p.L, 'm')} away. What is the slit spacing, and how far from the central maximum is the maximum of order ${p.k}?`,
      `Ein Gitter mit ${p.n} Linien pro Millimeter wird mit Laserlicht der Wellenlänge ${q(p.lam, 'nm')} beleuchtet. Der Schirm ist ${q(p.L, 'm')} entfernt. Wie gross ist der Spaltabstand, und wie weit vom mittleren Maximum ist das Maximum der Ordnung ${p.k} entfernt?`),
    hints: (p) => [
      L(`${p.n} lines share one millimetre: how far apart are neighbouring slits, $d = 1/n$? Give it in μm (1 mm = 1000 μm).`, `${p.n} Linien teilen sich einen Millimeter: Wie weit sind benachbarte Spalte voneinander entfernt, $d = 1/n$? Gib es in μm an (1 mm = 1000 μm).`),
      L(`${GRATING()} For order ${p.k} the angle is small here, so $y_k = k\\cdot\\lambda L/d$, with the wavelength, the distance to the screen and your $d$, all in metres.`, `${GRATING()} Für die Ordnung ${p.k} ist der Winkel hier klein, also $y_k = k\\cdot\\lambda L/d$, mit der Wellenlänge, dem Abstand zum Schirm und deinem $d$, alles in Metern.`),
      L(`Without a calculator: $\\lambda/d$ first, both in μm (${q(p.lam, 'nm')} = ${q(p.lam, 'μm')}): a small pure number. Then multiply by $k$ and by $L$.`, `Ohne Rechner: zuerst $\\lambda/d$, beide in μm (${q(p.lam, 'nm')} = ${q(p.lam, 'μm')}): eine kleine reine Zahl. Dann mal $k$ und mal $L$.`),
    ],
    steps: (p, v) => [
      step(L('The slit spacing', 'Der Spaltabstand'), `$$d = \\frac{1}{n} = \\frac{1\\,\\mathrm{mm}}{${p.n}} = ${res(tq(v.d, 'μm'))}$$`),
      step(L('The maximum', 'Das Maximum'), p$(GRATING()) + p$(L(`Here $k\\lambda/d = ${tnum((p.k * p.lam) / v.d)}$: a small angle, so $\\sin\\alpha \\approx y/L$:`, `Hier ist $k\\lambda/d = ${tnum((p.k * p.lam) / v.d)}$: ein kleiner Winkel, also $\\sin\\alpha \\approx y/L$:`)) +
        `$$y_{${p.k}} = \\frac{${p.k}\\cdot\\lambda\\cdot L}{d} = \\frac{${p.k}\\cdot ${tq(p.lam, 'm')}\\cdot ${tq(p.L, 'm')}}{${tq(v.d, 'm')}} = ${res(tq(v.y, 'cm'))}$$` +
        p$(`${NOCALC()} $${ratio(p.lam, v.d, '\\lambda', 'd')}$, ${L('so', 'also')} $y_{${p.k}} = ${p.k}\\cdot ${tq(p.L, 'm')}\\cdot ${tnum(p.lam / v.d)} = ${tq(v.y, 'cm')}$.`), ['pat']),
    ],
    figure: (p, v, view) => (view.task ? '' : dsPattern(p.lam, p.L, v.d, p.k, 8)),
  };

  // sin α = k·λ/d = k·n·λ ≤ 1: the highest order
  const gratingMax = {
    id: 'grating-max', difficulty: 3, quizChoice: true,
    title: () => L('How many orders?', 'Wie viele Ordnungen?'),
    make: (r) => {
      const p = { n: pick(r, [200, 250, 300, 400, 500, 600, 800]), lam: pick(r, DS_LAM), off: Math.floor(r() * 3) }, s = sig(p.n * 1e3 * p.lam, 6), x = 1 / s;
      return Math.abs(s * 100 - Math.round(s * 100)) < 1e-9 && x > 1.2 && x < 7 && x - Math.floor(x) > 0.05 ? p : null;
    },
    solve: (p) => { const s = sig(p.n * 1e3 * p.lam, 6); return { d: 1e-3 / p.n, s, kmax: String(Math.floor(1 / s)) }; },
    traps: [],
    fields: (p, v) => {
      const k = Number(v.kmax), lo = Math.max(1, k - p.off), ks = [lo, lo + 1, lo + 2, lo + 3];
      const why = (j) => (j > k ? L(`For order ${j}, $\\sin\\alpha = ${j}\\cdot ${tnum(v.s)} = ${tnum(sig(j * v.s))}$, more than 1: no angle has that sine; that order does not exist.`, `Für die Ordnung ${j} wäre $\\sin\\alpha = ${j}\\cdot ${tnum(v.s)} = ${tnum(sig(j * v.s))}$, mehr als 1: Kein Winkel hat diesen Sinus; diese Ordnung gibt es nicht.`)
        : L(`Order ${j + 1} still has $\\sin\\alpha = ${tnum(sig((j + 1) * v.s))}$, less than 1: it is seen too.`, `Auch die Ordnung ${j + 1} hat noch $\\sin\\alpha = ${tnum(sig((j + 1) * v.s))}$, weniger als 1: Sie ist auch zu sehen.`));
      const nudge = (j) => (j > k ? L(`Work out $\\sin\\alpha$ for order ${j}: is there an angle with that sine?`, `Berechne $\\sin\\alpha$ für die Ordnung ${j}: Gibt es einen Winkel mit diesem Sinus?`)
        : L('Check the next higher order too: what would $\\sin\\alpha$ be there?', 'Prüfe auch die nächsthöhere Ordnung: Wie gross wäre dort $\\sin\\alpha$?'));
      return [num$('s', '\\sin\\alpha_1', '', L('first order:', '1. Ordnung:')),
        choice('kmax', L('Highest order:', 'Höchste Ordnung:'), ks.map((j) => [String(j), String(j), j === k ? '' : why(j), j === k ? null : j > k ? 'round' : null, j === k ? '' : nudge(j)]), { ask: L('What is the highest order that can be seen?', 'Was ist die höchste Ordnung, die man sieht?') })];
    },
    // with the key of one field (the check asks for one), the question asks for that one only
    text: (p, key) => L(`Light with a wavelength of ${q(p.lam, 'nm')} falls perpendicularly on a grating with ${p.n} lines per millimetre. ${{ s: 'What is $\\sin\\alpha$ for the maximum of the first order?', kmax: 'What is the highest order that can be seen?' }[key] || 'What is $\\sin\\alpha$ for the maximum of the first order, and what is the highest order that can be seen?'}`,
      `Licht mit einer Wellenlänge von ${q(p.lam, 'nm')} fällt senkrecht auf ein Gitter mit ${p.n} Linien pro Millimeter. ${{ s: 'Wie gross ist $\\sin\\alpha$ für das Maximum erster Ordnung?', kmax: 'Was ist die höchste Ordnung, die man sieht?' }[key] || 'Wie gross ist $\\sin\\alpha$ für das Maximum erster Ordnung, und was ist die höchste Ordnung, die man sieht?'}`),
    hints: (p) => [
      L(`The grating has ${p.n} lines per mm, the light a wavelength of ${q(p.lam, 'nm')}. Where is the maximum of order $k$, and how large can $\\sin\\alpha$ be at most?`, `Das Gitter hat ${p.n} Linien pro mm, das Licht eine Wellenlänge von ${q(p.lam, 'nm')}. Wo liegt das Maximum der Ordnung $k$, und wie gross kann $\\sin\\alpha$ höchstens sein?`),
      L(`$d\\cdot\\sin\\alpha = k\\cdot\\lambda$ with $d = 1/n$: so $\\sin\\alpha_k = k\\cdot n\\cdot\\lambda$. Take $n$ per metre (${p.n} per mm are $${tnum(p.n * 1e3)}$ per m) and $\\lambda$ in metres.`, `$d\\cdot\\sin\\alpha = k\\cdot\\lambda$ mit $d = 1/n$: also $\\sin\\alpha_k = k\\cdot n\\cdot\\lambda$. Nimm $n$ pro Meter (${p.n} pro mm sind $${tnum(p.n * 1e3)}$ pro m) und $\\lambda$ in Metern.`),
      L('Order $k$ has $k$ times the sine of the first order. Try $k = 1, 2, 3, \\ldots$: the last order whose sine is still below 1 is the highest one seen.', 'Die Ordnung $k$ hat den $k$-fachen Sinus der ersten Ordnung. Probier $k = 1, 2, 3, \\ldots$: Die letzte Ordnung, deren Sinus noch unter 1 liegt, ist die höchste, die man sieht.'),
    ],
    steps: (p, v) => [
      step(L('The first order', 'Die erste Ordnung'), p$(L('$d\\cdot\\sin\\alpha = k\\cdot\\lambda$ with $d = 1/n$:', '$d\\cdot\\sin\\alpha = k\\cdot\\lambda$ mit $d = 1/n$:')) + `$$\\sin\\alpha_1 = \\frac{\\lambda}{d} = n\\cdot\\lambda = ${tnum(p.n * 1e3)}\\,\\mathrm{m^{-1}}\\cdot ${tq(p.lam, 'm')} = ${res(tnum(v.s))}$$`),
      step(L('The highest order', 'Die höchste Ordnung'), p$(L(`Order $k$ has $\\sin\\alpha_k = k\\cdot ${tnum(v.s)}$, and a sine cannot be more than 1: $k \\le 1/${tnum(v.s)} = ${tnum(sig(1 / v.s, 3))}$. The highest order is <span class="result">${v.kmax}</span>${Number(v.kmax) > 1 ? `: on each side ${v.kmax} maxima, ${2 * v.kmax + 1} with the central one` : ''}.`, `Die Ordnung $k$ hat $\\sin\\alpha_k = k\\cdot ${tnum(v.s)}$, und ein Sinus kann nicht grösser als 1 sein: $k \\le 1/${tnum(v.s)} = ${tnum(sig(1 / v.s, 3))}$. Die höchste Ordnung ist <span class="result">${v.kmax}</span>${Number(v.kmax) > 1 ? `: auf jeder Seite ${v.kmax} Maxima, ${2 * v.kmax + 1} mit dem mittleren` : ''}.`)) +
        p$(L('The angles are large here: $\\sin\\alpha \\approx y/L$ no longer holds.', 'Die Winkel sind hier gross: $\\sin\\alpha \\approx y/L$ gilt nicht mehr.'))),
    ],
    figure: () => '',
  };

  // ================================================================ 5 how the pattern changes
  // A setup: the quantity asked (sym, its formula), the quantities that may change with the power
  // they enter it (0: not at all), and the base values of the figure.
  const FACT = {
    9: ['becomes nine times as large', 'wird neunmal so gross'], 4: ['becomes four times as large', 'wird viermal so gross'], 3: ['triples', 'verdreifacht sich'], 2: ['doubles', 'verdoppelt sich'], 1: ['stays the same', 'bleibt gleich'],
    '1/2': ['halves', 'halbiert sich'], '1/3': ['falls to a third', 'sinkt auf einen Drittel'], '1/4': ['falls to a quarter', 'sinkt auf einen Viertel'], '1/9': ['falls to a ninth', 'sinkt auf einen Neuntel'],
  };
  // the dative of a German noun phrase (der Abstand → dem Abstand, die Breite → der Breite)
  const dat = (s) => s.replace(/^der kleinste /, 'dem kleinsten ').replace(/^der /, 'dem ').replace(/^die /, 'der ');
  const fkey = (r) => (r >= 1 ? String(Math.round(r)) : `1/${Math.round(1 / r)}`);
  const fact = (r) => L(...FACT[fkey(r)]);
  const VERB = { 2: ['doubled', 'verdoppelt'], 3: ['tripled', 'verdreifacht'], '1/2': ['halved', 'halbiert'], '1/3': ['reduced to a third', 'auf einen Drittel verkleinert'] };
  const VARS = {
    lam: () => L('the wavelength $\\lambda$', 'die Wellenlänge $\\lambda$'), L: () => L('the distance $L$ to the screen', 'der Abstand $L$ zum Schirm'),
    d: () => L('the slit spacing $d$', 'der Spaltabstand $d$'), b: () => L('the width $b$ of the slits', 'die Breite $b$ der Spalte'), b1: () => L('the width $b$ of the slit', 'die Breite $b$ des Spalts'),
    n: () => L('the number $n$ of lines per millimetre', 'die Anzahl $n$ Linien pro Millimeter'), N: () => L('the number $N$ of lit slits (by widening the beam)', 'die Anzahl $N$ beleuchteter Spalte (durch Aufweiten des Strahls)'),
    D: () => L('the diameter $D$ of its mirror', 'der Durchmesser $D$ seines Spiegels'),
    lamr: () => L('the wavelength $\\lambda$ at which it observes', 'die Beobachtungswellenlänge $\\lambda$'), Ddish: () => L('the diameter $D$ of its dish', 'der Durchmesser $D$ seiner Schüssel'),
    Dp: () => L('the diameter $D$ of your pupil', 'der Durchmesser $D$ deiner Pupille'), Da: () => L('the diameter $D$ of the aperture (the opening of the lens)', 'der Durchmesser $D$ der Blende (der Öffnung des Objektivs)'),
  };
  const SETUPS = {
    ds: { sym: '\\Delta y', tex: '\\Delta y = \\frac{\\lambda L}{d}', vars: { lam: 1, L: 1, d: -1, b: 0 }, base: { lam: 600e-9, L: 2, d: 0.25e-3, b: 0.05e-3, N: 2 },
      what: () => L('the distance $\\Delta y$ between neighbouring bright fringes', 'der Abstand $\\Delta y$ benachbarter heller Streifen'),
      intro: () => L('Laser light falls on a double slit; on a screen far behind it you see a row of bright fringes.', 'Laserlicht fällt auf einen Doppelspalt; auf einem Schirm weit dahinter siehst du eine Reihe heller Streifen.') },
    ss: { sym: 'w', tex: 'w = \\frac{2\\lambda L}{b}', vars: { lam: 1, L: 1, b1: -1 }, base: { lam: 600e-9, L: 2, b: 0.1e-3, N: 1 },
      what: () => L('the width $w$ of the central bright fringe', 'die Breite $w$ des mittleren hellen Streifens'),
      intro: () => L('Laser light falls on a single slit; on a screen far behind it you see a wide central bright fringe with weaker ones beside it.', 'Laserlicht fällt auf einen Einzelspalt; auf einem Schirm weit dahinter siehst du einen breiten hellen Streifen in der Mitte, daneben schwächere.') },
    gr: { sym: 'y_1', tex: 'y_1 = \\frac{\\lambda L}{d} = \\lambda L n', vars: { lam: 1, L: 1, n: 1, N: 0 }, base: { lam: 500e-9, L: 1, d: 10e-6, b: 0, N: 6 },
      what: () => L('the distance $y_1$ of the first-order maxima from the centre', 'der Abstand $y_1$ der Maxima erster Ordnung von der Mitte'),
      intro: () => L('Laser light falls on a grating; on a screen far behind it you see sharp bright spots.', 'Laserlicht fällt auf ein Gitter; auf einem Schirm weit dahinter siehst du scharfe helle Punkte.') },
    res: { sym: '\\theta_{\\min}', tex: '\\theta_{\\min} = 1.22\\,\\frac{\\lambda}{D}', vars: { lam: 1, D: -1 }, res: true,
      what: () => L('the smallest angle $\\theta_{\\min}$ between two stars that it can still resolve', 'der kleinste Winkel $\\theta_{\\min}$ zwischen zwei Sternen, die es noch trennen kann'),
      intro: () => L('A telescope looks at pairs of stars close together in the sky.', 'Ein Teleskop beobachtet Paare von Sternen, die am Himmel nahe beieinander stehen.'),
      finer: () => L('The telescope now resolves finer detail: stars closer together.', 'Das Teleskop trennt jetzt feinere Einzelheiten: näher beieinander stehende Sterne.'),
      blurred: () => L('The telescope now resolves less: the images of the stars are more blurred.', 'Das Teleskop trennt jetzt weniger: Die Bilder der Sterne sind stärker verwaschen.'),
      same: () => L('after: the same two stars', 'nachher: dieselben zwei Sterne') },
    // the same formula for a radio telescope, the eye and a camera lens
    radio: { sym: '\\theta_{\\min}', tex: '\\theta_{\\min} = 1.22\\,\\frac{\\lambda}{D}', vars: { lamr: 1, Ddish: -1 }, res: true,
      what: () => L('the smallest angle $\\theta_{\\min}$ between two radio sources that it can still resolve', 'der kleinste Winkel $\\theta_{\\min}$ zwischen zwei Radioquellen, die es noch trennen kann'),
      intro: () => L('A radio telescope looks at pairs of radio sources (distant galaxies) close together in the sky.', 'Ein Radioteleskop beobachtet Paare von Radioquellen (fernen Galaxien), die am Himmel nahe beieinander stehen.'),
      finer: () => L('The radio telescope now resolves finer detail: sources closer together.', 'Das Radioteleskop trennt jetzt feinere Einzelheiten: näher beieinander stehende Quellen.'),
      blurred: () => L('The radio telescope now resolves less: the images of the sources are more blurred.', 'Das Radioteleskop trennt jetzt weniger: Die Bilder der Quellen sind stärker verwaschen.'),
      same: () => L('after: the same two sources', 'nachher: dieselben zwei Quellen') },
    eye: { sym: '\\theta_{\\min}', tex: '\\theta_{\\min} = 1.22\\,\\frac{\\lambda}{D}', vars: { Dp: -1 }, res: true,
      what: () => L('the smallest angle $\\theta_{\\min}$ between two lamps that your eye can still resolve (by diffraction alone)', 'der kleinste Winkel $\\theta_{\\min}$ zwischen zwei Lampen, die dein Auge (allein wegen der Beugung) noch trennen kann'),
      intro: () => L('You look at the two headlights of a car far away on a straight road.', 'Du schaust auf die beiden Scheinwerfer eines Autos weit weg auf einer geraden Strasse.'),
      finer: () => L('Your eye now resolves finer detail: the two headlights can be seen as two from further away.', 'Dein Auge trennt jetzt feinere Einzelheiten: Die beiden Scheinwerfer sind auch aus grösserer Entfernung als zwei zu sehen.'),
      blurred: () => L('Your eye now resolves less: the two headlights merge into one from a shorter distance already.', 'Dein Auge trennt jetzt weniger: Die beiden Scheinwerfer verschmelzen schon aus kleinerer Entfernung zu einem.'),
      same: () => L('after: the same two headlights', 'nachher: dieselben zwei Scheinwerfer') },
    cam: { sym: '\\theta_{\\min}', tex: '\\theta_{\\min} = 1.22\\,\\frac{\\lambda}{D}', vars: { Da: -1 }, res: true,
      what: () => L('the smallest angle $\\theta_{\\min}$ between two lamps that the camera can still resolve (by diffraction alone)', 'der kleinste Winkel $\\theta_{\\min}$ zwischen zwei Lampen, welche die Kamera (allein wegen der Beugung) noch trennen kann'),
      intro: () => L('A camera with a telephoto lens photographs two small lamps far away.', 'Eine Kamera mit einem Teleobjektiv fotografiert zwei kleine Lampen in grosser Entfernung.'),
      finer: () => L('The camera now resolves finer detail: lamps closer together.', 'Die Kamera trennt jetzt feinere Einzelheiten: näher beieinander stehende Lampen.'),
      blurred: () => L('The camera now resolves less: the images of the lamps are more blurred.', 'Die Kamera trennt jetzt weniger: Die Bilder der Lampen sind stärker verwaschen.'),
      same: () => L('after: the same two lamps', 'nachher: dieselben zwei Lampen') },
  };
  // what one sees, after the change
  function seen(s, v, r) {
    if (SETUPS[s].res) return r < 1 ? SETUPS[s].finer() : SETUPS[s].blurred();
    if (v === 'b') return L('The fringes stay where they are; what changes is the envelope, the pattern of each single slit: narrower slits spread the light more, so more fringes are bright, and wider slits fewer.', 'Die Streifen bleiben, wo sie sind; was sich ändert, ist die Einhüllende, das Muster jedes einzelnen Spalts: Schmalere Spalte streuen das Licht stärker, also sind mehr Streifen hell, breitere weniger.');
    if (v === 'N') return L('The maxima stay where they are; with more slits they become sharper and brighter, with fewer broader.', 'Die Maxima bleiben, wo sie sind; mit mehr Spalten werden sie schärfer und heller, mit weniger breiter.');
    return r > 1 ? L('The whole pattern spreads out.', 'Das ganze Muster wird breiter.') : L('The whole pattern shrinks together.', 'Das ganze Muster zieht sich zusammen.');
  }
  // the figure: the pattern before (dashed) and after; for the telescope, two stars before and after
  function changeFigure(p, after) {
    const S = SETUPS[p.s];
    // two stars a little more than θ_min apart: after the change, in units of the new θ_min
    if (S.res) return Fg().airy(1.15, { caption: L('before: just resolved', 'vorher: knapp getrennt') }) + (after ? Fg().airy(1.15, { scale: after ** S.vars[p.v], caption: S.same() }) : '');
    const c0 = { ...S.base }, c1 = { ...S.base }, k = p.k;
    if (after) {
      if (p.v === 'lam') c1.lam *= k; if (p.v === 'L') c1.L *= k; if (p.v === 'd') c1.d *= k; if (p.v === 'n') c1.d /= k;
      if (p.v === 'b' || p.v === 'b1') c1.b *= k; if (p.v === 'N') c1.N = Math.round(c1.N * k);
    }
    const reach = (c) => (p.s === 'gr' ? 2.4 * (c.lam * c.L) / c.d : p.s === 'ss' ? 3.3 * (c.lam * c.L) / c.b : 1.15 * (c.lam * c.L) / c.b);
    const Y = Math.max(reach(c0), after ? reach(c1) : 0);
    return Fg().pattern(after ? [{ ...c0, cls: 'old' }, c1] : [c0], { Y, label: after ? L('The pattern on the screen before (dashed) and after the change (solid), with the screen after it below', 'Das Muster auf dem Schirm vor (gestrichelt) und nach der Änderung (ausgezogen), darunter der Schirm nachher') : undefined });
  }
  function changeOf(id, setups, flags) {
    return {
      id, difficulty: 2, quizChoice: true,
      title: () => (id === 'res-change' ? L('Finer or blurrier?', 'Feiner oder verwaschener?') : L('What changes?', 'Was ändert sich?')),
      make: (r) => { const s = pick(r, setups), v = pick(r, Object.keys(SETUPS[s].vars)); return { s, v, k: pick(r, [2, 3, 1 / 2, 1 / 3]) }; },
      solve: (p) => ({ ans: fkey(p.k ** SETUPS[p.s].vars[p.v]) }),
      traps: [],
      fields: (p, v) => {
        const S = SETUPS[p.s], e = S.vars[p.v], r = p.k ** e, vn = VARS[p.v]();
        const zero = p.v === 'N' ? 'grating' : 'bd';
        const opts = e ? [[r, ''], [1 / r, flags.inv], [1, flags.same], [r * r, null]] : [[1, ''], [p.k, zero], [1 / p.k, zero], [p.k * p.k, null]];
        const why = (x, flag) => {
          if (!e) return p.v === 'b' ? L('The slit width $b$ does not appear in $\\Delta y = \\lambda L/d$: it changes the envelope (how far out the fringes are bright), not their spacing.', 'Die Spaltbreite $b$ kommt in $\\Delta y = \\lambda L/d$ nicht vor: Sie ändert die Einhüllende (wie weit hinaus die Streifen hell sind), nicht ihren Abstand.')
            : L('The number of slits changes how sharp and bright the maxima are, not where they are: $y_1 = \\lambda L/d$.', 'Die Anzahl Spalte ändert, wie scharf und hell die Maxima sind, nicht wo sie liegen: $y_1 = \\lambda L/d$.');
          if (flag === flags.same) return L(`$${S.sym}$ depends on ${vn}: $${S.tex}$.`, `$${S.sym}$ hängt von ${dat(vn)} ab: $${S.tex}$.`);
          if (flag === flags.inv) return e > 0 ? L(`Turned round: ${vn} stands in the numerator of $${S.tex}$, so $${S.sym}$ grows in proportion.`, `Umgekehrt: ${cap(vn)} steht im Zähler von $${S.tex}$, also wächst $${S.sym}$ im selben Verhältnis.`)
            : L(`Turned round: ${vn} stands in the denominator of $${S.tex}$, so $${S.sym}$ shrinks when it grows.${S.res ? ' A larger opening diffracts less.' : ' The narrower or closer the slits, the wider the pattern.'}`, `Umgekehrt: ${cap(vn)} steht im Nenner von $${S.tex}$, also wird $${S.sym}$ kleiner, wenn diese Grösse wächst.${S.res ? ' Eine grössere Öffnung beugt weniger.' : ' Je schmaler oder näher die Spalte, desto breiter das Muster.'}`);
          return L(`${cap(vn)} enters $${S.tex}$ once, not squared.`, `${cap(vn)} kommt in $${S.tex}$ einfach vor, nicht im Quadrat.`);
        };
        // the nudge after a wrong answer in practice (why, shown in the check, gives the answer away)
        const nudge = (x, flag) => {
          if (!e) return p.v === 'b' ? L('Does the slit width $b$ appear in the formula for $\\Delta y$ at all? What does it change in the pattern?', 'Kommt die Spaltbreite $b$ in der Formel für $\\Delta y$ überhaupt vor? Was ändert sie am Muster?')
            : L('Does the position of the maxima depend on the number of slits? Write down the formula for $y_1$.', 'Hängt die Lage der Maxima von der Anzahl Spalte ab? Schreib die Formel für $y_1$ auf.');
          if (flag === flags.same) return L(`$${S.sym}$ depends on ${vn}. How? Write down the formula.`, `$${S.sym}$ hängt von ${dat(vn)} ab. Wie genau? Schreib die Formel auf.`);
          if (flag === flags.inv) return L(`Check the direction: does ${vn} stand in the numerator or in the denominator of the formula for $${S.sym}$?`, `Prüfe die Richtung: Steht ${vn} im Zähler oder im Nenner der Formel für $${S.sym}$?`);
          return L(`To which power does ${vn} enter the formula for $${S.sym}$?`, `Mit welcher Potenz kommt ${vn} in der Formel für $${S.sym}$ vor?`);
        };
        const list = opts.slice().sort((a, b) => a[0] - b[0]).map(([x, flag]) => [fkey(x), `$${S.sym}$ ${fact(x)}`, flag === '' ? '' : why(x, flag), flag || null, flag === '' ? '' : nudge(x, flag)]);
        return [choice('ans', L('Then:', 'Dann:'), list, { stack: true, ask: L(`What happens to ${S.what()}?`, `Was passiert mit ${dat(S.what())}?`) })];
      },
      text: (p) => { const S = SETUPS[p.s], vb = VERB[fkey(p.k)]; return `${S.intro()} ${L(`${cap(VARS[p.v]())} is ${vb[0]}; everything else stays the same. What happens to ${S.what()}?`, `${cap(VARS[p.v]())} wird ${vb[1]}; alles andere bleibt gleich. Was passiert mit ${dat(S.what())}?`)}`; },
      hints: (p) => {
        const S = SETUPS[p.s], vn = VARS[p.v](), vb = VERB[fkey(p.k)];
        return [
          L(`Only one thing changes: ${vn} is ${vb[0]}. Asked is ${S.what()}: which formula gives it?`, `Nur eines ändert sich: ${cap(vn)} wird ${vb[1]}. Gefragt ist ${S.what()}: Welche Formel gilt dafür?`),
          L(`$${S.tex}$: does ${vn} stand in the numerator, in the denominator, or not in it at all, and to which power? Then apply the factor of the change to $${S.sym}$.`, `$${S.tex}$: Steht ${vn} im Zähler, im Nenner oder gar nicht darin, und mit welcher Potenz? Wende dann den Faktor der Änderung auf $${S.sym}$ an.`),
        ];
      },
      steps: (p, v) => {
        const S = SETUPS[p.s], e = S.vars[p.v], vn = VARS[p.v](), r = p.k ** e;
        return [
          step(L('The formula', 'Die Formel'), `$$${S.tex}$$` + (S.res ? p$(p.s === 'res' ? L('The smaller $\\theta_{\\min}$, the finer the detail the telescope resolves.', 'Je kleiner $\\theta_{\\min}$, desto feinere Einzelheiten trennt das Teleskop.') : L('The smaller $\\theta_{\\min}$, the finer the detail that can be resolved.', 'Je kleiner $\\theta_{\\min}$, desto feinere Einzelheiten lassen sich trennen.')) : '')),
          step(L('The change', 'Die Änderung'), p$(e ? L(`${cap(vn)} stands in the ${e > 0 ? 'numerator' : 'denominator'}: it is ${VERB[fkey(p.k)][0]}, so $${S.sym}$ <span class="result">${fact(r)}</span>.`, `${cap(vn)} steht im ${e > 0 ? 'Zähler' : 'Nenner'} und wird ${VERB[fkey(p.k)][1]}: $${S.sym}$ <span class="result">${fact(r)}</span>.`)
            : L(`${cap(vn)} does not appear: $${S.sym}$ <span class="result">${fact(1)}</span>.`, `${cap(vn)} kommt nicht vor: $${S.sym}$ <span class="result">${fact(1)}</span>.`)) + p$(seen(p.s, p.v, r)), ['after']),
        ];
      },
      figure: (p, v, view) => changeFigure(p, !view.task && view.show.has('after') ? p.k : 0),
    };
  }
  const change = changeOf('change', ['ds', 'ds', 'ss', 'gr'], { inv: 'inv', same: 'same' });
  const resChange = changeOf('res-change', ['res', 'radio', 'eye', 'cam'], { inv: 'rinv', same: 'rsame' });

  // the central fringe of a single slit, w = 2·λ·L/b; or the width of a hair from it (a hair
  // gives the same pattern as a slit of its width)
  const single = {
    id: 'single', difficulty: 3,
    title: (p) => (p.hair ? L('The width of a hair', 'Die Dicke eines Haars') : L('A single slit', 'Ein Einzelspalt')),
    make: (r) => {
      const p = { lam: pick(r, DS_LAM), L: pick(r, DS_L), b: mm(pick(r, [0.05, 0.1, 0.2, 0.25, 0.5])), hair: r() < 0.5 };
      const w = (2 * p.lam * p.L) / p.b;
      return permille(p.lam / p.b) && w <= 80e-3 && (!p.hair || p.b <= 0.1e-3) ? p : null;
    },
    solve: (p, o = {}) => { const w = (2 * p.lam * p.L) / p.b; return p.hair ? { w, b: ((o.whole ? 1 : 2) * p.lam * p.L) / w } : { w: o.whole ? w / 2 : w }; },
    traps: ['whole'],
    nudge: { whole: () => L('From where to where does the central bright fringe reach? Compare that with the distance of the first dark fringe from the centre.', 'Von wo bis wo reicht der mittlere helle Streifen? Vergleiche das mit dem Abstand des ersten dunklen Streifens von der Mitte.') },
    why: { whole: () => L('The central bright fringe reaches from the first dark fringe on one side to the first on the other: it is twice as wide as the distance $y_1 = \\lambda L/b$ of one of them from the centre.', 'Der mittlere helle Streifen reicht vom ersten dunklen Streifen auf der einen Seite bis zum ersten auf der anderen: Er ist doppelt so breit wie der Abstand $y_1 = \\lambda L/b$ eines von ihnen von der Mitte.') },
    fields: (p) => (p.hair ? [num$('b', 'b', 'μm', L('thickness of the hair', 'Dicke des Haars'))] : [num$('w', 'w', 'mm', L('width of the central bright fringe', 'Breite des mittleren hellen Streifens'))]),
    text: (p) => (p.hair
      ? L(`A hair is held in a laser beam with a wavelength of ${q(p.lam, 'nm')}. It gives the same pattern as a slit of its width. On a screen ${q(p.L, 'm')} away, the central bright fringe is ${q((2 * p.lam * p.L) / p.b, 'mm')} wide (from one dark fringe to the other). How thick is the hair?`,
        `Ein Haar wird in einen Laserstrahl mit der Wellenlänge ${q(p.lam, 'nm')} gehalten. Es gibt dasselbe Muster wie ein Spalt seiner Breite. Auf einem Schirm in ${q(p.L, 'm')} Entfernung ist der mittlere helle Streifen ${q((2 * p.lam * p.L) / p.b, 'mm')} breit (von einem dunklen Streifen zum andern). Wie dick ist das Haar?`)
      : L(`Laser light with a wavelength of ${q(p.lam, 'nm')} falls on a single slit ${q(p.b, 'mm')} wide. How wide is the central bright fringe on a screen ${q(p.L, 'm')} away (from one dark fringe to the other)?`,
        `Laserlicht mit der Wellenlänge ${q(p.lam, 'nm')} fällt auf einen Einzelspalt von ${q(p.b, 'mm')} Breite. Wie breit ist der mittlere helle Streifen auf einem Schirm in ${q(p.L, 'm')} Entfernung (von einem dunklen Streifen zum andern)?`)),
    hints: (p) => {
      const w = (2 * p.lam * p.L) / p.b;
      return [
        p.hair ? L(`The central fringe is ${q(w, 'mm')} wide, from the first dark fringe on one side to the first on the other, on a screen ${q(p.L, 'm')} away; the light has ${q(p.lam, 'nm')}. How far is one first dark fringe from the centre?`, `Der mittlere Streifen ist ${q(w, 'mm')} breit, vom ersten dunklen Streifen auf der einen Seite bis zum ersten auf der anderen, auf einem Schirm in ${q(p.L, 'm')} Entfernung; das Licht hat ${q(p.lam, 'nm')}. Wie weit ist ein erster dunkler Streifen von der Mitte entfernt?`)
          : L(`The slit is ${q(p.b, 'mm')} wide, the light has ${q(p.lam, 'nm')}, the screen is ${q(p.L, 'm')} away. The central fringe reaches from the first dark fringe on one side to the first on the other: where are those two?`, `Der Spalt ist ${q(p.b, 'mm')} breit, das Licht hat ${q(p.lam, 'nm')}, der Schirm ist ${q(p.L, 'm')} entfernt. Der mittlere Streifen reicht vom ersten dunklen Streifen auf der einen Seite bis zum ersten auf der anderen: Wo liegen diese beiden?`),
        L(`The first dark fringes of a single slit are where $b\\cdot\\sin\\alpha = \\lambda$. Small angles: $y_1 = \\lambda L/b$ on each side, so $w = 2\\lambda L/b$${p.hair ? ': solve it for $b$, the thickness of the hair' : ''}.`, `Die ersten dunklen Streifen eines Einzelspalts liegen dort, wo $b\\cdot\\sin\\alpha = \\lambda$. Kleine Winkel: $y_1 = \\lambda L/b$ auf jeder Seite, also $w = 2\\lambda L/b$${p.hair ? ': Löse nach $b$ auf, der Dicke des Haars' : ''}.`),
        p.hair ? L('Without a calculator: first $w/(2L)$, with $w$ in mm and $L$ in m (a small pure number, in thousandths); then divide the wavelength by it.', 'Ohne Rechner: zuerst $w/(2L)$, mit $w$ in mm und $L$ in m (eine kleine reine Zahl, in Tausendsteln); dann teile die Wellenlänge dadurch.')
          : L(`Without a calculator, the ratio first: $\\lambda/b$ is a small pure number, here $${tnum(p.lam / p.b)}$. Then multiply by $2L$.`, `Ohne Rechner zuerst das Verhältnis: $\\lambda/b$ ist eine kleine reine Zahl, hier $${tnum(p.lam / p.b)}$. Multipliziere dann mit $2L$.`),
      ];
    },
    steps: (p, v) => [
      step(L('The first dark fringes', 'Die ersten dunklen Streifen'), p$(L('A single slit is dark where $b\\cdot\\sin\\alpha = \\lambda$: each wavelet from the upper half of the slit meets one from the lower half half a wavelength behind. For small angles they lie at $y_1 = \\lambda L/b$ on both sides, and the central bright fringe is $w = 2\\lambda L/b$ wide.', 'Ein Einzelspalt ist dunkel, wo $b\\cdot\\sin\\alpha = \\lambda$: Jede Elementarwelle aus der oberen Hälfte des Spalts trifft eine aus der unteren, die eine halbe Wellenlänge zurückliegt. Für kleine Winkel liegen sie bei $y_1 = \\lambda L/b$ auf beiden Seiten, und der mittlere helle Streifen ist $w = 2\\lambda L/b$ breit.')), ['pat']),
      p.hair ? step(L('The thickness', 'Die Dicke'), `$$b = \\frac{2\\lambda L}{w} = \\frac{2\\cdot ${tq(p.lam, 'm')}\\cdot ${tq(p.L, 'm')}}{${tq(v.w, 'm')}} = ${res(tq(p.b, 'μm'))}$$` +
        p$(`${NOCALC()} $\\frac{w}{2L} = \\frac{${tq(v.w, 'mm')}}{${tq(2 * p.L, 'm')}} = ${tnum(v.w / (2 * p.L))}$, ${L('so', 'also')} $b = \\frac{${tq(p.lam, 'nm')}}{${tnum(v.w / (2 * p.L))}} = ${tq(p.b, 'μm')}$.`), ['pat'])
        : step(L('The width', 'Die Breite'), `$$w = \\frac{2\\lambda L}{b} = \\frac{2\\cdot ${tq(p.lam, 'm')}\\cdot ${tq(p.L, 'm')}}{${tq(p.b, 'm')}} = ${res(tq(v.w, 'mm'))}$$` +
        p$(`${NOCALC()} $${ratio(p.lam, p.b, '\\lambda', 'b')}$, ${L('so', 'also')} $w = 2\\cdot ${tq(p.L, 'm')}\\cdot ${tnum(p.lam / p.b)} = ${tq(v.w, 'mm')}$.`), ['pat']),
    ],
    figure: (p, v, view) => { const y1 = (p.lam * p.L) / p.b; return view.task ? '' : Fg().pattern([{ lam: p.lam, L: p.L, b: p.b, N: 1 }], { Y: 3.4 * y1, dims: [[-y1, y1, it$('w')]], ticks: [[y1, ''], [-y1, '']] }); },
  };

  // ================================================================ 6 resolving power by ratios
  // θₘᵢₙ = 1.22·λ/D: from a known instrument to another by the ratios of D and λ
  const RES = [
    // the eye and a telescope: the same light, a larger opening
    { k: 'eye', D1: 5e-3, th1: 130e-6, D2: [5e-2, 0.5, 1.3e-1, 2.6] },
    // one telescope in two colours
    { k: 'colour', D: 0.5, l1: 700e-9, th1: 1.7e-6, l2: [350e-9, 1.4e-6, 2.1e-6] },
    // a radio telescope for the same detail as an optical one
    { k: 'radio', D1: [0.5, 1, 2], l1: 500e-9, l2: [0.21, 0.06, 0.03] },
  ];
  const resScale = {
    id: 'res-scale', difficulty: 3,
    title: (p) => (p.k === 'radio' ? L('A radio telescope', 'Ein Radioteleskop') : L('Finer detail', 'Feinere Einzelheiten')),
    make: (r) => {
      const c = pick(r, RES);
      if (c.k === 'eye') return { k: 'eye', D2: pick(r, c.D2) };
      if (c.k === 'colour') return { k: 'colour', l2: pick(r, c.l2) };
      return { k: 'radio', D1: pick(r, c.D1), l2: pick(r, c.l2) };
    },
    solve: (p, o = {}) => {
      const inv = (x) => (o.rinv ? 1 / x : x);
      if (p.k === 'eye') return { th: RES[0].th1 * inv(RES[0].D1 / p.D2) };
      if (p.k === 'colour') return { th: RES[1].th1 * inv(p.l2 / RES[1].l1) };
      return { D: p.D1 * inv(p.l2 / RES[2].l1) };
    },
    traps: ['rinv'],
    nudge: { rinv: () => L('Check the direction: does the quantity that changes stand in the numerator or in the denominator of $\\theta_{\\min} = 1.22\\,\\lambda/D$?', 'Prüfe die Richtung: Steht die Grösse, die sich ändert, im Zähler oder im Nenner von $\\theta_{\\min} = 1.22\\,\\lambda/D$?') },
    why: { rinv: () => L('Turned round: $\\theta_{\\min} = 1.22\\,\\lambda/D$ grows with the wavelength and shrinks with the diameter.', 'Umgekehrt: $\\theta_{\\min} = 1.22\\,\\lambda/D$ wächst mit der Wellenlänge und wird mit dem Durchmesser kleiner.') },
    fields: (p, v) => (p.k === 'radio' ? [num$('D', 'D', v.D >= 1e3 ? 'km' : 'm', L('diameter of the dish', 'Durchmesser der Schüssel'))] : [num$('th', '\\theta_{\\min}', 'μrad', L('smallest angle resolved', 'kleinster getrennter Winkel'))]),
    text: (p) => {
      if (p.k === 'eye') return L(`Diffraction at the pupil (diameter ${q(RES[0].D1, 'mm')}) limits the eye to angles of about ${q(RES[0].th1, 'μrad')}. What smallest angle could a telescope with an opening of ${q(p.D2, p.D2 < 1 ? 'cm' : 'm')} resolve in the same light, if only diffraction limited it?`,
        `Die Beugung an der Pupille (Durchmesser ${q(RES[0].D1, 'mm')}) begrenzt das Auge auf Winkel von etwa ${q(RES[0].th1, 'μrad')}. Welchen kleinsten Winkel könnte ein Teleskop mit einer Öffnung von ${q(p.D2, p.D2 < 1 ? 'cm' : 'm')} im selben Licht trennen, wenn nur die Beugung es begrenzte?`);
      if (p.k === 'colour') return L(`A telescope with a mirror of ${q(RES[1].D, 'm')} resolves angles down to ${q(RES[1].th1, 'μrad')} in red light of ${q(RES[1].l1, 'nm')}. What is its smallest resolvable angle at a wavelength of ${q(p.l2, p.l2 >= 1e-6 ? 'μm' : 'nm')}${p.l2 < 400e-9 ? ' (ultraviolet)' : ' (infrared)'}?`,
        `Ein Teleskop mit einem Spiegel von ${q(RES[1].D, 'm')} trennt im roten Licht von ${q(RES[1].l1, 'nm')} Winkel bis hinunter zu ${q(RES[1].th1, 'μrad')}. Wie gross ist sein kleinster trennbarer Winkel bei einer Wellenlänge von ${q(p.l2, p.l2 >= 1e-6 ? 'μm' : 'nm')}${p.l2 < 400e-9 ? ' (Ultraviolett)' : ' (Infrarot)'}?`);
      return L(`An optical telescope with a mirror of ${q(p.D1, 'm')} observes at ${q(RES[2].l1, 'nm')}. How large would the dish of a radio telescope have to be to resolve the same angles at a wavelength of ${q(p.l2, 'cm')}?`,
        `Ein optisches Teleskop mit einem Spiegel von ${q(p.D1, 'm')} beobachtet bei ${q(RES[2].l1, 'nm')}. Wie gross müsste die Schüssel eines Radioteleskops sein, um bei einer Wellenlänge von ${q(p.l2, 'cm')} dieselben Winkel zu trennen?`);
    },
    hints: (p) => {
      const ask = p.k === 'eye' ? L(`The light stays the same; the opening grows from the pupil, ${q(RES[0].D1, 'mm')}, to ${q(p.D2, p.D2 < 1 ? 'cm' : 'm')}. By what factor does $D$ grow?`, `Das Licht bleibt dasselbe; die Öffnung wächst von der Pupille, ${q(RES[0].D1, 'mm')}, auf ${q(p.D2, p.D2 < 1 ? 'cm' : 'm')}. Um welchen Faktor wächst $D$?`)
        : p.k === 'colour' ? L(`The mirror stays the same; the wavelength changes from ${q(RES[1].l1, 'nm')} to ${q(p.l2, p.l2 >= 1e-6 ? 'μm' : 'nm')}. By what factor does $\\lambda$ change?`, `Der Spiegel bleibt derselbe; die Wellenlänge ändert sich von ${q(RES[1].l1, 'nm')} auf ${q(p.l2, p.l2 >= 1e-6 ? 'μm' : 'nm')}. Um welchen Faktor ändert sich $\\lambda$?`)
          : L(`The angles stay the same; the wavelength goes from ${q(RES[2].l1, 'nm')} to ${q(p.l2, 'cm')}. How many times longer is the radio wave (both in metres)?`, `Die Winkel bleiben dieselben; die Wellenlänge geht von ${q(RES[2].l1, 'nm')} auf ${q(p.l2, 'cm')}. Wie viele Male länger ist die Radiowelle (beide in Metern)?`);
      return [ask, p.k === 'radio' ? L('The Rayleigh criterion, $\\theta_{\\min} = 1.22\\,\\lambda/D$: the same angle needs the same ratio $\\lambda/D$, so the dish must be that many times larger than the mirror.', 'Das Rayleigh-Kriterium, $\\theta_{\\min} = 1.22\\,\\lambda/D$: Derselbe Winkel braucht dasselbe Verhältnis $\\lambda/D$, also muss die Schüssel so viele Male grösser sein als der Spiegel.')
        : L(`The Rayleigh criterion, $\\theta_{\\min} = 1.22\\,\\lambda/D$; you need no 1.22: $\\theta_{\\min}$ ${p.k === 'eye' ? 'goes with $1/D$' : 'goes with $\\lambda$'}. Apply the factor to ${q(RES[p.k === 'eye' ? 0 : 1].th1, 'μrad')} in the right direction.`, `Das Rayleigh-Kriterium, $\\theta_{\\min} = 1.22\\,\\lambda/D$; die 1.22 brauchst du nicht: $\\theta_{\\min}$ ${p.k === 'eye' ? 'geht mit $1/D$' : 'geht mit $\\lambda$'}. Wende den Faktor in der richtigen Richtung auf ${q(RES[p.k === 'eye' ? 0 : 1].th1, 'μrad')} an.`)];
    },
    steps: (p, v) => {
      if (p.k === 'eye') { const f = p.D2 / RES[0].D1; return [step(L('By the ratio', 'Über das Verhältnis'), p$(L(`The same wavelength, an opening ${tnum(f)} times as large: $\\theta_{\\min} = 1.22\\,\\lambda/D$ is ${tnum(f)} times smaller.`, `Dieselbe Wellenlänge, eine ${tnum(f)}-mal so grosse Öffnung: $\\theta_{\\min} = 1.22\\,\\lambda/D$ ist ${tnum(f)}-mal kleiner.`)) + `$$\\theta_{\\min} = ${tq(RES[0].th1, 'μrad')}\\cdot\\frac{${tq(RES[0].D1, 'm')}}{${tq(p.D2, 'm')}} = ${res(tq(v.th, 'μrad'))}$$`)]; }
      if (p.k === 'colour') { return [step(L('By the ratio', 'Über das Verhältnis'), p$(L(`The same mirror; $\\theta_{\\min} = 1.22\\,\\lambda/D$ changes in proportion to $\\lambda$: ${p.l2 < RES[1].l1 ? 'shorter waves resolve finer detail' : 'longer waves blur more'}.`, `Derselbe Spiegel; $\\theta_{\\min} = 1.22\\,\\lambda/D$ ändert sich proportional zu $\\lambda$: ${p.l2 < RES[1].l1 ? 'Kürzere Wellen trennen feinere Einzelheiten' : 'längere Wellen verwischen stärker'}.`)) + `$$\\theta_{\\min} = ${tq(RES[1].th1, 'μrad')}\\cdot\\frac{${tq(p.l2, 'nm')}}{${tq(RES[1].l1, 'nm')}} = ${res(tq(v.th, 'μrad'))}$$`)]; }
      return [step(L('The same ratio λ/D', 'Dasselbe Verhältnis λ/D'), p$(L('The same smallest angle needs the same ratio $\\lambda/D$: the dish must be as many times larger as the wave is longer.', 'Derselbe kleinste Winkel braucht dasselbe Verhältnis $\\lambda/D$: Die Schüssel muss so viel mal grösser sein, wie die Welle länger ist.')) +
        `$$D = ${tq(p.D1, 'm')}\\cdot\\frac{${tq(p.l2, 'm')}}{${tq(RES[2].l1, 'm')}} = ${res(tq(v.D, v.D >= 1e3 ? 'km' : 'm'))}$$` + p$(L('No single dish is that large; radio astronomers link telescopes far apart instead.', 'Keine einzelne Schüssel ist so gross; Radioastronomen verbinden stattdessen weit voneinander entfernte Teleskope.')))];
    },
    figure: () => '',
  };

  // the smallest angle θₘᵢₙ given: how far away two lamps are still seen as two (x = s/θ), or how
  // far apart two craters on the Moon must be to be seen as two (s = θ·x); small angles: s = θ·x
  const MOON = 3.8e8;
  const resFar = {
    id: 'res-far', difficulty: 2,
    title: (p) => (p.k === 'dist' ? L('How far away?', 'Wie weit weg?') : L('How small?', 'Wie klein?')),
    make: (r) => (r() < 0.6 ? { k: 'dist', th: pick(r, [100e-6, 200e-6]), s: pick(r, [1, 1.2, 1.5, 2]) } : { k: 'size', th: pick(r, [0.5e-6, 1e-6, 2e-6, 5e-6]) }),
    solve: (p, o = {}) => (p.k === 'dist' ? { x: o.rinv ? p.s * p.th : p.s / p.th } : { s: o.rinv ? MOON / p.th : p.th * MOON }),
    traps: ['rinv'],
    nudge: { rinv: () => L('For a small angle (in rad), how are separation, angle and distance related? Is your result plausible?', 'Wie hängen bei einem kleinen Winkel (in rad) Abstand, Winkel und Entfernung zusammen? Ist dein Resultat plausibel?') },
    why: { rinv: () => L('For a small angle, the separation is the angle (in rad) times the distance: $s = \\theta\\cdot x$, so $x = s/\\theta$.', 'Für einen kleinen Winkel ist der Abstand der Winkel (in rad) mal die Entfernung: $s = \\theta\\cdot x$, also $x = s/\\theta$.') },
    fields: (p) => (p.k === 'dist' ? [num$('x', 'x', 'km', L('greatest distance', 'grösste Entfernung'))] : [num$('s', 's', 'm', L('smallest separation of the craters', 'kleinster Abstand der Krater'))]),
    text: (p) => (p.k === 'dist'
      ? L(`By diffraction at the pupil, your eye resolves angles down to about ${q(p.th, 'μrad')}. The headlights of a car are ${q(p.s, 'm')} apart. From how far away can you still see them as two?`,
        `Wegen der Beugung an der Pupille trennt dein Auge Winkel bis hinunter zu etwa ${q(p.th, 'μrad')}. Die Scheinwerfer eines Autos sind ${q(p.s, 'm')} voneinander entfernt. Aus welcher Entfernung siehst du sie noch als zwei?`)
      : L(`A telescope resolves angles down to ${q(p.th, 'μrad')}. The Moon is 380\u2009000\u00a0km away. How far apart must two craters be, at least, to be seen as two?`,
        `Ein Teleskop trennt Winkel bis hinunter zu ${q(p.th, 'μrad')}. Der Mond ist 380\u2009000\u00a0km entfernt. Wie weit müssen zwei Krater mindestens voneinander entfernt sein, damit man sie als zwei sieht?`)),
    hints: (p) => [
      p.k === 'dist' ? L(`The headlights are ${q(p.s, 'm')} apart, your eye resolves ${q(p.th, 'μrad')}. As the car moves away, does the angle between the headlights grow or shrink? At the greatest distance it is just $\\theta_{\\min}$.`, `Die Scheinwerfer sind ${q(p.s, 'm')} voneinander entfernt, dein Auge trennt ${q(p.th, 'μrad')}. Wird der Winkel zwischen den Scheinwerfern grösser oder kleiner, wenn das Auto wegfährt? In der grössten Entfernung ist er gerade $\\theta_{\\min}$.`)
        : L(`The telescope resolves ${q(p.th, 'μrad')}, the Moon is 380\u2009000\u00a0km away. The closest pair of craters still seen as two is at the angle $\\theta_{\\min}$ exactly.`, `Das Teleskop trennt ${q(p.th, 'μrad')}, der Mond ist 380\u2009000\u00a0km entfernt. Das nächste Kraterpaar, das man noch als zwei sieht, erscheint genau unter dem Winkel $\\theta_{\\min}$.`),
      p.k === 'dist' ? L('For a small angle in rad: separation = angle × distance, $s = \\theta\\cdot x$. Solve it for the distance $x$.', 'Für einen kleinen Winkel in rad: Abstand = Winkel × Entfernung, $s = \\theta\\cdot x$. Löse nach der Entfernung $x$ auf.')
        : L('For a small angle in rad: separation = angle × distance, $s = \\theta\\cdot x$.', 'Für einen kleinen Winkel in rad: Abstand = Winkel × Entfernung, $s = \\theta\\cdot x$.'),
      p.k === 'dist' ? L(`In SI units: ${q(p.th, 'μrad')} = $${tnum(p.th)}$ rad. The distance then comes out in metres; the answer is asked in km.`, `In SI-Einheiten: ${q(p.th, 'μrad')} = $${tnum(p.th)}$ rad. Die Entfernung ergibt sich dann in Metern; gefragt ist sie in km.`)
        : L(`In SI units: ${q(p.th, 'μrad')} = $${tnum(p.th)}$ rad and 380\u2009000 km = $${tnum(MOON)}$ m.`, `In SI-Einheiten: ${q(p.th, 'μrad')} = $${tnum(p.th)}$ rad und 380\u2009000 km = $${tnum(MOON)}$ m.`),
    ],
    steps: (p, v) => [
      step(L('Angle, separation and distance', 'Winkel, Abstand und Entfernung'), p$(L('Seen from far away, two points a distance $s$ apart are at the small angle $\\theta = s/x$ (in rad). They are seen as two while $\\theta \\ge \\theta_{\\min}$.', 'Aus grosser Entfernung erscheinen zwei Punkte im Abstand $s$ unter dem kleinen Winkel $\\theta = s/x$ (in rad). Man sieht sie als zwei, solange $\\theta \\ge \\theta_{\\min}$.'))),
      p.k === 'dist'
        ? step(L('The distance', 'Die Entfernung'), `$$x = \\frac{s}{\\theta_{\\min}} = \\frac{${tq(p.s, 'm')}}{${tnum(p.th)}} = ${res(tq(v.x, 'km'))}$$` + p$(L('Further away, the two headlights merge into one.', 'Weiter weg verschmelzen die beiden Scheinwerfer zu einem.')))
        : step(L('The separation', 'Der Abstand'), `$$s = \\theta_{\\min}\\cdot x = ${tnum(p.th)}\\cdot ${tnum(MOON)}\\,\\mathrm{m} = ${res(tq(v.s, 'm'))}$$` + p$(L('Smaller craters closer together blur into one.', 'Kleinere, näher beieinander liegende Krater verschwimmen zu einem.'))),
    ],
    figure: () => '',
  };

  // ================================================================ 7 concepts
  // [group, question, right, [wrong, why, flag, nudge] × 3], each text as [en, de] (nudge, where why
  // would give the answer away, is shown instead after a wrong answer in practice); the groups: huy (Huygens
  // and diffraction), ds (double slit and grating), pat (how the pattern changes), res (resolving)
  const CONCEPTS = [
    ['huy', ['What does Huygens’ principle say?', 'Was besagt das Prinzip von Huygens?'],
      ['Every point of a wave front is the source of a wavelet; the front a moment later is the envelope of all the wavelets.', 'Jeder Punkt einer Wellenfront ist Quelle einer Elementarwelle; die Front einen Augenblick später ist die Einhüllende aller Elementarwellen.'],
      [[['Every point of a wave front sends wavelets, but only straight ahead, so nothing reaches the shadow.', 'Jeder Punkt einer Wellenfront sendet Elementarwellen, aber nur geradeaus, also gelangt nichts in den Schatten.'], ['The wavelets spread in all directions forward: at an edge, they reach into the shadow. That is diffraction.', 'Die Elementarwellen breiten sich nach vorn in alle Richtungen aus: An einer Kante reichen sie in den Schatten. Das ist Beugung.'], 'ray', ['Do wavelets really go only straight ahead? What do you see at an edge?', 'Breiten sich Elementarwellen wirklich nur geradeaus aus? Was beobachtet man an einer Kante?']],
        [['Only the edges of an obstacle send out wavelets; the rest of the wave travels in straight rays.', 'Nur die Kanten eines Hindernisses senden Elementarwellen aus; der Rest der Welle läuft in geraden Strahlen.'], ['Every point of the front is a source, not only those at edges; in free space their wavelets add up to the straight front.', 'Jeder Punkt der Front ist eine Quelle, nicht nur die an Kanten; im freien Raum setzen sich ihre Elementarwellen zur geraden Front zusammen.'], 'ray', ['Do only the edges really send out wavelets? What about the other points of the front?', 'Senden wirklich nur die Kanten Elementarwellen aus? Was ist mit den übrigen Punkten der Front?']],
        [['The wavelets are slower than the wave, so behind an obstacle the wavelength gets shorter.', 'Die Elementarwellen sind langsamer als die Welle, also wird die Wellenlänge hinter einem Hindernis kürzer.'], ['The wavelets travel at the speed of the wave: the wavelength stays the same.', 'Die Elementarwellen laufen mit der Geschwindigkeit der Welle: Die Wellenlänge bleibt gleich.'], 'lambda']]],
    ['huy', ['Why can you hear someone talking round a corner, but not see them?', 'Warum hört man jemanden um eine Ecke herum sprechen, sieht ihn aber nicht?'],
      ['Sound waves are about as long as a door is wide and are diffracted strongly; light waves are a million times shorter.', 'Schallwellen sind etwa so lang, wie eine Tür breit ist, und werden stark gebeugt; Lichtwellen sind eine Million Mal kürzer.'],
      [[['Light is not a wave, so it cannot bend round corners.', 'Licht ist keine Welle, also kann es nicht um Ecken biegen.'], ['Light is diffracted too: behind a narrow slit it spreads. Its waves are just far shorter than a door.', 'Licht wird auch gebeugt: Hinter einem schmalen Spalt breitet es sich aus. Seine Wellen sind nur viel kürzer als eine Tür.'], 'ray', ['Is light really never diffracted? Think of the light behind a very narrow slit.', 'Wird Licht wirklich nie gebeugt? Denk an das Licht hinter einem sehr schmalen Spalt.']],
        [['Sound travels more slowly, so it has more time to bend round the corner.', 'Schall ist langsamer, also hat er mehr Zeit, um die Ecke zu biegen.'], ['How much a wave spreads depends on the opening compared with its wavelength, not on its speed.', 'Wie stark sich eine Welle ausbreitet, hängt von der Öffnung im Vergleich mit ihrer Wellenlänge ab, nicht von ihrer Geschwindigkeit.'], 'size', ['Does diffraction depend on the speed of the wave, or on something else?', 'Hängt die Beugung von der Geschwindigkeit der Welle ab, oder von etwas anderem?']],
        [['Light is diffracted more than sound, but too weakly to see.', 'Licht wird stärker gebeugt als Schall, aber zu schwach, um es zu sehen.'], ['The other way round: the shorter the wave compared with the opening, the less it is diffracted.', 'Umgekehrt: Je kürzer die Welle im Vergleich mit der Öffnung, desto weniger wird sie gebeugt.'], 'size', ['Check the direction: is a shorter wave diffracted more or less at the same opening?', 'Prüfe die Richtung: Wird eine kürzere Welle an derselben Öffnung stärker oder schwächer gebeugt?']]]],
    ['huy', ['Water waves pass through a gap. The gap is made narrower. What happens behind it?', 'Wasserwellen laufen durch eine Öffnung. Die Öffnung wird schmaler gemacht. Was geschieht dahinter?'],
      ['The waves spread more into the shadow.', 'Die Wellen breiten sich stärker in den Schatten aus.'],
      [[['The waves spread less: a narrower gap lets through a narrower beam.', 'Die Wellen breiten sich weniger aus: Eine schmalere Öffnung lässt ein schmaleres Bündel durch.'], ['The narrower the gap compared with λ, the more it acts like a single point source of circular waves.', 'Je schmaler die Öffnung im Vergleich mit λ, desto mehr wirkt sie wie eine einzige punktförmige Quelle von Kreiswellen.'], 'size', ['Is that so for waves? Think with Huygens: what does a very narrow opening send out?', 'Ist das bei Wellen wirklich so? Überlege mit Huygens, was eine sehr schmale Öffnung aussendet.']],
        [['Nothing: how much the waves spread depends only on their wavelength.', 'Nichts: Wie stark sich die Wellen ausbreiten, hängt nur von ihrer Wellenlänge ab.'], ['It depends on the ratio of the gap to the wavelength.', 'Es hängt vom Verhältnis der Öffnung zur Wellenlänge ab.'], 'size'],
        [['The wavelength behind the gap gets shorter.', 'Die Wellenlänge hinter der Öffnung wird kürzer.'], ['Same medium, same speed, same frequency: the same wavelength.', 'Dasselbe Medium, dieselbe Geschwindigkeit, dieselbe Frequenz: dieselbe Wellenlänge.'], 'lambda']]],
    ['ds', ['Where are the bright fringes behind a double slit?', 'Wo sind die hellen Streifen hinter einem Doppelspalt?'],
      ['Where the path difference from the two slits is a whole number of wavelengths.', 'Wo der Gangunterschied der beiden Spalte eine ganze Zahl von Wellenlängen ist.'],
      [[['Where the path difference is an odd number of half wavelengths.', 'Wo der Gangunterschied eine ungerade Zahl halber Wellenlängen ist.'], ['There crest meets trough: those are the dark fringes.', 'Dort trifft Berg auf Tal: Das sind die dunklen Streifen.'], 'half', ['With a path difference of half a wavelength, what meets there: crest and crest, or crest and trough?', 'Was trifft bei einem Gangunterschied von einer halben Wellenlänge aufeinander: Berg auf Berg oder Berg auf Tal?']],
        [['Only straight behind each slit, where the light goes straight through.', 'Nur gerade hinter jedem Spalt, wo das Licht gerade durchgeht.'], ['Each narrow slit spreads the light out; the bright fringes are where the two waves arrive in step.', 'Jeder schmale Spalt verbreitet das Licht; die hellen Streifen liegen dort, wo die beiden Wellen im Gleichtakt ankommen.'], 'ray', ['Each narrow slit spreads the light. Where do the waves from the two slits reinforce each other?', 'Jeder schmale Spalt verbreitet das Licht. Wo verstärken sich die Wellen der beiden Spalte?']],
        [['Only in the middle, where the path difference is zero.', 'Nur in der Mitte, wo der Gangunterschied null ist.'], ['A path difference of one, two, … wavelengths brings the waves in step again: the maxima of order 1, 2, …', 'Ein Gangunterschied von einer, zwei, … Wellenlängen bringt die Wellen wieder in Gleichtakt: die Maxima der Ordnung 1, 2, …'], 'order', ['What happens with a path difference of exactly one wavelength? Do the waves arrive in step or not?', 'Was geschieht bei einem Gangunterschied von genau einer Wellenlänge? Kommen die Wellen dann im Gleichtakt an oder nicht?']]]],
    ['ds', ['A double slit is replaced by a grating with the same slit spacing. What changes on the screen?', 'Ein Doppelspalt wird durch ein Gitter mit demselben Spaltabstand ersetzt. Was ändert sich auf dem Schirm?'],
      ['The maxima stay in the same places but become much sharper and brighter.', 'Die Maxima bleiben an denselben Orten, werden aber viel schärfer und heller.'],
      [[['The maxima move closer together: more slits, more fringes.', 'Die Maxima rücken näher zusammen: mehr Spalte, mehr Streifen.'], ['Their positions follow from d·sin α = k·λ, the same for any number of slits.', 'Ihre Lage folgt aus d·sin α = k·λ, gleich für jede Anzahl Spalte.'], 'grating', ['Does the number of slits appear in the condition for the maxima? Write it down.', 'Kommt die Anzahl Spalte in der Bedingung für die Maxima vor? Schreib sie auf.']],
        [['The maxima move further apart.', 'Die Maxima rücken weiter auseinander.'], ['Their positions follow from d·sin α = k·λ, the same for any number of slits.', 'Ihre Lage folgt aus d·sin α = k·λ, gleich für jede Anzahl Spalte.'], 'grating', ['Does the number of slits appear in the condition for the maxima? Write it down.', 'Kommt die Anzahl Spalte in der Bedingung für die Maxima vor? Schreib sie auf.']],
        [['Nothing at all.', 'Gar nichts.'], ['Between the maxima, the light of many slits cancels almost everywhere: the maxima become narrow and bright.', 'Zwischen den Maxima löscht sich das Licht vieler Spalte fast überall aus: Die Maxima werden schmal und hell.'], 'grating', ['What happens between the maxima when the light of many slits interferes instead of two?', 'Was geschieht zwischen den Maxima, wenn das Licht vieler Spalte statt zweier interferiert?']]]],
    ['ds', ['White light falls on a grating. Which colour of the first-order spectrum is furthest from the centre?', 'Weisses Licht fällt auf ein Gitter. Welche Farbe des Spektrums erster Ordnung liegt am weitesten von der Mitte entfernt?'],
      ['Red: it has the longest wavelength, and sin α = λ/d.', 'Rot: Es hat die grösste Wellenlänge, und sin α = λ/d.'],
      [[['Violet, as in a prism.', 'Violett, wie bei einem Prisma.'], ['A prism bends violet most; a grating sends the longest waves furthest, sin α = λ/d.', 'Ein Prisma lenkt Violett am stärksten ab; ein Gitter lenkt die längsten Wellen am weitesten ab, sin α = λ/d.'], 'colour', ['A grating is not a prism. How does the angle of a grating, sin α = λ/d, depend on the wavelength?', 'Ein Gitter ist kein Prisma. Wie hängt der Winkel bei einem Gitter, sin α = λ/d, von der Wellenlänge ab?']],
        [['All colours land in the same place, as d is the same.', 'Alle Farben landen am selben Ort, da d gleich ist.'], ['sin α = λ/d depends on the wavelength: the grating spreads white light into a spectrum.', 'sin α = λ/d hängt von der Wellenlänge ab: Das Gitter zerlegt weisses Licht in ein Spektrum.'], 'colour'],
        [['Green, the middle of the spectrum.', 'Grün, die Mitte des Spektrums.'], ['The angle grows with the wavelength: the end with the longest waves is furthest out.', 'Der Winkel wächst mit der Wellenlänge: Das Ende mit den längsten Wellen liegt am weitesten aussen.'], 'colour', ['Does the angle grow or fall with the wavelength? Which colour of the spectrum then has the largest angle?', 'Wächst oder sinkt der Winkel mit der Wellenlänge? Welche Farbe des Spektrums hat dann den grössten Winkel?']]]],
    ['ds', ['White light falls on a grating. What colour is the central maximum (order 0)?', 'Weisses Licht fällt auf ein Gitter. Welche Farbe hat das mittlere Maximum (Ordnung 0)?'],
      ['White: there the path difference is zero for every wavelength.', 'Weiss: Dort ist der Gangunterschied für jede Wellenlänge null.'],
      [[['Red, the longest waves.', 'Rot, die längsten Wellen.'], ['At the centre Δs = 0: all colours are bright there, together white.', 'In der Mitte ist Δs = 0: Alle Farben sind dort hell, zusammen weiss.'], 'colour', ['What is the path difference in the middle, and for which wavelengths is that so?', 'Wie gross ist der Gangunterschied in der Mitte, und für welche Wellenlängen gilt das?']],
        [['Violet, the shortest waves.', 'Violett, die kürzesten Wellen.'], ['At the centre Δs = 0: all colours are bright there, together white.', 'In der Mitte ist Δs = 0: Alle Farben sind dort hell, zusammen weiss.'], 'colour', ['What is the path difference in the middle, and for which wavelengths is that so?', 'Wie gross ist der Gangunterschied in der Mitte, und für welche Wellenlängen gilt das?']],
        [['Dark: the waves from neighbouring slits cancel there.', 'Dunkel: Die Wellen benachbarter Spalte löschen sich dort aus.'], ['At the centre all paths are equally long: crest meets crest.', 'In der Mitte sind alle Wege gleich lang: Berg trifft Berg.'], 'half', ['What is the path difference in the middle? What meets there?', 'Wie gross ist der Gangunterschied in der Mitte? Was trifft dort aufeinander?']]]],
    ['pat', ['A single slit is made narrower. What happens to the central bright fringe on the screen?', 'Ein Einzelspalt wird schmaler gemacht. Was passiert mit dem mittleren hellen Streifen auf dem Schirm?'],
      ['It gets wider.', 'Er wird breiter.'],
      [[['It gets narrower, like the slit.', 'Er wird schmaler, wie der Spalt.'], ['A narrower slit diffracts more: w = 2λL/b grows as b shrinks.', 'Ein schmalerer Spalt beugt stärker: w = 2λL/b wächst, wenn b kleiner wird.'], 'inv', ['Does a narrower slit diffract more or less?', 'Beugt ein schmalerer Spalt stärker oder schwächer?']],
        [['It stays the same; only the brightness changes.', 'Er bleibt gleich; nur die Helligkeit ändert sich.'], ['w = 2λL/b depends on the slit width.', 'w = 2λL/b hängt von der Spaltbreite ab.'], 'same', ['Does the width of the fringe depend on the width of the slit? Write down the formula for w.', 'Hängt die Breite des Streifens von der Spaltbreite ab? Schreib die Formel für w auf.']],
        [['It splits into two fringes.', 'Er teilt sich in zwei Streifen.'], ['A single slit always has one central bright fringe; it just gets wider.', 'Ein Einzelspalt hat immer einen mittleren hellen Streifen; er wird nur breiter.'], null, ['Does a single slit not always have exactly one central bright fringe?', 'Hat ein Einzelspalt nicht immer genau einen mittleren hellen Streifen?']]]],
    ['pat', ['In a double-slit experiment, red laser light is replaced by blue. What happens to the bright fringes?', 'In einem Doppelspaltversuch wird rotes Laserlicht durch blaues ersetzt. Was passiert mit den hellen Streifen?'],
      ['They move closer together.', 'Sie rücken näher zusammen.'],
      [[['They move further apart.', 'Sie rücken weiter auseinander.'], ['Blue light has the shorter wavelength, and Δy = λL/d.', 'Blaues Licht hat die kleinere Wellenlänge, und Δy = λL/d.'], 'inv', ['Which light has the shorter wavelength, and how does the fringe spacing depend on it?', 'Welches Licht hat die kleinere Wellenlänge, und wie hängt der Streifenabstand von ihr ab?']],
        [['They stay where they are; only the colour changes.', 'Sie bleiben, wo sie sind; nur die Farbe ändert sich.'], ['Their spacing Δy = λL/d depends on the wavelength.', 'Ihr Abstand Δy = λL/d hängt von der Wellenlänge ab.'], 'same', ['Does the fringe spacing depend on the wavelength? Write down the formula.', 'Hängt der Streifenabstand von der Wellenlänge ab? Schreib die Formel auf.']],
        [['They disappear: blue light does not interfere.', 'Sie verschwinden: Blaues Licht interferiert nicht.'], ['Light of every colour interferes, if it is coherent.', 'Licht jeder Farbe interferiert, wenn es kohärent ist.'], null]]],
    ['pat', ['The slits of a double slit are made narrower; their spacing stays. What happens?', 'Die Spalte eines Doppelspalts werden schmaler gemacht; ihr Abstand bleibt. Was passiert?'],
      ['The fringes stay where they are; more of them are bright, as each slit spreads the light more.', 'Die Streifen bleiben, wo sie sind; mehr von ihnen sind hell, da jeder Spalt das Licht stärker verbreitet.'],
      [[['The fringes move further apart.', 'Die Streifen rücken weiter auseinander.'], ['Their spacing is set by the slit spacing d, Δy = λL/d; the slit width only sets the envelope.', 'Ihr Abstand ist durch den Spaltabstand d festgelegt, Δy = λL/d; die Spaltbreite bestimmt nur die Einhüllende.'], 'bd', ['Does the slit width appear in the formula for the fringe spacing? What does it decide instead?', 'Kommt die Spaltbreite in der Formel für den Streifenabstand vor? Was bestimmt sie stattdessen?']],
        [['The fringes move closer together.', 'Die Streifen rücken näher zusammen.'], ['Their spacing is set by the slit spacing d, Δy = λL/d; the slit width only sets the envelope.', 'Ihr Abstand ist durch den Spaltabstand d festgelegt, Δy = λL/d; die Spaltbreite bestimmt nur die Einhüllende.'], 'bd', ['Does the slit width appear in the formula for the fringe spacing? What does it decide instead?', 'Kommt die Spaltbreite in der Formel für den Streifenabstand vor? Was bestimmt sie stattdessen?']],
        [['The whole pattern gets narrower.', 'Das ganze Muster wird schmaler.'], ['Narrower slits diffract more: the envelope gets wider, not narrower.', 'Schmalere Spalte beugen stärker: Die Einhüllende wird breiter, nicht schmaler.'], 'inv', ['Do narrower slits diffract more or less? What does that mean for the envelope?', 'Beugen schmalere Spalte stärker oder schwächer? Was heisst das für die Einhüllende?']]]],
    ['pat', ['A double-slit experiment is repeated under water (n = 1.33). What happens to the fringes?', 'Ein Doppelspaltversuch wird unter Wasser wiederholt (n = 1.33). Was passiert mit den Streifen?'],
      ['They move closer together: in water the wavelength is λ₀/n.', 'Sie rücken näher zusammen: Im Wasser ist die Wellenlänge λ₀/n.'],
      [[['They move further apart: light is slower in water.', 'Sie rücken weiter auseinander: Licht ist im Wasser langsamer.'], ['Slower at the same frequency means a shorter wavelength, and Δy = λL/d shrinks.', 'Langsamer bei gleicher Frequenz heisst kürzere Wellenlänge, und Δy = λL/d wird kleiner.'], 'inv', ['Slower at the same frequency: what does that mean for the wavelength, and so for the fringe spacing?', 'Langsamer bei gleicher Frequenz: Was heisst das für die Wellenlänge, und damit für den Streifenabstand?']],
        [['Nothing: the frequency of the light stays the same.', 'Nichts: Die Frequenz des Lichts bleibt gleich.'], ['The pattern depends on the wavelength, and that is shorter in water.', 'Das Muster hängt von der Wellenlänge ab, und die ist im Wasser kürzer.'], 'same', ['The frequency stays, right. On what does the pattern depend, and does that stay the same in water?', 'Die Frequenz bleibt, stimmt. Wovon hängt das Muster ab, und bleibt diese Grösse im Wasser gleich?']],
        [['The fringes disappear: water absorbs the light.', 'Die Streifen verschwinden: Wasser absorbiert das Licht.'], ['Clear water lets light through; the waves still interfere.', 'Klares Wasser lässt Licht durch; die Wellen interferieren weiterhin.'], null]]],
    ['res', ['Why does a telescope with a larger mirror show finer detail (apart from collecting more light)?', 'Warum zeigt ein Teleskop mit grösserem Spiegel feinere Einzelheiten (abgesehen davon, dass es mehr Licht sammelt)?'],
      ['A larger opening diffracts less: θₘᵢₙ = 1.22·λ/D is smaller.', 'Eine grössere Öffnung beugt weniger: θₘᵢₙ = 1.22·λ/D ist kleiner.'],
      [[['It does not: a larger opening diffracts more, as it has a longer edge.', 'Tut es nicht: Eine grössere Öffnung beugt stärker, weil sie einen längeren Rand hat.'], ['The wider the opening compared with λ, the less the light spreads: θₘᵢₙ ∝ 1/D.', 'Je breiter die Öffnung im Vergleich mit λ, desto weniger verbreitet sich das Licht: θₘᵢₙ ∝ 1/D.'], 'rinv', ['Does a wider opening really diffract more? Think of waves at a wide and at a narrow opening.', 'Beugt eine breitere Öffnung wirklich stärker? Denk an Wellen an einer breiten und an einer schmalen Öffnung.']],
        [['Resolution depends only on the wavelength, not on the size of the mirror.', 'Die Auflösung hängt nur von der Wellenlänge ab, nicht von der Grösse des Spiegels.'], ['θₘᵢₙ = 1.22·λ/D depends on both.', 'θₘᵢₙ = 1.22·λ/D hängt von beidem ab.'], 'rsame', ['Write down the Rayleigh criterion: which quantities appear in it?', 'Schreib das Rayleigh-Kriterium auf: Welche Grössen kommen darin vor?']],
        [['A larger mirror magnifies more, and magnifying alone shows any detail.', 'Ein grösserer Spiegel vergrössert stärker, und Vergrössern allein zeigt jede Einzelheit.'], ['Magnifying a blurred image only gives a larger blurred image: diffraction sets the limit.', 'Ein verwaschenes Bild zu vergrössern gibt nur ein grösseres verwaschenes Bild: Die Beugung setzt die Grenze.'], 'rsame', ['What does a magnified blurred image show? Where does the blur come from?', 'Was zeigt ein vergrössertes verwaschenes Bild? Woher kommt die Unschärfe?']]]],
    ['res', ['Why can a microscope with ultraviolet light show finer detail than one with visible light?', 'Warum zeigt ein Mikroskop mit ultraviolettem Licht feinere Einzelheiten als eines mit sichtbarem Licht?'],
      ['UV has a shorter wavelength, and θₘᵢₙ ∝ λ.', 'UV hat eine kürzere Wellenlänge, und θₘᵢₙ ∝ λ.'],
      [[['Longer waves are diffracted less, so UV must be longer.', 'Längere Wellen werden weniger gebeugt, also muss UV länger sein.'], ['Shorter waves are diffracted less; UV is shorter than visible light.', 'Kürzere Wellen werden weniger gebeugt; UV ist kürzer als sichtbares Licht.'], 'rinv', ['Check both: are longer waves really diffracted less? And is UV longer or shorter than visible light?', 'Prüfe beides: Werden längere Wellen wirklich weniger gebeugt? Und ist UV länger oder kürzer als sichtbares Licht?']],
        [['UV light is brighter, and brighter light resolves better.', 'UV-Licht ist heller, und helleres Licht trennt besser.'], ['Brightness does not change the size of the diffraction blur, θₘᵢₙ = 1.22·λ/D.', 'Die Helligkeit ändert die Grösse des Beugungsscheibchens nicht, θₘᵢₙ = 1.22·λ/D.'], 'rsame', ['Does the brightness change the size of the diffraction disc? On what does it depend?', 'Ändert die Helligkeit die Grösse des Beugungsscheibchens? Wovon hängt sie ab?']],
        [['UV is not diffracted at all.', 'UV wird gar nicht gebeugt.'], ['Every wave is diffracted; shorter waves less.', 'Jede Welle wird gebeugt; kürzere Wellen weniger.'], 'rsame', ['Are there waves that are not diffracted at all? How does diffraction depend on the wavelength?', 'Gibt es Wellen, die gar nicht gebeugt werden? Wie hängt die Beugung von der Wellenlänge ab?']]]],
    ['res', ['When are two point sources just resolved (Rayleigh criterion)?', 'Wann sind zwei punktförmige Quellen gerade noch getrennt (Rayleigh-Kriterium)?'],
      ['When the centre of one image lies on the first dark ring of the other.', 'Wenn die Mitte des einen Bildes auf dem ersten dunklen Ring des anderen liegt.'],
      [[['Only when their images do not overlap at all.', 'Erst wenn sich ihre Bilder gar nicht überlappen.'], ['They are seen as two already when one centre lies on the first dark ring of the other: there is a dip between them.', 'Man sieht sie schon als zwei, wenn die eine Mitte auf dem ersten dunklen Ring der anderen liegt: Dazwischen gibt es eine Senke.'], 'rayleigh', ['Must the images really not overlap at all? Where does the first dark ring of one image lie?', 'Dürfen sich die Bilder wirklich gar nicht überlappen? Wo liegt der erste dunkle Ring des einen Bildes?']],
        [['Whenever they are two separate sources: a sharp enough lens shows them apart.', 'Immer, wenn es zwei getrennte Quellen sind: Eine genügend scharfe Linse zeigt sie getrennt.'], ['No lens beats diffraction at its own opening: every point becomes a small disc.', 'Keine Linse schlägt die Beugung an ihrer eigenen Öffnung: Jeder Punkt wird zu einem Scheibchen.'], 'rsame'],
        [['When their centres are one wavelength apart on the image.', 'Wenn ihre Mitten auf dem Bild eine Wellenlänge voneinander entfernt sind.'], ['The criterion is an angle, θₘᵢₙ = 1.22·λ/D: the first dark ring of one at the centre of the other.', 'Das Kriterium ist ein Winkel, θₘᵢₙ = 1.22·λ/D: der erste dunkle Ring des einen in der Mitte des anderen.'], 'rayleigh', ['Is the criterion a distance on the image, or an angle? What part do the dark rings of the diffraction discs play?', 'Ist das Kriterium ein Abstand auf dem Bild oder ein Winkel? Welche Rolle spielen die dunklen Ringe der Beugungsscheibchen?']]]],
    ['res', ['In bright light your pupil narrows from 6 mm to 3 mm. By diffraction alone, the smallest angle your eye resolves…', 'In hellem Licht verengt sich deine Pupille von 6 mm auf 3 mm. Allein wegen der Beugung wird der kleinste Winkel, den dein Auge trennt, …'],
      ['doubles: the eye resolves less.', 'doppelt so gross: Das Auge trennt weniger.'],
      [[['halves: the eye resolves more.', 'halb so gross: Das Auge trennt mehr.'], ['A narrower opening diffracts more: θₘᵢₙ = 1.22·λ/D grows.', 'Eine engere Öffnung beugt stärker: θₘᵢₙ = 1.22·λ/D wächst.'], 'rinv', ['Does a narrower opening diffract more or less? What does that mean for θₘᵢₙ?', 'Beugt eine engere Öffnung stärker oder schwächer? Was heisst das für θₘᵢₙ?']],
        [['stays the same.', 'bleibt gleich.'], ['θₘᵢₙ = 1.22·λ/D depends on the diameter of the pupil.', 'θₘᵢₙ = 1.22·λ/D hängt vom Durchmesser der Pupille ab.'], 'rsame', ['Does the diameter of the pupil appear in the Rayleigh criterion?', 'Kommt der Durchmesser der Pupille im Rayleigh-Kriterium vor?']],
        [['becomes four times as large.', 'viermal so gross.'], ['θₘᵢₙ ∝ 1/D: half the diameter, twice the angle, not four times (that would be the area).', 'θₘᵢₙ ∝ 1/D: halber Durchmesser, doppelter Winkel, nicht vierfacher (das wäre die Fläche).'], null, ['Does D appear squared in the Rayleigh criterion, or once? Are you thinking of the area?', 'Kommt D im Rayleigh-Kriterium im Quadrat vor oder einfach? Denkst du an die Fläche?']]]],
    ['huy', ['Plane water waves reach a wall with a gap many wavelengths wide. What do the waves look like right behind the gap?', 'Gerade Wasserwellen treffen auf eine Wand mit einer Öffnung, die viele Wellenlängen breit ist. Wie sehen die Wellen direkt hinter der Öffnung aus?'],
      ['A straight front about as wide as the gap; only at its ends does it bend a little into the shadow.', 'Eine gerade Front, etwa so breit wie die Öffnung; nur an ihren Enden biegt sie ein wenig in den Schatten.'],
      [[['Circular waves that spread into the whole space behind the wall.', 'Kreiswellen, die sich in den ganzen Raum hinter der Wand ausbreiten.'], ['That happens behind a gap about one wavelength wide or narrower. In a wide gap the wavelets of its many points add up to a straight front.', 'Das geschieht hinter einer Öffnung, die etwa eine Wellenlänge breit oder schmaler ist. In einer breiten Öffnung addieren sich die Elementarwellen ihrer vielen Punkte zu einer geraden Front.'], 'size', ['Behind an opening of what width does that happen? How wide is this one, in wavelengths?', 'Hinter einer Öffnung welcher Breite geschieht das? Wie breit ist diese, in Wellenlängen gemessen?']],
        [['Waves only behind the two edges of the gap.', 'Wellen nur hinter den beiden Rändern der Öffnung.'], ['Every point in the gap sends out wavelets, not only the edges; together they continue the front.', 'Jeder Punkt in der Öffnung sendet Elementarwellen aus, nicht nur die Ränder; zusammen setzen sie die Front fort.'], 'ray', ['Do only the edges really send out wavelets? What do the wavelets of all the points in the opening add up to?', 'Senden wirklich nur die Ränder Elementarwellen aus? Was ergeben die Elementarwellen aller Punkte der Öffnung zusammen?']],
        [['A straight front with a shorter wavelength.', 'Eine gerade Front mit kürzerer Wellenlänge.'], ['Same medium, same speed, same frequency: the same wavelength.', 'Dasselbe Medium, dieselbe Geschwindigkeit, dieselbe Frequenz: dieselbe Wellenlänge.'], 'lambda']]],
    ['huy', ['Sea waves with a wavelength of 10 m reach a harbour entrance 10 m wide. What happens behind it?', 'Meereswellen mit einer Wellenlänge von 10 m erreichen eine Hafeneinfahrt von 10 m Breite. Was geschieht dahinter?'],
      ['They spread out in circles into the whole harbour.', 'Sie breiten sich kreisförmig in den ganzen Hafen aus.'],
      [[['They pass straight through, in a strip 10 m wide.', 'Sie laufen geradeaus hindurch, in einem 10 m breiten Streifen.'], ['A gap of about one wavelength acts like a point source: the waves spread in all directions.', 'Eine Öffnung von etwa einer Wellenlänge wirkt wie eine punktförmige Quelle: Die Wellen breiten sich in alle Richtungen aus.'], 'size', ['How wide is the entrance, in wavelengths? With Huygens, what does an opening that narrow send out?', 'Wie breit ist die Einfahrt, in Wellenlängen gemessen? Was sendet eine so schmale Öffnung nach Huygens aus?']],
        [['They are stopped: the entrance is too narrow for them.', 'Sie werden aufgehalten: Die Einfahrt ist zu schmal für sie.'], ['A gap of one wavelength lets the wave through, and spreads it.', 'Eine Öffnung von einer Wellenlänge lässt die Welle durch und breitet sie aus.'], 'ray', ['Does an opening one wavelength wide really stop the wave? Think of Huygens: what happens at each point of the opening?', 'Hält eine Öffnung von einer Wellenlänge die Welle wirklich auf? Denk an Huygens: Was geschieht an jedem Punkt der Öffnung?']],
        [['Their wavelength becomes shorter in the harbour.', 'Ihre Wellenlänge wird im Hafen kürzer.'], ['Same water, same depth, same frequency: the same wavelength.', 'Dasselbe Wasser, dieselbe Tiefe, dieselbe Frequenz: dieselbe Wellenlänge.'], 'lambda']]],
    ['huy', ['Why does the light behind a very narrow slit spread out on the screen, much wider than the slit?', 'Warum breitet sich das Licht hinter einem sehr schmalen Spalt auf dem Schirm aus, viel breiter als der Spalt?'],
      ['Each point of the slit sends out wavelets in all directions: the light is diffracted.', 'Jeder Punkt des Spalts sendet Elementarwellen in alle Richtungen aus: Das Licht wird gebeugt.'],
      [[['The edges of the slit reflect the light sideways.', 'Die Ränder des Spalts reflektieren das Licht zur Seite.'], ['Black, absorbing edges give the same pattern: it comes from the wavelets in the gap, not from the edges.', 'Schwarze, absorbierende Ränder geben dasselbe Muster: Es kommt von den Elementarwellen in der Öffnung, nicht von den Rändern.'], 'ray', ['Black, absorbing edges give the same pattern. Where does it come from, then?', 'Schwarze, absorbierende Ränder geben dasselbe Muster. Woher kommt es dann?']],
        [['The air behind the slit scatters the light.', 'Die Luft hinter dem Spalt streut das Licht.'], ['The pattern looks the same in a vacuum: it is diffraction at the slit.', 'Im Vakuum sieht das Muster gleich aus: Es ist Beugung am Spalt.'], null, ['In vacuum the pattern looks the same. What at the slit itself could make it?', 'Im Vakuum sieht das Muster gleich aus. Was am Spalt selbst könnte es erzeugen?']],
        [['The narrow slit acts like a lens.', 'Der schmale Spalt wirkt wie eine Linse.'], ['A lens focuses; a narrow slit spreads the light, the more the narrower it is.', 'Eine Linse bündelt; ein schmaler Spalt verbreitert das Licht, umso mehr, je schmaler er ist.'], 'size']]],
    ['huy', ['A wave passes through a gap and is diffracted. What stays the same behind the gap?', 'Eine Welle läuft durch eine Öffnung und wird gebeugt. Was bleibt hinter der Öffnung gleich?'],
      ['Its wavelength, its frequency and its speed.', 'Ihre Wellenlänge, ihre Frequenz und ihre Geschwindigkeit.'],
      [[['Only the frequency: the wavelength gets shorter.', 'Nur die Frequenz: Die Wellenlänge wird kürzer.'], ['In the same medium the speed stays, so with the frequency the wavelength stays too.', 'Im selben Medium bleibt die Geschwindigkeit, also mit der Frequenz auch die Wellenlänge.'], 'lambda', ['Does the medium change behind the opening? What follows for the speed and the wavelength?', 'Ändert sich hinter der Öffnung das Medium? Was folgt daraus für Geschwindigkeit und Wellenlänge?']],
        [['Only the speed: the frequency drops.', 'Nur die Geschwindigkeit: Die Frequenz sinkt.'], ['The frequency is set by the source; the gap cannot change it.', 'Die Frequenz ist durch die Quelle bestimmt; die Öffnung kann sie nicht ändern.'], 'lambda', ['What sets the frequency of a wave? Can an opening change it?', 'Wodurch ist die Frequenz einer Welle bestimmt? Kann eine Öffnung sie ändern?']],
        [['Only the direction: the wave goes on straight ahead.', 'Nur die Richtung: Die Welle läuft geradeaus weiter.'], ['The direction is just what changes: the wave spreads into the shadow.', 'Gerade die Richtung ändert sich: Die Welle breitet sich in den Schatten aus.'], 'ray']]],
    ['huy', ['Long-wave radio (λ ≈ 1 km) can be received in a deep valley behind a hill; a phone signal (λ ≈ 30 cm) hardly. Why?', 'Langwellenradio (λ ≈ 1 km) empfängt man in einem tiefen Tal hinter einem Hügel; ein Handysignal (λ ≈ 30 cm) kaum. Warum?'],
      ['Waves about as long as the hill is high are diffracted strongly round it; short waves hardly.', 'Wellen, die etwa so lang sind, wie der Hügel hoch ist, werden stark um ihn herum gebeugt; kurze kaum.'],
      [[['Long waves travel faster.', 'Lange Wellen sind schneller.'], ['All radio waves travel at the speed of light. What differs is their wavelength compared with the hill.', 'Alle Radiowellen laufen mit Lichtgeschwindigkeit. Was sich unterscheidet, ist ihre Wellenlänge im Vergleich zum Hügel.'], null, ['Do all radio waves not travel at the speed of light? In what, then, do the two signals differ?', 'Laufen nicht alle Radiowellen mit Lichtgeschwindigkeit? Worin unterscheiden sich die beiden Signale dann?']],
        [['Short waves are absorbed by the air.', 'Kurze Wellen werden von der Luft absorbiert.'], ['On an open field the phone works fine: the difference is how much the waves bend round the hill.', 'Auf freiem Feld funktioniert das Handy gut: Der Unterschied ist, wie stark die Wellen um den Hügel biegen.'], null, ['In the open the phone works well. What is different in the valley behind the hill?', 'Auf freiem Feld funktioniert das Handy gut. Was ist im Tal hinter dem Hügel anders?']],
        [['Short waves are diffracted more, but they are too weak.', 'Kurze Wellen werden stärker gebeugt, aber sie sind zu schwach.'], ['The other way round: the longer the wave compared with the obstacle, the more it is diffracted.', 'Umgekehrt: Je länger die Welle im Vergleich zum Hindernis, desto stärker wird sie gebeugt.'], 'size', ['Check the direction: is a shorter wave diffracted more or less at the same obstacle?', 'Prüfe die Richtung: Wird eine kürzere Welle am selben Hindernis stärker oder schwächer gebeugt?']]]],
    ['ds', ['In a double-slit experiment, one slit is covered. What do you see on the screen?', 'In einem Doppelspaltversuch wird ein Spalt abgedeckt. Was sieht man auf dem Schirm?'],
      ['One broad bright patch, the pattern of a single slit: the fringes disappear.', 'Einen breiten hellen Fleck, das Muster eines Einzelspalts: Die Streifen verschwinden.'],
      [[['The same fringes, half as bright.', 'Dieselben Streifen, halb so hell.'], ['The fringes come from the light of two slits interfering; with one slit there is nothing to interfere with.', 'Die Streifen entstehen durch die Interferenz des Lichts zweier Spalte; mit einem Spalt interferiert nichts mehr.'], null, ['Where do the fringes come from? What do they need, and is it still there with one slit?', 'Woher kommen die Streifen? Was braucht es dafür, und ist das mit einem Spalt noch da?']],
        [['The same fringes, twice as far apart.', 'Dieselben Streifen, doppelt so weit auseinander.'], ['Without a second slit there is no path difference between two waves, and no fringes.', 'Ohne zweiten Spalt gibt es keinen Gangunterschied zwischen zwei Wellen und keine Streifen.'], null, ['Between which two waves is there a path difference? Are they still there with one slit?', 'Zwischen welchen zwei Wellen entsteht der Gangunterschied? Gibt es sie mit einem Spalt noch?']],
        [['A narrow bright line just behind the open slit.', 'Eine schmale helle Linie direkt hinter dem offenen Spalt.'], ['A narrow slit diffracts: the light spreads out into a broad patch.', 'Ein schmaler Spalt beugt: Das Licht breitet sich zu einem breiten Fleck aus.'], 'ray', ['What does a narrow slit do to the light that goes through it?', 'Was macht ein schmaler Spalt mit dem Licht, das durch ihn geht?']]]],
    ['ds', ['At a point P on the screen of a double slit, the path difference is 2.5 λ. What is there?', 'An einem Punkt P auf dem Schirm eines Doppelspalts ist der Gangunterschied 2.5 λ. Was ist dort?'],
      ['A dark fringe, between the maxima of order 2 and 3.', 'Ein dunkler Streifen, zwischen den Maxima 2. und 3. Ordnung.'],
      [[['A bright fringe of order 2.5.', 'Ein heller Streifen der Ordnung 2.5.'], ['Bright needs a whole number of wavelengths. With half a wavelength over, crest meets trough.', 'Hell braucht eine ganze Zahl von Wellenlängen. Mit einer halben Wellenlänge zu viel trifft Berg auf Tal.'], 'half', ['What path difference gives a bright fringe? Is 2.5 λ one of them?', 'Welcher Gangunterschied ergibt einen hellen Streifen? Ist 2.5 λ so einer?']],
        [['A bright fringe of order 2.', 'Ein heller Streifen der Ordnung 2.'], ['Order 2 has Δs = 2λ exactly; the extra half wavelength makes it dark.', 'Die Ordnung 2 hat genau Δs = 2λ; die zusätzliche halbe Wellenlänge macht es dunkel.'], 'half', ['Order 2 has exactly Δs = 2λ. What does the extra half wavelength do?', 'Die Ordnung 2 hat genau Δs = 2λ. Was bewirkt die zusätzliche halbe Wellenlänge?']],
        [['A bright fringe of order 5, counted in half wavelengths.', 'Ein heller Streifen der Ordnung 5, in halben Wellenlängen gezählt.'], ['The order counts whole wavelengths: Δs = k·λ.', 'Die Ordnung zählt ganze Wellenlängen: Δs = k·λ.'], 'order', ['Does the order count half or whole wavelengths? What meets at 2.5 λ?', 'Zählt die Ordnung halbe oder ganze Wellenlängen? Was trifft bei 2.5 λ aufeinander?']]]],
    ['ds', ['Why are the maxima of a grating much sharper than those of a double slit?', 'Warum sind die Maxima eines Gitters viel schärfer als die eines Doppelspalts?'],
      ['Just beside a maximum the waves of the many slits get out of step with each other and cancel almost completely.', 'Knapp neben einem Maximum geraten die Wellen der vielen Spalte ausser Takt und löschen sich fast vollständig aus.'],
      [[['The slits of a grating are narrower.', 'Die Spalte eines Gitters sind schmaler.'], ['The width of the slits sets only the envelope; the sharpness comes from the number of slits.', 'Die Breite der Spalte bestimmt nur die Einhüllende; die Schärfe kommt von der Anzahl Spalte.'], 'bd', ['The width of the slits decides only the envelope. What else makes a grating different from a double slit?', 'Die Breite der Spalte bestimmt nur die Einhüllende. Was unterscheidet ein Gitter sonst von einem Doppelspalt?']],
        [['They are brighter, so they only look smaller.', 'Sie sind heller, darum sehen sie nur kleiner aus.'], ['They really are narrower: beside them, the light of many slits cancels.', 'Sie sind wirklich schmaler: Daneben löscht sich das Licht vieler Spalte aus.'], 'grating', ['Are they only narrower in appearance? What happens to the light of many slits just beside a maximum?', 'Sind sie wirklich nur scheinbar schmaler? Was geschieht mit dem Licht vieler Spalte knapp neben einem Maximum?']],
        [['A grating focuses the light like a lens.', 'Ein Gitter bündelt das Licht wie eine Linse.'], ['A grating does not focus; its maxima are sharp because many waves interfere.', 'Ein Gitter bündelt nicht; seine Maxima sind scharf, weil viele Wellen interferieren.'], 'grating', ['Does a grating really focus light? How many waves interfere behind a grating?', 'Bündelt ein Gitter wirklich? Wie viele Wellen interferieren hinter einem Gitter?']]]],
    ['ds', ['Why does a double-slit experiment need the light of one source (for example one laser), not of two separate lamps?', 'Warum braucht ein Doppelspaltversuch das Licht einer Quelle (zum Beispiel eines Lasers) und nicht zweier getrennter Lampen?'],
      ['The two waves must keep a fixed phase difference (be coherent); with two lamps it changes all the time and the fringes wash out.', 'Die beiden Wellen müssen einen festen Phasenunterschied behalten (kohärent sein); bei zwei Lampen ändert er sich ständig, und die Streifen verwischen.'],
      [[['Two lamps would be too bright.', 'Zwei Lampen wären zu hell.'], ['Brightness does not matter: the phase difference must stay fixed.', 'Die Helligkeit spielt keine Rolle: Der Phasenunterschied muss fest bleiben.'], null, ['Does the brightness matter for the fringes? What must stay the same between the two waves?', 'Spielt die Helligkeit für die Streifen eine Rolle? Was muss zwischen den beiden Wellen gleich bleiben?']],
        [['The light of two lamps cannot overlap.', 'Das Licht zweier Lampen kann sich nicht überlagern.'], ['It overlaps, but its phase difference changes so fast that the fringes move too fast to be seen.', 'Es überlagert sich, aber sein Phasenunterschied ändert sich so schnell, dass die Streifen zu schnell wandern, um sie zu sehen.'], null, ['The light of two lamps does overlap. Does the phase difference of the two waves stay fixed?', 'Das Licht zweier Lampen überlagert sich durchaus. Bleibt dabei der Phasenunterschied der beiden Wellen fest?']],
        [['With two lamps there would be twice as many fringes.', 'Mit zwei Lampen gäbe es doppelt so viele Streifen.'], ['There would be no steady fringes at all: the waves are not coherent.', 'Es gäbe gar keine festen Streifen: Die Wellen sind nicht kohärent.'], null, ['Would there be fixed fringes at all with two lamps? Does their phase difference stay fixed?', 'Gäbe es mit zwei Lampen überhaupt feste Streifen? Bleibt ihr Phasenunterschied fest?']]]],
    ['pat', ['The screen behind a double slit is moved twice as far away. What happens to the spacing of the fringes?', 'Der Schirm hinter einem Doppelspalt wird doppelt so weit weg gerückt. Was passiert mit dem Abstand der Streifen?'],
      ['It doubles.', 'Er verdoppelt sich.'],
      [[['It halves.', 'Er halbiert sich.'], ['Δy = λL/d grows with L: the same angles reach further out on a screen further away.', 'Δy = λL/d wächst mit L: Dieselben Winkel reichen auf einem weiter entfernten Schirm weiter hinaus.'], 'inv', ['The angles stay the same. What happens to the distance on the screen when the same angle reaches a screen further away?', 'Die Winkel bleiben gleich. Was geschieht mit dem Abstand auf dem Schirm, wenn derselbe Winkel einen weiter entfernten Schirm trifft?']],
        [['It stays the same: the angles do not change.', 'Er bleibt gleich: Die Winkel ändern sich nicht.'], ['The angles stay, but at twice the distance the same angle gives twice the distance on the screen.', 'Die Winkel bleiben, aber im doppelten Abstand gibt derselbe Winkel den doppelten Abstand auf dem Schirm.'], 'same', ['The angles stay, right. What does the same angle give on a screen twice as far away?', 'Die Winkel bleiben, stimmt. Was ergibt derselbe Winkel auf einem doppelt so weit entfernten Schirm?']],
        [['It becomes four times as large.', 'Er wird viermal so gross.'], ['L enters Δy = λL/d once, not squared.', 'L kommt in Δy = λL/d einfach vor, nicht im Quadrat.'], null, ['Does L appear squared in the formula for Δy?', 'Kommt L in der Formel für Δy im Quadrat vor?']]]],
    ['pat', ['A grating with 300 lines per mm is replaced by one with 600 lines per mm. What happens to the maxima?', 'Ein Gitter mit 300 Linien pro mm wird durch eines mit 600 Linien pro mm ersetzt. Was passiert mit den Maxima?'],
      ['They move further apart: the slits are half as far apart.', 'Sie rücken weiter auseinander: Die Spalte haben den halben Abstand.'],
      [[['They move closer together: more lines, denser maxima.', 'Sie rücken näher zusammen: mehr Linien, dichtere Maxima.'], ['More lines per mm means a smaller spacing d, and sin α = k·λ/d grows.', 'Mehr Linien pro mm heisst ein kleinerer Abstand d, und sin α = k·λ/d wächst.'], 'inv', ['What do more lines per mm mean for the slit spacing d, and how does sin α depend on d?', 'Was bedeuten mehr Linien pro mm für den Spaltabstand d, und wie hängt sin α von d ab?']],
        [['They stay where they are and become sharper.', 'Sie bleiben, wo sie sind, und werden schärfer.'], ['That is what more lit slits with the same spacing do; here the spacing d changes.', 'Das tun mehr beleuchtete Spalte mit demselben Abstand; hier ändert sich der Abstand d.'], 'grating'],
        [['More orders appear.', 'Es erscheinen mehr Ordnungen.'], ['Fewer: with a smaller d, sin α = k·λ/d reaches 1 at a lower order.', 'Weniger: Mit kleinerem d erreicht sin α = k·λ/d schon bei einer tieferen Ordnung 1.'], 'round', ['How does d change, and at which order does sin α = k·λ/d then reach 1?', 'Wie ändert sich d, und bei welcher Ordnung erreicht sin α = k·λ/d dann den Wert 1?']]]],
    ['pat', ['A single slit is lit first with red, then with blue laser light. What happens to the central bright fringe?', 'Ein Einzelspalt wird zuerst mit rotem, dann mit blauem Laserlicht beleuchtet. Was passiert mit dem mittleren hellen Streifen?'],
      ['It gets narrower.', 'Er wird schmaler.'],
      [[['It gets wider.', 'Er wird breiter.'], ['Blue light has the shorter wavelength, and w = 2λL/b.', 'Blaues Licht hat die kürzere Wellenlänge, und w = 2λL/b.'], 'inv', ['Which light has the shorter wavelength, and how does w depend on it?', 'Welches Licht hat die kürzere Wellenlänge, und wie hängt w von ihr ab?']],
        [['It stays the same; only its colour changes.', 'Er bleibt gleich; nur seine Farbe ändert sich.'], ['w = 2λL/b depends on the wavelength.', 'w = 2λL/b hängt von der Wellenlänge ab.'], 'same', ['Does the width of the central fringe depend on the wavelength? Write down the formula.', 'Hängt die Breite des mittleren Streifens von der Wellenlänge ab? Schreib die Formel auf.']],
        [['It splits into two fringes.', 'Er teilt sich in zwei Streifen.'], ['A single slit always has one central bright fringe.', 'Ein Einzelspalt hat immer einen mittleren hellen Streifen.'], null]]],
    ['pat', ['Behind a double slit with fairly wide slits, some bright fringes are missing. Why?', 'Hinter einem Doppelspalt mit ziemlich breiten Spalten fehlen einige helle Streifen. Warum?'],
      ['There the pattern of each single slit is dark: the envelope has a zero.', 'Dort ist das Muster jedes Einzelspalts dunkel: Die Einhüllende hat eine Nullstelle.'],
      [[['There the path difference is half a wavelength.', 'Dort ist der Gangunterschied eine halbe Wellenlänge.'], ['At a maximum the path difference between the slits is a whole number of wavelengths; the light is missing because each slit sends none in that direction.', 'Bei einem Maximum ist der Gangunterschied zwischen den Spalten eine ganze Zahl von Wellenlängen; das Licht fehlt, weil jeder Spalt keines in diese Richtung schickt.'], 'half', ['At a maximum, the path difference between the slits is a whole number of wavelengths. But what does each single, wide slit send in that direction?', 'Bei einem Maximum ist der Gangunterschied zwischen den Spalten eine ganze Zahl von Wellenlängen. Was schickt aber jeder einzelne, breite Spalt in diese Richtung?']],
        [['The slit spacing is too large there.', 'Der Spaltabstand ist dort zu gross.'], ['The slit spacing sets where the fringes are; the slit width sets which of them are bright.', 'Der Spaltabstand bestimmt, wo die Streifen sind; die Spaltbreite, welche von ihnen hell sind.'], 'bd', ['The slit spacing decides where the fringes are. What decides which of them are bright?', 'Der Spaltabstand bestimmt, wo die Streifen liegen. Was bestimmt, welche von ihnen hell sind?']],
        [['The light is too weak to reach that far.', 'Das Licht ist zu schwach, um so weit zu kommen.'], ['Fringes further out can be bright again: only those at the zeros of the envelope are missing.', 'Weiter aussen können Streifen wieder hell sein: Nur die bei den Nullstellen der Einhüllenden fehlen.'], 'bd', ['Further out, fringes can be bright again. What decides which ones are missing?', 'Weiter aussen können Streifen wieder hell sein. Was bestimmt, welche fehlen?']]]],
    ['res', ['A telescope observes the same double star first in red, then in blue light. When does it resolve finer detail?', 'Ein Teleskop beobachtet denselben Doppelstern zuerst in rotem, dann in blauem Licht. Wann trennt es feinere Einzelheiten?'],
      ['In blue light: its wavelength is shorter, and θₘᵢₙ = 1.22·λ/D.', 'Im blauen Licht: Seine Wellenlänge ist kürzer, und θₘᵢₙ = 1.22·λ/D.'],
      [[['In red light: longer waves get through the air better.', 'Im roten Licht: Längere Wellen kommen besser durch die Luft.'], ['Diffraction alone: the shorter the wave, the smaller θₘᵢₙ.', 'Allein wegen der Beugung: Je kürzer die Welle, desto kleiner θₘᵢₙ.'], 'rinv', ['Only diffraction counts here. How does θₘᵢₙ depend on the wavelength?', 'Hier zählt allein die Beugung. Wie hängt θₘᵢₙ von der Wellenlänge ab?']],
        [['In both the same: the mirror is the same.', 'In beiden gleich: Der Spiegel ist derselbe.'], ['θₘᵢₙ = 1.22·λ/D depends on the wavelength too.', 'θₘᵢₙ = 1.22·λ/D hängt auch von der Wellenlänge ab.'], 'rsame', ['Does θₘᵢₙ depend only on the mirror? Write down the Rayleigh criterion.', 'Hängt θₘᵢₙ nur vom Spiegel ab? Schreib das Rayleigh-Kriterium auf.']],
        [['In whichever colour the star is brighter.', 'In der Farbe, in der der Stern heller ist.'], ['Brightness does not change the size of the diffraction blur.', 'Die Helligkeit ändert die Grösse der Beugungsscheibchen nicht.'], null]]],
    ['res', ['Radio telescopes thousands of kilometres apart are linked to observe together. Why does that help?', 'Radioteleskope, die Tausende Kilometer voneinander entfernt sind, werden zusammengeschaltet. Warum hilft das?'],
      ['Together they act like one opening as wide as their distance: θₘᵢₙ ≈ λ/D becomes tiny.', 'Zusammen wirken sie wie eine Öffnung, so breit wie ihr Abstand: θₘᵢₙ ≈ λ/D wird winzig.'],
      [[['They only collect more signal; the detail stays the same.', 'Sie sammeln nur mehr Signal; die Einzelheiten bleiben dieselben.'], ['The decisive size is the width of the whole opening, here the distance between the dishes.', 'Entscheidend ist die Breite der ganzen Öffnung, hier der Abstand der Schüsseln.'], 'rsame', ['Does the resolution depend on the amount of signal? Which quantity in the Rayleigh criterion changes when the dishes are linked?', 'Hängt die Auflösung von der Menge des Signals ab? Welche Grösse im Rayleigh-Kriterium ändert sich beim Zusammenschalten?']],
        [['Linking them shortens the wavelength.', 'Das Zusammenschalten verkürzt die Wellenlänge.'], ['The wavelength is set by the source; what grows is D.', 'Die Wellenlänge ist durch die Quelle bestimmt; was wächst, ist D.'], null, ['Can linking the dishes change the wavelength of the source? Which other quantity in the Rayleigh criterion could change?', 'Kann das Zusammenschalten die Wellenlänge der Quelle ändern? Welche andere Grösse im Rayleigh-Kriterium könnte sich ändern?']],
        [['It does not help: a wider opening diffracts more.', 'Es hilft nicht: Eine breitere Öffnung beugt stärker.'], ['The other way round: the wider the opening, the less it diffracts.', 'Umgekehrt: Je breiter die Öffnung, desto weniger beugt sie.'], 'rinv', ['Check the direction: does a wider opening diffract more or less?', 'Prüfe die Richtung: Beugt eine breitere Öffnung stärker oder schwächer?']]]],
    ['res', ['Why can no light microscope show single atoms (about 0.1 nm across)?', 'Warum kann kein Lichtmikroskop einzelne Atome (etwa 0.1 nm gross) zeigen?'],
      ['They are thousands of times smaller than the wavelength of light: diffraction blurs detail below about λ.', 'Sie sind tausendmal kleiner als die Wellenlänge des Lichts: Die Beugung verwischt Einzelheiten unter etwa λ.'],
      [[['The lenses are not yet good enough.', 'Die Linsen sind noch nicht gut genug.'], ['Even a perfect lens cannot beat diffraction: the limit is set by λ.', 'Auch eine perfekte Linse überwindet die Beugung nicht: Die Grenze ist durch λ gesetzt.'], 'rayleigh', ['Would a perfect lens get rid of the diffraction at its opening? Compare the size of an atom with the wavelength of light.', 'Würde eine perfekte Linse die Beugung an ihrer Öffnung beseitigen? Vergleiche die Grösse eines Atoms mit der Wellenlänge des Lichts.']],
        [['Atoms are transparent.', 'Atome sind durchsichtig.'], ['The limit is diffraction: detail much smaller than λ cannot be resolved.', 'Die Grenze ist die Beugung: Einzelheiten viel kleiner als λ kann man nicht trennen.'], null, ['Compare the size of an atom with the wavelength of visible light. What does that mean for diffraction?', 'Vergleiche die Grösse eines Atoms mit der Wellenlänge des sichtbaren Lichts. Was bedeutet das für die Beugung?']],
        [['A stronger magnification would show them.', 'Eine stärkere Vergrösserung würde sie zeigen.'], ['Magnifying a blurred image only gives a larger blur.', 'Ein verwaschenes Bild zu vergrössern, gibt nur einen grösseren Fleck.'], 'rayleigh']]],
    ['res', ['Two stars are just resolved by a telescope. Then a ring covers the outer part of the mirror, so that only half its diameter is used. Now the stars…', 'Zwei Sterne werden von einem Teleskop knapp getrennt. Dann deckt ein Ring den äusseren Teil des Spiegels ab, so dass nur sein halber Durchmesser genutzt wird. Jetzt …'],
      ['merge into one: θₘᵢₙ doubles.', 'verschmelzen die Sterne zu einem: θₘᵢₙ verdoppelt sich.'],
      [[['appear further apart.', 'erscheinen die Sterne weiter auseinander.'], ['A smaller opening diffracts more: the images get larger and overlap.', 'Eine kleinere Öffnung beugt stärker: Die Bilder werden grösser und überlappen sich.'], 'rinv', ['Does a smaller opening diffract more or less? What then happens to the images of the stars?', 'Beugt eine kleinere Öffnung stärker oder schwächer? Was geschieht dann mit den Bildern der Sterne?']],
        [['are still resolved, only fainter.', 'sind die Sterne immer noch getrennt, nur schwächer.'], ['θₘᵢₙ = 1.22·λ/D depends on the diameter used.', 'θₘᵢₙ = 1.22·λ/D hängt vom genutzten Durchmesser ab.'], 'rsame', ['Does θₘᵢₙ depend on the diameter used? Write down the Rayleigh criterion.', 'Hängt θₘᵢₙ vom genutzten Durchmesser ab? Schreib das Rayleigh-Kriterium auf.']],
        [['are resolved better: less light, sharper images.', 'sind die Sterne besser getrennt: weniger Licht, schärfere Bilder.'], ['The other way round: half the opening, twice the blur.', 'Umgekehrt: halbe Öffnung, doppelt so grosse Unschärfe.'], 'rinv', ['Check the direction: does the blur from diffraction grow or shrink with a smaller opening?', 'Prüfe die Richtung: Wird die Unschärfe durch Beugung mit kleinerer Öffnung grösser oder kleiner?']]]],
  ];
  const CONCEPT_HINTS = {
    huy: () => HUYGENS(),
    ds: () => L('Bright where Δs = k·λ: d·sin α = k·λ, for a double slit and a grating alike.', 'Hell, wo Δs = k·λ: d·sin α = k·λ, für Doppelspalt und Gitter gleich.'),
    pat: () => L('Δy = λL/d for the fringes, w = 2λL/b for the central fringe of a single slit.', 'Δy = λL/d für die Streifen, w = 2λL/b für den mittleren Streifen eines Einzelspalts.'),
    res: () => L('The Rayleigh criterion: θₘᵢₙ = 1.22·λ/D.', 'Das Rayleigh-Kriterium: θₘᵢₙ = 1.22·λ/D.'),
  };
  // a first hint for each statement (in the order of CONCEPTS): where to look in this question,
  // without the answer; the rule of its group follows
  const CONCEPT_ASK = [
    ['Think of one wave front: which of its points act as sources, and how do you get the front a moment later from what they send out?', 'Denk an eine Wellenfront: Welche ihrer Punkte wirken als Quellen, und wie erhältst du die Front einen Augenblick später aus dem, was sie aussenden?'],
    ['Compare the wavelengths with the width of a door: speech has wavelengths of about a metre, visible light of about 500 nm.', 'Vergleiche die Wellenlängen mit der Breite einer Tür: Sprache hat Wellenlängen von etwa einem Meter, sichtbares Licht von etwa 500 nm.'],
    ['The wavelength stays, the gap gets narrower: does the gap come closer to one wavelength, or move further from it?', 'Die Wellenlänge bleibt, die Öffnung wird schmaler: Kommt die Öffnung einer Wellenlänge näher oder entfernt sie sich davon?'],
    ['Each point on the screen gets a wave from each slit, along paths of different length. What decides whether they arrive crest on crest?', 'Jeder Punkt auf dem Schirm erhält eine Welle von jedem Spalt, auf verschieden langen Wegen. Was entscheidet, ob sie Berg auf Berg ankommen?'],
    ['The spacing $d$ stays the same, so does $d\\cdot\\sin\\alpha = k\\cdot\\lambda$ change? What do the many extra slits add?', 'Der Abstand $d$ bleibt gleich: Ändert sich dann $d\\cdot\\sin\\alpha = k\\cdot\\lambda$? Was bringen die vielen zusätzlichen Spalte?'],
    ['In the first order $\\sin\\alpha = \\lambda/d$, with the same $d$ for every colour. Which colour of white light has the longest wavelength?', 'In der ersten Ordnung ist $\\sin\\alpha = \\lambda/d$, mit demselben $d$ für jede Farbe. Welche Farbe des weissen Lichts hat die grösste Wellenlänge?'],
    ['At order 0, how large is the path difference, and is that so for every wavelength?', 'Wie gross ist der Gangunterschied bei der Ordnung 0, und gilt das für jede Wellenlänge?'],
    ['The central fringe has the width $w = 2\\lambda L/b$. Which quantity changes here, and does it stand in the numerator or the denominator?', 'Der mittlere Streifen hat die Breite $w = 2\\lambda L/b$. Welche Grösse ändert sich hier, und steht sie im Zähler oder im Nenner?'],
    ['The fringes are $\\Delta y = \\lambda L/d$ apart. Which quantity changes from red to blue light, and which way?', 'Die Streifen haben den Abstand $\\Delta y = \\lambda L/d$. Welche Grösse ändert sich von rotem zu blauem Licht, und in welche Richtung?'],
    ['Narrower slits change their width $b$, not their spacing $d$. Which of the two fixes where the fringes are, and which how far out they are bright?', 'Schmalere Spalte ändern ihre Breite $b$, nicht ihren Abstand $d$. Welche der beiden Grössen legt fest, wo die Streifen liegen, und welche, wie weit hinaus sie hell sind?'],
    ['In water the frequency stays the same and the light is slower, $c/n$. What happens to the wavelength, and then to $\\Delta y = \\lambda L/d$?', 'Im Wasser bleibt die Frequenz gleich, und das Licht ist langsamer, $c/n$. Was geschieht mit der Wellenlänge und dann mit $\\Delta y = \\lambda L/d$?'],
    ['The mirror is the opening of the telescope: what does the light do at an opening, and how does that depend on its size?', 'Der Spiegel ist die Öffnung des Teleskops: Was macht das Licht an einer Öffnung, und wie hängt das von ihrer Grösse ab?'],
    ['The microscope stays the same; what is different about ultraviolet light compared with visible light?', 'Das Mikroskop bleibt dasselbe; was ist beim ultravioletten Licht anders als beim sichtbaren?'],
    ['Each point source gives a small diffraction disc with dark rings around it. How far apart must two such discs be to be just told apart?', 'Jede punktförmige Quelle gibt ein kleines Beugungsscheibchen mit dunklen Ringen darum. Wie weit auseinander müssen zwei solche Scheibchen sein, damit man sie gerade noch unterscheidet?'],
    ['Here the opening is the pupil: by what factor does its diameter change from 6 mm to 3 mm, and is it in the numerator or the denominator?', 'Hier ist die Öffnung die Pupille: Um welchen Faktor ändert sich ihr Durchmesser von 6 mm auf 3 mm, und steht er im Zähler oder im Nenner?'],
    ['The gap is many wavelengths wide: what do the wavelets of its many points add up to, side by side? And what happens at its ends?', 'Die Öffnung ist viele Wellenlängen breit: Was ergeben die Elementarwellen ihrer vielen Punkte nebeneinander? Und was geschieht an ihren Enden?'],
    ['Compare the width of the entrance, 10 m, with the wavelength, 10 m: how many wavelengths wide is it?', 'Vergleiche die Breite der Einfahrt, 10 m, mit der Wellenlänge, 10 m: Wie viele Wellenlängen breit ist sie?'],
    ['With Huygens: what does each point of the narrow slit send out, and in which directions?', 'Mit Huygens: Was sendet jeder Punkt des schmalen Spalts aus, und in welche Richtungen?'],
    ['Behind the gap the wave is in the same medium. Which properties of a wave are fixed by its source and its medium?', 'Hinter der Öffnung ist die Welle im selben Medium. Welche Eigenschaften einer Welle sind durch ihre Quelle und ihr Medium festgelegt?'],
    ['Compare each wavelength, 1 km and 30 cm, with the size of the hill: which wave is about as long as the obstacle?', 'Vergleiche jede Wellenlänge, 1 km und 30 cm, mit der Grösse des Hügels: Welche Welle ist etwa so lang wie das Hindernis?'],
    ['With one slit covered, only one wave is left: what does a single slit give on its own?', 'Mit einem abgedeckten Spalt bleibt nur eine Welle: Was gibt ein einzelner Spalt für sich allein?'],
    ['2.5 λ: is that a whole number of wavelengths, or a whole number and a half? Crest on crest, or crest on trough?', '2.5 λ: Ist das eine ganze Zahl von Wellenlängen oder eine ganze und eine halbe? Berg auf Berg oder Berg auf Tal?'],
    ['Just beside a maximum, neighbouring slits are a little out of step. With two slits that hardly matters; with many slits, how far out of step are the first and the last?', 'Gleich neben einem Maximum sind benachbarte Spalte ein wenig aus dem Takt. Bei zwei Spalten spielt das kaum eine Rolle; wie weit sind bei vielen Spalten der erste und der letzte aus dem Takt?'],
    ['For fringes that stay put, the phase difference of the two waves at each point must stay the same. Does it with light from two separate lamps?', 'Damit die Streifen stillstehen, muss der Phasenunterschied der beiden Wellen an jedem Punkt gleich bleiben. Tut er das mit dem Licht zweier getrennter Lampen?'],
    ['The fringes are $\\Delta y = \\lambda L/d$ apart. Which quantity changes here, and by what factor?', 'Die Streifen haben den Abstand $\\Delta y = \\lambda L/d$. Welche Grösse ändert sich hier, und um welchen Faktor?'],
    ['$d = 1/n$: what does 600 instead of 300 lines per mm do to $d$, and then to $\\sin\\alpha = k\\cdot\\lambda/d$?', '$d = 1/n$: Was machen 600 statt 300 Linien pro mm mit $d$, und dann mit $\\sin\\alpha = k\\cdot\\lambda/d$?'],
    ['The central fringe has the width $w = 2\\lambda L/b$. Which quantity differs between red and blue light, and which way?', 'Der mittlere Streifen hat die Breite $w = 2\\lambda L/b$. Welche Grösse unterscheidet sich zwischen rotem und blauem Licht, und in welche Richtung?'],
    ['Each slit on its own sends its light only into its single-slit pattern, with dark places at $b\\cdot\\sin\\alpha = \\lambda$. What about a double-slit fringe that falls there?', 'Jeder Spalt allein schickt sein Licht nur in sein Einzelspaltmuster, mit dunklen Stellen bei $b\\cdot\\sin\\alpha = \\lambda$. Was ist mit einem Doppelspaltstreifen, der dorthin fällt?'],
    ['The telescope, and so $D$, stays the same. What differs between red and blue light?', 'Das Teleskop, also $D$, bleibt dasselbe. Was unterscheidet sich zwischen rotem und blauem Licht?'],
    ['In $\\theta_{\\min} \\approx \\lambda/D$: what plays the role of the opening $D$ when telescopes far apart work together?', 'In $\\theta_{\\min} \\approx \\lambda/D$: Was spielt die Rolle der Öffnung $D$, wenn weit voneinander entfernte Teleskope zusammenarbeiten?'],
    ['Compare the size of an atom, 0.1 nm, with the wavelength of visible light, 400 to 700 nm. Below about what size does diffraction blur detail?', 'Vergleiche die Grösse eines Atoms, 0.1 nm, mit der Wellenlänge des sichtbaren Lichts, 400 bis 700 nm. Unter etwa welcher Grösse verwischt die Beugung Einzelheiten?'],
    ['The diameter used is halved: what happens to $\\theta_{\\min}$? Before, the angle between the stars was just $\\theta_{\\min}$: how does it compare with the new one?', 'Der genutzte Durchmesser wird halbiert: Was geschieht mit $\\theta_{\\min}$? Vorher war der Winkel zwischen den Sternen gerade $\\theta_{\\min}$: Wie verhält er sich zum neuen?'],
  ];
  // a statement on one group of ideas
  const conceptOf = (group) => {
    const ks = CONCEPTS.map((c, k) => k).filter((k) => CONCEPTS[k][0] === group);
    return {
      id: `concept-${group}`, difficulty: 2, quizChoice: true,
      title: () => L('Understood?', 'Verstanden?'),
      make: (r) => ({ k: pick(r, ks), o: Math.floor(r() * 4) }),
      solve: () => ({ ans: 'right' }),
      traps: [],
      fields: (p) => {
        const [, qu, right, wrong] = CONCEPTS[p.k], tr = (x) => L(x[0], x[1]);
        const opts = wrong.map((w, i) => [`w${i}`, tr(w[0]), tr(w[1]), w[2], w[3] ? tr(w[3]) : '']);
        opts.splice(p.o, 0, ['right', tr(right), '', null]);
        return [choice('ans', L('Your answer:', 'Deine Antwort:'), opts, { stack: true, ask: tr(qu) })];
      },
      text: (p) => L(CONCEPTS[p.k][1][0], CONCEPTS[p.k][1][1]),
      hints: (p) => [L(...CONCEPT_ASK[p.k]), CONCEPT_HINTS[group]()],
      steps: (p) => [step(L('The answer', 'Die Antwort'), p$(`<span class="result">${L(CONCEPTS[p.k][2][0], CONCEPTS[p.k][2][1])}</span>`))],
      figure: () => '',
    };
  };

  // ================================================================ watching
  // Once an exercise with two (or many) sources is solved or its solution shown (and in the last
  // frame of two worked examples), the student switches on the second source (opens the second
  // slit, lights the whole grating) and watches the pattern build up (app.js, play.js; the scene
  // is Figures.watchScene): ifWatch(o), o = { kind ('slits': a double slit; 'speakers': two
  // loudspeakers; 'grating'), N (the sources; the source on (index on) shines from the start, the
  // others from t = 0), flat (true: a screen at the distance L, positions y on it, small angles;
  // false: angles of any size, the position on the screen is sin α), Y (the screen shown from −Y
  // to Y, in unit), unit ('mm', 'cm'; '' sin α; 'ds' the path difference in wavelengths), g(y)
  // (the phase between the waves of neighbouring sources at y), ticks [[y, label]], P (the point
  // P of the exercise, at y), T (s: how long the waves take to the middle of the screen, or to P;
  // null: not given), f (Hz, how often the waves oscillate), Lm (m: the distance L of the screen, if
  // given), marks(w, get) }.
  // It returns o with I(y, k) → the intensity at y of the sources that have arrived there (a
  // function k(j): source j has arrived; all of them without k), the brightest 1, and marks(get):
  // get(key) is the answer of a field (a number in its unit, NaN if none, or the option chosen,
  // null if none); each mark is { key, y (where the answer puts it, within ±Y), ok (a choice:
  // right or not; a number: null, the app judges it as in the feedback), say (html: what the
  // answer was) }.
  function ifWatch(o) {
    const w = { on: 0, ...o };
    w.I = (y, k) => {
      const g = w.g(y);
      let re = 0, im = 0;
      for (let j = 0; j < w.N; j++) if (j === w.on || !k || k(j)) { re += Math.cos(j * g); im += Math.sin(j * g); }
      return (re * re + im * im) / (w.N * w.N);
    };
    w.marks = (get) => (o.marks ? o.marks(w, get) : []).filter((m) => Number.isFinite(m.y)).map((m) => ({ ...m, y: Math.max(-w.Y, Math.min(w.Y, m.y)) }));
    return w;
  }
  const C_LIGHT = 3e8, C_SOUND = 343;
  const yourAnswer = () => L('your answer', 'deine Antwort');
  // a number answered: the ring at y
  const numMark = (key, y, say) => ({ key, y, ok: null, say });
  // ticks at the bright fringes j·y1 (j = 1 … n), the one of order k named
  const fringeTicks = (y1, k, n, name = 'y') => Array.from({ length: n }, (z, j) => j + 1).flatMap((j) => [[j * y1, j === k ? `${it$(name)}${sub$(k)}` : ''], [-j * y1, '']]);
  // a double slit or grating with the screen at L: the bright fringe of order k at k·y1 (in unit)
  function screenWatch(o) {
    const { lam, d, L: L0, k, unit } = o, f = IW.UNITS[unit][0], y1 = IW.inUnit((lam * L0) / d, unit), n = Math.max(k, 2);
    return ifWatch({ kind: o.N > 2 ? 'grating' : 'slits', N: o.N, on: o.N > 2 ? Math.floor(o.N / 2) : 0, flat: true, Y: (n + 1.4) * y1, unit,
      g: (y) => (2 * Math.PI * d * ((y * f) / L0)) / lam, ticks: fringeTicks(y1, k, n), T: L0 / C_LIGHT, f: C_LIGHT / lam, Lm: L0, marks: o.marks });
  }
  // where the order k lies with λ (or d) as answered, in unit
  const yWith = (k, lam, L0, d, unit) => IW.inUnit((k * lam * L0) / d, unit);

  // the path difference: the screen (or the line of P) in path differences; P at Δs = m·λ, a
  // ring where the fringe chosen lies (and Δs as answered)
  path.watch = (p) => ifWatch({ kind: p.sound ? 'speakers' : 'slits', N: 2, flat: true, Y: 4.3, unit: 'ds', g: (y) => 2 * Math.PI * y,
    ticks: [1, 2, 3, 4].flatMap((j) => [[j, `${j === 1 ? '' : j}${it$('λ')}`], [-j, '']]), P: p.m,
    T: p.sound ? (p.r1 + p.m * p.lam) / C_SOUND : null, f: (p.sound ? C_SOUND : C_LIGHT) / p.lam,
    marks: (w, get) => {
      const out = [], m = Number(get('ans')), ds = get('ds');
      if (p.sound && Number.isFinite(ds)) out.push(numMark('ds', (ds * 1e-2) / p.lam, `${yourAnswer()}: Δ<i>s</i> = ${IW.num(ds)} cm`));
      if (get('ans') != null && MS.includes(m)) out.push({ key: 'ans', y: m, ok: m === p.m, say: `${yourAnswer()}: ${fringeName(m, p.sound)}` });
      return out;
    } });
  dsPos.watch = (p) => screenWatch({ lam: p.lam, d: p.d, L: p.L, k: p.k, N: 2, unit: 'mm',
    marks: (w, get) => [numMark('y', get('y'), `${yourAnswer()}: <i>y</i><sub>${p.k}</sub> = ${IW.num(get('y'))} mm`)] });
  // the fringe as given; the ring where it would lie with the wavelength answered
  dsLam.watch = (p) => screenWatch({ lam: p.lam, d: p.d, L: p.L, k: p.k, N: 2, unit: 'mm',
    marks: (w, get) => { const x = get('lam'), y = yWith(p.k, x * 1e-9, p.L, p.d, 'mm'); return [numMark('lam', y, L(`with your <i>λ</i> = ${IW.num(x)} nm, the bright fringe of order ${p.k} would be at ${IW.num(y)} mm`, `mit deinem <i>λ</i> = ${IW.num(x)} nm wäre der helle Streifen der Ordnung ${p.k} bei ${IW.num(y)} mm`))]; } });
  grating.watch = (p) => screenWatch({ lam: p.lam, d: 1e-3 / p.n, L: p.L, k: p.k, N: 8, unit: 'cm',
    marks: (w, get) => {
      const x = get('d'), yd = yWith(p.k, p.lam, p.L, x * 1e-6, 'cm');
      return [numMark('d', yd, L(`with your <i>d</i> = ${IW.num(x)} μm, the maximum of order ${p.k} would be at ${IW.num(yd)} cm`, `mit deinem <i>d</i> = ${IW.num(x)} μm wäre das Maximum der Ordnung ${p.k} bei ${IW.num(yd)} cm`)),
        numMark('y', get('y'), `${yourAnswer()}: <i>y</i><sub>${p.k}</sub> = ${IW.num(get('y'))} cm`)];
    } });
  // all the orders, up to sin α = 1: the ring at sin α₁, and at the highest order chosen (at the
  // edge, sin α = 1, if that order would need a larger sine)
  gratingMax.watch = (p, v) => ifWatch({ kind: 'grating', N: 8, on: 4, flat: false, Y: 1, unit: '', g: (s) => (2 * Math.PI * s) / v.s,
    ticks: [[1, '1'], [-1, '−1'], ...Array.from({ length: Number(v.kmax) }, (z, j) => [(j + 1) * v.s, `${it$('k')} = ${j + 1}`])], T: null, f: C_LIGHT / p.lam,
    marks: (w, get) => {
      const out = [numMark('s', get('s'), `${yourAnswer()}: sin <i>α</i><sub>1</sub> = ${IW.num(get('s'))}`)], k = Number(get('kmax'));
      if (get('kmax') != null && k > 0) {
        const s = k * v.s;
        out.push({ key: 'kmax', y: Math.min(1, s), ok: String(k) === v.kmax, say: s > 1 ? L(`your highest order ${k}: it would need sin <i>α</i> = ${IW.num(sig(s))}, more than 1`, `deine höchste Ordnung ${k}: Sie bräuchte sin <i>α</i> = ${IW.num(sig(s))}, mehr als 1`) : L(`your highest order: ${k}`, `deine höchste Ordnung: ${k}`) });
      }
      return out;
    } });

  const SCENARIOS = [gap, path, dsPos, dsLam, grating, gratingMax, change, single, resChange, resScale, resFar, conceptOf('huy'), conceptOf('ds'), conceptOf('pat'), conceptOf('res')];

  root.Scenarios = { SCENARIOS, SETUPS, CONCEPTS, RES, GAP_MEDIA, ifWatch };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
