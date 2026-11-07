'use strict';
module.exports = [
    {
        id: 'curve-offset',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Razdalja d', step: 0.01},
        // The recipe scene starts at d = -1 (poster recipe). The slider goes a little right, then a little left, and back, as the lesson says; the fixed camera is the recipe camera, so the offset must stay inside it.
        path: [-1, -0.7, -1, -1.3, -1],
        lessonQuote: 'Premakni drsnik razdalje \\(d\\) malo levo in desno.',
        discreteReason: null,
    },
    {
        id: 'curve-parametric',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Polmer kotalečega se kroga', step: 0.05},
        // The graph default is radius 1 (CYCLOID_RADIUS_DEFAULT) at t = pi/2. The t slider cannot close the loop (the state holds 1.5708, the 0.01 slider returns to 1.57), so the radius slider, on its grid, shrinks to 0.35, grows to 1.6 and returns; 1 to 1.5 alone gave 11 distinct frames (preflight).
        path: [1, 0.35, 1, 1.6, 1],
        lessonQuote: 'Nastavi polmer na \\(2\\) in preveri, kako se spremenita dolžina in ploščina.',
        discreteReason: null,
    },
    {
        id: 'curve-curvature',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // The poster is the default parabola at t = 0.5 (CURVATURE_T_DEFAULT). The circle leaves the fixed default camera [-5, 5, 5, -5] before t = 0.89 (preflight), so the slider stops at 0.8.
        path: [0.5, 0.8, 0.5],
        lessonQuote: 'Nastavi \\(t=1\\) in primerjaj izpis z vrednostmi v besedilu.',
        discreteReason: null,
    },
    {
        id: 'curve-comb',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Ojačitev glavnika', step: 0.05},
        // The poster is the C1 spline with the comb on (recipe); the gain keeps its default 1.4 (COMB_GAIN_DEFAULT). It rises to 2.6 and back; the quote's step uses the cubic, the motion is the same slider.
        path: [1.4, 2.6, 1.4],
        lessonQuote: 'Premakni drsnik za ojačitev in opazuj, kako se spreminja dolžina zob.',
        discreteReason: null,
    },
    {
        id: 'curve-evolute',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // The recipe sets t = 0.8 and the whole evolute is the graph default. E stays between (4, 3.5) and (-4, 3.5) for t from 0.2 to 0.8, inside the recipe camera.
        path: [0.8, 0.2, 0.8],
        lessonQuote: 'Premakni \\(t\\) od \\(0\\) do \\(1\\) in sledi točki \\(E\\).',
        discreteReason: null,
    },
    {
        id: 'curve-envelope',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.01},
        // The poster keeps the graph defaults: sixteen lines, the highlighted line and touching point at t = 0.5 (ENVELOPE_T_DEFAULT). The touching point ((1-t)^2, t^2) stays inside the recipe camera for t up to 0.9.
        path: [0.5, 0.9, 0.5],
        lessonQuote: 'Z drsnikom »Parameter t« v pregledovalniku premikaj \\(t\\) od \\(0\\) do \\(1\\) in spremljaj dotikališče.',
        discreteReason: null,
    },
];
