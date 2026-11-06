# AB-B-3: D2 guided lesson record

Curves handler 65, 2026-11-06. The eight-step guided lesson of `bezier-clipping`, in Slovenian and English. Source: [brief](ab-b-3-brief.md), [spec D2](../../specs/advanced-bezier-lessons.md). Two `bezeg-worker` Sonnet medium runs: the first stopped past budget ([note](ab-b-3-worker-handoff.md)), the second finished the tests.

## Scenes

Each scene runs `load-model`, `set-clip-tolerance`, the five overlays, then `set-trace-step`, last, because a tolerance change returns the step to 0.

| Step | Pair, tolerance | Lands on (0-based trace step) |
| --- | --- | --- |
| Hulls | Crossing, \(10^{-6}\) | 0 |
| Fat line | Crossing, \(10^{-6}\) | 0 |
| Clip A | Crossing, \(10^{-6}\) | 4 |
| Swap | Crossing, \(10^{-6}\) | 5 |
| Repeat | Crossing, \(10^{-6}\) | end: `found`, 21 clips |
| Tangent | Tangent, \(10^{-10}\) | end: `limit`, 200 clips, 28 unresolved |
| Offset | Offset, \(10^{-6}\), `gridStepExponent` \(-1\) | end: `empty`, 17 clips |
| Explore | Crossing, \(10^{-6}\) | 0 |

The first A clip keeps everything and the pair splits, so the visible A clip is step 4 and the B clip step 5.

## The tangent pair at \(10^{-10}\)

- **Corrected text.** The first text said all 28 unresolved pairs are near \(0{,}5\). 26 are; the last two are wide: \(A\in[0,\,0{,}5],\ B\in[0{,}625,\,1]\) and \(A\in[0{,}5,\,1],\ B\in[0,\,1]\). The second is a pair clipping did not reach, the first a split child. The test asserts this shape, and the widest range \(1\), which is what the student can read: the two wide rows sit behind the table's "further 21".
- **Why the result misses \(t=\tfrac12\).** Traced in review: the kernel discards a range only when the hull misses the band by more than \(10^{-12}\cdot\text{scale}=4\cdot10^{-12}\). The gap near the double root is \(16\delta^2\), so nothing can be discarded within \(|\delta|<5\cdot10^{-7}\). The one result, \([0{,}4999995000,\ 0{,}4999995009]\), is a sliver at the lower edge of that band. It is the margin working as designed; no kernel change.
- **Display decision: no graph change.** The table's six decimals print the result as *0,5–0,5*. The lesson text states that this is rounded, that the range lies about \(5\cdot10^{-7}\) below \(t=0{,}5\), and that the touching point stays among the unresolved pairs. Printing digits that follow the tolerance is possible later, as a separate task.

## Evidence

- Lesson test 12 of 12. Mutations, each failing and restored: tangent tolerance 10 to 9 (scene, consistency and session tests); clip-a target 4 to 3 (scene test); *26* to *25* in Slovenian only, and \(5\cdot10^{-7}\) to \(10^{-6}\) in English only (number whitelist).
- `lessonMathNotation`, `guidedExamplePreviewCopy`, `lessonCatalog`, `src/learning/chapter`, `src/demonstrations`, typecheck and lint passed.
- `SMOKE_PORT=4314 just smoke-lesson bezier-clipping`: two rows passed, the Slovenian walk with pointer clicks and the English walk at 390×844.
- `bezeg-reviewer` Sonnet: scene actions, quoted numbers and prose notes re-derived by hand and against the kernel, no finding. Two text findings repaired by the handler: the prompts of steps 5 and 6 now say to press Play, as a tolerance change returns the run to step 0; "never processed" became "clipping did not reach". One weak assertion (`discarded.length + clippedLocal[0] > 0`) is left: the `keep < 1` assertions beside it carry the check.

## Gaps

The Play instruction in steps 5 and 6 was read in code (`setClipTolerance` sets the step to 0), not walked by a student path in the browser.
