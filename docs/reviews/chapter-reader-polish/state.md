# Chapter reader polish: state

Handler 1 handed off on 2026-11-12 at the context budget, after writing the edits and before verifying them.

## Where

- Worktree `.claude/worktrees/chapter-polish`, branch `worktree-chapter-polish`, based on `origin/master` `01ca058a`.
- Spec: [chapter-reader-polish](../../specs/chapter-reader-polish.md). Read it first; its Decisions section is the design.
- `node_modules` in this worktree is a real `npm ci` install. Do not junction it to the main checkout: that checkout's `node_modules` is empty.

## Owner direction, verbatim

`/impeccable polish the way chapters look in /bezeg-2.0/learn, for example bezeg-2.0/learn/convexity-hulls.`

The pass is a refinement: keep the cream, green, ochre and Georgia identity, the copy, routes and behaviour.

## Written, not yet verified (one WIP commit on this branch)

- `src/learning/ChapterPage.css`: rewritten onto `--bezeg-shell-*` roles through `--chapter-*` aliases; shell canvas; `--chapter-text` (projection scale) and `--chapter-measure`; contents rail without the weight change; card on the `panel` surface with a 16px radius; chapter-end neighbour blocks; themed scrollbars, selection and focus; fade under the sticky phone contents bar.
- `src/learning/ChapterNavigation.tsx`: `ChapterNeighbors` links carry `learning-neighbor--previous|next`, a label span, a visually hidden colon and a title span. Link `textContent` is unchanged (`LearningPage.test.tsx:110` pins it).
- `src/learning/LearningPage.css`: the legacy "Shared with the chapter readers" block is removed; those rules now live in `ChapterPage.css`. The landing keeps one fallback focus rule.
- `src/learning/ChapterGuidedLessons.css`: reduced to the wrapper; the old rule above each card and the dead list rules are gone.

## Remaining steps, in order

1. Start the dev server: `npx vite --port 4467 --strictPort`.
2. Capture and look: `BEZEG_WT="$PWD" node docs/reviews/chapter-reader-polish/shoot.cjs after convexity-hulls bezier-curves sweep-algorithms` writes viewport slices at 1366, 1920 and 390px to `docs/reviews/chapter-reader-polish/shots/` (untracked; do not commit them). Check against the spec's Acceptance, and in particular:
   - the page and header share one canvas; no patch around a card's preview image;
   - introduction, prerequisites box and paragraphs have equal width at 1366px; body type is at least 19px at 1920px;
   - contents entries do not move when the current section changes; the current entry's text does not shift sideways;
   - the card action is white text on the green action colour (the removed `.chapter-guided-lessons a` rule used to recolour it);
   - the chapter-end blocks: previous left, next right, stacked at 390px, arrows drawn, colon not drawn;
   - `bezier-curves` (numbered sections, `chapter-next-row`, source footer) and a chapter with a playground still look right;
   - English as well as Slovenian.
   Fix what the look shows, in one batch, before looking again.
3. Not started, from the spec: the per-chapter document title (`<chapter title> · Bezeg`, restored on leaving) in `FamilyChapterPage.tsx` and `ChapterPage.tsx`. Implement it with a unit test, or strike the decision and its mention from the spec.
4. Add a short "Chapter reader" section to `DESIGN.md` recording the decisions in the spec (the stylesheet's first comment points to it).
5. Run the Impeccable detector once on the changed files: `~/.claude/skills/impeccable/scripts/impeccable detect --json src/learning/ChapterPage.css src/learning/ChapterNavigation.tsx src/learning/LearningPage.css`.
6. Checks: `just typecheck`, `just lint`, `just unit src/learning`, `just build`, then the chapter rows of `tests/unified-learning.smoke.spec.cjs` (they include 390px at 200% text). Record results and the revision in the spec under a Verification heading.
7. Commit in small commits and push this branch to `origin`. Do not push to `master`: the session that started this work may not, so end by reporting the branch and `just publish` as the owner's next command.

## Risks to check

- `content: "← " / ""` is the alternative-text form with a plain fallback declared first; confirm the arrows draw in Chromium.
- `.learning-page a:focus-visible` on the landing lost its chapter selectors; confirm `/learn` focus rings are unchanged.
- `CollisionHarness.tsx` mounts `.chapter-page` on its own route; it should only change canvas colour.
- The critique of `/learn/sweep-algorithms` (`.impeccable/critique/` in the main checkout, untracked) also lists content and keyboard items; they are outside this pass and belong in the final report as follow-ups: formula tab stops (166 per chapter), the draft closing note in `FamilyChapterPage.tsx:108`, run-in heads such as `Cilj razdelka:` set as plain text.

## Settings

Model `claude-fable-5-2`. No workers are running. The work is tightly coupled visual CSS, so it stayed with the handler.
