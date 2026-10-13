#!/usr/bin/env python3
"""Tries out the site locally, as nginx serves it: the hub page at /, the apps (the energy app at
/coe/), /apps.json and /sets.json, the sets at /<name>, and the admin panel at /admin/ (with a
password of its own, not the server's). Standard library only.

    python3 hub-admin/devserver.py                     then open http://localhost:8090/admin/
    python3 hub-admin/devserver.py --password secret --port 8091 --data /tmp/hubdata
    python3 hub-admin/devserver.py --crosswords 8020   with the crossword generator (crosswords-web, its
                                                       own repository) at /crosswords/, as on the server

Without --data, what the admin panel saves is kept in a temporary folder until the server stops.
Run shared/sync.sh first if you changed a file in shared/.
"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import re
import secrets
import sys
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import hubadmin as H  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
FOLDERS = {"coe": "energy-conservation"}  # served at another path than their folder
NOT_SERVED = {"hub", "shared", "hub-admin", "deploy"}


def main() -> int:
    p = argparse.ArgumentParser(description="The site with the admin panel, locally.")
    p.add_argument("--port", type=int, default=8090)
    p.add_argument("--password", default="test", help="the admin panel's password here (default: test)")
    p.add_argument("--data", type=Path, help="where apps.json and sets.json are kept (default: a temporary folder)")
    p.add_argument("--crosswords", type=int, metavar="PORT", help="proxy /crosswords/ to a crossword generator on this port")
    args = p.parse_args()
    data = args.data or Path(tempfile.mkdtemp(prefix="hubdata-"))
    data.mkdir(parents=True, exist_ok=True)
    salt = secrets.token_bytes(16)
    pw = data / "password"
    pw.write_text(f"pbkdf2_sha256$1000${salt.hex()}${hashlib.pbkdf2_hmac('sha256', args.password.encode(), salt, 1000).hex()}\n")
    admin = ThreadingHTTPServer(("127.0.0.1", 0), H.make_handler(H.Admin(pw, REPO / "hub" / "index.html", data / "apps.json", data / "sets.json",
                                                                         crosswords_url=f"http://127.0.0.1:{args.crosswords}/" if args.crosswords else "")))
    threading.Thread(target=admin.serve_forever, daemon=True).start()
    admin_port = admin.server_address[1]

    class Site(SimpleHTTPRequestHandler):
        def log_message(self, *a) -> None:
            pass

        def translate_path(self, path: str) -> str:
            path = path.split("?", 1)[0].split("#", 1)[0]
            if path in ("/", "/index.html"):
                return str(REPO / "hub" / "index.html")
            if path in ("/lang.js", "/objectives.json", "/favicon.ico", "/favicon.svg", "/apple-touch-icon.png"):
                return str(REPO / "hub" / path[1:])
            if path in ("/apps.json", "/sets.json"):
                return str(data / path[1:])
            m = re.match(r"^/([a-z0-9-]+)(/.*)?$", path)
            if m:
                folder = REPO / FOLDERS.get(m.group(1), m.group(1))
                if m.group(1) not in NOT_SERVED and folder.is_dir():
                    return str(folder) + (m.group(2) or "")
                if re.fullmatch(r"/([a-z]{3}/)?[a-z0-9][a-z0-9-]{0,39}/?", path):  # a set: the hub page
                    return str(REPO / "hub" / "index.html")
            return str(REPO / "-not-found-")

        def end_headers(self) -> None:
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def proxy(self) -> None:  # /admin/... to the admin panel (and /crosswords/...), as nginx does
            n = int(self.headers.get("Content-Length") or 0)
            headers = {k: v for k, v in self.headers.items() if k.lower() in ("cookie", "content-type", "content-length")}
            prefix, port = ("/admin", admin_port) if self.path.startswith("/admin/") else ("/crosswords", args.crosswords)
            c = http.client.HTTPConnection("127.0.0.1", port)
            c.request(self.command, self.path[len(prefix):], self.rfile.read(n) if n else None, headers)
            r = c.getresponse()
            body = r.read()
            self.send_response(r.status)
            for k, v in r.getheaders():
                if k.lower() == "set-cookie":
                    v = v.replace("; Secure", "")  # plain http here
                if k.lower() not in ("transfer-encoding", "connection", "cache-control"):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:
            if self.path == "/admin":
                self.send_response(301)
                self.send_header("Location", "/admin/")
                self.end_headers()
            elif self.path.startswith("/admin/") or (args.crosswords and self.path.startswith("/crosswords/")):
                self.proxy()
            else:
                super().do_GET()

        def do_POST(self) -> None:
            if self.path.startswith("/admin/") or (args.crosswords and self.path.startswith("/crosswords/")):
                self.proxy()
            else:
                self.send_error(405)

    print(f"The site:        http://localhost:{args.port}/\n"
          f"The admin panel: http://localhost:{args.port}/admin/  (password: {args.password})\n"
          f"Saved data in:   {data}\nStop with Ctrl-C.", file=sys.stderr)
    try:
        ThreadingHTTPServer(("127.0.0.1", args.port), Site).serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
