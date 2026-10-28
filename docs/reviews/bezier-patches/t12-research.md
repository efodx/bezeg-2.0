# Task 12 research: authoring map for the bilingual patches chapter

Research only, no source edited. Seams checked by grep/read of the worktree at HEAD d7b2886.

## 1. How a chapter is defined and registered
- Type: `src/learning/content/familyChapters.ts:7-31` (`FamilyChapterFigure {src, alt, caption}`; `FamilyChapterSection`; `FamilyChapter {id, family, title, purpose, prerequisites, sections}`). All text is `LocalizedText = {sl, en}`.
- Section helper `section(id, titleSl, titleEn, paragraphs, formula?, demonstrationIds?, extras)` at `familyChapters.ts:33-40`; `text(sl,en)` at :32. Drafts array `chapterDrafts` (seven chapters, e.g. `splines` at :285); final export `familyChapters` at :451-461, which builds `orderedContent` = `authorFamilyChapterSequence(...)` (`familyChapterSequences.ts:57`, keyed by chapter id then section id; items `p0`, `f`, `fig0`, `e:<registry id>`, or inline `{sl,en}`), else `section.orderedContent` (via extras), else paragraphs + formula + figures.
- Section fields: required `id` (kebab-case, test-enforced), `title`, `paragraphs` (>=1). Optional: `formula` (undelimited TeX, one per section), `demonstrationIds`, `figures`, `investigationPrompts` (per demo id), `orderedContent` (`paragraph{text,links?:{label,href}[]}` | `formula{latex,label?}` | `figure` | `example{exampleId}`; `chapter/orderedContent.ts:6-10`).
- Registration: `src/learning/learningChapters.ts:13-17` spreads `familyChapters` after `bezier-curves`; Bezier curves is separate (`bezierChapter.ts`, own shape). The patches chapter belongs in `familyChapters` (family `'/bezeg-2.0/patches'`, id `bezier-patches`). Learn page, `FamilyChapterPage.tsx:105`, owner lookup and the notation test all read `familyChapters`. "Placed after the curve families" (spec) needs explicit ordering in `learningChapters.ts`; today a new draft would land last (after `analysis`). Handler decides: after `parametrization`, or keep last.
- Size reference: existing sections have 1-3 paragraphs of ~60-120 words per language; chapters ~450-900 words per language (test floor 450). Recommend 2-3 paragraphs, ~100-160 words per language per section. Do not grow `familyChapters.ts` (461 lines).

## 2. Reserved ids (already in the repo)
`src/learning/chapter/guidedLessonOwnership.ts:57-63` already maps the six patch demos to chapter `bezier-patches`:
`patch-tensor`->`curve-to-patch`, `patch-decasteljau`->`tensor-decasteljau`, `patch-derivatives`->`tensor-derivatives`, `patch-subdivision`->`tensor-subdivision`, `patch-joins`->`tensor-joins`, `patch-triangular`->`triangular-patches`. The chapter MUST use these six section ids; the other five are free.
Routes (`src/demonstrations.ts:55-60`): `/bezeg-2.0/patches/{tensor,decasteljau,derivatives,subdivision,joins,triangular}`. There is NO `patch-compare`; spec :268 says it is replaced by the comparison view in `patch-triangular` (task 08). Section 11 links `patch-triangular`.
Previews: `demonstrationPreviewAssets['patch-*']` exist (`src/demonstrationPreviewAssets.ts:83-88`).

