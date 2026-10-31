/**
 * Polygon area, boundary and interior lattice counts on integer grid points (convexity task 07, spec A2).
 * Pure TypeScript. Discrete outcomes use exact integer predicates only, never tolerances.
 *
 * Exactness bound. Coordinates satisfy |c| <= GRID_COORD_LIMIT = 2^25, so one shoelace term x_i*y_j - x_j*y_i has
 * magnitude <= 2^51 and a fan triangle `orientValue` magnitude <= 2^53 (still exact in a double). A sum of up to 40
 * terms can reach 40 * 2^51 > 2^53 (a self-intersecting polygon can approach this), so all area sums are
 * accumulated in `bigint` and returned as `bigint`; nothing is rounded and nothing is refused for size.
 */
import {assertGridPoint, type GridPoint} from './grid';
import {onSegment, orient, orientValue, polygonSimplicity} from './predicates';

/** Largest bounding box (in lattice points) the interior scan accepts: about 250k points x 40 edges stays cheap. */
export const INTERIOR_SCAN_MAX_BOX_POINTS = 250_000;

export type PolygonOrientation = 'ccw' | 'cw' | 'degenerate';

export type InteriorCount =
    | { readonly ok: true; readonly interior: number }
    | { readonly ok: false; readonly reason: 'box-too-large'; readonly boxPoints: number };

export type PolygonMeasures =
    /** Fewer than 3 vertices or an open polygon: no area claim. */
    | { readonly kind: 'no-area'; readonly reason: 'too-few-vertices' | 'open' }
    /** Self-intersecting or degenerate: only the signed sum (winding number times area, doubled). */
    | { readonly kind: 'signed-sum'; readonly doubledSignedSum: bigint; readonly fan: readonly bigint[] }
    | {
    readonly kind: 'simple';
    readonly doubledSignedArea: bigint;
    readonly fan: readonly bigint[];
    readonly orientation: PolygonOrientation;
    readonly boundary: number;
    readonly interior: InteriorCount;
    /** 2I + B - 2 (only when the interior was counted). */
    readonly pickDoubledArea?: number;
    /** Whether 2I + B - 2 equals |doubled area|, by comparison. */
    readonly pickHolds?: boolean;
};

/** Doubled signed area (shoelace sum without 1/2), exact, positive counter-clockwise. */
export function doubledSignedArea(vertices: readonly GridPoint[]): bigint {
    vertices.forEach((v, i) => assertGridPoint(v, `vertices[${i}]`));
    let sum = 0n;
    for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        sum += BigInt(a.x) * BigInt(b.y) - BigInt(b.x) * BigInt(a.y);
    }
    return sum;
}

/** Doubled signed areas of the fan triangles (v0, v_i, v_{i+1}), i = 1..n-2; they sum to the shoelace value. */
export function doubledFanAreas(vertices: readonly GridPoint[]): bigint[] {
    const fan: bigint[] = [];
    for (let i = 1; i + 1 < vertices.length; i++) {
        fan.push(BigInt(orientValue(vertices[0], vertices[i], vertices[i + 1])));
    }
    return fan;
}

function gcd(a: number, b: number): number {
    while (b !== 0) [a, b] = [b, a % b];
    return a;
}

/** Boundary lattice points B = sum of gcd(|dx|, |dy|) over the closed edges. */
export function boundaryLatticeCount(vertices: readonly GridPoint[]): number {
    let b = 0;
    for (let i = 0; i < vertices.length; i++) {
        const p = vertices[i];
        const q = vertices[(i + 1) % vertices.length];
        b += gcd(Math.abs(q.x - p.x), Math.abs(q.y - p.y));
    }
    return b;
}

/**
 * True when p lies strictly inside the closed polygon (even-odd crossing rule, half-open in y so a vertex on the
 * ray is counted once; points on an edge are excluded through `onSegment`). Intended for simple polygons; A3 may
 * replace or reuse it.
 */
export function strictlyInsidePolygon(p: GridPoint, vertices: readonly GridPoint[]): boolean {
    const n = vertices.length;
    for (let i = 0; i < n; i++) if (onSegment(p, vertices[i], vertices[(i + 1) % n])) return false;
    let inside = false;
    for (let i = 0; i < n; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % n];
        if ((a.y <= p.y) === (b.y <= p.y)) continue; // half-open: the edge spans p.y in [min, max)
        const side = orient(a, b, p); // p left of an upward edge, or right of a downward edge: the +x ray crosses
        if (b.y > a.y ? side > 0 : side < 0) inside = !inside;
    }
    return inside;
}

/** Interior lattice points by scanning the bounding box; refuses (typed) above `maxBoxPoints`. */
export function interiorLatticeCount(
    vertices: readonly GridPoint[],
    maxBoxPoints: number = INTERIOR_SCAN_MAX_BOX_POINTS,
): InteriorCount {
    const xs = vertices.map((v) => v.x);
    const ys = vertices.map((v) => v.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const boxPoints = (maxX - minX + 1) * (maxY - minY + 1); // <= (2^26+1)^2 < 2^53, exact
    if (boxPoints > maxBoxPoints) return {ok: false, reason: 'box-too-large', boxPoints};
    let interior = 0;
    for (let y = minY + 1; y < maxY; y++) {
        for (let x = minX + 1; x < maxX; x++) if (strictlyInsidePolygon({x, y}, vertices)) interior++;
    }
    return {ok: true, interior};
}

export function polygonMeasures(
    vertices: readonly GridPoint[],
    closed = true,
    maxBoxPoints: number = INTERIOR_SCAN_MAX_BOX_POINTS,
): PolygonMeasures {
    vertices.forEach((v, i) => assertGridPoint(v, `vertices[${i}]`));
    if (!closed) return {kind: 'no-area', reason: 'open'};
    if (vertices.length < 3) return {kind: 'no-area', reason: 'too-few-vertices'};
    const area = doubledSignedArea(vertices);
    const fan = doubledFanAreas(vertices);
    if (!polygonSimplicity(vertices, true).simple) return {kind: 'signed-sum', doubledSignedSum: area, fan};
    const orientation: PolygonOrientation = area > 0n ? 'ccw' : area < 0n ? 'cw' : 'degenerate';
    const boundary = boundaryLatticeCount(vertices);
    const interior = interiorLatticeCount(vertices, maxBoxPoints);
    if (!interior.ok) return {kind: 'simple', doubledSignedArea: area, fan, orientation, boundary, interior};
    const pickDoubledArea = 2 * interior.interior + boundary - 2;
    const abs = area < 0n ? -area : area;
    return {
        kind: 'simple', doubledSignedArea: area, fan, orientation, boundary, interior,
        pickDoubledArea, pickHolds: BigInt(pickDoubledArea) === abs,
    };
}
