# Batch B (task 04) note for task 05

Date: 2026-11-01. Chapters `ph-curves`, `parametrization` (04 part A), `functions-and-calculus` (part B) and `analysis` (part C). Source: [task 04](../../tasks/guided-example-highlights/04-batch-b.md), [spec](../../specs/guided-example-highlights.md). Per-part details and handler repairs: [stream record](../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

## Delivered

| Chapter | Cards | Section figures removed (audit §3 rows) | Notes |
| --- | --- | --- | --- |
| ph-curves | 7 | PH cubic, PH quintic (7–8) | Quintic card at d = −2,5 (D10, still awaiting owner confirmation); cubic card takes the D10 fallback (offset at the default distance) |
| parametrization | 3 | rows 9–11 | — |
| functions-and-calculus | 9 | continuity, derivative/arc length, definite integral (24–26) | Five first-frame highlights keep their checks and copy (`expectChange: false`) |
| analysis | 9 | bisection, Darboux, uniform convergence (27–29) | `uniform-convergence` uses the shared-N frame with Indeks n = 5 (Show supremum is a button, not a step kind) |

Commits: part A `a1f2bd2a`, `ae82cee5`; part B `c3ad50e0`, `f07eca48`; part C `94a179da` (graph fix: the uniform convergence f_n is clipped by functiongraph bounds instead of returning NaN outside [0, r], so capture samples stay finite), `eacf5b57`, `158aeb84`. All are on `master` through `4d1ef6cf`.

## Evidence

- Each part ran a full `capture-guided-example-previews.cjs` against the production preview. Every recipe board check passed, and only that part's recipe PNGs changed. The handler viewed each changed image and corrected alt text and captions where they disagreed with it.
- Expectation helpers were mutation-checked by their workers (logs `docs/reviews/feature-streams/learn-ui/logs/04*-mut.log`). The handler recomputed the analysis values: L = 1,75, U = 3,75, T₆(1) = 1957/720, bound e/5040, chord y = 0,5x + 1,5, 0,5⁵ and 0,8⁵.
- Part C at `70cf4811`: `just unit src/learning`, typecheck, lint, 55/55 node guided-example tests and `just unit src/graphs/functions` passed. After rebasing onto `2de15906`, typecheck, the node tests and the family chapter units passed again.
- Smoke (`bezeg-smoke`, Sonnet, production preview of `4d1ef6cf`, Chromium 1280×800 and 390×844; screenshots in [batch-04-smoke/](batch-04-smoke/)). The following passed in all four chapters: zero section figures; every card image decodes with alt text and a caption; alt text and captions switch live from SL to EN; no horizontal overflow; no console or page errors; no raw TeX artifacts in the page text. "Return to chapter" / "Nazaj v poglavje" lands on the owning section with focus on the launching link. The uniform convergence lesson draws f_n only on [0, 0,8]; the handler viewed that screenshot.

## Gaps for task 05

- `just check` was not run as one command for batch B. Its parts ran separately at the revisions above.
- In the smoke run, launch/return covered one or two cards per chapter. SL launch/return covered only parametrization and functions-and-calculus. Screenshots are first-viewport only, in EN. Card lightboxes, projection size, enlarged text, keyboard-only launch and Back/Forward were not covered; they belong to task 05's full smoke.
- `ph-cubic-speed` and `ph-cubic-offset-length` have visually identical images (both d = 1, per the audit).
- D10 (quintic d = −2,5) is still open with the owner.
