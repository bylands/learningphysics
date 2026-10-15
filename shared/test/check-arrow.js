// Checks the pure parts of shared/arrow.js: the directions (8 and 16, extra axes, the nearest,
// the turn of the keys with ⊙ ⊗), lengths kept to steps, limits and the room in the figure, the
// anchor a point takes, the words for screen readers, and judging a drawing against a target set
// (right, wrong direction, wrong length, missing, extra), and the palette: its buttons ⊙ ⊗ (only
// with outIn, in both languages, named by words()) and what they do.   node shared/test/check-arrow.js
const assert = require('assert');
const Lang = require('../lang.js');
const A = require('../arrow.js');

// ---------------------------------------------------------------- directions
assert.deepStrictEqual(A.dirs(8), [0, 45, 90, 135, 180, 225, 270, 315]);
assert.strictEqual(A.dirs(16).length, 16);
assert.strictEqual(A.dirs(16)[1], 22.5);
// a slope of 30°: along and perpendicular to it, both ways, besides the 8
assert.deepStrictEqual(A.axes(-30), [330, 60, 150, 240]);
assert.deepStrictEqual(A.dirs(8, A.axes(-30)), [0, 45, 60, 90, 135, 150, 180, 225, 240, 270, 315, 330]);
assert.deepStrictEqual(A.dirs(8, [90.2, 360, -45]), A.dirs(8), 'repeats within half a degree left out');
assert.strictEqual(A.nearest(A.dirs(8), 100), 90);
assert.strictEqual(A.nearest(A.dirs(8), 350), 0, 'round 0');
assert.strictEqual(A.nearest(A.dirs(8, A.axes(-30)), 340), 330);
// svg vectors (y down) and angles (y up)
assert.strictEqual(A.angleOf(0, -5), 90);
assert.strictEqual(A.angleOf(-3, 0), 180);
assert.strictEqual(A.angleOf(1, 1), 315);
assert.deepStrictEqual(A.vec(270), [0, 1]);
assert.deepStrictEqual(A.vec(180), [-1, 0]);
assert.strictEqual(A.gap(350, 10), 20);
// the keys: ← anticlockwise (+1), → clockwise; ⊙ ⊗ after the last direction with outIn
assert.strictEqual(A.turn(A.dirs(8), 90, 1), 135);
assert.strictEqual(A.turn(A.dirs(8), 0, -1), 315);
assert.strictEqual(A.turn(A.dirs(8), 315, 1), 0);
assert.strictEqual(A.turn(A.dirs(8), 315, 1, true), 'out');
assert.strictEqual(A.turn(A.dirs(8), 'out', 1, true), 'in');
assert.strictEqual(A.turn(A.dirs(8), 'in', 1, true), 0);
assert.strictEqual(A.turn(A.dirs(8), 0, -1, true), 'in');
assert.strictEqual(A.turn(A.dirs(8), 100, 1), 135, 'from a direction not allowed: from the nearest');

// ---------------------------------------------------------------- lengths
const L = { lo: 20, hi: 100, step: 8, init: 48 };
assert.strictEqual(A.size(51, L), 48);
assert.strictEqual(A.size(5, L), 20);
assert.strictEqual(A.size(130, L), 100);
assert.strictEqual(A.size(51, { lo: 10, hi: 90, step: 0 }), 51, 'free');
assert.strictEqual(A.size(51, 40), 40, 'fixed');
// the room in the figure: an arrow up from 30 units below the top has 30 units
const box = { x0: 0, y0: 0, x1: 200, y1: 100 };
assert.strictEqual(A.room([50, 30], 90, box), 30);
assert.strictEqual(A.room([50, 30], 0, box), 150);
assert(Math.abs(A.room([50, 30], 45, box) - 30 * Math.SQRT2) < 1e-9);
assert.strictEqual(A.room([50, 30], 'out', box), Infinity);
assert.strictEqual(A.fit(64, [50, 30], 0, L, box), 64);
assert.strictEqual(A.fit(64, [50, 30], 90, L, box), 24, 'shortened to whole steps within the room (less 4)');
assert.strictEqual(A.fit(64, [50, 10], 90, L, box), 8, 'at least 8, below lo');

// ---------------------------------------------------------------- anchors
const anchors = [
  { id: 'b1', label: 'box 1', area: [[10, 10], [60, 10], [60, 50], [10, 50]] },
  { id: 'b2', label: 'box 2', area: [[62, 10], [120, 10], [120, 50], [62, 50]] },
  { id: 'q', label: 'charge', x: 170, y: 30, r: 10 },
];
assert.strictEqual(A.anchorAt(anchors, [30, 30]).id, 'b1');
assert.strictEqual(A.anchorAt(anchors, [61, 30]).id, 'b1', 'between two: the nearer middle (box 1 is narrower)');
assert.strictEqual(A.anchorAt(anchors, [118, 58]).id, 'b2', 'within 12 units of the area');
assert.strictEqual(A.anchorAt(anchors, [30, 75]), null);
assert.strictEqual(A.anchorAt(anchors, [178, 36]).id, 'q');
assert.strictEqual(A.anchorAt(anchors, [200, 30]), null, '30 from the charge, 20 outside its circle');

