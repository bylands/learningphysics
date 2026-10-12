# Exercise sheets for the sets

A set of the hub can have an exercise sheet: two PDFs (with and without the solutions) made from the
teacher's TeXercises exercises. Only in the admin panel (Sets → Exercise sheets, logged in): **Create** makes
a set's sheet and keeps it as it is (`hub-data/sheets/made/`, listed in `hub-data/sheets.json`), even if the
set changes, until it is made again (**Create again**) or **Delete**d; the sheet of a set that was deleted
stays listed until it is deleted too. The panel also takes the upload of a TeXercises export. The set's public
page does not show the sheets.

## How a sheet is made

- `pool.json` lists, for every app and learning objective, the exercises that practise it, best first. A
  set's sheet takes, app by app, for each of the set's objectives (all of the app's if it names none) the
  first two exercises not taken yet, those in the set's language first; at most 24. Edit `pool.json` to
  change what a sheet gets: move a key up, to another objective, or delete it. `pool.md` shows it readably.
- `build_pool.py` writes `pool.json` from the exercise-objective mapping of the sheets branch
  (`texercises-sheets/data/`, copied to `data/` here): `exercise-objectives.csv` says which objectives each
  exercise of the TeXercises export practises, `candidate-objectives.csv` (placement `extend:<app>`) which
  exercises fit an app as a whole. Only the exercises created by `by` count. The drafts of this repository
  (`texercises-drafts*/`), which the mapping does not cover, go to their own app, with objectives found by
  keyword rules. Per objective, exercises without image come first, then from easy to hard.

      python3 hub-admin/sheets/build_pool.py ../texercises-by-2026-10-10 --fails run-final.txt [--data <folder>]

  It overwrites `pool.json`: to change the sheets for good, change the mapping and build again.
- `sheets.py` (used by `../hubadmin.py`) chooses the exercises and runs `build_sheet.py` (the collection as a
  LaTeX document) and LuaLaTeX with `texercises-lp.sty` (the TeXercises macros) and `lp-minion.sty` in its
  modern look (Erewhon, Fira Sans: free fonts). Built PDFs are also cached in `hub-data/sheets/` by a hash
  of everything they are made of, so creating an unchanged sheet again is quick.
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

2. nginx: the site in `deploy/nginx/learningphysics.conf` has two new locations (the upload, up to 64 MB, and a
   longer timeout for the first PDF of a set). Install it as described in the top-level README.
3. Deploy (a push to main), then test as the service's user; the first run fills the font cache (a minute):

       sudo -u hubadmin python3 /var/www/teachingphysics/hub-admin/sheets/sheets.py /var/www/teachingphysics/hub-data

4. In the admin panel (Sets → Exercise sheets), upload a TeXercises export (TeXercises: Settings → Export,
   the .zip). Upload it again whenever exercises change.

Without LaTeX the admin panel says so; everything else works as before.
