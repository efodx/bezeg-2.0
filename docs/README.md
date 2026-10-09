# Bezeg documentation

This documentation supports planning Bezeg's future and extracting a reusable process for SPAs hosted on GitHub Pages.

- [Future plan](future-plan.md): confirmed direction, intended outputs, and unresolved decisions.
- [Guided lessons spec](specs/guided-lessons.md): bounded content-first learning flow, architecture seams, pilot scope, and acceptance evidence.
- [Current architecture](current-architecture.md): the implementation observed in the repository, including hosting and rendering constraints.
- [Curve architecture assessment](curve-architecture-deep-dive.md): drawing data flow, functionality preservation and decomposition recommendations.
- [Curve ownership spec](specs/curve-ownership-refactor.md): the first bounded implementation of numeric inputs, runtime ownership and figure capture.
- [Curve ownership verification](reviews/curve-ownership-refactor.md): implementation boundaries, review repairs and verification evidence.
- [ADR 0006](adr/0006-model-input-ownership-before-renderer-migration.md): numeric model ownership and a staged renderer decision.
- [Capability map](capabilities.md): active demonstrations and shared user workflows.
- [UI functionality](ui-functionality.md): current workspace, selection, controls, presets, and figure export, described in English with Slovenian UI labels.
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
- [ADR 0001](adr/0001-static-client-only-app.md): accepted static, client-only architecture constraint.
- [ADR 0002](adr/0002-guided-lessons-static-content-and-graph-capabilities.md): accepted boundary between static lesson content and typed graph capabilities.
- [Guided lesson runtime task](tasks/guided-lessons/implement-guided-lesson-runtime.md): executable feature slice.
- [Pilot content task](tasks/guided-lessons/study-and-fill-pilot-content.md): executable mathematics and content study slice.
- [Domain glossary](../GLOSSARY.md): agreed project vocabulary.
- [Contributor instructions](../AGENTS.md): concise guidance for agents working in this repository.

Status: current functionality documented from source inspection on 2026-10-08, alongside the confirmed planning direction. UI documentation describes the existing interface rather than a user tutorial. The shared workspace is implemented on all 26 active graph routes; physical-device, projector, and classroom review remain follow-up work. The first Bézier drawing experiment adds mathematical checks and desktop production measurements; the first phone comparison still lagged, and further diagnosis is in progress. A broader runtime, accessibility, and hosting audit and proposed migrations remain future work.

The bounded Guided lesson direction was agreed on 2026-10-09. The first client-only runtime and three pilot content drafts are now implemented; owner/subject-matter review and classroom/device review remain open before the pilots are called classroom-ready.

