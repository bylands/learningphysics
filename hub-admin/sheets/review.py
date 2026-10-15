"""TeXercises review (learningphysics.ch/texercises/, served by the admin service, logged in).

A TeXercises export, or a bulk-import bundle in the same format (exercises/<key>/exercise.json,
preamble.tex, text.tex, solution.tex, short_solution.tex; collections/<slug>.json), is uploaded as
a .zip or .tgz and kept as a bundle: its collections and exercises are previewed (preview.py), an
exercise's standard difficulty (default_difficulty, 1 to 6) can be changed, and anyone logged in
writes feedback (a bug, a suggestion, ...) on an exercise. The changes come back as a bundle to
import into TeXercises: the whole bundle, or only the changed exercises (with their ids: TeXercises
updates them in place).

    <root>/bundles/<id>/bundle.json    {"name", "uploaded", "by", "exercises", "collections"}
    <root>/bundles/<id>/changes.json   {"difficulty": {key: n}}
    <root>/bundles/<id>/exercises/..., collections/...   the files as uploaded (only those above)
    <root>/feedback.json               [{"id", "bundle", "bundle_name", "key", "exercise_id", "title",
                                         "collection", "kind", "text", "by", "at", "done"}]

Feedback stays when its bundle is deleted (it keeps the exercise's title and id).
"""
from __future__ import annotations

import io
import json
import os
import re
import secrets
import shutil
import tarfile
import threading
import time
import zipfile
from pathlib import Path
from typing import Dict, List, Optional

TEX_FILES = ("exercise.json", "preamble.tex", "text.tex", "solution.tex", "short_solution.tex")
KEY = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,120}")
BUNDLE_ID = re.compile(r"[0-9a-f]{12}")
FEEDBACK_ID = re.compile(r"[0-9a-f]{12}")
MAX_UPLOAD = 64 * 1024 * 1024
MAX_FILE = 2 * 1024 * 1024
MAX_EXERCISES, MAX_COLLECTIONS, MAX_BUNDLES = 5000, 500, 40
MAX_FEEDBACK, MAX_FEEDBACK_TEXT = 5000, 4000
KINDS = {"bug": "Bug", "suggestion": "Suggestion", "question": "Question", "other": "Other"}
DIFFICULTIES = range(1, 7)  # TeXercises' default_difficulty
MAX_TOPICS = 20  # subbranches per exercise

_lock = threading.Lock()


# ---------------------------------------------------------------------- files
def _write_json(path: Path, obj: object) -> None:
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, path)


def _read_json(path: Path, default):
    try:
        got = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default
    return got if isinstance(got, type(default)) else default


def clean_text(text: object, limit: int) -> str:
    s = str(text or "").replace("\r\n", "\n").replace("\r", "\n")
    s = "".join(c for c in s if c == "\n" or c == "\t" or ord(c) >= 32)
    return s.strip()[:limit]


def bundle_dir(root: Path, bid: str) -> Path:
    if not BUNDLE_ID.fullmatch(bid or ""):
        raise KeyError(bid)
    d = root / "bundles" / bid
    if not (d / "bundle.json").is_file():
        raise KeyError(bid)
    return d


# ---------------------------------------------------------------------- upload
def read_archive(data: bytes) -> Dict[str, Dict[str, bytes]]:
    """{"exercises": {key/file: bytes}, "collections": {slug: bytes}} of a .zip or .tgz; anything else
    in it (README, manifest, schema, images) is left out, and nothing is written yet."""
    out: Dict[str, Dict[str, bytes]] = {"exercises": {}, "collections": {}}

    def take(name: str, size: int, read) -> None:
        parts = [p for p in name.replace("\\", "/").split("/") if p]
        if size > MAX_FILE:
            return
        if len(parts) >= 3 and parts[-3] == "exercises" and parts[-1] in TEX_FILES and KEY.fullmatch(parts[-2]):
            out["exercises"][f"{parts[-2]}/{parts[-1]}"] = read()
        elif len(parts) >= 2 and parts[-2] == "collections" and parts[-1].endswith(".json") and KEY.fullmatch(parts[-1][:-5]):
            out["collections"][parts[-1][:-5]] = read()

    if data[:2] == b"\x1f\x8b":
        try:
            with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tf:
                for m in tf.getmembers():
                    if m.isfile():
                        take(m.name, m.size, lambda m=m: tf.extractfile(m).read())
        except (tarfile.TarError, OSError, EOFError):
            raise ValueError("not a TeXercises export (.zip or .tgz)")
    else:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                for info in zf.infolist():
                    if not info.is_dir():
                        take(info.filename, info.file_size, lambda info=info: zf.read(info))
        except (zipfile.BadZipFile, OSError):
            raise ValueError("not a TeXercises export (.zip or .tgz)")
    return out


