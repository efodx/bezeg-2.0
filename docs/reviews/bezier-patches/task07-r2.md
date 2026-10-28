# Task 07 R2 repairs and R1b browser recheck — 2026-10-28

Closes the deferred task 07 review items listed in [handoff 11](handler-handoff-11.md) step 3 with the decisions in [handoff 12](handler-handoff-12.md). Implementation: one `bezeg-worker` (Sonnet high), started from the uncommitted A–C work-in-progress left by handler 12; reviewed and accepted by handler 13.

## Repairs

| Item | Change | Regression evidence (observed pre-fix failure) |
| --- | --- | --- |
| A — math F4 | `zModeDrag` uses the camera fov and elevation: `dz = dy·2·tan(fov/2)·d / (H·max(cos el, 0.5))` (`surface-view/surfaceMath.ts`). The worker's 0.2 floor (5×) moved a point 8.11 units for a 40 px top-view drag in the browser; the handler raised the floor to 0.5 (2×, exact cursor tracking up to 60°), rechecked at 3.24 units. | Old formula fails all three new tests (el = 0 scale, projection keeps the point under the cursor at el 0/0.55/1.0, top-preset bound). |
| B — math F6 | Bernstein weight label reads `Utež točke P₀₀` / `Weight of point P₀₀` with subscript digits, matching the `P_{ij}` scene labels. | Plain-number rendering fails the literal-text assertion. |
| C — eng #8 | `publishFraming` skips projection while size, camera and points are unchanged; attribute content unchanged. | Removing the guard fails the `points.map` spy test. |
| D — eng #10 | Already at HEAD: `TensorPatchGraph.movePoint` returns early for unchanged xyz (`TensorPatchGraph.test.tsx`). | Not mutation-checked this round. |
| E — eng #11 | Control-point colour `0x7d9d61` → `0x5f8046`: 3.06:1 → 4.50:1 on white (surface tan 1.51 → 2.22; vs net lines 1.96 → 1.33). Asserted ≥ 4.5 so the old colour fails. | Old colour fails. |
| F — eng #12 | `SurfaceLabelOverlay` waits at most `SURFACE_LABEL_SETTLE_TIMEOUT_MS` (3 s) for typesetting and still-image decode, then proceeds (labels stay TeX text). | Removing either timeout fails its never-resolving fake-timer test. |
| G — shared batch dialog | `PresetSelector` re-reads Presets on every opening and checks them all; with none checked Generate is disabled with a localized status message, and confirm refuses an empty selection. Stored Presets and the file format are unchanged. | HEAD's `PresetSelector.tsx` fails all three tests. |

Decision: a second pointer during a point drag ends the drag and the point keeps its dragged position (no revert); documented in capabilities and ui-functionality.

## Checks

- Worker: `just check` passed (209 files, 4000 tests, lint, typecheck, build); `npx tsc --noEmit` exit 0.
- Handler after the clamp change: `npx tsc --noEmit` exit 0; `npx vitest run src/graphs/patches src/graphs/base` 43 files / 866 tests passed; `just build` passed; final `just check` before commit (see commit message).
- Browser (`bezeg-smoke`, Haiku medium, two runs against `just preview 4180` of the dirty worktree build, Chrome via Playwright channel): host `role="application"`, label and description present; degree 3→4→3 in u restores the net (0 px difference; v not exercised in browser); top preset at 390×844 touch, z drag 40 px → dz 3.24; batch dialog lists Presets saved after mount, empty selection disables Generate with "Izberi vsaj eno prednastavitev za generiranje slik."; hostile imports (15-point net, string coordinate) rejected with actionable Slovenian errors and the scene and list unchanged; zero console/page errors. Handler inspected the desktop screenshot: darker green points clearly visible on white.
- Earlier R1b evidence (handoff 12): pinch on touch emulation changed distance 17.37 → 4.34.

Gaps: v-direction round trip in browser; real `HTMLImageElement.decode` timeout (jsdom fake only); no physical touch device.
