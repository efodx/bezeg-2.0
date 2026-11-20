# Lesson card layout — handler handoff 1 (2026-11-20)

## Objective (owner, 2026-11-20)

Fix the floating lesson card overlapping the graph, with the impeccable skill (`~/.claude/skills/impeccable/SKILL.md`; no Skill tool: read the file, and `reference/craft-floor.md` before UI edits). The handler decides the design and records it. Scope from [the crawl triage](../lesson-bug-crawl/triage.md): section 1 (card covers the graph), section 5 (card text overflow, truncated titles), section 7 (graph framing). Re-crawl before and after, look at screenshots, smoke-test the lesson runtime, commit, push to `origin master`, and report in plain prose with before/after evidence. At each context handoff write `docs/reviews/lesson-card-layout/handler-handoff-<n>.md`, commit it, and start the successor with `claude --bg` (Fable 5.2, high effort), telling it to do the same.

Relayed later by the lesson-bug-crawl handler, not by the owner directly: this stream also takes triage sections 3 (controls that silently depend on another control) and 6 (inspector layout at 310 px). The owner's own note to handler 1 said not to touch them, so say in the owner report that they were taken on that relay. The bug-crawl handler keeps: the Bézier polygon crash (`AbstractJXGPointControlledCurve.ts`), `src/graphs/random/` log-axis labels, lesson text in `analyticLinesIntersectGuidedLessons.ts` and `familyChapters.ts`, and the `sl.ts` keys `standard_form` and `farin_points`.

## Decision taken

[ADR 0061](../../adr/0061-lesson-card-docks-beside-the-graph.md): the reading card docks in the tools column beside the graph (the tools are inert while it is read), flows below the graph on one-column screens, keeps its column in Presentation, stays draggable, and the half-card view pan is removed. Acceptance is the section "Docked beside the graph" of [the panel spec](../../specs/lesson-panel-visual-refinement.md).

## State

Worktree `.claude/worktrees/lesson-card-layout`, branch `worktree-lesson-card-layout`, from `origin/master` e147ba2a; `node_modules` is a junction to the main checkout (unlink it with PowerShell before removing the worktree). **Nothing is pushed.** The commit that carries this note holds the card slice only:

- `src/learning/runtime/GuidedLesson.tsx`, `GuidedLesson.css`, `GuidedLessonLayout.css`: the section is a workspace grid item (`grid-area: inspector`, class `guided-lesson-docked` until moved), rendered before `.guided-lesson-layer`, which now holds only the click-catcher and the tab. Lesson column `clamp(310px, 32.5%, 34rem)`. Completion card above the live tools. Phone: card in its own row, locked pan/zoom rows hidden while reading, playback-row graphs keep the 35vh board while reading, the 36px tab padding only in explore mode. Title wraps; "Vodeni primer" when the page heading carries the lesson title.
- `src/learning/runtime/formulaRows.ts` (+ test): a display-formula row wider than the card is set smaller (floor 72 %), then broken into `gathered` lines between statements, before arrows, after list commas (`stackFormula` levels 1–3) and typeset again. `typesetMath` got a `prepare` callback.
- Pan removed: `LessonSession.setGuidedLessonCardWidth`, `LessonGraphCapabilities.adjustGuidedLessonView`, `BaseGraph.adjustGuidedLessonView`, `supportsGuidedLessonPanning`.
- `scripts/lesson-crawl/crawl.cjs`: `--frames-only` (no inspector sweep, about 5 s per example) and two checks, `card-text-cut` (medium) and `card-formula-shrunk` (low).
- Tests: `GuidedLessonDock.test.tsx` (8, by a worker), `formulaRows.test.ts` (8).

Checked on that tree: `just typecheck` passed; `just unit` on the five runtime and workspace test files passed; `just lint` passes except `crawl.cjs` lines 28–29 (unused `sleep`, `hash`), which the bug-crawl handler removes on master: they disappear at rebase. **Not run: any Playwright smoke suite, the impeccable detector, review subagents.**

Uncommitted in the tree, belonging to the framing workers (section 7): `src/graphs/functions/BaseFunctionGraph.tsx`, `RootFindingGraph.tsx`, `RootFindingGraph.host.test.tsx`, `src/graphs/patches/CoonsPatchGraph.tsx` (+ test), `surface-view/surfaceMath.ts`, `src/learning/content/patchGuidedExamplesEvaluation.ts` (+ test), and whatever worker 2 added. Their notes: `.shots/framing/NOTE.md` (worker 1, and a "Worker 2" heading when worker 2 finished). Worker 2 was still running at handoff and may have died with this session: read the note and `git status --short`, then continue or re-dispatch its tasks (A: repair two unit tests broken by the patch-camera change and check preview provenance for the patch demos; B: geometric series frame, x ≈ −20.5..30.6 for ten bars, suspect `GrowthGraph.applyFrame` and the board resize at lesson open; C: lattice paths and rosettes ranges).

