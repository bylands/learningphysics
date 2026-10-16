// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh into the apps
// whose index.html loads it: Slopes of Motion Graphs, Areas under Motion Graphs, Wave Propagation,
// Induction, Potential in a Circuit; its look is in sketch.css). A graph the student sketches in an
// <svg>: handles dragged up and down with mouse, pen or touch, or moved with the keys, their values
// snapped to a grid and kept on the axis. The app draws everything else (grid, axes, the line
// through the handles, a readout under the pointer, the marks of a check) and judges the sketch.
//   Sketch.create(svg, o)  the sketcher in the <svg> element svg, whose viewBox, class and label the
//                     app sets; it fills svg with two layers, the app's drawing (o.plot) and the
//                     handles above it (anything the app adds to svg later goes on top). o:
//     model           'pieces'   breakpoints at the times ts[0] … ts[n], joined by pieces; o.fixed:
//                                the breakpoints that are given (no handle); o.bend { step }: a
//                                diamond in the middle of every piece bends it (its value: the
//                                middle of the chord + the bend, which snaps to bend.step);
//                                o.dragPieces: dragging the line of a (straight) piece moves both
//                                its ends. State { nodes: [n + 1 values], bends: [n values] }.
//                     'columns'  a value at each of the places xs (grid lines, times); a press
//                                anywhere in o.area sets the nearest column to the value there, and
//                                dragging goes on setting it (the column stays). State [values].
//     x(u), y(v)      the scales to svg units (linear); inv(py): the value at a height (by default
//                     from y)
//     lo, hi, step    the values: their range, and the grid they snap to
//     area            { x0, x1, y0, y1 } (svg units, margin included): where a press sets a column
//     init, state     the state to reset to (default all 0), and the one to start from (default init)
//     plot(sk)        the markup of the app's drawing, redrawn on every change: it reads sk.state(),
//                     sk.pieces(), sk.active() and the app's own view (marks, a readout)
//     radius(h, active), classes(h, active)  a handle's size (default 7) and its classes besides
//                     handle (and mid for a bend); by default active for the selected one
//     layer           classes of the handles' layer (<g>), e.g. the colour of the quantity
//     describe(h)     { label, text } of a handle for screen readers
//     onEdit(sk, h)   the student changed the sketch (h: the handle, null for a whole piece or a
//                     reset); called before it is redrawn
//     onSelect(h)     the selected handle changed: focus, a press, the keys (null: the focus left)
//     hover(pt, evt, hit)  the pointer moves over svg without dragging (pt in svg units, null when
//                     it leaves; hit: what a press there would take, { h } a handle or a column,
//                     { piece: i } the line of a piece, or null)
//     locked          true (or a function saying so): no changes, the handles can still be selected
//     wrap            ← → go round from the last handle to the first
//     selected        the id of the handle Tab goes to first (default the first)
//   Returns { state(), restore(s), reset(), pieces(), handles(), active(), focused(), dragging(),
//     show({ locked, hidden }), render() }; hidden: no handles (e.g. with the solution shown).
// A handle is { id ('n0' … breakpoints, 'm0' … bends, 'c0' … columns), kind ('node', 'bend',
// 'column'), i, t (its place along the horizontal axis), v (its value), x, y (svg units) }; the
// handles come in the order of the keys: ← → select the one before or after (Home, End: the first,
// the last), ↑ ↓ move it a step (PageUp, PageDown: 5 steps). For screen readers each handle is a
// slider, one of them in the tab order. The pointer takes a handle within 22 px (14 svg units at
// least), the line of a piece within as much.
// A model is init(o), handles(o, st) (in the order of the keys), step(o, h), set(o, st, h, v) (a
// new state, snapped and kept on the axis) and optionally pieces(o, st), shift (moving a piece) and
// a press off the handles (the columns). Later uses fit this frame:
//   an exponential (capacitors, RL: v = v1 + (v0 − v1)·e^(−(t − t0)/τ)): a model of three handles,
//     the start v0 and the end level v1 dragged up and down like breakpoints, and τ, on the curve at
//     t0 + τ, dragged left and right: a handle with axis: 'x', set() taking its time (snapped to a
//     step of its own), and press and keys going along x for it (← → then also move it, Tab and
//     the selection keys being the way between handles);
//   a step graph (piecewise constant, E(x)): the columns model with a value per span, drawn by the
//     app as steps (Induction's voltage of straight flux pieces already is; Potential in a Circuit
//     has a column at each point of the loop, the line level or sloped between two points joined
//     by a wire and stepping across the element between the others), or, where the student
//     also places the steps, pieces whose two ends move together (one handle in the middle of each
//     piece, as dragPieces moves them) with the jumps drawn by the app.
// The pure parts (the models, snap) are checked in shared/test/check-sketch.js.
(function (root) {
  'use strict';

  const f1 = (x) => Math.round(x * 10) / 10;
  const snap = (v, step) => Math.round(v / step) * step + 0; // + 0: no −0
  const keep = (o, v) => Math.min(o.hi, Math.max(o.lo, v));

  // ---------------------------------------------------------------- models
  const Pieces = {
    init: (o) => ({ nodes: o.ts.map(() => 0), bends: o.ts.slice(1).map(() => 0) }),
    // the pieces as { t0, t1, y0, ym, y1 }, ym the value in the middle
    pieces: (o, st) => o.ts.slice(1).map((t1, i) => {
      const y0 = st.nodes[i], y1 = st.nodes[i + 1];
      return { t0: o.ts[i], t1, y0, ym: (y0 + y1) / 2 + (o.bend && st.bends ? st.bends[i] : 0), y1 };
    }),
    // the breakpoints not given, each piece's bend before its end
    handles(o, st) {
      const out = [], fixed = o.fixed || [];
      const node = (i) => { if (!fixed.includes(i)) out.push({ id: `n${i}`, kind: 'node', i, t: o.ts[i], v: st.nodes[i] }); };
      node(0);
      Pieces.pieces(o, st).forEach((p, i) => {
        if (o.bend) out.push({ id: `m${i}`, kind: 'bend', i, t: (p.t0 + p.t1) / 2, v: p.ym });
        node(i + 1);
      });
      return out;
    },
    step: (o, h) => (h.kind === 'bend' ? o.bend.step : o.step),
    set(o, st, h, v) {
      const out = { nodes: [...st.nodes], bends: st.bends ? [...st.bends] : o.ts.slice(1).map(() => 0) };
      if (h.kind === 'node') out.nodes[h.i] = keep(o, snap(v, o.step));
      else out.bends[h.i] = snap(keep(o, v) - (st.nodes[h.i] + st.nodes[h.i + 1]) / 2, o.bend.step);
      return out;
    },
    // piece i, its ends at base [y0, y1] when the drag began, moved by d (snapped; both ends stay
    // on the axis); null if one of its ends is given
    shift(o, st, i, base, d) {
      if ((o.fixed || []).some((k) => k === i || k === i + 1)) return null;
      const k = Math.min(o.hi - Math.max(...base), Math.max(o.lo - Math.min(...base), snap(d, o.step)));
      const nodes = [...st.nodes];
      nodes[i] = base[0] + k;
      nodes[i + 1] = base[1] + k;
      return { ...st, nodes };
    },
    // the piece whose line passes within r of (px, py) (svg units, away from its ends), or −1
    lineAt(o, st, px, py, r) {
      const ps = Pieces.pieces(o, st);
      const i = ps.findIndex((p) => px > o.x(p.t0) + r / 2 && px < o.x(p.t1) - r / 2);
      if (i < 0) return -1;
      const p = ps[i], k = (px - o.x(p.t0)) / (o.x(p.t1) - o.x(p.t0));
      return Math.abs(py - o.y(p.y0 + (p.y1 - p.y0) * k)) <= r ? i : -1;
    },
  };

  const Columns = {
    init: (o) => o.xs.map(() => 0),
    handles: (o, st) => o.xs.map((t, i) => ({ id: `c${i}`, kind: 'column', i, t, v: st[i] })),
    step: (o) => o.step,
    set(o, st, h, v) {
      const out = [...st];
      out[h.i] = keep(o, snap(v, o.step));
      return out;
    },
    // the column nearest to px (svg units), or −1 outside o.area
    columnAt(o, px, py) {
      const a = o.area;
      if (!a || px < a.x0 || px > a.x1 || py < a.y0 || py > a.y1) return -1;
      let i = 0;
      o.xs.forEach((u, k) => { if (Math.abs(o.x(u) - px) < Math.abs(o.x(o.xs[i]) - px)) i = k; });
      return i;
    },
  };

  const MODELS = { pieces: Pieces, columns: Columns };
  const copy = (s) => JSON.parse(JSON.stringify(s));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ---------------------------------------------------------------- the sketcher
  function create(el, o) {
    const M = MODELS[o.model], start = copy(o.init || M.init(o));
    const inv = o.inv || ((py) => o.lo + ((py - o.y(o.lo)) / (o.y(o.hi) - o.y(o.lo))) * (o.hi - o.lo));
    let st = copy(o.state || start), locked = o.locked || false, hidden = false;
    let sel = null, tab = o.selected || null, drag = null;
    const isLocked = () => (typeof locked === 'function' ? !!locked() : !!locked);

    el.classList.add('sketch', `sk-${o.model}`);
    if (!el.getAttribute('role')) el.setAttribute('role', 'group');
    el.innerHTML = `<g class="sk-plot"></g><g class="sk-handles${o.layer ? ' ' + o.layer : ''}"></g>`;
    const plotLayer = el.children[0], handleLayer = el.children[1];

    const handles = () => M.handles(o, st).map((h) => ({ ...h, x: f1(o.x(h.t)), y: f1(o.y(h.v)) }));
    const byId = (id) => handles().find((h) => h.id === id) || null;
    const elOf = (id) => handleLayer.querySelector(`[data-id="${id}"]`);
    const focused = () => !!document.activeElement && handleLayer.contains(document.activeElement);

    // ---------------------------------------------------------------- drawing
    function shape(e, h) {
      const active = h.id === sel, r = o.radius ? o.radius(h, active) : 7;
      if (h.kind === 'bend') e.setAttribute('d', `M${h.x},${f1(h.y - r)} L${f1(h.x + r)},${h.y} L${h.x},${f1(h.y + r)} L${f1(h.x - r)},${h.y} Z`);
      else { e.setAttribute('cx', h.x); e.setAttribute('cy', h.y); e.setAttribute('r', r); }
      const extra = o.classes ? o.classes(h, active) : active ? 'active' : '';
      e.setAttribute('class', `handle${h.kind === 'bend' ? ' mid' : ''}${extra ? ' ' + extra : ''}`);
      e.setAttribute('tabindex', h.id === tab ? 0 : -1);
      const d = o.describe ? o.describe(h) : { label: String(h.i + 1), text: String(h.v) };
      e.setAttribute('aria-label', d.label);
      e.setAttribute('aria-valuenow', h.v);
      e.setAttribute('aria-valuetext', d.text);
    }
    function render() {
      plotLayer.innerHTML = o.plot ? o.plot(api) : '';
      const hs = hidden ? [] : handles();
      if (!hs.some((h) => h.id === tab)) tab = hs.length ? hs[0].id : null;
      // the handles stay the same elements (one of them may have the focus); built once
      if (handleLayer.children.length !== hs.length) {
        handleLayer.innerHTML = hs.map((h) => `<${h.kind === 'bend' ? 'path' : 'circle'} data-id="${h.id}" role="slider" aria-orientation="vertical" aria-valuemin="${o.lo}" aria-valuemax="${o.hi}"/>`).join('');
      }
      hs.forEach((h, k) => shape(handleLayer.children[k], h));
    }

    // a new state from the student
    function change(next, h) {
      if (!next || same(next, st)) return;
      st = next;
      if (o.onEdit) o.onEdit(api, h);
      render();
    }
    // selects handle id (null: none), giving it the focus
    function select(id) {
      const e = id && elOf(id);
      if (!e) return;
      if (document.activeElement !== e) e.focus({ preventScroll: true }); // focusin selects it
      else if (sel !== id) { sel = tab = id; if (o.onSelect) o.onSelect(byId(id)); render(); }
    }

    // ---------------------------------------------------------------- pointer
    function point(evt) {
      const ctm = el.getScreenCTM(), pt = el.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      return ctm ? pt.matrixTransform(ctm.inverse()) : pt;
    }
    // what a press at pt takes: { h } a handle or column, { piece } the line of a piece, or null
    function find(pt) {
      if (hidden) return null;
      const hs = handles();
      if (M === Columns) {
        const i = Columns.columnAt(o, pt.x, pt.y);
        return i < 0 ? null : { h: hs[i] };
      }
      const ctm = el.getScreenCTM(), r = Math.max(14, 22 / ((ctm && ctm.a) || 1));
      let best = null, score = Infinity;
      for (const h of hs) {
        const d = Math.hypot(pt.x - h.x, pt.y - h.y);
        if (d <= r && d < score) { score = d; best = h; }
      }
      if (best) return { h: best };
      if (!o.dragPieces) return null;
      const i = Pieces.lineAt(o, st, pt.x, pt.y, r);
      return i < 0 || (o.fixed || []).some((k) => k === i || k === i + 1) ? null : { piece: i };
    }
    const setOver = (on) => el.classList.toggle('sk-over', on);

    el.addEventListener('pointerdown', (evt) => {
      if (evt.button > 0) return;
      const pt = point(evt), hit = find(pt);
      if (!hit) return;
      evt.preventDefault();
      // a piece: its first end is selected
      const h = hit.h || byId(`n${hit.piece}`);
      select(h.id);
      if (isLocked()) return;
      try { el.setPointerCapture(evt.pointerId); } catch (e) { /* no capture */ }
      drag = { pointer: evt.pointerId, id: h.id, piece: hit.piece, v: inv(pt.y), base: hit.piece != null ? [st.nodes[hit.piece], st.nodes[hit.piece + 1]] : null };
      setOver(false);
      el.classList.add('dragging');
      if (M === Columns) change(M.set(o, st, h, inv(pt.y)), h);
      render();
    });
    el.addEventListener('pointermove', (evt) => {
      const pt = point(evt);
      if (drag) {
        if (evt.pointerId !== drag.pointer) return;
        if (drag.piece != null) change(Pieces.shift(o, st, drag.piece, drag.base, inv(pt.y) - drag.v), null);
        else { const h = byId(drag.id); change(M.set(o, st, h, inv(pt.y)), h); }
        return;
      }
      const hit = find(pt);
      setOver(!!hit && M === Pieces && !isLocked());
      if (o.hover) o.hover(pt, evt, hit);
    });
    const end = (evt) => {
      if (!drag || evt.pointerId !== drag.pointer) return;
      drag = null;
      el.classList.remove('dragging');
      render();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', (evt) => {
      if (drag) return;
      setOver(false);
      if (o.hover) o.hover(null, evt, null);
    });

    // ---------------------------------------------------------------- keyboard and focus
    el.addEventListener('keydown', (evt) => {
      const e = evt.target.closest && evt.target.closest('.handle');
      if (!e || hidden) return;
      const hs = handles(), k = hs.findIndex((h) => h.id === e.dataset.id), n = hs.length;
      const steps = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[evt.key];
      const to = { ArrowLeft: k - 1, ArrowRight: k + 1, Home: 0, End: n - 1 }[evt.key];
      if (steps != null) {
        if (!isLocked()) change(M.set(o, st, hs[k], hs[k].v + steps * M.step(o, hs[k])), hs[k]);
      } else if (to != null) {
        select(hs[o.wrap ? (to + n) % n : Math.max(0, Math.min(n - 1, to))].id);
      } else return;
      evt.preventDefault();
    });
    el.addEventListener('focusin', (evt) => {
      const e = evt.target.closest && evt.target.closest('.handle');
      if (!e || e.dataset.id === sel) return;
      sel = tab = e.dataset.id;
      if (o.onSelect) o.onSelect(byId(sel));
      render();
    });
    // the focus left the handles (not to another one): nothing selected
    el.addEventListener('focusout', () => setTimeout(() => {
      if (drag || focused() || sel === null) return;
      sel = null;
      if (o.onSelect) o.onSelect(null);
      render();
    }, 0));

    const api = {
      state: () => copy(st),
      restore(s) { st = copy(s); render(); },
      reset() { st = copy(start); if (o.onEdit) o.onEdit(api, null); render(); },
      pieces: () => (M.pieces ? M.pieces(o, st) : null),
      handles,
      active: () => (sel && !hidden ? byId(sel) : null),
      focused,
      dragging: () => !!drag,
      show(opts) {
        if ('locked' in opts) locked = opts.locked;
        if ('hidden' in opts) hidden = !!opts.hidden;
        if (hidden) sel = null;
        render();
      },
      render,
    };
    render();
    return api;
  }

  const api = { create, snap, models: MODELS };
  root.Sketch = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
