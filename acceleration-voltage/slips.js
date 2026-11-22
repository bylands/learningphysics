// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// "Your typical slips" in practice: how often each typical wrong idea was behind one of the
// student's wrong answers, and what is correct instead (as in Force Concepts and Interaction,
// which have their own). The app says which wrong answers come from which idea; the browser keeps
// { idea: count } under `${app}-slips`. A button next to "New exercise" (class practice, so it is
// shown in practice only) opens the list, with a badge for the number of slips.
//   const slips = Slips.create({
//     app,              the storage prefix
//     concept,          { flag: idea } for the flags that count (as for the check, check-src.js)
//     ideas(),          { idea: what the wrong idea is } in the current language
//     fixes(),          { idea: what is correct instead } in the current language
//   })
//   slips.mount()       the button (after #new) and the dialog; call once at start
//   slips.note(flag, exId)  a wrong answer of this idea in exercise exId: counted once per
//                       exercise and idea
//   slips.relabel()     the texts in the current language
(function (root) {
  'use strict';

  const TX = {
    en: { title: 'Your typical slips', correct: 'Correct:', reset: 'Reset', close: 'Close',
      empty: 'Nothing recorded yet. Wrong answers that stem from a typical wrong idea will show up here.',
      note: 'How often each typical wrong idea was behind one of your wrong answers, and what is correct instead.' },
    de: { title: 'Deine typischen Fehler', correct: 'Richtig:', reset: 'Zurücksetzen', close: 'Schliessen',
      empty: 'Noch nichts erfasst. Falsche Antworten, hinter denen eine typische Fehlvorstellung steckt, erscheinen hier.',
      note: 'Wie oft jede typische Fehlvorstellung hinter einer deiner falschen Antworten steckte, und was stattdessen richtig ist.' },
  };
  const tx = () => TX[root.Lang && root.Lang.get() === 'de' ? 'de' : 'en'];
  const $ = (sel) => document.querySelector(sel);

  function create(o) {
    const key = `${o.app}-slips`;
    const read = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } };
    const write = (v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
    const counted = new Set();

    function render() {
      if (!$('#slips-btn')) return;
      const t = tx(), ideas = o.ideas(), fixes = o.fixes();
      const rows = Object.entries(read()).filter(([idea]) => ideas[idea]).sort((a, b) => b[1] - a[1]);
      const n = rows.reduce((s, [, k]) => s + k, 0);
      $('#slips-label').textContent = t.title;
      $('#slips-badge').textContent = n;
      $('#slips-badge').hidden = !n;
      $('#slips-title').textContent = t.title;
      $('#slips-close').setAttribute('aria-label', t.close);
      $('#slips-reset').textContent = t.reset;
      $('#slips-empty').textContent = t.empty;
      $('#slips-empty').hidden = rows.length > 0;
      $('#slips-note').textContent = t.note;
      $('#slips-note').hidden = !rows.length;
      $('#slips-list').innerHTML = rows.map(([idea, k]) => `<li><span class="count">${k}×</span> <b>${ideas[idea]}</b>` +
        (fixes[idea] ? `<span class="fix"><b>${t.correct}</b> ${fixes[idea]}</span>` : '') + '</li>').join('');
    }

    function mount() {
      const anchor = $('#new');
      if (!anchor || $('#slips-btn')) return;
      anchor.insertAdjacentHTML('afterend', '<button id="slips-btn" type="button" class="practice" aria-haspopup="dialog" aria-controls="slips" hidden>' +
        '<span id="slips-label"></span><span id="slips-badge" class="slips-badge" hidden></span></button>');
      document.body.insertAdjacentHTML('beforeend', '<dialog id="slips" class="card" aria-labelledby="slips-title"><div class="slips-head"><h3 id="slips-title"></h3>' +
        '<button type="button" id="slips-close" class="close">×</button></div><p id="slips-empty" class="note"></p><p id="slips-note" class="note"></p>' +
        '<ul id="slips-list"></ul><div class="actions"><button type="button" id="slips-reset"></button></div></dialog>');
      const dlg = $('#slips');
      $('#slips-btn').addEventListener('click', () => { render(); dlg.showModal(); });
      $('#slips-close').addEventListener('click', () => dlg.close());
      $('#slips-reset').addEventListener('click', () => { write({}); render(); });
      // closes with ×, Escape or a click on the backdrop
      dlg.addEventListener('click', (evt) => {
        if (evt.target !== dlg) return;
        const r = dlg.getBoundingClientRect();
        if (evt.clientX < r.left || evt.clientX > r.right || evt.clientY < r.top || evt.clientY > r.bottom) dlg.close();
      });
      render();
    }

    function note(flag, exId) {
      const idea = o.concept[flag];
      if (!idea || counted.has(`${exId}|${idea}`)) return;
      counted.add(`${exId}|${idea}`);
      const tally = read();
      tally[idea] = (tally[idea] || 0) + 1;
      write(tally);
      render();
    }

    return { mount, note, relabel: render };
  }

  root.Slips = { create };
  if (typeof module !== 'undefined') module.exports = root.Slips;
})(typeof window !== 'undefined' ? window : globalThis);
