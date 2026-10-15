// SVG drawings of magnetic forces. The page plane is x (right), y (up); out of the page is drawn ⊙,
// into it ⊗. Colours by quantity: velocity and current blue, field green, force red.
//   icon(d)          a direction as a small picture: an arrow in the page, or ⊙ / ⊗
//   scene(o)         charges and wires with their vectors: o = { field: { dir } (drawn as field
//                    lines or a grid of ⊙ / ⊗), items: [{ kind: 'particle', q, at, sym (a named
//                    particle's symbol, drawn instead of its sign) } | { kind: 'piece'
//                    (a short wire), d, at } | { kind: 'wire' (a long wire through at), d, at, name }],
//                    vecs: [{ of (item index), kind: 'v' | 'I' | 'F' | 'B', dir, unknown, name, len (px),
//                    beside (the name beside the arrow, not beyond its tip) }],
//                    points: [{ at, name }],
//                    links: [[i, j]] (a coil seen edge-on from item i to item j, turning about
//                    its middle) }
//   sceneAt(p, o)    where the point p = [x, y] of a scene lies in its svg (in practice the student
//                    draws a vector there, app.js), and spots: the places of the ⊙ ⊗ the scene o
//                    draws for its vectors out of or into the page
//   linesFig(o)      the field lines of a wire, a loop, a solenoid or a bar magnet, right or with
//                    a typical error (see there)
(function (root) {
  'use strict';

  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const f1 = (x) => Math.round(x * 10) / 10;
  let uid = 0;

  // ---------------------------------------------------------------- pieces
  const head = (x, y, ux, uy, cls, H = 10, B = 4.5) => {
    const bx = x - H * ux, by = y - H * uy;
    return `<polygon class="${cls}" points="${f1(x)},${f1(y)} ${f1(bx - B * uy)},${f1(by + B * ux)} ${f1(bx + B * uy)},${f1(by - B * ux)}"/>`;
  };
  // an arrow from (x1, y1) to (x2, y2) in SVG coordinates
  function arrow(x1, y1, x2, y2, cls, w = 2.6) {
    const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    return `<line class="${cls}" stroke-width="${w}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2 - 8 * ux)}" y2="${f1(y2 - 8 * uy)}"/>` + head(x2, y2, ux, uy, `${cls}-head`);
  }
  // ⊙ (out of the page) or ⊗ (into it) at (x, y), radius r
  function dotCross(x, y, r, out, cls) {
    return `<circle class="${cls} sym" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>` + (out
      ? `<circle class="${cls}-head" cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.28)}"/>`
      : `<path class="${cls}" stroke-width="1.8" d="M${f1(x - r * 0.62)} ${f1(y - r * 0.62)} L${f1(x + r * 0.62)} ${f1(y + r * 0.62)} M${f1(x + r * 0.62)} ${f1(y - r * 0.62)} L${f1(x - r * 0.62)} ${f1(y + r * 0.62)}"/>`);
  }
  // a charged particle at (x, y): its symbol (a named particle, in a neutral colour, its sign not
  // shown) or its sign (+, −, 0) on a colour by sign
  const particle = (x, y, r, q, sym) => `<circle class="particle ${sym ? 'named' : q > 0 ? 'pos' : q < 0 ? 'neg' : 'neu'}" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>` +
    txt(x, y + (sym ? 4.5 : 5), sym || (q > 0 ? '+' : q < 0 ? '−' : '0'), `sign${sym && sym.length > 2 ? ' long' : ''}`);
  const svg = (w, h, body, label, cls = '') => `<svg class="mf ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  const txt = (x, y, s, cls = 'lbl', anchor = 'middle') => `<text class="${cls}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}">${s}</text>`;

  // ---------------------------------------------------------------- a direction
  function icon(d) {
    const c = 22;
    if (!d) return svg(44, 44, txt(c, c + 5, '0', 'lbl'), L('no direction', 'keine Richtung'), 'icon');
    if (d[2]) return svg(44, 44, dotCross(c, c, 14, d[2] > 0, 'v-dir'), d[2] > 0 ? L('out of the page', 'aus der Seite heraus') : L('into the page', 'in die Seite hinein'), 'icon');
    const l = Math.hypot(d[0], d[1]), ux = d[0] / l, uy = -d[1] / l;
    return svg(44, 44, arrow(c - 15 * ux, c - 15 * uy, c + 16 * ux, c + 16 * uy, 'v-dir', 3), L('an arrow', 'ein Pfeil'), 'icon');
  }

  // ---------------------------------------------------------------- a scene
  const NAME = { v: 'v', I: 'I', F: 'F', B: 'B' }, CLS = { v: 'v-vel', I: 'v-vel', F: 'v-force', B: 'v-field' };
  const SC = { W: 340, H: 250, S: 62 };
  // a point of the scene in the svg, and the ⊙ ⊗ of its vectors (as drawn below: beside their item,
  // one slot further right for each, an unknown one taking a slot too)
  function sceneAt(p, o = {}) {
    const at = [SC.W / 2 + p[0] * SC.S, SC.H / 2 + 6 - p[1] * SC.S];
    let slot = 0;
    const spots = [];
    (o.vecs || []).forEach((v) => {
      if (v.kind === 'I') return;
      if (v.unknown) { slot++; return; }
      if (v.dir[2]) { const it = o.items[v.of]; spots.push([SC.W / 2 + it.at[0] * SC.S + 30 + 30 * slot, SC.H / 2 + 6 - it.at[1] * SC.S - 30]); slot++; }
    });
    return { at, spots, slot };
  }
  function scene(o) {
    const { W, H, S } = SC, cx = W / 2, cy = H / 2 + 6, X = (x) => cx + x * S, Y = (y) => cy - y * S;
    let s = '';
    const fd = o.field && o.field.dir;
    if (fd && fd[2]) {
      for (let x = 22; x < W; x += 34) for (let y = 22; y < H; y += 34) s += dotCross(x, y, 5, fd[2] > 0, 'v-field faint');
      s += txt(W - 8, 16, `<tspan class="it">B</tspan>`, 'lbl c-field', 'end');
    } else if (fd) {
      const l = Math.hypot(fd[0], fd[1]), ux = fd[0] / l, uy = -fd[1] / l, nx = -uy, ny = ux;
      for (let k = -4; k <= 4; k++) {
        const ox = cx + nx * k * 34, oy = cy + ny * k * 34;
        s += `<line class="v-field faint" x1="${f1(ox - ux * 400)}" y1="${f1(oy - uy * 400)}" x2="${f1(ox + ux * 400)}" y2="${f1(oy + uy * 400)}"/>`;
        for (const t of [-120, 0, 120]) { const px = ox + ux * t, py = oy + uy * t; if (px > 8 && px < W - 8 && py > 8 && py < H - 8) s += head(px + ux * 6, py + uy * 6, ux, uy, 'v-field-head faint', 8, 3.5); }
      }
      s += txt(W - 8, 16, `<tspan class="it">B</tspan>`, 'lbl c-field', 'end');
    }
    s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>` + `<g clip-path="url(#mfc${++uid})"><clipPath id="mfc${uid}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>${s}</g>`;
    // a coil seen edge-on, and the axis it turns about
    (o.links || []).forEach(([i, j]) => {
      const a = o.items[i].at, b = o.items[j].at;
      s += `<line class="coil" x1="${f1(X(a[0]))}" y1="${f1(Y(a[1]))}" x2="${f1(X(b[0]))}" y2="${f1(Y(b[1]))}"/><circle class="pt" cx="${f1(X((a[0] + b[0]) / 2))}" cy="${f1(Y((a[1] + b[1]) / 2))}" r="3.5"/>`;
    });
    // the items
    const R = 13, ends = [];
    (o.items || []).forEach((it) => {
      const x = X(it.at[0]), y = Y(it.at[1]);
      if (it.kind === 'particle') {
        s += particle(x, y, R, it.q, it.sym);
        if (it.name) s += txt(x - R - 4, y - R - 2, it.name, 'lbl', 'end');
        ends.push(R);
      } else if (it.d[2]) {
        s += dotCross(x, y, R, it.d[2] > 0, 'v-wire') + (it.name ? txt(x - R - 4, y - R - 2, it.name, 'lbl', 'end') : '');
        ends.push(R);
      } else {
        const l = Math.hypot(it.d[0], it.d[1]), ux = it.d[0] / l, uy = -it.d[1] / l, half = it.kind === 'wire' ? 400 : 1.1 * S;
        s += `<line class="v-wire" x1="${f1(x - ux * half)}" y1="${f1(y - uy * half)}" x2="${f1(x + ux * half)}" y2="${f1(y + uy * half)}"/>` + head(x + ux * 12, y + uy * 12, ux, uy, 'v-wire-head', 12, 5.5);
        if (it.name) {
          const nx = -uy, ny = ux, tx = it.kind === 'wire' ? x - ux * 90 + nx * 14 : x + nx * 16, ty = it.kind === 'wire' ? y - uy * 90 + ny * 14 + 4 : y + ny * 16 + 4;
          s += txt(tx, ty, it.name, 'lbl');
        }
        ends.push(6);
      }
    });
    (o.points || []).forEach((p) => { s += `<circle class="pt" cx="${f1(X(p.at[0]))}" cy="${f1(Y(p.at[1]))}" r="4"/>` + txt(X(p.at[0]) + 9, Y(p.at[1]) - 8, p.name, 'lbl', 'start'); });
    // the vectors at their items
    let zSlot = 0;
    (o.vecs || []).forEach((v) => {
      const it = o.items[v.of], x = X(it.at[0]), y = Y(it.at[1]), cls = CLS[v.kind], name = `<tspan class="it">${v.name || NAME[v.kind]}</tspan>`;
      // a current is drawn on its wire (named there)
      if (v.kind === 'I') return;
      if (v.unknown) { s += txt(x + 22, y + 30 + 16 * zSlot++, `${name} = ?`, `lbl c-${v.kind === 'F' ? 'force' : v.kind === 'B' ? 'field' : 'vel'}`, 'start'); return; }
      if (v.dir[2]) {
        const sx = x + 30 + 30 * zSlot, sy = y - 30; zSlot++;
        s += dotCross(sx, sy, 9, v.dir[2] > 0, cls) + txt(sx + 13, sy - 8, name, `lbl c-${v.kind === 'F' ? 'force' : v.kind === 'B' ? 'field' : 'vel'}`, 'start');
        return;
      }
      const l = Math.hypot(v.dir[0], v.dir[1]), ux = v.dir[0] / l, uy = -v.dir[1] / l, r0 = ends[v.of] + 3, L0 = v.len || (v.kind === 'F' ? 66 : 74);
      const lc = `lbl c-${v.kind === 'F' ? 'force' : v.kind === 'B' ? 'field' : 'vel'}`;
      s += arrow(x + ux * r0, y + uy * r0, x + ux * (r0 + L0), y + uy * (r0 + L0), cls) + (v.beside
        ? txt(x + ux * (r0 + L0 / 2) + 10, y + uy * (r0 + L0 / 2) + 5, name, lc, 'start')
        : txt(x + ux * (r0 + L0 + 14) - uy * 8, y + uy * (r0 + L0 + 14) + ux * 8 + 5, name, lc));
    });
    return svg(W, H, s, o.label || L('A drawing of the situation', 'Eine Zeichnung der Situation'));
  }

  // ---------------------------------------------------------------- field lines
  // The sources, axis along x: a wire seen end-on, a loop and a solenoid in cross-section (the
  // conductors of the top row carry the current out of the page for s = +1), a bar magnet (its
  // north pole at the right for s = +1, the field inside it like that of the solenoid).
  const SOL = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
  const SOURCES = {
    wire: { wires: (s) => [{ x: 0, y: 0, s }], seeds: [0.55, 1.05, 1.6, 2.2], inside: () => false },
    loop: { wires: (s) => [{ x: 0, y: 0.85, s }, { x: 0, y: -0.85, s: -s }], seeds: [0, 0.3, -0.3, 0.6, -0.6], inside: (x, y) => Math.abs(x) < 0.4 && Math.abs(y) < 0.85 },
    solenoid: { wires: (s) => [...SOL.map((x) => ({ x, y: 0.7, s })), ...SOL.map((x) => ({ x, y: -0.7, s: -s }))], seeds: [0, 0.22, -0.22, 0.44, -0.44], inside: (x, y) => Math.abs(x) < 1.75 && Math.abs(y) < 0.7 },
  };
  SOURCES.magnet = SOURCES.solenoid;
  // o = { src, s, vertical (the axis up the page), wrong: null (the right field lines), 'reverse'
  // (every arrow turned round), 'inside' or 'outside' (the arrows turned round only inside or only
  // outside the loop, coil or magnet: lines that do not close), 'out' or 'in' (a wire: radial
  // lines), 'none' (no lines: the task), small }
  function linesFig(o) {
    const M = root.Magnet || require('./generator.js');
    const src = SOURCES[o.src], wires = src.wires(o.s), W = o.small ? 250 : 320, H = Math.round(W * (o.wrong === 'none' && (!o.vertical || o.src === 'loop') ? 0.42 : 0.78)), S = W / 5.8; // the task: only the source
    const rot = (p) => (o.vertical ? [-p[1], p[0]] : p), X = (p) => W / 2 + rot(p)[0] * S, Y = (p) => H / 2 - rot(p)[1] * S;
    const view = (p) => Math.abs(X(p) - W / 2) < W / 2 - 14 && Math.abs(Y(p) - H / 2) < H / 2 - 14;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`, lines = '';
    const flip = (p) => (o.wrong === 'reverse' || (o.wrong === 'inside' && src.inside(p[0], p[1])) || (o.wrong === 'outside' && !src.inside(p[0], p[1])) ? -1 : 1);
    const headAt = (p, d) => { const a = rot(d), l = Math.hypot(a[0], a[1]); return head(X(p) + (6 * a[0]) / l, Y(p) - (6 * a[1]) / l, a[0] / l, -a[1] / l, 'v-field-head', 10, 4.5); };
    if (o.wrong === 'out' || o.wrong === 'in') {
      for (let k = 0; k < 8; k++) {
        const t = (k * Math.PI) / 4 + Math.PI / 8, u = [Math.cos(t), Math.sin(t)], a = [0.45 * u[0], 0.45 * u[1]], b = [2.6 * u[0], 2.6 * u[1]];
        lines += `<line class="fl" x1="${f1(X(a))}" y1="${f1(Y(a))}" x2="${f1(X(b))}" y2="${f1(Y(b))}"/>` + headAt([1.3 * u[0], 1.3 * u[1]], o.wrong === 'out' ? u : [-u[0], -u[1]]);
      }
    } else if (o.wrong !== 'none') {
      for (const y0 of src.seeds) {
        const ln = M.fieldLine(wires, 0, y0, [-7, 7, -7, 7]), pts = ln.pts;
        lines += `<path class="fl" d="M${pts.map((p) => `${f1(X(p))},${f1(Y(p))}`).join(' L')}"/>`;
        // arrows at the start (near the axis: not crowded) and at the point of the line in view
        // farthest from it
        const i0 = o.src === 'wire' || Math.abs(y0) < 0.3 ? pts.findIndex((p) => p[0] === 0 && p[1] === y0) : -1;
        let far = -1, best = 0;
        pts.forEach((p, i) => { const d = Math.hypot(p[0], p[1] - y0); if (view(p) && d > best) { best = d; far = i; } });
        for (const i of [i0, far]) {
          if (i < 0 || !view(pts[i])) continue;
          const b = M.planeField(wires, pts[i][0], pts[i][1]), k = flip(pts[i]);
          lines += headAt(pts[i], [k * b[0], k * b[1]]);
        }
      }
    }
    // the source
    let body = '';
    if (o.src === 'magnet') {
      const c = [[-1.75, -0.55], [1.75, 0.55]].map(rot), x0 = W / 2 + Math.min(c[0][0], c[1][0]) * S, y0 = H / 2 - Math.max(c[0][1], c[1][1]) * S;
      const w = Math.abs(c[1][0] - c[0][0]) * S, h = Math.abs(c[1][1] - c[0][1]) * S, n = o.s > 0 ? 1 : -1, np = [n * 0.9, 0], sp = [-n * 0.9, 0];
      // the halves: north red, south green-grey
      const half = (sign, cls) => { const q = [[0, -0.55], [sign * 1.75, 0.55]].map(rot); return `<rect class="${cls}" x="${f1(W / 2 + Math.min(q[0][0], q[1][0]) * S)}" y="${f1(H / 2 - Math.max(q[0][1], q[1][1]) * S)}" width="${f1(Math.abs(q[1][0] - q[0][0]) * S)}" height="${f1(Math.abs(q[1][1] - q[0][1]) * S)}"/>`; };
      body += half(n, 'pole-n') + half(-n, 'pole-s') + `<rect class="magnet" x="${f1(x0)}" y="${f1(y0)}" width="${f1(w)}" height="${f1(h)}"/>`;
      body += txt(X(np), Y(np) + 6, 'N', 'pole') + txt(X(sp), Y(sp) + 6, 'S', 'pole');
    } else {
      if (o.src !== 'wire') {
        // the outline of the loop or coil (cut open), drawn faintly
        const tw = wires.filter((w) => w.y > 0), x0 = Math.min(...tw.map((w) => w.x)), x1 = Math.max(...tw.map((w) => w.x)), yy = tw[0].y;
        for (const x of [...new Set([x0, x1])]) body += `<line class="coil-cut" x1="${f1(X([x, yy]))}" y1="${f1(Y([x, yy]))}" x2="${f1(X([x, -yy]))}" y2="${f1(Y([x, -yy]))}"/>`;
      }
      for (const w of wires) body += dotCross(X([w.x, w.y]), Y([w.x, w.y]), o.small ? 7 : 8.5, w.s > 0, 'v-wire');
    }
    // the magnet is drawn under its field lines, the wires over them
    s += o.src === 'magnet' ? body + `<g class="lines">${lines}</g>` : `<g class="lines">${lines}</g>` + body;
    return svg(W, H, s, o.label || L('Field lines', 'Feldlinien'), o.small ? 'small' : '');
  }

  // ---------------------------------------------------------------- a coil in 3D
  // The rectangular coil of scene's links (a coil seen edge-on) in an oblique view: x to the right
  // and y up as in the drawing along the axis, the axis z (out of the page there) drawn receding
  // at the angle beta, shortened by k. So x and y keep their lengths and angles: the front end of
  // the coil is the drawing along the axis, and a turn anticlockwise there is anticlockwise here.
  // The coil sits between the poles N and S of a magnet, its field along ±x.
  // o = { phi (the angle of the coil to the field, degrees, side 1 at the angle phi from +x),
  //       s (the current in side 1: along +z for 1, the other way for -1), bx (the field ±x),
  //       forces (the forces on the two long sides), turn (+1 anticlockwise, -1 clockwise seen
  //       from the eye, 0 none), beta (35 or 145: by default the one further from phi, so that
  //       the coil is not seen edge-on) }
  function coil3d(o) {
    const a = 0.95, h = 3, k = 0.55, S = 56, X0 = 2.45, BW = 0.45, Y0 = 1.15, Z0 = 0.8;
    const far = (b) => { const d = (((o.phi - b) % 180) + 180) % 180; return Math.min(d, 180 - d); };
    const beta = o.beta || (far(145) >= far(35) ? 145 : 35), cb = Math.cos((beta * Math.PI) / 180), sb = Math.sin((beta * Math.PI) / 180);
    const u = [Math.cos((o.phi * Math.PI) / 180), Math.sin((o.phi * Math.PI) / 180)];
    const PX = (p) => (p[0] - k * p[2] * cb) * S, PY = (p) => -(p[1] - k * p[2] * sb) * S;
    // the size: the magnet, the axis with the eye, the coil turned any way with its forces
    const ze = h / 2 + 1.25, zt = -h / 2 - 2, rt = 0.33, ext = [];
    for (const x of [-X0 - BW, X0 + BW]) for (const y of [-Y0, Y0]) for (const z of [-Z0, Z0]) ext.push([x, y, z]);
    for (let t = 0; t < 360; t += 15) {
      const c = Math.cos((t * Math.PI) / 180), sn = Math.sin((t * Math.PI) / 180);
      ext.push([a * c, a * sn, h / 2], [a * c, a * sn, -h / 2], [rt * c, rt * sn, zt]);
    }
    ext.push([0, 0, ze + 0.3], [a, a + 0.95, 0], [-a, -a - 0.95, 0]);
    const xs = ext.map(PX), ys = ext.map(PY), x0 = Math.min(...xs) - 14, y0 = Math.min(...ys) - 22;
    const W = Math.round(Math.max(...xs) + 14 - x0), H = Math.round(Math.max(...ys) + 14 - y0);
    const X = (p) => PX(p) - x0, Y = (p) => PY(p) - y0, pt = (p) => `${f1(X(p))},${f1(Y(p))}`;
    const poly = (ps, cls) => `<polygon class="${cls}" points="${ps.map(pt).join(' ')}"/>`;
    const line = (p, q, cls) => `<line class="${cls}" x1="${f1(X(p))}" y1="${f1(Y(p))}" x2="${f1(X(q))}" y2="${f1(Y(q))}"/>`;
    // the screen direction of a direction in space, and the depth (larger: nearer the eye)
    const dirS = (d) => { const x = d[0] - k * d[2] * cb, y = -(d[1] - k * d[2] * sb), l = Math.hypot(x, y); return [x / l, y / l]; };
    const depth = (p) => p[0] * k * cb + p[1] * k * sb + p[2];
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    // the poles: the field runs from N to S; of each block its front, its top and the side towards the eye
    for (const side of [-1, 1]) {
      const xa = side * X0, xb = side * (X0 + BW), xl = Math.min(xa, xb), xr = Math.max(xa, xb), xs2 = cb > 0 ? xr : xl, north = side === -o.bx;
      const cls = `pole3 ${north ? 'pole-n' : 'pole-s'}`;
      s += poly([[xs2, -Y0, -Z0], [xs2, Y0, -Z0], [xs2, Y0, Z0], [xs2, -Y0, Z0]], cls) + poly([[xs2, -Y0, -Z0], [xs2, Y0, -Z0], [xs2, Y0, Z0], [xs2, -Y0, Z0]], 'shade2');
      s += poly([[xl, Y0, -Z0], [xr, Y0, -Z0], [xr, Y0, Z0], [xl, Y0, Z0]], cls) + poly([[xl, Y0, -Z0], [xr, Y0, -Z0], [xr, Y0, Z0], [xl, Y0, Z0]], 'shade1');
      s += poly([[xl, -Y0, Z0], [xr, -Y0, Z0], [xr, Y0, Z0], [xl, Y0, Z0]], cls);
      s += txt(X([(xl + xr) / 2, 0, Z0]), Y([(xl + xr) / 2, 0, Z0]) + 6, north ? 'N' : 'S', 'pole');
    }
    // the field: lines from N to S, above and below the coil
    const gap = 0.3, fx = X0 - gap, bd = dirS([o.bx, 0, 0]);
    for (const y of [-1, 1]) {
      for (const z of [-0.55, 0.55]) {
        s += line([-fx, y, z], [fx, y, z], 'v-field faint3');
        for (const x of [-1.45, 1.45]) { const p = [x, y, z]; s += head(X(p) + 6 * bd[0], Y(p) + 6 * bd[1], bd[0], bd[1], 'v-field-head', 9, 4); }
      }
    }
    // its name at an arrow head away from the forces and the turn, wherever they point (so that
    // its place does not tell them)
    const busy = [[0, 0, zt]];
    for (const side of [1, -1]) for (const up of [1, -1]) busy.push([side * a * u[0], side * a * u[1] + up * 0.95, 0], [side * a * u[0], side * a * u[1] + up * 0.5, 0]);
    const spots = [];
    for (const [y, z] of [[1, -0.55], [-1, 0.55]]) for (const x of [-1.45, 1.45]) spots.push([X([x, y, z]) + 2, Y([x, y, z]) + (y > 0 ? -9 : 19)]);
    const room = (q) => Math.min(...busy.map((b) => Math.hypot(X(b) + 12 - q[0], Y(b) - q[1])));
    const bs = spots.reduce((m, q) => (room(q) > room(m) + 0.5 ? q : m));
    s += txt(bs[0], bs[1], '<tspan class="it">B</tspan>', 'lbl c-field');
    // the coil: its plane faintly, the axis (dashed), then the four sides from the back to the front
    const C = (side, z) => [side * a * u[0], side * a * u[1], z];
    s += poly([C(1, -h / 2), C(1, h / 2), C(-1, h / 2), C(-1, -h / 2)], 'coil-face');
    s += line([0, 0, zt - 0.15], [0, 0, h / 2 + 0.45], 'axis3');
    const zs = o.s * h / 2; // the current: along side 1 to z = zs, across, back along side 2
    const sides = [[C(1, -zs), C(1, zs)], [C(1, zs), C(-1, zs)], [C(-1, zs), C(-1, -zs)], [C(-1, -zs), C(1, -zs)]];
    sides.slice().sort((p, q) => depth(p[0]) + depth(p[1]) - depth(q[0]) - depth(q[1])).forEach(([p, q]) => {
      // the arrow of a long side off its middle, where its force starts
      const f = p[2] === q[2] ? 0.5 : 0.78, m = [0, 1, 2].map((i) => p[i] + f * (q[i] - p[i])), d = dirS([q[0] - p[0], q[1] - p[1], q[2] - p[2]]);
      s += line(p, q, 'coil coil3') + head(X(m) + 7 * d[0], Y(m) + 7 * d[1], d[0], d[1], 'v-wire-head', 12, 5.5);
    });
    // the sides 1 and 2, named at their front ends as in the drawing along the axis
    const front = dirS([0, 0, 1]);
    for (const side of [1, -1]) {
      const p = C(side, h / 2), o2 = dirS([side * u[0], side * u[1], 0]);
      s += txt(X(p) + 12 * o2[0] + 6 * front[0], Y(p) + 12 * o2[1] + 6 * front[1] + 5, side > 0 ? '1' : '2', 'lbl');
    }
    // the forces on the long sides: F = I·L × B, along +y on side 1 for s·bx > 0
    if (o.forces) {
      const fy = o.s * o.bx;
      // forces that point at each other along one line (the coil across the field): shorter, named beside
      const meet = fy * u[1] < 0 && Math.abs(u[0]) < 0.3;
      for (const side of [1, -1]) {
        const p = C(side, 0), q = [p[0], p[1] + side * fy * (meet ? 0.6 : 0.95), 0], F = '<tspan class="it">F</tspan>';
        const out = X([0, 0, zt]) < X([0, 0, 0]) ? 1 : -1; // the name on the side away from the turn
        s += arrow(X(p), Y(p) - (side * fy > 0 ? 4 : -4), X(q), Y(q), 'v-force') + (meet
          ? txt((X(p) + X(q)) / 2 - 9, (Y(p) + Y(q)) / 2 + 5, F, 'lbl c-force', 'end')
          : txt(X(q) + out * 11, Y(q) + (side * fy > 0 ? 8 : 4), F, 'lbl c-force', out > 0 ? 'start' : 'end'));
      }
    }
    // the eye on the axis, looking along it at the coil as in the drawing along the axis
    {
      const E = [0, 0, ze], d = dirS([0, 0, -1]), n = [-d[1], d[0]], ex = X(E), ey = Y(E);
      s += arrow(X([0, 0, ze - 0.35]), Y([0, 0, ze - 0.35]), X([0, 0, h / 2 + 0.5]), Y([0, 0, h / 2 + 0.5]), 'view', 1.6);
      s += `<path class="eye" d="M${f1(ex - 12 * d[0])} ${f1(ey - 12 * d[1])} Q${f1(ex + 10 * n[0])} ${f1(ey + 10 * n[1])} ${f1(ex + 12 * d[0])} ${f1(ey + 12 * d[1])} Q${f1(ex - 10 * n[0])} ${f1(ey - 10 * n[1])} ${f1(ex - 12 * d[0])} ${f1(ey - 12 * d[1])} Z"/>` +
        `<circle class="pupil" cx="${f1(ex + 3 * d[0])}" cy="${f1(ey + 3 * d[1])}" r="3.4"/>`;
    }
    // the sense of rotation: an arc about the axis well behind the coil, clear of the forces (a circle about the axis keeps its shape)
    if (o.turn) {
      // open towards the back, so that its ends stay clear of the coil and the forces
      const bk = dirS([0, 0, -1]), g = (Math.atan2(-bk[1], bk[0]) * 180) / Math.PI, e0 = g + 65, e1 = g + 295;
      const c = [0, 0, zt], r = rt * S, cx = X(c), cy = Y(c), t0 = o.turn > 0 ? e0 : e1, t1 = o.turn > 0 ? e1 : e0;
      const P = (t) => [cx + r * Math.cos((t * Math.PI) / 180), cy - r * Math.sin((t * Math.PI) / 180)];
      const p0 = P(t0), p1 = P(t1 - o.turn * 14), tip = P(t1), tg = [tip[0] - p1[0], tip[1] - p1[1]], tl = Math.hypot(tg[0], tg[1]);
      s += `<path class="turn" d="M${f1(p0[0])} ${f1(p0[1])} A${f1(r)} ${f1(r)} 0 1 ${o.turn > 0 ? 0 : 1} ${f1(p1[0])} ${f1(p1[1])}"/>` + head(tip[0], tip[1], tg[0] / tl, tg[1] / tl, 'turn-head', 10, 5);
    }
    return svg(W, H, s, o.label || L('The coil in 3D between the poles of a magnet', 'Die Spule räumlich zwischen den Polen eines Magneten'), 'coil3d');
  }

  const api = { icon, scene, sceneAt, linesFig, arrow, dotCross, coil3d };
  root.MagPlot = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
