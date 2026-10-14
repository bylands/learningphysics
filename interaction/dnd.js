// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh into the apps
// whose index.html loads it: Force and Motion, Interaction, Electromagnetic Waves; its look is in
// dnd.css). Items dragged into boxes, for ranking and matching: cards in a pool, dragged into boxes
// below it. Dragging works with mouse, pen and touch (near the edge of the window the page scrolls);
// a card can also be tapped (or selected with the keyboard) and then its box tapped (or Enter).
// The app draws the question around it, reads the answer and gives the feedback.
//   Dnd.html(o)          the note, the pool and the boxes, as HTML for the element of class dnd
//                        (the board) that the app draws around them; o: { kind, items: [label
//                        html], ro, note }, and by kind
//                          'rank'   boxes one below the other, the top one first, equal ones share
//                                   a box; ends: [top, bottom], else largest … smallest
//                          'match'  one box per answer, with its head (heads: [html]; pics: wider
//                                   boxes for pictures); a box can take several items, or none
//                          'pairs'  items/2 boxes «Pair 1» …, two items each (the oldest goes back
//                                   to the pool when a third comes)
//                        note replaces the note of the kind («Drag …»); «(Or tap …)» follows it
//   Dnd.zones(el)        where each card of the board el lies: 'pool' or the id of its box (0, 1, …)
//   Dnd.ranks(el), Dnd.setRanks(el, s)          a ranking as ranks (1, 2, 2, 4; null: in the pool)
//   Dnd.choices(el), Dnd.setChoices(el, s)      a matching as the box of each item (null: pool)
//   Dnd.partners(el), Dnd.setPartners(el, s)    pairs as the partner of each item (null: none yet)
//   Dnd.mark(el, ok, bad)  marks cards right or wrong (indices of items; none: clears the marks)
//   Dnd.attach(box)      the dragging, delegated on the container of the boards; a moved card
//                        fires 'change' (bubbling) like an input, so the page clears its marks
// The pure parts (ranksOf, zonesOfRanks, partnersOf, zonesOfPartners) work on the list of zones and
// are checked in shared/test/check-dnd.js. The texts come in the page language (Lang.L, lang.js).
(function (root) {
  'use strict';

  const T = (en, de) => (root.Lang ? root.Lang.L(en, de) : en);

  // ---------------------------------------------------------------- answers from the zones
  // ranks from the boxes in order, skipping empty ones: [A, C | B | D] → 1, 3, 1, 4
  function ranksOf(zs) {
    const used = [...new Set(zs.filter((z) => z !== 'pool').map(Number))].sort((a, b) => a - b);
    return zs.map((z) => (z === 'pool' ? null : 1 + zs.filter((w) => w !== 'pool' && used.indexOf(Number(w)) < used.indexOf(Number(z))).length));
  }
  // the boxes of ranks: each distinct rank a box of its own, from the top
  function zonesOfRanks(s) {
    const distinct = [...new Set(s.filter((v) => v != null))].sort((a, b) => a - b);
    return s.map((v) => (v == null ? 'pool' : distinct.indexOf(v)));
  }
  // the partner of each item: the one other item in its box, else null
  const partnersOf = (zs) => zs.map((z, i) => {
    const with_ = zs.map((w, j) => (w === z && j !== i ? j : -1)).filter((j) => j >= 0);
    return z === 'pool' || with_.length !== 1 ? null : with_[0];
  });
  // the boxes of partners (p[i]: the partner of item i, null for none, -1 for one not among the
  // items): each item with its partner in the next free box
  function zonesOfPartners(p) {
    const zs = p.map(() => 'pool'), placed = new Set();
    let box = 0;
    p.forEach((v, i) => {
      if (placed.has(i)) return;
      if (v == null) { zs[i] = 'pool'; return; }
      zs[i] = box; placed.add(i);
      if (v >= 0 && !placed.has(v)) { zs[v] = box; placed.add(v); }
      box++;
    });
    return zs;
  }

  // ---------------------------------------------------------------- drawing
  const tapNote = () => T('(Or tap an item, then its box.)', '(Oder tippe ein Element an und dann sein Feld.)');
  const NOTES = {
    size: () => T('Drag the items into the boxes, the largest at the top and the smallest at the bottom. Equal ones go into the same box.', 'Ziehe die Elemente in die Felder, das grösste nach oben und das kleinste nach unten. Gleiche kommen ins selbe Feld.'),
    order: () => T('Drag the items into the boxes, in order from the top to the bottom.', 'Ziehe die Elemente der Reihe nach in die Felder, von oben nach unten.'),
    match: () => T('Drag each item onto the answer that fits. An answer can take several items, or none.', 'Ziehe jedes Element auf die passende Antwort. Eine Antwort kann mehrere Elemente aufnehmen oder keines.'),
    pairs: () => T('Drag the items into pairs: each box takes one item and its partner.', 'Ziehe die Elemente paarweise in die Felder: In jedes Feld kommt ein Element mit seinem Partner.'),
  };
  const zone = (cls, id, inner, ro, cap) => `<div class="zone ${cls}" data-zone="${id}"${cap ? ` data-cap="${cap}"` : ''} tabindex="${ro ? -1 : 0}" role="button">${inner}<div class="drop"></div></div>`;

  function html(o) {
    const ro = !!o.ro, n = o.items.length;
    const cards = o.items.map((label, i) => `<button type="button" class="chip" data-i="${i}"${ro ? ' disabled' : ''}>${label}</button>`).join('');
    const note = o.note || (o.kind === 'rank' ? (o.ends ? NOTES.order() : NOTES.size()) : NOTES[o.kind]());
    let boxes;
    if (o.kind === 'rank') {
      const ends = o.ends || [T('largest', 'am grössten'), T('smallest', 'am kleinsten')];
      boxes = `<p class="end">▲ ${ends[0]}</p>
      <div class="buckets">${o.items.map((x, b) => zone('bucket', b, '', ro)).join('')}</div>
      <p class="end">▼ ${ends[1]}</p>`;
    } else if (o.kind === 'match') {
      boxes = `<div class="targets${o.pics ? ' pics' : ''}">${o.heads.map((h, j) => zone('target', j, `<div class="target-head">${h}</div>`, ro)).join('')}</div>`;
    } else {
      boxes = `<div class="pairs">${Array.from({ length: n / 2 }, (z, b) => zone('pair', b, `<span class="zone-label">${T('Pair', 'Paar')} ${b + 1}</span>`, ro, 2)).join('')}</div>`;
    }
    return `<p class="note dnd-note">${note} ${tapNote()}</p>
      <div class="zone pool" data-zone="pool"><div class="drop">${cards}</div></div>
      ${boxes}`;
  }

  // ---------------------------------------------------------------- reading and setting answers
  const cardsOf = (el) => [...el.querySelectorAll('.chip')].sort((a, b) => a.dataset.i - b.dataset.i);
  // Where each card lies: 'pool' or the id of its box.
  const zones = (el) => cardsOf(el).map((c) => { const z = c.closest('.zone'); return z ? z.dataset.zone : 'pool'; });
  function place(el, zs) {
    zs.forEach((z, i) => el.querySelector(`.zone[data-zone="${z}"] .drop`).appendChild(el.querySelector(`.chip[data-i="${i}"]`)));
  }
  const choice = (z) => (z === 'pool' ? null : Number(z));

  // ---------------------------------------------------------------- marking
  function mark(el, ok = [], bad = []) {
    el.querySelectorAll('.chip').forEach((c) => {
      const i = Number(c.dataset.i);
      c.classList.toggle('ok', ok.includes(i));
      c.classList.toggle('bad', bad.includes(i));
    });
  }

  // ---------------------------------------------------------------- drag and drop
  function attach(box) {
    let drag = null, selected = null, suppressClick = false;
    const board = (el) => el.closest('.dnd');
    const zoneAt = (x, y, b) => { const el = document.elementFromPoint(x, y); const z = el && el.closest('.zone'); return z && board(z) === b ? z : null; };
    const select = (card) => {
      const next = card && card !== selected ? card : null;
      if (selected) selected.classList.remove('selected');
      selected = next;
      if (selected) selected.classList.add('selected');
      box.querySelectorAll('.dnd').forEach((b) => b.classList.toggle('placing', !!selected && board(selected) === b));
    };
    function move(card, z) {
      const drop = z.querySelector('.drop'), cap = Number(z.dataset.cap || 0);
      if (cap) {
        const others = [...drop.querySelectorAll('.chip')].filter((c) => c !== card);
        if (others.length >= cap) board(card).querySelector('.zone.pool .drop').appendChild(others[0]); // a full box: the oldest goes back
      }
      drop.appendChild(card);
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
      const z = zoneAt(drag.x, drag.y, board(drag.card));
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
      if (z && selected && board(z) === board(selected)) { move(selected, z); select(null); }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') select(null);
      const z = e.target.closest('.zone');
      if (z && e.target === z && (e.key === 'Enter' || e.key === ' ') && selected) { e.preventDefault(); move(selected, z); select(null); }
    });
  }

  const Dnd = {
    html, zones, mark, attach,
    ranks: (el) => ranksOf(zones(el)),
    setRanks: (el, s) => place(el, zonesOfRanks(s)),
    choices: (el) => zones(el).map(choice),
    setChoices: (el, s) => place(el, s.map((v) => (v == null ? 'pool' : v))),
    partners: (el) => partnersOf(zones(el)),
    setPartners: (el, p) => place(el, zonesOfPartners(p)),
    ranksOf, zonesOfRanks, partnersOf, zonesOfPartners,
  };
  root.Dnd = Dnd;
  if (typeof module !== 'undefined') module.exports = Dnd;
})(typeof window !== 'undefined' ? window : globalThis);
