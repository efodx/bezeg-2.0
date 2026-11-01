# Stream: Learn UI
Run state: active

Rules: [feature streams](README.md). Port 4312. Handoffs: `docs/reviews/feature-streams/learn-ui/`.

## 1. Bézier drawing playground

Spec: [bezier-drawing-playground.md](../../specs/bezier-drawing-playground.md), [ADR 0020](../../adr/0020-svg-drawing-playground.md). Slices are the spec's delivery slices. No gate.

| Slice | Content | Depends on | Review | Status |
| --- | --- | --- | --- | --- |
| PG1 | `drawingModel.ts`: model, undo, validation (criterion 1) | — | Mathematical | accepted |
| PG2 | `DrawingPlayground.tsx`: canvas, pointer and keyboard editing, toolbar, persistence (criteria 2, 4, 8) | PG1's interface fixed | Engineering + UI/accessibility | accepted: review findings 1–11 repaired ([findings](../../reviews/feature-streams/learn-ui/pg2-review-findings.md)); real-browser checks of criterion 2 (pointer capture, double click, touch, focus ring) carried to PG4a/PG4b |
| PG3 | *Look underneath* overlays and the one-curve comparison (criterion 3) | PG2 | Mathematical + UI/accessibility | accepted: `LookUnderneath.tsx`; review findings 1–6 repaired ([findings](../../reviews/feature-streams/learn-ui/pg3-review-findings.md)); label overlap, touch targets and segment press carried to PG4a/PG4b browser checks |
| PG4a | Chapter blocks, bilingual prose, terms, docs (criteria 6, 7, 9) | PG3 | Engineering; notation test | accepted: reviewed with no blocking finding; pushed with PG4b |
| PG4b | Performance measurement and smoke (criteria 5, 7) | PG4a | Handler | accepted: criterion 5 passes (all medians 16.7 ms; throttled inspect p95 33–50 ms recorded in `docs/bezier-performance-results.md`); criteria 2 and 7 browser smoke pass in SL and EN; smoke repair `d30a4a8` (inspect starts from the example, joint labels clear of P labels, caption and edges) rechecked in Chromium at 390×844 and 1440×900 ([handoff 3](../../reviews/feature-streams/learn-ui/handler-handoff-3.md)) |

**Section 1 accepted 2026-10-31**, pushed through `9ecde47a`; hosted browser smoke green on `9ecde47a` (the first push, `8f23b566`, failed two 390px/200% overflow checks, fixed by `9ecde47a`). `just check` (F6) still to run at the next stable checkpoint.

**Stop condition:** a performance miss against criterion 5 goes to the owner before release. Do not push PG4a's chapter blocks until PG4b passes or the owner accepts the miss. PG1–PG3 may be pushed earlier, since nothing mounts them yet.

## 2. Learn landing visual alignment

Spec: [learn-landing-visual-alignment.md](../../specs/learn-landing-visual-alignment.md); tasks: [learn-landing-visual-alignment/](../learn-landing-visual-alignment/README.md). It edits only `LearningPage.tsx`/`.css`, so it runs **in parallel with the playground** as the stream's second worker.

| Slice | Tasks | Status |
| --- | --- | --- |
| LL1 | Tasks 1–3 as one slice | accepted; browser smoke, live switch and focus checks carried to LL2 |
| LL2 | Task 4: phone layout, verification, DESIGN.md | accepted; phone hides per-chapter Contents counts visually (screen-reader only) to keep one line; hosted browser smoke green on 6c31ee6, which contains ece8730 |

## 3. Guided example highlights

Spec: [guided-example-highlights.md](../../specs/guided-example-highlights.md); tasks: [guided-example-highlights/](../guided-example-highlights/README.md). **Implementation authorized by the owner on 2026-10-31** as part of this stream. It starts after sections 1 and 2.

