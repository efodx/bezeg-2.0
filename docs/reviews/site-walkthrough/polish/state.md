# Site walkthrough, `polish` session: state

Written by handler 2, 2026-11-14, with the label stage built and waiting for the owner. Spec: [shell and label polish](../../../specs/site-walkthrough-shell-polish.md). Queue: [polish](../../../tasks/site-walkthrough/polish.md). Movable-point task: [movable points](../../../tasks/site-walkthrough/movable-points.md).

## For the owner

**One choice is waiting for you: the size of the typeset point labels (M03, label stage).**

Open `http://desktop-a0j72sv.tail2032db.ts.net:4331/bezeg-2.0/review/labels.html`. It shows 18 graphs in three columns: today's public site, treatment A and treatment B. Nothing from the label stage is pushed.

- **A, full size:** the labels use the display font size, exactly like the Bézier control-point labels and the point-set labels you approved. Consistent across the app, but these graphs were laid out for small letters, so labels crowd on Dvorazmerje, Pascal and Reševanje trikotnika.
- **B, compact:** the same typeset labels at 75 % of the display font size. Less crowding; these graphs' labels would then be smaller than the Bézier ones.
- Known in both: on Dvorazmerje the image-point labels still overlap and the line names `p`, `p′` are cut off at the left edge. I fix placement on the crowded graphs after your choice, since the offsets depend on the size.

The live pages on the preview show A (for example `/bezeg-2.0/triangle-solver`, `/bezeg-2.0/projective/pascal`). B exists as pictures only; its pictures also shrink the point-set labels (`P1`, `P2`), which the real change would not.

Already done: header mark (H05) and chapter navigation (L02, L03) are on the public site. The cursor stage of the movable points (every draggable point shows the pointer cursor, nothing looks different) is committed and its publish is running.

## State of the queue

| Item | State | Where |
| --- | --- | --- |
| H01, D01, M01, M02, D02 | Published | `02f34ce2`, `954e9803`, `8b928549` |
| H05, L02, L03 | Published, owner approved | master `8ed2f453` |
| M03 stage 1 (1a, 1b, 1c) | Accepted, committed, publish running (`publish-d9ad168f-0de282`) | `6fcf51eb`, task file `d9ad168f` |
| M03 stage 2 (2a to 2d) | Implemented, checks pass, **waits for the owner's size choice**; not pushed | local commit, see Working tree |
| Spec close-out | Not done | step 4 below |

## Next steps, in order

1. **Confirm the stage 1 publish.** `just publish --status`, entry `publish-d9ad168f-0de282`, result `.command-logs/publish-d9ad168f-0de282.json`. It was started with `BEZEG_TRANSIENT_STATE=sample` and has been pending for a long time on this shared machine. If it failed, read the log excerpt, repair and republish (base `8ed2f453`, commits `6fcf51eb`, `d9ad168f`). Then publish the documentation commit that carries this note (recipe `docs`).
2. **Apply the owner's size choice.** For A: keep the code. For B: add one named-point label style to `createPointStyles` (`src/graphs/styles/PointStyles.ts`: the shared label with `fontSize: () => settings.fontSize * 0.75` and `visible: "inherit"`) and use it at the converted sites (grep `visible: "inherit"`, `labelStyle` and `mathStyle` in the 18 files), so point-set and Bézier labels keep their size.
3. **Placement repair, then accept stage 2.** Fix what the pictures show at the chosen size: Dvorazmerje image labels `A′` to `D′`, `M`, `N` overlap and `p`, `p′` are cut at the left edge; Pascal `P₁` sits on handle `A` and `s₄`, `s₁` are cut at the top; Reševanje trikotnika `A` touches side `b`; Obodni kot and Simson `O` stands far from its cross. Rebuild, recapture with `node .command-logs/polish/label-shots.cjs <outDir>`, review, and look at one non-default mode per graph (hidden points must keep hidden labels; this was a defect, fixed with `visible: "inherit"`). Not yet observed failing before the change: the new label assertions of CrossRatio, ThreeViews, LineGeometry, TriangleSolver and Descent. Smoke the affected routes, publish, and tell the `graphs` session so captures are recorded once. `CircleConstructionGraph` captions (`P`, `T1`, `T2`) and `KinematicsGraph` arrow texts (`v`, `a`) are not converted: convert them at the same size, or record the reason in the spec.
4. **Close out.** Update the spec: status, the evidence table (C2 met by D02; N1 to N3 and F2 for the picked options; P3 and P5 after stage 1 and 2), the "Recommendation" heading (approved, both stages), and H05's reason: the owner judged the green tile the problem and picked the outlined flower, so the header uses a new mark file while `elderflower.svg` and the tab and phone icons stay. Append the continuation to the evaluation entry `2026-11-14: site walkthrough, shell and label polish`. Remove the tailnet entry (`tailscale serve --http=4331 off`) and stop the preview when the owner has nothing left to look at. Delete the local branches `walkthrough-polish-proposals` and `walkthrough-polish-h05` (superseded; never pushed).

