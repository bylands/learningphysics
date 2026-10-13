// The question formats in the page: how each type is drawn, read, checked and marked.
//   choice  one option (radio buttons)          two   a prediction and a reason
//   tf      true/false for each statement        rank  items dragged into boxes, largest first;
//   match   items dragged onto the choices             equal ones share a box
//           (or, for partners, into pairs)
// Dragging works with mouse, pen and touch; an item can also be tapped (or selected with the
// keyboard) and then its box tapped. Rankings are read as ranks (1, 2, 2, 4), matchings as the
// index of the chosen choice, as before.
// state(q) reads the answer from the page, evaluate(q, state) checks it: { complete, ok, marks,
// misses } — marks say what to colour and explain where, misses the misconceptions behind wrong
// parts ({ id, code }, id unique within the question).
(function (root) {
  'use strict';

  const FC = root.FC, T = FC.T;
  const LETTERS = 'ABCDEF';
  const $q = (q) => document.querySelector(`.field[data-key="${q.key}"]`);
  const tag = (code) => (FC.MIS[code] ? ` <span class="tag" title="${T('Wrong idea', 'Falsche Vorstellung')}: ${FC.mis(code).text}">${FC.misLabel(code)}</span>` : '');
  const right = () => T('Right.', 'Richtig.');

  // ---------------------------------------------------------------- drawing
  const optionsHtml = (opts, name, pics, ro) => `
    <div class="opts ${pics ? 'pics' : 'list'}" role="radiogroup">${opts.map((x, i) => `
      <label><input type="radio" name="${name}" value="${i}"${ro ? ' disabled' : ''}><span><b class="letter">${LETTERS[i]}</b>${pics ? `<span class="pic">${x.label}</span>` : `<span>${x.label}</span>`}</span></label>`).join('')}
    </div>`;
  const cards = (q, ro) => q.items.map((x, i) => `<button type="button" class="chip" data-i="${i}"${ro ? ' disabled' : ''}>${x.label}</button>`).join('');
  const pool = (q, ro) => `<div class="zone pool" data-zone="pool"><div class="drop">${cards(q, ro)}</div></div>`;
  const zone = (cls, id, inner, ro, cap) => `<div class="zone ${cls}" data-zone="${id}"${cap ? ` data-cap="${cap}"` : ''} tabindex="${ro ? -1 : 0}" role="button">${inner}<div class="drop"></div></div>`;
  const tapNote = () => T('(Or tap an item, then its box.)', '(Oder tippe ein Element an und dann sein Feld.)');
  const itemFb = (q) => `<ul class="item-fb">${q.items.map((x, i) => `<li data-fb="${i}" hidden><b>${x.name}</b>: <span class="fb"></span></li>`).join('')}</ul>`;

  // The question as HTML; ro: read-only (for the tutor).
  function html(q, k, ro = false) {
    const head = `<p class="qprompt"><span class="qn">${k + 1}</span>${q.prompt}</p>`;
    switch (q.type) {
      case 'two':
        return `<div class="field two" data-key="${q.key}">${head}
          <div class="grp" data-grp="pred">${optionsHtml(q.options, `pred-${q.key}`, q.pics, ro)}<p class="fb"></p></div>
          <p class="qprompt sub">${q.reasonPrompt}</p>
          <div class="grp" data-grp="reason">${optionsHtml(q.reasons, `reason-${q.key}`, false, ro)}<p class="fb"></p></div>
          <p class="fb qfb"></p></div>`;
      case 'tf':
        return `<div class="field tf" data-key="${q.key}">${head}<ol class="rows">${q.items.map((x, i) => `
          <li class="row" data-i="${i}"><span class="row-text">${x.text}</span>
            <span class="tf-btns" role="radiogroup">
              <label><input type="radio" name="tf-${q.key}-${i}" value="1"${ro ? ' disabled' : ''}><span>${T('true', 'richtig')}</span></label>
              <label><input type="radio" name="tf-${q.key}-${i}" value="0"${ro ? ' disabled' : ''}><span>${T('false', 'falsch')}</span></label>
            </span><p class="fb"></p></li>`).join('')}</ol></div>`;
      case 'rank':
        return `<div class="field rank dnd${ro ? ' ro' : ''}" data-key="${q.key}">${head}
          <p class="note dnd-note">${T('Drag the items into the boxes, the largest at the top and the smallest at the bottom. Equal ones go into the same box.', 'Ziehe die Elemente in die Felder, das grösste nach oben und das kleinste nach unten. Gleiche kommen ins selbe Feld.')} ${tapNote()}</p>
          ${pool(q, ro)}
          <p class="end">▲ ${T('largest', 'am grössten')}</p>
          <div class="buckets">${q.items.map((x, b) => zone('bucket', b, '', ro)).join('')}</div>
          <p class="end">▼ ${T('smallest', 'am kleinsten')}</p>
          <p class="fb qfb"></p></div>`;
      case 'match':
        if (q.same) {
          return `<div class="field match dnd${ro ? ' ro' : ''}" data-key="${q.key}">${head}
            <p class="note dnd-note">${T('Drag the forces into pairs: each box takes one force and its partner.', 'Ziehe die Kräfte paarweise in die Felder: In jedes Feld kommt eine Kraft mit ihrer Gegenkraft.')} ${tapNote()}</p>
            ${pool(q, ro)}
            <div class="pairs">${Array.from({ length: q.items.length / 2 }, (z, b) => zone('pair', b, `<span class="zone-label">${T('Pair', 'Paar')} ${b + 1}</span>`, ro, 2)).join('')}</div>
            ${itemFb(q)}</div>`;
        }
        return `<div class="field match dnd${ro ? ' ro' : ''}" data-key="${q.key}">${head}
          <p class="note dnd-note">${T('Drag each item onto the answer that fits. An answer can take several items, or none.', 'Ziehe jedes Element auf die passende Antwort. Eine Antwort kann mehrere Elemente aufnehmen oder keines.')} ${tapNote()}</p>
          ${pool(q, ro)}
          <div class="targets${q.pics ? ' pics' : ''}">${q.choices.map((c, j) => zone('target', j,
            `<div class="target-head">${q.pics ? `<b class="letter">${c.name}</b><span class="pic">${c.label}</span>` : `<span>${c.label}</span>`}</div>`, ro)).join('')}</div>
          ${itemFb(q)}</div>`;
      default:
        return `<div class="field choice" data-key="${q.key}">${head}<div class="grp" data-grp="pred">${optionsHtml(q.options, `opt-${q.key}`, q.pics, ro)}<p class="fb"></p></div></div>`;
    }
  }

  // ---------------------------------------------------------------- reading and setting answers
  const radio = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? Number(el.value) : null; };
  // Where each card lies: 'pool' or the id of its box.
  const zones = (q) => { const f = $q(q); return q.items.map((x, i) => { const z = f.querySelector(`.chip[data-i="${i}"]`).closest('.zone'); return z ? z.dataset.zone : 'pool'; }); };
  const partnerChoice = (q, p) => q.choices.findIndex((c) => c.id === q.items[p].name);
  function state(q) {
    switch (q.type) {
      case 'two': return [radio(`pred-${q.key}`), radio(`reason-${q.key}`)];
      case 'tf': return q.items.map((x, i) => { const v = radio(`tf-${q.key}-${i}`); return v == null ? null : v === 1; });
      case 'rank': {
        // ranks from the boxes in order, skipping empty ones: [A, C | B | D] → 1, 3, 1, 4
        const zs = zones(q), used = [...new Set(zs.filter((z) => z !== 'pool').map(Number))].sort((a, b) => a - b);
        return zs.map((z) => (z === 'pool' ? null : 1 + zs.filter((w) => w !== 'pool' && used.indexOf(Number(w)) < used.indexOf(Number(z))).length));
      }
      case 'match': {
        const zs = zones(q);
        if (!q.same) return zs.map((z) => (z === 'pool' ? null : Number(z)));
        return zs.map((z, i) => {
          const with_ = zs.map((w, j) => (w === z && j !== i ? j : -1)).filter((j) => j >= 0);
          return z === 'pool' || with_.length !== 1 ? null : partnerChoice(q, with_[0]);
        });
      }
      default: return radio(`opt-${q.key}`);
    }
  }
  function place(q, i, z) {
    const f = $q(q), card = f.querySelector(`.chip[data-i="${i}"]`);
    f.querySelector(`.zone[data-zone="${z}"] .drop`).appendChild(card);
  }
  function setState(q, s) {
    const check = (name, v) => { if (v != null) { const el = document.querySelector(`input[name="${name}"][value="${v}"]`); if (el) el.checked = true; } };
    switch (q.type) {
      case 'two': check(`pred-${q.key}`, s[0]); check(`reason-${q.key}`, s[1]); break;
      case 'tf': s.forEach((v, i) => check(`tf-${q.key}-${i}`, v == null ? null : v ? 1 : 0)); break;
      case 'rank': {
        const distinct = [...new Set(s.filter((v) => v != null))].sort((a, b) => a - b);
        s.forEach((v, i) => place(q, i, v == null ? 'pool' : distinct.indexOf(v)));
        break;
      }
      case 'match':
        if (q.same) {
          let box = 0;
          const placed = new Set();
          s.forEach((v, i) => {
            if (placed.has(i)) return;
            if (v == null) { place(q, i, 'pool'); return; }
            const p = q.items.findIndex((x) => x.name === q.choices[v].id);
            place(q, i, box); placed.add(i);
            if (p >= 0 && !placed.has(p)) { place(q, p, box); placed.add(p); }
            box++;
          });
        } else s.forEach((v, i) => place(q, i, v == null ? 'pool' : v));
        break;
      default: check(`opt-${q.key}`, s);
    }
  }

  // ---------------------------------------------------------------- checking
  // marks: [{ where: 'pred' | 'reason' | 'q' | row index, ok, fb }]
  function evaluate(q, s) {
    const marks = [], misses = [];
    const miss = (id, code) => { if (FC.MIS[code]) misses.push({ id, code }); };
    switch (q.type) {
      case 'two': {
        const [p, rsn] = s, P = p == null ? null : q.options[p], R = rsn == null ? null : q.reasons[rsn];
        if (P) { marks.push({ where: 'pred', ok: P.ok, fb: P.ok ? right() : P.why + tag(P.code) }); if (!P.ok) miss(`p${p}`, P.code); }
        if (R) { marks.push({ where: 'reason', ok: R.ok, fb: R.ok ? R.why : R.why + tag(R.code) }); if (!R.ok) miss(`r${rsn}`, R.code); }
        if (P && R && P.ok && !R.ok) marks.push({ where: 'q', ok: false, fb: T('The prediction is right, but not the reason — so the answer does not count yet.', 'Die Vorhersage stimmt, aber nicht die Begründung — deshalb zählt die Antwort noch nicht.') });
        if (P && R && !P.ok && R.ok) marks.push({ where: 'q', ok: false, fb: T('The reason is right, but it leads to a different prediction.', 'Die Begründung stimmt, führt aber zu einer anderen Vorhersage.') });
        return { complete: !!(P && R), ok: !!(P && R && P.ok && R.ok), marks, misses };
      }
      case 'tf': {
        q.items.forEach((x, i) => {
          if (s[i] == null) return;
          const ok = s[i] === x.value;
          marks.push({ where: i, ok, fb: (ok ? `${right()} ` : '') + x.why + (ok ? '' : tag(x.code)) });
          if (!ok) miss(`s${i}`, x.code);
        });
        return { complete: s.every((v) => v != null), ok: s.every((v, i) => v === q.items[i].value), marks, misses };
      }
      case 'rank': {
        const complete = s.every((v) => v != null);
        if (!complete) return { complete, ok: false, marks, misses };
        const want = FC.ranksOf(q.items.map((x) => x.value)), ok = s.every((v, i) => v === want[i]);
        q.items.forEach((x, i) => marks.push({ where: i, ok: s[i] === want[i] }));
        const trap = q.traps.find((t) => { const tr = FC.ranksOf(q.items.map((x) => x.alt[t.key])); return s.every((v, i) => v === tr[i]); });
        marks.push({ where: 'q', ok, fb: ok ? q.why : trap ? trap.why + tag(trap.code) : T('Not quite: the marked ranks are wrong. Remember that equal values get the same rank.', 'Noch nicht ganz: Die markierten Ränge stimmen nicht. Denk daran, dass gleiche Werte denselben Rang bekommen.') });
        if (trap) miss(trap.key, trap.code);
        return { complete, ok, marks, misses };
      }
      case 'match': {
        q.items.forEach((x, i) => {
          if (s[i] == null) return;
          const c = q.choices[s[i]], ok = c.id === x.answer, w = (x.wrong || {})[c.id];
          marks.push({ where: i, ok, fb: ok ? `${right()} ${x.why}` : w ? w.why + tag(w.code) : x.other });
          if (!ok && w) miss(`${i}-${c.id}`, w.code);
        });
        return { complete: s.every((v) => v != null), ok: s.every((v, i) => v != null && q.choices[v].id === q.items[i].answer), marks, misses };
      }
      default: {
        const x = s == null ? null : q.options[s];
        if (x) { marks.push({ where: 'pred', ok: x.ok, fb: x.why + (x.ok ? '' : tag(x.code)) }); if (!x.ok) miss(`o${s}`, x.code); }
        return { complete: !!x, ok: !!(x && x.ok), marks, misses };
      }
    }
  }

  // ---------------------------------------------------------------- marking
  function clearField(f) {
    f.querySelectorAll('.ok, .bad').forEach((el) => el.classList.remove('ok', 'bad'));
    f.querySelectorAll('.fb').forEach((el) => { el.innerHTML = ''; });
    f.querySelectorAll('[data-fb]').forEach((el) => { el.hidden = true; });
  }
  const clear = (q) => clearField($q(q));
  // Clears the marks of the part that contains el (after the answer there changed); moving a card
  // clears the whole question, since it can change the other answers too.
  function clearAt(el) {
    const f = el.closest('.field');
    if (f && f.classList.contains('dnd')) { clearField(f); return; }
    const part = el.closest('.row, .grp');
    if (!part) return;
    part.classList.remove('ok', 'bad');
    part.querySelectorAll('.fb').forEach((x) => { x.innerHTML = ''; x.classList.remove('ok', 'bad'); });
    const qfb = f && f.querySelector('.qfb');
    if (qfb) { qfb.innerHTML = ''; qfb.classList.remove('ok', 'bad'); }
  }
  function paint(q, ev) {
    clear(q);
    const f = $q(q);
    for (const m of ev.marks) {
      const part = m.where === 'q' ? null : typeof m.where === 'number' ? f.querySelector(`.row[data-i="${m.where}"], .chip[data-i="${m.where}"]`) : f.querySelector(`.grp[data-grp="${m.where}"]`);
      if (part) part.classList.add(m.ok ? 'ok' : 'bad');
      const li = typeof m.where === 'number' ? f.querySelector(`[data-fb="${m.where}"]`) : null;
      if (li) li.hidden = false;
      const fb = m.where === 'q' ? f.querySelector('.qfb') : li ? li.querySelector('.fb') : part && part.querySelector('.fb');
      if (fb && m.fb) { fb.innerHTML = m.fb; fb.classList.add(m.ok ? 'ok' : 'bad'); }
    }
  }

  // ---------------------------------------------------------------- drag and drop
  // Delegated on the container of the questions. A moved card fires 'change' (bubbling), like an
  // input, so the page clears the marks as for the other formats.
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
      const f = card.closest('.field'), drop = z.querySelector('.drop'), cap = Number(z.dataset.cap || 0);
      if (cap) {
        const others = [...drop.querySelectorAll('.chip')].filter((c) => c !== card);
        if (others.length >= cap) f.querySelector('.zone.pool .drop').appendChild(others[0]); // a full pair box: the oldest goes back
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

  root.Questions = { html, state, setState, evaluate, clear, clearAt, paint, tag, attach };
})(window);
