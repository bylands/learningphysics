// SVG diagrams of a flux graph Φ(t) and of its induced voltage V_ind(t) = −dΦ/dt (U_ind in German), drawn by
// sampling each piece. Each quantity has its colour (class qc-flux: green, qc-volt: red) for
// the curve and the axis label. For the solution, the slope of Φ (mWb/s) or the voltage (mV) at the
// start and end of every piece is written in a row above the plot.
//   fluxGraph(fg, annotate, opts), voltGraph(fg, annotate, opts)   the graphs of a flux graph fg
//   optionGraph(o)   an option of an exercise (generator.js): any function of t, with jumps
//                    allowed at o.breaks (dotted for the voltage)
//   drawGraph(d), drawBody(d), drawScales(kind)   the student's own graph, set with the handles of
//                    the shared sketcher (sketch.js)
(function (root) {
  'use strict';

  const { T, PHI_MAX, V_MAX, SHAPE, flux, volt } = root.Induction || require('./generator.js');
  const Lang = root.Lang || require('./lang.js');
  const say = (en, de) => Lang.L(en, de);
  const dec = (x) => String(x); // decimal point in both languages
  const W = 280, H = 196, L = 34, R = 44, TOP = 44, B = 26;
  const num = (x) => (x > 0 ? '+' + dec(x) : x < 0 ? '−' + dec(-x) : '0');
  const r1 = (x) => Math.round(x * 10) / 10;
  const f1 = (x) => Math.round(x * 10) / 10;

  // o.tScale, o.tUnit: other time units on the axis (the problems), e.g. 10 and 'ms'.
  function frame(yMin, yMax, yLabelStep, yLabel, o = {}) {
    const x = (t) => f1(L + (t / T) * (W - L - R));
    const y = (v) => f1(TOP + ((yMax - v) / (yMax - yMin)) * (H - TOP - B));
    let s = '';
    for (let t = 1; t <= T; t++) s += `<line class="grid" x1="${x(t)}" y1="${y(yMax)}" x2="${x(t)}" y2="${y(yMin)}"/>`;
    for (let v = yMin; v <= yMax; v++) if (v !== 0) s += `<line class="grid" x1="${x(0)}" y1="${y(v)}" x2="${x(T)}" y2="${y(v)}"/>`;
    s += `<line class="ax" x1="${x(0)}" y1="${y(yMin)}" x2="${x(0)}" y2="${y(yMax) - 8}"/>`;
    s += `<line class="ax" x1="${x(0)}" y1="${y(0)}" x2="${x(T) + 8}" y2="${y(0)}"/>`;
    // On a small graph (style.css), only the ticks that are not minor keep their labels: 0 and
    // ±3 on the voltage axis, 0, 4 and 8 on the flux axis, and 2, 4, 6 on the time axis (0 would
    // meet the vertical axis' labels, 8 the label t in s).
    const minorY = (v) => (yLabelStep === 1 ? v % 3 !== 0 : v % 4 !== 0);
    for (let v = yMin; v <= yMax; v += yLabelStep) s += `<text class="tick${minorY(v) ? ' minor' : ''}" x="${x(0) - 5}" y="${y(v) + 4}" text-anchor="end">${num(v).replace('+', '')}</text>`;
    for (let t = 0; t <= (o.tScale ? T - 2 : T); t += 2) s += `<text class="tick${t === 0 || t === T ? ' minor' : ''}" x="${x(t)}" y="${H - B + 16}" text-anchor="middle">${t * (o.tScale || 1)}</text>`;
    s += `<text class="axis" x="${W - 4}" y="${H - B + 16}" text-anchor="end"><tspan class="it">t</tspan> in ${o.tUnit || 's'}</text>`;
    s += `<text class="axis qlabel" x="6" y="15">${yLabel}</text>`;
    return { x, y, s };
  }

  const svg = (body, label, cls) =>
    `<svg class="${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${body}</svg>`;

  // Solution labels: one per piece, in a row above the plot, with separators at the breakpoints.
  function labels(g, pieces, texts) {
    let s = '';
    pieces.slice(1).forEach((p) => { s += `<line class="jump" x1="${g.x(p.t0)}" y1="${TOP - 17}" x2="${g.x(p.t0)}" y2="${TOP - 3}"/>`; });
    texts.forEach((text, i) => { s += `<text class="ann" x="${g.x((pieces[i].t0 + pieces[i].t1) / 2)}" y="${TOP - 6}" text-anchor="middle">${text}</text>`; });
    return s;
  }
  const range = (a, b) => (a === b ? num(a) : `${num(a)} → ${num(b)}`);

  // Slope of Φ at the start and end of a piece, rounded.
  function slopes(p, sign) {
    const df = (x) => r1(sign * SHAPE[p.type].df(p, x));
    return range(df(0), df(p.t1 - p.t0));
  }

  // Points along one piece: its ends for a straight line, otherwise about 25 per second.
  function points(p, value, g) {
    const n = p.type === 'poly' && p.d0 === p.d1 ? 1 : Math.ceil((p.t1 - p.t0) * 25);
    return Array.from({ length: n + 1 }, (x, k) => {
      const t = p.t0 + ((p.t1 - p.t0) * k) / n;
      return `${g.x(t)},${g.y(value(Math.min(t, p.t1 - 1e-9)))}`;
    });
  }

  // For the tutorial, opts.band = [t0, t1] highlights a time span, and opts.overlay(g) draws
  // marks over the graph, given its scales g.x, g.y.
  const band = (g, b, yMin, yMax) => (b ? `<rect class="tband" x="${g.x(b[0])}" y="${g.y(yMax)}" width="${f1(g.x(b[1]) - g.x(b[0]))}" height="${f1(g.y(yMin) - g.y(yMax))}"/>` : '');

  const fluxFrame = (o = {}) => frame(0, PHI_MAX, 2, `<tspan class="it">Φ</tspan> in ${o.yUnit || 'mWb'}`, o);
  const voltFrame = (o = {}) => frame(-V_MAX, V_MAX, 1, `<tspan class="it">${say('V', 'U')}</tspan><tspan class="sub" dy="3">ind</tspan><tspan dy="-3"> in ${o.yUnit || 'mV'}</tspan>`, o);
  const FLUX_LABEL = () => say('Graph of the magnetic flux against time', 'Graph des magnetischen Flusses gegen die Zeit');
  const VOLT_LABEL = () => say('Graph of the induced voltage against time', 'Graph der induzierten Spannung gegen die Zeit');

  // opts.upto: only the first pieces (tutorial).
  function fluxGraph(fg, annotate, opts = {}) {
    const g = fluxFrame();
    const shown = opts.upto === undefined ? fg.pieces : fg.pieces.slice(0, opts.upto);
    const pts = shown.flatMap((p, i) => points(p, (t) => flux(fg, t), g).slice(i ? 1 : 0));
    const ann = annotate ? labels(g, fg.pieces, fg.pieces.map((p) => slopes(p, 1))) : '';
    const over = opts.overlay ? opts.overlay(g) : '';
    return svg(band(g, opts.band, 0, PHI_MAX) + g.s + (pts.length ? `<path class="curve" d="M${pts.join(' L')}"/>` : '') + ann + over, FLUX_LABEL(), 'qc-flux');
  }

  // The voltage jumps where the slope of Φ does; jumps are drawn as dotted lines. For the
  // tutorial, opts.upto: only the first pieces; opts.band and opts.overlay as for fluxGraph.
  function voltGraph(fg, annotate, opts = {}) {
    const g = voltFrame();
    let s = band(g, opts.band, -V_MAX, V_MAX) + g.s, d = '';
    fg.pieces.forEach((p, i) => {
      if (opts.upto !== undefined && i >= opts.upto) return;
      if (i > 0) {
        const before = volt(fg, p.t0 - 1e-9), after = volt(fg, p.t0);
        if (Math.abs(before - after) > 1e-6) s += `<line class="jump" x1="${g.x(p.t0)}" y1="${g.y(before)}" x2="${g.x(p.t0)}" y2="${g.y(after)}"/>`;
      }
      d += `M${points(p, (t) => volt(fg, t), g).join(' L')} `;
    });
    if (d) s += `<path class="curve" d="${d.trim()}"/>`;
    if (annotate) s += labels(g, fg.pieces, fg.pieces.map((p) => slopes(p, -1)));
    if (opts.overlay) s += opts.overlay(g);
    return svg(s, VOLT_LABEL(), 'qc-volt');
  }

  // An option: o.f sampled between its breaks, about 25 points per second. A flux is one line
  // (a jump drawn straight up or down); the voltage jumps are dotted, as in voltGraph.
  // opts.units: { tScale, tUnit, yUnit } (the problems).
  function optionGraph(o, opts = {}) {
    const isFlux = o.kind === 'flux', g = isFlux ? fluxFrame(opts.units) : voltFrame(opts.units);
    let s = g.s, d = '';
    o.breaks.slice(0, -1).forEach((t0, i) => {
      const t1 = o.breaks[i + 1], n = Math.ceil((t1 - t0) * 25);
      const pts = Array.from({ length: n + 1 }, (x, k) => { const t = t0 + ((t1 - t0) * k) / n; return `${g.x(t)},${g.y(o.f(Math.min(t, t1 - 1e-9)))}`; });
      if (i > 0 && !isFlux) {
        const before = o.f(t0 - 1e-9), after = o.f(t0);
        if (Math.abs(before - after) > 1e-6) s += `<line class="jump" x1="${g.x(t0)}" y1="${g.y(before)}" x2="${g.x(t0)}" y2="${g.y(after)}"/>`;
      }
      d += isFlux ? `${i ? 'L' : 'M'}${pts.join(' L')} ` : `M${pts.join(' L')} `;
    });
    s += `<path class="curve" d="${d.trim()}"/>`;
    if (opts.overlay) s += opts.overlay(g);
    return svg(s, opts.label || (isFlux ? FLUX_LABEL() : VOLT_LABEL()), isFlux ? 'qc-flux' : 'qc-volt');
  }

  // ---------------------------------------------------------------- drawing
  // The student's graph: d = { kind: 'flux' | 'volt', at (the times of the handles), values,
  // spans (a step graph: the value of handle i holds over spans[i]; otherwise straight lines from
  // handle to handle), wrong (handles marked), label }. drawGraph(d): an empty <svg> for the
  // sketcher, which draws drawBody(d) (the plot under its handles) in it. drawScales(kind): the
  // scales x(t), y(v), the range lo … hi and the area where a press sets a handle (the plot and a
  // margin, in SVG units).
  const lims = (kind) => (kind === 'flux' ? [0, PHI_MAX] : [-V_MAX, V_MAX]);
  const drawGraph = (d) => svg('', d.label || '', `${d.kind === 'flux' ? 'qc-flux' : 'qc-volt'} drawing`).replace('role="img"', 'role="group"');
  function drawBody(d) {
    const g = d.kind === 'flux' ? fluxFrame() : voltFrame(), [lo, hi] = lims(d.kind);
    let s = g.s;
    (d.wrong || []).forEach((i) => {
      const [a, b] = d.spans ? d.spans[i] : [d.at[i] - 0.25, d.at[i] + 0.25];
      s += `<rect class="wrongcol" x="${g.x(a)}" y="${g.y(hi)}" width="${f1(g.x(b) - g.x(a))}" height="${f1(g.y(lo) - g.y(hi))}"/>`;
    });
    d.at.forEach((t) => { s += `<line class="col" x1="${g.x(t)}" y1="${g.y(hi)}" x2="${g.x(t)}" y2="${g.y(lo)}"/>`; });
    if (d.spans) {
      d.spans.forEach(([a, b], i) => {
        if (i > 0 && d.values[i] !== d.values[i - 1]) s += `<line class="jump" x1="${g.x(a)}" y1="${g.y(d.values[i - 1])}" x2="${g.x(a)}" y2="${g.y(d.values[i])}"/>`;
        s += `<path class="curve" d="M${g.x(a)},${g.y(d.values[i])} L${g.x(b)},${g.y(d.values[i])}"/>`;
      });
    } else s += `<path class="curve" d="M${d.at.map((t, i) => `${g.x(t)},${g.y(d.values[i])}`).join(' L')}"/>`;
    return s;
  }
  function drawScales(kind) {
    const g = kind === 'flux' ? fluxFrame() : voltFrame(), [lo, hi] = lims(kind);
    return { x: g.x, y: g.y, lo, hi, area: { x0: L - 12, x1: W - R + 12, y0: TOP - 10, y1: H - B + 10 } };
  }

  // ---------------------------------------------------------------- tutorial marks
  // Given the scales g: a slope triangle under a straight piece from (t0, y0) to (t1, y1); a
  // short tangent through (t, y) with slope k (units of the graph); a dashed vertical line; a
  // dot; a label with a halo.
  const Tut = {
    triangle: (g, t0, y0, t1, y1) => `<path class="tri" d="M${g.x(t0)},${g.y(y0)} L${g.x(t1)},${g.y(y0)} L${g.x(t1)},${g.y(y1)}"/>`,
    tangent(g, t, y, k, half = 22) {
      const dx = g.x(1) - g.x(0), dy = g.y(k) - g.y(0), n = Math.hypot(dx, dy), ux = (dx / n) * half, uy = (dy / n) * half;
      return `<line class="tangent" x1="${f1(g.x(t) - ux)}" y1="${f1(g.y(y) - uy)}" x2="${f1(g.x(t) + ux)}" y2="${f1(g.y(y) + uy)}"/>`;
    },
    vline: (g, t, y0, y1) => `<line class="vline" x1="${g.x(t)}" y1="${g.y(y0)}" x2="${g.x(t)}" y2="${g.y(y1)}"/>`,
    dot: (g, t, y, cls = '') => `<circle class="tdot ${cls}" cx="${g.x(t)}" cy="${g.y(y)}" r="3.2"/>`,
    tag(g, t, y, text, place = 'above') {
      const dy = place === 'above' ? -7 : place === 'below' ? 14 : 4, anchor = place === 'right' ? 'start' : place === 'left' ? 'end' : 'middle';
      const dx = place === 'right' ? 6 : place === 'left' ? -6 : 0;
      return `<text class="tag" x="${f1(g.x(t) + dx)}" y="${f1(g.y(y) + dy)}" text-anchor="${anchor}">${text}</text>`;
    },
  };

  // ---------------------------------------------------------------- reading off a graph
  // timeAt(px): the time at a horizontal position of a graph (SVG units), to 0.1 s, or null well
  // outside the plot. cursor(kind, fg, t, o): the marks for the value of graph fg (kind 'flux' or
  // 'volt') at time t: a dashed guide line, a dot and a readout "t = 2.0 s, Φ = 3.0 mWb" above the
  // plot; with o.tangent (a flux graph), the tangent there across a good part of the plot (none at
  // a kink, where the slope jumps). guide(kind, t): only the guide line, for a graph below that
  // shares the time axis (the drawing).
  function timeAt(px) {
    if (px < L - 14 || px > W - R + 14) return null;
    return Math.round(Math.max(0, Math.min(T, ((px - L) / (W - L - R)) * T)) * 10) / 10;
  }
  const fix = (x) => { const v = Math.round(x * 10) / 10; return (v < 0 ? '−' : '') + Math.abs(v).toFixed(1); };
  function guide(kind, t) {
    const g = kind === 'flux' ? fluxFrame() : voltFrame(), [lo, hi] = lims(kind);
    return `<line class="hv-line" x1="${g.x(t)}" y1="${g.y(hi) - 4}" x2="${g.x(t)}" y2="${g.y(lo)}"/>`;
  }
  function cursor(kind, fg, t, o = {}) {
    const g = kind === 'flux' ? fluxFrame() : voltFrame(), [lo, hi] = lims(kind), tt = Math.min(t, T - 1e-9);
    const y = kind === 'flux' ? flux(fg, tt) : volt(fg, tt);
    let s = guide(kind, t);
    if (o.tangent && kind === 'flux') {
      // the slope on both sides: a kink has none
      const kl = t > 0 ? -volt(fg, t - 1e-7) : null, kr = t < T ? -volt(fg, Math.min(t + 1e-7, T - 1e-9)) : null;
      const k = kl === null ? kr : kr === null ? kl : Math.abs(kl - kr) < 1e-6 ? kr : null;
      if (k !== null) {
        // ±2.5 s around t, cut to the plot
        let a = Math.max(0, t - 2.5), b = Math.min(T, t + 2.5);
        if (Math.abs(k) > 1e-9) {
          const ta = t + (lo - y) / k, tb = t + (hi - y) / k;
          a = Math.max(a, Math.min(ta, tb)); b = Math.min(b, Math.max(ta, tb));
        }
        const at = (u) => `${g.x(u)},${g.y(y + k * (u - t))}`;
        s += `<path class="hv-tan" d="M${at(a)} L${at(b)}"/>`;
      }
    }
    s += `<circle class="hv-dot" cx="${g.x(t)}" cy="${g.y(y)}" r="4"/>`;
    const q = kind === 'flux' ? '<tspan class="it">Φ</tspan>' : `<tspan class="it">${say('V', 'U')}</tspan><tspan class="sub" dy="3">ind</tspan><tspan dy="-3">`;
    s += `<text class="hv-read" x="${W - 4}" y="15" text-anchor="end"><tspan class="it">t</tspan> = ${fix(t)} s, ${q} = ${fix(y)} ${kind === 'flux' ? 'mWb' : 'mV</tspan>'}</text>`;
    return `<g class="hover" pointer-events="none">${s}</g>`;
  }

  const api = { fluxGraph, voltGraph, optionGraph, drawGraph, drawBody, drawScales, timeAt, cursor, guide, SIZE: { W, H }, num, dec, range, Tut, V_MAX, PHI_MAX };
  root.Plot = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
