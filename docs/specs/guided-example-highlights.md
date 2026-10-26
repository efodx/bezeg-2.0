# Guided example highlights replace chapter figures

Status: planned 2026-10-26; owner request with decisions confirmed the same day. Tasks: [guided-example-highlights](../tasks/guided-example-highlights/README.md). Implementation is not yet authorized.

## Problem

Chapter sections still pair a standalone figure (a Demonstrations catalog capture with a long caption) with a guided-example card about the same subject. The owner's example is the PH curves section *Offsets and singularities*: a large quintic PH figure with a blue offset at \(d=0.5\), followed by the *Quintic PH curve* card whose thumbnail shows only the plain starting curve. The pair repeats one idea twice, and the more interesting picture is the one that does not lead anywhere.

The thumbnail is plain because [illustrated chapter examples A4](illustrated-chapter-examples.md#acceptance-criteria) required each card preview to show the example's prepared *starting* graph and rejected later frames. This spec supersedes that rule.

## Owner decisions, 2026-10-26

1. **Remove all standalone section figures** from every chapter. Chapters contain prose, formulas and guided-example cards. A figure's teaching content survives only through an example card or prose.
2. **Card image shows an authored highlight state**: the moment of the example that best shows its point (for the quintic card, the offset turned on at a chosen distance). Each example authors its highlight recipe; the capture tool reproduces it.
3. **Larger image, still beside the text** on wide screens, stacked on narrow screens.
4. **Rewrite removed figure captions into the card caption.** One short caption describes what the highlight shows. Distinctions from the old caption that still matter to the reasoning (for example, "this is not the worked example") move into prose; otherwise they are dropped.

## Acceptance criteria

**H1 — Figure removal.** No chapter section renders a standalone figure in either language. All 16 current family-chapter figure placements (`familyChapters.ts` `figures` and ordered `figure` items) are removed, and the `figure` ordered-content kind, `FamilyChapterFigure` and their renderer branches are deleted once unused, so section figures cannot silently return. Demonstrations catalog assets remain, since the catalog still uses them. Prose that refers to a removed picture ("the figure above", "zgornja slika") is rewritten. Each removed figure has a recorded disposition: which retained example's highlight or which prose now carries its point, or an explicit "dropped" with reason.

**H2 — Authored highlight recipes.** Each of the 56 retained guided examples has a highlight recipe: the frame to show plus optional ordered learner-equivalent steps applied after the example has prepared its scene (for example, enable offset, set \(d\)). Steps use existing scene or lesson actions rather than synthetic geometry, and must be reachable by a learner following that example's prompt or frames. An example whose starting scene already is its best moment records that choice explicitly; there is no silent default.

**H3 — Highlight capture and validation.** The guided-example capture runner opens the exact example URL in a clean context, reaches the recipe's frame, applies its steps, waits for settled board effects and captures a board-only image. Recipe, resulting scene fingerprint, expected-geometry checks and provenance are stored in the manifest; stale recipes, unreachable frames, failed steps, empty or unchanged-when-change-expected boards, missing files and checksum mismatches fail validation. Images are captured at a resolution that stays sharp at the larger card size. Existing start-scene capture behavior and catalog/Bézier figure capture flows remain intact unless deliberately retired with a commands-guide update.

**H4 — Mathematically faithful highlights.** Highlight geometry is checked like the start scene: numerical or scene assertions for the claims the caption makes (offset distance, weight values, join continuity, and so on). Captions state what is shown and the condition that produces it, distinguish observation from proof and mention approximation where relevant. Graph labels may remain Slovenian; alternative text and captions exist in both languages with equivalent meaning and pass `lessonMathNotation.test.ts` unchanged.

**H5 — Larger card image.** On desktop and projection widths the card image takes roughly half the card width (final ratio chosen in design) beside the title, prompt, caption and *Guided example / Vodeni primer* action; on narrow widths it stacks above the copy. Record before/after screenshots and card dimensions for at least the quintic PH card and one Bézier card at identical viewport and text size. Images reserve their aspect ratio, are uncropped and undistorted, and cause no clipping or horizontal overflow at narrow widths or with enlarged text. Keyboard focus, reading order, alternative text and missing-image fallback behave as today.

**H6 — Unchanged learning flow.** Example IDs, routes, entry aliases, section anchors, launch scenes, return-to-section and focus restoration, completion behavior and catalog guidance are unchanged. Opening an example still starts from its prepared starting scene; the highlight is a picture only and does not change what the learner first sees. No storage, preset, mathematical evaluation or renderer change.

**H7 — Verified coverage.** Reconcile all eight chapters in both languages: zero section figures, 56 cards each with a current highlight image, caption and alternative text, no prose dangling on removed figures, no duplicate or missing media. Record checks, board comparisons, browser coverage and gaps in `docs/reviews/guided-example-highlights/acceptance.md`.

## Compatibility and user impact

No route, anchor, preset or stored-data change. Learners lose the standalone catalog figures and their long captions; their teaching content is carried by example highlights or prose per H1. Card previews intentionally stop matching the first thing the example shows; captions say what to do to reach the pictured state.

## Verification

Start with `just --list`. Run focused chapter, ordered-content, guided-example, preview and capture-tool tests; scene-content mathematical tests for affected highlights; the unchanged notation test; `npx tsc --noEmit --pretty false`; lint and `just build`. New gates (no section figures, recipe/manifest completeness, stale recipe detection) must be shown failing on pre-change code or under deliberate mutation and must not pass on an empty inventory. Final integration runs `just check` and delegated smoke via `$smoke-tester` across all eight chapters: desktop, projection-size, narrow and enlarged text, both languages with live switching, keyboard launch and return, Back/Forward. Review the multi-file change with independent mathematical, engineering and UI/accessibility reviewers per AGENTS.md.

## Alternatives considered

- *Keep paired figures, improve thumbnails only*: leaves the duplication the owner asked to remove.
- *Capture each example's final frame*: simpler, but short single-prompt examples would still show their starting scene.
- *Move the catalog figure into the card*: fastest, but the picture would not match the scene the example opens.
