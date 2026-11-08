# Product and engineering guardrails

These constraints reflect the owner's planning answers on 2026-10-08. The implementation practices below make those constraints reviewable; they do not select new libraries or authorize deployment.

## Product constraints

- Guided examples belong to chapter sections. Every graph activity launched from Learn uses one instructional surface and session, whether it contains a short prompt or a longer sequence. Completion leaves the graph editable and offers Continue in chapter; midway return restores the owning section's reading position and focus. Catalog guidance uses the same chapter-owned experience, while independent graph exploration remains available. See the [owner's correction](specs/chapter-owned-guided-learning.md), which supersedes the parallel entry model in earlier learning specifications.

- Optimize for learning and teaching curve concepts. Keep the graph central and make the effect of each control understandable.
- Prioritize desktop, with essential touch and keyboard workflows on narrow screens. Presentation mode supports classroom projection of the free-exploration graph.
- Keep Slovenian as the default app language. Plan English support; use English for contributor documentation.
- Preserve the elderflower identity while modernizing the workspace toward clear, grouped controls and a calm visual style.
- Keep the app static and client-only: no backend, accounts, or server database. Local presets and file exchange are allowed. See [ADR 0001](adr/0001-static-client-only-app.md).
- Bounded, optional Guided lessons support selected demonstrations. The owner extended the future direction on 2026-10-16 to self-contained conceptual learning with motivation and family-specific prerequisites, starting with higher concepts. The accepted [standalone learning specification](specs/standalone-learning.md) adds readable chapters and graph activities sharing the existing Demonstrations, while preserving independent catalog/graph entry. Its publication authorizes the specification and reference pictures, not application implementation or a complete curriculum rollout. Practice exercises, assessment, an authoring system, and a cross-device progress service remain out of scope. The current runtime contract remains in the [guided lessons spec](specs/guided-lessons.md).

### Independent study and classroom teaching

Guided lessons are self-paced activities for students working independently, including at home. Verify reading, navigation, and graph interaction at representative browser widths and text sizes.

Teachers use the ordinary Demonstration in free exploration to teach the same mathematical idea in their own way. They can set up a relevant example with a built-in choice, ordinary controls, or a loadable Preset, then manipulate or step the key construction without opening guided instruction. In Presentation mode the graph should be readable and the teaching controls reachable. Classroom coverage concerns the mathematical idea and construction. The lesson's prose, exact steps, framing, and reveal sequence serve independent study.

This scope supersedes classroom-readiness criteria for guided instruction in earlier specifications, decisions, and evidence. The release policy below defines optional evidence and the browser, accessibility, and mathematical checks that apply.

## Release policy — owner decision, 2026-10-24

- Existing Slovenian terminology and English wording are approved. Separate owner terminology/translation sign-off is not a standing gate for existing or future work. Keep bilingual content accurate, type checked and consistent; fix specific wording defects when identified. Guided lesson prose is not final: a student-experience rewrite is under way, starting with the [lesson content pilot](specs/lesson-content-pilot.md), whose writing guide will govern lesson text once approved. New lesson families use [one-shot lesson text](specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31): plausible and type checked, with review limited to the graph.
- Implemented, available drafts count as released unless a concrete missing requirement prevents completion. Track known defects, missing functionality and verification gaps by name; a draft label or absent general sign-off alone does not prevent release. The lesson availability list describes supported released lessons, not a separate owner-approval queue.
- Physical-device, actual-projector and classroom/student-observation reviews are optional follow-up evidence, not release/completion gates. No separate deferral approval is needed. Preserve historical coverage limits without describing unperformed tests as passes. Browser-based responsive, keyboard/touch and accessibility checks appropriate to the change remain required, as do mathematical correctness, automated checks and concrete acceptance criteria.
- This decision supersedes conflicting language/content-approval, physical-device, projector, classroom and draft-release wording in older specs, tasks and reviews. A specific assistive-technology defect or unverified acceptance requirement remains a follow-up; the decision does not declare an accessibility evaluation passed.
- On 2026-11-06 the owner removed the remaining classroom device checks from ADRs, specs and tasks. Performance gates are measured on the desktop reference. Do not add a device check back as a gate.

## Mathematical behavior

Mathematical correctness is part of the product. Performance and visual changes must preserve the intended mathematical meaning. Review polynomial endpoints, subdivision equivalence, degree-elevation invariance, applicable spline continuity, and PH/rational-specific behavior when touching those areas. Choose numeric tolerances appropriate to each operation and record why they are sufficient.

For changes to numerical evaluation, compare representative results before and after, including supported edge cases. A faster curve that changes its shape or hides an invalid input silently does not meet the goal. Never substitute a cheaper drawing approximation for an exact teaching construction without documenting the distinction and its visible effect.

## Architecture practices

- Keep reusable hosting logic and app-shell concerns separate from Bezeg's mathematical features.
- Aim for geometry that can be evaluated and checked independently of React, JSXGraph, and graph-global state. Geometry freshness is tracked by per-point and per-curve version stamps in `src/bezeg`; keep dependency declarations complete when adding derived geometry.
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
| Visual design | Representative desktop and narrow browser views with keyboard and touch access. For teaching workflows, verify the free-exploration graph and its controls in Presentation mode. |
| Build / routing / hosting | Production asset loading, direct deep links, refresh, query/hash preservation, navigation, and unknown-route behavior |
| Persistence / export | Save/reopen, file exchange, invalid import handling, and exported figure review |
| Guided lessons | Content and source review, supported graph actions, scene restore, responsive reading and interaction, keyboard and touch flow, language counterparts, animation cancellation, and mathematical checks |

Scale verification to the change. Cosmetic documentation edits do not require a full app suite. Choose checks that can catch real errors rather than mirroring implementation details.

## Documentation and review

When closing implementation or cleaning up specs, tasks and evidence, follow the [documentation retention policy](specs/documentation-lifecycle.md). Remove completed handoffs from the active queue after preserving unique decisions, acceptance results and remaining gaps.

Update the capability map when demonstrations are added, removed, or renamed. Update architecture and the SPA playbook when ownership or hosting changes. Record resolved domain vocabulary in the glossary. Use ADRs for consequential choices with alternatives and meaningful trade-offs, not every routine implementation detail.

Before implementation, write a bounded spec with acceptance criteria and verification. Use the installed flow as useful: `grill-with-docs → to-spec → to-tickets → implement → code-review → retro`. Keep the spec in `docs/specs/` and create task files under `docs/tasks/<feature>/` only for implementation slices intended to be carried out. Keep decisions and reference-only findings in the spec or planning document; Bezeg uses repository-local documents rather than an external issue tracker.
