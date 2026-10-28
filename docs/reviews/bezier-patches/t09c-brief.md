# Slices 09C-X and 09C-Y briefs (handoff-v12) — finish task 09

Base: `c1ecbf1` (09A `da0dbf2`, 09B1 `86d6b9f`, 09B2 partial `71c2773`). Low findings: [construction-derivatives.md](construction-derivatives.md). Two workers run concurrently with disjoint files; neither commits, pushes or delegates. Preserve untracked `.claude/scratch/`. Use the Edit tool (not shell heredocs) for any string with a backslash.

## 09C-X — finish 09B2 (view tests, mutations, E2, build)

- **Goal:** steps 1–4 of [t09b2-handoff.md](t09b2-handoff.md) plus finding E2.
  1. `src/graphs/patches/surface-view/threeSurfaceView.test.ts`: add `vector-u`/`vector-v`/`twist`/`normal` to the line-dash block (~line 580), pattern count 4 → 6, dash order `twist < iso-w < construction-2 < iso-v < normal < compare`; a colour test (each new colour ≥ 3:1 on white, all role colours distinct, `vector-u`/`vector-v` the only solid new pair); a plane test (mesh + material created, double-sided, transparent, `depthWrite` false; a new revision rebuilds without leaking geometry/material; `dispose()` disposes them) following the existing disposal tests.
  2. `surfaceScene` finite check: a NaN plane corner throws (test).
  3. E2: stage-2 de Casteljau markers (`construction-2`) differ from `construction` markers by hue only (1.47:1 between them). Give `construction-2` markers a different size or shape in `threeSurfaceView.ts` and test it.
  4. Mutations, one observed failure per new assertion group, mutating only scene/view files you own (revert each): arrow direction, plane corner out of plane, normal/plane kept for a degenerate net, plane disposal omitted, E2 marker distinction removed.
  5. Full `npx vitest run` (log `.command-logs/t09c-x-full.log`), `npx tsc --noEmit --pretty false`, `npx eslint <changed files>`, `just build` (log `.command-logs/t09c-x-build.log`). You alone own the build.
- **Scope:** `surface-view/threeSurfaceView.ts` + test, `surface-view/surfaceScene.ts` + its test, `FakeSurfaceView.ts`, `TensorDerivativesScene.ts` + test (mutations only, plus test additions). Not: graph/panel `.tsx` files, `tensorDerivatives*`, `TensorDeCasteljauScene*` (09C-Y owns them).

## 09C-Y — 09A/B1 low repairs M1–M3, E4

- **Goal:**
  - M1 `src/graphs/patches/tensorDerivatives.test.ts` "nearly parallel but distinct tangents" is vacuous (corner tangents perpendicular). Build a genuinely near-parallel pair (sin θ ≈ 1e-4) so an absolute or wrong cross tolerance would fail; observe that failure by mutating the tolerance.
  - M2 the collapsed-edge test asserts only `kind === "defined"` at `u = 1e-4`; also assert that the normal approaches unit `S_u × S_uv` (computed independently in the test) as `u → 0`.
  - M3 `TensorDeCasteljauScene.test.ts` checks polyline roles/ids, not points; compare polyline points with an independent de Casteljau recurrence in the test (1e-9) for all three orders.
  - E4 `useStartingPatch` in `TensorDeCasteljauGraph.tsx:49` and `TensorDerivativesGraph.tsx:60` writes state twice (base import, then route fields). Fold into one `setState` if it is cheap (for example a protected hook in `TensorPatchGraph` returning extra fields merged into the base write); keep behaviour identical and existing tests green. If it is not cheap, leave it and say why.
  - One observed failure per strengthened test under a deliberate mutation (revert each).
- **Scope:** `tensorDerivatives.test.ts` (not `tensorDerivatives.ts`; flag issues), `TensorDeCasteljauScene.test.ts`, `TensorPatchGraph.tsx`, `TensorDeCasteljauGraph.tsx`, `TensorDerivativesGraph.tsx` and their graph tests. Not the view/scene files of 09C-X. No `just build` (09C-X owns it); run the affected vitest files, `npx tsc --noEmit --pretty false`, `npx eslint <changed files>`; logs `.command-logs/t09c-y-*.log`.

## Both

- **Return:** ≤300 words: files changed, decisions, check counts, mutations observed (assertion, mutation, failure seen), unverified cases, flags with `file:line`.
- **Budget:** about 20 turns. Locate with `grep -n` first, read ≤150 lines per call, never a whole file over 300 lines. On `HANDOFF` or past ~30 turns, stop at a consistent point, write `docs/reviews/bezier-patches/t09c-<x|y>-handoff.md` and return it as partial.
