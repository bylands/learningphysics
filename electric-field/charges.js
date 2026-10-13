// Electric fields and potentials of simple configurations, their field lines and equipotentials,
// and SVG drawings of them. Shared by Electric Field and Electric Potential (which loads it from
// /electric-field/charges.js). Lengths in the drawing's units, charges in units of q; the field is
// k·q·r̂/r² and the potential k·q/r with k = 1 (the drawings only need shapes and directions).
//   config kinds:
//     { kind: 'points', charges: [{ q, x, y, name }] }
//     { kind: 'image', charge: { q, x, y }, plate: y0 }   a charge above a grounded conducting
//                                                           plate (the field above it: the charge
//                                                           and its mirror image −q)
//     { kind: 'plates', h, w, q }                          a capacitor: plates at y = ±h from −w to w,
//                                                           the upper one positive if q > 0
//     { kind: 'cylinder', a, E0 }                          a conducting cylinder (radius a) in a
//                                                           uniform field E0 along x
//     { kind: 'uniform', E: [ex, ey] }
//     { kind: 'mixed', charges: [{ q, x, y, name }], plates: [{ y, a, b, s, name }] }
//                                                           point charges and horizontal plates at
//                                                           height y from x = a to b with the charge
//                                                           s per area (long across the page: strips)
//   field(c, x, y) → [Ex, Ey], potential(c, x, y)
//   lines(c, box, o)       field lines: arrays of points, from + to − (or to the edge)
//   contours(c, box, levels)  equipotential segments
//   fig(c, o)              an SVG: the configuration, its field lines and/or equipotentials
(function (root) {
  'use strict';

  const Lang = root.Lang || require('../electric-field/lang.js');
  const L = (en, de) => Lang.L(en, de);
  const f1 = (x) => Math.round(x * 10) / 10;
  let uid = 0;

  // ---------------------------------------------------------------- fields and potentials
  function sources(c) {
    if (c.kind === 'points' || c.kind === 'mixed') return c.charges;
    if (c.kind === 'image') return [c.charge, { q: -c.charge.q, x: c.charge.x, y: 2 * c.plate - c.charge.y }];
    if (c.kind === 'plates') {
      const out = [], n = 61;
      for (let i = 0; i < n; i++) { const x = -c.w + (2 * c.w * i) / (n - 1); out.push({ q: c.q / n * 12, x, y: c.h }, { q: -c.q / n * 12, x, y: -c.h }); }
      return out;
    }
    return [];
  }
  // A plate of a 'mixed' arrangement: a strip, long across the page, of line charges 2·s·du/r each
  // (k = 1, as for the point charges), so that close to it the field is 2π·s, as for a large plate.
  const lift = (y, p) => { const d = y - p.y; return Math.abs(d) < 1e-6 ? (d < 0 ? -1e-6 : 1e-6) : d; };
  function stripField(p, x, y) {
    const d = lift(y, p), xa = x - p.a, xb = x - p.b;
    return [p.s * Math.log((xa * xa + d * d) / (xb * xb + d * d)), 2 * p.s * (Math.atan(xa / d) - Math.atan(xb / d))];
  }
  // its potential −2·s·∫ln r du (up to a constant: only differences count)
  function stripPotential(p, x, y) {
    const d = Math.abs(lift(y, p)), F = (t) => t * Math.log(t * t + d * d) - 2 * t + 2 * d * Math.atan(t / d);
    return -p.s * (F(p.b - x) - F(p.a - x));
  }
  function field(c, x, y) {
    if (c.kind === 'uniform') return [...c.E];
    if (c.kind === 'mixed') {
      const f = field({ kind: 'points', charges: c.charges }, x, y);
      for (const p of c.plates) { const g = stripField(p, x, y); f[0] += g[0]; f[1] += g[1]; }
      return f;
    }
    if (c.kind === 'cylinder' || c.kind === 'flow') {
      // a conductor: outside φ = −E0·x·(1 − a²/r²), so E = E0·(1 + a²(x² − y²)/r⁴, 2a²xy/r⁴), the
      // lines ending perpendicular on it; inside no field. 'flow': the lines of a flow around the
      // cylinder instead (tangent to it: a wrong picture of a conductor)
      const r2 = x * x + y * y, a2 = c.a * c.a, sg = c.kind === 'flow' ? -1 : 1;
      if (r2 < a2) return [0, 0];
      const r4 = r2 * r2;
      return [c.E0 * (1 + (sg * a2 * (x * x - y * y)) / r4), c.E0 * ((sg * 2 * a2 * x * y) / r4)];
    }
    let ex = 0, ey = 0;
    for (const s of sources(c)) {
      const dx = x - s.x, dy = y - s.y, r2 = dx * dx + dy * dy, r3 = r2 * Math.sqrt(r2) || 1e-12;
      ex += (s.q * dx) / r3; ey += (s.q * dy) / r3;
    }
    return [ex, ey];
  }
  function potential(c, x, y) {
    if (c.kind === 'uniform') return -(c.E[0] * x + c.E[1] * y);
    if (c.kind === 'mixed') return c.plates.reduce((v, p) => v + stripPotential(p, x, y), potential({ kind: 'points', charges: c.charges }, x, y));
    if (c.kind === 'cylinder' || c.kind === 'flow') { const r = Math.hypot(x, y); return r < c.a ? 0 : -c.E0 * (r + (c.kind === 'flow' ? 1 : -1) * (c.a * c.a) / r) * (x / r); }
    let v = 0;
    for (const s of sources(c)) v += s.q / (Math.hypot(x - s.x, y - s.y) || 1e-9);
    return v;
  }
  // where a field line ends: at a charge, on a conductor, outside the box
  function blocked(c, x, y, box, sinkR) {
    if (x < box[0] - 0.3 || x > box[1] + 0.3 || y < box[2] - 0.3 || y > box[3] + 0.3) return true;
    if (c.kind === 'image' && y <= c.plate) return true;
    if ((c.kind === 'cylinder' || c.kind === 'flow') && Math.hypot(x, y) <= c.a) return true;
    if (c.kind === 'plates' && Math.abs(Math.abs(y) - c.h) < 0.02 && Math.abs(x) <= c.w) return true;
    if (c.kind === 'mixed' && c.plates.some((p) => Math.abs(y - p.y) < 0.02 && x >= p.a && x <= p.b)) return true;
    return (c.kind === 'points' || c.kind === 'image' || c.kind === 'mixed') && sources(c).some((s) => Math.hypot(x - s.x, y - s.y) < sinkR);
  }
  // one field line from (x, y), along the field (dir 1) or against it (−1), by RK4 on the unit field
  function trace(c, x, y, dir, box, o = {}) {
    const h = o.step || 0.03, pts = [[x, y]], sinkR = o.sinkR || 0.1;
    const u = (px, py) => { const [ex, ey] = field(c, px, py), n = Math.hypot(ex, ey) || 1e-12; return [(dir * ex) / n, (dir * ey) / n]; };
    for (let i = 0; i < (o.max || 900); i++) {
      const k1 = u(x, y), k2 = u(x + (h / 2) * k1[0], y + (h / 2) * k1[1]), k3 = u(x + (h / 2) * k2[0], y + (h / 2) * k2[1]), k4 = u(x + h * k3[0], y + h * k3[1]);
      x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      pts.push([x, y]);
      if (i > 2 && blocked(c, x, y, box, sinkR)) break;
    }
    return pts;
  }
  // Field lines, from + to −: o.per lines (default 8) for a charge of size 1. A drawing is a
  // section through the field in space: of N ∝ |q| lines evenly spread in space, about √N lie in
  // one plane, so a charge gets o.per·√|q| lines. From each positive charge, evenly spread; then
  // from each negative charge (backwards) where no line has arrived.
  function lines(c, box, o = {}) {
    const per = o.per || 8, r0 = 0.12, out = [];
    if (c.kind === 'uniform') {
      const [ex, ey] = c.E, n = Math.hypot(ex, ey), ux = ex / n, uy = ey / n;
      for (let k = -6; k <= 6; k++) {
        const ox = -uy * k * (o.gap || 0.7), oy = ux * k * (o.gap || 0.7);
        out.push([[ox - ux * 20, oy - uy * 20], [ox + ux * 20, oy + uy * 20]]);
      }
      return out;
    }
    if (c.kind === 'cylinder' || c.kind === 'flow') {
      // lines from the left edge, ending on the cylinder or leaving at the right
      const n = o.count || 11;
      for (let k = 0; k < n; k++) {
        const y0 = box[2] + ((box[3] - box[2]) * (k + 0.5)) / n;
        const a = trace(c, box[0], y0, 1, box);
        out.push(a);
        // a line leaving the cylinder on its far side
        const last = a[a.length - 1];
        if (Math.hypot(last[0], last[1]) <= c.a + 0.05) {
          const th = Math.atan2(last[1], last[0]);
          out.push(trace(c, (c.a + 0.02) * Math.cos(Math.PI - th), (c.a + 0.02) * Math.sin(th), 1, box));
        }
      }
      return out;
    }
    if (c.kind === 'plates') {
      // from the positive plate, straight across inside, curved at the edges and outside
      const top = c.q > 0 ? c.h : -c.h, dir = -Math.sign(top), n = o.count || 9;
      for (let k = 0; k < n; k++) {
        const x0 = -c.w + (2 * c.w * (k + 0.5)) / n;
        out.push(trace(c, x0, top + dir * 0.03, 1, box));
      }
      for (const x0 of [-c.w * 0.97, c.w * 0.97]) out.push(trace(c, x0, top - dir * 0.03, 1, box));
      return out;
    }
    if (c.kind === 'mixed') return mixedLines(c, box, o);
    const src = sources(c), shown = c.kind === 'image' ? [c.charge] : src, arrivals = new Map();
    for (const s of shown.filter((s) => s.q > 0)) {
      const n = Math.max(1, Math.round(per * Math.sqrt(s.q))), a0 = o.offset || Math.PI / n / 2;
      for (let k = 0; k < n; k++) {
        const a = a0 + (2 * Math.PI * k) / n, pts = trace(c, s.x + r0 * Math.cos(a), s.y + r0 * Math.sin(a), 1, box);
        out.push(pts);
        const e = pts[pts.length - 1], sink = shown.find((t) => t.q < 0 && Math.hypot(e[0] - t.x, e[1] - t.y) < 0.2);
        if (sink) { if (!arrivals.has(sink)) arrivals.set(sink, []); arrivals.get(sink).push(Math.atan2(e[1] - sink.y, e[0] - sink.x)); }
      }
    }
    for (const s of shown.filter((s) => s.q < 0)) {
      const n = Math.max(1, Math.round(per * Math.sqrt(-s.q))), got = arrivals.get(s) || [], gap = Math.PI / n;
      for (let k = 0; k < n; k++) {
        const a = (o.offset || gap / 2) + (2 * Math.PI * k) / n;
        if (got.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < gap * 0.9)) continue;
        out.push(trace(c, s.x + r0 * Math.cos(a), s.y + r0 * Math.sin(a), -1, box).reverse());
      }
    }
    return out;
  }
  // Point charges and plates: lines from the positive charges (o.per·√q of them, evenly spread) and
  // from the faces of the positive plates (one for every o.gap of a lone plate's field, spaced by
  // the field leaving the face: denser where it is stronger); then backwards from the negative
  // charges and faces where no line has arrived.
  function mixedLines(c, box, o) {
    const per = o.per || 8, r0 = 0.12, out = [], gap = o.gap || 0.42, arrived = new Map(), at = new Map();
    const faceKey = (i, side) => `${i}${side}`;
    // where a line ends: on a negative charge (its angle) or a negative plate's face (its x)
    const land = (pts) => {
      const e = pts[pts.length - 1], sink = c.charges.find((t) => t.q < 0 && Math.hypot(e[0] - t.x, e[1] - t.y) < 0.2);
      if (sink) { if (!arrived.has(sink)) arrived.set(sink, []); arrived.get(sink).push(Math.atan2(e[1] - sink.y, e[0] - sink.x)); return; }
      c.plates.forEach((p, i) => {
        if (p.s >= 0 || Math.abs(e[1] - p.y) > 0.08 || e[0] < p.a - 0.05 || e[0] > p.b + 0.05) return;
        const prev = pts[Math.max(0, pts.length - 4)], k = faceKey(i, prev[1] >= p.y ? 1 : -1);
        if (!at.has(k)) at.set(k, []); at.get(k).push(e[0]);
      });
    };
    // the start points on a face: at equal steps of the field through it
    const starts = (p, side, sign) => {
      const lo = Math.max(p.a, box[0] - 0.2), hi = Math.min(p.b, box[1] + 0.2), dx = 0.01, flux = [];
      let tot = 0;
      for (let x = lo + dx / 2; x < hi; x += dx) { const En = side * sign * field(c, x, p.y + side * 0.04)[1]; tot += Math.max(0, En) * dx; flux.push([x, tot, En > 0]); }
      const n = Math.round(tot / (2 * Math.PI * Math.abs(p.s) * gap)), xs = [];
      for (let k = 0; k < n; k++) { const want = (tot * (k + 0.5)) / n, f = flux.find((z) => z[1] >= want); if (f && f[2]) xs.push(f[0]); }
      return xs;
    };
    const ring = (s, n, a0) => Array.from({ length: n }, (z, k) => a0 + (2 * Math.PI * k) / n);
    for (const s of c.charges.filter((t) => t.q > 0)) {
      const n = Math.max(1, Math.round(per * Math.sqrt(s.q)));
      for (const a of ring(s, n, o.offset || Math.PI / n / 2)) { const pts = trace(c, s.x + r0 * Math.cos(a), s.y + r0 * Math.sin(a), 1, box); out.push(pts); land(pts); }
    }
    c.plates.forEach((p) => { if (p.s > 0) for (const side of [1, -1]) for (const x of starts(p, side, 1)) { const pts = trace(c, x, p.y + side * 0.04, 1, box); out.push(pts); land(pts); } });
    for (const s of c.charges.filter((t) => t.q < 0)) {
      const n = Math.max(1, Math.round(per * Math.sqrt(-s.q))), got = arrived.get(s) || [], g = Math.PI / n;
      for (const a of ring(s, n, o.offset || g / 2)) {
        if (got.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < g * 0.9)) continue;
        out.push(trace(c, s.x + r0 * Math.cos(a), s.y + r0 * Math.sin(a), -1, box).reverse());
      }
    }
    c.plates.forEach((p, i) => {
      if (p.s < 0) for (const side of [1, -1]) for (const x of starts(p, side, -1)) {
        if ((at.get(faceKey(i, side)) || []).some((u) => Math.abs(u - x) < gap * 0.6)) continue;
        out.push(trace(c, x, p.y + side * 0.04, -1, box).reverse());
      }
    });
    return out;
  }
  // equipotential segments by marching squares on a grid
  function contours(c, box, levels, o = {}) {
    const n = o.n || 120, [x0, x1, y0, y1] = box, dx = (x1 - x0) / n, ny = Math.round((y1 - y0) / dx), segs = [];
    const V = [];
    for (let j = 0; j <= ny; j++) { V.push([]); for (let i = 0; i <= n; i++) V[j].push(potential(c, x0 + i * dx, y0 + j * dx)); }
    const near = (x, y) => (c.kind === 'points' || c.kind === 'image' || c.kind === 'mixed') && sources(c).some((s) => Math.hypot(x - s.x, y - s.y) < 0.15);
    for (const lv0 of levels) {
      const lv = lv0 + 1e-7; // a grid point exactly on the level would break the line
      for (let j = 0; j < ny; j++) for (let i = 0; i < n; i++) {
        const xs = x0 + i * dx, ys = y0 + j * dx, v = [V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]], p = [[xs, ys], [xs + dx, ys], [xs + dx, ys + dx], [xs, ys + dx]];
        if (near(xs, ys) || (c.kind === 'image' && ys < c.plate)) continue;
        const pts = [];
        for (let e = 0; e < 4; e++) {
          const a = v[e], b = v[(e + 1) % 4];
          if ((a - lv) * (b - lv) < 0) { const t = (lv - a) / (b - a), A = p[e], B = p[(e + 1) % 4]; pts.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]); }
        }
        if (pts.length >= 2) segs.push([pts[0], pts[1]]);
        if (pts.length === 4) segs.push([pts[2], pts[3]]);
      }
    }
    return segs;
  }

  // ---------------------------------------------------------------- drawing
  const svg = (w, h, body, label, cls = '') => `<svg class="ef ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  const txt = (x, y, s, cls = 'lbl', anchor = 'middle') => `<text class="${cls}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}">${s}</text>`;
  const head = (x, y, ux, uy, cls, H = 9, B = 4) => { const bx = x - H * ux, by = y - H * uy; return `<polygon class="${cls}" points="${f1(x)},${f1(y)} ${f1(bx - B * uy)},${f1(by + B * ux)} ${f1(bx + B * uy)},${f1(by - B * ux)}"/>`; };
  function arrow(x1, y1, x2, y2, cls, w = 2.4) {
    const d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    return `<line class="${cls}" stroke-width="${w}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2 - 7 * ux)}" y2="${f1(y2 - 7 * uy)}"/>` + head(x2, y2, ux, uy, `${cls}-head`);
  }
  // a charge: its sign (or its name, for a charge to be found), larger for a larger charge
  function charge(X, Y, q, o = {}) {
    const r = 9 + 3 * Math.min(2, Math.abs(q) - 1), cls = o.unknown ? 'neu' : q > 0 ? 'pos' : q < 0 ? 'neg' : 'neu';
    const lbl = o.label != null ? o.label : q > 0 ? (Math.abs(q) > 1 ? `+${Math.abs(q)}` : '+') : q < 0 ? (Math.abs(q) > 1 ? `−${Math.abs(q)}` : '−') : '0';
    return `<circle class="charge ${cls}" cx="${f1(X)}" cy="${f1(Y)}" r="${r}"/>` + txt(X, Y + 4.5, lbl, lbl.length > 2 ? 'sign small' : 'sign');
  }
  // o: { box, W, lines (or given: an array of lines), reverse (arrows the wrong way), equi (levels),
  //      labels (charge labels), unknown (charges grey with their names), points [{ x, y, name }],
  //      vecs [{ x, y, dx, dy (px), cls, name }], rods [[x1, y1, x2, y2]], parts [{ x, y, q, sym }]
  //      (particles), names [{ x, y, name }], small; equipotentials: equi (levels; of o.alt if given),
//      equiLines (o.given drawn as equipotentials), circles (radii, around o.centres), vlines,
//      tops [{ x, label }] (above the lines), labelsAt [{ x, y, label }]; extra (more field lines) }
  function fig(c, o = {}) {
    const box = o.box || [-3, 3, -2.2, 2.2], [x0, x1, y0, y1] = box, W = o.W || (o.small ? 260 : 380), S = W / (x1 - x0), H = Math.round((y1 - y0) * S);
    const X = (x) => (x - x0) * S, Y = (y) => (y1 - y) * S, id = `efc${++uid}`;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/><clipPath id="${id}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath><g clip-path="url(#${id})">`;
    // a grid (o.grid: lines at whole units) or the axis through the charges (o.axis)
    if (o.grid) { for (let x = Math.ceil(x0); x <= x1; x++) s += `<line class="grid" x1="${f1(X(x))}" y1="0" x2="${f1(X(x))}" y2="${H}"/>`; for (let y = Math.ceil(y0); y <= y1; y++) s += `<line class="grid" x1="0" y1="${f1(Y(y))}" x2="${W}" y2="${f1(Y(y))}"/>`; }
    if (o.axis) s += `<line class="axisline" x1="0" y1="${f1(Y(0))}" x2="${W}" y2="${f1(Y(0))}"/>`;
    // conductors
    if (c.kind === 'image') s += `<rect class="metal" x="0" y="${f1(Y(c.plate))}" width="${W}" height="${f1(H - Y(c.plate))}"/><line class="metal-edge" x1="0" y1="${f1(Y(c.plate))}" x2="${W}" y2="${f1(Y(c.plate))}"/>`;
    if (c.kind === 'cylinder' || c.kind === 'flow') s += `<circle class="metal" cx="${f1(X(0))}" cy="${f1(Y(0))}" r="${f1(c.a * S)}"/>`;
    if (c.kind === 'plates') for (const sg of [1, -1]) s += `<rect class="plate" x="${f1(X(-c.w))}" y="${f1(Y(sg * c.h) - 3)}" width="${f1(2 * c.w * S)}" height="6"/>` + txt(X(-c.w) - 10, Y(sg * c.h) + 5, sg * c.q > 0 ? '+' : '−', 'sign big', 'end');
    // plates of a mixed arrangement, their signs (or names) at the left, above them
    if (c.kind === 'mixed') for (const p of c.plates) {
      s += `<rect class="plate${o.unknown ? ' neu' : ''}" x="${f1(X(p.a))}" y="${f1(Y(p.y) - 3)}" width="${f1((p.b - p.a) * S)}" height="6"/>`;
      const lx = Math.max(X(p.a), 4) + 4, ly = Y(p.y) - 12;
      s += o.unknown ? txt(lx, ly, p.name || 'A', 'lbl name', 'start') : txt(lx, ly + 4, p.s > 0 ? '+' : '−', 'sign big plate-sign', 'start');
    }
    // equipotentials: contours (of o.alt, another arrangement, for a wrong picture), given lines
    // (o.equiLines), circles around the centres, vertical lines
    if (o.equi) for (const [a, b] of contours(o.alt || c, box, o.equi, { n: o.small ? 70 : 120 })) s += `<line class="equi" x1="${f1(X(a[0]))}" y1="${f1(Y(a[1]))}" x2="${f1(X(b[0]))}" y2="${f1(Y(b[1]))}"/>`;
    const poly = (ln, cls) => `<path class="${cls}" d="M${ln.map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(' L')}"/>`;
    if (o.equiLines) for (const ln of o.given || []) s += poly(ln, 'equi');
    for (const [cx, cy] of o.circles ? o.centres || [[0, 0]] : []) for (const rr of o.circles) s += `<circle class="equi" cx="${f1(X(cx))}" cy="${f1(Y(cy))}" r="${f1(rr * S)}" fill="none"/>`;
    for (const x of o.vlines || []) s += poly([[x, y0 - 1], [x, y1 + 1]], 'equi');
    // field lines with arrowheads
    // a straight line given by its two ends gets points in between (for its arrowhead)
    const dense = (ln) => (ln.length !== 2 ? ln : Array.from({ length: 161 }, (x, k) => [ln[0][0] + ((ln[1][0] - ln[0][0]) * k) / 160, ln[0][1] + ((ln[1][1] - ln[0][1]) * k) / 160]));
    const ls = (o.equiLines ? [] : o.given || (o.lines ? lines(c, box, o.lineOpts || {}) : [])).concat(o.extra || []).map(dense);
    for (const ln of ls) {
      const pts = ln.filter((p, i) => i % 2 === 0 || i === ln.length - 1);
      if (pts.length < 2) continue;
      s += `<path class="fline" d="M${pts.map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(' L')}"/>`;
      // the arrowhead where the line is in view, a third of the way along
      const vis = ln.filter((p) => p[0] > x0 + 0.1 && p[0] < x1 - 0.1 && p[1] > y0 + 0.1 && p[1] < y1 - 0.1);
      if (vis.length > 6) {
        const k = Math.floor(vis.length * (o.arrowAt || 0.45)), a = vis[k], b = vis[Math.min(vis.length - 1, k + 2)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const ux = ((b[0] - a[0]) / d) * (o.reverse ? -1 : 1), uy = (-(b[1] - a[1]) / d) * (o.reverse ? -1 : 1);
        s += head(X(a[0]) + 4 * ux, Y(a[1]) + 4 * uy, ux, uy, 'fline-head', 8, 3.6);
      }
    }
    s += '</g>';
    // the charges, the points, the vectors
    if (c.kind === 'points' || c.kind === 'image' || c.kind === 'mixed') {
      const shown = c.kind === 'image' ? [c.charge] : c.charges;
      shown.forEach((ch, i) => { s += charge(X(ch.x), Y(ch.y), ch.q, { unknown: o.unknown, label: o.unknown ? ch.name || 'ABC'[i] : o.labels ? o.labels[i] : null }); });
    }
    for (const r of o.rods || []) s += `<line class="rod" x1="${f1(X(r[0]))}" y1="${f1(Y(r[1]))}" x2="${f1(X(r[2]))}" y2="${f1(Y(r[3]))}"/>`;
    for (const pt of o.parts || []) s += particle(X(pt.x), Y(pt.y), pt.r || 11, pt.q, pt.sym);
    for (const n of o.names || []) s += txt(X(n.x) + 14, Y(n.y) - 12, n.name, 'lbl name', 'start');
    for (const t of o.labelsAt || []) s += txt(X(t.x) + 4, Y(t.y), t.label, 'lbl small equi-lbl', 'start');
    for (const p of o.points || []) s += `<circle class="pt" cx="${f1(X(p.x))}" cy="${f1(Y(p.y))}" r="3.6"/>` + txt(X(p.x) + 8, Y(p.y) - 8, p.name, 'lbl', 'start');
    for (const v of o.vecs || []) s += arrow(X(v.x), Y(v.y), X(v.x) + v.dx, Y(v.y) - v.dy, v.cls || 'v-field') + (v.name ? txt(X(v.x) + v.dx + (v.dx >= 0 ? 8 : -8), Y(v.y) - v.dy - 6, v.name, `lbl ${v.cls || 'v-field'}-lbl`, v.dx >= 0 ? 'start' : 'end') : '');
    // labels above the picture (o.tops), in a strip of their own, kept inside at the edges
    if (o.tops) {
      const T = 24, tops = o.tops.map((t) => { const x = X(t.x); return txt(x, 17, String(t.label).replace(/-(?=\d)/g, '−'), 'lbl small', x < 36 ? 'start' : x > W - 36 ? 'end' : 'middle'); }).join('');
      s = `<rect class="bg" x="0" y="0" width="${W}" height="${H + T}"/>${tops}<g transform="translate(0,${T})">${s}</g>`;
      return svg(W, H + T, s, o.label || L('Field lines of the arrangement', 'Feldlinien der Anordnung'), o.small ? 'small' : '');
    }
    return svg(W, H, s, o.label || L('Field lines of the arrangement', 'Feldlinien der Anordnung'), o.small ? 'small' : '');
  }

  // a particle: its symbol (a named one, in a neutral colour, its sign not shown) or its sign
  function particle(X, Y, r, q, sym) {
    return `<circle class="charge ${sym ? 'named' : q > 0 ? 'pos' : q < 0 ? 'neg' : 'neu'}" cx="${f1(X)}" cy="${f1(Y)}" r="${r}"/>` +
      txt(X, Y + 4.5, sym || (q > 0 ? '+' : q < 0 ? '−' : '0'), `sign${sym && sym.length > 2 ? ' small' : ''}`);
  }
  // a direction as a small picture: an arrow in the page, or a dot for none
  function icon(d) {
    const c = 22;
    if (!d) return svg(44, 44, `<circle class="pt" cx="${c}" cy="${c}" r="4"/>`, L('none', 'keine'), 'icon');
    const l = Math.hypot(d[0], d[1]), ux = d[0] / l, uy = -d[1] / l;
    return svg(44, 44, arrow(c - 15 * ux, c - 15 * uy, c + 16 * ux, c + 16 * uy, 'v-dir', 3), L('an arrow', 'ein Pfeil'), 'icon');
  }
  // a graph E(r) (or E(x)): f on [0, xmax], scaled to its largest value in view
  function graph(f, o = {}) {
    const W = o.small ? 240 : 320, H = o.small ? 150 : 190, L0 = 30, B = 26, T = 14, R = 12, xmax = o.xmax || 4, ymax = o.ymax || 1.1;
    const X = (x) => L0 + (x / xmax) * (W - L0 - R), Y = (y) => H - B - (Math.min(y, ymax) / ymax) * (H - B - T);
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    s += arrow(L0, H - B, W - 4, H - B, 'axis', 1.3) + arrow(L0, H - B, L0, 4, 'axis', 1.3);
    s += txt(W - 6, H - 8, `<tspan class="it">${o.xname || 'r'}</tspan>`, 'lbl', 'end') + txt(L0 - 6, 14, '<tspan class="it">E</tspan>', 'lbl', 'end');
    for (const m of o.marks || []) s += `<line class="gmark" x1="${f1(X(m.x))}" y1="${f1(T)}" x2="${f1(X(m.x))}" y2="${f1(H - B)}"/>` + txt(X(m.x), H - B + 14, m.name, 'lbl small');
    // gaps: above the top (no plateau), and at a jump (no vertical line)
    let d = '', pen = false, last = null;
    for (let k = 0; k <= 300; k++) {
      const x = (xmax * k) / 300, y = f(x);
      if (y == null || !Number.isFinite(y) || y > ymax * 1.05) { pen = false; last = null; continue; }
      if (last != null && Math.abs(y - last) > 0.25 * ymax) pen = false;
      d += `${pen ? ' L' : 'M'}${f1(X(x))},${f1(Y(y))}`; pen = true; last = y;
    }
    s += `<clipPath id="gc${++uid}"><rect x="${L0}" y="${T - 2}" width="${W - L0}" height="${H - B - T + 2}"/></clipPath><path class="gcurve" clip-path="url(#gc${uid})" d="${d}"/>`;
    return svg(W, H, s, o.label || L('A graph of the field strength', 'Ein Graph der Feldstärke'), o.small ? 'small' : '');
  }
  // a capacitor with horizontal plates (the upper one + if top > 0) and a path through it
  function capFig(o) {
    const W = o.small ? 260 : 360, H = o.small ? 170 : 220, x0 = 50, x1 = W - 40, yt = 40, yb = H - 40, cy = (yt + yb) / 2;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    s += `<rect class="plate" x="${x0}" y="${yt - 6}" width="${x1 - x0}" height="6"/><rect class="plate" x="${x0}" y="${yb}" width="${x1 - x0}" height="6"/>`;
    s += txt(x0 - 10, yt + 2, o.top > 0 ? '+' : '−', 'sign big', 'end') + txt(x0 - 10, yb + 10, o.top > 0 ? '−' : '+', 'sign big', 'end');
    if (o.pts && o.pts.length > 1) s += `<path class="traj" d="M${o.pts.map((p) => `${f1(x0 - 30 + p[0] * (x1 - x0 + 30))},${f1(cy - p[1] * (yb - yt) / 2)}`).join(' L')}"/>`;
    if (o.field) for (const x of [x0 + 40, (x0 + x1) / 2, x1 - 40]) s += o.top > 0 ? arrow(x, yt + 6, x, yt + 34, 'v-field', 1.8) : arrow(x, yb - 6, x, yb - 34, 'v-field', 1.8);
    s += particle(x0 - 30, cy, 11, o.q, o.sym) + (o.v ? arrow(x0 - 16, cy, x0 + 22, cy, 'v-vel', 2.2) : '');
    return svg(W, H, s, o.label || L('A charge flying into a capacitor', 'Eine Ladung fliegt in einen Kondensator'), o.small ? 'small' : '');
  }

  const api = { sources, field, potential, trace, lines, contours, fig, arrow, txt, svg, charge, head, particle, icon, graph, capFig };
  root.Charges = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
