#!/usr/bin/env python3
"""Build pool.json: for every app of the hub, the TeXercises exercises that practise its learning
objectives. A first pass by keywords, meant to be reviewed: pool.md lists the result readably.

    python3 hub-admin/sheets/build_pool.py <TeXercises export folder> [--fails list.txt]

Sources: the export's exercises by one creator (OWN, "by"), and the drafts in this repository
(texercises-drafts*/, written for the apps; an exercise of a draft collection <app>-... belongs
to that app). An exercise belongs to an app if its title, text, solution, tags or sub-branches
match the app's pattern (or it is a draft of the app); it practises an objective if it matches the
objective's patterns. Per objective the best few are kept, preferring drafts of the app, exercises
without images and those that compile (--fails: keys that do not, as test_all.py lists them).
Only keys, titles and objectives go into pool.json; the exercises themselves never enter this
(public) repository: the server gets them from the export uploaded in the admin panel.
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OWN = 'by'
PER_OBJECTIVE = 6      # exercises kept per objective
PER_APP = 14           # exercises kept for an app as a whole (sets that name no objectives)

# app: (pattern an exercise must match to belong to the app, {objective: pattern})
# patterns are case-insensitive, over title + tags + sub-branches + text + solution (LaTeX source)
RULES = {
    'bulb-brightness': (r'\b(bulbs?|lamps?|glühbirne|glühlampe|lämpchen|lampen?)\b', {
        'current': r'same current|not used up|current (is|stays) the same|gleiche[rn]? strom|strom.{0,20}gleich|junction',
        'power': r'bright|hell|power|leistung',
        'change': r'short.?circuit|kurzschluss|remov|add(ed|ing)? (a|another) (bulb|lamp)|unscrew|ausgeschraubt|herausgedreht'}),
    'circuit-trainer': (r'resist(or|ance)|widerstand', {
        'divide': r'voltage divider|spannungsteiler|potentiometer|in ratio|im verhältnis|partial voltage|teilspannung',
        'combine': r'equivalent resistance|total resistance|ersatzwiderstand|gesamtwiderstand|in parallel|parallel geschaltet|combination',
        'backwards': r'(find|determine|calculate|bestimme|berechne)\w* (the )?(unknown )?(resistance|widerstand)|unknown resist',
        'meters': r'ammeter|voltmeter|amperemeter|multimeter|measuring device|messgerät|internal resistance of the (am|volt)'}),
    'potential-circuit': (r'circuit|stromkreis|schaltung', {
        'track': r'potential (at|of) (the )?point|potentials? of the points|potentialverlauf|potential.{0,30}(point|punkt) [a-e]\b',
        'rules': r'kirchhoff|loop rule|junction rule|maschenregel|knotenregel|knotenpunkt',
        'voltage': r'potential difference between|voltage between (the )?points|spannung zwischen den punkten'}),
    'capacitors': (r'capacitor|kondensator|capacitance|kapazität', {
        'combine': r'in series|in parallel|series connection|parallel connection|in serie|parallel geschaltet|equivalent capacitance|ersatzkapazität',
        'sketch': r'charg(ing|ed)|discharg|aufgeladen|entlad|ladevorgang',
        'tau': r'time constant|zeitkonstante|half.?life|halbwertszeit|\\tau\b|\brc\b|r\s*\\cdot\s*c'}),
    'impedance': (r'impedance|impedanz|reactance|blindwiderstand|ac circuit|wechselstromkreis|\brlc\b|\blcr\b', {
        'elements': r'phase shift|phasenverschiebung|lags|leads|reactance|blindwiderstand|phasor|zeiger',
        'limits': r'high frequenc|low frequenc|hohe frequenz|tiefe frequenz|filter|tiefpass|hochpass|treble|bass|tone control',
        'resonance': r'resonan'}),
    'rl-switch': (r'(inductor|coil|spule|inductance|induktivität).{0,400}(switch|schalter)|(switch|schalter).{0,400}(inductor|coil|spule)', {
        'keep': r'right after|immediately after|unmittelbar nach|sofort nach|cannot (jump|change)',
        'after': r'(closed|opened|geschlossen|geöffnet)',
        'steady': r'long after|steady|stationär|after a long time|nach langer zeit'}),
    'torque': (r'torque|drehmoment|lever|hebel', {
        'arm': r'lever arm|hebelarm|torque|drehmoment',
        'weight': r'centre of mass|center of mass|schwerpunkt|own weight|eigengewicht',
        'balance': r'equilibrium|gleichgewicht|balance|hält.{0,20}gleichgewicht'}),
    'centre-of-mass': (r'centre of mass|center of mass|schwerpunkt|massenmittelpunkt', {
        'locate': r'locate|position of the cent|lage des schwerpunkt|where is the cent|coordinates? of the cent',
        'stability': r'\bstable|\bstabil|labil|unstable|indifferent|neutral equilibrium',
        'tipping': r'\btip|kipp'}),
    'coulomb': (r'coulomb|point charges?|punktladung|electrostatic force|elektrostatische kraft|charged (balls|spheres|pendul)', {
        'direction': r'direction|richtung|attract|repel|anzieh|abstoß',
        'factor': r'factor|halv|doubl|percent|prozent|ratio|verhältnis|verdoppel|halbier|times (as )?(large|great)',
        'vector': r'net force|resultant|resultierende|three (point )?charges|drei ladungen|square|quadrat|triangle|dreieck|vector|vektor|vanish',
        'field': r'electric field|elektrische[sn]? feld|e\s*=\s*\\frac\{?f'}),
    'coe': (r'energ', {
        'forms': r'kinetic|potential energy|kinetische|lageenergie|spannenergie|elastic|energy forms|energieform',
        'balance': r'conservation of energy|energy conservation|energieerhaltung|energiesatz|energy balance',
        'path': r'friction|reibung|independent of the path|wegunabhängig|lifting work|hubarbeit',
        'turn': r'bungee|turning point|umkehrpunkt|maximum compression|maximale stauchung'}),
    'force-concepts': (r'newton|net force|resultierende kraft|inertia|trägheit|kräftegleichgewicht', {
        'first': r'inertia|trägheit|constant velocity|konstante[rn]? geschwindigkeit|first law|erstes newton',
        'balanced': r'balanced|kräftegleichgewicht|equilibrium of forces',
        'second': r'f\s*=\s*m\s*(\\cdot\s*)?a|second law|zweites newton|aktionsprinzip|grundgesetz',
        'centre': r'circular motion|kreisbewegung|centripetal|zentripetal'}),
    'interaction': (r'third law|newton.s third|drittes newton|actio|reactio|wechselwirkungsprinzip|interaction pair|reaction force|gegenkraft', {
        'equal': r'equal(ly)? (large|in magnitude)|gleich gross|same (magnitude|size)',
        'partner': r'partner|force pairs?|kräftepaar|reaction force|gegenkraft',
        'normal': r'normal force|normalkraft'}),
    'force-systems': (r'(force|kraft|kräfte).{0,600}(slope|incline|schiefe ebene|friction|reibung|rope|seil|spring|feder|pulley|rolle|lift|elevator)', {
        'forces': r'free.?body|force diagram|kräftediagramm|draw (all|the) forces|zeichne.{0,30}kräfte|einzeichnen',
        'slope': r'incline|slope|schiefe[nr]? ebene|hangabtrieb',
        'system': r'rope|seil|tension|pulley|rolle|coupled|gekoppelt|wagon|anhänger',
        'law': r'acceleration|beschleunigung',
        'spring': r'spring|feder',
        'drag': r'air resistance|luftwiderstand|terminal|drag|sinkgeschwindigkeit'}),
    'induction-match': (r'induc|indukt|magnetic flux|magnetischer fluss|\\phi|lenz', {
        'flux': r'flux|fluss',
        'slope': r'induced voltage|induzierte spannung|emf|induction voltage|induktionsspannung',
        'change': r'loop|leiterschleife|rotat|moving|bewegt|rotier',
        'lenz': r'lenz|direction of the induced|richtung des induzierten'}),
    'motion-data': (r'value table|wertetabelle|messwerte|stroboscop|strobo', {
        'instant': r'\bposition|\bort\b|time interval|zeitintervall|instant|zeitpunkt',
        'convert': r'graph|diagramm|s\(t\)',
        'uniform': r'uniform|gleichförmig|gleichmässig beschleunigt|constant acceleration'}),
    'motion-graphs': (r'(s|x|v|a)\s*\(\s*t\s*\)|motion (graph|diagram)|bewegungsdiagramm|velocity.time|position.time', {
        'slope': r'slope|steigung|tangent',
        'negative': r'negative velocity|negative geschwindigkeit|backwards|zurück',
        'sketch': r'sketch|skizz|draw|zeichne',
        'uniform': r'uniformly accelerated|gleichmässig beschleunigt|parabola|parabel|constant acceleration'}),
    'motion-areas': (r'area under|fläche unter|v\s*\(\s*t\s*\)', {
        'area': r'area|fläche|displacement|strecke|distance',
        'farther': r'farther|ahead|overtake|überhol|catch up|einholen',
        'mean': r'mean velocity|average velocity|mittlere geschwindigkeit|durchschnittsgeschwindigkeit',
        'sketch': r'sketch|skizz|draw|zeichne'}),
    'oscillations': (r'harmonic|harmonisch|oscillat|schwing|pendulum|pendel', {
        'circle': r'circular motion|kreisbewegung|projection|projektion|phase angle|phasenwinkel|unit circle',
        'harmonic': r'harmonic|harmonisch|restoring|rückstell|\\omega|angular frequency|kreisfrequenz|period|periode',
        'extremes': r'maximum (speed|velocity|acceleration)|maximale[rn]? (geschwindigkeit|beschleunigung)|largest speed|equilibrium position|ruhelage',
        'lc': r'\blc\b|schwingkreis|oscillating circuit|lc.circuit|capacitor.{0,200}coil'}),
    'cyclic-processes': (r'isobar|isochor|isotherm|adiabat|kreisprozess|cyclic process|p\s*\(\s*v\s*\)|pv.diagram|p.v.diagramm|gas law|gasgesetz', {
        'states': r'state|zustand|temperature at|pressure at',
        'identify': r'isobar|isochor|isotherm',
        'sketch': r'sketch|skizz|draw|zeichne|diagram'}),
    'wave-propagation': (r'wave|welle', {
        'medium': r'rope|seil|string|saite|wave speed|ausbreitungsgeschwindigkeit|propagat',
        'reflect': r'reflect|reflexion|reflektiert|fixed end|free end|festes ende|loses ende',
        'superpose': r'superpos|überlager|interfer',
        'standing': r'standing wave|stehende welle|\bnodes?\b|knoten|antinode|bauch|fundamental|grundton|harmonic|oberton'}),
    'interference': (r'interfer|diffract|beugung|slit|spalt|grating|gitter|huygens|resolv', {
        'huygens': r'huygens|diffraction|beugung|single slit|einzelspalt|elementarwelle',
        'maxima': r'double slit|doppelspalt|grating|gitter|maxim|path difference|gangunterschied',
        'changes': r'slit width|spaltbreite|slit (spacing|separation)|spaltabstand|if the wavelength|wenn die wellenlänge',
        'resolve': r'resolv|auflös|rayleigh|1[.,]22|telescope|teleskop|pupil'}),
    'electric-field': (r'electric field|elektrische[sn]? feld|field lines|feldlinien|dipole|dipol|equipotential', {
        'sketch': r'field lines|feldlinien|sketch|skizz',
        'read': r'field strength|feldstärke|direction of the field|richtung des feldes|stronger|stärker',
        'dipole': r'dipole|dipol',
        'equi': r'equipotential|äquipotential'}),
    'electric-potential': (r'potential|potenzial', {
        'quantities': r'potential energy|potentielle energie|lageenergie|electric potential|elektrisches potential',
        'uniform': r'uniform (electric )?field|homogene[sn]? feld|plate capacitor|plattenkondensator|parallel plates|between the plates',
        'point': r'point charge|punktladung',
        'energy': r'gain|loses|gewinnt|verliert|work done by the (electric )?field|arbeit des feldes'}),
    'magnetic-forces': (r'magnetic|magnetisch|lorentz|solenoid|spule', {
        'lines': r'field lines|feldlinien|right.hand|rechte.hand|grip rule',
        'wire': r'current.carrying|wire|leiter|conductor|i\s*\\cdot\s*l\s*\\cdot\s*b|ilb',
        'charge': r'electron|proton|moving charge|bewegte ladung|particle|teilchen|ion\b',
        'coil': r'coil|motor|loudspeaker|lautsprecher|moving.coil|drehspul|torque',
        'pair': r'parallel (wires|currents|conductors|leiter)|two (long )?(straight )?wires|zwei (parallele )?leiter'}),
    'charged-particles': (r'electron|proton|alpha|ion\b|charged particle|geladene[sn]? teilchen', {
        'accel': r'accelerat\w* (by|through|with) (a|the)? ?(voltage|potential)|acceleration voltage|beschleunigungsspannung|electronvolt|\\electronvolt|\bev\b',
        'work': r'no work|keine arbeit|speed (remains|stays) constant|kinetic energy (remains|stays)',
        'radius': r'radius|circular path|kreisbahn|cyclotron|zyklotron|mass spectrometer|massenspektro',
        'crossed': r'velocity selector|geschwindigkeitsfilter|wien|hall|crossed|gekreuzt|undeflected|unabgelenkt'}),
    'em-waves': (r'electromagnetic wave|elektromagnetische welle|em wave|light|licht|radio|microwave|x.ray|uv|infrared', {
        'dirs': r'direction of propagation|ausbreitungsrichtung|poynting|e\s*=\s*c\s*(\\cdot\s*)?b|magnetic field (of|in) the wave',
        'speed': r'refractive index|brechungsindex|in glass|in water|im glas|im wasser|medium|speed of light|lichtgeschwindigkeit',
        'spectrum': r'spectrum|spektrum|x.ray|röntgen|ultraviolet|infrared|infrarot|radio|microwave|gamma'}),
    'photons': (r'photon|photoelectric|photoeffekt|photoelektrisch|work function|austrittsarbeit', {
        'wave': r'wave model|wellenmodell|classical|klassisch|cannot be explained',
        'einstein': r'work function|austrittsarbeit|stopping (voltage|potential)|gegenspannung|kinetic energy of the (photo)?electrons|h\s*\\cdot\s*f',
        'threshold': r'threshold|grenzfrequenz|cut.?off|grenzwellenlänge|minimum frequency',
        'rate': r'photons per second|number of photons|photonen pro|anzahl (der )?photonen|photon flux|intensity|intensität|power of the (laser|lamp)'}),
    'matter-waves': (r'de broglie|matter wave|materiewelle|wave function|wellenfunktion|\\psi|potential well|potentialtopf|box', {
        'debroglie': r'de broglie|matter wave|materiewelle|electron diffraction|elektronenbeugung',
        'box': r'\bbox\b|potential well|potentialtopf|infinite well|quantis|energy levels?|energieniveau',
        'psi': r'probability|wahrscheinlichkeit|\|\\psi|wave function|wellenfunktion|uncertaint|unschärfe|expectation value|erwartungswert'}),
}

# an exercise of the export must also have one of these sub-branches (TeXercises') to belong to the
# app; the drafts written for an app need not
MECH = {'Kinematics', 'Dynamics', 'Work, Energy, Power', 'Circular Motion', 'Gravitation/Celestial mechanics',
        'Lever', 'Rotation', 'Momentum', 'Projectile Motion', 'Hydrostatics'}
CIRC = {'Direct Current', 'Circuits'}
SUBS = {
    'bulb-brightness': CIRC, 'circuit-trainer': CIRC, 'potential-circuit': CIRC,
    'capacitors': CIRC | {'Electrostatics', 'Electrodynamics'}, 'impedance': CIRC | {'Electrodynamics', 'Forced Oscillations'},
    'rl-switch': CIRC | {'Electrodynamics'}, 'torque': MECH, 'centre-of-mass': MECH, 'coe': MECH | {'Harmonic Oscillations'},
    'force-concepts': MECH, 'interaction': MECH, 'force-systems': MECH, 'motion-data': {'Kinematics'},
    'motion-graphs': {'Kinematics'}, 'motion-areas': {'Kinematics'},
    'oscillations': {'Harmonic Oscillations', 'Damped Oscillations', 'Forced Oscillations'},
    'cyclic-processes': {'Gas Laws', 'Laws of Thermodynamics', 'Temperatur & Heat'},
    'wave-propagation': {'Mechanical Waves', 'Acoustics'}, 'interference': {'Interference', 'Diffraction', 'Electromagnetic Waves'},
    'coulomb': {'Electrostatics'}, 'electric-field': {'Electrostatics'}, 'electric-potential': {'Electrostatics'},
    'magnetic-forces': {'Magnetism', 'Electrodynamics'}, 'charged-particles': {'Electrostatics', 'Magnetism', 'Electrodynamics'},
    'induction-match': {'Electrodynamics', 'Magnetism'}, 'em-waves': {'Electromagnetic Waves'},
    'photons': {'quantum physics'}, 'matter-waves': {'quantum physics'},
}


def read(d, n):
    p = os.path.join(d, n)
    return open(p, encoding='utf-8').read() if os.path.exists(p) else ''


def exercises(export):
    """(key, meta, source, haystack, images) for the own exercises of the export and the drafts."""
    out = []
    for d in sorted(glob.glob(os.path.join(export, 'exercises', '*'))):
        j = json.load(open(os.path.join(d, 'exercise.json'), encoding='utf-8'))
        if j.get('info', {}).get('creator') != OWN:
            continue
        out.append((os.path.basename(d), j, 'export', d))
    for bundle in sorted(glob.glob(os.path.join(ROOT, 'texercises-drafts*'))):
        for d in sorted(glob.glob(os.path.join(bundle, 'exercises', '*'))):
            j = json.load(open(os.path.join(d, 'exercise.json'), encoding='utf-8'))
            out.append((os.path.basename(d), j, 'drafts', d))
    return out


def draft_apps():
    """draft exercise key -> app, from the drafts' collections (<app>-problems, <app>-more)."""
    owner = {}
    for f in glob.glob(os.path.join(ROOT, 'texercises-drafts*', 'collections', '*.json')):
        app = re.sub(r'-(problems|more)$', '', os.path.basename(f)[:-5])
        app = {'energy-conservation': 'coe'}.get(app, app)
        for it in json.load(open(f, encoding='utf-8')).get('items', []):
            if it.get('exercise'):
                owner[it['exercise']] = app
    return owner


