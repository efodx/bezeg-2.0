# Foundation 1a: browser smoke follow-up

Slice 1a made `NumberInput` commit on Enter or blur only (spec decision 2). This note records the smoke-spec audit and the new coverage.

## Site classification

`PointCoordinateEditor` (`.point-coordinate-editor`, p0 x, `Uporabi koordinate`) uses native `type="number"` inputs and a form submit; it does not use `NumberInput`, so those sites need no change. `PointListInput` (which does use `NumberInput`) is not what these tests drive.

| Site | Class |
|---|---|
| workflows 62,63,98,99,118,119,131,132; curve-ownership 176; library-picker 45; standalone-learning 175; guided 1636 | not a NumberInput: native coordinate editor, its Apply button submits |
| workflows 110; curve-ownership 29 | not a NumberInput: preset name |
| library-picker 75,79,126; demonstration-motion 130,190; demonstrations 132,138 | not a NumberInput: search boxes |
| guided 316 (setRange), 2869 | not a NumberInput: range input |
| count-setter 38 | already commits (presses Enter) |
| guided 2964, 2965 | already commits: `Tab` at 2966 blurs both fields before the assertion (the y fill blurs x) |
| guided 595 (linear x2) | NumberInput needing a commit: added `press('Enter')` (now 596) |
| guided 895 (bisection b) | NumberInput needing a commit: added `press('Enter')` (now 897) |
| lesson-graph-access 40, 61 (Taylor Degree n) | NumberInput needing a commit: added `press('Enter')` after each fill |
| scripts: preview-recipes 252, preview-motion 1616 (Tab), probe-clip-routes 194 (Enter) | already commit |
| scripts: preview-motion 492-493 | native coordinate editor plus its Apply button, unchanged |
| tests/demonstration-preview-curve-motion.test.cjs:74 | Array.fill, ignored |

Handler audit of the remaining script fills, none needing an edit: `envelope-gate-perf` 94, `offset-gate-perf` 92-93 and the slider branch of `guided-example-control-steps` 82 are range inputs; `fourier-browser-perf` 44 and `guided-example-control-steps` 89 press Enter; `function-browser-perf` 39 blurs; `triangulation-browser-perf` 51 fills `IntegerField`s in `PointSetControls`, which 1a did not change. No test or script types through `.type(`, `pressSequentially` or `keyboard.type`. Fill sites under `docs/` are historical review records and were left alone.

## Bisection cause (A5)

Not an app defect. With the two Enter presses removed again, `Exit restores the user state` failed for exactly `linear-function` and `bisection`, the other five rows passing:

- linear-function: `expect.poll(linearEquation)` expected `y = 1.33x + 1`, received `y = 2x + 1` (fill of x2 at the old 595 never committed).
- bisection: poll message "an endpoint edit restarts the iteration" expected step `0` (fill of Right endpoint b at the old 896 never committed).

Log: `.command-logs/2026-11-07T04-45-47-784Z-28748-e9381f24.log`. With the presses, both pass.

## New coverage (tests/count-setter.smoke.spec.cjs)

- `a typed degree reaches the graph only on blur or Enter, and Escape drops it` (line 70): `/bezeg-2.0/bernstein`; asserts field text, `aria-valuenow`, and a board signature (visible points and curve paths, required non-empty) before and after each of typing, blur, Enter, Escape.
- `Shift+Arrow, PageUp and PageDown take the big step ...` (line 106): `/bezeg-2.0/bezier/subdivision-2`, the t slider and its numeric field; checks ArrowRight, Shift+ArrowRight, PageUp, PageDown, Shift+ArrowLeft on the range input, Shift+ArrowUp/Down, PageUp/Down on the field, extra presses at min and max, graph signature change, field and slider following each other, and no page error.

## Mutations (A4), each rebuilt, run, reverted

| Mutation in src/inputs | Failing test and assertion |
|---|---|
| m1 NumberInput commits on every change | typed degree: "typing alone leaves the model value" (expected 1, got 3) |
| m2 Enter does not commit | typed degree: Enter value (expected 4, got 3) |
| m3 blur does not commit | typed degree: blur value (expected 3, got 1) |
| m4 Escape branch disabled | typed degree: field value after Escape (expected 4, got 2) |
| m5 PageUp returns one step | big step: slider PageUp (expected 0.7058, got 0.6176) |
| m6 Slider keydown without min/max clamp | big step: slider at limit (expected 0.01, got 0.7058) |
| m7 NumberInput arrow without max clamp | big step: field at maximum (expected 0.99, got 0.9018) |
| m8 ArrowUp ignores Shift | big step: field Shift+ArrowUp (expected 0.206, got 0.1178) |

Logs: `.command-logs/mut-m*.log`. `git diff --stat -- src` is empty and `dist` was rebuilt clean afterwards.

## Final runs (after build, `just smoke-built ... --port 4327`)

| Spec | Result | Log |
|---|---|---|
| count-setter | 5 passed | 2026-11-07T05-03-12-500Z-33852-a6b5e9cc.log |
| lesson-graph-access | 3 passed | 2026-11-07T04-33-43-822Z-31484-1e1d8e93.log |
| workflows | 3 passed | 2026-11-07T04-35-02-748Z-41064-f735c521.log |
| library-picker | 6 passed | 2026-11-07T04-35-23-154Z-35892-56a77bcd.log |
| curve-ownership | 6 passed | 2026-11-07T04-35-52-112Z-42116-7c01322a.log |
| standalone-learning | 8 passed | 2026-11-07T04-36-49-165Z-28344-0ddad7b9.log |
| demonstration-motion | 15 passed | 2026-11-07T04-37-52-933Z-36372-6b13bd44.log |
| demonstrations | 126 passed | 2026-11-07T04-39-45-173Z-47908-0e525d0e.log |
| guided-lessons | 292 passed | 2026-11-07T04-46-43-267Z-25820-0905565e.log |

All logs under `.command-logs/`.

## Unverified

- The board-signature assertions were not independently mutated: in m1 to m3 the earlier model-value assertion failed first, so the graph assertion was never the one that fired.
- Escape and blur-with-invalid-draft on the slider's own field, and the limit behaviour of a NumberInput field with a model that refuses a value, are not covered.
- Preview scripts and perf scripts were read, not run.
- Chromium only; no touch or Slovenian-locale decimal-comma typing.
