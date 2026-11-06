# Curves stream: handler handoff 71

Handler 71 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during the poster recapture. It replaces [handoff 70](handler-handoff-70.md).

## State

- **On `origin/master`:** everything through this note. All five families stay complete. Only the low-priority list and the owner items remain.
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview or worker of this handler should be running. Port 4314 is free.
- Earlier `python.exe tools/agent-usage/...` watchers and the stray `python.exe -` (PID 33116) belong to earlier sessions; leave them.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 19.4 GB free at this session's start; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. FFmpeg as in [handoff 58](handler-handoff-58.md#state).
- **Images are expensive context.** Viewing comparison sheets took much of this session's budget. Send bulk visual comparison to a worker.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| None | **Hosted CI for `14e4bf0d`:** closes handoff 70's item | Run 42230130173: all 12 jobs success |
| `0be8f98f` | The NURBS graph builds one scene per mount and import. The double build happened on **every mount**, not only on a size change as handoff 70 said | The new test failed first (one disposal during mount) and passes after the fix |
| `a68e4648` | CltGraph lifecycle tests. The notice item closed with **no code change**: an import always replaces the model, so a render follows, and a test now pins it | The four new tests passed without any fix; none was mutated |
| `1f9fbf20` | Clip encoding works on FFmpeg 9.0.2 through `setparams` | `scripts/demonstration-preview-capture.test.cjs` 37 of 37 with FFmpeg set; closes the VP9 `bt709` local failure |
| `b0f01c76` | **Recapture of 24 posters and 19 clips** | Sweep below; published posters byte-equal the reviewed ones; one decoded clip frame viewed |

**Poster sweep.** All 118 ids were captured to scratch with `PREVIEW_IDS` from `14e4bf0d` and compared by bytes: 91 identical, 24 different, 3 not capturable. All 24 were viewed old against new. 22 change only the tick separator. `interp-lagrange` loses the board readout, as `6d73fb78` intended. `prob-binomial-normal` has no visible change (it follows `c9fee6c9`). **The `prob-*` posters show no ticks**, so handoff 70's guess about them was wrong.

**Behaviour change.** Those posters and clips now read `0,5`. No route or stored format changed. The manifest is mixed-source (`mixedGraphSource: true`), and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` was set because the only presentation change was the encoder filter.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just unit src/graphs/curves/bspline src/learning` | `0be8f98f` content, before commit | Exit 0: 130 files, 2 229 tests |
| `just unit` on `sceneReplacementContract` and CLT, `tsc`, lint on the changed files | Same | Exit 0 |
| `just unit` on `demonstrationPreviewAssets` and `DemonstrationsPage`, `just tooling-test` | Recapture, before commit | Exit 0 |
| `just build` | `b0f01c76` | Exit 0 |
| Full `just check`, smoke | None | **Not run.** Only the NURBS import changed in app code; hosted CI covers both |
| Hosted CI | This push | **Not yet read** |

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first.
2. **Card images with decimal ticks.** Not checked: 56 retained and 42 chapter images under `src/images/learning/examples/`. Inventory and capture as [the command guide](../../../commands.md) says (default `PREVIEW_BASE_URL` port 4387; a run without `--id` rewrites that family's manifest). Recapture each family, list which PNGs changed by bytes, and have a worker compare them. Keep a change only if it is the tick separator or intended. `school-function-graphs`, `numerical-methods` and `fourier-series` look likeliest.
3. **Two poster recipes, cause found, not started.** Each needs `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`, since the recipe file is fingerprinted.
   - `prob-correlation`: the default residuals are shorter than the point markers. Try the `outlier` example through the `Primer` select, and refit the window to its data.
   - `curve-evolute`: at the opening t the labels E, N and T collide. Try t near 0.8, where E is near (-2.05, 2.42) and T at (0.8, 0.64). Update the recipe's description too.
4. The remaining low-priority list:
   - Playback buttons give no reason when aria-disabled. The markup is copied in at least six controls (`CltGraph`, `BisectionGraph`, `compgeo` and others), so this needs a shared piece and new strings.
   - Pointer drag stops at the board edge.
   - D1's and D2's curves are small at 390 px; step 5, frame 1 at 1280×720 is hidden until the panel moves.
   - [AB-B-6](../../advanced-bezier/ab-b-6-gate.md#carried-polish) and [AB-C-6](../../advanced-bezier/ab-c-6-gate.md#carried-polish) carried polish, what remains of it.
   - Tiny: at 200% text a closed native select truncates long values (34 options), and the `probability/summary` legend passes the panel by 1 px at 1440.
5. **New, low priority:** `farin`, `rational` and `rational-subdivision` fail capture, so a full generation stops at them. Two weight smartlabels on each land below the 440 px frame. The `rational` poster dates from 2026-10-26, a day before the JSXGraph 1.14.1 upgrade (`e0191c0a`), which may be the cause; that is **unverified**. Retained posters are unaffected. Check whether the labels also misplace on the live route.
6. **Closed this session:** the NURBS double build, the notice render request, CltGraph lifecycle tests, the VP9 failure, the decimal ticks on posters and clips.
7. When only owner decisions remain, do not launch a successor. End with the open items below.

## Open for the owner

Unchanged from [handoff 68](handler-handoff-68.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices, chapter `investigationPrompts` displayed nowhere, `expectedObservations` rendered by nothing.

## Risks and notes

Handoffs 61 to 70's "Risks and notes" still apply, and those they inherit.

- **A recipe-aligned clip must match its poster,** so a poster with a clip cannot be recaptured alone. Clips need `PREVIEW_FFMPEG` and `PREVIEW_FFPROBE`.
- **`PREVIEW_IDS` is a safe diagnostic.** It writes only to `.command-logs/preview-staging-<pid>` and aborts at the first failing id, so run ids in chunks and retry a failed chunk one by one. It takes about 10 s per poster.
- **Capture exit codes.** Do not end a capture wrapper with another command, or a failed capture reports exit 0. That happened once here.
- **`console.log` in a test does not reach the `just unit` log.** Assert instead.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-71.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
