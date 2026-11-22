// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Pictures of everyday situations for the problems modes, as SVG strings in px (y down), in the
// style of Force Systems' real problems: soft backgrounds, filled figures, vehicles with rims and
// shadows, and force arrows in the apps' colours. The colours are CSS classes rp-* (ui.css).
//   Art.svg(w, h, body, label)      the picture (with its gradients) in a <div class="fig">
//   Art.bg(x0, y0, x1, y1, fill)     a rounded background (sky by default; 'metal', 'night')
//   Art.ground(x0, x1, y, kind)      asphalt, concrete, gravel, grass, snow, wood or water below y
//   Art.person(x, y, s, o)           a person standing at (x, y), about 76·s tall (o: hands,
//                                    knee, lean, dir, shirt: red|blue|green|orange)
//   Art.car(x0, y, w, colour), Art.rim(x, y, r), Art.tree(x, y, h), Art.shadow(cx, y, rx)
//   Art.rect, Art.circle, Art.path, Art.text, Art.line   plain shapes (cls: CSS class)
//   Art.arrow(a, dir, len, cls, label, off)   a force arrow from a along dir (unit vector)
//   Art.dim(a, b, label, off)        a dimension line, off px to the left of a → b
(function (root) {
  'use strict';

  const f = (x) => (Math.round(x * 10) / 10).toString();
  const DEFS = `<defs>
    <linearGradient id="rp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--rp-sky1)"/><stop offset="1" style="stop-color:var(--rp-sky2)"/></linearGradient>
    <linearGradient id="rp-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--rp-metal1)"/><stop offset="0.5" style="stop-color:var(--rp-metal2)"/><stop offset="1" style="stop-color:var(--rp-metal1)"/></linearGradient>
    <linearGradient id="rp-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.15"/></linearGradient>
    <linearGradient id="rp-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2a44"/><stop offset="1" stop-color="#3d4f6e"/></linearGradient>
    <linearGradient id="rp-snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--rp-snow1)"/><stop offset="1" style="stop-color:var(--rp-snow2)"/></linearGradient>
    <pattern id="rp-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" style="fill:var(--card)"/><line x1="0" y1="0" x2="0" y2="7" style="stroke:var(--muted);stroke-width:1"/></pattern>
    <radialGradient id="rp-flame" cx="0.5" cy="0.2" r="0.8"><stop offset="0" stop-color="#fff6c2"/><stop offset="0.45" stop-color="#ffc23d"/><stop offset="1" stop-color="#e8542c"/></radialGradient>
  </defs>`;

  const rect = (x0, y0, x1, y1, cls, rx = 2) => `<rect class="${cls}" x="${f(Math.min(x0, x1))}" y="${f(Math.min(y0, y1))}" width="${f(Math.abs(x1 - x0))}" height="${f(Math.abs(y1 - y0))}" rx="${rx}"/>`;
  const circle = (x, y, r, cls) => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
  const path = (d, cls, style = '') => `<path class="${cls}" d="${d}"${style ? ` style="${style}"` : ''}/>`;
  const line = (a, b, cls) => path(`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`, cls);
  const text = (x, y, html, cls = 'lbl', anchor = 'middle') => `<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${html}</text>`;

  const bg = (x0, y0, x1, y1, fill = 'sky') => `<rect class="rp-bg" fill="url(#rp-${fill})" x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="10"/>`;
  function ground(x0, x1, y, kind = 'asphalt', depth = 26) {
    return rect(x0, y, x1, y + depth, `rp-ground ${kind}`, 0) +
      (kind === 'asphalt' ? path(`M${f(x0 + 10)} ${f(y + depth / 2)}H${f(x1)}`, 'rp-lane') : '') + path(`M${f(x0)} ${f(y)}H${f(x1)}`, 'rp-edge');
  }
  const shadow = (cx, y, rx) => `<ellipse class="rp-shadow" cx="${f(cx)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.12)}"/>`;
  const rim = (x, y, r) => circle(x, y, r, 'rp-tyre') + circle(x, y, r * 0.58, 'rp-rim') + circle(x, y, r * 0.18, 'rp-hub');
  const tree = (x, y, h) => path(`M${f(x)} ${f(y - h)}L${f(x + h * 0.32)} ${f(y)}H${f(x - h * 0.32)}Z`, 'rp-tree') + path(`M${f(x)} ${f(y)}V${f(y + h * 0.12)}`, 'rp-trunk');

  function person(x, y, s = 1, o = {}) {
    const k = (v) => v * s, lean = (o.lean || 0) * s, kn = (o.knee || 0) * s, d = o.dir || 1;
    const hip = [x + d * lean * 0.3, y - k(32)], sh = [x + d * lean, y - k(56)];
    const legs = [-1, 1].map((side) => {
      const foot = [x + side * k(5), y], knee = [(hip[0] + foot[0]) / 2 + d * kn, (hip[1] + foot[1]) / 2];
      return `M${f(hip[0] + side * k(3))} ${f(hip[1])}L${f(knee[0])} ${f(knee[1])}L${f(foot[0])} ${f(foot[1] - k(2))}`;
    }).join('');
    const hands = o.hands || [[sh[0] - k(9), sh[1] + k(22)], [sh[0] + k(9), sh[1] + k(22)]];
    const arm = (side, h) => `M${f(sh[0] + side * k(6))} ${f(sh[1] + k(3))}L${f(h[0])} ${f(h[1])}`;
    const head = [sh[0] + d * k(1), sh[1] - k(9)], shirt = o.shirt || 'blue';
    return path(legs, 'rp-legs', `stroke-width:${f(k(6.5))}`) +
      [-1, 1].map((side) => `<ellipse class="rp-shoe" cx="${f(x + side * k(5) + d * k(3))}" cy="${f(y - k(1.5))}" rx="${f(k(5))}" ry="${f(k(2.5))}"/>`).join('') +
      path(arm(-1, hands[0]), `rp-arm ${shirt}`, `stroke-width:${f(k(5.5))}`) +
      path(`M${f(hip[0] - k(8))} ${f(hip[1] + k(2))}L${f(sh[0] - k(9))} ${f(sh[1] + k(4))}Q${f(sh[0])} ${f(sh[1] - k(3))} ${f(sh[0] + k(9))} ${f(sh[1] + k(4))}L${f(hip[0] + k(8))} ${f(hip[1] + k(2))}Z`, `rp-torso ${shirt}`) +
      path(arm(1, hands[1]), `rp-arm ${shirt}`, `stroke-width:${f(k(5.5))}`) +
      hands.map((h) => circle(h[0], h[1], k(2.8), 'rp-skin')).join('') +
      circle(head[0], head[1], k(7.5), 'rp-skin') +
      path(`M${f(head[0] - k(7.5))} ${f(head[1] - k(0.5))}A${f(k(7.5))} ${f(k(7.5))} 0 0 1 ${f(head[0] + k(7.5))} ${f(head[1] - k(0.5))}Q${f(head[0])} ${f(head[1] - k(4))} ${f(head[0] - k(7.5))} ${f(head[1] - k(0.5))}Z`, 'rp-hair');
  }

  function car(x0, y, w, colour = 'red') {
    const p = (a, b) => `${f(x0 + a * w)} ${f(y - b * w)}`;
    const body = `M${p(0.02, 0.1)}L${p(0.02, 0.24)}Q${p(0.02, 0.29)} ${p(0.1, 0.3)}L${p(0.26, 0.31)}L${p(0.37, 0.44)}Q${p(0.4, 0.46)} ${p(0.45, 0.46)}L${p(0.68, 0.46)}Q${p(0.73, 0.46)} ${p(0.76, 0.43)}L${p(0.86, 0.31)}L${p(0.95, 0.29)}Q${p(1, 0.27)} ${p(1, 0.2)}L${p(1, 0.1)}Z`;
    return shadow(x0 + w / 2, y, w * 0.52) + path(body, `rp-car ${colour}`) + path(body, 'rp-shine') +
      path(`M${p(0.39, 0.31)}L${p(0.43, 0.42)}L${p(0.555, 0.42)}L${p(0.555, 0.31)}Z`, 'rp-glass') + path(`M${p(0.58, 0.31)}L${p(0.58, 0.42)}L${p(0.69, 0.42)}L${p(0.79, 0.31)}Z`, 'rp-glass') +
      path(`M${p(0.565, 0.31)}L${p(0.565, 0.12)}`, 'rp-line') +
      rect(x0 + 0.95 * w, y - 0.25 * w, x0 + 0.99 * w, y - 0.21 * w, 'rp-light', 1) + rect(x0 + 0.02 * w, y - 0.25 * w, x0 + 0.05 * w, y - 0.21 * w, 'rp-tail', 1) +
      rim(x0 + 0.2 * w, y - 0.085 * w, 0.085 * w) + rim(x0 + 0.8 * w, y - 0.085 * w, 0.085 * w);
  }

  // a force arrow: slim notched head, a dot where it acts, a label beyond its tip
  function arrow(a, dir, len, cls, label = '', off = [8, 0]) {
    const [ux, uy] = dir, tip = [a[0] + len * ux, a[1] + len * uy], H = 11, N = 8, B = 4.2;
    const back = [tip[0] - H * ux, tip[1] - H * uy], notch = [tip[0] - N * ux, tip[1] - N * uy];
    const head = [tip, [back[0] - B * uy, back[1] + B * ux], notch, [back[0] + B * uy, back[1] - B * ux]];
    const anchor = off[0] > 3 ? 'start' : off[0] < -3 ? 'end' : 'middle';
    return `<g class="${cls}"><line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(notch[0])}" y2="${f(notch[1])}"/><polygon points="${head.map((q) => q.map(f).join(',')).join(' ')}"/><circle cx="${f(a[0])}" cy="${f(a[1])}" r="2"/>` +
      (label ? `<text class="flbl" x="${f(tip[0] + off[0])}" y="${f(tip[1] + off[1] + 5)}" text-anchor="${anchor}">${label}</text>` : '') + '</g>';
  }
  function dim(a, b, label, off = 14) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], sg = off < 0 ? -1 : 1, n = [sg * u[1], -sg * u[0]], o = Math.abs(off);
    const A = [a[0] + n[0] * o, a[1] + n[1] * o], B2 = [b[0] + n[0] * o, b[1] + n[1] * o], t = (P) => `M${f(P[0] - 4 * n[0])} ${f(P[1] - 4 * n[1])}L${f(P[0] + 4 * n[0])} ${f(P[1] + 4 * n[1])}`;
    const m = [(A[0] + B2[0]) / 2 + n[0] * 11, (A[1] + B2[1]) / 2 + n[1] * 11 + 5];
    return path(`M${f(A[0])} ${f(A[1])}L${f(B2[0])} ${f(B2[1])}${t(A)}${t(B2)}`, 'dimline') + (label ? text(m[0], m[1], label, 'lbl small', Math.abs(n[0]) > 0.7 ? (n[0] > 0 ? 'start' : 'end') : 'middle') : '');
  }

  const svg = (w, h, body, label) => `<div class="fig"><svg viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${label}">${DEFS}${body}</svg></div>`;

  root.Art = { svg, bg, ground, shadow, rim, tree, person, car, rect, circle, path, line, text, arrow, dim, f };
})(window);
