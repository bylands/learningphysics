// SVG drawings of the rope, and the animations.
//   graph(spec, o)   a snapshot y(x) or a graph y(t) (spec from generator.js): the grid of the
//                    worksheet (0.5 m or 0.5 s, 1 cm), the curves, the end (a wall for a fixed
//                    one, a dashed line with a ring for a free one), the region behind the end
//                    (mirror crests), arrows for the speed, marked places and points; spec.end0
//                    an end at the left too (a standing wave between two ends).
//                    o: { small, values (the student's heights, for drawing), xs, wrong (the
//                    grid lines marked wrong), label }
//                    o.guide: { x, dots, parts, low } a vertical guide line with a readout (low:
//                    at the bottom, clear of the label)
//   body(spec, o)    the same without the <svg> around it: the drawing under the points, which the
//                    shared sketcher (sketch.js) draws and moves
//   valueAt(spec, px, py)  the values on the axes at a point (svg coordinates)
//   Anim.mount(el, a)      an animation in el: the rope from a.t0 to a.t1 (a = { sc, t0, t1,
//                    show: ['sum'], ['parts'] and/or ['in'], mark, trace (a y(t) graph at that place
//                    growing alongside), dots, virtual (the mirror crests behind the end) }),
//                    with play/pause and a slider; it plays once when shown (not with reduced
//                    motion) and stops at a.hold (e.g. the time an exercise asks about), from where
//                    ▶ or the slider go on; a.noTime hides the time (the student moves the crests
//                    without being told when); a.split gives each crest its own slider, to move
//                    them one by one (crests without an end); a.ref: the rope at that time drawn
//                    faded, as a reference, once the crests have left it; a.explore: what to show
//                    then instead of a.show (['parts']: the crests, not their sum; ['in']: only the
//                    incoming crests), and a.exploreSolved once a.solved() (e.g. the sum as well).
//                    a.readout(x, values): the text of a guide, a vertical line at x with the
//                    values of the curves shown there, set by guide(x) (null: none).
//                    Returns { stop, redraw, guide }.
(function (root) {
  'use strict';

  const W = root.Waves || require('./generator.js');
  const L = (en, de) => (root.Lang ? root.Lang.L(en, de) : en);
  const f1 = (x) => Math.round(x * 10) / 10;
  const SIZE = { W: 560, H: 240, ML: 46, MR: 18, MT: 26, MB: 38 };
  let uid = 0;

  function scales(spec, o = {}) {
    const S = SIZE, PW = S.W - S.ML - S.MR, PH = S.H - S.MT - S.MB;
    return { ...S, PW, PH, x: (v) => S.ML + ((v - spec.lo) / (spec.hi - spec.lo)) * PW, y: (v) => S.MT + PH / 2 - (v / spec.Y) * (PH / 2) };
  }

  // spec.u (optional, for the problems): { x, y (units), dx, xl (grid steps and labels across),
  // dy, yl (up) }; by default m or s, cm, a grid of 0.5 and 1, labels every 1 and 5
  function graph(spec, o = {}) {
    const s = scales(spec), isT = spec.axis === 't';
    const cls = `wave${o.small ? ' small' : ''}${o.values ? ' drawing' : ''}`;
    return `<svg class="${cls}" viewBox="0 0 ${s.W} ${s.H}" role="img" aria-label="${o.label || (isT ? L('Displacement against time', 'Auslenkung gegen die Zeit') : L('The rope: displacement against position', 'Das Seil: Auslenkung gegen den Ort'))}">${body(spec, o)}</svg>`;
  }
  function body(spec, o = {}) {
    const s = scales(spec), id = `cl${++uid}`, isT = spec.axis === 't';
    const u = { x: isT ? 's' : 'm', y: 'cm', dx: 0.5, xl: 1, dy: 1, yl: 5, ...(spec.u || {}) };
    const on = (v, k) => Math.abs(v / k - Math.round(v / k)) < 1e-6;
    let out = '';
    // the grid: dotted every dx and dy, stronger at the labels
    for (let v = Math.ceil(spec.lo / u.dx - 1e-9) * u.dx; v <= spec.hi + 1e-9; v += u.dx) out += `<line class="grid${on(v, u.xl) ? ' major' : ''}" x1="${f1(s.x(v))}" y1="${s.MT}" x2="${f1(s.x(v))}" y2="${s.MT + s.PH}"/>`;
    for (let c = -Math.floor(spec.Y / u.dy) * u.dy; c <= spec.Y + 1e-9; c += u.dy) out += `<line class="grid${on(c, u.yl) ? ' major' : ''}" x1="${s.ML}" y1="${f1(s.y(c))}" x2="${s.ML + s.PW}" y2="${f1(s.y(c))}"/>`;
    if (spec.virtual != null) out += `<rect class="virtual" x="${f1(s.x(spec.virtual))}" y="${s.MT}" width="${f1(s.ML + s.PW - s.x(spec.virtual))}" height="${s.PH}"/>`;
    out += `<path class="ax" d="M${s.ML} ${f1(s.y(0))} H${s.ML + s.PW + 10} M${s.ML} ${s.MT + s.PH + 4} V${s.MT - 10}"/><path class="axhead" d="M${s.ML + s.PW + 12} ${f1(s.y(0))} l-8 -4 v8 z M${s.ML} ${s.MT - 12} l-4 8 h8 z"/>`;
    const lab = (v) => String(Number(v.toPrecision(6))).replace('-', '−');
    for (let v = Math.ceil(spec.lo / u.xl - 1e-9) * u.xl; v <= spec.hi + 1e-9; v += u.xl) if (Math.abs(v) > 1e-9 || isT || spec.lo !== 0) out += `<text class="tick" x="${f1(s.x(v))}" y="${f1(s.y(0) + 15)}" text-anchor="middle">${lab(v)}</text>`;
    for (let c = -Math.floor(spec.Y / u.yl) * u.yl; c <= spec.Y + 1e-9; c += u.yl) if (Math.abs(c) > 1e-9) out += `<text class="tick" x="${s.ML - 6}" y="${f1(s.y(c) + 4)}" text-anchor="end">${lab(c)}</text>`;
    out += `<text class="axl" x="${s.ML + s.PW + 14}" y="${s.MT + s.PH + 26}" text-anchor="end"><tspan class="it">${isT ? 't' : 'x'}</tspan> in ${u.x}</text>`;
    out += `<text class="axl" x="6" y="${s.MT - 10}"><tspan class="it">${u.yname || 'y'}</tspan> in ${u.y}</text>`;
    if (spec.label) out += `<text class="glabel" x="${s.ML + s.PW - (spec.end && spec.virtual == null ? 18 : 4)}" y="${s.MT + 14}" text-anchor="end">${spec.label}</text>`; // clear of an end at the right
    // the end (and spec.end0, an end at the left: its wall hatched to the left)
    for (const [e, side] of [[spec.end, 1], [spec.end0, -1]]) {
      if (!e) continue;
      const ex = s.x(e.x);
      out += e.type === 'fixed'
        ? `<path class="wall" d="M${f1(ex)} ${s.MT + 6} V${s.MT + s.PH - 6}"/>${Array.from({ length: 9 }, (z, k) => `<path class="hatch" d="M${f1(ex)} ${f1(s.MT + 10 + k * (s.PH - 20) / 9)} l${8 * side} -8"/>`).join('')}`
        : `<path class="freeend" d="M${f1(ex)} ${s.MT + 6} V${s.MT + s.PH - 6}"/><circle class="ring" cx="${f1(ex)}" cy="${f1(s.y(0))}" r="4"/>`;
    }
    // the marked places, the curves, the arrows, the points
    for (const m of spec.marks || []) out += `<path class="mark" d="M${f1(s.x(m.x))} ${s.MT} V${s.MT + s.PH}"/><text class="mlabel" x="${f1(s.x(m.x) + 4)}" y="${s.MT + s.PH - 4}">${m.label || ''}</text>`;
    let curves = '';
    // a curve is a function of x or t; where it gives null, the line breaks (e.g. a y(t) graph
    // growing during an animation)
    for (const c of spec.curves) {
      const n = o.small ? 300 : 700;
      let d = '', pen = false;
      for (let k = 0; k <= n; k++) {
        const v = spec.lo + ((spec.hi - spec.lo) * k) / n, raw = c.f(v);
        if (raw == null) { pen = false; continue; }
        const yv = Math.max(-spec.Y * 1.2, Math.min(spec.Y * 1.2, raw));
        d += `${pen ? ' L' : 'M'}${f1(s.x(v))},${f1(s.y(yv))}`;
        pen = true;
      }
      if (d) curves += `<path class="c-${c.cls}" d="${d}"/>`;
    }
    out += `<g clip-path="url(#${id})">${curves}</g>`;
    for (const a of spec.arrows || []) {
      const yy = s.y(a.up ? -spec.Y * 0.78 : spec.Y * 0.78), x0 = s.x(a.x) - a.dir * 26, x1 = s.x(a.x) + a.dir * 26;
      out += `<path class="varrow" d="M${f1(x0)} ${f1(yy)} H${f1(x1)}"/><path class="varrowhead" d="M${f1(x1 + a.dir * 6)} ${f1(yy)} l${-a.dir * 9} -4 v8 z"/><text class="vlabel" x="${f1(s.x(a.x))}" y="${f1(yy - 6)}" text-anchor="middle">${a.text || `${W.num(a.v)} m/s`}</text>`;
    }
    for (const d of spec.dots || []) out += `<circle class="dot" cx="${f1(s.x(d.x))}" cy="${f1(s.y(d.y))}" r="4.5"/><text class="dlabel" x="${f1(s.x(d.x))}" y="${f1(s.y(d.y) + (d.y >= 0 ? -10 : 20))}" text-anchor="middle">${d.label}</text>`;
    // a guide: a vertical line at o.guide.x, the values of the curves there (dots) and a readout
    // (o.guide.parts: [{ text, cls }], cls colouring a part as its curve)
    if (!o.values) out += guideSvg(spec, o.guide);
    // the student's drawing: a point at each grid line (o.xs) at the height o.values, joined (the
    // points are the sketcher's, dragged up and down or moved with the keys); the lines still wrong
    // (o.wrong) shaded
    if (o.values) {
      out += o.xs.map((x) => `<line class="col" x1="${f1(s.x(x))}" y1="${s.MT}" x2="${f1(s.x(x))}" y2="${s.MT + s.PH}"/>`).join('');
      out += (o.wrong || []).map((i) => `<rect class="wrongcol" x="${(s.x(o.xs[i]) - 5).toFixed(1)}" y="${s.MT}" width="10" height="${s.PH}"/>`).join('');
      out += guideSvg(spec, o.guide); // over the grid lines, under the drawing
      out += `<path class="c-drawn" d="M${o.xs.map((x, i) => `${f1(s.x(x))},${f1(s.y(o.values[i]))}`).join(' L')}"/>`;
    }
    return `<defs><clipPath id="${id}"><rect x="${s.ML}" y="${s.MT - 4}" width="${s.PW}" height="${s.PH + 8}"/></clipPath></defs>${out}`;
  }

  function guideSvg(spec, g) {
    if (!g || g.x == null) return '';
    const s = scales(spec), gx = s.x(g.x), left = gx > s.ML + s.PW * 0.62;
    let out = `<line class="guide" x1="${f1(gx)}" y1="${s.MT}" x2="${f1(gx)}" y2="${s.MT + s.PH}"/>`;
    for (const v of g.dots || []) out += `<circle class="gdot g-${v.cls}" cx="${f1(gx)}" cy="${f1(s.y(Math.max(-spec.Y, Math.min(spec.Y, v.y))))}" r="3.5"/>`;
    if (g.parts && g.parts.length) out += `<text class="gread" x="${f1(gx + (left ? -8 : 8))}" y="${g.low ? s.MT + s.PH - 7 : s.MT + 14}" text-anchor="${left ? 'end' : 'start'}">${g.parts.map((q) => `<tspan class="r-${q.cls || 'plain'}">${q.text}</tspan>`).join('')}</text>`;
    return out;
  }
  // svg coordinates → the value on the axes (and whether inside the plot, with a margin)
  function valueAt(spec, px, py) {
    const s = scales(spec);
    return { x: spec.lo + ((px - s.ML) / s.PW) * (spec.hi - spec.lo), y: ((s.MT + s.PH / 2 - py) / (s.PH / 2)) * spec.Y, inside: px >= s.ML - 14 && px <= s.ML + s.PW + 14 && py >= s.MT - 14 && py <= s.MT + s.PH + 14 };
  }

  // ---------------------------------------------------------------- animations
  // The rope at the time t of an animation: the sum, and the incoming and reflected parts (or each
  // crest), with the mirror crests behind the end.
  function frame(a, t) {
    const sc = a.sc, E = sc.end ? sc.end.x : null, curves = [];
    const hi = a.virtual && E != null ? Math.min(W.X + 3, 2 * E) : E != null ? E : W.X;
    if (a.show.includes('parts')) {
      if (sc.end) {
        curves.push({ f: (x) => sc.pulses.reduce((s, p) => s + W.ev(p, x, t), 0) * (a.virtual || x <= E ? 1 : 0), cls: 'part' });
        curves.push({ f: (x) => sc.pulses.reduce((s, p) => s + W.ev(W.image(p, E, sc.end.type), x, t), 0) * (a.virtual || x <= E ? 1 : 0), cls: 'part2' });
      } else sc.pulses.forEach((p, i) => curves.push({ f: (x) => W.ev(p, x, t), cls: i ? 'part2' : 'part' }));
    }
    // faded: the rope at the reference time (the state given), once the crests have moved on
    if (a.refShown) curves.unshift({ f: (x) => (E != null && x > E + 1e-9 ? null : W.y(a.refSc, x, a.ref)), cls: 'ref' });
    // only the incoming crests: behind the end too, where the axis goes on (a.virtual)
    if (a.show.includes('in')) curves.push({ f: (x) => (E == null || a.virtual || x <= E ? sc.pulses.reduce((s, p) => s + W.ev(p, x, t), 0) : null), cls: 'part' });
    const onRope = (f) => (x) => (E != null && x > E + 1e-9 ? null : f(x)); // the rope ends at the end
    if (a.show.includes('sum')) curves.push({ f: onRope((x) => W.y(sc, x, t)), cls: 'main' });
    // the speed arrows of the crests still (partly) on the rope
    const arrows = a.arrows ? sc.pulses.filter((p) => { const l = p.x0 + p.dir * p.v * t; return l + p.sh.w > 0 && l < (E != null ? E : W.X); }).map((p) => W.arrowOf(p, t, { up: p.sgn < 0 })) : [];
    const spec = { axis: 'x', lo: 0, hi, Y: a.Y || (sc.end && sc.end.type === 'free' ? 11 : 6), curves, end: sc.end, arrows, marks: [...(a.mark != null ? [{ x: a.mark, label: '' }] : []), ...(a.mark2 != null ? [{ x: a.mark2, label: '' }] : [])], dots: (a.dots || []).map((d) => ({ x: d.x, y: W.y(sc, d.x, t), label: d.label })), label: a.noTime ? '' : W.tLabel(Math.round(t * 10) / 10), virtual: a.virtual && E != null ? E : null };
    let html = graph(spec, { label: L('Animation of the rope', 'Animation des Seils'), guide: typeof a.guide === 'function' ? a.guide(spec) : a.guide });
    if (a.trace != null) {
      html += graph({ axis: 't', lo: 0, hi: Math.max(a.t1, 1), Y: spec.Y, curves: [{ f: (tt) => (tt <= t ? W.y(sc, a.trace, tt) : null), cls: 'main' }], end: null, label: `x = ${W.num(a.trace)} m` }, { label: L('y(t) at the marked place', 'y(t) am markierten Ort') });
    }
    return html;
  }
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Anim = {
    mount(el, a) {
      const span = a.t1 - a.t0, rate = Math.max(1, span / 4); // a run takes at most about 4 s
      // a.split: each crest has its own time and slider (moved one by one; ▶ moves them all)
      const n = a.split ? a.sc.pulses.length : 1, range = (i) => `<input type="range" min="0" max="1000" value="0" data-i="${i}" aria-label="${a.split ? L(`Time of crest ${i + 1}`, `Zeit von Buckel ${i + 1}`) : L('Time', 'Zeit')}">`;
      const bar = a.split
        ? `<div class="anim-bar"><button type="button" class="play" aria-label="${L('Play', 'Abspielen')}">▶</button><div class="anim-split">${a.sc.pulses.map((p, i) => `<label><span class="k-${i ? 'part2' : 'part'}">${p.dir > 0 ? '→' : '←'}</span>${range(i)}</label>`).join('')}</div></div>`
        : `<div class="anim-bar"><button type="button" class="play" aria-label="${L('Play', 'Abspielen')}">▶</button>${range(0)}</div>`;
      el.innerHTML = `<div class="anim"><div class="frames"></div>${bar}</div>`;
      const frames = el.querySelector('.frames'), btn = el.querySelector('.play'), sliders = [...el.querySelectorAll('input[type=range]')];
      const ts = Array.from({ length: n }, () => a.t0);
      let raf = 0, last = 0, playing = false, held = false;
      // moved away from the reference: the faded reference, and (a.explore) other curves, e.g. only the crests
      const withRef = () => {
        const moved = a.ref != null && ts.some((t) => Math.abs(t - a.ref) > 1e-6), solved = a.solved && a.solved() && a.exploreSolved;
        return { ...a, refSc: a.sc, refShown: moved, show: moved && a.explore ? (solved ? a.exploreSolved : a.explore) : a.show };
      };
      // a guide (a.readout given): a vertical line at gx with the values of the curves shown there
      let gx = null;
      const guideOf = (spec) => {
        if (gx == null || !a.readout) return null;
        const vals = spec.curves.filter((c) => c.cls !== 'ref').map((c) => ({ cls: c.cls, y: c.f(gx) })).filter((v) => v.y != null);
        return { x: gx, dots: vals, parts: a.readout(gx, vals) };
      };
      const render = (b, t) => frame({ ...b, guide: guideOf }, t);
      const at = () => (a.split ? render({ ...withRef(), sc: { ...a.sc, pulses: a.sc.pulses.map((p, i) => ({ ...p, x0: p.x0 + p.dir * p.v * ts[i] })) } }, 0) : render(withRef(), ts[0]));
      const show = () => { frames.innerHTML = at(); sliders.forEach((sl, i) => { sl.value = String(Math.round(((ts[i] - a.t0) / span) * 1000)); }); };
      const stop = () => { playing = false; cancelAnimationFrame(raf); btn.textContent = '▶'; btn.setAttribute('aria-label', L('Play', 'Abspielen')); };
      const step = (now) => {
        if (!playing) return;
        if (last) ts.forEach((t, i) => { ts[i] = Math.min(a.t1, t + ((now - last) / 1000) * rate); });
        last = now;
        // a stop at the time held (once per run); ▶ or the slider go on from there
        if (a.hold != null && !held && Math.min(...ts) >= a.hold) {
          held = true; ts.fill(a.hold); show(); stop();
          return;
        }
        show();
        if (Math.min(...ts) >= a.t1) { stop(); return; }
        raf = requestAnimationFrame(step);
      };
      const play = () => {
        if (Math.min(...ts) >= a.t1) { ts.fill(a.t0); held = false; }
        if (a.hold != null && Math.min(...ts) < a.hold) held = false;
        playing = true; last = 0; btn.textContent = '❚❚'; btn.setAttribute('aria-label', L('Pause', 'Pause')); raf = requestAnimationFrame(step);
      };
      btn.addEventListener('click', () => (playing ? stop() : play()));
      sliders.forEach((sl, i) => sl.addEventListener('input', () => { stop(); ts[i] = a.t0 + (Number(sl.value) / 1000) * span; show(); }));
      show();
      if (!reduced() && a.autoplay !== false) setTimeout(play, 300);
      return { stop, redraw: show, guide: (x) => { gx = x; show(); }, el };
    },
  };


  const api = { SIZE, scales, graph, body, valueAt, frame, Anim };
  root.WavePlot = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
