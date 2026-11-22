// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// A ± button for number fields. Number fields (inputmode="decimal") open the number pad on
// phones, and the iPhone's has no minus key; so every such field gets a button next to it that
// switches the sign of its value (shown on touch screens only, see ui.css). The button does not
// take the focus, so the number pad stays open, and the field reports the change like typing.
// It finds the fields by itself, also those drawn later.
// Also: Enter checks the answers from any answer, not only from a text field (where the browser
// submits the form by itself): from a radio button or a checkbox of the exercise (a sense of
// rotation, a choice, the table of forces) and from a select, as if Check were pressed; and from a
// text field that is in no form (there the browser does nothing by itself).
(function (root) {
  'use strict';

  const label = () => (root.Lang && root.Lang.get() === 'de' ? 'Vorzeichen wechseln' : 'Change sign');

  function flip(input) {
    const v = input.value.trim();
    input.value = /^[-−–—]/.test(v) ? v.replace(/^[-−–—]\s*/, '') : `-${v}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function equip(input) {
    if (input.dataset.sign) return;
    input.dataset.sign = '1';
    const had = input === document.activeElement; // moving the field takes its focus
    const wrap = document.createElement('span');
    wrap.className = 'num';
    input.replaceWith(wrap);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sign';
    btn.textContent = '±';
    btn.setAttribute('aria-label', label());
    btn.tabIndex = -1; // on the keyboard the minus key is at hand
    // keep the focus (and the number pad) in the field
    btn.addEventListener('pointerdown', (evt) => evt.preventDefault());
    btn.addEventListener('mousedown', (evt) => evt.preventDefault());
    btn.addEventListener('click', () => { flip(input); input.focus(); });
    wrap.append(input, btn);
    if (had) input.focus({ preventScroll: true });
  }

  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches('input[inputmode="decimal"]')) equip(node);
    node.querySelectorAll('input[inputmode="decimal"]').forEach(equip);
  }

  function enter(evt) {
    if (evt.key !== 'Enter' || evt.isComposing || evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey) return;
    const el = evt.target;
    if (!el.matches) return;
    // a text field submits its form by itself; without a form (motion-graphs), Enter checks here
    const field = el.matches('input[type="text"], input:not([type])') && !el.form;
    if (!field && !el.matches('input[type="radio"], input[type="checkbox"], select')) return;
    const check = document.getElementById('check');
    if (!check || check.disabled || !check.offsetParent || !el.closest('#task')) return;
    evt.preventDefault();
    if (check.form && el.form === check.form && check.form.requestSubmit) check.form.requestSubmit(check);
    else check.click();
  }

  function start() {
    document.addEventListener('keydown', enter);
    scan(document.body);
    new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach(scan))).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
