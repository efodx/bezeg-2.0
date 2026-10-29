import {JSXGraph} from 'jsxgraph';
import {applyDomOrder, orderBackToFront} from './jsxDepthOrder';
import {
    bboxHalfSide, JsxCameraModel, makeCameraModel, projectToBoard, viewDepth, viewRadiusFor,
} from './jsxProjection';
import {FOV_DEG, fitCameraTo, orbit, zoom} from './surfaceMath';
import {
    assertFiniteScene, AttachOptions, LabelLayout, PolylineRole, SurfaceCamera, SurfaceCapture, SurfaceEdit,
    SurfaceScene, SurfaceView, Xyz,
} from './surfaceScene';

/**
 * Feasibility-gate `SurfaceView` drawn with JSXGraph 1.14.1 (task 01 of docs/specs/jsxgraph-surface-view.md).
 *
 * Two drawing strategies, chosen at construction:
 *  - `view3d`: mesh triangles, planes and line segments are `curve3d` elements of a central-projection `view3d`;
 *    JSXGraph reprojects them on every camera change.
 *  - `board2d`: the same drawables are plain 2D `curve` elements; the adapter projects them itself
 *    (`jsxProjection.ts`) and writes their path. Control points and markers stay `point3d` elements of the same
 *    `view3d`, so JSXGraph's built-in 3D point drag keeps working.
 * Elements are created once per topology and reused: a camera change reprojects, sorts and reorders the SVG nodes.
 * Gate scope: fixed styling, no labels, no export, no pinch zoom.
 */

export type JsxSurfaceStrategy = 'view3d' | 'board2d';
export interface JsxSurfaceViewOptions {
    strategy?: JsxSurfaceStrategy;
}

/** The slice of JSXGraph's untyped 3D API that this adapter uses. */
interface JxgElement {
    rendNode?: SVGElement;
    hasPoint?: (...args: unknown[]) => boolean;
    needsRegularUpdate?: boolean;
    updateDataArray?: () => void;
    dataX?: number[];
    dataY?: number[];
    on: (event: string, handler: () => void) => void;
}
interface JxgCurve3D {
    element2D: JxgElement;
    _X: number[];
    _Y: number[];
    _Z: number[];
}
interface JxgPoint3D {
    element2D: JxgElement & {coords: {usrCoords: number[]}};
    X: () => number;
    Y: () => number;
    Z: () => number;
    setPosition: (xyz: Xyz) => void;
}
interface JxgView3D {
    bbox3D: number[][];
    r: number | null;
    needsUpdate: boolean;
    az_slide: {setValue: (v: number) => void};
    el_slide: {setValue: (v: number) => void};
    create: (type: string, parents: unknown[], attributes: object) => unknown;
    project3DTo2D: (x: number, y: number, z: number) => number[];
}
interface JxgBoard {
    create: (type: string, parents: unknown[], attributes: object) => unknown;
    update: () => void;
    suspendUpdate: () => void;
    unsuspendUpdate: () => void;
    resizeContainer: (w: number, h: number, dontSet?: boolean, dontSetCss?: boolean, dontSetBoundingBox?: boolean) => void;
    setBoundingBox: (bbox: number[], keepAspect?: boolean) => void;
    on: (event: string, handler: () => void) => void;
    objectsList: unknown[];
    downObjects: unknown[];
    _change3DView?: boolean;
}

const LAYER = 12;
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 480;
const KEY_STEP_PX = 0.1 / 0.008;
const ORBIT_START_PX = 3;

type Style = {stroke: string; width: number; fill?: string; fillOpacity?: number};
const MESH_STYLE: Style = {stroke: '#efe6b8', width: 0.6, fill: '#efe6b8', fillOpacity: 1};
const PLANE_STYLE: Style = {stroke: '#5b8fc7', width: 1, fill: '#5b8fc7', fillOpacity: 0.3};
const LINE_STYLES: Record<PolylineRole, Style> = {
    net: {stroke: '#3b6ea5', width: 1.2},
    'net-2': {stroke: '#a5663b', width: 1.2},
    iso: {stroke: '#7a6a2c', width: 0.9},
    'iso-v': {stroke: '#2c7a5e', width: 0.9},
    'iso-w': {stroke: '#7a2c6b', width: 0.9},
    boundary: {stroke: '#222222', width: 1.6},
    construction: {stroke: '#2e9e48', width: 1.2},
    'construction-2': {stroke: '#8a56c8', width: 1.2},
    highlight: {stroke: '#d6362b', width: 2.4},
    compare: {stroke: '#999999', width: 1},
    'vector-u': {stroke: '#d6362b', width: 2},
    'vector-v': {stroke: '#2b7bd6', width: 2},
    twist: {stroke: '#d68a2b', width: 2},
    normal: {stroke: '#444444', width: 2},
};

