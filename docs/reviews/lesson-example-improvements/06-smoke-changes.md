# Task 06: required edits to tests/guided-lessons.smoke.spec.cjs

Not applied (a worker may not edit that file). Line numbers refer to the file as read in this worktree. Equation strings for the new trig rows follow the existing readout format (`f(x) = sin(2x)` appears in `prepareUserState`; `+ 1` spacing follows `- 1`); confirm in the browser.

## trigonometric-functions (lines ~872-916)

Comment: `Steps: default, amplitude, vertical shift, frequency, phase (cosine as shifted sine), combined worked example, tangent.`

Replace the whole `TRIG_STEPS` array with (7 rows):

```js
const TRIG_STEPS = [
    {equation: 'f(x) = sin(x)', period: '6.28 (2π)', shift: '0', range: ['-1', '1'], curves: 2},
    {equation: 'f(x) = 2·sin(x)', period: '6.28 (2π)', shift: '0', range: ['-2', '2'], curves: 3},
    {equation: 'f(x) = sin(x) + 1', period: '6.28 (2π)', shift: '0', range: ['0', '2'], curves: 3},
    {equation: 'f(x) = sin(2x)', period: '3.14 (π)', shift: '0', range: ['-1', '1'], curves: 3},
    {equation: 'f(x) = sin(x + π/2)', period: '6.28 (2π)', shift: '-1.57 (-π/2)', range: ['-1', '1'], curves: 3},
    {equation: 'f(x) = 2·sin(2x + π/2) + 1', period: '3.14 (π)', shift: '-0.79 (-π/4)', range: ['-1', '3'], curves: 2},
    {equation: 'f(x) = tan(x)', period: '3.14 (π)', shift: '0', range: [], curves: 3},
];
```

Row fields in the object: `steps: 5` -> `steps: 7`; `minFrames: 11, // 2 + 2 + 3 + 2 + 2 frames` -> `minFrames: 15, // 2 + 2 + 2 + 2 + 2 + 3 + 2 frames`.
`stepProbe`: `if (step === 5) expect(await trigReadout(page, 'amplitude'), 'tangent has no amplitude').toBe('—');` -> `if (step === 7) ...` (same body).
`exitStep: 3,` -> `exitStep: 6,` (the combined scene keeps the user frequency replaced); the `duringLesson` expectation `'f(x) = 2·sin(2x + π/2) + 1'` stays correct.

## area-between-curves (lines ~1071-1111)

Comment: `Steps: between [1, 3], under g [1, 3], the default bounds (intersections), [0, 4], [1, 3.5].`

Replace the first two `AREA_STEPS` rows (rows 3-5 unchanged):

old:
```js
    {a: '0.78', b: '3.22', pa: 2 - AREA_S, pb: 2 + AREA_S, signed: '4.899', unsigned: '4.899', shaded: '6.1237'},
    {a: '1', b: '3', pa: 1, pb: 3, signed: '4.6667', unsigned: '4.6667', shaded: '4.6667'},
```
new:
```js
    {a: '1', b: '3', pa: 1, pb: 3, signed: '4.6667', unsigned: '4.6667', shaded: '4.6667'},
    {a: '1', b: '3', pa: 1, pb: 3, signed: '4.6667', unsigned: '4.6667', shaded: '5.3333'},
```
Row field `steps: 5` and `minFrames: 11` stay (5 steps, 2+2+3+2+2 frames). `exitStep: 3` and `duringLesson` (`b` = `'3.22'`) stay correct because step 3 is still the intersections scene.

## taylor (lines ~1549-1599)

Comment: steps with the hidden bound become 1, 2, 4, 6 and 7 (the learner changes the degree or presses Show error bound after predicting).

`TAYLOR_STEPS`: insert as the second row (new step `taylor-exp-low-degrees-step`, degree 2, bound hidden):
```js
    {center: '0', degree: '2', x: '1', polynomial: '2.5', statuses: ['hidden']},
```
Other rows keep their values, shifted one position down.

Row fields: `steps: 7` -> `steps: 8`; `minFrames: 17, // 2 + 3 + 2 + 3 + 2 + 2 + 3 frames` -> `minFrames: 20, // 3 + 2 + 2 + 3 + 2 + 3 + 2 + 2 + 3 frames` is wrong arithmetic; use `minFrames: 20, // 3 + 2 + 3 + 2 + 3 + 2 + 2 + 3 frames` (step order: prerequisites 3, low degrees 2, exp 3, sine prediction 2, sine 3, geometric 2, flat 2, free 3 -- the unit test pins 20 frames).
`exitStep: 3,` -> `exitStep: 4,` (the sine prediction step keeps degree 3 with the bound hidden, so `duringLesson` stays correct).
