"""TeXercises exercises as HTML for the browser (used by ../hubadmin.py): the exercise sheets' preview
in the admin panel and their online version. The math is left to KaTeX on the page.

An exercise is TeXercises LaTeX (see texercises-lp.sty, which this follows): a solver part (the
preamble) defines quantities, and the text and the solution print them:

    \\NewQty{name}{value}[unit][factor][SI unit]       a given quantity (\\NewQty* multiplies by the factor)
    \\SolQty[options]{name}[formula]{xfp expression}[SI unit]    a computed one
    \\ConvTo{new}{factor}{old}{unit}                    an existing one in another unit
    \\nameO (as given), \\name (SI, 4 figures), \\nameX (the number), \\nameU (the unit), \\nameF (the
    formula), \\nameS{n} (n figures), \\nameP{p}{n} (in 10^p of the unit), \\nameQ, \\nameI

The solver part is evaluated here (evaluate: a small parser of xfp's arithmetic, never eval), the
quantities are printed as numbers with their units, siunitx (\\SI, \\qty, \\num, \\si, \\unit, units
like \\m and \\kilo\\meter) becomes plain math, and text mode becomes HTML (paragraphs, lists,
\\textbf, tables). Math is put in <span class="tx-m"> (inline) and <div class="tx-d"> (display),
its TeX as the element's text, for the page to render with KaTeX. What cannot be shown here
(TikZ pictures, images: TeXercises does not export them) becomes a small placeholder; an unknown
macro is shown as its source in a muted <code class="tx-raw">. Everything is HTML-escaped.

    render(folder) -> {"title", "lang", "text": html, "solution": html, "fallbacks": [...]}

fallbacks lists what could not be shown as it is ("\\macro", "env:name", "value:name", "figure",
"image"), for the panel's note and the tests.
"""
from __future__ import annotations

import json
import math
import re
from html import escape
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
TEXERCISES = "https://texercises.com"
MAX_EXPR, MAX_DEPTH = 4000, 40

# ---------------------------------------------------------------------- units (siunitx)
PREFIXES = {"quecto": "q", "ronto": "r", "yocto": "y", "zepto": "z", "atto": "a", "femto": "f", "pico": "p", "nano": "n",
            "micro": r"\mu ", "milli": "m", "centi": "c", "deci": "d", "deca": "da", "deka": "da", "hecto": "h",
            "kilo": "k", "mega": "M", "giga": "G", "tera": "T", "peta": "P", "exa": "E", "zetta": "Z", "yotta": "Y"}
POWER_TEN = {-18: "atto", -15: "femto", -12: "pico", -9: "nano", -6: "micro", -3: "milli", -2: "centi", -1: "deci",
             2: "hecto", 3: "kilo", 6: "mega", 9: "giga", 12: "tera", 15: "peta"}
UNITS = {"ampere": "A", "candela": "cd", "kelvin": "K", "kilogram": "kg", "gram": "g", "metre": "m", "meter": "m",
         "mole": "mol", "second": "s", "becquerel": "Bq", "degreeCelsius": r"{}^{\circ}C", "coulomb": "C", "farad": "F",
         "gray": "Gy", "hertz": "Hz", "henry": "H", "joule": "J", "lumen": "lm", "katal": "kat", "lux": "lx",
         "newton": "N", "ohm": r"\Omega ", "pascal": "Pa", "radian": "rad", "siemens": "S", "sievert": "Sv",
         "steradian": "sr", "tesla": "T", "volt": "V", "watt": "W", "weber": "Wb", "day": "d", "hectare": "ha",
         "hour": "h", "litre": "L", "liter": "L", "minute": "min", "tonne": "t", "astronomicalunit": "au", "bel": "B",
         "decibel": "dB", "dalton": "Da", "electronvolt": "eV", "neper": "Np", "atomicmassunit": "u",
         "arcminute": "'", "arcsecond": "''", "degree": r"{}^{\circ}", "percent": r"\%", "bar": "bar",
         "angstrom": r"\text{Å}", "barn": "b", "knot": "kn", "mmHg": "mmHg", "kWh": "kWh", "clight": "c",
         "planckbar": r"\hbar ", "elementarycharge": "e", "electronmass": "m_e", "year": "a"}
NO_SPACE = {"arcminute", "arcsecond", "degree"}  # no space between the number and these
# siunitx' abbreviations (\km, \mA, \kHz, ...): name -> (prefix, unit); those of texercises-lp.sty are read
# from it below
PREFIX_OF = {"f": "femto", "p": "pico", "n": "nano", "u": "micro", "m": "milli", "c": "centi", "d": "deci",
             "h": "hecto", "k": "kilo", "M": "mega", "G": "giga", "T": "tera"}
ABBREV: Dict[str, Tuple[str, str]] = {}
for _base, _unit, _prefixes in (("g", "gram", "fpnumk"), ("m", "metre", "pnumcdk"), ("s", "second", "fpnum"),
                                ("A", "ampere", "pnumk"), ("Hz", "hertz", "mkMGT"), ("N", "newton", "mkM"),
                                ("Pa", "pascal", "hkMG"), ("V", "volt", "pnumk"), ("W", "watt", "umkMGT"),
                                ("J", "joule", "umkMG"), ("eV", "electronvolt", "mkMGT"), ("F", "farad", "fpnum"),
                                ("C", "coulomb", "nmu"), ("ohm", "ohm", "kMm"), ("mol", "mole", "fpnum"),
                                ("H", "henry", "mu"), ("T", "tesla", "mun"), ("L", "litre", "mu"), ("l", "litre", "mu"),
                                ("K", "kelvin", ""), ("dB", "decibel", "")):
    ABBREV[_base] = ("", _unit)
    for _p in _prefixes:
        ABBREV[_p + _base] = (PREFIX_OF[_p], _unit)
ABBREV.pop("pm", None)  # \pm is plus-minus
POWERS = {"squared": 2, "cubed": 3}
PRE_POWERS = {"square": 2, "cubic": 3}
# LaTeX's own commands: a unit of that name (siunitx, texercises-lp.sty) only acts inside \unit, \SI, ...
NOT_FREE = {"min", "bar", "deg", "H", "d", "u", "l", "L", "a", "b", "c", "v", "t", "o", "i", "j", "P", "S", "O", "AA",
            "pm", "sec", "ss", "dag", "e", "r", "k"}


def _sty_units() -> Dict[str, str]:
    """\\DeclareSIUnit\\name{definition} of texercises-lp.sty: name -> the definition (LaTeX)."""
    try:
        sty = (HERE / "texercises-lp.sty").read_text(encoding="utf-8")
    except OSError:
        return {}
    out = {}
    for name, body in re.findall(r"\\DeclareSIUnit\\([A-Za-z]+)\{((?:[^{}]|\{[^{}]*\})*)\}", sty):
        out[name] = body
    return out


DECLARED = _sty_units()


def _sty_constants() -> Dict[str, Tuple[str, str]]:
    """The quantities texercises-lp.sty defines for every exercise (constants, planets, material
    values): name -> (value, unit)."""
    try:
        sty = (HERE / "texercises-lp.sty").read_text(encoding="utf-8")
    except OSError:
        return {}
    out = {name: (value, unit) for name, value, unit in re.findall(r"^\\NewQty\{(\w+)\}\{([^}]*)\}\[((?:[^\[\]{}]|\{[^{}]*\})*)\]", sty, re.M)}
    for name, value, unit in re.findall(r"\\NewQty\{(\w+)\}\{([^}]*)\}\[((?:[^\[\]{}]|\{[^{}]*\})*)\]", sty):
        out.setdefault(name, (value, unit))
    units = dict(re.findall(r"\\def\\txlp@(\w)\{([^}]*(?:\{[^}]*\})?[^}]*)\}", sty))
    for mat, body in re.findall(r"\\txlp@mat\{(\w+)\}\{([^}]*)\}", sty):
        for k, v, u in re.findall(r"(\w+)=([^:,]+):\\txlp@(\w)", body):
            out.setdefault(k + mat, (v, units.get(u, "")))
    return out


CONSTANTS = _sty_constants()


# ---------------------------------------------------------------------- reading LaTeX
def strip_comments(tex: str) -> str:
    out, i, n = [], 0, len(tex)
    while i < n:
        c = tex[i]
        if c == "\\" and i + 1 < n:
            out.append(tex[i:i + 2])
            i += 2
        elif c == "%":
            j = tex.find("\n", i)
            i = n if j < 0 else j
        else:
            out.append(c)
            i += 1
    return "".join(out)


def read_cs(s: str, i: int) -> Tuple[str, int]:
    """The control sequence at s[i] (a backslash): its name and the index after it. After a name of
    letters, the spaces and one line end that follow are skipped, as TeX does (not a blank line)."""
    j = i + 1
    if not (j < len(s) and s[j].isascii() and s[j].isalpha()):
        return s[j:j + 1], j + 1
    while j < len(s) and s[j].isascii() and s[j].isalpha():
        j += 1
    name = s[i + 1:j]
    while j < len(s) and s[j] in " \t":
        j += 1
    if j < len(s) and s[j] == "\n":
        k = j + 1
        while k < len(s) and s[k] in " \t":
            k += 1
        if k >= len(s) or s[k] != "\n":
            j = k
    return name, j


