# Side botanicals: verification record

2026-11-13. Covers growth on scroll (`6256c695`), the measured content column (`cca41e8c`) and the gaps left by step 1 ([task 3](../../tasks/side-botanicals/03-verification-and-docs.md)). Spec: [side botanicals](../../specs/side-botanicals.md).

All browser checks ran with Playwright Chromium against `just preview` of the production build of `cca41e8c`, headless, on the owner's Windows machine. The check scripts were temporary and are not in the repository.

## Growth (3440×1440)

| State on `/bezeg-2.0/learn` | Growth | Layer opacity | Branch scale | Leaves and heads shown (of 30 per side) |
| --- | --- | --- | --- | --- |
| First frame after load | 0.07 | 0.40 | 0.49 | 0 |
| After the load animation (3.2 s) | 0.6 | 0.74 | 0.78 | 18 |
| Scrolled halfway | 0.8 | 0.87 | 0.89 | 27 |
| Scrolled to the bottom | 1 | 1 | 1 | 30 |
| Scrolled back to the top | 1 | 1 | 1 | 30 |
| After navigating to Demonstrations in the header | 1 | 1 | 1 | 30 |
| Reduced motion, first frame | 1 | 1 | 1 | 30, no running animations |

Home at 3440×2600, where the page scrolls only 8px, reaches growth 1 within 3.2 s. No page errors. Screenshots of the loaded and the fully grown state were inspected: the loaded state shows shorter, fainter branches with the inner leaves and heads only, and the grown state matches the look before this change.

## Content column

At 3440, 2560, 1920 and 1600px wide on `/bezeg-2.0/`, `/bezeg-2.0/demonstrations` and `/bezeg-2.0/learn`, the inner edge of each layer is exactly 24px outside the content column, and no laid-out element of the page reaches outside the column. The column is 1100px on Home and Learn and 1260px on Demonstrations. At 1280px no layer is rendered. No width shows horizontal scroll. Narrowing the column by 200px at 3440 (padding on Home and Demonstrations, width on Learn) widens the left layer by 100px without a reload on all three routes.

## Named-route smoke

Three routes at 3440×1440, 1920×1080 and 1280×800, 76 checks, all passing in five consecutive runs apart from the reduced-motion observation below:

- The decoration is in both gutters at 3440 and 1920 and absent at 1280.
- The layers have `pointer-events: none` and `aria-hidden`, contain nothing focusable, and are never the top element at any of a grid of sample points.
- The header is visible, the home carousel advances on Next, the home primary link opens Demonstrations, a catalogue card and a chapter link open their routes, the decoration is absent on those routes and returns after Back.
- No horizontal scroll and no page or console errors.

Not covered: the full [smoke checklist](../../smoke-tests.md) (the shared workspace and the lesson runtime did not change), touch input, Firefox and Safari. The individual `scale` property and `clamp()` used for growth need Chrome 104, Firefox 72 or Safari 14.1.

## Reduced motion

With `prefers-reduced-motion: reduce` emulated, the bounding boxes of every branch, head and floret group are the same 2 s apart, no animation or transition runs, and growth is 1 on the first frame. Of 18 comparisons of two gutter screenshots taken 2 s apart, 16 were pixel-identical. Two, both from the first runs, differed; they compared file bytes only, so the place and size of the difference are unknown. It did not recur in the 16 comparisons made after a pixel diff was added. The cause is not identified.

## Performance

Five seconds idle on `/bezeg-2.0/learn` at 3440×1440, after growth settled. Frame times come from `requestAnimationFrame`, main-thread times from the DevTools protocol's performance metrics (not the performance panel, so paint time is not split out from the task time).

| Rendering | Decoration | Frames per second | Median frame | Main-thread task time per frame | Of which style | Of which script |
| --- | --- | --- | --- | --- | --- | --- |
| GPU (AMD Radeon RX 7800 XT, ANGLE D3D11) | growth 0.6 | 60.0 | 16.7 ms | 2.5 ms | 1.2 ms | 0.02 ms |
| GPU | growth 1 | 60.0 | 16.7 ms | 2.2 ms | 1.1 ms | 0.02 ms |
| GPU | hidden | 60.0 | 16.7 ms | 0.1 ms | 0 | 0.02 ms |
| Software (SwiftShader) | growth 0.6 | 18.3 | 50.0 ms | 2.6 ms | 1.2 ms | 0.04 ms |
| Software | growth 1 | 16.0 | 66.6 ms | 2.6 ms | 1.2 ms | 0.04 ms |
| Software | hidden | 60.0 | 16.7 ms | 0.1 ms | 0 | 0.02 ms |

With a GPU the decoration holds 60 frames per second and uses about a seventh of the frame budget on the main thread. Without one, rasterising the animated vector paths is the bottleneck. The bitmap fallback named in task 3 is therefore not needed for GPU machines; it would help only software-rendered ones. Growth adds no measurable idle cost: no frames run once it settles.

## Unit and static checks

On the branch: typecheck, lint, the unit tests affected by the change and the production build pass. In the always-run tier of `just check-changed`, two Linear maps example-card tests (`guidedExamplePreviews.test.ts`, `mathAltText.test.ts`) failed on a missing image and pass with `--no-fsModuleCache`: the stale Vitest transform cache described in the [command guide](../../commands.md), caused by images that arrived from `master`, not by this change. The cache was not cleared, because the main checkout shares it. The existing `tests/home.smoke.spec.cjs` was also run against the build. The side-botanicals tests cover the growth goal and load ramp, monotonic growth, the 0.6 cap until scrolling, the page that cannot scroll, reduced motion, listener disposal, the visit maximum, the growth order in the geometry, the gutter calculation, per-side sizing and a column that arrives late.

## Open

- Owner preview review before publishing.
- Owner decision: should the playground (`bezeg-side-botanicals-mockup/playground.html`, outside the repository) become a dev-only route or script so the settings stay tunable?
