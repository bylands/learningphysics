// Helpers of the app: language (from lang.js, shared by the apps), symbols, number formatting and
// random numbers.
(function (root) {
  'use strict';

  const Lang = root.Lang || require('./lang.js');
  // quiet: the app remembers the choice itself, through Lang.set
  const setLang = (l) => Lang.set(l, true);
  const getLang = () => Lang.get();
  const L = (en, de) => Lang.L(en, de);

  const G = 10; // m/s², as on the worksheets

  // Symbols [letter, subscript]: the same in both languages, except the weight (F_g / F_G); an
  // index is appended to the subscript.
  const SYM = {
    F: { en: ['F', ''], de: ['F', ''] },
    G: { en: ['F', 'g'], de: ['F', 'G'] },
    x: { en: ['x', ''], de: ['x', ''] },
    y: { en: ['y', ''], de: ['y', ''] },
    xS: { en: ['x', 'G'], de: ['x', 'S'] },
    yS: { en: ['y', 'G'], de: ['y', 'S'] },
    tanTheta: { en: ['tan θ', ''], de: ['tan θ', ''] },
  };
  const TEX_LETTER = { 'tan θ': '\\tan\\theta' };
  const parts = (key, i = '') => { const [l, s] = SYM[key][getLang()]; return [l, `${s}${i}`]; };

  // KaTeX: M_1, F_\mathrm{G}, x_\mathrm{S}
  function tex(key, i = '') {
    const [l, s] = parts(key, i);
    const letter = TEX_LETTER[l] || l;
    if (!s) return letter;
    return `${letter}_{${s.replace(/[A-Za-z]+/g, (x) => `\\mathrm{${x}}`)}}`;
  }
  // SVG: italic letter with an upright subscript (a number subscript italic, as in KaTeX).
  function svgSym(key, i = '') {
    const [l, s] = parts(key, i);
    const it = `<tspan font-style="italic">${l}</tspan>`;
    if (!s) return it;
    return `${it}<tspan class="sub" dy="4">${s}</tspan><tspan dy="-4">​</tspan>`;
  }
  const plainSym = (key, i = '') => parts(key, i).join('');

  // ---------------------------------------------------------------- numbers
  // Results to at most dec decimal places; the decimal point in both languages.
  const round = (x, dec = 2) => (Number.isFinite(x) ? Number(x.toFixed(dec)) + 0 : 0);
  const num = (x, dec = 2) => String(round(x, dec));
  const UNITS = { N: 'N', kg: 'kg', g: 'g', cm: 'cm', m: 'm', Nm: 'N·m', deg: '°', '': '' };
  const TEX_UNITS = { N: '\\mathrm{N}', kg: '\\mathrm{kg}', g: '\\mathrm{g}', cm: '\\mathrm{cm}', m: '\\mathrm{m}', Nm: '\\mathrm{N\\,m}', deg: '^\\circ', '': '' };
  const q = (x, u, dec) => (u === 'deg' ? `${num(x, dec)}°` : u ? `${num(x, dec)} ${UNITS[u]}` : num(x, dec));
  const tq = (x, u, dec) => (u === 'deg' ? `${num(x, dec)}^\\circ` : u ? `${num(x, dec)}\\,${TEX_UNITS[u]}` : num(x, dec));

  // ---------------------------------------------------------------- random numbers
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, list) => list[Math.floor(r() * list.length)];
  const shuffle = (r, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rad = (deg) => (deg * Math.PI) / 180;

  root.TQ = { setLang, getLang, L, G, tex, svgSym, plainSym, round, num, q, tq, UNITS, rng, pick, shuffle, rad };
  if (typeof module !== 'undefined') module.exports = root.TQ;
})(typeof window !== 'undefined' ? window : globalThis);
