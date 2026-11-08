'use strict';
module.exports = [
    {
        id: 'bspline-basis',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // Start t = 0.5 (DEFAULT_BASIS_T in bsplineBasisModel.ts:24; the recipe sets nothing). The knot 1 lies at the middle of the sweep.
        path: [0.5, 1, 1.5, 1, 0.5],
        lessonQuote: 'Premakni \\(t\\) čez vozel \\(1\\) in opazuj, kako ena funkcija izgine in druga se pojavi.',
        discreteReason: null,
    },
    {
        id: 'bspline-deboor',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // Start t = 0.5 (DEBOOR_DEFAULT_T in bsplineDeBoorModel.ts:16; the recipe only reveals the levels). Moving t does not reset the revealed levels (DeBoorGraph.tsx:274).
        path: [0.5, 1, 1.5, 1, 0.5],
        lessonQuote: 'Premakni \\(t\\) čez \\(1\\) in opazuj, kako obroč preskoči s \\(P_0\\) na \\(P_3\\).',
        discreteReason: null,
    },
    {
        id: 'bspline-blossom',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Argument b', step: 0.01},
        // Start a = 0, b = 0.5 (recipe description and BLOSSOM_DEFAULT_ARGS in bsplineBlossomModel.ts:13); only b moves, a stays 0.
        // Peak 1.3, not 1.5: at b = 1.5 the blossom point f(0; b) is half clipped at the top of the view (handler 8 review).
        path: [0.5, 1, 1.3, 1, 0.5],
        lessonQuote: 'Premikaj argumente, izberi drugi odsek \\([1,2)\\), preklopi na stopnjo \\(3\\) ali premakni kontrolno točko in opazuj, kako se trikotnik, simetrija in Bézierove točke spreminjajo.',
        discreteReason: null,
    },
    {
        id: 'bspline-insertion',
        motion: 'discrete-exact-steps',
        control: {kind: 'button-count', label: 'Vstavi vozel', countLabel: 'Vozel u', step: 1},
        // Only "Vstavi vozel" changes the picture (the field "Vozel za vstavitev" draws nothing, BSplineInsertionGraph.tsx:157). Each press adds one knot and one control point, so the "Vozel uN" fields of the knot editor count the presses. The default insertion value 1 has multiplicity 1 and refuses its fourth insertion (k + 1 = 4), so at most 3 presses; the path stays at 2.
        path: [0, 1, 2, 1, 0],
        lessonQuote: 'Vstavi vozel, vstavi ga še enkrat, dokler ne doseže največje večkratnosti',
        discreteReason: 'Inserting a knot adds a control point, so the polygon cannot move smoothly between counts; each checkpoint is a fresh poster scene with that many insertions.',
    },
    {
        id: 'bspline-extraction',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Vozel u3', step: 0.01},
        // The poster is the default quadratic curve with the knots (0, 0, 0, 1, 2, 2, 2) and two pieces. A drag of p2 cannot close the loop: after a drag the graph keeps the pieces marked "changed" with thicker strokes (BSplineExtractionGraph.tsx:113, `moved` stays until an edit or Reset), so the last frame differs from the poster. A knot edit clears `moved` (line 206), so the inner knot u3 is swept from 1 to 1.5 and back; the junction of the two pieces moves along the curve and the piece readout keeps two pieces.
        path: [1, 1.5, 1],
        lessonQuote: 'Poišči točko, v kateri se stikata barvi obeh odsekov.',
        discreteReason: null,
    },
    {
        id: 'bspline-nurbs',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Utež 3', step: 0.05},
        // The poster is the NURBS circle (corner weights sqrt(2)/2, the others 1). The lesson suggests the second weight, but its field shows the rounded 0,70711, so a sweep could not return exactly to the poster; weight 3 is an exact 1. It goes to 2.5 and back: weight 3 belongs to the top point (0,1), and as it rises the two arcs beside it flatten inward off the unit circle (the dashed circle shows the gap) and the deviation E grows (handler 9).
        path: [1, 2.5, 1],
        lessonQuote: 'Spremeni utež in primerjaj odmik \\(E\\) z vrednostjo pred spremembo.',
        discreteReason: null,
    },
];
