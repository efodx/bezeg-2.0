# Curves stream: handler handoff 70

Handler 70 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during the low-priority list. It replaces [handoff 69](handler-handoff-69.md).

## State

- **On `origin/master`:** everything through this note. All five families stay complete. Only the low-priority list and the owner items remain.
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview or worker of this handler should be running. Port 4314 is free.
- Earlier `python.exe tools/agent-usage/...` watchers and the stray `python.exe -` (PID 33116) belong to earlier sessions; leave them.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 20.1 GB free at this session's start; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| None | **Patch posters checked, no recapture.** Each of the seven patch recipes run against `dc378161` gave a PNG byte-identical to its published poster, and every camera equalled its recipe. Control: two different posters differ | Script below; recipes already press *Ponastavi pogled*, so `8efbdc15` moved nothing |
| `7945902f` | Tick labels use the app language's decimal separator on every board, and a language switch redraws them | Mutations below; `0.05` in English and `0,05` in Slovenian seen in the production build |
| `c9fee6c9` | P2: the normal-area legend swatch is a plain area, the unseen dash is gone, and the fit leaves more room above the peak so the rare example's caption clears it | Test on the rare example; viewed |
| `418860ff` | P5: both line labels sit outside the wedge of the two lines, and a falling x line's label no longer hides behind the caption | Six placement tests; viewed rising and falling at 1440 and 390 |

**Behaviour change.** Board tick labels now read `0,5` in Slovenian. Figures and SVG exports follow. No route or stored format changed. The fitted P2 view is about 10% lower in scale, and the P2 poster keeps its own window.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| Hosted CI | `dc378161` | Success: run 42221638699, all 12 jobs read. Closes handoff 69's item |
| `just check` | The three commits, before they were committed | Exit 0 on the third run: 607 files passed and 3 skipped, 11 951 tests passed and 4 skipped, build passed. Run 1 failed on lint; run 2 on `GraphHost.test` and six subscription counts, both fixed |
| `just smoke-lesson prob-binomial-normal prob-correlation prob-density` | Same build | Exit 0. No full browser checklist: hosted CI's smoke jobs cover the other routes |
| Mutations on `CorrelationGraph.host.test.tsx` | Dirty tree, an earlier form of the code | Control passed. Removing the tick hook, removing the redraw and rounding labels to two places each failed their own test. **Not rerun** after the hook moved to the prototype lookup. The fourth mutation covered a slope rule since replaced by `lineLabelPlacement`, whose six tests were not mutated |
| Hosted CI | This push | **Not yet read** |

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first. The tick change reaches every board, so read each browser job.
2. **Decide on posters with decimal ticks.** Published posters and chapter-card images still show `0.5`. Find which do (small windows such as `prob-*`), then decide on one selective recapture. Slovenian-only card images are an open owner item, but these are Slovenian images with an English separator, so a recapture is in scope.
3. The remaining low-priority list:
   - Faint `prob-correlation` residuals on the poster.
   - `BSplineNurbsGraph.importPresetData` building the scene twice (nit, only when an import changes the size); `importPresetData` clearing the notice without its own render request; CltGraph lifecycle tests.
   - Playback buttons give no reason when aria-disabled; pointer drag stops at the board edge.
   - D1's and D2's curves are small at 390 px; step 5, frame 1 at 1280×720 is hidden until the panel moves; the evolute poster's crowded labels.
   - [AB-B-6](../../advanced-bezier/ab-b-6-gate.md#carried-polish) and [AB-C-6](../../advanced-bezier/ab-c-6-gate.md#carried-polish) carried polish, what remains of it.
   - Tiny: at 200% text a closed native select truncates long values (34 options), and the `probability/summary` legend passes the panel by 1 px at 1440.
4. **Closed this session:** P5 line labels, the three P2 visual notes of handoff 30 item 4, the patch posters.
5. When only owner decisions remain, do not launch a successor. End with the open items below.

## Open for the owner

Unchanged from [handoff 68](handler-handoff-68.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices, chapter `investigationPrompts` displayed nowhere, `expectedObservations` rendered by nothing.

## Risks and notes

Handoffs 61 to 69's "Risks and notes" still apply, and those they inherit.

- **JSXGraph's `intl` option is not a safe tick formatter.** It drops the exponent fallback and rounds to `digits`, so a zoomed axis would repeat labels. `localizedTickLabel` wraps the default text instead.
- **Tick labels rebuild only on a full update.** `BaseGraph.createMainView` subscribes to the language for that. A graph that overrides `createMainView` without calling `super`, or an auxiliary board, does not get it.
- **Do not read `JXG` at module load in shared styles.** `GraphHost.test` mocks `jsxgraph` without a default export. The tick hook reads the default from its instance's prototype instead.
- **Six B-spline disposal tests pin the mounted subscription count.** It now includes the board's own; the count after unmount is unchanged.
- **`just preview` takes only a port.** `--host` fails with a usage line.
- **A mutation run needs a control.** With a shell metacharacter in the filter every run exits 1. Run the unmutated command first and read which assertion failed.
- **A stored P5 line's end order is not always left to right.** On falling data the x label landed behind the caption until the ends were ordered.
- **`just check` stops at lint,** so a lint failure says nothing about the tests.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-70.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
