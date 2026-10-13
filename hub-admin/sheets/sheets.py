"""Exercise sheets (used by ../hubadmin.py): which exercises a sheet suggests, their alternatives,
and the PDF made from them with build_sheet.py and LuaLaTeX.

A sheet names modules (apps of the hub) and, per module, the learning objectives it practises.
pool.json (build_pool.py, reviewed by hand) lists for every app and objective the TeXercises
exercises that practise it, best first, with their language, difficulty (1 easy, 2 average, 3 and
more hard) and whether they have an image. suggest() fills a sheet from it: round by round over the
chosen objectives (in the modules' order), each objective that has fewer exercises than the round's
number gets one more, so every objective has one before any has two; of an objective's exercises it
takes one in the sheet's language first, then one without image, then the difficulty the sheet
lacks most for a mix of about MIX (30 % easy, 50 % average, 20 % hard), then the pool's order. A
module without objectives in the pool counts as one objective with all its exercises. By default
PER_OBJECTIVE per objective, at most DEFAULT_MAX; the teacher may ask for another number (up to
MAX_EXERCISES). The suggestion depends only on the sheet and the pool, so it is the same every time.
alternatives() lists, for an exercise of a sheet, others of the same objectives not on the sheet:
the sheet's language first, then a similar difficulty.

The exercises themselves come from the TeXercises export uploaded in the admin panel (only the
teacher's own, see store_export) and from the drafts that deploy.sh puts next to this file
(drafts/); only those can be on a sheet. PDFs are cached by a hash of everything they are made of
and built in the background (request_pdf).

Images: TeXercises does not export its gallery images. The teacher uploads them in the admin panel
(store_images: files or a .zip, named as in the gallery; each is kept under a name made of its
exercise's title and id, image_stem) or the server fetches them from TeXercises
(fetch_image: TeXercises asks for no login from Switzerland, where the server is); they are kept in one folder
(hub-data/sheet-images/) that the PDF (images/ next to the .tex) and the pages use.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import threading
import unicodedata
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
PER_OBJECTIVE, DEFAULT_MAX, MAX_EXERCISES = 2, 24, 40
MIX = {1: 0.3, 2: 0.5, 3: 0.2}  # easy, average, hard (3 and more)
AUTHOR, SCHOOL = "ByS", "MNG Rämibühl"  # the PDF's footer and the online version's
ENGINE = ("texercises-lp.sty", "lp-minion.sty", "build_sheet.py")
KEY = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,120}")
TEX_FILES = ("exercise.json", "preamble.tex", "text.tex", "solution.tex", "short_solution.tex")
MAX_UPLOAD = 64 * 1024 * 1024
LATEX_TIMEOUT = 150  # s
IMAGE_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,150}")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".pdf")
WEB_EXT = IMAGE_EXT[:-1]  # what a browser shows (not .pdf)
LATEX_EXT = (".png", ".jpg", ".jpeg", ".pdf")  # what LaTeX reads
INDEX = "index.json"  # in the images folder: gallery name -> file
MAX_IMAGE = 10 * 1024 * 1024
GALLERY = "https://texercises.com/gallery/image/file/{}/"

_locks: Dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _lock(name: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(name, threading.Lock())


def load_pool(path: Path = HERE / "pool.json") -> Dict[str, object]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("apps", {}) if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def sources(export: Path) -> List[Path]:
    """The folders with exercises (each has exercises/<key>/): the uploaded export, the drafts."""
    return [p for p in (export, HERE / "drafts") if (p / "exercises").is_dir()]


def available(export: Path) -> Dict[str, Path]:
    out: Dict[str, Path] = {}
    for src in sources(export):
        for d in sorted((src / "exercises").iterdir()):
            if d.is_dir() and KEY.fullmatch(d.name) and (d / "exercise.json").is_file():
                out.setdefault(d.name, d)
    return out


def level(difficulty: object) -> int:
    """1 easy, 2 average, 3 hard (difficulty 3 and more)."""
    d = difficulty if isinstance(difficulty, int) and not isinstance(difficulty, bool) else 1
    return min(max(d, 1), 3)


def info(pool: Dict[str, object], key: str, apps: Optional[List[str]] = None) -> Optional[Tuple[str, Dict[str, object]]]:
    """(app, the pool's entry) of an exercise: of the first of apps (the sheet's modules) that has it, else
    of any app; None if the pool does not know it."""
    for app in list(apps or []) + list(pool):
        entry = pool.get(app)
        exs = entry.get("exercises", {}) if isinstance(entry, dict) else {}
        if key in exs:
            return app, exs[key]
    return None


def targets(modules: List[Dict[str, object]], pool: Dict[str, object]) -> List[Tuple[str, Optional[str]]]:
    """What a sheet practises: (app, objective) for the chosen objectives of each module that the pool
    has exercises for, in the modules' order; (app, None), the app as a whole, for a module without."""
    out: List[Tuple[str, Optional[str]]] = []
    for m in modules:
        entry = pool.get(m.get("id")) if isinstance(m, dict) else None
        if not isinstance(entry, dict):
            continue
        objs = entry.get("objectives", {})
        wanted = [o for o in m.get("objectives", []) if objs.get(o)]
        if wanted:
            out += [(m["id"], o) for o in wanted]
        elif not any(objs.values()) and entry.get("exercises"):
            out.append((m["id"], None))
    return out


