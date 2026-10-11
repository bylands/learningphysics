#!/usr/bin/env python3
"""Turn a TeXercises collection into a LaTeX sheet: exercises, then solutions.

    python3 build_sheet.py <export folder> <collection.json> <out.tex> [--short]

The export folder is a TeXercises bundle (exercises/<key>/...); the collection lists items by
"exercise" (a key) or "exercise_id". Each exercise runs in its own group, so its \\NewQty and
\\SolQty names do not leak into the next one; the solutions part runs the preamble again.
--short prints the short solutions instead of the full ones.
"""
import json, os, re, sys, glob

def load(export):
    by_id, by_key = {}, {}
    for d in glob.glob(os.path.join(export, 'exercises', '*')):
        j = json.load(open(os.path.join(d, 'exercise.json')))
        rd = lambda n: open(os.path.join(d, n)).read() if os.path.exists(os.path.join(d, n)) else ''
        e = {'meta': j, 'preamble': rd('preamble.tex'), 'text': rd('text.tex'),
             'solution': rd('solution.tex'), 'short': rd('short_solution.tex'), 'dir': d}
        by_key[os.path.basename(d)] = e
        if j.get('id'): by_id[j['id']] = e
    return by_id, by_key

def images(tex):
    # TeXercises writes #image_path:<name># for its gallery images; they are not in the export,
    # so they point to images/<name> (put the files there, or the package prints a placeholder)
    return re.sub(r'#image_path:([^#]+)#', r'images/\1', tex)

MATH_ENVS = {'align', 'align*', 'equation', 'equation*', 'gather', 'gather*', 'multline', 'multline*', 'eqnarray', 'eqnarray*'}

def repair(tex):
    # a display opened as align* and closed as align (and the like) stops LaTeX; close it as opened
    out, stack, pos = [], [], 0
    for m in re.finditer(r'\\(begin|end)\{([A-Za-z*]+)\}', tex):
        kind, env = m.groups()
        if kind == 'begin':
            stack.append(env)
        elif stack:
            top = stack.pop()
            if top != env and top in MATH_ENVS and env in MATH_ENVS:
                out.append(tex[pos:m.start()] + '\\end{' + top + '}')
                pos = m.end()
    out.append(tex[pos:])
    return ''.join(out)

def prepare(tex):
    return repair(images(tex))

def esc(s):
    return ''.join('\\' + c if c in '&%$#_{}' else c for c in s)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    short = '--short' in sys.argv
    export, coll_path, out = args
    by_id, by_key = load(export)
    coll = json.load(open(coll_path))
    items = []
    for it in coll['items']:
        e = by_key.get(it.get('exercise')) or by_id.get(it.get('exercise_id'))
        if not e: sys.exit(f'not in the export: {it}')
        items.append((it, e))
    heads = {c['first']: c['title'] for c in coll.get('containers', [])}
    de = sum(e['meta']['language'] == 'GER' for _, e in items) > len(items) / 2
    L = [r'\documentclass[11pt,a4paper]{article}',
         r'\usepackage[a4paper,margin=2cm]{geometry}',
         r'\usepackage[T1]{fontenc}', r'\usepackage{lmodern}',
         r'\usepackage{texercises-lp}',
         r'\setlength\parindent{0pt}\setlength\parskip{0.5ex}',
         r'\begin{document}',
         rf'\txlang{{{"de" if de else "en"}}}',
         rf'{{\Large\bfseries {esc(coll["title"])}}}\par\medskip']
    def block(n, it, e, body, with_extra):
        lang = 'de' if e['meta']['language'] == 'GER' else 'en'
        out = [rf'\subsection*{{{n}.\ {esc(e["meta"]["title"])}}}', r'\begingroup', rf'\txlang{{{lang}}}',
               r'\txinpreamble', e['preamble'], r'\txendpreamble', body]
        if with_extra and it.get('additional'):
            out.append(it['additional'])
        out.append(r'\endgroup')
        return out
    for n, (it, e) in enumerate(items, 1):
        if n in heads: L.append(rf'\section*{{{esc(heads[n])}}}')
        L += block(n, it, e, e['text'], True)
    L += [r'\newpage', rf'\section*{{{"Lösungen" if de else "Solutions"}}}']
    for n, (it, e) in enumerate(items, 1):
        L += block(n, it, e, (e['short'] if short else e['solution']) or e['short'], False)
    L.append(r'\end{document}')
    open(out, 'w').write(prepare('\n'.join(L)) + '\n')
    print(f'{out}: {len(items)} exercises')

if __name__ == '__main__':
    main()
