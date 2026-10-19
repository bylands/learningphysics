// The exercises of Photoelectric Effect, with their texts in the current language (the app rebuilds them when
// the language changes). Every exercise has the form
//   { id, type, difficulty, title, text, figs (HTML), questions, hints, solution (HTML paragraphs),
//     solFig, p (what makes it new to the student) }
// with questions of four kinds:
//   { type: 'num', key, label, sym, unit, value, tol, abs, scale, wrong: [{ value, tag, why, nudge }] }
//        a number in the unit shown (value in that unit, e.g. 4.62 for 4.62 · 10¹⁴ Hz with unit
//        10¹⁴ Hz and scale 1e14: the full number 4.62e14 counts as well); tol: the relative error
//        allowed, abs: an absolute one (for values read off a graph, or small differences); wrong: the results of typical mistakes, each with what went wrong
//   { type: 'choice', key, label, options: [{ label, ok, why, tag, nudge }] }   one of a few answers
//   { type: 'pick', key, label, options: [{ html, ok, why, tag, nudge }] }       one of a few drawings
//   { type: 'multi', key, statements: [{ html, ok, why }] }              statements to tick
// The tags name the wrong idea behind an answer (the check's misconceptions, app.js). why explains
// a wrong answer (in the check, and once solved); nudge, where why would give the answer away, is
// shown instead while the exercise is open.
// All numbers are in electronvolts and can be worked out in the head: the light is given by a
// wavelength or a frequency whose photon energy is a round number of eV.
// The types, by topic:
//   model, photo-stmts            what the wave model of light cannot explain
//   energy, rank                  photon energy, and brightness (photons per second) against it
//   photo-calc                    Einstein's equation h·f = W + E_kin,max and the stopping voltage
//   photo-curve                   the current of a photocell against the voltage
//   photo-line                    the stopping voltage against the frequency: f₀, λ₀ (German f_G, λ_G), W and h/e
(function (root) {
  'use strict';

  const P = root.Photon || require('./physics.js');
  const G = root.PhotonPlot || require('./plot.js');
  const Lang = root.Lang || require('./lang.js');
  const L = (en, de) => Lang.L(en, de);
  const { rng, plain, pow, HC } = P;

  // ---------------------------------------------------------------- writing
  const i = (s) => `<i>${s}</i>`;
  const sb = (s) => `<sub>${s}</sub>`;
  const lam = i('λ'), E = i('E'), f = i('f'), h = i('h'), c = i('c');
  // The symbols that differ between the languages: English as in British A-level and IB textbooks
  // (work function φ, stopping voltage V_s, kinetic energy E_k, E_k,max, a voltage V, threshold
  // frequency f₀ and wavelength λ₀), German as in Swiss ones (W, U₀, E_kin, E_kin,max, U, f_G, λ_G).
  // Each is written in the language current when it is put into a text (`${W}`), so the texts of
  // both languages are built from the same names.
  const sym = (en, de) => ({ toString: () => L(en, de) });
  const W = sym(i('φ'), i('W')), U0 = sym(`${i('V')}${sb('s')}`, `${i('U')}${sb('0')}`), V = sym(i('V'), i('U'));
  const Ek = sym(`${i('E')}${sb('k')}`, `${i('E')}${sb('kin')}`), EkMax = sym(`${i('E')}${sb('k,max')}`, `${i('E')}${sb('kin,max')}`);
  const fG = sym(`${f}${sb('0')}`, `${f}${sb('G')}`), lG = sym(`${lam}${sb('0')}`, `${lam}${sb('G')}`);
  const SYM = { W, U0, V, Ek, EkMax, fG, lG };
  const nameOf = (x) => L(x.en, x.de);
  const fig = (html) => `<div class="fig">${html}</div>`;
  // an energy in eV with two decimals, as the student works it out (5.00 − 4.27 = 0.73)
  const e2 = (x) => (Math.round(x * 100) / 100).toFixed(2).replace('-', '−');
  const r2 = (x) => Math.round(x * 100) / 100;
  const CONST = () => `<p class="consts">${h} = 4.14 · 10<sup>−15</sup> eV·s, ${h}·${c} = 1240 eV·nm, ${c} = 3.00 · 10<sup>8</sup> m/s</p>`;

  // ---------------------------------------------------------------- questions
  const numQ = (key, label, sym, unit, value, o = {}) => ({ type: 'num', key, label, sym: sym == null ? sym : String(sym), unit, value, tol: o.tol || 0.012, abs: o.abs || 0, scale: o.scale || 1, wrong: (o.wrong || []).filter((w) => Number.isFinite(w.value) && Math.abs(w.value / value - 1) > 0.06) });
  const choice = (key, label, options) => ({ type: 'choice', key, label, options });
  const pick = (key, label, options) => ({ type: 'pick', key, label, options });
  const multi = (key, statements) => ({ type: 'multi', key, statements });
  // options from [label, ok, why, tag, nudge], shuffled (or in the order given)
  const opts = (r, list, keep) => { const o = list.map(([label, ok, why, tag, nudge]) => ({ label, ok, why: ok ? '' : why, tag: ok ? undefined : tag || 'other', nudge: ok ? '' : nudge || '' })); return keep ? o : r.shuffle(o); };

  // ---------------------------------------------------------------- typical mistakes
  const WHY = {
    inverse: () => L('The photon energy is inversely proportional to the wavelength: E = h·c/λ.', 'Die Photonenenergie ist umgekehrt proportional zur Wellenlänge: E = h·c/λ.'),
    noW: () => L('That is the whole photon energy: part of it is needed to free the electron from the metal.', 'Das ist die ganze Photonenenergie: Ein Teil davon wird gebraucht, um das Elektron aus dem Metall zu lösen.'),
    addW: () => L('The work function is used up in freeing the electron: subtract it.', 'Die Austrittsarbeit wird beim Herauslösen des Elektrons verbraucht: Ziehe sie ab.'),
    bright: () => L('Brightness is the number of photons per second, not the energy of one photon.', 'Die Helligkeit ist die Zahl der Photonen pro Sekunde, nicht die Energie eines Photons.'),
  };

  // the nudges for them while the exercise is open
  const NUDGE = {
    inverse: () => L('Check the direction: does the photon energy get larger or smaller with a longer wavelength?', 'Prüfe die Richtung: Wird die Photonenenergie mit grösserer Wellenlänge grösser oder kleiner?'),
    noW: () => L('Does the electron get the whole photon energy as kinetic energy? What does it cost to leave the metal?', 'Bekommt das Elektron die ganze Photonenenergie als kinetische Energie? Was kostet es, das Metall zu verlassen?'),
    addW: () => L('Check the sign of the work function in the energy balance: does it give the electron energy, or cost it energy?', 'Prüfe das Vorzeichen der Austrittsarbeit in der Energiebilanz: Bringt sie dem Elektron Energie, oder kostet sie welche?'),
    bright: () => L('What changes with brighter or dimmer light: the energy of each photon, or something else?', 'Was ändert sich bei hellerem oder schwächerem Licht: die Energie jedes Photons oder etwas anderes?'),
  };

  // ---------------------------------------------------------------- the wave model
  // The observations the wave model cannot explain: what it would predict, how photons explain
  // them, and two other wrong explanations [text, tag].
  const PUZZLES = [
    { id: 'threshold',
      obs: () => L('Below a certain frequency of the light, no electrons are released, however bright the light is.', 'Unterhalb einer bestimmten Frequenz des Lichts werden keine Elektronen ausgelöst, wie hell das Licht auch ist.'),
      wave: () => L('Light of any colour would release electrons if it were bright enough.', 'Licht jeder Farbe würde Elektronen auslösen, wenn es nur hell genug wäre.'),
      photon: () => L('An electron takes up the energy of one photon; below the threshold frequency, h·f is smaller than the work function φ.', 'Ein Elektron nimmt die Energie eines Photons auf; unterhalb der Grenzfrequenz ist h·f kleiner als die Austrittsarbeit W.'),
      wrong: [[() => L('Light below that frequency is always too dim to free electrons.', 'Licht unterhalb dieser Frequenz ist immer zu schwach, um Elektronen zu lösen.'), 'intensity'], [() => L('The electrons need more time to collect the energy of such light.', 'Die Elektronen brauchen mehr Zeit, um die Energie solchen Lichts zu sammeln.'), 'wave']] },
    { id: 'kinetic',
      obs: () => L('The kinetic energy of the fastest electrons does not depend on the brightness of the light.', 'Die kinetische Energie der schnellsten Elektronen hängt nicht von der Helligkeit des Lichts ab.'),
      wave: () => L('A brighter light, a stronger wave, would shake the electrons harder and release faster ones.', 'Helleres Licht, eine stärkere Welle, würde die Elektronen stärker schütteln und schnellere auslösen.'),
      photon: () => L('Brighter light brings more photons, each with the same energy h·f: more electrons, but not faster ones.', 'Helleres Licht bringt mehr Photonen, jedes mit derselben Energie h·f: mehr Elektronen, aber nicht schnellere.'),
      wrong: [[() => L('Brighter light consists of more energetic photons, but the metal takes up the extra energy.', 'Helleres Licht besteht aus energiereicheren Photonen, aber das Metall nimmt die zusätzliche Energie auf.'), 'intensity'], [() => L('The work function grows with the brightness of the light.', 'Die Austrittsarbeit wächst mit der Helligkeit des Lichts.'), 'work']] },
    { id: 'delay',
      obs: () => L('Even very dim light releases the first electrons at once, without any delay.', 'Auch sehr schwaches Licht löst die ersten Elektronen sofort aus, ohne Verzögerung.'),
      wave: () => L('In dim light, an electron would have to collect energy for a while before it could leave.', 'In schwachem Licht müsste ein Elektron eine Weile Energie sammeln, bevor es austreten kann.'),
      photon: () => L('Light delivers its energy in portions: the first photon to arrive can free an electron at once.', 'Licht liefert seine Energie in Portionen: Das erste Photon, das ankommt, kann sofort ein Elektron lösen.'),
      wrong: [[() => L('Dim light consists of photons with more energy each.', 'Schwaches Licht besteht aus Photonen mit je mehr Energie.'), 'intensity'], [() => L('The electrons already have enough energy and need no energy from the light.', 'Die Elektronen haben schon genug Energie und brauchen keine Energie vom Licht.'), 'work']] },
    { id: 'frequency',
      obs: () => L('The kinetic energy of the fastest electrons grows with the frequency of the light.', 'Die kinetische Energie der schnellsten Elektronen wächst mit der Frequenz des Lichts.'),
      wave: () => L('The energy of a wave depends on its amplitude, that is on the brightness, not on its frequency.', 'Die Energie einer Welle hängt von ihrer Amplitude ab, also von der Helligkeit, nicht von ihrer Frequenz.'),
      photon: () => L('Each photon brings h·f; what is left after the work function φ is the kinetic energy.', 'Jedes Photon bringt h·f; was nach der Austrittsarbeit W übrig bleibt, ist die kinetische Energie.'),
      wrong: [[() => L('Light of a higher frequency is always brighter.', 'Licht höherer Frequenz ist immer heller.'), 'intensity'], [() => L('Light of a higher frequency lowers the work function of the metal.', 'Licht höherer Frequenz senkt die Austrittsarbeit des Metalls.'), 'work']] },
  ];
  // Observations that fit the wave model as well, with why they do (and, where that gives the
  // answer away, a nudge for while the exercise is open).
  const FILLERS = [
    [() => L('Brighter light releases more electrons per second.', 'Helleres Licht löst mehr Elektronen pro Sekunde aus.'), () => L('More light, more energy, more electrons: the wave model expects that too. What it gets wrong is the energy of each electron.', 'Mehr Licht, mehr Energie, mehr Elektronen: Das erwartet auch das Wellenmodell. Falsch liegt es bei der Energie jedes einzelnen Elektrons.'), () => L('What would the wave model expect here? Does this observation fit a wave too?', 'Was würde das Wellenmodell hier erwarten? Passt diese Beobachtung auch zu einer Welle?')],
    [() => L('Light can release electrons from a metal.', 'Licht kann Elektronen aus einem Metall lösen.'), () => L('A wave carries energy too; the puzzle is which light does it, and how fast.', 'Auch eine Welle trägt Energie; das Rätsel ist, welches Licht es tut, und wie schnell.'), () => L('Does a wave not carry energy too? Would the wave model expect this observation, then?', 'Trägt nicht auch eine Welle Energie? Würde das Wellenmodell diese Beobachtung also erwarten?')],
    [() => L('A large enough counter-voltage stops the photocurrent.', 'Eine genügend grosse Gegenspannung stoppt den Photostrom.'), () => L('Electrons with a limited energy are stopped by a large enough voltage in any model.', 'Elektronen mit begrenzter Energie werden in jedem Modell von einer genügend grossen Spannung gestoppt.')],
    [() => L('The released electrons are negatively charged.', 'Die ausgelösten Elektronen sind negativ geladen.'), () => L('That is a fact about electrons, not about light: it fits any model of light.', 'Das ist eine Tatsache über Elektronen, nicht über Licht: Sie passt zu jedem Modell des Lichts.')],
  ];
  function model(seed) {
    const r = rng(seed * 29 + 1), pz = PUZZLES[seed % PUZZLES.length];
    const waveWhy = L('That is what the wave model predicts, and it is not what happens.', 'Das sagt das Wellenmodell voraus, und genau das geschieht nicht.');
    return {
      title: L('Wave or photon?', 'Welle oder Photon?'),
      text: `<p>${L('Light falls on a metal plate and releases electrons: the photoelectric effect. Some of what is observed fits the wave model of light; some does not.', 'Licht fällt auf eine Metallplatte und löst Elektronen aus: der Photoeffekt. Manches, was man beobachtet, passt zum Wellenmodell des Lichts, manches nicht.')}</p>`,
      figs: fig(G.cell({ nm: 400 })),
      questions: [
        choice('obs', L('(a) Which observation can the wave model of light not explain?', '(a) Welche Beobachtung kann das Wellenmodell des Lichts nicht erklären?'), opts(r, [
          [pz.obs(), true],
          ...r.shuffle(FILLERS).slice(0, 3).map(([t, why, nudge]) => [t(), false, why(), 'wave', nudge ? nudge() : '']),
        ])),
        // (b) names the answer of (a): it is shown once (a) is right
        { ...choice('why', L(`(b) ${pz.obs()} How do photons explain it?`, `(b) ${pz.obs()} Wie erklären Photonen das?`), opts(r, [
          [pz.photon(), true],
          [pz.wave(), false, waveWhy, 'wave'],
          ...pz.wrong.map(([t, tag]) => [t(), false, tag === 'intensity' ? WHY.bright() : L('The work function is a property of the metal: the light does not change it.', 'Die Austrittsarbeit ist eine Eigenschaft des Metalls: Das Licht ändert sie nicht.'), tag, tag === 'intensity' ? NUDGE.bright() : '']),
        ])), after: 'obs' },
      ],
      hints: [
        L('Ask for each observation: would a brighter wave, or a longer wait, change it? If the wave model says yes and the experiment says no, the wave model cannot explain it.', 'Frage dich bei jeder Beobachtung: Würde eine stärkere Welle oder längeres Warten etwas daran ändern? Sagt das Wellenmodell ja und das Experiment nein, kann das Wellenmodell sie nicht erklären.'),
        L('Photon model: one electron takes up the energy h·f of one photon. Brightness is the number of photons per second.', 'Photonenmodell: Ein Elektron nimmt die Energie h·f eines Photons auf. Die Helligkeit ist die Zahl der Photonen pro Sekunde.'),
      ],
      solution: [
        L(`(a) <b>${pz.obs()}</b> The wave model would predict: ${pz.wave().replace(/^./, (x) => x.toLowerCase())}`, `(a) <b>${pz.obs()}</b> Das Wellenmodell würde voraussagen: ${pz.wave()}`),
        L(`(b) ${pz.photon()}`, `(b) ${pz.photon()}`),
      ],
      p: { pz: pz.id },
    };
  }

  // ---------------------------------------------------------------- photon energy
  // Light whose photon energy is a round number of eV: given by its wavelength (E = 1240 eV·nm / λ)
  // or by its frequency (E = h·f, h = 4.14 · 10⁻¹⁵ eV·s, f in 10¹⁴ Hz).
  const NICE_NM = [200, 248, 310, 400, 413, 496, 620];
  const NICE_F = [5, 6, 7.5, 10, 12, 15];
  function light(r) {
    if (r.next() < 0.6) {
      const nm = r.pick(NICE_NM), eV = r2(HC / nm);
      return { nm, eV, given: `${lam} = ${nm} nm`, what: L(`light of wavelength ${nm} nm`, `Licht der Wellenlänge ${nm} nm`),
        calc: `${E} = ${h}·${c}/${lam} = 1240 eV·nm / ${nm} nm = ${e2(eV)} eV` };
    }
    const f14 = r.pick(NICE_F), eV = r2(P.hEV * f14 * 1e14);
    return { nm: (P.c / (f14 * 1e14)) * 1e9, f14, eV, given: `${f} = ${plain(f14, 2)} · 10<sup>14</sup> Hz`, what: L(`light of frequency ${plain(f14, 2)} · 10<sup>14</sup> Hz`, `Licht der Frequenz ${plain(f14, 2)} · 10<sup>14</sup> Hz`),
      calc: `${E} = ${h}·${f} = 4.14 · 10<sup>−15</sup> eV·s · ${plain(f14, 2)} · 10<sup>14</sup> Hz = ${e2(eV)} eV` };
  }
  // The energy of one photon, and what happens to it when the light changes.
  const CHANGE = {
    half: { k: 2, text: () => L('light of half the wavelength', 'Licht der halben Wellenlänge') },
    double: { k: 0.5, text: () => L('light of twice the wavelength', 'Licht der doppelten Wellenlänge') },
    freq: { k: 2, text: () => L('light of twice the frequency', 'Licht der doppelten Frequenz') },
    bright: { k: 1, text: () => L('the same light, twice as bright', 'dasselbe Licht, doppelt so hell') },
    dim: { k: 1, text: () => L('the same light, half as bright', 'dasselbe Licht, halb so hell') },
  };
  function energy(seed) {
    const r = rng(seed * 31 + 3), li = light(r), ch = r.pick(Object.keys(CHANGE)), k = CHANGE[ch].k;
    const bright = ch === 'bright' || ch === 'dim';
    const ans = (x) => ({ 2: L('twice the energy', 'die doppelte Energie'), 0.5: L('half the energy', 'die halbe Energie'), 1: L('the same energy', 'dieselbe Energie'), 4: L('four times the energy', 'die vierfache Energie') }[x]);
    // [why, tag, nudge]
    const whyOf = (x) => {
      if (bright) return [WHY.bright(), 'intensity', NUDGE.bright()];
      if (x === 1) return [L('The colour of the light changes, and with it the energy of each photon.', 'Die Farbe des Lichts ändert sich und mit ihr die Energie jedes Photons.'), 'inverse'];
      if (x === 1 / k) return [ch === 'freq' ? L('E = h·f: the energy is proportional to the frequency.', 'E = h·f: Die Energie ist proportional zur Frequenz.') : WHY.inverse(), 'inverse', ch === 'freq' ? L('Check the direction: does the photon energy get larger or smaller with a higher frequency?', 'Prüfe die Richtung: Wird die Photonenenergie mit höherer Frequenz grösser oder kleiner?') : NUDGE.inverse()];
      return [L('E = h·c/λ = h·f: one factor 2, not two.', 'E = h·c/λ = h·f: ein Faktor 2, nicht zwei.'), 'other', L('Does the wavelength (or the frequency) appear squared in the formula for the photon energy?', 'Kommt die Wellenlänge (oder die Frequenz) in der Formel für die Photonenenergie im Quadrat vor?')];
    };
    return {
      title: L('The energy of a photon', 'Die Energie eines Photons'),
      text: `<p>${L(`Light with ${li.given} falls on a screen.`, `Licht mit ${li.given} fällt auf einen Schirm.`)}</p>${CONST()}`,
      figs: li.nm >= 100 && li.nm <= 1000 ? fig(G.bar([{ nm: li.nm, label: `${plain(li.nm)} nm` }])) : '',
      questions: [
        numQ('E', L('(a) the energy of one photon', '(a) die Energie eines Photons'), E, 'eV', li.eV, { tol: 0.015, wrong: li.f14 ? [] : [{ value: li.nm / HC, tag: 'inverse', why: WHY.inverse(), nudge: NUDGE.inverse() }] }),
        choice('k', L(`(b) The light is replaced by ${CHANGE[ch].text()}. One photon of it has, compared with before,`, `(b) Das Licht wird ersetzt durch ${CHANGE[ch].text()}. Ein Photon davon hat, verglichen mit vorher,`),
          opts(r, [2, 0.5, 1, 4].map((x) => (x === k ? [ans(x), true] : [ans(x), false, ...whyOf(x)])), true)),
      ],
      hints: [
        L(`The light is given by its ${li.f14 ? 'frequency' : 'wavelength'}, ${li.given}. In (b) it is replaced by ${CHANGE[ch].text()}: does that change the colour of the light, or only how many photons arrive per second?`, `Das Licht ist durch seine ${li.f14 ? 'Frequenz' : 'Wellenlänge'} gegeben, ${li.given}. In (b) wird es ersetzt durch ${CHANGE[ch].text()}: Ändert das die Farbe des Lichts oder nur, wie viele Photonen pro Sekunde ankommen?`),
        li.f14 ? L(`(a) ${E} = ${h}·${f}, with ${h} in eV·s and ${f} in Hz: the energy comes out in eV. The powers of ten first: 10<sup>−15</sup> · 10<sup>14</sup> = 10<sup>−1</sup>.`, `(a) ${E} = ${h}·${f}, mit ${h} in eV·s und ${f} in Hz: Die Energie ergibt sich in eV. Zuerst die Zehnerpotenzen: 10<sup>−15</sup> · 10<sup>14</sup> = 10<sup>−1</sup>.`)
          : L(`(a) ${E} = ${h}·${c}/${lam}, with ${h}·${c} = 1240 eV·nm and ${lam} in nm: the nm cancel, and the energy comes out in eV.`, `(a) ${E} = ${h}·${c}/${lam}, mit ${h}·${c} = 1240 eV·nm und ${lam} in nm: Die nm kürzen sich, und die Energie ergibt sich in eV.`),
        L(`(b) ${E} = ${h}·${f} = ${h}·${c}/${lam}: the energy of one photon is proportional to ${f} and inversely proportional to ${lam}; the brightness does not appear in it. Which of these does ${CHANGE[ch].text()} change, and by what factor?`, `(b) ${E} = ${h}·${f} = ${h}·${c}/${lam}: Die Energie eines Photons ist proportional zu ${f} und umgekehrt proportional zu ${lam}; die Helligkeit kommt darin nicht vor. Was davon ändert ${CHANGE[ch].text().replace(/^Licht/, 'das Licht')}, und um welchen Faktor?`),
      ],
      solution: [
        L(`(a) ${li.calc.replace(/= ([\d.]+) eV$/, '= <b>$1 eV</b>')}.`, `(a) ${li.calc.replace(/= ([\d.]+) eV$/, '= <b>$1 eV</b>')}.`),
        bright ? L(`(b) <b>The same energy</b>, ${plain(li.eV)} eV: the colour stays, only the number of photons per second changes.`, `(b) <b>Dieselbe Energie</b>, ${plain(li.eV)} eV: Die Farbe bleibt, nur die Zahl der Photonen pro Sekunde ändert sich.`)
          : L(`(b) ${ch === 'freq' ? `${E} = ${h}·${f}` : `${E} = ${h}·${c}/${lam}`}: <b>${ans(k)}</b>, ${plain(li.eV * k)} eV.`, `(b) ${ch === 'freq' ? `${E} = ${h}·${f}` : `${E} = ${h}·${c}/${lam}`}: <b>${ans(k)}</b>, ${plain(li.eV * k)} eV.`),
      ],
      p: { nm: li.nm, ch },
    };
  }

  const SOURCES = [
    { en: 'a red laser pointer', de: 'ein roter Laserpointer', nm: 650, P: [1, 5] },
    { en: 'a green laser pointer', de: 'ein grüner Laserpointer', nm: 532, P: [1, 5] },
    { en: 'a violet laser pointer', de: 'ein violetter Laserpointer', nm: 405, P: [1, 5, 20] },
    { en: 'an infrared LED', de: 'eine Infrarot-LED', nm: 850, P: [10, 50, 100] },
    { en: 'a UV LED', de: 'eine UV-LED', nm: 365, P: [10, 50, 100] },
    { en: 'a blue LED', de: 'eine blaue LED', nm: 470, P: [10, 20, 50] },
  ];
  // Three sources: the most energetic photons and the most photons per second are different ones.
  function rank(seed) {
    const r = rng(seed * 43 + 13);
    for (;;) {
      const srcs = r.shuffle(SOURCES).slice(0, 3).map((s) => ({ ...s, mW: r.pick([1, 2, 5, 10, 20, 50]) }));
      const Es = srcs.map((s) => P.eV(s.nm)), Ns = srcs.map((s) => s.mW * s.nm);
      const iE = Es.indexOf(Math.max(...Es)), iN = Ns.indexOf(Math.max(...Ns)), iP = srcs.map((s) => s.mW).indexOf(Math.max(...srcs.map((s) => s.mW)));
      if (iE === iN || new Set(Ns).size < 3 || new Set(srcs.map((s) => s.mW)).size < 3) continue;
      if (Ns.filter((n) => n > 0.8 * Ns[iN]).length > 1) continue; // a clear winner
      const tag = ['A', 'B', 'C'];
      const iLow = Ns.indexOf(Math.min(...Ns)); // for the hint: the fewest photons per second, not an answer
      const table = `<table class="data"><tr><th></th><th>${L('source', 'Quelle')}</th><th>${lam}</th><th>${i('P')}</th></tr>${srcs.map((s, k) => `<tr><td><b>${tag[k]}</b></td><td>${nameOf(s)}</td><td>${s.nm} nm</td><td>${s.mW} mW</td></tr>`).join('')}</table>`;
      const qE = srcs.map((s, k) => [tag[k], k === iE, k === iP ? L('The power is the energy per second, not the energy of one photon. That depends only on the wavelength.', 'Die Leistung ist die Energie pro Sekunde, nicht die Energie eines Photons. Diese hängt nur von der Wellenlänge ab.') : WHY.inverse(), k === iP ? 'intensity' : 'inverse',
        k === iP ? L('Does the power tell you the energy of a single photon? On what does that depend?', 'Sagt die Leistung etwas über die Energie eines einzelnen Photons? Wovon hängt diese ab?') : NUDGE.inverse()]);
      qE.push([L('all the same', 'alle gleich'), false, L('Photons of different wavelengths carry different energies.', 'Photonen verschiedener Wellenlänge tragen verschiedene Energien.'), 'other']);
      const qN = srcs.map((s, k) => [tag[k], k === iN, k === iE ? L('Energetic photons: the same power needs fewer of them. Compare P·λ, not the power alone.', 'Energiereiche Photonen: Für dieselbe Leistung braucht es weniger davon. Vergleiche P·λ, nicht nur die Leistung.') : L('Photons per second = power / photon energy: both matter.', 'Photonen pro Sekunde = Leistung / Photonenenergie: Beides zählt.'), k === iE ? 'inverse' : 'other',
        k === iE ? L('This source has the most energetic photons. Does a given power then need more or fewer of them?', 'Diese Quelle hat die energiereichsten Photonen. Braucht es für eine bestimmte Leistung dann mehr oder weniger davon?') : '']);
      return {
        title: L('Energetic photons or many photons?', 'Energiereiche Photonen oder viele Photonen?'),
        text: `<p>${L('Three light sources:', 'Drei Lichtquellen:')}</p>${table}`,
        figs: fig(G.bar(srcs.map((s, k) => ({ nm: s.nm, label: tag[k] })))),
        questions: [
          choice('E', L('(a) Which source emits the photons with the most energy?', '(a) Welche Quelle sendet die Photonen mit der grössten Energie aus?'), opts(r, qE, true)),
          choice('N', L('(b) Which source emits the most photons per second?', '(b) Welche Quelle sendet die meisten Photonen pro Sekunde aus?'), opts(r, qN.concat([[L('all the same', 'alle gleich'), false, L('Photons per second = power / photon energy: compare P·λ.', 'Photonen pro Sekunde = Leistung / Photonenenergie: Vergleiche P·λ.'), 'other']]), true)),
        ],
        hints: [
          L(`The table gives each source's wavelength and power: ${srcs.map((s, k) => `${tag[k]} ${s.nm} nm and ${s.mW} mW`).join(', ')}. Which column decides (a), and which (b)?`, `Die Tabelle gibt die Wellenlänge und die Leistung jeder Quelle: ${srcs.map((s, k) => `${tag[k]} ${s.nm} nm und ${s.mW} mW`).join(', ')}. Welche Spalte entscheidet (a), welche (b)?`),
          L(`(a) The energy of one photon: ${E} = ${h}·${c}/${lam}; the power does not appear in it. (b) Photons per second: ${i('N')} = ${i('P')}/${E} = ${i('P')}·${lam}/(${h}·${c}), so compare ${i('P')}·${lam} for A, B and C.`, `(a) Die Energie eines Photons: ${E} = ${h}·${c}/${lam}; die Leistung kommt darin nicht vor. (b) Photonen pro Sekunde: ${i('N')} = ${i('P')}/${E} = ${i('P')}·${lam}/(${h}·${c}); vergleiche also ${i('P')}·${lam} für A, B und C.`),
          L(`(b) A start: for ${tag[iLow]}, ${i('P')}·${lam} comes to ${srcs[iLow].mW * srcs[iLow].nm} mW·nm. Now the other two.`, `(b) Ein Anfang: Für ${tag[iLow]} ergibt ${i('P')}·${lam} ${srcs[iLow].mW * srcs[iLow].nm} mW·nm. Nun die beiden anderen.`),
        ],
        solution: [
          L(`(a) The shorter the wavelength, the more energy each photon carries: <b>${tag[iE]}</b> (${srcs[iE].nm} nm, ${plain(Es[iE])} eV per photon). The power does not matter.`, `(a) Je kürzer die Wellenlänge, desto mehr Energie trägt jedes Photon: <b>${tag[iE]}</b> (${srcs[iE].nm} nm, ${plain(Es[iE])} eV pro Photon). Die Leistung spielt keine Rolle.`),
          L(`(b) ${i('N')} = ${i('P')}/${E} is proportional to ${i('P')}·${lam}: ${srcs.map((s, k) => `${tag[k]}: ${s.mW} · ${s.nm} = ${s.mW * s.nm}`).join(', ')}. The most photons per second: <b>${tag[iN]}</b>.`, `(b) ${i('N')} = ${i('P')}/${E} ist proportional zu ${i('P')}·${lam}: ${srcs.map((s, k) => `${tag[k]}: ${s.mW} · ${s.nm} = ${s.mW * s.nm}`).join(', ')}. Die meisten Photonen pro Sekunde: <b>${tag[iN]}</b>.`),
        ],
        p: { s: srcs.map((s) => `${s.nm}:${s.mW}`) },
      };
    }
  }

  // ---------------------------------------------------------------- the photoelectric effect
  // Einstein's equation as energy bookkeeping: the photon brings h·f, the work function W is paid
  // to get out, the rest is the kinetic energy of the fastest electrons, e·U₀.
  function photoCalc(seed) {
    const r = rng(seed * 47 + 17);
    for (;;) {
      const m = r.pick(P.METALS), li = light(r), eV = li.eV, ek = r2(eV - m.W), out = ek > 0;
      if (Math.abs(ek) < 0.15) continue;
      if (!out && r.next() < 0.6) continue; // mostly electrons released
      const yes = L('yes', 'ja'), no = L('no', 'nein');
      const qOut = choice('out', L('(a) Are electrons released?', '(a) Werden Elektronen ausgelöst?'), opts(r, [
        [yes, out, L('Compare the energy of one photon with the work function: it is not enough.', 'Vergleiche die Energie eines Photons mit der Austrittsarbeit: Sie reicht nicht.'), 'threshold', L('Compare the energy of one photon with the work function.', 'Vergleiche die Energie eines Photons mit der Austrittsarbeit.')],
        [no, !out, L('Compare the energy of one photon with the work function.', 'Vergleiche die Energie eines Photons mit der Austrittsarbeit.'), 'other'],
        [L('only if the light is bright enough', 'nur wenn das Licht hell genug ist'), false, L('Each electron takes the energy of one photon. A brighter light gives more photons, not more energetic ones.', 'Jedes Elektron nimmt die Energie eines Photons auf. Helleres Licht liefert mehr Photonen, nicht energiereichere.'), 'intensity'],
        [L('only after the light has shone for a while', 'erst nachdem das Licht eine Weile geschienen hat'), false, L('An electron cannot collect the energy of several photons: one photon is enough at once, or never.', 'Ein Elektron kann die Energie mehrerer Photonen nicht sammeln: Ein Photon genügt sofort, oder nie.'), 'wave'],
      ], true));
      const qs = [qOut];
      // (b) and (c) give (a) away (a kinetic energy to work out, or what would release electrons):
      // they are shown once (a) is right
      if (out) {
        qs.push({ ...numQ('ek', L('(b) the kinetic energy of the fastest electrons', '(b) die kinetische Energie der schnellsten Elektronen'), `${EkMax}`, 'eV', ek, { tol: 0.02, abs: 0.012, wrong: [{ value: eV, tag: 'noW', why: WHY.noW(), nudge: NUDGE.noW() }, { value: eV + m.W, tag: 'addW', why: WHY.addW(), nudge: NUDGE.addW() }] }), after: 'out' });
        qs.push({ ...numQ('U0', L('(c) the stopping voltage', '(c) die Gegenspannung'), U0, 'V', ek, { tol: 0.02, abs: 0.012, wrong: [{ value: eV, tag: 'noW', why: WHY.noW(), nudge: NUDGE.noW() }, { value: eV + m.W, tag: 'addW', why: WHY.addW(), nudge: NUDGE.addW() }] }), after: 'out' });
      } else {
        const shorter = li.f14 ? L('light of a higher frequency', 'Licht höherer Frequenz') : L('light of a shorter wavelength', 'Licht kürzerer Wellenlänge');
        const longer = li.f14 ? L('light of a lower frequency', 'Licht tieferer Frequenz') : L('light of a longer wavelength', 'Licht längerer Wellenlänge');
        qs.push({ ...choice('light', L('(b) What would release electrons from this cathode?', '(b) Womit liessen sich aus dieser Kathode Elektronen auslösen?'), opts(r, [
          [shorter, true],
          [L('brighter light of the same colour', 'helleres Licht derselben Farbe'), false, WHY.bright(), 'intensity', NUDGE.bright()],
          [L('the same light, shone for longer', 'dasselbe Licht, länger eingestrahlt'), false, L('An electron cannot collect the energy of several photons: one photon must be enough.', 'Ein Elektron kann die Energie mehrerer Photonen nicht sammeln: Ein Photon muss genügen.'), 'wave'],
          [longer, false, WHY.inverse(), 'inverse', NUDGE.inverse()],
        ])), after: 'out' });
      }
      return {
        title: L('Einstein’s equation', 'Einsteins Gleichung'),
        text: `<p>${L(`${li.what.replace(/^./, (x) => x.toUpperCase())} falls on a ${m.en} cathode (work function ${W} = ${m.W} eV).`, `${li.what} fällt auf eine Kathode aus ${m.de} (Austrittsarbeit ${W} = ${m.W} eV).`)}</p>${CONST()}`,
        figs: fig(G.cell({ nm: li.nm, counter: true })),
        questions: qs,
        hints: [
          L(`The light has ${li.given}; the ${m.en} cathode has ${W} = ${m.W} eV. (a) Does one photon of this light bring at least ${m.W} eV?`, `Das Licht hat ${li.given}; die Kathode aus ${m.de} hat ${W} = ${m.W} eV. (a) Bringt ein Photon dieses Lichts mindestens ${m.W} eV mit?`),
          L(`First the energy of one photon, ${li.f14 ? `${E} = ${h}·${f} with ${h} in eV·s` : `${E} = ${h}·${c}/${lam} with ${h}·${c} = 1240 eV·nm`}. Then Einstein: ${h}·${f} = ${W} + ${EkMax}: the photon pays the work function first, the rest is kinetic energy.`, `Zuerst die Energie eines Photons, ${li.f14 ? `${E} = ${h}·${f} mit ${h} in eV·s` : `${E} = ${h}·${c}/${lam} mit ${h}·${c} = 1240 eV·nm`}. Dann Einstein: ${h}·${f} = ${W} + ${EkMax}: Das Photon bezahlt zuerst die Austrittsarbeit, der Rest ist kinetische Energie.`),
          L(`${li.f14 ? 'For the photon energy, the powers of ten first: 10<sup>−15</sup> · 10<sup>14</sup> = 10<sup>−1</sup>.' : `For the photon energy, 1240 eV·nm divided by ${li.nm} nm: the nm cancel, and it comes out in eV.`} ${out ? `(c) The stopping voltage just stops the fastest electrons, ${i('e')}·${U0} = ${EkMax}: an energy of 1 eV is stopped by 1 V.` : '(b) Only the energy of one photon counts: what makes it larger?'}`,
            `${li.f14 ? 'Für die Photonenenergie zuerst die Zehnerpotenzen: 10<sup>−15</sup> · 10<sup>14</sup> = 10<sup>−1</sup>.' : `Für die Photonenenergie 1240 eV·nm geteilt durch ${li.nm} nm: Die nm kürzen sich, und sie ergibt sich in eV.`} ${out ? `(c) Die Gegenspannung stoppt gerade die schnellsten Elektronen, ${i('e')}·${U0} = ${EkMax}: Eine Energie von 1 eV wird von 1 V gestoppt.` : '(b) Nur die Energie eines Photons zählt: Was macht sie grösser?'}`),
        ],
        solution: [
          L(`Photon energy: ${li.calc}.`, `Photonenenergie: ${li.calc}.`),
          out ? L(`(a) ${e2(eV)} eV > ${m.W} eV: <b>yes</b>. (b) What is left after the work function: ${EkMax} = ${h}·${f} − ${W} = ${e2(eV)} eV − ${m.W} eV = <b>${e2(ek)} eV</b>.`, `(a) ${e2(eV)} eV > ${m.W} eV: <b>ja</b>. (b) Was nach der Austrittsarbeit übrig bleibt: ${EkMax} = ${h}·${f} − ${W} = ${e2(eV)} eV − ${m.W} eV = <b>${e2(ek)} eV</b>.`)
            : L(`(a) ${e2(eV)} eV < ${m.W} eV: one photon does not have enough energy, so <b>no</b> electrons are released, however bright the light.`, `(a) ${e2(eV)} eV < ${m.W} eV: Ein Photon hat nicht genug Energie, also werden <b>keine</b> Elektronen ausgelöst, wie hell das Licht auch ist.`),
          out ? L(`(c) ${i('e')}·${U0} = ${EkMax}, so ${U0} = <b>${e2(ek)} V</b>: an energy of ${e2(ek)} eV is stopped by ${e2(ek)} V.`, `(c) ${i('e')}·${U0} = ${EkMax}, also ${U0} = <b>${e2(ek)} V</b>: Eine Energie von ${e2(ek)} eV wird von ${e2(ek)} V gestoppt.`)
            : L(`(b) The photons must carry at least ${m.W} eV each: <b>${li.f14 ? 'light of a higher frequency' : 'light of a shorter wavelength'}</b>, below ${lG} = 1240 eV·nm / ${m.W} eV ≈ ${Math.round(HC / m.W / 10) * 10} nm. Brighter light or a longer wait does not help.`, `(b) Die Photonen müssen je mindestens ${m.W} eV tragen: <b>${li.f14 ? 'Licht höherer Frequenz' : 'Licht kürzerer Wellenlänge'}</b>, unter ${lG} = 1240 eV·nm / ${m.W} eV ≈ ${Math.round(HC / m.W / 10) * 10} nm. Helleres Licht oder längeres Warten hilft nicht.`),
        ],
        solFig: fig(G.bars(eV, m.W)),
        p: { m: m.id, nm: Math.round(li.nm) },
      };
    }
  }

  // ---------------------------------------------------------------- the characteristic
  // The current of a photocell against the voltage, before and after a change: which curve?
  const CHANGES = ['brighter', 'dimmer', 'shorter', 'longer', 'metal'];
  function photoCurve(seed) {
    const r = rng(seed * 53 + 19);
    // photon energies of 2.5 eV to 4 eV, work functions of at least 1.9 eV, the stopping voltage
    // after a change still clearly above zero
    const nm = r.pick([310, 400, 413, 496]), U = r.step(0.6, Math.min(1.6, Math.floor((P.eV(nm) - 1.9) * 10) / 10), 0.1), Wc = r2(P.eV(nm) - U);
    const ch = r.pick(CHANGES), I = r.pick([8, 10, 12]), dU = r.pick([0.4, 0.6, 0.8].filter((d) => d <= U - 0.2 + 1e-9));
    const after = {
      brighter: [U, 2 * I], dimmer: [U, I / 2], shorter: [U + dU, I], longer: [U - dU, I], metal: [U - dU, I],
    }[ch];
    const text = {
      brighter: L('The light is made twice as bright (same wavelength).', 'Das Licht wird doppelt so hell gemacht (gleiche Wellenlänge).'),
      dimmer: L('The light is made half as bright (same wavelength).', 'Das Licht wird halb so hell gemacht (gleiche Wellenlänge).'),
      shorter: L('Light of a shorter wavelength is used, with the same number of photons per second.', 'Es wird Licht kürzerer Wellenlänge verwendet, mit gleich vielen Photonen pro Sekunde.'),
      longer: L('Light of a longer wavelength is used (still releasing electrons), with the same number of photons per second.', 'Es wird Licht längerer Wellenlänge verwendet (das noch Elektronen auslöst), mit gleich vielen Photonen pro Sekunde.'),
      metal: L('The cathode is replaced by one with a larger work function; the light stays the same.', 'Die Kathode wird durch eine mit grösserer Austrittsarbeit ersetzt; das Licht bleibt gleich.'),
    }[ch];
    const cands = [[U, 2 * I], [U, I / 2], [U + dU, I], [U - dU, I], [U + dU, 2 * I], [U - dU, I / 2]];
    const right = cands.findIndex(([a, b]) => Math.abs(a - after[0]) < 1e-9 && b === after[1]);
    const light = ch === 'brighter' || ch === 'dimmer';
    const whyOf = ([a, b]) => {
      const uCh = Math.abs(a - U) > 1e-9, iCh = b !== I;
      if (light && uCh) return [L('The stopping voltage depends on the energy of one photon, not on how many there are: brightness does not change it.', 'Die Gegenspannung hängt von der Energie eines Photons ab, nicht davon, wie viele es sind: Die Helligkeit ändert sie nicht.'), 'intensity'];
      if (!light && iCh) return [L('The same number of photons per second releases the same number of electrons per second: the saturation current stays.', 'Gleich viele Photonen pro Sekunde lösen gleich viele Elektronen pro Sekunde aus: Der Sättigungsstrom bleibt.'), 'other'];
      if (light) return [L(`${ch === 'brighter' ? 'More' : 'Fewer'} photons per second release ${ch === 'brighter' ? 'more' : 'fewer'} electrons per second.`, `${ch === 'brighter' ? 'Mehr' : 'Weniger'} Photonen pro Sekunde lösen ${ch === 'brighter' ? 'mehr' : 'weniger'} Elektronen pro Sekunde aus.`), 'other'];
      return [L(`${EkMax} = ${h}·${f} − ${W}: think about whether the fastest electrons get faster or slower.`, `${EkMax} = ${h}·${f} − ${W}: Überlege, ob die schnellsten Elektronen schneller oder langsamer werden.`), 'addW'];
    };
    // the nudge while the exercise is open (whyOf gives the answer away; its last one is a nudge already)
    const nudgeOf = ([a, b]) => {
      const uCh = Math.abs(a - U) > 1e-9, iCh = b !== I;
      if (light && uCh) return L('On what does the stopping voltage depend: on the energy of one photon, or on the number of photons? What does the brightness change?', 'Wovon hängt die Gegenspannung ab: von der Energie eines Photons oder von der Zahl der Photonen? Was ändert die Helligkeit?');
      if (!light && iCh) return L('How many photons per second arrive now? What decides the saturation current?', 'Wie viele Photonen pro Sekunde kommen jetzt an? Was bestimmt den Sättigungsstrom?');
      if (light) return L('What happens to the number of photons per second, and what does the saturation current show?', 'Was geschieht mit der Zahl der Photonen pro Sekunde, und was zeigt der Sättigungsstrom?');
      return '';
    };
    const wrongs = r.shuffle(cands.filter((_, k) => k !== right)).slice(0, 3);
    const options = r.shuffle([after, ...wrongs]).map((cd) => {
      const ok = cd === after, [why, tag] = ok ? ['', undefined] : whyOf(cd);
      return { html: G.ivGraph([{ U0: U, I, cls: 'old', dash: true }, { U0: cd[0], I: cd[1], cls: 'new' }], { Imax: 2.3 * I, small: true, w: 260, h: 180 }), ok, why, tag, nudge: ok ? '' : nudgeOf(cd) };
    });
    const eVnm = r2(P.eV(nm));
    return {
      title: L('The characteristic of a photocell', 'Die Kennlinie einer Photozelle'),
      text: `<p>${L(`Light of wavelength ${nm} nm falls on the cathode of a photocell. The graph shows the current against the voltage between anode and cathode (negative: a counter-voltage that slows the electrons).`, `Licht der Wellenlänge ${nm} nm fällt auf die Kathode einer Photozelle. Der Graph zeigt den Strom gegen die Spannung zwischen Anode und Kathode (negativ: eine Gegenspannung, die die Elektronen bremst).`)}</p>`,
      figs: fig(G.ivGraph([{ U0: U, I, cls: 'new' }], { Imax: 2.3 * I })),
      questions: [
        numQ('U0', L('(a) the stopping voltage, read off', '(a) die Gegenspannung, abgelesen'), U0, 'V', U, { tol: 0.01, abs: 0.06 }),
        numQ('W', L('(b) the work function of the cathode', '(b) die Austrittsarbeit der Kathode'), W, 'eV', Wc, { tol: 0.01, abs: 0.07, wrong: [{ value: eVnm + U, tag: 'addW', why: WHY.addW(), nudge: NUDGE.addW() }, { value: U, tag: 'noW', why: L('That is the kinetic energy of the fastest electrons, not the work function.', 'Das ist die kinetische Energie der schnellsten Elektronen, nicht die Austrittsarbeit.') }] }),
        pick('new', L(`(c) ${text} Which graph shows the new current (solid) compared with the old one (dashed)?`, `(c) ${text} Welcher Graph zeigt den neuen Strom (ausgezogen) im Vergleich zum alten (gestrichelt)?`), options),
      ],
      hints: [
        L(`(a) Follow the curve to the left, into the counter-voltages: at which ${V} on the axis does the current drop to zero? There the counter-voltage just stops the fastest electrons, ${V} = −${U0}.`, `(a) Folge der Kurve nach links, zu den Gegenspannungen: Bei welchem ${V} auf der Achse fällt der Strom auf null? Dort stoppt die Gegenspannung gerade die schnellsten Elektronen, ${V} = −${U0}.`),
        L(`(b) The light has ${nm} nm. Its photon energy is ${h}·${c}/${lam} (${h}·${c} = 1240 eV·nm); then ${EkMax} = ${i('e')}·${U0} and Einstein, ${h}·${f} = ${W} + ${EkMax}, give the work function.`, `(b) Das Licht hat ${nm} nm. Seine Photonenenergie ist ${h}·${c}/${lam} (${h}·${c} = 1240 eV·nm); dann ergeben ${EkMax} = ${i('e')}·${U0} und Einstein, ${h}·${f} = ${W} + ${EkMax}, die Austrittsarbeit.`),
        L(`(c) ${text} Does that change the number of photons per second (the saturation current), the energy left for the fastest electrons (the stopping voltage), or both?`, `(c) ${text} Ändert das die Zahl der Photonen pro Sekunde (den Sättigungsstrom), die Energie, die den schnellsten Elektronen bleibt (die Gegenspannung), oder beides?`),
      ],
      solution: [
        L(`(a) The current drops to zero at ${V} = −${e2(U)} V: ${U0} = <b>${e2(U)} V</b>, so the fastest electrons have ${e2(U)} eV.`, `(a) Der Strom fällt bei ${V} = −${e2(U)} V auf null: ${U0} = <b>${e2(U)} V</b>; die schnellsten Elektronen haben also ${e2(U)} eV.`),
        L(`(b) ${W} = ${h}·${f} − ${i('e')}·${U0} = ${e2(eVnm)} eV − ${e2(U)} eV = <b>${e2(Wc)} eV</b>.`, `(b) ${W} = ${h}·${f} − ${i('e')}·${U0} = ${e2(eVnm)} eV − ${e2(U)} eV = <b>${e2(Wc)} eV</b>.`),
        `(c) ${{
          brighter: L('Twice as many photons per second release twice as many electrons: the saturation current doubles. Each photon still has the same energy, so the stopping voltage stays.', 'Doppelt so viele Photonen pro Sekunde lösen doppelt so viele Elektronen aus: Der Sättigungsstrom verdoppelt sich. Jedes Photon hat immer noch dieselbe Energie, also bleibt die Gegenspannung.'),
          dimmer: L('Half as many photons per second release half as many electrons: the saturation current halves. The stopping voltage stays.', 'Halb so viele Photonen pro Sekunde lösen halb so viele Elektronen aus: Der Sättigungsstrom halbiert sich. Die Gegenspannung bleibt.'),
          shorter: L('Each photon has more energy, so the fastest electrons are faster: a larger stopping voltage. The same number of photons per second gives the same saturation current.', 'Jedes Photon hat mehr Energie, also sind die schnellsten Elektronen schneller: eine grössere Gegenspannung. Gleich viele Photonen pro Sekunde ergeben denselben Sättigungsstrom.'),
          longer: L('Each photon has less energy, so the fastest electrons are slower: a smaller stopping voltage. The same number of photons per second gives the same saturation current.', 'Jedes Photon hat weniger Energie, also sind die schnellsten Elektronen langsamer: eine kleinere Gegenspannung. Gleich viele Photonen pro Sekunde ergeben denselben Sättigungsstrom.'),
          metal: L('More of each photon’s energy is needed to free the electron, so the fastest electrons are slower: a smaller stopping voltage. The number of electrons per second, and so the saturation current, stays the same (as long as electrons are released at all).', 'Ein grösserer Teil der Photonenenergie wird zum Herauslösen gebraucht, also sind die schnellsten Elektronen langsamer: eine kleinere Gegenspannung. Die Zahl der Elektronen pro Sekunde und damit der Sättigungsstrom bleibt gleich (solange überhaupt Elektronen ausgelöst werden).'),
        }[ch]}`,
      ],
      solFig: fig(G.ivGraph([{ U0: U, I, cls: 'old', dash: true }, { U0: after[0], I: after[1], cls: 'new' }], { Imax: 2.3 * I })),
      p: { ch, U, I, dU },
    };
  }

  // ---------------------------------------------------------------- the U₀(f) graph
  // The stopping voltage against the frequency: U₀ = (h/e)·f − W/e, a straight line of slope
  // h/e = 0.414 V per 10¹⁴ Hz. Threshold frequencies with a round cut-off wavelength (λ₀ = c/f₀; in German λ_G, f_G)
  // and a work function W = h·f₀ that is easy to work out. Each on a grid line of the graph; seed 1 (6 · 10¹⁴ Hz)
  // is the tutor's example.
  const LINE_FG = [5, 6, 7.5, 10, 4, 8, 12];
  function photoLine(seed) {
    const r = rng(seed * 59 + 23);
    const fg = LINE_FG[seed % LINE_FG.length], slope = P.hEV * 1e14, Wm = slope * fg, lg = 3000 / fg;
    const pts = [1, 2, 3.5, 5].map((d) => [fg + d, P.round(slope * d, 3)]);
    const line = { slope, icept: -Wm };
    const larger = r.next() < 0.5;
    return {
      title: L('The stopping voltage against the frequency', 'Die Gegenspannung gegen die Frequenz'),
      text: `<p>${L(`Light of different frequencies falls on the cathode of a photocell; for each, the stopping voltage ${U0} is measured. The graph shows the measurements and the straight line through them, extended to the axes (dashed).`, `Licht verschiedener Frequenzen fällt auf die Kathode einer Photozelle; für jede wird die Gegenspannung ${U0} gemessen. Der Graph zeigt die Messungen und die Gerade durch sie, bis zu den Achsen verlängert (gestrichelt).`)}</p>${CONST()}`,
      figs: fig(G.ufGraph({ pts, line, draw: true })),
      questions: [
        numQ('fG', L('(a) the threshold frequency', '(a) die Grenzfrequenz'), fG, `${pow(14)} Hz`, fg, { tol: 0.02, abs: 0.2, scale: 1e14 }),
        numQ('lG', L('(b) the cut-off wavelength (the longest that still releases electrons)', '(b) die Grenzwellenlänge (die grösste, die noch Elektronen auslöst)'), lG, 'nm', lg, { tol: 0.02 }),
        numQ('W', L('(c) the work function of the cathode', '(c) die Austrittsarbeit der Kathode'), W, 'eV', Wm, { tol: 0.03, abs: 0.1, wrong: [{ value: fg, tag: 'axis', why: L('That is the threshold frequency in 10<sup>14</sup> Hz: the work function is where the line meets the V<sub>s</sub>-axis, φ = e·(its distance below zero).', 'Das ist die Grenzfrequenz in 10<sup>14</sup> Hz: Die Austrittsarbeit liegt dort, wo die Gerade die U₀-Achse schneidet, W = e·(Abstand unter null).'), nudge: L(`That is the threshold frequency in 10<sup>14</sup> Hz. Where on the line do you read off the work function?`, `Das ist die Grenzfrequenz in 10<sup>14</sup> Hz. Wo an der Geraden liest man die Austrittsarbeit ab?`) }] }),
        choice('slope', L('(d) The slope of the line is', '(d) Die Steigung der Geraden ist'), opts(r, [
          [L('h/e, the same for every metal', 'h/e, für jedes Metall gleich'), true],
          [L('φ/e, different for every metal', 'W/e, für jedes Metall verschieden'), false, L('V<sub>s</sub> = (h/e)·f − φ/e: φ/e is where the line meets the V<sub>s</sub>-axis, the factor in front of f is h/e.', 'U₀ = (h/e)·f − W/e: W/e liegt dort, wo die Gerade die U₀-Achse schneidet; der Faktor vor f ist h/e.'), 'slope', L(`Solve Einstein’s equation for ${U0}: which part is where the line meets the axis, and which is the factor in front of ${f}?`, `Löse Einsteins Gleichung nach ${U0} auf: Welcher Teil ist der Achsenabschnitt, welcher der Faktor vor ${f}?`)],
          [L('e/h, the same for every metal', 'e/h, für jedes Metall gleich'), false, L('e·V<sub>s</sub> = h·f − φ, so V<sub>s</sub> = (h/e)·f − φ/e: the slope is h/e.', 'e·U₀ = h·f − W, also U₀ = (h/e)·f − W/e: Die Steigung ist h/e.'), 'slope', L(`Solve ${i('e')}·${U0} = ${h}·${f} − ${W} for ${U0} and check what stands in front of ${f}.`, `Löse ${i('e')}·${U0} = ${h}·${f} − ${W} nach ${U0} auf und prüfe, was vor ${f} steht.`)],
          [L('larger, the brighter the light', 'umso grösser, je heller das Licht'), false, L('The brightness changes the current, not the stopping voltage: it does not appear in V<sub>s</sub> = (h/e)·f − φ/e.', 'Die Helligkeit ändert den Strom, nicht die Gegenspannung: Sie kommt in U₀ = (h/e)·f − W/e nicht vor.'), 'intensity', L(`Does the brightness appear in Einstein’s equation for ${U0}?`, `Kommt die Helligkeit in Einsteins Gleichung für ${U0} vor?`)],
        ])),
        // (e): its explanations name the answer of (d), the slope h/e for every metal; shown once (d) is right
        { ...choice('metal', L(`(e) The cathode is replaced by one with a ${larger ? 'larger' : 'smaller'} work function. Its line is`, `(e) Die Kathode wird durch eine mit ${larger ? 'grösserer' : 'kleinerer'} Austrittsarbeit ersetzt. Ihre Gerade ist`), opts(r, [
          [L('parallel to this one, shifted to higher frequencies', 'parallel zu dieser, zu höheren Frequenzen verschoben'), larger, L('f₀ = φ/h: a smaller work function means a lower threshold frequency.', 'f_G = W/h: Eine kleinere Austrittsarbeit bedeutet eine tiefere Grenzfrequenz.'), 'threshold', L('How does the threshold frequency depend on the work function: does it get higher or lower?', 'Wie hängt die Grenzfrequenz von der Austrittsarbeit ab: Wird sie höher oder tiefer?')],
          [L('parallel to this one, shifted to lower frequencies', 'parallel zu dieser, zu tieferen Frequenzen verschoben'), !larger, L('f₀ = φ/h: a larger work function means a higher threshold frequency.', 'f_G = W/h: Eine grössere Austrittsarbeit bedeutet eine höhere Grenzfrequenz.'), 'threshold', L('How does the threshold frequency depend on the work function: does it get higher or lower?', 'Wie hängt die Grenzfrequenz von der Austrittsarbeit ab: Wird sie höher oder tiefer?')],
          [L('steeper, from the same threshold frequency', 'steiler, ab derselben Grenzfrequenz'), false, L('The slope is h/e for every metal; the threshold frequency f₀ = φ/h changes.', 'Die Steigung ist für jedes Metall h/e; die Grenzfrequenz f_G = W/h ändert sich.'), 'slope', L('Does the slope h/e depend on the metal? What changes instead when the work function changes?', 'Hängt die Steigung h/e vom Metall ab? Was ändert sich stattdessen, wenn sich die Austrittsarbeit ändert?')],
          [L('flatter, from the same threshold frequency', 'flacher, ab derselben Grenzfrequenz'), false, L('The slope is h/e for every metal; the threshold frequency f₀ = φ/h changes.', 'Die Steigung ist für jedes Metall h/e; die Grenzfrequenz f_G = W/h ändert sich.'), 'slope', L('Does the slope h/e depend on the metal? What changes instead when the work function changes?', 'Hängt die Steigung h/e vom Metall ab? Was ändert sich stattdessen, wenn sich die Austrittsarbeit ändert?')],
        ], true)), after: 'slope' },
      ],
      hints: [
        L(`The four measurements lie on one straight line; its dashed extension reaches both axes. Read off where it meets the ${f}-axis and where it meets the ${U0}-axis.`, `Die vier Messungen liegen auf einer Geraden; ihre gestrichelte Verlängerung reicht bis zu beiden Achsen. Lies ab, wo sie die ${f}-Achse schneidet und wo die ${U0}-Achse.`),
        L(`Einstein: ${i('e')}·${U0} = ${h}·${f} − ${W}, so ${U0} = (${h}/${i('e')})·${f} − ${W}/${i('e')}. (a) At ${U0} = 0 the electrons just get out: the threshold frequency. (c) At ${f} = 0 the line is at −${W}/${i('e')}. (d), (e) Which parts of this line depend on the metal?`, `Einstein: ${i('e')}·${U0} = ${h}·${f} − ${W}, also ${U0} = (${h}/${i('e')})·${f} − ${W}/${i('e')}. (a) Bei ${U0} = 0 kommen die Elektronen gerade noch heraus: die Grenzfrequenz. (c) Bei ${f} = 0 liegt die Gerade bei −${W}/${i('e')}. (d), (e) Welche Teile dieser Geraden hängen vom Metall ab?`),
        L(`(b) ${lG} = ${c}/${fG} with ${c} = 3.00 · 10<sup>8</sup> m/s and ${fG} in Hz. The powers of ten first: 10<sup>8</sup> / 10<sup>14</sup> = 10<sup>−6</sup>, so the result comes out in 10<sup>−6</sup> m = 1000 nm.`, `(b) ${lG} = ${c}/${fG} mit ${c} = 3.00 · 10<sup>8</sup> m/s und ${fG} in Hz. Zuerst die Zehnerpotenzen: 10<sup>8</sup> / 10<sup>14</sup> = 10<sup>−6</sup>, das Ergebnis kommt also in 10<sup>−6</sup> m = 1000 nm heraus.`),
      ],
      solution: [
        L(`(a) The line meets the ${f}-axis at ${fG} = <b>${plain(fg, 2)} · 10<sup>14</sup> Hz</b>.`, `(a) Die Gerade schneidet die ${f}-Achse bei ${fG} = <b>${plain(fg, 2)} · 10<sup>14</sup> Hz</b>.`),
        L(`(b) ${lG} = ${c}/${fG} = 3.00 · 10<sup>8</sup> m/s / (${plain(fg, 2)} · 10<sup>14</sup> Hz) = <b>${plain(lg)} nm</b>.`, `(b) ${lG} = ${c}/${fG} = 3.00 · 10<sup>8</sup> m/s / (${plain(fg, 2)} · 10<sup>14</sup> Hz) = <b>${plain(lg)} nm</b>.`),
        L(`(c) The line meets the ${U0}-axis at −${plain(Wm)} V, so ${W} = <b>${plain(Wm)} eV</b>. The same from ${W} = ${h}·${fG} = 4.14 · 10<sup>−15</sup> eV·s · ${plain(fg, 2)} · 10<sup>14</sup> Hz.`, `(c) Die Gerade schneidet die ${U0}-Achse bei −${plain(Wm)} V, also ist ${W} = <b>${plain(Wm)} eV</b>. Dasselbe ergibt ${W} = ${h}·${fG} = 4.14 · 10<sup>−15</sup> eV·s · ${plain(fg, 2)} · 10<sup>14</sup> Hz.`),
        L(`(d) <b>h/e, the same for every metal</b>: from ${plain(fg + 1, 2)} to ${plain(fg + 5, 2)} · 10<sup>14</sup> Hz the line rises by ${plain(4 * slope)} V, ${plain(slope)} V per 10<sup>14</sup> Hz, so ${h} = 4.14 · 10<sup>−15</sup> eV·s.`, `(d) <b>h/e, für jedes Metall gleich</b>: Von ${plain(fg + 1, 2)} bis ${plain(fg + 5, 2)} · 10<sup>14</sup> Hz steigt die Gerade um ${plain(4 * slope)} V, ${plain(slope)} V pro 10<sup>14</sup> Hz, also ${h} = 4.14 · 10<sup>−15</sup> eV·s.`),
        L(`(e) The slope stays; ${fG} = ${W}/${h} gets ${larger ? 'larger' : 'smaller'}: <b>parallel, shifted to ${larger ? 'higher' : 'lower'} frequencies</b>.`, `(e) Die Steigung bleibt; ${fG} = ${W}/${h} wird ${larger ? 'grösser' : 'kleiner'}: <b>parallel, zu ${larger ? 'höheren' : 'tieferen'} Frequenzen verschoben</b>.`),
      ],
      solFig: fig(G.ufGraph({ pts, line, solve: true })),
      p: { fg, larger },
    };
  }

  // ---------------------------------------------------------------- statements
  const BANK = [
    [() => L('The energy of a photon depends only on the frequency of the light.', 'Die Energie eines Photons hängt nur von der Frequenz des Lichts ab.'), true, () => L('E = h·f.', 'E = h·f.')],
    [() => L('Brighter light consists of more energetic photons.', 'Helleres Licht besteht aus energiereicheren Photonen.'), false, () => L('Brighter light has more photons per second; each has the energy h·f.', 'Helleres Licht hat mehr Photonen pro Sekunde; jedes hat die Energie h·f.')],
    [() => L('Red light releases electrons from any metal if it is bright enough.', 'Rotes Licht löst aus jedem Metall Elektronen aus, wenn es hell genug ist.'), false, () => L('Below the threshold frequency no electrons are released, however bright the light.', 'Unterhalb der Grenzfrequenz werden keine Elektronen ausgelöst, wie hell das Licht auch ist.')],
    [() => L('With very dim light above the threshold frequency, electrons are released at once.', 'Mit sehr schwachem Licht oberhalb der Grenzfrequenz werden sofort Elektronen ausgelöst.'), true, () => L('One photon is enough to release an electron: there is no waiting time to collect energy.', 'Ein Photon genügt, um ein Elektron auszulösen: Es gibt keine Wartezeit, um Energie zu sammeln.')],
    [() => L('Doubling the brightness doubles the stopping voltage.', 'Doppelte Helligkeit verdoppelt die Gegenspannung.'), false, () => L('The stopping voltage depends on the photon energy, not on the number of photons.', 'Die Gegenspannung hängt von der Photonenenergie ab, nicht von der Zahl der Photonen.')],
    [() => L('Doubling the brightness doubles the saturation current.', 'Doppelte Helligkeit verdoppelt den Sättigungsstrom.'), true, () => L('Twice as many photons release twice as many electrons.', 'Doppelt so viele Photonen lösen doppelt so viele Elektronen aus.')],
    [() => L('Light of higher frequency releases faster electrons.', 'Licht höherer Frequenz löst schnellere Elektronen aus.'), true, () => L('E<sub>k,max</sub> = h·f − φ grows with f.', 'E_kin,max = h·f − W wächst mit f.')],
    [() => L('The kinetic energy of the fastest electrons is proportional to the frequency.', 'Die kinetische Energie der schnellsten Elektronen ist proportional zur Frequenz.'), false, () => L('E<sub>k,max</sub> = h·f − φ: a straight line, but not through the origin.', 'E_kin,max = h·f − W: eine Gerade, aber nicht durch den Ursprung.')],
    [() => L('The slope of the V<sub>s</sub>(f) line is the same for every metal.', 'Die Steigung der U₀(f)-Geraden ist für jedes Metall gleich.'), true, () => L('The slope is h/e; only the threshold frequency differs.', 'Die Steigung ist h/e; nur die Grenzfrequenz ist verschieden.')],
    [() => L('A metal with a larger work function has a higher threshold frequency.', 'Ein Metall mit grösserer Austrittsarbeit hat eine höhere Grenzfrequenz.'), true, () => L('f₀ = φ/h.', 'f_G = W/h.')],
    [() => L('A photon of blue light has more energy than a photon of red light.', 'Ein Photon blauen Lichts hat mehr Energie als ein Photon roten Lichts.'), true, () => L('Blue light has the shorter wavelength, the higher frequency.', 'Blaues Licht hat die kürzere Wellenlänge, die höhere Frequenz.')],
    [() => L('A 100 W infrared lamp emits more energetic photons than a 1 mW UV LED.', 'Eine 100-W-Infrarotlampe sendet energiereichere Photonen aus als eine 1-mW-UV-LED.'), false, () => L('The power counts the photons, not their energy: UV photons carry more energy each.', 'Die Leistung zählt die Photonen, nicht ihre Energie: UV-Photonen tragen je mehr Energie.')],
    [() => L('One electron takes up the energy of exactly one photon.', 'Ein Elektron nimmt die Energie von genau einem Photon auf.'), true, () => L('That is why only the photon energy decides whether it gets out.', 'Deshalb entscheidet nur die Photonenenergie, ob es herauskommt.')],
    [() => L('The wave model of light explains the threshold frequency.', 'Das Wellenmodell des Lichts erklärt die Grenzfrequenz.'), false, () => L('In the wave model, any light would release electrons after enough time; the threshold needs photons.', 'Im Wellenmodell würde jedes Licht nach genügend langer Zeit Elektronen auslösen; die Grenzfrequenz braucht Photonen.')],
    [() => L('Not all released electrons have the largest kinetic energy.', 'Nicht alle ausgelösten Elektronen haben die grösste kinetische Energie.'), true, () => L('Electrons from deeper in the metal lose energy on the way out; φ is the least energy needed.', 'Elektronen aus tieferen Schichten verlieren auf dem Weg nach aussen Energie; W ist die kleinste nötige Energie.')],
  ];
  // the hints: one for each topic among the statements picked (BANK indices), naming them by their place from the top
  const TOPICS = [
    [[0, 1, 10, 11], () => L('the energy of one photon', 'die Energie eines Photons'), () => L(`${E} = ${h}·${f} = ${h}·${c}/${lam}: what about the brightness or the power?`, `${E} = ${h}·${f} = ${h}·${c}/${lam}: Was ist mit der Helligkeit oder der Leistung?`)],
    [[2, 3, 12, 13], () => L('photons or a wave', 'Photonen oder eine Welle'), () => L('one electron takes the energy of one photon: what would a wave predict instead?', 'ein Elektron nimmt die Energie eines Photons auf: Was würde eine Welle stattdessen voraussagen?')],
    [[4, 5], () => L('the brightness and the photocell', 'die Helligkeit und die Photozelle'), () => L('the saturation current counts the photons per second, the stopping voltage measures the energy of one photon.', 'der Sättigungsstrom zählt die Photonen pro Sekunde, die Gegenspannung misst die Energie eines Photons.')],
    [[6, 7, 14], () => L('the fastest electrons', 'die schnellsten Elektronen'), () => L(`Einstein: ${h}·${f} = ${W} + ${EkMax}; is that a proportionality?`, `Einstein: ${h}·${f} = ${W} + ${EkMax}; ist das eine Proportionalität?`)],
    [[8, 9], () => L(`the ${U0}(${f}) line`, `die ${U0}(${f})-Gerade`), () => L(`${U0} = (${h}/${i('e')})·${f} − ${W}/${i('e')}: which parts depend on the metal?`, `${U0} = (${h}/${i('e')})·${f} − ${W}/${i('e')}: Welche Teile hängen vom Metall ab?`)]];
  function stmtHints(pk) {
    const out = [];
    for (const [idx, name, rule] of TOPICS) {
      const ks = pk.map((s, k) => [BANK.indexOf(s), k + 1]).filter(([n]) => idx.includes(n)).map(([, k]) => k);
      if (!ks.length) continue;
      const list = ks.length === 1 ? String(ks[0]) : `${ks.slice(0, -1).join(', ')}${L(' and ', ' und ')}${ks[ks.length - 1]}`;
      const r0 = rule();
      out.push(L(`${ks.length === 1 ? 'Statement' : 'Statements'} ${list} (from the top): ${name()}. ${r0.charAt(0).toUpperCase() + r0.slice(1)}`, `${ks.length === 1 ? 'Aussage' : 'Aussagen'} ${list} (von oben): ${name()}. ${r0.charAt(0).toUpperCase() + r0.slice(1)}`));
    }
    if (out.length < 2) out.push(L('Take the statements one by one: which quantity does each one change, and does that quantity appear in the formula at all?', 'Nimm die Aussagen einzeln: Welche Grösse ändert jede, und kommt diese Grösse in der Formel überhaupt vor?'));
    return out;
  }
  function photoStmts(seed) {
    const r = rng(seed * 61 + 29);
    for (;;) {
      const pk = r.shuffle(BANK).slice(0, 5);
      if (pk.every((s) => s[1]) || pk.every((s) => !s[1])) continue;
      return {
        title: L('Which statements are correct?', 'Welche Aussagen sind richtig?'),
        text: L('<p>Tick all the statements that are correct.</p>', '<p>Kreuze alle richtigen Aussagen an.</p>'), figs: '',
        questions: [multi('s', pk.map(([t, ok, why]) => ({ html: t(), ok, why: why() })))],
        hints: stmtHints(pk),
        solution: pk.map(([t, ok, why]) => `${ok ? '✓' : '✗'} ${t()} ${why()}`),
        p: { s: pk.map((s) => BANK.indexOf(s)) },
      };
    }
  }

  // ---------------------------------------------------------------- all types
  const TYPES = {
    model: [1, model], 'photo-stmts': [2, photoStmts],
    energy: [1, energy], rank: [2, rank],
    'photo-calc': [2, photoCalc], 'photo-curve': [3, photoCurve], 'photo-line': [3, photoLine],
  };
  function make(type, seed) {
    const [difficulty, fn] = TYPES[type];
    return { ...fn(seed), type, difficulty, id: `${type}-${seed}`, seed };
  }

  const api = { TYPES: Object.keys(TYPES), make, BANK, WHY, NUDGE, PUZZLES, SOURCES, light, i, sb, SYM, CONST, numQ, choice, pick, opts, fig };
  root.PhotonEx = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
