# Highlights 05 chapter smoke (preview 127.0.0.1:4387, build 12d5aadb)

Scripts: smoke.cjs / smoke-part1.cjs (checks 1-3), smoke2.cjs (4-6), c7.cjs (7, 8). Logs: run-part1.log, run-part2.log. Part 1 aborted in check 4 (wrong board selector, wrong back/forward order); smoke2.cjs reran 4-6 and 5 with fixes. Card selector: `aside.chapter-exploration--guided-example`; section figures = any `figure` not inside `aside.chapter-exploration`.

| Check | 9 brief chapters | Notes |
|---|---|---|
| 1 SL+EN: 0 section figures, image decoded, alt, caption, no TeX, no console/page errors | pass | 67 cards (12/3/7/6/7/3/9/9/11) in both languages; 0 console/page errors (errors.log empty) |
| 2 live switch (bezier-curves, splines) | pass | alt and caption changed with no reload |
| 3 viewports 1440, 1920, 390, 390@200%, 1280@200% | pass | no horizontal overflow; image ratio 1.62 (21:13) everywhere; beside at 1440/1920/1280@200%, stacked at 390 |
| 4 launch + return (9 chapters; sl: bezier, foundations, rational, ph, functions, patches; en: splines, parametrization, analysis) | pass | board visible; return goes to `#section`; focus on launching link id; link in view |
| 5 keyboard (bezier-curves SL, ph-curves EN) | pass | Tab (29 and 16 presses) to link, Enter, Tab to return, Enter, focus on launching link |
| 6 Back/Forward | pass | Back = chapter#section with focus on link; Forward = example with board |
| 7 catalog entry | not applicable / gap | Catalog demo links are `?learn=1` and gain a "Nazaj v poglavje" link to `/learn/<chapter>#<section>` (bezier-curves#control-points, ph-curves#arc-length-problem; target in view). No catalog link into a guided example exists. |
| 8 lightbox | not applicable | Cards have no enlargement; image is not in a link/button, click does nothing |

## Findings
- Out of the brief's nine: `convexity-hulls` (3 cards), `triangulations-voronoi` (1) cards have NO image/caption (also EN). linear-maps and complex-maps cards have images. Not part of the 67; flag if previews are expected there. Launch/return/Back/Forward also pass for these four chapters.
- 200% text at 390: the sticky "Vsebina poglavja" bar overlaps the caption in the element screenshot (splines-390x200-sl.png); likely screenshot artifact of a sticky bar, not examined further.
- "Opens from starting scene" judged by board visible and `?example=` URL only; scene state not inspected.
- 200% via injected `html{font-size:200%}`, not browser zoom. Projection 1920x1080 only; 1280x800@1.5 not run.
- Screenshots: first card per chapter at 1440 SL, 390 and 390@200% for bezier-curves/foundations/splines, 1920 for bezier-curves/ph-curves, EN live switch (bezier-curves-1440-en-liveswitch.png); no lightbox screenshot (none exists).
