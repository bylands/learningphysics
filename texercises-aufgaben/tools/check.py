"""Checks the drafts: JSON schema, solver references, \\XP on givens, risky names, topics and tags
(tools/vocabulary.json: unknown or retired topics, tags to be replaced, new tags as a note).

    python3 tools/check.py [key-prefix ...]
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEMA = os.path.join(ROOT, 'tools', 'schema')
RISKY = set('a b c d i j k l o r t u v g m s A C F H J K L N O P S T V W '
            'sf th to tg ge le gt lt ne ni in it is dB mA mW mL ng ns kg cm mm km Hz Pa min hr deg rad '
            'mg ug pg fg cd mol sr lx Bq Gy Sv kat ln lg log sin cos tan exp det dim max sup inf arg ker hom '
            'Pr bar dot vec hat sec csc cot sinh cosh tanh coth arcsin arccos arctan sum int prod oint '
            'ss oe ae aa AA AE OE l L o O i j ell'.split())
prefixes = sys.argv[1:]
errors = 0
VOCAB = json.load(open(os.path.join(ROOT, 'tools', 'vocabulary.json')))
TOPICS = set(VOCAB['topics'])


def err(key, msg):
    global errors
    errors += 1
    print(f'{key}: {msg}')


try:
    import jsonschema
    es = json.load(open(os.path.join(SCHEMA, 'exercise.schema.json')))
    cs = json.load(open(os.path.join(SCHEMA, 'collection.schema.json')))
except Exception:
    jsonschema = None

keys = set()
for d in sorted(glob.glob(os.path.join(ROOT, 'exercises', '*'))):
    key = os.path.basename(d)
    keys.add(key)
    if prefixes and not key.startswith(tuple(prefixes)):
        continue
    files = {n: os.path.join(d, n + '.tex') for n in ('preamble', 'text', 'solution', 'short_solution')}
    for n, f in files.items():
        if not os.path.exists(f):
            err(key, f'missing {n}.tex')
    try:
        meta = json.load(open(os.path.join(d, 'exercise.json')))
        if jsonschema:
            jsonschema.validate(meta, es)
    except Exception as e:
        err(key, f'exercise.json: {e}')
        meta = {}
    for t in meta.get('subbranches', []):
        if t in VOCAB['retired_topics']:
            err(key, f'topic {t!r} is no longer used: {VOCAB["retired_topics"][t]}')
        elif t not in TOPICS:
            err(key, f'topic {t!r} is not a TeXercises topic')
    lang = meta.get('language', 'GER')
    replace, known = VOCAB['replace'].get(lang, {}), set(VOCAB['tags'].get(lang, []))
    for t in meta.get('tags', []):
        if t != t.lower():
            err(key, f'tag {t!r} is not lowercase')
        elif t in replace:
            err(key, f'tag {t!r}: ' + (f'use {replace[t]!r}' if replace[t] else 'drop it (repeats the topic or says nothing)'))
        elif t not in known:
            print(f'{key}: note: new tag {t!r} (add it to tools/vocabulary.json if it is meant)')
    pre = open(files['preamble']).read() if os.path.exists(files['preamble']) else ''
    new = set(re.findall(r'\\NewQty\*?\{(\w+)\}', pre))
    solved = set(re.findall(r'\\(?:SolQty|ConvTo)\{(\w+)\}', pre))
    names = new | solved
    for n in names:
        if n in RISKY:
            err(key, f'quantity name {n!r} clashes with a LaTeX/siunitx command or unit')
        if not re.fullmatch(r'[A-Za-z]+', n):
            err(key, f'quantity name {n!r} is not letters only')
    for m in set(re.findall(r'\\([A-Za-z]+)X\b', pre)):
        if m not in names and not m.startswith('nc') and m not in ('rEar', 'MEar', 'rSun', 'MSun', 'MMoo', 'rMoo'):
            err(key, f'preamble uses \\{m}X but {m} is not defined')
    body = ''.join(open(f).read() for n, f in files.items() if n != 'preamble' and os.path.exists(f))
    for m in set(re.findall(r'\\([A-Za-z]+?)P\{', body)):
        if m in new:
            err(key, f'\\{m}P on a \\NewQty (shows garbage): ConvTo it first')
    for m in set(re.findall(r'\\([A-Za-z]+?)F\b', body)):
        if m in new:
            err(key, f'\\{m}F on a \\NewQty (no formula)')
    for t in re.findall(r'(?<![\\$\w])\^\{?\d', re.sub(r'\$[^$]*\$|\\\[.*?\\\]|\\begin\{(align|equation|tikzpicture)\*?\}.*?\\end\{\1\*?\}', '', body, flags=re.S)):
        err(key, 'superscript outside math mode')
        break

for f in sorted(glob.glob(os.path.join(ROOT, 'collections', '*.json'))):
    name = os.path.basename(f)
    if prefixes and not name.startswith(tuple(prefixes)):
        continue
    try:
        c = json.load(open(f))
        if jsonschema:
            jsonschema.validate(c, cs)
        for it in c.get('items', []):
            if it['exercise'] not in keys:
                err(name, f"item {it['exercise']} has no folder")
    except Exception as e:
        err(name, str(e))

print('OK' if not errors else f'{errors} problem(s)')
sys.exit(1 if errors else 0)
