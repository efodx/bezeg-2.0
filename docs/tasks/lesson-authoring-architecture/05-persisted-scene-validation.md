# 5. Persisted scene validation and projection

Status: accepted 2026-11-10. Slices 1–4 implemented 2026-11-10 (evidence `docs/reviews/feature-streams/controls/s7-*.md`). Closeout: integrated `just check` passed at `5a54c823`; the integrated engineering review (`s7-closeout-review.md`) found host Reset no longer following the chosen example on NURBS, Insertion and Extraction, fixed in `35888a85` with a `graph.reset()` regression test (CI green, run 42868318164); full checklist smoke in Slovenian and English passed (`s7-closeout-smoke.md`), with one inconclusive harness observation on ThreeViews sliders after closing the Save panel, carried as an open item. Task file written 2026-11-08 by the Controls stream (step 7 of [controls.md](../feature-streams/controls.md)). Source: [lesson-authoring architecture, section 5](../../specs/lesson-authoring-architecture.md#5-persisted-scene-validation-and-projection), acceptance P1–P5 (canonical there), plus [verification](../../specs/lesson-authoring-architecture.md#verification-and-completion-evidence). Runs alone in Controls Wave 4 and owns the `BaseGraph` import/replacement path while active; task 4 follows it.

## Scope and entry points

The Preset module (`src/presets/`, start at `PresetImport.ts`, `Presets.ts` and `PresetCollection.check`), every persisted entry path (file preflight/commit, stored collection selection, initial mount, explicit graph import, stored-Preset figure entry and figure batches), `SceneReplacement.ts`, and the pilot graphs FivePoint and ThreeViews with `PRESET_DATA_STATE_KEYS`. Before starting, reconcile against current `master`: the shared-controls sweeps and contracts work may have moved code since this file was written.

## Slices

1. **Complete collection check.** One side-effect-free check returning a normalized value or the existing localized diagnostic with collection/Preset/field context; all entry paths use it, revalidating at mutation boundaries. Characterize current file/storage/mount decisions first (P1 samples).
2. **Consumer preparation and refusal before mutation.** Graph-owned pure preparation (Blossom degree 2/3 versus the shared B-spline collection; point limits); refusal precedes import, state writes, bounds, disposal and drawing; live scene unchanged; fresh mount shows a usable default plus a notice; corrupt raw storage untouched; figure batches preflight all entries (P2).
3. **Deterministic defaults for omitted fields** per the decided compatibility policy, with contextual Reset unchanged (P3). Record the partial-import and malformed-storage behaviour changes as user impact in the spec and release evidence.
4. **FivePoint/ThreeViews projection declaration**, removing their model-stripping overrides and `PRESET_DATA_STATE_KEYS` entries; trusted checkpoints untouched (P4, P5).

## Verification

Per slice: focused `just unit` paths from the spec's persistence row, `just typecheck`, `just lint`, `just build`; integrated change: `just check`. Smoke: save/reopen, file exchange, malformed-value refusal, figure export/return and continued editing, plus the full workspace/lesson-runtime checklist because `BaseGraph`/session paths change. Engineering review of the integrated diff.
