// Explore mode of Acceleration Voltage: the student picks a field (two plates, a bent field, a
// nucleus) and a particle (positive, negative, neutral, charge ±e or 0), places the start A (drag it)
// with a kinetic energy there (the slider), and clicks or taps any point P of the field. For P the
// page shows the potential (a gauge with A and P marked), and the energy bars of the particle at A
// and at P: E_pot = q·V, E_kin = E_kin,A + q·(V_A − V_P), the total the same. Where E_kin would be
// negative, the particle cannot get to P. The values (in V and eV) are hidden unless asked for, so
// that the student reads the bars qualitatively: higher, lower, the same.
//   Explore.mount(el, ui)  builds the explorer in el; ui() gives the texts of the current language
//   Explore.relabel()      redraws it in the current language
// Keyboard: the figure takes the focus; the arrow keys move P, with Shift they move A.
(function (root) {
  'use strict';

  const A = root.Accel, X = root.AvEx, Lang = root.Lang;
  const L = (en, de) => X.subs(Lang.L(en, de));
  const LR = (en, de) => Lang.L(en, de);
  const W = 440;
  const FIELDS = {
    plates: { cfg: { kind: 'plates', VL: 1000, VR: 0 }, equi: [800, 600, 400, 200], A: [-2.1, 0.3], P: [1.2, -0.5], E0: 0, Emax: 1000, unit: 1, region: [-A.PX + 0.08, A.PX - 0.08, -1.45, 1.45] },
    bent: { cfg: { kind: 'bent' }, equi: [800, 650, 500, 350, 200], A: [-2.5, 0.2], P: [1.6, -0.9], E0: 100, Emax: 1000, unit: 1 },
    nucleus: { cfg: { kind: 'nucleus', Z: 79 }, equi: [3e6, 5e6, 10e6, 20e6], A: [-3, 0.15], P: [0.6, 0.1], E0: 5e6, Emax: 20e6, unit: 1e6, rmin: 0.5 },
  };
  const QS = { pos: 1, neg: -1, neu: 0 };
  let el = null, ui = null, st = { field: 'plates', q: 'pos', vals: false, pos: {} };
  const cur = () => FIELDS[st.field];
  const pts = () => st.pos[st.field] || (st.pos[st.field] = { A: [...cur().A], P: [...cur().P], E0: cur().E0 });
  const box = () => A.BOX[cur().cfg.kind];
  const S = () => W / (box()[1] - box()[0]);
  // keep a point inside the field's region (and away from the nucleus)
  function clamp(p) {
    const b = box(), r = cur().region || [b[0] + 0.1, b[1] - 0.1, b[2] + 0.1, b[3] - 0.1];
    let x = Math.max(r[0], Math.min(r[1], p[0])), y = Math.max(r[2], Math.min(r[3], p[1]));
    if (cur().rmin) { const dx = x - A.NX, d = Math.hypot(dx, y); if (d < cur().rmin) { const k = cur().rmin / (d || 1e-9); x = A.NX + (d ? dx * k : -cur().rmin); y = d ? y * k : 0; } }
    return [x, y];
  }
  const fmtV = (v) => (cur().unit === 1e6 ? `${X.kv(v)}` : `${Math.round(v)} V`).replace('-', '−');
  const fmtE = (x) => X.eV(Math.abs(x) < 1e-9 ? 0 : x);

  function figure() {
    const p = pts(), c = cur().cfg, q = QS[st.q];
    const sym = q > 0 ? '+' : q < 0 ? '−' : '0';
    return A.fieldFig(c, {
      W, equi: cur().equi, labelE: c.kind === 'nucleus' ? null : [box()[0] + 0.5, box()[3] - 0.35],
      path: [p.A, p.P],
      points: [{ x: p.P[0], y: p.P[1], name: 'P', at: 'above', nx: 12, ny: 2 }],
      parts: [{ x: p.A[0], y: p.A[1], q, sym: `A`, sx: 0, r: 9 }],
      label: LR('The field: drag the particle at A, click or tap a point P', 'Das Feld: Zieh das Teilchen bei A, klicke oder tippe auf einen Punkt P'),
      data: ' tabindex="0"', cls: 'explore-fig',
    }).replace('</svg>', `<text class="sign" x="${(p.A[0] - box()[0]) * S()}" y="${(box()[3] - p.A[1]) * S() + 4.5}" text-anchor="middle" style="fill:#fff">${sym}</text><circle class="probe" cx="${(p.P[0] - box()[0]) * S()}" cy="${(box()[3] - p.P[1]) * S()}" r="9"/></svg>`);
  }
  // the potential gauge: the range of the field's potentials, A and P marked
  function gauge(VA, VP) {
    const lv = cur().equi, lo = Math.min(0, ...lv, VA, VP), hi = Math.max(...lv, VA, VP) * 1.05, H = 200, T = 26, B = 20, x = 90;
    const Y = (v) => T + ((hi - v) / (hi - lo || 1)) * (H - T - B);
    let s = `<rect class="bg" x="0" y="0" width="180" height="${H}"/>`;
    s += `<rect class="gauge" x="${x - 7}" y="${T}" width="14" height="${H - T - B}" rx="7"/>`;
    s += A.txt(x, 16, `${LR('V', 'Φ')}`, 'lbl small v-lbl it');
    if (lo < 0) s += `<line class="axisline" x1="${x - 12}" y1="${Y(0)}" x2="${x + 12}" y2="${Y(0)}"/>` + A.txt(x - 16, Y(0) + 4, '0', 'tick', 'end');
    for (const [v, n] of [[VA, 'A'], [VP, 'P']]) {
      const y = Y(v), right = n === 'P';
      s += `<line class="gmark-${n}" x1="${x - 10}" y1="${y}" x2="${x + 10}" y2="${y}"/>` + A.txt(right ? x + 16 : x - 16, y + 4, st.vals ? `${n}: ${fmtV(v)}` : n, 'lbl small name', right ? 'start' : 'end');
    }
    return A.svg(180, H, s, LR('The potential at A and at P', 'Das Potential in A und in P'), 'gauge-fig');
  }
  function readout() {
    const p = pts(), c = cur().cfg, q = QS[st.q], VA = A.V(c, ...p.A), VP = A.V(c, ...p.P), u = cur().unit;
    const EA = p.E0, EP = EA + q * (VA - VP), reach = EP >= -1e-9 * Math.max(1, Math.abs(EA));
    const unknown = !reach;
    const groups = [{ name: 'A', pot: (q * VA) / u, kin: EA / u }, { name: 'P', pot: (q * VP) / u, kin: reach ? EP / u : 0, unknown }];
    const max = 1.1 * Math.max(...groups.flatMap((g) => [Math.abs(g.pot), Math.abs(g.kin), Math.abs(g.pot + g.kin)]), cur().Emax / u / 10);
    const bars = A.bars(groups, { max, H: 120, hl: 1 });
    const cmp = (a, b, up, down, same) => (Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b), 1) ? same : a > b ? up : down);
    const t = ui();
    const lines = [
      `<li><span class="k-v">${t.potential}</span>: ${cmp(VP, VA, t.higher, t.lower, t.same)}${st.vals ? ` (${LR('V_A', 'Φ_A').replace(/_(\w)/, '<sub>$1</sub>')} = ${fmtV(VA)}, ${LR('V_P', 'Φ_P').replace(/_(\w)/, '<sub>$1</sub>')} = ${fmtV(VP)})` : ''}.</li>`,
      `<li><span class="k-pot">${t.epot}</span>: ${q === 0 ? t.zeroPot : cmp(q * VP, q * VA, t.higher, t.lower, t.same)}${st.vals && q ? ` (${fmtE(q * VA)} → ${fmtE(q * VP)})` : ''}.</li>`,
      `<li><span class="k-kin">${t.ekin}</span>: ${!reach ? t.cannot : cmp(EP, EA, t.higherFaster, t.lowerSlower, t.sameSpeed)}${st.vals && reach ? ` (${fmtE(EA)} → ${fmtE(EP)})` : ''}.</li>`,
    ];
    return `<div class="ex-read"><div class="fig">${gauge(VA, VP)}</div><div class="fig">${bars}</div></div><ul class="ex-lines">${lines.join('')}</ul><p class="note">${q === 0 ? t.neutralNote : t.ruleNote}</p>`;
  }
  const radios = (name, list, on) => `<div class="levels small" role="radiogroup">${list.map(([v, label]) => `<label><input type="radio" name="${name}" value="${v}"${v === on ? ' checked' : ''}><span>${label}</span></label>`).join('')}</div>`;
  function render() {
    const t = ui(), p = pts(), u = cur().unit;
    el.innerHTML = `<h2>${t.exTitle}</h2><p class="note">${t.exIdea}</p>
      <div class="ex-controls">
        <div class="ex-row"><span class="what">${t.field}</span>${radios('ex-field', [['plates', t.fPlates], ['bent', t.fBent], ['nucleus', t.fNucleus]], st.field)}</div>
        <div class="ex-row"><span class="what">${t.particle}</span>${radios('ex-q', [['pos', t.qPos], ['neg', t.qNeg], ['neu', t.qNeu]], st.q)}</div>
        <div class="ex-row"><label class="what" for="ex-e0">${t.e0}</label><input id="ex-e0" type="range" min="0" max="${cur().Emax}" step="${cur().Emax / 40}" value="${p.E0}"><span id="ex-e0v" class="note">${st.vals ? fmtE(p.E0) : p.E0 === 0 ? t.atRest : ''}</span></div>
        <label class="ex-row ex-check"><input type="checkbox" id="ex-vals"${st.vals ? ' checked' : ''}> ${t.values}</label>
      </div>
      <div class="figs"><div class="fig" id="ex-fig">${figure()}</div></div>
      <p class="note ex-how">${t.exHow}</p>
      <div id="ex-read">${readout()}</div>
      <p class="sim-link"><a href="sim/">${t.simLink}</a></p>`;
    void u;
    wire();
  }
  function update() {
    $('#ex-fig').innerHTML = figure();
    $('#ex-read').innerHTML = readout();
    const p = pts(), v = $('#ex-e0v');
    if (v) v.textContent = st.vals ? fmtE(p.E0) : p.E0 === 0 ? ui().atRest : '';
    wireFig();
  }
  const $ = (sel) => el.querySelector(sel);
  function toModel(evt, svgEl) {
    const r = svgEl.getBoundingClientRect(), vb = svgEl.viewBox.baseVal, sx = vb.width / r.width;
    const px = (evt.clientX - r.left) * sx, py = (evt.clientY - r.top) * sx;
    return [box()[0] + px / S(), box()[3] - py / S()];
  }
  let drag = null;
  function wireFig() {
    const svgEl = $('#ex-fig svg');
    svgEl.addEventListener('pointerdown', (evt) => {
      const m = toModel(evt, svgEl), p = pts();
      drag = Math.hypot(m[0] - p.A[0], m[1] - p.A[1]) * S() < 18 ? 'A' : 'P';
      p[drag] = clamp(m);
      svgEl.setPointerCapture(evt.pointerId);
      evt.preventDefault();
      update();
      $('#ex-fig svg').focus({ preventScroll: true });
    });
    svgEl.addEventListener('keydown', (evt) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[evt.key];
      if (!d) return;
      const p = pts(), k = evt.shiftKey ? 'A' : 'P';
      p[k] = clamp([p[k][0] + 0.1 * d[0], p[k][1] + 0.1 * d[1]]);
      evt.preventDefault();
      update();
      $('#ex-fig svg').focus();
    });
  }
  function wire() {
    el.querySelectorAll('input[name="ex-field"]').forEach((x) => x.addEventListener('change', () => { st.field = x.value; render(); }));
    el.querySelectorAll('input[name="ex-q"]').forEach((x) => x.addEventListener('change', () => { st.q = x.value; update(); }));
    $('#ex-e0').addEventListener('input', (evt) => { pts().E0 = Number(evt.target.value); update(); });
    $('#ex-vals').addEventListener('change', (evt) => { st.vals = evt.target.checked; update(); });
    wireFig();
  }
  // dragging: the pointer moves A or P while pressed (the listeners on the document, so that a
  // fresh figure after each update keeps the drag)
  function onMove(evt) {
    if (!drag || !el) return;
    const svgEl = $('#ex-fig svg');
    if (!svgEl) return;
    pts()[drag] = clamp(toModel(evt, svgEl));
    update();
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', () => { drag = null; });
    document.addEventListener('pointercancel', () => { drag = null; });
  }
  root.Explore = {
    mount(node, texts) { el = node; ui = texts; render(); },
    relabel() { if (el) render(); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
