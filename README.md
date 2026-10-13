# Learning Physics

The physics apps of [learningphysics.ch](https://learningphysics.ch): static pages without a build step, one folder per app. Shared files live in `shared/` and are copied into the apps by `shared/sync.sh`.

## A new app

Besides its folder, a new app needs its card on the hub page (`hub/index.html`), its name in `deploy.sh` (`APPS`) and in `shared/sync.sh`, and its learning objectives on the hub page: run `node hub/build-objectives.js`, which reads them from the apps (each app's `const OBJECTIVES = [...]` and its check source) into `hub/objectives.json`. The card can suggest starter tags, English|German, e.g. `data-tags="Quantum physics|Quantenphysik; Light|Licht"`: the hub page and the admin panel show them as long as the app is new to the admin panel (not in `apps.json`'s order). A tag with the same English name as an existing one is that tag. The first Save in the admin panel keeps them, and from then on the app's tags are edited there only.

## Exercise sheets

The admin panel's Sheets tab makes exercise sheets from the teacher's TeXercises exercises: choose modules and learning objectives, let it suggest a balanced sheet, replace exercises by suggested alternatives, preview them (KaTeX), then download the PDF (with or without solutions, made with LaTeX on the server) or share an online version at a secret link that needs no login and shows no solutions. See `hub-admin/sheets/README.md` (setup, and `pool.json`, which says which exercises practise which learning objective).

## Teachers

The admin panel (`/admin/`) has an account per teacher, each with a user name to log in with and a three-letter identifier. There is no shared teacher password: everyone logs in with their own account. The superuser (`samuel.byland`, identifier `bys`) creates the accounts in the Teachers tab; a new account's password is shown once. Under Account, every teacher, the superuser too, changes their own user name, names, school and password. Every teacher makes their own sets, opened at learningphysics.ch/*identifier*/*name*; the superuser's are also at learningphysics.ch/*name*, as before. The order and tags of the apps and the exercise sheets are the superuser's only. An account holds the teacher's first and last name and school.

Each set has a switch *Names in* that shows the names of its apps, learning objectives and topics in English or German (at first the set's language; remembered in the browser, not saved with the set). An exercise sheet shows them in the sheet's language.

The admin panel's login also works in the crossword generator (`/crosswords/`, its own repository) and on the quiz's teacher screen (`/electric-circuits/host`, the quizzes repository, where every teacher gets a game of their own): its session cookie is for the whole site, and the generator asks the admin panel (`/admin/api/me`) whose it is. There, a teacher can give a crossword a short link, learningphysics.ch/*identifier*/*name*: the hub page serves that address and, finding no set of that name, opens the crossword. A set and a crossword of a teacher can't share a name.

## Tests and deployment

- `node <app>/test/check-generator.js` tests one app. `shared/sync.sh --check` checks that the copies match `shared/`, and `node hub/build-objectives.js --check` that `hub/objectives.json` matches the apps' objectives (run it without `--check` after changing an objective).
- Every push to `main` runs all the tests on GitHub. If they pass, `deploy.sh` copies the apps to the web root `/var/www/teachingphysics/` on the server (the folder kept its old name), and with them the admin panel's program (`hub-admin/hubadmin.py`), whose service restarts by itself when it changes (see `hub-admin/hub-admin.service`). `./deploy.sh --dry-run` lists what would change.

## Server (nginx)

The nginx site is kept in `deploy/nginx/`:

- `learningphysics.conf`: the site. It serves every folder in the web root, so a new app needs no change here. It proxies the services (live quiz, crosswords, millionaire, admin panel), and redirects www.learningphysics.ch and the old domain teachingphysics.ch.
  Any other address that looks like a name, with a teacher's three-letter identifier before it or not (learningphysics.ch/abc/3a-elektro, or learningphysics.ch/3a-elektro: the superuser's), gets the hub page, which shows the teacher's set of that name (made in the admin panel, saved as `hub-data/sets.json`, served as `/sets.json`).
- `gzip.conf`: compression of CSS, JS, JSON and SVG for all sites.

To install a change (on the server, with sudo):

```sh
sudo cp learningphysics.conf /etc/nginx/sites-available/learningphysics
sudo cp gzip.conf /etc/nginx/conf.d/gzip.conf
sudo nginx -t && sudo systemctl reload nginx
```

The certificates come from Let's Encrypt (certbot) and renew by themselves: one for learningphysics.ch and www.learningphysics.ch, one for teachingphysics.ch, which only redirects.
