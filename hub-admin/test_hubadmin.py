"""Tests of the hub admin: run with `python3 hub-admin/test_hubadmin.py`.

Checks the reading of the hub page, the cleaning of a configuration and of sets (with learning
objectives, and those saved before there were objectives), the names a set
may have (and that no app or set clashes with a service nginx passes on), the atomic write, the password (in the crossword app's format) and sessions, and the
service end to end: login, rate limit, the API with and without a session, and that saves reach
apps.json and sets.json. The exercise sheets: the kind (concept question or problem) and difficulty
of an exercise from its TeXercises type and default difficulty, the learning objectives on a sheet's
topics and the exercises in none, what a sheet suggests (every objective covered, the language,
exercises without image, the balance of concept questions and of difficulties, and what cannot be
said), the topic tree of categories.json (counts, the exercises not yet categorised, the kind by the
task kind, TeXercises topics of sheets saved before still matching), the similarity of exercises (its
flagged duplicates similar, no near-duplicates on a suggested sheet), sheets saved before the topics,
and the alternatives of an exercise (the most similar first), the .tex
of an ordered list of exercises (without LaTeX), the PDFs where LaTeX is missing, the upload of a
TeXercises export (only the teacher's exercises kept, nothing written outside its folder), the
preview (sheets/preview.py: the arithmetic of the solver part, numbers and units, text to HTML,
everything escaped, and every draft of this repository), and the service: a sheet created, changed,
shared, duplicated and deleted, everything only when logged in except a shared sheet's online
version, which shows no solutions; the figures (the LaTeX of an exercise's TikZ pictures, their
hash and cache) and the gallery images (uploaded, as a .zip, fetched from TeXercises, served only
to the panel and a shared sheet, never outside their folder), and both in the preview's HTML. The
topics the pool covers, and the exercises' review in the Sheets tab (the superuser alone reads and
uploads it, the report checked and cleaned; the feedback on it kept by exercise id and fingerprint of
the issue, and its export; an image replaced by TikZ: drawn, LaTeX's error, Claude's draft from a fake
API, saved, checked and exported); the TeXercises review page that was at /texercises/ gone. The exercises
uploaded since categories.json: provisional labels of the nearest exercise, the overlay merged (the
teacher's labels never overwritten), Claude's labels from a fake API (checked, refusals and errors
handled), what is said without the anthropic package or key, and the endpoints the superuser's only.
"""
import io
import zipfile
import hashlib
import json
import math
import os
import re
import secrets
import time
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from html import escape
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import hubadmin as H  # noqa: E402
from sheets import sheets as S  # noqa: E402
from sheets import preview as P  # noqa: E402
from unittest import mock  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def hash_password(password: str, iterations: int = 1000) -> str:  # as crosswords-web set-password
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


