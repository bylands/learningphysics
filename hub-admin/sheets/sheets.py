"""Exercise sheets for the sets of the hub (used by ../hubadmin.py): which exercises a set gets, and
the PDF made from them with build_sheet.py and LuaLaTeX.

A set names apps and, per app, possibly learning objectives. pool.json (build_pool.py, reviewed by
hand) lists for every app and objective the TeXercises exercises that practise it, best first. A
sheet takes, app by app in the set's order, per chosen objective (all of the app's, if the set
names none) the first PER_OBJECTIVE exercises not taken yet; an app without objectives in the pool
gives its first PER_APP exercises. Exercises in the set's language come first; the other language
fills in where there are too few. At most MAX_EXERCISES in all. The choice depends only on the set
and the pool, so the same set always gets the same sheet.

The exercises themselves come from the TeXercises export uploaded in the admin panel (only the
teacher's own, see store_export) and from the drafts that deploy.sh puts next to this file
(drafts/). Sheets are cached by a hash of everything they are made of.
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
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
PER_OBJECTIVE, PER_APP, MAX_EXERCISES = 2, 3, 24
ENGINE = ("texercises-lp.sty", "lp-minion.sty", "build_sheet.py")
KEY = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,120}")
TEX_FILES = ("exercise.json", "preamble.tex", "text.tex", "solution.tex", "short_solution.tex")
MAX_UPLOAD = 64 * 1024 * 1024
LATEX_TIMEOUT = 150  # s

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


def choose(set_: Dict[str, object], pool: Dict[str, object], have: Dict[str, Path]) -> List[Tuple[str, str]]:
    """[(app id, exercise key)] for the set: see the module's description."""
    lang = set_.get("lang") if set_.get("lang") in ("en", "de") else None
    chosen: List[Tuple[str, str]] = []
    taken = set()

    def ordered(keys: List[str], exs: Dict[str, Dict[str, object]]) -> List[str]:
        keys = [k for k in keys if k in have and k not in taken]
        if lang:
            keys = [k for k in keys if exs.get(k, {}).get("lang") == lang] + [k for k in keys if exs.get(k, {}).get("lang") != lang]
        return keys

    for app in set_.get("apps", []):
        if not isinstance(app, dict) or app.get("id") not in pool:
            continue
        entry = pool[app["id"]]
        exs = entry.get("exercises", {})
        objs = entry.get("objectives", {})
        wanted = [o for o in (app.get("objectives") or list(objs)) if o in objs]
        picks: List[str] = []
        if any(objs.get(o) for o in wanted):
            for o in wanted:
                picks += ordered(objs.get(o, []), exs)[:PER_OBJECTIVE]
                taken.update(picks)
        else:
            picks = ordered(list(exs), exs)[:PER_APP]
            taken.update(picks)
        chosen += [(app["id"], k) for k in dict.fromkeys(picks)]
    return chosen[:MAX_EXERCISES]


def collection(title: str, chosen: List[Tuple[str, str]], names: Dict[str, str]) -> Dict[str, object]:
    """The collection build_sheet.py reads: the exercises, a section per app."""
    items, containers, last = [], [], None
    for n, (app, key) in enumerate(chosen, 1):
        if app != last:
            containers.append({"first": n, "title": names.get(app, app)})
            last = app
        items.append({"exercise": key})
    return {"title": title, "items": items, "containers": containers}


def fingerprint(coll: Dict[str, object], have: Dict[str, Path], part: str, opts: Dict[str, str]) -> str:
    h = hashlib.sha256()
    h.update(json.dumps([coll, part, opts], sort_keys=True, ensure_ascii=False).encode("utf-8"))
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


def make_pdf(set_name: str, set_: Dict[str, object], names: Dict[str, str], export: Path, cache: Path,
             part: str = "exercises", opts: Optional[Dict[str, str]] = None) -> Tuple[Optional[bytes], str]:
    """(pdf, '') or (None, reason). part: 'exercises' or 'both' (with the solutions)."""
    opts = opts or {}
    pool = load_pool()
    have = available(export)
    chosen = choose(set_, pool, have)
    if not chosen:
        return None, "no exercises for this set yet"
    coll = collection(str(set_.get("title") or set_name), chosen, names)
    key = fingerprint(coll, have, part, opts)
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
            (work / "coll.json").write_text(json.dumps(coll, ensure_ascii=False), encoding="utf-8")
            args = [sys.executable, str(HERE / "build_sheet.py"), os.pathsep.join(str(s) for s in sources(export)),
                    str(work / "coll.json"), str(work / "sheet.tex"), "--font=modern", f"--part={part}"]
            args += [f"--{k}={v}" for k, v in opts.items() if k in ("author", "school", "date", "footer")]
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
        pdf, why = make_pdf("selftest", {"title": "Self-test", "apps": [{"id": app}]}, {}, data / "texercises",
                            data / "sheets", "both")
        print(f"sheet: {len(pdf)} bytes" if pdf else f"no sheet: {why}")