def candidates(target: Tuple[str, Optional[str]], pool: Dict[str, object], have) -> List[str]:
    """The exercises of a target that are there (have: their keys), best first (the pool's order)."""
    app, ob = target
    entry = pool.get(app, {})
    keys = entry.get("objectives", {}).get(ob, []) if ob else list(entry.get("exercises", {}))
    return [k for k in keys if k in have]


def covers(key: str, tgts: List[Tuple[str, Optional[str]]], pool: Dict[str, object]) -> List[Tuple[str, Optional[str]]]:
    """The targets an exercise practises."""
    out = []
    for app, ob in tgts:
        entry = pool.get(app, {})
        if (ob and key in entry.get("objectives", {}).get(ob, [])) or (ob is None and key in entry.get("exercises", {})):
            out.append((app, ob))
    return out


def default_count(modules: List[Dict[str, object]], pool: Dict[str, object], have) -> int:
    n = sum(1 for t in targets(modules, pool) if candidates(t, pool, have))
    return max(1, min(DEFAULT_MAX, PER_OBJECTIVE * n))


def mix(count: int) -> Dict[int, int]:
    """How many easy, average and hard exercises a sheet of count aims for (largest remainders)."""
    raw = {d: count * f for d, f in MIX.items()}
    out = {d: int(v) for d, v in raw.items()}
    for d in sorted(raw, key=lambda d: raw[d] - out[d], reverse=True)[:count - sum(out.values())]:
        out[d] += 1
    return out


def suggest(modules: List[Dict[str, object]], lang: str, pool: Dict[str, object], have,
            count: Optional[int] = None) -> List[str]:
    """A balanced sheet (the exercises' keys, in the sheet's order): see the module's description. The
    exercises come by module, from easy to hard."""
    tgts = targets(modules, pool)
    count = default_count(modules, pool, have) if count is None else max(1, min(int(count), MAX_EXERCISES))
    want = mix(count)
    lists = {t: candidates(t, pool, have) for t in tgts}
    chosen: List[str] = []
    meta: Dict[str, Dict[str, object]] = {}
    for t, keys in lists.items():
        for k in keys:
            meta.setdefault(k, pool[t[0]]["exercises"].get(k, {}))
    got = {d: 0 for d in want}
    covered = {t: 0 for t in tgts}
    rounds = 0
    while len(chosen) < count:
        added = False
        for t in tgts:
            if len(chosen) >= count:
                break
            if covered[t] > rounds:
                continue
            free = [k for k in lists[t] if k not in chosen]
            if not free:
                continue
            k = min(free, key=lambda k: (meta[k].get("lang") != lang, bool(meta[k].get("images")),
                                         -(want[level(meta[k].get("difficulty"))] - got[level(meta[k].get("difficulty"))]),
                                         lists[t].index(k)))
            chosen.append(k)
            got[level(meta[k].get("difficulty"))] += 1
            for c in covers(k, tgts, pool):
                covered[c] += 1
            added = True
        if not added:
            if all(not [k for k in lists[t] if k not in chosen] for t in tgts):
                break
        rounds += 1
        if rounds > MAX_EXERCISES + 1:
            break
    apps = [m["id"] for m in modules]
    first = {k: n for n, k in enumerate(chosen)}

    def where(k: str) -> int:
        found = info(pool, k, apps)
        return apps.index(found[0]) if found and found[0] in apps else len(apps)
    return sorted(chosen, key=lambda k: (where(k), level(meta[k].get("difficulty")), first[k]))


