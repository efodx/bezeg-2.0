# BS-B-6 Batch B criterion-to-test audit (HEAD 752a07ad)

Read-only audit; no tests were run. G = `src/graphs/curves/bspline/BSplineInsertionGraph.test.tsx`, X = `BSplineExtractionGraph.test.tsx` (same dir), K = `src/bezeg/impl/curve/bspline/bspline-kernel-b.test.ts`, LI/LE = `src/learning/content/bspline{Insertion,Extraction}GuidedLessons.test.tsx`.

## Release condition (spec lines 21-28)

| Criterion | Test | Status |
| --- | --- | --- |
| Batch A released | BS-A-6 audit in handler-handoff-24.md (its `just check` and smoke were still open there) | not re-verified here |
| Curvature kernel available (L3 comb) | K:322 `agrees per span with the Bezier-piece source of the curvature kernel`; G:261 comb per span | covered |

## L3 acceptance

| # | Criterion | Test | Status |
| --- | --- | --- | --- |
| 1 | Inserted points equal spec numbers to 1e-12 | G:69 (u=1), G:81 (u=0.5), K:167 `spec L3 golden points` | covered |
| 2 | Curve before/after differs < 1e-12 | G:92 `sampled before and after ... differs by less than 1e-12` (u=1, 0.5, 1.5, 1000 samples); K:113 random vectors k=1..5; LI:162 | covered |
| 3 | One-sided derivatives agree below order k-m+1 and differ at it (cubic m=2: tangent equal, kappa differs by 8/3) | G:222 (kappa 8/3 -> 16/3, jump 8/3, tangents (1,0) both sides, simple knot -1.4311 both sides); LI:140 same on lesson scene ; general rule: K `spec L3 acceptance 3: at multiplicity m ...` (cubic, u = 2 of multiplicity m = 1..4, one-sided derivatives from Bézier-piece forward differences; added by handler 40, mutation claiming order k-m+1 agrees fails with a third-derivative gap 54.9 at m = 1) | covered |
| 4 | Refused outside domain; multiplicity above k+1 refused | G:147 (outside, non-finite, SL and EN reasons), G:174 (k+1 not raisable), K:177 | covered |
| 5 | Comb per span with the jump reported, not sampled across knot | G:261 (per-span data, NaN breaks in envelope), G:241 (inspector jump readout SL/EN), G:282 | covered |
| 6 | Reset restores original knots and points | G:311, G:327, G:346; LI:204 | covered |

## L4 acceptance

| # | Criterion | Test | Status |
| --- | --- | --- | --- |
| 1 | Piece points equal spec to 1e-12 | X:77 (quadratic), X:90 (cubic), K:196, K:207 | covered |
| 2 | Each piece as Bezier equals B-spline within 1e-12 | X:111 (25 parameters per interval, both examples), X:126, K:215 | covered |
| 3 | Count = distinct interior knots + 1 | X:143 (inspector and after knot edit), K:215, LE:145 | covered |
| 4 | Operator rows sum to 1 | X:163, K:244 | covered |
| 5 | Existing break handled, no division by zero | X:176 and X:191, K:258 | covered |

## Task rows BS-B-2a1 ... BS-B-5

| Row | Deliverable | Test | Status |
| --- | --- | --- | --- |
| 2a1 | Ghost polygon; multiplicity readout; examples; disposal | G:113, G:136, G:191, G:327, G:359 | covered |
| 2a2 | Registration, shared collection | `PresetCatalog.test.tsx:42` (SHARED_COLLECTION_IDS lists insertion and extraction), `PresetCatalog.test.tsx:49`/`:56`; `bsplineChapter.test.ts:30` | covered; no route-level test of the path `/bspline/insertion` itself (route smoke only) |
| 2b1 | Colour per piece; polygons; highlight of affected pieces; Reset; disposal | X:101, X:204, X:213, X:227, X:248, X:290 | covered |
| 2b2 | Open as Bezier, ADR 0038 handoff | `src/graphs/base/OpenAsBezier.test.tsx:36` (valid handoff consumed), `:46` (it.each invalid ignored), `:61`, `:70` (remount does not re-apply), `:83` (button navigates with return context); LE:194 | covered |
| 2b3 | Registration and poster pending | `bsplineChapter.test.ts:30`; `PresetCatalog.test.tsx:42` | covered |
| 3a | L3 lesson hooks and six steps | LI:68 (synchronous sequence), LI:129, LI:180, LI:204, LI:229, LI:249 | covered |
| 3b | L4 lesson hooks and six steps | LE:73, LE:129, LE:145, LE:161, LE:181, LE:194, LE:211, LE:233, LE:265 | covered |
| 4 | Chapter sections for L3, L4 | `bsplineChapter.test.ts:30` (section order and demonstration ids); `lessonMathNotation.test.ts` | covered |
| 5 | Posters, `POSTER_PENDING` empty | `src/demonstrationPreviewAssets.test.ts:14` (every demonstration has an asset unless pending), `:9`-`:10` (pending ids unique and not stale); assets mapped at `demonstrationPreviewAssets.ts:145-146`, `:206`; `POSTER_PENDING` is `[]` | covered, but the test cannot check the image is the right capture or legible (viewed by hand per README) |

## Weak mappings

- L3 acc 3: originally only m=2 on the cubic; handler 40 added the general-m kernel test, so it is now covered.
- Batch A release: not re-verified here.
- BS-B-2a2 and BS-B-2b3 routes rest on smoke notes in the README, not unit tests.
- No GAP found for any L3, L4 or Batch B row.