## 3. Activity links before task 13 (what is valid now)
- Valid now: `demonstrationIds` + `investigationPrompts[demoId]` on the section. This enables `?explore=bezier-patches.<section>.<demo>` (`familyInvestigation.ts:37-38`, `guidedExamples.ts:133`; requires `section.demonstrationIds.includes(id)`, a prompt, and `demonstration.path === pathname`). Return path is `/bezeg-2.0/learn/bezier-patches#<sectionId>` (`familyInvestigation.ts:44`). The scene is the generic `demonstration-default` (`guidedExamples.ts:63`); no authored scene. Paragraph `links` in orderedContent can hold plain hrefs, e.g. `/bezeg-2.0/patches/tensor?explore=bezier-patches.bilinear-patch.patch-tensor`.
- NOT valid now: `{kind:'example', exampleId}` blocks. They must exist in `retainedExampleHomes` (`getChapterGuidedExamples`, `guidedExamples.ts:252`), and `authoredChapterCoverage.test.ts` pins exactly 56 audited homes (`baseline-examples.json`). New example blocks would fail it; leave them to task 13.
- Do not touch `guidedExamplePreviewCopy.ts`: the six patch ids are in `DemonstrationWithoutLessonId` (:8-9) and excluded from the `satisfies Record` (:63); their copy is task 13 scope.
- Return position/focus comes from `restoreGuidedExampleReading` (`FamilyChapterPage.tsx:46`) given stable section ids.
- One demo may be linked from several sections (ownership accepts extra owners), but each section needs its own prompt. Test "links every existing demonstration from its matching family chapter" (`familyChapters.test.ts:123`) needs all six ids in the union, each in family `/bezeg-2.0/patches`.

## 4. Figures
`FamilyChapterFigure {src, alt, caption}` with `src` = `demonstrationPreviewAssets['patch-...']` (pattern `familyChapters.ts:42-60`). Existing captions state exactly what the capture shows and separate it from the worked example ("the captured view shows X; the worked example below uses Y"); follow that. Alt: one plain sentence, no math, both languages. Math in captions delimited `\\(...\\)`. Catalog PNGs show default presets, not the hand examples, so captions must say so. "Depict the actual authored scenes" is only fully achievable in task 13 (flag).

## 5. Validation that applies
- `src/learning/content/lessonMathNotation.test.ts:112` already scans `familyChapters` (every `{sl,en}` string; math only inside `\(..\)`/`\[..\]`; `formula`/`latex` undelimited; heuristics flag bare `x=1`, fractions, intervals `[0,1]`, tuples, `f(1/2)`, Unicode subscripts). Decimal commas as `{,}` (`0{,}5`). Doubled backslashes in TS strings.
- `familyChapters.test.ts:84-134`: exactly 7 chapter ids (:87), 5-8 sections per chapter (:91-92; new chapter has 11), >=450 words per language, no stray `\\cmd` outside math in paragraphs/captions/prompts, formula undelimited, all demos linked. Must be edited.
- `authoredChapterCoverage.test.ts:13-15` expects 8 chapters (Bezier + 7) -> 9; the new chapter's expected retained keys are `[]`, so no example blocks.
- `LearningPage.test.tsx:31-36`: remove the patches exclusion filter/comment; counts 8 -> 9.
- Also run: `guidedLessonOwnership.test.ts`, `ChapterPage.test.tsx`, `OrderedChapterRendering.test.tsx`, `ChapterGuidedLessons.test.tsx`, `familyInvestigation.test.ts`, `guidedExamples.test.ts`, `sceneContentAgainstGraphs.test.tsx`; then `npx tsc --noEmit --pretty false`, lint, build at the end by the handler (another worker is editing runtime now). No new `t()` keys needed (chapter prose lives in content files); if any are added keep `sl.ts`/`en.ts` in lockstep.
- Add `src/learning/content/patchChapter.test.ts`: 11 ids in order, six reserved ids present, each section has paragraphs and a demo link, misconception coverage const asserted, sl/en figure parity.

## 6. Contradictions / flags
1. Research 2.2 has 10 lessons (10a/10b, rational deferred); spec has 11. Follow the spec. Rational patches out of scope (no sphere claims).
2. `patch-compare` is in spec :64/:82 but not in the catalog; use the `patch-triangular` comparison view.
3. Spec wants each lesson as a guided lesson with the measurable takeaway; guided frames are task 13. Task 12 states takeaways as outcomes in prose.
4. Task file: "figures depict actual authored scenes", but authored scenes arrive in task 13.
5. Section cap 5-8 and chapter counts in four tests conflict with 11 sections.
6. Variation-diminishing counterexample (MT of lesson 6) is not hand-trivial; needs independent math review. Fallback: state no general bivariate analogue exists (Farin) and do not assert an unverified counterexample.
7. Chapter order vs spec "after the curve families".

