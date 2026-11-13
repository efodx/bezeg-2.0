import {symmetricPart, type Mat2, type Vec2} from '../../linear/matrix2';
import {singular, type SingularData} from '../../linear/singular2';
import {centredViewBox, deriveEigen} from './eigenScene';
import type {Polyline} from './linearMapScene';

/**
 * The derived numbers and drawings of the ellipse mode (lesson L4): everything is recomputed from the stored matrix, nothing is
 * stored. Pure TypeScript, free of React and JSXGraph. The image of the unit circle is drawn from the singular decomposition
 * (sigma1 cos t u1 + sigma2 sin t u2), which is the same set as A (cos t, sin t); the degenerate cases are decided exactly by the
 * kernel (`singular`), so a segment or a point is never drawn as an ellipse with a zero axis. The conic x^T S x = 1 is drawn for the
 * symmetric part S = (A + A^T) / 2 only, and only when S is positive definite (decided exactly on the quarter grid).
 */

/** Points on the closed curves; the polylines are finite everywhere. */
export const ELLIPSE_SAMPLES = 180;

export type ImageKind = 'ellipse' | 'circle' | 'segment' | 'point';
export type ConicKind = 'ellipse' | 'hyperbola' | 'parallel-lines' | 'empty';

/** A fixed end point of an axis or direction with its label name (LaTeX); the cell of the label comes from `labelLayout`. */
export interface LabelledTip {
    readonly tip: Vec2;
    readonly name: string;
}

export interface ConicView {
    /** S = (A + A^T) / 2 (entries are multiples of 1/8, exact). */
    readonly symmetricPart: Mat2;
    /** lambda1 >= lambda2, the eigenvalues of S (computed). */
    readonly eigenvalues: readonly [number, number];
    /** Orthonormal eigenvectors of S (computed): along them the semi-axes of the conic lie. */
    readonly directions: readonly [Vec2, Vec2];
    /** Exact from det S and tr S: positive definite is an ellipse; det < 0 a hyperbola; det = 0 and tr > 0 two parallel lines; else no real points. */
    readonly kind: ConicKind;
    /** 1/sqrt(lambda_i): only for the ellipse. */
    readonly semiAxes: readonly [number, number] | undefined;
    /** The sampled ellipse; only for the ellipse. */
    readonly curve: Polyline | undefined;
}

export interface EllipseView {
    readonly singular: SingularData;
    readonly kind: ImageKind;
    /** b = c, exact. */
    readonly symmetric: boolean;
    readonly determinant: number;
    readonly absDeterminant: number;
    /** sigma1 sigma2 (computed; equals |det A| to 1e-12). */
    readonly product: number;
    /** The image of the unit circle: a closed ellipse or circle; two end points of a segment; empty for the zero matrix. */
    readonly imageCurve: Polyline;
    /** The real eigen-directions as unit vectors (none for complex and scalar). */
    readonly lines: readonly Vec2[];
    /** The image semi-axes sigma_i u_i (an ellipse: both; a segment: the long one; a circle and a point: none, the axes are not unique or absent). */
    readonly axes: readonly LabelledTip[];
    /** The right singular directions v_i in the domain (as `axes`). */
    readonly directions: readonly LabelledTip[];
    /** The semi-axes of the conic (positive definite S only). */
    readonly conicAxes: readonly LabelledTip[];
    /** Direction of the long image axis and of v1 as a line through the origin, in [0, 180) degrees; undefined when there is none. */
    readonly imageAxisAngle: number | undefined;
    readonly domainAxisAngle: number | undefined;
    readonly conic: ConicView;
}

const lineAngle = (v: Vec2): number => {
    const degrees = Math.atan2(v[1], v[0]) * 180 / Math.PI;
    const wrapped = ((degrees % 180) + 180) % 180;
    return (wrapped >= 180 ? 0 : wrapped) + 0;
};

const scaled = (v: Vec2, factor: number): Vec2 => [factor * v[0], factor * v[1]];
/** sigma1 cos t u1 + sigma2 sin t u2 (a missing u2 contributes nothing), t in [0, 2 pi]. */
export function imagePoint(sing: SingularData, t: number): Vec2 {
    const [u1, u2] = sing.left;
    const [c, s] = [Math.cos(t) * sing.sigma[0], Math.sin(t) * sing.sigma[1]];
    return [(u1 ? c * u1[0] : 0) + (u2 ? s * u2[0] : 0), (u1 ? c * u1[1] : 0) + (u2 ? s * u2[1] : 0)];
}

function closedCurve(point: (t: number) => Vec2): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i <= ELLIPSE_SAMPLES; i++) {
        const [px, py] = point(i === ELLIPSE_SAMPLES ? 0 : 2 * Math.PI * i / ELLIPSE_SAMPLES);
        x.push(px);
        y.push(py);
    }
    return {x, y};
}

