'use strict';
module.exports = [
    {
        id: 'triangle-centres',
        fineGrid: -8,
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P3'},
        // Board coordinates. The quote is the centroid step's, whose objects (the triangle and G) are in the recipe scene. C (P3) moves 0.7 right and back: every construction moves with C, so 1 and 1.5 found no CRF under 300 KiB (2026-11-07); 0.7 encodes at about 286 KB.
        path: [[2, 5], [2.7, 5], [2, 5]],
        lessonQuote: 'Napovej, ali lahko težišče zapusti trikotnik, nato povleci oglišča in preveri.',
        discreteReason: null,
    },
    {
        id: 'inscribed-angle',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Lega točke P (t, stopinje)', step: 0.01},
        // Degrees on the circle. P is confined to the circle, so the slider follows the arc exactly where straight drag legs would not. The arc above AB runs from -23 to 203 degrees; the slider stops at 0, so 10..170 keeps it symmetric, in equal legs.
        path: [90, 50, 10, 50, 90, 130, 170, 130, 90],
        lessonQuote: 'Povleci \\(P\\) z enega konca loka na drugega. Ali se odčitek kdaj spremeni za več kot zaokrožitev?',
        discreteReason: null,
    },
    {
        id: 'euler-line',
        fineGrid: -8,
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P3'},
        // Board coordinates. C (P3) moves 1 right and back (1 encodes at about 253 KB; longer drags exceed 300 KiB), so the Euler line turns. The poster shows no HG or GO readout, so the quote is the step about the line's direction.
        path: [[2, 5], [3, 5], [2, 5]],
        lessonQuote: 'Povleci \\(C\\) za en korak levo ali desno: kaj se zgodi s smerjo premice?',
        discreteReason: null,
    },
    {
        id: 'simson-line',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Lega točke P (t, stopinje)', step: 0.01},
        // Degrees on the circumcircle, starting at the recipe scene's t=60 (P at (5.40, 4.80), the Simson line, perpendiculars and pedal triangle drawn). P is confined to the circle, so the number field follows the arc where straight drag legs would not; 60..140 stays inside the recipe camera.
        path: [60, 100, 140, 100, 60],
        lessonQuote: 'Povleci \\(P\\) po vsej krožnici in opazuj premico.',
        discreteReason: null,
    },
    {
        id: 'inversion',
        motion: 'discrete-exact-steps',
        control: {kind: 'number-field', label: 'Polmer inverzije r', step: 1},
        // The poster is the circle about (3,0), radius 1, with C = (0,0) and r = 2; its image is the circle about (3/2,0), radius 1/2, inside it. r goes 2 -> 3 and back: the image circle (centre 3r^2/8, radius r^2/8) grows from inside the source circle to past its far side (2.25 to 4.5 against 2 to 4), which answers the step's inside-or-outside question. r = 4 is not used: its image circle (centre 6, radius 2) leaves the poster camera on the right.
        path: [0, 1, 0],
        lessonQuote: 'Prikazano je vse. Premakni točko \\(X\\), središče \\(C\\) ali polmer \\(r\\), preklopi fokus in izberi druge primere.',
        discreteReason: 'The inversion kernel is exact rational arithmetic on the integer grid (src/compgeo/inversionModel.ts): the radius field, the r handle and every other handle take whole numbers only, so no smooth motion exists without changing the model.',
    },
];
