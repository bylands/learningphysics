// All In in the preview (preview.js, /all-in/?preview): the simulated players. In the lobby two or
// three bots join every team; while betting, one bot of each team without a real player (the
// teacher's phone) places the team's bet after a while, sometimes changed by a teammate later.
// Each bot knows the answer of a Predict round with its own skill, aims an Estimate with a spread
// that shrinks with skill, and gets a Calculate right or misses by a typical slip (a power of ten,
// a factor 2). The bots use the calls a phone makes (common.js api), so the room and the teacher's
// screen work exactly as in class. Their tokens are kept with the game (S.bots).
(function () {
  'use strict';

  const P = window.Preview, G = window.AllInGame, A = window.AllIn;
  let key = '';

  const sig = (x, n) => +x.toPrecision(n || 2);

  // the bots of a new game: 2 or 3 per team, each with a skill (the chance to know an answer)
  function create(teams) {
    const sizes = Array.from({ length: teams }, () => (P.chance(0.5) ? 2 : 3));
    const names = P.names(sizes.reduce((a, b) => a + b, 0));
    const bots = [];
    sizes.forEach((n, t) => { for (let k = 0; k < n; k++) bots.push({ name: names[bots.length], team: t, skill: sig(P.rand(0.35, 0.85)), token: null }); });
    return bots;
  }

  async function join(S, bot, keep) {
    const r = await A.api(`${S.code}/join`, { name: bot.name, team: bot.team, token: bot.token });
    if (r.ok) { bot.token = r.data.token; keep(); }
  }

  // the teams with a real player: their bets are the player's
  const human = (S) => new Set((S.players || []).filter((p) => !P.isBot(p.name)).map((p) => p.team));

  // a bet of a team whose bots have the given skill
  function betFor(round, answer, chips, final, skill, insurance) {
    const min = G.minStake(chips, final);
    let stake = Math.max(min, Math.min(chips, 5 * Math.round((chips * P.rand(0.15, 0.45)) / 5)));
    if (final) stake = Math.max(min, Math.min(chips, Math.round(chips * P.rand(0.5, 1))));
    const bet = { insurance: insurance && P.chance(0.2) };
    if (round.type === 'predict') {
      const n = round.options.length;
      const others = Array.from({ length: n }, (_, k) => k).filter((k) => k !== answer);
      const fav = P.chance(skill) ? answer : P.pick(others);
      bet.chips = Array(n).fill(0);
      if (P.chance(0.6) || stake < 10) bet.chips[fav] = stake;
      else {
        const main = Math.round(stake * P.rand(0.6, 0.8));
        bet.chips[fav] = main;
        bet.chips[P.pick(Array.from({ length: n }, (_, k) => k).filter((k) => k !== fav))] = stake - main;
      }
    } else if (round.type === 'estimate') {
      // the centre off by a factor that is smaller with more skill; the interval wide or narrow
      const centre = answer * Math.exp(P.normal() * Math.log(3) * (1.5 - skill));
      const ratio = P.pick([2.5, 8, 40], [0.35, 0.45, 0.2]);
      bet.low = sig(centre / Math.sqrt(ratio));
      bet.high = sig(Math.max(bet.low, centre * Math.sqrt(ratio)));
      bet.stake = stake;
    } else {
      bet.value = sig(P.chance(skill) ? answer * (1 + P.normal() * 0.015) : answer * P.pick([10, 0.1, 2, 0.5, 1.4, 0.7, 1000]), 3);
      bet.stake = stake;
    }
    return G.checkBet(round, bet, chips, final) ? null : bet;
  }

  // what the bots do in this phase; the teacher's screen calls it after every render, with keep()
  // to store the game
  function sync(S, keep) {
    const k = S ? [S.code, S.phase, S.i].join('|') : '';
    if (k === key) return;
    key = k;
    P.cancel();
    if (!S || !S.code) return;
    if (!S.bots) S.bots = create(S.teams.length);
    // join (again, after a restart of the server): one by one in the lobby, at once later
    const missing = S.bots.filter((b) => !b.token || !(S.players || []).some((p) => p.name === b.name));
    missing.forEach((b, n) => P.later(S.phase === 'lobby' ? 600 + n * P.rand(250, 900) : 0, () => join(S, b, keep)));
    if (S.phase !== 'bet') return;
    const left = Math.max(5000, (S.timerEnd || Date.now() + S.seconds * 1000) - Date.now());
    S.teams.forEach((team, t) => {
      const mine = S.bots.filter((b) => b.team === t);
      if (!mine.length) return;
      const skill = mine.reduce((a, b) => a + b.skill, 0) / mine.length;
      const place = (bot) => {
        if (human(S).has(t) || key !== k) return;
        const r = window.AllIn.byId[S.rounds[S.i]];
        const bet = betFor(r, S.answer, S.teams[t].chips, S.i === S.rounds.length - 1, skill, !S.teams[t].insuranceUsed);
        if (bet && bot.token) A.api(`${S.code}/bet`, { token: bot.token, i: S.i, bet });
      };
      P.later(left * P.rand(0.1, 0.6), () => place(P.pick(mine)));
      if (P.chance(0.3)) P.later(left * P.rand(0.65, 0.85), () => place(P.pick(mine)));
    });
  }

  window.AllInBots = P.on ? { sync } : null;
})();
