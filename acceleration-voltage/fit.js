// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Labels of shrunken pictures. A picture (an <svg> with a viewBox) drawn narrower than its size in
// user units, as on a phone, shrinks its text too; fit.js enlarges every label so that it is at
// least MIN px tall on screen (but at most MAX times its size), and leaves the drawing as it is.
// Parts of a label with their own size (subscripts, …) keep their proportion to it.
// Labels that then reach beyond the edge widen the picture's viewBox, so that nothing is cut off.
// It runs by itself for every picture on the page: when it is drawn, redrawn or resized.
//   Fit.svg(svg)       fits one picture now
//   Fit.after.push(f)  f(svg) runs after a picture's labels changed size (e.g. to lay out boxes
//                      around them again)
(function (root) {
  'use strict';

  const MIN = 11; // px on screen
  const MAX = 2.2;
  const after = [];

  // The size of an element as drawn, in user units, read once (before any change) and kept.
  function base(el) {
    if (!el.dataset.fs) {
      el.dataset.fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      el.dataset.fs0 = el.style.fontSize; // a size the app set on the element itself
    }
    return Number(el.dataset.fs);
  }

  // The viewBox as drawn, read once and kept: [x, y, w, h].
  function drawn(svg) {
    if (!svg.dataset.vb) {
      const vb = svg.viewBox && svg.viewBox.baseVal;
      if (!vb || !vb.width) return null;
      svg.dataset.vb = [vb.x, vb.y, vb.width, vb.height].join(' ');
    }
    return svg.dataset.vb.split(' ').map(Number);
  }

  // Sets the labels' sizes for a picture shown at scale k (screen px per user unit).
  function size(svg, k) {
    let changed = false;
    const set = (el, px) => {
      const v = px ? `${px.toFixed(1)}px` : el.dataset.fs0 || '';
      if (el.style.fontSize !== v) { el.style.fontSize = v; changed = true; }
    };
    for (const t of svg.querySelectorAll('text')) {
      const fs = base(t), spans = [...t.querySelectorAll('tspan')].map((sp) => [sp, base(sp)]);
      if (!fs) continue;
      const s = Math.min(MAX, Math.max(1, MIN / (fs * k)));
      const grow = s > 1.001;
      set(t, grow ? fs * s : 0);
      // a part with its own size grows by the same factor; one that inherits follows by itself
      for (const [sp, f] of spans) set(sp, grow && Math.abs(f - fs) > 0.01 ? f * s : 0);
    }
    return changed;
  }

  // The drawing's box widened to every enlarged label, with a small margin: "x y w h".
  function boxWith(svg, vb0) {
    let [x0, y0] = vb0, x1 = vb0[0] + vb0[2], y1 = vb0[1] + vb0[3];
    const m = 2;
    for (const t of svg.querySelectorAll('text')) {
      if (!t.style.fontSize || t.style.fontSize === t.dataset.fs0) continue; // not enlarged
      if (!t.getClientRects().length) continue; // hidden (e.g. a tick label left out on a small graph)
      const b = t.getBBox();
      x0 = Math.min(x0, b.x - m); y0 = Math.min(y0, b.y - m);
      x1 = Math.max(x1, b.x + b.width + m); y1 = Math.max(y1, b.y + b.height + m);
    }
    return [x0, y0, x1 - x0, y1 - y0].map((v) => Math.round(v * 10) / 10);
  }

  function fit(svg) {
    const vb0 = drawn(svg);
    if (!vb0) return;
    const width = svg.getBoundingClientRect().width;
    if (!width) return; // hidden
    let changed = false;
    // twice at most: a wider box shows the picture a little smaller, so its labels grow a little
    for (let pass = 0; pass < 2; pass++) {
      const now = svg.viewBox.baseVal;
      if (size(svg, width / now.width)) { changed = true; after.forEach((f) => f(svg)); }
      const box = boxWith(svg, vb0);
      if (box.join(' ') === [now.x, now.y, now.width, now.height].map((v) => Math.round(v * 10) / 10).join(' ')) break;
      svg.setAttribute('viewBox', box.join(' '));
      changed = true;
    }
    if (changed) after.forEach((f) => f(svg));
  }

  // the outermost <svg> around a node
  const outer = (node) => {
    let svg = node.closest && node.closest('svg');
    while (svg && svg.parentElement && svg.parentElement.closest('svg')) svg = svg.parentElement.closest('svg');
    return svg;
  };

  function start() {
    if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return;
    const watched = new WeakSet();
    const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target)));
    const watch = (svg) => { if (watched.has(svg)) fit(svg); else { watched.add(svg); ro.observe(svg); } };
    document.querySelectorAll('svg').forEach((svg) => { if (outer(svg) === svg) watch(svg); });
    new MutationObserver((records) => {
      const todo = new Set();
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          const svg = outer(n);
          if (svg) todo.add(svg); // drawn into a picture
          else n.querySelectorAll('svg').forEach((s) => { if (outer(s) === s) todo.add(s); });
        }
      }
      todo.forEach(watch);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
  root.Fit = { svg: fit, after, MIN, MAX };
})(typeof window !== 'undefined' ? window : globalThis);
