// The drawings of the app, in the manner of a physics textbook (the shared figure kit, figkit.js):
// thin even ink outlines; the displacement in its colour (red), the motion in blue. The colours
// follow the dark mode (style.css).
//   Figures.pointer(phi, o)   a pointer turning anticlockwise on a circle, at the angle phi (rad,
//                             from the horizontal), and its projection on the vertical axis: the
//                             oscillating body; o.angle: the initial phase φ₀ = π/2 − phi marked
//                             (how far the pointer is short of the top, clockwise from it)
//   Figures.lc(k, o)          an LC circuit in the k-th quarter of its period (0 … 3); o.caption:
//                             false for none
//   Figures.watchScene(w)     the scene to watch (play.js, the run w of oscWatch in scenarios.js):
//                             { frame: the SVG, the whole of it the switch to flip (data-pw-switch,
//                             a hit area on top), with an empty <g class="osw-pose">; pose(s) → its
//                             contents at the state s = w.at(t) and s.held (before the release) }.
//                             w.kind 'spring': a body hanging on a spring, the equilibrium and ±A
//                             marked, held from below until let go (or at rest at the equilibrium,
//                             w.push), with its velocity and acceleration as arrows (w.arrows);
//                             'track': a body on a vertical track, at the height y of the axis
//                             w.axis, held until let go; 'pointer': the pointer and its body
// Each returns an SVG in a <div class="fig">.
(function (root) {
  'use strict';

  const { f, svg, path, line, circle, text } = root.Fig;
  const L = (en, de) => root.OC.L(en, de);
  const it = (s) => `<tspan font-style="italic">${s}</tspan>`;
  const sub = (s, d) => `${it(s)}<tspan font-size="72%" dy="4">${d}</tspan><tspan dy="-4">​</tspan>`;
  // φ as \varphi (the curly form: KaTeX's font, where the page loads it)
  const varphi = '<tspan font-family="KaTeX_Math, \'STIX Two Text\', serif">φ</tspan>';

  // an arrow head at (x, y) along (ux, uy)
  const head = (x, y, ux, uy, H = 10, B = 4) => { const bx = x - H * ux, by = y - H * uy; return `<polygon points="${f(x)},${f(y)} ${f(bx - B * uy)},${f(by + B * ux)} ${f(bx + B * uy)},${f(by - B * ux)}"/>`; };
  // a vector from (x1, y1) to (x2, y2) in a colour class (osc-i, osc-e), its label at (lx, ly)
  function vec(x1, y1, x2, y2, cls, label = '', lx = x2, ly = y2, anchor = 'middle') {
    const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    return `<g class="osc-vec ${cls}"><line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2 - 8 * ux)}" y2="${f(y2 - 8 * uy)}"/>${head(x2, y2, ux, uy)}${label ? `<text x="${f(lx)}" y="${f(ly)}" text-anchor="${anchor}">${label}</text>` : ''}</g>`;
  }

  // ---------------------------------------------------------------- the pointer and its shadow
  // The circle of radius A, the pointer at phi (from the horizontal, anticlockwise positive), the
  // sense of rotation (ω) just ahead of it, and on the right the body at the pointer's height.
  function pointer(phi, o = {}) {
    return svg(330, 226, pointerBody(phi, o), L('A pointer of length A turning anticlockwise at the angular velocity ω, and on the right a body always at the height of its tip', 'Ein Zeiger der Länge A, der sich mit der Winkelgeschwindigkeit ω im Gegenuhrzeigersinn dreht, und rechts ein Körper, immer auf der Höhe seiner Spitze'));
  }
  function pointerBody(phi, o = {}) {
    const cx = 118, cy = 112, R = 76, bx = 272, at = (r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [px, py] = at(R, phi);
    let s = line(cx - R - 16, cy, cx + R + 16, cy, 'tb-thin') + line(cx, cy + R + 16, cx, cy - R - 16, 'tb-thin') + circle(cx, cy, R, 'tb-line');
    // the initial phase φ₀: from the top clockwise to the pointer (in −π … π)
    const phi0 = Math.atan2(Math.sin(Math.PI / 2 - phi), Math.cos(Math.PI / 2 - phi));
    if (o.angle && Math.abs(phi0) > 1e-9) {
      const r = 24, [ax, ay] = at(r, phi), [mx, my] = at(r + 14, Math.PI / 2 - phi0 / 2);
      s += path(`M${cx} ${f(cy - r)} A${r} ${r} 0 0 ${phi0 > 0 ? 1 : 0} ${f(ax)} ${f(ay)}`, 'osc-angle') + text(mx, my + 5, sub(varphi, '0'), 'tb-axis');
    }
    // the sense of rotation: an arc ahead of the pointer, anticlockwise
    const r2 = R + 13, a1 = phi + 0.3, a2 = phi + 0.95, [sx, sy] = at(r2, a1), [ex, ey] = at(r2, a2), [lx, ly] = at(r2 + 15, (a1 + a2) / 2);
    s += `<g class="osc-turn">${path(`M${f(sx)} ${f(sy)} A${r2} ${r2} 0 0 0 ${f(ex)} ${f(ey)}`, '')}${head(ex, ey, -Math.sin(a2), -Math.cos(a2), 9, 3.6)}<text x="${f(lx)}" y="${f(ly + 5)}" text-anchor="middle">${it('ω')}</text></g>`;
    // the projection: a dashed line to the body on its track
    s += line(bx, cy - R - 6, bx, cy + R + 6, 'tb-ghost') + line(bx - 9, cy, bx + 9, cy, 'tb-thin') + text(bx + 14, cy - R + 2, it('y'), 'tb-axis', 'start') + text(bx + 14, cy + 5, '0', 'tb-cap', 'start');
    s += line(px, py, bx, py, 'tb-ghost') + `<rect class="osc-body" x="${f(bx - 9)}" y="${f(py - 7)}" width="18" height="14" rx="2"/>`;
    const [nx, ny] = at(R * 0.55, phi), off = Math.abs(Math.sin(phi)) > 0.6 ? [12, 0] : [0, -10];
    s += line(cx, cy, px, py, 'osc-ptr') + circle(px, py, 4.5, 'osc-dot') + text(nx + off[0] * Math.sign(Math.cos(phi) || 1), ny + off[1] + 4, it('A'), 'tb-axis');
    return s;
  }

  // ---------------------------------------------------------------- the LC circuit
  // quarter k of the period: 0 charged (top plate +), 1 largest current (anticlockwise), 2 charged
  // the other way, 3 largest current (clockwise)
  function lc(k, o = {}) {
    const xl = 90, xr = 300, yt = 40, yb = 180, ym = 110;
    let s = path(`M${xl} ${ym - 10} V${yt} H${xr} V${ym - 46} M${xr} ${ym + 46} V${yb} H${xl} V${ym + 10}`, 'tb-line');
    s += path(`M${xl - 26} ${ym - 10} H${xl + 26} M${xl - 26} ${ym + 10} H${xl + 26}`, 'osc-plate');
    let coil = `M${xr} ${ym - 46}`;
    for (let j = 0; j < 6; j++) coil += ` c 22 0 22 ${f(46 / 3)} 0 ${f(46 / 3)}`;
    s += path(coil, 'tb-line') + text(xl - 34, ym + 5, it('C'), 'tb-axis', 'end') + text(xr + 26, ym + 5, it('L'), 'tb-axis', 'start');
    const charged = k % 2 === 0, top = k === 0 ? '+' : '−', bot = k === 0 ? '−' : '+';
    if (charged) {
      s += text(xl + 34, ym - 7, top, 'osc-charge', 'start') + text(xl + 34, ym + 21, bot, 'osc-charge', 'start');
      for (const dx of [-14, 0, 14]) s += k === 0 ? vec(xl + dx, ym - 8, xl + dx, ym + 9, 'osc-e osc-small') : vec(xl + dx, ym + 8, xl + dx, ym - 9, 'osc-e osc-small');
    } else {
      const acw = k === 1; // anticlockwise: up the left wire, along the top to the right, down the coil
      s += acw ? vec(150, yt, 230, yt, 'osc-i', it('I'), 190, yt - 9) + vec(230, yb, 150, yb, 'osc-i') : vec(230, yt, 150, yt, 'osc-i', it('I'), 190, yt - 9) + vec(150, yb, 230, yb, 'osc-i');
      s += path(`M${xr + 11} ${ym - 64} C ${xr + 70} ${ym - 64} ${xr + 70} ${ym + 64} ${xr + 11} ${ym + 64} M${xr + 11} ${ym - 64} C ${xr - 48} ${ym - 64} ${xr - 48} ${ym + 64} ${xr + 11} ${ym + 64}`, 'osc-fieldline');
    }
    const cap = [L('capacitor charged, no current: the energy is in the electric field', 'Kondensator geladen, kein Strom: Die Energie steckt im elektrischen Feld'),
      L('capacitor empty, largest current: the energy is in the magnetic field of the coil', 'Kondensator leer, grösster Strom: Die Energie steckt im Magnetfeld der Spule'),
      L('capacitor charged the other way round, no current', 'Kondensator umgekehrt geladen, kein Strom'),
      L('largest current, the other way round', 'grösster Strom, in die andere Richtung')][k];
    const [c1, c2] = cap.split(': ');
    return svg(420, o.caption === false ? 200 : 240, s + (o.caption === false ? '' : text(210, 212, c2 ? `${c1}:` : c1, 'tb-cap') + (c2 ? text(210, 228, c2, 'tb-cap') : '')), L(`An LC circuit: ${cap}`, `Ein Schwingkreis: ${cap}`));
  }

  // ---------------------------------------------------------------- watching (play.js)
  // The body hangs on a spring (or slides on a track) in a column of 170 × 250 px: the
  // equilibrium at the height cy, the turning points ±A (the axis of the track) R px above and
  // below it. Its velocity v and acceleration a are arrows beside it, as long as they are large
  // compared with their largest sizes.
  const CW = 170, CH = 250, cy = 140, R = 62, bx = 70;
  // the body, its centre at the height y (px), and the support under it while it is held
  const block = (y, held) => `<rect class="osc-body" x="${bx - 17}" y="${f(y - 13)}" width="34" height="26" rx="2"/>` +
    (held ? `<rect class="tb-metal" x="${bx - 4}" y="${f(y + 13)}" width="44" height="5" rx="1"/>` + line(bx + 40, y + 15.5, CW - 14, y + 15.5, 'tb-thin') : '');
  function arrows(y, s, amp) {
    let out = '';
    for (const [q, x, cls] of [['v', 116, 'v'], ['a', 146, 'a']]) {
      const k = s[q] / amp[q], len = 44 * Math.abs(k);
      if (Number.isFinite(k) && len >= 9) out += root.Fig.force([x, y], [0, k > 0 ? -1 : 1], len, it(q), [9, k > 0 ? 4 : -2], cls);
    }
    return out;
  }
  function watchScene(w) {
    const label = { spring: L('A body on a spring, its displacement y from the equilibrium', 'Ein Körper an einer Feder, seine Auslenkung y aus der Gleichgewichtslage'),
      track: L('A body on a vertical track, at the height y', 'Ein Körper auf einer senkrechten Schiene, auf der Höhe y'),
      pointer: L('The turning pointer and the body at the height of its tip', 'Der drehende Zeiger und der Körper auf der Höhe seiner Spitze') }[w.kind];
    const [W, H] = w.kind === 'pointer' ? [330, 226] : [CW, CH];
    const frame = svg(W, H, `<g class="osw-pose"></g><g data-pw-switch="1"><rect class="pw-hit" x="3" y="3" width="${W - 6}" height="${H - 6}" rx="8"/></g>`, label);
    // the height in px of y: ±A at cy ∓ R; on a track, its axis from cy + R + 20 to cy − R − 20
    const lo = w.axis ? w.axis.lo : -1, hi = w.axis ? w.axis.hi : 1, span = w.kind === 'track' ? R + 20 : R;
    const py = (y) => cy + span - ((Math.max(lo, Math.min(hi, w.kind === 'track' ? y : y / w.amp.y)) - lo) / (hi - lo)) * 2 * span;
    const level = (y, name) => line(bx - 32, py(y), bx + 32, py(y), 'tb-ghost') + text(30, py(y) + 5, name, 'tb-axis', 'end');
    function pose(s) {
      if (w.kind === 'pointer') return pointerBody(s.ph, { angle: s.held }); // before it turns, its angle φ₀
      const y = py(s.y);
      if (w.kind === 'track') {
        return `<rect class="tb-metal" x="${bx - 3}" y="${cy - span - 12}" width="6" height="${2 * span + 24}" rx="2"/>` + level(0, '0') +
          text(bx - 12, cy - span - 2, it(w.name || 'y'), 'tb-axis', 'end') + block(y, s.held);
      }
      // the ceiling, hatched above
      let h = '';
      for (let x = bx - 30; x < bx + 30; x += 8) h += `M${x} 14l7 -8`;
      return path(`M${bx - 32} 14H${bx + 32}`, 'tb-ground') + path(h, 'tb-hatch') + level(1, it('A')) + level(0, '0') + level(-1, `−${it('A')}`) +
        root.Fig.spring(bx, 14, y - 13, 7, 9) + block(y, s.held) + (w.arrows ? arrows(y, s, w.amp) : '');
    }
    return { frame, pose };
  }

  root.Figures = { pointer, lc, watchScene };
})(typeof window !== 'undefined' ? window : globalThis);
