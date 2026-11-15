# B10 brief (handoff-v13): patch piece-symbol overlap (G03, G04)

**Role.** `bezeg-worker`, worker A of the batch (graph change and unit tests; no captures). Edit only the owned paths. Do not run git commands that move HEAD, do not commit, never push. Scratch in `.command-logs/`, never `/tmp`. Do not build and do not touch the preview on port 4333.

**Goal.** Spec `docs/specs/site-walkthrough-graphs-and-captures.md` rows `patch-subdivision` and `patch-joins` (lines 108-109): "Keep: piece symbols. They overlap at card size; fix the overlap in the patches batch." Triage (`docs/reviews/site-walkthrough/graphs/blocker-triage.md:220`): surface captures do not pass `presentBoard`, so the fix is in the surface graph's own label placement, and surface text otherwise stays as is.

Current posters (read them with the Read tool): `src/images/demonstrations/catalog/patch-subdivision.png` (the `S(u,v)` label sits on the dome over the marked point and the second piece symbol is missing or hidden behind the first: only `S_L` is visible), `src/images/demonstrations/catalog/patch-joins.png` (the two cross-boundary symbols overlap each other into an unreadable `S_B` / `S_{B,u}` stack next to `S(u,v)`). Live routes on the preview: `http://127.0.0.1:4333/bezeg-2.0/patches/subdivision`, `/patches/joins` (you may open them read-only with Playwright to see the labels at a 720×440 graph and at the desktop default; scripts in `.command-logs/`).

Find where these labels are placed (start: search `src/graphs/` and `src/patches/` or similar for the surface workspaces "subdivision" and "joins" and their label/LaTeX strings; the 3-D label layer is shared, so prefer a fix local to these two workspaces or a general screen-space separation rule in the shared label layer, whichever is smaller and keeps the other five `patch-*` workspaces unchanged). Acceptance:

- A. In both workspaces at the default scene, every piece symbol is drawn, and no two labels' screen boxes intersect, with each other or with the label of the marked surface point, at the capture size 720×440 and at the default desktop graph size. Check with a unit test against the placement function (screen-space boxes), and show it fails before your change (report the failing assertion).
- B. Each label stays attached to its object: a piece symbol is placed on or next to its own piece (state the rule, e.g. at the piece's centre projected, nudged along a fixed screen direction), not at an arbitrary corner.
- C. The other `patch-*` workspaces (`tensor`, `decasteljau`, `derivatives`, `triangular`, `coons`) are unchanged: existing tests for them pass untouched.
- D. Run the narrowest checks: the vitest files you touch and the surface label tests, through `just` (see `just --list` and `docs/commands.md`; never bare `npx vitest`), plus `npx tsc --noEmit --pretty false`. Report the commands and the result lines.

**Owned paths.** The label placement source you identify and its test file(s); `docs/reviews/site-walkthrough/graphs/b10/`. Nothing in `scripts/` and no capture outputs. If the fix needs a localization string change, stop and report instead.

**Return.** ≤250 words: cause, change with `file:line`, rule chosen, the observed pre-change failure, check results, anything left. Fuller note to `docs/reviews/site-walkthrough/graphs/b10/worker.md`. On `BUDGET HANDOFF`, stop and write that note.
