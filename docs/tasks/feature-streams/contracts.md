# Stream: Contracts
Run state: active

Owner of tasks 1, 5 and 4 of the [mathematical runtime contracts queue](../mathematical-runtime-contracts/README.md) (spec: [mathematical-runtime-contracts.md](../../specs/mathematical-runtime-contracts.md)), then lesson-authoring workstream 2. Tasks 2 and 3 belong to the [Controls stream](controls.md), step 3. Rules: [feature streams](README.md). Port 4318. Handoffs: `docs/reviews/feature-streams/contracts/`.

Each task is one slice; the family template does not apply. Update the task's status in the contracts queue when it is accepted.

## Queue

| Step | Task | Review | Browser check | Status |
| --- | --- | --- | --- | --- |
| 1 | [Stable geometric-series evaluation](../mathematical-runtime-contracts/01-stable-series-evaluation.md) | Mathematical | Geometric series route | pending |
| 2 | [Typed conic variants and solver outcomes](../mathematical-runtime-contracts/05-typed-conic-outcomes.md) | Mathematical | Conic routes, if behavior changes | pending |
| 3 | [One live function model authority](../mathematical-runtime-contracts/04-live-function-model.md) | Engineering, plus mathematical if evaluation changes | Function routes and Preset import | pending |
| 4 | [Lesson-authoring workstream 2](../../specs/lesson-authoring-architecture.md#2-lesson-definitions-ownership-and-adaptation). Added 2026-11-07. Write its task file from the spec first | Engineering | Chapter entry, catalog guidance and return | pending |

## Decisions

Handlers decide without asking the owner: record the choice with its reason and rejected alternative in the spec, and continue. The owner asks for a change later if a result is unwelcome. The README's other stop conditions still apply. Git and engineering rules in AGENTS.md are unchanged.

## Shared files

Step 3 changes `BaseFunctionGraph.tsx` and its subclasses, which Controls also edits in its family sweeps. Before step 3, read [the Controls queue](controls.md) on `origin/master`. Migrate one graph family per commit and push each promptly. Leave a family for later while Controls is sweeping it. Persisted validation stays with its current owners: Controls step 7 changes it last.

Step 4 opens Controls step 9 (workstream 3), which consumes its owner identities. It must keep exact-section return, focus and reading position while Codex changes `GuidedLesson.tsx`, so edit lesson lookup rather than the panel.
