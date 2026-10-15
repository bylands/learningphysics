// Drawings: boxes, floors, slopes and pulleys with their force arrows. A scene collects the fixed
// parts and the forces; render(view) draws it either as the task (only the given forces and
// accelerations, labelled with their values) or as a free-body diagram (the forces in view.show,
// those in view.hl highlighted). Arrow lengths are proportional to the forces within a scene.
// The drawing is cropped to what it contains, counting all its forces whether shown or not, so
// that it keeps its size from one tutor step to the next; with view.tight, only what is shown.
(function (root) {
  'use strict';

  const { svgSym } = root.FS;
  const f = (x) => (Math.round(x * 10) / 10).toString();
  const MAX_LEN = 96, MIN_LEN = 30, HEAD = 11, NOTCH = 8, BARB = 4.2;

  class Scene {
    constructor(w, h, label) {
      this.w = w; this.h = h; this.label = label || '';
      this.parts = []; this.forces = []; this.marks = []; this.bodies = [];
      this.box0 = [Infinity, Infinity, -Infinity, -Infinity];
    }
    // Extends the bounding box.
    see(x, y) { const b = this.box0; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
    // A text's extent, roughly: 7.5 px per character of 13–16 px text.
    seeText(x, y, html, anchor) {
      const w = html.replace(/<[^>]*>/g, '').replace(/\u200b/g, '').length * 7.5;
      const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      this.see(x0, y - 14); this.see(x0 + w, y + 5);
    }
    add(svg) { this.parts.push(svg); return this; }
    line(x1, y1, x2, y2, cls = 'w') { this.see(x1, y1); this.see(x2, y2); return this.add(`<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`); }
    poly(pts, cls = 'body') { pts.forEach((p) => this.see(...p)); return this.add(`<polygon class="${cls}" points="${pts.map((p) => p.map(f).join(',')).join(' ')}"/>`); }
    text(x, y, html, cls = 'lbl', anchor = 'middle') { this.seeText(x, y, html, anchor); return this.add(`<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${html}</text>`); }
    circle(cx, cy, r, cls = 'pulley') { this.see(cx - r, cy - r); this.see(cx + r, cy + r); return this.add(`<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`); }
    // A fixed surface from p1 to p2, hatched on one side as in mechanics drawings: side 1 is to
    // the right of the direction p1 → p2 (below a floor drawn left to right), -1 the other side.
    surface(p1, p2, side = 1, cls = 'ground') {
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), t = [(p2[0] - p1[0]) / len, (p2[1] - p1[1]) / len];
      const n = [-t[1] * side, t[0] * side], d = [(n[0] - t[0]) * 6, (n[1] - t[1]) * 6];
      let path = '';
      for (let k = 5; k < len; k += 8) {
        const q = [p1[0] + k * t[0], p1[1] + k * t[1]];
        path += `M${f(q[0])} ${f(q[1])}l${f(d[0])} ${f(d[1])}`;
        this.see(q[0] + d[0], q[1] + d[1]);
      }
      this.add(`<path class="hatch" d="${path}"/>`);
      return this.line(...p1, ...p2, cls);
    }
    // A pulley: rim, hub and axle.
    pulley(cx, cy, r) {
      this.circle(cx, cy, r, 'pulley');
      this.circle(cx, cy, Math.max(3, r * 0.3), 'hub');
      return this.circle(cx, cy, 1.8, 'dot');
    }
    // A coil spring from p1 to p2 (a zigzag of n coils between short straight ends), r wide.
    spring(p1, p2, n = 7, r = 8) {
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), t = [(p2[0] - p1[0]) / len, (p2[1] - p1[1]) / len], nn = [-t[1], t[0]];
      const end = Math.min(10, len / 6), step = (len - 2 * end) / (2 * n), pt = (s, w) => [p1[0] + s * t[0] + w * nn[0], p1[1] + s * t[1] + w * nn[1]];
      const pts = [p1, pt(end, 0)];
      for (let k = 0; k < 2 * n; k++) pts.push(pt(end + (k + 0.5) * step, k % 2 ? -r : r));
      pts.push(pt(len - end, 0), p2);
      pts.forEach((q) => this.see(...q));
      return this.add(`<polyline class="w spring" points="${pts.map((q) => q.map(f).join(',')).join(' ')}"/>`);
    }
    // A box from its bottom-left corner, along the unit vector u (its base) and n (upwards).
    // right: the mass in the top-right corner (on a slope, clear of the components of the weight).
    // Its corners join this.bodies, in the order of the boxes (where the student puts forces).
    box(o, u, n, w, h, label, right = false) {
      const at = (s, t) => [o[0] + s * u[0] + t * n[0], o[1] + s * u[1] + t * n[1]];
      this.bodies.push([at(0, 0), at(w, 0), at(w, h), at(0, h)]);
      this.poly([at(0, 0), at(w, 0), at(w, h), at(0, h)]);
      // the mass in the top-left corner, clear of the arrows that start at the centre and the base
      if (label && right) this.text(...at(0.68 * w, h - 16), label, 'lbl mass', 'middle');
      else if (label) this.text(...at(6, h - 17), label, 'lbl mass', 'start');
      return at;
    }
    // A force { id, kind: g|n|r|s|k|comp, at, dir (unit vector), mag (N) or fixed (length in px), sym: [key, index],
    // value (its label in the task), task: 'value'|'sym' (shown in the task), lab: offset of the
    // label from the tip (from the tail with labTail), max: the longest it may be drawn }. The arrow starts where the force
    // acts, also for pushes.
    force(spec) { this.forces.push(spec); return this; }
    // An acceleration arrow { id, at, dir, sym, value, task, lab }, drawn with a fixed length; with
    // kind 'v', a velocity arrow.
    accel(spec) { this.marks.push(spec); return this; }
    // An angle: arc around c from direction a0 to a1 (degrees, counter-clockwise, y up).
    angle(c, r, a0, a1, label, dist = 14) {
      const pt = (a, rr) => [c[0] + rr * Math.cos((a * Math.PI) / 180), c[1] - rr * Math.sin((a * Math.PI) / 180)];
      const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
      this.add(`<path class="w thin" d="M${f(x0)} ${f(y0)} A${f(r)} ${f(r)} 0 0 0 ${f(x1)} ${f(y1)}"/>`);
      const [lx, ly] = pt((a0 + a1) / 2, r + dist);
      return this.text(lx, ly + 5, label, 'lbl small');
    }

    // The length of each force's arrow in the free-body diagram, by id (as render draws them all
    // at the diagram's scale: the solved drawing, the steps of a worked solution).
    lengths() {
      const sized = this.forces.filter((s) => s.mag > 1e-9 && !s.fixed), k = MAX_LEN / Math.max(...sized.map((s) => s.mag), 1e-9);
      return Object.fromEntries(sized.map((s) => [s.id, Math.min(Math.max(MIN_LEN, s.mag * k), s.max || Infinity)]));
    }

    render(view = {}) {
      const task = !!view.task, hl = view.hl || new Set();
      const cls = (s, kind) => `force k-${kind}${hl.has(s.id) ? ' hl' : hl.size ? ' dim' : ''}`;
      // in the task, the given forces and those ticked in the table of forces (view.ticked)
      const shown = (s) => (task ? !!s.task || !!(view.ticked && view.ticked.has(s.id)) : !view.show || view.show.has(s.id));
      // The task scales the forces it shows (often just the given one, drawn at full length); the
      // free-body diagram scales all forces, so that arrows keep their lengths from step to step.
      const scaleOf = (list) => MAX_LEN / Math.max(...list.map((s) => s.mag), 1e-9);
      // forces with a fixed length (s.fixed, e.g. a force ticked that does not act) do not count
      // for the scale; with the table of forces, the task uses the diagram's scale throughout, so
      // that ticking a force does not resize the others
      const all = this.forces.filter((s) => s.mag > 1e-9 || s.fixed), sized = all.filter((s) => !s.fixed);
      const scaleAll = scaleOf(sized), scale = task && !view.ticked ? scaleOf(sized.filter(shown)) : scaleAll;
      // an arrow's length; s.max caps it (e.g. a push that would cross the whole body)
      const length = (s, k) => (s.fixed ? s.fixed : Math.min(Math.max(MIN_LEN, s.mag * k), s.max || Infinity));
      const out = [], bounds = new Scene(0, 0);
      bounds.box0 = [...this.box0];
      const label = (s, tip, draw, count) => {
        const html = task ? (s.task === 'value' ? s.value : svgSym(...s.sym)) : svgSym(...s.sym);
        const [dx, dy] = s.lab || [8, 0];
        const anchor = dx > 3 ? 'start' : dx < -3 ? 'end' : 'middle';
        // the task's value labels and the diagram's symbols both count for the size
        if (count) {
          bounds.seeText(tip[0] + dx, tip[1] + dy + 5, s.value && s.task ? s.value : html, anchor);
          bounds.seeText(tip[0] + dx, tip[1] + dy + 5, 'Fxxx', anchor);
        }
        return draw ? `<text class="flbl" x="${f(tip[0] + dx)}" y="${f(tip[1] + dy + 5)}" text-anchor="${anchor}">${html}</text>` : '';
      };
      const arrow = (s, len, cls, draw = true) => {
        const [ux, uy] = s.dir;
        const a = s.at;
        const tip = [a[0] + len * ux, a[1] + len * uy];
        const count = draw || !view.tight;
        if (count) { bounds.see(...a); bounds.see(...tip); }
        const lbl = label(s, s.labTail ? a : tip, draw, count);
        if (!draw) return;
        // a slim, notched arrowhead; the shaft ends in the notch
        const back = [tip[0] - HEAD * ux, tip[1] - HEAD * uy], notch = [tip[0] - NOTCH * ux, tip[1] - NOTCH * uy];
        const head = [tip, [back[0] - BARB * uy, back[1] + BARB * ux], notch, [back[0] + BARB * uy, back[1] - BARB * ux]];
        out.push(`<g class="seq ${cls}"><line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(notch[0])}" y2="${f(notch[1])}"/>` +
          `<polygon points="${head.map((p) => p.map(f).join(',')).join(' ')}"/>` +
          `<circle cx="${f(a[0])}" cy="${f(a[1])}" r="2"/>` + lbl + '</g>');
      };
      // forces not shown still reserve their room at the diagram's scale
      for (const s of all) arrow(s, length(s, shown(s) ? scale : scaleAll), cls(s, s.kind), shown(s));
      for (const s of this.marks) arrow(s, s.len || 46, cls(s, s.kind || 'acc'), shown(s));
      const PAD = 10, [x0, y0, x1, y1] = bounds.box0.map((v, k) => Math.round(v + (k < 2 ? -PAD : PAD)));
      return `<div class="fig"><svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${x1 - x0}" role="img" aria-label="${this.label}">` +
        this.parts.join('') + out.join('') + '</svg></div>';
    }
  }

  root.Draw = { Scene };
  if (typeof module !== 'undefined') module.exports = root.Draw;
})(typeof window !== 'undefined' ? window : globalThis);
