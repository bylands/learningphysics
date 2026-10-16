"""TikZ figures of the exercises as SVG, for the preview and the online version (used by ../hubadmin.py
through preview.py): LuaLaTeX draws them as in the PDF (texercises-lp.sty, the PDF's fonts), then
pdftocairo (poppler-utils) or dvisvgm turns each page into an SVG.

A figure is known by a hash of what it is made of (the exercise's solver part, which can define the
quantities a figure prints, its language, the figure's source and this engine), and kept as
<cache>/<hash>.svg. figure() answers at once: the SVG if it is there, else it puts the figure in a
queue that one background thread draws, an exercise at a time (all its figures in one LaTeX run),
and says it is pending; the page asks again later. A figure LaTeX cannot draw is remembered for a
while and stays a placeholder; failure() says why (LaTeX's error, its line counted in the figure),
for the review's TikZ editor in the panel.
"""
from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
ENGINE = ("texercises-lp.sty", "figures.py")
HASH = re.compile(r"[0-9a-f]{32}")
LATEX_TIMEOUT, CONVERT_TIMEOUT = 120, 30  # s
RETRY_AFTER = 600  # s: a figure that failed is tried again after this
MAX_PER_RUN = 12

# the PDF's fonts (lp-minion.sty, modern), with its fallbacks for an older TeX Live
DOC_START = r"""\documentclass[border=2bp,multi=lpfig]{standalone}
\usepackage{texercises-lp}
\usepackage{fontspec}
\usepackage{unicode-math}
\IfFontExistsTF{Erewhon-Regular.otf}{%
\setmainfont{Erewhon}[Extension=.otf, UprightFont=*-Regular, ItalicFont=*-Italic,
  BoldFont=*-Bold, BoldItalicFont=*-BoldItalic, Ligatures=TeX]}{%
\IfFontExistsTF{texgyrepagella-regular.otf}{\setmainfont{TeX Gyre Pagella}[Ligatures=TeX]}{}}
\IfFontExistsTF{FiraSans-Book.otf}{%
\setsansfont{FiraSans}[Extension=.otf, UprightFont=*-Book, ItalicFont=*-BookItalic, BoldFont=*-SemiBold]}{}
\IfFontExistsTF{Erewhon-Math.otf}{\setmathfont{Erewhon-Math.otf}}{%
\IfFontExistsTF{texgyrepagella-math.otf}{\setmathfont{TeX Gyre Pagella Math}}{}}
\newenvironment{lpfig}{}{}
\standaloneenv{lpfig}
% the solver part runs before the figures: its line ends and spaces must not print
\newcommand\lpquiet{\txinpreamble\catcode32=9 \endlinechar=-1 }
\newcommand\lpendquiet{\txendpreamble\catcode32=10 \endlinechar=13 }
\begin{document}
\fontsize{10bp}{13bp}\selectfont
"""

_lock = threading.Lock()
_queue: Dict[str, Tuple[str, str, str]] = {}  # hash -> (preamble, lang, source), waiting to be drawn
_failed: Dict[str, float] = {}  # hash -> when it failed
_why: Dict[str, str] = {}  # hash -> LaTeX's error, of a figure drawn on its own (failure())
MAX_WHY = 900  # characters of it
_worker: Optional[threading.Thread] = None
_engine_hash: Optional[bytes] = None


def converter() -> Optional[List[str]]:
    """The command that turns a page of a PDF into an SVG (the page, the PDF and the SVG appended), or None."""
    if shutil.which("pdftocairo"):
        return ["pdftocairo", "-svg"]
    if shutil.which("dvisvgm"):
        return ["dvisvgm", "--pdf", "--no-fonts", "--exact-bbox"]
    return None


def available() -> bool:
    return bool(shutil.which("lualatex") and converter())


