# 20 — Monotone triangulation lesson C4 (S2, F3)

Status: planned 2026-11-02 (geometry handler 26). Source: spec [C4](../../specs/sweep-algorithms-lessons.md#c4-triangulating-a-monotone-polygon) (goal, example, steps 1–7, acceptance 1, 3–5), [release batches](../../specs/sweep-algorithms-lessons.md#release-batches) (S2 needs T1 for the contrast), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, readouts and counts, not prose. Depends on 17, 18 and 19.

## Decisions (handler 26, 2026-11-02)

- **Ear-clipping contrast is made.** Triangulation T1 was released on 2026-11-02 ([F6 record](../../reviews/feature-streams/geometry/f6-t1-s1-acceptance.md)), so step 6 compares with ear clipping and links the `ear-clipping` lesson; nothing needs stating as absent.
- **Counts.** The comparison quotes the graph's counts panel at the end of the trace (task 17). If the monotone count exceeds ear clipping's on the small example, the text says so and explains that the asymptotic saving needs large \(n\), as task 12 did for Bentley–Ottmann; it never claims a saving the counts do not show.
- **Actions** as task 19, on `MonotoneTriangulationGraph`.

## Acceptance

1. **Lesson** C4 (`monotone-triangulation`), the spec's seven steps: piece 1 of C3 \((0,0),(4,3),(8,5),(4,8)\) with its chains; the prediction (can the next vertex be connected) before Next reveals the test; pushes, pops and diagonals; the \(n-2\) count per piece; the comparison panel on the whole C3 polygon (\(4\) triangles, \(3\) diagonals) against ear clipping; free exploration with a polygon that is partitioned first, and the text says so (acceptance 3). Stopped by default; update catalog tests, preview-copy counts and the smoke `LESSONS` list.
2. **Views** frame every scene.
3. **Text:** one-shot, both languages; growth statement \(O(n^2)\) for ear clipping versus \(O(n)\) for one monotone piece after sorting and \(O(n\log n)\) for the whole method, with "a count on small inputs illustrates, it does not prove". Quoted values equal the readouts; formulas wrapped per `lessonMathNotation.test.ts`.
4. **Tests:** as task 19, plus the counts quoted in the comparison step equal task 15's `counts` for the same polygon.

Checks: as task 19; smoke `just smoke-lesson monotone-triangulation`.
