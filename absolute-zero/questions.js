// Absolute Zero: the questions, 12 per topic, in English and German. Each has every answer the
// game accepts, as one string: answers are separated by ';', the spellings of one answer by '|'.
// The first spelling is the answer's name; one marked '=' is its German name (and is accepted too);
// '*' before an answer marks a rare one (few students think of it: the likely absolute zeros).
// Case, accents, spaces and hyphens do not matter when matching (game.js). Anything not listed is
// judged by the teacher at the reveal; `note` tells them what to watch for.
(function (root) {
  'use strict';

  const TOPICS = [
    { id: 'mechanics', title: { en: 'Mechanics', de: 'Mechanik' } },
    { id: 'em', title: { en: 'Electricity and magnetism', de: 'Elektrizität und Magnetismus' } },
    { id: 'waves', title: { en: 'Waves', de: 'Wellen' } },
    { id: 'heat', title: { en: 'Thermodynamics', de: 'Wärmelehre' } },
    { id: 'modern', title: { en: 'Modern physics', de: 'Moderne Physik' } },
  ];

  const Q = (id, topic, en, de, answers, note) => ({ id, topic, q: { en, de }, answers, note });

  const QUESTIONS = [
    // ---------------------------------------------------------------- mechanics
    Q('length-units', 'mechanics', 'A unit of length', 'Eine Längeneinheit',
      'metre|m|meter; kilometre|km|kilometer; centimetre|cm|centimeter|=Zentimeter; millimetre|mm|millimeter; decimetre|dm|decimeter|=Dezimeter; ' +
      'micrometre|µm|um|micrometer|micron|=Mikrometer; nanometre|nm|nanometer; inch|in|=Zoll; foot|ft|feet|=Fuss; yard|yd; mile|mi|=Meile; ' +
      'nautical mile|=Seemeile; light year|ly|=Lichtjahr; astronomical unit|AU|=Astronomische Einheit|AE; *parsec|pc; *ångström|angstrom|Å; ' +
      '*fermi|femtometre|fm|femtometer; *Planck length|=Planck-Länge; *furlong; *fathom|=Faden; *picometre|pm|picometer; *megametre|Mm'),
    Q('forces', 'mechanics', 'A force in nature or everyday life', 'Eine Kraft in der Natur oder im Alltag',
      'weight|gravity|gravitational force|=Gewichtskraft|Schwerkraft|Gravitationskraft|Gewicht; normal force|=Normalkraft; friction|frictional force|=Reibungskraft|Reibung|Haftreibung|Gleitreibung; ' +
      'tension|=Seilkraft|Zugkraft; spring force|elastic force|=Federkraft; air resistance|drag|=Luftwiderstand; buoyancy|upthrust|buoyant force|=Auftrieb|Auftriebskraft; ' +
      'electric force|Coulomb force|electrostatic force|=elektrische Kraft|Coulombkraft; magnetic force|=magnetische Kraft|Magnetkraft; Lorentz force|=Lorentzkraft; ' +
      'lift|=dynamischer Auftrieb; *centripetal force|=Zentripetalkraft; *strong force|strong nuclear force|=starke Kraft|starke Wechselwirkung; ' +
      '*weak force|weak nuclear force|=schwache Kraft|schwache Wechselwirkung; *surface tension|=Oberflächenspannung; *thrust|=Schubkraft|Schub; ' +
      '*rolling resistance|=Rollreibung|Rollwiderstand; *muscle force|=Muskelkraft; *tidal force|=Gezeitenkraft; *Coriolis force|=Corioliskraft',
      { en: 'Centrifugal force is an inertial force: accept it if you like.', de: 'Die Zentrifugalkraft ist eine Trägheitskraft: nach Belieben gelten lassen.' }),
    Q('conserved', 'mechanics', 'A quantity that is conserved in a closed system', 'Eine Grösse, die in einem abgeschlossenen System erhalten bleibt',
      'energy|=Energie; momentum|linear momentum|=Impuls; angular momentum|=Drehimpuls; charge|electric charge|=Ladung|elektrische Ladung; mass|=Masse; ' +
      '*baryon number|=Baryonenzahl; *lepton number|=Leptonenzahl; *colour charge|color charge|=Farbladung; *number of nucleons|nucleon number|=Nukleonenzahl; *CPT symmetry|CPT',
      { en: 'Mass is conserved in chemistry, not in nuclear reactions: accept it.', de: 'Die Masse ist in der Chemie erhalten, nicht bei Kernreaktionen: gelten lassen.' }),
    Q('simple-machines', 'mechanics', 'A simple machine', 'Eine einfache Maschine',
      'lever|=Hebel; inclined plane|ramp|slope|=schiefe Ebene|Rampe; pulley|block and tackle|=Rolle|Flaschenzug; wheel and axle|=Wellrad; wedge|=Keil; screw|=Schraube; ' +
      '*gear|gears|cogwheel|=Zahnrad; *hydraulic press|hydraulic lift|=hydraulische Presse|Hebebühne; *crowbar|=Brechstange; *see-saw|seesaw|=Wippe; *scissors|=Schere; *wheelbarrow|=Schubkarre',
      { en: 'Everyday examples of levers (scissors, crowbar, see-saw) count as their own answers.', de: 'Alltagsbeispiele für Hebel (Schere, Brechstange, Wippe) zählen als eigene Antworten.' }),
    Q('energy-units', 'mechanics', 'A unit of energy', 'Eine Energieeinheit',
      'joule|J; kilojoule|kJ; megajoule|MJ; kilowatt hour|kWh|=Kilowattstunde; calorie|cal|=Kalorie; kilocalorie|kcal|=Kilokalorie; electronvolt|eV|electron volt|=Elektronvolt; ' +
      'watt second|Ws|=Wattsekunde; *watt hour|Wh|=Wattstunde; *newton metre|Nm|newton meter|=Newtonmeter; *erg; *British thermal unit|BTU; *therm; *ton of TNT|=Tonne TNT|TNT-Äquivalent; ' +
      '*foot-pound|ft lb; *hartree; *rydberg; *megawatt hour|MWh; *terawatt hour|TWh'),
    Q('planets', 'mechanics', 'A planet or dwarf planet of the solar system', 'Ein Planet oder Zwergplanet des Sonnensystems',
      'Mercury|=Merkur; Venus; Earth|=Erde; Mars; Jupiter; Saturn; Uranus; Neptune|=Neptun; Pluto; *Ceres; *Eris; *Haumea; *Makemake',
      { en: 'Moons such as Titan or the Moon are wrong.', de: 'Monde wie Titan oder der Mond sind falsch.' }),
    Q('low-friction-sports', 'mechanics', 'A sport in which friction is deliberately reduced', 'Eine Sportart, bei der die Reibung absichtlich verringert wird',
      'skiing|ski|=Skifahren|Ski; ice skating|skating|figure skating|=Eislaufen|Schlittschuhlaufen|Eiskunstlauf; curling; ice hockey|=Eishockey; bobsleigh|bobsled|bob; ' +
      'luge|sledding|tobogganing|=Rodeln|Schlitteln; skeleton; snowboarding|snowboard; speed skating|=Eisschnelllauf; swimming|=Schwimmen; cross-country skiing|=Langlauf; ' +
      '*ski jumping|=Skispringen; *air hockey|=Airhockey; *bowling; *dog sledding|=Hundeschlittenrennen; *waterskiing|=Wasserski; *surfing|=Surfen; *billiards|snooker|=Billard',
      { en: 'Swimmers shave and wear smooth suits to cut drag: accept other sports with a good argument.', de: 'Schwimmer rasieren sich und tragen glatte Anzüge gegen den Widerstand: andere Sportarten mit gutem Argument gelten lassen.' }),
    Q('mechanics-laws', 'mechanics', 'A scientist with a law or principle of mechanics named after them', 'Eine Person mit einem Gesetz oder Prinzip der Mechanik',
      'Newton; Hooke; Kepler; Archimedes; Pascal; Bernoulli; Galileo|Galilei; *Huygens; *Stokes; *Torricelli; *Coriolis; *d’Alembert|dAlembert|Alembert; *Hamilton; ' +
      '*Lagrange; *Euler; *Steiner; *Noether|Emmy Noether; *Maupertuis; *Mach'),
    Q('time-units', 'mechanics', 'A unit of time', 'Eine Zeiteinheit',
      'second|s|=Sekunde; millisecond|ms|=Millisekunde; microsecond|µs|=Mikrosekunde; nanosecond|ns|=Nanosekunde; minute|min|=Minute; hour|h|=Stunde; day|d|=Tag; ' +
      'week|=Woche; month|=Monat; year|a|y|=Jahr; decade|=Jahrzehnt|Dekade; century|=Jahrhundert; millennium|=Jahrtausend; *fortnight; *leap second|=Schaltsekunde; ' +
      '*sidereal day|=Sterntag; *jiffy; *shake; *Planck time|=Planck-Zeit; *aeon|eon|=Äon; *picosecond|ps|=Pikosekunde; *femtosecond|fs|=Femtosekunde',
      { en: 'A light year is a length: wrong.', de: 'Ein Lichtjahr ist eine Länge: falsch.' }),
    Q('vectors', 'mechanics', 'A vector quantity', 'Eine vektorielle Grösse',
      'velocity|=Geschwindigkeit; acceleration|=Beschleunigung; force|=Kraft; displacement|=Verschiebung|Ortsvektor|position; momentum|=Impuls; weight|=Gewichtskraft; ' +
      'electric field|E field|=elektrisches Feld|elektrische Feldstärke; magnetic field|B field|=Magnetfeld|magnetische Flussdichte; *angular velocity|=Winkelgeschwindigkeit; ' +
      '*angular momentum|=Drehimpuls; *torque|=Drehmoment; *impulse|=Kraftstoss; *gravitational field|=Gravitationsfeld; *current density|=Stromdichte; *Poynting vector|=Poynting-Vektor; *jerk|=Ruck'),
    Q('scalars', 'mechanics', 'A scalar quantity', 'Eine skalare Grösse',
      'mass|=Masse; time|=Zeit; temperature|=Temperatur; energy|=Energie; speed|=Geschwindigkeitsbetrag|Tempo; distance|=Strecke|Distanz; volume|=Volumen; density|=Dichte; ' +
      'power|=Leistung; work|=Arbeit; pressure|=Druck; charge|electric charge|=Ladung; voltage|potential|=Spannung|Potential; resistance|=Widerstand; frequency|=Frequenz; ' +
      'length|=Länge; area|=Fläche; *entropy|=Entropie; *amount of substance|=Stoffmenge; *luminous intensity|=Lichtstärke; *heat capacity|=Wärmekapazität; *current|electric current|=Stromstärke',
      { en: 'Current is a scalar in school physics (current density is the vector): accept it.', de: 'Die Stromstärke ist in der Schulphysik ein Skalar (die Stromdichte ist der Vektor): gelten lassen.' }),
    Q('circular-motion', 'mechanics', 'Something that moves (nearly) uniformly in a circle', 'Etwas, das sich (fast) gleichförmig im Kreis bewegt',
      'Moon|=Mond; Earth|Earth around the Sun|=Erde; Ferris wheel|=Riesenrad; merry-go-round|carousel|=Karussell; clock hand|clock hands|=Uhrzeiger|Zeiger; ' +
      'washing machine drum|washing machine|=Waschmaschine|Waschtrommel; satellite|=Satellit; record|vinyl|CD|=Schallplatte; wheel|tyre|=Rad|Reifen; centrifuge|=Zentrifuge; ' +
      'planet|=Planet; fan|=Ventilator; *electron in an atom|electron|=Elektron; *charged particle in a magnetic field|=geladenes Teilchen im Magnetfeld; ' +
      '*hammer throw|=Hammerwurf; *salad spinner|=Salatschleuder; *ISS; *chain carousel|=Kettenkarussell; *drill|=Bohrmaschine'),

    // ---------------------------------------------------------------- electricity and magnetism
    Q('conductors', 'em', 'A material that conducts electricity well', 'Ein Material, das Strom gut leitet',
      'copper|Cu|=Kupfer; silver|Ag|=Silber; gold|Au; aluminium|aluminum|Al; iron|Fe|=Eisen; steel|=Stahl; graphite|=Graphit; salt water|=Salzwasser; mercury|Hg|=Quecksilber; ' +
      'brass|=Messing; tungsten|W|=Wolfram; lead|Pb|=Blei; zinc|Zn|=Zink; platinum|Pt|=Platin; metal|metals|=Metall; *graphene|=Graphen; *plasma; *sea water|=Meerwasser; ' +
      '*tin|Sn|=Zinn; *nickel|Ni; *sodium|Na|=Natrium; *titanium|Ti|=Titan; *bronze; *constantan|=Konstantan',
      { en: 'Any metal counts: add names that are not listed as correct.', de: 'Jedes Metall zählt: nicht aufgeführte als richtig werten.' }),
    Q('insulators', 'em', 'An electrical insulator', 'Ein elektrischer Isolator',
      'plastic|plastics|=Kunststoff|Plastik; rubber|=Gummi; glass|=Glas; wood|=Holz; air|=Luft; ceramic|porcelain|=Keramik|Porzellan; paper|=Papier; ' +
      'pure water|distilled water|=destilliertes Wasser|reines Wasser; oil|=Öl; PVC; *diamond|=Diamant; *Teflon|PTFE; *mica|=Glimmer; *vacuum|=Vakuum; *silicone|=Silikon; ' +
      '*quartz|=Quarz; *amber|=Bernstein; *styrofoam|polystyrene|=Styropor; *wool|=Wolle; *cotton|=Baumwolle; *leather|=Leder; *nylon'),
    Q('induction', 'em', 'A device that works by electromagnetic induction', 'Ein Gerät, das mit elektromagnetischer Induktion funktioniert',
      'generator|=Generator; dynamo|bicycle dynamo|=Velodynamo|Fahrraddynamo; transformer|=Transformator|Trafo; induction hob|induction cooker|induction stove|=Induktionsherd; ' +
      'wireless charger|=kabelloses Ladegerät|Induktionsladegerät; electric toothbrush|=elektrische Zahnbürste; microphone|dynamic microphone|=Mikrofon; metal detector|=Metalldetektor; ' +
      '*RFID|NFC|contactless card|=kontaktlose Karte; *eddy current brake|=Wirbelstrombremse; *guitar pickup|electric guitar|=Tonabnehmer|E-Gitarre; *ignition coil|=Zündspule; ' +
      '*shake flashlight|=Schütteltaschenlampe; *induction loop|=Induktionsschleife; *residual current device|RCD|GFCI|=FI-Schalter; *loudspeaker|=Lautsprecher; *electricity meter|=Stromzähler'),
    Q('si-unit-people', 'em', 'A scientist with an SI unit named after them', 'Eine Person, nach der eine SI-Einheit benannt ist',
      'Newton; Joule; Watt; Volta|Volt; Ampère|Ampere; Ohm; Coulomb; Pascal; Hertz; Kelvin|Lord Kelvin|Thomson; Tesla; *Weber; *Henry; *Siemens; *Faraday|farad; ' +
      '*Becquerel; *Gray; *Sievert; *Celsius'),
    Q('em-units', 'em', 'A unit used in electricity and magnetism', 'Eine Einheit aus Elektrizität und Magnetismus',
      'volt|V; ampere|A|amp; ohm|Ω; watt|W; coulomb|C; farad|F; tesla|T; kilowatt hour|kWh|=Kilowattstunde; ampere hour|Ah|mAh|milliampere hour|=Amperestunde; ' +
      'milliampere|mA; kilovolt|kV; *henry|H; *weber|Wb; *siemens|S; *gauss|G; *electronvolt|eV|=Elektronvolt; *volt-ampere|VA; *oersted; *microfarad|µF; *kiloohm|kΩ; *megaohm|MΩ'),
    Q('heating-appliances', 'em', 'A household appliance that turns electrical energy mainly into heat', 'Ein Haushaltgerät, das elektrische Energie vor allem in Wärme umwandelt',
      'kettle|=Wasserkocher; toaster; oven|=Backofen|Ofen; hob|stove|cooker|=Herd|Kochherd; hair dryer|hairdryer|=Föhn|Haartrockner; iron|=Bügeleisen; heater|radiator|=Heizung|Heizlüfter|Heizofen; ' +
      'electric blanket|=Heizdecke; boiler|water heater|=Boiler; coffee machine|coffee maker|=Kaffeemaschine; dishwasher|=Geschirrspüler|Abwaschmaschine; washing machine|=Waschmaschine; ' +
      'tumble dryer|dryer|=Tumbler|Wäschetrockner; *waffle iron|=Waffeleisen; *raclette grill|raclette|=Raclette; *soldering iron|=Lötkolben; *hair straightener|=Glätteisen; ' +
      '*towel warmer|=Handtuchwärmer; *fondue|=Fondue-Rechaud; *light bulb|incandescent bulb|=Glühbirne; *sandwich maker|=Sandwichmaker; *grill|=Grill; *microwave|=Mikrowelle',
      { en: 'A microwave heats food but makes microwaves first: your call.', de: 'Eine Mikrowelle erwärmt Essen, erzeugt aber zuerst Mikrowellen: Ihr Entscheid.' }),
    Q('permanent-magnets', 'em', 'An everyday object that contains a permanent magnet', 'Ein Alltagsgegenstand mit einem Dauermagneten',
      'fridge magnet|=Kühlschrankmagnet; loudspeaker|speaker|headphones|earphones|=Lautsprecher|Kopfhörer; compass|=Kompass; fridge door|fridge door seal|=Kühlschranktür; ' +
      'electric motor|motor|=Elektromotor; hard disk|hard drive|=Festplatte; phone case|=Handyhülle; cupboard door catch|=Schranktürverschluss|Magnetverschluss; whiteboard magnet|=Magnet für die Wandtafel; ' +
      'magnetic toys|=Magnetspielzeug; *microphone|=Mikrofon; *guitar pickup|electric guitar|=Tonabnehmer|E-Gitarre; *bicycle dynamo|=Velodynamo|Dynamo; *MagSafe; *bag clasp|handbag clasp|=Taschenverschluss; ' +
      '*wind turbine|=Windkraftanlage; *electric car|=Elektroauto; *vibration motor|=Vibrationsmotor; *knife holder|=Messerleiste'),
    Q('ferromagnets', 'em', 'A ferromagnetic element', 'Ein ferromagnetisches Element',
      'iron|Fe|=Eisen; nickel|Ni; cobalt|Co|=Kobalt; *gadolinium|Gd; *dysprosium|Dy; *terbium|Tb; *holmium|Ho; *erbium|Er; *thulium|Tm',
      { en: 'Steel, magnetite and neodymium magnets are not elements. Neodymium itself is not ferromagnetic: wrong.', de: 'Stahl, Magnetit und Neodym-Magnete sind keine Elemente. Neodym selbst ist nicht ferromagnetisch: falsch.' }),
    Q('electricity-sources', 'em', 'A source of electrical energy', 'Eine Quelle elektrischer Energie',
      'battery|=Batterie; power plant|power station|=Kraftwerk; solar cell|solar panel|photovoltaics|PV|=Solarzelle|Solarpanel|Photovoltaik; generator|=Generator; dynamo; ' +
      'wind turbine|=Windkraftanlage|Windrad; fuel cell|=Brennstoffzelle; socket|mains|=Steckdose; hydroelectric power plant|hydropower|=Wasserkraftwerk; ' +
      'nuclear power plant|=Kernkraftwerk|Atomkraftwerk|AKW; rechargeable battery|accumulator|=Akku|Akkumulator; *thermocouple|=Thermoelement; *piezo crystal|piezo|=Piezokristall; ' +
      '*Van de Graaff generator|=Bandgenerator; *lightning|=Blitz; *electric eel|=Zitteraal; *RTG|radioisotope generator|=Radionuklidbatterie; *supercapacitor|capacitor|=Kondensator|Superkondensator; ' +
      '*lemon battery|potato battery|=Zitronenbatterie|Kartoffelbatterie; *power bank|powerbank'),
    Q('components', 'em', 'An electronic component on a circuit board', 'Ein elektronisches Bauteil auf einer Leiterplatte',
      'resistor|=Widerstand; capacitor|=Kondensator; diode|=Diode; LED|light-emitting diode|=Leuchtdiode; transistor; coil|inductor|=Spule; switch|=Schalter; chip|IC|integrated circuit|microchip|=integrierter Schaltkreis; ' +
      'fuse|=Sicherung; relay|=Relais; quartz crystal|oscillator|=Quarz|Schwingquarz; potentiometer|poti; *transformer|=Transformator; *thermistor|NTC|PTC|=Heissleiter|Kaltleiter; ' +
      '*photoresistor|LDR|=Fotowiderstand; *Zener diode|=Zenerdiode; *varistor; *thyristor; *optocoupler|=Optokoppler; *buzzer|=Summer; *microcontroller|processor|CPU|=Prozessor'),
    Q('magnetic-objects', 'em', 'Something that is attracted by a magnet', 'Etwas, das von einem Magneten angezogen wird',
      'iron nail|nail|=Eisennagel|Nagel; paper clip|=Büroklammer; spoon|steel spoon|=Löffel; fridge door|=Kühlschranktür; tin can|can|=Konservendose|Dose; scissors|=Schere; screw|screws|=Schraube; ' +
      'coin|coins|euro cent|=Münze|Münzen; iron filings|=Eisenfeilspäne; iron|=Eisen; steel|=Stahl; nickel; cobalt|=Kobalt; another magnet|magnet|=Magnet; steel wool|=Stahlwolle; ' +
      '*hairpin|=Haarnadel|Haarklammer; *breakfast cereal|=Frühstücksflocken; *magnetite|=Magnetit; *liquid oxygen|=flüssiger Sauerstoff; *ferrofluid|=Ferrofluid; *compass needle|=Kompassnadel',
      { en: 'Coins: Swiss coins are hardly magnetic, euro cents (copper-plated steel) are.', de: 'Münzen: Schweizer Münzen sind kaum magnetisch, Euro-Cent (verkupferter Stahl) schon.' }),
    Q('static', 'em', 'A phenomenon caused by electric charge at rest', 'Ein Phänomen, das von ruhender elektrischer Ladung kommt',
      'static shock|electric shock|=elektrischer Schlag; hair standing up|=Haare stehen zu Berge; balloon on a wall|balloon|=Ballon an der Wand|Ballon; lightning|=Blitz; ' +
      'sparks|spark|=Funken; dust on a screen|dust|=Staub auf dem Bildschirm|Staub; clinging clothes|=Kleider kleben; cling film|=Frischhaltefolie; ' +
      '*photocopier|laser printer|=Kopierer|Laserdrucker; *electrostatic precipitator|=Elektrofilter; *electrostatic painting|powder coating|=Pulverbeschichtung; *St Elmo’s fire|=Elmsfeuer; ' +
      '*Van de Graaff generator|=Bandgenerator; *electroscope|=Elektroskop; *capacitor|=Kondensator'),

    // ---------------------------------------------------------------- waves
    Q('em-spectrum', 'waves', 'A part of the electromagnetic spectrum', 'Ein Bereich des elektromagnetischen Spektrums',
      'radio waves|radio|=Radiowellen; microwaves|=Mikrowellen; infrared|IR|=Infrarot; visible light|light|=sichtbares Licht|Licht; ultraviolet|UV|=Ultraviolett; ' +
      'X-rays|x rays|=Röntgenstrahlung|Röntgenstrahlen; gamma rays|gamma|=Gammastrahlung|Gammastrahlen; *terahertz radiation|terahertz|=Terahertzstrahlung; *long wave|=Langwelle; ' +
      '*VHF|FM|=UKW; *millimetre waves|=Millimeterwellen; *extreme ultraviolet|EUV; *medium wave|=Mittelwelle; *short wave|=Kurzwelle'),
    Q('rainbow', 'waves', 'A colour of the rainbow', 'Eine Farbe des Regenbogens',
      'red|=rot; orange; yellow|=gelb; green|=grün; blue|=blau; violet|purple|=violett; *indigo; *cyan|turquoise|=türkis',
      { en: 'Pink, brown, white or black: wrong.', de: 'Rosa, Braun, Weiss oder Schwarz: falsch.' }),
    Q('instruments', 'waves', 'A musical instrument', 'Ein Musikinstrument',
      'guitar|=Gitarre; violin|fiddle|=Geige|Violine; cello; double bass|bass|=Kontrabass; harp|=Harfe; piano|=Klavier; flute|=Querflöte|Flöte; recorder|=Blockflöte; ' +
      'clarinet|=Klarinette; saxophone|sax|=Saxophon; trumpet|=Trompete; trombone|=Posaune; tuba; organ|=Orgel; drum|drums|=Schlagzeug|Trommel; xylophone|=Xylophon; ' +
      'triangle|=Triangel; ukulele; viola|=Bratsche; oboe; horn|french horn|=Horn; keyboard|synthesizer; *didgeridoo; *timpani|=Pauke; *glockenspiel; *bell|=Glocke; ' +
      '*tuning fork|=Stimmgabel; *theremin; *bagpipes|=Dudelsack; *alphorn|=Alphorn; *harmonica|=Mundharmonika; *accordion|=Akkordeon|Handorgel; *hang|handpan; *banjo; *bassoon|=Fagott; *mandolin|=Mandoline',
      { en: 'After the reveal, ask the zeros how their instrument makes its sound.', de: 'Nach der Auflösung die Nullen fragen, wie ihr Instrument den Ton erzeugt.' }),
    Q('echolocation', 'waves', 'An animal that uses echolocation', 'Ein Tier, das Echoortung nutzt',
      'bat|bats|=Fledermaus; dolphin|=Delfin|Delphin; whale|toothed whale|sperm whale|=Wal|Zahnwal|Pottwal; orca|killer whale|=Schwertwal; porpoise|=Schweinswal; ' +
      '*shrew|=Spitzmaus; *oilbird|=Fettschwalm; *swiftlet|=Salangane; *tenrec|=Tanrek; *beluga; *narwhal|=Narwal',
      { en: 'Blind people who click with their tongue also echolocate: your call.', de: 'Auch blinde Menschen, die mit der Zunge schnalzen, orten mit Echo: Ihr Entscheid.' }),
    Q('wave-phenomena', 'waves', 'A wave phenomenon', 'Ein Wellenphänomen',
      'reflection|=Reflexion; refraction|=Brechung; diffraction|=Beugung; interference|=Interferenz; Doppler effect|Doppler|=Dopplereffekt; polarisation|polarization|=Polarisation; ' +
      'resonance|=Resonanz; standing wave|standing waves|=stehende Welle; dispersion|=Dispersion; absorption; echo|=Echo; *beats|=Schwebung; *total internal reflection|=Totalreflexion; ' +
      '*scattering|=Streuung; *superposition|=Überlagerung|Superposition; *damping|attenuation|=Dämpfung; *shock wave|sonic boom|=Überschallknall|Stosswelle; *tunnelling|=Tunneleffekt'),
    Q('ultrasound', 'waves', 'Something that sends out or uses ultrasound', 'Etwas, das Ultraschall aussendet oder nutzt',
      'ultrasound scan|sonography|ultrasound|=Ultraschalluntersuchung|Sonografie; bat|=Fledermaus; dolphin|=Delfin; dog whistle|=Hundepfeife; parking sensor|=Parksensor|Einparkhilfe; ' +
      'sonar|echo sounder|=Echolot; ultrasonic cleaner|=Ultraschallreiniger; motion sensor|=Bewegungsmelder; humidifier|=Luftbefeuchter; pest repeller|=Marderschreck; ' +
      '*material testing|=Materialprüfung; *lithotripsy|kidney stones|=Nierensteinzertrümmerung; *ultrasonic welding|=Ultraschallschweissen; *dental scaler|=Zahnsteinentfernung; ' +
      '*fish finder|=Fischfinder; *flow meter|=Durchflussmesser; *robot vacuum|=Staubsaugerroboter'),
    Q('em-communication', 'waves', 'Something that transmits information with electromagnetic waves', 'Etwas, das Information mit elektromagnetischen Wellen überträgt',
      'radio|=Radio; television|TV|=Fernseher|Fernsehen; mobile phone|phone|smartphone|cell phone|=Handy; Wi-Fi|wifi|WLAN; Bluetooth; GPS; remote control|=Fernbedienung; radar; ' +
      'satellite|=Satellit; fibre optic cable|fiber optics|=Glasfaser|Glasfaserkabel; NFC|contactless payment|=kontaktloses Bezahlen; walkie-talkie|=Funkgerät; *RFID; *traffic light|=Ampel; ' +
      '*lighthouse|=Leuchtturm; *Morse lamp|signal lamp|=Morselampe; *baby monitor|=Babyphone; *garage door opener|=Garagentoröffner; *car key|=Autoschlüssel; *radio telescope|=Radioteleskop'),
    Q('wave-quantities', 'waves', 'A quantity that describes a wave', 'Eine Grösse, die eine Welle beschreibt',
      'wavelength|λ|=Wellenlänge; frequency|f|=Frequenz; amplitude; period|T|=Periode|Periodendauer|Schwingungsdauer; speed|wave speed|phase velocity|=Ausbreitungsgeschwindigkeit|Geschwindigkeit|Phasengeschwindigkeit; ' +
      'intensity|=Intensität; phase|=Phase; *wave number|=Wellenzahl; *angular frequency|ω|=Kreisfrequenz; *group velocity|=Gruppengeschwindigkeit; *energy|=Energie; ' +
      '*polarisation|polarization|=Polarisation; *sound level|decibel|dB|=Schallpegel|Lautstärke; *direction|=Ausbreitungsrichtung'),
    Q('lenses', 'waves', 'An everyday device that uses a lens', 'Ein Alltagsgerät mit einer Linse',
      'glasses|spectacles|=Brille; camera|=Kamera|Fotoapparat; phone camera|=Handykamera; microscope|=Mikroskop; telescope|=Teleskop|Fernrohr; binoculars|=Feldstecher|Fernglas; ' +
      'magnifying glass|=Lupe; contact lenses|=Kontaktlinsen; projector|beamer|=Projektor|Beamer; eye|=Auge; *VR headset|=VR-Brille; *door viewer|peephole|=Türspion; ' +
      '*headlights|=Scheinwerfer; *lighthouse|=Leuchtturm; *overhead projector|=Hellraumprojektor|Overheadprojektor; *CD player|DVD player|Blu-ray; *barcode scanner|=Barcodescanner; *laser pointer|=Laserpointer; *webcam'),
    Q('transverse', 'waves', 'A transverse wave', 'Eine Transversalwelle',
      'light|=Licht; electromagnetic wave|radio wave|=elektromagnetische Welle|Radiowelle; wave on a string|guitar string|=Saitenwelle|Gitarrensaite; ' +
      'Mexican wave|stadium wave|=La-Ola-Welle|La Ola; water wave|water waves|=Wasserwelle; rope wave|=Seilwelle; *S-wave|S waves|shear wave|=S-Welle|Scherwelle; ' +
      '*gravitational wave|=Gravitationswelle; *drum skin|=Trommelfell; *X-rays|=Röntgenstrahlung; *microwaves|=Mikrowellen',
      { en: 'Water surface waves are partly longitudinal: accept them.', de: 'Wasserwellen sind teilweise longitudinal: gelten lassen.' }),
    Q('longitudinal', 'waves', 'A longitudinal wave', 'Eine Longitudinalwelle',
      'sound|=Schall; ultrasound|=Ultraschall; infrasound|=Infraschall; slinky|spring|=Feder|Slinky; *P-wave|P waves|primary wave|=P-Welle; *pressure wave|blast wave|=Druckwelle; ' +
      '*shock wave|=Stosswelle; *Newton’s cradle|=Kugelstosspendel; *sound in water|=Schall im Wasser; *seismic wave|=Erdbebenwelle'),
    Q('infrasound', 'waves', 'Something that makes infrasound', 'Etwas, das Infraschall erzeugt',
      'earthquake|=Erdbeben; volcano|=Vulkan; thunder|=Donner; elephant|elephants|=Elefant; whale|whales|=Wal; wind turbine|=Windkraftanlage|Windrad; storm|=Sturm; ' +
      'ocean waves|sea|surf|=Meereswellen|Brandung; *avalanche|=Lawine; *meteor|=Meteor; *organ|=Orgel; *explosion; *machines|=Maschinen; *tornado; *alligator; *tiger; *car|=Auto; *subwoofer'),

    // ---------------------------------------------------------------- thermodynamics
    Q('heat-transfer', 'heat', 'A way in which heat is transferred', 'Eine Art der Wärmeübertragung',
      'conduction|=Wärmeleitung|Leitung; convection|=Konvektion|Wärmeströmung|Strömung; radiation|thermal radiation|=Wärmestrahlung|Strahlung; *evaporation|=Verdunstung; ' +
      '*condensation|=Kondensation; *advection|=Advektion'),
    Q('temperature-scales', 'heat', 'A temperature scale', 'Eine Temperaturskala',
      'Celsius|°C; Fahrenheit|°F; Kelvin|K; *Rankine; *Réaumur|Reaumur; *Rømer|Romer|Roemer; *Delisle; *Newton'),
    Q('phase-changes', 'heat', 'A change of state', 'Eine Zustandsänderung (Phasenübergang)',
      'melting|=Schmelzen; freezing|solidification|=Erstarren|Gefrieren; evaporation|vaporisation|=Verdampfen|Verdunsten; boiling|=Sieden; condensation|=Kondensieren; ' +
      'sublimation|=Sublimieren|Sublimation; deposition|=Resublimieren|Resublimation; *ionisation|ionization|=Ionisation; *recombination|=Rekombination; ' +
      '*Curie transition|=Curie-Übergang; *superconducting transition|=Supraleitung; *Bose-Einstein condensation|=Bose-Einstein-Kondensation; *glass transition|=Glasübergang'),
    Q('heat-engines', 'heat', 'A heat engine or heat pump in everyday life', 'Eine Wärmekraftmaschine oder Wärmepumpe im Alltag',
      'car engine|engine|petrol engine|diesel engine|=Automotor|Motor|Benzinmotor|Dieselmotor|Verbrennungsmotor; fridge|refrigerator|=Kühlschrank; freezer|=Gefrierschrank|Tiefkühler; ' +
      'air conditioner|air conditioning|=Klimaanlage; heat pump|=Wärmepumpe; jet engine|=Düsentriebwerk|Triebwerk; steam engine|=Dampfmaschine; steam turbine|=Dampfturbine; ' +
      'motorbike|=Motorrad; lawnmower|=Rasenmäher; *Stirling engine|=Stirlingmotor; *gas turbine|=Gasturbine; *rocket engine|=Raketentriebwerk; *heat pump dryer|=Wärmepumpentrockner; ' +
      '*steam locomotive|=Dampflokomotive; *power plant|=Kraftwerk'),
    Q('gases', 'heat', 'A substance that is a gas at room temperature', 'Ein Stoff, der bei Zimmertemperatur gasförmig ist',
      'oxygen|O2|=Sauerstoff; nitrogen|N2|=Stickstoff; carbon dioxide|CO2|=Kohlendioxid|Kohlenstoffdioxid; hydrogen|H2|=Wasserstoff; helium|He; neon|Ne; argon|Ar; methane|CH4|=Methan; ' +
      'chlorine|Cl2|=Chlor; air|=Luft; krypton|Kr; xenon|Xe; radon|Rn; ozone|O3|=Ozon; carbon monoxide|CO|=Kohlenmonoxid; ammonia|NH3|=Ammoniak; propane|=Propan; butane|=Butan; ' +
      '*fluorine|F2|=Fluor; *nitrous oxide|laughing gas|N2O|=Lachgas; *hydrogen sulfide|H2S|=Schwefelwasserstoff; *ethane|=Ethan; *sulfur dioxide|SO2|=Schwefeldioxid; ' +
      '*acetylene|ethyne|=Acetylen|Ethin; *nitrogen dioxide|NO2|=Stickstoffdioxid; *ethylene|ethene|=Ethylen|Ethen',
      { en: 'Water vapour: water is liquid at room temperature, but vapour exists in the air: your call.', de: 'Wasserdampf: Wasser ist bei Zimmertemperatur flüssig, aber Dampf gibt es in der Luft: Ihr Entscheid.' }),
    Q('thermal-insulators', 'heat', 'A good thermal insulator', 'Ein guter Wärmeisolator',
      'air|=Luft; wool|=Wolle; polystyrene|styrofoam|=Styropor; down|feathers|=Daunen|Federn; fur|=Fell|Pelz; glass wool|fibreglass|=Glaswolle; cork|=Kork; wood|=Holz; ' +
      'vacuum|thermos flask|=Vakuum|Thermosflasche; foam|=Schaumstoff; snow|=Schnee; fat|blubber|=Fett; plastic|=Kunststoff; *aerogel; *mineral wool|rock wool|=Steinwolle; ' +
      '*straw|=Stroh; *polyurethane foam|PU foam|=PU-Schaum; *double glazing|=Doppelverglasung; *brick|=Backstein|Ziegel; *cotton|=Baumwolle'),
    Q('freezing-water', 'heat', 'Something that happens because water expands when it freezes', 'Etwas, das geschieht, weil sich Wasser beim Gefrieren ausdehnt',
      'ice floats|=Eis schwimmt; burst pipes|=geplatzte Leitungen|Rohrbruch; potholes|=Schlaglöcher; frost weathering|rocks split|=Frostsprengung; ' +
      'bottle bursts in the freezer|=Flasche platzt im Tiefkühler; lakes freeze from the top|=Seen gefrieren von oben; iceberg|=Eisberg; *frost heave|=Frosthebung; ' +
      '*splitting stone in quarries|=Steine spalten; *ice wedges|=Eiskeile; *car radiator bursts|=Kühler platzt; *fish survive winter|=Fische überleben den Winter'),
    Q('pressure-units', 'heat', 'A unit of pressure', 'Eine Druckeinheit',
      'pascal|Pa; hectopascal|hPa; kilopascal|kPa; bar; millibar|mbar; atmosphere|atm|=Atmosphäre; psi; millimetre of mercury|mmHg|torr|=Millimeter Quecksilbersäule; ' +
      '*newton per square metre|N/m2|N/m²; *metre of water|mWS|=Meter Wassersäule; *inch of mercury|inHg; *technical atmosphere|at|=technische Atmosphäre; *megapascal|MPa'),
    Q('low-expansion', 'heat', 'A material used because it hardly expands when heated', 'Ein Material, das gebraucht wird, weil es sich beim Erwärmen kaum ausdehnt',
      'Pyrex|borosilicate glass|=Borosilikatglas; invar; quartz glass|fused silica|=Quarzglas; glass ceramic|ceran|=Glaskeramik|Ceranfeld; *Zerodur; *carbon fibre|carbon|=Kohlefaser|Carbon; ' +
      '*cordierite|=Cordierit; *ceramic|=Keramik'),
    Q('below-zero', 'heat', 'Something colder than 0 °C', 'Etwas, das kälter als 0 °C ist',
      'ice|=Eis; freezer|=Gefrierschrank|Tiefkühler; dry ice|=Trockeneis; liquid nitrogen|=flüssiger Stickstoff; liquid helium|=flüssiges Helium; Antarctica|=Antarktis; ' +
      'North Pole|=Nordpol; South Pole|=Südpol; space|outer space|=Weltall|Weltraum; Pluto; Mars; stratosphere|=Stratosphäre; snow|=Schnee; ice cream|=Glace|Eiscreme; ' +
      '*glacier ice|=Gletschereis; *comet|=Komet; *MRI magnet|=MRI-Magnet; *cosmic background radiation|=kosmische Hintergrundstrahlung; *Neptune|=Neptun; *Boomerang Nebula|=Bumerangnebel; ' +
      '*Bose-Einstein condensate|=Bose-Einstein-Kondensat; *Moon at night|=Mond in der Nacht; *Siberia|=Sibirien'),
    Q('heat-capacity', 'heat', 'A substance with a higher specific heat capacity than iron', 'Ein Stoff mit grösserer spezifischer Wärmekapazität als Eisen',
      'water|=Wasser; ice|=Eis; air|=Luft; wood|=Holz; aluminium|aluminum; oil|=Öl; ethanol|alcohol|=Alkohol; *glass|=Glas; *concrete|=Beton; *hydrogen|=Wasserstoff; *helium; ' +
      '*ammonia|=Ammoniak; *lithium; *magnesium; *sodium|=Natrium; *paraffin|wax|=Wachs|Paraffin; *human body|=menschlicher Körper; *sand|=Sand; *steam|=Wasserdampf',
      { en: 'Iron: about 450 J/(kg·K). Copper, lead, silver and gold have less: wrong.', de: 'Eisen: etwa 450 J/(kg·K). Kupfer, Blei, Silber und Gold haben weniger: falsch.' }),
    Q('heat-losses', 'heat', 'A process in which energy is “lost” as heat', 'Ein Vorgang, bei dem Energie als Wärme «verloren» geht',
      'friction|=Reibung; braking|=Bremsen; air resistance|=Luftwiderstand; current in a wire|=Strom in einem Draht; light bulb|=Glühbirne; car engine|=Automotor; ' +
      'power line losses|=Leitungsverluste; transformer|=Transformator; computer; charging a phone|=Handy laden; inelastic collision|=unelastischer Stoss; bouncing ball|=springender Ball; ' +
      'pendulum|=Pendel; muscles|=Muskeln; *rolling tyres|=rollende Reifen; *eddy currents|=Wirbelströme; *hysteresis|=Hysterese; *absorbed sound|=Schallabsorption'),

    // ---------------------------------------------------------------- modern physics
    Q('particles', 'modern', 'An elementary particle of the Standard Model', 'Ein Elementarteilchen des Standardmodells',
      'electron|=Elektron; photon; up quark|up; down quark|down; neutrino|electron neutrino|=Elektron-Neutrino; gluon; Higgs boson|Higgs|=Higgs-Boson; muon|=Myon; ' +
      'quark; *tau|tauon; *strange quark|strange; *charm quark|charm; *bottom quark|bottom|beauty; *top quark|top; *muon neutrino|=Myon-Neutrino; *tau neutrino|=Tau-Neutrino; ' +
      '*W boson|W|=W-Boson; *Z boson|Z|=Z-Boson; *positron',
      { en: 'Protons and neutrons are made of quarks: wrong. Antiparticles (the positron): your call.', de: 'Protonen und Neutronen bestehen aus Quarks: falsch. Antiteilchen (das Positron): Ihr Entscheid.' }),
    Q('isotopes', 'modern', 'A radioactive isotope used in everyday life, medicine or science', 'Ein radioaktives Isotop aus Alltag, Medizin oder Forschung',
      'carbon-14|C-14|C14|=Kohlenstoff-14; uranium-235|U-235|=Uran-235; uranium-238|U-238|=Uran-238; plutonium-239|Pu-239|=Plutonium; iodine-131|I-131|=Iod-131|Jod-131; ' +
      'cobalt-60|Co-60|=Kobalt-60; radon-222|radon|Rn-222; americium-241|Am-241|=Americium; technetium-99m|Tc-99m|=Technetium; potassium-40|K-40|=Kalium-40; ' +
      'tritium|hydrogen-3|H-3; caesium-137|cesium-137|Cs-137|=Cäsium-137; *fluorine-18|F-18|=Fluor-18; *strontium-90|Sr-90; *polonium-210|Po-210|=Polonium; ' +
      '*thorium-232|Th-232|=Thorium; *radium-226|Ra-226|radium; *krypton-85|Kr-85; *lutetium-177|Lu-177',
      { en: 'Uranium or plutonium without a mass number: count it as the main isotope.', de: 'Uran oder Plutonium ohne Massenzahl: als wichtigstes Isotop zählen.' }),
    Q('nobel', 'modern', 'A winner of the Nobel Prize in Physics', 'Eine Person mit dem Nobelpreis für Physik',
      'Einstein; Marie Curie|Curie; Pierre Curie; Bohr|Niels Bohr; Planck|Max Planck; Röntgen|Roentgen; Heisenberg; Schrödinger|Schroedinger; Dirac; Fermi; Feynman; Pauli; ' +
      'Becquerel; de Broglie|Broglie; Higgs; *Englert; *Michelson; *Lorentz; *Zeeman; *J. J. Thomson|JJ Thomson; *Millikan; *Compton; *Chadwick; *Born|Max Born; ' +
      '*Goeppert Mayer|Maria Goeppert Mayer; *Strickland|Donna Strickland; *Ghez|Andrea Ghez; *Penrose; *Mayor|Michel Mayor; *Queloz|Didier Queloz; *Agostini; *L’Huillier|LHuillier; ' +
      '*Hinton; *Hopfield; *Bardeen; *Shockley; *Hess; *Laue|von Laue; *Wien; *Marconi; *Braun; *Rabi; *Bloch; *Gell-Mann; *Weinberg; *Salam; *Glashow; *Bednorz; *Müller|Alex Müller; ' +
      '*Rubbia; *van der Meer; *Kamerlingh Onnes; *Lenard; *Stark; *Raman; *Hawking',
      { en: 'Rutherford won the Nobel Prize in Chemistry; Hawking never won it: both wrong. Check other names against nobelprize.org.', de: 'Rutherford erhielt den Nobelpreis für Chemie, Hawking nie einen: beide falsch. Andere Namen auf nobelprize.org prüfen.' }),
    Q('photon-uses', 'modern', 'An application of the photoelectric effect or of single photons', 'Eine Anwendung des Photoeffekts oder einzelner Photonen',
      'solar cell|solar panel|=Solarzelle; camera sensor|CCD|CMOS|=Kamerasensor|Bildsensor; light sensor|=Lichtsensor|Dämmerungsschalter; photomultiplier|=Photomultiplier; ' +
      'night vision|=Nachtsichtgerät; barcode scanner|=Barcodescanner; laser; LED; smoke detector|=Rauchmelder; photodiode|=Photodiode|Fotodiode; *light meter|=Belichtungsmesser; ' +
      '*X-ray detector|=Röntgendetektor; *PET scanner|PET; *fibre optic receiver|=Glasfaser; *pulse oximeter|=Pulsoximeter; *automatic door|=automatische Tür'),
    Q('ionising', 'modern', 'Something that gives off ionising radiation', 'Etwas, das ionisierende Strahlung abgibt',
      'X-ray machine|X-ray|=Röntgengerät|Röntgen; nuclear power plant|=Kernkraftwerk|AKW; uranium|=Uran; radon; Sun|=Sonne; cosmic rays|=kosmische Strahlung; ' +
      'nuclear bomb|atomic bomb|=Atombombe; smoke detector|=Rauchmelder; banana|bananas|=Banane; granite|=Granit; CT scanner|CT|=Computertomograph; radioactive waste|=radioaktiver Abfall|Atommüll; ' +
      '*watch dial|radium dial|=Leuchtzifferblatt; *Brazil nuts|=Paranüsse; *uranium glass|=Uranglas; *gas mantle|=Glühstrumpf; *cigarettes|=Zigaretten; *human body|=menschlicher Körper; ' +
      '*flight|aeroplane|=Flug|Flugzeug; *PET scan|PET; *Chernobyl|Fukushima|=Tschernobyl'),
    Q('experiments', 'modern', 'A famous experiment of modern physics', 'Ein berühmtes Experiment der modernen Physik',
      'double-slit experiment|double slit|=Doppelspalt|Doppelspaltexperiment; photoelectric effect|=Photoeffekt|Fotoeffekt|Hallwachs; Rutherford scattering|gold foil|Geiger-Marsden|=Rutherford-Versuch|Streuversuch; ' +
      'Millikan oil drop|oil drop|=Millikan-Versuch|Öltröpfchenversuch; Michelson-Morley|Michelson; Stern-Gerlach; Franck-Hertz; Compton scattering|Compton|=Compton-Effekt; ' +
      'Higgs discovery|LHC|=Higgs-Entdeckung; LIGO|gravitational waves|=Gravitationswellen; *Davisson-Germer; *Bell test|=Bell-Test; *Hafele-Keating; *Pound-Rebka; *Wu experiment|=Wu-Experiment; ' +
      '*Cowan-Reines|neutrino detection|=Neutrino-Nachweis; *Aspect; *Cavendish'),
    Q('labs', 'modern', 'A particle accelerator or a large physics laboratory', 'Ein Teilchenbeschleuniger oder ein grosses Physiklabor',
      'CERN; LHC|Large Hadron Collider; PSI|Paul Scherrer Institut|Paul Scherrer Institute; Fermilab; SLAC; DESY; LEP; Tevatron; ITER; LIGO; *Brookhaven; *RHIC; *KEK; ' +
      '*SwissFEL; *ESRF; *J-PARC; *GSI|FAIR; *Super-Kamiokande|Kamiokande; *IceCube; *Virgo; *ESS|European Spallation Source; *JET; *Wendelstein 7-X|Wendelstein'),
    Q('relativity', 'modern', 'A prediction or effect of the theory of relativity', 'Eine Vorhersage oder ein Effekt der Relativitätstheorie',
      'time dilation|=Zeitdilatation; length contraction|=Längenkontraktion; E = mc2|E=mc²|mass-energy equivalence|=Masse-Energie-Äquivalenz; speed of light limit|=Lichtgeschwindigkeit als Grenze; ' +
      'twin paradox|=Zwillingsparadoxon; GPS corrections|GPS; black holes|black hole|=Schwarzes Loch|Schwarze Löcher; gravitational waves|=Gravitationswellen; gravitational lensing|=Gravitationslinse; ' +
      'light bending|=Lichtablenkung; relativity of simultaneity|=Relativität der Gleichzeitigkeit; *gravitational redshift|=Gravitationsrotverschiebung; *perihelion of Mercury|=Periheldrehung des Merkur; ' +
      '*frame dragging|=Lense-Thirring-Effekt; *Shapiro delay|=Shapiro-Verzögerung; *muons reaching the ground|muons|=Myonen; *relativistic mass|=relativistische Masse; *expanding universe|=Expansion des Universums'),
    Q('prefixes', 'modern', 'An SI prefix', 'Ein SI-Vorsatz (Präfix)',
      'kilo|k; mega|M; giga|G; tera|T; centi|c|=Zenti; milli|m; micro|µ|=Mikro; nano|n; deci|d|=Dezi; hecto|h|=Hekto; deca|deka|da; peta|P; exa|E; pico|p|=Piko; femto|f; ' +
      '*atto|a; *zetta|Z; *yotta|Y; *zepto|z; *yocto|y; *ronna|R; *quetta|Q; *ronto|r; *quecto|q'),
    Q('constants', 'modern', 'A natural constant', 'Eine Naturkonstante',
      'speed of light|c|=Lichtgeschwindigkeit; gravitational constant|G|=Gravitationskonstante; Planck constant|h|=Plancksches Wirkungsquantum|Planck-Konstante; elementary charge|e|=Elementarladung; ' +
      'Boltzmann constant|k|kB|=Boltzmann-Konstante; Avogadro constant|NA|Avogadro number|=Avogadro-Konstante|Avogadrozahl; electric constant|ε0|epsilon 0|vacuum permittivity|=elektrische Feldkonstante; ' +
      'magnetic constant|µ0|mu 0|vacuum permeability|=magnetische Feldkonstante; electron mass|me|=Elektronenmasse; *proton mass|mp|=Protonenmasse; *fine-structure constant|α|alpha|=Feinstrukturkonstante; ' +
      '*Rydberg constant|=Rydberg-Konstante; *Stefan-Boltzmann constant|σ|sigma|=Stefan-Boltzmann-Konstante; *gas constant|R|=Gaskonstante; *Faraday constant|F|=Faraday-Konstante; ' +
      '*reduced Planck constant|ħ|h bar|hbar; *Bohr radius|=Bohrscher Radius; *Wien constant|=Wiensche Konstante; *Hubble constant|=Hubble-Konstante; *cosmological constant|=kosmologische Konstante',
      { en: 'g = 9.81 m/s² is not a constant of nature: your call.', de: 'g = 9.81 m/s² ist keine Naturkonstante: Ihr Entscheid.' }),
    Q('lasers', 'modern', 'A use of lasers', 'Eine Anwendung von Lasern',
      'laser pointer|=Laserpointer; barcode scanner|=Barcodescanner|Kasse; CD player|DVD|Blu-ray|=CD-Spieler; eye surgery|LASIK|=Augenoperation|Augenlasern; laser printer|=Laserdrucker; ' +
      'fibre optic internet|fiber optics|=Glasfaser; laser cutting|=Laserschneiden; welding|=Schweissen; tattoo removal|=Tattooentfernung; hair removal|=Haarentfernung; ' +
      'laser show|=Lasershow; speed gun|rangefinder|=Laserpistole|Entfernungsmesser; lidar|LIDAR|self-driving cars; *Moon distance|lunar laser ranging|=Mondentfernung; *LIGO; ' +
      '*laser cooling|=Laserkühlung; *holography|hologram|=Holographie|Hologramm; *spectroscopy|=Spektroskopie; *optical tweezers|=optische Pinzette; *dentistry|=Zahnmedizin; *laser engraving|=Gravur'),
    Q('radiation-units', 'modern', 'A unit for radiation or radioactivity', 'Eine Einheit für Strahlung oder Radioaktivität',
      'becquerel|Bq; sievert|Sv|mSv|millisievert; gray|Gy; curie|Ci; *rem; *rad; *roentgen|röntgen|R; *counts per minute|cpm|=Impulse pro Minute; *UV index|=UV-Index'),
  ];

  root.ABSOLUTE_ZERO = { TOPICS, QUESTIONS };
  if (typeof module !== 'undefined') module.exports = { TOPICS, QUESTIONS };
})(typeof window !== 'undefined' ? window : globalThis);
