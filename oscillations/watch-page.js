// A standalone page with the run of one worked example (its last frame in the tutor, "Watch it
// happen"): turning-pointer/ (example 1, the turning pointer) and fastest-strongest/ (example 4,
// a body on a spring with y, v and a). The page says which example in <body data-example="n">
// (1 … 5, as in the tutor); its name, idea and run come from lessons.js and generator.js, and the
// player from watch.js, so that the page and the tutor always show the same. On the page of the
// pointer (with <div id="phase">), a slider sets the initial phase φ₀ in steps of 15°, from the
// example's to any other. On both, a button switches slow motion on and off (also while it plays).
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

  // the initial phase: k·π/12 (k from −12 to 12), in degrees and as a multiple of π
  const STEPS = 12;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function phaseText(k) {
    if (k === 0) return '0';
    const g = gcd(Math.abs(k), STEPS), num = k / g, den = STEPS / g, sign = num < 0 ? '−' : '';
    return `${k * 15}°`.replace('-', '−') + ` = ${sign}${Math.abs(num) === 1 ? '' : Math.abs(num)}π${den === 1 ? '' : `/${den}`}`;
  }
  function showPhase() {
    const k = Number($('#phi').value);
    $('#phi-out').innerHTML = `<i>φ</i>₀ = ${phaseText(k)}`;
    $('#phi').setAttribute('aria-valuetext', phaseText(k));
  }
  // a new run with the pointer at k·π/12, at rest before it is set turning
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
    $('#idea').textContent = lesson.idea[OC.getLang()];
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
