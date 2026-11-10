/**
 * Lattice paths from (0,0) to (a,b) with a right (R) and b up (U) steps.
 * A path is an (a+b)-bit mask: step 0 is the most significant bit, bit 1 = R, bit 0 = U.
 * Ascending numeric order of the masks is the lexicographic order of the step strings with U < R.
 */
import {assertCount, binomial} from './binomial';

/** Enumeration is refused above this many steps. */
export const ENUMERATION_CAP = 12;

export function pathCount(a: number, b: number): bigint {
    assertCount(a, 'a');
    assertCount(b, 'b');
    return binomial(a + b, a);
}

export function enumeratePaths(a: number, b: number): number[] {
    assertCount(a, 'a');
    assertCount(b, 'b');
    const steps = a + b;
    if (steps > ENUMERATION_CAP) {
        throw new RangeError(`enumeration is limited to ${ENUMERATION_CAP} steps, got ${steps}`);
    }
    const paths: number[] = [];
    for (let mask = 0; mask < 1 << steps; mask++) {
        let ones = 0;
        for (let m = mask; m; m &= m - 1) ones++;
        if (ones === a) paths.push(mask);
    }
    return paths;
}

/** Paths from (0,0) to (a,b) through (p,q): paths to (p,q) times paths from (p,q) to (a,b). */
export function pathThrough(a: number, b: number, p: number, q: number): bigint {
    assertCount(a, 'a');
    assertCount(b, 'b');
    assertCount(p, 'p', a);
    assertCount(q, 'q', b);
    return pathCount(p, q) * pathCount(a - p, b - q);
}
