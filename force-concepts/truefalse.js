// True/false sets: five statements about one situation, at least two true and two false. The false
// statements are common misconceptions; judging one wrongly is counted as that misconception.
(function (root) {
  'use strict';

  const FC = root.FC || require('./core.js');
  const D = root.Draw || require('./draw.js');
  const { T, F, FL, stmt, tf, register } = FC;

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

  // ================================================================ a ball thrown straight up
  function tfThrow(r) {
    const FG = F('G');
    const only = T('After release, only the weight acts on the ball.', 'Nach dem Loslassen wirkt nur die Gewichtskraft auf den Ball.');
    const all = [
      stmt(T('At the highest point, the acceleration of the ball is zero.', 'Im höchsten Punkt ist die Beschleunigung des Balls null.'), false,
        T('Its velocity is zero there, but only at that instant: it is changing from up to down, so the acceleration is <i>g</i>, downward.', 'Die Geschwindigkeit ist dort null, aber nur in diesem Augenblick: Sie ändert sich gerade von oben nach unten, also Die Beschleunigung ist <i>g</i>, nach unten.'), 'rest-no-force'),
      stmt(T('On the way up, a force from the throw pushes the ball upward.', 'Auf dem Weg nach oben drückt eine Wurfkraft den Ball nach oben.'), false,
        T(`The hand pushes only while it touches the ball. ${only} The ball rises because of its velocity.`, `Die Hand stösst nur, solange sie den Ball berührt. ${only} Der Ball steigt wegen seiner Geschwindigkeit.`), 'impetus'),
      stmt(T('The acceleration of the ball is the same at every point of its flight.', 'Die Beschleunigung des Balls ist in jedem Punkt seines Flugs gleich.'), true,
        T(`${only} So <i>a</i> = ${FG}/<i>m</i> = <i>g</i>, downward, all the time.`, `${only} Also ist <i>a</i> = ${FG}/<i>m</i> = <i>g</i>, nach unten, die ganze Zeit.`)),
      stmt(T('At the highest point, the velocity of the ball is zero.', 'Im höchsten Punkt ist die Geschwindigkeit des Balls null.'), true,
        T('There it turns round: at that instant it stops rising and starts falling.', 'Dort kehrt er um: In diesem Augenblick hört er auf zu steigen und beginnt zu fallen.')),
      stmt(T('On the way down, the ball gets faster by about 9.8 m/s every second.', 'Auf dem Weg nach unten wird der Ball jede Sekunde um etwa 9.8 m/s schneller.'), true,
        T('Its acceleration is <i>g</i> ≈ 9.8 m/s², downward.', 'Seine Beschleunigung ist <i>g</i> ≈ 9.8 m/s², nach unten.')),
      stmt(T('The weight of the ball is larger on the way down than on the way up.', 'Die Gewichtskraft des Balls ist auf dem Weg nach unten grösser als auf dem Weg nach oben.'), false,
        T(`${FG} = <i>m·g</i> does not depend on the motion.`, `${FG} = <i>m·g</i> hängt nicht von der Bewegung ab.`)),
      stmt(T('The ball keeps rising only as long as an upward force acts on it.', 'Der Ball steigt nur so lange, wie eine Kraft nach oben auf ihn wirkt.'), false,
        T(`There is no upward force at all: ${only.charAt(0).toLowerCase() + only.slice(1)} The ball rises because it already moves upward, and slows down because of its weight.`, `Es gibt gar keine Kraft nach oben: ${only.charAt(0).toLowerCase() + only.slice(1)} Der Ball steigt, weil er sich schon nach oben bewegt, und wird wegen der Gewichtskraft langsamer.`), 'active-force'),
      stmt(T('During the flight, the only force on the ball is its weight.', 'Während des Flugs ist die Gewichtskraft die einzige Kraft auf den Ball.'), true,
        T('Nothing touches it any more, and air resistance is negligible.', 'Nichts berührt ihn mehr, und der Luftwiderstand ist vernachlässigbar.'), 'impetus'),
      stmt(T('A heavier ball thrown up at the same speed reaches a lower height.', 'Ein schwererer Ball, mit gleicher Geschwindigkeit hochgeworfen, erreicht eine kleinere Höhe.'), false,
        T('A heavier ball is pulled harder but is also harder to slow down: its acceleration is <i>g</i> as well, so it rises just as high.', 'Ein schwererer Ball wird stärker gezogen, ist aber auch schwerer abzubremsen: Seine Beschleunigung ist ebenfalls <i>g</i>, also steigt er gleich hoch.'), 'heavier-faster'),
      stmt(T('On the way up, the ball loses about 9.8 m/s of speed every second.', 'Auf dem Weg nach oben verliert der Ball jede Sekunde etwa 9.8 m/s an Geschwindigkeit.'), true,
        T('The acceleration <i>g</i> points down, against the velocity: the ball slows down at that rate.', 'Die Beschleunigung <i>g</i> zeigt nach unten, gegen die Geschwindigkeit: Der Ball wird in diesem Mass langsamer.')),
    ];
    const items = pickFive(r, all);
    const fig = D.svg(260, 220, D.ground(10, 250, 210) + D.path('M100 200 V64 A30 30 0 0 1 160 64 V200', 'trace') + D.ball(130, 34, 9) + D.text(144, 32, T('highest point', 'höchster Punkt'), 'txt', 'start') +
      D.ghost(D.ball(100, 140, 8)) + D.arrow(100, 140, 100, 104, 'v', 'v') + D.ghost(D.ball(160, 140, 8)) + D.arrow(160, 140, 160, 176, 'v', 'v'), T('A ball thrown straight up', 'Ein senkrecht hochgeworfener Ball'));
    return {
      title: T('True or false: thrown up', 'Richtig oder falsch: hochgeworfen'),
      situation: T('<p>A ball is thrown straight up. It rises, turns round at its highest point and falls back down. Air resistance is negligible.</p>', '<p>Ein Ball wird senkrecht nach oben geworfen. Er steigt, kehrt im höchsten Punkt um und fällt wieder hinunter. Der Luftwiderstand ist vernachlässigbar.</p>'),
      figure: fig,
      questions: [tf(r, 'statements', prompt(), items)],
      hints: [
        T('Which forces act on the ball after it has left the hand?', 'Welche Kräfte wirken auf den Ball, nachdem er die Hand verlassen hat?'),
        T('Plan: find the forces, then the acceleration (second law); then check each statement against them. Keep force, velocity and acceleration apart.', 'Plan: Bestimme die Kräfte, dann die Beschleunigung (zweites Gesetz); prüfe dann jede Aussage daran. Halte Kraft, Geschwindigkeit und Beschleunigung auseinander.'),
        T(`<i>a</i> = ${F('net')}/<i>m</i>. The velocity can be zero while the acceleration is not.`, `<i>a</i> = ${F('net')}/<i>m</i>. Die Geschwindigkeit kann null sein, während die Beschleunigung es nicht ist.`),
        T(`Here only the weight acts, at every point: <i>a</i> = <i>g</i> ≈ 9.8 m/s², downward.`, `Hier wirkt in jedem Punkt nur die Gewichtskraft: <i>a</i> = <i>g</i> ≈ 9.8 m/s², nach unten.`),
      ],
      steps: steps(items, fig),
    };
  }

  // ================================================================ Newton's first and second law
  function tfMotion(r, p) {
    const first = p.law !== 2;
    const pool = first ? [
      stmt(T('If no force acts on a moving puck, it moves on in a straight line at constant speed.', 'Wirkt keine Kraft auf einen bewegten Puck, bewegt er sich geradlinig mit konstanter Geschwindigkeit weiter.'), true,
        T('That is the first law: without a net force, the velocity does not change.', 'Das ist das erste Newtonsche Gesetz: Ohne resultierende Kraft ändert sich die Geschwindigkeit nicht.'), 'active-force'),
      stmt(T('A puck sliding on frictionless ice slows down because its push wears off.', 'Ein Puck auf reibungsfreiem Eis wird langsamer, weil sein Schwung nachlässt.'), false,
        T('No push is stored in the puck. Without friction, nothing slows it down.', 'Im Puck ist kein Schwung gespeichert. Ohne Reibung bremst ihn nichts.'), 'impetus'),
      stmt(T('A book lying at rest on a table has no forces acting on it.', 'Auf ein Buch, das ruhig auf einem Tisch liegt, wirken keine Kräfte.'), false,
        T('Its weight and the push of the table act on it; they balance, so the net force is zero.', 'Die Gewichtskraft und die Normalkraft des Tisches wirken auf es; sie heben sich auf, also ist die resultierende Kraft null.'), 'rest-no-force'),
      stmt(T('A body can move at constant velocity while several forces act on it.', 'Ein Körper kann sich mit konstanter Geschwindigkeit bewegen, während mehrere Kräfte auf ihn wirken.'), true,
        T('If the forces balance, the net force is zero and the velocity stays the same — e.g. a car at constant speed.', 'Heben sich die Kräfte auf, ist die resultierende Kraft null, und die Geschwindigkeit bleibt gleich — z.B. ein Auto bei konstanter Geschwindigkeit.'), 'active-force'),
      stmt(T('If the net force on a body is zero, the body must be at rest.', 'Ist die resultierende Kraft auf einen Körper null, muss er in Ruhe sein.'), false,
        T('It can also move at constant velocity.', 'Er kann sich auch mit konstanter Geschwindigkeit bewegen.'), 'active-force'),
      stmt(T('A puck moving to the right must have a force to the right acting on it.', 'Auf einen Puck, der sich nach rechts bewegt, muss eine Kraft nach rechts wirken.'), false,
        T('Moving needs no force; only changing the velocity does.', 'Bewegung braucht keine Kraft; nur eine Änderung der Geschwindigkeit braucht eine.'), 'active-force'),
      stmt(T('To keep a crate sliding at constant speed on a rough floor, you must push as hard as friction pulls back.', 'Damit eine Kiste auf rauem Boden mit konstanter Geschwindigkeit gleitet, muss man so stark schieben, wie die Reibung zurückhält.'), true,
        T('Constant speed: the net force is zero, so push and friction are equal.', 'Konstante Geschwindigkeit: Die resultierende Kraft ist null, also sind Druckkraft und Reibung gleich.'), 'active-force'),
      stmt(T('A space probe far from all planets needs its engine running to keep moving.', 'Eine Raumsonde weit weg von allen Planeten braucht ein laufendes Triebwerk, um sich weiterzubewegen.'), false,
        T('Without any force it keeps its velocity for ever.', 'Ohne jede Kraft behält sie ihre Geschwindigkeit für immer.'), 'active-force'),
      stmt(T('A hockey puck keeps getting a force from the stick while it slides across the ice.', 'Ein Eishockeypuck bekommt vom Stock weiter eine Kraft, während er über das Eis gleitet.'), false,
        T('The stick only pushes while it touches the puck. Afterwards the puck keeps its velocity by itself.', 'Der Stock drückt nur, solange er den Puck berührt. Danach behält der Puck seine Geschwindigkeit von selbst.'), 'impetus'),
      stmt(T('When a car brakes hard, the passengers lurch forward because a force pushes them forward.', 'Wenn ein Auto stark bremst, kippen die Fahrgäste nach vorn, weil eine Kraft sie nach vorn drückt.'), false,
        T('No force pushes them forward: they keep their velocity (inertia) while the car slows down under them.', 'Keine Kraft drückt sie nach vorn: Sie behalten ihre Geschwindigkeit (Trägheit), während das Auto unter ihnen langsamer wird.'), 'other'),
      stmt(T('A parachutist sinking at constant speed has no net force acting on them.', 'Auf einen Fallschirmspringer, der mit konstanter Geschwindigkeit sinkt, wirkt keine resultierende Kraft.'), true,
        T('Constant velocity: weight and air resistance balance, the net force is zero.', 'Konstante Geschwindigkeit: Gewichtskraft und Luftwiderstand heben sich auf, die resultierende Kraft ist null.'), 'active-force'),
      stmt(T('A ball rolling on a perfectly smooth, level floor without air would roll on for ever.', 'Eine Kugel, die auf einem vollkommen glatten, ebenen Boden ohne Luft rollt, würde für immer weiterrollen.'), true,
        T('Nothing would slow it down, so it would keep its velocity (first law).', 'Nichts würde sie bremsen, also würde sie ihre Geschwindigkeit behalten (erstes Newtonsches Gesetz).'), 'impetus'),
      stmt(T('A cart whose motor stops on a level track without friction stops at once.', 'Ein Wagen, dessen Motor auf einer ebenen Schiene ohne Reibung ausgeht, bleibt sofort stehen.'), false,
        T('It keeps its velocity: no force is needed to keep it moving.', 'Er behält seine Geschwindigkeit: Um sich weiterzubewegen, braucht er keine Kraft.'), 'active-force'),
      stmt(T('A cyclist riding at constant speed on a level road must keep pedalling, although the net force on her is zero.', 'Eine Velofahrerin, die mit konstanter Geschwindigkeit auf ebener Strasse fährt, muss weiter treten, obwohl die resultierende Kraft auf sie null ist.'), true,
        T('The driving force is needed to balance friction and air resistance; together the forces add to zero.', 'Die Antriebskraft braucht es, um Reibung und Luftwiderstand auszugleichen; zusammen ergeben die Kräfte null.'), 'other'),
      stmt(T('An elevator moving up at constant speed: the cable pulls harder than the weight of the cabin.', 'Ein Lift fährt mit konstanter Geschwindigkeit nach oben: Das Seil zieht stärker als die Gewichtskraft der Kabine.'), false,
        T('Constant velocity means zero net force: the cable pulls exactly as hard as the weight.', 'Konstante Geschwindigkeit heisst resultierende Kraft null: Das Seil zieht genau so stark wie die Gewichtskraft.'), 'active-force'),
      stmt(T('Seen from above, a stone whirled on a string flies off in a straight line when the string breaks.', 'Von oben gesehen fliegt ein Stein, der an einer Schnur herumgeschleudert wird, geradlinig weg, wenn die Schnur reisst.'), true,
        T('Once the string breaks, nothing pulls it sideways any more: it moves on along the tangent.', 'Sobald die Schnur reisst, zieht nichts mehr seitwärts: Er fliegt entlang der Tangente weiter.'), 'circular-impetus'),
    ] : [
      stmt(T('A body can move to the right while the net force on it points to the left.', 'Ein Körper kann sich nach rechts bewegen, während die resultierende Kraft auf ihn nach links zeigt.'), true,
        T('Then it slows down — like a car braking.', 'Dann wird er langsamer — wie ein bremsendes Auto.'), 'active-force'),
      stmt(T('The net force on a body always points in its direction of motion.', 'Die resultierende Kraft auf einen Körper zeigt immer in seine Bewegungsrichtung.'), false,
        T('It points along the acceleration, which can be against the motion (braking) or sideways (curves).', 'Sie zeigt in Richtung der Beschleunigung, und die kann gegen die Bewegung (Bremsen) oder seitlich (Kurven) zeigen.'), 'active-force'),
      stmt(T('Twice the net force on the same body gives twice the acceleration.', 'Die doppelte resultierende Kraft auf denselben Körper ergibt die doppelte Beschleunigung.'), true,
        T('<i>a</i> = <i>F</i>/<i>m</i>: the acceleration is proportional to the net force.', '<i>a</i> = <i>F</i>/<i>m</i>: Die Beschleunigung ist proportional zur resultierenden Kraft.')),
      stmt(T('Twice the net force on the same body gives twice the speed.', 'Die doppelte resultierende Kraft auf denselben Körper ergibt die doppelte Geschwindigkeit.'), false,
        T('A force sets the acceleration, not the speed: twice the force makes the speed change twice as fast.', 'Eine Kraft bestimmt die Beschleunigung, nicht die Geschwindigkeit: Die doppelte Kraft ändert die Geschwindigkeit doppelt so schnell.'), 'active-force'),
      stmt(T('The same net force gives a heavier body a smaller acceleration.', 'Dieselbe resultierende Kraft gibt einem schwereren Körper eine kleinere Beschleunigung.'), true,
        T('<i>a</i> = <i>F</i>/<i>m</i>: more mass, less acceleration.', '<i>a</i> = <i>F</i>/<i>m</i>: mehr Masse, weniger Beschleunigung.')),
      stmt(T('When two forces act on a body, it moves in the direction of the larger one.', 'Wirken zwei Kräfte auf einen Körper, bewegt er sich in Richtung der grösseren.'), false,
        T('Both forces count: they add as arrows to the net force, and the acceleration points along that.', 'Beide Kräfte zählen: Sie addieren sich als Pfeile zur resultierenden Kraft, und die Beschleunigung zeigt in deren Richtung.'), 'largest-force'),
      stmt(T('If the net force is constant, the velocity changes by the same amount every second.', 'Ist die resultierende Kraft konstant, ändert sich die Geschwindigkeit jede Sekunde um gleich viel.'), true,
        T('A constant force gives a constant acceleration.', 'Eine konstante Kraft ergibt eine konstante Beschleunigung.'), 'active-force'),
      stmt(T('A ball at its highest point, where its velocity is zero, has zero acceleration.', 'Ein Ball im höchsten Punkt, wo seine Geschwindigkeit null ist, hat die Beschleunigung null.'), false,
        T('Its velocity is changing from up to down: the acceleration is <i>g</i>.', 'Seine Geschwindigkeit ändert sich gerade von oben nach unten: Die Beschleunigung ist <i>g</i>.'), 'rest-no-force'),
      stmt(T('A car going round a bend at constant speed has a net force acting on it.', 'Auf ein Auto, das mit konstantem Tempo durch eine Kurve fährt, wirkt eine resultierende Kraft.'), true,
        T('Its velocity changes direction, so there is an acceleration towards the centre of the bend, and a net force causes it.', 'Seine Geschwindigkeit ändert die Richtung, also gibt es eine Beschleunigung zum Kurvenzentrum, und eine resultierende Kraft bewirkt sie.'), 'constant-speed'),
      stmt(T('If the net force on a moving body becomes zero, the body stops.', 'Wird die resultierende Kraft auf einen bewegten Körper null, bleibt er stehen.'), false,
        T('It keeps the velocity it has at that moment.', 'Er behält die Geschwindigkeit, die er in diesem Moment hat.'), 'active-force'),
      stmt(T('The same net force gives a body of half the mass twice the acceleration.', 'Dieselbe resultierende Kraft gibt einem Körper mit halber Masse die doppelte Beschleunigung.'), true,
        T('<i>a</i> = <i>F</i>/<i>m</i>: half the mass, twice the acceleration.', '<i>a</i> = <i>F</i>/<i>m</i>: halbe Masse, doppelte Beschleunigung.'), 'other'),
      stmt(T('Without air resistance, a heavy stone falls with a larger acceleration than a light one.', 'Ohne Luftwiderstand fällt ein schwerer Stein mit grösserer Beschleunigung als ein leichter.'), false,
        T('The heavy stone is pulled harder, but it also has more mass: <i>a</i> = <i>m·g</i>/<i>m</i> = <i>g</i> for both.', 'Am schweren Stein wird stärker gezogen, er hat aber auch mehr Masse: <i>a</i> = <i>m·g</i>/<i>m</i> = <i>g</i> für beide.'), 'heavier-faster'),
      stmt(T('A body that moves in a straight line and gets slower has a net force pointing against its motion.', 'Auf einen Körper, der sich geradlinig bewegt und langsamer wird, wirkt eine resultierende Kraft gegen die Bewegungsrichtung.'), true,
        T('Slowing down means an acceleration against the motion, and the net force points along the acceleration.', 'Langsamer werden heisst Beschleunigung gegen die Bewegung, und die resultierende Kraft zeigt in Richtung der Beschleunigung.'), 'active-force'),
      stmt(T('Two equal forces in opposite directions on a moving cart make it slow down.', 'Zwei gleich grosse, entgegengesetzte Kräfte auf einen fahrenden Wagen machen ihn langsamer.'), false,
        T('They cancel: the net force is zero, and the cart keeps its velocity.', 'Sie heben sich auf: Die resultierende Kraft ist null, und der Wagen behält seine Geschwindigkeit.'), 'active-force'),
      stmt(T('A rocket far out in space keeps getting faster as long as its engine runs.', 'Eine Rakete weit draussen im Weltraum wird immer schneller, solange ihr Triebwerk läuft.'), true,
        T('The engine force is the net force: it gives a constant acceleration, so the speed grows all the time.', 'Die Kraft des Triebwerks ist die resultierende Kraft: Sie bewirkt eine konstante Beschleunigung, also wächst die Geschwindigkeit ständig.'), 'other'),
      stmt(T('An elevator moving down and slowing down has a net force pointing up.', 'Auf einen Lift, der nach unten fährt und dabei langsamer wird, wirkt eine resultierende Kraft nach oben.'), true,
        T('Slowing down while moving down means an acceleration upward, so the net force points up.', 'Beim Abwärtsfahren langsamer werden heisst Beschleunigung nach oben, also zeigt die resultierende Kraft nach oben.'), 'active-force'),
    ];
    const items = pickFive(r, pool);
    const fig = first
      ? D.svg(320, 120, D.rect(0, 0, 320, 120, 'ice', 6) + [40, 100, 160].map((x) => D.ghost(D.puck(x, 60, 12))).join('') + D.puck(220, 60, 12) + D.arrow(236, 60, 290, 60, 'v', 'v'), T('A puck sliding on ice', 'Ein Puck gleitet auf Eis'))
      : D.svg(320, 140, D.ground(0, 320, 110) + D.car(110, 110, 110) + D.arrow(200, 38, 130, 38, 'net', FL('net')) + D.arrow(135, 14, 195, 14, 'v', 'v') + D.words(160, 132, T('moving right, net force left: braking', 'fährt nach rechts, resultierende Kraft nach links: bremst')),
        T('A car braking', 'Ein bremsendes Auto'));
    return {
      title: first ? T('True or false: inertia', 'Richtig oder falsch: Trägheit') : T('True or false: net force', 'Richtig oder falsch: resultierende Kraft'),
      situation: first ? T('<p>Statements about bodies with no net force acting on them.</p>', '<p>Aussagen über Körper, auf die keine resultierende Kraft wirkt.</p>')
        : T('<p>Statements about the net force and the motion it causes.</p>', '<p>Aussagen über die resultierende Kraft und die Bewegung, die sie bewirkt.</p>'),
      figure: fig,
      questions: [tf(r, 'statements', prompt(), items)],
      hints: first ? [
        T('For each statement: is there a net force, and does the velocity change?', 'Bei jeder Aussage: Gibt es eine resultierende Kraft, und ändert sich die Geschwindigkeit?'),
        T('Plan: check each statement against the first law.', 'Plan: Prüfe jede Aussage am ersten Newtonschen Gesetz.'),
        T('First law: net force zero ⇔ the velocity stays the same (at rest, or moving in a straight line at constant speed).', 'Erstes Gesetz: resultierende Kraft null ⇔ die Geschwindigkeit bleibt gleich (Ruhe, oder geradlinige Bewegung mit konstanter Geschwindigkeit).'),
        T('Moving needs no force. “No net force” can mean no forces at all, or forces that balance.', 'Bewegung braucht keine Kraft. „Keine resultierende Kraft“ kann heissen: gar keine Kräfte, oder Kräfte, die sich aufheben.'),
      ] : [
        T('For each statement: what does the net force determine — the velocity or the change of velocity?', 'Bei jeder Aussage: Was bestimmt die resultierende Kraft — die Geschwindigkeit oder ihre Änderung?'),
        T('Plan: check each statement against the second law.', 'Plan: Prüfe jede Aussage am zweiten Newtonschen Gesetz.'),
        T(`Second law: ${F('net')} = <i>m·a</i>. The net force is the sum (as arrows) of all forces.`, `Zweites Gesetz: ${F('net')} = <i>m·a</i>. Die resultierende Kraft ist die Summe (als Pfeile) aller Kräfte.`),
        T('The net force points along the acceleration, which can be against the motion. Doubling it doubles the acceleration, not the speed.', 'Die resultierende Kraft zeigt in Richtung der Beschleunigung, die auch gegen die Bewegung zeigen kann. Doppelte Kraft heisst doppelte Beschleunigung, nicht doppelte Geschwindigkeit.'),
      ],
      steps: steps(items, fig),
    };
  }

  register('gravity', 'tf-throw', tfThrow);
  register('inertia', 'tf-motion', tfMotion, { law: 1 });
  register('force', 'tf-motion', tfMotion, { law: 2 });
})(typeof window !== 'undefined' ? window : globalThis);
