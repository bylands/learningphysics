// All In, the Physics Casino: the teacher's screen for the projector. The teacher sets up the
// teams and the rounds; in each round the question shows, the betting timer runs, the teams hold
// up their bet cards and the teacher types the bets in; then the answer is revealed and paid out
// (game.js), a die picks the member of the team in the hot seat who explains it, and the next round
// begins. The game is kept in the browser (localStorage), so a reload loses nothing.
(function () {
  'use strict';

  const G = window.AllInGame, ROUNDS = window.ALL_IN_ROUNDS, Lang = window.Lang;
  const KEY = 'all-in-game';
  const L = (en, de) => Lang.L(en, de);
  const tr = (t) => (t && typeof t === 'object' ? t[Lang.get()] || t.en : t);
  const byId = Object.fromEntries(ROUNDS.map((r) => [r.id, r]));
  const LETTERS = 'ABCD';

  const T = {
    title: () => L('All In: the Physics Casino', 'All In: das Physik-Casino'),
    restart: () => L('New game', 'Neues Spiel'),
  };
  const TYPE = {
    predict: () => L('Predict', 'Vorhersage'),
    estimate: () => L('Estimate', 'Schätzung'),
    calculate: () => L('Calculate', 'Rechnung'),
  };
  const RULE = {
    predict: (n) => L(`Put chips on one or more answers: the right one pays back ${n} × its chips.`,
      `Chips auf eine oder mehrere Antworten setzen: die richtige zahlt ${n} × ihre Chips zurück.`),
    estimate: () => L('Write a low and a high bound and a stake. If the true value lies inside: ratio high : low up to 3 pays back 4 × the stake, up to 10 pays 2.5 ×, up to 100 pays 1.5 ×, wider just the stake.',
      'Untere und obere Grenze und einen Einsatz schreiben. Liegt der wahre Wert dazwischen: Verhältnis oben : unten bis 3 zahlt 4 × den Einsatz zurück, bis 10 zahlt 2.5 ×, bis 100 zahlt 1.5 ×, breiter nur den Einsatz.'),
    calculate: () => L('Write a number and a stake. Within ±5 % pays back 2 × the stake; the first correct team gets +10.',
      'Eine Zahl und einen Einsatz schreiben. Innerhalb ±5 % zahlt 2 × den Einsatz zurück; das erste richtige Team erhält +10.'),
  };
  const ERR = {
    'stake-int': () => L('whole chips only', 'nur ganze Chips'),
    'stake-min': (min) => L(`at least ${min} chips`, `mindestens ${min} Chips`),
    'stake-max': () => L('more than the team has', 'mehr, als das Team hat'),
    bounds: () => L('low > 0 and high ≥ low', 'unten > 0 und oben ≥ unten'),
    value: () => L('a number', 'eine Zahl'),
  };

  let S = null; // the game; null before setup
  let timer = null, rolling = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 4.5e22 → 4.5·10²², 3820 → 3820, 0.5 → 0.5
  function fmt(x) {
    if (!Number.isFinite(x)) return '–';
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) {
      const e = Math.floor(Math.log10(a)), m = +(x / Math.pow(10, e)).toPrecision(3);
      const sup = String(e).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
      return `${m}·10${sup}`;
    }
    return String(+x.toPrecision(4));
  }
  const withUnit = (x, unit) => (unit ? `${fmt(x)} ${unit}` : fmt(x));

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1 && Array.isArray(s.teams) && Array.isArray(s.rounds) && s.rounds.every((id) => byId[id])) return s;
    } catch (e) { /* none or broken */ }
    return null;
  }

  const round = () => byId[S.rounds[S.i]];
  const isFinal = () => S.i === S.rounds.length - 1;

  // ------------------------------------------------------------------ setup
  let setup = { teams: 4, names: [], sizes: [], seconds: 90, rounds: ROUNDS.filter((r) => r.standard).map((r) => r.id) };

  function teamDefault(i) { return L(`Team ${i + 1}`, `Team ${i + 1}`); }

  function renderSetup() {
    const saved = load();
    const order = setup.rounds.concat(ROUNDS.map((r) => r.id).filter((id) => !setup.rounds.includes(id)));
    const teams = Array.from({ length: setup.teams }, (_, i) => `
      <div class="team-setup">
        <input type="text" data-name="${i}" maxlength="24" value="${esc(setup.names[i] || '')}" placeholder="${esc(teamDefault(i))}" aria-label="${esc(L('Name of team', 'Name von Team'))} ${i + 1}">
        <select data-size="${i}" aria-label="${esc(L('Members', 'Mitglieder'))}">
          ${[2, 3, 4].map((n) => `<option value="${n}"${(setup.sizes[i] || 3) === n ? ' selected' : ''}>${n} ${L('members', 'Personen')}</option>`).join('')}
        </select>
      </div>`).join('');
    const rounds = order.map((id) => {
      const r = byId[id], on = setup.rounds.includes(id);
      const pos = setup.rounds.indexOf(id);
      return `<li><label><input type="checkbox" data-round="${id}"${on ? ' checked' : ''}>
        <span><span class="tag ${r.type}">${TYPE[r.type]()}</span> ${esc(tr(r.title))}${r.demo ? ` <span class="muted small">(${L('demo', 'Demo')})</span>` : ''}
        ${on ? `<span class="muted small">· ${L('round', 'Runde')} ${pos + 1}${pos === setup.rounds.length - 1 ? ` · <b>All in</b>` : ''}</span>` : ''}</span></label></li>`;
    }).join('');
    stage(`
      ${saved && saved.phase !== 'end' ? `<div class="card"><h2>${L('A game is in progress', 'Ein Spiel läuft noch')}</h2>
        <p>${L(`Round ${saved.i + 1} of ${saved.rounds.length}`, `Runde ${saved.i + 1} von ${saved.rounds.length}`)} · ${saved.teams.map((t) => `${esc(t.name)}: ${t.chips}`).join(' · ')}</p>
        <div class="actions"><button type="button" class="primary" id="resume">${L('Continue it', 'Weiterspielen')}</button></div></div>` : ''}
      <div class="card">
        <h2>${L('Teams', 'Teams')}</h2>
        <div class="row">
          <label>${L('Number of teams', 'Anzahl Teams')}
            <select id="team-count">${[2, 3, 4, 5, 6].map((n) => `<option${n === setup.teams ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>${L('Betting time', 'Zeit zum Wetten')}
            <select id="seconds">${[60, 90, 120].map((n) => `<option value="${n}"${n === setup.seconds ? ' selected' : ''}>${n} s</option>`).join('')}</select></label>
        </div>
        <div class="teams-setup">${teams}</div>
        <p class="muted small">${L('The members of each team number themselves 1 to 4: the die in the hot seat picks one of them.',
          'Die Mitglieder jedes Teams nummerieren sich von 1 bis 4: der Würfel im heissen Stuhl wählt eines davon.')}</p>
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
        <p>${L('Every team starts with 100 chips and a bet card. In each round the teams discuss and write their bet while the timer runs; then all cards go up at once and you type the bets in. After the reveal, a die picks one member of the team in the hot seat, who explains the result without help: a convincing explanation earns +15 chips, a partial one +5. Insurance (once per game) gives half the stake back if a bet loses. A team below 10 chips is topped up to 20.',
          'Jedes Team startet mit 100 Chips und einer Wettkarte. In jeder Runde diskutieren die Teams und schreiben ihre Wette, während die Zeit läuft; dann gehen alle Karten gleichzeitig hoch, und Sie tippen die Wetten ein. Nach der Auflösung wählt ein Würfel ein Mitglied des Teams im heissen Stuhl, das das Ergebnis ohne Hilfe erklärt: eine überzeugende Erklärung bringt +15 Chips, eine teilweise +5. Die Versicherung (einmal pro Spiel) gibt bei einer verlorenen Wette den halben Einsatz zurück. Ein Team unter 10 Chips wird auf 20 aufgefüllt.')}</p>
      </div>`);

    const el = document.getElementById('stage');
    el.querySelector('#resume')?.addEventListener('click', () => { S = saved; render(); });
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

  function start() {
    S = {
      v: 1,
      teams: Array.from({ length: setup.teams }, (_, i) => ({
        name: (setup.names[i] || '').trim() || teamDefault(i), size: setup.sizes[i] || 3, chips: G.START, insuranceUsed: false,
      })),
      rounds: setup.rounds.slice(),
      seconds: setup.seconds,
      i: 0,
      last: null, // the chips each team won or lost in the last payout, for the scoreboard
    };
    beginRound();
  }

  function beginRound() {
    const r = round();
    S.phase = 'show';
    S.raw = S.teams.map(() => ({ chips: r.type === 'predict' ? r.options.map(() => '') : [], low: '', high: '', stake: '', value: '', insurance: false }));
    S.answer = r.answer;
    S.first = null;
    S.results = null;
    S.member = null;
    S.bonus = null;
    S.timerEnd = null;
    save();
    render();
  }

  // ------------------------------------------------------------------ the bets
  // a team's bet from what was typed
  function betOf(t) {
    const r = round(), raw = S.raw[t];
    const n = (s) => (String(s).trim() === '' ? 0 : G.parseNum(String(s)));
    if (r.type === 'predict') return { chips: raw.chips.map(n), insurance: raw.insurance };
    const bet = { stake: n(raw.stake), insurance: raw.insurance };
    if (r.type === 'estimate') { bet.low = G.parseNum(raw.low); bet.high = G.parseNum(raw.high); }
    else bet.value = G.parseNum(raw.value);
    return bet;
  }
  const minOf = (t) => G.minStake(S.teams[t].chips, isFinal());
  const errorOf = (t) => G.checkBet(round(), betOf(t), S.teams[t].chips, isFinal());

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
      return `<tr><th scope="row">${esc(team.name)} <span class="muted small">(${team.chips})</span></th>${cells}<td>${ins}</td><td class="msg" data-msg="${t}"></td></tr>`;
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
        save();
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
      msg.className = `msg ${err ? 'bad' : 'ok'}`;
      msg.textContent = err ? ERR[err](minOf(t)) : `✓ ${L('stake', 'Einsatz')} ${G.stakeOf(round(), betOf(t))}`;
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
      <p class="question">${esc(tr(r.question))}${r.unit && r.type !== 'predict' ? ` <span class="muted">(${L('in', 'in')} ${esc(r.unit)})</span>` : ''}</p>
      ${opts}
      <p class="rules">${RULE[r.type](r.options ? r.options.length : 0)} ${isFinal() ? L('All in: the stake is at least half of the team’s chips.', 'All in: der Einsatz ist mindestens die Hälfte der Chips des Teams.') : L(`Minimum stake ${G.MIN_STAKE} chips.`, `Mindesteinsatz ${G.MIN_STAKE} Chips.`)}</p>
    </div>`;
  }

  function renderShow() {
    stage(`${questionCard(false)}
      <div class="actions"><button type="button" class="primary big" id="go">${L(`Start betting (${S.seconds} s)`, `Wetten starten (${S.seconds} s)`)}</button>
      <button type="button" id="skip-timer">${L('Enter the bets without a timer', 'Wetten ohne Timer eintippen')}</button></div>`);
    document.getElementById('go').addEventListener('click', () => { S.phase = 'bet'; S.timerEnd = Date.now() + S.seconds * 1000; save(); render(); });
    document.getElementById('skip-timer').addEventListener('click', () => { S.phase = 'bet'; S.timerEnd = Date.now(); save(); render(); });
  }

  function renderBet() {
    stage(`${questionCard(false)}
      <div id="clock"></div>
      <div class="card"><h2>${L('The bets', 'Die Wetten')}</h2>
        <p class="muted small">${L('Type each team’s card once all cards are up. Numbers like 4.5e22 or 4.5·10^22 work.', 'Die Karte jedes Teams eintippen, sobald alle Karten oben sind. Zahlen wie 4.5e22 oder 4.5·10^22 gehen.')}</p>
        ${betRows()}
        <div class="actions"><button type="button" class="primary big" id="reveal" disabled>${L('Reveal the answer', 'Antwort auflösen')}</button></div>
      </div>`);
    const el = document.getElementById('stage');
    wireBets(el);
    document.getElementById('reveal').addEventListener('click', () => { if (checkBets()) { S.phase = 'reveal'; save(); render(); } });
    tick();
  }

  function tick() {
    clearInterval(timer);
    const clock = document.getElementById('clock');
    if (!clock || !S.timerEnd) return;
    const draw = () => {
      const left = Math.max(0, Math.ceil((S.timerEnd - Date.now()) / 1000));
      clock.innerHTML = left > 0
        ? `<div class="timer${left <= 10 ? ' low' : ''}" role="timer">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</div>`
        : `<div class="cards-up">${L('Cards up!', 'Karten hoch!')}</div>`;
      if (left <= 0) { clearInterval(timer); if (S.timerEnd > Date.now() - 1500 && !S.beeped) { S.beeped = true; beep(); } }
    };
    S.beeped = S.timerEnd <= Date.now();
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
    const correct = S.teams.map((_, t) => G.isCorrect(r, betOf(t), S.answer));
    return S.teams.map((_, t) => G.settle(r, betOf(t), S.answer, { first: r.type === 'calculate' && S.first === t && correct[t] }));
  }

  function renderReveal() {
    const r = round();
    const res = results();
    const answer = r.type === 'predict' ? `${LETTERS[S.answer]}: ${esc(tr(r.options[S.answer]))}` : esc(withUnit(S.answer, r.unit));
    const describe = (t) => {
      const b = betOf(t);
      if (r.type === 'predict') return b.chips.map((c, k) => (c ? `${c} ${L('on', 'auf')} ${LETTERS[k]}` : '')).filter(Boolean).join(', ');
      if (r.type === 'estimate') return `${fmt(b.low)} … ${fmt(b.high)} (${L('ratio', 'Verhältnis')} ${fmt(b.high / b.low)})`;
      return withUnit(b.value, r.unit);
    };
    const firstCol = r.type === 'calculate';
    const rows = S.teams.map((team, t) => `<tr>
      <th scope="row">${esc(team.name)}</th>
      <td>${esc(describe(t))}${res[t].insured ? ` · <span class="muted">${L('insured', 'versichert')}</span>` : ''}</td>
      <td class="num">${res[t].stake}</td>
      <td>${res[t].correct ? '✓' : '✗'}</td>
      ${firstCol ? `<td>${res[t].correct ? `<input type="radio" name="first" value="${t}"${S.first === t ? ' checked' : ''} aria-label="${esc(L('first correct', 'erstes richtiges'))}">` : ''}</td>` : ''}
      <td class="num">${res[t].back}</td>
      <td class="num net ${res[t].net > 0 ? 'up' : res[t].net < 0 ? 'down' : ''}">${res[t].net > 0 ? '+' : ''}${res[t].net}</td>
    </tr>`).join('');
    const edit = r.editable ? `<p class="small"><label>${esc(tr(r.note))} <input id="answer" class="wide" inputmode="decimal" value="${esc(fmt(S.answer))}"> ${esc(r.unit || '')}</label></p>` : '';
    stage(`${questionCard(true)}
      <div class="card">
        ${r.demo ? `<p class="demo">${L('Run the demo now.', 'Jetzt das Experiment zeigen.')}</p>` : ''}
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
    S.last = res.map((x) => x.net);
    S.teams.forEach((team, t) => {
      team.chips += res[t].net;
      if (S.raw[t].insurance) team.insuranceUsed = true;
    });
    S.phase = 'hot';
    save();
    render();
  }

  function renderHot() {
    const t = G.hotTeam(S.i, S.teams.length), team = S.teams[t];
    stage(`<div class="card hot-seat">
      <h2>${L('Hot seat', 'Heisser Stuhl')}</h2>
      <p class="who">${esc(team.name)}</p>
      <p class="muted">${L('The die picks who explains the result, without help from the team.', 'Der Würfel bestimmt, wer das Ergebnis erklärt, ohne Hilfe des Teams.')}</p>
      <div class="die${rolling ? ' rolling' : ''}" id="die">${S.member || '?'}</div>
      ${S.member ? `<p class="who">${L(`Member ${S.member}, please explain!`, `Mitglied ${S.member}, bitte erklären!`)}</p>` : ''}
      <div class="actions">
        ${S.member == null ? `<button type="button" class="primary big" id="roll">${L('Roll the die', 'Würfeln')}</button>` : ''}
        ${S.member != null && S.bonus == null ? `
          <button type="button" class="primary" data-bonus="good">${L('Convincing', 'Überzeugend')} +${G.HOT.good}</button>
          <button type="button" class="primary" data-bonus="partial">${L('Partly', 'Teilweise')} +${G.HOT.partial}</button>
          <button type="button" data-bonus="none">${L('No bonus', 'Kein Bonus')}</button>` : ''}
        ${S.bonus != null ? `<button type="button" class="primary big" id="next">${isFinal() ? L('Final result', 'Schlussresultat') : L('Next round', 'Nächste Runde')}</button>` : ''}
      </div>
    </div>`);
    document.getElementById('roll')?.addEventListener('click', () => {
      rolling = true; render();
      const die = () => document.getElementById('die');
      const spin = setInterval(() => { if (die()) die().textContent = G.roll(team.size); }, 80);
      setTimeout(() => { clearInterval(spin); rolling = false; S.member = G.roll(team.size); save(); render(); }, 1200);
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
    beginRound();
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
  function stage(html) { document.getElementById('stage').innerHTML = html; }

  function renderBoard() {
    const board = document.getElementById('board');
    board.hidden = !S;
    if (!S) return;
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
    Lang.apply(T);
    document.title = T.title();
    document.getElementById('restart').hidden = !S;
    renderBoard();
    if (!S) return renderSetup();
    ({ show: renderShow, bet: renderBet, reveal: renderReveal, hot: renderHot, end: renderEnd })[S.phase]();
  }

  function newGame() {
    if (S && S.phase !== 'end' && !window.confirm(L('End this game and set up a new one?', 'Dieses Spiel beenden und ein neues einrichten?'))) return;
    S = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ }
    render();
  }

  Lang.init();
  Lang.wire(() => render());
  document.getElementById('restart').addEventListener('click', newGame);
  render();
})();
