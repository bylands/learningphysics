// Random exercises on the slopes of motion graphs. A graph of the position s(t) or the velocity
// v(t) of a body is given, and the graph of its slope, one step down (s → v, v → a), has to be
// drawn.
//
// Every exercise is built from a pair (g, G) over 0 … T with five pieces sharing breakpoints:
//   g is continuous and piecewise linear: in each piece it is constant or changes linearly
//     from g0 to g1 (no jumps, so the motion is physically possible);
//   G is its integral with G(0) = c: a straight line where g is constant, a parabola where g
//     changes, joining smoothly (without a kink) at every breakpoint.
// G is given (straight and parabolic pieces) and g is drawn.
//
// The numbers can be read from the grid: g is a whole number at every breakpoint, and so is G
// (the area under g in every piece is whole). The slope of every parabola can be worked out at
// one of its ends (a horizontal tangent, or the smooth join to a piece whose slope is known); the
// other end then follows from ΔG/Δt = (g_start + g_end)/2.
//
// Difficulty 3, or 4 when an end value has to come from the mean value (the easier exercises
// come from concepts.js).
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
  const TASKS = {
    sv: { from: 's', to: 'v', dir: 'diff' },
    va: { from: 'v', to: 'a', dir: 'diff' },
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

  // How the slope of G can be read at the start and end of each piece:
  // 'line' (straight piece), 'vertex' (horizontal tangent), 'join' (smooth join to a known
  // neighbour) or 'mean' (from the other end and ΔG/Δt). null if some slope cannot be read.
  function readable(ps) {
    const how = ps.map((p) => (sloped(p) ? { start: null, end: null } : { start: 'line', end: 'line' }));
    for (let changed = true; changed;) {
      changed = false;
      ps.forEach((p, i) => {
        const h = how[i];
        const set = (end, why) => { if (!h[end]) { h[end] = why; changed = true; } };
        if (p.g0 === 0) set('start', 'vertex');
        if (p.g1 === 0) set('end', 'vertex');
        if (i > 0 && ps[i - 1].g1 === p.g0 && how[i - 1].end) set('start', 'join');
        if (i < ps.length - 1 && ps[i + 1].g0 === p.g1 && how[i + 1].start) set('end', 'join');
        if (h.start && !h.end) set('end', 'mean');
        if (h.end && !h.start) set('start', 'mean');
      });
    }
    return how.every((h) => h.start && h.end) ? how : null;
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
    const Gq = from;
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
    const how = readable(ps);
    if (!how) return null;

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
    const difficulty = 3 + Math.min(1, how.filter((h) => h.start === 'mean' || h.end === 'mean').length);
    return {
      task, from, to, dir, pieces, c, how,
      difficulty,
      axes: { source: Gaxis, target: G_AXIS },
      source: pieces.map(GValues),
      answer: pieces.map(gValues),
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

  // Other kinds of exercise (concepts.js: comparing speeds, direction, value tables, matching
  // graphs; app.js: find the error) register here: kind → { difficulties: [1–5], make(seed, d) }
  // (d: the difficulty wanted, or null for any).
  const KINDS = {};
  const register = (kind, def) => { KINDS[kind] = def; };

  // generate(key, seed): an exercise of a task (sv, va) or kind (compare, …).
  function generate(key, seed) {
    if (TASKS[key]) return make(key, seed);
    return KINDS[key].make(seed, null);
  }

  // ---------------------------------------------------------------- checking an answer
  const near = (a, b, tol) => Math.abs(a - b) <= tol + 1e-9;
  const tolerance = (ex) => 0.4 * ex.axes.target.step;

  // Result per piece of g: { ok, codes } with the codes of the mistakes found: sign, value
  // (constant, wrong value), notConst (should be constant), average (constant at the average
  // ΔG/Δt), notLinear (constant, should change), direction (changes the wrong way), start, end,
  // ends (wrong value at that end / both ends).
  function evaluate(ex, ans) {
    const tol = tolerance(ex);
    return ex.pieces.map((p, i) => {
      const a = ans[i], c = ex.answer[i], codes = [];
      const s0 = near(a.y0, c.y0, tol), s1 = near(a.y1, c.y1, tol);
      if (s0 && s1) return { ok: true, codes };
      if ((c.y0 || c.y1) && near(a.y0, -c.y0, tol) && near(a.y1, -c.y1, tol)) codes.push('sign');
      else if (!sloped(p)) codes.push(near(a.y0, a.y1, tol) ? 'value' : 'notConst');
      else if (near(a.y0, a.y1, tol)) codes.push(near(a.y0, (c.y0 + c.y1) / 2, tol) ? 'average' : 'notLinear');
      else if (Math.sign(a.y1 - a.y0) !== Math.sign(c.y1 - c.y0)) codes.push('direction');
      else codes.push(s0 ? 'end' : s1 ? 'start' : 'ends');
      return { ok: false, codes };
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
  // copy: the shape of the given graph): sign, average (the mean value for the whole piece),
  // copy. null if two options look alike.
  const flat = (y) => ({ y0: y, ym: y, y1: y });
  const mirror = (v) => ({ y0: -v.y0, ym: -v.ym, y1: -v.y1 });
  // Values along a piece drawn as a parabola through y0, ym, y1 (as in plot.js).
  const samples = (v) => Array.from({ length: 11 }, (x, k) => {
    const u = k / 10, c = 2 * v.ym - (v.y0 + v.y1) / 2;
    return (1 - u) * (1 - u) * v.y0 + 2 * u * (1 - u) * c + u * u * v.y1;
  });
  // the shape of the values `from`, stretched to the range of `to`
  function stretch(from, to) {
    const ys = from.flatMap(samples), m = Math.min(...ys), M = Math.max(...ys);
    const ts = to.flatMap(samples), tm = Math.min(...ts), tM = Math.max(...ts);
    const k = M > m ? (tM - tm) / (M - m) : 1;
    const map = (y) => tm + k * (y - m);
    return from.map((v) => ({ y0: map(v.y0), ym: map(v.ym), y1: map(v.y1) }));
  }

  function quiz(ex, seed) {
    const r = rng(seed ^ 0x2545f491), right = ex.answer, opts = [{ vals: right, correct: true, flag: null }];
    opts.push({ vals: right.map(mirror), flag: 'sign' });
    opts.push({ vals: right.map((v) => flat((v.y0 + v.y1) / 2)), flag: 'average' });
    opts.push({ vals: stretch(ex.source, [flat(-3), flat(3)]), flag: 'copy' });
    // alike: no point of the drawn curves differs by more than a little of the axis
    const curveOf = (o) => o.vals.flatMap(samples), span = G_AXIS.hi - G_AXIS.lo;
    for (const o of opts) o.axis = G_AXIS;
    for (let i = 0; i < opts.length; i++) {
      for (let j = i + 1; j < opts.length; j++) {
        const a = curveOf(opts[i]), b = curveOf(opts[j]);
        if (Math.max(...a.map((y, k) => Math.abs(y - b[k]))) < 0.08 * span) return null;
      }
    }
    return { options: r.shuffle(opts) };
  }

  // ---------------------------------------------------------------- find the error
  // A student's sketch of the answer with one piece wrong: { piece, code, vals }. The codes:
  // height (the value of G drawn instead of its slope), sign (the slope with the wrong sign),
  // average (the mean slope of a parabola drawn for the whole piece), direction (g changes the
  // wrong way: its end values swapped), curve (g curved like the parabola of G, though it changes
  // linearly; the only one that keeps the sketch without jumps, so it comes up in half of them).
  // The wrong piece stays on the axis and differs from the right one by at least 1 (curve: in
  // its middle); only its own mistake describes it (a sign error in a sloped piece, say, also
  // makes g change the wrong way, so it is left out).
  const FLAWS = ['height', 'sign', 'average', 'direction', 'curve'];
  function flaw(ex, seed) {
    const r = rng(seed ^ 0x1b873593), ax = ex.axes.target, cands = [];
    const onAxis = (v) => [v.y0, v.ym, v.y1].every((y) => y >= ax.lo && y <= ax.hi);
    const opposite = (x, y) => (x >= 0.5 && y <= -0.5) || (x <= -0.5 && y >= 0.5);
    // the mistakes that describe a wrong piece v of the right piece c
    const describes = (v, c, p) => ({
      sign: ['y0', 'ym', 'y1'].some((k) => opposite(v[k], c[k])),
      average: sloped(p) && Math.abs(v.y1 - v.y0) < 0.5,
      direction: sloped(p) && opposite(v.y1 - v.y0, c.y1 - c.y0),
      curve: sloped(p) && Math.abs(v.ym - (v.y0 + v.y1) / 2) >= 0.5,
    });
    ex.pieces.forEach((p, i) => {
      const c = ex.answer[i], G = ex.source[i];
      // the bow of the parabola of G, copied: at least 1 out of the straight line in the middle
      const bow = Math.sign(G.ym - (G.y0 + G.y1) / 2) * Math.max(1, Math.abs(c.y1 - c.y0) / 4);
      const wrong = {
        height: { ...G },
        sign: mirror(c),
        average: sloped(p) ? flat((c.y0 + c.y1) / 2) : null,
        direction: sloped(p) ? { y0: c.y1, ym: c.ym, y1: c.y0 } : null,
        curve: sloped(p) && bow ? { y0: c.y0, ym: c.ym + bow, y1: c.y1 } : null,
      };
      // a sketch that two mistakes would explain is left out
      const same = (v, w) => w && Math.abs(v.y0 - w.y0) < 0.5 && Math.abs(v.ym - w.ym) < 0.5 && Math.abs(v.y1 - w.y1) < 0.5;
      for (const code of FLAWS) {
        const v = wrong[code];
        if (!v || !onAxis(v) || FLAWS.some((o) => o !== code && same(v, wrong[o]))) continue;
        const off = code === 'curve' ? Math.abs(v.ym - c.ym) : Math.max(Math.abs(v.y0 - c.y0), Math.abs(v.y1 - c.y1));
        if (off < 1) continue;
        const d = describes(v, c, p);
        if (Object.keys(d).some((k) => d[k] && k !== code) || (code !== 'height' && !d[code])) continue;
        cands.push({ piece: i, code, vals: ex.answer.map((x, k) => (k === i ? v : x)) });
      }
    });
    const curves = cands.filter((x) => x.code === 'curve'), heights = cands.filter((x) => x.code === 'height');
    const u = r.next();
    if (curves.length && u < 0.5) return r.pick(curves);
    if (heights.length && u < 0.7) return r.pick(heights);
    const rest = cands.filter((x) => x.code !== 'curve');
    return r.pick(rest.length ? rest : cands);
  }

  const api = { T, N, TASKS, KINDS, register, rng, BEND, G_AXIS, FLAWS, generate, quiz, flaw, evaluate, copied, readable, g, G, gAt, GAt, len, sloped, rate, area };
  root.Motion = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
