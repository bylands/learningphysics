// Absolute Zero in the preview (preview.js, /absolute-zero/?preview): the simulated players. In the
// lobby a dozen bots join; while the time runs, each types an answer after a while, as a class
// would: mostly the common answers of the list (the first ones), now and then a rare one, a typo,
// an answer the list does not have (for the teacher to judge) or none. The bots use the calls a
// phone makes (common.js api), so the room and the teacher's screen work exactly as in class.
// Their tokens are kept with the game (S.bots).
(function () {
  'use strict';

  const P = window.Preview, G = window.AbsoluteZeroGame, Z = window.AbsoluteZero;
  const COUNT = 12;
  let key = '';

  async function join(S, bot, keep) {
    const r = await Z.api(`${S.code}/join`, { name: bot.name, token: bot.token });
    if (r.ok) { bot.token = r.data.token; keep(); }
  }

  // two neighbouring letters swapped: "Kilometre" → "Kilomtere"
  function typo(s) {
    const k = 2 + Math.floor(Math.random() * (s.length - 3));
    return s.slice(0, k) + s[k + 1] + s[k] + s.slice(k + 2);
  }

  // a bot's answer to q, or '' for none
  function answerTo(q, lang) {
    const roll = Math.random();
    if (roll < 0.04) return '';
    if (roll < 0.1) {
      // an answer to another question: not on this list, so the teacher judges it
      for (let n = 0; n < 20; n++) {
        const other = P.pick(Z.QUESTIONS);
        const a = P.pick(G.answers(other));
        const text = lang === 'de' ? a.de : a.name;
        if (other !== q && G.match(q, text) < 0) return text;
      }
      return '';
    }
    const list = G.answers(q);
    const common = list.filter((a) => !a.rare), rare = list.filter((a) => a.rare);
    // the earlier an answer on the list, the more students think of it
    const a = rare.length && Math.random() < 0.12 ? P.pick(rare) : P.pick(common, common.map((_, k) => 1 / Math.pow(k + 1, 1.1)));
    let text = lang === 'de' ? a.de : a.name;
    if (a.spellings.length > 1 && P.chance(0.2)) text = P.pick(a.spellings);
    if (text.length >= 6 && P.chance(0.08)) text = typo(text);
    return text;
  }

  // what the bots do in this phase; the teacher's screen calls it after every render, with keep()
  // to store the game
  function sync(S, keep) {
    const k = S ? [S.code, S.phase, S.i].join('|') : '';
    if (k === key) return;
    key = k;
    P.cancel();
    if (!S || !S.code) return;
    if (!S.bots) S.bots = P.names(COUNT).map((name) => ({ name, token: null }));
    // join (again, after a restart of the server): one by one in the lobby, at once later
    const missing = S.bots.filter((b) => !b.token || !(S.players || []).some((p) => p.name === b.name));
    missing.forEach((b, n) => P.later(S.phase === 'lobby' ? 600 + n * P.rand(200, 700) : 0, () => join(S, b, keep)));
    if (S.phase !== 'answer') return;
    const left = Math.max(4000, (S.timerEnd || Date.now()) - Date.now());
    const q = Z.byId[S.qids[S.i]], lang = window.Lang.get();
    const send = (bot) => {
      const text = answerTo(q, lang);
      if (text && bot.token && key === k) Z.api(`${S.code}/answer`, { token: bot.token, i: S.i, text });
    };
    S.bots.forEach((bot) => {
      P.later(left * P.rand(0.15, 0.85), () => send(bot));
      if (P.chance(0.1)) P.later(left * P.rand(0.85, 0.95), () => send(bot)); // a change of mind
    });
  }

  window.AbsoluteZeroBots = P.on ? { sync } : null;
})();
