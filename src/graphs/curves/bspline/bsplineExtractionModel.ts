import {t, Language} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {bezierPieces, domain} from "../../../bezeg/impl/curve/bspline";
import type {BezierExtraction, BezierPiece} from "../../../bezeg/impl/curve/bspline";
import {basisCurveColor} from "../../styles/GraphPalette";
import type {ControlPoint} from "./bsplineDeBoorModel";

/** Pure model of the Bezier extraction graph (lesson L4): no React, JSXGraph or graph state. Knots are raw parameter values (ADR 0024). */

/** Samples per piece when a piece is drawn as a Bezier curve. */
export const PIECE_SAMPLES = 40;

/** The kernel's extraction of the curve, or undefined when the vector or points are invalid (never throws). */
export function extract(knots: readonly number[], degree: number, points: readonly ControlPoint[]): BezierExtraction | undefined {
    try {
        return bezierPieces(knots, degree, points.map(p => [p[0], p[1]]));
    } catch {
        return undefined;
    }
}

/** The Bezier pieces (empty for an invalid curve). */
export const piecesOf = (knots: readonly number[], degree: number, points: readonly ControlPoint[]): BezierPiece[] =>
    extract(knots, degree, points)?.pieces ?? [];

/** Distinct knots strictly inside the domain; the piece count of a curve is this plus one (a break adds no extra piece). */
export function distinctInteriorKnots(knots: readonly number[], degree: number): number {
    const [start, end] = domain(knots, degree, knots.length - degree - 2);
    return new Set(knots.filter(knot => knot > start && knot < end)).size;
}

/** The expected piece count: distinct interior knots + 1. */
export const expectedPieceCount = (knots: readonly number[], degree: number): number => distinctInteriorKnots(knots, degree) + 1;

/** de Casteljau evaluation of a Bezier piece at s in [0, 1]. */
export function casteljau(points: readonly (readonly number[])[], s: number): number[] {
    let level = points.map(p => [...p]);
    while (level.length > 1) {
        level = level.slice(1).map((p, i) => p.map((v, d) => (1 - s) * level[i][d] + s * v));
    }
    return level[0];
}

/** The B-spline parameter of the piece's local parameter s in [0, 1]. */
export const pieceParameter = (piece: BezierPiece, s: number): number => piece.start + s * (piece.end - piece.start);

/** The piece as a drawn polyline (PIECE_SAMPLES + 1 points). */
export function pieceCurveLines(piece: BezierPiece): [number[], number[]] {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= PIECE_SAMPLES; i++) {
        const p = casteljau(piece.points, i / PIECE_SAMPLES);
        xs.push(p[0]);
        ys.push(p[1]);
    }
    return [xs, ys];
}

/** The Bezier control polygon of a piece as a drawn polyline. */
export function piecePolygonLines(piece: BezierPiece): [number[], number[]] {
    return [piece.points.map(p => p[0]), piece.points.map(p => p[1])];
}

/** One distinguishable colour per piece, cycling through the palette's basis colours. */
export const pieceColor = (index: number): string => basisCurveColor(index);

/** Indices of the control points that differ between two polygons of equal length. */
export function movedIndices(before: readonly ControlPoint[], after: readonly ControlPoint[]): number[] {
    const moved: number[] = [];
    after.forEach((p, i) => { if (!before[i] || before[i][0] !== p[0] || before[i][1] !== p[1]) moved.push(i); });
    return moved;
}

/**
 * The pieces whose interval lies in the support of a moved control point: point j influences the open interval (u_j, u_{j+k+1}),
 * so a piece [a, b] is affected when it overlaps it with positive length.
 */
export function affectedPieces(knots: readonly number[], degree: number, pieces: readonly BezierPiece[], moved: readonly number[]): number[] {
    const affected: number[] = [];
    pieces.forEach((piece, index) => {
        if (moved.some(j => j >= 0 && j + degree + 1 < knots.length && piece.start < knots[j + degree + 1] && piece.end > knots[j])) affected.push(index);
    });
    return affected;
}

/** One readout row per piece: interval and control points, numbers formatted in `language`. */
export function pieceReadoutLines(pieces: readonly BezierPiece[], affected: readonly number[], language: Language): string[] {
    const num = (v: number) => formatNumber(v, language, 4);
    return pieces.map((piece, index) => {
        const list = piece.points.map(p => `(${num(p[0])}, ${num(p[1])})`).join(', ');
        const row = t("bse_piece_row", {value0: index + 1, value1: num(piece.start), value2: num(piece.end), value3: list});
        return affected.includes(index) ? `${row} ${t("bse_piece_changed")}` : row;
    });
}
