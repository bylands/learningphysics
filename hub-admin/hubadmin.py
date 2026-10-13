#!/usr/bin/env python3
"""Admin panel of the learningphysics.ch hub: tags (e.g. physics topics) and the order of the apps,
the teacher's sets of apps for a class, and exercise sheets.

The hub page (hub/index.html, served as /) shows a card per app; it reads /apps.json and puts the
cards in its order, shows their tags, and lets visitors filter by tag. This service, served at
/admin/ behind nginx, lets the teacher edit that file:

    /admin/              login page, or the panel once logged in
    /admin/login         POST password=...          sets the session cookie
    /admin/logout        POST                       ends the session
    /admin/api/config    GET  the apps of the hub page with their order and tags
                         POST {"order": [id, ...], "tags": {id: [key, ...]},
                               "labels": {key: {"en": name, "de": name}}}      saves apps.json
    /admin/api/sets      GET  the apps with their modes, and the sets
                         POST {"sets": {name: set}}                          saves sets.json
    /admin/api/sheets    GET  the exercise sheets, the state (LaTeX, exercises) and the modules to choose
    /admin/api/sheets/<id> GET  a sheet, with what the editor shows of its exercises
                         POST {"action": "save", "sheet": ...} | {"action": "delete" | "duplicate" |
                              "share" (a new secret link) | "unshare"}; /admin/api/sheets/new {"sheet": ...}
    /admin/api/plan      POST {"sheet": ..., "suggest": bool, "count": n}: a sheet's exercises (suggested
                         anew, if asked), their alternatives, each objective's exercises; nothing is saved
    /admin/api/preview   GET ?keys=a,b  the exercises as HTML (text and solution), for KaTeX
    /admin/api/texercises POST a TeXercises export (zip): its exercises by the teacher are kept for
                         the sheets (hub-data/texercises/), all others are left out; ?image=<file name>
                         &keys=a,b[&gallery=<name>]: an image of the TeXercises gallery that these
                         exercises use, or a .zip of them, kept under a name made of the exercise's
                         title and id (hub-data/sheet-images/)
    /admin/api/images    GET ?keys=a,b  the gallery images these exercises use, and which are there
                         POST {"name": ..., "keys": [...]} /admin/api/images/fetch: fetch one from TeXercises
    /admin/sheet/<id>.pdf, /admin/sheet/<id>-solutions.pdf   the saved sheet's PDF, made when first
                         asked for (a page that reloads itself until it is there)
    /admin/sheet/s/<secret>   a shared sheet's online version: its exercises, no solutions, one per
                         screen (and s/<secret>/img/<file>: its images)
    /admin/sheet/img/<file>   an uploaded image; /admin/sheet/fig/<hash>.svg  a drawn TikZ figure (public)
                         (all of these logged in only, except the online version: whoever has its link,
                         and the figures)
    /admin/static/fonts/<file>  the PDF's fonts (Erewhon, Fira Sans) from the server's TeX Live
    /admin/static/...    the panel's scripts and styles

Exercise sheets (Sheets; sheets/sheets.py, sheets/preview.py): a sheet is the teacher's own,
independent of the sets: a title, a language, modules (the hub's apps) and per module learning
objectives, and its exercises in order, all kept in hub-data/exercise-sheets.json (not served). The
panel suggests a balanced sheet from sheets/pool.json and alternatives for each exercise, and shows
the exercises with KaTeX; build_sheet.py and LuaLaTeX make the PDFs (they need LaTeX on the server,
see sheets/README.md; without it the panel says so), cached in hub-data/sheets/. TikZ figures are
drawn as SVG for the browser (sheets/figures.py, hub-data/sheet-figures/); the TeXercises gallery
images, which an export lacks, are uploaded or fetched (hub-data/sheet-images/).

A set is opened at learningphysics.ch/<name> (nginx serves the hub page for it, which then shows
only the set's apps; see hub/index.html and shared/sets.js, which applies the set in the apps):

    {"sets": {"3a-elektro": {"title": "Klasse 3a", "lang": "de", "apps": [
        {"id": "electric-field", "modes": ["tutor", "practice", "check"], "objectives": ["sketch", "read"]}]}}}

The language, if the set fixes it ("en" or "de"; without it, the students choose); the apps in
the order of the set's page; for each, its modes in the set (of those its hub card lists) and,
optionally, its learning objectives (their ids): the app then shows only their worked examples,
offers only their practice topics, and its check asks only them; without the list, all of them.
The admin panel reads the objectives from the app itself, loaded with ?outline=1 in a hidden
frame; this service knows their ids from objectives.json next to the hub page (written by
hub/build-objectives.js), if it is there. A name is a key like a tag's, and not that of an app, of
a file or folder in the web root, or of a service (RESERVED).

Sets saved before there were objectives list, instead, the worked examples of the tutor
("tutor": indices) and the stages of practice ("practice": their exercise types joined with +);
they are kept as they are, and the apps still apply them, until the teacher chooses objectives for
the app. Their modes "arcade" (a timed game, now the check) and "real" (problems, now practice)
become "check" and "practice".

The apps and their names come from the hub page itself (its <a class="app" href="/id/"> cards),
so a new app needs no change here. The password is the crossword app's teacher password: the
same salted PBKDF2 hash file (crosswords-web set-password), read on every use, so a new password
takes effect at once and ends every session. Standard library only.

    python3 hubadmin.py --port 8040 --password-file /opt/crosswords/teacher-password \
        --hub /var/www/teachingphysics/index.html --config /var/www/teachingphysics/hub-data/apps.json \
        --sets /var/www/teachingphysics/hub-data/sets.json

Deployment: deploy.sh sends this file to the web root (hub-admin/, not served), and the service
restarts when it changes; see hub-admin.service (systemd) and the nginx locations /admin/, /apps.json,
/sets.json and @set.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import sys
import tempfile
import threading
import time
from html import escape
from html.parser import HTMLParser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import parse_qs, quote, unquote

# the exercise sheets (sheets/ next to this file, sent by deploy.sh); the panel works without them.
# The service restarts only when this file changes, so sheets.py and preview.py are read again when
# they change.
sys.path.insert(0, str(Path(__file__).resolve().parent))
_MODULES: Dict[str, Dict[str, object]] = {}


def sheets_module(name: str = "sheets"):
    path = Path(__file__).resolve().parent / "sheets" / f"{name}.py"
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return None
    known = _MODULES.setdefault(name, {"mod": None, "mtime": None})
    if known["mtime"] != mtime:
        try:
            import importlib
            mod = importlib.import_module(f"sheets.{name}")
            known["mod"], known["mtime"] = (importlib.reload(mod) if known["mod"] else mod), mtime
        except Exception:  # broken or missing: no sheets
            known["mod"], known["mtime"] = None, mtime
    return known["mod"]

COOKIE = "hub_admin"
OWN_CREATOR = "by"  # the teacher's creator code on TeXercises: only their exercises go on sheets
SESSION_DAYS = 30
MAX_BODY = 256 * 1024
MAX_TAGS = 8  # per app
MAX_TAG_LEN = 32
MODES = ("tutor", "practice", "check")
OLD_MODES = {"arcade": "check", "real": "practice"}  # in sets saved before: what they are now
MAX_SETS, MAX_TITLE = 100, 80
MAX_EXAMPLES, MAX_STAGES, MAX_OBJECTIVES = 100, 300, 50  # per app in a set
# names a set cannot have, besides the apps and what is in the web root: the services and paths
# nginx serves itself, and some kept free
RESERVED = {"admin", "api", "apps", "crosswords", "electric-circuits", "hub", "hub-admin", "hub-data", "index", "katex",
            "lang", "millionaire", "objectives", "privacy", "set", "sets", "static", "www"}
MAX_UPLOAD = 64 * 1024 * 1024  # a TeXercises export
# exercise sheets: their ids, the secret of a shared one's online version (in its address), limits
SHEET_ID = re.compile(r"[0-9a-f]{12}")
SHEET_TOKEN = re.compile(r"[A-Za-z0-9_-]{32}")
MAX_SHEETS, MAX_MODULES, MAX_SHEET_EXERCISES = 200, 40, 40
FETCH_RETRY = 600  # s: a gallery image TeXercises did not give is asked for again after this
TEXERCISES = "https://texercises.com"
LOGIN_ATTEMPTS, LOGIN_WINDOW = 10, 15 * 60  # failed logins per address and window (s)


# ---------------------------------------------------------------------- passwords (as crosswords)
def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt, digest = stored.strip().split("$")
        if algo != "pbkdf2_sha256":
            return False
        test = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(test.hex(), digest)
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------- the hub's apps
class _Cards(HTMLParser):
    """The cards of the hub page: <a class="app" href="/id/"> … <h2>Name</h2> … </a>."""

    def __init__(self) -> None:
        super().__init__()
        self.apps: List[Dict[str, str]] = []
        self._in_card = False
        self._in_h2 = False

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        a = dict(attrs)
        if tag == "a" and "app" in (a.get("class") or "").split():
            m = re.fullmatch(r"/([a-z0-9-]+)/?", a.get("href") or "")
            if m:
                modes = [x for x in MODES if x in (a.get("data-modes") or "").split()]
                self.apps.append({"id": m.group(1), "name": m.group(1), "modes": modes, "tags": starter_tags(a.get("data-tags"))})
                self._in_card = True
        elif tag == "h2" and self._in_card:
            self._in_h2 = True
            self.apps[-1]["name"] = ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "h2":
            self._in_h2 = False
        elif tag == "a":
            self._in_card = False

    def handle_data(self, data: str) -> None:
        if self._in_h2:
            self.apps[-1]["name"] += data


def starter_tags(attr: Optional[str]) -> List[Dict[str, str]]:
    """The tags a new app's card suggests, data-tags="Light|Licht; Waves|Wellen" (English|German;
    without German, the English name): [{"en": ..., "de": ...}]."""
    out = []
    for part in (attr or "").split(";"):
        en, _, de = part.partition("|")
        en, de = clean_tag(en), clean_tag(de)
        if en:
            out.append({"en": en, "de": de or en})
    return out[:MAX_TAGS]


def hub_apps(hub_html: str) -> List[Dict[str, object]]:
    """[{id, name, modes, tags?}] of the hub page's cards, in their order on the page (modes: those
    of its data-modes, in the order of MODES; tags: the starter tags of its data-tags, if any)."""
    p = _Cards()
    p.feed(hub_html)
    return [{"id": a["id"], "name": a["name"].strip() or a["id"], "modes": a["modes"], **({"tags": a["tags"]} if a["tags"] else {})} for a in p.apps]


# ---------------------------------------------------------------------- the configuration
def clean_tag(tag: object) -> str:
    """A tag as stored: text without control characters, spaces collapsed, at most MAX_TAG_LEN."""
    if not isinstance(tag, str):
        return ""
    tag = re.sub(r"[\x00-\x1f\x7f<>]", "", tag)
    return re.sub(r"\s+", " ", tag).strip()[:MAX_TAG_LEN].strip()


KEY = re.compile(r"[a-z0-9][a-z0-9-]{0,39}")
FOLD = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "à": "a", "á": "a", "â": "a", "è": "e", "é": "e", "ê": "e", "ì": "i", "í": "i", "ò": "o", "ó": "o", "ù": "u", "ú": "u", "ç": "c", "ñ": "n"})


def slug(name: str) -> str:
    """A key for a tag from its name: mechanics, ac-circuits, kraefte."""
    s = re.sub(r"[^a-z0-9]+", "-", name.lower().translate(FOLD)).strip("-")[:40].strip("-")
    return s or "tag-" + hashlib.sha1(name.encode()).hexdigest()[:6]


def normalize(config: object, app_ids: List[str], starters: Optional[Dict[str, List[Dict[str, str]]]] = None) -> Dict[str, object]:
    """A valid configuration for the given apps: every app once in the order (those the config
    leaves out at the end, in the hub's order); for each app the keys of its tags, distinct and at
    most MAX_TAGS; and for each tag in use its names, {"en": ..., "de": ...} (German as English if
    missing). A tag given as plain text (no key) becomes a tag of that name in both languages; two
    tags with the same English name are one. Unknown apps, unused tags and anything malformed are
    dropped. starters: the starter tags of the apps ({id: [{"en", "de"}]}, from their cards), for an
    app without tags in the config: a tag of the same English name is that tag, else a new one; once
    the admin panel saves them, they are the app's own (an app whose tags are all removed gets its
    card's suggestion back)."""
    config = config if isinstance(config, dict) else {}
    order_in = config.get("order") if isinstance(config.get("order"), list) else []
    order = [a for i, a in enumerate(order_in) if a in app_ids and a not in order_in[:i]]
    order += [a for a in app_ids if a not in order]
    tags_in = config.get("tags") if isinstance(config.get("tags"), dict) else {}
    labels_in = config.get("labels") if isinstance(config.get("labels"), dict) else {}
    labels: Dict[str, Dict[str, str]] = {}
    by_name: Dict[str, str] = {}  # English name (folded) → key

    def tag(raw: object) -> Optional[str]:
        lab = labels_in.get(raw) if isinstance(raw, str) and KEY.fullmatch(raw) else None
        if isinstance(raw, dict):  # a starter tag: the saved tag of that English name, if there is one
            en = clean_tag(raw.get("en")).casefold()
            saved = next((k for k, v in labels_in.items() if KEY.fullmatch(k) and isinstance(v, dict) and clean_tag(v.get("en")).casefold() == en), None)
            lab, raw = (labels_in[saved], saved) if saved else (raw, slug(clean_tag(raw.get("en"))))
        if isinstance(lab, dict) and clean_tag(lab.get("en")):
            key, en = raw, clean_tag(lab.get("en"))
            de = clean_tag(lab.get("de")) or en
        elif isinstance(raw, str) and clean_tag(raw):  # plain text
            en = de = clean_tag(raw)
            key = slug(en)
        else:
            return None
        known = by_name.get(en.casefold())
        if known:
            return known
        while key in labels:  # another tag already has this key
            key = f"{key[:36]}-{len(labels)}"
        labels[key] = {"en": en, "de": de}
        by_name[en.casefold()] = key
        return key

    tags: Dict[str, List[str]] = {}
    for app in order:
        raw = tags_in.get(app) if isinstance(tags_in.get(app), list) else []
        if not raw and starters:
            raw = starters.get(app) or []
        keys: List[str] = []
        for t in raw:
            k = tag(t)
            if k and k not in keys:
                keys.append(k)
        if keys:
            tags[app] = keys[:MAX_TAGS]
    used = {k for ks in tags.values() for k in ks}
    return {"order": order, "tags": tags, "labels": {k: v for k, v in labels.items() if k in used}}


# a stage's key: its exercise types joined with + (types like force-dir, series:easy, pickinv-RL-series,
# gravity/rank-launch); only checked to be plain text of a sensible length
STAGE_KEY = re.compile(r"[A-Za-z0-9][^\x00-\x20\x7f<>\"'\\]{0,999}")


def set_name_problem(name: object, app_ids: List[str], taken=lambda name: False) -> Optional[str]:
    """Why a set cannot have this name, or None if it can."""
    if not isinstance(name, str) or not KEY.fullmatch(name):
        return f"“{name}” is not a valid name: lower-case letters, digits and hyphens, up to 40"
    if name in app_ids:
        return f"“{name}” is the name of an app"
    if name in RESERVED or taken(name):
        return f"“{name}” is taken by the site"
    return None


OBJECTIVE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,39}")


def normalize_set_app(raw: object, apps: Dict[str, Dict[str, object]]) -> Optional[Dict[str, object]]:
    """An app of a set, cleaned: its modes (of those the app has, in the order of MODES; the old
    arcade and problems become check and practice), and if given, its learning objectives (ids,
    each once, in the app's order where it is known, apps[id]["objectives"]: those the app does not
    have are dropped, and all of them, or none left, is no list: all). Without objectives, the
    worked examples (sorted indices; with the tutor only) and practice stages (keys, in their order;
    with practice only) of a set saved before stay; an empty list of those leaves the tutor or
    practice out. None if no mode is left."""
    if not isinstance(raw, dict) or raw.get("id") not in apps:
        return None
    app = apps[raw["id"]]
    want = raw.get("modes") if isinstance(raw.get("modes"), list) else []
    want = [OLD_MODES.get(m, m) if isinstance(m, str) else m for m in want]
    modes = [m for m in MODES if m in want and m in app["modes"]]
    objectives = raw.get("objectives")
    if isinstance(objectives, list):
        objectives = [k for i, k in enumerate(objectives) if isinstance(k, str) and OBJECTIVE.fullmatch(k) and k not in objectives[:i]][:MAX_OBJECTIVES]
        known = app.get("objectives")
        if isinstance(known, list) and known:
            objectives = [k for k in known if k in objectives]
            if len(objectives) == len(known):
                objectives = []
    if not modes:
        return None
    out: Dict[str, object] = {"id": raw["id"], "modes": modes}
    if isinstance(objectives, list) and objectives:
        out["objectives"] = objectives
        return out
    tutor, practice = raw.get("tutor"), raw.get("practice")
    if isinstance(tutor, list):
        tutor = sorted({i for i in tutor if isinstance(i, int) and not isinstance(i, bool) and 0 <= i < MAX_EXAMPLES})
        if not tutor and "tutor" in modes:
            modes.remove("tutor")
    if isinstance(practice, list):
        practice = [k for i, k in enumerate(practice) if isinstance(k, str) and STAGE_KEY.fullmatch(k) and k not in practice[:i]][:MAX_STAGES]
        if not practice and "practice" in modes:
            modes.remove("practice")
    if not modes:
        return None
    if isinstance(tutor, list) and tutor and "tutor" in modes:
        out["tutor"] = tutor
    if isinstance(practice, list) and practice and "practice" in modes:
        out["practice"] = practice
    return out


def normalize_sets(data: object, apps: List[Dict[str, object]], taken=lambda name: False, strict: bool = True) -> Dict[str, object]:
    """{"sets": {name: {"title": ..., "lang"?: ..., "apps": [...]}}} for the given apps: titles cleaned (at most
    MAX_TITLE), apps known and each once, at most MAX_SETS sets. A name that cannot be is an error
    (ValueError) if strict, else the set is dropped (on reading a file written before)."""
    by_id = {a["id"]: a for a in apps}
    sets_in = data.get("sets") if isinstance(data, dict) and isinstance(data.get("sets"), dict) else {}
    if strict and len(sets_in) > MAX_SETS:
        raise ValueError(f"at most {MAX_SETS} sets")
    out: Dict[str, object] = {}
    for name, raw in sets_in.items():
        problem = set_name_problem(name, list(by_id), taken)
        if problem:
            if strict:
                raise ValueError(problem)
            continue
        raw = raw if isinstance(raw, dict) else {}
        title = raw.get("title")
        title = re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f<>]", "", title)).strip()[:MAX_TITLE].strip() if isinstance(title, str) else ""
        chosen: List[Dict[str, object]] = []
        for a in raw.get("apps") if isinstance(raw.get("apps"), list) else []:
            entry = normalize_set_app(a, by_id)
            if entry and all(c["id"] != entry["id"] for c in chosen):
                chosen.append(entry)
        out[name] = {"title": title, "apps": chosen}
        if raw.get("lang") in ("en", "de"):
            out[name]["lang"] = raw["lang"]
        if len(out) >= MAX_SETS:
            break
    return {"sets": out}


