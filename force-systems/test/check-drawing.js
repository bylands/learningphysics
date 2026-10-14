// Verifies the free-body diagrams the student draws in practice (generator.js: diagram, judged
// with arrow.js): run with `node force-systems/test/check-drawing.js`. For every situation of
// practice, many seeds and both languages it checks
// - the anchors (each box's corners, its weight inside them), the length of a new arrow (that of
//   a force of the solved drawing), the palette (the kinds of the table
//   of forces, and "a force in the direction of motion" where the body moves), where each kind
//   starts, and that every force to draw has a direction the arrows snap to,
// - that drawing exactly the forces of the solution is judged right, in any order,
// - that a force left out, a force turned round, a trap added (a force in the direction of motion,
//   a push or pull on a body nothing pushes, air resistance on a body at rest) or a pair that must
//   be equally long drawn unequal is judged wrong, its arrow marked, with a note of the right
//   slip (noFric, noSpring, noDrag, springDir, dragDir, motion, dragRest) that names the box, a
//   nudge while the exercise is open and another text once it is done,
// - which pairs must be equally long (the normal force and the weight on a level floor; a spring
//   or air resistance holding the weight).
'use strict';

require('../lang.js'); require('../core.js'); require('../draw.js'); require('../arrow.js'); require('../scenarios.js'); require('../equations.js'); require('../generator.js'); require('../lessons.js');
const { FS, Forces, Lessons, Arrow } = globalThis;

