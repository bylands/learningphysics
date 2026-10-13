// The situations of the worksheet “Übungen Energieerhaltung” and related ones: a ball falling or
// thrown up, part of the way down, a spring launcher, a pendulum, a track, a throw from a tower,
// a ball shot up by a spring, the speed as a fraction of the final speed, a block on a hanging
// spring, and a ball dropped onto a spring. A scenario has an id, a difficulty from 1 to 5 (for
// practice levels and the stars of an exercise), spring if a spring stores energy, and:
//   make(r)            random parameters p, with p.V the values of all symbols (g included)
//   vars(p)            the given quantities, for a formula answer (symbol keys, see core.js)
//   want(p)            the wanted quantity { key, unit, what }
//   f(p)               the answer as a function of the symbols' values V, in the given quantities
//   tex(p, formal)     the answer formula: in the given quantities (formal), or in the quantities
//                      given as numbers; insert(p) the same with the numbers put in
//   traps(p)           answers under typical wrong ideas: [{ flag, f, tex }] (see WHY in
//                      generator.js; why(p) of the scenario may say it better)
//   states(p)          the energies in each state (J; m = 1 kg where no mass is given):
//                      [{ pot, kin, el }]; energies(p, formal) the same as formulas (KaTeX), and
//                      efun(p) as functions of the symbols' values V; esyms(p) the symbols they
//                      use, rel(p) (optional) what the text fixes among them, e.g. h' = 2/3 h
//   zero(p)            where the zero level of the potential energy is
//   text(p, formal), scene(p, formal, view)  the situation in words and as a drawing (draw.js);
//                      view.hl: the states to highlight
//   steps(p, formal)   the worked solution after the energies of the states: [{ rule, text,
//                      bars, hl }], bars and hl the states whose energy bars to show and highlight
//   hint(p, formal)    the last hint: the equation to solve
//   slips(p)           (optional) heights measured from the wrong level: [{ i, k, tex, why() }],
//                      a wrong energy of state i (form k), for "find the error" (concepts.js)
(function (root) {
  'use strict';

  const EC = root.EC, { Fig } = root.Draw;
  const { L, G, tex: T, svgSym: S, q, tq, num, pick, coef, fval, fwords, fplain, reduce } = EC;

  // ---------------------------------------------------------------- formulas
  const pot = (h) => `m\\,g\\,${h}`;
  const kin = (v) => `\\tfrac{1}{2}\\,m\\,${v}^2`;
  const el = (s) => `\\tfrac{1}{2}\\,k\\,${s}^2`;
  const gq = () => tq(G, 'g');
  const m$ = (s) => `$${s}$`;
  const dm = (s) => `$$${s}$$`;
  const step = (rule, text, bars, hl) => ({ rule, text, bars, hl: hl || [] });
  const ALL = null; // bars of all states
  const sq = (x) => x * x;
  const frac = (n, d) => [n, d];
  const sub = (a, b) => reduce([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]);
  const mul = (a, b) => reduce([a[0] * b[0], a[1] * b[1]]);
  const ONE = [1, 1];
  // a root of a factor times symbols: \sqrt{\tfrac{2}{3}\,g\,h}
  const rootOf = (fr, syms) => `\\sqrt{${coef(fr)}${syms}}`;
  // The energies as functions of the symbols' values V (for checking typed formulas)
  const Pot = (h) => (V) => V.m * V.g * h(V);
  const Kin = (v) => (V) => 0.5 * V.m * sq(v(V));
  const El = (x) => (V) => 0.5 * V.k * sq(x(V));

  // ---------------------------------------------------------------- drawing helpers
  const R = 12; // ball radius
  const PW = 170; // distance between the states' panels
  const ball = (fig, cx, yb) => fig.circle(cx, yb - R, R, 'body ball');
  const groundAt = (fig, cx, y, w = 120) => fig.surface(cx - w / 2, cx + w / 2, y);
  const ceilingAt = (fig, cx, y, w = 100) => fig.surface(cx - w / 2, cx + w / 2, y, -1);
  // the zero level: a dash-dotted line, labelled h = 0 at its right end
  function zeroLine(fig, x1, x2, y) {
    fig.line(x1, y, x2, y, 'w zero');
    return fig.text(x2 + 5, y + 4, `${S('h')} = 0`, 'lbl small', 'start');
  }
  // a velocity arrow from (x, y) along dir, with its label at the tip
  function speed(fig, x, y, dir, label, len = 34, off = [0, 0]) {
    const n = Math.hypot(...dir), u = [dir[0] / n, dir[1] / n];
    fig.arrow(x, y, x + len * u[0], y + len * u[1], 'vel');
    const lx = x + len * u[0] + (Math.abs(u[0]) > 0.3 ? 6 * Math.sign(u[0]) : 8), ly = y + len * u[1] + (Math.abs(u[1]) > 0.3 ? (u[1] > 0 ? 4 : 0) : -6);
    return fig.text(lx + off[0], ly + 5 + off[1], label, 'lbl vlbl', u[0] < -0.3 ? 'end' : 'start');
  }
  const atRest = (fig, x, y) => fig.text(x, y, `${S('v')} = 0`, 'lbl', 'start');
  // a label: the symbol, its value (numbers) or a formula (formal); wanted: "= ?"
  const lab = (key, val) => `${S(key)} = ${val}`;
  const given = (key, formal, x, u, expr) => (formal ? (expr ? lab(key, expr) : S(key)) : lab(key, q(x, u)));
  const wanted = (key) => lab(key, '?');
  const hl = (view, i) => !!(view.hl && view.hl.has(i));
  // a height measured from the wrong level: the distance fallen h − h' instead of the height h'
  const fallen = (i, h, hp) => [{ i, k: 'pot', tex: pot(`(${h} - ${hp})`),
    why: () => L(`The potential energy counts the height above the zero level, $${hp}$, not the distance fallen, $${h} - ${hp}$.`, `Die Lageenergie zählt die Höhe über dem Nullniveau, $${hp}$, nicht die Fallstrecke $${h} - ${hp}$.`) }];
  // the starting height counted from the wrong level: down to where the spring starts, not to the lowest point
  const above = (i, h, full) => [{ i, k: 'pot', tex: pot(h),
    why: () => L(`The zero level is the lowest point: the start is $${full}$ above it, not only $${h}$.`, `Das Nullniveau ist der tiefste Punkt: Der Start liegt $${full}$ darüber, nicht nur $${h}$.`) }];
  // a vertical dimension from the zero level y0 up to y with a dotted line over to the body at bx
  function height(fig, x, y0, y, label, bx) {
    fig.dim(x, y0, y, label);
    if (bx != null) fig.line(x, y, bx, y, 'w dash');
  }

  // ---------------------------------------------------------------- 1 falling or thrown up
  const fall = {
    id: 'fall', difficulty: 1,
    make(r) {
      const dir = pick(r, ['drop', 'up']), ask = pick(r, ['v', 'h']);
      const vk = dir === 'drop' ? 'v' : 'v0';
      if (ask === 'v') { const h = pick(r, [1.2, 1.8, 2.5, 3.2, 4.5, 5, 7.5, 10, 12, 15, 20]); return { dir, ask, vk, V: { g: G, h, [vk]: Math.sqrt(2 * G * h) } }; }
      const v = pick(r, [3, 4, 5, 6, 7, 8, 9, 10, 12, 15]);
      return { dir, ask, vk, V: { g: G, [vk]: v, h: (v * v) / (2 * G) } };
    },
    vars: (p) => (p.ask === 'v' ? ['g', 'h'] : ['g', p.vk]),
    want: (p) => (p.ask === 'v'
      ? { key: p.vk, unit: 'v', what: p.dir === 'drop' ? L('speed at the ground', 'Geschwindigkeit am Boden') : L('launch speed', 'Abwurfgeschwindigkeit') }
      : { key: 'h', unit: 'm', what: p.dir === 'drop' ? L('height', 'Höhe') : L('maximum height', 'maximale Höhe') }),
    f: (p) => (p.ask === 'v' ? (V) => Math.sqrt(2 * V.g * V.h) : (V) => sq(V[p.vk]) / (2 * V.g)),
    tex: (p) => (p.ask === 'v' ? '\\sqrt{2\\,g\\,h}' : `\\frac{${T(p.vk)}^2}{2\\,g}`),
    insert: (p) => (p.ask === 'v' ? `\\sqrt{2\\cdot ${gq()}\\cdot ${tq(p.V.h, 'm')}}` : `\\frac{\\left(${tq(p.V[p.vk], 'v')}\\right)^2}{2\\cdot ${gq()}}`),
    traps(p) {
      const v = T(p.vk), vk = p.vk;
      return p.ask === 'v'
        ? [{ flag: 'root', f: (V) => 2 * V.g * V.h, tex: '2\\,g\\,h' },
          { flag: 'half', f: (V) => Math.sqrt(V.g * V.h), tex: '\\sqrt{g\\,h}' },
          { flag: 'half', f: (V) => 2 * Math.sqrt(V.g * V.h), tex: '2\\sqrt{g\\,h}' },
          { flag: 'root', f: (V) => V.g * V.h, tex: 'g\\,h' }]
        : [{ flag: 'half', f: (V) => sq(V[vk]) / V.g, tex: `\\frac{${v}^2}{g}` },
          { flag: 'square', f: (V) => V[vk] / (2 * V.g), tex: `\\frac{${v}}{2\\,g}` },
          { flag: 'half', f: (V) => (2 * sq(V[vk])) / V.g, tex: `\\frac{2\\,${v}^2}{g}` },
          { flag: 'solve', f: (V) => (V.g * sq(V[vk])) / 2, tex: `\\frac{g\\,${v}^2}{2}` }];
    },
    states: (p) => (p.dir === 'drop' ? [{ pot: G * p.V.h }, { kin: G * p.V.h }] : [{ kin: G * p.V.h }, { pot: G * p.V.h }]),
    energies: (p) => (p.dir === 'drop' ? [{ pot: pot('h') }, { kin: kin('v') }] : [{ kin: kin('v_0') }, { pot: pot('h') }]),
    efun: (p) => (p.dir === 'drop' ? [{ pot: Pot((V) => V.h) }, { kin: Kin((V) => V.v) }] : [{ kin: Kin((V) => V.v0) }, { pot: Pot((V) => V.h) }]),
    esyms: (p) => ['m', 'g', 'h', p.vk],
    zero: () => L('the ground', 'der Boden'),
    title: (p) => (p.dir === 'drop' ? L('Dropped', 'Fallen gelassen') : L('Thrown straight up', 'Senkrecht hochgeworfen')),
    text(p, formal) {
      const V = p.V;
      if (p.dir === 'drop') {
        if (p.ask === 'v') return formal
          ? L(`A ball is dropped from a height $h$ (it starts at rest). Find its speed $v$ just before it hits the ground, in terms of $h$ and $g$.`, `Ein Ball wird aus der Höhe $h$ fallen gelassen (er startet aus der Ruhe). Wie gross ist seine Geschwindigkeit $v$ kurz vor dem Aufprall? Drücke sie durch $h$ und $g$ aus.`)
          : L(`A ball is dropped from a height of ${q(V.h, 'm')} (it starts at rest). How fast is it just before it hits the ground?`, `Ein Ball wird aus ${q(V.h, 'm')} Höhe fallen gelassen (er startet aus der Ruhe). Wie schnell ist er kurz vor dem Aufprall?`);
        return formal
          ? L(`A ball dropped from rest hits the ground with a speed $v$. From what height $h$ was it dropped? Express $h$ in terms of $v$ and $g$.`, `Ein Ball, der aus der Ruhe fallen gelassen wird, trifft mit der Geschwindigkeit $v$ auf dem Boden auf. Aus welcher Höhe $h$ fiel er? Drücke $h$ durch $v$ und $g$ aus.`)
          : L(`A ball dropped from rest hits the ground with a speed of ${q(V.v, 'v')}. From what height was it dropped?`, `Ein Ball, der aus der Ruhe fallen gelassen wird, trifft mit ${q(V.v, 'v')} auf dem Boden auf. Aus welcher Höhe fiel er?`);
      }
      if (p.ask === 'h') return formal
        ? L(`A ball is thrown straight up from the ground with a speed $v_0$. How high does it rise? Express the maximum height $h$ in terms of $v_0$ and $g$.`, `Ein Ball wird vom Boden aus mit der Geschwindigkeit $v_0$ senkrecht nach oben geworfen. Wie hoch steigt er? Drücke die maximale Höhe $h$ durch $v_0$ und $g$ aus.`)
        : L(`A ball is thrown straight up from the ground with a speed of ${q(V.v0, 'v')}. How high does it rise?`, `Ein Ball wird vom Boden aus mit ${q(V.v0, 'v')} senkrecht nach oben geworfen. Wie hoch steigt er?`);
      return formal
        ? L(`A ball thrown straight up from the ground rises to a height $h$. How fast was it thrown? Express the launch speed $v_0$ in terms of $h$ and $g$.`, `Ein Ball, der vom Boden aus senkrecht nach oben geworfen wird, steigt bis auf die Höhe $h$. Wie schnell wurde er abgeworfen? Drücke die Abwurfgeschwindigkeit $v_0$ durch $h$ und $g$ aus.`)
        : L(`A ball thrown straight up from the ground rises to a height of ${q(V.h, 'm')}. How fast was it thrown?`, `Ein Ball, der vom Boden aus senkrecht nach oben geworfen wird, steigt bis auf ${q(V.h, 'm')} Höhe. Mit welcher Geschwindigkeit wurde er abgeworfen?`);
    },
    scene(p, formal, view) {
      const fig = new Fig(this.title(p)), H = 150, drop = p.dir === 'drop';
      const hLab = p.ask === 'h' ? wanted('h') : given('h', formal, p.V.h, 'm');
      const vLab = p.ask === 'v' ? wanted(p.vk) : given(p.vk, formal, p.V[p.vk], 'v');
      [0, 1].forEach((i) => {
        const cx = i * PW, high = drop ? i === 0 : i === 1;
        groundAt(fig, cx, 0);
        if (high) {
          ball(fig, cx, -H);
          height(fig, cx - 34, 0, -H, hLab, cx);
          atRest(fig, cx + R + 8, -H - R + 5);
        } else {
          ball(fig, cx, 0);
          speed(fig, cx + R + 10, drop ? -2 * R - 22 : -4, [0, drop ? 1 : -1], vLab, 28);
        }
        fig.state(cx, 34, i, hl(view, i));
      });
      zeroLine(fig, PW + 60, PW + 62, 0);
      return fig;
    },
    steps(p) {
      const eq = p.dir === 'drop' ? `${pot('h')} = ${kin('v')}` : `${kin('v_0')} = ${pot('h')}`;
      const v = T(p.vk);
      return [
        step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('No friction: the total energy stays the same,', 'Ohne Reibung bleibt die Gesamtenergie gleich,')} $E_1 = E_2$:</p>${dm(eq)}`, ALL, [0, 1]),
        step(L('Solve', 'Auflösen'), `<p>${L('The mass cancels out:', 'Die Masse kürzt sich weg:')}</p>${dm(`g\\,h = \\tfrac{1}{2}\\,${v}^2`)}` +
          dm(p.ask === 'v' ? `${v}^2 = 2\\,g\\,h \\;\\Rightarrow\\; ${v} = \\sqrt{2\\,g\\,h}` : `h = \\frac{${v}^2}{2\\,g}`), ALL),
      ];
    },
    hint: (p) => m$(p.dir === 'drop' ? `${pot('h')} = ${kin('v')}` : `${kin('v_0')} = ${pot('h')}`),
  };

  // ---------------------------------------------------------------- 2 part of the way down (worksheet A)
  const FR_PART = [frac(1, 4), frac(1, 3), frac(1, 2), frac(2, 3), frac(3, 4)];
  const partDrop = {
    id: 'part-drop', difficulty: 2,
    make(r) {
      const fr = pick(r, FR_PART), h = pick(r, [1.2, 2.4, 3.6, 4.8, 6, 7.2, 9.6, 12]);
      return { fr, V: { g: G, h, hp: fval(fr) * h, vp: Math.sqrt(2 * G * (1 - fval(fr)) * h) } };
    },
    vars: () => ['g', 'h'],
    want: () => ({ key: 'vp', unit: 'v', what: L('speed', 'Geschwindigkeit') }),
    f: (p) => (V) => Math.sqrt(2 * V.g * (1 - fval(p.fr)) * V.h),
    tex: (p, formal) => (formal ? rootOf(mul([2, 1], sub(ONE, p.fr)), 'g\\,h') : "\\sqrt{2\\,g\\,(h - h')}"),
    insert: (p) => `\\sqrt{2\\cdot ${gq()}\\cdot (${tq(p.V.h, 'm')} - ${tq(p.V.hp, 'm')})}`,
    traps(p) {
      const fr = p.fr, c = mul([2, 1], sub(ONE, fr));
      return [
        { flag: 'fall', f: (V) => Math.sqrt(2 * fval(fr) * V.g * V.h), tex: rootOf(mul([2, 1], fr), 'g\\,h') },
        { flag: 'fall', f: (V) => Math.sqrt(2 * V.g * V.h), tex: '\\sqrt{2\\,g\\,h}' },
        { flag: 'root', f: (V) => fval(c) * V.g * V.h, tex: `${coef(c)}g\\,h` },
        { flag: 'half', f: (V) => Math.sqrt((1 - fval(fr)) * V.g * V.h), tex: rootOf(sub(ONE, fr), 'g\\,h') },
      ];
    },
    why: {
      fall: () => L("What counts is how far the ball has fallen: from h down to h', not the height h' itself, nor all the way to the ground.", "Entscheidend ist, wie weit der Ball gefallen ist: von h bis h', nicht die Höhe h' selbst und auch nicht bis zum Boden."),
    },
    states: (p) => [{ pot: G * p.V.h }, { pot: G * p.V.hp, kin: G * (p.V.h - p.V.hp) }],
    energies: () => [{ pot: pot('h') }, { pot: pot("h'"), kin: kin("v'") }],
    efun: () => [{ pot: Pot((V) => V.h) }, { pot: Pot((V) => V.hp), kin: Kin((V) => V.vp) }],
    esyms: () => ['m', 'g', 'h', 'hp', 'vp'],
    slips: () => fallen(1, 'h', "h'"),
    rel: (p) => (V) => ({ ...V, hp: fval(p.fr) * V.h }),
    zero: () => L('the ground', 'der Boden'),
    title: () => L('Part of the way down', 'Ein Teil des Wegs'),
    text: (p, formal) => (formal
      ? L(`A ball is dropped from a height $h$ (it starts at rest). How fast is it when it has come down to ${fwords(p.fr)} of that height, $h' = ${coef(p.fr)}h$? Express its speed $v'$ in terms of $h$ and $g$.`,
        `Ein Ball wird aus der Höhe $h$ fallen gelassen (er startet aus der Ruhe). Wie schnell ist er, wenn er noch auf ${fwords(p.fr)} dieser Höhe ist, $h' = ${coef(p.fr)}h$? Drücke seine Geschwindigkeit $v'$ durch $h$ und $g$ aus.`)
      : L(`A ball is dropped from a height of ${q(p.V.h, 'm')} (it starts at rest). How fast is it at a height of ${q(p.V.hp, 'm')}?`,
        `Ein Ball wird aus ${q(p.V.h, 'm')} Höhe fallen gelassen (er startet aus der Ruhe). Wie schnell ist er auf ${q(p.V.hp, 'm')} Höhe?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), H = 150, h2 = H * fval(p.fr);
      groundAt(fig, 0, 0); groundAt(fig, PW, 0);
      ball(fig, 0, -H); height(fig, -34, 0, -H, given('h', formal, p.V.h, 'm'), 0); atRest(fig, R + 8, -H - R + 5);
      ball(fig, PW, -h2); height(fig, PW - 34, 0, -h2, given('hp', formal, p.V.hp, 'm', `${fplain(p.fr)} · ${S('h')}`), PW);
      speed(fig, PW + R + 10, -h2 - 2 * R, [0, 1], wanted('vp'));
      fig.state(0, 34, 0, hl(view, 0)); fig.state(PW, 34, 1, hl(view, 1));
      zeroLine(fig, PW + 60, PW + 62, 0);
      return fig;
    },
    steps(p, formal) {
      const out = [
        step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('Without air resistance, the total energy stays the same', 'Ohne Luftwiderstand bleibt die Gesamtenergie gleich')}, $E_1 = E_2$:</p>${dm(`${pot('h')} = ${pot("h'")} + ${kin("v'")}`)}`, ALL, [0, 1]),
        step(L('Solve', 'Auflösen'), `<p>${L('The mass cancels out; the potential energy lost has become kinetic energy:', 'Die Masse kürzt sich weg; die verlorene Lageenergie ist zu kinetischer Energie geworden:')}</p>` +
          dm("\\tfrac{1}{2}\\,v'^2 = g\\,(h - h') \\;\\Rightarrow\\; v' = \\sqrt{2\\,g\\,(h - h')}"), ALL),
      ];
      if (formal) {
        const d = sub(ONE, p.fr);
        out.push(step(L("Insert h'", "h' einsetzen"), `<p>${L(`With $h' = ${coef(p.fr)}h$, the ball has fallen by $h - h' = ${coef(d)}h$:`, `Mit $h' = ${coef(p.fr)}h$ ist der Ball um $h - h' = ${coef(d)}h$ gefallen:`)}</p>` +
          dm(`v' = \\sqrt{2\\,g\\cdot ${coef(d)}h} = \\htmlClass{result}{${this.tex(p, true)}}`), ALL));
      }
      return out;
    },
    hint: (p, formal) => m$(`${pot('h')} = ${pot("h'")} + ${kin("v'")}`) + (formal ? L(`, with $h' = ${coef(p.fr)}h$.`, `, mit $h' = ${coef(p.fr)}h$.`) : ''),
  };

  // ---------------------------------------------------------------- 3 spring launcher
  const launcher = {
    id: 'launcher', difficulty: 2, spring: true,
    make(r) {
      const ask = pick(r, ['v', 'k']), m = pick(r, [0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2]), s = pick(r, [0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2]);
      if (ask === 'v') {
        const k = pick(r, [50, 80, 100, 150, 200, 250, 300, 400, 500, 600, 800]), v = s * Math.sqrt(k / m);
        return v > 0.4 && v < 15 ? { ask, V: { g: G, m, s, k, v } } : null;
      }
      const v = pick(r, [0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5]), k = (m * v * v) / (s * s);
      return k >= 20 && k <= 3000 ? { ask, V: { g: G, m, s, k, v } } : null;
    },
    vars: (p) => (p.ask === 'v' ? ['k', 'm', 's'] : ['m', 's', 'v']),
    want: (p) => (p.ask === 'v' ? { key: 'v', unit: 'v', what: L('speed', 'Geschwindigkeit') } : { key: 'k', unit: 'k', what: L('spring constant', 'Federkonstante') }),
    f: (p) => (p.ask === 'v' ? (V) => V.s * Math.sqrt(V.k / V.m) : (V) => (V.m * sq(V.v)) / sq(V.s)),
    tex: (p) => (p.ask === 'v' ? 's\\,\\sqrt{\\frac{k}{m}}' : '\\frac{m\\,v^2}{s^2}'),
    insert: (p) => (p.ask === 'v' ? `${tq(p.V.s, 'm')}\\cdot\\sqrt{\\frac{${tq(p.V.k, 'k')}}{${tq(p.V.m, 'kg')}}}` : `\\frac{${tq(p.V.m, 'kg')}\\cdot\\left(${tq(p.V.v, 'v')}\\right)^2}{\\left(${tq(p.V.s, 'm')}\\right)^2}`),
    traps: (p) => (p.ask === 'v'
      ? [{ flag: 'square', f: (V) => Math.sqrt((V.k * V.s) / V.m), tex: '\\sqrt{\\frac{k\\,s}{m}}' },
        { flag: 'root', f: (V) => (V.k * sq(V.s)) / V.m, tex: '\\frac{k\\,s^2}{m}' },
        { flag: 'half', f: (V) => V.s * Math.sqrt(V.k / (2 * V.m)), tex: 's\\,\\sqrt{\\frac{k}{2\\,m}}' },
        { flag: 'half', f: (V) => V.s * Math.sqrt((2 * V.k) / V.m), tex: 's\\,\\sqrt{\\frac{2\\,k}{m}}' }]
      : [{ flag: 'square', f: (V) => (V.m * sq(V.v)) / V.s, tex: '\\frac{m\\,v^2}{s}' },
        { flag: 'square', f: (V) => (V.m * V.v) / V.s, tex: '\\frac{m\\,v}{s}' },
        { flag: 'half', f: (V) => (V.m * sq(V.v)) / (2 * sq(V.s)), tex: '\\frac{m\\,v^2}{2\\,s^2}' },
        { flag: 'half', f: (V) => (2 * V.m * sq(V.v)) / sq(V.s), tex: '\\frac{2\\,m\\,v^2}{s^2}' }]),
    states: (p) => [{ el: 0.5 * p.V.k * sq(p.V.s) }, { kin: 0.5 * p.V.m * sq(p.V.v) }],
    energies: () => [{ el: el('s') }, { kin: kin('v') }],
    efun: () => [{ el: El((V) => V.s) }, { kin: Kin((V) => V.v) }],
    esyms: () => ['m', 'k', 's', 'v'],
    zero: () => L('the floor (the potential energy does not change)', 'der Boden (die Lageenergie ändert sich nicht)'),
    title: () => L('Spring launcher', 'Federkatapult'),
    text: (p, formal) => (p.ask === 'v'
      ? (formal
        ? L('A block of mass $m$ lies on a smooth floor against a spring with spring constant $k$, compressed by $s$. When the spring is released, it pushes the block away. Find the block’s speed $v$ in terms of $k$, $m$ and $s$.',
          'Ein Klotz der Masse $m$ liegt auf einem glatten Boden an einer Feder mit der Federkonstanten $k$, die um $s$ zusammengedrückt ist. Lässt man die Feder los, stösst sie den Klotz weg. Wie schnell ist der Klotz danach? Drücke $v$ durch $k$, $m$ und $s$ aus.')
        : L(`A block of ${q(p.V.m, 'kg')} lies on a smooth floor against a spring with a spring constant of ${q(p.V.k, 'k')}, compressed by ${q(p.V.s, 'm')}. When the spring is released, it pushes the block away. How fast does the block move then?`,
          `Ein Klotz von ${q(p.V.m, 'kg')} liegt auf einem glatten Boden an einer Feder mit der Federkonstanten ${q(p.V.k, 'k')}, die um ${q(p.V.s, 'm')} zusammengedrückt ist. Lässt man die Feder los, stösst sie den Klotz weg. Wie schnell bewegt sich der Klotz danach?`))
      : (formal
        ? L('A spring, compressed by $s$, pushes a block of mass $m$ across a smooth floor. Afterwards the block moves with the speed $v$. Find the spring constant $k$ in terms of $m$, $s$ and $v$.',
          'Eine um $s$ zusammengedrückte Feder stösst einen Klotz der Masse $m$ über einen glatten Boden. Danach bewegt sich der Klotz mit der Geschwindigkeit $v$. Wie gross ist die Federkonstante $k$? Drücke sie durch $m$, $s$ und $v$ aus.')
        : L(`A spring, compressed by ${q(p.V.s, 'm')}, pushes a block of ${q(p.V.m, 'kg')} across a smooth floor. Afterwards the block moves at ${q(p.V.v, 'v')}. What is the spring constant?`,
          `Eine um ${q(p.V.s, 'm')} zusammengedrückte Feder stösst einen Klotz von ${q(p.V.m, 'kg')} über einen glatten Boden. Danach bewegt er sich mit ${q(p.V.v, 'v')}. Wie gross ist die Federkonstante?`))),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), L0 = 96, C = 38, bw = 40, bh = 30, gap = 250;
      const sLab = given('s', formal, p.V.s, 'm'), kLab = p.ask === 'k' ? wanted('k') : given('k', formal, p.V.k, 'k');
      const vLab = p.ask === 'v' ? wanted('v') : given('v', formal, p.V.v, 'v');
      [0, 1].forEach((i) => {
        const x0 = i * gap, len = i === 0 ? L0 - C : L0;
        fig.surface(x0, x0 + 210, 0);
        fig.wall(x0, 0, -60);
        fig.spring([x0, -bh / 2], [x0 + len, -bh / 2], 8, i === 0 ? 5 : 7);
        const bx = i === 0 ? x0 + len : x0 + L0 + 50;
        fig.rect(bx, -bh, bw, bh, 'body');
        if (i === 0) {
          // the compression: from the end of the relaxed spring back to the block
          fig.line(x0 + L0, -bh - 6, x0 + L0, -bh - 28, 'w dash');
          fig.line(bx, -bh - 6, bx, -bh - 28, 'w dash');
          fig.arrow(x0 + L0, -bh - 20, bx, -bh - 20, 'dimarrow');
          fig.text((x0 + L0 + bx) / 2, -bh - 26, sLab, 'lbl');
          fig.text(x0 + 6, -bh / 2 - 16, kLab, 'lbl', 'start');
          atRest(fig, bx + bw + 8, -bh / 2 + 5);
        } else speed(fig, bx + bw + 6, -bh / 2, [1, 0], vLab);
        fig.state(x0 + 105, 34, i, hl(view, i));
      });
      return fig;
    },
    steps: (p) => [
      step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('The elastic energy of the spring becomes kinetic energy:', 'Die Spannenergie der Feder wird zu kinetischer Energie:')}</p>${dm(`${el('s')} = ${kin('v')}`)}`, ALL, [0, 1]),
      step(L('Solve', 'Auflösen'), `<p>${L(`Multiply by 2 and solve for $${p.ask}$:`, `Multipliziere mit 2 und löse nach $${p.ask}$ auf:`)}</p>` + dm(p.ask === 'v' ? 'k\\,s^2 = m\\,v^2 \\;\\Rightarrow\\; v^2 = \\frac{k\\,s^2}{m} \\;\\Rightarrow\\; v = s\\,\\sqrt{\\frac{k}{m}}' : 'k\\,s^2 = m\\,v^2 \\;\\Rightarrow\\; k = \\frac{m\\,v^2}{s^2}'), ALL),
    ],
    hint: () => m$(`${el('s')} = ${kin('v')}`),
  };

  // ---------------------------------------------------------------- 4 pendulum
  const pendulum = {
    id: 'pendulum', difficulty: 2,
    make(r) {
      const ang = pick(r, [90, 60]), l = pick(r, [0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5]);
      const h = ang === 90 ? l : l / 2;
      return { ang, V: { g: G, l, h, v: Math.sqrt(2 * G * h) } };
    },
    vars: () => ['g', 'l'],
    want: () => ({ key: 'v', unit: 'v', what: L('speed at the lowest point', 'Geschwindigkeit im tiefsten Punkt') }),
    f: (p) => (p.ang === 90 ? (V) => Math.sqrt(2 * V.g * V.l) : (V) => Math.sqrt(V.g * V.l)),
    tex: (p) => (p.ang === 90 ? '\\sqrt{2\\,g\\,\\ell}' : '\\sqrt{g\\,\\ell}'),
    insert: (p) => (p.ang === 90 ? `\\sqrt{2\\cdot ${gq()}\\cdot ${tq(p.V.l, 'm')}}` : `\\sqrt{${gq()}\\cdot ${tq(p.V.l, 'm')}}`),
    traps: (p) => (p.ang === 90
      ? [{ flag: 'half', f: (V) => Math.sqrt(V.g * V.l), tex: '\\sqrt{g\\,\\ell}' },
        { flag: 'root', f: (V) => 2 * V.g * V.l, tex: '2\\,g\\,\\ell' },
        { flag: 'fall', f: (V) => 2 * Math.sqrt(V.g * V.l), tex: '2\\sqrt{g\\,\\ell}' },
        { flag: 'half', f: (V) => Math.sqrt((V.g * V.l) / 2), tex: '\\sqrt{\\tfrac{1}{2}\\,g\\,\\ell}' }]
      : [{ flag: 'fall', f: (V) => Math.sqrt(2 * V.g * V.l), tex: '\\sqrt{2\\,g\\,\\ell}' },
        { flag: 'half', f: (V) => Math.sqrt((V.g * V.l) / 2), tex: '\\sqrt{\\tfrac{1}{2}\\,g\\,\\ell}' },
        { flag: 'root', f: (V) => V.g * V.l, tex: 'g\\,\\ell' },
        { flag: 'fall', f: (V) => Math.sqrt(Math.sqrt(3) * V.g * V.l), tex: '\\sqrt{\\sqrt{3}\\,g\\,\\ell}' }]),
    why: {
      fall: (p) => (p.ang === 90
        ? L('From which height to which height does the bob drop? Compare the start with the lowest point.', 'Von welcher Höhe bis zu welcher Höhe sinkt das Pendel? Vergleiche den Start mit dem tiefsten Punkt.')
        : L('The bob does not drop by the whole length ℓ: how far below the pivot does it hang at 60°?', 'Das Pendel sinkt nicht um die ganze Länge ℓ: Wie weit unter der Aufhängung hängt es bei 60°?')),
    },
    states: (p) => [{ pot: G * p.V.h }, { kin: G * p.V.h }],
    energies: () => [{ pot: pot('h') }, { kin: kin('v') }],
    efun: () => [{ pot: Pot((V) => V.h) }, { kin: Kin((V) => V.v) }],
    esyms: () => ['m', 'g', 'h', 'l', 'v'],
    rel: (p) => (V) => ({ ...V, h: V.l * (1 - Math.cos((p.ang * Math.PI) / 180)) }),
    zero: () => L('the lowest point of the bob', 'der tiefste Punkt des Pendelkörpers'),
    title: () => L('Pendulum', 'Pendel'),
    text: (p, formal) => {
      const how = p.ang === 90 ? L('with the string horizontal', 'mit waagrecht gespanntem Faden') : L('with the string at 60° to the vertical', 'mit dem Faden 60° gegen die Senkrechte ausgelenkt');
      return formal
        ? L(`A pendulum with a string of length $\\ell$ is released from rest ${how}. Find the speed $v$ of the bob at the lowest point, in terms of $\\ell$ and $g$.`,
          `Ein Pendel mit der Fadenlänge $\\ell$ wird ${how} aus der Ruhe losgelassen. Wie gross ist die Geschwindigkeit $v$ des Pendelkörpers im tiefsten Punkt? Drücke sie durch $\\ell$ und $g$ aus.`)
        : L(`A pendulum with a string of length ${q(p.V.l, 'm')} is released from rest ${how}. How fast is the bob at the lowest point?`,
          `Ein Pendel mit der Fadenlänge ${q(p.V.l, 'm')} wird ${how} aus der Ruhe losgelassen. Wie schnell ist der Pendelkörper im tiefsten Punkt?`);
    },
    scene(p, formal, view) {
      const fig = new Fig(this.title()), Lp = 140, a = (p.ang * Math.PI) / 180;
      const b1 = [-Lp * Math.sin(a), Lp * Math.cos(a)], b2 = [0, Lp];
      ceilingAt(fig, 0, 0, 80);
      fig.line(0, 0, 0, Lp + R + 6, 'w dash');
      // the path of the bob
      const arc = [];
      for (let k = 0; k <= 24; k++) { const t = -a + (k / 24) * a * 1.6; arc.push([Lp * Math.sin(t), Lp * Math.cos(t)]); }
      fig.path(`M${arc.map((x) => x.map((y) => y.toFixed(1)).join(' ')).join('L')}`, arc, 'w dash');
      fig.line(0, 0, ...b1, 'w rope'); fig.line(0, 0, ...b2, 'w rope dim');
      fig.circle(b1[0], b1[1], R, 'body ball'); fig.circle(b2[0], b2[1], R, 'body ball');
      fig.circle(0, 0, 2.5, 'dot');
      fig.text(b1[0] / 2 - 4, b1[1] / 2 - 8, given('l', formal, p.V.l, 'm'), 'lbl', 'end');
      if (p.ang === 60) fig.text(-14, 40, '60°', 'lbl small', 'end');
      fig.text(b1[0] - R - 4, b1[1] - R - 2, `${S('v')} = 0`, 'lbl', 'end');
      speed(fig, b2[0] + R + 4, b2[1], [1, 0], wanted('v'), 34, [-30, 22]);
      // the height from the lowest point
      zeroLine(fig, -Lp - 40, Lp * 0.75, Lp);
      height(fig, b1[0] - 40, Lp, b1[1], formal ? S('h') : '', b1[0] - R);
      fig.state(b1[0] - 20, b1[1] + R + 16, 0, hl(view, 0));
      fig.state(0, Lp + R + 26, 1, hl(view, 1));
      return fig;
    },
    steps(p) {
      const h = p.ang === 90
        ? `<p>${L('The bob starts at the height of the pivot, so it drops by the length of the string:', 'Der Pendelkörper startet auf der Höhe der Aufhängung, er sinkt also um die Fadenlänge:')} $h = \\ell$.</p>`
        : `<p>${L('At 60°, the bob hangs $\\ell\\cos 60^\\circ = \\tfrac{1}{2}\\ell$ below the pivot; at the lowest point, $\\ell$ below it. So it drops by', 'Bei 60° hängt der Pendelkörper $\\ell\\cos 60^\\circ = \\tfrac{1}{2}\\ell$ unter der Aufhängung, im tiefsten Punkt $\\ell$ darunter. Er sinkt also um')} $h = \\ell - \\tfrac{1}{2}\\ell = \\tfrac{1}{2}\\ell$.</p>`;
      return [
        step(L('Height', 'Höhe'), h, ALL, [0]),
        step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('The string does no work (it pulls at right angles to the motion), so', 'Der Faden verrichtet keine Arbeit (er zieht senkrecht zur Bewegung), also gilt')} $E_1 = E_2$:</p>${dm(`${pot('h')} = ${kin('v')} \\;\\Rightarrow\\; v = \\sqrt{2\\,g\\,h} = ${this.tex(p)}`)}`, ALL, [0, 1]),
      ];
    },
    hint: (p) => m$(`${pot('h')} = ${kin('v')}`) + L(', with ', ', mit ') + m$(p.ang === 90 ? 'h = \\ell' : 'h = \\ell - \\ell\\cos 60^\\circ'),
  };

  // ---------------------------------------------------------------- 5 a track
  // The track of the ramp: a smooth curve (Catmull-Rom spline) through the points ① at x = 0 and
  // ② at x = 260, with a valley between; sc: px per metre.
  function track(p) {
    const top = Math.max(p.V.h1, p.V.h2), sc = 140 / top;
    const y1 = -p.V.h1 * sc, y2 = -p.V.h2 * sc, low = -0.08 * 140;
    const ctrl = [[-60, y1 - 30], [0, y1], [130, low], [260, y2], [330, y2 - 18]];
    const pts = [];
    for (let k = 0; k < ctrl.length - 1; k++) {
      const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
      for (let j = 0; j < 16; j++) {
        const t = j / 16, t2 = t * t, t3 = t2 * t;
        pts.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    pts.push(ctrl[ctrl.length - 1]);
    return { pts, sc, y1, y2 };
  }
  // the direction of a polyline at x
  const tangentAt = (pts, x) => { const k = pts.findIndex((q) => q[0] >= x); const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]; return [b[0] - a[0], b[1] - a[1]]; };
  // the height of a polyline at x (linear between its points)
  const heightAt = (pts, x) => { const k = Math.max(1, pts.findIndex((q) => q[0] >= x)); const a = pts[k - 1], b = pts[k]; return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1); };

  const ramp = {
    id: 'ramp', difficulty: 3,
    make(r) {
      const h1 = pick(r, [2, 2.5, 3, 4, 5, 6, 8]), h2 = pick(r, [0.5, 1, 1.5, 2, 3, 4, 5]), v1 = pick(r, [2, 3, 4, 5, 6, 8]);
      const v2 = Math.sqrt(v1 * v1 + 2 * G * (h1 - h2));
      return h1 !== h2 && v2 > 1.5 && (h2 < h1 || v1 >= 5) && Math.min(h1, h2) >= 0.25 * Math.max(h1, h2) ? { V: { g: G, h1, h2, v1, v2 } } : null;
    },
    vars: () => ['g', 'h1', 'h2', 'v1'],
    want: () => ({ key: 'v2', unit: 'v', what: L('speed', 'Geschwindigkeit') }),
    f: () => (V) => Math.sqrt(sq(V.v1) + 2 * V.g * (V.h1 - V.h2)),
    tex: () => '\\sqrt{v_1^2 + 2\\,g\\,(h_1 - h_2)}',
    insert: (p) => `\\sqrt{\\left(${tq(p.V.v1, 'v')}\\right)^2 + 2\\cdot ${gq()}\\cdot (${tq(p.V.h1, 'm')} - ${tq(p.V.h2, 'm')})}`,
    traps(p) {
      const down = p.V.h1 > p.V.h2;
      return [
        down ? { flag: 'addv', f: (V) => V.v1 + Math.sqrt(2 * V.g * (V.h1 - V.h2)), tex: 'v_1 + \\sqrt{2\\,g\\,(h_1 - h_2)}' }
          : { flag: 'addv', f: (V) => V.v1 - Math.sqrt(2 * V.g * (V.h2 - V.h1)), tex: 'v_1 - \\sqrt{2\\,g\\,(h_2 - h_1)}' },
        down ? { flag: 'start', f: (V) => Math.sqrt(2 * V.g * (V.h1 - V.h2)), tex: '\\sqrt{2\\,g\\,(h_1 - h_2)}' }
          : { flag: 'fall', f: (V) => Math.sqrt(sq(V.v1) + 2 * V.g * (V.h2 - V.h1)), tex: '\\sqrt{v_1^2 + 2\\,g\\,(h_2 - h_1)}' },
        { flag: 'fall', f: (V) => Math.sqrt(sq(V.v1) + 2 * V.g * V.h1), tex: '\\sqrt{v_1^2 + 2\\,g\\,h_1}' },
        { flag: 'root', f: (V) => sq(V.v1) + 2 * V.g * (V.h1 - V.h2), tex: 'v_1^2 + 2\\,g\\,(h_1 - h_2)' },
        { flag: 'half', f: (V) => Math.sqrt(sq(V.v1) + V.g * (V.h1 - V.h2)), tex: '\\sqrt{v_1^2 + g\\,(h_1 - h_2)}' },
      ];
    },
    why: {
      fall: (p) => (p.V.h1 > p.V.h2 ? L('What counts is the height difference h₁ − h₂ between the two points, not the height h₁ above the ground.', 'Entscheidend ist der Höhenunterschied h₁ − h₂ zwischen den beiden Punkten, nicht die Höhe h₁ über dem Boden.')
        : L('The car climbs: it gains potential energy, so it loses kinetic energy.', 'Der Wagen steigt: Er gewinnt Lageenergie, also verliert er kinetische Energie.')),
    },
    states: (p) => [{ pot: G * p.V.h1, kin: 0.5 * sq(p.V.v1) }, { pot: G * p.V.h2, kin: 0.5 * sq(p.V.v2) }],
    energies: () => [{ pot: pot('h_1'), kin: kin('v_1') }, { pot: pot('h_2'), kin: kin('v_2') }],
    efun: () => [{ pot: Pot((V) => V.h1), kin: Kin((V) => V.v1) }, { pot: Pot((V) => V.h2), kin: Kin((V) => V.v2) }],
    esyms: () => ['m', 'g', 'h1', 'h2', 'v1', 'v2'],
    zero: () => L('the ground', 'der Boden'),
    title: () => L('On a track', 'Auf der Bahn'),
    text: (p, formal) => (formal
      ? L('A small car rolls along a track without friction. At the point ①, at a height $h_1$ above the ground, it has a speed $v_1$. Find its speed $v_2$ at the point ②, at a height $h_2$, in terms of $v_1$, $h_1$, $h_2$ and $g$.',
        'Ein kleiner Wagen rollt reibungsfrei auf einer Bahn. Im Punkt ①, auf der Höhe $h_1$ über dem Boden, hat er die Geschwindigkeit $v_1$. Wie gross ist seine Geschwindigkeit $v_2$ im Punkt ② auf der Höhe $h_2$? Drücke sie durch $v_1$, $h_1$, $h_2$ und $g$ aus.')
      : L(`A small car rolls along a track without friction. At the point ①, ${q(p.V.h1, 'm')} above the ground, it has a speed of ${q(p.V.v1, 'v')}. How fast is it at the point ②, ${q(p.V.h2, 'm')} above the ground?`,
        `Ein kleiner Wagen rollt reibungsfrei auf einer Bahn. Im Punkt ①, ${q(p.V.h1, 'm')} über dem Boden, hat er die Geschwindigkeit ${q(p.V.v1, 'v')}. Wie schnell ist er im Punkt ②, ${q(p.V.h2, 'm')} über dem Boden?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), { pts, y1, y2 } = track(p);
      fig.surface(-70, 340, 0);
      fig.path(`M${pts.map((x) => x.map((y) => y.toFixed(1)).join(' ')).join('L')}`, pts, 'track');
      [[0, y1, 'h1', 'v1'], [260, y2, 'h2', 'v2']].forEach(([x, y, hk, vk], i) => {
        const t = tangentAt(pts, x), n = Math.hypot(...t), u = [t[0] / n, t[1] / n], nn = [u[1], -u[0]];
        const c = [x + nn[0] * R, y + nn[1] * R];
        fig.circle(c[0], c[1], R, 'body ball');
        speed(fig, c[0] + u[0] * (R + 4) + nn[0] * 4, c[1] + u[1] * (R + 4) + nn[1] * 4, u, vk === 'v2' ? wanted('v2') : given('v1', formal, p.V.v1, 'v'), 30);
        if (i === 0) height(fig, x - 34, 0, y, given(hk, formal, p.V[hk], 'm'), x);
        else { fig.dim(x + 70, 0, y, given(hk, formal, p.V[hk], 'm'), 1); fig.line(x + 70, y, x + 6, y, 'w dash'); }
        fig.state(x, y - 2 * R - 24, i, hl(view, i));
      });
      return fig;
    },
    steps: () => [
      step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('Without friction', 'Ohne Reibung gilt')} $E_1 = E_2$:</p>${dm(`${pot('h_1')} + ${kin('v_1')} = ${pot('h_2')} + ${kin('v_2')}`)}`, ALL, [0, 1]),
      step(L('Solve', 'Auflösen'), `<p>${L('Divide by $m$ and solve for $v_2^2$:', 'Durch $m$ teilen und nach $v_2^2$ auflösen:')}</p>${dm('v_2^2 = v_1^2 + 2\\,g\\,(h_1 - h_2) \\;\\Rightarrow\\; v_2 = \\sqrt{v_1^2 + 2\\,g\\,(h_1 - h_2)}')}` +
        `<p>${L('Energies add up, not speeds: the speeds are combined as squares.', 'Energien werden addiert, nicht Geschwindigkeiten: Die Geschwindigkeiten kommen im Quadrat vor.')}</p>`, ALL),
    ],
    hint: () => m$(`${pot('h_1')} + ${kin('v_1')} = ${pot('h_2')} + ${kin('v_2')}`),
  };

  // ---------------------------------------------------------------- 6 thrown from a tower
  const DIRS = { up: 45, side: 0, down: -45 };
  const tower = {
    id: 'tower', difficulty: 3,
    make(r) {
      const h = pick(r, [5, 8, 10, 12, 15, 20, 25, 30]), v0 = pick(r, [3, 4, 5, 6, 8, 10, 12]), dir = pick(r, ['up', 'side', 'down']);
      return { dir, V: { g: G, h, v0, v: Math.sqrt(v0 * v0 + 2 * G * h) } };
    },
    vars: () => ['g', 'h', 'v0'],
    want: () => ({ key: 'v', unit: 'v', what: L('speed at the ground', 'Geschwindigkeit am Boden') }),
    f: () => (V) => Math.sqrt(sq(V.v0) + 2 * V.g * V.h),
    tex: () => '\\sqrt{v_0^2 + 2\\,g\\,h}',
    insert: (p) => `\\sqrt{\\left(${tq(p.V.v0, 'v')}\\right)^2 + 2\\cdot ${gq()}\\cdot ${tq(p.V.h, 'm')}}`,
    traps: (p) => [
      { flag: 'addv', f: (V) => V.v0 + Math.sqrt(2 * V.g * V.h), tex: 'v_0 + \\sqrt{2\\,g\\,h}' },
      p.dir === 'up' ? { flag: 'dir', f: (V) => Math.sqrt(2 * V.g * V.h - sq(V.v0)), tex: '\\sqrt{2\\,g\\,h - v_0^2}' }
        : { flag: p.dir === 'side' ? 'dir' : 'start', f: (V) => Math.sqrt(2 * V.g * V.h), tex: '\\sqrt{2\\,g\\,h}' },
      { flag: 'root', f: (V) => sq(V.v0) + 2 * V.g * V.h, tex: 'v_0^2 + 2\\,g\\,h' },
      { flag: 'half', f: (V) => Math.sqrt(sq(V.v0) + V.g * V.h), tex: '\\sqrt{v_0^2 + g\\,h}' },
      ...(p.dir === 'up' ? [{ flag: 'start', f: (V) => Math.sqrt(2 * V.g * V.h), tex: '\\sqrt{2\\,g\\,h}' }] : []),
    ],
    why: {
      dir: (p) => (p.dir === 'side'
        ? L('The horizontal speed counts too: the kinetic energy depends on the whole speed, whatever its direction.', 'Auch die waagrechte Geschwindigkeit zählt: Die kinetische Energie hängt von der ganzen Geschwindigkeit ab, egal in welche Richtung.')
        : L('The direction of the throw does not matter: a ball thrown upwards comes back down past the top of the tower with the same speed v₀.', 'Die Wurfrichtung spielt keine Rolle: Ein nach oben geworfener Ball kommt auf der Höhe des Turms mit derselben Geschwindigkeit v₀ wieder vorbei.')),
    },
    states: (p) => [{ pot: G * p.V.h, kin: 0.5 * sq(p.V.v0) }, { kin: 0.5 * sq(p.V.v) }],
    energies: () => [{ pot: pot('h'), kin: kin('v_0') }, { kin: kin('v') }],
    efun: () => [{ pot: Pot((V) => V.h), kin: Kin((V) => V.v0) }, { kin: Kin((V) => V.v) }],
    esyms: () => ['m', 'g', 'h', 'v0', 'v'],
    zero: () => L('the ground', 'der Boden'),
    title: () => L('Thrown from a tower', 'Vom Turm geworfen'),
    text(p, formal) {
      const how = { up: L('obliquely upwards', 'schräg nach oben'), side: L('horizontally', 'waagrecht'), down: L('obliquely downwards', 'schräg nach unten') }[p.dir];
      return formal
        ? L(`A ball is thrown ${how} from the top of a tower of height $h$, with a speed $v_0$. Find its speed $v$ just before it hits the ground, in terms of $v_0$, $h$ and $g$.`,
          `Ein Ball wird von einem Turm der Höhe $h$ mit der Geschwindigkeit $v_0$ ${how} geworfen. Wie gross ist seine Geschwindigkeit $v$ kurz vor dem Aufprall? Drücke sie durch $v_0$, $h$ und $g$ aus.`)
        : L(`A ball is thrown ${how} from the top of a tower ${q(p.V.h, 'm')} high, with a speed of ${q(p.V.v0, 'v')}. How fast is it just before it hits the ground?`,
          `Ein Ball wird von einem ${q(p.V.h, 'm')} hohen Turm mit ${q(p.V.v0, 'v')} ${how} geworfen. Wie schnell ist er kurz vor dem Aufprall?`);
    },
    scene(p, formal, view) {
      const fig = new Fig(this.title()), H = 140, a = (DIRS[p.dir] * Math.PI) / 180;
      // the path in the tower's scale, with the launch speed drawn so that the picture fits
      const vx = Math.cos(a), vy = Math.sin(a), k = 0.010; // y = vy/vx x − k x² (px)
      const tw = 46, x0 = 0, y0 = -H;
      fig.rect(-tw, -H, tw, H, 'tower');
      fig.surface(-tw - 30, 280, 0);
      const pts = [], yEnd = -R - 18;
      for (let x = 0; x <= 400; x += 2) {
        const y = y0 - (vy / vx) * x * 0.9 + k * x * x;
        pts.push([x0 + x + R, Math.min(y, yEnd)]);
        if (y >= yEnd) break;
      }
      fig.path(`M${pts.map((x) => x.map((y) => y.toFixed(1)).join(' ')).join('L')}`, pts, 'w dash');
      const [land, yl] = pts[pts.length - 1], [xa, ya] = pts[pts.length - 4];
      ball(fig, R, -H);
      speed(fig, R + Math.cos(a) * (R + 2), -H - R - Math.sin(a) * (R + 2), [Math.cos(a), -Math.sin(a)], given('v0', formal, p.V.v0, 'v'));
      fig.circle(land, yl, R, 'body ball');
      // the velocity just before the ground, along the path
      const u = [land - xa, yl - ya], n = Math.hypot(...u);
      speed(fig, land + (R + 2) * u[0] / n, yl + (R + 2) * u[1] / n, u, wanted('v'), 26, [6, -10]);
      height(fig, -tw - 14, 0, -H, given('h', formal, p.V.h, 'm'));
      fig.state(-tw / 2, -H - 14, 0, hl(view, 0));
      fig.state(land - R - 14, yl + 4, 1, hl(view, 1));
      return fig;
    },
    steps: (p) => [
      step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('Without air resistance', 'Ohne Luftwiderstand gilt')} $E_1 = E_2$:</p>${dm(`${pot('h')} + ${kin('v_0')} = ${kin('v')}`)}` +
        `<p>${L('The kinetic energy depends only on the speed, not on its direction: whether the ball is thrown up, sideways or down makes no difference to its speed at the ground.', 'Die kinetische Energie hängt nur vom Betrag der Geschwindigkeit ab, nicht von ihrer Richtung: Ob der Ball nach oben, zur Seite oder nach unten geworfen wird, ändert nichts an seiner Geschwindigkeit am Boden.')}</p>`, ALL, [0, 1]),
      step(L('Solve', 'Auflösen'), `<p>${L('The mass cancels out; multiply by 2 and take the square root:', 'Die Masse kürzt sich weg; multipliziere mit 2 und ziehe die Wurzel:')}</p>` + dm('v^2 = v_0^2 + 2\\,g\\,h \\;\\Rightarrow\\; v = \\sqrt{v_0^2 + 2\\,g\\,h}'), ALL),
    ],
    hint: () => m$(`${pot('h')} + ${kin('v_0')} = ${kin('v')}`) + L(' (the direction of the throw does not matter)', ' (die Wurfrichtung spielt keine Rolle)'),
  };

  // ---------------------------------------------------------------- 7 shot up by a spring
  const springUp = {
    id: 'spring-up', difficulty: 3, spring: true,
    make(r) {
      const k = pick(r, [200, 250, 300, 400, 500, 600, 800, 1000, 1200]), s = pick(r, [0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15]), m = pick(r, [0.02, 0.05, 0.08, 0.1, 0.2, 0.25, 0.5]);
      const h = (k * s * s) / (2 * m * G);
      return h > 0.3 && h < 8 && h > 3 * s ? { V: { g: G, k, s, m, h } } : null;
    },
    vars: () => ['g', 'k', 'm', 's'],
    want: () => ({ key: 'h', unit: 'm', what: L('height', 'Höhe') }),
    f: () => (V) => (V.k * sq(V.s)) / (2 * V.m * V.g),
    tex: () => '\\frac{k\\,s^2}{2\\,m\\,g}',
    insert: (p) => `\\frac{${tq(p.V.k, 'k')}\\cdot\\left(${tq(p.V.s, 'm')}\\right)^2}{2\\cdot ${tq(p.V.m, 'kg')}\\cdot ${gq()}}`,
    traps: () => [
      { flag: 'square', f: (V) => (V.k * V.s) / (2 * V.m * V.g), tex: '\\frac{k\\,s}{2\\,m\\,g}' },
      { flag: 'half', f: (V) => (V.k * sq(V.s)) / (V.m * V.g), tex: '\\frac{k\\,s^2}{m\\,g}' },
      { flag: 'weight', f: (V) => (V.k * sq(V.s)) / (2 * V.m), tex: '\\frac{k\\,s^2}{2\\,m}' },
      { flag: 'fall', f: (V) => (V.k * sq(V.s)) / (2 * V.m * V.g) - V.s, tex: '\\frac{k\\,s^2}{2\\,m\\,g} - s' },
    ],
    why: {
      fall: () => L('The height is measured from where the ball starts, on the compressed spring.', 'Die Höhe wird ab dem Startpunkt gemessen, auf der zusammengedrückten Feder.'),
    },
    states: (p) => [{ el: 0.5 * p.V.k * sq(p.V.s) }, { pot: p.V.m * G * p.V.h }],
    energies: () => [{ el: el('s') }, { pot: pot('h') }],
    efun: () => [{ el: El((V) => V.s) }, { pot: Pot((V) => V.h) }],
    esyms: () => ['m', 'g', 'h', 'k', 's'],
    zero: () => L('where the ball starts, on the compressed spring', 'der Startpunkt des Balls auf der zusammengedrückten Feder'),
    title: () => L('Shot up by a spring', 'Von einer Feder hochgeschossen'),
    text: (p, formal) => (formal
      ? L('A ball of mass $m$ lies on a vertical spring with spring constant $k$, compressed by $s$. When the spring is released, it shoots the ball straight up. How high does the ball rise above its starting point? Express $h$ in terms of $k$, $s$, $m$ and $g$.',
        'Ein Ball der Masse $m$ liegt auf einer senkrechten Feder mit der Federkonstanten $k$, die um $s$ zusammengedrückt ist. Lässt man die Feder los, schiesst sie den Ball senkrecht nach oben. Wie hoch steigt der Ball über seinen Startpunkt? Drücke $h$ durch $k$, $s$, $m$ und $g$ aus.')
      : L(`A ball of ${q(p.V.m, 'kg')} lies on a vertical spring with a spring constant of ${q(p.V.k, 'k')}, compressed by ${q(p.V.s, 'm')}. When the spring is released, it shoots the ball straight up. How high does the ball rise above its starting point?`,
        `Ein Ball von ${q(p.V.m, 'kg')} liegt auf einer senkrechten Feder mit der Federkonstanten ${q(p.V.k, 'k')}, die um ${q(p.V.s, 'm')} zusammengedrückt ist. Lässt man die Feder los, schiesst sie den Ball senkrecht nach oben. Wie hoch steigt der Ball über seinen Startpunkt?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), L0 = 70, C = 30, H = 150, y0 = -(L0 - C);
      [0, 1].forEach((i) => {
        const cx = i * PW;
        groundAt(fig, cx, 0, 90);
        const top = i === 0 ? -(L0 - C) : -L0;
        fig.spring([cx, 0], [cx, top], 9, 7);
        fig.line(cx - 16, top, cx + 16, top, 'w plate');
        if (i === 0) {
          ball(fig, cx, top);
          atRest(fig, cx + R + 8, top - R + 5);
          // the compression, against the length of the relaxed spring
          fig.line(cx - 40, -L0, cx - 18, -L0, 'w dash');
          fig.dim(cx - 34, -L0, top, given('s', formal, p.V.s, 'm'));
          fig.text(cx + 16, -10, given('k', formal, p.V.k, 'k'), 'lbl', 'start');
        } else {
          ball(fig, cx, y0 - H);
          atRest(fig, cx + R + 8, y0 - H - R + 5);
          height(fig, cx - 34, y0, y0 - H, wanted('h'), cx);
        }
        fig.state(cx, 34, i, hl(view, i));
      });
      zeroLine(fig, -40, PW + 50, y0);
      return fig;
    },
    steps: () => [
      step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('The elastic energy of the spring becomes potential energy; at the top the speed of the ball is zero:', 'Die Spannenergie der Feder wird zu Lageenergie; im höchsten Punkt ist die Geschwindigkeit des Balls null:')}</p>${dm(`${el('s')} = ${pot('h')}`)}`, ALL, [0, 1]),
      step(L('Solve', 'Auflösen'), `<p>${L('Divide both sides by $m\\,g$ to get the height:', 'Teile beide Seiten durch $m\\,g$, um die Höhe zu erhalten:')}</p>` + dm('h = \\frac{k\\,s^2}{2\\,m\\,g}'), ALL),
    ],
    hint: () => m$(`${el('s')} = ${pot('h')}`),
  };

  // ---------------------------------------------------------------- 8 a fraction of the final speed (worksheet B)
  const FR_SPEED = [frac(1, 3), frac(2, 3), frac(1, 4), frac(3, 4)];
  const speedFrac = {
    id: 'speed-fraction', difficulty: 4,
    make(r) {
      const fr = pick(r, FR_SPEED), h = pick(r, [1.8, 2.7, 3.6, 4.5, 7.2, 9, 12, 16]), v0 = Math.sqrt(2 * G * h);
      return { fr, V: { g: G, h, v0, vp: fval(fr) * v0, hp: (1 - sq(fval(fr))) * h } };
    },
    vars: () => ['h'],
    want: () => ({ key: 'hp', unit: 'm', what: L('height', 'Höhe') }),
    f: (p) => (V) => (1 - sq(fval(p.fr))) * V.h,
    tex: (p) => `${coef(sub(ONE, mul(p.fr, p.fr)))}h`,
    insert: (p) => `${coef(sub(ONE, mul(p.fr, p.fr)))}\\cdot ${tq(p.V.h, 'm')}`,
    traps: (p) => [
      { flag: 'square', f: (V) => (1 - fval(p.fr)) * V.h, tex: `${coef(sub(ONE, p.fr))}h` },
      { flag: 'fall', f: (V) => sq(fval(p.fr)) * V.h, tex: `${coef(mul(p.fr, p.fr))}h` },
      { flag: 'square', f: (V) => fval(p.fr) * V.h, tex: `${coef(p.fr)}h` },
    ],
    why: {
      square: (p) => L(`The kinetic energy grows with the square of the speed: what fraction of the final kinetic energy does the ball have at ${fwords(p.fr)} of the final speed?`,
        `Die kinetische Energie wächst mit dem Quadrat der Geschwindigkeit: Welchen Bruchteil der kinetischen Endenergie hat der Ball bei ${fwords(p.fr)} der Endgeschwindigkeit?`),
      fall: () => L("That is the height the ball has fallen, h − h', not its height h' above the ground.", "Das ist die Strecke, um die der Ball gefallen ist, h − h', nicht seine Höhe h' über dem Boden."),
    },
    states: (p) => [{ pot: G * p.V.h }, { pot: G * p.V.hp, kin: 0.5 * sq(p.V.vp) }, { kin: G * p.V.h }],
    energies: () => [{ pot: pot('h') }, { pot: pot("h'"), kin: kin("v'") }, { kin: kin('v_0') }],
    efun: () => [{ pot: Pot((V) => V.h) }, { pot: Pot((V) => V.hp), kin: Kin((V) => V.vp) }, { kin: Kin((V) => V.v0) }],
    esyms: () => ['m', 'g', 'h', 'hp', 'vp', 'v0'],
    slips: () => fallen(1, 'h', "h'"),
    rel: (p) => (V) => ({ ...V, vp: fval(p.fr) * V.v0 }),
    zero: () => L('the ground', 'der Boden'),
    title: () => L('A fraction of the final speed', 'Ein Bruchteil der Endgeschwindigkeit'),
    text: (p, formal) => (formal
      ? L(`A ball is dropped from a height $h$ (it starts at rest) and hits the ground with the speed $v_0$. At what height $h'$ is its speed ${fwords(p.fr)} of that, $v' = ${coef(p.fr)}v_0$? Express $h'$ in terms of $h$.`,
        `Ein Ball wird aus der Höhe $h$ fallen gelassen (er startet aus der Ruhe) und trifft mit der Geschwindigkeit $v_0$ auf dem Boden auf. Auf welcher Höhe $h'$ hat er ${fwords(p.fr)} dieser Geschwindigkeit, $v' = ${coef(p.fr)}v_0$? Drücke $h'$ durch $h$ aus.`)
      : L(`A ball is dropped from a height of ${q(p.V.h, 'm')} (it starts at rest). At what height is its speed ${fwords(p.fr)} of the speed with which it hits the ground?`,
        `Ein Ball wird aus ${q(p.V.h, 'm')} Höhe fallen gelassen (er startet aus der Ruhe). Auf welcher Höhe hat er ${fwords(p.fr)} der Geschwindigkeit, mit der er auf dem Boden auftrifft?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), H = 150, h2 = H * (1 - sq(fval(p.fr)));
      [0, 1, 2].forEach((i) => groundAt(fig, i * PW, 0, 110));
      ball(fig, 0, -H); height(fig, -34, 0, -H, given('h', formal, p.V.h, 'm'), 0); atRest(fig, R + 8, -H - R + 5);
      ball(fig, PW, -h2); height(fig, PW - 34, 0, -h2, wanted('hp'), PW);
      speed(fig, PW + R + 10, -h2 - 2 * R, [0, 1], `${S('vp')} = ${fplain(p.fr)} · ${S('v0')}`);
      ball(fig, 2 * PW, 0); speed(fig, 2 * PW + R + 10, -2 * R - 22, [0, 1], S('v0'), 28);
      [0, 1, 2].forEach((i) => fig.state(i * PW, 34, i, hl(view, i)));
      zeroLine(fig, 2 * PW + 55, 2 * PW + 57, 0);
      return fig;
    },
    steps(p) {
      const f2 = mul(p.fr, p.fr), d = sub(ONE, f2);
      return [
        step(L('Energy conservation ①③', 'Energieerhaltung ①③'), `<p>${L('The final speed follows from', 'Die Endgeschwindigkeit folgt aus')} $E_1 = E_3$:</p>${dm(`${pot('h')} = ${kin('v_0')} \\;\\Rightarrow\\; v_0^2 = 2\\,g\\,h`)}`, ALL, [0, 2]),
        step(L('Energy conservation ②③', 'Energieerhaltung ②③'), `<p>$E_2 = E_3$, ${L('with', 'mit')} $v' = ${coef(p.fr)}v_0$:</p>` +
          dm(`${pot("h'")} + \\tfrac{1}{2}\\,m\\,\\left(${coef(p.fr)}v_0\\right)^2 = ${kin('v_0')}`) +
          `<p>${L('Divide by $m$:', 'Durch $m$ teilen:')}</p>${dm(`g\\,h' = \\tfrac{1}{2}\\,v_0^2\\left(1 - ${coef(f2) || '1'}\\right) = ${coef(d)}\\cdot\\tfrac{1}{2}\\,v_0^2`)}`, ALL, [1, 2]),
        step(L('Combine', 'Kombinieren'), `<p>${L('Insert', 'Einsetzen von')} $\\tfrac{1}{2}\\,v_0^2 = g\\,h$:</p>${dm(`g\\,h' = ${coef(d)}g\\,h \\;\\Rightarrow\\; h' = \\htmlClass{result}{${coef(d)}h}`)}` +
          `<p>${L(`At ${fwords(p.fr)} of the final speed, the ball has only (${fplain(p.fr)})² = ${fplain(f2)} of the final kinetic energy: it has fallen only ${fplain(f2)} of the way.`, `Bei ${fwords(p.fr)} der Endgeschwindigkeit hat der Ball erst (${fplain(p.fr)})² = ${fplain(f2)} der kinetischen Endenergie: Er ist erst ${fplain(f2)} des Wegs gefallen.`)}</p>`, ALL),
      ];
    },
    hint: (p) => m$(`${pot("h'")} + \\tfrac{1}{2}\\,m\\,\\left(${coef(p.fr)}v_0\\right)^2 = ${kin('v_0')}`) + L(', with ', ', mit ') + m$('\\tfrac{1}{2}\\,m\\,v_0^2 = m\\,g\\,h'),
  };

  // ---------------------------------------------------------------- 9 a block on a hanging spring (worksheet C)
  const FR_HANG = [frac(1, 2), frac(1, 4), frac(3, 4), frac(1, 3), frac(2, 3)];
  const hang = {
    id: 'spring-hang', difficulty: 5, spring: true,
    make(r) {
      const ask = pick(r, ['v', 'v', 'k']), fr = pick(r, FR_HANG), s = pick(r, [0.2, 0.3, 0.4, 0.5, 0.6, 0.8]), m = pick(r, [0.2, 0.5, 1, 1.5, 2]);
      const k = (2 * m * G) / s, x = fval(fr) * s;
      return { ask, fr, V: { g: G, s, m, k, vp: Math.sqrt(2 * G * fval(fr) * (1 - fval(fr)) * s), x } };
    },
    vars: (p) => (p.ask === 'v' ? ['g', 's'] : ['g', 'm', 's']),
    want: (p) => (p.ask === 'v' ? { key: 'vp', unit: 'v', what: L('speed', 'Geschwindigkeit') } : { key: 'k', unit: 'k', what: L('spring constant', 'Federkonstante') }),
    f: (p) => (p.ask === 'v' ? (V) => Math.sqrt(2 * fval(p.fr) * (1 - fval(p.fr)) * V.g * V.s) : (V) => (2 * V.m * V.g) / V.s),
    tex: (p) => (p.ask === 'v' ? rootOf(mul([2, 1], mul(p.fr, sub(ONE, p.fr))), 'g\\,s') : '\\frac{2\\,m\\,g}{s}'),
    insert: (p) => (p.ask === 'v' ? `\\sqrt{${coef(mul([2, 1], mul(p.fr, sub(ONE, p.fr)))) || '1\\cdot '}${gq()}\\cdot ${tq(p.V.s, 'm')}}` : `\\frac{2\\cdot ${tq(p.V.m, 'kg')}\\cdot ${gq()}}{${tq(p.V.s, 'm')}}`),
    traps(p) {
      const fr = p.fr, c = mul([2, 1], mul(fr, sub(ONE, fr)));
      return p.ask === 'v'
        ? [{ flag: 'spring', f: (V) => Math.sqrt(2 * fval(fr) * V.g * V.s), tex: rootOf(mul([2, 1], fr), 'g\\,s') },
          { flag: 'half', f: (V) => Math.sqrt(fval(fr) * (1 - fval(fr)) * V.g * V.s), tex: rootOf(mul(fr, sub(ONE, fr)), 'g\\,s') },
          { flag: 'root', f: (V) => fval(c) * V.g * V.s, tex: `${coef(c)}g\\,s` },
          { flag: 'fall', f: (V) => Math.sqrt(2 * (1 - fval(fr)) * V.g * V.s), tex: rootOf(mul([2, 1], sub(ONE, fr)), 'g\\,s') }]
        : [{ flag: 'equil', f: (V) => (V.m * V.g) / V.s, tex: '\\frac{m\\,g}{s}' },
          { flag: 'square', f: (V) => (2 * V.m * V.g) / sq(V.s), tex: '\\frac{2\\,m\\,g}{s^2}' },
          { flag: 'half', f: (V) => (4 * V.m * V.g) / V.s, tex: '\\frac{4\\,m\\,g}{s}' },
          { flag: 'weight', f: (V) => (2 * V.m) / V.s, tex: '\\frac{2\\,m}{s}' }];
    },
    why: {
      fall: () => L("The block has dropped by the distance shown in ②, not by the rest of the way down to the lowest point.", 'Der Klotz ist um die in ② eingezeichnete Strecke gesunken, nicht um den Rest des Wegs bis zum tiefsten Punkt.'),
    },
    states(p) {
      const { m, s, k } = p.V, x = fval(p.fr) * s;
      const all = [{ pot: m * G * s }, { pot: m * G * (s - x), kin: 0.5 * m * sq(p.V.vp), el: 0.5 * k * x * x }, { el: 0.5 * k * s * s }];
      return p.ask === 'v' ? all : [all[0], all[2]];
    },
    energies(p) {
      const d = sub(ONE, p.fr), xs = `\\left(${coef(p.fr)}s\\right)`;
      const all = [{ pot: pot('s') }, { pot: pot(`${coef(d)}s`), kin: kin("v'"), el: el(xs) }, { el: el('s') }];
      return p.ask === 'v' ? all : [all[0], all[2]];
    },
    efun(p) {
      const f = fval(p.fr);
      const all = [{ pot: Pot((V) => V.s) }, { pot: Pot((V) => (1 - f) * V.s), kin: Kin((V) => V.vp), el: El((V) => f * V.s) }, { el: El((V) => V.s) }];
      return p.ask === 'v' ? all : [all[0], all[2]];
    },
    esyms: (p) => (p.ask === 'v' ? ['m', 'g', 's', 'k', 'vp'] : ['m', 'g', 's', 'k']),
    slips: (p) => (p.ask === 'v' ? [{ i: 1, k: 'pot', tex: pot(`${coef(p.fr)}s`),
      why: () => L(`The block has dropped by $${coef(p.fr)}s$; its height above the zero level, the lowest point, is the rest, $${coef(sub(ONE, p.fr))}s$.`, `Der Klotz ist um $${coef(p.fr)}s$ gesunken; seine Höhe über dem Nullniveau, dem tiefsten Punkt, ist der Rest, $${coef(sub(ONE, p.fr))}s$.`) }] : []),
    zero: () => L('the lowest point of the block', 'der tiefste Punkt des Klotzes'),
    title: () => L('A block on a spring', 'Ein Klotz an der Feder'),
    text(p, formal) {
      if (p.ask === 'k') return formal
        ? L('A block of mass $m$ hangs on a relaxed spring and is released from rest. It drops by $s$ to its lowest point, where its speed is zero and it turns round. Find the spring constant $k$ in terms of $m$, $s$ and $g$.',
          'Ein Klotz der Masse $m$ hängt an einer entspannten Feder und wird aus der Ruhe losgelassen. Er sinkt um $s$ bis zum tiefsten Punkt, wo seine Geschwindigkeit null ist und er umkehrt. Wie gross ist die Federkonstante $k$? Drücke sie durch $m$, $s$ und $g$ aus.')
        : L(`A block of ${q(p.V.m, 'kg')} hangs on a relaxed spring and is released from rest. It drops by ${q(p.V.s, 'm')} to its lowest point, where its speed is zero and it turns round. What is the spring constant?`,
          `Ein Klotz von ${q(p.V.m, 'kg')} hängt an einer entspannten Feder und wird aus der Ruhe losgelassen. Er sinkt um ${q(p.V.s, 'm')} bis zum tiefsten Punkt, wo seine Geschwindigkeit null ist und er umkehrt. Wie gross ist die Federkonstante?`);
      return formal
        ? L(`A block hangs on a relaxed spring and is released from rest. It drops by $s$ to its lowest point, where its speed is zero and it turns round. How fast is it when it has dropped by ${fwords(p.fr)} of that distance? Express its speed $v'$ in terms of $s$ and $g$.`,
          `Ein Klotz hängt an einer entspannten Feder und wird aus der Ruhe losgelassen. Er sinkt um $s$ bis zum tiefsten Punkt, wo seine Geschwindigkeit null ist und er umkehrt. Wie schnell ist er, wenn er um ${fwords(p.fr)} dieser Strecke gesunken ist? Drücke seine Geschwindigkeit $v'$ durch $s$ und $g$ aus.`)
        : L(`A block hangs on a relaxed spring and is released from rest. It drops by ${q(p.V.s, 'm')} to its lowest point, where its speed is zero and it turns round. How fast is it when it has dropped by ${q(p.V.x, 'm')}?`,
          `Ein Klotz hängt an einer entspannten Feder und wird aus der Ruhe losgelassen. Er sinkt um ${q(p.V.s, 'm')} bis zum tiefsten Punkt, wo seine Geschwindigkeit null ist und er umkehrt. Wie schnell ist er, wenn er um ${q(p.V.x, 'm')} gesunken ist?`);
    },
    scene(p, formal, view) {
      const fig = new Fig(this.title()), L0 = 80, S0 = 110, bw = 28, bh = 30, x = fval(p.fr) * S0;
      const drops = p.ask === 'v' ? [0, x, S0] : [0, S0];
      const yStart = L0 + bh; // the bottom of the block at the start
      drops.forEach((d, i) => {
        const cx = i * PW;
        ceilingAt(fig, cx, 0, 90);
        fig.spring([cx, 0], [cx, L0 + d], 8, 9);
        fig.rect(cx - bw / 2, L0 + d, bw, bh, 'body');
        const last = i === drops.length - 1;
        if (i === 0 || last) atRest(fig, cx + bw / 2 + 6, L0 + d + bh / 2 + 5);
        if (i > 0) {
          const lbl = last ? given('s', formal, p.V.s, 'm') : formal ? `${fplain(p.fr)} · ${S('s')}` : q(p.V.x, 'm');
          fig.dim(cx - bw / 2 - 16, yStart, yStart + d, lbl);
          fig.line(cx - bw / 2 - 16, yStart + d, cx - bw / 2, yStart + d, 'w dash');
        }
        if (i > 0 && !last) speed(fig, cx + bw / 2 + 8, L0 + d + 2, [0, 1], wanted('vp'));
        fig.state(cx, -22, i, hl(view, i));
      });
      if (p.ask === 'k') fig.text(PW + bw / 2 + 8, L0 + S0 - 22, wanted('k'), 'lbl', 'start');
      // the starting level, and the zero level at the lowest point
      fig.line(bw / 2, yStart, (drops.length - 1) * PW - bw / 2 - 16, yStart, 'w dash');
      zeroLine(fig, -50, (drops.length - 1) * PW + 50, yStart + S0);
      return fig;
    },
    steps(p, formal) {
      const d = sub(ONE, p.fr), xs = `\\left(${coef(p.fr)}s\\right)`;
      const k = step(L('Energy conservation ①' + (p.ask === 'v' ? '③' : '②'), 'Energieerhaltung ①' + (p.ask === 'v' ? '③' : '②')),
        `<p>${L('At the lowest point the block is at rest: all the potential energy has gone into the spring.', 'Im tiefsten Punkt ruht der Klotz: Die ganze Lageenergie steckt jetzt in der Feder.')}</p>` +
        dm(`${pot('s')} = ${el('s')} \\;\\Rightarrow\\; k = ${p.ask === 'k' && formal ? '\\htmlClass{result}{\\frac{2\\,m\\,g}{s}}' : '\\frac{2\\,m\\,g}{s}'}`) +
        `<p>${L('The lowest point is not where the block would hang at rest: there the spring force is twice the weight.', 'Der tiefste Punkt ist nicht die Ruhelage: Dort ist die Federkraft doppelt so gross wie die Gewichtskraft.')}</p>`,
        ALL, p.ask === 'v' ? [0, 2] : [0, 1]);
      if (p.ask === 'k') return [k];
      const fx = coef(p.fr), c = mul([2, 1], mul(p.fr, d));
      return [k,
        step(L('Energy conservation ①②', 'Energieerhaltung ①②'), `<p>$E_1 = E_2$: ${L(`in ②, the block is ${fx}$s$ lower; the spring is stretched by ${fx}$s$.`, `In ② ist der Klotz ${fx}$s$ tiefer; die Feder ist um ${fx}$s$ gedehnt.`)}</p>` +
          dm(`${pot('s')} = ${pot(`${coef(d)}s`)} + ${kin("v'")} + ${el(xs)}`), ALL, [0, 1]),
        step(L('Solve', 'Auflösen'), `<p>${L('Insert $k = \\frac{2\\,m\\,g}{s}$ and divide by $m$:', 'Setze $k = \\frac{2\\,m\\,g}{s}$ ein und teile durch $m$:')}</p>` +
          dm(`\\tfrac{1}{2}\\,v'^2 = g\\,s - ${coef(d)}g\\,s - \\frac{g}{s}\\,${coef(mul(p.fr, p.fr))}s^2 = ${coef(mul(p.fr, d))}g\\,s`) +
          dm(`v' = \\htmlClass{result}{${rootOf(c, 'g\\,s')}}`), ALL),
      ];
    },
    hint: (p) => (p.ask === 'k' ? m$(`${pot('s')} = ${el('s')}`)
      : m$(`${pot('s')} = ${el('s')}`) + L(' gives k; then ', ' ergibt k; dann ') + m$(`E_1 = E_2`) + L(' with all three forms of energy in ②.', ' mit allen drei Energieformen in ②.')),
  };

  // ---------------------------------------------------------------- 10 a ball dropped onto a spring
  const dropSpring = {
    id: 'drop-spring', difficulty: 4, spring: true,
    make(r) {
      const m = pick(r, [0.1, 0.2, 0.25, 0.5, 1, 2]), h = pick(r, [0.2, 0.3, 0.4, 0.5, 0.8, 1, 1.2, 1.5]), s = pick(r, [0.02, 0.04, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2]);
      const k = (2 * m * G * (h + s)) / (s * s);
      return k >= 100 && k <= 50000 && s < h ? { V: { g: G, m, h, s, k, v: Math.sqrt(2 * G * h) } } : null;
    },
    vars: () => ['g', 'h', 'm', 's'],
    want: () => ({ key: 'k', unit: 'k', what: L('spring constant', 'Federkonstante') }),
    f: () => (V) => (2 * V.m * V.g * (V.h + V.s)) / sq(V.s),
    tex: () => '\\frac{2\\,m\\,g\\,(h + s)}{s^2}',
    insert: (p) => `\\frac{2\\cdot ${tq(p.V.m, 'kg')}\\cdot ${gq()}\\cdot (${tq(p.V.h, 'm')} + ${tq(p.V.s, 'm')})}{\\left(${tq(p.V.s, 'm')}\\right)^2}`,
    traps: () => [
      { flag: 'extra', f: (V) => (2 * V.m * V.g * V.h) / sq(V.s), tex: '\\frac{2\\,m\\,g\\,h}{s^2}' },
      { flag: 'half', f: (V) => (V.m * V.g * (V.h + V.s)) / sq(V.s), tex: '\\frac{m\\,g\\,(h + s)}{s^2}' },
      { flag: 'square', f: (V) => (2 * V.m * V.g * (V.h + V.s)) / V.s, tex: '\\frac{2\\,m\\,g\\,(h + s)}{s}' },
      { flag: 'equil', f: (V) => (V.m * V.g) / V.s, tex: '\\frac{m\\,g}{s}' },
    ],
    states: (p) => { const { m, h, s, k } = p.V; return [{ pot: m * G * (h + s) }, { pot: m * G * s, kin: m * G * h }, { el: 0.5 * k * s * s }]; },
    energies: () => [{ pot: pot('(h + s)') }, { pot: pot('s'), kin: kin('v') }, { el: el('s') }],
    efun: () => [{ pot: Pot((V) => V.h + V.s) }, { pot: Pot((V) => V.s), kin: Kin((V) => V.v) }, { el: El((V) => V.s) }],
    esyms: () => ['m', 'g', 'h', 's', 'v', 'k'],
    slips: () => above(0, 'h', 'h + s'),
    zero: () => L('the lowest point of the ball', 'der tiefste Punkt des Balls'),
    title: () => L('Dropped onto a spring', 'Auf eine Feder fallen gelassen'),
    text: (p, formal) => (formal
      ? L('A ball of mass $m$ is dropped from rest from a height $h$ above the top of a vertical spring. It lands on the spring and compresses it by $s$, until its speed is zero. Find the spring constant $k$ in terms of $m$, $h$, $s$ and $g$.',
        'Ein Ball der Masse $m$ wird aus der Höhe $h$ über dem oberen Ende einer senkrechten Feder aus der Ruhe fallen gelassen. Er landet auf der Feder und drückt sie um $s$ zusammen, bis seine Geschwindigkeit null ist. Wie gross ist die Federkonstante $k$? Drücke sie durch $m$, $h$, $s$ und $g$ aus.')
      : L(`A ball of ${q(p.V.m, 'kg')} is dropped from rest from ${q(p.V.h, 'm')} above the top of a vertical spring. It lands on the spring and compresses it by ${q(p.V.s, 'm')} , until its speed is zero. What is the spring constant?`,
        `Ein Ball von ${q(p.V.m, 'kg')} wird aus ${q(p.V.h, 'm')} über dem oberen Ende einer senkrechten Feder aus der Ruhe fallen gelassen. Er landet auf der Feder und drückt sie um ${q(p.V.s, 'm')} zusammen, bis seine Geschwindigkeit null ist. Wie gross ist die Federkonstante?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), L0 = 70, C = 30, H = 100;
      [0, 1, 2].forEach((i) => {
        const cx = i * PW, top = i === 2 ? -(L0 - C) : -L0;
        groundAt(fig, cx, 0, 90);
        fig.spring([cx, 0], [cx, top], 9, 7);
        fig.line(cx - 16, top, cx + 16, top, 'w plate');
        if (i === 0) {
          ball(fig, cx, -L0 - H);
          atRest(fig, cx + R + 8, -L0 - H - R + 5);
          fig.line(cx - 40, -L0, cx - 18, -L0, 'w dash');
          fig.dim(cx - 34, -L0, -L0 - H, given('h', formal, p.V.h, 'm'));
          fig.line(cx - 34, -L0 - H, cx - R, -L0 - H, 'w dash');
        } else if (i === 1) {
          ball(fig, cx, -L0);
          speed(fig, cx + R + 10, -L0 - 2 * R, [0, 1], S('v'));
        } else {
          ball(fig, cx, top);
          atRest(fig, cx + R + 8, top - R + 5);
          fig.line(cx - 40, -L0, cx - 18, -L0, 'w dash');
          fig.dim(cx - 34, -L0, top, given('s', formal, p.V.s, 'm'), -1);
          fig.text(cx + 16, -10, wanted('k'), 'lbl', 'start');
        }
        fig.state(cx, 34, i, hl(view, i));
      });
      zeroLine(fig, -40, 2 * PW + 80, -(L0 - C));
      return fig;
    },
    steps: () => [
      step(L('Energy conservation ①③', 'Energieerhaltung ①③'), `<p>${L('From the start to the lowest point, the ball drops by $h + s$: by $h$ until it touches the spring (②), then by $s$ while it compresses it. At both ends it is at rest:', 'Vom Start bis zum tiefsten Punkt sinkt der Ball um $h + s$: um $h$, bis er die Feder berührt (②), dann um $s$, während er sie zusammendrückt. An beiden Enden ruht er:')}</p>` +
        dm(`${pot('(h + s)')} = ${el('s')}`), ALL, [0, 2]),
      step(L('Solve', 'Auflösen'), `<p>${L('Multiply by 2 and divide by $s^2$:', 'Multipliziere mit 2 und teile durch $s^2$:')}</p>` + dm('k = \\frac{2\\,m\\,g\\,(h + s)}{s^2}'), ALL),
    ],
    hint: () => m$(`${pot('(h + s)')} = ${el('s')}`),
  };

  // ---------------------------------------------------------------- 11 down an inclined plane
  // The slope from A (top left) down to B (bottom right); the block slides from u = 0.1 to 0.9.
  function slope(ang) {
    const Hs = 120, W = Hs / Math.tan((ang * Math.PI) / 180), len = Math.hypot(W, Hs);
    const d = [W / len, Hs / len], n = [Hs / len, -W / len];
    const at = (u) => [u * W, -Hs + u * Hs];
    return { Hs, W, d, n, at, u1: 0.1, u2: 0.9 };
  }
  // a square block standing on the slope with the middle of its base at P
  const slopeBlock = (fig, sl, P, cls = 'body', a = 26) => {
    const c = [[-a / 2, 0], [a / 2, 0], [a / 2, a], [-a / 2, a]].map(([x, y]) => [P[0] + x * sl.d[0] + y * sl.n[0], P[1] + x * sl.d[1] + y * sl.n[1]]);
    fig.path(`M${c.map((q) => q.map((y) => y.toFixed(1)).join(' ')).join('L')}Z`, c, cls);
  };
  const incline = {
    id: 'incline', difficulty: 2,
    make(r) {
      const ask = pick(r, ['s', 'h']);
      if (ask === 's') { const s = pick(r, [1, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8, 10]); return { ask, ang: 30, V: { g: G, s, h: s / 2, v: Math.sqrt(G * s) } }; }
      const h = pick(r, [0.8, 1.2, 1.8, 2, 2.5, 3.2, 4.5, 5]);
      return { ask, ang: pick(r, [20, 25, 35, 40, 50]), V: { g: G, h, v: Math.sqrt(2 * G * h) } };
    },
    vars: (p) => (p.ask === 's' ? ['g', 's'] : ['g', 'h']),
    want: () => ({ key: 'v', unit: 'v', what: L('speed', 'Geschwindigkeit') }),
    f: (p) => (p.ask === 's' ? (V) => Math.sqrt(V.g * V.s) : (V) => Math.sqrt(2 * V.g * V.h)),
    tex: (p) => (p.ask === 's' ? '\\sqrt{g\\,s}' : '\\sqrt{2\\,g\\,h}'),
    insert: (p) => (p.ask === 's' ? `\\sqrt{${gq()}\\cdot ${tq(p.V.s, 'm')}}` : `\\sqrt{2\\cdot ${gq()}\\cdot ${tq(p.V.h, 'm')}}`),
    traps(p) {
      if (p.ask === 's') return [
        { flag: 'fall', f: (V) => Math.sqrt(2 * V.g * V.s), tex: '\\sqrt{2\\,g\\,s}' },
        { flag: 'fall', f: (V) => Math.sqrt(Math.sqrt(3) * V.g * V.s), tex: '\\sqrt{\\sqrt{3}\\,g\\,s}' },
        { flag: 'root', f: (V) => V.g * V.s, tex: 'g\\,s' },
        { flag: 'half', f: (V) => Math.sqrt((V.g * V.s) / 2), tex: '\\sqrt{\\tfrac{1}{2}\\,g\\,s}' },
      ];
      const sa = Math.sin((p.ang * Math.PI) / 180);
      return [
        { flag: 'angle', f: (V) => Math.sqrt(2 * V.g * V.h * sa), tex: '\\sqrt{2\\,g\\,h\\,\\sin\\alpha}' },
        { flag: 'angle', f: (V) => Math.sqrt((2 * V.g * V.h) / sa), tex: '\\sqrt{\\frac{2\\,g\\,h}{\\sin\\alpha}}' },
        { flag: 'half', f: (V) => Math.sqrt(V.g * V.h), tex: '\\sqrt{g\\,h}' },
        { flag: 'root', f: (V) => 2 * V.g * V.h, tex: '2\\,g\\,h' },
      ];
    },
    why: {
      fall: () => L('The block does not drop by s: by how much does it drop on a 30° slope, measured vertically?', 'Der Klotz sinkt nicht um s: Um wie viel sinkt er auf einer 30°-Ebene, senkrecht gemessen?'),
    },
    states: (p) => [{ pot: G * p.V.h }, { kin: G * p.V.h }],
    energies: () => [{ pot: pot('h') }, { kin: kin('v') }],
    efun: () => [{ pot: Pot((V) => V.h) }, { kin: Kin((V) => V.v) }],
    esyms: (p) => (p.ask === 's' ? ['m', 'g', 'h', 's', 'v'] : ['m', 'g', 'h', 'v']),
    rel: (p) => (p.ask === 's' ? (V) => ({ ...V, h: V.s / 2 }) : (V) => V),
    zero: () => L('the height of the block in ②', 'die Höhe des Klotzes in ②'),
    title: () => L('Down a slope', 'Die schiefe Ebene hinunter'),
    text: (p, formal) => (p.ask === 's'
      ? (formal
        ? L('A block starts from rest and slides a distance $s$ down a smooth slope inclined at 30°. Find its speed $v$ in terms of $s$ and $g$.',
          'Ein Klotz startet aus der Ruhe und gleitet eine Strecke $s$ eine glatte, um 30° geneigte Ebene hinunter. Wie gross ist seine Geschwindigkeit $v$? Drücke sie durch $s$ und $g$ aus.')
        : L(`A block starts from rest and slides ${q(p.V.s, 'm')} down a smooth slope inclined at 30°. How fast is it then?`,
          `Ein Klotz startet aus der Ruhe und gleitet ${q(p.V.s, 'm')} eine glatte, um 30° geneigte Ebene hinunter. Wie schnell ist er dann?`))
      : (formal
        ? L(`A block starts from rest and slides down a smooth slope inclined at ${p.ang}° until it is a height $h$ lower. Find its speed $v$ in terms of $h$ and $g$.`,
          `Ein Klotz startet aus der Ruhe und gleitet eine glatte, um ${p.ang}° geneigte Ebene hinunter, bis er um die Höhe $h$ tiefer ist. Wie gross ist seine Geschwindigkeit $v$? Drücke sie durch $h$ und $g$ aus.`)
        : L(`A block starts from rest and slides down a smooth slope inclined at ${p.ang}° until it is ${q(p.V.h, 'm')} lower. How fast is it then?`,
          `Ein Klotz startet aus der Ruhe und gleitet eine glatte, um ${p.ang}° geneigte Ebene hinunter, bis er ${q(p.V.h, 'm')} tiefer ist. Wie schnell ist er dann?`))),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), sl = slope(p.ang), P1 = sl.at(sl.u1), P2 = sl.at(sl.u2);
      fig.path(`M0 ${-sl.Hs}L${sl.W.toFixed(1)} 0L0 0Z`, [[0, -sl.Hs], [sl.W, 0], [0, 0]], 'tower');
      fig.surface(-20, sl.W + 120, 0);
      slopeBlock(fig, sl, P1);
      slopeBlock(fig, sl, P2);
      const c1 = [P1[0] + 13 * sl.n[0], P1[1] + 13 * sl.n[1]], c2 = [P2[0] + 13 * sl.n[0], P2[1] + 13 * sl.n[1]];
      atRest(fig, c1[0] + 22, c1[1] - 14);
      speed(fig, c2[0] + 16 * sl.d[0], c2[1] + 16 * sl.d[1], sl.d, wanted('v'), 26, [-6, -26]);
      // the height between the two positions, on the right; the zero level through ②
      const xd = P2[0] + 95;
      fig.line(P1[0] + 16, P1[1], xd + 6, P1[1], 'w dash');
      if (p.ask === 'h') fig.dim(xd, P2[1], P1[1], given('h', formal, p.V.h, 'm'), 1);
      else fig.dim(xd, P2[1], P1[1], '', 1);
      zeroLine(fig, P2[0] + 16, xd + 30, P2[1]);
      // the distance along the slope, inside the triangle; the angle at the foot
      if (p.ask === 's') {
        const m = sl.at((sl.u1 + sl.u2) / 2);
        fig.text(m[0] - 20 * sl.n[0] - 6, m[1] - 20 * sl.n[1] + 4, given('s', formal, p.V.s, 'm'), 'lbl', 'middle');
      }
      fig.text(sl.W - 46, -7, formal && p.ask === 'h' ? '<tspan font-style="italic">α</tspan>' : `${p.ang}°`, 'lbl small', 'middle');
      fig.state(c1[0] - 4, c1[1] - 30, 0, hl(view, 0));
      fig.state(c2[0] - 10, c2[1] - 30, 1, hl(view, 1));
      return fig;
    },
    steps(p) {
      const h = p.ask === 's'
        ? [step(L('Height', 'Höhe'), `<p>${L('Along the slope the block covers $s$; it drops by', 'Entlang der Ebene legt der Klotz $s$ zurück; er sinkt dabei um')} $h = s\\sin 30^\\circ = \\tfrac{1}{2}\\,s$.</p>`, ALL, [0])]
        : [];
      return [...h,
        step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('The smooth slope does no work (its force is at right angles to the motion), so', 'Die glatte Ebene verrichtet keine Arbeit (ihre Kraft steht senkrecht zur Bewegung), also gilt')} $E_1 = E_2$:</p>` +
          dm(`${pot('h')} = ${kin('v')} \;\\Rightarrow\; v = \\sqrt{2\\,g\\,h}${p.ask === 's' ? ' = \\sqrt{g\\,s}' : ''}`) +
          `<p>${L('Only the height counts, not the angle: on a steeper slope the block gets there sooner, but not faster.', 'Nur die Höhe zählt, nicht der Winkel: Auf einer steileren Ebene ist der Klotz früher unten, aber nicht schneller.')}</p>`, ALL, [0, 1]),
      ];
    },
    hint: (p) => m$(`${pot('h')} = ${kin('v')}`) + (p.ask === 's' ? L(', with ', ', mit ') + m$('h = s\\sin 30^\\circ') : L(' (the angle does not matter)', ' (der Winkel spielt keine Rolle)')),
  };

  // ---------------------------------------------------------------- 12 a spring buffer
  const buffer = {
    id: 'buffer', difficulty: 2, spring: true,
    make(r) {
      const m = pick(r, [0.5, 1, 2, 4, 5]), v = pick(r, [0.5, 1, 1.5, 2, 3, 4]), k = pick(r, [100, 200, 400, 500, 800, 1000, 2000]);
      const s = v * Math.sqrt(m / k);
      return s >= 0.02 && s <= 0.4 ? { V: { g: G, m, v, k, s } } : null;
    },
    vars: () => ['k', 'm', 'v'],
    want: () => ({ key: 's', unit: 'm', what: L('compression', 'Stauchung') }),
    f: () => (V) => V.v * Math.sqrt(V.m / V.k),
    tex: () => 'v\\,\\sqrt{\\frac{m}{k}}',
    insert: (p) => `${tq(p.V.v, 'v')}\\cdot\\sqrt{\\frac{${tq(p.V.m, 'kg')}}{${tq(p.V.k, 'k')}}}`,
    traps: () => [
      { flag: 'root', f: (V) => (V.m * sq(V.v)) / V.k, tex: '\\frac{m\\,v^2}{k}' },
      { flag: 'half', f: (V) => V.v * Math.sqrt(V.m / (2 * V.k)), tex: 'v\\,\\sqrt{\\frac{m}{2\\,k}}' },
      { flag: 'half', f: (V) => V.v * Math.sqrt((2 * V.m) / V.k), tex: 'v\\,\\sqrt{\\frac{2\\,m}{k}}' },
      { flag: 'square', f: (V) => (V.m * V.v) / V.k, tex: '\\frac{m\\,v}{k}' },
    ],
    states: (p) => [{ kin: 0.5 * p.V.m * sq(p.V.v) }, { el: 0.5 * p.V.k * sq(p.V.s) }],
    energies: () => [{ kin: kin('v') }, { el: el('s') }],
    efun: () => [{ kin: Kin((V) => V.v) }, { el: El((V) => V.s) }],
    esyms: () => ['m', 'k', 's', 'v'],
    zero: () => L('the floor (the potential energy does not change)', 'der Boden (die Lageenergie ändert sich nicht)'),
    title: () => L('Spring buffer', 'Federpuffer'),
    text: (p, formal) => (formal
      ? L('A cart of mass $m$ rolls with the speed $v$ against a spring buffer with spring constant $k$. How far does it compress the spring until its speed is zero? Express $s$ in terms of $m$, $v$ and $k$.',
        'Ein Wagen der Masse $m$ rollt mit der Geschwindigkeit $v$ gegen einen Federpuffer mit der Federkonstanten $k$. Wie stark drückt er die Feder zusammen, bis seine Geschwindigkeit null ist? Drücke $s$ durch $m$, $v$ und $k$ aus.')
      : L(`A cart of ${q(p.V.m, 'kg')} rolls at ${q(p.V.v, 'v')} against a spring buffer with a spring constant of ${q(p.V.k, 'k')}. How far does it compress the spring until its speed is zero?`,
        `Ein Wagen von ${q(p.V.m, 'kg')} rollt mit ${q(p.V.v, 'v')} gegen einen Federpuffer mit der Federkonstanten ${q(p.V.k, 'k')}. Wie stark drückt er die Feder zusammen, bis seine Geschwindigkeit null ist?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), L0 = 96, C = 38, bw = 40, bh = 30, gap = 250;
      [0, 1].forEach((i) => {
        const x0 = i * gap, len = i === 0 ? L0 : L0 - C;
        fig.surface(x0, x0 + 210, 0);
        fig.wall(x0, 0, -60);
        fig.spring([x0, -bh / 2], [x0 + len, -bh / 2], 8, i === 0 ? 7 : 5);
        const bx = i === 0 ? x0 + L0 + 60 : x0 + len;
        fig.rect(bx, -bh, bw, bh, 'body');
        if (i === 0) {
          speed(fig, bx - 6, -bh / 2, [-1, 0], given('v', formal, p.V.v, 'v'), 34, [4, -12]);
          fig.text(x0 + 6, -bh - 30, given('k', formal, p.V.k, 'k'), 'lbl', 'start');
        } else {
          fig.line(x0 + L0, -bh - 6, x0 + L0, -bh - 28, 'w dash');
          fig.line(bx, -bh - 6, bx, -bh - 28, 'w dash');
          fig.arrow(x0 + L0, -bh - 20, bx, -bh - 20, 'dimarrow');
          fig.text((x0 + L0 + bx) / 2, -bh - 26, wanted('s'), 'lbl');
          atRest(fig, bx + bw + 8, -bh / 2 + 5);
        }
        fig.state(x0 + 105, 34, i, hl(view, i));
      });
      return fig;
    },
    steps: () => [
      step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('The kinetic energy of the cart goes into the spring:', 'Die kinetische Energie des Wagens geht in die Feder:')}</p>${dm(`${kin('v')} = ${el('s')}`)}`, ALL, [0, 1]),
      step(L('Solve', 'Auflösen'), dm('s^2 = \\frac{m\\,v^2}{k} \;\\Rightarrow\; s = v\\,\\sqrt{\\frac{m}{k}}') +
        `<p>${L('Twice the speed gives twice the compression, but four times the energy.', 'Doppelte Geschwindigkeit ergibt doppelte Stauchung, aber vierfache Energie.')}</p>`, ALL),
    ],
    hint: () => m$(`${kin('v')} = ${el('s')}`),
  };

  // ---------------------------------------------------------------- 13 a bungee jump
  const bungee = {
    id: 'bungee', difficulty: 4, spring: true,
    make(r) {
      const m = pick(r, [50, 60, 70, 80, 90]), l = pick(r, [10, 12, 15, 20, 25]), s = pick(r, [8, 10, 12, 15, 20]);
      const k = (2 * m * G * (l + s)) / (s * s);
      return k >= 50 && k <= 1500 ? { V: { g: G, m, l, s, k, v: Math.sqrt(2 * G * l) } } : null;
    },
    vars: () => ['g', 'l', 'm', 's'],
    want: () => ({ key: 'k', unit: 'k', what: L('spring constant of the rope', 'Federkonstante des Seils') }),
    f: () => (V) => (2 * V.m * V.g * (V.l + V.s)) / sq(V.s),
    tex: () => '\\frac{2\\,m\\,g\\,(\\ell + s)}{s^2}',
    insert: (p) => `\\frac{2\\cdot ${tq(p.V.m, 'kg')}\\cdot ${gq()}\\cdot (${tq(p.V.l, 'm')} + ${tq(p.V.s, 'm')})}{\\left(${tq(p.V.s, 'm')}\\right)^2}`,
    traps: () => [
      { flag: 'extra', f: (V) => (2 * V.m * V.g * V.l) / sq(V.s), tex: '\\frac{2\\,m\\,g\\,\\ell}{s^2}' },
      { flag: 'half', f: (V) => (V.m * V.g * (V.l + V.s)) / sq(V.s), tex: '\\frac{m\\,g\\,(\\ell + s)}{s^2}' },
      { flag: 'square', f: (V) => (2 * V.m * V.g * (V.l + V.s)) / V.s, tex: '\\frac{2\\,m\\,g\\,(\\ell + s)}{s}' },
      { flag: 'equil', f: (V) => (V.m * V.g) / V.s, tex: '\\frac{m\\,g}{s}' },
    ],
    why: {
      extra: () => L('The jumper falls further than ℓ: while the rope stretches, they drop by s more.', 'Die Springerin fällt weiter als ℓ: Während sich das Seil dehnt, sinkt sie um s weiter.'),
    },
    states: (p) => { const { m, l, s, k } = p.V; return [{ pot: m * G * (l + s) }, { pot: m * G * s, kin: m * G * l }, { el: 0.5 * k * s * s }]; },
    energies: () => [{ pot: pot('(\\ell + s)') }, { pot: pot('s'), kin: kin('v') }, { el: el('s') }],
    efun: () => [{ pot: Pot((V) => V.l + V.s) }, { pot: Pot((V) => V.s), kin: Kin((V) => V.v) }, { el: El((V) => V.s) }],
    esyms: () => ['m', 'g', 'l', 's', 'v', 'k'],
    slips: () => above(0, '\\ell', '\\ell + s'),
    zero: () => L('the lowest point of the jump', 'der tiefste Punkt des Sprungs'),
    title: () => L('Bungee jump', 'Bungee-Sprung'),
    text: (p, formal) => (formal
      ? L('A bungee jumper of mass $m$ steps off a bridge. The rope, of length $\\ell$ when slack, starts to stretch after a free fall of $\\ell$ and stops the jumper after stretching by $s$. Treat the rope as a spring and the jumper as a point. Find the spring constant $k$ of the rope in terms of $m$, $\\ell$, $s$ and $g$.',
        'Eine Bungee-Springerin der Masse $m$ lässt sich von einer Brücke fallen. Das Seil mit der ungedehnten Länge $\\ell$ beginnt sich nach einem freien Fall von $\\ell$ zu dehnen und bremst sie, bis es um $s$ gedehnt ist. Behandle das Seil als Feder und die Springerin als Punkt. Wie gross ist die Federkonstante $k$ des Seils? Drücke sie durch $m$, $\\ell$, $s$ und $g$ aus.')
      : L(`A bungee jumper of ${q(p.V.m, 'kg')} steps off a bridge. The rope, ${q(p.V.l, 'm')} long when slack, starts to stretch after a free fall of ${q(p.V.l, 'm')} and stops the jumper after stretching by ${q(p.V.s, 'm')}. Treat the rope as a spring and the jumper as a point. What is the spring constant of the rope?`,
        `Eine Bungee-Springerin von ${q(p.V.m, 'kg')} lässt sich von einer Brücke fallen. Das Seil, ungedehnt ${q(p.V.l, 'm')} lang, beginnt sich nach ${q(p.V.l, 'm')} freiem Fall zu dehnen und bremst sie, bis es um ${q(p.V.s, 'm')} gedehnt ist. Behandle das Seil als Feder und die Springerin als Punkt. Wie gross ist die Federkonstante des Seils?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), Lp = 110, Sp = 60;
      [0, 1, 2].forEach((i) => {
        const cx = i * PW, ax = cx - 18, depth = [0, Lp, Lp + Sp][i];
        fig.surface(cx - 80, ax, 0);
        fig.circle(ax, 0, 2.5, 'dot');
        if (i === 0) fig.path(`M${ax} 0Q${cx - 4} 26 ${cx} 0`, [[ax, 0], [cx, 0]], 'w rope');
        else if (i === 1) fig.line(ax, 0, cx, depth, 'w rope');
        else fig.spring([ax, 0], [cx, depth], 6, 10);
        fig.circle(cx, depth + R, R, 'body ball');
        if (i === 0) atRest(fig, cx + R + 8, R + 5);
        if (i === 1) {
          speed(fig, cx + R + 8, depth + 2, [0, 1], S('v'), 30);
          fig.dim(cx - 40, 0, depth, given('l', formal, p.V.l, 'm'));
        }
        if (i === 2) {
          atRest(fig, cx + R + 8, depth + R + 5);
          fig.line(cx - 46, Lp, cx - 14, Lp, 'w dash');
          fig.dim(cx - 40, Lp, depth, given('s', formal, p.V.s, 'm'));
          fig.text(cx + 16, Lp - 20, wanted('k'), 'lbl', 'start');
        }
        fig.state(cx, -22, i, hl(view, i));
      });
      zeroLine(fig, -60, 2 * PW + 60, Lp + Sp + 2 * R);
      return fig;
    },
    steps: () => [
      step(L('Energy conservation ①③', 'Energieerhaltung ①③'), `<p>${L('From the bridge to the lowest point, the jumper drops by $\\ell + s$: by $\\ell$ in free fall (until ②), then by $s$ while the rope stretches. At both ends they are at rest:', 'Von der Brücke bis zum tiefsten Punkt sinkt die Springerin um $\\ell + s$: um $\\ell$ im freien Fall (bis ②), dann um $s$, während sich das Seil dehnt. An beiden Enden ruht sie:')}</p>` +
        dm(`${pot('(\\ell + s)')} = ${el('s')}`), ALL, [0, 2]),
      step(L('Solve', 'Auflösen'), dm('k = \\frac{2\\,m\\,g\\,(\\ell + s)}{s^2}') +
        `<p>${L('At the lowest point the rope pulls far harder than the weight: the jumper is not at rest there for long.', 'Im tiefsten Punkt zieht das Seil viel stärker als die Gewichtskraft: Die Springerin bleibt dort nicht in Ruhe.')}</p>`, ALL),
    ],
    hint: () => m$(`${pot('(\\ell + s)')} = ${el('s')}`),
  };

  // ---------------------------------------------------------------- 14 twice the compression
  const twice = {
    id: 'twice', difficulty: 4, spring: true,
    make(r) {
      const h = pick(r, [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1]), s = pick(r, [0.02, 0.03, 0.04, 0.05, 0.08, 0.1]), m = 1;
      if (s > h / 3) return null;
      const k = (2 * m * G * (h + s)) / (s * s);
      return { V: { g: G, h, s, m, k, hp: 4 * h + 2 * s } };
    },
    vars: () => ['h', 's'],
    want: () => ({ key: 'hp', unit: 'm', what: L('height', 'Höhe') }),
    f: () => (V) => 4 * V.h + 2 * V.s,
    tex: () => '4\\,h + 2\\,s',
    insert: (p) => `4\\cdot ${tq(p.V.h, 'm')} + 2\\cdot ${tq(p.V.s, 'm')}`,
    // wrong ideas, not only with the factors 2 and 4: the energy linear in the compression (2),
    // the elastic energy added beyond s instead of all of it (3), the compression left out of one
    // fall or both (4 h, 4 h + 3 s, 4 h − 2 s, 4 h + 4 s), or both mistakes at once (2 h + 2 s)
    traps: () => [
      { flag: 'square', f: (V) => 2 * V.h, tex: '2\\,h' },
      { flag: 'extra', f: (V) => 4 * V.h, tex: '4\\,h' },
      { flag: 'diff', f: (V) => 3 * V.h + V.s, tex: '3\\,h + s' },
      { flag: 'old', f: (V) => 4 * V.h + 3 * V.s, tex: '4\\,h + 3\\,s' },
      { flag: 'first', f: (V) => 4 * V.h - 2 * V.s, tex: '4\\,h - 2\\,s' },
      { flag: 'extra', f: (V) => 4 * V.h + 4 * V.s, tex: '4\\,h + 4\\,s' },
      { flag: 'both', f: (V) => 2 * V.h + 2 * V.s, tex: '2\\,h + 2\\,s' },
      { flag: 'square', f: (V) => 2 * V.h + V.s, tex: '2\\,h + s' },
    ],
    why: {
      square: () => L('How does the elastic energy grow with the compression? What does that mean for twice the compression?', 'Wie wächst die Spannenergie mit der Stauchung? Was heisst das für die doppelte Stauchung?'),
      extra: () => L('Count the fall correctly: by how much does the ball drop each time, including while it compresses the spring?', 'Zähle den Fall richtig: Um wie viel sinkt der Ball jedes Mal, auch während er die Feder staucht?'),
      diff: () => L('The spring is compressed from relaxed to 2s: how much elastic energy does it store then in all?', 'Die Feder wird von entspannt bis 2s gestaucht: Wie viel Spannenergie speichert sie dann insgesamt?'),
      old: () => L('In the second drop: by how much does the ball sink while it compresses the spring? How far does it fall in all, then?', 'Beim zweiten Versuch: Um wie viel sinkt der Ball, während er die Feder staucht? Wie weit fällt er dann insgesamt?'),
      first: () => L('In the first drop the ball also compresses the spring: how far does it fall in all, then?', 'Auch beim ersten Versuch staucht der Ball die Feder: Wie weit fällt er dann insgesamt?'),
      both: () => L('Two slips: how does the elastic energy grow with the compression, and how far does the ball fall in all the second time?', 'Zwei Fehler: Wie wächst die Spannenergie mit der Stauchung, und wie weit fällt der Ball beim zweiten Mal insgesamt?'),
    },
    states: (p) => { const { m, hp, s, k } = p.V; return [{ pot: m * G * (hp + 2 * s) }, { el: 0.5 * k * sq(2 * s) }]; },
    energies: () => [{ pot: pot("(h' + 2\\,s)") }, { el: el('(2\\,s)') }],
    efun: () => [{ pot: Pot((V) => V.hp + 2 * V.s) }, { el: El((V) => 2 * V.s) }],
    esyms: () => ['m', 'g', 'hp', 's', 'k'],
    slips: () => above(0, "h'", "h' + 2s"),
    zero: () => L('the lowest point of the ball in the second drop', 'der tiefste Punkt des Balls beim zweiten Versuch'),
    title: () => L('Twice the compression', 'Doppelte Stauchung'),
    text: (p, formal) => (formal
      ? L("A ball dropped from rest from a height $h$ above the top of a vertical spring compresses it by $s$. From what height $h'$ above the top of the spring must it be dropped to compress it by $2s$? Express $h'$ in terms of $h$ and $s$.",
        "Ein Ball, der aus der Höhe $h$ über dem oberen Ende einer senkrechten Feder aus der Ruhe fallen gelassen wird, drückt sie um $s$ zusammen. Aus welcher Höhe $h'$ über dem oberen Ende der Feder muss man ihn fallen lassen, damit er sie um $2s$ zusammendrückt? Drücke $h'$ durch $h$ und $s$ aus.")
      : L(`A ball dropped from rest from ${q(p.V.h, 'm')} above the top of a vertical spring compresses it by ${q(p.V.s, 'm')}. From what height above the top of the spring must it be dropped to compress it by ${q(2 * p.V.s, 'm')}?`,
        `Ein Ball, der aus ${q(p.V.h, 'm')} über dem oberen Ende einer senkrechten Feder aus der Ruhe fallen gelassen wird, drückt sie um ${q(p.V.s, 'm')} zusammen. Aus welcher Höhe über dem oberen Ende der Feder muss man ihn fallen lassen, damit er sie um ${q(2 * p.V.s, 'm')} zusammendrückt?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), L0 = 80, C = 20, H1 = 70, H2 = 150;
      const s2 = formal ? `2${S('s')}` : q(2 * p.V.s, 'm');
      // the first drop, for reference: released from h, compressed by s
      groundAt(fig, 0, 0, 90);
      fig.spring([0, 0], [0, -(L0 - C)], 9, 7);
      fig.line(-16, -(L0 - C), 16, -(L0 - C), 'w plate');
      ball(fig, 0, -(L0 - C));
      fig.circle(0, -L0 - H1 - R, R, 'ghost');
      fig.line(-40, -L0, -18, -L0, 'w dash');
      fig.dim(-34, -L0, -L0 - H1, given('h', formal, p.V.h, 'm'));
      fig.line(-34, -L0 - H1, -R, -L0 - H1, 'w dash');
      fig.dim(30, -L0, -(L0 - C), given('s', formal, p.V.s, 'm'), 1);
      fig.line(18, -L0, 36, -L0, 'w dash');
      fig.text(0, 30, L('first drop', 'erster Versuch'), 'lbl small');
      // the second drop: ① released from h', ② compressed by 2s
      [1, 2].forEach((i) => {
        const cx = i * PW + 40, top = i === 2 ? -(L0 - 2 * C) : -L0;
        groundAt(fig, cx, 0, 90);
        fig.spring([cx, 0], [cx, top], 9, 7);
        fig.line(cx - 16, top, cx + 16, top, 'w plate');
        if (i === 1) {
          ball(fig, cx, -L0 - H2);
          atRest(fig, cx + R + 8, -L0 - H2 - R + 5);
          fig.line(cx - 40, -L0, cx - 18, -L0, 'w dash');
          fig.dim(cx - 34, -L0, -L0 - H2, wanted('hp'));
          fig.line(cx - 34, -L0 - H2, cx - R, -L0 - H2, 'w dash');
        } else {
          ball(fig, cx, top);
          atRest(fig, cx + R + 8, top - R + 5);
          fig.line(cx - 40, -L0, cx - 18, -L0, 'w dash');
          fig.dim(cx - 34, -L0, top, s2);
        }
        fig.state(cx, 34, i - 1, hl(view, i - 1));
      });
      zeroLine(fig, PW - 10, 2 * PW + 100, -(L0 - 2 * C));
      return fig;
    },
    steps: () => [
      step(L('First drop', 'Erster Versuch'), `<p>${L('The ball drops by $h + s$ and stops: its potential energy is now in the spring.', 'Der Ball sinkt um $h + s$ und hält an: Seine Lageenergie steckt jetzt in der Feder.')}</p>` +
        dm(`${pot('(h + s)')} = ${el('s')}`), null, []),
      step(L('Second drop', 'Zweiter Versuch'), `<p>$E_1 = E_2$: ${L("the ball drops by $h' + 2s$; the spring stores", "Der Ball sinkt um $h' + 2s$; die Feder speichert")} $\\tfrac{1}{2}\\,k\\,(2s)^2 = 4\\cdot\\tfrac{1}{2}\\,k\\,s^2$:</p>` +
        dm(`${pot("(h' + 2\\,s)")} = 4\\cdot ${el('s')} = 4\\,${pot('(h + s)')}`), ALL, [0, 1]),
      step(L('Solve', 'Auflösen'), dm("h' + 2\\,s = 4\\,h + 4\\,s \;\\Rightarrow\; h' = 4\\,h + 2\\,s") +
        `<p>${L('Twice the compression needs four times the energy, so the ball must fall about four times as far, not twice.', 'Doppelte Stauchung braucht vierfache Energie, der Ball muss also etwa viermal so tief fallen, nicht doppelt so tief.')}</p>`, ALL),
    ],
    hint: () => m$(`${pot('(h + s)')} = ${el('s')}`) + L(' and ', ' und ') + m$(`${pot("(h' + 2\\,s)")} = \\tfrac{1}{2}\\,k\\,(2s)^2`),
  };

  // ---------------------------------------------------------------- 15 kinetic energy a multiple of the potential energy
  const RATIO = [[1, 1], [2, 1], [3, 1], [1, 2], [1, 3]];
  const RATIO_WORDS = {
    '1/1': { en: 'equal to', de: 'gleich gross wie' }, '2/1': { en: 'twice', de: 'doppelt so gross wie' }, '3/1': { en: 'three times', de: 'dreimal so gross wie' },
    '1/2': { en: 'half', de: 'halb so gross wie' }, '1/3': { en: 'one third of', de: 'nur ein Drittel so gross wie' },
  };
  const ratioWords = (n) => RATIO_WORDS[n.join('/')][EC.getLang()];
  const ekin = {
    id: 'ekin-epot', difficulty: 2,
    make(r) {
      const n = pick(r, RATIO), h = pick(r, [1.2, 1.8, 2.4, 3, 3.6, 4.8, 6]), fr = reduce([n[1], n[0] + n[1]]); // h'/h = 1/(n + 1)
      const hp = fval(fr) * h;
      return { n, fr, V: { g: G, h, hp, vp: Math.sqrt(2 * G * (h - hp)) } };
    },
    vars: () => ['h'],
    want: () => ({ key: 'hp', unit: 'm', what: L('height', 'Höhe') }),
    f: (p) => (V) => fval(p.fr) * V.h,
    tex: (p) => `${coef(p.fr)}h`,
    insert: (p) => `${coef(p.fr)}\\cdot ${tq(p.V.h, 'm')}`,
    traps(p) {
      const n = fval(p.n), down = sub(ONE, p.fr);
      return [
        { flag: 'fall', f: (V) => fval(down) * V.h, tex: `${coef(down)}h` },
        { flag: 'solve', f: (V) => V.h / n, tex: `${coef(reduce([p.n[1], p.n[0]]))}h` },
        { flag: 'square', f: (V) => sq(fval(p.fr)) * V.h, tex: `${coef(mul(p.fr, p.fr))}h` },
        { flag: 'solve', f: (V) => V.h / (n + 2), tex: `${coef(reduce([p.n[1], p.n[0] + 2 * p.n[1]]))}h` },
      ];
    },
    why: {
      fall: () => L("That is how far the ball has fallen, h − h', not its height h' above the ground.", "Das ist die Strecke, um die der Ball gefallen ist, h − h', nicht seine Höhe h' über dem Boden."),
      square: () => L('The potential energy is proportional to the height itself, not to its square.', 'Die Lageenergie ist proportional zur Höhe selbst, nicht zu ihrem Quadrat.'),
    },
    states: (p) => [{ pot: G * p.V.h }, { pot: G * p.V.hp, kin: G * (p.V.h - p.V.hp) }],
    energies: () => [{ pot: pot('h') }, { pot: pot("h'"), kin: kin("v'") }],
    efun: () => [{ pot: Pot((V) => V.h) }, { pot: Pot((V) => V.hp), kin: Kin((V) => V.vp) }],
    esyms: () => ['m', 'g', 'h', 'hp', 'vp'],
    slips: () => fallen(1, 'h', "h'"),
    zero: () => L('the ground', 'der Boden'),
    title: () => L('Kinetic and potential energy', 'Kinetische und potentielle Energie'),
    text(p, formal) {
      const w = ratioWords(p.n), same = p.n[0] === p.n[1];
      const en = same ? 'its kinetic energy equal to its potential energy' : `its kinetic energy ${w} its potential energy`;
      const de = same ? 'seine kinetische Energie gleich gross wie seine Lageenergie' : `seine kinetische Energie ${w} seine Lageenergie`;
      return formal
        ? L(`A ball is dropped from a height $h$ (it starts at rest). At what height $h'$ is ${en}? Take the ground as zero level and express $h'$ in terms of $h$.`,
          `Ein Ball wird aus der Höhe $h$ fallen gelassen (er startet aus der Ruhe). Auf welcher Höhe $h'$ ist ${de}? Nimm den Boden als Nullniveau und drücke $h'$ durch $h$ aus.`)
        : L(`A ball is dropped from a height of ${q(p.V.h, 'm')} (it starts at rest). At what height is ${en}? Take the ground as zero level.`,
          `Ein Ball wird aus ${q(p.V.h, 'm')} Höhe fallen gelassen (er startet aus der Ruhe). Auf welcher Höhe ist ${de}? Nimm den Boden als Nullniveau.`);
    },
    scene(p, formal, view) {
      const fig = new Fig(this.title()), H = 150, h2 = H * fval(p.fr);
      groundAt(fig, 0, 0); groundAt(fig, PW, 0);
      ball(fig, 0, -H); height(fig, -34, 0, -H, given('h', formal, p.V.h, 'm'), 0); atRest(fig, R + 8, -H - R + 5);
      ball(fig, PW, -h2); height(fig, PW - 34, 0, -h2, wanted('hp'), PW);
      speed(fig, PW + R + 10, -h2 - 2 * R, [0, 1], S('vp'));
      fig.state(0, 34, 0, hl(view, 0)); fig.state(PW, 34, 1, hl(view, 1));
      zeroLine(fig, PW + 60, PW + 62, 0);
      return fig;
    },
    steps(p) {
      const n = p.n, ntex = n[0] === n[1] ? '' : coef(n), n1 = coef(reduce([n[0] + n[1], n[1]])) || '';
      return [
        step(L('Energy conservation', 'Energieerhaltung'), `<p>$E_1 = E_2$, ${L('with', 'mit')} ${m$(`${EC.etex('kin')} = ${ntex}${EC.etex('pot')}`)} ${L("at the height h':", "auf der Höhe h':")}</p>` +
          dm(`${pot('h')} = ${pot("h'")} + ${ntex}${pot("h'")} = ${n1}${pot("h'")}`), ALL, [0, 1]),
        step(L('Solve', 'Auflösen'), dm(`h' = ${this.tex(p)}`) +
          `<p>${L(`The potential energy left is ${fplain(p.fr)} of the total: the ball is at ${fplain(p.fr)} of its starting height.`, `Die verbleibende Lageenergie ist ${fplain(p.fr)} der Gesamtenergie: Der Ball ist auf ${fplain(p.fr)} seiner Anfangshöhe.`)}</p>`, ALL),
      ];
    },
    hint: (p) => m$(`${pot('h')} = ${pot("h'")} + ${EC.etex('kin')}`) + L(', with ', ', mit ') + m$(`${EC.etex('kin')} = ${p.n[0] === p.n[1] ? '' : coef(p.n)}${pot("h'")}`),
  };

  // ---------------------------------------------------------------- 16 a spring launcher up a slope
  const slopeLaunch = {
    id: 'slope-launch', difficulty: 3, spring: true,
    make(r) {
      const k = pick(r, [100, 200, 300, 400, 500, 800, 1000]), s = pick(r, [0.05, 0.08, 0.1, 0.12, 0.15, 0.2]), m = pick(r, [0.1, 0.2, 0.25, 0.4, 0.5, 1]);
      const d = (k * s * s) / (m * G);
      return d >= 0.4 && d <= 8 && d > 4 * s ? { V: { g: G, k, s, m, d, h: d / 2 } } : null;
    },
    vars: () => ['g', 'k', 'm', 's'],
    want: () => ({ key: 'd', unit: 'm', what: L('distance along the slope', 'Strecke entlang der Ebene') }),
    f: () => (V) => (V.k * sq(V.s)) / (V.m * V.g),
    tex: () => '\\frac{k\\,s^2}{m\\,g}',
    insert: (p) => `\\frac{${tq(p.V.k, 'k')}\\cdot\\left(${tq(p.V.s, 'm')}\\right)^2}{${tq(p.V.m, 'kg')}\\cdot ${gq()}}`,
    traps: () => [
      { flag: 'fall', f: (V) => (V.k * sq(V.s)) / (2 * V.m * V.g), tex: '\\frac{k\\,s^2}{2\\,m\\,g}' },
      { flag: 'square', f: (V) => (V.k * V.s) / (V.m * V.g), tex: '\\frac{k\\,s}{m\\,g}' },
      { flag: 'weight', f: (V) => (V.k * sq(V.s)) / V.m, tex: '\\frac{k\\,s^2}{m}' },
      { flag: 'half', f: (V) => (2 * V.k * sq(V.s)) / (V.m * V.g), tex: '\\frac{2\\,k\\,s^2}{m\\,g}' },
    ],
    why: {
      fall: () => L('That is the height the block rises, h. How long is the path d along the 30° slope for this height?', 'Das ist die Höhe h, um die der Klotz steigt. Wie lang ist der Weg d entlang der 30°-Ebene für diese Höhe?'),
    },
    states: (p) => [{ el: 0.5 * p.V.k * sq(p.V.s) }, { pot: p.V.m * G * p.V.h }],
    energies: () => [{ el: el('s') }, { pot: pot('h') }],
    efun: () => [{ el: El((V) => V.s) }, { pot: Pot((V) => V.h) }],
    esyms: () => ['m', 'g', 'h', 'd', 'k', 's'],
    rel: () => (V) => ({ ...V, h: V.d / 2 }),
    zero: () => L('where the block starts, on the compressed spring', 'der Startpunkt des Klotzes auf der zusammengedrückten Feder'),
    title: () => L('Shot up a slope', 'Die Ebene hinaufgeschossen'),
    text: (p, formal) => (formal
      ? L('At the foot of a smooth slope inclined at 30°, a spring with spring constant $k$ lies along the slope, compressed by $s$, with a block of mass $m$ against it. When the spring is released, it shoots the block up the slope. How far along the slope does the block get from its starting point? Express $d$ in terms of $k$, $s$, $m$ and $g$.',
        'Am Fuss einer glatten, um 30° geneigten Ebene liegt eine Feder mit der Federkonstanten $k$ entlang der Ebene, um $s$ zusammengedrückt, mit einem Klotz der Masse $m$ davor. Lässt man die Feder los, schiesst sie den Klotz die Ebene hinauf. Wie weit kommt der Klotz entlang der Ebene, gemessen ab seinem Startpunkt? Drücke $d$ durch $k$, $s$, $m$ und $g$ aus.')
      : L(`At the foot of a smooth slope inclined at 30°, a spring with a spring constant of ${q(p.V.k, 'k')} lies along the slope, compressed by ${q(p.V.s, 'm')}, with a block of ${q(p.V.m, 'kg')} against it. When the spring is released, it shoots the block up the slope. How far along the slope does the block get from its starting point?`,
        `Am Fuss einer glatten, um 30° geneigten Ebene liegt eine Feder mit der Federkonstanten ${q(p.V.k, 'k')} entlang der Ebene, um ${q(p.V.s, 'm')} zusammengedrückt, mit einem Klotz von ${q(p.V.m, 'kg')} davor. Lässt man die Feder los, schiesst sie den Klotz die Ebene hinauf. Wie weit kommt der Klotz entlang der Ebene, gemessen ab seinem Startpunkt?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), sl = slope(30), U1 = 0.82, U2 = 0.15;
      fig.path(`M0 ${-sl.Hs}L${sl.W.toFixed(1)} 0L0 0Z`, [[0, -sl.Hs], [sl.W, 0], [0, 0]], 'tower');
      fig.surface(-20, sl.W + 60, 0);
      launchParts(fig, sl, U1, U1);
      slopeBlock(fig, sl, sl.at(U2));
      const c1 = [sl.at(U1)[0] + 13 * sl.n[0], sl.at(U1)[1] + 13 * sl.n[1]], c2 = [sl.at(U2)[0] + 13 * sl.n[0], sl.at(U2)[1] + 13 * sl.n[1]];
      atRest(fig, c2[0] + 20, c2[1] - 14);
      fig.text(c1[0] + 30, c1[1] - 18, `${given('k', formal, p.V.k, 'k')}, ${given('s', formal, p.V.s, 'm')}`, 'lbl', 'start');
      // the distance along the slope, inside the triangle
      const a = sl.at(U2), b = sl.at(U1), off = [-22 * sl.n[0], -22 * sl.n[1]];
      fig.arrow(b[0] + off[0], b[1] + off[1], a[0] + off[0], a[1] + off[1], 'dimarrow');
      fig.text((a[0] + b[0]) / 2 + 2 * off[0], (a[1] + b[1]) / 2 + 2 * off[1] + 4, wanted('d'), 'lbl');
      zeroLine(fig, c1[0] + 16, sl.W + 70, sl.at(U1)[1]);
      fig.text(sl.W - 46, -7, '30°', 'lbl small');
      fig.state(c1[0] - 4, c1[1] - 30, 0, hl(view, 0));
      fig.state(c2[0] - 4, c2[1] - 30, 1, hl(view, 1));
      return fig;
    },
    steps: () => [
      step(L('Energy conservation', 'Energieerhaltung'), `<p>${L('The elastic energy of the spring becomes potential energy; at the highest point the speed of the block is zero:', 'Die Spannenergie der Feder wird zu Lageenergie; im höchsten Punkt ist die Geschwindigkeit des Klotzes null:')}</p>${dm(`${el('s')} = ${pot('h')}`)}`, ALL, [0, 1]),
      step(L('Height and distance', 'Höhe und Strecke'), `<p>${L('Along the slope the block covers $d$ and rises by', 'Entlang der Ebene legt der Klotz $d$ zurück und steigt dabei um')} $h = d\\sin 30^\\circ = \\tfrac{1}{2}\\,d$:</p>` +
        dm('\\tfrac{1}{2}\\,k\\,s^2 = \\tfrac{1}{2}\\,m\\,g\\,d \;\\Rightarrow\; d = \\frac{k\\,s^2}{m\\,g}'), ALL),
    ],
    hint: () => m$(`${el('s')} = ${pot('h')}`) + L(', with ', ', mit ') + m$('h = d\\sin 30^\\circ'),
  };
  // the stop at the foot of the slope, the spring up to us (where its end is; relaxed at u = 0.7)
  // and the block at u (on the spring, or beyond it once it has left)
  function launchParts(fig, sl, us, u, cls = 'body') {
    const Q = sl.at(0.97), P = sl.at(us), a = 13;
    fig.line(Q[0], Q[1], Q[0] + 30 * sl.n[0], Q[1] + 30 * sl.n[1], 'w plate');
    fig.spring([Q[0] + a * sl.n[0], Q[1] + a * sl.n[1]], [P[0] + a * sl.d[0] + a * sl.n[0], P[1] + a * sl.d[1] + a * sl.n[1]], 6, 6);
    slopeBlock(fig, sl, sl.at(u), cls);
  }

  // ---------------------------------------------------------------- 17 down a ramp into a spring buffer
  // the ramp on the right, the floor, the spring on the wall at the left (px)
  const RS = { H: 120, L0: 90, C: 30, xr: 260, xt: 380, xm: 210 }; // xm: the cart in ②
  const rampSpring = {
    id: 'ramp-spring', difficulty: 3, spring: true,
    make(r) {
      const m = pick(r, [0.2, 0.5, 1, 1.5, 2]), h = pick(r, [0.2, 0.3, 0.5, 0.8, 1, 1.2, 1.5, 2]), k = pick(r, [100, 200, 400, 500, 800, 1000, 2000]);
      const s = Math.sqrt((2 * m * G * h) / k);
      return s >= 0.03 && s <= 0.5 ? { V: { g: G, m, h, k, s, v: Math.sqrt(2 * G * h) } } : null;
    },
    vars: () => ['g', 'h', 'k', 'm'],
    want: () => ({ key: 's', unit: 'm', what: L('compression', 'Stauchung') }),
    f: () => (V) => Math.sqrt((2 * V.m * V.g * V.h) / V.k),
    tex: () => '\\sqrt{\\frac{2\\,m\\,g\\,h}{k}}',
    insert: (p) => `\\sqrt{\\frac{2\\cdot ${tq(p.V.m, 'kg')}\\cdot ${gq()}\\cdot ${tq(p.V.h, 'm')}}{${tq(p.V.k, 'k')}}}`,
    traps: () => [
      { flag: 'root', f: (V) => (2 * V.m * V.g * V.h) / V.k, tex: '\\frac{2\\,m\\,g\\,h}{k}' },
      { flag: 'half', f: (V) => Math.sqrt((V.m * V.g * V.h) / V.k), tex: '\\sqrt{\\frac{m\\,g\\,h}{k}}' },
      { flag: 'half', f: (V) => Math.sqrt((4 * V.m * V.g * V.h) / V.k), tex: '\\sqrt{\\frac{4\\,m\\,g\\,h}{k}}' },
      { flag: 'weight', f: (V) => Math.sqrt((2 * V.m * V.h) / V.k), tex: '\\sqrt{\\frac{2\\,m\\,h}{k}}' },
    ],
    states: (p) => { const E = p.V.m * G * p.V.h; return [{ pot: E }, { kin: E }, { el: E }]; },
    energies: () => [{ pot: pot('h') }, { kin: kin('v') }, { el: el('s') }],
    efun: () => [{ pot: Pot((V) => V.h) }, { kin: Kin((V) => V.v) }, { el: El((V) => V.s) }],
    esyms: () => ['m', 'g', 'h', 'v', 'k', 's'],
    zero: () => L('the floor', 'der Boden'),
    title: () => L('Down the ramp into the buffer', 'Die Rampe hinunter in den Puffer'),
    text: (p, formal) => (formal
      ? L('A cart of mass $m$ is released from rest at a height $h$ on a smooth ramp. It rolls down, along the floor, and into a spring buffer with spring constant $k$. How far does it compress the spring? Express $s$ in terms of $m$, $h$, $k$ and $g$.',
        'Ein Wagen der Masse $m$ wird auf einer glatten Rampe in der Höhe $h$ aus der Ruhe losgelassen. Er rollt hinunter, über den Boden und in einen Federpuffer mit der Federkonstanten $k$. Wie stark drückt er die Feder zusammen? Drücke $s$ durch $m$, $h$, $k$ und $g$ aus.')
      : L(`A cart of ${q(p.V.m, 'kg')} is released from rest ${q(p.V.h, 'm')} high on a smooth ramp. It rolls down, along the floor, and into a spring buffer with a spring constant of ${q(p.V.k, 'k')}. How far does it compress the spring?`,
        `Ein Wagen von ${q(p.V.m, 'kg')} wird auf einer glatten Rampe ${q(p.V.h, 'm')} über dem Boden aus der Ruhe losgelassen. Er rollt hinunter, über den Boden und in einen Federpuffer mit der Federkonstanten ${q(p.V.k, 'k')}. Wie stark drückt er die Feder zusammen?`)),
    scene(p, formal, view) {
      const fig = new Fig(this.title()), { H, L0, C, xt } = RS;
      rampSpringTrack(fig);
      const top = rsAt(0), mid = [RS.xm, -R], low = [L0 - C + R, -R];
      fig.spring([0, -R], [L0 - C, -R], 7, 5);
      fig.circle(top[0], top[1], R, 'body ball');
      fig.circle(mid[0], mid[1], R, 'body ball');
      fig.circle(low[0], low[1], R, 'body ball');
      atRest(fig, top[0] - R - 50, top[1] - R + 2);
      speed(fig, mid[0] - R - 4, mid[1], [-1, 0], S('v'), 30, [-4, -12]);
      atRest(fig, low[0] + R + 6, low[1] + 5);
      fig.text(16, -2 * R - 46, given('k', formal, p.V.k, 'k'), 'lbl', 'start');
      fig.line(L0, -2 * R - 4, L0, -2 * R - 24, 'w dash');
      fig.line(L0 - C, -2 * R - 4, L0 - C, -2 * R - 24, 'w dash');
      fig.arrow(L0, -2 * R - 16, L0 - C, -2 * R - 16, 'dimarrow');
      fig.text(L0 - C / 2, -2 * R - 22, wanted('s'), 'lbl', 'middle');
      fig.dim(xt + 34, 0, -H, given('h', formal, p.V.h, 'm'), 1);
      fig.line(xt + 6, -H, xt + 40, -H, 'w dash');
      zeroLine(fig, xt + 50, xt + 52, 0);
      fig.state(top[0] - 4, top[1] - 2 * R - 12, 0, hl(view, 0));
      fig.state(mid[0], 26, 1, hl(view, 1));
      fig.state(low[0], 26, 2, hl(view, 2));
      return fig;
    },
    steps: () => [
      step(L('Energy conservation ①③', 'Energieerhaltung ①③'), `<p>${L('All the potential energy at the top becomes kinetic energy on the floor (②) and then elastic energy in the spring; at ① and ③ the cart is at rest:', 'Die ganze Lageenergie oben wird zu kinetischer Energie auf dem Boden (②) und dann zu Spannenergie in der Feder; in ① und ③ ruht der Wagen:')}</p>` +
        dm(`${pot('h')} = ${el('s')}`), ALL, [0, 2]),
      step(L('Solve', 'Auflösen'), dm('s^2 = \\frac{2\\,m\\,g\\,h}{k} \;\\Rightarrow\; s = \\sqrt{\\frac{2\\,m\\,g\\,h}{k}}') +
        `<p>${L('The speed on the floor is not needed: state ② only passes the energy on.', 'Die Geschwindigkeit auf dem Boden braucht es nicht: Zustand ② gibt die Energie nur weiter.')}</p>`, ALL),
    ],
    hint: () => m$(`${pot('h')} = ${el('s')}`),
  };
  // the ramp of rampSpring: a curve from the top (xt, −H) down to the floor at xr, as points
  const rsCurve = (() => {
    const { H, xr, xt } = RS, pts = [];
    for (let k = 0; k <= 30; k++) { const t = k / 30, a = [xt, -H], c = [xr + 90, 0], b = [xr, 0]; pts.push([0, 1].map((j) => (1 - t) * (1 - t) * a[j] + 2 * t * (1 - t) * c[j] + t * t * b[j])); }
    return pts;
  })();
  // where a ball on the ramp touches it, and its centre, at t (0 at the top, 1 at the floor)
  function rsAt(t, contact) {
    const pts = rsCurve, x = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)), f = x - i;
    const a = pts[i], b = pts[i + 1], d = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(...d), c = [a[0] + d[0] * f, a[1] + d[1] * f];
    return contact ? c : [c[0] - (d[1] / n) * R, c[1] + (d[0] / n) * R];
  }
  function rampSpringTrack(fig) {
    const { xt } = RS;
    fig.surface(-10, xt + 30, 0);
    fig.wall(0, 0, -60);
    fig.path(`M${rsCurve.map((q) => q.map((y) => y.toFixed(1)).join(' ')).join('L')}`, rsCurve, 'track');
  }

  const SCENARIOS = [fall, partDrop, ekin, incline, launcher, buffer, pendulum, ramp, tower, springUp, slopeLaunch, rampSpring, speedFrac, dropSpring, twice, bungee, hang];

  // helpers for the animations (motion.js)
  const helpers = { R, PW, ball, groundAt, ceilingAt, zeroLine, track, tangentAt, heightAt, DIRS, slope, slopeBlock, launchParts, RS, rsCurve, rsAt, rampSpringTrack };
  root.Scenarios = { SCENARIOS, helpers };
  if (typeof module !== 'undefined') module.exports = root.Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
