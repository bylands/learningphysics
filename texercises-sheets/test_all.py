#!/usr/bin/env python3
"""Compile every exercise of a TeXercises export on its own (text + solution) and report failures.

    python3 test_all.py <export folder> [build dir] [-j N] [--only key1,key2]

Writes <build dir>/<key>.tex, runs pdflatex once per exercise (draft mode, in parallel) and
prints the pass rate, the failing exercises with their first error, and the most common
undefined control sequences. A missing image is not a failure (the package prints a placeholder).
"""
import os, re, sys, subprocess, collections
from concurrent.futures import ThreadPoolExecutor
from build_sheet import load, prepare

HERE = os.path.dirname(os.path.abspath(__file__))

def doc(e):
    lang = 'de' if e['meta']['language'] == 'GER' else 'en'
    return '\n'.join([
        r'\documentclass[11pt,a4paper]{article}',
        r'\usepackage[a4paper,margin=2cm]{geometry}',
        r'\usepackage[T1]{fontenc}', r'\usepackage{lmodern}',
        r'\usepackage{texercises-lp}',
        r'\begin{document}', rf'\txlang{{{lang}}}',
        r'\begingroup', r'\txinpreamble', e['preamble'], r'\txendpreamble', e['text'], r'\endgroup', r'\par\hrule\par',
        r'\begingroup', r'\txinpreamble', e['preamble'], r'\txendpreamble', e['solution'] or e['short'], r'\endgroup',
        r'\end{document}', ''])

def run(key, build):
    env = dict(os.environ, TEXINPUTS=HERE + '//:' + os.environ.get('TEXINPUTS', ''))
    try:
        subprocess.run(['pdflatex', '-interaction=nonstopmode', '-draftmode',
                        key + '.tex'], cwd=build, env=env, capture_output=True, timeout=120)
    except subprocess.TimeoutExpired:
        return key, ['timeout'], []
    log = open(os.path.join(build, key + '.log'), encoding='latin-1').read()
    errs = re.findall(r'^! (.*)$', log, re.M)
    undef = re.findall(r'^! Undefined control sequence\.\n(?:<[^>]*>|l\.\d+)[^\n]*?(\\[A-Za-z@]+) ?\n', log, re.M)
    return key, errs, undef

def main():
    args = [a for a in sys.argv[1:]]
    jobs = 8
    only = None
    if '-j' in args:
        i = args.index('-j'); jobs = int(args[i + 1]); del args[i:i + 2]
    if '--only' in args:
        i = args.index('--only'); only = set(args[i + 1].split(',')); del args[i:i + 2]
    export = args[0]
    build = os.path.abspath(args[1] if len(args) > 1 else 'build-all')
    os.makedirs(build, exist_ok=True)
    _, by_key = load(export)
    keys = sorted(k for k in by_key if not only or k in only)
    for k in keys:
        open(os.path.join(build, k + '.tex'), 'w').write(prepare(doc(by_key[k])))
    with ThreadPoolExecutor(jobs) as ex:
        res = list(ex.map(lambda k: run(k, build), keys))
    bad = [(k, e) for k, e, _ in res if e]
    print(f'passed {len(keys) - len(bad)}/{len(keys)} ({100 * (len(keys) - len(bad)) / len(keys):.1f}%)')
    for k, e in bad:
        print(f'  {k}: {e[0]}')
    first = collections.Counter(re.sub(r'\d+', 'N', e[0])[:70] for _, e in bad)
    print('\nfirst errors:')
    for m, n in first.most_common(30):
        print(f'  {n:4d}  {m}')
    und = collections.Counter(u for _, _, us in res for u in set(us))
    if und:
        print('\nundefined control sequences (exercises):')
        for m, n in und.most_common(40):
            print(f'  {n:4d}  {m}')

if __name__ == '__main__':
    main()
