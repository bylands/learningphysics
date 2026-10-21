// "Predict, then watch" in Oscillations: the player of a run (oscWatch in scenarios.js). Once an
// exercise with a run is solved or its solution shown (and in the last frame of three worked
// examples), the student lets the body go (or sets the pointer turning) and watches it move
// (play.js): the scene (Figures.watchScene) beside a small graph of y (and of v and a) drawn up to
// the time of the slider, a dot on each curve and, with numbers, the values read off below it; the
// student's answers are rings (✓ right, ✗ not), shown once the run has reached their time. A run
// with numbers lasts SECONDS, in slow motion or time lapse: the note under the graph says how much.
// Used by app.js and by the standalone pages turning-pointer/ and fastest-strongest/ (the runs of two worked examples).
//   OscWatch.mount(host, w, o)   the player (Play.create) of the run w in the element host
(function (root) {
  'use strict';

  const OC = root.OC;
  const SECONDS = 3;
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

  // The graph at time t: y (and v and a) up to t, the line of t with a dot on each curve, and the
  // marks reached.
  function graph(w, t, marks) {
    const W = 330, ml = 46, mr = 14, t0 = -0.15 * w.t1, T1 = w.t1, n = w.panels.length, ph = n === 1 ? 150 : 62, gap = 26;
    const panels = w.panels.map((q, i) => ({ q, top: 26 + i * (ph + gap), h: ph }));
    const bottom = panels[n - 1].top + ph, H = bottom + 34;
    const X = (x) => ml + ((x - t0) / (T1 - t0)) * (W - ml - mr), f1 = (x) => x.toFixed(1);
    const ts = Array.from({ length: 241 }, (_, k) => (k * T1) / 240), until = Math.min(t, T1);
    let svg = `<svg class="osw-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${OC.L('The motion against time', 'Die Bewegung gegen die Zeit')}">`;
    panels.forEach((pn) => {
      const q = pn.q, mine = marks.filter((m) => m.q === q).map((m) => Math.abs(m.y));
      // the axis: that of the exercise's graphs (a track), else symmetric around 0, with room for
      // the answers (up to 2.2 times the largest size)
      let lo, hi;
      if (w.axis) ({ lo, hi } = w.axis);
      else {
        const base = inGraph(w, q, w.amp[q]), top = Math.min(2.2 * base, Math.max(base, ...mine));
        hi = w.units ? niceTop(1.04 * top) : 1.3 * top;
        lo = -hi;
      }
      const Y = (y) => pn.top + ((hi - Math.max(lo - 0.04 * (hi - lo), Math.min(hi + 0.04 * (hi - lo), y))) / (hi - lo)) * pn.h;
      pn.Y = Y;
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
      let d = `M${f1(X(t0))} ${f1(Y(v0))}L${f1(X(Math.min(0, until)))} ${f1(Y(v0))}`;
      if (until >= 0) {
        ts.filter((x) => x <= until).forEach((x) => { d += `L${f1(X(x))} ${f1(Y(val(x)))}`; });
        d += `L${f1(X(until))} ${f1(Y(val(until)))}`;
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
    // the answers reached, then a dot on each curve
    marks.forEach((m) => {
      const pn = panels.find((x) => x.q === m.q), cx = X(m.t), cy = pn.Y(m.y);
      svg += `<circle class="pred q-${m.q}" cx="${f1(cx)}" cy="${f1(cy)}" r="6"/><text class="mk ${m.ok ? 'ok' : 'bad'}" x="${f1(Math.min(W - 6, cx + 8))}" y="${f1(cy - 7)}">${m.ok ? '✓' : '✗'}</text>`;
    });
    panels.forEach((pn) => { svg += `<circle class="dot q-${pn.q}" cx="${f1(X(until))}" cy="${f1(pn.Y(inGraph(w, pn.q, w.at(until)[pn.q])))}" r="4"/>`; });
    return `${svg}</svg>`;
  }

  // The player of the run w in host. o: { locked(), marks() → the student's answers (w.marks),
  // ok(mark) → whether a number answered is right (as in the feedback), after() once the scene is
  // drawn anew (e.g. to mark wide figures scrollable) }; all optional.
  function mountWatch(host, w, o = {}) {
    let shown = null, scene = null;
    const L = OC.L;
    // a number answered (ok null) is judged by the app
    const okOf = (m) => (m.ok != null ? m.ok : !!(o.ok && o.ok(m)));
    const body = w.kind === 'pointer' ? L('the pointer', 'den Zeiger') : L('the body', 'den Körper');
    // scene time per real second: a run with numbers in slow motion or time lapse
    const rate = w.t1 / SECONDS, factor = rate < 1 ? 1 / rate : rate, fx = OC.num(OC.sig(factor, 2));
    const scale = () => (w.unit !== 's' ? '' : factor < 1.1 ? L('In real time.', 'In Echtzeit.') : rate < 1 ? L(`Slow motion: ${fx} times slower than in reality.`, `Zeitlupe: ${fx}-mal langsamer als in Wirklichkeit.`) : L(`Time lapse: ${fx} times faster than in reality.`, `Zeitraffer: ${fx}-mal schneller als in Wirklichkeit.`));
    return window.Play.create(host, {
      t0: -0.15 * w.t1, t1: w.t1, seconds: SECONDS,
      locked: o.locked,
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
        if (lock) { side.innerHTML = `<p class="note osw-wait">${L('The graph of the motion appears here once you have solved the exercise or looked at the solution.', 'Der Graph der Bewegung erscheint hier, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.')}</p>`; return; }
        const at = w.at(Math.min(s.t, w.t1));
        const marks = (o.marks ? o.marks() : []).map((m) => ({ ...m, ok: okOf(m) })).filter((m) => s.after && s.t >= m.t - 1e-9);
        const rows = [];
        if (w.units) {
          w.panels.forEach((q) => {
            const x = inGraph(w, q, at[q]), big = Math.max(Math.abs(inGraph(w, q, w.amp[q])), 1e-9);
            rows.push(`<li><span class="key q-${q}" aria-hidden="true"></span><i>${q}</i> = ${fix(x, Math.max(0, 2 - Math.floor(Math.log10(big))))} ${OC.UNITS[w.units[q]][1]}</li>`);
          });
        }
        // one line per answer (a graph: ✓ only if every ring is)
        const says = [...new Set(marks.map((m) => m.say))];
        says.forEach((say) => { const ok = marks.filter((m) => m.say === say).every((m) => m.ok); rows.push(`<li class="pred ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${say}</li>`); });
        side.innerHTML = graph(w, s.t, marks) + `<ul class="osw-read">${rows.join('')}</ul>` + (scale() ? `<p class="note osw-scale">${scale()}</p>` : '');
      },
      texts: () => ({
        switch: w.kind === 'pointer' ? L('The pointer: set it turning', 'Der Zeiger: drehen lassen') : w.push ? L('The body: push it', 'Der Körper: anstossen') : L('The body: let it go', 'Der Körper: loslassen'),
        locked: L(`Check your answer first: you can start ${body} once you have solved the exercise or looked at the solution.`, `Prüfe zuerst deine Antwort: Du kannst ${body} starten, sobald du die Aufgabe gelöst oder die Lösung angeschaut hast.`),
        ready: w.kind === 'pointer' ? L('Click the pointer to set it turning, and watch the body follow the height of its tip.', 'Klicke auf den Zeiger, damit er sich dreht, und schau zu, wie der Körper der Höhe seiner Spitze folgt.')
          : w.push ? L('Click the body to give it a push upwards, and watch it oscillate.', 'Klicke auf den Körper, um ihn nach oben anzustossen, und schau zu, wie er schwingt.')
            : w.kind === 'track' ? L('Click the body to let it go, and watch it move as the equation says.', 'Klicke auf den Körper, um ihn loszulassen, und schau zu, wie er sich gemäss der Gleichung bewegt.')
              : L('Click the body to let it go, and watch it oscillate.', 'Klicke auf den Körper, um ihn loszulassen, und schau zu, wie er schwingt.'),
        again: (o.marks ? L('Rings: your answers (✓ right, ✗ not). ', 'Ringe: deine Antworten (✓ richtig, ✗ nicht). ') : '') +
          L(`Click ${body} again to go back, or ▶ to watch once more.`, `Klicke nochmals auf ${body}, um zurückzugehen, oder ▶, um nochmals zuzuschauen.`),
        time: w.unit === 's' ? (t) => `t = ${fix(t, w.t1 < 2 ? 2 : 1)} s` : w.unit === 'T' ? (t) => `t = ${fix(t, 2)} T` : null,
      }),
    });
  }

  root.OscWatch = { mount: mountWatch, graph };
})(window);
