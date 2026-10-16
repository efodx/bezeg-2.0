# Representative demonstration preview tasks

Source: [representative demonstration previews](../../specs/representative-demonstration-previews.md), including the 2026-10-16 request for captured steps and lightweight smooth control-point movement.

Status: implemented on 2026-10-16. See [capture results](capture-results.md) and [release verification](release-results.md). All 45 posters and three motion pilots are delivered; extrapolation's original-interval distinction and the spline sampling count retain documented limitations, so those individual scene targets are not claimed fully satisfied.

| Task | Depends on | Outcome |
| --- | --- | --- |
| [01 Establish the capture checkpoint](01-capture-checkpoint.md) | — | Current route/asset inventory and supported recipe plan |
| [02 Deterministic recipes and provenance](02-deterministic-capture.md) | 01 | Real route states, assertions, fixed-camera capture and validated manifest |
| [03 Curate the complete still set](03-representative-stills.md) | 02 | Genuine representative posters for every shipped graph |
| [04 Prove step and smooth motion capture](04-motion-pilots.md) | 02 | Three small encoded clips and evidence for the format/budget |
| [05 Add the lightweight catalog player](05-catalog-player.md) | 04 contract accepted | Accessible, activation-loaded playback in catalog and picker |
| [06 Review and release the complete set](06-review-and-release.md) | 03–05 | Integrated mathematical, engineering, visual and browser acceptance |

One system captures real graph states offline, producing a PNG poster and optional silent video. Held algorithm steps and smooth sampled control-point movement use different capture timelines but the same player. All graphs get useful stills; only repeated subdivision, bisection and Bézier movement get motion in the initial delivery. Further clips require a separate bounded task using the same contract and budgets.

The handler owns scope, shared interfaces, review, evidence and Git. Read [the delegation workflow](../../agent-workflow.md) before dispatch. Delegate bounded implementation slices using its current routing; workers do not commit, push or delegate further. Task 01 is an inventory of the implementation checkpoint, not authority to finish unrelated in-progress routes.

Tasks 03 and 04 may author disjoint recipes after task 02, but they share the capture runner, generated poster mapping, manifest and capture machine. Give those one integration owner and serialize generation against a stable build. Task 05 owns catalog markup/CSS, playback tests and playback localization keys; it does not rewrite capture recipes. Coordinate the existing route/catalog/localization owners before edits. Do not run browser acceptance while assets or the build are being replaced.

Each task records observed checks and gaps in its result section when executed. Task 06 accounts for every spec acceptance criterion. Runtime route defaults, presets, lesson scenes and homepage artwork stay outside this implementation. The single moving-control-point exception applies only to the isolated Bézier motion capture.
