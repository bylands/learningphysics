// Animations for the tutor: a dipole (a rod with +q and −q at its ends) moving in a field, drawn
// over the field lines of charges.js, with the forces on its ends. Two scenes:
//   'uniform'  a uniform field to the right; the dipole's centre is held, it swings round the field
//              direction like a damped pendulum and settles with its + end along the field
//   'point'    a positive point charge (+2 at x = −1.8); a free dipole to its right, its + end
//              towards the charge: it first turns round, then is attracted, and stops (and holds)
//              just before it touches the charge
//   html(kind, o)          the figure: an <svg class="ef dip-anim"> (field lines from C.fig, the
//                          dipole in its starting position in <g class="dip">, the scene in
//                          data-scene) and a button to replay it, in a <div class="dip-anim-wrap">.
//                          o: { angle (degrees, the direction from − to + end, counter-clockwise
//                          from the x-axis), x, y (the centre), small, W }
//   start(root)            starts the animations inside root (a DOM element), stopping any running
//                          ones; with prefers-reduced-motion a still (a strobe of the motion) instead
//   stop()                 stops all of them
//   scene(kind, o), step(sc, s, dt), simulate(kind, o, seconds)  the physics, pure (for the tests)
// The physics: two equal masses m on a massless rod of length d = 2h, charges ±q at the ends, the
// forces q·E from C.field (k = 1), the torque about the centre, light damping so that it settles;
// semi-implicit Euler with a fixed step. Time is in seconds of the animation.
(function (root) {
  'use strict';

  const Lang = root.Lang || require('../electric-field/lang.js');
  const C = root.Charges || require('../electric-field/charges.js');
  const L = (en, de) => Lang.L(en, de);
  const f1 = (x) => Math.round(x * 10) / 10;
  const DT = 1 / 240, PAUSE = 0.8; // the step; the start shown still for a moment before it moves

  // ---------------------------------------------------------------- the scenes and the physics
  // m and the damping chosen so that the motion is easy to follow: in the uniform field a swing
  // takes about 2 s and it has settled after about 7 s; near the charge it turns round in about 2 s
  // and arrives after about 4 s
  function scene(kind, o = {}) {
    const box = [-3, 3, -2.2, 2.2];
    if (kind === 'point') {
      const Q = { q: 2, x: -1.8, y: 0 };
      return { kind, box, c: { kind: 'points', charges: [Q] }, Q, h: 0.6, q: 1, m: 0.08, gr: 1.6, gt: 0.6, gq: 10, free: true,
        // the nearer end stops short of the charge, leaving room for the arrow of its force; forces
        // drawn smaller than in the uniform field (px per unit force), as near the charge they are large
        stopR: 0.9, px: 30, T: 12, x: o.x != null ? o.x : 0.6, y: o.y != null ? o.y : 0.25, th: ((o.angle != null ? o.angle : 165) * Math.PI) / 180 };
    }
    return { kind: 'uniform', box, c: { kind: 'uniform', E: [1, 0] }, h: 0.7, q: 1, m: 0.15, gr: 1.4, gt: 0, gq: 0, free: false, px: 46,
      T: 8, x: o.x || 0, y: o.y || 0, th: ((o.angle != null ? o.angle : 65) * Math.PI) / 180 };
  }
  const ends = (s, h) => { const ux = Math.cos(s.th), uy = Math.sin(s.th); return { p: [s.x + h * ux, s.y + h * uy], n: [s.x - h * ux, s.y - h * uy] }; };
  // the forces on the + and the − end
  function forces(sc, s) {
    const e = ends(s, sc.h), Ep = C.field(sc.c, ...e.p), En = C.field(sc.c, ...e.n);
    return { e, Fp: [sc.q * Ep[0], sc.q * Ep[1]], Fn: [-sc.q * En[0], -sc.q * En[1]] };
  }
  const init = (sc) => ({ x: sc.x, y: sc.y, th: sc.th, vx: 0, vy: 0, w: 0, t: 0, done: false });
  const clamp = (v, a) => (Number.isFinite(v) ? Math.max(-a, Math.min(a, v)) : 0);
  // one step dt: the new state (s is not changed)
  function step(sc, s, dt = DT) {
    if (s.done) return { ...s, t: s.t + dt };
    const { Fp, Fn } = forces(sc, s), ux = Math.cos(s.th), uy = Math.sin(s.th), h = sc.h;
    // torque about the centre: (+h·u) × Fp + (−h·u) × Fn
    const tau = h * (ux * Fp[1] - uy * Fp[0]) - h * (ux * Fn[1] - uy * Fn[0]), I = 2 * sc.m * h * h;
    const w = clamp(s.w + (tau / I - sc.gr * s.w) * dt, 30);
    let vx = 0, vy = 0;
    if (sc.free) {
      // drag: linear and quadratic (as in air), so that it does not rush in at the end, where the
      // attraction grows steeply (about 1/r³)
      const v = Math.hypot(s.vx, s.vy), g = sc.gt + sc.gq * v;
      vx = clamp(s.vx + ((Fp[0] + Fn[0]) / (2 * sc.m) - g * s.vx) * dt, 6);
      vy = clamp(s.vy + ((Fp[1] + Fn[1]) / (2 * sc.m) - g * s.vy) * dt, 6);
    }
    const n = { x: s.x + vx * dt, y: s.y + vy * dt, th: s.th + w * dt, vx, vy, w, t: s.t + dt, done: false };
    if (!Number.isFinite(n.x + n.y + n.th)) return { ...s, done: true, vx: 0, vy: 0, w: 0, t: s.t + dt };
    // near the charge: hold before it touches; and never leave the picture
    if (sc.Q) {
      const e = ends(n, h), near = Math.min(Math.hypot(e.p[0] - sc.Q.x, e.p[1] - sc.Q.y), Math.hypot(e.n[0] - sc.Q.x, e.n[1] - sc.Q.y));
      if (near < sc.stopR) return { ...s, vx: 0, vy: 0, w: 0, t: s.t + dt, done: true };
    }
    const [x0, x1, y0, y1] = sc.box;
    if (n.x < x0 + 0.3 || n.x > x1 - 0.3 || n.y < y0 + 0.3 || n.y > y1 - 0.3) return { ...s, vx: 0, vy: 0, w: 0, t: s.t + dt, done: true };
    return n;
  }
  // the state after the given seconds of motion (not counting the pause at the start)
  function simulate(kind, o = {}, seconds) {
    const sc = typeof kind === 'string' ? scene(kind, o) : kind;
    let s = init(sc);
    const n = Math.round((seconds != null ? seconds : sc.T) / DT);
    for (let i = 0; i < n; i++) s = step(sc, s);
    return s;
  }

  // ---------------------------------------------------------------- drawing
  const geom = (sc, W) => { const S = W / (sc.box[1] - sc.box[0]); return { S, X: (x) => (x - sc.box[0]) * S, Y: (y) => (sc.box[3] - y) * S }; };
  // the dipole in state s: the force arrows (|F| in px, clamped), then the rod and the ends on top,
  // so that the signs stay readable; o.ghost: faint, without forces (the strobe)
  function draw(sc, s, W, o = {}) {
    const { X, Y } = geom(sc, W), { e, Fp, Fn } = forces(sc, s), R = 11;
    let g = '';
    if (!o.ghost) for (const [pt, F] of [[e.p, Fp], [e.n, Fn]]) {
      const f = Math.hypot(F[0], F[1]);
      if (!(f > 1e-6)) continue;
      const ux = F[0] / f, uy = -F[1] / f, x = X(pt[0]), y = Y(pt[1]);
      let len = R + Math.max(10, Math.min(70, sc.px * f));
      // an arrow towards the charge ends at its disc (radius 12 px), not across it
      if (sc.Q) { const qx = X(sc.Q.x) - x, qy = Y(sc.Q.y) - y, along = qx * ux + qy * uy, off = Math.abs(qx * uy - qy * ux); if (along > 0 && off < 15) len = Math.max(R + 6, Math.min(len, along - Math.sqrt(225 - off * off))); }
      g += C.arrow(x, y, x + len * ux, y + len * uy, 'v-force');
    }
    g += `<line class="rod" x1="${f1(X(e.n[0]))}" y1="${f1(Y(e.n[1]))}" x2="${f1(X(e.p[0]))}" y2="${f1(Y(e.p[1]))}"/>`;
    g += C.particle(X(e.p[0]), Y(e.p[1]), R, 1) + C.particle(X(e.n[0]), Y(e.n[1]), R, -1);
    return o.ghost ? `<g class="ghost">${g}</g>` : g;
  }
  // a still for reduced motion: faint positions along the way, the last one full
  function strobe(sc, W) {
    let s = init(sc), out = '';
    const marks = sc.kind === 'uniform' ? [0, 0.35, 0.7] : [0, 1.2, 2.4, 3.6], end = simulate(sc, null, sc.T);
    for (let i = 0, k = 0; i <= Math.round(sc.T / DT) && k < marks.length; i++) {
      if (s.t >= marks[k] - 1e-9) { out += draw(sc, s, W, { ghost: true }); k++; }
      s = step(sc, s);
    }
    return out + draw(sc, end, W);
  }

  function html(kind, o = {}) {
    const sc = scene(kind, o), W = o.W || (o.small ? 260 : 380);
    const label = kind === 'point' ? L('A dipole near a positive charge: it turns round and is attracted', 'Ein Dipol nahe einer positiven Ladung: Er dreht sich und wird angezogen')
      : L('A dipole in a uniform field: it swings round and settles along the field', 'Ein Dipol im homogenen Feld: Er schwingt um die Feldrichtung und kommt in Feldrichtung zur Ruhe');
    const bg = C.fig(sc.c, { box: sc.box, W, lines: true, lineOpts: kind === 'point' ? { per: 6 } : {}, labels: kind === 'point' ? ['+2'] : null, small: o.small, label });
    const data = JSON.stringify({ kind: sc.kind, angle: f1((sc.th * 180) / Math.PI), x: sc.x, y: sc.y, W });
    const svg = bg.replace('<svg class="ef ', `<svg data-scene='${data}' class="ef dip-anim `).replace(/<\/svg>$/, `<g class="dip">${draw(sc, init(sc), W)}</g></svg>`);
    return `<div class="dip-anim-wrap">${svg}<button type="button" class="dip-replay">↻ ${L('Replay', 'Nochmals')}</button></div>`;
  }

  // ---------------------------------------------------------------- running (browser only)
  // one loop per figure; start() stops them all first, and a loop whose figure has left the page
  // (the tutor replaced the frame) stops itself, so nothing keeps running in the background
  const loops = new Set();
  function stop() { for (const l of loops) cancelAnimationFrame(l.id); loops.clear(); }
  function run(svg) {
    for (const l of loops) if (l.svg === svg) { cancelAnimationFrame(l.id); loops.delete(l); }
    const d = JSON.parse(svg.getAttribute('data-scene')), sc = scene(d.kind, d), g = svg.querySelector('g.dip');
    const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { g.innerHTML = strobe(sc, d.W); return; }
    let s = init(sc), last = null, wait = PAUSE, acc = 0;
    g.innerHTML = draw(sc, s, d.W);
    const l = { svg, id: 0 };
    const tick = (now) => {
      if (!svg.isConnected) { loops.delete(l); return; }
      // a long frame (a hidden tab, a slow device) does not make it jump: at most 1/20 s at a time
      const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      if (wait > 0) wait -= dt; else { acc += dt; while (acc >= DT) { s = step(sc, s); acc -= DT; } }
      g.innerHTML = draw(sc, s, d.W);
      if (s.done || s.t >= sc.T) { loops.delete(l); return; }
      l.id = requestAnimationFrame(tick);
    };
    l.id = requestAnimationFrame(tick);
    loops.add(l);
  }
  function start(el) {
    stop();
    if (!el || !el.querySelectorAll) return;
    const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.querySelectorAll('.dip-anim-wrap').forEach((w) => {
      const svg = w.querySelector('svg.dip-anim'), b = w.querySelector('.dip-replay');
      if (!svg) return;
      if (b) { b.hidden = !!reduced; b.onclick = () => run(svg); } // onclick: starting twice adds no second handler
      run(svg);
    });
  }

  const api = { html, start, stop, scene, step, simulate, forces };
  root.DipoleAnim = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
