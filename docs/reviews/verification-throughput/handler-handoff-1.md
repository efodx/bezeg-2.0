# Verification throughput: handler handoff 1

Written 2026-11-08 at this handler's context handoff (soft budget). Source: [spec](../../specs/verification-throughput.md), whose Progress, Follow-ups and Scheduling paragraphs are current. Evidence for every number is in this folder.

## Done

- Plan and evidence: `efc6760b`.
- Phase 0 CI scope: `966ba9d3`.
- Phase 1 slot narrowing plus per-checkout run claim: `e755621a`.
- Phase 1 publish-gate delta retry and lock: `05b9fa0e`, independently reviewed with all four findings fixed.
- Spec status: `97614b1a`.
- Verification was Node tests (75 pass) and lint. The hosted run 42489627250 for `97614b1a` was in progress at handoff, with scope and build green. Check it first with `just ci 97614b1a`.
- The controls stream repaired the red master (`ea98f719`, `1f91b7e9`; run 42488350883 green) and adopted phase 5.

## Owner instruction

"Does the current stream conflict with phases 2–3? If not, continue." I checked: no file conflict.

- The controls stream's queue and state never name the phase 2–3 files.
- Its recent master changes are in `src/graphs/base` controls and `GuidedLesson.css`.
- `src/graphs/base` is a transient-state shared path, so its pushes make local runs select every graph. That is expected, not a conflict.
- The only shared resource is the two test slots. Since `e755621a` a run holds a slot only during Vitest.

**Continue with phase 3, then phase 2.** Phase 3 is cheap and removes most bookkeeping CI failures. Phase 2 is the large CPU saving.

## Next slices (brief inputs)

1. **Phase 3a: derived catalog checks.** Replace the literal totals and hand-kept id lists with derived invariants:
   - `src/demonstrations.test.ts:135,182`, `src/Routes.test.tsx:112`, `guidedExamplePreviewCopy.test.ts:23` (the literal 118);
   - the count tables in `lessonCatalog.test.ts`, `familyChapters.test.ts`, `PresetCatalog.test.tsx`.

   The invariants: every registered Demonstration has a route, copy, poster and home card, and every lesson has a smoke row. Keep a count only where the count is the requirement. Each rewritten assertion must still fail on an injected fault, e.g. a missing route. Churn evidence: `unit-audit.md`. Failure history: `ci-history.md` (12 stale-count and 5 generated-image runs).
2. **Phase 3b: always-run tier.** `check-changed` (scripts/commands.cjs) also runs the catalog-loop and content-lint files (about 2 s total; list them in `unit-audit.md`).
3. **Phase 3c: static selector check.** The gate (or `check-changed`) warns when a slice removes a CSS class, `data-*` attribute or `aria-label` still referenced in `tests/*.cjs`.
4. **Phase 2: generalize `scripts/transient-state-scope.cjs` sampling.**
   - Apply it to `lessonRestoration.part1–4` (561 CPU-s; part 4 alone is 154 s and sets the critical path), `sceneContentAgainstGraphs`, `sceneReplacementContract` and `GraphTransientState`.
   - Locally and in the gate: changed entries plus a fixed sample. CI: everything.
   - Then fold `sceneContentAgainstGraphs`'s guided-scene describe into the restoration walk.
   - Then split restoration into eight parts and rebalance the CI unit shards (518 s vs 353 s).
   - Measure before and after from `results.json`.

## Notes

- Follow-up in the spec: a fresh `just publish` still runs the full checks on its first pass, even when a verified-base record matches.
- `just publish --recipe tooling` refuses `.github/` paths. Use `runtime`, or the manual AGENTS.md sequence, and record why.
- Do not start a full local unit run while the controls stream holds both slots. `just` queues it automatically.
