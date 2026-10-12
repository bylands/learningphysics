# Exercise data for sheets per set

Derived from the TeXercises export of 10.10.2026 (1012 exercises), for picking a set's exercises by its learning objectives.

- `exercise-objectives.csv`: each exercise and the hub objectives it practises (`app:objective`, space-separated; empty if none). An automatic first pass (read from the exercise texts), approximate: worth a review.
- `exercise-labels.csv`: the 505 exercises that practise no hub objective, labelled (topic, skill, Bloom level, demand: single-formula / multi-step / ..., context, level: core / advanced).
- `candidate-objectives.csv`: those exercises grouped into candidate objectives; `placement` is `extend:<app>` (fits an existing app: "textbook" problems for its sets) or `new:<area>`.
- `similar-exercises.csv`: the five most similar exercises of each (TF-IDF of the text, score in brackets).

The pilot (`../pilot-electrostatics.json`) was picked from these: per objective of the set's apps, then textbook problems (`extend:<app>`, single-formula or multi-step, core or advanced), with a mix of 30 % easy (difficulty 1), 50 % average (2) and 20 % hard (3+).
