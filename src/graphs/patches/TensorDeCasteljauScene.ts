import {TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import type {DecasteljauOrder} from "./patchDto";
import type {SceneMarker, ScenePolyline, Xyz} from "./surface-view/surfaceScene";

/**
 * The de Casteljau construction of a tensor patch at (u, v) as scene objects. Stage 1 (role `construction`) is the
 * first direction, or the bilinear reductions; stage 2 (role `construction-2`) is the results of stage 1 reduced
 * further, down to but not including the surface point, which is the scene's `evaluated` marker.
 *
 * - `rows`: each u-row is reduced along v (levels 1 to n-1 are stage 1); the row results, level 0 of stage 2, are then
 *   reduced along u.
 * - `columns`: the same with the directions swapped.
 * - `bilinear`: every 2x2 cell is reduced at once, min(m, n) times (the nets after reductions 1 to min-1 are stage 1);
 *   the remaining one-dimensional net (reduction min) is reduced by the univariate scheme (stage 2).
 */
export interface DeCasteljauConstruction {
    readonly polylines: ScenePolyline[];
    readonly markers: SceneMarker[];
}

const toXyz = (point: readonly number[]): Xyz => [point[0], point[1], point[2] ?? 0];

/** A polyline needs two points; a single point is only a marker. */
function addLine(polylines: ScenePolyline[], id: string, role: ScenePolyline["role"], points: readonly (readonly number[])[]): void {
    if (points.length >= 2) polylines.push({id, role, points: points.map(toXyz)});
}

function addMarkers(markers: SceneMarker[], idPrefix: string, role: SceneMarker["role"], points: readonly (readonly number[])[]): void {
    points.forEach((point, index) => markers.push({id: `${idPrefix}-${index}`, xyz: toXyz(point), role}));
}

/** The levels of a scheme as lists of current points: level r holds the first `length - r` entries. */
const currentPoints = (level: readonly (readonly number[])[], r: number): readonly (readonly number[])[] => level.slice(0, level.length - r);

export function buildDeCasteljauConstruction(patch: TensorProductBezierPatch, u: number, v: number, order: DecasteljauOrder): DeCasteljauConstruction {
    const polylines: ScenePolyline[] = [];
    const markers: SceneMarker[] = [];
    const univariate = (idPrefix: string, scheme: number[][][]): void => {
        // The last level is the surface point itself.
        for (let level = 0; level < scheme.length - 1; level++) {
            const points = currentPoints(scheme[level], level);
            addLine(polylines, `${idPrefix}-${level}`, "construction-2", points);
            addMarkers(markers, `${idPrefix}-${level}`, "construction-2", points);
        }
    };
    if (order === "rows" || order === "columns") {
        let first: number[][][][], second: number[][][];
        if (order === "rows") {
            ({rowsAlongV: first, rowResultsAlongU: second} = patch.decasteljauScheme(u, v));
        } else {
            ({columnsAlongU: first, columnResultsAlongV: second} = patch.columnsFirstScheme(u, v));
        }
        const family = order === "rows" ? "row" : "col";
        // Level 0 of each line is the net itself and the last level is the line's result (stage 2, level 0).
        first.forEach((scheme, index) => {
            for (let level = 1; level < scheme.length - 1; level++) {
                const points = currentPoints(scheme[level], level);
                addLine(polylines, `dc1-${family}${index}-${level}`, "construction", points);
                addMarkers(markers, `dc1-${family}${index}-${level}`, "construction", points);
            }
        });
        univariate("dc2", second);
    } else {
        const {reducedNets, remainderScheme} = TensorProductBezierPatch.bilinearDeCasteljauScheme(patch.getControlNet(), u, v);
        // reducedNets[0] is the net; the last reduction is the univariate remainder (stage 2).
        for (let level = 1; level < reducedNets.length - 1; level++) {
            const net = reducedNets[level];
            net.forEach((row, i) => {
                addLine(polylines, `dc1-${level}-row-${i}`, "construction", row);
                addMarkers(markers, `dc1-${level}-${i}`, "construction", row);
            });
            for (let j = 0; j < net[0].length; j++) addLine(polylines, `dc1-${level}-col-${j}`, "construction", net.map(row => row[j]));
        }
        univariate("dc2", remainderScheme);
    }
    return {polylines, markers};
}
