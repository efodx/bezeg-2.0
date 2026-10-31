# PG3 review findings (2026-10-31)

Source: mathematical and UI/accessibility reviews (Sonnet 5.5, read-only, static) of the PG3 diff: `LookUnderneath.{tsx,test.tsx}`, the `onSelectSegment` hook and `lu-*` styles in `DrawingPlayground.{tsx,css}`, and nine new `playground_*` keys. No mathematical defect was found.

## To repair before PG3 is accepted

1. **Medium: colour collision** (`DrawingPlayground.css:60`, `:164`, `:172`). The shape stroke, the De Casteljau level-2 line and the one-curve overlay all use `--bezeg-shell-focus`. Expected: the one curve has its own token and a dash pattern, so it reads as separate from the shape; level 2 differs from both the shape and the B(t) dot.
2. **Low: two live regions** (`LookUnderneath.tsx:101`). The `role="status"` span duplicates the playground's polite region, and the degree lives only in SVG `<text>`. Expected: one live region; the selected segment and the degree as visible text in the controls area.
3. **Low: unexplained codes** (`LookUnderneath.tsx:75,77`). C0/G1/C1 stay as notation, but add a short localized legend under the switches when Joins is on.
4. **Low: t slider without segments** (`LookUnderneath.tsx:106`). Show it only when Casteljau is on and there is at least one segment.
5. **Minor: stored selection not clamped** (`LookUnderneath.tsx:95`). Prev/next and later growth must start from the clamped value, not the stale stored one.
6. **Test gaps** (`LookUnderneath.test.tsx`): the expected values come from the same model functions the component uses. Add hand-computed checks: a known cubic at \(t=\tfrac12\) gives \((P_0+3P_1+3P_2+P_3)/8\), and row 1 holds midpoints such as \((P_0+P_1)/2\). Compare the first and a middle sample of the one curve. Check the positions of the P labels and joint labels. Cover a closed drawing (closing joint label, closing polygon, degree \(3n\)) and an open one (degree \(3(n-1)\)).

## Accepted as is

- Segment selection by pointer only; the previous/next buttons are the keyboard path.
- In inspect mode a press on a segment selects it instead of appending; a press on empty canvas still appends. This matches the spec ("click it").

## Needs a real browser (PG4a/PG4b)

Label overlap, touch target sizes, live regions on language switch, and segment press versus append and drag.
