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
| PG4a | Chapter blocks, bilingual prose, terms, docs (criteria 6, 7, 9) | PG3 | Engineering; notation test | planned |
| PG4b | Performance measurement and smoke (criteria 5, 7) | PG4a | Handler | planned |

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
- Tasks 03 and 04 need the owner's decisions from audit 00. Stop and report after 00.
- Batches 03 and 04 edit `familyChapters.ts` and the capture manifest. Follow the [shared-file rules](README.md#shared-files).
- **Opens `G-HL`** when tasks 01 and 05 are accepted. Record each step here.

| Task | Status |
| --- | --- |
| 00 audit (redo) | planned |
| 01 capture pipeline ∥ 02 card layout | planned |
| 03 ∥ 04 batches | blocked: owner decisions from 00 |
| 05 figure-kind removal and acceptance | planned |

## Gate provided

| Gate | Status |
| --- | --- |
| `G-HL` (highlights 01 + 05) | closed |
