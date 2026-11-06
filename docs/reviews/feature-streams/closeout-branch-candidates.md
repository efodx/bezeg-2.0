# Branches to delete after stream closeout

Candidates from the [closeout](../../specs/stream-closeout.md), not yet deleted: auto mode blocks remote branch deletion, so the owner runs it. The list holds branches merged into `master`, plus branches a stream note names as stale or deletable. Other unmerged branches stay, because no note confirms their commits are on `master`. To delete: `git push origin --delete <branch>`. To restore: `git push origin <sha>:refs/heads/<branch>`.

| Branch | Commit |
| --- | --- |
| `bezier-patches-wip` | `2b002db132a52b2a087154f7dff1f771bd9dc351` |
| `curves-l6-envelope` | `2206721386191950af5d406dfeb6ec34ac69c9cb` |
| `curves-lessons-d1-d3` | `d2d86252eb7a5ee553940409bffe9d3743d396d2` |
| `eval-delegation-pilot` | `5f34ac1dfdc26f1ae18458bf8081c6a92daf4270` |
| `fix-ci-master-rebased` | `514dce5c514e9e5b9e5b127994a14591421b88ad` |
| `fix/lesson-playback-overlay` | `5a6ddc0f49a081d88fa00a97b0f8bb438c6ee628` |
| `geometry-batch2-wip` | `8bac9ac3d5b7bb1c9d52bf6e655ba23a1e7e24ba` |
| `geometry-batch3-wip` | `a90124230237016b0442e46d1862cb6c6b28bb30` |
| `geometry-fortune-chapter-wip` | `ebafa4b9129744684f11d9807ee5086fc899ee19` |
| `geometry-fortune-lesson-wip` | `b7d8b470b8f7abd1967a9e8e1c5e6182f6ead554` |
| `maps-06-f2a` | `641d923f99d88b044bc9194a5fc0ad09e4f1dd5b` |
| `maps-graphs-wip` | `7088a02b9dc821bf796af1847b92d8c82b0f6da9` |
| `maps-handler-8-f2b` | `1c9e5ac45b0557eb0b288e8e2daa90abfdf4d467` |
| `maps-handler-8-wip` | `962030ba9f9392a5a4d23781c47346c436aaf79d` |
| `maps-handler-9-f3f4` | `23a8a0cafcc69966f65ceb90ca62c4162c8c4cf6` |
| `maps-handoff-18` | `e44663ad9ca909bc60cd44c6bcba81c4b8514e2a` |
| `maps-wip-pc-switch` | `bb66362b455a156a57896c807b45b09b710c3668` |
| `stream-curves` | `4a446d9a0110a2c5e57674ba998b5a22da279114` |
| `stream-curves-2` | `18cbb4132bf8ecc9d1a3f59679e74ba5d75052a8` |
| `stream-curves-3` | `f763c77c6575623176024eb9a9e68a1150a77df7` |
| `stream-curves-4` | `2f25c6910a8e1271ce9a81f7993bc9a497c2c477` |
| `stream-functions-f3a-wip` | `27f29bfd84bf1a2fd9eaff08e082be47222cbeea` |
| `stream-functions-f3c` | `4acab0bf3e7fc7a25954a74aacd6e4d1ae3a806a` |
| `stream-functions-f3c-wip` | `e96e20e24f63ace7fa3b0e723986d5d39b755d52` |
| `stream-functions-f4-wip` | `0627c191794bbbe6e6d3759b88c6e088894399d8` |
| `stream-geometry-h13` | `d76e4316c591f1ae94dc928fccb9b36989cc53a0` |
| `stream-geometry-h14` | `a2e28387ec4b5f22f3c727d55ccb58c36cf54e63` |
| `stream-learn-ui` | `a97e340fa83bb8a8f6ff95ca0c21f9a19d1c6dfe` |
| `wip/functions-pc-switch` | `54ec5703b504f7159ad2c115977155dc317d4ffd` |
| `worktree-backfill-claude-delegation-log` | `7da93a7935ace275b71fb30bdb9fb6ada20b16fb` |
| `worktree-cohort-b-lessons` | `b031894cf21e78bcb696bafd41667be52f89ecdf` |
| `worktree-demo-preview-mathjax` | `f290520ce9d49f6b1eac13c89baa59b5c441c2c7` |
| `worktree-fit-points-idempotent` | `cd6ab7f99a2c82a68ee6520c012c26c0217d2f83` |
| `worktree-jsxgraph-surface-view` | `afe6f3ebc74788a720a728ed405fd0cf322bbc33` |
| `worktree-stream-maps` | `bdfec8e819e47d60e7ab62f82ae346fce940406f` |
| `worktree-stream-platform-20` | `ef02a5c524008ab07ba0e70943f86c4bd50287fd` |
