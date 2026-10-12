// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Practice by topic: each topic belongs to a worked example of the tutor and has stages, from
// exercises like the example to variations that add new ideas. Two exercises of a stage solved at
// the first try without hints (st.tries === 1, st.hints === 0, as the apps count "first try without
// hints") move practice on to the next stage; an exercise solved otherwise does not count, and the
// student is told so. The student can also choose a stage, or all topics mixed. Within a stage, exercise types that were hard
// come up more often (practice.js).
//   const T = Topics.create({
//     app,                    the app's storage prefix
//     topics: [{ name(), stages: [{ name(), types: [type] }], example }],   in the order of the tutor;
//                             example (optional): { i, name() }, or a function of the step giving
//                             it, the worked example of the topic where the tutor has more
//                             examples than there are topics (by default topic t has example t)
//     make(type, seed),       an exercise of a type
//     typeOf(ex),             the type of an exercise
//     onChange(),             the student chose another topic or stage (start a new exercise)
//     tutor(i),               show worked example i (the link next to the stages)
//     keyOf(ex),              (optional) what makes an exercise new to the student; by default its
//                             parameters ex.p. Exercises without them never run out.
//     variant(),              (optional) a mode that changes how many exercises there are (e.g.
//                             with symbols or with numbers)
//     situationOf(ex),        (optional) the situation an exercise shows (e.g. its title): the next
//                             exercise shows another one than the last, if the stage has another
//   })
// The steps the student sees are the topic's stages, but a stage with fewer than three different
// exercises (in the current variant) is merged with the next one; after the last step comes one
// with the exercises of all steps. When a step has no new exercises left, a note says so and
// suggests moving on; the exercises then come round again.
//   T.mount(el)               the topic menu, the stages and the links to the worked example and the
//                             next one, in el
//   T.relabel()               the texts in the current language
//   T.next(last)              a new exercise of the current topic and stage, its id 'p3.2-seed'
//                             (topic 3, stage 2) or 'mix-seed'
//   T.parse(id)               the exercise of such an id (and its topic and stage chosen), or null
//   T.shown(ex)               an exercise is shown (for the link to its worked example); exercises
//                             of T.next and T.parse carry ptopic and pstage
//   T.solved(st)              the current exercise is solved; once per exercise (st.won), not after
//                             the solution was shown, and a win only at the first try without hints.
//                             Returns a text when the stage is done, or when the solve did not count.
//                             When the next step has a worked example of its own, the text and a note
//                             with a link to it suggest looking at it first.
//   T.go(t, s)                practise topic t (from the tutor), at stage s or else the stage reached
//   T.also(t)                 HTML for the tutor: what the practice of topic t covers
// In a set of the teacher's (sets.js), only the topics of its learning objectives are offered, and
// all topics mixed mixes only them; a set saved before lists stages instead: then only those are
// offered, and the topics that have one, the steps made of those stages.
(function (root) {
  'use strict';

  const WINS = 2;
  const TX = {
    en: { topic: 'Topic', mixed: 'All topics (mixed)', stage: 'Step', worked: (i, n) => `Worked example ${i} · ${n}`, nextWorked: (i, n) => `Next: worked example ${i} · ${n} →`, like: 'like the example',
      done: (n) => `Well done! Next step: ${n}.`, notClean: 'To move on to the next step, solve two exercises of this step at the first try without hints.', allSteps: 'all steps', none: 'You have seen all the exercises of this step: move on to the next step or to another topic.', noneLast: 'You have seen all the exercises of this step: move on to another topic.', newWorked: (i, n) => `This step has its own worked example (${i} · ${n}): have a look at it first.`, last: 'Well done! You have reached the last step of this topic; practise on, or choose another topic.', also: 'Practice:' },
    de: { topic: 'Thema', mixed: 'Alle Themen (gemischt)', stage: 'Schritt', worked: (i, n) => `Beispiel ${i} · ${n}`, nextWorked: (i, n) => `Nächstes: Beispiel ${i} · ${n} →`, like: 'wie im Beispiel',
      done: (n) => `Gut gemacht! Nächster Schritt: ${n}.`, notClean: 'Für den nächsten Schritt löse zwei Aufgaben dieses Schritts beim ersten Versuch ohne Tipps.', allSteps: 'alle Schritte', none: 'Du hast alle Aufgaben dieses Schritts gesehen: Mach mit dem nächsten Schritt oder einem anderen Thema weiter.', noneLast: 'Du hast alle Aufgaben dieses Schritts gesehen: Mach mit einem anderen Thema weiter.', newWorked: (i, n) => `Zu diesem Schritt gibt es ein eigenes Beispiel (${i} · ${n}): Schau es dir zuerst an.`, last: 'Gut gemacht! Du hast den letzten Schritt dieses Themas erreicht; übe weiter oder wähle ein anderes Thema.', also: 'Üben:' },
  };
  const tx = () => TX[root.Lang && root.Lang.get() === 'de' ? 'de' : 'en'];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function create(o) {
    const S = root.LPSets;
    if (S) S.register('topics', o.topics);
    // the topics in the set (those of its objectives) and the stages (a set saved before lists
    // stages); without a set, all; the topics without any stage left are left out
    let only = null, inSet = null, open = [], firstOpen = 0, mixed = true, all = [];
    // the choice and progress are kept apart in a set that leaves stages out (its steps differ),
    // and the choice of topic in one that leaves topics out
    const key = (k) => `${o.app}-${k}${(only || (inSet && k === 'topic')) && S.name ? `@${S.name}` : ''}`;
    const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(key(k))); return v == null ? d : v; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
    const stagesIn = (t) => (inSet && !inSet.has(t) ? [] : o.topics[t].stages.filter((s) => !only || only.has(S.stageKey(s))));
    const topicOfType = (type) => o.topics.findIndex((t) => t.stages.some((s) => s.types.includes(type)));
    // the current choice { topic (−1: mixed), stage }, and per topic the stage reached and the wins in it
    let cur = null, progress = {}, el = null, shownTopic = 0;
    // a step reached by moving on whose worked example is new: { topic, stage }, until the student goes there
    let suggest = null;
    // the exercises seen in this session, per step ('topic.stage': Set of keys), and whether the
    // current step has run out of new ones
    const seen = new Map();
    let runOut = false;
    const keyOf = (ex) => (o.keyOf ? o.keyOf(ex) : ex.p ? JSON.stringify(ex.p) : null);
    const seenHere = () => { const k = `${cur.topic}.${cur.stage}`; if (!seen.has(k)) seen.set(k, new Set()); return seen.get(k); };
    // The steps of a topic, in the current variant: stages with fewer than MIN different exercises
    // (counted in SAMPLES of them) merged with the next, then the step with all of them.
    const MIN = 3, SAMPLES = 24, plans = new Map();
    function count(types) {
      const keys = new Set();
      for (let k = 1; k <= SAMPLES; k++) {
        const kk = keyOf(o.make(types[k % types.length], 7919 * k));
        if (kk == null) return Infinity;
        keys.add(kk);
      }
      return keys.size;
    }
    function stagesOf(t) {
      if (t < 0) return [];
      const id = `${t}|${o.variant ? o.variant() : ''}`;
      if (plans.has(id)) return plans.get(id);
      const raw = stagesIn(t), groups = [];
      let open = null;
      raw.forEach((st) => {
        open = { names: [...(open ? open.names : []), st.name || null], types: [...(open ? open.types : []), ...st.types] };
        if (count(open.types) >= MIN) { groups.push(open); open = null; }
      });
      if (open && groups.length) { const g = groups.pop(); groups.push({ names: [...g.names, ...open.names], types: [...g.types, ...open.types] }); } else if (open) groups.push(open);
      const steps = groups.map((g) => ({ name: () => g.names.map((n) => (n ? n() : tx().like)).join(', '), types: [...new Set(g.types)] }));
      if (steps.length > 1) steps.push({ name: () => tx().allSteps, types: [...new Set(raw.flatMap((st) => st.types))], all: true });
      plans.set(id, steps);
      return steps;
    }
    // what the set leaves (again once its objectives are known, see sets.js)
    function limit() {
      only = S && S.practice() ? new Set(S.practice()) : null;
      if (only && !o.topics.some((t) => t.stages.some((s) => only.has(S.stageKey(s))))) only = null;
      inSet = S && S.topics() ? new Set(S.topics().filter((t) => t >= 0 && t < o.topics.length)) : null;
      if (inSet && !inSet.size) inSet = null;
      open = o.topics.map((_, t) => stagesIn(t).length > 0);
      firstOpen = open.indexOf(true);
      mixed = (!only && !inSet) || open.filter(Boolean).length > 1; // all topics mixed: unless only one is left
      all = [...new Set(o.topics.flatMap((_, t) => stagesIn(t).flatMap((s) => s.types)))];
      plans.clear();
      cur = read('topic', { topic: 0, stage: 0 });
      progress = read('progress', {});
      if (!(cur.topic >= -1 && cur.topic < o.topics.length) || (cur.topic >= 0 && !open[cur.topic]) || (cur.topic < 0 && !mixed)) cur = { topic: firstOpen, stage: 0 };
    }
    limit();
    if (S) S.on(() => { limit(); render(); });
    // the worked examples of the topics and their steps, in the order of the tutor
    const examples = () => {
      const seen = new Map();
      o.topics.forEach((tp, t) => stagesOf(t).forEach((_, k) => { const e = workedOf(t, k); if (!seen.has(e.i)) seen.set(e.i, e); }));
      return [...seen.values()].sort((a, b) => a.i - b.i);
    };
    const workedOf = (t, s = 0) => { const e = o.topics[t].example; return typeof e === 'function' ? e(s) : e || { i: t, name: o.topics[t].name }; };
    const reached = (t) => Math.min((progress[t] || {}).stage || 0, stagesOf(t).length - 1);
    const typesOf = (t, s) => (t < 0 ? all : stagesOf(t)[Math.min(s, stagesOf(t).length - 1)].types);
    const stageName = (t, s) => stagesOf(t)[s].name();
    // whether the tutor shows worked example i (not all may be in the set)
    const tutorHas = (i) => !!o.tutor && (!S || (S.mode('tutor') && (!S.tutor() || S.tutor().includes(i))));

    function exercise(t, s, seed) {
      const types = typesOf(t, s), type = types[seed % types.length];
      const ex = o.make(type, seed);
      ex.id = t < 0 ? `mix-${seed}` : `p${t + 1}.${s + 1}-${seed}`;
      ex.ptopic = t; ex.pstage = s; ex.seed = seed;
      return ex;
    }

    function render() {
      if (!el) return;
      const t = cur.topic, X = tx();
      if (t >= 0 && cur.stage > stagesOf(t).length - 1) cur.stage = stagesOf(t).length - 1; // fewer steps in this variant
      const opts = o.topics.map((tp, i) => (open[i] ? `<option value="${i}"${i === t ? ' selected' : ''}>${i + 1} · ${esc(tp.name())}</option>` : '')).join('') +
        (mixed ? `<option value="-1"${t < 0 ? ' selected' : ''}>${X.mixed}</option>` : '');
      const stages = stagesOf(t).length > 1 ? `<div class="levels small stages" role="radiogroup" aria-label="${X.stage}">${stagesOf(t).map((s, i) =>
        `<label><input type="radio" name="stage" value="${i}"${i === cur.stage ? ' checked' : ''}><span>${i < reached(t) ? '✓ ' : ''}${i + 1} · ${esc(stageName(t, i))}</span></label>`).join('')}</div>` : '';
      const w = t < 0 ? shownTopic : t, wk = w >= 0 ? workedOf(w, t < 0 ? 0 : cur.stage) : null;
      const last = t < 0 || cur.stage >= stagesOf(t).length - 1;
      // the link to the worked example, if the set has it
      const linked = wk && tutorHas(wk.i);
      // and to the next worked example the topics have (the next one the set shows)
      const nx = linked ? examples().find((e) => e.i > wk.i && tutorHas(e.i)) : null;
      el.innerHTML = `<label class="topic-pick"><span>${X.topic}</span><select id="topic-pick">${opts}</select></label>${stages}` +
        (linked ? `<button type="button" class="linklike worked">📖 ${esc(X.worked(wk.i + 1, wk.name()))}</button>` : '') +
        (nx ? `<button type="button" class="linklike worked next-worked" data-i="${nx.i}">${esc(X.nextWorked(nx.i + 1, nx.name()))}</button>` : '') +
        (runOut ? `<p class="topic-note">${last ? X.noneLast : X.none}</p>` : '') +
        (suggest && suggest.topic === t && suggest.stage === cur.stage && linked ? `<p class="topic-note tip">${esc(X.newWorked(wk.i + 1, wk.name()))} <button type="button" class="linklike worked">📖 ${esc(X.worked(wk.i + 1, wk.name()))}</button></p>` : '');
    }

    function choose(t, s) {
      cur = { topic: t, stage: t < 0 ? 0 : Math.max(0, Math.min(s, stagesOf(t).length - 1)) };
      if (suggest && (suggest.topic !== cur.topic || suggest.stage !== cur.stage)) suggest = null;
      runOut = false;
      write('topic', cur);
      render();
    }

    const T = {
      mount(element) {
        el = element;
        el.className = 'topics practice';
        el.removeAttribute('role');
        el.addEventListener('change', (evt) => {
          if (evt.target.id === 'topic-pick') { const t = Number(evt.target.value); choose(t, t < 0 ? 0 : reached(t)); } else if (evt.target.name === 'stage') choose(cur.topic, Number(evt.target.value));
          else return;
          o.onChange();
        });
        el.addEventListener('click', (evt) => {
          const btn = evt.target.closest('.worked');
          if (!btn) return;
          if (btn.dataset.i != null) { o.tutor(Number(btn.dataset.i)); return; }
          if (suggest) { suggest = null; render(); }
          o.tutor(cur.topic < 0 ? workedOf(shownTopic).i : workedOf(cur.topic, cur.stage).i);
        });
        render();
      },
      relabel: render,
      state: () => ({ ...cur }),
      // a new exercise, one not seen yet in this session if there is one
      next(last) {
        const t = cur.topic, s = cur.stage, was = runOut, here = seenHere();
        let ex = null, fresh = false;
        // not the situation of the last one (if the first tries find another)
        const was0 = last && o.situationOf ? o.situationOf(last) : null;
        for (let k = 0; k < 25 && !fresh; k++) {
          ex = Practice.next(o.app, (seed) => exercise(t, s, seed), (e) => o.typeOf(e), last ? o.typeOf(last) : null);
          const key = keyOf(ex);
          fresh = (key == null || !here.has(key)) && (was0 == null || k >= 15 || o.situationOf(ex) !== was0);
        }
        if (!fresh) here.clear(); // all seen: they come round again
        const key = keyOf(ex);
        if (key != null) here.add(key);
        runOut = runOut || !fresh; // the note stays until another topic or step is chosen
        if (runOut !== was) render();
        return ex;
      },
      parse(id) {
        let m = /^p(\d+)\.(\d+)-(\d+)$/.exec(id);
        if (m) {
          const t = Number(m[1]) - 1, s = Number(m[2]) - 1;
          if (t < 0 || t >= o.topics.length || !open[t] || s < 0 || s >= stagesOf(t).length) return null;
          if (cur.topic !== t || cur.stage !== s) choose(t, s);
          return exercise(t, s, Number(m[3]));
        }
        m = /^mix-(\d+)$/.exec(id);
        if (m && mixed) { if (cur.topic !== -1) choose(-1, 0); return exercise(-1, 0, Number(m[1])); }
        return null;
      },
      shown(ex) {
        const t = ex && ex.ptopic >= 0 ? ex.ptopic : topicOfType(o.typeOf(ex));
        if (t !== shownTopic) { shownTopic = Math.max(0, t); if (cur.topic < 0) render(); }
      },
      solved(st, ex) {
        if (!st || st.won || st.revealed || !ex || !(ex.ptopic >= 0)) return '';
        st.won = true;
        const t = ex.ptopic, p = progress[t] || { stage: 0, wins: 0 };
        if (ex.pstage !== p.stage) return ''; // practising an earlier stage again, or one ahead
        // only a solve at the first try without hints counts (the last stage has nothing to move on to)
        if (st.tries !== 1 || st.hints > 0) return p.stage < stagesOf(t).length - 1 ? tx().notClean : '';
        p.wins = (p.wins || 0) + 1;
        let msg = '';
        if (p.wins >= WINS) {
          if (p.stage < stagesOf(t).length - 1) {
            p.stage++; p.wins = 0;
            if (cur.topic === t) cur.stage = p.stage;
            write('topic', cur);
            msg = tx().done(`${p.stage + 1} · ${stageName(t, p.stage)}`);
            // a new part of the tutor: suggest going back to it
            const before = workedOf(t, p.stage - 1), now = workedOf(t, p.stage);
            if (tutorHas(now.i) && now.i !== before.i) { suggest = { topic: t, stage: p.stage }; msg += ` ${tx().newWorked(now.i + 1, now.name())}`; }
          } else if (p.wins === WINS) msg = tx().last;
        }
        progress[t] = p;
        write('progress', progress);
        render();
        return msg;
      },
      go(i, s) { if (!open[i]) { i = firstOpen; s = null; } choose(i, s == null ? reached(i) : s); },
      also(i) {
        const st = stagesOf(i).filter((x) => !x.all);
        if (st.length < 2) return '';
        return `${tx().also} ${st.map((x, k) => `${k + 1} · ${esc(stageName(i, k))}`).join(', ')}.`;
      },
      count: () => o.topics.length,
    };
    return T;
  }

  root.Topics = { create };
})(window);
