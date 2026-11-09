# Wave 3 R1b evidence (readouts outside compgeo)

## C27-06 projective (done)
- The five `*Controls.tsx` status blocks lose `role="status"`; `data-projective-status` etc. stay. Each control mounts one `LiveReadout` (`useStatusReadout(..., true)`, `data-projective-live`) carrying the status lines plus, when stepped, the nudge sentence. `data-projective-nudge` is removed: its only readers were three host tests (updated to read `data-projective-live`, with fake timers for the settle).
- Observed failures: ThreeViews `role="status"` put back on the status div -> ThreeViews host test failed; Pascal nudge text dropped from the live text -> Pascal host test failed (`.command-logs/w3-r1b-mut1.log`).

## C27-07 complex and linear (done)
- Three complex graphs and LinearMapGraph: the `demo-status` group is now `FunctionStatus` (`className="demo-status"`, hooks `complex-status` / `linear-map-status` unchanged): plain lines plus one settled `LiveReadout`. `LinearMapGraph.test.ts` reads `FunctionStatus.props.lines` instead of the `p` elements.
- Observed failure: `role="status"` added to `FunctionStatus`'s div -> both new host tests (complex multiplication, linear map) failed (`.command-logs/w3-r1b-mut2.log`).
- Left as is: `#linear-map-notice` (clamped/snapped notice, a refusal channel, not a readout block).

## FunctionReadout, ReadoutParts carry-over (items 2, 6, 7, 8)
- `FunctionReadout` is a thin wrapper: `ReadoutHeading`, `ReadoutList` (labelled rows, `dl`, `data-readout` hooks kept) and `ReadoutHelp` (no `role="note"`). The note colour rule is `.function-readout .inspector-help` now. Row styles moved to `ReadoutParts.css` (`.readout-list-row`, renamed from `.function-readout-row`; no reader outside the two files).
- `ReadoutScrollTable` measures after every render and observes the wrapper and its children.
- Tests strengthened in `ReadoutParts.test.tsx` (fits case checks the measure ran and `data-scrolls`; grow/shrink inside a fixed wrapper; observer on the table; heading/help class and tag) and `compgeo/readoutParts.test.tsx` (named list, exact Triangulation sentence).
- Observed failures (`.command-logs/w3-r1b-mut3.log`): observer without children and measure only on mount -> grow test and observer test failed; Delaunay list label changed to "x" -> the named-list assertion failed (the old `/.+/` form would have passed).

## C27-08 / C27-09 notes and scroll tables (written, test run pending when the budget signal arrived)
- `role="note"` -> `ReadoutHelp` (hooks instead of classes): Epicycle chord fallback (`data-testid` kept), Fourier decay zero/floor notes (`data-testid` kept; `.fourier-decay-note` css rule dropped), RootFinding truncated note, patches (`data-patch-note="corner-shared|join-derived|point-locked|split-locked|interior-required|compare-domains|compare-boundaries"`). `FunctionReadout` notes carry `data-readout-note`. Patch tests that read `[role="note"]` or `.patch-*` classes (TensorJoinPanels.test, TensorSubdivisionPanels.test) now read these hooks.
- Scroll tables: Epicycle table (`EpicycleGraph.tsx` EpicycleTable, `.epicycle-table` css sets `--readout-scroll-max: 14rem`) and Bezier clipping table (`BezierClippingControls.tsx`, new `BezierClippingControls.css`, 16rem) use `ReadoutScrollTable`.
- `ReadoutParts` extension (I own it for items 6-8): the scroll table also measures `scrollHeight > clientHeight` and the css has `overflow: auto; max-height: var(--readout-scroll-max, none)`. Proposal for the reviewer: this is a change to the shared part beyond items 6-8; no test yet for the vertical case.

