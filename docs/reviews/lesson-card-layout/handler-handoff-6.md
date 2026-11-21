# Lesson card layout — handler handoff 6 (2026-11-21)

Read [handoff 1](handler-handoff-1.md) for the owner's objective and scope. This note is the state after handler 6 (Opus 5.5, `high`), which stopped at its soft budget after publishing. Successors: Opus 5.5 at `high` (`--agent bezeg-handler --model claude-opus-5-5 --effort high`), budget 315k soft and 387k handoff; each tells its successor the same.

Branch `worktree-lesson-card-layout` in `.claude/worktrees/lesson-card-layout`; preview on port 4421 (this stream's; owner previews through `tailscale serve`). Workers: `bezeg-worker` Sonnet `medium` with `isolation: worktree`, first steps `git reset --hard <head>` and the `node_modules` junction (`cmd //c "mklink /J node_modules C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\node_modules"`).

## Owner requests of this session

- "can we make it easier to 'dock' back to its starting place?" The owner chose all three aids offered (snap near home, double-click, a return button). Done: 23b29170 and the outline contrast in the phone commit; spec: the last section of [the panel spec](../../specs/lesson-panel-visual-refinement.md).
- An independent walkthrough of the affine lesson, with "the ones you agree with, do fix". The handler agreed with all three; [spec](../../specs/affine-lesson-practice.md). Done: observation frames are task cards above live tools; the affine graph shows the original curve, the centres c/c′ and \(T(B(t))\) beside \(B_T(t)\).

## Published by this handler

The label collision slice LC-1…LC-9 ([spec, with results](../../specs/lesson-graph-label-collisions.md#results-2026-11-21)), docking, task cards, the affine comparison, reviews' fixes, the evaluation entry. Published with `just publish --background --recipe runtime`; **check `just publish --status` and `just ci <head>`** — at handoff the publish had been started, not finished.

Checks at the final head: `check-changed` (one stale workspace test moved to the new contract afterwards and rerun alone with the affine tests; not a full rerun), typecheck, lint, label measurement three ways (lesson 0/18 from 31/64, routes 1/26 from 10/44, phone 23/56 from 84/88), H's full guided-lesson and lesson-graph-access smoke (before G2's affine commits and the last phone alignment), a Haiku route smoke (weak harness: it could not find most reset controls; its one real finding, an affine page error, was fixed in 490002e0).

## Remaining steps, in order

1. Confirm the publish and CI (above). If the runtime gate failed, repair from its log.
2. Phone \(B(\tfrac12)\) on \(p_2\)/\(p_3\) in the affine and PH lessons at 390×844: the measured 54×32 box of the fraction places it, but `src/graphs/curves/ph/PhQuinticEvaluationLabels.test.tsx` measures with the written-out `nameBox('B(1/2)')`; decide (handler) to place by the measured box and make the test measure the rendered label, then check the PH lesson frames (13fceb12 reverted dee9bee6's size change for this).
3. Smaller items from the reviews: announce in the progress live region that the tools are live on an observation frame (new strings); LC-7 phone "Tir" on the P1 text; LC-2 "N" beside "D′"; the affine pair of crosses under 12 px is named "c, c′" (check wording).
4. A full smoke of the lesson runtime on the final head (`just smoke` or the suites H ran) since G2's commits and the phone alignment came after H's run.
5. Remove the worker worktrees and branches (unlink each `node_modules` junction first with PowerShell `(Get-Item node_modules).Delete()`): `agent-ad2ae06e6ade79413`, `agent-ab69b6132bc5c4ac8` (locked), `agent-a983953a35c8c28d4`, `agent-a4e292567bfe621d6`, `agent-ae9382a7bfbba353d`, `agent-aa0aea89f1313ea94`, `agent-a3960ba556e0ae91d`, `agent-ababb30d1a45d0177`, `agent-a31e822002144d10c`, `agent-a3f3c4a63d4ae1d46`, `agent-ae39df246ac5b11a9`.

## Open

- Waiting for the owner, not to be started: the phone-navigation handler's question about a short frame ([its note](phone-navigation-handoff.md)). The hidden-tools wording question of handoffs 2–4 is partly answered by the task card (tools are beside every observation frame); reading frames still hide them without saying so.
- Carried: a full stop wrapping alone after an inline formula; the crawler reads only 1440×900 and the first phone frame; the Voronoi Edit tab's first group has no heading; the Farin chapter text says "vključi stikalo"; rational weights written "1.00" with a decimal point (LC-1d).

## For the owner

- The scheduled run of 2026-11-20 11:41 UTC (44729645497) failed; outside this stream.
- The `spawn EPERM` failure of `scripts/commands.test.cjs:82` still blocks `tooling` publishes from this machine.
- Decided without you, reversible: observation frames keep the card above the tools instead of a "Try it" button; the Slovenian term "prvotna krivulja" for the original curve; a moved card is stacked above the graph (fixes presses hiding it).
