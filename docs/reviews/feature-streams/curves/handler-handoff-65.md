# Curves stream: handler handoff 65

Handler 65 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during AB-B-4's `just check`. It replaces [handoff 64](handler-handoff-64.md).

## State

- **On `origin/master`:** everything through this note. **Batch B:** AB-B-1 to AB-B-4 done. `bezier-clipping` has its lesson and its section in the `advanced-bezier` chapter. Its poster and chapter card are pending.
- The worktree is clean. `origin/curves-ab-b-3-wip` is now obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 9.7 GB free when last read; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `0910a75d`, `eb884976` | AB-B-3: lesson, tests, record | [Record](../../advanced-bezier/ab-b-3-lesson.md). `just check` passed: 11 089 tests, build. Run 42185292642 passed |
| `b82b6237` | AB-B-4: chapter section | [Record](../../advanced-bezier/ab-b-4-chapter.md). `just check` passed: 11 090 tests, build. **Hosted CI not yet read** |

Handoff 64's two questions are closed. The lesson text and test state the real shape of the tangent run. The review traced why the result misses \(t=\tfrac12\): nothing can be discarded within \(|\delta|<5\cdot10^{-7}\) under the keep margin. The table's six decimals stay, because the lesson says the row is rounded. No graph or kernel change.

## Next steps, in order

1. **Read hosted CI** for `b82b6237` and for this note's push. A failure comes first.
2. **AB-B-5, card and poster,** on the templates `1e4c69d9` and `36090c34` ([record](../../advanced-bezier/ab-a-5-media.md)). What it must touch:
   - `advancedBezierExpectedFor` in `scripts/generate-guided-example-inventory.cjs` asserts on any other id, so add a `.bezier-clipping` branch with authored `expected` checks, and its test.
   - Regenerate the family: `--chapter advanced-bezier`, then capture with `--family advanced-bezier`. Run the whole family: the capture refuses `PREVIEW_EXAMPLE_IDS` after a build change. Compare manifests as JSON.
   - `advancedBezierPreviewCopy.ts`; in `guidedExamplePreviews.test.ts`, move the id from `pending` to `ids` and add its count row.
   - Poster: `PREVIEW_RECAPTURE_IDS=bezier-clipping`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1`, `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`, with `PREVIEW_FFMPEG` and `PREVIEW_FFPROBE`. The recipe at `scripts/demonstration-preview-recipes.cjs:21` has never run: look at the picture. Empty `POSTER_PENDING`; add the asset to `demonstrationPreviewAssets.ts`.
3. **AB-B-6, the Batch B gate,** on the [AB-A-6 gate](../../advanced-bezier/ab-a-6-gate.md). It needs a browser view of the chapter page with four cards, and may cite the [drag note](../../advanced-bezier/ab-b-2b-perf.md#handler-reading-curves-handler-64) with its limit. Walk the Play instruction of lesson steps 5 and 6 in the browser: only the code was read.
4. The rest of Batch C.
5. The low-priority list, unchanged from [handoff 61](handler-handoff-61.md#next-steps-in-order) step 4.

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner).

## Risks and notes

Handoffs 61 to 64's "Risks and notes" still apply, and those they inherit.

- **Handoff 64's "11 905 tests" was a typo,** repeated in the delegation log. The AB-A-6 gate had 11 015; today's 11 090 is steady growth. Compare test totals with the last gate, not that figure.
- **`just check` now takes about 25 minutes,** past the 10-minute foreground limit. Run it in the background.
- **`just smoke-lesson` refuses a stale build,** and a wrapper that ends in `tail` reports exit 0. Print `$?` and read the last line.
- **The Bash tool can collapse doubled backslashes.** A lesson string edit through a heredoc or `sed` silently matched nothing; one mutation "passed" for that reason. Write the script with the Write tool, and confirm a mutation applied before reading its result.
- **A prerequisite link must point to an earlier chapter.** `convexity-hulls` comes after `advanced-bezier`, and the chapter test refused the link.
- **A reviewer found what tests and the walk could not:** a tolerance change resets the run to step 0, so a prompt that says "choose a tolerance and compare" reads clip count 0. Check such prompts in later lessons.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-65.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
