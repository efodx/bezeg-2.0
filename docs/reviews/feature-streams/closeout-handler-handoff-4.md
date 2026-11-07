# Stream closeout: handler handoff 4

Written 2026-11-07 by the closeout handler (Opus 5.5, auto) at the end of the Remaining list in [handoff 3](closeout-handler-handoff-3.md). Spec: [stream closeout](../../specs/stream-closeout.md). No successor was started: the list is finished and the context budget was not reached.

## State

All branch work is on `master` and deployed from `39084ff0`: 37 example cards in seven chapters. The evaluation entry is recorded.

The seven manifests name `6544c99d`, the clean commit they were captured from. Rebasing gave it the hash `c8c76109` on `master`, and `6544c99d` stays reachable through `origin/worktree-stream-closeout`, which was fast-forwarded for that reason. **Deleting that branch leaves the manifests naming an unreachable commit.** Nothing reads the value beyond a shape check, and `patches` already records a revision that is not on `master`.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `a0e64e1c` tree, before docs-only rebases | Passed: 609 files, 11158 tests |
| CI, including deploy | `39084ff0` | Passed |
| Recapture, 37 PNG hashes | `6544c99d` | Byte-identical |
| Browser, 37 cards in sl and en | Build of `a0e64e1c`, same app code as `39084ff0` | 74 of 74 images match the committed PNG, 74 alts clean, 37 of 37 cards open a board, no console or page errors |

Not covered: interaction on the opened boards, and phone width beyond the sweep chapter.

## What went wrong

`d01a221a` reached `master` with a failing unit test: `mathAltText` had no entry for `\theta`, used by the inversion alt. CI failed and skipped the deploy, so the live site never had that commit. `39084ff0` fixed it. Handoff 3 ordered `just check` after the push; run it before pushing to `master`, even at about 20 minutes cold.

## Not done

Optional cleanups from handoff 1, item 4, deferred by decision. The decimal commas change the text of six lessons and need their own checks and smoke; the five unreferenced worked examples are not named and must be identified first. Neither belongs to this spec's acceptance.

## For the owner

- Delete `origin/worktree-stream-closeout` only if the manifests may name an unreachable commit, or after a later recapture.
- Remove the worktree when wanted: delete its `node_modules` junction first.
- Handoff 3's owner items are unchanged, including "4 oglišč" on the subdivision scene, and the script test files that run in no recipe or workflow.
- `triangle-geometry` and `interpolation` recorded `sourceStateDirty: false` with uncommitted work because the flag ignores `scripts/`. All seven are now truly clean, but the flag still has that limit.
- From PowerShell, `python` resolves to `~/bin/python`, which exited silently without running a script. It works from Bash.
