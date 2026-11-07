import {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {
    boundaryLatticeCount, INTERIOR_SCAN_MAX_BOX_POINTS, PolygonMeasures, polygonMeasures, PolygonOrientation, strictlyInsidePolygon,
} from "../../compgeo/polygonMeasures";

/**
 * Pure adapters of the polygon-area graph (spec convexity-hulls-lessons A2): the readout view model built from
 * `polygonMeasures` (task 07) and the lattice points to mark. No React, JSXGraph or localization.
 */
export type AreaReadout =
    | {readonly kind: "message"; readonly reason: "open" | "too-few-vertices"}
    /** Self-intersecting: only the signed sum of winding number times area (doubled); no Pick. */
    | {readonly kind: "signed-sum"; readonly doubledSum: bigint; readonly areaExponent?: number}
    | {
        readonly kind: "simple";
        readonly doubledSigned: bigint;
        readonly doubledArea: bigint;
        readonly orientation: PolygonOrientation;
        /** The boundary count; 0 and meaningless when `countsOmitted`. */
        readonly boundary: number;
        /** Undefined when the interior count was refused (bounding box too large) or `countsOmitted`. */
        readonly interior: number | undefined;
        readonly pick?: {readonly doubledValue: number; readonly holds: boolean};
        /**
         * The doubled values above are in grid units; board units are times 2^areaExponent (4^e for grid step exponent e).
         * Absent on the unit grid (e = 0).
         */
        readonly areaExponent?: number;
        /** True when the vertices are not all board-integer points: boundary, interior and Pick's theorem do not apply. */
        readonly countsOmitted?: true;
    };

export function areaReadoutFromMeasures(measures: PolygonMeasures): AreaReadout {
    switch (measures.kind) {
        case "no-area": return {kind: "message", reason: measures.reason};
        case "signed-sum": return {kind: "signed-sum", doubledSum: measures.doubledSignedSum};
        case "simple": {
            const abs = measures.doubledSignedArea < 0n ? -measures.doubledSignedArea : measures.doubledSignedArea;
            return {
                kind: "simple", doubledSigned: measures.doubledSignedArea, doubledArea: abs, orientation: measures.orientation,
                boundary: measures.boundary, interior: measures.interior.ok ? measures.interior.interior : undefined,
                ...(measures.pickDoubledArea !== undefined && measures.pickHolds !== undefined
                    ? {pick: {doubledValue: measures.pickDoubledArea, holds: measures.pickHolds}} : {}),
            };
        }
    }
}

/**
 * The vertices in board units when every one is a board-integer point (a multiple of 2^-e for e < 0, any grid point for e = 0),
 * else undefined. For e > 0 the board lattice is finer than the grid, so it is not counted either.
 */
function boardLatticeVertices(model: PointSetModel): GridPoint[] | undefined {
    const exponent = model.gridStepExponent;
    if (exponent === 0) return [...model.points];
    if (exponent > 0) return undefined;
    const step = 2 ** -exponent;
    if (!model.points.every(p => p.x % step === 0 && p.y % step === 0)) return undefined;
    return model.points.map(p => ({x: p.x / step + 0, y: p.y / step + 0}));
}

/**
 * The readout of a model; only a closed polygon-mode model has an area. Signs, simplicity and doubled areas are exact on the
 * grid points; `areaExponent` scales them to board units. Boundary, interior and Pick are counted on board-integer points,
 * so only when every vertex is one.
 */
export function areaReadout(model: PointSetModel): AreaReadout {
    const closed = model.mode === "polygon" && model.closed;
    const base = areaReadoutFromMeasures(polygonMeasures(model.points, closed));
    const exponent = model.gridStepExponent;
    if (exponent === 0 || base.kind === "message") return base;
    const areaExponent = 2 * exponent;
    if (base.kind === "signed-sum") return {...base, areaExponent};
    const {pick: _gridPick, ...simple} = base;
    const lattice = boardLatticeVertices(model);
    if (!lattice) return {...simple, boundary: 0, interior: undefined, areaExponent, countsOmitted: true};
    const counted = areaReadoutFromMeasures(polygonMeasures(lattice, closed));
    if (counted.kind !== "simple") return {...simple, boundary: 0, interior: undefined, areaExponent, countsOmitted: true};
    return {...simple, boundary: counted.boundary, interior: counted.interior, ...(counted.pick ? {pick: counted.pick} : {}), areaExponent};
}

/** At most this many markers are drawn; the counts in the readout stay exact. */
export const MAX_LATTICE_MARKERS = 2000;

export type LatticeMarkers =
    | {readonly kind: "none"}
    | {readonly kind: "too-many"}
    | {readonly kind: "points"; readonly boundary: readonly GridPoint[]; readonly interior: readonly GridPoint[]};

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

/** Whether grid point p lies on segment ab, decided exactly on the grid integers. */
function onSegment(p: GridPoint, a: GridPoint, b: GridPoint): boolean {
    return (b.x - a.x) * (p.y - a.y) === (b.y - a.y) * (p.x - a.x)
        && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

/**
 * Markers for a polygon with a vertex off the board lattice (e < 0): the grid points that are multiples of 2^-e, on or
 * inside the polygon (decided on the grid integers), returned in board units. Pick's theorem does not apply there.
 */
function offLatticeMarkers(model: PointSetModel): LatticeMarkers {
    const vertices = model.points;
    const step = 2 ** -model.gridStepExponent;
    const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
    const first = (low: number) => Math.ceil(low / step) * step;
    const [minX, maxX, minY, maxY] = [first(Math.min(...xs)), Math.max(...xs), first(Math.min(...ys)), Math.max(...ys)];
    if (((maxX - minX) / step + 1) * ((maxY - minY) / step + 1) > INTERIOR_SCAN_MAX_BOX_POINTS) return {kind: "too-many"};
    const boundary: GridPoint[] = [], interior: GridPoint[] = [];
    for (let y = minY; y <= maxY; y += step) {
        for (let x = minX; x <= maxX; x += step) {
            const p = {x, y};
            const onEdge = vertices.some((from, i) => onSegment(p, from, vertices[(i + 1) % vertices.length]));
            if (!onEdge && !strictlyInsidePolygon(p, vertices)) continue;
            (onEdge ? boundary : interior).push({x: x / step + 0, y: y / step + 0});
            if (boundary.length + interior.length > MAX_LATTICE_MARKERS) return {kind: "too-many"};
        }
    }
    return {kind: "points", boundary, interior};
}

/** Boundary and interior board-integer points of a closed simple polygon, in board units (the grid on the unit grid); `none` for
 * anything else. A vertex off the board lattice does not remove the markers (only Pick's theorem). */
export function latticeMarkers(model: PointSetModel): LatticeMarkers {
    const readout = areaReadout(model);
    if (readout.kind !== "simple") return {kind: "none"};
    const vertices = boardLatticeVertices(model);
    if (!vertices) return model.gridStepExponent < 0 ? offLatticeMarkers(model) : {kind: "none"};
    if (boundaryLatticeCount(vertices) > MAX_LATTICE_MARKERS) return {kind: "too-many"};
    const boundary: GridPoint[] = [];
    vertices.forEach((from, i) => {
        const to = vertices[(i + 1) % vertices.length];
        const steps = gcd(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        for (let k = 0; k < steps; k++) boundary.push({x: from.x + k * ((to.x - from.x) / steps), y: from.y + k * ((to.y - from.y) / steps)});
    });
    const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    if ((maxX - minX + 1) * (maxY - minY + 1) > INTERIOR_SCAN_MAX_BOX_POINTS) return {kind: "too-many"};
    const interior: GridPoint[] = [];
    for (let y = minY + 1; y < maxY; y++) {
        for (let x = minX + 1; x < maxX; x++) {
            if (!strictlyInsidePolygon({x, y}, vertices)) continue;
            interior.push({x, y});
            if (boundary.length + interior.length > MAX_LATTICE_MARKERS) return {kind: "too-many"};
        }
    }
    return {kind: "points", boundary, interior};
}
