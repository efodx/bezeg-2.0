# Control choice: slice brief (handoff-v13)

Common part of every step-2 slice brief. The dispatch message adds the slice's files, port and base commit.

**Role.** Implementation worker with edit permission in your own worktree. Do not push, do not delegate.

**Setup.** Your branch is new: `git reset --hard <base sha from the dispatch>`. If `node_modules` is missing run `npm ci`. Start a dev server on your port for screenshots: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port <port> --strictPort` (background).

**Goal.** In the slice's files, replace each typed number field (`NumberInput` and any local helper wrapping it) with the control the catalogue chooses. Read first, and only these: `docs/controls.md` (whole, it is short) and "Migration rules for every slice" in `docs/tasks/control-choice/README.md`. `node scripts/controls-inventory.cjs --json` lists every call site with line numbers; filter it to your files. Two finished examples to copy the shape from: `git show aecf4295` (Kinematics sliders) and `git show 7ad886af` (Descent sliders and a point list).

**Owned paths.** The slice's graph files, their tests, the lesson and chapter content that names their fields, and your own hunks of `src/localization/sl.ts` and `src/localization/en.ts`. Another worker edits other keys of the two catalogs at the same time in its own worktree: touch only keys of your graphs. Do not edit shared components under `src/graphs/inputs/` or shared CSS; if one blocks you, report it. Do not regenerate or commit `docs/tasks/control-choice/inventory.md`; the handler does. `docs/tasks/control-choice/decisions.json` entries for your files are yours.

**Settled decisions.**

- `Slider` treats an integer step as integer-only. A field that took decimals on an integer step needs `fieldDecimals`. Keep `integer` or `grid` exactly as the old field had it. Pass the old big step as `bigStep` (the point row has the prop too).
- Interval ends `a` and `b` are two sliders over the same fixed range, so their tracks line up; the existing handler keeps the order (`a < b`) and its refusal message. Where the old field's `min` or `max` followed another value (`min={c}`, `max={state.r}`, `max={state.n}`), give the slider the fixed outer range when the handler already refuses or clamps an out-of-order value, and keep the moving bound only when nothing else enforces it. Say which in your report.
- A number that is the abscissa of a marked point on the function (an `x` or `x0` with no typed `y`) is a `Slider`, not a point row. A pair `x0`, `y0` that places one drawn point (Euler's start) is one row of `PointListInput`.
- An integer that counts things (terms, steps, subintervals, harmonics, digits shown) is a `CountSetter`. An integer that picks a position or index (which harmonic, which `k` of a distribution, a threshold `N`) is a `Slider`.
- Size decides between the three for a large count: a `CountSetter` steps by one, so it suits a count of up to about 60 values; a count with more values (trials, sample size, walk steps) is a `Slider` with its exact field, and above about 1000 values the validity-limit rule below keeps the typed field. A random seed is an arbitrary identifier, not a quantity: it stays a `NumberInput` with `keep: seed`.
- An angle uses `AngleSlider` when the catalogue's entry fits its unit and range; otherwise a `Slider`, and say why.
- A repeated field per list item (one field per zero, per slot, per sample) stays a list: use `ValueListInput` if its entry fits, otherwise keep the fields and record `keep: <reason>` in `decisions.json`.
- A range that is only a validity limit stays a `NumberInput` with a `keep:` entry: when `(max - min) / step` is above about 1000 the track cannot set the value (Linear's slope within ±1000, Density's ends within ±400 by 0,01). Such a field keeps its old help.
- Put each control in its own `inspector-group` or keep the graph's existing grouping. Never stack a slider directly on a caption.
- Unchanged: state shape, Presets, routes, lesson actions, mathematics, commit timing, refusal messages.

**Acceptance.**

1. `node scripts/controls-inventory.cjs --check` reports no undecided number field in your files.
2. No local helper that only wraps a shared control remains in your files.
3. `just typecheck`, `just lint` and focused `just unit <your test files>` pass (see `just --list`; never bare `npx vitest`). The machine is busy: run each once, at the end, not after every file.
4. Tests follow the control. For each assertion you add or change, name the failure you observed before the change (or against the old markup).
5. One inspector screenshot per changed panel at 1440 × 900: `node scripts/controls-sweep/shot.cjs .command-logs/<slice>/<graph>.png <route without leading slash> --port <port>`. Open each image yourself and check it against "Layout in the inspector" in `docs/controls.md`: nothing wraps, clips or overlaps, labels sit beside their values.
6. Lesson and chapter sentences that tell the student to type into a migrated field are reworded to name the slider (search `src/learning/content` for the field's label and for your graph's lesson files). Wrap formulas as the existing prose does; `just unit src/learning/content/lessonMathNotation.test.ts` stays green. Check that no lesson clip or guided-example control step addresses a migrated field by a selector that no longer matches.

**Commit.** One or two commits in your worktree, explicit paths staged, message `feat: <what> use sliders ...`, ending with the attribution lines from the dispatch. Copy your screenshots to `<handler worktree>/.command-logs/<slice>/` (path in the dispatch) so the handler can open them.

**Return.** At most 250 words: commit sha(s); per graph one line (controls chosen, anything kept and why, moving-bound choice); checks run with results; screenshot paths; anything you could not finish. On a `HANDOFF` budget signal, commit what is complete and return the same report with the rest listed.