def skip_space(s: str, i: int) -> int:
    while i < len(s) and s[i] in " \t\n":
        i += 1
    return i


def read_group(s: str, i: int) -> Tuple[Optional[str], int]:
    """A mandatory argument at s[i:] (spaces skipped): a {group}'s content, a control sequence or a
    character; None at the end."""
    i = skip_space(s, i)
    if i >= len(s):
        return None, i
    if s[i] == "{":
        depth, j = 0, i
        while j < len(s):
            c = s[j]
            if c == "\\":
                j += 2
                continue
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return s[i + 1:j], j + 1
            j += 1
        return s[i + 1:], len(s)
    if s[i] == "\\":
        name, j = read_cs(s, i)
        return "\\" + name, j
    return s[i], i + 1


def read_opt(s: str, i: int) -> Tuple[Optional[str], int]:
    """An optional [argument] at s[i:] (spaces before it skipped), or (None, i)."""
    j = i
    while j < len(s) and s[j] in " \t":
        j += 1
    if j >= len(s) or s[j] != "[":
        return None, i
    depth, k = 0, j + 1
    while k < len(s):
        c = s[k]
        if c == "\\":
            k += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == "]" and depth == 0:
            return s[j + 1:k], k + 1
        k += 1
    return None, i


def find_end(s: str, i: int, env: str, any_of: Tuple[str, ...] = ()) -> Tuple[int, int]:
    """The \\end{env} that closes the environment whose body starts at s[i]: (start of the \\end, index
    after it); (len, len) if there is none. any_of: other names whose \\end also closes it (an align*
    closed as align)."""
    depth = 1
    for m in re.finditer(r"\\(begin|end)\s*\{([^}]*)\}", s[i:]):
        name = m.group(2)
        if name == env or (m.group(1) == "end" and name in any_of and depth == 1):
            depth += 1 if m.group(1) == "begin" else -1
            if depth == 0:
                return i + m.start(), i + m.end()
    return len(s), len(s)


def split_top(s: str, sep: str) -> List[str]:
    """s split at sep (\\\\ or &) outside groups and environments."""
    out, depth, env, last, i = [], 0, 0, 0, 0
    while i < len(s):
        c = s[i]
        if c == "\\":
            if s.startswith("\\begin", i):
                env += 1
            elif s.startswith("\\end", i):
                env -= 1
            if sep == "\\\\" and s.startswith("\\\\", i) and depth == 0 and env == 0:
                out.append(s[last:i])
                i += 2
                last = i
                continue
            i += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == sep and depth == 0 and env == 0:
            out.append(s[last:i])
            last = i + 1
        i += 1
    out.append(s[last:])
    return out


# ---------------------------------------------------------------------- arithmetic (xfp)
class EvalError(ValueError):
    pass


def _deg(f):
    return lambda x: f(math.radians(x))


def _adeg(f):
    return lambda x: math.degrees(f(x))


FUNCTIONS = {
    "sqrt": math.sqrt, "exp": math.exp, "ln": math.log, "log": math.log10, "abs": abs,
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "cot": lambda x: 1 / math.tan(x), "sec": lambda x: 1 / math.cos(x), "csc": lambda x: 1 / math.sin(x),
    "sind": _deg(math.sin), "cosd": _deg(math.cos), "tand": _deg(math.tan),
    "cotd": _deg(lambda x: 1 / math.tan(x)), "secd": _deg(lambda x: 1 / math.cos(x)), "cscd": _deg(lambda x: 1 / math.sin(x)),
    "asin": math.asin, "acos": math.acos, "atan": math.atan, "acot": lambda x: math.atan(1 / x),
    "asind": _adeg(math.asin), "acosd": _adeg(math.acos), "atand": _adeg(math.atan),
    "floor": math.floor, "ceil": math.ceil, "trunc": math.trunc, "sign": lambda x: (x > 0) - (x < 0),
}
MULTI = {"max": max, "min": min, "round": lambda x, n=0: round(x, int(n)), "atan": math.atan2,
         "atand": lambda y, x=1.0: math.degrees(math.atan2(y, x))}
NAMED = {"pi": math.pi, "deg": math.pi / 180, "inf": math.inf, "e": math.e}
_TOKEN = re.compile(r"\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|\\([A-Za-z]+)|([A-Za-z]+)|(\*\*|[-+*/^(),]))")


def evaluate(expr: str, lookup) -> float:
    """The value of an xfp expression: numbers, + - * / ^ **, parentheses (closed if left open, as
    xfp does in texercises-lp.sty), implicit multiplication (2pi, 3(x+1)), functions (sqrt, sin...
    in radians, sind... in degrees, asin..., exp, ln, log (base 10), abs, max, min, round, ...),
    pi and deg, and \\nameX: lookup(name) gives a control sequence's number (EvalError if unknown).
    Never eval: anything else is an EvalError."""
    if len(expr) > MAX_EXPR:
        raise EvalError("too long")
    toks: List[Tuple[str, str]] = []
    pos = 0
    expr = expr.strip()
    while pos < len(expr):
        m = _TOKEN.match(expr, pos)
        if not m or m.end() == pos:
            if expr[pos:].strip() == "":
                break
            raise EvalError(f"cannot read {expr[pos:pos + 10]!r}")
        pos = m.end()
        if m.group(1):
            toks.append(("num", m.group(1)))
        elif m.group(2):
            toks.append(("cs", m.group(2)))
        elif m.group(3):
            toks.append(("id", m.group(3)))
        else:
            toks.append(("op", m.group(4)))
    depth = sum(1 if t == ("op", "(") else -1 if t == ("op", ")") else 0 for t in toks)
    if depth > 0:
        toks += [("op", ")")] * depth
    elif depth < 0:
        toks = [("op", "(")] * -depth + toks
    k = [0]

    def peek() -> Optional[Tuple[str, str]]:
        return toks[k[0]] if k[0] < len(toks) else None

    def take() -> Tuple[str, str]:
        if k[0] >= len(toks):
            raise EvalError("unexpected end")
        k[0] += 1
        return toks[k[0] - 1]

    def expr_() -> float:
        v = term()
        while peek() in (("op", "+"), ("op", "-")):
            v = v + term() if take()[1] == "+" else v - term()
        return v

    def term() -> float:
        v = juxt()
        while peek() in (("op", "*"), ("op", "/")):
            if take()[1] == "*":
                v *= juxt()
            else:
                d = juxt()
                if d == 0:
                    raise EvalError("division by zero")
                v /= d
        return v

    def juxt() -> float:
        v = unary()
        while True:
            t, prev = peek(), toks[k[0] - 1] if k[0] else None
            if t and (t[0] in ("id", "cs") or t == ("op", "(") or (t[0] == "num" and prev == ("op", ")"))):
                v *= power()
            else:
                return v

    def unary() -> float:
        t = peek()
        if t in (("op", "-"), ("op", "+")):
            take()
            v = unary()
            return -v if t[1] == "-" else v
        return power()

    def power() -> float:
        v = primary()
        if peek() in (("op", "^"), ("op", "**")):
            take()
            e = unary()
            try:
                return math.pow(v, e)
            except (OverflowError, ValueError):
                raise EvalError("power")
        return v

    def primary() -> float:
        t = take()
        if t[0] == "num":
            return float(t[1])
        if t[0] == "cs":
            return lookup(t[1])
        if t == ("op", "("):
            v = expr_()
            if take() != ("op", ")"):
                raise EvalError("parenthesis")
            return v
        if t[0] == "id":
            name = t[1]
            if peek() == ("op", "(") and (name in FUNCTIONS or name in MULTI):
                take()
                args = [expr_()]
                while peek() == ("op", ","):
                    take()
                    args.append(expr_())
                if take() != ("op", ")"):
                    raise EvalError("parenthesis")
                try:
                    if len(args) == 1 and name in FUNCTIONS:
                        return float(FUNCTIONS[name](args[0]))
                    if name in MULTI:
                        return float(MULTI[name](*args))
                except (ValueError, OverflowError, ZeroDivisionError, TypeError):
                    raise EvalError(name)
                raise EvalError(name)
            if name in NAMED:
                return NAMED[name]
            # a number written right before a name: 3e-3 is read as a number, 2pi as 2 times pi
            raise EvalError(f"unknown {name}")
        raise EvalError(f"unexpected {t[1]}")

    try:
        v = expr_()
    except RecursionError:
        raise EvalError("too deep")
    if k[0] != len(toks):
        raise EvalError("trailing input")
    if not isinstance(v, float) or math.isnan(v):
        raise EvalError("not a number")
    return v


