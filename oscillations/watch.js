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

  // The graph at time t: y (and v and a) up to t, the line of t with a dot on each curve, and the
  // key points reached (a chain of them joined by a dashed line); o.other: a wrong graph { f },
  // drawn dotted in the panel of y up to t; o.extrema: lines where the curves have their maxima and minima; o.hoverAt: the
  // time read (under the pointer, or tapped): a line through every panel, a dot on each curve and a label with t and the
  // values there (with numbers, or in periods and amplitudes), or null.
  const GW = 330, GML = 46, GMR = 14;
  // the layout of the graph: the panels, their bottom, the time at the left edge and X(t) in svg units (and back, t(X))
  function frame(w) {
    const t0 = -0.15 * w.t1, n = w.panels.length, ph = n === 1 ? 150 : 62, gap = 26, span = GW - GML - GMR;
    const panels = w.panels.map((q, i) => ({ q, top: 26 + i * (ph + gap), h: ph }));
    return { t0, ph, panels, bottom: panels[n - 1].top + ph, X: (x) => GML + ((x - t0) / (w.t1 - t0)) * span, t: (X) => t0 + ((X - GML) / span) * (w.t1 - t0) };
  }
  // the decimals of a reading: about a hundredth of the time axis (of the amplitude)
  const tDec = (w) => (w.unit === 'T' ? 2 : Math.max(0, 2 - Math.floor(Math.log10(w.t1))));
  const vDec = (big) => Math.max(0, 2 - Math.floor(Math.log10(Math.max(big, 1e-9))));
  // the lines of the label of a reading at time x: t, then the value of each panel
  function readLines(w, x) {
    const at = w.at(x), name = (q) => (q === 'y' ? w.name || 'y' : q);
    const lines = [{ text: `t = ${fix(x, tDec(w))}${w.unit === 's' ? ' s' : ' T'}` }];
    w.panels.forEach((q) => {
      if (at[q] == null) return;
      const value = w.units ? `${fix(inGraph(w, q, at[q]), vDec(Math.abs(inGraph(w, q, w.amp[q]))))} ${OC.UNITS[w.units[q]][1]}`
        : `${fix(at[q] / w.amp[q], 2)} ${q === 'y' ? 'A' : `${q}\u0302`}`;
      lines.push({ q, name: name(q), value });
    });
    return lines;
  }
  function graph(w, t, keys, o = {}) {
    const W = GW, ml = GML, mr = GMR, T1 = w.t1, fr = frame(w), { t0, ph, panels, bottom, X } = fr;
    const H = bottom + 34, f1 = (x) => x.toFixed(1);
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
      // a wrong graph (o.other) under the motion, from the release to t
      if (o.other && q === 'y' && until >= 0) {
        const at = (x) => `${f1(X(x))} ${f1(Y(o.other.f(x)))}`;
        svg += `<path class="wother" d="M${[...ts.filter((x) => x <= until), until].map(at).join('L')}"/><circle class="odot" cx="${f1(X(until))}" cy="${f1(Y(o.other.f(until)))}" r="3.5"/>`;
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
    // the reading: a line through the panels, a dot on each curve, the label beside the line (left of it in the right part)
    if (o.hoverAt != null) {
      const x = X(o.hoverAt), lines = readLines(w, o.hoverAt), at = w.at(o.hoverAt);
      svg += `<g class="wread" aria-hidden="true"><line class="hover" x1="${f1(x)}" x2="${f1(x)}" y1="${panels[0].top - 4}" y2="${bottom + 4}"/>`;
      panels.forEach((pn) => { if (at[pn.q] != null) svg += `<circle class="rdot q-${pn.q}" cx="${f1(x)}" cy="${f1(pn.Y(inGraph(w, pn.q, at[pn.q])))}" r="3.5"/>`; });
      const lineH = 14, bw = 12 + 6.4 * Math.max(...lines.map((l) => (l.q ? `${l.name} = ${l.value}` : l.text).length)), bh = 8 + lineH * lines.length;
      const bx = x + 8 + bw <= W - 2 ? x + 8 : Math.max(2, x - 8 - bw), by = panels[0].top - 2;
      svg += `<rect class="rbox" x="${f1(bx)}" y="${by}" width="${f1(bw)}" height="${bh}" rx="4"/>`;
      lines.forEach((l, i) => {
        const y = by + 15 + i * lineH;
        svg += `<text class="rtext" x="${f1(bx + 6)}" y="${y}">${l.q ? `<tspan class="it n-${l.q}">${l.name}</tspan> = ${l.value}` : `<tspan class="it">t</tspan>${l.text.slice(1)}`}</text>`;
      });
      svg += '</g>';
    }
    // the key points reached: rings with their labels (moved down where they would cover another
    // one), a chain joined by a dashed line; then a dot on each curve
    const placed = [];
    keys.forEach((k) => {
      const pts = k.pts.filter((m) => t >= 0 && t >= m.t - 1e-9 && panels.some((x) => x.q === m.q));
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
    panels.forEach((pn) => { svg += `<circle class="dot q-${pn.q}" cx="${f1(X(until))}" cy="${f1(pn.Y(inGraph(w, pn.q, w.at(until)[pn.q])))}" r="4"/>`; });
    return `${svg}</svg>`;
  }

  // The player of the run w in host. o: { locked(), check() (▶ while locked: the app checks the
  // answer, play.js), marks() → the student's answers (w.marks), other() → a wrong graph (w.other),
  // ok(mark) → whether a number answered is right (as in the feedback), after() once the scene is
  // drawn anew (e.g. to mark wide figures scrollable), slow() → true for slow motion (SLOW times
  // slower), extrema (lines through the graphs at their maxima and minima) }; all optional. The graph
  // can be read (with shared/reader.js on the page): t and the values at the pointer.
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
    // view.hoverAt: the time read in the graph (null: none)
    const view = { ...o, hoverAt: null };
    let now = -Infinity; // the time of the run shown
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
        now = s.t;
        // a reading beyond the curves drawn (the run started again) goes
        if (view.hoverAt != null && view.hoverAt > s.t) view.hoverAt = null;
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
        side.innerHTML = graph(w, s.t, keys, { ...view, other }).replace('<svg class="osw-plot"', `<svg class="osw-plot${view.hoverAt != null ? ' rd-reading' : ''}"`) + `<ul class="osw-read">${rows.join('')}</ul>` + (scale() ? `<p class="note osw-scale">${scale()}</p>` : '');
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
    // the reading (shared/reader.js): the pointer over the graph (a mouse or pen hovering; a finger taps, then drags, and
    // the graph stops scrolling the page until a tap elsewhere) reads t and the values, as far as the curves are drawn;
    // a run without numbers or periods on its time axis (a track) has none
    if (root.Reader && (w.unit === 's' || w.unit === 'T')) {
      const fr = frame(w), plot = () => host.querySelector('svg.osw-plot');
      root.Reader.attach(host, {
        svg: plot,
        pick(ux, uy) {
          if (!plot() || ux < GML || ux > GW - GMR || uy < fr.panels[0].top - 6 || uy > fr.bottom + 6) return null;
          const t = Math.min(fr.t(ux), Math.min(now, w.t1));
          return t >= fr.t0 ? { t } : null;
        },
        show(r) {
          const at = r ? r.t : null;
          if (at !== view.hoverAt) { view.hoverAt = at; player.refresh(); }
          const s = plot();
          if (s) s.classList.toggle('rd-reading', at != null);
          return null;
        },
      });
    }
    return player;
  }

  root.OscWatch = { mount: mountWatch, graph };
})(window);
