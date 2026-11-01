# Guided-example highlight capture (task 01 part B)

Spec: [guided-example-highlights](../../specs/guided-example-highlights.md) H2-H4. Part A notes: [capture-part-a-note.md](capture-part-a-note.md). Command guide: `docs/commands.md` (guided-example capture paragraph).

## Recipe format

Authored in `src/learning/chapter/guidedExampleHighlights.ts` (`guidedExampleHighlightRecipes`, keyed by example id); the generator (`scripts/generate-guided-example-inventory.cjs`) resolves frame ids to lesson positions and writes `recipe` into every inventory entry (`{kind: 'start'}` or `{kind: 'highlight', frame, position, steps, expectChange, checks}`). `checks` use the same fields as `expected` (`types`, `curveCount`, `points`, `curves`) and are computed independently from formulas and fixtures in `guidedExampleHighlightExpectations.ts`, never from the board.

Step kinds (all drive the production UI as a learner would):

| kind | fields | effect |
| --- | --- | --- |
| `goto-frame` | `frame` | lesson previous/next buttons until the frame is current |
| `frame-action` | `frame`, (resolved) `label` | presses the frame's authored action button |
| `explore` | none | presses the lesson's "Skrij" (observation frames) or "Opazuj na grafu" (exploration frames) button: `hideOverlay` in `GuidedLesson.tsx` calls `onModeChange('explore')`; waits for `.demonstration-workspace.lesson-explore` and an inspector that is neither `inert` nor `aria-disabled` |
| `select-tab` | `tab`: `edit`, `display`, `save` | clicks the inspector tab, verifies `aria-pressed` |
| `set-control` | `control`: `checkbox`, `slider`, `number`; `label` (Slovenian accessible name); `value` | finds the control in the open tab, sets it, reads it back |

Why `explore`: while a guided lesson is in `content` mode, `DemonstrationWorkspace.tsx` sets the inspector `inert` and `aria-disabled` (lines ~133 and ~238). That explains the earlier "element is not enabled" failure of `select-tab`. The runner's `hideGuidedLessonOverlay` only sets `visibility: hidden` for the final board-only screenshot and does not change the mode, so it never unlocked the inspector. The final screenshot still hides the whole `.guided-lesson-layer` and clips to `#jgbox`, so overlay and tab UI are excluded. Validation requires an `explore` step before any `select-tab`/`set-control`, and forbids lesson-panel steps (`goto-frame`, `frame-action`, a second `explore`) after it, because the panel is hidden then.

Control labels and tabs seen on the PH quintic example: checkbox "Odmiki krivulje" and the sample frame's tab "Prikaz" (`display`); slider "Razdalja odmika d" (range -3 to 3, step 0.01) is in the "Uredi" (`edit`) tab.

## Recipes and checks (S1-S3)

All three recipes capture the frame state directly (`steps: []`): the frame already prepares the scene. The control path was proven separately (below).

- S1 `ph-curves.offsets.ph-quintic-offsets`, frame `ph-quintic-offset-positive-observation`: types `{curve: 2, point: 6}`, 6 control points, base curve and offset curve sampled at t = 0, 1/2, 1. Offset points satisfy |O - r| = d = 0.5 and (O - r) . r' = 0 (checked in `guidedExampleHighlightExpectations.test.ts`), on the right side of r. Image 840x520: green base curve, brown control points, blue offset curve, text "Dolzina loka: 3,400" (with diacritics on the board).
- S2 `rational-curves.why-rational.rational-weight`, frame `rational-base-evaluation-calculation`: types `{curve: 1, point: 5}`, weights (1, 2, 1, 1), marked point R(1/2) = (-9/11, 21/11); end points are independent of the weights.
- S3 `parametrization.weighted-knot.weighted-parameterization`, frame `wp-quarter-calculation-calculation`: alpha = 1/4 set by the frame; control points and curve equal the alpha = 1/2 start scene, the three markers sit at B(phi(k/4)) with phi(1/4), phi(1/2), phi(3/4) = 1/2, 3/4, 9/10 (see the test for the exact formula).

