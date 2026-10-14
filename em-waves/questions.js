// Ranking by drag and drop, for practice (the check keeps its multiple choice): a field
// { key, type: 'rank', what, items: [{ key, label }], ends: [top, bottom] } is drawn as cards in a
// pool, dragged into boxes, the top one first; equal ones would share a box. Dragging works with
// mouse, pen and touch; a card can also be tapped (or selected with the keyboard) and then its box
// tapped. The answer is read as ranks (1, 2, 2, 4), null for a card still in the pool.
// A copy of the 'rank' format of force-concepts/questions.js (html, state, setState, attach), to
// move to shared/ later.
(function (root) {
  'use strict';

  const EW = root.EW, T = (en, de) => EW.L(en, de);
  const $q = (f) => document.querySelector(`.field[data-key="${f.key}"]`);

  // ---------------------------------------------------------------- drawing
  const cards = (f) => f.items.map((x, i) => `<button type="button" class="chip" data-i="${i}">${x.label}</button>`).join('');
  const zone = (cls, id, inner = '') => `<div class="zone ${cls}" data-zone="${id}" tabindex="0" role="button">${inner}<div class="drop"></div></div>`;
  const tapNote = () => T('(Or tap an item, then its box.)', '(Oder tippe ein Element an und dann sein Feld.)');

  function html(f) {
    return `<div class="field rank dnd" data-key="${f.key}">
      <p class="note dnd-note">${T('Drag the items into the boxes, in order from the top to the bottom.', 'Ziehe die Elemente der Reihe nach in die Felder, von oben nach unten.')} ${tapNote()}</p>
      <div class="zone pool" data-zone="pool"><div class="drop">${cards(f)}</div></div>
      <p class="end">▲ ${f.ends[0]}</p>
      <div class="buckets">${f.items.map((x, b) => zone('bucket', b)).join('')}</div>
      <p class="end">▼ ${f.ends[1]}</p>
      <p class="fb" aria-live="polite"></p></div>`;
  }

  // ---------------------------------------------------------------- reading and setting answers
  // Where each card lies: 'pool' or the id of its box.
  const zones = (f) => { const el = $q(f); return f.items.map((x, i) => { const z = el.querySelector(`.chip[data-i="${i}"]`).closest('.zone'); return z ? z.dataset.zone : 'pool'; }); };
  // ranks from the boxes in order, skipping empty ones: [A, C | B | D] → 1, 3, 1, 4
  function state(f) {
    const zs = zones(f), used = [...new Set(zs.filter((z) => z !== 'pool').map(Number))].sort((a, b) => a - b);
    return zs.map((z) => (z === 'pool' ? null : 1 + zs.filter((w) => w !== 'pool' && used.indexOf(Number(w)) < used.indexOf(Number(z))).length));
  }
  function place(f, i, z) {
    const el = $q(f), card = el.querySelector(`.chip[data-i="${i}"]`);
    el.querySelector(`.zone[data-zone="${z}"] .drop`).appendChild(card);
  }
  function setState(f, s) {
    if (!s) return;
    const distinct = [...new Set(s.filter((v) => v != null))].sort((a, b) => a - b);
    s.forEach((v, i) => place(f, i, v == null ? 'pool' : distinct.indexOf(v)));
  }

  // ---------------------------------------------------------------- marking
  // The cards marked right or wrong (ok, bad: indices of items).
  function mark(f, ok = [], bad = []) {
    const el = $q(f);
    el.querySelectorAll('.chip').forEach((c) => {
      const i = Number(c.dataset.i);
      c.classList.toggle('ok', ok.includes(i));
      c.classList.toggle('bad', bad.includes(i));
    });
  }
  // After a card moved: the field's marks and feedback go.
  function clearAt(el) {
    const f = el.closest('.field');
    if (!f) return;
    f.classList.remove('ok', 'warn', 'bad');
    f.querySelectorAll('.chip').forEach((c) => c.classList.remove('ok', 'bad'));
    f.querySelectorAll('.fb').forEach((x) => { x.innerHTML = ''; });
  }

  // ---------------------------------------------------------------- drag and drop
  // Delegated on the container of the fields. A moved card fires 'change' (bubbling), like an
  // input, so the page clears the marks.
  function attach(box) {
    let drag = null, selected = null, suppressClick = false;
    const zoneAt = (x, y, f) => { const el = document.elementFromPoint(x, y); const z = el && el.closest('.zone'); return z && z.closest('.field') === f ? z : null; };
    const select = (card) => {
      const next = card && card !== selected ? card : null;
      if (selected) selected.classList.remove('selected');
      selected = next;
      if (selected) selected.classList.add('selected');
      box.querySelectorAll('.field.dnd').forEach((f) => f.classList.toggle('placing', !!selected && selected.closest('.field') === f));
    };
    function move(card, z) {
      z.querySelector('.drop').appendChild(card);
      card.dispatchEvent(new Event('change', { bubbles: true }));
    }

    box.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.chip');
      if (!card || card.disabled || e.button > 0) return;
      const r = card.getBoundingClientRect();
      drag = { card, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, started: false, ghost: null, over: null };
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.started) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
        drag.started = true;
        select(null);
        drag.ghost = drag.card.cloneNode(true);
        drag.ghost.classList.add('ghost');
        drag.ghost.style.width = `${drag.w}px`;
        document.body.appendChild(drag.ghost);
        drag.card.classList.add('dragging');
        try { drag.card.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
        drag.raf = requestAnimationFrame(autoscroll);
      }
      e.preventDefault();
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.ghost.style.left = `${e.clientX - drag.dx}px`;
      drag.ghost.style.top = `${e.clientY - drag.dy}px`;
      hover();
    });
    // The box under the pointer, highlighted.
    function hover() {
      const z = zoneAt(drag.x, drag.y, drag.card.closest('.field'));
      if (z !== drag.over) { if (drag.over) drag.over.classList.remove('over'); drag.over = z; if (z) z.classList.add('over'); }
    }
    // Near the top or bottom edge of the window the page scrolls, faster the closer to the edge,
    // so that boxes out of view (on a phone) can be reached.
    function autoscroll() {
      if (!drag || !drag.started) return;
      const edge = 60, h = window.innerHeight;
      const dy = drag.y < edge ? -Math.ceil((edge - drag.y) / 3) : drag.y > h - edge ? Math.ceil((drag.y - (h - edge)) / 3) : 0;
      if (dy) { window.scrollBy(0, dy); hover(); }
      drag.raf = requestAnimationFrame(autoscroll);
    }
    const end = (e, drop) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.started) {
        cancelAnimationFrame(drag.raf);
        if (drop && drag.over) move(drag.card, drag.over);
        if (drag.over) drag.over.classList.remove('over');
        drag.ghost.remove();
        drag.card.classList.remove('dragging');
        suppressClick = true; // the click that follows the drag
        setTimeout(() => { suppressClick = false; }, 0);
      }
      drag = null;
    };
    box.addEventListener('pointerup', (e) => end(e, true));
    box.addEventListener('pointercancel', (e) => end(e, false));

    // Tap (or Enter) on a card selects it; then a tap (or Enter) on a box puts it there.
    box.addEventListener('click', (e) => {
      if (suppressClick) return;
      const card = e.target.closest('.chip');
      if (card && !card.disabled) { select(card); return; }
      const z = e.target.closest('.zone');
      if (z && selected && z.closest('.field') === selected.closest('.field')) { move(selected, z); select(null); }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') select(null);
      const z = e.target.closest('.zone');
      if (z && e.target === z && (e.key === 'Enter' || e.key === ' ') && selected) { e.preventDefault(); move(selected, z); select(null); }
    });
  }

  root.Questions = { html, state, setState, mark, clearAt, attach };
})(window);
