/**
 * Per-element depth check of the JSXGraph surface view's painter's order. The view draws a scene; this reads the DOM
 * order of its SVG nodes (what the browser really paints) and compares it with the true occlusion computed
 * independently with the pinhole oracle: at sample points of each line piece, every triangle that covers the point on
 * screen is either clearly in front of the line (it must be painted after the line) or clearly behind it (before).
 */
import {pinholeProject} from './surface-view/pinholeOracle.test-helper';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
import {letBoardTimersFire} from './surface-view/jsxLifecycleProbe.test-helper';
import type {PolylineRole, SurfaceScene, Xyz} from './surface-view/surfaceScene';
import type {FramingViewport} from './jsxFraming.test-helper';

interface Internals {
    draw: {elements: Array<{rendNode?: SVGElement}>; nodes: Array<SVGElement | null | undefined>};
    pool: {verts: Float64Array; tris: Uint32Array; planes: Uint32Array; segs: Uint32Array; segRoles: PolylineRole[]};
}

export interface DepthViolation {
    role: PolylineRole;
    piece: number;
    /** `front`: the line is in front of a triangle that is painted over it; `behind`: the line paints over a nearer triangle. */
    kind: 'front' | 'behind';
    /** Signed distance of the surface behind the line, in mean mesh edges (positive: the line is nearer). */
    gap: number;
}

export interface DepthReport {
    triangles: number;
    pieces: number;
    /** Sample points tested against at least one covering triangle. */
    tested: number;
    /** Tested points whose gap to the surface exceeded the tolerance, i.e. where the order matters. */
    decisive: number;
    meanEdge: number;
    violations: DepthViolation[];
    byRole: Record<string, number>;
    /** Per role, the gap in mean mesh edges from each tested point to the nearest covering triangle (positive: the line is in front of the whole surface there). */
    nearestGap: Record<string, number[]>;
}

const CELL = 16;
const EPS = 1e-9;

