# 00 — Audit highlights and figure dispositions

Status: planned. Source: [spec H1, H2, H4](../../specs/guided-example-highlights.md). Dependencies: none. Role: curriculum/content auditor; no code changes.

Start from `docs/reviews/illustrated-chapter-examples/curriculum-audit.md`, `capture-inventory.json`, `src/learning/content/familyChapters.ts` (`figures` and ordered `figure` items), the guided-example registry (`src/learning/chapter/guidedExamples.ts`, `retainedExamples.ts`) and each example's frames and prompts.

1. For each of the 56 retained examples, choose its highlight: the frame and the learner-equivalent steps (existing scene/lesson actions with concrete values) that show the example's point most clearly. Steps must be something the example asks the learner to do or shows in a frame. Record when the starting scene is already the best moment, with reason.
2. For each highlight, list the visible claims a caption will make and the mathematical check that verifies each (for example offset distance, weight value, join tangent alignment).
3. For each of the 16 figure placements, record the disposition: which example's highlight carries its point, which caption or prose sentence absorbs remaining distinctions, or "dropped" with reason. Flag any figure whose concept no retained example shows; those need an owner decision before batch work removes them.
4. List prose sentences in both languages that refer to a removed figure.
5. Mark at least three representative entries for task 01 samples: the quintic PH offset card, a multi-frame example, and an example with a nontrivial learner step (for example a slider value).

Output: `docs/reviews/guided-example-highlights/highlight-audit.md` (matrix: example ID, chapter/section, chosen frame, steps, claims and checks, caption intent) and a figure-disposition table. Report flagged owner decisions in the handoff, briefly. Completion: every example and figure has a disposition; the handler reviews flagged items with the owner before tasks 03–04 start.
