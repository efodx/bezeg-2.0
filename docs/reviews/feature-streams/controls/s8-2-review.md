# Step 8 slices 2-3 review (owned standalone scenes)

Read-only review of the uncommitted diff. Tests were not run (another run was in progress).

## Blocking
None.

## Non-blocking
1. src/graphs/base/OwnedScene.ts:41-50 - `constructOrSweep` removes every board object that was not present before construction began. That is safe because construction is synchronous, so no other owner can add objects meanwhile. The contract is not written down, though. Add a comment that `create` must stay synchronous and must not trigger other owners' creations. The sweep also does not undo listeners or subscriptions made before the throw; this relies on the scene constructors registering them last.
2. src/graphs/base/OwnedScene.ts:69-79 - If `create` throws in `reconcile`/`rebuild`, the slot stays empty until the next explicit rebuild; later `sync` calls are no-ops. This equals HEAD's behaviour (ensureScene threw after removeScene). The new test covers it. Acceptable.
3. src/graphs/base/BaseGraph.tsx:874 - `sceneSlot` is not cleared on `unmount`. It is inert (its cleanup released the scene) and is replaced on the next mount. Optionally set it to undefined in unmount.
4. Blossom/Nurbs `private get scene()` is kept only for tests. Acceptable as a test seam, but it should carry a test-only comment, or the tests should read through `ownedScene` via a cast helper.

## Cleared
- One live instance per session: `rebuild` releases first. `reconcile` is a no-op when the slot is empty. The slot is created per mount (BaseGraph.tsx:873), and mount builds through the replaceScene `initialize` hook (line 655), not in render.
- Release clears the slot before disposing and is idempotent. The cleanup is registered after the board and the language cleanup in the session's insertion-ordered Set, so it runs before `freeBoard` (GraphSession.ts:221-232). A late create is disposed and not published (OwnedScene.ts:73-77).
- flushStateChanges (BaseGraph.tsx:239-244): reconcile runs only when a slot exists and the state changed. Other graphs have `sceneSlot` undefined, so their order is unchanged. Graph `onStateChange` previously did the sync itself, so nothing is drawn twice. The only added work is a redundant `sync` after an in-handler `rebuildOwnedScene`; the same happened at HEAD. There is no second imperative listener.
- Third generic `Scene = unknown`: it is defaulted, so the other BaseGraph subclasses are untouched. `sceneDeclaration` returns undefined by default.
- SceneReplacement stays the sole order: disposeScene releases the slot after `disposeFigureScene`. initialize rebuilds. syncReplacedScene reconciles.
- NURBS still rebuilds when degree, knots or point count differ (`fits` unchanged). Blossom keeps knot sync.
- Behaviour change (Blossom replacement now rebuilds on degree/point-count mismatch): correct. HEAD only called `sync()` there, which is wrong for a different structure, and the ordinary-commit path already rebuilt. This is an improvement, not a regression.
- The `disposed` guard in the Blossom drag handler fixes the pinned defect. NURBS already guarded (BSplineNurbsScene.ts:76).
- The deleted unmount/disposeFigureScene overrides are replaced by the session cleanup and the replacement host. The `test.fails` was converted to a real `test`, and a construction-failure test was added with a real assertion (created elements absent from objectsList, `scene` undefined). No assertion was weakened.

## Not verified
Test results, and the OwnedScene.test.ts bodies beyond the titles (the tests were not run).
