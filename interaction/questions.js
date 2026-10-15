// The question formats in the page: how each type is drawn, read, checked and marked.
//   choice  one option (radio buttons)          two   a prediction and a reason
//   tf      true/false for each statement        rank  items dragged into boxes, largest first;
//   match   items dragged onto the choices             equal ones share a box
//           (or, for partners, into pairs)
// The dragging, by mouse, pen, touch or keyboard, is the shared widget dnd.js (Dnd); this file
// draws the question around it and checks it. Rankings are read as ranks (1, 2, 2, 4), matchings
// as the index of the chosen choice, as before.
// state(q) reads the answer from the page, evaluate(q, state) checks it: { complete, ok, marks,
// misses } — marks say what to colour and explain where, misses the misconceptions behind wrong
// parts ({ id, code }, id unique within the question).
(function (root) {
  'use strict';

  const FC = root.FC, T = FC.T, Dnd = root.Dnd;
  const LETTERS = 'ABCDEF';
  const $q = (q) => document.querySelector(`.field[data-key="${q.key}"]`);
  const tag = (code) => (FC.MIS[code] ? ` <span class="tag" title="${T('Wrong idea', 'Falsche Vorstellung')}: ${FC.mis(code).text}">${FC.misLabel(code)}</span>` : '');
  const right = () => T('Right.', 'Richtig.');

  // ---------------------------------------------------------------- drawing
  const optionsHtml = (opts, name, pics, ro) => `
    <div class="opts ${pics ? 'pics' : 'list'}" role="radiogroup">${opts.map((x, i) => `
      <label><input type="radio" name="${name}" value="${i}"${ro ? ' disabled' : ''}><span><b class="letter">${LETTERS[i]}</b>${pics ? `<span class="pic">${x.label}</span>` : `<span>${x.label}</span>`}</span></label>`).join('')}
    </div>`;
  const labels = (q) => q.items.map((x) => x.label);
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
          ${Dnd.html({ kind: 'rank', items: labels(q), ro })}
          <p class="fb qfb"></p></div>`;
      case 'match':
        if (q.same) {
          return `<div class="field match dnd${ro ? ' ro' : ''}" data-key="${q.key}">${head}
            ${Dnd.html({ kind: 'pairs', items: labels(q), ro, note: T('Drag the forces into pairs: each box takes one force and its partner.', 'Ziehe die Kräfte paarweise in die Felder: In jedes Feld kommt eine Kraft mit ihrer Gegenkraft.') })}
            ${itemFb(q)}</div>`;
        }
        return `<div class="field match dnd${ro ? ' ro' : ''}" data-key="${q.key}">${head}
          ${Dnd.html({ kind: 'match', items: labels(q), ro, pics: q.pics, heads: q.choices.map((c) => (q.pics ? `<b class="letter">${c.name}</b><span class="pic">${c.label}</span>` : `<span>${c.label}</span>`)) })}
          ${itemFb(q)}</div>`;
      default:
        return `<div class="field choice" data-key="${q.key}">${head}<div class="grp" data-grp="pred">${optionsHtml(q.options, `opt-${q.key}`, q.pics, ro)}<p class="fb"></p></div></div>`;
    }
  }

  // ---------------------------------------------------------------- reading and setting answers
  const radio = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? Number(el.value) : null; };
  const partnerChoice = (q, p) => q.choices.findIndex((c) => c.id === q.items[p].name);
  function state(q) {
    switch (q.type) {
      case 'two': return [radio(`pred-${q.key}`), radio(`reason-${q.key}`)];
      case 'tf': return q.items.map((x, i) => { const v = radio(`tf-${q.key}-${i}`); return v == null ? null : v === 1; });
      case 'rank': return Dnd.ranks($q(q));
      case 'match':
        // pairs: the choice of each item is its partner, the one other item in its box
        if (q.same) return Dnd.partners($q(q)).map((p) => (p == null ? null : partnerChoice(q, p)));
        return Dnd.choices($q(q));
      default: return radio(`opt-${q.key}`);
    }
  }
  function setState(q, s) {
    const check = (name, v) => { if (v != null) { const el = document.querySelector(`input[name="${name}"][value="${v}"]`); if (el) el.checked = true; } };
    switch (q.type) {
      case 'two': check(`pred-${q.key}`, s[0]); check(`reason-${q.key}`, s[1]); break;
      case 'tf': s.forEach((v, i) => check(`tf-${q.key}-${i}`, v == null ? null : v ? 1 : 0)); break;
      case 'rank': Dnd.setRanks($q(q), s); break;
      case 'match':
        if (q.same) Dnd.setPartners($q(q), s.map((v) => (v == null ? null : q.items.findIndex((x) => x.name === q.choices[v].id))));
        else Dnd.setChoices($q(q), s);
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

  root.Questions = { html, state, setState, evaluate, clear, clearAt, paint, tag };
})(window);
