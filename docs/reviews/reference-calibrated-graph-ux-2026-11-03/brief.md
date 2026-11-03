# Reference-calibrated graph visual review

Findings only. Owner request: “How could I make you spot problems like these. Spawn subagents and make them find stuff like these.” This follows two visual audits that did not capture the owner's standard. Estimated task size **L**, review/browser work, recorded before dispatch. Original task start: 2026-11-03 20:41:59 UTC; successor opened after the preceding handler reached its context boundary.

## Calibration each reviewer must view first

These are unchanged owner attachments, not newly generated evidence:

1. [Polygon area](references/polygon-area-invisible-triangles.png): the component triangles cannot be distinguished inside the continuous pale green polygon. Confirm the construction's enabled state; finding objects in SVG/source is not proof that a learner can see them.
2. [Interval sweep card](references/interval-sweep-heavy-highlight.png): thick dark brown/olive strokes around green intervals look harsh and muddy. Readability and brand consistency do not establish attractive highlighting. The previous audit wrongly praised this as a strong reference.
3. [Segment intersections card](references/segment-intersections-heavy-highlight.png): the same heavy layered-stroke treatment forms muddy ribbons. Judge color, width, caps/joins, overlapping strokes, and their relation to resting lines. This arrangement is distinct from the earlier terminal coincident-event capture.

Do not mechanically reject all brown or thick strokes. Find observable matches to these failures and explain why they matter at the rendered size. Do not inflate counts with known reference cases or the already reported terminal-intersection knot.

## Frozen scope and useful evidence

