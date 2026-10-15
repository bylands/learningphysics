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
    const dark = v('--scheme', '') === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches;
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

  // a value to show: red with "?" before the answer, green after it
  function result(k, s, x, y, done, o = {}) {
    k.text(s, x, y, { size: 22, weight: 700, col: done ? k.P.ok : k.P.bad, ...o });
  }
  // a reproducible random number in [0, 1) for index i
  const rand = (i, n = 0) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;

  // ------------------------------------------------------------------ two wires with a current
  function drawWires(k, t, mode) {
    const P = k.P, top = 50, bot = 290, xs = [320, 480];
    const bow = mode === 'outcome' ? 26 * ease((t - 0.6) / 1.2) : 0;
    k.line(250, top - 8, 550, top - 8, P.muted, 6); k.line(250, bot + 8, 550, bot + 8, P.muted, 6);
    xs.forEach((x, i) => {
      const s = i ? -1 : 1, mid = x + s * bow;
      // the wire as a gentle curve, its middle pulled sideways by bow
      const pts = [];
      for (let j = 0; j <= 30; j++) { const u = j / 30; pts.push([x + s * bow * Math.sin(Math.PI * u), top + (bot - top) * u]); }
      k.path(pts, P.copper, 4);
      // the charges, moving up
      for (let j = 0; j < 9; j++) {
        const u = ((j / 9) - t * 0.18) % 1, uu = (u + 1) % 1;
        k.circle(x + s * bow * Math.sin(Math.PI * uu), top + (bot - top) * uu, 3.5, { fill: P.accent });
      }
      k.arrow(mid - 26 * s, 200, mid - 26 * s, 140, P.accent, 3, 11);
      k.text('I', mid - 44 * s, 170, { size: 20, weight: 700, col: P.accent });
      // the magnetic field around the wire: rings seen in perspective
      const rx = x + s * bow * Math.sin(Math.PI * 0.25);
      [36, 56].forEach((r, n) => {
        k.ctx.save(); k.ctx.strokeStyle = P.cold; k.ctx.globalAlpha = 0.6 - n * 0.2; k.ctx.lineWidth = 2;
        k.ctx.setLineDash([6, 6]); k.ctx.lineDashOffset = -t * 20;
        k.ctx.beginPath(); k.ctx.ellipse(rx, 110, r, r * 0.28, 0, 0, 2 * Math.PI); k.ctx.stroke(); k.ctx.restore();
      });
      if (mode === 'outcome' && bow > 4) k.arrow(mid + s * 8, 245, mid + s * 46, 245, P.bad, 4, 13);
    });
    k.text('B', 230, 110, { size: 18, weight: 700, col: P.cold });
    if (mode === 'setup') k.ask(400, 245, t, 34);
    else if (bow > 4) k.text('F', 400, 270, { size: 20, weight: 700, col: P.bad });
  }

  // ------------------------------------------------------------------ a glowing filament
  function drawFilament(k, t, mode) {
    const P = k.P, x = 400, y = 120;
    const on = 0.75 + 0.25 * Math.abs(Math.sin(t * Math.PI * 1.2));
    k.circle(x, y, 95, { fill: `rgba(255,210,63,${0.10 + 0.12 * on})` });
    k.circle(x, y, 62, { fill: P.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', stroke: P.ink, lw: 2.5 });
    k.rect(x - 26, y + 56, 52, 40, { fill: P.muted, r: 4 });
    for (let j = 0; j < 4; j++) k.line(x - 26, y + 64 + j * 9, x + 26, y + 60 + j * 9, P.ink, 1.5);
    // the coil between two posts
    k.line(x - 18, y + 56, x - 30, y, P.ink, 2); k.line(x + 18, y + 56, x + 30, y, P.ink, 2);
    const coil = [];
    for (let j = 0; j <= 60; j++) { const u = j / 60; coil.push([x - 30 + 60 * u, y - 6 * Math.sin(u * Math.PI * 12)]); }
    k.path(coil, P.glow, 3.5);
    // the leads to the socket: the charges swing back and forth (alternating current, slowed down)
    const sw = 10 * Math.sin(t * Math.PI * 1.2);
    k.path([[x - 10, y + 96], [x - 10, 250], [250, 250], [250, 300]], P.ink, 3);
    k.path([[x + 10, y + 96], [x + 10, 270], [550, 270], [550, 300]], P.ink, 3);
    for (let j = 0; j < 6; j++) {
      k.circle(270 + j * 22 + sw, 250, 3.5, { fill: P.accent });
      k.circle(420 + j * 22 - sw, 270, 3.5, { fill: P.accent });
    }
    k.rect(220, 300, 360, 30, { fill: P.card, stroke: P.ink, lw: 2, r: 6 });
    k.text('~ 230 V', 400, 315, { size: 17, weight: 700 });
    k.text('60 W', x + 120, y - 40, { size: 20, weight: 700, col: P.chip, align: 'left' });
    result(k, mode === 'outcome' ? 'R ≈ 880 Ω' : 'R = ?', 140, 120, mode === 'outcome');
  }

  // ------------------------------------------------------------------ a charged phone
  function drawPhone(k, t, mode) {
    const P = k.P, cycle = 6, u = clamp((t % cycle) / 4.5, 0, 1);
    // the phone, its battery draining as the student rises
    k.rect(90, 70, 110, 200, { fill: P.card, stroke: P.ink, lw: 3, r: 16 });
    k.rect(115, 120, 60, 110, { stroke: P.ink, lw: 2.5, r: 5 }); k.rect(133, 112, 24, 8, { fill: P.ink, r: 2 });
    const lvl = 1 - u;
    k.rect(120, 125 + 100 * (1 - lvl), 50, 100 * lvl, { fill: lvl > 0.2 ? P.ok : P.bad, r: 3 });
    k.text('15 Wh', 145, 295, { size: 18, weight: 700 });
    k.arrow(230, 170, 320, 170, P.chip, 4, 14);
    // a tower block, and the student lifted along it
    const bx = 470, floors = 10, fh = 27;
    k.rect(bx - 70, 320 - floors * fh, 140, floors * fh, { stroke: P.muted, lw: 2 });
    for (let f = 0; f < floors; f++) for (let w = 0; w < 3; w++) k.rect(bx - 55 + w * 40, 320 - (f + 1) * fh + 7, 22, 13, { fill: P.line, r: 2 });
    const py = 312 - u * 270;
    k.line(bx + 100, 40, bx + 100, 320, P.muted, 3);
    k.rect(bx + 78, py, 44, 6, { fill: P.ink });
    person(k, bx + 100, py, 0.9, null, P.accent);
    k.text('60 kg', bx + 130, py - 26, { size: 15, weight: 700, col: P.accent, align: 'left' });
    result(k, mode === 'outcome' && u >= 1 ? 'h ≈ 92 m' : 'h = ?', bx + 200, 170, mode === 'outcome' && u >= 1);
  }

  // ------------------------------------------------------------------ a pulse on a rope
  // A hump runs to the fixed end; there it is reflected upside down (the image method: the rope
  // is the incoming pulse minus its mirror image beyond the wall).
  function drawRope(k, t, mode) {
    const P = k.P, y0 = 190, x0 = 70, wall = 700, v = 260, A = 70, w = 32;
    const bump = (u) => -A * Math.exp(-(u / w) * (u / w));
    let c;
    if (mode === 'setup') c = 120 + v * Math.min(t % 3.2, 1.85);
    else c = 120 + v * clamp(t - 0.4, 0, 4);
    const pts = [];
    for (let x = x0; x <= wall; x += 3) {
      const y = bump(x - c) - (mode === 'outcome' ? bump(2 * wall - x - c) : 0);
      pts.push([x, y0 + y]);
    }
    k.path(pts, P.ink, 4);
    // the wall, hatched
    k.rect(wall, 60, 26, 260, { fill: P.line });
    for (let j = 0; j < 9; j++) k.line(wall + 26, 70 + j * 28, wall + 6, 90 + j * 28, P.muted, 2);
    k.circle(wall, y0, 6, { fill: P.ink });
    // the hand at the start
    k.circle(x0 - 10, y0, 14, { fill: P.chip, stroke: P.ink, lw: 2 });
    if (mode === 'setup') { k.ask(wall - 70, 90, t, 34); return; }
    if (c > wall + 40) {
      const back = 2 * wall - c;
      if (back > x0 + 40) k.arrow(back + 40, y0 + A + 30, back - 40, y0 + A + 30, P.bad, 3, 12);
      k.text(L('upside down', 'umgekehrt'), Math.max(back, 160), y0 + A + 58, { size: 17, weight: 700, col: P.bad });
    } else if (c > x0 + 40) k.arrow(c - 40, y0 - A - 26, c + 40, y0 - A - 26, P.accent, 3, 12);
  }

  // ------------------------------------------------------------------ a radio wave
  function drawRadio(k, t, mode) {
    const P = k.P, y0 = 170, x0 = 140, lam = 180, amp = 55;
    // the mast with its antenna
    k.path([[60, 320], [90, 90], [120, 320]], P.ink, 3);
    k.line(70, 245, 110, 245, P.ink, 2); k.line(78, 170, 102, 170, P.ink, 2);
    k.circle(90, 82, 8, { fill: P.bad });
    const pts = [];
    for (let x = x0; x <= 760; x += 3) pts.push([x, y0 - amp * Math.sin(2 * Math.PI * ((x - x0) / lam - t * 0.6))]);
    k.path(pts, P.accent, 3.5);
    k.line(x0, y0, 760, y0, P.line, 1.5, [4, 6]);
    // a crest to the next one
    const ph = ((t * 0.6) % 1 + 1) % 1, c1 = x0 + lam * (0.25 + ph) + lam;
    k.dim(c1, y0 - amp - 22, c1 + lam, y0 - amp - 22, mode === 'outcome' ? 'λ ≈ 3.0 m' : 'λ = ?', mode === 'outcome' ? P.ok : P.bad);
    k.text('f = 100 MHz', 300, 300, { size: 18, weight: 700 });
    k.text('c = 3.0·10⁸ m/s', 560, 300, { size: 18, weight: 700, col: P.muted });
  }

  // ------------------------------------------------------------------ the siren
  // The ambulance (at v) sends out a wave front every 0.22 s (at 2.5 v); the listener hears the
  // frequency f' / f = c / (c − v·cos θ), plotted top right.
  function drawSiren(k, t, mode) {
    const P = k.P, road = 270, lx = 420, ly = 250, v = 170, c = 2.5 * v, start = 40;
    const tt = mode === 'setup' ? (t % 3.4) : t;
    const x = mode === 'setup' ? start + v * Math.min(tt, 1.5) : start + v * Math.max(0, tt - 0.3);
    k.line(0, road + 18, 800, road + 18, P.ink, 3);
    for (let i = 0; i < 9; i++) k.line(20 + i * 95, road + 32, 60 + i * 95, road + 32, P.line, 4);
    if (mode === 'outcome') {
      const T0 = 0.3, n = Math.floor(Math.max(0, tt - T0) / 0.22);
      for (let j = 0; j <= n; j++) {
        const te = T0 + j * 0.22, r = c * (tt - te), ex = start + v * (te - T0);
        if (r <= 0 || r > 700) continue;
        k.ctx.save(); k.ctx.globalAlpha = Math.max(0.08, 0.6 - r / 1100); k.ctx.strokeStyle = P.cold; k.ctx.lineWidth = 2;
        k.ctx.beginPath(); k.ctx.arc(ex, road - 30, r, Math.PI, 2 * Math.PI); k.ctx.stroke(); k.ctx.restore();
      }
    }
    person(k, lx, ly + 8, 1, null, P.accent);
    // the ambulance, passing in front of the listener
    k.rect(x - 70, road - 52, 120, 56, { fill: P.card, stroke: P.ink, lw: 2.5, r: 8 });
    k.rect(x + 50, road - 32, 30, 36, { fill: P.card, stroke: P.ink, lw: 2.5, r: 6 });
    k.rect(x - 22, road - 40, 8, 26, { fill: P.red }); k.rect(x - 31, road - 31, 26, 8, { fill: P.red });
    [x - 40, x + 50].forEach((wx) => k.circle(wx, road + 6, 12, { fill: P.ink }));
    k.circle(x - 10, road - 60, 7, { fill: Math.sin(t * 14) > 0 ? P.cold : P.red });
    // what the listener hears
    const gx = 560, gy = 30, gw = 200, gh = 90;
    k.rect(gx, gy, gw, gh, { stroke: P.line, lw: 1.5, r: 6 });
    k.text(L('pitch heard', 'gehörter Ton'), gx + gw / 2, gy + gh + 16, { size: 14, col: P.muted });
    k.line(gx + 6, gy + gh / 2, gx + gw - 6, gy + gh / 2, P.line, 1, [4, 4]);
    k.text('f', gx - 12, gy + gh / 2, { size: 15, col: P.muted });
    if (mode === 'setup') { k.ask(gx + gw / 2, gy + gh / 2, t, 32); k.ask(lx, ly - 90, t, 30); return; }
    const T = 4.6, heard = (s) => {
      const ex = start + v * Math.max(0, s - 0.3), dx = lx - ex, dy = (ly - 30) - (road - 30) - 40;
      return c / (c - v * dx / Math.hypot(dx, dy));
    };
    const pts = [];
    for (let s = 0; s <= Math.min(tt, T); s += 0.03) pts.push([gx + 6 + (gw - 12) * s / T, gy + gh / 2 - (heard(s) - 1) * 50]);
    if (pts.length > 1) k.path(pts, P.bad, 3);
  }

  // ------------------------------------------------------------------ a guitar string
  function drawGuitar(k, t, mode) {
    const P = k.P, x0 = 140, x1 = 660, y0 = 170;
    k.rect(90, y0 - 26, 620, 52, { fill: P.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', r: 8 });
    k.circle(470, y0, 46, { stroke: P.line, lw: 3 });
    k.rect(x0 - 8, y0 - 30, 8, 60, { fill: P.muted }); k.rect(x1, y0 - 30, 8, 60, { fill: P.muted });
    // the fundamental: a standing wave, half a wavelength between the ends (slowed down)
    const a = 34 * Math.cos(t * 2 * Math.PI * 1.4);
    const pts = [];
    for (let x = x0; x <= x1; x += 4) pts.push([x, y0 + a * Math.sin(Math.PI * (x - x0) / (x1 - x0))]);
    k.path(pts, P.chip, 3);
    k.ctx.save(); k.ctx.globalAlpha = 0.25;
    [1, -1].forEach((s) => { const e = []; for (let x = x0; x <= x1; x += 6) e.push([x, y0 + s * 34 * Math.sin(Math.PI * (x - x0) / (x1 - x0))]); k.path(e, P.chip, 1.5); });
    k.ctx.restore();
    k.dim(x0, 260, x1, 260, 'L = 65 cm', P.muted);
    k.text('λ = 2L', 400, 300, { size: 16, col: P.muted });
    k.text('f = 110 Hz', 140, 60, { size: 20, weight: 700 });
    result(k, mode === 'outcome' ? 'v ≈ 143 m/s' : 'v = ?', 640, 60, mode === 'outcome');
  }

  // ------------------------------------------------------------------ waves on the beach
  // The depth falls from deep to shallow; the speed goes with √depth and the frequency stays, so the
  // phase is ω·t − ∫ k dx with k = ω / v(x). In the setup the waves stop where it gets shallow.
  const BEACH = (() => {
    const x0 = 30, x1 = 770, surf = 120, depth = (x) => (x < 380 ? 170 : x > 470 ? 42 : 170 - 128 * ease((x - 380) / 90));
    const ph = [0];
    for (let x = x0 + 2; x <= x1; x += 2) ph.push(ph[ph.length - 1] + 2 / Math.sqrt(depth(x) / 170));
    return { x0, x1, surf, depth, ph };
  })();
  function drawBeach(k, t, mode) {
    const P = k.P, { x0, x1, surf, depth, ph } = BEACH, lam = 160;
    const bed = [];
    for (let x = x0; x <= x1; x += 10) bed.push([x, surf + depth(x)]);
    k.path([[x0, 330], ...bed, [x1, 330]], null, 0, true, P.dark ? 'rgba(201,160,90,0.35)' : 'rgba(194,150,80,0.35)');
    const pts = [];
    ph.forEach((p, i) => {
      const x = x0 + 2 * i;
      let a = 16 * Math.pow(170 / depth(x), 0.25);
      if (mode === 'setup') a *= clamp((420 - x) / 40, 0, 1);
      pts.push([x, surf - a * Math.sin(2 * Math.PI * (p / lam - t * 0.5))]);
    });
    k.path([[x0, 330], ...pts, [x1, 330]], null, 0, true, P.water);
    k.path(pts, P.cold, 3);
    k.path(bed, P.brown, 2.5);
    k.text(L('deep', 'tief'), 200, 260, { size: 17, weight: 600, col: P.muted });
    k.text(L('shallow', 'flach'), 620, 200, { size: 17, weight: 600, col: P.muted });
    k.arrow(80, 40, 160, 40, P.accent, 3, 12);
    const crest = (from, scale) => { // the next crest after x = from, its phase a whole number of λ
      for (let i = Math.round((from - x0) / 2); i < ph.length; i++) if (((ph[i] / lam - t * 0.5 - 0.25) % 1 + 1) % 1 < 0.02 * scale) return x0 + 2 * i;
      return from;
    };
    const c1 = crest(90, 1.4);
    k.dim(c1, 66, c1 + lam, 66, 'λ', P.muted);
    if (mode === 'setup') { k.ask(620, 80, t, 34); return; }
    const c2 = crest(500, 3);
    k.dim(c2, 66, c2 + lam / 2, 66, 'λ′', P.ok);
    k.text(L('shorter', 'kürzer'), c2 + lam / 4, 38, { size: 17, weight: 700, col: P.ok });
  }

  // ------------------------------------------------------------------ thunder and lightning
  function drawThunder(k, t, mode) {
    const P = k.P, cycle = 8.5, tt = t % cycle, flash = 0.6, sx = 150, sy = 250, hx = 690, d = hx - sx;
    const s = clamp(tt - flash, 0, 6);
    // the cloud and, for a moment, the bolt and its light everywhere
    [[110, 60, 40], [160, 50, 50], [215, 62, 38], [160, 80, 46]].forEach(([x, y, r]) => k.circle(x, y, r, { fill: P.line }));
    if (tt > flash && tt < flash + 0.35) {
      k.rect(0, 0, W, H, { fill: 'rgba(255,240,180,0.18)' });
      k.path([[160, 100], [138, 180], [166, 186], [140, 290]], P.glow, 5);
    }
    k.line(20, 290, 780, 290, P.ink, 3);
    k.circle(sx - 10, 286, 4, { fill: P.muted });
    // the sound front, at 343 m/s, so that it arrives after 6 s
    if (tt > flash && s < 6) {
      const r = d * s / 6;
      [0, 14, 28].forEach((o, j) => {
        if (r - o <= 0) return;
        k.ctx.save(); k.ctx.globalAlpha = 0.6 - j * 0.18; k.ctx.strokeStyle = P.chip; k.ctx.lineWidth = 3;
        k.ctx.beginPath(); k.ctx.arc(sx, 290, r - o, Math.PI, 2 * Math.PI); k.ctx.stroke(); k.ctx.restore();
      });
    }
    // the house and the listener
    k.path([[hx + 20, 290], [hx + 20, 220], [hx + 60, 190], [hx + 100, 220], [hx + 100, 290]], P.ink, 2.5, true, P.card);
    person(k, hx, 290, 0.9, null, P.accent);
    k.watch(400, 90, 34, s / 6, `${s.toFixed(1)} s`);
    const done = mode === 'outcome' && s >= 6;
    k.dim(sx, 314, hx, 314, done ? 'd ≈ 2.1 km' : 'd = ?', done ? P.ok : P.bad);
  }

  // ------------------------------------------------------------------ light on zinc
  // Photons as short wave packets; with UV each one knocks out an electron, with red light none does.
  function drawZinc(k, t, mode) {
    const P = k.P, plate = { x: 560, y: 110, w: 30, h: 170 }, uv = '#a78bfa';
    const red = mode === 'outcome' && t > 0.5;
    const col = red ? P.red : uv, lx = 120, ly = 70;
    // the lamp
    k.circle(lx, ly, 34, { fill: col });
    k.circle(lx, ly, 48, { fill: red ? 'rgba(229,72,77,0.25)' : 'rgba(167,139,250,0.25)' });
    k.text(red ? L('bright red', 'hellrot') : 'UV', lx, ly + 66, { size: 17, weight: 700, col });
    k.rect(plate.x, plate.y, plate.w, plate.h, { fill: P.muted, stroke: P.ink, lw: 2 });
    k.text(L('zinc', 'Zink'), plate.x + plate.w / 2, plate.y + plate.h + 20, { size: 16, weight: 600 });
    const n = red ? 14 : 6, rate = red ? 2.2 : 1.1;
    for (let i = 0; i < n; i++) {
      const age = ((t * rate + i / n) % 1);
      const ty = plate.y + 20 + ((i * 37) % 130);
      const x = lx + 40 + age * (plate.x - lx - 40), y = ly + (ty - ly) * age;
      const a = Math.atan2(ty - ly, plate.x - lx - 40), wl = red ? 10 : 5;
      const pts = [];
      for (let s = -18; s <= 18; s += 2) pts.push([x + Math.cos(a) * s - Math.sin(a) * 5 * Math.sin(s / wl * Math.PI), y + Math.sin(a) * s + Math.cos(a) * 5 * Math.sin(s / wl * Math.PI)]);
      k.path(pts, col, 2.5);
      if (!red) {
        // its electron, flying off to the right
        const e = ((t * rate + i / n + 0.02) % 1);
        if (e < 0.9) k.circle(plate.x + plate.w + 10 + e * 160, ty - e * 40 * ((i % 3) - 1), 6, { fill: P.cold });
      }
    }
    if (!red) k.text('e⁻', plate.x + 120, 90, { size: 18, weight: 700, col: P.cold });
    if (mode === 'setup') {
      k.rect(240, 240, 140, 70, { stroke: P.red, lw: 2, r: 8 });
      k.text(L('bright red?', 'hellrot?'), 310, 262, { size: 16, weight: 700, col: P.red });
      k.ask(310, 290, t, 26);
    } else if (red) result(k, L('no electrons', 'keine Elektronen'), 690, 190, true, { size: 20 });
  }

  // ------------------------------------------------------------------ photons from a laser pointer
  function drawLaser(k, t, mode) {
    const P = k.P, y = 160;
    k.rect(60, y - 16, 150, 32, { fill: P.muted, stroke: P.ink, lw: 2, r: 14 });
    k.rect(150, y - 22, 20, 8, { fill: P.red, r: 2 });
    k.line(210, y, 740, y, 'rgba(229,72,77,0.35)', 8);
    for (let i = 0; i < 40; i++) {
      const s = ((i / 40) + t * 0.9) % 1;
      k.circle(210 + s * 530, y + (rand(i) - 0.5) * 5, 3.5, { fill: P.red });
    }
    k.rect(740, 90, 18, 140, { fill: P.line, r: 3 });
    k.text('650 nm', 135, y + 44, { size: 17, weight: 700, col: P.red });
    k.text('1 mW', 135, y - 44, { size: 17, weight: 700 });
    k.watch(400, 270, 30, (t % 1), '1 s');
    result(k, mode === 'outcome' ? 'N ≈ 3·10¹⁵' : 'N = ?', 560, 60, mode === 'outcome');
  }

  // ------------------------------------------------------------------ electrons through a double slit
  // The hits are drawn from |ψ|² of two slits (cos² fringes under a single-slit envelope).
  const HITS = (() => {
    const out = [];
    for (let i = 0; out.length < 900 && i < 30000; i++) {
      const y = rand(i, 1) * 2 - 1, p = Math.pow(Math.cos(Math.PI * 3.2 * y), 2) * Math.exp(-3 * y * y);
      if (rand(i, 2) < p) out.push([y, rand(i, 3)]);
    }
    return out;
  })();
  function drawSlit(k, t, mode) {
    const P = k.P, gx = 80, gy = 170, bx = 380, sx = 680, sh = 130;
    k.rect(gx - 50, gy - 22, 60, 44, { fill: P.muted, stroke: P.ink, lw: 2, r: 6 });
    k.text(L('electrons', 'Elektronen'), gx - 20, gy + 42, { size: 15, col: P.muted });
    // the barrier with two slits
    [[30, 134], [158, 182], [206, 310]].forEach(([a, b]) => k.rect(bx, a, 12, b - a, { fill: P.ink }));
    k.rect(sx, gy - sh, 26, 2 * sh, { fill: P.card, stroke: P.ink, lw: 2 });
    // one electron at a time
    const per = mode === 'outcome' ? 0.5 : 0.7, i = Math.floor(t / per), u = (t % per) / per;
    const slit = i % 2 ? 146 : 194;
    const hit = HITS[i % HITS.length];
    const ex = u < 0.5 ? gx + 10 + (bx - gx - 10) * u * 2 : bx + 12 + (sx - bx - 12) * (u - 0.5) * 2;
    const ey = u < 0.5 ? gy + (slit - gy) * u * 2 : slit + (gy + hit[0] * sh - slit) * (u - 0.5) * 2;
    if (mode === 'setup' && u >= 0.5) { k.ask(sx + 13, gy, t, 34); return; }
    k.circle(ex, ey, 5, { fill: P.cold });
    if (mode === 'setup') { k.ask(sx + 13, gy, t, 34); return; }
    // the dots so far: slowly at first, then faster
    const n = Math.min(HITS.length, Math.floor(t < 2 ? t / per : 4 + Math.pow(t - 2, 2) * 90));
    for (let j = 0; j < n; j++) k.circle(sx + 4 + HITS[j][1] * 18, gy + HITS[j][0] * sh, 1.8, { fill: P.cold });
    if (n >= HITS.length) {
      const pts = [];
      for (let y = -1; y <= 1; y += 0.01) pts.push([sx + 40 + 60 * Math.pow(Math.cos(Math.PI * 3.2 * y), 2) * Math.exp(-3 * y * y), gy + y * sh]);
      k.path(pts, P.ok, 2.5);
    }
  }

  // ------------------------------------------------------------------ an old bone
  // 100 atoms of C-14, each with its own decay time, so that 50 are left after one half-life and
  // 25 after two; 1.6 s of animation per half-life.
  const ATOMS = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => rand(a, 5) - rand(b, 5))
    .map((q) => -Math.log2(1 - (q + 0.5) / 100));
  function drawDecay(k, t, mode) {
    const P = k.P, half = 1.6, cycle = 2 * half + 2.5, tt = t % cycle, h = Math.min(tt, 2 * half) / half;
    let left = 0;
    ATOMS.forEach((d, i) => {
      const x = 70 + (i % 10) * 26, y = 70 + Math.floor(i / 10) * 24, alive = d > h;
      if (alive) left++;
      k.circle(x, y, 8, { fill: alive ? P.chip : (P.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)') });
      if (!alive && d > h - 0.12) k.circle(x, y, 8 + (h - d) * 120, { stroke: P.bad, lw: 1.5 });
    });
    k.text(`¹⁴C: ${left} %`, 187, 320, { size: 20, weight: 700, col: P.chip });
    // the decay curve, drawn as time goes on
    const gx = 430, gy = 60, gw = 300, gh = 200;
    k.line(gx, gy + gh, gx + gw, gy + gh, P.ink, 2); k.line(gx, gy, gx, gy + gh, P.ink, 2);
    const pts = [];
    for (let s = 0; s <= h; s += 0.02) pts.push([gx + gw * s / 2.4, gy + gh * (1 - Math.pow(0.5, s))]);
    k.path(pts, P.chip, 3);
    [1, 2].forEach((n) => {
      const x = gx + gw * n / 2.4, y = gy + gh * (1 - Math.pow(0.5, n));
      k.line(x, gy + gh, x, y, P.line, 1.5, [4, 4]);
      k.text(`${n}·T½`, x, gy + gh + 18, { size: 14, col: P.muted });
    });
    k.text('100 %', gx - 30, gy, { size: 14, col: P.muted }); k.text('25 %', gx - 28, gy + gh * 0.75, { size: 14, col: P.muted });
    k.text('T½ = 5730 a', gx + gw / 2, 30, { size: 18, weight: 700 });
    result(k, mode === 'outcome' && h >= 2 ? 't ≈ 11 460 a' : 't = ?', gx + gw - 30, gy + 60, mode === 'outcome' && h >= 2);
  }

  // ------------------------------------------------------------------ the twins
  // 9 light years at 0.9 c: 20 years on Earth, 20 / γ ≈ 8.7 years on board.
  function drawTwins(k, t, mode) {
    const P = k.P, ex = 110, sx = 690, y = 150, trip = 4.4, tt = mode === 'setup' ? t % (trip + 1) : Math.max(0, t - 0.4);
    const u = clamp(tt / trip, 0, 1), out = u < 0.5, f = out ? u * 2 : 2 - u * 2;
    k.circle(ex, y, 40, { fill: P.dark ? '#2b6cb0' : '#3b82c4' });
    k.path([[ex - 20, y - 22], [ex + 4, y - 12], [ex + 12, y + 8], [ex - 6, y + 20]], null, 0, true, P.ok);
    k.circle(sx, y, 22, { fill: P.glow });
    for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4 + t * 0.4; k.line(sx + 28 * Math.cos(a), y + 28 * Math.sin(a), sx + 40 * Math.cos(a), y + 40 * Math.sin(a), P.glow, 3); }
    k.line(ex + 50, y, sx - 34, y, P.line, 1.5, [5, 7]);
    k.text('9 ' + L('light years', 'Lichtjahre'), (ex + sx) / 2, y + 30, { size: 15, col: P.muted });
    // the rocket
    const rx = ex + 60 + f * (sx - ex - 110), dir = out ? 1 : -1;
    k.path([[rx + 30 * dir, y - 40], [rx - 18 * dir, y - 52], [rx - 18 * dir, y - 28]], P.ink, 2, true, P.accent);
    if (u > 0 && u < 1) k.path([[rx - 18 * dir, y - 46], [rx - (34 + 8 * Math.sin(t * 30)) * dir, y - 40], [rx - 18 * dir, y - 34]], null, 0, true, P.chip);
    k.text('0.9 c', rx, y - 70, { size: 15, weight: 700, col: P.accent });
    // the two clocks: years passed
    const earth = 20 * u, ship = earth / 2.294;
    const clock = (x, label, years) => {
      k.watch(x, 270, 26, (years % 10) / 10);
      k.text(label, x + 40, 256, { size: 15, col: P.muted, align: 'left' });
      k.text(mode === 'setup' ? '? ' + L('years', 'Jahre') : `${years.toFixed(1)} ${L('years', 'Jahre')}`, x + 40, 282, { size: 18, weight: 700, align: 'left', col: mode === 'setup' ? P.bad : P.ink });
    };
    clock(250, L('on Earth', 'auf der Erde'), earth);
    clock(500, L('in the rocket', 'in der Rakete'), ship);
    if (mode === 'setup') k.ask(400, 60, t, 32);
  }

  // ------------------------------------------------------------------ the Sun gets lighter
  function drawSun(k, t, mode) {
    const P = k.P, x = 230, y = 170;
    for (let j = 0; j < 16; j++) {
      const a = j * Math.PI / 8, r0 = 95, r1 = 120 + 10 * Math.sin(t * 3 + j);
      k.line(x + r0 * Math.cos(a), y + r0 * Math.sin(a), x + r1 * Math.cos(a), y + r1 * Math.sin(a), P.glow, 4);
    }
    k.circle(x, y, 82, { fill: P.glow });
    k.circle(x, y, 82, { fill: 'rgba(255,140,0,0.35)' });
    // the light leaving, and with it mass
    for (let i = 0; i < 10; i++) {
      const s = ((t * 0.5 + i / 10) % 1), a = rand(i) * 2 * Math.PI;
      k.ctx.save(); k.ctx.globalAlpha = 1 - s;
      k.circle(x + (130 + s * 120) * Math.cos(a), y + (130 + s * 120) * Math.sin(a), 4, { fill: P.glow });
      k.ctx.restore();
    }
    k.text('P = 3.8·10²⁶ W', 580, 80, { size: 20, weight: 700 });
    k.text('E = m·c²', 580, 130, { size: 20, weight: 700, col: P.muted });
    k.watch(530, 240, 28, t % 1, '1 s');
    result(k, mode === 'outcome' ? 'Δm ≈ 4·10⁹ kg' : 'Δm = ?', 660, 240, mode === 'outcome');
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
    wires: { draw: drawWires, setup: 3, outcome: 2.5 },
    filament: { draw: drawFilament, setup: 1e9, outcome: 1e9 },
    'phone-battery': { draw: drawPhone, setup: 1e9, outcome: 4.6 },
    'rope-pulse': { draw: drawRope, setup: 3.2, outcome: 4.4 },
    'fm-radio': { draw: drawRadio, setup: 1e9, outcome: 1e9 },
    ambulance: { draw: drawSiren, setup: 3.4, outcome: 4.9 },
    guitar: { draw: drawGuitar, setup: 1e9, outcome: 1e9 },
    'shallow-water': { draw: drawBeach, setup: 1e9, outcome: 1e9 },
    thunder: { draw: drawThunder, setup: 1e9, outcome: 7 },
    'photo-effect': { draw: drawZinc, setup: 1e9, outcome: 1e9 },
    'laser-photons': { draw: drawLaser, setup: 1e9, outcome: 1e9 },
    'double-slit': { draw: drawSlit, setup: 1e9, outcome: 8 },
    'carbon-dating': { draw: drawDecay, setup: 1e9, outcome: 3.4 },
    twins: { draw: drawTwins, setup: 5.4, outcome: 5 },
    'sun-mass': { draw: drawSun, setup: 1e9, outcome: 1e9 },
  };

  // still frames, with reduced motion: the setup as it waits, the outcome at its end
  const STILL = { stairs: 4.5, chocolate: 4.6, shower: 5.2, braking: 7, kettle: 6.2, electrons: 1, 'room-air': 1, 'ice-cubes': 2,
    'phone-battery': 4.6, 'rope-pulse': 1.2, ambulance: 1.6, thunder: 4, 'carbon-dating': 3.4, twins: 1.5 };

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
