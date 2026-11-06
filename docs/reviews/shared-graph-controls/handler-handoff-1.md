# Shared graph controls: handler handoff 1

Written 2026-11-07 at the context threshold. Branch `worktree-shared-controls-spec`, worktree `.claude/worktrees/shared-controls-spec`, not on `master` until the owner confirms the catalogue. Spec: [shared graph controls](../../specs/shared-graph-controls.md).

## State

- The owner approved all panels and confirmed decisions 1-5 (in the spec). Rule: one capability, one control; a special control is a last resort with a recorded reason.
- Phone playback is approved. The "stream closeout next steps" session was asked to hold it until this scope is confirmed; it follows the playback control in the spec's order.
- Lesson-authoring workstream 5 is approved once current work and scope are settled.
- The 36 stale remote branches are deleted. Local backups of the 20 unmerged ones are in `refs/archive/` in the main checkout.
- Audit 2 is complete and partial: `audit-2-*.md` here, five angles (readouts, board, logic and lesson commands, unread panels, wording and layout). Nothing in it is verified by the handler yet.

## Next, in order

1. Read the five reports. Spot-check the main claims against source: round 1 had a false finding (no Reset), a misread (`ValueListInput`) and wrong line numbers, so do not trust rows unchecked. Row 18 of the wording report conflicts with round 1 on `Select.tsx`.
2. Add the verified patterns to the spec catalogue as C16 onward, merging duplicates. Likely groups: keyboard and arrow steps, snap and drag limits, refit after edit, Fit and view Reset, live announcements, notice storage, refusal guards, playback wrappers, mode chooser, degree chooser, shared labels and keys, number formats. Add lesson add commands without coordinates (Interpolation, Hermite, Correlation) to C1.
3. List the new patterns to the owner and ask for confirmation, as was done for C1-C15. Show any new decisions with a recommendation.
4. After confirmation: push the spec to `master`, write the task files, and add a `controls` stream under the repo-driven supervisor.

Do not start implementation before the owner confirms.
