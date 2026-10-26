# Chapter-owned guided learning acceptance

Source: [bounded specification](../../specs/chapter-owned-guided-learning.md). The staged source was isolated in `.command-logs/chapter-owned-snapshot/` at base `f2f628e61e51412901245b206e2009ab3d688d24`. It deliberately excludes concurrent compact chapter exploration work. Shared reader and LearningPage test files were staged from index-only variants; their unrelated working-tree changes remain outside this change.

## Review dispositions

- Engineering/mathematical review found no changed mathematical meaning. Its P2 legacy owner finding was repaired: valid legacy chapter/section/demo triples resolve through authored owners before normalization. Ownership and legacy workspace assertions passed in the final staged snapshot.
- The workspace lifecycle coverage gap was closed by a second regression that starts a prepared activity and clicks Learn synchronously through the workspace, checking capture before lesson application and checkpoint restoration on chapter return. The original overlap regression was observed red before implementation.
- Independent UI review identified missing Bézier return focus. Chapter hash restoration now focuses the heading; guided return selects that exact section while retaining activity checkpoints. Browser focus verification is recorded in the smoke report.
- A recovery alert appeared twice during normal exit confirmation. The inline alert is now suppressed while that dialog owns the error; the stable full unit run and final focused snapshot run passed.

## Automated evidence

- Full stable main-checkout unit suite: `just unit --maxWorkers=4`, passed, 382.5 seconds; `.command-logs/2026-10-26T09-00-59-225Z-99468-04733b5a.log`. This checkout included concurrent compact changes; final lint-only cleanups followed it.
- Final isolated staged snapshot: `just lint src tests`, `just typecheck`, focused workspace/chapter/LearningPage/GuidedLesson tests and `just build` all passed. Logs under that snapshot: `2026-10-26T09-05-40-390Z-91464-0c74dd97.log`, `2026-10-26T09-06-02-538Z-84344-ebbd0758.log`, `2026-10-26T09-06-21-423Z-100612-77431ffe.log`, `2026-10-26T09-06-43-617Z-98092-ff5f702d.log`.
- `git diff --cached --check` passed before final evidence staging.
- Final isolated production browser run: `just smoke-built --port 4399 tests/standalone-learning.smoke.spec.cjs tests/unified-learning.smoke.spec.cjs --workers=2`, all 27 tests passed in 43.3 seconds. Snapshot log: `2026-10-26T09-11-26-289Z-20916-92f8cc08.log`. Coverage includes every chapter's deep link/refresh/translation, activity round trips and saved state, ownership transition, narrow/enlarged reading, keyboard graph editing, language retention, and history. The only runner warning was conflicting terminal color environment flags.
- Static design scan found no anti-patterns and 25 advisories concerning existing GuidedLesson literal tokens/radii. It does not establish browser contrast or assistive-technology coverage.

Local acceptance completed at 2026-10-26T10:18:49+01:00. Browser acceptance and screenshots are recorded in [smoke.md](smoke.md): prepared activity ownership and checkpoint restoration, hide/reopen and advancement, exact chapter/legacy returns with heading focus, language/history/keyboard, desktop and narrow enlarged-text panel/content access all passed. No page overflow was added by the panel. Baseline dragging, family controls and preset save/reopen were skipped in the bounded manual run. No new mathematical algorithms, lesson prose, preset format, or renderer was introduced. Physical-device, classroom, screen-reader and actual-projector testing were not performed. Publication/deployment verification follows separately.
