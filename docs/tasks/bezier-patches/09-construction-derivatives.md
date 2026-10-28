# 09 — De Casteljau and differential demonstrations

Status: complete (2026-10-28, [evidence](../../reviews/bezier-patches/construction-derivatives.md#acceptance-handler-16)). Source: [demonstrations and P5–P7](../../specs/bezier-patches.md#demonstrations). Depends on05/07; reuse the owned adapter and family scene model.

Add `patch-decasteljau` and `patch-derivatives` at their specified routes. Show the row-then-column, reversed order and direct bilinear constructions with exact intermediate geometry, parameter inset/sliders and unchanged final evaluation. Show partials, tangent plane, normal and twist at interior points and corners; explain and handle a degenerate normal. Controls belong in their specified inspector homes and work in both languages.

Acceptance: independent numerical checks bind the actual rendered construction points/vectors to geometry outputs. Switching modes, Reset, Presets, scene actions and language retains synchronized values. Keyboard/touch paths and exports remain usable; hidden constructions are disposed rather than orphaned. Add route metadata, investigation prompts and meaningful initial scenes; content/previews follow in13.

Verification: focused construction/math/state tests with meaningful mutation evidence, `just check`, mathematical and engineering/UI reviews, default gesture measurements, `$smoke-tester` for both new routes and retained tensor behavior. Evidence: `docs/reviews/bezier-patches/construction-derivatives.md`.
