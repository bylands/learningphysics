// The graph the student draws, in an <svg> element: the shared sketcher (sketch.js), its pieces.
// The drawn graph is continuous and piecewise linear, with a dot at every breakpoint; dragging
// the line of a piece moves both of its dots.
// Keyboard: ←/→ select a handle, ↑/↓ move it.
(function (root) {
  'use strict';

  const { scales, targetGraph, UNIT, num, hoverPoint } = root.Plot;
  const L = (en, de) => root.Lang.L(en, de);

  function createEditor(el, ex, onEdit) {
    const axis = ex.axes.target, s = scales(axis);
    let hover = null, view = { marks: null, solution: false, locked: false };
    const values = (sk) => sk.pieces().map(({ y0, ym, y1 }) => ({ y0, ym, y1 }));
    // Shows the point g under the mouse (null: none), redrawing only when it changes.
    function setHover(g) {
      if (hover === g || (hover && g && hover.t === g.t && hover.v === g.v)) return;
      hover = g;
      sk.render();
    }

    const sk = root.Sketch.create(el, {
      model: 'pieces', ts: [ex.pieces[0].t0, ...ex.pieces.map((p) => p.t1)], dragPieces: true, wrap: true,
      x: s.x, y: s.y, inv: s.inv, lo: axis.lo, hi: axis.hi, step: axis.step,
      plot: (k) => targetGraph(ex, values(k), { ...view, active: view.locked ? null : k.active(), hover }),
      radius: () => root.Plot.R_HANDLE, layer: `qc-${ex.to}`,
      describe: (h) => ({ label: `${ex.to} ${L('at', 'bei')} ${num(h.t)} s`, text: `${num(Math.round(h.v * 100) / 100)} ${UNIT[ex.to]}` }),
      onEdit() { view.marks = null; onEdit(); },
      onSelect() { hover = null; },
      hover(pt, evt, hit) {
        if (!pt) { setHover(null); return; }
        const curves = view.solution ? [values(sk), ex.answer] : [values(sk)];
        setHover(hit || evt.pointerType === 'touch' ? null : hoverPoint(ex, axis, curves, pt.x, pt.y));
      },
    });

    return {
      values: () => values(sk),
      reset: () => sk.reset(),
      // the drawing, to carry it over to a new editor (e.g. after switching the language)
      state: () => sk.state(),
      restore: (saved) => sk.restore(saved),
      show(opts) { Object.assign(view, opts); sk.show({ locked: view.locked, hidden: view.locked }); },
    };
  }

  root.createEditor = createEditor;
})(window);