## 7. Section outline (id; takeaway; exact example; misconceptions; demo)
Misconception keys (research 2.3): M1 passes through all control points; M2 iso-curve = net row; M3 tensor = multiply two curves; M4 hull of each row; M5 diagonal has degree n; M6 C1 = tangent line-up; M7 triangular = tensor minus an edge; M8 variation diminishing holds; M9 3D perception.
1. `curve-to-patch` (patch-tensor): explain a moving curve sweeps a patch; name the degree pair \((m,n)\). Example: a \(4\times3\) net is degree pair \((3,2)\), 12 points. M3, M9 (rotate before judging).
2. `bilinear-patch` (patch-tensor): compute \(S(\tfrac12,\tfrac12)\). Net \((0,0,0),(1,0,0),(0,1,0),(1,1,1)\) gives \(S=(u,v,uv)\), \(S(\tfrac12,\tfrac12)=(\tfrac12,\tfrac12,\tfrac14)\), the mean of the corners; lines \(u=c\) straight; diagonal \((t,t,t^2)\) is a parabola, degree \(m+n=2\) (M5). M1.
3. `control-net` (patch-tensor): count \((m+1)(n+1)\), partition of unity, interpolated points. Quadratic weights at \(u=\tfrac14\): \(\tfrac9{16},\tfrac6{16},\tfrac1{16}\), sum 1; with \(v=\tfrac12\) weights \(\tfrac14,\tfrac12,\tfrac14\) the nine products sum 1. Only four corners interpolated. M1, M3, M4.
4. `boundary-iso-curves` (patch-tensor): draw boundary curves; iso-curve polygon \(Q_j=\sum_i B_i^m(u)P_{ij}\). Heights of a \(3\times3\) net rows \(0,0,0\,/\,0,4,0\,/\,0,0,0\) at \(u=\tfrac12\): \(Q_1\) height \(2\), not the net value 4. M2, M1.
5. `tensor-decasteljau` (patch-decasteljau): two-stage de Casteljau, order independent. Same net: \(S(\tfrac12,\tfrac12)\) height \(4\cdot\tfrac12\cdot\tfrac12=1\) in either order. M3, M4.
6. `properties` (patch-tensor): predict containment in the hull of the whole net, apply an affine map to the net, non-property: variation diminishing. M4, M8, M1 (flag 6).
7. `tensor-derivatives` (patch-derivatives): corner partials, normal, twist on the saddle: \(S_u(0,0)=(1,0,0)\), \(S_v(0,0)=(0,1,0)\), normal \((0,0,1)\); twist \(P_{11}-P_{10}-P_{01}+P_{00}=(0,0,1)\ne0\); at \((\tfrac12,\tfrac12)\) \(S_u=(1,0,\tfrac12)\), \(S_v=(0,1,\tfrac12)\), cross product \((-\tfrac12,-\tfrac12,1)\). Twist zero for a planar parallelogram net. M9.
8. `tensor-subdivision` (patch-subdivision): elevate bilinear to \((2,1)\), subdivide at \(u=\tfrac12\). Elevated points \((0,0,0),(\tfrac12,0,0),(1,0,0)\) and \((0,1,0),(\tfrac12,1,\tfrac12),(1,1,1)\); left half corners \((0,0,0),(\tfrac12,0,0),(0,1,0),(\tfrac12,1,\tfrac12)\); same shape, new representation. M1.
9. `tensor-joins` (patch-joins): check C0/C1 on nets; C1 vs G1; teapot capstone. Left \(z=uv\), right net \((1,0,0),(2,0,0),(1,1,1),(2,1,2)\): shared edge matches (C0); \(Q_{1j}-Q_{0j}=P_{mj}-P_{m-1,j}\) for \(j=0,1\) (C1). Doubling the right-hand differences keeps tangent plane (G1), not C1. M6.
10. `triangular-patches` (patch-triangular): count \((n+1)(n+2)/2\), barycentric \((u,v,w)\), centroid de Casteljau, boundary degree \(n\). \(n=2\): 6 points; centroid weights \(\tfrac19\) at corners, \(\tfrac29\) at edge midpoints (sum 1); \(n=1\): centroid is the mean of three vertices; edge \(w=0\) is a quadratic Bézier curve. M7.
11. `square-vs-triangular` (patch-triangular comparison): same boundary degree \(n=3\): tensor 16 points, 4 boundary curves, unit square, per-variable degree; triangular 10 points, 3 boundary curves, reference triangle, total degree. Which fits grids vs corner-rooted shapes; neither is a trimmed form of the other. M7, M9.
Chapter shell: title/purpose/prerequisites referencing Bézier curves (control polygon, de Casteljau, Bernstein, C0/C1/G1, degree elevation) with a paragraph link to `/bezeg-2.0/learn/bezier-curves`.

