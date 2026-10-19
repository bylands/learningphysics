// True/false sets: five statements about one situation, at least two true and two false. The false
// statements are common misconceptions; judging one wrongly is counted as that misconception.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, cap, noun, stmt, tf, register } = FC;

  // Five statements, at least two of each kind.
  function pickFive(r, all) {
    for (let tries = 0; ; tries++) {
      const five = r.shuffle(all).slice(0, 5), t = five.filter((x) => x.value).length;
      if ((t >= 2 && t <= 3) || tries > 100) return five;
    }
  }
  // Worked solution: the true statements, then the false ones, each with its reason.
  const steps = (items, figure) => [
    { title: T('True statements', 'Richtige Aussagen'), figure, text: `<ul>${items.filter((x) => x.value).map((x) => `<li><b>${x.text}</b> ${x.why}</li>`).join('')}</ul>` },
    { title: T('False statements', 'Falsche Aussagen'), figure, text: `<ul>${items.filter((x) => !x.value).map((x) => `<li><b>${x.text}</b> ${x.why}</li>`).join('')}</ul>` },
  ];
  const prompt = () => T('Decide for each statement whether it is true or false.', 'Entscheide bei jeder Aussage, ob sie richtig oder falsch ist.');

  // ================================================================ interaction: two bodies pull on each other
  const PAIRS = {
    earthMoon: { A: ['f', 'Erde', 'der Erde'], B: ['m', 'Mond', 'des Mondes'], en: ['the Earth', 'the Moon'], gravity: true },
    earthApple: { A: ['f', 'Erde', 'der Erde'], B: ['m', 'Apfel', 'des Apfels'], en: ['the Earth', 'the apple'], gravity: true },
    magnetNail: { A: ['m', 'Magnet', 'des Magneten'], B: ['m', 'Nagel', 'des Nagels'], en: ['the magnet', 'the nail'], gravity: false },
  };

  function tfInteract(r, p) {
    const key = p.pair || r.pick(Object.keys(PAIRS)), P = PAIRS[key];
    const [a, b] = P.en, A = noun(P.A[0], P.A[1]), B = noun(P.B[0], P.B[1]);
    const Ag = P.A[2], Bg = P.B[2];
    const pairWhy = T(`The two forces are an interaction pair: equally large and opposite, whatever the masses.`, `Die beiden Kräfte sind ein Wechselwirkungspaar: gleich gross und entgegengesetzt, egal wie gross die Massen sind.`);
    const pulls = P.gravity ? T('pulls', 'zieht') : T('pulls', 'zieht');
    const all = [
      stmt(T(`${cap(a)} ${pulls} ${b} exactly as hard as ${b} ${pulls} ${a}.`, `${cap(A.nom)} zieht ${B.acc} genau so stark an wie ${B.nom} ${A.acc}.`), true, pairWhy, 'mass-wins'),
      stmt(T(`${cap(a)} ${pulls} ${b} harder than ${b} ${pulls} ${a}, because ${a} has more mass.`, `${cap(A.nom)} zieht ${B.acc} stärker an als ${B.nom} ${A.acc}, weil ${A.nom} mehr Masse hat.`), false, pairWhy, 'mass-wins'),
      stmt(T('The two forces cancel each other, because they are equally large and opposite.', 'Die beiden Kräfte heben sich auf, weil sie gleich gross und entgegengesetzt sind.'), false,
        T(`They act on different bodies — one on ${a}, one on ${b} — so they cannot cancel. Only forces on the same body add up.`, `Sie wirken auf verschiedene Körper — eine auf ${A.acc}, eine auf ${B.acc} —, also können sie sich nicht aufheben. Nur Kräfte auf denselben Körper addieren sich.`), 'pair-confusion'),
      stmt(T(`The acceleration of ${b} due to this force is larger than that of ${a}.`, `Die Beschleunigung ${Bg} durch diese Kraft ist grösser als die ${Ag}.`), true,
        T(`Same force, but <i>a</i> = <i>F</i>/<i>m</i>: ${b} has much less mass.`, `Gleiche Kraft, aber <i>a</i> = <i>F</i>/<i>m</i>: ${cap(B.nom)} hat viel weniger Masse.`)),
      stmt(T(`${cap(b)} does not pull on ${a} at all.`, `${cap(B.nom)} zieht überhaupt nicht an ${A.dat}.`), false,
        T(`Every force has a partner: ${b} pulls on ${a} just as hard. ${pairWhy}`, `Jede Kraft hat eine Gegenkraft: ${cap(B.nom)} zieht genauso stark an ${A.dat}. ${pairWhy}`), 'mass-wins'),
      stmt(T(`${cap(a)} gets the larger acceleration, because it pulls harder.`, `${cap(A.nom)} bekommt die grössere Beschleunigung, weil ${A.er} stärker zieht.`), false,
        T(`Neither pulls harder, and the larger mass gets the smaller acceleration. ${pairWhy}`, `Keiner der beiden zieht stärker, und die grössere Masse bekommt die kleinere Beschleunigung. ${pairWhy}`), 'mass-wins'),
      stmt(T('The two forces act on different bodies.', 'Die beiden Kräfte wirken auf verschiedene Körper.'), true,
        T(`One acts on ${b}, the other on ${a}: that is always so for an interaction pair.`, `Eine wirkt auf ${B.acc}, die andere auf ${A.acc}: Bei einem Wechselwirkungspaar ist das immer so.`), 'pair-confusion'),
      ...(P.gravity ? [stmt(T(`If ${b} had twice its mass, both forces would be twice as large.`, `Hätte ${B.nom} die doppelte Masse, wären beide Kräfte doppelt so gross.`), true,
        T(`The gravitational pull is proportional to both masses, and the two forces stay equal.`, `Die Gravitationskraft ist proportional zu beiden Massen, und die beiden Kräfte bleiben gleich gross.`))] : []),
    ];
    const items = pickFive(r, all);
    const draw = (forces) => {
      let g = '';
      if (key === 'magnetNail') {
        g += D.rect(0, 0, 340, 140, 'table-top', 6) + `<rect class="mag-n" x="60" y="54" width="70" height="32" rx="3"/>` + D.rect(226, 66, 70, 8, 'solid', 2) + D.rect(220, 62, 8, 16, 'solid', 1);
        g += D.words(95, 108, T('magnet', 'Magnet')) + D.words(260, 100, T('iron nail', 'Eisennagel'));
        if (forces) g += D.arrow(134, 70, 178, 70, 'f', '') + D.arrow(216, 70, 172, 70, 'f', '');
      } else {
        g += D.rect(0, 0, 340, 140, 'space', 6) + `<circle class="obj earth" cx="80" cy="70" r="46"/>` + `<circle class="obj" cx="${key === 'earthMoon' ? 270 : 220}" cy="70" r="${key === 'earthMoon' ? 13 : 7}"/>`;
        g += D.words(80, 132, T('Earth', 'Erde')) + D.words(key === 'earthMoon' ? 270 : 220, 104, key === 'earthMoon' ? T('Moon', 'Mond') : T('apple', 'Apfel'));
        const bx = key === 'earthMoon' ? 270 : 220, br = key === 'earthMoon' ? 13 : 7;
        if (forces) g += D.arrow(bx - br, 70, bx - br - 44, 70, 'f', '') + D.arrow(126, 70, 170, 70, 'f', '');
      }
      return D.svg(340, 140, g, T(`${cap(a)} and ${b}`, `${cap(A.nom)} und ${B.nom}`));
    };
    const situation = {
      earthMoon: T('<p>The Earth and the Moon attract each other by gravity. The Earth has about 80 times the mass of the Moon.</p>', '<p>Die Erde und der Mond ziehen sich durch die Gravitation an. Die Erde hat etwa die 80-fache Masse des Mondes.</p>'),
      earthApple: T('<p>An apple falls from a tree. The Earth and the apple attract each other by gravity.</p>', '<p>Ein Apfel fällt vom Baum. Die Erde und der Apfel ziehen sich durch die Gravitation an.</p>'),
      magnetNail: T('<p>A strong magnet and a small iron nail lie on a smooth table and attract each other. The magnet is much heavier than the nail.</p>', '<p>Ein starker Magnet und ein kleiner Eisennagel liegen auf einem glatten Tisch und ziehen sich an. Der Magnet ist viel schwerer als der Nagel.</p>'),
    }[key];
    return {
      title: T('True or false: pulling on each other', 'Richtig oder falsch: gegenseitige Anziehung'),
      situation,
      figure: draw(false),
      questions: [tf(r, 'statements', prompt(), items)],
      hints: [
        T(`Which force does ${a} exert on ${b}, and which does ${b} exert on ${a}?`, `Welche Kraft übt ${A.nom} auf ${B.acc} aus, und welche ${B.nom} auf ${A.acc}?`),
        T(`Plan: sort the five statements into those about the two forces between ${a} and ${b} (third law) and those about their effects on ${a} or on ${b} (second law, <i>a</i> = <i>F</i>/<i>m</i>, body by body).`, `Plan: Teile die fünf Aussagen ein in solche über die beiden Kräfte zwischen ${A.dat} und ${B.dat} (drittes Gesetz) und solche über ihre Wirkungen auf ${A.acc} oder ${B.acc} (zweites Gesetz, <i>a</i> = <i>F</i>/<i>m</i>, für jeden Körper einzeln).`),
        T(`Start with “${items[0].text}” Is it about the forces or about their effects? Then recall what the matching law says for ${a} and ${b}.`, `Beginne mit „${items[0].text}“ Geht es um die Kräfte oder um ihre Wirkungen? Erinnere dich dann, was das passende Gesetz für ${A.acc} und ${B.acc} sagt.`),
        T(`Here ${a} has far more mass than ${b}. For each statement, ask: is it about the forces or about their effects, and which law answers it?`, `Hier hat ${A.nom} viel mehr Masse als ${B.nom}. Frage dich bei jeder Aussage: Geht es um die Kräfte oder um ihre Wirkungen, und welches Gesetz beantwortet sie?`),
      ],
      steps: steps(items, draw(true)),
    };
  }

  register('interact', 'tf-interact', tfInteract);
})(typeof window !== 'undefined' ? window : globalThis);
