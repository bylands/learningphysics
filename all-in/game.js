// All In, the Physics Casino: the rules, without the page. Teams bet chips on each round; a
// Predict round pays back (number of options) × the chips on the right option, an Estimate round
// pays by how narrow the interval is (if it holds the true value), a Calculate round pays 2 × the
// stake within ±5 % and +10 to the first correct team. Insurance (once per game) gives half the
// stake back when a bet loses; in the final round (All in) the stake is at least half the chips; a
// team below 10 chips is topped up to 20 after the round. app.js draws the page,
// test/check-game.js tests this file.
(function (root) {
  'use strict';

  const START = 100, MIN_STAKE = 10, TOP_UP_BELOW = 10, TOP_UP_TO = 20, FIRST_BONUS = 10;
  const HOT = { good: 15, partial: 5, none: 0 };
  // Estimate: [largest ratio high : low, pays back × stake]; wider pays back the stake only
  const ESTIMATE_PAY = [[3, 4], [10, 2.5], [100, 1.5]];

  // a number as people type it: 4.5e22, 4,5·10^22, 4.5 × 10^22, 1'200, 230 kg
  function parseNum(s) {
    if (typeof s === 'number') return Number.isFinite(s) ? s : NaN;
    if (typeof s !== 'string') return NaN;
    let t = s.trim().replace(/[\s'’]/g, '').replace(/,/g, '.').replace(/[a-df-zA-DF-Z°%]+$/, '');
    const m = t.match(/^([-+]?\d*\.?\d+)(?:[·*×x]10\^?([-+]?\d+))$/);
    if (m) return Number(m[1]) * Math.pow(10, Number(m[2]));
    t = t.replace(/^10\^([-+]?\d+)$/, '1e$1');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
    return Number(t);
  }

  const isInt = (n) => Number.isInteger(n) && n >= 0;

  function minStake(chips, final) {
    const min = final ? Math.max(MIN_STAKE, Math.ceil(chips / 2)) : MIN_STAKE;
    return Math.min(min, chips);
  }

  // the chips a bet puts at stake
  function stakeOf(round, bet) {
    if (!bet) return 0;
    if (round.type === 'predict') return (bet.chips || []).reduce((a, b) => a + (Number(b) || 0), 0);
    return Number(bet.stake) || 0;
  }

  // null if the bet is valid, else the reason: 'stake-int', 'stake-min', 'stake-max', 'bounds',
  // 'value'
  function checkBet(round, bet, chips, final) {
    if (!bet) return 'stake-min';
    if (round.type === 'predict') {
      const c = bet.chips || [];
      if (c.length !== round.options.length || !c.every(isInt)) return 'stake-int';
    } else if (!isInt(bet.stake)) return 'stake-int';
    const stake = stakeOf(round, bet);
    if (stake < minStake(chips, final)) return 'stake-min';
    if (stake > chips) return 'stake-max';
    if (round.type === 'estimate' && !(bet.low > 0 && bet.high >= bet.low)) return 'bounds';
    if (round.type === 'calculate' && !Number.isFinite(bet.value)) return 'value';
    return null;
  }

  // what pays an Estimate interval (ratio high : low), if it holds the answer
  function estimateFactor(low, high) {
    const ratio = high / low;
    for (const [max, f] of ESTIMATE_PAY) if (ratio <= max * (1 + 1e-9)) return f;
    return 1;
  }

  function isCorrect(round, bet, answer) {
    if (round.type === 'predict') return (bet.chips[answer] || 0) > 0;
    if (round.type === 'estimate') return bet.low <= answer * (1 + 1e-9) && answer <= bet.high * (1 + 1e-9);
    return Math.abs(bet.value - answer) <= (round.tolerance || 0.05) * Math.abs(answer);
  }

  // the result of one team's bet: { stake, back, net, correct, insured }; answer is the option's
  // index (Predict) or the true value; first: this team was the first correct one (Calculate)
  function settle(round, bet, answer, opts) {
    const o = opts || {};
    const stake = stakeOf(round, bet);
    const correct = isCorrect(round, bet, answer);
    let back = 0;
    if (round.type === 'predict') back = round.options.length * (bet.chips[answer] || 0);
    else if (correct && round.type === 'estimate') back = Math.round(estimateFactor(bet.low, bet.high) * stake);
    else if (correct) back = 2 * stake + (o.first ? FIRST_BONUS : 0);
    const insured = !!bet.insurance && !correct;
    if (insured) back += Math.floor(stake / 2);
    return { stake, back, net: back - stake, correct, insured };
  }

  const topUp = (chips) => (chips < TOP_UP_BELOW ? TOP_UP_TO : chips);

  // the team in the hot seat in round i (0-based), and the member the die picks (1 … size)
  const hotTeam = (i, teams) => i % teams;
  const roll = (size, rnd) => 1 + Math.floor((rnd || Math.random)() * size);

  // the ranking: indices of the teams, most chips first (ties keep the team order)
  const ranking = (teams) => teams.map((t, i) => i).sort((a, b) => teams[b].chips - teams[a].chips || a - b);

  const Game = { START, MIN_STAKE, TOP_UP_BELOW, TOP_UP_TO, FIRST_BONUS, HOT, ESTIMATE_PAY,
    parseNum, minStake, stakeOf, checkBet, estimateFactor, isCorrect, settle, topUp, hotTeam, roll, ranking };
  root.AllInGame = Game;
  if (typeof module !== 'undefined') module.exports = Game;
})(typeof window !== 'undefined' ? window : globalThis);
