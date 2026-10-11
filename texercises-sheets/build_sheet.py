#!/usr/bin/env python3
"""Turn a TeXercises collection into a LaTeX sheet: exercises, then solutions.

    python3 build_sheet.py <export folder> <collection.json> <out.tex> [options]

    --style=minion   Samuel's layout (default; Minion 3, LuaLaTeX: latexmk -lualatex)
    --style=plain    Latin Modern, pdflatex, exercise titles shown
    --author=ByS --date=09/09/2020 --footer="Exercises AC Circuits"   footer (minion; defaults: ByS,
                     today as dd/mm/yyyy (German sheets dd.mm.yyyy), "Exercises <collection title>")
    --school="MNG Rämibühl"   school name, left of the signature (empty: none)
    --font=cochineal Cochineal with newtxmath instead of Minion 3 (minion style)
    --font=modern    modern textbook look: Erewhon + Erewhon Math, Fira Sans headings, accent colour
    --numerical      print the short solutions as "Numerical Solutions" after the exercises (minion)

Images: TeXercises does not export them. The sheet looks for images/<name> next to the .tex;
<out>-images.txt lists every image the sheet uses, whether it is there, and its exercise page.

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

TEXERCISES = 'https://texercises.com'

def slug_titles(by_key):
    # /exercise/<slug>/ -> title, for the exercises in the export
    out = {}
    for e in by_key.values():
        m = re.match(r'/exercise/([^/]+)/?', e['meta'].get('info', {}).get('url', ''))
        if m: out[m.group(1)] = e['meta']['title']
    return out

def similar(additional, titles, de):
    # an "additional" text that lists TeXercises links ("Similar: texercises.com/exercise/...")
    # becomes one quiet line of linked titles; any other additional text is kept as it is
    slugs = re.findall(r'texercises\.com/exercise/([A-Za-z0-9_-]+)', additional)
    if not slugs:
        return [additional] if additional.strip() else []
    links = [rf'\href{{{TEXERCISES}/exercise/{s}/}}{{{esc(titles.get(s) or s.replace("-", " ").capitalize())}}}'
             for s in dict.fromkeys(slugs)]
    return [r'\lpsimilar{' + r'\lpsimilarsep '.join(links) + '}']

def images_used(tex):
    return re.findall(r'#image_path:([^#]+)#', tex)

def esc(s):
    return ''.join('\\' + c if c in '&%$#_{}' else c for c in s)

def options(argv):
    opts = {'short': False, 'numerical': False, 'style': 'minion', 'font': 'minion', 'author': 'ByS', 'school': 'MNG Rämibühl', 'date': None, 'footer': None}
    args = []
    for a in argv:
        if a == '--short': opts['short'] = True
        elif a == '--numerical': opts['numerical'] = True
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
        # Samuel's sheet layout (lp-minion.sty, LuaLaTeX): numbered exercises with their title
        # (a hidden link to TeXercises) and difficulty, then the full solutions
        # English sheets: dd/mm/yyyy; German sheets: dd.mm.yyyy
        date = o['date'] or datetime.date.today().strftime('%d.%m.%Y' if de else '%d/%m/%Y')
        footer = esc(o['footer']) if o['footer'] else ('Übungen ' if de else 'Exercises ') + title
        L = [r'% !TeX program = lualatex',
             r'\documentclass[10pt,a4paper]{article}',
             rf'\usepackage[{"ngerman" if de else "english"}]{{babel}}',
             r'\usepackage{texercises-lp}', r'\usepackage' + ({'cochineal': '[cochineal]', 'modern': '[modern]'}.get(o['font'], '')) + '{lp-minion}',
             rf'\lpsetfooter{{{footer}}}{{{esc(date)}}}{{{esc(o["author"])}}}',
             rf'\lpsetschool{{{esc(o["school"])}}}',
             r'\begin{document}',
             rf'\txlang{{{"de" if de else "en"}}}',
             rf'\lptitle{{{title}}}']
        titles = slug_titles(by_key)
        def head(it, e):
            url = TEXERCISES + e['meta'].get('info', {}).get('url', '')
            diff = it.get('difficulty') or e['meta'].get('default_difficulty') or 0
            return [rf'\def\txexurl{{{url}}}\lpextitle{{{url}}}{{{esc(e["meta"]["title"])}}}{{{diff}}}']
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
        L += listed([(n, head(it, e) + quiet(e, e['text']) + similar(it.get('additional', ''), titles, de))
                     for n, (it, e) in enumerate(items, 1)], 'lpex')
        nums = [(n, e) for n, (it, e) in enumerate(items, 1) if e['short'].strip()]
        if nums and o['numerical'] and not o['short']:
            L.append(r'\begin{lpnumerical}')
            for n, e in nums:
                L += [r'{\lpquietpreamble', e['preamble'], r'\lpendquietpreamble' + rf'\lpnum{{{n}}}{{{e["short"].strip()}}}}}']
            L.append(r'\end{lpnumerical}')
        L += [r'\newpage', rf'\lptitle{{{title}}}', rf'\lpsection{{{"Lösungen" if de else "Solutions"}}}']
        heads = {}
        L += listed([(n, head(it, e) + quiet(e, body(e))) for n, (it, e) in enumerate(items, 1)], 'lpsol')
    else:
        sys.exit(f'unknown style {o["style"]} (minion, plain)')
    L.append(r'\end{document}')
    open(out, 'w').write(prepare('\n'.join(L)) + '\n')
    # images: TeXercises does not export them; list what the sheet needs and what is missing
    need = {}
    for it, e in items:
        for name in images_used(e['text'] + e['solution']):
            need.setdefault(name, TEXERCISES + e['meta'].get('info', {}).get('url', ''))
    imgdir = os.path.join(os.path.dirname(os.path.abspath(out)), 'images')
    have = lambda n: any(os.path.exists(os.path.join(imgdir, n + x)) for x in ('', '.png', '.pdf', '.jpg', '.jpeg'))
    missing = {n: u for n, u in need.items() if not have(n)}
    if need:
        lst = os.path.splitext(out)[0] + '-images.txt'
        open(lst, 'w').write(''.join(f'{n}\t{"missing" if n in missing else "ok"}\t{u}\n' for n, u in sorted(need.items())))
        print(f'images: {len(need)} used, {len(missing)} missing in {imgdir} (list: {lst})')
    print(f'{out}: {len(items)} exercises, style {o["style"]}' + ('' if o['style'] == 'plain' else ' (lualatex)'))

if __name__ == '__main__':
    main()
