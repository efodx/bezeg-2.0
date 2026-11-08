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
    {
        id: 'bezier-clipping',
        motion: 'discrete-exact-steps',
        control: {kind: 'trace-step', label: 'Naslednji korak', step: 1},
        // The poster is the default crossing pair after four clips. Further presses clip on: the kept ranges shrink around the two crossings. A control-point drag would reset the clipping display to its start (lesson text), so the row steps the run.
        path: [0, 1, 2, 1, 0],
        lessonQuote: 'Premikaj kontrolne točke obeh krivulj, spreminjaj toleranco in pritiskaj Naslednji korak.',
        discreteReason: 'Bézier clipping advances one clip per press; between presses there is no intermediate state, and moving a point or the tolerance resets the run to its start.',
    },
];
