# Guided-example card layout (H5, H6)

Scope: only `guided-example` cards get the larger layout (class `chapter-exploration--guided-example`); prepared-activity and free-exploration keep the 240px column. Image attrs now 840x520, `aspect-ratio: 21/13`, `object-fit: contain`, figure `max-width: 420px`.

Breakpoint: stacked at `max-width: 44em` (~704px at default text); above it two equal columns (image ~364 of the 780px card). `em` so a larger browser default text size stacks earlier.

| viewport | lang | page | card before | img before | card after | img after |
|---|---|---|---|---|---|---|
| desktop | sl | ph | 780x243.4 | 240x146.7 | 780x304.1 | 364x225.3 |
| desktop | sl | bez | 780x246.3 | 240x146.7 | 780x304.1 | 364x225.3 |
| desktop | en | ph | 780x243.4 | 240x146.7 | 780x304.1 | 364x225.3 |
| desktop | en | bez | 780x246.3 | 240x146.7 | 780x304.1 | 364x225.3 |
| proj | sl | ph | 780x243.4 | 240x146.7 | 780x304.1 | 364x225.3 |
| proj | sl | bez | 780x246.3 | 240x146.7 | 780x304.1 | 364x225.3 |
| narrow | sl | ph | 358x523.8 | 280x171.1 | 358x555.8 | 328x203 |
| narrow | sl | bez | 358x546.3 | 280x171.1 | 358x557.4 | 328x203 |
| narrow200 | sl | ph | 358x1266.3 | 280x171.1 | 358x1256.5 | 328x203 |
| narrow200 | sl | bez | 358x1261.7 | 280x171.1 | 358x1251.8 | 328x203 |
| narrow200 | en | ph | 358x1224.5 | 280x171.1 | 358x1256.5 | 328x203 |
| narrow200 | en | bez | 358x1261.7 | 280x171.1 | 358x1251.8 | 328x203 |
| proj200 | sl | ph | 780x659 | 240x146.7 | 780x860.6 | 364x225.3 |
| proj200 | sl | bez | 780x612.6 | 240x146.7 | 780x814.2 | 364x225.3 |

(`narrow200`/`proj200` = html font-size 200%.) No horizontal overflow (scrollWidth <= clientWidth) and no clipped figcaption in any row, before or after (before.json/after.json).

Checks (checks.cjs): Tab reaches the card action `.chapter-open-activity` in DOM order (figure, then copy), outline solid 3px, :focus-visible. With all PNG requests aborted, all 7 ph-curves cards fall back to single-column no-preview with the action intact at 1280 and 390, no overflow. Caveat: EN capture PNGs still contain Slovenian in-image text; that belongs to the capture task.

Unit: ChapterGuidedLessons.test.tsx gained 840/520 attr and figure-first assertions; it failed with attrs mutated to 720x440 and passes at 840x520.
