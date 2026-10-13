# TeXercises drafts from the Aufgaben sheets

Exercises from the old Aufgaben sheets (lecture-notes, one `Aufgaben` folder
per topic), rewritten as TeXercises exercises in the bulk-import format (see
`texercises-drafts/README.md`). The selection and grouping follow the reviewed
overview of the 445 sheet exercises; this first batch is the collection
**Freier Fall** (13 exercises, German, private, no `"id"`, so an upload
creates them).

## Upload

    cd texercises-aufgaben && zip -r ../aufgaben-freier-fall.zip exercises collections

Then Settings -> Bulk import on TeXercises, and check the preview before
confirming.

## Conventions

- Every quantity is defined in the solver (`\NewQty`, `\SolQty`, `\ConvTo`);
  text and solution only refer to it (`\XO`, `\XF`, `\X`, `\XP{..}{..}`),
  never to typed numbers.
- g = 9.81 m/s², defined in each preamble as `gE`.
- Constants and look-up values from Formeln, Tabellen, Begriffe (7th ed.):
  Olten from the Swiss table (p. 204), Mars from the planet table (p. 212),
  g(φ, h) from p. 209. The book prints k2 = −3.15·10⁻⁶ m⁻¹; that is ten times
  the free-air gradient and misses the Olten table value by 0.011 m/s², so the
  exercise uses k2 = −3.15·10⁻⁷ m⁻¹ (Olten: 9.8071 vs 9.80688 in the table).
- Uniformly accelerated intervals use the average velocity: velocities at
  the start and end, their mean, times the interval.
- Schematic diagrams are new TikZ pictures sized for large screens.
- Quantity names avoid LaTeX and siunitx commands (`g`, `s`, `T`, `d`, `h`,
  `sf`, `to`, `th`, `dB` are commands or units).
- Every number comes from the solver; the results were recomputed
  independently. **No LaTeX was compiled**: look at the preview.
