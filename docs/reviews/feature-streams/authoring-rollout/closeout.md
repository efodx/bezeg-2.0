# Authoring-rollout close-out (queue step 7)

Handler 7, 2026-11-13. Step 4 of tasks 06, 07 and 08. Base: `ccecc1d8`.

## Task 08 step 4: projection inventory

All 25 baseline rows of `PRESET_DATA_STATE_KEYS` (`src/graphs/base/graphTransientStateContract.tsx`) have a disposition. The table now holds only Families-prep rows for graphs without a projection declaration.

| Rows | Declaration | Batch | Row removed in |
| --- | --- | --- | --- |
| `projective-cross-ratio`, `projective-pascal`, `projective-pole-polar` | `crossRatioPersistence`, `pascalPersistence`, `polePolarPersistence` in `projective/projectivePersistence.ts` | 1 ([evidence](08-batch1-evidence.md)) | this close-out |
| 22 point-set ids (17 algorithm rows with `bezier-clipping`, 5 plane-geometry rows) | `pointSetPersistence` through `PointSetGraph` | 2–6b ([2](08-batch2-evidence.md), [3a](08-batch3a-evidence.md), [3b](08-batch3b-evidence.md), [4](08-batch4-evidence.md), [5](08-batch5-evidence.md), [6a](08-batch6a-evidence.md), [6b](08-batch6b-evidence.md)) | each batch |

Why the projective rows could go now (inventory §2 required independent assertions first): `projectivePersistence.host.test.tsx` runs `describe.each(TRIO)` over the three graphs. It checks a round trip after two distinct preceding scenes with hand-authored data and `graphState` exactly `{initialized: true}` (`:319-324`), partial Presets (`:340`), malformed or forbidden permitted state refused without mutation (`:353`), figure scenes (`:370`) and lesson default scene and fixtures (`:389`), plus PolePolar finite and ideal P (`:401`). In the generic contract, a graph with a projection declaration takes the projected branch (`graphTransientStateContract.tsx`, `projectPersistedScene`): the file must equal the projection and `graphState` must have no `model`. Its row only added a check that `state.model` exists, which the host tests also cover. Check: `just unit src/graphs/base/GraphTransientState -t projective`, 40 passed.

Stored format: no key or format changed in the close-out. The batches recorded their own format checks.

## Task 07 step 4: owned-scene disposition

| Candidate | Disposition | Record |
| --- | --- | --- |
| `BSplineBasisGraph`, `DeBoorGraph`, `BSplineInsertionGraph`, `BSplineExtractionGraph` | migrated to `SceneDeclaration` | [batch 1](07-batch1-evidence.md) |
| `InterpolationGraph`, `HermiteGraph`, `SubdivisionCurveGraph` | migrated | [batch 2](07-batch2-evidence.md) |
| `ParametricCurveGraph` | migrated | [batch 3](07-batch3-evidence.md) |
| `InscribedAngleGraph`, `SimsonLineGraph`, `InversionGraph` | excluded: contract mismatch | [O-plane](../../../specs/lesson-authoring-rollout.md#rollout-decisions), [inventory](07-inventory.md#finite-list-batches-blockers) |

Remaining lifecycle code compared with the inventory, counted at `ccecc1d8`:

- All eight migrated graphs have one `sceneDeclaration()` and no `ensureScene`, `removeScene` or `syncReplacedScene` override.
- `DeBoorGraph` and `SubdivisionCurveGraph` keep `mount`/`unmount` for playback, and `ParametricCurveGraph` keeps `disposeFigureScene`/`unmount` for the roll driver. The inventory predicted these remainders (open item c).
- The trio still holds its `ensureScene`/`removeScene`/`syncReplacedScene`/`disposeFigureScene` hooks, unchanged as recorded. A future `PointSetGraph` scene slot would reopen them.

## Task 06 step 4: legacy registration retirement

See [06-step4-evidence.md](06-step4-evidence.md). It records the deleted `graphFactories.ts`, the `Routes.tsx` fallback, `legacyDemonstrationRows` and `isRegisteredDemonstrationId`. `allGraphFactories.ts` is now derived only from `registeredGraphLoaders`. The guard in `projective/registrationDeletion.test.ts` failed when the file was recreated. The per-family "legacy table excludes registered ids" tests were removed, since their file no longer exists; the guard replaces them. Left in place: `checkRegistrations` in `registrationIntegrity.ts` still takes a `legacy` argument that its callers now pass empty. Narrowing it would touch 11 Families-prep composition tests, so it is left for a later cleanup.