/** `tolerance` is in mean mesh edges: lines closer than that to the surface are treated as lying on it. */
export async function checkDepthOrder(
    scene: SurfaceScene, viewport: FramingViewport, tolerance: number, roles?: ReadonlyArray<PolylineRole>,
    /** When given, this scene is drawn first and `scene` is then reconciled onto the same view (an edit, not a fresh build). */
    before?: SurfaceScene,
): Promise<DepthReport> {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: viewport.width});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: viewport.height});
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    view.reconcile(before ?? scene);
    await view.attach(host);
    view.flush();
    if (before) {
        view.reconcile(scene);
        view.flush();
    }
    try {
        const {draw, pool} = view as unknown as Internals;
        const n = pool.verts.length / 3;
        const sx = new Float64Array(n), sy = new Float64Array(n), z = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const p = pinholeProject(scene.camera, viewport, [pool.verts[3 * i], pool.verts[3 * i + 1], pool.verts[3 * i + 2]] as Xyz);
            sx[i] = p.x;
            sy[i] = p.y;
            z[i] = p.depth;
        }
        const nTri = pool.tris.length / 3, nPlane = pool.planes.length / 4, nSeg = pool.segs.length / 2;
        const nodes = draw.nodes.filter((nd): nd is SVGElement => !!nd);
        const parent = nodes[0]?.parentNode;
        if (!parent) throw new Error('nothing was drawn');
        const rankOf = new Map<Node, number>();
        Array.from(parent.childNodes).forEach((nd, k) => rankOf.set(nd, k));
        const rank = (element: number): number => {
            const node = draw.elements[element]?.rendNode;
            const r = node ? rankOf.get(node) : undefined;
            if (r === undefined) throw new Error(`element ${element} is not in the drawn order`);
            return r;
        };
        // Mean triangle edge in world units (all edges of every triangle).
        let edgeSum = 0;
        for (let t = 0; t < pool.tris.length; t += 3) {
            for (let k = 0; k < 3; k++) {
                const a = pool.tris[t + k] * 3, b = pool.tris[t + (k + 1) % 3] * 3;
                edgeSum += Math.hypot(pool.verts[a] - pool.verts[b], pool.verts[a + 1] - pool.verts[b + 1], pool.verts[a + 2] - pool.verts[b + 2]);
            }
        }
        const meanEdge = nTri ? edgeSum / (3 * nTri) : 0;
        const tol = tolerance * meanEdge;
        // Screen grid of triangles.
        const grid = new Map<number, number[]>();
        const key = (cx: number, cy: number): number => cx * 100003 + cy;
        for (let t = 0; t < nTri; t++) {
            const a = pool.tris[3 * t], b = pool.tris[3 * t + 1], c = pool.tris[3 * t + 2];
            const x0 = Math.floor(Math.min(sx[a], sx[b], sx[c]) / CELL), x1 = Math.floor(Math.max(sx[a], sx[b], sx[c]) / CELL);
            const y0 = Math.floor(Math.min(sy[a], sy[b], sy[c]) / CELL), y1 = Math.floor(Math.max(sy[a], sy[b], sy[c]) / CELL);
            for (let cx = x0; cx <= x1; cx++) {
                for (let cy = y0; cy <= y1; cy++) {
                    const k = key(cx, cy);
                    const list = grid.get(k);
                    if (list) list.push(t); else grid.set(k, [t]);
                }
            }
        }
        const report: DepthReport = {triangles: nTri, pieces: 0, tested: 0, decisive: 0, meanEdge, violations: [], byRole: {}, nearestGap: {}};
        for (let s = 0; s < nSeg; s++) {
            const role = pool.segRoles[s];
            if (roles && !roles.includes(role)) continue;
            report.pieces++;
            const a = pool.segs[2 * s], b = pool.segs[2 * s + 1];
            const segRank = rank(nTri + nPlane + s);
            for (const f of [0, 0.5, 1]) {
                const px = sx[a] + f * (sx[b] - sx[a]), py = sy[a] + f * (sy[b] - sy[a]);
                const segZ = z[a] + f * (z[b] - z[a]);
                let nearest = Infinity;
                for (const t of grid.get(key(Math.floor(px / CELL), Math.floor(py / CELL))) ?? []) {
                    const i = pool.tris[3 * t], j = pool.tris[3 * t + 1], k = pool.tris[3 * t + 2];
                    const det = (sy[j] - sy[k]) * (sx[i] - sx[k]) + (sx[k] - sx[j]) * (sy[i] - sy[k]);
                    if (Math.abs(det) < 1e-6) continue;
                    const l1 = ((sy[j] - sy[k]) * (px - sx[k]) + (sx[k] - sx[j]) * (py - sy[k])) / det;
                    const l2 = ((sy[k] - sy[i]) * (px - sx[k]) + (sx[i] - sx[k]) * (py - sy[k])) / det;
                    const l3 = 1 - l1 - l2;
                    if (l1 < -EPS || l2 < -EPS || l3 < -EPS) continue;
                    // 1/depth is affine in screen space under perspective.
                    const triZ = 1 / (l1 / z[i] + l2 / z[j] + l3 / z[k]);
                    report.tested++;
                    const gap = triZ - segZ;
                    nearest = Math.min(nearest, gap);
                    if (Math.abs(gap) <= tol) continue;
                    report.decisive++;
                    const triRank = rank(t);
                    const kind = gap > 0 ? (segRank < triRank ? 'front' : null) : (segRank > triRank ? 'behind' : null);
                    if (kind) {
                        report.violations.push({role, piece: s, kind, gap: gap / meanEdge});
                        report.byRole[role] = (report.byRole[role] ?? 0) + 1;
                    }
                }
                if (Number.isFinite(nearest)) (report.nearestGap[role] ??= []).push(nearest / meanEdge);
            }
        }
        return report;
    } finally {
        view.dispose();
        host.remove();
        await letBoardTimersFire();
    }
}
