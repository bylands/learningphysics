# TeXercises sheets as LaTeX

Compile a TeXercises collection to PDF outside TeXercises.

- `texercises-lp.sty`: the TeXercises solver macros (\NewQty, \SolQty, \ConvTo, boxes, constants, units), rebuilt from the TeXercises cheatsheet.
- `build_sheet.py <export folder> <collection.json> <out.tex> [--short]`: writes the sheet, exercises first, then solutions.
- `pilot-electrostatics.json`: a pilot collection (18 exercises, Learning Physics electrostatics apps).

Images are not in the TeXercises export: put them in `images/<name>` next to the .tex, or the sheet prints a placeholder.

    python3 build_sheet.py ../texercises-by-2026-10-10 pilot-electrostatics.json pilot.tex
    latexmk -pdf pilot.tex
