// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Tutor mode: worked examples of increasing difficulty, explained step by step. The app gives
// the examples as { name, idea, frames() }, where frames() returns [{ text, figure }] (HTML);
// every frame marks in its figure what the text talks about. A frame's figure may be a getter,
// so that refresh() can redraw it (e.g. after switching between linear and log-log axes).
// The button texts follow the page language (see lang.js; helpers.t may give others); relabel(examples)
// swaps in the same examples in another language and stays on the current frame.
// An example may say what its practice covers (also: HTML, shown under its idea); with
// helpers.practise(i), the last frame of each example has a button to practise example i's topic
// (on the last example, the final button does that). Moving on from there with the arrow key → leads
// to that practice, not to the next example: "Next example →" stays as a plain button beside it.
// In a set of the teacher's (sets.js), only the set's examples are shown (keeping their numbers):
// those of its learning objectives (or, in a set saved before, those it lists); without practice in
// the set, there is no button to practise and the last example ends there.
(function (root) {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const TEXTS = {
    en: { example: (i, n) => `Example ${i} of ${n}`, back: '← Back', prevEx: '← Previous example', next: 'Next →', nextEx: 'Next example →', done: 'Practise on your own →', practise: 'Practise this →' },
    de: { example: (i, n) => `Beispiel ${i} von ${n}`, back: '← Zurück', prevEx: '← Vorheriges Beispiel', next: 'Weiter →', nextEx: 'Nächstes Beispiel →', done: 'Selbst üben →', practise: 'Dies üben →' },
  };

  // helpers.after() runs once a frame is shown, helpers.done() once the last example is finished.
  function createTutor(examples, helpers) {
    let ex = 0, frame = 0;
    let cache = [];
    const S = root.LPSets;
    if (S) S.register('tutor', { names: () => examples.map((e) => e.name) });
    // the examples shown, in order, and whether the tutor leads on to practice
    let only = null;
    const limit = () => {
      only = S && S.tutor() ? S.tutor().filter((i) => i >= 0 && i < examples.length).sort((a, b) => a - b) : null;
      if (only && !only.length) only = null;
    };
    limit();
    const list = () => only || examples.map((_, i) => i);
    const lastEx = () => list()[list().length - 1];
    const toPractice = !S || S.mode('practice');
    const lang = () => TEXTS[root.Lang ? root.Lang.get() : 'en'];
    const t = () => ({ ...lang(), ...(helpers.t ? helpers.t() : {}) });
    // the line on what the practice covers, under the idea, and the button to practise
    if (!$('#t-also')) $('#t-idea').insertAdjacentHTML('afterend', '<p id="t-also" class="note also" hidden></p>');
    if (helpers.practise && !$('#t-practise')) $('#t-next').insertAdjacentHTML('beforebegin', '<button type="button" id="t-practise" class="new-btn" hidden></button>');
    const load = (i) => (cache[i] = cache[i] || examples[i].frames());

    function show() {
      const frames = load(ex), f = frames[frame], last = frame === frames.length - 1;
      $('#t-title').textContent = `${t().example(ex + 1, examples.length)}: ${examples[ex].name}`;
      $('#t-idea').innerHTML = examples[ex].idea;
      $('#t-also').innerHTML = examples[ex].also || '';
      $('#t-also').hidden = !examples[ex].also;
      if ($('#t-practise')) {
        // at the very end it takes the place of "Next", so that it looks like every other button to practise
        $('#t-practise').hidden = !last || !toPractice;
        $('#t-practise').textContent = ex === lastEx() ? t().done : t().practise;
      }
      $('#t-figure').innerHTML = f.figure;
      $('#t-text').innerHTML = f.text;
      $('#t-count').textContent = `${frame + 1} / ${frames.length}`;
      $('#t-prev').disabled = frame === 0 && ex === list()[0];
      $('#t-prev').textContent = frame === 0 && ex !== list()[0] ? t().prevEx : t().back;
      $('#t-next').textContent = !last ? t().next : ex !== lastEx() ? t().nextEx : toPractice ? t().done : t().next;
      $('#t-next').disabled = last && ex === lastEx() && !toPractice;
      // where → leads to practice, the button to practise is the main one
      $('#t-next').classList.toggle('primary', !(last && toPractice && helpers.practise));
      $('#t-next').hidden = !!$('#t-practise') && last && ex === lastEx() && toPractice;
      $('#t-bar').style.width = `${(100 * (frame + 1)) / frames.length}%`;
      document.querySelectorAll('input[name="example"]').forEach((r) => { r.checked = Number(r.value) === ex; });
      if (helpers.after) helpers.after();
      const hash = `#tutor-${ex + 1}`;
      if (location.hash !== hash) history.replaceState(null, '', hash);
    }

    function open(i, atEnd) {
      if (!list().includes(i)) i = list().find((k) => k > i) ?? list()[0]; // one not in the set: the next that is
      ex = i;
      frame = atEnd ? load(i).length - 1 : 0;
      show();
    }
    // at the end of an example, → leads to its practice (if there is one), the button to the next example
    function next(toNext) {
      if (frame < load(ex).length - 1) { frame++; show(); }
      else if (toPractice && helpers.practise && !toNext) helpers.practise(ex);
      else if (ex !== lastEx()) open(list()[list().indexOf(ex) + 1]);
      else if (!toPractice) return;
      else if (helpers.practise) helpers.practise(ex);
      else helpers.done();
    }
    function prev() {
      if (frame > 0) { frame--; show(); }
      else if (ex !== list()[0]) open(list()[list().indexOf(ex) - 1], true);
    }

    const buttons = () => {
      $('#examples').innerHTML = list().map((i) => `
        <label><input type="radio" name="example" value="${i}"${i === ex ? ' checked' : ''}><span>${i + 1} · ${examples[i].name}</span></label>`).join('');
    };
    buttons();
    // the set's objectives, once the check has said which examples are theirs
    if (S) S.on(() => { limit(); if (!list().includes(ex)) ex = list()[0]; buttons(); });
    $('#examples').addEventListener('change', (evt) => open(Number(evt.target.value)));
    $('#t-next').addEventListener('click', () => next(true));
    if ($('#t-practise')) $('#t-practise').addEventListener('click', () => helpers.practise(ex));
    $('#t-prev').addEventListener('click', prev);
    document.addEventListener('keydown', (evt) => {
      const el = evt.target;
      if ($('#tutor').hidden || evt.altKey || evt.ctrlKey || evt.metaKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.type !== 'radio') return;
      if (el.closest && el.closest('svg[tabindex], svg.arrows, svg.sketch')) return; // a graph or a drawing (arrow.js, sketch.js) that uses the arrow keys itself
      if (evt.key === 'ArrowRight') next(false);
      else if (evt.key === 'ArrowLeft') prev();
      else return;
      evt.preventDefault();
    });

    function relabel(list) {
      examples = list;
      cache = [];
      buttons();
      if ($('#t-title').textContent) show();
    }

    return { open, refresh: show, relabel, count: examples.length, current: () => ex, shown: () => !!$('#t-title').textContent };
  }

  root.createTutor = createTutor;
})(window);
