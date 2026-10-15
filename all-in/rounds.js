// All In: the rounds the teacher can choose from, in English and German. A round is
//   { id, type: 'predict' | 'estimate' | 'calculate',
//     demo (Predict: a demo to run at the reveal), title, question, options (Predict),
//     answer (Predict: the right option's index; else the value, in unit), unit,
//     editable (the teacher sets the true value at the reveal, e.g. the room's air), explain }
// Texts are { en, de }. TOPICS are the ready-made games of six rounds, one per topic, each in the
// order Predict, Estimate, Predict, Calculate, Predict, Estimate. test/check-game.js checks them all.
(function (root) {
  'use strict';

  const ROUNDS = [
    {
      id: 'tracks', type: 'predict', demo: true,
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
      id: 'room-air', type: 'estimate', editable: true, answer: 230, unit: 'kg',
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
      id: 'copper-tube', type: 'predict', demo: true,
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
      id: 'stairs', type: 'calculate', answer: 441, unit: 'W',
      title: { en: 'Up the stairs', de: 'Die Treppe hinauf' },
      question: {
        en: 'A 60 kg student runs up a staircase 3.0 m high in 4.0 s. What is the student’s mechanical power?',
        de: 'Eine Schülerin (60 kg) rennt in 4.0 s eine 3.0 m hohe Treppe hinauf. Welche mechanische Leistung erbringt sie?',
      },
      explain: { en: 'P = m·g·h / t = 60 kg · 9.81 N/kg · 3.0 m / 4.0 s ≈ 440 W', de: 'P = m·g·h / t = 60 kg · 9.81 N/kg · 3.0 m / 4.0 s ≈ 440 W' },
    },
    {
      id: 'ice-cubes', type: 'predict', demo: true,
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
      id: 'chocolate', type: 'estimate', answer: 3820, unit: 'm',
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
    // ---------------------------------------------------------------- electricity and magnetism
    {
      id: 'wires', type: 'predict', demo: true,
      title: { en: 'Two wires with a current', de: 'Zwei Drähte mit Strom' },
      question: {
        en: 'Two long, loose wires hang side by side. A large current flows through both in the same direction. What do the wires do?',
        de: 'Zwei lange, lose Drähte hängen nebeneinander. Durch beide fliesst ein grosser Strom in die gleiche Richtung. Was machen die Drähte?',
      },
      options: [
        { en: 'They attract each other', de: 'Sie ziehen sich an' },
        { en: 'They repel each other', de: 'Sie stossen sich ab' },
        { en: 'Nothing: they are not charged', de: 'Nichts: sie sind nicht geladen' },
      ],
      answer: 0,
      explain: {
        en: 'Each current makes a magnetic field in circles around its wire. The other wire’s current lies in this field and feels a Lorentz force: currents in the same direction attract, opposite currents repel. This force once defined the ampere.',
        de: 'Jeder Strom erzeugt ein Magnetfeld in Kreisen um seinen Draht. Der Strom im anderen Draht liegt in diesem Feld und erfährt eine Lorentzkraft: gleich gerichtete Ströme ziehen sich an, entgegengesetzte stossen sich ab. Mit dieser Kraft war früher das Ampere definiert.',
      },
    },
    {
      id: 'filament', type: 'calculate', answer: 882, unit: 'Ω',
      title: { en: 'A glowing filament', de: 'Ein glühender Draht' },
      question: {
        en: 'An old light bulb is labelled 230 V, 60 W. What is the resistance of its glowing filament?',
        de: 'Auf einer alten Glühbirne steht 230 V, 60 W. Welchen Widerstand hat ihr glühender Draht?',
      },
      explain: {
        en: 'P = U² / R, so R = U² / P = (230 V)² / 60 W ≈ 882 Ω. Cold, the tungsten filament has only about a tenth of this.',
        de: 'P = U² / R, also R = U² / P = (230 V)² / 60 W ≈ 882 Ω. Kalt hat der Wolframdraht nur etwa einen Zehntel davon.',
      },
    },
    {
      id: 'phone-battery', type: 'estimate', answer: 91.7, unit: 'm',
      title: { en: 'A charged phone', de: 'Ein geladenes Handy' },
      question: {
        en: 'A full phone battery stores about 15 Wh. If all of it could be used, how high could it lift a 60 kg student?',
        de: 'Ein voller Handy-Akku speichert etwa 15 Wh. Wie hoch könnte er eine Schülerin (60 kg) heben, wenn sich alles nutzen liesse?',
      },
      explain: {
        en: 'E = 15 Wh = 15 W · 3600 s = 54 000 J, and h = E / (m·g) = 54 000 J / (60 kg · 9.81 N/kg) ≈ 92 m: about a 30-storey building.',
        de: 'E = 15 Wh = 15 W · 3600 s = 54 000 J, und h = E / (m·g) = 54 000 J / (60 kg · 9.81 N/kg) ≈ 92 m: etwa ein Haus mit 30 Stockwerken.',
      },
    },
    // ---------------------------------------------------------------- waves
    {
      id: 'rope-pulse', type: 'predict', demo: true,
      title: { en: 'A pulse on a rope', de: 'Ein Puls auf einem Seil' },
      question: {
        en: 'A rope is tied firmly to a wall. A quick flick sends a hump upwards along it to the wall. What comes back?',
        de: 'Ein Seil ist fest an einer Wand angebunden. Ein kurzer Schlag schickt einen Berg nach oben dem Seil entlang zur Wand. Was kommt zurück?',
      },
      options: [
        { en: 'A hump upwards', de: 'Ein Berg nach oben' },
        { en: 'A hump downwards', de: 'Ein Tal nach unten' },
        { en: 'Nothing: the wall swallows it', de: 'Nichts: die Wand schluckt ihn' },
      ],
      answer: 1,
      explain: {
        en: 'The fixed end cannot move. The rope pulls the wall up, and the wall pulls the rope down (actio = reactio): the pulse is reflected upside down, with a phase jump of half a wavelength. At a loose end it would come back upright.',
        de: 'Das feste Ende kann sich nicht bewegen. Das Seil zieht die Wand nach oben, die Wand zieht das Seil nach unten (actio = reactio): der Puls wird umgekehrt reflektiert, mit einem Phasensprung von einer halben Wellenlänge. An einem losen Ende käme er aufrecht zurück.',
      },
    },
    {
      id: 'fm-radio', type: 'estimate', answer: 3.0, unit: 'm',
      title: { en: 'A radio wave', de: 'Eine Radiowelle' },
      question: {
        en: 'An FM radio station broadcasts at 100 MHz. How long is one wavelength of its radio wave?',
        de: 'Ein UKW-Sender sendet auf 100 MHz. Wie lang ist eine Wellenlänge seiner Radiowelle?',
      },
      explain: {
        en: 'λ = c / f = 3.0·10⁸ m/s / 1.0·10⁸ Hz = 3.0 m. That is why a good FM antenna is about 75 cm long: a quarter of the wavelength.',
        de: 'λ = c / f = 3.0·10⁸ m/s / 1.0·10⁸ Hz = 3.0 m. Deshalb ist eine gute UKW-Antenne etwa 75 cm lang: eine Viertelwellenlänge.',
      },
    },
    {
      id: 'ambulance', type: 'predict',
      title: { en: 'The siren', de: 'Die Sirene' },
      question: {
        en: 'An ambulance drives past you at a constant speed with its siren on. What do you hear as it passes?',
        de: 'Ein Krankenwagen fährt mit eingeschalteter Sirene und konstanter Geschwindigkeit an Ihnen vorbei. Was hören Sie, während er vorbeifährt?',
      },
      options: [
        { en: 'The pitch rises', de: 'Der Ton wird höher' },
        { en: 'The pitch drops', de: 'Der Ton wird tiefer' },
        { en: 'The pitch stays the same, only louder', de: 'Der Ton bleibt gleich, nur lauter' },
      ],
      answer: 1,
      explain: {
        en: 'Doppler effect: while the ambulance approaches, the wave fronts in front of it are squeezed together, so you hear a higher frequency; once it has passed, they are stretched, and the pitch drops. The siren itself never changes.',
        de: 'Dopplereffekt: Solange der Krankenwagen näher kommt, werden die Wellenfronten vor ihm zusammengedrückt, und man hört eine höhere Frequenz; sobald er vorbei ist, werden sie gedehnt, und der Ton wird tiefer. Die Sirene selbst ändert sich nie.',
      },
    },
    {
      id: 'guitar', type: 'calculate', answer: 143, unit: 'm/s',
      title: { en: 'A guitar string', de: 'Eine Gitarrensaite' },
      question: {
        en: 'The A string of a guitar is 65 cm long between its ends and vibrates at its fundamental of 110 Hz. How fast do waves travel along the string?',
        de: 'Die A-Saite einer Gitarre ist zwischen ihren Enden 65 cm lang und schwingt in ihrer Grundfrequenz von 110 Hz. Wie schnell laufen Wellen der Saite entlang?',
      },
      explain: {
        en: 'In the fundamental, half a wavelength fits on the string: λ = 2L = 1.30 m. Then v = λ·f = 1.30 m · 110 Hz ≈ 143 m/s.',
        de: 'In der Grundschwingung passt eine halbe Wellenlänge auf die Saite: λ = 2L = 1.30 m. Dann ist v = λ·f = 1.30 m · 110 Hz ≈ 143 m/s.',
      },
    },
    {
      id: 'shallow-water', type: 'predict',
      title: { en: 'Waves on the beach', de: 'Wellen am Strand' },
      question: {
        en: 'Water waves run from deep water into shallow water near the beach. What happens to their wavelength?',
        de: 'Wasserwellen laufen aus tiefem Wasser ins flache Wasser vor dem Strand. Was geschieht mit ihrer Wellenlänge?',
      },
      options: [
        { en: 'It gets longer', de: 'Sie wird länger' },
        { en: 'It gets shorter', de: 'Sie wird kürzer' },
        { en: 'It stays the same', de: 'Sie bleibt gleich' },
      ],
      answer: 1,
      explain: {
        en: 'In shallow water the waves are slower (v ≈ √(g·h)), but the frequency cannot change: as many crests arrive as leave. So λ = v / f gets shorter, and the waves pile up and get higher.',
        de: 'Im flachen Wasser sind die Wellen langsamer (v ≈ √(g·h)), aber die Frequenz kann sich nicht ändern: es kommen so viele Wellenberge an, wie weggehen. Also wird λ = v / f kürzer, und die Wellen stauen sich und werden höher.',
      },
    },
    {
      id: 'thunder', type: 'estimate', answer: 2060, unit: 'm',
      title: { en: 'Thunder and lightning', de: 'Blitz und Donner' },
      question: {
        en: 'You see a flash of lightning and hear the thunder 6 seconds later. How far away did the lightning strike?',
        de: 'Sie sehen einen Blitz und hören den Donner 6 Sekunden später. Wie weit entfernt hat der Blitz eingeschlagen?',
      },
      explain: {
        en: 'The light arrives almost at once; the sound travels at about 343 m/s. d = v·t = 343 m/s · 6 s ≈ 2 km. Rule of thumb: 3 seconds per kilometre.',
        de: 'Das Licht kommt fast sofort an; der Schall läuft mit etwa 343 m/s. d = v·t = 343 m/s · 6 s ≈ 2 km. Faustregel: 3 Sekunden pro Kilometer.',
      },
    },
    // ---------------------------------------------------------------- modern physics
    {
      id: 'photo-effect', type: 'predict',
      title: { en: 'Light on zinc', de: 'Licht auf Zink' },
      question: {
        en: 'Ultraviolet light knocks electrons out of a zinc plate. The UV lamp is replaced by a very bright red lamp. What happens?',
        de: 'Ultraviolettes Licht schlägt Elektronen aus einer Zinkplatte. Die UV-Lampe wird durch eine sehr helle rote Lampe ersetzt. Was passiert?',
      },
      options: [
        { en: 'More electrons fly off', de: 'Es fliegen mehr Elektronen weg' },
        { en: 'Fewer, but faster electrons fly off', de: 'Es fliegen weniger, aber schnellere Elektronen weg' },
        { en: 'No electrons fly off at all', de: 'Es fliegen gar keine Elektronen weg' },
      ],
      answer: 2,
      explain: {
        en: 'Light comes in photons of energy E = h·f. A red photon has about 1.9 eV, less than the 4.3 eV it takes to free an electron from zinc. A brighter lamp only sends more photons, and none of them has enough energy: Einstein’s explanation of the photoelectric effect.',
        de: 'Licht kommt in Photonen mit der Energie E = h·f. Ein rotes Photon hat etwa 1.9 eV, weniger als die 4.3 eV, die es braucht, um ein Elektron aus Zink zu lösen. Eine hellere Lampe schickt nur mehr Photonen, und keines hat genug Energie: Einsteins Erklärung des Photoeffekts.',
      },
    },
    {
      id: 'laser-photons', type: 'estimate', answer: 3.27e15, unit: '',
      title: { en: 'Photons from a laser pointer', de: 'Photonen aus einem Laserpointer' },
      question: {
        en: 'A red laser pointer (650 nm) has a power of 1 mW. How many photons does it emit every second?',
        de: 'Ein roter Laserpointer (650 nm) hat eine Leistung von 1 mW. Wie viele Photonen sendet er pro Sekunde aus?',
      },
      explain: {
        en: 'One photon has E = h·c / λ = 6.63·10⁻³⁴ J·s · 3.0·10⁸ m/s / 650·10⁻⁹ m ≈ 3.1·10⁻¹⁹ J. N = P / E = 10⁻³ W / 3.1·10⁻¹⁹ J ≈ 3·10¹⁵ photons per second.',
        de: 'Ein Photon hat E = h·c / λ = 6.63·10⁻³⁴ J·s · 3.0·10⁸ m/s / 650·10⁻⁹ m ≈ 3.1·10⁻¹⁹ J. N = P / E = 10⁻³ W / 3.1·10⁻¹⁹ J ≈ 3·10¹⁵ Photonen pro Sekunde.',
      },
    },
    {
      id: 'double-slit', type: 'predict',
      title: { en: 'Electrons through a double slit', de: 'Elektronen durch einen Doppelspalt' },
      question: {
        en: 'Electrons are fired at a double slit one at a time. Each one makes a dot where it hits the screen. After many thousands of electrons, what does the screen show?',
        de: 'Elektronen werden einzeln auf einen Doppelspalt geschossen. Jedes macht einen Punkt, wo es auf den Schirm trifft. Was zeigt der Schirm nach vielen tausend Elektronen?',
      },
      options: [
        { en: 'Two stripes, one behind each slit', de: 'Zwei Streifen, einen hinter jedem Spalt' },
        { en: 'Many stripes: an interference pattern', de: 'Viele Streifen: ein Interferenzmuster' },
        { en: 'One even, blurry patch', de: 'Einen gleichmässigen, verschwommenen Fleck' },
      ],
      answer: 1,
      explain: {
        en: 'Each electron arrives as a single dot, like a particle, but where the dots pile up follows a wave that passes through both slits and interferes with itself (de Broglie wavelength λ = h / p). Quantum objects are neither just particles nor just waves.',
        de: 'Jedes Elektron kommt als einzelner Punkt an, wie ein Teilchen, aber wo sich die Punkte häufen, folgt einer Welle, die durch beide Spalte geht und mit sich selbst interferiert (de-Broglie-Wellenlänge λ = h / p). Quantenobjekte sind weder nur Teilchen noch nur Wellen.',
      },
    },
    {
      id: 'carbon-dating', type: 'calculate', answer: 11460, unit: 'a',
      title: { en: 'An old bone', de: 'Ein alter Knochen' },
      question: {
        en: 'A bone contains only 25 % of the carbon-14 of a living bone. Carbon-14 has a half-life of 5730 years. How old is the bone, in years (a)?',
        de: 'Ein Knochen enthält nur noch 25 % des Kohlenstoff-14 eines lebenden Knochens. Kohlenstoff-14 hat eine Halbwertszeit von 5730 Jahren. Wie alt ist der Knochen, in Jahren (a)?',
      },
      explain: {
        en: '100 % → 50 % → 25 % takes two half-lives: t = 2 · 5730 a = 11 460 a. In general t = T½ · log₂(N₀ / N).',
        de: '100 % → 50 % → 25 % dauert zwei Halbwertszeiten: t = 2 · 5730 a = 11 460 a. Allgemein t = T½ · log₂(N₀ / N).',
      },
    },
    {
      id: 'twins', type: 'predict',
      title: { en: 'The twins', de: 'Die Zwillinge' },
      question: {
        en: 'One twin flies to a star and back at 90 % of the speed of light; the other stays on Earth. When they meet again, who is older?',
        de: 'Ein Zwilling fliegt mit 90 % der Lichtgeschwindigkeit zu einem Stern und zurück; der andere bleibt auf der Erde. Wer ist älter, wenn sie sich wiedersehen?',
      },
      options: [
        { en: 'The twin who travelled', de: 'Der Zwilling, der gereist ist' },
        { en: 'The twin who stayed on Earth', de: 'Der Zwilling, der auf der Erde blieb' },
        { en: 'Both are the same age', de: 'Beide sind gleich alt' },
      ],
      answer: 1,
      explain: {
        en: 'Time dilation: a moving clock runs slow by the factor γ = 1 / √(1 − v²/c²) ≈ 2.3 at 0.9 c. A trip of 20 years in Earth’s time takes only about 8.7 years for the traveller. It is not symmetric: only the traveller turns around and changes frames.',
        de: 'Zeitdilatation: eine bewegte Uhr geht um den Faktor γ = 1 / √(1 − v²/c²) ≈ 2.3 bei 0.9 c langsamer. Eine Reise von 20 Jahren in Erdzeit dauert für den Reisenden nur etwa 8.7 Jahre. Das ist nicht symmetrisch: nur der Reisende kehrt um und wechselt das Bezugssystem.',
      },
    },
    {
      id: 'sun-mass', type: 'estimate', answer: 4.23e9, unit: 'kg',
      title: { en: 'The Sun gets lighter', de: 'Die Sonne wird leichter' },
      question: {
        en: 'The Sun radiates a power of 3.8·10²⁶ W. By how many kilograms does its mass shrink every second?',
        de: 'Die Sonne strahlt eine Leistung von 3.8·10²⁶ W ab. Um wie viele Kilogramm nimmt ihre Masse jede Sekunde ab?',
      },
      explain: {
        en: 'E = m·c², so m = E / c² = 3.8·10²⁶ J / (3.0·10⁸ m/s)² ≈ 4.2·10⁹ kg every second: about four million tonnes. Still, in 4.6 billion years the Sun has lost less than 0.1 % of its mass.',
        de: 'E = m·c², also m = E / c² = 3.8·10²⁶ J / (3.0·10⁸ m/s)² ≈ 4.2·10⁹ kg jede Sekunde: etwa vier Millionen Tonnen. Trotzdem hat die Sonne in 4.6 Milliarden Jahren weniger als 0.1 % ihrer Masse verloren.',
      },
    },
  ];

  const TOPICS = [
    { id: 'mixed', title: { en: 'A bit of everything', de: 'Von allem etwas' },
      rounds: ['tracks', 'room-air', 'copper-tube', 'stairs', 'ice-cubes', 'chocolate'] },
    { id: 'mechanics', title: { en: 'Mechanics', de: 'Mechanik' },
      rounds: ['paper-book', 'room-air', 'balloon-car', 'braking', 'tracks', 'chocolate'] },
    { id: 'em', title: { en: 'Electricity and magnetism', de: 'Elektrizität und Magnetismus' },
      rounds: ['bulbs', 'electrons', 'wires', 'filament', 'copper-tube', 'phone-battery'] },
    { id: 'waves', title: { en: 'Waves', de: 'Wellen' },
      rounds: ['rope-pulse', 'fm-radio', 'shallow-water', 'guitar', 'ambulance', 'thunder'] },
    { id: 'modern', title: { en: 'Modern physics', de: 'Moderne Physik' },
      rounds: ['photo-effect', 'laser-photons', 'double-slit', 'carbon-dating', 'twins', 'sun-mass'] },
  ];

  root.ALL_IN_ROUNDS = ROUNDS;
  root.ALL_IN_TOPICS = TOPICS;
  if (typeof module !== 'undefined') module.exports = { ROUNDS, TOPICS };
})(typeof window !== 'undefined' ? window : globalThis);
