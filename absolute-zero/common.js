// Absolute Zero: what the teacher's screen (app.js) and the phones (play/play.js) share: texts,
// escaping, the question in its lozenge, and the calls to the game's rooms on the server (the admin
// panel's service, /admin/api/absolute-zero/, see hub-admin/hubadmin.py).
(function (root) {
  'use strict';

  const Lang = root.Lang;
  const L = (en, de) => Lang.L(en, de);
  const tr = (t) => (t && typeof t === 'object' ? t[Lang.get()] || t.en : t);
  const { TOPICS, QUESTIONS } = root.ABSOLUTE_ZERO;
  const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // the server: { ok, status, data }; a network failure is status 0
  async function api(path, body) {
    try {
      const r = await fetch(`/admin/api/absolute-zero/${path}`, body === undefined ? { cache: 'no-store', credentials: 'same-origin' }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      let data = null;
      try { data = await r.json(); } catch (e) { /* not JSON */ }
      return { ok: r.ok, status: r.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: null };
    }
  }

  const storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ } },
  };

  // the question in a lozenge, as on the game show
  function questionBox(q) {
    return `<div class="question-wrap"><div class="lozenge question"><span>${esc(tr(q.q))}</span></div></div>`;
  }

  // 1 → 1st / 1., 2 → 2nd / 2.
  const place = (n) => L(n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'), `${n}.`);

  const RULES = () => L('Everyone types one answer. You score the share of the class who gave the same answer: an answer nobody else thought of scores 0, absolute zero. A wrong answer, or none, scores 100. The lowest total wins.',
    'Alle tippen eine Antwort. Man erhält den Anteil der Klasse, der dieselbe Antwort gab: eine Antwort, auf die sonst niemand kam, gibt 0 Punkte, den absoluten Nullpunkt. Eine falsche oder keine Antwort gibt 100. Die tiefste Summe gewinnt.');

  root.AbsoluteZero = { L, tr, TOPICS, QUESTIONS, byId, esc, api, storage, questionBox, place, RULES };
})(typeof window !== 'undefined' ? window : globalThis);
