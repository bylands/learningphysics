// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh into the apps
// whose index.html loads it): reading values off a graph. Over a graph, the pointer (hover with a
// mouse or pen; tap and then drag with a finger, and the graph stops scrolling the page until a tap
// elsewhere) or the arrow keys, once the graph has the focus (Shift: ten times as far; Escape
// hides), move a reading point; what it shows depends on the figure:
//   free coordinates   guide lines to both axes and a label with both coordinates (photons)
//   on a curve         the same for the point of a curve at the pointer's x, or nearest to the
//                      pointer (capacitors)
//   tangent            the tangent to the curve there, ending at a level it heads for (capacitors)
//   pins               a click or tap without moving, or Enter, pins the point (impedance)
// Used by photons, capacitors and impedance.
//
// 1. A figure from a few attributes, no script: an <svg> with
//   data-read="L R B T"         the plot area in user units of the svg (left, right, bottom, top)
//   data-val="x0 x1 y0 y1"      the values at those edges
//   data-xn data-xu data-xp     the name, unit and step of x in the readout, e.g. "V_s" "V" "0.01";
//   data-yn data-yu data-yp     in a name, _ sets the rest (up to a space) as a subscript and *v*
//                               sets v in italics: "Δ*V*_C"
// and if needed
//   data-read-log="x y"         logarithmic axes (either or both)
//   data-read-curve             the curve: a name given to Reader.curve(), whose arguments are the
//                               JSON in data-read-args; or points "x,y x,y …" joined by straight lines
//   data-read-mode              xy (default without a curve): the coordinates of the pointer, rounded
//                               to the steps; curve: the point of the curve at the pointer's x;
//                               near (default with a curve): the point of the curve nearest the
//                               pointer, its x on the grid of the step; tan: the tangent at the
//                               pointer's x (not rounded)
//   data-read-tan="a b [y]"     the tangent from x − a to x + b, or only up to where it meets the
//                               level y (marked with a dot); by default a tenth of the axis each way
//   data-read-label             box (default): two lines beside the point; corner: one line at the
//                               top right of the plot area; none
//   data-read-num="trim"        numbers without trailing zeros (3 s, not 3.0 s)
//   data-read-pins="3"          up to that many pinned points, numbered
//   tabindex="0"                for the arrow keys (the keyboard reading is announced)
// shows the reading; reader.css draws it (module styles may restyle its classes: .rd-guide,
// .rd-pt, .rd-tan, .rd-end, .rd-box, .rd-text, .rd-corner, .rd-sub, .rd-pin, .rd-pin-n). The svg
// may be inserted at any time: one set of listeners serves the whole page. A label or button
// around such an svg (an answer option) counts as the graph too.
//
// 2. A graph that draws its own reading (another kind of axis, a readout outside the svg):
//   Reader.attach(el, { svg, pick, nudge, show, pins }) → { draw, reset, unpin, reading, pins }
//     el        the svg, or an element around it (the svg in it may be replaced at any time)
//     pick(ux, uy)            the reading at user coordinates of the svg (any object), or null
//     nudge(r, dx, dy, shift) the reading after an arrow key (dx, dy: −1, 0 or 1; r null: none
//                             yet), or undefined to leave that key alone (e.g. ↑ ↓ to the page)
//     show(r, pins)           draws reading r (null: none) and the pinned readings (each with its
//                             number n); may return the text to announce after a key
//     pins                    how many points can be pinned (0: none)
//   draw() redraws (after the graph was redrawn), reset() clears reading and pins, unpin(n).
//
// The pure part (node, for the tests): Reader.fmt, axes, parse, read, nudge.
(function (root) {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

  // ---------------------------------------------------------------- numbers and axes
  // v rounded to the step p, with as many decimals as p has and a proper minus sign (no −0);
  // trim: without trailing zeros
  function fmt(v, p, trim) {
    const d = Math.max(0, trim ? Math.ceil(-Math.log10(p) - 1e-9) : Math.round(-Math.log10(p)));
    let t = (Math.round(v / p) * p).toFixed(d);
    if (trim && t.includes('.')) t = t.replace(/\.?0+$/, '');
    return (/^-0?\.?0*$/.test(t) ? t.slice(1) : t).replace('-', '−');
  }
  const snap = (v, p) => Math.round(v / p) * p;
  // the step of an arrow key: about a hundredth of the range, a whole number of steps p
  const keyStep = (range, p) => Math.max(1, Math.round(range / 100 / p)) * p;

  // The mapping of plot area box [L, R, B, T] (user units) to the values val [x0, x1, y0, y1],
  // either axis logarithmic: X(x), Y(y) to user units and x(X), y(Y) back.
  function axes(box, val, log = {}) {
    const [L, R, B, T] = box, [x0, x1, y0, y1] = val;
    const gx = log.x ? Math.log10 : (v) => v, gy = log.y ? Math.log10 : (v) => v;
    const hx = log.x ? (v) => 10 ** v : (v) => v, hy = log.y ? (v) => 10 ** v : (v) => v;
    const [a0, a1, b0, b1] = [gx(x0), gx(x1), gy(y0), gy(y1)];
    return {
      L, R, B, T, x0, x1, y0, y1, log,
      X: (x) => L + ((gx(x) - a0) / (a1 - a0)) * (R - L),
      Y: (y) => B + ((gy(y) - b0) / (b1 - b0)) * (T - B),
      x: (X) => hx(a0 + ((X - L) / (R - L)) * (a1 - a0)),
      y: (Y) => hy(b0 + ((Y - B) / (T - B)) * (b1 - b0)),
      // within the plot area, give or take half a unit
      inside: (X, Y) => X >= L - 0.5 && X <= R + 0.5 && Y <= B + 0.5 && Y >= T - 0.5,
    };
  }

  // ---------------------------------------------------------------- curves
  const curves = {};
  // a named curve for data-read-curve: make(args) returns f(x), or { f, d } with the slope d(x)
  function curve(name, make) { curves[name] = make; }
  // a curve from points "x,y x,y …" joined by straight lines
  function polyline(s) {
    const pts = s.trim().split(/\s+/).map((p) => p.split(',').map(Number)).sort((a, b) => a[0] - b[0]);
    const seg = (x) => { let k = 1; while (k < pts.length - 1 && pts[k][0] < x) k++; return [pts[k - 1], pts[k]]; };
    const d = (x) => { const [[xa, ya], [xb, yb]] = seg(x); return (yb - ya) / (xb - xa); };
    return { f: (x) => { const [[xa, ya]] = seg(x); return ya + d(x) * (x - xa); }, d };
  }
  function curveOf(spec, args) {
    if (!spec) return null;
    let c = curves[spec] ? curves[spec](args || {}) : /\d/.test(spec) ? polyline(spec) : null;
    if (typeof c === 'function') c = { f: c };
    // without a slope given, from the central difference over a millionth of the axis
    if (c && !c.d) c.d = (x) => { const h = Math.max(Math.abs(x), 1) * 1e-6; return (c.f(x + h) - c.f(x - h)) / (2 * h); };
    return c;
  }

  // The configuration of a figure from its attributes (a dataset, or a plain object in the tests).
  function parse(ds) {
    const nums = (s) => String(s).trim().split(/\s+/).map(Number);
    const log = { x: /x/.test(ds.readLog || ''), y: /y/.test(ds.readLog || '') };
    let args = null;
    try { args = ds.readArgs ? JSON.parse(ds.readArgs) : null; } catch (e) { args = null; }
    const c = curveOf(ds.readCurve, args);
    const mode = ds.readMode || (c ? 'near' : 'xy');
    return {
      ax: axes(nums(ds.read), nums(ds.val), log),
      x: { n: ds.xn || 'x', u: ds.xu || '', p: Number(ds.xp) || 0.01 },
      y: { n: ds.yn || 'y', u: ds.yu || '', p: Number(ds.yp) || 0.01 },
      curve: c, mode: c ? mode : 'xy',
      tan: ds.readTan ? nums(ds.readTan) : null,
      label: ds.readLabel || 'box', trim: ds.readNum === 'trim', pins: Number(ds.readPins) || 0,
    };
  }

  // The reading at the values x (and, free, y), rounded as the mode asks:
  // { x, y, X, Y (the point in user units), lines (of the label), tan: { a, b, end } }
  function at(cfg, x, y) {
    const { ax, curve: c, mode } = cfg;
    if (mode !== 'tan') x = snap(x, cfg.x.p);
    if (mode === 'xy') y = snap(y, cfg.y.p);
    else y = c.f(x);
    const r = { x, y, X: ax.X(x), Y: ax.Y(y) };
    r.lines = [`${cfg.x.n} = ${fmt(x, cfg.x.p, cfg.trim)} ${cfg.x.u}`, `${cfg.y.n} = ${fmt(y, cfg.y.p, cfg.trim)} ${cfg.y.u}`];
    if (mode === 'tan') {
      // the tangent from x − a to x + b, within the axis; it stops where it meets the level
      const s = c.d(x), [a, b, level] = cfg.tan || [(ax.x1 - ax.x0) / 10, (ax.x1 - ax.x0) / 10];
      const xa = Math.max(ax.x0, x - a);
      let xb = Math.min(ax.x1, x + b), end = null;
      if (level != null && s) {
        const xl = x + (level - y) / s;
        if (xl >= x && xl <= x + b) { xb = Math.min(xb, xl); if (xl <= ax.x1) end = [ax.X(xl), ax.Y(level)]; }
      }
      const on = (t) => [ax.X(t), ax.Y(y + s * (t - x))];
      r.slope = s;
      r.tan = { a: on(xa), b: on(xb), end };
    }
    return r;
  }

  // the reading at user coordinates (X, Y), or null outside the plot area
  function read(cfg, X, Y) {
    const { ax } = cfg;
    if (!ax.inside(X, Y)) return null;
    let x = ax.x(Math.max(ax.L, Math.min(ax.R, X)));
    if (cfg.mode === 'near') {
      // the point of the curve on the grid of the step nearest the pointer, in user units
      const p = cfg.x.p;
      let best = Infinity;
      for (let k = Math.ceil(ax.x0 / p - 1e-9); k * p <= ax.x1 + 1e-9; k++) {
        const dx = ax.X(k * p) - X, dy = ax.Y(cfg.curve.f(k * p)) - Y, dd = dx * dx + dy * dy;
        if (dd < best) { best = dd; x = k * p; }
      }
    }
    return at(cfg, x, ax.y(Y));
  }

  // the reading after an arrow key: a hundredth of the axis (shift: a tenth), on a log axis a
  // hundredth of its length; free (xy) both ways, on a curve only ← →; r null: the middle
  function nudge(cfg, r, dx, dy, shift) {
    const { ax } = cfg;
    if (cfg.mode !== 'xy' && dy) return undefined;
    if (!r) return at(cfg, ax.x((ax.L + ax.R) / 2), ax.y((ax.B + ax.T) / 2));
    const k = shift ? 10 : 1;
    let x = r.x, y = r.y;
    if (dx) x = ax.log.x ? ax.x(Math.max(ax.L, Math.min(ax.R, ax.X(x) + (dx * k * (ax.R - ax.L)) / 100))) : x + dx * k * keyStep(ax.x1 - ax.x0, cfg.x.p);
    if (dy) y = ax.log.y ? ax.y(Math.max(ax.T, Math.min(ax.B, ax.Y(y) + (dy * k * (ax.T - ax.B)) / 100))) : y + dy * k * keyStep(ax.y1 - ax.y0, cfg.y.p);
    x = Math.max(ax.x0, Math.min(ax.x1, x));
    y = Math.max(Math.min(ax.y0, ax.y1), Math.min(Math.max(ax.y0, ax.y1), y));
    return at(cfg, x, y);
  }

  // the text of a reading for a screen reader: the label without its marks
  const said = (r) => r.lines.join(', ').replace(/[_*]/g, '');

  const api = { fmt, axes, parse, read, nudge, curve, said, attach: null };

  // ---------------------------------------------------------------- drawing (figures of kind 1)
  if (typeof document === 'undefined') {
    root.Reader = api;
    if (typeof module !== 'undefined') module.exports = api;
    return;
  }
  const el = (name, attrs, parent) => {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  // a name or line with its marks: after _ a subscript (to the next space), *v* in italics
  function rich(text, s, dy) {
    text.textContent = '';
    s.split(/_(\S+)/).forEach((part, k) => {
      if (!part) return;
      if (k % 2) {
        el('tspan', { class: 'rd-sub', dy }, text).textContent = part;
        el('tspan', { dy: -dy }, text).textContent = '​';
        return;
      }
      part.split(/\*([^*]+)\*/).forEach((bit, j) => {
        if (!bit) return;
        if (j % 2) el('tspan', { 'font-style': 'italic' }, text).textContent = bit;
        else text.append(bit);
      });
    });
  }
  function drawFigure(svg, cfg, r, pins) {
    let g = svg.querySelector('g.rd');
    if (!r && !pins.length) { if (g) g.remove(); return null; }
    if (!g) g = el('g', { class: 'rd', 'aria-hidden': 'true' }, svg);
    g.textContent = '';
    const { ax } = cfg;
    for (const p of pins) {
      el('circle', { class: 'rd-pin', cx: p.X, cy: p.Y, r: 8 }, g);
      el('text', { class: 'rd-pin-n', x: p.X, y: p.Y + 4, 'text-anchor': 'middle' }, g).textContent = p.n;
    }
    if (!r) return null;
    if (r.tan) {
      el('polyline', { class: 'rd-tan', points: `${r.tan.a} ${r.tan.b}` }, g);
      if (r.tan.end) el('circle', { class: 'rd-end', cx: r.tan.end[0], cy: r.tan.end[1], r: 3.5 }, g);
      el('circle', { class: 'rd-pt rd-on', cx: r.X, cy: r.Y, r: 4 }, g);
    } else {
      // guide lines from the point to both axes (where the axes cross, x = 0 or y = 0 when shown)
      const AX = ax.X(Math.max(Math.min(ax.x0, ax.x1), Math.min(Math.max(ax.x0, ax.x1), ax.log.x ? ax.x0 : 0)));
      const AY = ax.Y(Math.max(Math.min(ax.y0, ax.y1), Math.min(Math.max(ax.y0, ax.y1), ax.log.y ? ax.y0 : 0)));
      el('line', { class: 'rd-guide', x1: r.X, x2: r.X, y1: r.Y, y2: AY }, g);
      el('line', { class: 'rd-guide', x1: r.X, x2: AX, y1: r.Y, y2: r.Y }, g);
      el('circle', { class: 'rd-pt', cx: r.X, cy: r.Y, r: 3.2 }, g);
    }
    if (cfg.label === 'corner') {
      rich(el('text', { class: 'rd-corner', x: ax.R, y: ax.T + 6, 'text-anchor': 'end' }, g), r.lines.join(', '), 4);
    } else if (cfg.label === 'box' && !r.tan) {
      // the label beside the point, up and to the right, flipped to stay within the drawing
      const box = el('rect', { class: 'rd-box', rx: 4 }, g), text = el('text', { class: 'rd-text' }, g);
      const t = r.lines.map((s) => { const span = el('tspan', {}, text); rich(span, s, 3); return span; });
      const W = svg.viewBox.baseVal.width, pad = 5, lineH = 14;
      t[0].setAttribute('dy', 0); t[1].setAttribute('dy', lineH);
      let bw = 0;
      try { bw = Math.max(...t.map((s) => s.getComputedTextLength())); } catch (e) { bw = 0; }
      if (!bw) bw = Math.max(...r.lines.map((s) => s.length)) * 6.6;
      const bh = 2 * lineH + 2 * pad - 4;
      let bx = r.X + 10, by = r.Y - 10 - bh;
      if (bx + bw + 2 * pad > W - 2) bx = r.X - 10 - bw - 2 * pad;
      if (by < 2) by = r.Y + 10;
      bx = Math.max(2, bx);
      box.setAttribute('x', bx); box.setAttribute('y', by); box.setAttribute('width', bw + 2 * pad); box.setAttribute('height', bh);
      t.forEach((s) => s.setAttribute('x', bx + pad));
      text.setAttribute('y', by + pad + 10);
    }
    return said(r);
  }

  // ---------------------------------------------------------------- the pointer and the keys
  const targets = new WeakMap(); // element → its reader: attached elements and figures of kind 1
  const shown = new Set();       // readers showing a reading
  let active = null;             // the reader a finger reads (its graph does not scroll the page)
  let down = null;               // a pointer pressed on a reader: { t, x, y } (no move: a pin)
  let live = null;               // the live region announcing keyboard readings

  function Target(host, o) {
    const t = { host, o, cur: null, pins: [], next: 1 };
    t.svg = () => (o.svg ? o.svg() : host.matches('svg') ? host : host.querySelector('svg'));
    // focused from the keyboard (a click focuses the graph too, but then the pointer leads)
    t.focused = () => {
      const s = t.svg();
      if (!s || s !== document.activeElement) return false;
      try { return s.matches(':focus-visible'); } catch (e) { return true; }
    };
    t.draw = () => {
      if (t.cur) shown.add(t); else shown.delete(t);
      return t.svg() ? o.show(t.cur, t.pins) : null;
    };
    // (hiding what is hidden already draws nothing: the readout of a graph may hold buttons)
    t.set = (r) => { if (!r && !t.cur) return null; t.cur = r || null; return t.draw(); };
    t.point = (evt) => {
      const s = t.svg(), m = s && s.getScreenCTM();
      if (!m) return;
      const p = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
      t.set(o.pick(p.x, p.y));
    };
    t.pin = () => {
      t.pins.push({ ...t.cur, n: t.next++ });
      if (t.pins.length > o.pins) t.pins.shift();
      t.draw();
    };
    targets.set(host, t);
    return t;
  }
  function attach(host, o) {
    const t = Target(host, { pins: 0, nudge: () => undefined, ...o });
    return {
      draw: () => { t.draw(); },
      reset() { t.cur = null; t.pins = []; t.next = 1; t.draw(); },
      unpin(n) { t.pins = t.pins.filter((p) => p.n !== n); t.draw(); },
      get reading() { return t.cur; },
      get pins() { return t.pins; },
    };
  }
  // a figure of kind 1, configured from its attributes the first time it is used
  function figure(svg) {
    if (targets.has(svg)) return targets.get(svg);
    const cfg = parse(svg.dataset);
    return Target(svg, {
      pins: cfg.pins,
      pick: (X, Y) => read(cfg, X, Y),
      nudge: (r, dx, dy, shift) => nudge(cfg, r, dx, dy, shift),
      show: (r, pins) => drawFigure(svg, cfg, r, pins),
    });
  }
  // the reader under a node: an attached element around it, a figure, or a figure in a label or
  // button around it (an answer option, whose input may lie on top of the drawing)
  function targetOf(node) {
    for (let e = node && node.nodeType === 1 ? node : null; e; e = e.parentElement) {
      if (targets.has(e)) return targets.get(e);
      if (e.matches('svg[data-read]')) return figure(e);
      if (e.matches('label, button')) { const s = e.querySelector('svg[data-read]'); if (s) return figure(s); }
    }
    return null;
  }
  function stop() {
    if (!active) return;
    const s = active.svg();
    if (s) s.classList.remove('rd-reading');
    active.set(null);
    active = null;
  }
  function announce(text) {
    if (!live) {
      live = document.createElement('p');
      live.className = 'sr-only';
      live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:-1px;padding:0;border:0';
      document.body.appendChild(live);
    }
    live.textContent = text;
  }

  document.addEventListener('pointermove', (evt) => {
    if (evt.pointerType === 'mouse' || evt.pointerType === 'pen') {
      const t = targetOf(evt.target);
      shown.forEach((s) => { if (s !== t && !s.focused()) s.set(null); });
      if (t) t.point(evt);
    } else if (active) active.point(evt);
  }, { passive: true });
  document.addEventListener('pointerdown', (evt) => {
    const t = targetOf(evt.target);
    down = t ? { t, x: evt.clientX, y: evt.clientY } : null;
    if (evt.pointerType === 'mouse') return;
    if (!t) { stop(); return; }
    if (active !== t) stop();
    active = t;
    const s = t.svg();
    if (s) s.classList.add('rd-reading');
    t.point(evt);
    if (!t.cur) stop();
  });
  // a finger that scrolls the page instead (where the graph lets it) does not read
  document.addEventListener('pointercancel', (evt) => { if (active && targetOf(evt.target) === active) stop(); });
  // a click or tap that did not move (more than 8 px) pins the point
  document.addEventListener('pointerup', (evt) => {
    const d = down;
    down = null;
    if (!d || !d.t.o.pins || !d.t.cur || Math.hypot(evt.clientX - d.x, evt.clientY - d.y) > 8) return;
    d.t.pin();
  });
  document.addEventListener('pointerout', (evt) => {
    if (evt.pointerType !== 'mouse') return;
    const t = targetOf(evt.target);
    if (t && t.cur && targetOf(evt.relatedTarget) !== t && !t.focused()) t.set(null);
  });
  // arrow keys move the point, Enter or space pins it, Escape hides it
  document.addEventListener('keydown', (evt) => {
    const t = targetOf(evt.target);
    if (!t || evt.target !== t.svg()) return;
    if (evt.key === 'Escape') { t.set(null); return; }
    if ((evt.key === 'Enter' || evt.key === ' ') && t.o.pins && t.cur) { evt.preventDefault(); t.pin(); return; }
    const d = ARROWS[evt.key];
    if (!d) return;
    const r = t.o.nudge(t.cur, d[0], d[1], evt.shiftKey);
    if (r === undefined) return;
    evt.preventDefault();
    evt.stopPropagation();
    const text = t.set(r);
    if (text) announce(text);
  });
  document.addEventListener('focusout', (evt) => {
    const t = targetOf(evt.target);
    if (t && evt.target === t.svg() && !(down && down.t === t)) t.set(null);
  });

  api.attach = attach;
  root.Reader = api;
})(typeof window !== 'undefined' ? window : globalThis);
