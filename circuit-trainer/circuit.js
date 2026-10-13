// Minimal SVG drawing kit for circuit diagrams, modelled on circuitikz.
// Coordinates are in "units" with y pointing up (like TikZ); 1 unit = S px.
(function (root) {
  'use strict';

  const S = 52;
  const FONT = 14;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Label markup: text between $...$ is set in italics, "_x" and "_{xy}" become subscripts.
  function tokens(label) {
    const out = [];
    String(label).split('$').forEach((part, i) => {
      if (!part) return;
      if (i % 2 === 0) { out.push({ t: part }); return; }
      part = part.replace(/\\text\{([^}]*)\}/g, '$1');
      let k = 0;
      while (k < part.length) {
        if (part[k] === '_') {
          let sub;
          if (part[k + 1] === '{') {
            const end = part.indexOf('}', k);
            sub = part.slice(k + 2, end);
            k = end + 1;
          } else {
            sub = part[k + 1];
            k += 2;
          }
          out.push({ t: sub, sub: true });
        } else {
          let j = k;
          while (j < part.length && part[j] !== '_') j++;
          out.push({ t: part.slice(k, j), it: true });
          k = j;
        }
      }
    });
    return out;
  }

  function richText(label) {
    let shifted = false;
    return tokens(label).map((tk) => {
      let attrs = '';
      if (tk.sub && !shifted) { attrs = ' dy="0.3em"'; shifted = true; }
      else if (!tk.sub && shifted) { attrs = ' dy="-0.3em"'; shifted = false; }
      if (tk.sub) attrs += ' font-size="0.72em"';
      if (tk.it) attrs += ' font-style="italic"';
      return `<tspan${attrs}>${esc(tk.t)}</tspan>`;
    }).join('');
  }

  function textWidth(label) {
    return tokens(label).reduce((w, tk) => w + tk.t.length * FONT * (tk.sub ? 0.42 : 0.58), 0);
  }

  const SIDES = { right: [1, 0], left: [-1, 0], above: [0, 1], below: [0, -1] };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = (a) => Math.hypot(a[0], a[1]);
  const unit = (a) => mul(a, 1 / len(a));
  const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
  // ' ask' for the label of the quantity a question asks for, else ''
  const asked = (label) => (label && typeof label === 'object' && / ask\b/.test(' ' + label.cls) ? ' ask' : '');

  function sideVec(side) {
    if (typeof side === 'string') return SIDES[side];
    return unit(side);
  }

  // Unit normal of direction d pointing towards the requested side.
  function normalTowards(d, side) {
    const s = sideVec(side);
    const dot = s[0] * d[0] + s[1] * d[1];
    const n = sub(s, mul(d, dot));
    return len(n) < 1e-6 ? [-d[1], d[0]] : unit(n);
  }

  class Sketch {
    constructor() {
      this.els = [];
      this.box = [Infinity, Infinity, -Infinity, -Infinity];
      this.segs = [];
      this.autoDots = false;
    }

    _grow(x, y) {
      const b = this.box;
      b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
    }

    // unit coordinates -> px (y flipped)
    P(p) {
      const x = p[0] * S, y = -p[1] * S;
      this._grow(x, y);
      return [x, y];
    }

    _path(pts, cls) {
      const d = pts.map((p, i) => { const [x, y] = this.P(p); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('');
      this.els.push(`<path class="${cls}" d="${d}"/>`);
    }

    // Arrow head with its tip at p (units), pointing along d (units).
    _head(p, d, cls) {
      const [x, y] = this.P(p);
      const u = unit([d[0], -d[1]]);
      const n = [-u[1], u[0]];
      const b = [x - u[0] * 9, y - u[1] * 9];
      const pts = [[x, y], [b[0] + n[0] * 4, b[1] + n[1] * 4], [b[0] - n[0] * 4, b[1] - n[1] * 4]];
      this.els.push(`<polygon class="${cls}" points="${pts.map((q) => q.map((c) => c.toFixed(1)).join(',')).join(' ')}"/>`);
    }

    // Text at point p (units), pushed away from p in direction n. A label is a string, or
    // { t: string, cls: extra classes } to highlight it; class "new" gets a marker background
    // (<g class="marked">, fitted to the rendered text by fitText), class "ask" (the quantity a
    // question asks for) colours the arrow of a current or voltage too.
    _text(p, n, label, cls) {
      if (label == null) return;
      let mark = false;
      if (typeof label === 'object') { cls += ' ' + label.cls; mark = / new\b/.test(' ' + label.cls); label = label.t; }
      const [x, y] = this.P(p);
      const w = textWidth(label) * (mark ? 1.06 : 1); // "new" text is bold
      let anchor = 'middle', dy = '0.35em', x0 = x - w / 2, y0 = y - FONT / 2, base = y + 0.35 * FONT;
      if (Math.abs(n[0]) > 0.5) {
        anchor = n[0] > 0 ? 'start' : 'end';
        x0 = n[0] > 0 ? x : x - w;
      } else if (n[1] > 0) {
        dy = '0em'; y0 = y - FONT; base = y;
      } else {
        dy = '0.8em'; y0 = y; base = y + 0.8 * FONT;
      }
      this._grow(x0, y0); this._grow(x0 + w, y0 + FONT * 1.2);
      const text = `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" dy="${dy}" text-anchor="${anchor}">${richText(label)}</text>`;
      this.els.push(mark ? `<g class="marked"><rect class="mark" x="${(x0 - 3).toFixed(1)}" y="${(base - 0.95 * FONT).toFixed(1)}" width="${(w + 6).toFixed(1)}" height="${(1.4 * FONT).toFixed(1)}" rx="3"/>${text}</g>` : text);
    }

    label(p, text, side = 'above', cls = 'lbl') {
      this._text(p, sideVec(side), text, cls);
      return this;
    }

    wire(...pts) {
      if (pts.every((p) => len(sub(p, pts[0])) < 1e-9)) return this; // zero length: would count as a junction
      for (let i = 1; i < pts.length; i++) this.segs.push([pts[i - 1], pts[i]]);
      this._path(pts, 'w');
      return this;
    }

    // Junction dots wherever three or more wire ends meet (a point inside another wire counts twice).
    _junctions() {
      const eq = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
      const inside = (p, [a, b]) => {
        const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
        const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1]);
        return Math.abs(cross) < 1e-6 && dot > 1e-6 && dot < len(sub(b, a)) ** 2 - 1e-6;
      };
      const done = [];
      for (const p of this.segs.flat()) {
        if (done.some((q) => eq(p, q))) continue;
        done.push(p);
        const degree = this.segs.reduce((n, seg) => n + seg.filter((e) => eq(e, p)).length + (inside(p, seg) ? 2 : 0), 0);
        if (degree >= 3) this.dot(p);
      }
    }

    dot(p) {
      const [x, y] = this.P(p);
      this.els.push(`<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`);
      return this;
    }

    // Two-terminal element from p to q; draws leads and returns geometry for the body.
    _two(p, q, body) {
      const L = len(sub(q, p)), d = unit(sub(q, p));
      const a = add(p, mul(d, (L - body) / 2)), b = add(p, mul(d, (L + body) / 2));
      this.wire(p, a); this.wire(b, q);
      return { L, d, a, b, m: lerp(p, q, 0.5) };
    }

    _defaultSide(d) { return Math.abs(d[0]) >= Math.abs(d[1]) ? 'above' : 'right'; }

    // Resistor (European box). o.l label, o.ls label side, o.i current label, o.is side, o.it position (0..1),
    // o.hl highlights the box.
    res(p, q, o = {}) {
      const g = this._two(p, q, Math.min(0.9, len(sub(q, p)) * 0.5));
      const [x, y] = this.P(g.m);
      this.P(g.a); this.P(g.b);
      const ang = Math.atan2(-g.d[1], g.d[0]) * 180 / Math.PI;
      const w = len(sub(g.b, g.a)) * S, h = 0.3 * S;
      this.els.push(`<rect class="c${o.hl ? ' hl' : ''}" x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(2)})"/>`);
      const n = normalTowards(g.d, o.ls || this._defaultSide(g.d));
      this._text(add(g.m, mul(n, 0.3)), n, o.l, 'lbl');
      if (o.i != null) this.cur(p, q, o.i, o.is || o.ls || this._defaultSide(g.d), o.it || 0.84);
      return this;
    }

    // Battery from p (−) to q (+): long plate on the + side.
    bat(p, q, o = {}) {
      const g = this._two(p, q, 0.16);
      const n = [-g.d[1], g.d[0]];
      this._path([add(g.b, mul(n, 0.32)), sub(g.b, mul(n, 0.32))], 'w');
      this._path([add(g.a, mul(n, 0.16)), sub(g.a, mul(n, 0.16))], 'w thick');
      const ns = normalTowards(g.d, o.ls || 'left');
      this._text(add(add(g.b, mul(g.d, 0.14)), mul(ns, -0.42)), mul(ns, -1), '+', 'lbl small');
      this._text(add(g.m, mul(ns, 0.45)), ns, o.l, 'lbl');
      return this;
    }

    lamp(p, q, o = {}) {
      const r = 0.28;
      const g = this._two(p, q, 2 * r);
      const [x, y] = this.P(g.m);
      this.P(add(g.m, [r, r])); this.P(sub(g.m, [r, r]));
      const k = r * S * Math.SQRT1_2;
      this.els.push(`<circle class="c" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * S).toFixed(1)}"/>`);
      this.els.push(`<path class="w" d="M${x - k} ${y - k}L${x + k} ${y + k}M${x - k} ${y + k}L${x + k} ${y - k}"/>`);
      const n = normalTowards(g.d, o.ls || this._defaultSide(g.d));
      this._text(add(g.m, mul(n, r + 0.12)), n, o.l, 'lbl');
      return this;
    }

    // Meter from p to q: a circle with its letter (A ammeter, V voltmeter); o.l a label (the
    // reading) on side o.ls, o.hl highlights the circle.
    meter(p, q, letter, o = {}) {
      const r = 0.28;
      const g = this._two(p, q, 2 * r);
      const [x, y] = this.P(g.m);
      this.P(add(g.m, [r, r])); this.P(sub(g.m, [r, r]));
      this.els.push(`<circle class="c${o.hl ? ' hl' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * S).toFixed(1)}"/>`);
      this.els.push(`<text class="lbl meter-l" x="${x.toFixed(1)}" y="${y.toFixed(1)}" dy="0.35em" text-anchor="middle">${esc(letter)}</text>`);
      const n = normalTowards(g.d, o.ls || this._defaultSide(g.d));
      this._text(add(g.m, mul(n, r + 0.12)), n, o.l, 'lbl');
      return this;
    }

    // A spot where a meter can be placed (circuit-trainer's "where does the meter go?"): a dashed
    // circle at c (units), with dashed leads (a path of points) for a meter across a part; id
    // (data-slot) and label (aria-label) for the page, which places the meter on a click.
    slot(c, id, label, lead = null) {
      const r = 0.28, [x, y] = this.P(c);
      this.P(add(c, [r, r])); this.P(sub(c, [r, r]));
      const path = lead ? `<path class="slot-lead" d="${lead.map((p, i) => { const [px, py] = this.P(p); return `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`; }).join('')}"/>` : '';
      this.els.push(`<g class="slot" data-slot="${esc(id)}" tabindex="0" role="button" aria-label="${esc(label)}">${path}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * S).toFixed(1)}"/></g>`);
      return this;
    }

    // Current arrow (blue) on the segment p→q, centred at fraction t.
    cur(p, q, label, side, t = 0.5) {
      if (label == null) return this;
      const d = unit(sub(q, p));
      const c = lerp(p, q, t);
      const a = sub(c, mul(d, 0.22)), b = add(c, mul(d, 0.22));
      const ask = asked(label);
      this._path([a, b], 'cur' + ask);
      this._head(b, d, 'cur-h' + ask);
      const n = normalTowards(d, side || this._defaultSide(d));
      this._text(add(c, mul(n, 0.22)), n, label, 'cur-t');
      return this;
    }

    // Voltage arrow (red, curved) beside the element p→q, pointing from p to q.
    vol(p, q, label, side, span = [0.24, 0.76]) {
      if (label == null) return this;
      const d = unit(sub(q, p));
      const n = normalTowards(d, side || this._defaultSide(d));
      const a = add(lerp(p, q, span[0]), mul(n, 0.42));
      const b = add(lerp(p, q, span[1]), mul(n, 0.42));
      const arcLen = len(sub(b, a));
      const c = add(lerp(a, b, 0.5), mul(n, Math.min(0.6, 0.35 * arcLen)));
      const [ax, ay] = this.P(a), [bx, by] = this.P(b), [cx, cy] = this.P(c);
      const ask = asked(label);
      this.els.push(`<path class="vol${ask}" d="M${ax.toFixed(1)} ${ay.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}"/>`);
      this._head(b, sub(b, c), 'vol-h' + ask);
      const mid = add(mul(add(a, b), 0.25), mul(c, 0.5));
      this._text(add(mid, mul(n, 0.12)), n, label, 'vol-t');
      return this;
    }

    // Shaded rectangle behind everything drawn, from corner a to corner b (units), with a
    // caption above its left end: a list of labels, separated by commas (<g class="caption">,
    // laid out again with the rendered text widths by fitText).
    zone(a, b, cls, caption = []) {
      const [x0, y0] = this.P([Math.min(a[0], b[0]), Math.max(a[1], b[1])]);
      const [x1, y1] = this.P([Math.max(a[0], b[0]), Math.min(a[1], b[1])]);
      this.els.unshift(`<rect class="zone ${cls}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" rx="8"/>`);
      const parts = caption.flatMap((l, i) => (i ? [',\u00a0', l] : [l])); // (a plain trailing space is dropped)
      const width = (l) => (textWidth(typeof l === 'object' ? l.t : l) + (typeof l === 'object' && / new\b/.test(' ' + l.cls) ? 8 : 0)) / S;
      const left = Math.min(a[0], b[0]) + 0.1, y = Math.max(a[1], b[1]) + 0.24, start = this.els.length;
      let x = left;
      for (const l of parts) {
        this._text([x + (typeof l === 'object' && / new\b/.test(' ' + l.cls) ? 4 / S : 0), y], [1, 0], l, 'cap');
        x += width(l);
      }
      this.els.push(`<g class="caption" data-x="${(left * S).toFixed(1)}">${this.els.splice(start).join('')}</g>`);
      return this;
    }

    // box: the drawing area in px (default: everything drawn).
    toSVG(cls = 'circuit', box = null) {
      if (this.autoDots) this._junctions();
      const pad = 10;
      const [x0, y0, x1, y1] = box || this.box;
      const w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
      // Shown 1.3× larger than drawn; on narrow screens it shrinks to fit, and fit.js keeps the
      // labels legible (fitText then lays out the captions and markers again).
      const display = (w * 1.3).toFixed(0);
      return `<svg class="${cls}" viewBox="${(x0 - pad).toFixed(1)} ${(y0 - pad).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" width="${display}" style="width:${display}px;max-width:100%;height:auto" role="img">${this.els.join('')}</svg>`;
    }
  }

  // In the browser: lays out captions and fits the markers to the rendered text, since the
  // drawing can only estimate text widths.
  function fitText(svg) {
    const textOf = (el) => (el.tagName === 'text' ? el : el.querySelector('text'));
    for (const g of svg.querySelectorAll('g.caption')) {
      const parts = [...g.children].map((el) => ({ el, text: textOf(el), pad: el.classList.contains('marked') ? 4 : 0 }));
      const widths = parts.map((p) => p.text.getComputedTextLength() + 2 * p.pad);
      let x = Number(g.dataset.x);
      parts.forEach((p, i) => { p.text.setAttribute('x', (x + p.pad).toFixed(1)); x += widths[i]; });
    }
    for (const g of svg.querySelectorAll('g.marked')) {
      const b = g.querySelector('text').getBBox(), r = g.querySelector('rect');
      [['x', b.x - 3], ['y', b.y - 1], ['width', b.width + 6], ['height', b.height + 2]].forEach(([k, v]) => r.setAttribute(k, v.toFixed(1)));
    }
  }

  // labels enlarged on a narrow screen (fit.js): captions and markers follow
  if (root.Fit) root.Fit.after.push(fitText);
  const Circuit = { Sketch, richText, esc, textWidth, fitText, S };
  root.Circuit = Circuit;
  if (typeof module !== 'undefined') module.exports = Circuit;
})(typeof window !== 'undefined' ? window : globalThis);
