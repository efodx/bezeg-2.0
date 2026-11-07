# CP4 notes: Run component

## Harness

URL: `/bezeg-2.0/harness/collision-playground` (optional `?count=1000&method=naive`). Mounts only `CollisionPlayground` plus a 150 vh spacer so page scrolling can be checked. Present in the production build, not linked anywhere.

## Files touched

Owned: `src/learning/playground/collisions/CollisionPlayground.tsx`, `.css`, `.test.tsx`; `CollisionHarness.tsx` (new, harness only); locale blocks `collision_*` after `playground_joins_legend` in `src/localization/sl.ts` and `en.ts`.

Shared: `src/Routes.tsx` (one lazy route plus a comment line). No hook or protocol change.

## Decisions

- Unavailable state: the naive count 499 500 is computed at render as 1000*999/2; the sweep count is phrased without a number ("far fewer").
- Colours: `--collision-body` (GraphPalette.primaryCurve) and `--collision-touching` (constructionAccent) are CSS custom properties on the component, read with getComputedStyle on mount and on a `prefers-color-scheme` change, not per frame. The app has no dark theme yet; the dark values in the CSS are my choice and untested visually.
- Numbers use `Intl.NumberFormat` (sl-SI / en-US) because `formatNumber` has no digit grouping.
- Count slider: shared `Slider` over position 0..1000, count = 10 * (limit/10)^(p/1000). Radios are native inputs in a fieldset. Buttons reuse the DrawingPlayground toolbar styling (44 px).
- Announced actions: count, method, Step, New arrangement. Not Play/Pause. A snapshot already in flight can be announced instead of the one after the action; accepted.
- Step is disabled while playing.

## Mutation log (each assertion seen failing against a mutated component)

| Group | Mutation | Failed tests |
| --- | --- | --- |
| commands | Play always sends pause | send the matching commands |
| commands | radio does not send setMethod | method radios; keyboard path |
| commands | linear instead of logarithmic count | count slider is logarithmic |
| commands | no clamp on method switch | lower limit clamps |
| readouts | box tests read from candidates | render the counters; 4 per second |
| readouts | no throttle | 4 per second |
| live region | announce on every snapshot | stays empty; speaks once; polite |
| live region | pending flag never cleared | speaks once |
| canvas | no minimum radius | thinner than one CSS pixel |
| canvas | no ring | ring around touching bodies |
| canvas | no aria-hidden | hidden from assistive technology |
| canvas | draw without a new-snapshot guard | SURVIVED: the guard was redundant (the rAF is requested only by a snapshot), so I removed the guard and its ref |
| fallback | branch disabled | both fallback tests |
| keyboard | Step enabled only while playing | Enter/Space; keyboard path |

Reduced motion test (real hook, stub Worker, matchMedia reduce): sends only `init` and shows Play. Not mutation-tested; it exercises the hook, which I did not change.

## Checks observed

`just unit src/learning/playground/collisions src/Routes.test.tsx src/localization`: 6 files, 61 tests passed. `npx tsc --noEmit --pretty false`: clean. `just lint ...collisions src/localization src/Routes.tsx`: passed. `just build`: passed (Sass deprecation warnings only).

## Not verified

Real browser (handler's smoke), visual look, dark colours, 44 px targets on a real coarse pointer, device pixel ratio drawing, Slovenian grouping separator rendering.
