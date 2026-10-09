# Product and engineering guardrails

These constraints reflect the owner's planning answers on 2026-10-08. The implementation practices below make those constraints reviewable; they do not select new libraries or authorize deployment.

## Product constraints

- Optimize for learning and teaching curve concepts. Keep the graph central and make the effect of each control understandable.
- Support desktop and projection first, while keeping essential workflows usable with touch and keyboard on narrow screens.
- Keep Slovenian as the default app language. Plan English support; use English for contributor documentation.
- Preserve the elderflower identity while modernizing the workspace toward clear, grouped controls and a calm visual style.
- Keep the app static and client-only: no backend, accounts, or server database. Local presets and file exchange are allowed. See [ADR 0001](adr/0001-static-client-only-app.md).
- Bounded, optional Guided lessons may explain selected demonstrations before graph exploration, but a full curriculum, authoring system, assessment engine, and cross-device progress service remain out of scope. See the [guided lessons spec](specs/guided-lessons.md).

## Mathematical behavior

Mathematical correctness is part of the product. Performance and visual changes must preserve the intended mathematical meaning. Review polynomial endpoints, subdivision equivalence, degree-elevation invariance, applicable spline continuity, and PH/rational-specific behavior when touching those areas. Choose numeric tolerances appropriate to each operation and record why they are sufficient.

For changes to numerical evaluation, compare representative results before and after, including supported edge cases. A faster curve that changes its shape or hides an invalid input silently does not meet the goal. Never substitute a cheaper drawing approximation for an exact teaching construction without documenting the distinction and its visible effect.

## Architecture practices

- Keep reusable hosting logic and app-shell concerns separate from Bezeg's mathematical features.
- Aim for geometry that can be evaluated and checked independently of React, JSXGraph, and graph-global state. Geometry freshness now lives in `geometryCache`; keep improving its ownership and granularity incrementally.
- Give imperative boards, event listeners, auxiliary boards, and generated objects explicit ownership and disposal. Audit repeated navigation and remounting when changing lifecycle code.
- Treat cache invalidation as part of correctness. A geometry change must invalidate affected results; cosmetic view changes should not force unrelated numerical work without a reason.
- Rendering React controls should not create or mutate graph objects as a side effect. Review existing command builders against this goal during refactoring.
- Avoid replacing the build tool, renderer, UI library, and mathematical implementation in one change. Keep each change attributable and reversible where practical.

## Breaking changes and data

Breaking changes are allowed. Do not impose universal preservation of old routes, preset identifiers, or file formats. Every deliberate break must identify what changes, why it is worthwhile, and what users need to do. Decide explicitly whether an alias, importer, one-time migration, or documented reset is worth providing.

Before changing stored data, keep representative old samples for review and avoid silently overwriting user presets. New import code should validate supported structure and numerical inputs, recognize relevant preset keys, and report an actionable error. Document browser-local storage limits and how to export a backup. Version a new preset format if it needs a reliable evolution path.

## Evidence required for changes

| Change | Relevant evidence |
| --- | --- |
| Geometry / evaluation | Numeric examples and property checks for affected operations |
| Dragging / controls | Representative interaction review, including selected mode and applicable input methods |
| Rendering optimization | Same-scene before/after measurements and correct settled geometry |
| Visual design | Representative normal, narrow-screen, and projection views; keyboard/touch access |
| Build / routing / hosting | Production asset loading, direct deep links, refresh, query/hash preservation, navigation, and unknown-route behavior |
| Persistence / export | Save/reopen, file exchange, invalid import handling, and exported figure review |
| Guided lessons | Content/source review, supported graph actions, scene restore, keyboard/touch flow, language counterparts, animation cancellation, and mathematical checks |

Scale verification to the change. Cosmetic documentation edits do not require a full app suite. Choose checks that can catch real errors rather than mirroring implementation details.

## Documentation and review

Update the capability map when demonstrations are added, removed, or renamed. Update architecture and the SPA playbook when ownership or hosting changes. Record resolved domain vocabulary in the glossary. Use ADRs for consequential choices with alternatives and meaningful trade-offs, not every routine implementation detail.

Before implementation, write a bounded spec with acceptance criteria and verification. Use the installed flow as useful: `grill-with-docs → to-spec → to-tickets → implement → code-review → retro`. Keep the spec in `docs/specs/` and create task files under `docs/tasks/<feature>/` only for implementation slices intended to be carried out. Keep decisions and reference-only findings in the spec or planning document; Bezeg uses repository-local documents rather than an external issue tracker.
