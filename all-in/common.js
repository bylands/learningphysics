// All In: what the teacher's screen (app.js) and the phones (play/play.js) share: the texts of the
// round types and rules, number formats, escaping, and the calls to the game's rooms on the server
// (the admin panel's service, /admin/api/all-in/, see hub-admin/hubadmin.py).
(function (root) {
  'use strict';

  const Lang = root.Lang;
  const L = (en, de) => Lang.L(en, de);
  const tr = (t) => (t && typeof t === 'object' ? t[Lang.get()] || t.en : t);
  const ROUNDS = root.ALL_IN_ROUNDS;
  const byId = Object.fromEntries(ROUNDS.map((r) => [r.id, r]));
  const LETTERS = 'ABCD';

  const TYPE = {
    predict: () => L('Predict', 'Vorhersage'),
    estimate: () => L('Estimate', 'Schätzung'),
    calculate: () => L('Calculate', 'Rechnung'),
  };
  const RULE = {
    predict: (n) => L(`Put chips on one or more answers: the right one pays back ${n} × its chips.`,
      `Chips auf eine oder mehrere Antworten setzen: die richtige zahlt ${n} × ihre Chips zurück.`),
    estimate: () => L('Give a low and a high bound and a stake. If the true value lies inside: ratio high : low up to 3 pays back 4 × the stake, up to 10 pays 2.5 ×, up to 100 pays 1.5 ×, wider just the stake.',
      'Untere und obere Grenze und einen Einsatz angeben. Liegt der wahre Wert dazwischen: Verhältnis oben : unten bis 3 zahlt 4 × den Einsatz zurück, bis 10 zahlt 2.5 ×, bis 100 zahlt 1.5 ×, breiter nur den Einsatz.'),
    calculate: () => L('Give a number and a stake. Within ±5 % pays back 2 × the stake; the first correct team gets +10.',
      'Eine Zahl und einen Einsatz angeben. Innerhalb ±5 % zahlt 2 × den Einsatz zurück; das erste richtige Team erhält +10.'),
  };
  const ERR = {
    'stake-int': () => L('whole chips only', 'nur ganze Chips'),
    'stake-min': (min) => L(`at least ${min} chips`, `mindestens ${min} Chips`),
    'stake-max': () => L('more than the team has', 'mehr, als das Team hat'),
    bounds: () => L('low > 0 and high ≥ low', 'unten > 0 und oben ≥ unten'),
    value: () => L('a number', 'eine Zahl'),
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 4.5e22 → 4.5·10²², 3820 → 3820, 0.5 → 0.5
  function fmt(x) {
    if (!Number.isFinite(x)) return '–';
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) {
      const e = Math.floor(Math.log10(a)), m = +(x / Math.pow(10, e)).toPrecision(3);
      const sup = String(e).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
      return `${m}·10${sup}`;
    }
    return String(+x.toPrecision(4));
  }
  const withUnit = (x, unit) => (unit ? `${fmt(x)} ${unit}` : fmt(x));

  // a bet in words: "20 on B", "150 … 400", "441 W"
  function describe(round, bet) {
    if (!bet) return '';
    if (round.type === 'predict') return (bet.chips || []).map((c, k) => (c ? `${c} ${L('on', 'auf')} ${LETTERS[k]}` : '')).filter(Boolean).join(', ');
    if (round.type === 'estimate') return `${fmt(bet.low)} … ${fmt(bet.high)}${round.unit ? ' ' + round.unit : ''}`;
    return withUnit(bet.value, round.unit);
  }

  // the server: { ok, status, data }; a network failure is status 0
  async function api(path, body) {
    try {
      const r = await fetch(`/admin/api/all-in/${path}`, body === undefined ? { cache: 'no-store', credentials: 'same-origin' }
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

  // the question and, in a Predict round, its answers: lozenges as on the game show; with the
  // answer known, the right one lights up green and the others fade
  function questionBox(round) {
    const unit = round.unit && round.type !== 'predict' ? ` <span class="muted">(${L('in', 'in')} ${esc(round.unit)})</span>` : '';
    return `<div class="question-wrap"><div class="lozenge question"><span>${esc(tr(round.question))}${unit}</span></div></div>`;
  }
  function optionsBox(round, answer) {
    if (round.type !== 'predict') return '';
    return `<div class="options">${round.options.map((o, k) => `<div class="lozenge option${answer == null ? '' : k === answer ? ' right' : ' wrong'}">
      <span><span class="letter">${LETTERS[k]}</span><span>${esc(tr(o))}</span></span></div>`).join('')}</div>`;
  }

  // a canvas with the round's animation; returns the animation (stop() before replacing it)
  function animate(canvas, id, mode) {
    return canvas && root.AllInAnim ? root.AllInAnim.mount(canvas, id, mode) : { stop() {}, replay() {} };
  }

  root.AllIn = { L, tr, byId, ROUNDS, TOPICS: root.ALL_IN_TOPICS, LETTERS, TYPE, RULE, ERR, esc, fmt, withUnit, describe, questionBox, optionsBox, api, storage, animate };
})(typeof window !== 'undefined' ? window : globalThis);