def read_config(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def write_config(path: Path, config: Dict[str, object], mode: int = 0o644) -> None:
    """Atomically: a reader sees the old file or the new one, never half of it. mode 0o644: nginx
    serves it (/apps.json, /sets.json)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=1)
            f.write("\n")
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------- the service
class Admin:
    def __init__(self, password_file: Path, hub: Path, config: Path, sets: Optional[Path] = None,
                 own: str = OWN_CREATOR) -> None:
        self.password_file, self.hub, self.config = password_file, hub, config
        self.sets = sets or config.parent / "sets.json"
        self.failures: Dict[str, List[float]] = {}
        # exercise sheets: the uploaded exercises, the sheets (with the secrets of their online
        # versions: not readable by others) and the cached PDFs, next to the sets
        self.texercises = config.parent / "texercises"
        self.sheet_cache = config.parent / "sheets"
        self.sheets_file = config.parent / "exercise-sheets.json"
        self.sheet_images = config.parent / "sheet-images"  # the gallery images, uploaded or fetched
        self.fetching: Dict[str, str] = {}  # gallery name -> stem: being fetched from TeXercises
        self.fetch_failed: Dict[str, Tuple[float, str]] = {}  # gallery name -> (when, why)
        self.fetch_lock = threading.Lock()
        self.sheet_figures = config.parent / "sheet-figures"  # the TikZ figures as SVG (figures.py)
        self.sheets_lock = threading.Lock()
        self.own = own

    def stored_hash(self) -> str:
        """Read on every use, so a new password takes effect without a restart."""
        try:
            return self.password_file.read_text().strip()
        except OSError:
            return ""

    def _session_key(self, stored: str) -> bytes:
        # Derived from the password hash: changing the password ends every session.
        return hashlib.sha256(b"hub-admin-session|" + stored.encode()).digest()

    def new_session(self) -> str:
        expires = str(int(time.time()) + SESSION_DAYS * 86400)
        sig = hmac.new(self._session_key(self.stored_hash()), expires.encode(), "sha256").hexdigest()
        return f"{expires}.{sig}"

    def valid_session(self, value: str) -> bool:
        stored = self.stored_hash()
        if not stored or not value:
            return False
        try:
            expires, sig = value.split(".", 1)
            if int(expires) < time.time():
                return False
        except ValueError:
            return False
        want = hmac.new(self._session_key(stored), expires.encode(), "sha256").hexdigest()
        return hmac.compare_digest(want, sig)

    def blocked(self, addr: str) -> bool:
        now = time.time()
        self.failures[addr] = [t for t in self.failures.get(addr, []) if now - t < LOGIN_WINDOW]
        return len(self.failures[addr]) >= LOGIN_ATTEMPTS

    def failed(self, addr: str) -> None:
        self.failures.setdefault(addr, []).append(time.time())

    def apps(self) -> List[Dict[str, object]]:
        """The hub page's apps, each with the ids of its learning objectives if objectives.json
        (next to the hub page) knows them."""
        try:
            apps = hub_apps(self.hub.read_text(encoding="utf-8"))
        except OSError:
            return []
        known = read_config(self.hub.parent / "objectives.json")
        for a in apps:
            entry = known.get(a["id"]) if isinstance(known, dict) else None
            ids = [o.get("id") for o in entry.get("objectives", []) if isinstance(o, dict)] if isinstance(entry, dict) and isinstance(entry.get("objectives"), list) else []
            if ids and all(isinstance(i, str) for i in ids):
                a["objectives"] = ids
        return apps

    def current(self) -> Dict[str, object]:
        apps = self.apps()
        cfg = normalize(read_config(self.config), [a["id"] for a in apps], {a["id"]: a["tags"] for a in apps if a.get("tags")})
        return {"apps": apps, **cfg}

    def save(self, data: object) -> Dict[str, object]:
        apps = self.apps()
        if not apps:
            raise ValueError("the hub page lists no apps")
        cfg = normalize(data, [a["id"] for a in apps])
        write_config(self.config, cfg)
        return {"apps": apps, **cfg}

    def taken(self, name: str) -> bool:
        """A file or folder of that name in the web root (the hub page's folder)."""
        root = self.hub.parent
        return any((root / n).exists() for n in (name, name + ".html", name + ".json"))

    def standard_apps(self) -> List[Dict[str, object]]:
        """The apps in the hub page's standard order (apps.json's)."""
        apps = self.apps()
        order = normalize(read_config(self.config), [a["id"] for a in apps])["order"]
        return sorted(apps, key=lambda a: order.index(a["id"]) if a["id"] in order else len(order))

    def current_sets(self) -> Dict[str, object]:
        apps = self.standard_apps()
        return {"apps": apps, **normalize_sets(read_config(self.sets), apps, self.taken, strict=False)}

    def save_sets(self, data: object) -> Dict[str, object]:
        apps = self.standard_apps()
        if not apps:
            raise ValueError("the hub page lists no apps")
        sets = normalize_sets(data, apps, self.taken)
        write_config(self.sets, sets)
        return {"apps": apps, **sets}

    # ------------------------------------------------------------------ exercise sheets
    def sheet_apps(self, sheetlib=None, have=None) -> List[Dict[str, object]]:
        """The modules a sheet can have: the hub's apps in the standard order, each with its learning
        objectives ({id, en, de}, from objectives.json next to the hub page) and the number of its
        exercises in the pool that are there."""
        known = read_config(self.hub.parent / "objectives.json")
        pool = sheetlib.load_pool() if sheetlib else {}
        out = []
        for a in self.standard_apps():
            entry = known.get(a["id"]) if isinstance(known, dict) else None
            objs = [{"id": o["id"], "en": str(o.get("en") or o["id"]), "de": str(o.get("de") or o.get("en") or o["id"])}
                    for o in (entry.get("objectives") or [] if isinstance(entry, dict) else [])
                    if isinstance(o, dict) and isinstance(o.get("id"), str) and OBJECTIVE.fullmatch(o["id"])]
            if not objs and a["id"] in pool:  # no objectives.json: the pool's ids
                objs = [{"id": o, "en": o, "de": o} for o in pool[a["id"]].get("objectives", {}) if OBJECTIVE.fullmatch(o)]
            n = len([k for k in pool.get(a["id"], {}).get("exercises", {}) if have is None or k in have])
            out.append({"id": a["id"], "name": a["name"], "objectives": objs, "exercises": n})
        return out

    def read_sheets(self) -> Dict[str, Dict[str, object]]:
        data = read_config(self.sheets_file)
        sheets = data.get("sheets") if isinstance(data, dict) else None
        return {i: s for i, s in sheets.items() if SHEET_ID.fullmatch(i) and isinstance(s, dict)} if isinstance(sheets, dict) else {}

    def sheet_context(self):
        """(sheets.py, the pool, the exercises there, the modules) or ValueError."""
        sheetlib = sheets_module()
        if sheetlib is None:
            raise ValueError("exercise sheets are not installed")
        have = sheetlib.available(self.texercises)
        return sheetlib, sheetlib.load_pool(), have, self.sheet_apps(sheetlib, have)

    def sheets_state(self) -> Dict[str, object]:
        sheetlib = sheets_module()
        state = sheetlib.status(self.texercises) if sheetlib else {"latex": False, "exercises": 0, "pool": 0, "in_pool": 0, "uploaded": None}
        have = sheetlib.available(self.texercises) if sheetlib else {}
        sheets = self.read_sheets()
        state["sheets"] = sorted(({"id": i, "title": s.get("title", ""), "lang": s.get("lang", "en"), "exercises": len(s.get("exercises", [])),
                                   "updated": s.get("updated", 0), "shared": bool(s.get("token"))} for i, s in sheets.items()),
                                 key=lambda x: -x["updated"])
        state["apps"] = self.sheet_apps(sheetlib, have)
        figs = sheets_module("figures")
        state["figures"] = bool(figs and figs.available())
        state["own"] = self.own
        state["max"] = MAX_SHEET_EXERCISES
        return state

    def plan(self, sheet: Dict[str, object], suggest: bool = False, count: Optional[int] = None) -> Dict[str, object]:
        """What the editor shows of a sheet: its exercises (suggested anew, if asked), what is known of
        them, their alternatives, and per chosen objective the exercises there (to add one)."""
        sheetlib, pool, have, _ = self.sheet_context()
        modules, lang = sheet["modules"], sheet["lang"]
        exercises = sheetlib.suggest(modules, lang, pool, have, count) if suggest else list(sheet["exercises"])
        apps = [m["id"] for m in modules]
        targets = []  # per chosen objective (or module as a whole, if the pool has no objectives for it)
        for m in modules:
            objs = pool.get(m["id"], {}).get("objectives", {})
            for ob in (m["objectives"] if any(objs.values()) else [None]):
                targets.append({"app": m["id"], "objective": ob, "keys": sheetlib.candidates((m["id"], ob), pool, have)})
        alts = {k: sheetlib.alternatives(k, exercises, modules, lang, pool, have) for k in exercises}
        tg = sheetlib.targets(modules, pool)
        keys = set(exercises) | {k for v in alts.values() for k in v} | {k for t in targets for k in t["keys"]}
        details = {}
        for k in keys:
            found = sheetlib.info(pool, k, apps)
            if not found:
                continue
            app, e = found
            details[k] = {"title": str(e.get("title") or k), "lang": e.get("lang"), "difficulty": e.get("difficulty"),
                          "images": bool(e.get("images")), "app": app, "available": k in have,
                          "objectives": [ob for a, ob in sheetlib.covers(k, tg, pool) if ob],
                          "url": TEXERCISES + e["url"] if isinstance(e.get("url"), str) and re.fullmatch(r"/exercise/[A-Za-z0-9_-]+/?", e["url"]) else None}
        return {"exercises": exercises, "details": details, "alternatives": alts, "targets": targets,
                "default_count": sheetlib.default_count(modules, pool, have), "max": MAX_SHEET_EXERCISES}

    def draft(self, raw: object) -> Dict[str, object]:
        """A sheet as the editor sends it, cleaned (ValueError: why it cannot be)."""
        sheetlib, pool, _, apps = self.sheet_context()
        return normalize_sheet(raw, apps, pool)

    def sheet_full(self, sid: str) -> Optional[Dict[str, object]]:
        s = self.read_sheets().get(sid)
        if s is None:
            return None
        _, pool, _, apps = self.sheet_context()
        s = {**s, **normalize_sheet(s, apps, pool, strict=False)}
        return {"id": sid, **{k: v for k, v in s.items() if k != "token"}, "token": s.get("token"), "plan": self.plan(s)}

    def change_sheets(self, change) -> object:
        """Read, change and write the sheets under the lock: change(sheets) returns the answer."""
        with self.sheets_lock:
            sheets = self.read_sheets()
            out = change(sheets)
            write_config(self.sheets_file, {"sheets": sheets}, 0o600)
            return out

    def save_sheet(self, sid: Optional[str], raw: object) -> str:
        """Create (sid None) or save a sheet; its id. ValueError: why not; KeyError: no such sheet."""
        clean = self.draft(raw)
        now = int(time.time())

        def change(sheets):
            nonlocal sid
            if sid is None:
                if len(sheets) >= MAX_SHEETS:
                    raise ValueError(f"at most {MAX_SHEETS} sheets")
                sid = secrets.token_hex(6)
                sheets[sid] = {"created": now, "token": None}
            elif sid not in sheets:
                raise KeyError(sid)
            sheets[sid] = {**clean, "created": sheets[sid].get("created", now), "updated": now, "token": sheets[sid].get("token")}
            return sid
        return self.change_sheets(change)

    def sheet_action(self, sid: str, action: object) -> Dict[str, object]:
        """delete, duplicate, share (a new link: the old one stops working) or unshare. KeyError: no sheet."""
        def change(sheets):
            if sid not in sheets:
                raise KeyError(sid)
            if action == "delete":
                del sheets[sid]
                return {"deleted": sid}
            if action == "duplicate":
                if len(sheets) >= MAX_SHEETS:
                    raise ValueError(f"at most {MAX_SHEETS} sheets")
                new = secrets.token_hex(6)
                now = int(time.time())
                title = str(sheets[sid].get("title") or "")
                sheets[new] = {**sheets[sid], "title": (title + (" (Kopie)" if sheets[sid].get("lang") == "de" else " (copy)"))[:MAX_TITLE],
                               "created": now, "updated": now, "token": None}
                return {"id": new}
            if action == "share":
                sheets[sid]["token"] = secrets.token_urlsafe(24)
                return {"token": sheets[sid]["token"]}
            if action == "unshare":
                sheets[sid]["token"] = None
                return {"token": None}
            raise ValueError("action: save, delete, duplicate, share or unshare")
        return self.change_sheets(change)

    def sheet_by_token(self, token: str) -> Optional[Tuple[str, Dict[str, object]]]:
        if not SHEET_TOKEN.fullmatch(token or ""):
            return None
        for sid, s in self.read_sheets().items():
            t = s.get("token")
            if isinstance(t, str) and hmac.compare_digest(t, token):
                return sid, s
        return None

    def preview(self, keys: List[str]) -> Dict[str, object]:
        """The exercises as HTML (text and solution), for the editor's preview; only those of the pool
        that are there."""
        sheetlib, pool, have, _ = self.sheet_context()
        out = {}
        media = SheetMedia(self, "/admin/sheet/")
        for k in keys[:MAX_SHEET_EXERCISES]:
            if k in have and sheetlib.info(pool, k):
                out[k] = render_exercise(have[k], media=media)
        return {"exercises": out}

    # ------------------------------------------------------------------ images of the sheets
    def image_uses(self, keys: List[str]) -> Dict[str, Dict[str, object]]:
        """The gallery images the exercises use: name -> {"titles": [...], "stem": the file name it is
        kept as, made of the title and id of the first exercise that uses it}."""
        sheetlib, pool, have, _ = self.sheet_context()
        lib = sheets_module("preview")
        found: Dict[str, Dict[str, object]] = {}
        for k in keys[:MAX_SHEET_EXERCISES]:
            if k not in have or lib is None:
                continue
            parts = lib.read_exercise(have[k])
            meta = parts.get("meta") or {}
            title = str(meta.get("title") or k)
            names = lib.images_used(str(parts.get("text") or "") + "\n" + str(parts.get("solution") or ""))
            for n, name in enumerate(names, 1):
                e = found.setdefault(name, {"titles": [], "stem": sheetlib.image_stem(title, str(meta.get("id") or k), n, len(names))})
                if title not in e["titles"]:
                    e["titles"].append(title)
        return found

    def images_of(self, keys: List[str]) -> Dict[str, object]:
        """The gallery images the exercises use: [{name, have, file, pdf, exercises: [titles], gallery: url,
        fetching: being fetched, error: why fetching failed}]. Missing ones are fetched from TeXercises
        in the background (one that failed is tried again after FETCH_RETRY)."""
        sheetlib = sheets_module()
        out, missing = [], {}
        for name, e in self.image_uses(keys).items():
            f = sheetlib.find_image(self.sheet_images, name)
            out.append({"name": name, "have": bool(f), "file": f.name if f else e["stem"],
                        "pdf": bool(sheetlib.find_image(self.sheet_images, name, latex=True)),
                        "exercises": e["titles"], "gallery": sheetlib.GALLERY.format(quote(name))})
            if not f:
                missing[name] = str(e["stem"])
        self.fetch_missing(missing)
        with self.fetch_lock:
            for x in out:
                if not x["have"]:
                    x["fetching"] = x["name"] in self.fetching
                    if x["name"] in self.fetch_failed:
                        x["error"] = self.fetch_failed[x["name"]][1]
        return {"images": out}

    def fetch_missing(self, missing: Dict[str, str]) -> None:
        """Fetch these gallery images (name -> stem) from TeXercises in a background thread."""
        sheetlib = sheets_module()
        with self.fetch_lock:
            now = time.time()
            todo = {n: s for n, s in missing.items() if n not in self.fetching
                    and now - self.fetch_failed.get(n, (0.0, ""))[0] > FETCH_RETRY}
            if not todo or sheetlib is None:
                return
            busy = bool(self.fetching)
            self.fetching.update(todo)
        if busy:  # the thread already running takes them too
            return

        def work() -> None:
            while True:
                with self.fetch_lock:
                    if not self.fetching:
                        return
                    name, stem = next(iter(self.fetching.items()))
                try:
                    ok, what = sheetlib.fetch_image(self.sheet_images, name, stem)
                except Exception as e:  # noqa: BLE001 - a fetch must not stop the others
                    ok, what = False, str(e)
                with self.fetch_lock:
                    self.fetching.pop(name, None)
                    if ok:
                        self.fetch_failed.pop(name, None)
                    else:
                        self.fetch_failed[name] = (time.time(), what)
        threading.Thread(target=work, daemon=True).start()

    def store_images(self, filename: str, data: bytes, keys: List[str], gallery: Optional[str] = None) -> Dict[str, object]:
        """An uploaded image (gallery: of which gallery name), or a .zip of them, for the images of these
        exercises: each kept under a name made of its exercise's title and id."""
        sheetlib = sheets_module()
        if sheetlib is None:
            raise ValueError("exercise sheets are not installed")
        targets = {n: str(e["stem"]) for n, e in self.image_uses(keys).items()}
        if not targets:
            raise ValueError("the exercises of this sheet use no images")
        return sheetlib.store_images(self.sheet_images, filename, data, targets, gallery)

    def fetch_image(self, name: str, keys: List[str]) -> Dict[str, object]:
        sheetlib = sheets_module()
        if sheetlib is None:
            raise ValueError("exercise sheets are not installed")
        use = self.image_uses(keys).get(name)
        if use is None:
            return {"ok": False, "error": "no exercise of this sheet uses this image"}
        ok, what = sheetlib.fetch_image(self.sheet_images, name, str(use["stem"]))
        with self.fetch_lock:
            if ok:
                self.fetch_failed.pop(name, None)
        return {"ok": ok, "name": what} if ok else {"ok": False, "error": what}

    def image_file(self, name: str) -> Optional[Path]:
        """The file kept for a gallery image."""
        sheetlib = sheets_module()
        return sheetlib.find_image(self.sheet_images, name) if sheetlib else None

    def kept_image(self, filename: str) -> Optional[Path]:
        """An image file of the folder, by its own name."""
        sheetlib = sheets_module()
        return sheetlib.kept_file(self.sheet_images, filename) if sheetlib else None

    def sheet_chosen(self, s: Dict[str, object], sheetlib, pool) -> List[Tuple[str, str]]:
        apps = [m.get("id") for m in s.get("modules", []) if isinstance(m, dict)]
        out = []
        for k in s.get("exercises", []):
            found = sheetlib.info(pool, k, apps) if isinstance(k, str) else None
            if found:
                out.append((found[0], k))
        return out

    def sheet_opts(self, s: Dict[str, object], sheetlib) -> Dict[str, str]:
        lang = "de" if s.get("lang") == "de" else "en"
        day = time.strftime("%d.%m.%Y" if lang == "de" else "%d/%m/%Y", time.localtime(int(s.get("updated") or time.time())))
        return {"author": sheetlib.AUTHOR, "school": sheetlib.SCHOOL, "date": day, "lang": lang}

    def sheet_pdf(self, sid: str, solutions: bool) -> Tuple[str, object]:
        """("ready", pdf), ("building", None) or ("error", why) for the saved sheet; KeyError: none."""
        s = self.read_sheets().get(sid)
        if s is None:
            raise KeyError(sid)
        sheetlib = sheets_module()
        if sheetlib is None:
            return "error", "exercise sheets are not installed"
        pool = sheetlib.load_pool()
        title = str(s.get("title") or "")
        return sheetlib.request_pdf(title, self.sheet_chosen(s, sheetlib, pool), self.app_names(), self.texercises,
                                    self.sheet_cache, "both" if solutions else "exercises", self.sheet_opts(s, sheetlib),
                                    self.sheet_images)

    def online(self, token: str) -> Optional[str]:
        """The online version of a shared sheet (its exercises, without solutions), or None."""
        found = self.sheet_by_token(token)
        sheetlib = sheets_module()
        if not found or sheetlib is None:
            return None
        sid, s = found
        pool, have = sheetlib.load_pool(), sheetlib.available(self.texercises)
        names = self.app_names()
        media = SheetMedia(self, f"/admin/sheet/s/{token}/")
        exercises = []
        for app, key in self.sheet_chosen(s, sheetlib, pool):
            if key not in have:
                continue
            ex = render_exercise(have[key], solution=False, media=media)
            entry = (sheetlib.info(pool, key, [app]) or (app, {}))[1]
            exercises.append({"module": names.get(app, app), "title": ex["title"], "html": ex["text"],
                              "difficulty": sheetlib.level(entry.get("difficulty")) if entry.get("difficulty") else 0,
                              "pending": "pending" in ex.get("fallbacks", [])})
        return online_page(s, exercises, self.sheet_opts(s, sheetlib))

    def app_names(self) -> Dict[str, str]:
        return {a["id"]: str(a.get("name") or a["id"]) for a in self.apps()}

    def store_texercises(self, data: bytes) -> Dict[str, int]:
        sheetlib = sheets_module()
        if sheetlib is None:
            raise ValueError("exercise sheets are not installed")
        return sheetlib.store_export(data, self.texercises, self.own)


class SheetMedia:
    """The figures and images of the exercises on a page (preview.py's Media): a TikZ figure as the SVG
    figures.py draws (/admin/sheet/fig/<hash>.svg, public: its name is a hash), a gallery image as
    the uploaded file under base (/admin/sheet/img/ for the panel, the sheet's secret link for its
    online version)."""

    def __init__(self, admin: "Admin", base: str) -> None:
        self.admin, self.base = admin, base

    def figure(self, preamble: str, lang: str, env: str, body: str) -> Dict[str, object]:
        figs = sheets_module("figures")
        if figs is None:
            return {}
        got = figs.figure(self.admin.sheet_figures, preamble, lang, figs.figure_source(env, body))
        if got.get("svg"):
            return {"url": f"/admin/sheet/fig/{got['svg']}", "width": got.get("width", 0)}
        return got

    def image(self, name: str) -> Optional[str]:
        p = self.admin.image_file(name)
        return f"{self.base}img/{quote(p.name)}" if p else None


# the PDF's fonts for the online version, from the server's TeX Live (served at /admin/static/fonts/)
FONT_FILES = ("Erewhon-Regular.otf", "Erewhon-Italic.otf", "Erewhon-Bold.otf", "Erewhon-BoldItalic.otf",
              "FiraSans-Book.otf", "FiraSans-BookItalic.otf", "FiraSans-Medium.otf", "FiraSans-SemiBold.otf")
FONT_DIRS = ("/usr/share/texlive/texmf-dist/fonts/opentype/public/erewhon",
             "/usr/share/texlive/texmf-dist/fonts/opentype/public/fira",
             "/usr/share/texmf/fonts/opentype/public/erewhon", "/usr/share/texmf/fonts/opentype/public/fira")
_fonts: Dict[str, Optional[Path]] = {}


def font_file(name: str) -> Optional[Path]:
    if name not in FONT_FILES:
        return None
    if name not in _fonts:
        found = next((Path(d) / name for d in FONT_DIRS if (Path(d) / name).is_file()), None)
        if found is None:
            try:
                import subprocess
                r = subprocess.run(["kpsewhich", name], capture_output=True, text=True, timeout=10)
                found = Path(r.stdout.strip()) if r.returncode == 0 and r.stdout.strip() else None
            except (OSError, subprocess.SubprocessError):
                found = None
        _fonts[name] = found if found and found.is_file() else None
    return _fonts[name]


IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
               ".webp": "image/webp", ".svg": "image/svg+xml"}
# an uploaded or drawn image opened on its own runs nothing (an SVG could hold a script)
MEDIA_HEADERS = {"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
                 "Cache-Control": "private, max-age=300"}


def render_exercise(folder: Path, solution: bool = True, media: Optional[SheetMedia] = None) -> Dict[str, object]:
    """An exercise as HTML (sheets/preview.py); a page that cannot be read says so."""
    lib = sheets_module("preview")
    if lib is None:
        return {"title": folder.name, "lang": "en", "text": '<p class="tx-fig">The preview is not installed.</p>', "solution": "", "fallbacks": ["error"]}
    out = lib.render(folder, solution, media)
    out["key"] = folder.name
    return out


def normalize_sheet(raw: object, apps: List[Dict[str, object]], pool: Dict[str, object], strict: bool = True) -> Dict[str, object]:
    """A sheet as stored: {"title", "lang": "en" | "de", "modules": [{"id", "objectives": [ids]}],
    "exercises": [keys]}. Modules are the hub's apps (each once, in the order of apps: the standard one), their objectives
    those the app has (in its order; none given: all of them); the exercises keys of the pool, each once,
    at most MAX_SHEET_EXERCISES. strict: anything else is a ValueError, else it is dropped."""
    raw = raw if isinstance(raw, dict) else {}
    by_id = {a["id"]: a for a in apps}
    title = raw.get("title")
    title = re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f<>]", "", title)).strip()[:MAX_TITLE].strip() if isinstance(title, str) else ""
    lang = raw.get("lang") if raw.get("lang") in ("en", "de") else "en"
    modules: List[Dict[str, object]] = []
    for m in raw.get("modules") if isinstance(raw.get("modules"), list) else []:
        mid = m.get("id") if isinstance(m, dict) else None
        if mid not in by_id or any(x["id"] == mid for x in modules):
            if strict and mid not in by_id:
                raise ValueError(f"unknown module {str(mid)[:40]!r}")
            continue
        known = [o["id"] for o in by_id[mid].get("objectives", [])]
        want = m.get("objectives")
        objs = [o for o in known if o in want] if isinstance(want, list) else known
        modules.append({"id": mid, "objectives": objs})
    order = list(by_id)
    modules.sort(key=lambda m: order.index(m["id"]))  # the hub's standard order
    if len(modules) > MAX_MODULES:
        raise ValueError(f"at most {MAX_MODULES} modules")
    keys = {k for e in pool.values() if isinstance(e, dict) for k in e.get("exercises", {})}
    exercises: List[str] = []
    for k in raw.get("exercises") if isinstance(raw.get("exercises"), list) else []:
        if not isinstance(k, str) or k not in keys:
            if strict:
                raise ValueError(f"not an exercise of the pool: {str(k)[:60]!r}")
            continue
        if k not in exercises:
            exercises.append(k)
    if len(exercises) > MAX_SHEET_EXERCISES:
        if strict:
            raise ValueError(f"at most {MAX_SHEET_EXERCISES} exercises")
        exercises = exercises[:MAX_SHEET_EXERCISES]
    return {"title": title, "lang": lang, "modules": modules, "exercises": exercises}


