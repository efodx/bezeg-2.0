import {makeCameraModel, projectToScreen, type JsxViewport} from './jsxProjection';
import {cameraPosition} from './surfaceMath';
import type {LabelLayout, SceneMesh, SurfaceScene, Xyz} from './surfaceScene';

/**
 * Pure label layout of the JSXGraph surface view (task 05 of docs/specs/jsxgraph-surface-view.md; no JSXGraph, no DOM).
 *
 * A label's position is `projectToScreen`, the one projection that also draws, orders and picks. Whether it is
 * visible is decided like the Three view does: the anchor must lie in the viewport in front of the eye, and no
 * triangle of the scene mesh may lie between the eye and the anchor (ray-triangle test, both sides of a triangle).
 */

/** A hit must lie this far in front of the anchor to count, so a label exactly on a facet is not hidden by it. */
const OCCLUSION_EPS = 1e-3;
/** Barycentric slack so a ray through the shared edge of two triangles is not lost between them. */
const EDGE_EPS = 1e-9;

/**
 * True when a triangle of `mesh` crosses the segment from `eye` to `anchor` more than `slack` (plus a tiny margin)
 * in front of `anchor`. `slack` is the mesh's chord tolerance for an anchor on the true surface, 0 otherwise.
 */
export function isAnchorOccluded(mesh: SceneMesh | undefined, eye: Xyz, anchor: Xyz, slack = 0): boolean {
    if (!mesh?.visible) return false;
    const dx = anchor[0] - eye[0], dy = anchor[1] - eye[1], dz = anchor[2] - eye[2];
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 1e-9) return false;
    // The ray is eye + t * (anchor - eye): a hit counts for 0 < t < tMax.
    const tMax = 1 - (OCCLUSION_EPS + slack) / dist;
    if (tMax <= 0) return false;
    const pos = mesh.positions, faces = mesh.faces;
    for (let f = 0; f + 2 < faces.length; f += 3) {
        const a = faces[f] * 3, b = faces[f + 1] * 3, c = faces[f + 2] * 3;
        const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
        const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-14) continue; // the ray is parallel to the triangle
        const inv = 1 / det;
        const sx = eye[0] - pos[a], sy = eye[1] - pos[a + 1], sz = eye[2] - pos[a + 2];
        const u = (sx * px + sy * py + sz * pz) * inv;
        if (u < -EDGE_EPS || u > 1 + EDGE_EPS) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < -EDGE_EPS || u + v > 1 + EDGE_EPS) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 0 && t < tMax) return true;
    }
    return false;
}

/** Every scene label projected into CSS pixels from the host's top-left, with whether it is in view and unoccluded. */
export function computeLabelLayout(scene: Pick<SurfaceScene, 'labels' | 'mesh' | 'camera'>, viewport: JsxViewport): LabelLayout[] {
    if (scene.labels.length === 0) return [];
    const model = makeCameraModel(scene.camera, viewport);
    const {az, el, distance, target} = scene.camera;
    const eye = cameraPosition(az, el, distance, target);
    return scene.labels.map(label => {
        const p = projectToScreen(model, ...label.anchor);
        const inFrustum = p.depth > 0 && Math.abs(p.ndcX) <= 1 && Math.abs(p.ndcY) <= 1;
        // A label on the surface itself (no control point) sits on the true surface, which the faceted mesh may
        // overlap by its chord error; a control point label is off the surface and keeps the strict test.
        const slack = label.pointId === undefined ? scene.mesh?.chordTolerance ?? 0 : 0;
        const visible = inFrustum && !isAnchorOccluded(scene.mesh, eye, label.anchor, slack);
        return {id: label.id, text: label.text, x: p.x, y: p.y, visible};
    });
}

/** Identity of a layout at the resolution a screen can show (a tenth of a pixel); equal keys are not re-delivered. */
export function labelLayoutKey(layout: readonly LabelLayout[]): string {
    return JSON.stringify(layout.map(l => [l.id, l.text, Math.round(l.x * 10), Math.round(l.y * 10), l.visible]));
}