def alternatives(key: str, sheet: List[str], modules: List[Dict[str, object]], lang: str, pool: Dict[str, object],
                 have, limit: int = 5) -> List[str]:
    """Up to limit exercises to take instead of key: of the same objectives of the sheet (of its module, if
    it practises none of them), not on the sheet, those there; the sheet's language first, then by how
    near their difficulty is, without image first, those that share more objectives, the pool's order."""
    tgts = targets(modules, pool)
    mine = covers(key, tgts, pool)
    if not mine:
        found = info(pool, key, [m["id"] for m in modules])
        mine = [(found[0], None)] if found else []
    d = level((info(pool, key) or ("", {}))[1].get("difficulty"))
    order: Dict[str, Tuple[int, int]] = {}
    for t in mine:
        for n, k in enumerate(candidates(t, pool, have)):
            if k != key and k not in sheet:
                shared, first = order.get(k, (0, n))
                order[k] = (shared + 1, min(first, n))

    def rank(k: str):
        e = (info(pool, k) or ("", {}))[1]
        return (e.get("lang") != lang, abs(level(e.get("difficulty")) - d), bool(e.get("images")), -order[k][0], order[k][1], k)
    return sorted(order, key=rank)[:limit]


def collection(title: str, chosen: List[Tuple[str, str]], names: Dict[str, str]) -> Dict[str, object]:
    """The collection build_sheet.py reads: the exercises, a section where the app changes."""
    items, containers, last = [], [], None
    for n, (app, key) in enumerate(chosen, 1):
        if app != last:
            containers.append({"first": n, "title": names.get(app, app)})
            last = app
        items.append({"exercise": key})
    return {"title": title, "items": items, "containers": containers}


def fingerprint(coll: Dict[str, object], have: Dict[str, Path], part: str, opts: Dict[str, str],
                images: Optional[Path] = None) -> str:
    h = hashlib.sha256()
    h.update(json.dumps([coll, part, opts], sort_keys=True, ensure_ascii=False).encode("utf-8"))
    if images and images.is_dir():  # an image uploaded later makes a new PDF
        for f in sorted(images.iterdir()):
            st = f.stat()
            h.update(f"{f.name}:{st.st_size}:{int(st.st_mtime)}".encode("utf-8"))
    for name in ENGINE:
        h.update((HERE / name).read_bytes())
    for item in coll["items"]:
        d = have[item["exercise"]]
        for f in TEX_FILES:
            p = d / f
            h.update(p.read_bytes() if p.is_file() else b"-")
    return h.hexdigest()[:32]


def lualatex() -> Optional[str]:
    return shutil.which("lualatex")


