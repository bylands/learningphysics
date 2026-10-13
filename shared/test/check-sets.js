// Checks shared/sets.js and the sets in shared/topics.js: the keys of stages, what a set's
// learning objectives leave of an app (objectives, worked examples, topics), practice limited to the
// topics of a set's objectives (once the check has registered them), and practice limited to the
// stages of a set saved before there were objectives (topics left out, steps merged from the set's
// stages only, all topics mixed only with them).   node shared/test/check-sets.js
const assert = require('assert');
const S = require('../sets.js');

const topics = [
  { name: () => 'A', stages: [{ name: () => 'a1', types: ['a1'] }, { types: ['a2', 'a3'] }] },
  { name: () => 'B', stages: [{ types: ['b1'] }, { types: ['b2'] }] },
  { name: () => 'C', stages: [{ types: ['c1'] }] },
];
assert.strictEqual(S.stageKey(topics[0].stages[1]), 'a2+a3');
assert(S.NAME.test('3a-elektro') && !S.NAME.test('3A') && !S.NAME.test('-a'));
assert(S.NAME.test('abc/3a-elektro') && !S.NAME.test('ab/3a') && !S.NAME.test('abcd/3a') && !S.NAME.test('abc/') && !S.NAME.test('a/b/c'));
// a set by its name: a teacher's (xyz/name), the default teacher's without one, or as written before there were teachers
const file = { default: 'bys', sets: { 'bys/3a': { title: 'A' }, 'abc/3a': { title: 'B' }, 'abc/x': [] } };
assert.strictEqual(S.find(file, 'bys/3a').title, 'A');
assert.strictEqual(S.find(file, '3a').title, 'A');
assert.strictEqual(S.find(file, 'abc/3a').title, 'B');
assert.strictEqual(S.find(file, 'abc/nope'), null);
assert.strictEqual(S.find(file, 'x'), null);
assert.strictEqual(S.find(file, 'abc/x'), null, 'not a set');
assert.strictEqual(S.find({ sets: { '3a': { title: 'old' } } }, '3a').title, 'old');
assert.strictEqual(S.find(null, '3a'), null);

// a set's objectives: their worked examples and topics, sorted and each once
const objectives = [{ id: 'x', tutor: 0, topic: 0 }, { id: 'y', tutor: 3, topic: 2 }, { id: 'z', tutor: 2, topic: 2 }, { id: 'w' }];
const lim = S.limits(objectives, ['z', 'y', 'nope']);
assert.deepStrictEqual(lim.objectives.map((o) => o.id), ['y', 'z'], 'in the order of the app');
assert.deepStrictEqual(lim.tutor, [2, 3]);
assert.deepStrictEqual(lim.topics, [2]);
assert.deepStrictEqual(S.limits(objectives, ['w']), { objectives: [objectives[3]], tutor: [], topics: [] });
assert.strictEqual(S.limits(objectives, ['nope']), null, 'none of the app: no limit');
assert.strictEqual(S.limits(objectives, null), null);

// practice in a set (topics.js reads LPSets, as in the browser)
const mem = {};
global.window = global;
global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
let keys = null;
let inTopics = null, listeners = [];
global.LPSets = { name: '3a', mode: () => true, tutor: () => null, topics: () => inTopics, practice: () => keys, register: () => {}, on: (fn) => listeners.push(fn), stageKey: S.stageKey };
require('../topics.js');
// every type has many exercises, so no stage is merged with the next
const make = (type, seed) => ({ type, p: [type, seed] });
const create = () => window.Topics.create({ app: 't', topics, make, typeOf: (e) => e.type, onChange: () => {} });

let T = create();
assert(T.parse('p2.1-7'), 'without a set, every topic');
assert(T.parse('mix-3'));

keys = ['a2+a3', 'b2'];
T = create();
assert.deepStrictEqual(T.state(), { topic: 0, stage: 0 });
assert.strictEqual(T.parse('p3.1-1'), null, 'topic C is not in the set');
const a = T.parse('p1.1-4'); // topic A's first step is now its stage 2
assert(['a2', 'a3'].includes(a.type));
assert.strictEqual(T.parse('p1.2-4'), null, 'topic A has one step in the set');
assert.strictEqual(T.parse('p2.1-5').type, 'b2');
for (let seed = 1; seed < 30; seed++) assert(['a2', 'a3', 'b2'].includes(T.parse(`mix-${seed}`).type), 'mixed: the set\'s stages only');
T.go(2);
assert.strictEqual(T.state().topic, 0, 'a topic not in the set: the first that is');
assert(mem['t-topic@3a'], 'the choice is kept apart from the one without the set');

keys = ['c1'];
T = create();
assert.deepStrictEqual(T.state(), { topic: 2, stage: 0 });
assert.strictEqual(T.parse('mix-1'), null, 'one topic: no mixing');

keys = ['zz']; // nothing of the app: no limit
T = create();
assert(T.parse('p2.2-1'));
keys = null;

// a set with objectives: their topics only, known once the check registers (then the topics
// limit themselves, as tutor.js does); the steps stay those of the topic
listeners = [];
T = create();
assert(T.parse('p1.1-1'), 'before the check registers: all topics');
inTopics = [1, 2];
listeners.forEach((fn) => fn());
assert.strictEqual(T.parse('p1.1-1'), null, 'topic A is not in the set');
assert.strictEqual(T.parse('p2.2-3').type, 'b2', 'topic B keeps its steps');
assert(T.parse('p3.1-1'));
for (let seed = 1; seed < 30; seed++) assert(['b1', 'b2', 'c1'].includes(T.parse(`mix-${seed}`).type), 'mixed: the set\'s topics only');
T.go(0);
assert.strictEqual(T.state().topic, 1, 'a topic not in the set: the first that is');
assert(mem['t-topic@3a'], 'the choice of topic is kept apart');
inTopics = [2];
T = create();
listeners.forEach((fn) => fn());
assert.deepStrictEqual(T.state(), { topic: 2, stage: 0 });
assert.strictEqual(T.parse('mix-1'), null, 'one topic: no mixing');
console.log('sets: all checks passed');
