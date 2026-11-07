'use strict';
module.exports = [
    {
        id: 'triangle-centres',
        exampleId: 'triangle-geometry.notable-points.triangle-centres',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P3'},
        // Board coordinates. The example scene shows the triangle and G only, so the quote is the centroid step's. C (P3) moves about a fifth of the 18.3-wide board and back.
        path: [[2, 5], [6, 5], [2, 5]],
        lessonQuote: 'Napovej, ali lahko težišče zapusti trikotnik, nato povleci oglišča in preveri.',
        discreteReason: null,
    },
    {
        id: 'inscribed-angle',
        exampleId: 'triangle-geometry.inscribed-angle.inscribed-angle',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Lega točke P (t, stopinje)', step: 0.01},
        // Degrees on the circle. P is confined to the circle, so the slider follows the arc exactly where straight drag legs would not. The arc above AB runs from -23 to 203 degrees; the slider stops at 0, so 10..170 keeps it symmetric, in equal legs.
        path: [90, 50, 10, 50, 90, 130, 170, 130, 90],
        lessonQuote: 'Povleci \\(P\\) z enega konca loka na drugega. Ali se odčitek kdaj spremeni za več kot zaokrožitev?',
        discreteReason: null,
    },
    {
        id: 'euler-line',
        exampleId: 'triangle-geometry.euler-line.euler-line',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P3'},
        // Board coordinates. C (P3) moves about a fifth of the board's width to the right and back, so the Euler line turns while HG and GO are read.
        path: [[2, 5], [6, 5], [2, 5]],
        lessonQuote: 'Povleci \\(C\\) (P3) na nekaj mest in vsakič preveri odčitka \\(HG\\) in \\(GO\\).',
        discreteReason: null,
    },
];
