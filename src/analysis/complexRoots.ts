/**
 * The n solutions of z^n = w (complex maps lesson M2). Pure mathematics: no React, JSXGraph or localization imports.
 *
 * Ordering and branch cut: root k (k = 0..n-1) is |w|^(1/n) e^{i (Arg w + 2 pi k) / n} with Arg w the principal argument of
 * `complexArgument`, in (-pi, pi]. Root 0 is the principal root. The labelling jumps across the negative real axis although
 * the set of roots does not. An exactly negative real w has Arg w = exactly pi.
 *
 * Typed results (nothing throws):
 * - `roots`: w != 0; `roots[k]` carries the point and its principal argument (in (-pi, pi], from the point).
 * - `zero`: w = 0; the single root 0 with multiplicity n.
 * - `invalid-degree`: n is not an integer in 2..8.
 */

import {Complex, complexArgument, complexModulus, polarToComplex} from './complex';

export const COMPLEX_ROOT_DEGREE_MIN = 2;
export const COMPLEX_ROOT_DEGREE_MAX = 8;

export interface ComplexRoot {
    readonly index: number;
    readonly point: Complex;
    /** The principal argument of the root, in (-pi, pi]. */
    readonly argument: number;
}

export type NthRootsResult =
    | {
    readonly kind: 'roots';
    readonly degree: number;
    /** |w|^(1/n), the radius of the regular n-gon. */
    readonly radius: number;
    /** The principal argument of w. */
    readonly argument: number;
    readonly roots: readonly ComplexRoot[];
}
    | { readonly kind: 'zero'; readonly degree: number; readonly root: Complex; readonly multiplicity: number }
    | { readonly kind: 'invalid-degree' };

export const isComplexRootDegree = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n >= COMPLEX_ROOT_DEGREE_MIN && n <= COMPLEX_ROOT_DEGREE_MAX;

/** The n roots of z^n = w in the stated order; see the file comment for the shapes of the result. */
export function nthRoots(w: Complex, n: number): NthRootsResult {
    if (!isComplexRootDegree(n)) return {kind: 'invalid-degree'};
    const argument = complexArgument(w);
    if (argument === undefined) return {kind: 'zero', degree: n, root: {re: 0, im: 0}, multiplicity: n};
    const radius = Math.pow(complexModulus(w), 1 / n);
    const roots: ComplexRoot[] = [];
    for (let k = 0; k < n; k++) {
        const angle = (argument + 2 * Math.PI * k) / n;
        const point = polarToComplex(radius, angle);
        roots.push({index: k, point, argument: complexArgument(point) ?? angle});
    }
    return {kind: 'roots', degree: n, radius, argument, roots};
}
