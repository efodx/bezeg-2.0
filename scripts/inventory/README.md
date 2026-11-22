# Demonstration inventory

```
node scripts/inventory/inventory.cjs [--root <repo>] [--out <dir>]
node --test scripts/inventory/inventory.test.cjs
```

Writes `docs/reviews/ux-picks-app-wide/inventory/inventory.json` (everything) and `inventory.md` (totals, pilot candidates, hub files, components and one row per demonstration). It is the authoritative work list for task 08 ([task 02, slice 5](../../docs/tasks/ux-picks-app-wide/02-declaration-contract.md)). Source text only: the TypeScript parser, no type check, no browser; about a second. Output is sorted and has no timestamp, so a rerun on unchanged source is byte-identical. Rerun it after the shared-code step of task 08 and after every round.

## What a row means

- **Registration:** a property of an object in `src/graphs/**/runtime.ts` whose value is `() => import('./File').then(m => () => new m.Class())` (`m.default` too). Class chain: followed through `extends` and imports up to `BaseGraph`.
- **Scope of a graph:** its class (only that class's range when a file holds several), its base classes other than `BaseGraph`, and the *panel files* those use: components imported from `src/graphs` and rendered as JSX tags (up to three levels), excluding `src/inputs`, graph classes, `base/BaseGraph.tsx` and the primitives in `base/controls/` that do not end in `Controls.tsx`. Items found in a base class or panel are `inherited`; the files are `sharedFiles`.
- **Controls:** JSX tags imported from `src/inputs/` or `base/controls/` (not display components such as `ReadoutList`, `LiveReadout`, `RefusalNotice`), plus native `input`, `select`, `button`, `textarea`. Range is the literal text of `min`/`max`/`step`. Label is the catalog key when the prop is `t("key")` (or a helper called with a key of `sl.ts`), else the literal or the expression text.
- **Readout rows:** object literals with `label` (or `*Row` tags with `label`) inside a function named `*readout*` or inside a `*Readout*` tag. **Legend entries:** the same inside a `*legend*` function, and objects with `text`, `color` and `visible` (a legend drawn on the board). **Board captions:** `board.create('text' | 'label', [x, y, text])`.
- **New-string candidates:** JSX text, string-literal values of label-like props (`label`, `title`, `help`, `placeholder`, ...) and literal board text with two or more letters. Catalog calls are not candidates. `totals.newStringCandidates` counts each file and line once; the per-graph figure counts shared files for every graph that uses them.
- **Lessons:** objects with a literal `demonstrationId` in `src/learning` files named `*Lesson(s).ts(x)`; other files naming the id are `chapterFiles`. A step is an object with an `id` plus `frames`, or `id`, `title` and a body field; `steps` may be an identifier or a spread resolved to a top-level constant, or a list of helper calls (one step per call, no frame ids). A step without explicit frames counts one frame. **A9 candidates:** steps whose text (all string literals but `scene`, `frames`, `animation`) contains, case-insensitively, a control label (Slovenian or English, at least four letters) of the graph. Nothing more is inferred; the converter decides per frame.
- **Own tests:** same-directory tests starting with the graph file's name, plus any test importing the graph file.
- **Flags and blocker class:** surface (chain has `BaseSurfaceGraph`), point-set (chain has `PointSetGraph`, or a scope file reads the mouse position), playback (a scope file imports `PlaybackButtons`, `AnimationDriver`, `useLease` or the animation runtime), legacy-step (its lesson file defines a local `step` helper), shared-base (controls inherited from a base class or panel), outside-baseGraph-controls (a scope file under `src/learning` renders controls). `blocker` is the first match in the order outside, surface, point-set, playback, legacy-step, shared-base, else plain.
- **Components:** graphs connected through a shared file (`sharedFiles`). `components` uses every shared file; `componentsWithoutHubs` ignores files used by 20 or more demonstrations (`FunctionReadout`, `BaseFunctionGraph`, the curve workspace files, ...), which otherwise join most of the app. `outsideBaseGraph` lists `src/learning` files with shared controls that no registered graph uses (the Playground).
- **Pilot candidates:** among demonstrations that do not bind parameters yet, smallest component, then smallest control/readout/legend/string/frame weight.

## Known blind spots

- Heuristics: a readout, legend or caption built by a helper with another name, a control behind a wrapper component from a file outside `src/graphs`, or strings assembled at run time are missed. `hasBoard` is not reported (every demonstration has a board or surface view).
- Lesson steps whose text lives in a variable or helper, and frames of helper-built steps, are not enumerated; A9 candidates are noisy for short generic labels.
- Playback and point-set detection look at imports and one mouse-position call, not behaviour. Graph state, drawn objects and per-mode controls (a control rendered only in one mode) are all counted once.
- A `Slider` rendered twice by a loop counts once.
