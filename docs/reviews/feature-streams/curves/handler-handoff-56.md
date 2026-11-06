# Curves stream: handler handoff 56

Handler 56 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 55](handler-handoff-55.md).

## State

- **On `origin/master`:** everything through this note, including CG-B3-5. `just check` passed on `8146bef0` with only documentation dirty (`EXIT=0`). Hosted CI for handoff 55's head passed (run 42130096383). Hosted CI for this push was not read before handoff: read it first, by the `master` head SHA.
- The branch is local `worktree-stream-curves`. The remote `worktree-stream-curves` is stale and diverged; leave it and never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** about 10.3 GB free at the last reading; check it first.
- FFmpeg 9.0.2 is under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*\ffmpeg-*\bin`, not on PATH. Set `PREVIEW_FFMPEG` and `PREVIEW_FFPROBE` for a poster capture.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `e92f9f44` | Offset and envelope cards; curve-geometry cards fit their own scene; generator and framing tests | [CG-B3-5](../../curve-geometry/cg-b3-5-media.md) |
| `8146bef0` | Posters; `POSTER_PENDING` empty; new `curve-envelope` window | Same |
| This note's commit | Evidence, task status, [criterion audit](../../curve-geometry/cg-b3-6-criterion-audit.md) | |

## Next steps, in order

1. **CG-B3-6: Batch 3 gate.** The audit is done: 36 rows, 1 uncovered, 7 partly. The handler did not recheck its rows. Work through its [gaps](../../curve-geometry/cg-b3-6-criterion-audit.md#gaps-most-important-first):
   - **Layer repair, proposed and not yet made.** The family draws above the Bézier curve, so the curve reads only as the fill's edge. Both are JSXGraph curves on layer 5. Giving the family's `dataCurve` in `EnvelopeOverlay.ts` `layer: 4` should put it under the curve and above the polygon on layer 3. Check by eye at 200 lines, add a test, then recapture the `curve-envelope` poster; the card hides the curve and does not change.
   - **Accessibility:** keyboard operation of the offset and envelope sliders, and a colour-alone check. Model on the [Batch 2 gate](../../curve-geometry/cg-b2-6-gate.md).
   - **Browser pass:** the spec's smoke scope is the chapter, both routes, a Splines regression and one live language switch, in both languages. Add whole-pixel pointers on the collinear drag, not run so far. Real touch stays a stated gap unless a device is available.
   - **Records:** L6 has 7 steps where the spec lists 5; update the spec. Record or run a mathematical pass on the L5 lesson numbers. Settle the Preset pin and the circle-arc row.
   - **Layout findings:** take in those of [CG-B3-3](../../curve-geometry/cg-b3-3-lesson.md#layout-findings-for-the-gate), [CG-B3-4b](../../curve-geometry/cg-b3-4b-lesson.md#layout-findings-for-the-gate) and the caption overlaps in [CG-B3-4a](../../curve-geometry/cg-b3-4a-graph.md#review-and-smoke-findings). Most are family-wide; the Batch 2 gate carried such items, so give each a disposition. Then `just check`, `smoke-lesson`, hosted CI and a gate record.
2. Family 5 and the low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) steps 4 and 5, with its polish items.

## Open for the owner

Unchanged from [handoff 55](handler-handoff-55.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices.

## Risks and notes

Handoff 55's "Risks and notes" and "Lessons for briefs" still apply, and those it inherits.

- **A full chapter capture applies poster windows to cards.** `captureRecipeForEntry` now exempts `curve-geometry` only. Another chapter's full capture can reframe a card silently: compare the PNG diff after any capture.
- **New card PNGs need `npx vitest --clearCache`,** or `guidedExamplePreviews.test.ts` reports a missing image.
- **A poster recipe can pass and still be poor.** The capture passed the first envelope window. Open each poster, and give a window the 720:440 aspect.
- `demonstration-preview-capture.test.cjs` fails its VP9 `bt709` test only when FFmpeg is set; otherwise that test is skipped.
- Stopping a background `just preview` reports the task as failed; that is expected. Find the PID by port 4314 and use `taskkill //T //F`.
- 112 of the 116 catalog images are lazy: scroll before counting broken ones.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-56.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
