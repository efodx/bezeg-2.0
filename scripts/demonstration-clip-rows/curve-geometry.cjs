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
];
