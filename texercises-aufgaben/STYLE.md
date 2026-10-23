# How the Aufgaben exercises are written (house style, reviewed by Samuel)

The Freier Fall collection (`exercises/freier-fall-*`) is the approved
reference; read two or three of its exercises before writing new ones.
Syntax: `../cheatsheet.md`, `../examples.md`,
`../.claude/skills/texercise-solution/SKILL.md`.

## Solver
- Every number lives in the solver: `\NewQty` for givens (with a conversion
  to SI where the given unit is not SI: `\NewQty{m}{25}[\gram][e-3][\kg]`,
  `\NewQty*{v}{55}[\kmph][1/3.6][\mps]`), `\SolQty` for every computed value
  (formal LaTeX in `[...]`, xfp arithmetic on `\XX` numbers in `{...}`),
  `\ConvTo{new}{factor}{old}{\unit}` for unit changes.
- Text refers to givens as `\XO`. Solution: `X &= \XF \\ &= <formula with
  \Y values> \\ &= \X \approx \result{\XP{prefix}{sigfigs}}`.
  No typed numbers in text or solution (except pure numbers like 2 in 1/2).
- `\XP{..}{..}` and `\XS` work only on `\SolQty`/`\ConvTo` quantities. To box a
  given/looked-up value: `\ConvTo{Xr}{1}{X}{\unit}` then `\XrP{0}{3}`.
- Quantity names: letters only, and never an existing LaTeX/siunitx command
  or unit: single letters like a b c d g m s t u v A C F H J K L N S T V W are
  taken (use multi-letter names: `gE`, `sfa`, `hbr`),
  not sf th to tg ge dB mA mW mL ng ns kg cm mm km Hz Pa J N W V A K C L
  min hr deg rad, etc. Two or three letters plus case work well (`vA`, `tPo`).
- Use `sin(\xX*pi/180)` for angles in degrees.
- Format units with `^` only in math mode (`$\aO\cdot(\tO)^2$`); text mode
  `^` breaks the list layout.

## Values and level
- g = 9.81 m/s²: `\NewQty{gE}{9.81}[\mpss]`. For exercises meant to be
  done without a calculator (the sheet says so, or the numbers are made for
  mental arithmetic, like seconds of free fall): g = 10 m/s² and the text says
  "Rechnen Sie ohne Taschenrechner mit $g = \gEO$."
- Constants and table values: Formeln, Tabellen, Begriffe (FoTaBe, 7th ed.),
  full text in `/mnt/project-files/texercises/FoTaBe-7Aufl.txt` (search it;
  page numbers are the numbers at the page bottoms), inside covers in
  `FoTaBe-7Aufl-Klappen.pdf`. Cite as "(FoTaBe S. 204)". Old sheets cite
  "FoTa S. xyz" from an older edition: look the value up in the 7th edition and
  cite its page, or name the table.
- A value the student would look up is taken from the table, not derived
  from physics the student hasn't met yet (Mars g from the planet table, not
  from Newton's law of gravitation). Stay at the level of the sheet.
- Predefined constants: `\ncG \ncc \nce \ncme \ncR \ncNA \nck` etc.
  (cheatsheet), or `\NewQty` with the FoTaBe value.

## Writing
- German, Swiss spelling (ss), Sie-form, keep the sheet's wording; light
  edits only for clarity. Sub-questions with `\begin{abcliste} \abc ...`.
- Indices on both quantities that are compared (t_Ä and t_P, not t and t_P).
- Uniformly accelerated motion over an interval: velocities at the start and
  end, their mean, times the interval (average velocity method).
- Prefer one formal solution over intermediate numerical results: derive the
  formula for the wanted quantity, then insert numbers once.
- Add a TikZ sketch to the solution when a situation has geometry or several
  bodies (throws, inclines, pulleys, forces, collisions, levers ...): black
  labels at normal size, `[>=stealth]`, about 8–11 cm wide, sized for large
  screens. Figures the text needs (graphs, apparatus) are redrawn in TikZ
  from the sheet renders in
  `/mnt/project-files/texercises/aufgaben-figures/doc-pages/<Topic>/*.pdf`
  (look at them, e.g. `pdftoppm -r 110 -png`), never as images.
- Short solution: one result per sub-question, `(a) $\XP{0}{2}$, (b) ...`.
- Round to 2 significant figures unless the data justify more.
- If the sheet's own answer is wrong, write the correct solution and report
  the error.

## Files
`exercises/<collection-slug>-NN-<short-slug>/` with `exercise.json`,
`preamble.tex`, `text.tex`, `solution.tex`, `short_solution.tex`;
`collections/<collection-slug>.json`. exercise.json:
`{"title", "note": "aus den Aufgabenblättern (<sheet>, Nr. <n>)",
"language": "GER", "type": 0 descriptive | 1 calculative | 2 both | 7 algebraic,
"default_difficulty": 1-6 (rule below), "default_points": 0,
"tags": [...] and "subbranches": [...] (rules below), "youtube": ""}`. No `"id"` until the collection has been
uploaded; then the ids from Samuel's export go in so uploads update in place.
Collection: `{"title": "<Name> – Aufgaben aus den Aufgabenblättern",
"description": "...", "kind": "sheet", "is_private": true, "tags": [...],
"items": [{"exercise": "<key>"}, ...]}`.

Check with `python3 tools/check.py` before handing over.

## Topics and tags (agreed with Samuel 23.10.2026)
`tools/vocabulary.json` holds the TeXercises topics, the rule for each one
that is easy to confuse, and the tags in use per language; `check.py` reads it.
- Topics (`subbranches`): the main topic first, a second one only when the
  exercise is really about it too. Electricity: DC circuits under "Direct
  Current", AC circuits under "Alternating Current", induction under
  "Electrodynamics" (plus "Magnetism"); "Circuits" is no longer used. Density
  under "Density", not Dynamics or Hydrostatics. Units and orders of
  magnitude: "Quantities and Units" first, the physics context second. Error
  estimates: "Measurement Uncertainty". Stars and galaxies: "Astrophysics".
  Ultrasound and sound level: "Acoustics"; every Doppler exercise: "Doppler
  Effect"; double slit and thin films: "Interference"; kinetic gas theory:
  "Gas Laws".
- Tags: lowercase, in the language of the exercise (German exercises get
  German tags; names like `de broglie` stay), singular, 2–5 per exercise.
  Take them from the vocabulary; `check.py` notes a new one, and it goes into
  the vocabulary only if it is meant. No tag that only repeats the topic
  (`kinematik`, `dynamik`, `hydrostatik`, `thermodynamik`, `gasgesetze`).
  Source tags have one spelling: `learningphysics`, `formelsammlung`,
  `matura` (+ `matura 2023`), `abschätzung`, `herleitung`,
  `ohne taschenrechner`.

## Difficulty (default_difficulty), agreed with Samuel 14.10.2026
Judge the exercise by its hardest required part, for a Gymnasium student who
has learned the topic; raise by one only when the whole is a long chain.
1. Reproduce: one step. One formula (also solved for another quantity), a unit
   conversion, a table look-up, recalling a concept.
2. Apply: two or three chained steps within one topic.
3. Combine: several steps or two concepts (kinematics + forces, energy + heat);
   explanations that need a sketch or a reasoned argument.
4. Transfer: unfamiliar situation that needs a model, assumptions or a formal
   derivation before any numbers; the hard part of a Matura exam.
5. Extended: long multi-part problem, estimation with own assumptions, or
   calculus (derivative, integral, numerical integration).
6. Beyond the course: differential equations, numerical methods, open
   project-like questions.
