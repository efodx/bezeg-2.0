'use strict';
module.exports = [
    {
        id: 'voronoi',
        fineGrid: -8,
        restyle: {reason: 'The cell of the nearest site is highlighted with a thicker outline, and the highlight passes to the next cell as the query point crosses a border.'},
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'voronoi-query'},
        // Board coordinates, inside the recipe camera (x -5.16..13.16, y -2..9.2). The example scene puts the query point at (4, 2) in the cell of P6 (3, 3); it crosses into the cell of P7 (6, 3), back, and into the cell of P1 (0, 0), so the highlighted cell changes at each border.
        path: [[4, 2], [6.5, 2], [4, 2], [1, 1], [4, 2]],
        lessonQuote: 'Postavi točko poizvedbe na mejo dveh celic in preberi, katera mesta izpis imenuje.',
        discreteReason: null,
    },
    {
        id: 'voronoi-degenerate',
        fineGrid: -8,
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P4'},
        // Board coordinates. The "Trapez" sites (0,0), (8,0), (9,5), (-1,5) are cocircular, so the vertex (4, 3.4) has degree 4. P4 (-1, 5) moves up 1 and down 1 and back, off the circle, so the vertex splits into two of degree 3 joined by a short edge whose direction flips as P4 passes through the circle.
        path: [[-1, 5], [-1, 6], [-1, 5], [-1, 4], [-1, 5]],
        lessonQuote: 'Premakni eno točko trapeza za korak mreže in preberi, kaj izpis pove o določilki in diagonalah.',
        discreteReason: null,
    },
];