- Redo task 00's audit against current `master`. Its counts (56 examples, 16 figures) predate the Bézier patches chapter and any family chapters that have landed since.
- Owner decisions from audit 00 were accepted on 2026-10-31 (spec, *Owner decisions, 2026-10-31*). Task 06 covers the Bézier patches chapter.
- Batches 03 and 04 edit `familyChapters.ts` and the capture manifest. Follow the [shared-file rules](README.md#shared-files).
- **Opens `G-HL`** when tasks 01 and 05 are accepted. Record each step here.

| Task | Status |
| --- | --- |
| 00 audit (redo) | done: [highlight-audit.md](../../reviews/guided-example-highlights/highlight-audit.md). Real scope 67 examples, 29 figures, nine chapters; owner accepted every recommendation (D1–D12) on 2026-10-31; recorded in the spec |
| 01 capture pipeline ∥ 02 card layout | **01 accepted** 2026-11-01: engineering and mathematical reviews (Sonnet) found nothing blocking; repairs `049969b8` (per-entry inventory fingerprints so `--id` recaptures changed recipes; `expectChange: false` enforced; literal S1 pin; D10 note wording); per-example highlight copy with S1–S3 SL/EN captions `fc48b0a3`; full recapture `e4386544` (56 PNGs byte-identical, manifest gains per-entry fingerprints); S1–S3 cards browser-checked at 1440 in SL and after a live switch to EN. Partial `--id` runs still require unchanged build fingerprints, so batches that edit `src` recapture in full. Earlier: part A `5fd4a0d6`, part B `6b3aab24` (explore, select-tab and set-control steps; S1–S3 captured; failure modes in [capture note](../../reviews/guided-example-highlights/capture-note.md)); stale chapter-page test fixed in `411c6593`. Not on `master` until 01 is accepted, since the S1–S3 images now show highlights under start-scene captions. Started 2026-10-31 23:40: 01 split into part A (recipe format, runner, validation) and part B (samples S1–S3, D10, failure-mode evidence, commands guide); 02 runs in its own worktree `learn-ui-cards` so builds and capture provenance do not collide. Shared pixel contract: capture frame stays 420×260 CSS at 2× (840×520 PNG); card image column ≤ 420 CSS px, ratio 21:13. **02 accepted** 2026-10-31 (`a1594db8` on `learn-ui-cards`, cherry-picked as `a3dc9d4c`): image 240→364 px at 1440/1280, 280→328 px stacked at 390; 200% text at 390 and 1280 without overflow, SL/EN, keyboard and missing-image fallback checked ([layout note](../../reviews/guided-example-highlights/layout/layout-note.md)); handler reviewed the small diff in the main chat |
| D10 distance (part of 01) | done 2026-11-01, mathematically reviewed with 01 (independent recomputation: ρmin 4 cubic, 1 quintic; quintic interval about [−2.65, −2.38]) ([note](../../reviews/guided-example-highlights/ph-singularity-distance.md)): no robust d at 1.5ρmin on either fixture (ρmin at an endpoint). Cubic card takes the D10 fallback, start plus offset at the default distance. Quintic card: handler choice d = −2.5 (self-intersection for d in [−2.65, −2.4], from the secondary bend at t = 0; caption must not claim the tightest bend), flagged for owner confirmation. Batch 04 authors both recipes |
| 03a bezier-curves | **accepted** 2026-11-01 (handler 6): nine highlight recipes (affine quarter turn, Bernstein degree 3, evaluation at 1/2, quartic helper curves at 1/4, cubic de Casteljau rows, elevation, extrapolation to 6/5, eight subdivision pieces, cut at 1/2) and three kept start scenes: `convex-hull` and `quartic-interpolation` (audit: start is best) and `decasteljau-parameter` (its activity lesson is one synthetic step with no frames, so t = 1/4 is not reachable with the existing step kinds). Checks computed from the graph presets, which differ from the audit's inferred "default cubic" for the Bézier, elevation and extrapolation graphs. Full recapture: only the nine highlight PNGs changed; each image was viewed. Handler repairs: subdivision `curveCount` 3 (the graph's orange remainder overlay, which lies on the first piece); extrapolation caption names the end (3,06; −3,87) and the preview tail beyond it; Bernstein alt text corrected. Maths reviewed by the handler in the main chat (blossom segment controls, elevation weights, rotation about the mean); the capture runner checks each recipe against the board. Found, not fixed (lesson display, out of scope): after Extrapolate, the extrapolation graph keeps drawing the curve to `extrapolationT` (`AbstractJXGBezierCurve.ts:359`), so `ex-extend` shows a tail past the end point that its expected observation places at (3,06; −3,87) |
| Test load 2026-11-01 | `just build` waited 632 s for a test slot (over the 10-minute mark); the stream keeps one worker until waits drop |
| 03b foundations, rational, splines | **accepted** 2026-11-01 (handler 7): six section figures replaced by SL/EN prose (`094660ce`); eleven highlight recipes and four kept start scenes (`20ff9011`), from two sequential Sonnet workers (foundations + rational, then splines) with mutation-checked helpers; handler recomputed the rational and C¹ values, viewed every recaptured PNG and corrected alt/captions (no visible point labels in spline images, extrapolation w₂ off-view plus preview tail, rational de Casteljau curve drawn to t = 0,5). `just check` passed; smoke 1280/390 SL/EN passed ([batch A note](../../reviews/guided-example-highlights/batch-a-note.md)). Smoke review found `0letle1` in investigate-rational prose, fixed with a bare-TeX-command gate (`6f569214`). Task 03 done |
| 04 part A: ph-curves, parametrization | **pushed** 2026-11-01 (handler 8): five figures (audit rows 7–11) replaced by SL/EN prose (`5f18d3a8`); eight new recipes plus S1/S3 (`ddbe6333`). Three sequential Sonnet workers: the first spent its 135k budget on the prose plus a draft solver, then two finished parametrization and PH. Handler repairs: `ph-cubic-generator` moved to frame `instruction` (frame `observe` differs from start, so `expectChange: false` failed in capture); quintic d = −2,5 alt now says only a short offset piece with the small loop is in view (the rest is off-view); cubic D10 caption claims only smoothness for \|d\| ≤ 3 < ρmin = 4. Full recapture passed every board check, and only the seven recipe PNGs changed; each was viewed. `ph-cubic-speed` and `ph-cubic-offset-length` are visually identical (both d = 1, per audit). Checks: `just unit src/learning`, lint of touched dirs, typecheck, recipe and inventory node tests, build. Smoke deferred to the end of batch 04 (all four chapters) |
| 04 part B, C: functions-and-calculus, analysis | planned |
| 06 Bézier patches | planned (added by D1) |
| 05 figure-kind removal and acceptance | planned |

## Gate provided

| Gate | Status |
| --- | --- |
| `G-HL` (highlights 01 + 05) | closed |
