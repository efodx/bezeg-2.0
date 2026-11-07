'use strict';
module.exports = [
    {
        id: 'reduction',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'p_{1}'},
        // Board coordinates. The first waypoint must be the point's real start (checked to 0.02).
        path: [[1.33, 2.67], [1.33, 3.3], [1.33, 2.67]],
        lessonQuote: 'Povleci kontrolno točko in opazuj polje Tretja diferenca ter vrstico o nižljivosti.',
        discreteReason: null,
    },
    {
        id: 'arc-length-param',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Lega točke', step: 0.001},
        // The poster keeps the graph defaults: the mover position is 0 (arcMoverPosition) and the speed graph, equal-t circles and equal-arc squares are on. The mover goes along the curve to 0.8 and back.
        path: [0, 0.8, 0],
        lessonQuote: 'Poženi točko in opazuj, kje se premika hitro in kje počasi.',
        discreteReason: null,
    },
];