- Same 45 finalized lessons in [the original scope](../recent-graph-ux-2026-11-03/scope.md#included-routes-45), plus all 45 corresponding catalog card previews at their native display size. Preserve exclusions; no rolling-window re-derivation.
- Stable checkout `C:/Users/1337Hacker/Desktop/bezeg-2.0`, HEAD `27f6ac07`, app build recorded as `d2a3b6465f541c687811692f4ae1b3f720483141`, immutable output `.command-logs/graph-ux-audit-2026-11-03/build`. Later commits are audit documents. Existing build provenance reports `dirty: true`; do not describe it as a clean-source build.
- Current unrelated files `.claude/jobs/` and `debug.log` are preserved. Do not change application sources, dependencies, shared evidence, or earlier reports.
- Existing opening/middle/final lesson captures and contact sheets: `docs/reviews/graph-aesthetics-2026-11-03/evidence/{geometry,functions,curves}/`. Full scratch captures/manifests/scripts: `.command-logs/graph-aesthetic-review-2026-11-03/{geometry,functions,curves}/`. Geometry `capture.cjs`, functions `lesson_walk.cjs`, curves `capture-scenes.cjs` contain route maps and actual Slovenian navigation. Locate filenames before reading. Reuse broad evidence; do not repeat 45 full walks.
- Contact sheets are for screening. Open full-size evidence and reproduce targeted states when geometry or enabled controls are uncertain. Main board is **`#jgbox > svg`**, not the first SVG on the page. Wait for a substantive initialized board. Do not miscapture toolbar icons.
- For catalog previews inspect actual rendered media and record card/media dimensions, asset URL, static versus hover state. Contact sheets may preserve native-size crops without scaling; enlarged assets alone do not satisfy native-size review.
- PRODUCT.md establishes educational visibility and classroom projection; DESIGN.md explicitly keeps graph colors separate from shell tokens. Impeccable context/detector setup already failed in this session; do not repair tooling or install anything. This is a focused calibrated visual review, not a new full heuristic audit.

## Independent assignments and ownership

All use fresh `gpt-6-luna`, `max`, handoff-v12, no inherited conversation, no further delegation, commits or pushes. Each owns only its report, evidence subfolder, and local scratch subfolder under this task. Handler owns consolidation, acceptance, process cleanup and Git. Independent reviews must not read each other's reports before submitting initial judgments.

| Worker | Concern across all 45 | Owned report/evidence | Dedicated preview |
| --- | --- | --- | --- |
| construction-visibility | Invisible or indistinguishable enabled construction parts; compare lesson claims to visible geometry | `visibility.md`, `evidence/visibility/` | `http://127.0.0.1:4323/bezeg-2.0/` |
| active-highlights | Harsh active/highlight colors, widths and layered strokes in lesson scenes; resting versus active comparison | `highlights.md`, `evidence/highlights/` | `http://127.0.0.1:4324/bezeg-2.0/` |
| native-card-previews | All 45 catalog posters at actual display size; targeted hover clips where relevant; both concerns | `previews.md`, `evidence/previews/` | `http://127.0.0.1:4325/bezeg-2.0/` |

Previews are handler-owned, started hidden at 20:46:13 UTC; all returned HTTP 200. PID/outDir ownership is recorded at `.command-logs/reference-calibrated-graph-ux-2026-11-03/preview-processes.json`. Workers first confirm Playwright reachability using their assigned port. Run browser/loopback tools with `require_escalated` from first attempt. If access fails, report it promptly before repeated setup. Browser tool availability is Playwright through `@playwright/test`; no worker in-app browser. Close your own browser and capture scripts before returning; do not stop the shared handler-owned previews.

## Acceptance and return contract

1. View all three references and state how they alter your evaluation standard.
2. Keep a 45-row screening inventory (may be a compact table with grouped evidence) specifying scene or native card evidence actually seen, candidates, and gaps. A file's existence is not visual inspection.
3. For each retained match provide exact route/card ID, state/control/frame recipe, screenshot link, object role, specific visible failure, confidence, and a direction that preserves mathematical meaning. Separate missing visible construction from subjective aesthetic severity. Distinguish owner-confirmed, previously reported, and newly found instances. No finding quota.
4. Verify strongest candidates at full size or in the running app; do not call an intentional mathematical coincidence a rendering defect. Record controls/lesson state when reproducing construction visibility. Keep native-size card evidence.
5. Report meaningful limits. No fixes, source edits, full tests/build, generic shell critique or repeated complete lesson walks.

Reply in **at most 450 words** with strongest findings, coverage and gaps; bulky inventory/evidence belongs in your owned report. Write scripts/logs under `.command-logs/reference-calibrated-graph-ux-2026-11-03/<worker>/`. Aim to finish in about 20 worker turns and 15 minutes; if acceptance needs more, return a bounded partial. On handler `HANDOFF`, or after about 30 turns, stop at a consistent point and write `<worker>-handoff.md` here with work/evidence completed, remaining acceptance, touched files, commands and live processes. Do not take another slice. Handler budget watchers signal at 135k input toward 150k worker budgets.

## Handler verification

Directly inspect primary evidence, reproduce representative additional matches against the frozen app, reconcile overlap and known cases, and state actual coverage. Correct the earlier interval-sweep praise and polygon-area severity. Validate task-local Markdown links and image decodes; preserve unchanged owner references. No app code is changed. Stop only newly owned previews after command-line/PID verification. Record the current task's delegation outcome with `subagent-flow-evaluation do-log`, then commit/push the documents under AGENTS.md.

## Dispatch evidence

Each dispatch requested `gpt-6-luna`, `max`, `fork_turns: none`. Runtime-resolved settings were not exposed by dispatch. The three concerns are independent and have disjoint report/evidence ownership. No initial findings are shared among workers.

| Canonical worker path | Observed dispatch boundary (UTC) | Budget watcher session |
| --- | --- | --- |
| `/root/construction_visibility` | 20:47:01–20:47:28 | 40209 |
| `/root/active_highlights` | 20:47:28–20:47:55 | 24930 |
| `/root/native_card_previews` | 20:47:55–20:48:25 | 46188 |

The successor's first self snapshot observed 31,189 request-input tokens; the pre-dispatch boundary observed 63,122, both below 150k. The predecessor's opening snapshot was 156,233, triggering the fresh-chat handoff before any review dispatch. A source-input diff from the recorded build revision to HEAD was empty for app sources, scripts, package files and Vite configuration.

Questions skipped: the owner requested findings only and already authorized the subagent review.
