// All In: the rounds the teacher can choose from, in English and German. A round is
//   { id, type: 'predict' | 'estimate' | 'calculate', standard (in the standard game of six rounds),
//     demo (Predict: a demo to run at the reveal), title, question, options (Predict),
//     answer (Predict: the right option's index; else the value, in unit), unit,
//     editable (the teacher sets the true value at the reveal, e.g. the room's air), explain }
// Texts are { en, de }. test/check-game.js checks every round.
(function (root) {
  'use strict';

  const ROUNDS = [
    {
      id: 'tracks', type: 'predict', standard: true, demo: true,
      title: { en: 'The race of the two balls', de: 'Das Rennen der zwei Kugeln' },
      question: {
        en: 'Two balls start together on two tracks with the same start height, end height and horizontal length. Track 1 is straight, track 2 dips down in the middle. Which ball arrives first?',
        de: 'Zwei Kugeln starten gleichzeitig auf zwei Bahnen mit gleicher Start- und Endhöhe und gleicher horizontaler Länge. Bahn 1 ist gerade, Bahn 2 hat in der Mitte eine Senke. Welche Kugel ist zuerst am Ziel?',
      },
      options: [
        { en: 'The ball on the straight track', de: 'Die Kugel auf der geraden Bahn' },
        { en: 'The ball on the track with the dip', de: 'Die Kugel auf der Bahn mit Senke' },
        { en: 'Both arrive together', de: 'Beide gleichzeitig' },
      ],
      answer: 1,
      explain: {
        en: 'In the dip the ball converts more potential energy into kinetic energy, so it is faster over most of the way. That outweighs the slightly longer path.',
        de: 'In der Senke wandelt die Kugel mehr Lageenergie in Bewegungsenergie um und ist deshalb fast auf dem ganzen Weg schneller. Das wiegt den etwas längeren Weg mehr als auf.',
      },
    },
    {
      id: 'room-air', type: 'estimate', standard: true, editable: true, answer: 230, unit: 'kg',
      title: { en: 'The air in this room', de: 'Die Luft in diesem Zimmer' },
      question: { en: 'What is the mass of the air in this classroom?', de: 'Welche Masse hat die Luft in diesem Schulzimmer?' },
      explain: {
        en: 'm = ρ·V with ρ ≈ 1.2 kg/m³. A room of 9 m × 7 m × 3 m holds about 190 m³, so about 230 kg of air. Most people guess far too low.',
        de: 'm = ρ·V mit ρ ≈ 1.2 kg/m³. Ein Zimmer von 9 m × 7 m × 3 m enthält etwa 190 m³, also etwa 230 kg Luft. Die meisten schätzen viel zu wenig.',
      },
      note: {
        en: 'Set the value for your room: 1.2 kg/m³ × length × width × height.',
        de: 'Wert für Ihr Zimmer setzen: 1.2 kg/m³ × Länge × Breite × Höhe.',
      },
    },
    {
      id: 'copper-tube', type: 'predict', standard: true, demo: true,
      title: { en: 'A magnet in a copper tube', de: 'Ein Magnet im Kupferrohr' },
      question: {
        en: 'A strong neodymium magnet is dropped through a vertical copper tube 1 m long. Compared with a plastic tube of the same size, it falls …',
        de: 'Ein starker Neodym-Magnet fällt durch ein senkrechtes, 1 m langes Kupferrohr. Verglichen mit einem gleich grossen Kunststoffrohr fällt er …',
      },
      options: [
        { en: 'just as fast', de: 'gleich schnell' },
        { en: 'clearly slower', de: 'deutlich langsamer' },
        { en: 'not at all: it gets stuck', de: 'gar nicht: er bleibt stecken' },
      ],
      answer: 1,
      explain: {
        en: 'The moving magnet induces eddy currents in the copper; by Lenz’s rule their magnetic field opposes the motion. It never stops completely, because the braking needs motion.',
        de: 'Der bewegte Magnet induziert Wirbelströme im Kupfer; nach der Lenzschen Regel hemmt ihr Magnetfeld die Bewegung. Ganz stehen bleibt er nie, denn die Bremsung braucht Bewegung.',
      },
    },
    {
      id: 'stairs', type: 'calculate', standard: true, answer: 441, unit: 'W',
      title: { en: 'Up the stairs', de: 'Die Treppe hinauf' },
      question: {
        en: 'A 60 kg student runs up a staircase 3.0 m high in 4.0 s. What is the student’s mechanical power?',
        de: 'Eine Schülerin (60 kg) rennt in 4.0 s eine 3.0 m hohe Treppe hinauf. Welche mechanische Leistung erbringt sie?',
      },
      explain: { en: 'P = m·g·h / t = 60 kg · 9.81 N/kg · 3.0 m / 4.0 s ≈ 440 W', de: 'P = m·g·h / t = 60 kg · 9.81 N/kg · 3.0 m / 4.0 s ≈ 440 W' },
    },
    {
      id: 'ice-cubes', type: 'predict', standard: true, demo: true,
      title: { en: 'Two ice cubes', de: 'Zwei Eiswürfel' },
      question: {
        en: 'Two equal ice cubes are put into a glass of tap water and a glass of salt water, both at room temperature. Which ice cube melts first?',
        de: 'Zwei gleiche Eiswürfel kommen in ein Glas Leitungswasser und in ein Glas Salzwasser, beide bei Zimmertemperatur. Welcher Eiswürfel schmilzt zuerst?',
      },
      options: [
        { en: 'The one in tap water', de: 'Der im Leitungswasser' },
        { en: 'The one in salt water', de: 'Der im Salzwasser' },
        { en: 'Both at the same time', de: 'Beide gleichzeitig' },
      ],
      answer: 0,
      explain: {
        en: 'Cold meltwater is denser than the warm tap water and sinks, so convection keeps bringing warm water to the ice. In salt water the fresh meltwater is lighter and stays on top as a cold layer. A drop of food colouring makes this visible.',
        de: 'Kaltes Schmelzwasser ist dichter als das warme Leitungswasser und sinkt ab; so bringt die Konvektion laufend warmes Wasser zum Eis. Im Salzwasser ist das Schmelzwasser leichter und bleibt als kalte Schicht oben. Ein Tropfen Lebensmittelfarbe macht das sichtbar.',
      },
    },
    {
      id: 'chocolate', type: 'estimate', standard: true, answer: 3820, unit: 'm',
      title: { en: 'A chocolate bar as fuel', de: 'Schokolade als Treibstoff' },
      question: {
        en: 'A 100 g chocolate bar contains about 2250 kJ. If all of it could be converted, how high could it lift a 60 kg student?',
        de: 'Eine Tafel Schokolade (100 g) enthält etwa 2250 kJ. Wie hoch könnte sie eine Schülerin (60 kg) heben, wenn sich alles umwandeln liesse?',
      },
      explain: {
        en: 'h = E / (m·g) = 2.25·10⁶ J / (60 kg · 9.81 N/kg) ≈ 3.8 km. Real muscles reach about 25 % efficiency: still almost 1 km.',
        de: 'h = E / (m·g) = 2.25·10⁶ J / (60 kg · 9.81 N/kg) ≈ 3.8 km. Muskeln haben einen Wirkungsgrad von etwa 25 %: immer noch fast 1 km.',
      },
    },
    {
      id: 'paper-book', type: 'predict', demo: true,
      title: { en: 'Paper on a book', de: 'Papier auf einem Buch' },
      question: {
        en: 'A sheet of paper lies flat on top of a book, and both are dropped together. What happens?',
        de: 'Ein Blatt Papier liegt flach auf einem Buch, und beide werden zusammen fallen gelassen. Was passiert?',
      },
      options: [
        { en: 'The paper lags behind', de: 'Das Papier bleibt zurück' },
        { en: 'Both fall together', de: 'Beide fallen zusammen' },
        { en: 'The paper flies off sideways', de: 'Das Papier fliegt seitlich weg' },
      ],
      answer: 1,
      explain: {
        en: 'Without air resistance everything falls with the same acceleration. The book pushes the air away, so the paper falls freely behind it.',
        de: 'Ohne Luftwiderstand fällt alles gleich schnell. Das Buch schiebt die Luft weg, und das Papier fällt dahinter frei.',
      },
    },
    {
      id: 'bulbs', type: 'predict', demo: true,
      title: { en: 'A second bulb', de: 'Ein zweites Lämpchen' },
      question: {
        en: 'A lamp is connected to a battery. A second, identical bulb is connected in series with it. What happens?',
        de: 'Ein Lämpchen hängt an einer Batterie. Ein zweites, gleiches Lämpchen wird in Serie dazugeschaltet. Was passiert?',
      },
      options: [
        { en: 'Both shine as brightly as the first did before', de: 'Beide leuchten so hell wie vorher das erste' },
        { en: 'Both are dimmer', de: 'Beide leuchten schwächer' },
        { en: 'The first one gets brighter', de: 'Das erste leuchtet heller' },
      ],
      answer: 1,
      explain: {
        en: 'The resistance doubles, so the current is halved. Each bulb gets half the voltage: its power drops to about a quarter (if its resistance stays the same).',
        de: 'Der Widerstand verdoppelt sich, der Strom halbiert sich. Jedes Lämpchen bekommt die halbe Spannung: seine Leistung sinkt auf etwa einen Viertel (bei gleichbleibendem Widerstand).',
      },
    },
    {
      id: 'balloon-car', type: 'predict',
      title: { en: 'A balloon in the car', de: 'Ein Ballon im Auto' },
      question: {
        en: 'A helium balloon floats on a string inside a closed car. The car accelerates forward. Which way does the balloon move?',
        de: 'Ein Heliumballon schwebt an einer Schnur in einem geschlossenen Auto. Das Auto beschleunigt nach vorne. Wohin bewegt sich der Ballon?',
      },
      options: [
        { en: 'Forward', de: 'Nach vorne' },
        { en: 'Backward', de: 'Nach hinten' },
        { en: 'It stays where it is', de: 'Er bleibt, wo er ist' },
      ],
      answer: 0,
      explain: {
        en: 'The air in the car is pushed to the back and becomes denser there, so the pressure rises towards the back: a buoyant force forward, just as buoyancy points up against gravity.',
        de: 'Die Luft im Auto wird nach hinten gedrückt und wird dort dichter; der Druck steigt nach hinten an. Das gibt einen Auftrieb nach vorne, so wie der Auftrieb gegen die Schwerkraft nach oben zeigt.',
      },
    },
    {
      id: 'electrons', type: 'estimate', answer: 4.5e22, unit: '',
      title: { en: 'Electrons in a charger cable', de: 'Elektronen im Ladekabel' },
      question: {
        en: 'How many electrons flow through a phone charger cable in one hour at 2 A?',
        de: 'Wie viele Elektronen fliessen in einer Stunde bei 2 A durch ein Handy-Ladekabel?',
      },
      explain: {
        en: 'Q = I·t = 2 A · 3600 s = 7200 C, and N = Q / e = 7200 C / 1.6·10⁻¹⁹ C ≈ 4.5·10²²',
        de: 'Q = I·t = 2 A · 3600 s = 7200 C, und N = Q / e = 7200 C / 1.6·10⁻¹⁹ C ≈ 4.5·10²²',
      },
    },
    {
      id: 'shower', type: 'estimate', answer: 5.2e6, unit: 'J',
      title: { en: 'A hot shower', de: 'Eine heisse Dusche' },
      question: {
        en: 'How much energy does it take to heat the water for a five-minute shower?',
        de: 'Wie viel Energie braucht es, um das Wasser für eine fünfminütige Dusche zu erwärmen?',
      },
      explain: {
        en: 'About 10 L per minute, so 50 kg of water, heated by about 25 K: Q = c·m·ΔT = 4182 J/(kg·K) · 50 kg · 25 K ≈ 5·10⁶ J',
        de: 'Etwa 10 L pro Minute, also 50 kg Wasser, um etwa 25 K erwärmt: Q = c·m·ΔT = 4182 J/(kg·K) · 50 kg · 25 K ≈ 5·10⁶ J',
      },
    },
    {
      id: 'braking', type: 'calculate', answer: 75, unit: 'm',
      title: { en: 'Emergency stop', de: 'Vollbremsung' },
      question: {
        en: 'A car at 30 m/s brakes at 6.0 m/s². How long is its braking distance?',
        de: 'Ein Auto fährt mit 30 m/s und bremst mit 6.0 m/s². Wie lang ist sein Bremsweg?',
      },
      explain: { en: 's = v² / (2a) = (30 m/s)² / (2 · 6.0 m/s²) = 75 m', de: 's = v² / (2a) = (30 m/s)² / (2 · 6.0 m/s²) = 75 m' },
    },
    {
      id: 'kettle', type: 'calculate', answer: 167, unit: 's',
      title: { en: 'The kettle', de: 'Der Wasserkocher' },
      question: {
        en: 'A 2000 W kettle heats 1.0 L of water from 20 °C to 100 °C. How long does it take, without losses?',
        de: 'Ein Wasserkocher (2000 W) erwärmt 1.0 L Wasser von 20 °C auf 100 °C. Wie lange dauert das ohne Verluste?',
      },
      explain: {
        en: 't = c·m·ΔT / P = 4182 J/(kg·K) · 1.0 kg · 80 K / 2000 W ≈ 167 s',
        de: 't = c·m·ΔT / P = 4182 J/(kg·K) · 1.0 kg · 80 K / 2000 W ≈ 167 s',
      },
    },
  ];

  root.ALL_IN_ROUNDS = ROUNDS;
  if (typeof module !== 'undefined') module.exports = ROUNDS;
})(typeof window !== 'undefined' ? window : globalThis);
