// Verifies the exercises on slopes of motion graphs: run with
// `node motion-graphs/test/check-generator.js`. For many seeds of both drawing tasks (s → v, v → a)
// it checks that
// - the five pieces cover 0 … T, last 1–3 s, and 2–3 of them are parabolas in G (sloped in g),
// - g and G are continuous, G' = g (numerically), g and G are whole numbers at the breakpoints,
// - both graphs stay on their axes, every breakpoint is visible and every parabola bends visibly,
// - the slope of every parabola can be read at both ends (readable()), and the reasons given are
//   true (horizontal tangent, smooth join),
// - the correct answer lies on the snapping grid and evaluate() accepts it,
// - typical mistakes are recognised: the mirror image (sign), the average slope of a parabola, a
//   sloped line for a constant slope, and a copy of the given graph,
// - both diagrams render,
// - the options of the check (quiz()): one right, and every wrong one is judged wrong by
//   evaluate(), with the mistake it stands for,
// - find the error (flaw()): exactly the wrong piece is judged wrong, with its mistake.
// Then the quiz exercises (concepts.js) and the questions of the check's objectives.
'use strict';

require('../lang.js');
const M = require('../generator.js');
const P = require('../plot.js');
const C = require('../concepts.js');

const SAMPLES = 2000;
let failures = 0;
const fail = (msg) => { failures++; if (failures < 30) console.error('  FAIL ' + msg); };
const whole = (x) => Math.abs(x - Math.round(x)) < 1e-9;
const onGrid = (x, step) => Math.abs(x / step - Math.round(x / step)) < 1e-9;
const codes = (ex, ans) => M.evaluate(ex, ans).map((r) => r.codes);

