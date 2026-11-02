# Learn UI stream: handler handoff 12

Date: 2026-11-02. Handler 12 stopped at its 150k context threshold during task 05. Earlier context: [handoff 11](handler-handoff-11.md). Source: [spec](../../../specs/guided-example-highlights.md), [task 05](../../../tasks/guided-example-highlights/05-acceptance.md), [stream record](../../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

Branch `worktree-stream-learn-ui` in `.claude/worktrees/stream-learn-ui`. **Commits below are local, not pushed**: push them with the recapture.

## Done this session (task 05)

- **Step 1 (05a, Sonnet worker):** `baec9e92` and `63400fda` (the first commit's path list stopped at an already-staged deletion, so the second carries the rest). Deleted the `figure` ordered-content kind, `FamilyChapterFigure`, section `figures` and the renderer branches in `ChapterPage.tsx`/`FamilyChapterPage.tsx`. The gate is `src/learning/content/chapterContentKinds.test.ts`, which failed with 55 offending entries under a mutation. Retired the unused `chapterActivityFigures.ts`, the six `src/images/learning/bezier/` PNGs plus their manifest, and `scripts/capture-chapter-figures.cjs`; `docs/commands.md` has a retirement note. The `tensor-joins` alt text now names the shared blue edge; the catalog `patch-joins` copy is separate and was left unchanged. Other streams' chapter files changed only by dropping a type argument. Worker checks passed: tsc, `just unit src/learning`, lint, 63/63 node guided-example tests.
- **Engineering review (Sonnet)** of 05a: no blocking finding. Its doc finding (`illustrated-chapter-examples.md:18-19`) is handled by a supersession note under that spec's status line, uncommitted (see below).
- **Mathematical review (Sonnet)** of all highlight captions: no false claim; numbers recomputed independently ([05-math-review.md](../../guided-example-highlights/05-math-review.md)). **Repairs `9ff729e0`** (Sonnet worker 05b; each new check failed under a mutation on manifest evidence): accumulation tangent curve check; sequence `types: {segment: 4}`; Darboux caption hedged to "computed values" (data-array rectangles cannot be sampled); patch de Casteljau caption "one pass in u, then one in v"; SL semicolons only in sentences with a decimal comma (handler fixed Darboux `[0; 2]`). **Deferred:** finding 5, `square-vs-triangular`: the claim about the tensor overlay and the height difference is true, but the surface-check format cannot express it. Info: rational weights are only implied by the asserted points.
- **Reconciliation (two Haiku passes)** ([05-reconciliation.md](../../guided-example-highlights/05-reconciliation.md)): 67/67 cards have SL/EN caption and alt text, an image and a manifest entry, with no orphans; 7 start and 60 highlight recipes; 27 of 28 checked figure dispositions are honored. Handler dispositions:
  - Row 7's "not the curve integrated from the origin" clause (`familyChapters.ts:238`) is kept on purpose. It is live-graph guidance in the `ph-cubic` investigation prompt, not a caption of the removed figure.
  - The `bezierChapter.ts` "picture/slika" sentences (126/213, 129/216, 263/264) refer to the adjacent card image and are fine.
  - Recipe deviations from the audit (complex-multiplication start, decasteljau-parameter start, patch first-frame highlights, ph-cubic-generator frame) are recorded in the batch notes. The acceptance record should name them in one list.
  - Open owner items: D10 (quintic d = −2,5), D4/D6 notes (no 4×3 net card; tensor-joins and properties picture choice).

## Uncommitted at handoff

Commit these with explicit paths:

- `docs/specs/illustrated-chapter-examples.md`: supersession note.
- `docs/future-plan.md`: 2026-11-02 highlights entry, which links `reviews/guided-example-highlights/acceptance.md` (not yet written).
- `docs/reviews/guided-example-highlights/05-math-review.md`, `05-reconciliation.md`.
- This note.

`just build` at `9ff729e0` and regeneration of both inventories (retained default, `--patches`) finished with exit 0 (logs `logs/05-build.log`, `05-gen-*.log`). The regenerated `docs/reviews/illustrated-chapter-examples/capture-inventory.json` and `docs/reviews/bezier-patches/guided-example-inventory.json` are modified and **uncommitted**: commit them with the recapture. The `build/` output is current for `9ff729e0`, so step 1 can start at `just preview 4387`.

## Next, in order

1. If the build and generation did not finish cleanly, rerun them: `just build`, then `node scripts/generate-guided-example-inventory.cjs` and `node scripts/generate-guided-example-inventory.cjs --patches`. Then `just preview 4387` in the background and run both full captures (`PREVIEW_BASE_URL` pointed at 4387, if the script needs it): `node scripts/capture-guided-example-previews.cjs docs/reviews/illustrated-chapter-examples/capture-inventory.json` and `node scripts/capture-guided-example-previews.cjs docs/reviews/bezier-patches/guided-example-inventory.json --family patches`. Expect the accumulation, sequence, darboux and tensor-decasteljau entries to change recipe or copy fingerprints, and PNGs to stay byte-identical; view any PNG that changed. Chapter-owned inventories (linear-maps, complex-maps) belong to the Maps stream: leave them, and note it in the acceptance record.
2. `just check` once (the F6 check for the feature).
3. Delegate the full chapter smoke (`bezeg-smoke`, Sonnet) per the spec, with UI/accessibility review of its screenshots. Cover desktop 1440, projection (1920 or 1280 at 150%), narrow 390, 200% text, SL/EN with live switch, keyboard launch and return, Back/Forward, catalog guidance entry, and card lightboxes. Cover all nine chapters, with at least one launch per chapter.
4. Write `docs/reviews/guided-example-highlights/acceptance.md` (H1–H7, commands, review findings and dispositions above, browser coverage, gaps). Mark the spec status and task 05 done. Set the stream row 05 and `G-HL` to `open`. Fetch, rebase, recheck, then `git push origin HEAD:master`.
5. With `G-HL` open, the stream's last feature is accepted. Write a final note, set `Run state: complete`, and launch nothing.

## Settings

Opus handler, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet; reviews `bezeg-reviewer` Sonnet (Haiku for content checklists; a Haiku reconciliation needed two passes at a 78k budget); smoke `bezeg-smoke` Sonnet. Worker tokens this session: 05a 51k/29 tools, 05b 50k/28, math review 133k/51, engineering review 25k/6, reconciliation 91k/36 + 60k/32. `do-log` records for handlers 3–12 are still unwritten.
