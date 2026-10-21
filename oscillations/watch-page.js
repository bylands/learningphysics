// A standalone page with the run of one worked example (its last frame in the tutor, "Watch it
// happen"): turning-pointer/ (example 1, the turning pointer) and fastest-strongest/ (example 4,
// a body on a spring with y, v and a). The page says which example in <body data-example="n">
// (1 … 5, as in the tutor); its name, idea and run come from lessons.js and generator.js, and the
// player from watch.js, so that the page and the tutor always show the same. On the page of the
// pointer (with <div id="phase">), a slider sets the initial phase φ₀ (y = A·cos(ωt − φ₀)) in steps
// of 15°, from the example's to any other. On both, a button switches slow motion on and off (also while it plays).
(function () {
  'use strict';

  const OC = window.OC, Lang = window.Lang, { tutorial, WATCH_TEXT } = window.Osc;
  const $ = (sel) => document.querySelector(sel);
  const n = Number(document.body.dataset.example), lesson = window.Lessons.EXAMPLES[n - 1];
  let w = tutorial(lesson).watch();

  const UI = {
    en: { app: 'Oscillations', tutor: 'The worked example in the tutor →', phase: 'Initial phase', slow: 'Slow motion' },
    de: { app: 'Schwingungen', tutor: 'Das Beispiel im Tutor →', phase: 'Anfangsphase', slow: 'Zeitlupe' },
  };
  const ui = () => UI[OC.getLang()];

  // KaTeX in an element ($…$), and a formula as KaTeX
  function math(el) {
    if (window.renderMathInElement) window.renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }
  const tex = (s) => (window.katex ? window.katex.renderToString(s, { throwOnError: false }) : s);

  // the initial phase φ₀ = k·π/12 (k from −12 to 12; y = A·cos(ωt − φ₀)), in degrees and as a
  // multiple of π: as TeX, and as text for screen readers
  const STEPS = 12;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function phaseOf(k) {
    if (k === 0) return { tex: '\\varphi_0 = 0', text: '0' };
    const g = gcd(Math.abs(k), STEPS), num = Math.abs(k / g), den = STEPS / g, sign = k < 0 ? '-' : '';
    const n = num === 1 ? '' : num;
    return { tex: `\\varphi_0 = ${sign}${Math.abs(k) * 15}^\\circ = ${sign}${den === 1 ? `${n}\\pi` : `\\tfrac{${n}\\pi}{${den}}`}`,
      text: `${sign ? '−' : ''}${Math.abs(k) * 15}° = ${sign ? '−' : ''}${n}π${den === 1 ? '' : `/${den}`}` };
  }
  function showPhase() {
    const ph = phaseOf(Number($('#phi').value));
    $('#phi-out').innerHTML = tex(ph.tex);
    $('#phi').setAttribute('aria-valuetext', ph.text);
  }
  // a new run with the pointer short of the top by k·π/12, at rest before it is set turning
  function setPhase() {
    showPhase();
    const run = { ...w };
    delete run.marks; // oscWatch makes them anew (none here)
    w = window.Scenarios.oscWatch({ ...run, phi: (Number($('#phi').value) * Math.PI) / STEPS });
    player.stop();
    player = mount();
  }

  let player = null;
  const slow = () => $('#slow').getAttribute('aria-pressed') === 'true';
  const mount = () => window.OscWatch.mount($('#watch'), w, { slow });
  function show() {
    const name = lesson.name[OC.getLang()];
    document.title = `${name} · ${ui().app}`;
    Lang.apply(ui());
    $('#name').textContent = name;
    $('#idea').innerHTML = lesson.idea[OC.getLang()];
    math($('#idea'));
    $('#what').textContent = WATCH_TEXT[w.kind]();
    if (player) player.refresh();
    else player = mount();
  }

  function init() {
    Lang.init(); // see lang.js
    $('#to-tutor').href = `../#tutor-${n}`;
    if ($('#phase')) {
      $('#phase').innerHTML = `<label for="phi" data-i18n="phase">${ui().phase}</label>` +
        `<input type="range" id="phi" min="${-STEPS}" max="${STEPS}" step="1" value="${Math.round((w.phi * STEPS) / Math.PI)}"><output id="phi-out" for="phi"></output>`;
      showPhase();
      $('#phi').addEventListener('input', setPhase);
    }
    $('#slow').addEventListener('click', () => {
      $('#slow').setAttribute('aria-pressed', String(!slow()));
      player.refresh(); // the note on the time scale
    });
    show();
    Lang.wire(show);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
