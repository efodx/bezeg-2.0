# 05 — Remove the figure kind and accept the change

Status: planned. Source: [spec H1–H7](../../specs/guided-example-highlights.md). Dependencies: 02, 03 and 04 complete. Role: handler with independent reviewers.

1. Delete the now-unused `figure` ordered-content kind, `FamilyChapterFigure`, section `figures` fields and their renderer branches in `FamilyChapterPage.tsx` and `ChapterPage.tsx`; update tests that counted figures. Show a gate that fails if a section figure is reintroduced.
2. Reconcile all eight chapters in both languages against the task 00 matrix: zero section figures, 56 cards with current highlight media, captions and alt text, no prose referencing removed figures, every figure disposition honored.
3. Recapture if presentation or build fingerprints changed after the batches; verify the complete-inventory gate.
4. Run `just check`. Obtain independent mathematical, engineering and UI/accessibility reviews. Delegate full chapter smoke per the spec: desktop, projection-size, narrow and enlarged text, both languages with live switching, keyboard launch/return, Back/Forward, catalog guidance entry.
5. Update the [illustrated chapter examples spec](../../specs/illustrated-chapter-examples.md) status and `docs/future-plan.md` to describe the delivered behavior.

Completion: `docs/reviews/guided-example-highlights/acceptance.md` records H1–H7 results, commands, review findings and their resolution, browser coverage and gaps at a stable revision.
