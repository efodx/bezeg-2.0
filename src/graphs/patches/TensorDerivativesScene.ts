import type {TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import {differentialsWithDrawing, type DifferentialArrow, type TensorDifferentials} from "./tensorDerivatives";
import type {SceneLabel, ScenePlane, ScenePolyline, Xyz} from "./surface-view/surfaceScene";

/** Which of the optional objects the derivative scene draws; `S_u` and `S_v` are always drawn. */
export interface DerivativesVisibility {
    readonly showTangentPlane: boolean;
    readonly showNormal: boolean;
    readonly showTwist: boolean;
}

export interface DerivativesScene {
    readonly polylines: ScenePolyline[];
    readonly labels: SceneLabel[];
    readonly planes: ScenePlane[];
    readonly differentials: TensorDifferentials;
}

const ARROWS = {
    su: {role: "vector-u", label: "S_u"},
    sv: {role: "vector-v", label: "S_v"},
    twist: {role: "twist", label: "S_{uv}"},
    normal: {role: "normal", label: "\\mathbf{n}"},
} as const satisfies Record<DifferentialArrow["name"], {role: ScenePolyline["role"]; label: string}>;

const isPoint = ([a, b]: readonly [Xyz, Xyz]) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** Whether the normal classifier treats this tangent as zero; it uses a tolerance, so such an arrow may not be exactly a point. */
const vanishes = (name: DifferentialArrow["name"], normal: TensorDifferentials["normal"]) => normal.kind === "degenerate"
    && ((name === "su" && (normal.reason === "zero-su" || normal.reason === "both-zero"))
        || (name === "sv" && (normal.reason === "zero-sv" || normal.reason === "both-zero")));

/**
 * The derivatives of the tensor patch at (u, v) as scene objects, from `drawDifferentials`: each arrow is a shaft and
 * two head segments (three polylines `deriv-<name>-shaft`, `-head-0`, `-head-1`) with a label at its tip, and the
 * tangent plane is a quad. An arrow of length 0 is omitted (a vanishing `S_u`, `S_v` or `S_uv`, or a tangent the normal classifier reports as zero), as are the normal and
 * the plane where the normal is undefined (the tangent vectors do not span a plane).
 */
export function buildDerivativesScene(patch: TensorProductBezierPatch, u: number, v: number, visibility: DerivativesVisibility): DerivativesScene {
    const {differentials, drawing} = differentialsWithDrawing(patch, u, v);
    const polylines: ScenePolyline[] = [];
    const labels: SceneLabel[] = [];
    for (const arrow of drawing.arrows) {
        if (arrow.name === "normal" && !visibility.showNormal) continue;
        if (arrow.name === "twist" && !visibility.showTwist) continue;
        if (isPoint(arrow.shaft) || vanishes(arrow.name, differentials.normal)) continue;
        const {role, label} = ARROWS[arrow.name];
        const id = `deriv-${arrow.name}`;
        polylines.push({id: `${id}-shaft`, role, points: [...arrow.shaft]});
        arrow.head.forEach((segment, k) => polylines.push({id: `${id}-head-${k}`, role, points: [...segment]}));
        labels.push({id: `${id}-label`, text: label, anchor: arrow.shaft[1]});
    }
    const planes: ScenePlane[] = visibility.showTangentPlane && drawing.tangentQuad ? [{id: "tangent-plane", corners: drawing.tangentQuad}] : [];
    return {polylines, labels, planes, differentials};
}
