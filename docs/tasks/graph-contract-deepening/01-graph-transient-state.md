# Declare graph transient state once

**Source spec:** [Graph contract deepening, section 1](../../specs/graph-contract-deepening.md#1-graph-transient-state)
**Status:** planned.
**Priority:** strong; first choice. Test first.

## Goal

Give each graph one place to declare the transient state outside Preset data and the scene store, plus the redraw its scene needs after replacement, and have `BaseGraph` apply that declaration on every capture, restore and reset path. Callers gain leverage from a smaller subclass interface; maintainers gain locality because a missed path can no longer be a per-graph omission.

## Scope and sequence

1. Read the source spec's six acceptance criteria and ADRs 0006, 0012 and 0013, plus the scene-recovery evidence in [architecture deepening task 03](../architecture-deepening/03-scene-recovery.md). Inspect `BaseGraph.tsx` (scene hooks around lines 340 and 431-520, figure batch replacement around 797-860), `BaseCurveGraph.tsx`, `BaseFunctionGraph.tsx`, and every subclass overriding `resetSceneFields`, `captureFigureRuntimeState`, `restoreFigureRuntimeState`, `captureLessonState`, `restoreLessonState`, `prepareLessonDefaultScene`, `lessonDefaultState` or `figurePresetGraphState`.
2. Inventory each graph's transient state: fields outside the scene store that change what is drawn or what controls show. Include known cases (Subdivision `stepsDone`, Elevation overlay, Farin weights and form, curve selection, PH hodograph view, De Casteljau drawn parameter, spline alpha samples) and any others found.
3. Write a parametrized real-graph test over `graphFactories`, building on the `GraphHostRealGraph.test.tsx` harness: change, capture, change, restore and compare for lesson checkpoints, the lesson default scene and figure batch entry restore. Confirm or rule out the Subdivision, Farin and Elevation suspicions and record the result before changing behavior.
4. Design the declaration and its base-module use. Consider at least two shapes before choosing (for example one transient-state descriptor per graph versus a single capture/restore pair with a reset), and apply the deletion test to each. Do not build a generic serialization framework.
5. Migrate graphs to the declaration, removing duplicate checkpoint overrides and per-path redraw patches. Keep graph-specific overrides only where behavior is mathematically distinct, and say why in the code.
6. Remove or justify graph-field mirrors of scene-store state, per AGENTS.md.

## Verification and completion

- Start with `just --list`; run the new parametrized test plus focused SceneStore, GraphHost, GraphHostRealGraph, GraphSceneReload, GraphSession, LessonSession, activities, ChapterActivityVisit and figure-export suites, then `just typecheck` and `just build`.
- Cover synchronous rollback within one tick, disposed or unready graphs, and figure batch cancellation. Check that no transient state reaches Preset exports or storage.
- This changes shared graph runtime used by lessons, activities and figure export, so run `$smoke-tester` with the full [browser checklist](../../smoke-tests.md). Report failures and incomplete coverage.
- Review the diff with parallel subagents for mathematical/state correctness and engineering constraints.
- Record the inventory, confirmed defects, chosen shape and rejected alternative in this file. Update [current architecture](../../current-architecture.md) for the new ownership. Commit and push under AGENTS.md.