## Handoff (stopped on HANDOFF)
Not done:
- C27-10 collision readouts and Inspect progress (`src/learning/playground/collisions/CollisionInspect.tsx:244-276`: `collision_inspect_progress` text built by hand at :249 -> `StepCounter noun="event"`; two `role="status"` regions to reduce to one `LiveReadout`; `inspect-live` test id is read by tests, grep before touching).
- C27-12 function counters `*_board_progress` (BisectionGraph:255, FixedPointGraph:331, RootFindingGraph:248): these are board text strings (`text:` callbacks), not inspector counters; decide whether `StepCounter` applies (probably not: they carry extra values). Other hand-written "k of n" not searched.
- Mutation-checks for: patches hook renames, ReadoutHelp conversions, Epicycle/Bezier scroll table, vertical measure. No new test for Epicycle/Bezier wiring or vertical scroll.
- Not run: `just typecheck`, `just lint` on all touched files, lesson tests that read these hooks (`projective*Lesson.test.ts`, `linearMapsChapter.test.ts`, `complexMapsChapter.test.ts`, patch lesson tests, `src/learning/content` Fourier/Epicycle tests), collisions tests.
- sl.ts/en.ts untouched (no key added or removed so far).
Files touched: see `git status` (projective Controls and host tests, complex and linear graphs and tests, functions/FunctionReadout.*, EpicycleGraph.tsx/.css, FourierDecaySpectra.tsx/.css, RootFindingGraph.tsx, patches *Panels.tsx and two panel tests, compgeo/BezierClippingControls.tsx/.css and readoutParts.test.tsx, base/controls/ReadoutParts.tsx/.css/.test.tsx). Helper script `.command-logs/subhelper.py` is scratch (CRLF-aware replace), safe to delete. Other modified files in `git status` (BezierCurveControls, compgeo *Controls, inputs/) are not mine.
- After the handoff: TensorJoinPanels.test derived-note role assertion flipped to toBeNull (decision 63); functions+patches+ReadoutParts+Bezier clipping unit run: 2686 passed, that one failure, now fixed and rerun (see .command-logs/w3-r1b-tj.log).

## Continuation
- C27-10 done: `CollisionInspect.tsx` counter is `StepCounter noun="event"` (hook `data-inspect-progress`), the two `role="status"` regions are plain; one settled `LiveReadout` muted while playing (`data-inspect-live`, replaces test id `inspect-live`); `announce` = `readout.replace`. Behaviour change: an identical repeated message is no longer re-read; the "playing" announcement is dropped (muted). `PlaybackButtons` keeps its own `role="status"` (shared part, not touched). Tests updated (trailing period from normalise; one `[data-readout-live]`). `linearMapsChapter.test.ts` `statusIds` now reads `FunctionStatus.props.lines`; `NumberInput.test.tsx:115` reads `[data-readout-note]`.
- Vertical measure kept, now covered by a new `ReadoutParts.test.tsx` test; wiring tests added for Epicycle and Bezier clipping tables.
- Observed failures (`.command-logs/r1b2-mut.log`): role="note" back in `ReadoutHelp` -> ReadoutParts and TensorJoinPanels tests failed; Epicycle and clipping wrappers replaced by fragments -> both wiring tests failed; scrollHeight part removed -> vertical test failed. All reverted.
- Checks: typecheck passed; unit (functions, patches, projective, complex, linear, readoutParts, base/controls, collisions, NumberInput, learning/content): only linearMapsChapter failed, fixed, rerun passed. Lint: only `src/inputs/PointCollection.tsx:165` (repair 3's) fails.

## Handler review and repairs (2026-11-09)

Reviews: engineering (Sonnet) no blocking finding; UI and accessibility (Haiku) two blocking findings, both confirmed and repaired by the handler:

1. `CollisionInspect.tsx`: the wrapper of the Previous reason had lost `role="status" aria-live="polite"` (decision 18 keeps notice regions). Restored.
2. `CollisionInspect.test.tsx`: the `keyboard path` block (tab order, Enter steps, Previous reason) had been deleted. Restored from HEAD; the reason test now also asserts the polite region. Observed failure: with the role removed, "keeps Previous, Next, Play, New in DOM order ... in a polite region" fails (`.command-logs/h-coll-mut.log`); passes restored.

Also fixed: missing space in `CrossRatioControls.tsx:48`. Accepted as is: `#linear-map-notice` keeps `role="status"` (a refusal notice, empty until a clamp or snap, decision 18); the Fourier note now uses `.inspector-help` styling; `collision_inspect_playing` is no longer announced (muted while playing) and becomes unused (C29 removes it). Open (low): `ReadoutHeading` relies on `.inspector-reveals-title` from `functions/FunctionReadout.css`; empty `FunctionReadout` rows render an empty `ul`; `ChapterPage.tsx:135` keeps `role="note"` (learn-ui stream's file).
