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
    | {readonly kind: "signed-sum"; readonly doubledSum: bigint}
    | {
        readonly kind: "simple";
        readonly doubledSigned: bigint;
        readonly doubledArea: bigint;
        readonly orientation: PolygonOrientation;
        readonly boundary: number;
        /** Undefined when the interior count was refused (bounding box too large). */
        readonly interior: number | undefined;
        readonly pick?: {readonly doubledValue: number; readonly holds: boolean};
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

/** The readout of a model; only a closed polygon-mode model has an area. */
export function areaReadout(model: PointSetModel): AreaReadout {
    return areaReadoutFromMeasures(polygonMeasures(model.points, model.mode === "polygon" && model.closed));
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

/** Boundary and interior lattice points of a closed simple polygon (in grid units); `none` for anything else. */
export function latticeMarkers(model: PointSetModel): LatticeMarkers {
    const readout = areaReadout(model);
    if (readout.kind !== "simple") return {kind: "none"};
    const vertices = model.points;
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
