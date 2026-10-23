# TeXercises drafts, third bundle: exercises for thin learning objectives

75 new exercises for the 38 learning objectives that had fewer than three exercises in the pool
(`hub-admin/sheets/pool.json`, 23 October 2026). Each one takes a scenario, a question type or a typical
mistake from the matching learningphysics.ch module; `"note"` names its objective. None has an `"id"`,
so an upload creates them. They are in 19 private collections, one per module (`<app>-objectives`).

| Module | Exercises | Objectives | Collection | Language |
|---|---|---|---|---|
| bulb-brightness | 5 | change, current, power | bulb-brightness-objectives | ENG |
| capacitors | 1 | sketch | capacitors-objectives | ENG |
| centre-of-mass | 5 | stability, tipping | centre-of-mass-objectives | GER |
| cyclic-processes | 7 | error, identify, sketch | cyclic-processes-objectives | GER |
| electric-field | 7 | equi, error, read, sketch | electric-field-objectives | ENG |
| energy-conservation | 6 | error, path, turn | energy-conservation-objectives | GER |
| force-concepts | 2 | first | force-concepts-objectives | GER |
| force-systems | 5 | error, spring | force-systems-objectives | GER |
| interaction | 2 | equal, normal | interaction-objectives | GER |
| magnetic-forces | 3 | error | magnetic-forces-objectives | ENG |
| motion-areas | 10 | area, farther, mean, sketch | motion-areas-objectives | GER |
| motion-data | 4 | convert, uniform | motion-data-objectives | GER |
| motion-graphs | 3 | negative, sketch | motion-graphs-objectives | GER |
| oscillations | 4 | circle, lc | oscillations-objectives | ENG |
| photons | 2 | wave | photons-objectives | ENG |
| potential-circuit | 3 | error | potential-circuit-objectives | ENG |
| rl-switch | 2 | after, steady | rl-switch-objectives | ENG |
| torque | 3 | rank | torque-objectives | GER |
| wave-propagation | 1 | superpose | wave-propagation-objectives | ENG |

Upload: `zip -r ../learningphysics-drafts-3.zip exercises collections`, then Settings -> Bulk import,
and check the preview before confirming. After the import, upload a fresh export in the admin panel:
the new exercises are not in `categories.json`, so they appear under "New exercises" and are categorised
there (provisionally at once, then by Claude); confirm or change their subtopic and task kind.

## How they were made

- Calculation problems use uneven, realistic givens (Samuel's rule); conceptual, ranking and
  "find the error" exercises keep the module's whole-number grids where it uses them.
- Every numerical result was recomputed in Python against the Solver formulas; circuits checked with
  Kirchhoff's rules, hand rules with cross products, field lines computed numerically.
- All 75 compile without LaTeX errors as one check sheet, full and short (lualatex, `texercises-lp.sty`).
- `pool.json` lists each draft under its app and objective, so every objective now has at least three.

## Worth checking in the preview

- `type`: 0 for purely conceptual ones, 1 for calculations, 2 for both.
- Address form: torque, force-concepts, interaction and force-systems use "du", as do
  centre-of-mass-01/05 and energy-conservation-14; the other German ones use "Sie". Each exercise
  is consistent on its own.
- Very large or small results in photons-13/14 are boxed as a number times a power of ten, since
  `\XP` prints only SI prefixes.
- The bulb, potential and field-line figures are TikZ drawn from computed data: check they read well
  at the size TeXercises shows them.