# ---------------------------------------------------------------------- numbers
def group(digits: str, left: bool) -> str:
    """siunitx' digit groups (5 digits or more): 12345 -> 12\\,345; after the point from the left."""
    if len(digits) < 5:
        return digits
    if left:
        parts = [digits[max(0, i - 3):i] for i in range(len(digits), 0, -3)][::-1]
    else:
        parts = [digits[i:i + 3] for i in range(0, len(digits), 3)]
    return r"\,".join(parts)


def plain(s: str) -> str:
    """A decimal number (digits, point, sign) with digit groups."""
    sign = "-" if s.startswith("-") else ""
    s = s.lstrip("+-")
    whole, _, frac = s.partition(".")
    return sign + group(whole, True) + ("." + group(frac, False) if frac else "")


def fmt(x: Optional[float], figures: int = 4, pad: bool = True, mode: str = "threshold") -> str:
    """x as math: rounded to `figures` significant figures (padded with zeros if pad); mode
    threshold (from 10^4 and below 10^-3 as a power of ten, as texercises-lp.sty sets siunitx),
    scientific or fixed."""
    if x is None:
        return r"\text{?}"
    if math.isinf(x):
        return r"-\infty" if x < 0 else r"\infty"
    figures = max(1, min(int(figures), 15))
    if x == 0:
        return "0"
    mant, _, exp = f"{abs(x):.{figures - 1}e}".partition("e")  # the figures, from the decimal digits
    digits, e = mant.replace(".", ""), int(exp)
    sign = "-" if x < 0 else ""
    if mode == "scientific" or (mode == "threshold" and not -3 <= e <= 3):
        s = digits[0] + ("." + digits[1:] if len(digits) > 1 else "")
        if not pad and "." in s:
            s = s.rstrip("0").rstrip(".")
        return sign + (f"{plain(s)}\\cdot 10^{{{e}}}" if e else plain(s))
    point = e + 1  # where the decimal point goes in the digits
    if point <= 0:
        s = "0." + "0" * -point + digits
    elif point >= len(digits):
        s = digits + "0" * (point - len(digits))
    else:
        s = digits[:point] + "." + digits[point:]
    if not pad and "." in s:
        s = s.rstrip("0").rstrip(".")
    return sign + plain(s)


NUMBER = re.compile(r"([+-]?)(\d*\.?\d*)(?:[eE]([+-]?\d+))?")


def typed_number(s: str) -> Optional[str]:
    """A number as typed in \\NewQty or \\SI (2.0, 6.674e-11, 3,5, 1.2(1), 3+-0.1) as math; None if it
    is not a plain number."""
    s = s.strip().replace(",", ".").replace(" ", "")
    unc = ""
    m = re.fullmatch(r"(.*?)(?:\+-|\\pm)(.*)", s)
    if m:
        s, unc = m.group(1), m.group(2)
    m = re.fullmatch(r"(.*?)\((\d+)\)", s)
    if m:
        s, unc = m.group(1), m.group(2)
    m = NUMBER.fullmatch(s)
    if not m or not (m.group(2) or m.group(3)) or m.group(2) == ".":
        return None
    sign, mant, exp = m.groups()
    out = sign.replace("+", "") + (plain(mant) if mant else "")
    if unc:
        if NUMBER.fullmatch(unc):
            out += r"\pm " + plain(unc)
        else:
            return None
    if exp is not None:
        e = str(int(exp))
        out = f"{out}\\cdot 10^{{{e}}}" if mant else f"{sign}10^{{{e}}}"
    return out or None


# ---------------------------------------------------------------------- quantities
class Qty:
    __slots__ = ("x", "unit", "typed", "typed_unit", "formula", "given", "opts")

    def __init__(self, x: Optional[float], unit: str, formula: str, given: bool, typed: str = "", typed_unit: Optional[str] = None, opts: str = ""):
        self.x, self.unit, self.formula, self.given = x, unit, formula, given
        self.typed, self.typed_unit, self.opts = typed, typed_unit, opts


SUFFIXES = ("OX", "OU", "O", "X", "U", "F", "S", "P", "Q", "I")
RESERVED = {"value", "par", "item", "text", "label", "ref", "begin", "end", "the", "relax", "left", "right", "frac",
            "sqrt", "cdot", "times", "hline", "quad", "phantom"}


