'use strict';
module.exports = [
    {
        id: 'point-set-triangulation',
        fineGrid: -8,
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P7'},
        // Board coordinates, inside the recipe camera (x -4.18..12.18, y -1..9). P7 starts at (6,3) (route default) and stays inside the hull.
        path: [[6, 3], [6, 5.5], [6, 3]],
        lessonQuote: 'Povleci ali dodaj točko in preveri, da število trikotnikov ostane enako \\(2n-2-k\\).',
        discreteReason: null,
    },
];
