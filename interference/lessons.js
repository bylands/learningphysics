// The tutor's worked examples and the topics of practice. An example introduces its idea in a few
// frames (intro), then works an exercise of one of the types of scenarios.js (scenario, with its
// parameters p) step by step. A topic of practice (see topics.js) has stages, from exercises like
// the example to variations with new ideas, and the example it belongs to (example(stage)). Two
// examples end with a frame to watch the pattern build up (watch; see generator.js).
(function (root) {
  'use strict';

  const L = (en, de) => root.IW.L(en, de);
  const F = () => root.Figures;
  const fr = (title, text, figure) => ({ title, text, figure });
  const p$ = (s) => `<p>${s}</p>`;
  const legend = (en, de) => `<p class="note legend">${L(en, de)}</p>`;

  const EXAMPLES = [
    {
      scenario: 'gap', p: { m: 0, lam: 2, a: 1, order: ['beam', 'shadow', 'arcs', 'short'] },
      name: () => L('Huygens’ principle', 'Das Prinzip von Huygens'),
      idea: () => L('Every point of a wave front sends out a wavelet; the new front is their envelope. Behind an opening the wavelets also reach into the shadow: the wave is diffracted, the more the narrower the opening compared with the wavelength.', 'Jeder Punkt einer Wellenfront sendet eine Elementarwelle aus; die neue Front ist ihre Einhüllende. Hinter einer Öffnung reichen die Elementarwellen auch in den Schatten: Die Welle wird gebeugt, umso stärker, je schmaler die Öffnung im Vergleich zur Wellenlänge ist.'),
      intro: [
        fr(() => L('Wavelets and their envelope', 'Elementarwellen und ihre Einhüllende'), () => p$(L('Huygens’ principle: every point of a wave front is the source of a wavelet that moves forward at the speed of the wave. A moment later the wave front is the envelope, the line that touches all the wavelets. In open space, the wavelets of a straight front add up to a straight front again.', 'Das Prinzip von Huygens: Jeder Punkt einer Wellenfront ist Quelle einer Elementarwelle, die sich mit der Geschwindigkeit der Welle vorwärts bewegt. Einen Augenblick später ist die Wellenfront die Einhüllende, die Linie, die alle Elementarwellen berührt. Im freien Raum setzen sich die Elementarwellen einer geraden Front wieder zu einer geraden Front zusammen.')) +
          p$(L('At the end of a front, nothing cancels the wavelet sideways: there the wave bends round. That is diffraction, the bending of a wave into the geometrical shadow.', 'Am Ende einer Front löscht nichts die Elementarwelle seitlich aus: Dort biegt die Welle um. Das ist Beugung, das Abbiegen einer Welle in den geometrischen Schatten.')), () => F().huygens()),
        fr(() => L('Narrow and wide', 'Schmal und breit'), () => p$(L('What counts is the width of the opening <i>compared with the wavelength</i>. A gap about one wavelength wide or narrower acts like a single point source: circular waves. A gap many wavelengths wide lets a straight wave through that bends only at its ends.', 'Was zählt, ist die Breite der Öffnung <i>im Vergleich zur Wellenlänge</i>. Eine Öffnung, die etwa eine Wellenlänge breit oder schmaler ist, wirkt wie eine einzige punktförmige Quelle: Kreiswellen. Eine Öffnung, die viele Wellenlängen breit ist, lässt eine gerade Welle durch, die nur an ihren Enden abbiegt.')) +
          p$(L('Two common mistakes: to think a narrower gap gives a narrower beam (it is the other way round), and to think the wavelength changes behind the gap (it stays: same medium, same speed, same frequency).', 'Zwei häufige Fehler: zu denken, eine schmalere Öffnung gebe ein schmaleres Bündel (es ist umgekehrt), und zu denken, die Wellenlänge ändere sich hinter der Öffnung (sie bleibt: dasselbe Medium, dieselbe Geschwindigkeit, dieselbe Frequenz).')),
          () => F().waves({ a: 1, behind: 'arcs', wavelets: true }) + F().waves({ a: 5, behind: 'beam', wavelets: true })),
      ],
    },
    {
      scenario: 'ds-pos', p: { lam: 600e-9, d: 0.3e-3, L: 2, k: 2 }, watch: true,
      name: () => L('The double slit', 'Der Doppelspalt'),
      idea: () => L('Bright where the path difference is a whole number of wavelengths: d·sin α = k·λ. For small angles sin α ≈ y/L, so the bright fringes are evenly spaced, Δy = λ·L/d.', 'Hell, wo der Gangunterschied eine ganze Zahl von Wellenlängen ist: d·sin α = k·λ. Für kleine Winkel ist sin α ≈ y/L; die hellen Streifen sind also gleichmässig verteilt, Δy = λ·L/d.'),
      intro: [
        fr(() => L('Two waves meet', 'Zwei Wellen treffen sich'), () => p$(L('Two sources that oscillate in step send waves to a point P. What arrives depends on the <b>path difference</b> $\\Delta s = r_2 - r_1$:', 'Zwei Quellen, die im Gleichtakt schwingen, senden Wellen zu einem Punkt P. Was ankommt, hängt vom <b>Gangunterschied</b> $\\Delta s = r_2 - r_1$ ab:')) +
          `<ul><li>${L('$\\Delta s = k\\cdot\\lambda$ ($k = 0, 1, 2, \\ldots$): crest meets crest, constructive interference, a maximum of order $k$;', '$\\Delta s = k\\cdot\\lambda$ ($k = 0, 1, 2, \\ldots$): Berg trifft Berg, konstruktive Interferenz, ein Maximum der Ordnung $k$;')}</li><li>${L('$\\Delta s = (k + \\tfrac12)\\cdot\\lambda$: crest meets trough, destructive interference, a minimum.', '$\\Delta s = (k + \\tfrac12)\\cdot\\lambda$: Berg trifft Tal, destruktive Interferenz, ein Minimum.')}</li></ul>` +
          p$(L('Not the distances count, only their difference, measured in wavelengths. Do not swap the two cases: a whole wavelength brings the waves back in step.', 'Nicht die Wege zählen, nur ihre Differenz, gemessen in Wellenlängen. Vertausche die beiden Fälle nicht: Eine ganze Wellenlänge bringt die Wellen wieder in Gleichtakt.')), () => F().sources({ kind: 'speaker', ds: true })),
        fr(() => L('The plan', 'Der Plan'), () => p$(L('For a double slit: (1) the path difference to a far point, $\\Delta s = d\\cdot\\sin\\alpha$; (2) bright where $\\Delta s = k\\cdot\\lambda$; (3) the angle is small, so $\\sin\\alpha \\approx y/L$; (4) solve for what is asked, and divide before you multiply: $\\lambda/d$ is a small pure number.', 'Für einen Doppelspalt: (1) der Gangunterschied zu einem fernen Punkt, $\\Delta s = d\\cdot\\sin\\alpha$; (2) hell, wo $\\Delta s = k\\cdot\\lambda$; (3) der Winkel ist klein, also $\\sin\\alpha \\approx y/L$; (4) nach dem Gesuchten auflösen, und zuerst teilen, dann multiplizieren: $\\lambda/d$ ist eine kleine reine Zahl.')), () => F().pathDiff()),
      ],
    },
    {
      scenario: 'grating-max', p: { n: 500, lam: 600e-9, off: 1 }, watch: true,
      name: () => L('The grating', 'Das Gitter'),
      idea: () => L('A grating has its maxima where a double slit of the same spacing has them, d·sin α = k·λ, but much sharper. With d = 1/n, sin α = k·n·λ, and no order can have sin α above 1.', 'Ein Gitter hat seine Maxima dort, wo ein Doppelspalt mit demselben Abstand sie hat, d·sin α = k·λ, aber viel schärfer. Mit d = 1/n ist sin α = k·n·λ, und keine Ordnung kann sin α über 1 haben.'),
      intro: [
        fr(() => L('Many slits', 'Viele Spalte'), () => p$(L('A grating is a row of many slits at the same spacing $d$, usually given as $n$ lines per millimetre: $d = 1/n$. Where the waves of neighbouring slits arrive in step, those of all slits do: the maxima lie where $d\\cdot\\sin\\alpha = k\\cdot\\lambda$, exactly as for a double slit.', 'Ein Gitter ist eine Reihe vieler Spalte mit demselben Abstand $d$, meist angegeben als $n$ Linien pro Millimeter: $d = 1/n$. Wo die Wellen benachbarter Spalte im Gleichtakt ankommen, tun es die aller Spalte: Die Maxima liegen dort, wo $d\\cdot\\sin\\alpha = k\\cdot\\lambda$, genau wie beim Doppelspalt.')) +
          p$(L('A little beside a maximum, the waves of many slits cancel: the maxima become narrow and bright. More slits do not move them, nor add any.', 'Ein wenig neben einem Maximum löschen sich die Wellen vieler Spalte aus: Die Maxima werden schmal und hell. Mehr Spalte verschieben sie nicht und fügen keine hinzu.')),
          () => F().pattern([{ lam: 500e-9, L: 1, d: 10e-6, N: 2, b: 0, cls: 'old' }, { lam: 500e-9, L: 1, d: 10e-6, N: 8, b: 0 }], { Y: 0.12, label: L('The pattern of a double slit (dashed) and of a grating with eight slits of the same spacing (solid)', 'Das Muster eines Doppelspalts (gestrichelt) und eines Gitters mit acht Spalten mit demselben Abstand (ausgezogen)') }) +
            legend('dashed: double slit · solid: grating, the same spacing d', 'gestrichelt: Doppelspalt · ausgezogen: Gitter, derselbe Abstand d')),
        fr(() => L('Colours', 'Farben'), () => p$(L('$\\sin\\alpha = k\\cdot\\lambda/d$ grows with the wavelength: a grating sends red light further out than blue, the opposite of a prism. White light gives a white central maximum (there $\\Delta s = 0$ for every colour) and a spectrum in each order.', '$\\sin\\alpha = k\\cdot\\lambda/d$ wächst mit der Wellenlänge: Ein Gitter lenkt rotes Licht weiter ab als blaues, umgekehrt als ein Prisma. Weisses Licht gibt ein weisses mittleres Maximum (dort ist $\\Delta s = 0$ für jede Farbe) und ein Spektrum in jeder Ordnung.')) +
          p$(L('The angles of a grating are often large; then $\\sin\\alpha \\approx y/L$ does not hold, and you work with $\\sin\\alpha$ itself.', 'Die Winkel eines Gitters sind oft gross; dann gilt $\\sin\\alpha \\approx y/L$ nicht, und man rechnet mit $\\sin\\alpha$ selbst.')), () => ''),
      ],
    },
    {
      scenario: 'change', p: { s: 'ds', v: 'b', k: 0.5 },
      name: () => L('Changing the pattern', 'Das Muster ändern'),
      idea: () => L('Write the formula, then see where the quantity that changes stands: numerator, denominator, or not at all. The pattern spreads with λ and L and shrinks as the slits get wider or further apart.', 'Schreib die Formel auf und schau, wo die Grösse steht, die sich ändert: im Zähler, im Nenner oder gar nicht. Das Muster wird breiter mit λ und L und schmaler, wenn die Spalte breiter oder weiter voneinander entfernt sind.'),
      intro: [
        fr(() => L('The single slit', 'Der Einzelspalt'), () => p$(L('A single slit of width $b$ gives a wide central bright fringe. Its edges, the first dark fringes, are where $b\\cdot\\sin\\alpha = \\lambda$: split the slit into an upper and a lower half; each wavelet of the upper half meets one of the lower half half a wavelength behind, and they cancel in pairs.', 'Ein Einzelspalt der Breite $b$ gibt einen breiten hellen Streifen in der Mitte. Seine Ränder, die ersten dunklen Streifen, liegen dort, wo $b\\cdot\\sin\\alpha = \\lambda$: Teile den Spalt in eine obere und eine untere Hälfte; jede Elementarwelle der oberen Hälfte trifft eine der unteren, die eine halbe Wellenlänge zurückliegt, und sie löschen sich paarweise aus.')) +
          p$(L('For small angles the central fringe is $w = 2\\lambda L/b$ wide: a <b>narrower</b> slit gives a <b>wider</b> pattern.', 'Für kleine Winkel ist der mittlere Streifen $w = 2\\lambda L/b$ breit: Ein <b>schmalerer</b> Spalt gibt ein <b>breiteres</b> Muster.')),
          () => F().pattern([{ lam: 600e-9, L: 2, b: 0.1e-3, N: 1, cls: 'old' }, { lam: 600e-9, L: 2, b: 0.05e-3, N: 1 }], { Y: 0.06, label: L('The pattern of a single slit (dashed) and of one half as wide (solid)', 'Das Muster eines Einzelspalts (gestrichelt) und eines halb so breiten (ausgezogen)') }) +
            legend('dashed: slit width b · solid: b/2', 'gestrichelt: Spaltbreite b · ausgezogen: b/2')),
        fr(() => L('A real double slit', 'Ein wirklicher Doppelspalt'), () => p$(L('Each slit of a double slit has a width $b$ too. The fringes lie where the double slit puts them, $\\Delta y = \\lambda L/d$; how bright they are follows the pattern of one slit, the envelope. Fringes near a dark fringe of the envelope are faint or missing.', 'Jeder Spalt eines Doppelspalts hat auch eine Breite $b$. Die Streifen liegen dort, wo der Doppelspalt sie hinlegt, $\\Delta y = \\lambda L/d$; wie hell sie sind, folgt dem Muster eines Spalts, der Einhüllenden. Streifen nahe bei einem dunklen Streifen der Einhüllenden sind schwach oder fehlen.')) +
          p$(L('So: the slit spacing $d$ sets the fringe spacing, the slit width $b$ only the envelope.', 'Also: Der Spaltabstand $d$ bestimmt den Abstand der Streifen, die Spaltbreite $b$ nur die Einhüllende.')),
          () => F().pattern([{ lam: 600e-9, L: 2, b: 0.05e-3, N: 1, cls: 'old' }, { lam: 600e-9, L: 2, d: 0.25e-3, b: 0.05e-3, N: 2 }], { Y: 0.03, label: L('The pattern of a double slit (solid) under the envelope of one of its slits (dashed)', 'Das Muster eines Doppelspalts (ausgezogen) unter der Einhüllenden eines seiner Spalte (gestrichelt)') }) +
            legend('dashed: one slit (the envelope) · solid: the double slit', 'gestrichelt: ein Spalt (die Einhüllende) · ausgezogen: der Doppelspalt')),
      ],
    },
    {
      scenario: 'res-change', p: { s: 'res', v: 'D', k: 2 },
      name: () => L('Resolving power', 'Auflösungsvermögen'),
      idea: () => L('Diffraction at the opening turns every point into a small blurred disc. Two points are just resolved when the centre of one disc lies on the first dark ring of the other: θₘᵢₙ = 1.22·λ/D. A larger opening or a shorter wavelength resolves finer detail.', 'Die Beugung an der Öffnung macht aus jedem Punkt ein kleines verwaschenes Scheibchen. Zwei Punkte sind gerade noch getrennt, wenn die Mitte des einen Scheibchens auf dem ersten dunklen Ring des anderen liegt: θₘᵢₙ = 1.22·λ/D. Eine grössere Öffnung oder eine kürzere Wellenlänge trennt feinere Einzelheiten.'),
      intro: [
        fr(() => L('Blurred by diffraction', 'Durch Beugung verwaschen'), () => p$(L('Light enters an eye, a camera or a telescope through a round opening of diameter $D$, and is diffracted there. So even a perfect lens makes of a point a small disc with faint rings around it; its first dark ring lies at the angle $\\sin\\theta = 1.22\\,\\lambda/D$ (for a slit it would be $\\lambda/b$).', 'Licht tritt in ein Auge, eine Kamera oder ein Teleskop durch eine runde Öffnung mit dem Durchmesser $D$ ein und wird dort gebeugt. So macht selbst eine perfekte Linse aus einem Punkt ein kleines Scheibchen mit schwachen Ringen darum; sein erster dunkler Ring liegt beim Winkel $\\sin\\theta = 1.22\\,\\lambda/D$ (für einen Spalt wäre es $\\lambda/b$).')) +
          p$(L('The <b>Rayleigh criterion</b>: two points are just resolved when the centre of one image lies on the first dark ring of the other. The smallest angle between them is $\\theta_{\\min} = 1.22\\,\\lambda/D$ (small angles, in radians).', 'Das <b>Rayleigh-Kriterium</b>: Zwei Punkte sind gerade noch getrennt, wenn die Mitte des einen Bildes auf dem ersten dunklen Ring des anderen liegt. Der kleinste Winkel zwischen ihnen ist $\\theta_{\\min} = 1.22\\,\\lambda/D$ (kleine Winkel, im Bogenmass).')),
          () => F().airy(1.8, { caption: L('resolved', 'getrennt') }) + F().airy(1, { caption: L('just resolved', 'knapp getrennt') }) + F().airy(0.5, { caption: L('not resolved', 'nicht getrennt') })),
        fr(() => L('Smaller is better', 'Kleiner ist besser'), () => p$(L('A <i>small</i> $\\theta_{\\min}$ means a <i>good</i> resolution. It shrinks with a larger opening (large telescope mirrors) and with a shorter wavelength (blue or UV light, electron microscopes). A common mistake is to think a larger opening diffracts more; it is the narrow opening that spreads the light.', 'Ein <i>kleines</i> $\\theta_{\\min}$ bedeutet eine <i>gute</i> Auflösung. Es wird kleiner mit einer grösseren Öffnung (grosse Teleskopspiegel) und mit einer kürzeren Wellenlänge (blaues oder UV-Licht, Elektronenmikroskope). Ein häufiger Fehler ist zu denken, eine grössere Öffnung beuge stärker; es ist die enge Öffnung, die das Licht verbreitet.')) +
          p$(L('You rarely need the factor 1.22: compare two cases by the ratios of $\\lambda$ and $D$.', 'Den Faktor 1.22 brauchst du selten: Vergleiche zwei Fälle über die Verhältnisse von $\\lambda$ und $D$.')), () => ''),
      ],
    },
  ];

  const st = (en, de, types) => ({ name: en ? () => L(en, de) : null, types });
  const TOPICS = [
    { name: () => L('Huygens and diffraction', 'Huygens und Beugung'), example: () => 0, stages: [st(null, null, ['gap']), st('Concepts', 'Konzepte', ['concept-huy'])] },
    { name: () => L('Double slit and grating', 'Doppelspalt und Gitter'), example: (s) => (s >= 3 && s <= 4 ? 2 : 1),
      stages: [st(null, null, ['path']), st('positions', 'Positionen', ['ds-pos']), st('the wavelength', 'die Wellenlänge', ['ds-lam']), st('the grating', 'das Gitter', ['grating']), st('the highest order', 'die höchste Ordnung', ['grating-max']), st('Concepts', 'Konzepte', ['concept-ds'])] },
    { name: () => L('Changing the pattern', 'Das Muster ändern'), example: () => 3, stages: [st(null, null, ['change']), st('the single slit', 'der Einzelspalt', ['single']), st('Concepts', 'Konzepte', ['concept-pat'])] },
    { name: () => L('Resolving power', 'Auflösungsvermögen'), example: () => 4, stages: [st(null, null, ['res-change']), st('by ratios', 'über Verhältnisse', ['res-scale']), st('how far, how small', 'wie weit, wie klein', ['res-far']), st('Concepts', 'Konzepte', ['concept-res'])] },
  ];

  root.Lessons = { EXAMPLES, TOPICS };
  if (typeof module !== 'undefined') module.exports = root.Lessons;
})(typeof window !== 'undefined' ? window : globalThis);
