# T3 task 23 and 24b acceptance (degenerate sites lesson B5 and its chapter section)

Accepted 2026-11-03 by geometry handler 41. Tasks: [23](../../tasks/triangulation-voronoi/23-degenerate-lesson.md), the `voronoi-degenerate` half of [24](../../tasks/triangulation-voronoi/24-t3-chapter.md). Workers: `bezeg-worker` (Sonnet) 23a ([return](23a-return.md)), 23b ([brief](23b-brief.md)) and 24b ([brief](24b-brief.md)), worktree `agent-a2db2ea2615a0587f`. Integrated by handler 40 as one patch; rebased by handler 41 twice onto `origin/master`, first over the curves P4 lesson and then over the Fourier F2a-1 and P4 fixes.

- **Integration:** the first rebase had three mechanical conflicts with curves P4: `CHAPTER_LINK_PENDING` (now `['patch-coons']`), the lessonless list (now empty, because both `prob-summary` and `voronoi-degenerate` have lessons), and the smoke `LESSONS` list (both rows kept). Recounts: 111 audited homes, 97 lessons with preview copy, and 104 copy entries. The second rebase was clean. `just unit src/learning` passed after each rebase ([1](41-unit-learning.log), [2](41-unit-learning-2.log)). The first run's preview failure was a stale Vitest cache, cleared as `docs/commands.md` describes.
- **Mathematics** (Sonnet `bezeg-reviewer`, with an independent hand calculation): every quoted value matches the kernel.
  - For \(P_1..P_3=(5,0),(3,4),(-4,3)\), the orientation is \(30>0\).
  - \(D=-30\) at \(P_4=(1,-5)\), from rows \((4,5,41),(2,9,85),(-5,8,89)\): \(484-3015+2501\).
  - \(D=0\) at \((0,-5)\).
  - The sign convention is the lifted-paraboloid determinant, positive inside.
  - Degrees: \([4]\) on the circle and \([3,3]\) off it.
  - Five collinear sites give \(0\) vertices and \(n-1=4\) lines.
  - The square and the trapezoid are cocircular. For the trapezoid, the centre is \((4,3{,}4)\) and \(r^2=27{,}56\).
- **Findings, all fixed in `8ce54627`:**
  - **Rendering bug, found by both reviewers.** The chapter's Examples paragraph wrote `\\(D\ne0\\)` with one backslash, so `\n` became a newline in sl and en. Now `\\ne`. `lessonMathNotation.test.ts` now rejects any control character in localized lesson or chapter text, which is how a single-backslash `\ne`, `\times`, `\frac`, `\beta`, `\rho` or `\vec` shows up. Before the fix, the strengthened test failed on exactly these two strings and nothing else.
  - **Collinear cells:** the middle cells are strips, and the two end cells are half-planes. The lesson (step 5, goal, purpose, summary), the chapter section and the spec's correctness note now say so.
  - **Delaunay uniqueness:** "unique only when no four points are cocircular" is not a necessary condition. Four cocircular points with another site strictly inside their circle leave the triangulation unique. The text now reads "unique if no four points lie on an empty circle" in the lesson step 6, the chapter section, the spec's correctness notes and task 23. The B5 and chapter tests assert the half-plane and empty-circle statements in both languages. The old pinned sentence failed against the new text, as expected.
  - **Slovenian wording:** "Primerjaj zgradnjo prejšnjega koraka" became "Primerjaj s prejšnjim korakom".
- **Engineering review** (Sonnet `bezeg-reviewer`): beyond the escape bug, no blocking findings.
  - `set-mode` validates its shape in `lessonCatalog.ts` and checks at runtime in `VoronoiGraph.tsx`. It applies synchronously and adds no graph-field mirrors of state.
  - No new boards or listeners. No new `t()` keys.
  - The registry, the ownership, the removal of `lesson: false` and the preview copy agree.
  - Not changed: an orphaned JSDoc above the B5 constants and an unwrapped comment line in `VoronoiGraph.tsx`. Both are cosmetic.
- **Checks on `8ce54627`:**
  - [`just check`](41-check.log): typecheck and lint pass; unit 10173 passed and 3 skipped, with 2 failures, both in `PresetCatalog.test.tsx`. Those two tests fail because the functions stream's `fourier-coefficients` Preset key (`39217a5e`) is missing from the expected list. They fail identically in master's hosted CI (run 41586412506) and are not touched by this diff.
  - [`just build`](41-build.log) passes.
  - [`just smoke-lesson voronoi voronoi-degenerate`](41-smoke.log): 4 passed (sl and en).
- **Browser** (handler, preview 4313, [scripts and log](41-browser/)): the chapter page `/learn/triangulations-voronoi` in sl and en.
  - The `voronoi-degenerate` section follows `voronoi`, and its activity link opens the lesson.
  - The return link lands on `#voronoi-degenerate` with focus on the example link.
  - 28 MathJax nodes render in each language, `≠` is typeset, and no "e0" fragment remains ([section-sl.png](41-browser/section-sl.png)).
- **Gaps:** Chromium only; touch not tested. The live language switch inside the lesson is covered by the generic smoke rows, not re-run by hand.
