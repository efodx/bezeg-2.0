# Media binding handoff

Worker start: 2026-10-26 13:42 UTC in `.worktrees/consolidated-learning` at `ad37517`. Brief revision: handoff-v12. No commit or production capture was made.

## Delivered

- Added `src/learning/chapter/guidedExamplePreviews.ts`. It resolves a stable retained card key to its generated PNG, bilingual alt text and caption; it returns no preview when the PNG is absent. Activity copy follows the retained source ID, long lessons use their reviewed demonstration copy, and the worked parabola and weighted Bernstein basis scenes have explicit copy.
- Updated `ChapterGuidedLessons` to use the resolver by default while keeping the injection seam. `ChapterExploration` hides an image that fails to load while retaining the caption-independent card text and launch action.
- Added `scripts/generate-guided-example-inventory.cjs`; it loads the runtime registry through Vite SSR, resolves each retained canonical path and hashes the actual opening step's prepared actions and first frame. It validates the result through the capture API before writing the default inventory.
- Generated `docs/reviews/illustrated-chapter-examples/capture-inventory.json`: 56 retained examples. The worked spline entry expects one curve and five visible points (four fixture controls plus the derived join), and samples the full spline at `[[0,0],[1,1],[2,4]]`. The derived join and spline behavior are supported by `guidedExampleScenes.test.tsx`; actual board type/sample comparison still needs the production capture.

## Evidence and remaining work

- `just unit src/learning/chapter/guidedExamplePreviews.test.ts src/learning/ChapterExploration.test.tsx src/learning/ChapterGuidedLessons.test.tsx`: passed.
- `node --test scripts/generate-guided-example-inventory.test.cjs scripts/guided-example-preview-api.test.cjs`: 7 passed.
- Targeted `just lint` and `npx tsc --noEmit --pretty false`: passed.
- `node scripts/generate-guided-example-inventory.cjs`: wrote and validated 56 entries.
- No production build, image capture, or visual comparison was run while shared content was being edited. There are no captured PNGs yet; the resolver therefore keeps the cards text-only until the final capture pass. Actual PNG/copy comparison and published-set validation remain open for the handler.
