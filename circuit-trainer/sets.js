// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// Sets of apps for a class: in the admin panel (/admin/), the teacher chooses some apps and, in
// each, its modes (tutor, practice, check) and its learning objectives. The set is opened at
// /<teacher>/<name> (or /<name>: the default teacher's): the hub page with only its apps, which link
// to /<app>/?set=<teacher>/<name> (or ?set=<name>). Here, in the app, the
// set hides what it leaves out (it is a view, not access control): with objectives chosen, the
// tutor shows only their worked examples, practice offers only their topics, and the check asks
// only them. It is remembered for the tab (sessionStorage lp-set: { name, set }, written by the hub
// page), so that it applies before the app starts; an app opened with ?set= without it waits for
// /sets.json and reloads. ?set= (empty) leaves the set, and so does the hub page at /.
// Sets saved before there were objectives list worked examples (tutor: indices) and practice
// stages (practice: keys) instead; those still apply as they did.
//   LPSets.name                the set's name, or null
//   LPSets.mode(m)             whether mode m (tutor, practice, check) is in the set
//   LPSets.objectives()        the ids of the objectives in the set, or null (all), once the
//                              check has registered
//   LPSets.tutor()             the indices of the worked examples to show, or null (all): those of
//                              the set's objectives, once the check has said which they are
//   LPSets.topics()            the indices of the practice topics to offer, or null (all): likewise
//   LPSets.practice()          the keys of the practice stages to offer (sets saved before), or null
//   LPSets.register(what, x)   topics.js ('topics', the app's topics), tutor.js ('tutor',
//                              { names() }) and check.js ('check', its source, with the
//                              objectives) say what the app has
//   LPSets.on(fn)              fn() runs once the set's objectives are known (the check has
//                              registered): tutor.js and topics.js then limit themselves to them
//   LPSets.stageKey(stage)     a stage's key: its types joined with '+'
//   LPSets.lang()              the language the set fixes ('en', 'de'), or null (the student's
//                              choice); lang.js asks for it
// The app creates its topics, tutor and check in that order, all at once when it starts (see an
// app's init), so the limits are in place before anything is shown.
// With ?outline=1 (the admin panel loads the app in a hidden frame), the app posts its modes,
// learning objectives, worked examples and topics with their stages to the page that holds the
// frame (same origin).
(function (root) {
  'use strict';

  const KEY = 'lp-set', NAME = /^(?:[a-z]{3}\/)?[a-z0-9][a-z0-9-]{0,39}$/;
  // a set of /sets.json by its name: "xyz/name", or "name", the default teacher's (in a file written
  // before there were teachers, "name" itself)
  function find(d, name) {
    const sets = d && d.sets && typeof d.sets === 'object' ? d.sets : {};
    const own = (k) => (Object.prototype.hasOwnProperty.call(sets, k) ? sets[k] : null);
    const s = own(name) || (!name.includes('/') && d && typeof d.default === 'string' ? own(`${d.default}/${name}`) : null);
    return s && typeof s === 'object' && !Array.isArray(s) ? s : null;
  }
  const stageKey = (stage) => stage.types.join('+');
  // What a set's objectives (ids) leave of the app's objectives ([{ id, tutor, topic }]): the
  // objectives, the worked examples and the practice topics, the indices sorted; null if the set
  // names none of them (then it does not limit the app).
  function limits(objectives, ids) {
    if (!Array.isArray(ids)) return null;
    const chosen = objectives.filter((o) => ids.includes(o.id));
    if (!chosen.length) return null;
    const of = (k) => [...new Set(chosen.map((o) => o[k]).filter(Number.isInteger))].sort((a, b) => a - b);
    return { objectives: chosen, tutor: of('tutor'), topics: of('topic') };
  }
  const pure = { stageKey, limits, NAME, find };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = pure; return; }

  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } };
  const save = (v) => { try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ } };
  const q = new URLSearchParams(location.search), outline = q.get('outline') === '1';
  const app = (location.pathname.match(/^\/([a-z0-9-]+)\//) || [])[1];
  let stored = read(), name = outline ? null : q.get('set');
  if (name === '') { save(null); stored = null; }
  if (name == null && stored && !outline) name = stored.name;
  if (name && !NAME.test(name)) name = null;
  const set = name && stored && stored.name === name && stored.set && typeof stored.set === 'object' ? stored.set : null;
  const entry = set && Array.isArray(set.apps) ? set.apps.find((a) => a && a.id === app) || null : null;
  const reg = {};

  // a set not yet known in this tab: wait for it (the page hidden), then reload with it
  function fetchSet(then) {
    fetch('/sets.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      then(find(d, name));
    }).catch(() => then(undefined));
  }
  if (name && !set) {
    const style = document.createElement('style');
    style.textContent = 'body { visibility: hidden; }';
    document.head.append(style);
    const show = () => style.remove();
    setTimeout(show, 3000);
    fetchSet((s) => { if (s) { save({ name, set: s }); location.reload(); } else { if (s === null) save(null); show(); } });
  } else if (set) {
    // the teacher may have changed it since: then reload with the new one
    fetchSet((s) => {
      if (s === undefined || JSON.stringify(s) === JSON.stringify(set)) return;
      save(s ? { name, set: s } : null);
      location.reload();
    });
  }

  // (in a set saved before, the arcade is now the check, and the problems are now practice)
  const setModes = entry && Array.isArray(entry.modes) ? entry.modes.map((m) => ({ arcade: 'check', real: 'practice' })[m] || m) : [];
  const modeOn = (m) => !entry || setModes.includes(m);
  const ids = entry && Array.isArray(entry.objectives) ? entry.objectives.filter((k) => typeof k === 'string') : null;
  let limit = null; // what the set's objectives leave, once the check has registered (see limits)
  const listeners = [];
  const LPSets = {
    name: set ? name : null,
    mode: modeOn,
    objectives: () => (limit ? limit.objectives.map((o) => o.id) : null),
    tutor: () => (limit ? limit.tutor : ids ? null : entry && Array.isArray(entry.tutor) ? entry.tutor.filter(Number.isInteger) : null),
    topics: () => (limit ? limit.topics : null),
    practice: () => (!ids && entry && Array.isArray(entry.practice) ? entry.practice.filter((k) => typeof k === 'string') : null),
    register(what, x) {
      reg[what] = x;
      if (what !== 'check' || !ids) return;
      limit = limits(x.objectives, ids);
      if (limit) listeners.forEach((fn) => fn());
    },
    on(fn) { listeners.push(fn); },
    stageKey,
    lang: () => (set && ['en', 'de'].includes(set.lang) ? set.lang : null),
  };
  root.LPSets = LPSets;

  const text = (html) => { const d = document.createElement('div'); d.innerHTML = String(html == null ? '' : html); return d.textContent.trim(); };
  function outlineOf() {
    const modes = [...document.querySelectorAll('input[name="mode"]')].map((r) => r.value);
    return {
      type: 'lp-outline', app, modes,
      objectives: reg.check ? reg.check.objectives.map((o) => ({ id: o.id, name: text(o.name()), tutor: Number.isInteger(o.tutor) ? o.tutor : null, topic: Number.isInteger(o.topic) ? o.topic : null })) : [],
      tutor: reg.tutor ? reg.tutor.names().map(text) : [],
      topics: (reg.topics || []).map((t) => ({ name: text(t.name()), stages: t.stages.map((s) => ({ name: s.name ? text(s.name()) : null, key: stageKey(s) })) })),
    };
  }

  // once the app has started (its own handlers have run): hide the modes not in the set, leave one
  // that is not, and point the home link to the set
  function after() {
    if (outline) { if (root.parent !== root) root.parent.postMessage(outlineOf(), location.origin); return; }
    if (!set) return;
    const home = document.querySelector('a.home');
    if (home) home.href = `/${name}`;
    if (!entry) return;
    const radios = [...document.querySelectorAll('input[name="mode"]')];
    radios.forEach((r) => { const l = r.closest('label'); if (l) l.hidden = !modeOn(r.value); });
    const cur = radios.find((r) => r.checked), first = radios.find((r) => modeOn(r.value));
    if (first && (!cur || !modeOn(cur.value))) {
      first.checked = true;
      first.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  // (deferred, this file runs before the app, maybe in another task: wait for the end of parsing)
  if (document.readyState === 'complete') setTimeout(after);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(after));
})(typeof window !== 'undefined' ? window : globalThis);
