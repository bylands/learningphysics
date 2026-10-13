// The drawings of the app (on the circuit kit of circuit.js):
//   network(net, o)   capacitors in series and in parallel between the terminals A and B. A net is
//                     a capacitor { c: '1', v (µF, or null) }, a series { s: [nets] } or a parallel
//                     group { p: [nets] }; o.hl: a part of the net, shaded, with o.cap as its
//                     caption; o.reduce: [[part, name, value]], parts drawn as one capacitor
//                     (marked) with that name and value
//   rc(kind, o)       the circuit that charges (kind 'charge': battery, switch, R, C) or
//                     discharges a capacitor (kind 'discharge': the charged C, switch, R);
//                     o: { closed, R, C, U0 (labels), cur (the current arrow) }
//   graph(o)          a graph against time: o.curves [{ f(t) or pts [[t, y]], cls }], o.tEnd,
//                     o.yMax, o.name [letter, index] (e.g. ['U', 'C']), o.unit; with numbers:
//                     o.tStep, o.yStep, o.tUnit; without (o.bare): only the levels named;
//                     o.levels [{ y, label }] (dashed), o.marks [{ t, label }] (dashed),
//                     o.dots [[t, y]], o.lines [[[t, y], [t, y]]] (e.g. a tangent), o.label (aria)
//                     o.read { m, U0, tau, charge }: the graph follows the pointer (see readers)
//   Uq()              the letter of a voltage, as SVG: ΔV in English, U in German
//
// Reading a graph: one listener for the page shows, while the pointer is over a graph with
// o.read, the coordinates of the nearest point of the curve with lines to the axes (m 'xy'), or the tangent to the
// curve U₀·e^(−t/τ) or U₀·(1 − e^(−t/τ)) at that time (m 'tan'), drawn to the level it heads
// for, which it reaches one τ later.
(function (root) {
  'use strict';

  const { Sketch } = root.Circuit || require('./circuit.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const num = (x) => String(Math.round(x * 100) / 100).replace('-', '−');
  // C₁ = 2 µF; the total (name '') C = 2 µF
  const label = (c) => `$C${!c.c ? '' : c.c.length > 1 ? `_{${c.c}}` : `_${c.c}`}$${c.v != null ? ` = ${num(c.v)} µF` : ''}`;

  // ---------------------------------------------------------------- networks
  const LEAF = { w: 1.9, h: 1.15, a: 0.8 }, GAP = 0.25, LEAD = 0.4;
  function size(n, red) {
    if (red.has(n)) return LEAF;
    if (n.c) return LEAF;
    const parts = (n.s || n.p).map((x) => size(x, red));
    if (n.s) {
      const a = Math.max(...parts.map((q) => q.a));
      return { w: parts.reduce((s, q) => s + q.w, 0), a, h: a + Math.max(...parts.map((q) => q.h - q.a)) };
    }
    return { w: Math.max(...parts.map((q) => q.w)) + 2 * LEAD, a: parts[0].a, h: parts.reduce((s, q) => s + q.h, 0) + GAP * (parts.length - 1) };
  }

  // Draws net n with its top left corner at (x, top) (top: down from 0; the sketch has y up).
  function draw(sk, n, x, top, red, boxes) {
    const z = size(n, red), y = -(top + z.a);
    boxes.set(n, [x, top, z.w, z.h]);
    if (red.has(n) || n.c) {
      const r = red.get(n);
      sk.cap([x, y], [x + z.w, y], { l: r ? { t: label({ c: r[0], v: r[1] }), cls: 'new' } : label(n), ls: 'above', hl: !!r });
      return;
    }
    if (n.s) {
      let cx = x;
      n.s.forEach((m) => { const q = size(m, red); draw(sk, m, cx, top + z.a - q.a, red, boxes); cx += q.w; });
      return;
    }
    let row = top, first = null, last = null;
    n.p.forEach((m) => {
      const q = size(m, red), ym = -(row + q.a);
      draw(sk, m, x + LEAD, row, red, boxes);
      sk.wire([x, ym], [x + LEAD, ym]);
      sk.wire([x + LEAD + q.w, ym], [x + z.w, ym]);
      if (first == null) first = ym;
      last = ym;
      row += q.h + GAP;
    });
    sk.wire([x, first], [x, last]);
    sk.wire([x + z.w, first], [x + z.w, last]);
  }

  function network(net, o = {}) {
    const sk = new Sketch(), red = new Map((o.reduce || []).map(([part, c, v]) => [part, [c, v]])), boxes = new Map();
    sk.autoDots = true;
    const z = size(net, red), y = -z.a;
    draw(sk, net, 0, 0, red, boxes);
    // the terminals A and B
    sk.wire([-0.6, y], [0, y]);
    sk.wire([z.w, y], [z.w + 0.6, y]);
    for (const [p, t, side] of [[[-0.6, y], 'A', 'left'], [[z.w + 0.6, y], 'B', 'right']]) {
      const [px, py] = sk.P(p);
      sk.els.push(`<circle class="contact" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.2"/>`);
      sk.label([p[0] + (side === 'left' ? -0.12 : 0.12), p[1]], t, side);
    }
    if (o.hl && boxes.has(o.hl)) {
      const [bx, bt, bw, bh] = boxes.get(o.hl);
      sk.zone([bx - 0.12, -(bt - 0.05)], [bx + bw + 0.12, -(bt + bh + 0.05)], 'strong', o.cap ? [o.cap] : []);
    }
    return `<div class="fig">${sk.toSVG()}</div>`;
  }

  // ---------------------------------------------------------------- RC circuits
  function rc(kind, o = {}) {
    const sk = new Sketch();
    sk.autoDots = false;
    const R = o.R || '$R$', C = o.C || '$C$', U0 = o.U0 || L('$ΔV_0$', '$U_0$'); // labels
    if (kind === 'charge') {
      sk.wire([0, 0], [0, 0.45]).bat([0, 0.45], [0, 1.55], { l: U0, ls: 'left' }).wire([0, 1.55], [0, 2.2], [0.5, 2.2]);
      sk.sw([0.5, 2.2], [1.7, 2.2], { closed: o.closed, l: '$S$' });
      sk.wire([1.7, 2.2], [2.1, 2.2]).res([2.1, 2.2], [3.7, 2.2], { l: R }).wire([3.7, 2.2], [4.4, 2.2], [4.4, 1.3]);
      sk.cap([4.4, 1.3], [4.4, 0.9], { l: C, ls: 'right' }).wire([4.4, 0.9], [4.4, 0], [0, 0]);
    } else {
      sk.wire([0, 0], [0, 0.9]).cap([0, 1.3], [0, 0.9], { l: C, ls: 'left', pm: true }).wire([0, 1.3], [0, 2.2], [0.5, 2.2]);
      sk.sw([0.5, 2.2], [1.7, 2.2], { closed: o.closed, l: '$S$' });
      sk.wire([1.7, 2.2], [3, 2.2], [3, 1.9]).res([3, 1.9], [3, 0.3], { l: R, ls: 'right' }).wire([3, 0.3], [3, 0], [0, 0]);
    }
    if (o.cur) sk.cur(kind === 'charge' ? [2.1, 2.2] : [1.7, 2.2], kind === 'charge' ? [3.7, 2.2] : [3, 2.2], '$I$', 'below', kind === 'charge' ? 0.5 : 0.6);
    return `<div class="fig">${sk.toSVG()}</div>`;
  }

  // ---------------------------------------------------------------- graphs
  const W = 340, H = 210, ML = 50, MR = 26, MT = 26, MB = 34;
  const f1 = (x) => Math.round(x * 10) / 10;
  function graph(o) {
    const T = o.tEnd, Y = o.yMax, PW = W - ML - MR, PH = H - MT - MB;
    const x = (t) => f1(ML + (t / T) * PW), y = (v) => f1(MT + PH - (Math.max(-0.05 * Y, Math.min(1.08 * Y, v)) / Y) * PH);
    let s = '';
    if (!o.bare) {
      // half steps light, whole steps darker
      for (let k = 1; k * o.tStep / 2 <= T + 1e-9; k++) s += `<line class="grid${k % 2 ? '' : ' major'}" x1="${x(k * o.tStep / 2)}" y1="${y(0)}" x2="${x(k * o.tStep / 2)}" y2="${MT - 4}"/>`;
      for (let k = 1; k * o.yStep / 2 <= Y + 1e-9; k++) s += `<line class="grid${k % 2 ? '' : ' major'}" x1="${x(0)}" y1="${y(k * o.yStep / 2)}" x2="${x(T)}" y2="${y(k * o.yStep / 2)}"/>`;
    }
    for (const l of o.levels || []) s += `<line class="lvl" x1="${x(0)}" y1="${y(l.y)}" x2="${x(T)}" y2="${y(l.y)}"/>`;
    for (const m of o.marks || []) s += `<line class="lvl" x1="${x(m.t)}" y1="${y(0)}" x2="${x(m.t)}" y2="${MT - 2}"/>`;
    s += `<path class="ax" d="M${x(0)} ${y(0)} H${x(T) + 12} M${x(0)} ${y(0)} V${MT - 12}"/>`;
    s += `<path class="axhead" d="M${x(T) + 14} ${y(0)} l-8 -4 v8 z M${x(0)} ${MT - 14} l-4 8 h8 z"/>`;
    if (!o.bare) {
      for (let k = 1; k * o.tStep <= T + 1e-9; k++) s += `<text class="tick" x="${x(k * o.tStep)}" y="${y(0) + 16}" text-anchor="middle">${num(k * o.tStep)}</text>`;
      for (let k = 1; k * o.yStep <= Y + 1e-9; k++) s += `<text class="tick" x="${x(0) - 6}" y="${y(k * o.yStep) + 4}" text-anchor="end">${num(k * o.yStep)}</text>`;
    }
    s += `<text class="tick" x="${x(0) - 6}" y="${y(0) + 4}" text-anchor="end">0</text>`;
    for (const l of o.levels || []) if (l.label) s += `<text class="lvlt" x="${x(0) - 6}" y="${y(l.y) + 5}" text-anchor="end">${l.label}</text>`;
    for (const m of o.marks || []) if (m.label) s += `<text class="lvlt" x="${x(m.t)}" y="${y(0) + 17}" text-anchor="middle">${m.label}</text>`;
    const [q, i] = o.name;
    s += `<text class="axl" x="${x(0) + 8}" y="${MT - 8}">${q === 'U' ? Uq() : `<tspan class="it">${q}</tspan>`}${i ? `<tspan class="sub" dy="4">${i}</tspan>` : ''}${o.unit ? `<tspan dy="${i ? -4 : 0}"> in ${o.unit}</tspan>` : ''}</text>`;
    s += `<text class="axl" x="${W - 4}" y="${H - 6}" text-anchor="end"><tspan class="it">t</tspan>${o.tUnit ? ` in ${o.tUnit}` : ''}</text>`;
    for (const c of o.curves) {
      const pts = c.pts || Array.from({ length: 121 }, (_, k) => { const t = (k / 120) * T; return [t, c.f(t)]; });
      s += `<path class="curve${c.cls ? ` ${c.cls}` : ''}" d="M${pts.map(([t, v]) => `${x(t)},${y(v)}`).join(' L')}"/>`;
    }
    for (const [[t0, v0], [t1, v1]] of o.lines || []) s += `<line class="tan" x1="${x(t0)}" y1="${y(v0)}" x2="${x(t1)}" y2="${y(v1)}"/>`;
    for (const [t, v] of o.dots || []) s += `<circle class="tdot" cx="${x(t)}" cy="${y(v)}" r="4"/>`;
    const read = o.read ? ` data-read="${JSON.stringify({ ...o.read, T, Y, ts: o.tStep, tu: o.tUnit || '', i: i || '' }).replace(/"/g, '&quot;')}"` : '';
    if (o.read) s += '<g class="rd"></g>';
    return `<svg class="tgraph${o.bare ? ' bare' : ''}" viewBox="0 0 ${W} ${H}" role="img"${read} aria-label="${o.label || L('A graph against time', 'Ein Graph gegen die Zeit')}">${s}</svg>`;
  }
  const Uq = () => L('Δ<tspan class="it">V</tspan>', '<tspan class="it">U</tspan>');

  // ---------------------------------------------------------------- reading a graph
  function readAt(svg, evt) {
    const d = JSON.parse(svg.getAttribute('data-read')), g = svg.querySelector('.rd'), ctm = svg.getScreenCTM();
    if (!g || !ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const { x: sx, y: sy } = pt.matrixTransform(ctm.inverse());
    const PW = W - ML - MR, PH = H - MT - MB, t = ((sx - ML) / PW) * d.T, v = ((MT + PH - sy) / PH) * d.Y;
    const x = (tt) => f1(ML + (tt / d.T) * PW), y = (vv) => f1(MT + PH - (vv / d.Y) * PH);
    if (t < 0 || t > d.T || v < 0 || v > 1.08 * d.Y) { g.innerHTML = ''; return; }
    const f = (tt) => (d.charge ? d.U0 * (1 - Math.exp(-tt / d.tau)) : d.U0 * Math.exp(-tt / d.tau));
    if (d.m === 'xy') {
      // the point of the curve nearest the pointer, on the grid of the readout (a tenth of a step)
      const st = d.ts / 10, px = ML + (t / d.T) * PW, py = MT + PH - (v / d.Y) * PH;
      let tr = 0, best = Infinity;
      for (let k = 0; k * st <= d.T + 1e-9; k++) {
        const dx = x(k * st) - px, dy = y(f(k * st)) - py, dd = dx * dx + dy * dy;
        if (dd < best) { best = dd; tr = k * st; }
      }
      const vr = Math.round(f(tr) * 10) / 10;
      g.innerHTML = `<line class="rdl" x1="${x(tr)}" y1="${y(0)}" x2="${x(tr)}" y2="${y(f(tr))}"/><line class="rdl" x1="${x(0)}" y1="${y(f(tr))}" x2="${x(tr)}" y2="${y(f(tr))}"/>` +
        `<circle class="rdp" cx="${x(tr)}" cy="${y(f(tr))}" r="3.5"/>` +
        `<text class="rdt" x="${W - MR}" y="${MT + 6}" text-anchor="end"><tspan class="it">t</tspan> = ${num(tr)} ${d.tu}, ${Uq()}<tspan class="sub" dy="4">${d.i}</tspan><tspan dy="-4"> = ${num(vr)} V</tspan></text>`;
      return;
    }
    // the tangent at t: it reaches the level the curve heads for (U₀ or 0) at t + τ
    const y0 = f(t), goal = d.charge ? d.U0 : 0, slope = (goal - y0) / d.tau, ta = Math.max(0, t - 0.4 * d.tau), tb = Math.min(d.T, t + 1.3 * d.tau);
    const at = (tt) => (tt <= t + d.tau ? y0 + slope * (tt - t) : goal);
    g.innerHTML = `<polyline class="rdl tanl" points="${x(ta)},${y(at(ta))} ${x(Math.min(tb, t + d.tau))},${y(at(Math.min(tb, t + d.tau)))}"/>` +
      (t + d.tau <= d.T ? `<circle class="rdp" cx="${x(t + d.tau)}" cy="${y(goal)}" r="3.5"/>` : '') +
      `<circle class="rdp" cx="${x(t)}" cy="${y(y0)}" r="4"/>`;
  }
  // one listener for the page: the graph under the pointer, and the one shown before cleared
  if (typeof document !== 'undefined' && !root.__capReaders) {
    root.__capReaders = true;
    let last = null;
    const move = (evt) => {
      const svg = evt.target && evt.target.closest ? evt.target.closest('svg[data-read]') : null;
      if (last && last !== svg) { const g = last.querySelector('.rd'); if (g) g.innerHTML = ''; }
      last = svg;
      if (svg) readAt(svg, evt);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerdown', move);
  }

  const api = { network, rc, graph, label, Uq };
  root.Figures = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
