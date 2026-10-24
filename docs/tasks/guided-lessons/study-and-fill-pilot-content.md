# Study and fill the pilot guided lessons

**Source spec:** [Guided lessons](../../specs/guided-lessons.md)
**Architecture decision:** [ADR 0002](../../adr/0002-guided-lessons-static-content-and-graph-capabilities.md)
**Status:** released under the [owner decision, 2026-10-24](../../guardrails.md#release-policy--owner-decision-2026-10-24). Existing wording is approved; separate language and physical-device/projector/classroom gates are removed. Concrete missing functionality, defects and verification gaps remain follow-ups. This supersedes conflicting historical release criteria below.

## Goal

Study the mathematics and pedagogy behind the three pilot Demonstrations, then produce and encode accurate, localized Guided lessons that match the graph's actual behavior.

## Dependencies

- [Guided lessons spec](../../specs/guided-lessons.md)
- Existing mathematical implementations, demonstrations, prompts, and graph controls
- The content contract from [Implement the guided-lesson runtime](implement-guided-lesson-runtime.md)

Research and drafting proceeded in parallel with the runtime task. The static content is now encoded and integrated through the agreed content contract; final owner/subject-matter review is still required.

## Scope

Study and fill exactly these pilots:

1. ordinary Bézier curve (`bezier`),
2. De Casteljau construction (`decasteljau`), and
3. cubic PH curve (`ph-cubic`).

For each pilot, create a bounded linear lesson of approximately 5–7 steps. The final content should cover only claims the graph can demonstrate and should connect explanation, notation, prepared scene, learner action, observation, and free exploration.

## Research and content deliverables

For each pilot lesson, prepare a reviewable brief containing:

- learning goal and assumed prerequisite knowledge;
- the mathematical definitions, formulas, invariants, and terminology used;
- one or more worked examples with values that can be checked against the graph;
- the exact prepared scene and expected visible result for each relevant step;
- learner-facing observation/reflection prompts without hidden correctness assumptions;
- Slovenian final copy and an English counterpart;
- authoritative sources for mathematical claims;
- correspondence notes where the implementation's construction or parameterization differs from textbook notation;
- edge cases, invalid states, and unresolved questions.

Use authoritative mathematical references for claims and formulas, the existing implementation/thesis material for correspondence with Bezeg, and owner or subject-matter review for final wording. Keep research notes and decisions in the source spec or planning documentation; do not create an external issue or tracker item.

The owner supplied Kevin Štampar's 2024 master's thesis, *Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj*. Use §§2.3–2.5 for the Bézier and De Casteljau pilots, §§5.1–5.7 for the PH pilot, and §§6.1–6.2 to check correspondence with Bezeg's original interface and implementation. The thesis is an important project source, but it does not replace current-source checks or independent subject-matter review.

## Content rules

- Preserve the established glossary and localization terminology unless a correction is explicitly reviewed.
- Keep formulas and mathematical symbols independent of translation.
- Do not describe a visual approximation as the exact mathematical construction.
- Do not promise an action the pilot graph cannot expose through its typed capability.
- Do not silently teach an invalid rational, degenerate, or undefined state as meaningful.
- Explain what changes and what remains invariant where that distinction is part of the concept.
- Avoid grading, quiz language, branching, or claims that a learner has understood something merely because they clicked Next.

## Acceptance criteria

- All three pilot lessons have reviewed goals, prerequisites, formulas, examples, expected observations, source references, and unresolved-question handling.
- Each lesson contains approximately 5–7 supported linear steps.
- Every declared scene and Graph action matches an existing or explicitly approved pilot capability.
- Numerical examples and expected visual observations agree with the implementation and relevant mathematical checks.
- Slovenian is complete and classroom-readable; English is complete as the supported counterpart.
- Owner or subject-matter review records approval or specific follow-up before the pilot is called classroom-ready.
- The final content is encoded through stable content IDs without changing routes, Preset contracts, or mathematical algorithms.

## Verification

- Check formulas and worked examples independently from the UI where practical.
- Compare every prepared scene with the graph in a production build.
- Review each step in Slovenian and English, including notation, accessible labels, error states, and line wrapping in desktop, projection, and narrow layouts.
- Run focused content/schema tests that detect missing locale counterparts, duplicate/unknown IDs, unsupported actions, malformed formula blocks, and missing pilot coverage.
- Run the feature task's mathematical and interaction checks before declaring the content classroom-ready.

## Implementation note

The three six-step pilot lessons are encoded in [`src/learning/content/guidedLessons.ts`](../../../src/learning/content/guidedLessons.ts), with schema/content tests in the adjacent test file. The content cites the owner-supplied Štampar thesis for the Bézier, De Casteljau, and PH claims and records the implementation correspondence. The lessons are released under the current owner policy; concrete missing checks remain follow-ups rather than general language or classroom approval gates.
