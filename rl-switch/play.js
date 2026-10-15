// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh into the apps
// whose index.html loads it: Bulb Brightness, Switching RL Circuits, Capacitors and RC Circuits,
// Oscillations, Interference and Diffraction; its look is in play.css).
// "Predict, then watch": a scene that changes when a switch in the figure is flipped (a switch
// closed or opened, a bulb unscrewed), played as an animation with ▶/❚❚ and a time slider, built
// on the players of Energy Conservation and Wave Propagation. The student first answers (the
// prediction); the app keeps the switch locked until the answer is checked and solved, or the
// solution shown, so that watching never gives the answer away; then the student flips the switch
// and watches what really happens, compared with the prediction (the app marks it).
// Scene time t runs from t0 < 0 (before switching, the state the student predicts from) through 0
// (the moment of switching) to t1 (the end state, long after). The app draws the scene; the player
// only keeps the time and the controls:
//   const p = Play.create(host, o)   fills the element host with the scene, ▶/❚❚, the slider and a
//                     note line. o:
//     t0, t1          the scene times (t0 < 0 < t1)
//     seconds         how long a run from 0 to t1 takes (default 2.5); the time before switching
//                     goes at the same rate
//     render(scene, s)  draws the scene into the element scene (on every frame: keep it cheap, e.g.
//                     redraw the figure only when s.after changes and update a few attributes
//                     otherwise); s = { t, after (t ≥ 0, the switch flipped), u (0 … 1: t / t1
//                     after switching, 0 before), end (t ≥ t1) }. The switch the student flips is
//                     any element with the attribute data-pw-switch (an svg <g> with a hit area of
//                     class pw-hit, larger than the drawing, for fingers): the player makes it a
//                     button (Space, Enter), says whether it is locked, and keeps its focus when
//                     the scene is redrawn
//     locked()        true while the student has not committed a prediction (default false)
//     texts()         { locked: why the switch is locked, ready: what to do (e.g. "Click the
//                     switch S to close it."), switch: the switch's label for screen readers, again
//                     (after switching: e.g. "Click the switch again to watch once more."), time:
//                     a function t → the time shown next to the slider (optional) }, in the
//                     current language (the app's L(en, de))
//     instant         true: no animation and no ▶/slider; the switch toggles at once between
//                     before and the end state (Bulb Brightness)
//     onEnd()         the run reached t1 (by playing, the slider or with reduced motion): e.g. mark
//                     the predictions
//   Returns { refresh() (redraw, after a change of language or of the lock), stop() (no more
//     frames), flip(), seek(t), state() }.
// The switch flips the scene: from before, the run plays from 0 to t1; from after, the scene goes
// back to before (to watch again). ▶ plays on from where the slider is (from t0 again at the end).
// With prefers-reduced-motion, nothing moves by itself: the switch and ▶ jump to the end state, and
// the slider (arrow keys) steps through the time. Works with mouse, touch and keyboard.
// Play.logic holds the pure parts (tested in shared/test/check-play.js).
(function (root) {
  'use strict';

  const STEPS = 1000; // the slider's range

  // ---------------------------------------------------------------- pure logic
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  // the slider's value for the time t, and back
  const toSlider = (t, o) => Math.round((STEPS * (clamp(t, o.t0, o.t1) - o.t0)) / (o.t1 - o.t0));
  const fromSlider = (v, o) => o.t0 + (clamp(Number(v), 0, STEPS) / STEPS) * (o.t1 - o.t0);
  // what the scene shows at t
  const view = (t, o) => ({ t, after: t >= 0, u: t <= 0 ? 0 : clamp(t / o.t1, 0, 1), end: t >= o.t1 });
  // scene time per real second
  const rate = (o) => o.t1 / (o.seconds || 2.5);
  // dt real seconds of playing: the new state { t, playing }; it stops at t1
  function advance(s, dt, o) {
    if (!s.playing) return s;
    const t = Math.min(o.t1, s.t + Math.max(0, dt) * rate(o));
    return { t, playing: t < o.t1 };
  }
  // the switch pressed: from before, the run (or, with reduced motion, the end state); from after,
  // back to before. Locked: nothing changes.
  function flip(s, o, reduced, locked) {
    if (locked) return s;
    if (s.t < 0) return reduced ? { t: o.t1, playing: false } : { t: 0, playing: true };
    return { t: o.t0, playing: false };
  }
  // ▶/❚❚ pressed: pause; play on (from t0 again at the end). With reduced motion: to the end
  // state, or from the end back to before.
  function press(s, o, reduced, locked) {
    if (locked) return s;
    if (s.playing) return { t: s.t, playing: false };
    if (reduced) return { t: s.t >= o.t1 ? o.t0 : o.t1, playing: false };
    return { t: s.t >= o.t1 ? o.t0 : s.t, playing: true };
  }
  // the slider moved: that time, paused
  const seek = (s, v, o, locked) => (locked ? s : { t: fromSlider(v, o), playing: false });
  // keys that press a button
  const activates = (key) => key === ' ' || key === 'Enter' || key === 'Spacebar';
  const isReduced = (mm) => !!(mm && mm('(prefers-reduced-motion: reduce)').matches);

  const logic = { STEPS, clamp, toSlider, fromSlider, view, rate, advance, flip, press, seek, activates, isReduced };

  // ---------------------------------------------------------------- the player
  const TX = {
    en: { play: 'Play', pause: 'Pause', time: 'Time', locked: 'Check your answer first: the switch unlocks once you have solved the exercise or looked at the solution.' },
    de: { play: 'Abspielen', pause: 'Anhalten', time: 'Zeit', locked: 'Prüfe zuerst deine Antwort: Der Schalter wird freigegeben, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.' },
  };
  const tx = () => TX[root.Lang && root.Lang.get() === 'de' ? 'de' : 'en'];

  function create(host, o) {
    const reduced = () => !!o.instant || isReduced(root.matchMedia && root.matchMedia.bind(root));
    const locked = () => !!(o.locked && o.locked());
    const texts = () => ({ ...(o.texts ? o.texts() : {}) });
    host.innerHTML = '<div class="pw"><div class="pw-scene"></div><div class="pw-bar">' +
      '<button type="button" class="pw-play">▶</button>' +
      `<input type="range" class="pw-seek" min="0" max="${STEPS}" step="10" value="0">` +
      '<span class="pw-time" aria-hidden="true"></span></div><p class="pw-note" aria-live="polite"></p></div>';
    const box = host.querySelector('.pw');
    box.classList.toggle('pw-instant', !!o.instant);
    const scene = box.querySelector('.pw-scene'), btn = box.querySelector('.pw-play');
    const slider = box.querySelector('.pw-seek'), time = box.querySelector('.pw-time'), note = box.querySelector('.pw-note');
    let s = { t: o.t0, playing: false }, raf = 0, last = null, ended = false, warned = false, stopped = false;

    function decorate() {
      const t = texts(), lock = locked();
      scene.querySelectorAll('[data-pw-switch]').forEach((el) => {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', t.switch || '');
        el.setAttribute('aria-disabled', lock ? 'true' : 'false');
      });
      box.classList.toggle('pw-locked', lock);
      box.classList.toggle('pw-ready', !lock && s.t < 0);
      btn.disabled = lock;
      slider.disabled = lock;
      btn.textContent = s.playing ? '❚❚' : '▶';
      btn.setAttribute('aria-label', s.playing ? tx().pause : tx().play);
      slider.setAttribute('aria-label', tx().time);
      note.textContent = lock ? (warned ? t.locked || tx().locked : '') : s.t < 0 ? t.ready || '' : t.again || '';
    }
    function draw() {
      const had = document.activeElement && scene.contains(document.activeElement) && document.activeElement.hasAttribute('data-pw-switch');
      const v = view(s.t, o);
      o.render(scene, v);
      slider.value = String(toSlider(s.t, o));
      const t = texts();
      time.textContent = t.time ? t.time(s.t) : '';
      slider.setAttribute('aria-valuetext', time.textContent || String(Math.round(100 * v.u)) + ' %');
      decorate();
      if (had) { const sw = scene.querySelector('[data-pw-switch]'); if (sw && document.activeElement !== sw) sw.focus({ preventScroll: true }); }
      if (v.end && !ended) { ended = true; if (o.onEnd) o.onEnd(); }
      if (!v.end) ended = false;
    }
    function frame(now) {
      raf = 0;
      if (stopped || !host.isConnected) return;
      if (!s.playing) return;
      if (last != null) s = advance(s, (now - last) / 1000, o);
      last = now;
      draw();
      if (s.playing) raf = requestAnimationFrame(frame);
    }
    function set(next) {
      s = next;
      last = null;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      draw();
      if (s.playing && !stopped) raf = requestAnimationFrame(frame);
    }
    const doFlip = () => {
      if (locked()) { warned = true; decorate(); return; }
      set(flip(s, o, reduced(), false));
    };

    scene.addEventListener('click', (evt) => { if (evt.target.closest && evt.target.closest('[data-pw-switch]')) doFlip(); });
    scene.addEventListener('keydown', (evt) => {
      if (!evt.target.closest || !evt.target.closest('[data-pw-switch]') || !activates(evt.key)) return;
      evt.preventDefault();
      doFlip();
    });
    btn.addEventListener('click', () => set(press(s, o, reduced(), locked())));
    slider.addEventListener('input', () => set(seek(s, slider.value, o, locked())));
    draw();

    return {
      refresh: () => { if (!locked()) warned = false; draw(); },
      stop: () => { stopped = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
      flip: doFlip,
      seek: (t) => set({ t: clamp(t, o.t0, o.t1), playing: false }),
      state: () => ({ ...s, ...view(s.t, o) }),
    };
  }

  const api = { create, logic };
  root.Play = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
