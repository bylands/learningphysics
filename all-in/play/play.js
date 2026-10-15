// All In on a student's phone: join the game with its code (the QR code on the projector carries
// it), pick a team and a name, then follow the rounds: the question with its animation, the bet
// form while the timer runs (any member places the team's bet; the last one sent counts), the
// outcome and the team's result, the hot seat, and the final ranking. The phone asks the room on
// the server every second or so (hub-admin/hubadmin.py, AllInRooms); the player is remembered in
// the browser, so a reload, or a restart of the server, joins again by itself.
(function () {
  'use strict';

  const G = window.AllInGame, A = window.AllIn, Lang = window.Lang;
  const { L, tr, byId, LETTERS, TYPE, RULE, ERR, esc, withUnit, describe, api, storage } = A;
  const KEY = 'all-in-player';

  let code = (new URLSearchParams(location.search).get('c') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  let player = storage.get(KEY); // { code, token, name, team }
  if (!code && player) code = player.code;
  if (player && player.code !== code) player = null;

  let data = null, status = 'idle', key = '', anim = null, deadline = null, poller = null, clock = null;
  let draft = null; // the bet being typed: { i, raw }
  let sent = '';    // a note after sending
  let changing = false; // the player is choosing another team or name

  const view = () => document.getElementById('view');
  const me = () => (data && data.me) || null;
  const state = () => (data && data.state) || null;
  const round = () => byId[(state() || {}).round];

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
      if (!data.me && player && player.name && state() && player.team < state().teams.length) {
        const j = await api(`${code}/join`, { name: player.name, team: player.team, token: player.token });
        if (j.ok) { player.token = j.data.token; storage.set(KEY, player); return refresh(); }
      }
    } else status = r.status === 404 ? 'gone' : 'offline';
    render();
    poller = setTimeout(refresh, status === 'ok' ? ((state() || {}).phase === 'bet' ? 1000 : 1500) : 3000);
  }

  async function join(name, team) {
    const r = await api(`${code}/join`, { name, team, token: player && player.token });
    if (!r.ok) return (r.data && r.data.error) || L('Could not join.', 'Beitreten ging nicht.');
    player = { code, token: r.data.token, name: name.trim(), team };
    changing = false;
    storage.set(KEY, player);
    key = '';
    await refresh();
    return '';
  }

  // ------------------------------------------------------------------ rendering
  // the whole view is drawn again only when what it shows changes (so typing is not disturbed);
  // the timer, the chips and the team's bet are updated in place
  function render() {
    Lang.apply({ title: () => 'All In' });
    const st = state(), m = me();
    const k = [status, Lang.get(), st && st.phase, st && st.i, m && m.team, m && m.name, status === 'ok' && (!m || changing) ? 'join' : '', st && st.hot && st.hot.who, st && st.hot && st.hot.bonus].join('|');
    drawMe();
    if (k !== key) {
      key = k;
      if (anim) { anim.stop(); anim = null; }
      if (status === 'code' || status === 'gone') drawCode();
      else if (status === 'offline' && !data) view().innerHTML = `<div class="card"><p>${L('Connecting …', 'Verbinde …')}</p></div>`;
      else if (!st) view().innerHTML = `<div class="card"><p>${L('The game is about to start …', 'Das Spiel beginnt gleich …')}</p></div>`;
      else if (!m || changing) drawJoin();
      else ({ lobby: drawLobby, show: drawQuestion, bet: drawQuestion, reveal: drawReveal, hot: drawHot, end: drawEnd })[st.phase]();
    }
    update();
  }

  function drawMe() {
    const el = document.getElementById('me'), m = me(), st = state();
    el.hidden = !(m && st);
    if (el.hidden) return;
    const team = st.teams[m.team];
    el.innerHTML = `<span><b>${esc(m.name)}</b> · ${esc(team.name)}</span><span class="mine-chips">${team.chips}</span>`;
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
    const st = state();
    view().innerHTML = `<div class="card">
      <h2>${L('Join the game', 'Dem Spiel beitreten')}</h2>
      <p><label>${L('Your name', 'Dein Name')}<br><input id="name" maxlength="24" autocomplete="given-name" value="${esc((player && player.name) || '')}" class="full"></label></p>
      <p>${L('Your team', 'Dein Team')}</p>
      <div class="team-buttons">${st.teams.map((t, i) => `<button type="button" class="big" data-team="${i}">${esc(t.name)}</button>`).join('')}</div>
      <p id="join-error" class="error" hidden></p></div>`;
    view().querySelectorAll('[data-team]').forEach((b) => b.addEventListener('click', async () => {
      const name = document.getElementById('name').value.trim(), err = document.getElementById('join-error');
      if (!name) { err.hidden = false; err.textContent = L('Type your name first.', 'Zuerst den Namen eingeben.'); return; }
      const e = await join(name, +b.dataset.team);
      if (e) { err.hidden = false; err.textContent = e; }
    }));
  }

  function changeTeam() {
    return `<p class="small"><button type="button" class="link-btn" id="change">${L('Change team or name', 'Team oder Namen ändern')}</button></p>`;
  }
  function wireChange() {
    document.getElementById('change')?.addEventListener('click', () => { changing = true; key = ''; render(); });
  }

  function teamList() {
    const st = state(), players = data.players || [];
    return `<ul class="team-players">${st.teams.map((t, i) => `<li><b>${esc(t.name)}</b>: ${players.filter((p) => p.team === i).map((p) => esc(p.name)).join(', ') || '–'}</li>`).join('')}</ul>`;
  }

  function drawLobby() {
    view().innerHTML = `<div class="card"><h2>${L('You’re in!', 'Du bist dabei!')}</h2>
      <p>${L('The game starts in a moment. Each team starts with 100 chips.', 'Das Spiel beginnt gleich. Jedes Team startet mit 100 Chips.')}</p>
      ${teamList()}${changeTeam()}</div>`;
    wireChange();
  }

  function questionHtml(revealed) {
    const st = state(), r = round();
    const opts = r.type === 'predict' ? `<div class="options">${r.options.map((o, k) => `
      <div class="option${revealed ? (k === st.result.answer ? ' right' : ' wrong') : ''}"><span class="letter">${LETTERS[k]}</span><span>${esc(tr(o))}</span></div>`).join('')}</div>` : '';
    return `<div class="card">
      <div class="round-head"><span class="tag ${r.type}">${TYPE[r.type]()}</span>${st.final ? '<span class="tag final">All in</span>' : ''}
        <span class="count">${L(`Round ${st.i + 1} of ${st.rounds}`, `Runde ${st.i + 1} von ${st.rounds}`)}</span></div>
      <div class="anim-box"><canvas id="anim" class="anim" aria-hidden="true"></canvas></div>
      <p class="question">${esc(tr(r.question))}${r.unit && r.type !== 'predict' ? ` <span class="muted">(${L('in', 'in')} ${esc(r.unit)})</span>` : ''}</p>
      ${opts}</div>`;
  }

  function drawQuestion() {
    const st = state(), r = round(), m = me(), team = st.teams[m.team];
    if (!draft || draft.i !== st.i || draft.round !== st.round) {
      draft = { i: st.i, round: st.round, raw: { chips: (r.options || []).map(() => ''), low: '', high: '', stake: '', value: '', insurance: false } };
      sent = '';
    }
    const raw = draft.raw;
    const field = (f, label, mode) => `<label class="bet-field"><span>${label}</span><input data-f="${f}" inputmode="${mode}" value="${esc(raw[f])}"></label>`;
    const fields = r.type === 'predict'
      ? r.options.map((o, k) => `<label class="bet-field"><span><b>${LETTERS[k]}</b> ${esc(tr(o))}</span><input data-f="c${k}" inputmode="numeric" value="${esc(raw.chips[k])}" placeholder="0"></label>`).join('')
      : r.type === 'estimate'
        ? field('low', L('low', 'unten') + (r.unit ? ` (${r.unit})` : ''), 'decimal') + field('high', L('high', 'oben') + (r.unit ? ` (${r.unit})` : ''), 'decimal') + field('stake', L('stake (chips)', 'Einsatz (Chips)'), 'numeric')
        : field('value', L('result', 'Resultat') + (r.unit ? ` (${r.unit})` : ''), 'decimal') + field('stake', L('stake (chips)', 'Einsatz (Chips)'), 'numeric');
    const betting = st.phase === 'bet';
    view().innerHTML = `${betting ? '<div id="left" class="timer small-timer"></div>' : ''}
      ${questionHtml(false)}
      <div class="card">
        ${betting ? `<h2>${L('Your team’s bet', 'Die Wette deines Teams')}</h2>
          <p class="rules">${RULE[r.type](r.options ? r.options.length : 0)} ${L(`Minimum stake ${team.min} chips${st.final ? ' (All in)' : ''}.`, `Mindesteinsatz ${team.min} Chips${st.final ? ' (All in)' : ''}.`)}</p>
          <form id="bet-form" class="bet-form">${fields}
            ${team.insurance ? `<label class="insure"><input type="checkbox" data-f="insurance"${raw.insurance ? ' checked' : ''}> ${L('Insure (once per game: half the stake back if the bet loses)', 'Versichern (einmal pro Spiel: halber Einsatz zurück, wenn die Wette verliert)')}</label>` : ''}
            <p id="bet-check" class="small"></p>
            <button type="submit" class="primary big" id="send">${L('Send the team’s bet', 'Wette des Teams senden')}</button>
          </form>
          <p id="team-bet" class="team-bet"></p>`
          : `<p>${L('Discuss with your team: betting starts in a moment.', 'Besprich dich mit deinem Team: die Wetten beginnen gleich.')}</p>${changeTeam()}`}
      </div>`;
    anim = A.animate(document.getElementById('anim'), st.round, 'setup');
    wireChange();
    const form = document.getElementById('bet-form');
    if (!form) return;
    form.querySelectorAll('input[data-f]').forEach((inp) => inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', () => {
      const f = inp.dataset.f;
      if (f === 'insurance') raw.insurance = inp.checked;
      else if (f[0] === 'c' && f !== 'chips') raw.chips[+f.slice(1)] = inp.value;
      else raw[f] = inp.value;
      sent = '';
      update();
    }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (betError()) return;
      const btn = document.getElementById('send');
      btn.disabled = true;
      const r2 = await api(`${code}/bet`, { token: player.token, i: st.i, bet: betOf() });
      btn.disabled = false;
      sent = r2.ok ? L('✓ Sent', '✓ Gesendet') : `✗ ${(r2.data && r2.data.error) || L('not sent', 'nicht gesendet')}`;
      if (r2.ok) data.bet = r2.data;
      update();
    });
  }

  function betOf() {
    const r = round(), raw = draft.raw;
    const n = (s) => (String(s).trim() === '' ? 0 : G.parseNum(String(s)));
    if (r.type === 'predict') return { chips: raw.chips.map(n), insurance: raw.insurance };
    const bet = { stake: n(raw.stake), insurance: raw.insurance };
    if (r.type === 'estimate') { bet.low = G.parseNum(raw.low); bet.high = G.parseNum(raw.high); } else bet.value = G.parseNum(raw.value);
    return bet;
  }
  function betError() {
    const st = state(), team = st.teams[me().team];
    const err = G.checkBet(round(), betOf(), team.chips, st.final);
    return err ? ERR[err](team.min) : '';
  }

  // the parts that change without a new view: the timer, the check of the bet, the team's bet
  function update() {
    const st = state();
    clearInterval(clock);
    const left = document.getElementById('left');
    if (left && st && st.phase === 'bet') {
      const draw = () => {
        const s = deadline == null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        left.textContent = s == null ? '' : s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : L('Time’s up!', 'Zeit ist um!');
        left.classList.toggle('low', s != null && s <= 10);
        const send = document.getElementById('send');
        if (send) send.disabled = s === 0;
      };
      draw();
      clock = setInterval(draw, 250);
    }
    const check = document.getElementById('bet-check');
    if (check && draft) {
      const err = betError();
      check.className = `small ${err ? 'bad-text' : 'ok-text'}`;
      check.textContent = sent || (err ? err : `${L('Stake', 'Einsatz')}: ${G.stakeOf(round(), betOf())} ${L('chips', 'Chips')}`);
    }
    const tb = document.getElementById('team-bet');
    if (tb) {
      const b = data.bet;
      tb.innerHTML = b ? `${L('Your team’s bet', 'Wette deines Teams')}: <b>${esc(describe(round(), b.bet))}</b>${b.bet.stake != null ? `, ${L('stake', 'Einsatz')} ${b.bet.stake}` : ''}${b.bet.insurance ? `, ${L('insured', 'versichert')}` : ''} <span class="muted">(${esc(b.by)})</span>`
        : `<span class="muted">${L('Your team has not bet yet. No bet loses the minimum stake.', 'Dein Team hat noch nicht gewettet. Ohne Wette ist der Mindesteinsatz verloren.')}</span>`;
    }
  }

  function drawReveal() {
    const st = state(), r = round(), m = me(), res = st.result.teams[m.team];
    const answer = r.type === 'predict' ? `${LETTERS[st.result.answer]}: ${esc(tr(r.options[st.result.answer]))}` : esc(withUnit(st.result.answer, r.unit));
    view().innerHTML = `${questionHtml(true)}
      <div class="card">
        <p class="answer">${L('Answer', 'Antwort')}: ${answer}</p>
        <p class="explain">${esc(tr(r.explain))}</p>
        <p class="result ${res.net > 0 ? 'up' : res.net < 0 ? 'down' : ''}">${esc(st.teams[m.team].name)}: ${res.forfeit ? L('no bet', 'keine Wette') + ', ' : ''}${res.net > 0 ? '+' : ''}${res.net} ${L('chips', 'Chips')}</p>
      </div>`;
    anim = A.animate(document.getElementById('anim'), st.round, 'outcome');
  }

  function drawHot() {
    const st = state(), m = me(), hot = st.hot || {}, team = st.teams[hot.team] || {};
    const mine = hot.team === m.team && hot.who === m.name;
    const who = hot.who == null ? '' : typeof hot.who === 'string' ? esc(hot.who) : L(`member ${hot.who}`, `Mitglied ${hot.who}`);
    view().innerHTML = `<div class="card hot-seat${mine ? ' me-hot' : ''}">
      <h2>${L('Hot seat', 'Heisser Stuhl')}: ${esc(team.name || '')}</h2>
      ${mine ? `<p class="who big-who">${L('It’s you! Explain the result, without help.', 'Du bist dran! Erkläre das Ergebnis, ohne Hilfe.')}</p>`
        : hot.who != null ? `<p class="who">${who} ${L('explains …', 'erklärt …')}</p>` : `<p class="muted">${L('The die is about to pick who explains.', 'Gleich wählt der Würfel, wer erklärt.')}</p>`}
      ${hot.bonus != null ? `<p class="result up">${hot.bonus ? `+${hot.bonus} ${L('chips', 'Chips')}` : L('no bonus', 'kein Bonus')}</p>` : ''}
    </div>`;
  }

  function drawEnd() {
    const st = state(), order = G.ranking(st.teams), m = me();
    view().innerHTML = `<div class="card"><h2>${L('Final result', 'Schlussresultat')}</h2>
      <ol class="podium">${order.map((t) => `<li${t === m.team ? ' class="mine"' : ''}><span>${esc(st.teams[t].name)}</span><span>${st.teams[t].chips}</span></li>`).join('')}</ol>
      <p class="muted">${L('Thanks for playing!', 'Danke fürs Mitspielen!')}</p></div>`;
  }

  Lang.init();
  Lang.wire(() => { key = ''; render(); });
  refresh();
})();