/** Everything a scene turns into; coordinates live in one vertex pool so each vertex is projected once per frame. */
interface Pool {
    signature: string;
    /** Flat xyz of mesh vertices, then polyline points, then plane corners. */
    verts: Float64Array;
    tris: Uint32Array;
    planes: Uint32Array;
    segs: Uint32Array;
    segRoles: PolylineRole[];
    /** Offset of the first polyline point of every polyline in the pool. */
    polylineBase: number[];
    markerIds: string[];
    pointIds: string[];
    min: Xyz;
    max: Xyz;
    lineBias: number;
    pointBias: number;
}

interface Drawables {
    /** Triangles, planes, segments, markers, points in the draw-list layout. */
    nodes: (SVGElement | null | undefined)[];
    elements: (JxgCurve3D | JxgElement)[];
    markers: JxgPoint3D[];
    points: Map<string, JxgPoint3D>;
}

let descriptionCounter = 0;

export class JsxSurfaceView implements SurfaceView {
    readonly strategy: JsxSurfaceStrategy;
    private host: HTMLElement | null = null;
    private container: HTMLDivElement | null = null;
    private descriptionEl: HTMLElement | null = null;
    private hostPrev: {tabIndex: string | null; aria: string | null; role: string | null; describedBy: string | null} | null = null;
    private ariaLabel = '';
    private description = '';
    private board: JxgBoard | null = null;
    private view: JxgView3D | null = null;
    private draw: Drawables | null = null;
    private pool: Pool | null = null;
    private scene: SurfaceScene | null = null;
    private appliedKey = '';
    private width = DEFAULT_WIDTH;
    private height = DEFAULT_HEIGHT;
    private appliedWidth = 0;
    private appliedHeight = 0;
    private dirty = false;
    private raf = 0;
    private disposed = false;
    private observer: ResizeObserver | null = null;
    private readonly cleanups: Array<() => void> = [];
    private readonly editListeners = new Set<(edit: SurfaceEdit) => void>();
    private readonly layoutListeners = new Set<(labels: LabelLayout[]) => void>();
    private layoutDelivered = false;
    private orbitDrag: {id: number; x: number; y: number; moved: boolean} | null = null;
    private dragPointId: string | null = null;
    private lastDragXyz: Xyz | null = null;
    /** Sorted draw list scratch, reused between frames. */
    private depths = new Float64Array(0);
    private vertexDepth = new Float64Array(0);
    private sx = new Float64Array(0);
    private sy = new Float64Array(0);
    /** Counters read by tests and the measurement harness. */
    readonly stats = {frames: 0, rebuilds: 0, domMoves: 0, createdElements: 0};

    constructor(options: JsxSurfaceViewOptions = {}) {
        this.strategy = options.strategy ?? 'board2d';
    }

    // ---- SurfaceView ---------------------------------------------------------------------------------------------

    async attach(host: HTMLElement, options: AttachOptions = {}): Promise<void> {
        if (this.disposed || this.host) return;
        this.host = host;
        this.ariaLabel = options.ariaLabel ?? this.ariaLabel;
        this.description = options.description ?? this.description;
        const container = document.createElement('div');
        container.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;position:relative;overflow:hidden;';
        container.setAttribute('data-jsx-surface-view', this.strategy);
        this.container = container;
        host.appendChild(container);

        this.hostPrev = {
            tabIndex: host.getAttribute('tabindex'), aria: host.getAttribute('aria-label'),
            role: host.getAttribute('role'), describedBy: host.getAttribute('aria-describedby'),
        };
        host.tabIndex = 0;
        host.setAttribute('role', 'application');
        this.applyAria();

        this.measure();
        this.listen(container, 'pointerdown', (e: PointerEvent) => this.onPointerDown(e));
        this.listen(container, 'pointermove', (e: PointerEvent) => this.onPointerMove(e));
        this.listen(container, 'pointerup', (e: PointerEvent) => this.onPointerEnd(e));
        this.listen(container, 'pointercancel', (e: PointerEvent) => this.onPointerEnd(e));
        this.listen(container, 'wheel', (e: WheelEvent) => this.onWheel(e), {passive: false});
        this.listen(host, 'keydown', (e: KeyboardEvent) => this.onKey(e));
        if (typeof ResizeObserver !== 'undefined') {
            this.observer = new ResizeObserver(() => {
                this.measure();
                this.requestRender();
            });
            this.observer.observe(host);
        }
        this.dirty = true;
        this.requestRender();
    }

    reconcile(scene: SurfaceScene): void {
        if (this.disposed) return;
        assertFiniteScene(scene);
        this.scene = scene;
        this.dirty = true;
        this.requestRender();
    }

