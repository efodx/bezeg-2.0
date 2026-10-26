# The future of Bezeg

Chapter example flow confirmed, 2026-10-26: every chapter guided example needs an image of its actual prepared starting graph with an observation caption. Interleave examples with the relevant teaching prose, merge substantially overlapping short and longer examples while preserving distinct learning goals, and rewrite/split both languages as needed. Implementation is authorized and in progress; see the [bounded spec](specs/illustrated-chapter-examples.md), [task queue](tasks/illustrated-chapter-examples/README.md), and [acceptance record](reviews/illustrated-chapter-examples/acceptance.md). The curriculum audit maps 175 source placements to 56 retained examples; final runtime and media acceptance remains outstanding.

Learning consolidation confirmed, 2026-10-26: Learn leads through chapter sections into **Guided examples / Vodeni primeri**, then back to the owning section. All chapter graph activities share this experience, from a single prompt to multiple guided frames. Completion keeps the graph available with an explicit continue-in-chapter action; midway return remains available. Catalog guidance opens the same chapter-owned example. Implemented and locally accepted; see [verification and coverage limits](reviews/learning-consolidation/acceptance.md) and see the [consolidation acceptance criteria](specs/chapter-owned-guided-learning.md#consolidated-learning-flow--confirmed-2026-10-26).

Learning correction, 2026-10-26: guided graph lessons are activities within their owning chapter, rather than a parallel learning destination. Learn leads to chapters; chapter sections contain guided activity entry points. The workspace presents chapter identity and guided frames together, with one activity owning the graph at a time. See [chapter-owned guided learning](specs/chapter-owned-guided-learning.md).

Learning update, 2026-10-25: the owner authorized merging chapter reading and guided learning into Learn and writing the missing text in one pass. Learn now includes the existing Bézier chapter, seven bilingual first-draft family chapters, and every available guided lesson. This supersedes the pilot-only rollout scope below; it does not add assessment, accounts or a progress service. See [unified learning](specs/unified-learning.md).

Release-policy update, 2026-10-24: existing Slovenian terminology and English wording are approved; separate language and physical-device/projector/classroom sign-offs are no longer standing gates. Implemented available drafts count as released unless a concrete requirement is missing. The [current policy](guardrails.md#release-policy--owner-decision-2026-10-24) supersedes conflicting historical approval wording below. The Bézier pilot is implemented and released; further chapters remain separate work.

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

## Standalone learning direction — 2026-10-16

The owner extended the long-term direction: Bezeg should teach its concepts with motivation and sufficient mathematical explanation to stand on their own within stated prerequisites. The audience and starting knowledge vary by family, with higher concepts developed first; a complete elementary sequence is not a prerequisite for starting. Practice exercises and assessment are excluded.

The owner accepted readable Study chapters interleaved with focused graph activities, with direct section access for revision. Chapters and standalone exploration share the same Demonstrations; the catalog remains an independent way to find every graph. Lead with intuition and precise statements; include derivations or proofs only when their reasoning or intuition can be made readily apparent through the graph. Bézier curves are the first topic, using the owner's thesis for motivation; see the [chapter content outline](specs/bezier-study-chapter.md). The [standalone learning specification](specs/standalone-learning.md) includes the accepted picture examples, two entry points, additive routes, transient scene/reading state, and verification gates. [ADR 0014](adr/0014-study-chapters-share-demonstrations.md) records the shared ownership decision. This extends the earlier restriction on curriculum navigation while retaining static client-only hosting. The owner authorized specification/reference publication; implementation and final content review remain separate work.

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

