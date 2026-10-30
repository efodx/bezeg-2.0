import {JSXGraph} from 'jsxgraph';
import {browserRasterServices, rasterizeBoard, type RasterServices} from './jsxCapture';
import {applyDomOrder, meanTriangleEdge, orderBackToFront, pieceCountStale, segmentPieceCount} from './jsxDepthOrder';
import {JsxInteraction} from './jsxInteraction';
import {computeLabelLayout, labelLayoutKey} from './jsxLabels';
import {JsxCameraModel, makeCameraModel, newScreenPoint, projectToScreen} from './jsxProjection';
import {RENDERED_OWNERS_ATTRIBUTE, renderedOwnerEvidence} from './jsxMeshOwners';
import {cssColor, DrawableStyle, markerColor, MESH_SEAM_WIDTH, MESH_STYLE, PLANE_STYLE, polylineStyle} from './jsxStyles';
import {bboxHalfSide, view3dAngles, view3dFrame, viewRadiusFor} from './jsxView3dMapping';
import {FOV_DEG, fitCameraTo} from './surfaceMath';
import {SURFACE_COLORS} from './surfaceStyles';
import {
    assertFiniteScene, AttachOptions, LabelLayout, PolylineRole, SurfaceCamera, SurfaceCapture, SurfaceEdit,
    SurfaceScene, SurfaceView, Xyz,
} from './surfaceScene';

/**
 * Feasibility-gate `SurfaceView` drawn with JSXGraph 1.14.1 (task 01 of docs/specs/jsxgraph-surface-view.md).
 *
 * Mesh triangles, planes and line segments are plain 2D `curve` elements: the adapter projects them itself
 * (`jsxProjection.ts`, the one projection also used for depth order) and writes their path. Control points and markers
 * are `point3d` elements of a central-projection `view3d` that is kept only so JSXGraph's built-in 3D point drag keeps
 * working; `jsxView3dMapping.ts` makes it coincide with the pure projection.
 * Elements are created once per topology and reused: a camera change reprojects, sorts and reorders the SVG nodes.
 * Labels (`jsxLabels.ts`, delivered through `onLayout`) and the still capture (`jsxCapture.ts`) are task 05; the label text itself
 * is typeset by the host overlay, not drawn on the board.
 */

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
interface JxgPoint3D {
    element2D: JxgElement & {coords: {usrCoords: number[]}; setAttribute: (attributes: object) => void};
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
    isVerticalDrag: () => boolean;
}
interface JxgBoard {
    create: (type: string, parents: unknown[], attributes: object) => unknown;
    update: () => void;
    suspendUpdate: () => void;
    unsuspendUpdate: () => void;
    removeObject: (element: unknown) => void;
    resizeContainer: (w: number, h: number, dontSet?: boolean, dontSetCss?: boolean, dontSetBoundingBox?: boolean) => void;
    setBoundingBox: (bbox: number[], keepAspect?: boolean) => void;
    on: (event: string, handler: () => void) => void;
    objectsList: unknown[];
    downObjects: unknown[];
    /** The elements that currently hold a pointer (mouse, pen or finger): `obj` is the dragged element. */
    touches: Array<{obj: unknown; targets: Array<{num: number}>}>;
    _change3DView?: boolean;
}

/** Control point fill: the Three view's palette, so a selection reads the same in both views. */
const pointColor = (selected: boolean | undefined): string => cssColor(selected ? SURFACE_COLORS.selected : SURFACE_COLORS.point);

const LAYER = 12;
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 480;

type Style = DrawableStyle;

/** Meshes with at least this many triangles (the 32-patch teapot at tiling 8 has 4096) orbit at reduced detail. */
const REDUCED_DETAIL_MIN_TRIANGLES = 1500;
/** While orbiting such a mesh, only every third triangle is drawn, the kept ones with a stroke that covers the gaps. */
const REDUCED_TRIANGLE_STRIDE = 3;
/** The camera counts as settled this long after the last camera-only change. */
const ORBIT_SETTLE_MS = 150;

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
    /** Pieces every polyline segment is drawn as (fixed with the topology, so a point drag only moves vertices). */
    pieces: number[];
    /** 1 for the first piece of a polyline segment, 0 for its continuations (dash phase restarts only at 1). */
    pieceStart: Uint8Array;
    /** Per interior split vertex: its pool index and the world segment it divides at fraction `t`. */
    splits: Array<{index: number; a: number; b: number; t: number}>;
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
    elements: JxgElement[];
    markers: JxgPoint3D[];
    points: Map<string, JxgPoint3D>;
}

