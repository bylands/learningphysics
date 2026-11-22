// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Check mode: a short diagnostic test on the learning objectives of the app. A few questions per
// objective, mixed, each with four options; no time limit, no hints, one answer each, and no
// feedback until the end. The result names, per objective, whether it is mastered, not yet, or
// which typical wrong idea (misconception) showed up, with links to the worked example and the
// practice of that objective. Below it, every question with the answer chosen and, on request,
// the explanation. The last result is kept in the browser (nothing leaves it), as { at, results:
// { objective id: status } } under `${src.id}-check`; the hub page reads it too (how many
// objectives of a module the student masters, see hub/build-objectives.js). In a set of the
// teacher's (sets.js), the check asks only the set's objectives, and the others keep their result.
//
// The app supplies the objectives and the questions, in the current language (see lang.js):
//   src.id                    a short name, for the last result in storage
//   src.objectives            [{ id, name(), kinds: [kind], tutor (optional: worked example
//                             index), topic (optional: practice topic index) }]: name() is what
//                             the student can do, e.g. "Split a voltage in series ..."
//   src.question(kind, seed)  { title, text, figure, ask (all HTML), options: [{ html, correct,
//                             flag, why }] (four, one correct; flag: the wrong idea behind it, why:
//                             what is wrong), explain() (HTML: the worked solution), key
//                             (optional: questions with the same key count as the same question) }
//   src.concept               { flag: idea } for the flags that count as misconceptions
//   src.concepts()            { idea: name }
// h: helpers of the app { math(el), markScrollable(), stored(key, fallback), store(key, value),
//   tutor(i), practise(topic) }.
// The page needs the #ck section (Check.HTML, see an app's app.js) and a mode "check".
(function (root) {
  'use strict';

  const MASTERED = 0.75; // the share of right answers on an objective that counts as mastered

  // How many questions per objective: about ten in all, two to four each.
  const perObjective = (n) => Math.max(2, Math.min(4, Math.round(10 / Math.max(1, n))));

  // The questions of a check: [{ objective (index), kind, seed }], the kinds of each objective
  // taken in turn from a random start, the objectives mixed so that no two questions in a row
  // belong to the same one where that can be avoided. rand() gives numbers in [0, 1).
  function plan(objectives, rand) {
    const per = perObjective(objectives.length), queues = objectives.map((o, i) => {
      const start = Math.floor(rand() * o.kinds.length);
      return Array.from({ length: per }, (_, k) => ({ objective: i, kind: o.kinds[(start + k) % o.kinds.length], seed: 1 + Math.floor(rand() * 999999) }));
    });
    const out = [];
    let last = -1;
    while (queues.some((q) => q.length)) {
      const open = queues.map((q, i) => i).filter((i) => queues[i].length);
      // the objectives with most questions left first, so that they do not bunch up at the end
      const most = Math.max(...open.map((i) => queues[i].length));
      let pick = open.filter((i) => queues[i].length === most && i !== last);
      if (!pick.length) pick = open.filter((i) => i !== last);
      if (!pick.length) pick = open;
      const i = pick[Math.floor(rand() * pick.length)];
      out.push(queues[i].shift());
      last = i;
    }
    return out;
  }

  // The result per objective: { right, total, status ('mastered', 'misconception', 'notyet'),
  // ideas (the misconceptions shown, in order) }. items: [{ objective, ok, flag }].
  function grade(objectives, items, concept) {
    return objectives.map((_, i) => {
      const mine = items.filter((it) => it.objective === i);
      const right = mine.filter((it) => it.ok).length, total = mine.length;
      const ideas = [...new Set(mine.map((it) => (it.ok ? null : concept[it.flag])).filter(Boolean))];
      const status = total && right / total >= MASTERED ? 'mastered' : ideas.length ? 'misconception' : 'notyet';
      return { right, total, status, ideas };
    });
  }

  const pure = { plan, grade, perObjective, MASTERED };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = pure; return; }

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const T = {
    en: {
      start: 'Check',
      tag: (n, m) => `${n} questions on ${m === 1 ? 'the learning objective' : `the ${m} learning objectives`} below. No time limit and no hints; one answer each. At the end you see which objectives you already master.`,
      objectives: 'You can …',
      last: (k, m) => `Your last check: ${k} of ${m} ${m === 1 ? 'objective' : 'objectives'} mastered.`,
      go: 'Start the check', skip: "I don't know", quit: 'End the check', again: 'Check again',
      count: (i, n) => `Question ${i} of ${n}`,
      result: 'Your result', resultNote: 'Mastered means at least three quarters of the questions on an objective right.',
      mastered: 'Mastered', notyet: 'Not yet', misconception: 'Not yet: a typical wrong idea',
      score: (r, t) => `${r} of ${t} right`,
      worked: (i) => `📖 Worked example ${i}`, practise: 'Practise',
      allMastered: 'You master all the objectives of this module. Well done!',
      someLeft: 'Work on the objectives not mastered yet: the worked example shows how, and practice trains it.',
      questions: 'The questions',
      question: 'Question', yours: 'Your answer', correctV: 'Right answer', none: "— (I don't know)",
      explain: 'Explanation', unanswered: 'not answered',
    },
    de: {
      start: 'Check',
      tag: (n, m) => `${n} Fragen ${m === 1 ? 'zum Lernziel' : `zu den ${m} Lernzielen`} unten. Keine Zeitbegrenzung und keine Tipps; eine Antwort pro Frage. Am Schluss siehst du, welche Lernziele du schon beherrschst.`,
      objectives: 'Du kannst …',
      last: (k, m) => `Dein letzter Check: ${k} von ${m} ${m === 1 ? 'Lernziel' : 'Lernzielen'} beherrscht.`,
      go: 'Check starten', skip: 'Weiss ich nicht', quit: 'Check beenden', again: 'Nochmals prüfen',
      count: (i, n) => `Frage ${i} von ${n}`,
      result: 'Dein Resultat', resultNote: 'Beherrscht heisst: mindestens drei Viertel der Fragen zu einem Lernziel richtig.',
      mastered: 'Beherrscht', notyet: 'Noch nicht', misconception: 'Noch nicht: eine typische Fehlvorstellung',
      score: (r, t) => `${r} von ${t} richtig`,
      worked: (i) => `📖 Beispiel ${i}`, practise: 'Üben',
      allMastered: 'Du beherrschst alle Lernziele dieses Moduls. Gut gemacht!',
      someLeft: 'Arbeite an den Lernzielen, die du noch nicht beherrschst: Das Beispiel zeigt, wie es geht, und beim Üben trainierst du es.',
      questions: 'Die Fragen',
      question: 'Frage', yours: 'Deine Antwort', correctV: 'Richtige Antwort', none: '— (weiss ich nicht)',
      explain: 'Erklärung', unanswered: 'nicht beantwortet',
    },
  };
  const t = () => T[root.Lang && root.Lang.get() === 'de' ? 'de' : 'en'];
  const mark = { mastered: '✓', notyet: '✗', misconception: '!' };

  function createCheck(src, h) {
    const key = `${src.id}-check`;
    // run: { plan, at (index of the question shown), items: [{ objective, kind, seed, chosen, ok, flag }], over }
    let run = null;
    // in a set of the teacher's (sets.js), only the set's objectives
    const S = root.LPSets;
    if (S) S.register('check', src);
    const objectives = () => { const only = S && S.objectives(); return only ? src.objectives.filter((o) => only.includes(o.id)) : src.objectives; };
    // the links to the worked example and to practice, if the set has those modes
    const hasMode = (m) => !S || S.mode(m);
    const per = () => perObjective(objectives().length);
    const total = () => per() * objectives().length;
    const show = (part) => { ['start', 'play', 'summary'].forEach((k) => { $(`#ck-${k}`).hidden = k !== part; }); };
    const questionOf = (it) => src.question(it.kind, it.seed);

    // ------------------------------------------------------------ start page
    function startPage() {
      const X = t(), last = h.stored(key, null);
      $('#ck-start-title').textContent = X.start;
      $('#ck-tag').textContent = X.tag(total(), objectives().length);
      $('#ck-obj-title').textContent = X.objectives;
      $('#ck-objectives').innerHTML = objectives().map((o) => {
        const s = last && last.results ? last.results[o.id] : null;
        return `<li${s ? ` class="${s}"` : ''}>${s ? `<span class="mark" title="${X[s]}">${mark[s]}</span> ` : ''}${esc(o.name())}</li>`;
      }).join('');
      const known = last && last.results ? objectives().filter((o) => last.results[o.id]) : [];
      $('#ck-last').textContent = known.length ? X.last(known.filter((o) => last.results[o.id] === 'mastered').length, objectives().length) : '';
      $('#ck-go').textContent = X.go;
      $('#ck-skip').textContent = X.skip;
      $('#ck-quit').textContent = X.quit;
      $('#ck-again').textContent = X.again;
    }

    // ------------------------------------------------------------ the questions
    function start() {
      // a question not asked before in this check, where the generator can find one
      const sig = (q) => q.key || `${q.title}|${q.ask}|${q.figure}|${q.options.map((o) => o.html).join('|')}`;
      const asked = new Set();
      const items = plan(objectives(), Math.random).map((p) => {
        let it = { ...p, chosen: null, ok: false, flag: null };
        for (let k = 0; k < 12; k++) {
          const s = sig(questionOf(it));
          if (!asked.has(s)) { asked.add(s); break; }
          it = { ...it, seed: 1 + Math.floor(Math.random() * 999999) };
        }
        return it;
      });
      run = { items, at: 0, over: false };
      show('play');
      render();
    }

    function render() {
      const it = run.items[run.at], q = questionOf(it);
      $('#ck-count').textContent = t().count(run.at + 1, run.items.length);
      $('#ck-bar').style.width = `${(100 * run.at) / run.items.length}%`;
      $('#ck-title').textContent = q.title;
      $('#ck-prompt').innerHTML = q.text;
      $('#ck-figure').innerHTML = q.figure;
      $('#ck-ask').innerHTML = q.ask;
      $('#ck-options').innerHTML = q.options.map((o, k) =>
        `<button type="button" class="ck-opt" data-k="${k}"><span class="key">${k + 1}</span><span class="val">${o.html}</span></button>`).join('');
      h.math($('#ck-stage'));
      h.markScrollable();
    }

    function answer(k) {
      if (!run || run.over) return;
      const it = run.items[run.at], q = questionOf(it);
      if (k != null && !q.options[k]) return; // a key beyond the options
      it.chosen = k;
      it.ok = k != null && !!q.options[k].correct;
      it.flag = k != null ? q.options[k].flag || null : null;
      it.answered = true;
      run.at++;
      if (run.at >= run.items.length) finish(); else render();
    }

    // Done, or ended early: the questions left open count as not answered (and not right).
    function finish() {
      if (!run || run.over) return;
      run.over = true;
      const res = grade(objectives(), run.items, src.concept);
      // the objectives not asked (in a set that leaves them out) keep their last result
      const last = h.stored(key, null), results = last && last.results && typeof last.results === 'object' ? { ...last.results } : {};
      objectives().forEach((o, i) => { results[o.id] = res[i].status; });
      h.store(key, { at: Date.now(), results });
      summary();
    }

    // ------------------------------------------------------------ the result
    function summary() {
      show('summary');
      const X = t(), res = grade(objectives(), run.items, src.concept), names = src.concepts();
      $('#ck-sum-title').textContent = X.result;
      $('#ck-sum-note').textContent = X.resultNote;
      $('#ck-sum-objectives').innerHTML = objectives().map((o, i) => {
        const r = res[i];
        const ideas = r.ideas.length ? `<div class="ideas">${r.ideas.map((c) => esc(names[c])).join('; ')}</div>` : '';
        const links = r.status === 'mastered' ? '' : `<div class="actions">${o.tutor != null && hasMode('tutor') ? `<button type="button" data-tutor="${o.tutor}">${X.worked(o.tutor + 1)}</button>` : ''}${o.topic != null && hasMode('practice') ? `<button type="button" class="new-btn" data-topic="${o.topic}">${X.practise}</button>` : ''}</div>`;
        return `<li class="${r.status}"><div class="head"><span class="mark">${mark[r.status]}</span><span class="name">${esc(o.name())}</span></div>` +
          `<div class="verdict">${X[r.status]} · ${X.score(r.right, r.total)}</div>${ideas}${links}</li>`;
      }).join('');
      $('#ck-sum-advice').textContent = res.every((r) => r.status === 'mastered') ? X.allMastered : X.someLeft;
      $('#ck-sum-qtitle').textContent = X.questions;
      $('#ck-sum-list').innerHTML = run.items.map((it, k) => {
        const q = questionOf(it), state = it.answered ? '' : ` · ${X.unanswered}`;
        return `<details class="ck-item ${it.ok ? 'ok' : 'bad'}" data-k="${k}"><summary><span class="mark">${it.ok ? '✓' : '✗'}</span> ${k + 1}. ${q.title}<span class="meta">${esc(objectives()[it.objective].name())}${state}</span></summary><div class="ck-explain"></div></details>`;
      }).join('');
    }

    // The question, the answer chosen against the right one, and the explanation.
    function explain(det) {
      const X = t(), it = run.items[Number(det.dataset.k)], q = questionOf(it);
      const chosen = it.chosen == null ? null : q.options[it.chosen], right = q.options.find((o) => o.correct);
      const why = chosen && !chosen.correct && chosen.why ? `<div class="why">${chosen.why}</div>` : '';
      const box = det.querySelector('.ck-explain');
      box.innerHTML = `${q.text}<div class="figs">${q.figure}</div><p><b>${X.question}:</b> ${q.ask}</p>` +
        `<table class="ck-answers"><tbody>` +
        `<tr class="${chosen ? (chosen.correct ? 'ok' : 'bad') : 'bad'}"><th>${X.yours}</th><td>${chosen ? chosen.html : X.none}${why}</td></tr>` +
        `<tr><th>${X.correctV}</th><td>${right.html}</td></tr></tbody></table>` +
        `<h4>${X.explain}</h4>${q.explain()}`;
      h.math(box);
      h.markScrollable();
    }

    // ------------------------------------------------------------ wiring
    $('#ck-go').addEventListener('click', start);
    $('#ck-again').addEventListener('click', start);
    $('#ck-options').addEventListener('click', (evt) => { const b = evt.target.closest('.ck-opt'); if (b) answer(Number(b.dataset.k)); });
    $('#ck-skip').addEventListener('click', () => answer(null));
    $('#ck-quit').addEventListener('click', finish);
    $('#ck-sum-objectives').addEventListener('click', (evt) => {
      const b = evt.target.closest('button');
      if (!b) return;
      if (b.dataset.tutor != null) h.tutor(Number(b.dataset.tutor));
      else if (b.dataset.topic != null) h.practise(Number(b.dataset.topic));
    });
    document.addEventListener('keydown', (evt) => {
      if ($('#ck').hidden || $('#ck-play').hidden || evt.altKey || evt.ctrlKey || evt.metaKey) return;
      if (evt.target.closest && evt.target.closest('input, select, textarea')) return;
      const k = '1234'.indexOf(evt.key);
      if (k >= 0) { evt.preventDefault(); answer(k); }
    });
    $('#ck-sum-list').addEventListener('toggle', (evt) => {
      const det = evt.target; // a question's own <details> (its text may hold others)
      if (!det.classList.contains('ck-item')) return;
      if (det.open && !det.querySelector('.ck-explain').childElementCount) explain(det);
    }, true);
    startPage();

    return {
      // the start page, or the check or result in progress
      show() { startPage(); if (!run) show('start'); },
      // a check in progress stays where it is; leaving does not end it
      relabel() {
        startPage();
        if (!run) return;
        if (run.over) summary(); else render();
      },
    };
  }

  // The markup of the check section, the same in every app: insert it with
  // document.querySelector('main').insertAdjacentHTML('beforeend', Check.HTML).
  const HTML = `
    <section id="ck" class="card" hidden>
      <div id="ck-start">
        <h2 id="ck-start-title"></h2>
        <p id="ck-tag"></p>
        <h3 id="ck-obj-title"></h3>
        <ul id="ck-objectives" class="ck-objectives"></ul>
        <p id="ck-last" class="note"></p>
        <div class="actions"><button type="button" id="ck-go" class="primary"></button></div>
      </div>
      <div id="ck-play" hidden>
        <p id="ck-count" class="note ck-count"></p>
        <div class="progress" aria-hidden="true"><div id="ck-bar"></div></div>
        <div id="ck-stage">
          <h2 id="ck-title"></h2>
          <div id="ck-prompt"></div>
          <div id="ck-figure" class="figs"></div>
          <p id="ck-ask" class="ck-ask"></p>
          <div id="ck-options" class="ck-options" role="group"></div>
        </div>
        <div class="actions ck-actions">
          <button type="button" id="ck-skip"></button>
          <button type="button" id="ck-quit"></button>
        </div>
      </div>
      <div id="ck-summary" hidden>
        <h2 id="ck-sum-title"></h2>
        <ul id="ck-sum-objectives" class="ck-result"></ul>
        <p id="ck-sum-advice"></p>
        <p id="ck-sum-note" class="note"></p>
        <h3 id="ck-sum-qtitle"></h3>
        <div id="ck-sum-list" class="ck-list"></div>
        <div class="actions"><button type="button" id="ck-again" class="primary"></button></div>
      </div>
    </section>`;

  root.Check = { create: createCheck, HTML, ...pure };
})(typeof window !== 'undefined' ? window : globalThis);
