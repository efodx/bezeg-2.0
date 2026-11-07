'use strict';
module.exports = [
    {
        id: 'curve-offset',
        exampleId: 'curve-geometry.curve-offset.curve-offset',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Razdalja d', step: 0.01},
        // The fixed camera is fitted to the start state only; d stays between -0.5 and -0.15 so the offset stays inside it.
        path: [-0.5, -0.15, -0.5],
        lessonQuote: 'Premakni drsnik razdalje \\(d\\) malo levo in desno.',
        discreteReason: null,
    },
];
