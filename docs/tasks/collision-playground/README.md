# Collision playground tasks

Source: [collision playground spec](../../specs/collision-playground.md), [ADR 0042](../../adr/0042-collision-playground-worker-and-canvas.md). Stream: [collision](../feature-streams/collision.md). Planned 2026-11-07 (owner approved the defaults the same day).

Status lives in this table. The handler updates it in the same push as each accepted slice.

| # | Task | Batch | Depends on | Review | Status |
| --- | --- | --- | --- | --- | --- |
| [CP1](01-collision-model.md) | Pure model: seeded world, step, naive and sweep-and-prune broad phases, circle narrow phase, counters | A | — | Mathematical | accepted 2026-11-07 |
| [CP2](02-worker-host.md) | Worker host, typed protocol, slow-motion stepping, pause/idle/terminate lifecycle | A | CP1 interface | Engineering | accepted 2026-11-07 |
| [CP3](03-measured-limits.md) | Measure step cost per method on the reference profiles; record the limits in the spec | A | CP2 | Handler | accepted 2026-11-07 (naive 4 000, sweep 5 000; MAX_COUNT set with CP4) |
| [CP4](04-run-component.md) | `CollisionPlayground` *Run* mode: canvas drawing, controls, readouts, live region, reduced motion, no-worker fallback | B | CP2 (CP3 limits may land after) | Engineering + UI/accessibility | accepted 2026-11-07 |
| [CP5](05-inspect-component.md) | *Look underneath*: interval shadows, active list, candidate pairs, step-through | B | CP4 | Mathematical + UI/accessibility | accepted 2026-11-07 |
| [CP6](06-chapter-integration.md) | Shared playground block, `FamilyChapterPage` rendering, sweep chapter prose, terms, docs | B | CP4, CP5 | Engineering; notation test | accepted 2026-11-07 |
| [CP7](07-batch-b-acceptance.md) | Batch B acceptance: containment and smoothness measurements, bilingual smoke, `just check` | B | CP3, CP6 | Handler | accepted 2026-11-07 ([matrix](../../reviews/collision-playground/batch-b-acceptance.md)) |
| [CP8](08-polygon-model.md) | Polygon templates: exact hull and convex pieces once per template, SAT narrow phase | C | B released | Mathematical | ready |
| [CP9](09-polygon-mode.md) | Polygon mode and box → hull → pieces overlay; convexity chapter block and prose | C | CP8 | Engineering + UI/accessibility | not started |
| [CP10](10-batch-c-acceptance.md) | Batch C acceptance | C | CP9 | Handler | not started |

**Parallelism.** CP1 runs first, and its exported types are the CP2 interface. CP2 and CP4 may overlap once the protocol types (`collisionProtocol.ts`) are committed. CP4 owns `collisionProtocol.ts` changes after CP2 is accepted.

**Batch C (planned 2026-11-08).** CP8's model is a prerequisite for CP9's protocol and drawing. CP9 owns `collisionProtocol.ts` and the locale key block. CP8 owns `src/compgeo/collisions/`.

**Stop condition.** A miss of spec criterion 2 (containment) or 4 (smoothness) goes to the owner before CP6's chapter blocks are pushed. CP1–CP5 may be pushed earlier, since no chapter mounts them yet.
