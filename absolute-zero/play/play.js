// Absolute Zero on a student's phone: join the game with its code (the QR code on the projector
// carries it) and a name, then type one answer to each question while the timer runs (it can be
// changed until the time is up), watch the reveal on the projector, and see the own score, total
// and place. The phone asks the room on the server every second or so (hub-admin/hubadmin.py,
// ZeroRooms); the player is remembered in the browser, so a reload, or a restart of the server,
// joins again by itself.
(function () {
  'use strict';

  const Z = window.AbsoluteZero, Lang = window.Lang;
  const { L, byId, esc, api, storage, questionBox, place, RULES } = Z;
  const KEY = 'absolute-zero-player';

  let code = (new URLSearchParams(location.search).get('c') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  let player = storage.get(KEY); // { code, token, name }
  if (!code && player) code = player.code;
  if (player && player.code !== code) player = null;

  let data = null, status = 'idle', key = '', deadline = null, poller = null, clock = null;
  let draft = null; // the answer being typed: { i, text }
  let sent = '';
  let renaming = false;

  const view = () => document.getElementById('view');
  const me = () => (data && data.me) || null;
  const state = () => (data && data.state) || null;

  // ------------------------------------------------------------------ the server
  async function refresh() {
    clearTimeout(poller);
    if (!code) { status = 'code'; render(); return; }
    const r = await api(`${code}?token=${encodeURIComponent((player && player.token) || '')}`);
    if (r.ok) {
      data = r.data;
      status = 'ok';
      deadline = data.left == null ? null : Date.now() + data.left * 1000;
      // after a restart of the server: join again as before
      if (!data.me && player && player.name && state()) {
        const j = await api(`${code}/join`, { name: player.name, token: player.token });
        if (j.ok) { player.token = j.data.token; storage.set(KEY, player); return refresh(); }
      }
    } else status = r.status === 404 ? 'gone' : 'offline';
    render();
    poller = setTimeout(refresh, status === 'ok' ? ((state() || {}).phase === 'answer' ? 1000 : 1500) : 3000);
  }

  async function join(name) {
    const r = await api(`${code}/join`, { name, token: player && player.token });
    if (!r.ok) return (r.data && r.data.error) || L('Could not join.', 'Beitreten ging nicht.');
    player = { code, token: r.data.token, name: name.trim() };
    renaming = false;
    storage.set(KEY, player);
    key = '';
    await refresh();
    return '';
  }

  // ------------------------------------------------------------------ rendering
  // the whole view is drawn again only when what it shows changes (so typing is not disturbed)
  function render() {
    Lang.apply({ title: () => 'Absolute Zero' });
    const st = state(), m = me();
    const k = [status, Lang.get(), st && st.phase, st && st.i, m && m.name, status === 'ok' && (!m || renaming) ? 'join' : '',
      st && st.result ? JSON.stringify(st.result.s[m && m.id] || null) : ''].join('|');
    drawMe();
    if (k !== key) {
      key = k;
      if (status === 'code' || status === 'gone') drawCode();
      else if (status === 'offline' && !data) view().innerHTML = `<div class="card"><p>${L('Connecting …', 'Verbinde …')}</p></div>`;
      else if (!st) view().innerHTML = `<div class="card"><p>${L('The game is about to start …', 'Das Spiel beginnt gleich …')}</p></div>`;
      else if (!m || renaming) drawJoin();
      else ({ lobby: drawLobby, answer: drawAnswer, judge: drawWait, reveal: drawWait, scores: drawScores, end: drawEnd })[st.phase]();
    }
    update();
  }

  function mine() {
    const st = state(), m = me();
    return st && st.result && m ? st.result.s[m.id] || null : null; // [round, total, place]
  }

  function drawMe() {
    const el = document.getElementById('me'), m = me(), st = state(), s = mine();
    el.hidden = !(m && st);
    if (el.hidden) return;
    el.innerHTML = `<span><b>${esc(m.name)}</b>${st.phase !== 'lobby' ? ` · ${L(`question ${st.i + 1} of ${st.rounds}`, `Frage ${st.i + 1} von ${st.rounds}`)}` : ''}</span>
      <span class="mine-total">${s ? s[1] : ''}</span>`;
  }

  function drawCode() {
    view().innerHTML = `<div class="card">
      ${status === 'gone' ? `<p class="error">${L('No game with this code is running right now.', 'Mit diesem Code läuft gerade kein Spiel.')}</p>` : ''}
      <h2>${L('Join the game', 'Dem Spiel beitreten')}</h2>
      <form id="code-form" class="row">
        <label>${L('Game code', 'Spielcode')} <input id="code" class="code-input" maxlength="4" autocomplete="off" autocapitalize="characters" value="${esc(code)}"></label>
        <button type="submit" class="primary">${L('Join', 'Beitreten')}</button>
      </form></div>`;
    document.getElementById('code-form').addEventListener('submit', (e) => {
      e.preventDefault();
      code = document.getElementById('code').value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      history.replaceState(null, '', `?c=${code}`);
      key = '';
      refresh();
    });
  }

  function drawJoin() {
    view().innerHTML = `<div class="card">
      <h2>${L('Join the game', 'Dem Spiel beitreten')}</h2>
      <form id="join-form">
        <p><label>${L('Your name', 'Dein Name')}<br><input id="name" maxlength="24" autocomplete="given-name" value="${esc((player && player.name) || '')}" class="full"></label></p>
        <button type="submit" class="primary big">${L('Join', 'Beitreten')}</button>
      </form>
      <p id="join-error" class="error" hidden></p></div>`;
    document.getElementById('join-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim(), err = document.getElementById('join-error');
      if (!name) { err.hidden = false; err.textContent = L('Type your name first.', 'Zuerst den Namen eingeben.'); return; }
      const msg = await join(name);
      if (msg) { err.hidden = false; err.textContent = msg; }
    });
  }

  function drawLobby() {
    view().innerHTML = `<div class="card"><h2>${L('You’re in!', 'Du bist dabei!')}</h2>
      <p>${RULES()}</p>
      <p class="muted small">${L('Players', 'Mitspielende')}: ${(data.players || []).map(esc).join(', ')}</p>
      <p class="small"><button type="button" class="link-btn" id="rename">${L('Change your name', 'Namen ändern')}</button></p></div>`;
    document.getElementById('rename').addEventListener('click', () => { renaming = true; key = ''; render(); });
  }

  function drawAnswer() {
    const st = state(), q = byId[st.q];
    if (!draft || draft.i !== st.i) { draft = { i: st.i, text: '' }; sent = ''; }
    view().innerHTML = `<div id="left" class="timer small-timer"></div>
      <div class="card">${q ? questionBox(q) : ''}
        <form id="answer-form" class="answer-form">
          <input id="answer" maxlength="60" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" value="${esc(draft.text)}" aria-label="${esc(L('Your answer', 'Deine Antwort'))}" placeholder="${esc(L('Your answer', 'Deine Antwort'))}">
          <button type="submit" class="primary big" id="send">${L('Send', 'Senden')}</button>
        </form>
        <p id="sent" class="small"></p>
        <p class="muted small">${L('Something few others will think of, but correct! You can change it until the time is up.', 'Etwas, woran wenige andere denken, aber richtig! Bis die Zeit um ist, kannst du sie ändern.')}</p>
      </div>`;
    const inp = document.getElementById('answer');
    inp.addEventListener('input', () => { draft.text = inp.value; sent = ''; update(); });
    document.getElementById('answer-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = inp.value.trim();
      if (!text) return;
      const btn = document.getElementById('send');
      btn.disabled = true;
      const r = await api(`${code}/answer`, { token: player.token, i: st.i, text });
      btn.disabled = false;
      sent = r.ok ? '' : `✗ ${(r.data && r.data.error) || L('not sent', 'nicht gesendet')}`;
      if (r.ok) data.answer = r.data.answer;
      update();
    });
  }

  function drawWait() {
    const st = state();
    view().innerHTML = `<div class="card watch">
      <p class="mine-answer">${data.answer ? `${L('Your answer', 'Deine Antwort')}: <b>${esc(data.answer)}</b>` : `<span class="muted">${L('You gave no answer.', 'Du hast keine Antwort gegeben.')}</span>`}</p>
      <p class="big-watch">${st.phase === 'judge' ? L('The answers are being checked …', 'Die Antworten werden geprüft …') : L('Watch the screen!', 'Schau auf die Leinwand!')}</p>
      <div class="thermo mini" aria-hidden="true"><div class="tube"><div class="col falling"></div></div><div class="bulb"></div></div>
    </div>`;
  }

  function drawScores() {
    const s = mine(), n = (state().result || {}).n || 0;
    view().innerHTML = `<div class="card">
      ${data.answer ? `<p class="mine-answer">${L('Your answer', 'Deine Antwort')}: <b>${esc(data.answer)}</b></p>` : ''}
      ${s ? `<p class="my-score${s[0] === 0 ? ' zero' : ''}">${s[0]}</p>
        ${s[0] === 0 ? `<p class="zero-banner">${L('Absolute zero!', 'Absoluter Nullpunkt!')}</p>` : ''}
        <p class="result">${L('Total', 'Total')} ${s[1]} · ${place(s[2])} ${L(`of ${n}`, `von ${n}`)}</p>`
        : `<p class="muted">${L('You join the scores from the next question on.', 'Du bist ab der nächsten Frage in der Wertung.')}</p>`}
    </div>`;
  }

  function drawEnd() {
    const s = mine(), n = (state().result || {}).n || 0;
    view().innerHTML = `<div class="card"><h2>${L('Final result', 'Schlussresultat')}</h2>
      ${s ? `<p class="my-score${s[2] === 1 ? ' zero' : ''}">${place(s[2])}</p><p class="result">${L(`of ${n}, with ${s[1]} points`, `von ${n}, mit ${s[1]} Punkten`)}</p>` : ''}
      <p class="muted">${L('Thanks for playing!', 'Danke fürs Mitspielen!')}</p></div>`;
  }

  // the parts that change without a new view: the timer and the answer sent
  function update() {
    const st = state();
    clearInterval(clock);
    const left = document.getElementById('left');
    if (left && st && st.phase === 'answer') {
      const draw = () => {
        const s = deadline == null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        left.textContent = s == null ? '' : s > 0 ? String(s) : L('Time’s up!', 'Zeit ist um!');
        left.classList.toggle('low', s != null && s <= 5);
        const send = document.getElementById('send');
        if (send) send.disabled = s === 0;
      };
      draw();
      clock = setInterval(draw, 250);
    }
    const note = document.getElementById('sent');
    if (note && data) {
      const typed = draft ? draft.text.trim() : '';
      note.className = `small ${sent ? 'bad-text' : data.answer ? 'ok-text' : 'muted'}`;
      note.innerHTML = sent ? esc(sent) : data.answer
        ? `✓ ${L('Sent', 'Gesendet')}: <b>${esc(data.answer)}</b>${typed && typed !== data.answer ? ` · ${L('send again to change it', 'nochmals senden, um sie zu ändern')}` : ''}`
        : L('Not sent yet.', 'Noch nicht gesendet.');
    }
  }

  Lang.init();
  Lang.wire(() => { key = ''; render(); });
  refresh();
})();
