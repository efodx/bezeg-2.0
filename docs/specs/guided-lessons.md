# Guided lessons

**Status:** runtime and available pilots released. The [2026-10-24 owner policy](../guardrails.md#release-policy--owner-decision-2026-10-24) removes separate language and physical-device/projector/classroom approval gates; concrete missing checks and UX findings remain follow-ups. This policy supersedes conflicting historical release criteria below.
**Agreed:** 2026-10-09
**Owner direction:** guide students through selected mathematical demonstrations without turning Bezeg into a course platform.

## Problem

Bezeg presents interactive graphs, controls, and short **Preizkusi in opazuj** prompts. The implemented pilot now adds a small, reviewable learning flow that connects mathematical explanation to deliberate graph exploration while preserving the existing graph-centered workspace.

This feature must preserve the graph-centered workspace, existing routes, browser-local presets, mathematical ownership, and static client-only hosting. It must also avoid reviving the rejected question-first workspace variant: a Guided lesson is a flow that leads into graph exploration, not a permanent prompt block that displaces the graph.

## Product decision

Attach an optional, short, self-paced **Guided lesson** to selected existing **Demonstrations**. A lesson is an ordered sequence of **Lesson steps**. A step may explain a concept, show notation, prepare a **Lesson scene**, invite a graph action or observation, and hand the learner back to free exploration.

The first release is a small pilot for:

- the ordinary Bézier curve (`bezier`),
- De Casteljau construction (`decasteljau`), and
- the cubic PH curve (`ph-cubic`).

The feature should be reusable across all 26 demonstrations, but no other demonstration is promised classroom-ready by this plan.

## Learner experience

1. Existing direct demonstration URLs continue to open the current graph workspace.
2. The catalog and workspace expose a clear entry to the optional Learn flow.
3. The graph-anchored overlay presents the current idea and notation in bounded Explanation or Calculation frames before advancing with **Next**.
4. **Next** advances through the current step's frames and prepares its Lesson scene on the same route. The learner can close the lesson at any time and continue with the graph.
5. Explanation, Calculation, and Observation frames open in the overlay with the graph visible but temporarily non-interactive, so the task is read before it is performed. **Observe on the graph**, **Hide instructions**, or Escape minimizes the reading card into a compact labeled tab at the graph's top-left and releases graph interaction. Clicking the tab reopens the same frame, including in Presentation mode. Previous/Next and explicit Exit remain inside the expanded overlay. Hiding and reopening never reapply the scene, advance progress, or replace the board. The feature does not verify understanding or block navigation in v1. See the [2026-10-25 overlay decision](lesson-overlay-minimize.md).
6. Horizontal Previous/Next text buttons and step/frame progress remain reachable in the persistent action region. The opaque reading surface prevents graph labels competing with prose. Short reading overlays use natural content height; long prose scrolls internally between persistent controls on all screen sizes. Moving backward reapplies earlier scenes. Same-frame hide/reopen retains reading position; a newly selected frame starts at its heading. New lessons start expanded, and frame changes preserve the visibility choice. Hiding instructions pauses playback; reopening never restarts it. Focus moves immediately to the compact tab on hide and to reading content on reopen; fading controls are inert.
7. Completing the lesson leaves the final scene available for free exploration.

On entry, the lesson captures the current in-memory graph state. Lesson scenes are temporary and do not write local-storage presets. Explicit early exit pauses playback and opens confirmation explaining restoration and unsaved progress. Cancel or Escape dismisses only that confirmation; confirmed exit restores the captured state before closing. Completion retains the final scene. Moving backward or forward re-applies the target frame's declared scene. No lesson progress or animation position is persisted.

Desktop and projection layouts keep the graph prominent once exploration begins. Narrow layouts keep the content-first reading order and retain keyboard and touch access to the lesson controls.

## Domain model

The agreed vocabulary is recorded in [GLOSSARY.md](../../GLOSSARY.md).

- A **Guided lesson** is an ordered educational sequence attached to one Demonstration.
- A **Lesson step** is one learner-facing unit in that sequence.
- A **Graph action** is a typed, learner-visible operation a Demonstration exposes to a lesson.
- A **Lesson scene** is a temporary graph configuration used to illustrate a step.
- **Lesson progress** is the current in-memory position in a lesson.

Lesson content is not a Preset, and a Demonstration remains the route/catalog/graph product unit. Do not use “tool” for the whole example.

## Architecture boundary

The implementation introduces five bounded seams:

1. **Content seam.** Keep route identity and catalog metadata in `src/demonstrations.ts`, but store lesson content in a separate static, typed module keyed by `DemonstrationId`. Content includes stable IDs, localized prose blocks, formula/notation blocks, learner prompts, scene metadata, and optional animation metadata.
2. **Graph-capability seam.** Each pilot graph exposes only declared capabilities to the lesson runtime. A capability may set a known parameter, show a known construction, select a known curve, apply a prepared control-point state, or start/stop a supported existing animation. Unsupported actions are explicit errors, not silent no-ops.
3. **Lesson-scene seam.** Lesson scenes use an in-memory checkpoint or equivalent session state. They must not reuse the browser-local Preset format as hidden curriculum data and must not mutate stored presets.
4. **Animation seam.** Animation scheduling is lifecycle-aware: it cancels on unmount, route change, scene reset, and explicit stop; exposes pause/replay state; avoids stale timestamps; and distinguishes progress from board rendering. Autoplay is off by default.
5. **Workspace seam.** The workspace owns entry, step navigation, presentation, and accessible controls. The lesson runtime does not reach into JSXGraph, simulate DOM clicks, or construct mathematical objects while React renders controls.

The graph layer remains responsible for cache invalidation, board updates, auxiliary-object ownership, and disposal. Geometry remains independently testable under `src/bezeg`. A visible De Casteljau construction must continue to use its full construction data; point-evaluation optimizations must not replace a teaching construction.

## Lesson content shape

The pilot is linear and bounded. Each lesson should contain approximately 5–7 steps, using only the sections that help the concept:

1. purpose and prerequisite,
2. mathematical idea and notation,
3. a prepared scene,
4. an intentional graph action,
5. an observation or reflection,
6. a handoff to free exploration.

There is no branching, quiz, adaptive path, assessment engine, or lesson-authoring system. A step may offer an explicit “show this” operation, but hidden pointer simulation is not allowed. Automatic scene setup and learner-visible interaction remain distinct.

Content is localized through stable content IDs. Slovenian is the default; every shipped pilot step has an English counterpart. Formulas, symbols, route IDs, action IDs, and user-authored preset names are independent of translated wording.

## Completed implementation slices

The historical handoff details are consolidated in the [lesson implementation history](../reviews/lesson-implementation-history.md#guided-lesson-runtime-and-pilot-content). The current implementation evidence and UX audit are linked below.

### Runtime

Implement the reusable lesson runtime, typed graph-capability seam, in-memory lesson scenes, accessible navigation, and lifecycle-safe optional animation. Prove the contract with the three pilot content definitions and adapters where existing graph behavior is sufficient. Do not add new mathematical constructions.

### Pilot content

Study and fill the three pilot lessons. Produce a reviewable brief for each with learning goals, prerequisites, exact mathematical claims and formulas, worked examples, expected graph observations, Slovenian copy, English draft, sources, and unresolved questions. Then encode the reviewed content against the feature contract.

The two slices were implemented in parallel. The runtime consumes static pilot content through the adapter seam. The [current release policy](../guardrails.md#release-policy--owner-decision-2026-10-24) governs availability; the UX audit records concrete follow-ups.

## Current implementation evidence

Historical cohort findings and exact residual coverage limits are consolidated in the [lesson implementation history](../reviews/lesson-implementation-history.md#guided-lesson-runtime-and-pilot-content).

- Runtime model, session/checkpoint handling, animation driver, and UI live under [`src/learning`](../../src/learning).
- Pilot content is stored separately in [`src/learning/content/guidedLessons.ts`](../../src/learning/content/guidedLessons.ts) and is covered by schema/content tests.
- Focused verification of the framed runtime and pilot content: 5 suites and 24 tests passed.
- Production build succeeds with existing lint/autoprefixer warnings.
- Full suite: 15 suites and 86 tests passed; the remaining failure is the pre-existing starter `src/App.test.tsx`, which renders `App` without a router and still expects “learn react”.
- Browser, projection, touch, classroom, and owner/subject-matter review remain follow-up evidence.

## Scope exclusions

- no full curriculum, course navigation, prerequisites engine, branching, quizzes, grading, or authoring CMS;
- no new routes, route aliases, backend, accounts, cloud sync, or server database;
- no change to Preset keys, DTOs, local-storage collections, or preset import/export;
- no new mathematical construction or algorithm in the guided-lesson feature;
- no direct JSXGraph or DOM manipulation from content data;
- no autoplay by default;
- no promise that all 26 demonstrations receive reviewed lessons in this release;
- no renderer, build-tool, or broad performance migration bundled into the feature.

## Acceptance criteria

### Feature/runtime

- Existing graph URLs, catalog navigation, presets, and direct links remain valid.
- Learning is opt-in and available on the same demonstration route.
- Content-first lesson state, hideable graph exploration, persistent horizontal navigation, confirmed early exit, and final free exploration work on desktop, narrow screens, keyboard, and touch-sized controls.
- A lesson captures and restores the pre-lesson in-memory state without writing a Preset.
- Step transitions, Exit/Cancel, and completion have the meanings defined above.
- Graph actions are typed, demonstration-owned, capability-checked, and actionable when unsupported.
- Animation is explicit rather than autoplayed, and cancels on unmount, route change, reset, and stop.
- Slovenian and English updates preserve step identity, scene state, and mathematical meaning.
- Existing geometry checks remain green; prepared scenes have numerical or construction-specific checks appropriate to each pilot.

### Content

- The three pilot lessons each have a reviewed bounded sequence and no unsupported graph action.
- Claims and formulas are source-backed and distinguish mathematical truth from implementation behavior and pedagogical wording.
- Each lesson has Slovenian final copy and an English counterpart.
- Worked examples and expected observations match the graph's actual prepared scene.
- Edge cases and invalid states are handled explicitly; rational or degenerate states are not silently presented as valid.
- Owner or subject-matter review is recorded before the pilot is called classroom-ready.

## Verification plan

| Concern | Evidence |
| --- | --- |
| Lesson navigation | Focused interaction tests for entry, content-first order, Back/Next, Exit/Cancel, completion, route changes, and unknown/unsupported actions |
| Accessibility | Keyboard operation, visible focus, semantic labels/live updates, narrow-screen touch targets, and presentation-mode review |
| Localization | Slovenian default, English counterpart, live language switching without step or scene reset |
| Scene safety | In-memory pre-lesson restore; no changed preset keys or export shape; repeated entry/exit and navigation |
| Animation | Explicit Play/Pause/Replay controls; cancellation on unmount/route/reset/stop; pause/replay; no stale frame updates; and production measurements separating React, board, construction, and evaluation work |
| Mathematics | Numeric/property checks and exact construction checks for the affected Bézier, De Casteljau, and PH behavior; visible constructions retain their intended meaning |
| Content | Source review, formula review, worked-example review, expected-observation review, and Slovenian/English owner review |

## Compatibility and user impact

This plan adds static application content and session-only lesson state. It does not change routes, preset identifiers, preset files, local-storage keys, or hosting. Existing users can ignore the Learn entry and continue using the graph workspace. If a later implementation changes any of those contracts, it requires a separate decision and migration analysis.

## Related decisions

- [ADR 0001: Keep Bezeg as a static client-only app](../adr/0001-static-client-only-app.md)
- [ADR 0002: Static guided lessons and typed graph capabilities](../adr/0002-guided-lessons-static-content-and-graph-capabilities.md)
- [ADR 0003: Frame-based graph-anchored lesson overlay](../adr/0003-frame-based-graph-anchored-lesson-overlay.md)
- [Completed implementation and pilot history](../reviews/lesson-implementation-history.md#guided-lesson-runtime-and-pilot-content)
