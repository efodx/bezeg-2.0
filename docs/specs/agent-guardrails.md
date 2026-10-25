# Automated guardrails for recurring agent mistakes

Status: implemented on 2026-10-25.

A retrospective of ten agent sessions (2026-10-24 to 2026-10-25) found mistakes that checks could have caught but only review or a later integration run did:

- An undefined `saved` variable copied into two passing smoke rows.
- Eight guided lessons without smoke rows, although AGENTS.md requires one per lesson.
- A lesson view that clipped its points at desktop and 390 px. Only a by-eye screenshot pass found it, and that pass cost more context than any other step.
- Repeated rebase conflicts in the append-only evaluation log.

This spec replaces each of those with a deterministic check.

## Scope and acceptance

- **Lint.** `just lint` runs ESLint on `src/`, `tests/`, `scripts/` and `tools/`. It is part of `just check` (after TypeScript, before the unit tests) and of the Browser smoke workflow. The rules and the suppression baseline are recorded in [ADR 0017](../adr/0017-eslint-correctness-lint.md). Acceptance: the repository lints clean, and reintroducing an undefined variable into a smoke row fails with `no-undef`.
- **Smoke-row parity.** `src/learning/runtime/lessonSmokeCoverage.test.ts` requires the line-leading `id:` rows of `tests/guided-lessons.smoke.spec.cjs` to equal `GUIDED_LESSON_AVAILABLE_IDS` exactly, and requires every row to be listed in `LESSONS`. The two parameterization rows are renamed from `param-weighted` and `param-uniform-ph` to their lesson ids, so `just smoke-lesson weighted-parameterization uniform-parameterization` selects them. Acceptance: renaming a row id or dropping a row from `LESSONS` fails the test.
- **Lesson view containment.** In the Slovenian forward walk and the 390 px walk, every frame of every lesson must show all visible board points inside the board's bounding box. A row may list `offscreenSteps` with a reason when a step intentionally leaves points outside. The check runs on every row and replaces the three spline rows' local helper with the shared `offscreenPoints` helper.
  On its first run, the check failed three lessons at both widths. Each step used the route's default view while its points lay outside it. All three now set a view on the step:
  - Extrapolation steps 2–4: the curve end at t = 3/2 is (1/2, −9.88), and step 4's extended control points reach (−27.6, −32.8). Steps 2 and 3 use `[-5.5, 5.5, 5.5, -11]` and step 4 uses `[-30, 8, 10, -35]`, matching the rational extrapolation views.
  - Arc length step 5: b = 2π, so the view is `[-0.5, 2.2, 6.9, -1.6]`.
  - Bisection step 6: the cubic's bracket point is (2, 6), so the view is `[-3, 7, 3.5, -3]`.
- **Evaluation log merges.** `.gitattributes` gives `docs/agent-workflow/evaluation-log.md` the `union` merge driver. Acceptance: two branches that each append a record rebase without conflict, keeping both records and putting the upstream record first.
- No app runtime, route, or stored preset changes. The only learner-visible change is the starting view of those five lesson steps.

## Verification

- Lint: `npx eslint .` exits 0. Adding `await expectWeights(page, saved.weights, …)` to the `rational-subdivision` row's `assertUserState` reported `'saved' is not defined  no-undef`. `just tooling-test` covers the `lint` command's argument forwarding.
- Parity: the test passes. Restoring the `param-weighted` id failed the row comparison, and dropping `fixedPoint` from `LESSONS` failed the registration count (44, expected 45).
- Union merge: in a scratch repository, two branches appending to `docs/agent-workflow/evaluation-log.md` conflicted on rebase without the attribute. With it they rebased cleanly, with no conflict markers and the upstream record first.
