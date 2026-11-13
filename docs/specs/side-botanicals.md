# Side botanicals

Status: step 1 (artwork and sway) is complete and on `master` (commits `885f1a14`, `b1c8c720`, `13a60d09`, `515d75a0`, `da92d910`, `b27dbc91`). Step 2 (growth on load, without a scroll stage, decision 15: `2b178cd5`, `c003fe30`) and the measured content column (`a4de34a7`) are complete: the owner approved them in a preview on 2026-11-13 (decision 11), and they are published on `master` up to `97cce3fc`. Open: the owner's decision on the playground. Verification: [record](../reviews/side-botanicals/verification.md).

## Problem

On ultrawide screens the content of `/bezeg-2.0/`, `/bezeg-2.0/demonstrations` and `/bezeg-2.0/learn` sits in a column about 1100px wide. On a 3440px screen that leaves roughly 1150px of empty canvas on each side. The owner wants that space to carry the elderflower identity with a quiet animated decoration.

## Decisions (owner, 2026-11-12)

The owner settled these in a grilling session, then iterated on the artwork in a mockup and a playground.

1. **Motion:** branches sway gently in the wind (step 1). Later they grow as the page scrolls (step 2). Each step ships separately.
2. **Placement:** one shared shell component, `SideBotanicals`, rendered by `App` only on the three routes above. It never appears in the graph workspace, in lessons or on chapter pages, where the graph must stay prominent.
3. **Artwork:** new artwork, not the old `welcome-botanical` corner sprig. The owner rejected the first drafts (single upright stems drawn in the sprig's style). An independent critique found that they read as "flagpoles", looked botanically like yarrow rather than elder, and mixed three visual styles. The chosen direction is elder branches arching in from the outer viewport edge, at different heights on each side, in a paper-cut style: fills only and no outlines; tapered grey-olive stems; pinnate leaves in opposite pairs of lance-shaped leaflets in two sage tones; domed creamy flower heads in three-quarter view, built from clusters of five-petalled florets with ochre centres.
4. **Width gate:** rendered only when the viewport is at least 1600px wide and only within the gutter beside the content column. Below that width nothing is rendered.
5. **Weight:** decorative only (`aria-hidden`, no pointer events, never focusable), fixed to the viewport, and fading toward the content edge. The number of branches, their size, opacity and sway come from the owner's playground settings (`Elder branch settings: {...}`). Until the owner sends final settings, the playground defaults apply.
6. **Reduced motion:** with `prefers-reduced-motion: reduce` there is no sway, and step 2 shows the branches fully grown.
7. **Corner sprig:** the home intro's `welcome-botanical` is hidden at 1600px and wider, so only one botanical motif shows there. Below 1600px it stays as it is.
8. **Owner's end state (2026-11-12):** the owner tuned the layout in the playground at 3440×1280: `{"left":4,"right":4,"top":15,"bottom":100,"reach":75,"size":2.2,"thick":2.5,"heads":5,"headSize":1.3,"leaves":3,"leafSize":1.05,"opacity":1,"fade":0.65,"amp":2.3,"speed":10,"seed":3}`. This is the fully grown state that growth ends at. Opacity and the other visible qualities grow on scroll toward it; the page does not open at full strength. Each flower head also sways on its own stalk (larger angle, shorter period, out of phase), not only with its branch. After the step 1 review, the owner found that narrower gutters were too crowded and that the sway was too strong once heads also moved. The layout now scales with the gutter: it is exactly as tuned at the 3440×1280 gutter, and narrower gutters get proportionally smaller plants and fewer branches and heads (`fitToGutter`). Branch sway is reduced to 1° and head sway to 2°. The owner then asked to keep three main branches per side on narrower gutters. On 2026-11-13 the owner chose the density seen at a 2048px-wide window for every size: three branches per side with four heads each. Plant size and stem thickness scale with the gutter width (`fitToGutter`), so wider screens show the same arrangement drawn larger rather than more branches. Linear scaling made the plants on ultrawides much larger than at 2048, so size grows only with the square root of the gutter width, about 1.5× the 2048 size at 3440 instead of 2.2×.
9. **Growth (step 2):** on load the branches grow to about 60% over 2–3 seconds, and scrolling carries them to 100%. Pages that cannot scroll grow straight to 100%. Growth never reverses within a visit. One rAF-throttled scroll listener sets a CSS variable, in every browser.
10. **Sway:** each branch rotates by a small angle around the point where it enters the screen edge. Periods and phases differ between branches, so the motion does not look looped. Only CSS transforms are animated.
11. **Workflow:** before each push the owner reviews a running preview.
12. **How growth is drawn (handler, 2026-11-13):** growth `g` is written as `--growth` on one decoration root, and the stylesheet derives everything from it. Each branch scales from its hinge on the screen edge (0.45 at `g = 0` to 1). This was chosen over a clip or mask along the limb because it is the cheapest option, it leaves the tapered tip intact (a clip cuts the limb bluntly), and the branches already repaint every frame for the sway. Leaves and heads appear in order along the limb: a part attached at limb position `at` starts to appear at `g = 0.85·at` and fades and scales in from its attachment point over the next 0.125 of growth. The layer opacity runs from 0.35 of the settings value to the full value. The load animation is an ease-out over 2.5 s. A jump in scroll position is shown at no more than 1.2 growth per second, so pressing End grows the branches in rather than popping them.
13. **Growth across routes (handler, 2026-11-13):** the growth reached is kept for the whole visit, including navigation between the three routes and through other routes. A visitor who has seen the branches grown never sees them regrow. A full page reload starts again. The alternative, restarting on each route, would replay the load animation on every header click.
14. **Content column (handler, 2026-11-13):** Home, Demonstrations and Learn mark the element whose content box is their column with `data-content-column`. Each gutter is the space between the viewport edge (without the scrollbar) and that content box, less 24px, on each side separately; gutters under 100px carry no decoration. A content-box `ResizeObserver` and the window resize keep it current. This replaces the hard-coded 1100px and 1290px widths. User impact: on Demonstrations the layers end 24px from the 1260px column, 15px closer than before; Home and Learn are unchanged. A page without the attribute shows no decoration.

15. **No growth on scroll (owner, 2026-11-13):** the owner reviewed the preview on 2026-11-13 and dropped growth on scroll: the branches grow from 0 to full size once, over 2.5 s, on every page, as Home already did. There is no scroll listener. This replaces the 60% load stage and the scroll stage of decision 9 and the scroll-jump limit of decision 12; the rest of decisions 12 and 13 stands. Reduced motion is still fully grown at once.

## Approach

- Generate the artwork at runtime from a deterministic, seeded generator (`src/sideBotanicals/`), with no React and no DOM in the geometry. Each flower head is a few merged paths, so a full layout stays at a few hundred elements and roughly 0.5 MB of path data, generated once per gutter size.
- The prototype lives outside the repository in the owner's playground (`bezeg-side-botanicals-mockup/playground.html`); the TypeScript generator ports that algorithm one-to-one.

## Acceptance criteria (step 1): met

Checked in a browser on 2026-11-13 except where noted; see the [record](../reviews/side-botanicals/verification.md).

- At 3440×1440 and 2560×1440, the three routes show the branches in both gutters, and they sway. At 1920×1080 the branches show if the gutter allows. At 1280×800 nothing is rendered: no SVG in the DOM.
- No decoration on any other route, for example a Demonstration route, `/bezeg-2.0/learn/bezier-curves`, or a lesson.
- The decoration never covers or intercepts the content: it has `pointer-events: none`, sits behind the content in stacking order, and does not cause horizontal scrolling.
- With reduced motion, no animation runs.
- The same settings and seed always produce identical path data (unit test).
- At 1600px and wider the home corner sprig is not displayed.
- Typecheck, lint, the focused unit tests and the production build pass.

## Acceptance criteria (step 2 and measured column)

Superseded in part by decision 15: on `/bezeg-2.0/learn` at 3440×1440 growth is now 0.05 on the first frame and 1 after the load animation (3.2 s), and stays 1 after scrolling and navigation (browser check, 2026-11-13). The scroll figures in the first item below describe the earlier behaviour.

- Met: at 3440×1440 on `/bezeg-2.0/learn` the first frame shows short, faint branches (growth 0.07), 0.6 after the load animation, 1 at the bottom of the page, and no decrease after scrolling back up.
- Met: a page that cannot scroll reaches full growth within 3.2 s.
- Met: with reduced motion the first frame is fully grown and no animation runs. Open: two of 18 frame comparisons differed in some pixels of the gutter shortly after load; element positions and the animation count were unchanged, and the difference did not recur once a pixel diff was added to locate it.
- Met: at 3440, 2560, 1920 and 1600px on the three routes the layers end exactly 24px outside the content column on both sides, with no horizontal scroll; at 1280px nothing is rendered. Narrowing the column by 200px moves each layer by 100px without a reload.
- Met: unit tests for the growth function, the listener disposal and the gutter calculation; typecheck, lint and the production build.
- Met: the owner reviewed the preview and approved it on 2026-11-13 (decision 11); published on `master` as `97cce3fc`.
