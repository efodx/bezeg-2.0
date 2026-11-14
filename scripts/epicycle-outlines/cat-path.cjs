'use strict';
/*
 * The cat outline: an ORIGINAL silhouette authored for Bezeg (no font glyph, emoji or third-party image was traced).
 * A kitten standing in profile, facing left: a big round head with two pointed ears and a small snub nose, a short chubby body,
 * four stubby legs with round paws, and a tail held straight up that curls forward at the tip.
 *
 * The path is a closed chain of segments, listed clockwise starting at the left ear tip. Each segment is either
 * ['L', x, y] (a line to x, y) or ['C', c1x, c1y, c2x, c2y, x, y] (a cubic Bezier to x, y). y points up; the unit is arbitrary
 * (the generator centres and scales the outline).
 */

const START = [2.0, 10.0];

const SEGMENTS = [
    // between the ears
    ['C', 2.4, 9.6, 2.8, 9.1, 3.2, 9.0],
    ['C', 3.7, 9.1, 4.1, 9.6, 4.5, 10.0],
    // back of the right ear, back of the head, neck
    ['C', 4.8, 9.3, 5.1, 8.3, 5.0, 7.4],
    ['C', 5.2, 6.9, 5.7, 6.7, 6.2, 6.6],
    // the back, to where the tail rises
    ['C', 7.0, 6.5, 7.9, 6.5, 8.6, 6.9],
    // front of the tail up, the curl forward, round the tip, back of the tail down to the rump
    ['C', 9.1, 7.4, 9.5, 8.2, 9.4, 9.0],
    ['C', 9.35, 9.5, 8.9, 9.7, 8.5, 9.6],
    ['C', 8.0, 9.6, 7.9, 10.3, 8.4, 10.4],
    ['C', 9.4, 10.6, 10.3, 10.0, 10.3, 9.0],
    ['C', 10.3, 8.0, 10.2, 7.0, 9.9, 6.2],
    // rump and the far hind leg with its paw
    ['C', 10.3, 5.2, 10.2, 3.9, 9.9, 3.0],
    ['L', 9.8, 0.5],
    ['C', 9.8, 0.2, 9.6, 0.0, 9.3, 0.0],
    ['C', 9.0, 0.0, 8.8, 0.2, 8.8, 0.5],
    ['L', 8.8, 2.0],
    // gap between the hind legs, the near hind leg
    ['C', 8.8, 2.4, 8.3, 2.4, 8.3, 2.0],
    ['L', 8.3, 0.5],
    ['C', 8.3, 0.2, 8.1, 0.0, 7.8, 0.0],
    ['C', 7.5, 0.0, 7.3, 0.2, 7.3, 0.5],
    ['L', 7.3, 2.4],
    // belly
    ['C', 7.0, 2.9, 6.1, 2.9, 5.8, 2.4],
    // the two front legs
    ['L', 5.8, 0.5],
    ['C', 5.8, 0.2, 5.6, 0.0, 5.3, 0.0],
    ['C', 5.0, 0.0, 4.8, 0.2, 4.8, 0.5],
    ['L', 4.8, 2.0],
    ['C', 4.8, 2.4, 4.3, 2.4, 4.3, 2.0],
    ['L', 4.3, 0.5],
    ['C', 4.3, 0.2, 4.1, 0.0, 3.8, 0.0],
    ['C', 3.5, 0.0, 3.3, 0.2, 3.3, 0.5],
    ['L', 3.3, 3.2],
    // chest, chin, the snub nose, forehead, front of the left ear
    ['C', 3.1, 4.0, 3.2, 4.9, 2.9, 5.5],
    ['C', 2.3, 5.4, 1.6, 5.7, 1.3, 6.3],
    ['C', 1.0, 6.5, 0.9, 6.9, 1.1, 7.1],
    ['C', 1.3, 7.5, 1.2, 8.1, 1.5, 8.6],
    ['C', 1.6, 9.1, 1.8, 9.6, 2.0, 10.0],
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
