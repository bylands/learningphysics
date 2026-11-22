// Charges in Electric Fields: a standalone simulation beside Acceleration Voltage. The student picks
// a setup (a uniform field between two plates, the field around a point charge, a bent field as in
// the textbook figure, or the race of a proton, a neutron, an alpha particle and an electron), the
// particle, where it starts (drag it, or click) and its initial kinetic energy and direction, and
// plays the motion. The motion is a numerical simulation in real units (RK4, a step that keeps each
// move under 0.004 drawing units), worked out in full when the student presses play, then shown in
// slow motion so that the run lasts about four seconds (the note says how much slower than real).
// Velocity (blue) and force (red) arrows, the trace and the equipotentials can be switched on and
// off; live energy bars show E_pot = q·V, E_kin and their sum for each particle.
//   units: plates and the bent field 1 drawing unit = 1 cm, potentials in V (accel.js); the point
//   charge Q = ±79e (a gold nucleus), 1 drawing unit = 20 fm.
(function () {
  'use strict';

  const A = window.Accel, X = window.AvEx, Lang = window.Lang;
  const LR = (en, de) => Lang.L(en, de);
  const $ = (sel) => document.querySelector(sel);
  const W = 640;
  const UI = {
    en: {
      app: 'Acceleration Voltage', title: 'Charges in Electric Fields',
      intro: 'Choose a setup and a particle, drag the particle to where it starts, set its kinetic energy and direction, and press play. The motion is simulated step by step and shown in slow motion.',
      setup: 'Setup', sUniform: 'Two plates', sPoint: 'Point charge', sBent: 'Bent field', sRace: 'The race',
      particle: 'Particle', voltage: 'Voltage', polarity: 'Higher potential', left: 'left plate', right: 'right plate', source: 'Charge Q', qpos: 'positive', qneg: 'negative',
      e0: 'Kinetic energy at the start', dir: 'Direction', show: 'Show', vel: 'velocity', force: 'force', trace: 'trace', equi: 'equipotentials', speed: 'Speed', slow: 'slow', normal: 'normal', fast: 'fast',
      play: '▶ Play', pause: '❚❚ Pause', reset: '↺ Reset', again: '▶ Again',
      slowmo: (x) => `Slow motion: 1 s on the screen is ${x} of real time.`, still: 'Nothing moves: a particle at rest feels no force here, or none is charged.',
      arrows: 'Arrows: velocity blue, force red, each particle’s arrows on its own scale.',
      th: ['', 'time', 'speed', 'kinetic energy', ''], at: 'at rest',
      hit: { plate: 'reaches the plate', nucleus: 'hits the charge', out: 'leaves the field', finish: 'finish', turn: '' },
      raceNote: 'The proton, the neutron and the alpha particle start at rest on the equipotential line V_A = 800 V, the electron on V_B = 200 V. The time each needs to the other line is shown when it arrives.',
      nucleusNote: 'The point charge is a gold nucleus, Q = +79e (or −79e); the field shown is 140 fm wide.', platesNote: 'The plates are 4.8 cm apart.', bentNote: 'The field is about 6 cm wide; the potentials range from about 900 V on the left to 100 V on the right.',
      dragNote: 'Drag the particle or click in the field to choose its start; the dashed arrow shows its initial direction.',
    },
    de: {
      app: 'Beschleunigungsspannung', title: 'Ladungen in elektrischen Feldern',
      intro: 'Wähle einen Aufbau und ein Teilchen, zieh das Teilchen an seinen Startpunkt, stelle seine kinetische Energie und Richtung ein und drück Start. Die Bewegung wird Schritt für Schritt simuliert und in Zeitlupe gezeigt.',
      setup: 'Aufbau', sUniform: 'Zwei Platten', sPoint: 'Punktladung', sBent: 'Gebogenes Feld', sRace: 'Das Rennen',
      particle: 'Teilchen', voltage: 'Spannung', polarity: 'Höheres Potential', left: 'linke Platte', right: 'rechte Platte', source: 'Ladung Q', qpos: 'positiv', qneg: 'negativ',
      e0: 'Kinetische Energie beim Start', dir: 'Richtung', show: 'Anzeigen', vel: 'Geschwindigkeit', force: 'Kraft', trace: 'Spur', equi: 'Äquipotentiallinien', speed: 'Tempo', slow: 'langsam', normal: 'normal', fast: 'schnell',
      play: '▶ Start', pause: '❚❚ Pause', reset: '↺ Zurück', again: '▶ Nochmals',
      slowmo: (x) => `Zeitlupe: 1 s auf dem Bildschirm sind ${x} in Wirklichkeit.`, still: 'Nichts bewegt sich: Ein ruhendes Teilchen spürt hier keine Kraft, oder keines ist geladen.',
      arrows: 'Pfeile: Geschwindigkeit blau, Kraft rot, die Pfeile jedes Teilchens in seinem eigenen Massstab.',
      th: ['', 'Zeit', 'Geschwindigkeit', 'kinetische Energie', ''], at: 'in Ruhe',
      hit: { plate: 'erreicht die Platte', nucleus: 'trifft die Ladung', out: 'verlässt das Feld', finish: 'im Ziel', turn: '' },
      raceNote: 'Das Proton, das Neutron und das Alphateilchen starten in Ruhe auf der Äquipotentiallinie Φ_A = 800 V, das Elektron auf Φ_B = 200 V. Die Zeit, die jedes bis zur anderen Linie braucht, erscheint bei seiner Ankunft.',
      nucleusNote: 'Die Punktladung ist ein Goldkern, Q = +79e (oder −79e); das gezeigte Feld ist 140 fm breit.', platesNote: 'Die Platten sind 4.8 cm voneinander entfernt.', bentNote: 'Das Feld ist etwa 6 cm breit; die Potentiale reichen von etwa 900 V links bis 100 V rechts.',
      dragNote: 'Zieh das Teilchen oder klicke ins Feld, um seinen Start zu wählen; der gestrichelte Pfeil zeigt seine Anfangsrichtung.',
    },
  };
  const ui = () => UI[Lang.get()];
  const sub = (s) => String(s).replace(/([A-Za-zΦ])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>');

  // ---------------------------------------------------------------- setups
  const IDS = ['p', 'd', 'a', 'e', 'ep', 'n'];
  const SETUPS = {
    uniform: { box: A.BOX.plates, L: 0.01, start: [-2.25, 0], E0: 0, Emax: 5000, angle: 0, part: 'p' },
    point: { box: A.BOX.nucleus, L: 20e-15, start: [-3.2, 0.5], E0: 5e6, Emax: 20e6, angle: 0, part: 'a' },
    bent: { box: A.BOX.bent, L: 0.01, start: [-2.6, 0.2], E0: 100, Emax: 2000, angle: 0, part: 'p' },
    race: { box: A.BOX.bent, L: 0.01, race: true },
  };
  let st = { setup: 'uniform', U: 1000, hiLeft: true, Qsign: 1, vel: true, force: true, trace: true, equi: true, speed: 1, per: {} };
  const S0 = () => SETUPS[st.setup];
  const per = () => st.per[st.setup] || (st.per[st.setup] = { start: [...(S0().start || [0, 0])], E0: S0().E0 || 0, angle: S0().angle || 0, part: S0().part || 'p' });
  function cfg() {
    if (st.setup === 'uniform') return { kind: 'plates', VL: st.hiLeft ? st.U : 0, VR: st.hiLeft ? 0 : st.U };
    if (st.setup === 'point') return { kind: 'nucleus', Z: 79 * st.Qsign, scale: 20 };
    return { kind: 'bent' };
  }
  const levels = () => (st.setup === 'uniform' ? [0.2, 0.4, 0.6, 0.8].map((k) => k * st.U) : st.setup === 'point' ? [1.5e6, 2.5e6, 4e6, 8e6].map((v) => v * st.Qsign) : st.setup === 'race' ? [800, 200] : [800, 650, 500, 350, 200]);
  const box = () => S0().box, Sc = () => W / (box()[1] - box()[0]);
  const PX = (x) => (x - box()[0]) * Sc(), PY = (y) => (box()[3] - y) * Sc();
  // the particles of a run: [{ id, x, y, E0 (eV), angle (deg), target (race: the potential where it arrives) }]
  function particles() {
    if (st.setup === 'race') {
      const c = cfg(), at = (y, v) => A.onLine(c, 0, y, v);
      return [['p', at(0.95, 800), 200], ['n', at(0.1, 800), null], ['a', at(-0.75, 800), 200], ['e', at(-0.35, 200), 800]].map(([id, p, target]) => ({ id, x: p[0], y: p[1], E0: 0, angle: 0, target }));
    }
    const p = per();
    return [{ id: p.part, x: p.start[0], y: p.start[1], E0: p.E0, angle: p.angle }];
  }

  // ---------------------------------------------------------------- the simulation
  // one run: { pts: [[t, x, y, vx, vy]] (s, drawing units, units/s), end (s), why ('plate', …) }
  function simulate(pt, c) {
    const P = A.PARTS[pt.id], L = S0().L, k = (P.q * A.e) / (P.m * L * L); // a in units/s² = k · E (V per unit)
    const v0 = Math.sqrt((2 * pt.E0 * A.e) / P.m) / L, a0 = (pt.angle * Math.PI) / 180;
    let x = pt.x, y = pt.y, vx = v0 * Math.cos(a0), vy = v0 * Math.sin(a0), t = 0;
    const acc = (px, py) => { const E = A.E(c, px, py); return [k * E[0], k * E[1]]; };
    const pts = [[0, x, y, vx, vy]], [x0, x1, y0, y1] = box();
    const sgnT = pt.target != null ? Math.sign(A.V(c, x, y) - pt.target) : 0;
    let why = 'out';
    for (let i = 0; i < 40000; i++) {
      const [ax, ay] = acc(x, y), v = Math.hypot(vx, vy), a = Math.hypot(ax, ay);
      if (v < 1e-30 && a < 1e-30) { why = 'rest'; break; }
      const dt = 0.004 / (v + Math.sqrt(0.004 * a) + 1e-300);
      // RK4 on (x, y, vx, vy)
      const f = (s) => { const [aX, aY] = acc(s[0], s[1]); return [s[2], s[3], aX, aY]; };
      const s0 = [x, y, vx, vy], k1 = f(s0), s1 = s0.map((q, j) => q + (dt / 2) * k1[j]), k2 = f(s1), s2 = s0.map((q, j) => q + (dt / 2) * k2[j]), k3 = f(s2), s3 = s0.map((q, j) => q + dt * k3[j]), k4 = f(s3);
      [x, y, vx, vy] = s0.map((q, j) => q + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      t += dt;
      pts.push([t, x, y, vx, vy]);
      if (c.kind === 'plates' && Math.abs(x) >= A.PX - 0.06) { why = 'plate'; break; }
      if (c.kind === 'nucleus' && Math.hypot(x - A.NX, y) < 0.18) { why = 'nucleus'; break; }
      if (pt.target != null && Math.sign(A.V(c, x, y) - pt.target) !== sgnT) { why = 'finish'; break; }
      if (x < x0 - 0.05 || x > x1 + 0.05 || y < y0 - 0.05 || y > y1 + 0.05) { why = 'out'; break; }
    }
    return { pt, P, pts, end: t, why };
  }

  // ---------------------------------------------------------------- drawing
  let runs = null, T = 0, D = 4, t0 = null, tShown = 0, playing = false, raf = 0;
  const state = (r, t) => {
    const p = r.pts;
    if (t >= r.end) return p[p.length - 1];
    let lo = 0, hi = p.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= t) lo = m; else hi = m; }
    const a = p[lo], b = p[hi], u = (t - a[0]) / (b[0] - a[0] || 1);
    return a.map((q, j) => q + u * (b[j] - q));
  };
  const fmtT = (t) => { if (!t) return '0 s'; const u = [[1, 's'], [1e-3, 'ms'], [1e-6, 'µs'], [1e-9, 'ns'], [1e-12, 'ps'], [1e-15, 'fs'], [1e-18, 'as'], [1e-21, 'zs']].find(([k]) => t >= k * 0.999) || [1e-21, 'zs']; return `${A.nice(t / u[0])} ${u[1]}`; };
  function staticFig() {
    const c = cfg();
    let svg = A.fieldFig(c, { W, box: box(), equi: st.equi ? levels() : null, labelE: st.setup === 'point' ? null : [box()[0] + 0.45, box()[3] - 0.3], label: LR('The field and the moving particles', 'Das Feld und die bewegten Teilchen'), data: ' tabindex="0"', cls: 'sim-fig' });
    let extra = '';
    if (st.setup === 'race') for (const [v, n] of [[800, LR('V_A = 800 V', 'Φ_A = 800 V')], [200, LR('V_B = 200 V', 'Φ_B = 200 V')]]) { const p = A.onLine(c, 0, -1.25, v); extra += A.txt(PX(p[0]) + 8, PY(p[1]) + 4, n, 'lbl small v-lbl', 'start'); }
    if (st.setup === 'uniform') extra += A.txt(PX(-A.PX), 14, X.kv(c.VL), 'lbl small', 'middle') + A.txt(PX(A.PX), 14, X.kv(c.VR), 'lbl small', 'middle');
    return svg.replace('</svg>', `${extra}<g id="sim-layer"></g></svg>`);
  }
  function layer(t) {
    let s = '';
    const scaleV = (r) => r.vmax || (r.vmax = Math.max(1e-30, ...r.pts.map((p) => Math.hypot(p[3], p[4]))));
    const c = cfg();
    for (const r of runs) {
      const p = state(r, t), P = r.P, X0 = PX(p[1]), Y0 = PY(p[2]);
      if (st.trace) {
        const n = r.pts.length, step = Math.max(1, Math.floor(n / 400)), pts = [];
        for (let i = 0; i < n && r.pts[i][0] <= t; i += step) pts.push(`${PX(r.pts[i][1]).toFixed(1)},${PY(r.pts[i][2]).toFixed(1)}`);
        pts.push(`${X0.toFixed(1)},${Y0.toFixed(1)}`);
        if (pts.length > 1) s += `<polyline class="sim-trace ${P.q > 0 ? 'tp' : P.q < 0 ? 'tn' : 'tz'}" points="${pts.join(' ')}"/>`;
      }
      // the initial direction, before the start
      if (t === 0 && !st.race && r.pt.E0 > 0 && st.setup !== 'race') { const a = (r.pt.angle * Math.PI) / 180; s += `<line class="sim-dir" x1="${X0}" y1="${Y0}" x2="${X0 + 46 * Math.cos(a)}" y2="${Y0 - 46 * Math.sin(a)}"/>`; }
      const v = Math.hypot(p[3], p[4]);
      if (st.vel && v > 1e-9 * scaleV(r)) { const l = 14 + 56 * (v / scaleV(r)); s += A.arrow(X0, Y0, X0 + (l * p[3]) / v, Y0 - (l * p[4]) / v, 'v-vel', 2.4); }
      if (st.force && P.q) {
        const E = A.E(c, p[1], p[2]), F = Math.hypot(E[0], E[1]);
        r.fmax = r.fmax || Math.max(1e-30, ...r.pts.filter((q, i) => i % 20 === 0).map((q) => Math.hypot(...A.E(c, q[1], q[2]))));
        if (F > 1e-9 * r.fmax) { const l = 14 + 46 * Math.min(1, F / r.fmax), sx = Math.sign(P.q); s += A.arrow(X0, Y0, X0 + (sx * l * E[0]) / F, Y0 - (sx * l * E[1]) / F, 'v-force', 2.4); }
      }
      s += `<circle class="charge part ${P.q > 0 ? 'pos' : P.q < 0 ? 'neg' : 'neu'}" cx="${X0.toFixed(1)}" cy="${Y0.toFixed(1)}" r="${P.q === 2 ? 9 : 7}"/>` + A.txt(X0 + 11, Y0 - 9, P.sym, 'lbl small q-lbl', 'start');
    }
    return s;
  }
  function readout(t) {
    const c = cfg(), unit = st.setup === 'point' ? 1e6 : 1;
    const rows = runs.map((r) => {
      const p = state(r, t), P = r.P, L = S0().L, v = Math.hypot(p[3], p[4]) * L, Ek = 0.5 * P.m * v * v / A.e, done = t >= r.end && r.end > 0;
      return `<tr><th>${P.sym}</th><td>${fmtT(Math.min(t, r.end))}</td><td>${v ? X.speed(v) : ui().at}</td><td>${X.eV(Ek)}</td><td class="note">${done ? ui().hit[r.why] || '' : ''}</td></tr>`;
    });
    const groups = runs.map((r) => { const p = state(r, t), P = r.P, L = S0().L, v = Math.hypot(p[3], p[4]) * L; return { name: P.sym, pot: (P.q * A.V(c, p[1], p[2])) / unit, kin: (0.5 * P.m * v * v) / A.e / unit }; });
    if (!runs.bmax) runs.bmax = 1.05 * Math.max(1e-9, ...runs.flatMap((r) => r.pts.filter((q, i) => i % 10 === 0 || i === r.pts.length - 1).flatMap((q) => { const v = Math.hypot(q[3], q[4]) * S0().L, pot = (r.P.q * A.V(c, q[1], q[2])) / unit, kin = (0.5 * r.P.m * v * v) / A.e / unit; return [Math.abs(pot), kin, Math.abs(pot + kin)]; })));
    const th = ui().th;
    return `<div class="sim-out"><div class="fig" style="width:100%;max-width:${groups.length * 150 + 20}px">${A.bars(groups, { max: runs.bmax, H: 90 })}</div><table class="cmp sim-table"><thead><tr>${th.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function draw() {
    const l = $('#sim-layer');
    if (l) l.innerHTML = layer(tShown);
    $('#sim-out').innerHTML = readout(tShown);
    $('#sim-play').textContent = playing ? ui().pause : tShown >= T && T > 0 ? ui().again : ui().play;
  }
  function prepare() {
    stop();
    const c = cfg();
    runs = particles().map((p) => simulate(p, c));
    T = Math.max(0, ...runs.map((r) => r.end));
    tShown = 0;
    $('#sim-fig').innerHTML = staticFig();
    wireFig();
    D = 4 / st.speed;
    $('#sim-scale').textContent = T > 0 ? ui().slowmo(fmtT(T / D)) : ui().still;
    draw();
  }
  function frame(now) {
    if (!playing) return;
    if (t0 == null) t0 = now - (tShown / T) * D * 1000;
    tShown = Math.min(T, (((now - t0) / 1000) / D) * T);
    draw();
    if (tShown >= T) { playing = false; draw(); return; }
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (!T) return;
    if (playing) { stop(); draw(); return; }
    if (tShown >= T) tShown = 0;
    playing = true; t0 = null;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { tShown = T; playing = false; draw(); return; }
    raf = requestAnimationFrame(frame);
  }
  function stop() { playing = false; cancelAnimationFrame(raf); }

  // ---------------------------------------------------------------- controls
  const radios = (name, list, on) => `<div class="levels" role="radiogroup">${list.map(([v, label]) => `<label><input type="radio" name="${name}" value="${v}"${String(v) === String(on) ? ' checked' : ''}><span>${label}</span></label>`).join('')}</div>`;
  const row = (what, html, id) => `<div class="ex-row"${id ? ` id="${id}"` : ''}><span class="what">${what}</span>${html}</div>`;
  function render() {
    const t = ui(), p = per(), race = st.setup === 'race';
    const pname = (id) => `${A.PARTS[id].sym} <small>(${X.zq(A.PARTS[id].q).replace(/^e$/, '+e').replace(/^0e$/, '0')})</small>`;
    const eFmt = (x) => (x ? X.eV(x) : t.at);
    $('#sim').innerHTML = `<p class="note">${t.intro}</p>
      <div class="ex-controls">
        ${row(t.setup, radios('s-setup', [['uniform', t.sUniform], ['point', t.sPoint], ['bent', t.sBent], ['race', t.sRace]], st.setup))}
        ${st.setup === 'uniform' ? row(t.voltage, `<input id="s-U" type="range" min="100" max="5000" step="100" value="${st.U}"><span id="s-Uv" class="note">${X.kv(st.U)}</span>`) + row(t.polarity, radios('s-pol', [['1', t.left], ['0', t.right]], st.hiLeft ? '1' : '0')) : ''}
        ${st.setup === 'point' ? row(t.source, radios('s-Q', [['1', t.qpos], ['-1', t.qneg]], st.Qsign)) : ''}
        ${race ? '' : row(t.particle, radios('s-part', IDS.map((id) => [id, pname(id)]), p.part))}
        ${race ? '' : row(t.e0, `<input id="s-E0" type="range" min="0" max="${S0().Emax}" step="${S0().Emax / 50}" value="${p.E0}"><span id="s-E0v" class="note">${eFmt(p.E0)}</span>`)}
        ${race ? '' : row(t.dir, `<input id="s-ang" type="range" min="-180" max="180" step="5" value="${p.angle}"><span id="s-angv" class="note">${p.angle}°</span>`)}
        ${row(t.show, ['vel', 'force', 'trace', 'equi'].map((k) => `<label class="ex-check"><input type="checkbox" data-k="${k}"${st[k] ? ' checked' : ''}> ${t[k]}</label>`).join(''))}
        ${row(t.speed, radios('s-speed', [['0.5', t.slow], ['1', t.normal], ['2', t.fast]], st.speed))}
      </div>
      <div class="actions sim-actions"><button type="button" id="sim-play" class="primary">${t.play}</button><button type="button" id="sim-reset">${t.reset}</button></div>
      <div class="figs"><div class="fig" id="sim-fig"></div></div>
      <p class="note sim-note">${sub(race ? t.raceNote : st.setup === 'point' ? t.nucleusNote : st.setup === 'uniform' ? t.platesNote : t.bentNote)} ${race ? '' : t.dragNote} ${t.arrows}</p>
      <p class="note" id="sim-scale" aria-live="polite"></p>
      <div id="sim-out"></div>`;
    wire();
    prepare();
  }
  function wire() {
    const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach((x) => x.addEventListener(ev, fn));
    on('input[name="s-setup"]', 'change', (e) => { st.setup = e.target.value; render(); });
    on('input[name="s-pol"]', 'change', (e) => { st.hiLeft = e.target.value === '1'; prepare(); });
    on('input[name="s-Q"]', 'change', (e) => { st.Qsign = Number(e.target.value); prepare(); });
    on('input[name="s-part"]', 'change', (e) => { per().part = e.target.value; prepare(); });
    on('input[name="s-speed"]', 'change', (e) => { st.speed = Number(e.target.value); const was = tShown; prepare(); tShown = Math.min(was, T); draw(); });
    on('#s-U', 'input', (e) => { st.U = Number(e.target.value); $('#s-Uv').textContent = X.kv(st.U); prepare(); });
    on('#s-E0', 'input', (e) => { per().E0 = Number(e.target.value); $('#s-E0v').textContent = per().E0 ? X.eV(per().E0) : ui().at; prepare(); });
    on('#s-ang', 'input', (e) => { per().angle = Number(e.target.value); $('#s-angv').textContent = `${per().angle}°`; prepare(); });
    on('input[data-k]', 'change', (e) => { st[e.target.dataset.k] = e.target.checked; if (e.target.dataset.k === 'equi') { const was = tShown; $('#sim-fig').innerHTML = staticFig(); wireFig(); tShown = was; } draw(); });
    $('#sim-play').addEventListener('click', play);
    $('#sim-reset').addEventListener('click', () => { stop(); tShown = 0; draw(); });
  }
  // the start: dragged or clicked in the field (not in the race)
  let drag = false;
  function toModel(evt, svg) {
    const r = svg.getBoundingClientRect(), k = svg.viewBox.baseVal.width / r.width;
    return [box()[0] + ((evt.clientX - r.left) * k) / Sc(), box()[3] - ((evt.clientY - r.top) * k) / Sc()];
  }
  function clampStart(p) {
    const b = box();
    let x = Math.max(b[0] + 0.1, Math.min(b[1] - 0.1, p[0])), y = Math.max(b[2] + 0.1, Math.min(b[3] - 0.1, p[1]));
    if (st.setup === 'uniform') { x = Math.max(-A.PX + 0.1, Math.min(A.PX - 0.1, x)); y = Math.max(-1.45, Math.min(1.45, y)); }
    if (st.setup === 'point' && Math.hypot(x - A.NX, y) < 0.4) { const d = Math.hypot(x - A.NX, y) || 1e-9; x = A.NX + ((x - A.NX) * 0.4) / d; y = (y * 0.4) / d; }
    return [x, y];
  }
  function wireFig() {
    const svg = $('#sim-fig svg');
    if (!svg || st.setup === 'race') return;
    svg.addEventListener('pointerdown', (evt) => { per().start = clampStart(toModel(evt, svg)); drag = true; evt.preventDefault(); prepare(); });
    svg.addEventListener('keydown', (evt) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[evt.key];
      if (evt.key === ' ' || evt.key === 'Enter') { play(); evt.preventDefault(); return; }
      if (!d) return;
      per().start = clampStart([per().start[0] + 0.1 * d[0], per().start[1] + 0.1 * d[1]]);
      evt.preventDefault(); prepare(); $('#sim-fig svg').focus();
    });
  }
  document.addEventListener('pointermove', (evt) => { if (!drag) return; const svg = $('#sim-fig svg'); if (svg) { per().start = clampStart(toModel(evt, svg)); prepare(); } });
  document.addEventListener('pointerup', () => { drag = false; });

  function init() {
    Lang.init();
    const apply = () => { document.title = ui().title; Lang.apply(ui()); };
    apply();
    Lang.wire(() => { apply(); render(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
