# CG-B3-3: L5 offset lesson

Evidence for the [L5 lesson](../../specs/curve-geometry-lessons.md) on `curve-offset`: six steps, 13 frames, chapter section and registration. Lesson text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Scene contract: [handoff 53](../feature-streams/curves/handler-handoff-53.md#l5-scenes).

## Commits

| Commit | Work |
| --- | --- |
| `cddce690` | Lesson, chapter section, registration (`lesson: false` removed), inventory entry, smoke row |
| `41117df4` | `curveGeometryGuidedLessons.offset.test.ts`, 13 real-graph tests; 9 mutations each failed a test |
| `e6672d22` | Step 5's missing calculation frame, found by the smoke's frame count |
| `6bdf22bf` | Lower `OFFSET_VIEW`, step 5's prompt, session close test |
| `d34765ab` | Catalog test for a worked example's calculation frame |

Hashes before the rebase onto `master`; the pushed commits keep these subjects.

## Mathematics

Handler 53 checked the formulas and quoted numbers by hand: the right normal, \(O_d'=(1+d\kappa)|r'|T\), \(r-RN\) as the centre, and the evolute values at \(x=\pm0{,}38321\). It read the formula blocks and the worked example, not every step's prose. Real-graph tests pin every sample's distance, the cusp positions and the factor's roots.

## Engineering review

`bezeg-reviewer` (Sonnet) on `28cf77a3..e6672d22`: no high or medium finding. It checked scene independence, backward and jump navigation (all 36 scene pairs), the frame contract, every consumer of the id, and test non-vacuity.

- **Fixed: no close test.** The evolute has one, and offset owns an overlay and a plot controller. The new test closes a session on the PH step and requires state, curve kind, control points, bounding box and overlay ownership back. It fails with the close removed. No leak was found.
- **Left: `curveGeometryPreviewCopy.ts` has no `curve-offset` entry.** The demonstration-keyed copy serves as fallback. It goes in with the card (CG-B3-5).

## Browser check

`bezeg-smoke` (Sonnet) walked all 13 frames and the final exploration at 1440×900 and 390×844 on the production build of `e12bf402`: no console error, no horizontal page scroll. The handler reshot the fixes on the rebuilt preview, with full-page desktop images, and viewed the key frames.

**Fixed: every parabola scene sat under the panel.** The curve lies at \(y>0\), so at 1440×900 the panel hid both of step 5's cusps. `OFFSET_VIEW` is now `[-3, 3.4, 3, -1.2]`, which keeps \(y=0\) low on the board and \(p_1\) on it, the same repair as [L4's step 5](cg-b2-4-lesson.md#browser-walk). On step 5's observation frame both cusps and the swallowtail are clear of the panel.

**Fixed: step 5 did not say where the plot is.** It lives in the inspector, below the fold, and the prompt said only "the graph". The prompt now names the speed factor graph among the tools.

### Layout findings for the gate

- Step 5's calculation frame still covers the cusps: the panel is taller there. The observation frame after it shows them.
- At 1440×900 the panel clips the board caption's long lines by about 12 characters, as in [L3](cg-b2-3-lesson.md#layout-findings-for-the-gate) and L4. "Opazuj na grafu" clears it.
- At 390×844 the panel hides the board in every frame until "Opazuj na grafu"; `curve-evolute` behaves the same (compared on its step 1). In observe mode the chip covers the caption's first line, and the caption crosses the top tick labels.
- At 390×844 long formulas scroll inside their box, so step 5's calculation is cut at "\(d=\)" until scrolled.
- The PH scene keeps the graph's own window, and the panel covers the top control points on its frames. Both curves stay visible.

## Finding outside this lesson

Explanation frames do not carry `workedExample`, so a step's example shows only in a `calculation` frame. Seventeen Functions-stream lessons list one on steps without that frame, so the learner never sees it. `lessonCatalog.test.ts` freezes the list and fails on any new case. The Functions stream has closed, so this is [open for the owner](../../tasks/feature-streams/curves.md#notes).

## Checks

`just check` on `d34765ab`: `EXIT=0`, 1336 s, 590 test files, 10820 tests passed, 8 skipped (the transient-state contract ran its local sample). `just smoke-lesson curve-offset` passed on that build.

## Not covered

- The plot on desktop inside the lesson was seen only down to its top edge: it sits in the inspector's own scroll area. It was viewed whole at 390×844, and on the free route by [CG-B3-2a](cg-b3-2a-graphs.md).
- After the view change, the handler viewed step 4 and step 5 at 1440×900 and step 5 at 390×844, not every frame again.
- English in the browser beyond the smoke row. The lesson's reset control is unit-tested only.
- Card and poster: CG-B3-5.