class Exercise:
    """One exercise's quantities and macros, and its parts converted (text_html, math_tex)."""

    def __init__(self, preamble: str = "", lang: str = "en", url: str = "") -> None:
        self.q: Dict[str, Qty] = {}
        self.macros: Dict[str, Tuple[int, str]] = {}
        self.lang, self.url = lang, url
        self.fallbacks: List[str] = []
        self.depth = 0
        self.solver(strip_comments(preamble))

    # -------------------------------------------------------------- the solver part
    def fallback(self, what: str) -> None:
        if what not in self.fallbacks:
            self.fallbacks.append(what)

    def number(self, name: str) -> float:
        """The number of \\name in an expression: \\<q>X, \\<q>OX, \\nc<x>n."""
        for suffix in ("X", "OX"):
            if name.endswith(suffix):
                q = self.qty(name[:-len(suffix)])
                if q and q.x is not None:
                    if suffix == "OX":
                        v = typed_value(q.typed)
                        if v is not None:
                            return v
                    return q.x
        if name.startswith("nc") and name.endswith("n"):
            q = self.qty(name[:-1])
            if q and q.x is not None:
                return q.x
        if name in ("pi",):
            return math.pi
        raise EvalError(f"unknown \\{name}")

    def qty(self, name: str) -> Optional[Qty]:
        if name in self.q:
            return self.q[name]
        if name in CONSTANTS:
            value, unit = CONSTANTS[name]
            v = typed_value(value)
            self.q[name] = Qty(v, unit, name, True, value, unit)
            return self.q[name]
        return None

    def calc(self, name: str, expr: str) -> Optional[float]:
        try:
            v = evaluate(expr, self.number)
            return float(f"{v:.12g}")
        except EvalError:
            self.fallback(f"value:{name}")
            return None

    def solver(self, pre: str) -> None:
        i = 0
        while True:
            m = re.compile(r"\\(NewQty|SolQty|ConvTo|newcommand|renewcommand|providecommand|def)(?![A-Za-z])").search(pre, i)
            if not m:
                return
            kind, i = m.group(1), m.end()
            try:
                if kind == "NewQty":
                    star = pre.startswith("*", i)
                    i += star
                    opts, i = read_opt(pre, i)
                    name, i = read_group(pre, i)
                    value, i = read_group(pre, i)
                    unit, i = read_opt(pre, i)
                    factor, i = read_opt(pre, i)
                    si, i = read_opt(pre, i)
                    if not name or value is None:
                        continue
                    v = typed_value(value)
                    if v is not None and factor and factor.strip():
                        f = factor.strip()
                        if not star and f[0] in "eE":  # e-3: times 1e-3
                            power = typed_value("1" + f)
                            v = None if power is None else v * power
                        else:
                            try:
                                v = v * evaluate(f, self.number)
                            except EvalError:
                                v = None
                    if v is None:
                        self.fallback(f"value:{name}")
                    else:
                        v = float(f"{v:.12g}")
                    self.q[name] = Qty(v, si if si and si.strip() else (unit or ""), name, True, value, unit, opts or "")
                elif kind == "SolQty":
                    opts, i = read_opt(pre, i)
                    name, i = read_group(pre, i)
                    formula, i = read_opt(pre, i)
                    expr, i = read_group(pre, i)
                    unit, i = read_opt(pre, i)
                    if not name or expr is None:
                        continue
                    self.q[name] = Qty(self.calc(name, expr), unit or "", formula if formula is not None else name, False, opts=opts or "")
                elif kind == "ConvTo":
                    new, i = read_group(pre, i)
                    factor, i = read_group(pre, i)
                    old, i = read_group(pre, i)
                    unit, i = read_group(pre, i)
                    src = self.qty(old or "")
                    if not new or src is None:
                        continue
                    try:
                        v = None if src.x is None else float(f"{src.x * evaluate(factor or '1', self.number):.12g}")
                    except EvalError:
                        v = None
                        self.fallback(f"value:{new}")
                    self.q[new] = Qty(v, unit or "", src.formula, False)
                else:  # a macro of the exercise: \newcommand{\x}[n]{body}, \def\x{body}
                    name, i = read_group(pre, i)
                    n = 0
                    if kind != "def":
                        nargs, i = read_opt(pre, i)
                        n = int(nargs) if nargs and nargs.strip().isdigit() else 0
                    body, i = read_group(pre, i)
                    if name and name.startswith("\\") and body is not None:
                        self.macros[name[1:]] = (min(n, 9), body)
            except (ValueError, IndexError):
                continue

    # -------------------------------------------------------------- printing a quantity
    def unit_of(self, src: str) -> Tuple[str, bool]:
        return unit_tex(src, self)

    def with_unit(self, num: str, unit_src: str) -> str:
        u, tight = self.unit_of(unit_src)
        if not u:
            return num
        return num + ("" if tight else r"\,") + u

    def mode_of(self, q: Qty) -> str:
        if "scientific-notation=false" in q.opts:
            return "fixed"
        if "scientific-notation=true" in q.opts:
            return "scientific"
        return "threshold"

    def qty_macro(self, name: str, s: str, i: int) -> Optional[Tuple[str, int]]:
        """\\name as the math of a quantity (and the index after its arguments), or None."""
        if (name in self.q or name in CONSTANTS) and name not in RESERVED:
            return self.print_plain(self.qty(name)), i
        if name.startswith("nc") and name.endswith("n") and name[:-1] in CONSTANTS:
            return fmt(self.qty(name[:-1]).x, 4, False), i
        for suffix in SUFFIXES:
            if not name.endswith(suffix) or len(name) == len(suffix):
                continue
            q = self.qty(name[:-len(suffix)])
            if q is None:
                continue
            if suffix == "X":
                return fmt(q.x, 12, False), i
            if suffix == "U":
                return self.unit_of(q.unit)[0], i
            if suffix == "F":
                return self.math(q.formula) if not q.given else q.formula, i
            if suffix == "O":
                if not q.given:
                    return self.print_plain(q), i
                num = typed_number(q.typed)
                if num is None:
                    num = fmt(q.x, 4, False)
                return self.with_unit(num, q.typed_unit or ""), i
            if suffix == "OX":
                return typed_number(q.typed) or fmt(q.x, 4, False), i
            if suffix == "OU":
                return self.unit_of(q.typed_unit or "")[0], i
            if suffix == "S":
                n, i = read_group(s, i)
                figs = int(n) if n and n.strip().isdigit() else 4
                return self.with_unit(fmt(q.x, figs, True, self.mode_of(q)), q.unit), i
            if suffix == "Q":
                return self.with_unit(fmt(q.x, 4, True, "fixed"), q.unit), i
            if suffix == "I":
                if name == "SI":
                    continue
                return self.with_unit("?" if q.x is None else plain(str(int(round(q.x)))), q.unit), i
            if suffix == "P":
                p, i = read_group(s, i)
                n, i = read_group(s, i)
                try:
                    p_ = int((p or "0").strip())
                    figs = int((n or "4").strip())
                except ValueError:
                    p_, figs = 0, 4
                prefix = POWER_TEN.get(p_)
                x = None if q.x is None else q.x / 10 ** p_
                unit = ("\\" + prefix if prefix else "") + q.unit if q.unit else ""
                return self.with_unit(fmt(x, figs, True, "fixed"), unit), i
        return None

    def print_plain(self, q: Qty) -> str:
        if q.x is None:
            return r"\text{?}"
        if q.given:
            return self.with_unit(fmt(q.x, 4, False, self.mode_of(q)), q.unit)
        return self.with_unit(fmt(q.x, 4, True, self.mode_of(q)), q.unit)

    # -------------------------------------------------------------- siunitx and friends (both modes)
    def siunitx(self, name: str, s: str, i: int) -> Optional[Tuple[str, int]]:
        """\\SI, \\qty, \\num, \\si, \\unit, \\ang, \\SIrange, \\ce, \\ssc, ... as math, or None."""
        if name in ("SI", "qty", "pq"):
            if name == "qty":  # physics' \qty( ... ) and \qty[ ... ]: big brackets
                j = skip_space(s, i)
                if j < len(s) and s[j] == "(":
                    body, k = _balanced(s, j, "(", ")")
                    return r"\left(" + self.math(body) + r"\right)", k
                if j < len(s) and s[j] == "[":
                    opt, k = read_opt(s, j)
                    if opt is not None and not s[skip_space(s, k):].startswith("{"):
                        return r"\left[" + self.math(opt) + r"\right]", k
            opts, i = (None, i) if name == "pq" else read_opt(s, i)
            v, i = read_group(s, i)
            u, i = read_group(s, i)
            return self.with_unit(self.num(v or "", opts), u or ""), i
        if name in ("si", "unit"):
            _, i = read_opt(s, i)
            u, i = read_group(s, i)
            return self.unit_of(u or "")[0], i
        if name == "num":
            opts, i = read_opt(s, i)
            v, i = read_group(s, i)
            return self.num(v or "", opts), i
        if name == "ang":
            _, i = read_opt(s, i)
            v, i = read_group(s, i)
            parts = (v or "").split(";")
            marks = [r"^{\circ}", "'", "''"]
            return "".join(self.num(p) + marks[k] for k, p in enumerate(parts[:3]) if p.strip()), i
        if name in ("SIrange", "qtyrange", "numrange"):
            opts, i = read_opt(s, i)
            a, i = read_group(s, i)
            b, i = read_group(s, i)
            u = ""
            if name != "numrange":
                u, i = read_group(s, i)
            to = r"\text{ bis }" if self.lang == "de" else r"\text{ to }"
            return self.with_unit(self.num(a or "", opts), u or "") + to + self.with_unit(self.num(b or "", opts), u or ""), i
        if name in ("SIlist", "qtylist", "numlist"):
            opts, i = read_opt(s, i)
            a, i = read_group(s, i)
            u = ""
            if name != "numlist":
                u, i = read_group(s, i)
            items = [self.with_unit(self.num(x, opts), u or "") for x in (a or "").split(";")]
            last = r"\text{ und }" if self.lang == "de" else r"\text{ and }"
            return (", ".join(items[:-1]) + last + items[-1]) if len(items) > 1 else items[0], i
        if name == "ce":
            v, i = read_group(s, i)
            return chem(v or ""), i
        if name == "ssc":
            a, i = read_group(s, i)
            b, i = read_group(s, i)
            b = b or ""
            sub = r"\mathrm{" + self.math(b) + "}" if re.search(r"\\[A-Za-z]|[_^]", b) else r"\text{" + escape_text_tex(b) + "}"
            return "{" + self.math(a or "") + "}_{" + sub + "}", i
        if name == "result":
            a, i = read_group(s, i)
            return r"\underline{\underline{" + self.math(a or "") + "}}", i
        if name == "toPercent":
            n, i = read_opt(s, i)
            q, i = read_group(s, i)
            qq = self.qty((q or "").strip().lstrip("\\"))
            figs = int(n) if n and n.strip().isdigit() else 2
            return fmt(None if qq is None or qq.x is None else 100 * qq.x, figs, False, "fixed") + r"\,\%", i
        if name == "isotope":
            a, i = read_opt(s, i)
            z, i = read_opt(s, i)
            x, i = read_group(s, i)
            return "{}^{" + (a or "") + "}_{" + (z or "") + r"}\mathrm{" + self.math(x or "") + "}", i
        return None

    def num(self, v: str, opts: Optional[str] = None) -> str:
        v = v.strip()
        if opts and "round-mode=figures" in opts.replace(" ", ""):
            m = re.search(r"round-precision\s*=\s*(\d+)", opts)
            x = typed_value(v)
            if x is None and "\\" in v:
                try:
                    x = evaluate(v, self.number)
                except EvalError:
                    x = None
            if x is not None:
                return fmt(x, int(m.group(1)) if m else 2, True)
        t = typed_number(v)
        if t is not None:
            return t
        if "\\" in v:  # \num{\vX} or an expression
            try:
                return fmt(evaluate(v, self.number), 4, False)
            except EvalError:
                pass
            return self.math(v)
        return r"\text{" + escape_text_tex(v) + "}"

    # -------------------------------------------------------------- math mode
    def math(self, s: str) -> str:
        """Math as KaTeX reads it: the quantities and siunitx replaced, the rest left as it is."""
        self.depth += 1
        try:
            if self.depth > MAX_DEPTH:
                self.fallback("too deep")
                return ""
            return self._math(s)
        finally:
            self.depth -= 1

    def _math(self, s: str) -> str:
        out: List[str] = []
        i, n = 0, len(s)
        while i < n:
            c = s[i]
            if c != "\\":
                j = i
                while j < n and s[j] not in "\\$#":
                    j += 1
                if j == i:
                    if c == "#":  # #image_path:x# (in math: nothing to show)
                        k = s.find("#", i + 1)
                        i = n if k < 0 else k + 1
                    else:
                        i += 1  # a stray $
                    continue
                chunk = s[i:j]
                out.append(chunk.replace("°", r"^{\circ}").replace("−", "-"))
                i = j
                continue
            name, j = read_cs(s, i)
            if not name.isalpha():
                out.append("\\" + name)
                i = j
                continue
            r = self.common(name, s, j)
            if r is not None:
                tex, i = r
                out.append(tex + " ")
                continue
            if name in ("text", "textrm", "textup", "textnormal", "mbox", "hbox", "textbf", "textit", "emph", "textsf", "texttt", "intertext"):
                a, i = read_group(s, j)
                wrap = {"textbf": r"\textbf", "textit": r"\textit", "emph": r"\textit", "textsf": r"\textsf", "texttt": r"\texttt"}.get(name, r"\text")
                out.append(wrap + "{" + self.text_in_math(a or "") + "}")
                if name == "intertext":
                    out[-1] = r"\\" + out[-1] + r"\\"
                continue
            if name in ("label", "vspace", "color") or name in ("nonumber", "notag", "displaybreak", "allowbreak", "nobreak", "noindent", "relax", "protect", "centering", "small", "footnotesize", "large", "normalsize"):
                if name in ("label", "vspace", "color"):
                    _, j = read_opt(s, j)
                    _, j = read_group(s, j)
                i = j
                continue
            if name == "begin":
                env, k = read_group(s, j)
                if env in ("tikzpicture", "circuitikz"):
                    _, i = find_end(s, k, env)
                    self.fallback("figure")
                    out.append(r"\text{[figure]}")
                    continue
                out.append(r"\begin{" + (MATH_ENV_KATEX.get(env or "", env or "")) + "}")
                i = k
                continue
            if name == "end":
                env, i = read_group(s, j)
                out.append(r"\end{" + (MATH_ENV_KATEX.get(env or "", env or "")) + "}")
                continue
            out.append("\\" + name + (" " if j < n and (s[j].isalpha() or s[j - 1] in " \n") else ""))
            i = j
        return "".join(out)

    def text_in_math(self, s: str) -> str:
        """The argument of \\text in math: text, but quantities and $...$ in it are math."""
        out, i, n = [], 0, len(s)
        while i < n:
            c = s[i]
            if c == "$":
                k = s.find("$", i + 1)
                k = n if k < 0 else k
                out.append("$" + self.math(s[i + 1:k]) + "$")
                i = k + 1
            elif c == "\\":
                name, j = read_cs(s, i)
                r = self.common(name, s, j) if name.isalpha() else None
                if r is not None:
                    out.append("$" + r[0] + "$")
                    i = r[1]
                else:
                    out.append(s[i:j])
                    i = j
            else:
                out.append(c)
                i += 1
        return "".join(out)

    def defined(self, name: str, s: str, i: int) -> Optional[Tuple[str, int]]:
        """An exercise's macro (expanded, as math) or quantity, as math; None if name is neither."""
        if name in self.macros:
            n, body = self.macros[name]
            args = []
            for _ in range(n):
                a, i = read_group(s, i)
                args.append(a or "")
            for k, a in enumerate(args, 1):
                body = body.replace(f"#{k}", a)
            return self.math(body), i
        r = self.qty_macro(name, s, i)
        return ("{" + r[0] + "}", r[1]) if r is not None else None

    def common(self, name: str, s: str, i: int) -> Optional[Tuple[str, int]]:
        """What both modes print as math: an exercise's macro (expanded, as math), a quantity, siunitx
        and friends, free-standing units, and the few macros of texercises-lp.sty that KaTeX lacks."""
        r = self.defined(name, s, i)
        if r is not None:
            return r
        r = self.siunitx(name, s, i)
        if r is not None:
            return "{" + r[0] + "}", r[1]
        if name in MATH_SIMPLE:
            return MATH_SIMPLE[name], i
        if name in ("abs", "norm"):
            a, i = read_group(s, i)
            bar = "|" if name == "abs" else r"\|"
            return r"\left" + bar + self.math(a or "") + r"\right" + bar, i
        if name == "dd":
            a, i = read_group(s, i)
            return r"\mathrm{d}" + self.math(a or ""), i
        if name in ("dv", "pdv"):
            a, i = read_group(s, i)
            b, i = read_group(s, i)
            d = r"\mathrm{d}" if name == "dv" else r"\partial "
            return r"\frac{" + d + self.math(a or "") + "}{" + d + self.math(b or "") + "}", i
        if name in ("uuline", "uline"):
            a, i = read_group(s, i)
            u = self.math(a or "")
            return (r"\underline{\underline{" + u + "}}") if name == "uuline" else r"\underline{" + u + "}", i
        if name == "nicefrac":
            a, i = read_group(s, i)
            b, i = read_group(s, i)
            return r"{}^{" + self.math(a or "") + r"}\!/\!{}_{" + self.math(b or "") + "}", i
        if name in ("al",):
            a, i = read_group(s, i)
            return r"\begin{aligned}" + self.math(a or "") + r"\end{aligned}", i
        if name in ("DuSie", "duSie"):
            _, i = read_group(s, i)
            b, i = read_group(s, i)
            return self.math(b or ""), i
        if name in UNIT_NAMES and name not in NOT_FREE:
            # free-standing units (\m, \kilo\meter, \mps): the unit macros in a row
            j = i
            src = "\\" + name
            while True:
                k = skip_space(s, j)
                if k < len(s) and s[k] == "\\":
                    nm, kk = read_cs(s, k)
                    if nm in UNIT_NAMES or nm in PREFIXES or nm in POWERS or nm in PRE_POWERS or nm == "per":
                        src += "\\" + nm
                        j = kk
                        continue
                break
            return "{" + self.unit_of(src)[0] + "}", j
        if name in PREFIXES and i < len(s) and s[i] == "\\":
            nm, j = read_cs(s, i)
            if nm in UNIT_NAMES:
                return "{" + self.unit_of("\\" + name + "\\" + nm)[0] + "}", j
        return None

    # -------------------------------------------------------------- text mode
    def html(self, s: str) -> str:
        out = Html()
        self.text(s, out)
        return out.result()

    def inline(self, s: str) -> str:
        """Text without paragraphs (the argument of \\textbf, a table's cell): breaks become <br>."""
        out = Html()
        self.text(s, out)
        return out.inline_result()

    def text(self, s: str, out: "Html") -> None:
        self.depth += 1
        try:
            if self.depth > MAX_DEPTH:
                self.fallback("too deep")
                return
            self._text(s, out)
        finally:
            self.depth -= 1

    def _text(self, s: str, out: "Html") -> None:
        i, n = 0, len(s)
        while i < n:
            c = s[i]
            if c == "\\":
                i = self.text_cs(s, i, out)
            elif c == "$":
                if s.startswith("$$", i):
                    k = s.find("$$", i + 2)
                    k = n if k < 0 else k
                    out.block(display(self.math(s[i + 2:k])))
                    i = k + 2
                else:
                    k, depth = i + 1, 0  # the closing $ outside groups (\text{$...$} inside)
                    while k < n and (s[k] != "$" or depth > 0):
                        if s[k] == "\\":
                            k += 1
                        elif s[k] == "{":
                            depth += 1
                        elif s[k] == "}":
                            depth -= 1
                        k += 1
                    out.add(inline_math(self.math(s[i + 1:k])))
                    i = k + 1
            elif c == "{":
                body, i = read_group(s, i)
                self.text(body or "", out)
            elif c == "}":
                i += 1
            elif c == "~":
                out.add("\u00a0")
                i += 1
            elif c == "\n":
                j = i + 1
                breaks = 1
                while j < n and s[j] in " \t\n":
                    breaks += s[j] == "\n"
                    j += 1
                if breaks >= 2:
                    out.par()
                else:
                    out.add(" ")
                i = j
            elif c == "#" and s.startswith("#image_path:", i):
                k = s.find("#", i + 1)
                i = n if k < 0 else k + 1
                self.image(out)
            else:
                j = i
                while j < n and s[j] not in "\\${}~\n#":
                    j += 1
                j = max(j, i + 1)
                out.add(escape(typography(s[i:j])))
                i = j

    def text_cs(self, s: str, i: int, out: "Html") -> int:
        name, j = read_cs(s, i)
        n = len(s)
        if not name.isalpha():
            if name == "\\":
                _, j = read_opt(s, j + (1 if s[j:j + 1] == "*" else 0))
                out.add("<br>")
            elif name == "[":
                k = s.find("\\]", j)
                k = n if k < 0 else k
                out.block(display(self.math(s[j:k])))
                return k + 2
            elif name == "(":
                k = s.find("\\)", j)
                k = n if k < 0 else k
                out.add(inline_math(self.math(s[j:k])))
                return k + 2
            elif name in ACCENTS:
                a, j = read_group(s, j)
                out.add(escape(accent(name, a or "")))
            else:
                out.add(escape(TEXT_SYMBOLS.get(name, name if name in "%&#$_{} " else "")))
            return j
        if name == "begin":
            env, k = read_group(s, j)
            return self.environment(env or "", s, k, out)
        r = self.defined(name, s, j)  # the exercise's own (as in TeX: defined after the package's)
        if r is not None:
            out.add(inline_math(r[0]))
            return r[1]
        if name in ACCENTS and s[j:j + 1] == "{":
            a, j = read_group(s, j)
            out.add(escape(accent(name, a or "")))
            return j
        if name in ("par",):
            out.par()
            return j
        if name in ("newline", "linebreak"):
            out.add("<br>")
            return j
        if name in TEXT_SYMBOLS:
            out.add(escape(TEXT_SYMBOLS[name]))
            return j
        if name in IGNORED:
            return j
        if name in IGNORED_ARG:
            _, j = read_opt(s, j)
            if s.startswith("*", j):
                j += 1
            _, j = read_group(s, j)
            return j
        if name in TEXT_WRAP:
            a, j = read_group(s, j)
            tag, cls = TEXT_WRAP[name]
            out.add(f"<{tag}{f' class={cls!r}' if cls else ''}>".replace("'", '"') + self.inline(a or "") + f"</{tag}>")
            return j
        if name in ("textcolor", "colorbox"):
            _, j = read_group(s, j)
            a, j = read_group(s, j)
            self.text(a or "", out)
            return j
        if name in ("enquote", "textquote"):
            a, j = read_group(s, j)
            q = ("„", "“") if self.lang == "de" else ("“", "”")
            out.add(q[0] + self.inline(a or "") + q[1])
            return j
        if name in ("href", "url"):
            url, j = read_group(s, j)
            label = url
            if name == "href":
                label, j = read_group(s, j)
            url = (url or "").strip()
            inner = self.inline(label or "") if name == "href" else escape(url)
            if re.match(r"https?://[^\s\"'<>]+$", url):
                out.add(f'<a href="{escape(url)}" target="_blank" rel="noopener">{inner}</a>')
            else:
                out.add(inner)
            return j
        if name in ("nprv",):
            a, j = read_group(s, j)
            self.text(a or "", out)
            return j
        if name in ("prv", "Korrekturhinweise"):
            _, j = read_group(s, j)
            return j
        if name in ("DuSie", "duSie"):
            _, j = read_group(s, j)
            b, j = read_group(s, j)
            self.text(b or "", out)
            return j
        if name in ("Waerme", "Dichte"):
            a, j = read_group(s, j)
            de = self.lang == "de"
            what = ("Stoffwerte aus der Tabelle" if de else "material values from the table") if name == "Waerme" else ("Dichte aus der Tabelle" if de else "density from the table")
            out.add(f"<em>({escape(what)}: {self.inline(a or '')})</em>")
            return j
        if name in ("Geg", "Giv", "Ges", "Lsg", "Sol"):
            a, j = read_group(s, j)
            de = self.lang == "de"
            if name in ("Ges",):
                b, j = read_group(s, j)
                title = "Gesucht" if de else "Wanted"
                body = "<p>" + self.inline(a or "") + ", " + inline_math(self.math(b or "")) + "</p>"
            else:
                title = ("Gegeben" if de else "Given") if name in ("Geg", "Giv") else ("Lösung" if de else "Solution")
                body = display(r"\begin{aligned}" + self.math(a or "") + r"\end{aligned}")
            out.block(f'<div class="tx-box"><div class="tx-box-title">{escape(title)}</div>{body}</div>')
            return j
        if name == "al":
            a, j = read_group(s, j)
            out.block(display(r"\begin{aligned}" + self.math(a or "") + r"\end{aligned}"))
            return j
        if name in ("claim", "trueclaim", "falseclaim"):
            a, j = read_group(s, j)
            de = self.lang == "de"
            yes, no = ("wahr", "falsch") if de else ("true", "false")
            mark = {"claim": f"☐ {yes} ☐ {no}", "trueclaim": yes, "falseclaim": no}[name]
            out.block(f'<div class="tx-claim">{self.inline(a or "")} <span class="tx-mark">{escape(mark)}</span></div>')
            return j
        if name == "includegraphics":
            _, j = read_opt(s, j)
            _, j = read_group(s, j)
            self.image(out)
            return j
        if name == "tikz":
            _, j = read_opt(s, j)
            k = skip_space(s, j)
            if k < n and s[k] == "{":
                _, j = read_group(s, k)
            else:
                e = s.find(";", j)
                j = n if e < 0 else e + 1
            self.figure(out)
            return j
        if name in ("item", "abc"):
            _, j = read_opt(s, j)
            out.par()
            return j
        if name in ("fbox", "framebox", "boxed"):
            _, j = read_opt(s, j)
            a, j = read_group(s, j)
            out.add('<span class="tx-frame">' + self.inline(a or "") + "</span>")
            return j
        if name in ("makebox", "parbox", "raisebox", "resizebox", "scalebox", "adjustbox"):
            _, j = read_opt(s, j)
            _, j = read_opt(s, j)
            if name in ("parbox", "raisebox", "scalebox", "adjustbox"):
                _, j = read_group(s, j)
            if name == "resizebox":
                _, j = read_group(s, j)
                _, j = read_group(s, j)
            a, j = read_group(s, j)
            self.text(a or "", out)
            return j
        r = self.common(name, s, j)
        if r is not None:
            out.add(inline_math(r[0]))
            return r[1]
        if name in TEXT_MATH:  # \alpha, \cdot, ... in text by mistake: as math
            out.add(inline_math("\\" + name))
            return j
        self.fallback("\\" + name)
        out.add(f'<code class="tx-raw">\\{escape(name)}</code>')
        return j

    def environment(self, env: str, s: str, i: int, out: "Html") -> int:
        if env in MATH_ENVS:
            start, after = find_end(s, i, env, tuple(MATH_ENVS))
            body = s[i:start]
            if env.startswith("eqnarray"):
                body = re.sub(r"&([^&\\]*)&", r"&\1", body)
            if env.startswith("alignat"):
                _, k = read_group(body, 0)
                body = body[k:]
            out.block(display(r"\begin{" + MATH_ENV_KATEX.get(env, env) + "}" + self.math(body) + r"\end{" + MATH_ENV_KATEX.get(env, env) + "}"
                              if env not in ("displaymath", "math", "equation", "equation*") else self.math(body)))
            return after
        start, after = find_end(s, i, env)
        body = s[i:start]
        if env in FIGURES:
            self.figure(out)
            return after
        if env in LISTS:
            _, k = read_opt(body, 0)
            items = list_items(body[k:])
            tag = "ul" if env in ("itemize", "wf", "description") else "ol"
            cls = {"abcliste": "tx-abc", "abclist": "tx-abc", "wf": "tx-wf"}.get(env, "")
            lis = []
            for label, item in items:
                inner = self.html(item)
                if inner.count("<p>") == 1 and inner.startswith("<p>") and inner.endswith("</p>"):
                    inner = inner[3:-4]
                head = f'<span class="tx-label">{self.inline(label)}</span> ' if label is not None else ""
                lis.append(f"<li>{head}{inner}</li>")
            out.block(f"<{tag}{f' class={chr(34)}{cls}{chr(34)}' if cls else ''}>{''.join(lis)}</{tag}>")
            return after
        if env in TABLES:
            k = 0
            if env == "tabularx":
                _, k = read_group(body, k)
            _, k = read_opt(body, k)
            _, k = read_group(body, k)
            out.block(self.table(body[k:]))
            return after
        if env in BLOCKS:
            k = 0
            _, k = read_opt(body, k)
            if env in ("minipage", "multicols", "adjustbox"):
                _, k = read_group(body, k)
            _, k = read_opt(body, k)
            inner = Html()
            self.text(body[k:], inner)
            out.block(f'<div class="tx-{BLOCKS[env]}">{inner.result()}</div>')
            return after
        if env in ("verbatim",):
            out.block("<pre>" + escape(body) + "</pre>")
            return after
        self.fallback("env:" + env)
        inner = Html()
        self.text(body, inner)
        out.block(f'<div class="tx-env">{inner.result()}</div>')
        return after

    def table(self, body: str) -> str:
        rows = []
        for row in split_top(body, "\\\\"):
            row = re.sub(r"\\(hline|toprule|midrule|bottomrule)\b|\\cline\{[^}]*\}", "", row)
            if not row.strip():
                continue
            cells = []
            for cell in split_top(row, "&"):
                span = ""
                m = re.match(r"\s*\\multicolumn\s*\{(\d+)\}", cell)
                if m:
                    _, k = read_group(cell, m.end())
                    content, _ = read_group(cell, k)
                    cell = content or ""
                    span = f' colspan="{int(m.group(1))}"'
                cells.append(f"<td{span}>{self.inline(cell.strip())}</td>")
            rows.append("<tr>" + "".join(cells) + "</tr>")
        return '<table class="tx-table">' + "".join(rows) + "</table>"

    def figure(self, out: "Html") -> None:
        self.fallback("figure")
        out.block(f'<div class="tx-fig">{"Abbildung im PDF" if self.lang == "de" else "figure in the PDF"}</div>')

    def image(self, out: "Html") -> None:
        self.fallback("image")
        label = "Bild auf TeXercises ↗" if self.lang == "de" else "image on TeXercises ↗"
        if re.fullmatch(r"/exercise/[A-Za-z0-9_-]+/?", self.url or ""):
            out.block(f'<div class="tx-fig"><a href="{escape(TEXERCISES + self.url)}" target="_blank" rel="noopener">{label}</a></div>')
        else:
            out.block(f'<div class="tx-fig">{"Bild im PDF" if self.lang == "de" else "image in the PDF"}</div>')


