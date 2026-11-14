# State: site walkthrough, graphs (package D)

Handler 2, 2026-11-14. Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/

- Before and after of the four changed captures: http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/index.html
- Epicycles (G07): `/analysis/epicycles`, "Obris Slovenije", "Mačka" (the new kitten, approved), "Bezgov cvet".
- Envelope (G02): `/curve-geometry/envelope`, family blue to teal, current line and touching point in rust red (your pick B).
- Convexity (G06): the catalog card now sweeps smoothly, leaving the interval once as the lesson asks.

**Nothing waits on you now.** The next thing you will be asked to look at is each family batch (B1 to B8) on the preview.

**Decided by you on 2026-11-14:** the capture-text rule (with `r` kept on the correlation card), the three pilot directions, Literata for graph text, the convexity sweep, the kitten, rust red for the envelope's current line (amber and dark ink rejected).

## Where things stand

Publishing: the branch was rebased onto `origin/master` (`063bdec3`) and a background publish of every branch commit (pilot, capture fixes, envelope colours, epicycles outlines, Literata, correlation label fix, convexity sweep, kitten, rust envelope) was started with `just publish --background --recipe runtime` (run `publish-c32e7d7a-b1a793`). **Check `just publish --status` first.** If it failed, read its log, fix, and republish; until it passes nothing of this package is on `master` beyond the spec.

Verified before publishing: `just check-changed` passed on the pre-rebase tip (2331 s); `just tooling-test` passed; full `just lint` passed; two browser passes (record: `typography/smoke-h2.md`; screenshots in `.command-logs/h2-smoke/`, `h2-smoke2/`, `h2-fix/`): ten of eleven families showed plain text in Literata and the eleventh (hidden surface readouts) was fixed; epicycles outlines without control polygon; inspector at 310 px; preset round trip; SVG and PNG export; catalog cards load and play; correlation label clear at 390 px and desktop.

Not verified: the epicycles arm moving after "Predvajaj" was not isolated in the recheck (frames differed, cause not separated); no drag or slider interaction was exercised in the browser; after the rebase only the gate's own checks cover the merge with master.

Open small items:
- Exported envelope PNG shows "Število premic: 16 ." with a stray space the page does not show.
- `/curve-geometry/envelope`: the label of `p1` sits on the family lines at the origin; `/compgeo/delaunay`: `P1`, `P4` labels touch edges (point labels are M01, the polish session's).
- `/functions/exponential` caret text (recorded in the spec as a separate defect).
- 68 fixed `fontSize` literals listed in `typography/worker.md`.

## Capture facts learned (use these)

- `just clip <id>` takes one id and fails validation while any other changed recipe or removed legacy spec is stale. Recapture changed ids together: `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_IDS=a,b,c node scripts/capture-demonstration-previews.cjs`. Add `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` only when the capture tool's presentation code changed and you have read that diff.
- A capture run rewrites the whole manifest and asset map in registration order; a large diff there is reordering. Compare by capture id, not by line.
- `just preview` does not build: run `just build` on a clean `src/` first, stop the old server by PID (`netstat -ano | grep "127.0.0.1:4333 "`), then `just preview 4333`. A rebuild removes `build/walkthrough-graphs/`: copy `docs/reviews/site-walkthrough/graphs/pilot/{index.html,before,after}` and `accent/` back into it.
- Linting a subset of paths fails on unused suppressions; run the full `just lint`. When a recorded violation disappears, remove only that entry from `eslint-suppressions.json`.
- The graph palette has `emphasis` (rust red) for the one element a cool family is read against; the owner dislikes amber and near-black against blue.

## Next slice inputs, in order

1. **Confirm the publish** (`just publish --status`), then `just ci` for the deploy.
2. **Blocker triage** over all 118 captures with the text policy applied, written to `docs/reviews/site-walkthrough/graphs/blocker-triage.md` (spec, "Batches", row T): per capture, the text verdict, whether its row or legacy spec still passes, what the frame loses, what blocks it; list which of the remaining legacy held-state clips can become sweeps (G06) and which stay discrete with the reason.
3. **Batches B1 to B8** (spec, "Batches"), file-disjoint, two workers at a time. Each batch: style changes on the graph, recipes and rows, recapture its ids together, before and after on the preview page, batch record in the spec, then show the owner. Acceptance 5 to 9 of the spec apply to every changed graph.
4. **Epicycles card (G07-f, batch B9):** recipe and row with an outline as the subject.
5. Later pass: the `fontSize` literals.

Worker notes: `pilot/`, `g07/`, `typography/`, `c5/`, `accent/` in this folder.

## Rules that carry over

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. When a colour or drawing is rejected, show several candidates side by side instead of a second single guess. Do not launch a successor while the work only waits on the owner.
- Port 4333 only. Previews for the owner go through `tailscale serve` (already configured for 4333). Do not edit inspector panel composition (control choice owns it) or other sessions' files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`; a worker that must serve while another edits uses `SMOKE_PORT=<port> node scripts/serve-smoke-build.cjs`.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
- Rebasing onto `origin/master`: `docs/agent-workflow/evaluation-log.md` and this session's docs already on master conflict mechanically; keep master's side, then rewrite this note. `scripts/commands.cjs` conflicts where both sides add test files to the `tooling-test` list: keep both.
