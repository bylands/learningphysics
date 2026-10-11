// SVG drawings of charged particles in fields. The page plane is x (right), y (up); out of the page
// is drawn ⊙, into it ⊗. Colours by quantity: velocity and current blue, magnetic field green,
// electric field ochre, force red, the path violet.
//   pathFig(o)       a trajectory: o = { box: [x0, x1, y0, y1], region: [x0, x1, y0, y1] (the field;
//                    the whole box by default), bz (+1 ⊙, −1 ⊗), pts (the path), q (the charge drawn
//                    at the start), sym (a named particle's symbol), name (written top left), small }
//   tracksFig(o)     a bubble chamber: tracks from a point, named A–D, each in its colour (incoming: an uncharged
//                    particle coming in from the left, dashed, the point further left)
//   selectorFig(o)   a velocity selector: two plates in a magnetic field, an ion flying in
//   accelFig(o)      an accelerating voltage: a charge between a plate and a grid
//   capFig(o)        a charge flying into a capacitor, with its path (pts in units of the plates)
//                    and a label (written top right)
//   hallFig(o)       a metal strip with a current in a magnetic field (the Hall effect)
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

  // ---------------------------------------------------------------- a trajectory
  function pathFig(o) {
    const [x0, x1, y0, y1] = o.box, W = o.small ? 260 : 340, S = W / (x1 - x0), H = Math.round((y1 - y0) * S);
    const X = (x) => (x - x0) * S, Y = (y) => (y1 - y) * S;
    const reg = o.region || o.box, [rx0, rx1, ry0, ry1] = [Math.max(reg[0], x0), Math.min(reg[1], x1), Math.max(reg[2], y0), Math.min(reg[3], y1)];
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    s += `<rect class="region" x="${f1(X(rx0))}" y="${f1(Y(ry1))}" width="${f1(X(rx1) - X(rx0))}" height="${f1(Y(ry0) - Y(ry1))}"/>`;
    if (o.bz) for (let y = ry0 + 0.25; y < ry1; y += 0.55) for (let x = rx0 + 0.25; x < rx1; x += 0.55) s += dotCross(X(x), Y(y), o.small ? 3.4 : 4.2, o.bz > 0, 'v-field faint');
    s += txt(W - 6, 14, `<tspan class="it">B</tspan>`, 'lbl c-field', 'end');
    const pts = o.pts; // clipped to the frame below
    if (pts.length > 1) {
      s += `<g clip-path="url(#mfp${++uid})"><clipPath id="mfp${uid}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath><path class="traj" d="M${pts.map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(' L')}"/></g>`;
      // an arrowhead part way along
      const k = Math.min(pts.length - 2, Math.max(1, Math.round(pts.length * 0.12))), a = pts[k], b = pts[k + 1], d = Math.hypot(X(b[0]) - X(a[0]), Y(b[1]) - Y(a[1])) || 1;
      s += head(X(b[0]), Y(b[1]), (X(b[0]) - X(a[0])) / d, (Y(b[1]) - Y(a[1])) / d, 'traj-head', 11, 5);
    }
    const p0 = o.pts[0], R = o.small ? 8 : 10;
    s += particle(X(p0[0]), Y(p0[1]), o.sym ? R + 2 : R, o.q, o.sym);
    if (o.name) s += txt(8, 20, o.name, 'lbl', 'start');
    return svg(W, H, s, o.label || L('The path of the particle', 'Die Bahn des Teilchens'), o.small ? 'small' : '');
  }

  // ---------------------------------------------------------------- a bubble chamber
  function tracksFig(o) {
    const W = 340, H = 280, S = 30, cx = o.incoming ? 100 : W / 2, cy = H / 2, X = (x) => cx + x * S, Y = (y) => cy - y * S;
    let s = `<rect class="bg chamber" x="0" y="0" width="${W}" height="${H}" rx="12"/>`;
    for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) s += dotCross(x, y, 4, o.bz > 0, 'v-field faint');
    o.tracks.forEach((t, i) => {
      s += `<path class="track k${i % 4}" d="M${t.pts.map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(' L')}"/>`;
      // the name at the point farthest from the start, a little further out
      const e = t.pts.reduce((a, p) => (Math.hypot(p[0], p[1]) > Math.hypot(a[0], a[1]) ? p : a)), d = Math.hypot(e[0], e[1]) || 1; // kept inside the frame
      s += txt(Math.min(W - 12, Math.max(12, X(e[0] + (0.45 * e[0]) / d))), Math.min(H - 8, Math.max(18, Y(e[1] + (0.45 * e[1]) / d) + 5)), t.name, `lbl k${i % 4}`);
    });
    if (o.incoming) s += `<line class="track neutral" x1="0" y1="${cy}" x2="${cx}" y2="${cy}"/>`;
    s += `<circle class="pt" cx="${cx}" cy="${cy}" r="3.5"/>`;
    return svg(W, H, s, L('Tracks in a bubble chamber', 'Spuren in einer Blasenkammer'));
  }

  // ---------------------------------------------------------------- a velocity selector
  // Two plates (the upper one + when the field points down), E arrows, the magnetic field, an ion.
  // noE: the plates without signs or field (E to find); noB: no magnetic field drawn (B to find);
  // forces: the ion between the plates, with the electric and the magnetic force on it.
  function selectorFig(o) {
    const W = 340, H = 200, top = 40, bot = 160, cy = (top + bot) / 2, px = o.forces ? 185 : 26;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    if (!o.noB) for (let x = 70; x < 330; x += 30) for (let y = 62; y < 150; y += 28) s += dotCross(x, y, 4.5, o.bz > 0, 'v-field faint');
    s += `<rect class="plate" x="60" y="${top - 8}" width="270" height="8"/><rect class="plate" x="60" y="${bot}" width="270" height="8"/>`;
    if (!o.noE) {
      s += txt(46, top + 2, o.Edown ? '+' : '−', 'sign big') + txt(46, bot + 10, o.Edown ? '−' : '+', 'sign big');
      for (const x of o.forces ? [90, 300] : [110, 200, 290]) s += o.Edown ? arrow(x, top + 6, x, top + 40, 'v-efield', 2) : arrow(x, bot - 6, x, bot - 40, 'v-efield', 2);
      s += txt(o.forces ? 308 : 300, o.Edown ? top + 28 : bot - 22, `<tspan class="it">E</tspan>`, 'lbl c-efield', 'start');
    } else s += txt(300, cy + 5, '<tspan class="it">E</tspan> ?', 'lbl c-efield', 'start');
    if (o.forces) {
      // the electric force along E for a positive charge; the magnetic force q·v×B, v to the right
      const fe = (o.Edown ? -1 : 1) * Math.sign(o.q), fm = -o.bz * Math.sign(o.q), up = (f) => (f > 0 ? -1 : 1);
      s += arrow(px, cy + up(fe) * 13, px, cy + up(fe) * 50, 'v-force', 2.6) + txt(px - 8, cy + up(fe) * 38 + 5, '<tspan class="it">q</tspan>·<tspan class="it">E</tspan>', 'lbl c-force', 'end');
      s += arrow(px, cy + up(fm) * 13, px, cy + up(fm) * 50, 'v-force', 2.6) + txt(px - 8, cy + up(fm) * 38 + 5, '<tspan class="it">q</tspan>·<tspan class="it">v</tspan>·<tspan class="it">B</tspan>', 'lbl c-force', 'end');
    }
    s += particle(px, cy, 12, o.q, o.sym);
    s += arrow(px + 14, cy, px + 70, cy, 'v-vel') + txt(px + 44, cy - 10, `<tspan class="it">v</tspan>`, 'lbl c-vel');
    s += txt(W - 6, 16, o.noB ? '<tspan class="it">B</tspan> ?' : `<tspan class="it">B</tspan>`, 'lbl c-field', 'end');
    return svg(W, H, s, L('A velocity selector: two charged plates in a magnetic field', 'Ein Geschwindigkeitsfilter: zwei geladene Platten in einem Magnetfeld'));
  }

  // ---------------------------------------------------------------- an accelerating voltage
  // A plate and a grid at the voltage U, the field between them, the charge at rest at the plate
  // and, past the grid, its velocity. The plate it starts from is + for a positive charge.
  function accelFig(o) {
    const W = 340, H = 180, xa = 70, xb = 230, yt = 30, yb = 130, cy = (yt + yb) / 2, pos = o.q > 0;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    s += `<rect class="plate" x="${xa - 6}" y="${yt}" width="6" height="${yb - yt}"/>`;
    for (let y = yt; y < yb; y += 8) s += `<rect class="plate" x="${xb}" y="${y}" width="4" height="5"/>`;
    s += txt(xa - 3, yt - 8, pos ? '+' : '−', 'sign big') + txt(xb + 2, yt - 8, pos ? '−' : '+', 'sign big');
    for (const y of [yt + 14, yb - 14]) s += pos ? arrow(xa + 20, y, xb - 14, y, 'v-efield', 1.6) : arrow(xb - 14, y, xa + 20, y, 'v-efield', 1.6);
    s += txt((xa + xb) / 2, yt + 30, '<tspan class="it">E</tspan>', 'lbl c-efield');
    s += particle(xa + 14, cy, o.sym ? 12 : 10, o.q, o.sym);
    s += arrow(xb + 14, cy, xb + 74, cy, 'v-vel') + txt(xb + 44, cy - 10, '<tspan class="it">v</tspan>', 'lbl c-vel');
    s += `<path class="dimline" d="M${xa - 3} ${yb + 18} H${xb + 2} M${xa - 3} ${yb + 12} v12 M${xb + 2} ${yb + 12} v12"/>` + txt((xa + xb) / 2, yb + 40, L('<tspan class="it">ΔV</tspan>', '<tspan class="it">U</tspan>'), 'lbl');
    return svg(W, H, s, L('A charge accelerated from a plate to a grid through the voltage ΔV', 'Eine Ladung, die von einer Platte zu einem Gitter mit der Spannung U beschleunigt wird'));
  }

  // ---------------------------------------------------------------- a charge in a capacitor
  // o = { top (+1: the upper plate is +), q, sym, v (the velocity drawn), field (E drawn), pts (the
  // path: x from 0 at the start to 1 at the end of the plates, y in half the gap), label, small }
  function capFig(o) {
    const W = o.small ? 260 : 360, H = o.small ? 170 : 220, x0 = 50, x1 = W - 40, yt = 40, yb = H - 40, cy = (yt + yb) / 2;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    s += `<rect class="plate" x="${x0}" y="${yt - 6}" width="${x1 - x0}" height="6"/><rect class="plate" x="${x0}" y="${yb}" width="${x1 - x0}" height="6"/>`;
    s += txt(x0 - 10, yt + 2, o.top > 0 ? '+' : '−', 'sign big', 'end') + txt(x0 - 10, yb + 10, o.top > 0 ? '−' : '+', 'sign big', 'end');
    if (o.field) {
      for (const x of [x0 + 40, (x0 + x1) / 2, x1 - 40]) s += o.top > 0 ? arrow(x, yt + 6, x, yt + 34, 'v-efield', 1.8) : arrow(x, yb - 6, x, yb - 34, 'v-efield', 1.8);
      s += txt(x1 - 28, o.top > 0 ? yt + 28 : yb - 20, '<tspan class="it">E</tspan>', 'lbl c-efield', 'start');
    }
    if (o.pts && o.pts.length > 1) s += `<path class="traj" d="M${o.pts.map((p) => `${f1(x0 - 30 + p[0] * (x1 - x0 + 30))},${f1(cy - (p[1] * (yb - yt)) / 2)}`).join(' L')}"/>`;
    s += particle(x0 - 30, cy, 11, o.q, o.sym) + (o.v ? arrow(x0 - 16, cy, x0 + 22, cy, 'v-vel', 2.2) : '');
    if (o.label) s += txt(W - 6, 16, o.label, 'lbl small', 'end');
    return svg(W, H, s, L('A charge flying into a capacitor', 'Eine Ladung fliegt in einen Kondensator'), o.small ? 'small' : '');
  }

  // ---------------------------------------------------------------- the Hall effect
  // A metal strip seen from above, the current I along it (I: +1 to the right), the magnetic field
  // across it (bz). edges: the charge gathered on the upper edge (+1, −1; 0: none drawn), with the
  // other edge charged the other way and the voltage U_H between them.
  function hallFig(o) {
    const W = 340, H = 200, x0 = 40, x1 = 300, yt = 60, yb = 140, cy = (yt + yb) / 2;
    let s = `<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>`;
    for (let x = 30; x < W; x += 34) for (let y = 22; y < H; y += 34) s += dotCross(x, y, 4.5, o.bz > 0, 'v-field faint');
    s += `<rect class="strip" x="${x0}" y="${yt}" width="${x1 - x0}" height="${yb - yt}" rx="3"/>`;
    s += txt(W - 6, 16, '<tspan class="it">B</tspan>', 'lbl c-field', 'end');
    const a = o.I > 0 ? x0 + 60 : x1 - 60, b = o.I > 0 ? x1 - 60 : x0 + 60;
    s += arrow(a, cy, b, cy, 'v-vel', 3) + txt((a + b) / 2, cy - 10, '<tspan class="it">I</tspan>', 'lbl c-vel');
    if (o.edges) {
      for (let x = x0 + 22; x < x1 - 10; x += 26) {
        s += txt(x, yt + 15, o.edges > 0 ? '+' : '−', 'sign') + txt(x, yb - 5, o.edges > 0 ? '−' : '+', 'sign');
      }
      s += `<path class="dimline" d="M${x1 + 16} ${yt} V${yb} M${x1 + 10} ${yt} h12 M${x1 + 10} ${yb} h12"/>` + txt(x1 + 22, cy + 5, L('<tspan class="it">ΔV</tspan><tspan class="sub" dy="3">H</tspan>', '<tspan class="it">U</tspan><tspan class="sub" dy="3">H</tspan>'), 'lbl', 'start');
    }
    return svg(W, H, s, L('A metal strip carrying a current in a magnetic field', 'Ein Metallstreifen mit einem Strom in einem Magnetfeld'));
  }

  const api = { pathFig, tracksFig, selectorFig, accelFig, capFig, hallFig, arrow, dotCross };
  root.PartPlot = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