def store_bundle(root: Path, data: bytes, name: str, by: str) -> Dict[str, object]:
    """Keep an uploaded export as a new bundle; its summary."""
    if len(data) > MAX_UPLOAD:
        raise ValueError("the file is too large (at most 64 MB)")
    got = read_archive(data)
    keys = sorted({f.split("/")[0] for f in got["exercises"] if f.endswith("/exercise.json")})
    if not keys:
        raise ValueError("no exercises in the file (exercises/<key>/exercise.json)")
    if len(keys) > MAX_EXERCISES or len(got["collections"]) > MAX_COLLECTIONS:
        raise ValueError("too many exercises or collections in the file")
    name = clean_text(name, 120).replace("\n", " ") or "export"
    with _lock:
        (root / "bundles").mkdir(parents=True, exist_ok=True)
        if len(list_bundles(root)) >= MAX_BUNDLES:
            raise ValueError(f"at most {MAX_BUNDLES} uploads: delete one first")
        bid = secrets.token_hex(6)
        tmp = root / "bundles" / f".{bid}.new"
        shutil.rmtree(tmp, ignore_errors=True)
        try:
            for f, content in got["exercises"].items():
                key = f.split("/")[0]
                if key in keys:
                    (tmp / "exercises" / key).mkdir(parents=True, exist_ok=True)
                    (tmp / "exercises" / f).write_bytes(content)
            (tmp / "collections").mkdir(parents=True, exist_ok=True)
            for slug, content in got["collections"].items():
                (tmp / "collections" / f"{slug}.json").write_bytes(content)
            meta = {"name": name, "uploaded": int(time.time()), "by": by, "exercises": len(keys),
                    "collections": len(got["collections"])}
            _write_json(tmp / "bundle.json", meta)
            _write_json(tmp / "changes.json", {"difficulty": {}})
            os.replace(tmp, root / "bundles" / bid)
        except OSError:
            shutil.rmtree(tmp, ignore_errors=True)
            raise
    return {"id": bid, **meta}


def list_bundles(root: Path) -> List[Dict[str, object]]:
    out = []
    base = root / "bundles"
    if base.is_dir():
        for d in base.iterdir():
            if BUNDLE_ID.fullmatch(d.name) and (d / "bundle.json").is_file():
                meta = _read_json(d / "bundle.json", {})
                changes = _read_json(d / "changes.json", {}).get("difficulty") or {}
                out.append({"id": d.name, **meta, "changed": len(changes)})
    return sorted(out, key=lambda b: -int(b.get("uploaded") or 0))


def delete_bundle(root: Path, bid: str) -> None:
    with _lock:
        d = bundle_dir(root, bid)
        shutil.rmtree(d)


# ---------------------------------------------------------------------- reading a bundle
def _meta(d: Path, key: str) -> Dict[str, object]:
    return _read_json(d / "exercises" / key / "exercise.json", {})


def _changes(d: Path) -> Dict[str, int]:
    got = _read_json(d / "changes.json", {}).get("difficulty") or {}
    return {k: v for k, v in got.items() if isinstance(v, int) and v in DIFFICULTIES}


def _collections(d: Path) -> Dict[str, Dict[str, object]]:
    out = {}
    base = d / "collections"
    if base.is_dir():
        for f in sorted(base.glob("*.json")):
            c = _read_json(f, {})
            if c:
                out[f.stem] = c
    return out


def _difficulty(meta: Dict[str, object]) -> int:
    v = meta.get("default_difficulty")
    return v if isinstance(v, int) and v in DIFFICULTIES else 1