def main():
    args = sys.argv[1:]
    fails = set()
    if '--fails' in args:
        i = args.index('--fails')
        fails = {l.split()[0].rstrip(':') for l in open(args[i + 1]) if l.startswith('  ')}
        del args[i:i + 2]
    export = args[0]
    objectives = json.load(open(os.path.join(ROOT, 'hub', 'objectives.json'), encoding='utf-8'))
    owner = draft_apps()
    pool = {}
    for key, meta, source, d in exercises(export):
        text = read(d, 'text.tex')
        hay = ' '.join([meta.get('title', ''), ' '.join(meta.get('tags', [])), ' '.join(meta.get('subbranches', [])),
                        text, read(d, 'solution.tex')]).lower()
        title = meta.get('title', '').lower()
        if key in fails:
            continue
        images = '#image_path:' in text
        for app, (gate, objs) in RULES.items():
            mine = owner.get(key) == app
            if not mine and (not re.search(gate, hay, re.I | re.S)
                             or not SUBS.get(app, set()) & set(meta.get('subbranches', []))):
                continue
            hits = {}
            for ob, pat in objs.items():
                n = len(re.findall(pat, hay, re.I)) + 3 * len(re.findall(pat, title, re.I))
                if n:
                    hits[ob] = n
            if not hits and not mine:
                continue
            score = sum(min(n, 6) for n in hits.values()) + (6 if mine else 0) - (4 if images else 0)
            pool.setdefault(app, []).append({
                'key': key, 'source': source, 'title': meta.get('title', ''),
                'lang': 'de' if meta.get('language') == 'GER' else 'en',
                'difficulty': meta.get('default_difficulty') or 1, 'images': images,
                'url': meta.get('info', {}).get('url', ''), 'hits': hits, 'score': score})
    out = {'_about': 'Built by build_pool.py: for every app, its exercises and the objectives each practises. '
                     'Review and edit by hand: move a key between objectives, or delete it.', 'apps': {}}
    md = ['# Exercise pool for the exercise sheets', '',
          'For each app and learning objective, the exercises a sheet may take (built by `build_pool.py`;',
          'edit `pool.json`). ★ difficulty, 🖼 has an image (not in the export: a placeholder on the sheet).', '']
    for app, entry in objectives.items():
        cands = sorted(pool.get(app, []), key=lambda e: -e['score'])
        keep, objs = {}, {}
        for ob in [o['id'] for o in entry.get('objectives', [])]:
            best = [e for e in sorted(cands, key=lambda e: (-e['hits'].get(ob, 0) * 2 - e['score'])) if e['hits'].get(ob)]
            objs[ob] = [e['key'] for e in best[:PER_OBJECTIVE]]
            for e in best[:PER_OBJECTIVE]:
                keep[e['key']] = e
        for e in cands[:PER_APP]:
            keep[e['key']] = e
        exs = sorted(keep.values(), key=lambda e: -e['score'])
        out['apps'][app] = {
            'objectives': objs,
            'exercises': {e['key']: {k: e[k] for k in ('source', 'title', 'lang', 'difficulty', 'images', 'url')} for e in exs}}
        md += [f'## {app}', '']
        for o in entry.get('objectives', []):
            md.append(f'- **{o["id"]}**: {o["en"]}')
            for k in objs[o['id']]:
                e = keep[k]
                md.append(f'  - {e["title"]} ({e["lang"]}, {"★" * e["difficulty"]}{" 🖼" if e["images"] else ""}) `{k}`')
            if not objs[o['id']]:
                md.append('  - (none found)')
        rest = [e for e in exs if not any(e['key'] in v for v in objs.values())]
        if rest:
            md.append('- *for the app as a whole:* ' + '; '.join(f'{e["title"]} `{e["key"]}`' for e in rest))
        md.append('')
    json.dump(out, open(os.path.join(HERE, 'pool.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(HERE, 'pool.md'), 'w', encoding='utf-8').write('\n'.join(md))
    n = sum(len(a['exercises']) for a in out['apps'].values())
    empty = [f'{a}/{o}' for a, v in out['apps'].items() for o, ks in v['objectives'].items() if not ks]
    print(f'pool.json: {len(out["apps"])} apps, {n} entries; objectives without exercises: {len(empty)}')
    if empty:
        print('  ' + ', '.join(empty))


if __name__ == '__main__':
    main()
