// Random exercises on the areas under motion graphs. A graph of the velocity v(t) or the
// acceleration a(t) of a body is given, and the graph one step up (v → s, a → v), whose changes
// are the areas under the given graph, has to be drawn.
//
// Every exercise is built from a pair (g, G) over 0 … T with five pieces sharing breakpoints:
//   g is continuous and piecewise linear: in each piece it is constant or changes linearly
//     from g0 to g1 (no jumps, so the motion is physically possible);
//   G is its integral with G(0) = c: a straight line where g is constant, a parabola where g
//     changes, joining smoothly (without a kink) at every breakpoint.
// g is given (straight pieces only) together with G(0), and G is drawn.
//
// The numbers can be read from the grid: g is a whole number at every breakpoint, and so is G
// (the area under g in every piece is whole).
//
// Difficulty 3–5 (the easier exercises come from concepts.js), one more for each piece beyond
// the first in which the given graph changes sign.
//
// An answer (drawn or correct) is a list of pieces {y0, ym, y1}: the values at the start, in the
// middle and at the end of the piece (a parabola through these three points). evaluate()
// compares an answer with the correct one piece by piece and names the likely mistake.
(function (root) {
  'use strict';

  const T = 10;                         // time axis: 0 … T s
  const N = 5;                          // pieces
  const VALUES = [-3, -2, -1, 0, 1, 2, 3]; // g at the breakpoints
  const BEND = 0.035;                   // a parabola deviates from its chord by ≥ 3.5 % of the height of its axis
  const MID_STEP = 0.25;                // the middle of a drawn piece snaps to this grid
  const TASKS = {
    vs: { from: 'v', to: 's', dir: 'int' },
    av: { from: 'a', to: 'v', dir: 'int' },
  };
  const LIMITS = { s: [-6, 30], v: [-12, 12] }; // range of G
  const G_AXIS = { lo: -4, hi: 4, label: 1, step: 0.5 };

  // ---------------------------------------------------------------- random numbers
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    return {
      next, int,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    };
  }

  // ---------------------------------------------------------------- pieces
  const len = (p) => p.t1 - p.t0;
  const sloped = (p) => p.g0 !== p.g1;
  const rate = (p) => (p.g1 - p.g0) / len(p);
  const gAt = (p, x) => p.g0 + rate(p) * x;                          // x = t − t0
  const GAt = (p, x) => p.G0 + p.g0 * x + (rate(p) / 2) * x * x;
  const area = (p) => (len(p) * (p.g0 + p.g1)) / 2;
  const bend = (y) => y.ym - (y.y0 + y.y1) / 2;                       // middle above the chord: > 0

  // The piece that holds time t (at a breakpoint, the one that starts there).
  const pieceAt = (ex, t) => ex.pieces.find((p) => t < p.t1) || ex.pieces[ex.pieces.length - 1];
  const g = (ex, t) => { const p = pieceAt(ex, t); return gAt(p, t - p.t0); };
  const G = (ex, t) => { const p = pieceAt(ex, t); return GAt(p, t - p.t0); };

  // Lengths 1–3 s adding up to T.
  function lengths(r) {
    for (;;) {
      const ls = Array.from({ length: N }, () => r.int(1, 3));
      if (ls.reduce((a, b) => a + b, 0) === T) return ls;
    }
  }

  // Axis for G: whole multiples of the label step, a little room above and below, 0 included.
  function axisOf(lo, hi, r) {
    const lo0 = Math.min(0, lo - r.int(0, 2)), hi0 = Math.max(0, hi + r.int(0, 3));
    const label = hi0 - lo0 <= 12 ? 2 : 5;
    const a = Math.floor(lo0 / label) * label, b = Math.ceil(hi0 / label) * label;
    return { lo: a, hi: b, label, step: b - a > 16 ? 1 : 0.5 };
  }

  function build(r, task) {
    const { from, to, dir } = TASKS[task];
    const Gq = to;
    const ls = lengths(r);
    const long = ls.map((L, i) => i).filter((i) => ls[i] >= 2);
    const nSloped = r.int(2, 3);
    if (long.length < nSloped) return null;
    const bent = new Set(r.shuffle(long).slice(0, nSloped));

    const ps = [];
    let t = 0, prev = null;
    ls.forEach((L, i) => {
      const g0 = prev !== null ? prev : r.pick(VALUES);
      const g1 = bent.has(i) ? r.pick(VALUES.filter((v) => Math.abs(v - g0) >= 2)) : g0;
      ps.push({ t0: t, t1: t + L, g0, g1 });
      t += L;
      prev = g1;
    });

    // whole areas, every breakpoint visible (the slope of g changes there)
    if (ps.some((p) => (len(p) * (p.g0 + p.g1)) % 2 !== 0)) return null;
    if (ps.some((p, i) => i > 0 && rate(p) === rate(ps[i - 1]))) return null;

    // G from 0, its extent (including turning points inside pieces), then the start value c
    let G0 = 0;
    for (const p of ps) { p.G0 = G0; G0 += area(p); }
    const vals = [];
    for (const p of ps) {
      vals.push(p.G0, GAt(p, len(p)));
      const x = sloped(p) ? -p.g0 / rate(p) : -1;
      if (x > 0 && x < len(p)) vals.push(GAt(p, x));
    }
    const m = Math.min(...vals), M = Math.max(...vals), span = M - m;
    if (span < 6) return null;
    const [lo, hi] = LIMITS[Gq];
    let cs = [];
    for (let c = Math.ceil(lo - m); c <= Math.floor(hi - M); c++) cs.push(c);
    if (!cs.length) return null;
    if (Gq === 's') { const near0 = cs.filter((c) => m + c >= 0 && m + c <= 3); if (near0.length) cs = near0; }
    const c = r.pick(cs);

    const pieces = ps.map((p) => ({ ...p, G0: p.G0 + c, G1: p.G0 + c + area(p), Gm: p.G0 + c + p.g0 * len(p) / 2 + ((p.g1 - p.g0) * len(p)) / 8 }));
    const Gaxis = axisOf(m + c, M + c, r);
    if (ps.some((p) => sloped(p) && (Math.abs(p.g1 - p.g0) * len(p)) / 8 < BEND * (Gaxis.hi - Gaxis.lo))) return null;
    const gValues = (p) => ({ y0: p.g0, ym: (p.g0 + p.g1) / 2, y1: p.g1 });
    const GValues = (p) => ({ y0: p.G0, ym: p.Gm, y1: p.G1 });
    const difficulty = 3 + Math.max(0, Math.min(2, ps.filter((p) => p.g0 * p.g1 < 0).length - 1));
    return {
      task, from, to, dir, pieces, c,
      difficulty,
      axes: { source: G_AXIS, target: Gaxis },
      source: pieces.map(gValues),
      answer: pieces.map(GValues),
    };
  }

  function make(task, seed) {
    const r = rng(seed);
    for (let k = 0; k < 20000; k++) {
      const ex = build(r, task);
      if (ex) { ex.id = `${task}-${seed}`; ex.seed = seed; return ex; }
    }
    throw new Error(`no exercise for ${task}-${seed}`);
  }

  // Other kinds of exercise (concepts.js: areas, who is farther, mean velocity; app.js: find the
  // error) register here: kind → { difficulties: [1–5], make(seed, d) } (d: the difficulty wanted,
  // or null for any).
  const KINDS = {};
  const register = (kind, def) => { KINDS[kind] = def; };

  // generate(key, seed): an exercise of a task (vs, av) or kind (area, …).
  function generate(key, seed) {
    if (TASKS[key]) return make(key, seed);
    return KINDS[key].make(seed, null);
  }

  // ---------------------------------------------------------------- checking an answer
  const near = (a, b, tol) => Math.abs(a - b) <= tol + 1e-9;
  const tolerance = (ex) => 0.4 * ex.axes.target.step;
  // How far the middle of a drawn parabola may be off: 35 % of its bend, but at least a little.
  const bendTolerance = (ex, bc) => Math.max(0.3, 0.012 * (ex.axes.target.hi - ex.axes.target.lo), 0.35 * Math.abs(bc));

  // Result per piece of G: { ok, codes } with the codes of the mistakes found. A piece is judged
  // by its change, so an earlier mistake does not count again:
  //   change: sign, rectStart / rectEnd (g at the start / end times Δt), unsigned (area below
  //   the axis counted positive), area (other);
  //   shape: straight (should be straight), curve (should be curved), bendDir, bendMore, bendLess.
  function evaluate(ex, ans) {
    const tol = tolerance(ex);
    return ex.pieces.map((p, i) => {
      const a = ans[i], c = ex.answer[i], codes = [];
      const D = a.y1 - a.y0, dG = c.y1 - c.y0, L = len(p);
      if (!near(D, dG, tol)) {
        const unsigned = p.g0 * p.g1 < 0 ? (L * (p.g0 * p.g0 + p.g1 * p.g1)) / (2 * Math.abs(p.g1 - p.g0)) : null;
        if (dG && near(D, -dG, tol)) codes.push('sign');
        else if (sloped(p) && near(D, p.g0 * L, tol)) codes.push('rectStart');
        else if (sloped(p) && near(D, p.g1 * L, tol)) codes.push('rectEnd');
        else if (unsigned !== null && (near(D, unsigned, tol) || near(D, -unsigned, tol))) codes.push('unsigned');
        else codes.push('area');
      }
      const bs = bend(a), bc = bend(c), btol = bendTolerance(ex, bc);
      if (!near(bs, bc, btol)) {
        if (!sloped(p)) codes.push('straight');
        else if (Math.abs(bs) <= bendTolerance(ex, 0)) codes.push('curve');
        else if (Math.sign(bs) !== Math.sign(bc)) codes.push('bendDir');
        else codes.push(Math.abs(bs) > Math.abs(bc) ? 'bendLess' : 'bendMore');
      }
      return { ok: !codes.length, codes };
    });
  }

  // The drawing has the shape of the given graph (same position on its own axis at the ends of
  // four pieces or more), but is not right.
  function copied(ex, ans) {
    const { source: sa, target: ta } = ex.axes;
    const ns = (v) => (v - sa.lo) / (sa.hi - sa.lo), nt = (v) => (v - ta.lo) / (ta.hi - ta.lo);
    const same = ex.source.filter((s, i) => Math.abs(nt(ans[i].y0) - ns(s.y0)) < 0.05 && Math.abs(nt(ans[i].y1) - ns(s.y1)) < 0.05).length;
    return same >= 4 && evaluate(ex, ans).some((r) => !r.ok);
  }

  // ---------------------------------------------------------------- check: four graphs to choose from
  // The right answer and three wrong ones from typical mistakes (flags as in evaluate(), plus
  // copy: the shape of the given graph): sign, copy, and rectStart (Δ = value at the start · Δt,
  // straight pieces) or curve (the right values at the breakpoints, but straight pieces). Every
  // option has its own axis, so that the scale does not give the answer away. null if two
  // options look alike.
  const lineThrough = (y0, y1) => ({ y0, ym: (y0 + y1) / 2, y1 });
  // Values along a piece drawn as a parabola through y0, ym, y1 (as in plot.js).
  const samples = (v) => Array.from({ length: 11 }, (x, k) => {
    const u = k / 10, c = 2 * v.ym - (v.y0 + v.y1) / 2;
    return (1 - u) * (1 - u) * v.y0 + 2 * u * (1 - u) * c + u * u * v.y1;
  });
  function axisFor(vals) {
    const ys = vals.flatMap(samples), lo = Math.min(0, Math.floor(Math.min(...ys)) - 1), hi = Math.max(0, Math.ceil(Math.max(...ys)) + 1);
    const label = hi - lo <= 12 ? 2 : 5;
    return { lo: Math.floor(lo / label) * label, hi: Math.ceil(hi / label) * label, label, step: 0.5 };
  }
  // the shape of the values `from`, stretched to the range of `to`, starting where `to` starts
  function stretch(from, to) {
    const ys = from.flatMap(samples), m = Math.min(...ys), M = Math.max(...ys);
    const ts = to.flatMap(samples), tm = Math.min(...ts), tM = Math.max(...ts);
    const k = M > m ? (tM - tm) / (M - m) : 1;
    const map = (y) => to[0].y0 + k * (y - from[0].y0);
    return from.map((v) => ({ y0: map(v.y0), ym: map(v.ym), y1: map(v.y1) }));
  }

  function quiz(ex, seed) {
    const r = rng(seed ^ 0x2545f491), right = ex.answer, opts = [{ vals: right, correct: true, flag: null }];
    const G0 = right[0].y0;
    opts.push({ vals: right.map((v) => ({ y0: 2 * G0 - v.y0, ym: 2 * G0 - v.ym, y1: 2 * G0 - v.y1 })), flag: 'sign' });
    opts.push({ vals: stretch(ex.source, right), flag: 'copy' });
    if (r.next() < 0.5) {
      let y = G0;
      opts.push({ vals: ex.pieces.map((p) => { const y0 = y; y += p.g0 * len(p); return lineThrough(y0, y); }), flag: 'rectStart' });
    } else {
      opts.push({ vals: right.map((v) => lineThrough(v.y0, v.y1)), flag: 'curve' });
    }
    // alike: no point of the drawn curves differs by more than a little of the axis
    const curveOf = (o) => o.vals.flatMap(samples);
    for (const o of opts) o.axis = axisFor(o.vals);
    for (let i = 0; i < opts.length; i++) {
      for (let j = i + 1; j < opts.length; j++) {
        const a = curveOf(opts[i]), b = curveOf(opts[j]), span = opts[0].axis.hi - opts[0].axis.lo;
        if (Math.max(...a.map((y, k) => Math.abs(y - b[k]))) < 0.08 * span) return null;
      }
    }
    return { options: r.shuffle(opts) };
  }

  // ---------------------------------------------------------------- find the error
  // A student's sketch of the answer with one piece wrong: { piece, code, vals }. Every other piece
  // changes by as much as it should (after the wrong one, the sketch is only shifted). The codes:
  // unsigned (the area below the t axis counted positive), rect (the change taken as the
  // rectangle g(start) · Δt, the piece bent as it should), curve (the right change, but straight
  // where it should be a parabola), bendDir (bent the wrong way). The sketch stays on the axis, and
  // its wrong piece differs visibly from the right one; the area below the axis counted positive
  // comes up most often. null if no piece can be got wrong so.
  const FLAWS = ['unsigned', 'rect', 'curve', 'bendDir'];
  function flaw(ex, seed) {
    const r = rng(seed ^ 0x1b873593), ax = ex.axes.target, span = ax.hi - ax.lo, cands = [];
    const onAxis = (vals) => vals.every((v) => samples(v).every((y) => y >= ax.lo - 1e-9 && y <= ax.hi + 1e-9));
    ex.pieces.forEach((p, i) => {
      const c = ex.answer[i], dG = c.y1 - c.y0, b = bend(c), L = len(p);
      // the change and the bend of the wrong piece
      const below = Math.min(p.g0, p.g1) < 0;
      const all = p.g0 * p.g1 < 0 ? (L * (p.g0 * p.g0 + p.g1 * p.g1)) / (2 * Math.abs(p.g1 - p.g0)) : Math.abs(area(p));
      const wrong = {
        unsigned: below && Math.abs(all - dG) >= 1 ? { d: all, b: p.g0 * p.g1 < 0 ? b : -b } : null,
        // (the rectangle only where it has the sign of the right change: else it would look like a
        // sign error)
        rect: sloped(p) && Math.abs(p.g0 * L - dG) >= 1 && p.g0 * L * dG > 0 ? { d: p.g0 * L, b } : null,
        curve: sloped(p) && Math.abs(b) >= 0.04 * span ? { d: dG, b: 0 } : null,
        bendDir: sloped(p) && Math.abs(b) >= 0.03 * span ? { d: dG, b: -b } : null,
      };
      // a sketch that two mistakes would explain is left out
      const same = (v, w) => w && Math.abs(v.d - w.d) < 0.5 && Math.abs(v.b - w.b) < 0.25;
      for (const code of FLAWS) {
        const v = wrong[code];
        if (!v || FLAWS.some((o) => o !== code && same(v, wrong[o]))) continue;
        const shift = v.d - dG;
        const vals = ex.answer.map((x, k) => (k < i ? x : k > i ? { y0: x.y0 + shift, ym: x.ym + shift, y1: x.y1 + shift }
          : { y0: x.y0, ym: x.y0 + v.d / 2 + v.b, y1: x.y0 + v.d }));
        if (onAxis(vals)) cands.push({ piece: i, code, vals });
      }
    });
    if (!cands.length) return null;
    // mostly a mistake in the area (its sign, or a rectangle instead of a trapezoid), sometimes one
    // in the shape
    const unsigned = cands.filter((x) => x.code === 'unsigned'), rect = cands.filter((x) => x.code === 'rect'), u = r.next();
    if (unsigned.length && u < 0.45) return r.pick(unsigned);
    if (rect.length && u < 0.75) return r.pick(rect);
    return r.pick(cands);
  }

  const api = { T, N, TASKS, KINDS, register, rng, BEND, MID_STEP, G_AXIS, FLAWS, generate, quiz, flaw, evaluate, copied, g, G, gAt, GAt, len, sloped, rate, area, bend };
  root.Motion = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