Inventory: 56 entries, 53 `start` and 3 `highlight`. The three highlight PNGs are 840x520.

## Control-path demonstration (browser, temporary recipes)

Recipe on frame `ph-quintic-degree-observation`: `explore`, `select-tab display`, `set-control checkbox "Odmiki krivulje" true`, `select-tab edit`, `set-control slider "Razdalja odmika d" 0.5`, with the S1 checks. Result: pass; the geometry is identical to the committed S1 image. Pixel comparison against the S1 PNG (channel difference > 40): 862 pixels, all inside x 18-219, y 15-34, i.e. the arc-length text; curves and points identical. Demos were run through a single-entry inventory (a full run, because `--id` runs reject a changed recipe for the retained image) with registry, inventory, manifest and PNGs restored afterwards (checked with `diff`/`cmp`). Raw log: [capture-part-b-failure-modes.log](capture-part-b-failure-modes.log).

## Failure modes (observed messages, shortened)

| mode | where | message |
| --- | --- | --- |
| unknown frame id | generator | recipe frame names unknown frame ph-nope; lesson frames are ... |
| unreachable frame | runner (`reachFrame`) | `<id>: recipe frame "ghost" is unreachable (... and the progress text became "Vodeni primer je koncan"; the lesson ended before the frame)`. Earlier text was the vague "cannot read the guided-lesson position"; the new text is covered by a unit test that fails without the change |
| select-tab/set-control without `explore` | generator, `validateRecipe` | recipe step 1 (select-tab) needs an earlier {kind: "explore"} step; the inspector is locked while the lesson panel is shown |
| lesson-panel step after `explore`, repeated `explore` | validation | ... uses the lesson panel after explore hid it; move it before the explore step / repeats explore |
| bad control label | runner | recipe step 5 (set-control Razdalja odmika X) failed: no visible slider named "Razdalja odmika X" in the open inspector tab; check the label and add a select-tab step before it |
| slider out of range | runner | slider "Razdalja odmika d" does not accept 7 (range -3 to 3, step 0.01) |
| expectChange with unchanged board | runner | recipe expects the board to change from the start scene, but the highlight state is identical; check the steps |
| empty board | runner | empty board (shown with a patched `inspectBoard`) |
| stale recipe | runner | recipe changed since capture ... recapture this image |
| missing / edited image | runner | missing preview asset; retained preview checksum differs from its manifest |
| empty inventory | runner | Guided-example inventory must be a nonempty array |

Not exercised in a browser: number-field controls (`number`) and the checkbox-false path (unit-tested only); the `save` tab.

## 14 changed start images

Between the manifest capture (93066f43) and now, board label elements changed type in the scene evidence, so 14 start captures (analysis.* and functions-and-calculus.*) were recaptured. Pixel comparison against HEAD (channel difference > 40): at most 57 differing pixels per image (eleven images have 4-57; three have none), scattered along curve or label edges: anti-aliasing and label rendering only. Visual inspection of analysis.taylor.taylor, functions-and-calculus.derivatives.derivative and analysis.existence.bisection (old vs new) showed no difference in curves, points, axes or label text. The scene checks of those entries pass, so nothing mathematically different was observed.

## Limits

- Highlight recipes are supported on curve boards only; surface (patches) routes accept `start` recipes.
- Only discrete step kinds exist; dragging control points on the board is not a step kind.
- `--id` runs skip the recipe, scene and inventory-entry staleness checks for the ids being recaptured (the final published-set validation still covers every entry); every other retained entry must still match its recipe, scene and per-entry inventory fingerprint, and a changed presentation or build fingerprint still refuses a partial run. Manifests written before per-entry fingerprints existed fall back to the whole-inventory fingerprint, so recapture all entries once.
- Capture needs a production build whose stamp matches the preview (`just build`, `just preview 4387`).