for (const task of Object.keys(M.TASKS)) {
  const t0 = Date.now();
  const seen = new Set(), found = {};
  let zeros = 0;
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const tag = `${task}-${seed}`;
    const ex = M.generate(task, seed);
    const ps = ex.pieces;
    seen.add(JSON.stringify(ps));

    if (ps.length !== 5 || ps[0].t0 !== 0 || ps[4].t1 !== M.T || ps.some((p, i) => i && p.t0 !== ps[i - 1].t1)) fail(`${tag}: pieces do not cover the time axis`);
    if (ps.some((p) => M.len(p) < 1 || M.len(p) > 3)) fail(`${tag}: piece length`);
    const nSloped = ps.filter(M.sloped).length;
    if (nSloped < 2 || nSloped > 3) fail(`${tag}: ${nSloped} parabolas`);
    ps.forEach((p, i) => {
      if (![p.g0, p.g1, p.G0, p.G1].every(whole)) fail(`${tag}: piece ${i + 1} not whole at the breakpoints`);
      if (i > 0 && Math.abs(p.G0 - ps[i - 1].G1) > 1e-9) fail(`${tag}: G jumps at ${p.t0} s`);
      if (i > 0 && M.rate(p) === M.rate(ps[i - 1])) fail(`${tag}: invisible breakpoint at ${p.t0} s`);
      if (i > 0 && p.g0 !== ps[i - 1].g1) fail(`${tag}: g jumps at ${p.t0} s`);
      if (Math.abs(M.GAt(p, M.len(p) / 2) - p.Gm) > 1e-9) fail(`${tag}: middle of piece ${i + 1}`);
    });

    // G' = g, both on their axes
    const { source, target } = ex.axes;
    const [gAx, GAx] = [target, source];
    for (let k = 0; k <= 1000; k++) {
      const t = (k * M.T) / 1000, h = 1e-5;
      const G = M.G(ex, t), g = M.g(ex, t);
      if (G < GAx.lo - 1e-9 || G > GAx.hi + 1e-9) { fail(`${tag}: G off the axis at ${t} s`); break; }
      if (g < gAx.lo || g > gAx.hi) { fail(`${tag}: g off the axis at ${t} s`); break; }
      if (t > h && t < M.T - h && !ps.some((p) => Math.abs(p.t0 - t) < 2 * h)) {
        const dG = (M.G(ex, t + h) - M.G(ex, t - h)) / (2 * h);
        if (Math.abs(dG - g) > 1e-4) { fail(`${tag}: G' ≠ g at ${t} s`); break; }
      }
    }
    const span = GAx.hi - GAx.lo;
    for (const p of ps.filter(M.sloped)) {
      if ((Math.abs(p.g1 - p.g0) * M.len(p)) / 8 < M.BEND * span - 1e-9) fail(`${tag}: parabola ${p.t0}–${p.t1} s barely bends`);
      const x = -p.g0 / M.rate(p);
      if (x > 0 && x < M.len(p)) zeros++;
    }

    // the slopes of the parabolas can be read
    const how = M.readable(ps);
    if (!how) fail(`${tag}: slopes cannot be read`);
    else how.forEach((h, i) => {
      const p = ps[i];
      if (h.start === 'vertex' && p.g0 !== 0) fail(`${tag}: no horizontal tangent at the start of piece ${i + 1}`);
      if (h.end === 'vertex' && p.g1 !== 0) fail(`${tag}: no horizontal tangent at the end of piece ${i + 1}`);
      if (h.start === 'join' && ps[i - 1].g1 !== p.g0) fail(`${tag}: no smooth join at the start of piece ${i + 1}`);
      if (h.end === 'join' && ps[i + 1].g0 !== p.g1) fail(`${tag}: no smooth join at the end of piece ${i + 1}`);
    });

    // answers
    const step = ex.axes.target.step;
    if (ex.answer.some((a) => !onGrid(a.y0, step) || !onGrid(a.y1, step))) fail(`${tag}: answer off the snapping grid`);
    if (M.evaluate(ex, ex.answer).some((r) => !r.ok)) fail(`${tag}: correct answer rejected`);
    const expect = (ans, i, code, what) => {
      const c = codes(ex, ans)[i];
      if (!c.includes(code)) fail(`${tag}: ${what} in piece ${i + 1} gives ${JSON.stringify(c)}, not ${code}`);
      else found[code] = (found[code] || 0) + 1;
    };
    const mirror = ex.answer.map((a) => ({ y0: -a.y0, ym: -a.ym, y1: -a.y1 }));
    ps.forEach((p, i) => { if (p.g0 || p.g1) expect(mirror, i, 'sign', 'mirror image'); });
    const average = ex.answer.map((a) => { const m = (a.y0 + a.y1) / 2; return { y0: m, ym: m, y1: m }; });
    ps.forEach((p, i) => { if (M.sloped(p) && onGrid((p.g0 + p.g1) / 2, step)) expect(average, i, 'average', 'average slope'); });
    const tilted = ex.answer.map((a) => ({ y0: a.y0 - 1, ym: a.ym, y1: a.y1 + 1 }));
    ps.forEach((p, i) => { if (!M.sloped(p)) expect(tilted, i, 'notConst', 'sloped line'); });
    // a copy of the given graph, scaled to the other axis
    const { lo: sl, hi: sh } = ex.axes.source, { lo: tl, hi: th } = ex.axes.target;
    const map = (v) => Math.round((tl + ((v - sl) / (sh - sl)) * (th - tl)) / step) * step;
    const copy = ex.source.map((s) => ({ y0: map(s.y0), ym: map(s.ym), y1: map(s.y1) }));
    if (M.evaluate(ex, copy).some((r) => !r.ok)) {
      if (!M.copied(ex, copy)) fail(`${tag}: copy not recognised`);
      else found.copy = (found.copy || 0) + 1;
    }
    if (M.copied(ex, ex.answer)) fail(`${tag}: correct answer taken for a copy`);

    // diagrams
    for (const s of [P.sourceGraph(ex), P.targetGraph(ex, ex.answer, { solution: true, marks: ps.map(() => 'ok'), active: 'n1' })]) {
      if (/NaN|undefined/.test(s)) fail(`${tag}: diagram`);
    }
  }
  console.log(`${task}: ${SAMPLES} seeds, ${seen.size} distinct, ${(zeros / SAMPLES).toFixed(2)} turning points per graph, ${Date.now() - t0} ms`);
  console.log(`  mistakes recognised: ${JSON.stringify(found)}`);
}

for (const task of Object.keys(M.TASKS)) {
  for (let seed = 1; seed <= 300; seed++) {
    const ex = M.generate(task, seed);
    if (![3, 4].includes(ex.difficulty)) fail(`${task}-${seed}: difficulty ${ex.difficulty}`);
  }
}

// the options of the check
const CODE = { sign: 'sign', average: 'average' };
for (const task of Object.keys(M.TASKS)) {
  let none = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const ex = M.generate(task, seed), tag = `quiz ${task}/${seed}`;
    const q = M.quiz(ex, seed);
    if (!q) { none++; continue; }
    if (q.options.length !== 4 || q.options.filter((o) => o.correct).length !== 1) fail(`${tag}: options`);
    for (const o of q.options) {
      const res = M.evaluate(ex, o.vals);
      if (!!o.correct !== res.every((r) => r.ok)) fail(`${tag}: option ${o.flag} judged ${res.every((r) => r.ok) ? 'right' : 'wrong'}`);
      if (CODE[o.flag] && !res.some((r) => r.codes.includes(CODE[o.flag]))) fail(`${tag}: option ${o.flag} not recognised: ${JSON.stringify(res.map((r) => r.codes))}`);
      if (o.vals.some((v) => [v.y0, v.ym, v.y1].some((y) => y < o.axis.lo - 1e-9 || y > o.axis.hi + 1e-9))) fail(`${tag}: option ${o.flag} off its axis`);
      if (/NaN|undefined/.test(P.answerGraph(ex, { vals: o.vals, axis: o.axis }))) fail(`${tag}: option diagram`);
    }
  }
  console.log(`quiz, ${task}: ${none} of 500 seeds give options that look alike`);
}

