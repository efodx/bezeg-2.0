# 09 Phone presenter

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) requirement A6; [ADR 0065](../../adr/0065-graphs-declare-presenters-render.md). Owner, 2026-11-22: on phones the controls, tools and Guided lessons can be completely redesigned; it is currently hard to follow a lesson or play with the graph; pucks looked like a good direction because they are small and more fits on the graph.

## Goal

A phone layout designed for phones, built as a second presenter over the same declaration and store. It needs its own spec before implementation.

## Steps

1. **Spec with the owner** (`docs/specs/phone-graph-workspace.md`): what a phone shows while exploring and while following a lesson; how parameters are changed (pucks and any phone-specific control); where lesson text and navigation sit so the graph stays in view while a step changes it; which cards exist and how they open. Inputs: the prototype's phone findings in the state note (tap-catcher over the pucks, about 1.5 lines of lesson text above the navigation, coarse touch scrub, chips with one card open, "⋯" menu in the lesson head, pan arrows hidden in lessons) and [the guardrail on smaller screens](../../guardrails.md#independent-study-and-classroom-teaching).
1a. **Existing phone specs:** `docs/specs/mobile-graph-playback.md` and `docs/specs/lesson-mobile-controls.md` describe today's phone behaviour. The new spec says which parts it keeps and marks the rest superseded.
2. **Prototypes** of two or three arrangements on a preview for the owner to choose from, as in the UX challenge.
3. **Implementation** of the chosen design as a presenter; no phone-only branch inside graph code.

## Acceptance

Set by the phone spec. At minimum: a learner can complete a pilot lesson and change every declared parameter with one hand at 360×740 and 390×844; essential touch and keyboard workflows from the guardrails hold; the fuzzer runs with touch actions.

## Until this ships

Owner, 2026-11-22: phones are redesigned at the end, and phone tests are ignored until then. Phones get whatever the desktop presenter gives at a narrow width. This task starts after task 08.

## Phone checks skipped by earlier tasks

Each earlier task adds a row when it skips a phone check. This task replaces or restores every row.

| Check (file, name) | Skipped by task | Why it broke |
| --- | --- | --- |
| De Casteljau Play/Reset beside the t puck at phone width: the narrow-viewport playback slot no longer receives the buttons (`DecasteljauAnimationControls` omits them when the t puck exists); give them a place in the phone presenter | 05 (wire strip) | The buttons moved from Orodja into the strip slot; the phone layout has no strip |
