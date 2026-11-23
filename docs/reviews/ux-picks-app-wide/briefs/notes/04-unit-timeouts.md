# Unit timeouts: branch vs master (2026-11-23)

Each test alone (two files, 2 workers, `--reporter=verbose`):

| Test | master b2dc3e474 | branch 3a2add334 |
|---|---|---|
| BezierClippingControls "table never shows more than eight rows" | 8.5 s | 41.7 s |
| InversionGraph "object counts per focus and scripted drags" | 5.5 s | 31.6 s |

The branch is 5-6x slower, so no timeout was raised and no product code changed.

Profile (scratch test, removed): the Bezier test makes 504 `next-step` clicks, 34 s on the branch (68 ms per click, about 17 ms on master).
- `layoutBoard`: 516 calls, 13 ms total (not the cause).
- `measureLiveCard`: 517 calls, 25.6 s (about 49 ms per commit, 75 % of the test).
- `getComputedStyle`: about 100 000 calls, 23.4 s inside that. About 195 calls per commit.

Cause: `src/workspace/presenter/BoardCards.tsx:291-296` (the layout effect with no dependency list) calls `measureLive` after every commit, which calls `measureLiveCard` (`src/workspace/layout/measureCards.ts:166`). For Orodja it goes through `measureCard` -> `blockElements` (`measureCards.ts:29-49`), which calls `getComputedStyle(el).display` on every child of the card's panels, recursively; jsdom resolves styles slowly. Any graph step that re-renders the workspace pays this.

Proposed product fix (not made): in `blockElements`, read `el.hidden` and `getBoundingClientRect().height` first and call `getComputedStyle` only when needed (`display: contents` check via a `data-` marker or `el.style.display`), or have the 291 layout effect skip the read when the content key and the card's DOM did not change (for example a MutationObserver flag or the `contentKey`). A cheaper fallback is a test-only stub of `getComputedStyle` caching per element within one effect run.
