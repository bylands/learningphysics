// Shared by the learningphysics.ch apps (canonical copy in shared/, copied by sync.sh).
// The step before the calculation: the student identifies a quantity (e.g. which expression is the
// component of the weight along the slope) by choosing one of a few options; a right choice shows
// its value, computed by the app (sine, cosine or π need no calculator then), a wrong one says why
// and counts as an attempt. Then the student calculates the rest with the values shown.
//   items: [{ key, what (HTML), options: [{ html, right, why }], value (HTML, shown once right) }]
//   Identify.html(items, state, done)   the questions; state { key: index chosen }, done: all
//                                       shown as solved (e.g. once the solution is shown)
//   Identify.attach(el, items, state, onPick(right))  a choice re-draws its question
//   Identify.ok(items, state)           all identified; Identify.right(item, state) this one
//   Identify.trig(c)                    the usual item for a component: c = { key, what, sym (TeX),
//                                       base (TeX, e.g. m\,g), baseVal (or null if unknown), fn: sin
//                                       or cos, alpha (degrees), num(x) and unit (TeX) for the values,
//                                       why: other explanations { sc, tan, whole }, frac: the factor
//                                       as a fraction (TeX) when the base is unknown }
(function (root) {
  'use strict';

  const TX = {
    en: { not: 'Not this one.', pick: 'Choose one.',
      sc: 'Where is the angle? The component along the side next to the angle is the force times cos α, the one opposite it times sin α.',
      tan: 'tan α is the ratio of two components, not a component.', whole: 'Only a part of it acts in this direction.' },
    de: { not: 'Nicht diese.', pick: 'Wähle eine aus.',
      sc: 'Wo liegt der Winkel? Die Komponente entlang der Seite am Winkel ist die Kraft mal cos α, die gegenüber mal sin α.',
      tan: 'tan α ist das Verhältnis zweier Komponenten, keine Komponente.', whole: 'Nur ein Teil davon wirkt in diese Richtung.' },
  };
  const tx = () => TX[root.Lang && root.Lang.get() === 'de' ? 'de' : 'en'];
  const isRight = (it, state) => state[it.key] != null && it.options[state[it.key]] && it.options[state[it.key]].right;

  function one(it, state, done) {
    const j = state[it.key], ok = done || isRight(it, state), chosen = j != null ? it.options[j] : null;
    const fb = ok ? `<p class="ident-fb ok">${it.value}</p>`
      : chosen ? `<p class="ident-fb bad">${tx().not} ${chosen.why || ''}</p>` : '';
    return `<div class="ident${ok ? ' done' : ''}" data-key="${it.key}"><p class="ident-what">${it.what}</p>` +
      `<div class="levels ident-opts" role="radiogroup" aria-label="${tx().pick}">${it.options.map((o, k) => `<label><input type="radio" name="ident-${it.key}" value="${k}"` +
        `${(ok ? o.right : j === k) ? ' checked' : ''}${ok ? ' disabled' : ''}><span>${o.html}</span></label>`).join('')}</div>${fb}</div>`;
  }

  const Identify = {
    html: (items, state, done) => items.map((it) => one(it, state, done)).join(''),
    attach(el, items, state, onPick) {
      el.addEventListener('change', (evt) => {
        const box = evt.target.closest('.ident');
        if (!box || evt.target.name !== `ident-${box.dataset.key}`) return;
        const it = items().find((x) => x.key === box.dataset.key);
        state()[it.key] = Number(evt.target.value);
        const right = isRight(it, state());
        box.outerHTML = one(it, state(), false);
        onPick(right, it);
      });
    },
    ok: (items, state) => items.every((it) => isRight(it, state)),
    right: isRight,
    trig(c) {
      const t = { ...tx(), ...(c.why || {}) }, f = c.fn === 'sin' ? Math.sin : Math.cos, a = (c.alpha * Math.PI) / 180;
      const opt = (fn, why) => ({ html: `$${c.base}${fn ? `\\${fn}\\alpha` : ''}$`, right: fn === c.fn, why });
      const factor = c.frac || c.num(f(a)); // a fraction (e.g. \\tfrac{12}{13}) where the decimal would not end
      const value = c.baseVal == null
        ? `$${c.sym} = ${c.base}\\${c.fn}\\alpha = ${factor}\\,${c.base}$`
        : `$${c.sym} = ${c.base}\\${c.fn}\\alpha = ${c.num(c.baseVal)}\\,${c.unit}\\cdot\\${c.fn}${Math.round(c.alpha * 10) / 10}^\\circ = ${c.num(c.baseVal * f(a))}\\,${c.unit}$`;
      return { key: c.key, what: c.what, options: [opt('sin', t.sc), opt('cos', t.sc), opt('tan', t.tan), opt('', t.whole)], value };
    },
  };

  root.Identify = Identify;
})(window);
