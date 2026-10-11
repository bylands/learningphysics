"""Tests of the hub admin: run with `python3 hub-admin/test_hubadmin.py`.

Checks the reading of the hub page, the cleaning of a configuration and of sets (with learning
objectives, and those saved before there were objectives), the names a set
may have (and that no app or set clashes with a service nginx passes on), the atomic write, the password (in the crossword app's format) and sessions, and the
service end to end: login, rate limit, the API with and without a session, and that saves reach
apps.json and sets.json. The exercise sheets: which exercises a set gets, the upload of a TeXercises
export (only the teacher's exercises kept, nothing written outside its folder), and the sheet routes
(public sheet, solutions only when logged in; a PDF only where LaTeX is installed).
"""
import io
import zipfile
import hashlib
import json
import re
import secrets
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import hubadmin as H  # noqa: E402
from sheets import sheets as S  # noqa: E402

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


class Sheets(unittest.TestCase):
    POOL = {
        "coulomb": {"objectives": {"factor": ["a1", "a2", "a3"], "vector": ["a2", "a4"]},
                    "exercises": {"a1": {"lang": "en"}, "a2": {"lang": "de"}, "a3": {"lang": "de"}, "a4": {"lang": "en"}}},
        "photons": {"objectives": {}, "exercises": {"p1": {"lang": "en"}, "p2": {"lang": "en"}, "p3": {"lang": "en"}, "p4": {"lang": "en"}}},
    }

    def test_choose(self):
        have = {k: Path(k) for k in ("a1", "a2", "a3", "a4", "p1", "p2", "p3", "p4")}
        s = {"apps": [{"id": "coulomb", "objectives": ["vector", "factor"]}, {"id": "photons"}, {"id": "nope"}]}
        # per objective the first two not taken yet, in the set's order of objectives; an app with no
        # objectives in the pool gives its first three
        self.assertEqual(S.choose(s, self.POOL, have), [("coulomb", "a2"), ("coulomb", "a4"), ("coulomb", "a1"), ("coulomb", "a3"),
                                                        ("photons", "p1"), ("photons", "p2"), ("photons", "p3")])
        # the set's language first
        s = {"lang": "de", "apps": [{"id": "coulomb", "objectives": ["factor"]}]}
        self.assertEqual(S.choose(s, self.POOL, have), [("coulomb", "a2"), ("coulomb", "a3")])
        # only exercises that are there; no objectives in the set: all of the app's
        self.assertEqual(S.choose({"apps": [{"id": "coulomb"}]}, self.POOL, {"a3": Path("a3"), "a4": Path("a4")}),
                         [("coulomb", "a3"), ("coulomb", "a4")])
        coll = S.collection("3a", S.choose(s, self.POOL, have), {"coulomb": "Point Charges"})
        self.assertEqual(coll, {"title": "3a", "items": [{"exercise": "a2"}, {"exercise": "a3"}],
                                "containers": [{"first": 1, "title": "Point Charges"}]})

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
        self.assertEqual(json.loads(self.sets.read_text()), new)
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
        self.assertEqual(json.loads(self.sets.read_text()), new)
        # deleting every set
        st, _, body = self.req("/api/sets", b'{"sets": {}}', "application/json", cookie)
        self.assertEqual(json.loads(self.sets.read_text()), {"sets": {}})
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
        self.assertEqual(json.loads(self.sets.read_text())["sets"]["3a"]["apps"], [
            {"id": "electric-field", "modes": ["tutor", "practice", "check"], "objectives": ["sketch", "read"]},
            {"id": "photons", "modes": ["check"]}])

    def test_sheets(self):
        app = next(a for a, e in S.load_pool().items() if any(e["objectives"].values()))
        key = next(k for ks in S.load_pool()[app]["objectives"].values() for k in ks)
        H.write_config(self.sets, {"sets": {"3a": {"title": "Klasse 3a", "apps": [{"id": app, "modes": ["tutor"]}]}}})
        self.assertEqual(self.req("/api/sheets")[0], 403)
        self.assertEqual(self.req("/api/texercises", export_zip({key: "by"}), "application/zip")[0], 403)
        st, headers, _ = self.login()
        cookie = headers["Set-Cookie"].split(";")[0]
        st, _, body = self.req("/api/texercises", export_zip({key: "by", "x-other": "pw"}), "application/zip", cookie)
        self.assertEqual((st, json.loads(body)), (200, {"exercises": 1, "skipped": 1}))
        st, _, body = self.req("/sheet/3a.json")
        info = json.loads(body)
        self.assertGreaterEqual(info["exercises"], 1)
        self.assertEqual(info["available"], bool(S.lualatex()))
        state = json.loads(self.req("/api/sheets", cookie=cookie)[2])
        self.assertEqual(state["sets"][0]["name"], "3a")
        self.assertEqual(self.req("/sheet/nope.json")[2], b'{"exercises": 0, "available": false}')
        self.assertEqual(self.req("/sheet/3a-solutions.pdf")[0], 403)  # the solutions: teachers only
        self.assertEqual(self.req("/sheet/nope.pdf")[0], 404)
        self.assertEqual(self.req("/sheet/../x.pdf")[0], 404)
        if not S.lualatex():  # no LaTeX here: a clear answer instead of a sheet
            self.assertEqual(self.req("/sheet/3a.pdf")[0], 503)

    def test_rate_limit(self):
        for _ in range(H.LOGIN_ATTEMPTS):
            self.assertEqual(self.login("wrong")[0], 403)
        self.assertEqual(self.login()[0], 429)  # even the right password, for a while


if __name__ == "__main__":
    unittest.main()
