# Lesson-guided catalog clips

Status: scheduled 2026-11-07 in the [Clips stream](../tasks/feature-streams/clips.md).

Extends [continuous motion previews](continuous-motion-previews.md). Its capture contract still applies unless this spec says otherwise.

## Problem

The Demonstrations page plays a clip on hover or keyboard focus only for a Demonstration listed in `src/demonstrationMotionAssets.ts`. At `0f78f21d`, 67 of the 118 Demonstrations have a poster but no clip. All 67 landed between 2026-11-02 and 2026-11-06. The [family template](../tasks/feature-streams/README.md#family-template) lists a catalog preview clip under F5 Media, but the family plans shipped posters only. Each clip needs a recipe, none of the 67 has one, and no test or smoke check fails on a missing clip, so the gap stayed silent.

The owner asked on 2026-10-18 for motion on every preview unless there is a concrete reason to keep a still. That request was recorded as a one-off expansion over the 45 Demonstrations of the time.

## Owner decisions (2026-11-07)

- **The lessons already say what to show.** Do not design motion from scratch. Use the lesson's guidance, including its prose instructions to the learner ("move the slider", "drag a corner"), not only its typed scene actions.
- **Start from the example card scene.** The example images are good, so each clip starts from its Demonstration's guided example scene.
- **No skips.** Do not use a cut where a smooth animation is possible, above all when the lesson recommends that motion.
- **No spike and no owner checkpoint.** Build it, run all 67, then verify and repair. Handlers decide under the stream rules.
- **Keep it cheap.** Haiku does the bulk work under precise briefs, followed by verification and a repair batch.

## Design

**One row per Demonstration** in a data file owned by this feature:

| Field | Content |
| --- | --- |
| `id` | Demonstration ID |
| `exampleId` | The guided example whose scene starts the clip |
| `motion` | `parameter-sweep`, `pointer-drag`, `surface-orbit` or `discrete-exact-steps`, the modes the runner already has |
| `control` | The real control or point that moves |
| `path` | Values or board coordinates, out and back so the loop closes |
| `lessonQuote` | The exact lesson sentence the motion comes from, with its lesson step |
| `discreteReason` | Required for `discrete-exact-steps`: why smooth motion is impossible |

**One capture path.** A single generic mode opens the example scene, keeps the lesson overlay out of the frame, and performs the row through real controls. Rows replace the hand-written per-Demonstration recipes of the older clips. Extend the existing runner; do not fork it.

**Choosing the motion.** Take the motion the lesson asks the learner to perform. If a lesson names several, take the one that shows the lesson's main idea. If a lesson's prose names none, use the most continuous control in its scenes and quote the step that uses it. A truly discrete control, such as inserting a knot, may step, and an integer slider steps evenly and quickly. An algorithm Demonstration with no smooth control gets a capture-only smooth driver if its model allows one, for example a continuous sweep-line position; it uses a cut only with a recorded `discreteReason`.

**Posters.** The first and last clip frames must equal the poster, so a loop and a hover start show no jump. Where the current poster differs from the example start scene, recapture the poster from that scene.

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

## Out of scope

Changing lessons or lesson text, new runtime controls for learners, player changes, and replacing the 51 existing clips.

## User impact

The Demonstrations page, picker and carousel gain 67 clips, about 11 MB of lazily loaded media at the current average of 169 KB. Some posters change to the example start scene. No routes or stored Presets change.
