# Lesson-guided catalog clips

Status: scheduled 2026-11-07 in the [Clips stream](../tasks/feature-streams/clips.md).

Extends [continuous motion previews](continuous-motion-previews.md). Its capture contract still applies unless this spec says otherwise.

## Problem

The Demonstrations page plays a clip on hover or keyboard focus only for a Demonstration listed in `src/demonstrationMotionAssets.ts`. At `0f78f21d`, 67 of the 118 Demonstrations have a poster but no clip. All 67 landed between 2026-11-02 and 2026-11-06. The [family template](../tasks/feature-streams/README.md#family-template) lists a catalog preview clip under F5 Media, but the family plans shipped posters only. Each clip needs a recipe, none of the 67 has one, and no test or smoke check fails on a missing clip, so the gap stayed silent.

The owner asked on 2026-10-18 for motion on every preview unless there is a concrete reason to keep a still. That request was recorded as a one-off expansion over the 45 Demonstrations of the time.

## Owner decisions (2026-11-07)

- **The lessons already say what to show.** Do not design motion from scratch. Use the lesson's guidance, including its prose instructions to the learner ("move the slider", "drag a corner"), not only its typed scene actions.
- **Start from the catalog poster.** The example images are good, so each clip starts from the scene of its Demonstration's existing catalog poster, the recipe outcome in `scripts/demonstration-preview-recipes.cjs`. The lesson chooses only the motion.
- **Correction (owner, 2026-11-07):** the stream first read "example card scene" as the lesson's guided example scene (`?example=lesson.…`). Those scenes are often a lesson's bare first step, so the first row clips replaced rich posters with dull ones: `orientation` lost its shaded triangle and turn label, and `curve-offset` showed a straight segment instead of a curve with its offset. The owner: the previous starting images were the intended starting points.
- **No skips.** Do not use a cut where a smooth animation is possible, above all when the lesson recommends that motion.
- **No spike and no owner checkpoint.** Build it, run all 67, then verify and repair. Handlers decide under the stream rules.
- **Keep it cheap.** Haiku does the bulk work under precise briefs, followed by verification and a repair batch.

## Design

**One row per Demonstration** in a data file owned by this feature:

| Field | Content |
| --- | --- |
| `id` | Demonstration ID |
| `exampleId` | Removed by the 2026-11-07 correction: the clip starts from the recipe (poster) scene on the Demonstration route |
| `motion` | `parameter-sweep`, `pointer-drag`, `surface-orbit` or `discrete-exact-steps`, the modes the runner already has |
| `control` | The real control or point that moves |
| `path` | Values or board coordinates, out and back so the loop closes |
| `lessonQuote` | The exact lesson sentence the motion comes from, with its lesson step |
| `discreteReason` | Required for `discrete-exact-steps`: why smooth motion is impossible |

**One capture path.** A single generic mode opens the Demonstration route, applies its poster recipe, and performs the row through real controls. Rows replace the hand-written per-Demonstration recipes of the older clips. Extend the existing runner; do not fork it.

**Choosing the motion.** Take the motion the lesson asks the learner to perform. If a lesson names several, take the one that shows the lesson's main idea. If a lesson's prose names none, use the most continuous control in its scenes and quote the step that uses it. A truly discrete control, such as inserting a knot, may step, and an integer slider steps evenly and quickly. An algorithm Demonstration with no smooth control gets a capture-only smooth driver if its model allows one, for example a continuous sweep-line position; it uses a cut only with a recorded `discreteReason`.

**Posters.** The first and last clip frames must equal the poster, so a loop and a hover start show no jump. Posters are the existing recipe posters; row clips published before the correction restore them.

**Checks replace per-clip maths proofs.** The app runs the same code as the lesson, and lesson tests already cover it. A clip needs generic checks, plus a mathematical review per family rather than bespoke assertions per clip. A family reviewer may still require a specific invariant where a clip could mislead.

## Acceptance criteria

1. Every Demonstration has a clip listed in `src/demonstrationMotionAssets.ts`, or an entry in a pending list with a recorded reason. The feature closes with that list empty, unless the reason is that no motion is possible.
2. Each row quotes real lesson text that a reviewer can find, and the clip performs that motion.
3. A **jump check** fails capture when neighbouring frames differ far more than the clip's typical frame step, unless the row is `discrete-exact-steps` with a `discreteReason`. The test shows this check failing on a deliberately cut clip.
4. A **missing-clip test** fails when a Demonstration has neither a clip nor a pending entry, and the test also rejects stale pending entries, matching `POSTER_PENDING`.
5. The existing contract holds: 96 frames at 24 fps, four seconds, silent, 720×440, one fixed camera, at most 300 KiB per clip, first and last frames equal to the poster, and recorded provenance.
6. No clip shows an error, clips a key object out of view, or shows the lesson overlay. The picture visibly changes at card size.
7. The 51 existing clips keep their files and motion records.
8. `docs/capabilities.md`, `docs/current-architecture.md` and `docs/commands.md` describe the new capture path, row file and clip count. The [family template](../tasks/feature-streams/README.md#family-template) is read by new families, so `docs/specs/new-lesson-families.md` or the new-Demonstration guidance points at rows if a new family would otherwise miss them.

## Handler decisions (2026-11-07)

- **Jump check has two parts.** The pixel check of acceptance 3 catches gross teleports, but a whole-frame mean difference saturates on dense scenes: real cuts there scored 1.14–2.47 while the worst smooth clip scored 2.628, so no threshold separates them ([calibration](../reviews/feature-streams/clips/slice-b-note.md)). Row clips therefore also check state: each frame's observed control value or point position must match a schedule with no large step. Rejected: a lower pixel threshold, which fails real smooth clips, and a tiled pixel metric, which saturates the same way when a dense scene fills its tiles.
- **The pixel check ignores board text and keeps threshold 3.** A readout that flips, such as "Točno nižljiva" to "Ni nižljiva" in `reduction`, is meant to change abruptly, and it reached 5.11 on smooth raw frames. Rejected: raising the threshold to 6, because all five cuts the check caught at 3 scored 3.45–5.16, so it would catch none of them.
- **`just clip` does not assert verified presentation.** `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION` stays an explicit operator flag and row data stays out of the fingerprint, so routine clips pass without it. Rejected: setting it in the recipe, which would disable the guard for every clip.
- **`patch-coons` is a corner drag.** Its lesson says to drag a corner and never mentions the camera, so an orbit would not be lesson-guided. It is the only surface view among the 67, so the row driver does not build `surface-orbit`; the schema keeps the value for the existing clips' mode. Surface drags must hold the poster's camera exactly.
- **Snapped points drag on a finer grid during capture.** Every compgeo point snaps to a grid of \(2^e\) board units, with \(e\) usually 0, so a drag in the app hops and fails the state check (`orientation`: 0,60 off the schedule). A capture-only global, `window.__bezegClipGridStepExponent`, makes the first drag rescale the model to a finer exponent, down to the model's minimum of \(-8\). Every board position is kept, so the poster and first frame stay the start scene, and the row field `fineGrid` sets the exponent. The clip therefore moves more smoothly than a learner's drag, which hops between grid points, but each frame is a state the app can show and the predicates stay exact. Rejected: stepped clips with cuts, because the owner rules out cuts where smooth motion is possible and this affects about 25 Demonstrations; rebuilding the scene from a preset, because presets are disabled in a lesson and closing the lesson restores the pre-lesson scene ([fine grid note](../reviews/feature-streams/clips/fine-grid-note.md)); and a finer grid in the lessons, because it changes what they teach. The hook adds no control, and it changes nothing when the global is absent.
- **The pointer check for board drags is measured in pixels.** "The point is under the pointer" allowed \(10^{-6}\) board units, but browser pointer coordinates are float32, so `polygon-area` landed about \(1{,}3\cdot10^{-6}\) units off at 30 pixels per unit. The tolerance is now a thousandth of a CSS pixel in each clip's own board units. That still proves the point follows the pointer, and on that board it is about 25 times the float32 error. Rejected: a fixed larger number of board units, whose meaning would change with each board's scale; and the driver nudging the pointer to neighbouring float32 positions, which did not converge on `polygon-area`.
- **Fingerprint inputs are hashed as normalized text.** The presentation fingerprint hashed raw bytes, so Git's autocrlf rewriting one file on checkout read as a presentation change and stopped every capture. Rejected: committing `.gitattributes` rules for the inputs, because they would not fix existing checkouts until those were renormalized.
- **Graphs read a fine grid in board units.** The fine-grid rescale exposed that `NotablePointsGraph` and `EulerLineGraph` analysed grid coordinates as board units, so at \(2^{-8}\) every centre was drawn 256 times too far out. The same error reaches learners through a Preset with a nonzero `gridStepExponent`. The graphs now scale the exact kernel's results by the grid step. Rejected: excluding these graphs from the hook, which leaves a stepped drag with cuts that the owner rules out; and moving the vertices with number fields, which snap to the same grid. Before a `fineGrid` row on another graph, check that its overlays and readouts convert with `gridToBoard`: `orientation` and `polygon-area` draw correctly but their value labels and lattice markers are still in grid units, which their example scenes do not show.
- **`inscribed-angle` keeps 10 to 170 degrees.** The stored schedule reaches 10 at frame 30 and 170 at frame 65; the narrower range reported earlier came from contact-sheet frames, not the samples. The slider stops at 0, and the arc above AB runs from -23 to 203, so 10 to 170 is the symmetric end-to-end sweep the quote asks for.

## Out of scope

Changing lessons or lesson text, new runtime controls for learners, player changes, and replacing the 51 existing clips.

## User impact

The Demonstrations page, picker and carousel gain 67 clips, about 11 MB of lazily loaded media at the current average of 169 KB. Some posters change to the example start scene. No routes or stored Presets change.
