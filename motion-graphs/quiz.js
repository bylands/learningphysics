// Answering the exercises of concepts.js in practice: the questions as HTML (options to choose,
// several to tick, or a number field), reading and restoring the answers, checking them and
// marking them with the explanation of the mistake (see concepts.js for the question formats).
(function (root) {
  'use strict';

  const L = (en, de) => root.Lang.L(en, de);
  const $q = (q) => document.querySelector(`.qblock[data-key="${q.key}"]`);
  const TOL = (v) => 0.05 + 0.01 * Math.abs(v);

  function html(q, k) {
    const head = `<p class="qprompt"><span class="qn">${k + 1}</span>${q.prompt}</p>`;
    if (q.type === 'num') {
      return `<div class="qblock" data-key="${q.key}">${head}<div class="fields"><div class="field">` +
        `<label class="sym" for="q-${q.key}">${q.sym} =</label><input id="q-${q.key}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" spellcheck="false">` +
        `<span class="unit">${q.unit}</span><span class="fb"></span></div></div></div>`;
    }
    const type = q.type === 'multi' ? 'checkbox' : 'radio';
    return `<div class="qblock" data-key="${q.key}">${head}<div class="qopts${q.pics ? ' pics' : ''}" role="${type === 'radio' ? 'radiogroup' : 'group'}">` +
      q.options.map((o, i) => `<label class="qopt"><input type="${type}" name="q-${q.key}" value="${i}"><span class="qval">${o.html}</span></label>`).join('') +
      '</div><p class="qfb"></p></div>';
  }

  // the answer as it stands: an option index (choice), a list of them (multi) or the text (num)
  function state(q) {
    const box = $q(q);
    if (q.type === 'num') return box.querySelector('input').value;
    const on = [...box.querySelectorAll('input:checked')].map((i) => Number(i.value));
    return q.type === 'multi' ? on : (on.length ? on[0] : null);
  }
  function setState(q, v) {
    const box = $q(q);
    if (q.type === 'num') { box.querySelector('input').value = v || ''; return; }
    const on = q.type === 'multi' ? v || [] : v == null ? [] : [v];
    box.querySelectorAll('input').forEach((i) => { i.checked = on.includes(Number(i.value)); });
  }

  const parse = (s) => Number(String(s).trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-').replace(/\s+/g, '').replace(/[a-z/²]+$/i, ''));

  // { complete, ok, flags: [misconceptions], why: [explanations] }
  // while the exercise is open, a wrong answer gets nudge (if given) instead of why: no answer in it;
  // an option or a trap may bring its own nudge
  const NUDGE = () => L('Not right yet: check your reasoning, or take a hint.', 'Noch nicht richtig: Überprüfe deine Überlegung, oder nimm einen Hinweis.');
  function evaluate(q, v) {
    if (q.type === 'num') {
      if (String(v).trim() === '') return { complete: false, ok: false, flags: [], why: [] };
      const x = parse(v);
      if (!Number.isFinite(x)) return { complete: true, ok: false, flags: [], why: [L('Enter a number.', 'Gib eine Zahl ein.')] };
      if (Math.abs(x - q.value) <= TOL(q.value)) return { complete: true, ok: true, flags: [], why: [] };
      const t = q.traps.find((tr) => Math.abs(x - tr.value) <= TOL(tr.value));
      return { complete: true, ok: false, flags: t && t.flag ? [t.flag] : [], why: [t ? t.why : q.why], nudge: [t ? t.nudge || t.why : NUDGE()] };
    }
    if (q.type === 'choice') {
      if (v == null) return { complete: false, ok: false, flags: [], why: [] };
      const o = q.options[v];
      return { complete: true, ok: o.correct, flags: !o.correct && o.flag ? [o.flag] : [], why: o.correct ? [] : [o.why], nudge: o.correct ? [] : [o.nudge || o.why] };
    }
    if (!v.length) return { complete: false, ok: false, flags: [], why: [] };
    const wrong = q.options.filter((o, i) => v.includes(i) && !o.correct);
    const missed = q.options.filter((o, i) => !v.includes(i) && o.correct);
    return {
      complete: true,
      ok: !wrong.length && !missed.length,
      flags: [...wrong, ...missed].map((o) => o.flag).filter(Boolean),
      why: [...wrong.map((o) => o.why), ...missed.map((o) => L(`Missing: ${o.html}. `, `Es fehlt: ${o.html}. `) + o.why)],
      nudge: [...wrong.map((o) => o.nudge || o.why), ...(missed.length ? [L('Not all the right answers are chosen yet.', 'Noch sind nicht alle richtigen Antworten gewählt.')] : [])],
    };
  }

  // Marks a question as checked (ev from evaluate), or clears the marks (ev null); open: the
  // exercise is not solved or revealed yet, so the feedback must not give the answer away.
  function paint(q, ev, v, open) {
    const why = ev && (open && ev.nudge ? ev.nudge : ev.why);
    const box = $q(q);
    box.classList.toggle('ok', !!ev && ev.complete && ev.ok);
    box.classList.toggle('bad', !!ev && ev.complete && !ev.ok);
    if (q.type === 'num') {
      const f = box.querySelector('.field');
      f.className = `field${ev && ev.complete ? (ev.ok ? ' ok' : ' bad') : ''}`;
      f.querySelector('.fb').innerHTML = ev && ev.complete ? (ev.ok ? L('right', 'richtig') : why.join(' ')) : '';
      return;
    }
    box.querySelectorAll('.qopt').forEach((lab, i) => {
      const chosen = q.type === 'multi' ? (v || []).includes(i) : v === i;
      lab.classList.toggle('right', !!ev && ev.complete && chosen && q.options[i].correct);
      lab.classList.toggle('wrong', !!ev && ev.complete && chosen && !q.options[i].correct);
    });
    const fb = box.querySelector('.qfb');
    fb.className = `qfb${ev && ev.complete ? (ev.ok ? ' ok' : ' bad') : ''}`;
    fb.innerHTML = ev && ev.complete ? (ev.ok ? L('Right.', 'Richtig.') : why.join(' ')) : '';
  }

  root.Quiz = { html, state, setState, evaluate, paint };
})(window);
