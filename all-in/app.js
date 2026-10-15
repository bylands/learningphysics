// All In, the Physics Casino: the teacher's screen for the projector. The teacher sets up the
// teams and the rounds; in each round the question shows with its animation, the betting timer
// runs, and the teams bet: on their phones (/all-in/play/, through a room on the server, which
// needs the teacher's login) or on bet cards the teacher types in. Then the answer is revealed with
// the outcome's animation and paid out (game.js), a die picks who in the team in the hot seat
// explains it, and the next round begins. The game is kept in the browser (localStorage), so a
// reload loses nothing; the phones see what this screen sends the room.
(function () {
  'use strict';

  const G = window.AllInGame, A = window.AllIn, Lang = window.Lang;
  const { L, tr, byId, ROUNDS, LETTERS, TYPE, RULE, ERR, esc, fmt, withUnit, describe, api, storage } = A;
  const KEY = 'all-in-game';

  const T = {
    title: () => L('All In: the Physics Casino', 'All In: das Physik-Casino'),
    restart: () => L('New game', 'Neues Spiel'),
  };

  let S = null; // the game; null before setup
  let timer = null, rolling = false, anim = null, poller = null, pushing = Promise.resolve();
  let notice = ''; // a problem with the room, shown above the stage

  function save() { storage.set(KEY, S); push(); }
  function load() {
    const s = storage.get(KEY);
    return s && s.v === 2 && Array.isArray(s.teams) && Array.isArray(s.rounds) && s.rounds.every((id) => byId[id]) ? s : null;
  }

  const round = () => byId[S.rounds[S.i]];
  const isFinal = () => S.i === S.rounds.length - 1;
  const phones = () => S && S.mode === 'phones';

  // ------------------------------------------------------------------ the room on the server
  // what the phones see: the phase, the round, the teams, the time left, the result, the hot seat
  function publicState() {
    const st = {
      phase: S.phase, i: S.i, rounds: S.rounds.length, round: S.rounds[S.i], final: isFinal(),
      teams: S.teams.map((t) => ({ name: t.name, chips: t.chips, min: G.minStake(t.chips, isFinal()), insurance: !t.insuranceUsed })),
      left: S.phase === 'bet' && S.timerEnd ? Math.max(0, (S.timerEnd - Date.now()) / 1000) : null,
    };
    if (S.phase === 'reveal' || S.phase === 'hot') {
      st.result = { answer: S.answer, teams: S.phase === 'hot' && S.paid ? S.paid : results().map((r) => ({ stake: r.stake, back: r.back, net: r.net, correct: r.correct, forfeit: !!r.forfeit })) };
    }
    if (S.phase === 'hot') st.hot = { team: G.hotTeam(S.i, S.teams.length), who: S.member, bonus: S.bonus };
    return st;
  }

  function push() {
    if (!phones() || !S.code) return;
    const state = publicState();
    pushing = pushing.then(async () => {
      const r = await api(`${S.code}/state`, { state });
      if (r.status === 404) await openRoom(); // (the server restarted: the same room again)
      else setNotice(r.ok ? '' : r.status === 403 ? L('Log in again to run the game on phones.', 'Für das Spiel auf den Handys erneut einloggen.') : L('The phones cannot be reached right now.', 'Die Handys sind gerade nicht erreichbar.'));
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

  function setNotice(n) {
    if (n === notice) return;
    notice = n;
    const el = document.getElementById('notice');
    if (!el) return;
    el.hidden = !n;
    el.innerHTML = n === 'login'
      ? `${L('The game on phones needs your teacher login.', 'Das Spiel auf den Handys braucht Ihr Lehrer-Login.')} <a href="/admin/?next=/all-in/">${L('Log in', 'Einloggen')}</a>`
      : esc(n);
  }

  // the players and the bets from the room: every second while betting, else every few seconds
  function poll() {
    clearTimeout(poller);
    if (!phones() || S.phase === 'end') return;
    poller = setTimeout(async () => {
      const r = await api(`${S.code}/host`);
      if (r.ok && S && phones()) {
        S.players = r.data.players;
        if (S.phase === 'bet') takeBets(r.data.bets || {});
        drawPlayers();
      } else if (r.status === 404 && S) await openRoom();
      poll();
    }, S.phase === 'bet' ? 1000 : 2500);
  }

  // a bet from a phone into the typed fields (the teacher can still change it)
  function takeBets(bets) {
    const r = round();
    S.teams.forEach((_, t) => {
      const b = bets[t];
      if (!b || S.seen[t] === b.n) return;
      S.seen[t] = b.n;
      S.by[t] = b.by;
      const bet = b.bet, raw = S.raw[t];
      if (r.type === 'predict') raw.chips = r.options.map((_, k) => String((bet.chips || [])[k] || ''));
      else {
        raw.stake = bet.stake != null ? String(bet.stake) : '';
        if (r.type === 'estimate') { raw.low = fmtIn(bet.low); raw.high = fmtIn(bet.high); } else raw.value = fmtIn(bet.value);
      }
      raw.insurance = !!bet.insurance && !S.teams[t].insuranceUsed;
      document.querySelectorAll(`input[data-t="${t}"]`).forEach((inp) => {
        const f = inp.dataset.f;
        if (f === 'ins') inp.checked = raw.insurance;
        else inp.value = f[0] === 'c' ? raw.chips[+f.slice(1)] : raw[f];
      });
      const by = document.querySelector(`[data-by="${t}"]`);
      if (by) by.textContent = b.by;
    });
    storage.set(KEY, S);
    checkBets();
  }
  const fmtIn = (x) => (Number.isFinite(x) ? String(+x.toPrecision(6)) : '');

  function drawPlayers() {
    document.querySelectorAll('[data-players]').forEach((el) => {
      const t = +el.dataset.players;
      const names = (S.players || []).filter((p) => p.team === t).map((p) => esc(p.name));
      el.innerHTML = names.length ? names.join(', ') : `<span class="muted">${L('nobody yet', 'noch niemand')}</span>`;
    });
    const count = document.getElementById('player-count');
    if (count) count.textContent = (S.players || []).length;
  }

  // ------------------------------------------------------------------ setup
  const setup = { teams: 4, names: [], sizes: [], seconds: 90, mode: 'phones', rounds: ROUNDS.filter((r) => r.standard).map((r) => r.id) };
  const teamDefault = (i) => `Team ${i + 1}`;

  function renderSetup() {
    const saved = load();
    const order = setup.rounds.concat(ROUNDS.map((r) => r.id).filter((id) => !setup.rounds.includes(id)));
    const teams = Array.from({ length: setup.teams }, (_, i) => `
      <div class="team-setup">
        <input type="text" data-name="${i}" maxlength="24" value="${esc(setup.names[i] || '')}" placeholder="${esc(teamDefault(i))}" aria-label="${esc(L('Name of team', 'Name von Team'))} ${i + 1}">
        ${setup.mode === 'screen' ? `<select data-size="${i}" aria-label="${esc(L('Members', 'Mitglieder'))}">
          ${[2, 3, 4].map((n) => `<option value="${n}"${(setup.sizes[i] || 3) === n ? ' selected' : ''}>${n} ${L('members', 'Personen')}</option>`).join('')}
        </select>` : ''}
      </div>`).join('');
    const rounds = order.map((id) => {
      const r = byId[id], on = setup.rounds.includes(id), pos = setup.rounds.indexOf(id);
      return `<li><label><input type="checkbox" data-round="${id}"${on ? ' checked' : ''}>
        <span><span class="tag ${r.type}">${TYPE[r.type]()}</span> ${esc(tr(r.title))}${r.demo ? ` <span class="muted small">(${L('demo', 'Demo')})</span>` : ''}
        ${on ? `<span class="muted small">· ${L('round', 'Runde')} ${pos + 1}${pos === setup.rounds.length - 1 ? ' · <b>All in</b>' : ''}</span>` : ''}</span></label></li>`;
    }).join('');
    stage(`
      ${saved && saved.phase !== 'end' ? `<div class="card"><h2>${L('A game is in progress', 'Ein Spiel läuft noch')}</h2>
        <p>${L(`Round ${saved.i + 1} of ${saved.rounds.length}`, `Runde ${saved.i + 1} von ${saved.rounds.length}`)} · ${saved.teams.map((t) => `${esc(t.name)}: ${t.chips}`).join(' · ')}</p>
        <div class="actions"><button type="button" class="primary" id="resume">${L('Continue it', 'Weiterspielen')}</button></div></div>` : ''}
      <div class="card">
        <h2>${L('Teams', 'Teams')}</h2>
        <div class="row">
          <span class="levels" role="radiogroup" aria-label="${esc(L('Bets', 'Wetten'))}">
            <label><input type="radio" name="mode" value="phones"${setup.mode === 'phones' ? ' checked' : ''}><span>${L('Bets on phones', 'Wetten auf Handys')}</span></label>
            <label><input type="radio" name="mode" value="screen"${setup.mode === 'screen' ? ' checked' : ''}><span>${L('Bet cards, typed here', 'Wettkarten, hier eingetippt')}</span></label>
          </span>
        </div>
        <div class="row">
          <label>${L('Number of teams', 'Anzahl Teams')}
            <select id="team-count">${[2, 3, 4, 5, 6].map((n) => `<option${n === setup.teams ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>${L('Betting time', 'Zeit zum Wetten')}
            <select id="seconds">${[60, 90, 120].map((n) => `<option value="${n}"${n === setup.seconds ? ' selected' : ''}>${n} s</option>`).join('')}</select></label>
        </div>
        <div class="teams-setup">${teams}</div>
        <p class="muted small">${setup.mode === 'phones'
          ? L('Students join on their phones with a QR code and pick their team; any member can place the team’s bet, and the last one sent counts. The die in the hot seat picks one of the team’s players by name. Needs your teacher login.',
            'Die Schülerinnen und Schüler treten mit einem QR-Code auf dem Handy bei und wählen ihr Team; jedes Mitglied kann die Wette des Teams abgeben, die zuletzt gesendete zählt. Der Würfel im heissen Stuhl wählt eine Person des Teams mit Namen. Braucht Ihr Lehrer-Login.')
          : L('The members of each team number themselves 1 to 4: the die in the hot seat picks one of them.',
            'Die Mitglieder jedes Teams nummerieren sich von 1 bis 4: der Würfel im heissen Stuhl wählt eines davon.')}</p>
        <p id="setup-error" class="error" hidden></p>
      </div>
      <div class="card">
        <h2>${L('Rounds', 'Runden')}</h2>
        <p class="muted small">${L('In the order you tick them; the last one is the final round, All in, where the stake is at least half of a team’s chips. Six rounds take about 25 minutes.',
          'In der Reihenfolge des Ankreuzens; die letzte ist die Finalrunde All in, in der der Einsatz mindestens die Hälfte der Chips eines Teams ist. Sechs Runden dauern etwa 25 Minuten.')}</p>
        <ul class="round-list">${rounds}</ul>
        <div class="actions">
          <button type="button" class="primary big" id="start"${setup.rounds.length ? '' : ' disabled'}>${L(`Start the game (${setup.rounds.length} rounds)`, `Spiel starten (${setup.rounds.length} Runden)`)}</button>
          <button type="button" id="standard">${L('Standard six rounds', 'Die sechs Standardrunden')}</button>
        </div>
      </div>
      <div class="card">
        <h2>${L('How it works', 'So geht’s')}</h2>
        <p>${L('Every team starts with 100 chips. Each round shows a short animation of the situation; the teams discuss and bet while the timer runs. After the reveal, which plays out what happens, a die picks one member of the team in the hot seat, who explains the result without help: a convincing explanation earns +15 chips, a partial one +5. Insurance (once per game) gives half the stake back if a bet loses. A team without a bet loses the minimum stake. A team below 10 chips is topped up to 20.',
          'Jedes Team startet mit 100 Chips. Jede Runde zeigt eine kurze Animation der Situation; die Teams diskutieren und wetten, während die Zeit läuft. Nach der Auflösung, die zeigt, was passiert, wählt ein Würfel ein Mitglied des Teams im heissen Stuhl, das das Ergebnis ohne Hilfe erklärt: eine überzeugende Erklärung bringt +15 Chips, eine teilweise +5. Die Versicherung (einmal pro Spiel) gibt bei einer verlorenen Wette den halben Einsatz zurück. Ein Team ohne Wette verliert den Mindesteinsatz. Ein Team unter 10 Chips wird auf 20 aufgefüllt.')}</p>
      </div>`);

    const el = document.getElementById('stage');
    el.querySelector('#resume')?.addEventListener('click', () => resume(saved));
    el.querySelectorAll('input[name="mode"]').forEach((rb) => rb.addEventListener('change', () => { readSetup(); setup.mode = rb.value; renderSetup(); }));
    el.querySelector('#team-count').addEventListener('change', (e) => { readSetup(); setup.teams = +e.target.value; renderSetup(); });
    el.querySelector('#seconds').addEventListener('change', (e) => { setup.seconds = +e.target.value; });
    el.querySelectorAll('[data-name]').forEach((inp) => inp.addEventListener('input', () => { setup.names[+inp.dataset.name] = inp.value; }));
    el.querySelectorAll('[data-size]').forEach((sel) => sel.addEventListener('change', () => { setup.sizes[+sel.dataset.size] = +sel.value; }));
    el.querySelectorAll('[data-round]').forEach((cb) => cb.addEventListener('change', () => {
      readSetup();
      const id = cb.dataset.round;
      setup.rounds = cb.checked ? setup.rounds.concat(id) : setup.rounds.filter((x) => x !== id);
      renderSetup();
    }));
    el.querySelector('#standard').addEventListener('click', () => { readSetup(); setup.rounds = ROUNDS.filter((r) => r.standard).map((r) => r.id); renderSetup(); });
    el.querySelector('#start').addEventListener('click', () => { readSetup(); start(); });
  }

  function readSetup() {
    document.querySelectorAll('[data-name]').forEach((inp) => { setup.names[+inp.dataset.name] = inp.value; });
    document.querySelectorAll('[data-size]').forEach((sel) => { setup.sizes[+sel.dataset.size] = +sel.value; });
  }

  async function start() {
    const game = {
      v: 2, mode: setup.mode, code: null, players: [],
      teams: Array.from({ length: setup.teams }, (_, i) => ({
        name: (setup.names[i] || '').trim() || teamDefault(i), size: setup.sizes[i] || 3, chips: G.START, insuranceUsed: false,
      })),
      rounds: setup.rounds.slice(), seconds: setup.seconds, i: 0, last: null,
    };
    if (game.mode === 'phones') {
      const btn = document.getElementById('start');
      btn.disabled = true;
      const r = await api('open', {});
      btn.disabled = false;
      if (!r.ok) {
        const err = document.getElementById('setup-error');
        err.hidden = false;
        err.innerHTML = r.status === 403
          ? `${L('The game on phones needs your teacher login.', 'Das Spiel auf den Handys braucht Ihr Lehrer-Login.')} <a href="/admin/?next=/all-in/">${L('Log in', 'Einloggen')}</a> · ${L('or choose bet cards.', 'oder Wettkarten wählen.')}`
          : esc(L('The game server cannot be reached. Try again, or choose bet cards.', 'Der Spielserver ist nicht erreichbar. Nochmals versuchen oder Wettkarten wählen.'));
        return;
      }
      game.code = r.data.code;
    }
    S = game;
    beginRound(phones() ? 'lobby' : 'show');
  }

  async function resume(saved) {
    S = saved;
    render();
    if (phones()) await openRoom();
  }

  function beginRound(phase) {
    const r = round();
    S.phase = phase || 'show';
    S.raw = S.teams.map(() => ({ chips: r.type === 'predict' ? r.options.map(() => '') : [], low: '', high: '', stake: '', value: '', insurance: false }));
    S.by = S.teams.map(() => '');
    S.seen = {};
    S.answer = r.answer;
    S.first = null;
    S.member = null;
    S.bonus = null;
    S.timerEnd = null;
    save();
    render();
  }

  // ------------------------------------------------------------------ the bets
  function betOf(t) {
    const r = round(), raw = S.raw[t];
    const n = (s) => (String(s).trim() === '' ? 0 : G.parseNum(String(s)));
    if (r.type === 'predict') return { chips: raw.chips.map(n), insurance: raw.insurance };
    const bet = { stake: n(raw.stake), insurance: raw.insurance };
    if (r.type === 'estimate') { bet.low = G.parseNum(raw.low); bet.high = G.parseNum(raw.high); } else bet.value = G.parseNum(raw.value);
    return bet;
  }
  // no bet at all: the team loses the minimum stake
  const isEmpty = (t) => { const raw = S.raw[t]; return [raw.low, raw.high, raw.stake, raw.value, ...raw.chips].every((v) => String(v || '').trim() === ''); };
  const minOf = (t) => G.minStake(S.teams[t].chips, isFinal());
  const errorOf = (t) => (isEmpty(t) ? null : G.checkBet(round(), betOf(t), S.teams[t].chips, isFinal()));

  function betRows() {
    const r = round();
    const head = r.type === 'predict' ? r.options.map((_, k) => `<th>${LETTERS[k]}</th>`).join('')
      : r.type === 'estimate' ? `<th>${L('low', 'unten')}</th><th>${L('high', 'oben')}</th><th>${L('stake', 'Einsatz')}</th>`
        : `<th>${L('value', 'Wert')}${r.unit ? ` (${esc(r.unit)})` : ''}</th><th>${L('stake', 'Einsatz')}</th>`;
    const rows = S.teams.map((team, t) => {
      const raw = S.raw[t];
      const cells = r.type === 'predict' ? raw.chips.map((v, k) => `<td><input inputmode="numeric" data-t="${t}" data-f="c${k}" value="${esc(v)}" aria-label="${esc(team.name)} ${LETTERS[k]}"></td>`).join('')
        : (r.type === 'estimate' ? ['low', 'high', 'stake'] : ['value', 'stake']).map((f) =>
          `<td><input class="${f === 'stake' ? '' : 'wide'}" inputmode="${f === 'stake' ? 'numeric' : 'decimal'}" data-t="${t}" data-f="${f}" value="${esc(raw[f])}" aria-label="${esc(team.name)} ${f}"></td>`).join('');
      const ins = team.insuranceUsed ? `<span class="muted small">${L('used', 'gebraucht')}</span>`
        : `<label><input type="checkbox" data-t="${t}" data-f="ins"${raw.insurance ? ' checked' : ''}> ${L('insure', 'versichern')}</label>`;
      return `<tr><th scope="row">${esc(team.name)} <span class="muted small">(${team.chips})</span>${phones() ? `<div class="by small muted" data-by="${t}">${esc(S.by[t] || '')}</div>` : ''}</th>${cells}<td>${ins}</td><td class="msg" data-msg="${t}"></td></tr>`;
    }).join('');
    return `<div class="table-scroll"><table class="bets"><thead><tr><th>${L('Team', 'Team')}</th>${head}<th>${L('Insurance', 'Versicherung')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function wireBets(el) {
    el.querySelectorAll('input[data-t]').forEach((inp) => {
      const t = +inp.dataset.t, f = inp.dataset.f;
      inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', () => {
        if (f === 'ins') S.raw[t].insurance = inp.checked;
        else if (f[0] === 'c') S.raw[t].chips[+f.slice(1)] = inp.value;
        else S.raw[t][f] = inp.value;
        storage.set(KEY, S);
        checkBets();
      });
    });
    checkBets();
  }

  function checkBets() {
    let all = true;
    S.teams.forEach((team, t) => {
      const err = errorOf(t), msg = document.querySelector(`[data-msg="${t}"]`);
      if (err) all = false;
      if (!msg) return;
      msg.className = `msg ${err ? 'bad' : isEmpty(t) ? 'muted' : 'ok'}`;
      msg.textContent = err ? ERR[err](minOf(t)) : isEmpty(t) ? L(`no bet yet (−${minOf(t)})`, `noch keine Wette (−${minOf(t)})`) : `✓ ${L('stake', 'Einsatz')} ${G.stakeOf(round(), betOf(t))}`;
    });
    const btn = document.getElementById('reveal');
    if (btn) btn.disabled = !all;
    return all;
  }

  // ------------------------------------------------------------------ the phases
  function questionCard(revealed) {
    const r = round();
    const opts = r.type === 'predict' ? `<div class="options">${r.options.map((o, k) => `
      <div class="option${revealed ? (k === S.answer ? ' right' : ' wrong') : ''}"><span class="letter">${LETTERS[k]}</span><span>${esc(tr(o))}</span></div>`).join('')}</div>` : '';
    return `<div class="card">
      <div class="round-head">
        <span class="tag ${r.type}">${TYPE[r.type]()}</span>
        ${isFinal() ? '<span class="tag final">All in</span>' : ''}
        <span class="count">${L(`Round ${S.i + 1} of ${S.rounds.length}`, `Runde ${S.i + 1} von ${S.rounds.length}`)} · ${esc(tr(r.title))}</span>
      </div>
      <div class="anim-box"><canvas id="anim" class="anim" aria-hidden="true"></canvas>
        ${revealed ? `<button type="button" class="replay" id="replay" title="${esc(L('Play again', 'Nochmals abspielen'))}">↻</button>` : ''}</div>
      <p class="question">${esc(tr(r.question))}${r.unit && r.type !== 'predict' ? ` <span class="muted">(${L('in', 'in')} ${esc(r.unit)})</span>` : ''}</p>
      ${opts}
      <p class="rules">${RULE[r.type](r.options ? r.options.length : 0)} ${isFinal() ? L('All in: the stake is at least half of the team’s chips.', 'All in: der Einsatz ist mindestens die Hälfte der Chips des Teams.') : L(`Minimum stake ${G.MIN_STAKE} chips.`, `Mindesteinsatz ${G.MIN_STAKE} Chips.`)}</p>
    </div>`;
  }

  function startAnim(mode) {
    anim = A.animate(document.getElementById('anim'), S.rounds[S.i], mode);
    document.getElementById('replay')?.addEventListener('click', () => anim.replay());
  }

  function joinUrl() { return `${location.origin}/all-in/play/?c=${S.code}`; }

  function renderLobby() {
    const url = joinUrl();
    let qr = '';
    try { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { /* no QR code */ }
    stage(`<div class="card lobby">
      <div class="qr">${qr}</div>
      <div>
        <h2>${L('Join on your phone', 'Auf dem Handy beitreten')}</h2>
        <p class="join-url">${esc(url.replace(/^https?:\/\//, '').replace(/\?c=.*/, ''))}</p>
        <p>${L('Game code', 'Spielcode')} <span class="code">${esc(S.code || '…')}</span></p>
        <p class="muted">${L('Pick your team and type your name. Players:', 'Team wählen und Namen eingeben. Mitspielende:')} <b id="player-count">${(S.players || []).length}</b></p>
      </div>
    </div>
    <div class="card"><h2>${L('Teams', 'Teams')}</h2>
      <ul class="team-players">${S.teams.map((t, i) => `<li><b>${esc(t.name)}</b>: <span data-players="${i}"></span></li>`).join('')}</ul>
      <div class="actions"><button type="button" class="primary big" id="go-first">${L('Start round 1', 'Runde 1 starten')}</button></div>
    </div>`);
    drawPlayers();
    document.getElementById('go-first').addEventListener('click', () => { S.phase = 'show'; save(); render(); });
  }

  function joinLine() {
    return phones() && S.code ? `<p class="join-line muted small">${L('Join', 'Beitreten')}: ${esc(joinUrl().replace(/^https?:\/\//, '').replace(/\?c=.*/, ''))} · ${L('code', 'Code')} <b>${esc(S.code)}</b></p>` : '';
  }

  function renderShow() {
    stage(`${questionCard(false)}
      <div class="actions"><button type="button" class="primary big" id="go">${L(`Start betting (${S.seconds} s)`, `Wetten starten (${S.seconds} s)`)}</button>
      ${phones() ? '' : `<button type="button" id="skip-timer">${L('Enter the bets without a timer', 'Wetten ohne Timer eintippen')}</button>`}</div>${joinLine()}`);
    startAnim('setup');
    document.getElementById('go').addEventListener('click', () => { S.phase = 'bet'; S.timerEnd = Date.now() + S.seconds * 1000; save(); render(); });
    document.getElementById('skip-timer')?.addEventListener('click', () => { S.phase = 'bet'; S.timerEnd = Date.now(); save(); render(); });
  }

  function renderBet() {
    stage(`${questionCard(false)}
      <div id="clock"></div>
      <div class="card"><h2>${L('The bets', 'Die Wetten')}</h2>
        <p class="muted small">${phones() ? L('The bets arrive from the phones; you can still correct them here.', 'Die Wetten kommen von den Handys; hier lassen sie sich noch korrigieren.')
          : L('Type each team’s card once all cards are up. Numbers like 4.5e22 or 4.5·10^22 work.', 'Die Karte jedes Teams eintippen, sobald alle Karten oben sind. Zahlen wie 4.5e22 oder 4.5·10^22 gehen.')}</p>
        ${betRows()}
        <div class="actions"><button type="button" class="primary big" id="reveal" disabled>${L('Reveal the answer', 'Antwort auflösen')}</button></div>
      </div>${joinLine()}`);
    startAnim('setup');
    wireBets(document.getElementById('stage'));
    document.getElementById('reveal').addEventListener('click', () => { if (checkBets()) { S.phase = 'reveal'; save(); render(); } });
    tick();
  }

  function tick() {
    clearInterval(timer);
    const clock = document.getElementById('clock');
    if (!clock || !S.timerEnd) return;
    let beeped = S.timerEnd <= Date.now();
    const draw = () => {
      const left = Math.max(0, Math.ceil((S.timerEnd - Date.now()) / 1000));
      clock.innerHTML = left > 0
        ? `<div class="timer${left <= 10 ? ' low' : ''}" role="timer">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</div>`
        : `<div class="cards-up">${phones() ? L('Time’s up!', 'Zeit ist um!') : L('Cards up!', 'Karten hoch!')}</div>`;
      if (left <= 0) { clearInterval(timer); if (!beeped) { beeped = true; beep(); } }
    };
    draw();
    timer = setInterval(draw, 250);
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25].forEach((t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; g.gain.value = 0.15;
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18);
      });
    } catch (e) { /* no sound */ }
  }

  function results() {
    const r = round();
    return S.teams.map((_, t) => {
      if (isEmpty(t)) { const min = minOf(t); return { stake: min, back: 0, net: -min, correct: false, insured: false, forfeit: true }; }
      const bet = betOf(t);
      const first = r.type === 'calculate' && S.first === t && G.isCorrect(r, bet, S.answer);
      return G.settle(r, bet, S.answer, { first });
    });
  }

  function renderReveal() {
    const r = round();
    const res = results();
    const answer = r.type === 'predict' ? `${LETTERS[S.answer]}: ${esc(tr(r.options[S.answer]))}` : esc(withUnit(S.answer, r.unit));
    const firstCol = r.type === 'calculate';
    const rows = S.teams.map((team, t) => `<tr>
      <th scope="row">${esc(team.name)}</th>
      <td>${res[t].forfeit ? `<span class="muted">${L('no bet', 'keine Wette')}</span>` : esc(describe(r, betOf(t)))}${r.type === 'estimate' && !res[t].forfeit ? ` <span class="muted small">(${L('ratio', 'Verhältnis')} ${fmt(betOf(t).high / betOf(t).low)})</span>` : ''}${res[t].insured ? ` · <span class="muted">${L('insured', 'versichert')}</span>` : ''}</td>
      <td class="num">${res[t].stake}</td>
      <td>${res[t].correct ? '✓' : '✗'}</td>
      ${firstCol ? `<td>${res[t].correct ? `<input type="radio" name="first" value="${t}"${S.first === t ? ' checked' : ''} aria-label="${esc(L('first correct', 'erstes richtiges'))}">` : ''}</td>` : ''}
      <td class="num">${res[t].back}</td>
      <td class="num net ${res[t].net > 0 ? 'up' : res[t].net < 0 ? 'down' : ''}">${res[t].net > 0 ? '+' : ''}${res[t].net}</td>
    </tr>`).join('');
    const edit = r.editable ? `<p class="small"><label>${esc(tr(r.note))} <input id="answer" class="wide" inputmode="decimal" value="${esc(fmt(S.answer))}"> ${esc(r.unit || '')}</label></p>` : '';
    stage(`${questionCard(true)}
      <div class="card">
        ${r.demo ? `<p class="demo">${L('If you have it at hand, run the real demo too.', 'Wenn vorhanden, auch das echte Experiment zeigen.')}</p>` : ''}
        <p class="answer">${L('Answer', 'Antwort')}: ${answer}</p>
        ${edit}
        <p class="explain">${esc(tr(r.explain))}</p>
      </div>
      <div class="card"><h2>${L('Payout', 'Auszahlung')}</h2>
        <div class="table-scroll"><table class="bets"><thead><tr><th>${L('Team', 'Team')}</th><th>${L('Bet', 'Wette')}</th><th class="num">${L('Stake', 'Einsatz')}</th><th></th>
          ${firstCol ? `<th>${L('First correct (+10)', 'Erstes richtiges (+10)')}</th>` : ''}<th class="num">${L('Back', 'Zurück')}</th><th class="num">${L('Net', 'Netto')}</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
        <div class="actions">
          <button type="button" class="primary big" id="pay">${L('Pay out', 'Auszahlen')}</button>
          <button type="button" id="back">${L('Back to the bets', 'Zurück zu den Wetten')}</button>
        </div>
      </div>`);
    startAnim('outcome');
    document.getElementById('answer')?.addEventListener('change', (e) => {
      const v = G.parseNum(e.target.value);
      if (v > 0) { S.answer = v; save(); }
      render();
    });
    document.querySelectorAll('input[name="first"]').forEach((rb) => rb.addEventListener('change', () => { S.first = +rb.value; save(); render(); }));
    document.getElementById('back').addEventListener('click', () => { S.phase = 'bet'; save(); render(); });
    document.getElementById('pay').addEventListener('click', pay);
  }

  function pay() {
    const res = results();
    S.paid = res.map((x) => ({ stake: x.stake, back: x.back, net: x.net, correct: x.correct, forfeit: !!x.forfeit }));
    S.last = res.map((x) => x.net);
    S.teams.forEach((team, t) => {
      team.chips = Math.max(0, team.chips + res[t].net);
      if (S.raw[t].insurance && !isEmpty(t)) team.insuranceUsed = true;
    });
    S.phase = 'hot';
    save();
    render();
  }

  // the players of the team in the hot seat (phones), else the members' numbers
  function candidates(t) {
    const names = phones() ? (S.players || []).filter((p) => p.team === t).map((p) => p.name) : [];
    return names.length ? names : Array.from({ length: S.teams[t].size || 3 }, (_, k) => k + 1);
  }

  function renderHot() {
    const t = G.hotTeam(S.i, S.teams.length), team = S.teams[t];
    const named = typeof S.member === 'string';
    stage(`<div class="card hot-seat">
      <h2>${L('Hot seat', 'Heisser Stuhl')}</h2>
      <p class="who">${esc(team.name)}</p>
      <p class="muted">${L('The die picks who explains the result, without help from the team.', 'Der Würfel bestimmt, wer das Ergebnis erklärt, ohne Hilfe des Teams.')}</p>
      <div class="die${rolling ? ' rolling' : ''}${named || (rolling && typeof candidates(t)[0] === 'string') ? ' name' : ''}" id="die">${S.member != null ? esc(S.member) : '?'}</div>
      ${S.member != null ? `<p class="who">${named ? L(`${esc(S.member)}, please explain!`, `${esc(S.member)}, bitte erklären!`) : L(`Member ${S.member}, please explain!`, `Mitglied ${S.member}, bitte erklären!`)}</p>` : ''}
      <div class="actions">
        ${S.member == null ? `<button type="button" class="primary big" id="roll"${rolling ? ' disabled' : ''}>${L('Roll the die', 'Würfeln')}</button>` : ''}
        ${S.member != null && S.bonus == null ? `
          <button type="button" class="primary" data-bonus="good">${L('Convincing', 'Überzeugend')} +${G.HOT.good}</button>
          <button type="button" class="primary" data-bonus="partial">${L('Partly', 'Teilweise')} +${G.HOT.partial}</button>
          <button type="button" data-bonus="none">${L('No bonus', 'Kein Bonus')}</button>` : ''}
        ${S.bonus != null ? `<button type="button" class="primary big" id="next">${isFinal() ? L('Final result', 'Schlussresultat') : L('Next round', 'Nächste Runde')}</button>` : ''}
      </div>
    </div>`);
    document.getElementById('roll')?.addEventListener('click', () => {
      const pool = candidates(t);
      rolling = true; render();
      const die = () => document.getElementById('die');
      const spin = setInterval(() => { if (die()) die().textContent = pool[G.roll(pool.length) - 1]; }, 90);
      setTimeout(() => { clearInterval(spin); rolling = false; S.member = pool[G.roll(pool.length) - 1]; save(); render(); }, 1400);
    });
    document.querySelectorAll('[data-bonus]').forEach((b) => b.addEventListener('click', () => {
      S.bonus = G.HOT[b.dataset.bonus];
      team.chips += S.bonus;
      S.last = S.teams.map((_, k) => (k === t ? S.bonus : 0));
      save(); render();
    }));
    document.getElementById('next')?.addEventListener('click', next);
  }

  function next() {
    S.teams.forEach((team) => { team.chips = G.topUp(team.chips); });
    S.last = null;
    if (isFinal()) { S.phase = 'end'; save(); render(); return; }
    S.i++;
    beginRound('show');
  }

  function renderEnd() {
    const order = G.ranking(S.teams);
    stage(`<div class="card"><h2>${L('Final result', 'Schlussresultat')}</h2>
      <ol class="podium">${order.map((t) => `<li><span>${esc(S.teams[t].name)}</span><span>${S.teams[t].chips}</span></li>`).join('')}</ol>
      <p class="muted">${L('Debrief: which round surprised you most?', 'Zum Schluss: welche Runde hat euch am meisten überrascht?')}</p>
      <div class="actions"><button type="button" class="primary" id="again">${L('New game', 'Neues Spiel')}</button></div></div>`);
    document.getElementById('again').addEventListener('click', newGame);
  }

  // ------------------------------------------------------------------ the page
  function stage(html) {
    document.getElementById('stage').innerHTML = `<p id="notice" class="error"${notice ? '' : ' hidden'}></p>${html}`;
    const n = notice; notice = null; setNotice(n);
  }

  function renderBoard() {
    const board = document.getElementById('board');
    board.hidden = !S || S.phase === 'lobby';
    if (board.hidden) return;
    const hot = S.phase === 'hot' ? G.hotTeam(S.i, S.teams.length) : -1;
    board.innerHTML = S.teams.map((team, t) => {
      const d = S.last ? S.last[t] : 0;
      return `<div class="team${t === hot ? ' hot' : ''}">
        <div class="name">${esc(team.name)}</div>
        <div class="chips" data-chips="${t}" title="${esc(L('Click to correct', 'Klicken zum Korrigieren'))}">${team.chips}</div>
        ${d ? `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</span>` : ''}
        <div class="meta">${team.insuranceUsed ? L('insurance used', 'Versicherung gebraucht') : L('insurance left', 'Versicherung offen')}</div>
      </div>`;
    }).join('');
    board.querySelectorAll('[data-chips]').forEach((el) => el.addEventListener('click', () => {
      const t = +el.dataset.chips;
      const v = window.prompt(L(`Chips of ${S.teams[t].name}:`, `Chips von ${S.teams[t].name}:`), S.teams[t].chips);
      const n = v == null ? NaN : Math.round(G.parseNum(v));
      if (Number.isFinite(n) && n >= 0) { S.teams[t].chips = n; save(); render(); }
    }));
  }

  function render() {
    clearInterval(timer);
    if (anim) { anim.stop(); anim = null; }
    Lang.apply(T);
    document.title = T.title();
    document.getElementById('restart').hidden = !S;
    renderBoard();
    if (!S) { clearTimeout(poller); renderSetup(); return; }
    ({ lobby: renderLobby, show: renderShow, bet: renderBet, reveal: renderReveal, hot: renderHot, end: renderEnd })[S.phase]();
    poll();
  }

  function newGame() {
    if (S && S.phase !== 'end' && !window.confirm(L('End this game and set up a new one?', 'Dieses Spiel beenden und ein neues einrichten?'))) return;
    if (phones() && S.code) api(`${S.code}/close`, {});
    S = null;
    storage.remove(KEY);
    setNotice('');
    render();
  }

  Lang.init();
  Lang.wire(() => render());
  document.getElementById('restart').addEventListener('click', newGame);
  render();
})();
