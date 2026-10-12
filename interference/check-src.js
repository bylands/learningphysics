// The check (see check.js, shared by the apps): the learning objectives, each with the exercise
// types (scenarios.js) that test it, its worked example and its practice topic (lessons.js), and
// the questions. Each asks for one answer of an exercise, with four options (see quiz() in
// generator.js): a picture, a fringe, a factor, a statement, or a number.
(function (root) {
  'use strict';

  const IW = root.IW, { practiceOf, quiz } = root.Interf;
  const L = (en, de) => IW.L(en, de);

  const OBJECTIVES = [
    { id: 'huygens', kinds: ['gap', 'concept-huy', 'gap'], tutor: 0, topic: 0,
      name: () => L('Explain diffraction with Huygens’ principle: how much a wave spreads behind an opening depends on its width compared with the wavelength.',
        'Die Beugung mit dem Prinzip von Huygens erklären: Wie stark sich eine Welle hinter einer Öffnung ausbreitet, hängt von ihrer Breite im Vergleich zur Wellenlänge ab.') },
    { id: 'maxima', kinds: ['path', 'ds-pos', 'grating-max', 'concept-ds', 'ds-lam'], tutor: 1, topic: 1,
      name: () => L('Predict where the maxima of a double slit and a grating lie, from the path difference: d·sin α = k·λ.',
        'Voraussagen, wo die Maxima eines Doppelspalts und eines Gitters liegen, aus dem Gangunterschied: d·sin α = k·λ.') },
    { id: 'changes', kinds: ['change', 'concept-pat', 'change'], tutor: 3, topic: 2,
      name: () => L('Predict how the pattern changes when the slit width, the slit spacing or the wavelength changes.',
        'Voraussagen, wie sich das Muster ändert, wenn sich die Spaltbreite, der Spaltabstand oder die Wellenlänge ändert.') },
    { id: 'resolve', kinds: ['res-change', 'concept-res', 'res-scale', 'res-far'], tutor: 4, topic: 3,
      name: () => L('Relate the resolving power to the aperture and the wavelength: θₘᵢₙ = 1.22·λ/D.',
        'Das Auflösungsvermögen mit der Öffnung und der Wellenlänge verknüpfen: θₘᵢₙ = 1.22·λ/D.') },
  ];

  // The idea behind each wrong-answer flag.
  const concept = {
    ray: 'huygens', size: 'narrow', lambda: 'samelam',
    half: 'path', order: 'order', k: 'order', both: 'centre', whole: 'centre',
    grating: 'grating', colour: 'colour', round: 'sinmax',
    inv: 'inverse', same: 'inverse', bd: 'bd',
    rinv: 'aperture', rsame: 'aperture', rayleigh: 'rayleigh',
  };
  const concepts = () => ({
    huygens: L('waves bend into the shadow: every point of the front sends out wavelets', 'Wellen biegen in den Schatten: Jeder Punkt der Front sendet Elementarwellen aus'),
    narrow: L('the narrower the opening compared with λ, the more the wave spreads', 'je schmaler die Öffnung im Vergleich zu λ, desto stärker breitet sich die Welle aus'),
    samelam: L('diffraction does not change the wavelength', 'Beugung ändert die Wellenlänge nicht'),
    path: L('bright where Δs = k·λ, dark where Δs = (k + ½)·λ', 'hell, wo Δs = k·λ, dunkel, wo Δs = (k + ½)·λ'),
    order: L('the order k counts the path difference in wavelengths', 'die Ordnung k zählt den Gangunterschied in Wellenlängen'),
    centre: L('distances measured from the central maximum, on one side', 'Abstände von der Mitte aus gemessen, auf einer Seite'),
    grating: L('a grating has its maxima where a double slit of the same spacing has them, only sharper', 'ein Gitter hat seine Maxima dort, wo ein Doppelspalt mit demselben Abstand sie hat, nur schärfer'),
    colour: L('a grating sends longer waves further out: red outside, white in the centre', 'ein Gitter lenkt längere Wellen weiter ab: Rot aussen, Weiss in der Mitte'),
    sinmax: L('sin α cannot be larger than 1: that limits the orders', 'sin α kann nicht grösser als 1 sein: Das begrenzt die Ordnungen'),
    inverse: L('the pattern spreads with λ and L, and shrinks as the slits get wider or further apart', 'das Muster wird breiter mit λ und L und schmaler, wenn die Spalte breiter oder weiter voneinander entfernt sind'),
    bd: L('the slit spacing sets the fringe spacing, the slit width only the envelope', 'der Spaltabstand bestimmt den Abstand der Streifen, die Spaltbreite nur die Einhüllende'),
    aperture: L('a larger opening and a shorter wavelength resolve finer detail: θₘᵢₙ = 1.22·λ/D', 'eine grössere Öffnung und eine kürzere Wellenlänge trennen feinere Einzelheiten: θₘᵢₙ = 1.22·λ/D'),
    rayleigh: L('Rayleigh: the centre of one image on the first dark ring of the other', 'Rayleigh: die Mitte des einen Bildes auf dem ersten dunklen Ring des anderen'),
  });

  const plain = (s) => s.replace(/<[^>]*>/g, '').replace(/:$/, '');

  function question(kind, seed) {
    const ex = practiceOf(kind, seed), qz = quiz(ex, seed), f = qz.field;
    const ask = f.type === 'num' ? L(`Find the ${plain(f.what)} $${f.sym}$.`, `Wie gross ist $${f.sym}$ (${plain(f.what)})?`) : f.ask || f.what;
    return {
      title: ex.title,
      // a statement to choose needs no words before it: the question is the ask
      text: kind.startsWith('concept') ? '' : ex.text,
      figure: ex.figure({ task: true }),
      ask,
      options: qz.options.map((o) => ({ html: o.html, correct: !!o.correct, flag: o.flag, why: o.why })),
      explain: () => `<div class="figs">${ex.solutionFigure() || ''}</div><div class="steps">${ex.solution.join('')}</div>`,
      key: `${kind}|${JSON.stringify(ex.p)}|${f.key}`,
    };
  }

  root.CheckSource = { id: 'itf', objectives: OBJECTIVES, question, concept, concepts };
})(typeof window !== 'undefined' ? window : globalThis);