## 8. Terminology (verbatim; `docs/localization.md:47-60`, spec :157-190)
Bézierjeve krpe (family), Bézierjeva krpa (never Bézierova), tenzorska Bézierjeva krpa (definition: krpa v obliki tenzorskega produkta), trikotna Bézierjeva krpa, bilinearna/bikvadratna/bikubična Bézierjeva krpa, kontrolna mreža, robna krivulja, izoparametrična krivulja (prose: krivulja pri stalnem \(u\)), parametrično območje (enotski kvadrat / referenčni trikotnik), baricentrične koordinate, Bernsteinova utež točke, parcialni odvod, tangentna ravnina, normala, mešani odvod (first mention "mešani odvod oz. vektor zasuka, angl. twist"), višanje stopnje, subdivizija, konveksna ovojnica, zveznost \(C^0\)/\(C^1\), geometrijska zveznost \(G^1\), azimut / višinski kot. English: Bézier patch, tensor-product patch, triangular patch, control net, boundary curve, iso-curve, parameter domain, barycentric coordinates, partial derivative, tangent plane, normal, twist, degree elevation, subdivision, convex hull. krpa = single piece, ploskev = surface in general. Guided example = vodeni primer. A term not in the table needs a recorded basis (`localization.md#choosing-new-terms`).

## 9. Recommended split (3 sequential writers, one file each)
Files: `src/learning/content/patchChapter.ts` (shell, figures, assembly, exports `patchChapter: FamilyChapter` and a coverage const), `patchChapterBasics.ts` (sections 1-4), `patchChapterEvaluation.ts` (5-8), `patchChapterJoinsTriangular.ts` (9-11). Each exports `readonly FamilyChapterSection[]` built with `section()`/`text()` exported from `familyChapters.ts` (one-line change).
- Writer A: shell and wiring (`familyChapters.ts` import/spread, exports; `learningChapters.ts` order; the four test edits; `patchChapter.test.ts`; stubs for B/C files), sections 1-4 with prompts and figures; focused tests.
- Writer B: sections 5-8 (owns `patchChapterEvaluation.ts`).
- Writer C: sections 9-11, `docs/reviews/bezier-patches/chapter.md` (section-to-misconception/activity table; gaps: no example blocks or authored scenes until task 13, flag 6), whole-chapter notation and number cross-check. Then handler: math review, `just check`, `$smoke-tester`.
Each writer verifies every number in a scratch calculation before writing, writes both languages per section together, and runs vitest only on the listed files.

## 10. Not verified
No tests run. Section 7 numbers are hand-derived here and need independent review. Whether catalog preset images match the hand examples was not checked. Slovenian wording not drafted.

## 11. Handler decisions (handler 20, 2026-10-29)

1. Order: `bezier-patches` sits directly after `parametrization` (the last curve family: rational, splines, PH, parametrization) and before `functions-and-calculus`; prerequisite `bezier-curves`.
2. Eleven sections per the spec; reuse the six reserved ids from `guidedLessonOwnership.ts`. Section 11 links `patch-triangular` (its square/triangle comparison view); no `patch-compare` id is invented.
3. No `example` blocks until task 13; link Demonstrations through `demonstrationIds` and `investigationPrompts`. Figure captions say plainly that catalog previews show default scenes; authored-scene figures follow in task 13 (recorded as a task 12 gap).
4. Section 6 variation diminishing: state that the curve property has no general bivariate analogue and do not assert a specific numeric counterexample unless the writer checks it by an independent computation recorded in `chapter.md`; mathematical review checks it.
5. Update the four count/cap tests to the new chapter count and an 11-section allowance specific to this chapter rather than loosening the cap globally.
