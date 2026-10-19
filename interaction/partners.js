// Third-law partners: name the partner of one force in a situation, and how large it is (partner);
// and find the error in a student's list of force pairs, where one "pair" is two forces on the same
// body, such as the weight and the normal force (find-error).
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, cap, o, q, register } = FC;

  const swap = () => T('The partner of “A acts on B” is “B acts on A”: the same two bodies, swapped, and the same kind of force.',
    'Die Gegenkraft zu „A wirkt auf B“ ist „B wirkt auf A“: dieselben zwei Körper, vertauscht, und dieselbe Art von Kraft.');
  const third = () => T('Third law: the two forces of an interaction are equally large and opposite, and act on different bodies — whatever their masses, charges or motion.',
    'Drittes Newtonsches Gesetz: Die beiden Kräfte einer Wechselwirkung sind gleich gross, entgegengesetzt und wirken auf verschiedene Körper — egal, wie gross ihre Massen oder Ladungen sind und wie sie sich bewegen.');

  // ================================================================ partner: which force is the partner?
  // Each scene: the force (A on B) and its partner (B on A), a picture with both, the wrong
  // partners and the wrong sizes.
  function partnerScenes() {
    return {
      mosquito: {
        title: T('Mosquito and windscreen', 'Mücke und Windschutzscheibe'),
        text: T('A car drives along the motorway. A mosquito hits its windscreen and is carried along by the car.', 'Ein Auto fährt auf der Autobahn. Eine Mücke prallt gegen die Windschutzscheibe und wird vom Auto mitgenommen.'),
        force: T('the windscreen pushes the mosquito forward', 'die Windschutzscheibe drückt die Mücke nach vorn'),
        partner: T('the mosquito pushes the windscreen backward', 'die Mücke drückt die Windschutzscheibe nach hinten'),
        bodies: T('the windscreen and the mosquito', 'der Windschutzscheibe und der Mücke'),
        draw: (f) => {
          let g = D.ground(0, 360, 170) + D.car(140, 170, 150) + D.dot(262, 110, 3.5, 'pt') + D.arrow(60, 60, 110, 60, 'v', 'v');
          g += D.words(262, 84, T('mosquito', 'Mücke'));
          if (f.force) g += D.arrow(264, 110, 314, 110, 'f', '') + D.words(352, 102, T('screen on mosquito', 'Scheibe → Mücke'), 'end');
          if (f.partner) g += D.arrow(260, 110, 212, 110, 'f', '', { cls: 'pair' }) + D.words(214, 92, T('mosquito on screen', 'Mücke → Scheibe'), 'end');
          return D.svg(360, 190, g, T('A car with a mosquito on its windscreen', 'Ein Auto mit einer Mücke auf der Windschutzscheibe'));
        },
        wrong: [
          o(T('None: the mosquito is far too light to push on the car.', 'Keine: Die Mücke ist viel zu leicht, um auf das Auto zu drücken.'), 'mass-wins',
            T('Every force has a partner. The mosquito pushes the windscreen backward just as hard; the car just does not notice, because its mass is so large.', 'Jede Kraft hat eine Gegenkraft. Die Mücke drückt die Scheibe genauso stark nach hinten; das Auto merkt es nur nicht, weil seine Masse so gross ist.')),
          o(T('The air pushes the mosquito backward.', 'Die Luft drückt die Mücke nach hinten.'), 'pair-confusion',
            T('That force also acts on the mosquito. Partners act on two different bodies: here the windscreen and the mosquito.', 'Diese Kraft wirkt auch auf die Mücke. Kraft und Gegenkraft wirken auf zwei verschiedene Körper: hier die Scheibe und die Mücke.')),
          o(T('The road pushes the car forward.', 'Die Strasse drückt das Auto nach vorn.'), 'other',
            T('That is an interaction between the road and the tyres. The partner of a force of the windscreen on the mosquito is a force of the mosquito on the windscreen.', 'Das ist eine Wechselwirkung zwischen Strasse und Reifen. Die Gegenkraft zu einer Kraft der Scheibe auf die Mücke ist eine Kraft der Mücke auf die Scheibe.')),
        ],
        size: T('How hard does the mosquito push on the windscreen, compared with the push of the windscreen on the mosquito?', 'Wie stark drückt die Mücke auf die Scheibe, verglichen mit der Kraft der Scheibe auf die Mücke?'),
        sizes: [
          o(T('Far less hard, since the mosquito is so much lighter.', 'Viel weniger stark, weil die Mücke so viel leichter ist.'), 'mass-wins',
            T('The mass decides how much the force changes the velocity, not how large the force is. The mosquito is squashed, the car hardly slows down — with equal forces.', 'Die Masse bestimmt, wie stark die Kraft die Geschwindigkeit ändert, nicht wie gross die Kraft ist. Die Mücke wird zerquetscht, das Auto wird kaum langsamer — bei gleich grossen Kräften.')),
          o(T('Less hard, since the car is the one that is moving fast.', 'Weniger stark, weil das Auto sich schnell bewegt.'), 'active-wins',
            T('Who moves faster does not matter: the push between the two is one interaction, and its two forces are equally large.', 'Wer sich schneller bewegt, spielt keine Rolle: Das Drücken zwischen den beiden ist eine einzige Wechselwirkung, und ihre beiden Kräfte sind gleich gross.')),
          o(T('Harder, since the mosquito gets the much larger acceleration.', 'Stärker, weil die Mücke die viel grössere Beschleunigung bekommt.'), 'other',
            T('The mosquito does get the larger acceleration, but from the same force: <i>a</i> = <i>F</i>/<i>m</i>, and its mass is tiny.', 'Die Mücke bekommt zwar die grössere Beschleunigung, aber durch die gleiche Kraft: <i>a</i> = <i>F</i>/<i>m</i>, und ihre Masse ist winzig.')),
        ],
        effect: T('The mosquito is squashed and the car hardly slows down: the same force has very different effects on the two masses.', 'Die Mücke wird zerquetscht, und das Auto wird kaum langsamer: Die gleiche Kraft wirkt sich auf die beiden Massen sehr verschieden aus.'),
      },
      electron: {
        title: T('Nucleus and electron', 'Kern und Elektron'),
        text: T('In a helium ion, a single electron circles the nucleus. The nucleus has twice the charge of the electron (of opposite sign) and about 7300 times its mass.', 'In einem Heliumion umkreist ein einzelnes Elektron den Kern. Der Kern hat die doppelte Ladung des Elektrons (mit entgegengesetztem Vorzeichen) und etwa die 7300-fache Masse.'),
        force: T('the nucleus pulls the electron towards it', 'der Kern zieht das Elektron an'),
        partner: T('the electron pulls the nucleus towards it', 'das Elektron zieht den Kern an'),
        bodies: T('the nucleus and the electron', 'dem Kern und dem Elektron'),
        draw: (f) => {
          let g = D.rect(0, 0, 360, 190, 'space', 6) + `<path class="trace" d="M247 25 A150 150 0 0 1 247 165"/>`;
          g += `<circle class="mag-n" cx="110" cy="95" r="16"/>` + D.text(110, 100, '2+', 'lbl small') + `<circle class="mag-s" cx="260" cy="95" r="7"/>` + D.text(260, 99, '−', 'lbl small');
          g += D.words(110, 132, T('nucleus', 'Kern')) + D.words(272, 80, T('electron', 'Elektron'), 'start');
          if (f.force) g += D.arrow(250, 95, 200, 95, 'f', '') + D.words(226, 116, T('on the electron', 'auf das Elektron'));
          if (f.partner) g += D.arrow(128, 95, 178, 95, 'f', '', { cls: 'pair' }) + D.words(152, 80, T('on the nucleus', 'auf den Kern'));
          return D.svg(360, 190, g, T('An electron circling a nucleus', 'Ein Elektron umkreist einen Kern'));
        },
        wrong: [
          o(T('None: the electron is far too light to pull on the nucleus.', 'Keine: Das Elektron ist viel zu leicht, um am Kern zu ziehen.'), 'mass-wins',
            T('Every force has a partner, whatever the masses: the electron pulls the nucleus just as hard. The nucleus hardly moves only because its mass is so large.', 'Jede Kraft hat eine Gegenkraft, egal wie gross die Massen sind: Das Elektron zieht genauso stark am Kern. Der Kern bewegt sich kaum, nur weil seine Masse so gross ist.')),
          o(T('The gravitational pull of the nucleus on the electron.', 'Die Gravitationskraft des Kerns auf das Elektron.'), 'pair-confusion',
            T('That force also acts on the electron, and it is of a different kind. Partners act on two different bodies and are of the same kind: here the electric pull of the electron on the nucleus.', 'Diese Kraft wirkt auch auf das Elektron, und sie ist von anderer Art. Kraft und Gegenkraft wirken auf zwei verschiedene Körper und sind von derselben Art: hier die elektrische Anziehung des Kerns durch das Elektron.')),
          o(T('The electron pushes the nucleus away from it.', 'Das Elektron stösst den Kern von sich weg.'), 'other',
            T('Opposite charges attract each other, both ways: the electron pulls the nucleus towards it. The partner points opposite to the force because it acts on the other body.', 'Entgegengesetzte Ladungen ziehen sich gegenseitig an: Das Elektron zieht den Kern zu sich hin. Die Gegenkraft zeigt entgegengesetzt, weil sie auf den anderen Körper wirkt.')),
        ],
        size: T('How large is the pull of the electron on the nucleus, compared with the pull of the nucleus on the electron?', 'Wie gross ist die Kraft des Elektrons auf den Kern, verglichen mit der Kraft des Kerns auf das Elektron?'),
        sizes: [
          o(T('Half as large, since the electron has only half the charge of the nucleus.', 'Halb so gross, weil das Elektron nur die halbe Ladung des Kerns hat.'), 'mass-wins',
            T('The pull depends on both charges together, and it is one interaction: the two forces are equally large, whatever the charges.', 'Die Kraft hängt von beiden Ladungen zusammen ab, und es ist eine einzige Wechselwirkung: Die beiden Kräfte sind gleich gross, egal wie gross die Ladungen sind.')),
          o(T('Much smaller, since the electron is about 7300 times lighter.', 'Viel kleiner, weil das Elektron etwa 7300-mal leichter ist.'), 'mass-wins',
            T('The mass decides how much the force accelerates a body, not how large the force is. The electron gets about 7300 times the acceleration of the nucleus — from an equally large force.', 'Die Masse bestimmt, wie stark die Kraft einen Körper beschleunigt, nicht wie gross die Kraft ist. Das Elektron bekommt etwa die 7300-fache Beschleunigung des Kerns — durch eine gleich grosse Kraft.')),
          o(T('Larger, since the electron moves so fast.', 'Grösser, weil sich das Elektron so schnell bewegt.'), 'active-wins',
            T('How the bodies move does not matter: the two forces of an interaction are always equally large.', 'Wie sich die Körper bewegen, spielt keine Rolle: Die beiden Kräfte einer Wechselwirkung sind immer gleich gross.')),
        ],
        effect: T('The electron, being so light, circles the nucleus; the nucleus hardly moves.', 'Das Elektron ist so leicht, dass es den Kern umkreist; der Kern bewegt sich kaum.'),
      },
      dancer: {
        title: T('Ice dancer and Earth', 'Eistänzerin und Erde'),
        text: T('An ice dancer glides across the ice at constant speed.', 'Eine Eistänzerin gleitet mit konstanter Geschwindigkeit über das Eis.'),
        force: T('the Earth pulls the dancer down (her weight)', 'die Erde zieht die Tänzerin nach unten (ihre Gewichtskraft)'),
        partner: T('the dancer pulls the Earth up', 'die Tänzerin zieht die Erde nach oben'),
        bodies: T('the Earth and the dancer', 'der Erde und der Tänzerin'),
        draw: (f) => {
          let g = D.rect(0, 170, 360, 12, 'ice', 0) + D.line(0, 170, 360, 170, 'gline') + D.person(180, 168, 110, 1, 'down', true) + D.arrow(220, 60, 270, 60, 'v', 'v');
          if (f.force) g += D.arrow(180, 118, 180, 164, 'f', '') + D.words(200, 146, T('Earth on dancer', 'Erde → Tänzerin'), 'start');
          if (f.partner) g += D.arrow(180, 230, 180, 190, 'f', '', { cls: 'pair' }) + D.words(188, 214, T('dancer on Earth', 'Tänzerin → Erde'), 'start');
          return D.svg(360, 236, g, T('An ice dancer gliding on the ice', 'Eine Eistänzerin gleitet über das Eis'));
        },
        wrong: [
          o(T('The ice pushes the dancer up.', 'Das Eis drückt die Tänzerin nach oben.'), 'pair-confusion',
            T('That force also acts on the dancer: it balances her weight, but it is not its partner. Partners act on two different bodies — here the Earth and the dancer.', 'Diese Kraft wirkt auch auf die Tänzerin: Sie hält der Gewichtskraft das Gleichgewicht, ist aber nicht ihre Gegenkraft. Kraft und Gegenkraft wirken auf zwei verschiedene Körper — hier die Erde und die Tänzerin.')),
          o(T('The dancer pushes the ice down.', 'Die Tänzerin drückt das Eis nach unten.'), 'other',
            T('That is a contact force between the dancer and the ice: the partner of the push of the ice on the dancer. The weight is an interaction between the Earth and the dancer.', 'Das ist eine Kontaktkraft zwischen Tänzerin und Eis: die Gegenkraft zur Normalkraft des Eises auf die Tänzerin. Die Gewichtskraft ist eine Wechselwirkung zwischen der Erde und der Tänzerin.')),
          o(T('None: the dancer is far too light to pull on the Earth.', 'Keine: Die Tänzerin ist viel zu leicht, um an der Erde zu ziehen.'), 'mass-wins',
            T('Every force has a partner of the same size. The dancer pulls the Earth up with her weight; the Earth just does not notice, because its mass is so large.', 'Jede Kraft hat eine gleich grosse Gegenkraft. Die Tänzerin zieht die Erde mit ihrer Gewichtskraft nach oben; die Erde merkt das nur nicht, weil ihre Masse so gross ist.')),
        ],
        size: T('How hard does the dancer pull on the Earth, compared with her weight?', 'Wie stark zieht die Tänzerin an der Erde, verglichen mit ihrer Gewichtskraft?'),
        sizes: [
          o(T('Hardly at all, since her mass is tiny compared with that of the Earth.', 'Fast gar nicht, weil ihre Masse im Vergleich zu jener der Erde winzig ist.'), 'mass-wins',
            T('The mass decides the effect of the force, not its size: the Earth gets a tiny acceleration from an equally large force.', 'Die Masse bestimmt die Wirkung der Kraft, nicht ihre Grösse: Die Erde bekommt durch eine gleich grosse Kraft eine winzige Beschleunigung.')),
          o(T('Less hard, since the Earth does the pulling and the dancer only glides along.', 'Weniger stark, weil die Erde zieht und die Tänzerin nur dahingleitet.'), 'active-wins',
            T('Neither body “does” the pulling: the gravitational pull is one interaction between the two, and both forces are equally large, whatever their motion.', 'Keiner der beiden Körper „zieht“ allein: Die Gravitation ist eine Wechselwirkung zwischen beiden, und beide Kräfte sind gleich gross, egal wie sie sich bewegen.')),
          o(T('Harder, since she also presses on the ice.', 'Stärker, weil sie auch noch auf das Eis drückt.'), 'other',
            T('Her push on the ice belongs to another interaction, with the ice. Her pull on the Earth is exactly as large as her weight.', 'Ihr Druck auf das Eis gehört zu einer anderen Wechselwirkung, mit dem Eis. Ihr Zug an der Erde ist genau so gross wie ihre Gewichtskraft.')),
        ],
        effect: T('The dancer feels her weight; the Earth, with its huge mass, gets no noticeable acceleration from her pull.', 'Die Tänzerin spürt ihre Gewichtskraft; die Erde mit ihrer riesigen Masse bekommt durch den Zug der Tänzerin keine spürbare Beschleunigung.'),
      },
      hammer: {
        title: T('Hammer and nail', 'Hammer und Nagel'),
        text: T('A hammer hits a nail and drives it into a block of wood.', 'Ein Hammer trifft einen Nagel und treibt ihn in einen Holzklotz.'),
        force: T('the hammer pushes the nail down', 'der Hammer drückt den Nagel nach unten'),
        partner: T('the nail pushes the hammer up', 'der Nagel drückt den Hammer nach oben'),
        bodies: T('the hammer and the nail', 'dem Hammer und dem Nagel'),
        draw: (f) => {
          let g = D.rect(90, 150, 180, 50, 'obj', 2) + D.rect(177, 112, 6, 46, 'solid', 1) + D.rect(171, 108, 18, 5, 'solid', 1);
          g += D.rect(150, 72, 60, 34, 'solid', 3) + D.rect(205, 82, 110, 12, 'obj', 4) + D.words(250, 222, T('wood', 'Holz'));
          if (f.force) g += D.arrow(180, 108, 180, 150, 'f', '') + D.words(192, 136, T('hammer on nail', 'Hammer → Nagel'), 'start');
          if (f.partner) g += D.arrow(180, 106, 180, 58, 'f', '', { cls: 'pair' }) + D.words(144, 60, T('nail on hammer', 'Nagel → Hammer'), 'end');
          return D.svg(360, 230, g, T('A hammer hitting a nail', 'Ein Hammer trifft einen Nagel'));
        },
        wrong: [
          o(T('The wood pushes the nail up (it holds it back).', 'Das Holz drückt den Nagel nach oben (es bremst ihn).'), 'pair-confusion',
            T('That force also acts on the nail. Partners act on two different bodies — here the hammer and the nail.', 'Diese Kraft wirkt auch auf den Nagel. Kraft und Gegenkraft wirken auf zwei verschiedene Körper — hier der Hammer und der Nagel.')),
          o(T('None: the nail just gives way.', 'Keine: Der Nagel weicht einfach aus.'), 'obstacle',
            T('The hammer stops on the nail, so something pushes it back: the nail. Every force has a partner of the same size.', 'Der Hammer wird auf dem Nagel gebremst, also drückt ihn etwas zurück: der Nagel. Jede Kraft hat eine gleich grosse Gegenkraft.')),
          o(T('The Earth pulls the hammer down.', 'Die Erde zieht den Hammer nach unten.'), 'other',
            T('That is an interaction between the Earth and the hammer. The partner of a force of the hammer on the nail is a force of the nail on the hammer.', 'Das ist eine Wechselwirkung zwischen der Erde und dem Hammer. Die Gegenkraft zu einer Kraft des Hammers auf den Nagel ist eine Kraft des Nagels auf den Hammer.')),
        ],
        size: T('How hard does the nail push on the hammer, compared with the push of the hammer on the nail?', 'Wie stark drückt der Nagel auf den Hammer, verglichen mit der Kraft des Hammers auf den Nagel?'),
        sizes: [
          o(T('Less hard, since the hammer is the one that strikes.', 'Weniger stark, weil der Hammer zuschlägt.'), 'active-wins',
            T('Who strikes does not matter: the push between hammer and nail is one interaction, and its two forces are equally large.', 'Wer zuschlägt, spielt keine Rolle: Das Drücken zwischen Hammer und Nagel ist eine einzige Wechselwirkung, und ihre beiden Kräfte sind gleich gross.')),
          o(T('Less hard, since the hammer is much heavier.', 'Weniger stark, weil der Hammer viel schwerer ist.'), 'mass-wins',
            T('The masses decide the effects, not the forces: the two forces of an interaction are always equally large.', 'Die Massen bestimmen die Wirkungen, nicht die Kräfte: Die beiden Kräfte einer Wechselwirkung sind immer gleich gross.')),
          o(T('Less hard, otherwise the nail would not go into the wood.', 'Weniger stark, sonst würde der Nagel nicht ins Holz gehen.'), 'other',
            T('Whether the nail moves depends on the forces on the nail (the hammer and the wood), not on its push on the hammer, which acts on another body.', 'Ob sich der Nagel bewegt, hängt von den Kräften auf den Nagel ab (Hammer und Holz), nicht von seiner Kraft auf den Hammer, die auf einen anderen Körper wirkt.')),
        ],
        effect: T('The hammer is stopped and the nail goes in: each force acts on its own body.', 'Der Hammer wird gebremst, und der Nagel geht hinein: Jede Kraft wirkt auf ihren eigenen Körper.'),
      },
      moon: {
        title: T('Earth and Moon', 'Erde und Mond'),
        text: T('The Moon circles the Earth. The Earth has about 81 times the mass of the Moon.', 'Der Mond umkreist die Erde. Die Erde hat etwa die 81-fache Masse des Mondes.'),
        force: T('the Earth pulls the Moon towards it', 'die Erde zieht den Mond an'),
        partner: T('the Moon pulls the Earth towards it', 'der Mond zieht die Erde an'),
        bodies: T('the Earth and the Moon', 'der Erde und dem Mond'),
        draw: (f) => {
          let g = D.rect(0, 0, 360, 190, 'space', 6) + `<path class="trace" d="M277 25 A200 200 0 0 1 277 165"/>`;
          g += D.ball(90, 95, 34, 'obj earth') + D.ball(290, 95, 11, 'obj') + D.words(90, 150, T('Earth', 'Erde')) + D.words(304, 76, T('Moon', 'Mond'), 'start');
          if (f.force) g += D.arrow(276, 95, 226, 95, 'f', '') + D.words(252, 118, T('on the Moon', 'auf den Mond'));
          if (f.partner) g += D.arrow(128, 95, 178, 95, 'f', '', { cls: 'pair' }) + D.words(166, 80, T('on the Earth', 'auf die Erde'));
          return D.svg(360, 190, g, T('The Moon circling the Earth', 'Der Mond umkreist die Erde'));
        },
        wrong: [
          o(T('None: the Moon is far too light to pull on the Earth.', 'Keine: Der Mond ist viel zu leicht, um an der Erde zu ziehen.'), 'mass-wins',
            T('Every force has a partner, whatever the masses: the Moon pulls the Earth just as hard. The Earth hardly moves only because its mass is so large.', 'Jede Kraft hat eine Gegenkraft, egal wie gross die Massen sind: Der Mond zieht genauso stark an der Erde. Die Erde bewegt sich kaum, nur weil ihre Masse so gross ist.')),
          o(T('The Sun pulls the Moon towards it.', 'Die Sonne zieht den Mond an.'), 'pair-confusion',
            T('That force also acts on the Moon. Partners act on two different bodies of one interaction: here the Earth and the Moon.', 'Diese Kraft wirkt auch auf den Mond. Kraft und Gegenkraft wirken auf die zwei verschiedenen Körper einer Wechselwirkung: hier die Erde und den Mond.')),
          o(T('The Moon pushes the Earth away from it.', 'Der Mond stösst die Erde von sich weg.'), 'other',
            T('Gravity always attracts, both ways: the Moon pulls the Earth towards it. The partner points opposite to the force because it acts on the other body.', 'Die Gravitation zieht immer an, in beide Richtungen: Der Mond zieht die Erde zu sich hin. Die Gegenkraft zeigt entgegengesetzt, weil sie auf den anderen Körper wirkt.')),
        ],
        size: T('How large is the pull of the Moon on the Earth, compared with the pull of the Earth on the Moon?', 'Wie gross ist die Kraft des Mondes auf die Erde, verglichen mit der Kraft der Erde auf den Mond?'),
        sizes: [
          o(T('About 81 times smaller, since the Moon has only 1/81 of the mass of the Earth.', 'Etwa 81-mal kleiner, weil der Mond nur 1/81 der Masse der Erde hat.'), 'mass-wins',
            T('The pull depends on both masses together, and it is one interaction: the two forces are equally large. The Moon gets 81 times the acceleration of the Earth — from an equally large force.', 'Die Kraft hängt von beiden Massen zusammen ab, und es ist eine einzige Wechselwirkung: Die beiden Kräfte sind gleich gross. Der Mond bekommt die 81-fache Beschleunigung der Erde — durch eine gleich grosse Kraft.')),
          o(T('Smaller, since the Moon is the one that goes round the Earth.', 'Kleiner, weil der Mond um die Erde kreist.'), 'active-wins',
            T('How the bodies move does not matter: the two forces of an interaction are always equally large.', 'Wie sich die Körper bewegen, spielt keine Rolle: Die beiden Kräfte einer Wechselwirkung sind immer gleich gross.')),
          o(T('Larger, since the Moon pulls up the tides on the Earth.', 'Grösser, weil der Mond auf der Erde die Gezeiten hervorruft.'), 'other',
            T('The tides show that the Moon does pull on the Earth, but not that it pulls harder: the two forces of the interaction are equally large.', 'Die Gezeiten zeigen, dass der Mond an der Erde zieht, aber nicht, dass er stärker zieht: Die beiden Kräfte der Wechselwirkung sind gleich gross.')),
        ],
        effect: T('The Moon, being much lighter, circles the Earth; the Earth only wobbles a little.', 'Der Mond ist viel leichter und umkreist die Erde; die Erde schwankt nur ein wenig.'),
      },
      tennis: {
        title: T('Racket and ball', 'Schläger und Ball'),
        text: T('A tennis player hits a ball with her racket. The ball flies off fast.', 'Eine Tennisspielerin schlägt einen Ball mit ihrem Schläger. Der Ball fliegt schnell davon.'),
        force: T('the racket pushes the ball forward', 'der Schläger drückt den Ball nach vorn'),
        partner: T('the ball pushes the racket backward', 'der Ball drückt den Schläger nach hinten'),
        bodies: T('the racket and the ball', 'dem Schläger und dem Ball'),
        draw: (f) => {
          let g = D.ground(0, 360, 200) + D.line(160, 118, 120, 178, 'body') + `<ellipse class="obj" cx="170" cy="92" rx="14" ry="28"/>` + D.ball(196, 92, 9, 'lit');
          g += D.words(196, 70, T('ball', 'Ball')) + D.words(118, 194, T('racket', 'Schläger'), 'end');
          if (f.force) g += D.arrow(188, 92, 240, 92, 'f', '') + D.words(248, 88, T('racket on ball', 'Schläger → Ball'), 'start');
          if (f.partner) g += D.arrow(184, 92, 132, 92, 'f', '', { cls: 'pair' }) + D.words(128, 84, T('ball on racket', 'Ball → Schläger'), 'end');
          return D.svg(360, 210, g, T('A racket hitting a tennis ball', 'Ein Schläger trifft einen Tennisball'));
        },
        wrong: [
          o(T('None: the ball just flies off.', 'Keine: Der Ball fliegt einfach davon.'), 'obstacle',
            T('The racket is slowed down on the ball, so something pushes it back: the ball. Every force has a partner of the same size.', 'Der Schläger wird am Ball gebremst, also drückt ihn etwas zurück: der Ball. Jede Kraft hat eine gleich grosse Gegenkraft.')),
          o(T('The air pushes the ball backward.', 'Die Luft drückt den Ball nach hinten.'), 'pair-confusion',
            T('That force also acts on the ball. Partners act on two different bodies: here the racket and the ball.', 'Diese Kraft wirkt auch auf den Ball. Kraft und Gegenkraft wirken auf zwei verschiedene Körper: hier den Schläger und den Ball.')),
          o(T('The player’s hand pushes the racket forward.', 'Die Hand der Spielerin drückt den Schläger nach vorn.'), 'other',
            T('That is an interaction between the hand and the racket. The partner of a force of the racket on the ball is a force of the ball on the racket.', 'Das ist eine Wechselwirkung zwischen Hand und Schläger. Die Gegenkraft zu einer Kraft des Schlägers auf den Ball ist eine Kraft des Balls auf den Schläger.')),
        ],
        size: T('How hard does the ball push on the racket, compared with the push of the racket on the ball?', 'Wie stark drückt der Ball auf den Schläger, verglichen mit der Kraft des Schlägers auf den Ball?'),
        sizes: [
          o(T('Less hard, since the racket is the one that strikes.', 'Weniger stark, weil der Schläger zuschlägt.'), 'active-wins',
            T('Who strikes does not matter: the push between racket and ball is one interaction, and its two forces are equally large.', 'Wer zuschlägt, spielt keine Rolle: Das Drücken zwischen Schläger und Ball ist eine einzige Wechselwirkung, und ihre beiden Kräfte sind gleich gross.')),
          o(T('Far less hard, since the ball is so light.', 'Viel weniger stark, weil der Ball so leicht ist.'), 'mass-wins',
            T('The mass decides how much the force changes the velocity, not how large the force is. The light ball flies off fast, the racket is only slowed a little — with equal forces.', 'Die Masse bestimmt, wie stark die Kraft die Geschwindigkeit ändert, nicht wie gross die Kraft ist. Der leichte Ball fliegt schnell davon, der Schläger wird nur wenig gebremst — bei gleich grossen Kräften.')),
          o(T('Less hard, otherwise the ball would not fly off.', 'Weniger stark, sonst würde der Ball nicht davonfliegen.'), 'other',
            T('Whether the ball flies off depends on the forces on the ball, not on its push on the racket, which acts on another body.', 'Ob der Ball davonfliegt, hängt von den Kräften auf den Ball ab, nicht von seiner Kraft auf den Schläger, die auf einen anderen Körper wirkt.')),
        ],
        effect: T('The light ball flies off fast; the racket, held by the player, is only slowed a little.', 'Der leichte Ball fliegt schnell davon; der Schläger, den die Spielerin festhält, wird nur wenig gebremst.'),
      },
      clip: {
        title: T('Magnet and paper clip', 'Magnet und Büroklammer'),
        text: T('A strong bar magnet is held above a paper clip. The clip jumps up towards the magnet.', 'Ein starker Stabmagnet wird über eine Büroklammer gehalten. Die Klammer springt nach oben zum Magneten.'),
        force: T('the magnet pulls the clip up', 'der Magnet zieht die Klammer nach oben'),
        partner: T('the clip pulls the magnet down', 'die Klammer zieht den Magneten nach unten'),
        bodies: T('the magnet and the clip', 'dem Magneten und der Klammer'),
        draw: (f) => {
          let g = D.ground(60, 300, 190) + D.rect(168, 16, 24, 40, 'mag-s', 1) + D.rect(168, 56, 24, 40, 'mag-n', 1) + D.text(180, 41, 'S', 'lbl small') + D.text(180, 81, 'N', 'lbl small');
          g += D.rect(173, 134, 14, 32, 'thin', 6) + D.rect(176, 140, 8, 20, 'thin', 4) + D.words(152, 158, T('clip', 'Klammer'), 'end') + D.arrow(244, 178, 244, 140, 'm', '', { head: 7 });
          if (f.force) g += D.arrow(180, 150, 180, 118, 'f', '') + D.words(196, 124, T('magnet on clip', 'Magnet → Klammer'), 'start');
          if (f.partner) g += D.arrow(180, 70, 180, 104, 'f', '', { cls: 'pair' }) + D.words(162, 100, T('clip on magnet', 'Klammer → Magnet'), 'end');
          return D.svg(360, 200, g, T('A bar magnet above a paper clip', 'Ein Stabmagnet über einer Büroklammer'));
        },
        wrong: [
          o(T('None: the clip is not a magnet, so it cannot pull.', 'Keine: Die Klammer ist kein Magnet, also kann sie nicht ziehen.'), 'other',
            T('The magnet magnetises the iron clip, and the two pull on each other: the clip pulls the magnet down just as hard. Every force has a partner.', 'Der Magnet magnetisiert die eiserne Klammer, und die beiden ziehen sich gegenseitig an: Die Klammer zieht den Magneten genauso stark nach unten. Jede Kraft hat eine Gegenkraft.')),
          o(T('The Earth pulls the clip down (its weight).', 'Die Erde zieht die Klammer nach unten (ihre Gewichtskraft).'), 'pair-confusion',
            T('That force also acts on the clip, and it is of a different kind. Partners act on two different bodies and are of the same kind: here the magnetic pull of the clip on the magnet.', 'Diese Kraft wirkt auch auf die Klammer, und sie ist von anderer Art. Kraft und Gegenkraft wirken auf zwei verschiedene Körper und sind von derselben Art: hier die magnetische Kraft der Klammer auf den Magneten.')),
          o(T('The hand pushes the magnet up.', 'Die Hand drückt den Magneten nach oben.'), 'other',
            T('That is an interaction between the hand and the magnet. The partner of a force of the magnet on the clip is a force of the clip on the magnet.', 'Das ist eine Wechselwirkung zwischen Hand und Magnet. Die Gegenkraft zu einer Kraft des Magneten auf die Klammer ist eine Kraft der Klammer auf den Magneten.')),
        ],
        size: T('How hard does the clip pull on the magnet, compared with the pull of the magnet on the clip?', 'Wie stark zieht die Klammer am Magneten, verglichen mit der Kraft des Magneten auf die Klammer?'),
        sizes: [
          o(T('Much less hard, since the magnet is so much stronger.', 'Viel weniger stark, weil der Magnet so viel stärker ist.'), 'mass-wins',
            T('The pull depends on the magnet and the clip together, and it is one interaction: its two forces are equally large, however strong the magnet.', 'Die Kraft hängt vom Magneten und der Klammer zusammen ab, und es ist eine einzige Wechselwirkung: Ihre beiden Kräfte sind gleich gross, egal wie stark der Magnet ist.')),
          o(T('Less hard, since the magnet does the pulling and the clip is only pulled.', 'Weniger stark, weil der Magnet zieht und die Klammer nur gezogen wird.'), 'active-wins',
            T('Neither body “does” the pulling alone: the magnetic pull is one interaction between the two, and both forces are equally large.', 'Keiner der beiden Körper „zieht“ allein: Die magnetische Anziehung ist eine Wechselwirkung zwischen beiden, und beide Kräfte sind gleich gross.')),
          o(T('Less hard, otherwise the clip would not rise.', 'Weniger stark, sonst würde die Klammer nicht steigen.'), 'other',
            T('Whether the clip rises depends on the forces on the clip (the magnet and the Earth), not on its pull on the magnet, which acts on another body.', 'Ob die Klammer steigt, hängt von den Kräften auf die Klammer ab (Magnet und Erde), nicht von ihrer Kraft auf den Magneten, die auf einen anderen Körper wirkt.')),
        ],
        effect: T('The light clip jumps up to the magnet; the hand that holds the magnet hardly feels the extra pull.', 'Die leichte Klammer springt zum Magneten hoch; die Hand, die den Magneten hält, spürt den zusätzlichen Zug kaum.'),
      },
      skater: {
        title: T('Skater and wall', 'Eisläuferin und Bande'),
        text: T('A skater stands on the ice next to the wall of the rink and pushes herself off it. She glides away from the wall.', 'Eine Eisläuferin steht auf dem Eis neben der Bande und stösst sich davon ab. Sie gleitet von der Bande weg.'),
        force: T('the skater pushes the wall to the right', 'die Eisläuferin drückt die Bande nach rechts'),
        partner: T('the wall pushes the skater to the left', 'die Bande drückt die Eisläuferin nach links'),
        bodies: T('the skater and the wall', 'der Eisläuferin und der Bande'),
        draw: (f) => {
          let g = D.rect(0, 170, 360, 12, 'ice', 0) + D.line(0, 170, 230, 170, 'gline') + D.ground(230, 360, 170) + D.rect(230, 40, 20, 130, 'solid', 0) + D.person(190, 168, 110, 1, 'push', true);
          g += D.words(240, 32, T('wall', 'Bande'));
          if (f.force) g += D.arrow(230, 87, 278, 87, 'f', '') + D.words(256, 76, T('skater on wall', 'Läuferin → Bande'), 'start');
          if (f.partner) g += D.arrow(229, 87, 181, 87, 'f', '', { cls: 'pair' }) + D.words(170, 78, T('wall on skater', 'Bande → Läuferin'), 'end');
          return D.svg(360, 196, g, T('A skater pushing herself off the wall of the rink', 'Eine Eisläuferin stösst sich von der Bande ab'));
        },
        wrong: [
          o(T('None: a wall cannot push, it is only in the way.', 'Keine: Eine Bande kann nicht drücken, sie ist nur im Weg.'), 'obstacle',
            T('The wall is pressed together a tiny bit and pushes back like a stiff spring. That push is what sends the skater gliding off.', 'Die Bande wird ein klein wenig zusammengedrückt und drückt zurück wie eine steife Feder. Genau diese Kraft lässt die Eisläuferin davongleiten.')),
          o(T('The ground pushes the wall to the left (it holds the wall in place).', 'Der Boden drückt die Bande nach links (er hält sie fest).'), 'pair-confusion',
            T('That force also acts on the wall: it balances the skater’s push, but it is not its partner. Partners act on two different bodies — here the skater and the wall.', 'Diese Kraft wirkt auch auf die Bande: Sie hält der Kraft der Eisläuferin das Gleichgewicht, ist aber nicht ihre Gegenkraft. Kraft und Gegenkraft wirken auf zwei verschiedene Körper — hier die Eisläuferin und die Bande.')),
          o(T('The ice pushes the skater up.', 'Das Eis drückt die Eisläuferin nach oben.'), 'other',
            T('That is an interaction between the ice and the skater. The partner of a force of the skater on the wall is a force of the wall on the skater.', 'Das ist eine Wechselwirkung zwischen dem Eis und der Eisläuferin. Die Gegenkraft zu einer Kraft der Eisläuferin auf die Bande ist eine Kraft der Bande auf die Eisläuferin.')),
        ],
        size: T('How hard does the wall push on the skater, compared with her push on the wall?', 'Wie stark drückt die Bande auf die Eisläuferin, verglichen mit ihrer Kraft auf die Bande?'),
        sizes: [
          o(T('Less hard, since the skater does the pushing.', 'Weniger stark, weil die Eisläuferin drückt.'), 'active-wins',
            T('Who pushes does not matter: the push between skater and wall is one interaction, and its two forces are equally large.', 'Wer drückt, spielt keine Rolle: Das Drücken zwischen Eisläuferin und Bande ist eine einzige Wechselwirkung, und ihre beiden Kräfte sind gleich gross.')),
          o(T('Not at all, since the wall does not move.', 'Gar nicht, weil sich die Bande nicht bewegt.'), 'obstacle',
            T('The wall does not move because the ground holds it, but it still pushes back: without that push, the skater would not glide off.', 'Die Bande bewegt sich nicht, weil der Boden sie festhält, aber sie drückt trotzdem zurück: Ohne diese Kraft würde die Eisläuferin nicht davongleiten.')),
          o(T('Harder, since the wall is much heavier than the skater.', 'Stärker, weil die Bande viel schwerer ist als die Eisläuferin.'), 'mass-wins',
            T('The masses decide the effects, not the forces: the two forces of an interaction are always equally large.', 'Die Massen bestimmen die Wirkungen, nicht die Kräfte: Die beiden Kräfte einer Wechselwirkung sind immer gleich gross.')),
        ],
        effect: T('The skater glides off to the left; the wall, held by the ground, does not move.', 'Die Eisläuferin gleitet nach links davon; die Bande, die der Boden festhält, bewegt sich nicht.'),
      },
      cart: {
        title: T('Child and cart', 'Kind und Leiterwagen'),
        text: T('A child pulls a cart across the playground by its handle; the cart gets faster.', 'Ein Kind zieht einen Leiterwagen an der Deichsel über den Pausenplatz; der Wagen wird schneller.'),
        force: T('the child pulls the cart forward', 'das Kind zieht den Wagen nach vorn'),
        partner: T('the cart pulls the child backward', 'der Wagen zieht das Kind nach hinten'),
        bodies: T('the child and the cart', 'dem Kind und dem Wagen'),
        draw: (f) => {
          let g = D.ground(0, 360, 180) + D.rect(50, 128, 110, 34, 'obj', 2) + D.ball(75, 168, 11, 'wheel') + D.ball(135, 168, 11, 'wheel');
          g += D.line(160, 140, 251, 105, 'cable') + D.person(282, 178, 104, -1, 'hold') + D.arrow(30, 40, 80, 40, 'm', '', { head: 7 }) + D.words(88, 44, T('speeding up', 'wird schneller'), 'start');
          if (f.force) g += D.arrow(160, 140, 199, 125, 'f', '') + D.words(170, 158, T('child on cart', 'Kind → Wagen'), 'start');
          if (f.partner) g += D.arrow(251, 105, 212, 120, 'f', '', { cls: 'pair' }) + D.words(236, 94, T('cart on child', 'Wagen → Kind'), 'end');
          return D.svg(360, 196, g, T('A child pulling a cart', 'Ein Kind zieht einen Leiterwagen'));
        },
        wrong: [
          o(T('None: the cart only follows; it does not pull.', 'Keine: Der Wagen folgt nur; er zieht nicht.'), 'obstacle',
            T('The handle is stretched a tiny bit and the cart pulls back on the child: the child feels it in the arm. Every force has a partner.', 'Die Deichsel wird ein klein wenig gedehnt, und der Wagen zieht am Kind zurück: Das Kind spürt es im Arm. Jede Kraft hat eine Gegenkraft.')),
          o(T('The ground pushes the cart backward (friction).', 'Der Boden drückt den Wagen nach hinten (Reibung).'), 'pair-confusion',
            T('That force also acts on the cart. Partners act on two different bodies: here the child and the cart.', 'Diese Kraft wirkt auch auf den Wagen. Kraft und Gegenkraft wirken auf zwei verschiedene Körper: hier das Kind und den Wagen.')),
          o(T('The ground pushes the child’s feet forward.', 'Der Boden drückt die Füsse des Kindes nach vorn.'), 'other',
            T('That is an interaction between the ground and the child. The partner of a force of the child on the cart is a force of the cart on the child.', 'Das ist eine Wechselwirkung zwischen Boden und Kind. Die Gegenkraft zu einer Kraft des Kindes auf den Wagen ist eine Kraft des Wagens auf das Kind.')),
        ],
        size: T('How hard does the cart pull on the child, compared with the pull of the child on the cart?', 'Wie stark zieht der Wagen am Kind, verglichen mit der Kraft des Kindes auf den Wagen?'),
        sizes: [
          o(T('Less hard, otherwise the child could not get the cart moving.', 'Weniger stark, sonst könnte das Kind den Wagen nicht in Bewegung bringen.'), 'other',
            T('Whether the cart speeds up depends on the forces on the cart (the child and the ground), not on its pull on the child, which acts on another body.', 'Ob der Wagen schneller wird, hängt von den Kräften auf den Wagen ab (Kind und Boden), nicht von seiner Kraft auf das Kind, die auf einen anderen Körper wirkt.')),
          o(T('Less hard, since the child does the pulling.', 'Weniger stark, weil das Kind zieht.'), 'active-wins',
            T('Who pulls does not matter: the pull between child and cart is one interaction, and its two forces are equally large.', 'Wer zieht, spielt keine Rolle: Das Ziehen zwischen Kind und Wagen ist eine einzige Wechselwirkung, und ihre beiden Kräfte sind gleich gross.')),
          o(T('Harder, since the loaded cart is heavier than the child.', 'Stärker, weil der beladene Wagen schwerer ist als das Kind.'), 'mass-wins',
            T('The masses decide the effects, not the forces: the two forces of an interaction are always equally large.', 'Die Massen bestimmen die Wirkungen, nicht die Kräfte: Die beiden Kräfte einer Wechselwirkung sind immer gleich gross.')),
        ],
        effect: T('The cart speeds up, because the child pulls it harder than the ground holds it back; the child speeds up, because the ground pushes the feet forward harder than the cart pulls back.', 'Der Wagen wird schneller, weil das Kind stärker zieht, als der Boden ihn bremst; das Kind wird schneller, weil der Boden seine Füsse stärker nach vorn drückt, als der Wagen zurückzieht.'),
      },
      spheres: {
        title: T('Two charged spheres', 'Zwei geladene Kugeln'),
        text: T('Two small spheres of equal mass hang from threads. The left one carries three times the charge of the right one, of the same sign, and they push each other apart.', 'Zwei kleine Kugeln gleicher Masse hängen an Fäden. Die linke trägt die dreifache Ladung der rechten, mit gleichem Vorzeichen, und sie stossen sich gegenseitig ab.'),
        force: T('the left sphere pushes the right sphere to the right', 'die linke Kugel stösst die rechte nach rechts'),
        partner: T('the right sphere pushes the left sphere to the left', 'die rechte Kugel stösst die linke nach links'),
        bodies: T('the two spheres', 'den beiden Kugeln'),
        draw: (f) => {
          let g = D.ceiling(100, 260, 20) + D.line(180, 20, 140, 132, 'cable') + D.line(180, 20, 220, 132, 'cable');
          g += D.ball(140, 140, 13, 'obj') + D.text(140, 145, '3+', 'lbl small') + D.ball(220, 140, 13, 'obj') + D.text(220, 145, '+', 'lbl small');
          if (f.force) g += D.arrow(236, 140, 284, 140, 'f', '') + D.words(262, 170, T('on the right sphere', 'auf die rechte Kugel'));
          if (f.partner) g += D.arrow(124, 140, 76, 140, 'f', '', { cls: 'pair' }) + D.words(98, 170, T('on the left sphere', 'auf die linke Kugel'));
          return D.svg(360, 184, g, T('Two charged spheres hanging from threads', 'Zwei geladene Kugeln an Fäden'));
        },
        wrong: [
          o(T('The thread pulls the right sphere up and to the left.', 'Der Faden zieht die rechte Kugel nach oben und nach links.'), 'pair-confusion',
            T('That force also acts on the right sphere. Partners act on two different bodies of one interaction: here the two spheres.', 'Diese Kraft wirkt auch auf die rechte Kugel. Kraft und Gegenkraft wirken auf die zwei verschiedenen Körper einer Wechselwirkung: hier die beiden Kugeln.')),
          o(T('None: the right sphere’s charge is too small to push the left one.', 'Keine: Die Ladung der rechten Kugel ist zu klein, um die linke zu stossen.'), 'mass-wins',
            T('Every force has a partner, whatever the charges: the right sphere pushes the left one just as hard.', 'Jede Kraft hat eine Gegenkraft, egal wie gross die Ladungen sind: Die rechte Kugel stösst die linke genauso stark.')),
          o(T('The right sphere pulls the left sphere towards it.', 'Die rechte Kugel zieht die linke zu sich hin.'), 'other',
            T('Charges of the same sign repel each other, both ways: the right sphere pushes the left one away. The partner points opposite to the force because it acts on the other body.', 'Ladungen mit gleichem Vorzeichen stossen sich gegenseitig ab: Die rechte Kugel stösst die linke weg. Die Gegenkraft zeigt entgegengesetzt, weil sie auf den anderen Körper wirkt.')),
        ],
        size: T('How large is the push of the right sphere on the left one, compared with the push of the left sphere on the right one?', 'Wie gross ist die Kraft der rechten Kugel auf die linke, verglichen mit der Kraft der linken Kugel auf die rechte?'),
        sizes: [
          o(T('A third as large, since the right sphere has only a third of the charge.', 'Ein Drittel so gross, weil die rechte Kugel nur einen Drittel der Ladung hat.'), 'mass-wins',
            T('The push depends on both charges together, and it is one interaction: the two forces are equally large, whatever the charges.', 'Die Kraft hängt von beiden Ladungen zusammen ab, und es ist eine einzige Wechselwirkung: Die beiden Kräfte sind gleich gross, egal wie gross die Ladungen sind.')),
          o(T('Smaller, since the left sphere does the pushing with its larger charge.', 'Kleiner, weil die linke Kugel mit ihrer grösseren Ladung stösst.'), 'active-wins',
            T('Neither sphere “does” the pushing alone: the repulsion is one interaction between the two, and both forces are equally large.', 'Keine der beiden Kugeln stösst allein: Die Abstossung ist eine Wechselwirkung zwischen beiden, und beide Kräfte sind gleich gross.')),
          o(T('Larger, since the right sphere, with its small charge, is easier to push.', 'Grösser, weil die rechte Kugel mit ihrer kleinen Ladung leichter zu stossen ist.'), 'other',
            T('How easily a sphere is pushed aside depends on its mass, not on its charge, and it does not change the size of the forces: the two are equally large.', 'Wie leicht eine Kugel zur Seite gestossen wird, hängt von ihrer Masse ab, nicht von ihrer Ladung, und es ändert die Grösse der Kräfte nicht: Die beiden sind gleich gross.')),
        ],
        effect: T('With equal masses, the two spheres swing out equally far: equal forces, whatever the charges.', 'Bei gleichen Massen schwingen die beiden Kugeln gleich weit aus: gleiche Kräfte, egal wie gross die Ladungen sind.'),
      },
      jump: {
        title: T('Jumping up', 'Hochspringen'),
        text: T('A girl jumps straight up. While she pushes off, the floor pushes her up harder than her weight, and she speeds up.', 'Ein Mädchen springt senkrecht hoch. Während es sich abstösst, drückt der Boden es stärker nach oben, als seine Gewichtskraft beträgt, und es wird schneller.'),
        force: T('the floor pushes the girl up', 'der Boden drückt das Mädchen nach oben'),
        partner: T('the girl pushes the floor down', 'das Mädchen drückt den Boden nach unten'),
        bodies: T('the floor and the girl', 'dem Boden und dem Mädchen'),
        draw: (f) => {
          let g = D.ground(40, 320, 180) + D.person(170, 178, 110, 1, 'down') + D.arrow(300, 110, 300, 64, 'v', 'v');
          if (f.force) g += D.arrow(184, 178, 184, 132, 'f', '') + D.words(192, 146, T('floor on girl', 'Boden → Mädchen'), 'start');
          if (f.partner) g += D.arrow(157, 180, 157, 222, 'f', '', { cls: 'pair' }) + D.words(149, 214, T('girl on floor', 'Mädchen → Boden'), 'end');
          return D.svg(360, 236, g, T('A girl jumping up from the floor', 'Ein Mädchen springt vom Boden hoch'));
        },
        wrong: [
          o(T('The Earth pulls the girl down (her weight).', 'Die Erde zieht das Mädchen nach unten (seine Gewichtskraft).'), 'pair-confusion',
            T('That force also acts on the girl, and it is even smaller than the push of the floor while she pushes off. Partners act on two different bodies — here the floor and the girl.', 'Diese Kraft wirkt auch auf das Mädchen, und sie ist beim Abstossen sogar kleiner als die Kraft des Bodens. Kraft und Gegenkraft wirken auf zwei verschiedene Körper — hier den Boden und das Mädchen.')),
          o(T('None: the floor only stays where it is.', 'Keine: Der Boden bleibt einfach, wo er ist.'), 'obstacle',
            T('The girl presses the floor together a tiny bit; it pushes back like a stiff spring. Every force has a partner of the same size.', 'Das Mädchen drückt den Boden ein klein wenig zusammen; er drückt zurück wie eine steife Feder. Jede Kraft hat eine gleich grosse Gegenkraft.')),
          o(T('The girl pulls the Earth up.', 'Das Mädchen zieht die Erde nach oben.'), 'other',
            T('That is the partner of her weight, an interaction between the Earth and the girl. The partner of a push of the floor on the girl is a push of the girl on the floor.', 'Das ist die Gegenkraft zu ihrer Gewichtskraft, eine Wechselwirkung zwischen der Erde und dem Mädchen. Die Gegenkraft zu einer Kraft des Bodens auf das Mädchen ist eine Kraft des Mädchens auf den Boden.')),
        ],
        size: T('How hard does the girl push the floor down, compared with the push of the floor on her?', 'Wie stark drückt das Mädchen auf den Boden, verglichen mit der Kraft des Bodens auf das Mädchen?'),
        sizes: [
          o(T('Less hard, otherwise she could not take off.', 'Weniger stark, sonst könnte es nicht abspringen.'), 'other',
            T('Whether she takes off depends on the forces on her (the floor and the Earth), not on her push on the floor, which acts on another body.', 'Ob es abspringt, hängt von den Kräften auf das Mädchen ab (Boden und Erde), nicht von seiner Kraft auf den Boden, die auf einen anderen Körper wirkt.')),
          o(T('Harder, since she is the one who pushes off.', 'Stärker, weil das Mädchen sich abstösst.'), 'active-wins',
            T('Who pushes does not matter: the push between the girl and the floor is one interaction, and its two forces are equally large.', 'Wer drückt, spielt keine Rolle: Das Drücken zwischen Mädchen und Boden ist eine einzige Wechselwirkung, und ihre beiden Kräfte sind gleich gross.')),
          o(T('Less hard, since she is so much lighter than the floor and the Earth below it.', 'Weniger stark, weil das Mädchen so viel leichter ist als der Boden und die Erde darunter.'), 'mass-wins',
            T('The masses decide the effects, not the forces: the two forces of an interaction are always equally large.', 'Die Massen bestimmen die Wirkungen, nicht die Kräfte: Die beiden Kräfte einer Wechselwirkung sind immer gleich gross.')),
        ],
        effect: T('The floor pushes her up harder than the Earth pulls her down, so she speeds up and leaves the floor; the floor, fixed to the Earth, does not noticeably move.', 'Der Boden drückt das Mädchen stärker nach oben, als die Erde es nach unten zieht, also wird es schneller und hebt ab; der Boden, fest mit der Erde verbunden, bewegt sich nicht spürbar.'),
      },
      bird: {
        title: T('A hovering bird', 'Ein schwebender Vogel'),
        text: T('A hummingbird hovers in front of a flower. With its wings it pushes air down.', 'Ein Kolibri schwebt vor einer Blüte. Mit seinen Flügeln drückt er Luft nach unten.'),
        force: T('the air pushes the bird up', 'die Luft drückt den Vogel nach oben'),
        partner: T('the bird pushes the air down', 'der Vogel drückt die Luft nach unten'),
        bodies: T('the air and the bird', 'der Luft und dem Vogel'),
        draw: (f) => {
          let g = `<path class="trace" d="M160 128 v44 M180 132 v44 M200 128 v44"/>` + `<ellipse class="obj" cx="180" cy="100" rx="24" ry="10"/>` + D.ball(206, 92, 7, 'obj') + D.line(213, 92, 236, 96, 'ln');
          g += `<polygon class="obj" points="172,94 150,58 192,92"/>` + `<polygon class="obj" points="176,108 150,128 190,106"/>`;
          if (f.force) g += D.arrow(180, 100, 180, 54, 'f', '') + D.words(144, 74, T('air on bird', 'Luft → Vogel'), 'end');
          if (f.partner) g += D.arrow(190, 114, 190, 160, 'f', '', { cls: 'pair' }) + D.words(208, 150, T('bird on air', 'Vogel → Luft'), 'start');
          return D.svg(360, 190, g, T('A hummingbird hovering in the air', 'Ein Kolibri schwebt in der Luft'));
        },
        wrong: [
          o(T('The Earth pulls the bird down (its weight).', 'Die Erde zieht den Vogel nach unten (seine Gewichtskraft).'), 'pair-confusion',
            T('That force also acts on the bird: it balances the push of the air, but it is not its partner. Partners act on two different bodies — here the air and the bird.', 'Diese Kraft wirkt auch auf den Vogel: Sie hält der Kraft der Luft das Gleichgewicht, ist aber nicht ihre Gegenkraft. Kraft und Gegenkraft wirken auf zwei verschiedene Körper — hier die Luft und den Vogel.')),
          o(T('None: the air just gives way.', 'Keine: Die Luft weicht einfach aus.'), 'obstacle',
            T('The air gives way because the bird pushes it down — and the air pushes the bird up just as hard. Every force has a partner.', 'Die Luft weicht aus, weil der Vogel sie nach unten drückt — und die Luft drückt den Vogel genauso stark nach oben. Jede Kraft hat eine Gegenkraft.')),
          o(T('The bird pulls the Earth up.', 'Der Vogel zieht die Erde nach oben.'), 'other',
            T('That is the partner of its weight, an interaction between the Earth and the bird. The partner of a force of the air on the bird is a force of the bird on the air.', 'Das ist die Gegenkraft zu seiner Gewichtskraft, eine Wechselwirkung zwischen der Erde und dem Vogel. Die Gegenkraft zu einer Kraft der Luft auf den Vogel ist eine Kraft des Vogels auf die Luft.')),
        ],
        size: T('How hard does the bird push the air down, compared with the push of the air on the bird?', 'Wie stark drückt der Vogel die Luft nach unten, verglichen mit der Kraft der Luft auf den Vogel?'),
        sizes: [
          o(T('Far less hard, since air is so light.', 'Viel weniger stark, weil Luft so leicht ist.'), 'mass-wins',
            T('The mass decides how much the force changes the velocity, not how large the force is: the two forces of an interaction are always equally large.', 'Die Masse bestimmt, wie stark die Kraft die Geschwindigkeit ändert, nicht wie gross die Kraft ist: Die beiden Kräfte einer Wechselwirkung sind immer gleich gross.')),
          o(T('Harder, since the bird beats its wings and the air does nothing.', 'Stärker, weil der Vogel mit den Flügeln schlägt und die Luft nichts tut.'), 'active-wins',
            T('Who moves does not matter: the push between wings and air is one interaction, and its two forces are equally large.', 'Wer sich bewegt, spielt keine Rolle: Das Drücken zwischen Flügeln und Luft ist eine einzige Wechselwirkung, und ihre beiden Kräfte sind gleich gross.')),
          o(T('Less hard, otherwise the bird could not stay up.', 'Weniger stark, sonst könnte der Vogel nicht oben bleiben.'), 'other',
            T('Whether the bird stays up depends on the forces on the bird (the air and the Earth), not on its push on the air, which acts on another body.', 'Ob der Vogel oben bleibt, hängt von den Kräften auf den Vogel ab (Luft und Erde), nicht von seiner Kraft auf die Luft, die auf einen anderen Körper wirkt.')),
        ],
        effect: T('The air is pushed down and streams away below the bird; the bird is held up: each force acts on its own body.', 'Die Luft wird nach unten gedrückt und strömt unter dem Vogel weg; der Vogel wird oben gehalten: Jede Kraft wirkt auf ihren eigenen Körper.'),
      },
    };
  }
  const PARTNER_SCENES = ['mosquito', 'electron', 'dancer', 'hammer', 'moon', 'tennis', 'clip', 'skater', 'cart', 'spheres', 'jump', 'bird'];

  function partner(r, p) {
    const key = p.scene || r.pick(PARTNER_SCENES), sc = partnerScenes()[key];
    const figure = (f = {}) => sc.draw(f);
    const right = T(`Right: the force is an interaction between ${sc.bodies}; its partner is the force with the two bodies swapped.`, `Richtig: Die Kraft ist eine Wechselwirkung zwischen ${sc.bodies}; ihre Gegenkraft ist die Kraft mit den beiden Körpern vertauscht.`);
    const equal = `${T('Right.', 'Richtig.')} ${third()} ${sc.effect}`;
    const questions = [
      q(r, 'partner', T(`In the picture, ${sc.force}. What is the third-law partner of this force?`, `Im Bild: ${cap(sc.force)}. Was ist die Gegenkraft nach dem dritten Newtonschen Gesetz?`),
        [o(`${cap(sc.partner)}.`, 'ok', right), ...sc.wrong]),
      q(r, 'size', sc.size, [o(T('Just as hard: the two forces are equally large.', 'Genauso stark: Die beiden Kräfte sind gleich gross.'), 'ok', equal), ...sc.sizes]),
    ];
    return {
      title: sc.title,
      situation: `<p>${sc.text}</p>`,
      figure: figure({ force: true }),
      questions,
      hints: [
        T(`The arrow in the picture: ${sc.force}. Which body exerts this force, and on which body does it act?`, `Der Pfeil im Bild: ${cap(sc.force)}. Welcher Körper übt diese Kraft aus, und auf welchen Körper wirkt sie?`),
        T('Plan: name the two bodies of this interaction, swap them to get the partner (it acts on the other body), then use the third law for its size.', 'Plan: Nenne die beiden Körper dieser Wechselwirkung, vertausche sie, um die Gegenkraft zu erhalten (sie wirkt auf den anderen Körper), und wende dann für ihre Grösse das dritte Gesetz an.'),
        T(`Recall the third law for the interaction between ${sc.bodies}: what does it say about the size and direction of the partner, compared with the force in the picture? Does it depend on which of them is heavier or which one moves?`,
          `Erinnere dich an das dritte Gesetz für die Wechselwirkung zwischen ${sc.bodies}: Was sagt es über Grösse und Richtung der Gegenkraft, verglichen mit der Kraft im Bild? Hängt das davon ab, welcher Körper schwerer ist oder welcher sich bewegt?`),
        T('Here: for each option, name who exerts the force and on whom. Which one has the same two bodies as the arrow in the picture, swapped?', 'Hier: Nenne bei jeder Antwort, wer die Kraft auf wen ausübt. Welche hat dieselben zwei Körper wie der Pfeil im Bild, vertauscht?'),
      ],
      steps: [
        { title: T('The interaction', 'Die Wechselwirkung'), figure: figure({ force: true }),
          text: T(`${cap(sc.force)}: an interaction between ${sc.bodies}. ${swap()}`, `${cap(sc.force)}: eine Wechselwirkung zwischen ${sc.bodies}. ${swap()}`) },
        { title: T('The partner', 'Die Gegenkraft'), figure: figure({ force: true, partner: true }),
          text: T(`So the partner is: ${sc.partner}. ${third()}`, `Die Gegenkraft ist also: ${sc.partner}. ${third()}`) },
        { title: T('Equal forces, different effects', 'Gleiche Kräfte, verschiedene Wirkungen'), figure: figure({ force: true, partner: true }),
          text: T(`Each force acts on its own body, so they do not cancel. ${sc.effect}`, `Jede Kraft wirkt auf ihren eigenen Körper, also heben sie sich nicht auf. ${sc.effect}`) },
      ],
    };
  }

  // ================================================================ find the error: a list of force pairs
  // A student lists the third-law pairs of a situation; one "pair" is wrong: two forces on the same
  // body (mostly the weight and the force of the support). Each scene: its forces { id: [text,
  // arrow] } (arrow: [x1, y1, x2, y2], drawn in the solution), its pairs [a, b, code] (code: the
  // misconception behind calling that right pair wrong), and the wrong "pairs" [a, b, body, alt]
  // (body: the body both act on; alt: a tempting wrong reason why the pair is wrong).
  const NAMES = ['Mia', 'Leo', 'Sara', 'Tom', 'Lena', 'Noah', 'Eva', 'Jonas'];

  function errorScenes(r) {
    const [a, b] = r.shuffle(['Anna', 'Ben', 'Lara', 'Luca', 'Nina', 'Tim']);
    return {
      book: {
        text: T('A book lies on a table, which stands on the floor.', 'Ein Buch liegt auf einem Tisch, der auf dem Boden steht.'),
        draw: () => D.ground(20, 340, 200) + D.table(110, 120, 140, 200) + D.rect(150, 104, 60, 16, 'obj', 2) + D.words(144, 116, T('book', 'Buch'), 'end'),
        forces: {
          eb: [T('the Earth pulls the book down', 'die Erde zieht das Buch nach unten'), [172, 112, 172, 158]],
          be: [T('the book pulls the Earth up', 'das Buch zieht die Erde nach oben'), [40, 236, 40, 200]],
          tb: [T('the table pushes the book up', 'der Tisch drückt das Buch nach oben'), [188, 120, 188, 74]],
          bt: [T('the book pushes the table down', 'das Buch drückt den Tisch nach unten'), [204, 120, 204, 162]],
          et: [T('the Earth pulls the table down', 'die Erde zieht den Tisch nach unten'), [150, 124, 150, 170]],
          te: [T('the table pulls the Earth up', 'der Tisch zieht die Erde nach oben'), [70, 236, 70, 200]],
          ft: [T('the floor pushes the table up', 'der Boden drückt den Tisch nach oben'), [248, 200, 248, 156]],
          tf: [T('the table pushes the floor down', 'der Tisch drückt den Boden nach unten'), [240, 202, 240, 242]],
        },
        pairs: [['eb', 'be', 'mass-wins'], ['tb', 'bt', 'obstacle'], ['et', 'te', 'mass-wins'], ['ft', 'tf', 'obstacle']],
        wrongs: [
          ['eb', 'tb', T('the book', 'das Buch'), o(T('The table does not push at all: it is only in the way.', 'Der Tisch drückt gar nicht: Er ist nur im Weg.'), 'obstacle',
            T('The table is pressed together a tiny bit and pushes back like a stiff spring; without that push, the book would fall.', 'Der Tisch wird ein klein wenig zusammengedrückt und drückt zurück wie eine steife Feder; ohne diese Kraft würde das Buch fallen.'))],
          ['et', 'ft', T('the table', 'den Tisch'), o(T('The floor does not push at all: it is only in the way.', 'Der Boden drückt gar nicht: Er ist nur im Weg.'), 'obstacle',
            T('The floor is pressed together a tiny bit and pushes back like a stiff spring; without that push, the table would sink in.', 'Der Boden wird ein klein wenig zusammengedrückt und drückt zurück wie eine steife Feder; ohne diese Kraft würde der Tisch einsinken.'))],
        ],
        h: 244,
      },
      lamp: {
        text: T('A lamp hangs from a cord fixed to the ceiling.', 'Eine Lampe hängt an einem Kabel, das an der Decke befestigt ist.'),
        draw: () => D.ceiling(100, 260, 30) + D.line(180, 30, 180, 116, 'cable') + `<polygon class="obj" points="164,116 196,116 214,152 146,152"/>` + D.ground(20, 340, 222),
        forces: {
          el: [T('the Earth pulls the lamp down', 'die Erde zieht die Lampe nach unten'), [172, 134, 172, 182]],
          le: [T('the lamp pulls the Earth up', 'die Lampe zieht die Erde nach oben'), [50, 258, 50, 222]],
          cl: [T('the cord pulls the lamp up', 'das Kabel zieht die Lampe nach oben'), [174, 116, 174, 72]],
          lc: [T('the lamp pulls the cord down', 'die Lampe zieht das Kabel nach unten'), [186, 116, 186, 152]],
          hc: [T('the ceiling pulls the cord up', 'die Decke zieht das Kabel nach oben'), [174, 30, 174, 2]],
          ch: [T('the cord pulls the ceiling down', 'das Kabel zieht die Decke nach unten'), [186, 30, 186, 66]],
        },
        pairs: [['el', 'le', 'mass-wins'], ['cl', 'lc', 'obstacle'], ['hc', 'ch', 'obstacle']],
        wrongs: [
          ['el', 'cl', T('the lamp', 'die Lampe'), o(T('The cord does not pull at all: the lamp just hangs from it.', 'Das Kabel zieht gar nicht: Die Lampe hängt nur daran.'), 'obstacle',
            T('The cord is stretched a tiny bit and pulls back like a stiff spring; without that pull, the lamp would fall.', 'Das Kabel wird ein klein wenig gedehnt und zieht zurück wie eine steife Feder; ohne diese Kraft würde die Lampe fallen.'))],
          ['lc', 'hc', T('the cord', 'das Kabel'), o(T('The ceiling does not pull at all: the cord is only fixed to it.', 'Die Decke zieht gar nicht: Das Kabel ist nur daran befestigt.'), 'obstacle',
            T('The ceiling is stretched a tiny bit where the cord is fixed and pulls back; without that pull, the cord and the lamp would fall.', 'Die Decke wird dort, wo das Kabel befestigt ist, ein klein wenig gedehnt und zieht zurück; ohne diese Kraft würden Kabel und Lampe fallen.'))],
        ],
        h: 264,
      },
      dancers: {
        text: T(`Two ice dancers, ${a} (left) and ${b} (right), stand on the ice and push each other apart.`, `Zwei Eistänzer, ${a} (links) und ${b} (rechts), stehen auf dem Eis und stossen sich voneinander ab.`),
        draw: () => D.rect(0, 186, 360, 12, 'ice', 0) + D.line(0, 186, 360, 186, 'gline') + D.person(140, 184, 100, 1, 'push', true) + D.person(212, 184, 100, -1, 'hold', true) +
          D.words(140, 70, a) + D.words(212, 70, b),
        forces: {
          ea: [T(`the Earth pulls ${a} down`, `die Erde zieht ${a} nach unten`), [140, 144, 140, 182]],
          ae: [T(`${a} pulls the Earth up`, `${a} zieht die Erde nach oben`), [30, 250, 30, 212]],
          ia: [T(`the ice pushes ${a} up`, `das Eis drückt ${a} nach oben`), [154, 186, 154, 140]],
          ai: [T(`${a} pushes the ice down`, `${a} drückt das Eis nach unten`), [128, 188, 128, 228]],
          ab: [T(`${a} pushes ${b} to the right`, `${a} drückt ${b} nach rechts`), [180, 104, 224, 104]],
          ba: [T(`${b} pushes ${a} to the left`, `${b} drückt ${a} nach links`), [174, 116, 130, 116]],
          eb: [T(`the Earth pulls ${b} down`, `die Erde zieht ${b} nach unten`), [212, 144, 212, 182]],
          be: [T(`${b} pulls the Earth up`, `${b} zieht die Erde nach oben`), [330, 250, 330, 212]],
          ib: [T(`the ice pushes ${b} up`, `das Eis drückt ${b} nach oben`), [198, 186, 198, 140]],
          bi: [T(`${b} pushes the ice down`, `${b} drückt das Eis nach unten`), [224, 188, 224, 228]],
        },
        pairs: [['ea', 'ae', 'mass-wins'], ['ia', 'ai', 'obstacle'], ['ab', 'ba', 'active-wins'], ['eb', 'be', 'mass-wins'], ['ib', 'bi', 'obstacle']],
        wrongs: [
          ['ea', 'ia', a, o(T(`The ice does not push at all: ${a} only stands on it.`, `Das Eis drückt gar nicht: ${a} steht nur darauf.`), 'obstacle',
            T(`The ice is pressed together a tiny bit and pushes back like a stiff spring; without that push, ${a} would sink in.`, `Das Eis wird ein klein wenig zusammengedrückt und drückt zurück wie eine steife Feder; ohne diese Kraft würde ${a} einsinken.`))],
          ['eb', 'ib', b, o(T(`The ice does not push at all: ${b} only stands on it.`, `Das Eis drückt gar nicht: ${b} steht nur darauf.`), 'obstacle',
            T(`The ice is pressed together a tiny bit and pushes back like a stiff spring; without that push, ${b} would sink in.`, `Das Eis wird ein klein wenig zusammengedrückt und drückt zurück wie eine steife Feder; ohne diese Kraft würde ${b} einsinken.`))],
        ],
        h: 256,
      },
      car: {
        text: T('A car drives along a level road at constant speed.', 'Ein Auto fährt mit konstanter Geschwindigkeit auf einer ebenen Strasse.'),
        draw: () => D.ground(0, 360, 170) + D.car(110, 170, 140) + D.arrow(30, 40, 80, 40, 'v', 'v'),
        forces: {
          ec: [T('the Earth pulls the car down', 'die Erde zieht das Auto nach unten'), [180, 126, 180, 168]],
          ce: [T('the car pulls the Earth up', 'das Auto zieht die Erde nach oben'), [40, 216, 40, 180]],
          rc: [T('the road pushes the car up', 'die Strasse drückt das Auto nach oben'), [222, 168, 222, 126]],
          cr: [T('the car pushes the road down', 'das Auto drückt die Strasse nach unten'), [214, 172, 214, 212]],
          dc: [T('the road pushes the tyres forward', 'die Strasse drückt die Reifen nach vorn'), [146, 168, 190, 168]],
          cd: [T('the tyres push the road backward', 'die Reifen drücken die Strasse nach hinten'), [146, 180, 102, 180]],
          ac: [T('the air pushes the car backward', 'die Luft drückt das Auto nach hinten'), [250, 130, 214, 130]],
          ca: [T('the car pushes the air forward', 'das Auto drückt die Luft nach vorn'), [256, 116, 300, 116]],
        },
        pairs: [['ec', 'ce', 'mass-wins'], ['rc', 'cr', 'obstacle'], ['dc', 'cd', 'other'], ['ac', 'ca', 'other']],
        wrongs: [
          ['ec', 'rc', T('the car', 'das Auto'), o(T('The road does not push at all: it only carries the car.', 'Die Strasse drückt gar nicht: Sie trägt das Auto nur.'), 'obstacle',
            T('The road is pressed together a tiny bit and pushes back like a stiff spring; without that push, the car would sink in.', 'Die Strasse wird ein klein wenig zusammengedrückt und drückt zurück wie eine steife Feder; ohne diese Kraft würde das Auto einsinken.'))],
          ['dc', 'ac', T('the car', 'das Auto'), o(T('The road does not push the car forward: the engine does.', 'Die Strasse drückt das Auto nicht nach vorn: Das macht der Motor.'), 'other',
            T('The engine turns the wheels; the tyres push the road backward, and the road pushes them forward. Only a force from outside can push the car.', 'Der Motor dreht die Räder; die Reifen drücken die Strasse nach hinten, und die Strasse drückt sie nach vorn. Nur eine Kraft von aussen kann das Auto antreiben.'))],
        ],
        h: 226,
      },
    };
  }

  function findError(r, p) {
    const key = p.scene || r.pick(['book', 'lamp', 'dancers', 'car']), sc = errorScenes(r)[key];
    const who = p.name || r.pick(NAMES);
    const [w1, w2, body, alt] = r.pick(sc.wrongs);
    const fx = (id) => sc.forces[id][0];
    const partnerOf = (id) => { const pr = sc.pairs.find((x) => x[0] === id || x[1] === id); return pr[0] === id ? pr[1] : pr[0]; };
    // three right pairs, first those that do not use a force of the wrong one, and the wrong one, mixed
    const uses = (x) => [w1, w2].includes(x[0]) || [w1, w2].includes(x[1]);
    const ok = [...r.shuffle(sc.pairs.filter((x) => !uses(x))), ...r.shuffle(sc.pairs.filter(uses))].slice(0, 3);
    const lines = r.shuffle([...ok.map((x) => ({ a: x[0], b: x[1], code: x[2] })), { a: w1, b: w2, wrong: true }]);
    const k = lines.findIndex((x) => x.wrong) + 1;
    const lineText = (x) => `${cap(fx(x.a))} ↔ ${fx(x.b)}`;
    const pairText = (x, i) => `${T('Pair', 'Paar')} ${i + 1}: ${lineText(x)}`;
    const sameBody = T(`Both forces of pair ${k} act on the same body, ${body}. Partners act on two different bodies: they belong to one interaction, with the two bodies swapped.`,
      `Beide Kräfte von Paar ${k} wirken auf denselben Körper, ${body}. Kraft und Gegenkraft wirken auf zwei verschiedene Körper: Sie gehören zu einer Wechselwirkung, mit den beiden Körpern vertauscht.`);
    const real = T(`The partner of “${fx(w1)}” is “${fx(partnerOf(w1))}”, and that of “${fx(w2)}” is “${fx(partnerOf(w2))}”.`,
      `Die Gegenkraft zu „${fx(w1)}“ ist „${fx(partnerOf(w1))}“, die zu „${fx(w2)}“ ist „${fx(partnerOf(w2))}“.`);

    // ---------------------------------------------------------- figure: the scene; in the solution the two forces of the wrong pair, then their partners
    const arrow = (id, cls) => { const [x1, y1, x2, y2] = sc.forces[id][1]; return D.arrow(x1, y1, x2, y2, 'f', '', cls ? { cls } : {}); };
    const figure = (f = {}) => {
      let g = sc.draw();
      if (f.wrong) g += arrow(w1) + arrow(w2);
      if (f.partners) g += arrow(partnerOf(w1), 'pair') + arrow(partnerOf(w2), 'pair');
      if (f.partners && /Earth|Erde/.test(fx(partnerOf(w1)) + fx(partnerOf(w2)))) g += D.words(key === 'dancers' ? 180 : 60, sc.h - 6, T('(arrows at the bottom: on the Earth)', '(Pfeile unten: auf die Erde)'), key === 'dancers' ? 'middle' : 'start');
      return D.svg(360, sc.h, g, sc.text.replace(/<[^>]+>/g, ''));
    };

    const questions = [
      // the pairs in the order of the list (not shuffled)
      { type: 'choice', key: 'wrong', prompt: T(`Which of ${who}'s pairs is wrong?`, `Welches Paar von ${who} ist falsch?`), pics: false, options: lines.map((x, i) => (x.wrong
        ? o(pairText(x, i), 'ok', `${T('Right.', 'Richtig.')} ${sameBody}`)
        : o(pairText(x, i), x.code, T(`Pair ${i + 1} is right: ${fx(x.a)} ↔ ${fx(x.b)} — the same two bodies, swapped.${x.code === 'mass-wins' ? ' However small one body is, it pulls the Earth just as hard as the Earth pulls it.' : ''}`,
          `Paar ${i + 1} stimmt: dieselben zwei Körper, vertauscht.${x.code === 'mass-wins' ? ' Wie klein ein Körper auch ist, er zieht die Erde genauso stark an wie die Erde ihn.' : ''}`)))) },
      q(r, 'why', T(`What is wrong with pair ${k}?`, `Was ist an Paar ${k} falsch?`), [
        o(T(`Both forces act on ${body}; partners act on two different bodies.`, `Beide Kräfte wirken auf ${body}; Kraft und Gegenkraft wirken auf zwei verschiedene Körper.`), 'ok', `${T('Right.', 'Richtig.')} ${sameBody} ${real}`),
        o(T('Nothing: the two forces are equally large and opposite, so they are partners.', 'Nichts: Die beiden Kräfte sind gleich gross und entgegengesetzt, also sind sie Kraft und Gegenkraft.'), 'pair-confusion',
          T(`Equally large and opposite is not enough: two forces that balance on one body are no pair. ${sameBody}`, `Gleich gross und entgegengesetzt genügt nicht: Zwei Kräfte, die sich an einem Körper aufheben, sind kein Paar. ${sameBody}`)),
        o(T('The two forces are not equally large.', 'Die beiden Kräfte sind nicht gleich gross.'), 'other',
          T(`That is not the point: they may well be equally large, but they still are no pair. ${sameBody}`, `Darum geht es nicht: Sie können durchaus gleich gross sein, sind aber trotzdem kein Paar. ${sameBody}`)),
        alt,
      ]),
    ];

    return {
      title: T('Find the error', 'Finde den Fehler'),
      situation: `<p>${sc.text} ${T(`${who} lists the third-law pairs (force ↔ partner):`, `${who} notiert die Paare von Kraft und Gegenkraft (Kraft ↔ Gegenkraft):`)}</p><ol>${lines.map((x) => `<li>${lineText(x)}</li>`).join('')}</ol>`,
      figure: figure(),
      questions,
      hints: [
        T(`${who} lists ${lines.length} pairs. Take pair ${lines.findIndex((x) => !x.wrong) + 1}, “${lineText(lines.find((x) => !x.wrong))}”: who exerts each of the two forces, and on which body does each act? Then do the same for the other pairs.`,
          `${who} notiert ${lines.length} Paare. Nimm Paar ${lines.findIndex((x) => !x.wrong) + 1}, „${lineText(lines.find((x) => !x.wrong))}“: Wer übt jede der beiden Kräfte aus, und auf welchen Körper wirkt sie? Mach dasselbe dann für die anderen Paare.`),
        T(`Plan: in a right pair the two bodies are swapped, “A on B” ↔ “B on A”, and each force has only one partner. Go through ${who}'s pairs 1 to ${lines.length} and look for the one where that is not so.`, `Plan: In einem richtigen Paar sind die beiden Körper vertauscht, „A auf B“ ↔ „B auf A“, und jede Kraft hat nur eine Gegenkraft. Geh die Paare 1 bis ${lines.length} von ${who} durch und suche das, bei dem das nicht so ist.`),
        T('Recall the third law: on how many bodies do the two forces of a pair act? Can two forces that balance each other be a pair?', 'Erinnere dich an das dritte Gesetz: Auf wie viele Körper wirken die beiden Kräfte eines Paars? Können zwei Kräfte, die sich aufheben, ein Paar sein?'),
        T('Here: write next to every force of every pair the body it acts on. Which pair breaks the rule?', 'Hier: Schreibe zu jeder Kraft jedes Paars den Körper, auf den sie wirkt. Welches Paar verletzt die Regel?'),
      ],
      steps: [
        { title: T('Check each pair', 'Jedes Paar prüfen'), figure: figure({ wrong: true }),
          text: T(`In pairs ${lines.map((x, i) => (x.wrong ? null : i + 1)).filter(Boolean).join(', ').replace(/, (\d)$/, ' and $1')}, the two bodies are swapped: they are right. ${sameBody}`,
            `In den Paaren ${lines.map((x, i) => (x.wrong ? null : i + 1)).filter(Boolean).join(', ').replace(/, (\d)$/, ' und $1')} sind die beiden Körper vertauscht: Sie stimmen. ${sameBody}`) },
        { title: T('The real partners', 'Die richtigen Gegenkräfte'), figure: figure({ wrong: true, partners: true }),
          text: `${real} ${T('The two forces of pair', 'Die beiden Kräfte von Paar')} ${k} ${T('belong to two different interactions; that they may balance does not make them a pair.', 'gehören zu zwei verschiedenen Wechselwirkungen; dass sie sich aufheben können, macht sie nicht zu einem Paar.')}` },
      ],
    };
  }

  register('interact', 'partner', partner);
  register('interact', 'find-error', findError);
})(typeof window !== 'undefined' ? window : globalThis);
