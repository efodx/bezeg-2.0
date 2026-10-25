# Compact lesson controls

## Scope and acceptance

Refine the existing guided lesson, preserving its cream/green identity and all scene, route and preset behavior. Source: owner browser comments on `/spline/c2spline?learn=1`, 2026-10-25, at 502 × 672.

- Observation frames expose one visible action for hiding instructions: “Opazuj na grafu”. Other frames retain “Skrij navodila učne poti”; exit remains separate. Reopening preserves the frame.
- Footer buttons share typography, border treatment and 44px minimum targets; previous/next form equal columns on narrow screens, including wrapped English labels.
- Remove the artificial 320px mobile reading spacer. Short content flows naturally; long content and sticky controls remain reachable.
- At widths up to 700px, hide the supplemental “Preizkusi in opazuj” prompt (owner preference). Orodja follows the graph/lesson directly. Desktop graph, inspector and prompt placement remain intact.
- Verify Slovenian/English, narrow (502 × 672 and 320px), desktop and enlarged text. Exercise observation, reopen, previous/next and exit. Run focused runtime tests, typecheck, production build and bounded browser smoke of the shared lesson/workspace changes.

No mathematical, storage, or route changes are intended.

## Acceptance — 2026-10-25

Implemented and reviewed on `7af43c8` plus this change. Typecheck, production build, 34 runtime/workspace unit tests, six C² spline/Taylor lesson browser tests and three graph-access tests passed. Restoring the old hide-button guard deliberately failed the new duplicate-action regression assertion; the restored implementation passed.

Chromium checks covered Slovenian at 502×672, English at 320px with 200% text, 1440×900 desktop and 844×390 landscape. Navigation targets were at least 44px and equal width on mobile, with no page overflow. Observe unlocked the graph, a point drag changed coordinates, reopening retained the frame, and keyboard Next/Back worked. Desktop retains the supplemental prompt; mobile hides it. Handler reviewed the initial, observation and desktop captures. No runtime errors were observed. Production build warnings concern existing direct `eval` usage and plugin timing; the design detector reported incumbent palette/accent findings, with no new design primitives introduced.

Evidence is in local `.command-logs/`: unit `2026-10-25T00-11-12-411Z-86792-32399857.log`, lesson walks `2026-10-25T00-11-54-604Z-96048-d697bd05.log`, graph access `2026-10-25T00-15-53-716Z-101768-1cbbc9b1.log`, and `lesson-mobile-*.png`. Physical-device testing was not performed.
