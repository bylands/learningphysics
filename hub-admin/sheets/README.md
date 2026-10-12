# Exercise sheets

In the admin panel's **Sheets** tab (logged in), the teacher makes exercise sheets from their TeXercises
exercises. A sheet is independent of the sets: a title, a language (English or German), modules (the
hub's apps) with the learning objectives it practises (all of a module's by default), and its exercises
in order, kept in `hub-data/exercise-sheets.json` (not served).

- **Suggest** fills the sheet from `pool.json` (`sheets.py`): round by round over the chosen objectives,
  so every objective has one exercise before any has two; per objective an exercise in the sheet's
  language first, then one without image, then the difficulty the sheet lacks most for a mix of about
  30 % easy (1), 50 % average (2), 20 % hard (3 and more), then the pool's order. By default two per
  objective, at most 24; another number can be asked for (up to 40). The exercises come by module,
  from easy to hard.
- Each exercise lists up to five **alternatives** (same objectives, not on the sheet; the sheet's
  language first, then a similar difficulty): one click puts one in its place. Exercises can be
  removed, moved up and down, and added from any chosen objective's list.
- The **preview** shows the exercises (and, ticked, their solutions) in the browser: `preview.py`
  turns the TeXercises LaTeX into HTML. It evaluates the solver part (`\NewQty`, `\SolQty`,
  `\ConvTo`; the xfp arithmetic by a small parser of its own, never `eval`), prints the quantities
  (`\xO`, `\x`, `\xP{p}{n}`, ...) as numbers with units, turns siunitx into plain math and text mode
  into HTML, and leaves the math to KaTeX (`/katex/`) on the page. TikZ pictures and images are a
  placeholder ("figure in the PDF", an image links to its TeXercises page); an unknown macro shows as
  its source. All 156 drafts of this repository render without anything shown as source (46 have a
  figure placeholder).
- **Download PDF** and **PDF with solutions**: made of the saved sheet with `build_sheet.py` and
  LuaLaTeX, in the background the first time (the page reloads itself until the PDF is there), then
  cached in `hub-data/sheets/` by a hash of everything it is made of.
- **Online version**: a secret link (`learningphysics.ch/admin/sheet/s/<secret>`) for the students: the
  exercises without solutions, set with KaTeX, also for printing; it needs no login. **New link**
  replaces the secret (the old link stops working), **Stop sharing** removes it.

## How the exercises are chosen

- `pool.json` lists, for every app and learning objective, the exercises that practise it, best first,
  with their language, difficulty and whether they have an image. Edit it to change what sheets
  suggest: move a key up, to another objective, or delete it. `pool.md` shows it readably.
- `build_pool.py` writes `pool.json` from the exercise-objective mapping of the sheets branch
  (`texercises-sheets/data/`, copied to `data/` here): `exercise-objectives.csv` says which objectives each
  exercise of the TeXercises export practises, `candidate-objectives.csv` (placement `extend:<app>`) which
  exercises fit an app as a whole. Only the exercises created by `by` count. The drafts of this repository
  (`texercises-drafts*/`), which the mapping does not cover, go to their own app, with objectives found by
  keyword rules. Per objective, exercises without image come first, then from easy to hard.

      python3 hub-admin/sheets/build_pool.py ../texercises-by-2026-10-10 --fails run-final.txt [--data <folder>]

  It overwrites `pool.json`: to change the sheets for good, change the mapping and build again.
- `sheets.py` (used by `../hubadmin.py`) suggests the exercises and their alternatives and runs
  `build_sheet.py` (the exercises as a LaTeX document, a section per module) and LuaLaTeX with
  `texercises-lp.sty` (the TeXercises macros) and `lp-minion.sty` in its modern look (Erewhon, Fira Sans:
  free fonts). `preview.py` makes the HTML of the preview and the online version.
- The exercises: the export uploaded in the admin panel (kept in `hub-data/texercises/`, only the teacher's
  own: `OWN_CREATOR` in hubadmin.py), and the drafts that `deploy.sh` copies to `hub-admin/sheets/drafts/`.
  Neither is served by nginx. Exercise texts and solutions never go into this public repository: `pool.json`
  holds only keys, titles and objectives.
- Images are not in a TeXercises export: a sheet shows a framed placeholder that links to the exercise.

## On the server (once, with sudo)

1. LaTeX (about 1.5 GB):

       sudo apt install --no-install-recommends texlive-luatex texlive-latex-recommended texlive-latex-extra \
         texlive-science texlive-pictures texlive-fonts-recommended texlive-fonts-extra texlive-lang-german \
         texlive-plain-generic texlive-games lmodern

2. nginx: the site in `deploy/nginx/learningphysics.conf` has two locations for the sheets (the upload, up to
   64 MB, and `/admin/sheet/`: the PDFs and the online versions). Install it as described in the top-level
   README.
3. Deploy (a push to main), then test as the service's user; the first run fills the font cache (a minute):

       sudo -u hubadmin python3 /var/www/teachingphysics/hub-admin/sheets/sheets.py /var/www/teachingphysics/hub-data

4. In the admin panel (Sheets), upload a TeXercises export (TeXercises: Settings → Export,
   the .zip). Upload it again whenever exercises change.

Without LaTeX the admin panel says so; everything else (suggestions, preview, online version) works.
The sheets made per set before the Sheets tab (`hub-data/sheets.json`, `hub-data/sheets/made/`) are no
longer used and can be deleted.
