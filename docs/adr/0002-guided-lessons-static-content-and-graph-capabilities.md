---
status: accepted
---

# Keep guided lessons static and invoke typed graph capabilities

Agreed with the owner on 2026-10-09 as part of the bounded guided-lessons plan. See the [guided lessons spec](../specs/guided-lessons.md).

## Context

Bezeg has 26 route-backed graph demonstrations and short localized prompts, but no reusable model for explaining mathematics, preparing a graph scene, or guiding a learner through several steps. The graphs are React class components backed by mutable JSXGraph boards; geometry and cache invalidation belong to the graph/math layers, while browser-local Presets store user configurations.

The requested feature needs to connect static educational content to existing graph behavior and, where useful, existing De Casteljau animation. It must remain client-only, preserve routes and Presets, keep the graph central, and avoid making lesson data depend on JSXGraph or DOM details.

## Decision

1. Store Guided lessons as static, typed, localized content keyed by `DemonstrationId`, in a module separate from route/catalog metadata and graph implementations.
2. Let each supported Demonstration expose a narrow, typed graph-capability interface. Lesson steps may invoke only declared actions such as setting a known parameter, showing a construction, selecting a curve, applying a prepared state, or controlling supported animation.
3. Keep lesson scenes and progress in memory for the session. Capture the pre-lesson graph state, do not write lesson state into browser-local Presets, restore it on Exit/Cancel, and leave the final scene for free exploration after completion.
4. Extract or introduce lifecycle-safe animation scheduling. Animation must stop on unmount, route change, scene reset, and explicit stop; autoplay is off by default.
5. Keep lesson presentation in the existing route/workspace flow. Do not add lesson routes, a backend, an authoring system, or a full curriculum model.

## Alternatives considered

### Simulate clicks on existing React controls

Rejected. It couples content to labels, DOM structure, timing, and accessibility behavior. It also bypasses graph ownership of invalidation, selection, board updates, and disposal.

### Let lesson components call JSXGraph or mutable curve objects directly

Rejected. It spreads renderer and mathematical ownership into instructional UI, makes unsupported combinations easy to create, and weakens independent geometry testing.

### Put all lesson content in `demonstrations.ts` or one localization string per lesson

Rejected. Route/catalog metadata would become curriculum data, while long prose, formulas, stable step IDs, scenes, and actions need a reviewable structure independent of navigation wording.

### Reuse Preset DTOs as lesson scenes

Rejected. Presets are user-authored, browser-local, route-specific, mutable, and intended for save/import/export. Using them as hidden curriculum state would couple two different contracts and risk changing user data behavior.

### Build a generic curriculum/authoring system

Rejected for this scope. It would introduce branching, identity, persistence, editing, and content-management problems before the three pilot lessons establish whether the learning flow helps students.

## Consequences

### Benefits

- Content can be researched and reviewed independently from graph code.
- Graph adapters retain responsibility for mathematical meaning, cache invalidation, board updates, and disposal.
- Unsupported lesson actions are visible in types and validation rather than failing through UI side effects.
- Existing routes, Presets, hosting, and direct classroom links remain stable.
- The feature can support different graph families without pretending that every control is generic.

### Costs and risks

- Each supported demonstration needs an explicit capability adapter and scene contract.
- Lesson content must be maintained in both Slovenian and English.
- Session-only scenes require careful checkpoint/restore behavior and do not provide cross-device resume.
- Animation may worsen the known mobile responsiveness problem unless it is measured and scheduled carefully.
- A narrow capability interface may need deliberate extension as later demonstrations are reviewed.

## Verification implications

Implementations must test action rejection, scene restore, unchanged Preset data, route changes, language switching, animation cancellation, and repeated mount/unmount. Mathematical checks must cover the actual prepared scenes and must not replace a visible teaching construction with a cheaper approximation. Content review must verify formulas, examples, expected observations, and translations before classroom-ready release.
