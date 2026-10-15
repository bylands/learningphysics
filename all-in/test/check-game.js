// Verifies the rules of All In and its rounds: run with `node all-in/test/check-game.js`.
// It checks
// - the payouts of every round type as the rules state them (Predict: options × the chips on the
//   right one; Estimate: 4, 2.5, 1.5 or 1 × the stake by the ratio high : low; Calculate: 2 × within
//   ±5 %, +10 for the first correct team), insurance, the minimum stake and the final round,
// - that hedging evenly in a Predict round breaks even,
// - that numbers are read as people type them,
// - that every round is complete in both languages and has its animation (anim.js), and that the worked answers agree with the
//   physics written out here independently.
'use strict';

const G = require('../game.js');
const { ROUNDS, TOPICS } = require('../rounds.js');
require('../anim.js');

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 30) console.log('  FAIL ' + msg); };
const eq = (a, b, msg) => { checked++; if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
const close = (a, b, tol, msg) => { checked++; if (!(Math.abs(a - b) <= tol * Math.abs(b))) fail(`${msg}: ${a} vs ${b}`); };

// ---------------------------------------------------------------- payouts
const predict = { type: 'predict', options: ['a', 'b', 'c'] };
const estimate = { type: 'estimate' };
const calculate = { type: 'calculate' };

eq(G.settle(predict, { chips: [0, 30, 0] }, 1), { stake: 30, back: 90, net: 60, correct: true, insured: false }, 'all on the right option');
eq(G.settle(predict, { chips: [30, 0, 0] }, 1), { stake: 30, back: 0, net: -30, correct: false, insured: false }, 'all on a wrong option');
eq(G.settle(predict, { chips: [20, 20, 20] }, 2).net, 0, 'even hedge breaks even');
eq(G.settle(predict, { chips: [10, 20, 0] }, 1).net, 30, 'spread bet');
eq(G.settle(predict, { chips: [40, 0, 0], insurance: true }, 1), { stake: 40, back: 20, net: -20, correct: false, insured: true }, 'insurance pays half back');
eq(G.settle(predict, { chips: [0, 40, 0], insurance: true }, 1).insured, false, 'insurance not needed on a win');
eq(G.settle({ type: 'predict', options: [1, 2, 3, 4] }, { chips: [0, 0, 0, 10] }, 3).back, 40, 'four options pay 4 ×');

eq(G.settle(estimate, { low: 100, high: 300, stake: 20 }, 230).back, 80, 'ratio 3 pays 4 ×');
eq(G.settle(estimate, { low: 100, high: 301, stake: 20 }, 230).back, 50, 'ratio just above 3 pays 2.5 ×');
eq(G.settle(estimate, { low: 30, high: 300, stake: 20 }, 230).back, 50, 'ratio 10 pays 2.5 ×');
eq(G.settle(estimate, { low: 10, high: 1000, stake: 20 }, 230).back, 30, 'ratio 100 pays 1.5 ×');
eq(G.settle(estimate, { low: 1, high: 1000, stake: 20 }, 230).back, 20, 'wider pays the stake back');
eq(G.settle(estimate, { low: 300, high: 600, stake: 20 }, 230).back, 0, 'a miss loses the stake');
eq(G.settle(estimate, { low: 230, high: 230, stake: 20 }, 230).back, 80, 'bounds are inclusive');
eq(G.settle(estimate, { low: 1e22, high: 3e22, stake: 10 }, 4.5e22).correct, false, 'large numbers: a miss');
eq(G.settle(estimate, { low: 2e22, high: 6e22, stake: 10 }, 4.5e22).back, 40, 'large numbers: a hit');
eq(G.settle(estimate, { low: 300, high: 600, stake: 21, insurance: true }, 230).back, 10, 'insurance rounds down');

eq(G.settle(calculate, { value: 441, stake: 20 }, 441).back, 40, 'exact');
eq(G.settle(calculate, { value: 420, stake: 20 }, 441).back, 40, 'within 5 %');
eq(G.settle(calculate, { value: 410, stake: 20 }, 441).back, 0, 'beyond 5 %');
eq(G.settle(calculate, { value: 441, stake: 20 }, 441, { first: true }).back, 50, 'first correct +10');
eq(G.settle(calculate, { value: 300, stake: 20 }, 441, { first: true }).back, 0, 'no bonus when wrong');

// ---------------------------------------------------------------- stakes
eq(G.minStake(100, false), 10, 'minimum stake');
eq(G.minStake(100, true), 50, 'final round: half');
eq(G.minStake(35, true), 18, 'final round: half, rounded up');
eq(G.minStake(5, false), 5, 'never more than the chips');
eq(G.checkBet(predict, { chips: [5, 0, 0] }, 100, false), 'stake-min', 'below the minimum');
eq(G.checkBet(predict, { chips: [60, 50, 0] }, 100, false), 'stake-max', 'more than the chips');
eq(G.checkBet(predict, { chips: [10.5, 0, 0] }, 100, false), 'stake-int', 'whole chips');
eq(G.checkBet(predict, { chips: [10, 0] }, 100, false), 'stake-int', 'a chip count per option');
eq(G.checkBet(predict, { chips: [30, 0, 0] }, 100, true), 'stake-min', 'final round minimum');
eq(G.checkBet(predict, { chips: [30, 20, 0] }, 100, true), null, 'final round bet');
eq(G.checkBet(estimate, { low: 300, high: 100, stake: 10 }, 100, false), 'bounds', 'high below low');
eq(G.checkBet(estimate, { low: 0, high: 100, stake: 10 }, 100, false), 'bounds', 'low must be positive');
eq(G.checkBet(estimate, { low: NaN, high: 100, stake: 10 }, 100, false), 'bounds', 'low missing');
eq(G.checkBet(calculate, { value: NaN, stake: 10 }, 100, false), 'value', 'value missing');
eq(G.checkBet(calculate, { value: 3, stake: 10 }, 100, false), null, 'calculate bet');
eq(G.topUp(9), 20, 'top-up below 10');
eq(G.topUp(10), 10, 'no top-up at 10');
eq(G.ranking([{ chips: 50 }, { chips: 120 }, { chips: 50 }]), [1, 0, 2], 'ranking');
eq(G.hotTeam(5, 4), 1, 'hot seat turns');
for (let k = 0; k < 200; k++) { const r = G.roll(3); if (!(r >= 1 && r <= 3 && Number.isInteger(r))) { fail(`roll ${r}`); break; } }
eq(G.roll(4, () => 0.999), 4, 'die: highest');
eq(G.roll(4, () => 0), 1, 'die: lowest');

// ---------------------------------------------------------------- numbers as typed
const nums = { '230': 230, '4.5e22': 4.5e22, '4,5e22': 4.5e22, '4.5·10^22': 4.5e22, '4.5×10^22': 4.5e22, '4.5*10^22': 4.5e22,
  '4.5x10^-3': 4.5e-3, "1'200": 1200, '1 200': 1200, '230 kg': 230, '10^6': 1e6, '.5': 0.5, '-3': -3, '3.8 km': 3.8 };
for (const [s, v] of Object.entries(nums)) close(G.parseNum(s), v, 1e-12, `parse ${s}`);
for (const s of ['', 'abc', '1.2.3', '4e', 'e5']) { checked++; if (!Number.isNaN(G.parseNum(s))) fail(`parse ${JSON.stringify(s)} should fail`); }

// ---------------------------------------------------------------- the rounds
const ids = new Set();
const text = (t, what) => { checked++; if (!t || typeof t.en !== 'string' || typeof t.de !== 'string' || !t.en.trim() || !t.de.trim()) fail(`${what}: en and de`); };
for (const r of ROUNDS) {
  if (ids.has(r.id)) fail(`duplicate id ${r.id}`);
  ids.add(r.id);
  checked++;
  if (!['predict', 'estimate', 'calculate'].includes(r.type)) fail(`${r.id}: type`);
  text(r.title, `${r.id} title`); text(r.question, `${r.id} question`); text(r.explain, `${r.id} explain`);
  if (r.editable) text(r.note, `${r.id} note`);
  if (r.type === 'predict') {
    checked++;
    if (!Array.isArray(r.options) || r.options.length < 2 || r.options.length > 4) fail(`${r.id}: options`);
    else r.options.forEach((o, k) => text(o, `${r.id} option ${k}`));
    if (!(Number.isInteger(r.answer) && r.answer >= 0 && r.answer < r.options.length)) fail(`${r.id}: answer index`);
  } else {
    checked++;
    if (!(Number.isFinite(r.answer) && r.answer > 0)) fail(`${r.id}: answer`);
    if (typeof r.unit !== 'string') fail(`${r.id}: unit`);
  }
}
const scenes = globalThis.AllInAnim.SCENES;
for (const r of ROUNDS) { checked++; if (!scenes[r.id] || typeof scenes[r.id].draw !== 'function') fail(`${r.id}: no animation`); }
eq(Object.keys(scenes).sort(), ROUNDS.map((r) => r.id).sort(), 'an animation per round, and no other');
// the topics: six known rounds each, in the order of the rules, and every round in some topic
eq(TOPICS.map((tp) => tp.id), ['mixed', 'mechanics', 'em', 'waves', 'modern'], 'the topics');
for (const tp of TOPICS) {
  text(tp.title, `topic ${tp.id} title`);
  checked++; if (!tp.rounds.every((id) => ids.has(id)) || new Set(tp.rounds).size !== 6) fail(`${tp.id}: six known rounds`);
  eq(tp.rounds.map((id) => ROUNDS.find((r) => r.id === id).type), ['predict', 'estimate', 'predict', 'calculate', 'predict', 'estimate'], `${tp.id}: the order`);
}
const inTopic = new Set(TOPICS.flatMap((tp) => tp.rounds));
checked++; if (ROUNDS.some((r) => !inTopic.has(r.id) && !['shower', 'kettle'].includes(r.id))) fail('a round outside every topic (only the spares shower and kettle)');

// the worked answers, from the physics
const g = 9.81, c = 4182, e = 1.602e-19;
const A = Object.fromEntries(ROUNDS.map((r) => [r.id, r.answer]));
close(A['room-air'], 1.2 * 9 * 7 * 3, 0.05, 'air in a 9 × 7 × 3 m room');
close(A.stairs, (60 * g * 3.0) / 4.0, 0.01, 'stairs');
close(A.chocolate, 2.25e6 / (60 * g), 0.01, 'chocolate');
close(A.electrons, (2 * 3600) / e, 0.01, 'electrons');
close(A.shower, c * 50 * 25, 0.02, 'shower');
close(A.braking, 30 ** 2 / (2 * 6.0), 0.001, 'braking');
close(A.kettle, (c * 1.0 * 80) / 2000, 0.01, 'kettle');
const h = 6.626e-34, cl = 2.998e8;
close(A.filament, 230 ** 2 / 60, 0.002, 'filament');
close(A['phone-battery'], (15 * 3600) / (60 * g), 0.005, 'phone battery');
close(A['fm-radio'], cl / 100e6, 0.01, 'FM radio');
close(A.guitar, 2 * 0.65 * 110, 0.005, 'guitar string');
close(A.thunder, 343 * 6, 0.01, 'thunder');
close(A['laser-photons'], 1e-3 / ((h * cl) / 650e-9), 0.01, 'laser photons');
close(A['carbon-dating'], 5730 * Math.log2(1 / 0.25), 0.001, 'carbon dating');
close(A['sun-mass'], 3.8e26 / cl ** 2, 0.01, 'the Sun’s mass loss');

console.log(`${checked} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