def make_pdf(title: str, chosen: List[Tuple[str, str]], names: Dict[str, str], export: Path, cache: Path,
             part: str = "exercises", opts: Optional[Dict[str, str]] = None,
             images: Optional[Path] = None) -> Tuple[Optional[bytes], str]:
    """(pdf, '') or (None, reason). chosen: [(app, key)] in the sheet's order (a section where the app
    changes); part: 'exercises' or 'both' (with the solutions); opts: build_sheet.py's author, school,
    date, footer, lang."""
    opts = opts or {}
    have = available(export)
    chosen = [(a, k) for a, k in chosen if k in have]
    if not chosen:
        return None, "no exercises on this sheet are there (upload the TeXercises export)"
    coll = collection(title, chosen, names)
    key = fingerprint(coll, have, part, opts, images)
    cache.mkdir(parents=True, exist_ok=True)
    target = cache / f"{key}.pdf"
    with _lock(key):
        if target.is_file():
            return target.read_bytes(), ""
        tex = lualatex()
        if not tex:
            return None, "LaTeX is not installed on the server"
        with tempfile.TemporaryDirectory(prefix="sheet-") as tmp:
            work = Path(tmp)
            if images and images.is_dir():  # build_sheet.py points the gallery images to images/<name>
                (work / "images").mkdir()
                for name, f in latex_links(images).items():  # by gallery name, what LaTeX can read
                    (work / "images" / name).symlink_to(f.resolve())
            (work / "coll.json").write_text(json.dumps(coll, ensure_ascii=False), encoding="utf-8")
            args = [sys.executable, str(HERE / "build_sheet.py"), os.pathsep.join(str(s) for s in sources(export)),
                    str(work / "coll.json"), str(work / "sheet.tex"), "--font=modern", f"--part={part}"]
            args += [f"--{k}={v}" for k, v in opts.items() if k in ("author", "school", "date", "footer", "lang")]
            r = subprocess.run(args, capture_output=True, text=True, timeout=60)
            if r.returncode != 0:
                return None, "the sheet could not be written: " + (r.stderr.strip().splitlines() or ["?"])[-1]
            env = dict(os.environ, TEXINPUTS=f"{HERE}//:", TEXMFVAR=str(cache.parent / "texmf-var"),
                       TEXMFCACHE=str(cache.parent / "texmf-var"), HOME=str(cache.parent))
            try:
                subprocess.run([tex, "-interaction=nonstopmode", "sheet.tex"], cwd=work, env=env,
                               capture_output=True, timeout=LATEX_TIMEOUT)
            except subprocess.TimeoutExpired:
                return None, "LaTeX took too long"
            pdf = work / "sheet.pdf"
            if not pdf.is_file():
                log = (work / "sheet.log").read_text(encoding="utf-8", errors="replace") if (work / "sheet.log").is_file() else ""
                first = re.search(r"^! (.*)$", log, re.M)
                return None, "LaTeX did not produce a PDF" + (f" ({first.group(1).strip()})" if first else "")
            data = pdf.read_bytes()
            tmp_target = cache / f".{key}.tmp"
            tmp_target.write_bytes(data)
            os.replace(tmp_target, target)
            prune(cache)
            return data, ""


_jobs: Dict[str, Dict[str, object]] = {}  # PDFs being made: hash -> {"done": bool, "error": str}


def request_pdf(title: str, chosen: List[Tuple[str, str]], names: Dict[str, str], export: Path, cache: Path,
                part: str = "exercises", opts: Optional[Dict[str, str]] = None,
                images: Optional[Path] = None) -> Tuple[str, object]:
    """The PDF if it is made: ("ready", pdf); else it is made in the background: ("building", None) until
    it is there, ("error", reason) once if it fails (asked again, it is tried again)."""
    opts = opts or {}
    have = available(export)
    present = [(a, k) for a, k in chosen if k in have]
    if not present:
        return "error", "no exercises on this sheet are there (upload the TeXercises export)"
    key = fingerprint(collection(title, present, names), have, part, opts, images)
    target = cache / f"{key}.pdf"
    if target.is_file():
        return "ready", target.read_bytes()
    with _locks_guard:
        job = _jobs.get(key)
        if job and not job["done"]:
            return "building", None
        if job and job["error"]:
            del _jobs[key]
            return "error", job["error"]
        if not lualatex():
            return "error", "LaTeX is not installed on the server"
        job = _jobs[key] = {"done": False, "error": ""}

    def run() -> None:
        try:
            pdf, why = make_pdf(title, chosen, names, export, cache, part, opts, images)
        except (OSError, subprocess.SubprocessError) as e:
            pdf, why = None, f"the sheet could not be made ({e.__class__.__name__})"
        with _locks_guard:
            job["error"], job["done"] = ("" if pdf else why or "failed"), True
            if pdf:
                _jobs.pop(key, None)
    threading.Thread(target=run, daemon=True).start()
    return "building", None


