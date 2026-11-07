'use strict';
module.exports = [
    {
        id: 'reduction',
        exampleId: 'advanced-bezier.reduction.reduction',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'p_{1}'},
        // Board coordinates. The first waypoint must be the point's real start (checked to 0.02).
        path: [[1.33, 2.67], [1.33, 3.3], [1.33, 2.67]],
        lessonQuote: 'Povleci kontrolno točko in opazuj polje Tretja diferenca ter vrstico o nižljivosti.',
        discreteReason: null,
    },
];
