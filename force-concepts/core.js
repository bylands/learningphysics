// Force and motion: conceptual questions on inertia, the net force and the motion it causes
// (also under gravity and on a circle), in the spirit of the Force Concept Inventory (Hestenes,
// Wells & Swackhamer, 1992). The situations are our own and randomised; the wrong options follow
// the misconceptions the inventory probes, and every wrong option carries the misconception it
// stands for and an explanation. (Interaction, the third law, is a module of its own.)
//
// A scenario generator is fn(r, params) → { title, situation, figure, questions, hints, steps },
// where questions are [{ key, prompt, pics, options: [{ label, ok, code, why, text }] }] (pics:
// the labels are small drawings, and text describes them in words), hints go from what to look
// at to the plan, the law and the result, and steps are the worked solution [{ title, text,
// figure }], used for the solution and as the tutor's frames. The topic files register their
// generators here.
//
// Besides single choice (type 'choice', the default), a question can be a true/false set ('tf'),
// a ranking ('rank'), a matching ('match') or a prediction with its explanation ('two'); see the
// constructors below. Each wrong element carries a misconception code and an explanation.
//
// Languages: English and German (Swiss spelling, no ß), from lang.js (shared by the apps). The
// generators write every text with T(english, german), read at generation time; the random numbers do not depend on the language,
// so the same seed gives the same exercise, with the options in the same order, in both.
(function (root) {
  'use strict';

  const Lang = root.Lang || require('./lang.js');
  const LANGS = Lang.LANGS;
  const setLang = (l) => Lang.set(l, true);
  const getLang = () => Lang.get();
  const T = (en, de) => Lang.L(en, de);

  // Each misconception: its name, what it claims, and the correct concept.
  const MIS = {
    impetus: {
      en: ['Impetus', 'The push or throw is stored in the body, keeps it going and slowly wears off.', 'No push is stored in a body. Once the push ends, the body keeps its velocity by itself (inertia); it only slows down because other forces, such as friction or air resistance, act on it.'],
      de: ['Impetus', 'Der Stoss oder Wurf wird im Körper gespeichert, hält ihn in Bewegung und lässt langsam nach.', 'Ein Stoss wird nicht im Körper gespeichert. Ist der Stoss vorbei, behält der Körper seine Geschwindigkeit von selbst (Trägheit); er wird nur langsamer, weil andere Kräfte wie Reibung oder Luftwiderstand auf ihn wirken.'],
    },
    'active-force': {
      en: ['Motion needs a force', 'A body only moves, or keeps its speed, as long as a force pushes it along; the speed follows the force.', 'Motion at constant velocity needs no force: if the net force is zero, a body keeps its speed and direction. A net force changes the velocity; it determines the acceleration, not the velocity.'],
      de: ['Bewegung braucht Kraft', 'Ein Körper bewegt sich nur so lange (oder behält seine Geschwindigkeit nur so lange), wie eine Kraft ihn antreibt; die Geschwindigkeit folgt der Kraft.', 'Bewegung mit konstanter Geschwindigkeit braucht keine Kraft: Ist die resultierende Kraft null, behält ein Körper Tempo und Richtung bei. Eine resultierende Kraft ändert die Geschwindigkeit; sie bestimmt die Beschleunigung, nicht die Geschwindigkeit.'],
    },
    'last-force': {
      en: ['The last force decides', 'After a push, a body moves in the direction of the last push and forgets its earlier motion.', 'A push changes the velocity, it does not replace it: the new velocity is the old one plus the change caused by the push, which points along the force.'],
      de: ['Die letzte Kraft entscheidet', 'Nach einem Stoss bewegt sich ein Körper in Richtung des letzten Stosses und vergisst seine frühere Bewegung.', 'Ein Stoss ändert die Geschwindigkeit, er ersetzt sie nicht: Die neue Geschwindigkeit ist die alte plus die Änderung durch den Stoss, die in Richtung der Kraft zeigt.'],
    },
    'largest-force': {
      en: ['The largest force wins', 'When several forces act, the body moves along the largest one; the others do not count.', 'All forces count: they add as vectors to the net force, and the acceleration points along the net force.'],
      de: ['Die grösste Kraft gewinnt', 'Wirken mehrere Kräfte, bewegt sich der Körper in Richtung der grössten; die anderen zählen nicht.', 'Alle Kräfte zählen: Sie addieren sich als Vektoren zur resultierenden Kraft, und die Beschleunigung zeigt in Richtung der resultierenden Kraft.'],
    },
    'circular-impetus': {
      en: ['Circular impetus', 'A body that has been moving in a circle keeps curving for a while after it is released.', 'Once released, no force pulls the body towards the centre any more, so it moves on in a straight line along the tangent (only gravity may still bend its path downward).'],
      de: ['Kreis-Impetus', 'Ein Körper, der sich im Kreis bewegt hat, fliegt nach dem Loslassen noch eine Weile im Bogen weiter.', 'Nach dem Loslassen zieht keine Kraft den Körper mehr zum Zentrum, also fliegt er geradlinig entlang der Tangente weiter (nur die Schwerkraft kann seine Bahn noch nach unten krümmen).'],
    },
    'constant-speed': {
      en: ['Constant speed, no force', 'A body moving at constant speed has no net force on it, even on a curve.', 'Velocity has a direction: on a curve it changes all the time, even at constant speed. So there is an acceleration, towards the centre, and a net force towards the centre causes it.'],
      de: ['Konstantes Tempo, keine Kraft', 'Auf einen Körper mit konstantem Tempo wirkt keine resultierende Kraft, auch in einer Kurve nicht.', 'Die Geschwindigkeit hat eine Richtung: In einer Kurve ändert sie sich ständig, auch bei konstantem Tempo. Es gibt also eine Beschleunigung zum Zentrum hin, und eine resultierende Kraft zum Zentrum bewirkt sie.'],
    },
    centrifugal: {
      en: ['Centrifugal push', 'A body moving in a circle is pushed outward and flies outward when it is released.', 'On a circle, the net force points inward, towards the centre; no force pushes outward. When released, the body moves on along the tangent, not outward.'],
      de: ['Fliehkraft nach aussen', 'Ein Körper auf einer Kreisbahn wird nach aussen gedrückt und fliegt beim Loslassen nach aussen weg.', 'Auf einer Kreisbahn zeigt die resultierende Kraft nach innen, zum Zentrum; keine Kraft drückt nach aussen. Beim Loslassen fliegt der Körper entlang der Tangente weiter, nicht nach aussen.'],
    },
    'heavier-faster': {
      en: ['Heavier falls faster', 'Heavier bodies fall faster, because gravity pulls harder on them.', 'Gravity does pull harder on a heavier body, but the body is also harder to accelerate, in the same proportion. Without air resistance, all bodies fall with the same acceleration g.'],
      de: ['Schwerer fällt schneller', 'Schwerere Körper fallen schneller, weil die Schwerkraft stärker an ihnen zieht.', 'Die Schwerkraft zieht zwar stärker an einem schwereren Körper, aber er ist im gleichen Verhältnis auch schwerer zu beschleunigen. Ohne Luftwiderstand fallen alle Körper mit derselben Beschleunigung g.'],
    },
    'rest-no-force': {
      en: ['At rest, no force', 'A body whose velocity is zero, even only at one instant, has no force acting on it or no acceleration.', 'Being at rest says nothing about the forces. A body at rest can have several forces acting on it that balance. At a turning point, such as the top of a throw, the velocity is zero at one instant, but gravity still acts and the acceleration is g.'],
      de: ['In Ruhe, keine Kraft', 'Auf einen Körper, dessen Geschwindigkeit null ist (auch nur in einem Augenblick), wirkt keine Kraft, oder er hat keine Beschleunigung.', 'Ruhe sagt nichts über die Kräfte aus. Auf einen ruhenden Körper können mehrere Kräfte wirken, die sich aufheben. In einem Umkehrpunkt, etwa im höchsten Punkt eines Wurfs, ist die Geschwindigkeit in einem Augenblick null, aber die Schwerkraft wirkt weiter und die Beschleunigung ist g.'],
    },
    obstacle: {
      en: ['Obstacles exert no force', 'Tables, ropes, walls or parked cars only block the way; they do not push or pull.', 'Tables, ropes, walls and parked cars deform slightly and push or pull back: a table exerts an upward normal force, a rope a tension force, a wall a force on whatever presses against it.'],
      de: ['Hindernisse üben keine Kraft aus', 'Tische, Seile, Wände oder parkierte Autos sind nur im Weg; sie drücken oder ziehen nicht.', 'Tische, Seile, Wände und parkierte Autos verformen sich ein wenig und drücken oder ziehen zurück: Ein Tisch übt eine Normalkraft nach oben aus, ein Seil eine Zugkraft, eine Wand eine Kraft auf alles, was gegen sie drückt.'],
    },
    'vector-add': {
      en: ['Directions ignored', 'Velocities or forces are added as plain numbers, ignoring their directions.', 'Velocities and forces have directions and add as vectors: in opposite directions they subtract, and at an angle the arrows are added head to tail.'],
      de: ['Richtungen vergessen', 'Geschwindigkeiten oder Kräfte werden wie Zahlen addiert, ohne ihre Richtungen zu beachten.', 'Geschwindigkeiten und Kräfte haben Richtungen und addieren sich als Vektoren: In entgegengesetzter Richtung subtrahieren sie sich, und bei einem Winkel hängt man die Pfeile aneinander.'],
    },
  };
  const mis = (code) => (MIS[code] ? { name: MIS[code][getLang()][0], text: MIS[code][getLang()][1], fix: MIS[code][getLang()][2] } : null);
  // A misconception's name, quoted and labelled, so it never reads as a statement to learn.
  const misLabel = (code) => (getLang() === 'de' ? `Fehlvorstellung: „${mis(code).name}“` : `Misconception: “${mis(code).name}”`);

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
    const pick = (arr) => arr[Math.floor(next() * arr.length)];
    const shuffle = (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    return { next, pick, shuffle };
  }

  // ---------------------------------------------------------------- text helpers
  const it = (s) => `<i>${s}</i>`;
  // Force symbols by meaning; German uses its own subscripts (F_S Seilkraft, F_R Reibung, …).
  // Anything else (1, 2, …) is used as it is.
  const SUBS = {
    G: ['G', 'G'], N: ['N', 'N'], T: ['T', 'S'], f: ['f', 'R'], R: ['R', 'W'], D: ['D', 'L'],
    net: ['net', 'res'], push: ['push', 'D'], drive: ['drive', 'A'], res: ['res', 'W'],
  };
  const sub = (k) => (SUBS[k] ? SUBS[k][getLang() === 'de' ? 1 : 0] : k);
  const F = (k) => `<i>F</i><sub>${sub(k)}</sub>`;   // HTML
  const FL = (k) => `F_${sub(k)}`;                    // label in a picture
  const list = (xs) => `<ul>${xs.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // Numbers with sig significant digits, without trailing zeros (a decimal point in both
  // languages, as in the other apps); units after a no-break space.
  const num = (x, sig = 2) => String(Number(x.toPrecision(sig))); // decimal point in both languages
  const qty = (x, unit, sig = 2) => `${num(x, sig)}&nbsp;${unit}`;
  const deg = (rad) => Math.round((rad * 180) / Math.PI);

  // German nouns with their articles: noun('m', 'Ball').acc → 'den Ball', .einen → 'einen Ball',
  // .er/.ihn/.ihm → pronouns.
  const DEF = { nom: { m: 'der', f: 'die', n: 'das' }, acc: { m: 'den', f: 'die', n: 'das' }, dat: { m: 'dem', f: 'der', n: 'dem' } };
  const IND = { nom: { m: 'ein', f: 'eine', n: 'ein' }, acc: { m: 'einen', f: 'eine', n: 'ein' }, dat: { m: 'einem', f: 'einer', n: 'einem' } };
  const noun = (g, word) => ({
    g, word,
    nom: `${DEF.nom[g]} ${word}`, acc: `${DEF.acc[g]} ${word}`, dat: `${DEF.dat[g]} ${word}`,
    ein: `${IND.nom[g]} ${word}`, einen: `${IND.acc[g]} ${word}`, einem: `${IND.dat[g]} ${word}`,
    er: { m: 'er', f: 'sie', n: 'es' }[g], ihn: { m: 'ihn', f: 'sie', n: 'es' }[g], ihm: { m: 'ihm', f: 'ihr', n: 'ihm' }[g],
  });

  // An option: code 'ok' for the right one, otherwise a key of MIS or 'other'.
  const o = (label, code, why, text) => ({ label, ok: code === 'ok', code, why, text: text || label });
  const q = (r, key, prompt, options, pics = false) => ({ type: 'choice', key, prompt, pics, options: r.shuffle(options) });

  // ---------------------------------------------------------------- other question formats
  // True/false set: statements { text, value, why, code } (code: the misconception behind a wrong
  // judgement of this statement).
  const stmt = (text, value, why, code = 'other') => ({ text, value, why, code });
  const tf = (r, key, prompt, items) => ({ type: 'tf', key, prompt, items: r.shuffle(items) });
  // Ranking from the largest (rank 1) down; equal values share a rank. items { label, name, value,
  // alt: { trap: value } } in a fixed order (they are named A, B, … in the picture); traps
  // { key, code, why }: the order a misconception gives, from the values alt[key]; why: the reason
  // for the right order.
  const rank = (key, prompt, items, traps, why) => ({ type: 'rank', key, prompt, items, traps, why });
  // Matching: each item { label, name, answer: choice id, why, wrong: { choice id: { code, why } },
  // other } gets one of the choices { id, label, name } (a choice may fit several items or none);
  // other explains any wrong choice without its own entry in wrong.
  const match = (key, prompt, items, choices, pics = false) => ({ type: 'match', key, prompt, pics, items, choices });
  // Predict and explain: a prediction (options, one right) and its reason (reasons, one right).
  const two = (r, key, prompt, reasonPrompt, options, reasons, pics = false) =>
    ({ type: 'two', key, prompt, reasonPrompt, pics, options: r.shuffle(options), reasons: r.shuffle(reasons) });

  // Competition ranks from the largest: [5, 7, 5] → [2, 1, 2].
  const ranksOf = (vs) => vs.map((v) => 1 + vs.filter((w) => w > v + 1e-9).length);
  // The items in rank order, as text: "B > A = C".
  function rankText(items, vs) {
    const rk = ranksOf(vs), idx = items.map((x, i) => i).sort((a, b) => rk[a] - rk[b]);
    return idx.map((i, k) => (k === 0 ? '' : rk[i] === rk[idx[k - 1]] ? ' = ' : ' > ') + items[i].name).join('');
  }
  const TRUE = () => T('true', 'richtig'), FALSE = () => T('false', 'falsch');
  const answerOf = (opts) => opts.find((x) => x.ok);

  // The right answer to a question, as HTML.
  function answerText(qu) {
    switch (qu.type) {
      case 'tf': return qu.items.map((x) => `${x.text} — <b>${x.value ? TRUE() : FALSE()}</b>`).join('<br>');
      case 'rank': return rankText(qu.items, qu.items.map((x) => x.value));
      case 'match': return qu.items.map((x) => `${x.name} → ${qu.choices.find((c) => c.id === x.answer).name}`).join('; ');
      case 'two': return `${answerOf(qu.options).text} ${T('Reason:', 'Begründung:')} ${answerOf(qu.reasons).text}`;
      default: return answerOf(qu.options).text;
    }
  }

  // The typical wrong answers to a question: [{ text, code, why }].
  function misreads(qu) {
    switch (qu.type) {
      case 'tf': return qu.items.map((x) => ({ text: `${x.text} — ${x.value ? FALSE() : TRUE()}`, code: x.code, why: x.why }));
      case 'rank': return qu.traps.map((t) => ({ text: rankText(qu.items, qu.items.map((x) => x.alt[t.key])), code: t.code, why: t.why }));
      case 'match': return qu.items.flatMap((x) => Object.entries(x.wrong || {}).map(([id, w]) =>
        ({ text: `${x.name} → ${qu.choices.find((c) => c.id === id).name}`, code: w.code, why: w.why })));
      case 'two': return [...qu.options, ...qu.reasons].filter((x) => !x.ok);
      default: return qu.options.filter((x) => !x.ok);
    }
  }

  // ---------------------------------------------------------------- check: questions with four options
  // Every question of an exercise that can be asked with four options, one right: [{ key, ask,
  // options: [{ html, ok, code, why }], pics }] (key: that of the question it comes from). Single
  // choice and predictions with three wrong options taken from theirs; the reason of a prediction
  // (four reasons); a true/false set as "which statement is true (false)?"; a ranking as the right
  // order against the orders the misconceptions give (and the reversed order); a matching as
  // "which fits this item?". r picks among more options than four.
  function checkQuestions(ex, r) {
    const out = [];
    const four = (right, wrong) => {
      const ws = r.shuffle(wrong).filter((w, i, a) => a.findIndex((v) => v.html === w.html) === i && w.html !== right.html).slice(0, 3);
      return ws.length === 3 ? r.shuffle([right, ...ws]) : null;
    };
    const opt = (x) => ({ html: x.label, ok: x.ok, code: x.code, why: x.ok ? '' : x.why });
    const lq = T('“', '«'), rq = T('”', '»');
    for (const qu of ex.questions) {
      if ((qu.type === 'choice' || qu.type === 'two') && qu.options.length >= 4) {
        const opts = four(opt(answerOf(qu.options)), qu.options.filter((x) => !x.ok).map(opt));
        if (opts) out.push({ key: qu.key, ask: qu.prompt, pics: qu.pics, options: opts });
      }
      if (qu.type === 'two' && qu.reasons.length >= 4) {
        const opts = four(opt(answerOf(qu.reasons)), qu.reasons.filter((x) => !x.ok).map(opt));
        if (opts) out.push({ key: `${qu.key}-reason`, ask: `${qu.prompt} <b>${answerOf(qu.options).text}</b> ${qu.reasonPrompt}`, options: opts });
      }
      if (qu.type === 'tf') {
        const yes = qu.items.filter((x) => x.value), no = qu.items.filter((x) => !x.value);
        const st = (x, ok) => ({ html: x.text, ok, code: ok ? 'ok' : x.code, why: ok ? '' : x.why });
        if (yes.length && no.length >= 3) out.push({ key: qu.key, ask: T('Which of these statements is true?', 'Welche dieser Aussagen ist richtig?'), options: four(st(r.pick(yes), true), no.map((x) => st(x, false))) });
        if (no.length && yes.length >= 3) out.push({ key: qu.key, ask: T('Which of these statements is false?', 'Welche dieser Aussagen ist falsch?'), options: four(st(r.pick(no), true), yes.map((x) => st(x, false))) });
      }
      if (qu.type === 'rank') {
        const vs = qu.items.map((x) => x.value), right = rankText(qu.items, vs);
        const wrong = qu.traps.map((t) => ({ html: rankText(qu.items, qu.items.map((x) => x.alt[t.key])), ok: false, code: t.code, why: t.why }));
        wrong.push({ html: rankText(qu.items, vs.map((v) => -v)), ok: false, code: 'other', why: qu.why });
        wrong.push({ html: rankText(qu.items, vs.map(() => 0)), ok: false, code: 'other', why: qu.why });
        const opts = four({ html: right, ok: true, code: 'ok', why: '' }, wrong);
        if (opts) out.push({ key: qu.key, ask: `${qu.prompt.split(/(?<=\.) /)[0].replace(/[,:;] (from the|vom|von der|von den|von dem) .*$/, '').replace(/\.?$/, '.')} ${T('Which order is right?', 'Welche Reihenfolge stimmt?')}`, options: opts });
      }
      if (qu.type === 'match' && qu.choices.length >= 4) {
        for (const x of qu.items) {
          const c = qu.choices.find((y) => y.id === x.answer), w = x.wrong || {};
          const opts = four({ html: c.label, ok: true, code: 'ok', why: '' }, qu.choices.filter((y) => y.id !== x.answer)
            .map((y) => ({ html: y.label, ok: false, code: w[y.id] ? w[y.id].code : 'other', why: w[y.id] ? w[y.id].why : x.other || x.why })));
          const named = x.label && !/<svg/.test(x.label) ? x.label : x.name;
          if (opts) out.push({ key: qu.key, ask: `${qu.prompt.split(/(?<=\.) /)[0]} ${T('Which fits', 'Was passt zu')} ${lq}${named}${rq}?`, pics: qu.pics, options: opts });
        }
      }
    }
    return out.filter((x) => x.options && x.options.filter((y) => y.ok).length === 1);
  }

  // A question of the check: kind 'topic/generator:key' asks one of the questions with that key
  // (checkQuestions) of an exercise of that type. The same kind and seed give the same question.
  function checkQuestion(kind, seed) {
    const [type, key] = kind.split(':');
    for (let k = 0; k < 50; k++) {
      const s = (seed + 7919 * k) >>> 0, r = rng(s), ex = generateGen(type, s);
      const qs = checkQuestions(ex, r).filter((x) => x.key === key);
      if (qs.length) return { ex, ...r.pick(qs) };
    }
    throw new Error(`no check question of kind ${kind}`);
  }

  // ---------------------------------------------------------------- registry
  // The generators by name, and the exercise types of practice by topic: POOLS[topic] lists
  // { name, params }, the type 'topic/name' (a generator may be registered under several topics,
  // with other parameters).
  const GENS = {};
  const POOLS = {};
  function register(topic, name, fn, params = {}) {
    GENS[name] = fn;
    (POOLS[topic] = POOLS[topic] || []).push({ name, params });
  }

  function finish(ex, id, topic, gen) {
    ex.id = id;
    ex.topic = topic;
    ex.gen = gen;
    ex.lang = getLang();
    ex.difficulty = DIFFICULTY[gen];
    ex.short = ex.questions.map((qu) => ({ prompt: qu.prompt, answer: answerText(qu) }));
    return ex;
  }

  // How hard each exercise type is, 1–5: one simple idea in a familiar situation (1) up to
  // several ideas combined, in a format that asks for every detail (5).
  const DIFFICULTY = {
    drop: 1,
    kick: 2, balance: 2, 'tf-motion': 2, centre: 2,
    throw: 3, circle: 3, rolloff: 3, engine: 3, 'tf-throw': 3,
    thruster: 4, 'two-forces': 4, 'pendulum-cut': 4, 'rank-elevator': 4,
    'match-diagrams': 5, 'cart-launcher': 5, ramp: 5,
  };

  // Names of the exercise types, for the student's overview.
  const TYPE_NAMES = {
    drop: ['Heavy and light', 'Schwer und leicht'], rolloff: ['Launched horizontally', 'Horizontal abgeworfen'], throw: ['Forces in flight', 'Kräfte im Flug'],
    kick: ['A brief kick', 'Ein kurzer Stoss'], circle: ['Leaving a circle', 'Aus dem Kreis'], engine: ['Engine on, engine off', 'Triebwerk an, Triebwerk aus'],
    balance: ['Comparing two forces', 'Zwei Kräfte vergleichen'], thruster: ['Thrust to the side', 'Schub zur Seite'], 'two-forces': ['Two strings', 'Zwei Schnüre'],
    centre: ['Towards the centre', 'Zum Zentrum'], 'rank-elevator': ['Four elevator rides', 'Vier Liftfahrten'],
    'match-diagrams': ['Free-body diagrams', 'Kräftediagramme'], 'cart-launcher': ['From a moving vehicle', 'Vom fahrenden Fahrzeug'],
    'pendulum-cut': ['Cutting the pendulum string', 'Pendelschnur durchschneiden'], ramp: ['Up and down the ramp', 'Die Rampe hinauf und hinunter'],
    'tf-throw': ['True or false: thrown up', 'Richtig oder falsch: hochgeworfen'], 'tf-motion': ['True or false: Newton’s laws', 'Richtig oder falsch: Newtonsche Gesetze'],
  };
  const typeName = (gen) => (TYPE_NAMES[gen] ? TYPE_NAMES[gen][getLang() === 'de' ? 1 : 0] : gen);

  // How hard each type was for the student: stats { type: { n, s } }, s a moving average of the
  // scores in [0, 1] (0: right at once, 1: solution needed). A type comes up with weight
  // 1 + 3·s, so up to 4 times as often as a mastered one; an unseen type counts as s = 0.35.
  const UNSEEN = 0.35;
  function recordResult(stats, gen, score) {
    const old = stats[gen];
    const s = old ? 0.6 * old.s + 0.4 * score : score;
    return { ...stats, [gen]: { n: (old ? old.n : 0) + 1, s: Number(s.toFixed(3)) } };
  }
  const weightOf = (stats, gen) => 1 + 3 * (stats[gen] ? stats[gen].s : UNSEEN);

  // An exercise of one type, 'topic/generator' (e.g. 'inertia/balance': as registered for that
  // topic, with its parameters), for practice by topic (topics.js).
  function generateGen(key, seed) {
    const [topic, name] = key.split('/'), g = POOLS[topic].find((x) => x.name === name);
    return finish(GENS[name](rng(seed), { ...g.params }), `${key}-${seed}`, topic, name);
  }

  // A fixed exercise (for the tutor): the generator with the given parameters.
  function build(gen, params, seed = 1) {
    return finish(GENS[gen](rng(seed), { ...params }), `tutor-${gen}`, 'tutor', gen);
  }

  const api = {
    LANGS, setLang, getLang, T, DIFFICULTY, MIS, mis, misLabel, POOLS, GENS, rng,
    it, F, FL, list, cap, num, qty, deg, noun, o, q, stmt, tf, rank, match, two, ranksOf, rankText, answerText, misreads,
    checkQuestions, checkQuestion, register, generateGen, build, TYPE_NAMES, typeName, recordResult, weightOf,
  };
  root.FC = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
