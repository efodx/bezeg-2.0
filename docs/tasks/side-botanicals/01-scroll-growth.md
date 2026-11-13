# 1. Growth on scroll

Superseded 2026-11-13 by spec decision 15: the owner reviewed the preview on 2026-11-13 and dropped growth on scroll: the branches grow from 0 to full size once, over 2.5 s, on every page, as Home already did. There is no scroll listener. The text below is the original task.

Source: [spec](../../specs/side-botanicals.md), decisions 6, 8 and 9.

## Goal

The branches open partly grown and faint, then grow as the visitor scrolls, ending at the current look (the owner's end state, which `fitToGutter` already fits to the gutter). Growth includes opacity and the other visible qualities, not only length.

## Behaviour

- Growth `g` runs from 0 to 1. On load it animates from 0 to about 0.6 over 2–3 s. Scrolling carries it from 0.6 to 1 in proportion to scroll progress (`scrollY / (scrollHeight - innerHeight)`).
- Pages that cannot scroll, or barely can (less than about 200px), grow straight to 1 on load.
- `g` never decreases during a visit: keep the maximum reached. Navigating between the three routes may keep the reached value; decide and record in the spec.
- One rAF-throttled, passive scroll listener writes `--growth` on the decoration root, in every browser, with no CSS scroll timelines. Dispose it on unmount.
- With reduced motion, `g` is 1 immediately and there is no load animation.

## What grows

- **Stems:** each branch limb draws from the screen edge inward. Tapered filled paths cannot use `stroke-dashoffset`, so use a clip or mask that reveals along the limb, or scale the branch group from its hinge. Pick the cheapest approach that looks like growth and record it.
- **Leaves, twigs, heads and florets** appear in growth order. The geometry already orders elements by distance from the hinge (`t` in the prototype; check that `elderGeometry.ts` still exposes an order per element). Each item fades and scales in from its base when `g` passes its threshold.
- **Opacity:** the layer opacity ramps from about 0.35 at `g = 0` to the settings value at `g = 1`.
- Sway runs at every growth stage.

## Acceptance

- At 3440×1440 on `/bezeg-2.0/learn` (scrollable), the first screenshot after load shows partial, fainter branches. After scrolling to the bottom the look equals today's. Scrolling back up does not shrink it.
- A page that cannot scroll reaches full growth within about 3 s.
- With reduced motion the first frame is fully grown and still.
- Unit tests: the growth function is monotonic, the load ramp caps at 0.6 until scrolling, the no-scroll case goes to 1, the listener is removed on unmount.
- Typecheck, lint, the focused unit tests and the build pass. The owner approves the preview before publishing.