// find the error: one wrong piece, judged wrong with its mistake; the others right
const FLAW_CODE = { sign: 'sign', average: 'average', direction: 'direction' };
for (const task of Object.keys(M.TASKS)) {
  const count = {};
  for (let seed = 1; seed <= 1000; seed++) {
    const ex = M.generate(task, seed), f = M.flaw(ex, seed), tag = `flaw ${task}/${seed}`;
    if (!f) { fail(`${tag}: no flaw`); continue; }
    count[f.code] = (count[f.code] || 0) + 1;
    const res = M.evaluate(ex, f.vals), ax = ex.axes.target;
    // a curved piece has the right ends, which is all evaluate() compares
    if (f.code === 'curve') {
      const v = f.vals[f.piece], c = ex.answer[f.piece];
      if (res.some((r) => !r.ok) || v.y0 !== c.y0 || v.y1 !== c.y1 || Math.abs(v.ym - c.ym) < 1) fail(`${tag}: curve not only bent in its middle`);
    } else res.forEach((r, i) => { if (r.ok !== (i !== f.piece)) fail(`${tag}: piece ${i + 1} judged ${r.ok ? 'right' : 'wrong'} (${f.code} in piece ${f.piece + 1})`); });
    if (FLAW_CODE[f.code] && !res[f.piece].codes.includes(FLAW_CODE[f.code])) fail(`${tag}: ${f.code} not recognised: ${JSON.stringify(res[f.piece].codes)}`);
    if (f.vals.some((v) => [v.y0, v.ym, v.y1].some((y) => y < ax.lo - 1e-9 || y > ax.hi + 1e-9))) fail(`${tag}: sketch off its axis`);
  }
  if (Object.keys(count).length !== M.FLAWS.length) fail(`flaw ${task}: not every mistake comes up: ${JSON.stringify(count)}`);
  console.log(`flaw, ${task}: ${JSON.stringify(count)}`);
}

