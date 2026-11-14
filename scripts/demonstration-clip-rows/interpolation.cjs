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
    {
        id: 'interp-hermite',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Točka 2, y', step: 0.01},
        // The poster scene is the Catmull-Rom mode with the default points; P1 is (1, 2). A pointer drag fails the driver's fixed-handle check (the tangent handles are draggable points that follow P1), so the y field of P1 ("Točka 2, y") is swept: P1 goes down 1 and back, and the tangent arrows at P0, P1 and P2 turn with it.
        path: [2, 1, 2],
        lessonQuote: 'Povleci \\(P_1\\) in opazuj, kako se obe sosednji tangenti prilagodita.',
        discreteReason: null,
    },
    {
        id: 'interp-runge',
        motion: 'discrete-exact-steps',
        control: {kind: 'stepper', label: 'Povečaj število', step: 1},
        // Cumulative presses from the poster degree n=10 (the graph default): up to n=16 and back.
        path: [0, 2, 4, 6, 4, 2, 0],
        lessonQuote: 'Višaj stopnjo za nekaj korakov in opazuj, kako se spreminja polinom ob krajiščih.',
        discreteReason: 'The degree n is an integer changed only by the Povečaj and Zmanjšaj buttons; the page has no slider or draggable node, so no smooth control exists.',
        offCamera: {points: ['runge-grid-max'], reason: 'The maximum-error marker sits on the overshoot near the ends, which grows past the top of the view as n rises; that growth is what the lesson asks the learner to watch.'},
    },
];
