# State: site walkthrough, graphs (package D)

Handler 1, 2026-11-14. Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (proposed): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md).

## For the owner

**Ready to look at:** the three-example pilot, before and after, with the clips playing side by side.

http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/index.html

The same preview serves the app itself at http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/ . The two restyled graphs are live there: `/probability/correlation` and `/interpolation/subdivision`. The catalog page of the preview still shows the old cards for the three examples; the new captures are trial files until you approve.

**Your choices.** Nothing in graphs, styles or captures reaches `master` before you answer.

1. **Capture text.** Proposed rule: a catalog capture carries no words, because the same pixels are shown in both languages. It may keep axis numbers, symbols that name a drawn object, one formula line, the number the motion produces, and weights where the clip is about them. The spec has a verdict for each of the 118 captures (29 have no text, 24 keep, 37 remove, 28 keep in part). On the pilot, the correlation card keeps only `r = 0,8468`. Is the rule right, and is that the kind of exception you want?
2. **The three pilot directions**: correlation (solid residuals, serif label, axes in the card), envelope (no text, construction fills the frame), subdivision curves (ochre handles, blue refined vertices, violet limit curve). Approve or correct each.
3. **Graph typography (G01).** Graphs mix three faces today: MathJax, Georgia, and JSXGraph's default Arial. Proposed: Literata, the site's title face, for all plain graph text, set once at the board; mathematics stays MathJax. Not applied yet, so the pilot still shows Arial in places (point names and the status line on the subdivision graph).
4. **Convexity clip (G06).** It skips because it was built from four held states, by an earlier spec's choice. Proposed: a smooth sweep of the tangent point, dropping the staged reveal of the second derivative.
5. **Epicycles (G07).** The `design` session told this session that you picked Slovenia and the cat, plus the treble clef and blossom if easy. That pick is not yet written in the intake or the design state note on `master`, so the epicycles example is untouched.

## Where things stand

- Slice 1 (spec) is on `master`. Slice 2 (pilot) is on the branch `worktree-walkthrough-graphs` only, commits `f92d765d` and `58037e7f`, with the before and after media and the comparison page under `docs/reviews/site-walkthrough/graphs/pilot/`.
- Checked on the pilot: focused unit tests of both graphs, typecheck, lint of the two paths, `just tooling-test`, eight new tests of the capture-text code, and a browser pass of both routes in both languages (load, steps, drag, example select, language switch keeps the scene; no console errors). Not checked: SVG and PNG export of the two graphs, touch input, the 390 px and inspector screenshots were taken but not compared with a baseline.
- Rule since 2026-11-14 (planning session, recorded in the intake on `master`): propose, show a preview, wait for approval. It replaces "decide without asking" and passes to any successor. No successor is launched while the work only waits on the owner.
- Running for the preview: `just preview 4333` from this worktree and the `tailscale serve` entry for port 4333. The comparison page was copied into `build/walkthrough-graphs/` after the build; a rebuild removes it. Stop both when the preview is replaced.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.

## Next slice inputs

After approval, in this order (spec, "Batches"):

1. Make captures runnable: `validateRecipes` fails at `HEAD` because `complex-power`, `complex-euler`, `recursion-cobweb` and `contour-map` have no recipe. The pilot's trials used a preload outside the repository. Then `just clip` the three pilot ids and publish them with the pilot commits.
2. Capabilities C3 (tooling test, and add the two capture test files to `just tooling-test`), C4 (typography, with the cross-family look), C5 (convexity sweep).
3. Blocker triage over all 118 captures, written to `docs/reviews/site-walkthrough/graphs/blocker-triage.md`, then batches B1 to B8.
4. G07 once the pick is recorded: candidates and generator are under `docs/reviews/site-walkthrough/design/` on `master`; the Slovenia outline there is a rough sketch and needs real border data.

Findings for the triage are in the spec under "Batch records", "Pilot".
