# Families-prep state note

Handler 6 handed off at BUDGET SOFT on 2026-11-11 to handler 7. The worktree is on branch `worktree-stream-families-prep-2`. Workers dispatched by handler 6 may still be running (see "In flight"); their reports go to handler 6, not to you. Watch their notes and the working tree, and do not dispatch a second worker on a slice until its note shows the worker stopped (a "Review repairs" or "Repairs" section that lists every item as done or not done, or a HANDOFF). Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take two minutes or more while agents run. Give commits about 300 s and tsc about 200 s, and prefer the file tools for reading.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <id,id,...>` (comma-separated, oldest first), then check `just publish --status`. Pushed hashes differ from local ones, because publish rebases. Wait for a pending publish before you start one that depends on it.
- The publish gate runs `git diff --check`: it rejects trailing whitespace and a blank line at the end of a file (solids failed once on the latter). Run `git diff --cached --check` before committing. `grep -P` needs `LC_ALL=C.UTF-8` on grep itself, not on git.
- Edit spec text with the Edit tool. Shell or Python replacement strings must not contain `\b`, `\v`, `\a` or `\t`.
- **Staging one slice's locale lines (changed by handler 6).** Use `python .command-logs/h6-stage-only.py <drop-prefix>`. It stages each locale file as the working copy minus the *new* lines (absent from HEAD) that start with `"<drop-prefix>`. The old `h5-stage-only.py` also dropped existing keys with the prefix, which breaks when a slice adds keys to an existing family block such as `linear_map_*`. Run it once per other slice's prefix, because each run restages from the working copy. With two foreign prefixes, extend the script or stage by hand. Then confirm that `git diff --cached -U0 -- src/localization | grep -E '^[+-][^+-]' | grep -v <your-prefix>` is empty.
- **Mixed owner-kind line.** `surfaceScene.ts` held two slices' union members. Handler 6 staged one with `git hash-object -w` from a `sed` of HEAD plus `git update-index --cacheinfo`.

## Done

- F0, and all ungated F1 (handlers 2 and 3).
- **F2a.** Every graph has no route yet. Each passed engineering, maths and UI/accessibility reviews, and its repairs. Evidence is in `notes/f2a-*.md`, and decisions are in each spec's "F2a decisions" bullet.
  - Earlier: trigonometry 03–05, circle geometry 02, analytic lines 02, isometries 03.
  - Handler 5: randomness 03, combinatorics 02, kinematics 02, recursion 02, waves 02, mechanical-curves 02 (pushed as `318b0aeb`).
  - Handler 6 (local id → pushed):
    - state note `83f68a1c` → `f032639c`;
    - phase portraits 03 `7eea3b2f` → `9d360010`;
    - solids 03 `7c2312f1` + whitespace fix `51f1e099` → `df80c7a8`;
    - level sets 04 `20f18148` → `dae9c988`;
    - linear maps 11, F2a part, `a710665f` → `f5c57e20`.
  - The base for the next publish is `4867b314` (complex maps, see "In flight"). Check `just publish --status` first.
  - To stage one slice's locale lines when another slice also changed existing keys, use `python .command-logs/h6-stage-keep.py <prefix> [...]`. It stages HEAD plus only the inserted blocks whose keys start with the given prefixes. It does not stage modified existing lines; for those, commit the other slice first or stage by hand.
- **Owed at F2b** (also in each family's spec or task):
  - browser drag and playback measurements, because every F2a figure is a jsdom placeholder. Solids and level sets recorded compute-only numbers in ADR 0051 and ADR 0053.
  - Preset restore through the model parsers;
  - the frieze NaN-break render check;
  - the waves sinc cost;
  - the phase-portraits curve updates;
  - the level-sets `JsxSurfaceView` update (jsdom 23/49 ms);
  - the `LessonAction` union entries for the new scene actions (linear maps `set-start`/`step`; complex maps; level sets);
  - a browser look at every legend layout.
- **Controls-stream gaps** are filed in `docs/tasks/feature-streams/controls.md`:
  - reduced motion is read only at render;
  - the fixed reduced-motion Play reason text;
  - `PlaybackButtons` has no description slot (worked around by `src/graphs/linear/StepCounter.tsx`);
  - `NumberInput` is 40 px wide;
  - there is no checkbox group.

## In flight (uncommitted; check each note before acting)

1. **Complex maps 09** is reviewed, repaired, rechecked by a handler mutation, and committed as `4867b314`.
   - Its publish was started in the background on base `a710665f`. Check `just publish --status`, and use `4867b314` as the next base once it is ok.
   - If it failed, fix the failure in a new commit and republish with both ids.
2. **Controls-compliance repairs** of the five earlier graphs (UnitCircle, TriangleSolver, CircleConstruction, LineGeometry, Isometry) are committed as `bedb5fb6`.
   - The findings, the repairs and 14 mutations are in `notes/f2a-controls-compliance.md`.
   - The locale diff was checked: it touches only these graphs' keys.
   - It is not yet reviewed after the repair. Before F2b, run a short Haiku UI recheck of the changed legends and help.
   - Publish: handler 6 started a background loop that waits for `4867b314` and then publishes `bedb5fb6` and this state-note commit. Check `just publish --status`; if no run for `bedb5fb6` exists, publish both yourself on base `4867b314`.

## Next

- F2a of the queue is otherwise complete. After the two in-flight slices, the next work is F2b–F6 per family release task. First read the family template in `docs/tasks/feature-streams/README.md` and its shared-file rules. F2b needs Controls step 7, which is accepted.
- No item gates on a browser yet.

## Pipeline that worked (handlers 5–6)

- **Slices span workers.** A graph slice takes two to five workers: model and measurement, then graph, then tests and mutations, then a short finishing worker for lint, greps and the final note. Every worker stops near its 135k HANDOFF with a usable note. Brief each successor from the note in about 400 words, with the predecessor's open doubts settled as numbered decisions.
- **Reviews.** Engineering (Sonnet, ≤400 words), maths (Sonnet, ≤350 words, at least six re-derivations), UI/accessibility (Haiku, ≤300 words, an "already known" list, reading by sections). Then one Sonnet repair worker with numbered decisions. Record the decisions in the spec's F2a bullet yourself. Before committing, run one mutation yourself on the most important repaired assertion. Repair workers often write a test together with its fix and never see it fail.
- **Lessons each brief carries.**
  - describedBy help that states the range;
  - a caption for every element a readout names, with a test that ties each legend's stated style to the drawing attributes (handler 6 found legend/board mismatches in two slices);
  - no hard-coded strings or punctuation;
  - caches keyed on state identity;
  - typed input refused, drag snaps or clamps;
  - one status region;
  - pause only when stored content changed, including a direct `setState`;
  - rounded values never follow "=", and exact values are shown exactly with the decimal beside them;
  - Slovenian counts count-neutral;
  - controls that do not apply hidden with a reason;
  - per-instance ids;
  - JSXGraph `arrow` elements own their end points, captions need `parse: false`, and `needsRegularUpdate:false` curves are drawn once at creation;
  - `git diff --check` and no blank line at the end of a file.
- **Locale.** Name the block's anchor key in each brief and forbid sed, Python or scripts on any file. One worker still used Python; brief the next one to verify the integrity first.

Rules to keep: at most two workers in the stream at once; never edit shared host files. At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
