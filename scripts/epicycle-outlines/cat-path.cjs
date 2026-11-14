'use strict';
/*
 * The cat outline: an ORIGINAL silhouette authored for Bezeg (no font glyph, emoji or third-party image was traced).
 * A sitting cat seen from the front: two pointed ears, a round head, a pear-shaped body with a notch between the front paws,
 * and a tail that lies on the ground to the right, rises and curls over at the tip.
 *
 * The path is a closed chain of segments, listed clockwise starting at the left ear tip. Each segment is either
 * ['L', x, y] (a line to x, y) or ['C', c1x, c1y, c2x, c2y, x, y] (a cubic Bezier to x, y). y points up; the unit is arbitrary
 * (the generator centres and scales the outline).
 */

const START = [2.0, 11.0];

const SEGMENTS = [
    // between the ears
    ['C', 2.9, 10.2, 3.7, 9.4, 4.4, 9.4],
    ['C', 5.1, 9.4, 5.9, 10.2, 6.8, 11.0],
    // right ear outside, right cheek, chin
    ['C', 7.4, 10.2, 7.8, 9.4, 7.8, 8.4],
    ['C', 7.8, 7.4, 7.0, 6.8, 6.2, 6.6],
    // right side of the body down to where the tail joins
    ['C', 7.0, 5.8, 7.2, 3.2, 6.9, 1.6],
    // inside of the tail up to its tip, over the tip, outside of the tail down
    ['C', 7.9, 1.7, 8.8, 2.4, 8.8, 3.6],
    ['C', 8.8, 4.6, 8.8, 5.4, 8.4, 5.8],
    ['C', 8.5, 6.3, 9.5, 6.2, 9.8, 5.0],
    ['C', 10.1, 4.2, 10.4, 3.2, 10.2, 2.2],
    ['C', 10.1, 0.8, 9.4, 0.0, 8.5, 0.0],
    // the ground: tail, right paw, notch between the paws, left paw
    ['L', 5.0, 0.0],
    ['C', 4.8, 0.9, 4.55, 1.3, 4.35, 1.3],
    ['C', 4.15, 1.3, 3.9, 0.9, 3.7, 0.0],
    ['L', 1.9, 0.0],
    // left side of the body, neck, left cheek, left ear outside
    ['C', 1.3, 0.8, 1.2, 2.0, 1.7, 3.0],
    ['C', 2.0, 4.4, 2.2, 5.8, 2.6, 6.6],
    ['C', 1.8, 6.8, 1.0, 7.4, 1.0, 8.4],
    ['C', 1.0, 9.4, 1.4, 10.2, 2.0, 11.0],
];

/** The path as a dense polyline (`perSegment` points per cubic), first point not repeated at the end. */
function catPolyline(perSegment = 60) {
    const points = [START.slice()];
    let [px, py] = START;
    for (const seg of SEGMENTS) {
        if (seg[0] === 'L') {
            points.push([seg[1], seg[2]]);
            [px, py] = [seg[1], seg[2]];
        } else {
            const [, c1x, c1y, c2x, c2y, x, y] = seg;
            for (let i = 1; i <= perSegment; i++) {
                const u = i / perSegment;
                const a = (1 - u) ** 3;
                const b = 3 * u * (1 - u) ** 2;
                const c = 3 * u * u * (1 - u);
                const d = u ** 3;
                points.push([a * px + b * c1x + c * c2x + d * x, a * py + b * c1y + c * c2y + d * y]);
            }
            [px, py] = [x, y];
        }
    }
    points.pop(); // the last point is the start again
    return points;
}

module.exports = {catPolyline, START, SEGMENTS};
