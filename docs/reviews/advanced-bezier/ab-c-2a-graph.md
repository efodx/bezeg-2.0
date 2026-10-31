# AB-C-2a: `patch-coons` graph (lesson D4), evidence

Unregistered: no route, catalogue entry or lessons. Sources: the [brief](ab-c-2a-brief.md) and the [worker handoff](ab-c-2a-worker-handoff.md). The first worker (Sonnet `medium`) handed off at its budget with the implementation and most tests done (WIP `5ad7c45`). Handler 8 finished the slice, assisted by a mutation worker and a repair worker.

## Files touched
- `src/graphs/patches/` holds `coonsScene.ts`, `coonsPresetCollection.ts` (key `patch-coons`, local), `CoonsPatchGraph.tsx` and `CoonsPatchPanels.tsx`. Their tests are `coonsScene.test.ts`, `coonsPresetCollection.test.ts`, `CoonsPatchGraph.test.tsx` and `CoonsPatchLifecycle.test.tsx`: 38 tests in all.
- `src/localization/sl.ts` and `en.ts` gain 31 `coons_*` keys in lockstep.
- `src/inputs/OnOffSwitch.tsx` gains an optional `describedBy` prop. Existing callers are unchanged.
- `coons.ts`, `BaseSurfaceGraph.tsx`, `patchSceneBuilder.ts`, the surface view and `patchPresetCollections.ts` are unchanged.

## Decisions beyond the brief
- **Linked imports.** An imported file with `linkedCorners: true` but differing corner pairs is rejected with `coons_linked_corners_differ`. In the app, relinking snaps the corners as one edit.
- **Coordinates.** Coordinates are limited to \(|x|\le 1000\). Unknown fields are rejected.
- **Linked corners.** A linked corner is drawn as one point, its first member (`c0-0`, `c0-3`, `c1-0`, `c1-3`), so 12 points are draggable. Ids of the second member are accepted and mapped to the first.
- **Interior net.** The interior net is drawn as polylines only. The interior readout always shows the Coons patch \(S\), whichever surface is shown.
- **Term.** Slovenian *premonosna ploskev* for "ruled surface". It is recorded in `docs/localization.md`; the basis is in the advanced-bezier tasks README, "D4 graph terms and imports".

## Lifecycle test (handler 8)
The WIP lifecycle test counted one `document` listener after the first unmount. That listener was React DOM's `selectionchange`, which React registers once per document and never removes (react-dom 18.3.1 `listenToAllSupportedEvents`, guarded by `listeningMarker`). After that came 130 listeners on `document.body`, which React registers on the first portal into it. Neither listener comes from the graph. The tensor lifecycle test registered both before its baseline through its warm-up mount. The Coons test now does so with `render(createPortal(<div/>, document.body)).unmount()` in `beforeAll`. Mutation 8, a `document` listener kept from `buildScene`, makes the test fail again, so the warm-up does not hide a graph leak.

## Checks
- **Handler, at `727bcc1`:**
  - tsc was clean after one TS2445 fix: the test now reads `graphSession` through the test subclass.
  - `just lint src/graphs/patches src/localization`: clean.
  - `just unit src/graphs/patches src/localization --maxWorkers=2`: passed.
- **Mutation worker, at `727bcc1`: 9 mutations, all failing at least one test:**
  - the `s` net built from the bilinear net;
  - a linked move updating one end point only, which survived at first and was then killed by `d020f2d`;
  - relinking without the snap;
  - the corner status always "met";
  - the no-interpolation text dropped;
  - a 3-point boundary accepted;
  - a non-finite coordinate accepted;
  - a linked file with mismatched corners accepted;
  - `shown` dropped on export or on import;
  - a `document` listener kept after unmount;
  - `geometryChanged` ignoring `shown`.
- **Repair worker:** each new assertion failed against a deliberate mutation. The selection-clearing code on restore was not mutated.
- **Handler, at `3b674b8`:**
  - tsc: clean.
  - `just lint src/graphs/patches src/inputs src/localization`: clean.
  - `just unit src/graphs/patches/Coons src/graphs/patches/coons --maxWorkers=2`: 38 passed.
  - `just check-localization`, with the production build: passed, with warnings only.
- **Not run:** a smoke test (the graph is unregistered); browser keyboard order and 200% text. These belong with registration.

## Reviews and disposition (handler 8, 2026-10-31)
Both reviews ran in parallel as `bezeg-reviewer` Sonnet on `727bcc1`. Neither found a blocking issue.

**Mathematics: no finding.**
- It confirmed the four nets, the corner pairs (\(c_0[0]=d_0[0]\), \(c_0[3]=d_1[0]\), \(c_1[0]=d_0[3]\), \(c_1[3]=d_1[3]\)) and the average snap, which uses the rule of the kernel's \(B\).
- It recomputed \(P_{11}=(1,1,4/3)\), \(P_{12}=(1,2,1/3)\), \(P_{21}=(2,1,5/3)\), \(P_{22}=(2,2,2/3)\) and the centre \((1.5,1.5,0.75)\).
- It found test gaps. Repairs: hand-computed oracles for the \(L_c\), \(L_d\) and \(B\) nets, linked and unlinked moves at \(u_1v_0\) and \(u_0v_1\), and the corner of \(S\) at a gap as the pair average.

**Engineering + UI: five low findings, all repaired.**
1. The no-interpolation text now names the Coons patch \(S\).
2. The corner status is one polite `role="status"` region, with no permanent `role="alert"`.
3. The linked-corners help is tied to its switch with `aria-describedby`. Handler 8 changed the id from a fixed id to `useId`, so two panels on one page cannot share it.
4. The language test's assertion that was not Coons-specific is dropped.
5. Restore is shown to clear `zMode` and the selection.

The reviewer's question about the `data as CoonsPresetData` cast after the check is answered by precedent: `patchPresetCollections.ts:107` does the same.

## Open for registration (F2b/F3)
- Add `patch-coons` to the Preset collections and `PresetCatalog.test`.
- Browser checks: drag, relink, the shown-surface switch, keyboard order, 200% text, and SL/EN with a live switch.
