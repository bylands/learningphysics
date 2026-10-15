#!/bin/bash
# Deploys learningphysics.ch: every app, the privacy page, KaTeX, the hub page (index.html,
# lang.js, objectives.json and the site's icons at the web root) and the admin panel's program (hub-admin/hubadmin.py, which nginx does
# not serve; the service restarts by itself when it changes), with rsync. Only changed files are sent (by checksum) and nothing on
# the server is deleted; the admin panel's data (hub-data/) is never touched.
#   ./deploy.sh            deploy
#   ./deploy.sh --dry-run  only list what would change
# DEPLOY_TARGET is where the web root is (default: the SSH host infomaniak_vps). The GitHub
# Action (.github/workflows/deploy.yml) deploys as the user tpdeploy, whose key may only run
# rsync into the web root (rrsync), so its target is relative to it: tpdeploy@host:
# Not deployed here (both need sudo): the admin panel's systemd units (see
# hub-admin/hub-admin.service) and the nginx site (deploy/nginx/, see README.md). A new app needs neither: nginx serves every folder in
# the web root.
set -euo pipefail
cd "$(dirname "$0")"
TARGET="${DEPLOY_TARGET:-infomaniak_vps:/var/www/teachingphysics/}"
DRY=""
[ "${1:-}" = "--dry-run" ] && DRY="--dry-run"

# local folder:path on the server (the energy app is served at /coe)
APPS="bulb-brightness circuit-trainer potential-circuit capacitors force-concepts force-systems impedance induction-match motion-graphs motion-data motion-areas rl-switch torque centre-of-mass interaction coulomb oscillations cyclic-processes wave-propagation interference magnetic-forces charged-particles electric-field electric-potential em-waves photons matter-waves energy-conservation:coe all-in privacy katex"

shared/sync.sh --check >/dev/null || { echo "Shared files differ: run shared/sync.sh first." >&2; exit 1; }
node hub/build-objectives.js --check >/dev/null || { echo "The hub's learning objectives differ from the apps: run node hub/build-objectives.js first." >&2; exit 1; }

# -c: compare by checksum; no times, owners or groups are set (the folders' setgid bit gives new
# files the group tpweb). Files are 664 and folders 2775, so that the deploy user and the admin can
# both update them: GNU rsync sets that itself; macOS's openrsync lacks --chmod, so after it the
# files just sent are fixed over ssh (else the GitHub deploy could not update them).
RSYNC=(rsync -rlc --omit-dir-times --exclude test/ --exclude .DS_Store --out-format="%n" $DRY)
OPENRSYNC=""
if rsync --version 2>/dev/null | grep -q openrsync; then
  OPENRSYNC=1
else
  RSYNC+=(--perms --chmod=D2775,F664)
fi

# one rsync per folder; stops at the first error
send() {
  local out
  if ! out=$("${RSYNC[@]}" "$@" 2>&1); then
    echo "$out" >&2
    echo "rsync failed: $*" >&2
    exit 1
  fi
  printf '%s\n' "$out" | grep -v '/$' | grep -v '^$' || true
}
for a in $APPS; do
  src=${a%%:*} dst=${a##*:}
  send "$src/" "$TARGET$dst/" | sed "s|^|$dst/|"
done
send hub/index.html hub/lang.js hub/objectives.json hub/favicon.ico hub/favicon.svg hub/apple-touch-icon.png "$TARGET"
send --include=hubadmin.py --exclude='*' hub-admin/ "${TARGET}hub-admin/" | sed "s|^|hub-admin/|"
# the exercise sheets of the admin panel (hub-admin/sheets/README.md): the engine and the pool, and the
# drafts of this repository as exercises (the teacher's TeXercises exercises are uploaded in the panel)
send --include='*.py' --include='*.sty' --include=pool.json --exclude='*' hub-admin/sheets/ "${TARGET}hub-admin/sheets/" | sed "s|^|hub-admin/sheets/|"
for d in texercises-drafts texercises-drafts-2; do
  # (rsync creates only the last folder of a target: drafts/, then exercises/ in it)
  send "$d/exercises" "${TARGET}hub-admin/sheets/drafts/" | sed "s|^|hub-admin/sheets/drafts/|"
done
if [ -n "$OPENRSYNC" ] && [ -z "$DRY" ] && [[ "$TARGET" == *:/* ]]; then
  ssh "${TARGET%%:*}" "cd '${TARGET#*:}' && find . -path ./hub-data -prune -o -user \$(id -un) \( -type f ! -perm 664 -exec chmod 664 {} + -o -type d ! -perm 2775 -exec chmod 2775 {} + \)"
fi
echo "${DRY:+(dry run) }deployed to $TARGET"