let failures = 0, checked = 0;
const fail = (msg) => { failures++; if (failures < 30) console.log('  FAIL ' + msg); };
const bad = /undefined|NaN|Infinity|\[object/;
const types = [...new Set(Lessons.EXAMPLES.flatMap((e) => e.practice.flatMap((s) => s.types)))].filter((t) => !t.startsWith('error-'));
const byId = (id) => Forces.SCENARIOS.find((s) => s.id === id);
const turn = (d) => (d + 180) % 360;
// the expected slip of a force left out, or turned round
const MISSING = { r: 'noFric', f: 'noSpring', d: 'noDrag' }, TURNED = { f: 'springDir', d: 'dragDir' };
const pairs = {}; // situation → the pairs of equal length seen

function checkNote(id, what, n, flag, box, j) {
  if (!n) { fail(`${id}: ${what}: no note`); return; }
  if (n.flag !== flag) fail(`${id}: ${what}: flag ${n.flag}, expected ${flag}`);
  if (typeof n.text !== 'string' || !n.text || bad.test(n.text)) fail(`${id}: ${what}: text ${n.text}`);
  else if (box != null && !n.text.toLowerCase().includes(box.toLowerCase())) fail(`${id}: ${what}: the note does not name ${box}: ${n.text}`);
  if (j && j.ok) fail(`${id}: ${what}: judged right`);
}

for (const lang of ['en', 'de']) {
  FS.setLang(lang);
  for (const type of types) {
    const scn = byId(type);
    for (let seed = 1; seed <= 60; seed++) {
      const ex = Forces.practiceOf(type, seed), id = `${lang} ${type}-${seed}`, d = ex.diagram(), t = ex.forces;
      checked++;
      // anchors and palette
      if (d.boxes.length !== t.boxes.length) fail(`${id}: ${d.boxes.length} anchors for ${t.boxes.length} boxes`);
      const sc = scn.scene(ex.p, ex.v, { task: true });
      sc.forces.filter((f) => f.kind === 'g').forEach((f) => {
        const i = /2$/.test(f.id) ? 1 : 0, an = Arrow.anchorAt(d.boxes, f.at, 0);
        if (!an || an.id !== i) fail(`${id}: the weight ${f.id} is not inside box ${i + 1}`);
      });
      const kinds = d.kinds.map((k) => k.id), want = [...t.kinds.map((k) => k.kind), ...(scn.still ? [] : ['m'])];
      if (kinds.join() !== want.join()) fail(`${id}: palette ${kinds} instead of ${want}`);
      d.kinds.forEach((k) => { if (!k.name || bad.test(k.name)) fail(`${id}: palette name ${k.name}`); });
      d.boxes.forEach((b) => d.kinds.forEach((k) => {
        const at = d.tail(k.id, b.id), s = d.sym(k.id, b.id);
        if (!(at.length === 2 && at.every(Number.isFinite))) fail(`${id}: no tail for ${k.id} on box ${b.id + 1}`);
        if (!s || !s.every((x) => x != null && String(x) !== 'undefined')) fail(`${id}: no symbol for ${k.id} on box ${b.id + 1}`);
      }));
      // the forces to draw: those of the table of forces, less those given in the drawing
      const cells = t.cells.reduce((n, row) => n + row.reduce((m, c) => m + c.length, 0), 0);
      if (d.target.length + d.given.length !== cells) fail(`${id}: ${d.target.length} forces to draw and ${d.given.length} given for ${cells} in the table`);
      d.target.forEach((x) => { if (!d.dirs.some((e) => Arrow.gap(e, x.dir) < 1e-6)) fail(`${id}: ${x.id} at ${x.dir}° is not among the directions`); });
      if (d.dirs.length !== 8 && d.dirs.length !== 12) fail(`${id}: ${d.dirs.length} directions`);
      if (!d.target.length) fail(`${id}: nothing to draw`);
      // a new arrow as long as a typical force of the solved drawing, in whole steps
      const L = d.len, typical = sc.lengths();
      if (!(L.init >= 32 && L.init <= L.hi && L.init % 8 === 0) || !d.target.some((x) => Math.abs(typical[x.id] - L.init) <= 8)) fail(`${id}: a new arrow ${L.init} long`);

      // exactly the solution: right, in any order, at any length where none is judged
      const right = d.target.map((x, k) => ({ id: `a${k}`, kind: x.kind, anchor: x.anchor, dir: x.dir, len: 24 + 8 * ((k * 3) % 5) * (x.len ? 0 : 1) + (x.len ? 48 : 0) }));
      let j = d.judge([...right].reverse(), false);
      if (!j.ok || j.notes.length) fail(`${id}: the solution judged wrong: ${j.notes.map((n) => n.text).join(' | ')}`);
      if (Object.values(j.marks).some((m) => m !== 'ok') || Object.keys(j.marks).length !== right.length) fail(`${id}: the solution's marks ${JSON.stringify(j.marks)}`);

      // a force left out, or turned round
      right.forEach((a, k) => {
        const x = d.target[k], box = t.boxes[x.anchor];
        j = d.judge(right.filter((b) => b !== a), false);
        checkNote(id, `${x.id} left out`, j.notes[0], MISSING[x.kind] || null, box, j);
        if (j.notes.length !== 1) fail(`${id}: ${x.id} left out: ${j.notes.length} notes`);
        const done = d.judge(right.filter((b) => b !== a), true).notes[0];
        if (!done || done.text === j.notes[0].text) fail(`${id}: ${x.id} left out: the same text once done`);
        const flipped = right.map((b) => (b === a ? { ...b, dir: turn(b.dir) } : b));
        j = d.judge(flipped, false);
        checkNote(id, `${x.id} turned round`, j.notes[0], TURNED[x.kind] || null, box, j);
        if (j.marks[a.id] !== 'bad' || Object.keys(j.marks).filter((m) => j.marks[m] === 'bad').length !== 1) fail(`${id}: ${x.id} turned round: marks ${JSON.stringify(j.marks)}`);
        if (d.judge(flipped, true).notes[0].text === j.notes[0].text) fail(`${id}: ${x.id} turned round: the same text once done`);
      });

      // a trap added on each box: a force in the direction of motion, a push or pull from
      // outside where nothing pushes, air resistance on a body at rest
      d.boxes.forEach((b) => {
        const box = t.boxes[b.id], add = (kind) => d.judge([...right, { id: 'x', kind, anchor: b.id, dir: 0, len: 48 }], false);
        const pushed = d.given.some((g) => sc.forces.find((f) => f.id === g).kind === 's' && (byId(type).forceOn && g in byId(type).forceOn ? byId(type).forceOn[g] : /2$/.test(g) ? 1 : 0) === b.id);
        if (!scn.still) {
          j = add('m');
          checkNote(id, `a force of motion on box ${b.id + 1}`, j.notes[0], 'motion', box, j);
          if (j.marks.x !== 'bad') fail(`${id}: a force of motion not marked`);
          if (!pushed) checkNote(id, `a push on box ${b.id + 1}`, add('s').notes[0], 'motion', box, add('s'));
        }
        if (pushed) checkNote(id, `the given push drawn again on box ${b.id + 1}`, add('s').notes[0], null, box, add('s'));
        if (scn.still && kinds.includes('d')) checkNote(id, `air resistance on box ${b.id + 1} at rest`, add('d').notes[0], 'dragRest', box, add('d'));
        // the weight twice
        checkNote(id, `the weight twice on box ${b.id + 1}`, add('g').notes[0], null, box, add('g'));
      });

      // equal lengths: only for the pairs the task makes clear, within 20 % of their (geometric) mean
      const groups = [...new Set(d.target.filter((x) => x.len).map((x) => x.group))];
      (pairs[type] = pairs[type] || new Set()).add(groups.map((g) => d.target.filter((x) => x.group === g).map((x) => x.kind).sort().join('=')).join(' '));
      groups.forEach((g) => {
        const k = d.target.findIndex((x) => x.group === g), box = t.boxes[g];
        const longer = (f) => right.map((b, m) => (m === k ? { ...b, len: b.len * f } : b));
        if (!d.judge(longer(4 / 3), false).ok) fail(`${id}: a pair of lengths 64 and 48 judged wrong`);
        j = d.judge(longer(1.5), false);
        checkNote(id, `a pair of lengths 72 and 48`, j.notes[0], null, box, j);
        if (j.notes.length !== 1) fail(`${id}: a pair of unequal lengths: ${j.notes.length} notes`);
      });
    }
  }
}

// the pairs of equal length per situation (the forces to draw of each box)
const PAIRS = {
  'rest-up': [''], 'rest-angle': [''], 'pull-friction': ['g=n'], 'push-pair': ['g=n g=n'], 'rope-pair': ['g=n g=n'], atwood: [''],
  'table-pulley': ['g=n'], 'incline-pull': [''], 'incline-pulley': [''], 'spring-hang': ['f=g'], 'spring-floor': ['g=n'],
  'drag-fall': ['', 'd=g'], 'drag-bike': ['g=n'],
};
for (const type of types) {
  const seen = [...pairs[type]].sort().join(' | '), want = PAIRS[type].sort().join(' | ');
  if (seen !== want) fail(`${type}: pairs of equal length ${seen}, expected ${want}`);
}

console.log(`${checked} drawings checked, ${types.length} situations`);
if (failures) { console.log(`${failures} failures`); process.exit(1); }
console.log('all checks passed');
