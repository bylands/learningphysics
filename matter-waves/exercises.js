// The exercises of Matter Waves and the Particle in a Box, with their texts in the current language
// (the app rebuilds them when the language changes). Every exercise has the form
//   { id, type, difficulty, title, text, figs (HTML), questions, hints, solution (HTML paragraphs),
//     solFig, p (what makes it new to the student) }
// with questions of four kinds:
//   { type: 'num', key, label, sym, unit, value, tol, abs, scale, wrong: [{ value, tag, why, nudge }] }
//        a number in the unit shown; tol: the relative error allowed, abs: an absolute one; wrong:
//        the results of typical mistakes, each with what went wrong
//   { type: 'choice', key, label, options: [{ label, ok, why, tag, nudge }] }   one of a few answers
//   { type: 'pick', key, label, options: [{ html, ok, why, tag, nudge }] }       one of a few drawings
//   { type: 'multi', key, statements: [{ html, ok, why }] }              statements to tick
// The tags name the wrong idea behind an answer (the check's misconceptions, app.js). why explains
// a wrong answer (in the check, and once solved); nudge, where why would give the answer away, is
// shown instead while the exercise is open. No calculator:
// the numbers are worked out by ratios from one value given.
// The types, by topic:
//   debroglie, same-lambda, diffraction         the de Broglie wavelength by ratios, electron diffraction
//   box-pick, box-energy                        the particle in a box: standing waves, E_n ∝ n²/L²
//   density, uncert-stmts                       |ψ|² as a probability density, the uncertainty relation
(function (root) {
  'use strict';

  const M = root.MatterWave || require('./physics.js');
  const G = root.MatterPlot || require('./plot.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const { rng, plain } = M;

  // ---------------------------------------------------------------- writing
  const i = (s) => `<i>${s}</i>`;
  const sb = (s) => `<sub>${s}</sub>`;
  const lam = i('λ'), p = i('p'), m = i('m'), v = i('v'), h = i('h'), U = { toString: () => i(L('V', 'U')) }, Ek = `${i('E')}${sb('kin')}`, dx = `Δ${i('x')}`, dp = `Δ${i('p')}`, Lb = i('L'), n = i('n'), E1 = `${i('E')}${sb('1')}`, psi2 = `|${i('ψ')}|²`, xm = `⟨${i('x')}⟩`;
  const fig = (html) => `<div class="fig">${html}</div>`;
  // a multiple of the width L, as a fraction: 2L/3, L/2, 2L
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const ofL = (num, den) => { const g = gcd(num, den); num /= g; den /= g; return `${num === 1 ? '' : num}${Lb}${den === 1 ? '' : `/${den}`}`; };

  // ---------------------------------------------------------------- questions
  const numQ = (key, label, sym, unit, value, o = {}) => ({ type: 'num', key, label, sym, unit, value, tol: o.tol || 0.012, abs: o.abs || 0, scale: o.scale || 1, wrong: (o.wrong || []).filter((w) => Number.isFinite(w.value) && Math.abs(w.value / value - 1) > 0.06) });
  const choice = (key, label, options) => ({ type: 'choice', key, label, options });
  const pick = (key, label, options) => ({ type: 'pick', key, label, options });
  const multi = (key, statements) => ({ type: 'multi', key, statements });
  // options from [label, ok, why, tag, nudge], shuffled (or in the order given)
  const opts = (r, list, keep) => { const o = list.map(([label, ok, why, tag, nudge]) => ({ label, ok, why: ok ? '' : why, tag: ok ? undefined : tag || 'other', nudge: ok ? '' : nudge || '' })); return keep ? o : r.shuffle(o); };

  // ---------------------------------------------------------------- typical mistakes
  const WHY = {
    photonp: () => L('That is the formula for a photon (p = E/c, λ = h·c/E). A particle with mass has p = √(2·m·E<sub>kin</sub>).', 'Das ist die Formel für ein Photon (p = E/c, λ = h·c/E). Ein Teilchen mit Masse hat p = √(2·m·E<sub>kin</sub>).'),
    sqrt: () => L('The momentum grows with the square root of the energy: p = √(2·m·E<sub>kin</sub>), so λ ∝ 1/√E<sub>kin</sub> ∝ 1/√V.', 'Der Impuls wächst mit der Wurzel der Energie: p = √(2·m·E<sub>kin</sub>), also λ ∝ 1/√E<sub>kin</sub> ∝ 1/√U.'),
    inverse: () => L('More energy means more momentum, so a shorter wavelength: λ = h/p.', 'Mehr Energie bedeutet mehr Impuls, also eine kürzere Wellenlänge: λ = h/p.'),
    nsq: () => L('E<sub>n</sub> = n²·h²/(8·m·L²): the energy grows with n², not with n.', 'E<sub>n</sub> = n²·h²/(8·m·L²): Die Energie wächst mit n², nicht mit n.'),
    lsq: () => L('λ ∝ L, so p ∝ 1/L and E = p²/(2m) ∝ 1/L².', 'λ ∝ L, also p ∝ 1/L und E = p²/(2m) ∝ 1/L².'),
  };

  // the nudges for them while the exercise is open
  const NUDGE = {
    photonp: () => L('Does this formula hold for a particle with mass, or for a photon?', 'Gilt diese Formel für ein Teilchen mit Masse oder für ein Photon?'),
    sqrt: () => L('How does the momentum depend on the kinetic energy: in proportion, or otherwise? And so the wavelength on the voltage?', 'Wie hängt der Impuls von der kinetischen Energie ab: proportional oder anders? Und damit die Wellenlänge von der Spannung?'),
    inverse: () => L('Check the direction: with more energy, does the wavelength get longer or shorter? Think of λ = h/p.', 'Prüfe die Richtung: Wird die Wellenlänge mit mehr Energie länger oder kürzer? Denk an λ = h/p.'),
    nsq: () => L('Does the energy grow with n itself, or with a power of n? Think of p = h/λ and E = p²/(2m).', 'Wächst die Energie mit n selbst oder mit einer Potenz von n? Denk an p = h/λ und E = p²/(2m).'),
    lsq: () => L('How does E = p²/(2m) depend on the momentum, and the momentum on the width? To which power does L enter, then?', 'Wie hängt E = p²/(2m) vom Impuls ab, und der Impuls von der Breite? Mit welcher Potenz kommt L also vor?'),
    lighter: () => L('Check the direction: does the lighter electron have the larger or the smaller momentum? What does that mean for λ = h/p?', 'Prüfe die Richtung: Hat das leichtere Elektron den grösseren oder den kleineren Impuls? Was heisst das für λ = h/p?'),
  };

  // ---------------------------------------------------------------- the de Broglie wavelength
  // One value worked out once (an electron through 150 V has λ = 100 pm), the rest by ratios: the
  // wavelength from the voltage, or (rev) the voltage from the wavelength. k = √(U/150 V); K = 1/k
  // when the voltage is lower.
  function debroglie(seed) {
    const r = rng(seed * 31 + 3);
    const rev = r.next() < 0.5;
    const k = r.pick(rev ? [2, 4, 5, 10, 0.5, 0.2] : [2, 3, 4, 5, 10, 0.5, 0.2]), Uv = 150 * k * k, l1 = 100 / k;
    const K = Math.round(1 / k), up = k > 1, Vt = String(Math.round(Uv * 1000) / 1000), kk = String(k * k), KK = String(K * K);
    const lPh = 1239.8 / Uv, ratio = (lPh * 1e3) / l1; // nm, the photon's; how many times longer
    return {
      title: L('The wavelength by comparison', 'Die Wellenlänge im Vergleich'),
      text: `<p>${L(`An electron that starts at rest and is accelerated through ${U} = 150 V has the de Broglie wavelength ${lam} = 100 pm. ${rev ? `Another electron, also from rest, has the de Broglie wavelength ${lam} = ${String(l1)} pm.` : `Another electron is accelerated through ${U} = ${Vt} V.`}`, `Ein Elektron, das in Ruhe startet und mit ${U} = 150 V beschleunigt wird, hat die de-Broglie-Wellenlänge ${lam} = 100 pm. ${rev ? `Ein anderes Elektron, ebenfalls aus der Ruhe, hat die de-Broglie-Wellenlänge ${lam} = ${String(l1)} pm.` : `Ein anderes Elektron wird mit ${U} = ${Vt} V beschleunigt.`}`)}</p>`,
      figs: '',
      questions: [
        rev ? numQ('U', L(`(a) the voltage that accelerated it, without a calculator`, `(a) die Spannung, mit der es beschleunigt wurde, ohne Taschenrechner`), String(U), 'V', Uv, { wrong: [
          { value: 150 * k, tag: 'sqrt', why: L('The wavelength goes with 1/√V, so the voltage goes with 1/λ²: square the factor of the wavelength.', 'Die Wellenlänge geht mit 1/√U, also die Spannung mit 1/λ²: Den Faktor der Wellenlänge quadrieren.'), nudge: NUDGE.sqrt() },
          { value: 150 / (k * k), tag: 'inverse', why: L('A shorter wavelength means more momentum, so a larger voltage: λ = h/p.', 'Eine kürzere Wellenlänge bedeutet mehr Impuls, also eine grössere Spannung: λ = h/p.'), nudge: L('Check the direction: does a shorter wavelength go with more or less momentum, and so with a larger or smaller voltage?', 'Prüfe die Richtung: Gehört zu einer kürzeren Wellenlänge mehr oder weniger Impuls, und damit eine grössere oder kleinere Spannung?') },
        ] })
          : numQ('lam', L(`(a) its wavelength, without a calculator`, `(a) seine Wellenlänge, ohne Taschenrechner`), lam, 'pm', l1, { wrong: [{ value: 100 / (k * k), tag: 'sqrt', why: WHY.sqrt(), nudge: NUDGE.sqrt() }, { value: 100 * k, tag: 'inverse', why: WHY.inverse(), nudge: NUDGE.inverse() }] }),
        choice('p', L(`(b) Its momentum, from its kinetic energy ${Ek}, is`, `(b) Sein Impuls, aus seiner kinetischen Energie ${Ek}, ist`), opts(r, [
          [`${p} = √(2·${m}·${Ek})`, true],
          [`${p} = ${Ek}/${i('c')}`, false, WHY.photonp(), 'photonp', NUDGE.photonp()],
          [`${p} = 2·${m}·${Ek}`, false, L(`${Ek} = ${p}²/(2${m}): the momentum is the square root of 2·${m}·${Ek}.`, `${Ek} = ${p}²/(2${m}): Der Impuls ist die Wurzel aus 2·${m}·${Ek}.`), 'sqrt', L(`Check the units: does 2·${m}·${Ek} have the unit of a momentum?`, `Prüfe die Einheiten: Hat 2·${m}·${Ek} die Einheit eines Impulses?`)],
          [`${p} = ½·${m}·${v}²`, false, L(`That is the kinetic energy. The momentum is ${p} = ${m}·${v} = √(2·${m}·${Ek}).`, `Das ist die kinetische Energie. Der Impuls ist ${p} = ${m}·${v} = √(2·${m}·${Ek}).`), 'other', L('That is the kinetic energy. How is the momentum defined?', 'Das ist die kinetische Energie. Wie ist der Impuls definiert?')],
        ])),
        choice('ph', L(`(c) A photon has the same energy, ${Vt} eV. Its wavelength is`, `(c) Ein Photon hat dieselbe Energie, ${Vt} eV. Seine Wellenlänge ist`), opts(r, [
          [L('much longer than the electron’s', 'viel länger als die des Elektrons'), true],
          [L(`the same, ${plain(l1)} pm`, `dieselbe, ${plain(l1)} pm`), false, L(`Same energy, but not the same momentum: the photon has ${p} = ${i('E')}/${i('c')}, the electron ${p} = √(2·${m}·${Ek}), which is far larger.`, `Dieselbe Energie, aber nicht derselbe Impuls: Das Photon hat ${p} = ${i('E')}/${i('c')}, das Elektron ${p} = √(2·${m}·${Ek}), und das ist viel grösser.`), 'photonp', L('Do the photon and the electron have the same momentum at the same energy? Which formula for the momentum holds for each?', 'Haben Photon und Elektron bei gleicher Energie auch denselben Impuls? Welche Formel für den Impuls gilt für welches?')],
          [L('much shorter than the electron’s', 'viel kürzer als die des Elektrons'), false, L(`At the same energy, the photon has the smaller momentum ${i('E')}/${i('c')}, so the longer wavelength.`, `Bei gleicher Energie hat das Photon den kleineren Impuls ${i('E')}/${i('c')}, also die längere Wellenlänge.`), 'photonp', L('At the same energy, which has the larger momentum, the photon or the electron? And what does that mean for λ = h/p?', 'Welches hat bei gleicher Energie den grösseren Impuls, das Photon oder das Elektron? Und was heisst das für λ = h/p?')],
        ])),
      ],
      hints: [
        rev ? L(`The first electron: 150 V and 100 pm. The second has ${lam} = ${String(l1)} pm: how many times ${up ? 'shorter' : 'longer'} is that than 100 pm, and so does it need a larger or a smaller voltage?`, `Das erste Elektron: 150 V und 100 pm. Das zweite hat ${lam} = ${String(l1)} pm: Wie viel Mal ${up ? 'kürzer' : 'länger'} ist das als 100 pm, und braucht es dafür eine grössere oder eine kleinere Spannung?`)
          : L(`The first electron: 150 V and 100 pm. The second is accelerated through ${Vt} V: by what factor is that voltage ${up ? 'larger' : 'smaller'} than 150 V?`, `Das erste Elektron: 150 V und 100 pm. Das zweite wird mit ${Vt} V beschleunigt: Um welchen Faktor ist diese Spannung ${up ? 'grösser' : 'kleiner'} als 150 V?`),
        L(`(a) ${lam} = ${h}/${p}, and from rest the electron gains ${Ek} = ${i('e')}·${U}, so ${p} = √(2·${m}·${i('e')}·${U}). (c) The photon with the same energy, ${Vt} eV, has no mass: its momentum is ${p} = ${i('E')}/${i('c')}.`, `(a) ${lam} = ${h}/${p}, und aus der Ruhe gewinnt das Elektron ${Ek} = ${i('e')}·${U}, also ${p} = √(2·${m}·${i('e')}·${U}). (c) Das Photon mit derselben Energie, ${Vt} eV, hat keine Masse: Sein Impuls ist ${p} = ${i('E')}/${i('c')}.`),
        rev ? (up
          ? L(`The wavelength is ${k} times shorter than 100 pm, so by ${lam} = ${h}/${p} the momentum is ${k} times as large. How does ${U} depend on ${p}?`, `Die Wellenlänge ist ${k}-mal kürzer als 100 pm, also ist wegen ${lam} = ${h}/${p} der Impuls ${k}-mal so gross. Wie hängt ${U} von ${p} ab?`)
          : L(`The wavelength is ${K} times as long as 100 pm, so by ${lam} = ${h}/${p} the momentum is only 1/${K} as large. How does ${U} depend on ${p}?`, `Die Wellenlänge ist ${K}-mal so lang wie 100 pm, also ist wegen ${lam} = ${h}/${p} der Impuls nur 1/${K} so gross. Wie hängt ${U} von ${p} ab?`))
          : up
            ? L(`The voltage is ${kk} times as large as 150 V, and so is the kinetic energy ${Ek} = ${i('e')}·${U}. With which power of ${Ek} does ${p} grow?`, `Die Spannung ist ${kk}-mal so gross wie 150 V, und ebenso die kinetische Energie ${Ek} = ${i('e')}·${U}. Mit welcher Potenz von ${Ek} wächst ${p}?`)
            : L(`The voltage is only 1/${KK} of 150 V, and so is the kinetic energy ${Ek} = ${i('e')}·${U}. With which power of ${Ek} does ${p} grow?`, `Die Spannung ist nur 1/${KK} von 150 V, und ebenso die kinetische Energie ${Ek} = ${i('e')}·${U}. Mit welcher Potenz von ${Ek} wächst ${p}?`),
      ],
      solution: [
        rev ? (up
          ? L(`(a) ${lam} is ${k} times shorter than 100 pm, so ${p} = ${h}/${lam} is ${k} times as large, and ${U} = ${p}²/(2·${m}·${i('e')}) is ${k}² = ${kk} times as large: ${U} = ${kk} · 150 V = <b>${Vt} V</b>.`, `(a) ${lam} ist ${k}-mal kürzer als 100 pm, also ist ${p} = ${h}/${lam} ${k}-mal so gross, und ${U} = ${p}²/(2·${m}·${i('e')}) ist ${k}² = ${kk}-mal so gross: ${U} = ${kk} · 150 V = <b>${Vt} V</b>.`)
          : L(`(a) ${lam} is ${K} times as long as 100 pm, so ${p} = ${h}/${lam} is only 1/${K} as large, and ${U} = ${p}²/(2·${m}·${i('e')}) only 1/${K}² = 1/${KK} as large: ${U} = 150 V / ${KK} = <b>${Vt} V</b>.`, `(a) ${lam} ist ${K}-mal so lang wie 100 pm, also ist ${p} = ${h}/${lam} nur 1/${K} so gross, und ${U} = ${p}²/(2·${m}·${i('e')}) nur 1/${K}² = 1/${KK} so gross: ${U} = 150 V / ${KK} = <b>${Vt} V</b>.`))
          : up
            ? L(`(a) ${U} is ${kk} times as large, so ${p} = √(2·${m}·${i('e')}·${U}) is √${kk} = ${k} times as large, and ${lam} = ${h}/${p} is ${k} times shorter: ${lam} = 100 pm / ${k} = <b>${plain(l1)} pm</b>.`, `(a) ${U} ist ${kk}-mal so gross, also ist ${p} = √(2·${m}·${i('e')}·${U}) √${kk} = ${k}-mal so gross, und ${lam} = ${h}/${p} ist ${k}-mal kürzer: ${lam} = 100 pm / ${k} = <b>${plain(l1)} pm</b>.`)
            : L(`(a) ${U} is only 1/${KK} of 150 V, so ${p} = √(2·${m}·${i('e')}·${U}) is only 1/√${KK} = 1/${K} as large, and ${lam} = ${h}/${p} is ${K} times as long: ${lam} = ${K} · 100 pm = <b>${plain(l1)} pm</b>.`, `(a) ${U} ist nur 1/${KK} von 150 V, also ist ${p} = √(2·${m}·${i('e')}·${U}) nur 1/√${KK} = 1/${K} so gross, und ${lam} = ${h}/${p} ist ${K}-mal so lang: ${lam} = ${K} · 100 pm = <b>${plain(l1)} pm</b>.`),
        L(`(b) ${Ek} = ½·${m}·${v}² = ${p}²/(2${m}), so <b>${p} = √(2·${m}·${Ek})</b>.`, `(b) ${Ek} = ½·${m}·${v}² = ${p}²/(2${m}), also <b>${p} = √(2·${m}·${Ek})</b>.`),
        L(`(c) The photon has ${p} = ${i('E')}/${i('c')}, far less than the electron’s √(2·${m}·${Ek}): its wavelength, ${lam} = ${h}·${i('c')}/${i('E')} = ${plain(lPh)} nm, is <b>much longer</b>, about ${plain(ratio, 2)} times. The photon’s formula must not be used for the electron.`, `(c) Das Photon hat ${p} = ${i('E')}/${i('c')}, viel weniger als das √(2·${m}·${Ek}) des Elektrons: Seine Wellenlänge, ${lam} = ${h}·${i('c')}/${i('E')} = ${plain(lPh)} nm, ist <b>viel länger</b>, etwa ${plain(ratio, 2)}-mal. Die Formel des Photons darf man für das Elektron nicht brauchen.`),
      ],
      p: { k, rev },
    };
  }

  // Electron, proton and alpha particle: which wavelength is longest, and by how much? Compared at
  // the same speed, the same kinetic energy or the same momentum (then λ = h/p is the same).
  function sameLambda(seed) {
    const r = rng(seed * 41 + 9);
    const same = r.pick(['v', 'E', 'p']), ask = r.pick(['short', 'long']), ratio = r.pick(['v', 'E', 'p']);
    const samePWhy = L('Same momentum, same wavelength: λ = h/p does not depend on the mass. The lighter particle is only faster, v = p/m.', 'Gleicher Impuls, gleiche Wellenlänge: λ = h/p hängt nicht von der Masse ab. Das leichtere Teilchen ist nur schneller, v = p/m.');
    // the nudges while the exercise is open
    const samePNudge = L('On what does λ = h/p depend, and does that differ between the three?', 'Wovon hängt die Wellenlänge λ = h/p ab, und unterscheidet sich diese Grösse bei den dreien?');
    const massNudge = L('Compare the momenta: how does the momentum at the same ' + (same === 'v' ? 'speed' : 'kinetic energy') + ' depend on the mass?', 'Vergleiche die Impulse: Wie hängt der Impuls bei gleicher ' + (same === 'v' ? 'Geschwindigkeit' : 'kinetischer Energie') + ' von der Masse ab?');
    const voltNudge = ask === 'short' ? L('Which of the three gains the largest momentum from the same voltage? Think of mass and charge.', 'Welches der drei bekommt bei gleicher Spannung den grössten Impuls? Denk an Masse und Ladung.') : L('Which of the three gains the smallest momentum from the same voltage? Think of mass and charge.', 'Welches der drei bekommt bei gleicher Spannung den kleinsten Impuls? Denk an Masse und Ladung.');
    const names = [L('the electron', 'das Elektron'), L('the proton', 'das Proton'), L('the alpha particle', 'das Alphateilchen')];
    const allSame = L('all the same', 'alle gleich');
    const atSame = { v: L('at the same speed', 'bei gleicher Geschwindigkeit'), E: L('at the same kinetic energy', 'bei gleicher kinetischer Energie'), p: L('with the same momentum', 'bei gleichem Impuls') };
    const qa = same === 'p' ? [
      [allSame, true],
      [names[0], false, samePWhy, 'mass', samePNudge],
      [names[1], false, samePWhy, 'mass', samePNudge],
      [names[2], false, samePWhy, 'mass', samePNudge],
    ] : [
      [names[0], true],
      [names[1], false, L('The proton is heavier: at the same ' + (same === 'v' ? 'speed' : 'kinetic energy') + ' it has more momentum, so a shorter wavelength.', 'Das Proton ist schwerer: Bei gleicher ' + (same === 'v' ? 'Geschwindigkeit' : 'kinetischer Energie') + ' hat es mehr Impuls, also eine kürzere Wellenlänge.'), 'mass', massNudge],
      [names[2], false, L('The alpha particle is the heaviest: it has the most momentum and the shortest wavelength.', 'Das Alphateilchen ist am schwersten: Es hat am meisten Impuls und die kürzeste Wellenlänge.'), 'mass', massNudge],
      [allSame, false, L('λ = h/p, and the momentum depends on the mass.', 'λ = h/p, und der Impuls hängt von der Masse ab.'), 'mass'],
    ];
    const qb = ask === 'short' ? [
      [names[0], false, L('The electron is the lightest: it has the longest wavelength.', 'Das Elektron ist am leichtesten: Es hat die längste Wellenlänge.'), 'mass', voltNudge],
      [names[1], false, L('The alpha particle is heavier and, with twice the charge, gains twice the energy: p = √(2·m·q·V).', 'Das Alphateilchen ist schwerer und gewinnt mit der doppelten Ladung die doppelte Energie: p = √(2·m·q·U).'), 'charge', voltNudge],
      [names[2], true],
      [allSame, false, L('The voltage gives each the energy q·V, but λ = h/p depends on the momentum p = √(2·m·q·V).', 'Die Spannung gibt jedem die Energie q·U, aber λ = h/p hängt vom Impuls p = √(2·m·q·U) ab.'), 'mass'],
    ] : [
      [names[0], true],
      [names[1], false, L('The proton is about 1800 times heavier than the electron: more momentum, shorter wavelength.', 'Das Proton ist etwa 1800-mal schwerer als das Elektron: mehr Impuls, kürzere Wellenlänge.'), 'mass', voltNudge],
      [names[2], false, L('The alpha particle is the heaviest and has twice the charge: the most momentum, the shortest wavelength.', 'Das Alphateilchen ist am schwersten und hat die doppelte Ladung: am meisten Impuls, die kürzeste Wellenlänge.'), 'charge', voltNudge],
      [allSame, false, L('The voltage gives each the energy q·V, but λ = h/p depends on the momentum p = √(2·m·q·V).', 'Die Spannung gibt jedem die Energie q·U, aber λ = h/p hängt vom Impuls p = √(2·m·q·U) ab.'), 'mass'],
    ];
    const qc = ratio === 'p' ? [
      [L('the same', 'gleich lang'), true],
      [L('about 1840 times longer', 'etwa 1840-mal länger'), false, L('That is the ratio of the speeds: with the same momentum the electron is about 1840 times faster, v = p/m. The wavelength λ = h/p is the same.', 'Das ist das Verhältnis der Geschwindigkeiten: Bei gleichem Impuls ist das Elektron etwa 1840-mal schneller, v = p/m. Die Wellenlänge λ = h/p ist dieselbe.'), 'mass', L('That is the ratio of the speeds. On what does the wavelength λ = h/p depend?', 'Das ist das Verhältnis der Geschwindigkeiten. Wovon hängt die Wellenlänge λ = h/p ab?')],
      [L('about 43 times longer', 'etwa 43-mal länger'), false, L('That would be at the same kinetic energy. With the same momentum, λ = h/p is the same.', 'Das wäre bei gleicher kinetischer Energie. Bei gleichem Impuls ist λ = h/p dasselbe.'), 'mass', L('That would be at the same kinetic energy. What is the same here, and on what does λ = h/p depend?', 'Das wäre bei gleicher kinetischer Energie. Was ist hier gleich, und wovon hängt λ = h/p ab?')],
      [L('about 1840 times shorter', 'etwa 1840-mal kürzer'), false, L('λ = h/p depends only on the momentum, and that is the same.', 'λ = h/p hängt nur vom Impuls ab, und der ist gleich.'), 'mass', L('On what does λ = h/p depend, and how does that differ between the two?', 'Wovon hängt λ = h/p ab, und wie unterscheidet sich diese Grösse bei den beiden?')],
    ] : ratio === 'v' ? [
      [L('about 1840 times longer', 'etwa 1840-mal länger'), true],
      [L('about 43 times longer', 'etwa 43-mal länger'), false, L('At the same speed, p = m·v: the ratio of the momenta is the ratio of the masses, without a square root.', 'Bei gleicher Geschwindigkeit ist p = m·v: Das Verhältnis der Impulse ist das Verhältnis der Massen, ohne Wurzel.'), 'sqrt', L('At the same speed, how does the momentum depend on the mass: with a square root or without?', 'Wie hängt der Impuls bei gleicher Geschwindigkeit von der Masse ab: mit oder ohne Wurzel?')],
      [L('the same', 'gleich lang'), false, L('Same speed, but not the same momentum: p = m·v.', 'Gleiche Geschwindigkeit, aber nicht derselbe Impuls: p = m·v.'), 'mass'],
      [L('about 1840 times shorter', 'etwa 1840-mal kürzer'), false, L('The lighter electron has the smaller momentum, so the longer wavelength.', 'Das leichtere Elektron hat den kleineren Impuls, also die längere Wellenlänge.'), 'inverse', NUDGE.lighter()],
    ] : [
      [L('about 43 times longer', 'etwa 43-mal länger'), true],
      [L('about 1840 times longer', 'etwa 1840-mal länger'), false, WHY.sqrt(), 'sqrt', NUDGE.sqrt()],
      [L('the same', 'gleich lang'), false, L('Same energy, but not the same momentum: p = √(2·m·E<sub>kin</sub>).', 'Dieselbe Energie, aber nicht derselbe Impuls: p = √(2·m·E<sub>kin</sub>).'), 'mass'],
      [L('about 43 times shorter', 'etwa 43-mal kürzer'), false, L('The lighter electron has the smaller momentum, so the longer wavelength.', 'Das leichtere Elektron hat den kleineren Impuls, also die längere Wellenlänge.'), 'inverse', NUDGE.lighter()],
    ];
    return {
      title: L('Light and heavy particles', 'Leichte und schwere Teilchen'),
      text: `<p>${L('An electron, a proton and an alpha particle (a helium nucleus: about four times the mass of a proton, twice its charge) are compared. A proton is about 1840 times as heavy as an electron, and √1840 ≈ 43. No relativity is needed.', 'Ein Elektron, ein Proton und ein Alphateilchen (ein Heliumkern: etwa viermal die Masse eines Protons, doppelte Ladung) werden verglichen. Ein Proton ist etwa 1840-mal so schwer wie ein Elektron, und √1840 ≈ 43. Die Relativitätstheorie ist nicht nötig.')}</p>`,
      figs: '',
      questions: [
        choice('a', same === 'p' ? L('(a) All three have the same momentum. Which has the longest wavelength?', '(a) Alle drei haben denselben Impuls. Welches hat die grösste Wellenlänge?') : same === 'v' ? L('(a) All three fly at the same speed. Which has the longest wavelength?', '(a) Alle drei fliegen gleich schnell. Welches hat die grösste Wellenlänge?') : L('(a) All three have the same kinetic energy. Which has the longest wavelength?', '(a) Alle drei haben dieselbe kinetische Energie. Welches hat die grösste Wellenlänge?'), opts(r, qa)),
        choice('b', ask === 'short' ? L('(b) All three start at rest and are accelerated through the same voltage. Which has the shortest wavelength?', '(b) Alle drei starten in Ruhe und werden mit derselben Spannung beschleunigt. Welches hat die kleinste Wellenlänge?') : L('(b) All three start at rest and are accelerated through the same voltage. Which has the longest wavelength?', '(b) Alle drei starten in Ruhe und werden mit derselben Spannung beschleunigt. Welches hat die grösste Wellenlänge?'), opts(r, qb)),
        choice('c', ratio === 'p' ? L('(c) An electron and a proton have the same momentum. Compared with the proton’s, the wavelength of the electron is', '(c) Ein Elektron und ein Proton haben denselben Impuls. Verglichen mit der des Protons ist die Wellenlänge des Elektrons') : ratio === 'v' ? L('(c) An electron and a proton have the same speed. Compared with the proton’s, the wavelength of the electron is', '(c) Ein Elektron und ein Proton haben dieselbe Geschwindigkeit. Verglichen mit der des Protons ist die Wellenlänge des Elektrons') : L('(c) An electron and a proton have the same kinetic energy. Compared with the proton’s, the wavelength of the electron is', '(c) Ein Elektron und ein Proton haben dieselbe kinetische Energie. Verglichen mit der des Protons ist die Wellenlänge des Elektrons'), opts(r, qc)),
      ],
      hints: [
        L(`(a) compares all three ${atSame[same]}, (b) after the same voltage, (c) the electron and the proton ${atSame[ratio]}. What differs between them: the mass, the charge, or both? (The proton is about 1840 times as heavy as the electron, the alpha particle about four times as heavy as the proton, with twice its charge.)`, `(a) vergleicht alle drei ${atSame[same]}, (b) nach derselben Spannung, (c) das Elektron und das Proton ${atSame[ratio]}. Was unterscheidet sie: die Masse, die Ladung oder beides? (Das Proton ist etwa 1840-mal so schwer wie das Elektron, das Alphateilchen etwa viermal so schwer wie das Proton, mit doppelter Ladung.)`),
        L(`In every part ${lam} = ${h}/${p}: the larger the momentum, the shorter the wavelength. Write ${p} with what is the same: ${same === 'v' ? `in (a) ${p} = ${m}·${v} with the same ${v}` : same === 'E' ? `in (a) ${p} = √(2·${m}·${Ek}) with the same ${Ek}` : 'in (a) compare the momenta directly'}; in (b) ${p} = √(2·${m}·${i('q')}·${U}).`, `In jedem Teil ist ${lam} = ${h}/${p}: Je grösser der Impuls, desto kürzer die Wellenlänge. Schreibe ${p} mit dem, was gleich ist: ${same === 'v' ? `in (a) ${p} = ${m}·${v} mit gleichem ${v}` : same === 'E' ? `in (a) ${p} = √(2·${m}·${Ek}) mit gleichem ${Ek}` : 'in (a) die Impulse direkt vergleichen'}; in (b) ${p} = √(2·${m}·${i('q')}·${U}).`),
        L(`(b) The voltage gives each the energy ${Ek} = ${i('q')}·${U}: the alpha particle gains twice as much as the proton or the electron. (c) Write ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')}${ratio === 'p' ? ': what does the text say about the two momenta?' : `, and express both momenta ${atSame[ratio]}.`}`, `(b) Die Spannung gibt jedem die Energie ${Ek} = ${i('q')}·${U}: Das Alphateilchen gewinnt doppelt so viel wie das Proton oder das Elektron. (c) Schreibe ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')}${ratio === 'p' ? ': Was sagt der Text über die beiden Impulse?' : ` und drücke beide Impulse ${atSame[ratio]} aus.`}`),
      ],
      solution: [
        same === 'p' ? L(`(a) ${lam} = ${h}/${p} contains only the momentum: the same momentum gives the same wavelength, <b>all the same</b>. The masses differ, so the speeds do: ${v} = ${p}/${m}.`, `(a) ${lam} = ${h}/${p} enthält nur den Impuls: Derselbe Impuls ergibt dieselbe Wellenlänge, <b>alle gleich</b>. Die Massen sind verschieden, also die Geschwindigkeiten: ${v} = ${p}/${m}.`) : L(`(a) ${same === 'v' ? `${p} = ${m}·${v}` : `${p} = √(2·${m}·${Ek})`}: the lightest particle has the least momentum and the longest wavelength, <b>the electron</b>.`, `(a) ${same === 'v' ? `${p} = ${m}·${v}` : `${p} = √(2·${m}·${Ek})`}: Das leichteste Teilchen hat den kleinsten Impuls und die grösste Wellenlänge, <b>das Elektron</b>.`),
        L(`(b) ${p} = √(2·${m}·${i('q')}·${U}): compare ${m}·${i('q')}. The alpha particle has about 4·${m}${sb('p')} and 2${i('e')}, so 8 times the product of the proton. ${ask === 'short' ? 'The shortest wavelength: <b>the alpha particle</b>.' : 'The longest wavelength: <b>the electron</b>.'}`, `(b) ${p} = √(2·${m}·${i('q')}·${U}): Vergleiche ${m}·${i('q')}. Das Alphateilchen hat etwa 4·${m}${sb('p')} und 2${i('e')}, also das 8-fache Produkt des Protons. ${ask === 'short' ? 'Die kleinste Wellenlänge: <b>das Alphateilchen</b>.' : 'Die grösste Wellenlänge: <b>das Elektron</b>.'}`),
        ratio === 'p' ? L(`(c) ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')} = 1: <b>the same</b>. The electron is about 1840 times faster, ${v} = ${p}/${m}, but only the momentum counts.`, `(c) ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')} = 1: <b>gleich lang</b>. Das Elektron ist etwa 1840-mal schneller, ${v} = ${p}/${m}, aber es zählt nur der Impuls.`)
          : ratio === 'v' ? L(`(c) ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')} = ${m}${sb('p')}/${m}${sb('e')} ≈ 1840: <b>about 1840 times longer</b>.`, `(c) ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')} = ${m}${sb('p')}/${m}${sb('e')} ≈ 1840: <b>etwa 1840-mal länger</b>.`)
          : L(`(c) ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')} = √(${m}${sb('p')}/${m}${sb('e')}) ≈ √1840 ≈ 43: <b>about 43 times longer</b>.`, `(c) ${lam}${sb('e')}/${lam}${sb('p')} = ${p}${sb('p')}/${p}${sb('e')} = √(${m}${sb('p')}/${m}${sb('e')}) ≈ √1840 ≈ 43: <b>etwa 43-mal länger</b>.`),
      ],
      p: { same, ask, ratio },
    };
  }

  // Electron diffraction at graphite: the rings shrink as the voltage grows, as λ = h/p predicts.
  const LT = 0.135, DS = [0.213e-9, 0.123e-9]; // m: the distance foil–screen, the spacings of the planes
  // The voltage changes by a square factor, so the radius by its root: 4 (half or twice the radius) or
  // 9/4 (2/3 or 3/2 of the radius). [U before, U after] in kV.
  const DIFF = [[2, 8], [3, 12], [4, 16], [5, 20], [1, 4], [2, 0.5], [3, 0.75], [4, 1], [5, 1.25], [16, 4], [4, 9], [2, 4.5], [9, 4], [4.5, 2]];
  function diffraction(seed) {
    const r = rng(seed * 43 + 13);
    const [U0, U1] = r.pick(DIFF), up = U1 > U0, q4 = U1 / U0 === 4 || U0 / U1 === 4, f = Math.sqrt(U0 / U1);
    const radii = DS.map((dd) => (LT * M.lambdaU(U0 * 1e3) / dd) * 1e3); // mm
    const S = [[f, null], [f * f, 'sqrt'], [1 / f, 'inverse'], [1, 'same']];
    const max = Math.max(...S.map(([x]) => x * radii[1]), radii[1]) * 1.08;
    const WRONG = {
      sqrt: () => WHY.sqrt(),
      inverse: () => (up ? L('Faster electrons have a shorter wavelength: they are diffracted less, the rings shrink.', 'Schnellere Elektronen haben eine kürzere Wellenlänge: Sie werden weniger gebeugt, die Ringe schrumpfen.') : L('Slower electrons have a longer wavelength: they are diffracted more, the rings grow.', 'Langsamere Elektronen haben eine längere Wellenlänge: Sie werden stärker gebeugt, die Ringe wachsen.')),
      same: () => L('The spacings of the planes belong to the crystal, but the angles depend on the wavelength of the electrons.', 'Die Abstände der Netzebenen gehören zum Kristall, aber die Winkel hängen von der Wellenlänge der Elektronen ab.'),
    };
    const NUDGES = {
      sqrt: () => NUDGE.sqrt(),
      inverse: () => (up ? L('Are faster electrons diffracted more or less? Think of λ = h/p.', 'Werden schnellere Elektronen stärker oder schwächer gebeugt? Denk an λ = h/p.') : L('Are slower electrons diffracted more or less? Think of λ = h/p.', 'Werden langsamere Elektronen stärker oder schwächer gebeugt? Denk an λ = h/p.')),
    };
    const options = r.shuffle(S.map(([x, w]) => ({ html: G.rings(radii.map((q) => q * x), { max, small: true }), ok: !w, why: w ? WRONG[w]() : '', tag: w ? (w === 'same' ? 'other' : w) : undefined, nudge: w && NUDGES[w] ? NUDGES[w]() : '' })));
    const Utxt = (x) => `${plain(x, 3)} kV`;
    return {
      title: L('Electrons diffracted by graphite', 'Elektronenbeugung an Graphit'),
      text: `<p>${L(`In a diffraction tube, electrons accelerated through ${U} = ${Utxt(U0)} pass a thin graphite foil and make the rings shown on the screen. Then the voltage is ${up ? 'raised' : 'lowered'} to ${U} = ${Utxt(U1)}.`, `In einer Beugungsröhre durchqueren Elektronen, die mit ${U} = ${Utxt(U0)} beschleunigt wurden, eine dünne Graphitfolie und bilden die gezeigten Ringe auf dem Schirm. Dann wird die Spannung auf ${U} = ${Utxt(U1)} ${up ? 'erhöht' : 'gesenkt'}.`)}</p>`,
      figs: fig(G.tube({ U: Utxt(U0) })) + fig(G.rings(radii, { max })),
      questions: [
        pick('scr', L(`(a) Which screen shows the rings at ${Utxt(U1)}, to the same scale?`, `(a) Welcher Schirm zeigt die Ringe bei ${Utxt(U1)}, im selben Massstab?`), options),
        choice('why', L('(b) Why do such rings show that electrons are waves?', '(b) Warum zeigen solche Ringe, dass Elektronen Wellen sind?'), opts(r, [
          [L('They are a diffraction pattern, as with X-rays, and their size follows λ = h/p of the electrons.', 'Sie sind ein Beugungsmuster, wie bei Röntgenstrahlung, und ihre Grösse folgt dem λ = h/p der Elektronen.'), true],
          [L('The electrons bounce off the atoms of the foil at random.', 'Die Elektronen prallen zufällig von den Atomen der Folie ab.'), false, L('Bouncing at random would give a smooth spot, not sharp rings at fixed angles.', 'Zufälliges Abprallen ergäbe einen verschmierten Fleck, keine scharfen Ringe bei festen Winkeln.'), 'particle'],
          [L('X-rays made in the tube make the rings, not the electrons.', 'Röntgenstrahlung aus der Röhre erzeugt die Ringe, nicht die Elektronen.'), false, L('A magnet near the tube moves the rings: they are made by charged particles, the electrons.', 'Ein Magnet neben der Röhre verschiebt die Ringe: Sie stammen von geladenen Teilchen, den Elektronen.'), 'other'],
          [L('The charges in the foil deflect the electrons onto circles.', 'Die Ladungen in der Folie lenken die Elektronen auf Kreise ab.'), false, L('Electric deflection would not give sharp rings whose radius follows h/p. The rings are where the waves from the planes of atoms add up.', 'Elektrische Ablenkung ergäbe keine scharfen Ringe, deren Radius h/p folgt. Die Ringe liegen dort, wo sich die Wellen der Atomebenen verstärken.'), 'particle', L('Electric deflection would not give sharp rings whose radius follows h/p. What kind of pattern gives sharp rings at fixed angles?', 'Elektrische Ablenkung ergäbe keine scharfen Ringe, deren Radius h/p folgt. Was für ein Muster ergibt scharfe Ringe bei festen Winkeln?')],
        ])),
      ],
      hints: [
        L(`The voltage goes from ${Utxt(U0)} to ${Utxt(U1)}: are the electrons now faster or slower, and are they diffracted more or less?`, `Die Spannung geht von ${Utxt(U0)} auf ${Utxt(U1)}: Sind die Elektronen jetzt schneller oder langsamer, und werden sie stärker oder schwächer gebeugt?`),
        L(`The ring radius is ${i('r')} ≈ ${Lb}·${lam}/${i('d')}: the distance ${Lb} from the foil to the screen and the spacings ${i('d')} of the planes stay the same, only ${lam} = ${h}/${p} changes, with ${p} = √(2·${m}·${i('e')}·${U}).`, `Der Ringradius ist ${i('r')} ≈ ${Lb}·${lam}/${i('d')}: Der Abstand ${Lb} von der Folie zum Schirm und die Abstände ${i('d')} der Netzebenen bleiben gleich, nur ${lam} = ${h}/${p} ändert sich, mit ${p} = √(2·${m}·${i('e')}·${U}).`),
        up ? L(`The voltage is ${q4 ? '4' : '9/4'} times as large as before, and so is the kinetic energy of the electrons. By what factor does the momentum change, then?`, `Die Spannung ist ${q4 ? '4' : '9/4'}-mal so gross wie vorher, und ebenso die kinetische Energie der Elektronen. Um welchen Faktor ändert sich also der Impuls?`)
          : L(`The voltage is only ${q4 ? '1/4' : '4/9'} of what it was, and so is the kinetic energy of the electrons. By what factor does the momentum change, then?`, `Die Spannung ist nur noch ${q4 ? '1/4' : '4/9'} des vorherigen Werts, und ebenso die kinetische Energie der Elektronen. Um welchen Faktor ändert sich also der Impuls?`),
      ],
      solution: [
        q4 ? L(`(a) ${i('r')} ∝ ${lam} ∝ 1/√${U}: ${up ? 'four times the voltage, <b>half the radius</b>' : 'a quarter of the voltage, <b>twice the radius</b>'}.`, `(a) ${i('r')} ∝ ${lam} ∝ 1/√${U}: ${up ? 'vierfache Spannung, <b>halber Radius</b>' : 'ein Viertel der Spannung, <b>doppelter Radius</b>'}.`)
          : L(`(a) ${i('r')} ∝ ${lam} ∝ 1/√${U}: ${up ? '9/4 of the voltage, √(9/4) = 3/2, so <b>2/3 of the radius</b>' : '4/9 of the voltage, √(4/9) = 2/3, so <b>3/2 of the radius</b>'}.`, `(a) ${i('r')} ∝ ${lam} ∝ 1/√${U}: ${up ? '9/4 der Spannung, √(9/4) = 3/2, also <b>2/3 des Radius</b>' : '4/9 der Spannung, √(4/9) = 2/3, also <b>das 3/2-Fache des Radius</b>'}.`),
        L('(b) Sharp rings at fixed angles are a <b>diffraction pattern</b>: the waves reflected by the planes of atoms add up only in certain directions, as for X-rays. That the rings change with the voltage exactly as λ = h/p predicts shows that the waves are the electrons’ own (Davisson and Germer, G. P. Thomson, 1927).', '(b) Scharfe Ringe bei festen Winkeln sind ein <b>Beugungsmuster</b>: Die von den Atomebenen reflektierten Wellen verstärken sich nur in bestimmten Richtungen, wie bei Röntgenstrahlung. Dass sich die Ringe mit der Spannung genau so ändern, wie λ = h/p es vorhersagt, zeigt, dass es die Wellen der Elektronen selbst sind (Davisson und Germer, G. P. Thomson, 1927).'),
      ],
      p: { U0, U1 },
    };
  }

  // ---------------------------------------------------------------- the particle in a box
  // A drawing of ψ_n or |ψ_n|² among wrong ones, and the wavelength 2L/n.
  const BOXWRONG = {
    count: () => [L('Count the half waves: the state n has n half waves between the walls (n − 1 nodes inside).', 'Zähle die halben Wellen: Der Zustand n hat n halbe Wellen zwischen den Wänden (n − 1 Knoten innen).'), 'count'],
    walls: () => [L('The particle cannot be at or beyond the walls: ψ must be zero there, like a string fixed at both ends.', 'Das Teilchen kann nicht an oder hinter den Wänden sein: ψ muss dort null sein, wie eine Saite, die an beiden Enden eingespannt ist.'), 'walls'],
    onewall: () => [L('ψ must be zero at both walls, not only at one.', 'ψ muss an beiden Wänden null sein, nicht nur an einer.'), 'walls'],
    outside: () => [L('The walls are infinitely high: the wave cannot go on beyond them, ψ = 0 outside.', 'Die Wände sind unendlich hoch: Die Welle kann nicht über sie hinaus weiterlaufen, ausserhalb ist ψ = 0.'), 'walls'],
    psi: () => [L('That is ψ itself. |ψ|² is never negative: the negative half waves are folded up.', 'Das ist ψ selbst. |ψ|² ist nie negativ: Die negativen halben Wellen werden nach oben geklappt.'), 'psisq'],
    flat: () => [L('A ball bouncing between the walls would be found everywhere alike. The standing wave has places where the particle is never found (the nodes).', 'Eine Kugel, die zwischen den Wänden hin- und herprallt, fände man überall gleich oft. Die stehende Welle hat Stellen, an denen man das Teilchen nie findet (die Knoten).'), 'classical'],
  };
  function boxPick(seed) {
    const r = rng(seed * 47 + 17);
    const nn = r.pick([1, 2, 3, 4]), sq = r.next() < 0.5, other = nn === 1 ? 2 : r.pick([nn - 1, nn + 1]);
    const wrongs = r.shuffle(sq ? ['count', 'psi', 'flat', 'walls'] : ['count', 'walls', 'onewall', 'outside']).slice(0, 3);
    const draw = (k) => G.box({ n: k === 'count' ? other : nn, sq, kind: k === 'count' ? 'ok' : k, small: true, w: 260, h: 130 });
    // the count of half waves is the answer itself: while open, a question instead
    const countNudge = L('Count the half waves between the walls in this drawing: does their number fit this state?', 'Zähle die halben Wellen zwischen den Wänden in dieser Zeichnung: Passt ihre Anzahl zu diesem Zustand?');
    const options = r.shuffle(['ok', ...wrongs].map((k) => { const [why, tag] = k === 'ok' ? ['', undefined] : BOXWRONG[k](); return { html: draw(k), ok: k === 'ok', why, tag, nudge: k === 'count' ? countNudge : '' }; }));
    // the wavelength: 2L/n among L/n, 4L/n, nL/2, 2nL
    const seen = new Set([ofL(2, nn)]), lw = [];
    for (const [a, b, tag] of [[1, nn, 'half'], [nn, 2, 'nl'], [4, nn, 'half'], [2 * nn, 1, 'nl']]) {
      const s = ofL(a, b);
      if (seen.has(s) || lw.length === 3) continue;
      seen.add(s);
      lw.push([`${lam} = ${s}`, false, tag === 'half' ? L(`Each half wave is ${lam}/2 long, and ${n} of them fill the box: ${Lb} = ${n}·${lam}/2.`, `Jede halbe Welle ist ${lam}/2 lang, und ${n} davon füllen den Kasten: ${Lb} = ${n}·${lam}/2.`) : L(`The more half waves fit in, the shorter each: ${lam} = 2${Lb}/${n}.`, `Je mehr halbe Wellen hineinpassen, desto kürzer ist jede: ${lam} = 2${Lb}/${n}.`), tag, tag === 'half' ? L(`How long is one half wave, in terms of ${lam}, and how many of them fill the box?`, `Wie lang ist eine halbe Welle, ausgedrückt durch ${lam}, und wie viele davon füllen den Kasten?`) : L('Does each wave get longer or shorter when more half waves fit in the box?', 'Wird jede Welle länger oder kürzer, wenn mehr halbe Wellen in den Kasten passen?')]);
    }
    const what = sq ? L(`the probability density ${psi2}`, `die Wahrscheinlichkeitsdichte ${psi2}`) : L(`the wavefunction ${i('ψ')}`, `die Wellenfunktion ${i('ψ')}`);
    return {
      title: L('Standing waves in a box', 'Stehende Wellen im Kasten'),
      text: `<p>${L(`A particle is trapped in a box of width ${Lb} with infinitely high walls. It is in the state ${n} = ${nn}${nn === 1 ? ' (the ground state)' : ''}.`, `Ein Teilchen ist in einem Kasten der Breite ${Lb} mit unendlich hohen Wänden gefangen. Es ist im Zustand ${n} = ${nn}${nn === 1 ? ' (dem Grundzustand)' : ''}.`)}</p>`,
      figs: '',
      questions: [
        pick('psi', L(`(a) Which drawing shows ${what} of this state?`, `(a) Welche Zeichnung zeigt ${what} dieses Zustands?`), options),
        choice('lam', L('(b) The wavelength of this state is', '(b) Die Wellenlänge dieses Zustands ist'), opts(r, [[`${lam} = ${ofL(2, nn)}`, true], ...lw])),
      ],
      hints: [
        sq ? L(`The drawings show ${psi2} for the state ${n} = ${nn}, between infinitely high walls. In which of them is ${psi2} zero at both walls and outside, and never negative?`, `Die Zeichnungen zeigen ${psi2} für den Zustand ${n} = ${nn}, zwischen unendlich hohen Wänden. In welchen ist ${psi2} an beiden Wänden und ausserhalb null und nie negativ?`)
          : L(`The drawings show ${i('ψ')} for the state ${n} = ${nn}, between infinitely high walls. In which of them is ${i('ψ')} zero at both walls and outside?`, `Die Zeichnungen zeigen ${i('ψ')} für den Zustand ${n} = ${nn}, zwischen unendlich hohen Wänden. In welchen ist ${i('ψ')} an beiden Wänden und ausserhalb null?`),
        L(`Only standing waves fit, as on a string fixed at both ends: the state ${n} has ${n} half waves between the walls, each ${lam}/2 long, so ${Lb} = ${n}·${lam}/2.`, `Nur stehende Wellen passen, wie auf einer Saite, die an beiden Enden eingespannt ist: Der Zustand ${n} hat ${n} halbe Wellen zwischen den Wänden, jede ${lam}/2 lang, also ${Lb} = ${n}·${lam}/2.`),
        L(`(a) For ${n} = ${nn}: how many ${sq ? `humps above the axis (${psi2} folds the negative half waves up)` : 'half waves'} must the drawing show, and how many nodes inside? (b) Solve ${Lb} = ${n}·${lam}/2 for ${lam}.`, `(a) Für ${n} = ${nn}: Wie viele ${sq ? `Buckel über der Achse (${psi2} klappt die negativen halben Wellen nach oben)` : 'halbe Wellen'} muss die Zeichnung zeigen, und wie viele Knoten innen? (b) Löse ${Lb} = ${n}·${lam}/2 nach ${lam} auf.`),
      ],
      solution: [
        L(`(a) ${nn} half wave${nn > 1 ? 's' : ''} between the walls, zero at both walls and ${nn - 1 === 0 ? 'no node' : nn - 1 === 1 ? 'one node' : `${nn - 1} nodes`} inside${sq ? `; squared, every half wave becomes a hump above the axis: ${nn} hump${nn > 1 ? 's' : ''}` : ''}.`, `(a) ${nn} halbe Welle${nn > 1 ? 'n' : ''} zwischen den Wänden, null an beiden Wänden und ${nn - 1 === 0 ? 'kein Knoten' : nn - 1 === 1 ? 'ein Knoten' : `${nn - 1} Knoten`} innen${sq ? `; quadriert wird jede halbe Welle zu einem Buckel über der Achse: ${nn} Buckel` : ''}.`),
        L(`(b) ${Lb} = ${nn}·${lam}/2, so <b>${lam} = ${ofL(2, nn)}</b>.`, `(b) ${Lb} = ${nn}·${lam}/2, also <b>${lam} = ${ofL(2, nn)}</b>.`),
      ],
      solFig: fig(G.box({ n: nn, sq: false })) + fig(G.box({ n: nn, sq: true })),
      p: { nn, sq, w: wrongs },
    };
  }

  // The energies E_n = n²·E₁ by ratios: a higher state, a wider box or a heavier particle, and why.
  function boxEnergy(seed) {
    const r = rng(seed * 53 + 19);
    const e1 = r.pick([0.5, 1, 1.5, 2, 3]), k = r.pick([2, 3, 4]), ch = r.pick(['wide2', 'narrow2', 'wide3', 'proton']);
    const ev = (x) => `${plain(x, 3)} eV`;
    const CH = {
      wide2: [L('The box is made twice as wide.', 'Der Kasten wird doppelt so breit gemacht.'), [[L('a quarter as large', 'ein Viertel so gross'), true], [L('half as large', 'halb so gross'), false, WHY.lsq(), 'lsq', NUDGE.lsq()], [L('four times as large', 'viermal so gross'), false, L('A wider box fits longer waves: less momentum, less energy.', 'In einen breiteren Kasten passen längere Wellen: weniger Impuls, weniger Energie.'), 'widthdir', L('Check the direction: do longer or shorter waves fit in a wider box? What does that mean for momentum and energy?', 'Prüfe die Richtung: Passen in einen breiteren Kasten längere oder kürzere Wellen? Was heisst das für Impuls und Energie?')], [L('the same', 'gleich gross'), false, L('The wavelength 2L depends on the width, and so do p and E.', 'Die Wellenlänge 2L hängt von der Breite ab, und damit p und E.'), 'other']]],
      narrow2: [L('The box is made half as wide.', 'Der Kasten wird halb so breit gemacht.'), [[L('four times as large', 'viermal so gross'), true], [L('twice as large', 'doppelt so gross'), false, WHY.lsq(), 'lsq', NUDGE.lsq()], [L('a quarter as large', 'ein Viertel so gross'), false, L('A narrower box fits only shorter waves: more momentum, more energy.', 'In einen schmaleren Kasten passen nur kürzere Wellen: mehr Impuls, mehr Energie.'), 'widthdir', L('Check the direction: do longer or shorter waves fit in a narrower box? What does that mean for momentum and energy?', 'Prüfe die Richtung: Passen in einen schmaleren Kasten längere oder kürzere Wellen? Was heisst das für Impuls und Energie?')], [L('the same', 'gleich gross'), false, L('The wavelength 2L depends on the width, and so do p and E.', 'Die Wellenlänge 2L hängt von der Breite ab, und damit p und E.'), 'other']]],
      wide3: [L('The box is made three times as wide.', 'Der Kasten wird dreimal so breit gemacht.'), [[L('a ninth as large', 'ein Neuntel so gross'), true], [L('a third as large', 'ein Drittel so gross'), false, WHY.lsq(), 'lsq', NUDGE.lsq()], [L('nine times as large', 'neunmal so gross'), false, L('A wider box fits longer waves: less momentum, less energy.', 'In einen breiteren Kasten passen längere Wellen: weniger Impuls, weniger Energie.'), 'widthdir', L('Check the direction: do longer or shorter waves fit in a wider box? What does that mean for momentum and energy?', 'Prüfe die Richtung: Passen in einen breiteren Kasten längere oder kürzere Wellen? Was heisst das für Impuls und Energie?')], [L('the same', 'gleich gross'), false, L('The wavelength 2L depends on the width, and so do p and E.', 'Die Wellenlänge 2L hängt von der Breite ab, und damit p und E.'), 'other']]],
      proton: [L('A proton (about 1840 times as heavy) is put in the same box instead.', 'Stattdessen kommt ein Proton (etwa 1840-mal so schwer) in denselben Kasten.'), [[L('about 1840 times smaller', 'etwa 1840-mal kleiner'), true], [L('about 43 times smaller', 'etwa 43-mal kleiner'), false, L('The same box gives the same wavelengths, so the same momenta; E = p²/(2m) is 1840 times smaller, without a square root.', 'Derselbe Kasten ergibt dieselben Wellenlängen, also dieselben Impulse; E = p²/(2m) ist 1840-mal kleiner, ohne Wurzel.'), 'lsq', L('The box is the same: what stays the same, then? How does E = p²/(2m) depend on the mass, with a square root or without?', 'Der Kasten ist derselbe: Was bleibt dann gleich? Wie hängt E = p²/(2m) von der Masse ab, mit oder ohne Wurzel?')], [L('about 1840 times larger', 'etwa 1840-mal grösser'), false, L('Same p, larger m: E = p²/(2m) is smaller.', 'Gleiches p, grösseres m: E = p²/(2m) ist kleiner.'), 'mass', L('Check the direction: does E = p²/(2m) grow or shrink with the same p and a larger mass?', 'Prüfe die Richtung: Wird E = p²/(2m) bei gleichem p und grösserer Masse grösser oder kleiner?')], [L('the same', 'gleich gross'), false, L('The momenta are the same, but E = p²/(2m) depends on the mass.', 'Die Impulse sind gleich, aber E = p²/(2m) hängt von der Masse ab.'), 'mass']]],
    }[ch];
    return {
      title: L('The energies in a box', 'Die Energien im Kasten'),
      text: `<p>${L(`An electron is trapped in a box with infinitely high walls (a model of a thin layer or a long molecule). Its lowest energy is ${E1} = ${ev(e1)}.`, `Ein Elektron ist in einem Kasten mit unendlich hohen Wänden gefangen (ein Modell einer dünnen Schicht oder eines langen Moleküls). Seine kleinste Energie ist ${E1} = ${ev(e1)}.`)}</p>`,
      figs: fig(G.levels(3)),
      questions: [
        numQ('E', L(`(a) the energy of the state ${n} = ${k}, without a calculator`, `(a) die Energie des Zustands ${n} = ${k}, ohne Taschenrechner`), `${i('E')}${sb(k)}`, 'eV', k * k * e1, { wrong: [{ value: k * e1, tag: 'linear', why: WHY.nsq(), nudge: NUDGE.nsq() }] }),
        choice('ch', L(`(b) ${CH[0]} The lowest energy becomes`, `(b) ${CH[0]} Die kleinste Energie wird`), opts(r, CH[1])),
        choice('why', L('(c) Why can the electron have only certain energies?', '(c) Warum kann das Elektron nur bestimmte Energien haben?'), opts(r, [
          [L('Only standing waves with a whole number of half waves fit between the walls; each has its own wavelength, so its own momentum and energy.', 'Nur stehende Wellen mit einer ganzen Zahl halber Wellen passen zwischen die Wände; jede hat ihre eigene Wellenlänge, also ihren eigenen Impuls und ihre eigene Energie.'), true],
          [L('Energies in between are possible, only less likely.', 'Energien dazwischen sind möglich, nur weniger wahrscheinlich.'), false, L('In between, no standing wave fits: ψ could not be zero at both walls. Such states do not exist at all.', 'Dazwischen passt keine stehende Welle: ψ könnte nicht an beiden Wänden null sein. Solche Zustände gibt es gar nicht.'), 'classical', L('Which waves fit between the walls if ψ must be zero at both? Are there states in between at all?', 'Welche Wellen passen zwischen die Wände, wenn ψ an beiden null sein muss? Gibt es dazwischen überhaupt Zustände?')],
          [L('The electron bounces between the walls, and it can only bounce at certain speeds.', 'Das Elektron prallt zwischen den Wänden hin und her, und das geht nur mit bestimmten Geschwindigkeiten.'), false, L('A ball bouncing between walls could have any speed. The energies are fixed because a standing wave must fit.', 'Eine Kugel, die zwischen Wänden hin- und herprallt, könnte jede Geschwindigkeit haben. Die Energien sind festgelegt, weil eine stehende Welle passen muss.'), 'classical', L('A ball bouncing between walls could have any speed. What is different for the electron in the box?', 'Eine Kugel, die zwischen Wänden hin- und herprallt, könnte jede Geschwindigkeit haben. Was ist beim Elektron im Kasten anders?')],
          [L('The walls absorb all other energies.', 'Die Wände absorbieren alle anderen Energien.'), false, L('The walls do nothing but keep ψ zero at the ends. That condition alone picks the wavelengths and so the energies.', 'Die Wände tun nichts, als ψ an den Enden auf null zu halten. Diese Bedingung allein wählt die Wellenlängen und damit die Energien aus.'), 'other', L('The walls do nothing but keep ψ zero at the ends. Which waves meet that condition?', 'Die Wände tun nichts, als ψ an den Enden auf null zu halten. Welche Wellen erfüllen diese Bedingung?')],
        ])),
      ],
      hints: [
        L(`The ground state has ${E1} = ${ev(e1)}. (a) asks for the state ${n} = ${k} in the same box; in (b), ${ch === 'proton' ? 'a proton takes the place of the electron' : 'the width of the box changes'}. Which of ${n}, ${Lb} and ${m} changes in each part?`, `Der Grundzustand hat ${E1} = ${ev(e1)}. (a) fragt nach dem Zustand ${n} = ${k} im selben Kasten; in (b) ${ch === 'proton' ? 'tritt ein Proton an die Stelle des Elektrons' : 'ändert sich die Breite des Kastens'}. Welche der Grössen ${n}, ${Lb} und ${m} ändert sich in jedem Teil?`),
        L(`${lam}${sb('n')} = 2${Lb}/${n}, so ${p}${sb('n')} = ${h}/${lam}${sb('n')} = ${n}·${h}/(2${Lb}) and ${i('E')}${sb('n')} = ${p}²/(2${m}) = ${n}²·${h}²/(8${m}${Lb}²) = ${n}²·${E1}.`, `${lam}${sb('n')} = 2${Lb}/${n}, also ${p}${sb('n')} = ${h}/${lam}${sb('n')} = ${n}·${h}/(2${Lb}) und ${i('E')}${sb('n')} = ${p}²/(2${m}) = ${n}²·${h}²/(8${m}${Lb}²) = ${n}²·${E1}.`),
        L(`(a) ${n} goes from 1 to ${k}: which power of that factor multiplies ${E1}? (b) ${ch === 'proton' ? `The box stays the same: what about the wavelengths 2${Lb}/${n} and the momenta? Then only ${m} in ${i('E')} = ${p}²/(2${m}) changes, by about 1840.` : `${Lb} is multiplied by ${ch === 'narrow2' ? '1/2' : ch === 'wide2' ? '2' : '3'}: in ${i('E')} ∝ 1/${Lb}², which power of that factor, and up or down?`}`, `(a) ${n} geht von 1 auf ${k}: Welche Potenz dieses Faktors multipliziert ${E1}? (b) ${ch === 'proton' ? `Der Kasten bleibt derselbe: Was ist mit den Wellenlängen 2${Lb}/${n} und den Impulsen? Dann ändert sich nur ${m} in ${i('E')} = ${p}²/(2${m}), um etwa 1840.` : `${Lb} wird mit ${ch === 'narrow2' ? '1/2' : ch === 'wide2' ? '2' : '3'} multipliziert: In ${i('E')} ∝ 1/${Lb}² welche Potenz dieses Faktors, und grösser oder kleiner?`}`),
      ],
      solution: [
        L(`(a) ${i('E')}${sb(k)} = ${k}²·${E1} = ${k * k} · ${ev(e1)} = <b>${ev(k * k * e1)}</b>.`, `(a) ${i('E')}${sb(k)} = ${k}²·${E1} = ${k * k} · ${ev(e1)} = <b>${ev(k * k * e1)}</b>.`),
        { wide2: L(`(b) ${E1} ∝ 1/${Lb}²: twice the width, <b>a quarter</b> of the energy, ${ev(e1 / 4)}.`, `(b) ${E1} ∝ 1/${Lb}²: doppelte Breite, <b>ein Viertel</b> der Energie, ${ev(e1 / 4)}.`),
          narrow2: L(`(b) ${E1} ∝ 1/${Lb}²: half the width, <b>four times</b> the energy, ${ev(e1 * 4)}.`, `(b) ${E1} ∝ 1/${Lb}²: halbe Breite, <b>vierfache</b> Energie, ${ev(e1 * 4)}.`),
          wide3: L(`(b) ${E1} ∝ 1/${Lb}²: three times the width, <b>a ninth</b> of the energy, ${ev(e1 / 9)}.`, `(b) ${E1} ∝ 1/${Lb}²: dreifache Breite, <b>ein Neuntel</b> der Energie, ${ev(e1 / 9)}.`),
          proton: L(`(b) The same box, the same wavelengths and momenta; ${E1} = ${p}²/(2${m}) ∝ 1/${m}: <b>about 1840 times smaller</b>. Heavy particles in a box hardly show their quantised energies.`, `(b) Derselbe Kasten, dieselben Wellenlängen und Impulse; ${E1} = ${p}²/(2${m}) ∝ 1/${m}: <b>etwa 1840-mal kleiner</b>. Schwere Teilchen im Kasten zeigen ihre gequantelten Energien kaum.`) }[ch],
        L('(c) The walls force ψ = 0 at both ends: only <b>a whole number of half waves</b> fits, λ = 2L/n. Each such wave has its own momentum h/λ and energy p²/(2m); nothing in between fits. That is why the energies are quantised.', '(c) Die Wände erzwingen ψ = 0 an beiden Enden: Nur <b>eine ganze Zahl halber Wellen</b> passt, λ = 2L/n. Jede solche Welle hat ihren eigenen Impuls h/λ und ihre eigene Energie p²/(2m); nichts dazwischen passt. Deshalb sind die Energien gequantelt.'),
      ],
      p: { e1, k, ch },
    };
  }

  // ---------------------------------------------------------------- probability and uncertainty
  // Reading |ψ|²: where the particle is likely found, the expectation value and the uncertainty Δx,
  // and what Δx means (not a measurement error).
  const SIGMAS = [0.035, 0.06, 0.1, 0.16];
  function density(seed) {
    const r = rng(seed * 59 + 23);
    const v = r.pick(['wide', 'narrow', 'mean', 'likely']);
    const meaning = choice('dx', L(`(b) The uncertainty ${dx} of a state means`, `(b) Die Unschärfe ${dx} eines Zustands bedeutet`), opts(r, [
      [L('the spread of the positions found when the position is measured on many particles in this same state', 'die Streuung der Orte, die man findet, wenn man den Ort an vielen Teilchen in diesem selben Zustand misst'), true],
      [L('the error of the instrument that measures the position', 'den Fehler des Instruments, das den Ort misst'), false, L(`Even with a perfect instrument the results scatter: ${dx} belongs to the state, not to the instrument.`, `Auch mit einem perfekten Instrument streuen die Ergebnisse: ${dx} gehört zum Zustand, nicht zum Instrument.`), 'error', L(`Would the results scatter with a perfect instrument too? Does ${dx} belong to the instrument or to the state?`, `Würden die Ergebnisse auch mit einem perfekten Instrument streuen? Gehört ${dx} zum Instrument oder zum Zustand?`)],
      [L('that the particle has an exact position, which we do not know', 'dass das Teilchen einen genauen Ort hat, den wir nicht kennen'), false, L('In this state the particle has no exact position. Each measurement finds one place, but which one is a matter of chance.', 'In diesem Zustand hat das Teilchen keinen genauen Ort. Jede Messung findet einen Ort, aber welchen, ist Zufall.'), 'hidden', L('Does the particle in this state have an exact position at all, which we only do not know? What do many measurements find?', 'Hat das Teilchen in diesem Zustand überhaupt einen genauen Ort, den man nur nicht kennt? Was findet man bei vielen Messungen?')],
      [L('how far the measurement pushes the particle', 'wie weit die Messung das Teilchen verschiebt'), false, L(`${dx} is there before any measurement: it is the width of ${psi2} of the state.`, `${dx} ist schon vor jeder Messung da: Es ist die Breite von ${psi2} des Zustands.`), 'error', L(`Is ${dx} there only after a measurement, or before it? What does the width of ${psi2} show?`, `Ist ${dx} erst nach einer Messung da oder schon vorher? Was zeigt die Breite von ${psi2}?`)],
    ]));
    if (v === 'wide' || v === 'narrow') {
      const sig = r.shuffle(SIGMAS), mus = sig.map(() => r.pick([0.35, 0.42, 0.5, 0.58, 0.65])), ymax = 1.08 / (SIGMAS[0] * Math.sqrt(2 * Math.PI));
      const widest = sig.indexOf(Math.max(...sig)), narrowest = sig.indexOf(Math.min(...sig)), best = v === 'wide' ? widest : narrowest;
      const whyOf = (k) => (v === 'wide'
        ? (k === narrowest ? [L(`The highest peak is the narrowest: the area under ${psi2} is always 1. ${dx} is the width of the curve.`, `Der höchste Gipfel ist der schmalste: Die Fläche unter ${psi2} ist immer 1. ${dx} ist die Breite der Kurve.`), 'height'] : [L(`${dx} is the width of ${psi2}; where the curve lies does not matter. Another curve is wider.`, `${dx} ist die Breite von ${psi2}; wo die Kurve liegt, spielt keine Rolle. Eine andere Kurve ist breiter.`), 'width'])
        : (k === widest ? [L(`The widest ${psi2} has the largest ${dx}, so ${dp} can be the smallest: ${dx}·${dp} ≥ ${h}/(4π).`, `Das breiteste ${psi2} hat das grösste ${dx}, also kann ${dp} am kleinsten sein: ${dx}·${dp} ≥ ${h}/(4π).`), 'heisenberg'] : [L(`Compare the widths: the narrowest ${psi2} has the smallest ${dx}, so the largest ${dp}.`, `Vergleiche die Breiten: Das schmalste ${psi2} hat das kleinste ${dx}, also das grösste ${dp}.`), 'heisenberg']));
      // the nudges while the exercise is open
      const nudgeOf = (k) => (v === 'wide'
        ? (k === narrowest ? L(`The highest peak is the narrowest, as the area under ${psi2} is always 1. What does ${dx} measure: the height or the width?`, `Der höchste Gipfel ist der schmalste, weil die Fläche unter ${psi2} immer 1 ist. Was misst ${dx}: die Höhe oder die Breite?`) : L(`Does it matter for ${dx} where the curve lies? Compare the widths of the curves.`, `Spielt es für ${dx} eine Rolle, wo die Kurve liegt? Vergleiche die Breiten der Kurven.`))
        : (k === widest ? L(`Which curve has the largest ${dx}? What follows for ${dp} by Heisenberg?`, `Welche Kurve hat das grösste ${dx}? Was folgt daraus mit Heisenberg für ${dp}?`) : L(`Compare the widths of the curves: which has the smallest ${dx}, and what does that mean for ${dp}?`, `Vergleiche die Breiten der Kurven: Welche hat das kleinste ${dx}, und was heisst das für ${dp}?`)));
      const options = sig.map((s, k) => { const [why, tag] = k === best ? ['', undefined] : whyOf(k); return { html: G.packet(mus[k], s, { ymax, small: true }), ok: k === best, why, tag, nudge: k === best ? '' : nudgeOf(k) }; });
      return {
        title: L('Reading |ψ|²', '|ψ|² lesen'),
        text: `<p>${L(`The drawings show the probability density ${psi2} of four states of a particle, to the same scale.`, `Die Zeichnungen zeigen die Wahrscheinlichkeitsdichte ${psi2} von vier Zuständen eines Teilchens, im selben Massstab.`)}</p>`,
        figs: '',
        questions: [
          pick('w', v === 'wide' ? L(`(a) In which state is the uncertainty of the position, ${dx}, largest?`, `(a) In welchem Zustand ist die Unschärfe des Orts, ${dx}, am grössten?`) : L(`(a) In which state is the uncertainty of the momentum, ${dp}, surely largest?`, `(a) In welchem Zustand ist die Unschärfe des Impulses, ${dp}, sicher am grössten?`), options),
          meaning,
        ],
        hints: [
          L(`The four curves lie at different places and have different heights and widths. (a) asks for the ${v === 'wide' ? `largest ${dx}` : `surely largest ${dp}`}: which of these features of a curve ${v === 'wide' ? 'gives' : 'first gives'} ${dx}: its place, its height or its width?`, `Die vier Kurven liegen an verschiedenen Orten und sind verschieden hoch und breit. (a) fragt nach dem ${v === 'wide' ? `grössten ${dx}` : `sicher grössten ${dp}`}: Welches dieser Merkmale einer Kurve ${v === 'wide' ? 'gibt' : 'gibt zuerst'} ${dx}: ihr Ort, ihre Höhe oder ihre Breite?`),
          v === 'wide' ? L(`${psi2} tells where the particle is likely to be found, and the area under each curve is 1: a narrow curve must be high. ${dx} is the spread of the positions found.`, `${psi2} sagt, wo man das Teilchen wahrscheinlich findet, und die Fläche unter jeder Kurve ist 1: Eine schmale Kurve muss hoch sein. ${dx} ist die Streuung der gefundenen Orte.`)
            : L(`Heisenberg: ${dx}·${dp} ≥ ${h}/(4π), with ${dx} the spread of the positions in ${psi2}. Which ${dx} forces the largest ${dp}?`, `Heisenberg: ${dx}·${dp} ≥ ${h}/(4π), mit ${dx} der Streuung der Orte in ${psi2}. Welches ${dx} erzwingt das grösste ${dp}?`),
          L(`(b) Imagine measuring the position of many particles in this same state with a perfect instrument: would the results still scatter, as ${psi2} says?`, `(b) Stell dir vor, du misst den Ort vieler Teilchen in diesem selben Zustand mit einem perfekten Instrument: Würden die Ergebnisse immer noch streuen, so wie ${psi2} es sagt?`),
        ],
        solution: [
          v === 'wide' ? L(`(a) ${dx} is the width of ${psi2}: <b>the widest curve</b>, which is also the lowest, since the area is always 1.`, `(a) ${dx} ist die Breite von ${psi2}: <b>die breiteste Kurve</b>, die auch die niedrigste ist, weil die Fläche immer 1 ist.`)
            : L(`(a) The narrowest ${psi2} has the smallest ${dx}, so by ${dx}·${dp} ≥ ${h}/(4π) the largest ${dp}: <b>the narrowest, highest curve</b>.`, `(a) Das schmalste ${psi2} hat das kleinste ${dx}, also wegen ${dx}·${dp} ≥ ${h}/(4π) das grösste ${dp}: <b>die schmalste, höchste Kurve</b>.`),
          L(`(b) Measure the position of many particles in the same state with a perfect instrument: each measurement gives one sharp place, but the places scatter as ${psi2} says. <b>${dx} is that spread</b>, a property of the state, not an error of the measurement.`, `(b) Miss den Ort vieler Teilchen im selben Zustand mit einem perfekten Instrument: Jede Messung ergibt einen scharfen Ort, aber die Orte streuen so, wie ${psi2} es sagt. <b>${dx} ist diese Streuung</b>, eine Eigenschaft des Zustands, kein Fehler der Messung.`),
        ],
        p: { v, sig },
      };
    }
    // the state n = 2 in a box: zero in the middle, yet the mean is there
    const qa = v === 'mean' ? choice('m', L(`(a) Where is the expectation value ${xm}, the mean of many measurements of the position?`, `(a) Wo liegt der Erwartungswert ${xm}, der Mittelwert vieler Messungen des Orts?`), opts(r, [
      [`${xm} = ${ofL(1, 2)}`, true],
      [`${xm} = ${ofL(1, 4)}`, false, L(`Near ${ofL(1, 4)} and ${ofL(3, 4)} the particle is most likely found. The mean of all the places is in the middle, by symmetry.`, `Bei ${ofL(1, 4)} und ${ofL(3, 4)} findet man das Teilchen am wahrscheinlichsten. Der Mittelwert aller Orte liegt aus Symmetriegründen in der Mitte.`), 'mean', L('There the particle is most likely found. Is the mean of all the places the same as the most likely place? Think of the symmetry.', 'Dort findet man das Teilchen am wahrscheinlichsten. Ist der Mittelwert aller Orte dasselbe wie der wahrscheinlichste Ort? Denk an die Symmetrie.')],
      [`${xm} = ${ofL(3, 4)}`, false, L(`Near ${ofL(1, 4)} and ${ofL(3, 4)} the particle is most likely found. The mean of all the places is in the middle, by symmetry.`, `Bei ${ofL(1, 4)} und ${ofL(3, 4)} findet man das Teilchen am wahrscheinlichsten. Der Mittelwert aller Orte liegt aus Symmetriegründen in der Mitte.`), 'mean', L('There the particle is most likely found. Is the mean of all the places the same as the most likely place? Think of the symmetry.', 'Dort findet man das Teilchen am wahrscheinlichsten. Ist der Mittelwert aller Orte dasselbe wie der wahrscheinlichste Ort? Denk an die Symmetrie.')],
      [L(`there is none: the particle is never found at ${ofL(1, 2)}`, `es gibt keinen: Das Teilchen ist nie bei ${ofL(1, 2)}`), false, L('A mean need not be a likely place: the mean of 1 and 3 is 2. Half the results lie left, half right: the mean is L/2.', 'Ein Mittelwert muss kein wahrscheinlicher Ort sein: Der Mittelwert von 1 und 3 ist 2. Die Hälfte der Ergebnisse liegt links, die Hälfte rechts: Der Mittelwert ist L/2.'), 'mean', L('Must a mean be a likely place? What is the mean of 1 and 3?', 'Muss ein Mittelwert ein wahrscheinlicher Ort sein? Was ist der Mittelwert von 1 und 3?')],
    ])) : choice('m', L('(a) Where is the particle most likely to be found?', '(a) Wo findet man das Teilchen am wahrscheinlichsten?'), opts(r, [
      [L(`near ${ofL(1, 4)} and near ${ofL(3, 4)}`, `bei ${ofL(1, 4)} und bei ${ofL(3, 4)}`), true],
      [L(`at ${ofL(1, 2)}, in the middle`, `bei ${ofL(1, 2)}, in der Mitte`), false, L(`There ${psi2} is zero: the particle is never found in the middle. ${ofL(1, 2)} is only the mean of the places found.`, `Dort ist ${psi2} null: In der Mitte findet man das Teilchen nie. ${ofL(1, 2)} ist nur der Mittelwert der gefundenen Orte.`), 'mean'],
      [L('everywhere in the box equally', 'überall im Kasten gleich'), false, BOXWRONG.flat()[0], 'classical'],
      [L('near the walls', 'bei den Wänden'), false, BOXWRONG.walls()[0], 'walls'],
    ]));
    return {
      title: L('Reading |ψ|² in a box', '|ψ|² im Kasten lesen'),
      text: `<p>${L(`A particle in a box of width ${Lb} is in the state ${n} = 2. The drawing shows its probability density ${psi2}.`, `Ein Teilchen in einem Kasten der Breite ${Lb} ist im Zustand ${n} = 2. Die Zeichnung zeigt seine Wahrscheinlichkeitsdichte ${psi2}.`)}</p>`,
      figs: fig(G.box({ n: 2, sq: true, ticks: true })),
      questions: [qa, meaning],
      hints: [
        L(`The drawing shows ${psi2} of the state ${n} = 2, with ticks along the box from 0 to ${Lb}. Read off where the curve is high, where it is zero, and whether it is symmetric.`, `Die Zeichnung zeigt ${psi2} des Zustands ${n} = 2, mit Marken entlang des Kastens von 0 bis ${Lb}. Lies ab, wo die Kurve hoch ist, wo sie null ist und ob sie symmetrisch ist.`),
        v === 'mean' ? L(`The expectation value ${xm} is the mean of many measurements of the position, each place weighted by ${psi2}. It need not be a place where the particle is ever found: the mean of 1 and 3 is 2.`, `Der Erwartungswert ${xm} ist der Mittelwert vieler Messungen des Orts, jeder Ort gewichtet mit ${psi2}. Er muss kein Ort sein, an dem man das Teilchen je findet: Der Mittelwert von 1 und 3 ist 2.`)
          : L(`${psi2} is high where the particle is likely to be found and zero where it is never found. The most likely place need not be the mean ${xm} of the places.`, `${psi2} ist hoch, wo man das Teilchen wahrscheinlich findet, und null, wo man es nie findet. Der wahrscheinlichste Ort muss nicht der Mittelwert ${xm} der Orte sein.`),
        L(`(b) Imagine measuring the position of many particles in this same state with a perfect instrument: would the results still scatter, as ${psi2} says?`, `(b) Stell dir vor, du misst den Ort vieler Teilchen in diesem selben Zustand mit einem perfekten Instrument: Würden die Ergebnisse immer noch streuen, so wie ${psi2} es sagt?`),
      ],
      solution: [
        v === 'mean' ? L(`(a) ${psi2} is symmetric about the middle: as many results left as right, so <b>${xm} = ${ofL(1, 2)}</b>, although the particle is never found exactly there.`, `(a) ${psi2} ist symmetrisch zur Mitte: gleich viele Ergebnisse links wie rechts, also <b>${xm} = ${ofL(1, 2)}</b>, obwohl man das Teilchen genau dort nie findet.`)
          : L(`(a) ${psi2} is highest <b>near ${ofL(1, 4)} and ${ofL(3, 4)}</b> and zero at the walls and in the middle.`, `(a) ${psi2} ist am höchsten <b>bei ${ofL(1, 4)} und ${ofL(3, 4)}</b> und null an den Wänden und in der Mitte.`),
        L(`(b) <b>${dx} is the spread of the positions found</b> on many particles in the same state, here ${dx} ≈ 0.27·${Lb}: a property of the state, not an error of the measurement.`, `(b) <b>${dx} ist die Streuung der gefundenen Orte</b> an vielen Teilchen im selben Zustand, hier ${dx} ≈ 0.27·${Lb}: eine Eigenschaft des Zustands, kein Fehler der Messung.`),
      ],
      p: { v },
    };
  }

  const BANK_U = [
    [() => L('The uncertainty relation only says that our instruments are not exact enough.', 'Die Unschärferelation sagt nur, dass unsere Instrumente nicht genau genug sind.'), false, () => L('It is a property of the particle itself: it does not have an exact position and an exact momentum at once.', 'Sie ist eine Eigenschaft des Teilchens selbst: Es hat nicht zugleich einen genauen Ort und einen genauen Impuls.')],
    [() => L('An electron cannot have an exact position and an exact momentum at the same time.', 'Ein Elektron kann nicht zugleich einen genauen Ort und einen genauen Impuls haben.'), true, () => L('Δx·Δp ≥ h/(4π).', 'Δx·Δp ≥ h/(4π).')],
    [() => L('The more precisely the position is fixed, the larger the spread of the momentum.', 'Je genauer der Ort festgelegt ist, desto grösser die Streuung des Impulses.'), true, () => L('Δp ≥ h/(4π·Δx).', 'Δp ≥ h/(4π·Δx).')],
    [() => L('For a tennis ball, the uncertainty relation does not hold.', 'Für einen Tennisball gilt die Unschärferelation nicht.'), false, () => L('It holds, but h is so small that the uncertainties are far below anything measurable.', 'Sie gilt, aber h ist so klein, dass die Unschärfen weit unter allem Messbaren liegen.')],
    [() => L('An electron confined to a tiny region has a minimum kinetic energy.', 'Ein Elektron, das auf einen winzigen Bereich beschränkt ist, hat eine minimale kinetische Energie.'), true, () => L('A small Δx forces a large Δp, so the momentum cannot be zero.', 'Ein kleines Δx erzwingt ein grosses Δp, also kann der Impuls nicht null sein.')],
    [() => L('With a good enough microscope, one could follow the orbit of an electron in an atom.', 'Mit einem genügend guten Mikroskop könnte man die Bahn eines Elektrons im Atom verfolgen.'), false, () => L('An exact path would need exact position and momentum at once: there is no such orbit.', 'Eine genaue Bahn bräuchte zugleich genauen Ort und Impuls: Eine solche Bahn gibt es nicht.')],
    [() => L('A narrower slit makes the diffraction pattern behind it narrower.', 'Ein schmalerer Spalt macht das Beugungsmuster dahinter schmaler.'), false, () => L('A narrower slit (smaller Δx) means a larger Δp sideways: the pattern gets wider.', 'Ein schmalerer Spalt (kleineres Δx) bedeutet ein grösseres Δp seitwärts: Das Muster wird breiter.')],
    [() => L('Δx·Δp ≥ h/(4π) links position and momentum in the same direction.', 'Δx·Δp ≥ h/(4π) verknüpft Ort und Impuls in derselben Richtung.'), true, () => L('Position in x and momentum in y are not linked.', 'Ort in x und Impuls in y sind nicht verknüpft.')],
    [() => L('A particle locked in a box can never be completely at rest.', 'Ein Teilchen, das in eine Kiste gesperrt ist, kann nie ganz ruhen.'), true, () => L('At rest, Δp = 0, which would need Δx = ∞.', 'In Ruhe wäre Δp = 0, und das bräuchte Δx = ∞.')],
    [() => L('If the momentum of an electron is known exactly, its position is completely undetermined.', 'Ist der Impuls eines Elektrons genau bekannt, ist sein Ort völlig unbestimmt.'), true, () => L('Δp → 0 means Δx → ∞: a wave of one wavelength fills all space.', 'Δp → 0 heisst Δx → ∞: Eine Welle mit einer Wellenlänge füllt den ganzen Raum.')],
    [() => L('More modern instruments have beaten Heisenberg’s limit.', 'Modernere Instrumente haben Heisenbergs Grenze unterboten.'), false, () => L('No experiment has ever beaten it: it is not a limit of the instruments.', 'Kein Experiment hat sie je unterboten: Sie ist keine Grenze der Instrumente.')],
    [() => L('The smaller the mass, the larger the uncertainty of the velocity for the same Δx.', 'Je kleiner die Masse, desto grösser die Unschärfe der Geschwindigkeit bei gleichem Δx.'), true, () => L('Δv = Δp/m.', 'Δv = Δp/m.')],
  ];
  function stmts(bank, seed, salt) {
    const r = rng(seed * 61 + salt);
    for (;;) {
      const pk = r.shuffle(bank).slice(0, 5);
      if (pk.every((s) => s[1]) || pk.every((s) => !s[1])) continue;
      return { pk, idx: pk.map((s) => bank.indexOf(s)) };
    }
  }
  // the hints: one for each topic among the statements picked (BANK_U indices), naming them by their place from the top
  const TOPICS_U = [
    [[0, 10], () => L('the instruments', 'die Instrumente'), () => L('is the limit set by the instruments, or by the particle itself? Would a perfect instrument get round it?', 'ist die Grenze durch die Instrumente gegeben oder durch das Teilchen selbst? Käme ein perfektes Instrument darum herum?')],
    [[1, 5, 9], () => L('an exact position and an exact momentum', 'ein genauer Ort und ein genauer Impuls'), () => L(`in ${dx}·${dp} ≥ ${h}/(4π), can both factors be zero at once? What would an exact path need?`, `kann in ${dx}·${dp} ≥ ${h}/(4π) beides zugleich null sein? Was bräuchte eine genaue Bahn?`)],
    [[2, 6], () => L(`${dx} against ${dp}`, `${dx} gegen ${dp}`), () => L(`if ${dx} gets smaller, what must ${dp} do? A slit fixes ${dx} sideways.`, `wenn ${dx} kleiner wird, was muss ${dp} tun? Ein Spalt legt ${dx} seitwärts fest.`)],
    [[4, 8], () => L('a particle confined', 'ein eingesperrtes Teilchen'), () => L(`a box or a tiny region limits ${dx}: what does that mean for ${dp}, and so for the momentum itself?`, `ein Kasten oder ein winziger Bereich begrenzt ${dx}: Was heisst das für ${dp} und damit für den Impuls selbst?`)],
    [[3, 11], () => L('heavy and light bodies', 'schwere und leichte Körper'), () => L(`${dp} = ${m}·Δ${v}: what does a large or a small mass make of the same ${dp}? And how small is ${h}?`, `${dp} = ${m}·Δ${v}: Was macht eine grosse oder eine kleine Masse aus demselben ${dp}? Und wie klein ist ${h}?`)],
    [[7], () => L('the directions', 'die Richtungen'), () => L(`a slit limits ${dx} sideways: in which direction does the momentum spread?`, `ein Spalt begrenzt ${dx} seitwärts: In welcher Richtung streut der Impuls?`)],
  ];
  function uncertHints(idx) {
    const out = [];
    for (const [set, name, rule] of TOPICS_U) {
      const ks = idx.map((b, k) => [b, k + 1]).filter(([b]) => set.includes(b)).map(([, k]) => k);
      if (!ks.length) continue;
      const list = ks.length === 1 ? String(ks[0]) : `${ks.slice(0, -1).join(', ')}${L(' and ', ' und ')}${ks[ks.length - 1]}`;
      const r0 = rule();
      out.push(L(`${ks.length === 1 ? 'Statement' : 'Statements'} ${list} (from the top): ${name()}. ${r0.charAt(0).toUpperCase() + r0.slice(1)}`, `${ks.length === 1 ? 'Aussage' : 'Aussagen'} ${list} (von oben): ${name()}. ${r0.charAt(0).toUpperCase() + r0.slice(1)}`));
    }
    if (out.length < 2) out.push(L('Take the statements one by one: is each about the particle itself or about the measurement?', 'Nimm die Aussagen einzeln: Handelt jede vom Teilchen selbst oder von der Messung?'));
    return out;
  }
  function uncertStmts(seed) {
    const { pk, idx } = stmts(BANK_U, seed, 37);
    return {
      title: L('The uncertainty relation: which statements are correct?', 'Die Unschärferelation: Welche Aussagen sind richtig?'),
      text: L('<p>Heisenberg: Δx·Δp ≥ h/(4π). Tick all the statements that are correct.</p>', '<p>Heisenberg: Δx·Δp ≥ h/(4π). Kreuze alle richtigen Aussagen an.</p>'), figs: '',
      questions: [multi('s', pk.map(([t, ok, why]) => ({ html: t(), ok, why: why() })))],
      hints: uncertHints(idx),
      solution: pk.map(([t, ok, why]) => `${ok ? '✓' : '✗'} ${t()} ${why()}`),
      p: { s: idx },
    };
  }


  // ---------------------------------------------------------------- all types
  const TYPES = {
    debroglie: [1, debroglie], 'same-lambda': [2, sameLambda], diffraction: [2, diffraction],
    'box-pick': [2, boxPick], 'box-energy': [2, boxEnergy],
    density: [2, density], 'uncert-stmts': [2, uncertStmts],
  };
  function make(type, seed) {
    const [difficulty, fn] = TYPES[type];
    return { ...fn(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }

  const api = { TYPES: Object.keys(TYPES), make, BANK_U, WHY, NUDGE, i, sb, numQ, choice, pick, opts, fig, ofL };
  root.MatterEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