class Unit(unittest.TestCase):
    def test_hub_apps(self):
        apps = H.hub_apps((ROOT / "hub" / "index.html").read_text())
        ids = [a["id"] for a in apps]
        self.assertIn("coe", ids)
        self.assertIn("force-systems", ids)
        self.assertEqual(len(ids), len(set(ids)))
        names = {a["id"]: a["name"] for a in apps}
        self.assertEqual(names["coe"], "Energy Conservation")
        self.assertEqual({a["id"]: a.get("de") for a in apps}["coe"], "Energieerhaltung")  # (the hub page's German texts)
        self.assertTrue(all(a.get("de") for a in apps))
        self.assertEqual(names["bulb-brightness"], "Bulb Brightness")
        modes = {a["id"]: a["modes"] for a in apps}
        self.assertEqual(modes["bulb-brightness"], ["tutor", "practice", "check"])
        self.assertEqual(modes["photons"], ["tutor", "practice", "check"])
        starters = {a["id"]: a.get("tags") for a in apps}
        self.assertEqual(starters["photons"][:2], [{"en": "Quantum physics", "de": "Quantenphysik"}, {"en": "Light", "de": "Licht"}])
        self.assertIsNone(starters["coe"])
        self.assertEqual(H.starter_tags(" Light | Licht ;; Waves ; |x"), [{"en": "Light", "de": "Licht"}, {"en": "Waves", "de": "Waves"}])

    def test_set_names(self):
        ids = ["coe", "torque"]
        self.assertIsNone(H.set_name_problem("3a-elektro", ids))
        for bad in ["", "3A", "-x", "a b", "x" * 41, "über", None, 3]:
            self.assertIn("not a valid name", H.set_name_problem(bad, ids))
        self.assertIn("name of an app", H.set_name_problem("coe", ids))
        self.assertIn("taken", H.set_name_problem("admin", ids))
        self.assertIn("taken", H.set_name_problem("katex", ids))
        self.assertIn("taken", H.set_name_problem("folder", ids, lambda n: n == "folder"))

    def test_normalize_sets(self):
        apps = [{"id": "coe", "modes": ["tutor", "practice", "check"]}, {"id": "rl", "modes": ["tutor", "check"]}]
        out = H.normalize_sets({"sets": {
            "3a": {"title": " Klasse <b>3a</b>\n ", "apps": [
                {"id": "rl", "modes": ["check", "practice", "tutor", "x"], "objectives": ["keep", "keep", "a b", "<x>", 3, "after"]},
                {"id": "nope", "modes": ["tutor"]},
                {"id": "coe", "modes": ["check"], "objectives": []},  # none: all of them
                {"id": "rl", "modes": ["tutor"]},  # twice
            ]},
            "4b": {"apps": [{"id": "coe", "modes": [], "objectives": ["forms"]}, "junk"]},  # no mode: left out
            "5c": "junk",
        }}, apps)
        self.assertEqual(out, {"sets": {
            "3a": {"title": "Klasse b3a/b", "apps": [{"id": "rl", "modes": ["tutor", "check"], "objectives": ["keep", "after"]}, {"id": "coe", "modes": ["check"]}]},
            "4b": {"title": "", "apps": []},
            "5c": {"title": "", "apps": []},
        }})
        self.assertEqual(H.normalize_sets(None, apps), {"sets": {}})
        with self.assertRaises(ValueError):
            H.normalize_sets({"sets": {"coe": {}}}, apps)
        self.assertEqual(H.normalize_sets({"sets": {"coe": {}, "ok": {}}}, apps, strict=False), {"sets": {"ok": {"title": "", "apps": []}}})
        with self.assertRaises(ValueError):
            H.normalize_sets({"sets": {f"s{i}": {} for i in range(H.MAX_SETS + 1)}}, apps)

    def test_set_objectives(self):
        # with the app's objectives known (objectives.json): in its order, unknown ones dropped,
        # all of them or none left is no list (all)
        apps = {"coe": {"id": "coe", "modes": ["tutor", "practice", "check"], "objectives": ["forms", "balance", "path"]}}
        one = lambda o: H.normalize_set_app({"id": "coe", "modes": ["tutor", "check"], "objectives": o}, apps)
        self.assertEqual(one(["path", "forms", "gone"]), {"id": "coe", "modes": ["tutor", "check"], "objectives": ["forms", "path"]})
        self.assertEqual(one(["path", "balance", "forms"]), {"id": "coe", "modes": ["tutor", "check"]})
        self.assertEqual(one(["gone"]), {"id": "coe", "modes": ["tutor", "check"]})
        self.assertEqual(len(H.normalize_set_app({"id": "coe", "modes": ["check"], "objectives": [f"o{i}" for i in range(99)]}, {"coe": {"modes": ["check"]}})["objectives"]), H.MAX_OBJECTIVES)
        # objectives replace the examples and stages of a set saved before
        self.assertEqual(H.normalize_set_app({"id": "coe", "modes": ["tutor", "practice"], "objectives": ["path"], "tutor": [1], "practice": ["a"]}, apps),
                         {"id": "coe", "modes": ["tutor", "practice"], "objectives": ["path"]})

    def test_sets_saved_before(self):
        # sets saved before there were objectives: their examples and stages stay (the apps still
        # apply them), the arcade is now the check and the problems are now practice
        apps = {"coe": {"id": "coe", "modes": ["tutor", "practice", "check"]}, "rl": {"id": "rl", "modes": ["tutor", "practice", "check"]}}
        old = {"sets": {"3a": {"title": "3a", "apps": [
            {"id": "rl", "modes": ["arcade", "real", "tutor", "x"], "tutor": [2, 0, 2, -1, True, "1"], "practice": ["a+b", "a+b", "a b", "c"]},
            {"id": "coe", "modes": ["practice"], "tutor": [1], "practice": []},  # no stage: practice goes, nothing left
            {"id": "coe", "modes": ["arcade"], "tutor": [1], "practice": ["a"]},  # the check, without the stages
        ]}, "4b": {"apps": [{"id": "coe", "modes": ["tutor", "real"], "tutor": []}]}}}
        self.assertEqual(H.normalize_sets(old, list(apps.values()), strict=False), {"sets": {
            "3a": {"title": "3a", "apps": [{"id": "rl", "modes": ["tutor", "practice", "check"], "tutor": [0, 2], "practice": ["a+b", "c"]}, {"id": "coe", "modes": ["check"]}]},
            "4b": {"title": "", "apps": [{"id": "coe", "modes": ["practice"]}]},  # no example: the tutor goes
        }})
        # the stages stay with practice alone, the examples only with the tutor
        self.assertEqual(H.normalize_set_app({"id": "coe", "modes": ["arcade"], "tutor": [1], "practice": ["a"]}, apps), {"id": "coe", "modes": ["check"]})
        self.assertEqual(H.normalize_set_app({"id": "coe", "modes": ["real"], "tutor": [1], "practice": ["a"]}, apps), {"id": "coe", "modes": ["practice"], "practice": ["a"]})
        keys = ["series:easy", "gravity/rank-launch+force/ramp", "pickinv-RL-series+pickinv-RC-series"]  # as in the apps
        self.assertEqual(H.normalize_set_app({"id": "coe", "modes": ["practice"], "practice": keys + ["<x>", "a b", "x" * 1001]}, apps)["practice"], keys)

    def test_names_do_not_clash(self):
        # the services nginx passes on (games, quizzes, the admin panel): an app deployed at the
        # same path would be hidden behind them, and so would a set of that name
        conf = (ROOT / "deploy" / "nginx" / "learningphysics.conf").read_text()
        services = set(re.findall(r"location /([a-z0-9-]+)/ \{[^}]*proxy_pass", conf))
        self.assertIn("wwtbap", services)
        self.assertLessEqual(services, H.RESERVED, "a service is missing from RESERVED (set names)")
        apps = re.search(r'^APPS="([^"]*)"', (ROOT / "deploy.sh").read_text(), re.M).group(1).split()
        paths = {a.split(":")[-1] for a in apps}
        self.assertIn("coe", paths)
        self.assertEqual(paths & services, set(), "an app is deployed at the path of a service")

    def test_normalize(self):
        ids = ["a", "b", "c"]
        cfg = H.normalize({
            "order": ["c", "x", "a", "c"],
            "tags": {"a": ["mech", "mech", "Energie", 3, ""], "b": ["mech2", "ac"], "c": ["<b>Waves</b>"], "x": ["mech"]},
            "labels": {"mech": {"en": " Mechanics ", "de": "Mechanik"}, "mech2": {"en": "mechanics", "de": "x"},
                       "ac": {"en": "AC circuits"}, "unused": {"en": "Optics", "de": "Optik"}, "Bad Key": {"en": "y"}},
        }, ids)
        self.assertEqual(cfg["order"], ["c", "a", "b"])
        # plain text becomes a tag of that name; two tags of the same English name are one
        self.assertEqual(cfg["tags"], {"c": ["bwaves-b"], "a": ["mech", "energie"], "b": ["mech", "ac"]})
        self.assertEqual(cfg["labels"], {
            "bwaves-b": {"en": "bWaves/b", "de": "bWaves/b"},
            "mech": {"en": "Mechanics", "de": "Mechanik"},
            "energie": {"en": "Energie", "de": "Energie"},
            "ac": {"en": "AC circuits", "de": "AC circuits"},  # German as English if missing
        })
        self.assertEqual(H.normalize(None, ids), {"order": ids, "tags": {}, "labels": {}})
        many = H.normalize({"tags": {"a": [f"t{i}" for i in range(20)]}}, ids)
        self.assertEqual(len(many["tags"]["a"]), H.MAX_TAGS)
        self.assertEqual(len(many["labels"]), H.MAX_TAGS)  # the names of dropped tags go too
        self.assertEqual(len(H.clean_tag("x" * 100)), H.MAX_TAG_LEN)
        self.assertEqual(H.slug("Kräfte & Bewegung"), "kraefte-bewegung")

    def test_starter_tags(self):
        # an app without tags gets the starter tags of its card; one of the same English name is that tag
        ids = ["a", "b", "new"]
        starters = {"new": [{"en": "light", "de": "Licht!"}, {"en": "Quantum physics", "de": "Quantenphysik"}], "b": [{"en": "Waves", "de": "Wellen"}]}
        cfg = H.normalize({"order": ["a", "b"], "tags": {"b": ["l"]}, "labels": {"l": {"en": "Light", "de": "Licht"}}}, ids, starters)
        self.assertEqual(cfg["tags"], {"b": ["l"], "new": ["l", "quantum-physics"]})  # b has tags: no starters
        self.assertEqual(cfg["labels"], {"l": {"en": "Light", "de": "Licht"}, "quantum-physics": {"en": "Quantum physics", "de": "Quantenphysik"}})
        # an app already in the order but still without tags gets them too, under the saved key of that name
        cfg = H.normalize({"order": ["new", "b", "a"], "tags": {"b": ["dc"]}, "labels": {"dc": {"en": "Light", "de": "Licht"}}}, ids, starters)
        self.assertEqual(cfg["tags"], {"new": ["dc", "quantum-physics"], "b": ["dc"]})
        self.assertTrue(H.slug("…").startswith("tag-"))

    def test_write(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "sub" / "apps.json"
            H.write_config(p, {"order": ["a"], "tags": {"a": ["Ä"]}})
            self.assertEqual(json.loads(p.read_text()), {"order": ["a"], "tags": {"a": ["Ä"]}})
            self.assertEqual([f.name for f in p.parent.iterdir()], ["apps.json"])  # no temporary file left
            self.assertEqual(p.stat().st_mode & 0o777, 0o644)

    def test_password_and_session(self):
        with tempfile.TemporaryDirectory() as d:
            pw = Path(d) / "pw"
            pw.write_text(hash_password("secret pass") + "\n")
            self.assertTrue(H.verify_password("secret pass", pw.read_text()))
            self.assertFalse(H.verify_password("wrong", pw.read_text()))
            self.assertFalse(H.verify_password("x", "garbage"))
            a = H.Admin(pw, Path(d) / "hub", Path(d) / "apps.json")
            s = a.new_session()
            self.assertTrue(a.valid_session(s))
            self.assertFalse(a.valid_session(s[:-1] + ("0" if s[-1] != "0" else "1")))
            self.assertFalse(a.valid_session("1.abc"))
            # the file's password became the superuser's own: the file is not read again
            self.assertEqual(a.read_super()["hash"], pw.read_text().strip())
            pw.write_text(hash_password("new pass") + "\n")
            self.assertTrue(a.valid_session(s))
            self.assertEqual(a.login("", "new pass"), None)
            pw.unlink()
            self.assertEqual(a.login("", "secret pass"), "bys")
            a.change_password("bys", "secret pass", "my own pass")  # a new password ends the session
            self.assertFalse(a.valid_session(s))
            self.assertEqual(a.login("samuel.byland", "my own pass"), "bys")
            # without the file and without a password of their own, no one logs in as the superuser
            b = H.Admin(None, Path(d) / "hub", Path(d) / "x" / "apps.json")
            self.assertEqual(b.stored_hash(), "")
            self.assertIsNone(b.login("", ""))


def export_zip(exercises):
    """A TeXercises export as bytes: {key: creator}, plus a file trying to leave its folder."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for key, creator in exercises.items():
            z.writestr(f"bundle/exercises/{key}/exercise.json", json.dumps({"title": key, "language": "ENG", "info": {"creator": creator}}))
            z.writestr(f"bundle/exercises/{key}/text.tex", "Text of " + key)
            z.writestr(f"bundle/exercises/{key}/notes.txt", "not kept")
        z.writestr("bundle/exercises/../../evil/exercise.json", "{}")
    return buf.getvalue()


def ex(lang="en", difficulty=1, images=False, title=""):
    return {"lang": lang, "difficulty": difficulty, "images": images, "title": title}


def meta(lang="en", type_=1, difficulty=2, topics=("Electrostatics",), images=False):
    """An exercise as sheets.exercise_meta has it."""
    return {"title": "", "lang": lang, "difficulty": difficulty, "type": type_, "kind": S.kind(type_), "band": S.band(difficulty),
            "topics": list(topics), "images": images, "url": None}


class Sheets(unittest.TestCase):
    # two modules: coulomb with two objectives, magnet with one; x1 on the same topic in none, x2 without topic
    POOL = {
        "coulomb": {"objectives": {"factor": ["f1", "f2", "f3", "f4", "f5"], "field": ["d1", "d2"]},
                    "exercises": {k: ex() for k in ("f1", "f2", "f3", "f4", "f5", "d1", "d2")}},
        "magnet": {"objectives": {"wire": ["w1", "w2"]}, "exercises": {"w1": ex(), "w2": ex()}},
    }
    APPS = [{"id": "coulomb", "objectives": [{"id": "factor"}, {"id": "field"}]}, {"id": "magnet", "objectives": [{"id": "wire"}]}]
    CAT = {"f1": meta("en", 1, 1), "f2": meta("en", 1, 2), "f3": meta("de", 0, 2), "f4": meta("en", 0, 3, images=True),
           "f5": meta("en", 2, None), "d1": meta("en", 1, 3), "d2": meta("en", 3, 1),
           "w1": meta("en", 1, 2, ("Magnetism",)), "w2": meta("en", 0, 1, ("Magnetism",)),
           "x1": meta("en", 0, 2), "x2": meta("en", 1, 2, ())}
    ALL = [{"id": "coulomb", "objectives": ["factor", "field"]}, {"id": "magnet", "objectives": ["wire"]}]
    TOPICS = ["Electrostatics", "Magnetism"]

    def bks(self, modules=None, loose=False, topics=None):
        return S.buckets(self.ALL if modules is None else modules, loose, self.APPS, self.POOL, self.CAT, self.TOPICS if topics is None else topics)

    def test_kind_and_band(self):
        # the TeXercises type: 0 descriptive and 3 true/false concept questions, 2 both, the others problems
        self.assertEqual([S.kind(t) for t in (0, 3, 2, 1, 5, 6, 7, None, True, "0")],
                         ["concept", "concept", "both", "problem", "problem", "problem", "problem", "problem", "problem", "problem"])
        # default_difficulty: 1 easy, 2 medium, 3 and more hard, none medium
        self.assertEqual([S.band(d) for d in (1, 2, 3, 5, 0, None, True, "1")], [1, 2, 3, 3, 1, 2, 2, 2])
        self.assertEqual(S.shares(12, [(1, 20), (2, 50), (3, 30)]), {1: 2, 2: 6, 3: 4})
        self.assertEqual(S.shares(4, [("a", 50), ("b", 50)]), {"a": 2, "b": 2})
        self.assertEqual(S.shares(3, [("a", 50), ("b", 50)]), {"a": 2, "b": 1})  # a tie: the first
        self.assertEqual(S.shares(5, [("a", 0), ("b", 0)]), {"a": 0, "b": 0})
        self.assertEqual(S.aims(10, S.BALANCE), {"concept": 3, "problem": 7, 1: 3, 2: 5, 3: 2})
        # an exercise of the type Both counts as a concept question while the sheet lacks them
        bal = {"concept": 50, "easy": 30, "medium": 50, "hard": 20}
        self.assertEqual(S.tally(["f5", "f1", "x1"], self.CAT, 4, bal), {"concept": 2, "problem": 1, 1: 1, 2: 2, 3: 0})
        self.assertEqual(S.tally(["f5", "d2", "x1"], self.CAT, 4, bal), {"concept": 2, "problem": 1, 1: 1, 2: 2, 3: 0})

    def test_exercise_meta(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "e1"
            f.mkdir()
            (f / "exercise.json").write_text(json.dumps({"title": " Two  charges ", "language": "GER", "type": 2, "subbranches": ["Electrostatics", 3],
                                                         "info": {"url": "/exercise/two-charges/"}}))
            (f / "text.tex").write_text("\\includegraphics{#image_path:coil-1#}")
            m = S.exercise_meta(f)
            self.assertEqual(m, {"title": "Two charges", "id": None, "lang": "de", "difficulty": None, "type": 2, "kind": "both", "band": 2,
                                 "topics": ["Electrostatics"], "images": True, "url": "/exercise/two-charges/", "quality": None})
            (f / "exercise.json").write_text(json.dumps({"language": "ENG", "type": 0, "default_difficulty": 4, "info": {"url": "javascript:x"}}))
            os.utime(f / "exercise.json", ns=(1, 2))  # changed: read again
            m = S.exercise_meta(f)
            self.assertEqual((m["title"], m["lang"], m["kind"], m["band"], m["topics"], m["url"]), ("e1", "en", "concept", 3, [], None))
            self.assertEqual(S.catalog({"e1": f})["e1"], m)
            self.assertEqual(S.topic_counts({"e1": f}), [])  # no topic, and no other: none listed

    def test_catalogue(self):
        # catalogue.json: a module per topic of its tree that has objectives (ids "c-" + slug, objectives with "-"),
        # each exercise's objectives, quality and difficulty
        cata = {"tree": [{"en": "Mechanics", "de": "Mechanik", "topics": [
                    {"en": "Kinematics in 1D", "de": "Kinematik in 1D", "subtopics": [{"id": "kin.accel", "objectives": [
                        {"id": "kin.accel.equations", "en": "Equations", "de": "Gleichungen"}, {"id": "kin.accel.braking", "en": "Braking"},
                        {"id": "kin.accel.graph", "en": "Graph", "hub": ["motion:graph", "motion:none", "nohub"]}]}]},
                    {"en": "Statics", "subtopics": [{"id": "stat.com", "objectives": []}]}]},
                    {"en": "Modern physics", "de": "Moderne Physik", "topics": [{"en": "Quantum physics", "subtopics": [{"id": "qm.photon", "objectives": [
                        {"id": "qm.photon.energy", "en": "Photon energy"}]}]}]}],
                "exercises": {"11": {"objectives": ["kin.accel.equations", "no.such"], "quality": 3, "difficulty": 2},
                              "12": {"objectives": ["kin.accel.equations", "kin.accel.braking"], "quality": 5, "difficulty": 4},
                              "13": {"objectives": ["kin.accel.equations", "kin.accel.graph"], "quality": 2, "difficulty": 1},
                              "14": {"objectives": ["qm.photon.energy"], "quality": 9, "difficulty": "x", "dup_of": "12"}}}
        with tempfile.TemporaryDirectory() as d, mock.patch.object(S, "CATALOGUE", Path(d) / "catalogue.json"):
            (Path(d) / "catalogue.json").write_text(json.dumps(cata))
            got = S.load_catalogue()
            self.assertEqual([(a["id"], a["name"], a["de"], a["area"]) for a in got["apps"]],
                             [("c-kinematics-in-1d", "Kinematics in 1D", "Kinematik in 1D", "Mechanics"), ("c-quantum-physics", "Quantum physics", "Quantum physics", "Modern physics")])
            self.assertEqual(got["apps"][0]["objectives"], [{"id": "kin-accel-equations", "en": "Equations", "de": "Gleichungen"},
                                                            {"id": "kin-accel-braking", "en": "Braking", "de": "Braking"}])
            self.assertEqual(got["exercises"]["11"], {"objectives": ["kin.accel.equations"], "quality": 3, "difficulty": 2, "dup_of": None})
            self.assertEqual(got["hub"], {"kin.accel.graph": [("motion", "graph"), ("motion", "none")]})  # a hub objective's: no topic's
            self.assertEqual(got["exercises"]["13"]["objectives"], ["kin.accel.equations", "kin.accel.graph"])
            self.assertEqual(got["exercises"]["14"], {"objectives": ["qm.photon.energy"], "quality": 5, "difficulty": None, "dup_of": "12"})
            # the areas: one AREAS names by its rank, the others after them
            self.assertEqual(S.area_of("c-kinematics-in-1d"), (0, "Mechanics", "Mechanik"))
            self.assertEqual(S.area_of("c-quantum-physics"), (4, "Modern Physics", "Moderne Physik"))  # the hub's area of that name
            # the exercises (by TeXercises id) and their meta: quality, and the catalogue's difficulty wins
            folders = {}
            for eid, key in ((11, "a"), (12, "b"), (13, "c"), (14, "q")):
                f = Path(d) / key
                f.mkdir()
                (f / "exercise.json").write_text(json.dumps({"id": eid, "title": key, "language": "ENG", "type": 1, "default_difficulty": 1}))
                folders[key] = f
            cat = S.catalog(folders)
            self.assertEqual([(cat[k]["quality"], cat[k]["difficulty"], cat[k]["band"]) for k in "abcq"], [(3, 2, 2), (5, 4, 3), (2, 1, 1), (5, 1, 1)])
            self.assertEqual((cat["q"]["flag"], S.flagged_dup(cat["q"], cat["b"])), ("dup:12", True))  # a copy: never with its original
            pool = S.catalogue_pool(cat)
            self.assertEqual(pool["c-kinematics-in-1d"]["objectives"], {"kin-accel-equations": ["b", "a", "c"], "kin-accel-braking": ["b"]})
            self.assertEqual(sorted(pool["c-kinematics-in-1d"]["exercises"]), ["a", "b", "c"])
            hub = {"motion": {"objectives": {"graph": ["x"]}, "exercises": {"x": {"title": "x"}}}}
            with mock.patch.object(S, "load_pool", lambda: hub):
                full = S.full_pool(cat)
            self.assertEqual(full["c-quantum-physics"]["objectives"], {"qm-photon-energy": ["q"]})
            # the exercises of an objective that restates a hub objective join that one, after pool.json's own
            self.assertEqual(full["motion"]["objectives"], {"graph": ["x", "c"]})
            self.assertEqual((sorted(full["motion"]["exercises"]), full["motion"]["exercises"]["c"]["quality"]), (["c", "x"], 2))
            # a sheet prefers the better quality, and one of quality 2 comes only when no other fits
            bks = [(("c-kinematics-in-1d", "kin-accel-equations"), ["c", "a"])]
            bal = {"concept": 0, "easy": 100, "medium": 0, "hard": 0}
            self.assertEqual(S.suggest(bks, cat, "en", bal, 1), ["a"])  # c is easy as the balance wants, but weak
            self.assertEqual(S.suggest(bks, cat, "en", bal, 2), ["c", "a"])
            self.assertEqual(S.alternatives("b", ["b"], bks, cat, "en"), ["a", "c"])

    def test_objectives_and_loose(self):
        # step 2: per module the objectives the pool links to exercises on the topics (there), in the apps' order
        got = S.objective_keys(self.APPS, self.POOL, self.CAT, ["Electrostatics"])
        self.assertEqual(got, [{"app": "coulomb", "objectives": [{"id": "factor", "keys": ["f1", "f2", "f3", "f4", "f5"]}, {"id": "field", "keys": ["d1", "d2"]}]},
                               {"app": "magnet", "objectives": [{"id": "wire", "keys": []}]}])
        cat = {k: v for k, v in self.CAT.items() if k != "f2"}  # not there
        self.assertEqual(S.objective_keys(self.APPS, self.POOL, cat, ["Magnetism"])[0]["objectives"][0]["keys"], [])
        self.assertEqual(S.objective_keys(self.APPS, self.POOL, cat, ["Electrostatics"])[0]["objectives"][0]["keys"], ["f1", "f3", "f4", "f5"])
        # the exercises on the topics in no objective; "" is those without topic
        self.assertEqual(S.loose_keys(self.APPS, self.POOL, self.CAT, ["Electrostatics"]), ["x1"])
        self.assertEqual(S.loose_keys(self.APPS, self.POOL, self.CAT, ["Electrostatics", ""]), ["x1", "x2"])
        self.assertEqual(S.loose_keys(self.APPS, self.POOL, self.CAT, []), [])
        # the buckets: the ticked objectives in the apps' order, then the loose ones
        self.assertEqual(self.bks([{"id": "magnet", "objectives": ["wire"]}, {"id": "coulomb", "objectives": ["field"]}], True),
                         [(("coulomb", "field"), ["d1", "d2"]), (("magnet", "wire"), ["w1", "w2"]), ((None, None), ["x1"])])
        self.assertEqual(S.default_count(self.bks()), 6)

    def test_suggest_balance(self):
        # four exercises, half concept questions, 30/50/20 % (1 easy, 2 medium, 1 hard): round by round over
        # factor, field, wire, each the one the sheet lacks most (f2 before f5: the pool's order; d2, w1),
        # then the last slot must be a hard concept question: f4 (with image; f3 is German)
        bal = {"concept": 50, "easy": 30, "medium": 50, "hard": 20}
        keys = S.suggest(self.bks(), self.CAT, "en", bal, 4)
        self.assertEqual(keys, ["d2", "f2", "f4", "w1"])  # by module, from easy to hard
        self.assertEqual(S.tally(keys, self.CAT, 4, bal), {"concept": 2, "problem": 2, 1: 1, 2: 2, 3: 1})
        self.assertEqual(keys, S.suggest(self.bks(), self.CAT, "en", bal, 4))  # the same every time
        # the sheet's language first: German, f3 of factor
        self.assertIn("f3", S.suggest(self.bks(), self.CAT, "de", bal, 4))
        # a larger pool: the aims met exactly
        cat = {f"e{t}{d}{i}": meta("en", t, d) for t in (0, 1, 2) for d in (1, 2, 3) for i in range(4)}
        pool = {"a": {"objectives": {"o": sorted(cat)}, "exercises": {k: ex() for k in cat}}}
        bks = S.buckets([{"id": "a", "objectives": ["o"]}], False, [{"id": "a", "objectives": [{"id": "o"}]}], pool, cat, ["Electrostatics"])
        for bal, n in (({"concept": 50, "easy": 20, "medium": 50, "hard": 30}, 12), ({"concept": 0, "easy": 100, "medium": 0, "hard": 0}, 5),
                       ({"concept": 100, "easy": 0, "medium": 0, "hard": 100}, 8), (S.BALANCE, 10)):
            keys = S.suggest(bks, cat, "en", bal, n)
            self.assertEqual(len(set(keys)), n)
            self.assertEqual(S.tally(keys, cat, n, bal), S.aims(n, bal), bal)
            self.assertEqual(S.notes(bks, cat, bal, n), [])
        # never more than there are, nor than asked; nothing to choose from: nothing
        self.assertEqual(len(S.suggest(self.bks(), self.CAT, "en", bal, 99)), 9)
        self.assertEqual(len(S.suggest(self.bks(), self.CAT, "en", bal)), 6)  # by default two per objective
        self.assertEqual(S.suggest([], self.CAT, "en", bal, 5), [])
        self.assertEqual(S.suggest(self.bks(topics=["Optics"]), self.CAT, "en", bal, 5), [])

    def test_suggest_round_robin_and_aims(self):
        # every objective has one before any has two
        keys = S.suggest(self.bks(), self.CAT, "en", S.BALANCE, 3)
        self.assertEqual({o for k in keys for (a, o), ks in self.bks() if k in ks}, {"factor", "field", "wire"})
        # fewer exercises than objectives: the aims first (one concept question, and one exercise of each difficulty)
        keys = S.suggest(self.bks() + [(("magnet", "more"), ["w1"])], self.CAT, "en", S.BALANCE, 3)
        self.assertEqual(S.tally(keys, self.CAT, 3, S.BALANCE), S.aims(3, S.BALANCE))
        # unless the slots left are all needed for the aims: three of four concept questions, the objective
        # of problems only takes its turn once
        cat = {"p1": meta(), "p2": meta(), "p3": meta(), "c1": meta(type_=0), "c2": meta(type_=0), "c3": meta(type_=0)}
        bks = [(("a", "o"), ["p1", "p2", "p3"]), ((None, None), ["c1", "c2", "c3"])]
        bal = {"concept": 75, "easy": 0, "medium": 100, "hard": 0}
        self.assertEqual(S.suggest(bks, cat, "en", bal, 4), ["p1", "c1", "c2", "c3"])
        # without image first
        cat = {"i1": meta(images=True), "i2": meta()}
        self.assertEqual(S.suggest([(("a", "o"), ["i1", "i2"])], cat, "en", bal, 1), ["i2"])

    def test_suggest_short(self):
        # what the topics and objectives cannot give: the closest, and a note
        bal = {"concept": 100, "easy": 30, "medium": 50, "hard": 20}
        bks = self.bks([{"id": "coulomb", "objectives": ["field"]}], loose=True, topics=["Electrostatics"])  # d1 a problem; d2, x1 concept questions
        self.assertEqual(sorted(S.suggest(bks, self.CAT, "en", bal, 3)), ["d1", "d2", "x1"])
        self.assertEqual(S.notes(bks, self.CAT, bal, 3), ["only 2 concept questions on these topics and objectives"])
        self.assertEqual(S.notes(bks, self.CAT, bal, 5)[0], "only 3 exercises on these topics and objectives")
        self.assertEqual(S.notes([(("a", "o"), ["f5", "f1"])], self.CAT, bal, 2), ["only 1 concept question on these topics and objectives (1 of the type Both)"])
        self.assertIn("only 0 textbook problems on these topics and objectives", S.notes([(("a", "o"), ["x1"])], self.CAT, {**bal, "concept": 0}, 1))
        self.assertIn("only 0 hard exercises on these topics and objectives", S.notes([(("a", "o"), ["x1"])], self.CAT, {**bal, "easy": 0, "medium": 0, "hard": 100}, 1))

    def test_alternatives(self):
        # of the same objectives, not on the sheet: the sheet's language first, then the same kind (Both is
        # either), then a near difficulty
        bks = self.bks()
        self.assertEqual(S.alternatives("f2", ["f2", "f1"], bks, self.CAT, "en"), ["f5", "f4", "f3"])
        self.assertEqual(S.alternatives("f2", ["f2"], bks, self.CAT, "en"), ["f5", "f1", "f4", "f3"])
        self.assertEqual(S.alternatives("f2", ["f2"], bks, self.CAT, "en", 2), ["f5", "f1"])
        self.assertEqual(S.alternatives("d2", ["d2"], bks, self.CAT, "en"), ["d1"])
        # an exercise of none of the objectives: of all of them
        self.assertEqual(set(S.alternatives("x1", ["x1"], bks, self.CAT, "en", 10)), {"f1", "f2", "f3", "f4", "f5", "d1", "d2", "w1", "w2"})

    def test_coverage(self):
        POOL = {"coulomb": {"objectives": {"factor": ["f1", "f2", "f3", "f4", "f5"], "vector": ["v1", "v2", "f2"], "field": ["d1", "d2"]},
                            "exercises": {k: ex() for k in ("f1", "f2", "f3", "f4", "f5", "v1", "v2", "d1", "d2")}},
                "photons": {"objectives": {"wave": []}, "exercises": {"p1": ex(), "p2": ex(), "p3": ex()}}}
        # the topics of the pool, per module in the hub's order (then the pool's other apps), objectives
        # without exercises with 0, those of the pool that the hub does not name after the others
        apps = [{"id": "photons", "name": "Photoelectric Effect", "de": "Photoeffekt", "objectives": [{"id": "wave", "en": "Wave model", "de": "Wellenmodell"}]},
                {"id": "torque", "name": "Torque", "objectives": [{"id": "arm", "en": "Lever arm", "de": "Hebelarm"}]},
                {"id": "coulomb", "name": "Point Charges", "objectives": [{"id": "vector", "en": "Vector sum", "de": "Vektorsumme"}]}]
        got = S.coverage(POOL, apps, {k for a in POOL.values() for k in a["exercises"]} - {"f1", "p3"})
        self.assertEqual([m["id"] for m in got], ["photons", "torque", "coulomb"])
        photons, torque, coulomb = got
        self.assertEqual((photons["name"], photons["de"], photons["exercises"], photons["there"], photons["general"]), ("Photoelectric Effect", "Photoeffekt", 3, 2, 3))
        self.assertEqual(photons["objectives"], [{"id": "wave", "en": "Wave model", "de": "Wellenmodell", "exercises": 0, "there": 0}])
        self.assertEqual((torque["exercises"], torque["objectives"][0]["exercises"]), (0, 0))
        self.assertEqual([(o["id"], o["en"], o["exercises"], o["there"]) for o in coulomb["objectives"]],
                         [("vector", "Vector sum", 3, 3), ("factor", "factor", 5, 4), ("field", "field", 2, 2)])
        self.assertEqual((coulomb["exercises"], coulomb["there"], coulomb["general"]), (9, 8, 0))
        self.assertEqual([m["id"] for m in S.coverage(POOL, apps[:1], set())], ["photons", "coulomb"])  # (not on the hub: after)
        # each module has its area (the topics section groups by it); a module AREAS does not name is "Other", last
        self.assertEqual([(m["area"], m["area_de"], m["area_rank"]) for m in got],
                         [("Modern Physics", "Moderne Physik", 4), ("Mechanics", "Mechanik", 0), ("Electricity and Magnetism", "Elektrizität und Magnetismus", 2)])
        self.assertEqual(S.area_of("no-such-app"), (len(S.AREAS) + 100, "Other", "Weitere"))

    # categories.json in small: two areas (Optics without exercises there), x2 a near-duplicate of x1 (flagged)
    CATS = {"tree": {"Mechanics": {"Kinematics": {"kin.a": "Uniform motion", "kin.b": "Free fall"}, "Forces": {"dyn.a": "Newton's laws"}},
                     "Optics": {"Light": {"opt.a": "Refraction"}}},
            "exercises": {
                "1": {"sub": "kin.a", "sub2": [], "kind": "calculate", "kinds": ["calculate"], "steps": 1, "laws": ["uniform_motion"], "math": ["arith"], "repr": [], "context": "traffic"},
                "2": {"sub": "kin.a", "sub2": [], "kind": "calculate", "kinds": ["calculate"], "steps": 1, "laws": ["uniform_motion"], "math": ["arith"], "repr": [], "context": "traffic", "flag": "dup:1"},
                "3": {"sub": "kin.b", "sub2": [], "kind": "concept", "kinds": ["concept"], "steps": 1, "laws": ["free_fall"], "math": [], "repr": [], "context": "abstract"},
                "4": {"sub": "dyn.a", "sub2": ["kin.b"], "kind": "graph", "kinds": ["graph", "calculate"], "steps": 3, "laws": ["newton2", "friction"], "math": ["algebra", "vectors"], "repr": ["graph_sketch"], "context": "sport"},
                "5": {"sub": "opt.a", "sub2": [], "kind": "calculate", "kinds": ["calculate"], "steps": 2, "laws": ["snell"], "math": ["trig"], "repr": [], "context": "lab"},
                "6": {"sub": "kin.b", "sub2": ["kin.a"], "kind": "explain", "kinds": ["explain"], "steps": 2, "laws": ["free_fall", "uniform_motion"], "math": [], "repr": [], "context": "nature"},
                "8": {"sub": "kin.a", "sub2": [], "kind": "derive", "kinds": ["derive"], "steps": 2, "laws": ["uniform_motion"], "math": ["algebra"], "repr": [], "context": "abstract", "flag": "broken"}}}
    # the export: x1..x6 categorised (x5 is not there), x7 uploaded since (not categorised, a TeXercises Descriptive)
    EXPORT = {"x1": (1, 1, 2, "en"), "x2": (2, 1, 2, "de"), "x3": (3, 1, 1, "en"), "x4": (4, 1, 3, "en"), "x6": (6, 1, 2, "en"),
              "x7": (7, 0, 2, "en"), "x8": (8, 1, 2, "en")}  # key: (id, TeXercises type, difficulty, language)

    def categorised(self, d):
        """The export and categories.json above in folder d: (have, cat), with sheets.py reading that categories.json."""
        (Path(d) / "categories.json").write_text(json.dumps(self.CATS))
        have = {}
        for k, (eid, type_, diff, lang) in self.EXPORT.items():
            (Path(d) / k).mkdir()
            (Path(d) / k / "exercise.json").write_text(json.dumps({"id": eid, "title": k.upper(), "type": type_, "default_difficulty": diff,
                                                                   "language": "GER" if lang == "de" else "ENG", "subbranches": ["Kinematics"]}))
            have[k] = Path(d) / k
        patch = mock.patch.object(S, "CATEGORIES", Path(d) / "categories.json")
        patch.start()
        self.addCleanup(patch.stop)
        return have, S.catalog(have)

    def test_categories(self):
        with tempfile.TemporaryDirectory() as d:
            have, cat = self.categorised(d)
            # what an exercise has of categories.json; the kind by its task kind (concept and explain concept
            # questions, graph Both, the others problems), else by its TeXercises type
            x1, x2, x4, x7 = cat["x1"], cat["x2"], cat["x4"], cat["x7"]
            self.assertEqual((x1["id"], x1["area"], x1["topic"], x1["subtopic"], x1["secondary"], x1["task"], x1["flag"]),
                             (1, "Mechanics", "Kinematics", {"id": "kin.a", "label": "Uniform motion"}, [], "calculate", None))
            self.assertEqual((x2["flag"], x4["secondary"], x4["task"]), ("dup:1", ["kin.b"], "graph"))
            self.assertEqual({k: e["kind"] for k, e in cat.items()},
                             {"x1": "problem", "x2": "problem", "x3": "concept", "x4": "both", "x6": "concept", "x7": "concept", "x8": "problem"})
            self.assertEqual(cat["x3"]["type"], 1)  # (TeXercises' type stays: calculative, but a concept question by its task)
            self.assertEqual((x7["id"], "subtopic" in x7, x7["topics"]), (7, False, ["Kinematics"]))
            self.assertEqual([S.task_kind(t) for t in S.TASKS], ["concept", "concept", "problem", "problem", "problem", "both", "problem", "problem"])
            # step 1: the tree of the exercises there, by their main subtopic, with how many (and concept
            # questions, Both); Optics has none there: not shown; the one categories.json does not know apart
            tree = S.topic_tree(have)
            self.assertEqual(tree["new"], {"id": S.NEW, "exercises": 1, "concept": 1, "both": 0})
            self.assertEqual([(a["name"], a["exercises"], a["concept"], a["both"]) for a in tree["areas"]], [("Mechanics", 6, 2, 1)])
            kin, forces = tree["areas"][0]["topics"]
            self.assertEqual((kin["name"], kin["exercises"], kin["concept"], forces["name"], forces["exercises"], forces["both"]),
                             ("Kinematics", 5, 2, "Forces", 1, 1))
            self.assertEqual(kin["subtopics"], [{"id": "kin.a", "label": "Uniform motion", "exercises": 3, "concept": 0, "both": 0},
                                                {"id": "kin.b", "label": "Free fall", "exercises": 2, "concept": 2, "both": 0}])
            # a sheet's topics: subtopics, NEW for those not categorised, and (saved before) TeXercises topics
            on = lambda topics: sorted(k for k, e in cat.items() if S.on_topics(e, topics))
            self.assertEqual(on(["kin.a"]), ["x1", "x2", "x8"])
            self.assertEqual(on(["kin.b", "dyn.a"]), ["x3", "x4", "x6"])
            self.assertEqual(on([S.NEW]), ["x7"])
            self.assertEqual(on(["Kinematics"]), sorted(cat))  # a sheet saved before: its TeXercises topic still matches
            self.assertEqual(on(["Optics", ""]), [])
            self.assertEqual(H.migrate_sheet({"exercises": ["x1", "x7", "x2"]}, cat)["topics"], ["kin.a", "Kinematics"])
            # similarity: the duplicate pair the same, unrelated ones low; near-duplicates by flag only
            self.assertAlmostEqual(S.similarity(x1, x2), 1.0)
            self.assertLess(S.similarity(x1, x4), 0.3)
            self.assertEqual(S.similarity(x1, x7), 0.0)  # not categorised
            self.assertTrue(S.near_dup(x1, x2) and S.near_dup(x2, x1))
            self.assertFalse(S.near_dup(x1, x4) or S.near_dup(cat["x3"], cat["x6"]))
            self.assertTrue(S.flagged_dup({**x4, "flag": "dup:1"}, x1))
            self.assertEqual([k for k, _ in S.similar("x1", cat)], ["x2", "x8", "x6", "x3", "x4"])
            self.assertEqual(S.similar("x1", cat, 2, {"x2"})[0][0], "x8")
            self.assertEqual(S.similar("x7", cat), [])

    def test_real_categories(self):
        # categories.json of the repository: the tree as described, and its flagged duplicates similar
        cats = S.load_categories()
        self.assertEqual((len(cats["tree"]), sum(len(t) for _, t in cats["tree"]), len(cats["flat"])), (6, 29, 133))
        self.assertGreater(len(cats["exercises"]), 1500)
        m = lambda i: {"id": int(i), "flag": cats["exercises"][i]["flag"], **S._category(int(i), None, cats)}
        pairs = [(i, e["flag"][4:]) for i, e in cats["exercises"].items() if (e["flag"] or "").startswith("dup:") and e["flag"][4:] in cats["exercises"]]
        self.assertGreater(len(pairs), 90)
        sims = sorted(S.similarity(m(a), m(b), cats) for a, b in pairs)
        self.assertGreater(sims[len(sims) // 2], 0.95)
        self.assertTrue(all(S.near_dup(m(a), m(b), cats) for a, b in pairs))
        self.assertLess(S.similarity(m("10675"), m("19059"), cats), 0.3)  # uniform motion and an LC oscillator

    def test_suggest_without_near_duplicates(self):
        with tempfile.TemporaryDirectory() as d:
            have, cat = self.categorised(d)
            bks = [(("a", "o"), ["x1", "x2", "x3", "x4", "x6", "x7", "x8"])]
            bal = {"concept": 0, "easy": 0, "medium": 100, "hard": 0}
            for lang in ("en", "de"):
                for n in range(1, 8):
                    keys = S.suggest(bks, cat, lang, bal, n)
                    self.assertFalse({"x1", "x2"} <= set(keys), (lang, n, keys))
                    self.assertNotIn("x8", keys)  # broken
                    self.assertFalse([(a, b) for a in keys for b in keys if a < b and S.near_dup(cat[a], cat[b])])
            self.assertEqual(len(S.suggest(bks, cat, "en", bal, 7)), 5)  # of 7: x8 broken, x1 or x2
            # two twins in a bucket: the second goes to another bucket's turn; among those that fit as well,
            # one not too similar to those chosen first
            twins = {f"t{i}": {**cat["x1"], "id": 100 + i, "flag": None} for i in range(3)}
            cat2 = {**cat, **twins}
            keys = S.suggest([(("a", "o"), ["t0", "t1", "t2", "x3", "x6"])], cat2, "en", {"concept": 50, "easy": 0, "medium": 100, "hard": 0}, 3)
            self.assertEqual(sum(k.startswith("t") for k in keys), 1)
            # alternatives: the most similar first, no near-duplicate of another exercise on the sheet
            bks = [(("a", "o"), ["x1", "x2", "x3", "x4", "x6", "x7"])]
            self.assertEqual(S.alternatives("x6", ["x6"], bks, cat, "en"), ["x3", "x1", "x4", "x7", "x2"])  # x2: German
            self.assertEqual(S.alternatives("x6", ["x6", "x1"], bks, cat, "en"), ["x3", "x4", "x7"])  # (x2 a near-duplicate of x1)
            self.assertEqual(S.alternatives("x3", ["x3", "x1"], bks, cat, "de"), ["x6", "x4", "x7"])

    def test_exercise_topics(self):
        # the TeXercises topics (subbranches) of the exercises there: cleaned, each once, counted, the most
        # frequent first, those without one last
        with tempfile.TemporaryDirectory() as d:
            metas = {"a": {"subbranches": ["Optics", "Waves", "Optics", 7, " ", "Wa\nves "]}, "b": {"subbranches": ["Waves"]},
                     "c": {"title": "C"}, "d": {"subbranches": "Waves"}}
            have = {}
            for k, m in metas.items():
                (Path(d) / k).mkdir()
                (Path(d) / k / "exercise.json").write_text(json.dumps(m))
                have[k] = Path(d) / k
            (Path(d) / "e").mkdir()
            (Path(d) / "e" / "exercise.json").write_text("{not json")
            have["e"] = Path(d) / "e"
            self.assertEqual([S.exercise_topics(have[k]) for k in "abcde"], [["Optics", "Waves", "Wa ves"], ["Waves"], [], [], []])
            (Path(d) / "b" / "exercise.json").write_text(json.dumps({"subbranches": ["Waves"], "type": 0}))
            os.utime(Path(d) / "b" / "exercise.json", ns=(1, 2))
            self.assertEqual(S.topic_counts(have), [{"name": "Waves", "exercises": 2, "concept": 1, "both": 0}, {"name": "Optics", "exercises": 1, "concept": 0, "both": 0},
                                                    {"name": "Wa ves", "exercises": 1, "concept": 0, "both": 0}, {"name": "", "exercises": 3, "concept": 0, "both": 0}])
            self.assertEqual(S.topic_counts({"c": have["c"]}), [])

    def test_collection(self):
        coll = S.collection("3a", [("coulomb", "f2"), ("coulomb", "f1"), ("photons", "p1"), ("coulomb", "d1")], {"coulomb": "Point Charges"})
        self.assertEqual(coll, {"title": "3a", "items": [{"exercise": "f2"}, {"exercise": "f1"}, {"exercise": "p1"}, {"exercise": "d1"}],
                                "containers": [{"first": 1, "title": "Point Charges"}, {"first": 3, "title": "photons"}, {"first": 4, "title": "Point Charges"}]})

    def test_build_sheet_tex(self):
        # the .tex of an ordered list of exercises (LaTeX is not needed to write it)
        keys = ["coulomb-03-ions-in-a-crystal", "coulomb-01-hydrogen-atom", "photons-01-laser-pointer"]
        with tempfile.TemporaryDirectory() as d:
            coll = S.collection("Test sheet", [("coulomb", keys[0]), ("coulomb", keys[1]), ("photons", keys[2])], {"coulomb": "Point Charges", "photons": "Photons"})
            (Path(d) / "c.json").write_text(json.dumps(coll))
            srcs = os.pathsep.join(str(ROOT / f) for f in ("texercises-drafts", "texercises-drafts-2"))
            for part, lang in (("both", "de"), ("exercises", "")):
                args = [sys.executable, str(ROOT / "hub-admin" / "sheets" / "build_sheet.py"), srcs, str(Path(d) / "c.json"),
                        str(Path(d) / "s.tex"), "--font=modern", f"--part={part}", "--date=01.02.2026"] + ([f"--lang={lang}"] if lang else [])
                r = subprocess.run(args, capture_output=True, text=True)
                self.assertEqual(r.returncode, 0, r.stderr)
                tex = (Path(d) / "s.tex").read_text()
                self.assertTrue(tex.startswith("% !TeX program = lualatex"))
                self.assertIn(r"\begin{document}", tex)
                self.assertTrue(tex.rstrip().endswith(r"\end{document}"))
                self.assertEqual(tex.count(r"\begingroup"), tex.count(r"\endgroup"))
                self.assertEqual(tex.count(r"\begin{lpexercises}"), tex.count(r"\end{lpexercises}"))
                # in the given order, with a section where the module changes
                firsts = [tex.index(re.search(r"\\NewQty\{(\w+)\}", (ROOT / "texercises-drafts" / "exercises" / k / "preamble.tex").read_text()).group(0)) for k in keys]
                self.assertEqual(firsts, sorted(firsts))
                self.assertIn(r"\lpsection{Point Charges}", tex)
                self.assertLess(tex.index(r"\lpsection{Point Charges}"), tex.index(r"\lpsection{Photons}"))
                self.assertEqual(r"Lösungen" in tex, part == "both")
                self.assertEqual(r"\usepackage[ngerman]{babel}" in tex, lang == "de")

    def test_request_pdf_without_latex(self):
        # no LaTeX: a clear answer; a PDF made before (cached by its hash) is there all the same
        with tempfile.TemporaryDirectory() as d:
            export, cache = Path(d) / "texercises", Path(d) / "sheets"
            (export / "exercises").mkdir(parents=True)
            shutil.copytree(ROOT / "texercises-drafts" / "exercises" / "coulomb-01-hydrogen-atom", export / "exercises" / "coulomb-01-hydrogen-atom")
            chosen = [("coulomb", "coulomb-01-hydrogen-atom"), ("coulomb", "not-there")]
            with mock.patch.object(S, "lualatex", return_value=None):
                state, why = S.request_pdf("T", chosen, {}, export, cache)
                self.assertEqual(state, "error")
                self.assertIn("LaTeX", why)
                self.assertEqual(S.request_pdf("T", [("coulomb", "not-there")], {}, export, cache)[0], "error")
                have = S.available(export)
                key = S.fingerprint(S.collection("T", chosen[:1], {}), have, "exercises", {})
                cache.mkdir()
                (cache / f"{key}.pdf").write_bytes(b"%PDF-cached")
                self.assertEqual(S.request_pdf("T", chosen, {}, export, cache), ("ready", b"%PDF-cached"))
                self.assertEqual(S.request_pdf("T", chosen, {}, export, cache, "both")[0], "error")  # another part
                self.assertEqual(S.make_pdf("T", chosen, {}, export, cache), (b"%PDF-cached", ""))

    def test_store_export(self):
        with tempfile.TemporaryDirectory() as d:
            export = Path(d) / "data" / "texercises"
            export.parent.mkdir()
            n = S.store_export(export_zip({"e1-mine": "by", "e2-other": "pw", "e3-mine": "by"}), export, "by")
            self.assertEqual(n, {"exercises": 2, "skipped": 1})
            self.assertEqual(sorted(p.name for p in (export / "exercises").iterdir()), ["e1-mine", "e3-mine"])
            self.assertEqual(sorted(p.name for p in (export / "exercises" / "e1-mine").iterdir()), ["exercise.json", "text.tex"])
            self.assertFalse((Path(d) / "evil").exists())
            # a new upload replaces the old one
            S.store_export(export_zip({"e4-mine": "by"}), export, "by")
            self.assertEqual([p.name for p in (export / "exercises").iterdir()], ["e4-mine"])
            with self.assertRaises(ValueError):
                S.store_export(export_zip({"e5": "pw"}), export, "by")  # none of the teacher's
            with self.assertRaises(ValueError):
                S.store_export(b"not a zip", export, "by")
            self.assertEqual([p.name for p in (export / "exercises").iterdir()], ["e4-mine"])  # kept

    def test_images(self):
        png = b"\x89PNG\r\n\x1a\n" + b"\0" * 40
        self.assertEqual(S.image_stem("Magnetfeld einer Spule: Größe?", "1234"), "magnetfeld-einer-spule-groesse-1234")
        self.assertEqual(S.image_stem("Two Charges", "abc", 2, 3), "two-charges-abc-2")
        self.assertEqual(S.image_stem("***", "../x"), "exercise-x")
        targets = {"coil": "magnetic-coil-12-1", "wire.png": "magnetic-coil-12-2", "lens": "optics-7"}
        with tempfile.TemporaryDirectory() as tmp:
            images = Path(tmp) / "img"
            # one file for a given gallery name: kept under the exercise's name, whatever it was called
            self.assertEqual(S.store_images(images, "IMG_0042.png", png, targets, "coil"), {"kept": ["magnetic-coil-12-1.png"], "skipped": []})
            self.assertEqual(S.find_image(images, "coil"), images / "magnetic-coil-12-1.png")
            self.assertEqual(S.kept_file(images, "magnetic-coil-12-1.png"), images / "magnetic-coil-12-1.png")
            self.assertIsNone(S.kept_file(images, "index.json"))
            self.assertIsNone(S.kept_file(images, "../img/magnetic-coil-12-1.png"))
            # files named as in the gallery (with or without an extension), and a .zip of them
            self.assertEqual(S.store_images(images, "x/y/wire.png", png, targets)["kept"], ["magnetic-coil-12-2.png"])
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w") as z:
                z.writestr("gallery/lens.png", png)
                z.writestr("gallery/../../other.png", png)
                z.writestr("notes.txt", b"hello")
                z.writestr("__MACOSX/._lens.png", png)
            self.assertEqual(S.store_images(images, "all.zip", buf.getvalue(), targets), {"kept": ["optics-7.png"], "skipped": ["other.png"]})
            self.assertFalse((Path(tmp) / "other.png").exists())
            self.assertEqual(sorted(p.name for p in images.iterdir()),
                             ["index.json", "magnetic-coil-12-1.png", "magnetic-coil-12-2.png", "optics-7.png"])
            # replaced by an SVG: the PNG goes
            svg = b'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'
            S.store_images(images, "lens.svg", svg, targets)
            self.assertEqual(S.find_image(images, "lens"), images / "optics-7.svg")
            self.assertFalse((images / "optics-7.png").exists())
            if not shutil.which("rsvg-convert"):  # no PDF copy: not for LaTeX
                self.assertIsNone(S.find_image(images, "lens", latex=True))
            # what LaTeX looks for: images/<gallery name>(.ext)
            links = S.latex_links(images)
            self.assertEqual(links["coil.png"], images / "magnetic-coil-12-1.png")
            self.assertEqual(links["wire.png"], images / "magnetic-coil-12-2.png")
            for bad in (b"hello", b"<html><body>login</body></html>"):
                with self.assertRaises(ValueError):
                    S.store_images(images, "coil.png", bad, targets)
            with self.assertRaises(ValueError):  # no image of the sheet
                S.store_images(images, "unrelated.png", png, targets)

            # fetched from TeXercises: an image is kept, a login page is not
            class Resp(io.BytesIO):
                def __enter__(self):
                    return self

                def __exit__(self, *a):
                    return False
            with mock.patch.object(S.urllib.request, "urlopen", return_value=Resp(png)) as op:
                self.assertEqual(S.fetch_image(images, "magnet", "magnets-5"), (True, "magnets-5.png"))
                self.assertEqual(op.call_args[0][0].full_url, "https://texercises.com/gallery/image/file/magnet/")
            self.assertEqual(S.find_image(images, "magnet"), images / "magnets-5.png")
            with mock.patch.object(S.urllib.request, "urlopen", return_value=Resp(b"<!doctype html><p>Access without login")):
                ok, why = S.fetch_image(images, "secret", "s-1")
                self.assertFalse(ok)
                self.assertIn("login", why)
            with mock.patch.object(S.urllib.request, "urlopen", side_effect=urllib.error.URLError("down")):
                self.assertFalse(S.fetch_image(images, "down", "d-1")[0])
            self.assertFalse(S.fetch_image(images, "../x", "x")[0])
            # the PDF's hash changes with the images
            coll = S.collection("T", [], {})
            a = S.fingerprint(coll, {}, "exercises", {}, images)
            S.store_images(images, "coil", png + b"1", targets)
            self.assertNotEqual(a, S.fingerprint(coll, {}, "exercises", {}, images))

    def test_pool_file(self):
        pool = S.load_pool()
        objectives = json.loads((ROOT / "hub" / "objectives.json").read_text())
        for app, entry in pool.items():
            self.assertIn(app, objectives)
            known = {o["id"] for o in objectives[app]["objectives"]}
            for ob, keys in entry["objectives"].items():
                self.assertIn(ob, known)
                for k in keys:
                    self.assertIn(k, entry["exercises"])
            for k, e in entry["exercises"].items():  # what the suggestion uses
                self.assertIn(e["lang"], ("en", "de"), k)
                self.assertIsInstance(e["difficulty"], int, k)
                self.assertIsInstance(e["images"], bool, k)

    def test_normalize_sheet(self):
        apps = [{"id": "coulomb", "objectives": [{"id": "factor"}, {"id": "field"}]}, {"id": "magnet", "objectives": [{"id": "wire"}]}]
        out = H.normalize_sheet({"title": " Blatt <b>1</b>\n", "lang": "de", "topics": ["Magnetism", " Electro\nstatics ", "Magnetism", ""], "modules": [
            {"id": "magnet"}, {"id": "coulomb", "objectives": ["field", "nope", "factor"]}, {"id": "magnet"}], "loose": True,
            "balance": {"concept": 45, "easy": 1, "medium": 1, "hard": 1}, "exercises": ["f2", "w1", "f2", "x1"]}, apps, self.POOL, have={"x1": None})
        self.assertEqual(out, {"title": "Blatt b1/b", "lang": "de", "topics": ["Magnetism", "Electro statics", ""],
                               "modules": [{"id": "coulomb", "objectives": ["factor", "field"]}, {"id": "magnet", "objectives": ["wire"]}],  # in the apps' order
                               "loose": True, "balance": {"concept": 45, "easy": 34, "medium": 33, "hard": 33}, "exercises": ["f2", "w1", "x1"]})
        # all objectives when none are given; English unless German; the default balance
        self.assertEqual(H.normalize_sheet({"modules": [{"id": "coulomb"}], "lang": "fr", "loose": 1}, apps, self.POOL),
                         {"title": "", "lang": "en", "topics": [], "modules": [{"id": "coulomb", "objectives": ["factor", "field"]}], "loose": False,
                          "balance": {"concept": 30, "easy": 30, "medium": 50, "hard": 20}, "exercises": []})
        self.assertEqual(H.normalize_balance({"concept": 12.6, "easy": 0, "medium": 0, "hard": 0}), {"concept": 13, "easy": 30, "medium": 50, "hard": 20})
        self.assertEqual(H.normalize_balance({"easy": 20, "medium": 50, "hard": 30}), {"concept": 30, "easy": 20, "medium": 50, "hard": 30})
        for bad in ({"modules": [{"id": "../x"}]}, {"exercises": ["../../etc/passwd"]}, {"exercises": [3]}, {"exercises": ["x1"]},
                    {"exercises": [f"f{i}" for i in range(H.MAX_SHEET_EXERCISES + 1)]}, {"topics": [3]}, {"topics": [str(i) for i in range(H.MAX_SHEET_TOPICS + 1)]},
                    {"balance": {"concept": 101}}, {"balance": {"easy": -1}}, {"balance": {"hard": "20"}}, {"balance": {"medium": True}}):
            with self.assertRaises(ValueError, msg=bad):
                H.normalize_sheet(bad, apps, self.POOL)
        loose = H.normalize_sheet({"exercises": ["f1", "zz"], "modules": [{"id": "x"}], "topics": [3, "A"], "balance": {"concept": 300}}, apps, self.POOL, strict=False)
        self.assertEqual((loose["exercises"], loose["topics"], loose["balance"]["concept"]), (["f1"], ["A"], 30))

    def test_old_sheets(self):
        # a sheet saved before it had topics (made of modules): the topics of its exercises there (the most
        # frequent first, "" for those without), its objectives as saved, the default balance
        old = {"title": "Alt", "lang": "en", "modules": [{"id": "coulomb", "objectives": ["field"]}], "exercises": ["d1", "w1", "x2", "f1", "gone"], "token": "t"}
        got = H.migrate_sheet(old, self.CAT)
        self.assertEqual((got["topics"], got["loose"], got["modules"], got["exercises"], got["token"]),
                         (["Electrostatics", "Magnetism", ""], False, old["modules"], old["exercises"], "t"))
        self.assertIs(H.migrate_sheet({**old, "topics": ["Optics"]}, self.CAT)["topics"][0], "Optics")  # a new one: as it is
        self.assertEqual(H.migrate_sheet({"exercises": ["gone"]}, self.CAT)["topics"], [])
        apps = [{"id": "coulomb", "objectives": [{"id": "factor"}, {"id": "field"}]}, {"id": "magnet", "objectives": [{"id": "wire"}]}]
        clean = H.normalize_sheet(got, apps, self.POOL, strict=False, have=self.CAT)
        self.assertEqual((clean["modules"], clean["balance"], clean["exercises"]), (old["modules"], dict(S.BALANCE), ["d1", "w1", "x2", "f1"]))
        # and it suggests as a new one: its objective (field), on its topics
        keys = S.suggest(S.buckets(clean["modules"], clean["loose"], apps, self.POOL, self.CAT, clean["topics"]), self.CAT, "en", clean["balance"], 2)
        self.assertEqual(sorted(keys), ["d1", "d2"])


class Preview(unittest.TestCase):
    def ex(self, preamble="", lang="en"):
        return P.Exercise(preamble, lang, "/exercise/test-ex/")

    def test_evaluate(self):
        num = {"aX": 2.0, "bX": 3.0}

        def look(name):
            if name in num:
                return num[name]
            raise P.EvalError(name)
        ev = lambda e: P.evaluate(e, look)
        self.assertEqual(ev("1+2*3"), 7)
        self.assertEqual(ev("2^3^2"), 512)  # right-associative
        self.assertEqual(ev("2**3"), 8)
        self.assertEqual(ev("-2^2"), -4)
        self.assertEqual(ev("(\\aX+\\bX)/2"), 2.5)
        self.assertAlmostEqual(ev("2pi"), 2 * math.pi)
        self.assertAlmostEqual(ev("1/2pi"), 1 / (2 * math.pi))  # as xfp: juxtaposition binds first
        self.assertAlmostEqual(ev("3(\\aX+1)"), 9)
        self.assertAlmostEqual(ev("sin(pi/6)"), 0.5)
        self.assertAlmostEqual(ev("sind(30)+cosd(60)"), 1)
        self.assertAlmostEqual(ev("asind(0.5)"), 30)
        self.assertAlmostEqual(ev("sqrt(16)+ln(exp(2))+log(100)+abs(-1)"), 9)
        self.assertAlmostEqual(ev("30deg"), math.pi / 6)
        self.assertAlmostEqual(ev("max(1,\\bX,2)"), 3)
        self.assertAlmostEqual(ev("2.5e-3*1E3"), 2.5)
        self.assertAlmostEqual(ev("sqrt(2*(\\aX+\\bX)"), math.sqrt(10))  # left open: closed, as xfp
        for bad in ("__import__('os')", "\\cX", "foo(1)", "1/0", "10^10^10", "(-8)^(1/3)", "sqrt(-1)", "2 3",
                    "x" * 5000, "(" * 3000 + "1", "1;2", "open"):
            with self.assertRaises(P.EvalError, msg=bad):
                ev(bad)

    def test_numbers_and_units(self):
        self.assertEqual(P.fmt(0.04977, 4), r"0.049\,77")
        self.assertEqual(P.fmt(350.0, 4), "350.0")
        self.assertEqual(P.fmt(350.0, 4, pad=False), "350")
        self.assertEqual(P.fmt(1.993e-26, 4), r"1.993\cdot 10^{-26}")
        self.assertEqual(P.fmt(12345.6, 4), r"1.235\cdot 10^{4}")
        self.assertEqual(P.fmt(12345.6, 4, mode="fixed"), r"12\,350")
        self.assertEqual(P.fmt(9.9996, 4), "10.00")
        self.assertEqual(P.fmt(2.27e39, 2, mode="fixed"), r"2\,300" + r"\,000" * 12)  # no binary digits
        self.assertEqual(P.fmt(-0.00123456, 3), r"-0.001\,23")
        self.assertEqual(P.fmt(None), r"\text{?}")
        self.assertEqual(P.typed_number("6.674e-11"), r"6.674\cdot 10^{-11}")
        self.assertEqual(P.typed_number("2,5"), "2.5")
        self.assertEqual(P.typed_number("3.2+-0.1"), r"3.2\pm 0.1")
        self.assertIsNone(P.typed_number("abc"))
        u = lambda s: P.unit_tex(s)[0]
        self.assertEqual(u(r"\kilo\meter\per\second\squared"), r"\mathrm{km/s^{2}}")
        self.assertEqual(u(r"\newton\meter\squared\per\kilogram\squared"), r"\mathrm{N\,m^{2}/kg^{2}}")
        self.assertEqual(u(r"\joule\per\kilogram\per\kelvin"), r"\mathrm{J/(kg\,K)}")
        self.assertEqual(u(r"\mps"), r"\mathrm{m/s}")  # declared in texercises-lp.sty
        self.assertEqual(u(r"\kmph"), r"\mathrm{km/h}")
        self.assertEqual(u(r"\milli\ampere"), r"\mathrm{mA}")
        self.assertEqual(u(r"\micro\farad"), r"\mathrm{\mu F}")
        self.assertEqual(u(r"\kilo\ohm"), r"\mathrm{k\Omega }")
        self.assertEqual(u(r"\m^{-3}"), r"\mathrm{m^{-3}}")
        self.assertEqual(u(r"\per\second"), r"\mathrm{1/s}")
        self.assertEqual(u("km/h"), r"\mathrm{km/h}")
        self.assertEqual(u(r"\cm"), r"\mathrm{cm}")
        self.assertEqual(P.unit_tex(r"\degree"), (r"\mathrm{{}^{\circ}}", True))
        self.assertEqual(u(""), "")

    def test_prefix_on_plain_unit_and_empty_script(self):
        e = self.ex("\\SolQty{x}[d]{0.02013}[m]\n\\SolQty{F}[F]{0.0021}[N]")
        self.assertEqual(e.math(r"\xP{-2}{2}"), r"{2.0\,\mathrm{cm}} ")
        self.assertEqual(e.math(r"\FP{-3}{2}"), r"{2.1\,\mathrm{mN}} ")
        self.assertNotIn("x^", P.convert(e, "\\begin{align}a &= x^\\\\ b &= c\n\\end{align}"))

    def test_fpeval_and_ifthenelse(self):
        e = self.ex("\\NewQty{n}{3}\n\\NewQty{nm}{\\fpeval{\\nX-1}}")
        self.assertEqual(e.math(r"\nm"), r"{2} ")
        self.assertEqual(e.math(r"\ifthenelse{\nmX = 2}{a}{b}"), "{a} ")
        self.assertEqual(e.math(r"\ifthenelse{\nX < 2}{a}{b}"), "{b} ")
        self.assertIn("yes", P.convert(e, r"\ifthenelse{\nX > 2}{yes}{no}"))
        self.assertIn(r"\begin{align*}", P.convert(e, "\\begin{equation}\n a &= b \\\\\n\\end{equation}"))
        h = P.convert(e, "density $\\lambda=Q/L:\n\nForce on $q$ at $r$.")  # a $ left open
        self.assertIn(r'<span class="tx-m">\lambda=Q/L:</span>', h)
        self.assertIn('<span class="tx-m">q</span>', h)

    def test_quantities(self):
        e = self.ex("\\NewQty{I}{20}[\\milli\\ampere][e-3][\\ampere]\n\\NewQty*{v}{54}[\\kmph][1/3.6][\\mps]\n"
                    "\\NewQty{d}{7.8e7}[\\km][e3][\\m]\n"
                    "\\SolQty{R}[\\frac{V}{I}]{7/\\IX}[\\ohm]\n\\SolQty{t}[\\frac{d}{c}]{\\dX/\\nccX}[\\s]\n"
                    "\\ConvTo{tm}{1/60}{t}{\\minute}\n\\SolQty{bad}{\\nopeX+1}[\\m]")
        m = e.math
        self.assertEqual(m(r"\IO"), r"{20\,\mathrm{mA}} ")
        self.assertEqual(m(r"\I"), r"{0.02\,\mathrm{A}} ")
        self.assertEqual(m(r"\IX"), "{0.02} ")
        self.assertEqual(m(r"\vO"), r"{54\,\mathrm{km/h}} ")
        self.assertEqual(m(r"\v"), r"{15\,\mathrm{m/s}} ")
        self.assertEqual(m(r"\d"), r"{7.8\cdot 10^{10}\,\mathrm{m}} ")
        self.assertEqual(m(r"\R"), r"{350.0\,\mathrm{\Omega }} ")
        self.assertEqual(m(r"\RS{2}"), r"{350\,\mathrm{\Omega }} ")
        self.assertEqual(m(r"\RS{1}"), r"{400\,\mathrm{\Omega }} ")
        self.assertEqual(m(r"\RP{3}{2}"), r"{0.35\,\mathrm{k\Omega }} ")
        self.assertEqual(m(r"\RF"), r"{\frac{V}{I}} ")
        self.assertEqual(m(r"\RU"), r"{\mathrm{\Omega }} ")
        self.assertEqual(m(r"\RI"), r"{350\,\mathrm{\Omega }} ")
        self.assertEqual(m(r"\t"), r"{260.2\,\mathrm{s}} ")
        self.assertEqual(m(r"\tmP{0}{2}"), r"{4.3\,\mathrm{min}} ")
        self.assertEqual(m(r"\ncc"), r"{2.998\cdot 10^{8}\,\mathrm{m/s}} ")  # a constant of texercises-lp.sty
        self.assertEqual(m(r"\bad"), r"{\text{?}} ")
        self.assertIn("value:bad", e.fallbacks)
        # siunitx and friends
        self.assertEqual(m(r"\SI{3.0e8}{\meter\per\second}"), r"{3.0\cdot 10^{8}\,\mathrm{m/s}} ")
        self.assertEqual(m(r"\qty{5}{\kg}"), r"{5\,\mathrm{kg}} ")
        self.assertEqual(m(r"\num{12345}"), r"{12\,345} ")
        self.assertEqual(m(r"\si{\volt}"), r"{\mathrm{V}} ")
        self.assertEqual(m(r"\ang{30}"), r"{30^{\circ}} ")
        self.assertEqual(m(r"\ssc{E}{kin}"), r"{{E}_{\text{kin}}} ")
        self.assertEqual(m(r"\ce{Na+}"), r"{\mathrm{Na^{+}}} ")
        self.assertEqual(m(r"\ce{H2O}"), r"{\mathrm{H_{2}O}} ")
        self.assertEqual(m(r"\result{x}"), r"{\underline{\underline{x}}} ")
        self.assertEqual(m(r"\qty(a+b)"), r"{\left(a+b\right)} ")
        self.assertEqual(m(r"5\,\m"), r"5\,{\mathrm{m}} ")  # a free-standing unit
        self.assertEqual(m(r"\frac{a}{b}\cdot\alpha"), r"\frac{a}{b}\cdot\alpha")  # KaTeX's own: as they are

    def test_text(self):
        e = self.ex("\\NewQty{m}{2.0}[\\kg]")
        h = e.html("A body of \\mO\\ falls.\n\nIt is \\textbf{heavy} & <b>bold</b>:\n"
                   "\\begin{abcliste}\n\\abc How fast is it, $v = \\sqrt{2gh}$?\n\\abc Where?\n\\end{abcliste}\n"
                   "\\begin{align}\n a &= b \\label{x}\\\\ c &= \\m\n\\end{align}\n"
                   "\\begin{itemize}\\item[i)] one \\item two\\end{itemize}")
        self.assertIn(r'<p>A body of <span class="tx-m">{2.0\,\mathrm{kg}}</span> falls.</p>', h)
        self.assertIn("<strong>heavy</strong> &amp; &lt;b&gt;bold&lt;/b&gt;", h)
        self.assertIn('<ol class="tx-abc"><li>How fast is it, <span class="tx-m">v = \\sqrt{2gh}</span>?</li><li>Where?</li></ol>', h)
        self.assertIn('<div class="tx-d">\\begin{align*}', h)
        self.assertNotIn("\\label", h)
        self.assertIn('<li><span class="tx-label">i)</span> one</li>', h)
        self.assertEqual(e.fallbacks, [])

    def test_abc_setcounter(self):
        # as on TeXercises, \\setcounter{abc}{N} makes the next item the N-th letter
        h = self.ex("").html("\\begin{abclist}\\abc a\\end{abclist}\n\n"
                             "\\begin{abclist}\n\\setcounter{abc}{2}\n\\setcounter{enumii}{1}\n\\abc b \\abc c"
                             "\\setcounter{abc}{6}\n\\abc f\\end{abclist}")
        self.assertIn('<ol class="tx-abc"><li>a</li></ol>', h)
        self.assertIn('<li class="tx-abc-2">b</li><li>c</li><li class="tx-abc-6">f</li>', h)
        self.assertIn("li.tx-abc-6 { counter-set: abc 6; }", H.TX_CSS)

    def test_text_fallbacks(self):
        e = self.ex()
        h = e.html("See \\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture} and "
                   "\\includegraphics[width=3cm]{#image_path:coil#} and \\weird{x} \\begin{strange}y\\end{strange}"
                   " <script>alert(1)</script> \\textit{\"<i>\"} $\\text{<img src=x onerror=alert(1)>}$")
        self.assertIn('<div class="tx-fig">figure in the PDF</div>', h)
        self.assertIn('<a href="https://texercises.com/exercise/test-ex/" target="_blank" rel="noopener">image on TeXercises ↗</a>', h)
        self.assertIn('<code class="tx-raw">\\weird</code>x', h)
        self.assertIn('<div class="tx-env">', h)
        self.assertNotIn("<script", h)
        self.assertNotIn("<img", h)
        self.assertNotIn("<i>", h)
        self.assertIn("&lt;script&gt;", h)
        self.assertEqual(sorted(e.fallbacks), sorted(["figure", "image", "\\weird", "env:strange"]))
        de = self.ex(lang="de")
        self.assertIn("Abbildung im PDF", de.html("\\begin{circuitikz}x\\end{circuitikz}"))
        # never breaks: unbalanced input, deep nesting
        for junk in ("\\textbf{", "$x", "\\begin{align} a", "{" * 500 + "x", "\\SI{", "\\NewQty", "}}}}"):
            self.assertIsInstance(P.convert(self.ex(), junk), str)
        self.assertIsInstance(P.Exercise("\\NewQty{a}{1}[\\m]\\SolQty{b}{\\aX*(2+1}").q["b"].x, float)

    def test_figures_and_images(self):
        # with the panel's Media: a drawn figure, one being drawn, an uploaded image
        class Media(P.Media):
            def __init__(self, state):
                self.state, self.asked = state, []

            def figure(self, preamble, lang, env, body):
                self.asked.append((preamble, lang, env, body))
                return self.state

            def image(self, name):
                return "/admin/sheet/img/" + name + ".png" if name == "coil" else None
        m = Media({"url": "/admin/sheet/fig/" + "a" * 32 + ".svg", "width": 100})
        e = P.Exercise("\\NewQty{d}{2}[\\m]", "en", "/exercise/test-ex/", m)
        h = e.html("A \\begin{tikzpicture}\\draw (0,0) -- (\\dX,1);\\end{tikzpicture} and \\tikz[scale=2]{\\draw (0,0)--(1,0);} "
                   "\\includegraphics[width=3cm]{#image_path:coil#} \\includegraphics{#image_path:other#}")
        self.assertIn(f'<img class="tx-img" src="/admin/sheet/fig/{"a" * 32}.svg" alt="figure" width="160">', h)
        self.assertEqual([(a[1], a[2]) for a in m.asked], [("en", "tikzpicture"), ("en", "tikz")])
        self.assertEqual(m.asked[0][0], "\\NewQty{d}{2}[\\m]")  # the solver part: a figure may print its quantities
        self.assertEqual(m.asked[1][3], "\\tikz[scale=2]{\\draw (0,0)--(1,0);}")
        self.assertIn('<img class="tx-img tx-photo" src="/admin/sheet/img/coil.png" alt="image">', h)
        self.assertIn("image on TeXercises", h)  # the one not uploaded
        self.assertEqual(e.fallbacks, ["image"])
        pend = P.Exercise("", "de", "", Media({"pending": True}))
        self.assertIn("tx-pending", pend.html("\\begin{circuitikz}x\\end{circuitikz}"))
        self.assertEqual(pend.fallbacks, ["pending"])
        self.assertIn("Abbildung im PDF", P.Exercise("", "de", "", Media({})).html("\\begin{tikzpicture}x\\end{tikzpicture}"))
        bad = P.Exercise("", "en", "", Media({"url": '"><script>x</script>', "width": 1}))
        self.assertNotIn("<script", bad.html("\\begin{tikzpicture}x\\end{tikzpicture}"))
        # the names of gallery images
        self.assertEqual(P.images_used("#image_path:a.png# \\includegraphics[w=1]{#image_path:b#} \\includegraphics{images/c} #image_path:a.png#"),
                         ["a.png", "b", "c"])
        self.assertEqual([P.image_name(x) for x in ("../etc/passwd", "a/b", "#image_path:..x#", "ok_1-2.svg")], ["", "", "", "ok_1-2.svg"])

    def test_figure_document(self):
        # the LaTeX of an exercise's figures: its solver part first (quietly), then a page per figure
        from sheets import figures as F
        src = F.figure_source("tikzpicture", "\\draw (0,0) -- (1,1);")
        doc = F.document("\\NewQty{a}{1}[\\m]", "de", [src, F.figure_source("tikz", "\\tikz\\draw (0,0)--(1,0);")])
        self.assertIn("\\documentclass[border=2bp,multi=lpfig]{standalone}", doc)
        self.assertIn("\\usepackage{texercises-lp}", doc)
        self.assertIn("\\txlang{de}\\lpquiet\n\\NewQty{a}{1}[\\m]\n\\lpendquiet", doc)
        self.assertEqual(doc.count("\\begin{lpfig}"), 2)
        self.assertIn("\\begin{lpfig}\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}\\end{lpfig}", doc)
        self.assertIn("\\begin{tikzpicture}\\begin{axis}x\\end{axis}\\end{tikzpicture}", F.figure_source("axis", "x"))
        # the hash: everything a figure is made of
        k = F.key("p", "en", src)
        self.assertRegex(k, r"^[0-9a-f]{32}$")
        self.assertEqual(len({k, F.key("q", "en", src), F.key("p", "de", src), F.key("p", "en", src + " ")}), 4)
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp)
            (cache / f"{k}.svg").write_text('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="120.5" height="60" viewBox="0 0 120.5 60"></svg>')
            self.assertEqual(F.figure(cache, "p", "en", src), {"svg": f"{k}.svg", "width": 120.5, "height": 60.0})
            with mock.patch.object(F, "available", return_value=False):
                self.assertEqual(F.figure(cache, "q", "en", src), {})  # no LaTeX: a placeholder

    def test_figure_errors(self):
        # why LaTeX could not draw a figure: its first error, the line counted in the figure, short
        from sheets import figures as F
        log = ("This is LuaHBTeX\n(./fig.tex\n! Undefined control sequence.\n<argument> \\foo\n\nl.31 \\draw (0,0) -- (1,\\foo)\n"
               "                      ;\nThe control sequence at the end of the top line\n! Emergency stop.\n")
        self.assertEqual(F.latex_error(log, 29), "Undefined control sequence.\nline 3 of the figure: \\draw (0,0) -- (1,\\foo)")
        self.assertEqual(F.latex_error(log, 40), "Undefined control sequence.\nin the solver part: \\draw (0,0) -- (1,\\foo)")
        self.assertEqual(F.latex_error("all fine\n", 1), "")
        self.assertLessEqual(len(F.latex_error("! " + "x" * 5000, 1)), F.MAX_WHY)
        # kept for a figure drawn on its own (failure), forgotten when it is queued again
        src, k = "\\begin{tikzpicture}\\oops\\end{tikzpicture}", None
        k = F.key("", "en", src)
        self.assertEqual(F.failure("", "en", src), "")
        with mock.patch.dict(F._failed, {k: time.time()}), mock.patch.dict(F._why, {}):
            self.assertEqual(F.failure("", "en", src), "LaTeX could not draw it")
            F._explain([(k, src)], "Undefined control sequence.")
            F._explain([(k, src), ("x", "y")], "another")  # (in a batch: not this one's fault)
            self.assertEqual(F.failure("", "en", src), "Undefined control sequence.")

    def test_tikz_draft(self):
        # the review's TikZ: what may be kept and drawn, the request to Claude, its answer checked
        from sheets import tikzdraft as T
        fig = "\\begin{tikzpicture}\n\\draw (0,0) -- (1,1) node {\\FO};\n\\end{tikzpicture}"
        self.assertEqual(T.check("  " + fig.replace("\n", "\r\n") + "\n"), fig)
        self.assertEqual(T.check("\\begin{circuitikz}\\draw (0,0) to[R] (2,0);\\end{circuitikz}")[:18], "\\begin{circuitikz}")
        for bad, why in (("", "empty"), ("\\draw (0,0);", "one environment"), ("\\begin{tikzpicture}x\\end{circuitikz}", "one environment"),
                         ("\\begin{tikzpicture}\\directlua{os.exit()}\\end{tikzpicture}", "\\directlua"),
                         ("\\begin{tikzpicture}\\input{/etc/passwd}\\end{tikzpicture}", "\\input"),
                         ("\\begin{tikzpicture}\\usetikzlibrary{x}\\end{tikzpicture}", "\\usetikzlibrary"),
                         ("\\begin{tikzpicture}\\immediate\\write18{ls}\\end{tikzpicture}", "\\immediate"),
                         ("\\begin{tikzpicture}" + "x" * (20 * 1024) + "\\end{tikzpicture}", "20 KB")):
            with self.assertRaises(ValueError) as cm:
                T.check(bad)
            self.assertIn(why, str(cm.exception), bad[:40])
        self.assertEqual(T.check("\\begin{tikzpicture}\\node {\\inputvoltage};% \\input{x}\n\\end{tikzpicture}")[-17:], "\\end{tikzpicture}")
        with tempfile.TemporaryDirectory() as tmp:
            png, svg, pdf, bmp = (Path(tmp) / n for n in ("a.png", "b.svg", "b.pdf", "c.bmp"))
            png.write_bytes(b"\x89PNG\r\n\x1a\nxx")
            svg.write_text("<svg/>")
            pdf.write_bytes(b"%PDF-1.4 x")
            bmp.write_bytes(b"BM")
            self.assertEqual(T.image_block(png), {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                                                          "data": __import__("base64").b64encode(png.read_bytes()).decode()}})
            self.assertEqual(T.image_block(svg, pdf)["source"]["media_type"], "application/pdf")
            self.assertEqual(T.image_block(svg, pdf)["type"], "document")
            with self.assertRaises(ValueError):
                T.image_block(bmp)
            with mock.patch.object(T, "MAX_IMAGE", 3), self.assertRaises(ValueError):
                T.image_block(png)
            parts = {"meta": {"title": "Kraft", "language": "GER"}, "preamble": "\\NewQty{F}{12}[\\newton]",
                     "text": "Eine Kraft \\FO.\n\\includegraphics[width=5cm]{#image_path:kraft-1#}", "solution": "s", "short": "k"}
            kw = T.request(parts, "kraft-1", T.image_block(png), "\\begin{tikzpicture}\\end{tikzpicture}")
        self.assertEqual((kw["model"], kw["betas"], kw["fallbacks"]), ("claude-opus-5-5", ["server-side-fallback-2026-07-01"], "default"))
        self.assertEqual(kw["output_config"]["format"]["schema"]["required"], ["code", "notes"])
        block, text = kw["messages"][0]["content"]
        self.assertEqual(block["type"], "image")
        self.assertIn("\\includegraphics[width=5cm]{#image_path:kraft-1#}", text["text"])
        self.assertIn('"solver": "\\\\NewQty{F}{12}[\\\\newton]"', text["text"])
        self.assertIn('"lang": "de"', text["text"])
        self.assertIn("<draft>\n\\begin{tikzpicture}", text["text"])
        self.assertIn("arrows.meta", kw["system"][0]["text"])
        self.assertIn("\\XO", kw["system"][0]["text"])
        # the answer
        resp = lambda text, stop="end_turn": FakeAPI.response(text=text, stop=stop)
        self.assertEqual(T.answer(resp(json.dumps({"code": "```latex\n" + fig + "\n```", "notes": "the angle is guessed"}))), (fig, "the angle is guessed"))
        for r, why in ((resp("", "refusal"), "declined"), (resp("{", "max_tokens"), "too long"), (resp("{oops"), "not JSON"),
                       (resp(json.dumps({"notes": "x"})), "no code"), (resp(json.dumps({"code": "\\draw;", "notes": ""})), "one environment")):
            with self.assertRaises(ValueError) as cm:
                T.answer(r)
            self.assertIn(why, str(cm.exception))

    def test_table_and_macros(self):
        e = self.ex("\\newcommand{\\twice}[1]{2#1}\\def\\half{\\frac12}")
        h = e.html("\\begin{tabular}{lc}\n a & $Q$ \\\\ \\hline\n \\multicolumn{2}{c}{both}\n\\end{tabular} $\\twice{x} \\half$")
        self.assertIn('<table class="tx-table"><tr><td>a</td><td><span class="tx-m">Q</span></td></tr><tr><td colspan="2">both</td></tr></table>', h)
        self.assertRegex(h, r'<span class="tx-m">2x\s+\\frac12</span>')

    def test_drafts(self):
        # every draft of this repository renders, with no fallbacks but the pictures (TikZ)
        folders = sorted(ROOT.glob("texercises-drafts*/exercises/*"))
        self.assertGreater(len(folders), 150)
        for f in folders:
            r = P.render(f)
            self.assertEqual([x for x in r["fallbacks"] if x != "figure"], [], f.name)
            self.assertTrue(r["text"] and r["solution"], f.name)


class FakeAPI:
    """The anthropic module's exceptions (as the worker catches them), and a response."""
    class APIError(Exception):
        def __init__(self, message="", status_code=None):
            super().__init__(message)
            self.message, self.status_code = message, status_code

    class APIStatusError(APIError):
        pass

    class AuthenticationError(APIStatusError):
        pass

    class BadRequestError(APIStatusError):
        pass

    class RateLimitError(APIStatusError):
        pass

    class APIConnectionError(APIError):
        pass

    @staticmethod
    def response(records=None, stop="end_turn", text=None):
        from types import SimpleNamespace as NS
        return NS(stop_reason=stop, model="claude-opus-5-5", usage=NS(input_tokens=1000, output_tokens=200, cache_read_input_tokens=3000, cache_creation_input_tokens=0),
                  content=[NS(type="thinking", thinking=""), NS(type="text", text=text if text is not None else json.dumps({"exercises": records or []}))])


def label(eid, sub="kin.a", **kw):
    """A record as Claude answers it."""
    return {"id": str(eid), "sub": sub, "sub2": [], "kind": "calculate", "kinds": ["calculate"], "parts": 1, "steps": 1,
            "laws": ["uniform_motion"], "math": ["arith"], "repr": [], "context": "traffic", "flag": "", **kw}


class AutoCategories(unittest.TestCase):
    """The exercises uploaded since categories.json (sheets/autocat.py, hubadmin.Categoriser): their
    provisional labels (of the most similar exercise), the overlay merged over categories.json (the
    teacher's labels winning over everything), Claude's labels from a fake API (checked, refusals and
    errors handled, the request as specified), and why Claude cannot be asked. No network."""
    TREE = {"Mechanics": {"Kinematics": {"kin.a": "Uniform motion", "kin.b": "Free fall"}},
            "Electricity": {"Circuits": {"el.ohm": "Ohm's law"}}}
    BASE = {"1": {"sub": "kin.a", "sub2": [], "kind": "calculate", "kinds": ["calculate"], "parts": 2, "steps": 1, "laws": ["uniform_motion"],
                  "math": ["arith"], "repr": [], "context": "traffic"},
            "2": {"sub": "kin.b", "sub2": ["kin.a"], "kind": "calculate", "kinds": ["calculate", "explain"], "parts": 3, "steps": 2,
                  "laws": ["free_fall"], "math": ["quadratic"], "repr": ["figure_given"], "context": "everyday"},
            "3": {"sub": "el.ohm", "sub2": [], "kind": "concept", "kinds": ["concept"], "parts": 1, "steps": 1, "laws": ["ohm"],
                  "math": [], "repr": ["circuit"], "context": "lab"}}
    TEXTS = {1: ("Gleichförmige Bewegung eines Autos", "Ein Auto fährt mit konstanter Geschwindigkeit \\vO. Welche Strecke legt es in der Zeit \\tO zurück?"),
             2: ("Stein fällt vom Turm", "A stone falls freely from a tower of height \\hO. How long does the free fall take?"),
             3: ("Resistor in a circuit", "A resistor carries the current \\IO at the voltage \\UO. What is its resistance (Ohm)?"),
             101: ("Zug mit konstanter Geschwindigkeit", "Ein Zug fährt mit konstanter Geschwindigkeit. Welche Strecke legt er in der Zeit zurück?"),
             102: ("Current through a resistor", "What current flows through the resistor at a voltage of \\UO in this circuit?"),
             103: ("Ball dropped from a bridge", "A ball falls freely from a bridge of height \\hO. How long does it fall?")}

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        d = Path(self.dir.name)
        (d / "categories.json").write_text(json.dumps({"tree": self.TREE, "exercises": self.BASE}))
        for eid, (title, text) in self.TEXTS.items():
            f = d / "data" / "texercises" / "exercises" / f"ex{eid}"
            f.mkdir(parents=True)
            (f / "exercise.json").write_text(json.dumps({"id": eid, "title": title, "language": "GER" if eid in (1, 101) else "ENG",
                                                        "info": {"creator": "by", "type_name": "Calculative"}, "tags": [], "subbranches": []}))
            (f / "text.tex").write_text(text)
        for patch in (mock.patch.object(S, "CATEGORIES", d / "categories.json"),
                      mock.patch.object(H, "sheets_module", self.module)):
            patch.start()
            self.addCleanup(patch.stop)
        (d / "pw").write_text(hash_password("teacher pw") + "\n")
        self.admin = H.Admin(d / "pw", ROOT / "hub" / "index.html", d / "data" / "apps.json")
        self.cz = self.admin.categoriser
        self.cz.backoff = (0, 0)
        self.calls = []

    def tearDown(self):
        S.OVERLAY = None
        self.dir.cleanup()

    @staticmethod
    def module(name="sheets"):
        from sheets import autocat
        if name == "sheets":
            S.OVERLAY = H.CATEGORIES_EXTRA[0]
            return S
        return autocat

    def overlay(self):
        return json.loads(self.cz.file.read_text())["exercises"]

    def fake(self, answer):
        """A call function: answer(ids of the batch, kwargs) -> a response, or raises."""
        def call(kwargs):
            sent = kwargs["messages"][0]["content"]
            ids = [d["id"] for d in json.loads(sent.split("<exercises>\n", 1)[1].rsplit("\n</exercises>", 1)[0])]
            self.calls.append((ids, kwargs))
            return answer(ids, kwargs)
        return call

    def test_provisional_nearest(self):
        from sheets import autocat as A
        self.assertEqual(A.KINDS, S.TASKS)
        self.assertEqual(A.words("Die \\SolQty{v}{s/t} Geschwindigkeit, 12 m/s"), ["die", "geschwindigkeit"])
        self.assertEqual(self.cz.label_provisional(), 3)
        over = self.overlay()
        self.assertEqual({k: (r["sub"], r["like"], r["source"]) for k, r in over.items()},
                         {"101": ("kin.a", "1", "provisional"), "102": ("el.ohm", "3", "provisional"), "103": ("kin.b", "2", "provisional")})
        self.assertEqual({f: over["103"][f] for f in A.COPIED}, self.BASE["2"])  # every label of the nearest, copied
        self.assertEqual(over["103"]["flag"], "")
        self.assertEqual(self.cz.label_provisional(), 0)  # (each once)
        # merged: sheets see them at once, "not yet categorised" no more
        have = S.available(self.admin.texercises)
        tree = S.topic_tree(have)
        self.assertEqual(tree["new"]["exercises"], 0)
        self.assertEqual(S.exercise_meta(have["ex101"])["subtopic"]["id"], "kin.a")
        st = self.cz.status()
        self.assertEqual((st["total"], st["provisional"], st["pending"], st["missing"]), (3, 3, 3, 0))

    def test_overlay_merge_and_teacher(self):
        d = Path(self.dir.name)
        extra = d / "extra.json"
        extra.write_text(json.dumps({"exercises": {
            "1": {**self.BASE["1"], "sub": "el.ohm", "source": "teacher"},          # wins over categories.json
            "101": {**self.BASE["2"], "source": "claude", "model": "m"},
            "102": {**self.BASE["2"], "sub": "unknown.sub", "source": "claude"}}}))  # (no known subtopic: left out)
        cats = S.load_categories(d / "categories.json", extra)
        self.assertEqual((cats["exercises"]["1"]["sub"], cats["exercises"]["1"]["source"]), ("el.ohm", "teacher"))
        self.assertEqual((cats["exercises"]["101"]["sub"], cats["exercises"]["101"]["source"]), ("kin.b", "claude"))
        self.assertEqual((cats["exercises"]["2"]["source"], "102" in cats["exercises"]), (None, False))
        self.assertNotIn("101", S.load_categories(d / "categories.json")["exercises"])  # (without the overlay)
        # the service's overlay: a change seen at once (the caches follow its stamp)
        self.cz.label_provisional()
        have = S.available(self.admin.texercises)
        self.assertEqual(S.exercise_meta(have["ex102"])["subtopic"]["id"], "el.ohm")
        got = self.cz.confirm({"id": "102", "sub": "kin.b", "kind": "explain"})
        self.assertEqual((got["source"], got["sub"], got["kind"], got["kinds"][0], got["was"]), ("teacher", "kin.b", "explain", "explain", "provisional"))
        self.assertEqual(S.exercise_meta(have["ex102"])["subtopic"]["id"], "kin.b")
        for bad in ({"id": "102", "sub": "x", "kind": "explain"}, {"id": "102", "sub": "kin.a", "kind": "x"}, {"id": "1", "sub": "kin.a", "kind": "explain"}):
            with self.assertRaises(ValueError):
                self.cz.confirm(bad)
        # automation never overwrites the teacher: not the provisional labels, not Claude
        self.cz.change(lambda over: over["exercises"]["102"].update({"source": "teacher"}))
        self.cz.change(lambda over: over["exercises"]["101"].update({"source": "teacher", "sub": "el.ohm"}))
        self.cz.change(lambda over: over["exercises"]["103"].update({"source": "provisional"}))
        call = self.fake(lambda ids, kw: FakeAPI.response([label(i, "kin.a") for i in ids]))
        self.cz.run(call, FakeAPI)
        over = self.overlay()
        self.assertEqual(self.calls[0][0], ["103"])  # (only the provisional one asked for)
        self.assertEqual({k: (r["source"], r["sub"]) for k, r in over.items()},
                         {"101": ("teacher", "el.ohm"), "102": ("teacher", "kin.b"), "103": ("claude", "kin.a")})
        # Claude answering for a teacher's exercise meanwhile: not taken
        self.cz.change(lambda over: over["exercises"]["103"].update({"source": "provisional"}))
        def meanwhile(ids, kw):
            self.cz.confirm({"id": "103", "sub": "el.ohm", "kind": "concept"})
            return FakeAPI.response([label(i, "kin.a") for i in ids])
        self.cz.run(self.fake(meanwhile), FakeAPI)
        self.assertEqual((self.overlay()["103"]["source"], self.overlay()["103"]["sub"]), ("teacher", "el.ohm"))

    def test_worker(self):
        self.cz.label_provisional()
        self.cz.connect = lambda: (self.fake(lambda ids, kw: FakeAPI.response(
            [label(ids[0], "el.ohm", flag="dup:3"), label(ids[1], "nope.sub"), label(ids[2], context="moon"), label(999)])), FakeAPI, "")
        self.assertTrue(self.cz.start())
        self.cz.thread.join(10)
        ids, kw = self.calls[0]
        self.assertEqual((ids, len(self.calls)), (["101", "102", "103"], 1))
        # the request as specified
        self.assertEqual((kw["model"], kw["max_tokens"], kw["betas"], kw["fallbacks"]), ("claude-opus-5-5", 16000, ["server-side-fallback-2026-07-01"], "default"))
        self.assertEqual(kw["output_config"]["effort"], "low")
        sch = kw["output_config"]["format"]["schema"]
        self.assertEqual(kw["output_config"]["format"]["type"], "json_schema")
        rec = sch["properties"]["exercises"]["items"]
        self.assertEqual((rec["additionalProperties"], sorted(rec["required"]), sorted(rec["properties"])), (False, sorted(rec["properties"]), sorted(rec["properties"])))
        self.assertEqual(rec["properties"]["context"]["enum"], list(H.sheets_module("autocat").CONTEXTS))
        self.assertEqual(rec["properties"]["kinds"]["items"]["enum"], list(S.TASKS))
        self.assertEqual(kw["system"][0]["cache_control"], {"type": "ephemeral"})
        self.assertIn("kin.b: Mechanics / Kinematics / Free fall\n", kw["system"][0]["text"])
        self.assertIn("not instructions", kw["messages"][0]["content"])
        # the good one kept as Claude's (a dup flag of a known exercise kept), the others provisional, failed
        over = self.overlay()
        self.assertEqual((over["101"]["source"], over["101"]["sub"], over["101"]["model"], over["101"]["flag"]), ("claude", "el.ohm", "claude-opus-5-5", "dup:3"))
        self.assertEqual((over["102"]["source"], over["102"]["error"]), ("provisional", "unknown subtopic 'nope.sub'"))
        self.assertEqual((over["103"]["source"], over["103"]["error"]), ("provisional", "unknown context 'moon'"))
        self.assertNotIn("999", over)
        st = self.cz.status()
        self.assertEqual((st["claude"], st["provisional"], st["failed"], st["pending"], st["running"]), (1, 2, 2, 0, False))
        self.assertEqual(st["usage"], {"input": 1000, "output": 200, "cache_read": 3000, "cache_write": 0, "requests": 1})
        self.assertEqual(S.load_categories()["exercises"]["101"]["sub"], "el.ohm")
        # "Categorise now" tries the failed ones again; a refusal marks them failed, nothing crashes
        self.calls.clear()
        self.cz.connect = lambda: (self.fake(lambda ids, kw: FakeAPI.response(stop="refusal", text="")), FakeAPI, "")
        self.cz.categorise_now()
        for _ in range(100):
            if self.calls and not self.cz.status()["running"] and not self.cz.status()["labelling"]:
                break
            time.sleep(0.05)
        self.assertEqual(self.calls[0][0], ["102", "103"])
        self.assertEqual({k: r.get("error") for k, r in self.overlay().items() if r["source"] == "provisional"},
                         {"102": "Claude declined to label it", "103": "Claude declined to label it"})
        self.assertEqual(self.cz.status()["usage"]["requests"], 2)

    def test_worker_errors(self):
        self.cz.label_provisional()
        # max_tokens: half the batch, then the rest
        answers = iter([FakeAPI.response(stop="max_tokens")])
        call = self.fake(lambda ids, kw: next(answers, None) or FakeAPI.response([label(i) for i in ids]))
        self.assertEqual(self.cz.run(call, FakeAPI), "done: 3 labelled by Claude")
        self.assertEqual([c[0] for c in self.calls], [["101", "102", "103"], ["101"], ["102"], ["103"]])
        # an error raised: no crash, the status says it; rate limits and overload waited for, then retried
        self.cz.change(lambda over: [r.update({"source": "provisional"}) for r in over["exercises"].values()])
        def raising(*errors):
            todo = list(errors)
            def answer(ids, kw):
                if todo:
                    raise todo.pop(0)
                return FakeAPI.response([label(i) for i in ids])
            return answer
        self.calls.clear()
        msg = self.cz.run(self.fake(raising(FakeAPI.RateLimitError("slow", 429), FakeAPI.APIStatusError("overloaded", 529))), FakeAPI)
        self.assertEqual((msg, len(self.calls)), ("done: 3 labelled by Claude", 3))
        self.cz.change(lambda over: [r.update({"source": "provisional"}) for r in over["exercises"].values()])
        msg = self.cz.run(self.fake(raising(*[FakeAPI.APIConnectionError("down")] * 3)), FakeAPI)
        self.assertEqual(msg, "stopped: the Claude API is busy or unreachable; try again later")
        msg = self.cz.run(self.fake(raising(FakeAPI.AuthenticationError("invalid x-api-key", 401))), FakeAPI)
        self.assertTrue(msg.startswith("stopped: the API key was not accepted"), msg)
        msg = self.cz.run(self.fake(raising(FakeAPI.BadRequestError("bad schema", 400))), FakeAPI)
        self.assertEqual(msg, "stopped: the API refused the request: bad schema")
        self.cz.connect = lambda: (self.fake(raising(RuntimeError("boom"))), FakeAPI, "")
        self.assertTrue(self.cz.start())
        self.cz.thread.join(10)
        st = self.cz.status()
        self.assertEqual((st["running"], st["message"]), (False, "stopped: RuntimeError: boom"))
        # not JSON: failed, kept provisional
        self.cz.run(self.fake(lambda ids, kw: FakeAPI.response(text="{oops")), FakeAPI)
        self.assertEqual({r.get("error") for r in self.overlay().values()}, {"Claude's answer was not JSON"})
        self.assertEqual({r["source"] for r in self.overlay().values()}, {"provisional"})

    def test_without_package_or_key(self):
        with mock.patch.dict(sys.modules, {"anthropic": None}):  # (an import of it fails)
            self.assertEqual(self.cz.connect()[2], H.NO_PACKAGE)
            self.assertTrue(H.NO_PACKAGE.startswith("the anthropic package is not installed on the server"))
        with mock.patch("importlib.util.find_spec", return_value=None):
            self.assertEqual(self.cz.available(), H.NO_PACKAGE)
            st = self.cz.categorise_now()  # provisional labels only, and the status says why
            for _ in range(100):
                if not self.cz.status()["labelling"]:
                    break
                time.sleep(0.05)
            st = self.cz.status()
            self.assertEqual((st["available"], st["provisional"], st["running"], self.cz.thread), (H.NO_PACKAGE, 3, False, None))
        fake = type(sys)("anthropic")
        fake.Anthropic = lambda: self.fail("no client without a key")
        env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
        with mock.patch.dict(sys.modules, {"anthropic": fake}), mock.patch.dict(os.environ, env, clear=True), \
                mock.patch("importlib.util.find_spec", return_value=object()):
            self.assertEqual(self.cz.available(), H.NO_KEY)
            self.assertEqual(self.cz.connect()[2], H.NO_KEY)
            self.assertFalse(self.cz.start())
            self.assertEqual(self.cz.status()["message"], H.NO_KEY)
        self.assertIn("ANTHROPIC_API_KEY to /etc/hub-admin/anthropic.env", H.NO_KEY)

    def test_workspace_header(self):
        made = []
        fake = type(sys)("anthropic")
        fake.Anthropic = lambda **kw: made.append(kw) or object()
        for ws, want in (("", {}), ("wrkspc_1", {"default_headers": {"anthropic-workspace-id": "wrkspc_1"}})):
            env = {**os.environ, "ANTHROPIC_API_KEY": "k", "ANTHROPIC_WORKSPACE_ID": ws}
            with mock.patch.dict(sys.modules, {"anthropic": fake}), mock.patch.dict(os.environ, env, clear=True):
                self.assertEqual(self.cz.connect()[2], "")
            self.assertEqual(made.pop(), want)


class AllInUnit(unittest.TestCase):
    """The rooms of the game All In: opening, the state, joining, bets and the timer."""

    def setUp(self):
        self.now = [1000.0]
        self.rooms = H.AllInRooms(clock=lambda: self.now[0])

    def state(self, phase="bet", i=0, left=90, **kw):
        return {"phase": phase, "i": i, "round": "tracks", "rounds": 6, "left": left,
                "teams": [{"name": "Newtons", "chips": 100, "min": 10}, {"name": "Curies", "chips": 100, "min": 10}], **kw}

    def test_room(self):
        code = self.rooms.open("bys")
        self.assertRegex(code, r"^[A-HJ-NP-Z]{4}$")
        self.assertEqual(self.rooms.open("bys", code), code)  # the same room again
        other = self.rooms.open("abc")
        self.assertNotEqual(other, code)
        with self.assertRaises(PermissionError):
            self.rooms.set_state("abc", code, self.state())
        # a new room closes the teacher's old one; after a restart the code comes back
        new = self.rooms.open("bys")
        self.assertNotIn(code, self.rooms.rooms)
        fresh = H.AllInRooms()
        self.assertEqual(fresh.open("bys", new), new)
        self.assertNotEqual(fresh.open("abc", "IOIO"), "IOIO")  # not a code: a new one
        with self.assertRaises(KeyError):
            self.rooms.view("ZZZZ")

    def test_preview(self):
        # a preview's room leaves the game in class open, and a new preview closes the old one
        game = self.rooms.open("bys")
        preview = self.rooms.open("bys", preview=True)
        self.assertNotEqual(preview, game)
        self.assertIn(game, self.rooms.rooms)
        again = self.rooms.open("bys", preview=True)
        self.assertNotIn(preview, self.rooms.rooms)
        self.assertIn(game, self.rooms.rooms)
        self.rooms.open("bys")
        self.assertNotIn(game, self.rooms.rooms)
        self.assertIn(again, self.rooms.rooms)

    def test_game(self):
        code = self.rooms.open("bys")
        with self.assertRaises(ValueError):
            self.rooms.join(code, "Anna", 0)  # no teams yet
        self.rooms.set_state("bys", code, self.state("lobby", left=None))
        with self.assertRaises(ValueError):
            self.rooms.join(code, "  ", 0)
        with self.assertRaises(ValueError):
            self.rooms.join(code, "Anna", 2)
        anna = self.rooms.join(code, " Anna  B ", 0)["token"]
        ben = self.rooms.join(code, "Ben", 1)["token"]
        self.assertEqual(self.rooms.join(code, "Anna", 1, anna)["token"], anna)  # changes team, same token
        self.rooms.join(code, "Anna B", 0, anna)
        view = self.rooms.view(code, anna)
        self.assertEqual(view["me"], {"name": "Anna B", "team": 0})
        self.assertEqual(view["players"], [{"name": "Anna B", "team": 0}, {"name": "Ben", "team": 1}])
        self.assertIsNone(self.rooms.view(code, "nope")["me"])
        with self.assertRaises(ValueError):  # not betting yet
            self.rooms.bet(code, anna, 0, {"chips": [0, 10, 0]})
        self.rooms.set_state("bys", code, self.state("bet", left=90))
        with self.assertRaises(PermissionError):
            self.rooms.bet(code, "nope", 0, {"chips": [0, 10, 0]})
        with self.assertRaises(ValueError):
            self.rooms.bet(code, anna, 1, {"chips": [0, 10, 0]})  # another round
        for bad in ({"chips": [1.5, 0, 0]}, {"chips": [-1, 0, 0]}, {"chips": [1]}, {"stake": 10}, {"stake": 10, "value": "x"}, {"stake": True, "value": 3}, "x"):
            with self.assertRaises(ValueError):
                self.rooms.bet(code, anna, 0, bad)
        self.rooms.bet(code, anna, 0, {"chips": [0, 10, 0], "extra": 1})
        self.rooms.bet(code, anna, 0, {"chips": [0, 20, 0], "insurance": True})  # the last one counts
        self.rooms.bet(code, ben, 0, {"chips": [30, 0, 0]})
        host = self.rooms.host_view("bys", code)
        self.assertEqual(host["bets"]["0"], {"bet": {"insurance": True, "chips": [0, 20, 0]}, "by": "Anna B", "n": 2})
        self.assertEqual(host["bets"]["1"]["by"], "Ben")
        self.assertEqual(host["left"], 90)
        self.assertEqual(self.rooms.view(code, ben)["bet"]["bet"]["chips"], [30, 0, 0])
        self.now[0] += 91.5  # in the grace period
        self.rooms.bet(code, ben, 0, {"chips": [40, 0, 0]})
        self.now[0] += 1
        with self.assertRaises(ValueError):
            self.rooms.bet(code, ben, 0, {"chips": [50, 0, 0]})
        self.assertEqual(self.rooms.view(code, ben)["left"], 0)
        # the reveal keeps the bets; the next round clears them
        self.rooms.set_state("bys", code, self.state("reveal", result=[{"net": 40}, {"net": -40}]))
        self.assertEqual(len(self.rooms.host_view("bys", code)["bets"]), 2)
        self.assertEqual(self.rooms.view(code)["state"]["result"], [{"net": 40}, {"net": -40}])
        self.assertIsNone(self.rooms.view(code)["left"])
        self.rooms.set_state("bys", code, self.state("show", i=1, left=None))
        self.assertEqual(self.rooms.host_view("bys", code)["bets"], {})
        # estimates and calculations
        self.rooms.set_state("bys", code, self.state("bet", i=1))
        self.assertEqual(self.rooms.bet(code, anna, 1, {"low": 100, "high": 300.5, "stake": 20})["bet"], {"insurance": False, "stake": 20, "low": 100.0, "high": 300.5})
        self.assertEqual(self.rooms.bet(code, anna, 1, {"value": 4.5e22, "stake": 20})["bet"]["value"], 4.5e22)
        with self.assertRaises(ValueError):
            self.rooms.bet(code, anna, 1, {"low": float("inf"), "high": 3, "stake": 20})
        with self.assertRaises(PermissionError):
            self.rooms.close("abc", code)
        # idle rooms go
        self.now[0] += H.ALLIN_IDLE + 1
        with self.assertRaises(KeyError):
            self.rooms.view(code)

    def test_state_cleaned(self):
        st = H.allin_state({"phase": "show", "i": 2, "round": "<b>x</b>", "teams": [{"name": " A " * 20, "chips": -5}, {"name": "B", "chips": 3, "min": 2}], "left": 10000, "hot": {"team": 1, "name": "Anna"}, "result": "x" })
        self.assertEqual(st["round"], "bxb")
        self.assertEqual(len(st["teams"][0]["name"]), 24)
        self.assertEqual(st["teams"][0]["chips"], 0)
        self.assertEqual(st["left"], 600)
        self.assertEqual(st["hot"], {"team": 1, "name": "Anna"})
        self.assertNotIn("result", st)
        for bad in ({"phase": "x", "teams": []}, {"phase": "show", "teams": [{"name": "A"}]}, {"phase": "show", "teams": [{"name": "A"}, {"name": " "}]}, []):
            with self.assertRaises(ValueError):
                H.allin_state(bad)


class ZeroUnit(unittest.TestCase):
    """The rooms of the quiz Absolute Zero: joining, answers and the timer."""

    def setUp(self):
        self.now = [1000.0]
        self.rooms = H.ZeroRooms(clock=lambda: self.now[0])

    def test_game(self):
        code = self.rooms.open("bys")
        self.rooms.set_state("bys", code, {"phase": "lobby", "rounds": 8})
        with self.assertRaises(ValueError):
            self.rooms.join(code, "  ")
        anna = self.rooms.join(code, " Anna ")
        ben = self.rooms.join(code, "Ben")
        self.assertEqual((anna["id"], ben["id"]), ("p1", "p2"))
        self.assertEqual(self.rooms.join(code, "Anna B", anna["token"]), {"token": anna["token"], "id": "p1"})  # a new name, the same player
        self.assertEqual(self.rooms.view(code, anna["token"])["players"], ["Anna B", "Ben"])
        with self.assertRaises(ValueError):
            self.rooms.answer(code, anna["token"], 0, "Mars")  # not yet
        self.rooms.set_state("bys", code, {"phase": "answer", "i": 0, "q": "planets", "rounds": 8, "left": 30})
        with self.assertRaises(PermissionError):
            self.rooms.answer(code, "nope", 0, "Mars")
        with self.assertRaises(ValueError):
            self.rooms.answer(code, anna["token"], 1, "Mars")  # another question
        with self.assertRaises(ValueError):
            self.rooms.answer(code, anna["token"], 0, "   ")
        self.rooms.answer(code, anna["token"], 0, "Mars")
        self.assertEqual(self.rooms.answer(code, anna["token"], 0, "Ceres " + "x" * 80)["answer"], "Ceres " + "x" * 54)  # changed, cut
        self.now[0] += 31  # within the grace
        self.rooms.answer(code, ben["token"], 0, "Pluto")
        self.now[0] += 2
        with self.assertRaises(ValueError):
            self.rooms.answer(code, ben["token"], 0, "Eris")
        host = self.rooms.host_view("bys", code)
        self.assertEqual(host["answers"], {"p1": "Ceres " + "x" * 54, "p2": "Pluto"})
        self.assertEqual(host["players"], [{"id": "p1", "name": "Anna B"}, {"id": "p2", "name": "Ben"}])
        view = self.rooms.view(code, ben["token"])
        self.assertEqual((view["me"], view["answer"], view["left"]), ({"id": "p2", "name": "Ben"}, "Pluto", 0.0))
        # the reveal keeps the answers, the next question clears them
        self.rooms.set_state("bys", code, {"phase": "reveal", "i": 0, "q": "planets", "result": {"s": {"p1": [0, 0, 1]}}})
        self.assertEqual(self.rooms.view(code, ben["token"])["state"]["result"], {"s": {"p1": [0, 0, 1]}})
        self.assertEqual(len(self.rooms.host_view("bys", code)["answers"]), 2)
        self.rooms.set_state("bys", code, {"phase": "answer", "i": 1, "q": "lenses", "left": 30})
        self.assertEqual(self.rooms.host_view("bys", code)["answers"], {})

    def test_state(self):
        st = H.zero_state({"phase": "answer", "i": -1, "q": "<b>x</b>", "left": 9999, "result": {"s": "x" * 9000}})
        self.assertEqual(st, {"phase": "answer", "i": 0, "rounds": 0, "q": "bxb", "left": 600.0})
        for bad in (None, {"phase": "bet"}, []):
            with self.assertRaises(ValueError):
                H.zero_state(bad)


class Service(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        d = Path(self.dir.name)
        (d / "pw").write_text(hash_password("teacher pw") + "\n")
        (d / "index.html").write_text((ROOT / "hub" / "index.html").read_text())
        self.config = d / "data" / "apps.json"
        self.sets = d / "data" / "sets.json"
        self.admin = H.Admin(d / "pw", d / "index.html", self.config)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H.make_handler(self.admin))
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.dir.cleanup()

    def req(self, path, data=None, ctype=None, cookie=None):
        r = urllib.request.Request(self.base + path, data=data, method="POST" if data is not None else "GET")
        if ctype:
            r.add_header("Content-Type", ctype)
        if cookie:
            r.add_header("Cookie", cookie)

        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **k):
                return None
        opener = urllib.request.build_opener(NoRedirect)
        try:
            with opener.open(r) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()

    def login(self, password="teacher pw"):
        return self.req("/login", f"password={password}".encode(), "application/x-www-form-urlencoded")

    def test_all_in(self):
        st, headers, _ = self.login()
        cookie = headers["Set-Cookie"].split(";")[0]
        js = "application/json"
        post = lambda path, obj, c=None: self.req(path, json.dumps(obj).encode(), js, c)
        self.assertEqual(post("/api/all-in/open", {})[0], 403)  # the teacher's screen needs the login
        st, _, body = post("/api/all-in/open", {}, cookie)
        self.assertEqual(st, 200)
        code = json.loads(body)["code"]
        teams = [{"name": "Newtons", "chips": 100, "min": 10}, {"name": "Curies", "chips": 100, "min": 10}]
        self.assertEqual(post(f"/api/all-in/{code}/state", {"state": {"phase": "lobby", "teams": teams}})[0], 403)
        self.assertEqual(post(f"/api/all-in/{code}/state", {"state": {"phase": "lobby", "teams": teams}}, cookie)[0], 200)
        self.assertEqual(post(f"/api/all-in/{code}/state", {"state": {"phase": "nope", "teams": teams}}, cookie)[0], 400)
        # a phone joins and bets, without login
        st, _, body = post(f"/api/all-in/{code}/join", {"name": "Anna", "team": 1})
        self.assertEqual(st, 200)
        token = json.loads(body)["token"]
        self.assertEqual(post("/api/all-in/ZZZZ/join", {"name": "Anna", "team": 1})[0], 404)
        self.assertEqual(self.req(f"/api/all-in/{code}/join", b"name=x", "application/x-www-form-urlencoded")[0], 415)
        post(f"/api/all-in/{code}/state", {"state": {"phase": "bet", "i": 0, "round": "tracks", "left": 90, "teams": teams}}, cookie)
        st, _, body = post(f"/api/all-in/{code}/bet", {"token": token, "i": 0, "bet": {"chips": [0, 20, 0]}})
        self.assertEqual(st, 200)
        self.assertEqual(post(f"/api/all-in/{code}/bet", {"token": "x", "i": 0, "bet": {"chips": [0, 20, 0]}})[0], 403)
        st, _, body = self.req(f"/api/all-in/{code}?token={token}")
        view = json.loads(body)
        self.assertEqual((view["me"], view["bet"]["by"], view["state"]["round"]), ({"name": "Anna", "team": 1}, "Anna", "tracks"))
        self.assertEqual(self.req(f"/api/all-in/{code}/host")[0], 403)
        st, _, body = self.req(f"/api/all-in/{code}/host", cookie=cookie)
        self.assertEqual(json.loads(body)["bets"]["1"]["bet"]["chips"], [0, 20, 0])
        self.assertEqual(post(f"/api/all-in/{code}/close", {}, cookie)[0], 200)
        self.assertEqual(self.req(f"/api/all-in/{code}")[0], 404)

    def test_absolute_zero(self):
        st, headers, _ = self.login()
        cookie = headers["Set-Cookie"].split(";")[0]
        js = "application/json"
        post = lambda path, obj, c=None: self.req(path, json.dumps(obj).encode(), js, c)
        self.assertEqual(post("/api/absolute-zero/open", {})[0], 403)
        st, _, body = post("/api/absolute-zero/open", {}, cookie)
        self.assertEqual(st, 200)
        code = json.loads(body)["code"]
        self.assertEqual(post(f"/api/absolute-zero/{code}/state", {"state": {"phase": "lobby"}})[0], 403)
        self.assertEqual(post(f"/api/absolute-zero/{code}/state", {"state": {"phase": "lobby"}}, cookie)[0], 200)
        st, _, body = post(f"/api/absolute-zero/{code}/join", {"name": "Anna"})
        token = json.loads(body)["token"]
        post(f"/api/absolute-zero/{code}/state", {"state": {"phase": "answer", "i": 0, "q": "planets", "left": 30}}, cookie)
        self.assertEqual(post(f"/api/absolute-zero/{code}/answer", {"token": token, "i": 0, "text": "Ceres"})[0], 200)
        self.assertEqual(post(f"/api/absolute-zero/{code}/answer", {"token": "x", "i": 0, "text": "Ceres"})[0], 403)
        st, _, body = self.req(f"/api/absolute-zero/{code}?token={token}")
        self.assertEqual(json.loads(body)["answer"], "Ceres")
        self.assertEqual(self.req(f"/api/absolute-zero/{code}/host")[0], 403)
        st, _, body = self.req(f"/api/absolute-zero/{code}/host", cookie=cookie)
        self.assertEqual(json.loads(body)["answers"], {"p1": "Ceres"})
        self.assertEqual(self.req(f"/api/all-in/{code}")[0], 404)  # the games have rooms of their own
        self.assertEqual(post(f"/api/absolute-zero/{code}/close", {}, cookie)[0], 200)
        self.assertEqual(self.req(f"/api/absolute-zero/{code}")[0], 404)

    def test_flow(self):
        st, _, body = self.req("/")
        self.assertEqual(st, 200)
        self.assertIn(b'type="password"', body)
        self.assertEqual(self.req("/api/config")[0], 403)
        st, _, _ = self.login("nope")
        self.assertEqual(st, 403)
        st, headers, _ = self.login()
        self.assertEqual(st, 303)
        cookie = headers["Set-Cookie"].split(";")[0]
        self.assertIn("HttpOnly", headers["Set-Cookie"])
        self.assertIn("SameSite=Strict", headers["Set-Cookie"])
        st, _, body = self.req("/", cookie=cookie)
        self.assertIn(b'id="apps"', body)
        st, _, body = self.req("/api/config", cookie=cookie)
        cfg = json.loads(body)
        ids = [a["id"] for a in cfg["apps"]]
        self.assertEqual(cfg["order"], ids)
        # a save: reordered, tagged, cleaned
        new = {"order": list(reversed(ids)), "tags": {"coe": ["mechanics", "energy", "Energy"], "nope": ["x"]},
               "labels": {"mechanics": {"en": "Mechanics", "de": "Mechanik"}, "energy": {"en": "Energy", "de": "Energie"}}}
        self.assertEqual(self.req("/api/config", json.dumps(new).encode(), "text/plain", cookie)[0], 415)
        self.assertEqual(self.req("/api/config", json.dumps(new).encode(), "application/json")[0], 403)
        st, _, body = self.req("/api/config", json.dumps(new).encode(), "application/json", cookie)
        self.assertEqual(st, 200)
        saved = json.loads(self.config.read_text())
        self.assertEqual(saved, {"order": list(reversed(ids)), "tags": {"coe": ["mechanics", "energy"]},
                                 "labels": {"mechanics": {"en": "Mechanics", "de": "Mechanik"}, "energy": {"en": "Energy", "de": "Energie"}}})
        self.assertEqual(self.req("/api/config", b"{not json", "application/json", cookie)[0], 400)
        self.assertEqual(self.req("/api/config", b"x" * (H.MAX_BODY + 1), "application/json", cookie)[0], 413)
        # logging out clears the cookie
        st, headers, _ = self.req("/logout", b"", "application/x-www-form-urlencoded", cookie)
        self.assertEqual(st, 303)
        self.assertIn("Max-Age=0", headers["Set-Cookie"])
        self.assertEqual(self.req("/static/admin.js")[0], 200)
        self.assertEqual(self.req("/static/drag.js")[0], 200)
        self.assertEqual(self.req("/static/games.js")[0], 200)
        self.assertEqual(self.req("/nothing")[0], 404)

    def test_sets(self):
        st, headers, _ = self.login()
        cookie = headers["Set-Cookie"].split(";")[0]
        self.assertEqual(self.req("/api/sets")[0], 403)
        st, _, body = self.req("/api/sets", cookie=cookie)
        self.assertEqual(st, 200)
        data = json.loads(body)
        self.assertEqual(data["sets"], {})
        self.assertIn({"id": "torque", "name": "Torque and Equilibrium", "de": "Drehmoment und Gleichgewicht", "modes": ["tutor", "practice", "check"]}, data["apps"])
        new = {"sets": {"3a-elektro": {"title": "Klasse 3a", "lang": "de", "apps": [
            {"id": "electric-field", "modes": ["tutor", "practice", "check"], "tutor": [0, 1, 3], "practice": ["force-dir", "lines-pick+lines-read"]},
            {"id": "photons", "modes": ["check"]}]}}}
        self.assertEqual(self.req("/api/sets", json.dumps(new).encode(), "application/json")[0], 403)
        self.assertEqual(self.req("/api/sets", json.dumps(new).encode(), "text/plain", cookie)[0], 415)
        st, _, body = self.req("/api/sets", json.dumps(new).encode(), "application/json", cookie)
        self.assertEqual(st, 200)
        self.assertEqual(json.loads(body)["sets"], new["sets"])
        # on disk, under the superuser's identifier (learningphysics.ch/bys/3a-elektro, or /3a-elektro)
        on_disk = {"default": "bys", "sets": {"bys/3a-elektro": new["sets"]["3a-elektro"]}}
        self.assertEqual(json.loads(self.sets.read_text()), on_disk)
        self.assertEqual(json.loads(self.req("/api/sets", cookie=cookie)[2])["sets"], new["sets"])
        # a language other than English or German: the students choose
        st, _, body = self.req("/api/sets", json.dumps({"sets": {"x": {"lang": "fr"}}}).encode(), "application/json", cookie)
        self.assertEqual(json.loads(body)["sets"], {"x": {"title": "", "apps": []}})
        self.req("/api/sets", json.dumps(new).encode(), "application/json", cookie)
        # the apps in the standard order (apps.json's)
        self.req("/api/config", json.dumps({"order": ["torque", "coulomb"], "tags": {}, "labels": {}}).encode(), "application/json", cookie)
        self.assertEqual([a["id"] for a in json.loads(self.req("/api/sets", cookie=cookie)[2])["apps"]][:2], ["torque", "coulomb"])
        # names that cannot be: nothing is written
        (Path(self.dir.name) / "privacy-old").mkdir()
        for name, why in [("torque", "name of an app"), ("admin", "taken"), ("privacy-old", "taken"), ("index", "taken"), ("Klasse 3a", "not a valid")]:
            st, _, body = self.req("/api/sets", json.dumps({"sets": {name: {}}}).encode(), "application/json", cookie)
            self.assertEqual(st, 400, name)
            self.assertIn(why, json.loads(body)["error"])
        self.assertEqual(json.loads(self.sets.read_text()), on_disk)
        # deleting every set
        st, _, body = self.req("/api/sets", b'{"sets": {}}', "application/json", cookie)
        self.assertEqual(json.loads(self.sets.read_text()), {"default": "bys", "sets": {}})
        # the panel loads the frames of the apps from the same site
        st, headers, _ = self.req("/", cookie=cookie)
        self.assertIn("frame-src 'self'", headers["Content-Security-Policy"])
        self.assertEqual(self.req("/static/sets.js")[0], 200)

    def test_sets_with_objectives(self):
        st, headers, _ = self.login()
        cookie = headers["Set-Cookie"].split(";")[0]
        # a set saved before there were objectives, on disk: read as it is now (arcade: the check)
        old = {"sets": {"3a": {"title": "3a", "apps": [{"id": "electric-field", "modes": ["tutor", "arcade"], "tutor": [0, 3], "practice": ["force-dir"]}]}}}
        H.write_config(self.sets, old)
        data = json.loads(self.req("/api/sets", cookie=cookie)[2])
        self.assertEqual(data["sets"]["3a"]["apps"], [{"id": "electric-field", "modes": ["tutor", "check"], "tutor": [0, 3]}])
        self.assertNotIn("objectives", data["apps"][0])  # no objectives.json next to the hub page
        # with objectives.json (as deployed next to the hub page), the apps carry their objectives' ids
        (Path(self.dir.name) / "objectives.json").write_text((ROOT / "hub" / "objectives.json").read_text())
        data = json.loads(self.req("/api/sets", cookie=cookie)[2])
        ef = next(a for a in data["apps"] if a["id"] == "electric-field")
        self.assertEqual(ef["objectives"], ["sketch", "read", "dipole", "equi", "error"])
        new = {"sets": {"3a": {"title": "3a", "apps": [
            {"id": "electric-field", "modes": ["tutor", "practice", "check"], "objectives": ["read", "nope", "sketch"], "tutor": [0, 3]},
            {"id": "photons", "modes": ["check"], "objectives": ["wave", "einstein", "threshold", "rate"]}]}}}  # all: no list
        st, _, body = self.req("/api/sets", json.dumps(new).encode(), "application/json", cookie)
        self.assertEqual(st, 200)
        self.assertEqual(json.loads(self.sets.read_text())["sets"]["bys/3a"]["apps"], [
            {"id": "electric-field", "modes": ["tutor", "practice", "check"], "objectives": ["sketch", "read"]},
            {"id": "photons", "modes": ["check"]}])

    def drafts_zip(self, *keys, extra=None):
        """A TeXercises export of drafts of this repository, as the teacher's; extra: {new key: (a draft's
        key, changes of its exercise.json)}, exercises the pool does not know."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            for k, src, change in [(k, k, {}) for k in keys] + [(k, src, change) for k, (src, change) in (extra or {}).items()]:
                d = next(ROOT.glob(f"texercises-drafts*/exercises/{src}"))
                for f in d.iterdir():
                    data = f.read_bytes()
                    if f.name == "exercise.json":
                        meta = json.loads(data)
                        meta["info"] = {"creator": "by", "url": f"/exercise/{k}/"}
                        meta.update(change)
                        data = json.dumps(meta).encode()
                    z.writestr(f"x/exercises/{k}/{f.name}", data)
        return buf.getvalue()

    def test_sheets(self):
        (Path(self.dir.name) / "objectives.json").write_text((ROOT / "hub" / "objectives.json").read_text())
        pool = S.load_pool()
        drafts = [k for k in pool["coulomb"]["exercises"] if k.startswith("coulomb-")] + \
                 [k for k in pool["photons"]["exercises"] if k.startswith("photons-")]
        self.assertGreater(len(drafts), 6)
        j = lambda o: json.dumps(o).encode()
        # nothing about sheets without the login (only a shared sheet's online version, below)
        for path in ("/api/sheets", "/api/sheets/0123456789ab", "/api/preview?keys=" + drafts[0], "/sheet/0123456789ab.pdf",
                     "/sheet/0123456789ab-solutions.pdf"):
            self.assertEqual(self.req(path)[0], 403, path)
        for path in ("/api/plan", "/api/sheets/new", "/api/sheets/0123456789ab"):
            self.assertEqual(self.req(path, j({"sheet": {}}), "application/json")[0], 403, path)
        self.assertEqual(self.req("/api/texercises", self.drafts_zip(drafts[0]), "application/zip")[0], 403)
        st, headers, _ = self.login()
        cookie = headers["Set-Cookie"].split(";")[0]
        extra = {"zz-loose-concept": (drafts[0], {"type": 0, "title": "A concept question", "subbranches": ["Electrostatics"]})}  # in no objective
        st, _, body = self.req("/api/texercises", self.drafts_zip(*drafts, extra=extra), "application/zip", cookie)
        self.assertEqual((st, json.loads(body)), (200, {"exercises": len(drafts) + 1, "skipped": 0}))
        state = json.loads(self.req("/api/sheets", cookie=cookie)[2])
        self.assertEqual((state["sheets"], state["exercises"], state["latex"]), ([], len(drafts) + 1, bool(S.lualatex())))
        coulomb = next(a for a in state["apps"] if a["id"] == "coulomb")
        self.assertEqual([o["id"] for o in coulomb["objectives"]], ["direction", "factor", "vector", "field"])
        self.assertTrue(coulomb["objectives"][0]["de"])
        # the TeXercises topics of the exercises there (for the editor), and of each exercise in a plan
        meta = lambda k: S.exercise_meta(next(ROOT.glob(f"texercises-drafts*/exercises/{k}")))
        topics = {t for k in drafts for t in meta(k)["topics"]}
        self.assertIn("Electrostatics", topics)
        self.assertEqual({t["name"] for t in state["subjects"]} - {""}, topics)
        electro = next(t for t in state["subjects"] if t["name"] == "Electrostatics")
        self.assertEqual(electro["exercises"], sum("Electrostatics" in meta(k)["topics"] for k in drafts) + 1)
        self.assertEqual(electro["concept"], sum("Electrostatics" in meta(k)["topics"] and meta(k)["kind"] == "concept" for k in drafts) + 1)
        # step 2: the learning objectives on the topics, and the exercises on them without one
        draft = {"title": "Kräfte <3", "lang": "en", "topics": ["Electrostatics", "quantum physics"],
                 "modules": [{"id": "photons"}, {"id": "coulomb", "objectives": ["direction", "vector"]}]}
        self.assertEqual(self.req("/api/plan", j({"sheet": draft}), "text/plain", cookie)[0], 415)
        st, _, body = self.req("/api/plan", j({"sheet": draft}), "application/json", cookie)
        self.assertEqual(st, 200)
        plan = json.loads(body)
        listed = {(m["app"], o["id"]): o["keys"] for m in plan["objectives"] for o in m["objectives"]}
        self.assertTrue(listed[("coulomb", "vector")])
        self.assertTrue(set(listed[("coulomb", "factor")]) <= set(pool["coulomb"]["objectives"]["factor"]))  # also those not ticked
        self.assertTrue(all("Electrostatics" in plan["details"][k]["topics"] or "quantum physics" in plan["details"][k]["topics"] for ks in listed.values() for k in ks))
        self.assertNotIn("magnetic-forces", {a for a, _ in listed})  # nothing on the topics
        self.assertIn("zz-loose-concept", plan["loose"])
        self.assertEqual(plan["details"]["zz-loose-concept"]["kind"], "concept")
        self.assertIsNone(plan["details"]["zz-loose-concept"]["app"])
        self.assertEqual("only 0 easy exercises on these topics and objectives" in plan["notes"], plan["available"]["easy"] == 0)  # (the drafts: none)
        # step 3: the suggestion, by the balance (JSON only)
        draft["balance"] = {"concept": 0, "easy": 0, "medium": 100, "hard": 0}
        st, _, body = self.req("/api/plan", j({"sheet": draft, "suggest": True}), "application/json", cookie)
        self.assertEqual(st, 200)
        plan = json.loads(body)
        keys = plan["exercises"]
        self.assertTrue(keys)
        self.assertEqual(len(keys), len(set(keys)))
        self.assertTrue(all(k in drafts for k in keys))
        self.assertGreaterEqual(plan["default_count"], len(keys))  # (catalogue.json adds exercises to photons' objectives: more than the drafts)
        self.assertEqual(plan["count"], len(keys))
        # step 1's tree (categories.json; the drafts it does not know: not yet categorised), and the most
        # similar exercises of each one on the sheet, none on it
        tree = state["tree"]
        self.assertEqual(sum(a["exercises"] for a in tree["areas"]) + tree["new"]["exercises"], len(drafts) + 1)
        self.assertEqual(set(plan["similar"]), set(keys))
        self.assertTrue(all(x not in keys and x in plan["details"] and 0 < v <= 1 for v2 in plan["similar"].values() for x, v in v2))
        self.assertEqual({k: plan["details"][k]["topics"] for k in keys}, {k: meta(k)["topics"] for k in keys})
        self.assertEqual({k: (plan["details"][k]["kind"], plan["details"][k]["band"]) for k in keys}, {k: (meta(k)["kind"], meta(k)["band"]) for k in keys})
        covered = {tuple(o) for k in keys for o in plan["details"][k]["objectives"]}
        ticked = {("coulomb", "direction"), ("coulomb", "vector"), ("photons", "wave"), ("photons", "einstein"), ("photons", "threshold"), ("photons", "rate")}
        self.assertLessEqual({t for t in ticked if listed.get(t)}, covered)
        self.assertEqual([plan["details"][k]["app"] for k in keys], sorted((plan["details"][k]["app"] for k in keys), key=["coulomb", "photons"].index))
        got = S.tally(keys, {k: meta(k) for k in keys}, len(keys), draft["balance"])
        self.assertEqual((got["problem"], got[2]), tuple(min(len(keys), plan["available"][x] + plan["available"]["both"] * (x == "problem")) for x in ("problem", "medium")))
        # twelve, half of them concept questions: the one without objective too; what cannot be is said
        draft.update(loose=True, balance={"concept": 50, "easy": 20, "medium": 50, "hard": 30})
        plan = json.loads(self.req("/api/plan", j({"sheet": draft, "suggest": True, "count": 12}), "application/json", cookie)[2])
        avail = plan["available"]
        self.assertEqual(len(plan["exercises"]), min(12, avail["exercises"]))
        self.assertEqual(f"only {avail['exercises']} exercises on these topics and objectives" in plan["notes"], avail["exercises"] < 12)
        self.assertIn("zz-loose-concept", plan["exercises"])
        want = S.aims(12, draft["balance"])
        notes = [n for n in plan["notes"] if "concept" in n]
        self.assertEqual(bool(notes), avail["concept"] + avail["both"] < want["concept"])
        self.assertEqual(len(json.loads(self.req("/api/plan", j({"sheet": draft, "suggest": True, "count": 3}), "application/json", cookie)[2])["exercises"]), 3)
        for bad in ({"modules": [{"id": "../../etc"}]}, {"exercises": ["../x"]}, {"exercises": ["nope"]}, {"topics": [{}]}, {"balance": {"concept": -5}}):
            self.assertEqual(self.req("/api/plan", j({"sheet": bad}), "application/json", cookie)[0], 400)
        draft["balance"] = {"concept": 0, "easy": 0, "medium": 100, "hard": 0}
        keys = keys[:-2]  # (the suggestion takes all there are: two left out, as alternatives)
        # create it
        st, _, body = self.req("/api/sheets/new", j({"sheet": {**draft, "exercises": keys}}), "application/json", cookie)
        self.assertEqual(st, 200)
        sheet = json.loads(body)
        sid = sheet["id"]
        self.assertRegex(sid, r"^[0-9a-f]{12}$")
        self.assertEqual((sheet["title"], sheet["exercises"], sheet["token"]), ("Kräfte 3", keys, None))
        self.assertEqual((sheet["topics"], sheet["loose"], sheet["balance"]), (draft["topics"], True, draft["balance"]))
        self.assertEqual([m["id"] for m in sheet["modules"]], ["coulomb", "photons"])  # the hub's order
        saved = json.loads((Path(self.dir.name) / "data" / "exercise-sheets.json").read_text())
        self.assertEqual(list(saved["sheets"]), [sid])
        self.assertEqual((Path(self.dir.name) / "data" / "exercise-sheets.json").stat().st_mode & 0o777, 0o600)
        # replace one by an alternative, remove one, reorder; save
        alts = sheet["plan"]["alternatives"]
        k0 = next(k for k in keys if alts[k])
        alt = alts[k0][0]
        self.assertNotIn(alt, keys)
        tied = lambda k: {tuple(o) for o in sheet["plan"]["details"][k]["objectives"]} & ticked
        self.assertTrue(tied(k0) & tied(alt) or not tied(k0))  # of the same objective of the sheet
        new = [alt if k == k0 else k for k in keys][1:][::-1] + ["zz-loose-concept"]  # and one in no objective
        st, _, body = self.req(f"/api/sheets/{sid}", j({"action": "save", "sheet": {**draft, "exercises": new}}), "application/json", cookie)
        self.assertEqual((st, json.loads(body)["exercises"]), (200, new))
        self.assertEqual(json.loads(self.req(f"/api/sheets/{sid}", cookie=cookie)[2])["exercises"], new)
        self.assertEqual(self.req(f"/api/sheets/{sid}", j({"action": "save", "sheet": {"exercises": ["zz"]}}), "application/json", cookie)[0], 400)
        self.assertEqual(self.req(f"/api/sheets/{sid}", j({"action": "x"}), "application/json", cookie)[0], 400)
        self.assertEqual(self.req("/api/sheets/abcdefabcdef", j({"action": "save", "sheet": draft}), "application/json", cookie)[0], 404)
        self.assertEqual(self.req("/api/sheets/abcdefabcdef", cookie=cookie)[0], 404)
        self.assertEqual(self.req("/api/sheets/..%2f..%2fetc", cookie=cookie)[0], 404)
        # the preview: HTML, the math left to KaTeX
        st, _, body = self.req("/api/preview?keys=" + ",".join(new[:2] + ["../../x", "nope"]), cookie=cookie)
        prev = json.loads(body)["exercises"]
        self.assertEqual(sorted(prev), sorted(new[:2]))
        self.assertIn('class="tx-m"', prev[new[0]]["text"] + prev[new[0]]["solution"])
        # the PDF: made where LaTeX is, else a clear answer
        st, _, body = self.req(f"/sheet/{sid}.pdf", cookie=cookie)
        if S.lualatex():
            self.assertIn(st, (200, 202))
        else:
            self.assertEqual(st, 409)
            self.assertIn(b"LaTeX is not installed", body)
        self.assertEqual(self.req("/sheet/abcdefabcdef.pdf", cookie=cookie)[0], 404)
        self.assertEqual(self.req("/sheet/../x.pdf", cookie=cookie)[0], 404)
        # shared: the online version, for everyone with the link, without the solutions
        token = json.loads(self.req(f"/api/sheets/{sid}", j({"action": "share"}), "application/json", cookie)[2])["token"]
        self.assertRegex(token, r"^[A-Za-z0-9_-]{32}$")
        self.assertNotIn(token, self.req("/api/sheets", cookie=cookie)[2].decode())  # not in the list
        st, headers, page_ = self.req(f"/sheet/s/{token}")
        self.assertEqual(st, 200)
        page_ = page_.decode()
        self.assertIn("<title>Kräfte 3</title>", page_)
        self.assertIn("/katex/katex.min.js", page_)
        self.assertIn("font-src 'self'", headers["Content-Security-Policy"])
        self.assertIn("Electrostatics", page_)  # the section of the one in no objective: its topic
        for k in new:
            folder = next(ROOT.glob(f"texercises-drafts*/exercises/{extra[k][0] if k in extra else k}"))
            r = P.render(folder)
            self.assertIn(r["text"], page_)
            self.assertNotIn(r["solution"], page_)
            self.assertIn(escape(extra[k][1]["title"] if k in extra else json.loads((folder / "exercise.json").read_text())["title"]), page_)
        self.assertNotIn("tx-sol", page_)
        self.assertNotIn("\\underline{\\underline", page_)  # the results of the solutions
        self.assertIn("Exercises Kräfte 3", page_)  # the footer, as on the PDF
        self.assertEqual(self.req("/sheet/s/" + "x" * 32)[0], 404)
        self.assertEqual(self.req("/sheet/s/../../exercise-sheets.json")[0], 404)
        # a new link: the old one stops working; unshared: none
        token2 = json.loads(self.req(f"/api/sheets/{sid}", j({"action": "share"}), "application/json", cookie)[2])["token"]
        self.assertEqual((self.req(f"/sheet/s/{token}")[0], self.req(f"/sheet/s/{token2}")[0]), (404, 200))
        self.req(f"/api/sheets/{sid}", j({"action": "unshare"}), "application/json", cookie)
        self.assertEqual(self.req(f"/sheet/s/{token2}")[0], 404)
        # duplicate, delete
        st, _, body = self.req(f"/api/sheets/{sid}", j({"action": "duplicate"}), "application/json", cookie)
        copy = json.loads(body)["id"]
        listed = json.loads(self.req("/api/sheets", cookie=cookie)[2])["sheets"]
        self.assertEqual(sorted(x["id"] for x in listed), sorted([sid, copy]))
        self.assertEqual(next(x for x in listed if x["id"] == copy)["title"], "Kräfte 3 (copy)")
        self.assertEqual(self.req(f"/api/sheets/{sid}", j({"action": "delete"}), "application/json")[0], 403)
        self.assertEqual(self.req(f"/api/sheets/{sid}", j({"action": "delete"}), "application/json", cookie)[0], 200)
        self.assertEqual(self.req(f"/api/sheets/{sid}", cookie=cookie)[0], 404)
        self.assertEqual(self.req(f"/api/sheets/{sid}", j({"action": "delete"}), "application/json", cookie)[0], 404)
        self.assertEqual([x["id"] for x in json.loads(self.req("/api/sheets", cookie=cookie)[2])["sheets"]], [copy])
        # the panel has the tab and loads KaTeX
        st, headers, body = self.req("/", cookie=cookie)
        self.assertIn(b'href="#sheets"', body)
        self.assertIn(b'id="view-sheets"', body)
        self.assertIn(b"/katex/katex.min.js", body)
        self.assertEqual(self.req("/static/sheets.js")[0], 200)
        self.assertEqual(self.req("/static/online.js")[0], 200)

    def test_old_sheet(self):
        # a sheet saved before the topics (modules and objectives only) opens, suggests and is shared as before
        (Path(self.dir.name) / "objectives.json").write_text((ROOT / "hub" / "objectives.json").read_text())
        pool = S.load_pool()
        drafts = [k for k in pool["coulomb"]["exercises"] if k.startswith("coulomb-")]
        j = lambda o: json.dumps(o).encode()
        cookie = self.login()[1]["Set-Cookie"].split(";")[0]
        self.assertEqual(self.req("/api/texercises", self.drafts_zip(*drafts), "application/zip", cookie)[0], 200)
        old = {"title": "Old", "lang": "en", "modules": [{"id": "coulomb", "objectives": ["vector"]}], "exercises": drafts[:3],
               "created": 1, "updated": 1, "token": "o" * 32}
        H.write_config(Path(self.dir.name) / "data" / "exercise-sheets.json", {"sheets": {"0123456789ab": old}}, 0o600)
        st, _, body = self.req("/api/sheets/0123456789ab", cookie=cookie)
        self.assertEqual(st, 200)
        full = json.loads(body)
        topics = []
        for k in drafts[:3]:
            topics += [t for t in S.exercise_meta(next(ROOT.glob(f"texercises-drafts*/exercises/{k}")))["topics"] if t not in topics]
        self.assertEqual(sorted(full["topics"]), sorted(topics))
        self.assertEqual((full["modules"], full["exercises"], full["loose"], full["balance"]), (old["modules"], drafts[:3], False, H.SHEET_BALANCE))
        self.assertIn(("coulomb", "vector"), {(m["app"], o["id"]) for m in full["plan"]["objectives"] for o in m["objectives"]})
        # its online version and a new suggestion, then saved in the new form
        self.assertEqual(self.req("/sheet/s/" + "o" * 32)[0], 200)
        plan = json.loads(self.req("/api/plan", j({"sheet": full, "suggest": True, "count": 2}), "application/json", cookie)[2])
        self.assertTrue(set(plan["exercises"]) <= set(pool["coulomb"]["objectives"]["vector"]))
        self.assertEqual(self.req("/api/sheets/0123456789ab", j({"action": "save", "sheet": full}), "application/json", cookie)[0], 200)
        saved = json.loads((Path(self.dir.name) / "data" / "exercise-sheets.json").read_text())["sheets"]["0123456789ab"]
        self.assertEqual((saved["topics"], saved["balance"], saved["token"], saved["created"]), (full["topics"], H.SHEET_BALANCE, "o" * 32, 1))

    def test_sheet_images_and_figures(self):
        pool = S.load_pool()
        key = next(k for k in pool["coulomb"]["exercises"] if k.startswith("coulomb-"))
        png = b"\x89PNG\r\n\x1a\n" + b"\0" * 40
        j = lambda o: json.dumps(o).encode()
        # an export whose exercise uses a gallery image
        buf = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(self.drafts_zip(key))) as src, zipfile.ZipFile(buf, "w") as z:
            for n in src.namelist():
                data = src.read(n)
                z.writestr(n, data + b"\n\\includegraphics[width=4cm]{#image_path:coil-1#}\n" if n.endswith("/text.tex") else data)
        for path in ("/api/images?keys=" + key, "/sheet/img/coil-1.png"):
            self.assertIn(self.req(path)[0], (403, 404), path)
        self.assertEqual(self.req("/api/texercises?image=coil-1", png, "application/octet-stream")[0], 403)
        self.assertEqual(self.req("/api/images/fetch", j({"name": "coil-1"}), "application/json")[0], 403)
        cookie = self.login()[1]["Set-Cookie"].split(";")[0]
        self.assertEqual(self.req("/api/texercises", buf.getvalue(), "application/zip", cookie)[0], 200)
        title = json.loads(next(ROOT.glob(f"texercises-drafts*/exercises/{key}")).joinpath("exercise.json").read_text())["title"]
        stem = S.image_stem(title, key)
        # a missing image is fetched from TeXercises by itself, in the background; one it does not give
        # is not asked for again at once
        mod = H.sheets_module()
        with mock.patch.object(mod, "fetch_image", return_value=(False, "TeXercises asks for a login")) as fetch:
            listed = json.loads(self.req("/api/images?keys=" + key, cookie=cookie)[2])["images"]
            for _ in range(100):
                if not self.admin.fetching:
                    break
                time.sleep(0.02)
            fetch.assert_called_once_with(self.admin.sheet_images, "coil-1", stem)
            def wait():
                for _ in range(100):
                    if not self.admin.fetching:
                        break
                    time.sleep(0.02)
            again = json.loads(self.req("/api/images?keys=" + key, cookie=cookie)[2])["images"]
            self.assertEqual((again[0]["fetching"], again[0]["error"], again[0]["refused"]), (False, "TeXercises asks for a login", False))
            self.assertEqual(again[0]["keys"], [key])
            self.assertEqual(fetch.call_count, 1)
            # after three refusals: not asked for by itself any more, the exercise marked; kept over a restart
            for tries in (2, 3, 3):
                self.admin.fetch_failed["coil-1"]["last"] = 0
                self.req("/api/images?keys=" + key, cookie=cookie)
                wait()
                self.assertEqual(fetch.call_count, tries)
            again = json.loads(self.req("/api/images?keys=" + key, cookie=cookie)[2])["images"]
            self.assertTrue(again[0]["refused"])
            self.assertEqual(json.loads((self.admin.sheet_images / H.FETCH_FAILED).read_text())["coil-1"]["tries"], 3)
            self.assertEqual(self.admin.read_fetch_failed()["coil-1"]["tries"], 3)
            # clicking Fetch still asks
            self.req("/api/images/fetch", j({"name": "coil-1", "keys": [key]}), "application/json", cookie)
            self.assertEqual(fetch.call_count, 4)
        self.assertEqual([(x["name"], x["have"]) for x in listed], [("coil-1", False)])
        self.assertEqual(listed[0]["file"], stem)
        self.assertEqual(listed[0]["gallery"], "https://texercises.com/gallery/image/file/coil-1/")
        # uploaded: listed, served to the panel, in the preview and the online version
        self.assertEqual(self.req(f"/api/texercises?image=notes.txt&keys={key}", b"hello", "application/octet-stream", cookie)[0], 400)
        self.assertEqual(self.req("/api/texercises?image=coil-1.png", png, "application/octet-stream", cookie)[0], 400)  # no exercise
        st, _, body = self.req(f"/api/texercises?image=photo.png&keys={key}&gallery=coil-1", png, "application/octet-stream", cookie)
        self.assertEqual((st, json.loads(body)), (200, {"kept": [stem + ".png"], "skipped": []}))
        self.assertTrue(json.loads(self.req("/api/images?keys=" + key, cookie=cookie)[2])["images"][0]["have"])
        self.assertNotIn("coil-1", self.admin.fetch_failed)  # uploaded: the refusals are forgotten
        self.assertEqual(json.loads(self.req("/api/images?keys=" + key, cookie=cookie)[2])["images"][0]["file"], stem + ".png")
        st, headers, body = self.req(f"/sheet/img/{stem}.png", cookie=cookie)
        self.assertEqual((st, headers["Content-Type"], body), (200, "image/png", png))
        self.assertIn("sandbox", headers["Content-Security-Policy"])
        self.assertEqual(self.req(f"/sheet/img/{stem}.png")[0], 404)  # not without the login
        self.assertEqual(self.req("/sheet/img/..%2Fexercise-sheets.json", cookie=cookie)[0], 404)
        self.assertEqual(self.req("/sheet/img/index.json", cookie=cookie)[0], 404)
        self.assertEqual(self.req("/sheet/img/coil-1", cookie=cookie)[0], 404)  # the file's own name only
        prev = json.loads(self.req("/api/preview?keys=" + key, cookie=cookie)[2])["exercises"][key]
        self.assertIn(f'src="/admin/sheet/img/{stem}.png"', prev["text"])
        st, _, body = self.req("/api/sheets/new", j({"sheet": {"title": "Bilder", "lang": "de", "modules": [{"id": "coulomb"}], "exercises": [key]}}),
                               "application/json", cookie)
        sid = json.loads(body)["id"]
        token = json.loads(self.req(f"/api/sheets/{sid}", j({"action": "share"}), "application/json", cookie)[2])["token"]
        page_ = self.req(f"/sheet/s/{token}")[2].decode()
        self.assertIn(f'src="/admin/sheet/s/{token}/img/{stem}.png"', page_)
        self.assertEqual(self.req(f"/sheet/s/{token}/img/{stem}.png")[2], png)
        self.assertEqual(self.req("/sheet/s/" + "x" * 32 + f"/img/{stem}.png")[0], 404)
        # one exercise per screen: numbered, with the pager (online.js) and the footer as on the PDF
        self.assertIn('<article class="exercise tx" id="a1" data-n="1">', page_)
        self.assertIn('<p class="module">', page_)
        self.assertIn("Übungen Bilder", page_)
        self.assertIn("MNG Rämibühl · ByS · ", page_)
        self.assertIn("/admin/static/online.css", page_)
        # fetched from TeXercises (here: refused)
        with mock.patch.object(S.urllib.request, "urlopen", side_effect=urllib.error.URLError("no network")):
            got = json.loads(self.req("/api/images/fetch", j({"name": "coil-1", "keys": [key]}), "application/json", cookie)[2])
        self.assertFalse(got["ok"])
        self.assertIn("did not answer", got["error"])
        self.assertIn("no exercise", json.loads(self.req("/api/images/fetch", j({"name": "coil-9", "keys": [key]}), "application/json", cookie)[2])["error"])
        # drawn figures are public by their hash; fonts only those of the sheets
        figs = Path(self.dir.name) / "data" / "sheet-figures"
        figs.mkdir(parents=True)
        (figs / ("b" * 32 + ".svg")).write_text("<svg xmlns='http://www.w3.org/2000/svg'/>")
        st, headers, _ = self.req(f"/sheet/fig/{'b' * 32}.svg")
        self.assertEqual((st, headers["Content-Type"]), (200, "image/svg+xml"))
        self.assertIn("sandbox", headers["Content-Security-Policy"])
        self.assertEqual(self.req(f"/sheet/fig/{'c' * 32}.svg")[0], 404)
        self.assertEqual(self.req("/sheet/fig/../exercise-sheets.json")[0], 404)
        self.assertEqual(self.req("/static/fonts/..%2F..%2Fetc%2Fpasswd")[0], 404)
        self.assertEqual(self.req("/static/fonts/hubadmin.py")[0], 404)

    def cookie_of(self, user, password):
        st, headers, _ = self.req("/login", f"user={user}&password={password}".encode(), "application/x-www-form-urlencoded")
        self.assertEqual(st, 303, user)
        return headers["Set-Cookie"].split(";")[0]

    def test_texercises_review_gone(self):
        """The TeXercises review page (/texercises/) is gone: the service no longer answers there (nginx
        and the dev server send its old addresses to the admin panel), and its module is no more."""
        boss = self.cookie_of("samuel.byland", "teacher pw")
        for path in ("/texercises/", "/texercises/api/bundles", "/texercises/static/review.js"):
            self.assertEqual(self.req(path, cookie=boss)[0], 404, path)
        self.assertEqual(self.req("/texercises/api/upload?name=x.zip", b"x", "application/zip", boss)[0], 404)
        self.assertFalse((ROOT / "hub-admin" / "sheets" / "review.py").exists())
        conf = (ROOT / "deploy" / "nginx" / "learningphysics.conf").read_text()
        self.assertIn("location = /texercises { return 301 /admin/; }", conf)
        self.assertIn("location /texercises/ { return 301 /admin/; }", conf)
        self.assertNotIn("8040/texercises", conf)

    def audit(self, body, cookie, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        st, _, out = self.req("/api/exercise-audit", data, ctype, cookie)
        return st, json.loads(out or b"{}")

    def test_exercise_audit(self):
        """The exercises' review in the Sheets tab: the superuser alone reads and uploads it (nobody
        else, logged in or not); a report is checked, cleaned and replaces the one stored, which is
        not under a served name."""
        boss = self.cookie_of("samuel.byland", "teacher pw")
        pw = self.teachers({"action": "create", "id": "abc", "user": "anna"}, boss)[1]["password"]
        anna = self.cookie_of("anna", pw)
        self.assertIn(b'id="sheets-audit"', self.req("/", cookie=boss)[2])  # its section, in the Sheets tab
        self.assertNotIn(b'id="sheets-audit"', self.req("/", cookie=anna)[2])
        self.assertEqual(self.req("/api/exercise-audit")[0], 403)
        self.assertEqual(self.req("/api/exercise-audit", cookie=anna)[0], 403)
        st, _, body = self.req("/api/exercise-audit", cookie=boss)
        got = json.loads(body)
        self.assertEqual((st, {k: got[k] for k in ("report", "feedback", "topics", "images")}),
                         (200, {"report": None, "feedback": {}, "topics": {"areas": [], "of": {}}, "images": {}}))  # none yet
        report = {"generated": "2026-10-15", "source": "review of the export", "reviewed": 844, "exercises": [
            {"id": 12345, "key": "e12345-slug", "title": "Ein <b>Titel</b>", "lang": "GER", "url": "/exercise/slug/",
             "collections": ["Kinematik 1", 7, "", "Kinematik 1", "Dynamik\n2", None, "x" * 300] + [f"c{i}" for i in range(60)], "issues": [
                {"severity": "error", "category": "Physics", "where": "solution", "issue": "v = s/t\r\nnot s*t\x07", "fix": "use $v<c$"},
                {"severity": "doubt", "category": "language", "where": "text", "issue": "Komma?"}]},
            {"id": 7, "key": "e7-fine", "title": "Fine", "lang": "ENG", "url": "javascript:alert(1)", "issues": []},
            {"key": "draft-x", "title": "Draft", "lang": "FR", "url": "https://evil.example/", "issues": [{"severity": "warning", "category": "latex", "where": "short", "issue": "x", "fix": ""}]}]}
        self.assertEqual(self.audit(report, anna)[0], 403)
        self.assertEqual(self.audit(report, None)[0], 403)
        self.assertFalse(self.admin.audit_file.exists())
        for bad, why in [({"exercises": "x"}, "exercises"), ([], "exercises"),
                         ({"exercises": [{"title": "no id"}]}, "neither"),
                         ({"exercises": [{"id": 1, "issues": [{"severity": "fatal", "issue": "x"}]}]}, "severity"),
                         ({"exercises": [{"id": 1, "issues": [{"severity": "error", "issue": " "}]}]}, "without a text")]:
            st, d = self.audit(bad, boss)
            self.assertEqual(st, 400, bad)
            self.assertIn(why, d["error"], bad)
        self.assertEqual(self.audit(b"{not json", boss)[0], 400)
        self.assertEqual(self.audit(report, boss, "text/plain")[0], 415)
        with mock.patch.object(H, "MAX_AUDIT", 100):
            self.assertEqual(self.audit(report, boss)[0], 413)
        st, d = self.audit(report, boss)
        self.assertEqual((st, d), (200, {"reviewed": 844, "exercises": 2, "issues": 3, "error": 1, "warning": 1, "doubt": 1}))
        got = json.loads(self.req("/api/exercise-audit", cookie=boss)[2])["report"]
        self.assertEqual((got["generated"], got["source"], got["reviewed"]), ("2026-10-15", "review of the export", 844))
        first, second = got["exercises"]
        self.assertEqual((first["id"], first["title"], first["lang"], first["url"]), (12345, "Ein <b>Titel</b>", "GER", "/exercise/slug/"))  # (escaped by the page)
        self.assertEqual(first["issues"][0], {"severity": "error", "category": "physics", "where": "solution", "issue": "v = s/t\nnot s*t", "fix": "use $v<c$",
                                              "fp": H.audit_fingerprint({"severity": "error", "where": "solution", "issue": "v = s/t\nnot s*t"})})
        self.assertEqual(first["issues"][1]["fix"], "")
        self.assertEqual((second["id"], second["key"], second["lang"], second["url"]), (None, "draft-x", "", ""))
        # the collections: strings only, each once, cut, at most MAX_AUDIT_COLLECTIONS; none without them
        self.assertEqual(first["collections"][:3], ["Kinematik 1", "Dynamik 2", "x" * 200])
        self.assertEqual(len(first["collections"]), H.MAX_AUDIT_COLLECTIONS)
        self.assertEqual(second["collections"], [])  # no url but TeXercises'
        self.assertEqual(self.admin.audit_file.parent, self.config.parent)  # hub-data/, which nginx does not serve
        self.assertEqual(self.admin.audit_file.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.req("/api/exercise-audit", cookie=anna)[0], 403)
        # the area and topic (categories.json) of each exercise it knows, for the filter
        self.assertEqual(json.loads(self.req("/api/exercise-audit", cookie=boss)[2])["topics"], {"areas": [], "of": {}})  # (12345: not categorised)
        issue = [{"severity": "doubt", "issue": "?"}]
        self.audit({"exercises": [{"id": 10675, "issues": issue}, {"id": 10677, "issues": issue}, {"key": "draft-x", "issues": issue}]}, boss)
        self.assertEqual(json.loads(self.req("/api/exercise-audit", cookie=boss)[2])["topics"],
                         {"areas": [["Mechanics", ["Kinematics in 1D", "Gravitation"]]], "of": {"10675": ["Mechanics", "Kinematics in 1D"], "10677": ["Mechanics", "Gravitation"]}})
        # replaced by the next one
        self.assertEqual(self.audit({"exercises": []}, boss)[1], {"reviewed": 0, "exercises": 0, "issues": 0, "error": 0, "warning": 0, "doubt": 0})
        self.assertEqual(json.loads(self.req("/api/exercise-audit", cookie=boss)[2])["report"]["exercises"], [])

    def test_exercise_audit_feedback(self):
        """The superuser's feedback on the review: accepted fixes and a comment per exercise, the superuser
        only, checked, kept by exercise id and issue fingerprint (a regenerated report keeps it; feedback
        on issues no longer there is kept but not exported), and the export for Claude."""
        boss = self.cookie_of("samuel.byland", "teacher pw")
        pw = self.teachers({"action": "create", "id": "abc", "user": "anna"}, boss)[1]["password"]
        anna = self.cookie_of("anna", pw)
        issue = lambda sev, text, fix="do it": {"severity": sev, "category": "physics", "where": "solution", "issue": text, "fix": fix}
        report = {"generated": "2026-10-15", "source": "test", "reviewed": 3, "exercises": [
            {"id": 11, "key": "e11-a", "title": "A", "lang": "ENG", "url": "/exercise/a/", "collections": ["Optik"],
             "issues": [issue("error", "wrong sign"), issue("warning", "unit missing")]},
            {"key": "draft-b", "title": "B", "issues": [issue("doubt", "really?")]},
            {"id": 13, "key": "e13-c", "title": "C", "issues": [issue("error", "typo")]}]}
        self.assertEqual(self.audit(report, boss)[0], 200)
        got = json.loads(self.req("/api/exercise-audit", cookie=boss)[2])
        a, b, c = got["report"]["exercises"]
        self.assertEqual((a["ref"], b["ref"], got["feedback"]), ("11", "key:draft-b", {}))
        fp = [i["fp"] for i in a["issues"]]
        self.assertEqual(fp[0], H.audit_fingerprint(issue("error", "wrong sign", "another fix")))  # (the fix does not count)
        self.assertNotEqual(fp[0], fp[1])
        post = lambda body, who=boss: self.req("/api/exercise-audit/feedback", json.dumps(body).encode(), "application/json", who)
        # the superuser only
        for path in ("/api/exercise-audit/feedback", "/api/exercise-audit/export"):
            self.assertEqual(self.req(path)[0], 403, path)
            self.assertEqual(self.req(path, cookie=anna)[0], 403, path)
        self.assertEqual(post({"exercise": "11", "comment": "x"}, anna)[0], 403)
        self.assertEqual(post({"exercise": "11", "comment": "x"}, None)[0], 403)
        self.assertFalse(self.admin.audit_feedback_file.exists())
        # checked
        for bad in ({"exercise": "../x", "comment": "x"}, {"exercise": 11, "comment": "x"}, {"exercise": "11"},
                    {"exercise": "11", "accept": {"fp": "nothex", "on": True}}, {"exercise": "11", "accept": {"fp": fp[0], "on": 1}},
                    {"exercise": "11", "comment": 5}, {"exercise": "11", "comment": "x" * (H.MAX_AUDIT_COMMENT + 1)}):
            self.assertEqual(post(bad)[0], 400, bad)
        self.assertEqual(self.req("/api/exercise-audit/feedback", b"x=1", "application/x-www-form-urlencoded", boss)[0], 415)
        # kept
        st, _, body = post({"exercise": "11", "accept": {"fp": fp[0], "on": True}})
        self.assertEqual((st, json.loads(body)["accepted"]), (200, [fp[0]]))
        self.assertEqual(json.loads(post({"exercise": "11", "comment": "  Bitte auch b) prüfen\x07 "})[2])["comment"], "Bitte auch b) prüfen")
        self.assertEqual(json.loads(post({"exercise": "key:draft-b", "comment": "ok"})[2])["accepted"], [])
        post({"exercise": "13", "accept": {"fp": c["issues"][0]["fp"], "on": True}})
        post({"exercise": "13", "accept": {"fp": c["issues"][0]["fp"], "on": False}})  # undone: nothing left of it
        fb = json.loads(self.req("/api/exercise-audit/feedback", cookie=boss)[2])["feedback"]
        self.assertEqual(sorted(fb), ["11", "key:draft-b"])
        self.assertEqual((fb["11"]["comment"], fb["11"]["accepted"]), ("Bitte auch b) prüfen", [fp[0]]))
        self.assertEqual(self.admin.audit_feedback_file.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.admin.audit_feedback_file.parent, self.config.parent)
        with mock.patch.object(H, "MAX_AUDIT_FEEDBACK", 2):
            self.assertEqual(post({"exercise": "14", "comment": "one too many"})[0], 400)
        # the export: the exercises with an accepted fix or a comment
        st, headers, body = self.req("/api/exercise-audit/export", cookie=boss)
        self.assertEqual(st, 200)
        self.assertRegex(headers["Content-Disposition"], r'attachment; filename="exercise-review-feedback-\d{4}-\d{2}-\d{2}\.json"')
        out = json.loads(body)
        self.assertEqual((out["generated"], out["source"]), ("2026-10-15", "test"))
        self.assertEqual([e["key"] for e in out["exercises"]], ["e11-a", "draft-b"])
        first = out["exercises"][0]
        self.assertEqual((first["id"], first["url"], first["collections"], first["comment"]), (11, "https://texercises.com/exercise/a/", ["Optik"], "Bitte auch b) prüfen"))
        self.assertEqual(first["accepted"], [issue("error", "wrong sign")])
        self.assertEqual(first["not_accepted"], [issue("warning", "unit missing")])
        # a regenerated report: the same issue (another fix) is still accepted, a gone one is kept but not exported
        report["exercises"][0]["issues"] = [issue("error", "wrong sign", "a better fix"), issue("doubt", "new one")]
        report["exercises"][1]["issues"] = [issue("doubt", "something else")]
        self.assertEqual(self.audit(report, boss)[0], 200)
        out = json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])
        first = out["exercises"][0]
        self.assertEqual(first["accepted"], [issue("error", "wrong sign", "a better fix")])
        self.assertEqual([i["issue"] for i in first["not_accepted"]], ["new one"])
        post({"exercise": "11", "accept": {"fp": fp[1], "on": True}})  # (an issue no longer in the report)
        self.assertEqual(len(json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])["exercises"][0]["accepted"]), 1)
        self.assertIn(fp[1], json.loads(self.req("/api/exercise-audit/feedback", cookie=boss)[2])["feedback"]["11"]["accepted"])
        # an exercise no longer in the report: kept, not exported
        report["exercises"] = report["exercises"][2:]
        self.audit(report, boss)
        self.assertEqual(json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])["exercises"], [])
        self.assertIn("11", json.loads(self.req("/api/exercise-audit/feedback", cookie=boss)[2])["feedback"])

    def test_exercise_audit_clean(self):
        """The exercises reviewed without an issue: the report's reviewed_ids (kept: positive ints, each
        once) in the uploaded export and not among its exercises, listed as "clean" with their images and
        topics; their feedback is kept and exported like the others'; none without reviewed_ids."""
        a, b = [k for k in S.load_pool()["coulomb"]["exercises"] if k.startswith("coulomb-")][:2]
        boss = self.cookie_of("samuel.byland", "teacher pw")
        export = self.drafts_zip(extra={a: (a, {"id": 4242, "title": "Clean one", "language": "GER"}), b: (b, {"id": 4343})})
        self.assertEqual(self.req("/api/texercises", export, "application/zip", boss)[0], 200)
        issue = [{"severity": "doubt", "issue": "?"}]
        self.assertEqual(self.audit({"reviewed": 2, "exercises": [{"id": 4343, "issues": issue}]}, boss)[0], 200)
        self.assertEqual(json.loads(self.req("/api/exercise-audit", cookie=boss)[2])["clean"], [])  # (no reviewed_ids)
        st, d = self.audit({"reviewed": 2, "reviewed_ids": [4343, 4242, 4242, 9999, -1, True, "7"], "exercises": [{"id": 4343, "issues": issue}]}, boss)
        self.assertEqual((st, d["reviewed"]), (200, 3))
        got = json.loads(self.req("/api/exercise-audit", cookie=boss)[2])
        self.assertEqual(got["report"]["reviewed_ids"], [4242, 4343, 9999])
        self.assertEqual(got["clean"], [{"id": 4242, "key": a, "title": "Clean one", "lang": "GER", "url": f"/exercise/{a}/",
                                         "collections": [], "issues": [], "ref": "4242"}])
        self.assertEqual([e["id"] for e in got["report"]["exercises"]], [4343])
        # its feedback: kept, and exported with the exercise
        post = lambda path, body: self.req(path, json.dumps(body).encode(), "application/json", boss)
        self.assertEqual(post("/api/exercise-audit/feedback", {"exercise": "4242", "comment": "fine"})[0], 200)
        out = json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])["exercises"]
        self.assertEqual([(e["id"], e["comment"], e["accepted"], e["not_accepted"]) for e in out], [(4242, "fine", [], [])])
        self.assertEqual(self.admin.audit_exercise("4242")[1].name, a)  # (its TikZ editor finds it)

    def test_exercise_audit_tikz(self):
        """An image of a reviewed exercise replaced by TikZ: the exercise's images listed (by key, else by
        id), the figure drawn (the renderer mocked: drawn, pending, LaTeX's error), Claude's draft (a fake
        API, in the background; the image and the exercise sent), saved, checked, removed and exported, the
        superuser only; without the package or key, said why."""
        key = next(k for k in S.load_pool()["coulomb"]["exercises"] if k.startswith("coulomb-"))
        png = b"\x89PNG\r\n\x1a\n" + b"\0" * 40
        buf = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(self.drafts_zip(extra={key: (key, {"id": 4242})}))) as src, zipfile.ZipFile(buf, "w") as z:
            for n in src.namelist():
                data = src.read(n)
                z.writestr(n, data + b"\n\\includegraphics[width=4cm]{#image_path:coil-1#}\n" if n.endswith("/text.tex") else data)
        boss = self.cookie_of("samuel.byland", "teacher pw")
        pw = self.teachers({"action": "create", "id": "abc", "user": "anna"}, boss)[1]["password"]
        anna = self.cookie_of("anna", pw)
        self.assertEqual(self.req("/api/texercises", buf.getvalue(), "application/zip", boss)[0], 200)
        issue = [{"severity": "warning", "category": "figure", "where": "text", "issue": "the image is blurred"}]
        self.assertEqual(self.audit({"exercises": [{"id": 4242, "key": "renamed-on-texercises", "title": "H", "issues": issue},
                                                   {"key": "elsewhere", "title": "X", "issues": issue}]}, boss)[0], 200)
        got = json.loads(self.req("/api/exercise-audit", cookie=boss)[2])
        self.assertEqual(got["images"], {"4242": [{"name": "coil-1", "url": None, "pdf": False, "key": "coulomb-01-hydrogen-atom"}]})  # (found by its id; not uploaded yet)
        self.assertIn("coil-1", self.admin.image_uses(["coulomb-01-hydrogen-atom"]))  # (the key fetches it: /api/images/fetch)
        self.assertIsInstance(got["claude"], str)
        self.assertIsInstance(got["figures"], bool)
        self.assertEqual(self.req(f"/api/texercises?image=coil.png&keys={key}&gallery=coil-1", png, "application/octet-stream", boss)[0], 200)
        url = json.loads(self.req("/api/exercise-audit", cookie=boss)[2])["images"]["4242"][0]["url"]
        self.assertRegex(url, r"^/admin/sheet/img/.+\.png$")
        self.assertEqual(self.req(url[len("/admin"):], cookie=boss)[2], png)
        post = lambda path, body, who=boss: self.req(path, json.dumps(body).encode(), "application/json", who)
        fig = "\\begin{tikzpicture}\n\\draw (0,0) circle (1) node {\\rHO};\n\\end{tikzpicture}"
        # the superuser only
        for path, body in (("/api/exercise-audit/tikz/preview", {"exercise": "4242", "code": fig}),
                           ("/api/exercise-audit/tikz/draft", {"exercise": "4242", "image": "coil-1"}),
                           ("/api/exercise-audit/feedback", {"exercise": "4242", "tikz": {"image": "coil-1", "code": fig}})):
            for who in (None, anna):
                self.assertEqual(post(path, body, who)[0], 403, path)
        for who in (None, anna):
            self.assertEqual(self.req("/api/exercise-audit/tikz/draft?exercise=4242&image=coil-1", cookie=who)[0], 403)
        # the preview: drawn with the exercise's solver part and language (the renderer mocked)
        figs = H.sheets_module("figures")
        asked = []
        def figure(cache, preamble, lang, source):
            asked.append((preamble, lang, source))
            return state
        with mock.patch.object(figs, "available", return_value=True), mock.patch.object(figs, "figure", side_effect=figure), \
                mock.patch.object(figs, "failure", return_value="Undefined control sequence.\nline 2 of the figure: \\rHO"):
            state = {"svg": "a" * 32 + ".svg", "width": 80.0, "height": 40.0}
            st, _, body = post("/api/exercise-audit/tikz/preview", {"exercise": "4242", "code": fig})
            self.assertEqual((st, json.loads(body)), (200, {"url": f"/admin/sheet/fig/{'a' * 32}.svg", "width": 80.0, "height": 40.0}))
            self.assertIn("\\NewQty{rH}{5.3e-11}[\\meter]", asked[0][0])
            self.assertEqual(asked[0][1:], ("en", fig))
            state = {"pending": True}
            self.assertEqual(json.loads(post("/api/exercise-audit/tikz/preview", {"exercise": "4242", "code": fig})[2]), {"pending": True})
            state = {}
            self.assertEqual(json.loads(post("/api/exercise-audit/tikz/preview", {"exercise": "4242", "code": fig})[2]),
                             {"error": "Undefined control sequence.\nline 2 of the figure: \\rHO"})
            for bad in ({"exercise": "4242", "code": "\\draw;"}, {"exercise": "999", "code": fig}, {"exercise": "../x", "code": fig},
                        {"exercise": "4242", "code": "\\begin{tikzpicture}\\directlua{x}\\end{tikzpicture}"}):
                self.assertEqual(post("/api/exercise-audit/tikz/preview", bad)[0], 400, bad)
            self.assertEqual(len(asked), 3)
            # an exercise not in the export: drawn without a solver part
            asked.clear()
            state = {"pending": True}
            post("/api/exercise-audit/tikz/preview", {"exercise": "key:elsewhere", "code": fig})
            self.assertEqual(asked, [("", "en", fig)])
        with mock.patch.object(figs, "available", return_value=False):
            self.assertIn("cannot draw", json.loads(post("/api/exercise-audit/tikz/preview", {"exercise": "4242", "code": fig})[2])["error"])
        # Claude's draft: in the background, asked for until it is there
        cz = self.admin.categoriser
        sent, gate = [], threading.Event()
        def call(kwargs):
            sent.append(kwargs)
            gate.wait(5)
            return FakeAPI.response(text=json.dumps({"code": fig, "notes": "the radius is a guess"}))
        poll = lambda: json.loads(self.req("/api/exercise-audit/tikz/draft?exercise=4242&image=coil-1", cookie=boss)[2])
        self.assertEqual(poll(), {})  # none asked for
        with mock.patch.object(cz, "connect", return_value=(call, FakeAPI, "")):
            st, _, body = post("/api/exercise-audit/tikz/draft", {"exercise": "4242", "image": "coil-1", "code": "\\begin{tikzpicture}\\end{tikzpicture}"})
            self.assertEqual((st, json.loads(body)), (200, {"pending": True}))
            self.assertEqual(json.loads(post("/api/exercise-audit/tikz/draft", {"exercise": "4242", "image": "coil-1"})[2]), {"pending": True})  # (once)
            self.assertEqual(poll(), {"pending": True})
            gate.set()
            for _ in range(100):
                d = poll()
                if not d.get("pending"):
                    break
                time.sleep(0.02)
            self.assertEqual((d["code"], d["notes"], d["model"], d["usage"]["output"]), (fig, "the radius is a guess", "claude-opus-5-5", 200))
            self.assertEqual(len(sent), 1)
            image, text = sent[0]["messages"][0]["content"]
            self.assertEqual(image["source"], {"type": "base64", "media_type": "image/png", "data": __import__("base64").b64encode(png).decode()})
            self.assertIn("#image_path:coil-1#", text["text"])
            self.assertIn("<draft>", text["text"])
            # refused: not an image of the exercise, not an exercise of the review, an error of the API
            for bad in ({"exercise": "4242", "image": "coil-2"}, {"exercise": "4242", "image": "../x"}, {"exercise": "key:elsewhere", "image": "coil-1"},
                        {"exercise": "777", "image": "coil-1"}):
                self.assertEqual(post("/api/exercise-audit/tikz/draft", bad)[0], 400, bad)
        def refusing(kwargs):
            raise FakeAPI.AuthenticationError("invalid x-api-key", 401)
        with mock.patch.object(cz, "connect", return_value=(refusing, FakeAPI, "")):
            post("/api/exercise-audit/tikz/draft", {"exercise": "4242", "image": "coil-1"})
            for _ in range(100):
                d = poll()
                if not d.get("pending"):
                    break
                time.sleep(0.02)
            self.assertIn("the API key was not accepted", d["error"])
        # without the package or the key: said why, nothing started
        with mock.patch.object(cz, "connect", return_value=(None, None, H.NO_KEY)):
            st, _, body = post("/api/exercise-audit/tikz/draft", {"exercise": "4242", "image": "coil-1"})
            self.assertEqual((st, json.loads(body)["error"]), (400, H.NO_KEY))
        with mock.patch("importlib.util.find_spec", return_value=None):
            self.assertEqual(json.loads(self.req("/api/exercise-audit", cookie=boss)[2])["claude"], H.NO_PACKAGE)
        with mock.patch.dict(sys.modules, {"anthropic": None}):
            st, _, body = post("/api/exercise-audit/tikz/draft", {"exercise": "4242", "image": "coil-1"})
            self.assertEqual((st, json.loads(body)["error"]), (400, H.NO_PACKAGE))
        # saved in the feedback, checked, exported (an exercise with only a figure too), removed
        feedback = lambda body: post("/api/exercise-audit/feedback", {"exercise": "4242", **body})
        for bad in ({"tikz": {"image": "coil-1", "code": "\\draw;"}}, {"tikz": {"image": "../x", "code": fig}}, {"tikz": "x"},
                    {"tikz": {"image": "coil-1", "code": 5}}, {"tikz": {"image": "coil-1", "code": "\\begin{tikzpicture}" + "x" * H.MAX_AUDIT_TIKZ + "\\end{tikzpicture}"}},
                    {"tikz": {"image": "coil-1", "code": fig, "use": "both"}}, {"tikz": {"image": "coil-1"}},
                    {"tikz": {"image": "coil-1", "use": "original"}}):  # (the last: no figure saved yet)
            self.assertEqual(feedback(bad)[0], 400, bad)
        st, _, body = feedback({"tikz": {"image": "coil-1", "code": fig + "\r\n"}})
        d = json.loads(body)
        self.assertEqual((st, d["comment"], d["accepted"], d["tikz"]["coil-1"]["code"]), (200, "", [], fig))
        self.assertEqual(json.loads(self.req("/api/exercise-audit/feedback", cookie=boss)[2])["feedback"]["4242"]["tikz"]["coil-1"]["code"], fig)
        out = json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])["exercises"]
        self.assertEqual([(e["id"], e["accepted"], e["comment"], e["tikz"]) for e in out], [(4242, [], "", [{"image": "coil-1", "code": fig, "use": "tikz"}])])
        # which of the two to keep: the original chosen, kept when the figure is saved again
        d = json.loads(feedback({"tikz": {"image": "coil-1", "use": "original"}})[2])
        self.assertEqual((d["tikz"]["coil-1"]["use"], d["tikz"]["coil-1"]["code"]), ("original", fig))
        self.assertEqual(json.loads(feedback({"tikz": {"image": "coil-1", "code": fig}})[2])["tikz"]["coil-1"]["use"], "original")
        self.assertEqual(json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])["exercises"][0]["tikz"][0]["use"], "original")
        self.assertEqual(json.loads(feedback({"tikz": {"image": "coil-1", "use": "tikz"}})[2])["tikz"]["coil-1"]["use"], "tikz")
        with mock.patch.object(H, "MAX_AUDIT_TIKZ_IMAGES", 1):
            self.assertEqual(feedback({"tikz": {"image": "coil-2", "code": fig}})[0], 400)
        feedback({"comment": "see the figure"})
        self.assertEqual(json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])["exercises"][0]["tikz"][0]["image"], "coil-1")
        self.assertEqual(json.loads(feedback({"tikz": {"image": "coil-1", "code": ""}})[2])["tikz"], {})
        out = json.loads(self.req("/api/exercise-audit/export", cookie=boss)[2])["exercises"]
        self.assertEqual([(e["comment"], e["tikz"]) for e in out], [("see the figure", [])])
        feedback({"comment": ""})
        self.assertEqual(json.loads(self.req("/api/exercise-audit/feedback", cookie=boss)[2])["feedback"], {})  # nothing left of it

    def test_new_exercises_endpoints(self):
        """The new exercises (categories-extra): the superuser alone reads them and asks for them to be
        categorised or labels one; the panel shows its section to them only."""
        boss = self.cookie_of("samuel.byland", "teacher pw")
        pw = self.teachers({"action": "create", "id": "abc", "user": "anna"}, boss)[1]["password"]
        anna = self.cookie_of("anna", pw)
        self.assertIn(b'id="sheets-new"', self.req("/", cookie=boss)[2])
        self.assertNotIn(b'id="sheets-new"', self.req("/", cookie=anna)[2])
        for who in (None, anna):
            self.assertEqual(self.req("/api/categories-extra", cookie=who)[0], 403)
            for path in ("/api/categories-extra/run", "/api/categories-extra/label"):
                self.assertEqual(self.req(path, b"{}", "application/json", who)[0], 403)
        st, _, body = self.req("/api/categories-extra", cookie=boss)
        got = json.loads(body)
        self.assertEqual((st, got["exercises"], got["status"]["total"]), (200, [], 0))
        self.assertEqual(len([i for _, ts in got["tree"] for _, subs in ts for i in subs]), 133)  # (the repository's tree)
        self.assertEqual(got["kinds"], list(S.TASKS))
        self.assertEqual(self.req("/api/categories-extra/run", b"x", "text/plain", boss)[0], 415)
        st, _, body = self.req("/api/categories-extra/label", json.dumps({"id": "5", "sub": "nope", "kind": "calculate"}).encode(), "application/json", boss)
        self.assertEqual(st, 400)
        st, _, body = self.req("/api/categories-extra/label", json.dumps({"id": "5", "sub": "kin.uniform", "kind": "calculate"}).encode(), "application/json", boss)
        self.assertEqual((st, json.loads(body)["error"]), (400, "not a new exercise"))
        st, _, body = self.req("/api/categories-extra/run", b"{}", "application/json", boss)
        self.assertEqual(st, 200)
        self.assertIn("running", json.loads(body))
        self.assertFalse(self.admin.categoriser.file.exists() and json.loads(self.admin.categoriser.file.read_text())["exercises"])

    def teachers(self, body, cookie):
        st, _, data = self.req("/api/teachers", json.dumps(body).encode(), "application/json", cookie)
        return st, json.loads(data)

    def test_teachers(self):
        boss = self.cookie_of("samuel.byland", "teacher pw")
        self.assertEqual(boss.split(".")[0], "hub_admin=bys")
        self.assertEqual(self.cookie_of("bys", "teacher pw").split(".")[0], "hub_admin=bys")  # the identifier works too
        self.assertEqual(self.cookie_of("", "teacher pw").split(".")[0], "hub_admin=bys")
        # the superuser's sets, saved before there were teachers (names without one)
        H.write_config(self.sets, {"sets": {"3a": {"title": "3a", "apps": [{"id": "photons", "modes": ["check"]}]}}})
        self.admin.migrate_sets()
        self.assertEqual(json.loads(self.sets.read_text()),
                         {"default": "bys", "sets": {"bys/3a": {"title": "3a", "apps": [{"id": "photons", "modes": ["check"]}]}}})
        # a new teacher: a password shown once
        self.assertEqual(self.req("/api/teachers")[0], 403)
        st, d = self.teachers({"action": "create", "id": "abc", "user": " Anna.B ", "first": " Anna <B> ", "last": "Beispiel", "school": "KS Musterstadt"}, boss)
        self.assertEqual(st, 200)
        pw = d["password"]
        self.assertEqual(len(pw), 12)
        self.assertEqual(d["teachers"], [{"id": "abc", "user": "anna.b", "first": "Anna B", "last": "Beispiel", "school": "KS Musterstadt",
                                          "created": d["teachers"][0]["created"], "sets": 0}])
        self.assertNotIn(pw, self.admin.teachers_file.read_text())  # only its hash
        self.assertEqual(self.admin.teachers_file.stat().st_mode & 0o777, 0o600)
        for bad, why in [("abc", "already"), ("bys", "already"), ("ab", "three"), ("ABC", "three"), ("abcd", "three"),
                         ("coe", "taken"), ("api", "taken"), (None, "three")]:
            st, d = self.teachers({"action": "create", "id": bad, "user": "someone"}, boss)
            self.assertEqual(st, 400, bad)
            self.assertIn(why, d["error"], bad)
        for user, why in [("anna.b", "taken"), ("samuel.byland", "taken"), ("bys", "taken"), ("abc", "taken"), ("a b", "user name has"), (".x", "user name has")]:
            st, d = self.teachers({"action": "create", "id": "xyz", "user": user}, boss)
            self.assertEqual(st, 400, user)
            self.assertIn(why, d["error"], user)
        # the teacher logs in, sees the sets and an account, not the superuser's tabs
        self.assertEqual(self.req("/login", f"user=abc&password=wrong".encode(), "application/x-www-form-urlencoded")[0], 403)
        anna = self.cookie_of("anna.b", pw)
        self.cookie_of("abc", pw)  # the identifier works too
        st, _, body = self.req("/", cookie=anna)
        self.assertIn(b'id="view-sets"', body)
        self.assertIn(b'id="view-account"', body)
        self.assertIn(b'data-teacher="abc"', body)
        self.assertIn(b"anna.b (abc)", body)
        for tab in (b'id="view-apps"', b'id="view-sheets"', b'id="view-teachers"'):
            self.assertNotIn(tab, body)
        st, _, body = self.req("/", cookie=boss)
        self.assertIn(b'id="view-teachers"', body)
        self.assertIn(b'id="view-account"', body)  # (the superuser's own too)
        # the superuser's things are not theirs
        for path in ("/api/config", "/api/teachers", "/api/sheets", "/api/preview?keys=x", "/sheet/0123456789ab.pdf"):
            self.assertEqual(self.req(path, cookie=anna)[0], 403, path)
        with mock.patch.object(self.admin, "kept_image", return_value=Path(__file__)) as kept:
            self.assertEqual(self.req("/sheet/img/x.png", cookie=anna)[0], 404)  # (an image of the sheets: not hers)
            kept.assert_not_called()
            self.assertEqual(self.req("/sheet/img/x.png", cookie=boss)[0], 200)
        for path in ("/api/config", "/api/teachers", "/api/sheets/new", "/api/plan", "/api/images/fetch"):
            self.assertEqual(self.req(path, b"{}", "application/json", anna)[0], 403, path)
        # their own sets: learningphysics.ch/abc/<name>; the superuser's stay
        self.assertEqual(json.loads(self.req("/api/sets", cookie=anna)[2])["sets"], {})
        mine = {"sets": {"3a": {"title": "Annas 3a", "apps": [{"id": "torque", "modes": ["tutor"]}]}}}
        st, _, body = self.req("/api/sets", json.dumps(mine).encode(), "application/json", anna)
        self.assertEqual(st, 200)
        self.assertEqual(json.loads(body)["teacher"], "abc")
        on_disk = json.loads(self.sets.read_text())
        self.assertEqual(list(on_disk["sets"]), ["bys/3a", "abc/3a"])
        self.assertEqual(on_disk["sets"]["abc/3a"]["title"], "Annas 3a")
        self.assertEqual(json.loads(self.req("/api/sets", cookie=boss)[2])["sets"]["3a"]["title"], "3a")
        self.assertEqual(json.loads(self.req("/api/sets", cookie=anna)[2])["sets"], mine["sets"])
        self.req("/api/sets", b'{"sets": {}}', "application/json", boss)  # the superuser's go, not hers
        self.assertEqual(list(json.loads(self.sets.read_text())["sets"]), ["abc/3a"])
        st, d = self.teachers({"action": "update", "id": "abc", "first": "Anna"}, boss)
        self.assertEqual([d["teachers"][0][k] for k in ("first", "last", "school")], ["Anna", "Beispiel", "KS Musterstadt"])
        self.assertEqual(self.teachers({"action": "update", "id": "abc", "user": "samuel.byland"}, boss)[0], 400)
        st, d = self.teachers({"action": "update", "id": "abc", "user": "anna.beispiel", "school": "Gymnasium X"}, boss)
        self.assertEqual([d["teachers"][0][k] for k in ("user", "first", "school")], ["anna.beispiel", "Anna", "Gymnasium X"])
        self.assertEqual(self.req("/login", f"user=anna.b&password={pw}".encode(), "application/x-www-form-urlencoded")[0], 403)
        self.cookie_of("anna.beispiel", pw)
        self.assertEqual(d["teachers"][0]["sets"], 1)
        # her own password: the current one needed; her session goes on with a new cookie
        pwreq = lambda body, c: self.req("/api/password", json.dumps(body).encode(), "application/json", c)
        self.assertEqual(pwreq({"current": "wrong", "new": "a new password"}, anna)[0], 400)
        self.assertEqual(pwreq({"current": pw, "new": "short"}, anna)[0], 400)
        st, headers, _ = pwreq({"current": pw, "new": "a new password"}, anna)
        self.assertEqual(st, 200)
        self.assertEqual(self.req("/api/sets", cookie=anna)[0], 403)  # the old session ended
        anna = headers["Set-Cookie"].split(";")[0]
        self.assertEqual(self.req("/api/sets", cookie=anna)[0], 200)
        self.assertEqual(self.req("/login", f"user=abc&password={pw}".encode(), "application/x-www-form-urlencoded")[0], 403)
        self.cookie_of("abc", "a new password")
        # a new password from the superuser ends her sessions
        st, d = self.teachers({"action": "reset", "id": "abc"}, boss)
        self.assertEqual(self.req("/api/sets", cookie=anna)[0], 403)
        anna = self.cookie_of("abc", d["password"])
        self.assertEqual(self.teachers({"action": "reset", "id": "zzz"}, boss)[0], 404)
        # a session cannot be moved to another teacher
        forged = anna.replace("hub_admin=abc.", "hub_admin=bys.")
        self.assertEqual(self.req("/api/sets", cookie=forged)[0], 403)
        # deleted: the account and its sets
        st, d = self.teachers({"action": "delete", "id": "abc"}, boss)
        self.assertEqual(d["teachers"], [])
        self.assertEqual(json.loads(self.sets.read_text())["sets"], {})
        self.assertEqual(self.req("/api/sets", cookie=anna)[0], 403)
        self.assertEqual(self.req("/static/accounts.js")[0], 200)

    def test_stats(self):
        boss = self.cookie_of("samuel.byland", "teacher pw")
        pw = self.teachers({"action": "create", "id": "abc", "user": "anna", "first": "Anna", "school": "KS X"}, boss)[1]["password"]
        self.teachers({"action": "create", "id": "xyz", "user": "xaver"}, boss)
        anna = self.cookie_of("anna", pw)
        self.assertEqual(self.req("/api/stats")[0], 403)
        self.assertEqual(self.req("/api/stats", cookie=anna)[0], 403)  # the superuser's only
        sets = {"sets": {"3a": {"title": "3a", "apps": [{"id": "torque", "modes": ["tutor"]}, {"id": "photons", "modes": ["check"]}]},
                         "3b": {"title": "3b", "apps": [{"id": "torque", "modes": ["check"]}]}}}
        self.assertEqual(self.req("/api/sets", json.dumps(sets).encode(), "application/json", anna)[0], 200)
        H.write_config(self.admin.sheets_file, {"sheets": {"0123456789ab": {"title": "A", "updated": 1700000000, "token": "t" * 32},
                                                           "0123456789ac": {"title": "B", "updated": 1700000500, "token": None}}})
        st, _, body = self.req("/api/stats", cookie=boss)
        self.assertEqual(st, 200)
        d = json.loads(body)
        rows = {t["id"]: t for t in d["teachers"]}
        self.assertEqual([t["id"] for t in d["teachers"]], ["bys", "abc", "xyz"])
        self.assertEqual({k: rows["abc"][k] for k in ("user", "first", "school", "sets", "apps", "sheets", "active")},
                         {"user": "anna", "first": "Anna", "school": "KS X", "sets": 2, "apps": 2, "sheets": 0, "active": True})
        self.assertGreater(rows["abc"]["seen"], 0)
        self.assertGreater(rows["abc"]["sets_saved"], 0)
        self.assertEqual((rows["xyz"]["seen"], rows["xyz"]["active"], rows["xyz"]["sets"]), (0, False, 0))  # never logged in
        self.assertEqual((rows["bys"]["sheets"], rows["bys"]["shared"], rows["bys"]["sheets_saved"], rows["bys"]["active"]), (2, 1, 1700000500, True))
        self.assertEqual(d["totals"], {"teachers": 3, "active": 2, "with_sets": 1, "sets": 2, "sheets": 2, "shared": 1})
        self.assertNotIn("hash", body.decode())
        # a visit is written at most every SEEN_EVERY seconds; the login still works after it
        before = self.admin.teachers_file.stat().st_mtime_ns
        self.req("/api/sets", cookie=anna)
        self.assertEqual(self.admin.teachers_file.stat().st_mtime_ns, before)
        self.assertEqual(self.req("/api/sets", cookie=anna)[0], 200)
        self.cookie_of("anna", pw)
        st, _, body = self.req("/", cookie=boss)
        self.assertIn(b'id="stats-table"', body)  # under Teachers
        self.assertNotIn(b'data-view="stats"', body)
        self.assertNotIn(b'id="stats-table"', self.req("/", cookie=anna)[2])

    def test_me_and_crosswords(self):
        st, headers, _ = self.req("/login", b"user=samuel.byland&password=teacher pw", "application/x-www-form-urlencoded")
        self.assertIn("Path=/;", headers["Set-Cookie"])  # the whole site: the crossword generator asks /api/me
        boss = self.cookie_of("samuel.byland", "teacher pw")
        self.assertEqual(self.req("/api/me")[0], 403)
        self.assertEqual(json.loads(self.req("/api/me", cookie=boss)[2]), {"teacher": "bys", "user": "samuel.byland", "super": True, "first": "", "last": "", "school": ""})
        pw = self.teachers({"action": "create", "id": "abc", "user": "anna", "first": "Anna", "last": "B", "school": "KS"}, boss)[1]["password"]
        anna = self.cookie_of("anna", pw)
        self.assertEqual(json.loads(self.req("/api/me", cookie=anna)[2]),
                         {"teacher": "abc", "user": "anna", "super": False, "first": "Anna", "last": "B", "school": "KS"})
        # a cookie of before (Path=/admin/) sent first, and invalid: the other counts
        self.assertEqual(self.req("/api/me", cookie="hub_admin=bys.1.x; " + anna)[0], 200)
        # a set can't take the address of one of the teacher's crosswords
        self.admin.crosswords_url = "http://crosswords.invalid/"
        with mock.patch.object(self.admin, "crossword_at", side_effect=lambda t, n: (t, n) == ("abc", "optik")) as at:
            st, _, body = self.req("/api/sets", b'{"sets": {"optik": {}}}', "application/json", anna)
            self.assertEqual(st, 400)
            self.assertIn("crosswords", json.loads(body)["error"])
            self.assertEqual(self.req("/api/sets", b'{"sets": {"optik": {}}}', "application/json", boss)[0], 200)
            self.assertEqual(self.req("/api/sets", b'{"sets": {"elektro": {}}}', "application/json", anna)[0], 200)
            at.reset_mock()
            self.req("/api/sets", b'{"sets": {"elektro": {"title": "x"}}}', "application/json", anna)
            at.assert_not_called()  # (only new names are asked about)
        self.assertFalse(self.admin.crossword_at("abc", "optik"))  # can't be asked: no
        # logging out ends both cookies
        st, headers, _ = self.req("/logout", b"", "application/x-www-form-urlencoded", anna)
        self.assertIn("Max-Age=0", headers["Set-Cookie"])

    def test_own_account(self):
        boss = self.cookie_of("samuel.byland", "teacher pw")
        pw = self.teachers({"action": "create", "id": "abc", "user": "anna", "first": "Anna"}, boss)[1]["password"]
        anna = self.cookie_of("anna", pw)
        account = lambda body, c: self.req("/api/account", json.dumps(body).encode(), "application/json", c)
        me = lambda c: json.loads(self.req("/api/me", cookie=c)[2])
        self.assertEqual(account({"first": "x"}, "")[0], 403)
        # a teacher's own details: the user name, names and school (not the identifier)
        st, _, body = account({"id": "zzz", "user": " Anna.Beispiel ", "last": "Beispiel", "school": "KS X"}, anna)
        self.assertEqual(st, 200)
        self.assertEqual(json.loads(body), {"teacher": "abc", "user": "anna.beispiel", "super": False, "first": "Anna", "last": "Beispiel", "school": "KS X"})
        self.assertEqual(me(anna)["user"], "anna.beispiel")  # (the session goes on)
        self.cookie_of("anna.beispiel", pw)
        self.assertEqual(account({"user": "samuel.byland"}, anna)[0], 400)
        # the superuser's own: kept apart from the teachers
        st, _, body = account({"user": "s.byland", "first": "Samuel", "last": "Byland", "school": "KS Y"}, boss)
        self.assertEqual(json.loads(body), {"teacher": "bys", "user": "s.byland", "super": True, "first": "Samuel", "last": "Byland", "school": "KS Y"})
        self.assertEqual([t["id"] for t in json.loads(self.req("/api/teachers", cookie=boss)[2])["teachers"]], ["abc"])
        self.assertEqual(json.loads(self.req("/api/teachers", cookie=boss)[2])["super_user"], "s.byland")
        self.assertEqual(self.req("/login", b"user=samuel.byland&password=teacher pw", "application/x-www-form-urlencoded")[0], 403)
        boss = self.cookie_of("s.byland", "teacher pw")
        self.assertIn(b"s.byland (bys)", self.req("/", cookie=boss)[2])
        self.assertEqual(account({"user": "s.byland"}, anna)[0], 400)  # taken
        self.assertEqual(self.teachers({"action": "create", "id": "xyz", "user": "s.byland"}, boss)[0], 400)
        # the superuser's own password: then the crossword app's no longer logs in here
        pwreq = lambda body, c: self.req("/api/password", json.dumps(body).encode(), "application/json", c)
        self.assertEqual(pwreq({"current": "wrong", "new": "my own password"}, boss)[0], 400)
        st, headers, _ = pwreq({"current": "teacher pw", "new": "my own password"}, boss)
        self.assertEqual(st, 200)
        self.assertEqual(self.req("/api/teachers", cookie=boss)[0], 403)  # the old session ended
        boss = headers["Set-Cookie"].split(";")[0]
        self.assertEqual(self.req("/api/teachers", cookie=boss)[0], 200)
        self.assertEqual(self.req("/login", b"user=s.byland&password=teacher pw", "application/x-www-form-urlencoded")[0], 403)
        self.cookie_of("s.byland", "my own password")
        self.cookie_of("", "my own password")
        self.assertTrue(H.verify_password("teacher pw", self.admin.password_file.read_text().strip()))  # the crossword app's: untouched
        # the teachers' changes keep the superuser's
        self.teachers({"action": "update", "id": "abc", "school": "KS Z"}, boss)
        self.assertEqual(me(boss)["school"], "KS Y")
        self.cookie_of("s.byland", "my own password")

    def test_back_to_the_game(self):
        # the crossword generator, the quiz and the game send teachers here with ?next=
        st, _, body = self.req("/?next=/crosswords/")
        self.assertIn(b'name="next" value="/crosswords/"', body)
        st, headers, _ = self.req("/login", b"user=samuel.byland&password=teacher pw&next=/crosswords/", "application/x-www-form-urlencoded")
        self.assertEqual((st, headers["Location"]), (303, "/crosswords/"))
        boss = headers["Set-Cookie"].split(";")[0]
        st, headers, _ = self.req("/?next=/electric-circuits/host", cookie=boss)
        self.assertEqual((st, headers["Location"]), (303, "/electric-circuits/host"))
        for bad in ("//evil.example/", "https://evil.example/", "/\\evil.example"):
            st, headers, _ = self.req("/login", f"user=samuel.byland&password=teacher pw&next={bad}".encode(), "application/x-www-form-urlencoded")
            self.assertEqual(headers["Location"], "/admin/", bad)
        self.assertNotIn(b'name="next"', self.req("/?next=//evil.example/")[2])

    def test_profile(self):
        self.assertEqual(H.profile({"name": "Anna Maria Beispiel"}), {"first": "Anna Maria", "last": "Beispiel", "school": ""})
        self.assertEqual(H.profile({"name": "Anna"}), {"first": "Anna", "last": "", "school": ""})
        self.assertEqual(H.profile({"first": "A", "last": "B", "name": "x y"}), {"first": "A", "last": "B", "school": ""})
        # an account written with one name: split on the next change, the name gone
        boss = self.cookie_of("samuel.byland", "teacher pw")
        H.write_config(self.admin.teachers_file, {"teachers": {"abc": {"user": "anna", "name": "Anna Beispiel", "hash": "x"}}}, 0o600)
        st, d = self.teachers({"action": "update", "id": "abc", "school": "KS"}, boss)
        self.assertEqual([d["teachers"][0][k] for k in ("first", "last", "school")], ["Anna", "Beispiel", "KS"])
        self.assertNotIn("name", json.loads(self.admin.teachers_file.read_text())["teachers"]["abc"])

    def test_rate_limit(self):
        for _ in range(H.LOGIN_ATTEMPTS):
            self.assertEqual(self.login("wrong")[0], 403)
        self.assertEqual(self.login()[0], 429)  # even the right password, for a while


if __name__ == "__main__":
    unittest.main()
