// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh): the page
// language, English or German. It comes from ?lang=de in the address, else the last choice in any
// of the apps (they share their storage), else the browser's language. A teacher's set can fix the
// language (see sets.js): then the EN/DE switch is hidden and the choice is not remembered.
//   Lang.L(en, de)        the text in the current language
//   Lang.get(), set(l)    the language; set() remembers it
//   Lang.apply(dict)      fills in [data-i18n] (text), [data-i18n-html] and [data-i18n-label]
//                         (aria-label) from dict, and [data-i18n-common] from the texts all pages
//                         share (COMMON, e.g. the privacy link in the footer); sets <html lang>
//                         and the EN/DE switch
//   Lang.wire(onChange)   connects the EN/DE switch (#langs) to onChange(lang)
//   Lang.fix(l)           fixes the language to l ('en', 'de'), or with null frees it again; init()
//                         takes it from the set the app is opened in (LPSets.lang(), sets.js)
// It also notes when each app was last opened (tp-recent: { folder: time }, e.g. { coe: … }), for
// the hub's order "Recently used".
(function (root) {
  'use strict';

  const LANGS = ['en', 'de'], KEY = 'tp-lang';
  // texts of the footer, the same on every page
  const COMMON = { privacy: { en: 'Privacy', de: 'Datenschutz' } };
  let lang = 'en', fixed = null;

  const remembered = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  function initial() {
    const asked = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
    if (LANGS.includes(asked)) return asked;
    if (LANGS.includes(remembered())) return remembered();
    const nav = typeof navigator !== 'undefined' ? (navigator.language || 'en') : 'en';
    return nav.toLowerCase().startsWith('de') ? 'de' : 'en';
  }

  const Lang = {
    LANGS,
    get: () => lang,
    // quiet: do not remember the choice (e.g. in tests)
    set(l, quiet) {
      if (fixed) return;
      lang = LANGS.includes(l) ? l : 'en';
      if (!quiet) { try { localStorage.setItem(KEY, lang); } catch (e) { /* storage unavailable */ } }
    },
    L: (en, de) => (lang === 'de' ? de : en),
    init() {
      const f = root.LPSets && typeof root.LPSets.lang === 'function' ? root.LPSets.lang() : null;
      return Lang.fix(f);
    },
    fix(l) {
      fixed = LANGS.includes(l) ? l : null;
      lang = fixed || initial();
      const sw = typeof document !== 'undefined' ? document.querySelector('#langs') : null;
      if (sw) sw.style.display = fixed ? 'none' : '';
      return lang;
    },
    fixed: () => fixed,
    apply(dict) {
      const text = (v) => (typeof v === 'function' ? v() : v);
      document.documentElement.lang = lang;
      document.querySelectorAll('[data-i18n]').forEach((el) => { if (dict[el.dataset.i18n] != null) el.textContent = text(dict[el.dataset.i18n]); });
      document.querySelectorAll('[data-i18n-html]').forEach((el) => { if (dict[el.dataset.i18nHtml] != null) el.innerHTML = text(dict[el.dataset.i18nHtml]); });
      document.querySelectorAll('[data-i18n-label]').forEach((el) => { if (dict[el.dataset.i18nLabel] != null) el.setAttribute('aria-label', text(dict[el.dataset.i18nLabel])); });
      document.querySelectorAll('[data-i18n-common]').forEach((el) => { const c = COMMON[el.dataset.i18nCommon]; if (c) el.textContent = c[lang]; });
      const r = document.querySelector(`input[name="lang"][value="${lang}"]`);
      if (r) r.checked = true;
    },
    wire(onChange) {
      const el = document.querySelector('#langs');
      if (el) el.addEventListener('change', (evt) => { Lang.set(evt.target.value); onChange(lang); });
    },
  };

  // the app is the first folder of the address (/coe/ → coe); the hub (at /, or /hub/ when tried
  // out locally), the privacy page and the admin panel are no app
  // (not when the admin panel reads an app's outline: ?outline=1, see sets.js)
  if (typeof location !== 'undefined' && !/[?&]outline=1/.test(location.search)) {
    const app = (location.pathname.match(/^\/([a-z0-9-]+)\//) || [])[1];
    if (app && !['privacy', 'admin', 'hub'].includes(app)) {
      try {
        const recent = JSON.parse(localStorage.getItem('tp-recent')) || {};
        recent[app] = Date.now();
        localStorage.setItem('tp-recent', JSON.stringify(recent));
      } catch (e) { /* storage unavailable */ }
    }
  }

  root.Lang = Lang;
  if (typeof module !== 'undefined') module.exports = Lang;
})(typeof window !== 'undefined' ? window : globalThis);
