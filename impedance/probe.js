// The probe on a graph: moving the mouse (or a finger, or the arrow keys once the graph has the
// focus) over the graph shows the point on the curve at that ω, the tangent there, and a readout
// of ω, ω⁻² (Z² of a series RC circuit is a straight line in it), Z, the slope dZ/dω and, on
// log-log axes, the slope of the straight line in the log-log plot. A click or tap (or Enter) pins
// the point (up to three); pinned points are listed below the graph. The pointer, the keys and
// the pins are those of reader.js; here the probe's ω, its marks (plot.js) and its readout.
(function (root) {
  'use strict';

  const I = root.Impedance, P = root.Plot;
  // the page language (lang.js, shared by the apps); English where it is not loaded
  const L = (en, de) => (root.Lang ? root.Lang.L(en, de) : en);
  const MAX_PINS = 3;

  // el: the element holding the graph <svg>; get() returns { c, ax, mode } of what is drawn;
  // out: element for the readout; pinList: element for the pinned points.
  function createProbe(el, get, out, pinList) {
    // the variable of the axis: ω in rad/s, or (problems) f in Hz, with digits enough to tell
    // readings apart in a narrow window of frequencies
    const xOf = (r, ax, mode) => {
      if (!ax.x || ax.x.unit !== 'Hz') return `<i>ω</i> = ${I.H(r.w, 'w')}`;
      const sc = P.scales(ax, mode), span = sc.wmax - sc.wmin;
      const n = mode === 'semilog' || mode === 'log' ? 3 : Math.min(7, Math.max(3, 3 + Math.ceil(Math.log10(r.w / span))));
      return `<i>${ax.x.name}</i> = ${I.H(r.w, 'Hz', n)}`;
    };
    // ω⁻² (or f⁻²) in s²: Z² of a series RC circuit is a straight line in it, Z² = R² + ω⁻²/C²
    const inv2 = (r, ax) => `<i>${ax.x ? ax.x.name : 'ω'}</i><sup>−2</sup> = ${I.H(r.inv2, 's2')}`;
    const line = (r, mode, ax) => `<span>${xOf(r, ax, mode)}</span><span>${inv2(r, ax)}</span><span><i>Z</i> = ${I.H(r.z, 'ohm')}</span>` +
      `<span>${L('slope', 'Steigung')} <i>dZ</i>/<i>d${ax.x ? ax.x.name : 'ω'}</i> = ${I.H(r.d, 'ohms')}</span>` +
      (mode === 'log' ? `<span>${L('log-log slope', 'doppelt logarithmische Steigung')} = ${I.digits(r.p)}</span>` : '');

    function show(r, pins) {
      const { c, ax, mode } = get(), layer = el.querySelector('.probe'), w = r ? r.w : null;
      if (!layer) return;
      // the graph takes the focus for the arrow keys (the tutor leaves an svg[tabindex] alone)
      const s = el.querySelector('svg');
      if (!s.hasAttribute('tabindex')) {
        s.setAttribute('tabindex', '0');
        s.setAttribute('aria-label', `${s.getAttribute('aria-label')}. ${L('Arrow keys move the probe (with Shift in larger steps), Enter pins a point.', 'Die Pfeiltasten verschieben die Sonde (mit Shift in grösseren Schritten), Enter hält einen Punkt fest.')}`);
      }
      layer.innerHTML = P.probeMark(c, ax, mode, w, pins);
      out.innerHTML = w === null
        ? `<span class="muted">${L('Move the mouse over the graph (or touch it) to read the coordinates and the slope of the tangent. Click or tap to pin a point.', 'Fahre mit der Maus über den Graphen (oder tippe darauf), um die Koordinaten und die Steigung der Tangente abzulesen. Klicke oder tippe, um einen Punkt festzuhalten.')}</span>`
        : line(P.readout(c, ax, mode, w), mode, ax);
      pinList.innerHTML = pins.map((p) => `<li><span class="pin-label">${p.n}</span>${line(P.readout(c, ax, mode, p.w), mode, ax)}<button type="button" class="unpin" data-n="${p.n}" aria-label="${L('Remove point', 'Punkt entfernen')} ${p.n}">×</button></li>`).join('');
      pinList.hidden = !pins.length;
    }

    // ω at the pointer (null outside the plot area); the arrow keys ← → move the probe by 1/100
    // of the axis (Shift: 1/10), ↑ ↓ are left to the page
    const reader = root.Reader.attach(el, {
      pins: MAX_PINS,
      show,
      pick(x) { const { ax, mode } = get(), w = P.omegaAt(ax, mode, x); return w === null ? null : { w }; },
      nudge(r, dx, dy, shift) {
        if (!dx) return undefined;
        const { ax, mode } = get(), sc = P.scales(ax, mode);
        const px = r === null ? P.ML + P.PW / 2 : sc.x(r.w) + dx * (shift ? P.PW / 10 : P.PW / 100);
        return { w: P.omegaAt(ax, mode, Math.min(P.ML + P.PW, Math.max(P.ML, px))) };
      },
    });
    pinList.addEventListener('click', (evt) => {
      const b = evt.target.closest('.unpin');
      if (!b) return;
      reader.unpin(Number(b.dataset.n));
    });

    return { draw: reader.draw, reset: reader.reset };
  }

  root.createProbe = createProbe;
})(window);
