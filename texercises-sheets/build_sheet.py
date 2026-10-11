#!/usr/bin/env python3
"""Turn a TeXercises collection into a LaTeX sheet: exercises, then solutions.

    python3 build_sheet.py <export folder> <collection.json> <out.tex> [options]

    --style=minion   Samuel's layout (default; Minion 3, LuaLaTeX: latexmk -lualatex)
    --style=plain    Latin Modern, pdflatex, exercise titles shown
    --author=By --date=09.09.20 --footer="Exercises AC Circuits"   footer (minion; defaults: By,
                     today, "Exercises <collection title>")

The export folder is a TeXercises bundle (exercises/<key>/...); the collection lists items by
"exercise" (a key) or "exercise_id". Each exercise runs in its own group, so its \\NewQty and
\\SolQty names do not leak into the next one; the solutions part runs the preamble again.
--short prints the short solutions instead of the full ones.
"""
import json, os, re, sys, glob, datetime

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

def options(argv):
    opts = {'short': False, 'style': 'minion', 'author': 'By', 'date': None, 'footer': None}
    args = []
    for a in argv:
        if a == '--short': opts['short'] = True
        elif a.startswith('--') and '=' in a:
            k, v = a[2:].split('=', 1)
            if k not in opts: sys.exit(f'unknown option --{k}')
            opts[k] = v
        else: args.append(a)
    if len(args) != 3: sys.exit(__doc__)
    return args, opts

def main():
    (export, coll_path, out), o = options(sys.argv[1:])
    by_id, by_key = load(export)
    coll = json.load(open(coll_path))
    items = []
    for it in coll['items']:
        e = by_key.get(it.get('exercise')) or by_id.get(it.get('exercise_id'))
        if not e: sys.exit(f'not in the export: {it}')
        items.append((it, e))
    heads = {c['first']: c['title'] for c in coll.get('containers', [])}
    de = sum(e['meta']['language'] == 'GER' for _, e in items) > len(items) / 2
    title = esc(coll['title'])
    lang = lambda e: 'de' if e['meta']['language'] == 'GER' else 'en'
    pre = lambda e: [r'\txinpreamble', e['preamble'], r'\txendpreamble']
    body = lambda e: (e['short'] if o['short'] else e['solution']) or e['short']
    if o['style'] == 'plain':
        L = [r'\documentclass[11pt,a4paper]{article}',
             r'\usepackage[a4paper,margin=2cm]{geometry}',
             r'\usepackage[T1]{fontenc}', r'\usepackage{lmodern}',
             r'\usepackage{texercises-lp}',
             r'\setlength\parindent{0pt}\setlength\parskip{0.5ex}',
             r'\begin{document}',
             rf'\txlang{{{"de" if de else "en"}}}',
             rf'{{\Large\bfseries {title}}}\par\medskip']
        def block(n, it, e, text, with_extra):
            out = [rf'\subsection*{{{n}.\ {esc(e["meta"]["title"])}}}', r'\begingroup', rf'\txlang{{{lang(e)}}}',
                   *pre(e), text]
            if with_extra and it.get('additional'):
                out.append(it['additional'])
            return out + [r'\endgroup']
        for n, (it, e) in enumerate(items, 1):
            if n in heads: L.append(rf'\section*{{{esc(heads[n])}}}')
            L += block(n, it, e, e['text'], True)
        L += [r'\newpage', rf'\section*{{{"Lösungen" if de else "Solutions"}}}']
        for n, (it, e) in enumerate(items, 1):
            L += block(n, it, e, body(e), False)
    elif o['style'] == 'minion':
        # Samuel's sheet layout (lp-minion.sty, LuaLaTeX): numbered exercises without titles,
        # the short solutions as "Numerical Solutions" in small print, then the full solutions
        date = o['date'] or datetime.date.today().strftime('%d.%m.%y')
        footer = esc(o['footer']) if o['footer'] else ('Übungen ' if de else 'Exercises ') + title
        L = [r'% !TeX program = lualatex',
             r'\documentclass[10pt,a4paper]{article}',
             rf'\usepackage[{"ngerman" if de else "english"}]{{babel}}',
             r'\usepackage{texercises-lp}', r'\usepackage{lp-minion}',
             rf'\lpsetfooter{{{footer}}}{{{esc(date)}}}{{{esc(o["author"])}}}',
             r'\begin{document}',
             rf'\txlang{{{"de" if de else "en"}}}',
             rf'\lptitle{{{title}}}']
        def listed(parts, series):
            # parts: (n, lines); sections between the items close and reopen the list
            out, first, open_ = [], True, False
            for n, lines in parts:
                if n in heads:
                    if open_: out.append(r'\end{lpexercises}'); open_ = False
                    out.append(rf'\lpsection{{{esc(heads[n])}}}')
                if not open_:
                    out.append(r'\begin{lpexercises}[' + ('series=' if first else 'resume=') + series + ']')
                    first, open_ = False, True
                out += [r'\item', r'\begingroup'] + lines + [r'\endgroup']
            if open_: out.append(r'\end{lpexercises}')
            return out
        # in a list item the solver part must not print anything, not even a paragraph break
        quiet = lambda e, text: [rf'\txlang{{{lang(e)}}}\lpquietpreamble', e['preamble'],
                                 r'\lpendquietpreamble\relax ' + text.strip()]
        L += listed([(n, quiet(e, e['text']) + ([it['additional']] if it.get('additional') else []))
                     for n, (it, e) in enumerate(items, 1)], 'lpex')
        nums = [(n, e) for n, (it, e) in enumerate(items, 1) if e['short'].strip()]
        if nums and not o['short']:
            L.append(r'\begin{lpnumerical}')
            for n, e in nums:
                L += [r'{\lpquietpreamble', e['preamble'], r'\lpendquietpreamble' + rf'\lpnum{{{n}}}{{{e["short"].strip()}}}}}']
            L.append(r'\end{lpnumerical}')
        L += [r'\newpage', rf'\lptitle{{{title}}}', rf'\lpsection{{{"Lösungen" if de else "Solutions"}}}']
        heads = {}
        L += listed([(n, quiet(e, body(e))) for n, (it, e) in enumerate(items, 1)], 'lpsol')
    else:
        sys.exit(f'unknown style {o["style"]} (minion, plain)')
    L.append(r'\end{document}')
    open(out, 'w').write(prepare('\n'.join(L)) + '\n')
    print(f'{out}: {len(items)} exercises, style {o["style"]}' + ('' if o['style'] == 'plain' else ' (lualatex)'))

if __name__ == '__main__':
    main()
