#!/bin/bash
# Copies the shared files (ui.css, lang.js, fit.js, sign.js, tutor.js, check.js, practice.js, topics.js, identify.js, artkit.js, figkit.js, sets.js) into every app, so that
# each app stays a folder of its own for deployment; pages that are no app (the privacy page, the game All In and the
# hub, whose lang.js is served as /lang.js) get lang.js only. The interactive widgets (WIDGETS) go
# only into the apps whose index.html loads them (<script … src="name">, or a stylesheet link).
# Edit the files here, never an app's copy.
#   shared/sync.sh          copy
#   shared/sync.sh --check  only report copies that differ (exit 1 if any)
# KaTeX is not copied: the apps share one copy, katex/ at the top of the repository, served as
# /katex/ (on the server /var/www/teachingphysics/katex/, deployed like an app). It is KaTeX 0.16.9
# (MIT, see katex/LICENSE) with the woff2 fonts only, so that no page loads anything from another
# server, and the browser caches it once for all apps.
set -e
cd "$(dirname "$0")/.."
APPS="energy-conservation charged-particles potential-circuit capacitors interference rl-switch force-systems bulb-brightness circuit-trainer impedance induction-match motion-graphs force-concepts torque motion-data motion-areas interaction centre-of-mass coulomb oscillations cyclic-processes wave-propagation magnetic-forces electric-field electric-potential em-waves photons matter-waves"
FILES="ui.css lang.js fit.js sign.js tutor.js check.js practice.js topics.js identify.js artkit.js figkit.js sets.js slips.js"
# each widget's header says what it does and which apps use it
WIDGETS="dnd.js dnd.css reader.js reader.css sketch.js sketch.css arrow.js arrow.css"
PAGES="privacy hub all-in"
status=0
copy() { # copy shared/$1 to $2/$1, or with --check report a difference
  if [ "$MODE" = "--check" ]; then
    if ! diff -rq "shared/$1" "$2/$1" >/dev/null 2>&1; then echo "differs: $2/$1"; status=1; fi
  elif [ -d "shared/$1" ]; then
    rm -rf "$2/$1"; cp -R "shared/$1" "$2/$1"
  else
    cp "shared/$1" "$2/$1"
  fi
}
MODE="$1"
for app in $APPS; do
  for f in $FILES; do copy "$f" "$app"; done
  for f in $WIDGETS; do if grep -q "\(src\|href\)=\"$f\"" "$app/index.html"; then copy "$f" "$app"; fi; done
done
for page in $PAGES; do copy lang.js "$page"; done
[ "$MODE" = "--check" ] && [ $status = 0 ] && echo "all shared files in sync"
exit $status
