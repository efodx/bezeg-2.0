import {classifyEigen, EigenClassification, exactlyParallel, gridInteger, isApproximatelyParallel, parallelSine} from '../../linear/eigen2';
import {apply, type Mat2, type Vec2} from '../../linear/matrix2';
import {singular} from '../../linear/singular2';
import type {LabelPlacement} from '../functions/BaseFunctionGraph';

/**
 * The derived numbers of the eigen mode (lesson L3): everything is recomputed from the stored matrix and test angle, nothing is
 * stored. Pure TypeScript, free of React and JSXGraph. The class is decided exactly by the kernel; the test vector is
 * continuous, so "approximately parallel" is the kernel's stated tolerance and "exactly parallel" is claimed only when the unit
 * vector itself is on the quarter grid (the four axis directions) and the kernel's exact test holds.
 */

/** The test angle is stored in degrees on this grid, so a dragged vector reads and round-trips as a short number (the slider step is whole degrees). */
export const EIGEN_ANGLE_GRID = 0.01;

/** The angle in [0, 360) degrees, rounded to `EIGEN_ANGLE_GRID`; never 360 and never -0. */
export function normalizeTestAngle(degrees: number): number {
    const rounded = Math.round(degrees / EIGEN_ANGLE_GRID) * EIGEN_ANGLE_GRID;
    const wrapped = ((rounded % 360) + 360) % 360;
    const clean = Math.round(wrapped / EIGEN_ANGLE_GRID) * EIGEN_ANGLE_GRID;
    // Multiples of 0.01 are not exact doubles; the quotient rounds back to the intended short decimal.
    const text = Number(clean.toFixed(2));
    return text >= 360 ? 0 : text + 0;
}

/** The unit vector (cos, sin) of an angle in degrees; the multiples of 90 are exact (no 6e-17 in place of 0). */
export function unitVector(degrees: number): Vec2 {
    if (degrees % 90 === 0) {
        const quarter = (((degrees / 90) % 4) + 4) % 4;
        return ([[1, 0], [0, 1], [-1, 0], [0, -1]] as const)[quarter];
    }
    const radians = degrees * Math.PI / 180;
    return [Math.cos(radians), Math.sin(radians)];
}

const onGrid = (v: Vec2): boolean => {
    try {
        gridInteger(v[0]);
        gridInteger(v[1]);
        return true;
    } catch {
        return false;
    }
};

export interface EigenView {
    readonly classification: EigenClassification;
    readonly tau: number;
    readonly delta: number;
    readonly discriminant: number;
    readonly v: Vec2;
    readonly av: Vec2;
    /** Signed sine of the angle from v to Av (0 when Av = 0). Computed. */
    readonly sine: number;
    /** Unsigned angle between v and Av in degrees [0, 180]; undefined when Av = 0 (the zero vector has no direction). Computed. */
    readonly angleBetween: number | undefined;
    readonly approximatelyParallel: boolean;
    /** Only at a multiple of 45 degrees, with det(g, Ag) = 0 in exact arithmetic for the quarter-grid vector g of that direction. */
    readonly exactlyParallel: boolean;
    /** The real eigen-directions as unit vectors: two, one or none (none also for the scalar case, where every direction is one). */
    readonly lines: readonly Vec2[];
    /** The directions v can snap to (each line in both orientations); empty for the complex and scalar cases. */
    readonly snapAngles: readonly number[];
}

/** The angle of a computed direction in [0, 360), NOT rounded to the grid: a snap rounds it to the grid when it is chosen (`eigenSnapAngle`). */
const wrapDegrees = (degrees: number): number => {
    const wrapped = ((degrees % 360) + 360) % 360;
    return wrapped >= 360 ? 0 : wrapped + 0;
};
const degreesOf = (v: Vec2): number => wrapDegrees(Math.atan2(v[1], v[0]) * 180 / Math.PI);

