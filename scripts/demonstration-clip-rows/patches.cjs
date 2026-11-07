'use strict';
module.exports = [
    {
        id: 'patch-coons',
        motion: 'pointer-drag',
        // A corner of the Coons patch, by the point id the surface view publishes in data-surface-framing.
        control: {kind: 'surface-point', name: 'c0-0'},
        // Screen-pixel offsets from the point's start in the 360x220 preview host; the first waypoint is always [0, 0].
        path: [[0, 0], [-16, -12], [0, 0]],
        lessonQuote: 'Povleci vogal in opazuj, da se premakneta obe krivulji, ki se tam stikata.',
        discreteReason: null,
    },
];
