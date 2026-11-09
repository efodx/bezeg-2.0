# w-d subdivision-guided deviations

1. Frame titles: no runtime field; step `title` and `purpose` both carry the draft title.
2. Draft [formula] blocks: none in draft; `formulaIds` set to `[]` (old formulaBlocks stay unreferenced).
3. Step 3 calculation frame: the "Za tiste, ki želijo videti račun" label → worked-example `title`; formula → `calculationLatex`; no result prose field, so `resultLatex` is `p_0^3=B(t)` (from the draft's preverjanje) and the result prose plus preverjanje prose are joined in `check`.
4. Step 4 hidden answer, English copy: `1{,}5` → `1.5` (notation test forbids decimal comma in English).
5. "Na grafu" text → scene `expectedState`; scenes reuse the existing actions (t=0.5 / 0.3, subdivide).
6. "Konec" screen text: runtime fixed, not editable; not ported.
7. Draft's mid-step drag challenges (corner at joint) are text only; no scene support.