// ---------------------------------------------------------------- words
Lang.set('en', true);
assert.strictEqual(A.words(270), 'down');
assert.strictEqual(A.words(135), 'up and to the left');
assert.strictEqual(A.words(330), 'at 330° (anticlockwise from the right)');
assert.strictEqual(A.words('in'), 'into the page (⊗)');
Lang.set('de', true);
assert.strictEqual(A.words(0), 'nach rechts');
assert.strictEqual(A.words('out'), 'aus der Ebene heraus (⊙)');
Lang.set('en', true);

// ---------------------------------------------------------------- judging
// a box on the floor pulled to the right: weight, normal force (as long as the weight), friction
const target = [
  { kind: 'g', anchor: 0, dir: 270, len: 1, group: 0 },
  { kind: 'n', anchor: 0, dir: 90, len: 1, group: 0 },
  { kind: 'r', anchor: 0, dir: 180 },
];
const res = (j) => j.results.map((r) => [r.kind, r.result]);
let j = A.judge([{ kind: 'n', anchor: 0, dir: 90, len: 56 }, { kind: 'g', anchor: 0, dir: 270, len: 48 }, { kind: 'r', anchor: 0, dir: 180, len: 24 }], target);
assert(j.ok, 'right in any order, friction of any length, normal force and weight within 25 %');
assert.deepStrictEqual(j.results.map((r) => r.drawn), [1, 0, 2]);
j = A.judge([{ kind: 'g', anchor: 0, dir: 270, len: 48 }, { kind: 'n', anchor: 0, dir: 90, len: 80 }, { kind: 'r', anchor: 0, dir: 0, len: 24 }], target);
assert(!j.ok);
assert.deepStrictEqual(res(j), [['g', 'len'], ['n', 'len'], ['r', 'dir']], 'a pair of different lengths: both');
j = A.judge([{ kind: 'g', anchor: 0, dir: 270, len: 48 }, { kind: 'n', anchor: 0, dir: 270, len: 80 }], target);
assert.deepStrictEqual(res(j), [['g', 'right'], ['n', 'dir'], ['r', 'missing']], 'no length judged where the direction is wrong');
j = A.judge([{ kind: 'g', anchor: 0, dir: 270, len: 48 }, { kind: 'n', anchor: 0, dir: 90, len: 48 }, { kind: 'r', anchor: 0, dir: 180, len: 24 },
  { kind: 's', anchor: 0, dir: 0, len: 48 }, { kind: 'g', anchor: 0, dir: 90, len: 48 }, { kind: 'r', anchor: 1, dir: 180, len: 24 }], target);
