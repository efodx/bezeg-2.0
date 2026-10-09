# The future of Bezeg

## Purpose

Create a practical plan for improving Bezeg as an educational app for students and educators. In parallel, document a reusable process for building and publishing a stateless SPA on GitHub Pages, using Bezeg as a concrete case study.

Planning includes improving tool usability, modernizing the visual design, and making curve drawing faster. This effort produces documentation and a phased roadmap; feature implementation follows in separately scoped work.

## Confirmed direction

Confirmed with the project owner on 2026-10-08:

- Students and educators remain the primary audience.
- Study both the general SPA architecture and Bezeg's mathematical features and user workflows.
- Produce reusable GitHub Pages guidance distinct from decisions specific to Bezeg.
- Evaluate technology changes when justified by evidence. The app has no backend, accounts, or server database; browser-local presets and file import/export remain supported.
- Document the architecture, current capabilities, product and engineering guardrails, and a phased improvement roadmap.
- Cover usability, visual design, and curve-rendering performance.
- Prioritize desktop and classroom projection while making essential controls usable on tablets and phones, through touch and keyboard input.
- Keep Slovenian as the default app language, put English support on the roadmap, and write contributor documentation in English.
- Define performance work around responsive control-point dragging and sliders, including complex curves and visible constructions. Measure those interactions before selecting optimizations.
- Allow breaking changes when they improve the app or architecture. Document the reason and user impact; backward compatibility is not a blanket requirement.
- Modernize toward a calm educational workspace, with a prominent graph, clear labels, grouped controls, and the elderflower identity.
- Add bounded, optional Guided lessons to selected demonstrations: explain the mathematics first, then lead into a typed, graph-owned interactive scene without creating a curriculum platform or changing routes and Presets.
- Establish correctness and performance baselines first, then make incremental improvements to controls, appearance, and responsiveness. Put new mathematical features in a later backlog.

## Intended documentation

| Document | Purpose |
| --- | --- |
| Current architecture | Explain the app shell, geometry, graph adapters, state, persistence, and deployment. |
| Capability map | Inventory active demonstrations and shared user workflows; distinguish active routes from unexposed code. |
| Product direction | Define audience, important workflows, supported devices and languages, and success criteria. |
| Contributor guardrails | Explain constraints, mathematical correctness, compatibility, accessibility, and how changes should be reviewed. |
| GitHub Pages SPA playbook | Provide a reusable setup, routing, build, deployment, and verification process. |
| Roadmap | Sequence improvements by dependency and benefit, with evidence needed before implementation. |
| Glossary and ADRs | Capture settled vocabulary and consequential decisions with real trade-offs. |
| Guided lessons spec and tasks | Define the bounded student-learning flow, graph-capability seam, pilot content study, and verification evidence. |

## Decisions for later implementation work

The planning direction is settled. Technology versions, rendering replacements, numeric performance budgets, specific layouts, and particular breaking changes will be decided in the scoped implementation work described by the roadmap. Those choices depend on baselines or prototypes that have not yet been produced. Source inspection alone does not establish measured performance or prove a proposed replacement is worthwhile.

See the [roadmap](roadmap.md) for sequencing and the [guardrails](guardrails.md) for confirmed constraints. Implementation options are clearly distinguished from accepted constraints.

