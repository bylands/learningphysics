# Exercise sheets

In the admin panel's **Sheets** tab (logged in), the teacher makes exercise sheets from their TeXercises
exercises. The tab begins with the sheets (**+ New sheet**) and the editor of the one chosen. Below the
sheets, folded, the **topics covered by the exercise pool** (`pool.json`, `coverage` in `sheets.py`): per
module (the hub's apps, in their order) its exercises, how many of them are there, and per learning
objective the exercises that practise it; an objective without any shows a red 0, and a module's
exercises tied to none of its objectives are counted as the module as a whole. Then, folded too, the
**exercise review** (below), and last the state of the server and the upload of a TeXercises export.

A sheet is independent of the sets: a title, a language (English or German), its topics, learning
objectives and balance, and its exercises in order, kept in `hub-data/exercise-sheets.json` (not
served). The editor makes it in three steps (`sheets.py` on the server):

1. **Topics**: the topic tree of `categories.json` (Claude's reading of all exercises of the export:
   6 areas, 29 topics, 133 subtopics; `load_categories`, `topic_tree`), folded by area and topic, each
   node with how many of the exercises there (in the uploaded export or the drafts) have it as their
   main subtopic (the title says how many are concept questions); only nodes with exercises are shown.
   One or several subtopics are chosen; ticking an area or a topic ticks all its subtopics. Exercises
   uploaded since get their categories by themselves (**New exercises**, below), merged over
   `categories.json`; **Not yet categorised** stands for those that have none yet. A sheet
   saved before the tree keeps its TeXercises topics (the `subbranches` of exercise.json): they still
   match (`on_topics`) and are listed below the tree, to drop them.
2. **Learning objectives**: per module, the objectives that `pool.json` links to at least one exercise
   on these topics, with how many (`objective_keys`); those a new topic brings are ticked, each can be
   unticked, and **Select all** / **None** do a whole module. **Exercises without a learning
   objective** (on the topics, in none of the pool's objectives: `loose_keys`) is a choice of its own,
   off by default.
3. **Balance**: the share of **concept questions** (by the task kind of `categories.json`: concept and
   explain; graph counts as a concept question or a problem, whichever the sheet lacks; calculate,
   derive, show, estimate and data are textbook problems; for an exercise it does not know, by the
   TeXercises type: 0 Descriptive/Quality and 3 True/false; type 2 Both like graph; the
   others, 1 Calculative, 7 Algebraic, 5 Show, 6 Proof, are textbook problems), 30 % by default, and of
   **easy, medium and hard** exercises (`default_difficulty` 1, 2, 3 and more; none: medium), three
   linked sliders, 30/50/20 % by default; and the number of exercises. A table shows, for each, what
   the sheet aims for, what it has (live, also after a change by hand) and how many there are on the
   topics and ticked objectives; what these cannot give is said below it ("only 2 concept questions
   on these topics and objectives").

- **Suggest a sheet** fills the sheet (`suggest`): round by round over the ticked objectives (in the
  modules' order, those without objective last), so every objective has one exercise before any has
  two; per objective an exercise in the sheet's language first, then the one that brings the sheet
  nearest to its concept and difficulty shares, then one not too similar (0.9) to those already on
  the sheet, then one without image, then the pool's order. Never two **near-duplicates** on one sheet
  (one flagged `dup:<id>` of the other in `categories.json`; similarity alone only orders), nor an
  exercise flagged `broken`. Once
  every objective has one (or from the start, if the sheet has fewer exercises than objectives), the
  slots left that are all needed for concept questions, problems or a difficulty go only to objectives
  that have one. Where a share cannot be met it takes the closest. By default two per objective, at
  most 24; another number can be asked for (up to 40). The exercises come by module, from easy to hard.
  The suggestion depends only on the sheet and the exercises: the same every time.
- Each exercise shows its language, kind (concept, problem, or "concept or problem" for Both),
  difficulty, image, subtopic (or, not yet categorised, its TeXercises topics) and objectives, and
  lists up to five **alternatives** (same objectives, not on the sheet, no near-duplicate of another
  exercise on it; the sheet's language first, then the most similar, then the same kind, then a
  similar difficulty) and the five **most similar** of all the exercises there, with their
  similarity: one click puts one in its place. **Similarity** (`similarity`, as
  `similarity.md` of the categories): a weighted sum of the subtopics (0.35), the laws used
  (0.20, rare ones weighing more), the task kind (0.15), the difficulty (0.10), the mathematics (0.07),
  the steps (0.05), the representations (0.04) and the context (0.04); the language does not count. Exercises can be removed, moved up and down, and added
  from the exercises on the sheet's topics, per objective or without one.
- A sheet saved before the topics (modules and objectives only) opens as one with the topics of its
  exercises, its objectives as saved and the default balance (`migrate_sheet` in hubadmin.py); it is
  saved in the new form. In the PDF and the online version, an exercise the pool does not know comes
  under its first TeXercises topic.
- The **preview** shows the exercises (and, ticked, their solutions) in the browser: `preview.py`
  turns the TeXercises LaTeX into HTML. It evaluates the solver part (`\NewQty`, `\SolQty`,
  `\ConvTo`; the xfp arithmetic by a small parser of its own, never `eval`), prints the quantities
  (`\xO`, `\x`, `\xP{p}{n}`, ...) as numbers with units, turns siunitx into plain math and text mode
  into HTML, and leaves the math to KaTeX (`/katex/`) on the page; an unknown macro shows as its
  source. All 156 drafts of this repository render without anything shown as source.
- **Figures**: `figures.py` draws the TikZ pictures (and circuitikz, pgfplots) with LuaLaTeX, as in the
  PDF (`texercises-lp.sty`, the PDF's fonts), and `pdftocairo` (or `dvisvgm`) turns them into SVG for
  the browser, kept in `hub-data/sheet-figures/` by a hash of what they are made of (the solver part,
  the language, the figure). The first time, a page shows "The figure is being drawn …" and asks again
  until it is there (all figures of an exercise in one LaTeX run, a few seconds). A figure LaTeX
  cannot draw stays a placeholder; without LaTeX or pdftocairo, all are ("figure in the PDF").
- **Images**: a TeXercises export has no gallery images. The Sheets tab lists the images of a sheet's
  exercises, which are there and which not. The missing ones are fetched from TeXercises by
  themselves, in the background, as soon as the list is shown (`texercises.com/gallery/image/file/<name>/`;
  TeXercises asks for no login from Switzerland, Germany, Austria and Liechtenstein, so no TeXercises
  password is kept on the server). If TeXercises refuses one, the panel says why and asks again after
  10 minutes; after three refusals it stops, and the exercise is marked **image refused** (kept in
  `hub-data/sheet-images/.fetch-failed.json`, forgotten once the image is there). **Fetch from
  TeXercises** still asks at once. Or the teacher
  downloads them there and uploads them: one at its line (any file name), or several, or a .zip, named
  as in the gallery (any extension). Each is kept under a name made of its exercise's title and id
  (`magnetfeld-einer-spule-1234.png`; `-2`, `-3` for an exercise's further images; `image_stem`), with
  `index.json` saying which gallery image it is, in `hub-data/sheet-images/`. They show in
  the preview, the online version and the PDF. LaTeX cannot read SVG: an SVG image gets a PDF copy
  where `rsvg-convert` is installed, else it is missing in the PDF only (the panel says so).
- **Download PDF** and **PDF with solutions**: made of the saved sheet with `build_sheet.py` and
  LuaLaTeX, in the background the first time (the page reloads itself until the PDF is there), then
  cached in `hub-data/sheets/` by a hash of everything it is made of.
- **Online version**: a secret link (`learningphysics.ch/admin/sheet/s/<secret>`) for the students: the
  exercises without solutions, in the look of the PDF (Erewhon, Fira Sans, the accent colour; the fonts
  come from the server's TeX Live), one exercise per screen: the arrows, the numbers at the top, the
  arrow keys and swiping move between them, and the address (`#a3`) keeps the place. Printed, it shows
  all of them. It needs no login. **New link** replaces the secret (the old link stops working),
  **Stop sharing** removes it.

## Exercise review (Sheets tab, the superuser's)

The report of a review of all TeXercises exercises, made elsewhere (by Claude) and uploaded or replaced
here as JSON (`/admin/api/exercise-audit`, `normalize_audit` in `../hubadmin.py`), kept in
`hub-data/exercise-audit.json`: never in this public repository.

- The exercises reviewed, those with issues and the issues by severity (error, warning, doubt), then
  the exercises with issues, the most serious first, each issue with its category, where it is (text,
  solution, short solution, solver, title) and a suggested fix; the titles link to the exercises on
  TeXercises. Filtered by severity, category, collection (the titles of the collections an exercise is
  in, the report's `"collections"`, if it has them; also "No collection"), area or topic (of
  `categories.json`, by the exercise's id; also "Not categorised"), marked or not (below) and a
  search.
- **Feedback**: per issue **Accept fix**, per exercise a comment (saved as it is typed), in
  `hub-data/exercise-audit-feedback.json` (`/admin/api/exercise-audit/feedback`). It is kept by the
  exercise's id and a fingerprint of the issue (its severity, where it is and its text), so a
  regenerated report keeps it for the issues found again; feedback on issues or exercises no longer in
  the report is kept, but not shown or exported.
- **Export for Claude** (`/admin/api/exercise-audit/export`) downloads
  `exercise-review-feedback-YYYY-MM-DD.json`: the report's date and source, and every exercise with an
  accepted fix or a comment (id, key, title, language, address, collections), its accepted issues, the
  others (`not_accepted`) and the comment, for Claude to work on.

## New exercises (Sheets tab, the superuser's)

`categories.json` is Claude's reading of the export of 2026-10-15. An exercise uploaded since (a
TeXercises id it does not know) is categorised by the admin service itself (`autocat.py`, `Categoriser`
in `../hubadmin.py`), kept in `hub-data/categories-extra.json`: per exercise id the same fields as
`categories.json` (sub, sub2, kind, kinds, parts, steps, laws, math, repr, context, flag) and
`source` (`provisional`, `claude` or `teacher`), `model` (Claude's), `at` (when). `load_categories`
merges it over `categories.json` (it wins), so sheets, step 1's counts, similarity and the review's
topic filter use it at once.

1. **Provisional**, at once after each upload (in the background) and without network: the labels of
   the most similar exercise already categorised (TF-IDF cosine of their words: title weighted 3,
   TeXercises tags and topics 2, text and short solution 1; LaTeX commands left out). Tried on 300
   exercises of the export against the others: the same subtopic for 74 %, the same topic for 92 %.
2. **Claude**, then, in one background thread (never in a request), if the server has the `anthropic`
   package and `ANTHROPIC_API_KEY`: batches of 10 exercises (as for `categories.json`: title, tags,
   the first 1100 characters of the text, 700 of the solution, the short solution) to `claude-opus-5-5`
   (effort low, server-side fallback, JSON output of a fixed schema, the instructions and the subtopic
   list cached). Every record is checked (a subtopic of the tree, the known task kinds, mathematics,
   representations and contexts, an id of the batch); one that fails, a refusal or an answer that is no
   JSON leaves the exercise provisional, marked failed; an answer cut off by its length is asked again
   with half the batch. A rate limit, an overloaded or unreachable API: it waits (30 s, 2 min, 10 min),
   then stops; a key not accepted or a request refused: it stops and says why. Estimated from the
   prompt's size (13,400 characters of instructions and subtopics, 11,800 per batch of exercises):
   about 8,000 input tokens per batch, 4,000 of them the cached instructions, and 1,000 to 3,000 output
   tokens: some US$ 0.20 to 0.40 per 50 exercises at US$ 4/M input, 20/M output, 0.20/M cache reads.
3. **The teacher**: the **New exercises** section (folded, above the review) lists them, failed ones first,
   then the newest: title, who labelled it (provisional, Claude, you), the subtopic (grouped by area and
   topic) and task kind to change, and **Confirm**: kept as the teacher's, never overwritten. Its line
   says how many and by whom, the tokens used, or what is missing ("API key missing: add
   ANTHROPIC_API_KEY to /etc/hub-admin/anthropic.env and restart"). **Categorise now** labels those not
   yet labelled and asks Claude again for the provisional and failed ones.
   (`/admin/api/categories-extra`, `…/run`, `…/label`.)

On the server, once (optional; without it new exercises stay provisional):

    sudo apt install -y python3-pip                            # if pip3 is missing
    sudo pip3 install --break-system-packages --target /opt/hub-admin-pylib anthropic
    sudo install -d -m 755 /etc/hub-admin
    sudo install -m 600 -o root -g root /dev/null /etc/hub-admin/anthropic.env
    sudoedit /etc/hub-admin/anthropic.env                      # ANTHROPIC_API_KEY=<the key>
                                                               # PYTHONPATH=/opt/hub-admin-pylib
    sudo cp hub-admin/hub-admin.service /etc/systemd/system/   # (it reads that file: EnvironmentFile)
    sudo systemctl daemon-reload && sudo systemctl restart hub-admin

The service must reach `https://api.anthropic.com` (nothing to change unless outbound traffic is
restricted). The key never goes into this repository or `hub-data/`. The package goes into its own
folder (`--target`) because a plain `pip3 install` on Debian fails trying to replace Debian's own
`typing_extensions`; `PYTHONPATH` in the env file lets only hub-admin see that folder.

The TeXercises review page that was at learningphysics.ch/texercises/ is gone: nginx sends its old
addresses to the admin panel. What it kept on the server (`hub-data/texercises-review/`) is no longer
used and can be deleted.

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
- `sheets.py` (used by `../hubadmin.py`) reads what a sheet needs of the exercises (`exercise_meta`:
  language, type, difficulty, topics, image; kept while the files are unchanged), suggests the exercises
  and their alternatives and runs
  `build_sheet.py` (the exercises as a LaTeX document, a section per module) and LuaLaTeX with
  `texercises-lp.sty` (the TeXercises macros) and `lp-minion.sty` in its modern look (Erewhon, Fira Sans:
  free fonts). `preview.py` makes the HTML of the preview and the online version.
  Both follow TeXercises in an `abclist`: `\setcounter{abc}{N}` makes the next item the N-th letter (so a list
  continued after a table starts with `\setcounter{abc}{3}` for c)).
- The exercises: the export uploaded in the admin panel (kept in `hub-data/texercises/`, only the teacher's
  own: `OWN_CREATOR` in hubadmin.py), and the drafts that `deploy.sh` copies to `hub-admin/sheets/drafts/`.
  Neither is served by nginx. Exercise texts and solutions never go into this public repository: `pool.json`
  holds only keys, titles and objectives.
- Images are not in a TeXercises export: uploaded or fetched (above), else a sheet shows a framed
  placeholder that links to the exercise.

## On the server (once, with sudo)

1. LaTeX (about 1.5 GB):

       sudo apt install --no-install-recommends texlive-luatex texlive-latex-recommended texlive-latex-extra \
         texlive-science texlive-pictures texlive-fonts-recommended texlive-fonts-extra texlive-lang-german \
         texlive-plain-generic texlive-games lmodern

   For the figures in the browser and SVG images in the PDF (small):

       sudo apt install --no-install-recommends poppler-utils librsvg2-bin

2. nginx: the site in `deploy/nginx/learningphysics.conf` has two locations for the sheets (the upload, up to
   64 MB, and `/admin/sheet/`: the PDFs, the online versions, their figures and images). Install it as
   described in the top-level README. (Images are uploaded through the export's location, so they too
   may be up to 64 MB.)
3. Deploy (a push to main), then test as the service's user; the first run fills the font cache (a minute):

       sudo -u hubadmin python3 /var/www/teachingphysics/hub-admin/sheets/sheets.py /var/www/teachingphysics/hub-data

4. In the admin panel (Sheets), upload a TeXercises export (TeXercises: Settings → Export,
   the .zip). Upload it again whenever exercises change.

Without LaTeX the admin panel says so; everything else (suggestions, preview, online version) works,
with placeholders for the figures. The panel's first line says whether LaTeX is there and whether
figures are drawn for the browser.
The sheets made per set before the Sheets tab (`hub-data/sheets.json`, `hub-data/sheets/made/`) are no
longer used and can be deleted.