def prune(cache: Path, keep: int = 200) -> None:
    files = sorted(cache.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
    for p in files[keep:]:
        try:
            p.unlink()
        except OSError:
            pass


def store_export(data: bytes, export: Path, own: str) -> Dict[str, int]:
    """Unpack an uploaded TeXercises export (.zip or .tgz) into export/: only the exercises created by `own`
    (info.creator in exercise.json) and only their .json/.tex files. Replaces what was there."""
    if len(data) > MAX_UPLOAD:
        raise ValueError("the file is too large")
    groups: Dict[str, Dict[str, bytes]] = {}

    def take(name: str, size: int, read) -> None:
        parts = [p for p in name.replace("\\", "/").split("/") if p]
        if len(parts) < 3 or parts[-3] != "exercises" or parts[-1] not in TEX_FILES:
            return
        key = parts[-2]
        if KEY.fullmatch(key) and size <= 2 * 1024 * 1024:
            groups.setdefault(key, {})[parts[-1]] = read()

    if data[:2] == b"\x1f\x8b":  # a .tgz
        try:
            with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tf:
                for m in tf.getmembers():
                    if m.isfile():
                        take(m.name, m.size, lambda m=m: tf.extractfile(m).read())
        except (tarfile.TarError, OSError):
            raise ValueError("not a TeXercises export (.zip or .tgz)")
    else:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                for info in zf.infolist():
                    if not info.is_dir():
                        take(info.filename, info.file_size, lambda info=info: zf.read(info))
        except zipfile.BadZipFile:
            raise ValueError("not a TeXercises export (.zip or .tgz)")
    kept = skipped = 0
    tmp = export.parent / (export.name + ".new")
    shutil.rmtree(tmp, ignore_errors=True)
    (tmp / "exercises").mkdir(parents=True)
    for key, files in groups.items():
        try:
            meta = json.loads(files.get("exercise.json", b"{}").decode("utf-8"))
        except ValueError:
            skipped += 1
            continue
        if not isinstance(meta, dict) or (meta.get("info") or {}).get("creator") != own:
            skipped += 1
            continue
        d = tmp / "exercises" / key
        d.mkdir()
        for name, content in files.items():
            (d / name).write_bytes(content)
        kept += 1
    if not kept:
        shutil.rmtree(tmp, ignore_errors=True)
        raise ValueError(f"no exercises by '{own}' in the file")
    old = export.parent / (export.name + ".old")
    shutil.rmtree(old, ignore_errors=True)
    if export.exists():
        os.replace(export, old)
    os.replace(tmp, export)
    shutil.rmtree(old, ignore_errors=True)
    return {"exercises": kept, "skipped": skipped}


# ---------------------------------------------------------------------- images
def image_kind(data: bytes) -> Optional[str]:
    """The extension of an image file by its first bytes, or None if it is none of IMAGE_EXT."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    if data[:5] == b"%PDF-":
        return ".pdf"
    head = data[:2048].lstrip(b"\xef\xbb\xbf \t\r\n").lower()
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") or head.startswith(b"<!--")) and b"<svg" in head:
        return ".svg"
    return None


def valid_name(name: str) -> bool:
    return bool(IMAGE_NAME.fullmatch(name or "")) and ".." not in name


def _index(images: Path) -> Dict[str, str]:
    """index.json: gallery name -> the file it is kept as (named after its exercise)."""
    try:
        data = json.loads((images / INDEX).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {g: f for g, f in data.items() if isinstance(g, str) and isinstance(f, str) and valid_name(g) and valid_name(f)} \
        if isinstance(data, dict) else {}


def _write_index(images: Path, index: Dict[str, str]) -> None:
    tmp = images / f".{INDEX}.tmp"
    tmp.write_text(json.dumps(index, indent=1, sort_keys=True, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, images / INDEX)


def find_image(images: Path, name: str, latex: bool = False) -> Optional[Path]:
    """The file a gallery image is kept as, one a browser shows (latex: one LaTeX reads, an SVG's PDF
    copy too); images kept under their gallery name (before index.json) are found too."""
    if not valid_name(name) or not images.is_dir():
        return None
    exts = LATEX_EXT if latex else WEB_EXT
    kept = _index(images).get(name)
    cands = [kept, os.path.splitext(kept)[0] + ".pdf"] if kept else []
    cands += [name] + [name + e for e in exts]
    for cand in cands:
        p = images / cand
        if p.is_file() and p.suffix.lower() in exts:
            return p
    return None


def kept_images(images: Path) -> List[Dict[str, object]]:
    """Every image in the folder, newest first: [{file, gallery: its gallery name or None, size: bytes,
    modified: s, pdf: LaTeX can use it (an SVG's PDF copy is not listed on its own)}]."""
    if not images.is_dir():
        return []
    named = {f: g for g, f in _index(images).items()}
    files = {f.name: f for f in images.iterdir() if f.is_file() and not f.name.startswith(".")
             and f.suffix.lower() in IMAGE_EXT and valid_name(f.name)}
    out = []
    for name, f in files.items():
        stem, ext = os.path.splitext(name)
        if ext.lower() == ".pdf" and any(stem + e in files for e in WEB_EXT):
            continue  # the PDF copy of an SVG
        st = f.stat()
        out.append({"file": name, "gallery": named.get(name), "size": st.st_size, "modified": int(st.st_mtime),
                    "pdf": ext.lower() in LATEX_EXT or stem + ".pdf" in files})
    return sorted(out, key=lambda x: (-x["modified"], x["file"]))


def kept_file(images: Path, filename: str) -> Optional[Path]:
    """An image file in the folder by its own name (one a browser shows), or None."""
    p = images / filename
    return p if valid_name(filename) and p.suffix.lower() in WEB_EXT and p.is_file() else None


def latex_links(images: Path) -> Dict[str, Path]:
    """The names LaTeX looks for (images/<gallery name>, see build_sheet.py) -> the files kept."""
    out: Dict[str, Path] = {}
    if not images.is_dir():
        return out
    for f in images.iterdir():  # kept under their gallery name (before index.json)
        if f.suffix.lower() in LATEX_EXT and not f.name.startswith("."):
            out[f.name] = f
    for gallery in _index(images):
        f = find_image(images, gallery, latex=True)
        if f is None:
            continue
        stem, ext = os.path.splitext(gallery)
        if ext.lower() not in IMAGE_EXT:
            stem = gallery
        out[stem + f.suffix.lower()] = f
        if ext.lower() in LATEX_EXT:
            out[gallery] = f
    return out


def image_stem(title: str, exercise_id: str, n: int = 1, total: int = 1) -> str:
    """The file name (without extension) of an exercise's image: its title and id, and the image's number
    if it has several: "magnetic-field-of-a-coil-1234" or "...-1234-2"."""
    t = title.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:60].strip("-") or "exercise"
    ident = re.sub(r"[^A-Za-z0-9_-]+", "-", str(exercise_id)).strip("-")[:60] or "x"
    return f"{slug}-{ident}" + (f"-{n}" if total > 1 else "")


def _store_one(images: Path, gallery: str, stem: str, data: bytes) -> Optional[str]:
    """Keep one gallery image as <stem>.<its type> (the type checked by its content), replacing what was
    kept for it before; the file name, or None if it is no image."""
    kind = image_kind(data)
    if kind is None or len(data) > MAX_IMAGE or not valid_name(gallery):
        return None
    name = stem + kind
    if not valid_name(name):
        return None
    images.mkdir(parents=True, exist_ok=True)
    with _lock("images"):
        index = _index(images)
        old = index.get(gallery)
        tmp = images / f".{name}.tmp"
        tmp.write_bytes(data)
        os.replace(tmp, images / name)
        if old and old != name:  # the file kept before (and its PDF copy), unless another image uses it
            others = {f for g, f in index.items() if g != gallery}
            for f in (old, os.path.splitext(old)[0] + ".pdf"):
                if f != name and f not in others and valid_name(f):
                    try:
                        (images / f).unlink()
                    except OSError:
                        pass
        index[gallery] = name
        _write_index(images, index)
    if kind == ".svg":  # LaTeX cannot read SVG: a PDF copy, if the server can make one
        conv = shutil.which("rsvg-convert")
        if conv:
            try:
                subprocess.run([conv, "-f", "pdf", "-o", str(images / (stem + ".pdf")), str(images / name)],
                               capture_output=True, timeout=30)
            except (subprocess.SubprocessError, OSError):
                pass
    return name


def _gallery_of(filename: str, targets: Dict[str, str]) -> Optional[str]:
    """The gallery name an uploaded file is (its name, with or without its extension), if a target."""
    base = Path(filename.replace("\\", "/")).name
    for cand in (base, os.path.splitext(base)[0]):
        if cand in targets:
            return cand
    stem = os.path.splitext(base)[0]
    return next((g for g in targets if os.path.splitext(g)[0] == stem), None)


def store_images(images: Path, filename: str, data: bytes, targets: Dict[str, str],
                 gallery: Optional[str] = None) -> Dict[str, List[str]]:
    """Keep an uploaded image, or the images in an uploaded .zip. targets: the gallery names the sheet's
    exercises use -> the file name each is kept as (image_stem); a file is the image of its gallery
    name (gallery: given for a single file). {"kept": file names, "skipped": names of no target}.
    ValueError: nothing kept."""
    if len(data) > MAX_UPLOAD:
        raise ValueError("the file is too large")
    kept: List[str] = []
    skipped: List[str] = []

    def one(name: str, content: bytes, g: Optional[str]) -> None:
        g = g if g in targets else _gallery_of(name, targets)
        got = _store_one(images, g, targets[g], content) if g else None
        if got:
            kept.append(got)
        elif image_kind(content):
            skipped.append(Path(name.replace("\\", "/")).name)
    if data[:4] == b"PK\x03\x04":
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                for info in zf.infolist():
                    base = Path(info.filename.replace("\\", "/")).name
                    if info.is_dir() or base.startswith(".") or info.file_size > MAX_IMAGE:
                        continue
                    one(base, zf.read(info), None)
        except zipfile.BadZipFile:
            raise ValueError("not a .zip")
    else:
        one(filename, data, gallery)
    if not kept:
        raise ValueError("no image of this sheet's exercises in the file (named as in the TeXercises gallery)"
                         if skipped else "no image in the file (PNG, JPEG, SVG, GIF, WebP or PDF)")
    return {"kept": kept, "skipped": skipped}


def fetch_image(images: Path, name: str, stem: str, timeout: float = 20) -> Tuple[bool, str]:
    """Fetch a gallery image from TeXercises (which redirects to the file) and keep it as <stem>.<type>;
    (True, the file name) or (False, why not)."""
    if not valid_name(name):
        return False, "not an image name"
    req = urllib.request.Request(GALLERY.format(name), headers={"User-Agent": "learningphysics.ch exercise sheets"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read(MAX_IMAGE + 1)
    except (urllib.error.URLError, OSError, ValueError) as e:
        return False, f"TeXercises did not answer ({e.__class__.__name__})"
    if len(data) > MAX_IMAGE:
        return False, "too large"
    if image_kind(data) is None:
        return False, "TeXercises asks for a login (download it there and upload it here)"
    got = _store_one(images, name, stem, data)
    return (True, got) if got else (False, "not an image")


def status(export: Path) -> Dict[str, object]:
    have = available(export)
    pool = load_pool()
    keys = {k for a in pool.values() for k in a.get("exercises", {})}
    uploaded = export / "exercises"
    return {"latex": bool(lualatex()), "exercises": len(have), "pool": len(keys), "in_pool": len(keys & set(have)),
            "uploaded": int(uploaded.stat().st_mtime) if uploaded.is_dir() else None}


if __name__ == "__main__":
    # self-test on the server, as the service's user, once LaTeX is installed:
    #   sudo -u hubadmin python3 /var/www/teachingphysics/hub-admin/sheets/sheets.py /var/www/teachingphysics/hub-data
    data = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp())
    print("lualatex:", lualatex() or "not found")
    pool, have = load_pool(), available(data / "texercises")
    app = next((a for a, e in pool.items() if any(k in have for k in e.get("exercises", {}))), None)
    print(f"exercises: {len(have)}; an app with exercises: {app}")
    if app:
        keys = suggest([{"id": app, "objectives": list(pool[app].get("objectives", {}))}], "en", pool, have)
        pdf, why = make_pdf("Self-test", [(app, k) for k in keys], {}, data / "texercises", data / "sheets", "both")
        print(f"sheet: {len(pdf)} bytes" if pdf else f"no sheet: {why}")
