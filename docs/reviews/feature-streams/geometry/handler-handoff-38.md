# Geometry stream: handler handoff 38

Written 2026-11-03 by handler 38 (Opus 5.5, auto, effort medium). Continues [handoff 37](handler-handoff-37.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run (on `origin/master`)

- **T3 21 accepted** ([record](../../triangulation-voronoi/21-acceptance.md)).
  - A Sonnet `bezeg-smoke` passed check 6 (Preset round trip) and the reload with no stored Preset on both routes ([21c-smoke.md](../../triangulation-voronoi/21c-smoke.md)).
  - Check 9 (the 40-site drag) found a **16 s press and about 4 s frames with the Delaunay overlay on**. Handler 38 fixed it in the shared point-set code:
    - `PointSetGraph.removeObjects` now suspends board updates, because JSXGraph's `Line.remove` runs a full `board.update()` per removed line.
    - `drawSelectableTriangles` ignores a press when a visible point is under the pointer, because a site press used to select the triangle under it.
  - Two new host tests, each with an observed mutation failure. The worst drag frame went from 4150 ms to 133 ms.
  - Commit: see `git log` (the `fix: compgeo overlay redraw…` commit and the docs commit after it).

## In flight (not on master)

1. **Sweep 21** (S2 chapter sections, moves C3 and C4 to the sweep chapter): complete in worktree `.claude/worktrees/agent-af2dc5620c0302f21`, branch `worktree-agent-af2dc5620c0302f21`, **uncommitted**.
   - The worker reported tsc, eslint, `just unit src/learning` and a mutation check passed (logs `docs/reviews/sweep-algorithms/21-*.log` there).
   - Its `just build` failed only because that worktree has no `node_modules` at the path `src/index.tsx` imports CSS from. Build in the stream worktree after copying the diff in.
   - Breaking change recorded in the task file: `lesson.bezier-curves.geometric-properties.monotone-*` example ids become `lesson.sweep-algorithms.monotone-*.monotone-*`.
   - It changed `CHAPTER_LINK_PENDING` to `['patch-coons', 'voronoi', 'voronoi-degenerate']`, and 22 removes `voronoi` too. Merge both edits.
   - It also changed the audited-home count in `authoredChapterCoverage.test.ts` (103→105) and a plural helper in `LearningPage.test.tsx`. Recount after merging with 22.
   - Remaining: copy the diff into the stream worktree (`git -C <wt> diff | git apply`), then full unit, `just build`, an engineering review (Sonnet `bezeg-reviewer`), `just smoke-lesson monotone-partition monotone-triangulation`, a chapter-page check in both languages with an activity return link, commit and push. Then S2 F6.
2. **T3 22/24a** (lesson B4 `voronoi`, its actions and the chapter section): the first worker stopped at its budget ([22-handoff.md](../../triangulation-voronoi/22-handoff.md), in its worktree). Fresh worker 22b ([brief](../../triangulation-voronoi/22b-brief.md)) continues in `.claude/worktrees/agent-ab6e252dd83a77fd9`, branch `worktree-agent-ab6e252dd83a77fd9`, uncommitted. Status at handoff: see the section below.
   - The first worker added a **`diagram` overlay** (default on) so that steps 1–2 can hide the diagram. The 22b brief asks for a test that old stored `compgeo-voronoi` Presets without the key still show the diagram. Check that in review, because it touches stored Presets.
   - Handler decisions, in the 22/22b briefs: step 5 quotes only \((4,-1)\) for \(P_1P_2P_6\); B3's lesson and B3's chapter section both link forward to B4; a generic mention of degenerate sites may stay, but nothing names B5.
   - Remaining after 22b: diff review against the brief, full unit, build, engineering review, `just smoke-lesson voronoi` in both languages with a live switch, a keyboard-only run, commit and push. Then T3 23 (B5), which depends on 22.

## 22b status at handoff

(filled in below when the worker returned)

## Next steps, exactly

1. Integrate sweep 21 (item 1 above) and 22b (item 2), one at a time, rebasing each onto `origin/master` before its push. They conflict mechanically in `familyChapters.test.ts`, `guidedLessonOwnership.ts` and the count tests: keep both sides and recount.
2. T3 23 (lesson B5), then T3 24b (`voronoi-degenerate` section) and T3 F6; S2 F6. At most two workers.
3. Worktree cleanup as in handoff 37 (the three agent worktrees listed there, plus the two above once integrated). They need `--force`, which the classifier refused, so ask the owner. `git branch -d` refused `worktree-agent-ae1c6730a8e760de2` and `t3-20-backup` as not merged (they were superseded by rebased commits). Deleting them needs `-D`, so ask the owner.

## Risks and lessons

- **Measure compgeo overlays in the browser at the point limit.** jsdom hid this 16 s stall, because no layout means no `offsetWidth` cost. The probe scripts are in `C:\Users\1337Hacker\.claude\jobs\32081cc6\tmp\probe\`: `probe.cjs` times press and moves; `probe2.cjs`, `top.cjs` and `stacks.cjs` take a CPU profile and print its top frames and stacks. This job folder disappears with the job, so copy them if they are needed.
- The perf script from 21c is `C:\Users\1337Hacker\.claude\jobs\32081cc6\tmp\smoke21c\perf.cjs`, which may also vanish. Its method is in [21c-smoke.md](../../triangulation-voronoi/21c-smoke.md).
- Lesson workers ran out at 135k with about half the slice done (22). For a lesson plus actions plus a chapter section, split the brief in two from the start: actions and lesson, then section and tests.
- Workers in agent worktrees have no `node_modules` for `just build` (the CSS import path). Have the handler build after copying the diff, or give the worker a junction (`node -e "fs.symlinkSync(target,'node_modules','junction')"`).
- The preview from `just preview 4313` was started by this handler. Stop it at handoff (the successor starts its own).

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), `isolation: worktree`, at most two at once, budget watcher at 135k, then `HANDOFF`. Reviews: `bezeg-reviewer` (Sonnet). Smoke: `bezeg-smoke` with `model: sonnet`.
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 39" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. The successor starts its own successor the same way and tells it to do the same.
