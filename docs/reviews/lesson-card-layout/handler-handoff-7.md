# Lesson card layout — handler handoff 7 (2026-11-21)

Read [handoff 1](handler-handoff-1.md) for the owner's objective and scope. This note is the state after handler 7 (Opus 5.5, `high`). No successor was started: the work left in the owner's scope waits for his decision (below). A successor, when the owner starts one, is Opus 5.5 at `high` (`--agent bezeg-handler --model claude-opus-5-5 --effort high`), budget 315k soft and 387k handoff, and tells its successor the same.

Branch `worktree-lesson-card-layout` in `.claude/worktrees/lesson-card-layout`; preview on port 4421 (this stream's; owner previews through `tailscale serve`). Publish with `just publish --background --recipe runtime --base <origin/master> --commits <ids>` (the plain gate refuses this checkout's untracked scratch files; the `tooling` recipe fails on this machine at the `spawn EPERM` test).

## Done by this handler

- Handler 6's publish had stopped at the whitespace gate (a trailing blank line); fixed and published at 78674367. CI on that head failed two phone checks (run 44849231054): the Back and Next check expected no page move on a tap into an observation frame, which c2ac1463 deliberately aligns to the graph. The check now expects the reading-frame tap to keep the row and page and the observation-frame tap to bring the graph and the task into view (70e975e7).
- CI on 72cf3dd9 (run 44852390553) failed two rational lesson rows: the smoke helper read weight labels only with a decimal point, and the new format writes `1{,}38`. The helper and the Farin clip capture's expected text now read the board's format (2bafa36b); the committed Farin clip, recorded as `1.00`, failed the preview provenance smoke on 49fe5d39 (run 44854074695), so its check compares the number instead of the text. **Check `just publish --status` and the CI run of the final head**: at handoff the last publish (the repair and this note) had been started.
- \(B(\tfrac12)\) is placed by the measured box of its fraction (56 by 32 px at 20 px) and the PH and affine label tests measure with the placement's boxes (`evaluationNameBox`, `controlNameBox` in `AbstractJXGPointControlledCurve.ts`). The label crawler has the affine lesson's frames LC-9b to LC-9e. Results are in [the label spec](../../specs/lesson-graph-label-collisions.md#results-2026-11-21).
- The progress live region says "Graf in orodja lahko zdaj uporabljaš." on task cards.
- Rational weights in the number format (`w_1 = 2`, `{,}` comma); one weights switch on the Farin route (it had two); a heading on the Voronoi Edit tab's site buttons; the affine lesson says what \(c\) and \(c'\) mark; a full stop or comma after an inline formula no longer starts a line (`bindTrailingPunctuation` in `src/mathjax/loadMathJax.ts`, for every typeset surface).
- The 11 worker worktrees of handoff 6 are removed (junctions unlinked first).
- "c, c′" for two crosses closer than 12 px is kept: they are the names the separate crosses carry.

## Waiting for the owner

1. **Phone lesson framing.** A phone lesson board (364×295) shows the same coordinate range as the desktop board (875×594), so constructions span 60 to 100 px: drag the track (LC-7, "Tir" on the P1 text), the cross-ratio construction (LC-2, N over D′), the affine curve (LC-9b/d, \(B(\tfrac12)\) on \(p_0\)). Label placement cannot fix this; no spot within reach is free. Options: (a) on boards under about 480 px, fit the scene's view to its visible points (`applyLessonView` in `src/graphs/base/BaseGraph.tsx` with `fitBoundingBox`), keeping the authored view on wider boards; (b) authored phone views per scene; (c) keep the range and accept the crowding. (a) changes how every lesson looks on a phone and may cut off where an animation goes, so it needs his choice before a spec.
2. The phone-navigation handler's question about a short frame ([its note](phone-navigation-handoff.md)).

## Carried, not in this stream

- The Farin chapter text says "vključi stikalo" (`familyChapters.ts` belongs to the bug-crawl handler, handoff 1).
- The crawler (`scripts/lesson-crawl/crawl.cjs`) reads only 1440×900 and the first phone frame.

## For the owner

- The scheduled run of 2026-11-20 (44729645497) failed in three parameterization lessons (samples slider); the later push runs on master passed the full smoke, and so did those lessons in 44849231054, so it did not reproduce.
- The `spawn EPERM` failure of `scripts/commands.test.cjs:82` still blocks `tooling` publishes from this machine.
- Decided without you, reversible: the progress announcement's wording; the Voronoi heading reuses "Gradnja celice s simetralami"; the punctuation binding applies to all typeset text.
