# Bezeg documentation

This documentation supports planning Bezeg's future and extracting a reusable process for SPAs hosted on GitHub Pages.

- [Graph visual style](specs/graph-visual-style.md): illustrated C references, graph-preservation constraints, and acceptance evidence required for the follow-up.
- [Graph visual style implementation task](tasks/graph-visual-style/implement-graph-visual-style.md): handoff for a new agent to implement the graph styling on fresh master.
- [Rendered graph style contracts](specs/rendered-graph-style-contracts.md): real JSXGraph marker/state and downloaded-figure regression checks.
- [Fail-fast publication gate](specs/fail-fast-publication-gate.md): handler-owned publication that stops at the first failed prerequisite.
- [Future plan](future-plan.md): confirmed direction, intended outputs, and unresolved decisions.
- [Standalone learning specification](specs/standalone-learning.md): accepted reading/activity picture examples, shared Demonstrations with two entry points, routes and transient state, and the bounded Bézier pilot without practice or assessment; [ADR 0014](adr/0014-study-chapters-share-demonstrations.md) records the ownership decision.
- [First Bézier study chapter](specs/bezier-study-chapter.md): reading/activity content outline motivated by the owner's thesis, graph-friendly derivation, worked example, and [current capability audit](specs/bezier-study-chapter-source-notes.md).
- [SVG export math labels spec](specs/svg-export-math-labels.md): typeset board labels in SVG figure export; [ADR 0008](adr/0008-export-time-mathjax-svg-typesetting.md) records the lazily loaded `mathjax-full` choice.
- [Guided lessons spec](specs/guided-lessons.md): bounded content-first learning flow, architecture seams, pilot scope, and acceptance evidence.
- [Current architecture](current-architecture.md): the implementation observed in the repository, including hosting and rendering constraints.
- [Curve architecture assessment](curve-architecture-deep-dive.md): drawing data flow, functionality preservation and decomposition recommendations.
- [Curve ownership spec](specs/curve-ownership-refactor.md): the first bounded implementation of numeric inputs, runtime ownership and figure capture.
- [React architecture refactor spec](specs/react-architecture-refactor.md): proposed React-layer findings (singleton state, remounts, forceUpdate, inheritance) and a staged scene-store migration.
- [Curve ownership verification](reviews/curve-ownership-refactor.md): implementation boundaries, review repairs and verification evidence.
- [ADR 0006](adr/0006-model-input-ownership-before-renderer-migration.md): numeric model ownership and a staged renderer decision.
- [Capability map](capabilities.md): active demonstrations and shared user workflows.
- [UI functionality](ui-functionality.md): current workspace, selection, controls, presets, and figure export, described in English with Slovenian UI labels.
- [Demonstration action affordances](specs/demonstration-action-affordances.md): accepted minimal ghost actions, catalog density, localized labels, and keyboard/tooltips criteria.
- [Product direction](product-direction.md): audience, devices, languages, tool usability, and visual direction.
- [Localization](localization.md): Slovenian/English behavior, contributor workflow, and mathematical translation review.
- [Localization spec](specs/localization.md): confirmed scope and acceptance criteria.
- [Localization implementation review](reviews/localization.md): checks performed and remaining browser/classroom evidence.
- [Guardrails](guardrails.md): constraints and review evidence for future changes.
- [Roadmap](roadmap.md): implementation sequence and completion criteria.
- [Performance plan](performance-plan.md): baseline scenes and candidate experiments.
- [Bézier performance results](bezier-performance-results.md): evaluation gains, actual phone results, failed mobile acceptance, and the next diagnostic probe.
- [Bézier drawing performance spec](specs/bezier-drawing-performance.md): proposed scope for the shared drawing investigation and mobile verification.
- [Mathematical Bézier evaluation spec](specs/bezier-math-evaluation-performance.md): follow-up investigation of exact math-side costs and optimization candidates.
- [Mathematical Bézier evaluation task](tasks/bezier-math-performance/investigate-and-optimize.md): bounded investigation and conditional implementation task.
- [Tools usability redesign spec](specs/tools-usability-redesign.md): accepted Bézier and PH pilots and the authorized rollout to every active demonstration route.
- [Workspace implementation review](reviews/tools-workspace-redesign.md): the all-route workspace, interaction checks, compatibility, and remaining device/classroom review.
- [GitHub Pages SPA playbook](github-pages-spa-playbook.md): reusable setup and publishing process.
- [Vite migration spec](specs/vite-migration.md): CRA/Jest replaced by Vite/Vitest on Node 24, with parity evidence; [ADR 0009](adr/0009-vite-build-and-vitest.md) records the choice.
- [Continuous deployment spec](specs/continuous-deployment.md): CI checks and gated native Pages deployment, activated on `master`.
- [CI/CD verification](reviews/continuous-deployment.md): hosted CI evidence, local checks, and activation limits.
- [ADR 0010](adr/0010-scheme-driven-bezier-splines.md): accepted scheme-driven Bézier splines (one `BezierSpline`, one `SplineScheme` per kind) replacing the subclass hierarchy.
- [ADR 0011](adr/0011-analysis-family.md): accepted separate Analysis family, omitted from the catalog until it has a demonstration.
- [ADR 0012](adr/0012-iterative-playback-controller.md): accepted typed animation ids and commands plus a shared graph-owned iteration controller for iterative lessons.
- [ADR 0013](adr/0013-iteration-driven-by-scene-actions.md): accepted typed `run-bisection-command` scene action (next-step/reset) for lesson iteration; Play and Pause stay graph controls.
- [ADR 0001](adr/0001-static-client-only-app.md): accepted static, client-only architecture constraint.
- [ADR 0002](adr/0002-guided-lessons-static-content-and-graph-capabilities.md): accepted boundary between static lesson content and typed graph capabilities.
- [Guided lesson runtime task](tasks/guided-lessons/implement-guided-lesson-runtime.md): executable feature slice.
- [Pilot content task](tasks/guided-lessons/study-and-fill-pilot-content.md): executable mathematics and content study slice.
- [Function and calculus concepts spec](specs/function-concepts.md): study of the earlier app, the new functions family, and per-concept lesson plans; [ADR 0007](adr/0007-function-concepts-family.md) records the scope decision and [tasks](tasks/function-concepts/) the concept-by-concept slices.
- [Domain glossary](../GLOSSARY.md): agreed project vocabulary.
- [Contributor instructions](../AGENTS.md): concise guidance for agents working in this repository.
- [Agent workflow evaluation log](agent-workflow/evaluation-log.md): task-level observations used to assess and improve the delegation process.

This is an index: open only the documents relevant to the change.
