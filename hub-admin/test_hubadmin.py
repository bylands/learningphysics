"""Tests of the hub admin: run with `python3 hub-admin/test_hubadmin.py`.

Checks the reading of the hub page, the cleaning of a configuration and of sets (with learning
objectives, and those saved before there were objectives), the names a set
may have (and that no app or set clashes with a service nginx passes on), the atomic write, the password (in the crossword app's format) and sessions, and the
service end to end: login, rate limit, the API with and without a session, and that saves reach
apps.json and sets.json. The exercise sheets: what a sheet suggests (every objective covered, the
language, exercises without image, the difficulty mix) and the alternatives of an exercise, the .tex
of an ordered list of exercises (without LaTeX), the PDFs where LaTeX is missing, the upload of a
TeXercises export (only the teacher's exercises kept, nothing written outside its folder), the
preview (sheets/preview.py: the arithmetic of the solver part, numbers and units, text to HTML,
everything escaped, and every draft of this repository), and the service: a sheet created, changed,
shared, duplicated and deleted, everything only when logged in except a shared sheet's online
version, which shows no solutions; the figures (the LaTeX of an exercise's TikZ pictures, their
hash and cache) and the gallery images (uploaded, as a .zip, fetched from TeXercises, served only
to the panel and a shared sheet, never outside their folder), and both in the preview's HTML.
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
        self.assertIn("millionaire", services)
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
            pw.write_text(hash_password("new pass") + "\n")  # a new password ends the session
            self.assertFalse(a.valid_session(s))


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


class Sheets(unittest.TestCase):
    # two modules: coulomb with three objectives, photons without objectives in the pool
    POOL = {
        "coulomb": {"objectives": {"factor": ["f1", "f2", "f3", "f4", "f5"], "vector": ["v1", "v2", "f2"], "field": ["d1", "d2"]},
                    "exercises": {"f1": ex("de", 1), "f2": ex("en", 2), "f3": ex("en", 1, True), "f4": ex("en", 3), "f5": ex("en", 1),
                                  "v1": ex("en", 3), "v2": ex("en", 2), "d1": ex("en", 2), "d2": ex("de", 1)}},
        "photons": {"objectives": {"wave": []}, "exercises": {"p1": ex("en", 1), "p2": ex("en", 2), "p3": ex("en", 3)}},
    }
    ALL = {"factor", "vector", "field"}

    def have(self, *missing):
        return {k for a in self.POOL.values() for k in a["exercises"]} - set(missing)

    def mods(self, objectives=("factor", "vector", "field"), photons=True):
        return [{"id": "coulomb", "objectives": list(objectives)}] + ([{"id": "photons", "objectives": ["wave"]}] if photons else [])

    def test_targets(self):
        self.assertEqual(S.targets(self.mods(), self.POOL), [("coulomb", "factor"), ("coulomb", "vector"), ("coulomb", "field"), ("photons", None)])
        self.assertEqual(S.targets([{"id": "coulomb", "objectives": ["field", "nope"]}, {"id": "nope", "objectives": []}], self.POOL), [("coulomb", "field")])
        self.assertEqual(S.candidates(("coulomb", "vector"), self.POOL, self.have("v1")), ["v2", "f2"])
        self.assertEqual(S.covers("f2", S.targets(self.mods(), self.POOL), self.POOL), [("coulomb", "factor"), ("coulomb", "vector")])

    def test_suggest_covers_every_objective(self):
        keys = S.suggest(self.mods(), "en", self.POOL, self.have(), 4)
        self.assertEqual(len(keys), 4)
        tgts = S.targets(self.mods(), self.POOL)
        covered = {t for k in keys for t in S.covers(k, tgts, self.POOL)}
        self.assertEqual(covered, set(tgts))  # one each before any has two
        self.assertEqual(len(set(keys)), len(keys))
        # by default two per objective (here 4 objectives: 8), at most DEFAULT_MAX
        keys = S.suggest(self.mods(), "en", self.POOL, self.have())
        self.assertEqual(len(keys), 8)
        self.assertEqual(S.default_count(self.mods(), self.POOL, self.have()), 8)
        per = {t: sum(t in S.covers(k, tgts, self.POOL) for k in keys) for t in tgts}
        self.assertTrue(all(n >= 2 for n in per.values()), per)
        # by module, then from easy to hard
        apps = [S.info(self.POOL, k)[0] for k in keys]
        self.assertEqual(apps, sorted(apps, key=["coulomb", "photons"].index))
        levels = [S.level(S.info(self.POOL, k)[1]["difficulty"]) for k in keys if S.info(self.POOL, k)[0] == "coulomb"]
        self.assertEqual(levels, sorted(levels))
        # the same every time; never more than there are, nor more than asked
        self.assertEqual(keys, S.suggest(self.mods(), "en", self.POOL, self.have()))
        self.assertEqual(len(S.suggest(self.mods(), "en", self.POOL, self.have(), 99)), 12)
        self.assertEqual(S.suggest(self.mods(), "en", self.POOL, set()), [])

    def test_suggest_prefers(self):
        # the sheet's language first: one exercise of field, German sheet: d2 (de), English: d1
        one = [{"id": "coulomb", "objectives": ["field"]}]
        self.assertEqual(S.suggest(one, "de", self.POOL, self.have(), 1), ["d2"])
        self.assertEqual(S.suggest(one, "en", self.POOL, self.have(), 1), ["d1"])
        # without image first: of factor (f1 de, f2 average, f3 easy with image, f4 hard, f5 easy), English; one
        # exercise: an average one; two: an easy one too, without image (f5, not f3); easy first
        fac = [{"id": "coulomb", "objectives": ["factor"]}]
        self.assertEqual(S.suggest(fac, "en", self.POOL, self.have(), 1), ["f2"])
        self.assertEqual(S.suggest(fac, "en", self.POOL, self.have(), 2), ["f5", "f2"])
        self.assertNotIn("f3", S.suggest(fac, "en", self.POOL, self.have(), 3))
        # the difficulty mix: of 10, 3 easy, 5 average, 2 hard
        self.assertEqual(S.mix(10), {1: 3, 2: 5, 3: 2})
        self.assertEqual(sum(S.mix(7).values()), 7)
        pool = {"a": {"objectives": {"o": [f"e{d}{i}" for i in range(10) for d in (1, 2, 3)]},
                      "exercises": {f"e{d}{i}": ex("en", d) for i in range(10) for d in (1, 2, 3)}}}
        keys = S.suggest([{"id": "a", "objectives": ["o"]}], "en", pool, set(pool["a"]["exercises"]), 10)
        got = {d: sum(pool["a"]["exercises"][k]["difficulty"] == d for k in keys) for d in (1, 2, 3)}
        self.assertEqual(got, {1: 3, 2: 5, 3: 2})
        # only exercises that are there
        self.assertNotIn("d1", S.suggest(one, "en", self.POOL, self.have("d1"), 2))

    def test_alternatives(self):
        sheet = ["f2", "v1"]
        alts = S.alternatives("f2", sheet, self.mods(), "en", self.POOL, self.have())
        # of factor and vector, not on the sheet; English first, then near difficulty 2 (f5/f3 easy,
        # f4 hard, v2 average), without image first
        self.assertEqual(alts[0], "v2")
        self.assertNotIn("f2", alts)
        self.assertNotIn("v1", alts)
        self.assertEqual(alts[-1], "f1")  # German
        self.assertEqual(set(alts), {"f1", "f3", "f4", "f5", "v2"})
        self.assertLess(alts.index("f5"), alts.index("f3"))  # without image first
        self.assertEqual(len(S.alternatives("f2", sheet, self.mods(), "en", self.POOL, self.have(), 2)), 2)
        self.assertEqual(S.alternatives("p1", ["p1"], self.mods(), "en", self.POOL, self.have("p3")), ["p2"])
        # an exercise of none of the sheet's objectives: its module's
        self.assertEqual(S.alternatives("d1", ["d1"], self.mods(("factor",)), "en", self.POOL, {"d1", "d2", "f1"}), ["f1", "d2"])

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
        apps = [{"id": "coulomb", "objectives": [{"id": "factor"}, {"id": "vector"}, {"id": "field"}]}, {"id": "photons", "objectives": []}]
        out = H.normalize_sheet({"title": " Blatt <b>1</b>\n", "lang": "de", "modules": [
            {"id": "photons"}, {"id": "coulomb", "objectives": ["field", "nope", "factor"]}, {"id": "photons"}],
            "exercises": ["f2", "p1", "f2"]}, apps, self.POOL)
        self.assertEqual(out, {"title": "Blatt b1/b", "lang": "de", "modules": [{"id": "coulomb", "objectives": ["factor", "field"]},
                               {"id": "photons", "objectives": []}], "exercises": ["f2", "p1"]})  # in the apps' order
        # all objectives when none are given; English unless German
        self.assertEqual(H.normalize_sheet({"modules": [{"id": "coulomb"}], "lang": "fr"}, apps, self.POOL),
                         {"title": "", "lang": "en", "modules": [{"id": "coulomb", "objectives": ["factor", "vector", "field"]}], "exercises": []})
        for bad in ({"modules": [{"id": "../x"}]}, {"exercises": ["../../etc/passwd"]}, {"exercises": [3]},
                    {"exercises": [f"f{i}" for i in range(H.MAX_SHEET_EXERCISES + 1)]}):
            with self.assertRaises(ValueError):
                H.normalize_sheet(bad, apps, self.POOL)
        self.assertEqual(H.normalize_sheet({"exercises": ["f1", "zz"], "modules": [{"id": "x"}]}, apps, self.POOL, strict=False)["exercises"], ["f1"])


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
        self.assertEqual(self.req("/nothing")[0], 404)

    def test_sets(self):
        st, headers, _ = self.login()
        cookie = headers["Set-Cookie"].split(";")[0]
        self.assertEqual(self.req("/api/sets")[0], 403)
        st, _, body = self.req("/api/sets", cookie=cookie)
        self.assertEqual(st, 200)
        data = json.loads(body)
        self.assertEqual(data["sets"], {})
        self.assertIn({"id": "torque", "name": "Torque and Equilibrium", "modes": ["tutor", "practice", "check"]}, data["apps"])
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

    def drafts_zip(self, *keys):
        """A TeXercises export of drafts of this repository, as the teacher's."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            for k in keys:
                d = next(ROOT.glob(f"texercises-drafts*/exercises/{k}"))
                for f in d.iterdir():
                    data = f.read_bytes()
                    if f.name == "exercise.json":
                        meta = json.loads(data)
                        meta["info"] = {"creator": "by", "url": f"/exercise/{k}/"}
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
        st, _, body = self.req("/api/texercises", self.drafts_zip(*drafts), "application/zip", cookie)
        self.assertEqual((st, json.loads(body)), (200, {"exercises": len(drafts), "skipped": 0}))
        state = json.loads(self.req("/api/sheets", cookie=cookie)[2])
        self.assertEqual((state["sheets"], state["exercises"], state["latex"]), ([], len(drafts), bool(S.lualatex())))
        coulomb = next(a for a in state["apps"] if a["id"] == "coulomb")
        self.assertEqual([o["id"] for o in coulomb["objectives"]], ["direction", "factor", "vector", "field"])
        self.assertTrue(coulomb["objectives"][0]["de"])
        # a suggestion for two modules (JSON only)
        draft = {"title": "Kräfte <3", "lang": "en", "modules": [{"id": "photons"}, {"id": "coulomb", "objectives": ["direction", "vector"]}]}
        self.assertEqual(self.req("/api/plan", j({"sheet": draft, "suggest": True}), "text/plain", cookie)[0], 415)
        st, _, body = self.req("/api/plan", j({"sheet": draft, "suggest": True}), "application/json", cookie)
        self.assertEqual(st, 200)
        plan = json.loads(body)
        keys = plan["exercises"]
        self.assertTrue(keys)
        self.assertEqual(len(keys), len(set(keys)))
        self.assertTrue(all(k in drafts for k in keys))
        self.assertEqual(plan["default_count"], len(keys))
        self.assertEqual({(t["app"], t["objective"]) for t in plan["targets"]},
                         {("coulomb", "direction"), ("coulomb", "vector"), ("photons", "wave"), ("photons", "einstein"), ("photons", "threshold"), ("photons", "rate")})
        covered = {(plan["details"][k]["app"], o) for k in keys for o in plan["details"][k]["objectives"]}
        self.assertLessEqual({(t["app"], t["objective"]) for t in plan["targets"] if t["keys"]}, covered)
        self.assertEqual([plan["details"][k]["app"] for k in keys], sorted((plan["details"][k]["app"] for k in keys), key=["coulomb", "photons"].index))
        self.assertEqual(len(json.loads(self.req("/api/plan", j({"sheet": draft, "suggest": True, "count": 3}), "application/json", cookie)[2])["exercises"]), 3)
        for bad in ({"modules": [{"id": "../../etc"}]}, {"exercises": ["../x"]}, {"exercises": ["nope"]}):
            self.assertEqual(self.req("/api/plan", j({"sheet": bad}), "application/json", cookie)[0], 400)
        # create it
        st, _, body = self.req("/api/sheets/new", j({"sheet": {**draft, "exercises": keys}}), "application/json", cookie)
        self.assertEqual(st, 200)
        sheet = json.loads(body)
        sid = sheet["id"]
        self.assertRegex(sid, r"^[0-9a-f]{12}$")
        self.assertEqual((sheet["title"], sheet["exercises"], sheet["token"]), ("Kräfte 3", keys, None))
        self.assertEqual([m["id"] for m in sheet["modules"]], ["coulomb", "photons"])  # the hub's order
        saved = json.loads((Path(self.dir.name) / "data" / "exercise-sheets.json").read_text())
        self.assertEqual(list(saved["sheets"]), [sid])
        self.assertEqual((Path(self.dir.name) / "data" / "exercise-sheets.json").stat().st_mode & 0o777, 0o600)
        # replace one by an alternative, remove one, reorder; save
        alts = sheet["plan"]["alternatives"]
        k0 = next(k for k in keys if alts[k])
        alt = alts[k0][0]
        self.assertNotIn(alt, keys)
        self.assertTrue(set(plan["details"][k0]["objectives"]) & set(sheet["plan"]["details"][alt]["objectives"]) or
                        sheet["plan"]["details"][alt]["app"] == plan["details"][k0]["app"])
        new = [alt if k == k0 else k for k in keys][1:][::-1]
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
        for k in new:
            folder = next(ROOT.glob(f"texercises-drafts*/exercises/{k}"))
            r = P.render(folder)
            self.assertIn(r["text"], page_)
            self.assertNotIn(r["solution"], page_)
            self.assertIn(escape(json.loads((folder / "exercise.json").read_text())["title"]), page_)
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
        st, d = self.teachers({"action": "create", "id": "abc", "user": " Anna.B ", "name": " Anna <B> "}, boss)
        self.assertEqual(st, 200)
        pw = d["password"]
        self.assertEqual(len(pw), 12)
        self.assertEqual(d["teachers"], [{"id": "abc", "user": "anna.b", "name": "Anna B", "created": d["teachers"][0]["created"], "sets": 0}])
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
        self.assertNotIn(b'id="view-account"', body)
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
        st, d = self.teachers({"action": "rename", "id": "abc", "name": "Anna Beispiel"}, boss)
        self.assertEqual(d["teachers"][0]["name"], "Anna Beispiel")
        self.assertEqual(self.teachers({"action": "rename", "id": "abc", "user": "samuel.byland"}, boss)[0], 400)
        st, d = self.teachers({"action": "rename", "id": "abc", "user": "anna.beispiel"}, boss)
        self.assertEqual((d["teachers"][0]["user"], d["teachers"][0]["name"]), ("anna.beispiel", "Anna Beispiel"))
        self.assertEqual(self.req("/login", f"user=anna.b&password={pw}".encode(), "application/x-www-form-urlencoded")[0], 403)
        self.cookie_of("anna.beispiel", pw)
        self.assertEqual(d["teachers"][0]["sets"], 1)
        # her own password: the current one needed; her session goes on with a new cookie
        pwreq = lambda body, c: self.req("/api/password", json.dumps(body).encode(), "application/json", c)
        self.assertEqual(pwreq({"current": "wrong", "new": "a new password"}, anna)[0], 400)
        self.assertEqual(pwreq({"current": pw, "new": "short"}, anna)[0], 400)
        self.assertEqual(pwreq({"current": "teacher pw", "new": "a new password"}, boss)[0], 400)  # the crossword app's
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

    def test_rate_limit(self):
        for _ in range(H.LOGIN_ATTEMPTS):
            self.assertEqual(self.login("wrong")[0], 403)
        self.assertEqual(self.login()[0], 429)  # even the right password, for a while


if __name__ == "__main__":
    unittest.main()
