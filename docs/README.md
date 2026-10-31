# Bezeg documentation

Start with the guidance for the area you are changing. This is an index, not required reading in full.

## Current guidance

- [Guardrails](guardrails.md): product and engineering constraints, including current release policy.
- [Current architecture](current-architecture.md), [capabilities](capabilities.md) and [UI functionality](ui-functionality.md): how the app works today.
- [Commands](commands.md) and [browser checklist](smoke-tests.md): scoped verification and build workflows.
- [Localization](localization.md): language behavior and contributor workflow.
- [GitHub Pages SPA playbook](github-pages-spa-playbook.md): hosting, routing and publication.
- [Agent workflow](agent-workflow.md): delegation and evidence requirements when assigning work.
- [Domain glossary](../GLOSSARY.md) and [architecture decisions](adr/): vocabulary and durable decisions.
- [Documentation retention](specs/documentation-lifecycle.md): completing tasks, retaining contracts and cleaning up records.
- [Completed record cleanup](reviews/planning-record-cleanup-2026-10-24.md): what was consolidated or removed, retained work and verification limits.

## Direction and work queue

- [JSXGraph surface view](tasks/jsxgraph-surface-view/README.md): complete. Patch views drawn with JSXGraph instead of Three.js ([spec](specs/jsxgraph-surface-view.md), [acceptance record](reviews/jsxgraph-surface-view/switch-over.md)).
- [Bézier drawing playground](specs/bezier-drawing-playground.md): approved, unstarted. A pen-tool drawing in the Bézier chapter (Draw at the start, Look underneath at the end), drawn with plain SVG ([ADR 0020](adr/0020-svg-drawing-playground.md)).
- [Bézier patches](tasks/bezier-patches/README.md): new *Bézierjeve krpe* family (tensor-product and triangular). Four planned foundation tasks (JSXGraph upgrade, renderer spike/ADR, shared curve kernels, 3D points) from the [spec](specs/bezier-patches.md); implementation unstarted.
- [Future plan](future-plan.md), [product direction](product-direction.md) and [roadmap](roadmap.md): agreed direction and sequencing. Historical briefs within these documents do not reopen completed work.
- [Planning cleanup and next work — 2026-10-24](reviews/planning-cleanup-2026-10-24.md): reconciled statuses, concrete gaps, proposals and recommended priorities. Recommendations do not authorize all listed work.
- New lesson-family candidates, 2026-10-31: [curricula, CAGD, numerical methods and curve geometry](research/lesson-family-candidates-2026-10-31.md) and [computational geometry](research/computational-geometry-candidates-2026-10-31.md), plus an [expansion with ten further families](research/lesson-family-candidates-2026-10-31-expansion.md) (linear maps, complex maps, triangle geometry, probability, Fourier, dynamics, projective conics, advanced Bézier, optimization, mechanical curves). Research only; no family is authorized.
- [Lesson UX audit](reviews/guided-lessons-ux-audit-2026-10-24.md): observed interaction findings to scope before implementation.
- [Learn landing visual alignment](tasks/learn-landing-visual-alignment/README.md): four planned tasks bringing `/learn` in line with the homepage and catalog look (shell tokens, grid backdrop, two-column opening, strand cards, calmer rows) from the [spec](specs/learn-landing-visual-alignment.md); unstarted.
- [Lesson example improvements](tasks/lesson-example-improvements/README.md): planned batches linked to their source spec.
- [Test consolidation](tasks/test-consolidation/README.md): five ranked implementation tasks for reducing repeated verification while retaining graph, content and browser coverage.
- [Architecture deepening backlog](tasks/architecture-deepening-backlog/README.md): ten module-deepening tasks in four parallel lanes (host, curves, functions, learning) from the 2026-10-25 whole-app review.
- [Feature streams](tasks/feature-streams/README.md): six parallel orchestrator streams that deliver complete features: the architecture backlog, the Learn UI work, and the fifteen new lesson families, with gates and shared-file rules.
- [Lesson rollout reconciliation](reviews/guided-lessons-status-reconciliation.md): remaining evidence ownership and smoke coverage gaps.
- [Performance plan](performance-plan.md) and [Bézier performance results](bezier-performance-results.md): measurement requirements, results and unresolved questions.

## Feature contracts and historical evidence

The [documentation records catalog](documentation-records.md) links feature specs, completed handoffs, source material and release reviews. Use these when changing the corresponding feature or investigating a decision. Their status and newer guidance determine what remains applicable; a retained task is not an active assignment.

Specs live in [specs/](specs/), executable slices in [tasks/](tasks/), and acceptance records in [reviews/](reviews/). Keep useful contracts and evidence without listing every completed handoff in the active queue.
