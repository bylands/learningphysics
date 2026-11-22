// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Figures in the manner of a physics textbook, for the problems: thin even ink outlines, a few
// muted tints and brushed metal, hatched ground, people drawn simply, motion as slim double
// arrows, forces as red arrows, lengths as dimension lines. The classes tb-* are in ui.css, so
// the figures follow the dark mode. All strings are SVG; coordinates in px, y down.
//   Fig.svg(w, h, body, label)          the figure in a <div class="fig">
//   Fig.path(d, cls), Fig.line(x1, y1, x2, y2, cls), Fig.circle(x, y, r, cls),
//   Fig.rect(x, y, w, h, cls, rx), Fig.text(x, y, html, cls, anchor), Fig.poly(pts, cls)
//   Fig.motion(x1, y1, x2, y2)          a slim double arrow (the motion)
//   Fig.force(a, dir, len, label, off)  a force arrow from a along the unit vector dir
//   Fig.dim(a, b, label, off)           a dimension line, off px to the left of a → b
//   Fig.ground(x0, x1, y), Fig.wall(x, y0, y1, side)   a hatched floor or wall
//   Fig.spring(x, y0, y1, n, w)         a coil spring from (x, y0) to (x, y1)
//   Fig.wheel(x, y, r), Fig.car(x0, y, w, o), Fig.person(x, y, s, o), Fig.tree(x, y, h)
//   Fig.sym(l, sub)                     an italic letter with an upright subscript (SVG text)
(function (root) {
  'use strict';

  const f = (x) => Math.round(x * 10) / 10;
  const DEFS = '<defs><linearGradient id="tb-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--tb-metal1)"/>' +
    '<stop offset="0.45" style="stop-color:var(--tb-metal2)"/><stop offset="1" style="stop-color:var(--tb-metal1)"/></linearGradient>' +
    '<linearGradient id="tb-metal-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--tb-metal2)"/><stop offset="1" style="stop-color:var(--tb-metal1)"/></linearGradient></defs>';
  const svg = (w, h, body, label) => `<div class="fig"><svg class="tb" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${label}">${DEFS}${body}</svg></div>`;
  const path = (d, cls, extra = '') => `<path class="${cls}" d="${d}"${extra}/>`;
  const line = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  const circle = (x, y, r, cls) => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
  const rect = (x, y, w, h, cls, rx = 0) => `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}"/>`;
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}"/>`;
  const text = (x, y, s, cls = 'tb-cap', anchor = 'middle') => `<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${s}</text>`;
  const sym = (l, s = '') => `<tspan font-style="italic">${l}</tspan>${s ? `<tspan font-size="72%" dy="4">${s}</tspan><tspan dy="-4">​</tspan>` : ''}`;

  // an arrow head at (x, y) along (ux, uy), length H, half width B
  const head = (x, y, ux, uy, H = 9, B = 3.6) => { const bx = x - H * ux, by = y - H * uy; return `<polygon points="${f(x)},${f(y)} ${f(bx - B * uy)},${f(by + B * ux)} ${f(bx + B * uy)},${f(by - B * ux)}"/>`; };
  // a slim double arrow from (x1, y1) to (x2, y2): the motion
  function motion(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d, H = 7;
    return `<g class="tb-motion"><line x1="${f(x1 + H * ux)}" y1="${f(y1 + H * uy)}" x2="${f(x2 - H * ux)}" y2="${f(y2 - H * uy)}"/>${head(x2, y2, ux, uy, H, 3)}${head(x1, y1, -ux, -uy, H, 3)}</g>`;
  }
  // a force: from a along dir (a unit vector), len px, its label beyond the tip (off: [dx, dy])
  function force(a, dir, len, label = '', off = [8, 0], cls = '') {
    const [ux, uy] = dir, tip = [a[0] + len * ux, a[1] + len * uy];
    const anchor = off[0] > 3 ? 'start' : off[0] < -3 ? 'end' : 'middle';
    return `<g class="tb-force${cls ? ` ${cls}` : ''}"><line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(tip[0] - 7 * ux)}" y2="${f(tip[1] - 7 * uy)}"/>${head(tip[0], tip[1], ux, uy, 10, 4)}` +
      `<circle cx="${f(a[0])}" cy="${f(a[1])}" r="2.2"/>${label ? `<text x="${f(tip[0] + off[0])}" y="${f(tip[1] + off[1] + 5)}" text-anchor="${anchor}">${label}</text>` : ''}</g>`;
  }
  // a dimension line between a and b, shifted off px to the left of a → b, with a label
  function dim(a, b, label, off = 14) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], s = off < 0 ? -1 : 1, n = [s * u[1], -s * u[0]], o = Math.abs(off);
    const A = [a[0] + n[0] * o, a[1] + n[1] * o], B = [b[0] + n[0] * o, b[1] + n[1] * o];
    const tick = (P) => `M${f(P[0] - 5 * n[0])} ${f(P[1] - 5 * n[1])}L${f(P[0] + 5 * n[0])} ${f(P[1] + 5 * n[1])}`;
    const m = [(A[0] + B[0]) / 2 + n[0] * 10, (A[1] + B[1]) / 2 + n[1] * 10 + 5];
    return `<g class="tb-dim"><path d="M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}${tick(A)}${tick(B)}"/>${head(B[0], B[1], u[0], u[1], 7, 2.6)}${head(A[0], A[1], -u[0], -u[1], 7, 2.6)}` +
      `${label ? `<text x="${f(m[0])}" y="${f(m[1])}" text-anchor="${Math.abs(n[0]) > 0.7 ? (n[0] > 0 ? 'start' : 'end') : 'middle'}">${label}</text>` : ''}</g>`;
  }
  // ground: a line with short hatches below it; a wall: hatches on one side ('left' or 'right')
  function ground(x0, x1, y) {
    let h = '';
    for (let x = x0 + 4; x < x1; x += 9) h += `M${f(x)} ${f(y)}l-7 9`;
    return path(`M${f(x0)} ${f(y)}H${f(x1)}`, 'tb-ground') + path(h, 'tb-hatch');
  }
  function wall(x, y0, y1, side = 'left') {
    let h = ''; const s = side === 'left' ? -1 : 1;
    for (let y = y0 + 4; y < y1; y += 9) h += `M${f(x)} ${f(y)}l${7 * s} 7`;
    return path(`M${f(x)} ${f(y0)}V${f(y1)}`, 'tb-ground') + path(h, 'tb-hatch');
  }
  // a coil spring from (x, y0) to (x, y1): n turns, width w
  function spring(x, y0, y1, n = 7, w = 9) {
    const end = 5, len = y1 - y0 - 2 * end, step = len / n;
    let d = `M${f(x)} ${f(y0)}v${end}`;
    for (let k = 0; k < n; k++) d += `l${w} ${f(step / 4)}l${-2 * w} ${f(step / 2)}l${w} ${f(step / 4)}`;
    return path(`${d}v${end}`, 'tb-spring');
  }
  const wheel = (x, y, r) => circle(x, y, r, 'tb-tyre') + circle(x, y, r * 0.55, 'tb-metal') + circle(x, y, r * 0.13, 'tb-line-fill');
  // a car in side view, its wheels on the ground y, w px long; o.dy lifts the body, o.ghost draws
  // only the dashed outline of the body, o.cls tints it
  function car(x0, y, w, o = {}) {
    // (the body 28 lower than the drawing it comes from: each wheel centred in its arch)
    const k = w / 302, X = (v) => f(x0 + (v - 60) * k), Y = (v) => f(y + (v - 174) * k - (o.dy || 0));
    const body = `M${X(60)} ${Y(150)} L${X(60)} ${Y(126)} Q${X(62)} ${Y(116)} ${X(76)} ${Y(114)} L${X(128)} ${Y(110)} L${X(162)} ${Y(80)} Q${X(168)} ${Y(76)} ${X(178)} ${Y(76)} L${X(262)} ${Y(76)} Q${X(272)} ${Y(76)} ${X(280)} ${Y(84)} L${X(310)} ${Y(110)} L${X(346)} ${Y(114)} Q${X(360)} ${Y(118)} ${X(362)} ${Y(130)} L${X(362)} ${Y(150)} ` +
      `L${X(330)} ${Y(150)} A${f(28 * k)} ${f(28 * k)} 0 0 0 ${X(274)} ${Y(150)} L${X(146)} ${Y(150)} A${f(28 * k)} ${f(28 * k)} 0 0 0 ${X(90)} ${Y(150)} Z`;
    if (o.ghost) return path(body, 'tb-ghost');
    const glass = `M${X(140)} ${Y(110)} L${X(168)} ${Y(84)} L${X(212)} ${Y(84)} L${X(212)} ${Y(110)} Z M${X(220)} ${Y(110)} L${X(220)} ${Y(84)} L${X(268)} ${Y(84)} L${X(292)} ${Y(110)} Z`;
    const wy = y - 24 * k;
    return path(body, `tb-body${o.cls ? ` ${o.cls}` : ''}`) + path(glass, 'tb-glass') + path(`M${X(216)} ${Y(112)} V${Y(146)}`, 'tb-trim') +
      (o.noWheels ? '' : wheel(x0 + 58 * k, wy, 24 * k) + wheel(x0 + 242 * k, wy, 24 * k));
  }
  // limbs: segments [[a, b, w], …] drawn as one outlined shape: all outlines first, then all fills,
  // so the joints are seamless and round
  const limbs = (segs, cls) => {
    const d = (a, b) => `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`;
    return segs.map(([a, b, w]) => path(d(a, b), 'tb-limb-out', ` style="stroke-width:${f(w + 2.2)}"`)).join('') +
      segs.map(([a, b, w]) => path(d(a, b), `tb-limb ${cls}`, ` style="stroke-width:${f(w)}"`)).join('');
  };
  const limb = (pts, w, cls) => limbs(pts.slice(1).map((p, i) => [pts[i], p, w]), cls);
  // a person standing at (x, y) (between the feet), about 80·s px tall, facing o.dir (1 right,
  // −1 left); o.hands: where the two hands are (the back one first), o.lean: the upper body leaning
  // forward (px), o.knee: the knees bent forward (px), o.step: the feet apart (px), o.shirt: a tint
  // o.sit: sitting, y the seat, the legs stretched forward; o.hands may give one hand only (null
  // for the other: it hangs); o.pants: a tint for the trousers (ski trousers); o.hat: 'helmet'
  // or 'beanie' (in the tint of o.shirt)
  function person(x, y, s = 1, o = {}) {
    const k = (v) => v * s, d = o.dir || 1, lean = (o.lean || 0) * s * d, knee = (o.knee || 0) * s * d, st = (o.step || 4.5) * s;
    const hip = o.sit ? [x, y - k(3)] : [x + lean * 0.25, y - k(40)], sh = [hip[0] + lean * (o.sit ? 1 : 0.75), hip[1] - k(22)], head = [sh[0] + d * k(1.2), sh[1] - k(10.5)];
    const feet = o.sit ? [[x + d * k(35), y - k(2.5)], [x + d * k(38), y - k(1.5)]] : [[x - st, y - k(2.5)], [x + st, y - k(2.5)]];
    const hips = [[hip[0] - k(2.6), hip[1]], [hip[0] + k(2.6), hip[1]]];
    const knees = o.sit ? [[x + d * k(18), y - k(8)], [x + d * k(20), y - k(7)]] : feet.map((p, i) => [(p[0] + hips[i][0]) / 2 + knee, (p[1] + hips[i][1]) / 2]);
    const shs = [[sh[0] - d * k(5.5), sh[1] + k(2.5)], [sh[0] + d * k(5.5), sh[1] + k(2.5)]];
    const hang = [[sh[0] - d * k(5), sh[1] + k(28)], [sh[0] + d * k(5), sh[1] + k(28)]];
    const hands = [(o.hands && o.hands[0]) || hang[0], (o.hands && o.hands[1]) || hang[1]];
    // the elbow: where an arm of two equal halves (13.5 each) bends; a raised arm bends outwards
    // (away from the body), a lowered one slightly backwards
    const elbow = (a, h) => {
      const m = [(a[0] + h[0]) / 2, (a[1] + h[1]) / 2], L0 = Math.hypot(h[0] - a[0], h[1] - a[1]) || 1, bend = Math.sqrt(Math.max(0, k(13.5) ** 2 - (L0 / 2) ** 2));
      const n = [-(h[1] - a[1]) / L0, (h[0] - a[0]) / L0], e1 = [m[0] + n[0] * bend, m[1] + n[1] * bend], e2 = [m[0] - n[0] * bend, m[1] - n[1] * bend];
      if (h[1] < a[1] + k(4)) return Math.abs(e1[0] - sh[0]) > Math.abs(e2[0] - sh[0]) ? e1 : e2;
      return (e1[0] - e2[0]) * d < 0 ? e1 : e2;
    };
    // o.swim: in swimwear: bare arms, legs and feet, swim trunks in the tint of o.shirt; o.barefoot: bare feet (e.g. on a scale)
    // o.ponytail: long hair tied back; o.sport: in a sports outfit: a singlet in the tint of o.shirt, bare arms and legs, shorts in
    // the tint of o.pants (dark blue), running shoes
    const shirt = o.swim ? 'tb-skin tb-skinlimb' : `tb-shirt ${o.shirt || 'blue'}`, legs = o.swim || o.sport ? 'tb-skinlimb' : o.pants ? `tb-shirt ${o.pants}` : 'tb-trousers';
    const sleeve = o.sport ? 'tb-skinlimb' : shirt, mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const shorts = o.sport ? limbs([[hips[0], mid(hips[0], knees[0], 0.55), k(7.4)], [hips[1], mid(hips[1], knees[1], 0.55), k(7.4)]], `tb-shirt ${o.pants || 'navy'}`) : '';
    const torso = `M${f(hip[0] - k(6))} ${f(hip[1] + k(2))} C${f(hip[0] - k(6.5))} ${f(hip[1] - k(8))} ${f(sh[0] - k(8.5))} ${f(sh[1] + k(9))} ${f(sh[0] - k(7.5))} ${f(sh[1] + k(2))} ` +
      `Q${f(sh[0] - k(6))} ${f(sh[1] - k(1.5))} ${f(sh[0])} ${f(sh[1] - k(1.5))} Q${f(sh[0] + k(6))} ${f(sh[1] - k(1.5))} ${f(sh[0] + k(7.5))} ${f(sh[1] + k(2))} ` +
      `C${f(sh[0] + k(8.5))} ${f(sh[1] + k(9))} ${f(hip[0] + k(6.5))} ${f(hip[1] - k(8))} ${f(hip[0] + k(6))} ${f(hip[1] + k(2))} Z`;
    const shoe = (p) => { const y = p[1] + k(2.5); return path(`M${f(p[0] - d * k(3))} ${f(y)} L${f(p[0] - d * k(3))} ${f(y - k(3))} Q${f(p[0] + d * k(2))} ${f(y - k(4.4))} ${f(p[0] + d * k(6))} ${f(y - k(1.6))} Q${f(p[0] + d * k(7))} ${f(y)} ${f(p[0] + d * k(5))} ${f(y)} Z`, 'tb-shoe'); };
    const arm = (i) => { const e = elbow(shs[i], hands[i]); return limbs([[shs[i], e, k(4.6)], [e, hands[i], k(3.8)]], sleeve) + circle(hands[i][0], hands[i][1], k(2.5), 'tb-skin'); };
    const hair = `M${f(head[0] - k(6.4))} ${f(head[1] + k(0.5))} A${f(k(6.5))} ${f(k(6.5))} 0 0 1 ${f(head[0] + k(6.4))} ${f(head[1] - k(0.5))} ` +
      `Q${f(head[0] + d * k(1))} ${f(head[1] - k(3.6))} ${f(head[0] - d * k(4))} ${f(head[1] - k(2.4))} L${f(head[0] - d * k(6.4))} ${f(head[1] + k(3))} Z`;
    // a helmet: a shell over the head down to the ears, with a rim; a beanie: knitted, with a bobble
    const hat = (h) => {
      const r = k(h === 'helmet' ? 7.6 : 7), c = h === 'helmet' ? 'tb-helmet' : `tb-shirt ${o.shirt || 'blue'}`, yb = head[1] - k(h === 'helmet' ? 1.8 : 2.4);
      const dome = `M${f(head[0] - r)} ${f(yb)} A${f(r)} ${f(r * 1.05)} 0 0 1 ${f(head[0] + r)} ${f(yb)} Z`;
      return h === 'helmet' ? path(dome, c) + path(`M${f(head[0] + d * r * 0.4)} ${f(yb)} H${f(head[0] + d * (r + k(1.8)))}`, 'tb-helmetrim') :
        path(dome, c) + `<rect class="tb-beanie" x="${f(head[0] - r)}" y="${f(yb - k(2.2))}" width="${f(2 * r)}" height="${f(k(2.6))}" rx="${f(k(1))}"/>` + circle(head[0], yb - r * 1.05 - k(1.6), k(2.2), c);
    };
    return arm(0) +
      limbs([[hips[0], knees[0], k(6.2)], [knees[0], feet[0], k(4.8)], [hips[1], knees[1], k(6.2)], [knees[1], feet[1], k(4.8)]], legs) +
      (o.swim || o.barefoot ? feet.map((p) => { const y = p[1] + k(2.5); return path(`M${f(p[0] - d * k(2.5))} ${f(y)} Q${f(p[0] - d * k(2.5))} ${f(y - k(3))} ${f(p[0] + d * k(1))} ${f(y - k(3))} Q${f(p[0] + d * k(5))} ${f(y - k(1.5))} ${f(p[0] + d * k(5.5))} ${f(y)} Z`, 'tb-skin'); }).join('') : feet.map(shoe).join('')) +
      shorts + path(torso, shirt) +
      (o.swim ? path(`M${f(hip[0] - k(6.3))} ${f(hip[1] - k(5))} H${f(hip[0] + k(6.3))} L${f(hips[1][0] + k(4.2))} ${f(hip[1] + k(7))} L${f(hip[0] + k(0.6))} ${f(hip[1] + k(5))} L${f(hips[0][0] - k(4.2))} ${f(hip[1] + k(7))} Z`, `tb-shirt ${o.shirt || 'blue'}`) : '') +
      `<rect class="tb-skin" x="${f(sh[0] - k(1.8))}" y="${f(sh[1] - k(5))}" width="${f(k(3.6))}" height="${f(k(4))}"/>` +
      circle(head[0], head[1], k(6.5), 'tb-skin') + (o.hat ? hat(o.hat) : (o.ponytail ? path(`M${f(head[0] - d * k(5))} ${f(head[1] - k(3))} Q${f(head[0] - d * k(12))} ${f(head[1] - k(1))} ${f(head[0] - d * k(10))} ${f(head[1] + k(8))} Q${f(head[0] - d * k(7))} ${f(head[1] + k(2))} ${f(head[0] - d * k(4))} ${f(head[1] + k(1))} Z`, 'tb-hair') : '') + path(hair, 'tb-hair')) + arm(1);
  }
  // a smooth landscape (hills, a track) through its highest and lowest points [[x, y], …]: between
  // two of them a half cosine, flat at each of them, so there are no kinks; smooth(pts)(x) is the
  // height at x, smooth(pts).d(x0, x1) the path from x0 to x1
  function smooth(pts) {
    const at = (x) => {
      let i = 0; while (i < pts.length - 2 && x > pts[i + 1][0]) i++;
      const [a, b] = [pts[i], pts[i + 1]], u = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
      return a[1] + ((b[1] - a[1]) * (1 - Math.cos(Math.PI * u))) / 2;
    };
    at.d = (x0, x1) => { let d = `M${f(x0)} ${f(at(x0))}`; for (let x = x0 + 4; x < x1; x += 4) d += ` L${f(x)} ${f(at(x))}`; return `${d} L${f(x1)} ${f(at(x1))}`; };
    at.slope = (x) => (at(x + 0.5) - at(x - 0.5));
    return at;
  }
  const tree = (x, y, h) => path(`M${f(x)} ${f(y - h)} L${f(x + h * 0.3)} ${f(y - h * 0.15)} H${f(x - h * 0.3)} Z`, 'tb-tree') + path(`M${f(x)} ${f(y - h * 0.15)} V${f(y)}`, 'tb-trunk');

  root.Fig = { f, svg, path, line, circle, rect, poly, text, sym, motion, force, dim, ground, wall, spring, wheel, car, person, limb, limbs, tree, smooth };
  if (typeof module !== 'undefined') module.exports = root.Fig;
})(typeof window !== 'undefined' ? window : globalThis);
