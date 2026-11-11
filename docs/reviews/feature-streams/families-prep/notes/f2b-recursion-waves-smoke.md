# F2b recursion/growth/waves browser smoke

Build copy of `just build` (rev bd26e7c1, dirty) served on :4343; scripts and screenshots in `.command-logs/f2b-rw-smoke/`.
Routes `/analysis/recursion`, `/analysis/growth`, `/functions/waves`; 1280x800 and 390x844 (sl), one EN pass at 1280.

PASS (all three routes, both viewports unless stated): render/heading/inspector, no console errors; cobweb map options, x0 and m by keyboard, step forward, play/pause; growth model/kind/log options and d, n by keyboard; waves 4 modes, phasors, frequency, amplitude, time slider, play/pause; Reset restores default state and box; preset save, export, delete, import round trip restores state and stored box (after import the preset must be selected in the list, it is not applied automatically); cobweb x0 drag by CDP touch at 390 (0 -> 3.3) and by mouse at 1280; no horizontal overflow at 390; EN headings and labels; demonstrations lists the cobweb and growth cards right after "Negibna točka in iteracija", waves after "Enotska krožnica".

Findings
1. Product: waves at 390x844, Reset restores box [-0.66, 5.06, 1.06, -2.75]; the first load fits [-0.66, 7.68, 1.06, -2.75] (same at 1280 and for the other routes). Repro: open /functions/waves at 390, open Save tab, press Ponastavi.
2. Observation: cobweb has no step-back control (only "Naslednji korak"); check "step back" not applicable.
3. Observation: waves reduced motion: Predvajaj is aria-disabled, reason only in title and aria-describedby, no visible text (cobweb shows visible text "Zmanjšano gibanje ...").
4. Observation: waves status after import omits the "Prikaz je spremenjen" note shown before saving, though the view box is restored.

Gaps: demonstration family headings not distinguished in DOM, so family membership checked by order only; growth Interest panel params not individually exercised; reset "drawing identical" not comparable (SVG markup differs), state, status and box compared instead.

## Smoke repairs (handler 8)

- Waves 390 px Reset view: cause was not the caption room alone. At mount the board is 295 px high and settles to 547 px afterwards, so the first frame (7.68) was computed for a transient height; Reset framed at the final height (5.06). Fix in WavesGraph.tsx: `initialView()` flags a frame with caption room (`reframeOnBuild`, consumed in `applyFrame`/`syncReplacedScene`, one `showFrame`), and a debounced ResizeObserver (`reframeToSize`) re-frames a view still on the frame we drew when the board size settles (a view the user moved is left alone). Browser at 390 (`scripts/rs2.cjs`, port 4345, stopped): load, save tab, after reset and reload all [-0.66, 5.06, 1.06, -2.75]. Before: load 7.68, reset 5.06.
- jsdom test "Reset gives the view the first load gave" (390 px board) failed before the fix (observed); it does not model the settling height, so the browser run is the guard for that part.
- Reduced motion: visible `<p id="waves-play-reduced-reason">` with existing key `playback_block_reduced_motion`; Play linked by aria-describedby through a new optional `playDescribedBy` prop on `PlaybackButtons` (src/graphs/base/controls/PlaybackButtons.tsx, additive; Play only when blocked). Test asserts visible text (not inside `[hidden]`) and the link; failed before. No locale change.
- Checks: tsc 0 errors; lint passed; unit (WavesGraph.test, functions/waves, src/waves, base/controls) passed; sweep BEZEG_TRANSIENT_STATE=waves passed; build passed; git diff --check clean (CRLF warnings only).
