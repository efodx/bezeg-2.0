# AB-A-6: criterion audit (D1, D3)

Read-only Sonnet audit against [the spec](../../specs/advanced-bezier-lessons.md) at `2845a375`, by handler 62. It ran no test, and it classified most rows from test titles and the AB-A-2 and AB-A-3 mutation notes. The status column is the worker's, with the handler's corrections marked.

**Handler recheck.** The handler read the bodies of the D1-A3, D1-A4 and D1-A5 tests, the D1 session test and the D3 close test. All are real checks. Dispositions are in the [gate record](ab-a-6-gate.md#audit-gaps).

Files: DK=src/bezeg/impl/kernels/degree-reduction.test.ts, AK=src/bezeg/impl/kernels/arc-length.test.ts, DG=src/graphs/curves/reduction/DegreeReductionGraphReal.test.tsx, AG=src/graphs/curves/arclength/ArcLengthParametrizationGraphReal.test.tsx, AP=src/graphs/curves/arclength/ArcSpeedPlot.test.tsx, DL=src/learning/content/degreeReductionGuidedLessons.test.tsx, AL=src/learning/content/arcLengthGuidedLessons.test.tsx, CH=src/learning/content/advancedBezierChapter.test.ts, PC=src/graphs/curves/curvePresetCollections.test.ts, RT=src/Routes.test.tsx, PCat=src/graphs/base/presets/PresetCatalog.test.tsx, SM=tests/guided-lessons.smoke.spec.cjs, R2=ab-a-2-graphs.md, R3=ab-a-3-lessons.md

| Criterion | Test | Status |
| --- | --- | --- |
| D1-A1 round trip 1e-12, both modes, only "exactly reducible" case | DK:46; DL:289 | covered |
| D1-A2 two examples to 6 decimals, errors by sampling and Gram | DK:79, 97; DL:212 (independent sampling and Simpson) | covered |
| D1-A3 no nearby quadratic better, in each mode's norm | DK:101, 123 | covered (body read) |
| D1-A4 bound at least the sampled maximum on random cubics | DK:127 | covered (body read; seeded) |
| D1-A5 prose names norm, constraints, other choices | DL:130; CH:116 | covered (body read; words, not the soundness of the argument) |
| D1-A6 stated tolerance, readout says so, optimum never "exact" | DK:59; DG:128; DL:130 | covered |
| D1-A7 both languages | DL:109, 130, 148, 233; DG:99; SM:2397 | covered |
| D1 default third difference \((-2,0)\) | DK:71 | covered |
| D1 default (i) and (ii) | DK:79; DG:86, 99 | covered |
| D1 Forrest match | DL:269 | covered (title) |
| D1 "coincides with the end-point-fixed max-norm optimum on this example" | none | not shipped: **handler**, no such claim in the lesson prose |
| D1 \(P_2\) example | DK:79; DL:233, 457 | covered |
| D1 bound values | DK:79 | covered (title) |
| D1 round-trip example | DK:46; DG:67; CH:70 | covered |
| D1 steps 1 to 6 | DL:173, 269, 289, 309; DG:140, 156; SM:2397 | covered |
| D1 step 7 free exploration | DL:109 | partly: structure only |
| D1 graph: overlays, mode switch, five readouts | DG:67, 86, 99, 116, 156 | covered |
| D1 Preset round trip and rejection | DG:184; PC | covered |
| D1 dispose and Reset | DG:171, 214 | covered |
| D1 real lesson session restores state | DL:337, 408 | covered (body read) |
| D1 multi-action scene in one tick; invalid scene data | DG:233, 255; DL:173, 380 | covered |
| D3-A1 lengths, parameters, ratios; PH numeric equals exact to 1e-9 | AK:69, 81, 97, 103, 117, 123, 130, 139, 143; AG:96, 189; AL:182, 206 | covered |
| D3-A2 pieces equal \(L/N\); cusp reported, no division by zero | AK:148, 157, 172, 186, 194; AG:206 | covered |
| D3-A3 prose: constant speed 1 gives a line; PH length not invertible polynomially | AL:250 | covered (words only) |
| D3-A4 polyline error an illustration of \(O(h^2)\) | AL:231; CH:116 | covered |
| D3-A5 quadrature setting shown; exact label only on PH | AG:112, 189, 359 | covered: **handler**, the worker marked it partly; AG:112 pins "Gauss-Legendre z 24 točkami, 32 delov" |
| D3-A6 both languages, decimal comma | AL:364; AG:339, 359; SM:2409 | covered |
| D3 default PH points and speed coefficients | AK:66; AL:206 | covered |
| D3 \(Q\) length, halves, bracket | AK:117, 123 | covered |
| D3 polyline errors, ratios, equal-arc parameters | AK:81, 97, 103, 130, 139, 143; AL:182 | covered |
| D3 step 1 constant \(t\)-speed | AL:104, 149 | partly: no scene starts playback by design; speed change measured by no test |
| D3 steps 2 to 6 | AP:12-60; AL:127, 149, 182, 206, 231; AG:96, 122, 189 | covered |
| D3 step 7 free exploration | AL:104, 149 | partly: structure only |
| D3 graph: marks, plot, \(L\), PH switch, \(N\), animated point | AG:96, 122, 189, 231, 251, 339, 359 | covered |
| D3 playback: time-based, stops on press, Reset, slider, unmount, import; reduced motion | AG:231, 251, 267, 295, 305, 378, 395, 408 | covered |
| D3 playback never left running by a lesson | AL:401, 423, 438, 458 | covered |
| D3 Preset round trip and rejection | AG:145; PC | covered |
| D3 dispose and Reset | AG:145, 319 | covered |
| D3 closing a lesson restores state | AL:280, 320 | partly: **handler**, AL:320 restores a checkpoint and is not a `LessonSession` close; browser check 13 |
| D3 multi-action scene; empty graph fails | AG:145, 163; AL:264 | covered |
| D3 curve stays below the lesson panel | AL:300; R3 | covered in units, measured in the browser |
| Batch A: `/bezier/elevation`, `/ph/*` unchanged | Git: no file under elevation or ph changed in `788ad755..HEAD`; RT and PCat only add entries | covered by Git evidence |
| Batch A: kernels pass | DK, AK | covered by `just check` |
| Performance measurement | The spec asks it of D2 and D4 only | not asked |
| Chapter, catalog, ownership | CH:23-139 | covered |

## Mathematical claims without a test

- `farin-reduction` cites Farin, 5th ed., which nobody opened. The spec's Further Notes already say so.
- D3's "\(s(t)\) polynomial, \(t(s)\) never polynomial" is prose; AL:250 checks words.
- R3 notes that the caption *Ni nižljiva* stays beside the step 2 prediction, so the prediction is partly revealed.

## Spec against shipped behaviour

- No contradiction in step order or content: seven steps each.
- D3 step 1 says "move a point"; the student presses Play. A decision recorded only in tests.
- The fifth D1 readout is the reducibility status, as the Batch A plan lists (handler).
- "Presets unchanged" holds as "existing Presets unchanged": two collections were added and no key changed.

## For the browser pass

Routes and old routes open, live language switch, D1 drag and live region, D3 Play spacing and Pause, closing both lessons, 390 px layout, keyboard, cards and posters, clean console. All are in the [gate record](ab-a-6-gate.md#browser-pass).