    onEdit(listener: (edit: SurfaceEdit) => void): () => void {
        this.editListeners.add(listener);
        return () => this.editListeners.delete(listener);
    }

    setAriaLabel(label: string, description?: string): void {
        this.ariaLabel = label;
        if (description !== undefined) this.description = description;
        this.applyAria();
    }

    onLayout(listener: (labels: LabelLayout[]) => void): () => void {
        this.layoutListeners.add(listener);
        return () => this.layoutListeners.delete(listener);
    }

    capture(): Promise<SurfaceCapture> {
        return Promise.reject(new Error('JsxSurfaceView.capture is not implemented in the feasibility gate'));
    }

    fitCamera(): void {
        if (this.disposed || !this.scene) return;
        const pts = this.scene.points.map(p => p.xyz);
        this.emit({kind: 'camera', camera: fitCameraTo(pts, this.width / this.height, this.scene.camera)});
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.layoutListeners.clear();
        this.editListeners.clear();
        for (const fn of this.cleanups.splice(0)) fn();
        this.observer?.disconnect();
        this.observer = null;
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
        this.destroyBoard();
        this.container?.remove();
        this.container = null;
        if (this.host && this.hostPrev) {
            this.restoreAttr(this.host, 'tabindex', this.hostPrev.tabIndex);
            this.restoreAttr(this.host, 'aria-label', this.hostPrev.aria);
            this.restoreAttr(this.host, 'role', this.hostPrev.role);
            this.restoreAttr(this.host, 'aria-describedby', this.hostPrev.describedBy);
            this.descriptionEl?.remove();
        }
        this.descriptionEl = null;
        this.host = null;
        this.scene = null;
        this.pool = null;
    }

    // ---- Rendering -----------------------------------------------------------------------------------------------

    /** Draws now if anything changed. Tests call it directly; the browser path is the coalesced animation frame. */
    flush(): void {
        this.raf = 0;
        if (this.disposed || !this.container || !this.scene || !this.dirty) return;
        this.dirty = false;
        const scene = this.scene;
        const geometryKey = this.geometryKey(scene);
        if (!this.board || this.pool?.signature !== this.topologySignature(scene)) {
            this.rebuild(scene);
        } else if (geometryKey !== this.appliedKey) {
            this.updateGeometry(scene);
        }
        this.appliedKey = geometryKey;
        this.renderFrame(scene.camera);
        this.stats.frames++;
        if (!this.layoutDelivered) {
            this.layoutDelivered = true;
            for (const l of [...this.layoutListeners]) l([]);
        }
    }

    private requestRender(): void {
        if (this.disposed || this.raf) return;
        this.raf = requestAnimationFrame(() => this.flush());
    }

    private geometryKey(scene: SurfaceScene): string {
        const dyn = scene.points.map(p => `${p.id}${p.selected ? '*' : ''}${p.xyz.join(',')}`).join(';')
            + '|' + scene.markers.map(m => `${m.id}${m.xyz.join(',')}`).join(';')
            + '|' + (scene.planes ?? []).map(p => p.corners.flat().join(',')).join(';');
        return `${scene.revision}|${scene.interaction.editable ? 1 : 0}|${dyn}`;
    }

    private topologySignature(scene: SurfaceScene): string {
        const mesh = scene.mesh?.visible ? `${scene.mesh.positions.length}:${scene.mesh.faces.length}` : '-';
        return [
            mesh, scene.polylines.map(l => `${l.id}:${l.role}:${l.points.length}`).join(','),
            (scene.planes ?? []).map(p => p.id).join(','), scene.markers.map(m => `${m.id}:${m.role}`).join(','),
            scene.points.map(p => p.id).join(','), scene.interaction.editable ? 'e' : 'r',
        ].join('|');
    }

    private measure(): void {
        if (!this.host) return;
        this.width = Math.max(1, this.host.clientWidth || DEFAULT_WIDTH);
        this.height = Math.max(1, this.host.clientHeight || DEFAULT_HEIGHT);
        this.dirty = true;
    }

    private destroyBoard(): void {
        if (this.board) {
            try {
                JSXGraph.freeBoard(this.board as never);
            } catch {
                // freeBoard on a half-built board must not stop disposal.
            }
        }
        this.board = null;
        this.view = null;
        this.draw = null;
        this.appliedWidth = 0;
        this.appliedHeight = 0;
    }

