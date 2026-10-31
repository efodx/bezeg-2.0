# AB-C-2a brief (handoff-v12): `patch-coons` graph for lesson D4

- **Role:** implementation + tests; edit permission inside the scope below. No commits, pushes, or further delegation.
- **Worktree:** `C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg\.claude\worktrees\stream-curves`, branch `worktree-stream-curves`, clean at the HEAD you find. `node_modules` is a junction to the main checkout: never reinstall or delete it. Do not touch `docs/`.

## Goal
An unregistered Demonstration graph for spec D4 ([spec](docs/specs/advanced-bezier-lessons.md) section "D4", lines 105-118; Terms lines 129-139). ADR: `docs/adr/0028-advanced-bezier-objectives-and-owners.md` item 3 (cubic boundaries; the Coons patch is exactly a bicubic net fed to `TensorProductBezierPatch` and the existing tensor mesh path). Kernel and its conventions: `src/bezeg/impl/kernels/coons.ts` and `docs/reviews/advanced-bezier/ab-1c-kernel.md` (c0 at v=0, c1 at v=1 as functions of u; d0 at u=0, d1 at u=1 as functions of v; `net[i][j]`, i along u; B averages mismatched corners; `coonsCornerCheck`).

## Scope
- New files under `src/graphs/patches/`: `CoonsPatchGraph.tsx`, a scene/model module (`coonsScene.ts`), `coonsPresetCollection.ts` (Preset key `patch-coons`, kept local: never add it to `patchPresetCollections.ts` or `presetCollections`), panels if needed, tests.
- `src/localization/sl.ts` and `en.ts`: new `coons_*` keys in lockstep; reuse existing patch/surface-view keys where they fit. Slovenian default; new terms per `docs/localization.md#choosing-new-terms` and the spec's term table.
- Read-only: `coons.ts`, `BaseSurfaceGraph.tsx`, `patchSceneBuilder.ts`, surface-view modules, existing patch graphs. Do not change them, `patchPresetCollections.ts`, existing patch Presets, routes, catalogue, lessons (registration is gated).

## Pattern to copy
`src/graphs/patches/TensorPatchGraph.tsx` (`BaseSurfaceGraph` subclass: `buildScene`, `geometryChanged`, `hasPoint`, `movePoint`, `importPresetData`, `framedPoints`, `workspaceEdit/workspaceDisplay`, panels) and its tests (`TensorPatchGraph.test.tsx`, `TensorPatchEditing.test.tsx`, `FakeSurfaceView.ts`, `jsxSurfaceLifecycle.test.tsx` for real-view ownership). `buildTensorScene` in `patchSceneBuilder.ts` builds the mesh from a net; a scene has one mesh.

## Decisions (handler, settled)
- State: four cubic boundaries `c0, c1, d0, d1` (4 points each, `[x,y,z]`), `linkedCorners` (default true), `shown: 'lc' | 'ld' | 'b' | 's'` (default `'s'`), plus the usual surface visibility/camera fields you reuse. Default boundaries: the spec D4 default example.
- One mesh: the selected surface's bicubic net (`coonsRuledCNet`, `coonsRuledDNet`, `coonsBilinearNet`, `coonsBicubicNet`). The four boundary curves and their control points are always drawn; the interior control net of the shown surface follows the existing control-net toggle.
- Editable points: the 16 boundary control points. With `linkedCorners` on, the four corners are shared (12 distinct draggable points; moving a corner moves both boundary end points). With it off, each boundary end point moves alone (step 6, "break a corner"). Turning linking back on snaps each corner pair to its average (the kernel's B rule), as one edit.
- Readouts: the four interior control points of the Coons net `P11, P12, P21, P22` (rounded for display) and a corner status from `coonsCornerCheck`: "all four boundaries met" when empty, otherwise the mismatched corners with distances and an explicit "the patch does not interpolate the boundaries" message. Never claim interpolation with a mismatch.
- Presets store the four boundaries, `linkedCorners`, `shown`, plus view/camera as other patch Presets do. Validate imports with actionable errors (wrong point count, non-finite or out-of-range coordinates, unknown `shown`, linked flag with mismatched corners → reject or snap; choose and state it). Data valid at HEAD is unaffected (new key only).
- Board/readout text follows a live language switch.

## Checks (map to acceptance)
- Acc. 1: graph test that the mesh net for `'s'` equals `coonsBicubicNet` of the state and the readout shows (1, 1, 4/3), (1, 2, 1/3), (2, 1, 5/3), (2, 2, 2/3); centre of the shown patch (1.5, 1.5, 0.75). Assert on the scene's actual mesh/net, non-empty.
- Acc. 2: with linked corners, dragging a corner keeps `coonsCornerCheck` empty and the mesh boundary rows equal the boundary control points; unlinking and moving `d1` end reports `u1v1` and the no-interpolation message.
- Acc. 4: dragging rebuilds the mesh (revision bumps; `geometryChanged` true) and the shown-surface switch rebuilds it; disposal follows the existing patch pattern (real-view lifecycle test like `jsxSurfaceLifecycle.test.tsx`); existing `patchPresetCollections` keys unchanged (assert).
- Acc. 6 + restore: Preset export→import round trip equal; `prepareLessonDefaultScene`/`lessonDefaultState` carry imported data; malformed import rejected; relink snaps to averages.
- Order of work (budget): implementation → tests green → the final commands below (tsc, lint, wider unit) → only then about 8 key mutations, each observed failing. Previous workers of this size hit the budget before final checks.
- The settled decisions are also recorded in `docs/tasks/advanced-bezier/README.md` bullet "D4 graph scene".
- Commands, one at a time (loaded machine): `just unit src/graphs/patches/Coons --maxWorkers=2` (adjust the filter to your file names); at the end `just unit src/graphs/patches src/localization --maxWorkers=2`, `npx tsc --noEmit --pretty false`, `just lint src/graphs/patches src/localization`. Use `just`, never bare vitest. Logs to `C:\Users\NonFriedMotherBoard\.claude\jobs\c1c879fd\tmp\abc2a-*.log`.
- Do not use `await act(async () => graph.reset())` under jsdom; use `waitFor`. Shell heredocs drop backslashes; edit with Edit/Write.

## Return (≤ 350 words)
Write the evidence note to `C:\Users\NonFriedMotherBoard\.claude\jobs\c1c879fd\tmp\abc2a-evidence.md` (files, decisions beyond the brief, checks with results, mutations, not verified) and reply with its summary. Flag contradictions with the spec, ADR or the decisions above.

## Budget
Locate with `grep -l`/`-c` before `grep -n`; read ≤150 lines per call; never whole files over 300 lines; logs to files. On a `HANDOFF` message, or past ~30 turns before acceptance, stop at a consistent point, write `C:\Users\NonFriedMotherBoard\.claude\jobs\c1c879fd\tmp\abc2a-handoff.md` and return partial.
