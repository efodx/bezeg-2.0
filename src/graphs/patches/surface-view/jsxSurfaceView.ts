import {JSXGraph} from 'jsxgraph';
import {browserRasterServices, rasterizeBoard, type RasterServices} from './jsxCapture';
import {meanTriangleEdge, orderBackToFront, pieceCountStale, segmentPieceCount} from './jsxDepthOrder';
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
 * Mesh triangles, planes and line segments are plain SVG `polygon` and `polyline` nodes that the adapter owns: it creates
 * them in JSXGraph's SVG layer group, projects them itself (`jsxProjection.ts`, the one projection also used for depth
 * order) and writes their `points` (an SVG path `d` is a CSS property, so every write costs a style recalculation; `points`
 * costs none). Control points and markers
 * are `point3d` elements of a central-projection `view3d` that is kept only so JSXGraph's built-in 3D point drag keeps
 * working; `jsxView3dMapping.ts` makes it coincide with the pure projection.
 * Elements are created once per topology and reused: a camera change reprojects, sorts and reorders the SVG nodes.
 * Labels (`jsxLabels.ts`, delivered through `onLayout`) and the still capture (`jsxCapture.ts`) are task 05; the label text itself
 * is typeset by the host overlay, not drawn on the board.
 */

/** The slice of JSXGraph's untyped 3D API that this adapter uses. */
interface JxgElement {
    rendNode?: SVGElement;
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
    /** The SVG renderer; `layer[n]` is the group that holds the elements of layer n, in painter's order. */
    renderer: {layer: SVGElement[]};
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
const SVG_NS = 'http://www.w3.org/2000/svg';

function roundTenth(v: number): number {
    return Math.round(v * 10) / 10;
}
/** JSXGraph's `dash` index patterns (`AbstractRenderer.dashArray`; `dashScale` is off, so they are used unscaled). */
const DASH_ARRAYS: ReadonlyArray<readonly number[]> = [[2, 2], [5, 5], [10, 10], [20, 20], [20, 10, 10, 10], [20, 5, 10, 5], [0, 5]];

type Style = DrawableStyle;

/** Length of one dash cycle of a style, in the units of `stroke-dashoffset` (0 for a solid line); an odd pattern repeats mirrored. */
function dashPeriod(style: Style): number {
    if (style.dash <= 0) return 0;
    const values = DASH_ARRAYS[style.dash - 1].filter(v => v > 0);
    const cycle = values.reduce((a, b) => a + b, 0);
    return values.length % 2 ? 2 * cycle : cycle;
}

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
    /**
     * Triangles, planes, segments, markers, points in the draw-list layout. A drawable's entry is the slot that shows it
     * in the latest frame (hidden reduced-detail drawables map to hidden slots); markers and points are their ellipses.
     */
    nodes: (SVGElement | null | undefined)[];
    /**
     * The slots: SVG `polyline` nodes this view created, one per triangle, plane and segment piece. They keep their DOM
     * positions for good; a frame hands the k-th drawable of the painter's order to slot k by writing its geometry (and
     * its style where the slot's differs). Removed with the drawables.
     */
    elements: SVGElement[];
    /** An always hidden slot after the others: the anchor for point nodes that paint after every drawable. */
    tail: SVGElement;
    /** Style of every drawable (triangle, plane, piece order) and the dash cycle length of every segment piece (0 = solid). */
    styles: Style[];
    periods: Float64Array;
    /** What each slot currently carries, so a frame writes only what differs (a style attribute write restyles the node). */
    slotStyle: (Style | null)[];
    /** The filled style whose fill and fill opacity the slot last got (the slot starts with no fill). */
    slotFill: (Style | null)[];
    slotWidth: Float64Array;
    /** `stroke-dashoffset` of the slot; NaN = attribute absent. */
    slotOffset: Float64Array;
    slotShown: Uint8Array;
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
    /** Dash phase (`stroke-dashoffset`) of every segment piece this frame; NaN for a solid piece. Belongs to the drawable. */
    private pieceOffset = new Float64Array(0);
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
    /**
     * While reduced: per segment piece, how many consecutive pieces of its segment the piece's node draws as one line
     * (0 = the piece is covered by the run before it and hidden). Null at full detail.
     */
    private pieceRun: Uint8Array | null = null;
    /** 1 for every drawable a reduced frame leaves out (hidden triangles and covered pieces); null at full detail. */
    private hidden: Uint8Array | null = null;
    /** Outline width of the mesh triangles in the current detail state. */
    private seam = MESH_SEAM_WIDTH;
    /** Scratch: this frame's point and marker ellipses in paint order, each with the count of drawables painted before it. */
    private ellipses: Node[] = [];
    private ellipseRank: number[] = [];
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
    readonly stats = {frames: 0, rebuilds: 0, domMoves: 0, createdElements: 0, drawn: 0, reducedFrames: 0, drawableRebuilds: 0, slotRestyles: 0};

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
        // Only the camera moved: the next frame reprojects and reorders, nothing is rebuilt. Drawing inside the input event
        // instead was measured (03D): it showed no frame sooner and blocked the event task for the whole draw.
        if (cameraOnly && this.container && cameraChanged && this.pool && this.pool.tris.length / 3 >= REDUCED_DETAIL_MIN_TRIANGLES) this.beginOrbit();
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
        for (const node of this.draw?.elements ?? []) node.remove();
        this.draw?.tail.remove();
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
        const draw: Drawables = {nodes: [], markers: [], points: new Map(), ...this.createSlots(pool)};
        this.draw = draw;
        // New nodes are all visible.
        this.detailReduced = false;
        // Positions first, so the elements are created at their final place; the first frame then only reorders.
        this.setCameraOnView(scene.camera, pool);
        board.suspendUpdate();
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

