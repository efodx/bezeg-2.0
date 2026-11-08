'use strict';
module.exports = [
    {
        id: 'orientation',
        fineGrid: -8,
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P2'},
        // Board coordinates, inside the recipe camera (x -1.2..5.6, y -1.2..3.6). The first waypoint is q=(4,0), the scene start.
        path: [[4, 0], [2, 3], [4, 0]],
        lessonQuote: 'Premakni \\(q\\) in opazuj, kako se premica \\(pq\\) vrti okoli \\(p\\).',
        discreteReason: null,
    },
    {
        id: 'polygon-area',
        fineGrid: -8,
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P4'},
        // Board coordinates, inside the recipe camera (x -2.6..6.6, y -1.4..6.4). The leg to (2,-0.5) crosses edge P2P3 and makes the polygon self-intersect.
        path: [[5, 3], [2, -0.5], [5, 3]],
        lessonQuote: 'Premakni eno oglišče in opazuj, kdaj se izpis spremeni v ploščino.',
        discreteReason: null,
    },
    {
        id: 'point-in-polygon',
        motion: 'discrete-exact-steps',
        control: {kind: 'number-field', label: 'Točka q, y', step: 1},
        // The poster is the notched pentagon (0,0), (6,0), (6,4), (3,2), (0,4) with q = (3,1) and its ray. q goes up to (3,2), the notch vertex on the boundary, then (3,3) in the notch, outside (the ray crosses the edges at x = 4.5 and x = 6), and back.
        path: [0, 1, 2, 1, 0],
        lessonQuote: 'Primerjaj napoved s številom presečišč in premakni \\(q\\) navzgor v zarezo.',
        discreteReason: 'The point-set kernel is exact arithmetic on the integer grid: the q field and the q handle take whole numbers only, so q can only step from lattice point to lattice point.',
    },
];
