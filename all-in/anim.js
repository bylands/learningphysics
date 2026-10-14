// All In: a short animation for every round, drawn on a canvas. Each shows the phenomenon; a
// Predict round has two: 'setup' (loops, and stops before the outcome) for the question and
// 'outcome' (plays once, then holds) for the reveal. Estimate and Calculate rounds loop one scene
// in both, the outcome with the answer written in.
//   AllInAnim.mount(canvas, roundId, mode)  → { stop(), replay() }
// Drawn in a logical 800 × 340 box, scaled to the canvas's width; the colours follow the page's
// light or dark theme. With reduced motion, one still frame is drawn.
(function (root) {
  'use strict';

  const W = 800, H = 340;
  const L = (en, de) => (root.Lang ? root.Lang.L(en, de) : en);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, d) => (cs.getPropertyValue(n).trim() || d);
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      dark, ink: v('--ink', '#1f2328'), muted: v('--muted', '#646b73'), line: v('--line', '#d9d6ce'),
      card: v('--card', '#fff'), bg: v('--bg', '#f6f5f1'), accent: v('--accent', '#2b59c3'),
      ok: v('--ok', '#1d7a3e'), bad: v('--bad', '#b3261e'), warn: v('--warn', '#8a5a00'), chip: v('--chip', '#d4a017'),
      copper: '#c46f3a', water: dark ? 'rgba(90,160,255,0.22)' : 'rgba(70,140,230,0.18)', cold: dark ? '#6aa8ff' : '#2f6fdc',
      glow: '#ffd23f', brown: dark ? '#8a5a3c' : '#6b3f24', red: '#e5484d',
    };
  }

  // drawing helpers on the 800 × 340 box
  function kit(ctx, P) {
    const k = {
      P,
      line(x1, y1, x2, y2, col = P.ink, w = 2, dash) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      },
      path(pts, col = P.ink, w = 2, close, fill) {
        ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        if (close) ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); }
        ctx.restore();
      },
      rect(x, y, w, h, o = {}) {
        ctx.save(); ctx.beginPath();
        const r = o.r || 0;
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
        if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
        if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
        ctx.restore();
      },
      circle(x, y, r, o = {}) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 2 * Math.PI);
        if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
        if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
        ctx.restore();
      },
      text(s, x, y, o = {}) {
        ctx.save(); ctx.fillStyle = o.col || P.ink; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
        ctx.font = `${o.weight || 500} ${o.size || 17}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillText(s, x, y); ctx.restore();
      },
      arrow(x1, y1, x2, y2, col = P.accent, w = 3, head = 11) {
        const a = Math.atan2(y2 - y1, x2 - x1);
        k.line(x1, y1, x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6, col, w);
        k.path([[x2, y2], [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)], [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)]], null, 0, true, col);
      },
      // a dimension line with end ticks and a label beside its middle
      dim(x1, y1, x2, y2, label, col = P.muted, off = 0) {
        k.line(x1, y1, x2, y2, col, 1.5);
        const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, t = 6;
        [[x1, y1], [x2, y2]].forEach(([x, y]) => k.line(x - Math.cos(a) * t, y - Math.sin(a) * t, x + Math.cos(a) * t, y + Math.sin(a) * t, col, 1.5));
        k.text(label, (x1 + x2) / 2 + Math.cos(a) * (14 + off), (y1 + y2) / 2 + Math.sin(a) * (14 + off), { col, size: 16 });
      },
      // a pulsing question mark
      ask(x, y, t, size = 40) {
        k.text('?', x, y, { size: size * (1 + 0.08 * Math.sin(t * 5)), weight: 800, col: P.bad });
      },
      // a stopwatch showing the seconds, or a clock face turning
      watch(x, y, r, frac, label) {
        k.circle(x, y, r, { fill: P.card, stroke: P.ink, lw: 2.5 });
        k.rect(x - 5, y - r - 8, 10, 7, { fill: P.ink });
        const a = -Math.PI / 2 + 2 * Math.PI * frac;
        k.line(x, y, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, P.bad, 2.5);
        k.circle(x, y, 3, { fill: P.ink });
        if (label) k.text(label, x, y + r + 16, { size: 16, weight: 600 });
      },
      thermo(x, y, h, frac, label, col = P.red) {
        k.rect(x - 7, y, 14, h, { fill: P.card, stroke: P.ink, r: 7, lw: 2 });
        k.circle(x, y + h + 8, 13, { fill: col, stroke: P.ink, lw: 2 });
        const f = clamp(frac, 0, 1) * (h - 8);
        k.rect(x - 3.5, y + h - f, 7, f + 6, { fill: col });
        if (label) k.text(label, x + 22, y + h - f, { align: 'left', size: 16, weight: 600 });
      },
      ctx,
    };
    return k;
  }

  // a tiny person: head and sticks, running (phase in radians) or standing
  function person(k, x, y, s = 1, run = null, col) {
    const c = col || k.P.ink, sw = Math.sin(run || 0) * (run == null ? 0 : 1);
    k.circle(x, y - 46 * s, 8 * s, { fill: c });
    k.line(x, y - 38 * s, x, y - 16 * s, c, 3 * s);
    k.line(x, y - 32 * s, x + 12 * s * sw, y - 22 * s, c, 3 * s);
    k.line(x, y - 32 * s, x - 12 * s * sw, y - 22 * s, c, 3 * s);
    k.line(x, y - 16 * s, x + 10 * s * sw + (run == null ? 6 * s : 0), y, c, 3 * s);
    k.line(x, y - 16 * s, x - 10 * s * sw - (run == null ? 6 * s : 0), y, c, 3 * s);
  }

  // ------------------------------------------------------------------ the race of the two balls
  // Both tracks from the same start to the same end, the second with a dip; the balls run without
  // friction, v = √(2g·drop), integrated along each track's length.
  const TRACK = (() => {
    const x0 = 70, x1 = 730, drop = 80, g = 900;
    const shape = (dip) => (u) => drop * u + dip * Math.sin(Math.PI * u);
    const make = (dip, top) => {
      const f = shape(dip), pts = [];
      for (let i = 0; i <= 400; i++) { const u = i / 400; pts.push([x0 + (x1 - x0) * u, top + f(u)]); }
      const s = [0];
      for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      // time at each point: dt = ds / v
      const tt = [0];
      for (let i = 1; i < pts.length; i++) {
        const v = (yy) => Math.sqrt(2 * g * Math.max(0, yy - top) + 400);
        const va = v(pts[i - 1][1]), vb = v(pts[i][1]);
        tt.push(tt[i - 1] + (s[i] - s[i - 1]) / ((va + vb) / 2));
      }
      return { pts, tt, top, T: tt[tt.length - 1] };
    };
    return { a: make(0, 40), b: make(70, 175), x0, x1 };
  })();
  function trackAt(tr, t) {
    if (t >= tr.T) return tr.pts[tr.pts.length - 1];
    let i = 1;
    while (tr.tt[i] < t) i++;
    const f = (t - tr.tt[i - 1]) / (tr.tt[i] - tr.tt[i - 1]);
    return [tr.pts[i - 1][0] + f * (tr.pts[i][0] - tr.pts[i - 1][0]), tr.pts[i - 1][1] + f * (tr.pts[i][1] - tr.pts[i - 1][1])];
  }
  function drawTracks(k, t, mode) {
    const { a, b, x1 } = TRACK, P = k.P, r = 11;
    // the slowest ball takes about 3 s
    const scale = 3 / Math.max(a.T, b.T), tt = mode === 'outcome' ? Math.max(0, t - 0.6) / scale : 0;
    [[a, '1'], [b, '2']].forEach(([tr, n]) => {
      k.path(tr.pts.map(([x, y]) => [x, y + r + 2]), P.muted, 4);
      k.text(n, 40, tr.top + 4, { size: 22, weight: 800, col: P.accent });
    });
    k.line(x1 + 14, 20, x1 + 14, 320, P.bad, 2, [6, 6]);
    k.text(L('finish', 'Ziel'), x1 + 14, 12, { size: 14, col: P.bad });
    const done = [];
    [[a, P.accent], [b, P.chip]].forEach(([tr, col], i) => {
      const [x, y] = mode === 'outcome' ? trackAt(tr, tt) : tr.pts[0];
      k.circle(x, y, r, { fill: col, stroke: P.ink, lw: 1.5 });
      if (mode === 'outcome' && tt >= tr.T) done.push([tr.T, i, tr]);
    });
    if (mode === 'setup') { k.ask(560, 120, t); return; }
    done.sort((p, q) => p[0] - q[0]).forEach(([, , tr], rank) =>
      k.text(rank === 0 ? L('1st', '1.') : L('2nd', '2.'), x1 - 30, tr.pts[tr.pts.length - 1][1] - 22, { size: 18, weight: 800, col: rank === 0 ? P.ok : P.muted }));
  }

  // ------------------------------------------------------------------ the air in the room
  const MOLECULES = Array.from({ length: 70 }, (_, i) => {
    const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return { x: r(1), y: r(2), vx: (r(3) - 0.5) * 0.5, vy: (r(4) - 0.5) * 0.5 };
  });
  function drawRoom(k, t, mode) {
    const P = k.P, x = 230, y = 80, w = 340, h = 170, dx = 120, dy = -55;
    // the box in an oblique view: back, sides, front
    k.path([[x + dx, y + dy], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]], P.line, 2);
    k.path([[x, y], [x + dx, y + dy]], P.line, 2); k.path([[x + w, y], [x + w + dx, y + dy]], P.line, 2);
    k.line(x + dx, y + dy, x + dx, y + h + dy, P.line, 2, [5, 5]); k.line(x + dx, y + h + dy, x, y + h, P.line, 2, [5, 5]);
    k.line(x + dx, y + h + dy, x + w + dx, y + h + dy, P.line, 2, [5, 5]);
    MOLECULES.forEach((m) => {
      const fx = ((m.x + m.vx * t) % 2 + 2) % 2, fy = ((m.y + m.vy * t) % 2 + 2) % 2;
      const u = fx > 1 ? 2 - fx : fx, v = fy > 1 ? 2 - fy : fy, depth = (m.x * 7) % 1;
      k.circle(x + u * w + depth * dx, y + v * h + depth * dy, 3.2, { fill: P.cold });
    });
    k.rect(x, y, w, h, { stroke: P.ink, lw: 2.5 });
    k.dim(x, y + h + 18, x + w, y + h + 18, '9 m', P.muted);
    k.dim(x + w + 14, y + h + 6, x + w + dx + 14, y + h + dy + 6, '7 m', P.muted, 6);
    k.dim(x - 18, y, x - 18, y + h, '3 m', P.muted);
    k.text(L('air: ρ ≈ 1.2 kg/m³', 'Luft: ρ ≈ 1.2 kg/m³'), 120, 30, { size: 17, col: P.cold, weight: 600 });
    k.text(mode === 'outcome' ? 'm = ρ·V ≈ 230 kg' : 'm = ?', 680, 30, { size: 20, weight: 700, col: mode === 'outcome' ? P.ok : P.bad });
  }

  // ------------------------------------------------------------------ the magnet in the copper tube
  function drawTubes(k, t, mode) {
    const P = k.P, top = 70, bottom = 310, xs = [270, 530];
    const tt = mode === 'outcome' ? Math.max(0, t - 0.5) : 0;
    // plastic: free fall through 240 px in about 0.7 s; copper: a quick start, then slow and steady
    const yPlastic = Math.min(top - 30 + 0.5 * 980 * tt * tt, bottom - 16);
    const vt = 55, tau = 0.08;
    const yCopper = Math.min(top - 30 + vt * (tt - tau * (1 - Math.exp(-tt / tau))), bottom - 16);
    xs.forEach((x, i) => {
      const copper = i === 1;
      k.rect(x - 26, top, 52, bottom - top, { fill: copper ? 'rgba(196,111,58,0.18)' : (P.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'), stroke: copper ? P.copper : P.muted, lw: 3 });
      k.text(copper ? L('copper', 'Kupfer') : L('plastic', 'Kunststoff'), x, bottom + 20, { size: 17, weight: 600, col: copper ? P.copper : P.muted });
      const y = copper ? yCopper : yPlastic;
      if (copper && mode === 'outcome' && tt > 0 && y < bottom - 16) {
        // eddy currents: rings above and below the moving magnet
        [-1, 1].forEach((s) => {
          const ring = k.ctx;
          ring.save(); ring.strokeStyle = P.copper; ring.globalAlpha = 0.5 + 0.3 * Math.sin(t * 12); ring.lineWidth = 2.5;
          ring.beginPath(); ring.ellipse(x, y + s * 26, 26, 6, 0, 0, 2 * Math.PI); ring.stroke(); ring.restore();
        });
      }
      k.rect(x - 14, y - 16, 28, 16, { fill: P.red, stroke: P.ink, lw: 1.5 });
      k.rect(x - 14, y, 28, 16, { fill: P.accent, stroke: P.ink, lw: 1.5 });
      k.text('N', x, y - 8, { size: 12, weight: 800, col: '#fff' }); k.text('S', x, y + 8, { size: 12, weight: 800, col: '#fff' });
    });
    k.text('1 m', 400, (top + bottom) / 2, { size: 16, col: P.muted });
    if (mode === 'setup') { k.arrow(400, 50, 400, 110, P.muted, 2.5); k.ask(400, 30, t, 32); }
  }

  // ------------------------------------------------------------------ up the stairs
  function drawStairs(k, t, mode) {
    const P = k.P, n = 10, x0 = 170, y0 = 300, sw = 46, sh = 21;
    const pts = [[x0 - 60, y0]];
    for (let i = 0; i < n; i++) { pts.push([x0 + i * sw, y0 - i * sh]); pts.push([x0 + i * sw, y0 - (i + 1) * sh]); }
    pts.push([x0 + n * sw + 60, y0 - n * sh]);
    k.path(pts, P.ink, 3);
    const cycle = 6, u = clamp((t % cycle) / 4, 0, 1);
    const step = u * n, i = Math.min(n - 1, Math.floor(step)), f = step - i;
    const px = x0 - 20 + step * sw + 10, py = y0 - i * sh - (f > 0.5 ? sh : sh * f * 2 * 0.5);
    person(k, u >= 1 ? x0 + n * sw + 20 : px, u >= 1 ? y0 - n * sh : py, 1.1, u < 1 ? t * 14 : null, P.accent);
    k.text('60 kg', u >= 1 ? x0 + n * sw + 20 : px, (u >= 1 ? y0 - n * sh : py) - 72, { size: 15, weight: 700, col: P.accent });
    k.dim(x0 + n * sw + 90, y0, x0 + n * sw + 90, y0 - n * sh, 'h = 3.0 m', P.muted, -76);
    k.watch(90, 80, 34, Math.min(t % cycle, 4) / 4, `${Math.min(t % cycle, 4).toFixed(1)} s`);
    k.text(mode === 'outcome' ? 'P ≈ 440 W' : 'P = ?', 400, 40, { size: 22, weight: 700, col: mode === 'outcome' ? P.ok : P.bad });
  }

  // ------------------------------------------------------------------ two ice cubes
  const PLUME = Array.from({ length: 26 }, (_, i) => ({ dx: ((i * 37) % 23) - 11, d: (i * 0.173) % 1, s: 0.6 + ((i * 53) % 10) / 25 }));
  function drawIce(k, t, mode) {
    const P = k.P, top = 80, bottom = 310, wl = 110, glasses = [[230, false], [570, true]];
    glasses.forEach(([x, salt]) => {
      const w = 170;
      k.rect(x - w / 2, wl, w, bottom - wl, { fill: P.water });
      if (salt) k.text('NaCl', x + w / 2 - 28, bottom - 16, { size: 13, col: P.muted, weight: 600 });
      let size = 46, y = wl - 12;
      if (mode === 'setup') {
        const u = clamp((t % 5) / 1.2, 0, 1);
        y = top - 70 + (wl - 12 - (top - 70)) * ease(u) + (u >= 1 ? 3 * Math.sin((t % 5) * 4) * Math.exp(-(t % 5 - 1.2)) : 0);
      } else {
        const u = clamp(t / 7, 0, 1);
        size = 46 * (salt ? 1 - 0.35 * u : 1 - u);
        if (salt) {
          // the fresh meltwater stays on top: a cold layer
          k.rect(x - w / 2, wl, w, 6 + 22 * u, { fill: P.dark ? 'rgba(106,168,255,0.45)' : 'rgba(47,111,220,0.35)' });
        } else {
          // the cold meltwater sinks
          PLUME.forEach((p) => {
            const age = (t * 0.45 + p.d) % 1, yy = wl + 20 + age * (bottom - wl - 30);
            if (u < 1) k.circle(x + p.dx * (1 + age * 2.5), yy, 3.2 * p.s, { fill: P.cold });
          });
          k.rect(x - w / 2, bottom - 10 - 30 * u, w, 10 + 30 * u, { fill: P.dark ? 'rgba(106,168,255,0.35)' : 'rgba(47,111,220,0.25)' });
        }
      }
      if (size > 2) k.rect(x - size / 2, y - size * 0.25, size, size * 0.85, { fill: P.dark ? 'rgba(220,240,255,0.85)' : 'rgba(210,235,255,0.95)', stroke: P.cold, lw: 2, r: 6 });
      k.path([[x - w / 2, top - 10], [x - w / 2, bottom], [x + w / 2, bottom], [x + w / 2, top - 10]], P.ink, 3);
      k.text(salt ? L('salt water', 'Salzwasser') : L('tap water', 'Leitungswasser'), x, bottom + 18, { size: 17, weight: 600 });
    });
    k.text('20 °C', 400, 200, { size: 16, col: P.muted });
    if (mode === 'setup') k.ask(400, 150, t, 34);
  }

  // ------------------------------------------------------------------ a chocolate bar as fuel
  function drawChocolate(k, t, mode) {
    const P = k.P, cycle = 6, u = clamp((t % cycle) / 4.5, 0, 1);
    // the bar, eaten as the student rises
    const cols = 6, bw = 30, x = 70, y = 150, left = Math.ceil(cols * (1 - u));
    for (let i = 0; i < cols; i++) for (let j = 0; j < 3; j++)
      if (i < left) k.rect(x + i * bw, y + j * 26, bw - 3, 23, { fill: P.brown, r: 3 });
    k.text('100 g · 2250 kJ', x + cols * bw / 2, y + 100, { size: 16, weight: 700 });
    k.arrow(270, 190, 360, 190, P.chip, 4, 14);
    // a mountain, and the student lifted up a pole
    k.path([[380, 320], [560, 40], [650, 160], [760, 320]], null, 0, true, P.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)');
    k.line(470, 320, 470, 30, P.muted, 3);
    const py = 310 - u * 270;
    k.rect(448, py, 44, 6, { fill: P.ink });
    person(k, 470, py, 0.9, null, P.accent);
    k.text('60 kg', 520, py - 26, { size: 15, weight: 700, col: P.accent, align: 'left' });
    k.dim(430, 316, 430, py + 3, '', P.muted);
    k.text(mode === 'outcome' && u >= 1 ? 'h ≈ 3.8 km' : 'h = ?', 415, 300, { size: 20, weight: 700, col: mode === 'outcome' && u >= 1 ? P.ok : P.bad, align: 'right' });
  }

  // ------------------------------------------------------------------ paper on a book
  function drawPaper(k, t, mode) {
    const P = k.P, floor = 315, x = 400, w = 180, top = 50;
    k.line(150, floor, 650, floor, P.ink, 3);
    const tt = mode === 'outcome' ? Math.max(0, t - 0.7) : 0;
    const y = Math.min(top + 0.5 * 900 * tt * tt, floor - 40);
    k.rect(x - w / 2, y, w, 40, { fill: P.accent, stroke: P.ink, lw: 2, r: 3 });
    k.rect(x - w / 2 + 6, y + 6, w - 12, 28, { fill: P.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)', r: 2 });
    // the sheet on top: in the outcome it stays on the book all the way down
    k.rect(x - w / 2 - 10, y - 5, w + 20, 4, { fill: P.dark ? '#e9e6df' : '#ffffff', stroke: P.muted, lw: 1 });
    k.text(L('paper', 'Papier'), x + w / 2 + 50, y - 3, { size: 16, col: P.muted });
    k.text(L('book', 'Buch'), x + w / 2 + 50, y + 22, { size: 16, col: P.muted });
    if (mode === 'setup') {
      [-1, 1].forEach((s) => { k.circle(x + s * (w / 2 + 2), y + 20, 9, { fill: P.chip }); });
      k.arrow(x, y + 70, x, y + 140, P.muted, 2.5);
      k.ask(x + 120, 170, t, 34);
    }
  }

  // ------------------------------------------------------------------ a second bulb
  function drawBulbs(k, t, mode) {
    const P = k.P, l = 160, r = 640, top = 90, bot = 270;
    const cycle = mode === 'setup' ? (t % 6) : t;
    const two = mode === 'outcome' ? cycle > 1.2 : cycle > 2.5;
    const slide = mode === 'outcome' ? ease((cycle - 1.2) / 0.8) : ease((cycle - 2.5) / 0.8);
    // the battery on the left
    k.line(l, top, l, 160, P.ink, 3); k.line(l, 200, l, bot, P.ink, 3);
    k.line(l - 26, 160, l + 26, 160, P.ink, 4); k.line(l - 14, 175, l + 14, 175, P.ink, 7);
    k.line(l - 26, 188, l + 26, 188, P.ink, 4); k.line(l - 14, 200, l + 14, 200, P.ink, 7);
    k.text('+', l + 40, 160, { size: 18, weight: 800 }); k.text('U', l - 46, 180, { size: 18, weight: 700 });
    k.line(l, bot, r, bot, P.ink, 3); k.line(r, top, r, bot, P.ink, 3);
    // the wire along the top, with one bulb, or with a gap for the second sliding in
    const b1 = 300, b2 = 480;
    const bright = mode === 'outcome' && two ? 0.25 : 1;
    const unknown = mode === 'setup' && two;
    const bulb = (x, y, on) => {
      if (on > 0 && !unknown) k.circle(x, y, 24 + 26 * on, { fill: `rgba(255,210,63,${0.15 + 0.45 * on})` });
      k.circle(x, y, 20, { fill: unknown ? P.card : on > 0 ? P.glow : P.card, stroke: P.ink, lw: 2.5 });
      k.line(x - 10, y + 10, x + 10, y - 10, P.ink, 1.5); k.line(x - 10, y - 10, x + 10, y + 10, P.ink, 1.5);
      if (unknown) k.ask(x, y - 44, t, 26);
    };
    k.line(l, top, b1 - 20, top, P.ink, 3);
    if (!two) { k.line(b1 + 20, top, r, top, P.ink, 3); }
    else {
      k.line(b1 + 20, top, b2 - 20, top, P.ink, 3); k.line(b2 + 20, top, r, top, P.ink, 3);
    }
    bulb(b1, top, two ? bright : 1);
    if (two) bulb(b2, top - (1 - slide) * 90, slide >= 1 ? bright : 0);
    // the charges along the wire: as fast as the current
    const speed = two && !unknown ? 0.5 : 1, n = 16, perim = 2 * (r - l) + 2 * (bot - top);
    if (!unknown) for (let i = 0; i < n; i++) {
      let s = ((i / n) + t * 0.06 * speed) % 1 * perim; let x, y;
      if (s < r - l) { x = l + s; y = top; } else if ((s -= r - l) < bot - top) { x = r; y = top + s; }
      else if ((s -= bot - top) < r - l) { x = r - s; y = bot; } else { s -= r - l; x = l; y = bot - s; }
      if (!(x === l && y > 150 && y < 210)) k.circle(x, y, 4, { fill: P.accent });
    }
    k.text(two ? (unknown ? 'I = ?' : 'I / 2') : 'I', 400, 310, { size: 20, weight: 700, col: unknown ? P.bad : P.accent });
  }

  // ------------------------------------------------------------------ a balloon in the car
  function drawCar(k, t, mode) {
    const P = k.P, ground = 290;
    const tt = mode === 'outcome' ? Math.max(0, t - 0.8) : 0;
    const x = 120 + Math.min(0.5 * 150 * tt * tt, 380);
    const tilt = mode === 'outcome' && tt > 0 ? clamp(tt / 0.3, 0, 1) * 0.3 : 0;
    // the road, with stripes
    k.line(20, ground + 22, 780, ground + 22, P.ink, 3);
    for (let i = 0; i < 8; i++) k.line(40 + i * 100, ground + 34, 80 + i * 100, ground + 34, P.line, 4);
    // the car
    k.rect(x, ground - 150, 260, 140, { fill: P.dark ? 'rgba(122,162,255,0.10)' : 'rgba(43,89,195,0.06)', stroke: P.accent, lw: 4, r: 26 });
    k.rect(x + 10, ground - 140, 240, 70, { stroke: P.line, lw: 2, r: 18 });
    [x + 55, x + 205].forEach((wx) => { k.circle(wx, ground, 22, { fill: P.ink }); k.circle(wx, ground, 9, { fill: P.muted }); });
    // the balloon on a string from the floor, and for comparison a ball hanging from the roof
    const ax = x + 150, ay = ground - 18, len = 85;
    const bx = ax + Math.sin(tilt) * len, by = ay - Math.cos(tilt) * len;
    k.line(ax, ay, bx, by + 22, P.muted, 1.5);
    k.ctx.save(); k.ctx.fillStyle = P.red; k.ctx.beginPath(); k.ctx.ellipse(bx, by, 18, 22, tilt, 0, 2 * Math.PI); k.ctx.fill(); k.ctx.restore();
    if (mode === 'outcome') {
      const hx = x + 80, hy = ground - 148, hl = 60;
      const px = hx - Math.sin(tilt) * hl, py = hy + Math.cos(tilt) * hl;
      k.line(hx, hy, px, py, P.muted, 1.5); k.circle(px, py, 8, { fill: P.ink });
    }
    k.text('He', bx, by, { size: 12, weight: 800, col: '#fff' });
    if (x < 420) {
      k.arrow(x + 275, ground - 80, x + 335, ground - 80, P.ok, 4, 14);
      k.text(L('accelerates', 'beschleunigt'), x + 310, ground - 56, { size: 15, weight: 600, col: P.ok });
    }
    if (mode === 'setup') k.ask(ax, ay - 150, t, 32);
  }

  // ------------------------------------------------------------------ electrons in a charger cable
  function drawCable(k, t, mode) {
    const P = k.P, y = 180, x0 = 90, x1 = 650;
    k.rect(x0, y - 34, x1 - x0, 68, { fill: P.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', stroke: P.ink, lw: 2.5, r: 34 });
    k.rect(x1, y - 22, 50, 44, { fill: P.muted, r: 6 }); k.rect(x1 + 50, y - 10, 30, 20, { fill: P.line, r: 3 });
    for (let i = 0; i < 46; i++) {
      const lane = ((i * 37) % 9) / 9 - 0.45, s = ((i / 46) - t * 0.05) % 1;
      const xx = x0 + 30 + ((s + 1) % 1) * (x1 - x0 - 60);
      k.circle(xx, y + lane * 54, 5, { fill: P.cold });
    }
    k.text('e⁻', x0 + 40, y - 52, { size: 18, weight: 700, col: P.cold });
    k.arrow(x0 + 260, y - 60, x0 + 360, y - 60, P.bad, 3, 12);
    k.text('I = 2 A', x0 + 310, y - 82, { size: 18, weight: 700, col: P.bad });
    k.watch(400, 285, 30, (t % 8) / 8, 't = 1 h');
    k.text(mode === 'outcome' ? 'N ≈ 4.5·10²²' : 'N = ?', 680, 60, { size: 22, weight: 700, col: mode === 'outcome' ? P.ok : P.bad });
  }

  // ------------------------------------------------------------------ a hot shower
  const DROPS = Array.from({ length: 34 }, (_, i) => ({ dx: ((i * 29) % 31) - 15, d: (i * 0.137) % 1 }));
  function drawShower(k, t, mode) {
    const P = k.P, x = 330, head = 70, floor = 310, cycle = 6, u = clamp((t % cycle) / 5, 0, 1);
    k.line(x + 120, 30, x + 120, head - 10, P.muted, 6); k.line(x + 120, 30, x, 30, P.muted, 6); k.line(x, 30, x, head - 14, P.muted, 6);
    k.path([[x - 50, head], [x + 50, head], [x + 30, head - 18], [x - 30, head - 18]], P.ink, 2, true, P.muted);
    DROPS.forEach((d) => {
      const age = (t * 1.6 + d.d) % 1;
      k.line(x + d.dx * (1 + age * 2.2), head + 6 + age * (floor - head - 10), x + d.dx * (1 + age * 2.2), head + 18 + age * (floor - head - 10), P.cold, 2.5);
    });
    k.line(x - 120, floor, x + 120, floor, P.ink, 3);
    const temp = 15 + 25 * ease(u);
    k.thermo(620, 70, 190, (temp - 0) / 50, `${Math.round(temp)} °C`);
    k.watch(150, 110, 34, u, '5 min');
    k.text('10 L/min', x - 140, head + 20, { size: 15, col: P.muted, align: 'right' });
    k.text(mode === 'outcome' ? 'Q ≈ 5·10⁶ J' : 'Q = ?', 150, 250, { size: 22, weight: 700, col: mode === 'outcome' ? P.ok : P.bad });
  }

  // ------------------------------------------------------------------ an emergency stop
  // 30 m/s, then 6.0 m/s² for 5 s over 75 m (7 px per m), in real time
  function drawBraking(k, t, mode) {
    const P = k.P, ground = 250, ppm = 6.4, xb = 140, cycle = 8;
    const tt = t % cycle, approach = 0.6;
    let x, v;
    if (tt < approach) { x = xb - 30 * ppm * (approach - tt); v = 30; }
    else { const tb = Math.min(tt - approach, 5); x = xb + ppm * (30 * tb - 3 * tb * tb); v = 30 - 6 * tb; }
    k.line(20, ground + 20, 780, ground + 20, P.ink, 3);
    for (let i = 0; i < 10; i++) k.line(30 + i * 80, ground + 34, 70 + i * 80, ground + 34, P.line, 4);
    // the car (its front at x)
    k.rect(x - 110, ground - 40, 110, 42, { fill: P.accent, r: 12 });
    k.rect(x - 85, ground - 66, 60, 30, { fill: P.accent, r: 10 });
    [x - 85, x - 25].forEach((wx) => k.circle(wx, ground + 4, 13, { fill: P.ink }));
    if (tt >= approach && v > 0) k.rect(x - 114, ground - 34, 8, 12, { fill: P.red, r: 2 });
    k.line(xb, ground - 110, xb, ground + 20, P.bad, 2, [5, 5]);
    k.text(L('brakes', 'bremst'), xb, ground - 122, { size: 15, weight: 600, col: P.bad });
    const end = xb + 75 * ppm;
    k.dim(xb, ground + 60, mode === 'outcome' || v <= 0 ? end : Math.max(xb, x), ground + 60, mode === 'outcome' && v <= 0 ? 's = 75 m' : 's = ?', mode === 'outcome' && v <= 0 ? P.ok : P.bad);
    k.text(`v = ${v.toFixed(0)} m/s`, 120, 40, { size: 20, weight: 700 });
    k.text('a = 6.0 m/s²', 120, 68, { size: 17, col: P.muted });
  }

  // ------------------------------------------------------------------ the kettle
  const BUBBLES = Array.from({ length: 24 }, (_, i) => ({ dx: ((i * 41) % 90) - 45, d: (i * 0.211) % 1 }));
  function drawKettle(k, t, mode) {
    const P = k.P, x = 340, base = 300, cycle = 7, u = clamp((t % cycle) / 6, 0, 1);
    k.path([[x - 90, base], [x + 90, base], [x + 70, 100], [x - 70, 100]], P.ink, 3, true, P.card);
    k.path([[x - 70 + 4, base - 4], [x + 90 - 4, base - 4], [x + 75, 150], [x - 75, 150]], null, 0, true, P.water);
    k.path([[x + 70, 110], [x + 125, 120], [x + 125, 240], [x + 82, 250]], P.ink, 6);
    k.path([[x - 70, 120], [x - 115, 95]], P.ink, 5);
    k.rect(x - 105, base, 210, 16, { fill: P.ink, r: 4 });
    const n = Math.round(BUBBLES.length * u);
    BUBBLES.slice(0, n).forEach((b) => { const age = (t * 0.9 + b.d) % 1; k.circle(x + b.dx, base - 10 - age * 140, 3 + 3 * age, { stroke: P.cold, lw: 1.5 }); });
    const temp = 20 + 80 * ease(u);
    k.thermo(600, 70, 190, temp / 110, `${Math.round(temp)} °C`);
    k.text('2000 W', x, base + 34, { size: 17, weight: 700 });
    k.text('1.0 L', x, 200, { size: 17, weight: 700, col: P.cold });
    k.watch(130, 110, 34, u, mode === 'outcome' ? 't ≈ 167 s' : 't = ?');
  }

  const SCENES = {
    tracks: { draw: drawTracks, setup: 3, outcome: 4.6 },
    'room-air': { draw: drawRoom, setup: 1e9, outcome: 1e9 },
    'copper-tube': { draw: drawTubes, setup: 3, outcome: 5.5 },
    stairs: { draw: drawStairs, setup: 1e9, outcome: 1e9 },
    'ice-cubes': { draw: drawIce, setup: 5, outcome: 7.5 },
    chocolate: { draw: drawChocolate, setup: 1e9, outcome: 1e9 },
    'paper-book': { draw: drawPaper, setup: 3, outcome: 2 },
    bulbs: { draw: drawBulbs, setup: 6, outcome: 2.5 },
    'balloon-car': { draw: drawCar, setup: 3, outcome: 3.6 },
    electrons: { draw: drawCable, setup: 1e9, outcome: 1e9 },
    shower: { draw: drawShower, setup: 1e9, outcome: 1e9 },
    braking: { draw: drawBraking, setup: 1e9, outcome: 1e9 },
    kettle: { draw: drawKettle, setup: 1e9, outcome: 1e9 },
  };

  // still frames, with reduced motion: the setup as it waits, the outcome at its end
  const STILL = { stairs: 4.5, chocolate: 4.6, shower: 5.2, braking: 7, kettle: 6.2, electrons: 1, 'room-air': 1, 'ice-cubes': 2 };

  function mount(canvas, id, mode) {
    const scene = SCENES[id];
    if (!scene || !canvas.getContext) return { stop() {}, replay() {} };
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let P = palette(), raf = 0, t0 = performance.now(), stopped = false;
    const size = () => {
      const w = canvas.clientWidth || W, dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * H / W * dpr);
      return (w * dpr) / W;
    };
    let s = size();
    const frame = (t) => {
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      scene.draw(kit(ctx, P), t, mode);
    };
    const tick = (now) => {
      if (stopped) return;
      if (!canvas.isConnected) { stopped = true; return; }
      const w = canvas.clientWidth || W;
      if (Math.abs(canvas.width - w * (window.devicePixelRatio || 1)) > 1) s = size();
      frame((now - t0) / 1000);
      raf = requestAnimationFrame(tick);
    };
    const theme = matchMedia('(prefers-color-scheme: dark)');
    const onTheme = () => { P = palette(); if (reduce) still(); };
    theme.addEventListener?.('change', onTheme);
    const still = () => frame(mode === 'outcome' ? scene.outcome : (STILL[id] != null ? STILL[id] : 0.5));
    if (reduce) still(); else raf = requestAnimationFrame(tick);
    return {
      stop() { stopped = true; cancelAnimationFrame(raf); theme.removeEventListener?.('change', onTheme); },
      replay() { t0 = performance.now(); },
    };
  }

  // one frame at time t, e.g. for a test
  function drawAt(canvas, id, mode, t) {
    const ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    SCENES[id].draw(kit(ctx, palette()), t, mode);
  }

  root.AllInAnim = { mount, drawAt, SCENES, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