def _topics(meta: Dict[str, object]) -> List[str]:
    """An exercise's topics: its TeXercises subbranches ("Thermal Expansion", ...), each once."""
    got = meta.get("subbranches") if isinstance(meta.get("subbranches"), list) else []
    out: List[str] = []
    for t in got:
        t = clean_text(t, 80).replace("\n", " ") if isinstance(t, str) else ""
        if t and t not in out:
            out.append(t)
    return out[:MAX_TOPICS]


def bundle_view(root: Path, bid: str, feedback_counts: Optional[Dict[str, int]] = None) -> Dict[str, object]:
    """A bundle's collections (with their exercises in order), all its exercises (each with its topics:
    the subbranches) and the topics there are, with how many exercises each, the most frequent first."""
    d = bundle_dir(root, bid)
    meta = _read_json(d / "bundle.json", {})
    changes = _changes(d)
    counts = feedback_counts or {}
    exercises: Dict[str, Dict[str, object]] = {}
    for e in sorted((d / "exercises").iterdir()):
        if not (e / "exercise.json").is_file():
            continue
        m = _meta(d, e.name)
        info = m.get("info") if isinstance(m.get("info"), dict) else {}
        exercises[e.name] = {"key": e.name, "title": str(m.get("title") or e.name), "id": m.get("id"),
                             "lang": "de" if m.get("language") == "GER" else "en",
                             "difficulty": changes.get(e.name, _difficulty(m)), "original": _difficulty(m),
                             "changed": e.name in changes, "url": str(info.get("url") or ""),
                             "creator": str(info.get("creator") or ""), "topics": _topics(m), "collections": [],
                             "feedback": counts.get(e.name, 0)}
    collections = []
    for slug, c in _collections(d).items():
        items = []
        for it in c.get("items") or []:
            if not isinstance(it, dict):
                continue
            k = it.get("exercise")
            if isinstance(k, str) and k in exercises:
                items.append({"key": k, "difficulty": it.get("difficulty")})
                exercises[k]["collections"].append(slug)
            elif isinstance(it.get("exercise_id"), int):
                items.append({"exercise_id": it["exercise_id"]})
        collections.append({"key": slug, "title": str(c.get("title") or slug), "id": c.get("id"),
                            "kind": str(c.get("kind") or ""), "description": str(c.get("description") or ""),
                            "items": items})
    topics: Dict[str, int] = {}
    for e in exercises.values():
        for t in e["topics"]:
            topics[t] = topics.get(t, 0) + 1
    return {"id": bid, **meta, "changed": len(changes), "collections": collections,
            "exercises": sorted(exercises.values(), key=lambda x: x["title"].lower()),
            "topics": [{"name": t, "exercises": n} for t, n in sorted(topics.items(), key=lambda x: (-x[1], x[0].lower()))]}


def exercise_folder(root: Path, bid: str, key: str) -> Path:
    d = bundle_dir(root, bid)
    if not KEY.fullmatch(key or "") or not (d / "exercises" / key / "exercise.json").is_file():
        raise KeyError(key)
    return d / "exercises" / key


def short_solution(folder: Path) -> str:
    try:
        return (folder / "short_solution.tex").read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""


# ---------------------------------------------------------------------- changes
def set_difficulty(root: Path, bid: str, key: str, value: object) -> Dict[str, object]:
    if not isinstance(value, int) or isinstance(value, bool) or value not in DIFFICULTIES:
        raise ValueError("the difficulty is 1 to 6")
    with _lock:
        folder = exercise_folder(root, bid, key)
        d = folder.parent.parent
        changes = _read_json(d / "changes.json", {})
        diff = {k: v for k, v in (changes.get("difficulty") or {}).items()}
        if value == _difficulty(_meta(d, key)):
            diff.pop(key, None)  # back to what was uploaded
        else:
            diff[key] = value
        changes["difficulty"] = diff
        _write_json(d / "changes.json", changes)
    return {"key": key, "difficulty": value, "changed": key in diff, "bundle_changed": len(diff)}


