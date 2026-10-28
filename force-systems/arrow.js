// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh into the apps
// whose index.html loads it: Free-Body Diagrams, Magnetic Forces, Point Charges; its look is in arrow.css). Vector arrows the
// student places on a figure (an <svg>) and turns: each starts at an anchor (a body, a charge, a
// point of a bar), its direction snapped to a set of directions, its length to steps within
// limits (or fixed); optionally out of or into the page (⊙ ⊗). Arrows come from a palette of kinds
// (forces, fields, velocities): dragged onto an anchor, or tapped and then the anchor tapped (with
// the keyboard: Enter on a kind, then on the anchor). Dragging an arrow's tip turns and stretches
// it; dragging its shaft moves it to another anchor, or off the figure to remove it. The app draws
// the figure, says where each kind of arrow starts, and judges the drawing (judge, below).
//   Arrow.create(svg, o)  the arrows in the <svg> element svg (its viewBox in user units; its
//                     content stays below them as the backdrop); svg becomes a group for screen
//                     readers, with the app's label. o:
//     kinds           [{ id, label (html, for the palette), cls (classes of the arrow, e.g. its
//                     colour), len, dirs, max (all optional: the kind's own, see below) }]
//     anchors         [{ id, label (text, for screen readers), area ([[x, y], …]: a polygon) or r
//                     (a circle around x, y; default 24), x, y (default the middle of area) }]: a
//                     press or drop within area (or 12 units of it) takes the anchor, the nearest
//                     of several
//     tail(kind, anchor, pt)  where an arrow of that kind on that anchor starts (pt: where it was
//                     dropped, null from the keyboard); default the anchor's x, y
//     dirs            the directions allowed (degrees, anticlockwise from →, y up); default
//                     Arrow.dirs(8). Arrow.dirs(16), Arrow.dirs(8, Arrow.axes(-30)) (and along and
//                     perpendicular to a slope of 30°) and the like
//     outIn           ⊙ and ⊗ follow the directions in the turn of the keys; a tap on the tail of
//                     the selected arrow sets ⊙, then ⊗, then the plane again. With a palette, two
//                     buttons "⊙ out of the page" and "⊗ into the page" (easier to find on a phone)
//                     set it for the selected arrow, or the only one (with one kind and one anchor
//                     and no arrow yet, they place one); pressed again, the arrow lies in the plane
//                     again. outInButtons: false leaves them out
//     gap             arrows in the plane start this far (svg units) from their tail, so that they
//                     clear what is drawn there (a charge, a wire seen end-on); default 0. Or
//                     gap(a): for each arrow (by its kind and anchor), e.g. 0 for a net force
//     aside           [dx, dy]: where ⊙ and ⊗ are drawn, from the tail (default [0, 0]: on it), e.g.
//                     beside a charge rather than over it
//     max             at most this many arrows of a kind on an anchor: placing one more there
//                     selects the last of them instead (e.g. 1: one direction to draw); a kind's
//                     own max comes first (e.g. one net force, but a force of each other charge)
//     len             { lo, hi, step, init } in svg units (step 0: free), or a number: fixed;
//                     default { lo: 20, hi: 100, step: 8, init: 48 }. An arrow never reaches
//                     beyond the viewBox: it is shortened to fit (below lo if need be)
//     start           the direction of a new arrow (default 45: ↗, rarely the answer, so that the
//                     student sets it)
//     state           the arrows to start from (as state() gives them)
//     palette         an element the palette goes into (again for a new drawing): the note (o.note
//                     replaces the default, which speaks of forces on a body), a button per kind
//                     and Remove; without, the app adds arrows with add()
//     label(a)        svg markup of the arrow's label (default none), placed beyond the tip or else
//                     beside it, where it covers least of the backdrop's texts and lines, the other
//                     labels and the shafts; labelCls its classes besides ar-label
//     words(d)        the name of direction d for screen readers (and of 'out' and 'in' on the
//                     buttons), or null for the default (Arrow.words: "up", "down and to the left",
//                     "at 330°")
//     describe(a)     { label, text } for screen readers (default: kind on anchor; direction and
//                     length)
//     head            the arrowhead { len, notch, barb } (default 11, 8, 4.2, as in Force Systems)
//     onEdit(ar, a)   the student changed the drawing (a: the arrow, null when removed); called
//                     before it is redrawn
//     onSelect(a)     the selected arrow changed (null: none)
//     locked          true (or a function saying so): no changes; the arrows can still be selected
//   Returns { state(), restore(s), add(kind, anchor), remove(id), select(id), arrows(), active(),
//     mark({ id: 'ok' | 'bad' }), show({ locked, hidden }), backdrop(markup), render() };
//     hidden: no arrows (e.g. with the right ones drawn by the app instead).
// An arrow is { id, kind, anchor, at: [x, y] (its tail), dir (degrees, or 'out' / 'in'), len }.
// Keys on a selected arrow (each arrow is a slider in the tab order): ← → turn it to the next
// direction anticlockwise or clockwise, ↑ ↓ lengthen or shorten it a step, Delete or Backspace
// remove it, Enter or Space (outIn) set ⊙ ⊗, Escape selects none. The pointer takes a tip within
// 22 px (12 svg units at least), a shaft within 60 % of that.
//   Arrow.judge(drawn, target, o)  compares the arrows drawn with the target set, both lists of
//                     { kind, anchor, dir, len }; a target's len (optional) is its length relative
//                     to the others of its group (target.group, default one group), compared only
//                     where the direction is right. o: { tol: degrees (default 1: the snapped
//                     direction itself), lenTol: how far a ratio drawn len / target len may stray
//                     from the median of its group (default 0.25) }. Returns { ok, results: [{
//                     target (index or null), drawn (index or null), kind, anchor, result }] }
//                     with result 'right', 'dir', 'len', 'missing' (a target with no arrow of its
//                     kind on its anchor) or 'extra' (an arrow drawn that no target takes); an
//                     arrow of the right kind on another anchor is extra there and missing here.
// Point Charges draws the forces on a charge from each of the others and their sum (kinds of
// their own max, tail() stacking forces along one line beside it, 24 directions for a sum at any
// angle, judged within 10°, its lengths ordered where clearly so). Later uses fit this frame:
// electric field (anchors: the charges), EM waves (outIn for B and the Lorentz force), Force Concepts and Interaction (the forces on several bodies, a palette per
// body), torque (an anchor per point of the bar, its area a strip, tail() snapping the drop to
// the nearest point).
//   Arrow.press(dir, keep, which, dirs)  what a button ⊙ (which 'out') or ⊗ ('in') makes of an
//                     arrow in direction dir (keep: its direction in the plane before ⊙ ⊗):
//                     { dir, keep }; Arrow.pressTarget(arrows, sel) the arrow the buttons act on
// The pure parts (directions, lengths, judge, which anchor a point takes, the palette's markup and
// what its buttons ⊙ ⊗ do) are checked in
// shared/test/check-arrow.js. The texts come in the page language (Lang.L, lang.js).
(function (root) {
  'use strict';

  const T = (en, de) => (root.Lang ? root.Lang.L(en, de) : en);
  const NS = 'http://www.w3.org/2000/svg';
  const f1 = (x) => Math.round(x * 10) / 10;
  const plain = (html) => String(html).replace(/<[^>]*>/g, '').replace(/\u200b/g, '').trim();

  // ---------------------------------------------------------------- directions
  // degrees in [0, 360); a direction is an angle or 'out' / 'in'
  const norm = (d) => (((d % 360) + 360) % 360) + 0;
  const planar = (d) => typeof d === 'number';
  // the angle between two directions (0 … 180)
  const gap = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); };
  // n directions from →, and the extra ones, sorted, without repeats (within half a degree)
  function dirs(n = 8, extra = []) {
    const out = [];
    for (const d of [...Array.from({ length: n }, (x, k) => (360 * k) / n), ...extra].map(norm)) {
      if (!out.some((e) => gap(e, d) < 0.5)) out.push(Math.round(d * 1e6) / 1e6);
    }
    return out.sort((a, b) => a - b);
  }
  // along and perpendicular to direction d, both ways (e.g. a slope)
  const axes = (d) => [0, 90, 180, 270].map((k) => norm(d + k));
  // the allowed direction nearest to d
  const nearest = (list, d) => list.reduce((best, e) => (gap(e, d) < gap(best, d) ? e : best), list[0]);
  // a vector in svg units (y down) as an angle, and back as a unit vector
  const angleOf = (dx, dy) => norm((Math.atan2(-dy, dx) * 180) / Math.PI);
  const vec = (d) => { const r = (d * Math.PI) / 180; return [Math.round(Math.cos(r) * 1e12) / 1e12 + 0, Math.round(-Math.sin(r) * 1e12) / 1e12 + 0]; };
  // steps further round the turn of the keys (positive: anticlockwise), ⊙ ⊗ after the last
  // direction with outIn
  function turn(list, d, steps, outIn) {
    const cycle = outIn ? [...list, 'out', 'in'] : list;
    const k = planar(d) ? cycle.indexOf(nearest(list, d)) : cycle.indexOf(d);
    return cycle[(((k < 0 ? 0 : k) + steps) % cycle.length + cycle.length) % cycle.length];
  }

  // ---------------------------------------------------------------- lengths
  const LEN = { lo: 20, hi: 100, step: 8, init: 48 };
  // a length snapped to the steps and kept within the limits (a number: fixed)
  function size(len, L = LEN) {
    if (typeof L === 'number') return L;
    const v = L.step ? Math.round(len / L.step) * L.step : len;
    return Math.min(L.hi, Math.max(L.lo, v));
  }
  // how far from at in direction d the box { x0, y0, x1, y1 } reaches (Infinity without a box)
  function room(at, d, box) {
    if (!box || !planar(d)) return Infinity;
    const [ux, uy] = vec(d);
    let t = Infinity;
    if (ux > 1e-9) t = Math.min(t, (box.x1 - at[0]) / ux);
    if (ux < -1e-9) t = Math.min(t, (box.x0 - at[0]) / ux);
    if (uy > 1e-9) t = Math.min(t, (box.y1 - at[1]) / uy);
    if (uy < -1e-9) t = Math.min(t, (box.y0 - at[1]) / uy);
    return Math.max(0, t);
  }
  // a length that fits: snapped and kept within the limits, then shortened to the room there
  // (by whole steps, at least 8 units)
  function fit(len, at, d, L = LEN, box = null) {
    const v = size(len, L), r = room(at, d, box) - 4;
    if (v <= r) return v;
    const step = typeof L === 'number' || !L.step ? 1 : L.step;
    return Math.max(8, Math.floor(r / step) * step);
  }

  // ---------------------------------------------------------------- words
  const WORDS = [
    [0, 'to the right', 'nach rechts'], [45, 'up and to the right', 'nach rechts oben'], [90, 'up', 'nach oben'],
    [135, 'up and to the left', 'nach links oben'], [180, 'to the left', 'nach links'], [225, 'down and to the left', 'nach links unten'],
    [270, 'down', 'nach unten'], [315, 'down and to the right', 'nach rechts unten'],
  ];
  function words(d) {
    if (d === 'out') return T('out of the page (⊙)', 'aus der Ebene heraus (⊙)');
    if (d === 'in') return T('into the page (⊗)', 'in die Ebene hinein (⊗)');
    const w = WORDS.find(([e]) => gap(e, d) < 0.5);
    return w ? T(w[1], w[2]) : T(`at ${Math.round(norm(d))}° (anticlockwise from the right)`, `unter ${Math.round(norm(d))}° (im Gegenuhrzeigersinn von rechts)`);
  }

  // ---------------------------------------------------------------- anchors
  const middle = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const centre = (an) => (an.x != null ? [an.x, an.y] : middle(an.area));
  // the distance from p to the segment a b
  function toSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function inPolygon(p, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // how far p lies outside the anchor's area (0 inside)
  function outside(p, an) {
    if (an.area) return inPolygon(p, an.area) ? 0 : Math.min(...an.area.map((q, k) => toSegment(p, q, an.area[(k + 1) % an.area.length])));
    const c = centre(an);
    return Math.max(0, Math.hypot(p[0] - c[0], p[1] - c[1]) - (an.r || 24));
  }
  // the anchor a press or drop at p takes: within pad of its area, the nearest middle if several
  function anchorAt(anchors, p, pad = 12) {
    const near = anchors.filter((an) => outside(p, an) <= pad);
    const d = (an) => { const c = centre(an); return outside(p, an) * 1000 + Math.hypot(p[0] - c[0], p[1] - c[1]); };
    return near.sort((a, b) => d(a) - d(b))[0] || null;
  }

  // ---------------------------------------------------------------- judging
  function judge(drawn, target, o = {}) {
    const tol = o.tol != null ? o.tol : 1, lenTol = o.lenTol != null ? o.lenTol : 0.25;
    const sameDir = (a, b) => (planar(a) && planar(b) ? gap(a, b) <= tol : a === b);
    const of = (t, a) => a.kind === t.kind && a.anchor === t.anchor;
    const results = target.map((t, i) => ({ target: i, drawn: null, kind: t.kind, anchor: t.anchor, result: 'missing' }));
    const used = new Set();
    // the arrows of the right kind, anchor and direction, the closest first; then those of the
    // right kind and anchor, in another direction
    const pairs = [];
    target.forEach((t, i) => drawn.forEach((a, j) => { if (of(t, a) && sameDir(a.dir, t.dir)) pairs.push([planar(a.dir) ? gap(a.dir, t.dir) : 0, i, j]); }));
    pairs.sort((x, y) => x[0] - y[0]).forEach(([, i, j]) => {
      if (results[i].drawn == null && !used.has(j)) { results[i].drawn = j; results[i].result = 'right'; used.add(j); }
    });
    target.forEach((t, i) => {
      if (results[i].drawn != null) return;
      const j = drawn.findIndex((a, k) => !used.has(k) && of(t, a));
      if (j >= 0) { used.add(j); results[i].drawn = j; results[i].result = 'dir'; }
    });
    // the lengths: each ratio drawn / target within lenTol of the median ratio of its group
    const groups = {};
    results.forEach((r) => {
      const t = target[r.target];
      if (r.result === 'right' && t.len != null && planar(t.dir)) (groups[t.group != null ? t.group : ''] = groups[t.group != null ? t.group : ''] || []).push(r);
    });
    Object.values(groups).filter((g) => g.length > 1).forEach((g) => {
      const ratio = (r) => drawn[r.drawn].len / target[r.target].len, rs = g.map(ratio).sort((a, b) => a - b), m = rs.length;
      const median = m % 2 ? rs[(m - 1) / 2] : Math.sqrt(rs[m / 2 - 1] * rs[m / 2]);
      g.forEach((r) => { if (Math.abs(Math.log(ratio(r) / median)) > Math.log(1 + lenTol) + 1e-9) r.result = 'len'; });
    });
    drawn.forEach((a, j) => { if (!used.has(j)) results.push({ target: null, drawn: j, kind: a.kind, anchor: a.anchor, result: 'extra' }); });
    return { ok: results.every((r) => r.result === 'right'), results };
  }

  // ---------------------------------------------------------------- the buttons ⊙ ⊗
  // ⊙ or ⊗ pressed: that direction (the one in the plane kept), or, pressed again, the plane again
  function press(dir, keep, which, list) {
    if (dir === which) return { dir: keep != null ? keep : list[0], keep: null };
    return { dir: which, keep: planar(dir) ? dir : keep != null ? keep : null };
  }
  // the arrow they act on: the selected one, or else the only one
  const pressTarget = (arrows, sel) => (sel && arrows.some((a) => a.id === sel) ? sel : arrows.length === 1 ? arrows[0].id : null);

  // ---------------------------------------------------------------- the widget
  const copy = (s) => JSON.parse(JSON.stringify(s));
  const NOTE = () => T('Drag a force onto the body, then drag its tip to set its direction and length; drag an arrow off the drawing to remove it. (Or tap a force, then the body. Keys on a selected arrow: ← → turn, ↑ ↓ length, Delete removes.)',
    'Ziehe eine Kraft auf den Körper und dann ihre Spitze, um Richtung und Länge einzustellen; ziehe einen Pfeil aus der Zeichnung, um ihn zu entfernen. (Oder tippe eine Kraft an und dann den Körper. Tasten bei einem gewählten Pfeil: ← → drehen, ↑ ↓ Länge, Entf entfernt.)');

  // the palette: the note, a button per kind, ⊙ ⊗ (outIn), Remove
  function paletteHtml(o) {
    const w = (d, en, de) => (o.words && o.words(d)) || T(en, de);
    const oi = o.outIn && o.outInButtons !== false
      ? [['out', '⊙', w('out', 'out of the page', 'aus der Ebene heraus')], ['in', '⊗', w('in', 'into the page', 'in die Ebene hinein')]].map(([d, sym, text]) =>
        `<button type="button" class="ar-oi" data-oi="${d}" aria-pressed="false" disabled><span class="ar-oi-sym" aria-hidden="true">${sym}</span> ${text}</button>`).join('')
      : '';
    return `<p class="note ar-note">${o.note || NOTE()}</p><div class="ar-kinds">${o.kinds.map((k) =>
      `<button type="button" class="ar-kind${k.cls ? ` ${k.cls}` : ''}" data-kind="${k.id}" aria-pressed="false"><span class="ar-swatch" aria-hidden="true">→</span> ${k.label}</button>`).join('')}` +
      `${oi}<button type="button" class="ar-remove" disabled>${T('Remove arrow', 'Pfeil entfernen')}</button></div>`;
  }

  function create(svg, o) {
    const kindOf = (id) => o.kinds.find((k) => k.id === id) || { id, label: id };
    const anchorOf = (id) => o.anchors.find((an) => String(an.id) === String(id)) || null; // (a data- attribute gives a string)
    const dirsOf = (a) => kindOf(a.kind).dirs || o.dirs || dirs(8);
    const lenOf = (a) => (kindOf(a.kind).len != null ? kindOf(a.kind).len : o.len != null ? o.len : LEN);
    const head = { len: 11, notch: 8, barb: 4.2, ...(o.head || {}) };
    const skip = (a) => (typeof o.gap === 'function' ? o.gap(a) : o.gap) || 0, aside = (a) => (typeof o.aside === 'function' ? o.aside(a) : o.aside) || [0, 0];
    // where arrow a in direction d from the tail at starts: its gap further on (⊙ ⊗: aside)
    const startAt = (at, d, a) => { if (!planar(d)) return at; const u = vec(d), g = skip(a); return [at[0] + g * u[0], at[1] + g * u[1]]; };
    const baseOf = (a) => { if (planar(a.dir)) return startAt(a.at, a.dir, a); const s = aside(a); return [a.at[0] + s[0], a.at[1] + s[1]]; };
    // with one kind and one anchor, the buttons ⊙ ⊗ place the arrow if there is none yet
    const lone = () => o.kinds.length === 1 && o.anchors.length === 1;
    const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
    const box = vb ? { x0: vb.x, y0: vb.y, x1: vb.x + vb.width, y1: vb.y + vb.height } : null;
    let seq = 0, list = [], sel = null, locked = o.locked || false, hidden = false, marks = {};
    let placing = null, drag = null, pdrag = null, over = null;
    const isLocked = () => (typeof locked === 'function' ? !!locked() : !!locked);
    const fresh = (a) => ({ id: a.id || `a${++seq}`, kind: a.kind, anchor: a.anchor, at: [...a.at], dir: a.dir, len: a.len, ...(a.keep != null ? { keep: a.keep } : {}) });
    const load = (s) => { list = (s || []).map(fresh); seq = Math.max(seq, ...list.map((a) => Number(String(a.id).slice(1)) || 0)); };

    svg.classList.add('arrows');
    svg.setAttribute('role', 'group');
    const plot = document.createElementNS(NS, 'g'), targets = document.createElementNS(NS, 'g'), layer = document.createElementNS(NS, 'g');
    plot.setAttribute('class', 'ar-plot');
    targets.setAttribute('class', 'ar-targets');
    layer.setAttribute('class', 'ar-layer');
    while (svg.firstChild) plot.appendChild(svg.firstChild);
    svg.append(plot, targets, layer);
    load(o.state);

    const byId = (id) => list.find((a) => a.id === id) || null;
    const elOf = (id) => layer.querySelector(`[data-id="${id}"]`);
    const tipOf = (a) => { const u = vec(a.dir), b = baseOf(a); return [b[0] + a.len * u[0], b[1] + a.len * u[1]]; };

    // ---------------------------------------------------------------- drawing
    function markup(a, active) {
      const [x, y] = baseOf(a), lbl = o.label ? o.label(a) : '', cls = `ar-label${o.labelCls ? ` ${o.labelCls}` : ''}`;
      if (!planar(a.dir)) {
        const r = 9, mark = a.dir === 'out' ? `<circle class="ar-fill" cx="${f1(x)}" cy="${f1(y)}" r="2.6"/>`
          : `<path class="ar-cross" d="M${f1(x - 6)} ${f1(y - 6)}L${f1(x + 6)} ${f1(y + 6)}M${f1(x - 6)} ${f1(y + 6)}L${f1(x + 6)} ${f1(y - 6)}"/>`;
        return `<circle class="ar-halo" cx="${f1(x)}" cy="${f1(y)}" r="${r + 3}"/><circle class="ar-ring" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>${mark}` +
          (lbl ? `<text class="${cls}" x="${f1(x + r + 4)}" y="${f1(y - r)}" text-anchor="start">${lbl}</text>` : '');
      }
      const [ux, uy] = vec(a.dir), tip = tipOf(a), h = Math.min(head.len, 0.6 * a.len), k = h / head.len;
      const back = [tip[0] - h * ux, tip[1] - h * uy], notch = [tip[0] - head.notch * k * ux, tip[1] - head.notch * k * uy], b = head.barb;
      const pts = [tip, [back[0] - b * uy, back[1] + b * ux], notch, [back[0] + b * uy, back[1] - b * ux]];
      const anchor = ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle';
      return `<line class="ar-halo" x1="${f1(x)}" y1="${f1(y)}" x2="${f1(tip[0])}" y2="${f1(tip[1])}"/>` +
        `<line class="ar-shaft" x1="${f1(x)}" y1="${f1(y)}" x2="${f1(notch[0])}" y2="${f1(notch[1])}"/>` +
        `<polygon class="ar-fill" points="${pts.map((p) => p.map(f1).join(',')).join(' ')}"/><circle class="ar-fill" cx="${f1(x)}" cy="${f1(y)}" r="2"/>` +
        (lbl ? `<text class="${cls}" x="${f1(tip[0] + 10 * ux)}" y="${f1(tip[1] + 10 * uy + 5 + (uy > 0.3 ? 6 : 0))}" text-anchor="${anchor}">${lbl}</text>` : '') +
        (active && !isLocked() ? `<circle class="ar-tip" cx="${f1(tip[0])}" cy="${f1(tip[1])}" r="7"/>` : '');
    }
    function describe(a) {
      if (o.describe) return o.describe(a);
      const an = anchorOf(a.anchor), w = (o.words && o.words(a.dir)) || words(a.dir);
      return { label: `${plain(kindOf(a.kind).label)} ${T('on', 'auf')} ${an ? an.label : a.anchor}`,
        text: planar(a.dir) && typeof lenOf(a) !== 'number' ? `${w}, ${T('length', 'Länge')} ${Math.round(a.len)}` : w };
    }
    function render() {
      const shown = hidden ? [] : list;
      [...layer.children].forEach((e) => { if (!shown.some((a) => a.id === e.dataset.id)) e.remove(); });
      shown.forEach((a) => {
        // the arrows stay the same elements (one of them may have the focus)
        let e = elOf(a.id);
        if (!e) {
          e = document.createElementNS(NS, 'g');
          e.dataset.id = a.id;
          e.setAttribute('tabindex', '0');
          e.setAttribute('role', 'slider');
          e.setAttribute('aria-roledescription', T('arrow', 'Pfeil'));
          e.setAttribute('aria-valuemin', '0');
          e.setAttribute('aria-valuemax', '360');
          layer.appendChild(e);
        }
        const active = a.id === sel, d = describe(a), m = marks[a.id];
        e.setAttribute('class', `ar-arrow${kindOf(a.kind).cls ? ` ${kindOf(a.kind).cls}` : ''}${active ? ' ar-active' : ''}${m ? ` ar-${m}` : ''}${drag && drag.id === a.id && drag.part === 'shaft' ? ' ar-moving' : ''}`);
        e.setAttribute('transform', drag && drag.id === a.id && drag.part === 'shaft' && drag.moved ? `translate(${f1(drag.dx)} ${f1(drag.dy)})` : '');
        e.setAttribute('aria-label', d.label);
        e.setAttribute('aria-valuenow', planar(a.dir) ? Math.round(a.dir) : 0);
        e.setAttribute('aria-valuetext', d.text);
        e.innerHTML = markup(a, active);
      });
      placeLabels(shown);
      // the anchors to drop on, while placing or dragging
      const showTargets = !hidden && !isLocked() && (placing || (pdrag && pdrag.started) || (drag && drag.part === 'shaft' && drag.moved));
      targets.innerHTML = !showTargets ? '' : o.anchors.map((an) => {
        const cls = `ar-target${over === an.id ? ' over' : ''}`, attrs = `data-anchor="${an.id}"${placing ? ` tabindex="0" role="button" aria-label="${T('Put it on', 'Setze sie auf')} ${an.label}"` : ''}`;
        if (an.area) return `<polygon class="${cls}" ${attrs} points="${an.area.map((p) => p.map(f1).join(',')).join(' ')}"/>`;
        const [x, y] = centre(an);
        return `<circle class="${cls}" ${attrs} cx="${f1(x)}" cy="${f1(y)}" r="${an.r || 24}"/>`;
      }).join('');
      if (o.palette) {
        const rm = o.palette.querySelector('.ar-remove');
        if (rm) rm.disabled = !sel || hidden || isLocked();
        const t = byId(pressTarget(list, sel));
        o.palette.querySelectorAll('.ar-oi').forEach((btn) => {
          btn.disabled = hidden || isLocked() || (!t && !lone());
          btn.setAttribute('aria-pressed', t && t.dir === btn.dataset.oi ? 'true' : 'false');
        });
        o.palette.querySelectorAll('.ar-kind').forEach((btn) => {
          btn.disabled = hidden || isLocked();
          btn.classList.toggle('selected', placing === btn.dataset.kind);
          btn.setAttribute('aria-pressed', placing === btn.dataset.kind ? 'true' : 'false');
        });
      }
    }

    // Each arrow's label beyond its tip, or else beside the tip or the shaft, where it covers least
    // of the texts of the backdrop (a mass, a given value), the labels placed before it and the
    // lines (the arrows' shafts, the backdrop's lines).
    function placeLabels(shown) {
      const rect = (e) => { try { const b = e.getBBox(); return b.width ? { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height } : null; } catch (err) { return null; } };
      const taken = [...plot.querySelectorAll('text')].map(rect).filter(Boolean);
      const lines = [...plot.querySelectorAll('line')].map((l) => ['x1', 'y1', 'x2', 'y2'].map((k) => Number(l.getAttribute(k))))
        .concat(shown.filter((a) => planar(a.dir)).map((a) => [...baseOf(a), ...tipOf(a)]));
      const overlap = (r, q) => Math.max(0, Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0)) * Math.max(0, Math.min(r.y1, q.y1) - Math.max(r.y0, q.y0));
      const crossed = (r, [x1, y1, x2, y2]) => {
        let n = 0;
        for (let k = 0; k <= 10; k++) { const x = x1 + ((x2 - x1) * k) / 10, y = y1 + ((y2 - y1) * k) / 10; if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) n++; }
        return n;
      };
      shown.forEach((a) => {
        const t = elOf(a.id) && elOf(a.id).querySelector('.ar-label'), b = t && rect(t);
        if (!b || !planar(a.dir)) return;
        const w = b.x1 - b.x0, h = b.y1 - b.y0, [ux, uy] = vec(a.dir), tip = tipOf(a), from = baseOf(a), mid = [(from[0] + tip[0]) / 2, (from[1] + tip[1]) / 2];
        const turn45 = (s) => [ux * Math.SQRT1_2 - s * uy * Math.SQRT1_2, uy * Math.SQRT1_2 + s * ux * Math.SQRT1_2];
        // [from, outwards], in the order preferred
        // [from, outwards, further], in the order preferred: near first, then a little further out
        const near = [[tip, [ux, uy]], [tip, turn45(1)], [tip, turn45(-1)], [tip, [-uy, ux]], [tip, [uy, -ux]], [mid, [-uy, ux]], [mid, [uy, -ux]]];
        const tries = [...near.map((x) => [...x, 0]), ...near.map((x) => [...x, 12])];
        let best = null;
        tries.forEach(([p, v, far], k) => {
          const d = Math.abs(v[0]) * (w / 2) + Math.abs(v[1]) * (h / 2) + 5 + far, c = [p[0] + d * v[0], p[1] + d * v[1]];
          const r = { x0: c[0] - w / 2, y0: c[1] - h / 2, x1: c[0] + w / 2, y1: c[1] + h / 2 };
          const out = box ? Math.max(0, box.x0 - r.x0) + Math.max(0, r.x1 - box.x1) + Math.max(0, box.y0 - r.y0) + Math.max(0, r.y1 - box.y1) : 0;
          const score = 4 * taken.reduce((s2, q) => s2 + overlap(r, q), 0) + 20 * lines.reduce((s2, l) => s2 + crossed(r, l), 0) + 40 * out + k;
          if (!best || score < best.score) best = { score, r, c };
        });
        // (the text's baseline lies as far below the middle of its box as before)
        t.setAttribute('x', f1(best.c[0]));
        t.setAttribute('y', f1(best.c[1] + Number(t.getAttribute('y')) - (b.y0 + b.y1) / 2));
        t.setAttribute('text-anchor', 'middle');
        taken.push(best.r);
      });
    }

    // a change by the student
    function change(a) {
      if (o.onEdit) o.onEdit(api, a);
      render();
    }
    function select(id, focus = true) {
      if (sel !== id) { sel = id; if (o.onSelect) o.onSelect(byId(id)); }
      render();
      const e = id && elOf(id);
      if (e && focus && document.activeElement !== e) e.focus({ preventScroll: true });
    }
    function add(kind, anchorId, pt = null, focus = true) {
      const an = anchorOf(anchorId);
      if (!an || isLocked()) return null;
      const max = kindOf(kind).max != null ? kindOf(kind).max : o.max;
      if (max) {
        const there = list.filter((x) => x.kind === kind && String(x.anchor) === String(an.id));
        if (there.length >= max) { const last = there[there.length - 1].id; select(last, focus); return last; }
      }
      const at = o.tail ? o.tail(kind, an, pt) : centre(an);
      const a = { id: `a${++seq}`, kind, anchor: an.id, at: [...at], dir: nearest(dirsOf({ kind }), o.start != null ? o.start : 45) };
      const L = lenOf(a);
      a.len = fit(typeof L === 'number' ? L : L.init != null ? L.init : (L.lo + L.hi) / 2, startAt(a.at, a.dir, a), a.dir, L, box);
      list.push(a);
      change(a);
      select(a.id, focus);
      return a.id;
    }
    function remove(id) {
      const k = list.findIndex((a) => a.id === id);
      if (k < 0 || isLocked()) return;
      const hadFocus = elOf(id) && elOf(id) === document.activeElement;
      list.splice(k, 1);
      delete marks[id];
      sel = null;
      if (o.onSelect) o.onSelect(null);
      change(null);
      // the focus goes on to the next arrow, or to the palette
      if (hadFocus) {
        const next = list[Math.min(k, list.length - 1)], btn = o.palette && o.palette.querySelector('.ar-kind');
        if (next) select(next.id); else if (btn) btn.focus();
      }
    }
    // the arrow set to direction d and length len (kept to the steps and the room)
    function set(a, d, len) {
      const L = lenOf(a);
      a.dir = d;
      if (planar(d)) { a.len = fit(len, startAt(a.at, d, a), d, L, box); delete a.keep; }
      change(a);
    }
    // ⊙, ⊗ and the plane again (its last direction)
    function cycleOut(a) {
      if (!o.outIn || isLocked()) return;
      if (planar(a.dir)) { a.keep = a.dir; set(a, 'out'); } else if (a.dir === 'out') set(a, 'in');
      else set(a, a.keep != null ? a.keep : dirsOf(a)[0], a.len);
    }
    // a button ⊙ or ⊗ pressed
    function pressOutIn(which) {
      if (!o.outIn || hidden || isLocked()) return;
      let a = byId(pressTarget(list, sel));
      if (!a && lone()) a = byId(add(o.kinds[0].id, o.anchors[0].id, null, false));
      if (!a) return;
      const r = press(a.dir, a.keep, which, dirsOf(a));
      if (r.keep != null) a.keep = r.keep; else delete a.keep;
      if (sel !== a.id) { sel = a.id; if (o.onSelect) o.onSelect(byId(a.id)); }
      set(a, r.dir, a.len);
    }
    function startPlacing(kind) {
      placing = placing === kind ? null : kind;
      render();
      const first = targets.querySelector('.ar-target');
      if (placing && first) first.focus({ preventScroll: true });
    }
    function stopPlacing(focusKind) {
      const kind = placing;
      placing = null;
      over = null;
      render();
      const btn = focusKind && kind && o.palette && o.palette.querySelector(`.ar-kind[data-kind="${kind}"]`);
      if (btn) btn.focus();
    }

    // ---------------------------------------------------------------- pointer
    function point(x, y) {
      const ctm = svg.getScreenCTM(), pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = y;
      const p = ctm ? pt.matrixTransform(ctm.inverse()) : pt;
      return [p.x, p.y];
    }
    const radius = () => { const ctm = svg.getScreenCTM(); return Math.max(12, 22 / ((ctm && Math.hypot(ctm.a, ctm.b)) || 1)); };
    const inFigure = (x, y) => { const r = svg.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
    // what a press at p takes: { id, part: 'tip' | 'shaft' | 'tail' }, tips first (the selected
    // arrow's before the others), or null
    function find(p) {
      if (hidden) return null;
      const r = radius(), d = (q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
      let best = null, score = Infinity;
      for (const a of list) {
        const s = d(planar(a.dir) ? tipOf(a) : baseOf(a)) - (a.id === sel ? 4 : 0);
        if (s <= r && s < score) { score = s; best = { id: a.id, part: planar(a.dir) ? 'tip' : 'tail' }; }
      }
      if (best) return best;
      for (const a of list) {
        if (o.outIn && a.id === sel && d(a.at) <= Math.max(8, skip(a))) return { id: a.id, part: 'tail' };
        if (!planar(a.dir)) continue;
        const s = toSegment(p, baseOf(a), tipOf(a)) - (a.id === sel ? 2 : 0); // where shafts cross: the selected one
        if (s <= 0.6 * r && s < score) { score = s; best = { id: a.id, part: 'shaft' }; }
      }
      return best;
    }

    svg.addEventListener('pointerdown', (evt) => {
      if (evt.button > 0) return;
      const p = point(evt.clientX, evt.clientY);
      if (placing) {
        const an = anchorAt(o.anchors, p);
        evt.preventDefault();
        const kind = placing;
        stopPlacing(false);
        if (an) add(kind, an.id, p);
        return;
      }
      const hit = find(p);
      if (!hit) { if (sel) select(null, false); return; }
      evt.preventDefault();
      const was = sel;
      select(hit.id);
      if (isLocked()) return;
      try { svg.setPointerCapture(evt.pointerId); } catch (e) { /* no capture */ }
      drag = { pointer: evt.pointerId, id: hit.id, part: hit.part, p0: p, x0: evt.clientX, y0: evt.clientY, dx: 0, dy: 0, moved: false, was };
      svg.classList.add('dragging');
    });
    svg.addEventListener('pointermove', (evt) => {
      if (!drag || evt.pointerId !== drag.pointer) return;
      const p = point(evt.clientX, evt.clientY), a = byId(drag.id);
      if (!a) return;
      if (!drag.moved && Math.hypot(evt.clientX - drag.x0, evt.clientY - drag.y0) < 5) return;
      drag.moved = true;
      if (drag.part === 'tip' || (drag.part === 'tail' && !planar(a.dir))) {
        // the tip follows the pointer: the nearest direction allowed, the length snapped
        const dx = p[0] - a.at[0], dy = p[1] - a.at[1];
        if (Math.hypot(dx, dy) < Math.max(6, skip(a) / 2)) return;
        const d = nearest(dirsOf(a), angleOf(dx, dy)), len = Math.hypot(dx, dy) - skip(a);
        if (d !== a.dir || fit(len, startAt(a.at, d, a), d, lenOf(a), box) !== a.len) set(a, d, len);
        drag.part = 'tip';
        return;
      }
      // the whole arrow moves with the pointer, to another anchor or off the figure
      drag.part = 'shaft';
      drag.dx = p[0] - drag.p0[0];
      drag.dy = p[1] - drag.p0[1];
      const an = anchorAt(o.anchors, p);
      over = an ? an.id : null;
      layer.classList.toggle('ar-off', !inFigure(evt.clientX, evt.clientY));
      render();
    });
    const end = (evt, cancel) => {
      if (!drag || evt.pointerId !== drag.pointer) return;
      const d = drag, a = byId(d.id);
      drag = null;
      over = null;
      svg.classList.remove('dragging');
      layer.classList.remove('ar-off');
      if (a && !cancel && d.moved && d.part === 'shaft') {
        const p = point(evt.clientX, evt.clientY), an = anchorAt(o.anchors, p);
        if (!inFigure(evt.clientX, evt.clientY)) { remove(a.id); return; }
        if (an && an.id !== a.anchor) {
          a.anchor = an.id;
          a.at = [...(o.tail ? o.tail(a.kind, an, p) : centre(an))];
          if (planar(a.dir)) a.len = fit(a.len, startAt(a.at, a.dir, a), a.dir, lenOf(a), box);
          change(a);
          return;
        }
      } else if (a && !cancel && !d.moved && d.part === 'tail' && d.was === a.id) cycleOut(a);
      render();
    };
    svg.addEventListener('pointerup', (evt) => end(evt, false));
    svg.addEventListener('pointercancel', (evt) => end(evt, true));

    // ---------------------------------------------------------------- keyboard
    svg.addEventListener('keydown', (evt) => {
      const t = evt.target.closest && evt.target.closest('.ar-target');
      if (t) {
        if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); const kind = placing; stopPlacing(false); add(kind, t.dataset.anchor); } else if (evt.key === 'Escape') stopPlacing(true);
        return;
      }
      const e = evt.target.closest && evt.target.closest('.ar-arrow'), a = e && byId(e.dataset.id);
      if (!a || hidden) return;
      const L = lenOf(a), step = typeof L === 'number' ? 0 : L.step || 4;
      const steps = { ArrowLeft: 1, ArrowRight: -1 }[evt.key], by = { ArrowUp: 1, ArrowDown: -1 }[evt.key];
      if (steps != null) { if (!isLocked()) set(a, turn(dirsOf(a), a.dir, steps, o.outIn), a.len); }
      else if (by != null) { if (!isLocked() && planar(a.dir) && step) set(a, a.dir, a.len + by * step); }
      else if (evt.key === 'Delete' || evt.key === 'Backspace') remove(a.id);
      else if ((evt.key === 'Enter' || evt.key === ' ') && o.outIn) cycleOut(a);
      else if (evt.key === 'Escape') select(null, false);
      else return;
      evt.preventDefault();
    });
    svg.addEventListener('focusin', (evt) => {
      const e = evt.target.closest && evt.target.closest('.ar-arrow');
      if (e && e.dataset.id !== sel) select(e.dataset.id, false);
    });

    // ---------------------------------------------------------------- the palette
    if (o.palette) {
      // the same element may hold the palette of an earlier drawing: its listeners go
      const pal = o.palette, on = { signal: (pal.arPalette = (pal.arPalette && pal.arPalette.abort(), new AbortController())).signal };
      pal.classList.add('ar-palette');
      pal.innerHTML = paletteHtml(o);
      let suppress = false;
      pal.addEventListener('pointerdown', (evt) => {
        const btn = evt.target.closest('.ar-kind');
        if (!btn || btn.disabled || evt.button > 0) return;
        pdrag = { kind: btn.dataset.kind, btn, id: evt.pointerId, x0: evt.clientX, y0: evt.clientY, started: false, ghost: null };
      }, on);
      // near the top or bottom edge of the window the page scrolls (as in dnd.js)
      const autoscroll = () => {
        if (!pdrag || !pdrag.started) return;
        const edge = 60, h = window.innerHeight, y = pdrag.y;
        const dy = y < edge ? -Math.ceil((edge - y) / 3) : y > h - edge ? Math.ceil((y - (h - edge)) / 3) : 0;
        if (dy) window.scrollBy(0, dy);
        pdrag.raf = requestAnimationFrame(autoscroll);
      };
      pal.addEventListener('pointermove', (evt) => {
        if (!pdrag || evt.pointerId !== pdrag.id) return;
        if (!pdrag.started) {
          if (Math.hypot(evt.clientX - pdrag.x0, evt.clientY - pdrag.y0) < 6) return;
          pdrag.started = true;
          placing = null;
          const r = pdrag.btn.getBoundingClientRect();
          pdrag.ghost = pdrag.btn.cloneNode(true);
          pdrag.ghost.classList.add('ar-ghost');
          pdrag.ghost.style.width = `${r.width}px`;
          pdrag.dx = evt.clientX - r.left;
          pdrag.dy = evt.clientY - r.top;
          document.body.appendChild(pdrag.ghost);
          try { pdrag.btn.setPointerCapture(evt.pointerId); } catch (e) { /* capture is optional */ }
          pdrag.raf = requestAnimationFrame(autoscroll);
        }
        evt.preventDefault();
        pdrag.y = evt.clientY;
        pdrag.ghost.style.left = `${evt.clientX - pdrag.dx}px`;
        pdrag.ghost.style.top = `${evt.clientY - pdrag.dy}px`;
        const an = inFigure(evt.clientX, evt.clientY) ? anchorAt(o.anchors, point(evt.clientX, evt.clientY)) : null;
        if ((an && an.id) !== over || !targets.children.length) { over = an ? an.id : null; render(); }
      }, on);
      const pend = (evt, drop) => {
        if (!pdrag || evt.pointerId !== pdrag.id) return;
        const d = pdrag;
        pdrag = null;
        if (!d.started) return;
        cancelAnimationFrame(d.raf);
        d.ghost.remove();
        suppress = true; // the click that follows the drag
        setTimeout(() => { suppress = false; }, 0);
        const p = point(evt.clientX, evt.clientY), an = drop && inFigure(evt.clientX, evt.clientY) ? anchorAt(o.anchors, p) : null;
        over = null;
        if (an) add(d.kind, an.id, p, false); else render();
      };
      pal.addEventListener('pointerup', (evt) => pend(evt, true), on);
      pal.addEventListener('pointercancel', (evt) => pend(evt, false), on);
      // a tap (or Enter): with one anchor the arrow is added there, else the anchors are tapped next
      pal.addEventListener('click', (evt) => {
        if (suppress) return;
        const btn = evt.target.closest('.ar-kind');
        if (btn && !btn.disabled) {
          if (o.anchors.length === 1) add(btn.dataset.kind, o.anchors[0].id);
          else startPlacing(btn.dataset.kind);
          return;
        }
        const oi = evt.target.closest('.ar-oi');
        if (oi && !oi.disabled) { pressOutIn(oi.dataset.oi); return; }
        if (evt.target.closest('.ar-remove') && sel) remove(sel);
      }, on);
      pal.addEventListener('keydown', (evt) => { if (evt.key === 'Escape' && placing) stopPlacing(true); }, on);
    }

    const api = {
      state: () => copy(list),
      restore(s) { load(s); if (!byId(sel)) sel = null; render(); },
      add: (kind, anchor) => add(kind, anchor, null, false),
      remove,
      select: (id) => select(id),
      arrows: () => copy(list),
      active: () => (sel && !hidden ? copy(byId(sel)) : null),
      mark(m) { marks = { ...(m || {}) }; render(); },
      show(opts) {
        if ('locked' in opts) locked = opts.locked;
        if ('hidden' in opts) hidden = !!opts.hidden;
        if (hidden || isLocked()) placing = null;
        if (hidden) sel = null;
        render();
      },
      backdrop(markup) { plot.innerHTML = markup; },
      render,
    };
    render();
    return api;
  }

  const api = { create, judge, dirs, axes, nearest, turn, angleOf, vec, gap, size, room, fit, words, anchorAt, press, pressTarget, paletteHtml };
  root.Arrow = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
