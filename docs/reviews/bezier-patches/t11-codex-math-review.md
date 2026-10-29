# Task 11 independent mathematical review

Reviewed: commits `57fd4d7` and `7a0e104`, plus the dirty content bridge and `patchSceneContent.test.tsx`.
Timestamp: 2026-10-29 07:50:52 UTC.

No blocking mathematical finding. Tensor evaluation validates the unit square; triangular evaluation validates finite barycentric inputs and the shared kernel tolerance, then writes through the triangle-constraining setter. Tensor degree elevation is guarded by directional degree limits and keeps the existing exact elevation/ghost behavior. Triangular elevation uses the kernel's exact one-degree formula and rejects degree 4. Tensor subdivision validates the interior slider range and reads correspondence without changing the net; triangular subdivision remains a transient three-piece preview. The triangular sweep range is `[0, 1 - other]`, so both sweeps stay in the reference simplex. Checkpoint tests cover camera/model restoration, selection and preview state, tensor elevation ghosts, and sweep cancellation. Fixture construction preserves the flat input order; existing triangular kernel/lattice tests exercise canonical indices.

Coverage gap (low priority): `src/graphs/patches/patchLessonActions.test.tsx:166` compares triangular elevation against a kernel initialized from the same fixture ordering, so it does not independently assert that lesson fixture slot `k` corresponds to the documented canonical `(i,j,k)` tuple. The implementation currently preserves order (`src/graphs/patches/lessonPatchFixture.ts:16`), and the existing lattice/kernel tests cover the canonical order; an explicit bridge assertion would make this contract harder to regress.

Checks passed:
- `just unit src/bezeg/impl/patch/triangular-bezier-patch.test.ts src/graphs/patches/patchLessonActions.test.tsx src/graphs/patches/patchCheckpointSweep.test.tsx src/learning/runtime/patchSceneContent.test.tsx src/learning/runtime/lessonCatalog.test.ts`
- `just unit src/graphs/patches/TriangularPatchGraph.test.tsx src/graphs/patches/TensorSubdivisionGraph.test.tsx src/graphs/patches/triangleDomain.test.ts`

Both focused runs passed. No build run. Existing curve lesson mappings are asserted in `lessonCatalog.test.ts` and passed; no route changes were present in the reviewed commits.
