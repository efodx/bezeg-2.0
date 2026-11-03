import {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {classifyPoint, FillRule, rayCrossings, RayCrossing, RayTouch} from "../../compgeo/pointInPolygon";
import {polygonSimplicity} from "../../compgeo/predicates";

/**
 * Pure adapters of the point-in-polygon graph (spec convexity-hulls-lessons A3): the readout view model built from task 16's
 * `classifyPoint`, and the ray overlay's markers built from `rayCrossings`. No React, JSXGraph or localization.
 */
export type PointInPolygonReadout =
    /** No verdict: the model is not a closed polygon with at least three vertices. `missing` is how many vertices are lacking (0 when only open). */
    | {readonly kind: "message"; readonly reason: "open" | "too-few-vertices"; readonly missing: number}
    /** On an edge or at a vertex: neither inside nor outside, and no crossing count or winding number is defined. */
    | {readonly kind: "boundary"}
    | {
        readonly kind: "located";
        /** `rules-differ` when the even-odd and nonzero rules give different answers (a self-intersecting polygon). */
        readonly location: "inside" | "outside" | "rules-differ";
        readonly crossings: number;
        readonly winding: number;
        readonly evenOdd: FillRule;
        readonly nonzero: FillRule;
        /** False for a self-intersecting polygon: the graph then shows the "not simple" label. */
        readonly simple: boolean;
    };

/** The readout of the query point against the model; only a closed polygon-mode model with three or more vertices has one. */
export function pointInPolygonReadout(model: PointSetModel, query: GridPoint): PointInPolygonReadout {
    const vertices = model.points;
    if (model.mode !== "polygon" || !model.closed) return {kind: "message", reason: "open", missing: 0};
    if (vertices.length < 3) return {kind: "message", reason: "too-few-vertices", missing: 3 - vertices.length};
    const found = classifyPoint(query, vertices);
    if (found.location === "boundary") return {kind: "boundary"};
    return {
        kind: "located",
        location: found.evenOdd !== found.nonzero ? "rules-differ" : found.evenOdd,
        crossings: found.crossings, winding: found.winding, evenOdd: found.evenOdd, nonzero: found.nonzero,
        simple: polygonSimplicity(vertices, true).simple,
    };
}

/** A counted crossing of the ray, numbered 1, 2, ... from the query point outwards (nearest first). */
export interface NumberedCrossing extends RayCrossing {
    readonly number: number;
}

export type RayMarkers =
    | {readonly kind: "none"}
    | {readonly kind: "ray"; readonly crossings: readonly NumberedCrossing[]; readonly touches: readonly GridPoint[]};

/**
 * What the ray overlay marks: the counted crossings (numbered along the ray, nearest first) and the vertices on the ray
 * that do not count, each position once. `none` unless the query point is off the boundary of a closed polygon.
 */
export function rayMarkers(model: PointSetModel, query: GridPoint): RayMarkers {
    if (pointInPolygonReadout(model, query).kind !== "located") return {kind: "none"};
    const {crossings, touching} = rayCrossings(query, model.points);
    const ordered = [...crossings].sort((a, b) => a.x.compare(b.x) || a.edge - b.edge);
    return {
        kind: "ray",
        crossings: ordered.map((crossing, i) => ({...crossing, number: i + 1})),
        touches: distinctTouchPoints(touching),
    };
}

function distinctTouchPoints(touching: readonly RayTouch[]): GridPoint[] {
    const seen = new Set<string>();
    const points: GridPoint[] = [];
    for (const touch of touching) {
        for (const point of touch.points) {
            const key = `${point.x},${point.y}`;
            if (seen.has(key)) continue;
            seen.add(key);
            points.push({x: point.x, y: point.y});
        }
    }
    return points.sort((a, b) => a.x - b.x);
}
