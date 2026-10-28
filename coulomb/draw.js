// Drawings (as in Torque, with point charges): a picture in world coordinates (y up) drawn at a scale of px per cm. It collects
// SVG parts and its extent, and crops itself to them. Labels have a halo of the background, so
// that lines never cut them; arrows have slim, notched heads as in Force Systems.
//   const P = new Pic(scale, label)
//   P.px([x, y])                     the point in px
//   P.grid(x0, y0, x1, y1, step)     a light grid (squares of step cm)
//   P.line(a, b, cls), P.poly(pts, cls), P.circle(c, r, cls), P.dot(a, cls)
//   P.text(a, html, cls, anchor, [dx, dy])  (dx, dy in px)
//   P.arrow(a, dir, len, cls, label, [dx, dy])  from a along the unit vector dir (y up), len px
//   P.arc(c, rPx, a0, a1, label)      an angle from direction a0 to a1 (degrees, counter-clockwise)
//   P.turn(c, rPx, sense, cls)       a curved arrow around c: ↺ (sense 1) or ↻ (sense −1)
//   P.dim(a, b, label, off)          a dimension line, off px to the left of a → b
//   P.pivot(c), P.support(c), P.mass(a, len, label), P.com(c, label)
//   P.charge(c, sign, label, cls, off)  a point charge: ⊕ (sign 1), ⊖ (−1) or ? (0), labelled; with
//                                    cls 'hl' in a ring (the charge the question is about)
//   Draw.OUT                         px from the middle of a charge in a ring to where the forces on it
//                                    start, clear of the ring (but the net force, from the middle)
//   P.svg()                          the picture, cropped, in a <div class="fig">
(function (root) {
  'use strict';

  const f = (x) => (Math.round(x * 10) / 10).toString();
  const HEAD = 11, NOTCH = 8, BARB = 4.2, OUT = 24; // the ring: radius 16

  class Pic {
    constructor(scale, label) {
      this.s = scale; this.label = label || '';
      this.parts = []; this.top = [];
      this.b = [Infinity, Infinity, -Infinity, -Infinity];
    }
    px(p) { return [p[0] * this.s, -p[1] * this.s]; }
    see(x, y) { const b = this.b; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
    seeText(x, y, html, anchor) {
      const w = html.replace(/<[^>]*>/g, '').replace(/​/g, '').length * 7.4;
      const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      this.see(x0 - 2, y - 14); this.see(x0 + w + 2, y + 5);
    }
    add(svg, top) { (top ? this.top : this.parts).push(svg); return this; }

    grid(x0, y0, x1, y1, step = 1) {
      let d = '';
      for (let x = x0; x <= x1 + 1e-9; x += step) { const [a, b] = [this.px([x, y0]), this.px([x, y1])]; d += `M${f(a[0])} ${f(a[1])}V${f(b[1])}`; }
      for (let y = y0; y <= y1 + 1e-9; y += step) { const [a, b] = [this.px([x0, y]), this.px([x1, y])]; d += `M${f(a[0])} ${f(a[1])}H${f(b[0])}`; }
      const [a, b] = [this.px([x0, y0]), this.px([x1, y1])];
      this.see(a[0], a[1]); this.see(b[0], b[1]);
      return this.add(`<path class="grid" d="${d}"/>`);
    }
    line(a, b, cls = 'w', top) {
      const [p, q] = [this.px(a), this.px(b)];
      this.see(...p); this.see(...q);
      return this.add(`<line class="${cls}" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}"/>`, top);
    }
    poly(pts, cls = 'body', top) {
      const ps = pts.map((p) => this.px(p));
      ps.forEach((p) => this.see(...p));
      return this.add(`<polygon class="${cls}" points="${ps.map((p) => p.map(f).join(',')).join(' ')}"/>`, top);
    }
    path(pts, cls = 'wire', top) {
      const ps = pts.map((p) => this.px(p));
      ps.forEach((p) => this.see(...p));
      return this.add(`<polyline class="${cls}" points="${ps.map((p) => p.map(f).join(',')).join(' ')}"/>`, top);
    }
    rect(a, b, cls = 'body', rx = 0) {
      const [p, q] = [this.px(a), this.px(b)], x = Math.min(p[0], q[0]), y = Math.min(p[1], q[1]);
      this.see(p[0], p[1]); this.see(q[0], q[1]);
      return this.add(`<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(Math.abs(q[0] - p[0]))}" height="${f(Math.abs(q[1] - p[1]))}" rx="${rx}"/>`);
    }
    circle(c, r, cls = 'wire', top) {
      const p = this.px(c), R = r * this.s;
      this.see(p[0] - R, p[1] - R); this.see(p[0] + R, p[1] + R);
      return this.add(`<circle class="${cls}" cx="${f(p[0])}" cy="${f(p[1])}" r="${f(R)}"/>`, top);
    }
    dot(a, cls = 'dot', r = 2.6) {
      const p = this.px(a);
      this.see(p[0] - r, p[1] - r); this.see(p[0] + r, p[1] + r);
      return this.add(`<circle class="${cls}" cx="${f(p[0])}" cy="${f(p[1])}" r="${r}"/>`, true);
    }
    text(a, html, cls = 'lbl', anchor = 'middle', off = [0, 0]) {
      const p = this.px(a), x = p[0] + off[0], y = p[1] + off[1] + 5;
      this.seeText(x, y, html, anchor);
      return this.add(`<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${html}</text>`, true);
    }
    // An arrow from a (world) along dir (unit vector, y up), len px long, with a label at its tip.
    arrow(a, dir, len, cls = 'force', label = '', off = [8, 0]) {
      const p = this.px(a), ux = dir[0], uy = -dir[1];
      const tip = [p[0] + len * ux, p[1] + len * uy];
      const back = [tip[0] - HEAD * ux, tip[1] - HEAD * uy], notch = [tip[0] - NOTCH * ux, tip[1] - NOTCH * uy];
      const head = [tip, [back[0] - BARB * uy, back[1] + BARB * ux], notch, [back[0] + BARB * uy, back[1] - BARB * ux]];
      this.see(...p); this.see(...tip);
      let lbl = '';
      if (label) {
        const anchor = off[0] > 3 ? 'start' : off[0] < -3 ? 'end' : 'middle', x = tip[0] + off[0], y = tip[1] + off[1] + 5;
        this.seeText(x, y, label, anchor);
        lbl = `<text class="flbl" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${label}</text>`;
      }
      return this.add(`<g class="${cls}"><line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(notch[0])}" y2="${f(notch[1])}"/>` +
        `<polygon points="${head.map((q) => q.map(f).join(',')).join(' ')}"/><circle cx="${f(p[0])}" cy="${f(p[1])}" r="2"/>${lbl}</g>`, true);
    }
    // An angle at c (radius in px) from direction a0 to a1, degrees counter-clockwise, with its label.
    arc(c, r, a0, a1, label, dist = 13) {
      const p = this.px(c), pt = (a, rr) => [p[0] + rr * Math.cos((a * Math.PI) / 180), p[1] - rr * Math.sin((a * Math.PI) / 180)];
      const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r), large = Math.abs(a1 - a0) > 180 ? 1 : 0;
      this.see(x0, y0); this.see(x1, y1);
      this.add(`<path class="w thin" d="M${f(x0)} ${f(y0)} A${f(r)} ${f(r)} 0 ${large} ${a1 > a0 ? 0 : 1} ${f(x1)} ${f(y1)}"/>`, true);
      if (label) { const [lx, ly] = pt((a0 + a1) / 2, r + dist); this.seeText(lx, ly + 5, label, 'middle'); this.add(`<text class="lbl small" x="${f(lx)}" y="${f(ly + 5)}" text-anchor="middle">${label}</text>`, true); }
      return this;
    }
    // A curved arrow around c, radius r px: counter-clockwise (sense 1) or clockwise (−1), over
    // 240° starting at angle a (degrees).
    turn(c, r, sense, cls = 'turn', a = 200) {
      const p = this.px(c), span = 240 * sense, pt = (t) => [p[0] + r * Math.cos((t * Math.PI) / 180), p[1] - r * Math.sin((t * Math.PI) / 180)];
      const [x0, y0] = pt(a), [x1, y1] = pt(a + span);
      // the head: along the tangent at the end
      const t = ((a + span) * Math.PI) / 180, tan = [-Math.sin(t) * sense, -Math.cos(t) * sense];
      const ux = tan[0], uy = tan[1], tip = [x1 + 4 * ux, y1 + 4 * uy], back = [tip[0] - 9 * ux, tip[1] - 9 * uy];
      const head = [tip, [back[0] - 4 * uy, back[1] + 4 * ux], [back[0] + 4 * uy, back[1] - 4 * ux]];
      this.see(p[0] - r - 4, p[1] - r - 4); this.see(p[0] + r + 4, p[1] + r + 4);
      return this.add(`<g class="${cls}"><path d="M${f(x0)} ${f(y0)} A${f(r)} ${f(r)} 0 1 ${sense > 0 ? 0 : 1} ${f(x1)} ${f(y1)}"/>` +
        `<polygon points="${head.map((q) => q.map(f).join(',')).join(' ')}"/></g>`, true);
    }
    // A dimension line from a to b, moved off px to the left of the direction a → b, with end ticks.
    dim(a, b, label, off = 14, cls = 'dimline') {
      const [p, q] = [this.px(a), this.px(b)], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const u = [(q[0] - p[0]) / len, (q[1] - p[1]) / len], sg = off < 0 ? -1 : 1, n = [sg * u[1], -sg * u[0]];
      const o = Math.abs(off), A = [p[0] + n[0] * o, p[1] + n[1] * o], B = [q[0] + n[0] * o, q[1] + n[1] * o];
      const tick = (P) => `M${f(P[0] - 4 * n[0])} ${f(P[1] - 4 * n[1])}L${f(P[0] + 4 * n[0])} ${f(P[1] + 4 * n[1])}`;
      this.see(...A); this.see(...B);
      this.add(`<path class="${cls}" d="M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}${tick(A)}${tick(B)}"/>`, true);
      if (label) {
        const m = [(A[0] + B[0]) / 2 + n[0] * 11, (A[1] + B[1]) / 2 + n[1] * 11 + 5];
        const anchor = Math.abs(n[0]) > 0.7 ? (n[0] > 0 ? 'start' : 'end') : 'middle';
        this.seeText(m[0], m[1], label, anchor);
        this.add(`<text class="lbl small${cls.includes('hl') ? ' hl' : ''}${cls.includes('hidden') ? ' hidden' : ''}" x="${f(m[0] + (anchor === 'start' ? -6 : anchor === 'end' ? 6 : 0))}" y="${f(m[1])}" text-anchor="${anchor}">${label}</text>`, true);
      }
      return this;
    }
    // A fixed surface from a to b (world), hatched on its side: side 1 is to the right of the
    // direction a → b on screen (below a floor drawn left to right), −1 the other side.
    surface(a, b, side = 1) {
      const [p, q] = [this.px(a), this.px(b)], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const t = [(q[0] - p[0]) / len, (q[1] - p[1]) / len], n = [-t[1] * side, t[0] * side], d = [(n[0] - t[0]) * 6, (n[1] - t[1]) * 6];
      let path = '';
      for (let k = 5; k < len; k += 8) { const r = [p[0] + k * t[0], p[1] + k * t[1]]; path += `M${f(r[0])} ${f(r[1])}l${f(d[0])} ${f(d[1])}`; this.see(r[0] + d[0], r[1] + d[1]); }
      this.see(...p); this.see(...q);
      return this.add(`<path class="hatch" d="${path}"/><line class="ground" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}"/>`);
    }
    // The axis of rotation: a hub with a pin.
    pivot(c) { this.circle(c, 5.5 / this.s, 'hub', true); return this.dot(c, 'dot', 2); }
    // A pointed support under the beam at c (the beam's underside).
    support(c) {
      const p = this.px(c), h = 20, w = 13;
      this.see(p[0] - w - 6, p[1]); this.see(p[0] + w + 6, p[1] + h + 6);
      let hatch = '';
      for (let x = -w - 2; x <= w + 2; x += 6) hatch += `M${f(p[0] + x)} ${f(p[1] + h)}l-5 6`;
      this.add(`<path class="hatch" d="${hatch}"/><line class="ground" x1="${f(p[0] - w - 6)}" y1="${f(p[1] + h)}" x2="${f(p[0] + w + 6)}" y2="${f(p[1] + h)}"/>`);
      return this.add(`<polygon class="support" points="${f(p[0])},${f(p[1])} ${f(p[0] - w)},${f(p[1] + h)} ${f(p[0] + w)},${f(p[1] + h)}"/>`);
    }
    // A load hanging from a (on the beam) on a string len px long, labelled (e.g. its mass).
    mass(a, len, label, cls = 'load') {
      const p = this.px(a), w = 30, h = 22;
      this.see(p[0] - w / 2, p[1]); this.see(p[0] + w / 2, p[1] + len + h);
      this.add(`<line class="w rope" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(p[0])}" y2="${f(p[1] + len)}"/>` +
        `<rect class="${cls}" x="${f(p[0] - w / 2)}" y="${f(p[1] + len)}" width="${w}" height="${h}" rx="2"/>`);
      if (label) this.add(`<text class="lbl mass" x="${f(p[0])}" y="${f(p[1] + len + h + 15)}" text-anchor="middle">${label}</text>`, true), this.seeText(p[0], p[1] + len + h + 15, label, 'middle');
      return this;
    }
    // The centre of mass: a circle with two filled quarters.
    com(c, label, cls = 'com') {
      const p = this.px(c), r = 6;
      this.see(p[0] - r, p[1] - r); this.see(p[0] + r, p[1] + r);
      this.add(`<g class="${cls}"><circle cx="${f(p[0])}" cy="${f(p[1])}" r="${r}"/>` +
        `<path d="M${f(p[0])} ${f(p[1])}V${f(p[1] - r)}A${r} ${r} 0 0 1 ${f(p[0] + r)} ${f(p[1])}ZM${f(p[0])} ${f(p[1])}V${f(p[1] + r)}A${r} ${r} 0 0 1 ${f(p[0] - r)} ${f(p[1])}Z"/></g>`, true);
      if (label) this.text(c, label, 'lbl com-lbl', 'start', [9, -9]);
      return this;
    }

    // A point charge at c: a small circle with + or −, red or green as on the worksheets (cls: also
    // 'ghost' for where it was, 'hl' for the charge the question is about), labelled above.
    charge(c, sign, label, cls = '', off = [0, -21]) {
      const p = this.px(c), r = 10, k = sign > 0 ? 'pos' : sign < 0 ? 'neg' : 'unk';
      this.see(p[0] - r, p[1] - r); this.see(p[0] + r, p[1] + r);
      const mark = sign > 0 ? `M${f(p[0] - 5.5)} ${f(p[1])}H${f(p[0] + 5.5)}M${f(p[0])} ${f(p[1] - 5.5)}V${f(p[1] + 5.5)}` : sign < 0 ? `M${f(p[0] - 5.5)} ${f(p[1])}H${f(p[0] + 5.5)}` : '';
      // the charge a question is about: a ring around it
      const hl = /\bhl\b/.test(cls) ? `<circle class="ring" cx="${f(p[0])}" cy="${f(p[1])}" r="${r + 6}"/>` : '';
      if (hl) { this.see(p[0] - r - 8, p[1] - r - 8); this.see(p[0] + r + 8, p[1] + r + 8); }
      this.add(`<g class="chg ${k} ${cls}">${hl}<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${r}"/>${mark ? `<path d="${mark}"/>` : `<text x="${f(p[0])}" y="${f(p[1] + 5)}" text-anchor="middle">?</text>`}</g>`, true);
      if (hl && off[0] === 0 && off[1] === -21) off = [0, -27]; // above the ring
      if (label) this.text(c, label, `lbl qlbl ${k}${/\bhidden\b/.test(cls) ? ' hidden' : ''}`, off[0] > 3 ? 'start' : off[0] < -3 ? 'end' : 'middle', off);
      return this;
    }

    svg(pad = 10) {
      const [x0, y0, x1, y1] = this.b.map((v, k) => Math.round(v + (k < 2 ? -pad : pad)));
      return `<div class="fig"><svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${x1 - x0}" role="img" aria-label="${this.label}">` +
        this.parts.join('') + this.top.join('') + '</svg></div>';
    }
  }

  root.Draw = { Pic, OUT };
  if (typeof module !== 'undefined') module.exports = root.Draw;
})(typeof window !== 'undefined' ? window : globalThis);
