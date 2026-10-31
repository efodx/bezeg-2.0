/**
 * Singular values and axes of a 2x2 matrix (lesson L4). Free of React, JSXGraph and localization.
 * Discrete outcomes (singular, circle) are exact on quarter-grid entries: A^T A has entries that are multiples of
 * 1/16 below 2^53, so det = 0 and "A^T A is a multiple of I" are exact comparisons. Values are computed.
 */
import {gridInteger} from './eigen2';
import {Mat2, Vec2} from './matrix2';

export interface SingularData {
    /** sigma1 >= sigma2 >= 0; sigma1 * sigma2 = |det A|. */
    sigma: readonly [number, number];
    /** Orthonormal right singular directions in the domain; arbitrary (the standard basis) when the axes are not unique. */
    right: readonly [Vec2, Vec2];
    /** Left singular directions A v_i / sigma_i (orthonormal) in the image; undefined when sigma_i = 0. */
    left: readonly [Vec2 | undefined, Vec2 | undefined];
    /** sigma2 = 0 (det A = 0, exact): the image of the circle is a segment or a point, no ellipse. */
    segmentOrPoint: boolean;
    /** sigma1 = sigma2 > 0: the image of the circle is a circle and the axes are not unique. */
    circle: boolean;
}

export function singular(m: Mat2): SingularData {
    const [[a, b], [c, d]] = m;
    // Rejects non-finite and off-grid entries, so the exact flags below never depend on rounding.
    [a, b, c, d].forEach(gridInteger);
    // A^T A = [[p, q], [q, r]]
    const p = a * a + c * c;
    const q = a * b + c * d;
    const r = b * b + d * d;
    const determinant = a * d - b * c;
    const segmentOrPoint = determinant === 0;
    const scalarGram = q === 0 && p === r;
    const circle = scalarGram && !segmentOrPoint;

    const lambda1 = (p + r + Math.hypot(p - r, 2 * q)) / 2;
    const sigma1 = Math.sqrt(lambda1);
    const sigma2 = segmentOrPoint ? 0 : scalarGram ? sigma1 : Math.abs(determinant) / sigma1;

    let right: readonly [Vec2, Vec2];
    if (scalarGram) {
        right = [[1, 0], [0, 1]];
    } else {
        const theta = Math.atan2(2 * q, p - r) / 2; // in (-pi/2, pi/2]
        right = [[Math.cos(theta), Math.sin(theta)], [-Math.sin(theta), Math.cos(theta)]];
    }
    const image = (v: Vec2, sigma: number): Vec2 | undefined => sigma > 0
        ? [(a * v[0] + b * v[1]) / sigma + 0, (c * v[0] + d * v[1]) / sigma + 0]
        : undefined;
    return {
        sigma: [sigma1, sigma2],
        right,
        left: [image(right[0], sigma1), image(right[1], sigma2)],
        segmentOrPoint,
        circle,
    };
}