    private createBoard(): void {
        const container = this.container!;
        const w = this.width, h = this.height;
        // zoom.enabled is honoured by JSXGraph but missing from its stale typings, hence the separate variable.
        const boardOptions = {
            boundingbox: [-w / 2, h / 2, w / 2, -h / 2] as [number, number, number, number],
            axis: false, showCopyright: false, showNavigation: false, showInfobox: false,
            pan: {enabled: false}, zoom: {enabled: false, wheel: false, pinch: false},
            keepAspectRatio: false, renderer: 'svg' as const,
        };
        const board = JSXGraph.initBoard(container, boardOptions) as unknown as JxgBoard;
        this.board = board;
        const view = board.create('view3d', [[-0.2 * w, -0.2 * h], [0.4 * w, 0.4 * h], [[-1, 1], [-1, 1], [-1, 1]]], {
            projection: 'central', fov: (FOV_DEG * Math.PI) / 180, axesPosition: 'none',
            xPlaneRear: {visible: false}, yPlaneRear: {visible: false}, zPlaneRear: {visible: false},
            xPlaneFront: {visible: false}, yPlaneFront: {visible: false}, zPlaneFront: {visible: false},
            trackball: {enabled: false}, depthOrder: {enabled: false},
            az: {pointer: {enabled: false}, keyboard: {enabled: false}, slider: {visible: false, min: 0, max: 2 * Math.PI, start: 0}},
            el: {pointer: {enabled: false}, keyboard: {enabled: false}, slider: {visible: false, min: -Math.PI / 2, max: Math.PI / 2, start: 0}},
            bank: {pointer: {enabled: false}, keyboard: {enabled: false}, slider: {visible: false, min: -Math.PI, max: Math.PI, start: 0}},
        }) as JxgView3D;
        this.view = view;
        this.appliedWidth = w;
        this.appliedHeight = h;
        board.on('update', () => this.onBoardUpdate());
    }

    private rebuild(scene: SurfaceScene): void {
        this.destroyBoard();
        this.createBoard();
        const board = this.board!, view = this.view!;
        const pool = this.buildPool(scene);
        this.pool = pool;
        const draw: Drawables = {nodes: [], elements: [], markers: [], points: new Map()};
        this.draw = draw;
        // Positions first, so the elements are created at their final place; the first frame then only reorders.
        this.setCameraOnView(scene.camera, pool);
        board.suspendUpdate();
        const make = (coords: Xyz[], style: Style): void => {
            draw.elements.push(this.makeDrawable(coords, style));
        };
        const v = pool.verts;
        const at = (i: number): Xyz => [v[3 * i], v[3 * i + 1], v[3 * i + 2]];
        for (let t = 0; t < pool.tris.length; t += 3) {
            const a = pool.tris[t], b = pool.tris[t + 1], c = pool.tris[t + 2];
            make([at(a), at(b), at(c), at(a)], MESH_STYLE);
        }
        for (let q = 0; q < pool.planes.length; q += 4) {
            const [a, b, c, d] = [pool.planes[q], pool.planes[q + 1], pool.planes[q + 2], pool.planes[q + 3]];
            make([at(a), at(b), at(c), at(d), at(a)], PLANE_STYLE);
        }
        for (let s = 0; s < pool.segs.length; s += 2) {
            make([at(pool.segs[s]), at(pool.segs[s + 1])], LINE_STYLES[pool.segRoles[s / 2]]);
        }
        for (const marker of scene.markers) {
            draw.markers.push(this.makePoint(marker.xyz, marker.role === 'evaluated' ? '#d6362b' : marker.role === 'construction' ? '#2e9e48' : '#8a56c8', 3, true));
        }
        for (const point of scene.points) {
            const p3 = this.makePoint(point.xyz, point.selected ? '#d6362b' : '#1d4f91', 4, !scene.interaction.editable);
            draw.points.set(point.id, p3);
            this.wirePoint(point.id, p3);
        }
        board.unsuspendUpdate();
        this.stats.rebuilds++;
        this.collectNodes();
        this.appliedKey = '';
        view.needsUpdate = true;
    }