assert.deepStrictEqual(res(j), [['g', 'right'], ['n', 'right'], ['r', 'right'], ['s', 'extra'], ['g', 'extra'], ['r', 'extra']], 'extra: another kind, twice, another anchor');
assert.deepStrictEqual(j.results.slice(3).map((r) => [r.drawn, r.anchor]), [[3, 0], [4, 0], [5, 1]]);
// two of a kind on one anchor (two ropes): each takes the arrow nearest its direction
j = A.judge([{ kind: 'k', anchor: 'm', dir: 135 }, { kind: 'k', anchor: 'm', dir: 45 }], [{ kind: 'k', anchor: 'm', dir: 45 }, { kind: 'k', anchor: 'm', dir: 135 }]);
assert(j.ok);
assert.deepStrictEqual(j.results.map((r) => r.drawn), [1, 0]);
// a tolerance in degrees (unsnapped drawings), ⊙ ⊗
assert(A.judge([{ kind: 'E', anchor: 'p', dir: 52 }], [{ kind: 'E', anchor: 'p', dir: 45 }], { tol: 10 }).ok);
assert(!A.judge([{ kind: 'E', anchor: 'p', dir: 52 }], [{ kind: 'E', anchor: 'p', dir: 45 }]).ok, 'by default the snapped direction itself');
assert(A.judge([{ kind: 'B', anchor: 'p', dir: 'in' }], [{ kind: 'B', anchor: 'p', dir: 'in' }]).ok);
assert.strictEqual(A.judge([{ kind: 'B', anchor: 'p', dir: 'out' }], [{ kind: 'B', anchor: 'p', dir: 'in' }]).results[0].result, 'dir');
assert.strictEqual(A.judge([{ kind: 'B', anchor: 'p', dir: 90 }], [{ kind: 'B', anchor: 'p', dir: 'in' }]).results[0].result, 'dir');
// relative lengths: 2 : 1 within the group, the odd one out of three marked alone
const pair = [{ kind: 'F', anchor: 1, dir: 0, len: 2 }, { kind: 'F', anchor: 2, dir: 180, len: 1 }];
assert(A.judge([{ kind: 'F', anchor: 1, dir: 0, len: 80 }, { kind: 'F', anchor: 2, dir: 180, len: 40 }], pair).ok);
assert(!A.judge([{ kind: 'F', anchor: 1, dir: 0, len: 40 }, { kind: 'F', anchor: 2, dir: 180, len: 40 }], pair).ok);
const three = [0, 1, 2].map((k) => ({ kind: 'F', anchor: k, dir: 90, len: 1 }));
j = A.judge([{ kind: 'F', anchor: 0, dir: 90, len: 40 }, { kind: 'F', anchor: 1, dir: 90, len: 40 }, { kind: 'F', anchor: 2, dir: 90, len: 72 }], three);
assert.deepStrictEqual(j.results.map((r) => r.result), ['right', 'right', 'len']);
// groups are compared each on its own
j = A.judge([{ kind: 'g', anchor: 0, dir: 270, len: 40 }, { kind: 'n', anchor: 0, dir: 90, len: 40 }, { kind: 'g', anchor: 1, dir: 270, len: 80 }, { kind: 'n', anchor: 1, dir: 90, len: 80 }],
  [{ kind: 'g', anchor: 0, dir: 270, len: 1, group: 0 }, { kind: 'n', anchor: 0, dir: 90, len: 1, group: 0 }, { kind: 'g', anchor: 1, dir: 270, len: 1, group: 1 }, { kind: 'n', anchor: 1, dir: 90, len: 1, group: 1 }]);
assert(j.ok, 'two boxes of different weights');
assert(A.judge([], []).ok);

// ---------------------------------------------------------------- the buttons ⊙ ⊗
const D8 = A.dirs(8);
assert.deepStrictEqual(A.press(90, null, 'out', D8), { dir: 'out', keep: 90 }, '⊙: the direction in the plane kept');
assert.deepStrictEqual(A.press('out', 90, 'in', D8), { dir: 'in', keep: 90 }, '⊙ to ⊗');
assert.deepStrictEqual(A.press('in', 90, 'in', D8), { dir: 90, keep: null }, '⊗ again: back to the plane');
assert.deepStrictEqual(A.press('out', null, 'out', D8), { dir: 0, keep: null }, 'nothing kept: the first direction');
const arr = [{ id: 'a1' }, { id: 'a2' }];
assert.strictEqual(A.pressTarget(arr, 'a2'), 'a2', 'the selected arrow');
assert.strictEqual(A.pressTarget(arr, null), null, 'several, none selected: none');
assert.strictEqual(A.pressTarget([{ id: 'a1' }], null), 'a1', 'the only one');
assert.strictEqual(A.pressTarget([{ id: 'a1' }], 'a9'), 'a1', 'a selected arrow that is gone');
assert.strictEqual(A.pressTarget([], null), null);
// the palette: the buttons only with outIn (Free-Body Diagrams has none), in the page language
const kinds = [{ id: 'F', label: 'Force', cls: 'k-F' }];
Lang.set('en', true);
let html = A.paletteHtml({ kinds });
assert(!/ar-oi/.test(html) && /ar-kind/.test(html) && /Remove arrow/.test(html), 'no ⊙ ⊗ without outIn');
html = A.paletteHtml({ kinds, outIn: true, note: 'Draw it.' });
assert.strictEqual((html.match(/class="ar-oi"/g) || []).length, 2);
assert(/data-oi="out"[^>]*>.*⊙.*out of the page<\/button>/.test(html) && /data-oi="in"[^>]*>.*⊗.*into the page<\/button>/.test(html), html);
assert(html.indexOf('ar-oi') < html.indexOf('ar-remove') && /Draw it\./.test(html), 'between the kinds and Remove, with the note given');
assert(!/ar-oi/.test(A.paletteHtml({ kinds, outIn: true, outInButtons: false })), 'outInButtons: false');
html = A.paletteHtml({ kinds, outIn: true, words: (d) => (d === 'out' ? 'aus der Seite heraus' : null) });
assert(/aus der Seite heraus<\/button>/.test(html) && /into the page<\/button>/.test(html), 'named by words(), or the default');
Lang.set('de', true);
html = A.paletteHtml({ kinds, outIn: true });
assert(/aus der Ebene heraus<\/button>/.test(html) && /in die Ebene hinein<\/button>/.test(html) && /Pfeil entfernen/.test(html));
Lang.set('en', true);

console.log('all checks passed');
