# Writer-config previews

Each writer config's four lesson drafts (`../drafts/w-X/`) were ported into the real lesson sources on a preview-only local branch, so the owner can judge them on the running site. These branches must never be merged or pushed to `master`.

| Port | Config | Branch / worktree | Local commit |
| --- | --- | --- | --- |
| 4400 | r0 (current master) | `preview-r0` | `faac4988` |
| 4401 | w-a | `preview-w-a` | `7be51c3e` |
| 4402 | w-b | `preview-w-b` | `c6672f87` |
| 4403 | w-c | `preview-w-c` | `dbef2e39` |
| 4404 | w-d | `preview-w-d` | `02c7aba0` |
| 4405 | w-e | `preview-w-e` | `d7a6d371` |

The preview branches are local only (not pushed).

Worktrees: `.claude/worktrees/preview-<config>`, all from `origin/master` at `faac4988`. Serve one with `just build` then `just preview <port>` in its worktree.

Lesson routes (append to `http://127.0.0.1:<port>/bezeg-2.0/`):

- bezier-pilot: `bezier/curve?learn=1`
- subdivision-guided: `bezier/subdivision-2?learn=1`
- curve-curvature-guided: `curve-geometry/curvature?learn=1`
- polynomial-zeros-guided: `functions/polynomial-zeros?learn=1`

## Verification (2026-11-09)

- All 24 lesson URLs (six ports × four lessons) return 200, and each config's build contains its own draft's bezier title.
- A Playwright load check (Haiku `bezeg-smoke`, then a handler rerun for the chapter routes) opened all 20 ported lessons at 1440×900 and clicked Naprej through to the end: every lesson completed, with 0 page errors, 0 console errors and a non-empty board on the first and last frame. Chapter-owned lessons (curvature, polynomial zeros) open in the chapter panel ("Nazaj v poglavje"), which has no `#guided-lesson-title`; the first check waited for that heading and timed out on r0 as well, so it was a selector issue, not a port defect.
- Not checked: visual review of each frame, scene correctness against each draft's "Na grafu" lines (the deviation notes list what workers could not match), touch and narrow layouts.

## How the ports were made

- [port-brief.md](port-brief.md): one `bezeg-worker` (Sonnet medium) per config and lesson, transcribing faithfully. Writers' known blockers were not fixed.
- Uniform mapping: the draft's Uvod becomes the lesson `summary` (shown on step 1, frame 1). English fields copy the Slovenian text, because the drafts are Slovenian only; the w-e bezier port translated them instead, which does not affect the Slovenian site.
- Deviations are logged per config and lesson in `w-X-<lesson>.md`. Recurring runtime limits: one frame title per step (frame titles show the step title), no free body text on calculation frames, and the runtime's own completion screen instead of the draft's "Konec" text.
- Pinned tests (decision 2026-11-09): unit assertions that pin the old step ids, prose, worked examples or English≠Slovenian fail on these branches and were left unedited, since the branches never reach master and the build does not run tests. `tsc`, `lessonMathNotation.test.ts` and `just build` pass in every preview worktree.