    private buildPool(scene: SurfaceScene): Pool {
        const mesh = scene.mesh?.visible ? scene.mesh : undefined;
        const meshVerts = mesh ? mesh.positions.length / 3 : 0;
        let count = meshVerts;
        const polylineBase: number[] = [];
        for (const l of scene.polylines) {
            polylineBase.push(count);
            count += l.points.length;
        }
        const planeBase = count;
        count += (scene.planes?.length ?? 0) * 4;
        const verts = new Float64Array(count * 3);
        if (mesh) for (let i = 0; i < mesh.positions.length; i++) verts[i] = mesh.positions[i];
        scene.polylines.forEach((l, i) => l.points.forEach((p, j) => verts.set(p, 3 * (polylineBase[i] + j))));
        (scene.planes ?? []).forEach((plane, i) => plane.corners.forEach((p, j) => verts.set(p, 3 * (planeBase + 4 * i + j))));
        const segs: number[] = [];
        const segRoles: PolylineRole[] = [];
        scene.polylines.forEach((l, i) => {
            for (let j = 0; j + 1 < l.points.length; j++) {
                segs.push(polylineBase[i] + j, polylineBase[i] + j + 1);
                segRoles.push(l.role);
            }
        });
        const planes = new Uint32Array((scene.planes?.length ?? 0) * 4);
        for (let i = 0; i < planes.length; i++) planes[i] = planeBase + i;
        const pool: Pool = {
            signature: this.topologySignature(scene), verts, tris: Uint32Array.from(mesh?.faces ?? []), planes,
            segs: Uint32Array.from(segs), segRoles, polylineBase,
            markerIds: scene.markers.map(m => m.id), pointIds: scene.points.map(p => p.id),
            min: [0, 0, 0], max: [0, 0, 0], lineBias: 0, pointBias: 0,
        };
        this.fillPoolExtents(pool, scene);
        return pool;
    }

    private fillPoolExtents(pool: Pool, scene: SurfaceScene): void {
        const min: Xyz = [Infinity, Infinity, Infinity], max: Xyz = [-Infinity, -Infinity, -Infinity];
        const grow = (x: number, y: number, z: number): void => {
            if (x < min[0]) min[0] = x;
            if (y < min[1]) min[1] = y;
            if (z < min[2]) min[2] = z;
            if (x > max[0]) max[0] = x;
            if (y > max[1]) max[1] = y;
            if (z > max[2]) max[2] = z;
        };
        for (let i = 0; i < pool.verts.length; i += 3) grow(pool.verts[i], pool.verts[i + 1], pool.verts[i + 2]);
        for (const p of scene.points) grow(...p.xyz);
        for (const m of scene.markers) grow(...m.xyz);
        if (!Number.isFinite(min[0])) {
            pool.min = [0, 0, 0];
            pool.max = [0, 0, 0];
        } else {
            pool.min = min;
            pool.max = max;
        }
        // Depth bias: a line or marker lying on the surface must win against the triangles around it.
        let edge = 0, n = 0;
        const step = Math.max(3, Math.floor(pool.tris.length / 300) * 3);
        for (let t = 0; t + 2 < pool.tris.length; t += step) {
            const a = pool.tris[t] * 3, b = pool.tris[t + 1] * 3;
            edge += Math.hypot(pool.verts[a] - pool.verts[b], pool.verts[a + 1] - pool.verts[b + 1], pool.verts[a + 2] - pool.verts[b + 2]);
            n++;
        }
        const mean = n ? edge / n : 0;
        pool.lineBias = 0.5 * mean;
        pool.pointBias = 1.0 * mean;
    }

    /** Same topology, new coordinates (a point drag, a moving marker): rewrite the pool and the elements in place. */
    private updateGeometry(scene: SurfaceScene): void {
        const draw = this.draw!, pool = this.pool!;
        const fresh = this.buildPool(scene);
        pool.verts = fresh.verts;
        pool.min = fresh.min;
        pool.max = fresh.max;
        pool.lineBias = fresh.lineBias;
        pool.pointBias = fresh.pointBias;
        const v = pool.verts;
        if (this.strategy === 'view3d') {
            const write = (curve: JxgCurve3D, idx: number[]): void => {
                idx.forEach((vi, k) => {
                    curve._X[k] = v[3 * vi];
                    curve._Y[k] = v[3 * vi + 1];
                    curve._Z[k] = v[3 * vi + 2];
                });
            };
            let e = 0;
            for (let t = 0; t < pool.tris.length; t += 3, e++) {
                write(draw.elements[e] as JxgCurve3D, [pool.tris[t], pool.tris[t + 1], pool.tris[t + 2], pool.tris[t]]);
            }
            for (let q = 0; q < pool.planes.length; q += 4, e++) {
                write(draw.elements[e] as JxgCurve3D, [pool.planes[q], pool.planes[q + 1], pool.planes[q + 2], pool.planes[q + 3], pool.planes[q]]);
            }
            for (let s = 0; s < pool.segs.length; s += 2, e++) write(draw.elements[e] as JxgCurve3D, [pool.segs[s], pool.segs[s + 1]]);
        }
        scene.markers.forEach((m, i) => draw.markers[i].setPosition(m.xyz));
        for (const p of scene.points) draw.points.get(p.id)?.setPosition(p.xyz);
        if (this.view) this.view.needsUpdate = true;
        // The 3D curves must recompute from their new data, not only reproject.
        this.board!.update();
    }

