# AB-B-5: chapter card and poster of `bezier-clipping`

Curves handler 66, 2026-11-06. Spec: [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md). **Status: accepted; the browser view of the chapter page is left to the AB-B-6 gate.**

## Chapter card

| Card | First frame | Authored check |
| --- | --- | --- |
| `advanced-bezier.bezier-clipping.bezier-clipping` | The crossing pair at step 0, with control polygons and overlapping hulls | 4 curves, 6 points, 2 polygons, 6 segments; the whole action list is compared, so another pair, step or overlay fails |

The two hulls are triangles, each one polygon with three border segments. The curves \(A\), \(B\) and the two control polylines make the four curves. The first capture matched these authored counts without a change.

The family was captured whole. The other three cards keep their image checksums and gain new capture evidence. The preview copy reuses the lesson copy, and it matches the image.

## Poster

The recipe's first capture was viewed and **changed**. With hulls and control polygons on, the two triangles buried the fat line and the kept ranges at poster size. The recipe now turns both off before its four steps, which is what lesson step `clipping-clip-a` shows. The picture holds the band of the fat line, the two thick kept ranges and the faded discarded ends of \(A\). Its window is unchanged, and nothing is clipped.

Flags: `PREVIEW_RECAPTURE_IDS=bezier-clipping`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1`, `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`. Manifest delta by script: 117 to 118 captures, none changed, all 51 motions identical. `POSTER_PENDING` is empty. The capture itself added the asset to `demonstrationPreviewAssets.ts`.

## Checks

| Check | Result |
| --- | --- |
| `node --test` on the inventory and capture scripts | 36 of 36 |
| `node --test scripts/demonstration-preview-capture.test.cjs` | 36 passed, 1 skipped, 0 failed |
| `just typecheck` | Passed |
| `just unit` on poster assets, catalog page, chapter previews | Passed |
| `just check` at `02b280fa` (only this record and the task row dirty) | Exit 0: 607 test files passed and 3 skipped, 11 090 tests passed and 8 skipped, 1452 s, build passed |

The first run of the preview test reported no image `src` for the new card. That is the stale `import.meta.glob` result in `node_modules/.vitest-cache` that [the command guide](../../commands.md) describes: the test passed with `--no-fsModuleCache`, then again after `npx vitest --clearCache`.
