# Side botanicals

Status: step 1 (artwork and sway) in progress, started 2026-11-12. Step 2 (growth on scroll) follows once the owner approves step 1.

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
8. **Owner's end state (2026-11-12):** the owner tuned the layout in the playground at 3440×1280: `{"left":4,"right":4,"top":15,"bottom":100,"reach":75,"size":2.2,"thick":2.5,"heads":5,"headSize":1.3,"leaves":3,"leafSize":1.05,"opacity":1,"fade":0.65,"amp":2.3,"speed":10,"seed":3}`. This is the fully grown state that growth ends at. Opacity and the other visible qualities grow on scroll toward it; the page does not open at full strength. Each flower head also sways on its own stalk (larger angle, shorter period, out of phase), not only with its branch.
9. **Growth (step 2):** on load the branches grow to about 60% over 2–3 seconds, and scrolling carries them to 100%. Pages that cannot scroll grow straight to 100%. Growth never reverses within a visit. One rAF-throttled scroll listener sets a CSS variable, in every browser.
10. **Sway:** each branch rotates by a small angle around the point where it enters the screen edge. Periods and phases differ between branches, so the motion does not look looped. Only CSS transforms are animated.
11. **Workflow:** before each push the owner reviews a running preview.

## Approach

- Generate the artwork at runtime from a deterministic, seeded generator (`src/sideBotanicals/`), with no React and no DOM in the geometry. Each flower head is a few merged paths, so a full layout stays at a few hundred elements and roughly 0.5 MB of path data, generated once per gutter size.
- The prototype lives outside the repository in the owner's playground (`bezeg-side-botanicals-mockup/playground.html`); the TypeScript generator ports that algorithm one-to-one.

## Acceptance criteria (step 1)

- At 3440×1440 and 2560×1440, the three routes show the branches in both gutters, and they sway. At 1920×1080 the branches show if the gutter allows. At 1280×800 nothing is rendered: no SVG in the DOM.
- No decoration on any other route, for example a Demonstration route, `/bezeg-2.0/learn/bezier-curves`, or a lesson.
- The decoration never covers or intercepts the content: it has `pointer-events: none`, sits behind the content in stacking order, and does not cause horizontal scrolling.
- With reduced motion, no animation runs.
- The same settings and seed always produce identical path data (unit test).
- At 1600px and wider the home corner sprig is not displayed.
- Typecheck, lint, the focused unit tests and the production build pass.
