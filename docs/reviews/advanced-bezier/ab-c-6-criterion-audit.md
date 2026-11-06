# AB-C-6: criterion audit (D4)

Read-only Sonnet audit against [the spec](../../specs/advanced-bezier-lessons.md) at `95ae4718`, by handler 67, from [this brief](ab-c-6-audit-brief.md). It ran no test. It read the bodies of the tests it cites, except `CoonsPatchGraph.test.tsx` and `coonsScene.test.ts`, read at the cited lines only. Dispositions are in the [gate record](ab-c-6-gate.md#audit-gaps).

Files: K=src/bezeg/impl/kernels/coons.test.ts, L=src/learning/content/coonsGuidedLessons.test.tsx, CH=src/learning/content/advancedBezierChapter.test.ts; in src/graphs/patches: G=CoonsPatchGraph.test.tsx, S=coonsScene.test.ts, LC=CoonsPatchLifecycle.test.tsx.

| Criterion | Test | Status |
| --- | --- | --- |
| A1 centre and interior net | K:72; L:100, 119; S:18; G:42, 63 | covered |
| A1 Coons equals the bicubic net to \(10^{-12}\), random \((u,v)\) | K:88 (seeded, three boundary sets); L:154 (independent evaluator, 200 points) | covered |
| A2 boundaries reproduced to \(10^{-12}\), corners coincide | K:105; L:154; S:86 | covered |
| A2 moved corner: mismatch shown, no interpolation claim | K:118, 131; G:122; L:173, 201 | covered |
| A2 every place stops saying "interpolates" when corners differ | Panel, lesson step 6, chapter paragraph 3 | covered by reading; only the panel and step 6 are tested |
| A3 one of many, boundaries alone do not decide, no twist | L:303 | partial: regexes cover the lesson only |
| A4 drag rebuilds the mesh | G:93, 109 (fake view) | covered |
| A4 ownership and disposal | LC:30 (real view, three mounts, edits through setters) | partial: no drag through the view, no Preset load, route change only as unmount |
| A4 Preset import and restore | G:182, 204, 226 | partial: mesh rebuild after import not asserted |
| A4 existing patch Presets and routes unchanged | G:233; no Coons commit touched `patchPresetCollections.ts` or `surface-view/` | covered |
| A5 drag measurement | None at audit time | gap, closed by [AB-C-P](ab-c-p-perf.md) |
| A5 sampling density unchanged | `COONS_SHADING_DENSITY = 16` | not verified by the audit; see AB-C-P |
| A6 both languages, lesson | L throughout; G:239 live switch | covered |
| A6 both languages, chapter | CH:72, 156 | partial: numbers and links, no sentence check |
| Spec steps 1 to 7, in order | L:220, 303; smoke row `patch-coons` | covered |
| Spec test line: Coons against the bicubic net | K:88; L:154 | covered |
| Out of scope: no Gordon or twist | L:303 | covered |

## Answers

1. **Acceptance 2.** L:173 moves \(c_0[3]\) to \((3,0,1)\) with linking off and pins the single `u1v0` mismatch, \(S(1,0)=(3,0,0{,}5)\), the panel row and the text. Every place read stays conditional. The lesson summary and learning goal 1 say the surface passes through all four curves without repeating the condition; only step 6 is guarded.
2. **Acceptance 3.** No claim that the boundary alone decides the interior, and no twist wording, in the SL and EN summary, formula block, steps 1, 5, 7, chapter paragraphs, `coons_interior_note` and prompts. Each SL sentence has an EN counterpart with the same numbers. The chapter prompt asked for a control that does not exist (gap 2 below).
3. **Quoted numbers.** Every one recomputed from the spec's nets and correct: the curve midpoints, the centres of \(L_c\), \(L_d\), the edge misses, the \(P_{11}\) pieces, the interior heights, \(16-4=12\), and step 6's point and miss. The kernel side is pinned with `close()` against an independent evaluator. In prose, the fractions, decimals, \((3,0,0{,}5)\) and step 4's numbers are pinned; `'0'`, `'3'`, `'4'`, `'12'`, `'16'` at L:79, 95-96 pass on any such digit. Chapter coordinates, the card text and the `expectedState` text of steps 2 and 3 are not pinned.
4. **Ownership.** See the table. `git log` over `patchPresetCollections.ts` and `surface-view` shows no Coons commit.
5. **Steps.** Boundaries, \(L_c\), \(L_d\), subtract \(B\), interior net and tensor comparison, break a corner, explore: as the spec.

## Ranked gaps

1. No D4 drag measurement.
2. `advancedBezierChapter.ts:136-137`: the prompt says to switch off \(B\). The route has one shown-surface select, no \(L_c+L_d\) view and no such switch; moving a corner away also needs *Linked corners* off first.
3. No test drags a point through the real view and then unmounts, and none loads a Preset and then unmounts.
4. L:79, L:95-96: vacuous prose assertions.
5. Only the lesson is pinned for "no twist" and "one of many"; a later edit to the chapter, card or prompts could add a claim unnoticed.

## Could not verify

The tensor density value; test bodies beyond the cited lines; the Preset catalog and scene-replacement entries; rendering in the browser.