let descriptionCounter = 0;

export class JsxSurfaceView implements SurfaceView {
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
    /** Dash cycle length per segment piece, read lazily from the node (see `dashPeriodOf`). */
    private dashPeriods: Array<{role: PolylineRole; period: number}> = [];
    /** Last `stroke-dashoffset` written per segment piece; the write is skipped while it does not change. */
    private dashOffsets: Array<number | undefined> = [];
    /** Segment lengths outgrew their piece counts during a point drag; the split is redone once the drag is over. */
    private resplitPending = false;
    private scene: SurfaceScene | null = null;
    private appliedKey = '';
    /** `pointSignature` of the scene the current board was built for. */
    private pointSig = '';
    /** Selection state each control point is currently styled with. */
    private readonly pointSelected = new Map<string, boolean>();
    private width = DEFAULT_WIDTH;
    private height = DEFAULT_HEIGHT;
    private appliedWidth = 0;
    private appliedHeight = 0;
    private dirty = false;
    private raf = 0;
    private disposed = false;
    /** What the last flush drew: the scene, its camera, and whether it was a reduced-detail orbit frame. */
    private appliedScene: SurfaceScene | null = null;
    private appliedCameraKey = '';
    private orbiting = false;
    private settleTimer: ReturnType<typeof setTimeout> | null = null;
    /** Detail state the triangle nodes carry; null after the node list was re-collected, so the next frame reapplies it. */
    private detailReduced: boolean | null = false;
    /** `draw.nodes` with the hidden triangles of a reduced frame left out (null); equals `draw.nodes` at full detail. */
    private orderNodes: (SVGElement | null | undefined)[] = [];
    private observer: ResizeObserver | null = null;
    private readonly editListeners = new Set<(edit: SurfaceEdit) => void>();
    private readonly layoutListeners = new Set<(labels: LabelLayout[]) => void>();
    /** Key of the layout last delivered to the listeners; empty until the first delivery. */
    private lastLayoutKey = '';
    private interaction: JsxInteraction | null = null;
    /** Sorted draw list scratch, reused between frames. */
    private depths = new Float64Array(0);
    private vertexDepth = new Float64Array(0);
    private sx = new Float64Array(0);
    private sy = new Float64Array(0);
    private readonly projected = newScreenPoint();
    /** Counters read by tests and the measurement harness. */
    readonly stats = {frames: 0, rebuilds: 0, domMoves: 0, createdElements: 0, drawn: 0, reducedFrames: 0, drawableRebuilds: 0};

    /** `rasterServices` replaces the browser's image decoder and canvas in tests. */
    constructor(private readonly rasterServices?: RasterServices) {}

    // ---- SurfaceView ---------------------------------------------------------------------------------------------

    async attach(host: HTMLElement, options: AttachOptions = {}): Promise<void> {
        if (this.disposed || this.host) return;
        this.host = host;
        this.ariaLabel = options.ariaLabel ?? this.ariaLabel;
        this.description = options.description ?? this.description;
        const container = document.createElement('div');
        container.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;position:relative;overflow:hidden;';
        container.setAttribute('data-jsx-surface-view', 'board2d');
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
        this.interaction = new JsxInteraction({
            container, keyTarget: host, scene: () => this.scene, pressedObjects: () => this.board?.downObjects ?? [],
            draggedObject: pointerId => this.board?.touches.find(touch => touch.targets.some(target => target.num === pointerId))?.obj,
            emit: edit => this.emit(edit), isDisposed: () => this.disposed,
        });
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
        const cameraOnly = this.isCameraOnly(scene);
        const cameraChanged = cameraOnly && this.cameraKey(scene.camera) !== this.appliedCameraKey;
        this.scene = scene;
        this.dirty = true;
        if (cameraOnly && this.container) {
            // Only the camera moved: reproject and reorder now (no frame of latency), nothing is rebuilt.
            if (this.raf) {
                cancelAnimationFrame(this.raf);
                this.raf = 0;
            }
            if (cameraChanged && this.pool && this.pool.tris.length / 3 >= REDUCED_DETAIL_MIN_TRIANGLES) this.beginOrbit();
            this.flush();
            return;
        }
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
        // A new subscriber has seen no layout yet: the next frame delivers the current one.
        this.lastLayoutKey = '';
        return () => this.layoutListeners.delete(listener);
    }

