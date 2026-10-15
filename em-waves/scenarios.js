// The exercise types of the app. Each:
//   { id, difficulty, title(p), make(r) → parameters p (or null: draw again), solve(p, o) → values v
//     (SI; with a flag of traps set in o: the result of that wrong idea), traps: [flag],
//     why: { flag: () => text }, fields(p, v) → [field], text(p), hints(p, v), steps(p, v) → [{ text,
//     show: [keys] }], figure(p, v, view) }
// A field is a number { key, type: 'num', sym, unit, what, sci } (its value in the unit), or a
// choice { key, type: 'choice', what, ask (for the arcade), options: [[value, html, why, flag]],
// stack (one option below the other) }; the value of a choice comes from v[key].
// view: { task: true } the task; { show: Set } the solution (or a step of it).
//
//   spectrum         spec-order (which region has the longest wave, the highest frequency, the
//                    largest photon energy), spec-lf, spec-fl (c = λ·f and the region)
//   light in matter  medium (v, f and λ in a medium), medium-back (n from the wavelengths)
//   E and B          eb-dir (c along E × B), eb-ratio (E = c·B), eb-phase (E and B in phase)
//   concepts         concept-spec, concept-c, concept-eb (which statement is right), on the
//                    spectrum, on the speed of light, on the fields
// The numbers are chosen so that the results come out round: mental arithmetic with powers of ten.
(function (root) {
  'use strict';

  const EW = root.EW || require('./core.js');
  const Plot = root.Plot || require('./plot.js');
  const { L, C, pick, shuffle, tnum, q, tq, sig, lengthUnit, freqUnit, fieldUnit, bUnit } = EW;
  const Fg = () => root.Figures;

  // ---------------------------------------------------------------- helpers
  const step = (rule, html, show = []) => ({ text: `<p class="step-rule">${rule}</p>${html}`, show });
  const p$ = (s) => `<p>${s}</p>`;
  const res = (x) => `\\htmlClass{result}{${x}}`;
  const num$ = (key, sym, unit, what, o = {}) => ({ key, type: 'num', sym, unit, what, ...o });
  const choice = (key, what, options, o = {}) => ({ key, type: 'choice', what, options, ...o });
  const PI2 = 2 * Math.PI;
  const cT = '3.00\\cdot 10^{8}\\,\\mathrm{m/s}';
  // a given value as shown (three digits) and as used in the solution
  const g3 = (x) => sig(x, 3);
  // the frequency's unit; above 10¹⁵ Hz in Hz with a power of ten
  const fUnit = (f) => (f >= 1e15 ? 'Hz' : freqUnit(f));

  // ================================================================ 1 the spectrum
  // the regions (as in figures.js) and the sources of the exercises, with their wavelength or
  // frequency (far from the borders of their region)
  const REG = {
    gamma: { en: 'γ rays', de: 'Gammastrahlung', range: () => L('γ rays: below about 10 pm (from atomic nuclei).', 'Gammastrahlung: unter etwa 10 pm (aus Atomkernen).') },
    xray: { en: 'X-rays', de: 'Röntgenstrahlung', range: () => L('X-rays: from about 10 pm to 10 nm.', 'Röntgenstrahlung: etwa 10 pm bis 10 nm.') },
    uv: { en: 'ultraviolet', de: 'Ultraviolett', range: () => L('Ultraviolet: from about 10 nm to 380 nm.', 'Ultraviolett: etwa 10 nm bis 380 nm.') },
    vis: { en: 'visible light', de: 'sichtbares Licht', range: () => L('Visible light: from about 380 nm (violet) to 780 nm (red).', 'Sichtbares Licht: etwa 380 nm (violett) bis 780 nm (rot).') },
    ir: { en: 'infrared', de: 'Infrarot', range: () => L('Infrared: from about 780 nm to 1 mm.', 'Infrarot: etwa 780 nm bis 1 mm.') },
    micro: { en: 'microwaves', de: 'Mikrowellen', range: () => L('Microwaves: from about 1 mm to 1 m.', 'Mikrowellen: etwa 1 mm bis 1 m.') },
    radio: { en: 'radio waves', de: 'Radiowellen', range: () => L('Radio waves: longer than about 1 m.', 'Radiowellen: länger als etwa 1 m.') },
  };
  const ORDER = ['gamma', 'xray', 'uv', 'vis', 'ir', 'micro', 'radio'];
  // each source's radiation, as the subject of a sentence (in German feminine: "sie"), with
  // wavelengths whose frequencies are round (some rounded a little: 405 nm for Blu-ray, 254 nm for
  // disinfection)
  const SOURCES = [
    { reg: 'radio', en: 'the radiation of a long-wave radio transmitter', de: 'die Strahlung eines Langwellensenders', lam: [2000, 1500] },
    { reg: 'radio', en: 'the radiation of a medium-wave (AM) radio station', de: 'die Strahlung eines Mittelwellensenders (AM)', lam: [500, 300, 250, 200] },
    { reg: 'radio', en: 'the radiation of an FM radio station', de: 'die Strahlung eines UKW-Radiosenders', lam: [3] },
    { reg: 'micro', en: 'the radiation of a Wi-Fi router', de: 'die Strahlung eines WLAN-Routers', lam: [0.125, 0.06, 0.05] },
    { reg: 'micro', en: 'the radiation of the radar of a car', de: 'die Strahlung des Radars eines Autos', lam: [0.0125, 4e-3] },
    { reg: 'ir', en: 'the infrared light in an optical fibre', de: 'die Infrarotstrahlung in einer Glasfaser', lam: [1.5e-6, 1.2e-6] },
    { reg: 'ir', en: 'the heat radiation of human skin', de: 'die Wärmestrahlung der menschlichen Haut', lam: [10e-6, 12e-6] },
    { reg: 'vis', en: 'the light of a Blu-ray laser', de: 'die Strahlung eines Blu-ray-Lasers', lam: [400e-9] },
    { reg: 'vis', en: 'the light of a green traffic light', de: 'die Strahlung einer grünen Ampel', lam: [500e-9] },
    { reg: 'vis', en: 'the light of a red LED', de: 'die Strahlung einer roten LED', lam: [625e-9] },
    { reg: 'uv', en: 'the radiation of a lamp that shows up forged banknotes', de: 'die Strahlung einer Lampe, die gefälschte Banknoten erkennen lässt,', lam: [375e-9] },
    { reg: 'uv', en: 'the radiation of a lamp that disinfects water', de: 'die Strahlung einer Lampe, die Wasser entkeimt,', lam: [250e-9] },
    { reg: 'xray', en: 'the radiation of a dentist’s X-ray tube', de: 'die Strahlung der Röntgenröhre einer Zahnärztin', lam: [40e-12, 50e-12, 60e-12] },
    { reg: 'xray', en: 'the X-rays used to study crystals', de: 'die Röntgenstrahlung, mit der man Kristalle untersucht,', lam: [150e-12] },
    { reg: 'gamma', en: 'the radiation of cobalt-60 nuclei', de: 'die Strahlung von Kobalt-60-Kernen', lam: [1e-12] },
    { reg: 'gamma', en: 'the radiation in a PET scanner (from positron annihilation)', de: 'die Strahlung in einem PET-Scanner (aus der Positronenvernichtung)', lam: [2.5e-12] },
  ];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // a region's name at the start of a sentence or on a card (γ stays small: γ rays)
  const capReg = (s) => (s.startsWith('γ') ? s : cap(s));
  // four regions in a row around the right one, in the order of the spectrum
  function regionField(p, reg) {
    const i = ORDER.indexOf(reg), lo = Math.max(0, Math.min(ORDER.length - 4, i - p.off));
    const opts = ORDER.slice(lo, lo + 4).map((k) => [k, L(REG[k].en, REG[k].de), k === reg ? '' : REG[k].range(), k === reg ? null : 'region']);
    return choice('reg', L('Region of the spectrum:', 'Bereich des Spektrums:'), opts, { ask: L('Which region of the spectrum is it in?', 'In welchem Bereich des Spektrums liegt sie?') });
  }
  const regionStep = (p, v, src) => step(L('The region', 'Der Bereich'), p$(`${L(`A wavelength of $${tq(v.lam, lengthUnit(v.lam))}$ lies in the region of`, `Eine Wellenlänge von $${tq(v.lam, lengthUnit(v.lam))}$ liegt im Bereich`)} <span class="result">${L(REG[src.reg].en, REG[src.reg].de)}</span>. ${REG[src.reg].range()}`), ['mark']);
  const specMake = (r) => { const k = Math.floor(r() * SOURCES.length); return { s: k, x: pick(r, SOURCES[k].lam), off: Math.floor(r() * 4) }; };
  const WHY_INV = () => L('Turned round: from $c = \\lambda\\cdot f$, $f = c/\\lambda$ and $\\lambda = c/f$.', 'Umgekehrt: Aus $c = \\lambda\\cdot f$ folgt $f = c/\\lambda$ und $\\lambda = c/f$.');
  const NUDGE_INV = () => L('Check how you solved c = λ·f for the unknown: does your result come out in the right unit?', 'Prüfe, wie du c = λ·f nach der gesuchten Grösse aufgelöst hast: Ergibt sich die richtige Einheit?');
  const HINT_C = () => L('All electromagnetic waves travel at the speed of light in vacuum: $c = \\lambda\\cdot f$ with $c = 3.00\\cdot 10^8\\,\\mathrm{m/s}$.', 'Alle elektromagnetischen Wellen laufen im Vakuum mit Lichtgeschwindigkeit: $c = \\lambda\\cdot f$ mit $c = 3.00\\cdot 10^8\\,\\mathrm{m/s}$.');
  const HINT_REG = () => L('Visible light runs from about 380 nm to 780 nm; shorter are UV, X-rays and γ rays, longer are infrared, microwaves (1 mm to 1 m) and radio waves.', 'Sichtbares Licht reicht von etwa 380 nm bis 780 nm; kürzer sind UV, Röntgen- und Gammastrahlung, länger Infrarot, Mikrowellen (1 mm bis 1 m) und Radiowellen.');

  // Which of four regions has the longest or shortest wave, the highest or lowest frequency, the
  // largest or smallest photon energy? ORDER runs from the shortest wave to the longest; f = c/λ
  // and E = h·f run the other way.
  const BY = {
    lam: () => [L('the longest wavelength', 'die grösste Wellenlänge'), L('the shortest wavelength', 'die kleinste Wellenlänge')],
    f: () => [L('the highest frequency', 'die höchste Frequenz'), L('the lowest frequency', 'die tiefste Frequenz')],
    E: () => [L('the largest photon energy', 'die grösste Photonenenergie'), L('the smallest photon energy', 'die kleinste Photonenenergie')],
  };
  const byText = (p) => BY[p.by]()[p.hi ? 0 : 1];
  const regName = (k) => L(REG[k].en, REG[k].de);
  const ORDER_TEXT = () => L('From the shortest to the longest wavelength: γ rays, X-rays, ultraviolet, visible light, infrared, microwaves, radio waves.', 'Von der kleinsten zur grössten Wellenlänge: Gammastrahlung, Röntgenstrahlung, Ultraviolett, sichtbares Licht, Infrarot, Mikrowellen, Radiowellen.');
  const TREND = () => L('The shorter the wavelength, the higher the frequency, $f = c/\\lambda$, and the larger the energy of a photon, $E = h\\cdot f$.', 'Je kürzer die Wellenlänge, desto höher die Frequenz, $f = c/\\lambda$, und desto grösser die Energie eines Photons, $E = h\\cdot f$.');
  // the middle of a region on the log scale of the figure
  const centre = (k) => { const g = Fg().REGIONS.find((x) => x.key === k); return 10 ** ((g.lo + g.hi) / 2); };
  const specOrder = {
    id: 'spec-order', difficulty: 1,
    title: () => L('Ordering the spectrum', 'Das Spektrum ordnen'),
    make: (r) => ({ regs: shuffle(r, ORDER.slice()).slice(0, 4), by: pick(r, ['lam', 'f', 'E', 'E']), hi: r() < 0.5 }),
    solve: (p) => {
      const sorted = p.regs.slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), longest = (p.by === 'lam') === p.hi;
      // ord: the four from the end asked for to the other (for the ranking in practice)
      return { ans: longest ? sorted[3] : sorted[0], opp: longest ? sorted[0] : sorted[3], sorted, ord: longest ? sorted.slice().reverse() : sorted };
    },
    traps: [],
    fields: (p, v) => {
      const why = (k) => {
        if (k !== v.opp) return `${L('It lies between the others.', 'Sie liegt zwischen den anderen.')} ${ORDER_TEXT()}`;
        return p.by === 'lam' ? `${L('That is the other end.', 'Das ist das andere Ende.')} ${ORDER_TEXT()}`
          : L('That would be right if $f$ and $E$ grew with $\\lambda$. They go the other way: ', 'Das wäre richtig, wenn $f$ und $E$ mit $\\lambda$ wachsen würden. Sie verhalten sich umgekehrt: ') + TREND();
      };
      // the nudge after a wrong answer in practice (why, shown in the check, gives the order)
      const nudge = (k) => {
        if (k !== v.opp) return L('It lies between the others. Order the four by wavelength: which one is at the end asked for?', 'Sie liegt zwischen den anderen. Ordne die vier nach der Wellenlänge: Welche steht am gefragten Ende?');
        return p.by === 'lam' ? L('Compared with the other three, does this radiation have short or long waves?', 'Hat diese Strahlung kurze oder lange Wellen, verglichen mit den anderen drei?')
          : L('How do f and E depend on λ: do they grow with the wavelength, or fall?', 'Wie hängen f und E von λ ab: Wachsen sie mit der Wellenlänge, oder sinken sie?');
      };
      return [choice('ans', L('It is:', 'Es ist:'), p.regs.map((k) => [k, regName(k), k === v.ans ? '' : why(k), k === v.ans ? null : k === v.opp && p.by !== 'lam' ? 'order' : 'region', k === v.ans ? '' : nudge(k)]),
        { ask: L(`Which has ${byText(p)}?`, `Welche hat ${byText(p)}?`) })];
    },
    text: (p) => L(`Which of these kinds of electromagnetic radiation has ${byText(p)}?`, `Welche dieser Strahlungsarten hat ${byText(p)}?`),
    hints: () => [ORDER_TEXT(), TREND()],
    steps: (p, v) => [
      step(L('The order', 'Die Reihenfolge'), p$(L(`The four, from the shortest to the longest wavelength: ${v.sorted.map(regName).join(', ')}.`, `Die vier, von der kleinsten zur grössten Wellenlänge: ${v.sorted.map(regName).join(', ')}.`)) +
        (p.by === 'lam' ? '' : p$(TREND()))),
      step(L('The answer', 'Die Antwort'), p$(p.by === 'lam'
        ? L(`So ${byText(p)} is that of <span class="result">${regName(v.ans)}</span>, at the ${p.hi ? 'end' : 'start'} of the list.`, `Also hat <span class="result">${regName(v.ans)}</span> ${byText(p)}, am ${p.hi ? 'Ende' : 'Anfang'} der Liste.`)
        : L(`So <span class="result">${regName(v.ans)}</span> has ${byText(p)}: the ${p.hi ? 'shortest' : 'longest'} wave of the four.`, `Also hat <span class="result">${regName(v.ans)}</span> ${byText(p)}: die ${p.hi ? 'kürzeste' : 'längste'} Welle der vier.`)), ['mark']),
    ],
    figure: (p, v, view) => (view.task ? '' : Fg().spectrum(view.show.has('mark') ? centre(v.ans) : null, { trend: true })),
    // In practice the student puts all four in order by drag and drop (dnd.js), the end asked
    // for at the top; the check and the tutor keep the choice above.
    drag: {
      text: (p) => L(`Put these kinds of electromagnetic radiation in order: the one with ${byText(p)} at the top, the one with ${BY[p.by]()[p.hi ? 1 : 0]} at the bottom.`,
        `Ordne diese Strahlungsarten: oben die Strahlung, die ${byText(p)} hat, unten die, die ${BY[p.by]()[p.hi ? 1 : 0]} hat.`),
      fields: (p, v) => {
        const ends = [byText(p), BY[p.by]()[p.hi ? 1 : 0]].map(cap);
        // the feedback on an order (ranks, as read by dnd.js): a nudge while it is wrong (which
        // pair, or how f and E depend on λ), the whole explanation once it is right; bad: the
        // items to mark
        const judge = (ranks) => {
          const pos = (i) => v.ord.indexOf(p.regs[i]), idx = p.regs.map((k, i) => i);
          const shared = idx.filter((i) => ranks.filter((r) => r === ranks[i]).length > 1);
          if (shared.length) return { ok: false, bad: shared, msg: L('Some share a box: each kind of radiation has a wavelength of its own, so each gets a box of its own.', 'Einige teilen sich ein Feld: Jede Strahlungsart hat ihre eigene Wellenlänge, also bekommt jede ihr eigenes Feld.') };
          const mine = idx.slice().sort((i, j) => ranks[i] - ranks[j]);
          if (mine.every((i, r) => pos(i) === r)) return { ok: true, bad: [], msg: p.by === 'lam' ? ORDER_TEXT() : `${ORDER_TEXT()} ${TREND()}` };
          if (mine.every((i, r) => pos(i) === 3 - r)) {
            return { ok: false, bad: [], msg: p.by === 'lam'
              ? L(`Check the two ends: the top box is for the one with ${byText(p)}.`, `Prüfe die beiden Enden: Das oberste Feld ist für die Strahlung, die ${byText(p)} hat.`)
              : L('How do f and E depend on λ: do they grow with the wavelength, or fall?', 'Wie hängen f und E von λ ab: Wachsen sie mit der Wellenlänge, oder sinken sie?') };
          }
          // the first pair, from the top, that is the wrong way round
          const r = mine.findIndex((i, k) => k < 3 && pos(i) > pos(mine[k + 1])), a = mine[r], b = mine[r + 1];
          const A = regName(p.regs[a]), B = regName(p.regs[b]);
          return { ok: false, bad: [a, b], msg: p.by === 'lam'
            ? L(`${capReg(A)} and ${B} are the wrong way round: which of the two has the longer waves?`, `${capReg(A)} und ${B} sind vertauscht: Welche der beiden hat die längeren Wellen?`)
            : L(`${capReg(A)} and ${B} are the wrong way round. Which of the two has the shorter waves, and how does ${p.by === 'f' ? 'f' : 'E'} depend on λ?`,
              `${capReg(A)} und ${B} sind vertauscht. Welche der beiden hat die kürzeren Wellen, und wie hängt ${p.by === 'f' ? 'f' : 'E'} von λ ab?`) };
        };
        return [{ key: 'ord', type: 'rank', what: L('The order:', 'Die Reihenfolge:'), items: p.regs.map((k) => ({ key: k, label: capReg(regName(k)) })), ends, judge,
          answer: v.ord.map(regName).join(' → ') }];
      },
      steps: (p, v) => [
        specOrder.steps(p, v)[0],
        step(L('The answer', 'Die Antwort'), p$(L(`So, from the top (${byText(p)}) to the bottom: <span class="result">${v.ord.map(regName).join(', ')}</span>.`,
          `Also, von oben (${byText(p)}) nach unten: <span class="result">${v.ord.map(regName).join(', ')}</span>.`)), ['mark']),
      ],
    },
  };

  // from the wavelength to the frequency
  const specLf = {
    id: 'spec-lf', difficulty: 1,
    title: () => L('From wavelength to frequency', 'Von der Wellenlänge zur Frequenz'),
    make: specMake,
    solve: (p, o = {}) => { const lam = g3(p.x); return { lam, f: o.inv ? lam / C : C / lam, reg: SOURCES[p.s].reg }; },
    traps: ['inv'],
    why: { inv: WHY_INV },
    nudge: { inv: NUDGE_INV },
    fields: (p, v) => { const u = fUnit(C / v.lam); return [num$('f', 'f', u, L('frequency', 'Frequenz'), { sci: u === 'Hz' }), regionField(p, SOURCES[p.s].reg)]; },
    text: (p) => { const s = SOURCES[p.s], lam = g3(p.x); return L(`${cap(s.en)} has a wavelength of ${q(lam, lengthUnit(lam))}. What is its frequency, and in which region of the spectrum is it?`, `${cap(s.de)} hat eine Wellenlänge von ${q(lam, lengthUnit(lam))}. Wie gross ist ihre Frequenz, und in welchem Bereich des Spektrums liegt sie?`); },
    hints: () => [HINT_C(), L('The wavelength in metres: 1 nm = 10⁻⁹ m, 1 pm = 10⁻¹² m, 1 μm = 10⁻⁶ m.', 'Die Wellenlänge in Metern: 1 nm = 10⁻⁹ m, 1 pm = 10⁻¹² m, 1 μm = 10⁻⁶ m.'), HINT_REG()],
    steps: (p, v) => [
      step(L('The frequency', 'Die Frequenz'), p$(L('All electromagnetic waves travel at $c$ in vacuum, and $c = \\lambda\\cdot f$:', 'Alle elektromagnetischen Wellen laufen im Vakuum mit $c$, und $c = \\lambda\\cdot f$:')) +
        `$$f = \\frac{c}{\\lambda} = \\frac{${cT}}{${tq(v.lam, 'm')}} = ${res(tq(v.f, fUnit(v.f)))}$$`),
      regionStep(p, v, SOURCES[p.s]),
    ],
    figure: (p, v, view) => (view.task ? '' : Fg().spectrum(view.show.has('mark') ? v.lam : null)),
  };

  // from the frequency to the wavelength
  const specFl = {
    id: 'spec-fl', difficulty: 1,
    title: () => L('From frequency to wavelength', 'Von der Frequenz zur Wellenlänge'),
    make: specMake,
    solve: (p, o = {}) => { const f = g3(C / p.x); return { f, lam: o.inv ? f / C : C / f, reg: SOURCES[p.s].reg }; },
    traps: ['inv'],
    why: { inv: WHY_INV },
    nudge: { inv: NUDGE_INV },
    fields: (p, v) => [num$('lam', '\\lambda', lengthUnit(v.lam), L('wavelength', 'Wellenlänge')), regionField(p, SOURCES[p.s].reg)],
    text: (p) => {
      const s = SOURCES[p.s], f = g3(C / p.x), u = fUnit(f);
      return L(`${cap(s.en)} has a frequency of ${q(f, u)}. What is its wavelength, and in which region of the spectrum is it?`, `${cap(s.de)} hat eine Frequenz von ${q(f, u)}. Wie gross ist ihre Wellenlänge, und in welchem Bereich des Spektrums liegt sie?`);
    },
    hints: () => [HINT_C(), L('The frequency in hertz: 1 MHz = 10⁶ Hz, 1 GHz = 10⁹ Hz, 1 THz = 10¹² Hz.', 'Die Frequenz in Hertz: 1 MHz = 10⁶ Hz, 1 GHz = 10⁹ Hz, 1 THz = 10¹² Hz.'), HINT_REG()],
    steps: (p, v) => [
      step(L('The wavelength', 'Die Wellenlänge'), p$(L('All electromagnetic waves travel at $c$ in vacuum, and $c = \\lambda\\cdot f$:', 'Alle elektromagnetischen Wellen laufen im Vakuum mit $c$, und $c = \\lambda\\cdot f$:')) +
        `$$\\lambda = \\frac{c}{f} = \\frac{${cT}}{${tq(v.f, 'Hz')}} = ${res(tq(v.lam, lengthUnit(v.lam)))}$$`),
      regionStep(p, v, SOURCES[p.s]),
    ],
    figure: (p, v, view) => (view.task ? '' : Fg().spectrum(view.show.has('mark') ? v.lam : null)),
  };

  // ================================================================ 2 light in matter
  // refractive indices and wavelengths that divide well (water 1.33 ≈ 4/3, diamond 2.42 ≈ 2.4)
  const MATS = [['water', 'Wasser', 1.33], ['glass', 'Glas', 1.5], ['flint glass', 'Flintglas', 1.6], ['diamond', 'Diamant', 2.4]];
  const LAMS = [400, 480, 600].map((x) => x * 1e-9);
  const WHY_MULT = () => L('In a medium, light is slower: $v = c/n$ and $\\lambda = \\lambda_0/n$, both smaller than in vacuum.', 'In einem Medium ist Licht langsamer: $v = c/n$ und $\\lambda = \\lambda_0/n$, beide kleiner als im Vakuum.');
  const medium = {
    id: 'medium', difficulty: 2,
    title: () => L('Light in a medium', 'Licht in einem Medium'),
    make: (r) => ({ m: Math.floor(r() * MATS.length), lam0: pick(r, LAMS) }),
    solve: (p, o = {}) => {
      const n = MATS[p.m][2], v = o.mult ? C * n : C / n;
      return { v, f: o.same ? v / p.lam0 : C / p.lam0, lam: o.mult ? p.lam0 * n : o.same ? p.lam0 : p.lam0 / n };
    },
    traps: ['mult', 'same'],
    nudge: {
      mult: () => L('Is light faster or slower in the medium than in vacuum? Does your result fit that?', 'Ist Licht im Medium schneller oder langsamer als im Vakuum? Passt dein Resultat dazu?'),
      same: () => L('How many crests per second arrive at the border, and how many travel on behind it?', 'Wie viele Wellenberge pro Sekunde kommen an der Grenze an, und wie viele laufen dahinter weiter?'),
    },
    why: { mult: WHY_MULT, same: () => L('The frequency stays the same at the border: the wave oscillates in time with the wave arriving. It is the wavelength that changes.', 'Die Frequenz bleibt an der Grenze gleich: Die Welle schwingt im Takt der ankommenden Welle. Es ist die Wellenlänge, die sich ändert.') },
    fields: () => [num$('v', 'v', 'm/s', L('speed', 'Geschwindigkeit'), { sci: true }), num$('f', 'f', 'THz', L('frequency', 'Frequenz')), num$('lam', '\\lambda', 'nm', L('wavelength', 'Wellenlänge'))],
    text: (p) => { const m = MATS[p.m]; return L(`Light with a wavelength of ${q(p.lam0, 'nm')} in vacuum enters ${m[0]} (refractive index ${m[2]}). What are its speed, its frequency and its wavelength in the ${m[0]}?`, `Licht mit einer Wellenlänge von ${q(p.lam0, 'nm')} im Vakuum tritt in ${m[1]} ein (Brechzahl ${m[2]}). Wie gross sind seine Geschwindigkeit, seine Frequenz und seine Wellenlänge im ${m[1]}?`); },
    hints: () => [
      L('The refractive index says how many times slower light is in the medium: $v = c/n$.', 'Die Brechzahl sagt, wievielmal langsamer das Licht im Medium ist: $v = c/n$.'),
      L('At the border the frequency stays the same: each crest arriving makes one crest inside.', 'An der Grenze bleibt die Frequenz gleich: Jeder ankommende Wellenberg erzeugt einen Wellenberg im Innern.'),
      L('Then $\\lambda = v/f$.', 'Dann ist $\\lambda = v/f$.'),
    ],
    steps: (p, v) => { const n = MATS[p.m][2]; return [
      step(L('The speed', 'Die Geschwindigkeit'), `$$v = \\frac{c}{n} = \\frac{${cT}}{${n}} = ${res(tq(v.v, 'm/s'))}$$`),
      step(L('The frequency', 'Die Frequenz'), p$(L('It is the same as in vacuum:', 'Sie ist dieselbe wie im Vakuum:')) + `$$f = \\frac{c}{\\lambda_0} = \\frac{${cT}}{${tq(p.lam0, 'm')}} = ${res(tq(v.f, 'THz'))}$$`),
      step(L('The wavelength', 'Die Wellenlänge'), p$(L('Slower at the same frequency: shorter waves.', 'Langsamer bei derselben Frequenz: kürzere Wellen.')) + `$$\\lambda = \\frac{v}{f} = \\frac{\\lambda_0}{n} = \\frac{${tq(p.lam0, 'nm')}}{${n}} = ${res(tq(v.lam, 'nm'))}$$`),
    ]; },
    figure: (p) => Fg().medium(MATS[p.m][2]),
  };

  // the refractive index from the wavelength measured inside
  const mediumBack = {
    id: 'medium-back', difficulty: 3,
    title: () => L('How much slower?', 'Wieviel langsamer?'),
    make: (r) => ({ m: Math.floor(r() * MATS.length), lam0: pick(r, LAMS) }),
    solve: (p, o = {}) => { const lam = g3(p.lam0 / MATS[p.m][2]), n = o.ninv ? lam / p.lam0 : p.lam0 / lam; return { lam, n, v: C / n }; },
    traps: ['ninv'],
    nudge: { ninv: () => L('Can a refractive index be smaller than 1? Does the medium make the waves shorter or longer?', 'Kann eine Brechzahl kleiner als 1 sein? Macht das Medium die Wellen kürzer oder länger?') },
    why: { ninv: () => L('Upside down: the medium shortens the waves, $\\lambda = \\lambda_0/n$, so $n = \\lambda_0/\\lambda$ is larger than 1.', 'Kehrwert verwechselt: Das Medium verkürzt die Wellen, $\\lambda = \\lambda_0/n$, also ist $n = \\lambda_0/\\lambda$ grösser als 1.') },
    fields: () => [num$('n', 'n', '', L('refractive index', 'Brechzahl')), num$('v', 'v', 'm/s', L('speed of light in it', 'Lichtgeschwindigkeit darin'), { sci: true })],
    text: (p) => { const lam = g3(p.lam0 / MATS[p.m][2]); return L(`Laser light with a wavelength of ${q(p.lam0, 'nm')} in vacuum has a wavelength of only ${q(lam, 'nm')} in a transparent material. What is the refractive index of the material, and how fast is light in it?`, `Laserlicht mit einer Wellenlänge von ${q(p.lam0, 'nm')} im Vakuum hat in einem durchsichtigen Material eine Wellenlänge von nur ${q(lam, 'nm')}. Wie gross ist die Brechzahl des Materials, und wie schnell ist das Licht darin?`); },
    hints: () => [L('The frequency is the same inside and outside; so $\\lambda$ shrinks by the same factor as the speed.', 'Die Frequenz ist innen und aussen gleich; also schrumpft $\\lambda$ um denselben Faktor wie die Geschwindigkeit.'), L('$\\lambda = \\lambda_0/n$ and $v = c/n$.', '$\\lambda = \\lambda_0/n$ und $v = c/n$.')],
    steps: (p, v) => [
      step(L('The refractive index', 'Die Brechzahl'), p$(L('At the same frequency, $\\lambda = v/f$ shrinks as much as the speed: $\\lambda = \\lambda_0/n$.', 'Bei gleicher Frequenz schrumpft $\\lambda = v/f$ gleich stark wie die Geschwindigkeit: $\\lambda = \\lambda_0/n$.')) + `$$n = \\frac{\\lambda_0}{\\lambda} = \\frac{${tq(p.lam0, 'nm')}}{${tq(v.lam, 'nm')}} = ${res(tnum(v.n))}$$` + p$(L(`That fits ${MATS[p.m][0]} (n = ${MATS[p.m][2]}).`, `Das passt zu ${MATS[p.m][1]} (n = ${MATS[p.m][2]}).`))),
      step(L('The speed', 'Die Geschwindigkeit'), `$$v = \\frac{c}{n} = \\frac{${cT}}{${tnum(v.n)}} = ${res(tq(v.v, 'm/s'))}$$`),
    ],
    figure: (p) => Fg().medium(MATS[p.m][2]),
  };

  // ================================================================ 3 E and B
  const DIRS = { xp: [1, 0, 0], xm: [-1, 0, 0], yp: [0, 1, 0], ym: [0, -1, 0], zp: [0, 0, 1], zm: [0, 0, -1] };
  const keyOf = (d) => Object.keys(DIRS).find((k) => DIRS[k].every((x, i) => x === d[i]));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]].map((x) => x + 0);
  const dirName = (k) => ({ xp: L('to the right', 'nach rechts'), xm: L('to the left', 'nach links'), yp: L('up', 'nach oben'), ym: L('down', 'nach unten'), zp: L('out of the page', 'aus der Seite heraus'), zm: L('into the page', 'in die Seite hinein') })[k];
  const dirTile = (k) => `${{ xp: '→', xm: '←', yp: '↑', ym: '↓', zp: '⊙', zm: '⊗' }[k]} ${dirName(k)}`;
  const QN = { E: () => L('the electric field', 'das elektrische Feld'), B: () => L('the magnetic field', 'das Magnetfeld'), c: () => L('the direction of propagation', 'die Ausbreitungsrichtung') };
  const ASK = (k) => (k === 'c' ? L('Which way does the wave travel?', 'In welche Richtung läuft die Welle?') : L(`Which way does ${QN[k]()} point?`, `In welche Richtung zeigt ${QN[k]()}?`));
  const HAND = () => L('Right hand: thumb along $\\vec E$, index finger along $\\vec B$; the middle finger shows the direction of propagation $\\vec c$. (The same hand as for the force on a moving charge.)', 'Rechte Hand: Daumen längs $\\vec E$, Zeigefinger längs $\\vec B$; der Mittelfinger zeigt die Ausbreitungsrichtung $\\vec c$. (Dieselbe Hand wie für die Kraft auf eine bewegte Ladung.)');
  const ebDir = {
    id: 'eb-dir', difficulty: 2,
    title: () => L('Which way?', 'In welche Richtung?'),
    make: (r) => {
      const ks = Object.keys(DIRS), E = pick(r, ks), others = ks.filter((k) => DIRS[k].every((x, i) => x * DIRS[E][i] === 0)), B = pick(r, others);
      return { E, B, miss: pick(r, ['c', 'c', 'B', 'E']) };
    },
    solve: (p) => { const c = keyOf(cross(DIRS[p.E], DIRS[p.B])); return { E: p.E, B: p.B, c, ans: { E: p.E, B: p.B, c }[p.miss] }; },
    traps: [],
    fields: (p, v) => {
      const right = v.ans, given = ['E', 'B', 'c'].filter((k) => k !== p.miss).map((k) => v[k]);
      const opp = keyOf(DIRS[right].map((x) => -x));
      const why = (k) => (k === opp ? L('The other way round: the wave would then run backwards. $\\vec c$ points along $\\vec E\\times\\vec B$; check with the right hand.', 'Umgekehrt: Die Welle liefe dann rückwärts. $\\vec c$ zeigt längs $\\vec E\\times\\vec B$; prüfe mit der rechten Hand.')
        : L('In an electromagnetic wave, $\\vec E$, $\\vec B$ and $\\vec c$ are perpendicular to each other: none can point along another.', 'In einer elektromagnetischen Welle stehen $\\vec E$, $\\vec B$ und $\\vec c$ senkrecht aufeinander: Keines kann längs eines anderen zeigen.'));
      const nudgeOpp = () => L('Check again with the right hand: thumb along E, index finger along B, middle finger along c. Does your answer fit?', 'Prüfe nochmals mit der rechten Hand: Daumen längs E, Zeigefinger längs B, Mittelfinger längs c. Passt deine Antwort?');
      const keys = Object.keys(DIRS).filter((k) => k === right || k === opp || given.includes(k));
      return [choice('ans', p.miss === 'c' ? L('The wave travels:', 'Die Welle läuft:') : `${cap(QN[p.miss]())} ${L('points', 'zeigt')}:`, keys.map((k) => [k, dirTile(k), k === right ? '' : why(k), k === right ? null : k === opp ? 'hand' : 'perp', k === opp ? nudgeOpp() : '']), { ask: ASK(p.miss) })];
    },
    text: (p) => {
      const v = ebDir.solve(p), [a, b] = ['E', 'B', 'c'].filter((k) => k !== p.miss);
      const says = (k) => (k === 'c' ? L(`the wave travels ${dirName(v.c)}`, `die Welle läuft ${dirName(v.c)}`) : L(`${QN[k]()} points ${dirName(v[k])}`, `${QN[k]()} zeigt ${dirName(v[k])}`));
      return L(`At one point of an electromagnetic wave, ${says(a)}, and ${says(b)}. ${ASK(p.miss)}`, `An einem Punkt einer elektromagnetischen Welle gilt: ${cap(says(a))}, und ${says(b)}. ${ASK(p.miss)}`);
    },
    hints: () => [L('$\\vec E$, $\\vec B$ and $\\vec c$ are perpendicular to each other.', '$\\vec E$, $\\vec B$ und $\\vec c$ stehen senkrecht aufeinander.'), HAND()],
    steps: (p, v) => [step(L('The right hand', 'Die rechte Hand'), p$(`${L('The wave runs in the direction of $\\vec E\\times\\vec B$.', 'Die Welle läuft in Richtung von $\\vec E\\times\\vec B$.')} ${HAND()}`) +
      p$(L(`Here: $\\vec E$ ${dirName(v.E)}, $\\vec B$ ${dirName(v.B)}, $\\vec c$ ${dirName(v.c)}. So ${p.miss === 'c' ? 'the wave travels' : `${QN[p.miss]()} points`} <span class="result">${dirName(v.ans)}</span>.`, `Hier: $\\vec E$ ${dirName(v.E)}, $\\vec B$ ${dirName(v.B)}, $\\vec c$ ${dirName(v.c)}. Also ${p.miss === 'c' ? 'läuft die Welle' : `zeigt ${QN[p.miss]()}`} <span class="result">${dirName(v.ans)}</span>.`)))],
    figure: (p, v, view) => {
      const d = (k) => DIRS[v[k]];
      return Fg().dirs(view.task ? { E: p.miss === 'E' ? null : d('E'), B: p.miss === 'B' ? null : d('B'), c: p.miss === 'c' ? null : d('c') } : { E: d('E'), B: d('B'), c: d('c') });
    },
  };

  // E = c·B
  const EVALS = [0.3, 0.6, 1.5, 3, 6, 15, 30, 60, 150, 300, 600, 900, 1500];
  const ebRatio = {
    id: 'eb-ratio', difficulty: 2,
    title: () => L('Electric and magnetic field', 'Elektrisches und magnetisches Feld'),
    make: (r) => ({ give: r() < 0.6 ? 'E' : 'B', E: pick(r, EVALS) }),
    solve: (p, o = {}) => {
      if (p.give === 'E') return { B: o.einv ? p.E * C : p.E / C };
      const B = g3(p.E / C);
      return { E: o.einv ? B / C : B * C };
    },
    traps: ['einv'],
    nudge: { einv: () => L('Check the units: does your calculation with c really give the unit wanted (1 T = 1 V·s/m²)?', 'Prüfe die Einheiten: Ergibt deine Rechnung mit c wirklich die gesuchte Einheit (1 T = 1 V·s/m²)?') },
    why: { einv: () => L('Turned round: $E = c\\cdot B$, so the magnetic field in tesla is a tiny number, the electric field in V/m a large one.', 'Umgekehrt: $E = c\\cdot B$; das Magnetfeld in Tesla ist also eine winzige Zahl, das elektrische Feld in V/m eine grosse.') },
    fields: (p) => (p.give === 'E' ? [num$('B', '\\hat B', bUnit(p.E / C), L('amplitude of the magnetic field', 'Amplitude des Magnetfelds'))] : [num$('E', '\\hat E', fieldUnit(g3(p.E / C) * C), L('amplitude of the electric field', 'Amplitude des elektrischen Felds'))]),
    text: (p) => (p.give === 'E'
      ? L(`The electric field of an electromagnetic wave oscillates with an amplitude of ${q(p.E, fieldUnit(p.E))}. What is the amplitude of its magnetic field?`, `Das elektrische Feld einer elektromagnetischen Welle schwingt mit einer Amplitude von ${q(p.E, fieldUnit(p.E))}. Wie gross ist die Amplitude ihres Magnetfelds?`)
      : L(`The magnetic field of an electromagnetic wave oscillates with an amplitude of ${q(g3(p.E / C), bUnit(p.E / C))}. What is the amplitude of its electric field?`, `Das Magnetfeld einer elektromagnetischen Welle schwingt mit einer Amplitude von ${q(g3(p.E / C), bUnit(p.E / C))}. Wie gross ist die Amplitude ihres elektrischen Felds?`)),
    hints: () => [L('In an electromagnetic wave, $E = c\\cdot B$ at every place and every moment.', 'In einer elektromagnetischen Welle gilt $E = c\\cdot B$ an jedem Ort und zu jedem Zeitpunkt.'), L('1 T = 1 V·s/m²: V/m divided by m/s gives tesla.', '1 T = 1 V·s/m²: V/m geteilt durch m/s ergibt Tesla.')],
    steps: (p, v) => [step(L('E = c·B', 'E = c·B'), p$(L('The fields oscillate together, in phase; their sizes are linked by $E = c\\cdot B$:', 'Die Felder schwingen gemeinsam, in Phase; ihre Grössen hängen über $E = c\\cdot B$ zusammen:')) +
      (p.give === 'E' ? `$$\\hat B = \\frac{\\hat E}{c} = \\frac{${tq(p.E, 'V/m')}}{${cT}} = ${res(tq(v.B, bUnit(v.B)))}$$` : `$$\\hat E = c\\cdot\\hat B = ${cT}\\cdot ${tq(g3(p.E / C), 'T')} = ${res(tq(v.E, fieldUnit(v.E)))}$$`) +
      p$(L('Compared with the Earth’s field (about 50 μT), the magnetic field of a wave is weak: most detectors, and the antennas of radios, respond to its electric field.', 'Verglichen mit dem Erdfeld (etwa 50 μT) ist das Magnetfeld einer Welle schwach: Die meisten Detektoren und die Antennen von Radios sprechen auf ihr elektrisches Feld an.')))],
    figure: (p, v, view) => (view.task ? '' : Fg().wave3d()),
  };

  // E and B in phase: where on a snapshot of E(x) is B zero, or largest?
  const XS = { top: [0.25, 1.25], bottom: [0.75, 1.75], zero: [0.5, 1, 1.5], mid: [0.125, 0.375, 0.625, 0.875, 1.125, 1.375, 1.625, 1.875] };
  const ebPhase = {
    id: 'eb-phase', difficulty: 3,
    title: () => L('In phase', 'In Phase'),
    make: (r) => {
      const ask = pick(r, ['zero', 'max', 'max']);
      const right = ask === 'zero' ? pick(r, XS.zero) : pick(r, [...XS.top, ...XS.bottom]);
      const pool = ask === 'zero' ? [...XS.top, ...XS.bottom, ...XS.mid] : [...XS.zero, ...XS.mid];
      const others = shuffle(r, pool.slice()).filter((x) => Math.abs(x - right) > 0.2);
      const xs = [right];
      for (const x of others) if (xs.length < 4 && xs.every((y) => Math.abs(y - x) > 0.2)) xs.push(x);
      // at most one crest or trough when the largest is asked, and at least one of them when zero is
      if (xs.length < 4 || (ask === 'zero' && !xs.some((x) => XS.top.includes(x) || XS.bottom.includes(x)))) return null;
      return { ask, xs: xs.sort((a, b) => a - b), right };
    },
    solve: (p) => ({ pt: 'PQRS'[p.xs.indexOf(p.right)] }),
    traps: [],
    fields: (p, v) => [choice('pt', p.ask === 'zero' ? L('B is zero at:', 'B ist null bei:') : L('B is largest at:', 'B ist am grössten bei:'), p.xs.map((x, i) => {
      const n = 'PQRS'[i], peak = XS.top.includes(x) || XS.bottom.includes(x), zero = XS.zero.includes(x);
      if (n === v.pt) return [n, n, '', null];
      if ((p.ask === 'zero' && peak) || (p.ask === 'max' && zero)) return [n, n, L('As if B lagged a quarter of a wave behind E (like the current behind the voltage in an LC circuit). In a travelling wave, E and B are in phase: B is zero where E is, and largest where E is.', 'Als hinkte B eine Viertelwelle hinter E her (wie der Strom hinter der Spannung im Schwingkreis). In einer fortschreitenden Welle sind E und B in Phase: B ist null, wo E null ist, und am grössten, wo E am grössten ist.'), 'phase',
        L('As if B lagged a quarter of a wave behind E, as in an LC circuit. Is that so in a travelling wave too? Think of E = c·B.', 'Als hinkte B eine Viertelwelle hinter E her, wie im Schwingkreis. Ist das auch in einer fortschreitenden Welle so? Denk an E = c·B.')];
      return [n, n, L('Here E is neither zero nor largest; B, in phase with E, is neither.', 'Hier ist E weder null noch am grössten; B, in Phase mit E, also auch nicht.'), 'phaseother',
        L('Here E is neither zero nor largest. How is B at the same place related to E?', 'Hier ist E weder null noch am grössten. Wie hängt B an derselben Stelle mit E zusammen?')];
    }), { ask: p.ask === 'zero' ? L('Where is the magnetic field zero?', 'Wo ist das Magnetfeld null?') : L('Where is the magnetic field largest?', 'Wo ist das Magnetfeld am grössten?') })],
    text: (p) => (p.ask === 'zero'
      ? L('The graph shows the electric field of an electromagnetic wave along its direction of propagation, at one moment. At which of the points P, Q, R, S is its magnetic field zero?', 'Das Diagramm zeigt das elektrische Feld einer elektromagnetischen Welle längs ihrer Ausbreitungsrichtung, zu einem Zeitpunkt. An welchem der Punkte P, Q, R, S ist ihr Magnetfeld null?')
      : L('The graph shows the electric field of an electromagnetic wave along its direction of propagation, at one moment. At which of the points P, Q, R, S is its magnetic field largest (in size)?', 'Das Diagramm zeigt das elektrische Feld einer elektromagnetischen Welle längs ihrer Ausbreitungsrichtung, zu einem Zeitpunkt. An welchem der Punkte P, Q, R, S ist ihr Magnetfeld (dem Betrag nach) am grössten?')),
    hints: () => [L('$E = c\\cdot B$ holds at every place and every moment.', '$E = c\\cdot B$ gilt an jedem Ort und zu jedem Zeitpunkt.'), L('So E and B are zero at the same places, and largest at the same places.', 'Also sind E und B an denselben Orten null und an denselben Orten am grössten.')],
    steps: (p, v) => [step(L('In phase', 'In Phase'), p$(L(`In a travelling electromagnetic wave, $E = c\\cdot B$ everywhere: the fields are in phase. The magnetic field (dashed) is ${p.ask === 'zero' ? 'zero where the electric field is zero' : 'largest where the electric field is largest'}: at <span class="result">${v.pt}</span>.`, `In einer fortschreitenden elektromagnetischen Welle gilt überall $E = c\\cdot B$: Die Felder sind in Phase. Das Magnetfeld (gestrichelt) ist ${p.ask === 'zero' ? 'null, wo das elektrische Feld null ist' : 'am grössten, wo das elektrische Feld am grössten ist'}: bei <span class="result">${v.pt}</span>.`)))],
    figure: (p, v, view) => {
      const n = 240, pts = [], pb = [];
      for (let k = 0; k <= n; k++) { const x = (2 * k) / n; pts.push([x, Math.sin(PI2 * x)]); pb.push([x, 0.8 * Math.sin(PI2 * x)]); }
      const curves = view.task ? [{ pts }] : [{ pts }, { pts: pb, cls: 'bcurve' }];
      return `<div class="fig">${Plot.graph(curves, { tEnd: 2, name: view.task ? 'E' : 'E, B', axis: { lo: -1.5, hi: 1.5, step: 0.5 }, bare: true, tLabel: '<tspan class="it">x</tspan>', points: p.xs.map((x, i) => [x, Math.sin(PI2 * x), 'PQRS'[i], Math.sin(PI2 * x) < -0.1]), label: L('The electric field along the direction of propagation at one moment, with four points P, Q, R, S', 'Das elektrische Feld längs der Ausbreitungsrichtung zu einem Zeitpunkt, mit vier Punkten P, Q, R, S') })}</div>`;
    },
  };

  // ================================================================ 4 concepts
  // [group, question, right, [wrong, why, flag, nudge] × 3], each text as [en, de] (nudge, where
  // why would give the answer away, is shown instead after a wrong answer in practice); the groups: spec (the
  // order of the spectrum), c (the speed of light, in vacuum and in matter), eb (the fields)
  const CONCEPTS = [
    ['spec', ['Ultraviolet light gives you sunburn; the infrared of a heater does not, even when it is strong. Why?', 'Ultraviolettes Licht gibt einen Sonnenbrand, das Infrarot eines Heizstrahlers nicht, auch wenn es stark ist. Warum?'],
      ['A UV photon carries more energy than an infrared one: its frequency is higher.', 'Ein UV-Photon trägt mehr Energie als ein Infrarot-Photon: Seine Frequenz ist höher.'],
      [[['UV travels faster than infrared.', 'UV ist schneller als Infrarot.'], ['All electromagnetic waves travel at c in vacuum.', 'Alle elektromagnetischen Wellen laufen im Vakuum mit c.'], 'speed'],
        [['UV has the longer wavelength, so it reaches deeper into the skin.', 'UV hat die grössere Wellenlänge, also dringt es tiefer in die Haut ein.'], ['UV has the shorter wavelength: it lies on the other side of visible light from infrared.', 'UV hat die kleinere Wellenlänge: Es liegt auf der anderen Seite des sichtbaren Lichts als Infrarot.'], 'order', ['Where do UV and infrared lie in the spectrum: on which side of visible light?', 'Wo liegen UV und Infrarot im Spektrum: auf welcher Seite des sichtbaren Lichts?']],
        [['Infrared is not an electromagnetic wave, only heat.', 'Infrarot ist keine elektromagnetische Welle, nur Wärme.'], ['Infrared is electromagnetic radiation too, between visible light and microwaves.', 'Infrarot ist auch elektromagnetische Strahlung, zwischen sichtbarem Licht und Mikrowellen.'], 'region']]],
    ['spec', ['How do X-rays differ from radio waves?', 'Wie unterscheidet sich Röntgenstrahlung von Radiowellen?'],
      ['Shorter wavelength, higher frequency, larger photon energy; in vacuum both travel at c.', 'Kleinere Wellenlänge, höhere Frequenz, grössere Photonenenergie; im Vakuum laufen beide mit c.'],
      [[['Longer wavelength, higher frequency, larger photon energy.', 'Grössere Wellenlänge, höhere Frequenz, grössere Photonenenergie.'], ['With c = λ·f the same for both, a higher frequency means a shorter wavelength.', 'Da c = λ·f für beide gleich ist, bedeutet eine höhere Frequenz eine kleinere Wellenlänge.'], 'order', ['Do wavelength and frequency fit together in this statement, with c = λ·f the same for both?', 'Passen Wellenlänge und Frequenz in dieser Aussage zusammen, wenn c = λ·f für beide gleich ist?']],
        [['Shorter wavelength, lower frequency, larger photon energy.', 'Kleinere Wellenlänge, tiefere Frequenz, grössere Photonenenergie.'], ['A shorter wavelength at the same speed c means a higher frequency, f = c/λ.', 'Eine kleinere Wellenlänge bei derselben Geschwindigkeit c bedeutet eine höhere Frequenz, f = c/λ.'], 'order', ['Check the frequency: what does f = c/λ give for a shorter wavelength?', 'Prüfe die Frequenz: Was ergibt f = c/λ für eine kleinere Wellenlänge?']],
        [['Shorter wavelength and a higher speed.', 'Kleinere Wellenlänge und eine höhere Geschwindigkeit.'], ['In vacuum, all electromagnetic waves travel at the same speed c.', 'Im Vakuum laufen alle elektromagnetischen Wellen gleich schnell, mit c.'], 'speed', ['Does the speed in vacuum depend on the kind of electromagnetic radiation?', 'Hängt die Geschwindigkeit im Vakuum von der Art der elektromagnetischen Strahlung ab?']]]],
    ['spec', ['Which list is in the order of growing photon energy?', 'Welche Liste ist nach wachsender Photonenenergie geordnet?'],
      ['radio waves, infrared, visible light, X-rays', 'Radiowellen, Infrarot, sichtbares Licht, Röntgenstrahlung'],
      [[['X-rays, visible light, infrared, radio waves', 'Röntgenstrahlung, sichtbares Licht, Infrarot, Radiowellen'], ['That is the order of growing wavelength; the photon energy E = h·f falls as λ grows.', 'Das ist die Reihenfolge wachsender Wellenlänge; die Photonenenergie E = h·f sinkt, wenn λ wächst.'], 'order', ['By which quantity is this list ordered? How does the photon energy E = h·f depend on the wavelength?', 'Nach welcher Grösse ist diese Liste geordnet? Wie hängt die Photonenenergie E = h·f von der Wellenlänge ab?']],
        [['infrared, radio waves, visible light, X-rays', 'Infrarot, Radiowellen, sichtbares Licht, Röntgenstrahlung'], ['Radio waves have longer waves than infrared, so less energy per photon.', 'Radiowellen haben längere Wellen als Infrarot, also weniger Energie pro Photon.'], 'region', ['Compare the first two: which has the longer waves, and what does that mean for the photon energy?', 'Vergleiche die ersten beiden: Welche hat die längeren Wellen, und was bedeutet das für die Photonenenergie?']],
        [['radio waves, visible light, infrared, X-rays', 'Radiowellen, sichtbares Licht, Infrarot, Röntgenstrahlung'], ['Infrared lies between radio waves (microwaves) and visible light.', 'Infrarot liegt zwischen den Radiowellen (Mikrowellen) und dem sichtbaren Licht.'], 'region', ['Where does infrared lie in the spectrum, compared with visible light?', 'Wo liegt Infrarot im Spektrum, verglichen mit dem sichtbaren Licht?']]]],
    ['spec', ['Which has the higher frequency, blue or red light?', 'Was hat die höhere Frequenz, blaues oder rotes Licht?'],
      ['Blue light: its wavelength is shorter.', 'Blaues Licht: Seine Wellenlänge ist kleiner.'],
      [[['Red light: its wavelength is longer.', 'Rotes Licht: Seine Wellenlänge ist grösser.'], ['f = c/λ: the longer the wave, the lower the frequency.', 'f = c/λ: Je länger die Welle, desto tiefer die Frequenz.'], 'order', ['The wavelength is right. What does f = c/λ give for the longer wave?', 'Die Wellenlänge stimmt. Was ergibt f = c/λ für die längere Welle?']],
        [['Neither: all light travels at c, so it has the same frequency.', 'Keines: Alles Licht läuft mit c, also hat es dieselbe Frequenz.'], ['The same speed, but different wavelengths: so different frequencies, f = c/λ.', 'Dieselbe Geschwindigkeit, aber verschiedene Wellenlängen: also verschiedene Frequenzen, f = c/λ.'], 'clf'],
        [['Red light: it is closer to infrared, which carries heat.', 'Rotes Licht: Es liegt näher beim Infrarot, das Wärme trägt.'], ['Red borders on infrared, the side of long waves and low frequencies.', 'Rot grenzt an Infrarot, die Seite der langen Wellen und tiefen Frequenzen.'], 'order', ['Is infrared on the side of the long or the short waves? And what does that mean for the frequency?', 'Liegt Infrarot auf der Seite der langen oder der kurzen Wellen? Und was heisst das für die Frequenz?']]]],
    ['c', ['Do electromagnetic waves need a medium to travel through?', 'Brauchen elektromagnetische Wellen ein Medium, um sich auszubreiten?'],
      ['No: they travel through empty space too, as sunlight does.', 'Nein: Sie breiten sich auch im leeren Raum aus, wie das Sonnenlicht.'],
      [[['Yes, air.', 'Ja, Luft.'], ['Sunlight crosses the empty space between the Sun and the Earth.', 'Das Sonnenlicht durchquert den leeren Raum zwischen Sonne und Erde.'], 'vacuum', ['How does sunlight reach the Earth? What lies in between?', 'Wie gelangt das Sonnenlicht zur Erde? Was liegt dazwischen?']],
        [['Yes, a special substance, the ether.', 'Ja, einen besonderen Stoff, den Äther.'], ['The ether was searched for in the 19th century, and never found: the fields themselves are the wave.', 'Der Äther wurde im 19. Jahrhundert gesucht und nie gefunden: Die Felder selbst sind die Welle.'], 'vacuum', ['Was this ether ever detected? Think about what actually oscillates in an electromagnetic wave.', 'Wurde dieser Äther je nachgewiesen? Überlege, was in einer elektromagnetischen Welle eigentlich schwingt.']],
        [['Only the long waves (radio); light does not.', 'Nur die langen Wellen (Radio); Licht nicht.'], ['Radio signals from space probes reach us through empty space too.', 'Auch Funksignale von Raumsonden erreichen uns durch den leeren Raum.'], 'vacuum']]],
    ['c', ['How fast do radio waves travel in vacuum, compared with light?', 'Wie schnell breiten sich Radiowellen im Vakuum aus, verglichen mit Licht?'],
      ['Just as fast: all electromagnetic waves travel at c in vacuum.', 'Gleich schnell: Alle elektromagnetischen Wellen laufen im Vakuum mit c.'],
      [[['Slower, because their frequency is lower.', 'Langsamer, weil ihre Frequenz kleiner ist.'], ['A lower frequency means a longer wavelength, not a lower speed: c = λ·f.', 'Eine kleinere Frequenz bedeutet eine grössere Wellenlänge, nicht eine kleinere Geschwindigkeit: c = λ·f.'], 'speed', ['If the frequency is lower, what changes in c = λ·f: the speed, or something else?', 'Wenn die Frequenz kleiner ist, was ändert sich dann in c = λ·f: die Geschwindigkeit oder etwas anderes?']],
        [['Faster, because their wavelength is longer.', 'Schneller, weil ihre Wellenlänge grösser ist.'], ['The wavelength is longer, the frequency lower in proportion: c = λ·f stays the same.', 'Die Wellenlänge ist grösser, die Frequenz im selben Mass kleiner: c = λ·f bleibt gleich.'], 'speed', ['A longer wavelength goes with a lower frequency. What does that mean for the product λ·f?', 'Eine grössere Wellenlänge gehört zu einer kleineren Frequenz. Was bedeutet das für das Produkt λ·f?']],
        [['At the speed of sound, as they carry sound.', 'Mit Schallgeschwindigkeit, weil sie Schall übertragen.'], ['The radio wave only carries the signal; it is an electromagnetic wave and travels at c.', 'Die Radiowelle trägt nur das Signal; sie ist eine elektromagnetische Welle und läuft mit c.'], 'speed', ['Is the radio wave itself a sound wave, or does it only carry the sound as a signal?', 'Ist die Radiowelle selbst eine Schallwelle, oder trägt sie den Schall nur als Signal?']]]],
    ['c', ['Light goes from air into water. What happens to its frequency and wavelength?', 'Licht geht von Luft in Wasser. Was passiert mit seiner Frequenz und seiner Wellenlänge?'],
      ['The frequency stays, the wavelength gets shorter.', 'Die Frequenz bleibt, die Wellenlänge wird kürzer.'],
      [[['The wavelength stays, the frequency gets lower.', 'Die Wellenlänge bleibt, die Frequenz wird kleiner.'], ['At the border, each crest arriving makes one crest in the water: the frequency cannot change.', 'An der Grenze erzeugt jeder ankommende Wellenberg einen Wellenberg im Wasser: Die Frequenz kann sich nicht ändern.'], 'same', ['How many crests per second arrive at the border, and how many travel on in the water?', 'Wie viele Wellenberge pro Sekunde kommen an der Grenze an, und wie viele laufen im Wasser weiter?']],
        [['Both stay the same.', 'Beide bleiben gleich.'], ['Light is slower in water, v = c/n; at the same frequency, λ = v/f is shorter.', 'Licht ist im Wasser langsamer, v = c/n; bei gleicher Frequenz ist λ = v/f kürzer.'], 'same', ['Is light as fast in water as in air? What follows with λ = v/f?', 'Ist Licht im Wasser gleich schnell wie in Luft? Was folgt daraus mit λ = v/f?']],
        [['The frequency stays, the wavelength gets longer.', 'Die Frequenz bleibt, die Wellenlänge wird länger.'], ['Light is slower in water; so its waves get shorter, not longer.', 'Licht ist im Wasser langsamer; also werden seine Wellen kürzer, nicht länger.'], 'mult', ['Is light faster or slower in water? Does a longer wavelength fit that?', 'Ist Licht im Wasser schneller oder langsamer? Passt eine grössere Wellenlänge dazu?']]]],
    ['c', ['Light with the frequency f leaves a glass block (refractive index n) into air. What is its frequency in the air?', 'Licht mit der Frequenz f tritt aus einem Glasblock (Brechzahl n) in die Luft. Wie gross ist seine Frequenz in der Luft?'],
      ['Still f.', 'Immer noch f.'],
      [[['n·f', 'n·f'], ['Faster in air at the same frequency: it is the wavelength that grows by n.', 'In Luft schneller bei gleicher Frequenz: Es ist die Wellenlänge, die um n wächst.'], 'same', ['The speed grows by the factor n. Must the frequency grow for that, or could it be another quantity?', 'Die Geschwindigkeit wächst um den Faktor n. Muss deshalb die Frequenz wachsen, oder kann es eine andere Grösse sein?']],
        [['f/n', 'f/n'], ['The frequency does not change at a border: each crest arriving makes one crest behind it.', 'Die Frequenz ändert sich an einer Grenze nicht: Jeder ankommende Wellenberg erzeugt einen Wellenberg dahinter.'], 'same', ['How many crests per second arrive at the border, and how many travel on behind it?', 'Wie viele Wellenberge pro Sekunde kommen an der Grenze an, und wie viele laufen dahinter weiter?']],
        [['It depends on the angle at which the light leaves.', 'Das hängt vom Winkel ab, unter dem das Licht austritt.'], ['The angle changes the direction, not the frequency.', 'Der Winkel ändert die Richtung, nicht die Frequenz.'], 'same', ['The angle decides the refraction. Does it change how many crests per second arrive at the border?', 'Der Winkel bestimmt die Brechung. Ändert er etwas daran, wie viele Wellenberge pro Sekunde an der Grenze ankommen?']]]],
    ['eb', ['How are the electric and the magnetic field of a travelling electromagnetic wave related?', 'Wie hängen das elektrische und das magnetische Feld einer fortschreitenden elektromagnetischen Welle zusammen?'],
      ['They are perpendicular to each other and to the direction of travel, and in phase.', 'Sie stehen senkrecht aufeinander und auf der Ausbreitungsrichtung, und sie sind in Phase.'],
      [[['They are perpendicular to each other, and B is largest where E is zero.', 'Sie stehen senkrecht aufeinander, und B ist am grössten, wo E null ist.'], ['That is the LC circuit, where current and voltage are a quarter of a period apart. In the wave, E = c·B everywhere.', 'Das ist der Schwingkreis, wo Strom und Spannung um eine Viertelperiode verschoben sind. In der Welle gilt überall E = c·B.'], 'phase', ['That is the LC circuit, where current and voltage are a quarter of a period apart. Is that so in a travelling wave too?', 'Das ist der Schwingkreis, wo Strom und Spannung um eine Viertelperiode verschoben sind. Ist das auch in einer fortschreitenden Welle so?']],
        [['They point the same way, along the direction of travel.', 'Sie zeigen in dieselbe Richtung, längs der Ausbreitung.'], ['The wave is transverse: both fields are perpendicular to the direction of travel.', 'Die Welle ist transversal: Beide Felder stehen senkrecht zur Ausbreitungsrichtung.'], 'transverse', ['Is an electromagnetic wave longitudinal or transverse?', 'Ist eine elektromagnetische Welle longitudinal oder transversal?']],
        [['They are equal in size: E = B.', 'Sie sind gleich gross: E = B.'], ['They have different units; E = c·B.', 'Sie haben verschiedene Einheiten; E = c·B.'], 'ratio']]],
    ['eb', ['In a wave, the electric field is turned round while the magnetic field stays as it was. What changes?', 'In einer Welle wird das elektrische Feld umgedreht, während das Magnetfeld bleibt, wie es war. Was ändert sich?'],
      ['The wave travels the other way.', 'Die Welle läuft in die Gegenrichtung.'],
      [[['Nothing: the direction of travel is set by the source.', 'Nichts: Die Ausbreitungsrichtung legt die Quelle fest.'], ['E, B and c form a right-handed set: turning E round turns E × B round.', 'E, B und c bilden ein Rechtssystem: Dreht man E um, dreht sich E × B um.'], 'hand', ['E, B and c form a right-handed set. What happens to E × B when E is turned round?', 'E, B und c bilden ein Rechtssystem. Was passiert mit E × B, wenn man E umdreht?']],
        [['The wave now travels along E.', 'Die Welle läuft jetzt längs E.'], ['The wave always travels perpendicular to both fields.', 'Die Welle läuft immer senkrecht zu beiden Feldern.'], 'perp'],
        [['The wave now travels along B.', 'Die Welle läuft jetzt längs B.'], ['The wave always travels perpendicular to both fields.', 'Die Welle läuft immer senkrecht zu beiden Feldern.'], 'perp']]],
    ['eb', ['The electric field of a wave has an amplitude of 300 V/m. How large is the amplitude of its magnetic field?', 'Das elektrische Feld einer Welle hat eine Amplitude von 300 V/m. Wie gross ist die Amplitude ihres Magnetfelds?'],
      ['1 μT, as B = E/c.', '1 μT, da B = E/c.'],
      [[['300 T', '300 T'], ['E and B have different units and sizes: B = E/c.', 'E und B haben verschiedene Einheiten und Grössen: B = E/c.'], 'ratio', ['E and B have different units. How are they linked in an electromagnetic wave?', 'E und B haben verschiedene Einheiten. Wie hängen sie in einer elektromagnetischen Welle zusammen?']],
        [['9·10¹⁰ T', '9·10¹⁰ T'], ['Turned round: E = c·B, so B = E/c, a tiny number in tesla.', 'Umgekehrt: E = c·B, also B = E/c, eine winzige Zahl in Tesla.'], 'einv', ['Check the units: does V/m times m/s really give tesla (1 T = 1 V·s/m²)?', 'Prüfe die Einheiten: Ergibt V/m mal m/s wirklich Tesla (1 T = 1 V·s/m²)?']],
        [['0 T: the magnetic field is zero where E is largest.', '0 T: Das Magnetfeld ist null, wo E am grössten ist.'], ['E and B are in phase: B is largest where E is largest.', 'E und B sind in Phase: B ist am grössten, wo E am grössten ist.'], 'phase', ['Is B really zero where E is largest? How do E and B oscillate relative to each other in a travelling wave?', 'Ist B wirklich null, wo E am grössten ist? Wie schwingen E und B in einer fortschreitenden Welle zueinander?']]]],
  ];
  // a statement on one group of ideas
  const conceptOf = (group) => {
    const ks = CONCEPTS.map((c, k) => k).filter((k) => CONCEPTS[k][0] === group);
    return {
      id: `concept-${group}`, difficulty: 2,
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
      hints: () => [{ spec: ORDER_TEXT, c: () => L('In vacuum, every electromagnetic wave travels at c; in matter at c/n, with its frequency unchanged.', 'Im Vakuum läuft jede elektromagnetische Welle mit c; in Materie mit c/n, bei unveränderter Frequenz.'),
        eb: () => L('E, B and the direction of travel are perpendicular to each other, a right-handed set; E = c·B at every place and moment.', 'E, B und die Ausbreitungsrichtung stehen senkrecht aufeinander, ein Rechtssystem; E = c·B an jedem Ort und zu jedem Zeitpunkt.') }[group]()],
      steps: (p) => [step(L('The answer', 'Die Antwort'), p$(`<span class="result">${L(CONCEPTS[p.k][2][0], CONCEPTS[p.k][2][1])}</span>`))],
      figure: () => '',
    };
  };

  const SCENARIOS = [specOrder, specLf, specFl, medium, mediumBack, ebDir, ebRatio, ebPhase, conceptOf('spec'), conceptOf('c'), conceptOf('eb')];

  root.Scenarios = { SCENARIOS, SOURCES, REG, ORDER, MATS, CONCEPTS, DIRS, cross, keyOf };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
