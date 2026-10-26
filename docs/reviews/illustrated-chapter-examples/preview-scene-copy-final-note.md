# Preview scene copy and inventory checks

Worker slice: `guidedExamplePreviews.ts` and test, `guidedExamplePreviewCopy.ts` and test, and `generate-guided-example-inventory.cjs` and test. Worktree: `.worktrees/consolidated-learning`. Source acceptance: [spec A4/A5](../../specs/illustrated-chapter-examples.md).

The copy tables cover all 45 long lesson demonstrations and six Bézier activities; retained-home resolution supplies scene-specific copy for the worked parabola join and weighted-Bernstein example. I checked those mappings against the first-step preparation routes. The worked join has its own fixture-backed scene and derivative prompt, so it keeps dedicated bilingual alt text and a caption about the shared point and comparing derivatives.

The weighted-Bernstein copy was inaccurate: it described degree-one and degree-two graphs together, while the retained card opens at degree two and turns stacked area off; the prompt then asks the learner to compare degrees two and three. Its new bilingual alt text identifies the three quadratic basis graphs. The caption describes their endpoint and midpoint behavior and the unstacked opening view without implying that degree three is already visible.

The inventory producer now requires the weighted card's opening actions to set degree two and stacked area false, and records three visible function graphs with expected samples for each quadratic Bernstein function at `t = 0`, `0.5`, and `1`. The worked parabola retains its independent check: one curve, five visible points, and samples `(0,0)`, `(1,1)`, `(2,4)`.

## Evidence and remaining work

- `node --test scripts/generate-guided-example-inventory.test.cjs`: 3 passed, including failures for an incorrect degree or stacked state.
- `just unit src/learning/content/lessonMathNotation.test.ts src/learning/content/guidedExamplePreviewCopy.test.ts src/learning/chapter/guidedExamplePreviews.test.ts`: passed. This caught two activity captions with single-backslash math delimiters; both now use doubled TypeScript escapes.
- Deliberately changed the weighted alt text to describe degree one; the chapter preview test failed on the degree-two/three-function assertion. Restored the copy and reran the focused tests successfully.
- `just lint` on the four owned source/test files: passed.
- `node scripts/generate-guided-example-inventory.cjs .command-logs/preview-scene-copy-inventory.json`: wrote and validated 56 retained entries. The generated weighted entry contained the expected two actions and numerical checks.
- `just typecheck`: passed after the handler repaired a concurrent ordered-content generic error in `src/learning/chapter/authoredChapterCoverage.test.ts`.

No production build or capture was run while shared writers were active. There are no final PNGs yet, so comparison of each image to its bilingual alt text/caption, readable scale, and inclusion of relevant construction remains open for the stable capture and browser review.
