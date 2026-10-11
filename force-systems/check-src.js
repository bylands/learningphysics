// The check (see check.js, shared by the apps): the learning objectives, each with the kinds of
// question that test it, its worked example and its practice topic (lessons.js), and the
// questions. Each is about one situation, with four options and no calculation: the forces on a
// box, a component of the weight on a slope, an equation for a system along an axis, the system
// that gives a rope force, or the wrong step in a student's attempt.
(function (root) {
  'use strict';

  const FS = root.FS, { generateFor, practiceOf, SCENARIOS, KINDS, MOTION } = root.Forces, Equations = root.Equations;
  const L = (en, de) => FS.L(en, de);

  const OBJECTIVES = [
    { id: 'forces', kinds: ['forces-one', 'forces-two'], tutor: 1, topic: 1,
      name: () => L('Choose a system and draw every force on it: weight, normal force, rope or contact force, static or kinetic friction, a push or pull, and no other.',
        'Ein System wählen und jede Kraft darauf einzeichnen: Gewichtskraft, Normalkraft, Seil- oder Kontaktkraft, Haft- oder Gleitreibung, eine Zug- oder Druckkraft, und keine andere.') },
    { id: 'slope', kinds: ['slope-comp', 'slope-perp'], tutor: 4, topic: 4,
      name: () => L('Resolve the weight on a slope into components parallel and perpendicular to the slope.',
        'Die Gewichtskraft auf einer schiefen Ebene in Komponenten parallel und senkrecht zur Unterlage zerlegen.') },
    { id: 'system', kinds: ['system'], tutor: 2, topic: 2,
      name: () => L('Choose the system so that a wanted force between two bodies, such as a rope force, becomes an external force.',
        'Das System so wählen, dass eine gesuchte Kraft zwischen zwei Körpern, etwa eine Seilkraft, zu einer äusseren Kraft wird.') },
    { id: 'law', kinds: ['law-floor', 'law-pulley'], tutor: 3, topic: 3,
      name: () => L('Set up Newton’s second law along each axis, following the strategy: system, forces, axes, components, equations, then solve.',
        'Das Aktionsprinzip für jede Achse aufstellen, nach dem Vorgehen: System, Kräfte, Achsen, Komponenten, Gleichungen, dann auflösen.') },
    { id: 'spring', kinds: ['spring-forces', 'spring-dir', 'spring-law'], tutor: 6, topic: 6,
      name: () => L('Draw the spring force where the spring is attached, back towards its relaxed length (a stretched spring pulls, a compressed one pushes), find it with F = k Δx and use it in Newton’s second law.',
        'Die Federkraft dort einzeichnen, wo die Feder befestigt ist, zurück zu ihrer entspannten Länge (eine gedehnte Feder zieht, eine gestauchte drückt), sie mit F = k Δx bestimmen und im Aktionsprinzip verwenden.') },
    { id: 'drag', kinds: ['drag-forces', 'drag-dir', 'drag-law'], tutor: 7, topic: 7,
      name: () => L('Draw air resistance against the velocity (not the acceleration), knowing that it grows with speed, and use it in Newton’s second law: at terminal velocity it balances the weight.',
        'Den Luftwiderstand gegen die Geschwindigkeit (nicht gegen die Beschleunigung) einzeichnen, im Wissen, dass er mit der Geschwindigkeit wächst, und ihn im Aktionsprinzip verwenden: Bei der Endgeschwindigkeit hält er der Gewichtskraft das Gleichgewicht.') },
    { id: 'error', kinds: ['error'], tutor: 8, topic: 8,
      name: () => L('Find the wrong step in a student’s free-body diagram and equations.', 'Den falschen Schritt in den Kräften und Gleichungen einer Schülerin finden.') },
  ];

  // The idea behind each wrong-answer flag.
  const concept = {
    flatN: 'normal', rope: 'rope', motion: 'motion', noFric: 'friction', swap: 'comp', whole: 'comp', noSlope: 'slope',
    internal: 'internal', mass: 'mass', pass: 'pass', balance: 'balance',
    stretch: 'stretch', hooke: 'hooke', accel: 'accel', terminal: 'terminal', noDrag: 'noDrag',
    // the slips in a student's drawing (find the error)
    noSpring: 'noSpring', springDir: 'stretch', dragDir: 'dragDir', dragRest: 'dragRest', dragSize: 'dragSize',
  };
  const concepts = () => ({
    normal: L('normal force taken equal to the weight', 'Normalkraft gleich Gewichtskraft gesetzt'),
    rope: L('rope force taken equal to a weight', 'Seilkraft gleich einer Gewichtskraft gesetzt'),
    motion: L('a “force of motion” drawn', 'eine „Bewegungskraft“ eingezeichnet'),
    friction: L('friction forgotten', 'Reibung vergessen'),
    comp: L('components of a force mixed up', 'Komponenten einer Kraft verwechselt'),
    slope: L('component down the slope forgotten', 'Hangabtriebskraft vergessen'),
    internal: L('internal forces counted for the whole system', 'innere Kräfte beim ganzen System mitgezählt'),
    mass: L('the mass of another system', 'die Masse eines anderen Systems genommen'),
    pass: L('the whole force passed on', 'die ganze Kraft weitergegeben'),
    balance: L('forces taken as balanced although the box accelerates', 'Kräftegleichgewicht trotz Beschleunigung angenommen'),
    stretch: L('spring force drawn along the stretch instead of back towards the relaxed length', 'Federkraft in Richtung der Dehnung statt zurück zur entspannten Länge eingezeichnet'),
    hooke: L('law of the spring F = k Δx misapplied', 'Federgesetz F = k Δx falsch angewandt'),
    accel: L('air resistance drawn against the acceleration instead of the velocity', 'Luftwiderstand gegen die Beschleunigung statt gegen die Geschwindigkeit eingezeichnet'),
    terminal: L('air resistance taken equal to the weight although the speed changes', 'Luftwiderstand gleich Gewichtskraft gesetzt, obwohl sich die Geschwindigkeit ändert'),
    noDrag: L('air resistance forgotten', 'Luftwiderstand vergessen'),
    noSpring: L('spring force forgotten', 'Federkraft vergessen'),
    dragDir: L('air resistance drawn along the velocity', 'Luftwiderstand in Richtung der Geschwindigkeit eingezeichnet'),
    dragRest: L('air resistance drawn on a body at rest', 'Luftwiderstand auf einen ruhenden Körper eingezeichnet'),
    dragSize: L('air resistance larger or smaller than the weight, against what the motion shows', 'Luftwiderstand grösser oder kleiner als die Gewichtskraft, anders als es die Bewegung zeigt'),
  });
  // what is correct instead (the typical slips in practice, slips.js)
  const fixes = () => ({
    normal: L('The normal force is whatever the surface must push so that the body does not sink in or lift off: equal to the weight only on a level surface with no other vertical forces.',
      'Die Normalkraft ist so gross, wie die Unterlage drücken muss, damit der Körper weder einsinkt noch abhebt: gleich der Gewichtskraft nur auf ebener Unterlage ohne weitere senkrechte Kräfte.'),
    rope: L('The rope force equals a hanging weight only if that body does not accelerate; otherwise it follows from Newton’s second law for that body.',
      'Die Seilkraft ist nur gleich einer hängenden Gewichtskraft, wenn dieser Körper nicht beschleunigt; sonst folgt sie aus dem zweiten Newtonschen Gesetz für ihn.'),
    motion: L('Motion needs no force to keep it going: draw only forces exerted by a body (or the Earth) on the system.',
      'Bewegung braucht keine Kraft, die sie aufrechterhält: Nur Kräfte einzeichnen, die ein Körper (oder die Erde) auf das System ausübt.'),
    friction: L('Wherever a body slides on a rough surface, or would slide, friction acts along the surface.',
      'Wo ein Körper auf rauer Unterlage gleitet oder gleiten würde, wirkt Reibung entlang der Unterlage.'),
    comp: L('On a slope, the component along the slope is m g sin α and the one perpendicular to it m g cos α.',
      'Am Hang ist die Komponente entlang des Hangs m g sin α und die senkrechte dazu m g cos α.'),
    slope: L('On a slope, the weight has a component down the slope, m g sin α: it belongs in the equation along the slope.',
      'Am Hang hat die Gewichtskraft eine Komponente hangabwärts, m g sin α: Sie gehört in die Gleichung entlang des Hangs.'),
    internal: L('Forces between parts of the system cancel in pairs: for the whole system, count only the external forces.',
      'Kräfte zwischen Teilen des Systems heben sich paarweise auf: Beim ganzen System nur die äusseren Kräfte zählen.'),
    mass: L('In F = m a, m is the mass of the system the forces act on.', 'In F = m a ist m die Masse des Systems, auf das die Kräfte wirken.'),
    pass: L('A force is not passed on whole: the front body also needs part of it to accelerate itself.',
      'Eine Kraft wird nicht ganz weitergegeben: Der vordere Körper braucht einen Teil davon, um sich selbst zu beschleunigen.'),
    balance: L('If the body accelerates, the forces are not balanced: their sum is m a.', 'Wenn der Körper beschleunigt, sind die Kräfte nicht im Gleichgewicht: Ihre Summe ist m a.'),
    stretch: L('A spring pulls or pushes back towards its relaxed length: a stretched spring pulls, a compressed one pushes.',
      'Eine Feder zieht oder drückt zurück zu ihrer entspannten Länge: Eine gedehnte Feder zieht, eine gestauchte drückt.'),
    hooke: L('F = k Δx with Δx the change in length from the relaxed length, not the length itself.',
      'F = k Δx mit Δx der Längenänderung gegenüber der entspannten Länge, nicht der Länge selbst.'),
    accel: L('Air resistance always points against the velocity, whatever the acceleration.', 'Der Luftwiderstand zeigt immer gegen die Geschwindigkeit, wie auch immer die Beschleunigung ist.'),
    terminal: L('Air resistance equals the weight only at constant (terminal) velocity; while the speed changes, it is smaller or larger.',
      'Der Luftwiderstand ist nur bei konstanter Geschwindigkeit (Endgeschwindigkeit) gleich der Gewichtskraft; solange sich die Geschwindigkeit ändert, ist er kleiner oder grösser.'),
    noDrag: L('Anything moving through the air feels air resistance against its velocity.', 'Alles, was sich durch die Luft bewegt, erfährt Luftwiderstand gegen seine Geschwindigkeit.'),
    noSpring: L('A stretched or compressed spring attached to the body exerts a force on it.', 'Eine gedehnte oder gestauchte Feder, die am Körper befestigt ist, übt eine Kraft auf ihn aus.'),
    dragDir: L('Air resistance points against the velocity, never along it.', 'Der Luftwiderstand zeigt gegen die Geschwindigkeit, nie in ihre Richtung.'),
    dragRest: L('A body at rest feels no air resistance.', 'Ein ruhender Körper erfährt keinen Luftwiderstand.'),
    dragSize: L('Speeding up: air resistance smaller than the weight; slowing down: larger; constant speed: equal.',
      'Wird er schneller, ist der Luftwiderstand kleiner als die Gewichtskraft; wird er langsamer, grösser; bei konstanter Geschwindigkeit gleich.'),
  });

  const ONE = ['rest-up', 'rest-angle', 'pull-friction', 'incline-pull'], TWO = ['push-pair', 'rope-pair', 'atwood', 'table-pulley', 'incline-pulley'];
  const SPRING = ['spring-hang', 'spring-floor'], DRAG = ['drag-fall', 'drag-bike'];
  const MARKS = new Set(['v', 'a']);
  const LISTS = { 'forces-one': ONE, 'forces-two': TWO, 'spring-forces': SPRING, 'drag-forces': DRAG };
  const shuffle = (r, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const byId = (id) => SCENARIOS.find((s) => s.id === id);
  // the free-body diagram (all forces, the first step of the worked solution), with hl highlighted
  const fbd = (ex, hl = []) => ex.figure({ show: new Set(ex.steps[0].show), hl: new Set(hl) });
  const explain = (ex, html) => () => `<div class="figs">${fbd(ex)}</div><div class="steps">${html}</div>`;
  const choose = (it) => it.options.map((o) => ({ html: o.html, correct: !!o.right, flag: o.flag, why: o.why }));

  // Which forces act on a box: the right list, and lists with one force too many or too few,
  // first a force of motion and friction left out.
  function forces(kind, seed) {
    const r = FS.rng(seed), scn = byId(FS.pick(r, LISTS[kind])), ex = generateFor(scn.id, seed), t = ex.forces;
    const i = Math.floor(r() * t.boxes.length), on = t.table[i], name = (j) => t.kinds[j].name;
    const list = (js, extra) => [...js.map(name), ...(extra ? [extra] : [])].join(', ');
    const has = t.kinds.map((k, j) => j).filter((j) => on[j]), s = KINDS.indexOf('s'), rf = KINDS.indexOf('r');
    const typical = [], other = [];
    if (!scn.still && !on[s]) typical.push({ html: list(has, MOTION()), flag: 'motion', why: L('There is no “force of motion”: every force comes from a body that pushes or pulls (or from the Earth).', 'Es gibt keine „Bewegungskraft“: Jede Kraft kommt von einem Körper, der drückt oder zieht (oder von der Erde).') });
    if (on[rf]) typical.push({ html: list(has.filter((j) => j !== rf)), flag: 'noFric', why: L('Friction is missing: it acts wherever a box slides or would slide.', 'Die Reibung fehlt: Sie wirkt, wo immer eine Kiste gleitet oder gleiten würde.') });
    const df = t.kinds.findIndex((k) => k.kind === 'd'), art = (j) => (j === df ? 'der' : 'die');
    if (df >= 0 && on[df]) typical.push({ html: list(has.filter((j) => j !== df)), flag: 'noDrag', why: L('Air resistance is missing: it acts against the velocity of anything that moves through the air.', 'Der Luftwiderstand fehlt: Er wirkt gegen die Geschwindigkeit von allem, was sich durch die Luft bewegt.') });
    has.filter((j) => j && j !== rf && j !== df).forEach((j) => other.push({ html: list(has.filter((x) => x !== j)), why: L(`The ${name(j)} is missing.`, `Es fehlt ${art(j)} ${name(j)}.`) }));
    t.kinds.forEach((k, j) => { if (!on[j] && j !== s) other.push({ html: list(t.kinds.map((x, y) => y).filter((y) => on[y] || y === j)), why: L(`No ${name(j)} acts on it.`, `Auf sie wirkt ${k.kind === 'd' ? 'kein' : 'keine'} ${name(j)}.`) }); });
    const options = [{ html: list(has), correct: true }, ...shuffle(r, typical), ...shuffle(r, other)].slice(0, 4);
    // with drag, the body with its velocity and acceleration only, so that the drawing does not give the drag away
    const figure = kind === 'drag-forces' ? ex.figure({ show: MARKS }) : ex.figure({ task: true });
    return { title: ex.title, text: `<p>${byId(ex.scenario).text(ex.p)}</p>`, figure,
      ask: L(`Which forces act on ${t.boxes[i]}?`, `Welche Kräfte wirken auf ${t.boxes[i]}?`), options: shuffle(r, options),
      explain: explain(ex, ex.solution[0]), key: `${ex.scenario}|${JSON.stringify(ex.p)}|${i}` };
  }

  // A component of the weight on a slope: m g sin α, m g cos α, m g tan α or m g.
  function component(seed) {
    const r = FS.rng(seed), scn = byId(FS.pick(r, ['incline-pull', 'incline-pulley'])), ex = generateFor(scn.id, seed);
    const c = FS.pick(r, scn.comps(ex.p)), other = c.fn === 'sin' ? 'cos' : 'sin';
    const options = [
      { html: `$${c.base}\\${c.fn}\\alpha$`, correct: true },
      { html: `$${c.base}\\${other}\\alpha$`, flag: 'swap', why: L('Sine and cosine swapped: the angle of the slope is also the angle between the weight and the perpendicular to the slope; the component next to it is m g cos α.', 'Sinus und Kosinus vertauscht: Der Neigungswinkel ist auch der Winkel zwischen der Gewichtskraft und der Senkrechten zur Unterlage; die Komponente an ihm ist m g cos α.') },
      { html: `$${c.base}\\tan\\alpha$`, flag: 'swap', why: L('tan α is the ratio of two components, not a component.', 'tan α ist das Verhältnis zweier Komponenten, keine Komponente.') },
      { html: `$${c.base}$`, flag: 'whole', why: L('Only a part of the weight acts in this direction.', 'Nur ein Teil der Gewichtskraft wirkt in diese Richtung.') },
    ];
    const step = ex.steps.find((s) => (s.hl || []).includes('Gp'));
    return { title: ex.title, text: `<p>${scn.text(ex.p)}</p>`, figure: ex.figure({ show: new Set(['G', 'Gp', 'Gn']), hl: new Set([c.fig]) }),
      ask: `${c.what.replace(/:$/, '')}: $${c.sym} = {?}$`, options: shuffle(r, options),
      explain: () => `<div class="figs">${ex.figure({ show: new Set(step.show), hl: new Set(step.hl) })}</div><div class="steps">${step.text}</div>`, key: `comp|${scn.id}|${c.key}` };
  }

  // An equation of a situation: with keys, one of those equations.
  function law(ids, seed, keys) {
    const r = FS.rng(seed), id = FS.pick(r, ids), ex = generateFor(id, seed);
    const list = Equations.of(id, ex.p), it = FS.pick(r, keys ? list.filter((e) => keys.includes(e.key)) : list);
    return { title: ex.title, text: `<p>${byId(id).text(ex.p)}</p>`, figure: fbd(ex),
      ask: `${L('Which equation is right?', 'Welche Gleichung stimmt?')} ${it.what.replace(/:$/, '.')}`, options: choose(it),
      explain: explain(ex, `<p>${it.value}</p>`), key: `${id}|${it.key}` };
  }

  // The force between two boxes: for which system, with which equation? The right one is for one
  // box alone; for both boxes together the force does not appear (the right equation) or appears
  // wrongly (an internal force); and the box alone with a typical wrong idea.
  function system(seed) {
    const r = FS.rng(seed), id = FS.pick(r, TWO), ex = generateFor(id, seed), list = Equations.of(id, ex.p);
    const it = FS.pick(r, list.filter((e) => e.want)), both = list.find((e) => e.sys && !e.want);
    const opt = (e, o, more) => ({ html: `${e.sys}: ${o.html}`, ...more });
    const wrong = it.options.filter((o) => !o.right), typical = wrong.filter((o) => ['rope', 'pass', 'mass'].includes(o.flag));
    const w = FS.pick(r, typical.length ? typical : wrong), inner = both.options.find((o) => o.flag === 'internal');
    const force = it.want === 'S' ? L('rope force', 'Seilkraft') : L('force between the boxes', 'Kraft zwischen den Kisten');
    const options = [
      opt(it, it.options.find((o) => o.right), { correct: true }),
      opt(both, both.options.find((o) => o.right), { flag: 'internal', why: L(`Right, but the ${force} does not appear in it: for both boxes together it is an internal force.`, `Richtig, aber die ${force} kommt darin nicht vor: Für beide Kisten zusammen ist sie eine innere Kraft.`) }),
      opt(both, inner, { flag: 'internal', why: inner.why }),
      opt(it, w, { flag: w.flag, why: w.why }),
    ];
    return { title: ex.title, text: `<p>${byId(id).text(ex.p)}</p>`, figure: fbd(ex),
      ask: L(`You want the ${force} $${FS.tex(it.want)}$. Which system and equation give it?`, `Gesucht ist die ${force} $${FS.tex(it.want)}$. Welches System und welche Gleichung liefern sie?`),
      options: shuffle(r, options), explain: explain(ex, `<p>${it.sys}: ${it.value}</p><p>${both.sys}: ${both.value}</p>`), key: `${id}|${it.key}` };
  }

  // The wrong step in a student's attempt (practice's "find the error").
  function error(seed) {
    const r = FS.rng(seed), ex = practiceOf(FS.pick(r, ['error-floor', 'error-pulley', 'error-slope', 'error-spring', 'error-drag']), seed);
    return { title: ex.title, text: ex.text, figure: ex.taskFigure(), ask: L('Which step is wrong?', 'Welcher Schritt ist falsch?'), options: choose(ex.eqs[0]),
      explain: () => `<div class="figs">${ex.solutionFigure()}</div><div class="steps">${ex.solution.join('')}</div>` };
  }

  // The spring force on the box: its direction and size. Wrong: along the stretch or compression,
  // and Δx in centimetres taken as metres.
  const ARROW = () => ({ up: ['↑', L('upwards', 'nach oben')], down: ['↓', L('downwards', 'nach unten')], left: ['←', L('to the left', 'nach links')], right: ['→', L('to the right', 'nach rechts')] });
  const way = (d) => { const [a, w] = ARROW()[d]; return `${a} ${w}`; };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  function springDir(seed) {
    const r = FS.rng(seed), id = FS.pick(r, SPRING), ex = generateFor(id, seed), p = ex.p, v = ex.v;
    const d = id === 'spring-hang' ? 'up' : p.state === 'stretch' ? 'left' : 'right', o = OPP[d], dx = id === 'spring-hang' ? v.dx : p.dx, F = v.Fs, cmF = p.k * dx;
    const opt = (dir, f) => `${way(dir)}, ${FS.q(f, 'N')}`;
    const pushed = id === 'spring-hang' ? p.state === 'stand' : p.state === 'compress';
    const along = L(`That is the direction in which the spring was ${pushed ? 'compressed' : 'stretched'}. The spring force points the other way: back towards its relaxed length (${pushed ? 'a compressed spring pushes' : 'a stretched spring pulls'}).`,
      `Das ist die Richtung, in die die Feder ${pushed ? 'gestaucht' : 'gedehnt'} wurde. Die Federkraft zeigt in die andere Richtung: zurück zu ihrer entspannten Länge (${pushed ? 'eine gestauchte Feder drückt' : 'eine gedehnte Feder zieht'}).`);
    const unit = L(`Δx must be in metres: ${FS.q(dx, 'cm')} = ${FS.num(dx / 100, 3)} m.`, `Δx muss in Metern stehen: ${FS.q(dx, 'cm')} = ${FS.num(dx / 100, 3)} m.`);
    const more = id === 'spring-hang' && p.given === 'k' ? ` ${pushed ? L(`The spring is compressed by ${FS.q(dx, 'cm')}.`, `Die Feder ist um ${FS.q(dx, 'cm')} gestaucht.`) : L(`The spring is stretched by ${FS.q(dx, 'cm')}.`, `Die Feder ist um ${FS.q(dx, 'cm')} gedehnt.`)}`
      : id === 'spring-hang' ? ` ${L(`The spring constant is ${FS.q(p.k, 'Nm')}.`, `Die Federkonstante beträgt ${FS.q(p.k, 'Nm')}.`)}` : '';
    const options = [
      { html: opt(d, F), correct: true },
      { html: opt(o, F), flag: 'stretch', why: along },
      { html: opt(d, cmF), flag: 'unit', why: unit },
      { html: opt(o, cmF), flag: 'stretch', why: `${along} ${unit}` },
    ];
    return { title: ex.title, text: `<p>${byId(id).text(p)}${more}</p>`, figure: ex.figure({ task: true }),
      ask: L('Which is the spring force on the box, in direction and size?', 'Welches ist die Federkraft auf die Kiste, nach Richtung und Grösse?'), options: shuffle(r, options),
      explain: explain(ex, ex.solution.slice(0, 2).join('')), key: `sdir|${id}|${JSON.stringify(p)}` };
  }

  // Air resistance on a body whose velocity and acceleration differ (a cyclist coasting, a
  // skydiver whose parachute opens) or at terminal velocity: which way it points, and how large
  // it is compared with the weight.
  function dragDir(seed) {
    const r = FS.rng(seed), c = FS.pick(r, ['bike', 'chute', 'terminal']);
    const ex = c === 'bike' ? generateFor('drag-bike', seed) : generateFor('drag-fall', seed, { phase: c }), p = ex.p;
    const she = c === 'bike' ? L('the cyclist', 'die Radfahrerin') : L('the skydiver', 'die Fallschirmspringerin');
    const accel = { flag: 'accel', why: L('Air resistance acts against the velocity, not against the acceleration.', 'Der Luftwiderstand wirkt gegen die Geschwindigkeit, nicht gegen die Beschleunigung.') };
    const list = {
      bike: [
        [L('← backwards, against her velocity', '← nach hinten, gegen ihre Geschwindigkeit'), true],
        [L('→ forwards, against her acceleration', '→ nach vorn, gegen ihre Beschleunigung'), false, accel],
        [L('← backwards, balanced by a force of motion forwards that keeps her rolling', '← nach hinten, im Gleichgewicht mit einer Bewegungskraft nach vorn, die sie rollen lässt'), false,
          { flag: 'motion', why: L('There is no “force of motion”: once she stops pedalling, nothing pushes her forwards. She keeps rolling by inertia, and slows down.', 'Es gibt keine „Bewegungskraft“: Sobald sie nicht mehr tritt, treibt sie nichts mehr nach vorn an. Sie rollt aus Trägheit weiter und wird langsamer.') }],
        [L('← backwards, as large as her weight', '← nach hinten, so gross wie ihre Gewichtskraft'), false,
          { flag: 'terminal', why: L('Air resistance equals the weight only for a body falling at terminal velocity. Here it is the only horizontal force: m a, much less than her weight.', 'Der Luftwiderstand ist nur bei einem Körper, der mit Endgeschwindigkeit fällt, gleich der Gewichtskraft. Hier ist er die einzige waagrechte Kraft: m a, viel kleiner als ihre Gewichtskraft.') }],
      ],
      chute: [
        [L('↑ upwards, against her velocity, larger than her weight', '↑ nach oben, gegen ihre Geschwindigkeit, grösser als ihre Gewichtskraft'), true],
        [L('↓ downwards, against her acceleration', '↓ nach unten, gegen ihre Beschleunigung'), false, accel],
        [L('↑ upwards, as large as her weight', '↑ nach oben, so gross wie ihre Gewichtskraft'), false,
          { flag: 'terminal', why: L('She slows down, so the forces do not balance: the net force points up, and the air resistance is larger than her weight.', 'Sie wird langsamer, also heben sich die Kräfte nicht auf: Die resultierende Kraft zeigt nach oben, und der Luftwiderstand ist grösser als ihre Gewichtskraft.') }],
        [L('↑ upwards, smaller than her weight, since she still falls', '↑ nach oben, kleiner als ihre Gewichtskraft, da sie noch fällt'), false,
          { flag: 'motion', why: L('Falling down does not need a net force downwards: she slows down, so the net force points up, against her velocity.', 'Nach unten fallen braucht keine resultierende Kraft nach unten: Sie wird langsamer, also zeigt die resultierende Kraft nach oben, gegen ihre Geschwindigkeit.') }],
      ],
      terminal: [
        [L('↑ upwards, as large as her weight', '↑ nach oben, so gross wie ihre Gewichtskraft'), true],
        [L('↑ upwards, smaller than her weight, so that she keeps falling', '↑ nach oben, kleiner als ihre Gewichtskraft, damit sie weiterfällt'), false,
          { flag: 'motion', why: L('A constant speed needs no net force: the forces balance. She does not need a force downwards to keep falling.', 'Eine konstante Geschwindigkeit braucht keine resultierende Kraft: Die Kräfte heben sich auf. Sie braucht keine Kraft nach unten, um weiterzufallen.') }],
        [L('↑ upwards, larger than her weight', '↑ nach oben, grösser als ihre Gewichtskraft'), false,
          { flag: 'other', why: L('Then the net force would point up and she would slow down; her speed is constant.', 'Dann zeigte die resultierende Kraft nach oben, und sie würde langsamer; ihre Geschwindigkeit ist aber konstant.') }],
        [L('↓ downwards, along her velocity', '↓ nach unten, in Richtung ihrer Geschwindigkeit'), false,
          { flag: 'dir', why: L('Air resistance acts against the velocity: she falls down, so it points up.', 'Der Luftwiderstand wirkt gegen die Geschwindigkeit: Sie fällt nach unten, also zeigt er nach oben.') }],
      ],
    }[c].map(([html, correct, w]) => ({ html, correct, ...(w || {}) }));
    return { title: ex.title, text: `<p>${byId(ex.scenario).text(p)}</p>`, figure: ex.figure({ show: MARKS }),
      ask: L(`Which describes the air resistance on ${she}?`, `Was beschreibt den Luftwiderstand auf ${she}?`), options: shuffle(r, list),
      explain: explain(ex, ex.solution.slice(0, 2).join('')), key: `ddir|${c}|${p.m}` };
  }

  function question(kind, seed) {
    if (kind in LISTS) return forces(kind, seed);
    if (kind === 'spring-dir') return springDir(seed);
    if (kind === 'spring-law') return law(SPRING, seed);
    if (kind === 'drag-dir') return dragDir(seed);
    if (kind === 'drag-law') return law(DRAG, seed);
    if (kind === 'slope-comp') return component(seed);
    if (kind === 'slope-perp') return law(['incline-pull', 'incline-pulley'], seed, ['perp', 'fric']);
    if (kind === 'law-floor') return law(['rest-up', 'rest-angle', 'pull-friction', 'push-pair', 'rope-pair'], seed);
    if (kind === 'law-pulley') return law(['atwood', 'table-pulley'], seed);
    if (kind === 'system') return system(seed);
    return error(seed);
  }

  root.CheckSource = { id: 'fs', objectives: OBJECTIVES, question, concept, concepts, fixes };
  if (typeof module !== 'undefined') module.exports = root.CheckSource;
})(typeof window !== 'undefined' ? window : globalThis);
