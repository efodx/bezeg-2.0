# 05 reconciliation (H1, H7) - PARTIAL

Status: partial, written at coordinator handoff. Read-only review; no source edited.

## Counts
- Figure dispositions honored: not fully checked. Removal confirmed for all 29 placements (no `kind: 'figure'` in content except one leftover, see F1). Prose carriers checked for rows 1, 3, 5, 6, 9, 10, 11, 24, 26, 27, 28, 29 (present in SL and EN). Rows 4, 7, 8, 12-23 and 25 not verified in detail.
- Cards with full copy + image + manifest: 67/67 for copy, image files and manifest entries (see table).

## Card coverage (item 3)
| Set | Ids | Copy SL+EN (alt, caption) | PNG on disk | Manifest captures | Dupes/orphans |
|---|---|---|---|---|---|
| Retained (examples/) | 56 (retainedExampleHomes lines 4-61) | 56/56 non-empty | 56 | 56, sha256 matches for all 56 | none |
| Patch (examples/patches/) | 11 | 11/11 non-empty (ids `bezier-patches.<section>.<demo>`) | 11 | 11 ids match the PNG set | none; patch sha256 not checked |
Copy check ran via vitest with `getGuidedExamplePreviewCopy` (out in the handler's temp dir). Image URL resolution (`import.meta.glob`) was not verified under vitest; PNG presence was checked on disk.

## Recipe kind vs audit (item 4)
All 67 ids have a recipe: 7 `start`, 60 `highlight`.
- `foundations.complex-plane.complex-multiplication`: recipe start; audit says highlight `complex-rotation-i-step` after Show product. Deviation recorded in `batch-a-note.md` (Show product is a button). Accepted, but stream record section 3 row 03b does not name it.
- `bezier-curves.parameter.decasteljau-parameter`: recipe start; audit says highlight t=1/4 via slider. Recorded in `batch-a-note.md` as "t = 1/4 not reachable". This conflicts with audit row 142 (slider t=0.25 is a prompt step). Reason is questionable.
- `bezier-patches.bilinear-patch`, `control-net`, `boundary-iso-curves`: audit "start is best"; recipes are first-frame `highlight`. Recorded generically in stream row 06 ("All 11 are first-frame highlights"). Partial record.
- `ph-curves.complex-hodograph.ph-cubic-generator`: audit start; recipe highlight frame `instruction`. Recorded in stream row 04a.
- Matching start: convex-hull, quartic-interpolation, circle, degree-comparison, parabola-derivatives.

## Findings
- F1 `src/learning/content/familyChapters.ts:373`: `...(section.id === 'investigate' ? [{kind: 'figure'} as never] : [])`. A figure kind is still produced through a cast. H1 requires deletion of the figure kind, and AGENTS forbids casts. Expected: remove the branch.
- F2 `src/learning/content/bezierChapter.ts:213` and `:263` (SL "Slika pokaže primere", EN "This picture shows examples"): the Bezier chapter has no image, and the audit lists none here. Expected: rewrite to refer to the live demo or drop. Judgement: likely dangling; confidence medium.
- F3 `src/learning/content/bezierChapter.ts:216`: "slika in koordinate pripadajo temu prikazu". Audit flagged it for task 03 review; still present. Expected: rewrite.
- F4 Owner decisions still open from the audit: D4 (no 4x3 net card), D6 (tensor-joins, properties), D12 patch card choice.

## Unchecked
- Figure rows 4 (quarter-arc proof sentence), 7 (PH catalog prose beyond line 238), 8, 12-23 (patch prose), 25 (h != 0 phrase, not found by grep).
- Item 2 full hit-by-hit judgement in `patchChapter*` and `patchGuidedExamples*`.
- Patch manifest sha256 and browser coverage (H5/H7 browser checks).

## Remaining rows (second pass)

Scope: audit rows 4, 7, 8, 12-23 and 25. That set has 16 rows, not 17 as the brief states. Each check covers the SL and EN text on the cited line unless noted.

| # | Recorded disposition | Current content evidence (file:line) | Verdict |
|---|---|---|---|
| 4 | Prose: the worked proof is one quarter arc, not the three-piece circle | familyChapterSequences.ts:12 places rational-curves.worked-conic.circle and states that the quarter-arc calculation proves one arc, not the three-piece construction (SL and EN). familyChapters.ts:181-182 gives the single P0 to P2 arc | Honored |
| 7 | Card ph-cubic-speed; d=0.35 and the "not integrated from the origin" distinction dropped | Card placed at familyChapterSequences.ts:23. d=0.35 is absent from chapter content. familyChapters.ts:238 (SL and EN) still says the catalog cubic is "not the curve integrated from the origin" | Not honored: dropped distinction still present in both languages. Expected: remove the clause at 238, or amend the audit row if it was kept on purpose |
| 8 | Card ph-quintic-offsets; d=0.5 carried; "not the integrated cubic" dropped | Card at familyChapterSequences.ts:26. d=0.5 in the quintic prompt at familyChapters.ts:258 (SL d=0{,}5, EN d=0.5). No integrated-cubic wording in the offsets section (familyChapters.ts:254-262) | Honored |
| 12 | Dropped (caption says image is not the net); prose point: 4x3 net, 12 points, degree pair (3,2) | patchChapterBasics.ts:8 (SL and EN): "Mreža 4x3 ima 12 točk in par stopenj (3,2)" / "A 4x3 net has 12 points and degree pair (3,2)" | Honored |
| 13-23 | Dropped as duplicates of card start images (owner decision D2) | Each section receives its card through withPatchBasicExampleSequence (patchChapter.ts:21; patchBasicExampleSequence.ts:14). Registry keys: patchGuidedExamplesBasics.ts:89-92, patchGuidedExamplesEvaluation.ts (section map near 84-86), patchGuidedExamplesAdvanced.ts (section map near 133-136). Ids match the audit and patchChapter.test.ts:20-30. 11 of 11 placed | Honored. Rows 18 (which property) and 21 (C0/C1/G1/teapot) still need the owner decisions the audit records |
| 25 | Prose keeps h != 0 before the limit; secant slope 3, tangent 2 | familyChapters.ts:316 (SL and EN, h\ne0 in source). Card derivatives at familyChapterSequences.ts:39 | Honored. The tangent switch still needs one learner step (D11), not verified in the browser |

Not verified: browser rendering and live language switch of the placed cards; card copy and captions (worker editing, excluded); image URL resolution; the D2 claim that each patch thumbnail equals its card start frame (checked only through the recipe notes in 05-reconciliation.md).
