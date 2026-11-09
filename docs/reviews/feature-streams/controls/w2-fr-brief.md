# Wave 2 review: functions sweep, engineering (and mathematical meaning)

`bezeg-reviewer`, read-only. Do not edit files. Report findings with `file:line`, severity (high, medium, low) and the expected behaviour.

**Diff:** the uncommitted working tree in `.claude/worktrees/stream-controls` under `src/graphs/functions/**` and the function keys in `src/localization/sl.ts`/`en.ts`, plus the committed `FunctionStatus.tsx` (`git show bf77d72e`). Start with `git diff --stat -- src/graphs/functions`, then read the diff by file. Ignore `src/graphs/curves/**` and `src/graphs/base/**` (reviewed separately).

**Sources:** slice briefs `w2-fc-common-brief.md`, `w2-f1-brief.md`, `w2-f2-brief.md`, `w2-f3-brief.md`; evidence `w2-f1.md`, `w2-f2.md`, `w2-f3.md` (all in `docs/reviews/feature-streams/controls/`); spec `docs/specs/shared-graph-controls.md` sections *Owner decisions* and *Delegated decisions* (decisions 3, 7, 8, 13, 14, 17, 18).

**Check:**
1. Refusals: every model refusal reaches the graph's one `RefusalChannel` through `guard`, shown alone and cleared on the next accepted edit; typed-field checks stay in the field hint (decision 14). Flag any refusal shown twice (field hint and graph notice for the same event; F2 reported one on UniformConvergence) and say which place is right.
2. Announcements: one live region per graph (`FunctionStatus` or `LiveReadout`), muted while a run plays where the graph has Play; no leftover `role="status"`/`aria-live` on visible groups.
3. Unavailable controls state their reason (decision 13); no new native `disabled` except the known `OnOffSwitch` gaps (Runge semicircle).
4. Removed Resets and fit-view buttons: the host Reset and host Fit give what the removed controls gave (FunctionInverse, FunctionTransformation, PolynomialZeros, RationalFunction; Binomial and Density `fitView`; FourierSeries "whole view").
5. Mathematical meaning: same evaluations and constructions. Look hard at Correlation and Summary statistics drags (now clamp at the limit instead of revert + notice: decision 3 says a drag stops at the limit), Epicycle Shift+arrow now snapping to the 0,05 grid (F2 evidence), Darboux `n` and the zero-list `dragEdit` path. A Preset or lesson action that was valid at HEAD must still be accepted.
6. Tests: each migrated graph has a thin wiring check; no duplicate control-mechanics cases left; weak assertions (a query that always matches, `not.toContain` alone).
7. Localization: `sl.ts`/`en.ts` in lockstep for the function keys; no orphaned or missing keys; new Slovenian terms sensible.

**Checks you may run:** `just unit <paths>`, `just typecheck`, `just lint <paths>`. Log to `.command-logs/w2-fr-*.log`.

**Return:** at most 400 words, findings ordered by severity; full list in `docs/reviews/feature-streams/controls/w2-fr.md`.
