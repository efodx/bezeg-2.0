# Curves stream: handler handoff 36

Handler 36 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 35](handler-handoff-35.md).

## State

- Branch `worktree-stream-curves`, pushed to `origin/master`. The head is the commit that adds this note, and the working tree is clean.
- Nothing is in flight: no workers, and the preview is stopped.
- Hosted CI on `master` was green from `37a4922f` through `00cca733`. Check `gh run list --branch master --limit 5` first.
- Settings: the handler runs Opus with `--permission-mode auto` and `--effort medium`; self-watch soft threshold 175k, handoff 215k. Workers are `bezeg-worker` Sonnet medium, reviews `bezeg-reviewer` Sonnet, smoke `bezeg-smoke` (Haiku for narrow checks, Sonnet for broad checks or new UI).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `94e0a5cc` | PS-C-5d1/5d2: P5 lesson `prob-correlation` (Sonnet worker) and the chapter section `correlation` (handler); `lesson: false` and the chapter-link exemption dropped; capabilities rows for P4 and P5 | PS-C-5d1 / 5d2 row |
| `00cca733` | count merge with Geometry's Voronoi B5 (coverage 112, preview copy 98/105) | focused learning tests, `just smoke-lesson prob-correlation voronoi-degenerate` |
| `f4f17da2` | PS-B-F6 marked **released** (green CI); PS-C-F6 gate recorded (`just check` 9617 tests, family smoke SL/EN 1440/390) | PS-B-F6 and PS-C-F6 rows |
| this commit | evaluation record (curves handler 36), this note | `docs/agent-workflow/evaluation-log.md` |

## Next steps, in order

1. **Joint poster capture** (the last gap of PS-C-F6). Geometry's recipes landed in `33f21df6`, and the "To Geometry" note in `curves.md` assigns the capture to curves. `POSTER_PENDING` in `src/demonstrationPosterPending.ts` holds 11 ids, all with recipes: `prob-binomial-normal`, `prob-clt`, `prob-summary`, `prob-correlation`, `monotone-partition`, `monotone-triangulation`, `voronoi`, `voronoi-degenerate`, `polynomial-zeros`, `rational-function`, `fourier-coefficients`.
   - Procedure (handler 28 note in `curves.md`; `docs/commands.md` on the preview generator): empty `POSTER_PENDING` and the poster exemptions in `DemonstrationsPage.test.tsx`, then `just build`. Run `just preview 3012` (the script's default port) and `PREVIEW_RECAPTURE_IDS=<the 11 ids> PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 node scripts/capture-demonstration-previews.cjs`.
   - View every image. Report recipe problems in other streams' posters to them in `curves.md` rather than editing their recipes.
   - Commit the posters and manifest, then rewrite the "To Geometry" note as done. Mark PS-C-F6 released once CI is green, and add a line to the probability family row.
2. **Low priority:**
   - P5 line labels: the dashed x-on-y line crosses the y-line label at 1440, and the labels look large at 390;
   - a typed coordinate beyond ±20 is refused silently in its field (shared `NumberInput`);
   - the PS-C-5a2 notice-clear assertion has no mutation evidence;
   - the items carried over from handoff 34 (P4 fence view, pointer drag at the board edge, `importPresetData` render request, CLT legend wording, aria-disabled playback reasons, CltGraph lifecycle tests, P2 visual notes).
3. After the posters, family 4 (probability) is complete. Check `curves.md` for the next family's open work (families 2 and 5 have open batches).

## Lessons for briefs

- Do not pass Python or TS text containing backslashes through a Bash heredoc in this environment; write the script with the Write tool. A heredoc halved `\\(` here.
- Shared count tests (`authoredChapterCoverage`, `guidedExamplePreviewCopy`) collide when two streams add lessons; after a rebase, run `npx vitest run src/learning` before pushing.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-36.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