    /** The depth-correct board as a PNG with the label layout of that frame; see `jsxCapture.ts` for why it cannot taint. */
    async capture(): Promise<SurfaceCapture> {
        const svg = this.container?.querySelector('svg');
        if (this.disposed || !this.scene || !svg) throw new Error('Surface view is not attached');
        // A figure is always drawn at full detail, even in the middle of an orbit.
        this.endOrbit();
        this.dirty = true;
        this.flush();
        const size = {width: this.width, height: this.height};
        const dataUrl = await rasterizeBoard(svg, size, this.rasterServices ?? browserRasterServices());
        if (this.disposed) throw new Error('Surface view is not attached');
        return {dataUrl, ...size, labels: computeLabelLayout(this.appliedScene ?? this.scene, size)};
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
        this.interaction?.dispose();
        this.interaction = null;
        this.observer?.disconnect();
        this.observer = null;
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
        this.clearSettleTimer();
        this.host?.removeAttribute(RENDERED_OWNERS_ATTRIBUTE);
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
        this.appliedScene = null;
        this.pool = null;
    }

    // ---- Rendering -----------------------------------------------------------------------------------------------

    /** Draws now if anything changed. Tests call it directly; the browser path is the coalesced animation frame. */
    flush(): void {
        // A direct call (tests, capture) leaves the queued frame behind: cancel it so it cannot outlive dispose.
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
        if (this.disposed || !this.container || !this.scene || !this.dirty) return;
        this.dirty = false;
        const scene = this.scene;
        const geometryKey = this.geometryKey(scene);
        let cameraOnly = false;
        if (!this.board || this.pointSig !== this.pointSignature(scene)) {
            this.rebuild(scene);
        } else if (this.pool?.signature !== this.topologySignature(scene)) {
            this.rebuildDrawables(scene);
        } else if (geometryKey !== this.appliedKey) {
            this.updateGeometry(scene);
        } else if (this.resplitPending && !this.interaction?.draggedPointId) {
            this.updateGeometry(scene);
        } else {
            cameraOnly = true;
        }
        // Reduced detail only ever serves a camera-only orbit frame; any other frame is drawn in full.
        if (!cameraOnly) this.endOrbit();
        const reduced = cameraOnly && this.orbiting;
        this.appliedKey = geometryKey;
        this.appliedScene = scene;
        this.appliedCameraKey = this.cameraKey(scene.camera);
        if (!cameraOnly) this.publishOwners(scene);
        this.renderFrame(scene.camera, reduced);
        this.stats.frames++;
        if (reduced) this.stats.reducedFrames++;
        this.publishLayout(scene);
    }

    /** Tells the layout listeners about the layout of the frame just drawn, when it differs from the last one delivered. */
    private publishLayout(scene: SurfaceScene): void {
        if (this.layoutListeners.size === 0) return;
        const labels = computeLabelLayout(scene, {width: this.width, height: this.height});
        const key = labelLayoutKey(labels);
        if (key === this.lastLayoutKey) return;
        this.lastLayoutKey = key;
        for (const listener of [...this.layoutListeners]) listener(labels);
    }

    private cameraKey(c: SurfaceCamera): string {
        return `${c.az},${c.el},${c.distance},${c.target.join(',')}`;
    }

