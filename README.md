# Learning Physics

The physics apps of [learningphysics.ch](https://learningphysics.ch): static pages without a build step, one folder per app. Shared files live in `shared/` and are copied into the apps by `shared/sync.sh`.

## A new app

Besides its folder, a new app needs its card on the hub page (`hub/index.html`), its name in `deploy.sh` (`APPS`) and in `shared/sync.sh`, and its learning objectives on the hub page: run `node hub/build-objectives.js`, which reads them from the apps (each app's `const OBJECTIVES = [...]` and its check source) into `hub/objectives.json`. The card can suggest starter tags, English|German, e.g. `data-tags="Quantum physics|Quantenphysik; Light|Licht"`: the hub page and the admin panel show them as long as the app is new to the admin panel (not in `apps.json`'s order). A tag with the same English name as an existing one is that tag. The first Save in the admin panel keeps them, and from then on the app's tags are edited there only.

## All In

`all-in/` is a team game for the projector, *All In: the Physics Casino* (learningphysics.ch/all-in/, linked in the admin panel's Games tab): every round shows a short animation of a phenomenon (`all-in/anim.js`), all teams bet chips at once on its outcome, an estimate or a calculation, the reveal plays out what happens, and a die picks who explains the result. The students bet on their phones at `/all-in/play/` (they join with the QR code on the projector, no login), or the teacher types in bet cards. For phones, the teacher's screen opens a room in the admin panel's service (`/admin/api/all-in/`, `AllInRooms` in `hub-admin/hubadmin.py`, in memory only), so it needs the teacher's login; it sends the room what the phones show and reads their bets back. It is no app with tutor and check, so it has no card on the hub page and no objectives; it gets `lang.js` from `shared/sync.sh` (as a page) and is deployed like an app. It has the look of the millionaire game (`all-in/style.css`: night blue, gold, the question and answers in lozenges). The teacher picks a topic, each a ready game of six rounds (`TOPICS` in `all-in/rounds.js`: a bit of everything, mechanics, electricity and magnetism, waves, modern physics), or ticks rounds of their own. The rules are in `all-in/game.js`, the rounds in `all-in/rounds.js`; `node all-in/test/check-game.js` tests both, and `hub-admin/test_hubadmin.py` the rooms. The QR codes are drawn by `all-in/vendor/qrcode.min.js` (qrcode-generator, MIT).

## Absolute Zero

`absolute-zero/` is a quiz for the whole class in the style of *Pointless*, *Absolute Zero* (learningphysics.ch/absolute-zero/, linked in the admin panel's Games tab): every student types one answer to an open question ("A unit of energy") on their phone at `/absolute-zero/play/`, and scores the share of the class who gave the same answer, so an answer nobody else gave scores 0 and a wrong one 100; the lowest total wins. The reveal counts each answer down a thermometer, the most common first, and lists the rare answers nobody gave. The 60 questions (12 in each of five topics, in English and German) are in `absolute-zero/questions.js`, each with every answer it accepts; the matching (accents, articles, case for symbols such as m and M, small typos) and the scores are in `absolute-zero/game.js`, and the teacher judges answers not on the list. Like All In, the teacher's screen runs the game in the browser and opens a room in the admin panel's service (`/admin/api/absolute-zero/`, `ZeroRooms` in `hub-admin/hubadmin.py`), so it needs the teacher's login; it shares All In's look and gets `lang.js` from `shared/sync.sh`. `node absolute-zero/test/check-game.js` checks every question (each listed spelling must find its own answer) and the rules.

## Game previews

A logged-in teacher can try All In and Absolute Zero alone, with *Try it alone* in the admin panel's Games tab (learningphysics.ch/all-in/?preview, /absolute-zero/?preview): the teacher's screen runs as usual beside a phone (an iframe of the play page, or a second tab) on which the teacher plays one team or student, and the others are simulated players marked 🤖. The bots (`all-in/bots.js`, `absolute-zero/bots.js`) are driven from the teacher's screen through the same calls the phones make, with plausible answers and timing: in All In two or three join each team and bet for the teams without the teacher; in Absolute Zero twelve answer as a class might (mostly common answers, now and then a rare one, a typo or one for the teacher to judge). A preview opens a room of its own (`preview` in the rooms' `open`), so a game in class stays open, and keeps its game under its own key in the browser. The banner and the phone are `shared/preview.js` and `shared/preview.css`, copied into both games by `shared/sync.sh`.

## Exercise sheets

The admin panel's Sheets tab makes exercise sheets from the teacher's TeXercises exercises: choose modules and learning objectives, let it suggest a balanced sheet, replace exercises by suggested alternatives, preview them (KaTeX), then download the PDF (with or without solutions, made with LaTeX on the server) or share an online version at a secret link that needs no login and shows no solutions. See `hub-admin/sheets/README.md` (setup, and `pool.json`, which says which exercises practise which learning objective).

The TeXercises review (learningphysics.ch/texercises/, logged in) previews a TeXercises export or a bundle to import: its collections and exercises with their solutions, an exercise's standard difficulty to change (then downloaded as a bundle for TeXercises' import), and feedback on an exercise from any teacher, downloadable as Markdown; the exercises can be filtered by topic (their TeXercises subbranches). See `hub-admin/sheets/README.md`.

The exercise review in the Sheets tab: a report of a review of all TeXercises exercises (made elsewhere, JSON) is shown in the admin panel's Sheets tab, the superuser's only, after the topics of the pool: how many exercises were reviewed and have issues, by severity (error, warning, doubt), the exercises with issues, the most serious first, each issue with its category, where it is and a suggested fix, filtered by severity, category and a search (`/admin/api/exercise-audit`, the superuser only). The superuser uploads or replaces the report there; the admin service keeps it in `hub-data/exercise-audit.json` (not served). The repository is public: the report never goes into it.

## Teachers

The admin panel (`/admin/`) has an account per teacher, each with a user name to log in with and a three-letter identifier. There is no shared teacher password: everyone logs in with their own account. The superuser (`samuel.byland`, identifier `bys`) creates the accounts in the Teachers tab; a new account's password is shown once. Under Account, every teacher, the superuser too, changes their own user name, names, school and password. Every teacher makes their own sets, opened at learningphysics.ch/*identifier*/*name*; the superuser's are also at learningphysics.ch/*name*, as before. The order and tags of the apps and the exercise sheets are the superuser's only. An account holds the teacher's first and last name and school.

Each set has a switch *Names in* that shows the names of its apps, learning objectives and topics in English or German (at first the set's language; remembered in the browser, not saved with the set). An exercise sheet shows them in the sheet's language.

The admin panel's login also works in the crossword generator (`/crosswords/`, its own repository) and on the quiz's teacher screen (`/electric-circuits/host`, the quizzes repository, where every teacher gets a game of their own): its session cookie is for the whole site, and the generator asks the admin panel (`/admin/api/me`) whose it is. There, a teacher can give a crossword a short link, learningphysics.ch/*identifier*/*name*: the hub page serves that address and, finding no set of that name, opens the crossword. A set and a crossword of a teacher can't share a name.

## Interactive widgets

Besides the shared files that every app gets, `shared/` holds widgets for interactive exercises. `shared/sync.sh` copies a widget only into the apps whose `index.html` loads it (its `WIDGETS` list); each file's header documents its use.

- `dnd.js`, `dnd.css`: dragging cards into boxes, to rank them (ties allowed) or to match them (force-concepts, interaction, em-waves).
- `reader.js`, `reader.css`: reading values off a graph: a free point, a point on the curve, the tangent, pinned points. Most graphs need only `data-read…` attributes on their `<svg>` (photons, capacitors, impedance).
- `arrow.js`, `arrow.css`: vector arrows placed on a figure and turned: dragged from a palette onto a body, their tips dragged to a direction from a given set (and a length), optionally ⊙ ⊗ (by the keys, a tap on the tail, or the palette's buttons “⊙ out of the page” / “⊗ into the page”, easy to hit on a phone); with a pure judge of the drawing against the right arrows (Free-Body Diagrams; Magnetic Forces, where practice draws the force, or the missing field or velocity, at the charge or wire, the check keeping its four options; Point Charges, where practice and the worked examples draw the force on a charge from each of the others and then the net force, the check keeping its four options).
- `sketch.js`, `sketch.css`: sketching a graph, as straight pieces between breakpoints (optionally bent into parabolas) or as one value per column (motion-graphs, motion-areas, wave-propagation, induction-match).
- `play.js`, `play.css`: “predict, then watch”: a scene that changes when the student flips a switch in the figure (a switch closed or opened, a bulb unscrewed), played with ▶/❚❚ and a time slider; the switch stays locked until the student's prediction is checked and solved, or the solution shown, and the app marks the prediction against what happens. With reduced motion, the switch and ▶ jump to the end state and the slider steps through the time; with the option instant there is no animation and no ▶/slider, and the switch simply toggles between before and after (Bulb Brightness, instant, where practice and the worked example “Changes” predict how each bulb's brightness changes, the check keeping its four options; Switching RL Circuits, where every current runs from before switching through t = 0⁺ to long after, on a small I(t) graph, once the exercise is solved and in the last frame of each worked example; Capacitors and RC Circuits, where the switch S closes and the capacitor charges or discharges: U_C, U_R and I run on a small graph against time, with the exercise's numbers and τ, and the student's answers are rings marked ✓ or ✗ (practice of the time curves, the loop rule, the half-life, τ and R or C changed, and the last frame of the worked examples on discharging, charging and the time constant); Oscillations, where the switch is the body on its spring (let go from the turning point, or pushed at the equilibrium), the turning pointer or a body on a track moving by an equation: y (and v and a) run on a small graph against time, with numbers in slow motion or time lapse (the note says how much), and the student's answers are rings marked ✓ or ✗ (practice of the pointer, equation and graph, the points on y(t) and the kinematics, and the last frame of the worked examples on the pointer, equation and graph, and fastest and strongest)).

All of them work with mouse, pen, touch and keyboard. Interactive exercises are for practice and the worked examples only: Check mode (`shared/check.js`) asks four-option questions, so every learning objective practised interactively also needs a question kind for the check, usually the same task with a static figure and four answers.

## Tests and deployment

- `node <app>/test/check-generator.js` tests one app. `shared/sync.sh --check` checks that the copies match `shared/`, and `node hub/build-objectives.js --check` that `hub/objectives.json` matches the apps' objectives (run it without `--check` after changing an objective).
- Every push to `main` runs all the tests on GitHub. If they pass, `deploy.sh` copies the apps to the web root `/var/www/teachingphysics/` on the server (the folder kept its old name), and with them the admin panel's program (`hub-admin/hubadmin.py`), whose service restarts by itself when it changes (see `hub-admin/hub-admin.service`). `./deploy.sh --dry-run` lists what would change.

## Server (nginx)

The nginx site is kept in `deploy/nginx/`:

- `learningphysics.conf`: the site. It serves every folder in the web root, so a new app needs no change here. It proxies the services (live quiz, crosswords, Who Wants to Be a Physicist? at /wwtbap/ with a redirect from its old /millionaire/, admin panel and its TeXercises review at /texercises/), and redirects www.learningphysics.ch and the old domain teachingphysics.ch.
  Any other address that looks like a name, with a teacher's three-letter identifier before it or not (learningphysics.ch/abc/3a-elektro, or learningphysics.ch/3a-elektro: the superuser's), gets the hub page, which shows the teacher's set of that name (made in the admin panel, saved as `hub-data/sets.json`, served as `/sets.json`).
- `gzip.conf`: compression of CSS, JS, JSON and SVG for all sites.

To install a change (on the server, with sudo):

```sh
sudo cp learningphysics.conf /etc/nginx/sites-available/learningphysics
sudo cp gzip.conf /etc/nginx/conf.d/gzip.conf
sudo nginx -t && sudo systemctl reload nginx
```

The certificates come from Let's Encrypt (certbot) and renew by themselves: one for learningphysics.ch and www.learningphysics.ch, one for teachingphysics.ch, which only redirects.
