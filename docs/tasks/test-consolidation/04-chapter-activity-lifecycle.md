# 4. Separate authored activities from shared visit/history behavior

Status: planned. Independent implementation after the coverage-map format is settled. Source: [specification](../../specs/test-consolidation.md), acceptance 5 and 7–9.

## Scope and entry points

Own `tests/standalone-learning.smoke.spec.cjs` and focused gaps in `src/learning/chapter/ChapterActivityVisit.test.ts` / `useChapterActivity.test.tsx`. Read `docs/specs/standalone-learning.md` and current activity ownership code. Reuse the existing visit module; do not add a second history/snapshot manager.

Six rows currently repeat launch, reading return/focus, Forward, reset and fresh refresh. Distinguish shared browser-history behavior from each activity's independently authored scene and context.

## Implementation and acceptance

- Retain launch/destination/reading-context/authored-scene checks for every activity and detect missing activity rows. Preserve the distinct Bernstein, affine, curve editing and animated De Casteljau outcomes.
- Cover the shared lifetime through the existing visit/hook interface: capture/restore, reset, fresh visit, failure/rollback, lesson handoff, cleanup and independence from the ordinary workspace scene. Add only missing behavioral assertions.
- Keep a documented browser sample for real Back/Forward, reading scroll/focus, refresh/query/hash handling, reset and animation pause/resume semantics. Include the actual browser history bridge; in-memory routing cannot substitute for it. Preserve the separate hosted-404 redirect test.
- Remove repeated history/reset/refresh sequences from other authored rows only when replacement assertions are mapped. Keep graph-specific reset behavior in the graph contracts and browser cases where implementations differ.
- Demonstrate a temporary broken activity restore or history-return behavior is caught, then revert it. Preserve keyboard, narrow/enlarged reading and lesson/ordinary-scene integration cases that are unique.

## Verification and handoff

Run focused chapter/visit/history/content tests, typecheck, build and delegated production smoke for all activity launches plus selected lifecycle sequences. Report unique coverage retained, actual case/action reduction and before/after timings. The expected savings are modest; avoid growing fixture infrastructure that costs more than the six repeated workflows.