    /** True when `scene` differs from the last drawn one at most in its camera (and nothing is pending but a redraw). */
    private isCameraOnly(scene: SurfaceScene): boolean {
        const prev = this.appliedScene;
        if (!this.board || !this.pool || !prev) return false;
        if (prev.revision === scene.revision && prev.points === scene.points && prev.markers === scene.markers
            && prev.polylines === scene.polylines && prev.mesh === scene.mesh && prev.planes === scene.planes
            && prev.interaction.editable === scene.interaction.editable) return true;
        return this.pool.signature === this.topologySignature(scene) && this.appliedKey === this.geometryKey(scene);
    }

    private beginOrbit(): void {
        this.orbiting = true;
        this.clearSettleTimer();
        this.settleTimer = setTimeout(() => {
            this.settleTimer = null;
            if (this.disposed) return;
            this.orbiting = false;
            this.dirty = true;
            this.flush();
        }, ORBIT_SETTLE_MS);
    }

    private endOrbit(): void {
        this.orbiting = false;
        this.clearSettleTimer();
    }

    private clearSettleTimer(): void {
        if (this.settleTimer !== null) clearTimeout(this.settleTimer);
        this.settleTimer = null;
    }

    private publishOwners(scene: SurfaceScene): void {
        const host = this.host;
        if (!host) return;
        const owners = scene.mesh?.visible && scene.meshOwners?.length ? renderedOwnerEvidence(scene.mesh, scene.meshOwners) : [];
        if (owners.length === 0) host.removeAttribute(RENDERED_OWNERS_ATTRIBUTE);
        else host.setAttribute(RENDERED_OWNERS_ATTRIBUTE, JSON.stringify(owners));
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

    /** What the persistent `point3d` elements (control points, markers) depend on; a change needs a new board. */
    private pointSignature(scene: SurfaceScene): string {
        return [scene.markers.map(m => `${m.id}:${m.role}`).join(','), scene.points.map(p => p.id).join(','), scene.interaction.editable ? 'e' : 'r'].join('|');
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
        const frame = view3dFrame({width: w, height: h});
        const view = board.create('view3d', [frame.llftCorner, frame.size, [[-1, 1], [-1, 1], [-1, 1]]], {
            projection: 'central', fov: (FOV_DEG * Math.PI) / 180, axesPosition: 'none',
            xPlaneRear: {visible: false}, yPlaneRear: {visible: false}, zPlaneRear: {visible: false},
            xPlaneFront: {visible: false}, yPlaneFront: {visible: false}, zPlaneFront: {visible: false},
            trackball: {enabled: false}, depthOrder: {enabled: false},
            // Shift drags a control point along z; JsxInteraction.bindView adds the scene's z-mode switch (touch has no Shift).
            verticalDrag: {enabled: true, key: 'shift'},
            az: {pointer: {enabled: false}, keyboard: {enabled: false}, slider: {visible: false, min: 0, max: 2 * Math.PI, start: 0}},
            el: {pointer: {enabled: false}, keyboard: {enabled: false}, slider: {visible: false, min: -Math.PI / 2, max: Math.PI / 2, start: 0}},
            bank: {pointer: {enabled: false}, keyboard: {enabled: false}, slider: {visible: false, min: -Math.PI, max: Math.PI, start: 0}},
        }) as JxgView3D;
        this.view = view;
        this.appliedWidth = w;
        this.appliedHeight = h;
        this.interaction?.bindView(view);
        board.on('update', () => this.interaction?.onBoardUpdate());
    }

    private rebuild(scene: SurfaceScene): void {
        // A press on a point cannot outlive its board: close the gesture with the last place the point had.
        this.interaction?.endDrag();
        this.destroyBoard();
        this.pointSelected.clear();
        this.createBoard();
        const board = this.board!, view = this.view!;
        const pool = this.buildPool(scene);
        this.pool = pool;
        const draw: Drawables = {nodes: [], elements: [], markers: [], points: new Map()};
        this.draw = draw;
        // New nodes are all visible.
        this.detailReduced = false;
        // Positions first, so the elements are created at their final place; the first frame then only reorders.
        this.setCameraOnView(scene.camera, pool);
        board.suspendUpdate();
        this.createDrawables(pool, draw);
        for (const marker of scene.markers) {
            draw.markers.push(this.makePoint(marker.xyz, markerColor(marker.role), 3, true));
        }
        for (const point of scene.points) {
            const p3 = this.makePoint(point.xyz, pointColor(point.selected), 4, !scene.interaction.editable);
            draw.points.set(point.id, p3);
            this.pointSelected.set(point.id, point.selected === true);
            this.interaction?.wirePoint(point.id, p3, p3.element2D);
        }
        board.unsuspendUpdate();
        this.stats.rebuilds++;
        this.pointSig = this.pointSignature(scene);
        this.collectNodes();
        this.appliedKey = '';
        view.needsUpdate = true;
    }

    private createDrawables(pool: Pool, draw: Drawables): void {
        for (let t = 0; t < pool.tris.length; t += 3) draw.elements.push(this.makeDrawable(MESH_STYLE));
        for (let q = 0; q < pool.planes.length; q += 4) draw.elements.push(this.makeDrawable(PLANE_STYLE));
        for (let s = 0; s < pool.segs.length; s += 2) draw.elements.push(this.makeDrawable(polylineStyle(pool.segRoles[s / 2])));
    }

    /**
     * Mesh, plane or polyline topology changed but the control points and markers did not (selecting a point adds its
     * highlighted row and column): swap the 2D curves and keep the board and every `point3d`. A new board would end a
     * running point drag, because JSXGraph holds the pressed element of the old one.
     */
    private rebuildDrawables(scene: SurfaceScene): void {
        const board = this.board!, view = this.view!, draw = this.draw!;
        const pool = this.buildPool(scene);
        this.pool = pool;
        this.detailReduced = false;
        this.setCameraOnView(scene.camera, pool);
        board.suspendUpdate();
        for (const el of draw.elements) board.removeObject(el);
        draw.elements = [];
        this.createDrawables(pool, draw);
        this.syncPoints(scene);
        board.unsuspendUpdate();
        this.stats.drawableRebuilds++;
        this.collectNodes();
        this.appliedKey = '';
        view.needsUpdate = true;
    }

    /**
     * Writes the scene's marker and control point places onto the `point3d` elements. The point being dragged is left
     * where JSXGraph has it: the scene lags the pointer by the edits still in flight, and moving it back would tear the
     * point away from the pointer (the next `move` edit brings the scene up to it).
     */
    private syncPoints(scene: SurfaceScene): void {
        const draw = this.draw!, dragged = this.interaction?.draggedPointId;
        scene.markers.forEach((m, i) => draw.markers[i].setPosition(m.xyz));
        for (const p of scene.points) {
            const point = draw.points.get(p.id);
            if (!point) continue;
            if (p.id !== dragged) point.setPosition(p.xyz);
            // Selection is a style change on the existing element: it must not touch the point under the pointer.
            if (this.pointSelected.get(p.id) !== (p.selected === true)) {
                this.pointSelected.set(p.id, p.selected === true);
                point.element2D.setAttribute({fillColor: pointColor(p.selected)});
            }
        }
    }

    private buildPool(scene: SurfaceScene, fixedPieces?: number[]): Pool {
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
        // Every segment is split at mesh resolution (see `segmentPieceCount`); the interior vertices follow the planes.
        const meshEdge = fixedPieces ? 0 : mesh ? meanTriangleEdge(mesh.positions, mesh.faces) : 0;
        const pieces: number[] = fixedPieces ?? [];
        const splits: Pool['splits'] = [];
        let segment = 0;
        scene.polylines.forEach((l, i) => {
            for (let j = 0; j + 1 < l.points.length; j++, segment++) {
                if (!fixedPieces) {
                    const p = l.points[j], q = l.points[j + 1];
                    pieces.push(segmentPieceCount(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), meshEdge));
                }
                for (let p = 1; p < pieces[segment]; p++) {
                    splits.push({index: count++, a: polylineBase[i] + j, b: polylineBase[i] + j + 1, t: p / pieces[segment]});
                }
            }
        });
        const verts = new Float64Array(count * 3);
        if (mesh) for (let i = 0; i < mesh.positions.length; i++) verts[i] = mesh.positions[i];
        scene.polylines.forEach((l, i) => l.points.forEach((p, j) => verts.set(p, 3 * (polylineBase[i] + j))));
        (scene.planes ?? []).forEach((plane, i) => plane.corners.forEach((p, j) => verts.set(p, 3 * (planeBase + 4 * i + j))));
        for (const sp of splits) {
            for (let k = 0; k < 3; k++) verts[3 * sp.index + k] = verts[3 * sp.a + k] + sp.t * (verts[3 * sp.b + k] - verts[3 * sp.a + k]);
        }
        const segs: number[] = [];
        const segRoles: PolylineRole[] = [];
        const starts: number[] = [];
        let splitAt = 0;
        segment = 0;
        scene.polylines.forEach((l, i) => {
            for (let j = 0; j + 1 < l.points.length; j++, segment++) {
                let from = polylineBase[i] + j;
                for (let p = 1; p < pieces[segment]; p++) {
                    segs.push(from, splits[splitAt].index);
                    from = splits[splitAt++].index;
                    segRoles.push(l.role);
                    starts.push(p === 1 ? 1 : 0);
                }
                segs.push(from, polylineBase[i] + j + 1);
                segRoles.push(l.role);
                starts.push(pieces[segment] === 1 ? 1 : 0);
            }
        });
        const pieceStart = Uint8Array.from(starts);
        const planes = new Uint32Array((scene.planes?.length ?? 0) * 4);
        for (let i = 0; i < planes.length; i++) planes[i] = planeBase + i;
        const pool: Pool = {
            signature: this.topologySignature(scene), verts, tris: Uint32Array.from(mesh?.faces ?? []), planes,
            segs: Uint32Array.from(segs), segRoles, polylineBase, pieces, splits, pieceStart,
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
        const pool = this.pool!;
        // Piece counts follow segment lengths; re-splitting replaces drawables, so never under a dragged point.
        if (this.piecesStale(scene)) {
            if (!this.interaction?.draggedPointId) {
                this.resplitPending = false;
                this.rebuildDrawables(scene);
                return;
            }
            this.resplitPending = true;
        } else {
            this.resplitPending = false;
        }
        const fresh = this.buildPool(scene, pool.pieces);
        pool.verts = fresh.verts;
        pool.min = fresh.min;
        pool.max = fresh.max;
        pool.lineBias = fresh.lineBias;
        pool.pointBias = fresh.pointBias;
        this.syncPoints(scene);
        if (this.view) this.view.needsUpdate = true;
    }

    /** True when some polyline segment's piece count no longer suits its current length against the mesh edge. */
    private piecesStale(scene: SurfaceScene): boolean {
        const pieces = this.pool!.pieces, mesh = scene.mesh?.visible ? scene.mesh : undefined;
        if (!mesh || pieces.length === 0) return false;
        const meshEdge = meanTriangleEdge(mesh.positions, mesh.faces);
        let segment = 0;
        for (const l of scene.polylines) {
            for (let j = 0; j + 1 < l.points.length; j++, segment++) {
                const p = l.points[j], q = l.points[j + 1];
                if (pieceCountStale(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), meshEdge, pieces[segment])) return true;
            }
        }
        return false;
    }

