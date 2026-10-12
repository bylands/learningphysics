// The tutor's worked examples and the topics of practice. Each example is worked step by step,
// in the manner of the lecture notes (Electrostatics 4 and 5): capacitors combined from small
// blocks to larger ones; discharging and charging, from the start and the end to the curve
// between; the half-life and the time constant read from a graph, and what R and C change.
// A topic of practice (see topics.js) has stages, from exercises like the example to variations,
// and the example each stage belongs to (example(stage)).
(function (root) {
  'use strict';

  const L = (en, de) => root.Lang.L(en, de);
  const Fg = () => root.Figures;
  const C = () => root.Caps.CURVES;
  const p$ = (s) => `<p>${s}</p>`;
  const frame = (title, html, figure) => ({ text: `<p class="step-rule">${title}</p>${html}`, figure: `<div class="figs">${figure}</div>` });
  const lvl = (q) => ({ y: 1, label: `${q === 'U' ? Fg().Uq() : `<tspan class="it">${q}</tspan>`}₀` });
  const tau = { t: 1, label: '<tspan class="it">τ</tspan>' };
  const bare = (q, i, f, o = {}) => `<div class="fig">${Fg().graph({ curves: [{ f }], tEnd: 5, yMax: 1.2, bare: true, name: [q, i], levels: [lvl(q)], ...o })}</div>`;
  // four small graphs, numbered, as in the question of the lecture notes
  const four = (list) => `<div class="four">${list.map((c, k) => `<div class="fig"><span class="num">${k + 1}</span>${Fg().graph({ curves: [c.pts ? { pts: c.pts } : { f: c.f }], tEnd: 5, yMax: 1.2, bare: true, name: ['U', 'C'], levels: [lvl('U')], label: L(`Graph ${k + 1}`, `Graph ${k + 1}`) })}</div>`).join('')}</div>`;

  const EXAMPLES = [
    {
      name: () => L('Capacitors combined', 'Kondensatoren kombiniert'),
      idea: () => L('Work from small blocks to larger ones. In parallel the capacitances add (same voltage, the charges add); in series the reciprocals add (same charge, the voltages add): the rules of resistors, swapped.', 'Arbeite von kleinen zu grösseren Blöcken. Parallel addieren sich die Kapazitäten (gleiche Spannung, die Ladungen addieren sich); in Serie addieren sich die Kehrwerte (gleiche Ladung, die Spannungen addieren sich): die Regeln der Widerstände, vertauscht.'),
      frames() {
        const block = { p: [{ c: '2', v: 2 }, { c: '3', v: 4 }] }, net = { s: [{ c: '1', v: 3 }, block] };
        return [
          frame(L('The task', 'Die Aufgabe'), p$(L('Find the total capacitance between A and B.', 'Bestimme die Gesamtkapazität zwischen A und B.')) +
            p$(L('The method: find a group of capacitors that are only in series or only in parallel, replace it by one capacitor, and repeat until one is left.', 'Das Vorgehen: Suche eine Gruppe von Kondensatoren, die nur in Serie oder nur parallel geschaltet sind, ersetze sie durch einen Kondensator, und wiederhole das, bis nur noch einer übrig ist.')), Fg().network(net)),
          frame(L('Parallel: the same voltage', 'Parallel: dieselbe Spannung'), p$(L('$C_2$ and $C_3$ are connected to the same two points: they have the same voltage $\\Delta V$. Each stores $Q_k = C_k \\Delta V$, and together $Q = C_2\\Delta V + C_3\\Delta V$. So the capacitances add:', '$C_2$ und $C_3$ sind an dieselben zwei Punkte angeschlossen: Sie haben dieselbe Spannung $U$. Jeder speichert $Q_k = C_k U$, und zusammen $Q = C_2U + C_3U$. Also addieren sich die Kapazitäten:')) +
            p$('$C_{23} = C_2 + C_3 = 2\\,\\mu\\mathrm{F} + 4\\,\\mu\\mathrm{F} = \\htmlClass{result}{6\\,\\mu\\mathrm{F}}$'), Fg().network(net, { hl: block, cap: '$C_{23}$' })),
          frame(L('Series: the same charge', 'Serie: dieselbe Ladung'), p$(L('$C_1$ and $C_{23}$ are in series. The charge that leaves one plate of $C_1$ arrives on a plate of $C_{23}$: both carry the same charge $Q$. Their voltages add, $\\Delta V = Q/C_1 + Q/C_{23}$, so the reciprocals add:', '$C_1$ und $C_{23}$ sind in Serie. Die Ladung, die eine Platte von $C_1$ verlässt, kommt auf einer Platte von $C_{23}$ an: Beide tragen dieselbe Ladung $Q$. Ihre Spannungen addieren sich, $U = Q/C_1 + Q/C_{23}$, also addieren sich die Kehrwerte:')) +
            p$('$\\frac{1}{C} = \\frac{1}{C_1} + \\frac{1}{C_{23}} = \\frac{1}{3\\,\\mu\\mathrm{F}} + \\frac{1}{6\\,\\mu\\mathrm{F}} = \\frac{3}{6\\,\\mu\\mathrm{F}}$, ' + L('so', 'also') + ' $C = \\htmlClass{result}{2\\,\\mu\\mathrm{F}}$'), Fg().network(net, { reduce: [[block, '23', 6]] })),
          frame(L('Check: the typical mistake', 'Kontrolle: der typische Fehler'), p$(L('In series the total is smaller than the smallest capacitance: $2\\,\\mu\\mathrm{F} < 3\\,\\mu\\mathrm{F}$. In parallel it is larger than the largest: $6\\,\\mu\\mathrm{F} > 4\\,\\mu\\mathrm{F}$.', 'In Serie ist die Gesamtkapazität kleiner als die kleinste: $2\\,\\mu\\mathrm{F} < 3\\,\\mu\\mathrm{F}$. Parallel ist sie grösser als die grösste: $6\\,\\mu\\mathrm{F} > 4\\,\\mu\\mathrm{F}$.')) +
            p$(L('These are the rules of resistors, swapped: resistances add in series, capacitances in parallel. The typical mistake is to use the rules of resistors; here that would give $3 + \\frac{4}{3} \\approx 4.3\\,\\mu\\mathrm{F}$, more than $C_1$, which cannot be in series.', 'Das sind die Regeln der Widerstände, vertauscht: Widerstände addieren sich in Serie, Kapazitäten parallel. Der typische Fehler ist, die Regeln der Widerstände zu verwenden; hier gäbe das $3 + \\frac{4}{3} \\approx 4.3\\,\\mu\\mathrm{F}$, mehr als $C_1$, was in Serie nicht sein kann.')), Fg().network(net, { reduce: [[net, '', 2]] })),
        ];
      },
    },
    {
      name: () => L('Discharging', 'Entladen'),
      idea: () => L('Which graph shows the discharge? Start with t = 0 and the end; between them, the less charge is left, the smaller the current, and the slower the discharge: an exponential decay.', 'Welcher Graph zeigt das Entladen? Beginne bei t = 0 und beim Ende; dazwischen gilt: Je weniger Ladung übrig ist, desto kleiner der Strom und desto langsamer das Entladen: ein exponentieller Zerfall.'),
      frames() {
        const c = C(), list = [{ f: c.linDown }, { f: c.down }, { pts: [[0, 1], [1.5, 1], [1.5, 0], [5, 0]] }, { f: c.up }];
        return [
          frame(L('The question', 'Die Frage'), p$(L('A capacitor $C$ charged to $\\Delta V_0$ is discharged through a resistor $R$: the switch S is closed at $t = 0$. Which graph shows the voltage $\\Delta V_C$ across the capacitor?', 'Ein auf $U_0$ geladener Kondensator $C$ wird über einen Widerstand $R$ entladen: Der Schalter S wird bei $t = 0$ geschlossen. Welcher Graph zeigt die Spannung $U_C$ über dem Kondensator?')), Fg().rc('discharge') + four(list)),
          frame(L('Right after switching', 'Unmittelbar nach dem Schalten'), p$(L('The charge on the plates cannot vanish at once: it has to flow through the resistor. So right after switching the capacitor still has $\\Delta V_C = \\Delta V_0$. Graph 3 starts there too, but then the voltage would have to drop at once, without time for the charge to flow.', 'Die Ladung auf den Platten kann nicht auf einmal verschwinden: Sie muss durch den Widerstand fliessen. Unmittelbar nach dem Schalten hat der Kondensator also noch $U_C = U_0$. Auch Graph 3 beginnt dort, aber dann müsste die Spannung auf einmal abfallen, ohne Zeit für die Ladung zu fliessen.')) +
            p$(L('The capacitor drives a current through the resistor, and at the start it is largest: $I_0 = \\Delta V_0/R$.', 'Der Kondensator treibt einen Strom durch den Widerstand, und am Anfang ist er am grössten: $I_0 = U_0/R$.')), Fg().rc('discharge', { closed: true, cur: true })),
          frame(L('Long after', 'Lange danach'), p$(L('The current flows until the capacitor is empty: $\\Delta V_C = 0$, $I = 0$. Graph 4 goes the other way: it shows charging.', 'Der Strom fliesst, bis der Kondensator leer ist: $U_C = 0$, $I = 0$. Graph 4 geht in die andere Richtung: Er zeigt das Laden.')), four(list)),
          frame(L('In between', 'Dazwischen'), p$(L('The current $I = \\Delta V_C/R$ carries charge off the plates. As the charge decreases, $\\Delta V_C$ decreases, so the current decreases, and the charge flows off more and more slowly. The curve is steepest at the start and flattens out: graph 2, an exponential decay', 'Der Strom $I = U_C/R$ trägt Ladung von den Platten weg. Mit der Ladung nimmt $U_C$ ab, also nimmt der Strom ab, und die Ladung fliesst immer langsamer ab. Die Kurve ist am Anfang am steilsten und flacht ab: Graph 2, ein exponentieller Zerfall')) +
            p$(L('$\\Delta V_C = \\Delta V_0\\,e^{-t/\\tau}$', '$U_C = U_0\\,e^{-t/\\tau}$') + ', $\\tau = R\\cdot C$.') + p$(L('After one time constant $\\tau$ it is down to 37 %; it never quite reaches zero, but after $5\\tau$ less than 1 % is left. A straight line (graph 1) would need a constant current.', 'Nach einer Zeitkonstante $\\tau$ ist sie auf 37 % gesunken; sie erreicht nie ganz null, aber nach $5\\tau$ ist weniger als 1 % übrig. Eine Gerade (Graph 1) bräuchte einen konstanten Strom.')),
          bare('U', 'C', c.down, { marks: [tau] })),
          frame(L('The current', 'Der Strom'), p$(L('The current follows the voltage of the capacitor, $I = \\Delta V_C/R$: it jumps to $I_0 = \\Delta V_0/R$ at $t = 0$ and then decays with the same time constant. (It flows the other way than while charging.)', 'Der Strom folgt der Spannung des Kondensators, $I = U_C/R$: Er springt bei $t = 0$ auf $I_0 = U_0/R$ und nimmt dann mit derselben Zeitkonstante ab. (Er fliesst in die andere Richtung als beim Laden.)')) +
            p$(L('The resistor is connected straight across the capacitor: $\\Delta V_R = \\Delta V_C$ at every moment, the same curve.', 'Der Widerstand ist direkt an den Kondensator angeschlossen: $U_R = U_C$ in jedem Moment, dieselbe Kurve.')), bare('I', '', c.down, { marks: [tau] }) + bare('U', 'R', c.down, { marks: [tau] })),
          frame(L('With numbers', 'Mit Zahlen'), p$(L('Say $\\Delta V_0 = 12\\,\\mathrm{V}$ and $R = 4\\,\\mathrm{k\\Omega}$. Right after switching, $\\Delta V_R = \\Delta V_C = 12\\,\\mathrm{V}$ and $I_0 = \\frac{12\\,\\mathrm{V}}{4\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{3\\,\\mathrm{mA}}$.', 'Sagen wir $U_0 = 12\\,\\mathrm{V}$ und $R = 4\\,\\mathrm{k\\Omega}$. Unmittelbar nach dem Schalten ist $U_R = U_C = 12\\,\\mathrm{V}$ und $I_0 = \\frac{12\\,\\mathrm{V}}{4\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{3\\,\\mathrm{mA}}$.')) +
            p$(L('Later, when the capacitor is down to $\\Delta V_C = 6\\,\\mathrm{V}$: $\\Delta V_R = 6\\,\\mathrm{V}$ too, and $I = \\frac{6\\,\\mathrm{V}}{4\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{1.5\\,\\mathrm{mA}}$. (With $R$ in kΩ the current comes out in mA.)', 'Später, wenn der Kondensator auf $U_C = 6\\,\\mathrm{V}$ gesunken ist: auch $U_R = 6\\,\\mathrm{V}$, und $I = \\frac{6\\,\\mathrm{V}}{4\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{1.5\\,\\mathrm{mA}}$. (Mit $R$ in kΩ ergibt sich der Strom in mA.)')),
          Fg().rc('discharge', { closed: true, cur: true, R: '4 kΩ' })),
        ];
      },
    },
    {
      name: () => L('Charging', 'Laden'),
      idea: () => L('An empty capacitor is charged through a resistor. The current is largest at the start, not at the end; it falls as the capacitor fills, and the voltage of the capacitor rises ever more slowly towards ΔV₀.', 'Ein leerer Kondensator wird über einen Widerstand geladen. Der Strom ist am Anfang am grössten, nicht am Ende; er nimmt ab, während sich der Kondensator füllt, und U_C steigt immer langsamer gegen U₀.'),
      frames() {
        const c = C();
        return [
          frame(L('The task', 'Die Aufgabe'), p$(L('An uncharged capacitor $C$ is connected through a resistor $R$ to a battery with voltage $\\Delta V_0$; the switch closes at $t = 0$. Sketch $\\Delta V_C$, the current $I$ and $\\Delta V_R$ against time.', 'Ein ungeladener Kondensator $C$ ist über einen Widerstand $R$ mit einer Batterie der Spannung $U_0$ verbunden; der Schalter schliesst bei $t = 0$. Skizziere $U_C$, den Strom $I$ und $U_R$ gegen die Zeit.')) +
            p$(L('The loop rule holds at every moment: $\\Delta V_0 = \\Delta V_R + \\Delta V_C$, with $\\Delta V_R = R\\cdot I$.', 'Die Maschenregel gilt in jedem Moment: $U_0 = U_R + U_C$, mit $U_R = R\\cdot I$.')), Fg().rc('charge')),
          frame(L('Right after switching', 'Unmittelbar nach dem Schalten'), p$(L('The capacitor is still empty: $\\Delta V_C = 0$ (its voltage cannot jump). So the whole battery voltage is across the resistor, $\\Delta V_R = \\Delta V_0$, and the current is largest: $I_0 = \\Delta V_0/R$.', 'Der Kondensator ist noch leer: $U_C = 0$ (seine Spannung kann nicht springen). Also liegt die ganze Batteriespannung über dem Widerstand, $U_R = U_0$, und der Strom ist am grössten: $I_0 = U_0/R$.')) +
            p$(L('A typical mistake is to think the current starts at zero and grows with the charge. The current can jump; only the voltage of the capacitor cannot.', 'Ein typischer Fehler ist zu denken, der Strom beginne bei null und wachse mit der Ladung. Der Strom kann springen; nur die Spannung des Kondensators nicht.')), Fg().rc('charge', { closed: true, cur: true })),
          frame(L('Long after', 'Lange danach'), p$(L('The current flows until the capacitor is full. It stops when nothing is left for the resistor: $\\Delta V_R = 0$, $I = 0$, $\\Delta V_C = \\Delta V_0$. The capacitor then blocks the current like a gap.', 'Der Strom fliesst, bis der Kondensator voll ist. Er hört auf, wenn für den Widerstand nichts mehr übrig bleibt: $U_R = 0$, $I = 0$, $U_C = U_0$. Der Kondensator sperrt den Strom dann wie eine Lücke.')), bare('U', 'C', c.up, { marks: [tau] })),
          frame(L('In between', 'Dazwischen'), p$(L('The fuller the capacitor, the larger $\\Delta V_C$, the smaller $\\Delta V_R = \\Delta V_0 - \\Delta V_C$ and so the current: the capacitor charges more and more slowly.', 'Je voller der Kondensator, desto grösser $U_C$, desto kleiner $U_R = U_0 - U_C$ und damit der Strom: Der Kondensator lädt sich immer langsamer.')) +
            p$(L('$\\Delta V_C = \\Delta V_0\\left(1 - e^{-t/\\tau}\\right)$, $I = I_0\\,e^{-t/\\tau}$, $\\Delta V_R = \\Delta V_0\\,e^{-t/\\tau}$.', '$U_C = U_0\\left(1 - e^{-t/\\tau}\\right)$, $I = I_0\\,e^{-t/\\tau}$, $U_R = U_0\\,e^{-t/\\tau}$.')) + p$(L('$\\Delta V_C$ rises steeply at first and levels off at $\\Delta V_0$ (63 % after $\\tau$); the current and $\\Delta V_R$ fall, steeply at first. They mirror $\\Delta V_C$: at every moment $\\Delta V_R + \\Delta V_C = \\Delta V_0$.', '$U_C$ steigt zuerst steil an und flacht bei $U_0$ ab (63 % nach $\\tau$); der Strom und $U_R$ fallen, zuerst steil. Sie sind das Spiegelbild von $U_C$: In jedem Moment ist $U_R + U_C = U_0$.')),
          bare('U', 'C', c.up, { marks: [tau] }) + bare('I', '', c.down, { marks: [tau] }) + bare('U', 'R', c.down, { marks: [tau] })),
          frame(L('With numbers', 'Mit Zahlen'), p$(L('Say $\\Delta V_0 = 12\\,\\mathrm{V}$ and $R = 2\\,\\mathrm{k\\Omega}$. Right after switching: $\\Delta V_C = 0$, $\\Delta V_R = 12\\,\\mathrm{V}$, $I_0 = \\frac{12\\,\\mathrm{V}}{2\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{6\\,\\mathrm{mA}}$.', 'Sagen wir $U_0 = 12\\,\\mathrm{V}$ und $R = 2\\,\\mathrm{k\\Omega}$. Unmittelbar nach dem Schalten: $U_C = 0$, $U_R = 12\\,\\mathrm{V}$, $I_0 = \\frac{12\\,\\mathrm{V}}{2\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{6\\,\\mathrm{mA}}$.')) +
            p$(L('Later, when the capacitor has $\\Delta V_C = 9\\,\\mathrm{V}$: the loop rule leaves $\\Delta V_R = 12\\,\\mathrm{V} - 9\\,\\mathrm{V} = \\htmlClass{result}{3\\,\\mathrm{V}}$ for the resistor, so $I = \\frac{3\\,\\mathrm{V}}{2\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{1.5\\,\\mathrm{mA}}$.', 'Später, wenn der Kondensator $U_C = 9\\,\\mathrm{V}$ hat: Die Maschenregel lässt für den Widerstand $U_R = 12\\,\\mathrm{V} - 9\\,\\mathrm{V} = \\htmlClass{result}{3\\,\\mathrm{V}}$, also $I = \\frac{3\\,\\mathrm{V}}{2\\,\\mathrm{k\\Omega}} = \\htmlClass{result}{1.5\\,\\mathrm{mA}}$.')) +
            p$(L('The other way round: when the current is $I = 2\\,\\mathrm{mA}$, $\\Delta V_R = R\\cdot I = 4\\,\\mathrm{V}$ and $\\Delta V_C = 12\\,\\mathrm{V} - 4\\,\\mathrm{V} = \\htmlClass{result}{8\\,\\mathrm{V}}$. A typical mistake is $\\Delta V_R = \\Delta V_C$: that holds while discharging, not while charging.', 'Umgekehrt: Wenn der Strom $I = 2\\,\\mathrm{mA}$ ist, ist $U_R = R\\cdot I = 4\\,\\mathrm{V}$ und $U_C = 12\\,\\mathrm{V} - 4\\,\\mathrm{V} = \\htmlClass{result}{8\\,\\mathrm{V}}$. Ein typischer Fehler ist $U_R = U_C$: Das gilt beim Entladen, nicht beim Laden.')),
          Fg().rc('charge', { closed: true, cur: true, R: '2 kΩ', U0: '12 V' })),
        ];
      },
    },
    {
      name: () => L('Time constant and half-life', 'Zeitkonstante und Halbwertszeit'),
      idea: () => L('The half-life T½ is read where the voltage is ΔV₀/2, the time constant τ = R·C where it has fallen to 37 % (or risen to 63 %): T½ ≈ 0.69 τ. A larger R or C stretches the curve, but does not change where it starts or ends.', 'Die Halbwertszeit T½ liest man dort ab, wo die Spannung U₀/2 ist, die Zeitkonstante τ = R·C dort, wo sie auf 37 % gefallen (oder auf 63 % gestiegen) ist: T½ ≈ 0.69 τ. Ein grösseres R oder C streckt die Kurve, ändert aber nicht, wo sie beginnt oder endet.'),
      frames() {
        const f = (t) => 10 * Math.exp(-t / 2), th = 2 * Math.LN2;
        const g = (o) => `<div class="fig">${Fg().graph({ curves: [{ f }], tEnd: 8, yMax: 11, tStep: 1, yStep: 2, name: ['U', 'C'], unit: 'V', tUnit: 's', ...o })}</div>`;
        const twice = (k, m) => `<div class="fig">${Fg().graph({ curves: [{ f: (t) => 1 - Math.exp(-t), cls: 'ghost' }, { f: (t) => m * (1 - Math.exp(-t / k)) }], tEnd: 8, yMax: 1.2, bare: true, name: ['U', 'C'], levels: [lvl('U')], marks: [tau, { t: k, label: `${k}<tspan class="it">τ</tspan>` }] })}</div>`;
        return [
          frame(L('The half-life', 'Die Halbwertszeit'), p$(L('A capacitor charged to $\\Delta V_0 = 10\\,\\mathrm{V}$ is discharged. The half-life $T_{1/2}$ is the time until the voltage is $\\Delta V_0/2 = 5\\,\\mathrm{V}$: across from 5 V to the curve, down to the time axis: $T_{1/2} \\approx \\htmlClass{result}{1.4\\,\\mathrm{s}}$.', 'Ein auf $U_0 = 10\\,\\mathrm{V}$ geladener Kondensator wird entladen. Die Halbwertszeit $T_{1/2}$ ist die Zeit, bis die Spannung $U_0/2 = 5\\,\\mathrm{V}$ ist: Von 5 V hinüber zur Kurve, hinunter zur Zeitachse: $T_{1/2} \\approx \\htmlClass{result}{1.4\\,\\mathrm{s}}$.')),
            g({ levels: [{ y: 5 }], marks: [{ t: th }], dots: [[th, 5]] })),
          frame(L('Every half-life halves', 'Jede Halbwertszeit halbiert'), p$(L('After another $T_{1/2}$ the voltage has halved again: 2.5 V at $2T_{1/2} \\approx 2.8\\,\\mathrm{s}$, 1.25 V at $3T_{1/2}$. Equal times, equal factors: that is what makes the curve an exponential. (A straight line would be empty after $2T_{1/2}$.)', 'Nach einer weiteren $T_{1/2}$ hat sich die Spannung wieder halbiert: 2.5 V bei $2T_{1/2} \\approx 2.8\\,\\mathrm{s}$, 1.25 V bei $3T_{1/2}$. Gleiche Zeiten, gleiche Faktoren: Das macht die Kurve zu einer Exponentialfunktion. (Eine Gerade wäre nach $2T_{1/2}$ leer.)')),
            g({ levels: [{ y: 5 }, { y: 2.5 }, { y: 1.25 }], marks: [{ t: th }, { t: 2 * th }, { t: 3 * th }], dots: [[th, 5], [2 * th, 2.5], [3 * th, 1.25]] })),
          frame(L('The time constant', 'Die Zeitkonstante'), p$(L('After one time constant $\\tau$ the voltage is down to $e^{-1} \\approx 37\\,\\%$: 3.7 V at $\\tau = \\htmlClass{result}{2\\,\\mathrm{s}}$. The tangent at $t = 0$ reaches zero at the same time. While charging, read $\\tau$ where the capacitor is at 63 % of $\\Delta V_0$.', 'Nach einer Zeitkonstante $\\tau$ ist die Spannung auf $e^{-1} \\approx 37\\,\\%$ gesunken: 3.7 V bei $\\tau = \\htmlClass{result}{2\\,\\mathrm{s}}$. Die Tangente bei $t = 0$ erreicht null zur selben Zeit. Beim Laden liest man $\\tau$ dort ab, wo der Kondensator bei 63 % von $U_0$ ist.')) +
            p$(L('Do not mix them up: $T_{1/2} = \\tau\\cdot\\ln 2 \\approx 0.69\\,\\tau$, the half-life is the shorter one.', 'Verwechsle sie nicht: $T_{1/2} = \\tau\\cdot\\ln 2 \\approx 0.69\\,\\tau$, die Halbwertszeit ist die kürzere.')),
            g({ levels: [{ y: 3.7 }], marks: [{ t: 2 }], dots: [[2, 3.7]], lines: [[[0, 10], [2, 0]]] })),
          frame(L('Changing R or C', 'R oder C ändern'), p$(L('$\\tau = R\\cdot C$. With twice the resistance, half the current flows; with twice the capacitance, twice the charge is needed. Either way the charging takes twice as long: the curve is stretched by 2 along the time axis (grey: before).', '$\\tau = R\\cdot C$. Mit doppeltem Widerstand fliesst halb so viel Strom; mit doppelter Kapazität braucht es doppelt so viel Ladung. So oder so dauert das Laden doppelt so lang: Die Kurve wird entlang der Zeitachse um 2 gestreckt (grau: vorher).')) +
            p$(L('What does not change: the capacitor still charges to $\\Delta V_0$ (a larger $C$ stores more charge, at the same voltage). And the current at the start is $I_0 = \\Delta V_0/R$: it is halved by twice the resistance, but not changed by the capacitance.', 'Was sich nicht ändert: Der Kondensator lädt sich immer noch auf $U_0$ (ein grösseres $C$ speichert mehr Ladung, bei derselben Spannung). Und der Strom am Anfang ist $I_0 = U_0/R$: Er wird durch den doppelten Widerstand halbiert, durch die Kapazität aber nicht verändert.')),
            twice(2, 1)),
        ];
      },
    },
  ];

  const st = (en, de, types) => ({ name: en ? () => L(en, de) : null, types });
  const TOPICS = [
    { name: () => L('Combining capacitors', 'Kondensatoren kombinieren'), example: () => 0, stages: [st(null, null, ['pair']), st('larger or smaller?', 'grösser oder kleiner?', ['bounds']), st('three capacitors', 'drei Kondensatoren', ['mixed']), st('four or five capacitors', 'vier oder fünf Kondensatoren', ['network'])] },
    { name: () => L('Charging and discharging', 'Laden und Entladen'), example: (s) => (s < 2 ? 1 : 2), stages: [
      st(null, null, ['curve-u-d', 'curve-i-d', 'curve-r-d']), st('discharging with numbers', 'Entladen mit Zahlen', ['loop-d']),
      st('charging', 'Laden', ['curve-u', 'curve-i', 'curve-r']), st('charging with numbers', 'Laden mit Zahlen', ['loop'])] },
    { name: () => L('Time constant and half-life', 'Zeitkonstante und Halbwertszeit'), example: () => 3, stages: [st(null, null, ['read-half']), st('the time constant', 'die Zeitkonstante', ['read-tau']), st('changing R or C', 'R oder C ändern', ['predict', 'predict-graph'])] },
  ];

  root.Lessons = { EXAMPLES, TOPICS };
  if (typeof module !== 'undefined') module.exports = root.Lessons;
})(typeof window !== 'undefined' ? window : globalThis);
