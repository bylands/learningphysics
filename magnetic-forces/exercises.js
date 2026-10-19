// The exercises, with their texts, in the current language (the app rebuilds them when the
// language changes). Every exercise has the form
//   { id, type, kind, difficulty, title, text, figs (HTML), questions, hints, solution (HTML
//     paragraphs), solFig, p (what makes it new to the student) }
// with questions of four kinds:
//   { type: 'tiles', key, label, multi, options: [{ html, ok, why, tag }] }   directions or names to
//        choose: one (multi false), or all that fit (multi true: more than one may be right)
//   { type: 'pick', key, label, options: [{ html, ok, why, tag }] }           one of four drawings
//   { type: 'choice', key, label, options: [{ label, ok, why, tag }] }        one of a few values
//   { type: 'multi', key, label, statements: [{ html, ok, why }] }            statements to tick
// The types:
//   lines-wire, lines-loop, lines-solenoid, lines-magnet   the field lines (right-hand grip rule)
//   dir-current, dir-particle      the direction of the force (right hand for positive charges,
//                                  left hand for negative ones)
//   dir-missing                    the missing field or velocity: all directions that fit
//   size-num, size-ratio           the size of the force on a wire, F = I·L·B·sin θ: mental
//                                  arithmetic, or how many times as large after two changes
//   pair-parallel, pair-angle      the field of the first current at the second, then the force on
//                                  the second; parallel currents: attract or repel
//   coil                           the torque on a coil, and where it is used
//   error-charge, error-current    find the wrong step in a student's hand rule
//   stmts                          which statements are correct?
// A tiles question with wide: the options are sentences, one per row.
// A wrong option may carry a nudge: shown in practice in place of a why that gives the answer away.
// The direction exercises (dir-current, dir-particle, dir-missing) also carry draw: in practice
// (app.js) the student draws the vector with arrow.js instead of choosing it; the check keeps the
// four options of questions (check-src.js).
//   draw = { kind ('F', 'B' or 'v'), name (for the palette), ask, fig (the figure without the
//     unknown vector), at (where the arrow starts in the svg: the middle of the charge or wire),
//     gap (the arrow clears the charge or wire), aside (where ⊙ ⊗ go: beside the figure's own),
//     start (the direction of a new arrow, degrees: never a right one), none (a button "no force":
//     there may be none), show (the direction drawn with the solution; absent: no force),
//     judge(d) for d a direction [x, y, z] or null (no force): { ok, tag (as the options': the
//     idea behind a wrong answer), nudge (while the exercise is open), why (once done) } }
//   toArrow(d), fromArrow(a)   a direction as arrow.js has it (degrees, 'out', 'in') and back
(function (root) {
  'use strict';

  const M = root.Magnet || require('./generator.js');
  const P = root.MagPlot || require('./plot.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const { rng, AXES, CANDS, same, key, force, wireField, fitting } = M;
  const { icon, scene, sceneAt, linesFig } = P;

  // ---------------------------------------------------------------- words
  const DIR = {
    '1,0,0': ['to the right', 'nach rechts'], '-1,0,0': ['to the left', 'nach links'], '0,1,0': ['upwards', 'nach oben'], '0,-1,0': ['downwards', 'nach unten'],
    '0,0,1': ['out of the page', 'aus der Seite heraus'], '0,0,-1': ['into the page', 'in die Seite hinein'],
    '1,1,0': ['up and to the right', 'nach rechts oben'], '-1,1,0': ['up and to the left', 'nach links oben'], '-1,-1,0': ['down and to the left', 'nach links unten'], '1,-1,0': ['down and to the right', 'nach rechts unten'],
  };
  const dirName = (d) => (d ? L(...DIR[key(d)]) : L('no force', 'keine Kraft'));
  const it = (s) => `<i>${s}</i>`;
  // a vector: the letter with an arrow above (style.css)
  const vec = (s) => `<span class="vec"><i>${s}</i></span>`;
  const LAW = () => `${vec('F')} = <i>q</i> · ${vec('v')} × ${vec('B')}`;
  const vName = (kind) => (kind === 'I' ? L(`the current ${it('I')}`, `der Strom ${it('I')}`) : L(`the velocity ${it('v')}`, `die Geschwindigkeit ${it('v')}`));
  const signName = (q) => (q > 0 ? L('positive', 'positiv') : q < 0 ? L('negative', 'negativ') : L('neutral', 'neutral'));
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  // The particle of an exercise: often a named one, drawn with its symbol in a neutral colour, so
  // that its sign is for the student to know; else "a positive particle", drawn with its sign.
  const NAMED = {
    1: [['p', ['a proton', 'ein Proton'], 'p'], ['e+', ['a positron', 'ein Positron'], 'e⁺'], ['a', ['an alpha particle', 'ein Alphateilchen'], 'α'], ['na', ['a sodium ion (Na⁺)', 'ein Natrium-Ion (Na⁺)'], 'Na⁺']],
    '-1': [['e', ['an electron', 'ein Elektron'], 'e⁻'], ['cl', ['a chloride ion (Cl⁻)', 'ein Chlorid-Ion (Cl⁻)'], 'Cl⁻']],
    // neutral: a neutron, or an atom (the sodium atom next to the sodium ion above)
    0: [['n', ['a neutron', 'ein Neutron'], 'n'], ['he', ['a helium atom', 'ein Heliumatom'], 'He'], ['h', ['a hydrogen atom', 'ein Wasserstoffatom'], 'H'],
      ['naa', ['a sodium atom (Na)', 'ein Natriumatom (Na)'], 'Na'], ['ne', ['a neon atom', 'ein Neonatom'], 'Ne']],
  };
  function particle(r, q) {
    if (r.next() < 0.35) return { q, id: 'q', sym: null, name: () => L(`a ${signName(q)} particle`, `ein ${q > 0 ? 'positives' : q < 0 ? 'negatives' : 'neutrales'} Teilchen`) };
    const [id, names, sym] = r.pick(NAMED[q]);
    return { q, id, sym, name: () => L(...names) };
  }
  const chargeOf = (pt) => (pt.sym
    ? L(`${cap(pt.name())} ${pt.q > 0 ? 'is positively charged' : pt.q < 0 ? 'is negatively charged' : 'has no charge'}.`, `${cap(pt.name())} ist ${pt.q > 0 ? 'positiv geladen' : pt.q < 0 ? 'negativ geladen' : 'ungeladen'}.`)
    : L(`The particle is ${signName(pt.q)}.`, `Das Teilchen ist ${signName(pt.q)}.`));
  const drawn = (pt, at, name) => ({ kind: 'particle', q: pt.q, at, sym: pt.sym, name });
  const hand = (q) => (q > 0 ? L('Right hand (positive charge)', 'Rechte Hand (positive Ladung)') : L('Left hand (negative charge)', 'Linke Hand (negative Ladung)'));
  const tile = (d, extra = '') => `<span class="dtile">${icon(d)}<span>${d ? dirName(d) : extra || L('no force', 'keine Kraft')}</span></span>`;
  const RULE = () => L('For a positive charge (or a current) use the right hand: thumb along the velocity (or the current), index finger along the field, then the middle finger shows the force. For a negative charge use the left hand in the same way.',
    'Für eine positive Ladung (oder einen Strom) nimm die rechte Hand: Daumen in Richtung der Geschwindigkeit (oder des Stroms), Zeigefinger in Richtung des Feldes, dann zeigt der Mittelfinger die Kraft. Für eine negative Ladung nimm die linke Hand auf dieselbe Weise.');
  const PERP = () => L('The magnetic force is always perpendicular both to the velocity (or the current) and to the field. There is no force on a charge at rest, on a neutral particle, or on a charge moving along the field.',
    'Die magnetische Kraft steht immer senkrecht zur Geschwindigkeit (oder zum Strom) und zum Feld. Es gibt keine Kraft auf eine ruhende Ladung, auf ein neutrales Teilchen oder auf eine Ladung, die sich längs des Feldes bewegt.');
  const GRIP = () => L('The field of a straight current circles around it: grip the wire with your right hand, thumb along the current; your fingers curl in the direction of the field.',
    'Das Feld eines geraden Stroms umkreist ihn: Umfasse den Draht mit der rechten Hand, Daumen in Stromrichtung; die gekrümmten Finger zeigen die Richtung des Feldes.');

  // How the force follows (the hand rule, or why there is none).
  function howForce(q, kind, v, B) {
    if (!q) return L('The particle is neutral: the magnetic field exerts no force on it.', 'Das Teilchen ist neutral: Das Magnetfeld übt keine Kraft auf es aus.');
    const F = force(q, v, B);
    if (!F) return L(`${kind === 'I' ? 'The current' : 'The velocity'} is parallel to the field: there is no magnetic force.`, `${kind === 'I' ? 'Der Strom' : 'Die Geschwindigkeit'} ist parallel zum Feld: Es gibt keine magnetische Kraft.`);
    return L(`${hand(q)}: thumb along ${vName(kind)} (${dirName(v)}), index finger along the field (${dirName(B)}): the middle finger points ${dirName(F)}.`,
      `${hand(q)}: Daumen in Richtung ${kind === 'I' ? 'des Stroms' : 'der Geschwindigkeit'} (${dirName(v)}), Zeigefinger in Richtung des Feldes (${dirName(B)}): Der Mittelfinger zeigt ${dirName(F)}.`);
  }
  const WHYF = {
    hand: () => L('That is the direction for the other sign of the charge: mind which hand to use.', 'Das ist die Richtung für das andere Vorzeichen der Ladung: Achte darauf, welche Hand du nimmst.'),
    alongV: () => L('The magnetic force is perpendicular to the motion, not along it.', 'Die magnetische Kraft steht senkrecht zur Bewegung, nicht in ihrer Richtung.'),
    alongB: () => L('The magnetic force is perpendicular to the field, not along the field lines.', 'Die magnetische Kraft steht senkrecht zum Feld, nicht längs der Feldlinien.'),
    none: () => L('There is a force: the charge moves across the field.', 'Es gibt eine Kraft: Die Ladung bewegt sich quer zum Feld.'),
    some: () => L('Check whether the charge moves across the field at all.', 'Prüfe, ob sich die Ladung überhaupt quer zum Feld bewegt.'),
    // (a direction drawn that is neither along nor against the force, nor along the motion or the field)
    perp: () => L('The magnetic force is perpendicular both to the motion and to the field: this direction is not.', 'Die magnetische Kraft steht senkrecht zur Bewegung und zum Feld: Diese Richtung tut das nicht.'),
  };
  // In practice, while the exercise is open, a nudge in place of a reason that would give the answer
  // away (app.js); the reason itself stays for the check and once the exercise is solved.
  const NUDGE = {
    hand: () => L('Which hand is the right one here? Check the sign of the charge (a current counts as positive).', 'Welche Hand ist hier die richtige? Prüfe das Vorzeichen der Ladung (ein Strom zählt als positiv).'),
    gripB: () => L('Check with the right-hand grip rule: which way do your fingers curl around wire 1 at the place of wire 2?', 'Prüfe mit der Rechte-Hand-Regel: In welche Richtung krümmen sich deine Finger um Draht 1 am Ort von Draht 2?'),
    grip: () => L('Check the sense of the arrows: grip the conductor with your right hand, thumb along the current. Which way do the fingers curl?', 'Prüfe den Umlaufsinn der Pfeile: Umfasse den Leiter mit der rechten Hand, Daumen in Stromrichtung. Wohin zeigen die gekrümmten Finger?'),
    gripAt: () => L('Mind the right hand: thumb along the current, which way do the fingers curl at this point?', 'Achte auf die rechte Hand: Daumen in Stromrichtung, wohin zeigen die gekrümmten Finger an dieser Stelle?'),
    ns: () => L('From which pole to which do the field lines run outside a magnet, and which way is that here?', 'Von welchem Pol zu welchem laufen die Feldlinien ausserhalb eines Magneten, und welche Richtung ist das hier?'),
  };

  // Four options for a force (or field): the right one, then tempting wrong ones.
  function forceOptions(r, right, tempt, how, extraNone = L('no force', 'keine Kraft')) {
    const out = [{ d: right, ok: true }], has = (d) => out.some((o) => key(o.d) === key(d));
    for (const [d, tag] of tempt) if (out.length < 4 && !has(d)) out.push({ d, ok: false, tag });
    for (const d of r.shuffle([...AXES, null])) if (out.length < 4 && !has(d)) out.push({ d, ok: false, tag: d ? 'other' : 'none' });
    return r.shuffle(out).map((o) => ({ html: tile(o.d, extraNone), ok: o.ok, tag: o.tag, why: o.ok ? '' : `${o.tag && WHYF[o.tag] ? WHYF[o.tag]() + ' ' : ''}${how}`, ...(o.tag === 'hand' ? { nudge: NUDGE.hand() } : {}) }));
  }
  const neg = (d) => d && d.map((x) => (x === 0 ? 0 : -x));
  const tiles = (key2, label, options, multi = false) => ({ type: 'tiles', key: key2, label, multi, options });

  // ---------------------------------------------------------------- the vector drawn (practice)
  const toArrow = (d) => (d[2] ? (d[2] > 0 ? 'out' : 'in') : (((Math.round((Math.atan2(d[1], d[0]) * 180) / Math.PI) % 360) + 360) % 360));
  const fromArrow = (a) => (a === 'out' ? [0, 0, 1] : a === 'in' ? [0, 0, -1] : [Math.round(Math.cos((a * Math.PI) / 180)) + 0, Math.round(Math.sin((a * Math.PI) / 180)) + 0, 0]);
  const NAMES = { F: () => L('Force', 'Kraft'), B: () => L('Field', 'Feld'), v: () => L('Velocity', 'Geschwindigkeit') };
  // the figure without the unknown vector, and where the drawn one starts: at the middle of the
  // charge or wire (clear of it), its ⊙ ⊗ beside it in the first slot the figure leaves free
  function drawSpec(kind, o, rest) {
    const g = sceneAt(o.items[0].at, o), it = o.items[0], gap = it.kind === 'piece' && !it.d[2] ? 9 : 16;
    // a new arrow points where no answer and no vector of the figure does
    const taken = [...rest.fits, ...o.vecs.filter((v) => v.dir).map((v) => v.dir)];
    const start = [45, 135, 225, 315, 0, 90, 180, 270].find((a) => !taken.some((d) => same(d, fromArrow(a))));
    return { kind, name: NAMES[kind](), fig: scene(o), at: g.at, gap, aside: [30 + 30 * g.slot, -30], start, ...rest };
  }
  const choice = (key2, label, options) => ({ type: 'choice', key: key2, label, options });

  // ---------------------------------------------------------------- the direction of the force
  function dirForce(kind, seed) {
    const r = rng(seed * 31 + 7);
    for (;;) {
      const q = kind === 'I' ? 1 : r.pick([1, 1, -1, -1, 0]), v = r.pick(AXES), B = r.pick(AXES), pt = particle(r, q);
      if (kind === 'I' && same(v, B)) continue; // a current along the field: rare, but it comes up in the statements
      const F = force(q, v, B), none = !F;
      if (none && r.next() < 0.6) continue; // mostly a force
      const how = howForce(q, kind, v, B);
      const tempt = none ? [[v, 'some'], [B, 'some']] : [[neg(F), 'hand'], [v, 'alongV'], [B, 'alongB'], [null, 'none']];
      const items = [kind === 'I' ? { kind: 'piece', d: v, at: [0, 0], name: '<tspan class="it">I</tspan>' } : drawn(pt, [0, 0])];
      const fig = scene({ field: { dir: B }, items, vecs: [{ of: 0, kind: kind === 'I' ? 'I' : 'v', dir: v }, { of: 0, kind: 'F', unknown: true }] });
      const text = kind === 'I'
        ? L(`<p>A piece of wire carries a current ${it('I')} (${dirName(v)}) in a magnetic field (${dirName(B)}).</p>`, `<p>Ein Drahtstück führt einen Strom ${it('I')} (${dirName(v)}) in einem Magnetfeld (${dirName(B)}).</p>`)
        : L(`<p>${cap(pt.name())} moves ${dirName(v)} through a magnetic field that points ${dirName(B)}.</p>`, `<p>${cap(pt.name())} bewegt sich ${dirName(v)} durch ein Magnetfeld, das ${dirName(B)} zeigt.</p>`);
      // drawn: a wrong direction has the tag of the option it would be (or perp)
      const against = (d, x) => same(d, x) || same(d, neg(x));
      const judge = (d) => {
        if (F ? d && same(d, F) : !d) return { ok: true, why: how };
        const tag = !F ? 'some' : !d ? 'none' : same(d, neg(F)) ? 'hand' : against(d, v) ? 'alongV' : against(d, B) ? 'alongB' : 'perp';
        return { ok: false, tag, nudge: tag === 'hand' ? NUDGE.hand() : WHYF[tag](), why: `${WHYF[tag]()} ${how}` };
      };
      const draw = drawSpec('F', { field: { dir: B }, items, vecs: [{ of: 0, kind: kind === 'I' ? 'I' : 'v', dir: v }] }, {
        ask: kind === 'I' ? L('Draw the magnetic force on the wire.', 'Zeichne die magnetische Kraft auf den Draht.') : L('Draw the magnetic force on the particle.', 'Zeichne die magnetische Kraft auf das Teilchen.'),
        none: true, fits: F ? [F] : [], ...(F ? { show: F } : {}), judge,
      });
      return {
        kind: 'dir', title: L('The direction of the force', 'Die Richtung der Kraft'), text, figs: `<div class="fig">${fig}</div>`, draw,
        questions: [tiles('F', L('In which direction does the magnetic force point?', 'In welche Richtung zeigt die magnetische Kraft?'), forceOptions(r, F, tempt, how))],
        hints: q ? [
          kind === 'I' ? L(`The current flows ${dirName(v)}, the field points ${dirName(B)}. A current counts as positive charges moving along it. Does it run across the field or along it?`, `Der Strom fliesst ${dirName(v)}, das Feld zeigt ${dirName(B)}. Ein Strom zählt als positive Ladungen, die sich in Stromrichtung bewegen. Läuft er quer zum Feld oder längs?`)
            : L(`${chargeOf(pt)} It moves ${dirName(v)}, the field points ${dirName(B)}: across the field or along it?`, `${chargeOf(pt)} Es bewegt sich ${dirName(v)}, das Feld zeigt ${dirName(B)}: quer zum Feld oder längs?`),
          L(`${LAW()}: the force is perpendicular both to ${vName(kind)} (${dirName(v)}) and to the field (${dirName(B)}), and zero if the two are parallel.`, `${LAW()}: Die Kraft steht senkrecht zu ${kind === 'I' ? `dem Strom ${it('I')}` : `der Geschwindigkeit ${it('v')}`} (${dirName(v)}) und zum Feld (${dirName(B)}), und sie ist null, wenn die beiden parallel sind.`),
          L(`${hand(q)}: thumb ${dirName(v)}, index finger ${dirName(B)}. Where does the middle finger point?`, `${hand(q)}: Daumen ${dirName(v)}, Zeigefinger ${dirName(B)}. Wohin zeigt der Mittelfinger?`),
        ] : [
          L(`${chargeOf(pt)} It moves ${dirName(v)} through a field ${dirName(B)}, but what charge does it bring?`, `${chargeOf(pt)} Es bewegt sich ${dirName(v)} durch ein Feld, das ${dirName(B)} zeigt, aber welche Ladung bringt es mit?`),
          L(`${LAW()}: what does the force come to for a particle without charge?`, `${LAW()}: Was ergibt sich für die Kraft bei einem Teilchen ohne Ladung?`),
        ],
        solution: [how], p: { q, v: key(v), B: key(B), pt: pt.id },
      };
    }
  }

  // ---------------------------------------------------------------- the missing field or velocity
  function dirMissing(seed) {
    const r = rng(seed * 37 + 11);
    for (;;) {
      const q = r.pick([1, -1]), missing = r.pick(['B', 'v']), a = r.pick(AXES), c = r.pick(CANDS), pt = particle(r, q);
      const F = missing === 'B' ? force(q, a, c) : force(q, c, a);
      if (!F || !AXES.some((x) => same(x, F))) continue;
      const fit = fitting(missing, q, a, F), wrong = CANDS.filter((d) => !fit.some((f) => same(f, d)));
      const k = Math.min(fit.length, r.pick([1, 2, 2, 3])), opts = [...r.shuffle(fit.slice()).slice(0, k), ...r.shuffle(wrong.slice()).slice(0, 4 - k)];
      const what = missing === 'B' ? L('the field', 'das Feld') : L('the velocity', 'die Geschwindigkeit');
      const options = opts.map((d) => {
        const Fd = missing === 'B' ? force(q, a, d) : force(q, d, a), ok = fit.some((f) => same(f, d));
        const why = ok ? L(`With ${what} ${dirName(d)}, the force points ${dirName(F)} too.`, `Mit ${missing === 'B' ? 'dem Feld' : 'der Geschwindigkeit'} ${dirName(d)} zeigt die Kraft ebenfalls ${dirName(F)}.`)
          : Fd ? L(`With ${what} ${dirName(d)}, the force would point ${dirName(Fd)}.`, `Mit ${missing === 'B' ? 'dem Feld' : 'der Geschwindigkeit'} ${dirName(d)} würde die Kraft ${dirName(Fd)} zeigen.`)
            : L(`With ${what} ${dirName(d)}, ${missing === 'B' ? 'the field would be parallel to the velocity' : 'the velocity would be parallel to the field'}: no force.`, `Mit ${missing === 'B' ? 'dem Feld' : 'der Geschwindigkeit'} ${dirName(d)} wäre ${missing === 'B' ? 'das Feld parallel zur Geschwindigkeit' : 'die Geschwindigkeit parallel zum Feld'}: keine Kraft.`);
        return { html: tile(d), ok, why };
      });
      const v = missing === 'B' ? a : null, B = missing === 'B' ? null : a;
      const fig = scene({ field: { dir: B }, items: [drawn(pt, [0, 0])], vecs: [missing === 'B' ? { of: 0, kind: 'v', dir: v } : { of: 0, kind: 'v', unknown: true }, { of: 0, kind: 'F', dir: F }, ...(missing === 'B' ? [{ of: 0, kind: 'B', unknown: true }] : [])] });
      const several = fit.length > 1;
      const text = missing === 'B'
        ? L(`<p>${cap(pt.name())} moves ${dirName(v)}. The magnetic force on it points ${dirName(F)}.</p>`, `<p>${cap(pt.name())} bewegt sich ${dirName(v)}. Die magnetische Kraft auf es zeigt ${dirName(F)}.</p>`)
        : L(`<p>${cap(pt.name())} is in a magnetic field that points ${dirName(B)}. The magnetic force on it points ${dirName(F)}.</p>`, `<p>${cap(pt.name())} befindet sich in einem Magnetfeld, das ${dirName(B)} zeigt. Die magnetische Kraft auf es zeigt ${dirName(F)}.</p>`);
      const sol = several
        ? L(`Only the part of ${what} perpendicular to the ${missing === 'B' ? 'velocity' : 'field'} matters for the force; a part along it adds nothing. So several directions fit: all those whose perpendicular part gives the force ${dirName(F)} with the ${q > 0 ? 'right' : 'left'} hand: ${fit.map(dirName).join(', ')}.`,
          `Für die Kraft zählt nur der Teil ${missing === 'B' ? 'des Feldes senkrecht zur Geschwindigkeit' : 'der Geschwindigkeit senkrecht zum Feld'}; ein Teil längs dazu trägt nichts bei. Also passen mehrere Richtungen: alle, deren senkrechter Teil mit der ${q > 0 ? 'rechten' : 'linken'} Hand die Kraft ${dirName(F)} ergibt: ${fit.map(dirName).join(', ')}.`)
        : L(`Only one of the directions here fits: ${dirName(fit[0])}. Check it with the ${q > 0 ? 'right' : 'left'} hand.`, `Nur eine der Richtungen hier passt: ${dirName(fit[0])}. Prüfe sie mit der ${q > 0 ? 'rechten' : 'linken'} Hand.`);
      // drawn: one direction that fits is enough; once done, the others that fit are named
      const others = (d) => fit.filter((f) => !same(f, d));
      const judge = (d) => {
        const Fd = d && (missing === 'B' ? force(q, a, d) : force(q, d, a)), ok = !!d && same(Fd, F);
        const wDe = missing === 'B' ? 'dem Feld' : 'der Geschwindigkeit';
        if (ok) {
          const also = others(d).length ? L(` These fit as well: ${others(d).map(dirName).join(', ')}.`, ` Ebenso passen: ${others(d).map(dirName).join(', ')}.`) : '';
          return { ok, why: `${L(`With ${what} ${dirName(d)}, the force points ${dirName(F)}.`, `Mit ${wDe} ${dirName(d)} zeigt die Kraft ${dirName(F)}.`)}${also} ${sol}` };
        }
        const tag = Fd && same(Fd, neg(F)) ? 'hand' : 'other';
        const nudge = !d ? L(`Draw a direction of ${what}.`, `Zeichne eine Richtung ${missing === 'B' ? 'des Feldes' : 'der Geschwindigkeit'}.`)
          : Fd ? L(`With ${what} ${dirName(d)}, the force would point ${dirName(Fd)}.`, `Mit ${wDe} ${dirName(d)} würde die Kraft ${dirName(Fd)} zeigen.`)
            : L(`With ${what} ${dirName(d)}, ${missing === 'B' ? 'the field would be parallel to the velocity' : 'the velocity would be parallel to the field'}: no force.`, `Mit ${wDe} ${dirName(d)} wäre ${missing === 'B' ? 'das Feld parallel zur Geschwindigkeit' : 'die Geschwindigkeit parallel zum Feld'}: keine Kraft.`);
        return { ok, tag, nudge, why: `${nudge} ${sol}` };
      };
      const draw = drawSpec(missing, { field: { dir: B }, items: [drawn(pt, [0, 0])], vecs: [...(missing === 'B' ? [{ of: 0, kind: 'v', dir: v }] : []), { of: 0, kind: 'F', dir: F }] }, {
        ask: missing === 'B' ? L('Draw a direction of the field that gives this force. More than one may fit: one is enough.', 'Zeichne eine Richtung des Feldes, die diese Kraft ergibt. Es können mehrere passen: Eine genügt.')
          : L('Draw a direction of motion that gives this force. More than one may fit: one is enough.', 'Zeichne eine Bewegungsrichtung, die diese Kraft ergibt. Es können mehrere passen: Eine genügt.'),
        none: false, fits: fit, show: fit.find((f) => AXES.some((x) => same(x, f))) || fit[0], judge,
      });
      return {
        kind: 'dir', title: missing === 'B' ? L('Which field?', 'Welches Feld?') : L('Which velocity?', 'Welche Geschwindigkeit?'), text, figs: `<div class="fig">${fig}</div>`, draw,
        questions: [tiles('m', missing === 'B' ? L('Which directions of the field fit? Tick all that do.', 'Welche Richtungen des Feldes passen? Kreuze alle an, die passen.') : L('Which directions of motion fit? Tick all that do.', 'Welche Bewegungsrichtungen passen? Kreuze alle an, die passen.'), options, true)],
        hints: [L(`${chargeOf(pt)} Given are ${missing === 'B' ? `the velocity (${dirName(a)})` : `the field (${dirName(a)})`} and the force (${dirName(F)}); ${what} is missing.`, `${chargeOf(pt)} Gegeben sind ${missing === 'B' ? `die Geschwindigkeit (${dirName(a)})` : `das Feld (${dirName(a)})`} und die Kraft (${dirName(F)}); ${missing === 'B' ? 'das Feld' : 'die Geschwindigkeit'} fehlt.`),
          L(`${hand(q)}: thumb along the velocity, index finger along the field, middle finger along the force. Hold the ${missing === 'B' ? 'thumb' : 'index finger'} ${dirName(a)} and the middle finger ${dirName(F)}: where does the ${missing === 'B' ? 'index finger' : 'thumb'} point?`, `${hand(q)}: Daumen in Richtung der Geschwindigkeit, Zeigefinger in Richtung des Feldes, Mittelfinger in Richtung der Kraft. Halte den ${missing === 'B' ? 'Daumen' : 'Zeigefinger'} ${dirName(a)} und den Mittelfinger ${dirName(F)}: Wohin zeigt der ${missing === 'B' ? 'Zeigefinger' : 'Daumen'}?`),
          L(`The force is perpendicular to ${missing === 'B' ? 'the field' : 'the velocity'}: a direction along the force or against it cannot fit.`, `Die Kraft steht senkrecht zu${missing === 'B' ? 'm Feld' : 'r Geschwindigkeit'}: Eine Richtung längs der Kraft oder ihr entgegen kann nicht passen.`),
          L(`Only the part of ${what} perpendicular to the ${missing === 'B' ? 'velocity' : 'field'} counts: a slanting direction can fit as well as a straight one.`, `Nur der Teil ${missing === 'B' ? 'des Feldes senkrecht zur Geschwindigkeit' : 'der Geschwindigkeit senkrecht zum Feld'} zählt: Eine schräge Richtung kann ebenso passen wie eine gerade.`)],
        solution: [sol], p: { q, missing, a: key(a), F: key(F), o: opts.map(key), pt: pt.id },
      };
    }
  }

  // ---------------------------------------------------------------- two currents
  const WHYB = {
    hand: () => L('That is the opposite direction: use the right-hand grip rule.', 'Das ist die Gegenrichtung: Nimm die Rechte-Hand-Regel für das Umfassen.'),
    radial: () => L('The field circles around the current: it does not point towards it or away from it.', 'Das Feld umkreist den Strom: Es zeigt nicht zu ihm hin oder von ihm weg.'),
    along: () => L('The field of a straight current does not point along the current.', 'Das Feld eines geraden Stroms zeigt nicht in Richtung des Stroms.'),
  };
  function pair(kind, seed) {
    const r = rng(seed * 41 + 13);
    for (;;) {
      let d1, d2, P;
      if (kind === 'parallel') {
        d1 = r.pick(AXES.filter((d) => d[2] || d[0])); d2 = r.next() < 0.5 ? d1 : neg(d1);
        P = d1[2] ? r.pick([[2.2, 0, 0], [0, -1.6, 0]]) : [0, -1.6, 0];
      } else {
        d1 = r.pick(AXES); d2 = r.pick(AXES.filter((d) => !same(d, d1) && !same(d, neg(d1))));
        P = r.pick(d1[2] ? [[2.2, 0, 0], [-2.2, 0, 0], [0, 1.6, 0], [0, -1.6, 0]] : d1[0] ? [[0, 1.6, 0], [0, -1.6, 0]] : [[2.2, 0, 0], [-2.2, 0, 0]]);
      }
      const B = wireField(d1, P);
      if (!B || !AXES.some((x) => same(x, B))) continue;
      const Bz = B.map((x) => Math.round(x * 1e9) / 1e9), F = force(1, d2, Bz);
      const howB = L(`Right hand around wire 1, thumb along its current (${dirName(d1)}): at wire 2 the fingers point ${dirName(Bz)}.`, `Rechte Hand um Draht 1, Daumen in seiner Stromrichtung (${dirName(d1)}): Bei Draht 2 zeigen die Finger ${dirName(Bz)}.`);
      const howF = howForce(1, 'I', d2, Bz);
      const radial = P.map((x) => Math.sign(Math.round(x * 10))), qB = tiles('B', L('(a) In which direction does the field of wire 1 point at wire 2?', '(a) In welche Richtung zeigt das Feld von Draht 1 bei Draht 2?'),
        forceOptions(r, Bz, [[neg(Bz), 'hand'], ...(AXES.some((x) => same(x, radial)) ? [[AXES.find((x) => same(x, radial)), 'radial']] : []), [d1, 'along']], howB, L('no field', 'kein Feld')).map((o) => ({ ...o, why: o.ok ? '' : `${o.tag && WHYB[o.tag] ? WHYB[o.tag]() + ' ' : ''}${howB}`, nudge: o.tag === 'hand' ? NUDGE.gripB() : undefined })));
      const qF = tiles('F', L('(b) In which direction does the magnetic force on wire 2 point?', '(b) In welche Richtung zeigt die magnetische Kraft auf Draht 2?'),
        forceOptions(r, F, [[neg(F), 'hand'], [d2, 'alongV'], [Bz, 'alongB'], [null, 'none']], howF));
      const items = [{ kind: 'wire', d: d1, at: [0, 0], name: '1' }, { kind: kind === 'parallel' ? 'wire' : 'piece', d: d2, at: [P[0], P[1]], name: '2' }];
      const fig = scene({ items, vecs: [] });
      const together = same(d2, d1), big = r.pick([1, 2]);
      const rule = L(' So currents in the same direction attract each other, opposite currents repel each other.', ' Gleich gerichtete Ströme ziehen sich also an, entgegengesetzte stossen sich ab.');
      const howA = L(`The force on wire 2 points ${together ? 'towards' : 'away from'} wire 1.${rule} By the same rule wire 1 is pulled ${together ? 'towards' : 'away from'} wire 2, with a force of the same size, whatever the currents (Newton’s third law).`,
        `Die Kraft auf Draht 2 zeigt ${together ? 'zu Draht 1 hin' : 'von Draht 1 weg'}.${rule} Nach derselben Regel wird Draht 1 ${together ? 'zu Draht 2 hin' : 'von Draht 2 weg'} gezogen, mit einer gleich grossen Kraft, wie gross die Ströme auch sind (drittes Newtonsches Axiom).`);
      const qA = choice('A', L('(c) The two wires', '(c) Die beiden Drähte'), [
        { label: L('attract each other', 'ziehen sich an'), ok: together, tag: 'pair' }, { label: L('repel each other', 'stossen sich ab'), ok: !together, tag: 'pair' },
        { label: L(`only wire ${big} exerts a force (it carries the larger current)`, `nur Draht ${big} übt eine Kraft aus (er führt den grösseren Strom)`), ok: false, tag: 'newton3' },
        { label: L('exert no force on each other: the wires are not charged', 'üben keine Kraft aufeinander aus: Die Drähte sind nicht geladen'), ok: false, tag: 'neutral' },
      ].map((o) => ({ ...o, tag: o.ok ? undefined : o.tag, why: o.ok ? '' : howA })));
      const text = kind === 'parallel'
        ? L(`<p>Two long straight parallel wires carry currents ${together ? 'in the same direction' : 'in opposite directions'}, as shown; the current in wire ${big} is twice as large as in the other.</p>`, `<p>Zwei lange gerade parallele Drähte führen Ströme ${together ? 'in derselben Richtung' : 'in entgegengesetzten Richtungen'}, wie gezeigt; der Strom in Draht ${big} ist doppelt so gross wie im anderen.</p>`)
        : L(`<p>A long straight wire 1 carries a current ${dirName(d1)}. Near it, a short piece of wire 2 carries a current ${dirName(d2)}.</p>`, `<p>Ein langer gerader Draht 1 führt einen Strom ${dirName(d1)}. In seiner Nähe führt ein kurzes Drahtstück 2 einen Strom ${dirName(d2)}.</p>`);
      return {
        kind: 'pair', title: L('Two currents', 'Zwei Ströme'), text, figs: `<div class="fig">${fig}</div>`,
        questions: kind === 'parallel' ? [qB, qF, qA] : [qB, qF],
        hints: [
          L(`Wire 1 carries its current ${dirName(d1)}; wire 2 lies ${P[0] > 0 ? 'to the right of' : P[0] < 0 ? 'to the left of' : P[1] > 0 ? 'above' : 'below'} it, its current ${dirName(d2)}. First the field of wire 1 at wire 2, then the force on wire 2 in that field.`, `Draht 1 führt seinen Strom ${dirName(d1)}; Draht 2 liegt ${P[0] > 0 ? 'rechts von' : P[0] < 0 ? 'links von' : P[1] > 0 ? 'über' : 'unter'} ihm, sein Strom ${dirName(d2)}. Zuerst das Feld von Draht 1 bei Draht 2, dann die Kraft auf Draht 2 in diesem Feld.`),
          L(`(a) Grip wire 1 with your right hand, thumb ${dirName(d1)}: which way do the fingers curl at the place of wire 2?`, `(a) Umfasse Draht 1 mit der rechten Hand, Daumen ${dirName(d1)}: Wohin zeigen die gekrümmten Finger am Ort von Draht 2?`),
          L(`(b) Right hand for wire 2: thumb along its current (${dirName(d2)}), index finger along the field from (a): where does the middle finger point?${kind === 'parallel' ? ' (c) Does that force point towards wire 1 or away from it, and what does Newton’s third law say about the force on wire 1?' : ''}`, `(b) Rechte Hand für Draht 2: Daumen in seiner Stromrichtung (${dirName(d2)}), Zeigefinger in Richtung des Feldes aus (a): Wohin zeigt der Mittelfinger?${kind === 'parallel' ? ' (c) Zeigt diese Kraft zu Draht 1 hin oder von ihm weg, und was sagt das dritte Newtonsche Axiom über die Kraft auf Draht 1?' : ''}`),
        ],
        solution: kind === 'parallel' ? [howB, howF, howA] : [howB, howF], p: { kind, d1: key(d1), d2: key(d2), P: P.join(','), big: kind === 'parallel' ? big : 0 },
      };
    }
  }

  // ---------------------------------------------------------------- field lines
  // A wire seen end-on; a loop, a solenoid or a bar magnet with its axis across or up the page.
  // The options: the right lines, the arrows turned round, or (a loop, a coil, a magnet) turned
  // round only inside or only outside, so that the lines do not close; for a wire, radial lines.
  const WHYL = {
    grip: () => L('The arrows run the wrong way round: grip the conductor with your right hand, thumb along the current; the fingers curl the way of the field.', 'Die Pfeile laufen falsch herum: Umfasse den Leiter mit der rechten Hand, Daumen in Stromrichtung; die gekrümmten Finger zeigen die Richtung des Feldes.'),
    ns: () => L('Outside a magnet, the field lines run from the north pole to the south pole.', 'Ausserhalb eines Magneten laufen die Feldlinien vom Nordpol zum Südpol.'),
    closed: () => L('Magnetic field lines are closed. Follow a line along its arrows: it comes back round the outside and carries on through the inside, without a break and without turning round.', 'Magnetische Feldlinien sind geschlossen. Folge einer Linie in Pfeilrichtung: Sie läuft aussen zurück und innen weiter, ohne Unterbruch und ohne umzukehren.'),
    radial: () => L('The field of a straight current circles around it: it does not point towards or away from the wire.', 'Das Feld eines geraden Stroms umkreist ihn: Es zeigt nicht zum Draht hin oder von ihm weg.'),
  };
  const drawLines = (o) => linesFig({ ...o, small: true });
  // (b) the field at a point named in words: around a wire above, below, to the right or to the
  // left of it; for a loop or a solenoid in the middle, on the axis outside, or just outside a
  // conductor (the lines coming back round); for a magnet inside, beyond either pole on the axis,
  // or beside its middle. [where (en, de), the field there as a multiple of the field inside (or
  // the wire's direction), the tag of the opposite direction]
  const AT = {
    wire: { up: [['directly above the wire', 'direkt über dem Draht'], [0, 1]], down: [['directly below the wire', 'direkt unter dem Draht'], [0, -1]], right: [['to the right of the wire', 'rechts neben dem Draht'], [1, 0]], left: [['to the left of the wire', 'links neben dem Draht'], [-1, 0]] },
    loop: { mid: [() => ['in the middle of the loop', 'in der Mitte der Schleife'], 1, 'grip'], axis: [() => ['on its axis, outside the loop', 'auf ihrer Achse, ausserhalb der Schleife'], 1, 'closed'], side: [(e) => [`just outside the ${e[0]} conductor, on the side away from the middle of the loop`, `knapp ausserhalb des ${e[1]} Leiters, auf der von der Schleifenmitte abgewandten Seite`], -1, 'closed'] },
    solenoid: { mid: [() => ['inside the solenoid, in its middle', 'im Innern der Spule, in ihrer Mitte'], 1, 'grip'], axis: [() => ['on its axis, just beyond one end', 'auf ihrer Achse, knapp hinter einem Ende'], 1, 'closed'], side: [(e) => [`just outside the ${e[0]} row of conductors, beside the middle of the solenoid`, `knapp ausserhalb des ${e[1]} Teils, neben der Mitte der Spule`], -1, 'closed'] },
    magnet: { N: [() => ['just beyond its north pole, on its axis', 'knapp vor seinem Nordpol, auf seiner Achse'], 1, 'ns'], S: [() => ['just beyond its south pole, on its axis', 'knapp vor seinem Südpol, auf seiner Achse'], 1, 'ns'], mid: [() => ['inside the magnet, in its middle', 'im Innern des Magneten, in seiner Mitte'], 1, 'closed'], side: [() => ['just beside the middle of the magnet, outside it', 'knapp neben der Mitte des Magneten, ausserhalb'], -1, 'ns'] },
  };
  const WHYAT = {
    grip: () => L('That is the field for a current the other way round: mind the right hand.', 'Das ist das Feld für einen Strom in der Gegenrichtung: Achte auf die rechte Hand.'),
    across: () => L('By symmetry the field there runs along the axis, not across it.', 'Aus Symmetriegründen verläuft das Feld dort längs der Achse, nicht quer zu ihr.'),
  };
  function lines(src, seed) {
    const r = rng(seed * 79 + 47), s = r.pick([1, -1]), vertical = src !== 'wire' && r.next() < 0.5;
    const base = { src, s, vertical }, inside = vertical ? [0, s, 0] : [s, 0, 0];
    const wrongs = src === 'wire' ? [['reverse', 'grip'], ['out', 'radial'], ['in', 'radial']] : [['reverse', src === 'magnet' ? 'ns' : 'grip'], ['inside', 'closed'], ['outside', 'closed']];
    const ends = vertical ? [L('left', 'linken'), L('right', 'rechten')] : [L('upper', 'oberen'), L('lower', 'unteren')];
    const endsEnDe = vertical ? ['left', 'linken'] : ['upper', 'oberen'];
    const way = (k) => (k > 0 ? L('out of the page', 'aus der Seite heraus') : L('into the page', 'in die Seite hinein'));
    const what = { wire: L('a long straight wire', 'eines langen geraden Drahts'), loop: L('a circular loop', 'einer kreisförmigen Leiterschleife'), solenoid: L('a solenoid', 'einer Spule'), magnet: L('a bar magnet', 'eines Stabmagneten') }[src];
    // the magnet: where its north pole is (at +x for s = +1, turned up the page when vertical)
    const nSide = vertical ? (s > 0 ? ['at the top', 'oben', 'at the bottom', 'unten'] : ['at the bottom', 'unten', 'at the top', 'oben']) : (s > 0 ? ['at the right', 'rechts', 'at the left', 'links'] : ['at the left', 'links', 'at the right', 'rechts']);
    const text = src === 'wire' ? L(`<p>A long straight wire carries a current ${way(s)}.</p>`, `<p>Ein langer gerader Draht führt einen Strom ${way(s)}.</p>`)
      : src === 'magnet' ? L(`<p>A bar magnet, its north pole N ${nSide[0]} and its south pole S ${nSide[2]}.</p>`, `<p>Ein Stabmagnet, sein Nordpol N ${nSide[1]} und sein Südpol S ${nSide[3]}.</p>`)
        : L(`<p>${src === 'loop' ? 'A circular loop of wire is cut through its middle' : 'A solenoid (a long coil) is cut along its axis'} and seen from the side: in the ${ends[0]} ${src === 'loop' ? 'conductor' : 'row'}, the current flows ${way(s)}, in the ${ends[1]} one ${way(-s)}.</p>`,
          `<p>${src === 'loop' ? 'Eine kreisförmige Leiterschleife ist in der Mitte durchgeschnitten' : 'Eine Spule ist längs ihrer Achse durchgeschnitten'} und von der Seite gesehen: Im ${ends[0]} ${src === 'loop' ? 'Leiter' : 'Teil'} fliesst der Strom ${way(s)}, im ${ends[1]} ${way(-s)}.</p>`);
    const how = src === 'wire' ? L(`${GRIP()} A current ${way(s)}: the field lines are circles around the wire, ${s > 0 ? 'anticlockwise' : 'clockwise'}.`, `${GRIP()} Ein Strom ${way(s)}: Die Feldlinien sind Kreise um den Draht, ${s > 0 ? 'im Gegenuhrzeigersinn' : 'im Uhrzeigersinn'}.`)
      : src === 'magnet' ? L(`Outside the magnet the field lines run from N to S, inside it from S to N (${dirName(inside)}): every line is closed.`, `Ausserhalb des Magneten laufen die Feldlinien von N nach S, innen von S nach N (${dirName(inside)}): Jede Linie ist geschlossen.`)
        : L(`Grip rule at each conductor: between the ${src === 'loop' ? 'two conductors' : 'two rows'} the fields add up and point ${dirName(inside)}. Outside, the lines come back round: every line is closed. ${src === 'solenoid' ? 'The end where the field lines come out acts as a north pole: the solenoid’s field outside is like that of a bar magnet.' : ''}`,
          `Rechte-Hand-Regel bei jedem Leiter: Zwischen den ${src === 'loop' ? 'beiden Leitern' : 'beiden Reihen'} addieren sich die Felder und zeigen ${dirName(inside)}. Aussen laufen die Linien zurück: Jede Linie ist geschlossen. ${src === 'solenoid' ? 'Das Ende, wo die Feldlinien austreten, wirkt als Nordpol: Aussen ist das Feld der Spule wie das eines Stabmagneten.' : ''}`);
    const opts = [{ wrong: null, ok: true }, ...wrongs.map(([wrong, tag]) => ({ wrong, tag }))];
    const qp = { type: 'pick', key: 'p', label: L('(a) Which drawing shows its field lines?', '(a) Welche Zeichnung zeigt seine Feldlinien?'), options: r.shuffle(opts).map((o) => ({ html: drawLines({ ...base, wrong: o.wrong }), ok: !!o.ok, tag: o.tag, why: o.ok ? '' : `${WHYL[o.tag]()} ${how}`, ...(NUDGE[o.tag] ? { nudge: NUDGE[o.tag]() } : {}) })) };
    // (b) the field at a point
    const at = r.pick(Object.keys(AT[src])), A = AT[src][at];
    let where, B, oppTag, howB;
    if (src === 'wire') {
      where = L(...A[0]); B = [-s * A[1][1] || 0, s * A[1][0] || 0, 0]; oppTag = 'grip';
      howB = L(`The field lines are circles around the wire, ${s > 0 ? 'anticlockwise' : 'clockwise'} for a current ${way(s)}: ${A[0][0]} the circle runs ${dirName(B)}.`, `Die Feldlinien sind Kreise um den Draht, ${s > 0 ? 'im Gegenuhrzeigersinn' : 'im Uhrzeigersinn'} für einen Strom ${way(s)}: ${A[0][1]} läuft der Kreis ${dirName(B)}.`);
    } else {
      const w = A[0](endsEnDe);
      where = L(...w); B = inside.map((x) => x * A[1] || 0); oppTag = A[2];
      const cond = src === 'loop' ? L('the two conductors', 'den beiden Leitern') : L('the two rows', 'den beiden Reihen');
      howB = src === 'magnet'
        ? { N: L(`The field lines leave the magnet at its north pole: beyond N, on the axis, the field points away from N, ${dirName(B)}.`, `Die Feldlinien treten am Nordpol aus dem Magneten aus: Vor N, auf der Achse, zeigt das Feld von N weg, ${dirName(B)}.`),
          S: L(`The field lines enter the magnet at its south pole: beyond S, on the axis, the field points towards S, ${dirName(B)}.`, `Die Feldlinien treten am Südpol in den Magneten ein: Vor S, auf der Achse, zeigt das Feld zu S hin, ${dirName(B)}.`),
          mid: L(`Inside the magnet the lines run from S to N, ${dirName(B)}: they close the lines that run from N to S outside.`, `Im Innern des Magneten laufen die Linien von S nach N, ${dirName(B)}: Sie schliessen die Linien, die aussen von N nach S laufen.`),
          side: L(`Outside the magnet the lines run from N to S: beside its middle the field points ${dirName(B)}, against the field inside.`, `Ausserhalb des Magneten laufen die Linien von N nach S: Neben seiner Mitte zeigt das Feld ${dirName(B)}, entgegen dem Feld innen.`) }[at]
        : at === 'side' ? L(`Between ${cond} the field points ${dirName(inside)}; outside, the lines come back round the other way: just outside the ${endsEnDe[0]} ${src === 'loop' ? 'conductor' : 'row'} the field points ${dirName(B)} (grip rule at ${src === 'loop' ? 'that conductor' : 'those conductors'}).`, `Zwischen ${cond} zeigt das Feld ${dirName(inside)}; aussen laufen die Linien umgekehrt zurück: Knapp ausserhalb des ${endsEnDe[1]} ${src === 'loop' ? 'Leiters' : 'Teils'} zeigt das Feld ${dirName(B)} (Rechte-Hand-Regel an ${src === 'loop' ? 'diesem Leiter' : 'diesen Leitern'}).`)
          : L(`Between ${cond} the fields of the currents add up and point ${dirName(inside)}${at === 'axis' ? '; on the axis the lines keep this direction also outside, before they spread out and come back round' : ''}.`, `Zwischen ${cond} addieren sich die Felder der Ströme und zeigen ${dirName(inside)}${at === 'axis' ? '; auf der Achse behalten die Linien diese Richtung auch ausserhalb, bevor sie auseinanderlaufen und zurückkehren' : ''}.`);
    }
    const IN = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
    const qb = tiles('B', L(`(b) Which way does the field point ${where}?`, `(b) In welche Richtung zeigt das Feld ${where}?`), r.shuffle(IN.map((d) => {
      const ok = same(d, B), tag = ok ? undefined : same(d, neg(B)) ? oppTag : src === 'wire' ? 'radial' : 'other';
      const pre = tag === 'grip' ? WHYAT.grip() : tag === 'radial' ? WHYL.radial() : tag === 'other' ? WHYAT.across() : tag ? WHYL[tag]() : '';
      const nudge = tag === 'grip' ? NUDGE.gripAt() : tag === 'ns' ? NUDGE.ns() : undefined;
      return { html: tile(d), ok, tag, why: ok ? '' : `${pre} ${howB}`, ...(nudge ? { nudge } : {}) };
    })));
    return {
      kind: 'lines', title: L(`The field of ${what}`, `Das Feld ${what}`), text, figs: `<div class="fig">${linesFig({ ...base, wrong: 'none' })}</div>`,
      questions: [qp, qb],
      hints: src === 'wire' ? [
        L(`The current flows ${way(s)}, and (b) asks for the field ${where}.`, `Der Strom fliesst ${way(s)}, und (b) fragt nach dem Feld ${where}.`),
        L(`(a) Grip the wire with your right hand, thumb ${way(s)}: do your fingers curl clockwise or anticlockwise as you see the page?`, `(a) Umfasse den Draht mit der rechten Hand, Daumen ${way(s)}: Krümmen sich deine Finger, wie du die Seite siehst, im oder gegen den Uhrzeigersinn?`),
        L(`(b) Follow that circle to the point ${where}: which way does it run there?`, `(b) Folge diesem Kreis bis zum Punkt ${where}: In welche Richtung läuft er dort?`),
      ] : src === 'magnet' ? [
        L(`N is ${nSide[0]}, S ${nSide[2]}; (b) asks for the field ${where}.`, `N ist ${nSide[1]}, S ${nSide[3]}; (b) fragt nach dem Feld ${where}.`),
        L(`(a) Outside this magnet the lines run from N, ${nSide[0]}, to S, ${nSide[2]}. Field lines have no beginning and no end: how must they carry on inside the magnet?`, `(a) Ausserhalb dieses Magneten laufen die Linien von N, ${nSide[1]}, nach S, ${nSide[3]}. Feldlinien haben keinen Anfang und kein Ende: Wie müssen sie im Innern des Magneten weiterlaufen?`),
        L(`(b) Is the point asked for inside the magnet or outside, and which pole is the line there coming from or going to?`, `(b) Liegt der gefragte Punkt im Innern des Magneten oder ausserhalb, und von welchem Pol kommt die Linie dort, oder zu welchem läuft sie?`),
      ] : [
        L(`In the ${ends[0]} ${src === 'loop' ? 'conductor' : 'row'} the current flows ${way(s)}, in the ${ends[1]} one ${way(-s)}; (b) asks for the field ${where}.`, `Im ${ends[0]} ${src === 'loop' ? 'Leiter' : 'Teil'} fliesst der Strom ${way(s)}, im ${ends[1]} ${way(-s)}; (b) fragt nach dem Feld ${where}.`),
        L(`(a) Right-hand grip rule at each ${src === 'loop' ? 'conductor' : 'row'}: between the two, do their fields add up or cancel, and which way do they point there?`, `(a) Rechte-Hand-Regel bei jedem ${src === 'loop' ? 'Leiter' : 'Teil'}: Addieren sich ihre Felder zwischen den beiden oder heben sie sich auf, und wohin zeigen sie dort?`),
        L(`(b) Field lines are closed: the lines through the middle come back round outside. Is the point asked for on the way through the middle, or on the way back?`, `(b) Feldlinien sind geschlossen: Die Linien durch die Mitte kehren aussen zurück. Liegt der gefragte Punkt auf dem Weg durch die Mitte oder auf dem Rückweg?`),
      ],
      solution: [how, howB], solFig: `<div class="fig">${linesFig({ ...base, wrong: null })}</div>`, p: { ...base, at },
    };
  }

  // ---------------------------------------------------------------- the size of the force on a wire
  const nice = (x) => String(Number(x.toPrecision(3)));
  const newton = (x) => `${nice(x)} N`;
  // the options of a force: the right one and the mistakes, apart by 15 %, sorted
  function values(right, mistakes, how, extra = [2, 0.5, 4]) {
    const out = [{ value: right, ok: true, why: '' }];
    for (const m of [...mistakes, ...extra.map((k) => ({ value: right * k, tag: 'other', why: how }))]) {
      if (out.length === 4) break;
      if (Number.isFinite(m.value) && m.value > 0 && out.every((o) => Math.abs(Math.log(m.value / o.value)) > Math.log(1.15))) out.push({ ...m, ok: false });
    }
    return out.sort((a, b) => a.value - b.value).map((o) => ({ ...o, label: newton(o.value) }));
  }
  const SIN = { 90: 1, 30: 0.5, 150: 0.5 };
  const wireAt = (ang) => [Math.round(Math.cos((ang * Math.PI) / 180) * 1e9) / 1e9, Math.round(Math.sin((ang * Math.PI) / 180) * 1e9) / 1e9, 0];
  function sizeNum(seed) {
    const r = rng(seed * 83 + 53), I = r.pick([2, 3, 4, 5]), cm = r.pick([20, 50]), B = r.pick([0.1, 0.2, 0.4]), ang = r.pick([90, 90, 30, 150]), bx = r.pick([1, -1]);
    const Lm = cm / 100, F = I * Lm * B * SIN[ang], d = wireAt(bx > 0 ? ang : 180 - ang), Bv = [bx, 0, 0];
    const how = L(`F = I·L·B·sin θ = ${I} A · ${nice(Lm)} m · ${nice(B)} T · sin ${ang}° = ${newton(I * Lm * B)} · ${SIN[ang]} = ${newton(F)}.`, `F = I·L·B·sin θ = ${I} A · ${nice(Lm)} m · ${nice(B)} T · sin ${ang}° = ${newton(I * Lm * B)} · ${SIN[ang]} = ${newton(F)}.`);
    const mistakes = ang === 90 ? [{ value: F * 100, tag: 'other', why: L(`The length in metres: ${cm} cm = ${nice(Lm)} m. ${how}`, `Die Länge in Metern: ${cm} cm = ${nice(Lm)} m. ${how}`) }, { value: F / 2, tag: 'sin', why: L(`At 90° the force is largest: sin 90° = 1. ${how}`, `Bei 90° ist die Kraft am grössten: sin 90° = 1. ${how}`) }]
      : [{ value: I * Lm * B, tag: 'sin', why: L(`Only the part of the wire across the field counts: the factor sin ${ang}° = 0.5 is missing. ${how}`, `Nur der Teil des Drahts quer zum Feld zählt: Der Faktor sin ${ang}° = 0.5 fehlt. ${how}`) }, { value: I * Lm * B * Math.sqrt(3) / 2, tag: 'sin', why: L(`That is with cos ${ang}°: the force needs the part across the field, sin θ. ${how}`, `Das ist mit cos ${ang}°: Die Kraft braucht den Teil quer zum Feld, sin θ. ${how}`) }];
    const howF = howForce(1, 'I', d, Bv), Fd = force(1, d, Bv);
    const fig = scene({ field: { dir: Bv }, items: [{ kind: 'piece', d, at: [0, 0], name: '<tspan class="it">I</tspan>' }], vecs: [{ of: 0, kind: 'F', unknown: true }] });
    return {
      kind: 'size', title: L('The force on a wire', 'Die Kraft auf einen Draht'),
      text: L(`<p>A straight piece of wire ${cm} cm long carries a current of ${I} A in a uniform magnetic field of ${nice(B)} T, at an angle of ${ang}° to the field lines.</p>`, `<p>Ein gerades Drahtstück von ${cm} cm Länge führt einen Strom von ${I} A in einem homogenen Magnetfeld von ${nice(B)} T, unter einem Winkel von ${ang}° zu den Feldlinien.</p>`),
      figs: `<div class="fig">${fig}</div>`,
      questions: [choice('F', L('(a) the size of the force on the wire', '(a) der Betrag der Kraft auf den Draht'), values(F, mistakes, how)),
        tiles('d', L('(b) In which direction does the force point?', '(b) In welche Richtung zeigt die Kraft?'), forceOptions(r, Fd, [[neg(Fd), 'hand'], [d, 'alongV'], [Bv, 'alongB']], howF))],
      hints: [
        L(`Given: the current ${I} A, the length ${cm} cm, the field ${nice(B)} T, and the angle ${ang}° between the wire and the field lines.`, `Gegeben: der Strom ${I} A, die Länge ${cm} cm, das Feld ${nice(B)} T und der Winkel ${ang}° zwischen Draht und Feldlinien.`),
        L('(a) The force on a wire: F = I·L·B·sin θ, with the length in metres and θ the angle between the wire and the field.', '(a) Die Kraft auf einen Draht: F = I·L·B·sin θ, mit der Länge in Metern und θ dem Winkel zwischen Draht und Feld.'),
        L(`First the two factors that are not plain numbers yet: ${cm} cm = ${nice(Lm)} m, and sin ${ang}° = ${SIN[ang]}. (b) Right hand: thumb along the current, index finger ${dirName(Bv)}.`, `Zuerst die beiden Faktoren, die noch keine einfachen Zahlen sind: ${cm} cm = ${nice(Lm)} m, und sin ${ang}° = ${SIN[ang]}. (b) Rechte Hand: Daumen in Stromrichtung, Zeigefinger ${dirName(Bv)}.`),
      ],
      solution: [how, howF], p: { I, cm, B, ang, bx },
    };
  }
  // The force F on a wire, then two changes: how many times as large is it now?
  const CHANGES = [
    ['I', 2, ['the current is doubled', 'der Strom wird verdoppelt']], ['I', 3, ['the current is tripled', 'der Strom wird verdreifacht']], ['I', 0.5, ['the current is halved', 'der Strom wird halbiert']],
    ['L', 2, ['a piece of wire twice as long is in the field', 'ein doppelt so langes Drahtstück ist im Feld']], ['L', 0.5, ['only half the length of wire is in the field', 'nur die halbe Drahtlänge ist im Feld']],
    ['B', 2, ['the field is made twice as strong', 'das Feld wird doppelt so stark gemacht']], ['B', 0.5, ['the field is made half as strong', 'das Feld wird halb so stark gemacht']],
    ['a', 0.5, ['the wire is turned to an angle of 30° to the field', 'der Draht wird auf einen Winkel von 30° zum Feld gedreht']], ['a', 0, ['the wire is turned to lie along the field lines', 'der Draht wird längs der Feldlinien gedreht']],
  ];
  const times = (x) => (x === 0 ? L('0 (no force)', '0 (keine Kraft)') : Math.abs(x - 1) < 1e-9 ? L('the same, F', 'gleich, F') : x > 1 ? L(`${nice(x)} F`, `${nice(x)} F`) : L(`F/${nice(1 / x)}`, `F/${nice(1 / x)}`));
  function sizeRatio(seed) {
    const r = rng(seed * 89 + 59);
    for (;;) {
      const [a, b] = r.shuffle(CHANGES.slice()).slice(0, 2);
      if (a[0] === b[0]) continue;
      const ratio = a[1] * b[1], noAngle = (a[0] === 'a' ? 1 : a[1]) * (b[0] === 'a' ? 1 : b[1]), angle = a[0] === 'a' || b[0] === 'a';
      const how = L(`F = I·L·B·sin θ: the force is proportional to each factor. ${[a, b].map((c) => (c[0] === 'a' ? (c[1] ? 'sin 30° = 0.5 instead of sin 90° = 1: a factor 0.5' : 'along the field, sin 0° = 0: no force') : `${c[2][0]}: a factor ${nice(c[1])}`)).join('; ')}. Together: ${times(ratio)}.`,
        `F = I·L·B·sin θ: Die Kraft ist proportional zu jedem Faktor. ${[a, b].map((c) => (c[0] === 'a' ? (c[1] ? 'sin 30° = 0.5 statt sin 90° = 1: ein Faktor 0.5' : 'längs des Feldes, sin 0° = 0: keine Kraft') : `${c[2][1]}: ein Faktor ${nice(c[1])}`)).join('; ')}. Zusammen: ${times(ratio)}.`);
      const cands = [[ratio, 'ok'], ...(angle ? [[noAngle, 'sin']] : []), [ratio ? 1 / ratio : 1, 'other'], [ratio * 2, 'other'], [ratio / 2, 'other'], [ratio * 4, 'other'], [1, 'other'], [2, 'other'], [0.5, 'other'], [4, 'other']];
      const opts = [];
      for (const [x, tag] of cands) if (opts.length < 4 && opts.every((o) => Math.abs(o.x - x) > 1e-9 && times(o.x) !== times(x))) opts.push({ x, tag });
      // for the hints: the quantity each change touches, and one change's factor (not the angle along the field: that one alone gives the answer)
      const sym = (c) => (c[0] === 'a' ? L(`sin θ (θ from 90° to ${c[1] ? 30 : 0}°)`, `sin θ (θ von 90° auf ${c[1] ? 30 : 0}°)`) : it(c[0]));
      const factorOf = (c) => (c[0] === 'a' ? L('sin 30° = 0.5 instead of sin 90° = 1: a factor 0.5', 'sin 30° = 0.5 statt sin 90° = 1: ein Faktor 0.5') : L(`a factor ${nice(c[1])}`, `ein Faktor ${nice(c[1])}`));
      const first = { c: a[0] === 'a' && !a[1] ? b : a };
      const whyOf = (tag) => (tag === 'sin' ? L(`The angle counts too: only the part of the wire across the field feels a force. ${how}`, `Auch der Winkel zählt: Nur der Teil des Drahts quer zum Feld spürt eine Kraft. ${how}`) : how);
      return {
        kind: 'size', title: L('Changing the force on a wire', 'Die Kraft auf einen Draht ändern'),
        text: L(`<p>A straight wire lies in a uniform magnetic field, perpendicular to the field lines; the magnetic force on it is F. Now ${a[2][0]}, and ${b[2][0]}.</p>`, `<p>Ein gerader Draht liegt in einem homogenen Magnetfeld, senkrecht zu den Feldlinien; die magnetische Kraft auf ihn ist F. Nun ${a[2][1]}, und ${b[2][1]}.</p>`),
        figs: '',
        questions: [choice('k', L('The force on the wire is now', 'Die Kraft auf den Draht ist nun'), opts.sort((x, y) => x.x - y.x).map((o) => ({ label: times(o.x), ok: o.tag === 'ok', tag: o.tag === 'ok' ? undefined : o.tag, why: o.tag === 'ok' ? '' : whyOf(o.tag) })))],
        hints: [
          L(`Two of the factors in F = I·L·B·sin θ change here: ${[a, b].map(sym).join(L(' and ', ' und '))}. Everything else stays the same.`, `Zwei der Faktoren in F = I·L·B·sin θ ändern sich hier: ${[a, b].map(sym).join(L(' and ', ' und '))}. Alles andere bleibt gleich.`),
          L('The force is proportional to each factor: find the factor of each change, then multiply the two.', 'Die Kraft ist proportional zu jedem Faktor: Bestimme den Faktor jeder Änderung und multipliziere dann die beiden.'),
          L(`Start with this one: ${first.c[2][0]}, ${factorOf(first.c)}. Now the other change.`, `Beginne mit dieser: ${first.c[2][1]}, ${factorOf(first.c)}. Nun die andere Änderung.`),
        ],
        solution: [how], p: { a: CHANGES.indexOf(a), b: CHANGES.indexOf(b) },
      };
    }
  }

  // ---------------------------------------------------------------- a coil in a field
  // A rectangular coil that can turn about an axis perpendicular to the page, seen along the axis:
  // its two long sides cut the page, side 1 carrying the current out of the page (s = 1) or into
  // it. The torque is 2·a·F·cos φ (φ the angle between the coil and the field): largest when the
  // field lies in the plane of the coil, zero when it is perpendicular to it.
  const APPS = [
    { q: ['Why does the coil of an electric motor need a commutator (split ring)?', 'Wozu braucht die Spule eines Elektromotors einen Kommutator (Stromwender)?'],
      ok: ['It reverses the current in the coil every half turn, so that the torque keeps turning it the same way.', 'Er kehrt den Strom in der Spule bei jeder halben Drehung um, damit das Drehmoment sie weiter in dieselbe Richtung dreht.'],
      wrong: [['It keeps the current in the coil flowing the same way all the time.', 'Er hält den Strom in der Spule immer in derselben Richtung.'], ['It reverses the field of the magnet every half turn.', 'Er kehrt das Feld des Magneten bei jeder halben Drehung um.'], ['It switches the current off where the torque is largest.', 'Er schaltet den Strom dort ab, wo das Drehmoment am grössten ist.']],
      why: ['Without the commutator, the torque would reverse after half a turn and the coil would swing back: the coil would come to rest across the field.', 'Ohne Kommutator würde sich das Drehmoment nach einer halben Drehung umkehren und die Spule zurückschwingen: Sie käme quer zum Feld zur Ruhe.'] },
    { q: ['In a moving-coil meter (galvanometer), why does the pointer turn further for a larger current?', 'Warum schlägt der Zeiger eines Drehspulinstruments bei grösserem Strom weiter aus?'],
      ok: ['The torque on the coil is proportional to the current; a spring balances it further round.', 'Das Drehmoment auf die Spule ist proportional zum Strom; eine Feder hält ihm weiter aussen das Gleichgewicht.'],
      wrong: [['A larger current makes the permanent magnet stronger.', 'Ein grösserer Strom macht den Dauermagneten stärker.'], ['A larger current makes the coil lighter.', 'Ein grösserer Strom macht die Spule leichter.'], ['The coil turns until the field lies in its plane, wherever the current is.', 'Die Spule dreht sich, bis das Feld in ihrer Ebene liegt, wie gross der Strom auch ist.']],
      why: ['The force on each side, I·L·B, and so the torque grow with the current; the spring’s torque grows with the angle.', 'Die Kraft auf jede Seite, I·L·B, und damit das Drehmoment wachsen mit dem Strom; das Drehmoment der Feder wächst mit dem Winkel.'] },
    { q: ['In a loudspeaker, an alternating current flows in a coil in the field of a magnet. What does the coil (with the cone) do?', 'In einem Lautsprecher fliesst ein Wechselstrom durch eine Spule im Feld eines Magneten. Was macht die Spule (mit der Membran)?'],
      ok: ['It moves back and forth, because the force reverses with the current.', 'Sie bewegt sich hin und her, weil sich die Kraft mit dem Strom umkehrt.'],
      wrong: [['It turns round and round like a motor.', 'Sie dreht sich ständig wie ein Motor.'], ['It is pushed out once and stays there.', 'Sie wird einmal hinausgedrückt und bleibt dort.'], ['It stays still: only the field changes.', 'Sie bleibt in Ruhe: Nur das Feld ändert sich.']],
      why: ['The force on the coil is I·L·B, and its direction follows the current: an alternating current makes it move back and forth at the frequency of the sound.', 'Die Kraft auf die Spule ist I·L·B, und ihre Richtung folgt dem Strom: Ein Wechselstrom lässt sie mit der Frequenz des Tons hin und her schwingen.'] },
  ];
  // the coil edge-on at phi degrees to the field (bx = ±1, along x), side 1 with the current s;
  // solved: with the forces on both sides
  function coilFig(phi, s, bx, solved) {
    const a = 0.7, u = wireAt(phi), Bv = [bx, 0, 0], F1 = force(1, [0, 0, s], Bv);
    const items = [{ kind: 'wire', d: [0, 0, s], at: [a * u[0], a * u[1]], name: '1' }, { kind: 'wire', d: [0, 0, -s], at: [-a * u[0], -a * u[1]], name: '2' }];
    // across the field the forces lie along the coil: shorter, so that they stay in the drawing,
    // and named beside them where they point at each other
    const across = Math.abs(u[1]) > 0.9, meet = across && F1[1] * u[1] < 0, len = meet ? 20 : across ? 30 : 44;
    return scene({ field: { dir: Bv }, items, links: [[0, 1]], vecs: solved ? [{ of: 0, kind: 'F', dir: F1, len, beside: meet }, { of: 1, kind: 'F', dir: neg(F1), len, beside: meet }] : [] });
  }
  // the coil in 3D next to the drawing along the axis, both at the same angle; solved: with the
  // forces (both drawings) and the sense of rotation (3D, none where there is no torque)
  function coilFigs(phi, s, bx, solved, turn = solved) {
    const tau = s * bx * Math.round(Math.cos((phi * Math.PI) / 180) * 1e9) / 1e9;
    return `<figure class="fig coil-pair">${P.coil3d({ phi, s, bx, forces: solved, turn: turn ? Math.sign(tau) : 0 })}<figcaption>${L('The coil in 3D', 'Die Spule räumlich')}</figcaption></figure>` +
      `<figure class="fig coil-pair">${coilFig(phi, s, bx, solved)}<figcaption>${L('Seen along the axis, from the eye', 'Längs der Achse gesehen, vom Auge aus')}</figcaption></figure>`;
  }
  function coil(seed) {
    const r = rng(seed * 97 + 61), s = r.pick([1, -1]), bx = r.pick([1, -1]), phi = r.pick([0, 30, 60, 90, 120, 150, 30, 150]), app = r.int(0, APPS.length - 1);
    const Bv = [bx, 0, 0];
    const F1 = force(1, [0, 0, s], Bv), F2 = neg(F1), tau = Math.round(s * bx * Math.cos((phi * Math.PI) / 180) * 1e9) / 1e9;
    const howF = `${howForce(1, 'I', [0, 0, s], Bv)} ${L(`Side 2 carries the current the other way: its force points ${dirName(F2)}.`, `Seite 2 führt den Strom in Gegenrichtung: Die Kraft auf sie zeigt ${dirName(F2)}.`)}`;
    const sense = (t) => (t > 0 ? L('anticlockwise', 'im Gegenuhrzeigersinn') : L('clockwise', 'im Uhrzeigersinn'));
    const howT = tau ? L(`The two forces are equal and opposite, but they do not act along one line: they turn the coil ${sense(tau)} (a torque), without moving it as a whole.`, `Die beiden Kräfte sind gleich gross und entgegengesetzt, wirken aber nicht längs einer Geraden: Sie drehen die Spule ${sense(tau)} (ein Drehmoment), ohne sie als Ganzes zu verschieben.`)
      : L('The two forces are equal and opposite and act along one line, through the axis: there is no torque. The field is perpendicular to the plane of the coil: this is where the coil comes to rest.', 'Die beiden Kräfte sind gleich gross und entgegengesetzt und wirken längs einer Geraden durch die Achse: Es gibt kein Drehmoment. Das Feld steht senkrecht zur Ebene der Spule: Hier kommt die Spule zur Ruhe.');
    const howMax = L('The forces always point across the field. Their lever arm about the axis is largest when the field lies in the plane of the coil (the coil drawn along the field lines): there the torque is largest. When the field is perpendicular to the plane of the coil, the forces pull along the coil and the torque is zero.', 'Die Kräfte zeigen immer quer zum Feld. Ihr Hebelarm bezüglich der Achse ist am grössten, wenn das Feld in der Ebene der Spule liegt (die Spule längs der Feldlinien gezeichnet): Dort ist das Drehmoment am grössten. Steht das Feld senkrecht zur Ebene der Spule, ziehen die Kräfte längs der Spule, und das Drehmoment ist null.');
    const turns = (t) => L(`It turns ${sense(t)}.`, `Sie dreht sich ${sense(t)}.`);
    const turn = [{ label: turns(1), ok: tau > 0, tag: tau ? 'hand' : 'max' }, { label: turns(-1), ok: tau < 0, tag: tau ? 'hand' : 'max' }, { label: L('It does not turn.', 'Sie dreht sich nicht.'), ok: !tau, tag: 'max' },
      { label: L(`It is pushed ${dirName(F1)} as a whole, without turning.`, `Sie wird als Ganzes ${dirName(F1)} geschoben, ohne sich zu drehen.`), ok: false, tag: 'net' }].map((o) => ({ ...o, why: o.ok ? '' : `${howF} ${howT}` }));
    const max = [[L('the field lies in the plane of the coil', 'das Feld in der Ebene der Spule liegt'), true], [L('the field is perpendicular to the plane of the coil', 'das Feld senkrecht zur Ebene der Spule steht'), false],
      [L('the field makes 45° with the plane of the coil', 'das Feld mit der Ebene der Spule 45° einschliesst'), false], [L('in every position: the forces do not change', 'in jeder Lage: Die Kräfte ändern sich nicht'), false]].map(([label, ok]) => ({ label, ok, tag: ok ? undefined : 'max', why: ok ? '' : howMax }));
    const ap = APPS[app], apOpts = [{ label: L(...ap.ok), ok: true, why: '' }, ...ap.wrong.map((w) => ({ label: L(...w), ok: false, tag: 'use', why: L(...ap.why) }))];
    return {
      kind: 'coil', title: L('A coil in a magnetic field', 'Eine Spule im Magnetfeld'),
      text: L(`<p>A rectangular coil can turn about an axis perpendicular to the page (the dot). Seen along the axis, its two long sides cut the page: side 1 carries the current ${s > 0 ? 'out of' : 'into'} the page, side 2 ${s > 0 ? 'into' : 'out of'} it. The uniform field points ${dirName(Bv)}${phi === 0 ? '' : `; the coil makes an angle of ${phi}° with it`}.</p>`,
        `<p>Eine rechteckige Spule kann sich um eine Achse senkrecht zur Seite drehen (der Punkt). Längs der Achse gesehen, schneiden ihre beiden langen Seiten die Seite: Seite 1 führt den Strom ${s > 0 ? 'aus der Seite heraus' : 'in die Seite hinein'}, Seite 2 ${s > 0 ? 'in die Seite hinein' : 'aus der Seite heraus'}. Das homogene Feld zeigt ${dirName(Bv)}${phi === 0 ? '' : `; die Spule schliesst mit ihm einen Winkel von ${phi}° ein`}.</p>`),
      figs: coilFigs(phi, s, bx, false),
      questions: [
        tiles('F', L('(a) In which direction does the force on side 1 point?', '(a) In welche Richtung zeigt die Kraft auf Seite 1?'), forceOptions(r, F1, [[neg(F1), 'hand'], [Bv, 'alongB'], [null, 'none']], howF)),
        choice('t', L('(b) How does the coil start to move?', '(b) Wie beginnt sich die Spule zu bewegen?'), turn),
        choice('m', L('(c) The torque on the coil is largest when', '(c) Das Drehmoment auf die Spule ist am grössten, wenn'), r.shuffle(max)),
        choice('u', `(d) ${L(...ap.q)}`, r.shuffle(apOpts)),
      ],
      hints: [
        L(`Side 1 carries the current ${s > 0 ? 'out of' : 'into'} the page, side 2 ${s > 0 ? 'into' : 'out of'} it; the field points ${dirName(Bv)}${phi === 0 ? ', along the coil' : `, at ${phi}° to the coil`}.`, `Seite 1 führt den Strom ${s > 0 ? 'aus der Seite heraus' : 'in die Seite hinein'}, Seite 2 ${s > 0 ? 'in die Seite hinein' : 'aus der Seite heraus'}; das Feld zeigt ${dirName(Bv)}${phi === 0 ? ', längs der Spule' : `, unter ${phi}° zur Spule`}.`),
        L(`(a) Right hand at side 1: thumb ${dirName([0, 0, s])}, index finger ${dirName(Bv)}: where does the middle finger point? Side 2 carries the opposite current, so its force points the opposite way.`, `(a) Rechte Hand bei Seite 1: Daumen ${dirName([0, 0, s])}, Zeigefinger ${dirName(Bv)}: Wohin zeigt der Mittelfinger? Seite 2 führt den Strom in Gegenrichtung, also zeigt ihre Kraft in die Gegenrichtung.`),
        L(`(b), (c) Draw both forces at the sides in the drawing along the axis: do they act along one line through the axis, or do they form a pair that turns the coil? The torque is force times lever arm, the distance from the axis across to the line of the force: how does that arm change as the coil turns?`, `(b), (c) Zeichne beide Kräfte bei den Seiten in die Zeichnung längs der Achse: Wirken sie längs einer Geraden durch die Achse, oder bilden sie ein Paar, das die Spule dreht? Das Drehmoment ist Kraft mal Hebelarm, der Abstand von der Achse quer zur Wirkungslinie der Kraft: Wie ändert sich dieser Arm, wenn sich die Spule dreht?`),
      ],
      solution: [howF, howT, howMax, `${L(...ap.ok)} ${L(...ap.why)}`], solFig: coilFigs(phi, s, bx, true), p: { s, bx, phi, app },
    };
  }

  // ---------------------------------------------------------------- find the error
  // A student's hand rule in four steps, one of them wrong, and the wrong force it leads to:
  // the wrong hand (the sign of the charge ignored, or a current taken along the electrons'
  // motion), ⊙ and ⊗ mixed up, or the middle finger read wrongly.
  function errorStep(kind, seed) {
    const r = rng(seed * 101 + 67);
    for (;;) {
      const q = kind === 'current' ? -1 : r.pick([1, -1, -1]), pt = kind === 'current' ? null : particle(r, q);
      if (pt && pt.id === 'q' && r.next() < 0.5) continue; // mostly a named particle: its sign is the point
      const bad = r.pick(kind === 'current' || q < 0 ? [0, 0, 2, 3] : [0, 2, 3]);
      const v = r.pick(AXES.filter((d) => !d[2])), B = bad === 2 ? r.pick([[0, 0, 1], [0, 0, -1]]) : r.pick(AXES);
      const F = force(q, v, B);
      if (!F) continue;
      // what the student takes: the hand (+1 right), the thumb, the field
      const I = neg(v), hand = bad === 0 ? -q : q, Bs = bad === 2 ? neg(B) : B, thumb = kind === 'current' ? (bad === 0 ? v : I) : v;
      const hp = kind === 'current' ? 1 : hand; // with a current, the right hand, along the current taken
      let Fs = force(hp, thumb, Bs);
      if (bad === 3) Fs = r.pick([neg(F), v, B].filter((d) => !same(d, F)));
      const handName = (h) => (h > 0 ? L('right hand', 'rechte Hand') : L('left hand', 'linke Hand'));
      const steps = kind === 'current'
        ? [bad === 0 ? L(`The electrons move ${dirName(v)}, so the current flows ${dirName(v)} too.`, `Die Elektronen bewegen sich ${dirName(v)}, also fliesst auch der Strom ${dirName(v)}.`) : L(`The electrons move ${dirName(v)}; they are negative, so the current flows the other way, ${dirName(I)}.`, `Die Elektronen bewegen sich ${dirName(v)}; sie sind negativ, also fliesst der Strom in Gegenrichtung, ${dirName(I)}.`),
          L(`For a current, the right hand: thumb along the current, ${dirName(thumb)}.`, `Für einen Strom die rechte Hand: Daumen in Stromrichtung, ${dirName(thumb)}.`)]
        : [bad === 0 && q < 0 ? L(`${cap(pt.name())} moves ${dirName(v)}: the right hand, as for any charge.`, `${cap(pt.name())} bewegt sich ${dirName(v)}: die rechte Hand, wie für jede Ladung.`) : L(`${cap(pt.name())} is ${signName(q)}: the ${handName(hand)}.`, `${cap(pt.name())} ist ${signName(q)}: die ${handName(hand)}.`),
          L(`Thumb along the velocity, ${dirName(v)}.`, `Daumen in Richtung der Geschwindigkeit, ${dirName(v)}.`)];
      steps.push(L(`Index finger along the field, ${dirName(Bs)}.`, `Zeigefinger in Richtung des Feldes, ${dirName(Bs)}.`), L(`The middle finger points ${dirName(Fs)}: that is the force.`, `Der Mittelfinger zeigt ${dirName(Fs)}: Das ist die Kraft.`));
      const right = kind === 'current' ? howForce(1, 'I', I, B) : howForce(q, 'v', v, B);
      const whyBad = [kind === 'current' ? L('The current flows the way positive charges would move: against the electrons.', 'Der Strom fliesst so, wie sich positive Ladungen bewegen würden: den Elektronen entgegen.') : q < 0 ? L('A negative charge needs the left hand: the force is reversed.', 'Eine negative Ladung braucht die linke Hand: Die Kraft ist umgekehrt.') : L('A positive charge needs the right hand.', 'Eine positive Ladung braucht die rechte Hand.'),
        '', L(`The field points ${dirName(B)}: ⊙ is the tip of an arrow coming out of the page, ⊗ its tail going in.`, `Das Feld zeigt ${dirName(B)}: ⊙ ist die Spitze eines Pfeils, der aus der Seite kommt, ⊗ sein Ende, das hineingeht.`),
        L(`With these fingers, the middle finger points ${dirName(force(hp, thumb, Bs))}, perpendicular to the thumb and the index finger.`, `Mit diesen Fingern zeigt der Mittelfinger ${dirName(force(hp, thumb, Bs))}, senkrecht zu Daumen und Zeigefinger.`)][bad];
      const items = [kind === 'current' ? { kind: 'piece', d: v, at: [0, 0], name: 'e⁻' } : drawn(pt, [0, 0])];
      const fig = scene({ field: { dir: B }, items, vecs: [{ of: 0, kind: 'v', dir: v }, { of: 0, kind: 'F', unknown: true }] });
      const who = r.pick(['Mia', 'Luca', 'Noah', 'Lea', 'Elif', 'Jonas']);
      return {
        kind: 'error', title: L('Find the error', 'Finde den Fehler'),
        text: (kind === 'current' ? L(`<p>In a wire, the electrons drift ${dirName(v)} through a magnetic field that points ${dirName(B)}.`, `<p>In einem Draht driften die Elektronen ${dirName(v)} durch ein Magnetfeld, das ${dirName(B)} zeigt.`)
          : L(`<p>${cap(pt.name())} moves ${dirName(v)} through a magnetic field that points ${dirName(B)}.`, `<p>${cap(pt.name())} bewegt sich ${dirName(v)} durch ein Magnetfeld, das ${dirName(B)} zeigt.`)) +
          L(` ${who} finds the direction of the magnetic force in four steps: it points ${dirName(Fs)}. One step is wrong.</p>`, ` ${who} bestimmt die Richtung der magnetischen Kraft in vier Schritten: Sie zeige ${dirName(Fs)}. Ein Schritt ist falsch.</p>`),
        figs: `<div class="fig">${fig}</div>`,
        questions: [{ ...tiles('e', L('Which step is wrong?', 'Welcher Schritt ist falsch?'), steps.map((t, k) => ({ html: `<span class="step-opt"><b>${k + 1}.</b> ${t}</span>`, ok: k === bad, tag: k === bad ? undefined : 'step', why: k === bad ? '' : L(`Step ${k + 1} is right. ${right}`, `Schritt ${k + 1} ist richtig. ${right}`) }))), wide: true }],
        hints: [
          kind === 'current' ? L(`The electrons drift ${dirName(v)}, the field points ${dirName(B)}. The current is defined by positive charges: which way does it flow here?`, `Die Elektronen driften ${dirName(v)}, das Feld zeigt ${dirName(B)}. Der Strom ist über positive Ladungen festgelegt: In welche Richtung fliesst er hier?`)
            : L(`${chargeOf(pt)} It moves ${dirName(v)}, the field points ${dirName(B)}.`, `${chargeOf(pt)} Es bewegt sich ${dirName(v)}, das Feld zeigt ${dirName(B)}.`),
          L(`The rule ${who} should follow: the right hand for a positive charge or a current, the left hand for a negative charge; thumb along the velocity (or the current), index finger along the field, the middle finger shows the force.`, `Die Regel, der ${who} folgen sollte: die rechte Hand für eine positive Ladung oder einen Strom, die linke Hand für eine negative Ladung; Daumen in Richtung der Geschwindigkeit (oder des Stroms), Zeigefinger in Richtung des Feldes, der Mittelfinger zeigt die Kraft.`),
          L(`Do it yourself first, then go through ${who}’s four steps one by one: in which step does your hand first differ?`, `Mach es zuerst selbst und geh dann die vier Schritte von ${who} einzeln durch: In welchem Schritt weicht deine Hand zum ersten Mal ab?`),
        ],
        solution: [L(`Step ${bad + 1} is wrong. ${whyBad}`, `Schritt ${bad + 1} ist falsch. ${whyBad}`), `${right}`], p: { kind, q, v: key(v), B: key(B), bad, pt: pt ? pt.id : '' },
      };
    }
  }

  // ---------------------------------------------------------------- statements
  const BANK = [
    [() => L('A magnetic field can speed up a charge at rest.', 'Ein Magnetfeld kann eine ruhende Ladung beschleunigen.'), false, () => L('There is no magnetic force on a charge at rest.', 'Auf eine ruhende Ladung wirkt keine magnetische Kraft.')],
    [() => L('A charge moving along the field lines feels no magnetic force.', 'Eine Ladung, die sich längs der Feldlinien bewegt, spürt keine magnetische Kraft.'), true, () => L('The force needs a part of the velocity across the field.', 'Die Kraft braucht einen Teil der Geschwindigkeit quer zum Feld.')],
    [() => L('The magnetic force on a charge points along the field lines.', 'Die magnetische Kraft auf eine Ladung zeigt längs der Feldlinien.'), false, () => L('It is perpendicular to the field.', 'Sie steht senkrecht zum Feld.')],
    [() => L('Two parallel wires with currents in the same direction attract each other.', 'Zwei parallele Drähte mit Strömen in derselben Richtung ziehen sich an.'), true, () => GRIP()],
    [() => L('Two parallel wires with currents in opposite directions attract each other.', 'Zwei parallele Drähte mit Strömen in entgegengesetzter Richtung ziehen sich an.'), false, () => L('Opposite currents repel each other.', 'Entgegengesetzte Ströme stossen sich ab.')],
    [() => L('Of two parallel currents, the larger one exerts the larger force on the other.', 'Von zwei parallelen Strömen übt der grössere die grössere Kraft auf den anderen aus.'), false, () => L('The forces on the two wires are equal and opposite (Newton’s third law).', 'Die Kräfte auf die beiden Drähte sind gleich gross und entgegengesetzt (drittes Newtonsches Axiom).')],
    [() => L('A neutral particle is not deflected by a magnetic field.', 'Ein neutrales Teilchen wird von einem Magnetfeld nicht abgelenkt.'), true, () => L('The force is proportional to the charge.', 'Die Kraft ist proportional zur Ladung.')],
    [() => L('For a negative charge, the force points the other way than for a positive one.', 'Bei einer negativen Ladung zeigt die Kraft in die Gegenrichtung als bei einer positiven.'), true, () => L(`${LAW()} changes sign with q: hence the left hand.`, `${LAW()} wechselt mit q das Vorzeichen: daher die linke Hand.`)],
    [() => L('An electron beam and a proton beam with the same velocity are deflected the same way.', 'Ein Elektronenstrahl und ein Protonenstrahl mit derselben Geschwindigkeit werden in dieselbe Richtung abgelenkt.'), false, () => L('Their charges have opposite signs: they are deflected in opposite directions.', 'Ihre Ladungen haben entgegengesetzte Vorzeichen: Sie werden in entgegengesetzte Richtungen abgelenkt.')],
    [() => L('The magnetic force on a current-carrying wire is perpendicular to the wire.', 'Die magnetische Kraft auf einen stromdurchflossenen Draht steht senkrecht zum Draht.'), true, () => L('Like the force on a moving charge, it is perpendicular to the current and to the field.', 'Wie die Kraft auf eine bewegte Ladung steht sie senkrecht zum Strom und zum Feld.')],
    [() => L('A wire carrying a current along the field lines feels no magnetic force.', 'Ein Draht, dessen Strom längs der Feldlinien fliesst, spürt keine magnetische Kraft.'), true, () => L('F = I·L·B·sin θ with sin 0° = 0.', 'F = I·L·B·sin θ mit sin 0° = 0.')],
    [() => L('A wire at 30° to the field feels half the force it feels perpendicular to the field.', 'Ein Draht unter 30° zum Feld spürt die halbe Kraft wie senkrecht zum Feld.'), true, () => L('F = I·L·B·sin θ, and sin 30° = 0.5.', 'F = I·L·B·sin θ, und sin 30° = 0.5.')],
    [() => L('With twice the current and half the field, the force on a wire stays the same.', 'Mit doppeltem Strom und halbem Feld bleibt die Kraft auf einen Draht gleich.'), true, () => L('F = I·L·B·sin θ: 2 · ½ = 1.', 'F = I·L·B·sin θ: 2 · ½ = 1.')],
    [() => L('The field of a long straight current points away from the wire.', 'Das Feld eines langen geraden Stroms zeigt vom Draht weg.'), false, () => L('Its field lines are circles around the wire.', 'Seine Feldlinien sind Kreise um den Draht.')],
    [() => L('The field of a long straight current gets weaker further from the wire.', 'Das Feld eines langen geraden Stroms wird mit dem Abstand vom Draht schwächer.'), true, () => L('B = μ₀·I/(2π·r).', 'B = μ₀·I/(2π·r).')],
    [() => L('Outside a bar magnet, the field lines run from the north pole to the south pole.', 'Ausserhalb eines Stabmagneten laufen die Feldlinien vom Nordpol zum Südpol.'), true, () => L('Inside, they go on from S to N: they are closed.', 'Innen laufen sie von S nach N weiter: Sie sind geschlossen.')],
    [() => L('Inside a bar magnet, the field lines run from the north pole to the south pole.', 'Im Innern eines Stabmagneten laufen die Feldlinien vom Nordpol zum Südpol.'), false, () => L('Inside, they run from S to N: the lines are closed.', 'Innen laufen sie von S nach N: Die Linien sind geschlossen.')],
    [() => L('Magnetic field lines begin at the north pole and end at the south pole.', 'Magnetische Feldlinien beginnen am Nordpol und enden am Südpol.'), false, () => L('They have no beginning and no end: they continue through the magnet.', 'Sie haben weder Anfang noch Ende: Sie setzen sich durch den Magneten fort.')],
    [() => L('Inside a long solenoid the field is nearly uniform, along its axis.', 'Im Innern einer langen Spule ist das Feld nahezu homogen, längs ihrer Achse.'), true, () => L('The fields of all its turns add up there.', 'Dort addieren sich die Felder aller Windungen.')],
    [() => L('The field outside a solenoid looks like that of a bar magnet.', 'Das Feld ausserhalb einer Spule sieht aus wie das eines Stabmagneten.'), true, () => L('The end where the field lines come out acts as a north pole.', 'Das Ende, wo die Feldlinien austreten, wirkt als Nordpol.')],
    [() => L('The torque on a coil in a field is largest when the field is perpendicular to the plane of the coil.', 'Das Drehmoment auf eine Spule im Feld ist am grössten, wenn das Feld senkrecht zur Ebene der Spule steht.'), false, () => L('Then it is zero; it is largest when the field lies in the plane of the coil.', 'Dann ist es null; am grössten ist es, wenn das Feld in der Ebene der Spule liegt.')],
    [() => L('A coil carrying a current in a uniform field turns, but it is not pushed as a whole.', 'Eine stromdurchflossene Spule in einem homogenen Feld dreht sich, wird aber nicht als Ganzes verschoben.'), true, () => L('The forces on opposite sides are equal and opposite.', 'Die Kräfte auf gegenüberliegende Seiten sind gleich gross und entgegengesetzt.')],
    [() => L('The commutator of an electric motor reverses the current in the coil every half turn.', 'Der Kommutator eines Elektromotors kehrt den Strom in der Spule bei jeder halben Drehung um.'), true, () => L('So the torque keeps turning the coil the same way.', 'So dreht das Drehmoment die Spule immer in dieselbe Richtung.')],
    [() => L('In a loudspeaker, an alternating current makes the coil move back and forth.', 'In einem Lautsprecher lässt ein Wechselstrom die Spule hin und her schwingen.'), true, () => L('The force on the coil reverses with the current.', 'Die Kraft auf die Spule kehrt sich mit dem Strom um.')],
    [() => L('In a moving-coil meter, the torque on the coil is proportional to the current.', 'In einem Drehspulinstrument ist das Drehmoment auf die Spule proportional zum Strom.'), true, () => L('Each side feels I·L·B; a spring balances the torque.', 'Jede Seite spürt I·L·B; eine Feder hält dem Drehmoment das Gleichgewicht.')],
    [() => L('A very strong magnetic field exerts a force on a charge at rest.', 'Ein sehr starkes Magnetfeld übt eine Kraft auf eine ruhende Ladung aus.'), false, () => L('Without motion there is no magnetic force, however strong the field.', 'Ohne Bewegung gibt es keine magnetische Kraft, wie stark das Feld auch ist.')],
  ];
  // the hints: one for each topic among the statements picked (BANK indices), naming them by their place from the top
  const TOPICS = [
    [[0, 1, 2, 6, 7, 8, 25], ['the force on a moving charge', 'die Kraft auf eine bewegte Ladung'], ['it is q·v × B: what if the charge is at rest, neutral, negative, or moves along the field?', 'sie ist q·v × B: Was, wenn die Ladung ruht, neutral oder negativ ist oder sich längs des Feldes bewegt?']],
    [[9, 10, 11, 12], ['the force on a wire', 'die Kraft auf einen Draht'], ['F = I·L·B·sin θ, with θ the angle between the wire and the field: find the factor of each change.', 'F = I·L·B·sin θ, mit θ dem Winkel zwischen Draht und Feld: Bestimme den Faktor jeder Änderung.']],
    [[3, 4, 5], ['two currents', 'zwei Ströme'], ['the field of one wire at the other (grip rule), then the force on the other (right hand); Newton’s third law for the pair.', 'das Feld des einen Drahts beim anderen (Umfassungsregel), dann die Kraft auf den anderen (rechte Hand); für das Paar das dritte Newtonsche Axiom.']],
    [[13, 14, 15, 16, 17, 18, 19], ['field lines', 'Feldlinien'], ['they circle a wire, run from N to S outside a magnet, and have no beginning and no end.', 'sie umkreisen einen Draht, laufen ausserhalb eines Magneten von N nach S und haben weder Anfang noch Ende.']],
    [[20, 21, 22, 23, 24], ['a coil in a field', 'eine Spule im Feld'], ['the forces on opposite sides are equal and opposite; the torque is force times lever arm.', 'die Kräfte auf gegenüberliegende Seiten sind gleich gross und entgegengesetzt; das Drehmoment ist Kraft mal Hebelarm.']]];
  function stmtHints(pick) {
    const out = [];
    for (const [idx, name, rule] of TOPICS) {
      const ks = pick.map((s, k) => [BANK.indexOf(s), k + 1]).filter(([i]) => idx.includes(i)).map(([, k]) => k);
      if (!ks.length) continue;
      const list = ks.length === 1 ? String(ks[0]) : `${ks.slice(0, -1).join(', ')}${L(' and ', ' und ')}${ks[ks.length - 1]}`;
      out.push(L(`${ks.length === 1 ? 'Statement' : 'Statements'} ${list} (from the top): ${name[0]}. ${cap(rule[0])}`, `${ks.length === 1 ? 'Aussage' : 'Aussagen'} ${list} (von oben): ${name[1]}. ${cap(rule[1])}`));
    }
    if (out.length < 2) out.push(L('Take the statements one by one: which quantity does each one change or compare, and does that quantity count at all?', 'Nimm die Aussagen einzeln: Welche Grösse ändert oder vergleicht jede, und zählt diese Grösse überhaupt?'));
    return out;
  }
  function statements(seed) {
    const r = rng(seed * 73 + 43);
    for (;;) {
      const pick = r.shuffle(BANK.slice()).slice(0, 5);
      if (pick.every((s) => s[1]) || pick.every((s) => !s[1])) continue;
      return {
        kind: 'stmts', title: L('Which statements are correct?', 'Welche Aussagen sind richtig?'),
        text: L('<p>Tick all the statements that are correct.</p>', '<p>Kreuze alle richtigen Aussagen an.</p>'), figs: '',
        questions: [{ type: 'multi', key: 's', label: L('Which statements are correct?', 'Welche Aussagen sind richtig?'), statements: pick.map(([h, ok, why]) => ({ html: h(), ok, why: why() })) }],
        hints: stmtHints(pick),
        solution: pick.map(([h, ok, why]) => `${ok ? '✓' : '✗'} ${h()} ${why()}`), p: { s: pick.map((s) => BANK.indexOf(s)) },
      };
    }
  }

  // ---------------------------------------------------------------- all types
  const TYPES = {
    'lines-wire': [1, (s) => lines('wire', s)], 'lines-loop': [2, (s) => lines('loop', s)], 'lines-solenoid': [2, (s) => lines('solenoid', s)], 'lines-magnet': [2, (s) => lines('magnet', s)],
    'dir-current': [1, (s) => dirForce('I', s)], 'dir-particle': [2, (s) => dirForce('v', s)], 'dir-missing': [3, dirMissing],
    'size-num': [2, sizeNum], 'size-ratio': [3, sizeRatio],
    'pair-parallel': [2, (s) => pair('parallel', s)], 'pair-angle': [3, (s) => pair('angle', s)],
    coil: [3, coil], 'error-charge': [3, (s) => errorStep('charge', s)], 'error-current': [3, (s) => errorStep('current', s)],
    stmts: [2, statements],
  };
  function make(type, seed) {
    const [difficulty, f] = TYPES[type];
    return { ...f(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }

  const api = { TYPES: Object.keys(TYPES), make, toArrow, fromArrow, vec, LAW, dirName, howForce, RULE, PERP, GRIP, hand, signName, tile, nice, coilFig, coilFigs };
  root.MagEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