def _engine() -> bytes:
    global _engine_hash
    if _engine_hash is None:
        h = hashlib.sha256()
        for name in ENGINE:
            p = HERE / name
            h.update(p.read_bytes() if p.is_file() else b"-")
        _engine_hash = h.digest()
    return _engine_hash


def key(preamble: str, lang: str, source: str) -> str:
    h = hashlib.sha256(_engine())
    for part in (lang, preamble, source):
        h.update(b"\0" + part.encode("utf-8"))
    return h.hexdigest()[:32]


def figure_source(env: str, body: str) -> str:
    """The LaTeX of a figure found in an exercise: an environment, or \\tikz[...]{...} (env 'tikz')."""
    if env == "tikz":
        return body
    if env == "axis":  # pgfplots' axis on its own
        return r"\begin{tikzpicture}\begin{axis}" + body + r"\end{axis}\end{tikzpicture}"
    return "\\begin{" + env + "}" + body + "\\end{" + env + "}"


def figure(cache: Path, preamble: str, lang: str, source: str) -> Dict[str, object]:
    """{"svg": file name, "width": pt, "height": pt} if it is drawn, {"pending": True} while it waits
    to be drawn, {} if it cannot be (no LaTeX or no converter on the server, or LaTeX failed)."""
    k = key(preamble, lang, source)
    svg = cache / f"{k}.svg"
    if svg.is_file():
        w, h = size(svg)
        return {"svg": svg.name, "width": w, "height": h}
    if not available():
        return {}
    with _lock:
        failed = _failed.get(k)
        if failed and time.time() - failed < RETRY_AFTER:
            return {}
        _failed.pop(k, None)
        _why.pop(k, None)
        _queue.setdefault(k, (preamble, lang, source))
        _start(cache)
    return {"pending": True}


def size(svg: Path) -> Tuple[float, float]:
    """The SVG's width and height in pt (as pdftocairo writes them), or (0, 0)."""
    try:
        with svg.open("rb") as f:
            head = f.read(600).decode("utf-8", "replace")
    except OSError:
        return 0.0, 0.0
    m = re.search(r'<svg[^>]*\bwidth="([\d.]+)(pt)?"[^>]*\bheight="([\d.]+)(pt)?"', head)
    return (float(m.group(1)), float(m.group(3))) if m else (0.0, 0.0)


def _start(cache: Path) -> None:
    global _worker
    if _worker is None or not _worker.is_alive():
        _worker = threading.Thread(target=_work, args=(cache,), daemon=True)
        _worker.start()


def _work(cache: Path) -> None:
    while True:
        with _lock:
            if not _queue:
                return
            # the next exercise: all waiting figures with its solver part and language
            first = next(iter(_queue.values()))
            batch = [(k, v[2]) for k, v in _queue.items() if v[:2] == first[:2]][:MAX_PER_RUN]
        try:
            done = draw(cache, first[0], first[1], batch)
            if len(batch) > 1 and len(done) < len(batch):  # one figure can stop the others: each on its own
                for k, src in batch:
                    if k not in done:
                        done |= draw(cache, first[0], first[1], [(k, src)])
        except Exception:
            done = set()
        with _lock:
            for k, _ in batch:
                _queue.pop(k, None)
                if k not in done:
                    _failed[k] = time.time()
                    while len(_why) > 200:  # (only the latest are asked for)
                        _why.pop(next(iter(_why)))


def failure(preamble: str, lang: str, source: str) -> str:
    """Why LaTeX could not draw this figure ("" if it did not fail, or not lately): its error, short."""
    k = key(preamble, lang, source)
    with _lock:
        if k not in _failed:
            return ""
        return _why.get(k) or "LaTeX could not draw it"


