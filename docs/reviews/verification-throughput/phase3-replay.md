# Phase 3b/3c replay against ci-history.md section 3

Question per distinct cause: would the new always-run tier (`scripts/check-changed-always-run.cjs`, run by `just check-changed`) have run the failing unit file locally? "Selected anyway" means Vitest's import-graph selection already picks it when a graph file changes, so the tier adds nothing.

| Cause (runs) | Class | Failing file | Always-run runs it locally? | Why |
| --- | --- | --- | --- | --- |
| GraphTransientState.part4 inscribed-angle rollback (41404923863) | c | `GraphTransientState.part4` | No (selected anyway) | Graph-bound test, not in the tier. It imports the graph registry, so the changed graph file selects it. |
| `demonstrations.smoke:114` poster provenance, interp-subdivision (41431454866, 41433556719, 41437547157, 41441375191, 41442928082) | c-asset | `tests/demonstrations.smoke.spec.cjs` (browser) | No | Browser smoke, not a unit file. `src/demonstrations.test.ts` runs but does not check poster provenance. Needs generated-image freshness, a separate phase 3 item. |
| Routes route count (41444026530) | c | `src/Routes.test.tsx` | Yes | Listed. The provenance half of that run is the c-asset row above (no). |
| PresetCatalog key lists and counts (41517322471, 41586412506, 41588305392, 41590409905, 41593436905, 42168744598) | c | `PresetCatalog.test.tsx` | No (selected anyway) | Dropped from the tier at handler review because it mounts every graph. It imports `graphFactories`, so registering a graph selects it. Phase 3a also made its key check name the missing and extra keys. |
| GraphTransientState.part2/3 projective Preset keys (41536578409) | c | `GraphTransientState.part2/3` | No (selected anyway) | Graph-bound, as the first row. |
| prob-summary rollback contract (41579583362, 41580863143, 41582298301, 41584845703, 41586412506) | c | prob-summary graph state test | No (selected anyway) | Graph-bound, as the first row. |
| guidedExamplePreviews S4 card (41582298301) | c (+c-asset) | `guidedExamplePreviews.test.ts` | Yes for the unit part | Listed. The recapture of the image itself is not covered. |
| `.point-coordinate-editor` removed (42475921993) | c (selectors) | 8 smoke specs, browser | Warned by 3c | Not a unit file. The selector warning fires; see below. |

Distinct causes: 8 (rows above). Run locally by the always-run tier: 2 (Routes, the guidedExamplePreviews unit part). Selected by the import graph already: 4 (three graph-state causes, PresetCatalog), so a local `check-changed` would have run them; those failures reached CI because they were pushed without a local run or before the base moved. Warned by the selector check: 1. Not covered: 1 (poster provenance in browser smoke, which needs generated-image freshness).

Failing runs: the five poster-provenance runs and 41444026530's provenance half need generated-image freshness, which is not part of phase 3.

## Selector warning dry run (3c)

The brief's range `2fc4a346^ .. 97d22db4` is empty: 97d22db4 is an ancestor of 2fc4a346. The removal is in 97d22db4 itself. Ran `node scripts/selector-removal-check.cjs --base 97d22db4^ --head 97d22db4`: it removed `className="point-coordinate-editor"` and `point-coordinate-editor-body` from `PointCoordinateEditor.tsx`, and `tests/curve-ownership.smoke.spec.cjs:165,172,343` still reference `.point-coordinate-editor`. The worker's first version gave **no warning**, because the class is still defined in `DemonstrationWorkspace.css` and used by `TensorPatchPanels.tsx:91`. At handler review the check changed: a removed token that tests reference warns even when it survives elsewhere in `src`, naming the surviving files, unless the same diff adds it back (a moved line). Rerun result: it warns on `.point-coordinate-editor`, `.point-coordinate-form` and `.point-coordinate-submit`, which are referenced by `curve-ownership`, `guided-lessons`, `library-picker`, `standalone-learning` and `workflows` specs. These are the failing specs of run 42475921993. It also warns on `.visually-hidden`, which is noise, because that utility class stays in use. That is acceptable for a warning that is printed once per token.
