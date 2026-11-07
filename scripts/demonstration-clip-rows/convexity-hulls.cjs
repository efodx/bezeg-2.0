'use strict';
module.exports = [
    {
        id: 'orientation',
        exampleId: 'convexity-hulls.orientation.orientation',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P2'},
        // Board coordinates, inside the recipe camera (x -1.2..5.6, y -1.2..3.6). The first waypoint is q=(4,0), the scene start.
        path: [[4, 0], [2, 3], [4, 0]],
        lessonQuote: 'Premakni \\(q\\) in opazuj, kako se premica \\(pq\\) vrti okoli \\(p\\).',
        discreteReason: null,
    },
    {
        id: 'polygon-area',
        exampleId: 'convexity-hulls.polygon-area.polygon-area',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P4'},
        // Board coordinates, inside the recipe camera (x -2.6..6.6, y -1.4..6.4). The leg to (2,-0.5) crosses edge P2P3 and makes the polygon self-intersect.
        path: [[5, 3], [2, -0.5], [5, 3]],
        lessonQuote: 'Premakni eno oglišče in opazuj, kdaj se izpis spremeni v ploščino.',
        discreteReason: null,
    },
];