## Stage 2 evidence so far

- Typecheck, lint on the changed files, unit tests of every touched family (six compgeo graphs, projective, lines, trig, isometry, mechanics, three curve scenes, the helper): pass. Production build: pass.
- Pictures: `.command-logs/polish/m03-s2/before` (public site), `after` (A), `compact` (B, made with a temporary 0.75 factor in `PointStyles.ts`, reverted). Worker notes: `.command-logs/polish/m03-2a-note.md`, `m03-2b-note.md`, `m03-2c-note.md`.
- Labels of these graphs follow their point's visibility as before; they do not follow the "point labels" display setting (they never did).
- Two existing assertions changed to the math text (`∞` in the PolePolar and Pascal host tests), plus the label-text assertions of LineGeometry, TriangleSolver and Isometry.

## Stage 1 evidence

- Unit: the 14 converted graphs and `curves/object` (1,256 tests), then the static check with `linear`, `patches`, five compgeo graphs, `LinearFunction`, `BezierCurveGraph`: pass. Typecheck and lint on the changed files: pass. `eslint-suppressions.json`: `JXGRationalBezierCurve.ts` `prefer-const` 4 to 2.
- Browser hover (`.command-logs/polish/m03-s1-probe.log`): `pointer` then `default` on 18 of 23 probed graphs, and on the tensor patch parameter inset by a separate probe.
- No hover evidence: `complex-roots` (square handle), `bspline/basis` and `Descent` (all points `auto`; Descent read the same before the change), the linear-map composition, eigen and iteration views, the tensor patch control net (not JSXGraph drag handlers). Unit tests cover Epicycle, CrossRatio and Hermite.

## Working tree

Branch `worktree-walkthrough-polish`, rebased on `origin/master` `8ed2f453`: `6fcf51eb` and `d9ad168f` (stage 1, being published), then a documentation commit with this note, then one local commit with the label stage (helper `src/graphs/styles/pointLabelMath.ts` and batches 2a to 2d). The label-stage commit is not approved: do not publish it before the owner answers; repair it with follow-up commits.

## Preview

`just preview 4331` serves `build/` (treatment A) and the tailnet entry for 4331 is up. `build/review/labels.html` and `build/review/labels/` are copied in by hand and vanish on `just build`: recopy the three folders from `.command-logs/polish/m03-s2/` and rewrite the page if a rebuild is needed. The preview process belongs to handler 2's session and may be killed when that session ends: restart it with `just preview 4331` (it refuses when sources changed since the build; then `just build` first).

## Not verified

- No real touch device; high-contrast mode not checked.
- The catalog clip did not start in the scripted hover at 1440 px (it did at 1024 and 390 px).
- Accessible names of the chapter controls were checked as link text and one `toHaveAccessibleName`, not through a browser's accessibility tree.
- Catalog posters and clips of the point-set graphs and blossoming still show the old labels (package D recaptures).
- The header mark in presentation mode (night header) was not looked at.
- Label stage: only the default view of each graph was captured; no smoke run yet; drag cost with the typeset labels not measured.

## Session rules to pass on

The launch prompt's rules apply (worktree and branch, queue and state files, Tailscale previews on port 4331 only, narrow checks, `just publish --background`, intake IDs in commits), with the owner's approval rule: items with one correct result are pushed when verified; visual-taste and architecture questions are shown in a preview and wait for his approval (two treatments where two are reasonable); routine engineering choices stay with the handler. In the label stage, a family whose labels change appearance in a way he has not seen is shown with before and after. At a context handoff, commit and push the state note, then start a successor from this directory with `claude --bg -n "walkthrough polish handler <n+1>" --agent bezeg-handler --model claude-fable-5-2 --permission-mode auto "<prompt>"` naming this note and repeating these rules. Do not launch a successor while the remaining work only waits on the owner or the objective is complete.
