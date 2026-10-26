# Integration test repair note

The eight reported failures were stale expectations against the consolidated guided-example model. No product defect was found in the assertions covered by this repair.

- `LearningPage.test.tsx` now compares chapter links with each section's authored `orderedContent` example sequence. It still checks rendered link count, destinations, and labels; it no longer treats registry ordering as curriculum ordering.
- `chapterGuidedWorkspace.test.tsx` checks that the legacy activity URL resolves to its retained chapter owner, that its original prompt survives as an observation frame in the consolidated lesson, and that a real prepared scene action is applied. The prompt need not appear on the opening frame.
- `DemonstrationWorkspace.test.tsx` checks that the legacy family prompt survives in the resolved observation frames and that return links and normalized invalid context use the retained canonical section (`reading-bernstein`). Hide/reopen checks derive frame totals from the resolved lesson, including consolidated exploration frames, and exercise the reduced-motion handoff path.

Verification started with `just --list`. The final focused run was:

```text
just unit src/learning/LearningPage.test.tsx src/graphs/base/chapterGuidedWorkspace.test.tsx src/graphs/base/DemonstrationWorkspace.test.tsx
passed in 25.0s; 39 tests across the three files
log: .command-logs/2026-10-26T14-32-57-667Z-104324-5e322498.log
```

`just typecheck` passed in 18.4s; log: `.command-logs/2026-10-26T14-32-34-615Z-73028-db001b11.log`.

The independent curriculum baseline remains useful for validating retained ownership and destinations; link order is validated against authored chapter content as required by A2. The handler separately reported a resolver identity-cache fix during the browser-capture hang investigation; that source change is outside this test repair and remains under handler verification.
