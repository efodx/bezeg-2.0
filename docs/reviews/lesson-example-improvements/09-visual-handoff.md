# 09 Visual acceptance: remaining work

Checks A to E are written up in `09-visual-acceptance.md`. All were run, but A is only partly reviewed by eye.

## Remaining
- Review by eye the SL desktop starting views and the 390 px views of every lesson except mobile rational-extrapolation and spline-g1. Contact sheets: `sheets/<lesson>-<lang>-<d|m>.png` and `sheets/mobobs-<lesson>.png`.
- Review `shots/B-*-langswitch.png` and `shots/B-*-exit.png` for board label re-rendering after the language switch.
- Re-run the preset delete step in check C. The explicit delete timed out because the lesson-complete card was still open.
- Re-check rational-extrapolation steps 3 and 4 after the view-fit fix.

## Scripts
All are in `C:/Users/NonFriedMotherBoard/.claude/jobs/b31ef815/tmp/visual/`.
- `a.cjs [ids]`: walks every frame of the lessons and screenshots it.
- `b.cjs`: check B.
- `cd.cjs`: checks C and D.
- `d3.cjs`: Exit while playing.
- `sheet.cjs` and `s2.cjs`: build the contact sheets.

## Cleanup
Every run used a fresh browser context, so no `smoke-visual-*` preset remains in any persistent profile. I did not start or stop the preview.