/** The quarter-grid vector of the direction when the angle is a multiple of 45 degrees: (+-1, 0), (0, +-1) or (+-1, +-1); else undefined. */
export function quarterGridDirection(degrees: number): Vec2 | undefined {
    if (degrees % 45 !== 0) return undefined;
    const octant = (((degrees / 45) % 8) + 8) % 8;
    return ([[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const)[octant];
}

/** "Exactly parallel" is claimed only at a multiple of 45 degrees, where the kernel's exact integer test applies to the grid vector. */
const exactlyParallelAt = (matrix: Mat2, degrees: number): boolean => {
    const grid = quarterGridDirection(degrees);
    return grid !== undefined && onGrid(grid) && exactlyParallel(grid, matrix);
};

export function deriveEigen(matrix: Mat2, testAngle: number): EigenView {
    const classification = classifyEigen(matrix);
    const tau = matrix[0][0] + matrix[1][1];
    const delta = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    const v = unitVector(testAngle);
    // On a multiple of 45 degrees v is a quarter-grid vector up to scale: when A maps that vector to 0 exactly, v is in the kernel and Av = 0
    // exactly (the floating-point v = (cos, sin) would leave 1e-16 here).
    const grid = quarterGridDirection(testAngle);
    const kernel = grid !== undefined && onGrid(grid) && apply(matrix, grid)[0] === 0 && apply(matrix, grid)[1] === 0;
    const av: Vec2 = kernel ? [0, 0] : apply(matrix, v);
    const radians = testAngle * Math.PI / 180;
    const length = Math.hypot(av[0], av[1]);
    const angleBetween = length === 0 ? undefined : Math.atan2(Math.abs(v[0] * av[1] - v[1] * av[0]), v[0] * av[0] + v[1] * av[1]) * 180 / Math.PI;
    const lines = classification.kind === 'distinct-real' ? classification.eigenvectors
        : classification.kind === 'repeated' && classification.repeated === 'defective' ? [classification.eigenvector] : [];
    const snapAngles = lines.flatMap(line => {
        const angle = degreesOf(line);
        return [angle, wrapDegrees(angle + 180)];
    });
    return {
        classification, tau, delta, discriminant: classification.discriminant, v, av,
        sine: kernel ? 0 : parallelSine(matrix, radians),
        angleBetween,
        approximatelyParallel: kernel || isApproximatelyParallel(matrix, radians),
        exactlyParallel: exactlyParallelAt(matrix, testAngle),
        lines, snapAngles,
    };
}

const circularDistance = (a: number, b: number): number => {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
};

/** The angle of the nearest real eigen-direction (either orientation); a tie takes the smaller angle. Undefined when there is none to snap to. */
export function eigenSnapAngle(matrix: Mat2, testAngle: number): number | undefined {
    const {snapAngles} = deriveEigen(matrix, testAngle);
    let best: number | undefined;
    for (const angle of [...snapAngles].sort((a, b) => a - b)) {
        if (best === undefined || circularDistance(angle, testAngle) < circularDistance(best, testAngle)) best = angle;
    }
    return best === undefined ? undefined : normalizeTestAngle(best);
}

/** The angle of a board point as a stored test angle (a drag projects the pointer onto the circle). Undefined at the origin. */
export function angleOfPoint(x: number, y: number): number | undefined {
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return undefined;
    return normalizeTestAngle(Math.atan2(y, x) * 180 / Math.PI);
}

/**
 * The half-extent of the eigen mode's view: the unit circle, the columns a1 and a2 and every image Av of the circle (at most the largest
 * singular value) fit with a 20 % margin, and the circle is never smaller than about a quarter of the short side (at least 2).
 */
export function eigenHalfExtent(matrix: Mat2): number {
    const reach = Math.max(1, singular(matrix).sigma[0], Math.hypot(matrix[0][0], matrix[1][0]), Math.hypot(matrix[0][1], matrix[1][1]));
    return Math.max(2, 1.2 * reach);
}

/** [left, top, right, bottom] centred at the origin: the half-extent on the shorter side, the longer side by the board's aspect. */
export function eigenViewBox(matrix: Mat2, width: number, height: number): [number, number, number, number] {
    const half = eigenHalfExtent(matrix);
    const aspect = width > 0 && height > 0 ? width / height : 4 / 3;
    const [halfX, halfY] = aspect >= 1 ? [half * aspect, half] : [half, half / aspect];
    return [-halfX, halfY, halfX, -halfY];
}

/** Label placement away from the origin along a direction (the label of a tip sits beyond it), on the eight compass cells. */
export function outwardPlacement(direction: Vec2): LabelPlacement {
    const [x, y] = direction;
    const length = Math.hypot(x, y);
    if (length === 0) return 'above-right';
    const horizontal = Math.abs(x / length) > 0.38 ? (x > 0 ? 'right' : 'left') : '';
    const vertical = Math.abs(y / length) > 0.38 ? (y > 0 ? 'above' : 'below') : '';
    if (vertical && horizontal) return `${vertical}-${horizontal}` as LabelPlacement;
    return (vertical || horizontal || 'above') as LabelPlacement;
}

const NEAR = 0.6;
const near = (a: Vec2, b: Vec2): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) < NEAR;

/**
 * The labels of v and Av sit beyond their tips; the a1 label is below-right and the a2 label above-left (and when Av coincides with a
 * column its label stepped aside), so Av's label takes a cell neither of them uses while it is close to one of them, and v's label
 * does the same near a column (the circle meets a1 or a2 when a column is a unit vector).
 */
export function eigenLabelPlacements(v: Vec2, av: Vec2, a1: Vec2, a2: Vec2): {v: LabelPlacement; av: LabelPlacement} {
    const avUsual = outwardPlacement(av);
    const vUsual = outwardPlacement(v);
    const avPlacement: LabelPlacement = near(av, a1) ? 'above-right' : near(av, a2) ? 'below-right' : avUsual;
    let vPlacement: LabelPlacement = vUsual;
    if (near(v, a1) && (vUsual === 'below-right' || vUsual === 'right' || vUsual === 'below')) vPlacement = 'above-left';
    else if (near(v, a2) && (vUsual === 'above-left' || vUsual === 'above' || vUsual === 'left')) vPlacement = 'below-right';
    return {v: vPlacement, av: avPlacement};
}
