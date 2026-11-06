# AB-C-6: Batch C gate

**Held: every check passed except one open question, [F3](#open-f3-closing-the-lesson).** Batch C (D4 `patch-coons`) is not released until F3 is settled. Handler 67, 2026-11-06. Audit: [criterion audit](ab-c-6-criterion-audit.md). Browser: [report](ab-c-6-smoke.md), [brief](ab-c-6-smoke-brief.md). Measurement: [AB-C-P](ab-c-p-perf.md). Spec condition "surface-view ADR recorded": [ADR 0019](../../adr/0019-jsxgraph-surface-view.md), accepted, with the Coons path in [ADR 0028](../../adr/0028-advanced-bezier-objectives-and-owners.md).

## Open: F3, closing the lesson

The browser pass set shown \(B\), dragged `c0-1`, walked the lesson and closed it. The route showed the default scene, not that state, and the URL kept `?learn=1&learnChapter=…&learnSection=patch-coons`. The handler could not tell from the scripts whether the lesson was opened in the page or by a new page load. A new load starts from the default scene, so it would explain this with no defect. D2's gate saw its state return.

**To settle:** on the route, change the scene, open the lesson from the page without a navigation, close it, and read the scene. If it does not return, this is a defect of restore on exit; fix it with a test. If it returns, record that and release.

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

- The patch opens at 196×128 px at 1440×900, and 97×64 at 390; *Ponastavi pogled* gives 411×301. The fitted view is not used on opening (tensor has the same pattern).
- The shared slider boxes and the "Orodja za ta graf" eyebrow at 200% text.
- Unlinked, a press at a shared corner takes the topmost end point. The typed \(z\) field holds a raw float after a drag.
- Step 6's text does not mention that the interior net changes with the corner.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `59a9f35b`, docs dirty | Exit 0: 11 095 tests passed and 8 skipped, 1579 s, build passed. AB-B-6 had 11 090 |
| Hosted CI | `95ae4718` | Success: run 42196408763. Conclusion read, not each job. Closes handoff 66's item |
| `just unit` on the three changed test files, `npx tsc` | `59a9f35b` | Passed |

**A commit went in with typecheck failing.** `c8ae4a88` failed `tsc` (an optional index); `just typecheck | tail` hid the exit code from `&&`. It was never pushed alone; `59a9f35b` fixes it.

## Not covered

The EN Preset round trip, pinch zoom, phone keyboard, a screen reader, other browsers.