    private makeDrawable(coords: Xyz[], style: Style): JxgCurve3D | JxgElement {
        const attributes = {
            strokeColor: style.stroke, strokeWidth: style.width, fillColor: style.fill ?? 'none',
            fillOpacity: style.fillOpacity ?? 0, highlight: false, fixed: true, layer: LAYER, visible: true,
            withLabel: false, dash: 0,
        };
        this.stats.createdElements++;
        if (this.strategy === 'view3d') {
            const curve = this.view!.create('curve3d', [coords], attributes) as JxgCurve3D;
            curve.element2D.hasPoint = () => false;
            return curve;
        }
        // board2d: a 2D curve whose path the adapter writes itself; JSXGraph only hosts the SVG node and
        // regenerates it from the cached projection if it ever redraws the curve on its own.
        const curve = this.board!.create('curve', [[0], [0]], attributes) as JxgElement;
        curve.hasPoint = () => false;
        curve.needsRegularUpdate = false;
        const index = this.draw!.elements.length;
        curve.updateDataArray = () => {
            const [xs, ys] = this.cachedCurve(index);
            curve.dataX = xs;
            curve.dataY = ys;
        };
        return curve;
    }

    private makePoint(xyz: Xyz, color: string, size: number, fixed: boolean): JxgPoint3D {
        this.stats.createdElements++;
        const p = this.view!.create('point3d', [xyz[0], xyz[1], xyz[2]], {
            size, fillColor: color, strokeColor: '#ffffff', strokeWidth: 1, fixed, withLabel: false,
            highlight: false, showInfobox: false, layer: LAYER, name: '',
        }) as JxgPoint3D;
        return p;
    }

    private wirePoint(id: string, p: JxgPoint3D): void {
        p.element2D.on('down', () => {
            this.dragPointId = id;
            this.lastDragXyz = [p.X(), p.Y(), p.Z()];
            this.emit({kind: 'select', pointId: id});
            this.emit({kind: 'point', pointId: id, xyz: [...this.lastDragXyz], phase: 'start'});
        });
        p.element2D.on('up', () => {
            if (this.dragPointId !== id) return;
            this.dragPointId = null;
            this.emit({kind: 'point', pointId: id, xyz: [p.X(), p.Y(), p.Z()], phase: 'end'});
            this.lastDragXyz = null;
        });
    }

    /** Runs after every board update; while a point is dragged, reports its new place. */
    private onBoardUpdate(): void {
        if (this.disposed || !this.dragPointId || !this.draw) return;
        const p = this.draw.points.get(this.dragPointId);
        if (!p) return;
        const xyz: Xyz = [p.X(), p.Y(), p.Z()];
        const last = this.lastDragXyz;
        if (last && last[0] === xyz[0] && last[1] === xyz[1] && last[2] === xyz[2]) return;
        this.lastDragXyz = xyz;
        this.emit({kind: 'point', pointId: this.dragPointId, xyz: [...xyz], phase: 'move'});
    }

    private collectNodes(): void {
        const draw = this.draw!;
        const nodes: (SVGElement | null | undefined)[] = [];
        for (const el of draw.elements) nodes.push(((el as JxgCurve3D).element2D ?? (el as JxgElement)).rendNode);
        for (const m of draw.markers) nodes.push(m.element2D.rendNode);
        for (const p of this.scene!.points) nodes.push(draw.points.get(p.id)?.element2D.rendNode);
        draw.nodes = nodes;
    }

    /** Last projected screen coordinates of curve `index` as board user coordinates (JSXGraph's own redraw path). */
    private cachedCurve(index: number): [number[], number[]] {
        const pool = this.pool;
        if (!pool || this.sx.length === 0) return [[0], [0]];
        const idx = this.primitiveVertices(index);
        const hw = this.appliedWidth / 2, hh = this.appliedHeight / 2;
        return [idx.map(i => this.sx[i] - hw), idx.map(i => hh - this.sy[i])];
    }

    private primitiveVertices(index: number): number[] {
        const pool = this.pool!;
        const nTri = pool.tris.length / 3, nPlane = pool.planes.length / 4;
        if (index < nTri) {
            const t = index * 3;
            return [pool.tris[t], pool.tris[t + 1], pool.tris[t + 2], pool.tris[t]];
        }
        if (index < nTri + nPlane) {
            const q = (index - nTri) * 4;
            return [pool.planes[q], pool.planes[q + 1], pool.planes[q + 2], pool.planes[q + 3], pool.planes[q]];
        }
        const s = (index - nTri - nPlane) * 2;
        return [pool.segs[s], pool.segs[s + 1]];
    }

