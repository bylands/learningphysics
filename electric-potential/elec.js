// Helpers of Electric Potential (taken over from Electric Field): random numbers, directions in
// the page and their names, numbers with units, the options of a question (with the reasons of
// the wrong ones), named particles, constants.
(function (root) {
  'use strict';

  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);

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
    return { next, int, pick: (arr) => arr[Math.floor(next() * arr.length)], shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; } };
  }

  // ---------------------------------------------------------------- directions in the page
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const NAMES = {
    '1,0': ['to the right', 'nach rechts'], '-1,0': ['to the left', 'nach links'], '0,1': ['upwards', 'nach oben'], '0,-1': ['downwards', 'nach unten'],
    '1,1': ['up and to the right', 'nach rechts oben'], '-1,1': ['up and to the left', 'nach links oben'], '-1,-1': ['down and to the left', 'nach links unten'], '1,-1': ['down and to the right', 'nach rechts unten'],
  };
  const dkey = (d) => (d ? `${Math.sign(Math.round(d[0] * 1e6))},${Math.sign(Math.round(d[1] * 1e6))}` : 'none');
  const dirName = (d, none) => (d ? L(...NAMES[dkey(d)]) : none || L('none', 'keine'));
  // the direction of a vector, if it is exactly one of the eight, else undefined; null for zero
  function dirOf(v) {
    const n = Math.hypot(v[0], v[1]);
    if (n < 1e-9) return null;
    const a = Math.atan2(v[1], v[0]), k = Math.round(a / (Math.PI / 4));
    if (Math.abs(a - k * (Math.PI / 4)) > 1e-9) return undefined;
    return DIRS[(k + 8) % 8];
  }
  const neg = (d) => d && [-d[0], -d[1]];

  // ---------------------------------------------------------------- numbers
  const nice = (x) => String(Number(x.toPrecision(3)));
  const sci = (x) => {
    if (x === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), m = x / 10 ** e;
    if (e >= -2 && e <= 3) return nice(x).replace('-', '−');
    return `${Number(m.toPrecision(3))} · 10<sup>${e < 0 ? '−' + -e : e}</sup>`.replace(/^-/, '−');
  };
  // a value in the best of a set of units [[factor, name], …] (largest first)
  const inUnits = (x, set) => { const [f, u] = set.find(([k]) => Math.abs(x) >= k * 0.999) || set[set.length - 1]; return `${nice(x / f).replace('-', '−')} ${u}`; };
  const UNITS = {
    len: [[1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm'], [1e-12, 'pm'], [1e-15, 'fm']],
    time: [[1, 's'], [1e-3, 'ms'], [1e-6, 'µs'], [1e-9, 'ns']],
    force: [[1, 'N'], [1e-3, 'mN'], [1e-6, 'µN'], [1e-9, 'nN'], [1e-12, 'pN'], [1e-15, 'fN']],
    charge: [[1, 'C'], [1e-3, 'mC'], [1e-6, 'µC'], [1e-9, 'nC'], [1e-12, 'pC']],
    field: [[1e6, 'MV/m'], [1e3, 'kV/m'], [1, 'V/m']],
    volt: [[1e6, 'MV'], [1e3, 'kV'], [1, 'V'], [1e-3, 'mV']],
    energy: [[1, 'J'], [1e-3, 'mJ'], [1e-6, 'µJ'], [1e-9, 'nJ']],
    speed: [[1, 'm/s']],
  };
  const show = (x, kind) => (kind === 'speed' ? `${sci(x)} m/s` : kind === 'sci' ? sci(x) : inUnits(x, UNITS[kind]));
  // the options of a value: the right one and the mistakes, apart by 15 %, sorted; the extra ones
  // (multiples of the right one) get how, the working, as their reason. signed: values may be
  // negative (compared by size and sign)
  function values(right, mistakes, kind, how, o = {}) {
    const out = [{ value: right, ok: true, why: '' }], extra = o.extra || [2, 0.5, 4, 0.25];
    const apart = (a, b) => (Math.sign(a) !== Math.sign(b) && a !== 0 && b !== 0) || (a === 0) !== (b === 0) || Math.abs(Math.log(Math.abs(a / b))) > Math.log(1.15);
    for (const m of [...mistakes, ...extra.map((k) => ({ value: right * k, tag: 'other', why: how }))]) {
      if (out.length === 4) break;
      if (Number.isFinite(m.value) && (o.signed || m.value > 0) && out.every((x) => apart(m.value, x.value))) out.push({ ...m, ok: false, why: m.why || how });
    }
    // signed answers: each size once positive and once negative, so that the sign gives nothing away
    if (o.signed && right !== 0) {
      const flip = (x) => ({ ...(mistakes.find((m) => Math.abs(m.value + x.value) < 1e-9 * Math.abs(x.value)) || { why: x.why || how, tag: 'sign', ...(x.nudge ? { nudge: x.nudge } : {}) }), value: -x.value, ok: false });
      const other = out.find((x) => !x.ok && Math.abs(Math.abs(x.value) - Math.abs(right)) > 0.15 * Math.abs(right))
        || { value: right * extra.find((k) => Math.abs(Math.abs(k) - 1) > 0.15), tag: 'other', why: how, ok: false };
      out.splice(0, out.length, out[0], flip({ ...out[0], why: '' }), other, flip(other));
    }
    const fmt = o.fmt || ((v) => show(v, kind));
    return out.sort((a, b) => a.value - b.value).map((x) => ({ ...x, label: fmt(x.value) }));
  }
  const choice = (key, label, options) => ({ type: 'choice', key, label, options });
  const tiles = (key, label, options, multi = false) => ({ type: 'tiles', key, label, multi, options });
  // word options: [label, right?, why]
  const words = (r, list) => r.shuffle(list.map(([label, ok, why]) => ({ label, ok, why: ok ? '' : why })));

  // ---------------------------------------------------------------- particles
  const e = 1.602176634e-19, u = 1.66053907e-27;
  const K = { k: 8.988e9, eps0: 8.854e-12, e, me: 9.109e-31, mp: 1.6726e-27, u, g: 9.81, c: 2.998e8 };
  // [id, [en, de] with the article, symbol, charge in e, mass in kg]
  const NAMED = {
    1: [['p', ['a proton', 'ein Proton'], 'p', 1, K.mp], ['e+', ['a positron', 'ein Positron'], 'e⁺', 1, K.me], ['a', ['an alpha particle', 'ein Alphateilchen'], 'α', 2, 6.6447e-27], ['na', ['a sodium ion (Na⁺)', 'ein Natrium-Ion (Na⁺)'], 'Na⁺', 1, 22.99 * u]],
    '-1': [['e', ['an electron', 'ein Elektron'], 'e⁻', -1, K.me], ['cl', ['a chloride ion (Cl⁻)', 'ein Chlorid-Ion (Cl⁻)'], 'Cl⁻', -1, 35.45 * u]],
    0: [['n', ['a neutron', 'ein Neutron'], 'n', 0, 1.6749e-27], ['he', ['a helium atom', 'ein Heliumatom'], 'He', 0, 4.0026 * u], ['h', ['a hydrogen atom', 'ein Wasserstoffatom'], 'H', 0, 1.008 * u], ['naa', ['a sodium atom (Na)', 'ein Natriumatom (Na)'], 'Na', 0, 22.99 * u]],
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

  const api = { L, cap, rng, DIRS, dkey, dirName, dirOf, neg, nice, sci, show, inUnits, UNITS, values, choice, tiles, words, K, NAMED, signName, particle, chargeOf };
  root.Elec = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
