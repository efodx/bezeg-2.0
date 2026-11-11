# oi-ci-scope-ids: stale REPRESENTATIVE_LESSON_IDS

Finding: no script change needed; the leftover is already closed by two existing guards.
- scripts/ci-change-scope.test.cjs:246-251 asserts every representative id is an `id: '...'` row of tests/guided-lessons.smoke.spec.cjs (CI runs it, browser-smoke.yml:43).
- At runtime, lessonScope (scripts/ci-change-scope.cjs:91) calls lessonGrep, which throws `Unknown lesson id "<id>"` for a stale id; the catch at :121 falls back to allLessons with that message in the reason. Observed with an injected id `zzz` on HEAD: all=true, reason names zzz.
- So a stale id never silently skips rows. I wrote an explicit stale check + test; the test passed before the change (old reason already contained the id), so I reverted both as redundant.

Kept change: scripts/commands.cjs:443 adds scripts/ci-change-scope.test.cjs to `just tooling-test` (it had no just recipe; CI ran it by bare node --test). `just tooling-test`: 144 pass, 0 fail, 1 skipped.

Not verified: just publish tooling recipe cost increase (~+40s observed in tooling-test).