    /** One slot per drawable (triangles, planes, segment pieces, in that order) plus the hidden tail slot. */
    private createSlots(pool: Pool): Pick<Drawables, 'elements' | 'tail' | 'styles' | 'periods' | 'slotStyle' | 'slotFill' | 'slotWidth' | 'slotOffset' | 'slotShown'> {
        const styles: Style[] = [];
        for (let t = 0; t < pool.tris.length; t += 3) styles.push(MESH_STYLE);
        for (let q = 0; q < pool.planes.length; q += 4) styles.push(PLANE_STYLE);
        const periods = new Float64Array(pool.segs.length / 2);
        for (let s = 0; s < pool.segs.length; s += 2) {
            const style = polylineStyle(pool.segRoles[s / 2]);
            styles.push(style);
            periods[s / 2] = dashPeriod(style);
        }
        const elements: SVGElement[] = [];
        for (let i = 0; i < styles.length; i++) elements.push(this.makeSlot());
        const tail = this.makeSlot();
        tail.setAttribute('display', 'none');
        return {
            elements, tail, styles, periods, slotStyle: styles.map(() => null), slotFill: styles.map(() => null),
            slotWidth: new Float64Array(styles.length).fill(NaN), slotOffset: new Float64Array(styles.length).fill(NaN),
            slotShown: new Uint8Array(styles.length).fill(1),
        };
    }

