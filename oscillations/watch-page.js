// A standalone page with the run of one worked example (its last frame in the tutor, "Watch it
// happen"): turning-pointer/ (example 1, the turning pointer) and fastest-strongest/ (example 4,
// a body on a spring with y, v and a). The page says which example in <body data-example="n">
// (1 … 5, as in the tutor); its name, idea and run come from lessons.js and generator.js, and the
// player from watch.js, so that the page and the tutor always show the same.
(function () {
  'use strict';

  const OC = window.OC, Lang = window.Lang, { tutorial, WATCH_TEXT } = window.Osc;
  const $ = (sel) => document.querySelector(sel);
  const n = Number(document.body.dataset.example), lesson = window.Lessons.EXAMPLES[n - 1];
  const w = tutorial(lesson).watch();

  const UI = {
    en: { app: 'Oscillations', tutor: 'The worked example in the tutor →' },
    de: { app: 'Schwingungen', tutor: 'Das Beispiel im Tutor →' },
  };
  const ui = () => UI[OC.getLang()];

  let player = null;
  function show() {
    const name = lesson.name[OC.getLang()];
    document.title = `${name} · ${ui().app}`;
    Lang.apply(ui());
    $('#name').textContent = name;
    $('#idea').textContent = lesson.idea[OC.getLang()];
    $('#what').textContent = WATCH_TEXT[w.kind]();
    if (player) player.refresh();
    else player = window.OscWatch.mount($('#watch'), w);
  }

  function init() {
    Lang.init(); // see lang.js
    $('#to-tutor').href = `../#tutor-${n}`;
    show();
    Lang.wire(show);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
