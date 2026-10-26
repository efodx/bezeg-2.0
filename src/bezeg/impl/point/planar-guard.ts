import {Point} from "../../api/point/point";

/** Throws instead of silently projecting a spatial point into a planar operation. */
export function assertPlanarPoint(point: Point, operation: string): void {
    if ((point.Z?.() ?? 0) !== 0) {
        throw new Error(`${operation} only supports planar points (z must be 0).`);
    }
}

export function assertPlanarPoints(points: ReadonlyArray<Point>, operation: string): void {
    points.forEach(point => assertPlanarPoint(point, operation));
}
