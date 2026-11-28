'use strict';
module.exports = [
    {
        id: 'curve-offset',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Razdalja d', step: 0.01},
        // The recipe scene starts at d = -1 (poster recipe). The slider goes a little right, then a little left, and back, as the lesson says; the fixed camera is the recipe camera, so the offset must stay inside it.
        path: [-1, -0.7, -1, -1.3, -1],
        lessonQuote: 'S krmilnikom Razdalja premakni \\(d\\) malo levo in desno.',
        discreteReason: null,
    },
    {
        id: 'curve-parametric',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Polmer kroga R', step: 0.05},
        // The graph default is radius 1 (CYCLOID_RADIUS_DEFAULT) at t = pi/2. The t slider cannot close the loop (the state holds 1.5708, the 0.01 slider returns to 1.57), so the radius slider, on its grid, shrinks to 0.35, grows to 1.1 and returns; 1 to 1.5 alone gave 11 distinct frames (preflight). Above 1.1 the arch (width 2*pi*r from a fixed left end) leaves the camera on the right (visual review, handler 6), so the growth stops at 1.1.
        path: [1, 0.35, 1.1, 1],
        lessonQuote: 'S krmilnikom Polmer kroga nastavi polmer na \\(2\\) in preveri, kako se spremenita dolžina in ploščina.',
        discreteReason: null,
    },
    {
        id: 'curve-curvature',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // The poster is the default parabola at t = 0.5 (CURVATURE_T_DEFAULT). The recipe window [-2.2, 1.65, 2.2, -1.05] (the capture pads it by 14 percent a side) holds the circle, whose top is y = 3x² + 0.5 + R with R = (1 + 4x²)^1.5 / 2 at x = 2t - 1, up to t = 0.65 (top 1.56); at 0.7 the top is 2.03 and touches the padded edge, so the slider stops at 0.65.
        path: [0.5, 0.65, 0.5],
        lessonQuote: 'S krmilnikom Parameter nastavi \\(t=1\\) in primerjaj odčitke v kartici Odčitki z vrednostmi v besedilu.',
        discreteReason: null,
    },
    {
        id: 'curve-comb',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Ojačitev g', step: 0.05},
        // The poster is the C1 spline with the comb on (recipe); the gain keeps its default 1.4 (COMB_GAIN_DEFAULT). It rises to 2.2 and back (at 2.6 the lowest teeth left the frame, visual review handler 6); the quote's step uses the cubic, the motion is the same slider.
        path: [1.4, 2.2, 1.4],
        lessonQuote: 'Premakni krmilnik Ojačitev in opazuj, kako se spreminja dolžina zob.',
        discreteReason: null,
    },
    {
        id: 'curve-evolute',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // The recipe sets t = 0.8 and the whole evolute is the graph default. E stays between (4, 3.5) and (-4, 3.5) for t from 0.2 to 0.8, inside the recipe camera.
        path: [0.8, 0.2, 0.8],
        lessonQuote: 'S krmilnikom Parameter premakni \\(t\\) od \\(0\\) do \\(1\\) in sledi točki \\(E\\), ki jo kaže tudi kartica Odčitki.',
        discreteReason: null,
    },
    {
        id: 'curve-envelope',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // The poster keeps the graph defaults: sixteen lines, the highlighted line and touching point at t = 0.5 (ENVELOPE_T_DEFAULT). The touching point ((1-t)^2, t^2) stays inside the recipe camera for t up to 0.9.
        path: [0.5, 0.9, 0.5],
        lessonQuote: 'S krmilnikom Parameter premikaj \\(t\\) od \\(0\\) do \\(1\\) in spremljaj dotikališče.',
        discreteReason: null,
    },
];
