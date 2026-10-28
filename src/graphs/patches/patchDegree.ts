/** Degree lowering of a tensor-product net along one direction. Pure: no graph, renderer or React types. */
import {bernstein} from "./patchBernstein";
import type {Xyz} from "./surface-view/surfaceScene";

/** Solves the square system `a x = b` in place by Gaussian elimination with partial pivoting. */
export function solveLinearSystem(a: number[][], b: number[]): number[] {
    const size = b.length;
    for (let col = 0; col < size; col++) {
        let pivot = col;
        for (let r = col + 1; r < size; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
        [a[col], a[pivot]] = [a[pivot], a[col]];
        [b[col], b[pivot]] = [b[pivot], b[col]];
        for (let r = col + 1; r < size; r++) {
            const factor = a[r][col] / a[col][col];
            for (let c = col; c < size; c++) a[r][c] -= factor * a[col][c];
            b[r] -= factor * b[col];
        }
    }
    const x = new Array<number>(size).fill(0);
    for (let r = size - 1; r >= 0; r--) {
        let sum = b[r];
        for (let c = r + 1; c < size; c++) sum -= a[r][c] * x[c];
        x[r] = sum / a[r][r];
    }
    return x;
}

/**
 * The control points of the degree-`target` Bezier curve that interpolates the degree-`points.length - 1` curve
 * `points` at the parameters k/target. This is exact when the curve already has degree <= target (so it undoes an
 * elevation) and keeps both end points; otherwise it is an approximation.
 */
export function lowerCurveDegree(points: readonly Xyz[], target: number): Xyz[] {
    const degree = points.length - 1;
    const parameters = Array.from({length: target + 1}, (_, k) => k / target);
    const samples = parameters.map((t): Xyz => {
        const out: Xyz = [0, 0, 0];
        points.forEach((p, i) => {
            const w = bernstein(degree, i, t);
            out[0] += w * p[0]; out[1] += w * p[1]; out[2] += w * p[2];
        });
        return out;
    });
    const coordinates = [0, 1, 2].map(axis => {
        const matrix = parameters.map(t => Array.from({length: target + 1}, (_, i) => bernstein(target, i, t)));
        return solveLinearSystem(matrix, samples.map(s => s[axis]));
    });
    return Array.from({length: target + 1}, (_, i): Xyz => [coordinates[0][i], coordinates[1][i], coordinates[2][i]]);
}

/**
 * Lowers the net `net[i][j]` to `degree` along `direction` only: every row (u) or column (v) curve is lowered on its
 * own and the other index and its control points are untouched.
 */
export function lowerNetDegree(net: readonly (readonly Xyz[])[], direction: "u" | "v", degree: number): Xyz[][] {
    if (direction === "u") {
        const columns = net[0].map((_, j) => lowerCurveDegree(net.map(row => row[j]), degree));
        return Array.from({length: degree + 1}, (_, i) => columns.map((column): Xyz => [...column[i]]));
    }
    return net.map(row => lowerCurveDegree(row, degree));
}