    /**
     * Mesh, plane or polyline topology changed but the control points and markers did not (selecting a point adds its
     * highlighted row and column): swap the SVG nodes and keep the board and every `point3d`. A new board would end a
     * running point drag, because JSXGraph holds the pressed element of the old one.
     */
    private rebuildDrawables(scene: SurfaceScene): void {
        const board = this.board!, view = this.view!, draw = this.draw!;
        const pool = this.buildPool(scene);
        this.pool = pool;
        this.detailReduced = false;
        this.setCameraOnView(scene.camera, pool);
        board.suspendUpdate();
        for (const el of draw.elements) el.remove();
        draw.tail.remove();
        Object.assign(draw, this.createSlots(pool));
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

    /**
     * One adapter-owned SVG node in the board's drawable layer. It starts bare: `styleSlot` gives it the colour, width,
     * fill, dash pattern and pointer behaviour of the drawable it shows (styled as JSXGraph styled the `curve` it replaces,
     * round caps and joins); `writeDrawable` writes its geometry. Triangles and planes are closed polylines (the first
     * point is repeated), which fill and join like a polygon.
     */
    private makeSlot(): SVGElement {
        this.stats.createdElements++;
        const layer = this.board!.renderer.layer[LAYER];
        const node = layer.ownerDocument.createElementNS(SVG_NS, 'polyline');
        const attributes: Record<string, string> = {
            'stroke-opacity': '1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'fill-rule': 'evenodd', tabindex: '-1',
            // Painted fill or stroke: a line has no fill, so this is the same as its stroke alone.
            'pointer-events': 'visiblePainted', fill: 'none',
        };
        for (const name in attributes) node.setAttribute(name, attributes[name]);
        layer.appendChild(node);
        return node;
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
        for (const el of draw.elements) nodes.push(el);
        for (const m of draw.markers) nodes.push(m.element2D.rendNode);
        for (const p of this.scene!.points) nodes.push(draw.points.get(p.id)?.element2D.rendNode);
        draw.nodes = nodes;
        this.detailReduced = null;
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
        this.paint(model, scene);
    }

    /**
     * Switches between full and reduced detail (only the node state is touched, and only on a switch). Reduced hides all
     * but every third triangle and widens the kept ones' outline in the facet colour to about one projected edge, so the
     * surface stays closed while it orbits; it also draws runs of up to REDUCED_TRIANGLE_STRIDE consecutive pieces of a
     * line segment as one line (the first piece's node), hiding the others.
     */
    private applyDetail(reduced: boolean): void {
        if (reduced === this.detailReduced) return;
        const pool = this.pool!, draw = this.draw!;
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
        this.seam = seam;
        const pieceBase = nTri + pool.planes.length / 4;
        const runs = reduced ? this.segmentRuns() : null;
        this.pieceRun = runs;
        if (!runs) {
            this.hidden = null;
        } else {
            const hidden = new Uint8Array(draw.styles.length);
            for (let t = 0; t < nTri; t++) hidden[t] = t % REDUCED_TRIANGLE_STRIDE !== 0 ? 1 : 0;
            for (let piece = 0; piece < runs.length; piece++) hidden[pieceBase + piece] = runs[piece] === 0 ? 1 : 0;
            this.hidden = hidden;
            // Drawn drawables take the first slots in a frame; the hidden ones stay on the slots after them, hidden once.
            let slot = 0;
            for (let i = 0; i < hidden.length; i++) if (!hidden[i]) slot++;
            for (let i = 0; i < hidden.length; i++) {
                if (!hidden[i]) continue;
                draw.nodes[i] = draw.elements[slot];
                if (draw.slotShown[slot]) {
                    draw.elements[slot].setAttribute('display', 'none');
                    draw.slotShown[slot] = 0;
                }
                slot++;
            }
        }
        this.detailReduced = reduced;
    }

    /** Reduced-detail runs: per piece, the number of consecutive pieces of its segment it draws (0 = covered by an earlier piece). */
    private segmentRuns(): Uint8Array {
        const start = this.pool!.pieceStart;
        const runs = new Uint8Array(start.length);
        let head = -1;
        for (let piece = 0; piece < start.length; piece++) {
            if (start[piece] || head < 0 || runs[head] >= REDUCED_TRIANGLE_STRIDE) head = piece;
            runs[head]++;
        }
        return runs;
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

    /** Dash phase of every segment piece: continues along its segment, restarts at the segment's first piece. */
    private computePieceOffsets(): void {
        const pool = this.pool!, periods = this.draw!.periods;
        const sx = this.sx, sy = this.sy;
        const n = pool.pieceStart.length;
        if (this.pieceOffset.length !== n) this.pieceOffset = new Float64Array(n);
        let phase = 0;
        for (let piece = 0; piece < n; piece++) {
            if (pool.pieceStart[piece]) phase = 0;
            const period = periods[piece];
            this.pieceOffset[piece] = period > 0 ? roundTenth(phase % period) : NaN;
            // Hidden pieces of a run still advance the phase: their length is part of the run's line.
            const a = pool.segs[2 * piece], b = pool.segs[2 * piece + 1];
            phase += Math.hypot(sx[b] - sx[a], sy[b] - sy[a]);
        }
    }

    /**
     * Writes drawable `i` onto slot `slot`: its screen geometry, and the style attributes that differ from what the slot
     * carries (a style write restyles the node, a `points` write does not).
     */
    private writeDrawable(i: number, slot: number): void {
        const pool = this.pool!, draw = this.draw!;
        const sx = this.sx, sy = this.sy;
        const node = draw.elements[slot];
        const nTri = pool.tris.length / 3, nPlane = pool.planes.length / 4;
        const style = draw.styles[i];
        let width = style.width, offset = NaN;
        if (i < nTri) {
            const t = 3 * i;
            const a = pool.tris[t], b = pool.tris[t + 1], c = pool.tris[t + 2];
            const pa = `${roundTenth(sx[a])},${roundTenth(sy[a])}`;
            node.setAttribute('points', `${pa} ${roundTenth(sx[b])},${roundTenth(sy[b])} ${roundTenth(sx[c])},${roundTenth(sy[c])} ${pa}`);
            width = this.seam;
        } else if (i < nTri + nPlane) {
            const q = 4 * (i - nTri);
            const a = pool.planes[q], b = pool.planes[q + 1], c = pool.planes[q + 2], d = pool.planes[q + 3];
            const pa = `${roundTenth(sx[a])},${roundTenth(sy[a])}`;
            node.setAttribute('points', `${pa} ${roundTenth(sx[b])},${roundTenth(sy[b])} ${roundTenth(sx[c])},${roundTenth(sy[c])} ${roundTenth(sx[d])},${roundTenth(sy[d])} ${pa}`);
        } else {
            const piece = i - nTri - nPlane, s = 2 * piece;
            // A run of pieces is collinear on the screen too (a projected line is a line): one line from its first
            // piece's start to its last piece's end.
            const run = this.pieceRun ? this.pieceRun[piece] : 1;
            const a = pool.segs[s], b = pool.segs[s + 2 * run - 1];
            node.setAttribute('points', `${roundTenth(sx[a])},${roundTenth(sy[a])} ${roundTenth(sx[b])},${roundTenth(sy[b])}`);
            offset = this.pieceOffset[piece];
        }
        let restyled = false;
        if (draw.slotStyle[slot] !== style) {
            // Only what differs: a mesh slot that shows a line for a frame and a triangle again changes stroke and width.
            const had = draw.slotStyle[slot];
            if (!had || had.stroke !== style.stroke) node.setAttribute('stroke', style.stroke);
            // A line is two points and has no interior, so it leaves the slot's fill alone; filled shapes write theirs.
            if (style.fill && draw.slotFill[slot] !== style) {
                node.setAttribute('fill', style.fill);
                node.setAttribute('fill-opacity', String(style.fillOpacity ?? 0));
                draw.slotFill[slot] = style;
            }
            if ((had?.dash ?? 0) !== style.dash) {
                if (style.dash > 0) node.setAttribute('stroke-dasharray', DASH_ARRAYS[style.dash - 1].join(','));
                else node.removeAttribute('stroke-dasharray');
            }
            draw.slotStyle[slot] = style;
            restyled = true;
        }
        if (draw.slotWidth[slot] !== width) {
            node.setAttribute('stroke-width', String(width));
            draw.slotWidth[slot] = width;
            restyled = true;
        }
        const had = draw.slotOffset[slot];
        if (had !== offset && !(Number.isNaN(had) && Number.isNaN(offset))) {
            if (Number.isNaN(offset)) node.removeAttribute('stroke-dashoffset');
            else node.setAttribute('stroke-dashoffset', String(offset));
            draw.slotOffset[slot] = offset;
            restyled = true;
        }
        if (!draw.slotShown[slot]) {
            node.removeAttribute('display');
            draw.slotShown[slot] = 1;
            restyled = true;
        }
        if (restyled) this.stats.slotRestyles++;
    }

    /**
     * Painter's order by rebinding: the drawables are sorted farthest first and the k-th drawn one is written onto slot k,
     * whose DOM position never changes. Only the point and marker ellipses (JSXGraph's own nodes) are moved, each to just
     * before the slot of the first drawable that paints over it.
     */
    private paint(model: JsxCameraModel, scene: SurfaceScene): void {
        const pool = this.pool!, draw = this.draw!;
        const dv = this.vertexDepth;
        const nTri = pool.tris.length / 3, nPlane = pool.planes.length / 4, nSeg = pool.segs.length / 2;
        const nDraw = nTri + nPlane + nSeg;
        const total = nDraw + scene.markers.length + scene.points.length;
        if (this.depths.length !== total) this.depths = new Float64Array(total);
        const d = this.depths;
        let e = 0;
        for (let t = 0; t < pool.tris.length; t += 3) d[e++] = (dv[pool.tris[t]] + dv[pool.tris[t + 1]] + dv[pool.tris[t + 2]]) / 3;
        for (let q = 0; q < pool.planes.length; q += 4) {
            d[e++] = (dv[pool.planes[q]] + dv[pool.planes[q + 1]] + dv[pool.planes[q + 2]] + dv[pool.planes[q + 3]]) / 4;
        }
        const runs = this.detailReduced ? this.pieceRun : null;
        for (let s = 0; s < pool.segs.length; s += 2) {
            // A reduced run is sorted as one element at the mean depth of its pieces; the pieces it covers are not ordered.
            const run = runs ? runs[s / 2] : 1;
            let sum = 0;
            for (let k = 0; k < run; k++) sum += dv[pool.segs[s + 2 * k]] + dv[pool.segs[s + 2 * k + 1]];
            d[e++] = run > 0 ? sum / (2 * run) - pool.lineBias : 0;
        }
        for (const m of scene.markers) d[e++] = projectToScreen(model, m.xyz[0], m.xyz[1], m.xyz[2], this.projected).depth - pool.pointBias;
        for (const p of scene.points) d[e++] = projectToScreen(model, p.xyz[0], p.xyz[1], p.xyz[2], this.projected).depth - 2 * pool.pointBias;
        const order = orderBackToFront(d);
        this.computePieceOffsets();
        const hidden = this.hidden, nodes = draw.nodes;
        const ellipses = this.ellipses, ranks = this.ellipseRank;
        ellipses.length = 0;
        ranks.length = 0;
        let rank = 0;
        for (let k = 0; k < order.length; k++) {
            const i = order[k];
            if (i < nDraw) {
                if (hidden && hidden[i]) continue;
                nodes[i] = draw.elements[rank];
                this.writeDrawable(i, rank++);
            } else {
                const node = nodes[i];
                if (node) {
                    ellipses.push(node);
                    ranks.push(rank);
                }
            }
        }
        this.stats.drawn = rank;
        this.stats.domMoves += this.placeEllipses(draw);
    }

    /**
     * Puts each ellipse of this frame (in paint order) just before the slot of the first drawable painted after it, with
     * the fewest `insertBefore` calls: placed back to front, an ellipse that already sits right before its anchor stays.
     */
    private placeEllipses(draw: Drawables): number {
        const ellipses = this.ellipses, ranks = this.ellipseRank, slots = draw.elements;
        const layer = draw.tail.parentNode;
        if (!layer) return 0;
        let moves = 0, anchorRank = -1;
        let anchor: Node = draw.tail;
        for (let k = ellipses.length - 1; k >= 0; k--) {
            const node = ellipses[k];
            if (node.parentNode !== layer) continue;
            if (ranks[k] !== anchorRank) {
                anchorRank = ranks[k];
                anchor = anchorRank < slots.length ? slots[anchorRank] : draw.tail;
            }
            if (anchor.previousSibling !== node) {
                layer.insertBefore(node, anchor);
                moves++;
            }
            anchor = node;
        }
        return moves;
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
