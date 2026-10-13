// Interaction: two bodies always push or pull on each other with equally large, opposite forces
// (third law), whatever their masses or speeds and whoever “starts”. The effects differ, since
// the same force changes the velocity of a lighter body more. And a balanced pair on one body is
// not an action–reaction pair.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, F, FL, num, qty, cap, noun, o, q, register } = FC;

  // ================================================================ collision: truck and car
  const CASES = ['headon', 'parkedTruck', 'parkedCar', 'rear'];

  function collision(r, p) {
    const kase = p.case || r.pick(CASES);
    const mC = p.mC || r.pick([1, 1.2, 1.5]);
    const k = p.k || r.pick([6, 8, 10, 12]);
    const mT = k * mC;
    const vT = { headon: r.pick([30, 40, 50]), parkedTruck: 0, parkedCar: r.pick([20, 30, 40]), rear: r.pick([60, 70]) }[kase];
    const vC = { headon: r.pick([60, 80, 100]), parkedTruck: r.pick([30, 40, 50]), parkedCar: 0, rear: r.pick([30, 40]) }[kase];
    const t = (m) => qty(m, 't', 3);
    const parked = T('parked', 'parkiert');

    // ---------------------------------------------------------- figure
    function figure(o = {}) {
      const yR = 132;
      let g = D.line(0, yR, 420, yR, 'gline');
      if (o.contact || o.dv) {
        // the car on the left when it ran into a parked truck, otherwise on the right
        const flip = kase === 'parkedTruck', cx = flip ? 220 : 200, dC = flip ? -1 : 1;
        g += flip ? D.car(110, yR, 110) + D.truck(220, yR, 160, -1) : D.truck(40, yR, 160, 1) + D.car(200, yR, 110);
        const cy = yR - 30;
        if (o.contact) {
          g += D.arrow(cx, cy, cx + 52 * dC, cy, 'f', '') + D.words(cx + 56 * dC, 24, T('truck on car', 'Lastwagen → Auto'), flip ? 'end' : 'start') + D.line(cx + 40 * dC, cy - 6, cx + 54 * dC, 28, 'guide');
          g += D.arrow(cx, cy + 12, cx - 52 * dC, cy + 12, 'f', '') + D.words(cx - 56 * dC, 24, T('car on truck', 'Auto → Lastwagen'), flip ? 'start' : 'end') + D.line(cx - 40 * dC, cy + 6, cx - 54 * dC, 28, 'guide');
        }
        if (o.dv) {
          const carMid = flip ? 165 : 255, truckMid = flip ? 300 : 120;
          g += D.arrow(carMid, 32, carMid + 80 * dC, 32, 'v', T('Δv_car', 'Δv_Auto'), { cls: 'alt' });
          g += D.arrow(truckMid, 32, truckMid - Math.max(6, 80 / k) * dC, 32, 'v', T('Δv_truck', 'Δv_LW'), { cls: 'alt', at: [truckMid - (80 / k + 8) * dC, 36], anchor: flip ? 'start' : 'end' });
        }
        return D.svg(420, 150, g, T('Truck and car in contact during the collision', 'Lastwagen und Auto berühren sich während des Zusammenstosses'));
      }
      const truckX = 20, carX = kase === 'headon' || kase === 'parkedTruck' ? 290 : 300;
      const truckFirst = kase !== 'parkedTruck';
      // left vehicle moves right; right vehicle moves left (head-on), is parked, or moves right (rear)
      if (truckFirst) {
        g += D.truck(truckX, yR, 150, 1) + D.car(carX, yR, 100);
        g += D.arrow(truckX + 75, 30, truckX + 75 + 0.6 * vT, 30, 'v', `${vT} km/h`);
        if (vC) g += kase === 'headon' ? D.arrow(carX + 100, 30, carX + 100 - 0.6 * vC, 30, 'v', `${vC} km/h`) : D.arrow(carX + 30, 30, carX + 30 + 0.6 * vC, 30, 'v', `${vC} km/h`);
        else g += D.words(carX + 50, 40, parked);
        g += D.text(truckX + 75, yR + 22, `m = ${num(mT, 3)} t`, 'lbl small') + D.text(carX + 50, yR + 22, `m = ${num(mC, 3)} t`, 'lbl small');
      } else {
        g += D.car(30, yR, 100) + D.truck(250, yR, 150, -1);
        g += D.arrow(70, 30, 70 + 0.8 * vC, 30, 'v', `${vC} km/h`) + D.words(325, 40, parked);
        g += D.text(80, yR + 22, `m = ${num(mC, 3)} t`, 'lbl small') + D.text(325, yR + 22, `m = ${num(mT, 3)} t`, 'lbl small');
      }
      return D.svg(420, 162, g, T('A truck and a car just before they collide', 'Ein Lastwagen und ein Auto kurz vor dem Zusammenstoss'));
    }

    // ---------------------------------------------------------- questions
    const pairWhy = T('Truck and car push on each other: the two forces are an interaction pair, and by the third law they are always equally large and opposite — whatever the masses and speeds, and whether one of them is parked.',
      'Lastwagen und Auto drücken aufeinander: Die beiden Kräfte sind ein Wechselwirkungspaar, und nach dem dritten Newtonschen Gesetz sind sie immer gleich gross und entgegengesetzt — egal, wie gross Massen und Geschwindigkeiten sind und ob eines der beiden parkiert ist.');
    const fopts = [o(T('They are equally large.', 'Sie sind gleich gross.'), 'ok', `${T('Right.', 'Richtig.')} ${pairWhy}`)];
    const massWrong = o(T('The truck pushes harder, because it is heavier.', 'Der Lastwagen drückt stärker, weil er schwerer ist.'), 'mass-wins',
      `${pairWhy} ${T('The heavier truck is just harder to slow down or speed up, so the same force changes its velocity less.', 'Der schwerere Lastwagen ist nur schwerer abzubremsen oder zu beschleunigen, also ändert dieselbe Kraft seine Geschwindigkeit weniger.')}`);
    if (kase === 'headon') {
      fopts.push(massWrong,
        o(T('The car pushes harder, because it is faster.', 'Das Auto drückt stärker, weil es schneller ist.'), 'active-wins',
          `${pairWhy} ${T('Speed does not make a force larger on one side only: if the car is faster, the forces on both sides are larger.', 'Die Geschwindigkeit macht die Kraft nicht nur auf einer Seite grösser: Ist das Auto schneller, sind die Kräfte auf beiden Seiten grösser.')}`),
        o(T('The truck pushes on the car, but the car hardly pushes on the truck.', 'Der Lastwagen drückt auf das Auto, aber das Auto drückt kaum auf den Lastwagen.'), 'mass-wins',
          `${pairWhy} ${T('The force on the truck has a small effect only because the truck has a large mass.', 'Die Kraft auf den Lastwagen hat nur deshalb wenig Wirkung, weil der Lastwagen eine grosse Masse hat.')}`));
    } else if (kase === 'parkedTruck') {
      fopts.push(massWrong,
        o(T('The car pushes harder, because it moves and hits the truck.', 'Das Auto drückt stärker, weil es fährt und den Lastwagen rammt.'), 'active-wins',
          `${pairWhy} ${T('It does not matter who “does” the hitting.', 'Es spielt keine Rolle, wer „rammt“.')}`),
        o(T('The parked truck exerts no force on the car; it is only in the way.', 'Der parkierte Lastwagen übt keine Kraft auf das Auto aus; er steht nur im Weg.'), 'obstacle',
          `${T('The car is stopped (and crumpled) by something: the push of the truck.', 'Etwas stoppt (und verformt) das Auto: die Kraft des Lastwagens.')} ${pairWhy}`));
    } else if (kase === 'parkedCar') {
      fopts.push(o(T('The truck pushes harder, because it is heavier and moving.', 'Der Lastwagen drückt stärker, weil er schwerer ist und fährt.'), 'mass-wins',
        `${pairWhy} ${T('It does not matter who is heavier or who moves.', 'Es spielt keine Rolle, wer schwerer ist oder wer fährt.')}`),
        o(T('The parked car exerts no force on the truck; it is only in the way.', 'Das parkierte Auto übt keine Kraft auf den Lastwagen aus; es steht nur im Weg.'), 'obstacle',
          `${T('The truck is slowed down (a little) by something: the push of the car.', 'Etwas bremst den Lastwagen (ein wenig): die Kraft des Autos.')} ${pairWhy}`),
        o(T('The car pushes harder, because it is pushed away.', 'Das Auto drückt stärker, weil es weggestossen wird.'), 'other',
          `${pairWhy} ${T('The car is pushed away more because it has a smaller mass, not because it pushes harder.', 'Das Auto wird stärker weggestossen, weil es eine kleinere Masse hat, nicht weil es stärker drückt.')}`));
    } else {
      fopts.push(o(T('The truck pushes harder, because it is heavier and faster.', 'Der Lastwagen drückt stärker, weil er schwerer und schneller ist.'), 'mass-wins',
        `${pairWhy} ${T('The truck is just harder to slow down, so the same force changes its velocity less.', 'Der Lastwagen ist nur schwerer abzubremsen, also ändert dieselbe Kraft seine Geschwindigkeit weniger.')}`),
        o(T('The car exerts no force on the truck, since it is driving away from it.', 'Das Auto übt keine Kraft auf den Lastwagen aus, weil es von ihm wegfährt.'), 'obstacle',
          `${T('As long as they touch, the car pushes back on the truck — that is what slows the truck down.', 'Solange sie sich berühren, drückt das Auto auf den Lastwagen zurück — das bremst den Lastwagen.')} ${pairWhy}`),
        o(T('The car pushes harder, because it is pushed forward.', 'Das Auto drückt stärker, weil es nach vorn gestossen wird.'), 'other',
          `${pairWhy} ${T('The car is sped up more because it has a smaller mass, not because it pushes harder.', 'Das Auto wird stärker beschleunigt, weil es eine kleinere Masse hat, nicht weil es stärker drückt.')}`));
    }
    const dvWhy = T(`The same force acts on both for the same time. By the second law, Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i>: the car's mass is ${k} times smaller, so its velocity changes ${k} times as much.`,
      `Dieselbe Kraft wirkt gleich lange auf beide. Nach dem zweiten Newtonschen Gesetz ist Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i>: Die Masse des Autos ist ${k}-mal kleiner, also ändert sich seine Geschwindigkeit ${k}-mal so stark.`);
    const questions = [
      q(r, 'force', T('During the collision, how does the force of the truck on the car compare with the force of the car on the truck?', 'Wie gross ist während des Zusammenstosses die Kraft des Lastwagens auf das Auto im Vergleich zur Kraft des Autos auf den Lastwagen?'), fopts),
      q(r, 'dv', T('Whose velocity changes more during the collision?', 'Wessen Geschwindigkeit ändert sich beim Zusammenstoss stärker?'), [
        o(T(`The car's, about ${k} times as much as the truck's.`, `Die des Autos, etwa ${k}-mal so stark wie die des Lastwagens.`), 'ok', `${T('Right.', 'Richtig.')} ${dvWhy}`),
        o(T('Both change by the same amount, since the forces are equally large.', 'Beide ändern sich gleich stark, da die Kräfte gleich gross sind.'), 'other',
          `${T('Equal forces do not mean equal changes of velocity.', 'Gleiche Kräfte bedeuten nicht gleiche Geschwindigkeitsänderungen.')} ${dvWhy}`),
        o(T(`The truck's, since it ${vT >= vC ? 'is faster' : 'is hit by a faster car'}.`, `Die des Lastwagens, weil ${vT >= vC ? 'er schneller ist' : 'ein schnelleres Auto ihn trifft'}.`), 'other', dvWhy),
        o(T(`The car's, but only a little more than the truck's.`, 'Die des Autos, aber nur wenig stärker als die des Lastwagens.'), 'other', dvWhy),
      ]),
    ];

    const steps = [
      { title: T('An interaction', 'Eine Wechselwirkung'), figure: figure({ contact: true }),
        text: T(`During the collision, truck and car push on each other. The force of the truck on the car and the force of the car on the truck are an interaction pair. Third law: they are equally large and opposite — always, whatever the masses and speeds, and ${kase.startsWith('parked') ? 'even if one vehicle is parked' : 'whoever is faster'}.`,
          `Während des Zusammenstosses drücken Lastwagen und Auto aufeinander. Die Kraft des Lastwagens auf das Auto und die Kraft des Autos auf den Lastwagen sind ein Wechselwirkungspaar. Drittes Newtonsches Gesetz: Sie sind gleich gross und entgegengesetzt — immer, egal wie gross Massen und Geschwindigkeiten sind, und ${kase.startsWith('parked') ? 'auch wenn ein Fahrzeug parkiert ist' : 'egal, wer schneller ist'}.`) },
      { title: T('Different effects', 'Verschiedene Wirkungen'), figure: figure({ dv: true }),
        text: T(`The effects are not the same. Both forces act for the same time Δ<i>t</i>; by the second law Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i>. The car has ${k} times less mass (${t(mC)} vs. ${t(mT)}), so its velocity changes ${k} times as much — that is why the car is damaged more and thrown back, although the forces are equal.`,
          `Die Wirkungen sind nicht gleich. Beide Kräfte wirken gleich lange (Δ<i>t</i>); nach dem zweiten Newtonschen Gesetz ist Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i>. Das Auto hat ${k}-mal weniger Masse (${t(mC)} gegenüber ${t(mT)}), also ändert sich seine Geschwindigkeit ${k}-mal so stark — deshalb wird das Auto stärker beschädigt und zurückgeworfen, obwohl die Kräfte gleich gross sind.`) },
    ];

    const sit = T({
      headon: `A truck (${t(mT)}) at ${vT} km/h and a car (${t(mC)}) at ${vC} km/h collide head-on.`,
      parkedTruck: `A car (${t(mC)}) at ${vC} km/h runs into a parked truck (${t(mT)}).`,
      parkedCar: `A truck (${t(mT)}) at ${vT} km/h runs into a parked car (${t(mC)}).`,
      rear: `A truck (${t(mT)}) at ${vT} km/h runs into the back of a car (${t(mC)}) driving ahead of it at ${vC} km/h.`,
    }[kase], {
      headon: `Ein Lastwagen (${t(mT)}) mit ${vT} km/h und ein Auto (${t(mC)}) mit ${vC} km/h stossen frontal zusammen.`,
      parkedTruck: `Ein Auto (${t(mC)}) fährt mit ${vC} km/h in einen parkierten Lastwagen (${t(mT)}).`,
      parkedCar: `Ein Lastwagen (${t(mT)}) fährt mit ${vT} km/h in ein parkiertes Auto (${t(mC)}).`,
      rear: `Ein Lastwagen (${t(mT)}) fährt mit ${vT} km/h auf ein Auto (${t(mC)}) auf, das mit ${vC} km/h vor ihm fährt.`,
    }[kase]);
    return {
      title: T('Truck and car', 'Lastwagen und Auto'),
      situation: `<p>${sit}</p>`,
      figure: figure(),
      questions,
      hints: [
        T(`During the collision, which forces act between the two vehicles? Name for each force who exerts it and on whom.`, 'Welche Kräfte wirken während des Zusammenstosses zwischen den beiden Fahrzeugen? Gib für jede Kraft an, wer sie auf wen ausübt.'),
        T(`Plan: the force of the truck on the car and the force of the car on the truck form an interaction pair — use the third law. For the velocity changes use the second law for each vehicle.`,
          'Plan: Die Kraft des Lastwagens auf das Auto und die Kraft des Autos auf den Lastwagen bilden ein Wechselwirkungspaar — wende das dritte Newtonsche Gesetz an. Für die Geschwindigkeitsänderungen wende das zweite Gesetz auf jedes Fahrzeug an.'),
        T(`Recall the third law: what does it say about the sizes and directions of <i>F</i><sub>truck on car</sub> and <i>F</i><sub>car on truck</sub>? For the velocities, the second law gives Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i>.`,
          'Erinnere dich an das dritte Gesetz: Was sagt es über Grösse und Richtung von <i>F</i><sub>Lastwagen→Auto</sub> und <i>F</i><sub>Auto→Lastwagen</sub>? Für die Geschwindigkeiten liefert das zweite Gesetz Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i>.'),
        T(`Here the truck has ${k} times the mass of the car${kase.startsWith('parked') ? ', and one of them is parked' : ''}. Do masses or speeds appear anywhere in the third law? Then apply Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i> to each vehicle.`,
          `Hier hat der Lastwagen die ${k}-fache Masse des Autos${kase.startsWith('parked') ? ', und eines der beiden ist parkiert' : ''}. Kommen Massen oder Geschwindigkeiten im dritten Gesetz vor? Wende dann Δ<i>v</i> = <i>F</i>·Δ<i>t</i>/<i>m</i> auf jedes Fahrzeug an.`),
      ],
      steps,
    };
  }

  // ================================================================ pushApart: two skaters
  const NAMES = ['Anna', 'Ben', 'Mia', 'Leo', 'Sara', 'Tom', 'Lena', 'Noah', 'Eva', 'Jonas'];
  const MASSES = [[40, 80], [45, 90], [50, 75], [60, 90], [40, 60], [50, 100]];

  function pushApart(r, p) {
    const pool = r.shuffle(NAMES), [nL, nR] = p.names || [pool[0], pool[1]];
    const pair = p.masses || r.pick(MASSES);
    const [mL, mR] = p.masses ? pair : r.next() < 0.5 ? pair : [pair[1], pair[0]];
    const pusherLeft = p.pusherLeft != null ? p.pusherLeft : r.next() < 0.5;
    const pusher = pusherLeft ? nL : nR, passive = pusherLeft ? nR : nL;
    const heavy = mL > mR ? nL : nR, light = mL > mR ? nR : nL;
    const k = Math.max(mL, mR) / Math.min(mL, mR);
    const on = (a, b) => T(`${a} on ${b}`, `${a} → ${b}`);

    // ---------------------------------------------------------- figure
    const hL = 96 + (mL - 40) * 0.6, hR = 96 + (mR - 40) * 0.6, yI = 186;
    const armL = pusherLeft ? 0.36 * hL : 0.3 * hL, armR = pusherLeft ? 0.3 * hR : 0.36 * hR;
    const xL = 170 - armL, xR = 172 + armR, cx = 171;
    const contactY = yI - 0.72 * (pusherLeft ? hL : hR);
    function figure(o = {}) {
      let g = D.rect(0, yI, 360, 12, 'ice', 0) + D.line(0, yI, 360, yI, 'gline');
      const sL = o.after ? 70 * (mR / (mL + mR)) : 0, sR = o.after ? 70 * (mL / (mL + mR)) : 0; // drift apart, lighter one farther
      const pL = xL - sL, pR = xR + sR;
      g += D.person(pL, yI, hL, 1, o.after ? 'down' : pusherLeft ? 'push' : 'hold', true);
      g += D.person(pR, yI, hR, -1, o.after ? 'down' : pusherLeft ? 'hold' : 'push', true);
      g += D.words(pL + 10, yI - hL - 8, `${nL}, ${mL} kg`, 'end') + D.words(pR - 10, yI - hR - 8, `${nR}, ${mR} kg`, 'start');
      if (o.forces) {
        g += D.arrow(cx, contactY + 8, cx + 56, contactY + 8, 'f', '') + D.line(cx + 50, contactY + 14, cx + 70, yI + 14, 'guide') + D.words(cx + 72, yI + 26, on(nL, nR), 'start');
        g += D.arrow(cx, contactY - 6, cx - 56, contactY - 6, 'f', '') + D.line(cx - 50, contactY, cx - 70, yI + 14, 'guide') + D.words(cx - 72, yI + 26, on(nR, nL), 'end');
      }
      if (o.after) {
        const vL = 70 * Math.min(1, mR / mL), vR = 70 * Math.min(1, mL / mR);
        g += D.arrow(pL - 6, 26, pL - 6 - vL, 26, 'v', '') + D.arrow(pR + 6, 26, pR + 6 + vR, 26, 'v', '');
      }
      return D.svg(360, 222, g, T(`${nL} and ${nR} on skates, ${pusher} pushing`, `${nL} und ${nR} auf Schlittschuhen, ${pusher} stösst`));
    }

    // ---------------------------------------------------------- questions
    const pairWhy = T(`${pusher} pushes on ${passive}, and ${passive} pushes back on ${pusher}: an interaction pair. Third law: both forces are equally large and opposite — no matter who is heavier or who “does” the pushing.`,
      `${pusher} drückt auf ${passive}, und ${passive} drückt auf ${pusher} zurück: ein Wechselwirkungspaar. Drittes Newtonsches Gesetz: Beide Kräfte sind gleich gross und entgegengesetzt — egal, wer schwerer ist oder wer „stösst“.`);
    const ratio = num(k), mMax = Math.max(mL, mR), mMin = Math.min(mL, mR);
    const questions = [
      q(r, 'force', T(`While their hands touch, how does the force of ${pusher} on ${passive} compare with the force of ${passive} on ${pusher}?`,
        `Wie gross ist, solange sich die Hände berühren, die Kraft von ${pusher} auf ${passive} im Vergleich zur Kraft von ${passive} auf ${pusher}?`), [
        o(T('They are equally large.', 'Sie sind gleich gross.'), 'ok', `${T('Right.', 'Richtig.')} ${pairWhy}`),
        o(T(`${pusher}'s force is larger, since ${pusher} does the pushing.`, `Die Kraft von ${pusher} ist grösser, weil ${pusher} stösst.`), 'active-wins',
          `${pairWhy} ${T(`${passive}'s arms are pressed together a little and push back, like a stiff spring.`, `Die Arme von ${passive} werden ein wenig zusammengedrückt und drücken zurück, wie eine steife Feder.`)}`),
        o(T(`${heavy}'s force is larger, since ${heavy} is heavier.`, `Die Kraft von ${heavy} ist grösser, weil ${heavy} schwerer ist.`), 'mass-wins', pairWhy),
        o(T(`${passive} exerts no force on ${pusher}, since ${passive} only holds still.`, `${passive} übt keine Kraft auf ${pusher} aus, weil ${passive} nur stillhält.`), 'obstacle',
          `${T(`${pusher} also starts moving backward — something must push ${pusher}: ${passive}'s hands.`, `Auch ${pusher} beginnt sich rückwärts zu bewegen — etwas muss ${pusher} stossen: die Hände von ${passive}.`)} ${pairWhy}`),
      ]),
      q(r, 'speed', T('How do their speeds compare after they have let go?', 'Wie verhalten sich ihre Geschwindigkeiten, nachdem sie sich losgelassen haben?'), [
        o(T(`${light} is about ${ratio} times as fast as ${heavy}.`, `${light} ist etwa ${ratio}-mal so schnell wie ${heavy}.`), 'ok',
          T(`Right: equal forces for the same time; by the second law the lighter one gets ${ratio} times the acceleration, so ${ratio} times the speed: <i>v</i><sub>${light}</sub>/<i>v</i><sub>${heavy}</sub> = ${mMax}/${mMin}.`,
            `Richtig: gleiche Kräfte, gleich lange; nach dem zweiten Newtonschen Gesetz bekommt die leichtere Person die ${ratio}-fache Beschleunigung, also die ${ratio}-fache Geschwindigkeit: <i>v</i><sub>${light}</sub>/<i>v</i><sub>${heavy}</sub> = ${mMax}/${mMin}.`)),
        o(T('Both are equally fast.', 'Beide sind gleich schnell.'), 'other',
          T(`The forces are equal, but the masses are not: the same force gives the lighter one the larger acceleration (<i>a</i> = <i>F</i>/<i>m</i>), so ${light} gets faster.`,
            `Die Kräfte sind gleich, die Massen aber nicht: Dieselbe Kraft gibt der leichteren Person die grössere Beschleunigung (<i>a</i> = <i>F</i>/<i>m</i>), also wird ${light} schneller.`)),
        o(T(`Only ${passive} moves; ${pusher} stays in place.`, `Nur ${passive} bewegt sich; ${pusher} bleibt an Ort.`), 'obstacle',
          T(`${passive} pushes back on ${pusher} with the same force, so ${pusher} moves too — backward.`, `${passive} drückt mit derselben Kraft auf ${pusher} zurück, also bewegt sich auch ${pusher} — rückwärts.`)),
        o(T(`${heavy} is faster.`, `${heavy} ist schneller.`), 'other',
          T(`The same force gives the heavier one the smaller acceleration (<i>a</i> = <i>F</i>/<i>m</i>), so ${heavy} gets the smaller speed.`,
            `Dieselbe Kraft gibt der schwereren Person die kleinere Beschleunigung (<i>a</i> = <i>F</i>/<i>m</i>), also bekommt ${heavy} die kleinere Geschwindigkeit.`)),
      ]),
    ];

    const steps = [
      { title: T('An interaction', 'Eine Wechselwirkung'), figure: figure({ forces: true }),
        text: T(`While their hands touch, ${pusher} pushes on ${passive} and ${passive} pushes on ${pusher}. Third law: these two forces are equally large and opposite. ${passive} does not need to “do” anything: ${passive}'s arms are pressed together a little and push back, like a stiff spring — just as a wall pushes back when you push it.`,
          `Solange sich die Hände berühren, drückt ${pusher} auf ${passive} und ${passive} auf ${pusher}. Drittes Newtonsches Gesetz: Diese beiden Kräfte sind gleich gross und entgegengesetzt. ${passive} muss dafür nichts „tun“: Die Arme von ${passive} werden ein wenig zusammengedrückt und drücken zurück wie eine steife Feder — genau wie eine Wand zurückdrückt, wenn man gegen sie drückt.`) },
      { title: T('After the push', 'Nach dem Stoss'), figure: figure({ after: true }),
        text: T(`Both forces act for the same time. Second law: <i>a</i> = <i>F</i>/<i>m</i>, so ${light} (${mMin} kg) gets ${ratio} times the acceleration of ${heavy} (${mMax} kg), and ${ratio} times the speed. They glide apart in opposite directions.`,
          `Beide Kräfte wirken gleich lange. Zweites Newtonsches Gesetz: <i>a</i> = <i>F</i>/<i>m</i>, also bekommt ${light} (${mMin} kg) die ${ratio}-fache Beschleunigung von ${heavy} (${mMax} kg) und damit die ${ratio}-fache Geschwindigkeit. Die beiden gleiten in entgegengesetzte Richtungen auseinander.`) },
    ];

    return {
      title: T('On the ice', 'Auf dem Eis'),
      situation: T(`<p>${nL} (${mL} kg) and ${nR} (${mR} kg) stand on ice skates, face to face and at rest. ${pusher} pushes ${passive} away with both hands, while ${passive} just keeps the arms stiff. Friction on the ice is negligible.</p>`,
        `<p>${nL} (${mL} kg) und ${nR} (${mR} kg) stehen auf Schlittschuhen ruhig einander gegenüber. ${pusher} stösst ${passive} mit beiden Händen weg, während ${passive} nur die Arme steif hält. Die Reibung auf dem Eis ist vernachlässigbar.</p>`),
      figure: figure(),
      questions,
      hints: [
        T(`While their hands touch: which force acts on ${passive}, and which on ${pusher}? Who exerts each one?`, `Solange sich die Hände berühren: Welche Kraft wirkt auf ${passive}, welche auf ${pusher}? Wer übt jede davon aus?`),
        T(`Plan: the two forces form an interaction pair → third law. For the speeds, use the second law for each skater; the push lasts equally long for both.`,
          'Plan: Die beiden Kräfte bilden ein Wechselwirkungspaar → drittes Newtonsches Gesetz. Für die Geschwindigkeiten wende das zweite Gesetz auf jede Person an; der Stoss dauert für beide gleich lang.'),
        T(`Recall the third law: how do <i>F</i><sub>${pusher} on ${passive}</sub> and <i>F</i><sub>${passive} on ${pusher}</sub> compare in size and direction? Does it matter who pushes? Second law: <i>a</i> = <i>F</i>/<i>m</i>.`,
          `Erinnere dich an das dritte Gesetz: Wie verhalten sich <i>F</i><sub>${pusher}→${passive}</sub> und <i>F</i><sub>${passive}→${pusher}</sub> in Grösse und Richtung? Spielt es eine Rolle, wer stösst? Zweites Gesetz: <i>a</i> = <i>F</i>/<i>m</i>.`),
        T(`Here ${heavy} has ${ratio} times the mass of ${light}. Once you know how the two forces compare, apply <i>a</i> = <i>F</i>/<i>m</i> to each skater.`,
          `Hier hat ${heavy} die ${ratio}-fache Masse von ${light}. Wenn du weisst, wie sich die beiden Kräfte verhalten, wende <i>a</i> = <i>F</i>/<i>m</i> auf jede Person an.`),
      ],
      steps,
    };
  }

  // ================================================================ pushCar: car pushes a van
  function pushCar(r, p) {
    const phase = p.phase || r.pick(['speeding', 'constant', 'slowing']);
    const mC = p.mC || r.pick([1, 1.2]), mV = p.mV || r.pick([2, 2.5, 3]);
    const acc = { speeding: 1, constant: 0, slowing: -1 }[phase];
    const does = T({ speeding: 'speeds up', constant: 'moves at constant speed', slowing: 'slows down' }[phase],
      { speeding: 'wird schneller', constant: 'bewegt sich mit konstanter Geschwindigkeit', slowing: 'wird langsamer' }[phase]);
    const Fpush = F('push'), FRv = F('R');
    const fwd = T('forward', 'nach vorn'), back = T('backward', 'nach hinten');

    function figure(o = {}) {
      const yR = 150;
      let g = D.line(0, yR, 420, yR, 'gline');
      g += D.car(96, yR, 110) + D.truck(206, yR, 150, 1, 0.46);
      g += D.text(151, yR + 22, `m = ${num(mC, 3)} t`, 'lbl small') + D.text(281, yR + 22, `m = ${num(mV, 3)} t`, 'lbl small');
      g += D.arrow(20, 24, 70, 24, 'm', '', { head: 8 }) + D.words(78, 28, T({ speeding: 'speeding up', constant: 'constant speed', slowing: 'slowing down' }[phase], { speeding: 'werden schneller', constant: 'konstante Geschwindigkeit', slowing: 'werden langsamer' }[phase]), 'start');
      const cy = yR - 30;
      if (o.pair) {
        g += D.arrow(206, cy, 256, cy, 'f', '') + D.line(246, cy - 6, 262, 56, 'guide') + D.words(264, 50, T('car on van', 'Auto → Lieferwagen'), 'start');
        g += D.arrow(206, cy + 12, 156, cy + 12, 'f', '') + D.line(166, cy + 6, 150, 56, 'guide') + D.words(148, 50, T('van on car', 'Lieferwagen → Auto'), 'end');
      }
      if (o.van) {
        // free-body sketch of the van above it
        const Lp = 46, Lr = 46 - 16 * acc, vx = 300, vy = 46;
        g += D.dot(vx, vy, 4, 'pt') + D.words(vx, vy + 22, T('forces on the van', 'Kräfte auf den Lieferwagen'));
        g += D.arrow(vx, vy, vx + Lp, vy, 'f', FL('push'), { at: [vx + Lp + 4, vy + 5], anchor: 'start' });
        g += D.arrow(vx, vy, vx - Lr, vy, 'f', FL('R'), { at: [vx - Lr - 4, vy + 5], anchor: 'end' });
      }
      return D.svg(420, 176, g, T('A car pushing a van along a level road', 'Ein Auto schiebt einen Lieferwagen auf einer ebenen Strasse'));
    }

    const pairWhy = T('The car pushes on the van and the van pushes back on the car: an interaction pair. Third law: always equally large and opposite — while speeding up, at constant speed and while slowing down.',
      'Das Auto drückt auf den Lieferwagen, und der Lieferwagen drückt auf das Auto zurück: ein Wechselwirkungspaar. Drittes Newtonsches Gesetz: immer gleich gross und entgegengesetzt — beim Schnellerwerden, bei konstanter Geschwindigkeit und beim Bremsen.');
    const rel = (c) => (c > 0 ? T('larger than', 'grösser als') : c < 0 ? T('smaller than', 'kleiner als') : T('equal to', 'gleich gross wie'));
    const eff = (c) => (c > 0 ? T('speed up', 'schneller werden') : c < 0 ? T('slow down', 'langsamer werden') : T('move at constant speed', 'sich mit konstanter Geschwindigkeit bewegen'));
    const vanOpt = (c) => {
      const label = T(`${Fpush} is ${rel(c)} ${FRv}.`, `${Fpush} ist ${rel(c)} ${FRv}.`);
      if (c === acc) return o(label, 'ok', T(`Right: the van ${does}, so the net force on it ${acc ? `points ${acc > 0 ? fwd : back}` : 'is zero'}.`, `Richtig: Der Lieferwagen ${does}, also ist die resultierende Kraft auf ihn ${acc ? `${acc > 0 ? fwd : back} gerichtet` : 'null'}.`));
      const misled = c > 0;
      return o(label, misled ? 'active-force' : 'other',
        (misled ? T('Moving forward does not need a net force forward. ', 'Um sich vorwärts zu bewegen, braucht es keine resultierende Kraft nach vorn. ') : '') +
        T(`If ${Fpush} were ${rel(c)} ${FRv}, the van would ${eff(c)}. But it ${does}.`, `Wäre ${Fpush} ${rel(c)} ${FRv}, würde der Lieferwagen ${eff(c)}. Aber er ${does}.`));
    };
    const questions = [
      q(r, 'pair', T('How does the force of the car on the van compare with the force of the van on the car?', 'Wie gross ist die Kraft des Autos auf den Lieferwagen im Vergleich zur Kraft des Lieferwagens auf das Auto?'), [
        o(T('They are equally large.', 'Sie sind gleich gross.'), 'ok', `${T('Right.', 'Richtig.')} ${pairWhy}`),
        o(T('The car pushes harder, otherwise the van would not move.', 'Das Auto drückt stärker, sonst würde sich der Lieferwagen nicht bewegen.'), 'active-wins',
          `${pairWhy} ${T(`Whether the van ${phase === 'speeding' ? 'speeds up' : 'keeps moving'} depends on the forces on the van alone: the car's push against the resistance on the van.`,
            `Ob der Lieferwagen ${phase === 'speeding' ? 'schneller wird' : 'weiterfährt'}, hängt nur von den Kräften auf den Lieferwagen ab: der Kraft des Autos gegen den Fahrwiderstand des Lieferwagens.`)}`),
        o(T('The van pushes harder, since it is heavier.', 'Der Lieferwagen drückt stärker, weil er schwerer ist.'), 'mass-wins', pairWhy),
        o(T('The van exerts no force on the car; it is only pushed.', 'Der Lieferwagen übt keine Kraft auf das Auto aus; er wird nur geschoben.'), 'obstacle',
          `${T('The van does push back: that is why the car needs more driving force than it would need on its own.', 'Der Lieferwagen drückt sehr wohl zurück: Deshalb braucht das Auto mehr Antriebskraft, als es allein bräuchte.')} ${pairWhy}`),
      ]),
      q(r, 'van', T(`How does the push of the car on the van (${Fpush}) compare with the resistance on the van (${FRv}: friction, rolling and air resistance)?`,
        `Wie gross ist die Kraft des Autos auf den Lieferwagen (${Fpush}) im Vergleich zum Fahrwiderstand des Lieferwagens (${FRv}: Reibung, Roll- und Luftwiderstand)?`), [1, 0, -1].map(vanOpt)),
    ];

    const steps = [
      { title: T('The pair', 'Das Paar'), figure: figure({ pair: true }),
        text: `${pairWhy} ${T('The two forces act on different bodies — one on the van, one on the car — so they never cancel each other.', 'Die beiden Kräfte wirken auf verschiedene Körper — eine auf den Lieferwagen, eine auf das Auto —, also heben sie sich nie gegenseitig auf.')}` },
      { title: T('Forces on the van', 'Kräfte auf den Lieferwagen'), figure: figure({ van: true }),
        text: T(`How the van moves depends only on the forces on the van: the push ${Fpush} of the car forward and the resistance ${FRv} backward (its weight and the push of the road cancel). The van ${does}, so ${acc ? `${Fpush} ${acc > 0 ? '>' : '<'} ${FRv}` : `${Fpush} = ${FRv}`}.`,
          `Wie sich der Lieferwagen bewegt, hängt nur von den Kräften auf den Lieferwagen ab: der Kraft ${Fpush} des Autos nach vorn und dem Fahrwiderstand ${FRv} nach hinten (Gewichtskraft und Normalkraft der Strasse heben sich auf). Der Lieferwagen ${does}, also ${acc ? `${Fpush} ${acc > 0 ? '>' : '<'} ${FRv}` : `${Fpush} = ${FRv}`}.`) },
    ];

    return {
      title: T('Pushing a van', 'Einen Lieferwagen schieben'),
      situation: T(`<p>A van (${qty(mV, 't', 3)}) with a broken engine is pushed along a level road by a car (${qty(mC, 't', 3)}). ${{ speeding: 'The two are speeding up.', constant: 'The two move at constant speed.', slowing: 'The driver of the car brakes gently; the two slow down while still touching.' }[phase]}</p>`,
        `<p>Ein Lieferwagen (${qty(mV, 't', 3)}) mit defektem Motor wird von einem Auto (${qty(mC, 't', 3)}) auf einer ebenen Strasse geschoben. ${{ speeding: 'Die beiden werden schneller.', constant: 'Die beiden fahren mit konstanter Geschwindigkeit.', slowing: 'Die Fahrerin des Autos bremst sanft; die beiden werden langsamer und berühren sich dabei weiterhin.' }[phase]}</p>`),
      figure: figure(),
      questions,
      hints: [
        T(`Name the forces: which force acts on the van, which on the car? Which two of them form an interaction pair?`, 'Benenne die Kräfte: Welche Kraft wirkt auf den Lieferwagen, welche auf das Auto? Welche zwei davon bilden ein Wechselwirkungspaar?'),
        T(`Plan: for the pair, use the third law. For the motion of the van, use the second law with the forces acting on the van only.`, 'Plan: Für das Paar gilt das dritte Newtonsche Gesetz. Für die Bewegung des Lieferwagens wende das zweite Gesetz an, nur mit den Kräften auf den Lieferwagen.'),
        T(`Recall the third law: how do <i>F</i><sub>car on van</sub> and <i>F</i><sub>van on car</sub> compare? Second law for the van: ${Fpush} − ${FRv} = <i>m</i><sub>van</sub>·<i>a</i>.`,
          `Erinnere dich an das dritte Gesetz: Wie verhalten sich <i>F</i><sub>Auto→Lieferwagen</sub> und <i>F</i><sub>Lieferwagen→Auto</sub>? Zweites Gesetz für den Lieferwagen: ${Fpush} − ${FRv} = <i>m</i><sub>LW</sub>·<i>a</i>.`),
        T(`Here the van ${does}. What does that tell you about its acceleration? And on which bodies do the two forces of the pair act: can they cancel each other?`,
          `Hier ${does} der Lieferwagen. Was sagt dir das über seine Beschleunigung? Und auf welche Körper wirken die beiden Kräfte des Paars: Können sie sich gegenseitig aufheben?`),
      ],
      steps,
    };
  }

  // ================================================================ support: resting or hanging
  // English names; German: [gender, noun, genitive with article].
  const RESTING = [['book', 'table'], ['vase', 'shelf'], ['box', 'floor'], ['laptop', 'desk']];
  const HANGING = [['lamp', 'cord'], ['plant pot', 'rope']];
  const DE = {
    book: ['n', 'Buch'], vase: ['f', 'Vase'], box: ['f', 'Kiste'], laptop: ['m', 'Laptop'], lamp: ['f', 'Lampe'], 'plant pot': ['m', 'Blumentopf'],
    table: ['m', 'Tisch', 'des Tisches'], shelf: ['n', 'Regal', 'des Regals'], floor: ['m', 'Boden', 'des Bodens'], desk: ['n', 'Pult', 'des Pults'],
    cord: ['n', 'Kabel', 'des Kabels'], rope: ['n', 'Seil', 'des Seils'],
  };

  function support(r, p) {
    const hang = (p.variant || r.pick(['rest', 'hang'])) === 'hang';
    const [obj, sup] = p.pair || r.pick(hang ? HANGING : RESTING);
    const ask = p.ask || r.pick(['weight', 'support']);
    const O = noun(DE[obj][0], DE[obj][1]), S = noun(DE[sup][0], DE[sup][1]), Sgen = DE[sup][2];
    const FG = F('G'), FS = hang ? F('T') : F('N'), Ssym = hang ? FL('T') : FL('N');
    const supName = hang ? T(`the pull of the ${sup}`, `die Kraft ${Sgen}`) : T(`the push of the ${sup}`, `die Normalkraft ${Sgen}`);
    const onWord = (a, b) => T(`${a} on ${b}`, `${a} → ${b}`);
    const pushDown = T(`${hang ? 'pulls the ' + sup + ' down' : 'pushes the ' + sup + ' down'}`, `${hang ? 'zieht' : 'drückt'} ${S.acc} nach unten`);
    const supUp = T(`${hang ? 'pulls it up' : 'pushes it up'}`, `${hang ? 'zieht' : 'drückt'} ${O.ihn} nach oben`);
    const stretched = hang ? T('stretched', 'gedehnt') : T('pressed together', 'zusammengedrückt');

    // ---------------------------------------------------------- figure
    function figure(o = {}) {
      let g = '';
      let cx, cy, top, bottom, half = 0;
      if (hang) {
        g += D.ceiling(110, 250, 18) + D.line(180, 18, 180, 104, 'cable');
        if (obj === 'lamp') g += `<polygon class="obj" points="164,104 196,104 214,140 146,140"/>` + D.ball(180, 144, 6, 'lit');
        else g += `<polygon class="obj" points="156,104 204,104 196,146 164,146"/>` + D.line(156, 104, 180, 90, 'thin') + D.line(204, 104, 180, 90, 'thin');
        cx = 180; cy = 124; top = 104; bottom = 146;
      } else {
        const floor = sup === 'floor';
        const ty = floor ? 150 : 120;
        g += D.ground(30, 330, floor ? 150 : 190);
        if (!floor) g += sup === 'shelf' ? D.rect(110, ty, 140, 8, 'solid', 1) + D.line(110, ty + 8, 110, 60, 'gline') : D.table(100, ty, 160, 190);
        const h = obj === 'book' ? 14 : obj === 'laptop' ? 8 : obj === 'vase' ? 40 : 34, w = obj === 'vase' ? 26 : obj === 'box' ? 46 : 54;
        g += obj === 'vase' ? `<path class="obj" d="M${180 - 10} ${ty} Q${180 - 20} ${ty - 22} ${180 - 6} ${ty - h} H${180 + 6} Q${180 + 20} ${ty - 22} ${180 + 10} ${ty} Z"/>` : D.rect(180 - w / 2, ty - h, w, h, 'obj', 2);
        cx = 180; cy = ty - h / 2; top = ty - h; bottom = ty; half = w / 2;
      }
      // Leave room for the partner arrow, which starts where the object touches its support.
      const px = cx + Math.min(20, half - 2), gx = hang ? cx + 14 : Math.min(cx + 8, px - 12);
      if (o.forces) {
        g += D.arrow(gx, cy, gx, cy + 50, 'f', 'F_G', hang ? { at: [gx + 8, cy + 48], anchor: 'start' } : { at: [gx - 8, cy + 48], anchor: 'end' });
        g += hang ? D.arrow(cx - 8, top + 4, cx - 8, top - 42, 'f', Ssym, { at: [cx - 16, top - 30], anchor: 'end' }) : D.arrow(cx - 8, bottom, cx - 8, bottom - 50 - (bottom - top), 'f', Ssym, { at: [cx - 16, top - 28], anchor: 'end' });
      }
      if (o.partners) {
        const oName = T(obj, O.word), sName = T(sup, S.word);
        if (ask === 'weight') g += D.arrow(70, hang ? 232 : obj === 'box' ? 150 : 190, 70, hang ? 186 : obj === 'box' ? 104 : 144, 'f', '', { cls: 'pair' }) + D.words(78, hang ? 206 : obj === 'box' ? 126 : 166, onWord(oName, T('Earth', 'Erde')), 'start');
        else g += hang ? D.arrow(cx, obj === 'lamp' ? top : 90, cx, top + 30, 'f', '', { cls: 'pair' }) + D.words(cx - 26, top + 58, onWord(oName, sName), 'end')
          : D.arrow(px, bottom, px, bottom + 40, 'f', '', { cls: 'pair' }) + D.words(cx + 40, bottom + 30, onWord(oName, sName), 'start');
      }
      if (hang) g += D.ground(30, 330, 232);
      return D.svg(360, hang ? 248 : 206, g, hang ? T(`A ${obj} hanging from a ${sup}`, `${cap(O.ein)} hängt an ${S.einem}`) : T(`A ${obj} resting on a ${sup}`, `${cap(O.ein)} liegt auf ${S.einem}`));
    }

    // ---------------------------------------------------------- questions
    const balanced = T(`The ${obj} is at rest, so the net force on it is zero: ${FS} = ${FG}.`, `${cap(O.nom)} ist in Ruhe, also ist die resultierende Kraft null: ${FS} = ${FG}.`);
    const questions = [
      q(r, 'forces', T(`Which forces act on the ${obj}?`, `Welche Kräfte wirken auf ${O.acc}?`), [
        o(T(`Its weight ${FG} downward and ${supName} upward, equally large.`, `Die Gewichtskraft ${FG} nach unten und ${supName} nach oben, gleich gross.`), 'ok',
          T(`Right: the Earth pulls the ${obj} down, the ${sup} ${supUp}. ${balanced}`, `Richtig: Die Erde zieht ${O.acc} nach unten, ${S.nom} ${supUp}. ${balanced}`)),
        o(hang ? T(`Only its weight; the ${sup} is just attached and does not pull.`, `Nur die Gewichtskraft; ${S.nom} ist nur befestigt und zieht nicht.`)
          : T(`Only its weight; the ${sup} is just in the way and does not push.`, `Nur die Gewichtskraft; ${S.nom} ist nur im Weg und drückt nicht.`), 'obstacle',
        T(`If only the weight acted, the ${obj} would fall. The ${sup} is ${stretched} a tiny bit, and ${hang ? 'pulls' : 'pushes'} back like a very stiff spring. ${balanced}`,
          `Wirkte nur die Gewichtskraft, würde ${O.nom} fallen. ${cap(S.nom)} wird ein klein wenig ${stretched} und ${hang ? 'zieht' : 'drückt'} zurück wie eine sehr steife Feder. ${balanced}`)),
        o(T(`Its weight and ${supName} upward, which is larger than the weight.`, `Die Gewichtskraft und ${supName} nach oben, die grösser ist als die Gewichtskraft.`), 'other',
          T(`Then the net force would point up and the ${obj} would start moving up. ${balanced}`, `Dann würde die resultierende Kraft nach oben zeigen, und ${O.nom} würde sich nach oben in Bewegung setzen. ${balanced}`)),
        o(T(`No force at all, since it is at rest.`, `Gar keine Kraft, weil ${O.er} in Ruhe ist.`), 'rest-no-force',
          T(`At rest means the forces balance, not that there are none: the Earth still pulls the ${obj} down. ${balanced}`, `In Ruhe heisst, dass sich die Kräfte aufheben, nicht dass es keine gibt: Die Erde zieht ${O.acc} weiterhin nach unten. ${balanced}`)),
      ]),
    ];
    if (ask === 'weight') {
      questions.push(q(r, 'partner', T(`The Earth pulls the ${obj} down (its weight ${FG}). What is the third-law partner of this force?`, `Die Erde zieht ${O.acc} nach unten (Gewichtskraft ${FG}). Was ist die Gegenkraft nach dem dritten Newtonschen Gesetz?`), [
        o(T(`The ${obj} pulls the Earth up, just as strongly.`, `${cap(O.nom)} zieht die Erde nach oben, genauso stark.`), 'ok',
          T(`Right: the interaction is between the Earth and the ${obj}, so the partner is the pull of the ${obj} on the Earth. It is equally large, but the Earth's huge mass means it has no noticeable effect.`,
            `Richtig: Die Wechselwirkung besteht zwischen der Erde und ${O.dat}, also ist die Gegenkraft die Anziehung der Erde durch ${O.acc}. Sie ist gleich gross, hat aber wegen der riesigen Masse der Erde keine spürbare Wirkung.`)),
        o(T(`${hang ? 'The ' + sup + ' pulls' : 'The ' + sup + ' pushes'} the ${obj} up.`, `${cap(S.nom)} ${hang ? 'zieht' : 'drückt'} ${O.acc} nach oben.`), 'pair-confusion',
          T(`That force also acts on the ${obj}: it balances the weight, but it is not its partner. Third-law partners act on two different bodies — here the Earth and the ${obj}.`,
            `Diese Kraft wirkt auch auf ${O.acc}: Sie hält der Gewichtskraft das Gleichgewicht, ist aber nicht ihre Gegenkraft. Kraft und Gegenkraft wirken auf zwei verschiedene Körper — hier die Erde und ${O.acc}.`)),
        o(T(`The ${obj} ${pushDown}.`, `${cap(O.nom)} ${pushDown}.`), 'pair-confusion',
          T(`That is a contact force between the ${obj} and the ${sup}: it is the partner of ${supName} on the ${obj}, not of the weight. The weight is an interaction between the Earth and the ${obj}.`,
            `Das ist eine Kontaktkraft zwischen ${O.dat} und ${S.dat}: Sie ist die Gegenkraft zur ${hang ? 'Kraft' : 'Normalkraft'} ${Sgen}, nicht zur Gewichtskraft. Die Gewichtskraft ist eine Wechselwirkung zwischen der Erde und ${O.dat}.`)),
        o(T(`There is none: the ${obj} is far too small to pull on the Earth.`, `Es gibt keine: ${cap(O.nom)} ist viel zu klein, um an der Erde zu ziehen.`), 'mass-wins',
          T(`Every force has a partner of the same size. The ${obj} pulls the Earth up with ${FG}; the Earth just does not notice, because its mass is so large.`,
            `Jede Kraft hat eine gleich grosse Gegenkraft. ${cap(O.nom)} zieht die Erde mit ${FG} nach oben; die Erde merkt das nur nicht, weil ihre Masse so gross ist.`)),
      ]));
    } else {
      questions.push(q(r, 'partner', T(`The ${sup} ${hang ? 'pulls' : 'pushes'} the ${obj} up (${FS}). What is the third-law partner of this force?`, `${cap(S.nom)} ${hang ? 'zieht' : 'drückt'} ${O.acc} nach oben (${FS}). Was ist die Gegenkraft nach dem dritten Newtonschen Gesetz?`), [
        o(T(`The ${obj} ${pushDown}, just as strongly.`, `${cap(O.nom)} ${pushDown}, genauso stark.`), 'ok',
          T(`Right: the interaction is between the ${sup} and the ${obj}, so the partner is the force of the ${obj} on the ${sup}.`, `Richtig: Die Wechselwirkung besteht zwischen ${S.dat} und ${O.dat}, also ist die Gegenkraft die Kraft von ${O.dat} auf ${S.acc}.`)),
        o(T(`The weight of the ${obj}: the Earth pulls it down.`, `Die Gewichtskraft: Die Erde zieht ${O.acc} nach unten.`), 'pair-confusion',
          T(`The weight also acts on the ${obj}: it balances ${FS}, but it is not its partner. Third-law partners act on two different bodies — here the ${sup} and the ${obj}.`,
            `Die Gewichtskraft wirkt auch auf ${O.acc}: Sie hält ${FS} das Gleichgewicht, ist aber nicht ihre Gegenkraft. Kraft und Gegenkraft wirken auf zwei verschiedene Körper — hier ${S.acc} und ${O.acc}.`)),
        o(T(`The Earth pulls the ${sup} down.`, `Die Erde zieht ${S.acc} nach unten.`), 'other',
          T(`That is an interaction between the Earth and the ${sup}. The partner of ${FS} must be a force of the ${obj} on the ${sup}.`, `Das ist eine Wechselwirkung zwischen der Erde und ${S.dat}. Die Gegenkraft zu ${FS} muss eine Kraft von ${O.dat} auf ${S.acc} sein.`)),
        o(T(`There is none: a ${sup} cannot ${hang ? 'pull' : 'push'} by itself.`, `Es gibt keine: ${cap(S.ein)} kann nicht von selbst ${hang ? 'ziehen' : 'drücken'}.`), 'obstacle',
          T(`The ${sup} does ${hang ? 'pull' : 'push'}: it is ${stretched} a tiny bit and acts like a stiff spring. And every force has a partner: the ${obj} ${pushDown}.`,
            `${cap(S.nom)} ${hang ? 'zieht' : 'drückt'} sehr wohl: ${cap(S.er)} wird ein klein wenig ${stretched} und wirkt wie eine steife Feder. Und jede Kraft hat eine Gegenkraft: ${cap(O.nom)} ${pushDown}.`)),
      ]));
    }

    const steps = [
      { title: T(`Forces on the ${obj}`, `Kräfte auf ${O.acc}`), figure: figure({ forces: true }),
        text: T(`From a distance: the Earth pulls the ${obj} down, its weight ${FG}. By contact: the ${sup} touches the ${obj}; it is ${stretched} a tiny bit and ${hang ? 'pulls the ' + obj + ' up' : 'pushes the ' + obj + ' up'}, like a very stiff spring (${hang ? 'tension' : 'normal force'} ${FS}).`,
          `Aus der Ferne: Die Erde zieht ${O.acc} nach unten, die Gewichtskraft ${FG}. Durch Kontakt: ${cap(S.nom)} berührt ${O.acc}; ${S.er} wird ein klein wenig ${stretched} und ${hang ? 'zieht' : 'drückt'} ${O.acc} nach oben, wie eine sehr steife Feder (${hang ? 'Seilkraft' : 'Normalkraft'} ${FS}).`) },
      { title: T('Balance', 'Gleichgewicht'), figure: figure({ forces: true }),
        text: T(`${balanced} These two forces act on the same body, the ${obj}. They balance, but they are <b>not</b> a third-law pair.`, `${balanced} Diese beiden Kräfte wirken auf denselben Körper, ${O.acc}. Sie heben sich auf, sind aber <b>kein</b> Kraft-Gegenkraft-Paar.`) },
      { title: T('Third-law partners', 'Kraft und Gegenkraft'), figure: figure({ forces: true, partners: true }),
        text: T(`Every force is one half of an interaction between two bodies; its partner acts on the other body. Earth pulls ${obj} down ↔ ${obj} pulls Earth up. ${hang ? `${cap(sup)} pulls ${obj} up ↔ ${obj} pulls ${sup} down` : `${cap(sup)} pushes ${obj} up ↔ ${obj} pushes ${sup} down`}. The picture shows the partner asked for${ask === 'weight' ? ', acting on the Earth' : `, acting on the ${sup}`}.`,
          `Jede Kraft ist eine Hälfte einer Wechselwirkung zwischen zwei Körpern; ihre Gegenkraft wirkt auf den anderen Körper. Erde zieht ${O.acc} nach unten ↔ ${O.nom} zieht die Erde nach oben. ${cap(S.nom)} ${hang ? 'zieht' : 'drückt'} ${O.acc} nach oben ↔ ${O.nom} ${pushDown}. Das Bild zeigt die gesuchte Gegenkraft${ask === 'weight' ? ', sie wirkt auf die Erde' : `, sie wirkt auf ${S.acc}`}.`) },
    ];

    return {
      title: hang ? T('Hanging', 'Hängend') : T('At rest', 'In Ruhe'),
      situation: `<p>${hang ? T(`A ${obj} hangs at rest from a ${sup} attached to the ceiling.`, `${cap(O.ein)} hängt ruhig an ${S.einem}, das an der Decke befestigt ist.`) : T(`A ${obj} lies at rest on a ${sup}.`, `${cap(O.ein)} liegt ruhig auf ${S.einem}.`)}</p>`,
      figure: figure(),
      questions,
      hints: [
        T(`Which bodies interact with the ${obj}? What touches it, and what acts on it from a distance?`, `Welche Körper wechselwirken mit ${O.dat}? Was berührt ${O.ihn}, und was wirkt aus der Ferne?`),
        T(`Plan: list the forces on the ${obj} and use the first law (it is at rest). For the partner, find the interaction the force belongs to and swap the two bodies.`,
          `Plan: Zähle die Kräfte auf ${O.acc} auf und wende das erste Newtonsche Gesetz an (${O.er} ist in Ruhe). Für die Gegenkraft: Finde die Wechselwirkung, zu der die Kraft gehört, und vertausche die beiden Körper.`),
        T(`Recall the first law: what does “at rest” tell you about the net force? And the third law: if A exerts a force on B, which body exerts the partner, and on which body does it act?`,
          'Erinnere dich an das erste Gesetz: Was sagt „in Ruhe“ über die resultierende Kraft? Und an das dritte Gesetz: Übt A eine Kraft auf B aus, welcher Körper übt dann die Gegenkraft aus, und auf welchen wirkt sie?'),
        T(`Here: for ${ask === 'weight' ? 'the weight' : `the force ${FS}`}, write down who exerts it and on whom. Then look for the force with exactly these two bodies swapped.`,
          `Hier: Schreibe für ${ask === 'weight' ? 'die Gewichtskraft' : `die Kraft ${FS}`} auf, wer sie auf wen ausübt. Suche dann die Kraft, bei der genau diese beiden Körper vertauscht sind.`),
      ],
      steps,
    };
  }

  register('interact', 'collision', collision);
  register('interact', 'push-apart', pushApart);
  register('interact', 'push-car', pushCar);
  register('interact', 'support', support);
})(typeof window !== 'undefined' ? window : globalThis);