Scratch, untracked and not to be committed: `.shots/` (screenshot helper `shoot.cjs`, PNGs, `merged.md`, `visual-graph.md`, `routes.txt`), `.crawl-a`, `.crawl-b`, `.crawl-after*`, `.build.log`, `.preview.log`.

## Evidence so far

- Before (bug-crawl worktree `.crawl-full`, 1440×900): 2734 raw findings, 512 of 707 merged groups are `panel-covers-graph`. Baseline screenshots `.shots/base-bezier-*.png`: the card covers p₁ at 1440×900 in Presentation and the whole board at 390×844.
- After, four formula-heavy chapters (kinematics, analytic-lines, isometries, b-splines; 21 examples; `.crawl-b`): `panel-covers-graph` 0; `card-text-cut` 0 (18 frames were cut at the docked width before line breaking); 43 rows set smaller. `phone-next-hidden` 6 (kinematics, de Boor) before the last two phone fixes; not re-measured.
- A full `--frames-only` crawl of all 37 chapters into `.crawl-after/` (logs `.crawl-after-{0..3}.log`) was started on the final build; 6 chapters had finished at handoff. If it died: `node scripts/lesson-crawl/crawl.cjs --base http://127.0.0.1:4421 --out .crawl-after --frames-only <chapters>` (chapter ids are the directory names of the bug-crawl worktree's `.crawl-full`). Sum `byKind` over `.crawl-after/*/summary.json` for the after numbers and compare `points-offscreen` with `.crawl-full` (the board is 61 px narrower on each side at 1440×900).
- Screenshots looked at: `.shots/dock-bezier-*` (1440, 1024, 390, 844×390, 1920, Presentation, hidden), `dock4-fixed`, `dock4-delaunay`, `stack-kin4` (stacked r, r′, r″ row).
- Board resize on lesson open and exit: JSXGraph (`setBoundingBox(box, keepaspectratio, 'keep')`, landscape branch) fits the height, so scale and centre are kept and the sides are cropped; the view returns exactly on exit. Read from `node_modules/jsxgraph/src/base/board.js:5809,6464`, not yet asserted by a test.
- Preview: `just preview 4421` from this worktree (dies with the session; `just build` reports "provenance was not recorded" while a worker edits sources, the build itself is complete).

## Next steps

1. Collect the framing workers' result; get their tests, typecheck and lint green; review that diff (camera distances for the patch lessons, `axisPoint` visibility in root finding).
2. Finish or rerun the full crawl; fix what `phone-next-hidden` and `card-text-cut` still list; record the before/after table here or in a `state.md`.
3. Smoke: `just build`, then `just smoke-built` on `tests/guided-lessons.smoke.spec.cjs` and `tests/lesson-graph-access.smoke.spec.cjs` first, then the rest ([checklist](../../smoke-tests.md): the lesson runtime changed, so the full list). Expect failures where specs assume the card inside the graph cell, the wide-board pan, the phone scroll alignment, the phone tab padding or visible pan/zoom rows while reading. Repair through a worker, and add an assertion that the open card's box does not intersect `#jgbox` at 1440×900, 1024×768, 390×844 and in Presentation.
4. Review routing for a large diff: engineering plus UI and accessibility reviewers; run `~/.claude/skills/impeccable/scripts/impeccable detect --json` on the changed CSS and TSX. Points worth a reviewer's eye: DOM order (card before graph) against visual order; the hidden tools while reading; `row.textContent` replacement under React in `retypesetFormulaRow`; `:has()` grid rules in Presentation with closed tools.
5. Docs: rewrite the "Guided lesson reading overlay" and "Guided lesson reading panel" paragraphs of `DESIGN.md` (home, pan, one-line title); check `docs/specs/guided-lessons.md`, ADR 0003, `docs/capabilities.md` and `docs/smoke-tests.md` for the overlay and the pan; add the evaluation entry.
6. Rebase onto `origin/master` (the bug-crawl handler touched `crawl.cjs` lines 26–27 only), `just publish`, check the run with `just ci`.
7. Then section 7 leftovers (label collisions; see `.shots/visual-graph.md`), then the relayed sections 3 and 6.

## For the owner

- The scheduled full run of 2026-11-20 11:41 failed in lessons-2 (parameterization sample counts); the bug-crawl handler reports it fixed by 53441b5f. Pushes e147ba2a and f4556204 failed CI on ESLint in `scripts/lesson-crawl`; the bug-crawl handler is fixing that.
- Decisions that are yours: drag-the-track keeps its fixed frame under the "a drag never refits" rule, so its default content fills about a third of the board; the least-squares "squares" are square on screen already (55×55 px measured), the reviewer misread the tick spacing.
- Possible follow-ups, not started: the chapter-return link as a card footer (one header row less at 1440), a sticky board above the card on phones, the closed tab moved into the tools column.
- Impeccable: a newer version (v4.10.0) is available (`npx impeccable update`), and `.impeccable/design.json` is older than `DESIGN.md` (the `document` command refreshes it).
