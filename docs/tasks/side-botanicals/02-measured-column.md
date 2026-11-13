# 2. Measure the content column

Source: [spec](../../specs/side-botanicals.md), decisions 4 and 5.

## Problem

`App.tsx` passes a hard-coded column width to `SideBotanicals`: 1290px on Demonstrations, 1100px elsewhere. If a page's content width changes, the branches either overlap the content or leave a gap, and nothing will flag it.

## Goal

Size each gutter from the actual content column of the current page.

- Measure the page's content container (find a stable element per page, or add one shared class or data attribute to the three page roots) with `getBoundingClientRect` and a `ResizeObserver`, disposed on unmount and on route change.
- Gutter = distance from the viewport edge to the column edge, minus a 24px margin, on each side separately.
- Remove the `column` prop and the hard-coded widths.

## Acceptance

- At 3440, 2560 and 1920px on the three routes, the decoration's inner edge sits at least 24px outside the content column. Check it in the browser by comparing bounding rectangles.
- Changing the column width in DevTools resizes the gutter without a reload.
- No horizontal scroll at any tested width. Unit tests cover the gutter calculation.
