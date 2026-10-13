// Verifies the cyclic processes (generator.js, plot.js): run with `node cyclic-processes/test/check-generator.js`.
// For many seeds of every exercise type, in both languages, it checks that
// - every cycle is valid: its states on the grid and distinct, no two neighbouring steps on one
//   line, the loop not crossing itself; and that each step is the process its description says,
// - every question has exactly one right option (a choice, a diagram) and the options differ,
//   also as drawings; the statements to tick have one to four right ones, each with a reason,
// - a drawing can be done: every state lies on a tick crossing of its diagram, a click there is
//   right and a click elsewhere gets a reason,
// - the state table keeps pV/T the same in every state,
// - all texts are complete, and every diagram renders.
'use strict';

const Lang = require('../lang.js');
const C = require('../generator.js');
const D = require('../plot.js');

let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const bad = (html) => /undefined|NaN|null|\[object|Infinity/.test(html);
const eq = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

const TYPES = ['lines-pV', 'lines-pT', 'lines-VT', 'match-pV', 'match-pT', 'match-VT', 'match-mix', 'close-pV', 'close-pT', 'close-VT', 'statements-pV', 'statements-pT', 'statements-VT',
  'switch-pV-pT', 'switch-pV-VT', 'switch-pT-pV', 'switch-VT-pV', 'switch-pT-VT', 'switch-VT-pT', 'draw-pV', 'draw-pT', 'draw-VT', 'error-pV', 'error-pT', 'error-VT', 'table'];
const SEEDS = 120;

// each step is the process its description says
function checkCycle(tag, c, described = true) {
  if (!C.valid(c)) fail(`${tag}: cycle not valid`);
  for (const s of c.segs) if (!s.closing && described && C.classify(c.states[s.from], c.states[s.to]) !== s.type) fail(`${tag}: step ${s.from} is not ${s.type}`);
}

let n = 0;
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const type of TYPES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const tag = `${lang} ${type}-${seed}`, e = C.generate(type, seed);
      n++;
      if (e.cycle && e.kind !== 'error') checkCycle(tag, e.cycle);
      for (const q of e.questions) {
        if (q.type === 'multi') {
          const right = q.statements.filter((s) => s.ok).length;
          if (q.statements.length !== 5 || right < 1 || right > 4) fail(`${tag}: ${q.statements.length} statements, ${right} right`);
          if (new Set(q.statements.map((s) => s.html)).size !== q.statements.length) fail(`${tag}: a statement twice`);
          if (q.statements.some((s) => !s.why || bad(s.html + s.why))) fail(`${tag}: a statement without a reason`);
          continue;
        }
        const right = q.options.filter((o) => o.ok).length;
        if (right !== 1) fail(`${tag}: ${q.key} has ${right} right options`);
        if (q.type === 'pick') {
          if (q.options.length !== 4) fail(`${tag}: ${q.options.length} diagrams`);
          const svgs = q.options.map((o) => D.diagram(o.fig).replace(/cl\d+/g, ''));
          if (new Set(svgs).size !== 4) fail(`${tag}: two options look the same`);
          q.options.forEach((o) => { checkCycle(`${tag} option`, o.fig.cycle, false); if (!o.ok && !o.why) fail(`${tag}: a wrong option without a reason`); });
        } else {
          if (new Set(q.options.map((o) => o.label)).size !== q.options.length) fail(`${tag}: ${q.key} options not distinct: ${q.options.map((o) => o.label)}`);
          if (q.options.length < 2 || q.options.some((o) => !o.ok && !o.why)) fail(`${tag}: ${q.key} options or reasons missing`);
        }
        if (bad(JSON.stringify(q))) fail(`${tag}: texts of ${q.key}`);
      }
      if (bad(e.text + e.hints.join('') + e.solution.join(''))) fail(`${tag}: texts`);
      if (e.kind === 'draw') {
        if (!e.ax.onTicks) fail(`${tag}: a state off the ticks`);
        e.cycle.segs.filter((s) => !s.closing).forEach((s) => {
          const a = e.cycle.states[s.from], b = e.cycle.states[s.to], [x, y] = C.coord(e.diagram, b);
          if (C.judgePoint(e.diagram, s, a, b, x, y) !== '') fail(`${tag}: the right point is judged wrong`);
          if (C.judgePoint(e.diagram, s, a, b, x + e.ax.x.step, y) === '') fail(`${tag}: a wrong point is judged right`);
        });
      }
      if (e.kind === 'table') {
        const r = e.real, k = e.cycle.states.map((s) => (s.p * r.p * s.V * r.V) / (C.T(s) * r.T));
        if (!k.every((x) => eq(x, k[0]))) fail(`${tag}: pV/T changes`);
      }
      if (e.kind === 'error') {
        const wrong = e.questions[0].options.find((o) => o.ok).label;
        if (!wrong.startsWith(C.nameOf(e.wrongStep))) fail(`${tag}: the wrong step is not the one marked`);
      }
      const svg = e.kind === 'lines' ? D.linesDiagram(e.diagram, e.lines) : e.cycle ? D.diagram({ cycle: e.cycle, diagram: e.diagram, straight: e.straight }) : '';
      if (/NaN|undefined/.test(svg)) fail(`${tag}: diagram`);
    }
  }
}
console.log(`exercises: ${n}`);
if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log('Cyclic processes OK');
