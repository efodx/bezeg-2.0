import type {PatchDirection, TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import {CURVE_SAMPLES} from "./patchSceneBuilder";
import {locateInPieces, type PieceLocation, subdivisionPieces} from "./tensorSubdivision";
import type {SceneLabel, SurfaceScene, ScenePolyline, Xyz} from "./surface-view/surfaceScene";

/** The scene objects of one subdivision: both piece nets, the split curve and the piece labels. */
export interface SubdivisionScene {
    readonly polylines: ScenePolyline[];
    readonly labels: SceneLabel[];
    readonly pieces: readonly [TensorProductBezierPatch, TensorProductBezierPatch];
}

/** Where `S(u, v)` lies on the pieces: the piece, its local parameters and the point evaluated on that piece. */
export interface PieceCorrespondence {
    readonly location: PieceLocation;
    readonly point: Xyz;
}

const xyz = (point: {X(): number; Y(): number; Z?(): number}): Xyz => [point.X(), point.Y(), point.Z?.() ?? 0];

/** The net as row (`<prefix>-row-i`) and column (`<prefix>-col-j`) polylines of one role, like the tensor scene's net. */
function netLines(patch: TensorProductBezierPatch, prefix: string, role: ScenePolyline["role"]): ScenePolyline[] {
    const net = patch.getControlNet().map(row => row.map(xyz));
    return [
        ...net.map((row, i): ScenePolyline => ({id: `${prefix}-row-${i}`, role, points: row})),
        ...net[0].map((_, j): ScenePolyline => ({id: `${prefix}-col-${j}`, role, points: net.map(row => [...row[j]] as Xyz)})),
    ];
}

/**
 * The two pieces of `patch` split at `value` in `direction`: piece nets `piece-l-…` (role `net`) and `piece-r-…`
 * (role `net-2`), the split curve `S(value, ·)` or `S(·, value)` (`split-curve`, role `highlight`) and a label at the
 * middle of each piece. The pieces have the same image as the patch, so no surface geometry is produced here.
 */
export function buildSubdivisionScene(patch: TensorProductBezierPatch, direction: PatchDirection, value: number): SubdivisionScene {
    const [left, right] = subdivisionPieces(patch, direction, value);
    const split: Xyz[] = Array.from({length: CURVE_SAMPLES + 1}, (_, k) => {
        const t = k / CURVE_SAMPLES;
        return xyz(direction === "u" ? patch.eval(value, t) : patch.eval(t, value));
    });
    return {
        polylines: [...netLines(left, "piece-l", "net"), ...netLines(right, "piece-r", "net-2"), {id: "split-curve", role: "highlight", points: split}],
        labels: [
            {id: "piece-l-label", text: "S_L", anchor: xyz(left.eval(0.5, 0.5))},
            {id: "piece-r-label", text: "S_R", anchor: xyz(right.eval(0.5, 0.5))},
        ],
        pieces: [left, right],
    };
}

/** The piece that displays `(u, v)` (`locateInPieces`) and the point it evaluates there; this equals `patch.eval(u, v)`. */
export function pieceCorrespondence(patch: TensorProductBezierPatch, direction: PatchDirection, value: number, u: number, v: number): PieceCorrespondence {
    const [left, right] = subdivisionPieces(patch, direction, value);
    const location = locateInPieces(direction, value, u, v);
    return {location, point: xyz((location.piece === "left" ? left : right).eval(location.u, location.v))};
}

const isOriginalNet = (id: string) => id.startsWith("net-row-") || id.startsWith("net-col-") || id === "highlight-row" || id === "highlight-col";

/**
 * The tensor scene with the pieces shown: the original net polylines, the control points, the selected-point label and
 * the row/column highlight give way to the piece nets, the split curve and the piece labels (the points are not
 * editable meanwhile). With `showNet` off only the split curve is added. The surface mesh, iso and boundary curves and the marker `S(u, v)` stay: the image is the same.
 */
export function withSubdivisionPieces(scene: SurfaceScene, patch: TensorProductBezierPatch, direction: PatchDirection, value: number, showNet: boolean): SurfaceScene {
    const {polylines, labels} = buildSubdivisionScene(patch, direction, value);
    const split = polylines.filter(line => line.id === "split-curve");
    return {
        ...scene,
        points: [],
        polylines: [...scene.polylines.filter(line => !isOriginalNet(line.id)), ...(showNet ? polylines : split)],
        labels: [...scene.labels.filter(label => label.id !== "selected-point"), ...(showNet ? labels : [])],
        interaction: {...scene.interaction, editable: false},
    };
}
