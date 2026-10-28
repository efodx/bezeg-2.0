/** Degree changes and default nets of a triangular patch net. Pure: no graph, renderer or React types. */
import {TriangularBezierPatch} from "../../bezeg/impl/patch/triangular-bezier-patch";
import {PointImpl} from "../../bezeg/impl/point/point-impl";
import {solveLinearSystem} from "./patchDegree";
import {triangularIndices} from "./TriangularPatchLattice";
import type {Xyz} from "./surface-view/surfaceScene";

export const MIN_TRIANGULAR_DEGREE = 1;
export const MAX_TRIANGULAR_DEGREE = 4;

export const triangularFromNet = (net: ReadonlyArray<Xyz>): TriangularBezierPatch =>
    new TriangularBezierPatch(net.map(([x, y, z]) => new PointImpl(x, y, undefined, z)));

const netOf = (patch: TriangularBezierPatch): Xyz[] => patch.getControlNet().map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0]);

const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);

/** The trivariate Bernstein polynomial `n!/(i!j!k!) u^i v^j w^k`, with `(u, v, w)` the lattice point `(a, b, c)/n`. */
function bernsteinAtLattice(degree: number, [i, j, k]: readonly [number, number, number], [a, b, c]: readonly [number, number, number]): number {
    return factorial(degree) / (factorial(i) * factorial(j) * factorial(k)) * (a / degree) ** i * (b / degree) ** j * (c / degree) ** k;
}

/** Exact degree elevation by one (`b'_ijk = (i b_(i-1)jk + j b_i(j-1)k + k b_ij(k-1)) / (n+1)`); the surface is unchanged. */
export const elevateTriangularNet = (net: ReadonlyArray<Xyz>): Xyz[] => netOf(triangularFromNet(net).elevate());

/**
 * The degree-`target` net whose surface interpolates the given surface at the lattice points `(i, j, k)/target`.
 * That is exact when the surface already has degree <= target (so it undoes an elevation) and keeps the three corners;
 * otherwise it is an approximation, not a least-squares fit.
 */
export function lowerTriangularNet(net: ReadonlyArray<Xyz>, target: number): Xyz[] {
    const source = triangularFromNet(net);
    const lattice = triangularIndices(target);
    const samples = lattice.map(([a, b]) => {
        const point = source.eval(a / target, b / target);
        return [point.X(), point.Y(), point.Z?.() ?? 0];
    });
    const coordinates = [0, 1, 2].map(axis => solveLinearSystem(
        lattice.map(point => lattice.map(index => bernsteinAtLattice(target, index, point))),
        samples.map(sample => sample[axis])));
    return lattice.map((_, index): Xyz => [coordinates[0][index], coordinates[1][index], coordinates[2][index]]);
}

/** Changes the degree of a net to `target` by exact elevation (up) or lattice interpolation (down). */
export function changeTriangularDegree(net: ReadonlyArray<Xyz>, current: number, target: number): Xyz[] {
    if (target < current) return lowerTriangularNet(net, target);
    let raised: Xyz[] = net.map((p): Xyz => [...p]);
    for (let degree = current; degree < target; degree++) raised = elevateTriangularNet(raised);
    return raised;
}

/** Triangle corners in the xy plane: `A = (n,0,0)`, `B = (0,n,0)` and `C = (0,0,n)`. */
const CORNERS: readonly [readonly [number, number], readonly [number, number], readonly [number, number]] = [[-1.5, -1.3], [1.5, -1.3], [0, 1.3]];
const DOME_HEIGHT = 3;

/**
 * The canonical default net of a degree, in canonical order. The control points sit on the triangle's lattice; their
 * height falls from `DOME_HEIGHT * (1 - max(i,j,k)/n)` at the middle to 0 at the corners. A degree-1 net is a tilted
 * plane (the corner `C` raised), since a flat triangle would show no surface.
 */
export function defaultTriangularNet(degree: number): Xyz[] {
    return triangularIndices(degree).map(([i, j, k]): Xyz => {
        const x = (i * CORNERS[0][0] + j * CORNERS[1][0] + k * CORNERS[2][0]) / degree;
        const y = (i * CORNERS[0][1] + j * CORNERS[1][1] + k * CORNERS[2][1]) / degree;
        const z = degree === 1 ? 1.2 * k : DOME_HEIGHT * (1 - Math.max(i, j, k) / degree);
        return [x, y, z];
    });
}
