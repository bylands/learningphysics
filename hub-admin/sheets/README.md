# Exercise sheets for the sets

Every set of the hub (learningphysics.ch/<name>) gets an exercise sheet as a PDF, made from the teacher's
TeXercises exercises: on the set's page, "Exercise sheet (PDF)" (public, like the page) and "with solutions,
for teachers" (only when logged in to the admin panel). The admin panel (Sets) lists the sheets of all sets
and takes the upload of a TeXercises export.

## How a sheet is made

- `pool.json` lists, for every app and learning objective, the exercises that practise it, best first. A
  set's sheet takes, app by app, for each of the set's objectives (all of the app's if it names none) the
  first two exercises not taken yet, those in the set's language first; at most 24. Edit `pool.json` to
  change what a sheet gets: move a key up, to another objective, or delete it. `pool.md` shows it readably.
- `build_pool.py` made the first version by keywords, from a TeXercises export (only the exercises created by
  `by`) and from the drafts of this repository (`texercises-drafts*/`):

      python3 hub-admin/sheets/build_pool.py ../texercises-by-2026-10-10 --fails run-final.txt

  It overwrites `pool.json`: after editing that by hand, change the keyword rules instead, or merge.
- `sheets.py` (used by `../hubadmin.py`) chooses the exercises and runs `build_sheet.py` (the collection as a
  LaTeX document) and LuaLaTeX with `texercises-lp.sty` (the TeXercises macros) and `lp-minion.sty` in its
  modern look (Erewhon, Fira Sans: free fonts). PDFs are cached in `hub-data/sheets/` until anything they are
  made of changes.
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

Without LaTeX the hub page shows no sheet links and the admin panel says so; everything else works as before.
