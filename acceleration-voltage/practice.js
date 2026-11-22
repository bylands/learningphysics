// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Practice adapts to the student: exercise types that were hard come up more often, until they
// are solved easily. For each app, the browser keeps { type: { n, s } } under `${app}-types`,
// s a moving average of the scores in [0, 1] (0: right at once … 1: solution needed); a type is
// drawn with weight 1 + 3·s, so up to 4 times as often as a mastered one; an unseen type counts as
// s = 0.35 (as in Force Concepts, which keeps its own copy of this).
//   Practice.score(st)                   how an exercise went, from the app's state { tries,
//                                        hints, solved, revealed }: null if not tried at all
//   Practice.finish(app, type, st)       records the result once per exercise (sets st.recorded);
//                                        call it when solved, when the solution is shown and when
//                                        the student moves on
//   Practice.solvedBefore(app, id), Practice.markSolved(app, id)
//                                        the exercises solved (their ids, the last 500 kept): one
//                                        solved before shows its solution right away
//   Practice.next(app, make, typeOf, last)  the next exercise: make(seed) builds one, typeOf(ex)
//                                        says its type; a few are drawn, and one is chosen with the
//                                        weight of its type (not of the type `last` if another
//                                        was drawn), so a type's usual share is multiplied by it
(function (root) {
  'use strict';

  const UNSEEN = 0.35, SAMPLE = 12;
  const key = (app) => `${app}-types`;
  function read(app) {
    try { return JSON.parse(localStorage.getItem(key(app))) || {}; } catch (e) { return {}; }
  }
  function write(app, stats) {
    try { localStorage.setItem(key(app), JSON.stringify(stats)); } catch (e) { /* storage unavailable */ }
  }
  const weight = (stats, type) => 1 + 3 * (stats[type] ? stats[type].s : UNSEEN);

  function score(st) {
    if (st.revealed) return 1;
    if (st.solved) return Math.min(1, 0.3 * (st.tries - 1) + 0.2 * st.hints);
    return st.tries > 0 ? 0.75 : null; // left unsolved after trying; not tried: no verdict
  }

  function finish(app, type, st) {
    if (!st || st.recorded || type == null) return;
    const x = score(st);
    if (x == null) return;
    st.recorded = true;
    const stats = read(app), old = stats[type];
    const s = old ? 0.6 * old.s + 0.4 * x : x;
    stats[type] = { n: (old ? old.n : 0) + 1, s: Number(s.toFixed(3)) };
    write(app, stats);
  }

  function next(app, make, typeOf, last, random = Math.random) {
    const seed = () => 1 + Math.floor(random() * 999999);
    let pool = [];
    for (let k = 0; k < SAMPLE; k++) { const ex = make(seed()); pool.push({ ex, t: typeOf(ex) }); }
    if (last != null && pool.some((p) => p.t !== last)) pool = pool.filter((p) => p.t !== last);
    // each drawn exercise by the weight of its type: types keep their usual share, times the weight
    const stats = read(app), ws = pool.map((p) => weight(stats, p.t)), total = ws.reduce((a, b) => a + b, 0);
    let x = random() * total;
    for (let i = 0; i < pool.length; i++) { x -= ws[i]; if (x < 0) return pool[i].ex; }
    return pool[pool.length - 1].ex;
  }

  const doneKey = (app) => `${app}-done`;
  function solvedList(app) { try { return JSON.parse(localStorage.getItem(doneKey(app))) || []; } catch (e) { return []; } }
  const solvedBefore = (app, id) => solvedList(app).includes(id);
  function markSolved(app, id) {
    const list = solvedList(app).filter((x) => x !== id);
    list.push(id);
    try { localStorage.setItem(doneKey(app), JSON.stringify(list.slice(-500))); } catch (e) { /* storage unavailable */ }
  }

  root.Practice = { score, finish, next, weight, read, solvedBefore, markSolved };
  if (typeof module !== 'undefined') module.exports = root.Practice;
})(typeof window !== 'undefined' ? window : globalThis);