API = ("/api/config", "/api/sets")


def make_handler(admin: Admin):
    class Handler(BaseHTTPRequestHandler):
        server_version = "hub-admin"
        sys_version = ""

        def log_message(self, fmt: str, *args) -> None:  # one line per request, without addresses
            sys.stderr.write((fmt % args) + "\n")

        # -------------------------------------------------------------- helpers
        def addr(self) -> str:
            return self.headers.get("X-Real-IP") or self.client_address[0]

        def cookie(self) -> str:
            for part in (self.headers.get("Cookie") or "").split(";"):
                k, _, v = part.strip().partition("=")
                if k == COOKIE:
                    return v
            return ""

        def logged_in(self) -> bool:
            return admin.valid_session(self.cookie())

        def send(self, status: int, body: str | bytes, ctype: str = "text/html; charset=utf-8", headers: Optional[Dict[str, str]] = None) -> None:
            data = body.encode("utf-8") if isinstance(body, str) else body
            headers = {"Cache-Control": "no-store", "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff",
                       "Referrer-Policy": "same-origin",
                       "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; "
                       "img-src 'self'; font-src 'self'; frame-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
                       **(headers or {})}  # a page's own headers replace these
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)

        def json(self, status: int, obj: object) -> None:
            self.send(status, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8")

        def body(self) -> Optional[bytes]:
            try:
                n = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                return None
            if n < 0 or n > MAX_BODY:
                return None
            return self.rfile.read(n)

        def redirect(self, cookie: Optional[str] = None) -> None:
            headers = {"Location": "/admin/"}
            if cookie is not None:
                headers["Set-Cookie"] = f"{COOKIE}={cookie}; Path=/admin/; HttpOnly; Secure; SameSite=Strict" + \
                    (f"; Max-Age={SESSION_DAYS * 86400}" if cookie else "; Max-Age=0")
            self.send(HTTPStatus.SEE_OTHER, "", headers=headers)

        def json_body(self) -> Optional[object]:
            """The JSON a POST sends (as the API takes it: JSON only, so that a form on another site
            cannot send it), or None after answering with the error."""
            if not (self.headers.get("Content-Type") or "").startswith("application/json"):
                self.json(415, {"error": "JSON expected"})
                return None
            data = self.body()
            if data is None:
                self.json(413, {"error": "too large"})
                return None
            try:
                body = json.loads(data.decode("utf-8") or "{}")
            except ValueError:
                self.json(400, {"error": "not JSON"})
                return None
            if not isinstance(body, dict):
                self.json(400, {"error": "an object expected"})
                return None
            return body

        def sheet_route(self, rest: str) -> None:
            """<id>.pdf and <id>-solutions.pdf (logged in): the saved sheet's PDF, made when first asked
            for (a page that reloads itself until it is there); s/<secret>: a shared sheet's online
            version, for everyone with the link (and s/<secret>/img/<file>: its images); fig/<hash>.svg: a
            drawn TikZ figure; img/<file> (logged in): an uploaded image."""
            m = re.fullmatch(r"fig/([0-9a-f]{32})\.svg", rest)
            if m:
                f = admin.sheet_figures / f"{m.group(1)}.svg"
                if f.is_file():
                    self.send(200, f.read_bytes(), "image/svg+xml", {**MEDIA_HEADERS, "Cache-Control": "public, max-age=86400"})
                else:
                    self.send(404, "Not found", "text/plain; charset=utf-8")
                return
            m = re.fullmatch(r"(?:s/([A-Za-z0-9_-]{32})/)?img/([^/]{1,160})", rest)
            if m:
                ok = admin.sheet_by_token(m.group(1)) is not None if m.group(1) else self.logged_in()
                f = admin.kept_image(unquote(m.group(2))) if ok else None
                if f is None:
                    self.send(404, "Not found", "text/plain; charset=utf-8")
                else:
                    self.send(200, f.read_bytes(), IMAGE_TYPES.get(f.suffix.lower(), "application/octet-stream"), MEDIA_HEADERS)
                return
            if rest.startswith("s/"):
                html = admin.online(rest[2:])
                if html is None:
                    self.send(404, page("Exercise sheet", '<p class="lead">There is no exercise sheet at this address (any more).</p>'))
                else:
                    self.send(200, html, headers={"Referrer-Policy": "no-referrer"})
                return
            m = re.fullmatch(r"([0-9a-f]{12})(-solutions)?\.pdf", rest)
            if not m:
                self.send(404, "Not found", "text/plain; charset=utf-8")
                return
            if not self.logged_in():  # the PDFs are the teacher's: made in the admin panel only
                self.send(403, page("Exercise sheet", '<p class="lead">Exercise sheets are made in the admin panel: '
                                    '<a href="/admin/">log in</a>, then open the link again.</p>'))
                return
            sid, solutions = m.group(1), bool(m.group(2))
            try:
                state, value = admin.sheet_pdf(sid, solutions)
            except KeyError:
                self.send(404, page("Exercise sheet", '<p class="lead">There is no such sheet: see the '
                                    '<a href="/admin/#sheets">admin panel</a>.</p>'))
                return
            if state == "ready":
                fname = f"sheet-{sid}{'-solutions' if solutions else ''}.pdf"
                self.send(200, value, "application/pdf", {"Content-Disposition": f'inline; filename="{fname}"'})
            elif state == "building":
                self.send(202, page("Exercise sheet", '<p class="lead">The PDF is being prepared (the first time up '
                                    'to a minute). This page reloads by itself until it is there.</p>', refresh=3))
            else:
                self.send(409, page("Exercise sheet", f'<p class="lead error">The PDF could not be made: {escape(str(value))}</p>'
                                    '<p><a href="">Try again</a> · <a href="/admin/#sheets">admin panel</a></p>'))

        def sheets_get(self, path: str) -> None:
            """/api/sheets, /api/sheets/<id>, /api/preview?keys=a,b (logged in)."""
            if not self.logged_in():
                self.json(403, {"error": "login"})
                return
            try:
                if path == "/api/sheets":
                    self.json(200, admin.sheets_state())
                elif path in ("/api/preview", "/api/images"):
                    query = parse_qs(self.path.partition("?")[2])
                    keys = [k for k in (query.get("keys") or [""])[0].split(",") if k]
                    self.json(200, admin.preview(keys) if path == "/api/preview" else admin.images_of(keys))
                else:
                    sid = path[len("/api/sheets/"):]
                    full = admin.sheet_full(sid) if SHEET_ID.fullmatch(sid) else None
                    if full is None:
                        self.json(404, {"error": "no such sheet"})
                    else:
                        self.json(200, full)
            except ValueError as e:
                self.json(400, {"error": str(e)})

        def sheets_post(self, path: str) -> None:
            """/api/sheets/new {"sheet": ...}: a new sheet; /api/sheets/<id> {"action": "save", "sheet": ...}
            or {"action": "delete" | "duplicate" | "share" | "unshare"}; /api/plan {"sheet": ..., "suggest":
            bool, "count": n}: a sheet's exercises (suggested, if asked), their alternatives, ... unsaved."""
            if not self.logged_in():
                self.json(403, {"error": "login"})
                return
            body = self.json_body()
            if body is None:
                return
            try:
                if path == "/api/plan":
                    count = body.get("count")
                    count = count if isinstance(count, int) and not isinstance(count, bool) and 1 <= count <= MAX_SHEET_EXERCISES else None
                    self.json(200, admin.plan(admin.draft(body.get("sheet")), bool(body.get("suggest")), count))
                    return
                sid = path[len("/api/sheets/"):]
                if sid == "new":
                    self.json(200, admin.sheet_full(admin.save_sheet(None, body.get("sheet"))))
                elif not SHEET_ID.fullmatch(sid):
                    self.json(404, {"error": "no such sheet"})
                elif body.get("action") == "save":
                    self.json(200, admin.sheet_full(admin.save_sheet(sid, body.get("sheet"))))
                else:
                    self.json(200, admin.sheet_action(sid, body.get("action")))
            except KeyError:
                self.json(404, {"error": "no such sheet"})
            except ValueError as e:
                self.json(400, {"error": str(e)})
            except OSError:
                self.json(500, {"error": "could not write the sheets"})

        # -------------------------------------------------------------- routes
        def do_HEAD(self) -> None:
            self.do_GET()

        def do_GET(self) -> None:
            path = self.path.split("?", 1)[0]
            if path == "/":
                self.send(200, panel_page() if self.logged_in() else login_page(bool(admin.stored_hash())))
            elif path == "/static/admin.js":
                self.send(200, ADMIN_JS, "text/javascript; charset=utf-8")
            elif path == "/static/drag.js":
                self.send(200, DRAG_JS, "text/javascript; charset=utf-8")
            elif path == "/static/sets.js":
                self.send(200, SETS_JS, "text/javascript; charset=utf-8")
            elif path == "/static/sheets.js":
                self.send(200, SHEETS_JS, "text/javascript; charset=utf-8")
            elif path == "/static/online.js":
                self.send(200, ONLINE_JS, "text/javascript; charset=utf-8")
            elif path == "/static/online.css":
                self.send(200, ONLINE_CSS, "text/css; charset=utf-8")
            elif path.startswith("/sheet/"):
                self.sheet_route(path[len("/sheet/"):])
            elif path in ("/api/sheets", "/api/preview", "/api/images") or path.startswith("/api/sheets/"):
                self.sheets_get(path)
            elif path.startswith("/static/fonts/"):
                f = font_file(path[len("/static/fonts/"):])
                if f is None:
                    self.send(404, "Not found", "text/plain; charset=utf-8")
                else:
                    self.send(200, f.read_bytes(), "font/otf", {"Cache-Control": "public, max-age=604800"})
            elif path == "/static/admin.css":
                self.send(200, ADMIN_CSS, "text/css; charset=utf-8")
            elif path in API:
                if not self.logged_in():
                    self.json(403, {"error": "login"})
                else:
                    self.json(200, admin.current() if path == "/api/config" else admin.current_sets())
            else:
                self.send(404, "Not found", "text/plain; charset=utf-8")

        def do_POST(self) -> None:
            path = self.path.split("?", 1)[0]
            if path == "/login":
                data = self.body()
                if data is None:
                    self.send(413, "Too large", "text/plain; charset=utf-8")
                    return
                if admin.blocked(self.addr()):
                    self.send(429, login_page(True, "Too many attempts. Try again in a few minutes."))
                    return
                password = (parse_qs(data.decode("utf-8", "replace")).get("password") or [""])[0]
                stored = admin.stored_hash()
                if stored and verify_password(password, stored):
                    self.redirect(admin.new_session())
                else:
                    admin.failed(self.addr())
                    self.send(403, login_page(bool(stored), "Wrong password."))
            elif path == "/logout":
                self.redirect("")
            elif path == "/api/plan" or path.startswith("/api/sheets/"):
                self.sheets_post(path)
            elif path == "/api/images/fetch":
                if not self.logged_in():
                    self.json(403, {"error": "login"})
                    return
                body = self.json_body()
                if body is None:
                    return
                try:
                    keys = body.get("keys") if isinstance(body.get("keys"), list) else []
                    self.json(200, admin.fetch_image(str(body.get("name") or ""), [k for k in keys if isinstance(k, str)]))
                except ValueError as e:
                    self.json(400, {"error": str(e)})
                except OSError:
                    self.json(500, {"error": "could not store the image"})
            elif path == "/api/texercises":
                # the uploads of the sheets (nginx lets 64 MB through here): a TeXercises export, or with
                # ?image=<file name> an image of the gallery or a .zip of them
                if not self.logged_in():
                    self.json(403, {"error": "login"})
                    return
                try:
                    n = int(self.headers.get("Content-Length") or 0)
                except ValueError:
                    n = -1
                if n <= 0 or n > MAX_UPLOAD:
                    self.json(413, {"error": "the file is too large (at most 64 MB)"})
                    return
                query = parse_qs(self.path.partition("?")[2])
                image = query.get("image")
                keys = [k for k in (query.get("keys") or [""])[0].split(",") if k]
                gallery = (query.get("gallery") or [None])[0]
                try:
                    self.json(200, admin.store_images(image[0], self.rfile.read(n), keys, gallery) if image
                              else admin.store_texercises(self.rfile.read(n)))
                except ValueError as e:
                    self.json(400, {"error": str(e)})
                except OSError:
                    self.json(500, {"error": "could not store the " + ("images" if image else "exercises")})
            elif path in API:
                # JSON only: a form on another site cannot send it (and the cookie is SameSite=Strict)
                if not self.logged_in():
                    self.json(403, {"error": "login"})
                    return
                if not (self.headers.get("Content-Type") or "").startswith("application/json"):
                    self.json(415, {"error": "JSON expected"})
                    return
                data = self.body()
                if data is None:
                    self.json(413, {"error": "too large"})
                    return
                try:
                    body = json.loads(data.decode("utf-8"))
                    self.json(200, admin.save(body) if path == "/api/config" else admin.save_sets(body))
                except ValueError as e:
                    self.json(400, {"error": str(e)})
                except OSError:
                    self.json(500, {"error": "could not write the configuration"})
            else:
                self.send(404, "Not found", "text/plain; charset=utf-8")

    return Handler


# ---------------------------------------------------------------------- pages
def page(title: str, body: str, script: bool = False, refresh: int = 0) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  {f'<meta http-equiv="refresh" content="{int(refresh)}">' if refresh else ''}
  <title>{escape(title)}</title>
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="/admin/static/admin.css">
  {'<link rel="stylesheet" href="/katex/katex.min.css"><script defer src="/katex/katex.min.js"></script><script defer src="/admin/static/drag.js"></script><script defer src="/admin/static/admin.js"></script><script defer src="/admin/static/sets.js"></script><script defer src="/admin/static/sheets.js"></script>' if script else ''}
</head>
<body>
  <header class="wrap">
    <p class="crumb"><a href="/">Learning Physics</a> / Admin</p>
    <h1>{escape(title)}</h1>
  </header>
  <main class="wrap">{body}</main>
</body>
</html>"""


def online_page(sheet: Dict[str, object], exercises: List[Dict[str, object]], opts: Dict[str, str]) -> str:
    """A shared sheet's online version in the look of its PDF (Erewhon, Fira Sans, the accent colour):
    one exercise per screen, with buttons, numbers, the arrow keys and swiping to move between them
    (online.js; without it, all of them one after another); for printing, all of them. No solutions.
    exercises: [{"module", "title", "html", "difficulty" (1-3, 0: unknown), "pending"}]."""
    de = opts.get("lang") == "de"
    title = str(sheet.get("title") or ("Übungen" if de else "Exercises"))
    left = ("Übungen " if de else "Exercises ") + title
    signed = " · ".join(x for x in (opts.get("school", ""), opts.get("author", ""), opts.get("date", "")) if x)
    total = len(exercises)
    arts, dots, last = [], [], None
    for n, e in enumerate(exercises, 1):
        module = str(e.get("module") or "")
        d = int(e.get("difficulty") or 0)
        stars = (f'<span class="stars" title="{"Schwierigkeit" if de else "difficulty"} {d}/3">{"★" * d}</span>' if d else "")
        arts.append(f'<article class="exercise tx" id="a{n}" data-n="{n}"{" data-pending" if e.get("pending") else ""}>'
                    f'<p class="module">{escape(module)}</p>'
                    f'<h2><span class="n">{n}</span><span class="t">{escape(str(e.get("title") or ""))}</span>{stars}</h2>'
                    f'{e.get("html") or ""}</article>')
        if module != last:
            dots.append(f'<span class="group" title="{escape(module)}"></span>' if last is not None else "")
            last = module
        dots.append(f'<a href="#a{n}" data-n="{n}" title="{escape(str(e.get("title") or ""))}">{n}</a>')
    empty = f'<p class="empty">{"Dieses Blatt hat noch keine Aufgaben." if de else "This sheet has no exercises yet."}</p>'
    prev, nxt = ("Zurück", "Weiter") if de else ("Previous", "Next")
    nav = (f'<nav class="pager" aria-label="{"Aufgaben" if de else "Exercises"}" hidden>'
           f'<button type="button" class="prev" aria-label="{prev}">← <span>{prev}</span></button>'
           f'<span class="pos" aria-live="polite"></span>'
           f'<button type="button" class="next" aria-label="{nxt}"><span>{nxt}</span> →</button></nav>') if total > 1 else ""
    return f"""<!doctype html>
<html lang="{'de' if de else 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>{escape(title)}</title>
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/katex/katex.min.css">
  <link rel="stylesheet" href="/admin/static/online.css">
  <script defer src="/katex/katex.min.js"></script>
  <script defer src="/admin/static/online.js"></script>
</head>
<body>
  <main class="sheet" data-total="{total}">
    <header class="top">
      <p class="site"><a href="/">learningphysics.ch</a></p>
      <h1>{escape(title)}</h1>
      {f'<nav class="dots" aria-label="{"Aufgaben" if de else "Exercises"}">{"".join(dots)}</nav>' if total > 1 else ""}
    </header>
    <div class="slides">{"".join(arts) or empty}</div>
    {nav}
    <footer><span class="left">{escape(left)}</span><span class="right">{escape(signed)}</span></footer>
  </main>
</body>
</html>"""


def login_page(ready: bool, error: str = "") -> str:
    if not ready:
        return page("Admin", '<p class="card">Teacher access hasn\'t been set up yet: set the teacher password of the crossword app.</p>')
    err = f'<p class="error" role="alert">{escape(error)}</p>' if error else ""
    return page("Admin", f"""
    <form class="card login" method="post" action="/admin/login">
      <p>The teacher password, the same as for the crosswords.</p>
      {err}
      <label class="field"><span>Password</span><input type="password" name="password" required autofocus autocomplete="current-password"></label>
      <button type="submit" class="primary">Log in</button>
    </form>""")


def panel_page() -> str:
    return page("Admin", """
    <div class="bar top">
      <nav class="tabs" aria-label="Sections">
        <a href="#quizzes" data-view="quizzes">Quizzes</a>
        <a href="#games" data-view="games">Games</a>
        <a href="#sets" data-view="sets">Sets</a>
        <a href="#sheets" data-view="sheets">Sheets</a>
        <a href="#apps" data-view="apps">Apps &amp; tags</a>
      </nav>
      <a class="view" href="/" target="_blank" rel="noopener">View the hub page ↗</a>
      <form method="post" action="/admin/logout" class="logout"><button type="submit">Log out</button></form>
    </div>
    <section id="view-apps" hidden>
      <p class="lead">Put the apps in order (drag them, use the arrows, or type a new position into the number before a name and press Enter) and give them tags, e.g. physics topics. On the hub page, visitors can filter the apps by tag, in English or German.</p>
      <div class="bar">
        <button type="button" id="save" class="primary" disabled>Save</button>
        <span id="status" class="status" aria-live="polite"></span>
      </div>
      <ol id="apps" class="apps"></ol>
      <datalist id="known-tags"></datalist>
      <h2 class="section">Tags</h2>
      <p class="note">The names of the tags in English and German. Edit them here; a tag used by no app disappears. At most 8 tags per app, 32 characters per name.</p>
      <table id="tags" class="tagtable"><thead><tr><th scope="col">English</th><th scope="col">German</th><th scope="col">Apps</th></tr></thead><tbody></tbody></table>
      <p id="no-tags" class="note" hidden>No tags yet: add one to an app above.</p>
    </section>
    <section id="view-sets" hidden>
      <p class="lead">A set is a selection of apps for a class, opened at learningphysics.ch/<i>name</i>: the apps you choose, in your order, and in each the modes (tutor, practice, check) and the learning objectives. With some objectives chosen, the app shows only their worked examples, offers only their practice topics, and its check asks only them. The apps stay open to everyone at their usual addresses: a set is a view, not a lock.</p>
      <div class="bar">
        <button type="button" id="sets-save" class="primary" disabled>Save</button>
        <span id="sets-status" class="status" aria-live="polite"></span>
      </div>
      <div id="set-list" class="setlist"></div>
      <div id="set-edit"></div>
    </section>
    <section id="view-sheets" hidden>
      <p class="lead">Exercise sheets from your TeXercises exercises: choose modules and their learning objectives, let the panel suggest a balanced sheet, replace or reorder its exercises, and preview them. Then download it as a PDF (with or without the solutions) or share an online version with your students: a secret link that works without logging in and shows no solutions.</p>
      <div id="sheets-state" class="sheetstate"><p class="note">Loading…</p></div>
      <div class="bar">
        <button type="button" id="sheet-save" class="primary" disabled>Save</button>
        <span id="sheet-status" class="status" aria-live="polite"></span>
      </div>
      <div id="sheet-list" class="setlist"></div>
      <div id="sheet-edit"></div>
    </section>
    <section id="view-quizzes">
      <p class="lead">Live classroom quizzes: students join on their phones, the teacher screen runs on the projector.</p>
      <ul class="games">
        <li class="card">
          <h2>Electric Circuits: the quiz</h2>
          <p>A live quiz in the style of Kahoot on DC circuits: charge, current, voltage, power, resistance, resistor circuits and meters, in 21 questions. Points for difficulty and speed, a ranking after every question, and at the end personal feedback for every student and class statistics with a CSV export for the teacher.</p>
          <p class="links"><a href="/electric-circuits/host" target="_blank" rel="noopener">Teacher screen ↗</a> <a href="/electric-circuits/" target="_blank" rel="noopener">Student page ↗</a></p>
          <p class="note">learningphysics.ch/electric-circuits/ · students join there (the lobby shows a QR code); one game at a time, and a new deploy waits until no one is playing</p>
        </li>
      </ul>
    </section>
    <section id="view-games" hidden>
      <p class="lead">The games for the class, each a service of its own on this site.</p>
      <ul class="games">
        <li class="card">
          <h2><a href="/millionaire/" target="_blank" rel="noopener">Who Wants to Be a Physicist? ↗</a></h2>
          <p>A quiz in the style of <i>Who Wants to Be a Millionaire</i>: 15 physics questions of rising difficulty, a ladder of famous physicists and three lifelines. As a classroom game, students join on their phones (QR code or room code), a Fastest Finger First round picks each contestant, and Ask the Audience can be a live class vote. A quick game starts without a lobby.</p>
          <p class="note">learningphysics.ch/millionaire/ · open to everyone</p>
        </li>
        <li class="card">
          <h2><a href="/crosswords/" target="_blank" rel="noopener">Crossword generator ↗</a></h2>
          <p>Generates physics crosswords by topic and size, to solve in the browser or print. A puzzle is shared as a link that students open without logging in; it can become a timed challenge, or a class challenge in which students compete on a live teacher screen.</p>
          <p class="note">learningphysics.ch/crosswords/ · the generator asks for its own teacher password; puzzle links are public</p>
        </li>
      </ul>
    </section>""", script=True)


TX_CSS = r"""
/* exercises as HTML (sheets/preview.py), in the panel's preview and the online version */
.tx p { margin: 0.4em 0; }
.tx ol.tx-abc { list-style: none; counter-reset: abc; padding-left: 2em; }
.tx ol.tx-abc > li { counter-increment: abc; position: relative; margin: 0.25em 0; }
.tx ol.tx-abc > li::before { content: counter(abc, lower-alpha) ")"; position: absolute; left: -1.8em; }
.tx ul.tx-wf { list-style: square; }
.tx .tx-d { overflow-x: auto; overflow-y: hidden; margin: 0.4em 0; }
.tx .tx-center { text-align: center; }
.tx .tx-center > table { margin: 0 auto; }
.tx .tx-right { text-align: right; }
.tx .tx-fig { display: inline-block; border: 1px dashed var(--muted); color: var(--muted); border-radius: 6px; padding: 4px 12px; margin: 4px 0; font-size: 0.85rem; }
.tx .tx-fig a { color: inherit; }
.tx .tx-fig.tx-pending { border-style: dotted; }
.tx .tx-figure { margin: 8px 0; }
.tx .tx-img { max-width: 100%; height: auto; background: #fff; }
.tx code.tx-raw, .tx pre.tx-raw { color: var(--muted); background: var(--chip); border-radius: 4px; padding: 0 3px; font-size: 0.85em; white-space: pre-wrap; }
.tx .tx-table { border-collapse: collapse; margin: 0.5em 0; }
.tx .tx-table td { border: 1px solid var(--line); padding: 2px 8px; }
.tx .tx-box { border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; margin: 6px 0; }
.tx .tx-box-title { font-weight: 600; font-size: 0.85rem; }
.tx .tx-frame { border: 1px solid currentColor; padding: 0 3px; }
.tx .tx-sc { font-variant: small-caps; }
.tx u.tx-uu { text-decoration: underline double; }
.tx .tx-claim .tx-mark { color: var(--muted); white-space: nowrap; }
"""

ADMIN_CSS = """
:root { --bg: #f6f5f1; --card: #fff; --ink: #1f2328; --muted: #646b73; --line: #d9d6ce; --accent: #2b59c3; --accent-ink: #fff; --ok: #1d7a3e; --bad: #b3261e; --chip: #eef2fb; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #15171a; --card: #1e2125; --ink: #e6e3dc; --muted: #9aa0a6; --line: #3a3e44; --accent: #7aa2ff; --accent-ink: #0d1320; --ok: #7fd49a; --bad: #ff8a80; --chip: #26304a; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { max-width: 820px; margin: 0 auto; padding: 0 16px; }
header.wrap { padding-top: 32px; }
.crumb { margin: 0; color: var(--muted); font-size: 0.95rem; }
.crumb a { color: inherit; }
h1 { margin: 4px 0 16px; font-size: 1.6rem; }
.lead, .note { color: var(--muted); }
.note { font-size: 0.9rem; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; }
.games { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.games h2 { margin: 0 0 6px; font-size: 1.1rem; }
.games h2 a { color: var(--accent); text-decoration: none; }
.games h2 a:hover { text-decoration: underline; }
.games p { margin: 0 0 6px; }
.games p.note { margin: 0; }
.games .links { display: flex; flex-wrap: wrap; gap: 6px 18px; font-weight: 600; }
.games .links a { color: var(--accent); }
.login { max-width: 420px; }
.field { display: block; margin: 12px 0; }
.field span { display: block; font-size: 0.9rem; color: var(--muted); margin-bottom: 4px; }
input { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 7px 9px; width: 100%; }
input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
button { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 6px 12px; cursor: pointer; }
button:hover:not(:disabled) { border-color: var(--accent); }
button:disabled { opacity: 0.45; cursor: default; }
button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
.error { color: var(--bad); }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 0 0 14px; position: sticky; top: 0; background: var(--bg); padding: 10px 0; z-index: 1; }
.status { color: var(--muted); font-size: 0.9rem; }
.status.ok { color: var(--ok); }
.status.bad { color: var(--bad); }
.view { margin-left: auto; color: var(--accent); }
.logout { margin: 0; }
.apps { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.app { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; align-items: start; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.app.moved { border-color: var(--accent); }
.move { display: flex; flex-direction: column; gap: 4px; }
.move button { padding: 2px 9px; line-height: 1.3; }
.app h2 .pos { width: 4.2em; padding: 2px 4px; margin-right: 10px; font-size: 0.9rem; font-weight: 400; text-align: center; vertical-align: middle; }
.drag { display: block; text-align: center; padding: 6px 0; font-size: 1.15rem; line-height: 1; color: var(--muted); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
.drag:hover { color: var(--accent); }
.dragging { border-color: var(--accent); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25); position: relative; z-index: 2; }
body.drag-active, body.drag-active * { cursor: grabbing !important; user-select: none; -webkit-user-select: none; }
.setapp.moved { border-color: var(--accent); }
.app h2 { margin: 0; font-size: 1.05rem; }
.app .id { color: var(--muted); font-size: 0.85rem; margin-left: 6px; font-weight: 400; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
.tag { display: inline-flex; align-items: center; gap: 2px; background: var(--chip); border-radius: 999px; padding: 2px 4px 2px 10px; font-size: 0.9rem; }
.tag button { border: 0; background: transparent; padding: 0 6px; font-size: 1rem; line-height: 1; color: var(--muted); }
.tag button:hover { color: var(--bad); }
.add { display: inline-flex; gap: 4px; }
.add input { width: 15em; padding: 3px 8px; font-size: 0.9rem; }
.add button { padding: 3px 10px; font-size: 0.9rem; }
.tag .de { color: var(--muted); }
h2.section { font-size: 1.15rem; margin: 28px 0 4px; }
.tagtable { border-collapse: collapse; width: 100%; margin: 8px 0 24px; }
.tagtable th { text-align: left; font-size: 0.85rem; color: var(--muted); font-weight: 600; padding: 4px 6px; }
.tagtable td { padding: 4px 6px; }
.tagtable td.n { color: var(--muted); font-size: 0.9rem; white-space: nowrap; }
.tagtable input.same { border-color: var(--bad); }
.tagtable tr.new input { outline: 2px solid var(--accent); }
.bar.top { position: static; padding-top: 0; }
.tabs { display: flex; gap: 4px; }
.tabs a { color: var(--ink); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: 4px 14px; }
.tabs a[aria-current="page"] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
.setlist { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; }
.setlist button[aria-pressed="true"] { border-color: var(--accent); outline: 2px solid var(--accent); }
.setlist .title { color: var(--muted); margin-left: 6px; font-size: 0.9rem; }
.setlist .new { border-style: dashed; }
.setform { display: grid; grid-template-columns: 1fr 2fr; gap: 0 14px; }
.setform .field { margin: 0 0 10px; }
.setform input.bad { border-color: var(--bad); }
.setform select { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; width: 100%; }
.setactions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0 16px; }
.setactions a { color: var(--accent); }
.setactions .danger { margin-left: auto; color: var(--bad); }
.setapps { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 10px; }
.setapp { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; align-items: start; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.setapp .head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.setapp h3 { margin: 0; font-size: 1.05rem; }
.setapp .remove { margin-left: auto; padding: 2px 9px; }
.checks { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 6px 0 0; }
.checks label, .tree label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
.checks input, .tree input { width: auto; accent-color: var(--accent); }
.sections { margin-top: 8px; }
.sections > summary { cursor: pointer; color: var(--accent); font-size: 0.95rem; }
.sections h4 { margin: 10px 0 4px; font-size: 0.95rem; }
.tree { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: 0.95rem; }
.tree ul { list-style: none; margin: 0 0 4px; padding-left: 24px; display: grid; gap: 2px; }
.tree .like { color: var(--muted); font-style: italic; }
.tree .where { color: var(--muted); font-size: 0.85rem; margin: 0 0 4px 26px; }
.tree li { margin-bottom: 4px; }
.tree label { align-items: flex-start; }
.tree label input { margin-top: 5px; }
.addapp { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.addapp select { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; max-width: 100%; }
.outline-frame { position: absolute; left: -10000px; top: 0; width: 1024px; height: 768px; border: 0; visibility: hidden; }
.empty { color: var(--muted); }
.sheetstate { margin: 0 0 6px; }
.sheetstate .upload summary { cursor: pointer; color: var(--accent); font-size: 0.95rem; }
.sheetstate .upload { margin: 0 0 10px; }
.sheet h3 { margin: 22px 0 8px; font-size: 1.05rem; }
.sheet select, .sheet input.count { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 5px 8px; max-width: 100%; }
.sheet input.count { width: 5.5em; }
.sheet label.inline { display: inline-flex; gap: 6px; align-items: center; }
.sheet label.inline input[type=checkbox] { width: auto; accent-color: var(--accent); }
.modpick { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 2px 14px; margin: 0 0 10px; font-size: 0.95rem; }
.modpick label { display: flex; gap: 6px; align-items: center; cursor: pointer; }
.modpick input { width: auto; accent-color: var(--accent); }
.modpick .n { color: var(--muted); font-size: 0.8rem; margin-left: auto; }
.modpick label.none { color: var(--muted); }
.modobjs { border-left: 3px solid var(--line); padding: 2px 0 2px 12px; margin: 6px 0; }
.modobjs > summary { cursor: pointer; font-weight: 600; }
.modobjs .tree { margin-top: 6px; }
.exlist { list-style: none; margin: 10px 0; padding: 0; display: grid; gap: 8px; }
.exrow { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
.exrow .move button { padding: 1px 8px; }
.exmain { min-width: 0; }
.exmain .head, .alts .head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }
.exmain .num { color: var(--muted); }
.exmain .tools, .alts .tools { margin-left: auto; display: inline-flex; gap: 6px; flex-wrap: wrap; }
.exmain .tools button, .alts .tools button { padding: 2px 9px; font-size: 0.88rem; }
.exmain .remove:hover { color: var(--bad); }
.chips { display: inline-flex; flex-wrap: wrap; gap: 4px; }
.chip { background: var(--chip); border-radius: 999px; padding: 0 8px; font-size: 0.78rem; line-height: 1.6; }
.chip.quiet { background: transparent; border: 1px solid var(--line); color: var(--muted); }
.chip.warn { background: #f6e7c4; color: #6b4b00; }
.chip.bad { background: var(--bad); color: var(--card); }
.imglist { list-style: none; padding: 0; margin: 0 0 8px; }
.imglist li { margin: 3px 0; }
.imglist .ok { color: var(--ok); font-weight: 600; }
.imglist .bad { color: var(--bad); font-weight: 600; }
.imglist label.button { display: inline-block; border: 1px solid var(--line); border-radius: 6px; padding: 0 8px; font-size: 0.82rem; cursor: pointer; background: var(--card); }
.imglist label.button:hover { border-color: var(--accent); }
.imglist label.button:focus-within { outline: 2px solid var(--accent); outline-offset: 1px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.obs { margin: 2px 0 0; font-size: 0.82rem; }
.alts { list-style: none; margin: 8px 0 2px; padding: 6px 0 0 12px; border-left: 3px solid var(--accent); display: grid; gap: 6px; font-size: 0.95rem; }
.prev { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; margin: 8px 0 4px; }
.prev .sol > summary { cursor: pointer; color: var(--accent); }
.adder { margin-top: 6px; }
.adder select { max-width: 22em; }
.sheetprev { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px 18px 12px; margin-top: 10px; }
.sheetprev h2 { font-size: 1.2rem; }
.sheetprev article { border-top: 1px solid var(--line); padding-top: 6px; }
.sheetprev h4 { margin: 8px 0 4px; }
.sheetprev .sol { display: none; border-left: 3px solid var(--ok); padding-left: 12px; margin: 6px 0; }
.sheetprev.with-solutions .sol { display: block; }
.sheetprev .soltitle { font-weight: 600; color: var(--ok); margin: 0; }
.sheet .links { display: flex; flex-wrap: wrap; gap: 6px 18px; font-weight: 600; margin: 0 0 4px; }
.sheet .links a, .share a { color: var(--accent); }
.share { margin-top: 10px; }
.share .url { word-break: break-all; }
.share .addapp { margin-top: 6px; }
@media (max-width: 560px) { .view { margin-left: 0; } .add input { width: 9em; } .setform { grid-template-columns: 1fr; } .exmain .tools { margin-left: 0; } }
""" + TX_CSS

ONLINE_CSS = r"""
/* the online version of a sheet, in the look of its PDF (lp-minion.sty, modern): Erewhon for the
   text, Fira Sans for headings and numbers, one accent colour (a deep blue); the fonts come from the
   server's TeX Live (/admin/static/fonts/), else similar ones of the device */
@font-face { font-family: "Erewhon"; src: url(/admin/static/fonts/Erewhon-Regular.otf) format("opentype"); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: "Erewhon"; src: url(/admin/static/fonts/Erewhon-Italic.otf) format("opentype"); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: "Erewhon"; src: url(/admin/static/fonts/Erewhon-Bold.otf) format("opentype"); font-weight: 700; font-style: normal; font-display: swap; }
@font-face { font-family: "Erewhon"; src: url(/admin/static/fonts/Erewhon-BoldItalic.otf) format("opentype"); font-weight: 700; font-style: italic; font-display: swap; }
@font-face { font-family: "Fira Sans LP"; src: url(/admin/static/fonts/FiraSans-Book.otf) format("opentype"); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: "Fira Sans LP"; src: url(/admin/static/fonts/FiraSans-BookItalic.otf) format("opentype"); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: "Fira Sans LP"; src: url(/admin/static/fonts/FiraSans-Medium.otf) format("opentype"); font-weight: 500; font-style: normal; font-display: swap; }
@font-face { font-family: "Fira Sans LP"; src: url(/admin/static/fonts/FiraSans-SemiBold.otf) format("opentype"); font-weight: 600; font-style: normal; font-display: swap; }
:root { --bg: #fff; --paper: #fff; --ink: #1a1a1a; --muted: #6b6b6b; --line: #d8dde4; --accent: #005293; --accent-soft: #7fa8c9; --chip: #eef3f8; --ok: #1d7a3e; color-scheme: light;
  --serif: "Erewhon", "Utopia", "Charter", "Bitstream Charter", Georgia, serif;
  --sans: "Fira Sans LP", "Fira Sans", "Source Sans 3", "Segoe UI", system-ui, sans-serif; }
@media (prefers-color-scheme: dark) { :root { --bg: #14171b; --paper: #14171b; --ink: #e8e6e1; --muted: #9ba3ab; --line: #343a42; --accent: #7fb2e0; --accent-soft: #4f7394; --chip: #1f2a36; color-scheme: dark; } }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 18px/1.5 var(--serif); font-variant-numeric: lining-nums; }
.sheet { max-width: 760px; min-height: 100vh; margin: 0 auto; padding: 22px 20px 18px; display: flex; flex-direction: column; }
.top .site { margin: 0 0 6px; font: 0.8rem var(--sans); letter-spacing: 0.02em; }
.top .site a { color: var(--muted); text-decoration: none; }
.top h1 { font: 600 1.75rem/1.2 var(--sans); color: var(--accent); margin: 0; padding-bottom: 7px; border-bottom: 1px solid var(--accent); }
.dots { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 14px 0 0; }
.dots a { min-width: 2em; height: 2em; padding: 0 0.4em; display: inline-flex; align-items: center; justify-content: center; border-radius: 1em;
  font: 500 0.82rem var(--sans); color: var(--accent); text-decoration: none; border: 1px solid var(--line); background: var(--paper); }
.dots a:hover { border-color: var(--accent-soft); }
.dots a[aria-current="step"] { background: var(--accent); border-color: var(--accent); color: var(--paper); }
.dots .group { width: 1px; height: 1.4em; background: var(--line); margin: 0 4px; }
.slides { flex: 1; margin-top: 18px; }
.exercise { margin: 0 0 30px; }
.js .exercise { display: none; margin: 0; animation: lp-in 0.18s ease-out; }
.js .exercise.current { display: block; }
@keyframes lp-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.exercise .module { margin: 0 0 4px; font: 600 0.82rem var(--sans); color: var(--accent); text-transform: none; letter-spacing: 0.01em; }
.exercise h2 { display: flex; align-items: baseline; gap: 0.6em; margin: 0 0 10px; font: 500 1.12rem/1.3 var(--sans); }
.exercise h2 .n { font-weight: 600; color: var(--accent); min-width: 1.2em; }
.exercise h2 .t { flex: 1; }
.exercise h2 .stars { color: var(--accent-soft); font-size: 0.8rem; letter-spacing: 0.08em; white-space: nowrap; }
.exercise.tx ol.tx-abc > li::before { content: counter(abc, lower-alpha); font: 500 0.95em var(--sans); color: var(--accent); }
.tx .katex { font-size: 1.08em; }
.tx .tx-figure { margin: 12px 0; text-align: center; }
.tx .tx-img { max-width: 100%; height: auto; background: #fff; border-radius: 4px; }
@media (prefers-color-scheme: dark) { .tx .tx-img { padding: 8px; } }
.tx .tx-box-title { font-family: var(--sans); }
.tx .tx-table { font-variant-numeric: tabular-nums; }
.empty { color: var(--muted); }
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 26px 0 10px; font-family: var(--sans); }
.pager button { font: 500 0.95rem var(--sans); color: var(--accent); background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 9px 16px; cursor: pointer; min-width: 44px; }
.pager button:hover:not(:disabled) { border-color: var(--accent); }
.pager button:disabled { color: var(--muted); opacity: 0.5; cursor: default; }
.pager button:focus-visible, .dots a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.pager .pos { font: 600 0.95rem var(--sans); color: var(--accent); }
footer { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 18px; padding-top: 8px; border-top: 1px solid var(--line);
  color: var(--muted); font: 0.75rem var(--sans); letter-spacing: 0.01em; }
@media (max-width: 520px) {
  body { font-size: 17px; }
  .sheet { padding: 16px 16px 14px; }
  .top h1 { font-size: 1.4rem; }
  .pager button span { display: none; }
}
@media print {
  :root { --bg: #fff; --paper: #fff; --ink: #000; --muted: #555; --line: #bbb; --accent: #005293; --accent-soft: #7fa8c9; }
  body { font-size: 10.5pt; }
  .sheet { max-width: none; padding: 0; min-height: 0; display: block; }
  .top .site, .dots, .pager { display: none !important; }
  .js .exercise, .exercise { display: block !important; margin: 0 0 14pt; animation: none; break-inside: avoid; }
  a { color: inherit; text-decoration: none; }
}
""" + TX_CSS

DRAG_JS = r"""
// Drag to reorder (the arrows stay, for the keyboard): AdminDrag.handle(onMove) is a handle to put
// in an item (an li) of a list. Dragged, the item takes the place the pointer is at among its
// siblings, the page scrolling near its edges; on release, onMove(from, to) gets its old and new
// index. Escape puts it back.
(function () {
  'use strict';
  const EDGE = 70; // px from the window's edge where the page scrolls
  const mid = (e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; };

  function handle(onMove) {
    const h = document.createElement('span');
    h.className = 'drag';
    h.textContent = '⠿';
    h.title = 'Drag to move';
    h.setAttribute('aria-hidden', 'true');
    h.addEventListener('pointerdown', (e) => {
      const li = h.closest('li'), list = li && li.parentElement;
      if (!list || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const index = () => [...list.children].indexOf(li);
      const from = index(), after = li.nextElementSibling;
      let y = e.clientY, frame = 0, done = false;
      h.setPointerCapture(e.pointerId);
      li.classList.add('dragging');
      document.body.classList.add('drag-active');

      // past the middle of a sibling: take its place (the sibling moves, not the item: moved, it
      // would lose the pointer)
      const place = () => {
        let p;
        while ((p = li.previousElementSibling) && y < mid(p)) list.insertBefore(p, li.nextElementSibling);
        while ((p = li.nextElementSibling) && y > mid(p)) list.insertBefore(p, li);
      };
      const scroll = () => {
        frame = 0;
        const d = y < EDGE ? -1 : y > innerHeight - EDGE ? 1 : 0;
        if (!d) return;
        const before = scrollY;
        scrollBy(0, d * Math.ceil((EDGE - (d < 0 ? y : innerHeight - y)) / 4));
        if (scrollY !== before) { place(); frame = requestAnimationFrame(scroll); }
      };
      const moveTo = (ev) => { if (ev.pointerId !== e.pointerId) return; y = ev.clientY; place(); if (!frame) frame = requestAnimationFrame(scroll); };
      const end = (keep) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(frame);
        window.removeEventListener('pointermove', moveTo);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        document.removeEventListener('keydown', key, true);
        li.classList.remove('dragging');
        document.body.classList.remove('drag-active');
        const to = index();
        if (keep && to !== from) onMove(from, to);
        else if (to !== from) list.insertBefore(li, after);
      };
      const up = (ev) => { if (ev.pointerId === e.pointerId) end(true); }, cancel = (ev) => { if (ev.pointerId === e.pointerId) end(false); };
      const key = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); end(false); } };
      window.addEventListener('pointermove', moveTo);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
      document.addEventListener('keydown', key, true);
    });
    return h;
  }
  window.AdminDrag = { handle };
})();
"""

ADMIN_JS = r"""
// The admin panel: loads the apps with their order and tags, edits them here, saves them on Save.
// Tags are { key: { en, de } }; an app lists the keys of its tags.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const MAX_TAGS = 8, MAX_LEN = 32;
  let apps = [], order = [], tags = {}, labels = {}, dirty = false, fresh = null;

  const nameOf = (id) => (apps.find((a) => a.id === id) || { name: id }).name;
  const status = (text, cls) => { const el = $('#status'); el.textContent = text; el.className = `status ${cls || ''}`; };
  function changed() { dirty = true; $('#save').disabled = false; status('Unsaved changes'); }
  const fold = (t) => t.trim().toLowerCase();
  const FOLD = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', à: 'a', á: 'a', â: 'a', è: 'e', é: 'e', ê: 'e', ì: 'i', í: 'i', ò: 'o', ó: 'o', ù: 'u', ú: 'u', ç: 'c', ñ: 'n' };
  // a new key from a name, as the server does: Kräfte → kraefte
  function newKey(name) {
    let k = name.toLowerCase().replace(/./g, (c) => FOLD[c] || c).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'tag';
    const base = k;
    for (let n = 2; labels[k]; n++) k = `${base.slice(0, 36)}-${n}`;
    return k;
  }
  const used = () => [...new Set(order.flatMap((id) => tags[id] || []))].filter((k) => labels[k]);
  const label = (k) => (labels[k].de && labels[k].de !== labels[k].en ? `${labels[k].en} · ${labels[k].de}` : labels[k].en);

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); });
    kids.forEach((k) => e.append(k));
    return e;
  }

  function renderApps(focus) {
    const list = $('#apps');
    list.replaceChildren(...order.map((id, i) => {
      const own = (tags[id] || []).filter((k) => labels[k]);
      const input = el('input', { type: 'text', list: 'known-tags', maxlength: String(MAX_LEN), placeholder: 'Tag (English or German)', 'aria-label': `New tag for ${nameOf(id)}` });
      const add = () => {
        const t = input.value.replace(/\s+/g, ' ').trim();
        if (!t) return;
        // an existing tag, by its English or German name, or a new one
        let k = Object.keys(labels).find((x) => fold(labels[x].en) === fold(t) || fold(labels[x].de) === fold(t));
        if (!k) { k = newKey(t); labels[k] = { en: t, de: t }; fresh = k; }
        if (own.includes(k)) { input.value = ''; return; }
        if (own.length >= MAX_TAGS) { status(`At most ${MAX_TAGS} tags per app`, 'bad'); return; }
        tags[id] = [...own, k];
        changed();
        renderApps({ id, what: 'input' });
        renderTags();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
      // its place in the list: type another and press Enter to move it there at once
      const pos = el('input', { type: 'number', class: 'pos', min: '1', max: String(order.length), value: String(i + 1), title: 'Type a position and press Enter', 'aria-label': `Position of ${nameOf(id)}` });
      pos.addEventListener('change', () => {
        const to = Math.min(order.length, Math.max(1, Math.round(Number(pos.value)) || i + 1)) - 1;
        if (to === i) { pos.value = String(i + 1); return; }
        order.splice(to, 0, order.splice(i, 1)[0]);
        changed();
        renderApps({ id, what: 'pos' });
      });
      return el('li', { class: 'app', 'data-id': id },
        el('div', { class: 'move' },
          el('button', { type: 'button', 'aria-label': `Move ${nameOf(id)} up`, onclick: () => move(i, -1), ...(i === 0 ? { disabled: '' } : {}) }, '↑'),
          AdminDrag.handle((from, to) => { order.splice(to, 0, order.splice(from, 1)[0]); changed(); renderApps({ id, what: 'drop' }); }),
          el('button', { type: 'button', 'aria-label': `Move ${nameOf(id)} down`, onclick: () => move(i, 1), ...(i === order.length - 1 ? { disabled: '' } : {}) }, '↓')),
        el('div', {},
          el('h2', {}, pos, nameOf(id), el('span', { class: 'id' }, `/${id}/`)),
          el('div', { class: 'tags' },
            ...own.map((k) => el('span', { class: 'tag' }, label(k),
              el('button', { type: 'button', 'aria-label': `Remove tag ${labels[k].en} from ${nameOf(id)}`, onclick: () => { tags[id] = own.filter((x) => x !== k); changed(); renderApps(); renderTags(); } }, '×'))),
            el('span', { class: 'add' }, input, el('button', { type: 'button', onclick: add }, 'Add')))));
    }));
    // suggestions: every tag, by both names
    $('#known-tags').replaceChildren(...used().flatMap((k) => [...new Set([labels[k].en, labels[k].de])].map((t) => el('option', { value: t }))));
    if (focus) {
      const li = list.querySelector(`li[data-id="${focus.id}"]`);
      if (li) {
        if (focus.what === 'input') li.querySelector('.add input').focus();
        else if (focus.what === 'pos') { li.querySelector('.pos').focus(); li.classList.add('moved'); li.scrollIntoView({ block: 'center' }); }
        else if (focus.what === 'drop') li.classList.add('moved');
        else { const b = li.querySelectorAll('.move button')[focus.what === 'up' ? 0 : 1]; (b.disabled ? li.querySelector('.move button:not(:disabled)') : b).focus(); li.classList.add('moved'); }
      }
    }
  }

  // the names of every tag in use, English and German, to edit
  function renderTags() {
    const keys = used().sort((a, b) => labels[a].en.localeCompare(labels[b].en));
    $('#no-tags').hidden = keys.length > 0;
    $('#tags').hidden = !keys.length;
    $('#tags tbody').replaceChildren(...keys.map((k) => {
      const n = order.filter((id) => (tags[id] || []).includes(k)).length;
      const field = (lang) => {
        const i = el('input', { type: 'text', maxlength: String(MAX_LEN), value: labels[k][lang], 'aria-label': `${lang === 'en' ? 'English' : 'German'} name of ${labels[k].en}` });
        const mark = () => { const de = i.closest('tr').querySelector('input[data-lang="de"]'); if (de) de.classList.toggle('same', labels[k].de === labels[k].en); };
        i.dataset.lang = lang;
        i.addEventListener('input', () => { labels[k][lang] = i.value.replace(/\s+/g, ' ').trim() || labels[k][lang]; changed(); mark(); renderApps(); });
        i.addEventListener('blur', () => { i.value = labels[k][lang]; });
        return i;
      };
      const en = field('en'), de = field('de');
      if (labels[k].de === labels[k].en) { de.classList.add('same'); de.title = 'Same as English: translate?'; }
      return el('tr', { class: k === fresh ? 'new' : '' }, el('td', {}, en), el('td', {}, de), el('td', { class: 'n' }, `${n} app${n === 1 ? '' : 's'}`));
    }));
    fresh = null;
  }

  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    changed();
    renderApps({ id: order[j], what: d < 0 ? 'up' : 'down' });
  }

  function apply(cfg) {
    apps = cfg.apps; order = cfg.order; tags = cfg.tags || {}; labels = cfg.labels || {};
    dirty = false; $('#save').disabled = true;
    renderApps(); renderTags();
    window.dispatchEvent(new CustomEvent('admin-order', { detail: order })); // the sets' list of apps (sets.js)
  }

  async function load() {
    const r = await fetch('/admin/api/config', { credentials: 'same-origin' });
    if (r.status === 403) { location.reload(); return; }
    apply(await r.json());
    status(apps.length ? '' : 'The hub page lists no apps.', apps.length ? '' : 'bad');
  }

  async function save() {
    $('#save').disabled = true;
    status('Saving…');
    try {
      const keys = used(), body = { order, tags, labels: Object.fromEntries(keys.map((k) => [k, labels[k]])) };
      const r = await fetch('/admin/api/config', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 403) { status('Logged out: log in again (your changes are lost on reload)', 'bad'); $('#save').disabled = false; return; }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      apply(await r.json());
      status('Saved. The hub page shows the new order and tags.', 'ok');
    } catch (e) {
      $('#save').disabled = false;
      status(`Not saved: ${e.message}`, 'bad');
    }
  }

  $('#save').addEventListener('click', save);
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  load().catch(() => status('Could not load the apps.', 'bad'));
})();
"""


SHEETS_JS = r"""
// The exercise sheets (#sheets): the state (LaTeX on the server, the uploaded TeXercises export, and
// its upload), the list of sheets, and the editor of one. A sheet is { title, lang, modules: [{ id,
// objectives: [ids] }], exercises: [keys] }, saved on Save; the server suggests its exercises from the
// pool for the chosen objectives (/admin/api/plan, which also gives every exercise's alternatives and
// each objective's exercises), renders their preview (/admin/api/preview: HTML whose math, in .tx-m
// and .tx-d, KaTeX sets here), makes the PDFs (/admin/sheet/<id>.pdf) and shares an online version
// at a secret link (/admin/sheet/s/<secret>).
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  if (!$('#view-sheets')) return;
  const LANGS = { en: 'English', de: 'German' };
  let st = null, cur = null, plan = null, dirty = false, loaded = false, busy = false;
  const previews = {}; // key → { title, text, solution, fallbacks }
  const openAlts = new Set(), openPrev = new Set();
  let showPreview = false, withSolutions = false, planTimer = 0, count = '';

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === false || v == null) return;
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    });
    kids.forEach((k) => { if (k !== '' && k != null) e.append(k); });
    return e;
  }
  const status = (text, cls) => { const e = $('#sheet-status'); e.textContent = text; e.className = `status ${cls || ''}`; };
  function changed(replan) {
    dirty = true;
    $('#sheet-save').disabled = false;
    status('Unsaved changes');
    if (replan) { clearTimeout(planTimer); planTimer = setTimeout(() => replanNow(false), 300); }
  }
  async function api(url, body) {
    const r = await fetch(url, body === undefined ? { credentials: 'same-origin' }
      : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 403) { location.reload(); throw new Error('logged out'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || r.statusText);
    return d;
  }

  // KaTeX for the math of the server's HTML; what it cannot read stays as its source
  function typeset(root) {
    if (!window.katex) return;
    root.querySelectorAll('.tx-m, .tx-d').forEach((e) => {
      const src = e.textContent;
      try { katex.render(src, e, { displayMode: e.classList.contains('tx-d'), throwOnError: true, strict: 'ignore' }); } catch (err) {
        e.replaceChildren(el('code', { class: 'tx-raw', title: `Not shown: ${err.message}` }, src));
      }
    });
  }
  function html(markup) { const d = el('div', { class: 'tx' }); d.innerHTML = markup; typeset(d); return d; } // the server's HTML (escaped there)

  // ---------------------------------------------------------------- what is known of apps and exercises
  const appOf = (id) => (st.apps.find((a) => a.id === id) || { id, name: id, objectives: [], exercises: 0 });
  const obName = (app, ob) => { const o = appOf(app).objectives.find((x) => x.id === ob); return o ? o[cur.lang] || o.en : ob; };
  const det = (k) => (plan && plan.details[k]) || { title: k, available: false };
  function chips(k) {
    const d = det(k);
    return el('span', { class: 'chips' },
      d.lang ? el('span', { class: 'chip' }, d.lang === 'de' ? 'DE' : 'EN') : '',
      d.difficulty ? el('span', { class: 'chip', title: `difficulty ${d.difficulty}` }, '★'.repeat(Math.min(d.difficulty, 5))) : '',
      d.images ? el('span', { class: 'chip warn', title: 'Has an image: TeXercises does not export it; upload or fetch it under Images' }, 'image') : '',
      d.available === false ? el('span', { class: 'chip bad', title: 'Not in the uploaded export: left out of the PDF and the online version' }, 'missing') : '',
      d.app ? el('span', { class: 'chip quiet' }, appOf(d.app).name) : '');
  }
  const objectiveLine = (k) => {
    const d = det(k);
    return d.objectives && d.objectives.length ? el('div', { class: 'note obs' }, d.objectives.map((o) => obName(d.app, o)).join(' · ')) : '';
  };

  // ---------------------------------------------------------------- the state and the list
  function renderState() {
    const box = $('#sheets-state');
    const up = st.uploaded ? new Date(st.uploaded * 1000).toLocaleString() : 'never';
    const file = el('input', { type: 'file', accept: '.zip,.tgz,application/zip,application/gzip', 'aria-label': 'TeXercises export' });
    const msg = el('span', { class: 'status' });
    const send = () => {
      if (!file.files[0]) { msg.textContent = 'Choose the .zip first.'; return; }
      msg.textContent = 'Uploading…';
      fetch('/admin/api/texercises', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: file.files[0] })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => { msg.textContent = ok ? `Kept ${d.exercises} of your exercises (${d.skipped} by others left out).` : `Error: ${d.error}`; if (ok) load(true); })
        .catch(() => { msg.textContent = 'The upload failed.'; });
    };
    box.replaceChildren(
      el('p', { class: 'note' }, `LaTeX on the server: ${st.latex ? 'yes' : 'no (PDFs need it; see hub-admin/sheets/README.md)'} · figures drawn for the browser: ${st.figures ? 'yes' : 'no (needs LaTeX and pdftocairo)'} · exercises there: ${st.exercises} (export uploaded: ${up}) · of the pool: ${st.in_pool} of ${st.pool}`),
      el('details', { class: 'upload' }, el('summary', {}, 'Upload a TeXercises export'),
        el('p', { class: 'note' }, `TeXercises: Settings → Export, the .zip. Only your own exercises (creator “${st.own}”) are kept; upload it again whenever your exercises change.`),
        el('div', { class: 'addapp' }, file, el('button', { type: 'button', onclick: send }, 'Upload'), msg)));
  }
  function renderList() {
    $('#sheet-list').replaceChildren(
      ...st.sheets.map((s) => el('button', { type: 'button', 'aria-pressed': String(!!cur && cur.id === s.id), onclick: () => open(s.id) },
        s.title || '(no title)', el('span', { class: 'title' }, `${s.exercises} ex.${s.shared ? ' · shared' : ''}`))),
      el('button', { type: 'button', class: 'new', onclick: () => fresh() }, '+ New sheet'));
  }

  // ---------------------------------------------------------------- the editor
  function render() {
    fills = [];
    renderList();
    const box = $('#sheet-edit');
    if (!cur) {
      box.replaceChildren(el('p', { class: 'empty' }, st.sheets.length ? 'Choose a sheet to edit it, or make a new one.' : 'No sheets yet: make one with New sheet.'));
      return;
    }
    const title = el('input', { type: 'text', value: cur.title, maxlength: '80', placeholder: 'e.g. Electrostatics · Klasse 3a' });
    title.addEventListener('input', () => { cur.title = title.value; changed(); });
    const lang = el('select', { 'aria-label': 'Language' }, ...Object.entries(LANGS).map(([k, t]) => el('option', { value: k, selected: cur.lang === k }, t)));
    lang.addEventListener('change', () => { cur.lang = lang.value; changed(true); render(); });
    box.replaceChildren(el('div', { class: 'card sheet' },
      el('div', { class: 'setform' },
        el('label', { class: 'field' }, el('span', {}, 'Title'), title),
        el('label', { class: 'field' }, el('span', {}, 'Language (exercises in it come first)'), lang)),
      cur.id ? el('div', { class: 'setactions' },
        el('button', { type: 'button', onclick: () => act('duplicate') }, 'Duplicate'),
        el('button', { type: 'button', class: 'danger', onclick: () => act('delete') }, 'Delete sheet')) : '',
      el('h3', {}, 'Modules and learning objectives'), modules(),
      el('h3', {}, 'Exercises'), exercises(),
      el('h3', {}, 'Images'), imagesBox(),
      el('h3', {}, 'Preview'), preview(),
      el('h3', {}, 'PDF and online version'), output()));
  }

  function modules() {
    const chosen = new Set(cur.modules.map((m) => m.id));
    const pick = el('div', { class: 'modpick', role: 'group', 'aria-label': 'Modules' }, ...st.apps.map((a) => {
      const box = el('input', { type: 'checkbox', checked: chosen.has(a.id) });
      box.addEventListener('change', () => {
        if (box.checked) cur.modules.push({ id: a.id, objectives: a.objectives.map((o) => o.id) });
        else cur.modules = cur.modules.filter((m) => m.id !== a.id);
        const order = st.apps.map((x) => x.id); // the hub's standard order
        cur.modules.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
        changed(true);
        render();
      });
      return el('label', { class: a.exercises ? '' : 'none', title: `${a.exercises} exercises in the pool` }, box, a.name, el('span', { class: 'n' }, String(a.exercises)));
    }));
    const objs = cur.modules.map((m) => {
      const app = appOf(m.id);
      const d = el('details', { class: 'modobjs', open: true },
        el('summary', {}, `${app.name}: ${m.objectives.length === app.objectives.length ? 'all' : m.objectives.length + ' of'} ${app.objectives.length} learning objectives`));
      if (!app.objectives.length) { d.append(el('p', { class: 'note' }, 'This module has no learning objectives: its exercises count as one.')); return d; }
      const targets = plan ? plan.targets.filter((t) => t.app === m.id) : [];
      d.append(el('ul', { class: 'tree' }, ...app.objectives.map((o) => {
        const on = m.objectives.includes(o.id);
        const box = el('input', { type: 'checkbox', checked: on, disabled: on && m.objectives.length === 1 });
        box.addEventListener('change', () => {
          m.objectives = app.objectives.filter((x) => (x.id === o.id ? box.checked : m.objectives.includes(x.id))).map((x) => x.id);
          changed(true);
          render();
        });
        const t = targets.find((x) => x.objective === o.id);
        const n = t ? t.keys.length : null;
        return el('li', {}, el('label', {}, box, o[cur.lang] || o.en), on && n === 0 ? el('div', { class: 'where' }, 'no exercise of the pool is there for it') : '');
      })));
      return d;
    });
    return el('div', {}, pick, ...objs, cur.modules.length ? '' : el('p', { class: 'note' }, 'Tick the modules the sheet is about.'));
  }

  function exercises() {
    const n = el('input', { type: 'number', min: '1', max: String(st.max), class: 'count', value: count, placeholder: plan ? String(plan.default_count) : '', 'aria-label': 'Number of exercises' });
    n.addEventListener('input', () => { count = n.value; });
    const sug = el('button', { type: 'button', class: 'primary', disabled: !cur.modules.length || busy, onclick: () => {
      if (cur.exercises.length && !confirm('Replace the exercises of the sheet by a new suggestion?')) return;
      replanNow(true, Number(n.value) || undefined);
    } }, 'Suggest a sheet');
    const parts = [el('div', { class: 'addapp' }, el('label', { class: 'inline' }, 'Exercises: ', n), sug,
      el('span', { class: 'note' }, `default ${plan ? plan.default_count : '…'}: two per objective, at most 24; about 30 % easy, 50 % average, 20 % hard`))];
    if (!cur.exercises.length) {
      parts.push(el('p', { class: 'empty' }, cur.modules.length ? 'No exercises yet: Suggest a sheet, or add some below.' : 'Choose modules first.'));
    } else {
      parts.push(el('ol', { class: 'exlist' }, ...cur.exercises.map((k, i) => exRow(k, i))));
    }
    parts.push(adder());
    return el('div', {}, ...parts);
  }

  function exRow(k, i) {
    const d = det(k), alts = (plan && plan.alternatives[k]) || [];
    const move = (dd) => { const j = i + dd; [cur.exercises[i], cur.exercises[j]] = [cur.exercises[j], cur.exercises[i]]; changed(true); render(); };
    const li = el('li', { class: 'exrow' },
      el('div', { class: 'move' },
        el('button', { type: 'button', 'aria-label': `Move ${d.title} up`, disabled: i === 0, onclick: () => move(-1) }, '↑'),
        el('button', { type: 'button', 'aria-label': `Move ${d.title} down`, disabled: i === cur.exercises.length - 1, onclick: () => move(1) }, '↓')),
      el('div', { class: 'exmain' },
        el('div', { class: 'head' }, el('span', { class: 'num' }, `${i + 1}.`), el('strong', {}, d.title), chips(k),
          el('span', { class: 'tools' },
            el('button', { type: 'button', 'aria-expanded': String(openPrev.has(k)), onclick: () => { toggle(openPrev, k); render(); } }, 'Preview'),
            el('button', { type: 'button', 'aria-expanded': String(openAlts.has(k)), disabled: !alts.length, onclick: () => { toggle(openAlts, k); render(); } }, `Alternatives (${alts.length})`),
            el('button', { type: 'button', class: 'remove', 'aria-label': `Remove ${d.title}`, onclick: () => { cur.exercises.splice(i, 1); changed(true); render(); } }, '×'))),
        objectiveLine(k),
        openPrev.has(k) ? previewOf(k, true) : '',
        openAlts.has(k) ? el('ul', { class: 'alts' }, ...alts.map((a) => el('li', {},
          el('div', { class: 'head' }, el('span', {}, det(a).title), chips(a),
            el('span', { class: 'tools' },
              el('button', { type: 'button', 'aria-expanded': String(openPrev.has(a)), onclick: () => { toggle(openPrev, a); render(); } }, 'Preview'),
              el('button', { type: 'button', onclick: () => { cur.exercises[i] = a; openAlts.delete(k); changed(true); render(); } }, 'Use instead'))),
          objectiveLine(a),
          openPrev.has(a) ? previewOf(a, false) : ''))) : ''));
    return li;
  }
  const toggle = (set, k) => { if (set.has(k)) set.delete(k); else set.add(k); };

  // an exercise of an objective (or of a module as a whole) to add
  function adder() {
    if (!plan || !plan.targets.length) return '';
    const label = (t) => `${appOf(t.app).name}${t.objective ? ' · ' + obName(t.app, t.objective) : ''}`;
    const tsel = el('select', { 'aria-label': 'Objective' }, ...plan.targets.map((t, i) => el('option', { value: String(i) }, `${label(t).slice(0, 90)} (${t.keys.filter((k) => !cur.exercises.includes(k)).length})`)));
    const ksel = el('select', { 'aria-label': 'Exercise to add' });
    const fill = () => {
      const t = plan.targets[Number(tsel.value)];
      const keys = t.keys.filter((k) => !cur.exercises.includes(k));
      ksel.replaceChildren(...(keys.length ? keys.map((k) => { const d = det(k); return el('option', { value: k }, `${d.title} (${(d.lang || '').toUpperCase()}, ${'★'.repeat(d.difficulty || 1)}${d.images ? ', image' : ''})`); }) : [el('option', { value: '' }, 'none left')]));
      add.disabled = !keys.length || cur.exercises.length >= st.max;
    };
    const add = el('button', { type: 'button', onclick: () => { if (ksel.value) { cur.exercises.push(ksel.value); changed(true); render(); } } }, 'Add');
    tsel.addEventListener('change', fill);
    fill();
    return el('div', { class: 'addapp adder' }, el('span', { class: 'note' }, 'Add an exercise of'), tsel, ksel, add);
  }

  // ---------------------------------------------------------------- the preview
  async function fetchPreviews(keys) {
    const want = keys.filter((k) => !previews[k] && det(k).available !== false);
    for (let i = 0; i < want.length; i += 20) {
      const d = await api(`/admin/api/preview?keys=${encodeURIComponent(want.slice(i, i + 20).join(','))}`);
      Object.assign(previews, d.exercises);
    }
  }
  // figures still being drawn on the server: their exercises are asked for again until they are there
  let fills = [], pendingTimer = 0, pendingRounds = 0;
  function watchPending() {
    clearTimeout(pendingTimer);
    const keys = [...new Set(fills.map((f) => f.k))].filter((k) => previews[k] && previews[k].fallbacks.includes('pending'));
    if (!keys.length) { pendingRounds = 0; return; }
    if (++pendingRounds > 40) return;
    pendingTimer = setTimeout(async () => {
      keys.forEach((k) => { delete previews[k]; });
      try { await fetchPreviews(keys); } catch (e) { return; }
      fills.filter((f) => keys.includes(f.k)).forEach((f) => f.fill());
      watchPending();
    }, 3000);
  }
  function previewOf(k, solution) {
    const box = el('div', { class: 'prev' }, el('p', { class: 'note' }, 'Loading…'));
    const show = () => {
      const p = previews[k];
      if (!p) { box.replaceChildren(el('p', { class: 'note' }, 'Not in the uploaded export: no preview.')); return; }
      box.replaceChildren(html(p.text));
      if (solution) box.append(el('details', { class: 'sol' }, el('summary', {}, 'Solution'), html(p.solution || '')));
      if (p.fallbacks.some((f) => !['figure', 'image', 'pending'].includes(f))) box.append(el('p', { class: 'note' }, 'Some of it is only shown as its source here; the PDF has it.'));
    };
    fills.push({ k, fill: show });
    if (previews[k] || det(k).available === false) { show(); watchPending(); } else fetchPreviews([k]).then(() => { show(); watchPending(); }).catch((e) => box.replaceChildren(el('p', { class: 'error' }, `No preview: ${e.message}`)));
    return box;
  }
  function preview() {
    const on = el('button', { type: 'button', disabled: !cur.exercises.length, onclick: () => { showPreview = !showPreview; render(); } }, showPreview ? 'Hide the preview' : 'Show the preview of the sheet');
    const sol = el('input', { type: 'checkbox', checked: withSolutions });
    sol.addEventListener('change', () => { withSolutions = sol.checked; const p = $('#sheet-preview'); if (p) p.classList.toggle('with-solutions', withSolutions); });
    const parts = [el('div', { class: 'addapp' }, on, el('label', { class: 'inline' }, sol, ' with the solutions'))];
    if (showPreview && cur.exercises.length) {
      const box = el('div', { id: 'sheet-preview', class: `sheetprev${withSolutions ? ' with-solutions' : ''}` }, el('p', { class: 'note' }, 'Loading…'));
      parts.push(box);
      fetchPreviews(cur.exercises).then(() => {
        box.replaceChildren(el('h2', {}, cur.title || '(no title)'), ...cur.exercises.map((k, i) => {
          const a = el('article', {});
          const fill = () => {
            const p = previews[k];
            a.replaceChildren(el('h4', {}, `${i + 1}. ${p ? p.title : det(k).title}`));
            if (!p) { a.append(el('p', { class: 'note' }, 'Not in the uploaded export: no preview.')); return; }
            a.append(html(p.text), el('div', { class: 'sol' }, el('p', { class: 'soltitle' }, cur.lang === 'de' ? 'Lösung' : 'Solution'), html(p.solution || '')));
          };
          fill();
          fills.push({ k, fill });
          return a;
        }));
        watchPending();
      }).catch((e) => box.replaceChildren(el('p', { class: 'error' }, `No preview: ${e.message}`)));
    }
    return el('div', {}, ...parts);
  }

  // ---------------------------------------------------------------- images
  // TeXercises does not export its gallery images: the sheet's images, which are there, and how to get
  // the others (fetched by the server from TeXercises, or downloaded there and uploaded here)
  let imgList = null, imgKeys = '';
  function imagesBox() {
    const box = el('div', { class: 'images' });
    const keys = cur.exercises.filter((k) => det(k).available !== false).join(',');
    const msg = el('span', { class: 'status', 'aria-live': 'polite' });
    const draw = () => {
      if (!imgList) { box.replaceChildren(el('p', { class: 'note' }, 'Loading…')); return; }
      if (!imgList.length) { box.replaceChildren(el('p', { class: 'note' }, cur.exercises.length ? 'The exercises of this sheet use no images.' : 'No exercises yet.')); return; }
      const missing = imgList.filter((x) => !x.have);
      // a file for one image (gallery: its gallery name), or files named as in the gallery, or a .zip of them
      const send = async (files, gallery) => {
        let kept = 0, skipped = [], failed = '';
        for (const f of files) {
          msg.textContent = `Uploading ${f.name}…`;
          try {
            const r = await fetch(`/admin/api/texercises?image=${encodeURIComponent(f.name)}&keys=${encodeURIComponent(keys)}${gallery ? `&gallery=${encodeURIComponent(gallery)}` : ''}`,
              { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/octet-stream' }, body: f });
            const d = await r.json().catch(() => ({}));
            if (r.ok) { kept += d.kept.length; skipped = skipped.concat(d.skipped); } else failed = d.error || r.statusText;
          } catch (e) { failed = e.message; }
        }
        msg.textContent = '';
        status(`Kept ${kept} image${kept === 1 ? '' : 's'}${skipped.length ? `; not of this sheet: ${skipped.join(', ')}` : ''}${failed ? `; ${failed}` : ''}.`, failed || skipped.length ? 'bad' : 'ok');
        refresh(true);
      };
      const file = el('input', { type: 'file', multiple: true, accept: 'image/*,.svg,.pdf,.zip', 'aria-label': 'Images to upload' });
      const upload = () => { if (!file.files.length) { msg.textContent = 'Choose the files first.'; return; } send([...file.files]); };
      const one = (x) => {
        const inp = el('input', { type: 'file', accept: 'image/*,.svg,.pdf', class: 'visually-hidden', 'aria-label': `Image ${x.name}` });
        inp.addEventListener('change', () => { if (inp.files.length) send([inp.files[0]], x.name); });
        return el('label', { class: 'button small' }, inp, x.have ? 'Replace…' : 'Upload…');
      };
      const fetchAll = async () => {
        let ok = 0, why = '';
        for (const x of missing) {
          msg.textContent = `Fetching ${x.name} from TeXercises…`;
          try { const d = await api('/admin/api/images/fetch', { name: x.name, keys: keys.split(',') }); if (d.ok) ok += 1; else why = d.error; } catch (e) { why = e.message; }
        }
        status(`Fetched ${ok} of ${missing.length} images from TeXercises.${why ? ` Not all: ${why}.` : ''}`, ok === missing.length ? 'ok' : 'bad');
        refresh(true);
      };
      box.replaceChildren(
        el('ul', { class: 'imglist' }, ...imgList.map((x) => el('li', {},
          el('span', { class: x.have ? 'ok' : 'bad' }, x.have ? '✓' : '✗'), ' ',
          el('code', {}, x.name), ' ',
          el('span', { class: 'note' }, `${x.exercises.join(' · ')} → ${x.have ? x.file : x.file + '.…'}`), ' ',
          x.have && !x.pdf ? el('span', { class: 'note' }, '(not in the PDF: LaTeX needs a PNG, JPEG or PDF of it)') : '',
          x.fetching ? el('span', { class: 'note' }, 'fetching from TeXercises…') : '',
          x.error && !x.fetching ? el('span', { class: 'note' }, `(not fetched: ${x.error})`) : '', ' ',
          x.have ? '' : el('a', { href: x.gallery, target: '_blank', rel: 'noopener' }, 'download from TeXercises ↗'), ' ', one(x)))),
        missing.some((x) => !x.fetching) ? el('div', { class: 'addapp' }, el('button', { type: 'button', onclick: fetchAll }, `Fetch the ${missing.length} missing from TeXercises`)) : '',
        el('div', { class: 'addapp' }, file, el('button', { type: 'button', onclick: upload }, 'Upload'), msg),
        el('p', { class: 'note' }, 'Missing images are fetched from TeXercises by themselves. Or upload an image at its line, or several at once (or a .zip) named as in the TeXercises gallery (any extension). Each is kept under a name made of its exercise’s title and id, as shown after the arrow. They show in the preview, the online version and the PDF.'));
      // ask again while the server fetches; once one has come, the previews are made anew
      if (imgList.some((x) => x.fetching)) {
        const had = imgList.filter((x) => x.have).length;
        setTimeout(() => {
          if (!box.isConnected) return;
          api(`/admin/api/images?keys=${encodeURIComponent(keys)}`).then((d) => {
            imgList = d.images; imgKeys = keys;
            if (d.images.filter((x) => x.have).length > had) { cur.exercises.forEach((k) => { delete previews[k]; }); render(); } else draw();
          }).catch(() => {});
        }, 2500);
      }
    };
    const refresh = (changed) => {
      api(`/admin/api/images?keys=${encodeURIComponent(keys)}`).then((d) => {
        imgList = d.images; imgKeys = keys;
        if (changed) { cur.exercises.forEach((k) => { delete previews[k]; }); render(); } else draw();
      }).catch((e) => box.replaceChildren(el('p', { class: 'error' }, `Could not list the images: ${e.message}`)));
    };
    if (imgList && imgKeys === keys) draw(); else { imgList = null; draw(); if (keys) refresh(); else { imgList = []; draw(); } }
    return box;
  }

  // ---------------------------------------------------------------- PDF and online version
  function output() {
    if (!cur.id || dirty) return el('p', { class: 'note' }, 'Save the sheet first: the PDF and the online version are made of the saved sheet.');
    const parts = [el('p', { class: 'links' },
      el('a', { href: `/admin/sheet/${cur.id}.pdf`, target: '_blank', rel: 'noopener' }, 'Download PDF ↗'),
      el('a', { href: `/admin/sheet/${cur.id}-solutions.pdf`, target: '_blank', rel: 'noopener' }, 'PDF with solutions ↗')),
    el('p', { class: 'note' }, st.latex ? 'Made when first opened (up to a minute), then kept until the sheet changes.' : 'LaTeX is not installed on the server: the PDFs cannot be made yet.')];
    if (cur.token) {
      const url = `${location.origin}/admin/sheet/s/${cur.token}`;
      const copied = el('span', { class: 'status' });
      parts.push(el('div', { class: 'share' },
        el('span', {}, 'Online version (no login, no solutions): '), el('a', { href: url, target: '_blank', rel: 'noopener', class: 'url' }, url),
        el('div', { class: 'addapp' },
          el('button', { type: 'button', onclick: () => { navigator.clipboard.writeText(url).then(() => { copied.textContent = 'Copied.'; }, () => { copied.textContent = 'Copy it from the link above.'; }); } }, 'Copy link'),
          el('button', { type: 'button', onclick: () => { if (confirm('Make a new link? The current one stops working.')) act('share'); } }, 'New link'),
          el('button', { type: 'button', onclick: () => { if (confirm('Stop sharing? The link stops working.')) act('unshare'); } }, 'Stop sharing'), copied)));
    } else {
      parts.push(el('div', { class: 'share' }, el('span', { class: 'note' }, 'Online version: a link for your students (no login needed, no solutions shown). '),
        el('button', { type: 'button', onclick: () => act('share') }, 'Create a link')));
    }
    return el('div', {}, ...parts);
  }

  // ---------------------------------------------------------------- loading and saving
  const body = () => ({ title: cur.title.trim(), lang: cur.lang, modules: cur.modules, exercises: cur.exercises });
  function apply(full) {
    cur = { id: full.id, title: full.title || '', lang: full.lang || 'en', modules: full.modules || [], exercises: full.exercises || [], token: full.token || null };
    plan = full.plan;
    dirty = false;
    $('#sheet-save').disabled = true;
  }
  async function replanNow(suggest, count) {
    if (!cur) return;
    busy = suggest;
    if (suggest) { status('Suggesting…'); render(); }
    try {
      const p = await api('/admin/api/plan', { sheet: body(), suggest, count });
      plan = p;
      if (suggest) { cur.exercises = p.exercises; openAlts.clear(); changed(); status(p.exercises.length ? `Suggested ${p.exercises.length} exercises: Save to keep them.` : 'No exercises are there for these objectives.', p.exercises.length ? '' : 'bad'); }
    } catch (e) { status(`Error: ${e.message}`, 'bad'); }
    busy = false;
    render();
  }
  function leave() { return !dirty || confirm('Discard the unsaved changes of this sheet?'); }
  async function open(id) {
    if (cur && cur.id === id) return;
    if (!leave()) return;
    try { apply(await api(`/admin/api/sheets/${id}`)); status(''); showPreview = false; render(); } catch (e) { status(`Could not open the sheet: ${e.message}`, 'bad'); }
  }
  function fresh() {
    if (!leave()) return;
    cur = { id: null, title: '', lang: 'en', modules: [], exercises: [], token: null };
    plan = null;
    showPreview = false;
    changed();
    render();
    const t = $('#sheet-edit input[type=text]');
    if (t) t.focus();
  }
  async function save() {
    if (!cur) return;
    $('#sheet-save').disabled = true;
    status('Saving…');
    try {
      const full = await api(cur.id ? `/admin/api/sheets/${cur.id}` : '/admin/api/sheets/new', cur.id ? { action: 'save', sheet: body() } : { sheet: body() });
      apply(full);
      await load(true);
      status('Saved.', 'ok');
    } catch (e) {
      $('#sheet-save').disabled = false;
      status(`Not saved: ${e.message}`, 'bad');
    }
  }
  async function act(action) {
    if (action === 'delete' && !confirm(`Delete the sheet “${cur.title || '(no title)'}”? Its online version stops working.`)) return;
    try {
      const d = await api(`/admin/api/sheets/${cur.id}`, { action });
      if (action === 'delete') { cur = null; plan = null; dirty = false; $('#sheet-save').disabled = true; status('Deleted.', 'ok'); }
      else if (action === 'duplicate') { const keep = dirty; dirty = false; await load(true); if (!keep) { await open(d.id); status('Duplicated: this is the copy.', 'ok'); return; } }
      else { cur.token = d.token; status(d.token ? 'The link is ready.' : 'Not shared any more.', 'ok'); }
      await load(true);
    } catch (e) { status(`Error: ${e.message}`, 'bad'); }
  }
  async function load(keep) {
    st = await api('/admin/api/sheets');
    loaded = true;
    renderState();
    if (!keep) render(); else renderList();
    if (keep && cur) render();
  }

  $('#sheet-save').addEventListener('click', save);
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  const show = (v) => { if (v === 'sheets' && !loaded) load().catch(() => status('Could not load the sheets.', 'bad')); };
  window.addEventListener('admin-view', (e) => show(e.detail));
  show(location.hash.slice(1));
})();
"""

ONLINE_JS = r"""
// The online version of a sheet: KaTeX sets the math (.tx-m inline, .tx-d displayed; what it cannot
// read stays as its source), and one exercise is shown at a time: the buttons, the numbers at the top,
// the arrow keys and swiping move between them, and the address (#a3) keeps the place. Figures still
// being drawn on the server: the page reloads itself (a few times) until they are there.
(function () {
  'use strict';
  function typeset() {
    if (!window.katex) return;
    document.querySelectorAll('.tx-m, .tx-d').forEach((e) => {
      const src = e.textContent;
      try { katex.render(src, e, { displayMode: e.classList.contains('tx-d'), throwOnError: true, strict: 'ignore' }); } catch (err) {
        const c = document.createElement('code');
        c.className = 'tx-raw';
        c.textContent = src;
        e.replaceChildren(c);
      }
    });
  }
  function slides() {
    const arts = [...document.querySelectorAll('.slides .exercise')];
    if (arts.length < 2) return;
    document.documentElement.classList.add('js');
    const pager = document.querySelector('.pager'), prev = pager.querySelector('.prev'), next = pager.querySelector('.next'), pos = pager.querySelector('.pos');
    const dots = [...document.querySelectorAll('.dots a')];
    pager.hidden = false;
    let cur = -1;
    const fromHash = () => { const m = /^#a(\d+)$/.exec(location.hash); const n = m ? Number(m[1]) - 1 : 0; return n >= 0 && n < arts.length ? n : 0; };
    function show(i, push) {
      i = Math.max(0, Math.min(arts.length - 1, i));
      if (i === cur) return;
      const first = cur < 0;
      cur = i;
      arts.forEach((a, j) => a.classList.toggle('current', j === i));
      dots.forEach((d, j) => { if (j === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
      prev.disabled = i === 0;
      next.disabled = i === arts.length - 1;
      pos.textContent = `${i + 1} / ${arts.length}`;
      if (push) history.replaceState(null, '', `#a${i + 1}`);
      if (!first) window.scrollTo(0, 0);
    }
    prev.addEventListener('click', () => show(cur - 1, true));
    next.addEventListener('click', () => show(cur + 1, true));
    dots.forEach((d, j) => d.addEventListener('click', (e) => { e.preventDefault(); show(j, true); }));
    window.addEventListener('hashchange', () => show(fromHash(), false));
    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { show(cur + 1, true); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { show(cur - 1, true); e.preventDefault(); }
      else if (e.key === 'Home') { show(0, true); } else if (e.key === 'End') { show(arts.length - 1, true); }
    });
    let x0 = null, y0 = 0;
    const box = document.querySelector('.slides');
    box.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      // a clear sideways swipe, not on something that scrolls sideways itself (a wide formula)
      if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy) && !(e.target.closest && e.target.closest('.tx-d, .tx-table'))) show(cur + (dx < 0 ? 1 : -1), true);
    });
    show(fromHash(), false);
  }
  function pending() {
    if (!document.querySelector('.exercise[data-pending]')) { try { sessionStorage.removeItem('lp-figures'); } catch (e) { /* none */ } return; }
    let n = 0;
    try { n = Number(sessionStorage.getItem('lp-figures') || 0); } catch (e) { /* no storage: reload anyway, a few times */ }
    if (n >= 20) return;
    try { sessionStorage.setItem('lp-figures', String(n + 1)); } catch (e) { return; }
    setTimeout(() => location.reload(), 4000);
  }
  function start() { typeset(); slides(); pending(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
"""

SETS_JS = r"""
// The sets of the admin panel, and the switch between its views (#quizzes, the first, and #games:
// links to them; #sets; #sheets: the exercise sheets, see sheets.js; #apps: the order and tags of the
// apps on the hub page, see admin.js). A set is
// { title, lang?, apps: [{ id, modes, objectives? }] } under its name; lang fixes the language
// ('en', 'de'; without it, the students choose); objectives lists the learning objectives (ids) of
// the app in the set, all of them without the list. The objectives of an app, with their worked
// examples and practice topics (its outline), come from the app itself, loaded with ?outline=1 in a
// hidden frame that posts them here. An app of a set saved before there were objectives may list
// worked examples (tutor: indices) and practice stages (practice: keys) instead: they stay until
// objectives are chosen for it.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const MODES = { tutor: 'Tutor', practice: 'Practice', check: 'Check' };
  const KEY = /^[a-z0-9][a-z0-9-]{0,39}$/, MAX_TITLE = 80;
  let apps = [], sets = [], sel = -1, dirty = false, loaded = false;
  const outlines = {}; // app id → Promise of its outline
  const shown = new Set(); // apps whose sections are open, as 'set index:app id'
  const added = new Map(); // set → the app last added to it, whose next one the list of apps offers first
  const LANGS = { '': 'English or German (students choose)', en: 'English only', de: 'German only' };

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === false || v == null) return;
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    });
    kids.forEach((k) => e.append(k));
    return e;
  }
  const appOf = (id) => apps.find((a) => a.id === id) || { id, name: id, modes: [] };
  const status = (text, cls) => { const e = $('#sets-status'); e.textContent = text; e.className = `status ${cls || ''}`; };
  // why a name cannot be, or ''
  function problem(i) {
    const n = sets[i].name;
    if (!KEY.test(n)) return 'A name has lower-case letters, digits and hyphens (up to 40), e.g. 3a-elektro.';
    if (apps.some((a) => a.id === n)) return `“${n}” is the name of an app.`;
    if (sets.some((s, j) => j !== i && s.name === n)) return `Two sets are called “${n}”.`;
    return '';
  }
  function changed() {
    dirty = true;
    const bad = sets.map((_, i) => problem(i)).find(Boolean);
    $('#sets-save').disabled = !!bad;
    status(bad || 'Unsaved changes', bad ? 'bad' : '');
  }

  // ---------------------------------------------------------------- the outline of an app
  function outline(id) {
    if (outlines[id]) return outlines[id];
    outlines[id] = new Promise((resolve, reject) => {
      const frame = el('iframe', { class: 'outline-frame', src: `/${id}/?outline=1&lang=en`, title: 'outline', 'aria-hidden': 'true', tabindex: '-1' });
      const done = (v) => { clearTimeout(timer); window.removeEventListener('message', on); frame.remove(); if (v) resolve(v); else reject(new Error('no outline')); };
      const on = (e) => { if (e.origin === location.origin && e.source === frame.contentWindow && e.data && e.data.type === 'lp-outline') done(e.data); };
      const timer = setTimeout(() => done(null), 20000);
      window.addEventListener('message', on);
      document.body.append(frame);
    });
    outlines[id].catch(() => { delete outlines[id]; });
    return outlines[id];
  }

  // ---------------------------------------------------------------- the list and the editor
  function render(focus) {
    $('#set-list').replaceChildren(
      ...sets.map((s, i) => el('button', { type: 'button', 'aria-pressed': String(i === sel), onclick: () => { sel = i; render(); } },
        s.name || '(no name)', s.title ? el('span', { class: 'title' }, s.title) : '')),
      el('button', { type: 'button', class: 'new', onclick: () => add() }, '+ New set'));
    const box = $('#set-edit');
    if (sel < 0 || !sets[sel]) {
      box.replaceChildren(el('p', { class: 'empty' }, sets.length ? 'Choose a set to edit it, or make a new one.' : 'No sets yet: make one with New set.'));
      return;
    }
    const s = sets[sel], i = sel;
    const name = el('input', { type: 'text', value: s.name, maxlength: '40', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'set-url', class: problem(i) ? 'bad' : '' });
    name.addEventListener('input', () => {
      s.name = name.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (name.value !== s.name) name.value = s.name;
      name.classList.toggle('bad', !!problem(i));
      $('#set-url').replaceWith(el('span', { class: 'note', id: 'set-url' }, `learningphysics.ch/${s.name}`)); // a link once saved
      changed();
      renderList();
    });
    const title = el('input', { type: 'text', value: s.title, maxlength: String(MAX_TITLE), placeholder: 'e.g. Klasse 3a · Elektrizität' });
    title.addEventListener('input', () => { s.title = title.value; changed(); renderList(); });
    const lang = el('select', {}, ...Object.entries(LANGS).map(([k, t]) => el('option', { value: k, selected: (s.lang || '') === k }, t)));
    lang.addEventListener('change', () => { if (lang.value) s.lang = lang.value; else delete s.lang; changed(); });
    // the apps not in the set, in the standard order; first the one after the app last added
    const unused = apps.filter((a) => !s.apps.some((x) => x.id === a.id));
    const last = apps.findIndex((a) => a.id === (added.get(s) || (s.apps.length ? s.apps[s.apps.length - 1].id : null)));
    const next = unused.find((a) => apps.indexOf(a) > last) || unused[0];
    const pick = el('select', { 'aria-label': 'App to add' }, ...unused.map((a) => el('option', { value: a.id, selected: a === next }, a.name)));
    box.replaceChildren(el('div', { class: 'card' },
      el('div', { class: 'setform' },
        el('label', { class: 'field' }, el('span', {}, 'Name (the address)'), name),
        el('label', { class: 'field' }, el('span', {}, 'Title on the set’s page (optional)'), title),
        el('label', { class: 'field' }, el('span', {}, 'Language'), lang)),
      el('div', { class: 'setactions' },
        s.saved && s.saved === s.name ? el('a', { href: `/${s.name}`, target: '_blank', rel: 'noopener', id: 'set-url' }, `learningphysics.ch/${s.name} ↗`) : el('span', { class: 'note', id: 'set-url' }, `learningphysics.ch/${s.name}`),
        el('button', { type: 'button', onclick: () => duplicate(i) }, 'Duplicate'),
        el('button', { type: 'button', class: 'danger', onclick: () => remove(i) }, 'Delete set')),
      s.apps.length ? el('ol', { class: 'setapps' }, ...s.apps.map((a, k) => appRow(s, a, k))) : el('p', { class: 'empty' }, 'No apps yet: add some below.'),
      unused.length ? el('div', { class: 'addapp' }, pick,
        el('button', { type: 'button', onclick: () => { s.apps.push({ id: pick.value, modes: [...appOf(pick.value).modes] }); added.set(s, pick.value); changed(); render({ add: true }); } }, 'Add app'),
        el('button', { type: 'button', onclick: () => { unused.forEach((a) => s.apps.push({ id: a.id, modes: [...a.modes] })); changed(); render(); } }, 'Add all')) : ''));
    if (focus && focus.name) name.focus();
    if (focus && focus.add) { const p = box.querySelector('.addapp select'); if (p) p.focus(); }
    if (focus && focus.dropped != null) { const b = box.querySelectorAll('.setapp')[focus.dropped]; if (b) b.classList.add('moved'); }
    if (focus && focus.move) { const b = box.querySelectorAll('.setapp')[focus.move.k]; if (b) b.querySelectorAll('.move button')[focus.move.up ? 0 : 1].focus(); }
  }
  // only the buttons of the list (typing in the editor keeps its focus)
  function renderList() {
    $('#set-list').querySelectorAll('button[aria-pressed]').forEach((b, i) => {
      b.replaceChildren(sets[i].name || '(no name)', sets[i].title ? el('span', { class: 'title' }, sets[i].title) : '');
    });
  }

  function appRow(s, a, k) {
    const info = appOf(a.id), key = `${sel}:${a.id}`;
    const move = (d) => { const j = k + d; [s.apps[k], s.apps[j]] = [s.apps[j], s.apps[k]]; changed(); render({ move: { k: j, up: d < 0 } }); };
    const modes = el('div', { class: 'checks', role: 'group', 'aria-label': `Modes of ${info.name}` }, ...info.modes.map((m) => {
      const box = el('input', { type: 'checkbox', checked: a.modes.includes(m) });
      box.addEventListener('change', () => {
        a.modes = info.modes.filter((x) => (x === m ? box.checked : a.modes.includes(x)));
        changed();
        render();
      });
      return el('label', {}, box, MODES[m]);
    }));
    const det = el('details', { class: 'sections', open: shown.has(key) });
    det.append(el('summary', {}, `Learning objectives: ${summary(a)}`));
    det.addEventListener('toggle', () => { if (det.open) { shown.add(key); fill(det, a); } else shown.delete(key); });
    if (det.open) fill(det, a);
    return el('li', { class: 'setapp' },
      el('div', { class: 'move' },
        el('button', { type: 'button', 'aria-label': `Move ${info.name} up`, disabled: k === 0, onclick: () => move(-1) }, '↑'),
        AdminDrag.handle((from, to) => { s.apps.splice(to, 0, s.apps.splice(from, 1)[0]); changed(); render({ dropped: to }); }),
        el('button', { type: 'button', 'aria-label': `Move ${info.name} down`, disabled: k === s.apps.length - 1, onclick: () => move(1) }, '↓')),
      el('div', {},
        el('div', { class: 'head' }, el('h3', {}, info.name),
          el('button', { type: 'button', class: 'remove', 'aria-label': `Remove ${info.name} from the set`, onclick: () => { s.apps.splice(k, 1); changed(); render(); } }, '×')),
        modes,
        a.modes.length ? '' : el('p', { class: 'note' }, 'No mode chosen: the app is left out when saved.'),
        a.modes.length ? det : ''));
  }
  // an app of a set saved before there were objectives: its worked examples and steps
  const before = (a) => !a.objectives && (Array.isArray(a.tutor) || Array.isArray(a.practice));
  function summary(a) {
    const n = (appOf(a.id).objectives || []).length;
    if (a.objectives) return `${a.objectives.length}${n ? ` of ${n}` : ''} chosen`;
    if (before(a)) return 'examples and steps chosen before there were objectives';
    return n ? `all ${n}` : 'all';
  }

  // the objectives to tick, once the app's outline is there
  function fill(det, a) {
    const body = el('div', {}, el('p', { class: 'note' }, 'Loading the learning objectives of the app…'));
    det.querySelectorAll('summary ~ *').forEach((x) => x.remove());
    det.append(body);
    outline(a.id).then((o) => {
      if (!o.objectives || !o.objectives.length) {
        body.replaceChildren(el('p', { class: 'note' }, 'This app has no learning objectives to choose.'));
        return;
      }
      const all = o.objectives.map((x) => x.id);
      // a set saved before: the objectives whose worked example or practice topic it had chosen
      const topicOn = (t) => !!o.topics[t] && o.topics[t].stages.some((st) => a.practice.includes(st.key));
      const oldOn = (x) => (Array.isArray(a.tutor) && a.tutor.includes(x.tutor)) || (Array.isArray(a.practice) && topicOn(x.topic));
      const on = (x) => (a.objectives ? a.objectives.includes(x.id) : before(a) ? oldOn(x) : true);
      const where = (x) => [
        x.tutor != null && o.tutor[x.tutor] ? `worked example ${x.tutor + 1}: ${o.tutor[x.tutor]}` : '',
        x.topic != null && o.topics[x.topic] ? `practice: ${o.topics[x.topic].name}` : '',
      ].filter(Boolean).join(' · ');
      const ticked = o.objectives.filter(on).length;
      const parts = [el('ul', { class: 'tree' }, ...o.objectives.map((x) => {
        // at least one stays ticked: none would be the same as all
        const box = el('input', { type: 'checkbox', checked: on(x), disabled: on(x) && ticked === 1 });
        box.addEventListener('change', () => {
          const list = o.objectives.filter((y) => (y === x ? box.checked : on(y))).map((y) => y.id);
          if (list.length === all.length) delete a.objectives; else a.objectives = list;
          delete a.tutor; delete a.practice; // the choice of a set saved before goes
          det.querySelector('summary').textContent = `Learning objectives: ${summary(a)}`;
          changed();
          fill(det, a);
        });
        return el('li', {}, el('label', {}, box, x.name), where(x) ? el('div', { class: 'where' }, where(x)) : '');
      }))];
      parts.push(el('p', { class: 'note' }, 'The app shows the worked examples of the objectives ticked, offers practice in their topics, and its check asks only them.'));
      if (before(a)) parts.push(el('p', { class: 'note' }, 'This app was put in the set before there were objectives: it still shows the worked examples and steps chosen then (ticked here: the objectives they belong to). Ticking objectives replaces that choice.'));
      body.replaceChildren(...parts);
    }).catch(() => {
      body.replaceChildren(el('p', { class: 'error' }, 'Could not load the learning objectives of this app.'),
        el('button', { type: 'button', onclick: () => fill(det, a) }, 'Try again'));
    });
  }

  // ---------------------------------------------------------------- sets
  function fresh(base) {
    let n = 1;
    while (sets.some((s) => s.name === `${base}${n > 1 ? `-${n}` : ''}`)) n++;
    return `${base}${n > 1 ? `-${n}` : ''}`;
  }
  function add() {
    sets.push({ name: fresh('neues-set'), title: '', apps: [], saved: null });
    sel = sets.length - 1;
    changed();
    render({ name: true });
  }
  function duplicate(i) {
    const copy = JSON.parse(JSON.stringify(sets[i]));
    copy.name = fresh(`${sets[i].name}-kopie`.slice(0, 34));
    copy.saved = null;
    sets.splice(i + 1, 0, copy);
    sel = i + 1;
    changed();
    render({ name: true });
  }
  function remove(i) {
    if (!confirm(`Delete the set “${sets[i].name}”? Its address stops working once you save.`)) return;
    sets.splice(i, 1);
    sel = Math.min(i, sets.length - 1);
    changed();
    render();
  }

  function apply(data, keepSel) {
    const before = sel >= 0 && sets[sel] ? sets[sel].name : null;
    apps = data.apps || [];
    sets = Object.entries(data.sets || {}).map(([name, s]) => ({ name, title: s.title || '', ...(s.lang ? { lang: s.lang } : {}), apps: s.apps || [], saved: name }));
    sel = keepSel && before ? sets.findIndex((s) => s.name === before) : sets.length ? 0 : -1;
    if (sel < 0 && sets.length) sel = 0;
    dirty = false;
    $('#sets-save').disabled = true;
    render();
  }
  async function load() {
    const r = await fetch('/admin/api/sets', { credentials: 'same-origin' });
    if (r.status === 403) { location.reload(); return; }
    apply(await r.json());
    loaded = true;
  }
  async function save() {
    const bad = sets.map((_, i) => problem(i)).find(Boolean);
    if (bad) { status(bad, 'bad'); return; }
    $('#sets-save').disabled = true;
    status('Saving…');
    try {
      const body = { sets: Object.fromEntries(sets.map((s) => [s.name, { title: s.title.trim(), ...(s.lang ? { lang: s.lang } : {}), apps: s.apps }])) };
      const r = await fetch('/admin/api/sets', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 403) { status('Logged out: log in again (your changes are lost on reload)', 'bad'); $('#sets-save').disabled = false; return; }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      apply(await r.json(), true);
      status('Saved. The sets are live at their addresses.', 'ok');
    } catch (e) {
      $('#sets-save').disabled = false;
      status(`Not saved: ${e.message}`, 'bad');
    }
  }

  // ---------------------------------------------------------------- the views
  function view() {
    const v = ['#games', '#sets', '#sheets', '#apps'].includes(location.hash) ? location.hash.slice(1) : 'quizzes';
    ['quizzes', 'games', 'sets', 'sheets', 'apps'].forEach((x) => { $(`#view-${x}`).hidden = v !== x; });
    document.querySelectorAll('.tabs a').forEach((a) => { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (v === 'sets' && !loaded) load().catch(() => status('Could not load the sets.', 'bad'));
    window.dispatchEvent(new CustomEvent('admin-view', { detail: v })); // the sheets load when shown (sheets.js)
  }
  window.addEventListener('hashchange', view);
  $('#sets-save').addEventListener('click', save);
  // the standard order, saved in the other view: the list of apps to add follows it
  window.addEventListener('admin-order', (e) => {
    const order = e.detail || [];
    apps = [...apps].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    if (loaded) render();
  });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  view();
})();
"""


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Admin panel of the learningphysics.ch hub (tags and order of the apps, sets for classes).")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8040)
    p.add_argument("--password-file", type=Path, required=True, help="the teacher password hash (crosswords-web set-password)")
    p.add_argument("--hub", type=Path, required=True, help="the hub page, whose cards list the apps")
    p.add_argument("--config", type=Path, required=True, help="where to write apps.json (served as /apps.json)")
    p.add_argument("--sets", type=Path, help="where to write sets.json (served as /sets.json; default: next to apps.json)")
    args = p.parse_args(argv)
    admin = Admin(args.password_file, args.hub, args.config, args.sets)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(admin))
    print(f"hub admin on http://{args.host}:{args.port}/", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