def _balanced(s: str, i: int, open_: str, close: str) -> Tuple[str, int]:
    depth, j = 0, i
    while j < len(s):
        if s[j] == "\\":
            j += 2
            continue
        if s[j] == open_:
            depth += 1
        elif s[j] == close:
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
        j += 1
    return s[i + 1:], len(s)


def typed_value(s: str) -> Optional[float]:
    s = (s or "").strip().replace(",", ".").replace(" ", "")
    s = re.sub(r"\(\d+\)$", "", s)
    s = re.sub(r"(\+-|\\pm).*$", "", s)
    if re.match(r"^[eE]", s):
        s = "1" + s
    try:
        v = float(s)
    except ValueError:
        return None
    return v if math.isfinite(v) else None


def escape_text_tex(s: str) -> str:
    return re.sub(r"([#$%&_{}])", r"\\\1", s.replace("\\", ""))


UNIT_NAMES = set(UNITS) | set(ABBREV) | set(DECLARED)


def unit_tex(src: str, ex: Optional[Exercise] = None) -> Tuple[str, bool]:
    """A siunitx unit (\\kilo\\meter\\per\\second\\squared, \\mps, km/h, \\m^{-3}) as math:
    (\\mathrm{km/s^{2}}, whether it follows the number without a space (°, ′, ″))."""
    factors: List[List] = []  # [symbol, power, in the denominator]
    state = {"per": False, "pre": None, "power": None, "depth": 0}

    def add(sym: str) -> None:
        factors.append([sym, state["power"], state["per"]])
        state["per"], state["power"], state["pre"] = False, None, None

    def walk(s: str) -> None:
        state["depth"] += 1
        if state["depth"] > 8:
            return
        i, n = 0, len(s)
        while i < n:
            c = s[i]
            if c == "\\":
                name, j = read_cs(s, i)
                i = j
                if name in PREFIXES:
                    state["pre"] = (state["pre"] or "") + PREFIXES[name]
                elif name in UNITS:
                    add((state["pre"] or "") + UNITS[name])
                    if name in NO_SPACE and len(factors) == 1:
                        state["tight"] = True
                elif name in DECLARED:
                    per, pre = state["per"], state["pre"]
                    state["per"] = False
                    start = len(factors)
                    walk(DECLARED[name])
                    if pre and len(factors) > start:
                        factors[start][0] = pre + factors[start][0]
                    if per:
                        for f in factors[start:]:
                            f[2] = not f[2]
                elif name in ABBREV:
                    p, u = ABBREV[name]
                    add((state["pre"] or "") + PREFIXES.get(p, "") + UNITS[u])
                elif name == "per":
                    state["per"] = True
                elif name in POWERS:
                    if factors:
                        factors[-1][1] = POWERS[name]
                elif name in PRE_POWERS:
                    state["power"] = PRE_POWERS[name]
                elif name in ("tothe", "raiseto"):
                    a, i = read_group(s, i)
                    if name == "tothe" and factors:
                        factors[-1][1] = (a or "").strip()
                    else:
                        state["power"] = (a or "").strip()
                elif name == "frac":
                    a, i = read_group(s, i)
                    b, i = read_group(s, i)
                    walk(a or "")
                    start = len(factors)
                    walk(b or "")
                    for f in factors[start:]:
                        f[2] = not f[2]
                elif name in ("text", "mathrm", "textrm"):
                    a, i = read_group(s, i)
                    add(r"\text{" + escape_text_tex(a or "") + "}")
                elif name in ("cdot", "times", ",", " ", "!"):
                    pass
                elif name in ("mu", "Omega", "circ"):
                    add("\\" + name + " ")
                elif name == "%":
                    add(r"\%")
                else:
                    if ex:
                        ex.fallback("\\" + name)
                    add(r"\text{" + escape_text_tex(name) + "}")
            elif c == "^":
                a, i = read_group(s, i + 1)
                if factors:
                    factors[-1][1] = (a or "").strip()
            elif c == "/":
                state["per"] = True
                i += 1
            elif c == "{":
                a, i = read_group(s, i)
                walk(a or "")
            elif c.isalpha() or c in "°%Ωµ'":
                j = i
                while j < n and (s[j].isalpha() or s[j] in "°%Ωµ'"):
                    j += 1
                word = s[i:j].replace("°", r"{}^{\circ}").replace("%", r"\%").replace("Ω", r"\Omega ").replace("µ", r"\mu ")
                add(word)
                if s[i] == "°" and len(factors) == 1:
                    state["tight"] = True
                i = j
            else:
                i += 1
        state["depth"] -= 1

    walk(src or "")
    if not factors:
        return "", False
    if state["pre"]:
        add(state["pre"])

    def one(f) -> str:
        return f[0] + (f"^{{{f[1]}}}" if f[1] not in (None, "", 1) else "")
    num = [one(f) for f in factors if not f[2]]
    den = [one(f) for f in factors if f[2]]
    tex = r"\,".join(num) or "1"
    if den:
        tex += "/" + (den[0] if len(den) == 1 else "(" + r"\,".join(den) + ")")
    return r"\mathrm{" + tex + "}", bool(state.get("tight")) and not den


