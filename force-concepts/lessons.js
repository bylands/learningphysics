// The tutor's worked examples, one fixed exercise each, in the order of the objectives: no net
// force (the first law), balanced forces while moving, the net force and the acceleration (also
// under gravity), and the net force towards the centre on a circle. The frames come from the
// exercise's own worked solution (app.js). Each is a topic of practice (topics.js): its stages list
// exercise types as 'topic/generator'.
// The learning objectives of the check (check.js): what the student can do, the question kinds
// that test it ('type:question key', see FC.checkQuestion), its worked example and practice topic.
(function (root) {
  'use strict';

  const EXAMPLES = [
    {
      name: { en: 'Engine off', de: 'Triebwerk aus' },
      idea: {
        en: 'Where no force acts, the velocity stays the same: the probe needs no engine to keep moving, and it does not slow down. A force changes the velocity; it is not needed to keep it.',
        de: 'Wo keine Kraft wirkt, bleibt die Geschwindigkeit gleich: Die Sonde braucht kein Triebwerk, um sich weiterzubewegen, und sie wird nicht langsamer. Eine Kraft ändert die Geschwindigkeit; um sie zu behalten, braucht es keine.',
      },
      gen: 'engine', params: { obj: 'probe', start: 'drift' },
      practice: [{ types: ['inertia/engine'] }, { types: ['inertia/kick'] }, { types: ['inertia/match-diagrams'] }],
    },
    {
      name: { en: 'Off the edge', de: 'Über die Kante' },
      idea: {
        en: 'Horizontally no force acts, vertically gravity does: the ball keeps its forward speed while it falls faster and faster — a parabola.',
        de: 'Horizontal wirkt keine Kraft, vertikal die Schwerkraft: Die Kugel behält ihre Geschwindigkeit nach vorn und fällt dabei immer schneller — eine Parabel.',
      },
      gen: 'rolloff', params: { variant: 'table', ask: 'vx' },
      practice: [{ types: ['gravity/rolloff'] }, { types: ['inertia/cart-launcher'] }],
    },    {
      name: { en: 'Constant speed', de: 'Konstante Geschwindigkeit' },
      idea: {
        en: 'Moving at constant speed needs no net force: the forward and backward forces balance. Balanced forces do not mean rest — the crate keeps sliding.',
        de: 'Für eine Bewegung mit konstanter Geschwindigkeit braucht es keine resultierende Kraft: Die Kräfte nach vorn und nach hinten heben sich auf. Kräfte im Gleichgewicht heissen nicht Ruhe — die Kiste gleitet weiter.',
      },
      gen: 'balance', params: { obj: 'crate', phase: 'constant', dir: 1 },
      practice: [{ types: ['inertia/balance'] }, { types: ['inertia/tf-motion'] }],
    },    {
      name: { en: 'Slowing down', de: 'Abbremsen' },
      idea: {
        en: 'The net force points along the acceleration, not along the motion: a cabin that moves up and slows down has a net force pointing down.',
        de: 'Die resultierende Kraft zeigt in Richtung der Beschleunigung, nicht in Bewegungsrichtung: Auf eine Kabine, die nach oben fährt und abbremst, wirkt eine resultierende Kraft nach unten.',
      },
      gen: 'balance', params: { obj: 'elevator', phase: 'slowing', dir: 1 },
      practice: [{ types: ['force/balance'] }, { types: ['force/tf-motion', 'force/rank-elevator'] }, { types: ['force/match-diagrams'] }],
    },    {
      name: { en: 'Two forces at an angle', de: 'Zwei Kräfte im Winkel' },
      idea: {
        en: 'Forces add as arrows: put them tip to tail, or draw the parallelogram. The net force — and so the acceleration — points along the diagonal: not along the larger force, and not halfway between the two.',
        de: 'Kräfte addieren sich als Pfeile: Hänge sie aneinander oder zeichne das Parallelogramm. Die resultierende Kraft — und damit die Beschleunigung — zeigt entlang der Diagonale: nicht in Richtung der grösseren Kraft und nicht genau zwischen die beiden.',
      },
      gen: 'two-forces', params: { pair: [3, 6], a1: 0, gamma: 90, sense: -1, motion: 'rest' },
      practice: [{ types: ['force/two-forces'] }, { types: ['force/thruster'] }],
    },    {
      name: { en: 'Thrown up', de: 'Hochgeworfen' },
      idea: {
        en: 'After the throw, only gravity acts on the ball: on the way up, at the top and on the way down. The ball keeps moving because of its velocity, not because of a force.',
        de: 'Nach dem Wurf wirkt nur die Schwerkraft auf den Ball: auf dem Weg nach oben, im höchsten Punkt und auf dem Weg nach unten. Der Ball bewegt sich wegen seiner Geschwindigkeit weiter, nicht wegen einer Kraft.',
      },
      gen: 'throw', params: { kind: 'vertical', phase: 'top', obj: 'ball' },
      practice: [{ types: ['gravity/throw'] }, { types: ['gravity/drop', 'gravity/tf-throw'] }, { types: ['force/ramp'] }],
    },    {
      name: { en: 'Round the bend', de: 'Durch die Kurve' },
      idea: {
        en: 'On a circle at constant speed, the velocity turns all the time: the net force points to the centre. It is not an extra force — one of the forces that act provides it, here the friction of the road. Nothing pushes outward.',
        de: 'Auf einer Kreisbahn mit konstantem Tempo dreht sich die Geschwindigkeit ständig: Die resultierende Kraft zeigt zum Zentrum. Sie ist keine zusätzliche Kraft — eine der wirkenden Kräfte liefert sie, hier die Reibung der Strasse. Nichts drückt nach aussen.',
      },
      gen: 'centre', params: { scene: 'car' },
      practice: [{ types: ['force/centre'] }],
    },
    {
      name: { en: 'Leaving a circle', de: 'Aus dem Kreis' },
      idea: {
        en: 'Without the pull toward the centre, the stone goes straight on along the tangent — neither outward nor on a curve.',
        de: 'Ohne die Kraft zum Zentrum fliegt der Stein geradeaus entlang der Tangente weiter — weder nach aussen noch im Bogen.',
      },
      gen: 'circle', params: { variant: 'string', sense: 1, angle: 315 },
      practice: [{ types: ['inertia/circle'] }, { types: ['gravity/pendulum-cut'] }],
    },  ];

  const OBJECTIVES = [
    { id: 'first', kinds: ['inertia/engine:graph', 'inertia/circle:path', 'gravity/rolloff:vx'], tutor: 0, topic: 0,
      name: { en: 'Predict the motion of a body on which no net force acts: it stays at rest or moves on in a straight line at constant velocity.',
        de: 'Die Bewegung eines Körpers vorhersagen, auf den keine resultierende Kraft wirkt: Er bleibt in Ruhe oder bewegt sich geradlinig mit konstanter Geschwindigkeit weiter.' } },
    { id: 'balanced', kinds: ['inertia/balance:compare', 'inertia/balance:net', 'inertia/tf-motion:statements'], tutor: 2, topic: 2,
      name: { en: 'Explain why balanced forces do not mean that a body is at rest: it may just as well move at constant velocity.',
        de: 'Erklären, warum Kräfte im Gleichgewicht nicht heissen, dass ein Körper in Ruhe ist: Er kann sich ebenso gut mit konstanter Geschwindigkeit bewegen.' } },
    { id: 'second', kinds: ['force/balance:net', 'force/two-forces:dir', 'force/tf-motion:statements', 'gravity/drop:time'], tutor: 3, topic: 3,
      name: { en: 'Relate the net force to the acceleration with F = m·a (the rate of change of momentum): the net force points along the acceleration, not along the motion.',
        de: 'Die resultierende Kraft mit F = m·a (der Änderungsrate des Impulses) mit der Beschleunigung verknüpfen: Sie zeigt in Richtung der Beschleunigung, nicht der Bewegung.' } },
    { id: 'centre', kinds: ['force/centre:net', 'force/centre:source'], tutor: 6, topic: 6,
      name: { en: 'Identify which force provides the net force towards the centre in a circular motion.',
        de: 'Erkennen, welche Kraft bei einer Kreisbewegung die resultierende Kraft zum Zentrum liefert.' } },
  ];

  root.Lessons = { EXAMPLES, OBJECTIVES };
  if (typeof module !== 'undefined') module.exports = { EXAMPLES, OBJECTIVES };
})(typeof window !== 'undefined' ? window : globalThis);