    private makeDrawable(style: Style): JxgElement {
        const attributes = {
            strokeColor: style.stroke, strokeWidth: style.width, fillColor: style.fill ?? 'none',
            fillOpacity: style.fillOpacity ?? 0, highlight: false, fixed: true, layer: LAYER, visible: true,
            withLabel: false, dash: style.dash,
        };
        this.stats.createdElements++;
        // A 2D curve whose path the adapter writes itself; JSXGraph only hosts the SVG node and
        // regenerates it from the cached projection if it ever redraws the curve on its own.
        const curve = this.board!.create('curve', [[0], [0]], attributes) as JxgElement;
        // Segments of one polyline meet end to end; round caps close the notches between them.
        if (!style.fill) curve.rendNode?.setAttribute('stroke-linecap', 'round');
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

    private collectNodes(): void {
        const draw = this.draw!;
        const nodes: (SVGElement | null | undefined)[] = [];
        for (const el of draw.elements) nodes.push(el.rendNode);
        for (const m of draw.markers) nodes.push(m.element2D.rendNode);
        for (const p of this.scene!.points) nodes.push(draw.points.get(p.id)?.element2D.rendNode);
        draw.nodes = nodes;
        this.orderNodes = nodes;
        this.dashPeriods = [];
        this.dashOffsets = [];
        this.detailReduced = null;
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
        const angles = view3dAngles(camera);
        view.az_slide.setValue(angles.az);
        view.el_slide.setValue(angles.el);
        view.needsUpdate = true;
    }

    private resizeBoard(): void {
        const board = this.board!, view = this.view as unknown as {size: number[]; llftCorner: number[]};
        const w = this.width, h = this.height;
        board.resizeContainer(w, h, true, true, true);
        board.setBoundingBox([-w / 2, h / 2, w / 2, -h / 2], false);
        const frame = view3dFrame({width: w, height: h});
        view.size = frame.size;
        view.llftCorner = frame.llftCorner;
        this.appliedWidth = w;
        this.appliedHeight = h;
    }

    /** One frame: view3d camera, reprojection, painter's order. */
    private renderFrame(camera: SurfaceCamera, reduced: boolean): void {
        const board = this.board!, pool = this.pool!, draw = this.draw!, scene = this.scene!;
        if (this.appliedWidth !== this.width || this.appliedHeight !== this.height) this.resizeBoard();
        this.setCameraOnView(camera, pool);
        const model = makeCameraModel(camera, {width: this.width, height: this.height});
        // Only the 3D points and markers need to follow the view.
        const wasChanging = board._change3DView;
        board._change3DView = true;
        try {
            board.update();
        } finally {
            board._change3DView = wasChanging;
        }
        if (draw.nodes.length === 0 || draw.nodes.some(n => !n)) this.collectNodes();
        this.projectVertices(model);
        this.applyDetail(reduced);
        this.writePaths();
        this.sortAndReorder(model, scene);
    }

    /**
     * Switches the triangles between full and reduced detail (only the node state is touched, and only on a switch):
     * reduced hides all but every third triangle and widens the kept ones' outline in the facet colour to about one
     * projected edge, so the surface stays closed while it orbits.
     */
    private applyDetail(reduced: boolean): void {
        if (reduced === this.detailReduced) return;
        const pool = this.pool!, nodes = this.draw!.nodes;
        const nTri = pool.tris.length / 3;
        let seam = MESH_SEAM_WIDTH;
        if (reduced) {
            let edge = 0, n = 0;
            for (let t = 0; t < nTri; t += REDUCED_TRIANGLE_STRIDE * 8) {
                const a = pool.tris[3 * t], b = pool.tris[3 * t + 1];
                edge += Math.hypot(this.sx[a] - this.sx[b], this.sy[a] - this.sy[b]);
                n++;
            }
            seam = Math.min(14, Math.max(MESH_SEAM_WIDTH, n ? edge / n : MESH_SEAM_WIDTH));
        }
        for (let t = 0; t < nTri; t++) {
            const node = nodes[t];
            if (!node) continue;
            if (reduced && t % REDUCED_TRIANGLE_STRIDE !== 0) {
                node.setAttribute('display', 'none');
            } else {
                node.removeAttribute('display');
                node.setAttribute('stroke-width', String(seam));
                if (reduced) node.setAttribute('stroke-linejoin', 'round');
                else node.removeAttribute('stroke-linejoin');
            }
        }
        this.orderNodes = reduced ? nodes.map((n, i) => (i < nTri && i % REDUCED_TRIANGLE_STRIDE !== 0 ? null : n)) : nodes;
        this.detailReduced = reduced;
    }

    private projectVertices(model: JsxCameraModel): void {
        const verts = this.pool!.verts;
        const n = verts.length / 3;
        if (this.vertexDepth.length !== n) {
            this.vertexDepth = new Float64Array(n);
            this.sx = new Float64Array(n);
            this.sy = new Float64Array(n);
        }
        const out = this.projected;
        for (let i = 0; i < n; i++) {
            projectToScreen(model, verts[3 * i], verts[3 * i + 1], verts[3 * i + 2], out);
            this.vertexDepth[i] = out.depth;
            this.sx[i] = out.x;
            this.sy[i] = out.y;
        }
    }

    /** Length of one dash cycle of the segment piece's node (0 for a solid line); read once from the node. */
    private dashPeriodOf(piece: number, node: SVGElement | null | undefined): number {
        const role = this.pool!.segRoles[piece];
        let entry = this.dashPeriods[piece];
        // Keyed by the piece's role (which picks its style): a piece restyled without a rebuild is read again.
        if (!entry || entry.role !== role) {
            this.dashOffsets[piece] = undefined;
            const values = (node?.getAttribute('stroke-dasharray') ?? '').split(/[ ,]+/).map(Number).filter(v => Number.isFinite(v) && v > 0);
            const cycle = values.reduce((a, b) => a + b, 0);
            entry = {role, period: values.length % 2 ? 2 * cycle : cycle};
            this.dashPeriods[piece] = entry;
        }
        return entry.period;
    }

    private writePaths(): void {
        const pool = this.pool!, nodes = this.draw!.nodes;
        const sx = this.sx, sy = this.sy;
        const f = (v: number): number => Math.round(v * 10) / 10;
        let e = 0;
        const stride = this.detailReduced ? REDUCED_TRIANGLE_STRIDE : 1;
        this.stats.drawn = 0;
        for (let t = 0; t < pool.tris.length; t += 3, e++) {
            if (e % stride !== 0) continue;
            this.stats.drawn++;
            const a = pool.tris[t], b = pool.tris[t + 1], c = pool.tris[t + 2];
            nodes[e]?.setAttribute('d', `M${f(sx[a])} ${f(sy[a])}L${f(sx[b])} ${f(sy[b])}L${f(sx[c])} ${f(sy[c])}Z`);
        }
        for (let q = 0; q < pool.planes.length; q += 4, e++) {
            this.stats.drawn++;
            const a = pool.planes[q], b = pool.planes[q + 1], c = pool.planes[q + 2], d = pool.planes[q + 3];
            nodes[e]?.setAttribute('d', `M${f(sx[a])} ${f(sy[a])}L${f(sx[b])} ${f(sy[b])}L${f(sx[c])} ${f(sy[c])}L${f(sx[d])} ${f(sy[d])}Z`);
        }
        let phase = 0;
        for (let s = 0; s < pool.segs.length; s += 2, e++) {
            this.stats.drawn++;
            const a = pool.segs[s], b = pool.segs[s + 1];
            const node = nodes[e];
            node?.setAttribute('d', `M${f(sx[a])} ${f(sy[a])}L${f(sx[b])} ${f(sy[b])}`);
            // Pieces of one segment continue its dash pattern instead of each restarting it.
            const piece = s / 2;
            if (pool.pieceStart[piece]) phase = 0;
            const period = this.dashPeriodOf(piece, node);
            if (period > 0) {
                const offset = f(phase % period);
                if (this.dashOffsets[piece] !== offset) {
                    this.dashOffsets[piece] = offset;
                    node?.setAttribute('stroke-dashoffset', String(offset));
                }
            }
            phase += Math.hypot(sx[b] - sx[a], sy[b] - sy[a]);
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
        for (const m of scene.markers) d[e++] = projectToScreen(model, m.xyz[0], m.xyz[1], m.xyz[2], this.projected).depth - pool.pointBias;
        for (const p of scene.points) d[e++] = projectToScreen(model, p.xyz[0], p.xyz[1], p.xyz[2], this.projected).depth - 2 * pool.pointBias;
        const order = orderBackToFront(d);
        const parent = draw.nodes.find(n => n)?.parentNode;
        if (parent) this.stats.domMoves += applyDomOrder(this.orderNodes, order, parent);
    }

    // ---- Input ---------------------------------------------------------------------------------------------------

    private emit(edit: SurfaceEdit): void {
        if (this.disposed) return;
        for (const l of [...this.editListeners]) l(edit);
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