def chem(s: str) -> str:
    """mhchem's \\ce, roughly: Na+ -> Na^{+}, H2O -> H_{2}O, SO4^2- -> SO_{4}^{2-}, -> arrows."""
    s = s.strip()
    out = []
    for part in re.split(r"(\s+|<->|->|<-|=)", s):
        if part in ("->", "<-", "<->", "="):
            out.append({"->": r"\rightarrow ", "<-": r"\leftarrow ", "<->": r"\leftrightarrow ", "=": "="}[part])
            continue
        if not part.strip():
            out.append(r"\ ")
            continue
        if part == "+":
            out.append("+")
            continue
        m = re.fullmatch(r"(.*?)(?:\^?\{?(\d*[+-])\}?)?", part)
        body, charge = m.group(1), m.group(2)
        if re.fullmatch(r"\d*", body) and charge:  # a lone number with a sign: not a charge
            body, charge = part, None
        body = re.sub(r"(?<=[A-Za-z)\]])(\d+)", r"_{\1}", escape_text_tex(body))
        out.append(body + (f"^{{{charge}}}" if charge else ""))
    return r"\mathrm{" + "".join(out) + "}"


def list_items(body: str) -> List[Tuple[Optional[str], str]]:
    """The items of a list's body: [(label of \\item[label] or None, text)], split at \\item and \\abc
    outside groups and nested environments."""
    items: List[Tuple[Optional[str], str]] = []
    depth = env = 0
    i, n, cur, label, started = 0, len(body), [], None, False
    while i < n:
        c = body[i]
        if c == "\\":
            name, j = read_cs(body, i)
            if name == "begin":
                env += 1
            elif name == "end":
                env -= 1
            if name in ("item", "abc", "claim", "trueclaim", "falseclaim") and depth == 0 and env == 0:
                if started:
                    items.append((label, "".join(cur)))
                cur, label, started = [], None, True
                if name == "item":
                    opt, k = read_opt(body, j)
                    if opt is not None:
                        label, j = opt, k
                elif name != "abc":
                    cur.append("\\" + name + " ")
                i = j
                continue
            cur.append(body[i:j])
            i = j
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        cur.append(c)
        i += 1
    if started:
        items.append((label, "".join(cur)))
    elif "".join(cur).strip():
        items.append((None, "".join(cur)))
    return items


