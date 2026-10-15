// Absolute Zero: checks of the questions and the rules (node absolute-zero/test/check-game.js).
'use strict';
const path = require('path');
const { TOPICS, QUESTIONS } = require(path.join(__dirname, '..', 'questions.js'));
const G = require(path.join(__dirname, '..', 'game.js'));

let failed = 0, passed = 0;
function ok(cond, what) { if (cond) passed++; else { failed++; console.log('FAIL', what); } }
const eq = (a, b, what) => ok(JSON.stringify(a) === JSON.stringify(b), `${what}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

// ------------------------------------------------------------------ the questions
eq(QUESTIONS.length, 60, 'sixty questions');
eq(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length, 'unique ids');
TOPICS.forEach((t) => eq(QUESTIONS.filter((q) => q.topic === t.id).length, 12, `12 questions in ${t.id}`));
QUESTIONS.forEach((q) => {
  ok(TOPICS.some((t) => t.id === q.topic), `${q.id}: a known topic`);
  ok(q.q.en && q.q.de, `${q.id}: English and German`);
  if (q.note) ok(q.note.en && q.note.de, `${q.id}: note in both languages`);
  const list = G.answers(q);
  ok(list.length >= 6, `${q.id}: at least 6 answers (${list.length})`);
  ok(list.some((a) => a.rare), `${q.id}: some rare answers`);
  const names = list.map((a) => G.normalize(a.name));
  eq(names.length, new Set(names).size, `${q.id}: no answer twice`);
  const seen = new Map();
  list.forEach((a, k) => {
    ok(a.name && a.de, `${q.id}: answer ${k} has a name`);
    a.keys.forEach((key, j) => {
      ok(key, `${q.id}: spelling "${a.spellings[j]}" is not empty`);
      if (seen.has(key) && seen.get(key) !== k) ok(false, `${q.id}: "${a.spellings[j]}" belongs to two answers`);
      seen.set(key, k);
      // every listed spelling finds its own answer
      eq(G.match(q, a.spellings[j]), k, `${q.id}: "${a.spellings[j]}"`);
    });
  });
});

// ------------------------------------------------------------------ normalizing and matching
eq(G.normalize('  The Light-Year! '), 'lightyear', 'article, hyphen, case');
eq(G.normalize('Ångström'), 'angstrom', 'accents');
eq(G.normalize('Fuß'), 'fuss', 'ß');
eq(G.normalize('E = mc²'), 'emc2', 'superscript');
eq(G.normalize('μm'), 'µm', 'Greek mu is the micro sign');
eq(G.normalize('a'), 'a', 'a lone a is no article');
eq(G.normalize('der Hebel'), 'hebel', 'German article');
const m = (id, text) => { const q = byId[id], k = G.match(q, text); return k < 0 ? null : G.answers(q)[k].name; };
eq(m('prefixes', 'm'), 'milli', 'm is milli');
eq(m('prefixes', 'M'), 'mega', 'M is mega');
eq(m('prefixes', 'Mega'), 'mega', 'case-free name');
eq(m('prefixes', 'p'), 'pico', 'p is pico');
eq(m('prefixes', 'P'), 'peta', 'P is peta');
eq(m('length-units', 'Lichtjahr'), 'light year', 'German name');
eq(m('length-units', 'lightyears'), 'light year', 'plural as a typo');
eq(m('length-units', 'kilometers'), 'kilometre', 'US spelling and plural');
eq(m('planets', 'Jupitr'), 'Jupiter', 'one typo');
eq(m('planets', 'Jpitr'), null, 'two typos in a short word');
eq(m('planets', 'Merkur'), 'Mercury', 'German planet');
eq(m('planets', 'Moon'), null, 'not on the list');
eq(m('planets', ''), null, 'empty');
eq(m('mechanics-laws', 'galilei'), 'Galileo', 'second spelling');
eq(m('simple-machines', 'the lever'), 'lever', 'article dropped');
eq(m('simple-machines', 'Flaschenzug'), 'pulley', 'German alternative');

// ------------------------------------------------------------------ scoring
eq(G.score(1, 20), 0, 'only one: absolute zero');
eq(G.score(20, 20), 100, 'everyone');
eq(G.score(5, 21), 20, 'four of twenty others');
eq(G.score(0, 20), G.WRONG, 'wrong');
eq(G.score(1, 1), 0, 'a single player');

const q = byId.planets;
const typed = { a: 'Mars', b: 'mars', c: 'Pluto', d: 'Moon', e: 'Titan', f: 'Erde', g: '' };
const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
let r = G.judge(q, typed, ids, {});
eq(r.n, 8, 'players');
eq(r.unlisted.map((u) => u.key), ['u:moon', 'u:titan'], 'unlisted answers');
const sorted = (o) => Object.fromEntries(Object.entries(o).sort());
eq(sorted(r.scores), sorted({ a: 14, b: 14, c: 0, f: 0, d: 100, e: 100, g: 100, h: 100 }), 'scores without decisions');
eq(r.groups[0].ids, ['a', 'b'], 'most common first');
eq(r.groups[0].texts, ['Mars', 'mars'], 'the texts of a group');
r = G.judge(q, typed, ids, { 'u:moon': 'ok', 'u:titan': 'a2' });
eq(r.scores.d, 0, 'accepted unlisted answer scores on its own');
eq(r.scores.e, 14, 'merged with Earth');
eq(r.scores.f, 14, 'Earth now twice');
eq(r.groups.find((g) => g.key === 'a2').texts, ['Erde', 'Titan'], 'merged texts');
eq(r.wrong.sort(), ['g', 'h'], 'wrong: empty and missing');
const unused = G.unused(q, r.groups);
ok(unused.length <= 8 && G.answers(q)[unused[0]].rare, 'unused: rare first');
ok(!unused.includes(3), 'Mars is used');

const players = [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cy' }, { id: 'd', name: 'Di' }];
const totals = { a: { total: 40, zeros: 1 }, b: { total: 40, zeros: 2 }, c: { total: 10, zeros: 0 }, d: { total: 40, zeros: 2 } };
eq(G.ranking(players, totals).map((p) => p.id), ['c', 'b', 'd', 'a'], 'ranking');
eq(G.places(players, totals), { c: 1, b: 2, d: 2, a: 4 }, 'places with a tie');

const ids5 = G.pick(QUESTIONS, 'waves', 5, () => 0.3);
eq(ids5.length, 5, 'pick five');
ok(ids5.every((id) => byId[id].topic === 'waves'), 'pick from the topic');
const mixed = G.pick(QUESTIONS, 'mixed', 10);
eq(new Set(mixed.map((id) => byId[id].topic)).size, 5, 'mixed: every topic');
eq(new Set(mixed).size, 10, 'mixed: no question twice');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
