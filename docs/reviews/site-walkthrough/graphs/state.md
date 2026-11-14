# State: site walkthrough, graphs (package D)

Handler 1 handing off to handler 2, 2026-11-14. Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/

- **Epicycles subjects (G07):** `/analysis/epicycles`, choose "Obris Slovenije", "Mačka" or "Bezgov cvet" under "Primer". The cat is an original silhouette, not the mockup's: the mockup traced an emoji from a system font, which cannot be shipped. **Is this cat good enough, or do you want a different drawing?** The treble clef is not added, for the same reason: no freely licensed outline is at hand.
- **Graph text in Literata (G01):** every graph on the preview. Compare `/ph/cubic`, `/curve-geometry/envelope` or `/compgeo/delaunay` with the public site.
- **Envelope colours:** `/curve-geometry/envelope`. The line family shades from blue to teal; the current line and its touching point are amber.
- **Pilot before and after:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/index.html (the "after" clips there predate the envelope colours and Literata).

None of this is on the public site yet: it has been built and unit-tested but not looked at across graph families in a browser, which the next handler does before publishing.

**Approved by you on 2026-11-14:** the capture-text rule (with `r` kept on the correlation card), the three pilot directions with leave to refine colours, Literata for graph text, and the convexity clip as a smooth sweep.

## Where things stand

On `master`: the spec and this note only. On branch `worktree-walkthrough-graphs`, unpublished, oldest first:

| Commit | Content | Verified | Still owed before publishing |
| --- | --- | --- | --- |
| `f92d765d`, `58037e7f`, `a93910a4` | Pilot: capture-text capability C1, envelope window, subdivision and correlation styling, trial media | Unit tests, typecheck, lint, tooling tests, browser pass of both routes in both languages | Real `just clip` of the three ids; export check |
| `79ec6207`, `68cac7e4` | Docs (pilot record, approval, G07 plan). `79ec6207`'s four doc files are already on `master` as `4891aa32` | n/a | The rebase will meet identical content; keep either side |
| `aac4f2ca` | Captures run again (a Demonstration with no media and no recipe is skipped), C3 word check, two test files added to `just tooling-test` | `just tooling-test` passed | none |
| `773b25ba` | Envelope colours | `just unit src/graphs/curves/envelope`, lint | A look in the browser; the worker rebuilt the overlay file after overwriting it once, so read the diff |
| `37881fcc` | Epicycles outlines: model, data, generator, graph, localization | 75 model tests, 72 graph and lesson tests, typecheck, lint, localization test | Browser look in both languages, inspector at 310 px, a preset export and import by hand, legend edit by the handler is untested (it hides the polygon, vertices and controls entries for an outline) |
| `53ad11b6` | Literata as the board text default (`src/graphs/styles/BoardText.ts`, applied in `GraphSession.ts`) | Its own tests, styles, export, CorrelationGraph, linear, GraphSession suites, lint, typecheck | `just check-changed` never ran (queued over 10 minutes; a stray run from the worker may still be queued); the cross-family look of acceptance 9; text-measuring layouts on real pages |

The build being served is revision `53ad11b6`. `just preview 4333` and the `tailscale serve` entry for 4333 were started by handler 1; if the address does not answer, run `just preview 4333` again from this worktree and copy `docs/reviews/site-walkthrough/graphs/pilot/{index.html,before,after}` into `build/walkthrough-graphs/` (a rebuild removes that folder).

## Next slice inputs, in order

1. **Verify what is built.** `just check-changed`. Then a `bezeg-smoke` pass (Sonnet, first pass of new UI) with screenshots of one route per family for the typography look: `/bezier/decasteljau`, `/rational/base`, `/ph/cubic`, `/curve-geometry/envelope`, `/functions/derivative`, `/analysis/epicycles` (each outline), `/probability/correlation`, `/inscribed-angle`, `/compgeo/delaunay`, `/projective/three-views`, `/patches/tensor`; desktop and 390 px; inspector at 310 px for epicycles; SVG and PNG export of one graph. Look at the screenshots yourself. On the epicycles outline check that no dashed control polygon is drawn over the outline.
2. **Recapture the pilot clips for real**, one at a time, against the preview: `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 just clip curve-envelope`, then `interp-subdivision` and `prob-correlation` without the flag. Look at each poster. Update `pilot/after/` and the comparison page.
3. **Publish** with `just publish --background --recipe runtime` (list every commit after the base). Typography reaches every poster: stored posters now differ from the live graphs in face only where they show plain text, and each batch recaptures its own.
4. **C5 convexity sweep** (spec, G06): replace the held-state spec in `scripts/demonstration-preview-concept-motion.cjs` with a `parameter-sweep` row in `scripts/demonstration-clip-rows/analysis.cjs` on "Točka dotika tangente t", `0.5 → −0.5 → 1 → 0.5`, quoting the lesson sentence; `just clip convexity`.
5. **Blocker triage** over all 118 captures with the text policy applied, written to `docs/reviews/site-walkthrough/graphs/blocker-triage.md`; then batches B1 to B8 (spec, "Batches"). Per-row verdicts follow the approved rule; show each batch on the preview.
6. **Epicycles card (G07-f):** recipe and row with an outline as the subject, once item 2 has shown captures work.
7. Later pass: 68 fixed `fontSize` literals listed in `docs/reviews/site-walkthrough/graphs/typography/worker.md`.

Worker notes: `docs/reviews/site-walkthrough/graphs/pilot/`, `g07/`, `typography/` (on the branch).

## Rules that carry over

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. This replaced "decide without asking" on 2026-11-14 (recorded in the intake). Do not launch a successor while the work only waits on the owner.
- Port 4333 only. Previews for the owner go through `tailscale serve`. Do not edit inspector panel composition (control choice owns it) or other sessions' files.
- `just preview` refuses a dirty `src/`; a worker that must serve while another edits uses `SMOKE_PORT=<port> node scripts/serve-smoke-build.cjs`. Workers keep scratch files in `.command-logs/`, never `/tmp`.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
- To push documentation while unpublished code sits on the branch: make a branch from `origin/master`, check out only the doc files from this branch, `just publish --recipe docs`, switch back.
