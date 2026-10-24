# Bezeg

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and educators exploring and teaching mathematical curves and related concepts. Mathematical prerequisites are topic-specific; there is no single assumed educational level for the whole product (owner confirmed during init, 2026-10-24).

## Product Purpose

Make mathematical concepts understandable through interactive graphs, visible constructions, and explanations. Students explore how changing points and parameters changes the mathematics; educators demonstrate those relationships in class. Success means understandable controls, mathematically faithful results, and responsive exploration.

## Operating Context

Prioritize desktop exploration and classroom projection. Essential workflows must also work with touch and keyboard on smaller screens.

Users can find a Demonstration through the independent catalog, explore its graph directly, or enter a supported Guided lesson. The Learning destination adds readable Study chapters with optional graph activities that reuse the same Demonstrations. The current bilingual Bézier chapter is an implementation draft awaiting owner terminology/content and physical classroom/device review.

The interface defaults to Slovenian and currently supports English through the shared language selector. Contributor documentation is in English. Language preference and saved Presets are browser-local; file exchange supports moving Presets between browsers or the separate original site.

## Capabilities and Constraints

- Static, client-only application: no backend, accounts, or server database. GitHub Pages serves the app at `/bezeg-2.0/`.
- Demonstrations cover foundations, polynomial and rational Bézier curves, splines, PH curves, parameterization, functions, and analysis. Use [the capability map](docs/capabilities.md) for the maintained inventory and operation-specific limitations.
- Supported workflows include manipulating control points and parameters, exploring constructions, optional Guided lessons, browser-local Presets, validated file import/export, figure export, and Presentation mode. Controls vary by Demonstration.
- Study chapters support conceptual learning with topic-specific prerequisites. A complete elementary sequence is not required before developing higher concepts. Practice exercises, assessment, an authoring system, and a cross-device progress service remain outside the agreed scope.
- Preserve mathematical meaning in evaluation, drawing, and constructions. Measure representative dragging and slider interactions before selecting rendering optimizations or replacing JSXGraph.
- Keep the graph prominent and explain the effect of controls. Keep hosting and app-shell concerns separate from mathematical features.
- Breaking changes are allowed when justified; document their reason and user impact, including routes and stored Presets.

## Brand Commitments

Keep the Bezeg name and elderflower identity. The agreed direction is a calm educational workspace with understandable labels and grouped controls. These are existing commitments, not a new visual system or permission to redesign the interface.

## Evidence on Hand

- [Product and engineering guardrails](docs/guardrails.md) and [agreed direction](docs/future-plan.md): confirmed constraints and longer-term learning direction.
- [Capability map](docs/capabilities.md): current Demonstrations, workflows, representative graph media, and review limitations.
- [Localization guidance](docs/localization.md): implemented Slovenian/English behavior and terminology-review requirements.
- [Standalone learning evidence](docs/reviews/standalone-learning/implementation.md): implemented chapter/activity flow and outstanding review.
- [Developer commands](docs/commands.md): verification and local preview workflows. Existing implementation uses React, TypeScript, Vite, and JSXGraph; roadmap candidates do not imply migration decisions.

These linked records retain their detailed authority. This file summarizes product context for future design work; it does not replace specifications or establish measured usability, performance, or classroom-readiness claims.

## Product Principles

1. Teach through observable relationships between a graph, its controls, and the mathematics.
2. Preserve mathematical correctness through design and performance changes.
3. Keep independent exploration available alongside optional structured learning.
4. Make classroom demonstration clear while supporting essential use on smaller devices.
5. Keep the product usable without accounts or server-side storage.

## Accessibility & Inclusion

Support essential touch and keyboard workflows, readable classroom projection, and understandable control labels and states. Keep Slovenian and English counterparts aligned. Respect reduced-motion preferences in demonstration previews. Physical classroom/device validation and final learning-content review remain outstanding; no blanket accessibility conformance claim is established here.
