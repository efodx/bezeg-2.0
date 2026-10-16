# 04 Prove step and smooth motion capture

Source: [spec](../../specs/representative-demonstration-previews.md), motion system and acceptance 9. Depends on: [02](02-deterministic-capture.md).

## Goal and scope

Generate three short silent clips from real board captures: repeated subdivision, bisection and one moving Bézier control point. Own capture timelines, offline encoding tooling/instructions, clip output, optional motion mapping and clip provenance. Coordinate generated manifest and capture script ownership with task 03. No encoder runs in the application or normal page load.

## Deliverables and acceptance

- Subdivision shows rounds 0 → 1 → 2 with readable holds and one/two/four pieces. Bisection shows two or three consecutive verified steps of the unchanged initial problem; select steps that remain meaningful before termination.
- Bézier motion starts from the original representative scene, moves one interior point through a bounded path and returns. Use the graph's existing interaction to recompute every sample; other points remain fixed. Record point identity, coordinates/keyframes, sample schedule and unchanged inputs. The poster uses the original curve.
- Use the same camera, annotation policy and dimensions throughout each clip. Discrete states switch directly; smooth frames depict actual intermediate graph states. Do not implement motion by warping PNGs or SVG paths.
- Evaluate an offline encoder such as FFmpeg without assuming it is installed or adding it as an application dependency. Record the command, version, codec/settings and reproducible frame schedule. If unavailable, report the tooling gap and retain posters; do not silently ship an unverified format.
- Start with WebM, verify playback on the supported browser set, and add another encoded source only for demonstrated coverage needs. Each source is 2–4 seconds and at most 300 KiB with readable mathematics; prefer 720×440. A failed quality/size check keeps that graph static until explicitly resolved.
- Emit `poster` plus optional motion sources/MIME/duration through the agreed generated delivery contract. Preserve the existing exhaustive poster map. Validate clip hashes, dimensions, duration, source samples and encoder provenance; distinguish lossless source-frame hashes from compressed output.
- Save a pilot evidence table with sizes, timings, samples, quality review, supported/failed browser playback and recommended encoder/format. This is the acceptance gate for task 05 and any later expansion.

## Checks and evidence

Reproduce frame state/outcome checks on two runs at different capture speeds; compare mathematical checkpoints and framing, not encoded-byte equality across encoder versions. Run relevant curve/subdivision/bisection checks. Inspect representative decoded video frames, including middle motion and final return, at card size. Verify production asset URLs/MIME and actual browser decoding, including poster fallback when unsupported. Record gaps; task 06 performs the integrated player smoke check.
