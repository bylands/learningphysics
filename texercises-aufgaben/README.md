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

- g = 9.81 m/s², defined in each preamble as `gE`.
- Constants and look-up values from the Formelsammlung (Formeln, Tabellen,
  Begriffe): Olten 9.806 88 m/s² (Geophysikalische Daten der Schweiz, p. 204).
  Values the Formelsammlung extract does not contain are given in the
  exercise text (g at the equator and pole) or in the solution (Mars mass and
  radius, the international normal gravity formula for the Everest).
- Schematic diagrams are new TikZ pictures. Each has a large-screen version
  (inline in the solution) and a small-screen version, both as standalone
  sources in `figures/<exercise>-gross.tex` and `-klein.tex`.
- Quantity names avoid LaTeX and siunitx commands (`g`, `s`, `T`, `d`, `h`,
  `sf`, `to`, `th` are commands or units).
- Every number comes from the solver; the results were recomputed
  independently. **No LaTeX was compiled**: look at the preview.
