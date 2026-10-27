/** Bernstein weights of a tensor-product patch. Pure: no graph, renderer or React types. */

/** The binomial coefficient C(n, k) for small integer degrees. */
function binomial(n: number, k: number): number {
    let result = 1;
    for (let r = 1; r <= k; r++) result = result * (n - k + r) / r;
    return result;
}

/** The Bernstein polynomial B_i^n(t) = C(n, i) t^i (1 - t)^(n - i). */
export function bernstein(degree: number, i: number, t: number): number {
    return binomial(degree, i) * t ** i * (1 - t) ** (degree - i);
}

/** The weight B_i^m(u) B_j^n(v) with which control point b_ij contributes to S(u, v). */
export function patchBernsteinWeight(m: number, n: number, i: number, j: number, u: number, v: number): number {
    return bernstein(m, i, u) * bernstein(n, j, v);
}
