'use strict';
module.exports = [
    {
        id: 'interp-lagrange',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P0'},
        // Board coordinates. The poster scene holds the default points (0,0), (1,2), (3,3), (4,0); P0 goes up 1.5 and back, so the whole Lagrange polynomial bends. The quote's Bezier curve is off in the poster.
        path: [[0, 0], [0, 1.5], [0, 0]],
        lessonQuote: 'Povleci \\(P_0\\) in opazuj oba konca obeh krivulj.',
        discreteReason: null,
    },
    {
        id: 'interp-least-squares',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Točka 4, y', step: 0.1},
        // The number field of the fourth data point (3,4), down to y=1.2 and back. A board drag snaps to 0.1 and the dragged points have no stable name, so the field is the smooth control; the camera top is y=4.6, so the point moves down. The quote's higher-degree polynomial is not in the poster (degree 1).
        path: [4, 1.2, 4],
        lessonQuote: 'Premakni eno točko daleč stran in primerjaj, kako se premakne premica in kako polinom višje stopnje.',
        discreteReason: null,
    },
    {
        id: 'interp-subdivision',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P3'},
        // Board coordinates. The poster scene is Chaikin's rule after one step on the default polygon; P3 (4,0) goes up 1.5 and back. The quote compares with the four-point rule, which the poster does not show.
        path: [[4, 0], [4, 1.5], [4, 0]],
        lessonQuote: 'Povleci \\(P_3\\) nad premico skozi \\(P_0,P_1,P_2\\) in primerjaj obe pravili.',
        discreteReason: null,
    },
];
