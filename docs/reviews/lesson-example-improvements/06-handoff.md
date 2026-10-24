# Task 06 handoff (partial)

Status: content edits done in both lesson files; NO tests updated, NO checks run (vitest/tsc not run). Tests currently stale and will fail on step counts/orders.

## Files touched
- src/learning/content/functionGuidedLessons.ts (trigonometric-functions, area-between-curves)
- src/learning/content/analysisGuidedLessons.ts (taylor only)
Files are CRLF; edit with Python (chr(92) for backslashes) or Edit.

## Trig (7 steps; was 5). Order and scenes (all reference graph shown except base, combined, tangent)
1 trig-base-sine: unchanged (default, sin x).
2 trig-amplitude (scene trig-amplitude-two): A=2, reference on. f=2 sin x, range [-2,2], T=2pi, shift 0. Negative-A prompt kept.
3 trig-vertical-shift (trig-vertical-shift-one): B=1, reference on. range [0,2], midline y=1.
4 trig-frequency (trig-frequency-two): omega=2, reference on. T=pi, range [-1,1], shift 0.
5 trig-phase-cosine (trig-sine-shifted-by-half-pi, unchanged scene): phi=pi/2, reference on; prose now stresses sign (positive phi -> left, shift -phi/omega) and asks to try phi=-pi/2.
6 trig-combined (trig-worked-example, unchanged scene A=2,omega=2,phi=pi/2,B=1, no reference): range [-1,3], T=pi, shift -pi/4.
7 trig-tangent: unchanged (order 7).
Frame ids of steps 2 kept ('trig-amplitude-midline-*'); new frames trig-vertical-shift-*, trig-frequency-*; combined step frames still trig-period-shift-*.

## Area (still 5 steps, reordered)
1 area-difference-step: between, a=1,b=3 (14/3).
2 area-under-step: under-g, a=1,b=3 (shaded 16/3; int f = 2/3); prose rewritten.
3 area-intersections-step: default bounds (2-+sqrt1.5), unchanged.
4 area-beyond-step [0,4]; 5 area-crossing-step b=3.5: unchanged.

## Taylor (8 steps; was 7)
New step 'taylor-exp-low-degrees-step' (order 2, scene taylor-exp-low-degrees-scene): [taylor-degree=2, bound hidden]; explanation/prompt compare n=1,2,3 at x=1 (errors 0.7183, 0.2183, 0.0516; T2=5/2). Frames explanation+observation. Following steps renumbered 3..8. Step 1 prose/prompt mention 1,2,3 then 6; exp-step prose lists 0.2183; learning goal mentions T_2(1)=5/2.

## Remaining work
Function tests (functionGuidedLessons.test.ts):
- generic test line ~21-22: steps between 4 and 6 -> allow trig 7 (raise bound to 7).
- trig test: lesson().steps length 7; rewrite action expectations (list above); add numeric checks: each of steps 2-4 differs from sin x in exactly one quantity (valueRange [-2,2]/[0,2]/[-1,1], period via period(), phaseShift 0), phase sign phaseShift({omega:1,phi:pi/2}) = -pi/2 and phi=-pi/2 gives +pi/2; trigValue sin(x+pi/2)=cos x.
- area test: rest(0) = [between,a1,b3], rest(1)=[under-g,a1,b3], values list [1,3,1,3,0,4,1,3.5]; add integralG(1,3)=16/3 etc. (already present); signed vs unsigned at [0,4] and b=3.5 already tested; add swapped endpoints at [1,3.5].
Analysis test (taylor describe, ~lines 898-1050): step ids list add low-degrees step second; adapted().steps length 8; frame count 18 -> 20; add the new id to predictionSteps; scene test expects [param('taylor-degree',2), hide]; numerics via taylorAbsoluteError(taylorExample('exp'),0,n,1) for n=1,2,3,6 (0.71828,0.21828,0.051615,0.000226) strictly decreasing + prose contains '0.2183'.
Then run the vitest command and tsc from the brief, mutation-check new assertions, write 06-evidence.md and 06-smoke-changes.md.

## Smoke row changes needed (not written yet)
- trigonometric: steps 5->7, minFrames 11 -> 17 (2+2+2+2+2+3+2 frames... recount: base2, amp2, vshift2, freq2, phase2, combined3, tangent2 = 15), TRIG_STEPS must be 7 rows: sin(x); 2·sin(x) range -2,2 curves 3; sin(x) + 1 range 0,2 curves 3; sin(2x) T 3.14 (π) range -1,1 curves 3; sin(x + π/2) shift -1.57 (-π/2) curves 3; combined row (curves 2); tan row; replace `step === 5` amplitude check with step 7; exitStep 3 -> 6 for duringLesson equation (combined). Equation string formats must be confirmed in browser.
- area: AREA_STEPS reorder: [1,3 shaded 4.6667], [1,3 shaded 5.3333 (under-g)], intersections row (shaded 4.899), [0,4], [1,3.5]; exitStep 3 stays (intersections: b=3.22).
- taylor row: one more step (n=2), search id 'taylor' (~line 1562) for per-step arrays and minFrames (+2).
