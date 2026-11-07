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
