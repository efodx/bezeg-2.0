# AB-B-6: Batch B gate

**Passed: Batch B released (D2 `bezier-clipping`).** Handler 66, 2026-11-06. Audit: [criterion audit](ab-b-6-criterion-audit.md). Browser: [report](ab-b-6-smoke.md), [brief](ab-b-6-smoke-brief.md). No product code changed; the gate adds one test assertion.

## Audit gaps

| Gap | Disposition |
| --- | --- |
| Margin test said to pass without the margin | Not a gap: with `CLIP_MARGIN_FACTOR` at 0 the margin test and the clip-count test fail |
| The coincident-segments sentence is not asserted | Closed: `bezierClippingGuidedLessons.test.tsx` now asserts it in both languages. It failed when the English sentence was changed |
| The UI could offer a degree above 3 | Closed in the browser: check 13 |
| `expectCovered` accepts a nearby unresolved range on a limit run | Accepted: the reference is independent of the kernel, and a limit run reports its ranges as unresolved. The number of limit runs is not asserted |
| Graph test of the 3× ratio also passes on status `limit` | Accepted: the kernel test pins 113 and 21 |
| Tangent and offset pairs are outside the random reference loops | Accepted: both have direct tests |
| No English control test | Accepted: the language switch was checked in the lesson, and the labels come from the type-checked catalogs |

## Browser pass

Production preview of `a33b96a6`, clean, by `bezeg-smoke` Sonnet, at 1440×900 and 390×844. No page error, console error or failed request on any page visited.

| # | Check | Result |
| --- | --- | --- |
| 1 | Chapter, SL and EN | Four sections and cards, images load, each opens its lesson on the first frame; the D2 copy matches its image |
| 2 | Catalog | Poster 720×440, none broken; it matches the live route after four steps with hulls and control polygons off |
| 3 | Strand | Lists the chapter in both languages |
| 4 | Lesson walk, SL | Eight steps, 21 frames; every quoted count and status matches the readout |
| 5 | Play instruction, steps 5 and 6 | Quoted figures reached: 17 clips at \(10^{-3}\), then 113 and 53 on the tangent pair. Without Play the readout stays at 0 clips, and the text still holds because it says to press Play |
| 6 | Closing the lesson | State returns, Play stopped, also when closed while playing |
| 7 | Language switch mid-lesson | Position and board kept |
| 8 | Greyscale | Passed with a note: \(A\) and \(B\) have similar greys, so their line patterns carry the difference, as designed. Kept, discarded and the fat line read apart |
| 9 | 390×844 | No horizontal overflow; both curves visible at about 86×43 px |
| 10 | Reduced motion | Play runs as usual, one clip per 0.4 s. These are discrete steps, not continuous motion, so this is accepted; D3 disables Play because its point moves continuously |
| 11 | Preset round trip | Points, tolerance and step restored, Play stopped. Reset returns to step 0 and keeps the points; *Privzeta* restores the default pair |
| 12 | `/compgeo/bezier-hulls` | Loads; Next and Play work |
| 13 | No degree above 3 | No such control; a degree-4 file is refused, and the board does not change |

**Drag.** The spec's measurement is [AB-B-2b](ab-b-2b-perf.md), with the [limits the handler read](ab-b-2b-perf.md#handler-reading-curves-handler-64): a drag that stays near a tangency was not measured.

## Carried, polish

- The prompts of steps 5 and 6 do not say that *Opazuj na grafu* comes first; the controls are disabled until then. Play at step 6 takes about 54 s.
- The degree-4 refusal names the point count, not the degree. An 8-point file of 5 and 3 points is split as two cubics.
- The curves are small at 390 px, like D1's.
- Card and poster text stays Slovenian on the English page: the open owner item "Slovenian-only card images".

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `02b280fa`, docs dirty | Exit 0: 607 test files passed and 3 skipped, 11 090 tests passed and 8 skipped, 1452 s, build passed. AB-A-6 had 11 015 |
| Hosted CI | `b82b6237`, `79e832e1`, `a33b96a6` | Success: runs 42189619835, 42189702337, 42193940502. Conclusions read, not each job |
| `just unit` on the lesson test | Gate tree | Passed; failed under the mutation above |
| `just typecheck` | Gate tree | Passed |

`just check` did not run on the gate tree: its only code change is the assertion in one test file. Hosted CI of this push is its first full run.

## Not covered

No touch drag, no real device, no screen reader and no keyboard Tab walk in this pass; AB-B-2b walked the keyboard. English lesson: first frame and step 5 only, and the [AB-B-3](ab-b-3-lesson.md) smoke row walks it at 390×844.
