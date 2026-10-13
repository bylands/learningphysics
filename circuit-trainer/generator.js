// Random series-parallel resistor circuits with worked solutions.
//
// A circuit is a tree: leaves are resistors, inner nodes are series (S) or parallel (P)
// combinations, and the root is connected to the battery. Values are exact fractions in
// V, kΩ and mA (V = kΩ·mA); the battery voltage is chosen so that every current and
// voltage is a multiple of 0.5. A rule-based solver (Ohm's law, series and parallel
// rules) decides whether the unknowns can be found from the givens, and its derivation
// becomes the worked solution.
(function (root) {
  'use strict';

  const Circuit = root.Circuit || require('./circuit.js');
  // The page language (lang.js, shared by the apps); English where it is not loaded.
  const Lang = root.Lang || (typeof require === 'function' ? require('./lang.js') : null);
  const L = (en, de) => (Lang ? Lang.L(en, de) : en);
  const de = () => !!Lang && Lang.get() === 'de';
  const M = String.raw;
  const RS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  const MAX_WIDTH = 15; // diagram width in drawing units

  const LEVELS = {
    easy: { name: () => L('Easy', 'Einfach'), n: [2, 3], V: [4, 40], depth: 1, inverse: 0.4, hidden: [1, 1], hideV: 0, targets: [1, 2], steps: [1, 5] },
    medium: { name: () => L('Medium', 'Mittel'), n: [3, 5], V: [6, 80], depth: 2, compact: true, inverse: 0.7, hidden: [1, 1], hideV: 0.3, targets: [2, 2], steps: [3, 9] },
    hard: { name: () => L('Hard', 'Schwierig'), n: [5, 7], V: [6, 120], depth: 3, compact: true, inverse: 1, hidden: [1, 2], hideV: 0.5, targets: [3, 3], steps: [7, 18] },
  };

  // ---------------------------------------------------------------- random numbers
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    return {
      next, int,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    };
  }

  // ---------------------------------------------------------------- exact fractions
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  function F(n, d = 1) {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    return { n: n / g, d: d / g };
  }
  const fadd = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const fsub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => F(a.n * b.n, a.d * b.d);
  const fdiv = (a, b) => F(a.n * b.d, a.d * b.n);
  const fval = (f) => f.n / f.d;

  // Numbers with a decimal point (in both languages).
  function fmt(x) {
    const s = Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x))
      : Math.abs(x) >= 1 ? String(parseFloat(x.toFixed(2))) : String(parseFloat(x.toPrecision(2)));
    return s;
  }

  // Decimal if it terminates within two places, otherwise a fraction.
  function ftex(f) {
    if (f.d === 1 || (100 % f.d === 0)) return fmt(fval(f));
    return M`\tfrac{${f.n}}{${f.d}}`;
  }

  // ---------------------------------------------------------------- circuit tree
  function buildTree(n, parentT, r) {
    if (n === 1) return { t: 'R' };
    const t = parentT === 'S' ? 'P' : parentT === 'P' ? 'S' : r.pick(['S', 'P']);
    const k = r.int(2, Math.min(n, 3));
    const parts = new Array(k).fill(1);
    for (let i = k; i < n; i++) parts[r.int(0, k - 1)]++;
    return { t, kids: parts.map((m) => buildTree(m, t, r)) };
  }

  // Series elements can be reordered freely. For the whole circuit, put half of the plain
  // resistors before the groups (drawn on the top wire) and half after (bottom wire).
  function arrangeRoot(tree) {
    if (tree.t !== 'S') return tree;
    const leaves = tree.kids.filter((k) => k.t === 'R'), groups = tree.kids.filter((k) => k.t !== 'R');
    if (!groups.length) return tree;
    const nTop = Math.ceil(leaves.length / 2);
    tree.kids = [...leaves.slice(0, nTop), ...groups, ...leaves.slice(nTop)];
    return tree;
  }

  const depth = (node) => (node.t === 'R' ? 0 : 1 + Math.max(...node.kids.map(depth)));

  function index(rootNode) {
    const nodes = [], leaves = [];
    (function walk(node, parent) {
      node.id = nodes.length;
      node.parent = parent;
      nodes.push(node);
      if (node.t === 'R') { leaves.push(node); node.idx = leaves.length; node.leaves = [node.idx]; return; }
      node.kids.forEach((k) => walk(k, node));
      node.leaves = node.kids.flatMap((k) => k.leaves);
    })(rootNode, null);
    return { nodes, leaves };
  }

  function resistance(node) {
    if (node.t === 'R') return node.R;
    const rs = node.kids.map(resistance);
    node.R = node.t === 'S' ? rs.reduce(fadd) : fdiv(F(1), rs.reduce((s, x) => fadd(s, fdiv(F(1), x)), F(0)));
    return node.R;
  }

  function flow(node, V, I) {
    node.V = V; node.I = I;
    if (node.t === 'S') node.kids.forEach((k) => flow(k, fmul(I, k.R), I));
    if (node.t === 'P') node.kids.forEach((k) => flow(k, V, fdiv(V, k.R)));
  }

  // Choose resistor values and a battery voltage so that all voltages and currents are nice.
  function assignValues(c, lv, r) {
    for (const leaf of c.leaves) leaf.R = F(r.pick(RS));
    resistance(c.root);
    flow(c.root, F(1), fdiv(F(1), c.root.R));
    let whole = 1, half = 1;
    for (const node of c.nodes) {
      for (const f of [node.V, node.I]) {
        whole = lcm(whole, f.d);
        half = lcm(half, f.d / gcd(f.d, 2));
      }
    }
    const [lo, hi] = lv.V;
    const options = (step) => { const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v); return out; };
    let choices = options(whole);
    if (!choices.length) choices = options(half);
    if (!choices.length) return false;
    const V = F(r.pick(choices));
    for (const node of c.nodes) { node.V = fmul(node.V, V); node.I = fmul(node.I, V); }
    return c.nodes.every((node) => fval(node.I) >= 0.5 && fval(node.I) <= 100 && fval(node.V) >= 0.5);
  }

  // ---------------------------------------------------------------- symbolic solver
  // Quantity keys: 'R3', 'I3', 'V3' for node id 3. Node 0 is the whole circuit (battery).
  // Each relation is an equation between quantities; `out` lists the keys it may be solved
  // for, `w` is the cost of using it in a solution (divider rules are cheapest, so they are
  // preferred), and `holds(g)` checks the equation numerically (used by the tests).
  // Divider rules only relate two resistors of the same group (V4/V5 = R4/R5, I4/I5 = R5/R4),
  // never a part to the whole.
  const W = { eqI: 0.2, eqV: 0.2, vratio: 1, iratio: 1, sumR: 1, invR: 1.2, sumV: 1.4, sumI: 1.4, ohm: 1.8 };
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

  function relations(c) {
    const rels = [];
    const add = (rel) => {
      if (!(rel.rule in W)) throw new Error(`no cost for rule ${rel.rule}`);
      rels.push({ out: rel.keys, ...rel, w: W[rel.rule] });
    };
    const R = (n) => 'R' + n.id, V = (n) => 'V' + n.id, I = (n) => 'I' + n.id;
    for (const node of c.nodes) {
      add({ kind: 'ohm', rule: 'ohm', node, keys: [V(node), I(node), R(node)], holds: (g) => near(g(V(node)), g(I(node)) * g(R(node))) });
      if (node.t === 'R') continue;
      const kids = node.kids, rs = kids.map(R);
      const pairs = [];
      kids.forEach((a, i) => kids.slice(i + 1).forEach((b) => pairs.push([a, b])));
      if (node.t === 'S') {
        for (const k of kids) {
          add({ kind: 'eq', rule: 'eqI', q: 'I', parent: node, child: k, keys: [I(node), I(k)], holds: (g) => near(g(I(node)), g(I(k))) });
        }
        for (const [a, b] of pairs) {
          add({ kind: 'ratio', rule: 'vratio', q: 'V', parent: node, a, b, keys: [V(a), V(b), R(a), R(b)],
            holds: (g) => near(g(V(a)) * g(R(b)), g(V(b)) * g(R(a))) });
        }
        add({ kind: 'sum', rule: 'sumR', q: 'R', parent: node, keys: [R(node), ...rs], holds: (g) => near(g(R(node)), rs.reduce((sum, r) => sum + g(r), 0)) });
        add({ kind: 'sum', rule: 'sumV', q: 'V', parent: node, keys: [V(node), ...kids.map(V)], holds: (g) => near(g(V(node)), kids.reduce((sum, k) => sum + g(V(k)), 0)) });
      } else {
        const inv = (g) => rs.reduce((sum, r) => sum + 1 / g(r), 0);
        for (const k of kids) {
          add({ kind: 'eq', rule: 'eqV', q: 'V', parent: node, child: k, keys: [V(node), V(k)], holds: (g) => near(g(V(node)), g(V(k))) });
        }
        for (const [a, b] of pairs) {
          add({ kind: 'ratio', rule: 'iratio', q: 'I', parent: node, a, b, keys: [I(a), I(b), R(a), R(b)],
            holds: (g) => near(g(I(a)) * g(R(a)), g(I(b)) * g(R(b))) });
        }
        add({ kind: 'inv', rule: 'invR', q: 'R', parent: node, keys: [R(node), ...rs], holds: (g) => near(1 / g(R(node)), inv(g)) });
        add({ kind: 'sum', rule: 'sumI', q: 'I', parent: node, keys: [I(node), ...kids.map(I)], holds: (g) => near(g(I(node)), kids.reduce((sum, k) => sum + g(I(k)), 0)) });
      }
    }
    return rels;
  }

  // Cheapest derivation of every quantity that follows from `givens` (cost of a derivation =
  // cost of its relation + costs of its inputs). Positive costs keep derivations acyclic.
  function plan(rels, givens) {
    const cost = new Map([...givens].map((k) => [k, 0]));
    const best = new Map();
    for (let changed = true; changed;) {
      changed = false;
      for (const rel of rels) {
        for (const key of rel.out) {
          if (givens.has(key)) continue;
          const from = rel.keys.filter((k) => k !== key);
          if (!from.every((k) => cost.has(k))) continue;
          const c = rel.w + from.reduce((sum, k) => sum + cost.get(k), 0);
          if (!cost.has(key) || c < cost.get(key) - 1e-9) {
            cost.set(key, c);
            best.set(key, { key, rel, from });
            changed = true;
          }
        }
      }
    }
    return { known: new Set(cost.keys()), best };
  }

  // The steps needed for the targets, goal by goal: each target is preceded by its prerequisites.
  function neededSteps(best, targets) {
    const out = [], seen = new Set();
    const visit = (k) => {
      const s = best.get(k);
      if (!s || seen.has(k)) return;
      seen.add(k);
      s.from.forEach(visit);
      out.push(s);
    };
    targets.forEach(visit);
    return out;
  }

  // ---------------------------------------------------------------- problem selection
  // A circuit is padded if part of it could be replaced by a single resistor without changing
  // the exercise: a group in which nothing is measured or asked for, or several plain given
  // resistors in the same group whose currents and voltages play no role.
  function padded(c, givens, targets) {
    const involved = (node) => (node.t === 'R'
      ? targets.includes('R' + node.id) || ['I', 'V'].some((q) => givens.has(q + node.id) || targets.includes(q + node.id))
      : node.kids.some(involved));
    return c.nodes.some((node) => node.t !== 'R' && (
      (node !== c.root && !involved(node)) ||
      node.kids.filter((k) => k.t === 'R' && !involved(k)).length >= 2));
  }


  // Quantities in reading order: battery first, then by resistor number (R before I before V).
  const byReading = (a, b) => [a, b].map((k) => Number(k.slice(1)) * 3 + 'RIV'.indexOf(k[0])).reduce((x, y) => x - y);

  function chooseProblem(c, lv, r) {
    const rels = relations(c);
    const leafKeys = (q) => c.leaves.map((l) => q + l.id);
    const inverse = r.next() < lv.inverse;
    const nTargets = r.int(lv.targets[0], lv.targets[1]);
    let givens = new Set([...leafKeys('R'), 'V0']);
    const targets = [];

    if (inverse) {
      const hidden = r.shuffle(c.leaves.slice()).slice(0, r.int(lv.hidden[0], lv.hidden[1]));
      for (const leaf of hidden) { givens.delete('R' + leaf.id); targets.push('R' + leaf.id); }
      if (r.next() < lv.hideV) { givens.delete('V0'); targets.push('V0'); }
    }
    const extra = r.shuffle([...leafKeys('I'), ...leafKeys('V'), 'I0']);
    while (targets.length < nTargets && extra.length) targets.push(extra.pop());
    targets.splice(nTargets);
    if (!targets.length) return null;
    targets.sort(byReading);

    const solvable = (g) => { const k = plan(rels, g).known; return targets.every((t) => k.has(t)); };
    if (!solvable(givens)) {
      const measured = r.shuffle([...leafKeys('I'), ...leafKeys('V'), 'I0'].filter((k) => !targets.includes(k)));
      const added = [];
      for (const m of measured) {
        givens.add(m); added.push(m);
        if (solvable(givens)) break;
      }
      if (!solvable(givens)) return null;
      for (const m of r.shuffle(added)) {
        givens.delete(m);
        if (!solvable(givens)) givens.add(m);
      }
    }

    if (lv.compact && padded(c, givens, targets)) return null;
    const needed = neededSteps(plan(rels, givens).best, targets);
    if (needed.length < lv.steps[0] || needed.length > lv.steps[1]) return null;
    // A target that is just a given under another name (same current in series, ...) is too trivial.
    for (const t of targets) {
      let st = needed.find((x) => x.key === t);
      while (st && st.rel.kind === 'eq') {
        if (givens.has(st.from[0])) return null;
        st = needed.find((x) => x.key === st.from[0]);
      }
    }
    return { givens, targets, steps: needed };
  }

  // ---------------------------------------------------------------- naming and text
  const UNIT_TEX = { V: M`\mathrm{V}`, I: M`\mathrm{mA}`, R: M`\mathrm{k\Omega}` };
  const UNIT = { V: 'V', I: 'mA', R: 'kΩ' };

  function namer(c, targets) {
    const nodeOf = (key) => c.nodes[Number(key.slice(1))];
    const valueOf = (key) => nodeOf(key)[key[0]];
    const range = (node) => {
      const [a, b] = [node.leaves[0], node.leaves[node.leaves.length - 1]];
      return node.leaves.length <= 3 ? node.leaves.join('') : M`${a}\text{–}${b}`;
    };
    // Voltage is V in English and U in German, as in the textbooks; lang 'en' gives the English
    // symbol in any case (the names in the tutorial paths).
    const sym = (key, lang) => {
      const node = nodeOf(key), en = lang === 'en' || !de();
      const q = key[0] === 'V' && !en ? 'U' : key[0];
      if (node === c.root) return q === 'R' ? (en ? M`R_\text{tot}` : M`R_\text{ges}`) : q;
      return `${q}_{${node.t === 'R' ? node.idx : range(node)}}`;
    };
    const qtex = (key) => `${ftex(valueOf(key))}\\,${UNIT_TEX[key[0]]}`;
    const res = (key) => (targets.includes(key) ? `\\htmlClass{result}{${qtex(key)}}` : qtex(key));
    const who = (node) => {
      if (node === c.root) return L('the battery', 'die Batterie');
      if (node.t === 'R') return `$R_{${node.idx}}$`;
      return node.t === 'S' ? L(`the series combination $${sym('R' + node.id)}$`, `die Serieschaltung $${sym('R' + node.id)}$`)
        : L(`the parallel combination $${sym('R' + node.id)}$`, `die Parallelschaltung $${sym('R' + node.id)}$`);
    };
    return { nodeOf, valueOf, sym, qtex, res, who };
  }

  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const al = (...lines) => M`$$\begin{aligned}` + lines.join(M` \\ `) + M`\end{aligned}$$`;
  const listing = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${L('and', 'und')} ${items[items.length - 1]}`);

  function structure(c, nm) {
    const parts = [];
    (function walk(node) {
      if (node.t === 'R') return;
      node.kids.forEach(walk);
      const kids = listing(node.kids.map((k) => `$${nm.sym('R' + k.id)}$`));
      const name = node === c.root ? L(`the whole circuit, $${nm.sym('R0')}$`, `die ganze Schaltung, $${nm.sym('R0')}$`) : `$${nm.sym('R' + node.id)}$`;
      parts.push(node.t === 'S' ? L(`${kids} are in series (${name})`, `${kids} sind in Serie (${name})`) : L(`${kids} are in parallel (${name})`, `${kids} sind parallel (${name})`));
    })(c.root);
    return parts;
  }

  // The rules, as in “follows from …” (German: dative).
  const RULE = () => ({
    ohm: L("Ohm's law", 'dem ohmschen Gesetz'),
    eqI: L('the series rule (same current)', 'der Serieregel (gleicher Strom)'),
    eqV: L('the parallel rule (same voltage)', 'der Parallelregel (gleiche Spannung)'),
    vratio: L('the voltage divider rule (voltages in the ratio of the resistances)', 'der Spannungsteilerregel (Spannungen im Verhältnis der Widerstände)'),
    iratio: L('the current divider rule (currents in the inverse ratio of the resistances)', 'der Stromteilerregel (Ströme im umgekehrten Verhältnis der Widerstände)'),
    sumR: L('adding the series resistances', 'dem Addieren der Serienwiderstände'),
    invR: L('combining the parallel resistances', 'dem Zusammenfassen der Parallelwiderstände'),
    sumV: L('the voltage rule (voltages in series add up)', 'der Maschenregel (Spannungen in Serie addieren sich)'),
    sumI: L('the junction rule (currents in parallel add up)', 'der Knotenregel (Ströme parallel addieren sich)'),
    vdiv: L('the voltage divider rule (share of the total voltage)', 'der Spannungsteilerregel (Anteil an der Gesamtspannung)'),
  });
  const SHORT = () => ({
    ohm: L("Ohm's law", 'ohmsches Gesetz'), eqI: L('series', 'Serie'), eqV: L('parallel', 'parallel'),
    vratio: L('voltage divider', 'Spannungsteiler'), iratio: L('current divider', 'Stromteiler'), sumR: L('series resistances', 'Serienwiderstände'),
    invR: L('parallel resistances', 'Parallelwiderstände'), sumV: L('voltage rule', 'Maschenregel'), sumI: L('junction rule', 'Knotenregel'), vdiv: L('voltage divider', 'Spannungsteiler'),
  });
  const ruleOf = (rel) => rel.rule;

  // A solution step in parts: intro sentence, symbolic equation lhs = rhs, the same with numbers
  // (num) and the result. Equality steps are a single sentence (inline).
  function stepParts(step, nm) {
    const { key, rel } = step;
    const q = key[0], s = nm.sym, qt = nm.qtex;
    const out = { lhs: s(key), res: nm.res(key) };
    if (rel.kind === 'ohm') {
      const n = rel.node, V = 'V' + n.id, I = 'I' + n.id, R = 'R' + n.id;
      out.intro = n === nm.nodeOf('R0') ? L("Ohm's law for the whole circuit:", 'Ohmsches Gesetz für die ganze Schaltung:') : L(`Ohm's law for ${nm.who(n)}:`, `Ohmsches Gesetz für ${nm.who(n)}:`);
      if (q === 'V') return { ...out, rhs: M`${s(I)}\,${s(R)}`, num: M`${qt(I)}\times${qt(R)}` };
      if (q === 'I') return { ...out, rhs: M`\frac{${s(V)}}{${s(R)}}`, num: M`\frac{${qt(V)}}{${qt(R)}}` };
      return { ...out, rhs: M`\frac{${s(V)}}{${s(I)}}`, num: M`\frac{${qt(V)}}{${qt(I)}}` };
    }
    if (rel.kind === 'eq') {
      const other = step.from[0];
      const what = rel.q === 'I' ? L('carry the same current (series connection)', 'führen denselben Strom (Serieschaltung)')
        : L('are at the same voltage (parallel connection)', 'liegen an derselben Spannung (Parallelschaltung)');
      return { ...out, rhs: s(other), inline: `${cap(nm.who(rel.child))} ${L('and', 'und')} ${nm.who(rel.parent)} ${what}: $${s(key)} = ${s(other)} = ${nm.res(key)}$.` };
    }
    if (rel.kind === 'vdiv') {
      const Rk = 'R' + rel.child.id, Vp = 'V' + rel.parent.id, rs = rel.parent.kids.map((k) => 'R' + k.id);
      out.intro = L(`Voltage divider rule: ${listing(rs.map((r) => `$${s(r)}$`))} are in series, so they share $${s(Vp)}$ in the ratio of their resistances:`,
        `Spannungsteilerregel: ${listing(rs.map((r) => `$${s(r)}$`))} sind in Serie, teilen sich also $${s(Vp)}$ im Verhältnis ihrer Widerstände:`);
      return { ...out, rhs: M`\frac{${s(Rk)}}{${rs.map(s).join(' + ')}}\,${s(Vp)}`, num: M`\frac{${qt(Rk)}}{${rs.map(qt).join(' + ')}}\times ${qt(Vp)}`, split: true };
    }
    if (rel.kind === 'ratio') {
      const { a, b } = rel, Ra = 'R' + a.id, Rb = 'R' + b.id;
      const volt = rel.q === 'V';
      const x = [rel.q + a.id, rel.q + b.id], y = volt ? [Ra, Rb] : [Rb, Ra];
      out.intro = volt
        ? L(`Voltage divider rule: $${s(Ra)}$ and $${s(Rb)}$ are in series, so their voltages are in the ratio of their resistances, $${s(x[0])}/${s(x[1])} = ${s(Ra)}/${s(Rb)}$. Hence`,
          `Spannungsteilerregel: $${s(Ra)}$ und $${s(Rb)}$ sind in Serie, ihre Spannungen stehen also im Verhältnis ihrer Widerstände, $${s(x[0])}/${s(x[1])} = ${s(Ra)}/${s(Rb)}$. Somit`)
        : L(`Current divider rule: $${s(Ra)}$ and $${s(Rb)}$ are in parallel, so their currents are in the inverse ratio of their resistances, $${s(x[0])}/${s(x[1])} = ${s(Rb)}/${s(Ra)}$. Hence`,
          `Stromteilerregel: $${s(Ra)}$ und $${s(Rb)}$ sind parallel, ihre Ströme stehen also im umgekehrten Verhältnis ihrer Widerstände, $${s(x[0])}/${s(x[1])} = ${s(Rb)}/${s(Ra)}$. Somit`);
      // x0/x1 = y0/y1, solved for the unknown as num/den · mul
      const [n, d, m] = key === x[0] ? [y[0], y[1], x[1]] : key === x[1] ? [y[1], y[0], x[0]]
        : key === y[0] ? [x[0], x[1], y[1]] : [x[1], x[0], y[0]];
      return { ...out, rhs: M`\frac{${s(n)}}{${s(d)}}\,${s(m)}`, num: M`\frac{${qt(n)}}{${qt(d)}}\times ${qt(m)}` };
    }
    const P = rel.q + rel.parent.id;
    const kids = rel.parent.kids.map((k) => rel.q + k.id);
    const names = listing(rel.parent.kids.map((k) => `$${s('R' + k.id)}$`));
    if (rel.kind === 'inv') {
      if (key === P) {
        const f = (h) => M`\left(${kids.map((k) => M`\frac{1}{${h(k)}}`).join('+')}\right)^{-1}`;
        return { ...out, intro: L(`${names} are in parallel:`, `${names} sind parallel:`), rhs: f(s), num: f(qt), split: true };
      }
      const others = kids.filter((k) => k !== key);
      const f = (h) => M`\left(\frac{1}{${h(P)}} - ${others.map((k) => M`\frac{1}{${h(k)}}`).join(' - ')}\right)^{-1}`;
      return { ...out, intro: L(`The parallel resistances combine to $${s(P)}$, so`, `Die Parallelwiderstände ergeben zusammen $${s(P)}$, also`), rhs: f(s), num: f(qt), split: true };
    }
    // sums: series R, series V, parallel I
    out.intro = {
      R: key === P ? L(`${names} are in series:`, `${names} sind in Serie:`) : L(`The series resistances add up to $${s(P)}$, so`, `Die Serienwiderstände ergeben zusammen $${s(P)}$, also`),
      V: key === P ? L(`The voltages across ${names} add up (series connection):`, `Die Spannungen an ${names} addieren sich (Serieschaltung):`)
        : L(`The voltages in series add up to $${s(P)}$, so`, `Die Spannungen in Serie ergeben zusammen $${s(P)}$, also`),
      I: key === P ? L(`Junction rule: the currents through ${names} add up (parallel connection):`, `Knotenregel: Die Ströme durch ${names} addieren sich (Parallelschaltung):`)
        : L(`Junction rule: the branch currents add up to $${s(P)}$, so`, `Knotenregel: Die Zweigströme ergeben zusammen $${s(P)}$, also`),
    }[rel.q];
    const terms = key === P ? kids : [P, ...kids.filter((k) => k !== key)];
    const op = key === P ? ' + ' : ' - ';
    return { ...out, rhs: terms.map(s).join(op), num: terms.map(qt).join(op) };
  }

  function stepText(step, nm) {
    const p = stepParts(step, nm);
    if (p.inline) return p.inline;
    return p.intro + (p.split
      ? al(M`${p.lhs} &= ${p.rhs}`, M`&= ${p.num} = ${p.res}`)
      : al(M`${p.lhs} &= ${p.rhs} = ${p.num} = ${p.res}`));
  }

  // Hints, from general to specific, all derived from the worked solution.
  function makeHints(c, nm, prob, struct) {
    const { steps, targets, givens } = prob;
    const byKey = new Map(steps.map((st) => [st.key, st]));
    // Follow "same current / same voltage" steps back to where a quantity really comes from.
    const origin = (key) => {
      let st = byKey.get(key);
      while (st.rel.kind === 'eq' && byKey.has(st.from[0])) st = byKey.get(st.from[0]);
      return st;
    };
    const $ = (k) => `$${nm.sym(k)}$`;
    const formula = (st) => { const p = stepParts(st, nm); return `$\\displaystyle ${p.lhs} = ${p.rhs}$`; };
    const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    const hints = [`${L('Break the circuit down', 'Zerlege die Schaltung')}: ${struct.join('; ')}.`];

    const plan = targets.map((t) => {
      const st = origin(t);
      const via = byKey.get(t).rel.kind === 'eq' ? L(` (it equals ${$(st.key)})`, ` (gleich ${$(st.key)})`) : '';
      const all = st.from.every((k) => givens.has(k));
      return L(`${$(t)}${via} follows from ${RULE()[st.rel.rule]}, ${all ? 'directly from the given' : 'using'} ${listing(st.from.map($))}.`,
        `${$(t)}${via} folgt aus ${RULE()[st.rel.rule]}, ${all ? 'direkt aus den gegebenen Grössen' : 'mit'} ${listing(st.from.map($))}.`);
    });
    hints.push(`${L('Plan for each unknown', 'Plan für jede Unbekannte')}:${list(plan)}`);

    const real = steps.filter((st) => st.rel.kind !== 'eq');
    const first = real.slice(0, 3).map((st) => `${formula(st)} &nbsp;(${SHORT()[st.rel.rule]})`);
    hints.push(`${L('First steps', 'Erste Schritte')}:${list(first)}`);

    // Values of the intermediate quantities that the final steps rely on.
    const inputs = new Set(targets.flatMap((t) => origin(t).from));
    const key = real.filter((st) => !targets.includes(st.key) && !givens.has(st.key));
    const chosen = [...key.filter((st) => inputs.has(st.key)), ...key.filter((st) => !inputs.has(st.key))].slice(0, 3)
      .sort((a, b) => steps.indexOf(a) - steps.indexOf(b));
    if (chosen.length) hints.push(`${L('Check your intermediate results', 'Prüfe deine Zwischenresultate')}: ${listing(chosen.map((st) => `$${nm.sym(st.key)} = ${nm.qtex(st.key)}$`))}.`);
    return hints;
  }

  function describeTarget(key, nm) {
    const q = key[0], node = nm.nodeOf(key), s = nm.sym(key);
    // German: accusative (“Bestimme …”)
    if (node === nm.nodeOf('R0')) return q === 'V' ? L('the battery voltage $V$', 'die Batteriespannung $U$') : L('the battery current $I$', 'den Batteriestrom $I$');
    if (q === 'R') return L(`the resistance $${s}$`, `den Widerstand $${s}$`);
    if (q === 'I') return L(`the current $${s}$ through $R_{${node.idx}}$`, `den Strom $${s}$ durch $R_{${node.idx}}$`);
    return L(`the voltage $${s}$ across $R_{${node.idx}}$`, `die Spannung $${s}$ an $R_{${node.idx}}$`);
  }

  // ---------------------------------------------------------------- drawing
  const UNITS = (label) => Circuit.textWidth(label) / Circuit.S;

  // Labels of a node. known(key) tells whether a value is shown; unknown targets show their symbol.
  function labels(c, nm, prob, node, known) {
    const lab = (key) => {
      if (known(key)) return `${fmt(fval(nm.valueOf(key)))} ${UNIT[key[0]]}`;
      return prob.targets.includes(key) ? `$${nm.sym(key)}$` : null;
    };
    const rKey = 'R' + node.id;
    const r = known(rKey) ? `$${nm.sym(rKey)}$ = ${fmt(fval(node.R))} kΩ` : `$${nm.sym(rKey)}$ = ?`;
    return { r, i: lab('I' + node.id), v: lab('V' + node.id) };
  }
  const givenOnly = (prob) => (key) => prob.givens.has(key);
  const all = () => true;

  // Layout in the style of the textbook diagrams: parallel branches are vertical columns
  // between a top and a bottom rail, series parts inside a branch are stacked vertically.
  // Plain resistors before the first group run along the top wire, those after the last
  // group along the bottom wire. Layout y grows downwards; current flows top → bottom in
  // vertical blocks.
  const LEAF_H = 2.3, COL_GAP = 0.25, X0 = 1.1;
  // the distance of a meter across a resistor from it: beside a vertical one, above or below a
  // horizontal one
  const BRIDGE = { v: 0.8, h: 1.0 };
  // a meter across the battery: left of it, beyond its voltage
  const BAT_BRIDGE = 2.2;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function labelWidths(node, c, nm, prob) {
    const w = (k) => Math.max(...[givenOnly(prob), all].map((known) => { const l = labels(c, nm, prob, node, known)[k]; return l ? UNITS(l) : 0; }));
    return { r: w('r'), i: w('i'), v: w('v') };
  }

  // Horizontal resistor on the top or bottom wire.
  function measureH(leaf, c, nm, prob) {
    const lw = labelWidths(leaf, c, nm, prob);
    // The current label sits beside the downstream lead and must clear the end of the voltage arc.
    leaf.hw = Math.max(3, lw.r + 0.9, lw.v + 0.8, (0.53 + lw.i / 2) / 0.32);
  }

  // Vertical block: terminals at the top and bottom of its attach column, ax from its left edge.
  // Each vertical resistor is as wide as its own labels need (col(leaf): { left, right } of its
  // wire); stacked parts line up on a common wire.
  function measureV(node, col) {
    if (node.t === 'R') {
      const { left, right } = col(node);
      node.vl = { ax: left, w: left + right, h: LEAF_H };
      return node.vl;
    }
    const kids = node.kids.map((k) => measureV(k, col));
    if (node.t === 'S') {
      const ax = Math.max(...kids.map((k) => k.ax));
      node.vl = { ax, w: Math.max(...kids.map((k) => ax - k.ax + k.w)), h: kids.reduce((sum, k) => sum + k.h, 0) };
    } else {
      node.cols = [];
      let x = 0;
      for (const k of kids) { node.cols.push(x); x += k.w + COL_GAP; }
      node.vl = { ax: kids[0].ax, w: x - COL_GAP, h: Math.max(...kids.map((k) => k.h)) };
    }
    return node.vl;
  }

  function layout(c, nm, prob) {
    let top = [], bottom = [], middle;
    if (c.root.t === 'P') {
      middle = c.root;
    } else {
      const kids = c.root.kids;
      const groups = kids.map((k, i) => (k.t === 'R' ? -1 : i)).filter((i) => i >= 0);
      if (!groups.length) {
        top = kids;
      } else {
        const a = groups[0], b = groups[groups.length - 1];
        top = kids.slice(0, a);
        bottom = kids.slice(b + 1);
        middle = a === b ? kids[a] : { t: 'S', kids: kids.slice(a, b + 1) };
      }
    }
    [...top, ...bottom].forEach((leaf) => measureH(leaf, c, nm, prob));
    if (middle) {
      measureV(middle, (leaf) => {
        const lw = labelWidths(leaf, c, nm, prob), b = c.bridges && c.bridges.get(leaf.id);
        // a meter across the resistor (meters below): its wire and reading on the left
        return { left: Math.max(0.85 + lw.v, b == null ? 0 : BRIDGE.v + 0.45 + b), right: 0.4 + Math.max(lw.r, lw.i) };
      });
    }
    const topW = top.reduce((sum, l) => sum + l.hw, 0), bottomW = bottom.reduce((sum, l) => sum + l.hw, 0);
    // Bottom-wire resistors start left of the column's labels, and leave room for the battery wire.
    const place = (x0) => {
      const col = x0 + topW + (middle ? 0.3 + middle.vl.ax : 0.6);
      return { x0, col, bottomStart: middle ? col - middle.vl.ax - 0.2 : col };
    };
    // x0: room for the battery current on the top wire
    let g = place(X0);
    if (g.bottomStart - bottomW < 1.2) g = place(X0 + 1.2 - (g.bottomStart - bottomW));
    const bottomY = Math.max(middle ? middle.vl.h : 0, 2.6, top.length && bottom.length ? 2.9 : 0);
    // A parallel group on the right side reaches down to the bottom wire.
    if (middle && middle.t === 'P') middle.vl.h = bottomY;
    const width = g.col + (middle ? middle.vl.w - middle.vl.ax : 0);
    return { top, bottom, middle, ...g, bottomY, width };
  }

  function drawV(s, node, x, y, lab) {
    const g = node.vl;
    lab.at.set(node.id, [[x, -y], [x + g.w, -(y + g.h)]]);
    if (node.t === 'R') {
      const cx = x + g.ax, p = [cx, -y], q = [cx, -(y + g.h)];
      const L = lab(node);
      lab.res(node, p, q, L, 'right', [-1, 0]);
      s.cur(p, q, L.i, 'right', 0.87);
      s.vol(p, q, L.v, 'left');
      return;
    }
    if (node.t === 'S') {
      let cy = y;
      for (const k of node.kids) { drawV(s, k, x + g.ax - k.vl.ax, cy, lab); cy += k.vl.h; }
      return;
    }
    const colX = (i) => x + node.cols[i] + node.kids[i].vl.ax;
    const last = node.kids.length - 1, bot = y + g.h;
    s.wire([colX(0), -y], [colX(last), -y]).wire([colX(0), -bot], [colX(last), -bot]);
    node.kids.forEach((k, i) => {
      drawV(s, k, x + node.cols[i], y, lab);
      if (k.vl.h < g.h) s.wire([colX(i), -(y + k.vl.h)], [colX(i), -bot]);
    });
  }

  // The diagram as a Sketch. view.known(key): values shown. For the tutorial also
  // view.mark: node id → 'strong' | 'light' (resistors highlighted, groups in a shaded zone) and
  // view.focus: key → 'new' | 'use' (labels highlighted); the arcade sets 'ask' for its question.
  // view.meters: [{ m: 'A' | 'V', at: node id (0: in the main line, beside the battery), across
  // (else in series), l: label, hl }]; a resistor with a meter shows no current or voltage.
  // view.slots: the spots where a meter can be placed (ids of slotsOf, see meters), drawn as
  // dashed circles, and view.slotLabel(id) their names.
  function draw(c, nm, prob, view) {
    const s = new Circuit.Sketch();
    s.autoDots = true;
    const L = c.layout, mark = view.mark || new Map(), focus = view.focus || new Map(), meters = view.meters || [];
    const meterAt = (id, across) => meters.find((m) => m.at === id && !!m.across === across);
    const at = new Map(); // node id → corners of the area of its resistors and labels
    const lab = (node, p, q) => {
      if (p) at.set(node.id, [p, q]);
      const t = labels(c, nm, prob, node, view.known);
      const f = (q, l) => (l != null && focus.has(q + node.id) ? { t: l, cls: focus.get(q + node.id) } : l);
      const metered = node !== c.root && meters.some((m) => m.at === node.id);
      return { r: f('R', t.r), i: metered ? null : f('I', t.i), v: metered ? null : f('V', t.v), hl: mark.has(node.id) };
    };
    lab.at = at;
    // A resistor from p to q, its label on side ls, with its meters: one in series after it, one
    // across it (on side out, a unit vector).
    const slots = view.slots ? new Set(view.slots) : null, slotLabel = view.slotLabel || ((id) => id);
    lab.res = (node, p, q, t, ls, out) => {
      const ser = meterAt(node.id, false), acr = meterAt(node.id, true), m = ser ? lerp(p, q, 0.55) : q;
      s.res(p, m, { l: t.r, ls, hl: t.hl });
      if (ser) s.meter(m, q, ser.m, { l: ser.l, ls, hl: ser.hl });
      const d = out[0] ? BRIDGE.v : BRIDGE.h, a = [p[0] + out[0] * d, p[1] + out[1] * d], b = [q[0] + out[0] * d, q[1] + out[1] * d];
      if (acr) s.wire(p, a).meter(a, b, acr.m, { l: acr.l, ls: out, hl: acr.hl }).wire(b, q);
      if (!slots) return;
      // in series: on the wire after the resistor's box; across: beside it, with its leads
      const length = Math.hypot(q[0] - p[0], q[1] - p[1]), free = (length - Math.min(0.9, length * 0.5)) / 2;
      if (!ser && slots.has('s' + node.id)) s.slot(lerp(q, p, free / 2 / length), 's' + node.id, slotLabel('s' + node.id));
      if (!acr && slots.has('a' + node.id)) s.slot(lerp(a, b, 0.5), 'a' + node.id, slotLabel('a' + node.id), [p, a, b, q]);
    };
    const bl = lab(c.root);
    s.wire([0, 0], [L.x0, 0]).cur([0, 0], [L.x0, 0], meterAt(0, false) ? null : bl.i, 'above');
    let x = L.x0;
    for (const leaf of L.top) {
      const p = [x, 0], q = [x + leaf.hw, 0], t = lab(leaf, [x, 0.5], [x + leaf.hw, -0.5]);
      lab.res(leaf, p, q, t, 'above', [0, 1]);
      s.cur(p, q, t.i, 'below', 1 - 0.45 / leaf.hw).vol(p, q, t.v, 'below', [0.28, 0.68]);
      x += leaf.hw;
    }
    s.wire([x, 0], [L.col, 0]);
    if (L.middle) {
      drawV(s, L.middle, L.col - L.middle.vl.ax, 0, lab);
      if (L.middle.vl.h < L.bottomY) s.wire([L.col, -L.middle.vl.h], [L.col, -L.bottomY]);
    } else {
      s.wire([L.col, 0], [L.col, -L.bottomY]);
    }
    s.wire([L.col, -L.bottomY], [L.bottomStart, -L.bottomY]);
    x = L.bottomStart;
    for (const leaf of L.bottom) {
      const p = [x, -L.bottomY], q = [x - leaf.hw, -L.bottomY], t = lab(leaf, [x, 0.5 - L.bottomY], [x - leaf.hw, -0.5 - L.bottomY]);
      lab.res(leaf, p, q, t, 'below', [0, -1]);
      s.cur(p, q, t.i, 'above', 1 - 0.45 / leaf.hw).vol(p, q, t.v, 'above', [0.28, 0.68]);
      x -= leaf.hw;
    }
    s.wire([x, -L.bottomY], [0, -L.bottomY]);
    // a meter in the main line: above the battery
    const main = meterAt(0, false), across = meterAt(0, true), bx = -BAT_BRIDGE;
    if (main) s.bat([0, -L.bottomY], [0, -L.bottomY / 2]).meter([0, -L.bottomY / 2], [0, 0], main.m, { l: main.l, ls: 'right', hl: main.hl });
    else s.bat([0, -L.bottomY], [0, 0]);
    if (across) s.wire([0, 0], [bx, 0]).meter([bx, 0], [bx, -L.bottomY], across.m, { l: across.l, ls: 'left', hl: across.hl }).wire([bx, -L.bottomY], [0, -L.bottomY]);
    if (slots && !main && slots.has('main')) s.slot([0, -Math.min(0.55, 0.22 * L.bottomY)], 'main', slotLabel('main'));
    if (slots && !across && slots.has('battery')) s.slot([bx, -L.bottomY / 2], 'battery', slotLabel('battery'), [[0, 0], [bx, 0], [bx, -L.bottomY], [0, -L.bottomY]]);
    s.vol([0, 0], [0, -L.bottomY], bl.v, 'left');
    zones(s, c, nm, view, at, [[0, 0], [L.width, -L.bottomY]]);
    return s;
  }

  // Shaded zones around the marked groups and the groups whose quantities are in focus, each
  // captioned with its resistance and the focused quantities. The zone of the whole circuit
  // spans the corners in whole, battery included; its voltage and current are labelled there.
  function zones(s, c, nm, view, at, whole) {
    const mark = view.mark || new Map(), focus = view.focus || new Map();
    const shown = new Map([...mark].filter(([id]) => c.nodes[id].t !== 'R'));
    for (const k of focus.keys()) {
      const n = nm.nodeOf(k);
      if (n.t !== 'R' && (n !== c.root || k[0] === 'R') && !shown.has(n.id)) shown.set(n.id, 'light');
    }
    const sym = (k) => nm.sym(k).replace('_\\text{tot}', '_{tot}');
    const caption = (n) => ['R' + n.id, ...(n === c.root ? [] : ['V' + n.id, 'I' + n.id].filter((k) => focus.has(k)))].map((k) => {
      const v = nm.valueOf(k), num = v.d === 1 || 100 % v.d === 0 ? fmt(fval(v)) : `${v.n}/${v.d}`; // as in the text (ftex)
      const t = view.known(k) ? `$${sym(k)}$ = ${num} ${UNIT[k[0]]}` : `$${sym(k)}$${focus.has(k) ? ' = ?' : ''}`;
      return focus.has(k) ? { t, cls: focus.get(k) } : t;
    });
    // Smaller zones first: each zone goes behind everything drawn so far.
    const nodes = [...shown.keys()].map((id) => c.nodes[id]).sort((a, b) => a.leaves.length - b.leaves.length);
    for (const n of nodes) {
      const pts = n.leaves.flatMap((idx) => at.get(c.leaves[idx - 1].id)).concat(at.get(n.id) || [], n === c.root ? whole : []);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), m = 0.3 * depth(n) - 0.15; // nested zones: room for captions
      s.zone([Math.min(...xs) - m, Math.min(...ys) - m], [Math.max(...xs) + m, Math.max(...ys) + m], shown.get(n.id), caption(n));
    }
  }

  // ---------------------------------------------------------------- exercise assembly
  // level: easy, medium, hard, or mixed (one of them at random).
  function build(level, seed) {
    const r = rng(seed);
    const lv = LEVELS[level === 'mixed' ? r.pick(['easy', 'medium', 'hard']) : level];
    for (let attempt = 0; attempt < 5000; attempt++) {
      const n = r.int(lv.n[0], lv.n[1]);
      const tree = arrangeRoot(buildTree(n, null, r));
      if (depth(tree) < lv.depth) continue;
      const c = { root: tree, ...index(tree) };
      if (!assignValues(c, lv, r)) continue;
      const prob = chooseProblem(c, lv, r);
      if (!prob) continue;
      const nm = namer(c, prob.targets);
      c.layout = layout(c, nm, prob);
      if (c.layout.width > MAX_WIDTH) continue;
      return { c, prob, nm, lv };
    }
    throw new Error(`No ${level} exercise found for seed ${seed}`);
  }

  const taskText = (targets, nm) => L(`Applying the rules for series and parallel circuits, find ${listing(targets.map((t) => describeTarget(t, nm)))} in the circuit shown.`,
    `Bestimme mit den Regeln für Serie- und Parallelschaltungen ${listing(targets.map((t) => describeTarget(t, nm)))} in der abgebildeten Schaltung.`);

  function generate(level, seed) {
    const { c, prob, nm, lv } = build(level, seed);
    const { targets, steps } = prob;
    const struct = structure(c, nm);
    const hints = makeHints(c, nm, prob, struct);
    return {
      id: `${level}-${seed}`,
      level,
      // 1–5 by the number of solution steps
      difficulty: steps.length <= 2 ? 1 : steps.length <= 4 ? 2 : steps.length <= 7 ? 3 : steps.length <= 11 ? 4 : 5,
      title: L(`Circuit with ${c.leaves.length} resistors`, `Schaltung mit ${c.leaves.length} Widerständen`),
      text: taskText(targets, nm),
      fields: targets.map((t) => ({ key: t, sym: nm.sym(t), unit: UNIT[t[0]], value: fval(nm.valueOf(t)) })),
      tol: 0.01,
      // asked: the key of an unknown to show in its own colour (the arcade's question)
      figure: (sol, asked) => `<div class="fig">${draw(c, nm, prob, { known: sol ? all : givenOnly(prob), focus: asked ? new Map([[asked, 'ask']]) : undefined }).toSVG()}</div>`,
      hints,
      solution: [`${L('Structure of the circuit', 'Aufbau der Schaltung')}: ${struct.join('; ')}.`, ...steps.map((st) => stepText(st, nm))],
      results: targets.map((t) => `$${nm.sym(t)} = ${nm.qtex(t)}$`).join(', '),
      // for tests
      circuit: c, givens: prob.givens, targets, steps,
    };
  }

  // ---------------------------------------------------------------- tutorial
  // A worked example as frames { text, figure }: the task, the structure of the circuit group
  // by group (innermost first), each solution step, and the results. In each frame the
  // diagram shows what is known so far and marks what the text talks about: the parts being
  // combined are highlighted strongly, the group they belong to lightly; the value just found
  // is highlighted (new) and the values it is found from are set in bold (use).
  const TITLE = () => ({
    ohm: L("Ohm's law", 'ohmsches Gesetz'), eqI: L('same current in series', 'gleicher Strom in Serie'), eqV: L('same voltage in parallel', 'gleiche Spannung parallel'),
    vratio: L('voltage divider rule', 'Spannungsteilerregel'), vdiv: L('voltage divider rule', 'Spannungsteilerregel'), iratio: L('current divider rule', 'Stromteilerregel'),
    sumR: L('series resistances', 'Serienwiderstände'), invR: L('parallel resistances', 'Parallelwiderstände'), sumV: L('voltage rule', 'Maschenregel'), sumI: L('junction rule', 'Knotenregel'),
  });

  // Voltage divider rule between a part of a series group and the whole group,
  // V_k = R_k / (R_a + R_b + …) · V. Only the tutorial uses it: exercises divide pairwise.
  function dividers(c) {
    const out = [];
    for (const node of c.nodes.filter((n) => n.t === 'S')) {
      const rs = node.kids.map((k) => 'R' + k.id), V = 'V' + node.id;
      for (const k of node.kids) {
        out.push({ kind: 'vdiv', rule: 'vdiv', parent: node, child: k, keys: ['V' + k.id, V, ...rs], out: ['V' + k.id],
          holds: (g) => near(g('V' + k.id) * rs.reduce((sum, r) => sum + g(r), 0), g('R' + k.id) * g(V)) });
      }
    }
    return out;
  }

  // Solution steps along a given path: a list of frames, each a list of "name:rule" (V1:vdiv,
  // I:eqI, R23:invR, …; names as in the diagram without "_", {} or \text). Every step must
  // follow from what is known by then, and the path must reach all unknowns.
  function pathSteps(c, nm, prob, path, tag) {
    const rels = [...relations(c), ...dividers(c)];
    const byName = new Map();
    for (const node of c.nodes) {
      for (const q of 'RIV') byName.set(nm.sym(q + node.id, 'en').replace(/\\text\{([^}]*)\}/g, '$1').replace(/[_{}]/g, ''), q + node.id);
    }
    const known = new Set(prob.givens);
    const out = path.map((items) => items.map((item) => {
      const [name, rule] = item.split(':'), key = byName.get(name);
      if (!key) throw new Error(`${tag}: no quantity ${name}`);
      if (known.has(key)) throw new Error(`${tag}: ${name} is already known`);
      const rel = rels.find((r) => r.rule === rule && r.out.includes(key) && r.keys.every((k) => k === key || known.has(k)));
      if (!rel) throw new Error(`${tag}: ${name} does not follow by ${rule}`);
      known.add(key);
      return { key, rel, from: rel.keys.filter((k) => k !== key) };
    }));
    const missing = prob.targets.filter((t) => !known.has(t));
    if (missing.length) throw new Error(`${tag}: the path does not reach ${missing.join(', ')}`);
    return out;
  }

  const SERIES = () => L('<b>In series</b> the same current flows through every part, and the voltages across the parts add up to the voltage across the whole.',
    '<b>In Serie</b> fliesst durch jeden Teil derselbe Strom, und die Spannungen an den Teilen addieren sich zur Spannung am Ganzen.');
  const PARALLEL = () => L('<b>In parallel</b> every branch is at the same voltage, and the branch currents add up to the current into the whole.',
    '<b>Parallel</b> liegt jeder Zweig an derselben Spannung, und die Zweigströme addieren sich zum Strom ins Ganze.');

  // path: the solution steps to show, grouped into frames (see pathSteps); by default the
  // steps of the worked solution, one per frame.
  function tutorial(level, seed, path) {
    const { c, prob, nm } = build(level, seed);
    const { givens, targets } = prob;
    const groups = path ? pathSteps(c, nm, prob, path, `tutorial ${level}-${seed}`) : prob.steps.map((st) => [st]);
    const $ = (k) => `$${nm.sym(k)}$`;
    const frames = [];
    const frame = (text, known, mark = new Map(), focus = new Map()) => {
      const set = new Set(known);
      frames.push({ text, sketch: draw(c, nm, prob, { known: (k) => set.has(k), mark, focus }) });
    };

    const given = [...givens].sort(byReading).map((k) => `$${nm.sym(k)} = ${nm.qtex(k)}$`);
    frame(`<p>${taskText(targets, nm)}</p><p>${L('Given', 'Gegeben')}: ${listing(given)}.</p>`, givens);

    const explained = new Set();
    (function walk(node) {
      if (node.t === 'R') return;
      node.kids.forEach(walk);
      const mark = new Map([[node.id, 'light'], ...node.kids.map((k) => [k.id, 'strong'])]);
      const kids = listing(node.kids.map((k) => $('R' + k.id)));
      let t = node.t === 'S' ? L(`${kids} are connected in series: `, `${kids} sind in Serie geschaltet: `) : L(`${kids} are connected in parallel: `, `${kids} sind parallel geschaltet: `);
      t += node === c.root ? L(`together they make up the whole circuit, with the total resistance ${$('R0')}.`, `Zusammen bilden sie die ganze Schaltung mit dem Gesamtwiderstand ${$('R0')}.`)
        : L(`together they act like a single resistor ${$('R' + node.id)}.`, `Zusammen wirken sie wie ein einzelner Widerstand ${$('R' + node.id)}.`);
      if (!explained.has(node.t)) t += ' ' + (node.t === 'S' ? SERIES() : PARALLEL());
      explained.add(node.t);
      frame(`<p class="step-rule">${L('Structure of the circuit', 'Aufbau der Schaltung')}</p><p>${t}</p>`, givens, mark);
    })(c.root);

    const known = new Set(givens);
    groups.forEach((group, i) => {
      const mark = new Map(), focus = new Map();
      const put = (n, m) => { if (mark.get(n.id) !== 'strong') mark.set(n.id, m); };
      for (const { key, rel, from } of group) {
        known.add(key);
        if (rel.kind === 'ohm') put(rel.node, 'strong');
        else put(rel.parent, 'light');
        if (rel.kind === 'eq') put(rel.child, 'strong');
        if (rel.kind === 'ratio') [rel.a, rel.b].forEach((n) => put(n, 'strong'));
        if (rel.kind === 'sum' || rel.kind === 'inv' || rel.kind === 'vdiv') rel.parent.kids.forEach((n) => put(n, 'strong'));
        from.forEach((k) => { if (!focus.has(k)) focus.set(k, 'use'); });
        focus.set(key, 'new');
      }
      const title = cap(listing([...new Set(group.map((st) => TITLE()[st.rel.rule]))]));
      const goal = group.some((st) => targets.includes(st.key)) ? L(' · finds one of the unknowns', ' · liefert eine der Unbekannten') : '';
      const text = group.map((st) => `<p>${stepText(st, nm)}</p>`).join('');
      frame(`<p class="step-rule">${L(`Step ${i + 1} of ${groups.length}`, `Schritt ${i + 1} von ${groups.length}`)}: ${title}${goal}</p>${text}`, known, mark, focus);
    });

    frame(`<p class="step-rule">${L('Results', 'Resultate')}</p><p>${listing(targets.map((t) => `$${nm.sym(t)} = ${nm.res(t)}$`))}</p>`,
      known, new Map(), new Map(targets.map((t) => [t, 'new'])));

    // One viewBox for all frames, so that the diagram does not jump while stepping through.
    const box = frames.reduce((b, f) => {
      const x = f.sketch.box;
      return [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])];
    }, [Infinity, Infinity, -Infinity, -Infinity]);
    return {
      id: `${level}-${seed}`,
      frames: frames.map((f) => ({ text: f.text, figure: `<div class="fig">${f.sketch.toSVG('circuit', box)}</div>` })),
      // for tests
      circuit: c, givens, targets, steps: groups.flat(),
    };
  }

  // ---------------------------------------------------------------- meters
  // Measuring with ideal meters. An ammeter goes in series (in the main line, or in the branch of a
  // resistor) and shows the current there; a voltmeter goes across a resistor (in parallel) and
  // shows its voltage. Ideal meters change nothing (an ammeter has R_A ≈ 0, a voltmeter R_V → ∞),
  // so their readings are currents and voltages the solver finds. Connected the wrong way, a
  // voltmeter in series in the main line blocks the current (an ammeter shows 0, the voltmeter the
  // battery voltage), and an ammeter across a resistor of the main line short-circuits it (it shows
  // V / (R_tot − R_k)).
  // A meter: { m: 'A' | 'V', at: node id (0: in the main line), across (else in series), key (its
  // reading as a quantity of the circuit, I3, V1, …, or null when it is wrongly connected), value }.
  const METER = () => ({ A: L('ammeter', 'Amperemeter'), V: L('voltmeter', 'Voltmeter') });
  const meterUnit = { A: 'mA', V: 'V' };
  const reading = (m) => `${fmt(m.value)} ${meterUnit[m.m]}`;
  const isHalf = (f) => Math.abs(2 * fval(f) - Math.round(2 * fval(f))) < 1e-9;
  const IDEAL = () => L(M`Ideal meters change nothing in the circuit: an ammeter has (almost) no resistance, $R_\text{A} \approx 0$, a voltmeter an (almost) infinite one, $R_\text{V} \to \infty$.`,
    M`Ideale Messgeräte verändern nichts in der Schaltung: Ein Amperemeter hat (fast) keinen Widerstand, $R_\text{A} \approx 0$, ein Voltmeter einen (fast) unendlich grossen, $R_\text{V} \to \infty$.`);

  // A circuit of the level with the meters pick(c, r) chooses ({ meters (all those in any of its
  // figures), keys (the quantities to find) }, or null when none fit), drawn with room for them.
  function meterBuild(level, r, pick) {
    const lv = LEVELS[level];
    for (let attempt = 0; attempt < 5000; attempt++) {
      const tree = arrangeRoot(buildTree(r.int(lv.n[0], lv.n[1]), null, r));
      if (depth(tree) < lv.depth) continue;
      const c = { root: tree, ...index(tree) };
      if (!assignValues(c, lv, r)) continue;
      const set = pick(c, r);
      if (!set) continue;
      const prob = { givens: new Set([...c.leaves.map((l) => 'R' + l.id), 'V0']), targets: [] };
      const nm = namer(c, set.show || set.keys);
      c.bridges = new Map();
      for (const m of set.meters.filter((x) => x.across)) c.bridges.set(m.at, Math.max(c.bridges.get(m.at) || 0, UNITS(reading(m))));
      // where a meter is to be placed: room for one across every resistor
      if (set.everywhere) for (const l of c.leaves) if (!c.bridges.has(l.id)) c.bridges.set(l.id, 0);
      c.layout = layout(c, nm, prob);
      if (c.layout.width > MAX_WIDTH) continue;
      return { c, prob, nm, set };
    }
    throw new Error('No circuit for these meters');
  }

  // What a meter in the right place shows.
  function meterWhat(m, nm) {
    const node = nm.nodeOf(m.key), s = nm.sym(m.key), R = node.t === 'R' ? `$R_{${node.idx}}$` : '';
    if (m.m === 'A' && node.id === 0) return L(`The ammeter is in the main line, in series with the battery: it shows the battery current $${s}$.`, `Das Amperemeter ist in der Hauptleitung, in Serie mit der Batterie: Es zeigt den Batteriestrom $${s}$.`);
    if (m.m === 'A') return L(`The ammeter is in series with ${R}, in its branch: it shows the current $${s}$ through ${R}.`, `Das Amperemeter ist in Serie mit ${R}, in dessen Zweig: Es zeigt den Strom $${s}$ durch ${R}.`);
    return L(`The voltmeter is connected across ${R}, in parallel to it: it shows the voltage $${s}$ across ${R}.`, `Das Voltmeter ist an ${R} angeschlossen, parallel dazu: Es zeigt die Spannung $${s}$ an ${R}.`);
  }
  const resTex = (x, unit) => M`\htmlClass{result}{${fmt(x)}\,\mathrm{${unit}}}`;

  // The circuit with the branch of leaf b cut off (a voltmeter in series there blocks it): the
  // resistances (null: no current) and the voltages of its nodes, as maps.
  function openBranch(c, b) {
    const R = new Map(), V = new Map();
    (function res(n) {
      let x;
      if (n === b) x = null;
      else if (n.t === 'R') x = n.R;
      else {
        const rs = n.kids.map(res), on = rs.filter(Boolean);
        x = n.t === 'S' ? (rs.includes(null) ? null : rs.reduce(fadd))
          : on.length ? fdiv(F(1), on.reduce((sum, y) => fadd(sum, fdiv(F(1), y)), F(0))) : null;
      }
      R.set(n, x);
      return x;
    })(c.root);
    (function volt(n, v) {
      V.set(n, v);
      if (n.t === 'R' || R.get(n) === null) return;
      if (n.t === 'P') n.kids.forEach((k) => volt(k, v));
      else { const I = fdiv(v, R.get(n)); n.kids.forEach((k) => volt(k, fmul(I, R.get(k)))); }
    })(c.root, c.root.V);
    return { R, V };
  }

  // Where a meter can go: in the main line, across the battery, and in series with or across each
  // resistor: [{ id, at, across }].
  const slotsOf = (c) => [{ id: 'main', at: 0, across: false }, { id: 'battery', at: 0, across: true },
    ...c.leaves.flatMap((n) => [{ id: 's' + n.id, at: n.id, across: false }, { id: 'a' + n.id, at: n.id, across: true }])];
  function slotName(c, id) {
    if (id === 'main') return L('in the main line, beside the battery', 'in der Hauptleitung, neben der Batterie');
    if (id === 'battery') return L('across the battery', 'parallel zur Batterie');
    const R = `R${c.nodes[Number(id.slice(1))].idx}`;
    return id[0] === 's' ? L(`in series with ${R}`, `in Serie zu ${R}`) : L(`across ${R}`, `parallel zu ${R}`);
  }
  // The node whose current a resistor shares (up through series groups), and the one whose
  // voltage it shares (up through parallel groups): a meter there measures the same.
  const topI = (n) => { while (n.parent && n.parent.t === 'S') n = n.parent; return n; };
  const topV = (n) => { while (n.parent && n.parent.t === 'P') n = n.parent; return n; };
  // Whether a voltmeter (volt) or an ammeter at spot id measures the voltage across resistor n or
  // the current through it, without changing the circuit: { ok, why (what is wrong) }.
  function placeCheck(c, n, volt, id) {
    const R = `$R_{${n.idx}}$`, opts = placeOptions(volt, R), why = (v) => opts.find((o) => o.v === v).why;
    const j = id === 'main' || id === 'battery' ? null : c.nodes[Number(id.slice(1))], Rj = j && `$R_{${j.idx}}$`;
    if (volt) {
      if (id === 'battery') return topV(n) === c.root ? { ok: true } : { ok: false, why: why('battery') };
      if (id === 'main') return { ok: false, why: why('main') };
      if (id[0] === 'a') return topV(j) === topV(n) ? { ok: true } : { ok: false, why: L(`Across ${Rj}, the voltmeter shows the voltage across ${Rj}, not the one across ${R}.`, `Parallel zu ${Rj} zeigt das Voltmeter die Spannung an ${Rj}, nicht die an ${R}.`) };
      return j === n ? { ok: false, why: why('series') } : { ok: false, why: L(`In series, the voltmeter ($R_\\text{V} \\to \\infty$) blocks the current through ${Rj}, and it does not show the voltage across ${R}.`, `In Serie sperrt das Voltmeter ($R_\\text{V} \\to \\infty$) den Strom durch ${Rj}, und es zeigt nicht die Spannung an ${R}.`) };
    }
    if (id === 'main') return topI(n) === c.root ? { ok: true } : { ok: false, why: why('main') };
    if (id === 'battery') return { ok: false, why: why('battery') };
    if (id[0] === 's') return topI(j) === topI(n) ? { ok: true } : { ok: false, why: L(`There the ammeter shows the current through ${Rj}, which is not the current through ${R}.`, `Dort zeigt das Amperemeter den Strom durch ${Rj}, und der ist nicht der Strom durch ${R}.`) };
    return j === n ? { ok: false, why: why('across') } : { ok: false, why: L(`Across ${Rj}, the ammeter ($R_\\text{A} \\approx 0$) short-circuits ${Rj}, and it does not show the current through ${R}.`, `Parallel zu ${Rj} schliesst das Amperemeter ($R_\\text{A} \\approx 0$) ${Rj} kurz, und es zeigt nicht den Strom durch ${R}.`) };
  }

  // The ways to connect a meter to measure the voltage across R (volt) or the current through it:
  // { v, html, correct, flag (the wrong idea behind it), why (what is wrong) }, the right one first.
  function placeOptions(volt, R) {
    const across = { v: 'across', html: L(`across ${R}, in parallel: connected to its two ends`, `parallel zu ${R}: an seine beiden Enden angeschlossen`) };
    const series = { v: 'series', html: L(`in series with ${R}, in its branch`, `in Serie zu ${R}, in dessen Zweig`) };
    const mainLine = { v: 'main', html: L('in series with the battery, in the main line', 'in Serie zur Batterie, in der Hauptleitung') };
    const battery = { v: 'battery', html: L('across the battery, connected to its two terminals', 'parallel zur Batterie, an ihre beiden Pole angeschlossen') };
    return volt ? [
      { ...across, correct: true },
      { ...series, flag: 'vseries', why: L(`In series, the voltmeter ($R_\\text{V} \\to \\infty$) blocks the current through ${R}; it does not show the voltage across ${R}.`, `In Serie sperrt das Voltmeter ($R_\\text{V} \\to \\infty$) den Strom durch ${R}; es zeigt nicht die Spannung an ${R}.`) },
      { ...mainLine, flag: 'vseries', why: L('In the main line, the voltmeter blocks the current of the whole circuit and shows the battery voltage.', 'In der Hauptleitung sperrt das Voltmeter den Strom der ganzen Schaltung und zeigt die Batteriespannung.') },
      { ...battery, flag: 'whole', why: L(`There it shows the battery voltage, not the share of it across ${R}.`, `Dort zeigt es die Batteriespannung, nicht deren Anteil an ${R}.`) },
    ] : [
      { ...series, correct: true },
      { ...across, flag: 'aparallel', why: L(`Across ${R}, the ammeter ($R_\\text{A} \\approx 0$) short-circuits it: the current flows through the meter instead of ${R}.`, `Parallel zu ${R} schliesst das Amperemeter ($R_\\text{A} \\approx 0$) diesen kurz: Der Strom fliesst durchs Messgerät statt durch ${R}.`) },
      { ...battery, flag: 'aparallel', why: L('Across the battery, the ammeter short-circuits it: a very large current flows.', 'Parallel zur Batterie schliesst das Amperemeter sie kurz: Es fliesst ein sehr grosser Strom.') },
      { ...mainLine, flag: 'whole', why: L(`There it shows the whole battery current, not the part of it through ${R}.`, `Dort zeigt es den ganzen Batteriestrom, nicht den Teil davon durch ${R}.`) },
    ];
  }
  // Why a meter goes where it does, and what it shows there (s = v: its reading).
  function placeWhy(volt, R, s, v) {
    return volt ? L(`A voltmeter compares the two ends of a part: it goes across ${R}, in parallel, without opening the circuit. Its resistance $R_\\text{V} \\to \\infty$ lets (almost) no current through it, so it changes nothing. Here it shows $${s} = ${v}$.`,
      `Ein Voltmeter vergleicht die beiden Enden eines Teils: Es wird parallel zu ${R} angeschlossen, ohne den Stromkreis aufzutrennen. Sein Widerstand $R_\\text{V} \\to \\infty$ lässt (fast) keinen Strom durch, also verändert es nichts. Hier zeigt es $${s} = ${v}$.`)
      : L(`The current through ${R} has to flow through the ammeter: it goes in series with ${R}, in its branch. Its resistance $R_\\text{A} \\approx 0$ changes nothing. Here it shows $${s} = ${v}$.`,
        `Der Strom durch ${R} muss durch das Amperemeter fliessen: Es kommt in Serie zu ${R}, in dessen Zweig. Sein Widerstand $R_\\text{A} \\approx 0$ verändert nichts. Hier zeigt es $${s} = ${v}$.`);
  }

  // An exercise on meters: stage 'read' (an ammeter and a voltmeter in the right places: what do
  // they show?), 'place' (how to connect a meter to measure a given current or voltage, and what
  // it shows) or 'wrong': a voltmeter in series in the main line, an ammeter across a resistor of
  // the main line (alone, or with a voltmeter rightly across another one, whose reading changes),
  // or a voltmeter in series in a parallel branch (with an ammeter rightly in the main line).
  // kinds: the kinds of 'wrong' to draw from (all if not given).
  function meters(stage, seed, kinds) {
    const r = rng(seed), level = r.next() < 0.4 ? 'easy' : 'medium';
    const wrong = kinds || ['vseries', 'ashort', 'ashortv', 'vbranch'];
    const kase = stage === 'read' || stage === 'place' ? stage : wrong[Math.floor(r.next() * wrong.length)];
    const pick = {
      // one meter, for the current through a resistor or the voltage across it (not the battery's)
      place: (c, rr) => {
        const volt = rr.next() < 0.5, n = rr.pick(c.leaves), q = volt ? 'V' : 'I';
        if (fval(n[q]) === fval(c.root[q])) return null;
        // no other resistor shows the same value without being in the same place (a spot that
        // is wrong would read right)
        const top = volt ? topV : topI;
        if (c.leaves.some((j) => top(j) !== top(n) && fval(j[q]) === fval(n[q]))) return null;
        const m = volt ? { m: 'V', at: n.id, across: true, key: 'V' + n.id, value: fval(n.V) } : { m: 'A', at: n.id, key: 'I' + n.id, value: fval(n.I) };
        return { meters: [m], keys: [m.key], n, volt, everywhere: true };
      },
      read: (c, rr) => {
        const ls = rr.shuffle(c.leaves.slice()), a = rr.next() < 0.3 ? c.root : ls[1], v = ls[0];
        const A = { m: 'A', at: a.id, key: 'I' + a.id, value: fval(a.I) }, V = { m: 'V', at: v.id, across: true, key: 'V' + v.id, value: fval(v.V) };
        return { meters: [A, V], keys: [A.key, V.key] };
      },
      // the voltmeter in the main line, an ammeter in series with a resistor
      vseries: (c, rr) => ({ meters: [{ m: 'A', at: rr.pick(c.leaves).id, key: null, value: 0 }, { m: 'V', at: 0, key: null, value: fval(c.root.V) }], keys: [] }),
      // the ammeter across a resistor of the main line
      ashort: (c, rr) => {
        const ks = c.root.t === 'S' ? c.root.kids.filter((n) => n.t === 'R') : [];
        if (!ks.length) return null;
        const k = rr.pick(ks), R = fsub(c.root.R, k.R), I = fdiv(c.root.V, R);
        // (resistances as decimals: no fractions to work with)
        if (!isHalf(I) || fval(I) > 100 || 100 % R.d || 100 % c.root.R.d) return null;
        return { meters: [{ m: 'A', at: k.id, across: true, key: null, value: fval(I) }], keys: ['R0'], show: [], k, R, I };
      },
      // the same, with a voltmeter rightly across another resistor of the main line
      ashortv: (c, rr) => {
        const ks = c.root.t === 'S' ? c.root.kids.filter((n) => n.t === 'R') : [];
        if (ks.length < 2) return null;
        const [k, j] = rr.shuffle(ks.slice()), R = fsub(c.root.R, k.R), I = fdiv(c.root.V, R), Vj = fmul(j.R, I);
        if (!isHalf(I) || fval(I) > 100 || !isHalf(Vj) || 100 % R.d || 100 % c.root.R.d) return null;
        return { meters: [{ m: 'A', at: k.id, across: true, key: null, value: fval(I) }, { m: 'V', at: j.id, across: true, key: null, value: fval(Vj) }],
          keys: ['R0'], show: [], k, j, R, I, Vj };
      },
      // a voltmeter in series in a branch of a parallel group (the whole circuit, or a part of the
      // main line), an ammeter rightly in the main line
      vbranch: (c, rr) => {
        const bs = c.leaves.filter((n) => n.parent && n.parent.t === 'P' && (n.parent === c.root || (n.parent.parent === c.root && c.root.t === 'S')));
        if (!bs.length) return null;
        const b = rr.pick(bs), g = b.parent, o = openBranch(c, b), Rp = o.R.get(c.root), Rg = o.R.get(g), I = fdiv(c.root.V, Rp), Vg = o.V.get(g);
        if (!isHalf(I) || fval(I) > 100 || !isHalf(Vg) || 100 % Rp.d || 100 % Rg.d || 100 % c.root.R.d || 100 % g.R.d) return null;
        return { meters: [{ m: 'A', at: 0, key: null, value: fval(I) }, { m: 'V', at: b.id, key: null, value: fval(Vg) }], keys: [], show: [], b, g, Rp, Rg, I, Vg };
      },
    }[kase];
    const { c, prob, nm, set } = meterBuild(level, r, pick);
    const rels = relations(c), best = plan(rels, prob.givens).best;
    const steps = neededSteps(best, set.keys);
    const struct = structure(c, nm);
    const ms = set.meters, A = ms.find((m) => m.m === 'A'), V = ms.find((m) => m.m === 'V');
    const sym = (k) => nm.sym(k), U = sym('V0'), qt = nm.qtex;
    const field = (m) => ({ key: m.m, sym: M`\text{${METER()[m.m]}}`, unit: meterUnit[m.m], value: m.value });
    const formula = (st) => { const p = stepParts(st, nm); return `$\\displaystyle ${p.lhs} = ${p.rhs}$`; };
    const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    let text, hints, solution, fields, difficulty;
    if (kase === 'read') {
      fields = [field(A), field(V)];
      text = L('The ammeter and the voltmeter in the circuit are ideal. What do they show?', 'Das Amperemeter und das Voltmeter in der Schaltung sind ideal. Was zeigen sie an?');
      const real = steps.filter((st) => st.rel.kind !== 'eq');
      hints = [`${meterWhat(A, nm)} ${meterWhat(V, nm)}`, `${L('Break the circuit down', 'Zerlege die Schaltung')}: ${struct.join('; ')}.`];
      if (real.length) hints.push(`${L('First steps', 'Erste Schritte')}:${list(real.slice(0, 3).map((st) => `${formula(st)} &nbsp;(${SHORT()[st.rel.rule]})`))}`);
      solution = [`${meterWhat(A, nm)} ${meterWhat(V, nm)} ${IDEAL()}`, `${L('Structure of the circuit', 'Aufbau der Schaltung')}: ${struct.join('; ')}.`,
        ...steps.map((st) => stepText(st, nm)),
        L(`So the ammeter shows $${sym(A.key)} = ${qt(A.key)}$, and the voltmeter $${sym(V.key)} = ${qt(V.key)}$.`, `Das Amperemeter zeigt also $${sym(A.key)} = ${qt(A.key)}$, das Voltmeter $${sym(V.key)} = ${qt(V.key)}$.`)];
      difficulty = steps.length <= 2 ? 1 : steps.length <= 4 ? 2 : 3;
    } else if (kase === 'place') {
      const m = ms[0], n = set.n, volt = set.volt, R = `$R_{${n.idx}}$`;
      fields = [{ key: 'how', place: true, meter: m.m, value: (volt ? 'a' : 's') + n.id, what: volt ? L('Where does the voltmeter go?', 'Wo kommt das Voltmeter hin?') : L('Where does the ammeter go?', 'Wo kommt das Amperemeter hin?'),
        answer: cap(`${METER()[m.m]} ${placeOptions(volt, R)[0].html}`) }, field(m)];
      text = volt ? L(`With a voltmeter, you want to measure the voltage across ${R} (highlighted). How do you connect the voltmeter, and what does it show? The meter is ideal.`,
        `Mit einem Voltmeter willst du die Spannung an ${R} (hervorgehoben) messen. Wie schliesst du das Voltmeter an, und was zeigt es an? Das Messgerät ist ideal.`)
        : L(`With an ammeter, you want to measure the current through ${R} (highlighted). How do you connect the ammeter, and what does it show? The meter is ideal.`,
          `Mit einem Amperemeter willst du den Strom durch ${R} (hervorgehoben) messen. Wie schliesst du das Amperemeter an, und was zeigt es an? Das Messgerät ist ideal.`);
      const real = steps.filter((st) => st.rel.kind !== 'eq');
      hints = [volt ? L(`A voltmeter compares the two ends of ${R}. Does it have to be part of the path of the current, or beside it?`, `Ein Voltmeter vergleicht die beiden Enden von ${R}. Muss es im Weg des Stroms liegen oder daneben?`)
        : L(`The current through ${R} has to flow through the ammeter. Where does it have to go for that?`, `Der Strom durch ${R} muss durch das Amperemeter fliessen. Wo muss es dafür hin?`),
      `${L('Break the circuit down', 'Zerlege die Schaltung')}: ${struct.join('; ')}.`];
      if (real.length) hints.push(`${L('First steps', 'Erste Schritte')}:${list(real.slice(0, 3).map((st) => `${formula(st)} &nbsp;(${SHORT()[st.rel.rule]})`))}`);
      const also = c.leaves.filter((j) => j !== n && placeCheck(c, n, volt, (volt ? 'a' : 's') + j.id).ok).map((j) => `$R_{${j.idx}}$`);
      solution = [placeWhy(volt, R, sym(m.key), qt(m.key)) + ' ' + IDEAL() + (!also.length ? '' : volt
        ? ' ' + L(`It may just as well go across ${listing(also)}, in parallel to ${R}: the same voltage is across ${also.length > 1 ? 'them' : 'it'}.`, `Es kann ebenso gut parallel zu ${listing(also)} angeschlossen werden, parallel zu ${R}: Dort liegt dieselbe Spannung.`)
        : ' ' + L(`It may just as well go in series with ${listing(also)}, in the same branch as ${R}: the same current flows there.`, `Es kann ebenso gut in Serie zu ${listing(also)} kommen, im selben Zweig wie ${R}: Dort fliesst derselbe Strom.`)), `${L('Structure of the circuit', 'Aufbau der Schaltung')}: ${struct.join('; ')}.`,
        ...steps.map((st) => stepText(st, nm)),
        volt ? L(`So the voltmeter shows $${sym(m.key)} = ${qt(m.key)}$.`, `Das Voltmeter zeigt also $${sym(m.key)} = ${qt(m.key)}$.`) : L(`So the ammeter shows $${sym(m.key)} = ${qt(m.key)}$.`, `Das Amperemeter zeigt also $${sym(m.key)} = ${qt(m.key)}$.`)];
      difficulty = steps.length <= 2 ? 1 : steps.length <= 4 ? 2 : 3;
    } else if (kase === 'vbranch') {
      const { b, g, Rp, Rg, I, Vg } = set, Rb = `$R_{${b.idx}}$`, whole = g === c.root;
      const RgS = sym('R' + g.id), VgS = sym('V' + g.id), Ip = M`I'`;
      fields = [field(A), field(V)];
      text = L('The ammeter and the voltmeter are ideal. Look closely at how they are connected: what do they show?', 'Das Amperemeter und das Voltmeter sind ideal. Schau genau, wie sie angeschlossen sind: Was zeigen sie an?');
      hints = [L('Is each meter connected the right way? An ammeter belongs in series, a voltmeter in parallel.', 'Ist jedes Messgerät richtig angeschlossen? Ein Amperemeter gehört in Serie, ein Voltmeter parallel.'),
        L(M`The voltmeter is in series with ${Rb}, in its branch. With $R_\text{V} \to \infty$, it blocks the current there: the branch drops out. What is the total resistance without it?`,
          M`Das Voltmeter ist in Serie zu ${Rb}, in dessen Zweig. Mit $R_\text{V} \to \infty$ sperrt es dort den Strom: Der Zweig fällt weg. Wie gross ist der Gesamtwiderstand ohne ihn?`),
        L(`Without a current there is no voltage across ${Rb}: the voltmeter has the whole voltage of its branch, the voltage across ${nm.who(g)}.`, `Ohne Strom gibt es keine Spannung an ${Rb}: Am Voltmeter liegt die ganze Spannung seines Zweigs, die Spannung an ${nm.who(g)}.`)];
      solution = [L(M`The ammeter is in the main line, in series with the battery: it is connected the right way and shows the battery current. The voltmeter, however, is in series with ${Rb}, in its branch. With its (almost) infinite resistance, $R_\text{V} \to \infty$, it blocks the current there: no current flows through ${Rb}, and its branch drops out of the circuit.`,
        M`Das Amperemeter ist in der Hauptleitung, in Serie zur Batterie: Es ist richtig angeschlossen und zeigt den Batteriestrom. Das Voltmeter aber ist in Serie zu ${Rb}, in dessen Zweig. Mit seinem (fast) unendlich grossen Widerstand, $R_\text{V} \to \infty$, sperrt es dort den Strom: Durch ${Rb} fliesst kein Strom, und sein Zweig fällt aus der Schaltung.`),
      (whole ? L(`Without the branch of ${Rb}, the circuit has the resistance`, `Ohne den Zweig von ${Rb} hat die Schaltung den Widerstand`) + al(M`R' &= ${ftex(Rp)}\,\mathrm{k\Omega}`) + L(`instead of $${RgS} = ${qt('R' + g.id)}$.`, `statt $${RgS} = ${qt('R' + g.id)}$.`)
        : L(`Without the branch of ${Rb}, ${nm.who(g)} has the resistance $${RgS}' = ${ftex(Rg)}\\,\\mathrm{k\\Omega}$ instead of $${RgS} = ${qt('R' + g.id)}$, and the whole circuit`, `Ohne den Zweig von ${Rb} hat ${nm.who(g)} den Widerstand $${RgS}' = ${ftex(Rg)}\\,\\mathrm{k\\Omega}$ statt $${RgS} = ${qt('R' + g.id)}$, und die ganze Schaltung`)
          + al(M`R' &= ${sym('R0')} - ${RgS} + ${RgS}' = ${qt('R0')} - ${qt('R' + g.id)} + ${ftex(Rg)}\,\mathrm{k\Omega} = ${ftex(Rp)}\,\mathrm{k\Omega}`)),
      L('The ammeter shows the battery current', 'Das Amperemeter zeigt den Batteriestrom') + al(M`${Ip} &= \frac{${U}}{R'} = \frac{${qt('V0')}}{${ftex(Rp)}\,\mathrm{k\Omega}} = ${resTex(fval(I), 'mA')}`),
      (whole ? L(M`Without a current there is no voltage across ${Rb} ($V = R\,I = 0$), so the voltmeter has the whole voltage of its branch, the battery voltage: it shows $${U} = ${resTex(fval(Vg), 'V')}$.`,
        M`Ohne Strom gibt es keine Spannung an ${Rb} ($U = R\,I = 0$), also liegt am Voltmeter die ganze Spannung seines Zweigs, die Batteriespannung: Es zeigt $${U} = ${resTex(fval(Vg), 'V')}$.`)
        : L(M`Without a current there is no voltage across ${Rb} ($V = R\,I = 0$), so the voltmeter has the whole voltage of its branch, the voltage across ${nm.who(g)}:`, M`Ohne Strom gibt es keine Spannung an ${Rb} ($U = R\,I = 0$), also liegt am Voltmeter die ganze Spannung seines Zweigs, die Spannung an ${nm.who(g)}:`)
          + al(M`${VgS}' &= ${RgS}' \cdot ${Ip} = ${ftex(Rg)}\,\mathrm{k\Omega} \cdot ${fmt(fval(I))}\,\mathrm{mA} = ${resTex(fval(Vg), 'V')}`)),
      L(`To measure the voltage across ${Rb}, connect the voltmeter across it, in parallel. In series in a branch, it cuts that branch off.`, `Um die Spannung an ${Rb} zu messen, schliesst man das Voltmeter parallel dazu an. In Serie in einem Zweig trennt es diesen Zweig ab.`)];
      difficulty = 3;
    } else if (kase === 'vseries') {
      const k = nm.nodeOf('I' + A.at), Rk = `$R_{${k.idx}}$`;
      fields = [field(A), field(V)];
      text = L('The ammeter and the voltmeter are ideal. Look closely at how they are connected: what do they show?', 'Das Amperemeter und das Voltmeter sind ideal. Schau genau, wie sie angeschlossen sind: Was zeigen sie an?');
      hints = [L(M`Is the voltmeter connected in series or in parallel? What does its resistance $R_\text{V} \to \infty$ do there?`, M`Ist das Voltmeter in Serie oder parallel angeschlossen? Was bewirkt dort sein Widerstand $R_\text{V} \to \infty$?`),
        L('In series in the main line, the voltmeter blocks the current. What does that mean for the ammeter, and for the voltages across the resistors?', 'In Serie in der Hauptleitung sperrt das Voltmeter den Strom. Was heisst das für das Amperemeter und für die Spannungen an den Widerständen?'),
        L('The voltages around the circuit still add up to the battery voltage (voltage rule).', 'Die Spannungen im Kreis ergeben zusammen immer noch die Batteriespannung (Maschenregel).')];
      solution = [L(M`The voltmeter is in the main line, in series with the battery and everything else. An ideal voltmeter has an (almost) infinite resistance, $R_\text{V} \to \infty$: it blocks the current, $I \approx 0$. So the ammeter at ${Rk} shows $${resTex(0, 'mA')}$.`,
        M`Das Voltmeter ist in der Hauptleitung, in Serie mit der Batterie und allem anderen. Ein ideales Voltmeter hat einen (fast) unendlich grossen Widerstand, $R_\text{V} \to \infty$: Es sperrt den Strom, $I \approx 0$. Das Amperemeter bei ${Rk} zeigt also $${resTex(0, 'mA')}$.`),
      L(M`Without a current there is no voltage across the resistors either ($V = R\,I = 0$). By the voltage rule, the whole battery voltage is across the voltmeter: it shows $${U} = ${resTex(V.value, 'V')}$.`,
        M`Ohne Strom gibt es auch keine Spannung an den Widerständen ($U = R\,I = 0$). Nach der Maschenregel liegt die ganze Batteriespannung am Voltmeter: Es zeigt $${U} = ${resTex(V.value, 'V')}$.`),
      L('To measure the voltage across a resistor, connect the voltmeter across it, in parallel. In series it stops the circuit and only shows the battery voltage.', 'Um die Spannung an einem Widerstand zu messen, schliesst man das Voltmeter parallel dazu an. In Serie unterbricht es den Stromkreis und zeigt nur die Batteriespannung.')];
      difficulty = 1;
    } else {
      const k = set.k, Rk = `R_{${k.idx}}`, Rt = sym('R0'), Rk0 = 'R' + k.id;
      const Rp = M`R'`, Ip = M`I'`, j = set.j;
      fields = j ? [field(A), field(V)] : [field(A)];
      text = j ? L('The ammeter and the voltmeter are ideal. Look closely at how they are connected: what do they show?', 'Das Amperemeter und das Voltmeter sind ideal. Schau genau, wie sie angeschlossen sind: Was zeigen sie an?')
        : L('The ammeter is ideal. Look closely at how it is connected: what does it show?', 'Das Amperemeter ist ideal. Schau genau, wie es angeschlossen ist: Was zeigt es an?');
      hints = [...(j ? [L('Is each meter connected the right way? An ammeter belongs in series, a voltmeter in parallel.', 'Ist jedes Messgerät richtig angeschlossen? Ein Amperemeter gehört in Serie, ein Voltmeter parallel.')] : []),L(M`The ammeter is connected across $${Rk}$, in parallel to it. What does its resistance $R_\text{A} \approx 0$ do there?`, M`Das Amperemeter ist parallel zu $${Rk}$ angeschlossen. Was bewirkt dort sein Widerstand $R_\text{A} \approx 0$?`),
        L(`The ammeter short-circuits $${Rk}$: the current takes the path without resistance, and $${Rk}$ drops out of the circuit. What is the total resistance now?`, `Das Amperemeter schliesst $${Rk}$ kurz: Der Strom nimmt den Weg ohne Widerstand, und $${Rk}$ fällt aus der Schaltung. Wie gross ist der Gesamtwiderstand jetzt?`),
        L(`Without $${Rk}$: $${Rp} = ${Rt} - ${Rk} = ${ftex(set.R)}\\,\\mathrm{k\\Omega}$.`, `Ohne $${Rk}$: $${Rp} = ${Rt} - ${Rk} = ${ftex(set.R)}\\,\\mathrm{k\\Omega}$.`)];
      if (j) hints.push(L(`The voltmeter across $R_{${j.idx}}$ is connected the right way: it shows $R_{${j.idx}} \\cdot ${Ip}$, with the new current $${Ip}$.`, `Das Voltmeter an $R_{${j.idx}}$ ist richtig angeschlossen: Es zeigt $R_{${j.idx}} \\cdot ${Ip}$, mit dem neuen Strom $${Ip}$.`));
      solution = [L(M`The ammeter is connected across $${Rk}$, in parallel to it. An ideal ammeter has (almost) no resistance, $R_\text{A} \approx 0$: it short-circuits $${Rk}$. All the current takes the path through the ammeter, none flows through $${Rk}$, and $${Rk}$ drops out of the circuit.`,
        M`Das Amperemeter ist parallel zu $${Rk}$ angeschlossen. Ein ideales Amperemeter hat (fast) keinen Widerstand, $R_\text{A} \approx 0$: Es schliesst $${Rk}$ kurz. Der ganze Strom nimmt den Weg durchs Amperemeter, durch $${Rk}$ fliesst keiner, und $${Rk}$ fällt aus der Schaltung.`),
      `${L('The total resistance of the circuit without the meter', 'Der Gesamtwiderstand der Schaltung ohne Messgerät')}: ${struct.join('; ')}.`,
      ...steps.map((st) => stepText(st, nm)),
      L(`Without $${Rk}$, the rest of the circuit has the resistance`, `Ohne $${Rk}$ hat der Rest der Schaltung den Widerstand`) + al(M`${Rp} &= ${Rt} - ${Rk} = ${qt('R0')} - ${qt(Rk0)} = ${ftex(set.R)}\,\mathrm{k\Omega}`),
      L(`The battery drives the current`, `Die Batterie treibt den Strom`) + al(M`${Ip} &= \frac{${U}}{${Rp}} = \frac{${qt('V0')}}{${ftex(set.R)}\,\mathrm{k\Omega}} = ${resTex(fval(set.I), 'mA')}`) +
        L(`through the circuit, all of it through the ammeter: it shows $${fmt(fval(set.I))}\\,\\mathrm{mA}$, more than the $${sym('I' + k.id)} = ${qt('I' + k.id)}$ through $${Rk}$ without the meter.`,
          `durch die Schaltung, ganz durchs Amperemeter: Es zeigt $${fmt(fval(set.I))}\\,\\mathrm{mA}$, mehr als die $${sym('I' + k.id)} = ${qt('I' + k.id)}$ durch $${Rk}$ ohne Messgerät.`),
      ...(j ? [L(M`The voltmeter across $R_{${j.idx}}$ is connected the right way. With the new current it shows`, M`Das Voltmeter an $R_{${j.idx}}$ ist richtig angeschlossen. Mit dem neuen Strom zeigt es`)
        + al(M`${sym('V' + j.id)}' &= R_{${j.idx}} \cdot ${Ip} = ${qt('R' + j.id)} \cdot ${fmt(fval(set.I))}\,\mathrm{mA} = ${resTex(fval(set.Vj), 'V')}`)
        + L(`more than the $${sym('V' + j.id)} = ${qt('V' + j.id)}$ without the ammeter.`, `mehr als die $${sym('V' + j.id)} = ${qt('V' + j.id)}$ ohne das Amperemeter.`)] : []),
      L('To measure the current through a resistor, connect the ammeter in series with it. Across the battery itself, an ammeter short-circuits the battery: a very large current flows, and the fuse of the meter blows.',
        'Um den Strom durch einen Widerstand zu messen, schliesst man das Amperemeter in Serie dazu an. Direkt an der Batterie schliesst ein Amperemeter die Batterie kurz: Es fliesst ein sehr grosser Strom, und die Sicherung des Messgeräts brennt durch.')];
      difficulty = steps.length <= 2 ? 2 : 3;
    }
    const placeFig = (id) => {
      const spot = id && slotsOf(c).find((x) => x.id === id);
      return `<div class="fig">${draw(c, nm, prob, { known: givenOnly(prob), mark: new Map([[set.n.id, 'strong']]), slots: slotsOf(c).map((x) => x.id), slotLabel: (x) => slotName(c, x),
        meters: spot ? [{ m: ms[0].m, at: spot.at, across: spot.across, hl: true }] : [] }).toSVG()}</div>`;
    };
    const meterFig = (sol, ask, extra = {}) => draw(c, nm, prob, { known: givenOnly(prob), meters: ms.map((m) => ({ ...m, l: sol ? reading(m) : null, hl: m.m === ask })), ...extra });
    return {
      id: `meter-${stage}-${seed}`,
      level, kind: kase, difficulty,
      title: L('Measuring with meters', 'Messen mit Messgeräten'),
      text: `${text}`,
      fields, tol: 0.01,
      // ask: the letter of a meter to highlight (a question of the check)
      // (where a meter goes: before the solution, the resistor without the meter)
      figure: (sol, ask) => (kase === 'place' && !sol ? placeFig(null) : `<div class="fig">${meterFig(sol, ask).toSVG()}</div>`),
      // where a meter is to be placed: the circuit with the meter at spot id (or none) and the
      // spots, and whether a spot is right ({ ok, why })
      placeFig, placeCheck: (id) => placeCheck(c, set.n, set.volt, id), slots: kase === 'place' ? slotsOf(c).map((x) => x.id) : null,
      // the circuit without meters, a resistor highlighted (where to connect a meter)
      plain: (id) => `<div class="fig">${draw(c, nm, prob, { known: givenOnly(prob), mark: new Map([[id, 'strong']]) }).toSVG()}</div>`,
      hints,
      solution,
      results: fields.map((f) => (f.place ? f.answer : f.choice ? `${f.what}: ${f.options.find((o) => o.v === f.value).html}` : `${METER()[f.key]}: $${fmt(f.value)}\\,\\mathrm{${f.unit}}$`)).join(', '),
      // for the check and the tests
      circuit: c, meters: ms, steps, givens: prob.givens, sym, shorted: kase === 'ashort' ? { k: set.k, R: set.R, I: set.I } : null,
    };
  }

  // The worked example on meters, for a circuit of a resistor R_a in series with a group that holds a
  // parallel branch R_b: where the ammeter (for the current through R_b) and the voltmeter (for the
  // voltage across R_a) go, what they show, step by step, and the two typical mistakes: the
  // voltmeter in series, and the ammeter across R_a.
  // path: the steps of the reading, as in tutorial().
  function meterTutorial(level, seed, path) {
    const r = rng(seed);
    const { c, prob, nm, set } = meterBuild(level, r, (cc, rr) => {
      const as = cc.root.t === 'S' ? cc.root.kids.filter((n) => n.t === 'R') : [], bs = cc.leaves.filter((n) => n.parent && n.parent.t === 'P');
      if (!as.length || !bs.length) return null;
      const a = as[0], b = rr.pick(bs), R = fsub(cc.root.R, a.R), I = fdiv(cc.root.V, R);
      if (!isHalf(I) || fval(I) > 100) return null;
      const A = { m: 'A', at: b.id, key: 'I' + b.id, value: fval(b.I) }, V = { m: 'V', at: a.id, across: true, key: 'V' + a.id, value: fval(a.V) };
      const S = { m: 'A', at: a.id, across: true, value: fval(I) };
      return { meters: [A, V, S], keys: [A.key, V.key], a, b, A, V, S, R, I };
    });
    const { a, b, A, V, S } = set;
    const sym = (k) => nm.sym(k), $ = (k) => `$${sym(k)}$`, U = sym('V0');
    const Ra = `$R_{${a.idx}}$`, Rb = `$R_{${b.idx}}$`;
    const groups = path ? pathSteps(c, nm, prob, path, `meter tutorial ${level}-${seed}`) : neededSteps(plan(relations(c), prob.givens).best, set.keys).map((st) => [st]);
    const steps = groups.flat();
    const missing = set.keys.filter((k) => !steps.some((st) => st.key === k));
    if (missing.length) throw new Error(`meter tutorial ${level}-${seed}: the path does not reach ${missing.join(', ')}`);
    const frames = [];
    const frame = (text, known, meters, mark = new Map(), focus = new Map()) => {
      const k = new Set(known);
      frames.push({ text, sketch: draw(c, nm, prob, { known: (x) => k.has(x), meters, mark, focus }) });
    };
    const rule = (t) => `<p class="step-rule">${t}</p>`;
    const given = [...prob.givens].sort(byReading).map((k) => `$${sym(k)} = ${nm.qtex(k)}$`);
    const g = prob.givens;
    frame(`<p>${L(`The current through ${Rb} and the voltage across ${Ra} are to be measured with an ammeter and a voltmeter. Where do the meters go, and what do they show?`,
      `Der Strom durch ${Rb} und die Spannung an ${Ra} sollen mit einem Amperemeter und einem Voltmeter gemessen werden. Wo werden die Messgeräte angeschlossen, und was zeigen sie an?`)}</p><p>${L('Given', 'Gegeben')}: ${listing(given)}.</p>`, g, []);
    frame(rule(L('The ammeter: in series', 'Das Amperemeter: in Serie')) +
      `<p>${L(`The current through ${Rb} has to flow through the ammeter. So the circuit is opened in the branch of ${Rb}, and the ammeter is connected there, <b>in series</b> with ${Rb}. An ideal ammeter has (almost) no resistance, $R_\\text{A} \\approx 0$: it changes no current and no voltage in the circuit.`,
        `Der Strom durch ${Rb} muss durch das Amperemeter fliessen. Darum wird der Stromkreis im Zweig von ${Rb} aufgetrennt und das Amperemeter dort angeschlossen, <b>in Serie</b> zu ${Rb}. Ein ideales Amperemeter hat (fast) keinen Widerstand, $R_\\text{A} \\approx 0$: Es verändert keinen Strom und keine Spannung in der Schaltung.`)}</p>`,
    g, [{ ...A, hl: true }], new Map([[b.id, 'strong']]));
    frame(rule(L('The voltmeter: in parallel', 'Das Voltmeter: parallel')) +
      `<p>${L(`The voltmeter compares the two ends of ${Ra}: it is connected to them, <b>in parallel</b> to ${Ra}, without opening the circuit. An ideal voltmeter has an (almost) infinite resistance, $R_\\text{V} \\to \\infty$: no current flows through it, so it changes nothing either.`,
        `Das Voltmeter vergleicht die beiden Enden von ${Ra}: Es wird an sie angeschlossen, <b>parallel</b> zu ${Ra}, ohne den Stromkreis aufzutrennen. Ein ideales Voltmeter hat einen (fast) unendlich grossen Widerstand, $R_\\text{V} \\to \\infty$: Es fliesst kein Strom hindurch, also verändert es auch nichts.`)}</p>`,
    g, [A, { ...V, hl: true }], new Map([[a.id, 'strong']]));
    frame(rule(L('What the meters show', 'Was die Messgeräte anzeigen')) +
      `<p>${L(`Since ideal meters change nothing, the ammeter shows the current ${$(A.key)} and the voltmeter the voltage ${$(V.key)} of the circuit without meters. These follow from the rules for series and parallel circuits.`,
        `Weil ideale Messgeräte nichts verändern, zeigt das Amperemeter den Strom ${$(A.key)} und das Voltmeter die Spannung ${$(V.key)} der Schaltung ohne Messgeräte. Diese folgen aus den Regeln für Serie- und Parallelschaltungen.`)}</p>`,
    g, [A, V]);
    const known = new Set(g);
    groups.forEach((group, i) => {
      const mark = new Map(), focus = new Map();
      const put = (n, m) => { if (mark.get(n.id) !== 'strong') mark.set(n.id, m); };
      for (const { key, rel, from } of group) {
        known.add(key);
        if (rel.kind === 'ohm') put(rel.node, 'strong');
        else put(rel.parent, 'light');
        if (rel.kind === 'eq') put(rel.child, 'strong');
        if (rel.kind === 'ratio') [rel.a, rel.b].forEach((n) => put(n, 'strong'));
        if (rel.kind === 'sum' || rel.kind === 'inv' || rel.kind === 'vdiv') rel.parent.kids.forEach((n) => put(n, 'strong'));
        from.forEach((k) => { if (!focus.has(k)) focus.set(k, 'use'); });
        focus.set(key, 'new');
      }
      const title = cap(listing([...new Set(group.map((st) => TITLE()[st.rel.rule]))]));
      frame(`${rule(`${L(`Step ${i + 1} of ${groups.length}`, `Schritt ${i + 1} von ${groups.length}`)}: ${title}`)}${group.map((st) => `<p>${stepText(st, nm)}</p>`).join('')}`, known, [A, V], mark, focus);
    });
    const shown = (m) => ({ ...m, l: { t: reading(m), cls: 'new' } });
    frame(rule(L('The readings', 'Die Anzeigen')) + `<p>${L(`The ammeter shows $${sym(A.key)} = ${nm.res(A.key)}$, the voltmeter $${sym(V.key)} = ${nm.res(V.key)}$.`, `Das Amperemeter zeigt $${sym(A.key)} = ${nm.res(A.key)}$, das Voltmeter $${sym(V.key)} = ${nm.res(V.key)}$.`)}</p>`,
      g, [shown(A), shown(V)]);
    frame(rule(L('Typical mistake: the voltmeter in series', 'Typischer Fehler: das Voltmeter in Serie')) +
      `<p>${L(`Connected in the main line, the voltmeter is in series with everything else. Its huge resistance blocks the current, $I \\approx 0$: the ammeter shows $0\\,\\mathrm{mA}$. Without a current there is no voltage across the resistors, so the whole battery voltage is across the voltmeter: it shows $${U} = ${nm.qtex('V0')}$, not the voltage across ${Ra}.`,
        `In der Hauptleitung ist das Voltmeter in Serie mit allem anderen. Sein riesiger Widerstand sperrt den Strom, $I \\approx 0$: Das Amperemeter zeigt $0\\,\\mathrm{mA}$. Ohne Strom gibt es keine Spannung an den Widerständen, also liegt die ganze Batteriespannung am Voltmeter: Es zeigt $${U} = ${nm.qtex('V0')}$, nicht die Spannung an ${Ra}.`)}</p>`,
    g, [{ ...A, l: '0 mA' }, { m: 'V', at: 0, l: `${fmt(fval(c.root.V))} V`, hl: true }]);
    frame(rule(L('Typical mistake: the ammeter in parallel', 'Typischer Fehler: das Amperemeter parallel')) +
      `<p>${L(`Connected across ${Ra}, the ammeter short-circuits it: with $R_\\text{A} \\approx 0$, all the current takes the path through the ammeter, and ${Ra} drops out. The resistance left is $R' = ${sym('R0')} - R_{${a.idx}} = ${ftex(set.R)}\\,\\mathrm{k\\Omega}$, so a larger current $I' = ${U}/R' = ${ftex(set.I)}\\,\\mathrm{mA}$ flows, all of it through the ammeter, instead of $${sym('I0')} = ${nm.qtex('I0')}$ without it. Across the battery itself, an ammeter would short-circuit the battery.`,
        `Parallel zu ${Ra} schliesst das Amperemeter diesen kurz: Mit $R_\\text{A} \\approx 0$ nimmt der ganze Strom den Weg durchs Amperemeter, und ${Ra} fällt weg. Es bleibt der Widerstand $R' = ${sym('R0')} - R_{${a.idx}} = ${ftex(set.R)}\\,\\mathrm{k\\Omega}$, also fliesst ein grösserer Strom $I' = ${U}/R' = ${ftex(set.I)}\\,\\mathrm{mA}$, ganz durchs Amperemeter, statt $${sym('I0')} = ${nm.qtex('I0')}$ ohne es. Direkt an der Batterie würde ein Amperemeter die Batterie kurzschliessen.`)}</p>`,
    g, [{ ...S, l: reading(S), hl: true }]);
    frame(rule(L('In short', 'Kurz')) + `<p>${L(`<b>Ammeter in series</b> ($R_\\text{A} \\approx 0$), <b>voltmeter in parallel</b> ($R_\\text{V} \\to \\infty$). Ideal meters change nothing: they show the currents and voltages that the rules for series and parallel circuits give.`,
      `<b>Amperemeter in Serie</b> ($R_\\text{A} \\approx 0$), <b>Voltmeter parallel</b> ($R_\\text{V} \\to \\infty$). Ideale Messgeräte verändern nichts: Sie zeigen die Ströme und Spannungen, die die Regeln für Serie- und Parallelschaltungen liefern.`)}</p>`,
    g, [{ ...A, l: reading(A) }, { ...V, l: reading(V) }]);
    const box = frames.reduce((bx, f) => {
      const x = f.sketch.box;
      return [Math.min(bx[0], x[0]), Math.min(bx[1], x[1]), Math.max(bx[2], x[2]), Math.max(bx[3], x[3])];
    }, [Infinity, Infinity, -Infinity, -Infinity]);
    return {
      id: `meter-${level}-${seed}`,
      frames: frames.map((f) => ({ text: f.text, figure: `<div class="fig">${f.sketch.toSVG('circuit', box)}</div>` })),
      // for tests
      circuit: c, givens: prob.givens, steps, meters: set,
    };
  }

  const api = { LEVELS, generate, tutorial, meters, meterTutorial, placeOptions, placeWhy, slotsOf, padded, F, fval, fmt, ftex };
  root.Generator = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
