import {gridImage} from '../../linear/gridImage';
import {apply, det, IDENTITY, type Mat2, type Vec2} from '../../linear/matrix2';

/** The source and image grids cover the lines x, y = -GRID_HALF_EXTENT, ..., GRID_HALF_EXTENT in steps of 1: 26 lines. */
export const GRID_HALF_EXTENT = 6;
export const GRID_STEP = 1;

/** The fixture Bezier curve of the lessons (control points P0..P3); its image is the Bezier curve of the image control points. */
export const FIXTURE_CONTROL_POINTS: readonly Vec2[] = [[1, 0], [2, 3], [4, 2], [5, -1]];

/** The probe point whose image is read out. */
export const PROBE_POINT: Vec2 = [1, 1];

export interface Polyline {
    readonly x: number[];
    readonly y: number[];
}

/**
 * The grid image as ONE polyline: each line contributes its two finite endpoints, lines are separated by one NaN
 * (ADR 0032). Only the separators are NaN; every coordinate is finite, also for a singular or zero matrix (collapsed
 * lines become zero-length segments, a collapsed grid lies on one line or at the origin).
 */
export function gridPolyline(m: Mat2): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    for (const line of gridImage(m, GRID_HALF_EXTENT, GRID_STEP)) {
        x.push(line.from[0], line.to[0], Number.NaN);
        y.push(line.from[1], line.to[1], Number.NaN);
    }
    return {x, y};
}

export const sourceGridPolyline = (): Polyline => gridPolyline(IDENTITY);

/** A closed polyline through the points (the first point is repeated at the end). */
export function closedPolyline(points: readonly Vec2[]): Polyline {
    const closed = [...points, points[0]];
    return {x: closed.map(p => p[0]), y: closed.map(p => p[1])};
}

export function openPolyline(points: readonly Vec2[]): Polyline {
    return {x: points.map(p => p[0]), y: points.map(p => p[1])};
}

/** De Casteljau evaluation of a Bezier curve of any degree at t. */
export function bezierPoint(points: readonly Vec2[], t: number): Vec2 {
    let level = points.slice();
    while (level.length > 1) {
        const previous = level;
        level = previous.slice(1).map((next, i) => [(1 - t) * previous[i][0] + t * next[0], (1 - t) * previous[i][1] + t * next[1]] as Vec2);
    }
    return level[0];
}

/** Images of the control points: the control points of the image curve (affine invariance; no curve API transform is used). */
export const imageControlPoints = (m: Mat2, points: readonly Vec2[] = FIXTURE_CONTROL_POINTS): Vec2[] => points.map(p => apply(m, p));

export type Collapse = 'none' | 'line' | 'point';

/** What the plane is mapped onto: `none` for det != 0, a line for a nonzero singular matrix, a point (the origin) for the zero matrix. */
export function collapseOf(m: Mat2): Collapse {
    if (det(m) !== 0) return 'none';
    return m[0][0] === 0 && m[0][1] === 0 && m[1][0] === 0 && m[1][1] === 0 ? 'point' : 'line';
}

/** Shoelace signed area of a polygon given in order. */
export function shoelace(points: readonly Vec2[]): number {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        sum += x1 * y2 - x2 * y1;
    }
    return sum / 2;
}
