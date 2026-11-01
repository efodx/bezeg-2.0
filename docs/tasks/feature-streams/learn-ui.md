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
| 01 capture pipeline ∥ 02 card layout | 01 implemented, review pending: part A `5fd4a0d6`, part B `6b3aab24` (explore, select-tab and set-control steps; S1–S3 captured; failure modes in [capture note](../../reviews/guided-example-highlights/capture-note.md)); stale chapter-page test fixed in `411c6593`. Not on `master` until 01 is accepted, since the S1–S3 images now show highlights under start-scene captions. Started 2026-10-31 23:40: 01 split into part A (recipe format, runner, validation) and part B (samples S1–S3, D10, failure-mode evidence, commands guide); 02 runs in its own worktree `learn-ui-cards` so builds and capture provenance do not collide. Shared pixel contract: capture frame stays 420×260 CSS at 2× (840×520 PNG); card image column ≤ 420 CSS px, ratio 21:13. **02 accepted** 2026-10-31 (`a1594db8` on `learn-ui-cards`, cherry-picked as `a3dc9d4c`): image 240→364 px at 1440/1280, 280→328 px stacked at 390; 200% text at 390 and 1280 without overflow, SL/EN, keyboard and missing-image fallback checked ([layout note](../../reviews/guided-example-highlights/layout/layout-note.md)); handler reviewed the small diff in the main chat |
| D10 distance (part of 01) | done 2026-11-01, pending 01 mathematical review ([note](../../reviews/guided-example-highlights/ph-singularity-distance.md)): no robust d at 1.5ρmin on either fixture (ρmin at an endpoint). Cubic card takes the D10 fallback, start plus offset at the default distance. Quintic card: handler choice d = −2.5 (self-intersection for d in [−2.65, −2.4], from the secondary bend at t = 0; caption must not claim the tightest bend), flagged for owner confirmation. Batch 04 authors both recipes |
| 03 ∥ 04 ∥ 06 batches | planned (06 = Bézier patches, added by D1) |
| 05 figure-kind removal and acceptance | planned |

## Gate provided

| Gate | Status |
| --- | --- |
| `G-HL` (highlights 01 + 05) | closed |
