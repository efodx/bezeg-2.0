# Implement the guided-lesson runtime

**Source spec:** [Guided lessons](../../specs/guided-lessons.md)
**Architecture decision:** [ADR 0002](../../adr/0002-guided-lessons-static-content-and-graph-capabilities.md)
**Status:** implemented; interaction and classroom review pending

## Goal

Implement the reusable client-only runtime that presents an optional content-first Guided lesson on an existing Demonstration route and safely hands the learner into graph exploration.

## Dependencies

- [Guided lessons spec](../../specs/guided-lessons.md)
- Existing `Demonstration` metadata and `DemonstrationWorkspace`
- Existing graph ownership, Preset, localization, and disposal contracts
- [Study and fill pilot content](study-and-fill-pilot-content.md) for the static pilot content consumed by the runtime

The runtime and content tasks were implemented in parallel. The runtime now consumes the static pilot content through the typed adapter.

## Scope

1. Add a typed lesson-content/runtime boundary keyed by `DemonstrationId`; keep long content out of route metadata and graph classes.
2. Add opt-in Learn entry and same-route content-first, graph-exploration, and free-exploration states without changing existing paths.
3. Implement linear step navigation with Back, Next, Exit/Cancel, progress, and accessible live updates. Do not gate Next on inferred learner behavior.
4. Capture an in-memory pre-lesson graph state, apply declared Lesson scenes through graph-owned capabilities, restore on Exit/Cancel, reset the current step deterministically, and leave the final scene after completion.
5. Define the narrow typed graph-capability interface and pilot adapters for the ordinary Bézier, De Casteljau, and cubic PH demonstrations. Reject unsupported actions with an actionable error.
6. Reuse existing supported constructions and animation semantics. Add lifecycle-safe scheduling with explicit Play/Pause/Replay/Stop where a pilot step needs it; no autoplay or hidden pointer simulation.
7. Preserve the existing inspector, graph, presentation mode, presets, exports, localization subscriptions, and mathematical ownership.

## Out of scope

- new mathematical constructions or changes to curve algorithms;
- lesson routes, backend persistence, accounts, cloud sync, or a CMS;
- branching, quizzes, assessment, adaptive progression, or cross-demonstration prerequisites;
- changing Preset keys, DTOs, local-storage data, or import/export;
- renderer/build-tool migration or broad performance optimization;
- final pilot prose, formulas, translations, or source study (see the content task).

## Acceptance criteria

- Existing direct routes, catalog links, Presets, imports/exports, and unknown-route behavior remain unchanged.
- Learn entry is optional; direct graph use remains the default for existing links.
- Content-first lesson order is keyboard accessible and usable at narrow-screen touch sizes.
- Observation frames collapse the lesson context so the graph remains fully visible and interactive; the full overlay can be restored with Continue lesson.
- Back/Next/Exit/Cancel/completion follow the meanings in the source spec; Back and Next are exposed as narrow, full-height graph-overlay edge rails without arrow glyphs, and Exit is an accessible close icon. Earlier scenes are revisited through Back rather than a separate Reset control.
- Lesson state is session-only and never changes browser-local Presets.
- Graph capabilities are declared by the graph layer, are type-checked/validated, and do not manipulate JSXGraph or rendered controls from lesson content.
- Animation cancels on component unmount, route change, scene reset, and explicit stop; stale frames cannot mutate a disposed board.
- Slovenian and English changes preserve the current step, scene, and mathematical state.
- Unsupported actions produce a visible actionable error and do not partially mutate the scene.
- Existing relevant mathematical tests pass, and prepared pilot scenes have focused numerical/construction checks.

## Verification

- Add focused interaction tests for entry, content-first order, navigation, step restore, pre-lesson restore, route changes, unsupported actions, language switching, and preset non-mutation.
- Add animation tests for cancellation, pause/replay, stop, unmount, and stale-frame protection.
- Run TypeScript and the production build using existing scripts.
- Review desktop, projection, narrow, keyboard, and touch-sized controls in the browser.
- Measure representative pilot graph interactions and animation in a production build. Separate React work, board updates, construction/evaluation, and settled input before proposing any optimization.
- Run the relevant Bézier/PH mathematical checks and inspect that visible constructions remain mathematically faithful.

## Documentation follow-up

Update `docs/current-architecture.md`, `docs/capabilities.md`, `docs/ui-functionality.md`, and `docs/roadmap.md` after implementation, not merely when the runtime skeleton lands. Record any route, Preset, or accessibility behavior change explicitly.

## Implementation note

The runtime implementation is complete for the three pilot demonstrations. The remaining work is browser/projection/narrow-screen review, owner/subject-matter review, and any fixes found during that review. No route, Preset, local-storage, or export contract changed.
