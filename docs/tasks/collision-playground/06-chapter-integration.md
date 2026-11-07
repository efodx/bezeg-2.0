# CP6 — Chapter integration

Source: spec [Chapter integration](../../specs/collision-playground.md#chapter-integration) and [Terms](../../specs/collision-playground.md#terms-proposals-settled-in-cp6-by-choosing-new-terms), criteria 7–9. Batch B. Kind: engineering review; notation test.

**Two commits:**

1. **Shared runtime** (its own commit; note it in the stream file for Platform):
   - generalize `PlaygroundContent` in `src/learning/chapter/orderedContent.ts` to `{kind: 'playground'; playground: 'bezier-drawing' | 'collisions'; mode}` with the valid pairs typed;
   - update the four Bézier blocks in `bezierChapter.ts` mechanically, and `ChapterPage.tsx`;
   - render playground blocks in `FamilyChapterPage.tsx`, lazily loaded behind `React.Suspense`;
   - family chapter section types accept the block.
   - Bézier chapter tests are unchanged and pass. Add a mutation check (drop the family renderer case → a test fails).
2. **Sweep chapter content:**
   - in `sweepChapter.ts`, the `run` block in `sweep-idea` with one invitation sentence before it;
   - the `inspect` block at the end of `interval-sweep`, after the guided example, with a short passage covering box shadows as intervals, the \(\binom n2\) count, broad phase then exact test, and a sentence on grids and bounding-box trees;
   - one-shot bilingual text; `lessonMathNotation.test.ts` passes unchanged;
   - settle the spec's Slovenian term proposals by [choosing new terms](../../localization.md#choosing-new-terms) and record them in the localization table, with sources in the spec;
   - docs: `capabilities.md`, `ui-functionality.md`, and the sweep spec's Placement (one sentence and a link).

**Checks:**

- `just unit src/learning`, `npx tsc --noEmit --pretty false`, `just lint` on touched files and `just build`.
- Chapter page check in both languages through `bezeg-smoke` (Haiku): `/bezeg-2.0/learn/sweep-algorithms` shows both blocks in the right sections, and `/bezeg-2.0/learn/bezier-curves` still shows its two playground blocks.

**Return** ≤ 250 words, with the term decisions listed.