// ---------------------------------------------------------------- the quiz exercises (concepts.js)
// For every kind and difficulty: one right option per choice, distinct options, an explanation for
// every wrong one, traps different from the answer, numbers in steps of 0.05, and answers that
// agree with the motion behind the exercise (data), worked out again here; four valid options for
// the check; the same in German, without ß.
const Lang = require('../lang.js');
const near = (a, b) => Math.abs(a - b) < 1e-6;
const nice = (x) => near(Math.round(x * 20), x * 20);
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const kind of C.KINDS) {
    for (const d of C.DIFF[kind]) {
      for (let seed = 1; seed <= 300; seed++) {
        const tag = `${lang} ${kind}/${d}/${seed}`;
        let ex;
        try { ex = C.make(kind, seed, d); } catch (e) { fail(`${tag}: ${e.message}`); continue; }
        if (ex.difficulty !== d) fail(`${tag}: difficulty ${ex.difficulty}`);
        if (/NaN|undefined|Infinity|\[object/.test(JSON.stringify(ex))) fail(`${tag}: NaN/undefined`);
        if (lang === 'de' && /ß/.test(JSON.stringify(ex))) fail(`${tag}: ß`);
        if (ex.hints.length < 3 || ex.steps.length < 2) fail(`${tag}: hints or steps missing`);
        for (const q of ex.questions) {
          if (q.type === 'choice' && q.options.filter((o) => o.correct).length !== 1) fail(`${tag}: ${q.key} has not one right option`);
          if (q.type === 'multi' && !q.options.some((o) => o.correct)) fail(`${tag}: ${q.key} has no right option`);
          if (q.options && new Set(q.options.map((o) => o.html)).size !== q.options.length) fail(`${tag}: ${q.key} options alike`);
          if (q.options && q.options.some((o) => !o.correct && !o.why)) fail(`${tag}: ${q.key} wrong option without why`);
          if (q.type === 'num') {
            if (!nice(q.value)) fail(`${tag}: ${q.key} = ${q.value} not in steps of 0.05`);
            if (q.traps.some((t) => Math.abs(t.value - q.value) < 0.05)) fail(`${tag}: ${q.key} trap equals the answer`);
            if (q.traps.some((t) => !nice(t.value))) fail(`${tag}: ${q.key} trap not in steps of 0.05`);
          }
        }
        const qOf = (key) => ex.questions.find((q) => q.key === key);
        const right = (key) => qOf(key).options.filter((o) => o.correct).map((o) => o.html);
        const D = ex.data;
        if (kind === 'compare') {
          const v = (p) => (p[1] - p[0]) / 10, vF = v(D.fast === 'A' ? D.A : D.B), vS = v(D.fast === 'A' ? D.B : D.A);
          if (!(Math.abs(vF) > Math.abs(vS))) fail(`${tag}: ${D.fast} is not faster`);
          if (!right('faster')[0].startsWith(D.fast)) fail(`${tag}: wrong answer to faster`);
          if (!near(qOf('v').value, v(D.asked === 'A' ? D.A : D.B))) fail(`${tag}: wrong velocity`);
          if (d === 2 && !(vF < 0)) fail(`${tag}: the faster one should move backwards`);
        }
        if (kind === 'direction') {
          const want = D.pieces.filter((p) => p.s1 < p.s0).length;
          if (right('neg').length !== want) fail(`${tag}: negative intervals`);
          if (!near(qOf('v').value, (D.asked.s1 - D.asked.s0) / (D.asked.t1 - D.asked.t0))) fail(`${tag}: wrong velocity`);
        }
        if (kind === 'table') {
          const back = D.rows.filter((r) => r.values.every((v, k) => k === 0 || v < r.values[k - 1])).map((r) => r.name);
          if (right('back').join() !== back.join() && right('back').slice().sort().join() !== back.slice().sort().join()) fail(`${tag}: always backwards ${right('back')} vs ${back}`);
          const U = D.rows.find((r) => r.name === D.uniform);
          if (!near(qOf('v').value, (U.values[1] - U.values[0]) / 5)) fail(`${tag}: wrong velocity`);
        }
        if (kind === 'match') {
          // the right graph is the slope of the given one, piece by piece
          if (qOf('graph').options.length !== 4) fail(`${tag}: ${qOf('graph').options.length} options`);
          if (d === 2 && D.pieces.some((p) => !near(p.v, (p.s1 - p.s0) / (p.t1 - p.t0)))) fail(`${tag}: wrong v`);
          if (d >= 3 && D.pieces.some((p) => !near(p.a, (p.v1 - p.v0) / (p.t1 - p.t0)))) fail(`${tag}: wrong a`);
          if (d === 4 && D.pieces.some((p, i) => i && !near(p.v0, D.pieces[i - 1].v1))) fail(`${tag}: v jumps`);
        }
        // every curve of a graph inside its plot (y from 30 to 192 in figs.js)
        const graphs = [ex.figure, ...ex.steps.map((x) => x.figure), ...ex.questions.flatMap((q) => (q.pics ? q.options.map((o) => o.html) : []))];
        for (const g of graphs) {
          for (const m of g.matchAll(/class="curve[^"]*" d="M([^"]+)"/g)) {
            if (m[1].split(/ ?L/).some((pt) => { const y = Number(pt.split(',')[1]); return y < 29.5 || y > 192.5; })) { fail(`${tag}: a curve off its axis`); break; }
          }
        }
        const a = C.question(ex, seed);
        if (a.options.length !== 4 || a.options.filter((o) => o.correct).length !== 1 || new Set(a.options.map((o) => o.html)).size !== 4) fail(`${tag}: check options`);
      }
    }
  }
}

// ---------------------------------------------------------------- the check
// The quiz kinds of the objectives in app.js (kind:difficulty); the drawing tasks and find the
// error are checked above.
const OBJECTIVES = { slope: ['compare:1', 'compare:2'], negative: ['direction:2', 'table:2'], sketch: ['match:2'], uniform: ['match:3', 'match:4'] };
for (const lang of ['en', 'de']) {
  Lang.set(lang, true);
  for (const [id, kinds] of Object.entries(OBJECTIVES)) {
    for (const kind of kinds) {
      const [k, d] = kind.split(':');
      for (let seed = 1; seed <= 300; seed++) {
        const tag = `${lang} check ${id} ${kind}/${seed}`;
        const ex = M.KINDS[k].make(seed, Number(d)), q = C.question(ex, seed);
        if (!q.ask || q.options.length !== 4 || q.options.filter((o) => o.correct).length !== 1 || new Set(q.options.map((o) => o.html)).size !== 4) fail(`${tag}: options`);
        if (q.options.some((o) => !o.correct && !o.why)) fail(`${tag}: wrong option without why`);
      }
    }
  }
}
Lang.set('en', true);
console.log(`${C.KINDS.length} kinds and ${Object.keys(OBJECTIVES).length} objectives checked`);

if (failures) { console.error(`\n${failures} failures`); process.exit(1); }
console.log('Generator OK');
