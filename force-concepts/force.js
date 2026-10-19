// Net force: the net force points along the acceleration, not along the motion. Forces balance
// at constant speed (also while moving up, or falling); a constant sideways force bends the path
// into a parabola; two forces at an angle add as arrows.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, F, FL, cap, num, qty, deg, noun, o, q, register } = FC;

  // ================================================================ balance: compare two forces
  // X acts forward (horizontal objects) or up (vertical ones), Y backward or down. dirs: the
  // directions the object may move in (+1 forward/up, −1 down). Built per exercise, since the
  // texts and symbols depend on the language.
  function objects() {
    return {
      crate: {
        vert: false, dirs: [1], name: 'crate', N: noun('f', 'Kiste'),
        X: { sym: FL('push'), html: F('push'), what: T('the push of the person', 'die Druckkraft der Person'), dat: 'der Druckkraft der Person' },
        Y: { sym: FL('f'), html: F('f'), what: T('the friction on the crate', 'die Reibungskraft auf die Kiste'), dat: 'der Reibungskraft auf die Kiste' },
        text: (ph) => T(`A person pushes a heavy crate across a level floor. ${{ speeding: 'The crate gets faster and faster.', constant: 'The crate slides at constant speed.', slowing: 'The crate is getting slower, but still sliding forward.' }[ph]}`,
          `Eine Person schiebt eine schwere Kiste über einen ebenen Boden. ${{ speeding: 'Die Kiste wird immer schneller.', constant: 'Die Kiste gleitet mit konstanter Geschwindigkeit.', slowing: 'Die Kiste wird langsamer, gleitet aber noch vorwärts.' }[ph]}`),
      },
      car: {
        vert: false, dirs: [1], name: 'car', N: noun('n', 'Auto'),
        X: { sym: FL('drive'), html: F('drive'), what: T('the driving force (the road pushing the wheels forward)', 'die Antriebskraft (die Strasse übt auf die Räder eine Kraft nach vorn aus)'), dat: 'der Antriebskraft' },
        Y: { sym: FL('res'), html: F('res'), what: T('the resistance (air resistance and rolling resistance)', 'der Fahrwiderstand (Luft- und Rollwiderstand)'), dat: 'dem Fahrwiderstand (Luft- und Rollwiderstand)' },
        text: (ph) => T(`A car drives along a straight, level road. ${{ speeding: 'It is speeding up.', constant: 'It drives at constant speed.', slowing: 'It is slowing down, with the engine still pulling a little.' }[ph]}`,
          `Ein Auto fährt auf einer geraden, ebenen Strasse. ${{ speeding: 'Es wird schneller.', constant: 'Es fährt mit konstanter Geschwindigkeit.', slowing: 'Es wird langsamer, wobei der Motor noch etwas zieht.' }[ph]}`),
      },
      elevator: {
        vert: true, dirs: [1, -1], name: 'elevator cabin', N: noun('f', 'Liftkabine'),
        X: { sym: FL('T'), html: F('T'), what: T('the pull of the cable', 'die Seilkraft'), dat: 'der Seilkraft' },
        Y: { sym: FL('G'), html: F('G'), what: T('the weight of the cabin', 'die Gewichtskraft der Kabine'), dat: 'der Gewichtskraft der Kabine' },
        text: (ph, d) => T(`An elevator cabin hangs on a cable and moves ${d > 0 ? 'up' : 'down'}. ${{ speeding: 'It is speeding up.', constant: 'It moves at constant speed.', slowing: 'It is slowing down before a stop.' }[ph]} Air resistance and friction are negligible.`,
          `Eine Liftkabine hängt an einem Seil und fährt ${d > 0 ? 'nach oben' : 'nach unten'}. ${{ speeding: 'Sie wird schneller.', constant: 'Sie fährt mit konstanter Geschwindigkeit.', slowing: 'Sie bremst vor einem Halt ab.' }[ph]} Luftwiderstand und Reibung sind vernachlässigbar.`),
      },
      skydiver: {
        vert: true, dirs: [-1], name: 'skydiver', N: noun('m', 'Fallschirmspringer'),
        X: { sym: FL('D'), html: F('D'), what: T('the air resistance (drag)', 'der Luftwiderstand'), dat: 'dem Luftwiderstand' },
        Y: { sym: FL('G'), html: F('G'), what: T('the weight of the skydiver', 'die Gewichtskraft des Fallschirmspringers'), dat: 'der Gewichtskraft des Fallschirmspringers' },
        text: (ph) => T({
          speeding: 'A skydiver has just jumped from the plane and falls faster and faster.',
          constant: 'A skydiver falls at a constant speed, with the parachute still closed.',
          slowing: 'A skydiver has just opened the parachute and is getting slower, while still falling.',
        }[ph], {
          speeding: 'Ein Fallschirmspringer ist eben aus dem Flugzeug gesprungen und fällt immer schneller.',
          constant: 'Ein Fallschirmspringer fällt mit konstanter Geschwindigkeit, der Fallschirm ist noch geschlossen.',
          slowing: 'Ein Fallschirmspringer hat eben den Fallschirm geöffnet und wird langsamer, fällt aber noch.',
        }[ph]),
      },
      motorboat: {
        vert: false, dirs: [1], name: 'motorboat', k: 1.7, N: noun('n', 'Motorboot'),
        title: T('On the lake', 'Auf dem See'),
        X: { sym: FL('drive'), html: F('drive'), what: T('the driving force (the water pushes the propeller forward)', 'die Antriebskraft (das Wasser übt auf den Propeller eine Kraft nach vorn aus)'), dat: 'der Antriebskraft' },
        Y: { sym: FL('res'), html: F('res'), what: T('the water resistance', 'der Wasserwiderstand'), dat: 'dem Wasserwiderstand' },
        cancel: T('the weight and the buoyancy of the water are vertical and cancel', 'Gewichtskraft und Auftrieb im Wasser sind vertikal und heben sich auf'),
        text: (ph) => T(`A motorboat crosses a calm lake in a straight line. ${{ speeding: 'It is speeding up.', constant: 'It moves at constant speed.', slowing: 'It is slowing down, with its engine still running a little.' }[ph]}`,
          `Ein Motorboot fährt geradeaus über einen ruhigen See. ${{ speeding: 'Es wird schneller.', constant: 'Es fährt mit konstanter Geschwindigkeit.', slowing: 'Es wird langsamer, wobei der Motor noch etwas läuft.' }[ph]}`),
        draw: (bx, yF) => ({
          g: D.rect(0, yF - 2, 380, 24, 'ice', 0) + D.line(0, yF - 2, 380, yF - 2, 'gline') +
            `<polygon class="obj" points="${bx - 36},${yF - 14} ${bx + 58},${yF - 14} ${bx + 42},${yF + 6} ${bx - 30},${yF + 6}"/>` + D.rect(bx - 16, yF - 30, 30, 16, 'obj', 3) + D.rect(bx - 10, yF - 26, 18, 8, 'win', 2),
          cx: bx + 12, cy: yF - 5,
        }),
      },
      plane: {
        vert: false, dirs: [1], name: 'plane', k: 1.8, N: noun('n', 'Flugzeug'),
        title: T('Level flight', 'Im Horizontalflug'),
        X: { sym: FL('drive'), html: F('drive'), what: T('the thrust of the engines', 'die Schubkraft der Triebwerke'), dat: 'der Schubkraft der Triebwerke' },
        Y: { sym: FL('D'), html: F('D'), what: T('the air resistance (drag)', 'der Luftwiderstand'), dat: 'dem Luftwiderstand' },
        cancel: T('the weight and the lift are vertical and cancel', 'Gewichtskraft und Auftrieb sind vertikal und heben sich auf'),
        text: (ph) => T(`A plane flies level, in a straight line. ${{ speeding: 'It is speeding up.', constant: 'It flies at constant speed.', slowing: 'It is slowing down, with its engines throttled back.' }[ph]} The lift on its wings balances its weight.`,
          `Ein Flugzeug fliegt geradeaus auf gleicher Höhe. ${{ speeding: 'Es wird schneller.', constant: 'Es fliegt mit konstanter Geschwindigkeit.', slowing: 'Es wird langsamer, die Triebwerke sind gedrosselt.' }[ph]} Der Auftrieb an den Flügeln hält der Gewichtskraft das Gleichgewicht.`),
        draw: (bx, yF) => ({ g: D.plane(bx + 6, yF - 34, 1.5), cx: bx + 8, cy: yF - 42 }),
      },
      cyclist: {
        vert: false, dirs: [1], name: 'cyclist', k: 1.5, N: noun('m', 'Velofahrer'),
        title: T('By bike', 'Mit dem Velo'),
        X: { sym: FL('drive'), html: F('drive'), what: T('the driving force (the road pushes the rear wheel forward)', 'die Antriebskraft (die Strasse übt auf das Hinterrad eine Kraft nach vorn aus)'), dat: 'der Antriebskraft' },
        Y: { sym: FL('res'), html: F('res'), what: T('the resistance (air resistance and rolling resistance)', 'der Fahrwiderstand (Luft- und Rollwiderstand)'), dat: 'dem Fahrwiderstand (Luft- und Rollwiderstand)' },
        text: (ph) => T(`A cyclist rides along a straight, level road (take the cyclist and the bike together). ${{ speeding: 'The cyclist is speeding up.', constant: 'The cyclist rides at constant speed.', slowing: 'The cyclist is slowing down, while still pedalling gently.' }[ph]}`,
          `Ein Velofahrer fährt auf einer geraden, ebenen Strasse (Velofahrer und Velo zusammen betrachtet). ${{ speeding: 'Er wird schneller.', constant: 'Er fährt mit konstanter Geschwindigkeit.', slowing: 'Er wird langsamer, tritt aber noch leicht in die Pedale.' }[ph]}`),
        draw: (bx, yF) => {
          const r0 = 15, A = [bx - 12, yF - r0], Bw = [bx + 42, yF - r0], S = [bx + 6, yF - 40], C = [bx + 12, yF - r0], H = [bx + 36, yF - 44];
          const L = (p, q, c = 'body') => D.line(p[0], p[1], q[0], q[1], c);
          let g = `<circle class="thin" cx="${A[0]}" cy="${A[1]}" r="${r0}"/><circle class="thin" cx="${Bw[0]}" cy="${Bw[1]}" r="${r0}"/>`;
          g += L(A, S, 'ln') + L(S, C, 'ln') + L(C, A, 'ln') + L(S, H, 'ln') + L(H, Bw, 'ln') + L(C, [bx + 34, yF - 32], 'ln');
          const sh = [bx + 18, yF - 64];
          g += L(S, sh) + L(sh, [H[0], H[1] - 2]) + L(S, [C[0] + 4, C[1] - 6]) + D.ball(sh[0] + 5, sh[1] - 10, 7, 'skin');
          return { g, cx: bx + 14, cy: yF - 30 };
        },
      },
      trolley: {
        vert: false, dirs: [1], name: 'shopping trolley', low: true, N: noun('m', 'Einkaufswagen'),
        title: T('At the supermarket', 'Im Supermarkt'),
        X: { sym: FL('push'), html: F('push'), what: T('the push of the shopper', 'die Druckkraft der Person'), dat: 'der Druckkraft der Person' },
        Y: { sym: FL('res'), html: F('res'), what: T('the rolling resistance of the wheels', 'der Rollwiderstand der Räder'), dat: 'dem Rollwiderstand der Räder' },
        text: (ph) => T(`A shopper pushes a loaded shopping trolley along a level aisle. ${{ speeding: 'The trolley gets faster and faster.', constant: 'The trolley rolls at constant speed.', slowing: 'The trolley is getting slower, but still rolling forward.' }[ph]}`,
          `Eine Person schiebt einen vollen Einkaufswagen durch einen ebenen Gang. ${{ speeding: 'Der Einkaufswagen wird immer schneller.', constant: 'Der Einkaufswagen rollt mit konstanter Geschwindigkeit.', slowing: 'Der Einkaufswagen wird langsamer, rollt aber noch vorwärts.' }[ph]}`),
        draw: (bx, yF) => ({
          g: D.person(bx - 30, yF, 70, 1, 'push') + D.line(bx - 6, yF - 52, bx + 4, yF - 48, 'ln') +
            `<polygon class="obj" points="${bx + 2},${yF - 48} ${bx + 56},${yF - 48} ${bx + 50},${yF - 20} ${bx + 8},${yF - 20}"/>` +
            D.line(bx + 8, yF - 20, bx + 10, yF - 8, 'ln') + D.line(bx + 50, yF - 20, bx + 48, yF - 8, 'ln') + D.line(bx + 10, yF - 8, bx + 48, yF - 8, 'ln') +
            D.ball(bx + 12, yF - 4, 4, 'wheel') + D.ball(bx + 46, yF - 4, 4, 'wheel'),
          cx: bx + 29, cy: yF - 34, fy: yF - 3,
        }),
      },
      train: {
        vert: false, dirs: [1], name: 'train', k: 1.8, N: noun('m', 'Zug'),
        title: T('On the rails', 'Auf den Schienen'),
        X: { sym: FL('drive'), html: F('drive'), what: T('the driving force (the rails push the driven wheels forward)', 'die Antriebskraft (die Schienen üben auf die angetriebenen Räder eine Kraft nach vorn aus)'), dat: 'der Antriebskraft' },
        Y: { sym: FL('res'), html: F('res'), what: T('the resistance (air resistance and rolling resistance)', 'der Fahrwiderstand (Luft- und Rollwiderstand)'), dat: 'dem Fahrwiderstand (Luft- und Rollwiderstand)' },
        cancel: T('the weight and the push of the rails are vertical and cancel', 'Gewichtskraft und Normalkraft der Schienen sind vertikal und heben sich auf'),
        text: (ph) => T(`A train runs along a straight, level track. ${{ speeding: 'It is speeding up after leaving a station.', constant: 'It runs at constant speed.', slowing: 'It is slowing down, with the motors still pulling a little.' }[ph]}`,
          `Ein Zug fährt auf einer geraden, ebenen Strecke. ${{ speeding: 'Er wird schneller, nachdem er einen Bahnhof verlassen hat.', constant: 'Er fährt mit konstanter Geschwindigkeit.', slowing: 'Er wird langsamer, wobei die Motoren noch etwas ziehen.' }[ph]}`),
        draw: (bx, yF) => ({
          g: D.rect(bx - 48, yF - 44, 100, 34, 'obj', 5) + [0, 1, 2].map((k) => D.rect(bx - 38 + 28 * k, yF - 38, 20, 12, 'win', 2)).join('') +
            [bx - 36, bx - 22, bx + 26, bx + 40].map((x) => D.ball(x, yF - 6, 6, 'wheel')).join(''),
          cx: bx + 2, cy: yF - 22,
        }),
      },
      crane: {
        vert: true, dirs: [1, -1], name: 'load', N: noun('f', 'Last'),
        title: T('On the building site', 'Auf der Baustelle'),
        X: { sym: FL('T'), html: F('T'), what: T('the pull of the crane cable', 'die Seilkraft des Kranseils'), dat: 'der Seilkraft des Kranseils' },
        Y: { sym: FL('G'), html: F('G'), what: T('the weight of the load', 'die Gewichtskraft der Last'), dat: 'der Gewichtskraft der Last' },
        text: (ph, d) => T(`A building crane moves a load (a pallet of bricks) on its cable, straight ${d > 0 ? 'up' : 'down'}. ${{ speeding: 'The load is speeding up.', constant: 'The load moves at constant speed.', slowing: 'The load is slowing down before it stops.' }[ph]} Air resistance is negligible.`,
          `Ein Baukran bewegt eine Last (eine Palette mit Ziegelsteinen) an seinem Seil senkrecht ${d > 0 ? 'nach oben' : 'nach unten'}. ${{ speeding: 'Die Last wird schneller.', constant: 'Die Last bewegt sich mit konstanter Geschwindigkeit.', slowing: 'Die Last bremst vor einem Halt ab.' }[ph]} Der Luftwiderstand ist vernachlässigbar.`),
      },
    };
  }
  const OBJECT_KEYS = ['crate', 'car', 'elevator', 'skydiver', 'motorboat', 'plane', 'cyclist', 'trolley', 'train', 'crane'];
  const PHASES = ['speeding', 'constant', 'slowing'];
  const PH_SIGN = { speeding: 1, constant: 0, slowing: -1 };

  function balance(r, p) {
    const key = p.obj || r.pick(OBJECT_KEYS), ob = objects()[key];
    const phase = p.phase || r.pick(PHASES);
    const d = p.dir || r.pick(ob.dirs);
    const acc = d * PH_SIGN[phase]; // sign of the acceleration along X: +1, 0, −1
    const { X, Y, N } = ob, name = ob.name;
    const Fnet = F('net');
    const fwd = ob.vert ? T('up', 'nach oben') : T('forward', 'nach vorn'), back = ob.vert ? T('down', 'nach unten') : T('backward', 'nach hinten');
    const motion = ob.vert ? (d > 0 ? T('up', 'nach oben') : T('down', 'nach unten')) : T('forward', 'nach vorn');
    const against = ob.vert ? (d > 0 ? T('down', 'nach unten') : T('up', 'nach oben')) : T('backward', 'nach hinten');
    const doing = T({ speeding: 'speeds up', constant: 'moves at constant speed', slowing: 'slows down' }[phase],
      { speeding: 'wird schneller', constant: 'bewegt sich mit konstanter Geschwindigkeit', slowing: 'wird langsamer' }[phase]);
    const rel = (c) => (c > 0 ? T('larger than', 'grösser als') : c < 0 ? T('smaller than', 'kleiner als') : T('equal to', 'gleich gross wie'));
    const marksWord = T('position every second', 'Position jede Sekunde');

    // ---------------------------------------------------------- figure
    const gaps = { speeding: [14, 22, 30, 38], constant: [26, 26, 26, 26], slowing: [38, 30, 22, 14] }[phase];
    const marks = [0];
    gaps.forEach((gp) => marks.push(marks[marks.length - 1] + gp));
    const LX = 46, LYf = 46 - 16 * acc; // drawn lengths of X and Y in the force diagram
    const label = T(`The ${name}, with its position every second`, `${cap(N.nom)}, mit der Position jede Sekunde`);
    function figure(o = {}) {
      let g = '';
      if (!ob.vert) {
        const yF = 150, x0 = 40, end = x0 + marks[4] * 1.6;
        g += D.line(x0, 36, end, 36, 'guide') + marks.map((m) => D.line(x0 + m * 1.6, 30, x0 + m * 1.6, 42, 'ln')).join('') + D.words((x0 + end) / 2, 22, marksWord);
        g += D.arrow(end + 14, 36, end + 54, 36, 'm', '', { head: 8 });
        const bx = end - 26;
        const dr = ob.draw ? ob.draw(bx, yF) : key === 'crate' ? { g: D.person(bx - 27, yF, 70, 1, 'push') + D.crate(bx, yF - 46, 52, 46), cx: bx + 26, cy: yF - 23, fy: yF - 3 }
          : { g: D.car(bx - 30, yF, 96), cx: bx + 18, cy: yF - 26 };
        if (key !== 'motorboat' && key !== 'plane') g += D.ground(0, 380, yF);
        g += dr.g;
        const { cx, cy } = dr, fy = dr.fy || cy, k = ob.k || 1, lx = LX * k, ly = LYf * k; // longer arrows for long bodies
        if (o.forces) {
          g += D.arrow(cx, cy, cx + lx, cy, 'f', X.sym, { at: [cx + lx + 6, cy - 8], anchor: 'start' });
          g += fy !== cy ? D.arrow(cx, fy, cx - ly, fy, 'f', Y.sym, { at: [cx - ly - 4, ob.low ? fy + 20 : fy - 7], anchor: 'end' }) : D.arrow(cx, cy, cx - ly, cy, 'f', Y.sym, { at: [cx - ly - 6, cy - 8], anchor: 'end' });
          g += D.dot(cx, cy, 3, 'pt');
        }
        if (o.net) g += acc ? D.arrow(cx - 16 * (acc < 0), yF + 26, cx + 32 * acc - 16 * (acc < 0), yF + 26, 'net', FL('net'), { at: [cx + 40, yF + 30], anchor: 'start' }) : D.text(cx, yF + 32, `${FL('net')} = 0`, 'lbl net');
        return D.svg(380, o.net ? 194 : 172, g, label);
      }
      // vertical: a column of position marks next to the object
      const W = 320, H = 300, xm = 70, base = d > 0 ? 260 : 60, sgn = d > 0 ? -1 : 1, k = 1.3;
      const ys = marks.map((m) => base + sgn * m * k), yEnd = ys[4];
      g += D.line(xm, Math.min(...ys), xm, Math.max(...ys), 'guide') + ys.map((y) => D.line(xm - 6, y, xm + 6, y, 'ln')).join('');
      g += `<text class="txt" x="${xm - 14}" y="${(ys[0] + ys[4]) / 2}" text-anchor="middle" transform="rotate(-90 ${xm - 14} ${(ys[0] + ys[4]) / 2})">${marksWord}</text>`;
      g += D.arrow(xm + 22, yEnd - sgn * 10, xm + 22, yEnd + sgn * 30, 'm', '', { head: 8 });
      const cx = 190, cy = yEnd;
      if (key === 'elevator') g += D.ceiling(140, 240, 14) + D.line(150, 14, 150, H, 'shaft') + D.line(230, 14, 230, H, 'shaft') + D.elevator(164, cy - 26, 52, 52, 14);
      else if (key === 'crane') g += D.rect(96, 4, 200, 10, 'solid', 1) + D.rect(180, 14, 20, 8, 'obj', 1) + D.line(cx, 22, cx, cy - 22, 'cable') + D.line(cx, cy - 22, cx - 22, cy - 20, 'thin') + D.line(cx, cy - 22, cx + 22, cy - 20, 'thin') + D.crate(cx - 26, cy - 20, 52, 40);
      else g += D.skydiver(cx, cy, phase === 'slowing');
      if (o.forces) {
        const ay = key === 'skydiver' ? cy - 2 : cy;
        g += D.arrow(cx, ay, cx, ay - LX, 'f', X.sym, { at: [cx + 10, ay - LX + 6], anchor: 'start' });
        g += D.arrow(cx, ay, cx, ay + LYf, 'f', Y.sym, { at: [cx + 10, ay + LYf], anchor: 'start' });
        g += D.dot(cx, ay, 3, 'pt');
        if (o.net) g += acc ? D.arrow(cx + 70, ay + 16 * acc, cx + 70, ay - 16 * acc, 'net', FL('net'), { at: [cx + 78, ay + 4], anchor: 'start' }) : D.text(cx + 66, ay + 4, `${FL('net')} = 0`, 'lbl net', 'start');
      }
      return D.svg(W, H, g, label);
    }

    // ---------------------------------------------------------- questions
    const actual = T(`it ${doing}`, `${N.er} ${doing}`);
    const effect = (c) => (c === 0 ? T('move at constant speed', 'sich mit konstanter Geschwindigkeit bewegen') : c * d > 0 ? T('speed up', 'schneller werden') : T('slow down', 'langsamer werden'));
    const notNeeded = T(`Moving ${motion} does not need a net force ${motion}. `, `Um sich ${motion} zu bewegen, braucht es keine resultierende Kraft ${motion}. `);
    function whyRel(c) {
      const imply = T(`If ${X.html} were ${rel(c)} ${Y.html}, the net force would ${c ? `point ${c > 0 ? fwd : back}` : 'be zero'}, and the ${name} would ${effect(c)}. But ${actual}.`,
        `Wäre ${X.html} ${rel(c)} ${Y.html}, dann wäre die resultierende Kraft ${c ? `${c > 0 ? fwd : back} gerichtet` : 'null'}, und ${N.nom} würde ${effect(c)}. Aber ${actual}.`);
      const misled = c * d > 0 && acc * d <= 0;
      return { code: misled ? 'active-force' : 'other', why: misled ? notNeeded + imply : imply };
    }
    const relOpt = (c) => {
      const label = T(`${X.html} is ${rel(c)} ${Y.html}.`, `${X.html} ist ${rel(c)} ${Y.html}.`);
      if (c === acc) {
        const tail = acc ? `: ${X.html} ${acc > 0 ? '>' : '<'} ${Y.html}` : T(` and ${X.html} = ${Y.html}`, `, also ${X.html} = ${Y.html}`);
        return o(label, 'ok', T(`Right: the ${name} ${doing}, so the net force ${acc ? `points ${acc > 0 ? fwd : back}` : 'is zero'}${tail}.`,
          `Richtig: ${cap(N.nom)} ${doing}, also ist die resultierende Kraft ${acc ? `${acc > 0 ? fwd : back} gerichtet` : 'null'}${tail}.`));
      }
      const w = whyRel(c);
      return o(label, w.code, w.why);
    };
    const netRight = acc === 0 ? 'none' : acc * d > 0 ? 'with' : 'against';
    const netOpt = (kind) => {
      const label = {
        with: T(`In the direction of motion (${motion}).`, `In Bewegungsrichtung (${motion}).`),
        against: T(`Against the direction of motion (${against}).`, `Gegen die Bewegungsrichtung (${against}).`),
        none: T('There is no net force.', 'Es gibt keine resultierende Kraft.'),
      }[kind];
      if (kind === netRight) {
        return o(label, 'ok', T(`Right: the net force points along the acceleration. The ${name} ${doing}${acc ? `, so its acceleration points ${kind === 'with' ? motion : against}` : ', so its acceleration is zero'}.`,
          `Richtig: Die resultierende Kraft zeigt in Richtung der Beschleunigung. ${cap(N.nom)} ${doing}${acc ? `, also zeigt die Beschleunigung ${kind === 'with' ? motion : against}` : ', also ist die Beschleunigung null'}.`));
      }
      const misled = kind === 'with';
      const why = (misled ? T(`A body moving ${motion} does not need a net force ${motion}. `, `Ein Körper, der sich ${motion} bewegt, braucht keine resultierende Kraft ${motion}. `) : '') +
        (kind === 'none'
          ? T('With no net force it would move at constant speed.', `Ohne resultierende Kraft würde ${N.er} sich mit konstanter Geschwindigkeit bewegen.`)
          : T(`A net force ${kind === 'with' ? motion : against} would make the ${name} ${kind === 'with' ? 'speed up' : 'slow down'}.`,
            `Eine resultierende Kraft ${kind === 'with' ? motion : against} würde ${N.acc} ${kind === 'with' ? 'schneller' : 'langsamer'} machen.`)) +
        T(` But ${actual}.`, ` Aber ${actual}.`);
      return o(label, misled ? 'active-force' : 'other', why);
    };
    // without numbers? The motion is enough.
    const enough = T(`The motion is enough: the ${name} ${doing}, so the net force ${acc ? `points ${acc > 0 ? fwd : back}` : 'is zero'}.`,
      `Die Bewegung genügt: ${cap(N.nom)} ${doing}, also ist die resultierende Kraft ${acc ? `${acc > 0 ? fwd : back} gerichtet` : 'null'}.`);
    const questions = [
      q(r, 'compare', T(`How does ${X.what} (${X.html}) compare with ${Y.what} (${Y.html})?`, `Wie gross ist ${X.what} (${X.html}) im Vergleich zu ${Y.dat} (${Y.html})?`), [...[1, 0, -1].map(relOpt),
        o(T('That cannot be told without the values of the forces.', 'Das lässt sich ohne die Werte der Kräfte nicht sagen.'), 'other', T(`It can: the forces need not be known. ${enough}`, `Doch: Die Kräfte muss man nicht kennen. ${enough}`))]),
      q(r, 'net', T(`Which way does the net force on the ${name} point?`, `Wohin zeigt die resultierende Kraft auf ${N.acc}?`), [...['with', 'against', 'none'].map(netOpt),
        o(T(`That depends on the mass of the ${name}.`, `Das hängt von der Masse ${{ f: 'der', m: 'des', n: 'des' }[N.g]} ${N.word}${N.g === 'f' ? '' : 's'} ab.`), 'other', T(`The mass sets how large the net force is for a given acceleration, not which way it points. ${enough}`, `Die Masse bestimmt, wie gross die resultierende Kraft für eine bestimmte Beschleunigung ist, nicht wohin sie zeigt. ${enough}`))]),
    ];

    const gapWord = T({ speeding: 'grow', constant: 'stay the same', slowing: 'shrink' }[phase], { speeding: 'wachsen', constant: 'bleiben gleich', slowing: 'schrumpfen' }[phase]);
    const extra = key === 'skydiver' && phase === 'slowing'
      ? T(': the open parachute gives a drag larger than the weight, until the skydiver is slow enough', ': Der offene Fallschirm erzeugt einen Luftwiderstand, der grösser ist als die Gewichtskraft, bis der Fallschirmspringer langsam genug ist')
      : (key === 'elevator' || key === 'crane') && phase === 'slowing' && d > 0
        ? T(`: the cable pulls less than the weight, although the ${key === 'crane' ? 'load' : 'cabin'} is still moving up`, `: Das Seil zieht weniger stark, als die Gewichtskraft beträgt, obwohl ${key === 'crane' ? 'die Last sich noch nach oben bewegt' : 'die Kabine noch nach oben fährt'}`)
        : '';
    const steps = [
      { title: T('How does it move?', 'Wie bewegt es sich?'), figure: figure(),
        text: T(`The marks show the position every second. The gaps ${gapWord}: the ${name} ${doing}. So its acceleration ${acc ? `points ${acc * d > 0 ? motion : against}, ${acc * d > 0 ? 'along' : 'against'} the motion` : 'is zero'}.`,
          `Die Marken zeigen die Position jede Sekunde. Die Abstände ${gapWord}: ${cap(N.nom)} ${doing}. Die Beschleunigung ${acc ? `zeigt also ${acc * d > 0 ? motion : against}, ${acc * d > 0 ? 'in' : 'gegen die'} Bewegungsrichtung` : 'ist also null'}.`) },
      { title: T('Net force', 'Resultierende Kraft'), figure: figure({ forces: true, net: true }),
        text: T(`Second law, ${Fnet} = <i>m·a</i>: the net force points the way the acceleration points — ${acc ? (acc > 0 ? fwd : back) : 'here it is zero'}. Which way the ${name} moves does not matter${phase !== 'speeding' ? `: moving ${motion} does not need a net force ${motion}` : ''}.`,
          `Zweites Newtonsches Gesetz, ${Fnet} = <i>m·a</i>: Die resultierende Kraft zeigt in die Richtung der Beschleunigung — ${acc ? (acc > 0 ? fwd : back) : 'hier ist sie null'}. In welche Richtung sich ${N.nom} bewegt, spielt keine Rolle${phase !== 'speeding' ? `: Um sich ${motion} zu bewegen, braucht es keine resultierende Kraft ${motion}` : ''}.`) },
      { title: T('Compare the forces', 'Kräfte vergleichen'), figure: figure({ forces: true, net: true }),
        text: T(`${ob.vert ? 'Only' : 'Along the motion, only'} ${X.html} (${fwd}) and ${Y.html} (${back}) act${ob.vert ? '' : `; ${ob.cancel || 'the weight and the push of the ground are vertical and cancel'}`}. So ${acc ? `${X.html} ${acc > 0 ? '>' : '<'} ${Y.html}` : `${X.html} = ${Y.html}`}${extra}.`,
          `${ob.vert ? 'Es wirken nur' : 'In Bewegungsrichtung wirken nur'} ${X.html} (${fwd}) und ${Y.html} (${back})${ob.vert ? '' : `; ${ob.cancel || 'Gewichtskraft und Normalkraft des Bodens sind vertikal und heben sich auf'}`}. Also ${acc ? `${X.html} ${acc > 0 ? '>' : '<'} ${Y.html}` : `${X.html} = ${Y.html}`}${extra}.`) },
    ];

    return {
      title: ob.title || T({ crate: 'Pushing a crate', car: 'On the road', elevator: 'In the elevator shaft', skydiver: 'Skydiving' }[key],
        { crate: 'Eine Kiste schieben', car: 'Auf der Strasse', elevator: 'Im Liftschacht', skydiver: 'Fallschirmsprung' }[key]),
      situation: `<p>${ob.text(phase, d)}</p>`,
      figure: figure(),
      questions,
      hints: [
        T(`${ob.vert ? 'Only two forces act on' : 'Along the motion, only two forces act on'} the ${name}: ${X.html}, ${X.what}, points ${fwd}; ${Y.html}, ${Y.what}, points ${back}. Look at the gaps between the marks: does the ${name} get faster, keep its speed or get slower?`,
          `${ob.vert ? 'Auf' : 'In Bewegungsrichtung wirken auf'} ${N.acc} ${ob.vert ? 'wirken ' : ''}nur zwei Kräfte: ${X.html}, ${X.what}, zeigt ${fwd}; ${Y.html}, ${Y.what}, zeigt ${back}. Schau dir die Abstände der Marken an: Wird ${N.nom} schneller, bleibt ${N.er} gleich schnell oder wird ${N.er} langsamer?`),
        T(`Plan: the gaps of the marks → how the velocity of the ${name} changes (its acceleration) → which way ${Fnet} points (second law) → which of ${X.html} and ${Y.html} is larger.`,
          `Plan: Abstände der Marken → wie sich die Geschwindigkeit ${{ f: 'der', m: 'des', n: 'des' }[N.g]} ${N.word}${N.g === 'f' ? '' : 's'} ändert (Beschleunigung) → wohin ${Fnet} zeigt (zweites Gesetz) → welche der Kräfte ${X.html} und ${Y.html} grösser ist.`),
        T(`Counting ${fwd} as positive: ${Fnet} = ${X.html} − ${Y.html} = <i>m·a</i>. So the sign of <i>a</i> decides the sign of ${X.html} − ${Y.html}; that the ${name} moves ${motion} does not.`,
          `Zählt man ${fwd} positiv, gilt: ${Fnet} = ${X.html} − ${Y.html} = <i>m·a</i>. Das Vorzeichen von <i>a</i> bestimmt also das Vorzeichen von ${X.html} − ${Y.html}; dass sich ${N.nom} ${motion} bewegt, spielt keine Rolle.`),
        T(`Here the ${name} moves ${motion} and ${doing}. Does the change of its velocity point ${fwd} or ${back}, or is there none? That gives the sign of ${X.html} − ${Y.html}.`,
          `Hier bewegt sich ${N.nom} ${motion} und ${doing}. Zeigt die Änderung der Geschwindigkeit ${fwd} oder ${back}, oder gibt es keine? Das ergibt das Vorzeichen von ${X.html} − ${Y.html}.`),
      ],
      steps,
    };
  }

  // ================================================================ thruster: constant sideways force
  // A probe (its engine) or an astronaut (her jet pack), drifting east in space, pushed north or
  // south for a while.
  function thruster(r, p) {
    const who = p.obj || r.pick(['probe', 'astronaut']);
    const s = p.side || r.pick([1, -1]);
    const b = p.bend || r.pick([60, 75, 90, 110]);
    const probeObj = who === 'probe';
    const name = probeObj ? 'probe' : 'astronaut', eng = probeObj ? 'engine' : 'jet pack';
    const N = probeObj ? noun('f', 'Sonde') : noun('f', 'Astronautin'), E = probeObj ? noun('n', 'Triebwerk') : noun('m', 'Düsenrucksack');
    const it = probeObj ? 'it' : 'she', its = probeObj ? 'its' : 'her', him = probeObj ? 'it' : 'her';
    const side = s > 0 ? 'north' : 'south', vS = `<i>v</i><sub>${s > 0 ? 'N' : 'S'}</sub>`;
    const dSide = s > 0 ? 'Norden' : 'Süden', dAdj = s > 0 ? 'nördlich' : 'südlich';
    const toSide = T(`toward the ${side}`, `nach ${dSide}`);
    const vE = T('<i>v</i><sub>E</sub>', '<i>v</i><sub>O</sub>');
    const Py = s > 0 ? 160 : 40, P = [60, Py], W = 220;
    const at = (u) => [P[0] + W * u, Py - s * b * u * u];
    const Q = at(1), tq = [W, -2 * s * b], lq = Math.hypot(...tq), tu = [tq[0] / lq, tq[1] / lq];
    const turn = deg(Math.atan2(2 * b, W));

    // the body seen from above, heading east; thrust: the direction of the force (flame opposite)
    function body(x, y, thrust, size) {
      if (probeObj) return D.probe(x, y, [1, 0], thrust, size);
      const k = size;
      let g = '';
      if (thrust) g += `<polygon class="flame" points="${D.n(x - 5 * k)},${D.n(y - thrust[1] * 9 * k)} ${D.n(x)},${D.n(y - thrust[1] * 24 * k)} ${D.n(x + 5 * k)},${D.n(y - thrust[1] * 9 * k)}"/>`;
      g += D.rect(x - 16 * k, y - 8 * k, 7 * k, 16 * k, 'solid', 2) + `<ellipse class="obj" cx="${D.n(x - 2 * k)}" cy="${D.n(y)}" rx="${D.n(9 * k)}" ry="${D.n(10 * k)}"/>`;
      g += D.ball(x + 10 * k, y, 6.5 * k) + `<circle class="win" cx="${D.n(x + 12 * k)}" cy="${D.n(y)}" r="${D.n(3.2 * k)}"/>`;
      return g;
    }
    const label = probeObj ? T(`Top view: a probe drifting east, pushed ${side} from P on`, `Ansicht von oben: eine Sonde treibt nach Osten und wird ab P nach ${dSide} beschleunigt`)
      : T(`Top view: an astronaut drifting east, pushed ${side} by her jet pack from P on`, `Ansicht von oben: eine Astronautin treibt nach Osten und wird ab P von ihrem Düsenrucksack nach ${dSide} beschleunigt`);

    function figure(o = {}) {
      let g = D.rect(0, 0, 380, 200, 'space', 6) + D.arrow(352, 46, 352, 18, 'ax', 'N', { head: 7, at: [352, 58] });
      g += D.line(4, Py, P[0], Py, 'trace');
      [16, 38].forEach((x) => { g += D.ghost(body(x, Py, null, 0.6)); });
      if (o.path) {
        g += D.poly(Array.from({ length: 31 }, (z, j) => at(j / 30)), 'trace strong');
        [0.25, 0.5, 0.75].forEach((u) => {
          const [x, y] = at(u);
          g += D.ghost(body(x, y, [0, -s], 0.6));
          if (o.forces) g += D.arrow(x, y, x, y - s * 30, 'f', u === 0.5 ? 'F' : '', { at: [x + 8, y - s * 24 + 4], anchor: 'start' });
        });
      }
      // Q is where the engine is switched off: in every picture, as the text refers to it
      g += D.dot(Q[0], Q[1], 3.5, 'pt') + D.text(Q[0] + 6, Q[1] + s * 16 + 4, 'Q', 'lbl', 'start');
      if (o.after) {
        g += D.line(Q[0], Q[1], Q[0] + 110 * tu[0], Q[1] + 110 * tu[1], 'trace strong');
        g += body(Q[0] + 60 * tu[0], Q[1] + 60 * tu[1], null, 0.6);
      }
      if (o.vel) [0, 0.5, 1].forEach((u) => {
        const [x, y] = at(u);
        g += D.arrow(x, y, x + 40, y, 'v', u === 0 ? T('v_E', 'v_O') : '', { cls: 'alt' }) + (u ? D.arrow(x, y, x, y - s * 40 * u * (2 * b / W), 'v', u === 1 ? (s > 0 ? 'v_N' : 'v_S') : '', { cls: 'alt', at: [x - 6, y - s * 14], anchor: 'end' }) : '') +
          D.arrow(x, y, x + 40, y - s * 40 * u * (2 * b / W), 'v', '', { cls: 'strong' });
      });
      g += body(P[0], Py, o.path ? null : [0, -s], 0.75) + D.text(P[0] - 2, Py + s * 22 + 4, 'P', 'lbl', 'middle');
      if (!o.path && !o.vel) g += D.arrow(P[0], Py, P[0], Py - s * 44, 'f', 'F', { at: [P[0] + 8, Py - s * 36], anchor: 'start' }) + D.arrow(P[0] + 20, Py, P[0] + 70, Py, 'v', 'v');
      return D.svg(380, 200, g, label);
    }

    const pic = (d) => {
      const y = s > 0 ? 96 : 14;
      return D.svg(150, 110, D.line(2, y, 16, y, 'trace') + D.path(d(16, y), 'opt-path') + body(16, y, null, 0.42), T('path', 'Bahn'));
    };
    const bb = 70 * Math.min(1, b / 90);
    const PATH = {
      ok: (x, y) => 'M' + Array.from({ length: 21 }, (z, j) => `${D.n(x + 110 * (j / 20))} ${D.n(y - s * bb * (j / 20) ** 2)}`).join(' L'),
      straight: (x, y) => `M${x} ${y} L${x + 110} ${D.n(y - s * bb)}`,
      corner: (x, y) => `M${x} ${y} V${y - s * 76}`,
      arc: (x, y) => `M${x} ${y} A60 60 0 0 ${s > 0 ? 0 : 1} ${x + 60} ${y - s * 60}`,
    };
    const The = cap(T(`the ${name}`, N.nom)), Eng = cap(T(`the ${eng}`, E.nom));
    const split = T(`Split the motion: east–west no force acts, so the velocity east stays the same; ${side}ward the constant force gives a constant acceleration`,
      `Zerlege die Bewegung: In Ost-West-Richtung wirkt keine Kraft, also bleibt die Geschwindigkeit nach Osten gleich; nach ${dSide} bewirkt die konstante Kraft eine konstante Beschleunigung`);
    const questions = [
      q(r, 'path', T(`Which path does the ${name} follow from P until the ${eng} is switched off?`, `Welche Bahn beschreibt ${N.nom} von P an, bis ${E.nom} abgeschaltet wird?`), [
        o(pic(PATH.ok), 'ok', T(`Right: ${split}. Together: a curve that bends more and more toward the ${side} — a parabola, like the path of a ball thrown horizontally.`,
          `Richtig: ${split}. Zusammen: eine Kurve, die sich immer stärker nach ${dSide} krümmt — eine Parabel, wie die Bahn eines horizontal geworfenen Balls.`),
          T(`a curve bending more and more to the ${side} (a parabola)`, `eine Kurve, die sich immer stärker nach ${dSide} krümmt (eine Parabel)`)),
        o(pic(PATH.straight), 'other', T(`A straight slanted line needs a constant velocity. But the velocity toward the ${side} keeps growing while the ${eng} runs, so the path keeps getting steeper.`,
          `Eine schräge Gerade braucht eine konstante Geschwindigkeit. Die Geschwindigkeit nach ${dSide} wächst aber, solange ${E.nom} läuft, also wird die Bahn immer steiler.`),
          T('a straight slanted line', 'eine schräge Gerade')),
        o(pic(PATH.corner), 'last-force', T(`${The} does not lose ${its} velocity east when the ${eng} starts: no force acts east–west. The ${eng} only adds a growing velocity toward the ${side}.`,
          `${cap(N.nom)} verliert ihre Geschwindigkeit nach Osten nicht, wenn ${E.nom} startet: In Ost-West-Richtung wirkt keine Kraft. ${cap(E.nom)} fügt nur eine wachsende Geschwindigkeit nach ${dSide} hinzu.`),
          T(`straight ${side}`, `geradeaus nach ${dSide}`)),
        o(pic(PATH.arc), 'other', T(`A circle needs a force that always points to its centre, so it turns with the ${name}. Here the force keeps pointing ${side}: the ${name} keeps ${its} velocity east, and the path is a parabola, not a circle.`,
          `Ein Kreis braucht eine Kraft, die immer zum Zentrum zeigt, sich also mit ${N.dat} dreht. Hier zeigt die Kraft immer nach ${dSide}: ${cap(N.nom)} behält ihre Geschwindigkeit nach Osten, und die Bahn ist eine Parabel, kein Kreis.`),
          T('a quarter circle', 'ein Viertelkreis')),
      ], true),
      q(r, 'speed', T(`How does the speed of the ${name} change while the ${eng} runs?`, `Wie ändert sich der Betrag der Geschwindigkeit ${probeObj ? 'der Sonde' : 'der Astronautin'}, während ${E.nom} läuft?`), [
        o(T('It increases all the time.', 'Er nimmt die ganze Zeit zu.'), 'ok', T(`Right: the velocity east stays the same and the velocity toward the ${side} keeps growing, so the speed √(${vE}² + ${vS}²) increases.`,
          `Richtig: Die Geschwindigkeit nach Osten bleibt gleich, und die Geschwindigkeit nach ${dSide} wächst, also nimmt der Betrag √(${vE}² + ${vS}²) zu.`)),
        o(T('It stays the same: the force only changes the direction.', 'Er bleibt gleich: Die Kraft ändert nur die Richtung.'), 'other',
          T(`That is only so if the force is always at right angles to the velocity. Here the force keeps pointing ${side}, and the velocity toward the ${side} grows while the velocity east stays: the speed increases.`,
            `Das gilt nur, wenn die Kraft immer senkrecht zur Geschwindigkeit steht. Hier zeigt die Kraft immer nach ${dSide}, und die Geschwindigkeit nach ${dSide} wächst, während die nach Osten bleibt: Der Betrag nimmt zu.`)),
        o(T(`It increases at first, then stays the same while the ${eng} still runs.`, `Er nimmt zuerst zu und bleibt dann gleich, während ${E.nom} noch läuft.`), 'active-force',
          T(`As long as the force acts, the velocity keeps changing at the same rate: <i>a</i> = <i>F</i>/<i>m</i>. A constant force does not lead to a constant speed.`,
            `Solange die Kraft wirkt, ändert sich die Geschwindigkeit gleich schnell weiter: <i>a</i> = <i>F</i>/<i>m</i>. Eine konstante Kraft führt nicht zu einer konstanten Geschwindigkeit.`)),
        o(T(`It decreases, because the ${name} is pushed off course.`, `Er nimmt ab, weil ${N.nom} vom Kurs abgedrängt wird.`), 'other',
          T(`The velocity east is not reduced: no force acts east–west. The velocity toward the ${side} only grows.`, `Die Geschwindigkeit nach Osten wird nicht kleiner: In Ost-West-Richtung wirkt keine Kraft. Die Geschwindigkeit nach ${dSide} wächst nur.`)),
      ]),
      q(r, 'after', T(`How does the ${name} move after the ${eng} has been switched off?`, `Wie bewegt sich ${N.nom}, nachdem ${E.nom} abgeschaltet wurde?`), [
        o(T(`In a straight line, in the direction ${it} had at that moment, at constant speed.`, 'Geradlinig, in der Richtung, die sie in diesem Moment hatte, mit konstanter Geschwindigkeit.'), 'ok',
          T(`Right: with no force, the ${name} keeps ${its} velocity (first law).`, `Richtig: Ohne Kraft behält ${N.nom} ihre Geschwindigkeit (erstes Newtonsches Gesetz).`)),
        o(T(`${cap(it)} keeps curving toward the ${side}, more and more gently.`, `Sie krümmt sich weiter nach ${dSide}, immer schwächer.`), 'impetus',
          T(`Without a force the path is not bent any more: there is no stored push that slowly wears off.`, 'Ohne Kraft wird die Bahn nicht mehr gekrümmt: Es gibt keinen gespeicherten Schub, der langsam nachlässt.')),
        o(T(`${cap(it)} turns back to ${its} original direction, east.`, 'Sie dreht zurück in ihre ursprüngliche Richtung, nach Osten.'), 'other',
          T(`Nothing pushes ${him} back. ${cap(it)} keeps the velocity ${it} had when the ${eng} stopped, including the velocity toward the ${side}.`, `Nichts drückt sie zurück. Sie behält die Geschwindigkeit, die sie beim Abschalten hatte, auch die Geschwindigkeit nach ${dSide}.`)),
        o(T(`${cap(it)} gets slower and slower and finally stops.`, 'Sie wird immer langsamer und bleibt schliesslich stehen.'), 'active-force',
          T(`In space nothing slows the ${name} down. Without a force ${it} keeps ${its} velocity.`, `Im Weltraum bremst nichts ${N.acc}. Ohne Kraft behält sie ihre Geschwindigkeit.`)),
      ]),
    ];

    const steps = [
      { title: T('Before P', 'Vor P'), figure: figure(),
        text: T(`Far from any planet and with the ${eng} off, no force acts: the ${name} moves in a straight line at constant speed, east (first law).`,
          `Weit weg von jedem Planeten und mit abgeschaltetem ${E.word} wirkt keine Kraft: ${cap(N.nom)} bewegt sich geradlinig mit konstanter Geschwindigkeit nach Osten (erstes Newtonsches Gesetz).`) },
      { title: T('From P on: split the motion', 'Ab P: Bewegung zerlegen'), figure: figure({ path: true, forces: true }),
        text: T(`${Eng} pushes with a constant force toward the ${side}. East–west no force acts: the velocity east stays the same. Toward the ${side} the force gives a constant acceleration: the velocity toward the ${side} grows steadily from zero, and the distance grows like <i>t</i>². Together: a parabola, like a ball thrown horizontally — only “falling” to the ${side}.`,
          `${cap(E.nom)} übt eine konstante Kraft nach ${dSide} aus. In Ost-West-Richtung wirkt keine Kraft: Die Geschwindigkeit nach Osten bleibt gleich. Nach ${dSide} bewirkt die Kraft eine konstante Beschleunigung: Die Geschwindigkeit nach ${dSide} wächst gleichmässig von null an, und die Strecke wächst wie <i>t</i>². Zusammen: eine Parabel, wie bei einem horizontal geworfenen Ball — nur „fällt“ ${N.nom} nach ${dSide}.`) },
      { title: T('Speed', 'Betrag der Geschwindigkeit'), figure: figure({ path: true, vel: true }),
        text: T(`The velocity arrows: the part east stays, the part toward the ${side} grows. So the speed √(${vE}² + ${vS}²) increases all the time the ${eng} runs.`,
          `Die Geschwindigkeitspfeile: Der Anteil nach Osten bleibt, der Anteil nach ${dSide} wächst. Also nimmt der Betrag √(${vE}² + ${vS}²) zu, solange ${E.nom} läuft.`) },
      { title: T(`After the ${eng} stops`, 'Nach dem Abschalten'), figure: figure({ path: true, after: true }),
        text: T(`At Q the ${eng} stops. No force acts any more, so the ${name} moves in a straight line at constant speed, in the direction ${it} had at Q — here about ${turn}° ${side} of east.`,
          `In Q stoppt ${E.nom}. Es wirkt keine Kraft mehr, also bewegt sich ${N.nom} geradlinig mit konstanter Geschwindigkeit weiter, in der Richtung, die sie in Q hatte — hier etwa ${turn}° ${dAdj} von Osten.`) },
    ];

    return {
      title: T('Thrust to the side', 'Schub zur Seite'),
      situation: probeObj
        ? T(`<p>A space probe far from any planet drifts east with its engine off. At P its engine is switched on and pushes it with a constant force toward the ${side} (the probe is held so that the force always points ${side}). A little later, at Q, the engine is switched off again. The picture shows the probe from above.</p>`,
          `<p>Eine Raumsonde treibt weit weg von jedem Planeten mit abgeschaltetem Triebwerk nach Osten. In P wird ihr Triebwerk eingeschaltet und übt eine konstante Kraft nach ${dSide} auf sie aus (die Sonde wird so ausgerichtet, dass die Kraft immer nach ${dSide} zeigt). Etwas später, in Q, wird das Triebwerk wieder abgeschaltet. Das Bild zeigt die Sonde von oben.</p>`)
        : T(`<p>An astronaut in her spacesuit, far from any planet, drifts east with her jet pack off. At P she switches on the side jets of her jet pack, which push her with a constant force toward the ${side} (she keeps facing east, so the force always points ${side}). A little later, at Q, she switches the jet pack off again. The picture shows her from above.</p>`,
          `<p>Eine Astronautin im Raumanzug treibt weit weg von jedem Planeten mit abgeschaltetem Düsenrucksack nach Osten. In P schaltet sie die seitlichen Düsen ihres Düsenrucksacks ein; sie üben eine konstante Kraft nach ${dSide} auf sie aus (sie blickt weiter nach Osten, sodass die Kraft immer nach ${dSide} zeigt). Etwas später, in Q, schaltet sie den Düsenrucksack wieder ab. Das Bild zeigt sie von oben.</p>`),
      figure: figure(),
      questions,
      hints: [
        T(`Three stretches: before P the ${eng} is off, from P to Q it pushes the ${name} ${toSide}, after Q it is off again. Which force acts on the ${name} in each stretch, and which way does it point?`,
          `Drei Abschnitte: Vor P ist ${E.nom} aus, von P bis Q drückt ${E.er} ${N.acc} ${toSide}, nach Q ist ${E.er} wieder aus. Welche Kraft wirkt in jedem Abschnitt auf ${N.acc}, und wohin zeigt sie?`),
        T(`Plan: split the velocity of the ${name} into ${vE} (east) and ${vS} (${toSide}). Which of the two can a force ${toSide} change, and which not? Then put the two parts together again.`,
          `Plan: Zerlege die Geschwindigkeit ${N.g === 'f' ? 'der' : 'des'} ${N.word}${N.g === 'f' ? '' : 's'} in ${vE} (nach Osten) und ${vS} (${toSide}). Welchen der beiden Anteile kann eine Kraft ${toSide} ändern, welchen nicht? Setze dann die beiden Anteile wieder zusammen.`),
        T(`From P to Q: east–west there is no force, so ${vE} stays as it was before P (first law); ${toSide} the constant force gives <i>a</i> = <i>F</i>/<i>m</i>, so ${vS} = <i>a·t</i> and the distance ${toSide} is ½<i>a·t</i>² (second law).`,
          `Von P bis Q: In Ost-West-Richtung wirkt keine Kraft, also bleibt ${vE} wie vor P (erstes Gesetz); ${toSide} ergibt die konstante Kraft <i>a</i> = <i>F</i>/<i>m</i>, also ${vS} = <i>a·t</i> und die Strecke ${toSide} ½<i>a·t</i>² (zweites Gesetz).`),
        T(`Here, between P and Q, the velocity east stays the same while the velocity ${side} grows from 0. It is the same as a ball thrown horizontally, turned on its side. After Q no force acts.`,
          `Hier bleibt zwischen P und Q die Geschwindigkeit nach Osten gleich, während die Geschwindigkeit ${toSide} von 0 an wächst. Das ist wie ein horizontal geworfener Ball, nur zur Seite gedreht. Nach Q wirkt keine Kraft.`),
      ],
      steps,
    };
  }

  // ================================================================ two forces at an angle
  const PAIRS = [[2, 4], [3, 6], [2, 6], [4, 8], [3, 5], [4, 6]];
  const angDiff = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return Math.min(d, 2 * Math.PI - d); };

  function twoForces(r, p) {
    let F1, F2, a1, a2, res, ar;
    for (let tries = 0; ; tries++) {
      const pair = p.pair || r.pick(PAIRS);
      [F1, F2] = p.pair ? pair : r.next() < 0.5 ? pair : [pair[1], pair[0]];
      a1 = ((p.a1 != null ? p.a1 : r.pick([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330])) * Math.PI) / 180;
      const gamma = ((p.gamma || r.pick([60, 90, 120])) * Math.PI) / 180;
      a2 = a1 + (p.sense || r.pick([1, -1])) * gamma;
      res = [F1 * Math.cos(a1) + F2 * Math.cos(a2), F1 * Math.sin(a1) + F2 * Math.sin(a2)];
      ar = Math.atan2(res[1], res[0]);
      const big = F1 > F2 ? a1 : a2, small = F1 > F2 ? a2 : a1, bis = Math.atan2(Math.sin(a1) + Math.sin(a2), Math.cos(a1) + Math.cos(a2));
      if ((angDiff(ar, big) >= (15 * Math.PI) / 180 && angDiff(ar, bis) >= (12 * Math.PI) / 180 && angDiff(ar, small) >= (15 * Math.PI) / 180) || tries > 50) break;
    }
    const R = Math.hypot(...res), big = F1 > F2 ? 1 : 2;
    const aBig = big === 1 ? a1 : a2, aSmall = big === 1 ? a2 : a1;
    const bis = Math.atan2(Math.sin(a1) + Math.sin(a2), Math.cos(a1) + Math.cos(a2));
    const gammaDeg = deg(angDiff(a1, a2));
    const Fnet = F('net'), ratio = num(Math.max(F1, F2) / Math.min(F1, F2));

    // ---------------------------------------------------------- figure (top view)
    const C = [160, 135], k = 100 / Math.max(F1, F2);
    const tip = (Fv, a, c = C, kk = k) => [c[0] + kk * Fv * Math.cos(a), c[1] + kk * Fv * Math.sin(a)];
    const lab = (Fv, a) => { const [x, y] = tip(Fv + 1.3 * Math.max(F1, F2) / 6, a); return [x, y + 4]; };
    function figure(o = {}) {
      let g = D.rect(0, 0, 320, 270, 'ice', 6);
      const t1 = tip(F1, a1), t2 = tip(F2, a2), tr = [C[0] + k * res[0], C[1] + k * res[1]];
      if (o.parallelogram) g += D.line(t1[0], t1[1], tr[0], tr[1], 'guide') + D.line(t2[0], t2[1], tr[0], tr[1], 'guide');
      if (o.strobe) [0.35, 0.8, 1.45].forEach((f) => { g += D.ghost(D.puck(C[0] + f * 60 * Math.cos(ar), C[1] + f * 60 * Math.sin(ar), 13)); });
      g += D.puck(C[0], C[1], 13);
      g += D.arrow(C[0], C[1], t1[0], t1[1], 'f', '', {}) + D.text(...lab(F1, a1), `F_1 = ${F1} N`, 'lbl f small');
      g += D.arrow(C[0], C[1], t2[0], t2[1], 'f', '', {}) + D.text(...lab(F2, a2), `F_2 = ${F2} N`, 'lbl f small');
      if (o.parallelogram) {
        g += D.arrow(C[0], C[1], tr[0], tr[1], 'net', '');
        const [lx, ly] = [C[0] + (k * R + 22) * Math.cos(ar), C[1] + (k * R + 22) * Math.sin(ar) + 4];
        g += D.text(lx, ly, `${FL('net')} ≈ ${num(R)} N`, 'lbl net small');
      }
      if (o.acc) { const px = 26 * Math.sin(ar), py = -26 * Math.cos(ar); g += D.arrow(C[0] + px, C[1] + py, C[0] + px + 44 * Math.cos(ar), C[1] + py + 44 * Math.sin(ar), 'a', 'a'); }
      return D.svg(320, 270, g, T('Top view: two strings pull on a puck at an angle', 'Ansicht von oben: zwei Schnüre ziehen schräg an einem Puck'));
    }

    const c2 = [60, 60];
    const pic = (a) => {
      let g = D.line(c2[0], c2[1], c2[0] + 50 * Math.cos(a1), c2[1] + 50 * Math.sin(a1), 'guide faint') + D.line(c2[0], c2[1], c2[0] + 50 * Math.cos(a2), c2[1] + 50 * Math.sin(a2), 'guide faint');
      g += D.text(c2[0] + 56 * Math.cos(a1), c2[1] + 56 * Math.sin(a1) + 4, 'F_1', 'lbl small faint') + D.text(c2[0] + 56 * Math.cos(a2), c2[1] + 56 * Math.sin(a2) + 4, 'F_2', 'lbl small faint');
      g += D.puck(c2[0], c2[1], 7) + D.arrow(c2[0], c2[1], c2[0] + 44 * Math.cos(a), c2[1] + 44 * Math.sin(a), 'opt', '', { head: 9 });
      return D.svg(120, 120, g, T('direction', 'Richtung'));
    };
    const FBh = `<i>F</i><sub>${big}</sub>`, FSh = `<i>F</i><sub>${3 - big}</sub>`;
    const both = T(`Both forces act at the same time and add as arrows: the net force is the diagonal of the parallelogram they span. The puck starts moving along the net force.`,
      'Beide Kräfte wirken gleichzeitig und addieren sich als Pfeile: Die resultierende Kraft ist die Diagonale des Parallelogramms, das sie aufspannen. Der Puck setzt sich in Richtung der resultierenden Kraft in Bewegung.');
    const motion = p.motion || r.pick(['rest', 'cut', 'one']);
    const cutK = r.pick([1, 2]), FO = `<i>F</i><sub>${3 - cutK}</sub>`;
    const MOTION = {
      rest: () => q(r, 'motion', T('Both strings keep pulling in the same way. How does the puck move?', 'Beide Schnüre ziehen weiter gleich. Wie bewegt sich der Puck?'), [
        o(T('In a straight line, faster and faster.', 'Geradlinig, immer schneller.'), 'ok',
          T('Right: a constant net force gives a constant acceleration in its direction. Starting from rest, the puck moves in a straight line and gets faster and faster.',
            'Richtig: Eine konstante resultierende Kraft bewirkt eine konstante Beschleunigung in ihrer Richtung. Aus der Ruhe heraus bewegt sich der Puck geradlinig und wird immer schneller.')),
        o(T('In a straight line at constant speed.', 'Geradlinig mit konstanter Geschwindigkeit.'), 'active-force',
          T(`A constant net force does not give a constant speed; it changes the speed at a constant rate: <i>a</i> = ${Fnet}/<i>m</i>.`,
            `Eine konstante resultierende Kraft ergibt keine konstante Geschwindigkeit; sie ändert die Geschwindigkeit gleichmässig: <i>a</i> = ${Fnet}/<i>m</i>.`)),
        o(T('First along the larger force, then it turns toward the smaller one.', 'Zuerst entlang der grösseren Kraft, dann dreht er zur kleineren.'), 'largest-force',
          T('Both forces act from the start, so the net force — and the direction of motion — is the same from the start.', 'Beide Kräfte wirken von Anfang an, also ist die resultierende Kraft — und die Bewegungsrichtung — von Anfang an dieselbe.')),
        o(T('A short distance, then it stops.', 'Ein kurzes Stück, dann bleibt er stehen.'), 'impetus',
          T('The forces keep acting, so the puck keeps accelerating. It would not even stop if they stopped: on the air table nothing slows it down.',
            'Die Kräfte wirken weiter, also wird der Puck weiter beschleunigt. Er würde nicht einmal anhalten, wenn sie aufhörten: Auf dem Lufttisch bremst ihn nichts.')),
            ]),
      cut: () => q(r, 'motion', T('After a while, both strings are released at the same moment. How does the puck move after that?', 'Nach einer Weile werden beide Schnüre im selben Moment losgelassen. Wie bewegt sich der Puck danach?'), [
        o(T('Straight on in the same direction, at the speed it has reached.', 'Geradeaus in derselben Richtung weiter, mit der erreichten Geschwindigkeit.'), 'ok',
          T('Right: without any force (friction negligible) the puck keeps its velocity: first law.', 'Richtig: Ohne Kraft (Reibung vernachlässigbar) behält der Puck seine Geschwindigkeit: erstes Newtonsches Gesetz.')),
        o(T('It slows down and stops after a while.', 'Er wird langsamer und bleibt nach einer Weile stehen.'), 'impetus',
          T('Nothing slows the puck down on the air table: no force means no change of velocity.', 'Auf dem Lufttisch bremst nichts den Puck: Keine Kraft heisst keine Änderung der Geschwindigkeit.')),
        o(T('It stops at once.', 'Er bleibt sofort stehen.'), 'active-force',
          T('A puck needs no force to keep moving: it keeps the velocity it has (first law).', 'Ein Puck braucht keine Kraft, um sich weiterzubewegen: Er behält seine Geschwindigkeit (erstes Newtonsches Gesetz).')),
        o(T('It keeps getting faster in the same direction.', 'Er wird in derselben Richtung weiter schneller.'), 'other',
          T('Without a force there is no acceleration: the speed stays as it is.', 'Ohne Kraft gibt es keine Beschleunigung: Die Geschwindigkeit bleibt, wie sie ist.')),
      ]),
      one: () => q(r, 'motion', T(`After a while, only string ${cutK} is released; ${FO} keeps pulling as before. How does the puck move after that?`, `Nach einer Weile wird nur Schnur ${cutK} losgelassen; ${FO} zieht weiter wie bisher. Wie bewegt sich der Puck danach?`), [
        o(T(`On a curve that bends more and more toward the direction of ${FO}.`, `Auf einer Kurve, die sich immer mehr in die Richtung von ${FO} biegt.`), 'ok',
          T(`Right: the puck keeps its velocity, and ${FO} now adds a velocity in its own direction. So the path bends gradually toward ${FO}, like a thrown ball bends toward the ground.`,
            `Richtig: Der Puck behält seine Geschwindigkeit, und ${FO} fügt nun eine Geschwindigkeit in seiner Richtung hinzu. Die Bahn biegt sich also allmählich zu ${FO} hin, wie ein geworfener Ball zum Boden.`)),
        o(T(`It turns at once and moves along ${FO}.`, `Er dreht sofort ab und bewegt sich entlang ${FO}.`), 'last-force',
          T(`A force changes the velocity, it does not replace it: the puck keeps the velocity it has and only gradually gets a part along ${FO}.`, `Eine Kraft ändert die Geschwindigkeit, sie ersetzt sie nicht: Der Puck behält seine Geschwindigkeit und bekommt nur allmählich einen Anteil entlang ${FO}.`)),
        o(T('Straight on in the same direction, faster and faster.', 'Geradeaus in derselben Richtung, immer schneller.'), 'other',
          T(`The net force now is ${FO} alone, which points in another direction than the velocity: the path bends toward ${FO}.`, `Die resultierende Kraft ist jetzt ${FO} allein, und sie zeigt in eine andere Richtung als die Geschwindigkeit: Die Bahn biegt sich zu ${FO} hin.`)),
        o(T('Straight on in the same direction at constant speed.', 'Geradeaus in derselben Richtung mit konstanter Geschwindigkeit.'), 'other',
          T(`${FO} still acts, so the velocity keeps changing: the path bends toward ${FO}.`, `${FO} wirkt weiter, also ändert sich die Geschwindigkeit weiter: Die Bahn biegt sich zu ${FO} hin.`)),
      ]),
    };
    const motionQ = MOTION[motion]();
    const questions = [
      q(r, 'dir', T('In which direction does the puck start to move?', 'In welche Richtung setzt sich der Puck in Bewegung?'), [
        o(pic(ar), 'ok', `${T('Right:', 'Richtig:')} ${both}`, T('along the diagonal of the parallelogram of the two forces, closer to the larger one', 'entlang der Diagonale des Kräfteparallelogramms, näher bei der grösseren Kraft')),
        o(pic(aBig), 'largest-force', T(`${FSh} counts too, not just the larger force. ${both}`, `${FSh} zählt auch, nicht nur die grössere Kraft. ${both}`), T(`along the larger force ${FBh}`, `entlang der grösseren Kraft ${FBh}`)),
        o(pic(bis), 'other', T(`Exactly halfway between would be right for two equal forces. Here ${FBh} is ${ratio} times as large as ${FSh}, so the net force lies closer to ${FBh}.`,
          `Genau in der Mitte wäre richtig bei zwei gleich grossen Kräften. Hier ist ${FBh} ${ratio}-mal so gross wie ${FSh}, also liegt die resultierende Kraft näher bei ${FBh}.`),
          T('exactly halfway between the two forces', 'genau in der Mitte zwischen den beiden Kräften')),
        o(pic(aSmall), 'other', T(`${both} It lies closer to the larger force, ${FBh}.`, `${both} Sie liegt näher bei der grösseren Kraft ${FBh}.`), T('along the smaller force', 'entlang der kleineren Kraft')),
      ], true),
      motionQ,
    ];

    const steps = [
      { title: T('Net force', 'Resultierende Kraft'), figure: figure({ parallelogram: true }),
        text: T(`Both forces act at the same time; they add as arrows. Draw the parallelogram they span: its diagonal is the net force, here about ${qty(R, 'N')} (the forces are ${gammaDeg}° apart). It lies closer to the larger force ${FBh}, but not along it.`,
          `Beide Kräfte wirken gleichzeitig; sie addieren sich als Pfeile. Zeichne das Parallelogramm, das sie aufspannen: Seine Diagonale ist die resultierende Kraft, hier etwa ${qty(R, 'N')} (die Kräfte schliessen ${gammaDeg}° ein). Sie liegt näher bei der grösseren Kraft ${FBh}, aber nicht auf ihr.`) },
      { title: T('Direction of motion', 'Bewegungsrichtung'), figure: figure({ parallelogram: true, acc: true }),
        text: T(`Second law: the acceleration <i>a</i> = ${Fnet}/<i>m</i> points along the net force. The puck starts from rest, so it starts moving in this direction — not along the larger force, and not halfway between.`,
          `Zweites Newtonsches Gesetz: Die Beschleunigung <i>a</i> = ${Fnet}/<i>m</i> zeigt in Richtung der resultierenden Kraft. Der Puck startet aus der Ruhe, also bewegt er sich in diese Richtung — nicht entlang der grösseren Kraft und nicht genau in der Mitte.`) },
      { title: T('The motion', 'Die Bewegung'), figure: figure({ parallelogram: true, strobe: true }),
        text: T(`The forces do not change, so neither does the acceleration: the puck moves in a straight line along the net force, faster and faster.`,
          'Die Kräfte ändern sich nicht, also auch die Beschleunigung nicht: Der Puck bewegt sich geradlinig in Richtung der resultierenden Kraft, immer schneller.') +
          { rest: '', cut: T(' When both strings are released, no force acts any more: the puck moves on in the same direction at the speed it has reached (first law).', ' Wenn beide Schnüre losgelassen werden, wirkt keine Kraft mehr: Der Puck bewegt sich in derselben Richtung mit der erreichten Geschwindigkeit weiter (erstes Newtonsches Gesetz).'),
            one: T(` When string ${cutK} is released, ${FO} alone is the net force. It does not replace the velocity, it changes it gradually: the path bends more and more toward ${FO}.`, ` Wenn Schnur ${cutK} losgelassen wird, ist ${FO} allein die resultierende Kraft. Sie ersetzt die Geschwindigkeit nicht, sondern ändert sie allmählich: Die Bahn biegt sich immer mehr zu ${FO} hin.`) }[motion] },
    ];

    return {
      title: T('Two strings', 'Zwei Schnüre'),
      situation: T(`<p>A puck lies at rest on an air table (friction is negligible). Two strings pull on it at the same time, with <i>F</i><sub>1</sub> = ${F1} N and <i>F</i><sub>2</sub> = ${F2} N, in the directions shown. The picture shows the table from above.</p>`,
        `<p>Ein Puck liegt ruhig auf einem Lufttisch (Reibung vernachlässigbar). Zwei Schnüre ziehen gleichzeitig an ihm, mit <i>F</i><sub>1</sub> = ${F1} N und <i>F</i><sub>2</sub> = ${F2} N, in die gezeigten Richtungen. Das Bild zeigt den Tisch von oben.</p>`),
      figure: figure(),
      questions,
      hints: [
        T(`The puck starts from rest, and both strings pull at the same time: <i>F</i><sub>1</sub> = ${F1} N and <i>F</i><sub>2</sub> = ${F2} N, ${gammaDeg}° apart. Which of the two is larger, and does one of them act alone at the start?`,
          `Der Puck startet aus der Ruhe, und beide Schnüre ziehen gleichzeitig: <i>F</i><sub>1</sub> = ${F1} N und <i>F</i><sub>2</sub> = ${F2} N, mit ${gammaDeg}° dazwischen. Welche der beiden ist grösser, und wirkt am Anfang eine davon allein?`),
        T(`Plan: add ${FBh} and ${FSh} as arrows to ${Fnet}; the second law gives the direction of the acceleration, and from rest the puck starts along it. ${{ rest: 'Then ask what a constant net force does.', cut: 'Then ask what happens once no force acts.', one: `Then ask what ${FO} alone does to the velocity the puck already has.` }[motion]}`,
          `Plan: Addiere ${FBh} und ${FSh} als Pfeile zu ${Fnet}; das zweite Gesetz ergibt die Richtung der Beschleunigung, und aus der Ruhe setzt sich der Puck in diese Richtung in Bewegung. ${{ rest: 'Frage dich dann, was eine konstante resultierende Kraft bewirkt.', cut: 'Frage dich dann, was passiert, wenn keine Kraft mehr wirkt.', one: `Frage dich dann, was ${FO} allein mit der Geschwindigkeit macht, die der Puck schon hat.` }[motion]}`),
        T(`${Fnet} = <i>F</i><sub>1</sub> + <i>F</i><sub>2</sub> as arrows, not as numbers: its size lies between ${F1 > F2 ? F1 - F2 : F2 - F1} N and ${F1 + F2} N. Then <i>a</i> = ${Fnet}/<i>m</i>, in the direction of ${Fnet}.`,
          `${Fnet} = <i>F</i><sub>1</sub> + <i>F</i><sub>2</sub> als Pfeile, nicht als Zahlen: Ihr Betrag liegt zwischen ${F1 > F2 ? F1 - F2 : F2 - F1} N und ${F1 + F2} N. Dann ist <i>a</i> = ${Fnet}/<i>m</i>, in Richtung von ${Fnet}.`),
        T(`Here ${FBh} is ${ratio} times as large as ${FSh}, and they are ${gammaDeg}° apart. Draw the parallelogram: does its diagonal (about ${qty(R, 'N')}) lie along one force, exactly halfway, or nearer to one of them?`,
          `Hier ist ${FBh} ${ratio}-mal so gross wie ${FSh}, und sie schliessen ${gammaDeg}° ein. Zeichne das Parallelogramm: Liegt seine Diagonale (etwa ${qty(R, 'N')}) auf einer Kraft, genau in der Mitte oder näher bei einer der beiden?`),
      ],
      steps,
    };
  }

  // ================================================================ centre: what keeps a body on its circle
  // A body moving at constant speed on a circle: the net force points to the centre, and one of
  // the forces that act provides it (friction, gravity, the string, the electric pull).
  function scenes() {
    return {
      car: {
        obj: 'car', N: noun('n', 'Auto'), sym: 'f', title: T('Round the bend', 'Durch die Kurve'),
        text: T('A car drives round a flat, circular bend at constant speed.', 'Ein Auto fährt mit konstanter Geschwindigkeit durch eine flache, kreisförmige Kurve.'),
        label: T('Top view: a car in a circular bend', 'Ansicht von oben: ein Auto in einer kreisförmigen Kurve'),
        force: T('the friction of the road on the tyres', 'die Reibungskraft der Strasse auf die Reifen'),
        others: T('Its weight and the normal force of the road are vertical and cancel; the driving force only makes up for the air resistance, along the motion.', 'Gewichtskraft und Normalkraft der Strasse sind vertikal und heben sich auf; die Antriebskraft gleicht in Bewegungsrichtung nur den Luftwiderstand aus.'),
        without: T('On black ice, without that friction, the car would slide straight on along the tangent.', 'Auf Glatteis, ohne diese Reibung, würde das Auto geradeaus entlang der Tangente weiterrutschen.'),
        options: (why) => [
          o(T('The friction of the road on the tyres.', 'Die Reibungskraft der Strasse auf die Reifen.'), 'ok', why.ok),
          o(T('The driving force of the engine.', 'Die Antriebskraft des Motors.'), 'active-force', T('The driving force points along the motion, not to the centre: at constant speed it only makes up for the air resistance.', 'Die Antriebskraft zeigt in Bewegungsrichtung, nicht zum Zentrum: Bei konstanter Geschwindigkeit gleicht sie nur den Luftwiderstand aus.')),
          o(T('The normal force of the road.', 'Die Normalkraft der Strasse.'), 'other', T('The normal force of a flat road points up: it balances the weight and cannot pull the car sideways.', 'Die Normalkraft einer flachen Strasse zeigt nach oben: Sie hält der Gewichtskraft das Gleichgewicht und kann das Auto nicht seitlich ziehen.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      moon: {
        obj: 'Moon', N: noun('m', 'Mond'), sym: 'G', title: T('The Moon', 'Der Mond'),
        text: T('The Moon goes round the Earth at constant speed on a (nearly) circular orbit.', 'Der Mond umkreist die Erde mit konstanter Geschwindigkeit auf einer (fast) kreisförmigen Bahn.'),
        label: T('The Moon on its orbit round the Earth', 'Der Mond auf seiner Bahn um die Erde'),
        force: T('the gravitational pull of the Earth on the Moon', 'die Gravitationskraft der Erde auf den Mond'),
        others: T('Far out in space, no other force of any size acts on the Moon.', 'Weit draussen im Weltraum wirkt keine andere nennenswerte Kraft auf den Mond.'),
        without: T('Without the pull of the Earth, the Moon would fly off along the tangent.', 'Ohne die Anziehung der Erde würde der Mond entlang der Tangente davonfliegen.'),
        options: (why) => [
          o(T('The gravitational pull of the Earth.', 'Die Gravitationskraft der Erde.'), 'ok', why.ok),
          o(T('A force along its orbit that keeps it moving.', 'Eine Kraft entlang der Bahn, die ihn in Bewegung hält.'), 'active-force', T('Moving on needs no force: in empty space the Moon keeps its speed by itself. A force along the orbit would make it faster.', 'Weiterbewegen braucht keine Kraft: Im leeren Weltraum behält der Mond sein Tempo von selbst. Eine Kraft entlang der Bahn würde ihn schneller machen.')),
          o(T('None: so far out in space, no force acts on it.', 'Keine: So weit draussen im Weltraum wirkt keine Kraft auf ihn.'), 'other', T('Without any force, the Moon would move in a straight line. The gravity of the Earth reaches far out into space and bends its path.', 'Ohne jede Kraft würde sich der Mond geradlinig bewegen. Die Gravitation der Erde reicht weit in den Weltraum hinaus und krümmt seine Bahn.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      stone: {
        obj: 'stone', N: noun('m', 'Stein'), sym: 'T', title: T('On a string', 'An der Schnur'),
        text: T('A stone tied to a string slides round a pin on smooth ice, at constant speed.', 'Ein Stein an einer Schnur gleitet auf glattem Eis mit konstanter Geschwindigkeit um einen Pfosten.'),
        label: T('Top view: a stone on a string sliding round a pin', 'Ansicht von oben: ein Stein an einer Schnur gleitet um einen Pfosten'),
        force: T('the pull of the string', 'die Seilkraft der Schnur'),
        others: T('Its weight and the push of the ice are vertical and cancel; friction is negligible.', 'Gewichtskraft und Normalkraft des Eises sind vertikal und heben sich auf; die Reibung ist vernachlässigbar.'),
        without: T('If the string broke, the stone would slide straight on along the tangent.', 'Risse die Schnur, würde der Stein geradeaus entlang der Tangente weitergleiten.'),
        options: (why) => [
          o(T('The pull of the string.', 'Die Seilkraft der Schnur.'), 'ok', why.ok),
          o(T('The push it was given at the start.', 'Der Stoss, den er am Anfang bekommen hat.'), 'impetus', T('The push is over: it is not stored in the stone. The stone keeps its speed by itself, and the string bends its path.', 'Der Stoss ist vorbei: Er ist nicht im Stein gespeichert. Der Stein behält sein Tempo von selbst, und die Schnur krümmt seine Bahn.')),
          o(T('Its weight.', 'Seine Gewichtskraft.'), 'other', T('The weight points down, not to the pin; the push of the ice balances it.', 'Die Gewichtskraft zeigt nach unten, nicht zum Pfosten; die Normalkraft des Eises hält ihr das Gleichgewicht.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      electron: {
        obj: 'electron', N: noun('n', 'Elektron'), sym: 'el', title: T('In the atom', 'Im Atom'),
        text: T('In a simple model of the hydrogen atom, the electron circles the nucleus, a proton, at constant speed.', 'In einem einfachen Modell des Wasserstoffatoms umkreist das Elektron den Kern, ein Proton, mit konstanter Geschwindigkeit.'),
        label: T('An electron circling a nucleus', 'Ein Elektron umkreist einen Kern'),
        force: T('the electric attraction of the nucleus', 'die elektrische Anziehung des Kerns'),
        others: T('The gravitational pull of the nucleus also points there, but it is about 10³⁹ times weaker: it plays no part.', 'Die Gravitationskraft des Kerns zeigt auch dorthin, ist aber etwa 10³⁹-mal schwächer: Sie spielt keine Rolle.'),
        without: T('Without the electric pull, the electron would fly off along the tangent.', 'Ohne die elektrische Anziehung würde das Elektron entlang der Tangente davonfliegen.'),
        options: (why) => [
          o(T('The electric attraction of the nucleus.', 'Die elektrische Anziehung des Kerns.'), 'ok', why.ok),
          o(T('The gravitational pull of the nucleus.', 'Die Gravitationskraft des Kerns.'), 'other', T('It does point to the nucleus, but it is about 10³⁹ times weaker than the electric pull: far too weak to matter.', 'Sie zeigt zwar zum Kern, ist aber etwa 10³⁹-mal schwächer als die elektrische Anziehung: viel zu schwach, um eine Rolle zu spielen.')),
          o(T('A force along its orbit that keeps it moving.', 'Eine Kraft entlang der Bahn, die es in Bewegung hält.'), 'active-force', T('Moving on needs no force; a force along the orbit would make the electron faster.', 'Weiterbewegen braucht keine Kraft; eine Kraft entlang der Bahn würde das Elektron schneller machen.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      station: {
        obj: 'space station', N: noun('f', 'Raumstation'), sym: 'G', title: T('The space station', 'Die Raumstation'), bg: 'space',
        text: T('The International Space Station orbits the Earth about 400 km up, at constant speed on a circular orbit.', 'Die Internationale Raumstation umkreist die Erde in etwa 400 km Höhe mit konstanter Geschwindigkeit auf einer Kreisbahn.'),
        label: T('The space station on its orbit round the Earth', 'Die Raumstation auf ihrer Bahn um die Erde'),
        force: T('the gravitational pull of the Earth on the station', 'die Gravitationskraft der Erde auf die Station'),
        others: T('Up there the air is so thin that its drag is negligible; no other force of any size acts.', 'Dort oben ist die Luft so dünn, dass ihr Widerstand vernachlässigbar ist; keine andere nennenswerte Kraft wirkt.'),
        without: T('Without the pull of the Earth, the station would fly off along the tangent.', 'Ohne die Anziehung der Erde würde die Station entlang der Tangente davonfliegen.'),
        options: (why) => [
          o(T('The gravitational pull of the Earth.', 'Die Gravitationskraft der Erde.'), 'ok', why.ok),
          o(T('None: up there everything is weightless, so gravity does not act.', 'Keine: Dort oben ist alles schwerelos, also wirkt keine Schwerkraft.'), 'other', T('At 400 km the pull of the Earth is still about 90 % as strong as on the ground. The astronauts float because the station and everything in it fall round the Earth together, not because gravity is gone.', 'In 400 km Höhe ist die Anziehung der Erde noch etwa 90 % so stark wie am Boden. Die Astronauten schweben, weil die Station und alles darin gemeinsam um die Erde fallen, nicht weil die Schwerkraft fehlt.')),
          o(T('The thrust of its engines, which keeps it moving.', 'Der Schub ihrer Triebwerke, der sie in Bewegung hält.'), 'active-force', T('Moving on needs no force: the station keeps its speed by itself. A force along the orbit would make it faster; its engines only fire now and then, to make up for the slight drag.', 'Weiterbewegen braucht keine Kraft: Die Station behält ihr Tempo von selbst. Eine Kraft entlang der Bahn würde sie schneller machen; ihre Triebwerke zünden nur ab und zu, um den geringen Luftwiderstand auszugleichen.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      earth: {
        obj: 'Earth', N: noun('f', 'Erde'), sym: 'G', title: T('Round the Sun', 'Um die Sonne'), bg: 'space',
        text: T('The Earth goes round the Sun at (nearly) constant speed on a (nearly) circular orbit.', 'Die Erde umläuft die Sonne mit (fast) konstanter Geschwindigkeit auf einer (fast) kreisförmigen Bahn.'),
        label: T('The Earth on its orbit round the Sun', 'Die Erde auf ihrer Bahn um die Sonne'),
        force: T('the gravitational pull of the Sun on the Earth', 'die Gravitationskraft der Sonne auf die Erde'),
        others: T('The pulls of the Moon and the other planets are far smaller and do not point to the Sun; they hardly change the orbit.', 'Die Anziehung durch den Mond und die anderen Planeten ist viel kleiner und zeigt nicht zur Sonne; sie ändert die Bahn kaum.'),
        without: T('Without the pull of the Sun, the Earth would fly off along the tangent.', 'Ohne die Anziehung der Sonne würde die Erde entlang der Tangente davonfliegen.'),
        options: (why) => [
          o(T('The gravitational pull of the Sun.', 'Die Gravitationskraft der Sonne.'), 'ok', why.ok),
          o(T('The pull of the Moon.', 'Die Anziehung des Mondes.'), 'other', T('The Moon goes round the Earth, so its pull points in a different direction every few days, and it is about 180 times weaker than the pull of the Sun. The force towards the centre of the orbit comes from the Sun.', 'Der Mond umkreist die Erde, also zeigt seine Anziehung alle paar Tage in eine andere Richtung, und sie ist etwa 180-mal schwächer als die Anziehung der Sonne. Die Kraft zum Zentrum der Bahn kommt von der Sonne.')),
          o(T('A force along its orbit that keeps it moving.', 'Eine Kraft entlang der Bahn, die sie in Bewegung hält.'), 'active-force', T('Moving on needs no force: in empty space the Earth keeps its speed by itself. A force along the orbit would make it faster.', 'Weiterbewegen braucht keine Kraft: Im leeren Weltraum behält die Erde ihr Tempo von selbst. Eine Kraft entlang der Bahn würde sie schneller machen.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      cyclist: {
        obj: 'cyclist', its: 'her', N: noun('f', 'Velofahrerin'), sym: 'f', title: T('Riding in a circle', 'Mit dem Velo im Kreis'),
        text: T('A cyclist rides in a circle on a flat, empty car park, at constant speed.', 'Eine Velofahrerin fährt auf einem flachen, leeren Parkplatz mit konstanter Geschwindigkeit im Kreis.'),
        label: T('Top view: a cyclist riding in a circle', 'Ansicht von oben: eine Velofahrerin fährt im Kreis'),
        force: T('the friction of the ground on the tyres', 'die Reibungskraft des Bodens auf die Reifen'),
        others: T('Her weight and the normal force of the ground are vertical and cancel; pedalling only makes up for the air resistance, along the motion.', 'Gewichtskraft und Normalkraft des Bodens sind vertikal und heben sich auf; das Treten gleicht in Bewegungsrichtung nur den Luftwiderstand aus.'),
        without: T('On a patch of ice, without that friction, she would slide straight on along the tangent.', 'Auf einer Eisfläche, ohne diese Reibung, würde sie geradeaus entlang der Tangente weiterrutschen.'),
        options: (why) => [
          o(T('The friction of the ground on the tyres.', 'Die Reibungskraft des Bodens auf die Reifen.'), 'ok', why.ok),
          o(T('Her leaning into the curve.', 'Ihr Neigen in die Kurve.'), 'other', T('Leaning is not a force. She leans so as not to tip over; what pulls her round is the sideways friction of the ground on the tyres.', 'Das Neigen ist keine Kraft. Sie neigt sich, damit sie nicht umkippt; was sie in die Kurve zwingt, ist die seitliche Reibungskraft des Bodens auf die Reifen.')),
          o(T('The push of her pedalling.', 'Der Antrieb durch ihr Treten.'), 'active-force', T('Pedalling drives her along the motion, not to the centre: at constant speed it only makes up for the air resistance.', 'Das Treten treibt sie in Bewegungsrichtung an, nicht zum Zentrum: Bei konstanter Geschwindigkeit gleicht es nur den Luftwiderstand aus.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      runner: {
        obj: 'runner', its: 'her', N: noun('f', 'Läuferin'), sym: 'f', title: T('Jogging in a circle', 'Im Kreis joggen'),
        text: T('A runner jogs in a circle on a flat lawn, at constant speed.', 'Eine Läuferin joggt auf einer flachen Wiese mit konstanter Geschwindigkeit im Kreis.'),
        label: T('Top view: a runner jogging in a circle', 'Ansicht von oben: eine Läuferin joggt im Kreis'),
        force: T('the friction of the ground on her shoes', 'die Reibungskraft des Bodens auf ihre Schuhe'),
        others: T('Her weight and the normal force of the ground are vertical and cancel (on average over each stride); along the motion, her push off the ground only makes up for the air resistance.', 'Gewichtskraft und Normalkraft des Bodens sind vertikal und heben sich auf (im Mittel über jeden Schritt); in Bewegungsrichtung gleicht ihr Abstossen nur den Luftwiderstand aus.'),
        without: T('On smooth ice, without that friction, she could not turn: she would slide straight on along the tangent.', 'Auf glattem Eis, ohne diese Reibung, könnte sie nicht abbiegen: Sie würde geradeaus entlang der Tangente weiterrutschen.'),
        options: (why) => [
          o(T('The friction of the ground on her shoes.', 'Die Reibungskraft des Bodens auf ihre Schuhe.'), 'ok', why.ok),
          o(T('The forward push of her legs.', 'Der Schub ihrer Beine nach vorn.'), 'active-force', T('Moving on needs no extra force; at constant speed the push along the motion only makes up for the air resistance. The force to the centre is the sideways friction on her shoes.', 'Weiterbewegen braucht keine zusätzliche Kraft; bei konstanter Geschwindigkeit gleicht der Schub in Bewegungsrichtung nur den Luftwiderstand aus. Die Kraft zum Zentrum ist die seitliche Reibung auf ihre Schuhe.')),
          o(T('Her weight.', 'Ihre Gewichtskraft.'), 'other', T('The weight points down, not to the centre; the normal force of the ground balances it.', 'Die Gewichtskraft zeigt nach unten, nicht zum Zentrum; die Normalkraft des Bodens hält ihr das Gleichgewicht.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      train: {
        obj: 'train', N: noun('m', 'Zug'), sym: 'N', title: T('On a curved track', 'Im Gleisbogen'),
        text: T('A train runs round a flat, circular curve of track at constant speed.', 'Ein Zug fährt mit konstanter Geschwindigkeit durch einen flachen, kreisförmigen Gleisbogen.'),
        label: T('Top view: a train on a circular track', 'Ansicht von oben: ein Zug auf einem kreisförmigen Gleis'),
        force: T('the sideways push of the outer rail on the wheel flanges', 'die seitliche Normalkraft der äusseren Schiene auf die Spurkränze'),
        others: T('Its weight and the upward push of the rails are vertical and cancel; the driving force only makes up for the resistance, along the motion.', 'Gewichtskraft und Normalkraft der Schienen nach oben sind vertikal und heben sich auf; die Antriebskraft gleicht in Bewegungsrichtung nur den Fahrwiderstand aus.'),
        without: T('Without the rails, the train would roll straight on along the tangent: it would derail.', 'Ohne die Schienen würde der Zug geradeaus entlang der Tangente weiterrollen: Er würde entgleisen.'),
        options: (why) => [
          o(T('The sideways push of the outer rail.', 'Die seitliche Kraft der äusseren Schiene.'), 'ok', why.ok),
          o(T('The driving force of the locomotive.', 'Die Antriebskraft der Lokomotive.'), 'active-force', T('The driving force points along the track, not to the centre: at constant speed it only makes up for the resistance.', 'Die Antriebskraft zeigt entlang des Gleises, nicht zum Zentrum: Bei konstanter Geschwindigkeit gleicht sie nur den Fahrwiderstand aus.')),
          o(T('Its weight.', 'Seine Gewichtskraft.'), 'other', T('The weight points down, not to the centre; the upward push of the rails balances it.', 'Die Gewichtskraft zeigt nach unten, nicht zum Zentrum; die Normalkraft der Schienen nach oben hält ihr das Gleichgewicht.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      leaf: {
        obj: 'lettuce leaf', N: noun('n', 'Salatblatt'), sym: 'N', title: T('In the salad spinner', 'In der Salatschleuder'),
        text: T('A lettuce leaf lies against the wall of the basket of a salad spinner and goes round with it at constant speed.', 'Ein Salatblatt liegt an der Wand des Korbs einer Salatschleuder an und dreht sich mit konstanter Geschwindigkeit mit.'),
        label: T('Top view: a lettuce leaf against the wall of a turning salad spinner', 'Ansicht von oben: ein Salatblatt an der Wand einer drehenden Salatschleuder'),
        force: T('the push of the basket wall on the leaf', 'die Normalkraft der Korbwand auf das Blatt'),
        others: T('Its weight is balanced by vertical forces of the basket (friction on the wall, or the floor of the basket); they do not point to the centre.', 'Seine Gewichtskraft wird von vertikalen Kräften des Korbs ausgeglichen (Reibung an der Wand oder der Boden des Korbs); sie zeigen nicht zum Zentrum.'),
        without: T('Where the wall has holes, nothing pushes the water drops round, and they fly off along the tangent.', 'Wo die Wand Löcher hat, drückt nichts die Wassertropfen auf die Kreisbahn, und sie fliegen entlang der Tangente davon.'),
        options: (why) => [
          o(T('The push of the basket wall.', 'Die Normalkraft der Korbwand.'), 'ok', why.ok),
          o(T('Its weight.', 'Seine Gewichtskraft.'), 'other', T('The weight points down, not to the centre; it is balanced by vertical forces of the basket.', 'Die Gewichtskraft zeigt nach unten, nicht zum Zentrum; vertikale Kräfte des Korbs gleichen sie aus.')),
          o(T('The push of the air that turns with the basket.', 'Der Druck der Luft, die sich mit dem Korb dreht.'), 'other', T('The air turns along with the leaf, so it hardly pushes on it, and it could not push it towards the centre. The wall does that.', 'Die Luft dreht sich mit dem Blatt mit, drückt also kaum darauf, und sie könnte es nicht zum Zentrum drücken. Das macht die Wand.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      marble: {
        obj: 'marble', N: noun('f', 'Murmel'), sym: 'N', title: T('In the cake tin', 'In der Kuchenform'),
        text: T('A marble rolls round and round along the inside wall of a round cake tin lying on a table, at constant speed.', 'Eine Murmel rollt in einer runden Kuchenform, die auf dem Tisch liegt, der Innenwand entlang im Kreis, mit konstanter Geschwindigkeit.'),
        label: T('Top view: a marble rolling along the wall of a round cake tin', 'Ansicht von oben: eine Murmel rollt der Wand einer runden Kuchenform entlang'),
        force: T('the push of the wall of the tin', 'die Normalkraft der Wand der Form'),
        others: T('Its weight and the push of the bottom of the tin are vertical and cancel; friction is negligible.', 'Gewichtskraft und Normalkraft des Bodens der Form sind vertikal und heben sich auf; die Reibung ist vernachlässigbar.'),
        without: T('Where the wall ended, the marble would roll straight on along the tangent.', 'Wo die Wand aufhört, würde die Murmel geradeaus entlang der Tangente weiterrollen.'),
        options: (why) => [
          o(T('The push of the wall of the tin.', 'Die Normalkraft der Wand der Form.'), 'ok', why.ok),
          o(T('The push it was given at the start.', 'Der Stoss, den sie am Anfang bekommen hat.'), 'impetus', T('The push is over: it is not stored in the marble. The marble keeps its speed by itself, and the wall bends its path.', 'Der Stoss ist vorbei: Er ist nicht in der Murmel gespeichert. Die Murmel behält ihr Tempo von selbst, und die Wand krümmt ihre Bahn.')),
          o(T('The push of the bottom of the tin.', 'Die Normalkraft des Bodens der Form.'), 'other', T('The bottom pushes up and balances the weight; it cannot push the marble sideways.', 'Der Boden drückt nach oben und hält der Gewichtskraft das Gleichgewicht; er kann die Murmel nicht seitlich drücken.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
      plane: {
        obj: 'model plane', N: noun('n', 'Modellflugzeug'), sym: 'T', title: T('On a control line', 'An der Steuerleine'),
        text: T('A model plane on a control line flies round its pilot in a horizontal circle, at constant speed.', 'Ein Modellflugzeug an einer Steuerleine fliegt mit konstanter Geschwindigkeit auf einem horizontalen Kreis um seinen Piloten.'),
        label: T('Top view: a model plane on a control line flying round its pilot', 'Ansicht von oben: ein Modellflugzeug an einer Steuerleine fliegt um seinen Piloten'),
        force: T('the pull of the control line', 'die Seilkraft der Steuerleine'),
        others: T('The lift on its wings balances its weight; the thrust of its propeller only makes up for the air resistance, along the motion.', 'Der Auftrieb an den Flügeln hält der Gewichtskraft das Gleichgewicht; der Schub des Propellers gleicht in Bewegungsrichtung nur den Luftwiderstand aus.'),
        without: T('If the line broke, the plane would fly straight on along the tangent.', 'Risse die Leine, würde das Flugzeug geradeaus entlang der Tangente weiterfliegen.'),
        options: (why) => [
          o(T('The pull of the control line.', 'Die Seilkraft der Steuerleine.'), 'ok', why.ok),
          o(T('The thrust of its propeller.', 'Der Schub seines Propellers.'), 'active-force', T('The thrust points along the motion, not to the centre: at constant speed it only makes up for the air resistance.', 'Der Schub zeigt in Bewegungsrichtung, nicht zum Zentrum: Bei konstanter Geschwindigkeit gleicht er nur den Luftwiderstand aus.')),
          o(T('The lift on its wings.', 'Der Auftrieb an seinen Flügeln.'), 'other', T('The lift points up and balances the weight; it does not point to the centre.', 'Der Auftrieb zeigt nach oben und hält der Gewichtskraft das Gleichgewicht; er zeigt nicht zum Zentrum.')),
          o(T('A centrifugal force.', 'Eine Zentrifugalkraft.'), 'centrifugal', why.out),
        ],
      },
    };
  }

  const CENTRE_SCENES = ['car', 'moon', 'stone', 'electron', 'station', 'earth', 'cyclist', 'runner', 'train', 'leaf', 'marble', 'plane'];
  function centre(r, p) {
    const key = p.scene || r.pick(CENTRE_SCENES), sc = scenes()[key], N = sc.N;
    const The = cap(T(`the ${sc.obj}`, N.nom)), acc = T(`the ${sc.obj}`, N.acc);
    const its = sc.its || 'its', sein = N.g === 'f' ? 'ihr' : 'sein', seine = N.g === 'f' ? 'ihre' : 'seine';
    const s = r.pick([1, -1]); // 1: clockwise in the picture
    const phi = (r.pick([0, 45, 90, 135, 180, 225, 270, 315]) * Math.PI) / 180;
    const C = [170, 130], R = 88;
    const pt = (a, rr = R) => [C[0] + rr * Math.cos(a), C[1] + rr * Math.sin(a)];
    const tan = (a) => [-s * Math.sin(a), s * Math.cos(a)], inw = (a) => [-Math.cos(a), -Math.sin(a)];
    const P = pt(phi), FS = F(sc.sym);

    // ---------------------------------------------------------- figure (top view)
    function body(x, y, a) {
      if (key === 'car') return `<g transform="rotate(${D.n((a * 180) / Math.PI)} ${D.n(x)} ${D.n(y)})">${D.rect(x - 9, y - 15, 18, 30, 'obj', 4)}${D.rect(x - 7, y + 6 * s - 4, 14, 8, 'win', 2)}</g>`;
      if (key === 'moon') return D.ball(x, y, 10);
      if (key === 'electron') return `<circle class="mag-s" cx="${D.n(x)}" cy="${D.n(y)}" r="7"/>` + D.text(x, y + 4, '−', 'lbl small');
      const turned = (g) => `<g transform="rotate(${D.n((a * 180) / Math.PI)} ${D.n(x)} ${D.n(y)})">${g}</g>`; // local +y·s: forward
      if (key === 'station') return turned(D.rect(x - 16, y - 3, 32, 6, 'solid', 1) + D.rect(x - 4, y - 6, 8, 12, 'obj', 1));
      if (key === 'earth') return `<circle class="obj earth" cx="${D.n(x)}" cy="${D.n(y)}" r="9"/>`;
      if (key === 'cyclist') return turned(D.rect(x - 2.5, y - 15, 5, 30, 'obj', 2) + D.rect(x - 8, y + 10 * s - 1.5, 16, 3, 'solid', 1) + D.ball(x, y - 2 * s, 5, 'skin'));
      if (key === 'runner') return turned(`<ellipse class="obj" cx="${D.n(x)}" cy="${D.n(y)}" rx="10" ry="5"/>` + D.ball(x, y, 4.5, 'skin'));
      if (key === 'train') return turned(D.rect(x - 8, y - 26, 16, 52, 'obj', 3) + D.rect(x - 5, y + 22 * s - 3, 10, 6, 'win', 2));
      if (key === 'leaf') return turned(`<ellipse class="obj" cx="${D.n(x)}" cy="${D.n(y)}" rx="4" ry="11"/>`);
      if (key === 'plane') return turned(D.rect(x - 2.5, y - 12, 5, 24, 'obj', 2) + D.rect(x - 15, y + 3 * s - 3, 30, 6, 'obj', 2) + D.rect(x - 6, y - 9 * s - 2, 12, 4, 'obj', 1));
      return D.ball(x, y, key === 'marble' ? 7 : 8);
    }
    function figure(o = {}) {
      let g = D.rect(0, 0, 340, 260, key === 'stone' ? 'ice' : ['moon', 'electron', 'station', 'earth'].includes(key) ? 'space' : 'table-top', 6);
      const centreWord = D.dot(C[0], C[1], 3, 'pt') + D.words(C[0], C[1] + 18, T('centre', 'Zentrum'));
      if (key === 'car' || key === 'marble') g += `<circle class="channel${key === 'marble' ? ' thin-ch' : ''}" cx="${C[0]}" cy="${C[1]}" r="${key === 'marble' ? R + 11 : R}"/>` + centreWord;
      else if (key === 'train') g += [R - 6, R + 6].map((rr) => `<circle class="thin" cx="${C[0]}" cy="${C[1]}" r="${rr}"/>`).join('') + centreWord;
      else if (key === 'leaf') g += `<circle class="channel thin-ch" cx="${C[0]}" cy="${C[1]}" r="${R + 9}"/>` + D.dot(C[0], C[1], 4, 'pin') + D.words(C[0], C[1] + 18, T('centre', 'Zentrum'));
      else g += `<circle class="trace" cx="${C[0]}" cy="${C[1]}" r="${R}" fill="none"/>` + (key === 'cyclist' || key === 'runner' ? centreWord : '');
      if (key === 'station') g += `<circle class="obj earth" cx="${C[0]}" cy="${C[1]}" r="30"/>` + D.words(C[0], C[1] + 4, T('Earth', 'Erde'));
      if (key === 'earth') g += `<circle class="lit" cx="${C[0]}" cy="${C[1]}" r="24"/>` + D.words(C[0], C[1] + 42, T('Sun', 'Sonne'));
      if (key === 'plane') g += D.ball(C[0], C[1], 6, 'skin') + D.line(C[0], C[1], P[0], P[1], 'cable') + D.words(C[0], C[1] + 22, T('pilot', 'Pilot'));
      if (key === 'moon') g += `<circle class="obj earth" cx="${C[0]}" cy="${C[1]}" r="26"/>` + D.words(C[0], C[1] + 44, T('Earth', 'Erde'));
      if (key === 'electron') g += `<circle class="mag-n" cx="${C[0]}" cy="${C[1]}" r="10"/>` + D.text(C[0], C[1] + 4, '+', 'lbl small');
      if (key === 'stone') g += D.dot(C[0], C[1], 3.5, 'pin') + D.line(C[0], C[1], P[0], P[1], 'cable');
      if (o.turn) [-0.9, -1.8].forEach((da) => {
        const a = phi + s * da, [x, y] = pt(a), t = tan(a);
        g += D.ghost(body(x, y, a)) + D.arrow(x, y, x + 40 * t[0], y + 40 * t[1], 'v', '');
      });
      g += body(P[0], P[1], phi) + D.text(P[0] - 22 * inw(phi)[0] - 10 * tan(phi)[0], P[1] - 22 * inw(phi)[1] - 10 * tan(phi)[1] + 4, 'P', 'lbl');
      const t = tan(phi), n = inw(phi);
      g += D.arrow(P[0] + 12 * t[0], P[1] + 12 * t[1], P[0] + 54 * t[0], P[1] + 54 * t[1], 'v', 'v');
      if (o.net) g += D.arrow(P[0] + 12 * n[0], P[1] + 12 * n[1], P[0] + 50 * n[0], P[1] + 50 * n[1], 'net', FL('net'), { at: [P[0] + 50 * n[0] + 10 * t[0], P[1] + 50 * n[1] + 10 * t[1] + 12], anchor: 'middle' });
      if (o.force) g += D.arrow(P[0] + 12 * n[0], P[1] + 12 * n[1], P[0] + 50 * n[0], P[1] + 50 * n[1], 'f', FL(sc.sym), { at: [P[0] + 50 * n[0] - 12 * t[0], P[1] + 50 * n[1] - 12 * t[1] + 4], anchor: 'middle' });
      if (o.tangent) g += D.line(P[0], P[1], P[0] + 150 * t[0], P[1] + 150 * t[1], 'guide');
      return D.svg(340, 260, g, sc.label);
    }

    // ---------------------------------------------------------- questions
    const turns = T(`${The} keeps ${its} speed, but ${its} direction of motion changes all the time.`, `${The} behält ${sein} Tempo, aber die Bewegungsrichtung ändert sich ständig.`);
    const inward = T('The velocity changes towards the inside of the curve, so the acceleration — and with it the net force — points to the centre.', 'Die Geschwindigkeit ändert sich zur Innenseite der Kurve hin, also zeigt die Beschleunigung — und damit die resultierende Kraft — zum Zentrum.');
    const noOut = T(`No force pushes ${acc} outward: there is no “centrifugal force”. ${sc.without}`, `Keine Kraft drückt ${N.acc} nach aussen: Es gibt keine „Zentrifugalkraft“. ${sc.without}`);
    const why = {
      ok: T(`Right: ${sc.force} points to the centre; it provides the net force. ${sc.others}`, `Richtig: ${cap(sc.force)} zeigt zum Zentrum; sie liefert die resultierende Kraft. ${sc.others}`),
      out: T(`${noOut} The force towards the centre is ${sc.force}.`, `${noOut} Die Kraft zum Zentrum ist ${sc.force}.`),
    };
    const questions = [
      q(r, 'net', T(`Which way does the net force on ${acc} point at P?`, `Wohin zeigt die resultierende Kraft auf ${N.acc} im Punkt P?`), [
        o(T('Towards the centre of the circle.', 'Zum Zentrum des Kreises.'), 'ok', T(`Right: ${turns} ${inward}`, `Richtig: ${turns} ${inward}`)),
        o(T(`Forward, along ${its} velocity.`, 'Nach vorn, in Richtung der Geschwindigkeit.'), 'active-force', T(`Moving on needs no force. A net force forward would make ${acc} faster, but ${its} speed stays the same. ${inward}`, `Weiterbewegen braucht keine Kraft. Eine resultierende Kraft nach vorn würde ${N.acc} schneller machen, aber das Tempo bleibt gleich. ${inward}`)),
        o(T('Outward, away from the centre.', 'Nach aussen, weg vom Zentrum.'), 'centrifugal', T(`${noOut} ${inward}`, `${noOut} ${inward}`)),
        o(T(`There is none, since ${its} speed is constant.`, 'Es gibt keine, weil das Tempo konstant ist.'), 'constant-speed', T(`${turns} So ${its} velocity changes, and that takes a net force. ${inward}`, `${turns} Die Geschwindigkeit ändert sich also, und dazu braucht es eine resultierende Kraft. ${inward}`)),
      ]),
      q(r, 'source', T(`Which force provides this net force towards the centre?`, `Welche Kraft liefert diese resultierende Kraft zum Zentrum?`), sc.options(why)),
    ];

    const steps = [
      { title: T('The velocity turns', 'Die Geschwindigkeit dreht sich'), figure: figure({ turn: true, net: true }),
        text: T(`${turns} ${inward} Second law: ${F('net')} = <i>m·a</i>, towards the centre.`, `${turns} ${inward} Zweites Newtonsches Gesetz: ${F('net')} = <i>m·a</i>, zum Zentrum hin.`) },
      { title: T('Which force points there?', 'Welche Kraft zeigt dorthin?'), figure: figure({ force: true }),
        text: T(`List the forces on ${acc}: ${sc.force} (${FS}) points to the centre. ${sc.others} So ${FS} is the net force.`, `Zähle die Kräfte auf ${N.acc} auf: ${cap(sc.force)} (${FS}) zeigt zum Zentrum. ${sc.others} Also ist ${FS} die resultierende Kraft.`) },
      { title: T('Nothing pushes outward', 'Nichts drückt nach aussen'), figure: figure({ force: true, tangent: true }),
        text: T(`The force towards the centre is not an extra force: it is ${sc.force}. ${noOut}`, `Die Kraft zum Zentrum ist keine zusätzliche Kraft: Es ist ${sc.force}. ${noOut}`) },
    ];

    return {
      title: sc.title,
      situation: `<p>${sc.text}</p>`,
      figure: figure(),
      questions,
      hints: [
        T(`${The} keeps ${its} speed. Look at the velocity arrow <i>v</i> at P: a little further round the circle, does it still point the same way?`, `${The} behält ${sein} Tempo. Schau dir den Geschwindigkeitspfeil <i>v</i> in P an: Zeigt er ein Stück weiter auf dem Kreis noch in dieselbe Richtung?`),
        T(`Plan: how the velocity of ${acc} turns at P → direction of the acceleration → direction of the net force (second law) → which of the forces on ${acc} points that way.`, `Plan: Wie sich die Geschwindigkeit ${N.g === 'f' ? 'der' : 'des'} ${N.word}${N.g === 'f' ? '' : 's'} in P dreht → Richtung der Beschleunigung → Richtung der resultierenden Kraft (zweites Gesetz) → welche der Kräfte auf ${N.acc} in diese Richtung zeigt.`),
        T(`At P: ${F('net')} = <i>m·a</i>, with <i>a</i> along the change Δ<i>v</i>. Draw <i>v</i> at P and a moment later from the same point: the arrow from the first tip to the second is Δ<i>v</i>.`, `In P: ${F('net')} = <i>m·a</i>, mit <i>a</i> in Richtung der Änderung Δ<i>v</i>. Zeichne <i>v</i> in P und einen Moment später vom selben Punkt aus: Der Pfeil von der ersten zur zweiten Spitze ist Δ<i>v</i>.`),
        T(`Here: which body pulls or pushes ${acc} towards the centre? ${sc.others}`, `Hier: Welcher Körper zieht oder drückt ${N.acc} zum Zentrum? ${sc.others}`),
      ],
      steps,
    };
  }

  register('inertia', 'balance', balance, { phase: 'constant' });
  register('force', 'balance', balance);
  register('force', 'thruster', thruster);
  register('force', 'two-forces', twoForces);
  register('force', 'centre', centre);
})(typeof window !== 'undefined' ? window : globalThis);
