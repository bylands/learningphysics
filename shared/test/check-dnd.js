// Checks shared/dnd.js: answers read from the zones of the cards (ranks with ties, partners), the
// zones that set them again, and the HTML of the three kinds in both languages.
//   node shared/test/check-dnd.js
const assert = require('assert');
const Lang = require('../lang.js');
const D = require('../dnd.js');

// ranks: boxes in order, empty ones skipped, equal ones share a rank
assert.deepStrictEqual(D.ranksOf(['0', '2', '0', '3']), [1, 3, 1, 4]);
assert.deepStrictEqual(D.ranksOf(['1', 'pool', '3', '1']), [1, null, 3, 1]);
assert.deepStrictEqual(D.ranksOf(['pool', 'pool']), [null, null]);
assert.deepStrictEqual(D.zonesOfRanks([1, 3, 1, 4]), [0, 1, 0, 2]);
assert.deepStrictEqual(D.zonesOfRanks([2, null, 1]), [1, 'pool', 0]);
// reading again what was set gives the same ranks
for (const s of [[1, 2, 2, 4], [1, 1, 1, 1], [4, 3, 2, 1], [1, null, 2, null], [2, 2, 1, 4]]) {
  assert.deepStrictEqual(D.ranksOf(D.zonesOfRanks(s).map(String)), s);
}

// pairs: the partner is the one other item in the box; alone, or three in a box: none
assert.deepStrictEqual(D.partnersOf(['0', '1', '0', '1']), [2, 3, 0, 1]);
assert.deepStrictEqual(D.partnersOf(['0', 'pool', '0', '1']), [2, null, 0, null]);
assert.deepStrictEqual(D.partnersOf(['0', '0', '0', 'pool']), [null, null, null, null]);
assert.deepStrictEqual(D.partnersOf(['pool', 'pool']), [null, null]);
// each item with its partner in the next free box; -1 (a partner not among the items): alone
assert.deepStrictEqual(D.zonesOfPartners([2, 3, 0, 1]), [0, 1, 0, 1]);
assert.deepStrictEqual(D.zonesOfPartners([null, 3, null, 1]), ['pool', 0, 'pool', 0]);
assert.deepStrictEqual(D.zonesOfPartners([1, 0, -1, null]), [0, 0, 1, 'pool']);
// a partner whose own answer is still open joins the box of the item that names it
assert.deepStrictEqual(D.zonesOfPartners([null, 0, 3, 2]), [0, 0, 1, 1]);
assert.deepStrictEqual(D.partnersOf(D.zonesOfPartners([3, 2, 1, 0]).map(String)), [3, 2, 1, 0]);

// the HTML: one card per item, the boxes of each kind, the notes in the page language
const count = (s, re) => (s.match(re) || []).length;
Lang.set('en', true);
let h = D.html({ kind: 'rank', items: ['a', 'b', 'c'] });
assert.strictEqual(count(h, /class="chip"/g), 3);
assert.strictEqual(count(h, /class="zone bucket"/g), 3);
assert(h.includes('the largest at the top') && h.includes('▲ largest') && h.includes('▼ smallest') && h.includes('(Or tap an item, then its box.)'));
h = D.html({ kind: 'rank', items: ['a', 'b'], ends: ['Top', 'Bottom'] });
assert(h.includes('in order from the top to the bottom') && h.includes('▲ Top') && h.includes('▼ Bottom'));
h = D.html({ kind: 'match', items: ['a', 'b', 'c'], heads: ['<span>X</span>', '<span>Y</span>'], pics: true });
assert.strictEqual(count(h, /class="zone target"/g), 2);
assert(h.includes('class="targets pics"') && h.includes('<div class="target-head"><span>Y</span></div>'));
h = D.html({ kind: 'pairs', items: ['a', 'b', 'c', 'd'], note: 'Pair them.' });
assert.strictEqual(count(h, /class="zone pair" data-zone="\d" data-cap="2"/g), 2);
assert(h.includes('Pair them. (Or tap') && h.includes('Pair 2'));
h = D.html({ kind: 'rank', items: ['a'], ro: true });
assert(h.includes('class="chip" data-i="0" disabled') && h.includes('tabindex="-1"'));
Lang.set('de', true);
h = D.html({ kind: 'pairs', items: ['a', 'b'] });
assert(h.includes('Paar 1') && h.includes('(Oder tippe ein Element an und dann sein Feld.)') && h.includes('paarweise'));
h = D.html({ kind: 'rank', items: ['a', 'b'] });
assert(h.includes('▲ am grössten') && !/ß/.test(h));
console.log('all checks passed');
