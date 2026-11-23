# Task 03 slice 6: docking feel

Capture: `capture.cjs <proto|cur> <before|after>` (Playwright, CDP screencast plus a per-rAF rect log, Taylor, 1440x900). Sheets `<label>-<target>-<a|b|c>.png` (frames with ms stamps), stats `.json` (distinct sizes per card, largest per-rAF position step). Scenarios: a) pick up Odcitki, drop at the opposite corner; b) fold, unfold (Legenda below); c) drag across left and top anchors, release in the free area.

## What changed
- Position glides by `transform` only, 260 ms ease-out-quart (`--board-glide`, `--board-ease`); CSS transitions retarget from the current computed transform, so an interrupted glide never jumps.
- Width and height are no longer transitioned. Before: Odcitki passed through 20 intermediate sizes on a fold (319x418 ... 194x39) and Legenda through 17 widths; the prototype did the same (tools 12 heights, readout 12). After: each card shows exactly two sizes (old, final). A card that grows is revealed by a `clip-path` Web Animation from the size it showed to its full size; the content is laid out at the final size, so text never reflows. A shrink ends at once. An interrupted reveal starts from the clip read off the running animation (`visibleSize`).
- Drop target preview: a dashed ghost under the cards shows where a dock would land; none when the drop floats.
- Pickup: lift shadow; drop: the card keeps its z-order for the glide (`board-card--settling`), then lands under the others.
- Held layout: a fold, language or highlight change keeps the last final layout on screen until measured and every width is assigned, then one glide (previously stale sizes were painted first).
- Reduced motion: inline `transition: none`, no reveal.
- Touch: unchanged (head has `touch-action: none`, pointer capture); added no-callout.

## Frame evidence
Sizes seen per card over the run (`*.json`): before cur b: 20 / 17; after: 2 / 2 (`after-cur-b.json`). before cur c legend/readouts 9-10 sizes; after 2. Largest per-rAF step in the glide after is 34 px (a card follows the pointer in a/c, up to 137 px, by design). Tests: `CardShellMotion.test.tsx` (reduced motion, reveal, interruption start size), `BoardCards.test.tsx` (no intermediate rect on a fold, wide card terminates).

## Not verified
Touch drag on a device; the interrupted reveal in a real browser (only unit-tested with a fake animation); the fold now takes one measure pass (~70 ms in these frames) before the card responds.

## Next if the owner wants more
Snap-to-anchor magnetism of the floating card, a spring for the drop, fade the ghost, a finger offset on touch.

The PNG contact sheets (about 6 MB) are kept out of Git; rerun `capture.cjs` against a preview to regenerate them. The `.json` stats beside them are committed.
