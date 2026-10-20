# Deepen Demonstration preview capture and evidence

**Source spec:** [Architecture deepening, section 2](../../specs/architecture-deepening.md#2-demonstration-preview-capture-and-evidence)
**Status:** planned; task requested on 2026-10-20, implementation not started.
**Priority:** worth exploring; independent of visit ownership.

## Goal

Reduce the knowledge exposed by the preview capture module's interface while preserving its existing depth. Keep mathematical locality beside each timeline and retain leverage from shared capture/evidence checks and the real-browser adapter.

## Scope and sequence

1. Read the source spec's six acceptance criteria and the representative/continuous preview contracts. Inspect `scripts/demonstration-preview-motion.cjs`, `demonstration-preview-recipes.cjs`, the analysis/curve/concept motion files, the capture CLI and focused tests.
2. Inventory actual consumers of exported helpers and registry mutation. Separate needed caller knowledge from implementation details, then choose a seam justified by those consumers. Apply the deletion test: a file split alone is insufficient.
3. Deepen capture/evidence ownership while keeping schedules, observations and independent mathematical assertions traceable. Preserve parity between live capture and offline evidence validation.
4. Retain all 45 timelines, supported input paths, fixed-camera and loop checks, media budgets, provenance, selective recapture and failure-safe publication. Keep preview tooling separate from Guided lesson actions and runtime graph behavior.
5. Adapt tests to the consumer interface without weakening mathematical rejection fixtures or adding a hypothetical renderer/browser adapter. Update capture ownership guidance after implementation.

## Verification and completion

- Start with `just --list` and the command guide. Run the focused preview capture and motion-runner Node tests, including mathematical rejection, selective recapture, encoding and publication-failure cases relevant to the change.
- Verify the complete 45-entry registry remains valid. Exercise representative real captures across sweeps, pointer drags and exact stepped states; inspect recorded evidence, decoded media, camera stability, loops and manifest/map consistency.
- Reuse unaffected published assets rather than replacing them merely to demonstrate the refactor. Record retained-asset compatibility and any operator provenance assertion explicitly.
- Apply browser checks if runtime media/player behavior changes; record test/capture gaps and final interface/depth gains. Commit and push only verified task changes under AGENTS.md.

## Completion evidence

Pending. Existing tests were inspected during the architecture review, not rerun.