    /** Puts the 3D view onto the camera. Cheap when nothing but the angles changed. */
    private setCameraOnView(camera: SurfaceCamera, pool: Pool): void {
        const view = this.view!;
        const h = bboxHalfSide(camera.target, pool.min, pool.max);
        const t = camera.target;
        view.bbox3D = [[t[0] - h, t[0] + h], [t[1] - h, t[1] + h], [t[2] - h, t[2] + h]];
        view.r = viewRadiusFor(h, camera.distance);
        const m = makeCameraModel(camera, {width: this.width, height: this.height});
        view.az_slide.setValue(((m.jsxAz % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
        view.el_slide.setValue(m.jsxEl);
        view.needsUpdate = true;
    }

    private resizeBoard(): void {
        const board = this.board!, view = this.view as unknown as {size: number[]; llftCorner: number[]};
        const w = this.width, h = this.height;
        board.resizeContainer(w, h, true, true, true);
        board.setBoundingBox([-w / 2, h / 2, w / 2, -h / 2], false);
        view.size = [0.4 * w, 0.4 * h];
        view.llftCorner = [-0.2 * w, -0.2 * h];
        this.appliedWidth = w;
        this.appliedHeight = h;
    }

    /** One frame: view3d camera, per-strategy reprojection, painter's order. */
    private renderFrame(camera: SurfaceCamera): void {
        const board = this.board!, pool = this.pool!, draw = this.draw!, scene = this.scene!;
        if (this.appliedWidth !== this.width || this.appliedHeight !== this.height) this.resizeBoard();
        this.setCameraOnView(camera, pool);
        const model = makeCameraModel(camera, {width: this.width, height: this.height});
        // Only 3D elements (points, and curve3d in the view3d strategy) need to follow the view.
        const wasChanging = board._change3DView;
        board._change3DView = true;
        try {
            board.update();
        } finally {
            board._change3DView = wasChanging;
        }
        if (draw.nodes.length === 0 || draw.nodes.some(n => !n)) this.collectNodes();
        this.projectVertices(model);
        if (this.strategy === 'board2d') this.writePaths();
        this.sortAndReorder(model, scene);
    }

    private projectVertices(model: JsxCameraModel): void {
        const verts = this.pool!.verts;
        const n = verts.length / 3;
        if (this.vertexDepth.length !== n) {
            this.vertexDepth = new Float64Array(n);
            this.sx = new Float64Array(n);
            this.sy = new Float64Array(n);
        }
        const hw = this.width / 2, hh = this.height / 2;
        const project = this.strategy === 'board2d';
        for (let i = 0; i < n; i++) {
            const x = verts[3 * i], y = verts[3 * i + 1], z = verts[3 * i + 2];
            this.vertexDepth[i] = viewDepth(model, x, y, z);
            if (project) {
                const [bx, by] = projectToBoard(model, x, y, z);
                this.sx[i] = bx + hw;
                this.sy[i] = hh - by;
            }
        }
    }

    private writePaths(): void {
        const pool = this.pool!, nodes = this.draw!.nodes;
        const sx = this.sx, sy = this.sy;
        const f = (v: number): number => Math.round(v * 10) / 10;
        let e = 0;
        for (let t = 0; t < pool.tris.length; t += 3, e++) {
            const a = pool.tris[t], b = pool.tris[t + 1], c = pool.tris[t + 2];
            nodes[e]?.setAttribute('d', `M${f(sx[a])} ${f(sy[a])}L${f(sx[b])} ${f(sy[b])}L${f(sx[c])} ${f(sy[c])}Z`);
        }
        for (let q = 0; q < pool.planes.length; q += 4, e++) {
            const a = pool.planes[q], b = pool.planes[q + 1], c = pool.planes[q + 2], d = pool.planes[q + 3];
            nodes[e]?.setAttribute('d', `M${f(sx[a])} ${f(sy[a])}L${f(sx[b])} ${f(sy[b])}L${f(sx[c])} ${f(sy[c])}L${f(sx[d])} ${f(sy[d])}Z`);
        }
        for (let s = 0; s < pool.segs.length; s += 2, e++) {
            const a = pool.segs[s], b = pool.segs[s + 1];
            nodes[e]?.setAttribute('d', `M${f(sx[a])} ${f(sy[a])}L${f(sx[b])} ${f(sy[b])}`);
        }
    }

    private sortAndReorder(model: JsxCameraModel, scene: SurfaceScene): void {
        const pool = this.pool!, draw = this.draw!;
        const dv = this.vertexDepth;
        const nTri = pool.tris.length / 3, nPlane = pool.planes.length / 4, nSeg = pool.segs.length / 2;
        const total = nTri + nPlane + nSeg + scene.markers.length + scene.points.length;
        if (this.depths.length !== total) this.depths = new Float64Array(total);
        const d = this.depths;
        let e = 0;
        for (let t = 0; t < pool.tris.length; t += 3) d[e++] = (dv[pool.tris[t]] + dv[pool.tris[t + 1]] + dv[pool.tris[t + 2]]) / 3;
        for (let q = 0; q < pool.planes.length; q += 4) {
            d[e++] = (dv[pool.planes[q]] + dv[pool.planes[q + 1]] + dv[pool.planes[q + 2]] + dv[pool.planes[q + 3]]) / 4;
        }
        for (let s = 0; s < pool.segs.length; s += 2) d[e++] = (dv[pool.segs[s]] + dv[pool.segs[s + 1]]) / 2 - pool.lineBias;
        for (const m of scene.markers) d[e++] = viewDepth(model, m.xyz[0], m.xyz[1], m.xyz[2]) - pool.pointBias;
        for (const p of scene.points) d[e++] = viewDepth(model, p.xyz[0], p.xyz[1], p.xyz[2]) - 2 * pool.pointBias;
        const order = orderBackToFront(d);
        const parent = draw.nodes.find(n => n)?.parentNode;
        if (parent) this.stats.domMoves += applyDomOrder(draw.nodes, order, parent);
    }

    // ---- Input ---------------------------------------------------------------------------------------------------

    private emit(edit: SurfaceEdit): void {
        if (this.disposed) return;
        for (const l of [...this.editListeners]) l(edit);
    }

    private listen<K extends keyof HTMLElementEventMap>(
        target: HTMLElement, type: K, handler: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions,
    ): void {
        target.addEventListener(type, handler as EventListener, options);
        this.cleanups.push(() => target.removeEventListener(type, handler as EventListener, options));
    }

    private onPointerDown(e: PointerEvent): void {
        if (this.disposed || !this.scene || this.dragPointId) return;
        // JSXGraph handled the event first (its listener was registered first): a hit point is now in downObjects.
        if (this.board && this.board.downObjects.length > 0) return;
        this.orbitDrag = {id: e.pointerId, x: e.clientX, y: e.clientY, moved: false};
        this.container?.setPointerCapture?.(e.pointerId);
    }

    private onPointerMove(e: PointerEvent): void {
        const d = this.orbitDrag;
        if (this.disposed || !d || d.id !== e.pointerId || !this.scene || this.dragPointId) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < ORBIT_START_PX) return;
        d.moved = true;
        d.x = e.clientX;
        d.y = e.clientY;
        this.emit({kind: 'camera', camera: orbit(this.scene.camera, dx, dy)});
    }

    private onPointerEnd(e: PointerEvent): void {
        if (this.orbitDrag?.id === e.pointerId) {
            this.container?.releasePointerCapture?.(e.pointerId);
            this.orbitDrag = null;
        }
    }

    private onWheel(e: WheelEvent): void {
        if (this.disposed || !this.scene) return;
        e.preventDefault();
        this.emit({kind: 'camera', camera: zoom(this.scene.camera, Math.exp(e.deltaY * 0.001))});
    }

    private onKey(e: KeyboardEvent): void {
        if (this.disposed || !this.scene || e.altKey || e.ctrlKey || e.metaKey) return;
        const cam = this.scene.camera;
        let next: SurfaceCamera;
        switch (e.key) {
            case 'ArrowLeft': next = orbit(cam, KEY_STEP_PX, 0); break;
            case 'ArrowRight': next = orbit(cam, -KEY_STEP_PX, 0); break;
            case 'ArrowUp': next = orbit(cam, 0, KEY_STEP_PX); break;
            case 'ArrowDown': next = orbit(cam, 0, -KEY_STEP_PX); break;
            case '+': case '=': next = zoom(cam, 0.9); break;
            case '-': case '_': next = zoom(cam, 1 / 0.9); break;
            default: return;
        }
        e.preventDefault();
        this.emit({kind: 'camera', camera: next});
    }

    private applyAria(): void {
        const host = this.host;
        if (!host) return;
        if (this.ariaLabel) host.setAttribute('aria-label', this.ariaLabel);
        if (!this.description) return;
        if (!this.descriptionEl) {
            const span = document.createElement('span');
            span.id = `surface-view-keys-${++descriptionCounter}`;
            span.hidden = true;
            host.appendChild(span);
            this.descriptionEl = span;
            host.setAttribute('aria-describedby', span.id);
        }
        this.descriptionEl.textContent = this.description;
    }

    private restoreAttr(el: HTMLElement, name: string, value: string | null): void {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
    }

    // ---- Test and measurement access -----------------------------------------------------------------------------

    /** The board's element list length: tests assert that a camera change creates no elements. */
    get elementCount(): number {
        return this.board?.objectsList.length ?? 0;
    }

    get jsxBoard(): unknown {
        return this.board;
    }

    get jsxView(): unknown {
        return this.view;
    }
}
