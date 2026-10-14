# TeXercises drafts from the Aufgaben sheets

Exercises from the old Aufgaben sheets (lecture-notes, one `Aufgaben` folder
per topic), rewritten as TeXercises exercises in the bulk-import format (see
`texercises-drafts/README.md`). The selection and grouping follow the reviewed
overview of the 445 sheet exercises; this first batch is the collection
**Freier Fall** (13 exercises, German, private). They carry the `"id"`s of
their uploaded copies (exercises 24627 to 24639, collection 5851), so an
upload updates them in place.

All 33 collections (430 exercises) are uploaded (14.10.2026) and carry the
ids of their copies on TeXercises, so a later upload updates them in place. `STYLE.md` holds the
house style, `tools/check.py` checks the drafts.

## Upload

    cd texercises-aufgaben && zip -r ../aufgaben-freier-fall.zip exercises collections

Then Settings -> Bulk import on TeXercises, and check the preview before
confirming.

## Conventions

- Every quantity is defined in the solver (`\NewQty`, `\SolQty`, `\ConvTo`);
  text and solution only refer to it (`\XO`, `\XF`, `\X`, `\XP{..}{..}`),
  never to typed numbers.
- g = 9.81 m/s², defined in each preamble as `gE`; 10 m/s² in the exercises meant
  for working without a calculator (6, 7, 10), stated in their text.
- `\XP{}{}` works only on solved quantities: a looked-up value that is a
  boxed result goes through `\ConvTo{Xr}{1}{X}{unit}` first.
- Constants and look-up values from Formeln, Tabellen, Begriffe (7th ed.):
  Olten from the Swiss table (p. 204), Mars from the planet table (p. 212, looked up, not computed),
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
