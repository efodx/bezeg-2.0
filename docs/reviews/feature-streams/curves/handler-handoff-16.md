# Curves stream: handler handoff 16

Handler 16 wrote this on 2026-11-02. It supersedes [handoff 15](handler-handoff-15.md). It stopped at the 150k soft threshold after integrating both dispatched slices. No workers, previews or temporary worktrees are running. Branch `worktree-stream-curves`, rebased on and pushed to `origin/master` at `cb533fe2`; tree clean apart from this note's commit. Settings unchanged: handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet.

## Accepted and pushed this session

| Commit | Slice | Checks |
| --- | --- | --- |
| `27a58bcf` | BS-A-2a2: `BSplineBasisGraph`, `BSplineBasisScene`, reusable `KnotEditor`, `bsplineBasisModel.ts`, shared `bsplineKnotMessages.ts`, 15 `bsb_*` locale keys after the `bspline_*` block. Not registered. [Evidence](../../b-splines-nurbs/bs-a-2a2-graph.md). | Worker returned partial at 135k. Handler: `just unit src/graphs/curves/bspline` 47 passed after repairs; typecheck, lint, build passed; every new assertion failed under a deliberate mutation. |
| `cb533fe2` | IA-B-3: I3 Hermite/Catmull-Rom lesson (six steps) in `interpolationGuidedLessons.ts`, `hermite` lesson action kind in `src/learning/model.ts`, `HermiteGraph` actions and Reset refit, a `HermiteScene` dispose guard (scene closures read live state with fewer points after a restore), registration (interim owner `bezier-curves/geometric-properties`), counts 63/70, smoke row. | Worker (partial at 135k): 890 unit tests passed incl. `lessonRestoration.part3`; 3 mutations caught. Handler: content units 810 passed after the prose repair; `SMOKE_PORT=4314 just smoke-lesson interp-hermite interp-lagrange` 4 passed. After the rebase on master: typecheck, 923 units (learning content, catalog, bspline, hermite, localization), build passed. |

**Review dispositions.**
- 2a2 engineering (Sonnet): medium fixed — figure scenes replaced the state with mount defaults after importing data; `figurePresetGraphState` override keeps the imported vector. Low fixed — stale refusal hint after a language switch or outside vector change; group labelled by its heading. Deferred lows listed in the evidence file (readout `role="status"` chatter, casts in `BSplineBasisScene.create`, silent invalid-drag snap-back, ±100 message, raw list in [0,1] mode).
- 2a2 mathematics (Sonnet): no error. Low fixed — sampler adds each interior knot and its left limit so full-multiplicity jumps draw as steps.
- I3 mathematics (Sonnet): two locality statements claimed the moved interior point's own tangent changes; under the uniform rule it does not. Fixed in SL and EN (handler; content tests rerun).
- I3 engineering (Sonnet): medium **deferred** — the smoke row `HERMITE_READOUTS` (`tests/guided-lessons.smoke.spec.cjs` ~1746) probes only the board status line, so steps 1–2 and 3–6 share one regex each; state is covered by unit tests. Add a per-step probe (point count or overlay visibility) when the graph exposes a readout. Low deferred — `set-tension` is a silent no-op in Hermite mode (documented in the JSDoc), `add-point` at the maximum is a silent no-op.

## Next steps, in order
1. Dispatch the two prepared briefs in [handler-16-briefs](handler-16-briefs/) in parallel (file-disjoint), after changing the `jobs\96603abf\tmp` log and handoff paths to your own job tmp:
   - `brief-ia-c-3.md`: I5 subdivision lesson. Handler 16 checked the source for the four-point \(C^1\) claim: Dyn, Gregory, Levin, CAGD 4 (1987) 257–268 prove \(C^1\) for \(0<w<1/8\) (Kuijt et al. and Floater's UiO note cite it; Hechler, Mößner, Reif sharpen the bound to \(\omega^*\approx0.1927\)). The lesson states \(C^1\), not \(C^2\). Update the spec's "to verify" note (I5 acceptance 4) in the same commit.
   - `brief-bs-a-2a3.md`: de Boor graph. Handler checked the \(t=1.5\) triangle by hand: \((2.5,2)\), \((3.5,1)\), result \((3,1.5)\).
2. Then the D4 `patch-coons` lesson; then BS-A-2b registration (L1/L2 routes, `'deboor'` in `LESSON_ANIMATION_IDS`, browser drag measurement of both B-spline graphs).
3. `G-FN` is open: the I2/I4 graphs and family 4 (PS) graphs can start. Read `docs/tasks/architecture-deepening-backlog/08-function-graph-sharing.evidence.md` first. Master now carries new function graphs from the functions stream (`629a471d`, `275243cb`, `087cf3e3`); check them for reuse.
4. Deferred lows from handoffs 13–16 remain open.

## Gaps
- I3 live SL→EN switch on the lesson was not browser-checked (lesson text comes from content). The smoke ran its configured languages only.
- BS-A-2a2 is unregistered: no browser check; drawing cost measured in jsdom only (knot drag 3.88 ms/event, t sweep 10.48 ms/step).

## Evaluation record (not yet logged with `do-log`)
- BS-A-2a2 worker, Sonnet medium, handoff-v12: partial at 135k (140k total, 64 tools, ~25 min). Implemented all items; missed one test (survivor mutation), a figure-scene state bug and stale hints, which review caught. Slice (graph + editor) was at the budget limit; future graph+control slices should split or cap scope.
- IA-B-3 worker, Sonnet medium, handoff-v12: partial at 135k (141k, 78 tools, ~42 min). Complete; found and fixed a real dispose bug; strengthened its own prose test after a surviving mutation. Smoke probes weak.
- Reviewers (Sonnet): 2a2 engineering 54k/19 tools (one useful medium), 2a2 math 28k/5 tools (one useful low), I3 math 35k/4 tools (one real prose error), I3 engineering 29k/10 tools (one medium on smoke probes).
- Handler: a build started while the handler was editing records no provenance ("Build inputs changed while building"); rerun the build once the tree is stable before smoke.