/** The conic of the symmetric part. Exact on the grid: det S is a multiple of 1/64 and tr S a multiple of 1/4. */
export function deriveConic(matrix: Mat2): ConicView {
    const s = symmetricPart(matrix);
    const [a, off, d] = [s[0][0], s[0][1], s[1][1]];
    const determinant = a * d - off * off;
    const trace = a + d;
    // det S = 0 means one eigenvalue is exactly 0 and the other is tr S; otherwise lambda2 = det S / lambda1 avoids cancellation.
    const lambda1 = determinant === 0 ? Math.max(trace, 0) : trace / 2 + Math.hypot((a - d) / 2, off);
    const lambda2 = determinant === 0 ? Math.min(trace, 0) : determinant / lambda1;
    const theta = Math.atan2(2 * off, a - d) / 2;
    const directions: readonly [Vec2, Vec2] = [[Math.cos(theta), Math.sin(theta)], [-Math.sin(theta), Math.cos(theta)]];
    const kind: ConicKind = determinant > 0 && trace > 0 ? 'ellipse' : determinant < 0 ? 'hyperbola' : determinant === 0 && trace > 0 ? 'parallel-lines' : 'empty';
    const semiAxes: readonly [number, number] | undefined = kind === 'ellipse' ? [1 / Math.sqrt(lambda1), 1 / Math.sqrt(lambda2)] : undefined;
    const curve = semiAxes ? closedCurve(t => [
        Math.cos(t) * semiAxes[0] * directions[0][0] + Math.sin(t) * semiAxes[1] * directions[1][0],
        Math.cos(t) * semiAxes[0] * directions[0][1] + Math.sin(t) * semiAxes[1] * directions[1][1],
    ]) : undefined;
    return {symmetricPart: s, eigenvalues: [lambda1, lambda2], directions, kind, semiAxes, curve};
}

export function deriveEllipse(matrix: Mat2): EllipseView {
    const sing = singular(matrix);
    const [sigma1, sigma2] = sing.sigma;
    const kind: ImageKind = sing.segmentOrPoint ? (sigma1 === 0 ? 'point' : 'segment') : sing.circle ? 'circle' : 'ellipse';
    const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    const u1 = sing.left[0];
    const imageCurve: Polyline = kind === 'point' ? {x: [], y: []}
        : kind === 'segment' && u1 ? {x: [-sigma1 * u1[0], sigma1 * u1[0]], y: [-sigma1 * u1[1], sigma1 * u1[1]]}
        : closedCurve(t => imagePoint(sing, t));
    const drawsAxes = kind === 'ellipse' || kind === 'segment';
    const axisTips: Vec2[] = [];
    if (drawsAxes && u1) axisTips.push(scaled(u1, sigma1));
    const u2 = sing.left[1];
    if (kind === 'ellipse' && u2) axisTips.push(scaled(u2, sigma2));
    const axes = axisTips.map((tip, i) => ({tip, name: `$$\\sigma_${i + 1}$$`}));
    const directions = drawsAxes ? sing.right.map((v, i) => ({
        tip: v, name: `$$v_${i + 1}$$`,
    })) : [];
    const conic = deriveConic(matrix);
    const conicAxes = conic.semiAxes ? conic.directions.map((direction, i) => {
        const tip = scaled(direction, conic.semiAxes![i]);
        return {tip, name: `$$1/\\sqrt{\\lambda_${i + 1}}$$`};
    }) : [];
    return {
        singular: sing, kind, symmetric: matrix[0][1] === matrix[1][0], determinant, absDeterminant: Math.abs(determinant),
        product: sigma1 * sigma2, imageCurve, lines: deriveEigen(matrix, 0).lines, axes, directions, conicAxes, conic,
        imageAxisAngle: drawsAxes && u1 ? lineAngle(u1) : undefined,
        domainAxisAngle: drawsAxes ? lineAngle(sing.right[0]) : undefined,
    };
}

/**
 * The half-extent of the ellipse mode's view: the unit circle, sigma1 (the image fits), the columns a1 and a2 (the handles) fit with a
 * 20 % margin, never below 2; with the conic shown also its semi-axes.
 */
export function ellipseHalfExtent(matrix: Mat2, conicVisible = false): number {
    const sing = singular(matrix);
    let reach = Math.max(1, sing.sigma[0], Math.hypot(matrix[0][0], matrix[1][0]), Math.hypot(matrix[0][1], matrix[1][1]));
    if (conicVisible) {
        const axes = deriveConic(matrix).semiAxes;
        if (axes) reach = Math.max(reach, axes[0], axes[1]);
    }
    return Math.max(2, 1.2 * reach);
}

export const ellipseViewBox = (matrix: Mat2, conicVisible: boolean, width: number, height: number): [number, number, number, number] =>
    centredViewBox(ellipseHalfExtent(matrix, conicVisible), width, height);
