# AB-C-6: Batch C gate

**Passed: Batch C released (D4 `patch-coons`); family 5 complete.** Handler 67 ran the gate and held it on F3; handler 68 settled F3, 2026-11-06. No product code changed for F3. Audit: [criterion audit](ab-c-6-criterion-audit.md). Browser: [report](ab-c-6-smoke.md), [brief](ab-c-6-smoke-brief.md). Measurement: [AB-C-P](ab-c-p-perf.md). Spec condition "surface-view ADR recorded": [ADR 0019](../../adr/0019-jsxgraph-surface-view.md), accepted, with the Coons path in [ADR 0028](../../adr/0028-advanced-bezier-objectives-and-owners.md).

## Settled: F3, closing the lesson

**No defect.** The browser pass had seen the default scene after closing the lesson, with its state lost. The recheck ([report](ab-c-6-f3-smoke.md), [brief](ab-c-6-f3-brief.md), production preview of `44da1664`, `bezeg-smoke` Haiku) separated the two ways in:

| Way in | Scene before | Scene after closing |
| --- | --- | --- |
| *Spoznaj to demonstracijo*, walked to the end, closed | \(B\), `c0-1` moved | The same, readout identical, no reload |
| The same button, two frames, closed through *Zapusti in povrni graf* | \(B\), `c0-1` moved | The same, readout identical, no reload |
| New page load of the `?learn=1` URL | Default, as the load discards the scene | Default |

The third row is what the gate pass saw. Covered: \(B\) and `c0-1` only. The closing URL keeps `learnChapter` and `learnSection` (`onClose` removes only `learn`), so the gate's first reading of it was not exact; see the polish below.

## Audit gaps

| Gap | Disposition |
| --- | --- |
| No drag measurement | Closed: AB-C-P |
| Chapter prompt asks for a control that does not exist | Fixed, `24381858`; see the note below |
| No disposal test after a view move and a Preset import | Closed, `c8ae4a88`, `59a9f35b`. It reports the move through the view's edit channel, not a real pointer; the browser pass dragged by mouse |
| Vacuous prose assertions | Closed, `c8ae4a88`. Each failed under a mutation |
| Only the lesson pinned for "one of many" and "no twist" | Closed, `c8ae4a88`: chapter section, prompt and card, both languages |

**The prompt is not displayed.** The browser pass found no page showing the D4 investigation prompt, old or new: the chapter shows the lesson card, and `?explore=` opens the lesson. `guidedExamples.ts` and `familyInvestigation.ts` still read such prompts, so the fix is right but no student saw the error. Whether other lesson-owned sections' prompts are displayed was not checked.

## Drag

Unthrottled, no case exceeds a 16.7 ms frame median or a 33 ms p95. At 4× throttle the median stays 16.7 ms and the p95 is 66.7 ms, above 33 ms, against 100 ms on the tensor route it shares its mesh path with. Density is 16 on both routes, so acceptance 5 asks no change. Not measured: \(L_c\), \(L_d\), \(B\) views, a rotated camera, Firefox, touch.

## Browser pass

Production preview of `ad350c50`, clean, by `bezeg-smoke` Sonnet. Provenance from the handler's build. Fourteen checks, no page error, console error or failed request. Notable results:

| Check | Result |
| --- | --- |
| Interior net, centre | Spec's values on screen |
| Drag | Mesh and readout follow during the drag; a linked corner moves both boundaries |
| Linked corners | Mismatch names the corner and says \(S\) does not interpolate; relinking averages in one edit |
| Keyboard | All controls reached, focus visible. A control point cannot be moved by key, as on tensor; typed coordinates are the route |
| 200% text | No page overflow; the *Prikaz* slider boxes pass the card edge, the same on tensor (shared) |
| Language switch | Route with a mismatch and lesson: all text changes, board does not move |
| Lesson walk | Seven steps, 16 frames, SL and EN, numbers match |
| Presets | Round trip and export restore; a linked file with differing corners is refused with an actionable message |
| Disposal | Three route cycles with drags: point and board counts stable |
| Touch at 390×844 | A touch drag moved a point; pinch not tested |

## Carried polish

- Closed by handler 69: the patch opens fitted to the host (`8efbdc15`, about 416×305 at 1440×900, tensor and triangular too), and the shared slider boxes stay in the panel at 200% text (`c53f5a18`). The "Orodja za ta graf" eyebrow showed no overflow in the sweep.
- Closed by handler 74: the linked corners help says a press at overlapping end points takes the top one and how to choose the other (`3a190db6`); the typed \(z\) field rounds after a drag (`1da0fc5e`).
- Closed by handler 74: step 6 says the corner moves all four interior points (`3a190db6`).
- Closing a lesson leaves `learnChapter` and `learnSection` in the URL. Harmless on every route seen; shared workspace code, not D4's.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `59a9f35b`, docs dirty | Exit 0: 11 095 tests passed and 8 skipped, 1579 s, build passed. AB-B-6 had 11 090 |
| Hosted CI | `95ae4718` | Success: run 42196408763. Conclusion read, not each job. Closes handoff 66's item |
| `just unit` on the three changed test files, `npx tsc` | `59a9f35b` | Passed |

**A commit went in with typecheck failing.** `c8ae4a88` failed `tsc` (an optional index); `just typecheck | tail` hid the exit code from `&&`. It was never pushed alone; `59a9f35b` fixes it.

## Not covered

The EN Preset round trip, pinch zoom, phone keyboard, a screen reader, other browsers.
