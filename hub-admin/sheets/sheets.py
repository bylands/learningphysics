"""Exercise sheets (used by ../hubadmin.py): which exercises a sheet suggests, their alternatives,
and the PDF made from them with build_sheet.py and LuaLaTeX.

A sheet is made in three steps. 1. Topics: the subtopics of categories.json (Claude's reading of every
exercise of the export: area -> topic -> subtopic, the exercise's main subtopic, its task kind, the laws
and mathematics it needs, near-duplicates; load_categories, topic_tree), and "not yet categorised"
(NEW) for the exercises it does not know; a sheet saved before may name TeXercises topics (the
subbranches of exercise.json, exercise_topics), which still match (on_topics). 2. Learning objectives: pool.json (build_pool.py, reviewed by hand) lists
for every app (module of the hub) and objective the TeXercises exercises that practise it, best first;
of those on the topics, the teacher ticks objectives (objective_keys), and maybe the exercises on the
topics that the pool links to none (loose_keys). 3. Balance: the share of concept questions (the task
kind of categories.json: concept and explain; graph is "Both", it counts for whichever the sheet lacks;
the others are textbook problems; without a category, by the TeXercises type: descriptive and
true/false, "Both", the others; kind, task_kind) and of easy, medium and hard exercises (default_difficulty 1, 2 or none, 3 and more:
band), by default BALANCE. suggest() fills a sheet from that: round by round over the ticked objectives
(buckets, in the modules' order, the loose ones last), each that has fewer exercises than the round's
number gets one more, so every objective has one before any has two (after the first round, or from the
start if the sheet has fewer exercises than objectives, the slots left that are all needed for concept
questions, problems or a difficulty go only to objectives that have one);
of an objective's exercises it takes one in the sheet's language first, then the one that brings the sheet nearest to its aims (aims:
the concept questions and the difficulty it lacks most), then one not too similar (TOO_SIMILAR) to those already
chosen, then one without image, then the pool's order; never one that is a near-duplicate (near_dup: flagged
so in categories.json, or a similarity of NEAR_DUP or more) of one chosen, nor one flagged broken.
What the topics and objectives cannot give is said (notes: "only 2 concept questions on these topics and objectives").
By default PER_OBJECTIVE per objective, at most DEFAULT_MAX; the teacher may ask for another number (up
to MAX_EXERCISES). The suggestion depends only on the sheet and the exercises, so it is the same every
time. alternatives() lists, for an exercise of a sheet, others of the same objectives not on the sheet
and no near-duplicate of the others on it: the sheet's language first, then the most similar
(similarity, as categories.json's similarity.md: topic, laws, task kind, difficulty, mathematics, steps,
representations, context), then the same kind, then a similar difficulty; similar() the most similar
exercises of all those there.

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
import math
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


MAX_TOPICS = 20  # TeXercises topics (subbranches) of an exercise
CONCEPT, PROBLEM, BOTH = "concept", "problem", "both"
CONCEPT_TYPES, BOTH_TYPES = (0, 3), (2,)  # TeXercises types: 0 descriptive, 3 true/false; 2 both (the others problems)
BALANCE = {"concept": 30, "easy": 30, "medium": 50, "hard": 20}  # in %: concept questions, and of the difficulties
BANDS = {1: "easy", 2: "medium", 3: "hard"}

_metas: Dict[str, Tuple[Tuple[int, int], Dict[str, object]]] = {}
_metas_guard = threading.Lock()


def clean_topics(got: object) -> List[str]:
    """TeXercises topics (or those of a sheet): the strings, cleaned, each once, at most MAX_TOPICS."""
    out: List[str] = []
    for t in got if isinstance(got, list) else []:
        t = re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f]", " ", t)).strip()[:80] if isinstance(t, str) else ""
        if t and t not in out:
            out.append(t)
    return out[:MAX_TOPICS]


def exercise_topics(folder: Path) -> List[str]:
    """An exercise's TeXercises topics: the subbranches of its exercise.json ("Thermal Expansion", ...),
    the strings among them, cleaned, each once."""
    try:
        meta = json.loads((folder / "exercise.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return clean_topics(meta.get("subbranches") if isinstance(meta, dict) else None)


def kind(kind_of: object) -> str:
    """What an exercise of a TeXercises type is: a concept question (descriptive, true/false), both (the
    type "Both": it counts for whichever the sheet lacks) or a textbook problem (calculative, algebraic,
    show, proof, and any other)."""
    t = kind_of if isinstance(kind_of, int) and not isinstance(kind_of, bool) else None
    return CONCEPT if t in CONCEPT_TYPES else BOTH if t in BOTH_TYPES else PROBLEM


def band(difficulty: object) -> int:
    """1 easy (difficulty 1 or less), 2 medium (2, or none given), 3 hard (3 and more)."""
    d = difficulty if isinstance(difficulty, int) and not isinstance(difficulty, bool) else 2
    return min(max(d, 1), 3)


# ---------------------------------------------------------------------- categories.json
CATEGORIES = HERE / "categories.json"
NEW = "_new"  # a sheet's topic: the exercises categories.json does not know (uploaded since)
CONCEPT_TASKS, BOTH_TASKS = ("concept", "explain"), ("graph",)  # task kinds: concept questions, "Both" (the others problems)
TASKS = ("concept", "explain", "calculate", "derive", "show", "graph", "estimate", "data")
TASK_GROUP = {"concept": "qual", "explain": "qual", "calculate": "quant", "derive": "quant", "show": "quant",
              "estimate": "quant", "graph": "repr", "data": "repr"}
WEIGHTS = {"topic": 0.35, "laws": 0.20, "kind": 0.15, "difficulty": 0.10, "math": 0.07, "steps": 0.05, "repr": 0.04, "context": 0.04}
NEAR_DUP = 0.9  # a similarity from which two exercises never go on one sheet
TOO_SIMILAR = 0.75  # one as similar to one chosen comes after another that fits as well
_cats: Dict[str, object] = {}


def _strs(v: object, limit: int = 40) -> List[str]:
    return [x for x in v if isinstance(x, str)][:limit] if isinstance(v, list) else []


def load_categories(path: Optional[Path] = None) -> Dict[str, object]:
    """categories.json, read once (again when it changes): {"stamp", "tree": [(area, [(topic,
    [(subtopic id, label)])])] in its order, "flat": subtopic id -> (area, topic, label), "exercises":
    TeXercises id (a string) -> its entry (sub, sub2, kind, kinds, steps, laws, math, repr, context,
    flag), "idf": law -> log(N / exercises that use it)}; all empty if it is missing or unreadable."""
    path = path or CATEGORIES
    try:
        st = path.stat()
        stamp = (str(path), st.st_mtime_ns, st.st_size)
    except OSError:
        stamp = (str(path), 0, 0)
    with _metas_guard:
        if _cats.get("stamp") == stamp:
            return _cats
    try:
        raw = json.loads(path.read_text(encoding="utf-8")) if stamp[1] else {}
    except (OSError, ValueError):
        raw = {}
    raw = raw if isinstance(raw, dict) else {}
    tree, flat = [], {}
    for area, topics in (raw.get("tree") or {}).items() if isinstance(raw.get("tree"), dict) else []:
        rows = []
        for topic, subs in topics.items() if isinstance(topics, dict) else []:
            subs = [(i, str(label)) for i, label in subs.items() if isinstance(i, str) and i not in flat] if isinstance(subs, dict) else []
            for i, label in subs:
                flat[i] = (str(area), str(topic), label)
            rows.append((str(topic), subs))
        tree.append((str(area), rows))
    exs = {}
    for eid, e in (raw.get("exercises") or {}).items() if isinstance(raw.get("exercises"), dict) else []:
        if not isinstance(e, dict) or e.get("sub") not in flat:
            continue
        task = e.get("kind") if e.get("kind") in TASKS else "calculate"
        steps = e.get("steps") if isinstance(e.get("steps"), int) and not isinstance(e.get("steps"), bool) else 1
        exs[str(eid)] = {"sub": e["sub"], "sub2": [x for x in _strs(e.get("sub2")) if x in flat and x != e["sub"]], "kind": task,
                         "kinds": [x for x in _strs(e.get("kinds")) if x in TASKS] or [task], "steps": min(max(steps, 1), 3),
                         "laws": _strs(e.get("laws")), "math": _strs(e.get("math")), "repr": _strs(e.get("repr")),
                         "context": e.get("context") if isinstance(e.get("context"), str) else "",
                         "flag": e.get("flag") if isinstance(e.get("flag"), str) and e.get("flag") else None}
    df: Dict[str, int] = {}
    for e in exs.values():
        for law in set(e["laws"]):
            df[law] = df.get(law, 0) + 1
    out = {"stamp": stamp, "tree": tree, "flat": flat, "exercises": exs, "idf": {law: math.log(len(exs) / n) for law, n in df.items()}}
    with _metas_guard:
        _cats.clear()
        _cats.update(out)
    return out


def task_kind(task: object) -> str:
    """What an exercise of a task kind of categories.json is: concept and explain concept questions,
    graph "Both" (it counts for whichever the sheet lacks), the others textbook problems."""
    return CONCEPT if task in CONCEPT_TASKS else BOTH if task in BOTH_TASKS else PROBLEM


def _category(eid: Optional[int], difficulty: Optional[int], cats: Dict[str, object]) -> Dict[str, object]:
    """What exercise_meta adds for an exercise categories.json knows (else nothing)."""
    c = cats["exercises"].get(str(eid)) if eid is not None else None
    if not c:
        return {}
    area, topic, label = cats["flat"][c["sub"]]
    idf = cats["idf"]
    feats = {"sub": c["sub"], "sub2": frozenset(c["sub2"]), "area": area, "topic": (area, topic), "laws": frozenset(c["laws"]),
             "norm": math.sqrt(sum(idf.get(x, 0.0) ** 2 for x in set(c["laws"]))), "task": c["kind"], "kinds": frozenset(c["kinds"]),
             "math": frozenset(c["math"]), "steps": c["steps"], "repr": frozenset(c["repr"]), "context": c["context"],
             "difficulty": min(max(difficulty if difficulty is not None else 2, 1), 5)}
    return {"area": area, "topic": topic, "subtopic": {"id": c["sub"], "label": label}, "secondary": list(c["sub2"]),
            "task": c["kind"], "flag": c["flag"], "features": feats}


def exercise_meta(folder: Path) -> Dict[str, object]:
    """What a sheet needs of an exercise: {title, id (TeXercises', or None), lang (en, de), difficulty
    (None if not given), type, kind, band, topics (TeXercises'), images, url}, and, if categories.json
    knows it, {area, topic, subtopic: {id, label}, secondary: [subtopic ids], task (its task kind), flag
    ("dup:<id>", "broken" or None), features (for similarity)}; the kind then by its task kind. Read from
    its exercise.json (and text.tex: does it use a gallery image?), kept while the files are unchanged."""
    cats = load_categories()
    try:
        stamp = ((folder / "exercise.json").stat().st_mtime_ns,
                 (folder / "text.tex").stat().st_mtime_ns if (folder / "text.tex").is_file() else 0, cats["stamp"])
    except OSError:
        stamp = (0, 0, None)
    with _metas_guard:
        hit = _metas.get(str(folder))
    if hit and hit[0] == stamp and stamp[:2] != (0, 0):
        return hit[1]
    try:
        meta = json.loads((folder / "exercise.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        meta = {}
    meta = meta if isinstance(meta, dict) else {}
    try:
        text = (folder / "text.tex").read_text(encoding="utf-8", errors="replace")
    except OSError:
        text = ""
    diff = meta.get("default_difficulty")
    diff = diff if isinstance(diff, int) and not isinstance(diff, bool) else None
    url = (meta.get("info") or {}).get("url") if isinstance(meta.get("info"), dict) else None
    title = meta.get("title")
    out = {"title": re.sub(r"\s+", " ", title).strip()[:200] if isinstance(title, str) and title.strip() else folder.name,
           "lang": "de" if meta.get("language") == "GER" else "en", "difficulty": diff,
           "type": meta.get("type") if isinstance(meta.get("type"), int) and not isinstance(meta.get("type"), bool) else None,
           "kind": kind(meta.get("type")), "band": band(diff), "topics": clean_topics(meta.get("subbranches")),
           "images": "#image_path:" in text, "url": url if isinstance(url, str) and re.fullmatch(r"/exercise/[A-Za-z0-9_-]+/?", url) else None}
    eid = meta.get("id") if isinstance(meta.get("id"), int) and not isinstance(meta.get("id"), bool) else None
    out = {"title": out["title"], "id": eid, **{k: v for k, v in out.items() if k != "title"}}
    more = _category(eid, diff, cats)
    if more:
        out.update(more)
        out["kind"] = task_kind(more["task"])
    with _metas_guard:
        _metas[str(folder)] = (stamp, out)
    return out


def catalog(have: Dict[str, Path]) -> Dict[str, Dict[str, object]]:
    """exercise_meta of every exercise there (have: key -> folder)."""
    return {k: exercise_meta(folder) for k, folder in have.items()}


def topic_counts(have: Dict[str, Path]) -> List[Dict[str, object]]:
    """The TeXercises topics of the exercises there (have), each with how many of them (and how many of
    them are concept questions, and of the type "Both"), the most frequent first (then by name); "" for
    those without one, if any, last."""
    counts: Dict[str, Dict[str, int]] = {}
    none = {"exercises": 0, CONCEPT: 0, BOTH: 0}
    for e in catalog(have).values():
        for c in ([counts.setdefault(t, {"exercises": 0, CONCEPT: 0, BOTH: 0}) for t in e["topics"]] or [none]):
            c["exercises"] += 1
            if e["kind"] != PROBLEM:
                c[e["kind"]] += 1
    out = [{"name": t, **n} for t, n in sorted(counts.items(), key=lambda x: (-x[1]["exercises"], x[0].lower()))]
    return out + ([{"name": "", **none}] if none["exercises"] and counts else [])


def topic_tree(have: Dict[str, Path]) -> Dict[str, object]:
    """Step 1 of a sheet: categories.json's tree of the exercises there (have), by their main subtopic, each
    node with how many of them (and of them concept questions and of the kind "Both"): {"areas": [{"name",
    "exercises", "concept", "both", "topics": [{"name", ..., "subtopics": [{"id", "label", ...}]}]}], "new":
    the same numbers of those it does not know (id NEW)}; only nodes with exercises, in its order."""
    cats = load_categories()
    zero = lambda: {"exercises": 0, CONCEPT: 0, BOTH: 0}
    subs: Dict[str, Dict[str, int]] = {}
    new = zero()
    for e in catalog(have).values():
        sub = (e.get("subtopic") or {}).get("id")
        c = subs.setdefault(sub, zero()) if sub else new
        c["exercises"] += 1
        if e["kind"] != PROBLEM:
            c[e["kind"]] += 1
    add = lambda total, part: {k: total[k] + part[k] for k in total}
    areas = []
    for area, topics in cats["tree"]:
        rows = []
        for topic, items in topics:
            leaves = [{"id": i, "label": label, **subs[i]} for i, label in items if i in subs]
            if leaves:
                n = zero()
                for x in leaves:
                    n = add(n, {k: x[k] for k in n})
                rows.append({"name": topic, **n, "subtopics": leaves})
        if rows:
            n = zero()
            for x in rows:
                n = add(n, {k: x[k] for k in n})
            areas.append({"name": area, **n, "topics": rows})
    return {"areas": areas, "new": {"id": NEW, **new}}


def on_topics(entry: Dict[str, object], topics: List[str]) -> bool:
    """Is an exercise (its exercise_meta) on one of the topics: its main subtopic (categories.json), NEW
    for one categories.json does not know, or (a sheet saved before) one of its TeXercises topics ("":
    without one)?"""
    sub = (entry.get("subtopic") or {}).get("id")
    if (sub in topics) if sub else (NEW in topics):
        return True
    mine = entry.get("topics") or []
    return any(t in topics for t in mine) or ("" in topics and not mine)


def similarity(a: Dict[str, object], b: Dict[str, object], cats: Optional[Dict[str, object]] = None) -> float:
    """How similar two exercises (their exercise_meta) are, 0 to 1 (0 if categories.json does not know
    one): the weighted sum (WEIGHTS) of the similarity of their subtopics (1 the same, 0.7 one's main is
    the other's secondary, 0.5 the same topic, 0.4 a secondary in common, 0.15 the same area), laws (the
    cosine of their sets, each law weighted by its idf), task kinds (0.7 x (1 the same, 0.5 the same
    group) + 0.3 x the overlap of all their kinds), difficulty (1 - difference / 4), mathematics, steps
    (1 - difference / 2), representations and context (the same or not). The language does not count."""
    x, y = a.get("features"), b.get("features")
    if not x or not y:
        return 0.0
    idf = (cats or load_categories())["idf"]
    jacc = lambda p, q: 1.0 if not p and not q else len(p & q) / len(p | q)
    if x["sub"] == y["sub"]:
        topic = 1.0
    elif x["sub"] in y["sub2"] or y["sub"] in x["sub2"]:
        topic = 0.7
    elif x["topic"] == y["topic"]:
        topic = 0.5
    elif x["sub2"] & y["sub2"]:
        topic = 0.4
    else:
        topic = 0.15 if x["area"] == y["area"] else 0.0
    shared = x["laws"] & y["laws"]
    laws = sum(idf.get(law, 0.0) ** 2 for law in shared) / (x["norm"] * y["norm"]) if shared and x["norm"] and y["norm"] else 0.0
    same = 1.0 if x["task"] == y["task"] else 0.5 if TASK_GROUP.get(x["task"]) == TASK_GROUP.get(y["task"]) else 0.0
    w = WEIGHTS
    return (w["topic"] * topic + w["laws"] * laws + w["kind"] * (0.7 * same + 0.3 * jacc(x["kinds"], y["kinds"]))
            + w["difficulty"] * (1 - abs(x["difficulty"] - y["difficulty"]) / 4) + w["math"] * jacc(x["math"], y["math"])
            + w["steps"] * (1 - abs(x["steps"] - y["steps"]) / 2) + w["repr"] * jacc(x["repr"], y["repr"])
            + w["context"] * (x["context"] == y["context"]))


def near_dup(a: Dict[str, object], b: Dict[str, object], cats: Optional[Dict[str, object]] = None) -> bool:
    """Never on one sheet: one flagged a duplicate of the other in categories.json (or both of the same
    third), or a similarity of NEAR_DUP or more."""
    return flagged_dup(a, b) or similarity(a, b, cats) >= NEAR_DUP - 1e-9


def flagged_dup(a: Dict[str, object], b: Dict[str, object]) -> bool:
    """Is one flagged a duplicate of the other in categories.json (or both of the same third)?"""
    fa, fb = a.get("flag") or "", b.get("flag") or ""
    return (a.get("id") is not None and fb == f"dup:{a['id']}") or (b.get("id") is not None and fa == f"dup:{b['id']}") \
        or (fa.startswith("dup:") and fa == fb)


_neighbours: Dict[Tuple[object, str], List[Tuple[str, float]]] = {}


def similar(key: str, cat: Dict[str, Dict[str, object]], limit: int = 5, skip=()) -> List[Tuple[str, float]]:
    """The exercises there (cat) most similar to key, [(key, similarity rounded to 2 places)], the most
    similar first, without those in skip; none if categories.json does not know it."""
    e = cat.get(key)
    if not e or not e.get("features"):
        return []
    cats = load_categories()
    token = (cats["stamp"], len(cat), hash(frozenset(cat)))
    with _metas_guard:
        near = _neighbours.get((token, key))
    if near is None:
        scored = [(k, similarity(e, c, cats)) for k, c in cat.items() if k != key and c.get("features")]
        near = [(k, round(v, 3)) for k, v in sorted(scored, key=lambda x: (-x[1], x[0]))[:40]]
        with _metas_guard:
            if len(_neighbours) > 4000:
                _neighbours.clear()
            _neighbours[(token, key)] = near
    return [(k, round(v, 2)) for k, v in near if k not in skip][:limit]


def info(pool: Dict[str, object], key: str, apps: Optional[List[str]] = None) -> Optional[Tuple[str, Dict[str, object]]]:
    """(app, the pool's entry) of an exercise: of the first of apps (the sheet's modules) that has it, else
    of any app; None if the pool does not know it."""
    for app in list(apps or []) + list(pool):
        entry = pool.get(app)
        exs = entry.get("exercises", {}) if isinstance(entry, dict) else {}
        if key in exs:
            return app, exs[key]
    return None


def objective_keys(apps: List[Dict[str, object]], pool: Dict[str, object], cat: Dict[str, Dict[str, object]],
                   topics: List[str]) -> List[Dict[str, object]]:
    """Step 2 of a sheet: per module (apps: the hub's, {id, objectives: [{id}]}, in their order) and per
    learning objective of it, the exercises the pool links to it that are there (cat) and on the topics,
    best first (the pool's order): [{"app", "objectives": [{"id", "keys"}]}]."""
    out = []
    for a in apps:
        objs = (pool.get(a["id"]) or {}).get("objectives", {}) if isinstance(pool.get(a["id"]), dict) else {}
        rows = [{"id": o["id"], "keys": [k for k in objs.get(o["id"], []) if k in cat and on_topics(cat[k], topics)]}
                for o in a.get("objectives", []) if isinstance(o, dict)]
        out.append({"app": a["id"], "objectives": rows})
    return out


def loose_keys(apps: List[Dict[str, object]], pool: Dict[str, object], cat: Dict[str, Dict[str, object]],
               topics: List[str]) -> List[str]:
    """The exercises there on the topics that the pool links to no learning objective (of the apps), by key."""
    tied = set()
    for a in apps:
        objs = (pool.get(a["id"]) or {}).get("objectives", {}) if isinstance(pool.get(a["id"]), dict) else {}
        for o in a.get("objectives", []):
            tied.update(objs.get(o.get("id"), []) if isinstance(o, dict) else [])
    return sorted(k for k, e in cat.items() if k not in tied and on_topics(e, topics))


def buckets(modules: List[Dict[str, object]], loose: bool, apps: List[Dict[str, object]], pool: Dict[str, object],
            cat: Dict[str, Dict[str, object]], topics: List[str]) -> List[Tuple[Tuple[Optional[str], Optional[str]], List[str]]]:
    """What a sheet chooses from: ((app, objective), its exercises: objective_keys) for every ticked
    objective (modules: [{id, objectives}]) in the apps' order, then ((None, None), loose_keys) if loose."""
    ticked = {(m.get("id"), o) for m in modules if isinstance(m, dict) for o in m.get("objectives", [])}
    out: List[Tuple[Tuple[Optional[str], Optional[str]], List[str]]] = []
    for m in objective_keys(apps, pool, cat, topics):
        out += [((m["app"], o["id"]), o["keys"]) for o in m["objectives"] if (m["app"], o["id"]) in ticked]
    if loose:
        out.append(((None, None), loose_keys(apps, pool, cat, topics)))
    return out


def shares(total: int, weights: List[Tuple[object, float]]) -> Dict[object, int]:
    """total split by the weights (largest remainders; on a tie the first); all 0 if they are."""
    s = sum(max(w, 0) for _, w in weights)
    if not s:
        return {k: 0 for k, _ in weights}
    raw = {k: total * max(w, 0) / s for k, w in weights}
    out = {k: int(v) for k, v in raw.items()}
    order = [k for k, _ in weights]
    for k in sorted(order, key=lambda k: (-(raw[k] - out[k]), order.index(k)))[:total - sum(out.values())]:
        out[k] += 1
    return out


def aims(count: int, balance: Dict[str, int]) -> Dict[object, int]:
    """How many concept questions and textbook problems, and easy (1), medium (2), hard (3) exercises a
    sheet of count aims for."""
    out: Dict[object, int] = dict(shares(count, [(CONCEPT, balance["concept"]), (PROBLEM, 100 - balance["concept"])]))
    out.update(shares(count, [(1, balance["easy"]), (2, balance["medium"]), (3, balance["hard"])]))
    return out


def tally(keys: List[str], cat: Dict[str, Dict[str, object]], count: int, balance: Dict[str, int]) -> Dict[object, int]:
    """The concept questions, textbook problems and difficulties of a sheet (keys); an exercise of the
    type "Both" counts as a concept question as long as the sheet (count) lacks them, then as a problem."""
    want = aims(count, balance)
    got: Dict[object, int] = {CONCEPT: 0, PROBLEM: 0, 1: 0, 2: 0, 3: 0}
    both = 0
    for k in keys:
        e = cat.get(k)
        if not e:
            continue
        got[e["band"]] += 1
        if e["kind"] == BOTH:
            both += 1
        else:
            got[e["kind"]] += 1
    extra = min(both, max(want[CONCEPT] - got[CONCEPT], 0))
    got[CONCEPT] += extra
    got[PROBLEM] += both - extra
    return got


def default_count(bks: List[Tuple[object, List[str]]]) -> int:
    n = sum(1 for _, keys in bks if keys)
    return max(1, min(DEFAULT_MAX, PER_OBJECTIVE * n))


def suggest(bks: List[Tuple[Tuple[Optional[str], Optional[str]], List[str]]], cat: Dict[str, Dict[str, object]], lang: str,
            balance: Dict[str, int], count: Optional[int] = None) -> List[str]:
    """A balanced sheet (the exercises' keys, in the sheet's order): see the module's description."""
    count = default_count(bks) if count is None else max(1, min(int(count), MAX_EXERCISES))
    want = aims(count, balance)
    got: Dict[object, int] = {CONCEPT: 0, PROBLEM: 0, 1: 0, 2: 0, 3: 0}
    members = [set(keys) for _, keys in bks]
    covered = [0] * len(bks)
    chosen: List[str] = []
    taken = set()
    origin: Dict[str, int] = {}
    cats = load_categories()
    sims: Dict[Tuple[str, str], float] = {}

    def sim(a: str, b: str) -> float:
        if (a, b) not in sims:
            sims[(a, b)] = sims[(b, a)] = similarity(cat[a], cat[b], cats)
        return sims[(a, b)]
    for keys in members:  # flagged broken: never suggested
        taken.update(k for k in keys if cat[k].get("flag") == "broken")

    def clash(k: str) -> bool:
        """A near-duplicate of one chosen."""
        return any(sim(k, c) >= NEAR_DUP - 1e-9 or flagged_dup(cat[k], cat[c]) for c in chosen)
    def crowded(k: str) -> bool:
        """Too similar to one chosen (another as fitting comes first)."""
        return any(sim(k, c) >= TOO_SIMILAR for c in chosen)

    def need(k: str) -> int:
        e = cat[k]
        side = max(want[CONCEPT] - got[CONCEPT], want[PROBLEM] - got[PROBLEM]) if e["kind"] == BOTH else want[e["kind"]] - got[e["kind"]]
        return side + want[e["band"]] - got[e["band"]]
    def musts() -> List:
        """What the next exercise must be for the sheet to reach its aims (each slot left needed for a
        kind, or a difficulty): tests that some exercise not taken yet passes, the kind's first."""
        left = count - len(chosen)
        tests = []
        if want[CONCEPT] - got[CONCEPT] >= left:
            tests.append(lambda k: cat[k]["kind"] != PROBLEM)
        elif want[PROBLEM] - got[PROBLEM] >= left:
            tests.append(lambda k: cat[k]["kind"] != CONCEPT)
        tests += [lambda k, b=b: cat[k]["band"] == b for b in BANDS if want[b] - got[b] >= left]
        free = [k for keys in members for k in keys if k not in taken and not clash(k)]
        kept: List = []
        for t in tests:  # each as long as some exercise passes it and those kept
            if any(t(k) and all(x(k) for x in kept) for k in free):
                kept.append(t)
        return kept
    rounds = 0
    room = sum(1 for _, keys in bks if keys) <= count  # for one of every objective
    while len(chosen) < count:
        for i, (_, keys) in enumerate(bks):
            if len(chosen) >= count:
                break
            tests = [] if room and rounds == 0 else musts()
            if covered[i] > rounds:
                continue
            free = [k for k in keys if k not in taken and all(t(k) for t in tests) and not clash(k)]
            if not free:
                continue
            k = min(free, key=lambda k: (cat[k]["lang"] != lang, -need(k), crowded(k), bool(cat[k]["images"]), keys.index(k)))
            e = cat[k]
            side = e["kind"]
            if side == BOTH:  # for whichever the sheet lacks more (concept questions on a tie)
                side = CONCEPT if want[CONCEPT] - got[CONCEPT] >= want[PROBLEM] - got[PROBLEM] else PROBLEM
            got[side] += 1
            got[e["band"]] += 1
            chosen.append(k)
            taken.add(k)
            origin[k] = i
            for j, m in enumerate(members):
                covered[j] += k in m
        rounds += 1
        if all(k in taken for keys in members for k in keys) or rounds > MAX_EXERCISES + 1:
            break
    mods: List[Optional[str]] = []
    for (app, _), _keys in bks:
        if app not in mods:
            mods.append(app)
    first = {k: n for n, k in enumerate(chosen)}
    return sorted(chosen, key=lambda k: (mods.index(bks[origin[k]][0][0]), cat[k]["band"], first[k]))


def notes(bks: List[Tuple[object, List[str]]], cat: Dict[str, Dict[str, object]], balance: Dict[str, int], count: int) -> List[str]:
    """What the exercises to choose from (bks) cannot give a sheet of count with the balance: each a
    short sentence ("only 2 concept questions on these topics and objectives"); none if they can."""
    keys = list(dict.fromkeys(k for _, ks in bks for k in ks if k in cat))
    want = aims(count, balance)
    kinds = {x: sum(cat[k]["kind"] == x for k in keys) for x in (CONCEPT, BOTH, PROBLEM)}
    bands = {b: sum(cat[k]["band"] == b for k in keys) for b in BANDS}
    plural = lambda n, one, many: f"{n} {one if n == 1 else many}"
    out = []
    if len(keys) < count:
        out.append(f"only {plural(len(keys), 'exercise', 'exercises')} on these topics and objectives")
    if kinds[CONCEPT] + kinds[BOTH] < want[CONCEPT]:
        out.append(f"only {plural(kinds[CONCEPT] + kinds[BOTH], 'concept question', 'concept questions')} on these topics and objectives"
                   + (f" ({kinds[BOTH]} of the type Both)" if kinds[BOTH] else ""))
    if kinds[PROBLEM] + kinds[BOTH] < want[PROBLEM]:
        out.append(f"only {plural(kinds[PROBLEM] + kinds[BOTH], 'textbook problem', 'textbook problems')} on these topics and objectives")
    for b, name in BANDS.items():
        if bands[b] < want[b]:
            out.append(f"only {plural(bands[b], name + ' exercise', name + ' exercises')} on these topics and objectives")
    return out


def alternatives(key: str, sheet: List[str], bks: List[Tuple[object, List[str]]], cat: Dict[str, Dict[str, object]],
                 lang: str, limit: int = 5) -> List[str]:
    """Up to limit exercises to take instead of key: of the same objectives of the sheet (bks; of all of
    them, if it practises none), not on the sheet; the sheet's language first, then the same kind
    (concept question or problem; "Both" is either), then how near their difficulty is, without image
    first, those that share more objectives, the order of the objectives."""
    mine = [keys for _, keys in bks if key in keys] or [keys for _, keys in bks]
    e = cat.get(key) or {"kind": PROBLEM, "band": 2}
    cats = load_categories()
    others = [cat[k] for k in sheet if k != key and k in cat]
    order: Dict[str, Tuple[int, int]] = {}
    for keys in mine:
        for n, k in enumerate(keys):
            if k != key and k not in sheet and k in cat and k not in order:
                if any(near_dup(cat[k], o, cats) for o in others):
                    continue
                order[k] = (0, n)
            if k in order:
                shared, first = order[k]
                order[k] = (shared + 1, min(first, n))
    sims = {k: round(similarity(e, cat[k], cats), 3) for k in order}

    def rank(k: str):
        c = cat[k]
        same = c["kind"] == e["kind"] or BOTH in (c["kind"], e["kind"])
        return (c["lang"] != lang, -sims[k], not same, abs(c["band"] - e["band"]), bool(c["images"]), -order[k][0], order[k][1], k)
    return sorted(order, key=rank)[:limit]


def coverage(pool: Dict[str, object], apps: List[Dict[str, object]], have) -> List[Dict[str, object]]:
    """The topics the pool covers (the first section of the Sheets tab): per module, in the order of
    apps (the hub's, each {id, name, de?, objectives: [{id, en, de}]}; then any other app of the
    pool), its exercises, those of them that are there (have), those that practise none of its
    objectives (the module as a whole), and per objective the same two numbers. An objective of the
    pool that apps does not name comes after the others, by its id; one without exercises has 0."""
    out = []
    known = [a for a in apps if isinstance(a, dict) and isinstance(a.get("id"), str)]
    extra = [{"id": k, "name": k, "objectives": []} for k in pool if k not in {a["id"] for a in known}]
    for a in known + extra:
        entry = pool.get(a["id"]) if isinstance(pool.get(a["id"]), dict) else {}
        exs = entry.get("exercises") if isinstance(entry.get("exercises"), dict) else {}
        objs = entry.get("objectives") if isinstance(entry.get("objectives"), dict) else {}
        named = [o for o in a.get("objectives", []) if isinstance(o, dict) and isinstance(o.get("id"), str)]
        named += [{"id": o, "en": o, "de": o} for o in objs if o not in {x["id"] for x in named}]
        tied = set()
        rows = []
        for o in named:
            keys = [k for k in objs.get(o["id"], []) if isinstance(k, str)]
            tied.update(keys)
            rows.append({"id": o["id"], "en": str(o.get("en") or o["id"]), "de": str(o.get("de") or o.get("en") or o["id"]),
                         "exercises": len(keys), "there": len([k for k in keys if k in have])})
        out.append({"id": a["id"], "name": str(a.get("name") or a["id"]), **({"de": a["de"]} if a.get("de") else {}),
                    "exercises": len(exs), "there": len([k for k in exs if k in have]),
                    "general": len([k for k in exs if k not in tied]), "objectives": rows})
    return out


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
            if f.name.startswith("."):  # notes of the panel (.fetch-failed.json), files being written
                continue
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


LOGIN = "TeXercises asks for a login (download it there and upload it here)"


def fetch_image(images: Path, name: str, stem: str, timeout: float = 20) -> Tuple[bool, str]:
    """Fetch a gallery image from TeXercises (which redirects to the file) and keep it as <stem>.<type>;
    (True, the file name) or (False, why not)."""
    if not valid_name(name):
        return False, "not an image name"
    req = urllib.request.Request(GALLERY.format(name), headers={"User-Agent": "learningphysics.ch exercise sheets"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read(MAX_IMAGE + 1)
    except urllib.error.HTTPError as e:
        return False, LOGIN if e.code in (401, 403) else f"TeXercises answered {e.code}"
    except (urllib.error.URLError, OSError, ValueError) as e:
        return False, f"TeXercises did not answer ({e.__class__.__name__})"
    if len(data) > MAX_IMAGE:
        return False, "too large"
    if image_kind(data) is None:
        return False, LOGIN
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
