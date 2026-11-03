/**
 * The circumcircle and triangle-selection drawing shared by `DelaunayGraph` (task 13) and `VoronoiGraph` (task 19).
 * Board code with no graph state: the caller passes the board, the triangulation and what is selected, and owns the
 * returned objects (it removes them with the rest of its overlay). Circle centre and radius come from the exact rationals
 * and become doubles here for drawing only.
 */
import {gridToBoard, PointSetModel} from "../../compgeo/pointSetModel";
import type {Triangulation} from "../../compgeo/triangulation";
import {GraphPalette} from "../styles/GraphPalette";
import {circumcircle} from "./delaunayRun";

/** The corner indices of a triangle in ascending order, so that its identity does not depend on the stored rotation. */
export const sortedTriple = (corners: readonly number[]): readonly [number, number, number] => {
    const [a, b, c] = [...corners].sort((x, y) => x - y);
    return [a, b, c];
};

export const sameTriple = (x: readonly number[], y: readonly number[]) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];

/** The circumcircle of the triangle `corners`, or undefined for a degenerate one. `dash` 0 is solid. */
export function drawCircumcircle(
    board: JXG.Board, tri: Triangulation, corners: readonly [number, number, number], model: PointSetModel, name: string, dash = 0,
): JXG.GeometryElement | undefined {
    const circle = circumcircle(tri.points[corners[0]], tri.points[corners[1]], tri.points[corners[2]]);
    if (!circle) return undefined;
    const scale = 2 ** model.gridStepExponent;
    return board.create("circle", [[circle.x * scale, circle.y * scale], circle.r * scale], {
        name, withLabel: false, fixed: true, highlight: false, layer: 3, fillOpacity: 0,
        strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash,
    }) as JXG.GeometryElement;
}

/** Object names of the triangle polygons and the selected circle (the graphs keep their own, which tests and smoke checks use). */
export interface TriangleSelectionNames {
    readonly triangle: string;
    readonly selectedTriangle: string;
    readonly selectedCircle: string;
}

/**
 * One polygon per triangle (clickable inside); the selected one is filled and outlined, with its dashed circumcircle.
 * `onPress(index)` is called from the polygon's `down` event; the caller defers it past the board's dispatch.
 */
export function drawSelectableTriangles(
    board: JXG.Board, tri: Triangulation, model: PointSetModel, selected: number | undefined, names: TriangleSelectionNames,
    onPress: (index: number) => void,
): JXG.GeometryElement[] {
    const objects: JXG.GeometryElement[] = [];
    tri.triangles.forEach((corners, index) => {
        const isSelected = index === selected;
        const polygon = board.create("polygon", corners.map(i => {
            const p = gridToBoard(tri.points[i], model.gridStepExponent);
            return [p.x, p.y];
        }), {
            name: isSelected ? names.selectedTriangle : names.triangle, vertices: {visible: false}, highlight: false, fixed: true,
            hasInnerPoints: true, layer: isSelected ? 2 : 0, fillColor: GraphPalette.constructionAccent, fillOpacity: isSelected ? 0.2 : 0,
            borders: {visible: false, highlight: false, fixed: true},
        }) as JXG.GeometryElement;
        // A press on a site (or another visible point) on top of the triangle drags that point and selects no triangle.
        polygon.on("down", (event?: unknown) => {
            if (event !== undefined && board.getAllObjectsUnderMouse(event).some(object => (object as {elType?: string}).elType === "point")) return;
            onPress(index);
        });
        objects.push(polygon);
    });
    const chosen = selected === undefined ? undefined : tri.triangles[selected];
    const circle = chosen && drawCircumcircle(board, tri, chosen, model, names.selectedCircle, 2);
    if (circle) objects.push(circle);
    return objects;
}
