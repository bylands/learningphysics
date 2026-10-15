// The games' preview (canonical copy in shared/, copied by sync.sh into all-in/ and absolute-zero/):
// a logged-in teacher tries a game alone, at /all-in/?preview or /absolute-zero/?preview. The
// teacher's screen runs as usual beside a phone (an iframe of the game's play page, or a second
// tab), where the teacher plays one student or team; the others are simulated players (bots),
// driven from the teacher's screen through the same calls the phones make (each game's bots.js).
// A preview opens a room of its own on the server, so a real game of the teacher's stays open, and
// keeps its game under a key of its own in the browser.
//   Preview.on                 the page was opened as a preview
//   Preview.mount(L)           the banner and the phone's column (call once, with the game's L)
//   Preview.phone(url)         shows the play page at url in the phone (null: not yet, no game)
//   Preview.names(n)           n first names for bots, each marked as simulated (🤖)
//   Preview.later(ms, fn)      runs fn after ms, unless Preview.cancel() comes first
//   Preview.rand(a, b), pick(list, weights), chance(p), normal()   randomness for the bots
(function (root) {
  'use strict';

  const on = typeof location !== 'undefined' && new URLSearchParams(location.search).has('preview');
  const BOT = ' 🤖';
  const NAMES = ['Lena', 'Noah', 'Mia', 'Luca', 'Elena', 'Jonas', 'Sara', 'Elias', 'Lea', 'Nico', 'Alina', 'Tim', 'Nina',
    'David', 'Leonie', 'Levin', 'Emma', 'Matteo', 'Julia', 'Yanis', 'Aylin', 'Ben', 'Zoe', 'Fabio', 'Lara', 'Gian'];

  let timers = [];
  let L = (en) => en;
  let src = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const chance = (p) => Math.random() < p;
  // a standard normal number (Box–Muller)
  const normal = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  function pick(list, weights) {
    if (!weights) return list[Math.floor(Math.random() * list.length)];
    const sum = weights.reduce((a, b) => a + b, 0);
    let x = Math.random() * sum;
    for (let k = 0; k < list.length; k++) { x -= weights[k]; if (x < 0) return list[k]; }
    return list[list.length - 1];
  }
  function names(n) {
    const pool = NAMES.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return Array.from({ length: n }, (_, k) => pool[k % pool.length] + (k >= pool.length ? ` ${Math.floor(k / pool.length) + 1}` : '') + BOT);
  }
  const isBot = (name) => String(name || '').endsWith(BOT);

  function later(ms, fn) { timers.push(setTimeout(fn, Math.max(0, ms))); }
  function cancel() { timers.forEach(clearTimeout); timers = []; }

  // the banner above the game and the phone beside it; the game's <main> moves into a grid
  function mount(lang) {
    if (!on || document.getElementById('preview-phone')) return;
    if (lang) L = lang;
    document.body.classList.add('previewing');
    const main = document.querySelector('main');
    const grid = document.createElement('div');
    grid.className = 'preview-grid wrap';
    main.parentNode.insertBefore(grid, main);
    const banner = document.createElement('div');
    banner.className = 'preview-banner';
    banner.id = 'preview-banner';
    grid.appendChild(banner);
    main.classList.remove('wrap');
    grid.appendChild(main);
    const aside = document.createElement('aside');
    aside.className = 'preview-phone';
    aside.id = 'preview-phone';
    grid.appendChild(aside);
    draw();
  }

  function phone(url) {
    if (!on) return;
    if (url !== src) { src = url; draw(); } else text();
  }

  function draw() {
    const aside = document.getElementById('preview-phone');
    if (!aside) return;
    aside.innerHTML = `<p class="preview-phone-head"><b data-p="you"></b> <a data-p="tab" target="_blank" rel="noopener"></a></p>
      <div class="preview-device">${src ? `<iframe title="Phone" src="${src.replace(/"/g, '&quot;')}"></iframe>` : '<p class="preview-wait" data-p="wait"></p>'}</div>`;
    text();
  }

  // the texts, again after a change of language
  function text() {
    const banner = document.getElementById('preview-banner');
    if (!banner) return;
    banner.innerHTML = `<b>${L('Preview', 'Vorschau')}</b> ${L('You play one player on the phone at the right (or in a second tab); the other players are simulated (🤖), so no students need to join.',
      'Sie spielen eine Person auf dem Handy rechts (oder in einem zweiten Tab); die anderen sind simuliert (🤖), es müssen also keine Schülerinnen und Schüler beitreten.')}
      <a href="${location.pathname}">${L('Leave the preview', 'Vorschau verlassen')}</a>`;
    const set = (k, s) => { const el = document.querySelector(`#preview-phone [data-p="${k}"]`); if (el) el.textContent = s; };
    set('you', L('Your phone', 'Ihr Handy'));
    set('wait', L('Your phone joins here once the game is open.', 'Ihr Handy tritt hier bei, sobald das Spiel eröffnet ist.'));
    const tab = document.querySelector('#preview-phone [data-p="tab"]');
    if (tab) { tab.hidden = !src; if (src) tab.href = src; tab.textContent = L('Open in a new tab ↗', 'In neuem Tab öffnen ↗'); }
  }

  root.Preview = { on, BOT, isBot, mount, phone, names, later, cancel, rand, chance, normal, pick };
})(typeof window !== 'undefined' ? window : globalThis);
