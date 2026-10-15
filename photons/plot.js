// The drawings of Photoelectric Effect, as SVG strings (in user units, y down; the classes are in style.css):
//   graph(o)                 axes with a grid and ticks: o = { x: [lo, hi, step], y: [lo, hi, step],
//                            xl, yl (axis labels, SVG text), w, h, minor (grid lines between ticks),
//                            read (the coordinate readout: { x: [name, unit, step], y: [...] }) };
//                            returns { X(x), Y(y), s (the SVG of the axes), svg(body, label, cls) }
//   ufGraph(o)               stopping voltage V_s (German U₀) against frequency f (10¹⁴ Hz): o = { pts: [[f, U]],
//                            line: { slope, icept } (V per 10¹⁴ Hz, V; the axes then reach down to
//                            −W/e), draw (the line drawn, extended to both axes), solve (the same,
//                            with f₀ (German f_G), −φ/e (German −W/e) and a slope triangle marked) }
//   ivGraph(curves, o)       the current of a photocell against the voltage: curves [{ U0, I, cls,
//                            dash }], I in nA; o = { Imax, label }
//   current(U, U0, I)        the model of that current (nA)
//   bar(marks)               the spectrum from 100 nm to 1000 nm, with wavelengths marked [{ nm, label }]
//                            (the labels in a row of their own under the scale, never on top of it)
//   bars(E, W)               the photon energy split into the work function and E_kin (eV)
//   cell(o)                  a photocell: light on the cathode, electrons to the anode, the voltage
//                            against them (o.counter) and the ammeter
(function (root) {
  'use strict';

  const P = root.Photon || require('./physics.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const f1 = (x) => Math.round(x * 10) / 10;
  const dec = (x) => String(Math.round(x * 1000) / 1000).replace('-', '−');
  const it = (s) => `<tspan font-style="italic">${s}</tspan>`;
  const sub = (s) => `<tspan font-size="72%" dy="4">${s}</tspan><tspan dy="-4">​</tspan>`;
  // the symbols that differ between the languages (as in exercises.js): English as in British
  // textbooks (V_s, φ, E_k, a voltage V), German as before (U₀, W, E_kin, U)
  const Us = () => L(`${it('V')}${sub('s')}`, `${it('U')}${sub('0')}`), Wf = () => it(L('φ', 'W')), Ek = () => `${it('E')}${sub(L('k', 'kin'))}`, Uv = () => it(L('V', 'U'));

  // ---------------------------------------------------------------- axes
  function graph(o) {
    const w = o.w || 340, h = o.h || 230, ml = o.ml || 44, mr = 16, mt = 22, mb = 36;
    const [x0, x1, xs] = o.x, [y0, y1, ys] = o.y;
    const X = (x) => f1(ml + ((x - x0) / (x1 - x0)) * (w - ml - mr));
    const Y = (y) => f1(mt + ((y1 - y) / (y1 - y0)) * (h - mt - mb));
    let s = '';
    const minor = o.minor || 1;
    for (let k = 0; k <= Math.round(((x1 - x0) / xs) * minor); k++) { const x = x0 + (k * xs) / minor; s += `<line class="${k % minor ? 'grid minor' : 'grid'}" x1="${X(x)}" y1="${Y(y0)}" x2="${X(x)}" y2="${Y(y1)}"/>`; }
    for (let k = 0; k <= Math.round(((y1 - y0) / ys) * minor); k++) { const y = y0 + (k * ys) / minor; s += `<line class="${k % minor ? 'grid minor' : 'grid'}" x1="${X(x0)}" y1="${Y(y)}" x2="${X(x1)}" y2="${Y(y)}"/>`; }
    const ax = Math.max(x0, Math.min(x1, 0)), ay = Math.max(y0, Math.min(y1, 0));
    s += `<line class="ax" x1="${X(x0)}" y1="${Y(ay)}" x2="${X(x1) + 8}" y2="${Y(ay)}"/><path class="axhead" d="M${X(x1) + 12} ${Y(ay)} l-7 -3.5 v7 z"/>`;
    s += `<line class="ax" x1="${X(ax)}" y1="${Y(y0)}" x2="${X(ax)}" y2="${Y(y1) - 8}"/><path class="axhead" d="M${X(ax)} ${Y(y1) - 12} l-3.5 7 h7 z"/>`;
    if (!o.noXTicks) for (let k = 0; k <= Math.round((x1 - x0) / xs); k++) { const x = x0 + k * xs; if (Math.abs(x) > 1e-9 || ay !== y0) s += `<text class="tick" x="${X(x)}" y="${Y(y0) + 16}" text-anchor="middle">${dec(x)}</text>`; }
    if (!o.noYTicks) for (let k = 0; k <= Math.round((y1 - y0) / ys); k++) { const y = y0 + k * ys; s += `<text class="tick" x="${X(x0) - 6}" y="${Y(y) + 4}" text-anchor="end">${dec(y)}</text>`; }
    s += `<text class="lbl" x="${w - 4}" y="${h - 4}" text-anchor="end">${o.xl}</text>`;
    s += `<text class="lbl" x="${X(ax) + 10}" y="14" text-anchor="start">${o.yl}</text>`;
    // o.read = { x: [name, unit, step], y: [...] }: the svg carries its axis mapping, and reader.js
    // shows the coordinates under the pointer (hover, tap and drag, arrow keys), rounded to the steps
    const rd = o.read, rdAttr = (k, [n, u, p]) => ` data-${k}n="${n}" data-${k}u="${u}" data-${k}p="${p}"`;
    const read = rd ? ` data-read="${X(x0)} ${X(x1)} ${Y(y0)} ${Y(y1)}" data-val="${x0} ${x1} ${y0} ${y1}"${rdAttr('x', rd.x)}${rdAttr('y', rd.y)}${o.small ? '' : ' tabindex="0"'}` : '';
    const svg = (body, label, cls = '') => `<svg class="ph graph ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${label}"${read}>${s}${body}</svg>`;
    return { X, Y, s, svg, w, h };
  }
  const poly = (pts, cls, extra = '') => `<polyline class="${cls}" points="${pts.map(([x, y]) => `${x},${y}`).join(' ')}"${extra}/>`;

  // ---------------------------------------------------------------- U₀ against f
  function ufGraph(o) {
    const fmax = Math.max(...o.pts.map((p) => p[0]));
    const Umax = Math.max(...o.pts.map((p) => p[1]));
    const xHi = Math.ceil(fmax + 1), yHi = Math.max(1, Math.ceil(Umax * 2 + 0.6) / 2);
    const yLo = o.line ? -Math.ceil(-o.line.icept * 2 + 0.6) / 2 : 0;
    const g = graph({ x: [0, xHi, 1], y: [yLo, yHi, 0.5], xl: `${it('f')} in 10<tspan font-size="72%" dy="-6">14</tspan><tspan dy="6"> Hz</tspan>`, yl: `${Us()} in V`, w: 360, h: o.line ? 300 : 240, minor: 2, read: { x: ['f', '· 10¹⁴ Hz', 0.01], y: [L('V_s', 'U₀'), 'V', 0.01] } });
    let body = '';
    if (o.draw || o.solve) {
      const { slope, icept } = o.line, fG = -icept / slope;
      body += `<line class="fit" x1="${g.X(fG)}" y1="${g.Y(0)}" x2="${g.X(xHi)}" y2="${g.Y(icept + slope * xHi)}"/>`;
      body += `<line class="fit ext" x1="${g.X(0)}" y1="${g.Y(icept)}" x2="${g.X(fG)}" y2="${g.Y(0)}"/>`;
    }
    if (o.solve) {
      const { slope, icept } = o.line, fG = -icept / slope;
      body += `<circle class="mark" cx="${g.X(fG)}" cy="${g.Y(0)}" r="4"/><text class="lbl small" x="${g.X(fG) + 6}" y="${g.Y(0) + 15}">${it('f')}${sub(L('0', 'G'))}</text>`;
      body += `<circle class="mark" cx="${g.X(0)}" cy="${g.Y(icept)}" r="4"/><text class="lbl small" x="${g.X(0) + 8}" y="${g.Y(icept) + 16}">−${Wf()}/${it('e')}</text>`;
      // the slope triangle between the outer points
      const [a, b] = [o.pts[0], o.pts[o.pts.length - 1]].map(([f]) => [f, icept + slope * f]);
      body += `<path class="tri" d="M${g.X(a[0])} ${g.Y(a[1])} H${g.X(b[0])} V${g.Y(b[1])}"/>`;
      body += `<text class="lbl small" x="${(g.X(a[0]) + g.X(b[0])) / 2}" y="${g.Y(a[1]) + 16}" text-anchor="middle">Δ${it('f')}</text><text class="lbl small" x="${g.X(b[0]) + 6}" y="${(g.Y(a[1]) + g.Y(b[1])) / 2 + 4}">Δ${Us()}</text>`;
    }
    body += o.pts.map(([f, U]) => `<circle class="pt" cx="${g.X(f)}" cy="${g.Y(U)}" r="3.6"/>`).join('');
    return g.svg(body, L('Measured stopping voltages against the frequency of the light', 'Gemessene Gegenspannungen gegen die Frequenz des Lichts'));
  }

  // ---------------------------------------------------------------- current of a photocell
  const current = (U, U0, I) => (U <= -U0 ? 0 : I * (1 - Math.exp(-(U + U0) / 0.35)));
  function ivGraph(curves, o = {}) {
    const Imax = o.Imax || Math.max(...curves.map((k) => k.I)) * 1.15;
    const step = Imax > 40 ? 20 : Imax > 16 ? 5 : 2;
    const g = graph({ x: [-3, 3, 1], y: [0, Math.ceil(Imax / step) * step, step], xl: `${Uv()} in V`, yl: `${it('I')} in nA`, w: o.w || 320, h: o.h || 210, noYTicks: o.noYTicks, small: o.small, read: { x: [L('V', 'U'), 'V', 0.01], y: ['I', 'nA', 0.1] } });
    const body = curves.map((k) => {
      const pts = [];
      for (let U = -3; U <= 3.0001; U += 0.05) pts.push([g.X(U), g.Y(current(U, k.U0, k.I))]);
      return poly(pts, `iv ${k.cls || ''}`, k.dash ? ' stroke-dasharray="5 4"' : '');
    }).join('');
    return g.svg(body, o.label || L('Current against voltage of a photocell', 'Strom gegen Spannung einer Fotozelle'), o.small ? 'small' : '');
  }

  // ---------------------------------------------------------------- the spectrum as a bar
  // From the top: the regions (UV, visible, infrared), the bar, the scale with its numbers, then a
  // row of its own for the marks (an arrow under the scale and its label below it, moved sideways
  // where labels would overlap, with a short line back to the arrow), and the axis captions at the
  // bottom. A mark is also drawn as a thin line across the bar.
  const textWidth = (html, px) => String(html).replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, 'x').length * px * 0.56 + 2;
  // centres for labels of the given widths, as near the wanted ones as they can be without
  // overlapping (gap between them) and within lo..hi: overlapping neighbours become one block
  // around the mean of what they want
  function spread(items, lo, hi, gap) {
    let blocks = [];
    for (const it of [...items].sort((a, b) => a.x - b.x)) {
      blocks.push({ items: [it], want: it.x, w: it.w });
      for (;;) {
        const n = blocks.length;
        if (n < 2) break;
        const a = blocks[n - 2], b = blocks[n - 1];
        const left = (blk) => Math.max(lo, Math.min(hi - blk.w, blk.want - blk.w / 2));
        if (left(a) + a.w + gap <= left(b)) break;
        const all = a.items.concat(b.items), w = all.reduce((t, x) => t + x.w, 0) + gap * (all.length - 1);
        // the block's centre: the mean of the wanted centres
        blocks.splice(n - 2, 2, { items: all, want: all.reduce((t, x) => t + x.x, 0) / all.length, w });
      }
    }
    for (const blk of blocks) {
      let x = Math.max(lo, Math.min(hi - blk.w, blk.want - blk.w / 2));
      for (const it of blk.items) { it.c = x + it.w / 2; x += it.w + gap; }
    }
    return items;
  }
  function bar(marks = []) {
    const w = 420, x0 = 20, x1 = 400, lo = 100, hi = 1000;
    const X = (nm) => f1(x0 + ((nm - lo) / (hi - lo)) * (x1 - x0));
    const shown = marks.filter((m) => m.nm >= lo && m.nm <= hi), labelled = shown.some((m) => m.label);
    // the rows: arrows from 70 to 78, their labels on 93, the captions below
    const capY = shown.length ? (labelled ? 112 : 96) : 84, h = capY + 8;
    let s = '<defs><linearGradient id="ph-vis" x1="0" x2="1">';
    for (let nm = 380; nm <= 750; nm += 10) s += `<stop offset="${((nm - 380) / 370).toFixed(3)}" stop-color="${P.rgb(nm)}"/>`;
    s += '</linearGradient></defs>';
    s += `<rect class="uv" x="${X(lo)}" y="26" width="${X(380) - X(lo)}" height="22"/><rect x="${X(380)}" y="26" width="${X(750) - X(380)}" height="22" fill="url(#ph-vis)"/><rect class="ir" x="${X(750)}" y="26" width="${X(hi) - X(750)}" height="22"/>`;
    s += `<text class="lbl small" x="${(X(lo) + X(380)) / 2}" y="20" text-anchor="middle">UV</text><text class="lbl small" x="${(X(380) + X(750)) / 2}" y="20" text-anchor="middle">${L('visible', 'sichtbar')}</text><text class="lbl small" x="${(X(750) + X(hi)) / 2}" y="20" text-anchor="middle">${L('infrared', 'Infrarot')}</text>`;
    for (const nm of [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]) s += `<line class="ax" x1="${X(nm)}" y1="48" x2="${X(nm)}" y2="53"/><text class="tick" x="${X(nm)}" y="65" text-anchor="middle">${nm}</text>`;
    s += `<text class="lbl small" x="${x1}" y="${capY}" text-anchor="end">${it('λ')} in nm</text>`;
    s += `<text class="lbl small" x="${x0}" y="${capY}">${L('higher photon energy ←', 'höhere Photonenenergie ←')}</text>`;
    const items = spread(shown.map((m) => ({ x: X(m.nm), w: m.label ? textWidth(m.label, 13) : 0, m })), 2, w - 2, 8);
    for (const { x, c, m } of items) {
      s += `<line class="mark-halo" x1="${x}" y1="24" x2="${x}" y2="50"/><line class="mark-line" x1="${x}" y1="24" x2="${x}" y2="50"/>`;
      s += `<path class="mark-arrow" d="M${x} 70 l-5 8 h10 z"/>`;
      if (!m.label) continue;
      if (Math.abs(c - x) > 2) s += `<line class="mark-lead" x1="${x}" y1="78" x2="${f1(c)}" y2="82"/>`;
      s += `<text class="lbl small strong" x="${f1(c)}" y="93" text-anchor="middle">${m.label}</text>`;
    }
    return `<svg class="ph bar" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${L('The spectrum from ultraviolet to infrared', 'Das Spektrum vom Ultraviolett bis zum Infrarot')}${shown.length ? `: ${shown.map((m) => `${Math.round(m.nm)} nm${m.label ? ` (${String(m.label).replace(/<[^>]*>/g, '')})` : ''}`).join(', ')}` : ''}">${s}</svg>`;
  }

  // ---------------------------------------------------------------- energy bars
  function bars(E, W) {
    const w = 300, h = 210, base = 186, k = 150 / Math.max(E, W, 0.5), x = 70, bw = 54;
    const y = (v) => f1(base - v * k);
    let s = `<line class="ax" x1="40" y1="${base}" x2="260" y2="${base}"/>`;
    s += `<rect class="photon" x="${x}" y="${y(E)}" width="${bw}" height="${f1(E * k)}"/><text class="lbl small" x="${x + bw / 2}" y="${y(E) - 6}" text-anchor="middle">${it('h')}·${it('f')}</text>`;
    const x2 = 170;
    s += `<rect class="work" x="${x2}" y="${y(Math.min(W, E))}" width="${bw}" height="${f1(Math.min(W, E) * k)}"/><text class="lbl small inside" x="${x2 + bw / 2}" y="${(y(Math.min(W, E)) + base) / 2 + 5}" text-anchor="middle">${Wf()}</text>`;
    if (E > W) s += `<rect class="kin" x="${x2}" y="${y(E)}" width="${bw}" height="${f1((E - W) * k)}"/><text class="lbl small" x="${x2 + bw + 6}" y="${(y(E) + y(W)) / 2 + 5}">${Ek()}</text>`;
    else s += `<rect class="missing" x="${x2}" y="${y(W)}" width="${bw}" height="${f1((W - E) * k)}"/><text class="lbl small" x="${x2 + bw + 6}" y="${(y(E) + y(W)) / 2 + 5}">${L('missing', 'fehlt')}</text>`;
    s += `<line class="guide" x1="${x + bw}" y1="${y(E)}" x2="${x2}" y2="${y(E)}"/>`;
    s += `<text class="lbl small" x="${x + bw / 2}" y="${base + 18}" text-anchor="middle">${L('photon', 'Photon')}</text><text class="lbl small" x="${x2 + bw / 2}" y="${base + 18}" text-anchor="middle">${L('electron', 'Elektron')}</text>`;
    return `<svg class="ph bars" viewBox="0 0 ${w} ${h + 6}" width="${w}" role="img" aria-label="${L('The photon energy: the work function, and the rest as kinetic energy', 'Die Photonenenergie: die Austrittsarbeit, und der Rest als kinetische Energie')}">${s}</svg>`;
  }

  // ---------------------------------------------------------------- a photocell
  function wave(x0, y0, x1, y1, n = 5, amp = 4) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.02) { const a = amp * Math.sin(t * n * 2 * Math.PI); pts.push([f1(x0 + dx * t - uy * a), f1(y0 + dy * t + ux * a)]); }
    return poly(pts, 'ray') + `<path class="rayhead" d="M${x1 + ux * 6} ${y1 + uy * 6} l${f1(-ux * 9 - uy * 4)} ${f1(-uy * 9 + ux * 4)} l${f1(uy * 8)} ${f1(-ux * 8)} z"/>`;
  }
  function cell(o = {}) {
    const col = o.nm ? P.rgb(Math.max(400, Math.min(700, o.nm))) : null;
    let s = '<rect class="glass" x="70" y="20" width="200" height="120" rx="40"/>';
    s += '<path class="cathode" d="M110 40 a60 60 0 0 0 0 80"/><line class="anode" x1="226" y1="45" x2="226" y2="115"/>';
    s += `<g style="${col ? `--ray:${col}` : ''}">${wave(20, 30, 100, 68)}${wave(20, 70, 96, 82)}</g>`;
    for (const [x, y] of [[140, 64], [170, 82], [196, 70]]) s += `<circle class="el" cx="${x}" cy="${y}" r="4"/><text class="sign" x="${x}" y="${y + 3.5}" text-anchor="middle">−</text>`;
    s += '<path class="elpath" d="M116 70 Q150 60 218 76"/>';
    s += '<path class="wire" d="M106 120 V170 H150 M190 170 H240 V115 M226 115 H240"/>';
    s += `<circle class="meter" cx="170" cy="170" r="13"/><text class="lbl small" x="170" y="175" text-anchor="middle">A</text>`;
    s += `<line class="wire" x1="150" y1="170" x2="157" y2="170"/><line class="wire" x1="183" y1="170" x2="190" y2="170"/>`;
    if (o.counter) s += '<line class="batt" x1="216" y1="160" x2="216" y2="180"/><line class="batt thick" x1="224" y1="164" x2="224" y2="176"/><rect class="gap" x="217" y="166" width="6" height="8"/>' + `<text class="lbl small" x="220" y="198" text-anchor="middle">${Uv()}</text>`;
    s += `<text class="lbl small" x="48" y="128" text-anchor="middle">${L('cathode', 'Kathode')}</text><text class="lbl small" x="226" y="38" text-anchor="middle">${L('anode', 'Anode')}</text>`;
    return `<svg class="ph cell" viewBox="0 0 300 206" width="300" role="img" aria-label="${L('A photocell: light falls on the cathode and releases electrons, which fly to the anode', 'Eine Fotozelle: Licht fällt auf die Kathode und löst Elektronen aus, die zur Anode fliegen')}">${s}</svg>`;
  }

  const api = { graph, ufGraph, ivGraph, current, bar, bars, cell };
  root.PhotonPlot = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
