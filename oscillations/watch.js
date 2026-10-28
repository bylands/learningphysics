// "Predict, then watch" in Oscillations: the player of a run (oscWatch in scenarios.js). Once an
// exercise with a run is solved or its solution shown (and in the last frame of three worked
// examples), the student lets the body go (or sets the pointer turning) and watches it move
// (play.js): the scene (Figures.watchScene) beside a small graph of y (and of v and a) drawn up to
// the time of the slider, a dot on each curve and, with numbers, the values read off below it. The
// points that mean something in the exercise (turning points, the fastest moment, one period, the
// peaks P and Q: w.keys()) are rings on the curves, named below the graph, shown once the run has
// reached them; the student's answers are listed there too (✓ right, ✗ not), and a wrong graph
// chosen (or the sketch of a find-the-error exercise: w.other) is drawn dotted in the same diagram. A run
// with numbers lasts SECONDS, in slow motion or time lapse: the note under the graph says how much.
// Used by app.js and by the standalone pages turning-pointer/ and fastest-strongest/ (the runs of two worked examples).
//   OscWatch.mount(host, w, o)   the player (Play.create) of the run w in the element host
(function (root) {
  'use strict';

  const OC = root.OC;
  const SECONDS = 3, SLOW = 4;
  const fix = (x, d) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d).replace('-', '−');
  // a tidy step for about n intervals of size span
  function niceStep(span, n) {
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  // the top of an axis: the next of 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 (times a power of ten)
  function niceTop(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= x - 1e-12 * p) * p;
  }
  // the decimals a number needs (0.25: 2)
  const decimals = (s) => { let d = 0; while (d < 6 && Math.abs(s * 10 ** d - Math.round(s * 10 ** d)) > 1e-6) d++; return d; };
  // a value of the run in the unit of its graph
  const inGraph = (w, q, x) => (w.units ? OC.inUnit(x, w.units[q]) : x);
  // the path d through the points [t, v] (svg coordinates by X, Y), broken where v leaves [a, b]:
  // a curve ends at the edge of the graph and comes back in there, not along the edge
  function trace(pts, X, Y, a, b) {
    const f1 = (x) => x.toFixed(1), at = (t, v) => `${f1(X(t))} ${f1(Y(v))}`, inside = (v) => v >= a && v <= b;
    let d = '';
    pts.forEach(([t, v], i) => {
      const p = pts[i - 1];
      if (!p || !Number.isFinite(p[1]) || !Number.isFinite(v)) { if (inside(v)) d += `M${at(t, v)}`; return; }
      if (inside(p[1]) && inside(v)) { d += `L${at(t, v)}`; return; }
      // where the segment crosses the edges, in order
      const cuts = [a, b].filter((e) => (p[1] - e) * (v - e) < 0).map((e) => [p[0] + ((e - p[1]) / (v - p[1])) * (t - p[0]), e]).sort((m, n) => m[0] - n[0]);
      if (inside(p[1])) cuts.forEach((c) => { d += `L${at(...c)}`; });
      else if (inside(v)) d += `${cuts.length ? `M${at(...cuts[0])}L` : 'M'}${at(t, v)}`;
      else if (cuts.length === 2) d += `M${at(...cuts[0])}L${at(...cuts[1])}`;
    });
    return d;
  }

  // The graph at time t: y (and v and a) up to t, the line of t with a dot on each curve, and the
  // key points reached (a chain of them joined by a dashed line); o.other: a wrong graph { f },
  // drawn dotted in the panel of y up to t; o.extrema: lines where the curves have their maxima and minima; o.hoverAt: the
  // time under the cursor (a line through every panel), or null.
  const GW = 330, GML = 46, GMR = 14;
  function graph(w, t, keys, o = {}) {
    const W = GW, ml = GML, mr = GMR, t0 = -0.15 * w.t1, T1 = w.t1, n = w.panels.length, ph = n === 1 ? 150 : 62, gap = 26;
    const panels = w.panels.map((q, i) => ({ q, top: 26 + i * (ph + gap), h: ph }));
    const bottom = panels[n - 1].top + ph, H = bottom + 34;
    const X = (x) => ml + ((x - t0) / (T1 - t0)) * (W - ml - mr), f1 = (x) => x.toFixed(1);
    const ts = Array.from({ length: 241 }, (_, k) => (k * T1) / 240), until = Math.min(t, T1);
    let svg = `<svg class="osw-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${OC.L('The motion against time', 'Die Bewegung gegen die Zeit')}">`;
    // with o.extrema, a line through every panel where y, v or a is largest or smallest: every
    // quarter period, ωt − φ₀ = k·π/2 (not for a run on a track)
    if (o.extrema && w.T) {
      for (let k = Math.ceil((-2 * w.phi) / Math.PI - 1e-9); ; k++) {
        const x = (w.phi + (k * Math.PI) / 2) / w.w;
        if (x > T1 + 1e-9) break;
        svg += `<line class="ext" x1="${f1(X(x))}" x2="${f1(X(x))}" y1="${panels[0].top - 4}" y2="${bottom + 4}"/>`;
      }
    }
    panels.forEach((pn) => {
      const q = pn.q;
      // the axis: that of the exercise's graphs (a track), else symmetric around 0
      let lo, hi;
      if (w.axis) ({ lo, hi } = w.axis);
      else {
        const base = inGraph(w, q, w.amp[q]), top = base;
        hi = w.units ? niceTop(1.04 * top) : 1.3 * top;
        lo = -hi;
      }
      // the curves may go a little beyond the axis, then they break off
      const a = lo - 0.04 * (hi - lo), b = hi + 0.04 * (hi - lo);
      const Y = (y) => pn.top + ((hi - Math.max(a, Math.min(b, y))) / (hi - lo)) * pn.h;
      pn.Y = Y;
      pn.shown = (y) => y >= a && y <= b;
      // the grid, 0 and the labels: numbers, or ±A (±v̂, ±â) without
      svg += `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(hi))}" y2="${f1(Y(hi))}"/><line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(lo))}" y2="${f1(Y(lo))}"/>`;
      svg += `<line class="ax" x1="${ml}" x2="${W - mr}" y1="${f1(Y(0))}" y2="${f1(Y(0))}"/><text class="tick" x="${ml - 5}" y="${f1(Y(0) + 4)}" text-anchor="end">0</text>`;
      if (w.units) {
        for (const y of [-hi, -hi / 2, hi / 2, hi]) svg += `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(y))}" y2="${f1(Y(y))}"/>`;
        for (const y of [-hi, hi]) svg += `<text class="tick" x="${ml - 5}" y="${f1(Y(y) + 4)}" text-anchor="end">${fix(y, decimals(hi))}</text>`;
      } else if (!w.axis) {
        const base = w.amp[q], hat = q === 'y' ? '<tspan class="it">A</tspan>' : `<tspan class="it">${q}&#770;</tspan>`;
        for (const y of [-base, base]) svg += `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${f1(Y(y))}" y2="${f1(Y(y))}"/><text class="tick" x="${ml - 5}" y="${f1(Y(y) + 4)}" text-anchor="end">${y < 0 ? '−' : ''}${hat}</text>`;
      }
      svg += `<text class="qname n-${q}" x="4" y="${pn.top - 10}"><tspan class="it">${q === 'y' ? w.name || 'y' : q}</tspan>${w.units ? `<tspan> in ${OC.UNITS[w.units[q]][1]}</tspan>` : ''}</text>`;
      // the release
      svg += `<line class="release" x1="${f1(X(0))}" x2="${f1(X(0))}" y1="${pn.top - 4}" y2="${pn.top + pn.h + 4}"/>`;
      const val = (x) => inGraph(w, q, w.at(x)[q]), v0 = val(-1);
      const run = until >= 0 ? [...ts.filter((x) => x <= until), until] : [];
      const d = trace([[t0, v0], [Math.min(0, until), v0], ...run.map((x) => [x, val(x)])], X, Y, a, b);
      // a wrong graph (o.other) under the motion, from the release to t
      if (o.other && q === 'y' && until >= 0) {
        const end = o.other.f(until);
        svg += `<path class="wother" d="${trace(run.map((x) => [x, o.other.f(x)]), X, Y, a, b)}"/>`;
        if (pn.shown(end)) svg += `<circle class="odot" cx="${f1(X(until))}" cy="${f1(Y(end))}" r="3.5"/>`;
      }
      svg += `<path class="wcurve q-${q}" d="${d}"/>`;
      if (t > t0) svg += `<line class="now" x1="${f1(X(until))}" x2="${f1(X(until))}" y1="${pn.top - 4}" y2="${pn.top + pn.h + 4}"/>`;
    });
    // the time axis: in s, in periods, or no numbers
    if (w.unit === 's') {
      const tStep = niceStep(T1, 5);
      for (let k = 0; k * tStep <= T1 + 1e-9; k++) svg += `<text class="tick" x="${f1(X(k * tStep))}" y="${bottom + 15}" text-anchor="middle">${fix(k * tStep, decimals(tStep))}</text>`;
    } else if (w.unit === 'T') {
      for (let k = 0; k <= T1 + 1e-9; k++) svg += `<text class="tick" x="${f1(X(k))}" y="${bottom + 15}" text-anchor="middle">${k === 0 ? '0' : `${k === 1 ? '' : k}<tspan class="it">T</tspan>`}</text>`;
    }
    svg += `<text class="tick" x="${W - mr}" y="${bottom + 30}" text-anchor="end"><tspan class="it">t</tspan>${w.unit === 's' ? ' in s' : ''}</text>`;
    // the time under the cursor
    if (o.hoverAt != null) {
      const x = f1(X(o.hoverAt));
      svg += `<line class="hover" x1="${x}" x2="${x}" y1="${panels[0].top - 4}" y2="${bottom + 4}"/>`;
      if (w.unit === 's') svg += `<text class="tick hover-t" x="${x}" y="${panels[0].top - 8}" text-anchor="${o.hoverAt > 0.7 * T1 ? 'end' : 'start'}">t = ${fix(o.hoverAt, T1 < 2 ? 2 : 1)} s</text>`;
    }
    // the key points reached: rings with their labels (moved down where they would cover another
    // one), a chain joined by a dashed line; then a dot on each curve
    const placed = [];
    keys.forEach((k) => {
      const pts = k.pts.filter((m) => t >= 0 && t >= m.t - 1e-9 && panels.some((x) => x.q === m.q && x.shown(m.y)));
      const at = (m) => [X(m.t), panels.find((x) => x.q === m.q).Y(m.y)];
      if (k.chain && pts.length > 1) svg += `<path class="kchain" d="${pts.map((m, i) => `${i ? 'L' : 'M'}${at(m).map(f1).join(' ')}`).join('')}"/>`;
      pts.forEach((m) => {
        const [cx, cy] = at(m), right = cx < W - mr - 40;
        svg += `<circle class="kpt q-${m.q}" cx="${f1(cx)}" cy="${f1(cy)}" r="4.5"/>`;
        if (!m.label) return;
        let ly = cy - 7;
        while (placed.some((p) => Math.abs(p.x - cx) < 40 && Math.abs(p.y - ly) < 12)) ly += 12;
        placed.push({ x: cx, y: ly });
        svg += `<text class="klab n-${m.q}" x="${f1(cx + (right ? 7 : -7))}" y="${f1(ly)}" text-anchor="${right ? 'start' : 'end'}">${m.label}</text>`;
      });
    });
    panels.forEach((pn) => {
      const v = inGraph(w, pn.q, w.at(until)[pn.q]);
      if (pn.shown(v)) svg += `<circle class="dot q-${pn.q}" cx="${f1(X(until))}" cy="${f1(pn.Y(v))}" r="4"/>`;
    });
    return `${svg}</svg>`;
  }

  // The player of the run w in host. o: { locked(), check() (▶ while locked: the app checks the
  // answer, play.js), marks() → the student's answers (w.marks), other() → a wrong graph (w.other),
  // ok(mark) → whether a number answered is right (as in the feedback), after() once the scene is
  // drawn anew (e.g. to mark wide figures scrollable), slow() → true for slow motion (SLOW times
  // slower), extrema (lines through the graphs at their maxima and minima), hover (a line through
  // the graphs where the cursor is) }; all optional.
  function mountWatch(host, w, o = {}) {
    let shown = null, scene = null;
    const L = OC.L;
    // a number answered (ok null) is judged by the app
    const okOf = (m) => (m.ok != null ? m.ok : !!(o.ok && o.ok(m)));
    const body = w.kind === 'pointer' ? L('the pointer', 'den Zeiger') : L('the body', 'den Körper');
    // how long a run lasts: SECONDS, or SLOW times that while o.slow() (a page's slow motion)
    const seconds = () => SECONDS * (o.slow && o.slow() ? SLOW : 1);
    // scene time per real second: a run with numbers in slow motion or time lapse
    const scale = () => {
      const rate = w.t1 / seconds(), factor = rate < 1 ? 1 / rate : rate, fx = OC.num(OC.sig(factor, 2));
      return w.unit !== 's' ? '' : factor < 1.1 ? L('In real time.', 'In Echtzeit.') : rate < 1 ? L(`Slow motion: ${fx} times slower than in reality.`, `Zeitlupe: ${fx}-mal langsamer als in Wirklichkeit.`) : L(`Time lapse: ${fx} times faster than in reality.`, `Zeitraffer: ${fx}-mal schneller als in Wirklichkeit.`);
    };
    // with o.hover: the time under the cursor in the graph (null when it is elsewhere)
    const view = { ...o, hoverAt: null };
    // the key points (w.keys), made once in each language
    let keyLang = null, keyList = [];
    const keysNow = () => { if (keyLang !== OC.getLang()) { keyLang = OC.getLang(); keyList = w.keys ? w.keys() : []; } return keyList; };
    const player = window.Play.create(host, {
      t0: -0.15 * w.t1, t1: w.t1,
      get seconds() { return seconds(); }, // read on every frame: the speed may change while it plays
      locked: o.locked,
      check: o.check,
      render(el, s) {
        const lock = !!(o.locked && o.locked()), key = `${lock}|${OC.getLang()}`;
        if (key !== shown) {
          shown = key;
          scene = window.Figures.watchScene(w);
          el.innerHTML = `<div class="osw"><div class="osw-fig">${scene.frame}</div><div class="osw-side"></div></div>`;
          if (o.after) o.after();
        }
        el.querySelector('.osw-pose').innerHTML = scene.pose({ ...w.at(Math.min(s.t, w.t1)), held: !s.after && !w.push });
        const side = el.querySelector('.osw-side');
        if (lock) { side.innerHTML = `<p class="note osw-wait">${o.check ? L('The graph of the motion appears here once your answer is checked: ▶ checks it too.', 'Der Graph der Bewegung erscheint hier, sobald deine Antwort geprüft ist: ▶ prüft sie auch.') : L('The graph of the motion appears here once you have solved the exercise or looked at the solution.', 'Der Graph der Bewegung erscheint hier, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.')}</p>`; return; }
        const at = w.at(Math.min(s.t, w.t1));
        const marks = (o.marks ? o.marks() : []).map((m) => ({ ...m, ok: okOf(m) })).filter((m) => s.after && s.t >= m.t - 1e-9);
        const keys = keysNow().filter((k) => s.after && k.pts.some((m) => s.t >= m.t - 1e-9));
        const other = s.after && o.other ? o.other() : null;
        const rows = [];
        if (w.units) {
          w.panels.forEach((q) => {
            const x = inGraph(w, q, at[q]), big = Math.max(Math.abs(inGraph(w, q, w.amp[q])), 1e-9);
            rows.push(`<li><span class="key q-${q}" aria-hidden="true"></span><i>${q}</i> = ${fix(x, Math.max(0, 2 - Math.floor(Math.log10(big))))} ${OC.UNITS[w.units[q]][1]}</li>`);
          });
        }
        if (other) rows.push(`<li class="otherrow"><span class="kother" aria-hidden="true"></span>${OC.L('dotted', 'punktiert')}: ${other.say}</li>`);
        keys.forEach((k) => rows.push(`<li class="keyrow"><span class="${k.chain ? 'kdash' : 'kmark'}" aria-hidden="true"></span>${k.say}</li>`));
        // one line per answer (a graph: ✓ only if it lies on the motion at every time checked)
        const says = [...new Set(marks.map((m) => m.say))];
        says.forEach((say) => { const ok = marks.filter((m) => m.say === say).every((m) => m.ok); rows.push(`<li class="pred ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${say}</li>`); });
        side.innerHTML = graph(w, s.t, keys, { ...view, other }) + `<ul class="osw-read">${rows.join('')}</ul>` + (scale() ? `<p class="note osw-scale">${scale()}</p>` : '');
      },
      texts: () => ({
        switch: w.kind === 'pointer' ? L('The pointer: set it turning', 'Der Zeiger: drehen lassen') : w.push ? L('The body: push it', 'Der Körper: anstossen') : L('The body: let it go', 'Der Körper: loslassen'),
        locked: o.check ? L(`Give your answer first: ▶ or a click on ${body} checks it, and then you can watch.`, `Gib zuerst deine Antwort ein: ▶ oder ein Klick auf ${body} prüft sie, dann kannst du zuschauen.`)
          : L(`Check your answer first: you can start ${body} once you have solved the exercise or looked at the solution.`, `Prüfe zuerst deine Antwort: Du kannst ${body} starten, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.`),
        ready: w.kind === 'pointer' ? L('Click the pointer to set it turning, and watch the body follow the height of its tip.', 'Klicke auf den Zeiger, damit er sich dreht, und schau zu, wie der Körper der Höhe seiner Spitze folgt.')
          : w.push ? L('Click the body to give it a push upwards, and watch it oscillate.', 'Klicke auf den Körper, um ihn nach oben anzustossen, und schau zu, wie er schwingt.')
            : w.kind === 'track' ? L('Click the body to let it go, and watch it move as the equation says.', 'Klicke auf den Körper, um ihn loszulassen, und schau zu, wie er sich gemäss der Gleichung bewegt.')
              : L('Click the body to let it go, and watch it oscillate.', 'Klicke auf den Körper, um ihn loszulassen, und schau zu, wie er schwingt.'),
        again: (keysNow().length ? L('Rings: the points named below the graph. ', 'Ringe: die Punkte, die unter dem Graphen genannt sind. ') : '') +
          L(`Click ${body} again to go back, or ▶ to watch once more.`, `Klicke nochmals auf ${body}, um zurückzugehen, oder ▶, um nochmals zuzuschauen.`),
        time: w.unit === 's' ? (t) => `t = ${fix(t, w.t1 < 2 ? 2 : 1)} s` : w.unit === 'T' ? (t) => `t = ${fix(t, 2)} T` : null,
      }),
    });
    if (o.hover) {
      const t0 = -0.15 * w.t1;
      const move = (evt) => {
        const svg = evt.target.closest && evt.target.closest('svg.osw-plot');
        let at = null;
        if (svg && svg.getScreenCTM()) {
          const pt = svg.createSVGPoint();
          pt.x = evt.clientX; pt.y = evt.clientY;
          const x = pt.matrixTransform(svg.getScreenCTM().inverse()).x;
          if (x >= GML && x <= GW - GMR) at = t0 + ((x - GML) / (GW - GML - GMR)) * (w.t1 - t0);
        }
        if (at !== view.hoverAt) { view.hoverAt = at; player.refresh(); }
      };
      // assigned, not added: a page that mounts a new run in the same host replaces them
      host.onpointermove = move;
      host.onpointerleave = () => { if (view.hoverAt != null) { view.hoverAt = null; player.refresh(); } };
    }
    return player;
  }

  root.OscWatch = { mount: mountWatch, graph };
})(window);
