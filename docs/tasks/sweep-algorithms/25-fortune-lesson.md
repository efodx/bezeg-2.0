# 25 — Fortune lesson C5

Status: accepted 2026-11-03 (geometry handler 46, [record](../../reviews/sweep-algorithms/25-acceptance.md)); planned 2026-11-03 (geometry handler 43). Source: [spec C5](../../specs/sweep-algorithms-lessons.md#c5-fortunes-algorithm-showpiece) (steps 1–7, acceptance 1–6), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), lesson notation rules in `AGENTS.md`. Kind: F3; mathematical review of the prose and the scene values. Depends on 23 and 24. Pattern: [19](19-monotone-partition-lesson.md) and [20](20-monotone-triangulation-lesson.md).

## Scope

1. A guided lesson on `fortune`, with the seven steps of the spec, in SL and EN.
   - Scenes are functions of their actions, using the `point-set` and `set-trace-step` actions.
   - Prose values come from the kernel through the lesson tests, never typed by hand only: event order, the cancelled circle \((0,0)\) with \(R=5\), the true events at \(1-\frac{\sqrt{65}}2\), the vertices \((\mp\frac12,1)\), and the counts \(2n-2-h\) and \(3n-3-h\).
   - Step 5 states why the event is a false alarm (D lies inside the circle). Step 7 states that the result equals the Delaunay dual, and the test checks it with the kernel's equality.
   - The prose says the beach line is drawn approximately while the output is exact (acceptance 5).
2. Every scene view must keep the drawing's "continues" markers inside the visible board at 1280×720. This was the T3 F6 finding of geometry handler 43; assert it in the lesson test.
3. Interim chapter owner as in 19 until task 26.

Checks: the lesson unit tests (a synchronous multi-action sequence), `lessonMathNotation.test.ts`, `npx tsc --noEmit --pretty false`, the production build, and `just smoke-lesson fortune` in SL and EN, with the card hidden ("Skrij") for legibility screenshots.
