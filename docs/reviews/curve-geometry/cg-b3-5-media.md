# CG-B3-5: offset and envelope media

Chapter cards and catalog posters for `curve-offset` and `curve-envelope`. `POSTER_PENDING` is empty.

## Chapter cards

Both are the lesson's opening scene, the only scene the chapter capture accepts, viewed by eye.

- `curve-geometry.curve-offset.curve-offset`: the segment from \((-1,0)\) to \((1,0)\) and its dashed offset \(y=\tfrac12\) at \(d=-\tfrac12\). Types `{curve: 2, point: 3}`.
- `curve-geometry.curve-envelope.curve-envelope`: the three controls and four lines, the curve hidden. Types `{curve: 1, point: 3}`.

The inventory guess of four segments was wrong: the family is one curve element, so `curveEnvelopeExpectedFor` now says so. Neither expectation had generator tests; both now have accept and reject cases.

### Framing fix

A full chapter capture applied the poster windows added in CG-B2-5 to the cards, because `captureRecipeForEntry` passes the demonstration's recipe through. The comb card's cubic shrank to a fifth of the frame and the envelope card was small too. Curve geometry cards now use `finite-geometry-fit`, as the worked parabola already did. With the fix, the `curve-comb` and `curve-evolute` PNGs have 0 differing pixels from their committed versions, and git sees all four existing PNGs as unchanged.

Only `curve-geometry` cards take this rule. Another chapter with poster windows on a card demonstration can meet the same thing on its next full capture.

## Posters

Viewed by eye, nothing clipped.

| Id | Recipe | Shows |
| --- | --- | --- |
| `curve-offset` | "Razdalja d" \(-1\), "Osti vzporednice" on, fitted | Parabola and its swallowtail offset with both cusps; the radius \(\tfrac12\) at the vertex is below \(\lvert d\rvert\), so the cusps are expected |
| `curve-envelope` | Route defaults, window `[-1, 1.37, 1.4, -0.1]` | Sixteen lines forming the curve, the touching point at \(t=0{,}5\) |

The offset recipe labels worked as written. The first envelope window, `[-1.4, 2.2, 2.4, -0.4]`, passed the capture but drew the lines as a solid mass a fifth of the board wide. The new window has the 720:440 aspect and keeps \((0,1)\) below the caption.

Capture flags: `PREVIEW_RECAPTURE_IDS=curve-offset,curve-envelope`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1`, `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`. The second flag asserts that shared presentation and retained recipes are unchanged: the only poster-side script change is the `curve-envelope` window, whose id is recaptured.

Manifest delta by script: 113 to 115 captures, the 113 existing captures and all 51 motions identical.

## Checks

- `scripts/generate-guided-example-inventory.test.cjs` 17 of 17, `scripts/capture-guided-example-previews.test.cjs` 18 of 18.
- `scripts/demonstration-preview-capture.test.cjs`: 36 of 37 with FFmpeg 9.0.2 set, the known local VP9 `bt709` failure; without FFmpeg that test is skipped.
- `guidedExamplePreviews.test.ts`, `demonstrationPreviewAssets.test.ts` and `DemonstrationsPage.test.tsx` pass. The first needed `npx vitest --clearCache` after the new PNGs, as [the command guide](../../commands.md) describes.
- Production preview with the posters built in: `/demonstrations` has 116 images, none broken after scrolling, 0 HTTP errors, both posters loaded. `/learn/curve-geometry` has 7 images, none broken, both cards loaded with their Slovenian alt text. No console errors on either page.
- `just check` on `8146bef0`, only documentation dirty: `EXIT=0`.

No smoke worker ran: no route, control or lesson changed, and the browser check above covers the new images.