class Html:
    """The HTML of text mode: inline pieces gathered into paragraphs, blocks between them."""

    def __init__(self) -> None:
        self.parts: List[str] = []
        self.cur: List[str] = []

    def add(self, h: str) -> None:
        self.cur.append(h)

    def par(self) -> None:
        text = "".join(self.cur).strip()
        if text and text not in ("<br>",):
            self.parts.append("<p>" + re.sub(r"^(<br>\s*)+|(\s*<br>)+$", "", text) + "</p>")
        self.cur = []

    def block(self, h: str) -> None:
        self.par()
        self.parts.append(h)

    def result(self) -> str:
        self.par()
        return "".join(self.parts)

    def inline_result(self) -> str:
        pieces = []
        for p in self.parts:
            pieces.append(p[3:-4] if p.startswith("<p>") and p.endswith("</p>") else p)
        rest = "".join(self.cur).strip()
        return "<br>".join(x for x in pieces + ([rest] if rest else []) if x)


def inline_math(tex: str) -> str:
    return f'<span class="tx-m">{escape(tex.strip(), quote=False)}</span>'


def display(tex: str) -> str:
    return f'<div class="tx-d">{escape(tex.strip(), quote=False)}</div>'


def typography(s: str) -> str:
    return s.replace("---", "—").replace("--", "–").replace("``", "“").replace("''", "”").replace("\"`", "„").replace("\"'", "“")


def accent(name: str, ch: str) -> str:
    import unicodedata
    ch = ch.strip("{} ") or " "
    if ch in ("\\i", "\\j"):
        ch = ch[1]
    comb = ACCENTS[name]
    return unicodedata.normalize("NFC", ch[0] + comb) + ch[1:]


MATH_ENVS = {"align", "align*", "equation", "equation*", "gather", "gather*", "multline", "multline*", "eqnarray",
             "eqnarray*", "displaymath", "math", "flalign", "flalign*", "alignat", "alignat*"}
