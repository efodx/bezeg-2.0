import {elevate} from "../../bezeg/impl/kernels/bezier-kernels";
import {patchFromNet} from "./patchSceneBuilder";
import {DEFAULT_DEGENERACY_TOLERANCE, tensorDifferentials} from "./tensorDerivatives";
import type {Xyz} from "./surface-view/surfaceScene";

/**
 * Pure join model for two tensor patches on coordinate nets `net[i][j]` (`i` along `u`): patch `A`'s
 * boundary `u = 1` meets patch `B`'s boundary `u = 0`, both traversed by the same `v`. See
 * docs/reviews/bezier-patches/subdivision-joins.md. No React, Three, JSXGraph or graph state.
 */

export type JoinContinuity = "none" | "c0" | "c1" | "g1";

/** Ratio range the route offers for G1; the maths only needs `alpha > 0`. */
export const JOIN_ALPHA_RANGE = {min: 0.25, max: 4} as const;

const DEFAULT_SAMPLES = 16;

type Net = Xyz[][];

const sub = (a: Xyz, b: Xyz): Xyz => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Xyz, b: Xyz): Xyz => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Xyz, k: number): Xyz => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Xyz, b: Xyz): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Xyz): number => Math.hypot(a[0], a[1], a[2]);

function copyNet(net: ReadonlyArray<ReadonlyArray<Xyz>>): Net {
    if (net.length < 2 || net[0].length < 2) throw new RangeError("A join needs a net of at least 2 x 2 control points.");
    const columns = net[0].length;
    return net.map(row => {
        if (row.length !== columns) throw new RangeError("Control net rows must all have the same length.");
        return row.map(([x, y, z]): Xyz => {
            if (![x, y, z].every(Number.isFinite)) throw new RangeError("Control point coordinates must be finite.");
            return [x, y, z];
        });
    });
}

/** `net` elevated in `v` (every row) to degree `target`; a copy when already there. */
function elevateColumns(net: Net, target: number): Net {
    let rows = net.map(row => row.map((p): number[] => [...p]));
    while (rows[0].length - 1 < target) rows = rows.map(row => elevate(row));
    return rows.map(row => row.map(([x, y, z]): Xyz => [x, y, z]));
}

export interface MatchedNets {
    a: Net;
    b: Net;
    /** The common degree in `v`. */
    n: number;
}

/**
 * Elevates the net with the lower `v` degree until both have `max(n_A, n_B)`; the surfaces do not
 * change, only the displayed nets. Returns new nets, inputs untouched.
 */
export function matchBoundaryDegree(a: ReadonlyArray<ReadonlyArray<Xyz>>, b: ReadonlyArray<ReadonlyArray<Xyz>>): MatchedNets {
    const netA = copyNet(a), netB = copyNet(b);
    const n = Math.max(netA[0].length, netB[0].length) - 1;
    return {a: elevateColumns(netA, n), b: elevateColumns(netB, n), n};
}

/**
 * The derived `B` net (new array) for `mode`, after degree matching (callers needing the matched `A`
 * use `matchBoundaryDegree`). `"none"` leaves `B` unconstrained: it is returned unchanged except that
 * it is elevated in `v` when `A`'s degree is higher, so the pair stays comparable.
 * `alpha > 0` is used by `"g1"` only; `alpha = 1` equals `"c1"`.
 */
export function enforceJoin(a: ReadonlyArray<ReadonlyArray<Xyz>>, b: ReadonlyArray<ReadonlyArray<Xyz>>, mode: JoinContinuity, alpha = 1): Net {
    if (mode === "g1" && !(Number.isFinite(alpha) && alpha > 0)) throw new RangeError("The G1 ratio alpha must be a positive finite number.");
    const {a: netA, b: netB} = matchBoundaryDegree(a, b);
    if (mode === "none") return netB;
    const mA = netA.length - 1, mB = netB.length - 1;
    for (let j = 0; j < netB[0].length; j++) netB[0][j] = [...netA[mA][j]];
    if (mode === "c1" || mode === "g1") {
        const factor = (mode === "g1" ? alpha : 1) * mA / mB;
        for (let j = 0; j < netB[0].length; j++) netB[1][j] = add(netB[0][j], scale(sub(netA[mA][j], netA[mA - 1][j]), factor));
    }
    return netB;
}

