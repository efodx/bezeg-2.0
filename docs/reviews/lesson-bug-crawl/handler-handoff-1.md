# Lesson bug crawl — handler handoff 1 (2026-11-20)

## Objective (owner, this session)

Crawl every lesson with many Haiku subagents and report bugs, then fix as many as possible. Owner requirements:
- Report bugs of every kind, including controls that do nothing (for example ones that depend on another control
  being open) and controls that are visually unpleasant.
- Haiku workers stay under 100k context and end themselves (the budget hook signals HANDOFF to Haiku workers at 78k);
  their replies are at most 5 lines so the handler can run many.
- Owner approved **80 Haiku reviewers** (about 3 examples each).
- Agreed flow: crawl → reviewers → merged, deduplicated triage table → handler reproduces high/medium findings →
  **show the triaged list to the owner before any fixing** → fixes by workers, verified, committed, pushed.
- Scope defaults agreed: desktop Slovenian plus a 390 px phone check on each example's first frame; no judging of
  mathematical correctness by Haiku.

## Setup

- Worktree `.claude/worktrees/lesson-bug-crawl`, branch `worktree-lesson-bug-crawl`, built from `origin/master`
  583ebf61; `node_modules` is a junction to the main checkout (unlink it with PowerShell before removing the worktree).
- Production preview: `just preview 4399` started from this worktree (http://localhost:4399). If it is gone, run
  `just build` then `just preview 4399` in the background.
- Tooling in `scripts/lesson-crawl/` (committed with this note):
  - `crawl.cjs --out <dir> <chapter>...` — walks every `?example=` link on each chapter page (guided lessons and
    activities): per-frame text/math/error/panel-coverage checks, then after Finish an inspector control sweep
    (nudge each control, compare graph and inspector hashes, reload after errors), layout checks, inspector
    screenshots once per route, one mid-lesson screenshot per example, phone check. About 17 s per example.
  - `page-helpers.js` — injected visibility/overlap helpers. `list-chapters.cjs` — 37 chapters, ~210 examples.
  - `show.cjs <dir>/<chapter> [--part k/n]` — reviewer view. `assign.cjs <dir>` — prints new `chapter k/n`
    assignments (about 3 examples each) for chapters whose `summary.json` exists, recording them in `<dir>/assigned.txt`.
  - `merge.cjs <dir> [--min medium]` — merges `findings.jsonl` + `review.jsonl` into one deduplicated table.
  - `REVIEWER-BRIEF.md` — the Haiku reviewer brief. `probe.cjs` — throwaway manual-verification probe.
- Crawl output (not committed): `.crawl-full/<chapter>/` with logs `.crawl-full-{a,b,c,d}.log`. Pilot output in
  `.crawl-pilot/` (Bézier and school-function-graphs, already reviewed; its review lines can be merged too).

## State at handoff

- Full crawl of all 37 chapters started as 4 background processes from handler 1. They may outlive this session or
  be killed with it: check each log for its final `CHAPTER` lines; rerun any missing chapter with
  `node scripts/lesson-crawl/crawl.cjs --out .crawl-full <chapter>...` (run up to 4 processes in parallel).
- Reviewer wave 1 (11 assignments) was launched by handler 1; `assigned.txt` lists them. Chapters assigned:
  analysis 1–3/3, foundations, kinematics 1–2/2, mechanical-curves, sweep-algorithms 1–2/2, triangulations-voronoi 1–2/2.
  Their results land in each chapter's `review.jsonl`; their 5-line replies went to handler 1 and are not needed.
- Remaining: about 70 reviewer assignments. Run `node scripts/lesson-crawl/assign.cjs .crawl-full` once more chapters
  finish, and launch one `bezeg-smoke` agent with `model: haiku` per line, in waves of about 10, with this prompt:
  "Assignment: chapter `<c>`, part `<k/n>`, out directory `.crawl-full`. Read and follow
  `<worktree>\scripts\lesson-crawl\REVIEWER-BRIEF.md` exactly (task, image budget, output file, 5-line final reply).
  Write only to `.crawl-full/<c>/review.jsonl` (append)."

Wave 1 outcome: 10 of 11 reviewers finished (26–38k tokens each); `analysis 1/3` was still running at handoff.
Wave 1 reviewers wrote the shared `review.jsonl` with the Write tool because the worktree guard blocks Bash heredocs,
so a later part may have overwritten an earlier part's lines (risk in analysis, kinematics, sweep-algorithms,
triangulations-voronoi). The brief now has each part write its own `review-<k>of<n>.jsonl`, and `merge.cjs` reads
every `review*.jsonl`. If a chapter's wave 1 lines look incomplete, rerun that part. Leads from wave 1 replies:
legends/readouts cut off by the lesson panel (taylor, mechanical-curves drag-the-track, foundations Bernstein curves —
the crawler measures points/labels, not curves), overlapping labels (segment-intersections, monotone-triangulation),
tangential-normal step 7 formula row clipped past the lesson card, Delaunay panel title truncated, fixed-point panel
without a title, Voronoi buttons dashed/disabled with no visible reason.

## Findings so far (pilot, verified where stated)

- Verified: lesson panel covers control points p₁, p₂ (and B(½) in step 4) on every frame of
  `lesson.bezier-curves.control-points.bezier`. `panel-covers-graph` now fires on most lessons (it is per frame, so
  counts are large); treat it as one systemic layout issue and check how the panel is positioned relative to the board.
- Verified by screenshot: geometric-series graph x-axis runs to 50 for 4 bars; legend "Stolpec: delna vsota" cut off
  behind the lesson panel.
- Unreproduced: JSXGraph polygon exception after "Zmanjšaj število" on /bezeg-2.0/bezier/curve after the lesson plus
  earlier sweep edits (fresh route does not throw).
- Haiku false-positive marks are unreliable: verify, never accept them blindly.
- Crawler limits: `control-inspector-only` is a weak lead (display toggles that only change after playback, etc.);
  `control-unusable` locator timeouts on point fields of /bezier/subdivision-2 may be a crawler artefact.

## Next steps

1. Finish the crawl and the remaining reviewer waves (owner budget: 80 reviewers in total).
2. `node scripts/lesson-crawl/merge.cjs .crawl-full --min medium > .crawl-full/triage.md` (also merge `.crawl-pilot`).
3. Reproduce high/medium groups with `probe.cjs` or Playwright, drop false positives, group by root cause.
4. Publish the triaged list to the owner and wait for their go-ahead before fixing.
