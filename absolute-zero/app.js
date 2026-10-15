// Absolute Zero: the teacher's screen for the projector. A quiz in the style of Pointless for the
// whole class: the teacher picks a topic; the students join on their phones (/absolute-zero/play/,
// through a room on the server, which needs the teacher's login) and type one answer to each open
// question while the timer runs. The answers are matched to the question's list (game.js); the
// teacher judges the ones not on it. The reveal counts each answer down a thermometer from 100 to
// the share of the class who gave it too, the rarest last: an answer nobody else gave reaches
// absolute zero. Then the scores, the lowest total leading. The game is kept in the browser
// (localStorage), so a reload loses nothing; the phones see what this screen sends the room.
(function () {
  'use strict';

  const G = window.AbsoluteZeroGame, Z = window.AbsoluteZero, Lang = window.Lang;
  const { L, tr, TOPICS, QUESTIONS, byId, esc, api, storage, questionBox, place, RULES } = Z;
  const KEY = 'absolute-zero-game';
  const GRACE = 2500; // after the timer, the phones' last answers still arrive

  const T = {
    title: () => 'Absolute Zero',
    restart: () => L('New game', 'Neues Spiel'),
  };

  let S = null; // the game; null before setup
  let timer = null, poller = null, pushing = Promise.resolve(), closing = false, fresh = false, run = null;
  let notice = '';

  function save() { storage.set(KEY, S); push(); }
  function load() {
    const s = storage.get(KEY);
    return s && s.v === 1 && Array.isArray(s.qids) && s.qids.every((id) => byId[id]) ? s : null;
  }

  const question = () => byId[S.qids[S.i]];
  const isLast = () => S.i === S.qids.length - 1;
  const round = () => G.judge(question(), S.typed || {}, S.ids || [], S.decisions);
  const nameOf = (id) => ((S.players || []).find((p) => p.id === id) || {}).name || '?';
  const label = (g) => (g.index >= 0 ? G.label(question(), g.index, Lang.get()) : g.texts[0]);

  // ------------------------------------------------------------------ the room on the server
  // what the phones see: the phase, the question, the time left, and from the scores on, each
  // player's score of the round, total and place ({ s: { id: [round, total, place] } })
  function publicState() {
    const st = {
      phase: S.phase, i: S.i, rounds: S.qids.length, q: S.qids[S.i],
      left: S.phase === 'answer' && S.timerEnd ? Math.max(0, (S.timerEnd - Date.now()) / 1000) : null,
    };
    if (S.phase === 'scores' || S.phase === 'end') {
      const places = G.places(S.players, S.totals), s = {};
      S.players.forEach((p) => { const t = S.totals[p.id]; if (t) s[p.id] = [S.last[p.id], t.total, places[p.id]]; });
      st.result = { s, n: S.players.length };
    }
    return st;
  }

  function push() {
    if (!S || !S.code) return;
    const state = publicState();
    pushing = pushing.then(async () => {
      const r = await api(`${S.code}/state`, { state });
      if (r.status === 404) await openRoom(); // (the server restarted: the same room again)
      else setNotice(r.ok ? '' : r.status === 403 ? 'login' : L('The phones cannot be reached right now.', 'Die Handys sind gerade nicht erreichbar.'));
    });
  }

  async function openRoom() {
    const r = await api('open', { code: S.code });
    if (!r.ok) {
      setNotice(r.status === 403 ? 'login' : L('The game server cannot be reached.', 'Der Spielserver ist nicht erreichbar.'));
      return false;
    }
    S.code = r.data.code;
    storage.set(KEY, S);
    const st = await api(`${S.code}/state`, { state: publicState() });
    setNotice(st.ok ? '' : L('The phones cannot be reached right now.', 'Die Handys sind gerade nicht erreichbar.'));
    return true;
  }

  const loginLink = () => `${L('The game needs your teacher login.', 'Das Spiel braucht Ihr Lehrer-Login.')} <a href="/admin/?next=/absolute-zero/">${L('Log in', 'Einloggen')}</a>`;
  function setNotice(n) {
    if (n === notice) return;
    notice = n;
    const el = document.getElementById('notice');
    if (!el) return;
    el.hidden = !n;
    el.innerHTML = n === 'login' ? loginLink() : esc(n);
  }

  // the players and their answers from the room: every second while answering, else less often
  function poll() {
    clearTimeout(poller);
    if (!S || S.phase === 'end') return;
    poller = setTimeout(async () => {
      const r = await api(`${S.code}/host`);
      if (r.ok && S) {
        S.players = r.data.players;
        if (S.phase === 'answer') S.typed = r.data.answers || {};
        storage.set(KEY, S);
        drawPlayers();
      } else if (r.status === 404 && S) await openRoom();
      poll();
    }, S.phase === 'answer' ? 1000 : 2500);
  }

  function drawPlayers() {
    const list = document.getElementById('players');
    if (list) {
      const answered = S.phase === 'answer' ? S.typed || {} : null;
      list.innerHTML = (S.players || []).map((p) => `<li${answered && answered[p.id] ? ' class="done"' : ''}>${esc(p.name)}</li>`).join('')
        || `<li class="muted">${L('nobody yet', 'noch niemand')}</li>`;
    }
    const count = document.getElementById('player-count');
    if (count) count.textContent = (S.players || []).length;
    const done = document.getElementById('answered');
    if (done) done.textContent = `${Object.keys(S.typed || {}).filter((id) => (S.players || []).some((p) => p.id === id)).length} / ${(S.players || []).length}`;
  }

  // ------------------------------------------------------------------ setup
  const ICON = { mixed: '✻', mechanics: '⚙', em: '⚡', waves: '∿', heat: '❄', modern: '☢' };
  const setup = { topic: 'mixed', count: 8, seconds: 30, qids: null };
  const topicTitle = (id) => (id === 'mixed' ? L('Mixed', 'Gemischt') : tr(TOPICS.find((t) => t.id === id).title));
  const draw = () => { setup.qids = G.pick(QUESTIONS, setup.topic, setup.count); };

  function renderSetup() {
    const saved = load();
    if (!setup.qids) draw();
    const topics = ['mixed'].concat(TOPICS.map((t) => t.id)).map((id) => `<button type="button" class="topic" data-topic="${id}" aria-pressed="${setup.topic === id}">
        <span class="topic-icon" aria-hidden="true">${ICON[id]}</span><span class="topic-name">${esc(topicTitle(id))}</span>
        <span class="muted small">${id === 'mixed' ? L('from all five topics', 'aus allen fünf Themen') : L('12 questions', '12 Fragen')}</span></button>`).join('');
    stage(`
      ${saved && saved.phase !== 'end' ? `<div class="card"><h2>${L('A game is in progress', 'Ein Spiel läuft noch')}</h2>
        <p>${L(`Question ${saved.i + 1} of ${saved.qids.length}`, `Frage ${saved.i + 1} von ${saved.qids.length}`)} · ${(saved.players || []).length} ${L('players', 'Mitspielende')}</p>
        <div class="actions"><button type="button" class="primary" id="resume">${L('Continue it', 'Weiterspielen')}</button></div></div>` : ''}
      <div class="card">
        <h2>${L('Topic', 'Thema')}</h2>
        <div class="topics">${topics}</div>
        <div class="row">
          <label>${L('Questions', 'Fragen')}
            <select id="count">${[5, 8, 10, 12].map((n) => `<option${n === setup.count ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>${L('Time to answer', 'Zeit zum Antworten')}
            <select id="seconds">${[20, 30, 45, 60].map((n) => `<option value="${n}"${n === setup.seconds ? ' selected' : ''}>${n} s</option>`).join('')}</select></label>
        </div>
        <ol class="q-list">${setup.qids.map((id) => `<li>${esc(tr(byId[id].q))} <span class="muted small">· ${esc(topicTitle(byId[id].topic))}</span></li>`).join('')}</ol>
        <div class="actions">
          <button type="button" class="primary big" id="start">${L('Open the game', 'Spiel eröffnen')}</button>
          <button type="button" id="redraw">${L('Other questions', 'Andere Fragen')}</button>
        </div>
        <p class="muted small">${L(`About two minutes a question. Students join on their phones with a QR code, without an account; the game needs your teacher login.`,
          `Etwa zwei Minuten pro Frage. Die Schülerinnen und Schüler treten mit einem QR-Code auf dem Handy bei, ohne Konto; das Spiel braucht Ihr Lehrer-Login.`)}</p>
        <p id="setup-error" class="error" hidden></p>
      </div>
      <div class="card">
        <h2>${L('How it works', 'So geht’s')}</h2>
        <p>${RULES()}</p>
        <p>${L('The answers are matched to a list for each question, in English or German, with small typos forgiven. You judge the answers that are not on it, with a hint where a question has a catch. The reveal counts every answer down from 100, the most common first; at the end, the list shows the rare answers nobody thought of.',
          'Die Antworten werden mit einer Liste pro Frage verglichen, auf Deutsch oder Englisch, kleine Tippfehler verziehen. Antworten, die nicht auf der Liste stehen, beurteilen Sie, mit einem Hinweis, wo eine Frage einen Haken hat. Die Auflösung zählt jede Antwort von 100 herunter, die häufigste zuerst; am Schluss zeigt die Liste die seltenen Antworten, auf die niemand kam.')}</p>
      </div>`);
    const el = document.getElementById('stage');
    el.querySelector('#resume')?.addEventListener('click', () => resume(saved));
    el.querySelectorAll('[data-topic]').forEach((b) => b.addEventListener('click', () => {
      setup.topic = b.dataset.topic;
      if (setup.topic !== 'mixed' && setup.count > 12) setup.count = 12;
      draw(); renderSetup();
    }));
    el.querySelector('#count').addEventListener('change', (e) => { setup.count = +e.target.value; draw(); renderSetup(); });
    el.querySelector('#seconds').addEventListener('change', (e) => { setup.seconds = +e.target.value; });
    el.querySelector('#redraw').addEventListener('click', () => { draw(); renderSetup(); });
    el.querySelector('#start').addEventListener('click', start);
  }

  async function start() {
    const btn = document.getElementById('start');
    btn.disabled = true;
    const r = await api('open', {});
    btn.disabled = false;
    if (!r.ok) {
      const err = document.getElementById('setup-error');
      err.hidden = false;
      err.innerHTML = r.status === 403 ? loginLink() : esc(L('The game server cannot be reached. Try again.', 'Der Spielserver ist nicht erreichbar. Nochmals versuchen.'));
      return;
    }
    S = { v: 1, code: r.data.code, topic: setup.topic, qids: setup.qids.slice(), seconds: setup.seconds, i: 0, phase: 'lobby',
      players: [], typed: {}, ids: [], decisions: {}, step: 0, totals: {}, last: {}, scored: -1, timerEnd: null };
    setup.qids = null;
    save();
    render();
  }

  async function resume(saved) {
    S = saved;
    render();
    await openRoom();
  }

  // ------------------------------------------------------------------ the phases
  function joinUrl() { return `${location.origin}/absolute-zero/play/?c=${S.code}`; }
  const shortUrl = () => joinUrl().replace(/^https?:\/\//, '').replace(/\?c=.*/, '');
  function joinLine() {
    return S.code ? `<p class="join-line muted small">${L('Join', 'Beitreten')}: ${esc(shortUrl())} · ${L('code', 'Code')} <b>${esc(S.code)}</b></p>` : '';
  }
  function head() {
    return `<div class="round-head"><span class="tag">${esc(topicTitle(question().topic))}</span>
      <span class="count">${L(`Question ${S.i + 1} of ${S.qids.length}`, `Frage ${S.i + 1} von ${S.qids.length}`)}</span></div>`;
  }

  function renderLobby() {
    const url = joinUrl();
    let qr = '';
    try { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { /* no QR code */ }
    stage(`<div class="card lobby">
      <div class="qr">${qr}</div>
      <div>
        <h2>${L('Join on your phone', 'Auf dem Handy beitreten')}</h2>
        <p class="join-url">${esc(shortUrl())}</p>
        <p>${L('Game code', 'Spielcode')} <span class="code">${esc(S.code || '…')}</span></p>
        <p class="muted">${L('Type your name. Players:', 'Namen eingeben. Mitspielende:')} <b id="player-count">${(S.players || []).length}</b></p>
      </div>
    </div>
    <div class="card"><h2>${L('The rules', 'Die Regeln')}</h2><p class="rules-big">${RULES()}</p>
      <ul id="players" class="players"></ul>
      <div class="actions"><button type="button" class="primary big" id="go">${L('First question', 'Erste Frage')}</button></div>
    </div>`);
    drawPlayers();
    document.getElementById('go').addEventListener('click', ask);
  }

  function ask() {
    S.phase = 'answer';
    S.typed = {}; S.ids = []; S.decisions = {}; S.step = 0;
    S.timerEnd = Date.now() + S.seconds * 1000;
    save();
    render();
  }

  function renderAnswer() {
    stage(`<div class="card">${head()}${questionBox(question())}
      <div id="clock"></div>
      <p class="answered">${L('Answers', 'Antworten')}: <b id="answered"></b></p>
      <ul id="players" class="players"></ul>
      <div class="actions center"><button type="button" id="close">${L('Close the answers', 'Antworten schliessen')}</button></div>
    </div>${joinLine()}`);
    drawPlayers();
    document.getElementById('close').addEventListener('click', closeAnswers);
    tick();
  }

  function tick() {
    clearInterval(timer);
    const clock = document.getElementById('clock');
    if (!clock || !S.timerEnd) return;
    let beeped = S.timerEnd <= Date.now();
    const draw = () => {
      const left = Math.max(0, Math.ceil((S.timerEnd - Date.now()) / 1000));
      clock.innerHTML = left > 0 ? `<div class="timer${left <= 5 ? ' low' : ''}" role="timer">${left}</div>`
        : `<div class="cards-up">${L('Time’s up!', 'Zeit ist um!')}</div>`;
      if (left <= 0 && !beeped) { beeped = true; beep([660, 440]); }
      if (Date.now() > S.timerEnd + GRACE) { clearInterval(timer); closeAnswers(); }
    };
    draw();
    timer = setInterval(draw, 250);
  }

  // the answers as the room has them now; then the teacher judges the ones not on the list
  async function closeAnswers() {
    if (closing || !S || S.phase !== 'answer') return;
    closing = true;
    clearInterval(timer);
    const r = await api(`${S.code}/host`);
    closing = false;
    if (!S || S.phase !== 'answer') return;
    if (r.ok) { S.players = r.data.players; S.typed = r.data.answers || {}; }
    S.ids = S.players.map((p) => p.id);
    S.timerEnd = null;
    S.phase = round().unlisted.length ? 'judge' : 'reveal';
    S.step = 0;
    fresh = false;
    save();
    render();
  }

  function renderJudge() {
    const q = question(), res = round(), list = G.answers(q);
    const options = (key) => {
      const d = S.decisions[key] || 'no';
      return `<option value="no"${d === 'no' ? ' selected' : ''}>✗ ${L('wrong (100)', 'falsch (100)')}</option>
        <option value="ok"${d === 'ok' ? ' selected' : ''}>✓ ${L('correct, an answer of its own', 'richtig, eine eigene Antwort')}</option>
        <optgroup label="${esc(L('correct, the same as …', 'richtig, dasselbe wie …'))}">
        ${list.map((a, k) => `<option value="a${k}"${d === `a${k}` ? ' selected' : ''}>= ${esc(Lang.get() === 'de' ? a.de : a.name)}</option>`).join('')}</optgroup>`;
    };
    const matched = res.groups.filter((g) => g.index >= 0).reduce((n, g) => n + g.ids.length, 0);
    stage(`<div class="card">${head()}${questionBox(q)}</div>
      <div class="card"><h2>${L('Not on the list', 'Nicht auf der Liste')}</h2>
        <p class="muted">${L(`${matched} answers were found on the list. Judge the others (a wrong answer scores 100); the class can argue its case.`,
          `${matched} Antworten stehen auf der Liste. Beurteilen Sie die anderen (eine falsche Antwort gibt 100); die Klasse darf argumentieren.`)}</p>
        ${q.note ? `<p class="hint">${esc(tr(q.note))}</p>` : ''}
        <ul class="judge">${res.unlisted.map((u) => `<li>
          <span class="said">${u.texts.map((t) => `«${esc(t)}»`).join(' ')}${u.ids.length > 1 ? ` <span class="muted">× ${u.ids.length}</span>` : ''}</span>
          <select data-key="${esc(u.key)}" aria-label="${esc(L('Verdict', 'Urteil'))}">${options(u.key)}</select></li>`).join('')}</ul>
        <div class="actions"><button type="button" class="primary big" id="reveal">${L('Reveal the answers', 'Antworten auflösen')}</button></div>
      </div>`);
    document.querySelectorAll('[data-key]').forEach((sel) => sel.addEventListener('change', () => {
      S.decisions[sel.dataset.key] = sel.value;
      storage.set(KEY, S);
    }));
    document.getElementById('reveal').addEventListener('click', () => { S.phase = 'reveal'; S.step = 0; save(); render(); });
  }

  // the reveal: one answer at a time, the most common first, counted down a thermometer
  function renderReveal() {
    const q = question(), res = round(), groups = res.groups, n = res.n;
    const shown = groups.slice(0, S.step);
    const cur = S.step > 0 && S.step <= groups.length ? groups[S.step - 1] : null;
    const rest = S.step > groups.length;
    const rows = shown.map((g) => `<li class="${g.score === 0 ? 'zero' : ''}">
        <span class="lbl">${esc(label(g))}${g.index < 0 ? ` <span class="muted small">(${L('not on the list', 'nicht auf der Liste')})</span>` : ''}</span>
        <span class="who muted small">${g.ids.map((id) => esc(nameOf(id))).join(', ')}</span>
        <span class="pts">${g.score}</span></li>`).join('');
    const unused = G.unused(q, groups);
    stage(`<div class="card">${head()}${questionBox(q)}
      <div class="reveal">
        <div class="thermo-wrap">${thermo(cur ? (fresh ? 100 : cur.score) : 100)}</div>
        <div class="current">
          ${cur ? `<p class="big-answer">${esc(label(cur))}</p>
            ${cur.texts.length && cur.texts.some((t) => t !== label(cur)) ? `<p class="muted small">${cur.texts.map((t) => `«${esc(t)}»`).join(' ')}</p>` : ''}
            <p class="said-by">${L(`${cur.ids.length} of ${n}`, `${cur.ids.length} von ${n}`)}: ${cur.ids.map((id) => esc(nameOf(id))).join(', ')}</p>
            <p class="zero-banner" id="banner"${!fresh && cur.score === 0 ? '' : ' hidden'}>${L('Absolute zero!', 'Absoluter Nullpunkt!')}</p>`
          : rest ? '' : `<p class="muted">${groups.length ? L(`${groups.length} different correct answers. The most common first …`, `${groups.length} verschiedene richtige Antworten. Die häufigste zuerst …`) : L('Nobody found a correct answer.', 'Niemand fand eine richtige Antwort.')}</p>`}
          ${rest ? `<div class="wrong-box"><h3>${L('Wrong or no answer', 'Falsch oder keine Antwort')}: 100</h3>
              <p>${res.wrong.length ? res.wrong.map((id) => esc(nameOf(id)) + (S.typed[id] ? ` <span class="muted small">«${esc(S.typed[id])}»</span>` : '')).join(', ') : L('nobody', 'niemand')}</p></div>
            ${unused.length ? `<div class="unused"><h3>${L('Nobody said', 'Niemand sagte')}</h3>
              <ul>${unused.map((k) => `<li${G.answers(q)[k].rare ? ' class="rare"' : ''}>${esc(G.label(q, k, Lang.get()))}</li>`).join('')}</ul></div>` : ''}` : ''}
        </div>
      </div>
      <ol class="revealed">${rows}</ol>
      <div class="actions">${!rest ? `<button type="button" class="primary big" id="next">${S.step < groups.length ? L('Next answer', 'Nächste Antwort') : L('Wrong answers and what nobody said', 'Falsche Antworten und was niemand sagte')}</button>
          ${S.step < groups.length ? `<button type="button" id="all">${L('Show all', 'Alle zeigen')}</button>` : ''}`
        : `<button type="button" class="primary big" id="scores">${L('Scores', 'Punkte')}</button>`}
        ${S.step === 0 && res.unlisted.length ? `<button type="button" id="rejudge">${L('Back to judging', 'Zurück zum Beurteilen')}</button>` : ''}
      </div>
    </div>`);
    document.getElementById('next')?.addEventListener('click', () => { S.step++; fresh = S.step <= groups.length; save(); render(); });
    document.getElementById('all')?.addEventListener('click', () => { S.step = groups.length; fresh = false; save(); render(); });
    document.getElementById('scores')?.addEventListener('click', toScores);
    document.getElementById('rejudge')?.addEventListener('click', () => { S.phase = 'judge'; save(); render(); });
    if (cur && fresh) { fresh = false; countDown(cur.score); }
  }

  // a thermometer from 100 (top) to 0 (bottom), its column at `value`
  function thermo(value) {
    const ticks = [0, 25, 50, 75, 100].map((t) => `<span style="bottom:${t}%">${t}</span>`).join('');
    return `<div class="thermo${value === 0 ? ' frozen' : ''}" id="thermo"><div class="tube"><div class="col" id="col" style="height:${value}%"></div><div class="ticks">${ticks}</div></div>
      <div class="bulb"></div></div><div class="reading${value === 0 ? ' frozen' : ''}" id="reading">${value}</div>`;
  }

  function countDown(target) {
    cancelAnimationFrame(run);
    const col = document.getElementById('col'), reading = document.getElementById('reading'), box = document.getElementById('thermo');
    const ms = 700 + 28 * (100 - target), t0 = performance.now();
    sweep(ms, target);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 2.2);
      const v = Math.round(100 - (100 - target) * e);
      if (col) col.style.height = `${v}%`;
      if (reading) reading.textContent = v;
      if (k < 1) { run = requestAnimationFrame(step); return; }
      if (target === 0) {
        box?.classList.add('frozen');
        reading?.classList.add('frozen');
        const b = document.getElementById('banner');
        if (b) b.hidden = false;
        beep([1320, 1760, 2640]);
      }
    };
    run = requestAnimationFrame(step);
  }

  let audio = null;
  const ctx = () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); return audio; } catch (e) { return null; } };
  function beep(freqs) {
    const c = ctx();
    if (!c) return;
    freqs.forEach((f, k) => {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + k * 0.14;
      o.frequency.value = f; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.32);
    });
  }
  // the falling tone of the column
  function sweep(ms, target) {
    const c = ctx();
    if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'triangle';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(900 - 7 * (100 - target) + 1, t + ms / 1000);
    g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + ms / 1000);
  }

  // the round's scores into the totals (once per question); a player who joined late has 100 for
  // each question before
  function toScores() {
    if (S.scored !== S.i) {
      const res = round();
      S.last = {};
      S.players.forEach((p) => {
        const t = S.totals[p.id] || (S.totals[p.id] = { total: G.WRONG * S.i, zeros: 0 });
        const sc = res.scores[p.id] != null ? res.scores[p.id] : G.WRONG;
        t.total += sc;
        if (sc === 0) t.zeros++;
        S.last[p.id] = sc;
      });
      S.scored = S.i;
    }
    S.phase = 'scores';
    save();
    render();
  }

  function table(limit) {
    const players = S.players.filter((p) => S.totals[p.id]);
    const order = G.ranking(players, S.totals), places = G.places(players, S.totals);
    return `<table class="scores"><thead><tr><th></th><th>${L('Name', 'Name')}</th><th class="num">${L('This question', 'Diese Frage')}</th><th class="num">❄</th><th class="num">${L('Total', 'Total')}</th></tr></thead>
      <tbody>${order.slice(0, limit).map((p) => `<tr${places[p.id] === 1 ? ' class="lead"' : ''}><td class="num">${places[p.id]}</td><th scope="row">${esc(p.name)}</th>
        <td class="num ${S.last[p.id] === 0 ? 'zero' : ''}">${S.last[p.id] != null ? S.last[p.id] : '–'}</td><td class="num">${S.totals[p.id].zeros || ''}</td><td class="num total">${S.totals[p.id].total}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderScores() {
    stage(`<div class="card"><h2>${L(`After question ${S.i + 1} of ${S.qids.length}`, `Nach Frage ${S.i + 1} von ${S.qids.length}`)}</h2>
      <p class="muted small">${L('Lowest total first; ❄ counts the absolute zeros, which break a tie.', 'Tiefste Summe zuerst; ❄ zählt die absoluten Nullpunkte, die bei Gleichstand entscheiden.')}</p>
      <div class="table-scroll">${table(15)}</div>
      <div class="actions"><button type="button" class="primary big" id="next">${isLast() ? L('Final result', 'Schlussresultat') : L('Next question', 'Nächste Frage')}</button></div></div>${joinLine()}`);
    document.getElementById('next').addEventListener('click', () => {
      if (isLast()) { S.phase = 'end'; save(); render(); return; }
      S.i++;
      ask();
    });
  }

  function renderEnd() {
    const players = S.players.filter((p) => S.totals[p.id]);
    const order = G.ranking(players, S.totals), places = G.places(players, S.totals);
    stage(`<div class="card"><h2>${L('Final result', 'Schlussresultat')}</h2>
      <ol class="podium">${order.slice(0, 3).map((p) => `<li><span>${places[p.id]}. ${esc(p.name)}</span><span>${S.totals[p.id].total}${S.totals[p.id].zeros ? ` <small>❄ ${S.totals[p.id].zeros}</small>` : ''}</span></li>`).join('')}</ol>
      ${order.length > 3 ? `<details><summary>${L('Everyone', 'Alle')}</summary><div class="table-scroll">${table(200)}</div></details>` : ''}
      <p class="muted">${L('Debrief: which answer nobody gave surprised you most?', 'Zum Schluss: welche Antwort, die niemand gab, hat euch am meisten überrascht?')}</p>
      <div class="actions"><button type="button" class="primary" id="again">${L('New game', 'Neues Spiel')}</button></div></div>`);
    document.getElementById('again').addEventListener('click', newGame);
  }

  // ------------------------------------------------------------------ the page
  function stage(html) {
    document.getElementById('stage').innerHTML = `<p id="notice" class="error"${notice ? '' : ' hidden'}></p>${html}`;
    const n = notice; notice = null; setNotice(n);
  }

  function render() {
    clearInterval(timer);
    cancelAnimationFrame(run);
    Lang.apply(T);
    document.title = T.title();
    document.getElementById('restart').hidden = !S;
    if (!S) { clearTimeout(poller); renderSetup(); return; }
    ({ lobby: renderLobby, answer: renderAnswer, judge: renderJudge, reveal: renderReveal, scores: renderScores, end: renderEnd })[S.phase]();
    poll();
  }

  function newGame() {
    if (S && S.phase !== 'end' && !window.confirm(L('End this game and set up a new one?', 'Dieses Spiel beenden und ein neues einrichten?'))) return;
    if (S && S.code) api(`${S.code}/close`, {});
    S = null;
    storage.remove(KEY);
    setNotice('');
    render();
  }

  Lang.init();
  Lang.wire(() => { fresh = false; render(); });
  document.getElementById('restart').addEventListener('click', newGame);
  render();
})();
