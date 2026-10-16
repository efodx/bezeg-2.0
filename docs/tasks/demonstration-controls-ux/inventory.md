# Demonstration controls inventory and exceptions

Source spec: [demonstration-controls-ux](../../specs/demonstration-controls-ux.md). Inventory taken 2026-10-16 at implementation start (base `925e008`) from the inspector code of all **45** active routes in `src/demonstrations.ts` (an earlier count of 48 included type-declaration lines). Lesson-scene actions were not inventoried separately; lessons drive the same inspector controls, and lesson tests/smoke rows cover them.

## Shared destinations

| Item | Before | After |
| --- | --- | --- |
| Inspector heading | Kicker, title, intro paragraph, tab hints | Compact heading; intro removed, tab hints kept as `title` + accessible description |
| Inspector scrolling | Whole `aside` scrolls, `max-height` viewport rule; 45vh phone region; `.tools` inner scroller | Desktop: card height follows graph card incl. navigation footer; only `#inspector-content` scrolls. Phone: content flows in the page |
| Display order | Coordinate system, size, then graph-specific | Graph-specific (expanded) → coordinate system (collapsed) → element sizes (collapsed) on every route |
| Slider | Read-only value; generic "Parameter" fallback | Required specific label; localized number field (comma or point); integer steps show integers |
| Count stepper | `+ / n / −`; centre button silently reset to 1 | `− / value / +`, disabled at bounds, editable where the graph has a direct setter |
| NumberInput | Native number field (comma drafts lost) | Text field with decimal comma/point, incomplete drafts kept, Enter never submits a surrounding form |

## Family destinations

| Family / routes | Moved or changed | Retained |
| --- | --- | --- |
| Foundations: Bernstein | Degree stepper labelled, editable degree; stacked-area representation → Display | Degree bounds 0–5 |
| Foundations: complex multiplication | Edit order parameters → reveals → results → legend | Product/argument reveals keep ids and hidden semantics |
| Bézier: curve (structured) | — | Preview/Apply operation groups, point editor, editing modes |
| Bézier: De Casteljau 1/2 | `full_curve` → Display; shared playback styling | Playback semantics, selection-disabled board in variant 2 |
| Bézier: subdivision 1/2, extrapolation, elevation, affine | Scheme/control-polygon switches → Display; localized parameter labels | Apply buttons, step limits |
| Selected-curve panel (non-structured routes) | Hover-only tool previews → explicit Preview toggles; duplicate display switches removed from Edit | Editing-mode select, Apply actions |
| Rational | Weight control: curve and weight identity, previous/next, − / exact value / +, separate Reset weight; weights visibility → Display | 0.25 step, standard form in Edit |
| Rational: Farin | Farin points and weights visibility → Display | Standard form in Edit |
| Splines | Label-all and hide-fixed visibility → Display; labelled counts | Constrained/derived points not editable |
| PH cubic/quintic, uniform parameterization | Offset count and distance → Edit; offset visibility and dependent switches stay in Display | Arc length and polygon-geometry switches in Display; hodograph board |
| Parameterizations | Localized α labels; sampling count named; parametrization choice labelled and placed before the hodograph | Sampling separate from point display |
| Functions | Edit order parameters → results → legend; reference/mirror/tangent switches → Display; precise integer `n` entry | All readouts, caveat notes, domain hints |
| Analysis | Reveals in a distinct area before results; shared playback styling; one stepper pattern | Hidden-until-revealed results, pause/reset/termination, strict-band caveat |

## Accepted exceptions and retained behavior

- **Route commands while a curve is selected.** On non-structured curve routes, selecting a curve replaces the route's own commands with the selected-curve panel; deselecting restores them. Retained unchanged: no capability is lost, and showing both would change interaction meaning during playback. Candidate for a separate decision.
- **De Casteljau construction switch on the structured Bézier route** stays inside its Edit operation group beside its parameter (operation-beside-parameter exception in the spec).
- **Trigonometric phase** keeps its read-only π-multiple readout instead of a precise number field.
- **Rational weight domain (open decision).** The exact weight field rejects values ≤ 0, but the pre-existing ±0.25 buttons (`changeWeight`) still allow a weight to reach zero or below, where the rational curve is undefined. Behavior retained as before; clamping is a separate owner decision.
- **Shorten and Subdivide share one parameter** in the selected-curve panel of non-structured routes (both read and write the adapter's subdivision `t`), as the earlier hover panel did. The structured Bézier route keeps separate values. Separating them needs an adapter-level parameter and is left for a follow-up.
- **Focus during playback state changes (pre-existing).** De Casteljau Play/Pause and the Taylor degree stepper use `disabled`, so a keyboard user's focused button can become disabled; the analysis playback and uniform-convergence stepper already use `aria-disabled`. Left unchanged; follow-up candidate.
- **Board/legend colors** (`GraphPalette.warningText` for non-error states such as "outside band" or "supremum") are unchanged because legend swatches must match graph markers; inspector status text uses neutral styling.
