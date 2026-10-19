// The exercises, with their texts, in the current language (the app rebuilds them when the
// language changes). Every exercise has the form
//   { id, type, kind, difficulty, title, text, figs (HTML), questions, hints, solution (HTML
//     paragraphs), solFig, p (what makes it new to the student) }
// with questions of four kinds:
//   { type: 'tiles', key, label, multi, options: [{ html, ok, why, tag }] }   names to choose: one
//        (multi false), or all that fit (multi true: more than one may be right)
//   { type: 'pick', key, label, options: [{ html, ok, why, tag }] }           one of four drawings
//   { type: 'choice', key, label, options: [{ label, ok, why, tag }] }        one of a few values
//   { type: 'multi', key, label, statements: [{ html, ok, why }] }            statements to tick
// tag: the wrong idea behind a wrong option (app.js names them in the check). A wrong option may
// also carry a nudge: the feedback in practice while the exercise is open, where its why would
// give the answer away (the why is shown in the check and once the exercise is solved).
// The types:
//   accel, accel-compare, stop, ev   the acceleration voltage: |q|·U = ΔE_kin, electronvolts
//   deflect-path, deflect-compare    a charge flying into a capacitor: its path; two deflections
//   path-circle, speed               a charge flying into a magnetic field: its path; why its speed
//                                    stays the same (the magnetic force does no work)
//   radius-compare, tracks           radius and period by ratios; tracks in a bubble chamber
//   selector, crossed-dir, hall      crossed fields: the velocity selector; the direction of E or B
//                                    in it; the Hall voltage
//   stmts                            which statements are correct?
(function (root) {
  'use strict';

  const M = root.Particles || require('./generator.js');
  const P = root.PartPlot || require('./plot.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const { rng, key, force, path } = M;
  const { pathFig, tracksFig, selectorFig, accelFig, capFig, hallFig } = P;

  // ---------------------------------------------------------------- words and numbers
  const DIR = {
    '1,0,0': ['to the right', 'nach rechts'], '-1,0,0': ['to the left', 'nach links'], '0,1,0': ['upwards', 'nach oben'], '0,-1,0': ['downwards', 'nach unten'],
    '0,0,1': ['out of the page', 'aus der Seite heraus'], '0,0,-1': ['into the page', 'in die Seite hinein'],
  };
  const dirName = (d) => L(...DIR[key(d)]);
  const it = (s) => `<i>${s}</i>`;
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const fig = (html) => `<div class="fig">${html}</div>`;
  const nice = (x) => String(Number(x.toPrecision(3)));
  const sci = (x) => {
    const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), m = x / 10 ** e;
    if (e >= -2 && e <= 3) return nice(x);
    return `${Number(m.toPrecision(3))} · 10<sup>${e < 0 ? '−' + -e : e}</sup>`;
  };
  // a value in the best of a set of units [[factor, name], …] (largest first)
  const inUnits = (x, set) => { const [f, u] = set.find(([k]) => x >= k * 0.999) || set[set.length - 1]; return `${nice(x / f)} ${u}`; };
  const EV = [[1e6, 'MeV'], [1e3, 'keV'], [1, 'eV']], VOLT = [[1e6, 'MV'], [1e3, 'kV'], [1, 'V']];
  const inEV = (x) => inUnits(x, EV), inV = (x) => inUnits(x, VOLT);
  // a factor as ×2, ×1/3, ×√2 or ×1/√2
  const whole = (x) => x > 0 && [x, 1 / x].some((y) => Math.abs(y - Math.round(y)) < 1e-9);
  const frac = (x) => (Math.abs(x - 1) < 1e-9 ? '×1' : x > 1 ? `×${nice(x)}` : `×1/${nice(1 / x)}`);
  const fac = (x) => (whole(x) ? frac(x) : x > 1 ? `×√${Math.round(x * x)}` : `×1/√${Math.round(1 / (x * x))}`);
  const rootable = (x) => whole(x) || [2, 3, 6].some((n) => Math.abs(x * x - n) < 1e-9 || Math.abs(x * x - 1 / n) < 1e-9);
  const FILL = [2, 0.5, 4, 0.25, 1, 3, 1 / 3, 8, 1 / 8, 6, 1 / 6];
  // four factors: the right one, the tempting ones ([x, why, tag, nudge], each one mistake), fillers
  function factors(right, tempt, how) {
    const out = [{ x: right, ok: true }];
    for (const [x, why, tag, nudge] of tempt) if (out.length < 4 && rootable(x) && !out.some((o) => Math.abs(o.x - x) < 1e-9)) out.push({ x, why, tag, ...(nudge ? { nudge } : {}) });
    for (const x of FILL) if (out.length < 4 && !out.some((o) => Math.abs(o.x - x) < 1e-9)) out.push({ x, why: how, tag: 'other' });
    return out.sort((p, q) => p.x - q.x).map((o) => ({ label: fac(o.x), ok: !!o.ok, why: o.ok ? '' : o.why, tag: o.tag, ...(o.nudge ? { nudge: o.nudge } : {}) }));
  }
  // the options of a value: the right one and the mistakes ({ value, tag, why }), apart by 15 %,
  // then multiples of the right one (extra) with how, the working, as their reason; sorted
  function values(right, mistakes, fmt, how, extra = [2, 0.5, 4, 0.25]) {
    const out = [{ value: right, ok: true, why: '' }];
    for (const m of [...mistakes, ...extra.map((k) => ({ value: right * k, tag: 'other', why: how }))]) {
      if (out.length === 4) break;
      if (Number.isFinite(m.value) && m.value > 0 && out.every((o) => Math.abs(Math.log(m.value / o.value)) > Math.log(1.15))) out.push({ ...m, ok: false, why: m.why || how });
    }
    return out.sort((a, b) => a.value - b.value).map((o) => ({ ...o, label: fmt(o.value) }));
  }
  const tiles = (key2, label, options, multi = false) => ({ type: 'tiles', key: key2, label, multi, options });
  const choice = (key2, label, options) => ({ type: 'choice', key: key2, label, options });
  // word options: [label, right?, why, tag, nudge]
  const words = (r, list) => r.shuffle(list.map(([label, ok, why, tag, nudge]) => ({ label, ok, why: ok ? '' : why, tag: ok ? undefined : tag, ...(nudge && !ok ? { nudge } : {}) })));
  const cmpTable = (heads, rows) => `<table class="cmp"><thead><tr><th></th>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(([n, ...v]) => `<tr><th>${n}</th>${v.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const times = (f, sym) => (Math.abs(f - 1) < 1e-9 ? it(sym) : f > 1 ? `${nice(f)}${it(sym)}` : `${it(sym)}/${nice(1 / f)}`);

  // ---------------------------------------------------------------- particles
  const e0 = 1.602e-19, u = 1.661e-27, me = 9.109e-31, mp = 1.673e-27;
  // [id, [en, de] with the article, symbol, charge in e, mass in kg]
  const NAMED = {
    1: [['p', ['a proton', 'ein Proton'], 'p', 1, mp], ['e+', ['a positron', 'ein Positron'], 'e⁺', 1, me], ['a', ['an alpha particle', 'ein Alphateilchen'], 'α', 2, 6.645e-27], ['na', ['a sodium ion (Na⁺)', 'ein Natrium-Ion (Na⁺)'], 'Na⁺', 1, 22.99 * u]],
    '-1': [['e', ['an electron', 'ein Elektron'], 'e⁻', -1, me], ['cl', ['a chloride ion (Cl⁻)', 'ein Chlorid-Ion (Cl⁻)'], 'Cl⁻', -1, 35.45 * u]],
    0: [['n', ['a neutron', 'ein Neutron'], 'n', 0, 1.675e-27], ['he', ['a helium atom', 'ein Heliumatom'], 'He', 0, 4.003 * u], ['h', ['a hydrogen atom', 'ein Wasserstoffatom'], 'H', 0, 1.008 * u], ['naa', ['a sodium atom (Na)', 'ein Natriumatom (Na)'], 'Na', 0, 22.99 * u]],
  };
  const signName = (q) => (q > 0 ? L('positive', 'positiv') : q < 0 ? L('negative', 'negativ') : L('neutral', 'neutral'));
  // A particle of a sign: often a named one (drawn with its symbol, its sign for the student to
  // know), else "a positive particle"; generic false: always a named one (for numbers).
  function particle(r, q, o = {}) {
    if (o.generic !== false && r.next() < 0.35) return { q, id: 'q', sym: null, name: () => L(`a ${signName(q)} particle`, `ein ${q > 0 ? 'positives' : q < 0 ? 'negatives' : 'neutrales'} Teilchen`) };
    const [id, names, sym, z, m] = r.pick(NAMED[q]);
    return { q, id, sym, z, m, name: () => L(...names) };
  }
  const chargeOf = (pt) => (pt.sym
    ? L(`${cap(pt.name())} ${pt.q > 0 ? 'is positively charged' : pt.q < 0 ? 'is negatively charged' : 'has no charge'}.`, `${cap(pt.name())} ist ${pt.q > 0 ? 'positiv geladen' : pt.q < 0 ? 'negativ geladen' : 'ungeladen'}.`)
    : L(`The particle is ${signName(pt.q)}.`, `Das Teilchen ist ${signName(pt.q)}.`));
  const RULE = () => L('For a positive charge use the right hand: thumb along the velocity, index finger along the magnetic field, then the middle finger shows the force. For a negative charge use the left hand in the same way.',
    'Für eine positive Ladung nimm die rechte Hand: Daumen in Richtung der Geschwindigkeit, Zeigefinger in Richtung des Magnetfeldes, dann zeigt der Mittelfinger die Kraft. Für eine negative Ladung nimm die linke Hand auf dieselbe Weise.');
  const PERP = () => L('The magnetic force is always perpendicular to the velocity: it does no work. It changes the direction of motion, never the speed.',
    'Die magnetische Kraft steht immer senkrecht zur Geschwindigkeit: Sie verrichtet keine Arbeit. Sie ändert die Bewegungsrichtung, nie den Betrag der Geschwindigkeit.');
  const EFORCE = () => L('The electric force on a charge q is q·E: along the field for a positive charge, against it for a negative one.', 'Die elektrische Kraft auf eine Ladung q ist q·E: in Feldrichtung für eine positive Ladung, entgegen für eine negative.');

  // ---------------------------------------------------------------- acceleration voltage
  const zText = (z) => (z === 2 ? '2e' : 'e');
  // the charge with its sign: +e, −e, +2e
  const sgnZ = (q, z) => `${q > 0 ? '+' : '−'}${zText(z)}`;
  function accel(seed) {
    const r = rng(seed * 71 + 41), pt = particle(r, r.pick([1, -1]), { generic: false }), z = Math.abs(pt.z), U = r.pick(pt.m < 1e-29 ? [100, 500, 1500, 5000] : [1000, 5000, 20000, 50000]), Ek = z * U, J = Ek * e0;
    const howE = L(`The field does the work |q·ΔV| on the ${signName(pt.q)} charge: E_kin = |q·ΔV| = ${zText(z)} · ${inV(U)} = ${inEV(Ek)}.`, `Das Feld verrichtet an der ${pt.q > 0 ? 'positiven' : 'negativen'} Ladung die Arbeit |q|·U: E_kin = |q|·U = ${zText(z)} · ${inV(U)} = ${inEV(Ek)}.`);
    const howJ = L(`1 eV = 1.602 · 10<sup>−19</sup> J: ${inEV(Ek)} = ${sci(Ek)} · 1.602 · 10<sup>−19</sup> J = ${sci(J)} J.`, `1 eV = 1.602 · 10<sup>−19</sup> J: ${inEV(Ek)} = ${sci(Ek)} · 1.602 · 10<sup>−19</sup> J = ${sci(J)} J.`);
    // (c): what a factor on the voltage does to the energy or the speed, or which voltage gives a
    // factor on the speed
    const C = r.pick([['v', 2], ['v', 3], ['v', 4], ['v', 0.5], ['v', 0.25], ['v', 9], ['E', 3], ['E', 0.5], ['U', 2], ['U', 3], ['U', 0.5]]), [ask, n] = C;
    const OFU = { 2: ['twice the voltage', 'der doppelten Spannung'], 3: ['three times the voltage', 'der dreifachen Spannung'], 4: ['four times the voltage', 'der vierfachen Spannung'], 9: ['nine times the voltage', 'der neunfachen Spannung'], 0.5: ['half the voltage', 'der halben Spannung'], 0.25: ['a quarter of the voltage', 'einem Viertel der Spannung'] };
    const ofU = () => L(...OFU[n]), sq = (x) => (whole(x) ? frac(x).slice(1) : fac(x).slice(1));
    let qk, howK, rightK, temptK;
    if (ask === 'U') {
      qk = L(`(c) For ${n === 0.5 ? 'half the' : n === 2 ? 'twice the' : 'three times the'} speed, the voltage needed is`, `(c) Für ${n === 0.5 ? 'die halbe' : n === 2 ? 'die doppelte' : 'die dreifache'} Geschwindigkeit braucht es die Spannung`);
      rightK = n * n;
      howK = L(`v ∝ √|ΔV|, so |ΔV| ∝ v²: ${sq(n)} times the speed needs ${sq(n * n)} times the voltage.`, `v ∝ √U, also U ∝ v²: Die ${sq(n)}-fache Geschwindigkeit braucht die ${sq(n * n)}-fache Spannung.`);
      temptK = [[n, L(`The energy goes with the square of the speed. ${howK}`, `Die Energie geht mit dem Quadrat der Geschwindigkeit. ${howK}`), 'sqrt',
        L('How does the speed depend on the voltage? Start from ½·m·v² = |q·ΔV|.', 'Wie hängt die Geschwindigkeit von der Spannung ab? Geh von ½·m·v² = |q|·U aus.')],
      [Math.sqrt(n), L(`Upside down. ${howK}`, `Umgekehrt. ${howK}`), 'sqrt', L('Check the way round: the question asks for the voltage for a given speed.', 'Prüfe die Richtung: Gefragt ist die Spannung für eine gegebene Geschwindigkeit.')]];
    } else if (ask === 'E') {
      qk = L(`(c) With ${OFU[n][0]}, its kinetic energy would be`, `(c) Mit ${OFU[n][1]} wäre seine kinetische Energie`);
      rightK = n;
      howK = L(`E_kin = |q·ΔV|: the energy is proportional to the voltage, ×${sq(n)}.`, `E_kin = |q|·U: Die Energie ist proportional zur Spannung, ×${sq(n)}.`);
      temptK = [[Math.sqrt(n), L(`The square root belongs to the speed, not to the energy. ${howK}`, `Die Wurzel gehört zur Geschwindigkeit, nicht zur Energie. ${howK}`), 'sqrt',
        L('How does the energy the field gives depend on the voltage?', 'Wie hängt die Energie, die das Feld liefert, von der Spannung ab?')], [n * n, howK, 'other']];
    } else {
      qk = L(`(c) With ${OFU[n][0]}, its speed would be`, `(c) Mit ${OFU[n][1]} wäre seine Geschwindigkeit`);
      rightK = Math.sqrt(n);
      howK = L(`${cap(OFU[n][0])}: ${sq(n)} times the energy; ½·m·v² changes ×${sq(n)}, so v changes ×${sq(Math.sqrt(n))}.`, `Mit ${OFU[n][1]} die ${sq(n)}-fache Energie: ½·m·v² ändert sich ×${sq(n)}, also ändert sich v ×${sq(Math.sqrt(n))}.`);
      temptK = [[n, L(`The energy grows with the voltage, the speed only with its square root. ${howK}`, `Die Energie wächst mit der Spannung, die Geschwindigkeit nur mit ihrer Wurzel. ${howK}`), 'sqrt',
        L('That is the factor of the energy. How does the speed follow from the energy?', 'Das ist der Faktor der Energie. Wie folgt die Geschwindigkeit aus der Energie?')], [n * n, howK, 'sqrt']];
    }
    const zWhy = (how) => L(`An alpha particle has the charge 2e. ${how}`, `Ein Alphateilchen hat die Ladung 2e. ${how}`);
    return {
      kind: 'acc', title: L('Acceleration voltage', 'Beschleunigungsspannung'),
      text: L(`<p>${cap(pt.name())}, at rest at first, is accelerated through a voltage of ${inV(U)}.</p>`, `<p>${cap(pt.name())}, zuerst in Ruhe, wird mit einer Spannung von ${inV(U)} beschleunigt.</p>`),
      figs: fig(accelFig({ q: pt.q, sym: pt.sym })),
      questions: [
        choice('E', L('(a) its kinetic energy', '(a) seine kinetische Energie'), values(Ek, z === 2 ? [{ value: U, tag: 'charge', why: zWhy(howE) }] : [{ value: U / 2, tag: 'half', why: L(`No ½ here: ½·m·v² is the kinetic energy, |q·ΔV| the work that gives it. ${howE}`, `Hier kein ½: ½·m·v² ist die kinetische Energie, |q|·U die Arbeit, die sie liefert. ${howE}`), nudge: L('Where does your factor ½ come from? What work does the field do on the charge?', 'Woher kommt dein Faktor ½? Welche Arbeit verrichtet das Feld an der Ladung?') }], inEV, howE)),
        choice('J', L('(b) the same energy in joules', '(b) dieselbe Energie in Joule'), values(J, [...(Ek >= 1e3 ? [{ value: J / 1e3, tag: 'unit', why: L(`Mind the prefix: 1 keV = 1000 eV. ${howJ}`, `Achte auf den Vorsatz: 1 keV = 1000 eV. ${howJ}`) }] : []), ...(z === 2 ? [{ value: U * e0, tag: 'charge', why: zWhy(howJ) }] : [])], (x) => `${sci(x)} J`, howJ, [10, 0.1, 2, 0.5])),
        choice('k', qk, factors(rightK, temptK, howK)),
      ],
      hints: [
        L(`${cap(pt.name())} carries the charge ${sgnZ(pt.q, z)} and starts at rest: all the work the field does on it over the ${inV(U)} becomes kinetic energy.`, `${cap(pt.name())} trägt die Ladung ${sgnZ(pt.q, z)} und startet aus der Ruhe: Die ganze Arbeit, die das Feld bei ${inV(U)} an ihm verrichtet, wird zu kinetischer Energie.`),
        L(`(a) E_kin = |q·ΔV|, with the charge of ${pt.name()} in e and the voltage in V: that gives the energy directly in eV. (b) Then 1 eV = 1.602 · 10<sup>−19</sup> J.`, `(a) E_kin = |q|·U, mit der Ladung von ${pt.name().replace(/^ein /, 'einem ')} in e und der Spannung in V: Das ergibt die Energie direkt in eV. (b) Dann 1 eV = 1.602 · 10<sup>−19</sup> J.`),
        ask === 'E' ? L(`(c) Now with ${OFU[n][0]}; the charge stays the same. How does E_kin = |q·ΔV| follow the voltage?`, `(c) Nun mit ${OFU[n][1]}; die Ladung bleibt gleich. Wie folgt E_kin = |q|·U der Spannung?`)
          : ask === 'v' ? L(`(c) With ${OFU[n][0]}, the field gives ${sq(n)} times the energy. Solve ½·m·v² = |q·ΔV| for v: what does a factor ${sq(n)} on the energy do to v?`, `(c) Mit ${OFU[n][1]} liefert das Feld die ${sq(n)}-fache Energie. Löse ½·m·v² = |q|·U nach v auf: Was macht ein Faktor ${sq(n)} bei der Energie mit v?`)
            : L(`(c) Solve ½·m·v² = |q·ΔV| for the voltage: |ΔV| = m·v²/(2·|q|). The speed is to change ${frac(n)}: by what factor does v² change?`, `(c) Löse ½·m·v² = |q|·U nach der Spannung auf: U = m·v²/(2·|q|). Die Geschwindigkeit soll sich ${frac(n)} ändern: Um welchen Faktor ändert sich v²?`),
      ],
      solution: [howE, howJ, howK], p: { pt: pt.id, U, c: `${ask}${n}` },
    };
  }
  const CMP = [['p', ['a proton', 'ein Proton'], 1, 1], ['a', ['an alpha particle', 'ein Alphateilchen'], 2, 4], ['d', ['a deuteron', 'ein Deuteron'], 1, 2], ['he', ['a He⁺ ion', 'ein He⁺-Ion'], 1, 4], ['c', ['a C⁶⁺ ion', 'ein C⁶⁺-Ion'], 6, 12]];
  function accelCompare(seed) {
    const r = rng(seed * 73 + 43), [a, b] = r.shuffle(CMP.slice()).slice(0, 2), U = r.pick([1, 5, 10]) * 1e3;
    const kE = b[2] / a[2], kv = Math.sqrt((b[2] / b[3]) / (a[2] / a[3]));
    const howE = L(`E_kin = |q·ΔV|: the energy depends only on the charge, not on the mass: ${b[2]}e against ${a[2]}e.`, `E_kin = |q|·U: Die Energie hängt nur von der Ladung ab, nicht von der Masse: ${b[2]}e gegen ${a[2]}e.`);
    const howV = L(`½·m·v² = |q·ΔV|, so v = √(2·|q·ΔV|/m) ∝ √(q/m): √((${b[2]}/${b[3]}) / (${a[2]}/${a[3]})) = ${nice(kv)}.`, `½·m·v² = |q|·U, also v = √(2·|q|·U/m) ∝ √(q/m): √((${b[2]}/${b[3]}) / (${a[2]}/${a[3]})) = ${nice(kv)}.`);
    const dat = (x) => L(x[1][0], x[1][1].replace(/^ein /, 'einem ')), A = dat(a), B = dat(b);
    return {
      kind: 'acc', title: L('The same voltage', 'Die gleiche Spannung'),
      text: L(`<p>${cap(L(...a[1]))} and ${L(...b[1])} are both accelerated from rest through ${inV(U)}. (Masses: ${a[3]} u and ${b[3]} u; charges: ${a[2]}e and ${b[2]}e.)</p>`, `<p>${cap(L(...a[1]))} und ${L(...b[1])} werden beide aus der Ruhe mit ${inV(U)} beschleunigt. (Massen: ${a[3]} u und ${b[3]} u; Ladungen: ${a[2]}e und ${b[2]}e.)</p>`), figs: '',
      questions: [
        choice('E', L(`(a) Compared with ${A}, the kinetic energy of ${B} is`, `(a) Verglichen mit ${A} ist die kinetische Energie von ${B}`),
          factors(kE, [[b[3] / a[3], L(`The energy does not depend on the mass. ${howE}`, `Die Energie hängt nicht von der Masse ab. ${howE}`), 'mass', L('Does the energy the field gives depend on the mass of the particle?', 'Hängt die Energie, die das Feld liefert, von der Masse des Teilchens ab?')], [kE / (b[3] / a[3]), L(`The mass does not count for the energy. ${howE}`, `Die Masse zählt für die Energie nicht. ${howE}`), 'mass', L('Does the energy the field gives depend on the mass of the particle?', 'Hängt die Energie, die das Feld liefert, von der Masse des Teilchens ab?')]], howE)),
        choice('v', L(`(b) Compared with ${A}, the speed of ${B} is`, `(b) Verglichen mit ${A} ist die Geschwindigkeit von ${B}`),
          factors(kv, [[kv * kv, L(`The speed goes with the square root of q/m. ${howV}`, `Die Geschwindigkeit geht mit der Wurzel aus q/m. ${howV}`), 'sqrt', L('Solve ½·m·v² = |q·ΔV| for v: how do the charge and the mass enter?', 'Löse ½·m·v² = |q|·U nach v auf: Wie gehen Ladung und Masse ein?')],
            [1 / kv, L(`Upside down: more charge per mass, more speed. ${howV}`, `Gerade umgekehrt: mehr Ladung pro Masse, mehr Geschwindigkeit. ${howV}`), 'other', L('Check the way round: which particle has more charge per mass, and is it faster or slower then?', 'Prüfe die Richtung: Welches Teilchen hat mehr Ladung pro Masse, und ist es dann schneller oder langsamer?')],
            [kE, L(`The same energy in a heavier particle is a smaller speed. ${howV}`, `Dieselbe Energie in einem schwereren Teilchen ist eine kleinere Geschwindigkeit. ${howV}`), 'mass', L('That is the factor of the energy. How does the speed depend on the energy and the mass?', 'Das ist der Faktor der Energie. Wie hängt die Geschwindigkeit von der Energie und der Masse ab?')]], howV)),
      ],
      hints: [
        L(`Both start at rest and run through the same ${inV(U)}. ${cap(L(...a[1]))} has the charge ${a[2]}e and the mass ${a[3]} u, ${L(...b[1])} ${b[2]}e and ${b[3]} u: which of these counts for the energy, which for the speed?`, `Beide starten aus der Ruhe und durchlaufen dieselben ${inV(U)}. ${cap(L(...a[1]))} hat die Ladung ${a[2]}e und die Masse ${a[3]} u, ${L(...b[1])} ${b[2]}e und ${b[3]} u: Was davon zählt für die Energie, was für die Geschwindigkeit?`),
        L(`(a) E_kin = |q·ΔV|, with the same ΔV for both: which of the given values is left to compare?`, `(a) E_kin = |q|·U, mit demselben U für beide: Welche der gegebenen Grössen bleibt zum Vergleichen?`),
        L(`(b) ½·m·v² = |q·ΔV| gives v = √(2·|q·ΔV|/m), so v ∝ √(q/m): q/m is ${b[2]}/${b[3]} e/u for ${B} and ${a[2]}/${a[3]} e/u for ${A}.`, `(b) ½·m·v² = |q|·U ergibt v = √(2·|q|·U/m), also v ∝ √(q/m): q/m ist ${b[2]}/${b[3]} e/u bei ${B} und ${a[2]}/${a[3]} e/u bei ${A}.`),
      ],
      solution: [howE, howV], p: { a: a[0], b: b[0], U },
    };
  }
  function stop(seed) {
    const r = rng(seed * 79 + 47), pt = particle(r, r.pick([1, -1]), { generic: false }), Ek = r.pick([2, 5, 10, 50, 200]) * 1e3, z = Math.abs(pt.z), U = Ek / z;
    const how = L(`The field must take away all the kinetic energy: |q·ΔV| = E_kin, so |ΔV| = ${inEV(Ek)} / ${zText(z)} = ${inV(U)}.`, `Das Feld muss die ganze kinetische Energie wegnehmen: |q|·U = E_kin, also U = ${inEV(Ek)} / ${zText(z)} = ${inV(U)}.`);
    const howD = pt.q > 0 ? L('A positive particle is slowed down when it moves towards higher potential.', 'Ein positives Teilchen wird abgebremst, wenn es sich zu höherem Potential bewegt.') : L('A negative particle is slowed down when it moves towards lower potential.', 'Ein negatives Teilchen wird abgebremst, wenn es sich zu tieferem Potential bewegt.');
    return {
      kind: 'acc', title: L('Stopping a particle', 'Ein Teilchen abbremsen'),
      text: L(`<p>${cap(pt.name())} with a kinetic energy of ${inEV(Ek)} flies towards a metal grid. What voltage between its start and the grid stops it just at the grid?</p>`, `<p>${cap(pt.name())} mit einer kinetischen Energie von ${inEV(Ek)} fliegt auf ein Metallgitter zu. Welche Spannung zwischen seinem Start und dem Gitter bremst es genau beim Gitter ab?</p>`), figs: '',
      questions: [
        choice('U', L('(a) the voltage', '(a) die Spannung'), values(U, z === 2 ? [{ value: Ek, tag: 'charge', why: L(`An alpha particle has the charge 2e. ${how}`, `Ein Alphateilchen hat die Ladung 2e. ${how}`) }] : [{ value: Ek / 2, tag: 'half', why: how }], inV, how)),
        choice('d', L('(b) The grid must be at', '(b) Das Gitter muss liegen auf'), words(r, [[L('higher potential than the start', 'höherem Potential als der Start'), pt.q > 0, howD, 'sign'], [L('lower potential than the start', 'tieferem Potential als der Start'), pt.q < 0, howD, 'sign']])),
      ],
      hints: [
        L(`${cap(pt.name())} carries the charge ${sgnZ(pt.q, z)} and has ${inEV(Ek)}: on the way to the grid, the field must take all of it away.`, `${cap(pt.name())} trägt die Ladung ${sgnZ(pt.q, z)} und hat ${inEV(Ek)}: Auf dem Weg zum Gitter muss das Feld ihm alles davon wegnehmen.`),
        L(`(a) Solve |q·ΔV| = E_kin for |ΔV|, with the kinetic energy in eV and the charge of ${pt.name()} in e: an energy in eV divided by a charge in e gives a voltage in V.`, `(a) Löse |q|·U = E_kin nach U auf, mit der kinetischen Energie in eV und der Ladung von ${pt.name().replace(/^ein /, 'einem ')} in e: Eine Energie in eV geteilt durch eine Ladung in e ergibt eine Spannung in V.`),
        L(`(b) Left to itself, a ${signName(pt.q)} charge runs towards ${pt.q > 0 ? 'lower' : 'higher'} potential and gets faster. Which way must ${pt.name()} run to be slowed down?`, `(b) Sich selbst überlassen, läuft eine ${pt.q > 0 ? 'positive' : 'negative'} Ladung zu ${pt.q > 0 ? 'tieferem' : 'höherem'} Potential und wird dabei schneller. Wohin muss ${pt.name()} laufen, damit es abgebremst wird?`),
      ],
      solution: [how, howD], p: { pt: pt.id, Ek },
    };
  }
  function ev(seed) {
    const r = rng(seed * 83 + 53), task = r.pick(['ion', 'joule']);
    if (task === 'ion') {
      const [name, z] = r.pick([['Pb²⁺', 2], ['Au³⁺', 3], ['U⁴⁺', 4], ['C⁶⁺', 6]]), Ek = r.pick([12, 30, 60, 120]), U = Ek / z;
      const how = L(`E_kin = z·e·|ΔV|, so |ΔV| = ${Ek} MeV / ${z}e = ${nice(U)} MV.`, `E_kin = z·e·U, also U = ${Ek} MeV / ${z}e = ${nice(U)} MV.`);
      return {
        kind: 'ev', title: L('The electronvolt', 'Das Elektronvolt'), text: L(`<p>A “${Ek} MeV ${name} ion” has gained its energy through an accelerating voltage, from rest.</p>`, `<p>Ein «${Ek}-MeV-${name}-Ion» hat seine Energie aus der Ruhe durch eine Beschleunigungsspannung erhalten.</p>`), figs: '',
        questions: [choice('U', L('the voltage', 'die Spannung'), values(U, [{ value: Ek, tag: 'charge', why: L(`The ion carries ${z} elementary charges. ${how}`, `Das Ion trägt ${z} Elementarladungen. ${how}`) }, { value: Ek * z, tag: 'charge', why: how }], (x) => `${nice(x)} MV`, how))],
        hints: [
          L(`The ${name} ion carries ${z} elementary charges; from rest, the voltage gave it ${Ek} MeV. 1 eV is the energy of one elementary charge through 1 V.`, `Das ${name}-Ion trägt ${z} Elementarladungen; aus der Ruhe hat ihm die Spannung ${Ek} MeV gegeben. 1 eV ist die Energie einer Elementarladung, die 1 V durchläuft.`),
          L(`Solve E_kin = z·e·|ΔV| for |ΔV|, with the energy in MeV and the charge number z of the ion: MeV divided by e gives MV.`, `Löse E_kin = z·e·U nach U auf, mit der Energie in MeV und der Ladungszahl z des Ions: MeV geteilt durch e ergibt MV.`),
        ], solution: [how], p: { task, name, Ek },
      };
    }
    const Ek = r.pick([5, 25, 100, 500]), unit = r.pick(['keV', 'MeV']), k = unit === 'keV' ? 1e3 : 1e6, J = Ek * k * e0;
    const how = L(`1 eV = 1.602 · 10<sup>−19</sup> J and 1 ${unit} = ${sci(k)} eV: ${Ek} ${unit} = ${sci(J)} J.`, `1 eV = 1.602 · 10<sup>−19</sup> J und 1 ${unit} = ${sci(k)} eV: ${Ek} ${unit} = ${sci(J)} J.`);
    return {
      kind: 'ev', title: L('The electronvolt', 'Das Elektronvolt'), text: L(`<p>Express ${Ek} ${unit} in joules.</p>`, `<p>Drücke ${Ek} ${unit} in Joule aus.</p>`), figs: '',
      questions: [choice('J', L('the energy in joules', 'die Energie in Joule'), values(J, [{ value: J / k, tag: 'unit', why: L(`Mind the prefix ${unit[0]}. ${how}`, `Achte auf den Vorsatz ${unit[0]}. ${how}`) }, { value: J * 1e3, tag: 'unit', why: L(`Mind the prefix ${unit[0]}. ${how}`, `Achte auf den Vorsatz ${unit[0]}. ${how}`) }], (x) => `${sci(x)} J`, how))],
      hints: [
        L(`Two steps: first the prefix, ${Ek} ${unit} in eV (1 ${unit} = ${sci(k)} eV), then the eV in joules.`, `Zwei Schritte: zuerst der Vorsatz, ${Ek} ${unit} in eV (1 ${unit} = ${sci(k)} eV), dann die eV in Joule.`),
        L('Then each eV is 1.602 · 10<sup>−19</sup> J: multiply the energy in eV by it, and collect the powers of ten first.', 'Dann ist jedes eV 1.602 · 10<sup>−19</sup> J: Multipliziere die Energie in eV damit, und fasse zuerst die Zehnerpotenzen zusammen.'),
      ], solution: [how], p: { task, Ek, unit },
    };
  }

  // ---------------------------------------------------------------- a charge in a capacitor
  function deflectPath(seed) {
    const r = rng(seed * 89 + 59), q = r.pick([1, 1, -1, -1, 0]), pt = particle(r, q), top = r.pick([1, -1]);
    const down = q * top > 0 ? -1 : 1, f0 = 0.09; // a positive charge is pushed away from the positive plate
    const para = (s) => { const out = [[0, 0]]; for (let x = 0; x <= 1.0001; x += 0.02) out.push([x, x < f0 ? 0 : s * 0.85 * ((x - f0) / (1 - f0)) ** 2]); return out; };
    const arc = (s) => { const out = [[0, 0], [f0, 0]], R = 0.6; for (let ph = 0; ph <= Math.PI / 2; ph += 0.05) out.push([f0 + R * Math.sin(ph) * 0.7, s * R * (1 - Math.cos(ph)) * 1.4]); return out; };
    const straight = [[0, 0], [1, 0]];
    const opts = q ? [{ pts: para(down), ok: true }, { pts: para(-down), tag: 'sign' }, { pts: straight, tag: 'straight' }, { pts: arc(down), tag: 'circle' }]
      : [{ pts: straight, ok: true }, { pts: para(1), tag: 'bent' }, { pts: para(-1), tag: 'bent' }, { pts: arc(1), tag: 'bent' }];
    const how = q ? L(`The force q·E is the same everywhere between the plates: towards the ${down > 0 ? 'upper' : 'lower'} plate, which is ${q > 0 ? 'negative' : 'positive'}. Like a ball thrown horizontally, the charge moves on a parabola, and it gets faster: the force does work on it.`, `Die Kraft q·E ist zwischen den Platten überall gleich: zur ${down > 0 ? 'oberen' : 'unteren'} Platte, die ${q > 0 ? 'negativ' : 'positiv'} ist. Wie ein waagrecht geworfener Ball bewegt sich die Ladung auf einer Parabel, und sie wird schneller: Die Kraft verrichtet Arbeit an ihr.`)
      : L('A neutral particle feels no electric force: it flies straight on.', 'Ein neutrales Teilchen spürt keine elektrische Kraft: Es fliegt geradeaus.');
    const W = { sign: L('This one bends the wrong way: a positive charge is pushed towards the negative plate, a negative one towards the positive plate.', 'Diese biegt falsch ab: Eine positive Ladung wird zur negativen Platte gedrückt, eine negative zur positiven.'), straight: L('The charge feels a force between the plates.', 'Die Ladung spürt zwischen den Platten eine Kraft.'), circle: L('A circle needs a force that turns with the motion, as in a magnetic field; here the force always points the same way: a parabola.', 'Ein Kreis braucht eine Kraft, die sich mit der Bewegung dreht, wie in einem Magnetfeld; hier zeigt die Kraft immer in dieselbe Richtung: eine Parabel.'), bent: L('A neutral particle is not deflected.', 'Ein neutrales Teilchen wird nicht abgelenkt.') };
    // in practice, instead of the why where it says which path is right
    const N = { sign: L('This one bends to the wrong side. What sign does the charge have, and which plate pulls it?', 'Diese biegt zur falschen Seite ab. Welches Vorzeichen hat die Ladung, und welche Platte zieht sie an?'), circle: L('A circle needs a force that turns with the motion. Does the force between the plates do that?', 'Ein Kreis braucht eine Kraft, die sich mit der Bewegung dreht. Tut das die Kraft zwischen den Platten?'), bent: L('What charge does this particle carry? Does it feel a force between the plates?', 'Welche Ladung trägt dieses Teilchen? Spürt es zwischen den Platten eine Kraft?') };
    return {
      kind: 'path', title: L('Into the capacitor', 'In den Kondensator'),
      text: L(`<p>${cap(pt.name())} flies horizontally into the field between two charged plates.</p>`, `<p>${cap(pt.name())} fliegt waagrecht in das Feld zwischen zwei geladenen Platten.</p>`),
      figs: fig(capFig({ top, q, sym: pt.sym, v: true, field: true })),
      questions: [{ type: 'pick', key: 'p', label: L('Which drawing shows its path?', 'Welche Zeichnung zeigt seine Bahn?'), options: r.shuffle(opts).map((o) => ({ html: capFig({ top, q, sym: pt.sym, pts: o.pts, small: true }), ok: !!o.ok, tag: o.tag, why: o.ok ? '' : `${W[o.tag]} ${how}`, ...(!o.ok && N[o.tag] ? { nudge: N[o.tag] } : {}) })) }],
      hints: q ? [
        L(`${chargeOf(pt)} The upper plate is ${top > 0 ? 'positive' : 'negative'}, the lower one ${top > 0 ? 'negative' : 'positive'}: which of them attracts it?`, `${chargeOf(pt)} Die obere Platte ist ${top > 0 ? 'positiv' : 'negativ'}, die untere ${top > 0 ? 'negativ' : 'positiv'}: Welche zieht es an?`),
        L(`The force on it is q·E, and E points from the ${top > 0 ? 'upper' : 'lower'} (+) plate to the ${top > 0 ? 'lower' : 'upper'} (−) one: along E for a positive charge, against it for a negative one.`, `Die Kraft darauf ist q·E, und E zeigt von der ${top > 0 ? 'oberen' : 'unteren'} (+) zur ${top > 0 ? 'unteren' : 'oberen'} (−) Platte: in Feldrichtung für eine positive Ladung, entgegen für eine negative.`),
        L('This force has the same size and direction everywhere between the plates, and along the plates the speed stays the same: what path does a ball thrown horizontally take?', 'Diese Kraft hat zwischen den Platten überall denselben Betrag und dieselbe Richtung, und längs der Platten bleibt die Geschwindigkeit gleich: Welche Bahn hat ein waagrecht geworfener Ball?'),
      ] : [
        L(`${chargeOf(pt)} The plates are charged, but what charge does the particle bring?`, `${chargeOf(pt)} Die Platten sind geladen, aber welche Ladung bringt das Teilchen mit?`),
        L('The electric force on it is q·E: how large is it for q = 0, and what does the particle then do between the plates?', 'Die elektrische Kraft darauf ist q·E: Wie gross ist sie für q = 0, und was tut das Teilchen dann zwischen den Platten?'),
      ],
      solution: [how], solFig: fig(capFig({ top, q, sym: pt.sym, pts: q ? para(down) : straight })), p: { q, top, pt: pt.id },
    };
  }
  // the deflection by the end of the plates: y = |q|·U·L²/(2·m·d·v²)
  const DPAIRS = [
    { a: ['p', ['a proton', 'ein Proton'], 'p', 1, 1], b: ['a', ['an alpha particle', 'ein Alphateilchen'], 'α', 2, 4] },
    { a: ['e', ['an electron', 'ein Elektron'], 'e⁻', -1, 1], b: ['e+', ['a positron', 'ein Positron'], 'e⁺', 1, 1] },
    { a: ['p', ['a proton', 'ein Proton'], 'p', 1, 1], b: ['d', ['a deuteron (a proton and a neutron)', 'ein Deuteron (ein Proton und ein Neutron)'], 'd', 1, 2] },
  ];
  function deflectCompare(seed) {
    const r = rng(seed * 97 + 61);
    let pa, pb, f, flip, ky;
    for (;;) {
      const pair = r.pick(DPAIRS), change = r.next() < 0.45;
      pa = pair.a; pb = change ? pair.b : pair.a;
      if (r.next() < 0.5 && change) [pa, pb] = [pb, pa];
      f = { v: r.pick([1, 1, 2, 3, 0.5]), U: r.pick([1, 1, 2, 3, 0.5]), L: r.pick([1, 1, 1, 2, 0.5]), d: r.pick([1, 1, 1, 2, 0.5]) };
      flip = r.next() < 0.25;
      const zr = Math.abs(pb[3] / pa[3]), mr = pb[4] / pa[4];
      ky = (zr / mr) * f.U * f.L ** 2 / (f.d * f.v ** 2);
      const n = Object.values(f).filter((x) => x !== 1).length + (pa !== pb ? 1 : 0);
      if (n >= 2 && n <= 3 && whole(ky) && ky <= 16 && ky >= 1 / 16) break;
    }
    const zr = Math.abs(pb[3] / pa[3]), mr = pb[4] / pa[4], kt = f.L / f.v, nm = (x) => L(...x[1]);
    const sideA = Math.sign(pa[3]), sideB = Math.sign(pb[3]) * (flip ? -1 : 1), same = sideA === sideB;
    const parts = [];
    if (zr !== 1) parts.push(L(`the charge ${frac(zr)}`, `die Ladung ${frac(zr)}`));
    if (mr !== 1) parts.push(L(`the mass ${frac(mr)}, so ${frac(1 / mr)}`, `die Masse ${frac(mr)}, also ${frac(1 / mr)}`));
    if (f.U !== 1) parts.push(L(`the voltage ${frac(f.U)}`, `die Spannung ${frac(f.U)}`));
    if (f.L !== 1) parts.push(L(`the length ${frac(f.L)}, squared ${frac(f.L ** 2)}`, `die Länge ${frac(f.L)}, quadriert ${frac(f.L ** 2)}`));
    if (f.d !== 1) parts.push(L(`the distance ${frac(f.d)}, so ${frac(1 / f.d)}`, `der Abstand ${frac(f.d)}, also ${frac(1 / f.d)}`));
    if (f.v !== 1) parts.push(L(`the speed ${frac(f.v)}, squared in the denominator: ${frac(1 / f.v ** 2)}`, `die Geschwindigkeit ${frac(f.v)}, quadriert im Nenner: ${frac(1 / f.v ** 2)}`));
    // for the hints: what changes from A to B, and the ratio of the deflections with only those factors
    const changed = [[zr, '|q|'], [mr, 'm'], [f.v, 'v'], [f.U, L('ΔV', 'U')], [f.L, 'L'], [f.d, 'd']].filter(([k]) => k !== 1).map(([k, sym]) => `${it(sym)} ${frac(k)}`);
    // the factor of one changed quantity (with its result only if another factor is left to the student)
    const parts1 = [[f.v, 'the speed', 'die Geschwindigkeit', 'squared in the denominator', 'quadriert im Nenner', 1 / f.v ** 2], [f.L, 'the length', 'die Länge', 'squared', 'quadriert', f.L ** 2],
      [mr, 'the mass', 'die Masse', 'in the denominator', 'im Nenner', 1 / mr], [f.d, 'the distance', 'der Abstand', 'in the denominator', 'im Nenner', 1 / f.d], [f.U, 'the voltage', 'die Spannung', 'directly', 'direkt', f.U], [zr, 'the charge', 'die Ladung', 'directly', 'direkt', zr]].filter(([k]) => k !== 1);
    const [k1, en1, de1, wEn, wDe, r1] = parts1[0];
    const first = parts1.length > 1 ? [`${en1} ${frac(k1)} counts ${wEn}, ${frac(r1)}; then the other factors`, `${de1} ${frac(k1)} zählt ${wDe}, ${frac(r1)}; dann die übrigen Faktoren`]
      : [`${en1} ${frac(k1)} is the only factor: how, and where, does it stand in y?`, `${de1} ${frac(k1)} ist der einzige Faktor: Wie, und wo, steht er in y?`];
    const how = L(`y = |q·ΔV|·L²/(2·m·d·v²): ${parts.join('; ')}. Together: ${frac(ky)}.`, `y = |q|·U·L²/(2·m·d·v²): ${parts.join('; ')}. Zusammen: ${frac(ky)}.`);
    const base = (zr / mr) * f.U / f.d;
    const tempt = [
      [base * f.L ** 2 / f.v, L('The time between the plates, L/v, is squared: the speed counts squared.', 'Die Zeit zwischen den Platten, L/v, wird quadriert: Die Geschwindigkeit zählt quadratisch.'), 'square',
        L('How does the deflection depend on the time between the plates, and how does that time depend on the speed?', 'Wie hängt die Ablenkung von der Zeit zwischen den Platten ab, und wie hängt diese Zeit von der Geschwindigkeit ab?')],
      [base * f.L / f.v ** 2, L('The length of the plates counts squared, like the time.', 'Die Länge der Platten zählt quadratisch, wie die Zeit.'), 'square',
        L('How does the time between the plates depend on their length, and how does the time enter the deflection?', 'Wie hängt die Zeit zwischen den Platten von ihrer Länge ab, und wie geht die Zeit in die Ablenkung ein?')],
      [zr * f.U * f.L ** 2 / (f.d * f.v ** 2), L('A heavier particle is accelerated less: divide by the mass.', 'Ein schwereres Teilchen wird weniger beschleunigt: durch die Masse teilen.'), 'mass',
        L('How does the acceleration across the plates depend on the mass?', 'Wie hängt die Beschleunigung quer zu den Platten von der Masse ab?')],
      [(zr / mr) * f.U * f.L ** 2 * f.d / f.v ** 2, L('E = |ΔV|/d: a larger distance means a weaker field.', 'E = U/d: Ein grösserer Abstand bedeutet ein schwächeres Feld.'), 'other',
        L('How does the field between the plates depend on their distance?', 'Wie hängt das Feld zwischen den Platten von ihrem Abstand ab?')],
      [1 / ky, L('Upside down.', 'Gerade umgekehrt.'), 'other', L('Check the way round: the question compares B with A.', 'Prüfe die Richtung des Vergleichs: Gefragt ist B verglichen mit A.')],
    ];
    const howT = L(`Along the plates the speed stays the same: t = L/v, the length ${frac(f.L)}, the speed ${frac(f.v)}: ${frac(kt)}.`, `Längs der Platten bleibt die Geschwindigkeit gleich: t = L/v, die Länge ${frac(f.L)}, die Geschwindigkeit ${frac(f.v)}: ${frac(kt)}.`);
    const sideTxt = (x, q, fl) => `${cap(x)} ${q > 0 ? L('is positive', 'ist positiv') : L('is negative', 'ist negativ')}${fl ? L(', and the plates are swapped', ', und die Platten sind vertauscht') : ''}`;
    const howS = L(`${sideTxt(nm(pa), pa[3], false)}: it is pushed towards the ${sideA > 0 ? 'lower' : 'upper'} plate. ${sideTxt(nm(pb), pb[3], flip)}: towards the ${sideB > 0 ? 'lower' : 'upper'} plate.`, `${sideTxt(nm(pa), pa[3], false)}: Es wird zur ${sideA > 0 ? 'unteren' : 'oberen'} Platte gedrückt. ${sideTxt(nm(pb), pb[3], flip)}: zur ${sideB > 0 ? 'unteren' : 'oberen'} Platte.`);
    const howS2 = pa === pb && !flip ? L('The same particle and the same plates: the same side.', 'Dasselbe Teilchen und dieselben Platten: dieselbe Seite.') : howS;
    const row = (n, sym, k) => [n, it(sym), times(k, sym)];
    const pcell = (x) => `${nm(x).replace(/ \(.*\)$/, '').replace(/^(an?|ein) /, '')} (${x[3] > 0 ? '+' : '−'}${Math.abs(x[3]) > 1 ? Math.abs(x[3]) : ''}e)`;
    // the mass in the table always, needed or not
    const mcell = (x) => (x[0] === 'e' || x[0] === 'e+' ? '0.00055 u' : `≈ ${x[4]} u`);
    const rows = [
      [L('particle', 'Teilchen'), pcell(pa), pcell(pb)], [L('mass', 'Masse'), mcell(pa), mcell(pb)],
      row(L('speed', 'Geschwindigkeit'), 'v', f.v), row(L('voltage', 'Spannung'), L('ΔV', 'U'), f.U), row(L('length of the plates', 'Länge der Platten'), 'L', f.L), row(L('distance between the plates', 'Plattenabstand'), 'd', f.d),
      [L('upper plate', 'obere Platte'), '+', flip ? '−' : '+'],
    ];
    return {
      kind: 'path', title: L('Two deflections', 'Zwei Ablenkungen'),
      text: L(`<p>In two experiments A and B, a charged particle flies horizontally into the field between two plates. The table compares them.</p>`, `<p>In zwei Versuchen A und B fliegt ein geladenes Teilchen waagrecht in das Feld zwischen zwei Platten. Die Tabelle vergleicht sie.</p>`) + cmpTable(['A', 'B'], rows),
      figs: fig(capFig({ top: 1, q: Math.sign(pa[3]), sym: pa[2], v: true, field: true, label: L('Experiment A', 'Versuch A') })),
      questions: [
        choice('y', L('(a) Compared with A, the deflection by the end of the plates in B is', '(a) Verglichen mit A ist die Ablenkung bis zum Ende der Platten in B'), factors(ky, tempt, how)),
        choice('t', L('(b) Compared with A, the time the particle takes to pass the plates in B is', '(b) Verglichen mit A ist die Zeit, die das Teilchen in B für den Weg zwischen den Platten braucht,'), factors(kt, [[f.v / f.L, L('t = L/v: faster means less time.', 't = L/v: schneller bedeutet weniger Zeit.'), 'other', L('Does a faster particle need more or less time between the plates?', 'Braucht ein schnelleres Teilchen mehr oder weniger Zeit zwischen den Platten?')],
          [f.L / f.v ** 2, L('The speed counts once here, not squared.', 'Die Geschwindigkeit zählt hier einfach, nicht quadratisch.'), 'square', L('How does the time between the plates depend on the speed? Is there a square in it?', 'Wie hängt die Zeit zwischen den Platten von der Geschwindigkeit ab? Kommt darin ein Quadrat vor?')]], howT)),
        choice('s', L('(c) Compared with A, the particle in B is deflected', '(c) Verglichen mit A wird das Teilchen in B abgelenkt'), words(r, [[L('to the same side', 'zur selben Seite'), same, howS2, 'sign'], [L('to the other side', 'zur anderen Seite'), !same, howS2, 'sign']])),
      ],
      hints: [
        L(`From A to B, read off the table what changes: ${changed.join(', ') || 'only the sign of the charge'}. Everything else stays the same.`, `Lies in der Tabelle ab, was sich von A nach B ändert: ${changed.join(', ') || 'nur das Vorzeichen der Ladung'}. Alles andere bleibt gleich.`),
        L('(a) Along the plates t = L/v, across them a = |q|·E/m with E = |ΔV|/d, so y = ½·a·t² = |q·ΔV|·L²/(2·m·d·v²). Write y<sub>B</sub>/y<sub>A</sub> as a product of the factors from the table: |q|, ΔV and L² on top, m, d and v² below. (b) In t = L/v, which of the two changes?', '(a) Längs der Platten t = L/v, quer dazu a = |q|·E/m mit E = U/d, also y = ½·a·t² = |q|·U·L²/(2·m·d·v²). Schreibe y<sub>B</sub>/y<sub>A</sub> als Produkt der Faktoren aus der Tabelle: |q|, U und L² oben, m, d und v² unten. (b) In t = L/v, welche der beiden Grössen ändert sich?'),
        L(`A first factor: ${first[0]}.`, `Ein erster Faktor: ${first[1]}.`),
        L(`(c) In A, ${nm(pa)} is ${pa[3] > 0 ? 'positive' : 'negative'}; in B, ${nm(pb)} is ${pb[3] > 0 ? 'positive' : 'negative'}, ${flip ? 'and the plates are swapped (upper plate −)' : 'with the same plates (upper plate +)'}. Which plate pulls the particle in each?`, `(c) In A ist ${nm(pa)} ${pa[3] > 0 ? 'positiv' : 'negativ'}; in B ist ${nm(pb)} ${pb[3] > 0 ? 'positiv' : 'negativ'}, ${flip ? 'und die Platten sind vertauscht (obere Platte −)' : 'mit denselben Platten (obere Platte +)'}. Welche Platte zieht das Teilchen jeweils an?`),
      ],
      solution: [how, howT, howS2], p: { a: pa[0], b: pb[0], f: [f.v, f.U, f.L, f.d].join(','), flip },
    };
  }

  // ---------------------------------------------------------------- into a magnetic field
  const WHYP = {
    hand: () => L('This one turns the wrong way: mind the sign of the charge and the direction of the field.', 'Diese dreht in die falsche Richtung: Achte auf das Vorzeichen der Ladung und die Richtung des Feldes.'),
    straight: () => L('A charge moving across a field is deflected.', 'Eine Ladung, die sich quer zum Feld bewegt, wird abgelenkt.'),
    bent: () => L('A neutral particle is not deflected.', 'Ein neutrales Teilchen wird nicht abgelenkt.'),
    parabola: () => L('That is the path in an electric field: there the force always points the same way. The magnetic force stays perpendicular to the velocity, so the path is a circle.', 'Das ist die Bahn in einem elektrischen Feld: Dort zeigt die Kraft immer in dieselbe Richtung. Die magnetische Kraft bleibt senkrecht zur Geschwindigkeit, also ist die Bahn ein Kreis.'),
  };
  // in practice, instead of the why where it says which path is right
  const NUDGEP = {
    bent: () => L('What charge does this particle carry? Does it feel a force in the field?', 'Welche Ladung trägt dieses Teilchen? Spürt es im Feld eine Kraft?'),
    parabola: () => L('That is the path in an electric field, where the force always points the same way. How does the magnetic force point compared with the velocity?', 'Das ist die Bahn in einem elektrischen Feld, wo die Kraft immer in dieselbe Richtung zeigt. Wie steht die magnetische Kraft zur Geschwindigkeit?'),
  };
  const BOX = [-1, 6, -3.2, 3.2], REGION = [1, 6, -3.2, 3.2];
  function pathCircle(seed) {
    const r = rng(seed * 43 + 17), q = r.pick([1, 1, -1, -1, 0]), bz = r.pick([1, -1]), R = r.pick([1.1, 1.4, 1.8]), y0 = r.pick([-0.5, 0, 0.5]), pt = particle(r, q);
    const run = (k) => path({ x0: -0.6, y0, vx: 1, vy: 0, k, Bz: () => bz, inside: (x) => x >= 1, dt: 0.02, n: 900, stop: (x, y) => x < -1.2 || x > 6.5 || Math.abs(y) > 3.5 });
    const k = q / R, right = run(k), turned = run(-k || 1 / R), straight = [[-0.6, y0], [6.5, y0]];
    const down = force(q || 1, [1, 0, 0], [0, 0, bz]), sgn = down ? down[1] : 1, para = [];
    for (let x = -0.6; x <= 6.5; x += 0.05) { const t = Math.max(0, x - 1); para.push([x, y0 + sgn * 0.45 * t * t]); }
    const base = { box: BOX, region: REGION, bz, q, sym: pt.sym };
    const opts = q ? [{ pts: right, ok: true }, { pts: turned, tag: 'hand' }, { pts: straight, tag: 'straight' }, { pts: para, tag: 'parabola' }]
      : [{ pts: straight, ok: true }, { pts: run(1 / R), tag: 'bent' }, { pts: run(-1 / R), tag: 'bent' }, { pts: para, tag: 'bent' }];
    const F = force(q, [1, 0, 0], [0, 0, bz]);
    const how = q ? L(`At the start, the force on the ${signName(q)} charge points ${dirName(F)} (${q > 0 ? 'right' : 'left'} hand). The force stays perpendicular to the velocity, so the charge moves on a circle at constant speed and leaves the field ${F[1] > 0 ? 'above' : 'below'} where it came in, moving back.`,
      `Zu Beginn zeigt die Kraft auf die ${q > 0 ? 'positive' : 'negative'} Ladung ${dirName(F)} (${q > 0 ? 'rechte' : 'linke'} Hand). Die Kraft bleibt senkrecht zur Geschwindigkeit, also bewegt sich die Ladung mit konstantem Betrag der Geschwindigkeit auf einem Kreis und verlässt das Feld ${F[1] > 0 ? 'oberhalb' : 'unterhalb'} der Eintrittsstelle, in Gegenrichtung.`)
      : L('A neutral particle feels no magnetic force: it goes straight on.', 'Ein neutrales Teilchen spürt keine magnetische Kraft: Es fliegt geradeaus weiter.');
    return {
      kind: 'path', title: L('A charge enters a field', 'Eine Ladung tritt in ein Feld ein'),
      text: L(`<p>${cap(pt.name())} flies to the right into a region with a uniform magnetic field ${dirName([0, 0, bz])}.</p>`, `<p>${cap(pt.name())} fliegt nach rechts in ein Gebiet mit einem homogenen Magnetfeld, das ${dirName([0, 0, bz])} zeigt.</p>`),
      figs: fig(pathFig({ ...base, pts: [[-0.6, y0], [0.4, y0]] })),
      questions: [{ type: 'pick', key: 'p', label: L('Which drawing shows its path?', 'Welche Zeichnung zeigt seine Bahn?'), options: r.shuffle(opts).map((o) => ({ html: pathFig({ ...base, pts: o.pts, small: true }), ok: !!o.ok, tag: o.tag, why: o.ok ? '' : `${WHYP[o.tag]()} ${how}`, ...(!o.ok && NUDGEP[o.tag] ? { nudge: NUDGEP[o.tag]() } : {}) })) }],
      hints: q ? [
        L(`${chargeOf(pt)} It flies to the right, and the field points ${dirName([0, 0, bz])}.`, `${chargeOf(pt)} Es fliegt nach rechts, und das Feld zeigt ${dirName([0, 0, bz])}.`),
        L(`${q > 0 ? 'Right' : 'Left'} hand for this ${signName(q)} charge: thumb to the right (the velocity), index finger ${dirName([0, 0, bz])} (the field). Where does the middle finger, the force, point as it enters?`, `${q > 0 ? 'Rechte' : 'Linke'} Hand für diese ${q > 0 ? 'positive' : 'negative'} Ladung: Daumen nach rechts (die Geschwindigkeit), Zeigefinger ${dirName([0, 0, bz])} (das Feld). Wohin zeigt der Mittelfinger, die Kraft, beim Eintritt?`),
        L('As the path bends, the force turns with it and stays perpendicular to the velocity: the speed stays the same, only the direction changes. What kind of path is that, and does it ever bend the other way?', 'Während sich die Bahn biegt, dreht die Kraft mit und bleibt senkrecht zur Geschwindigkeit: Der Betrag bleibt gleich, nur die Richtung ändert sich. Was für eine Bahn ist das, und biegt sie je in die andere Richtung ab?'),
      ] : [
        L(`${chargeOf(pt)} The field points ${dirName([0, 0, bz])}, but what charge does the particle bring?`, `${chargeOf(pt)} Das Feld zeigt ${dirName([0, 0, bz])}, aber welche Ladung bringt das Teilchen mit?`),
        L('The magnetic force is q·v·B: how large is it for q = 0, and what does the particle then do in the field?', 'Die magnetische Kraft ist q·v·B: Wie gross ist sie für q = 0, und was tut das Teilchen dann im Feld?'),
      ],
      solution: [how], solFig: fig(pathFig({ ...base, pts: q ? right : straight })), p: { q, bz, R, y0, pt: pt.id },
    };
  }
  // The same particle, at the same speed, into a magnetic field (A) and between two charged plates
  // (B): which field changes its speed, and why the magnetic one does not.
  function speed(seed) {
    const r = rng(seed * 101 + 13), q = r.pick([1, -1]), pt = particle(r, q, { generic: false }), bz = r.pick([1, -1]), top = r.pick([1, -1]);
    const howM = L('The magnetic force is always perpendicular to the velocity: it does no work (W = F·s·cos 90° = 0). The kinetic energy and so the speed stay the same; only the direction of motion changes.',
      'Die magnetische Kraft steht immer senkrecht zur Geschwindigkeit: Sie verrichtet keine Arbeit (W = F·s·cos 90° = 0). Die kinetische Energie und damit der Betrag der Geschwindigkeit bleiben gleich; nur die Bewegungsrichtung ändert sich.');
    const howE = L(`Between the plates the electric force points towards the ${q * top > 0 ? 'lower' : 'upper'} plate the whole time. As the particle is deflected that way, it moves partly along the force: the force does work, and the speed grows. That holds for either sign: each charge is pulled towards the plate of the other sign.`,
      `Zwischen den Platten zeigt die elektrische Kraft die ganze Zeit zur ${q * top > 0 ? 'unteren' : 'oberen'} Platte. Während das Teilchen dorthin abgelenkt wird, bewegt es sich teilweise in Richtung der Kraft: Die Kraft verrichtet Arbeit, und die Geschwindigkeit wächst. Das gilt für jedes Vorzeichen: Jede Ladung wird zur Platte des anderen Vorzeichens gezogen.`);
    const same = L('the same as before', 'gleich wie vorher'), more = L('larger', 'grösser'), less = L('smaller', 'kleiner'), sign = L('larger or smaller, depending on the sign of its charge', 'grösser oder kleiner, je nach Vorzeichen seiner Ladung');
    const signWhy = (how) => L(`The sign decides which way it is deflected, not whether it gains energy. ${how}`, `Das Vorzeichen entscheidet, wohin es abgelenkt wird, nicht ob es Energie gewinnt. ${how}`);
    const R = 1.4, entry = path({ x0: -0.6, y0: 0, vx: 1, vy: 0, k: q / R, Bz: () => bz, inside: (x) => x >= 1, dt: 0.02, n: 900, stop: (x, y) => x < -1.2 || Math.abs(y) > 3.5 });
    return {
      kind: 'speed', title: L('Faster, or only another direction?', 'Schneller oder nur eine andere Richtung?'),
      text: L(`<p>${cap(pt.name())} flies at the same speed (A) into a uniform magnetic field ${dirName([0, 0, bz])}, and (B) into the field between two charged plates. In B it leaves the plates before it hits one.</p>`,
        `<p>${cap(pt.name())} fliegt mit derselben Geschwindigkeit (A) in ein homogenes Magnetfeld, das ${dirName([0, 0, bz])} zeigt, und (B) in das Feld zwischen zwei geladenen Platten. In B verlässt es die Platten, bevor es eine trifft.</p>`),
      figs: fig(pathFig({ box: BOX, region: REGION, bz, q, sym: pt.sym, pts: [[-0.6, 0], [0.4, 0]], name: 'A' })) + fig(capFig({ top, q, sym: pt.sym, v: true, field: true, label: 'B' })),
      questions: [
        choice('m', L('(a) A: when it leaves the magnetic field, its speed is', '(a) A: Wenn es das Magnetfeld verlässt, ist seine Geschwindigkeit'), words(r, [[same, true, howM], [more, false, howM, 'work'], [less, false, howM, 'work'], [sign, false, signWhy(howM), 'sign']])),
        choice('e', L('(b) B: when it leaves the plates, its speed is', '(b) B: Wenn es die Platten verlässt, ist seine Geschwindigkeit'), words(r, [[more, true, howE], [same, false, L(`Unlike the magnetic force, the electric force has a part along the motion here. ${howE}`, `Anders als die magnetische Kraft hat die elektrische hier einen Teil in Bewegungsrichtung. ${howE}`), 'efield', L('Does the electric force here have a part along the motion?', 'Hat die elektrische Kraft hier einen Teil in Bewegungsrichtung?')], [less, false, howE, 'efield'], [sign, false, signWhy(howE), 'sign']])),
        choice('why', L('(c) The magnetic field does not change its speed because the magnetic force', '(c) Das Magnetfeld ändert seine Geschwindigkeit nicht, weil die magnetische Kraft'), words(r, [
          [L('is always perpendicular to its velocity', 'immer senkrecht zu seiner Geschwindigkeit steht'), true, howM],
          [L('is too weak to change the speed', 'zu schwach ist, um die Geschwindigkeit zu ändern'), false, L(`A strong field only makes a tighter circle. ${howM}`, `Ein starkes Feld ergibt nur einen engeren Kreis. ${howM}`), 'work'],
          [L('points along the field lines', 'längs der Feldlinien zeigt'), false, L(`The magnetic force is perpendicular to the field and to the velocity. ${howM}`, `Die magnetische Kraft steht senkrecht zum Feld und zur Geschwindigkeit. ${howM}`), 'perp', L('Does the magnetic force really point along the field lines? Check with the hand rule.', 'Zeigt die magnetische Kraft wirklich längs der Feldlinien? Prüfe es mit der Handregel.')],
          [L('acts only at the edge of the field', 'nur am Rand des Feldes wirkt'), false, L(`It acts everywhere in the field: it bends the path all the way round. ${howM}`, `Sie wirkt überall im Feld: Sie biegt die Bahn den ganzen Weg. ${howM}`), 'perp']])),
        choice('turns', L('(d) If it stayed in the magnetic field for ten turns, its kinetic energy after them would be', '(d) Bliebe es zehn Umläufe lang im Magnetfeld, wäre seine kinetische Energie danach'), words(r, [
          [L('the same as at the start', 'gleich wie zu Beginn'), true, howM],
          [L('ten times as large', 'zehnmal so gross'), false, howM, 'work'],
          [L('smaller: it spirals inwards', 'kleiner: Es spiralt nach innen'), false, howM, 'work'],
          [L('zero: it comes to rest', 'gleich null: Es kommt zur Ruhe'), false, howM, 'work']])),
      ],
      hints: [
        L(`The speed changes only if a force does work on ${pt.name()}: W = F·s·cos α, with α the angle between the force and the motion. What is that angle in A, and in B?`, `Der Betrag der Geschwindigkeit ändert sich nur, wenn eine Kraft an ${pt.name().replace(/^ein /, 'einem ')} Arbeit verrichtet: W = F·s·cos α, mit α dem Winkel zwischen Kraft und Bewegung. Wie gross ist dieser Winkel in A, wie in B?`),
        L(`A: ${q > 0 ? 'right' : 'left'} hand, thumb along the velocity, index finger ${dirName([0, 0, bz])}: how does the force lie compared with the velocity, at the entry and later on the curve? (c) and (d) follow from the same angle.`, `A: ${q > 0 ? 'Rechte' : 'Linke'} Hand, Daumen in Richtung der Geschwindigkeit, Zeigefinger ${dirName([0, 0, bz])}: Wie steht die Kraft zur Geschwindigkeit, beim Eintritt und später auf der Kurve? (c) und (d) folgen aus demselben Winkel.`),
        L(`B: the upper plate is ${top > 0 ? 'positive' : 'negative'}; the force q·E points the same way the whole time, and the path bends in the direction of the force. Is α then smaller or larger than 90°?`, `B: Die obere Platte ist ${top > 0 ? 'positiv' : 'negativ'}; die Kraft q·E zeigt die ganze Zeit in dieselbe Richtung, und die Bahn biegt in Richtung der Kraft ab. Ist α dann kleiner oder grösser als 90°?`),
      ],
      solution: [howM, howE], solFig: fig(pathFig({ box: BOX, region: REGION, bz, q, sym: pt.sym, pts: entry })), p: { pt: pt.id, bz, top },
    };
  }

  // ---------------------------------------------------------------- radius and period
  // [mass in u, charge in e, id, [en, de], the German genitive]
  const WHAT = {
    deuteron: ['a deuteron is the nucleus of heavy hydrogen (deuterium): one proton and one neutron', 'ein Deuteron ist der Kern von schwerem Wasserstoff (Deuterium): ein Proton und ein Neutron'],
    triton: ['a triton is the nucleus of the heaviest hydrogen (tritium): one proton and two neutrons', 'ein Triton ist der Kern des schwersten Wasserstoffs (Tritium): ein Proton und zwei Neutronen'],
    alpha: ['an alpha particle is a helium nucleus: two protons and two neutrons', 'ein Alphateilchen ist ein Heliumkern: zwei Protonen und zwei Neutronen'],
  };
  const RATIO = [[1, 1, 'proton', ['a proton', 'ein Proton'], 'eines Protons'], [2, 1, 'deuteron', ['a deuteron', 'ein Deuteron'], 'eines Deuterons'], [3, 1, 'triton', ['a triton', 'ein Triton'], 'eines Tritons'],
    [4, 2, 'alpha', ['an alpha particle', 'ein Alphateilchen'], 'eines Alphateilchens'], [4, 1, 'he', ['a He⁺ ion', 'ein He⁺-Ion'], 'eines He⁺-Ions'], [12, 6, 'c6', ['a C⁶⁺ ion', 'ein C⁶⁺-Ion'], 'eines C⁶⁺-Ions']];
  const times2 = (x) => (Math.abs(x - 1) < 1e-9 ? L('the same', 'gleich gross') : x > 1 ? L(`${nice(x)} times as large`, `${nice(x)}-mal so gross`) : L(`1/${nice(1 / x)} as large`, `1/${nice(1 / x)} so gross`));
  function radiusCompare(seed) {
    const r = rng(seed * 61 + 31);
    for (;;) {
      const [a, b] = r.shuffle(RATIO.slice()).slice(0, 2), ratio = (b[0] / b[1]) / (a[0] / a[1]);
      if (Math.abs(ratio - 1) < 1e-9 && r.next() < 0.7) continue;
      // four options: the right one, then the tempting ones [x, tag], then fillers
      const opt = (right, list, why) => {
        const out = [];
        for (const [x, tag] of [[right], ...list, [2, 'other'], [0.5, 'other'], [4, 'other'], [0.25, 'other']]) if (out.length < 4 && !out.some((o) => Math.abs(o.x - x) < 1e-9)) out.push({ x, tag });
        return out.sort((p, q) => p.x - q.x).map((o) => ({ label: times2(o.x), ok: Math.abs(o.x - right) < 1e-9, tag: Math.abs(o.x - right) < 1e-9 ? undefined : o.tag, why: Math.abs(o.x - right) < 1e-9 ? '' : why }));
      };
      const how = L(`At the same speed and in the same field, r = m·v/(q·B) is proportional to m/q: ${b[0]}u/${b[1]}e for the second, ${a[0]}u/${a[1]}e for the first, a ratio of ${nice(ratio)}. The period T = 2π·m/(q·B) has the same ratio.`,
        `Bei gleicher Geschwindigkeit und im selben Feld ist r = m·v/(q·B) proportional zu m/q: ${b[0]}u/${b[1]}e für das zweite, ${a[0]}u/${a[1]}e für das erste, ein Verhältnis von ${nice(ratio)}. Die Umlaufzeit T = 2π·m/(q·B) hat dasselbe Verhältnis.`);
      const change = r.pick(['v', 'B']), howC = change === 'v' ? L('Twice as fast: r = m·v/(q·B) doubles.', 'Doppelt so schnell: r = m·v/(q·B) verdoppelt sich.')
        : L('Twice the field: r = m·v/(q·B) halves.', 'Doppeltes Feld: r = m·v/(q·B) halbiert sich.');
      const howP = L('Twice as fast, the circle is twice as large, so twice as long: one turn takes the same time. T = 2π·r/v = 2π·m/(q·B) does not depend on the speed.', 'Doppelt so schnell ist der Kreis doppelt so gross, also doppelt so lang: Ein Umlauf dauert gleich lang. T = 2π·r/v = 2π·m/(q·B) hängt nicht von der Geschwindigkeit ab.');
      return {
        kind: 'radius', title: L('Comparing circles', 'Kreise vergleichen'),
        text: L(`<p>${cap(L(...a[3]))} and ${L(...b[3])} move at the same speed perpendicular to the same uniform magnetic field.</p>`, `<p>${cap(L(...a[3]))} und ${L(...b[3])} bewegen sich mit derselben Geschwindigkeit senkrecht zum selben homogenen Magnetfeld.</p>`) +
          `<p class="note">${[a, b].map((x, i) => `${(i ? (y) => y : cap)(L(...x[3]).replace(/^(a|an|ein) /, ''))}: ${L('mass', 'Masse')} ${x[0]} u, ${L('charge', 'Ladung')} +${x[1] === 1 ? '' : x[1]}e`).join('; ')}.${[a, b].filter((x) => WHAT[x[2]]).map((x) => ` ${cap(L(...WHAT[x[2]]))}.`).join('')}</p>`,
        figs: '',
        questions: [
          choice('r', L(`(a) Compared with the circle of ${L(...a[3])}, the radius of the circle of ${L(...b[3])} is`, `(a) Verglichen mit der Kreisbahn ${a[4]} ist der Radius der Kreisbahn ${b[4]}`), opt(ratio, [[1 / ratio, 'inverse'], [ratio * ratio, 'other'], [ratio * 2, 'other'], [1, 'same']], how)),
          choice('T', L(`(b) Compared with the time for one turn of ${L(...a[3])}, the time for one turn of ${L(...b[3])} is`, `(b) Verglichen mit der Umlaufzeit ${a[4]} ist die Umlaufzeit ${b[4]}`), opt(ratio, [[1, 'same'], [1 / ratio, 'inverse'], [ratio * 2, 'other']], how)),
          choice('c', change === 'v' ? L(`(c) If ${L(...a[3])} were twice as fast, the radius of its circle would be`, `(c) Wäre ${L(...a[3])} doppelt so schnell, wäre der Radius seiner Kreisbahn`) : L(`(c) In a field twice as strong, the radius of the circle of ${L(...a[3])} would be`, `(c) In einem doppelt so starken Feld wäre der Radius der Kreisbahn ${a[4]}`),
            opt(change === 'v' ? 2 : 0.5, change === 'v' ? [[1, 'same'], [0.5, 'inverse'], [4, 'other']] : [[2, 'inverse'], [1, 'same'], [0.25, 'other']], howC)),
          choice('p', L(`(d) If ${L(...a[3])} were twice as fast, the time for one turn would be`, `(d) Wäre ${L(...a[3])} doppelt so schnell, wäre die Zeit für einen Umlauf`), opt(1, [[2, 'period'], [0.5, 'period'], [4, 'period']], howP)),
        ],
        hints: [
          L(`The same speed and the same field: only the particles differ, ${L(...a[3])} (${a[0]} u, ${a[1]}e) and ${L(...b[3])} (${b[0]} u, ${b[1]}e).`, `Dieselbe Geschwindigkeit und dasselbe Feld: Nur die Teilchen unterscheiden sich, ${L(...a[3])} (${a[0]} u, ${a[1]}e) und ${L(...b[3])} (${b[0]} u, ${b[1]}e).`),
          L(`(a), (b) r = m·v/(q·B) and T = 2π·m/(q·B): with v and B the same, both go with m/q, ${a[0]}/${a[1]} u/e against ${b[0]}/${b[1]} u/e.`, `(a), (b) r = m·v/(q·B) und T = 2π·m/(q·B): Bei gleichem v und B gehen beide mit m/q, ${a[0]}/${a[1]} u/e gegen ${b[0]}/${b[1]} u/e.`),
          L(`(c), (d) Now only ${change === 'v' ? `the speed of ${L(...a[3])}` : 'the field'} changes, ×2. Where does ${change === 'v' ? 'v' : 'B'} stand in r = m·v/(q·B)? And for the period, T = 2π·r/v: what happens to r and to v if it is twice as fast?`, `(c), (d) Nun ändert sich nur ${change === 'v' ? `die Geschwindigkeit ${a[4]}` : 'das Feld'}, ×2. Wo steht ${change === 'v' ? 'v' : 'B'} in r = m·v/(q·B)? Und für die Umlaufzeit, T = 2π·r/v: Was geschieht mit r und mit v, wenn es doppelt so schnell ist?`),
        ],
        solution: [how, howC, howP], p: { a: a[2], b: b[2], change },
      };
    }
  }
  function tracks(seed) {
    // An uncharged particle (no track) comes in from the left and makes four charged ones at the
    // point: two positive and two negative (charge is conserved), flying forwards, their momenta
    // across the incoming direction nearly cancelling (momentum is conserved).
    const r = rng(seed * 67 + 37), bz = r.pick([1, -1]), names = ['A', 'B', 'C', 'D'];
    for (;;) {
      const qs = r.shuffle([1, 1, -1, -1]), dirs = r.shuffle([-55, -20, 20, 55]);
      const ts = names.map((name, i) => {
        const q = qs[i], spiral = r.next() < 0.3, R = spiral ? r.pick([1.6, 2.4]) : r.pick([1.6, 2.4, 3.6, 6, 10]), a0 = ((dirs[i] + r.int(-12, 12)) * Math.PI) / 180;
        const s = -Math.sign(q * bz); // a positive charge in a field out of the page turns clockwise
        const pts = [[0, 0]];
        let x = 0, y = 0, h = a0, rr = R, len = 0;
        while (len < (spiral ? 22 : Math.min(5.5, R * 2.6)) && x > -2.9 && x < 7.8 && Math.abs(y) < 4.4) { x += 0.06 * Math.cos(h); y += 0.06 * Math.sin(h); h += (s * 0.06) / rr; len += 0.06; if (spiral) rr = Math.max(0.25, rr * 0.994); pts.push([x, y]); }
        return { name, q, R, a0, spiral, pts };
      });
      const pos = ts.filter((t) => t.q > 0), bigR = Math.max(...ts.map((t) => t.R)), biggest = ts.filter((t) => t.R === bigR), spirals = ts.filter((t) => t.spiral);
      // the momentum p ∝ R (the same charge): across the incoming direction it must nearly cancel
      const across = ts.reduce((a, t) => a + t.R * Math.sin(t.a0), 0), all = ts.reduce((a, t) => a + t.R, 0);
      if (biggest.length !== 1 || spirals.length !== 1 || spirals[0] === biggest[0] || Math.abs(across) > 0.12 * all) continue;
      const turn = (q) => (q * bz > 0 ? L('clockwise', 'im Uhrzeigersinn') : L('anticlockwise', 'im Gegenuhrzeigersinn'));
      const howS = L(`In a field ${dirName([0, 0, bz])}, a positive charge turns ${turn(1)} (right hand), a negative one ${turn(-1)}: positive are ${pos.map((t) => t.name).join(', ')}. This fits charge conservation: the incoming particle was uncharged, so two are positive and two negative.`, `In einem Feld, das ${dirName([0, 0, bz])} zeigt, dreht eine positive Ladung ${turn(1)} (rechte Hand), eine negative ${turn(-1)}: positiv sind ${pos.map((t) => t.name).join(', ')}. Das passt zur Ladungserhaltung: Das einfallende Teilchen war ungeladen, also sind zwei positiv und zwei negativ.`);
      const howP = L(`r = m·v/(q·B) = p/(q·B): with the same charge, the largest momentum gives the widest, straightest track, ${biggest[0].name}.`, `r = m·v/(q·B) = p/(q·B): Bei gleicher Ladung ergibt der grösste Impuls die weiteste, geradeste Spur, ${biggest[0].name}.`);
      const howSp = L(`The particle of track ${spirals[0].name} loses energy in the liquid of the chamber: it slows down, and r = m·v/(q·B) shrinks. (The magnetic field itself does not slow it down.)`, `Das Teilchen der Spur ${spirals[0].name} verliert in der Flüssigkeit der Kammer Energie: Es wird langsamer, und r = m·v/(q·B) schrumpft. (Das Magnetfeld selbst bremst es nicht ab.)`);
      return {
        kind: 'tracks', title: L('Tracks in a bubble chamber', 'Spuren in einer Blasenkammer'),
        text: L(`<p>In a bubble chamber with a magnetic field ${dirName([0, 0, bz])}, an uncharged particle (it leaves no track, dashed) comes in from the left. At one point it turns into four charged particles, all with a charge of the same size.</p>`, `<p>In einer Blasenkammer mit einem Magnetfeld, das ${dirName([0, 0, bz])} zeigt, kommt von links ein ungeladenes Teilchen herein (es hinterlässt keine Spur, gestrichelt). In einem Punkt wandelt es sich in vier geladene Teilchen um, alle mit einer Ladung vom selben Betrag.</p>`),
        figs: fig(tracksFig({ bz, tracks: ts, incoming: true })),
        questions: [
          tiles('pos', L('(a) Which tracks belong to positive particles? Tick all.', '(a) Welche Spuren gehören zu positiven Teilchen? Kreuze alle an.'), ts.map((t) => ({ html: `<span class="dtile"><b class="k${names.indexOf(t.name)}">${t.name}</b></span>`, ok: t.q > 0, why: howS })), true),
          tiles('p', L('(b) Which particle has the largest momentum?', '(b) Welches Teilchen hat den grössten Impuls?'), ts.map((t) => ({ html: `<span class="dtile"><b class="k${names.indexOf(t.name)}">${t.name}</b></span>`, ok: t === biggest[0], why: howP, tag: t === biggest[0] ? undefined : t.spiral ? 'curl' : 'inverse' }))),
          choice('sp', L(`(c) Track ${spirals[0].name} gets tighter and tighter because`, `(c) Spur ${spirals[0].name} wird immer enger, weil`), words(r, [
            [L('the particle slows down', 'das Teilchen langsamer wird'), true, howSp],
            [L('the field is stronger in the middle', 'das Feld in der Mitte stärker ist'), false, howSp, 'other'],
            [L('the magnetic force slows the particle down', 'die magnetische Kraft das Teilchen abbremst'), false, howSp, 'work'],
            [L('the particle’s charge grows', 'die Ladung des Teilchens wächst'), false, howSp, 'other']])),
        ],
        hints: [
          L(`The incoming particle was uncharged, so the charges of A, B, C and D add up to zero: how many tracks must turn each way?`, `Das einfallende Teilchen war ungeladen, also ergeben die Ladungen von A, B, C und D zusammen null: Wie viele Spuren müssen in jede Richtung drehen?`),
          L(`(a) A positive particle flying forwards in a field ${dirName([0, 0, bz])}: right hand, thumb along its track, index finger ${dirName([0, 0, bz])}. Does the middle finger turn the track clockwise or anticlockwise?`, `(a) Ein positives Teilchen fliegt vorwärts in einem Feld, das ${dirName([0, 0, bz])} zeigt: rechte Hand, Daumen längs seiner Spur, Zeigefinger ${dirName([0, 0, bz])}. Dreht der Mittelfinger die Spur im oder gegen den Uhrzeigersinn?`),
          L(`(b) All four charges have the same size, so r = m·v/(q·B) = p/(q·B) grows with the momentum: compare how sharply the tracks bend. (c) Along track ${spirals[0].name}, q and B stay the same: which quantity in r = m·v/(q·B) is left to change?`, `(b) Alle vier Ladungen sind gleich gross, also wächst r = m·v/(q·B) = p/(q·B) mit dem Impuls: Vergleiche, wie stark die Spuren gekrümmt sind. (c) Längs Spur ${spirals[0].name} bleiben q und B gleich: Welche Grösse in r = m·v/(q·B) kann sich noch ändern?`),
        ],
        solution: [howS, howP, howSp], p: { seed: seed % 997, bz },
      };
    }
  }

  // ---------------------------------------------------------------- crossed fields
  // the particles flying in: [English, German, the symbol drawn (none: drawn with its sign)]
  const FLOCK = {
    1: [['positive ions', 'Positive Ionen', null], ['protons', 'Protonen', 'p'], ['sodium ions (Na⁺)', 'Natrium-Ionen (Na⁺)', 'Na⁺'], ['alpha particles', 'Alphateilchen', 'α']],
    '-1': [['negative ions', 'Negative Ionen', null], ['electrons', 'Elektronen', 'e⁻'], ['chloride ions (Cl⁻)', 'Chlorid-Ionen (Cl⁻)', 'Cl⁻']],
  };
  function selector(seed) {
    const r = rng(seed * 71 + 41), q = r.pick([1, -1]), who = r.pick(FLOCK[q]), Edown = r.next() < 0.5, E = r.pick([1, 2, 3, 4, 6]) * 1e4, B = r.pick([0.05, 0.1, 0.2, 0.25]), v = E / B;
    const bz = Edown ? -1 : 1; // the magnetic force on a positive charge moving right opposes the electric one
    const mag = force(q, [1, 0, 0], [0, 0, bz]), plate = (d) => (d[1] > 0 ? L('towards the upper plate', 'zur oberen Platte') : L('towards the lower plate', 'zur unteren Platte'));
    const how = L(`It passes straight when the two forces cancel: q·E = q·v·B, so v = E/B = ${sci(E)} V/m / ${nice(B)} T = ${sci(v)} m/s, whatever its charge and mass.`, `Es fliegt gerade durch, wenn sich die beiden Kräfte aufheben: q·E = q·v·B, also v = E/B = ${sci(E)} V/m / ${nice(B)} T = ${sci(v)} m/s, unabhängig von Ladung und Masse.`);
    const howFast = L(`For a faster particle, the magnetic force q·v·B is larger than the electric one, q·E: it is pushed ${plate(mag)}, the way the magnetic force points.`, `Bei einem schnelleren Teilchen ist die magnetische Kraft q·v·B grösser als die elektrische, q·E: Es wird ${plate(mag)} gedrückt, in Richtung der magnetischen Kraft.`);
    const howSame = L('Both forces are proportional to q and do not depend on the mass: at v = E/B they cancel for any particle. With the other sign, both forces turn round together.', 'Beide Kräfte sind proportional zu q und hängen nicht von der Masse ab: Bei v = E/B heben sie sich für jedes Teilchen auf. Mit dem anderen Vorzeichen kehren beide Kräfte zusammen um.');
    const vals = [{ value: v, ok: true, why: '' }, { value: B / E, tag: 'inv', why: how }, { value: E * B, tag: 'inv', why: how }, { value: v * 2, tag: 'other', why: how }, { value: v / 2, tag: 'other', why: how }]
      .filter((o, i, arr) => arr.findIndex((x) => Math.abs(Math.log(x.value / o.value)) < 0.1) === i).slice(0, 4).sort((a, b) => a.value - b.value).map((o) => ({ ...o, label: `${sci(o.value)} m/s` }));
    // where a particle goes: the right place, the others with the wrong idea behind them
    const four = (right, why, tags) => r.shuffle([[plate([0, 1, 0]), 'up'], [plate([0, -1, 0]), 'down'], [L('straight through', 'gerade durch'), 'straight'], [L('straight through, but slower', 'gerade durch, aber langsamer'), 'slower']]
      .map(([label, k]) => ({ label, ok: k === right, why: k === right ? '' : why, tag: k === right ? undefined : k === 'slower' ? 'work' : tags[k] || 'other' })));
    const fastTo = mag[1] > 0 ? 'up' : 'down', elTo = fastTo === 'up' ? 'down' : 'up';
    return {
      kind: 'selector', title: L('The velocity selector', 'Das Geschwindigkeitsfilter'),
      text: L(`<p>Between two charged plates, the electric field (${sci(E)} V/m) points ${Edown ? 'down' : 'up'}; a magnetic field of ${nice(B)} T points ${dirName([0, 0, bz])}. ${cap(who[0])} fly in from the left.</p>`, `<p>Zwischen zwei geladenen Platten zeigt das elektrische Feld (${sci(E)} V/m) nach ${Edown ? 'unten' : 'oben'}; ein Magnetfeld von ${nice(B)} T zeigt ${dirName([0, 0, bz])}. ${who[1]} fliegen von links herein.</p>`),
      figs: fig(selectorFig({ Edown, bz, q, sym: who[2] })),
      questions: [
        choice('v', L('(a) the speed of the particles that pass straight through', '(a) die Geschwindigkeit der Teilchen, die gerade durchfliegen'), vals),
        choice('fast', L('(b) A faster particle of the same kind is deflected', '(b) Ein schnelleres Teilchen derselben Art fliegt'), four(fastTo, howFast, { [elTo]: 'fast', straight: 'fast' })),
        choice('heavy', L('(c) A particle with twice the mass (same charge, speed v = E/B) flies', '(c) Ein Teilchen mit doppelter Masse (gleiche Ladung, Geschwindigkeit v = E/B) fliegt'), four('straight', howSame, { up: 'mass', down: 'mass' })),
        choice('sign', L('(d) A particle with a charge of the opposite sign and the speed v = E/B flies', '(d) Ein Teilchen mit einer Ladung umgekehrten Vorzeichens und der Geschwindigkeit v = E/B fliegt'), four('straight', howSame, { up: 'mass', down: 'mass' })),
      ],
      hints: [
        L(`${cap(who[0])} are ${signName(q)} and fly to the right; E points ${Edown ? 'down' : 'up'}, B ${dirName([0, 0, bz])}. Which way does the electric force q·E on them point, and which way the magnetic force (${q > 0 ? 'right' : 'left'} hand)?`, `${who[1]} sind ${q > 0 ? 'positiv' : 'negativ'} und fliegen nach rechts; E zeigt nach ${Edown ? 'unten' : 'oben'}, B ${dirName([0, 0, bz])}. Wohin zeigt die elektrische Kraft q·E auf sie, wohin die magnetische Kraft (${q > 0 ? 'rechte' : 'linke'} Hand)?`),
        L(`(a) A particle passes straight through when the two forces cancel, q·E = q·v·B: solve for v, then use the given field strengths E and B.`, `(a) Ein Teilchen fliegt gerade durch, wenn sich die beiden Kräfte aufheben, q·E = q·v·B: Löse nach v auf und nimm dann die gegebenen Feldstärken E und B.`),
        L('(b)–(d) Look at q·E = q·v·B again: which side grows for a faster particle? Does the mass appear in it at all? What happens to both sides if q changes its sign?', '(b)–(d) Schau nochmals q·E = q·v·B an: Welche Seite wächst bei einem schnelleren Teilchen? Kommt die Masse darin überhaupt vor? Was geschieht mit beiden Seiten, wenn q das Vorzeichen wechselt?'),
      ],
      solution: [how, howFast, howSame], solFig: fig(selectorFig({ Edown, bz, q, sym: who[2], forces: true })), p: { q, Edown, E, B, who: who[0] },
    };
  }
  // A strip with a current in a magnetic field: the moving charges are pushed to one edge until the
  // electric field of the charged edges balances the magnetic force.
  // The velocity selector with one field to find: the particles pass straight through, the
  // direction of the electric field (and which plate is +) or of the magnetic field is asked.
  function crossedDir(seed) {
    const r = rng(seed * 113 + 29), q = r.pick([1, -1]), who = r.pick(FLOCK[q]), askE = r.next() < 0.5, Edown = r.next() < 0.5;
    const bz = Edown ? -1 : 1, Ey = Edown ? -1 : 1; // balanced: the forces cancel
    const Fm = force(q, [1, 0, 0], [0, 0, bz]), Fe = [0, q * Ey, 0];
    const hand = q > 0 ? L('right hand', 'rechte Hand') : L('left hand', 'linke Hand');
    const opp = L('The electric force must point the other way, so that the two cancel', 'Die elektrische Kraft muss in die Gegenrichtung zeigen, damit sich die beiden aufheben');
    const opp2 = L('The magnetic force must point the other way, so that the two cancel', 'Die magnetische Kraft muss in die Gegenrichtung zeigen, damit sich die beiden aufheben');
    const along = q > 0 ? L('a positive charge is pushed along the field', 'eine positive Ladung wird in Feldrichtung gedrückt') : L('a negative charge is pushed against the field', 'eine negative Ladung wird entgegen dem Feld gedrückt');
    const dir = (w) => dirName(w);
    let qa, howA, howB, qb;
    const tile = (d, ok, why, tag) => [cap(dir(d)), ok, why, tag];
    if (askE) {
      howA = L(`The ${signName(q)} particles fly to the right in a field ${dir([0, 0, bz])}: ${hand}, the magnetic force points ${dir(Fm)}. ${opp}: ${dir(Fe)}. Since ${along}, the electric field points ${dir([0, Ey, 0])}.`,
        `Die ${q > 0 ? 'positiven' : 'negativen'} Teilchen fliegen nach rechts in einem Feld, das ${dir([0, 0, bz])} zeigt: ${hand}, die magnetische Kraft zeigt ${dir(Fm)}. ${opp}: ${dir(Fe)}. Da ${along}, zeigt das elektrische Feld ${dir([0, Ey, 0])}.`);
      howB = L(`The field points from the positive to the negative plate: the ${Edown ? 'upper' : 'lower'} plate is positive.`, `Das Feld zeigt von der positiven zur negativen Platte: Die ${Edown ? 'obere' : 'untere'} Platte ist positiv.`);
      qa = choice('dir', L('(a) The electric field between the plates points', '(a) Das elektrische Feld zwischen den Platten zeigt'), words(r, [
        tile([0, Ey, 0], true, howA), tile([0, -Ey, 0], false, howA, q < 0 ? 'sign' : 'hand'),
        tile([1, 0, 0], false, L(`An electric field along the velocity would only speed the particles up or slow them down; it could not cancel the magnetic force. ${howA}`, `Ein elektrisches Feld in Bewegungsrichtung würde die Teilchen nur schneller oder langsamer machen; es könnte die magnetische Kraft nicht aufheben. ${howA}`), 'perp'),
        tile([0, 0, bz], false, L(`The electric field of two plates points from one plate to the other. ${howA}`, `Das elektrische Feld zweier Platten zeigt von einer Platte zur anderen. ${howA}`), 'perp')]));
      qb = choice('plate', L('(b) The positive plate is', '(b) Die positive Platte ist'), words(r, [
        [L('the upper plate', 'die obere Platte'), Edown, howB, 'other'], [L('the lower plate', 'die untere Platte'), !Edown, howB, 'other']]));
    } else {
      howA = L(`The electric field points ${dir([0, Ey, 0])}, and ${along}: the electric force points ${dir(Fe)}. ${opp2}: ${dir(Fm)}. ${cap(hand)}: thumb to the right (the velocity), middle finger ${dir(Fm)} (the force): the index finger, the magnetic field, points ${dir([0, 0, bz])}.`,
        `Das elektrische Feld zeigt ${dir([0, Ey, 0])}, und ${along}: Die elektrische Kraft zeigt ${dir(Fe)}. ${opp2}: ${dir(Fm)}. ${cap(hand)}: Daumen nach rechts (die Geschwindigkeit), Mittelfinger ${dir(Fm)} (die Kraft): Der Zeigefinger, das Magnetfeld, zeigt ${dir([0, 0, bz])}.`);
      howB = L(`For a slower particle, the magnetic force q·v·B is smaller than the electric force q·E: it is pushed the way of the electric force, ${dir(Fe)}.`, `Bei einem langsameren Teilchen ist die magnetische Kraft q·v·B kleiner als die elektrische Kraft q·E: Es wird in Richtung der elektrischen Kraft gedrückt, ${dir(Fe)}.`);
      qa = choice('dir', L('(a) The magnetic field points', '(a) Das Magnetfeld zeigt'), words(r, [
        tile([0, 0, bz], true, howA), tile([0, 0, -bz], false, howA, 'hand'),
        tile([0, Ey, 0], false, L(`A magnetic field along the electric one would push the particles out of the page or into it, not up or down. ${howA}`, `Ein Magnetfeld parallel zum elektrischen würde die Teilchen aus der Seite heraus oder in sie hinein drücken, nicht nach oben oder unten. ${howA}`), 'perp'),
        tile([1, 0, 0], false, L(`A magnetic field along the velocity exerts no force at all. ${howA}`, `Ein Magnetfeld in Bewegungsrichtung übt gar keine Kraft aus. ${howA}`), 'perp')]));
      const plate = (d) => (d[1] > 0 ? L('towards the upper plate', 'zur oberen Platte') : L('towards the lower plate', 'zur unteren Platte'));
      qb = choice('slow', L('(b) A slower particle of the same kind is deflected', '(b) Ein langsameres Teilchen derselben Art fliegt'), r.shuffle([
        [plate(Fe), true, ''], [plate(Fm), false, 'fast'], [L('straight through', 'gerade durch'), false, 'fast'], [L('straight through, but faster', 'gerade durch, aber schneller'), false, 'work']]
        .map(([label, ok, tag]) => ({ label, ok, why: ok ? '' : howB, tag: ok ? undefined : tag }))));
    }
    return {
      kind: 'selector', title: L('Which way does the field point?', 'Wohin zeigt das Feld?'),
      text: L(`<p>${cap(who[0])} fly in from the left between two charged plates in a magnetic field and pass straight through. ${askE ? `The magnetic field points ${dir([0, 0, bz])}.` : `The electric field points ${Edown ? 'down' : 'up'}.`}</p>`,
        `<p>${who[1]} fliegen von links zwischen zwei geladene Platten in einem Magnetfeld und werden nicht abgelenkt. ${askE ? `Das Magnetfeld zeigt ${dir([0, 0, bz])}.` : `Das elektrische Feld zeigt nach ${Edown ? 'unten' : 'oben'}.`}</p>`),
      figs: fig(selectorFig({ Edown, bz, q, sym: who[2], noE: askE, noB: !askE })),
      questions: [qa, qb],
      hints: [
        L(`${cap(who[0])} are ${signName(q)} and pass straight through, and ${askE ? `the magnetic field points ${dir([0, 0, bz])}` : `the electric field points ${Edown ? 'down' : 'up'}`}. Straight through: the electric and the magnetic force cancel, so they point in opposite directions.`, `${who[1]} sind ${q > 0 ? 'positiv' : 'negativ'} und fliegen gerade durch, und ${askE ? `das Magnetfeld zeigt ${dir([0, 0, bz])}` : `das elektrische Feld zeigt nach ${Edown ? 'unten' : 'oben'}`}. Gerade durch: Die elektrische und die magnetische Kraft heben sich auf, zeigen also in entgegengesetzte Richtungen.`),
        askE ? L(`Start with the given field: ${hand}, thumb to the right (the velocity), index finger ${dir([0, 0, bz])}. Where does the magnetic force point? The electric force must point the other way.`, `Beginne mit dem gegebenen Feld: ${hand}, Daumen nach rechts (die Geschwindigkeit), Zeigefinger ${dir([0, 0, bz])}. Wohin zeigt die magnetische Kraft? Die elektrische Kraft muss in die Gegenrichtung zeigen.`)
          : L(`Start with the given field: E points ${Edown ? 'down' : 'up'}, and ${along}. Where does the electric force point? The magnetic force must point the other way.`, `Beginne mit dem gegebenen Feld: E zeigt nach ${Edown ? 'unten' : 'oben'}, und ${along}. Wohin zeigt die elektrische Kraft? Die magnetische Kraft muss in die Gegenrichtung zeigen.`),
        askE ? L(`From the electric force back to the field: ${along}. (b) The field between two plates points from the + plate to the − plate.`, `Von der elektrischen Kraft zurück zum Feld: ${along}. (b) Das Feld zwischen zwei Platten zeigt von der +Platte zur −Platte.`)
          : L(`From the magnetic force back to the field: ${hand}, thumb to the right, middle finger along the magnetic force: where must the index finger point? (b) For a slower particle, which is smaller, q·E or q·v·B?`, `Von der magnetischen Kraft zurück zum Feld: ${hand}, Daumen nach rechts, Mittelfinger in Richtung der magnetischen Kraft: Wohin muss der Zeigefinger zeigen? (b) Bei einem langsameren Teilchen: Was ist kleiner, q·E oder q·v·B?`),
      ],
      solution: [howA, howB], solFig: fig(selectorFig({ Edown, bz, q, sym: who[2], forces: true })), p: { q, askE, Edown, who: who[0] },
    };
  }
  function hall(seed) {
    const r = rng(seed * 107 + 71), I = r.pick([1, -1]), bz = r.pick([1, -1]), holes = r.next() < 0.25;
    const F = force(1, [I, 0, 0], [0, 0, bz]), gather = F[1] > 0 ? 'upper' : 'lower'; // either kind of carrier: q·v points along I
    const neg = holes ? (gather === 'upper' ? 'lower' : 'upper') : gather;
    const edge = (w) => (w === 'upper' ? L('the upper edge', 'der obere Rand') : L('the lower edge', 'der untere Rand'));
    const vdir = holes ? [I, 0, 0] : [-I, 0, 0];
    const how = holes
      ? L(`The positive charge carriers move along the current, ${dirName(vdir)}. Right hand: thumb ${dirName(vdir)}, index finger ${dirName([0, 0, bz])}: the force points ${dirName(F)}. They gather at ${edge(gather)}, which becomes positive; ${edge(neg)}, short of them, becomes negative.`,
        `Die positiven Ladungsträger bewegen sich in Stromrichtung, ${dirName(vdir)}. Rechte Hand: Daumen ${dirName(vdir)}, Zeigefinger ${dirName([0, 0, bz])}: Die Kraft zeigt ${dirName(F)}. Sie sammeln sich am ${gather === 'upper' ? 'oberen' : 'unteren'} Rand, der positiv wird; der ${neg === 'upper' ? 'obere' : 'untere'} Rand, wo sie fehlen, wird negativ.`)
      : L(`The electrons move against the current, ${dirName(vdir)}. Left hand (negative charge): thumb ${dirName(vdir)}, index finger ${dirName([0, 0, bz])}: the force points ${dirName(F)}. The electrons gather at ${edge(gather)}, which becomes negative; the other edge, short of electrons, becomes positive.`,
        `Die Elektronen bewegen sich gegen den Strom, ${dirName(vdir)}. Linke Hand (negative Ladung): Daumen ${dirName(vdir)}, Zeigefinger ${dirName([0, 0, bz])}: Die Kraft zeigt ${dirName(F)}. Die Elektronen sammeln sich am ${gather === 'upper' ? 'oberen' : 'unteren'} Rand, der negativ wird; der andere Rand, wo Elektronen fehlen, wird positiv.`);
    const howStop = L('The charged edges make an electric field across the strip, which pushes the moving charges back. The charge grows until the electric force e·E balances the magnetic force e·v·B: then the charges pass straight along the strip, as in a velocity selector. So E = v·B, and the Hall voltage is ΔV<sub>H</sub> = E·d = v·B·d (d: the width of the strip).',
      'Die geladenen Ränder erzeugen ein elektrisches Feld quer zum Streifen, das die bewegten Ladungen zurückdrückt. Die Ladung wächst, bis die elektrische Kraft e·E der magnetischen Kraft e·v·B das Gleichgewicht hält: Dann fliessen die Ladungen gerade längs des Streifens, wie im Geschwindigkeitsfilter. Also E = v·B, und die Hall-Spannung ist U<sub>H</sub> = E·d = v·B·d (d: die Breite des Streifens).');
    // (c) how U_H = v·B·d changes: [the change asked, the factor, the reason]; v grows with the
    // current in the same strip (I = n·e·v·A)
    const CHANGE = [
      [L('In a field twice as strong (the same current)', 'In einem doppelt so starken Feld (derselbe Strom)'), 2, L('ΔV<sub>H</sub> = v·B·d: the same current means the same drift speed v; twice the field, twice the Hall voltage.', 'U<sub>H</sub> = v·B·d: Derselbe Strom bedeutet dieselbe Driftgeschwindigkeit v; doppeltes Feld, doppelte Hall-Spannung.')],
      [L('In a field three times as strong (the same current)', 'In einem dreimal so starken Feld (derselbe Strom)'), 3, L('ΔV<sub>H</sub> = v·B·d: the same current means the same drift speed v; three times the field, three times the Hall voltage.', 'U<sub>H</sub> = v·B·d: Derselbe Strom bedeutet dieselbe Driftgeschwindigkeit v; dreifaches Feld, dreifache Hall-Spannung.')],
      [L('In a field half as strong (the same current)', 'In einem halb so starken Feld (derselbe Strom)'), 0.5, L('ΔV<sub>H</sub> = v·B·d: the same current means the same drift speed v; half the field, half the Hall voltage.', 'U<sub>H</sub> = v·B·d: Derselbe Strom bedeutet dieselbe Driftgeschwindigkeit v; halbes Feld, halbe Hall-Spannung.')],
      [L('With twice the current (the same field)', 'Mit doppelt so grossem Strom (dasselbe Feld)'), 2, L('ΔV<sub>H</sub> = v·B·d: in the same strip, twice the current means the charges drift twice as fast; the same field, so twice the Hall voltage.', 'U<sub>H</sub> = v·B·d: Im selben Streifen bedeutet ein doppelt so grosser Strom, dass die Ladungen doppelt so schnell driften; dasselbe Feld, also doppelte Hall-Spannung.')],
      [L('With twice the current in a field twice as strong', 'Mit doppelt so grossem Strom in einem doppelt so starken Feld'), 4, L('ΔV<sub>H</sub> = v·B·d: twice the current means twice the drift speed v, and the field is twice as strong too: 2·2 = 4 times the Hall voltage.', 'U<sub>H</sub> = v·B·d: Doppelter Strom bedeutet doppelte Driftgeschwindigkeit v, und auch das Feld ist doppelt so stark: 2·2 = 4-mal die Hall-Spannung.')],
    ];
    const pc = r.pick(CHANGE), [askU, fU, howU] = pc;
    // for the hint: the factors of B and I in the change asked
    const [fB, fI] = [[2, 1], [3, 1], [0.5, 1], [1, 2], [2, 2]][CHANGE.indexOf(pc)];
    const optsU = [[fU, ''], [1, 'same'], [1 / fU, 'inverse'], [fU === 4 ? 2 : fU * fU, 'other']];
    for (const x of [4, 2, 0.5, 3]) if (optsU.length < 4 && !optsU.some(([y]) => Math.abs(y - x) < 1e-9)) optsU.push([x, 'other']);
    // (a) which edge becomes negative, or which positive
    const askPos = r.next() < 0.5;
    const end = I > 0 ? L('the right end of the strip', 'das rechte Ende des Streifens') : L('the left end of the strip', 'das linke Ende des Streifens');
    const upperNeg = neg === 'upper', upperAsk = askPos ? !upperNeg : upperNeg;
    const wrongEdge = askPos ? L(`That edge becomes negative, the other one positive. ${how}`, `Dieser Rand wird negativ, der andere positiv. ${how}`)
      : L(`That is where the ${holes ? 'positive carriers' : 'electrons'} would go if they moved the other way. ${how}`, `Dorthin gingen die ${holes ? 'positiven Ladungsträger' : 'Elektronen'}, wenn sie sich in die andere Richtung bewegten. ${how}`);
    const nudgeEdge = L('Check the hand rule again: which way do the carriers move, which way are they pushed, and what sign do they bring?', 'Prüfe die Handregel nochmals: Wohin bewegen sich die Ladungsträger, wohin werden sie gedrückt, und welches Vorzeichen bringen sie mit?');
    // (b) one of three: when the charge stops growing, the field across the strip, the other carriers
    const askB = r.pick(['stop', 'field', 'carriers']), posEdge = neg === 'upper' ? 'lower' : 'upper', Edir = [0, posEdge === 'upper' ? -1 : 1, 0];
    const carriers = holes ? L('positive carriers', 'positiven Ladungsträger') : L('electrons', 'Elektronen');
    const howField = L(`${cap(edge(posEdge))} becomes positive, ${edge(neg)} negative (${holes ? 'the carriers gather at the positive edge' : 'the electrons gather at the negative edge'}). The field points from + to −: ${dirName(Edir)}. It pushes the moving ${holes ? 'positive carriers' : 'electrons'} back, against the magnetic force.`,
      `${cap(edge(posEdge))} wird positiv, ${edge(neg)} negativ (${holes ? 'die Ladungsträger sammeln sich am positiven Rand' : 'die Elektronen sammeln sich am negativen Rand'}). Das Feld zeigt von + nach −: ${dirName(Edir)}. Es drückt die bewegten ${holes ? 'positiven Ladungsträger' : 'Elektronen'} zurück, gegen die magnetische Kraft.`);
    const howCarr = L('Positive carriers move along the current, electrons against it: the magnetic force (thumb along v, right hand for +, left hand for −) pushes both to the same edge. But there they bring the opposite charge, so the Hall voltage is reversed. That is how the Hall effect shows the sign of the moving charges.',
      'Positive Ladungsträger bewegen sich in Stromrichtung, Elektronen dagegen: Die magnetische Kraft (Daumen in Richtung v, rechte Hand für +, linke Hand für −) drückt beide zum selben Rand. Dort bringen sie aber die entgegengesetzte Ladung, also kehrt sich die Hall-Spannung um. So zeigt der Hall-Effekt das Vorzeichen der bewegten Ladungen.');
    const qb = askB === 'stop' ? choice('b', L('(b) The charge on the edges stops growing when', '(b) Die Ladung an den Rändern wächst nicht mehr, wenn'), words(r, [
          [L('the electric force of the charged edges balances the magnetic force', 'die elektrische Kraft der geladenen Ränder der magnetischen Kraft das Gleichgewicht hält'), true, howStop],
          [L('all the moving charges have gathered at one edge', 'sich alle bewegten Ladungen an einem Rand gesammelt haben'), false, L(`Only a tiny part of them is needed for the field across the strip; the current goes on. ${howStop}`, `Es braucht nur einen winzigen Teil davon für das Feld quer zum Streifen; der Strom fliesst weiter. ${howStop}`), 'balance'],
          [L('the current in the strip has stopped', 'der Strom im Streifen aufgehört hat'), false, L(`The current goes on flowing along the strip. ${howStop}`, `Der Strom fliesst weiter längs des Streifens. ${howStop}`), 'balance'],
          [L('the magnetic force has used up the energy of the charges', 'die magnetische Kraft die Energie der Ladungen aufgebraucht hat'), false, L(`The magnetic force does no work. ${howStop}`, `Die magnetische Kraft verrichtet keine Arbeit. ${howStop}`), 'work']]))
      : askB === 'field' ? choice('b', L('(b) The electric field the charged edges make inside the strip points', '(b) Das elektrische Feld, das die geladenen Ränder im Streifen erzeugen, zeigt'), words(r, [
        [cap(dirName(Edir)), true, howField], [cap(dirName([0, -Edir[1], 0])), false, howField, 'hallsign'],
        [cap(dirName([I, 0, 0])), false, L(`The charged edges make a field across the strip, from the positive to the negative edge. ${howField}`, `Die geladenen Ränder erzeugen ein Feld quer zum Streifen, vom positiven zum negativen Rand. ${howField}`), 'perp'],
        [cap(dirName([-I, 0, 0])), false, L(`The charged edges make a field across the strip, from the positive to the negative edge. ${howField}`, `Die geladenen Ränder erzeugen ein Feld quer zum Streifen, vom positiven zum negativen Rand. ${howField}`), 'perp']]))
      : choice('b', holes ? L('(b) If the same current were carried by electrons instead, in the same field, the Hall voltage would', '(b) Würde derselbe Strom stattdessen von Elektronen getragen, im selben Feld, würde die Hall-Spannung')
        : L('(b) If the same current were carried by positive charges instead, in the same field, the Hall voltage would', '(b) Würde derselbe Strom stattdessen von positiven Ladungen getragen, im selben Feld, würde die Hall-Spannung'), words(r, [
        [L('be reversed: the other edge would be positive', 'sich umkehren: der andere Rand wäre positiv'), true, howCarr],
        [L('stay the same: the same edge would be positive', 'gleich bleiben: derselbe Rand wäre positiv'), false, howCarr, 'hallsign'],
        [L('be zero', 'verschwinden'), false, howCarr, 'none'],
        [L('be twice as large', 'doppelt so gross sein'), false, howCarr, 'other']]));
    return {
      kind: 'hall', title: L('The Hall voltage', 'Die Hall-Spannung'),
      text: (holes ? L(`<p>A strip of a semiconductor carries a current ${it('I')} ${dirName([I, 0, 0])} in a magnetic field ${dirName([0, 0, bz])}. In this semiconductor the current is carried by positive charges.</p>`, `<p>Ein Streifen aus einem Halbleiter führt einen Strom ${it('I')} ${dirName([I, 0, 0])} in einem Magnetfeld, das ${dirName([0, 0, bz])} zeigt. In diesem Halbleiter wird der Strom von positiven Ladungen getragen.</p>`)
        : L(`<p>A copper strip carries a current ${it('I')} ${dirName([I, 0, 0])} in a magnetic field ${dirName([0, 0, bz])}. In copper the moving charges are electrons.</p>`, `<p>Ein Kupferstreifen führt einen Strom ${it('I')} ${dirName([I, 0, 0])} in einem Magnetfeld, das ${dirName([0, 0, bz])} zeigt. In Kupfer sind die bewegten Ladungen Elektronen.</p>`)),
      figs: fig(hallFig({ I, bz })),
      questions: [
        choice('edge', askPos ? L('(a) Which part of the strip becomes positively charged?', '(a) Welcher Teil des Streifens wird positiv geladen?') : L('(a) Which part of the strip becomes negatively charged?', '(a) Welcher Teil des Streifens wird negativ geladen?'), words(r, [
          [cap(edge('upper')), upperAsk, wrongEdge, 'hallsign', nudgeEdge],
          [cap(edge('lower')), !upperAsk, wrongEdge, 'hallsign', nudgeEdge],
          [cap(end), false, L(`The magnetic force is perpendicular to the motion of the charges: across the strip, not along it. ${how}`, `Die magnetische Kraft steht senkrecht zur Bewegung der Ladungen: quer zum Streifen, nicht längs. ${how}`), 'perp'],
          [L('No part: the charges only flow along the strip', 'Kein Teil: Die Ladungen fliessen nur längs des Streifens'), false, L(`The moving charges feel a magnetic force across the strip. ${how}`, `Die bewegten Ladungen spüren eine magnetische Kraft quer zum Streifen. ${how}`), 'none']])),
        qb,
        choice('u', L(`(c) ${askU}, the Hall voltage would be`, `(c) ${askU} wäre die Hall-Spannung`), optsU.map(([x, tag]) => ({ x, label: times2(x), ok: !tag, tag: tag || undefined, why: tag ? howU : '' })).sort((p, q) => p.x - q.x)),
      ],
      hints: [
        L(`The current flows ${dirName([I, 0, 0])}, the field points ${dirName([0, 0, bz])}. The moving charges are ${holes ? 'positive: they move along the current' : 'electrons: they move against the current'}. Which way do they move here?`, `Der Strom fliesst ${dirName([I, 0, 0])}, das Feld zeigt ${dirName([0, 0, bz])}. Die bewegten Ladungen sind ${holes ? 'positiv: Sie bewegen sich in Stromrichtung' : 'Elektronen: Sie bewegen sich gegen den Strom'}. Wohin bewegen sie sich hier?`),
        L(`(a) ${holes ? 'Right hand (positive carriers)' : 'Left hand (electrons)'}: thumb along their motion, index finger ${dirName([0, 0, bz])}. The middle finger shows the edge they are pushed to; that edge takes on their charge, ${holes ? '+' : '−'}.`, `(a) ${holes ? 'Rechte Hand (positive Ladungsträger)' : 'Linke Hand (Elektronen)'}: Daumen in ihrer Bewegungsrichtung, Zeigefinger ${dirName([0, 0, bz])}. Der Mittelfinger zeigt den Rand, zu dem sie gedrückt werden; dieser Rand bekommt ihre Ladung, ${holes ? '+' : '−'}.`),
        L(`(b) ${askB === 'stop' ? 'The charged edges make a field across the strip that pushes the moving charges back: as in a velocity selector, when does nothing change any more?' : askB === 'field' ? 'The field of the charged edges points from the + edge to the − edge, as between two plates.' : `With ${holes ? 'electrons' : 'positive carriers'}, the carriers move the other way and the other hand applies: to which edge are they pushed, and with which charge?`} (c) ΔV<sub>H</sub> = v·B·d, and in the same strip the drift speed v is proportional to the current: here B changes ${frac(fB)} and I ${frac(fI)}.`,
          `(b) ${askB === 'stop' ? 'Die geladenen Ränder erzeugen ein Feld quer zum Streifen, das die bewegten Ladungen zurückdrückt: Wann ändert sich, wie im Geschwindigkeitsfilter, nichts mehr?' : askB === 'field' ? 'Das Feld der geladenen Ränder zeigt vom +Rand zum −Rand, wie zwischen zwei Platten.' : `Mit ${holes ? 'Elektronen' : 'positiven Ladungsträgern'} bewegen sich die Ladungsträger in die andere Richtung, und es gilt die andere Hand: Zu welchem Rand werden sie gedrückt, und mit welcher Ladung?`} (c) U<sub>H</sub> = v·B·d, und im selben Streifen ist die Driftgeschwindigkeit v proportional zum Strom: Hier ändert sich B ${frac(fB)} und I ${frac(fI)}.`),
      ],
      solution: [how, askB === 'stop' ? howStop : askB === 'field' ? howField : howCarr, howU], solFig: fig(hallFig({ I, bz, edges: upperNeg ? -1 : 1 })), p: { I, bz, holes, askPos, fU, askB },
    };
  }

  // ---------------------------------------------------------------- statements
  const BANK = [
    [() => L('An electron accelerated through 1 V gains 1 eV.', 'Ein Elektron, das 1 V durchläuft, gewinnt 1 eV.'), true, () => L('That is the definition of the electronvolt.', 'Das ist die Definition des Elektronvolts.')],
    [() => L('An alpha particle accelerated through 1 kV gains 1 keV.', 'Ein Alphateilchen, das 1 kV durchläuft, gewinnt 1 keV.'), false, () => L('Its charge is 2e: it gains 2 keV.', 'Seine Ladung ist 2e: Es gewinnt 2 keV.')],
    [() => L('Through the same voltage, a proton and an electron gain the same kinetic energy.', 'Mit derselben Spannung gewinnen ein Proton und ein Elektron dieselbe kinetische Energie.'), true, () => L('E_kin = |q·ΔV|, and both have |q| = e.', 'E_kin = |q|·U, und beide haben |q| = e.')],
    [() => L('Through the same voltage, a proton and an electron reach the same speed.', 'Mit derselben Spannung erreichen ein Proton und ein Elektron dieselbe Geschwindigkeit.'), false, () => L('Same energy, much smaller mass: the electron is about 43 times faster.', 'Gleiche Energie, viel kleinere Masse: Das Elektron ist etwa 43-mal schneller.')],
    [() => L('Doubling the accelerating voltage doubles the speed.', 'Verdoppelt man die Beschleunigungsspannung, verdoppelt sich die Geschwindigkeit.'), false, () => L('It doubles the energy: v grows by √2.', 'Sie verdoppelt die Energie: v wächst um den Faktor √2.')],
    [() => L('The electronvolt is a unit of energy.', 'Das Elektronvolt ist eine Einheit der Energie.'), true, () => L('1 eV = 1.602 · 10<sup>−19</sup> J.', '1 eV = 1.602 · 10<sup>−19</sup> J.')],
    [() => L('A charge flying across a capacitor moves on a circle.', 'Eine Ladung, die quer durch einen Kondensator fliegt, bewegt sich auf einem Kreis.'), false, () => L('The force always points the same way: a parabola.', 'Die Kraft zeigt immer in dieselbe Richtung: eine Parabel.')],
    [() => L('Twice as fast, a charge flying across a capacitor is deflected a quarter as far.', 'Doppelt so schnell wird eine Ladung, die quer durch einen Kondensator fliegt, ein Viertel so weit abgelenkt.'), true, () => L('It spends half the time between the plates: y = ½·a·t².', 'Sie ist halb so lange zwischen den Platten: y = ½·a·t².')],
    [() => L('The electric field of a capacitor can change the speed of a charge.', 'Das elektrische Feld eines Kondensators kann den Betrag der Geschwindigkeit einer Ladung ändern.'), true, () => L('The electric force can do work.', 'Die elektrische Kraft kann Arbeit verrichten.')],
    [() => L('The magnetic force does no work on a moving charge.', 'Die magnetische Kraft verrichtet an einer bewegten Ladung keine Arbeit.'), true, () => L('It is always perpendicular to the velocity.', 'Sie steht immer senkrecht zur Geschwindigkeit.')],
    [() => L('In a magnetic field, the speed of a charge stays the same.', 'In einem Magnetfeld bleibt der Betrag der Geschwindigkeit einer Ladung gleich.'), true, () => L('The force changes only the direction of motion.', 'Die Kraft ändert nur die Bewegungsrichtung.')],
    [() => L('A magnetic field can speed up a charge at rest.', 'Ein Magnetfeld kann eine ruhende Ladung beschleunigen.'), false, () => L('There is no magnetic force on a charge at rest.', 'Auf eine ruhende Ladung wirkt keine magnetische Kraft.')],
    [() => L('The magnetic force increases the kinetic energy of a charge circling in a field.', 'Die magnetische Kraft erhöht die kinetische Energie einer Ladung, die in einem Feld kreist.'), false, () => L('It does no work: the speed stays the same.', 'Sie verrichtet keine Arbeit: Der Betrag der Geschwindigkeit bleibt gleich.')],
    [() => L('Twice as fast, a charge circles in the same field on a circle twice as large.', 'Doppelt so schnell kreist eine Ladung im selben Feld auf einem doppelt so grossen Kreis.'), true, () => L('r = m·v/(q·B).', 'r = m·v/(q·B).')],
    [() => L('Twice as fast, a charge needs twice the time for one turn.', 'Doppelt so schnell braucht eine Ladung die doppelte Zeit für einen Umlauf.'), false, () => L('T = 2π·m/(q·B) does not depend on the speed.', 'T = 2π·m/(q·B) hängt nicht von der Geschwindigkeit ab.')],
    [() => L('An electron and a proton at the same speed in the same field circle in opposite directions.', 'Ein Elektron und ein Proton mit derselben Geschwindigkeit kreisen im selben Feld in entgegengesetzte Richtungen.'), true, () => L('Their charges have opposite signs.', 'Ihre Ladungen haben entgegengesetzte Vorzeichen.')],
    [() => L('An electron and a proton at the same speed in the same field circle on equal circles.', 'Ein Elektron und ein Proton mit derselben Geschwindigkeit kreisen im selben Feld auf gleich grossen Kreisen.'), false, () => L('The electron is about 1800 times lighter: its circle is much smaller.', 'Das Elektron ist etwa 1800-mal leichter: Sein Kreis ist viel kleiner.')],
    [() => L('In a field twice as strong, a charge circles on a circle half as large.', 'In einem doppelt so starken Feld kreist eine Ladung auf einem halb so grossen Kreis.'), true, () => L('r = m·v/(q·B).', 'r = m·v/(q·B).')],
    [() => L('With the same charge and speed, a heavier particle moves on a larger circle.', 'Bei gleicher Ladung und Geschwindigkeit bewegt sich ein schwereres Teilchen auf einem grösseren Kreis.'), true, () => L('r = m·v/(q·B) grows with the mass.', 'r = m·v/(q·B) wächst mit der Masse.')],
    [() => L('In a cyclotron, the frequency must be raised as the protons get faster.', 'In einem Zyklotron muss die Frequenz erhöht werden, wenn die Protonen schneller werden.'), false, () => L('The period T = 2π·m/(q·B) does not depend on the speed (as long as the protons are much slower than light).', 'Die Umlaufzeit T = 2π·m/(q·B) hängt nicht von der Geschwindigkeit ab (solange die Protonen viel langsamer als das Licht sind).')],
    [() => L('A velocity selector lets through only particles of one particular mass.', 'Ein Geschwindigkeitsfilter lässt nur Teilchen einer bestimmten Masse durch.'), false, () => L('It lets through all particles with v = E/B, whatever their mass and charge.', 'Es lässt alle Teilchen mit v = E/B durch, unabhängig von Masse und Ladung.')],
    [() => L('In a velocity selector, a particle faster than E/B is deflected the way of the magnetic force.', 'Im Geschwindigkeitsfilter wird ein Teilchen, das schneller als E/B ist, in Richtung der magnetischen Kraft abgelenkt.'), true, () => L('Only the magnetic force q·v·B grows with the speed.', 'Nur die magnetische Kraft q·v·B wächst mit der Geschwindigkeit.')],
    [() => L('The Hall voltage arises because the magnetic force pushes the moving charges to one edge of the conductor.', 'Die Hall-Spannung entsteht, weil die magnetische Kraft die bewegten Ladungen an einen Rand des Leiters drückt.'), true, () => L('Until the electric field of the charged edges balances it.', 'Bis das elektrische Feld der geladenen Ränder ihr das Gleichgewicht hält.')],
    [() => L('Without a magnetic field, a current-carrying strip has a Hall voltage across it too.', 'Auch ohne Magnetfeld liegt quer über einem stromdurchflossenen Streifen eine Hall-Spannung.'), false, () => L('Without a magnetic force, nothing pushes the charges to an edge.', 'Ohne magnetische Kraft drückt nichts die Ladungen an einen Rand.')],
  ];
  // the hints: one for each topic among the statements picked, naming them by their place (from the top)
  const TOPICS = [[0, 5, ['accelerated through a voltage', 'Beschleunigung durch eine Spannung'], ['E_kin = |q·ΔV| depends only on the charge; the speed follows from ½·m·v² = E_kin.', 'E_kin = |q|·U hängt nur von der Ladung ab; die Geschwindigkeit folgt aus ½·m·v² = E_kin.']],
    [6, 8, ['a charge in a capacitor', 'eine Ladung im Kondensator'], ['the force q·E points the same way everywhere between the plates; the deflection is y = ½·a·t² with t = L/v.', 'die Kraft q·E zeigt zwischen den Platten überall in dieselbe Richtung; die Ablenkung ist y = ½·a·t² mit t = L/v.']],
    [9, 19, ['a charge in a magnetic field', 'eine Ladung im Magnetfeld'], ['the force is always perpendicular to the velocity; r = m·v/(q·B) and T = 2π·m/(q·B): which quantities are in each, and which are not?', 'die Kraft steht immer senkrecht zur Geschwindigkeit; r = m·v/(q·B) und T = 2π·m/(q·B): Welche Grössen kommen darin vor, welche nicht?']],
    [20, 23, ['crossed fields and the Hall effect', 'gekreuzte Felder und der Hall-Effekt'], ['a particle passes straight through when q·E = q·v·B; without a magnetic force, nothing pushes the charges sideways.', 'ein Teilchen fliegt gerade durch, wenn q·E = q·v·B; ohne magnetische Kraft drückt nichts die Ladungen zur Seite.']]];
  function stmtHints(pick) {
    const out = [];
    for (const [i0, i1, name, rule] of TOPICS) {
      const ks = pick.map((s, k) => [BANK.indexOf(s), k + 1]).filter(([i]) => i >= i0 && i <= i1).map(([, k]) => k);
      if (!ks.length) continue;
      const list = ks.length === 1 ? String(ks[0]) : `${ks.slice(0, -1).join(', ')}${L(' and ', ' und ')}${ks[ks.length - 1]}`;
      out.push(L(`${ks.length === 1 ? 'Statement' : 'Statements'} ${list} (from the top): ${name[0]}. ${cap(rule[0])}`, `${ks.length === 1 ? 'Aussage' : 'Aussagen'} ${list} (von oben): ${name[1]}. ${cap(rule[1])}`));
    }
    if (out.length < 2) out.push(L('Take the statements one by one: which quantity does each one change or compare, and does that quantity appear in the formula at all?', 'Nimm die Aussagen einzeln: Welche Grösse ändert oder vergleicht jede, und kommt diese Grösse in der Formel überhaupt vor?'));
    return out;
  }
  function statements(seed) {
    const r = rng(seed * 73 + 43);
    for (;;) {
      const pick = r.shuffle(BANK.slice()).slice(0, 5);
      if (pick.every((s) => s[1]) || pick.every((s) => !s[1])) continue;
      return {
        kind: 'stmts', title: L('Which statements are correct?', 'Welche Aussagen sind richtig?'),
        text: L('<p>Tick all the statements that are correct.</p>', '<p>Kreuze alle richtigen Aussagen an.</p>'), figs: '',
        questions: [{ type: 'multi', key: 's', label: L('Which statements are correct?', 'Welche Aussagen sind richtig?'), statements: pick.map(([h, ok, why]) => ({ html: h(), ok, why: why() })) }],
        hints: stmtHints(pick),
        solution: pick.map(([h, ok, why]) => `${ok ? '✓' : '✗'} ${h()} ${why()}`), p: { s: pick.map((s) => BANK.indexOf(s)) },
      };
    }
  }

  // ---------------------------------------------------------------- all types
  const TYPES = {
    accel: [2, accel], 'accel-compare': [3, accelCompare], stop: [2, stop], ev: [1, ev],
    'deflect-path': [2, deflectPath], 'deflect-compare': [4, deflectCompare],
    'path-circle': [2, pathCircle], speed: [2, speed],
    'radius-compare': [3, radiusCompare], tracks: [3, tracks],
    selector: [3, selector], 'crossed-dir': [3, crossedDir], hall: [3, hall], stmts: [2, statements],
  };
  function make(type, seed) {
    const [difficulty, f] = TYPES[type];
    return { ...f(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }

  const api = { TYPES: Object.keys(TYPES), make, dirName, RULE, PERP, sci, nice, inEV, inV };
  root.PartEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