export interface JoinReport {
    /** Common `v` degree after matching. */
    matchedDegree: number;
    /** Absolute threshold used: `tolerance * D`, `D` the bounding-box diagonal of both matched nets. */
    threshold: number;
    c0: boolean;
    c1: boolean;
    /** G1 with a constant ratio `alpha* > 0` (never true when `alphaStar` is undefined). */
    g1: boolean;
    /** `max_j |P_{m_A,j} - Q_{0,j}|`. */
    c0Residual: number;
    /** `max_j |d^B_j - d^A_j|`. */
    c1Residual: number;
    /** Best constant ratio; undefined when `A`'s boundary derivative vanishes (degenerate). */
    alphaStar: number | undefined;
    /**
     * `max_j |d^B_j - alpha* d^A_j|`; undefined together with `alphaStar`. `g1` compares it with `tolerance` times the
     * largest of `|d^B_j|` and `alpha* |d^A_j|`, so the test is relative to the derivative size (an angular test), not to `D`.
     */
    g1Residual: number | undefined;
    /** Both boundary derivatives vanish (`max_j |d^A_j|` and `max_j |d^B_j|` within the threshold): `c1` may hold, but no tangent plane exists along the boundary. */
    derivativesVanish: boolean;
    /** `max_k |S_A(1, v_k) - S_B(0, v_k)|` at `v_k = k/K`. */
    positionGap: number;
    /** `max_k |S_{B,u}(0, v_k) - S_{A,u}(1, v_k)|`. */
    derivativeGap: number;
    /** Largest angle (radians) between the unit normals where both are defined; undefined without such samples. */
    maxNormalAngle: number | undefined;
    /** Samples where either normal is undefined. */
    undefinedNormalSamples: number;
}

export interface ClassifyOptions {
    /** Relative tolerance, default 1e-9 (times the net-bounding-box diagonal). */
    tolerance?: number;
    /** Sample intervals `K` along `v`, default 16. */
    samples?: number;
}

/** Classifies the displayed pair itself (never the mode that produced it). */
export function classifyJoin(a: ReadonlyArray<ReadonlyArray<Xyz>>, b: ReadonlyArray<ReadonlyArray<Xyz>>, options: ClassifyOptions = {}): JoinReport {
    const tolerance = options.tolerance ?? DEFAULT_DEGENERACY_TOLERANCE;
    const samples = options.samples ?? DEFAULT_SAMPLES;
    if (!(tolerance >= 0) || !Number.isInteger(samples) || samples < 1) throw new RangeError("Join tolerance must be non-negative and samples a positive integer.");
    const {a: netA, b: netB, n} = matchBoundaryDegree(a, b);
    const mA = netA.length - 1, mB = netB.length - 1;
    const patchA = patchFromNet(netA), patchB = patchFromNet(netB);
    const D = Math.hypot(...[0, 1, 2].map(c => {
        const values = [...netA, ...netB].flat().map(p => p[c]);
        return Math.max(...values) - Math.min(...values);
    }));
    const threshold = tolerance * D;

    const dA = Array.from({length: n + 1}, (_, j) => scale(sub(netA[mA][j], netA[mA - 1][j]), mA));
    const dB = Array.from({length: n + 1}, (_, j) => scale(sub(netB[1][j], netB[0][j]), mB));
    const c0Residual = Math.max(...dA.map((_, j) => norm(sub(netA[mA][j], netB[0][j]))));
    const c1Residual = Math.max(...dA.map((d, j) => norm(sub(dB[j], d))));
    const energy = dA.reduce((sum, d) => sum + dot(d, d), 0);
    let alphaStar: number | undefined;
    let g1Residual: number | undefined;
    let g1Threshold = 0;
    if (energy > threshold * threshold) {
        const ratio = dA.reduce((sum, d, j) => sum + dot(dB[j], d), 0) / energy;
        alphaStar = ratio;
        g1Residual = Math.max(...dA.map((d, j) => norm(sub(dB[j], scale(d, ratio)))));
        g1Threshold = tolerance * Math.max(...dA.map((d, j) => Math.max(norm(dB[j]), Math.abs(ratio) * norm(d))));
    }
    const derivativesVanish = Math.max(...dA.map(norm)) <= threshold && Math.max(...dB.map(norm)) <= threshold;
    const c0 = c0Residual <= threshold;

    let positionGap = 0, derivativeGap = 0, undefinedNormalSamples = 0;
    let maxNormalAngle: number | undefined;
    for (let k = 0; k <= samples; k++) {
        const v = k / samples;
        const da = tensorDifferentials(patchA, 1, v, {tolerance});
        const db = tensorDifferentials(patchB, 0, v, {tolerance});
        positionGap = Math.max(positionGap, norm(sub(da.point, db.point)));
        derivativeGap = Math.max(derivativeGap, norm(sub(db.su, da.su)));
        if (da.normal.kind === "defined" && db.normal.kind === "defined") {
            const angle = Math.acos(Math.min(1, Math.max(-1, dot(da.normal.unit, db.normal.unit))));
            maxNormalAngle = Math.max(maxNormalAngle ?? 0, angle);
        } else undefinedNormalSamples++;
    }
    return {
        matchedDegree: n, threshold, c0,
        c1: c0 && c1Residual <= threshold,
        g1: c0 && alphaStar !== undefined && alphaStar > 0 && g1Residual !== undefined && g1Residual <= g1Threshold,
        c0Residual, c1Residual, alphaStar, g1Residual, derivativesVanish, positionGap, derivativeGap, maxNormalAngle, undefinedNormalSamples,
    };
}
