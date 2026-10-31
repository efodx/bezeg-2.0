/**
 * Pascal's theorem on exact homogeneous points (spec K2).
 *
 * For an ordered hexagon P0..P5 the sides are s_i = P_i P_(i+1) (indices mod 6). The three Pascal points are the
 * intersections of the opposite sides s0 s3, s1 s4 and s2 s5. They are collinear exactly when their 3x3 determinant is
 * zero; the determinant is a BigInt, so "exactly collinear" is an integer comparison. A Pascal point may be ideal.
 */
import {det3, join, isZero, meet, type Hom} from './homogeneous';

export type PascalResult =
    | {
          readonly status: 'ok';
          /** s0 s3, s1 s4, s2 s5. */
          readonly points: readonly [Hom, Hom, Hom];
          /** Exact determinant of the three points (normalized triples). Zero iff they are collinear. */
          readonly determinant: bigint;
          readonly collinear: boolean;
          /** The Pascal line when the points are collinear and not all equal; null otherwise. */
          readonly line: Hom | null;
      }
    /** Two consecutive hexagon points coincide, so side `side` (0..5) is undefined. */
    | {readonly status: 'undefined-side'; readonly side: number}
    /** Opposite sides `pair` (0..2: s_pair and s_(pair+3)) lie on the same line, so their intersection is undefined. */
    | {readonly status: 'coincident-opposite-sides'; readonly pair: number};

export function pascal(hexagon: readonly Hom[]): PascalResult {
    if (hexagon.length !== 6) throw new RangeError(`a hexagon has 6 points, got ${hexagon.length}`);
    if (hexagon.some(isZero)) throw new RangeError('the zero triple is not a point');
    const sides: Hom[] = [];
    for (let i = 0; i < 6; i++) {
        const s = join(hexagon[i], hexagon[(i + 1) % 6]);
        if (isZero(s)) return {status: 'undefined-side', side: i};
        sides.push(s);
    }
    const pts: Hom[] = [];
    for (let i = 0; i < 3; i++) {
        const m = meet(sides[i], sides[i + 3]);
        if (isZero(m)) return {status: 'coincident-opposite-sides', pair: i};
        pts.push(m);
    }
    const [a, b, c] = pts;
    const determinant = det3(a, b, c);
    const collinear = determinant === 0n;
    let line: Hom | null = null;
    if (collinear) {
        const l = join(a, b);
        line = !isZero(l) ? l : (() => {
            const l2 = join(a, c);
            return isZero(l2) ? join(b, c) : l2;
        })();
        if (isZero(line)) line = null;
    }
    return {status: 'ok', points: [a, b, c], determinant, collinear, line};
}
