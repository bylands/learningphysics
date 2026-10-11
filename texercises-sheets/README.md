# TeXercises sheets as LaTeX

Compile a TeXercises collection to PDF outside TeXercises (pdflatex, TeX Live 2026).

- `texercises-lp.sty`: the TeXercises solver macros (\NewQty, \SolQty, \ConvTo, boxes, constants, material values, units), rebuilt from the TeXercises cheatsheet.
- `build_sheet.py <export folder> <collection.json> <out.tex> [--short]`: writes the sheet, exercises first, then solutions.
- `test_all.py <export folder> [build dir] [-j N] [--only key,...]`: compiles every exercise of an export on its own (text and solution) and lists the failures.
- `pilot-electrostatics.json`: a pilot collection (18 exercises, Learning Physics electrostatics apps).

- `lp-minion.sty`: Samuel's sheet layout (LuaLaTeX): Minion 3 with old-style figures, body 10/12 pt, title 14 pt bold small caps, section titles 10 pt semibold small caps, footer 8 pt small caps (text, date, author); exercises numbered with a hanging indent, the short solutions as "Numerical Solutions" in 6 pt, then the full solutions. Measured from "W1 PAe AC Circuits" (A4, 2.5 cm margins, sizes in PostScript points as in Pages). Formulas use Minion letters with Libertinus Math symbols and lining figures (`\usepackage[oldstylemath]{lp-minion}` for old-style figures there too).
  Each exercise starts with its title (semibold, a hidden link to the exercise on TeXercises) and its difficulty as stars (the item's difficulty in the collection, else the exercise's default); "Similar: texercises.com/exercise/..." in an item's additional text becomes one small grey line of linked titles. With Minion Math installed (typoma.com) the formulas use it automatically. `\usepackage[cochineal]{lp-minion}` (builder: `--font=cochineal`) sets the same layout in Cochineal (Michael Sharpe's extension of Crimson Text) with its matching math from newtxmath; Cochineal has no semibold, so section titles are bold small caps.
- `latexmkrc`: latexmk runs LuaLaTeX here.

Images are not in the TeXercises export: put them in `images/<name>` next to the .tex, or the sheet prints a placeholder.

    python3 build_sheet.py ../texercises-by-2026-10-10 pilot-electrostatics.json pilot.tex
    latexmk pilot.tex

Options of `build_sheet.py`: `--style=minion` (default) or `--style=plain` (Latin Modern, exercise titles, also pdflatex); `--author=By`, `--date=09.09.20`, `--footer="Exercises AC Circuits"` for the footer (defaults: By, today, "Exercises <collection title>"); `--short` for short solutions only; `--numerical` adds the short solutions as "Numerical Solutions" after the exercises.

Each build writes `<out>-images.txt`: every image the sheet uses, whether it is in `images/`, and the TeXercises page of its exercise. A missing image prints a framed placeholder that links to that page.

`fetch_images.sh <out>-images.txt` gets the missing images through Safari, where you are logged in to TeXercises (from outside CH/DE/AT/LI the site needs the login): a separate Safari window opens each `texercises.com/gallery/image/file/<name>/`, which redirects to a signed download link, and curl saves the file in `images/`. SVG images also get a PDF copy (rendered by Quick Look). Bring a Safari window of the profile where you are logged in to the front before starting it; the new window opens in that profile. Images are not committed (`.gitignore`).

## What the package does

- `\NewQty[opts]{x}{13.4}[\milli\watt][e-3][\watt]`: `\xO` as given, `\x` in SI (at most 4 figures), `\xX` the number, `\xU` the unit, `\xOX`/`\xOU` number and unit as typed. A factor starting with `e` is a power of ten; any other factor (or `\NewQty*`) multiplies. A decimal comma and an uncertainty such as `3.2(1)` are accepted.
- `\SolQty[opts]{x}[formula]{xfp expression}[unit]`: `\x` (4 figures), `\xS{n}`, `\xP{p}{n}` (prefix 10^p), `\xQ`, `\xI`, `\xF`, `\xX`, `\xU`, `\xO`. `scientific-notation=false` gives fixed notation. Parentheses the author left open (or closed once too often) are balanced.
- Quantities are local to the group they are defined in, so exercises do not leak names into each other. A few names that would replace LaTeX commands the page needs (`value`, `par`, ...) keep the LaTeX meaning; a quantity `S` keeps siunitx' `\SI`.
- Unit macros work on their own too (`\m`, `\ohm`, as in TeXercises), plus the TeXercises shortcuts (`\kmph`, `\mps`, ...).
- Constants `\ncg`, `\nce`, ... and the older `\ncgn` (bare number). Material values `\cWa`, `\RKu`, `\aKo`, `\TfWa`, ... (first two letters of the German name) from a school table; `\Waerme{...}`/`\Dichte{...}` print a short note outside the solver part.
- Boxes `\Geg`, `\Ges`, `\Lsg`, `\tcbhighmath[aufgabe|loesung|highlight math]`, lists `abcliste`/`abclist` (counter `abc`), `wf` with `\claim`, `\trueclaim`, `\falseclaim`, difficulty pieces `\pawnB` ... `\kingB`, `\al{...}` (align*).
- `build_sheet.py` closes a display opened as `align*` and closed as `align` the way it was opened.

Function plots (tkz-fct's `\tkzFct`, TikZ `plot function{...}`) are computed in TeX, so they need neither gnuplot nor `-shell-escape`. The expression is read in gnuplot syntax (`sin` in radians, `x**2`); a TikZ-style `sin(deg(...))` is read as `sin(...)`.
