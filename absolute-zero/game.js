// Absolute Zero: the rules, shared by the teacher's screen (app.js), the phones and the tests.
//   answers(q)             the answers a question accepts: [{ name, de, rare, keys }]
//   normalize(s, keepCase) a typed answer as it is compared: no accents, spaces, hyphens or
//                          punctuation, no leading article ("the", "der", …), ß → ss, ² → 2
//   match(q, text)         the index of the answer that text gives, or -1: first exactly with the
//                          case (m is milli, M is mega), then without it if that leaves one answer,
//                          then allowing a typo (1 letter from 5 letters on, 2 from 9)
//   judge(q, typed, ids, decisions)
//                          the round: typed is { id: text }, ids every player in the round,
//                          decisions the teacher's word on answers not on the list ({ key: 'ok' |
//                          'no' | 'a3' (the same as answer 3) }); gives the groups of equal answers
//                          and each player's score
//   score(same, n)         a correct answer given by `same` of the n players: 100 × the share of
//                          the others who gave it too, so an answer nobody else gave scores 0
//                          (absolute zero); a wrong or missing answer scores WRONG
//   ranking(players, totals)  the order: lowest total first, then more zeros, then the name
(function (root) {
  'use strict';

  const WRONG = 100;
  const ARTICLES = /^(the|a|an|der|die|das|den|dem|des|ein|eine|einen|einer|eines)\s+(?=\S)/i;

  function normalize(s, keepCase) {
    let t = String(s == null ? '' : s).trim().replace(ARTICLES, '');
    t = t.replace(/[μ]/g, 'µ').replace(/²/g, '2').replace(/³/g, '3').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    t = t.replace(/[^\p{L}\p{N}µ]/gu, '');
    return keepCase ? t : t.toLowerCase();
  }

  // ---------------------------------------------------------------- the list of answers
  const cache = new Map();
  function answers(q) {
    if (cache.has(q.answers)) return cache.get(q.answers);
    const list = q.answers.split(';').map((part) => {
      let p = part.trim();
      const rare = p.startsWith('*');
      if (rare) p = p.slice(1).trim();
      const spellings = p.split('|').map((x) => x.trim()).filter(Boolean);
      const de = spellings.find((x) => x.startsWith('='));
      const all = spellings.map((x) => x.replace(/^=/, '').trim());
      return {
        name: all[0], de: de ? de.slice(1).trim() : all[0], rare, spellings: all,
        keys: all.map((x) => normalize(x, true)), lower: all.map((x) => normalize(x)),
      };
    });
    cache.set(q.answers, list);
    return list;
  }
  const label = (q, k, lang) => { const a = answers(q)[k]; return a ? (lang === 'de' ? a.de : a.name) : ''; };

  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }

  // the one answer among `hits` (indices), or -1 when there is none or several
  const only = (hits) => { const u = [...new Set(hits)]; return u.length === 1 ? u[0] : -1; };

  function match(q, text) {
    const cased = normalize(text, true), lower = cased.toLowerCase();
    if (!lower) return -1;
    const list = answers(q);
    const exact = [];
    list.forEach((a, k) => { if (a.keys.includes(cased)) exact.push(k); });
    if (exact.length) return only(exact);
    const loose = [];
    list.forEach((a, k) => { if (a.lower.includes(lower)) loose.push(k); });
    if (loose.length) return only(loose);
    if (lower.length < 5) return -1;
    const allowed = lower.length >= 9 ? 2 : 1;
    let best = allowed + 1, hits = [];
    list.forEach((a, k) => a.lower.forEach((key) => {
      if (key.length < 4) return;
      const d = distance(lower, key);
      if (d < best) { best = d; hits = [k]; } else if (d === best) hits.push(k);
    }));
    return best <= allowed ? only(hits) : -1;
  }

  // ---------------------------------------------------------------- a round
  function score(same, n) {
    if (same < 1) return WRONG;
    return n <= 1 ? 0 : Math.round((100 * (same - 1)) / (n - 1));
  }

  // the key of a typed answer: 'a3' for answer 3 of the list, 'u:…' for one not on it, '' for none
  function keyOf(q, text) {
    const k = match(q, text);
    if (k >= 0) return `a${k}`;
    const n = normalize(text);
    return n ? `u:${n}` : '';
  }

  // The round as the teacher decided it:
  //   unlisted  answers not on the list, grouped: [{ key, texts, ids }] (for the teacher to judge)
  //   groups    the correct answers, most common first: [{ key, index (on the list, else -1),
  //             texts, ids, score }]
  //   wrong     the players with a wrong or no answer
  //   scores    { id: score } for every player in ids
  function judge(q, typed, ids, decisions) {
    decisions = decisions || {};
    const n = ids.length, byKey = new Map(), unlisted = [], wrong = [];
    const add = (key, id, text) => {
      if (!byKey.has(key)) byKey.set(key, { key, index: key[0] === 'a' ? +key.slice(1) : -1, texts: [], ids: [] });
      const g = byKey.get(key);
      g.ids.push(id);
      if (text && !g.texts.includes(text)) g.texts.push(text);
    };
    const pending = new Map();
    ids.forEach((id) => {
      const text = String((typed || {})[id] || '').trim();
      const key = keyOf(q, text);
      if (!key) { wrong.push(id); return; }
      if (key[0] === 'a') { add(key, id, text); return; }
      if (!pending.has(key)) pending.set(key, { key, texts: [], ids: [] });
      const p = pending.get(key);
      p.ids.push(id);
      if (!p.texts.includes(text)) p.texts.push(text);
    });
    const list = answers(q);
    pending.forEach((p) => {
      unlisted.push(p);
      const d = decisions[p.key];
      const to = /^a\d+$/.test(d || '') && +d.slice(1) < list.length ? d : d === 'ok' ? p.key : null;
      if (to) p.ids.forEach((id) => add(to, id, ''));
      else wrong.push(...p.ids);
    });
    // a merged group's texts: every distinct text of its players
    pending.forEach((p) => {
      const d = decisions[p.key];
      const g = byKey.get(/^a\d+$/.test(d || '') ? d : p.key);
      if (g) p.texts.forEach((t) => { if (!g.texts.includes(t)) g.texts.push(t); });
    });
    const groups = [...byKey.values()];
    const scores = {};
    groups.forEach((g) => { g.score = score(g.ids.length, n); g.ids.forEach((id) => { scores[id] = g.score; }); });
    wrong.forEach((id) => { scores[id] = WRONG; });
    groups.sort((a, b) => b.ids.length - a.ids.length || a.key.localeCompare(b.key));
    return { n, unlisted, groups, wrong, scores };
  }

  // the answers on the list nobody gave: the rare ones first
  function unused(q, groups, max) {
    const used = new Set(groups.map((g) => g.index));
    const list = answers(q).map((a, k) => ({ a, k })).filter((x) => !used.has(x.k));
    return list.filter((x) => x.a.rare).concat(list.filter((x) => !x.a.rare)).slice(0, max == null ? 8 : max).map((x) => x.k);
  }

  // totals: { id: { total, zeros } }; players: [{ id, name }]
  function ranking(players, totals) {
    const t = (p) => totals[p.id] || { total: 0, zeros: 0 };
    return players.slice().sort((a, b) => t(a).total - t(b).total || t(b).zeros - t(a).zeros || String(a.name).localeCompare(String(b.name)));
  }
  // the place of each player, equal for a tie in total and zeros: { id: 1, … }
  function places(players, totals) {
    const order = ranking(players, totals), out = {};
    const t = (p) => totals[p.id] || { total: 0, zeros: 0 };
    order.forEach((p, k) => {
      const prev = order[k - 1];
      out[p.id] = prev && t(prev).total === t(p).total && t(prev).zeros === t(p).zeros ? out[prev.id] : k + 1;
    });
    return out;
  }

  // n questions of a topic ('mixed': of all, spread over the topics), shuffled
  function pick(questions, topic, n, rand) {
    rand = rand || Math.random;
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if (topic !== 'mixed') return shuffle(questions.filter((q) => q.topic === topic)).slice(0, n).map((q) => q.id);
    const topics = [...new Set(questions.map((q) => q.topic))];
    const pools = Object.fromEntries(topics.map((t) => [t, shuffle(questions.filter((q) => q.topic === t))]));
    const out = [];
    for (let k = 0; out.length < n && k < questions.length; k++) {
      const pool = pools[topics[k % topics.length]];
      if (pool.length) out.push(pool.shift().id);
    }
    return shuffle(out);
  }

  const api = { WRONG, normalize, answers, label, match, distance, score, keyOf, judge, unused, ranking, places, pick };
  root.AbsoluteZeroGame = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