def export_zip(root: Path, bid: str, only_changed: bool) -> bytes:
    """The bundle to import into TeXercises, with the changed difficulties: all of it, or only the
    changed exercises (no collections)."""
    d = bundle_dir(root, bid)
    changes = _changes(d)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for e in sorted((d / "exercises").iterdir()):
            if only_changed and e.name not in changes:
                continue
            for f in TEX_FILES:
                p = e / f
                if not p.is_file():
                    continue
                data = p.read_bytes()
                if f == "exercise.json" and e.name in changes:
                    m = _read_json(p, {})
                    m["default_difficulty"] = changes[e.name]
                    data = (json.dumps(m, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
                zf.writestr(f"exercises/{e.name}/{f}", data)
        if not only_changed:
            for f in sorted((d / "collections").glob("*.json")):
                zf.writestr(f"collections/{f.name}", f.read_bytes())
    return buf.getvalue()


# ---------------------------------------------------------------------- feedback
def read_feedback(root: Path) -> List[Dict[str, object]]:
    return [f for f in _read_json(root / "feedback.json", []) if isinstance(f, dict)]


def feedback_counts(root: Path, bid: str) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for f in read_feedback(root):
        if f.get("bundle") == bid and not f.get("done"):
            out[str(f.get("key"))] = out.get(str(f.get("key")), 0) + 1
    return out


def add_feedback(root: Path, bid: str, key: str, kind: object, text: object, by: str, collection: object = "") -> Dict[str, object]:
    text = clean_text(text, MAX_FEEDBACK_TEXT)
    if not text:
        raise ValueError("write what you noticed")
    kind = kind if kind in KINDS else "other"
    with _lock:
        folder = exercise_folder(root, bid, key)
        d = folder.parent.parent
        m = _meta(d, key)
        items = read_feedback(root)
        if len(items) >= MAX_FEEDBACK:
            raise ValueError("too much feedback kept: delete what is done")
        coll = str(collection) if isinstance(collection, str) and KEY.fullmatch(collection) else ""
        entry = {"id": secrets.token_hex(6), "bundle": bid, "bundle_name": _read_json(d / "bundle.json", {}).get("name", ""),
                 "key": key, "exercise_id": m.get("id"), "title": str(m.get("title") or key), "collection": coll,
                 "kind": kind, "text": text, "by": by, "at": int(time.time()), "done": False}
        items.append(entry)
        root.mkdir(parents=True, exist_ok=True)
        _write_json(root / "feedback.json", items)
    return entry


def change_feedback(root: Path, fid: str, action: str, teacher: str, superuser: bool) -> None:
    """"done", "reopen" or "delete" an entry: its author or the superuser."""
    if action not in ("done", "reopen", "delete"):
        raise ValueError("action: done, reopen or delete")
    with _lock:
        items = read_feedback(root)
        found = next((f for f in items if f.get("id") == fid), None)
        if found is None:
            raise KeyError(fid)
        if not superuser and found.get("by") != teacher:
            raise PermissionError("only its author can change it")
        if action == "delete":
            items.remove(found)
        else:
            found["done"] = action == "done"
        _write_json(root / "feedback.json", items)


def feedback_markdown(root: Path, include_done: bool = False) -> str:
    """The feedback as Markdown, by upload and exercise (to pass on, e.g. to whoever fixes it)."""
    items = [f for f in read_feedback(root) if include_done or not f.get("done")]
    lines = ["# TeXercises feedback", "", f"{len(items)} {'entries' if len(items) != 1 else 'entry'}"
             + ("" if include_done else " (open)") + time.strftime(", %d.%m.%Y %H:%M", time.localtime()), ""]
    groups: Dict[str, List[Dict[str, object]]] = {}
    for f in sorted(items, key=lambda f: (str(f.get("bundle_name")), str(f.get("title")), int(f.get("at") or 0))):
        groups.setdefault(str(f.get("bundle_name") or "?"), []).append(f)
    for bname, fs in groups.items():
        lines += [f"## {bname}", ""]
        last = None
        for f in fs:
            head = (f.get("key"), f.get("exercise_id"))
            if head != last:
                eid = f" (id {f['exercise_id']})" if f.get("exercise_id") else ""
                lines += [f"### {f.get('title')}{eid}", "", f"`{f.get('key')}`" + (f", collection `{f['collection']}`" if f.get("collection") else ""), ""]
                last = head
            when = time.strftime("%d.%m.%Y", time.localtime(int(f.get("at") or 0)))
            state = " — done" if f.get("done") else ""
            text = str(f.get("text") or "").replace("\n", "\n  ")
            lines.append(f"- **{KINDS.get(str(f.get('kind')), 'Other')}** ({f.get('by')}, {when}{state}): {text}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"