MATH_ENV_KATEX = {"align": "align*", "equation": "equation*", "gather": "gather*", "multline": "gather*", "multline*": "gather*",
                  "eqnarray": "align*", "eqnarray*": "align*", "flalign": "align*", "flalign*": "align*", "alignat": "align*", "alignat*": "align*"}
FIGURES = {"tikzpicture", "circuitikz", "pgfpicture", "picture", "tikzcd", "axis", "figure*"}
LISTS = {"itemize", "enumerate", "abcliste", "abclist", "wf", "description"}
TABLES = {"tabular", "tabular*", "tabularx", "longtable"}
BLOCKS = {"center": "center", "flushleft": "left", "flushright": "right", "minipage": "box", "multicols": "box",
          "quote": "quote", "quotation": "quote", "figure": "center", "table": "center", "tcolorbox": "frame",
          "adjustbox": "box", "small": "box", "footnotesize": "box", "samepage": "box"}
TEXT_WRAP = {"textbf": ("strong", ""), "textit": ("em", ""), "emph": ("em", ""), "textsl": ("em", ""),
             "texttt": ("code", ""), "underline": ("u", ""), "uline": ("u", ""), "textsc": ("span", "tx-sc"),
             "textsuperscript": ("sup", ""), "textsuperscrip": ("sup", ""), "textsubscript": ("sub", ""),
             "mbox": ("span", ""), "hbox": ("span", ""), "text": ("span", ""), "textrm": ("span", ""),
             "textup": ("span", ""), "textnormal": ("span", ""), "textsf": ("span", ""), "textmd": ("span", ""),
             "uuline": ("u", "tx-uu"), "sout": ("s", ""), "caption": ("span", "tx-caption")}
TEXT_SYMBOLS = {"ldots": "…", "dots": "…", "textellipsis": "…", "LaTeX": "LaTeX", "TeX": "TeX", "today": "",
                "textdegree": "°", "textperthousand": "‰", "permil": "‰", "euro": "€", "EUR": "€", "S": "§", "P": "¶",
                "textbackslash": "\\", "ss": "ß", "glqq": "„", "grqq": "“", "glq": "‚", "grq": "‘", "quad": "\u2003",
                "qquad": "\u2003\u2003", "enspace": "\u2002", "textendash": "–", "textemdash": "—", "textbullet": "•",
                ",": "\u2009", ";": "\u2005", ":": "\u2005", "!": "", "/": "", "-": "", " ": " ", "@": "",
                "%": "%", "&": "&", "#": "#", "$": "$", "_": "_", "{": "{", "}": "}", "aa": "å", "AA": "Å",
                "o": "ø", "O": "Ø", "ae": "æ", "AE": "Æ", "oe": "œ", "i": "ı", "textquotedblleft": "“",
                "textquotedblright": "”", "quotedblbase": "„", "textregistered": "®", "copyright": "©",
                "textasciitilde": "~", "textunderscore": "_", "slash": "/", "hfill": " ", "hss": "", "dotfill": " … ",
                "pawnB": "♟", "knightB": "♞", "bishopB": "♝", "rookB": "♜", "queenB": "♛", "kingB": "♚"}
ACCENTS = {'"': "\u0308", "'": "\u0301", "`": "\u0300", "^": "\u0302", "~": "\u0303", "=": "\u0304", ".": "\u0307",
           "u": "\u0306", "v": "\u030c", "H": "\u030b", "c": "\u0327", "r": "\u030a"}
IGNORED = {"small", "footnotesize", "scriptsize", "tiny", "large", "Large", "LARGE", "huge", "Huge", "normalsize",
           "bfseries", "itshape", "mdseries", "upshape", "rmfamily", "sffamily", "ttfamily", "em", "centering",
           "raggedright", "raggedleft", "noindent", "indent", "medskip", "bigskip", "smallskip", "newpage", "clearpage",
           "pagebreak", "nopagebreak", "nolinebreak", "vfill", "null", "relax", "protect", "displaystyle", "nonumber",
           "notag", "normalfont", "leavevmode", "strut", "break", "allowbreak", "sloppy", "fussy",
           "columnbreak", "hline", "toprule", "midrule", "bottomrule", "ignorespaces", "unskip",
           "tightlist", "makeatletter", "makeatother", "boldmath", "unboldmath", "onehalfspacing", "singlespacing"}
IGNORED_ARG = {"vspace", "hspace", "label", "color", "setlength", "addtolength", "setcounter", "addtocounter",
               "phantom", "hphantom", "vphantom", "rule", "index", "footnote", "pagestyle", "thispagestyle",
               "selectlanguage", "tcbset", "sisetup", "tikzset", "usetikzlibrary", "definecolor", "ref", "eqref",
               "cite", "vskip", "hskip", "enlargethispage", "newcounter", "stepcounter", "refstepcounter",
               "Waermeintro", "txlang"}
TEXT_MATH = {"alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta", "iota",
             "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "phi", "varphi", "chi", "psi",
             "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Omega", "cdot", "times",
             "approx", "leq", "geq", "le", "ge", "neq", "pm", "mp", "infty", "rightarrow", "Rightarrow", "leftarrow",
             "Leftarrow", "to", "circ", "propto", "sim", "ell", "hbar", "checkmark", "square", "Box", "ast", "star",
             "uparrow", "downarrow", "Longrightarrow", "longrightarrow", "mapsto", "perp", "parallel", "angle",
             "triangle", "bullet", "sqrt", "frac", "vec", "partial", "nabla", "degree", "cdots", "ldotp"}
MATH_SIMPLE = {"e": r"\mathrm{e}", "ds": r"\displaystyle ", "mustbe": r"\overset{!}{=}", "cross": r"\times ",
               "infinity": r"\infty ", "astrosun": r"\odot ", "alhpa": r"\alpha ", "aplha": r"\alpha ",
               "Delt": r"\Delta ", "permil": r"\text{‰}", "percent": r"\%", "degree": r"^{\circ}", "celsius": r"{}^{\circ}\mathrm{C}",
               "degC": r"{}^{\circ}\mathrm{C}", "alphaarrow": r"\xrightarrow{\alpha}", "betaarrow": r"\xrightarrow{\beta}",
               "betamarrow": r"\xrightarrow{\beta^-}", "betaparrow": r"\xrightarrow{\beta^+}", "gammaarrow": r"\xrightarrow{\gamma}",
               "xlongrightarrow": r"\xrightarrow", "xlongleftarrow": r"\xleftarrow", "Z": r"\mathbb{Z}", "R": r"\mathbb{R}",
               "zu": r"_{\text{zu}}", "nutz": r"_{\text{nutz}}", "clight": "c", "upmu": r"\mu ",
               "textdegree": r"^{\circ}", "dots": r"\dots ", "ldots": r"\ldots ", "noindent": "", "centering": "",
               "qquad": r"\qquad "}


# ---------------------------------------------------------------------- an exercise
def read_exercise(folder: Path) -> Dict[str, object]:
    def rd(name: str) -> str:
        p = folder / name
        try:
            return p.read_text(encoding="utf-8") if p.is_file() else ""
        except (OSError, UnicodeDecodeError):
            return ""
    try:
        meta = json.loads(rd("exercise.json") or "{}")
    except ValueError:
        meta = {}
    return {"meta": meta if isinstance(meta, dict) else {}, "preamble": rd("preamble.tex"), "text": rd("text.tex"),
            "solution": rd("solution.tex"), "short": rd("short_solution.tex")}


def render_parts(parts: Dict[str, object], solution: bool = True) -> Dict[str, object]:
    meta = parts.get("meta") or {}
    lang = "de" if meta.get("language") == "GER" else "en"
    url = str((meta.get("info") or {}).get("url") or "") if isinstance(meta.get("info"), dict) else ""
    try:
        ex = Exercise(str(parts.get("preamble") or ""), lang, url)
    except Exception:  # an unreadable solver part: the exercise without its quantities
        ex = Exercise("", lang, url)
        ex.fallback("error")
    out: Dict[str, object] = {"title": str(meta.get("title") or ""), "lang": lang,
                              "text": convert(ex, str(parts.get("text") or ""))}
    if solution:
        sol = str(parts.get("solution") or "") or str(parts.get("short") or "")
        out["solution"] = convert(ex, sol)
    out["fallbacks"] = list(ex.fallbacks)
    return out


def convert(ex: Exercise, tex: str) -> str:
    try:
        return ex.html(strip_comments(tex))
    except Exception:  # never break the page
        ex.fallback("error")
        return '<pre class="tx-raw">' + escape(tex) + "</pre>"


def render(folder: Path, solution: bool = True) -> Dict[str, object]:
    """The exercise in folder (exercise.json, preamble.tex, text.tex, solution.tex) as HTML."""
    return render_parts(read_exercise(folder), solution)


if __name__ == "__main__":
    # python3 hub-admin/sheets/preview.py <exercise folder>...: the HTML and what fell back
    import sys
    for f in sys.argv[1:]:
        r = render(Path(f))
        print(f"== {f}: {r['fallbacks']}\n{r['text']}\n-- solution\n{r['solution']}\n")
