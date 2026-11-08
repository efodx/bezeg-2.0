# Handoff: bezier-pilot (config w-c), partial

Status: partial. The budget hook fired after `bezier-pilot.md` was written. The brief named no handoff path, so this note sits in the output directory.

## Done
- `bezier-pilot.md`: complete, 5 steps (11 frames: 2, 2, 2, 2, 3). The source had 6 steps. The `Konec` block is verbatim. Title line drops the "(lesson script r0)" suffix. Labels are `p_0`–`p_3` as instructed.
- Hook: "Ali lahko krivulja kdaj uide iz območja, ki ga določajo vse štiri?" The answer "Ne" is observed in step 2 and explained in step 5, which has the optional calculation frame and the flatten-the-curve challenge.

## Not done
- `notes-bezier-pilot.md` (≤60 words). Ready text, 58 words:

  "bezier-pilot notes. Hook: can the curve leave the area its control points enclose? 'Ne' is observed in step 2; the last step explains why and recaps. Steps: 5 (source had 6; nonsymmetric example cut). Unconfirmed: on-screen label or readout of the t=1/2 point (used 'označena točka'); whether steps reset the scene (each Na grafu line gives full state)."

- Self-check, not run: grep the lesson for "r0", "round", "model"; confirm every symbol sits inside `\(...\)` or `\[...\]`; review Slovenian grammar.

## Unverified, for the handler
- Scene reset: each *Na grafu* line states the full scene, because step 2 moves `p_1`. The runtime's reset between steps is assumed, not confirmed.
- Marker label and readout for the t=1/2 point: not confirmed. Source wording "označena točka" is used.
- Step 3 shows the convex hull, which the source hid. This is for continuity with steps 2 and 4.
- Terms were not checked against `docs/localization.md`, which I did not read. Slovenian was not reviewed by a native speaker.
- Verified by hand: all formulas, the weights 1/8, 3/8, 3/8, 1/8, the endpoints, and "not through p_1 or p_2" for the default curve (x is monotone and reaches -3 only at t=0).

## Incident
My first `mkdir` used a wrong relative path and created an empty `docs/reviews/model-comparison/drafts/w-c`. I removed it with `rmdir`, which only removes empty directories. The output directory is `docs/reviews/lesson-content-pilot/model-comparison/drafts/w-c`.
