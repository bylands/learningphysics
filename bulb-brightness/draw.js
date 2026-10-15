// SVG circuit diagrams in the style of the circuit trainer: the batteries sit on the left wire,
// parallel branches are vertical columns between a top and a bottom rail, and series parts
// inside a branch are stacked. Bulbs in series with the groups run along the top wire (before
// the groups) and the bottom wire (after them). Junction dots are added wherever three or more
// wires meet. Coordinates are in units (1 unit = S px), y pointing down.
(function (root) {
  'use strict';

  const S = 40;
  const R = 0.42;          // bulb radius
  const HB = 2;            // length of a bulb on the top or bottom wire
  const LEAF_H = 2;        // height of a bulb in a column
  const COL = { left: 0.5, right: 0.95 }; // room left and right of a column's wire (label on the right)
  const NOTE_RIGHT = 1.7;  // … with a note under the label (tutorial)
  const COL_GAP = 0.15;
  const CELL = 1;          // height of one cell on the battery wire
  const CELL_MIN = 0.7;    // … when the cells have to fit into a low circuit
  const BAT_X = 0.9;       // the battery wire
  const MARGIN = 0.9;      // above the top wire

  const f1 = (x) => Math.round(x * S * 10) / 10;
  // the glow around a lit bulb (glow 0 … 1); live: its data-b attribute (see glow())
  const haloR = (g) => f1(R + 0.15 + 0.35 * g), haloO = (g) => (g > 0 ? (0.25 + 0.5 * g).toFixed(2) : '0');
  const halo = (cx, cy, g, live = '') => `<circle class="halo"${live} cx="${f1(cx)}" cy="${f1(cy)}" r="${haloR(g)}" style="opacity:${haloO(g)}"/>`;

  // Sets the glow of the bulbs drawn with live (in the element el): glows[i] in 0 … 1.
  function glow(el, glows) {
    el.querySelectorAll('[data-b]').forEach((c) => {
      const g = glows[Number(c.dataset.b)] || 0;
      if (c.classList.contains('halo')) { c.setAttribute('r', haloR(g)); c.style.opacity = haloO(g); return; }
      c.classList.toggle('lit', g > 0);
      c.style.fillOpacity = g > 0 ? (0.35 + 0.65 * g).toFixed(2) : '';
    });
  }

  // ---------------------------------------------------------------- drawing kit
  function sketch() {
    const segs = [], parts = [], labels = [], back = [];
    const wire = (x1, y1, x2, y2) => { if (Math.abs(x1 - x2) > 1e-9 || Math.abs(y1 - y2) > 1e-9) segs.push([x1, y1, x2, y2]); };
    return {
      wire,
      add: (svg) => parts.push(svg),
      // Shaded rectangle behind everything (tutorial), with an optional caption above it.
      zone(x0, y0, x1, y1, cls, caption) {
        back.push(`<rect class="zone ${cls}" x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" rx="7"/>`);
        if (caption) labels.push(`<text class="cap" x="${f1(x0 + 0.1)}" y="${f1(y0 - 0.15)}">${caption}</text>`);
      },
      // A bulb from p to q (horizontal or vertical), label beside it. look: { label, glow,
      // note (a second line under the label), hl (a ring around the bulb), asked (the bulb a
      // question is about: drawn in another colour) }.
      // For the animation (live: { i }), the halo is always there and both circles carry data-b,
      // so that glow() can change them; gone: an unscrewed bulb (an empty socket); hit: the bulb
      // is the switch the student flips (play.js).
      bulb(p, q, look, side) {
        const cx = (p[0] + q[0]) / 2, cy = (p[1] + q[1]) / 2;
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const dx = (R * (q[0] - p[0])) / len, dy = (R * (q[1] - p[1])) / len; // towards q, whichever way the bulb is drawn
        wire(p[0], p[1], cx - dx, cy - dy);
        wire(cx + dx, cy + dy, q[0], q[1]);
        const live = look.live ? ` data-b="${look.live.i}"` : '';
        if (look.hit) parts.push(`<g data-pw-switch="1"><circle class="pw-hit" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R + 0.3)}"/>`);
        if (look.glow > 0 || (live && !look.gone)) parts.push(halo(cx, cy, look.glow, live));
        const asked = look.asked ? ' asked' : '';
        if (look.gone) {
          parts.push(`<circle class="socket" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}"/>`);
        } else {
          parts.push(`<circle class="bulb${look.glow > 0 ? ' lit' : ''}${asked}"${live} cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}"${look.glow > 0 ? ` style="fill-opacity:${(0.35 + 0.65 * look.glow).toFixed(2)}"` : ''}/>`);
          const d = R * Math.SQRT1_2;
          parts.push(`<path class="w thin${asked}" d="M${f1(cx - d)},${f1(cy - d)} L${f1(cx + d)},${f1(cy + d)} M${f1(cx - d)},${f1(cy + d)} L${f1(cx + d)},${f1(cy - d)}"/>`);
        }
        if (look.hit) parts.push('</g>');
        if (look.hl) parts.push(`<circle class="ring" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R + 0.14)}"/>`);
        const [lx, ly, anchor] = side === 'right' ? [cx + R + 0.15, cy + 0.18, 'start'] : side === 'below' ? [cx, cy + R + 0.5, 'middle'] : [cx, cy - R - 0.2, 'middle'];
        labels.push(`<text class="lbl${asked}" x="${f1(lx)}" y="${f1(ly)}" text-anchor="${anchor}">${look.label}</text>`);
        // The note goes under the label, or above it for a bulb on the top wire.
        if (look.note) labels.push(`<text class="note${look.noteCls ? ' ' + look.noteCls : ''}" x="${f1(lx)}" y="${f1(ly + (side === 'above' ? -0.45 : 0.45))}" text-anchor="${anchor}">${look.note}</text>`);
      },
      // A switch on a vertical wire from p (top) to q, its lever pivoting at the lower contact and
      // opening to the right; label on the right. look: { closed, hit (the switch the student flips, play.js), label }.
      toggle(p, q, look) {
        const x = p[0], a = p[1] + 0.35, b = q[1] - 0.35, L = b - a;
        wire(x, p[1], x, a);
        wire(x, b, x, q[1]);
        if (look.hit) parts.push(`<g data-pw-switch="1"><rect class="pw-hit" x="${f1(x - 0.45)}" y="${f1(a - 0.3)}" width="${f1(0.9 + 0.55)}" height="${f1(L + 0.6)}" rx="6"/>`);
        const ang = look.closed ? 0 : 0.55, tx = x + L * Math.sin(ang), ty = b - L * Math.cos(ang);
        parts.push(`<line class="w lever" x1="${f1(x)}" y1="${f1(b)}" x2="${f1(tx)}" y2="${f1(ty)}"/>`);
        for (const y of [a, b]) parts.push(`<circle class="contact" cx="${f1(x)}" cy="${f1(y)}" r="2.6"/>`);
        if (look.hit) parts.push('</g>');
        labels.push(`<text class="lbl" x="${f1(x + 0.62)}" y="${f1((a + b) / 2 + 0.18)}" text-anchor="start">${look.label || 'S'}</text>`);
      },
      // A cell on the vertical battery wire between y1 (top) and y2; + at the top for dir = +1.
      cell(x, y1, y2, dir) {
        const cy = (y1 + y2) / 2, a = cy - 0.15, b = cy + 0.15;
        const [plus, minus] = dir > 0 ? [a, b] : [b, a];
        wire(x, y1, x, a);
        wire(x, b, x, y2);
        parts.push(`<line class="w" x1="${f1(x - 0.45)}" y1="${f1(plus)}" x2="${f1(x + 0.45)}" y2="${f1(plus)}"/>`);
        parts.push(`<line class="w thick" x1="${f1(x - 0.25)}" y1="${f1(minus)}" x2="${f1(x + 0.25)}" y2="${f1(minus)}"/>`);
        parts.push(`<text class="plus" x="${f1(x - 0.62)}" y="${f1(plus + (dir > 0 ? -0.08 : 0.32))}" text-anchor="middle">+</text>`);
      },
      // Wires as lines, with a dot where three or more wire ends meet (or a wire end touches
      // the middle of another wire). Labels come last, so that no glow covers them.
      toSVG(w, h, margin = MARGIN) {
        const key = (x, y) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
        const degree = new Map();
        const bump = (x, y, n) => degree.set(key(x, y), (degree.get(key(x, y)) || 0) + n);
        for (const [x1, y1, x2, y2] of segs) { bump(x1, y1, 1); bump(x2, y2, 1); }
        const inside = (x, y, [x1, y1, x2, y2]) => {
          const e = 1e-6;
          if (Math.abs((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) > e) return false;
          const t = Math.abs(x2 - x1) > e ? (x - x1) / (x2 - x1) : (y - y1) / (y2 - y1);
          return t > e && t < 1 - e;
        };
        const ends = segs.flatMap(([x1, y1, x2, y2]) => [[x1, y1], [x2, y2]]);
        const dots = new Map();
        for (const [x, y] of ends) {
          const n = degree.get(key(x, y)) + 2 * segs.filter((s) => inside(x, y, s)).length;
          if (n >= 3) dots.set(key(x, y), [x, y]);
        }
        const lines = segs.map(([x1, y1, x2, y2]) => `<line class="w" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`);
        const dotted = [...dots.values()].map(([x, y]) => `<circle class="dot" cx="${f1(x)}" cy="${f1(y)}" r="3"/>`);
        const H = h + margin; // room for labels above the top wire
        return `<svg viewBox="0 0 ${f1(w)} ${f1(H)}" width="${f1(w)}" height="${f1(H)}" role="img" aria-label="Circuit diagram"><g transform="translate(0 ${f1(margin)})">${back.join('')}${lines.join('')}${parts.join('')}${dotted.join('')}${labels.join('')}</g></svg>`;
      },
    };
  }

  // ---------------------------------------------------------------- vertical blocks
  // A block hangs from its attach column (ax from its left edge): terminals at the top and at
  // the bottom of that column.
  function measure(node, right) {
    if (node.t === 'L') return (node.vl = { ax: COL.left, w: COL.left + right, h: LEAF_H });
    // a bridging wire stands where a bulb's wire would, so that its column lines up with the
    // columns of the groups above and below it (no room needed for a label on its right)
    if (node.t === 'W') return (node.vl = { ax: COL.left, w: COL.left + 0.3, h: 0 });
    // a switch: room for the open lever and its label on the right
    if (node.t === 'K') return (node.vl = { ax: COL.left, w: COL.left + 1, h: 1.6 });
    const kids = node.kids.map((k) => measure(k, right));
    if (node.t === 'S') {
      const ax = Math.max(...kids.map((k) => k.ax));
      return (node.vl = { ax, w: Math.max(...kids.map((k) => ax - k.ax + k.w)), h: kids.reduce((s, k) => s + k.h, 0) });
    }
    node.cols = [];
    let x = 0;
    for (const k of kids) { node.cols.push(x); x += k.w + COL_GAP; }
    return (node.vl = { ax: kids[0].ax, w: x - COL_GAP, h: Math.max(LEAF_H, ...kids.map((k) => k.h)) });
  }

  // box(node, x0, y0, x1, y1) records where each part is drawn (for the tutorial's zones).
  function drawV(s, node, x, y, bulb, box) {
    const g = node.vl;
    box(node, x, y, x + g.w, y + g.h);
    if (node.t === 'L') { s.bulb([x + g.ax, y], [x + g.ax, y + g.h], bulb(node.i), 'right'); return; }
    if (node.t === 'W') { s.wire(x + g.ax, y, x + g.ax, y + g.h); return; }
    if (node.t === 'K') { s.toggle([x + g.ax, y], [x + g.ax, y + g.h], s.sw || { closed: node.closed }); return; }
    if (node.t === 'S') {
      let cy = y;
      for (const k of node.kids) { drawV(s, k, x + g.ax - k.vl.ax, cy, bulb, box); cy += k.vl.h; }
      return;
    }
    const colX = (i) => x + node.cols[i] + node.kids[i].vl.ax;
    const last = node.kids.length - 1, bot = y + g.h;
    s.wire(colX(0), y, colX(last), y);
    s.wire(colX(0), bot, colX(last), bot);
    node.kids.forEach((k, i) => {
      drawV(s, k, x + node.cols[i], y, bulb, box);
      if (k.vl.h < g.h) s.wire(colX(i), y + k.vl.h, colX(i), bot);
    });
  }

  // ---------------------------------------------------------------- whole circuit
  // `bulb(i)` gives the look of bulb i (reading order): { label, glow } with glow in 0 … 1 (and
  // live, gone, hit for the animation, see sketch().bulb), and
  // for the tutorial note and hl (see sketch().bulb). The tutorial also passes opts.zones:
  // part → 'strong' | 'light' (shaded; the whole load or its parts), opts.captions: part →
  // text above its zone, and opts.bat: the class of a zone around the batteries. A switch (node
  // { t: 'K', closed }) is drawn as opts.sw gives it ({ closed, hit, label }), else as node.closed;
  // opts.margin: the room above the top wire (more for notes above the bulbs there).
  function circuit(load, pack, bulb, opts = {}) {
    const cells = pack.t === 'B' ? [pack] : pack.kids;
    let top = [], bottom = [], middle = null;
    if (load.t === 'L') top = [load];
    else if (load.t === 'P') middle = load;
    else {
      const groups = load.kids.map((k, i) => (k.t === 'L' ? -1 : i)).filter((i) => i >= 0);
      if (!groups.length) {
        const half = Math.ceil(load.kids.length / 2);
        top = load.kids.slice(0, half);
        bottom = load.kids.slice(half);
      } else {
        const a = groups[0], b = groups[groups.length - 1];
        top = load.kids.slice(0, a);
        bottom = load.kids.slice(b + 1);
        middle = a === b ? load.kids[a] : { t: 'S', kids: load.kids.slice(a, b + 1) };
      }
    }
    const notes = !!opts.zones;
    if (middle) measure(middle, notes ? NOTE_RIGHT : COL.right);
    const boxes = new Map(), box = (node, x0, y0, x1, y1) => boxes.set(node, [x0, y0, x1, y1]);

    // Bulbs on the top and bottom wires share the same slots from the left, so that a bulb
    // below one on top sits exactly underneath it. The groups hang at `col`, right of the slots.
    const X0 = BAT_X + 0.6, slots = Math.max(top.length, bottom.length);
    const col = X0 + slots * HB + (middle ? 0.3 + middle.vl.ax : 0.4);
    // The cells fit into the height of the groups where possible (closer together if needed),
    // so that the rails do not have to be stretched by a little.
    const bottomY = Math.max(middle ? middle.vl.h : 0, 2.4, cells.length * CELL_MIN + 0.8, top.length && bottom.length ? 2.9 : 0);
    const cell = Math.min(CELL, (bottomY - 0.8) / cells.length);
    if (middle && middle.t === 'P') middle.vl.h = bottomY; // a group reaches down to the bottom wire

    const s = sketch();
    s.sw = opts.sw; // the look of the switch (toggle)
    s.wire(BAT_X, 0, X0, 0);
    top.forEach((leaf, k) => {
      box(leaf, X0 + k * HB + 0.2, notes ? -1.2 : -0.8, X0 + (k + 1) * HB - 0.2, 0.6);
      s.bulb([X0 + k * HB, 0], [X0 + (k + 1) * HB, 0], bulb(leaf.i), 'above');
    });
    s.wire(X0 + top.length * HB, 0, col, 0);
    if (middle) {
      drawV(s, middle, col - middle.vl.ax, 0, bulb, box);
      if (middle.vl.h < bottomY) s.wire(col, middle.vl.h, col, bottomY);
    } else {
      s.wire(col, 0, col, bottomY);
    }
    // Along the bottom wire the current comes back from the right: the first bulb after the
    // groups is the rightmost one.
    s.wire(col, bottomY, X0 + bottom.length * HB, bottomY);
    bottom.forEach((leaf, j) => {
      const xr = X0 + (bottom.length - j) * HB;
      box(leaf, xr - HB + 0.2, bottomY - 0.6, xr - 0.2, bottomY + (notes ? 1.3 : 0.9));
      s.bulb([xr, bottomY], [xr - HB, bottomY], bulb(leaf.i), 'below');
    });
    s.wire(X0, bottomY, BAT_X, bottomY);

    // Cells in the middle of the battery wire, current leaving + upwards.
    const y0 = (bottomY - cells.length * cell) / 2;
    s.wire(BAT_X, 0, BAT_X, y0);
    cells.forEach((c, i) => s.cell(BAT_X, y0 + i * cell, y0 + (i + 1) * cell, c.dir));
    s.wire(BAT_X, y0 + cells.length * cell, BAT_X, bottomY);

    const width = col + (middle ? middle.vl.w - middle.vl.ax : 0) + 0.5;
    if (!notes) return s.toSVG(width, bottomY + (bottom.length ? 1.1 : 0.5), opts.margin);

    // Zones: larger ones first (behind); nested zones get a wider margin.
    box(load, X0 - 0.2, -1.3, width - 0.15, bottomY + (bottom.length ? 1.4 : 0.35));
    const height = (n) => (n.kids ? 1 + Math.max(...n.kids.map(height)) : 0);
    const zoned = [...(opts.zones || [])].sort(([a], [b]) => height(b) - height(a));
    for (const [node, cls] of zoned) {
      const [x0, y0, x1, y1] = boxes.get(node), m = node === load ? 0 : 0.08 + 0.14 * height(node);
      s.zone(x0 - m, y0 - m, x1 + m, y1 + m, cls, opts.captions && opts.captions.get(node));
    }
    if (opts.bat) s.zone(BAT_X - 0.8, y0 - 0.25, BAT_X + 0.55, y0 + cells.length * cell + 0.25, opts.bat, null);
    return s.toSVG(width, bottomY + (bottom.length ? 1.5 : 0.5), 2);
  }

  const api = { circuit, glow };
  root.Draw = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
