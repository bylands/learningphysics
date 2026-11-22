// The physics and the drawings of Acceleration Voltage: three fields, their potentials, field
// lines and equipotentials, a charged particle on its way from A to B, and energy bars.
//   fields (cfg):
//     { kind: 'bent' }      a field that runs to the right and bends downwards (as in the textbook
//                           figure): the real part of the analytic f(z) = z + i·D·(1 + tanh(z/w))/2,
//                           so it is free of charges; V = 500 V − 140 V·Re f, about 920 V on the
//                           left to 80 V on the right (one drawing unit is 1 cm)
//     { kind: 'plates', VL, VR }  two plates at x = ±PX, the potentials VL (left) and VR (right) in V,
//                           a uniform field between them, no field outside
//     { kind: 'nucleus', Z }      a nucleus of charge Z·e at (NX, 0); one drawing unit is 10 fm,
//                           V = k·Z·e/r = Z·1.44 MV·fm / r
//   V(cfg, x, y) the potential in V, E(cfg, x, y) the field [Ex, Ey] (V per drawing unit)
//   fieldFig(cfg, o)  an SVG of the field: field lines (gold, E), equipotentials (dashed), points,
//                     a dashed path, velocity arrows (blue), a particle (red), labels; o.data adds
//                     data-* (the explorer's figure, explore.js)
//   bars(groups, o)   energy bars: per state { name, pot, kin } (E_pot blue, E_kin red, the
//                     total grey), zero line, optional values
//   PARTS             the particles of the exercises: charge in e, mass in u and kg
(function (root) {
  'use strict';

  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const f1 = (x) => Math.round(x * 10) / 10;
  const nice = (x) => String(Number(x.toPrecision(3)));
  let uid = 0;

  // ---------------------------------------------------------------- constants and particles
  const e = 1.602176634e-19, u = 1.66053907e-27, me = 9.1093837e-31, mp = 1.67262192e-27;
  const KE = 1.44; // k·e² in MeV·fm
  // [id, [en, de] with the article, [en, de] the name alone, symbol, charge in e, mass in kg, mass number A (0: an electron)]
  const PARTS = {
    p: { q: 1, m: mp, A: 1, sym: 'p', names: [['a proton', 'ein Proton'], ['proton', 'Proton']] },
    d: { q: 1, m: 3.3435837e-27, A: 2, sym: 'd', names: [['a deuteron (²H⁺)', 'ein Deuteron (²H⁺)'], ['deuteron', 'Deuteron']] },
    t: { q: 1, m: 5.0073567e-27, A: 3, sym: 't', names: [['a triton (³H⁺)', 'ein Triton (³H⁺)'], ['triton', 'Triton']] },
    h: { q: 2, m: 5.0064127e-27, A: 3, sym: 'h', names: [['a helion (³He²⁺)', 'ein Helion (³He²⁺)'], ['helion', 'Helion']] },
    a: { q: 2, m: 6.6446573e-27, A: 4, sym: 'α', names: [['an alpha particle (⁴He²⁺)', 'ein Alphateilchen (⁴He²⁺)'], ['alpha particle', 'Alphateilchen']] },
    li: { q: 3, m: 7.0160034 * u, A: 7, sym: 'Li³⁺', names: [['a lithium ion (⁷Li³⁺)', 'ein Lithium-Ion (⁷Li³⁺)'], ['lithium ion', 'Lithium-Ion']] },
    c: { q: 6, m: 12 * u, A: 12, sym: 'C⁶⁺', names: [['a carbon ion (¹²C⁶⁺)', 'ein Kohlenstoff-Ion (¹²C⁶⁺)'], ['carbon ion', 'Kohlenstoff-Ion']] },
    e: { q: -1, m: me, A: 0, sym: 'e⁻', names: [['an electron', 'ein Elektron'], ['electron', 'Elektron']] },
    ep: { q: 1, m: me, A: 0, sym: 'e⁺', names: [['a positron', 'ein Positron'], ['positron', 'Positron']] },
    n: { q: 0, m: 1.67492750e-27, A: 1, sym: 'n', names: [['a neutron', 'ein Neutron'], ['neutron', 'Neutron']] },
  };
  const part = (id) => ({ id, ...PARTS[id], name: () => L(...PARTS[id].names[0]), short: () => L(...PARTS[id].names[1]) });

  // ---------------------------------------------------------------- the fields
  const D = 1.2, WB = 2.4, PX = 2.4, NX = 2.2;
  // f(z) = z + i·D·σ(z), σ = (1 + tanh(z/w))/2: [Re f, Im f]
  function bentF(x, y) {
    const a = (2 * x) / WB, b = (2 * y) / WB, den = Math.cosh(a) + Math.cos(b);
    const tr = Math.sinh(a) / den, ti = Math.sin(b) / den; // tanh(z/w)
    return [x - (D * ti) / 2, y + (D * (1 + tr)) / 2];
  }
  function V(c, x, y) {
    if (c.kind === 'bent') return 500 - 140 * bentF(x, y)[0];
    if (c.kind === 'plates') { const t = Math.max(-PX, Math.min(PX, x)); return c.VL + ((c.VR - c.VL) * (t + PX)) / (2 * PX); }
    if (c.kind === 'nucleus') return (c.Z * KE * 1e6) / ((c.scale || 10) * (Math.hypot(x - NX, y) || 1e-9));
    return 0;
  }
  function E(c, x, y) {
    const h = 1e-4;
    if (c.kind === 'plates') return Math.abs(x) <= PX ? [-(c.VR - c.VL) / (2 * PX), 0] : [0, 0];
    return [-(V(c, x + h, y) - V(c, x - h, y)) / (2 * h), -(V(c, x, y + h) - V(c, x, y - h)) / (2 * h)];
  }
  // the box of each field's drawing (drawing units)
  const BOX = { bent: [-3.2, 3.2, -1.9, 1.9], plates: [-3, 3, -1.7, 1.7], nucleus: [-3.4, 3.4, -1.9, 1.9] };

  // field lines: arrays of points, along the field
  function lines(c, box) {
    const [x0, x1, y0, y1] = box, out = [];
    if (c.kind === 'bent') {
      // the lines Im f = const, found for each x by bisection in y (Im f grows with y)
      for (const k of [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4]) {
        const lvl = k + D / 2, pts = [];
        for (let x = x0 - 0.2; x <= x1 + 0.2; x += 0.05) {
          let lo = -3.4, hi = 3.4;
          for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bentF(x, m)[1] < lvl) lo = m; else hi = m; }
          pts.push([x, (lo + hi) / 2]);
        }
        out.push(pts);
      }
      return out;
    }
    if (c.kind === 'plates') {
      const dir = c.VL >= c.VR ? 1 : -1;
      for (let y = -1.2; y <= 1.21; y += 0.6) { const a = [-PX, y], b = [PX, y]; out.push(dir > 0 ? [a, b] : [b, a]); }
      return out;
    }
    // a nucleus (a point charge): radial lines, outwards from a positive one, inwards to a negative one
    for (let k = 0; k < 16; k++) {
      const a = (2 * Math.PI * (k + 0.5)) / 16, pts = [];
      for (let r = 0.25; r < 8; r += 0.1) pts.push([NX + r * Math.cos(a), r * Math.sin(a)]);
      out.push(c.Z < 0 ? pts.reverse() : pts);
    }
    return out;
  }
  // equipotential segments by marching squares (the bent field), lines (plates), circles (nucleus)
  function contours(c, box, levels) {
    const n = 110, [x0, x1, y0, y1] = box, dx = (x1 - x0) / n, ny = Math.round((y1 - y0) / dx), segs = [], G = [];
    for (let j = 0; j <= ny; j++) { G.push([]); for (let i = 0; i <= n; i++) G[j].push(V(c, x0 + i * dx, y0 + j * dx)); }
    for (const lv0 of levels) {
      const lv = lv0 + 1e-7;
      for (let j = 0; j < ny; j++) for (let i = 0; i < n; i++) {
        const xs = x0 + i * dx, ys = y0 + j * dx, v = [G[j][i], G[j][i + 1], G[j + 1][i + 1], G[j + 1][i]], p = [[xs, ys], [xs + dx, ys], [xs + dx, ys + dx], [xs, ys + dx]], pts = [];
        for (let k = 0; k < 4; k++) {
          const a = v[k], b = v[(k + 1) % 4];
          if ((a - lv) * (b - lv) < 0) { const t = (lv - a) / (b - a), A = p[k], B = p[(k + 1) % 4]; pts.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]); }
        }
        if (pts.length >= 2) segs.push([pts[0], pts[1]]);
      }
    }
    return segs;
  }
  // the point on the field line through (x, y) where the potential is v (the bent field), by
  // bisection along the line Im f = const
  function onLine(c, x, y, v) {
    const lvl = bentF(x, y)[1], yAt = (xx) => { let lo = -3.4, hi = 3.4; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bentF(xx, m)[1] < lvl) lo = m; else hi = m; } return (lo + hi) / 2; };
    let lo = -4, hi = 4;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (V(c, m, yAt(m)) > v) lo = m; else hi = m; }
    const xx = (lo + hi) / 2;
    return [xx, yAt(xx)];
  }
  // the field line through (x, y) from x = xa to x = xb, as points (the bent field)
  function lineThrough(c, x, y, xa, xb) {
    const lvl = bentF(x, y)[1], pts = [];
    for (let k = 0; k <= 60; k++) {
      const xx = xa + ((xb - xa) * k) / 60;
      let lo = -3.4, hi = 3.4;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bentF(xx, m)[1] < lvl) lo = m; else hi = m; }
      pts.push([xx, (lo + hi) / 2]);
    }
    return pts;
  }

  // ---------------------------------------------------------------- drawing
  const svg = (w, h, body, label, cls = '', data = '') => `<svg class="ef av ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"${data}>${body}</svg>`;
  // an index as a lowered smaller tspan (V_A), in a label
  const sub = (s) => String(s).replace(/([A-Za-zΦφ])_([A-Za-z0-9]+)/g, (m, a, i, at, all) => `<tspan class="it">${a}</tspan><tspan class="sub" dy="0.3em">${i}</tspan>${at + m.length < all.length ? '<tspan dy="-0.3em">​</tspan>' : ''}`);
  const txt = (x, y, s, cls = 'lbl', anchor = 'middle') => `<text class="${cls}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}">${sub(s)}</text>`;
  const head = (x, y, ux, uy, cls, H = 9, B = 4) => { const bx = x - H * ux, by = y - H * uy; return `<polygon class="${cls}" points="${f1(x)},${f1(y)} ${f1(bx - B * uy)},${f1(by + B * ux)} ${f1(bx + B * uy)},${f1(by - B * ux)}"/>`; };
  function arrow(x1, y1, x2, y2, cls, w = 2.2) {
    const d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    return `<line class="${cls}" stroke-width="${w}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2 - 6 * ux)}" y2="${f1(y2 - 6 * uy)}"/>` + head(x2, y2, ux, uy, `${cls}-head`);
  }
  const Vname = () => L('V', 'Φ');
  // o: { box, W, equi (levels in V), equiLabels, points [{ x, y, name, v (a label, e.g. V_A), at ('above'|'below') }],
  //      path [[x, y]…] (dashed), vels [{ x, y, dx, dy (px), name }], part { x, y, q, sym, r },
  //      rods (the plates; drawn for 'plates'), tops [{ x, label }], label, data, cls, noLines, labelE }
  function fieldFig(c, o = {}) {
    const box = o.box || BOX[c.kind], [x0, x1, y0, y1] = box, W = o.W || 440, S = W / (x1 - x0), H = Math.round((y1 - y0) * S);
    const X = (x) => (x - x0) * S, Y = (y) => (y1 - y) * S, id = `avc${++uid}`;
    const pathOf = (ln) => `M${ln.map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(' L')}`;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/><clipPath id="${id}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath><g clip-path="url(#${id})">`;
    if (o.equi) {
      if (c.kind === 'plates') for (const v of o.equi) { const x = -PX + ((v - c.VL) / (c.VR - c.VL)) * 2 * PX; s += `<line class="equi" x1="${f1(X(x))}" y1="${f1(Y(1.5))}" x2="${f1(X(x))}" y2="${f1(Y(-1.5))}"/>`; }
      else if (c.kind === 'nucleus') for (const v of o.equi) s += `<circle class="equi" cx="${f1(X(NX))}" cy="${f1(Y(0))}" r="${f1(Math.abs((c.Z * KE * 1e6) / ((c.scale || 10) * v)) * S)}"/>`;
      else for (const [a, b] of contours(c, box, o.equi)) s += `<line class="equi" x1="${f1(X(a[0]))}" y1="${f1(Y(a[1]))}" x2="${f1(X(b[0]))}" y2="${f1(Y(b[1]))}"/>`;
    }
    if (!o.noLines) {
      for (const ln of lines(c, box)) {
        const dense = ln.length === 2 ? Array.from({ length: 41 }, (z, k) => [ln[0][0] + ((ln[1][0] - ln[0][0]) * k) / 40, ln[0][1] + ((ln[1][1] - ln[0][1]) * k) / 40]) : ln;
        s += `<path class="fline" d="${pathOf(dense)}"/>`;
        const vis = dense.filter((p) => p[0] > x0 + 0.1 && p[0] < x1 - 0.1 && p[1] > y0 + 0.1 && p[1] < y1 - 0.1);
        if (vis.length > 4) {
          const k = Math.floor(vis.length * (c.kind === 'nucleus' ? (c.Z < 0 ? 0.45 : 0.55) : 0.5)), a = vis[k], b = vis[Math.min(vis.length - 1, k + 1)], dd = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          s += head(X(a[0]) + (4 * (b[0] - a[0])) / dd, Y(a[1]) - (4 * (b[1] - a[1])) / dd, (b[0] - a[0]) / dd, -(b[1] - a[1]) / dd, 'fline-head', 10, 4.5);
        }
      }
    }
    s += '</g>';
    if (c.kind === 'plates' && !o.noPlates) {
      for (const [x, v] of [[-PX, c.VL], [PX, c.VR]]) s += `<rect class="plate" x="${f1(X(x) - 3)}" y="${f1(Y(1.5))}" width="6" height="${f1((Y(-1.5) - Y(1.5)))}"/>`;
    }
    if (c.kind === 'nucleus') s += `<circle class="charge ${c.Z < 0 ? 'neg' : 'pos'}" cx="${f1(X(NX))}" cy="${f1(Y(0))}" r="11"/>` + `<text class="sign" x="${f1(X(NX))}" y="${f1(Y(0) + 4.5)}" text-anchor="middle">${c.Z < 0 ? '−' : '+'}</text>`;
    if (o.labelE) { const [ex, ey] = o.labelE; s += txt(X(ex), Y(ey), '<tspan class="it">E</tspan>', 'lbl fl-lbl'); }
    if (o.path) s += `<path class="avpath" d="${pathOf(o.path)}"/>`;
    for (const v of o.vels || []) s += arrow(X(v.x), Y(v.y), X(v.x) + v.dx, Y(v.y) - v.dy, 'v-vel', 2.4) + (v.name ? txt(X(v.x) + v.dx * 0.5 + (v.nx || 0), Y(v.y) - v.dy * 0.5 - 10 + (v.ny || 0), v.name, 'lbl vel-lbl') : '');
    for (const p of o.points || []) {
      s += `<circle class="pt" cx="${f1(X(p.x))}" cy="${f1(Y(p.y))}" r="3.6"/>`;
      if (p.name) s += txt(X(p.x) + (p.nx || 0), Y(p.y) + (p.at === 'above' ? -10 : 19) + (p.ny || 0), p.name, 'lbl name');
      if (p.v) { const vxp = X(p.x) + (p.vx != null ? p.vx : 0), an = p.va && p.va !== 'auto' ? p.va : vxp < 70 ? 'start' : vxp > W - 70 ? 'end' : 'middle'; s += txt(an === 'start' ? Math.max(vxp - 10, 4) : an === 'end' ? Math.min(vxp + 10, W - 4) : vxp, Y(p.y) + (p.vy != null ? p.vy : -12), p.v, 'lbl small v-lbl', an); }
    }
    for (const p of (o.parts || []).concat(o.part ? [o.part] : [])) { const r = p.r || 8; s += `<circle class="charge ${p.q > 0 ? 'pos' : p.q < 0 ? 'neg' : 'neu'} part" cx="${f1(X(p.x))}" cy="${f1(Y(p.y))}" r="${r}"/>` + (p.sym ? txt(X(p.x) + (p.sx || 0), Y(p.y) - r - 6 + (p.sy || 0), p.sym, 'lbl q-lbl', p.sa || 'middle') : ''); }
    if (o.tops) {
      const T = 22, tops = o.tops.map((t) => { const x = X(t.x); return txt(x, 16, String(t.label).replace(/-(?=\d)/g, '−'), 'lbl small', x < 36 ? 'start' : x > W - 36 ? 'end' : 'middle'); }).join('');
      s = `<rect class="bg" x="0" y="0" width="${W}" height="${H + T}"/>${tops}<g transform="translate(0,${T})">${s}</g>`;
      return svg(W, H + T, s, o.label || L('An electric field', 'Ein elektrisches Feld'), o.cls || '', o.data || '');
    }
    return svg(W, H, s, o.label || L('An electric field', 'Ein elektrisches Feld'), o.cls || '', o.data || '');
  }

  // Energy bars: groups [{ name, pot, kin }] (in any one unit), side by side; per group E_pot,
  // E_kin and the total E, bars up from the zero line (down for negative values). o: { max (the
  // largest size to show), values (fmt(x) above each bar), W, H, label, hl (a group's index to
  // mark), unknown (groups whose bars are hidden behind "?") }
  function bars(groups, o = {}) {
    const n = groups.length, gw = 112, gap = 26, L0 = 18, W = o.W || L0 + n * gw + (n - 1) * gap + 14;
    const vals = groups.flatMap((g) => [g.pot, g.kin, g.pot + g.kin]);
    const max = o.max || Math.max(1e-9, ...vals.map(Math.abs)), hasNeg = vals.some((v) => v < -1e-9 * max);
    const top = o.values ? 30 : 16, Hp = o.H || 120, Hn = hasNeg ? Math.round(Hp * Math.min(1, Math.max(0.35, -Math.min(...vals) / max))) + (o.values ? 16 : 0) : 0, foot = 40, H = top + Hp + Hn + foot;
    const y0 = top + Hp, sc = Hp / max, cw = 26;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    groups.forEach((g, i) => {
      const gx = L0 + i * (gw + gap);
      if (o.hl === i) s += `<rect class="bars-hl" x="${gx - 8}" y="4" width="${gw + 16}" height="${H - 8}" rx="8"/>`;
      [['pot', g.pot, 'e-pot', 'E_pot'], ['kin', g.kin, 'e-kin', 'E_kin'], ['tot', g.pot + g.kin, 'e-tot', 'E']].forEach(([k, v, cls, name], j) => {
        const x = gx + 4 + j * (cw + 9), h = Math.abs(v) * sc;
        if (g.unknown) s += `<rect class="bar-q" x="${x}" y="${y0 - Hp * 0.5}" width="${cw}" height="${Hp * 0.5}"/>` + txt(x + cw / 2, y0 - Hp * 0.25 + 5, '?', 'lbl');
        else if (h > 0.4) s += `<rect class="bar ${cls}" x="${x}" y="${f1(v >= 0 ? y0 - h : y0)}" width="${cw}" height="${f1(h)}"/>`;
        if (o.values && !g.unknown) s += txt(x + cw / 2, f1(v >= 0 ? y0 - h - 6 : y0 + h + 13), o.values(v), 'tick bar-val');
        s += txt(x + cw / 2, H - foot + 16 + (hasNeg ? 0 : 0), name, `lbl small bar-name ${cls}-t`);
      });
      s += `<line class="axisline" x1="${gx - 2}" y1="${y0}" x2="${gx + gw}" y2="${y0}"/>`;
      s += txt(gx + gw / 2, H - 6, g.name, 'lbl name');
    });
    return svg(W, H, s, o.label || L('Energy bars', 'Energiebalken'), 'bars');
  }

  const api = { e, u, me, mp, KE, PARTS, part, D, PX, NX, BOX, bentF, V, E, lines, contours, onLine, lineThrough, fieldFig, bars, svg, txt, arrow, head, sub, nice, Vname };
  root.Accel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
