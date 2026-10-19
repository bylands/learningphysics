// Exercises and worked examples from the scenarios (see scenarios.js) and their equations
// (equations.js). An exercise is { scenario, difficulty, title, text, forces (the table of forces),
// fields (the wanted quantities, for the worked solution: { key, sym, unit, what, value }),
// figure(view), taskFigure(ticked, extra), solutionFigure(), diagram() (the free-body diagram the
// student draws in practice, and its judging), comps (components to identify),
// eqs (equations to choose, see identify.js), nums (results to work out, typed or chosen, numItem),
// hints, solution, results, steps, p, v }.
// practiceOf(type, seed) gives a practice exercise of a situation, or of "find the error" (types
// 'error-floor', 'error-pulley', 'error-slope', 'error-spring', 'error-drag'); generateFor(scenario, seed) one with any angles
// (for the check); tutorial(lesson) the tutor's frames [{ text, figure }].
(function (root) {
  'use strict';

  const FS = root.FS, { SCENARIOS, NICE } = root.Scenarios, Equations = root.Equations;
  const { L, tex, tq, rng, pick } = FS;

  const byId = (id) => SCENARIOS.find((s) => s.id === id);

  // The way to solve a problem of dynamics, as on the method card.
  const STRATEGY = () => L('Choose the system, draw all forces on it, choose the axes, split the forces into components along them, set up Newton’s second law along each axis, then solve.',
    'System wählen, alle Kräfte darauf einzeichnen, Achsen wählen, die Kräfte in Komponenten entlang der Achsen zerlegen, das Aktionsprinzip für jede Achse aufstellen, dann auflösen.');

  // The kinds of force in the table of forces (see draw.js): weight, normal force, friction, a push
  // or pull from outside, and the rope or contact force between the boxes. Friction is static
  // friction on a box that stands still, kinetic friction on one that slides.
  // A scenario may add kinds of its own (scn.extra), after these: the spring force (f) and drag
  // (d), so that the student has to tell them apart.
  const KINDS = ['g', 'n', 'r', 's', 'k'];
  const kindsOf = (scn) => [...KINDS, ...(scn.extra || [])];
  const KIND_NAMES = {
    g: () => L('weight', 'Gewichtskraft'), n: () => L('normal force', 'Normalkraft'),
    r: (scn) => (scn.still ? L('static friction', 'Haftreibung') : L('kinetic friction', 'Gleitreibung')),
    s: () => L('push or pull from outside', 'Zug- oder Druckkraft von aussen'), k: () => L('rope or contact force', 'Seil- oder Kontaktkraft'),
    f: () => L('spring force', 'Federkraft'), d: () => L('air resistance (drag)', 'Luftwiderstand'),
  };
  // the force a student may add that does not exist
  const MOTION = () => L('a force in the direction of motion', 'eine Kraft in Bewegungsrichtung');
  // Which kinds of force act on which box: { boxes: [name], kinds, table[box][kind] }, from the
  // forces of the drawing (those ending in 2 act on box 2, the others on box 1, unless the
  // scenario says otherwise in forceOn; a force of size zero, e.g. friction without a friction
  // coefficient, does not act). cells[box][kind] are the ids of the forces in a cell.
  function forceTable(scn, p, v) {
    const boxes = scn.boxes ? scn.boxes(p) : [L(`the box (${FS.q(p.m, 'kg')})`, `die Kiste (${FS.q(p.m, 'kg')})`)];
    const kinds = kindsOf(scn), table = boxes.map(() => kinds.map(() => false)), cells = boxes.map(() => kinds.map(() => []));
    scn.scene(p, v, {}).forces.forEach((f) => {
      const j = kinds.indexOf(f.kind), i = boxOf(scn, f);
      if (j >= 0 && i < boxes.length && f.mag > 1e-9) { table[i][j] = true; cells[i][j].push(f.id); }
    });
    return { boxes, kinds: kinds.map((k) => ({ kind: k, name: KIND_NAMES[k](scn) })), table, cells };
  }
  const boxOf = (scn, f) => (scn.forceOn && f.id in scn.forceOn ? scn.forceOn[f.id] : /2$/.test(f.id) ? 1 : 0);

  // Arrows for the forces ticked in the table that do not act (or have no arrow), so that a
  // wrong tick shows a force too: at a fixed length, placed and turned as such a force would be:
  // a normal force pushing up from below, friction against the motion at the contact point, a
  // push or pull from outside along the motion, a rope pulling up, a spring pushing up, drag
  // against the motion. The box's centre comes from its weight, the contact point from its normal
  // force, the motion from the velocity arrow (v) or else the acceleration arrows.
  const PHANTOM = 40; // px
  // Where a force of kind k on box i starts, and its direction: the force's own where it acts (or
  // has size zero), else as described above; a "force in the direction of motion" (m, see
  // diagram) along the motion too.
  function placeOf(scn, sc, i, k) {
    const own = sc.forces.filter((f) => boxOf(scn, f) === i), of = (x) => own.find((f) => f.kind === x);
    const C = of('g').at, N = of('n');
    const mark = sc.marks.find((m) => m.id === 'v') || (sc.marks.length === 1 ? sc.marks[0] : sc.marks.find((m) => m.id === `a${i + 1}`));
    const m = mark ? mark.dir : null;
    const zero = of(k); // e.g. friction of size zero: its place in the drawing
    // each kind in a column of its own, beside the weight in the middle
    const vertical = m && Math.abs(m[1]) > 0.5;
    return zero ? { at: zero.at, dir: zero.dir }
      : k === 'n' ? { at: [C[0] + 22, C[1] + 28], dir: [0, -1] }
        : k === 'r' ? { at: N ? [N.at[0] - 24, N.at[1]] : [C[0] + 40, C[1] + 8], dir: m ? [-m[0], -m[1]] : [-1, 0] }
          : k === 's' ? { at: vertical ? [C[0] - 24, C[1] - 6] : [C[0] + 16, C[1] - 14], dir: m || [1, 0] }
            // a force of motion left of the weight, clear of a push or pull given on the right
            : k === 'm' ? { at: [C[0] - 22, C[1] - 12], dir: m || [1, 0] }
            : k === 'f' ? { at: [C[0] - 30, C[1] + 22], dir: [0, -1] }
              // air resistance at the centre, like the weight (beside it, clear of a spring above)
              : k === 'd' ? { at: m && !vertical ? [C[0] + 6, C[1] - 8] : [C[0] + 26, C[1]], dir: m ? [-m[0], -m[1]] : [0, -1] }
                : { at: [C[0] - 20, C[1] - 26], dir: [0, -1] };
  }
  // the symbol of a force of kind k on box i: the force's own, else as phantoms draw it
  function symOf(scn, sc, t, i, k) {
    const two = t.boxes.length > 1, f = sc.forces.find((x) => x.kind === k && boxOf(scn, x) === i);
    return f && k !== 'm' ? f.sym : [{ g: 'G', n: 'N', r: 'R', s: 'F', m: 'F', k: two ? 'K' : 'S', f: 'Fs', d: 'D' }[k], two ? String(i + 1) : ''];
  }
  function phantoms(scn, sc, t) {
    const out = [];
    t.boxes.forEach((b, i) => kindsOf(scn).forEach((k, j) => {
      if (t.cells[i][j].length) return;
      out.push({ id: `ph${i}${k}`, kind: k, ...placeOf(scn, sc, i, k), fixed: PHANTOM, sym: symOf(scn, sc, t, i, k), lab: [8, 0] });
    }));
    return out;
  }

  // The task with the forces ticked in the table drawn in: ticked { 'box:kind' } (see app.js).
  // extra: ids of forces to draw as well (the components identified, see comps)
  // tweak(sc): changes the scene's forces first (a student's drawing, see misdraw)
  function taskFigure(scn, p, v, t, ticked, extra = [], tweak = null) {
    const sc = scn.scene(p, v, { task: true });
    if (tweak) tweak(sc);
    sc.forces.push(...phantoms(scn, sc, t)); // always there, so that the drawing keeps its size
    const ids = new Set();
    t.boxes.forEach((b, i) => t.kinds.forEach(({ kind: k }, j) => {
      if (!ticked.has(`${i}:${j}`)) return;
      if (t.cells[i][j].length) t.cells[i][j].forEach((id) => ids.add(id));
      else ids.add(`ph${i}${k}`);
    }));
    extra.forEach((id) => ids.add(id));
    return sc.render({ task: true, ticked: ids });
  }

  // ---------------------------------------------------------------- the free-body diagram drawn
  // In practice the student draws the forces on each box (app.js, with arrow.js): from a palette
  // of the kinds of the table of forces, and on a moving body also "a force in the direction of
  // motion" (m), which does not exist. The forces given in the task (a push or pull, a given air
  // resistance) are drawn already and count as drawn. diagram() gives
  //   boxes      the anchors: { id (the box's index), label, area (its corners) }
  //   kinds      [{ id, name }] for the palette
  //   tail(k, i), sym(k, i)  where a force of kind k on box i starts, and its symbol
  //   dirs       the directions to snap to: the 8 of the compass, and along and perpendicular to a
  //              slope (the axes of every force to draw that is off the 8)
  //   len        the lengths of the arrows (svg units), a new one as long as a typical force of the
  //              solved drawing
  //   target     the forces to draw: { id, kind, anchor, dir (degrees, y up) }; len and group
  //              (the box) where two of them must be equally long, as the task makes it clear:
  //              two forces opposite each other on a box, of equal size, with every other force
  //              on it perpendicular to them (normal force and weight on a level floor, a spring
  //              or air resistance holding the weight at rest or at terminal velocity)
  //   judge(arrows, done)  the drawing judged (Arrow.judge, lengths within 20 % of the pair's
  //              mean): { ok, marks: { arrow id: 'ok' | 'bad' }, notes: [{ flag, text }] }, a note
  //              per force missing, turned, of the wrong length (one per pair) or too many,
  //              a nudge while the exercise is open, the explanation once done (solved or shown)
  const DEG = (d) => (((Math.round((Math.atan2(-d[1], d[0]) * 180) / Math.PI * 1e6) / 1e6) % 360) + 360) % 360;
  function diagram(scn, p, v, t) {
    const sc = scn.scene(p, v, { task: true }), kinds = kindsOf(scn);
    const acting = sc.forces.filter((f) => kinds.includes(f.kind) && f.mag > 1e-9);
    const given = acting.filter((f) => f.task);
    const target = acting.filter((f) => !f.task).map((f) => ({ id: f.id, kind: f.kind, anchor: boxOf(scn, f), dir: DEG(f.dir) }));
    const dot = (a, b) => a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1];
    t.boxes.forEach((b, i) => {
      const on = acting.filter((f) => boxOf(scn, f) === i);
      on.forEach((a) => on.forEach((c) => {
        if (a.id >= c.id || a.task || c.task || dot(a, c) > -1 + 1e-9 || Math.abs(a.mag - c.mag) > 1e-6 * a.mag) return;
        if (on.some((x) => x !== a && x !== c && Math.abs(dot(a, x)) > 1e-9)) return;
        target.filter((x) => x.id === a.id || x.id === c.id).forEach((x) => { x.len = 1; x.group = i; });
      }));
    });
    const axes = new Set([0, 45, 90, 135, 180, 225, 270, 315]);
    target.forEach((x) => { if (x.dir % 45) [0, 90, 180, 270].forEach((k) => axes.add((x.dir + k) % 360)); });
    return {
      boxes: t.boxes.map((label, i) => ({ id: i, label, area: sc.bodies[i] })),
      kinds: [...kinds, ...(scn.still ? [] : ['m'])].map((k) => ({ id: k, name: k === 'm' ? MOTION() : KIND_NAMES[k](scn) })),
      tail: (k, i) => placeOf(scn, sc, i, k).at,
      sym: (k, i) => symOf(scn, sc, t, i, k),
      dirs: [...axes].sort((a, b) => a - b),
      len: { lo: 24, hi: 112, step: 8, init: typical(sc, target) },
      target,
      given: given.map((f) => f.id),
      judge: (arrows, done) => judgeDrawing(scn, p, v, t, target, given, arrows, done),
    };
  }

  // The length of a new arrow: that of the middle one of the forces to draw in the solved drawing
  // (the same for every kind, so that it tells nothing about their sizes), to whole steps.
  function typical(sc, target) {
    const L = sc.lengths(), ls = target.map((x) => L[x.id]).sort((a, b) => a - b);
    return Math.max(32, Math.round(ls[Math.floor((ls.length - 1) / 2)] / 8) * 8);
  }

  // The drawing judged, with a note per thing wrong (see diagram).
  function judgeDrawing(scn, p, v, t, target, given, arrows, done) {
    const j = root.Arrow.judge(arrows, target, { lenTol: 0.2 }), marks = {}, notes = [], lens = new Set();
    j.results.forEach((r) => {
      const a = r.drawn != null ? arrows[r.drawn] : null;
      if (a) marks[a.id] = r.result === 'right' ? 'ok' : 'bad';
      if (r.result === 'right') return;
      if (r.result === 'len') {
        const g = target[r.target].group;
        if (lens.has(g)) return;
        lens.add(g);
        notes.push(drawNote(scn, p, v, t, target, given, { result: 'len', kind: r.kind, anchor: r.anchor, pair: target.filter((x) => x.group === g).map((x) => x.kind) }, done));
      } else notes.push(drawNote(scn, p, v, t, target, given, r, done));
    });
    return { ok: j.ok, marks, notes };
  }

  // What is wrong in the drawing r (a result of Arrow.judge) and its flag (a typical slip, see
  // check-src.js), as a nudge or, once done, as the explanation.
  function drawNote(scn, p, v, t, target, given, r, done) {
    const i = r.anchor, b = t.boxes[i], B = b[0].toUpperCase() + b.slice(1), k = r.kind, still = !!scn.still;
    const name = k === 'm' ? MOTION() : (t.kinds.find((x) => x.kind === k) || {}).name, Name = name[0].toUpperCase() + name.slice(1);
    const contact = scn.id === 'push-pair', pushed = given.some((f) => f.kind === 's' && boxOf(scn, f) === i);
    const has = (x) => target.some((y) => y.kind === x && y.anchor === i);
    const why = (flag) => forceWrong(scn, p, v, { flag }, b);
    const say = (flag, nudge, full) => ({ flag, text: done ? full : nudge });
    if (r.result === 'len') {
      const [na, nb] = r.pair.map((x) => t.kinds.find((y) => y.kind === x).name);
      return say(null, L(`Compare the lengths of the ${na} and the ${nb} on ${b}: does anything else act along their line?`, `Vergleiche die Längen: ${na} und ${nb} auf ${b}. Wirkt sonst etwas entlang ihrer Linie?`),
        L(`The ${na} and the ${nb} on ${b} are equally large: nothing else acts along their line, and it does not accelerate along it. Draw them equally long.`,
          `${na} und ${nb} auf ${b} sind gleich gross: Sonst wirkt nichts entlang ihrer Linie, und sie wird in dieser Richtung nicht beschleunigt. Zeichne sie gleich lang.`));
    }
    if (r.result === 'dir') {
      switch (k) {
        case 'g': return say(null, L(`Which way does the Earth pull ${b}?`, `In welche Richtung zieht die Erde ${b}?`),
          L(`The weight on ${b} points straight down: the Earth pulls it towards its centre.`, `Die Gewichtskraft auf ${b} zeigt senkrecht nach unten: Die Erde zieht sie zu ihrem Mittelpunkt.`));
        case 'n': return say(null, L(`The normal force on ${b}: which way does the surface push?`, `Die Normalkraft auf ${b}: In welche Richtung drückt die Unterlage?`),
          L(`The normal force on ${b} points away from the surface, perpendicular to it: the surface pushes, it cannot pull.`, `Die Normalkraft auf ${b} zeigt senkrecht von der Unterlage weg: Die Unterlage drückt, ziehen kann sie nicht.`));
        case 'r': return still
          ? say(null, L(`Static friction on ${b}: which way would it slide without friction?`, `Die Haftreibung auf ${b}: In welche Richtung würde sie ohne Reibung gleiten?`),
            L(`Static friction on ${b} points along the surface, against the way it would slide without friction.`, `Die Haftreibung auf ${b} zeigt entlang der Unterlage, gegen die Richtung, in die sie ohne Reibung gleiten würde.`))
          : say(null, L(`Friction on ${b}: compare its direction with the direction of motion.`, `Die Reibung auf ${b}: Vergleiche ihre Richtung mit der Bewegungsrichtung.`),
            L(`Friction on ${b} points along the surface, against its motion.`, `Die Reibung auf ${b} zeigt entlang der Unterlage, gegen ihre Bewegung.`));
        case 'k': return contact
          ? say(null, L(`The force of the other box on ${b}: which way does it push?`, `Die Kraft der anderen Kiste auf ${b}: In welche Richtung drückt sie?`),
            L(`The other box pushes ${b} away from itself: boxes in contact can only push.`, `Die andere Kiste drückt ${b} von sich weg: Kisten, die sich berühren, können nur drücken.`))
          : say(null, L(`The rope force on ${b}: can a rope push, or only pull?`, `Die Seilkraft auf ${b}: Kann ein Seil drücken oder nur ziehen?`),
            L(`The rope pulls ${b} along the rope, towards the rope: a rope can only pull.`, `Das Seil zieht ${b} entlang des Seils zu sich hin: Ein Seil kann nur ziehen.`));
        case 'f': return say('springDir', L(`Is the spring stretched or compressed? Which way does it act on ${b} then?`, `Ist die Feder gedehnt oder gestaucht? In welche Richtung wirkt sie dann auf ${b}?`), why('springDir'));
        case 'd': return say('dragDir', L(`Air resistance on ${b}: compare its direction with the velocity.`, `Der Luftwiderstand auf ${b}: Vergleiche seine Richtung mit der Geschwindigkeit.`), why('dragDir'));
        default: return say(null, L(`Check the direction of the ${name} on ${b}.`, `Prüfe die Richtung: ${name} auf ${b}.`), L(`The ${name} on ${b} points the wrong way.`, `${Name} auf ${b}: Die Richtung stimmt nicht.`));
      }
    }
    if (r.result === 'missing') {
      switch (k) {
        case 'g': return say(null, L(`The Earth pulls every body: which force is missing on ${b}?`, `Die Erde zieht jeden Körper an: Welche Kraft fehlt auf ${b}?`),
          L(`The weight on ${b} is missing: the Earth pulls every body down.`, `Die Gewichtskraft auf ${b} fehlt: Die Erde zieht jeden Körper nach unten.`));
        case 'n': return say(null, L(`${B} lies on a surface: what does the surface do to it?`, `${B} liegt auf einer Unterlage: Was bewirkt die Unterlage?`),
          L(`The normal force on ${b} is missing: the surface pushes it away from itself, perpendicular to the surface.`, `Die Normalkraft auf ${b} fehlt: Die Unterlage drückt sie senkrecht von sich weg.`));
        case 'r': return still
          ? say('noFric', L(`${B} stands still although it is pulled: what holds it?`, `${B} ruht, obwohl an ihr gezogen wird: Was hält sie fest?`),
            L(`Static friction on ${b} is missing: without it, the pull would make it slide.`, `Die Haftreibung auf ${b} fehlt: Ohne sie würde die Zugkraft sie ins Gleiten bringen.`))
          : say('noFric', L(`${B} slides over the surface: what else does the surface do besides pushing?`, `${B} gleitet über die Unterlage: Was bewirkt die Unterlage ausser dem Drücken?`), why('noFric'));
        case 'k': return contact
          ? say(null, L(`${B} touches the other box: what does that box do?`, `${B} berührt die andere Kiste: Was bewirkt diese Kiste?`),
            L(`The contact force on ${b} is missing: the other box pushes it.`, `Die Kontaktkraft auf ${b} fehlt: Die andere Kiste drückt auf sie.`))
          : say(null, L(`A rope is tied to ${b}: what does it do?`, `An ${b} ist ein Seil befestigt: Was bewirkt es?`),
            L(`The rope force on ${b} is missing: the rope pulls it.`, `Die Seilkraft auf ${b} fehlt: Das Seil zieht an ihr.`));
        case 'f': return say('noSpring', L(`A spring touches ${b}: is it stretched or compressed, and what does it do?`, `Eine Feder berührt ${b}: Ist sie gedehnt oder gestaucht, und was bewirkt sie?`), why('noSpring'));
        case 'd': return say('noDrag', L(`${B} moves through the air: what does the air do?`, `${B} bewegt sich durch die Luft: Was bewirkt die Luft?`), why('noDrag'));
        default: return say(null, L(`A force on ${b} is still missing.`, `Auf ${b} fehlt noch eine Kraft.`), L(`The ${name} on ${b} is missing.`, `${Name} auf ${b} fehlt.`));
      }
    }
    // a force too many: drawn twice, given already, or one that does not act
    if (given.some((f) => f.kind === k && boxOf(scn, f) === i)) {
      const s = L(`The ${name} on ${b} is given in the drawing already: a second arrow for it is one too many.`, `${Name} auf ${b} ist in der Zeichnung schon gegeben: Ein zweiter Pfeil dafür ist zu viel.`);
      return say(null, s, s);
    }
    if (has(k)) {
      const s = L(`Drawn twice: the ${name} on ${b}. Each force acts once.`, `Zweimal eingezeichnet: ${name} auf ${b}. Jede Kraft wirkt nur einmal.`);
      return say(null, s, s);
    }
    switch (k) {
      case 'm': case 's': return still
        ? say(null, L(`Which body pushes or pulls ${b} from outside?`, `Welcher Körper drückt oder zieht ${b} von aussen?`),
          L(`No hand and no rope pushes or pulls ${b} from outside.`, `Keine Hand und kein Seil drückt oder zieht ${b} von aussen.`))
        : say('motion', L(`Which body pushes or pulls ${b} in the direction of motion? Draw only forces that a body (or the Earth) exerts.`, `Welcher Körper drückt oder zieht ${b} in Bewegungsrichtung? Zeichne nur Kräfte ein, die ein Körper (oder die Erde) ausübt.`), why('motion'));
      case 'd': return still
        ? say('dragRest', L(`Does ${b} move through the air?`, `Bewegt sich ${b} durch die Luft?`), why('dragRest'))
        : say(null, L(`How large is the air resistance on ${b}, at its low speed?`, `Wie gross ist der Luftwiderstand auf ${b} bei ihrer kleinen Geschwindigkeit?`),
          L(`Air resistance on a box that slides slowly is tiny: it is left out here.`, `Der Luftwiderstand auf eine langsam gleitende Kiste ist winzig: Er wird hier vernachlässigt.`));
      case 'n': return say(null, L(`Does ${b} lie on a surface that pushes it?`, `Liegt ${b} auf einer Unterlage, die sie stützt?`),
        L(`There is no normal force on ${b}: no surface supports it.`, `Auf ${b} wirkt keine Normalkraft: Keine Unterlage stützt sie.`));
      case 'r': return has('n')
        ? say(null, L(`Is there friction on ${b}? Check what the text says.`, `Wirkt Reibung auf ${b}? Prüfe, was der Text sagt.`),
          L(`There is no friction on ${b}: the text gives none (no coefficient of friction, or it is negligible).`, `Auf ${b} wirkt keine Reibung: Der Text gibt keine an (keine Reibungszahl, oder sie ist vernachlässigbar).`))
        : say(null, L(`Does ${b} rub on a surface?`, `Reibt ${b} an einer Unterlage?`),
          L(`There is no friction on ${b}: it touches no surface.`, `Auf ${b} wirkt keine Reibung: Sie berührt keine Unterlage.`));
      case 'k': return pushed
        ? say(null, L(`Which rope or which other box acts on ${b}, besides the push or pull given?`, `Welches Seil oder welche andere Kiste wirkt auf ${b}, ausser der gegebenen Zug- oder Druckkraft?`),
          L(`Besides the push or pull given in the drawing, no rope and no other box acts on ${b}.`, `Ausser der gegebenen Zug- oder Druckkraft wirkt kein Seil und keine andere Kiste auf ${b}.`))
        : say(null, L(`Which rope or which other box acts on ${b}?`, `Welches Seil oder welche andere Kiste wirkt auf ${b}?`),
          L(`No rope and no other box pulls or pushes ${b}.`, `Kein Seil und keine andere Kiste zieht oder drückt ${b}.`));
      case 'f': return say(null, L(`Is there a spring that touches ${b}?`, `Berührt eine Feder ${b}?`), L(`No spring touches ${b}.`, `Keine Feder berührt ${b}.`));
      default: return say(null, L(`Is there a body that exerts this force on ${b}?`, `Gibt es einen Körper, der diese Kraft auf ${b} ausübt?`), L(`There is no ${name} on ${b}.`, `${Name} wirkt nicht auf ${b}.`));
    }
  }

  // A result to work out (scn.nums), typed in first: { key, what, sym, unit, x (the right value),
  // value (TeX: the calculation), traps, options }. The traps are the wrong values of typical
  // mistakes (those that are negative or equal to another are left out; one that does not end after
  // three decimal places is rounded as a student would, to one): a value typed that matches one
  // gets its nudge or explanation (judge). After a wrong value typed, the result is chosen instead
  // (see identify.js): options are the right value and the first three traps, in ascending order.
  // ok: there are at least three traps and four options.
  const thousandth = (x) => Math.abs(1000 * x - Math.round(1000 * x)) < 1e-6;
  const same = (x, y) => Math.abs(x - y) < 5e-4;
  function numItem(n) {
    const traps = [], html = (x) => `$${FS.tq(x, n.unit, 3)}$`, options = [{ html: html(n.value), right: true, x: n.value }];
    n.wrongs.forEach(([w, flag, why, nudge]) => {
      const x = thousandth(w) ? w : FS.round(w, 1);
      if (!(Number.isFinite(x) && x >= 0 && (x > 0 || w === 0))) return;
      if (![n.value, ...traps.map((t) => t.value)].some((y) => same(x, y))) traps.push({ value: x, flag, why, ...(nudge ? { nudge } : {}) });
      if (options.length < 4 && !options.some((o) => o.html === html(x))) options.push({ html: html(x), right: false, flag, why, ...(nudge ? { nudge } : {}), x });
    });
    options.sort((a, b) => a.x - b.x);
    return { key: `n-${n.key}`, what: n.what, sym: n.sym, unit: n.unit, x: n.value, value: `$${n.sym} = ${n.calc}$`, traps,
      options: options.map(({ x, ...o }) => o), ok: traps.length >= 3 && options.length === 4 };
  }
  // A number as typed: decimal point or comma, a minus sign of any kind, a unit after it (ignored:
  // the field gives the unit). NaN if it is no number.
  function parse(s) {
    s = String(s).trim().replace(/,/g, '.').replace(/[−–—‒]/g, '-');
    const m = s.match(/^([-+]?\d*\.?\d+)(?:\s*[^\d\s.].*)?$/);
    return m ? Number(m[1]) : NaN;
  }
  // The typed value x of a result n (numItem): right within 1 % or when it rounds to the result
  // (one decimal place); else the trap it matches in the same way (the nearest), the size with the
  // wrong sign, or close (within 5 %): { ok }, { trap }, { sign }, { close }, { nan } or {} (wrong).
  function judge(n, x) {
    if (!Number.isFinite(x)) return { nan: true };
    const near = (y, tol) => Math.abs(x - y) <= tol * Math.max(Math.abs(y), 0.01), hit = (y) => near(y, 0.01) || Math.abs(x - y) <= 0.05 + 1e-9;
    if (hit(n.x)) return { ok: true };
    const trap = n.traps.filter((t) => hit(t.value)).sort((a, b) => Math.abs(x - a.value) - Math.abs(x - b.value))[0]; // the nearest
    if (trap) return { trap };
    if (n.x && hit(-n.x)) return { sign: true };
    return near(n.x, 0.05) ? { close: true } : {};
  }
  // sin α and cos α as the text gives them (practice, p.nice)
  const niceNote = (p) => {
    const t = NICE[p.alpha], s = (fn) => `${fn} ${p.alpha}° ${t[fn] === 0.5 ? '=' : '≈'} ${FS.num(t[fn], 2)}`;
    return L(`Use ${s('sin')} and ${s('cos')}.`, `Verwende ${s('sin')} und ${s('cos')}.`);
  };
  // a component identified: its value with the sine or cosine of the text
  const niceComp = (c, p) => {
    const f = NICE[p.alpha][c.fn];
    return { ...c, value: `$${c.sym} = ${c.base}\\${c.fn}\\alpha = ${tq(c.baseVal, 'N')}\\cdot ${FS.texNum(f, 2)} = ${tq(c.baseVal * f, 'N')}$` };
  };

  function exercise(scn, p) {
    const v = scn.solve(p), t = forceTable(scn, p, v);
    const fields = scn.fields(p).map((f) => ({ ...f, value: v[f.key] }));
    const steps = scn.steps(p, v);
    const all = new Set(steps.flatMap((s) => s.show || []));
    return {
      scenario: scn.id,
      difficulty: scn.difficulty,
      title: scn.title(p),
      text: `<p>${scn.text(p)}</p><p class="note">${STRATEGY()} ${L('Take g = 10 m/s².', 'Rechne mit g = 10 m/s².')}${p.nice && NICE[p.alpha] ? ` ${niceNote(p)}` : ''}</p>`,
      forces: t,
      fields,
      figure: (view = { task: true }) => scn.scene(p, v, view).render(view),
      // the task with the ticked forces (Set of 'box:kind') and the forces of extra (ids) drawn in
      taskFigure: (ticked, extra) => taskFigure(scn, p, v, t, ticked, extra),
      // the free-body diagram the student draws (practice), judged
      diagram: () => diagram(scn, p, v, t),
      solutionFigure: () => scn.scene(p, v, {}).render({ show: all }),
      // the components to identify (practice: nice angles), with their values
      comps: scn.comps && p.nice ? scn.comps(p).map((c) => niceComp(c, p)) : [],
      eqs: Equations.of(scn.id, p).filter((e) => !e.extra),
      // the results to work out (practice), once the forces, components and equations are chosen
      nums: scn.nums && p.practice ? scn.nums(p, v).map(numItem) : [],
      hints: scn.hints(p, v),
      solution: steps.map((s) => s.text),
      results: fields.map((f) => `$${tex(...f.sym)} = ${tq(f.value, f.unit)}$`).join(', '),
      steps,
      p, v,
    };
  }

  // Parameters for which ok(p) holds, if found; else the first that fit at all.
  function make(scn, r, ok, o) {
    let first = null;
    for (let k = 0; k < 5000; k++) {
      const p = scn.make(r, o);
      if (!p) continue;
      if (!ok || ok(p)) return p;
      first = first || p;
    }
    return first;
  }
  // Results that are exact with at most one decimal place, so that the worked solution needs no rounding.
  const tenth = (x) => Math.abs(10 * x - Math.round(10 * x)) < 1e-9;

  // ---------------------------------------------------------------- find the error
  // A student's attempt: the forces (drawn) and three lines below them (equations, and with springs
  // and drag also results worked out with numbers, Equations.claims), with one step wrong: a force
  // drawn that does not act, one left out, turned round or of the wrong size, or a line with a
  // typical wrong idea.
  // p.err = { eqs (the lines shown, indices in linesOf), at (the wrong step, 0 the forces), box
  // and flag of a wrong force, n of a wrong line (its option) }. The flags of a wrong force:
  //   motion     a force in the direction of motion      noFric     friction left out
  //   noSpring   the spring force left out              springDir  the spring force along the stretch
  //   noDrag     air resistance left out                dragDir    air resistance along the velocity
  //   dragRest   air resistance on a body at rest       dragSize   air resistance larger or smaller
  //                                                                 than the weight, against the motion
  const ERRORS = { floor: ['pull-friction', 'push-pair', 'rope-pair'], pulley: ['atwood', 'table-pulley'], slope: ['incline-pull', 'incline-pulley'],
    spring: ['spring-hang', 'spring-floor'], drag: ['drag-fall', 'drag-bike'] };
  const TYPICAL = ['flatN', 'rope', 'noFric', 'noSlope', 'internal', 'mass', 'pass', 'balance', 'swap', 'stretch', 'hooke', 'accel', 'terminal', 'noDrag', 'motion'];
  const SI = KINDS.indexOf('s');
  const colOf = (t, k) => t.kinds.findIndex((x) => x.kind === k);
  // the lines a student may write: the equations, then the results worked out
  const linesOf = (id, p) => [...Equations.of(id, p), ...Equations.claims(id, p, byId(id).solve(p))];
  // the slips that change the forces drawn: one too many or too few, or one drawn wrongly
  const DRAWN = new Set(['motion', 'springDir', 'dragDir', 'dragRest', 'dragSize']);
  const KIND_OF = { motion: 's', noFric: 'r', noSpring: 'f', springDir: 'f', noDrag: 'd', dragDir: 'd', dragRest: 'd', dragSize: 'd' };

  // the mistakes possible in the forces: a force of motion on a box that has no push or pull,
  // friction, a spring force or air resistance left out where it acts, a spring force or air
  // resistance turned round, air resistance on a body at rest, air resistance of a size that
  // does not fit the motion
  const forceSlips = (scn, t) => t.boxes.flatMap((b, i) => {
    const on = (k) => colOf(t, k) >= 0 && t.table[i][colOf(t, k)];
    return [
      ...(!scn.still && !t.table[i][SI] ? [{ box: i, flag: 'motion' }] : []),
      ...(on('r') ? [{ box: i, flag: 'noFric' }] : []),
      ...(on('f') ? [{ box: i, flag: 'noSpring' }, { box: i, flag: 'springDir' }] : []),
      ...(on('d') ? [{ box: i, flag: 'noDrag' }, { box: i, flag: 'dragDir' }] : []),
      ...(scn.still && colOf(t, 'd') >= 0 && !on('d') ? [{ box: i, flag: 'dragRest' }] : []),
      ...(scn.id === 'drag-fall' ? [{ box: i, flag: 'dragSize' }] : []),
    ];
  });

  function errorMake(scn, r) {
    const p = make(scn, r), t = forceTable(scn, p, scn.solve(p)), list = linesOf(scn.id, p);
    const eqs = list.map((e, k) => k).filter((k) => !list[k].extra);
    while (eqs.length > 3) eqs.splice(Math.floor(r() * eqs.length), 1);
    // springs and drag: the forces are wrong in half of the attempts (their new ideas are in the drawing)
    const slips = forceSlips(scn, t), extra = !!scn.extra;
    const at = !slips.length ? 1 + Math.floor(r() * 3) : extra ? (r() < 0.5 ? 0 : 1 + Math.floor(r() * 3)) : Math.floor(r() * 4);
    if (!at) return { ...p, err: { eqs, at, ...pick(r, slips) } };
    const wrong = list[eqs[at - 1]].options.filter((o) => !o.right), typical = wrong.filter((o) => TYPICAL.includes(o.flag));
    return { ...p, err: { eqs, at, n: pick(r, typical.length ? typical : wrong).n } };
  }

  // What is wrong with a force drawn (at = 0), in words.
  function forceWrong(scn, p, v, e, box) {
    const pushed = p.state === 'stand' || p.state === 'compress';
    const back = pushed ? L('it is compressed, so it pushes back towards its relaxed length', 'sie ist gestaucht, also drückt sie zurück zu ihrer entspannten Länge')
      : L('it is stretched, so it pulls back towards its relaxed length', 'sie ist gedehnt, also zieht sie zurück zu ihrer entspannten Länge');
    const FG = (p.m || 0) * FS.G;
    switch (e.flag) {
      case 'motion': return L(`There is no “force of motion” on ${box}: every force comes from a body that pushes or pulls it (or from the Earth). The forces that do act accelerate it; nothing pushes it along in the direction of motion.`,
        `Auf ${box} wirkt keine „Bewegungskraft“: Jede Kraft kommt von einem Körper, der sie drückt oder zieht (oder von der Erde). Die Kräfte, die wirken, beschleunigen sie; nichts treibt sie in Bewegungsrichtung an.`);
      case 'noFric': return L(`Friction on ${box} is missing: it slides over the surface, so kinetic friction acts against its motion.`, `Die Reibung auf ${box} fehlt: Sie gleitet über die Unterlage, also wirkt die Gleitreibung gegen ihre Bewegung.`);
      case 'noSpring': return L(`The spring force on ${box} is missing: the spring touches it, and ${back}.`, `Die Federkraft auf ${box} fehlt: Die Feder berührt sie, und ${back}.`);
      case 'springDir': return L(`The spring force on ${box} points the wrong way, along the ${pushed ? 'compression' : 'stretch'}. The spring acts back towards its relaxed length: ${back}.`,
        `Die Federkraft auf ${box} zeigt in die falsche Richtung, in Richtung der ${pushed ? 'Stauchung' : 'Dehnung'}. Die Feder wirkt zurück zu ihrer entspannten Länge: ${back}.`);
      case 'noDrag': return L(`Air resistance on ${box} is missing: it moves through the air, so air resistance acts against its velocity.`, `Der Luftwiderstand auf ${box} fehlt: Sie bewegt sich durch die Luft, also wirkt der Luftwiderstand gegen ihre Geschwindigkeit.`);
      case 'dragDir': return L(`Air resistance on ${box} points the wrong way: it acts against the velocity, not along it.`, `Der Luftwiderstand auf ${box} zeigt in die falsche Richtung: Er wirkt gegen die Geschwindigkeit, nicht in ihre Richtung.`);
      case 'dragRest': return L(`There is no air resistance on ${box}: it is at rest, and air resistance acts only on a body moving through the air, against its velocity.`, `Auf ${box} wirkt kein Luftwiderstand: Sie ruht, und Luftwiderstand wirkt nur auf einen Körper, der sich durch die Luft bewegt, gegen seine Geschwindigkeit.`);
      default: return { // dragSize
        early: L(`The air resistance is drawn larger than her weight, but she still gets faster: her acceleration points down, so the net force points down, and the air resistance is smaller than her weight (${FS.q(p.D, 'N')} < ${FS.q(FG, 'N')}).`,
          `Der Luftwiderstand ist grösser als ihre Gewichtskraft eingezeichnet, aber sie wird noch schneller: Ihre Beschleunigung zeigt nach unten, also zeigt die resultierende Kraft nach unten, und der Luftwiderstand ist kleiner als ihre Gewichtskraft (${FS.q(p.D, 'N')} < ${FS.q(FG, 'N')}).`),
        terminal: L('The air resistance is drawn smaller than her weight, but she falls at a constant speed: the forces balance, so the air resistance is as large as her weight. She needs no net force to keep falling.',
          'Der Luftwiderstand ist kleiner als ihre Gewichtskraft eingezeichnet, aber sie fällt mit konstanter Geschwindigkeit: Die Kräfte heben sich auf, also ist der Luftwiderstand so gross wie ihre Gewichtskraft. Um weiterzufallen, braucht sie keine resultierende Kraft.'),
        chute: L(`The air resistance is drawn smaller than her weight, but she slows down: her acceleration points up, so the net force points up, and the air resistance is larger than her weight (${FS.q(p.D, 'N')} > ${FS.q(FG, 'N')}).`,
          `Der Luftwiderstand ist kleiner als ihre Gewichtskraft eingezeichnet, aber sie wird langsamer: Ihre Beschleunigung zeigt nach oben, also zeigt die resultierende Kraft nach oben, und der Luftwiderstand ist grösser als ihre Gewichtskraft (${FS.q(p.D, 'N')} > ${FS.q(FG, 'N')}).`),
      }[p.phase];
    }
  }

  // The student's drawing of a force turned round or of the wrong size (a scene's forces).
  function misdraw(scn, p, e, sc) {
    if (e.at || !['springDir', 'dragDir', 'dragSize'].includes(e.flag)) return;
    const own = sc.forces.filter((f) => boxOf(scn, f) === e.box), f = own.find((x) => x.kind === KIND_OF[e.flag]);
    if (e.flag === 'dragSize') { f.mag = (p.phase === 'early' ? 1.4 : 0.6) * own.find((x) => x.kind === 'g').mag; return; }
    f.dir = [-f.dir[0], -f.dir[1]];
    f.labTail = false;
    // turned round, beside the weight: a little to the right of where it was, its label to the right
    if (Math.abs(f.dir[1]) > 0.5) { f.at = [f.at[0] + (f.kind === 'f' ? 10 : 0), f.at[1]]; f.lab = [10, 4]; } else f.lab = [0, -12];
  }

  function errorExercise(type, scn, p) {
    const v = scn.solve(p), t = forceTable(scn, p, v), e = p.err, list = linesOf(scn.id, p), eqs = e.eqs.map((k) => list[k]);
    const n = eqs.length + 1, range = [...Array(n).keys()];
    // the student's forces: the right ones, with the slip
    const claim = t.table.map((row) => row.slice());
    if (!e.at && ['motion', 'noFric', 'noSpring', 'noDrag', 'dragRest'].includes(e.flag)) claim[e.box][colOf(t, KIND_OF[e.flag])] = ['motion', 'dragRest'].includes(e.flag);
    const ticks = new Set(claim.flatMap((row, i) => row.map((on, j) => (on ? `${i}:${j}` : null)).filter(Boolean)));
    const student = () => taskFigure(scn, p, v, t, ticks, [], (sc) => misdraw(scn, p, e, sc));
    const names = (i) => claim[i].map((on, j) => (!on ? null : j === SI && !t.table[i][SI] ? MOTION() : t.kinds[j].name)).filter(Boolean).join(', ');
    const forces = t.boxes.length > 1 ? t.boxes.map((b, i) => `${b}: ${names(i)}`).join('; ') : names(0);
    const right = (it) => it.options.find((o) => o.right).html;
    const slipped = e.at ? eqs[e.at - 1].options.find((o) => o.n === e.n) : null;
    const step = (k) => L(`Step ${k + 1}`, `Schritt ${k + 1}`);
    const attempt = `<ol class="attempt"><li>${L('Forces (see the drawing)', 'Kräfte (siehe Zeichnung)')}: ${forces}.</li>` +
      eqs.map((it, k) => `<li>${it.what} ${k === e.at - 1 ? slipped.html : right(it)}</li>`).join('') + '</ol>';
    const flag = e.at ? slipped.flag : e.flag;
    const wrong = !e.at ? forceWrong(scn, p, v, e, t.boxes[e.box]) : `${slipped.why} ${L('Right', 'Richtig')}: ${right(eqs[e.at - 1])}.`;
    const fine = (k) => (k ? eqs[k - 1].value : L('The drawing has every force that acts, in its direction, and no other.', 'Die Zeichnung enthält jede Kraft, die wirkt, in ihrer Richtung, und keine andere.'));
    const item = {
      key: 'wrong', what: L('The wrong step:', 'Der falsche Schritt:'),
      options: range.map((k) => ({ html: step(k), right: k === e.at, flag: k === e.at ? undefined : flag,
        why: k === e.at ? '' : `${L(`Step ${k + 1} is right`, `Schritt ${k + 1} stimmt`)}: ${fine(k)}` })),
      value: `${step(e.at)}: ${wrong}`,
    };
    // the worked solution: each step checked, on the right free-body diagram; a force left out highlighted
    const base = scn.steps(p, v)[0].show, hl = !e.at && !DRAWN.has(e.flag) ? t.cells[e.box][colOf(t, KIND_OF[e.flag])] : [];
    const springs = !!scn.extra;
    const intro = springs
      ? L('First the drawing: is every force caused by a body that touches the box, or by the Earth? Does the spring force point back towards the relaxed length, and air resistance against the velocity, of a size that fits the motion? Then each line: along each axis, the forces add up to m a; the spring force is k Δx with Δx in metres; the acceleration is the net force divided by the mass.',
        'Zuerst die Zeichnung: Kommt jede Kraft von einem Körper, der den Körper berührt, oder von der Erde? Zeigt die Federkraft zurück zur entspannten Länge und der Luftwiderstand gegen die Geschwindigkeit, mit einer Grösse, die zur Bewegung passt? Dann jede Zeile: Entlang jeder Achse ergeben die Kräfte zusammen m a; die Federkraft ist k Δx mit Δx in Metern; die Beschleunigung ist die resultierende Kraft geteilt durch die Masse.')
      : L('First the drawing: is every force caused by a body that touches the box, or by the Earth? Is there friction wherever a box slides? Then each equation: perpendicular to the motion the forces balance, along it they add up to m a of the system chosen.', 'Zuerst die Zeichnung: Kommt jede Kraft von einem Körper, der die Kiste berührt, oder von der Erde? Wirkt Reibung, wo immer eine Kiste gleitet? Dann jede Gleichung: Senkrecht zur Bewegung heben sich die Kräfte auf, entlang der Bewegung ergeben sie m a des gewählten Systems.');
    const steps = [
      { text: `<p class="step-rule">${L('Check step by step', 'Schritt für Schritt prüfen')}</p><p>${intro}</p>`, show: base, fig: student },
      ...range.map((k) => ({
        text: `<p class="step-rule">${step(k)}${k ? '' : `: ${L('forces', 'Kräfte')}`}</p><p>${k === e.at ? `<b>${L('This is the error.', 'Das ist der Fehler.')}</b> ${wrong}` : `${L('Right', 'Richtig')}. ${fine(k)}`}</p>`,
        show: base, hl: k || !hl.length ? [] : hl, fig: k === e.at && !e.at && DRAWN.has(e.flag) ? student : null,
      })),
    ];
    // the hints: the bodies of this situation and what their motion says about the forces
    const who = t.boxes.join(L(' and ', ' und ')), kg = (m) => FS.q(m, 'kg');
    const sys = p.m1 != null ? L(`; the system of both boxes has ${kg(p.m1 + p.m2)}`, `; das System beider Kisten hat ${kg(p.m1 + p.m2)}`) : '';
    const motion = {
      'spring-hang': L(`The box hangs at rest; the spring is ${p.state === 'hang' ? 'stretched: which way must it pull' : 'compressed: which way must it push'}?`, `Die Kiste ruht; die Feder ist ${p.state === 'hang' ? 'gedehnt: In welche Richtung muss sie ziehen' : 'gestaucht: In welche Richtung muss sie drücken'}?`),
      'spring-floor': L(`The box slides ${p.state === 'stretch' ? 'towards the wall; the spring is stretched' : 'away from the wall; the spring is compressed'}: which way must the spring force point, and which way friction?`, `Die Kiste gleitet ${p.state === 'stretch' ? 'zur Wand hin; die Feder ist gedehnt' : 'von der Wand weg; die Feder ist gestaucht'}: Wohin muss die Federkraft zeigen, wohin die Reibung?`),
      'drag-fall': { early: L('She falls faster and faster: must the air resistance be smaller or larger than her weight?', 'Sie fällt immer schneller: Muss der Luftwiderstand kleiner oder grösser sein als ihre Gewichtskraft?'),
        terminal: L('She falls at a constant speed: how large must the air resistance be compared with her weight?', 'Sie fällt mit konstanter Geschwindigkeit: Wie gross muss der Luftwiderstand im Vergleich zu ihrer Gewichtskraft sein?'),
        chute: L('She slows down while still falling: must the air resistance be smaller or larger than her weight?', 'Sie wird langsamer, während sie noch fällt: Muss der Luftwiderstand kleiner oder grösser sein als ihre Gewichtskraft?') }[p.phase],
      'drag-bike': L('She coasts and slows down: does anything push her forward, and which way does the air resistance point?', 'Sie rollt aus und wird langsamer: Treibt sie etwas nach vorn an, und wohin zeigt der Luftwiderstand?'),
    }[scn.id];
    const lines = springs
      ? L(`Then each line: ${scn.still || p.phase === 'terminal' ? 'here nothing accelerates, so the forces balance' : 'here the speed changes, so the forces add up to m a'}. ${scn.id.startsWith('spring') ? 'In F = k Δx, Δx goes in metres.' : 'The acceleration is the net force divided by the mass.'}`,
        `Dann jede Zeile: ${scn.still || p.phase === 'terminal' ? 'Hier wird nichts beschleunigt, also heben sich die Kräfte auf' : 'Hier ändert sich die Geschwindigkeit, also ergeben die Kräfte zusammen m a'}. ${scn.id.startsWith('spring') ? 'In F = k Δx kommt Δx in Metern.' : 'Die Beschleunigung ist die resultierende Kraft geteilt durch die Masse.'}`)
      : L(`Then each equation: perpendicular to the motion the forces balance; along it they add up to m a of the system chosen${sys}. ${/pulley|atwood/.test(scn.id) ? 'The hanging box accelerates: can the rope force equal its weight?' : 'Where a box slides, friction is μ times its normal force.'}`,
        `Dann jede Gleichung: Senkrecht zur Bewegung heben sich die Kräfte auf; entlang der Bewegung ergeben sie m a des gewählten Systems${sys}. ${/pulley|atwood/.test(scn.id) ? 'Die hängende Kiste wird beschleunigt: Kann die Seilkraft gleich ihrer Gewichtskraft sein?' : 'Wo eine Kiste gleitet, ist die Reibung μ mal ihre Normalkraft.'}`);
    const fric = colOf(t, 'r') >= 0 && t.table.some((row) => row[colOf(t, 'r')]);
    const slide = fric ? L('Which of the boxes slides over a surface, and is friction drawn wherever one does?', 'Welche der Kisten gleitet über eine Unterlage, und ist überall dort Reibung eingezeichnet?')
      : L('There is no friction here: is anything drawn that no body causes, such as a force pushing a box along its motion?', 'Hier gibt es keine Reibung: Ist etwas eingezeichnet, das kein Körper verursacht, etwa eine Kraft, die eine Kiste in Bewegungsrichtung antreibt?');
    const hints = [
      L(`Check the drawing first, force by force on ${who}: does a body push or pull (or the Earth) for every force drawn? ${springs ? motion : slide}`,
        `Prüfe zuerst die Zeichnung, Kraft für Kraft auf ${who}: Drückt oder zieht für jede eingezeichnete Kraft ein Körper (oder die Erde)? ${springs ? motion : slide}`),
      lines,
    ];
    return {
      scenario: type,
      situation: scn.id,
      difficulty: 3,
      title: L('Find the error', 'Finde den Fehler'),
      text: `<p>${scn.text(p)}</p><p>${L('A student drew the forces and set up the equations:', 'Eine Schülerin hat die Kräfte eingezeichnet und die Gleichungen aufgestellt:')}</p>${attempt}<p>${L('One step is wrong. Which?', 'Ein Schritt ist falsch. Welcher?')}</p>`,
      forces: null,
      fields: [],
      figure: (view = { task: true }) => (view.task ? student() : scn.scene(p, v, view).render(view)),
      taskFigure: student,
      solutionFigure: () => scn.scene(p, v, {}).render({ show: new Set(base), hl: new Set(hl) }),
      comps: [],
      eqs: [item],
      nums: [],
      hints,
      solution: steps.map((s) => s.text),
      results: item.value,
      steps,
      p, v,
    };
  }

  // A practice exercise of a situation: nice angles (sine and cosine given as short decimals), so
  // that the components the student identifies (the app gives their values), the results the
  // student works out in the head and the worked solution have at most one decimal place; and
  // results with at least three typical wrong values (traps, and three of them to choose from). Or
  // "find the error" in one of the situations of a group.
  function practiceOf(type, seed) {
    if (type.startsWith('error-')) {
      const r = rng(seed), scn = byId(pick(r, ERRORS[type.slice(6)]));
      return { ...errorExercise(type, scn, errorMake(scn, r)), seed };
    }
    const scn = byId(type);
    const comps = (p) => !scn.comps || scn.comps(p).every((c) => tenth(c.baseVal * NICE[p.alpha][c.fn]));
    // an acceleration to work out: a multiple of 0.5 m/s², so that the division stays easy
    const nums = (p) => !scn.nums || scn.nums(p, scn.solve(p)).every((n) => tenth(n.value) && (n.unit !== 'a' || Math.abs(2 * n.value - Math.round(2 * n.value)) < 1e-9) && numItem(n).ok);
    const p = make(scn, rng(seed), (x) => comps(x) && Object.values(scn.solve(x)).every(tenth) && nums(x), { nice: true });
    return { ...exercise(scn, { ...p, practice: true }), seed };
  }

  // An exercise of the given situation, with any angles (for the check); o as for scn.make (e.g.
  // { phase: 'chute' } for drag-fall).
  const generateFor = (scenario, seed, o) => ({ ...exercise(byId(scenario), make(byId(scenario), rng(seed), null, o)), seed });

  // The tutor: the situation with what is wanted, then the steps of the solution, each with the
  // forces it talks about highlighted. "Find the error": the attempt, then each step checked.
  function tutorial(lesson) {
    if (lesson.error) {
      const ex = errorExercise(lesson.error, byId(lesson.scenario), lesson.p);
      return { frames: [{ text: `<p class="step-rule">${L('The attempt', 'Der Lösungsversuch')}</p>${ex.text}`, figure: ex.taskFigure() },
        ...ex.steps.map((s) => ({ text: s.text, figure: s.fig ? s.fig() : ex.figure({ show: new Set(s.show || []), hl: new Set(s.hl || []) }) }))] };
    }
    const ex = exercise(byId(lesson.scenario), lesson.p);
    const wanted = ex.fields.map((f) => `${f.what} $${tex(...f.sym)}$`).join(', ');
    const first = {
      text: `<p class="step-rule">${L('The situation', 'Die Situation')}</p><p>${byId(lesson.scenario).text(lesson.p)}</p><p>${L('Wanted', 'Gesucht')}: ${wanted}.</p><p class="note">${L('The strategy', 'Das Vorgehen')}: ${STRATEGY()}</p>`,
      figure: ex.figure({ task: true }),
    };
    const frames = ex.steps.map((s) => ({ text: s.text, figure: ex.figure({ show: new Set(s.show || []), hl: new Set(s.hl || []) }) }));
    return { frames: [first, ...frames] };
  }

  root.Forces = { SCENARIOS, KINDS, kindsOf, MOTION, ERRORS, linesOf, generateFor, practiceOf, tutorial, parse, judge };
  if (typeof module !== 'undefined') module.exports = root.Forces;
})(typeof window !== 'undefined' ? window : globalThis);
