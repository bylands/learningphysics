# Learning Physics

The physics apps of [learningphysics.ch](https://learningphysics.ch): static pages without a build step, one folder per app. Shared files live in `shared/` and are copied into the apps by `shared/sync.sh`.

## A new app

Besides its folder, a new app needs its card on the hub page (`hub/index.html`), its name in `deploy.sh` (`APPS`) and in `shared/sync.sh`, and its learning objectives on the hub page: run `node hub/build-objectives.js`, which reads them from the apps (each app's `const OBJECTIVES = [...]` and its check source) into `hub/objectives.json`. The card can suggest starter tags, English|German, e.g. `data-tags="Quantum physics|Quantenphysik; Light|Licht"`: the hub page and the admin panel show them as long as the app is new to the admin panel (not in `apps.json`'s order). A tag with the same English name as an existing one is that tag. The first Save in the admin panel keeps them, and from then on the app's tags are edited there only.

## Exercise sheets

Every set gets an exercise sheet as a PDF from the teacher's TeXercises exercises (a link on the set's page; the version with solutions only for the logged-in teacher). The admin panel's service makes it with LaTeX on the server; see `hub-admin/sheets/README.md` (setup, and `pool.json`, which says which exercises practise which learning objective).

## Tests and deployment

- `node <app>/test/check-generator.js` tests one app. `shared/sync.sh --check` checks that the copies match `shared/`, and `node hub/build-objectives.js --check` that `hub/objectives.json` matches the apps' objectives (run it without `--check` after changing an objective).
- Every push to `main` runs all the tests on GitHub. If they pass, `deploy.sh` copies the apps to the web root `/var/www/teachingphysics/` on the server (the folder kept its old name), and with them the admin panel's program (`hub-admin/hubadmin.py`), whose service restarts by itself when it changes (see `hub-admin/hub-admin.service`). `./deploy.sh --dry-run` lists what would change.

## Server (nginx)

The nginx site is kept in `deploy/nginx/`:

- `learningphysics.conf`: the site. It serves every folder in the web root, so a new app needs no change here. It proxies the services (live quiz, crosswords, millionaire, admin panel), and redirects www.learningphysics.ch and the old domain teachingphysics.ch.
  Any other address that looks like a name (learningphysics.ch/3a-elektro) gets the hub page, which shows the teacher's set of that name (made in the admin panel, saved as `hub-data/sets.json`, served as `/sets.json`).
- `gzip.conf`: compression of CSS, JS, JSON and SVG for all sites.

To install a change (on the server, with sudo):

```sh
sudo cp learningphysics.conf /etc/nginx/sites-available/learningphysics
sudo cp gzip.conf /etc/nginx/conf.d/gzip.conf
sudo nginx -t && sudo systemctl reload nginx
```

The certificates come from Let's Encrypt (certbot) and renew by themselves: one for learningphysics.ch and www.learningphysics.ch, one for teachingphysics.ch, which only redirects.