def latex_error(log: str, first: int) -> str:
    """The first error of a LaTeX log, short: its message and the line it stopped at, counted in the
    figure (first: the document's line where the figure begins), "" if the log has none."""
    lines = log.splitlines()
    start = next((i for i, x in enumerate(lines) if x.startswith("! ")), None)
    if start is None:
        return ""
    out = [lines[start][2:].strip()]
    for x in lines[start + 1:start + 12]:
        m = re.match(r"l\.(\d+) ?(.*)", x)
        if m:
            n = int(m.group(1)) - first + 1
            where = f"line {n} of the figure" if n >= 1 else "in the solver part"
            out.append(f"{where}: {m.group(2).strip()}" if m.group(2).strip() else where)
            break
        if x.strip() and x.strip() != "..." and not x.startswith(("<", "Type ", "See ", "The control sequence", "You", "(")):
            out.append(x.strip())
    text = "\n".join(dict.fromkeys(o for o in out if o))
    return text[:MAX_WHY]


def document(preamble: str, lang: str, sources: List[str]) -> str:
    figs = "".join("\\begin{lpfig}" + s + "\\end{lpfig}\\typeout{lpfig-done}\n" for s in sources)
    return (DOC_START + "\\begingroup\\txlang{" + ("de" if lang == "de" else "en") + "}\\lpquiet\n" + preamble +
            "\n\\lpendquiet\\relax\n" + figs + "\\endgroup\n\\end{document}\n")


def draw(cache: Path, preamble: str, lang: str, batch: List[Tuple[str, str]]) -> set:
    """Draw the figures [(hash, source)] of one exercise; the hashes of those now in the cache."""
    tex, conv = shutil.which("lualatex"), converter()
    if not tex or not conv:
        return set()
    cache.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="fig-") as tmp:
        work = Path(tmp)
        (work / "fig.tex").write_text(document(preamble, lang, [s for _, s in batch]), encoding="utf-8")
        env = dict(os.environ, TEXINPUTS=f"{HERE}//:" + os.environ.get("TEXINPUTS", ""),
                   TEXMFVAR=str(cache.parent / "texmf-var"), TEXMFCACHE=str(cache.parent / "texmf-var"), HOME=str(cache.parent))
        try:
            subprocess.run([tex, "-interaction=nonstopmode", "-halt-on-error", "fig.tex"], cwd=work, env=env,
                           capture_output=True, timeout=LATEX_TIMEOUT)
        except subprocess.TimeoutExpired:
            _explain(batch, f"LaTeX took too long (more than {LATEX_TIMEOUT} s)")
            return set()
        log = (work / "fig.log").read_text(encoding="utf-8", errors="replace") if (work / "fig.log").is_file() else ""
        pdf = work / "fig.pdf"
        if not pdf.is_file() or log.count("lpfig-done") != len(batch) or re.search(r"^! ", log, re.M):
            doc = (work / "fig.tex").read_text(encoding="utf-8")
            first = doc[:doc.index("\\begin{lpfig}")].count("\n") + 1
            _explain(batch, latex_error(log, first) or "LaTeX failed (its log says no more)")
            return set()
        done = set()
        for n, (k, _) in enumerate(batch, 1):
            out = work / f"{n}.svg"
            args = conv + (["-f", str(n), "-l", str(n), str(pdf), str(out)] if conv[0] == "pdftocairo"
                           else [f"--page={n}", "-o", str(out), str(pdf)])
            try:
                subprocess.run(args, cwd=work, capture_output=True, timeout=CONVERT_TIMEOUT)
            except subprocess.TimeoutExpired:
                continue
            if out.is_file() and out.stat().st_size > 0:
                tmp_target = cache / f".{k}.tmp"
                shutil.copyfile(out, tmp_target)
                os.replace(tmp_target, cache / f"{k}.svg")
                done.add(k)
        return done


def _explain(batch: List[Tuple[str, str]], why: str) -> None:
    """Keeps why a figure drawn on its own failed (in a batch, any one could be to blame)."""
    if len(batch) == 1:
        with _lock:
            _why[batch[0][0]] = why


def pending() -> int:
    with _lock:
        return len(_queue)
