// Checks the steps of shared/topics.js: a stage with fewer than three different exercises is
// merged with the next, at once or (with later) in the background, where the plan last worked out
// stands in until then.   node shared/test/check-topics.js
const assert = require('assert');
const mem = {};
global.window = global;
global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
require('../topics.js');

// stage 'few' has two exercises only: merged with the next
const name = (n) => () => n;
const topics = [{ name: name('A'), stages: [{ name: name('one'), types: ['many'] }, { name: name('few'), types: ['few'] }, { name: name('two'), types: ['more'] }] }];
let made = 0;
const make = (type, seed) => { made++; return { type, p: type === 'few' ? [type, seed % 2] : [type, seed] }; };
const names = (T) => [1, 2, 3, 4].map((s) => T.parse(`p1.${s}-1`)).map((e) => e && e.pstage);
const create = (later) => window.Topics.create({ app: 't', topics, make, typeOf: (e) => e.type, onChange: () => {}, later });

// at once
let T = create();
assert.deepStrictEqual(names(T), [0, 1, 2, null], 'one, few + two, all');
assert(made <= 3 + 24 + 3 + 3, `stops at three different exercises (${made} made)`); // and those of names()
assert(!mem['t-plans'], 'nothing kept');

// in the background: every stage a step of its own at first, then the plan
const jobs = [];
const later = (fn) => jobs.push(fn);
made = 0;
T = create(later);
assert.deepStrictEqual(names(T), [0, 1, 2, 3], 'at first: one, few, two, all');
assert(made <= 4, 'nothing worked out yet'); // the four of names()
let n = 0;
while (jobs.length) { jobs.shift()(); n++; }
assert(n >= 1, 'worked out later');
assert.deepStrictEqual(names(T), [0, 1, 2, null], 'then: one, few + two, all');
assert.strictEqual(T.parse('p1.2-3').type === 'few' || T.parse('p1.2-3').type === 'more', true);
assert(mem['t-plans'], 'the plan is kept');

// the next time the plan kept stands in at once (and is checked again in the background)
made = 0;
T = create(later);
assert.deepStrictEqual(names(T), [0, 1, 2, null], 'the plan kept');
assert(jobs.length, 'checked again');
while (jobs.length) jobs.shift()();
assert.deepStrictEqual(names(T), [0, 1, 2, null]);
console.log('topics: all checks passed');
