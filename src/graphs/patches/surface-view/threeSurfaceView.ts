import type * as ThreeNs from 'three';
import {
    cameraPosition,
    clampDistance,
    FOV_DEG,
    fitCameraTo,
    horizontalDrag,
    intersectHorizontalPlane,
    orbit,
    zModeDrag,
    zoom,
} from './surfaceMath';
import {
    assertFiniteScene,
    type AttachOptions,
    type LabelLayout,
    type PolylineRole,
    type SurfaceCamera,
    type SurfaceCapture,
    type SurfaceEdit,
    type SurfaceScene,
    type SurfaceView,
    type Xyz,
} from './surfaceScene';
import {dashFor, SURFACE_COLORS} from './surfaceStyles';

type Three = typeof ThreeNs;

/** The renderer subset the adapter uses; a fake can stand in for tests. */
export interface RendererLike {
    domElement: HTMLCanvasElement;
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setClearColor(color: number, alpha?: number): void;
    render(scene: ThreeNs.Scene, camera: ThreeNs.Camera): void;
    dispose(): void;
    forceContextLoss(): void;
}

export interface ThreeSurfaceViewOptions {
    /** Defaults to a lazy dynamic import so Three lands in its own chunk. */
    loadThree?: () => Promise<Three>;
    createRenderer?: (three: Three, canvas: HTMLCanvasElement) => RendererLike;
}

export {SURFACE_COLORS, SURFACE_DASH} from './surfaceStyles';

const POINT_RADIUS = 0.105;
const PICK_RADIUS_PX = 20;
const OCCLUSION_EPS = 1e-3;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 200;

interface PinchState {
    /** The two pointers, by id, with their last canvas position. */
    pointers: Map<number, { x: number; y: number }>;
    lastDistance: number;
}

let descriptionCounter = 0;

function pinchDistance(pointers: Map<number, { x: number; y: number }>): number {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
}

interface DragState {
    kind: 'point' | 'orbit';
    pointerId: number;
    pointId?: string;
    startXyz?: Xyz;
    grabHit?: Xyz;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    last?: Xyz;
}

export class ThreeSurfaceView implements SurfaceView {
    private readonly loadThree: () => Promise<Three>;
    private readonly makeRenderer?: ThreeSurfaceViewOptions['createRenderer'];
    private readonly editListeners = new Set<(edit: SurfaceEdit) => void>();
    private readonly layoutListeners = new Set<(labels: LabelLayout[]) => void>();
    private lastLayoutKey = '';
    private lastFramingKey = '';
    /** The inputs the published framing was computed from; while they are unchanged nothing is projected again. */
    private lastFramingInputs = '';
    private lastFramingPoints: unknown = null;
    private readonly cleanups: Array<() => void> = [];

    private disposed = false;
    private attachStarted = false;
    private ariaLabel = '';
    private description = '';
    private contextCallbacks: Pick<AttachOptions, 'onContextLost' | 'onContextRestored'> = {};
    private contextLost = false;
    private descriptionEl: HTMLElement | null = null;
    private scene: SurfaceScene | null = null;
    private appliedRevision = -1;

    private three: Three | null = null;
    private host: HTMLElement | null = null;
    private hostPrev: { tabIndex: string | null; aria: string | null; role: string | null; describedBy: string | null } | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private renderer: RendererLike | null = null;
    private glScene: ThreeNs.Scene | null = null;
    private glCamera: ThreeNs.PerspectiveCamera | null = null;
    private geometryLayer: ThreeNs.Group | null = null;
    private dynamicLayer: ThreeNs.Group | null = null;
    private surfaceMesh: ThreeNs.Mesh | null = null;
    private renderedOwnersGeometry: ThreeNs.BufferGeometry | null = null;
    private renderedOwnersSignature = '';
    private renderedOwnersJson = '';
    private renderedBoundsGeometry: ThreeNs.BufferGeometry | null = null;
    private renderedBoundsLocal: {min: Xyz; max: Xyz} | null = null;
    private pointMeshes = new Map<string, ThreeNs.Mesh>();
    private observer: ResizeObserver | null = null;
    private raf = 0;
    private width = DEFAULT_WIDTH;
    private height = DEFAULT_HEIGHT;
    private drag: DragState | null = null;
    /** Two touches that zoom; while it is set no drag is active. */
    private pinch: PinchState | null = null;

    // Shared resources, disposed in dispose().
    private shared: Array<{ dispose(): void }> = [];
    private sphereGeometry: ThreeNs.SphereGeometry | null = null;
    private markerGeometry: ThreeNs.SphereGeometry | null = null;
    private marker2Geometry: ThreeNs.OctahedronGeometry | null = null;
    private lineMaterials = new Map<PolylineRole, ThreeNs.LineBasicMaterial>();
    /** Diagonal of the bounding box of the last built scene; the dash sizes are fractions of it. */
    private sceneExtent = 1;
    private pointMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private selectedMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private evaluatedMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private constructionMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private construction2Material: ThreeNs.MeshBasicMaterial | null = null;
    private surfaceMaterial: ThreeNs.MeshStandardMaterial | null = null;
    private planeMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private planeOutlineMaterial: ThreeNs.LineBasicMaterial | null = null;

    constructor(options: ThreeSurfaceViewOptions = {}) {
        this.loadThree = options.loadThree ?? (() => import('three'));
        this.makeRenderer = options.createRenderer;
    }

    // ---- public API ----------------------------------------------------

    async attach(host: HTMLElement, options: AttachOptions = {}): Promise<void> {
        if (this.disposed) return;
        if (this.attachStarted) throw new Error('Surface view is already attached');
        this.attachStarted = true;
        if (options.ariaLabel !== undefined) this.ariaLabel = options.ariaLabel;
        if (options.description !== undefined) this.description = options.description;
        this.contextCallbacks = {onContextLost: options.onContextLost, onContextRestored: options.onContextRestored};
        const three = await this.loadThree();
        if (this.disposed) return;
        this.three = three;
        this.host = host;
        this.build(three, host);
        if (this.scene) this.applyScene(this.scene);
        this.requestRender();
    }

    reconcile(scene: SurfaceScene): void {
        if (this.disposed) return;
        this.clearRenderedOwners();
        this.host?.removeAttribute('data-surface-framing');
        this.lastFramingKey = '';
        this.lastFramingInputs = '';
        this.lastFramingPoints = null;
        assertFiniteScene(scene);
        this.scene = scene;
        if (this.renderer) this.applyScene(scene);
    }

    onEdit(listener: (edit: SurfaceEdit) => void): () => void {
        this.editListeners.add(listener);
        return () => {
            this.editListeners.delete(listener);
        };
    }

    onLayout(listener: (labels: LabelLayout[]) => void): () => void {
        this.layoutListeners.add(listener);
        // A new subscriber has seen no layout yet: the next frame delivers the current one.
        this.lastLayoutKey = '';
        this.requestRender();
        return () => {
            this.layoutListeners.delete(listener);
        };
    }

    setAriaLabel(label: string, description?: string): void {
        this.ariaLabel = label;
        if (description !== undefined) this.description = description;
        if (this.host && !this.disposed) {
            this.host.setAttribute('aria-label', label);
            if (this.descriptionEl) this.descriptionEl.textContent = this.description;
        }
    }

    async capture(): Promise<SurfaceCapture> {
        if (this.disposed || !this.renderer || !this.canvas) throw new Error('Surface view is not attached');
        this.renderNow();
        const dataUrl = this.canvas.toDataURL('image/png');
        return {dataUrl, width: this.width, height: this.height, labels: this.computeLabels()};
    }

    /** Every scene label projected into canvas pixels, with whether it is in the frustum and not behind the surface. */
    private computeLabels(): LabelLayout[] {
        const labels: LabelLayout[] = [];
        for (const label of this.scene?.labels ?? []) {
            const p = this.project(label.anchor);
            // A label on the surface itself (no control point) sits on the true surface, which the faceted mesh may
            // overlap by its chord error; a control point label is off the surface and keeps the strict test.
            const slack = label.pointId === undefined ? this.scene?.mesh?.chordTolerance ?? 0 : 0;
            const visible = p.inFrustum && !this.isOccluded(label.anchor, label.pointId, slack);
            labels.push({id: label.id, text: label.text, x: p.x, y: p.y, visible});
        }
        return labels;
    }

    /** Tells the layout listeners about the layout of the frame just rendered, when it differs from the last one. */
    private publishLayout(): void {
        if (this.layoutListeners.size === 0 || !this.scene) return;
        const labels = this.computeLabels();
        const key = JSON.stringify(labels.map(l => [l.id, l.text, Math.round(l.x * 10), Math.round(l.y * 10), l.visible]));
        if (key === this.lastLayoutKey) return;
        this.lastLayoutKey = key;
        for (const listener of [...this.layoutListeners]) listener(labels);
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
        for (const fn of this.cleanups.splice(0)) fn();
        this.observer?.disconnect();
        this.observer = null;
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
        this.clearLayer(this.geometryLayer);
        this.clearLayer(this.dynamicLayer);
        for (const r of this.shared.splice(0)) r.dispose();
        this.lineMaterials.clear();
        this.pointMeshes.clear();
        this.renderer?.dispose();
        this.renderer?.forceContextLoss();
        this.canvas?.remove();
        if (this.host && this.hostPrev) {
            this.restoreAttr(this.host, 'tabindex', this.hostPrev.tabIndex);
            this.restoreAttr(this.host, 'aria-label', this.hostPrev.aria);
            this.restoreAttr(this.host, 'role', this.hostPrev.role);
            this.restoreAttr(this.host, 'aria-describedby', this.hostPrev.describedBy);
            this.descriptionEl?.remove();
            this.host.removeAttribute('data-surface-framing');
            this.host.removeAttribute('data-rendered-surface-owners');
        }
        this.renderer = null;
        this.canvas = null;
        this.glScene = null;
        this.glCamera = null;
        this.geometryLayer = null;
        this.dynamicLayer = null;
        this.surfaceMesh = null;
        this.renderedOwnersGeometry = null;
        this.renderedOwnersSignature = '';
        this.renderedOwnersJson = '';
        this.renderedBoundsGeometry = null;
        this.renderedBoundsLocal = null;
        this.editListeners.clear();
        this.drag = null;
        this.pinch = null;
        this.descriptionEl = null;
        this.host = null;
        this.three = null;
    }

    // ---- construction --------------------------------------------------

    private track<T extends { dispose(): void }>(r: T): T {
        this.shared.push(r);
        return r;
    }

    private listen<K extends string>(
        target: EventTarget, type: K, fn: (e: never) => void, options?: AddEventListenerOptions,
    ): void {
        target.addEventListener(type, fn as unknown as EventListener, options);
        this.cleanups.push(() => target.removeEventListener(type, fn as unknown as EventListener, options));
    }

    private restoreAttr(el: HTMLElement, name: string, value: string | null): void {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
    }

    private build(T: Three, host: HTMLElement): void {
        const canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.touchAction = 'none';
        this.canvas = canvas;
        const renderer: RendererLike = this.makeRenderer
            ? this.makeRenderer(T, canvas)
            : new T.WebGLRenderer({canvas, antialias: true});
        this.renderer = renderer;
        renderer.setClearColor(0xffffff, 1);
        renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));

        this.hostPrev = {
            tabIndex: host.getAttribute('tabindex'), aria: host.getAttribute('aria-label'),
            role: host.getAttribute('role'), describedBy: host.getAttribute('aria-describedby'),
        };
        host.tabIndex = 0;
        // The host takes arrow, plus and minus keys itself, so it is an application region: a short name, with the
        // key help as its description.
        host.setAttribute('role', 'application');
        if (this.ariaLabel) host.setAttribute('aria-label', this.ariaLabel);
        const description = document.createElement('span');
        description.id = `surface-view-keys-${++descriptionCounter}`;
        description.hidden = true;
        description.textContent = this.description;
        host.appendChild(description);
        this.descriptionEl = description;
        host.setAttribute('aria-describedby', description.id);
        host.appendChild(canvas);

        const scene = new T.Scene();
        this.glScene = scene;
        scene.add(new T.HemisphereLight(0xffffff, 0xb8c4a8, 1.1));
        const sun = new T.DirectionalLight(0xffffff, 1.4);
        sun.position.set(4, -6, 9);
        scene.add(sun);
        this.geometryLayer = new T.Group();
        this.dynamicLayer = new T.Group();
        scene.add(this.geometryLayer, this.dynamicLayer);

        const cam = new T.PerspectiveCamera(FOV_DEG, 1, 0.05, 500);
        cam.up.set(0, 0, 1);
        this.glCamera = cam;

        this.sphereGeometry = this.track(new T.SphereGeometry(POINT_RADIUS, 14, 10));
        this.markerGeometry = this.track(new T.SphereGeometry(POINT_RADIUS * 0.8, 12, 8));
        // Stage-2 markers are diamonds, larger than the stage-1 spheres, so the stages differ in shape and not only hue.
        this.marker2Geometry = this.track(new T.OctahedronGeometry(POINT_RADIUS * 1.25));
        this.pointMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.point}));
        this.selectedMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.selected}));
        this.evaluatedMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.marker}));
        this.constructionMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.construction}));
        this.construction2Material = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS['construction-2']}));
        this.surfaceMaterial = this.track(new T.MeshStandardMaterial({
            color: SURFACE_COLORS.surface, roughness: 0.74, metalness: 0, side: T.DoubleSide,
            polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        }));
        // Translucent and double-sided; it does not write depth, so the surface and the arrows behind it stay visible.
        this.planeMaterial = this.track(new T.MeshBasicMaterial({
            color: SURFACE_COLORS.plane, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false,
        }));
        this.planeOutlineMaterial = this.track(new T.LineBasicMaterial({color: SURFACE_COLORS.plane}));

        this.measure();
        this.listen(canvas, 'pointerdown', (e: PointerEvent) => this.onPointerDown(e));
        this.listen(canvas, 'pointermove', (e: PointerEvent) => this.onPointerMove(e));
        this.listen(canvas, 'pointerup', (e: PointerEvent) => this.onPointerEnd(e, false));
        this.listen(canvas, 'pointercancel', (e: PointerEvent) => this.onPointerEnd(e, true));
        this.listen(canvas, 'webglcontextlost', (e: Event) => this.onContextLost(e));
        this.listen(canvas, 'webglcontextrestored', () => this.onContextRestored());
        this.listen(canvas, 'wheel', (e: WheelEvent) => this.onWheel(e), {passive: false});
        this.listen(host, 'keydown', (e: KeyboardEvent) => this.onKey(e));
        if (typeof ResizeObserver !== 'undefined') {
            this.observer = new ResizeObserver(() => {
                this.measure();
                this.requestRender();
            });
            this.observer.observe(host);
        }
    }

    private measure(): void {
        if (!this.host || !this.renderer || !this.glCamera) return;
        this.width = Math.max(1, this.host.clientWidth || DEFAULT_WIDTH);
        this.height = Math.max(1, this.host.clientHeight || DEFAULT_HEIGHT);
        this.renderer.setSize(this.width, this.height, false);
        this.glCamera.aspect = this.width / this.height;
        this.glCamera.updateProjectionMatrix();
        if (this.scene) this.applyCamera(this.scene.camera);
    }

    // ---- scene application --------------------------------------------

    private clearLayer(layer: ThreeNs.Group | null): void {
        if (!layer) return;
        for (const child of [...layer.children]) {
            layer.remove(child);
            const geometry = (child as ThreeNs.Mesh).geometry;
            // Shared sphere geometries are disposed once via this.shared.
            if (geometry && child.userData.ownsGeometry) geometry.dispose();
        }
    }

    private applyCamera(c: SurfaceCamera): void {
        const cam = this.glCamera;
        if (!cam) return;
        const [x, y, z] = cameraPosition(c.az, c.el, clampDistance(c.distance), c.target);
        cam.position.set(x, y, z);
        cam.lookAt(c.target[0], c.target[1], c.target[2]);
        cam.updateMatrixWorld(true);
    }

    private applyScene(scene: SurfaceScene): void {
        const T = this.three;
        if (!T || !this.geometryLayer || !this.dynamicLayer) return;
        if (scene.revision !== this.appliedRevision) {
            this.rebuildGeometry(T, scene);
            this.appliedRevision = scene.revision;
        }
        if (this.surfaceMesh) this.surfaceMesh.visible = !!scene.mesh?.visible;

        this.clearLayer(this.dynamicLayer);
        this.pointMeshes.clear();
        for (const p of scene.points) {
            const mesh = new T.Mesh(this.sphereGeometry!, p.selected ? this.selectedMaterial! : this.pointMaterial!);
            mesh.position.set(...p.xyz);
            if (p.selected) mesh.scale.setScalar(1.35);
            mesh.userData.pointId = p.id;
            this.dynamicLayer.add(mesh);
            this.pointMeshes.set(p.id, mesh);
        }
        for (const m of scene.markers) {
            const material = m.role === 'evaluated' ? this.evaluatedMaterial! : m.role === 'construction-2' ? this.construction2Material! : this.constructionMaterial!;
            const mesh = new T.Mesh(m.role === 'construction-2' ? this.marker2Geometry! : this.markerGeometry!, material);
            mesh.position.set(...m.xyz);
            this.dynamicLayer.add(mesh);
        }
        this.applyCamera(scene.camera);
        this.dynamicLayer.updateMatrixWorld(true);
        this.requestRender();
    }

    private lineMaterial(T: Three, role: PolylineRole): ThreeNs.LineBasicMaterial {
        let m = this.lineMaterials.get(role);
        const dash = dashFor(role);
        if (!m) {
            const color = SURFACE_COLORS[role];
            m = this.track(dash
                ? new T.LineDashedMaterial({color, dashSize: 1, gapSize: 1})
                : new T.LineBasicMaterial({color}));
            this.lineMaterials.set(role, m);
        }
        if (dash && m instanceof T.LineDashedMaterial) {
            // Uniforms: updating them follows the extent without recreating (or leaking) the material.
            m.dashSize = dash.dash * this.sceneExtent;
            m.gapSize = dash.gap * this.sceneExtent;
        }
        return m;
    }

    private measureExtent(scene: SurfaceScene): number {
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        const add = (x: number, y: number, z: number) => {
            if (x < min[0]) min[0] = x;
            if (y < min[1]) min[1] = y;
            if (z < min[2]) min[2] = z;
            if (x > max[0]) max[0] = x;
            if (y > max[1]) max[1] = y;
            if (z > max[2]) max[2] = z;
        };
        for (const p of scene.points) add(...p.xyz);
        for (const line of scene.polylines) for (const q of line.points) add(...q);
        if (scene.mesh) {
            const a = scene.mesh.positions;
            for (let i = 0; i + 2 < a.length; i += 3) add(a[i], a[i + 1], a[i + 2]);
        }
        const d = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
        return Number.isFinite(d) && d > 1e-9 ? d : 1;
    }

    private rebuildGeometry(T: Three, scene: SurfaceScene): void {
        const layer = this.geometryLayer!;
        this.clearLayer(layer);
        this.surfaceMesh = null;
        this.renderedOwnersGeometry = null;
        this.renderedOwnersSignature = '';
        this.renderedOwnersJson = '';
        this.renderedBoundsGeometry = null;
        this.renderedBoundsLocal = null;
        this.sceneExtent = this.measureExtent(scene);
        if (scene.mesh) {
            const g = new T.BufferGeometry();
            g.setAttribute('position', new T.Float32BufferAttribute(Array.from(scene.mesh.positions), 3));
            g.setIndex(scene.mesh.faces);
            g.computeVertexNormals();
            const mesh = new T.Mesh(g, this.surfaceMaterial!);
            mesh.userData.ownsGeometry = true;
            mesh.visible = scene.mesh.visible;
            layer.add(mesh);
            this.surfaceMesh = mesh;
        }
        for (const line of scene.polylines) {
            const g = new T.BufferGeometry();
            g.setAttribute('position', new T.Float32BufferAttribute(line.points.flat(), 3));
            const obj = new T.Line(g, this.lineMaterial(T, line.role));
            if (dashFor(line.role)) obj.computeLineDistances();
            obj.userData.ownsGeometry = true;
            layer.add(obj);
        }
        for (const plane of scene.planes ?? []) {
            const g = new T.BufferGeometry();
            g.setAttribute('position', new T.Float32BufferAttribute(plane.corners.flat(), 3));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            const quad = new T.Mesh(g, this.planeMaterial!);
            quad.userData.ownsGeometry = true;
            layer.add(quad);
            const outline = new T.BufferGeometry();
            outline.setAttribute('position', new T.Float32BufferAttribute([...plane.corners, plane.corners[0]].flat(), 3));
            const loop = new T.Line(outline, this.planeOutlineMaterial!);
            loop.userData.ownsGeometry = true;
            layer.add(loop);
        }
        layer.updateMatrixWorld(true);
    }

    // ---- rendering -----------------------------------------------------

    private requestRender(): void {
        if (this.disposed || this.raf || !this.renderer) return;
        this.raf = requestAnimationFrame(() => {
            this.raf = 0;
            this.renderNow();
        });
    }

    private renderNow(): void {
        if (this.disposed || this.contextLost || !this.renderer || !this.glScene || !this.glCamera) return;
        try {
            this.renderer.render(this.glScene, this.glCamera);
        } catch (error) {
            this.clearRenderedOwners();
            this.host?.removeAttribute('data-surface-framing');
            this.lastFramingKey = '';
            this.lastFramingInputs = '';
            this.lastFramingPoints = null;
            this.renderedOwnersJson = '';
            throw error;
        }
        this.publishLayout();
        this.publishFraming();
        this.publishRenderedOwners();
    }

    private clearRenderedOwners(): void {
        this.host?.removeAttribute('data-rendered-surface-owners');
    }

    /** Cached bounds over indexed surface triangles only; camera changes project the eight corners, not every triangle. */
    private projectRenderedMeshBounds(): {left: number; top: number; right: number; bottom: number; inFrustum: boolean} | null {
        const mesh = this.surfaceMesh;
        const geometry = mesh?.geometry;
        const position = geometry?.getAttribute('position');
        const index = geometry?.getIndex();
        if (!mesh?.visible || !geometry || !position || !index || index.count < 3 || index.count % 3 !== 0) return null;
        if (this.renderedBoundsGeometry !== geometry || !this.renderedBoundsLocal) {
            const min: [number, number, number] = [Infinity, Infinity, Infinity];
            const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
            for (let offset = 0; offset < index.count; offset++) {
                const vertex = index.getX(offset);
                if (!Number.isInteger(vertex) || vertex < 0 || vertex >= position.count) return null;
                const xyz = [position.getX(vertex), position.getY(vertex), position.getZ(vertex)];
                if (!xyz.every(Number.isFinite)) return null;
                for (let axis = 0; axis < 3; axis++) {
                    min[axis] = Math.min(min[axis], xyz[axis]);
                    max[axis] = Math.max(max[axis], xyz[axis]);
                }
            }
            if (![...min, ...max].every(Number.isFinite)) return null;
            this.renderedBoundsGeometry = geometry;
            this.renderedBoundsLocal = {min, max};
        }
        mesh.updateWorldMatrix(true, false);
        const T = this.three!;
        const {min, max} = this.renderedBoundsLocal;
        const projected: Array<{x: number; y: number; z: number}> = [];
        for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
            const point = new T.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld).project(this.glCamera!);
            if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
            projected.push({x: ((point.x + 1) / 2) * this.width, y: ((1 - point.y) / 2) * this.height, z: point.z});
        }
        return {
            left: Math.min(...projected.map(point => point.x)), top: Math.min(...projected.map(point => point.y)),
            right: Math.max(...projected.map(point => point.x)), bottom: Math.max(...projected.map(point => point.y)),
            inFrustum: projected.every(point => Math.abs((point.x / this.width) * 2 - 1) <= 1
                && Math.abs(1 - (point.y / this.height) * 2) <= 1 && point.z >= -1 && point.z <= 1),
        };
    }

    /** Publishes first-vertex xyz samples from the first, middle and last drawable owner triangles after the mesh rendered. */
    private publishRenderedOwners(): void {
        const host = this.host, sceneMesh = this.scene?.mesh, mesh = this.surfaceMesh;
        const position = mesh?.geometry.getAttribute('position');
        const index = mesh?.geometry.getIndex();
        if (!host || !sceneMesh?.visible || !mesh?.visible || !position || !index || index.count < 3) {
            this.clearRenderedOwners();
            return;
        }
        const ownerIds = new Set<string>();
        const sourceOwners = this.scene?.meshOwners ?? [];
        const signature = JSON.stringify(sourceOwners.map(({id, kind, faceStart, faceCount}) => [id, kind, faceStart, faceCount]));
        if (this.renderedOwnersGeometry === mesh.geometry && this.renderedOwnersSignature === signature && this.renderedOwnersJson) {
            host.setAttribute('data-rendered-surface-owners', this.renderedOwnersJson);
            return;
        }
        const owners = sourceOwners.flatMap(owner => {
            const {faceStart, faceCount} = owner;
            if (!owner.id || ownerIds.has(owner.id) || !Number.isInteger(faceStart) || !Number.isInteger(faceCount) || faceStart < 0 || faceStart % 3 !== 0 || faceCount < 3 || faceCount % 3 !== 0 || faceStart + faceCount > index.count) return [];
            ownerIds.add(owner.id);
            const drawableFaces: Array<{offset: number; vertices: number[]}> = [];
            for (let offset = faceStart; offset < faceStart + faceCount; offset += 3) {
                const vertices = [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)];
                if (!vertices.every(vertex => Number.isInteger(vertex) && vertex >= 0 && vertex < position.count) || new Set(vertices).size !== 3) continue;
                const xyz = vertices.map(vertex => [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]);
                if (!xyz.flat().every(Number.isFinite)) continue;
                const [a, b, c] = xyz;
                const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
                const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
                const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
                if (Math.hypot(...cross) > 0) drawableFaces.push({offset, vertices});
            }
            if (drawableFaces.length === 0) return [];
            const selectedFaces = [...new Set([0, Math.floor(drawableFaces.length / 2), drawableFaces.length - 1])].map(index => drawableFaces[index]);
            const geometrySamples = selectedFaces.map(face => {
                const vertex = face.vertices[0];
                return [position.getX(vertex), position.getY(vertex), position.getZ(vertex)];
            });
            if (!geometrySamples.every(sample => sample.length === 3 && sample.every(Number.isFinite))) return [];
            return [{id: owner.id, kind: owner.kind, geometrySamples}];
        });
        if (owners.length === 0) {
            this.clearRenderedOwners();
            this.renderedOwnersGeometry = null;
            this.renderedOwnersSignature = '';
            this.renderedOwnersJson = '';
            return;
        }
        this.renderedOwnersGeometry = mesh.geometry;
        this.renderedOwnersSignature = signature;
        this.renderedOwnersJson = JSON.stringify(owners);
        host.setAttribute('data-rendered-surface-owners', this.renderedOwnersJson);
    }

    /**
     * Mirrors the rendered framing onto the host as one read-only `data-surface-framing` attribute: the canvas size, the
     * camera and every control point projected into canvas pixels. The catalog preview capture reads it as evidence
     * that the whole net is in frame; nothing in the app reads it back.
     */
    private publishFraming(): void {
        if (!this.host || !this.scene) return;
        const meshBounds = this.projectRenderedMeshBounds();
        if (!meshBounds || !this.scene.meshOwners?.length) {
            this.host.removeAttribute('data-surface-framing');
            this.lastFramingKey = '';
            this.lastFramingInputs = '';
            this.lastFramingPoints = null;
            return;
        }
        const camera = this.scene.camera;
        const inputs = [this.width, this.height, camera.az, camera.el, camera.distance, ...camera.target].join(',');
        if (inputs === this.lastFramingInputs && this.scene.points === this.lastFramingPoints) return;
        this.lastFramingInputs = inputs;
        this.lastFramingPoints = this.scene.points;
        const round = (v: number) => Math.round(v * 1000) / 1000;
        const framing = {
            width: this.width, height: this.height,
            camera: {az: camera.az, el: camera.el, distance: camera.distance, target: [...camera.target]},
            meshBounds,
            points: this.scene.points.map(p => {
                const s = this.project(p.xyz);
                return {id: p.id, x: round(s.x), y: round(s.y), inFrustum: s.inFrustum};
            }),
        };
        const key = JSON.stringify(framing);
        if (key === this.lastFramingKey) return;
        this.lastFramingKey = key;
        this.host.setAttribute('data-surface-framing', key);
    }

    // ---- projection and picking ---------------------------------------

    private project(xyz: Xyz): { x: number; y: number; inFrustum: boolean } {
        const T = this.three!;
        const v = new T.Vector3(...xyz).project(this.glCamera!);
        return {
            x: ((v.x + 1) / 2) * this.width,
            y: ((1 - v.y) / 2) * this.height,
            inFrustum: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z >= -1 && v.z <= 1,
        };
    }

    /**
     * True when the mesh or another control point lies between the camera and xyz. The mesh must lie more than
     * `meshSlack` in front of xyz to count, so an anchor on the true surface is not hidden by its own facets.
     */
    private isOccluded(xyz: Xyz, ownPointId?: string, meshSlack = 0): boolean {
        const T = this.three!;
        const origin = this.glCamera!.position;
        const target = new T.Vector3(...xyz);
        const dir = target.clone().sub(origin);
        const dist = dir.length();
        if (dist < 1e-9) return false;
        const ray = new T.Raycaster(origin.clone(), dir.normalize(), 0, dist - OCCLUSION_EPS);
        const blockers: ThreeNs.Object3D[] = [];
        if (this.surfaceMesh?.visible) blockers.push(this.surfaceMesh);
        for (const [id, m] of this.pointMeshes) if (id !== ownPointId) blockers.push(m);
        return ray.intersectObjects(blockers, false).some(h => h.distance < dist - OCCLUSION_EPS - (h.object === this.surfaceMesh ? meshSlack : 0));
    }

    private pickPoint(x: number, y: number): string | null {
        if (!this.scene) return null;
        let best: { id: string; d: number } | null = null;
        for (const p of this.scene.points) {
            const s = this.project(p.xyz);
            if (!s.inFrustum) continue;
            const d = Math.hypot(s.x - x, s.y - y);
            if (d > PICK_RADIUS_PX || (best && d >= best.d)) continue;
            if (this.isOccluded(p.xyz, p.id)) continue;
            best = {id: p.id, d};
        }
        return best?.id ?? null;
    }

    private rayAt(x: number, y: number): { origin: Xyz; dir: Xyz } {
        const T = this.three!;
        const ray = new T.Raycaster();
        ray.setFromCamera(new T.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1), this.glCamera!);
        const o = ray.ray.origin;
        const d = ray.ray.direction;
        return {origin: [o.x, o.y, o.z], dir: [d.x, d.y, d.z]};
    }

    // ---- input ---------------------------------------------------------

    /** The browser dropped the GL context (GPU reset): keep it restorable, stop drawing and say so. */
    private onContextLost(e: Event): void {
        e.preventDefault();
        if (this.disposed) return;
        this.contextLost = true;
        this.clearRenderedOwners();
        this.host?.removeAttribute('data-surface-framing');
        this.lastFramingKey = '';
        this.lastFramingInputs = '';
        this.lastFramingPoints = null;
        this.renderedOwnersGeometry = null;
        this.renderedOwnersSignature = '';
        this.renderedOwnersJson = '';
        this.contextCallbacks.onContextLost?.();
    }

    /** Three re-creates its GL state itself; the next frame draws the scene again. */
    private onContextRestored(): void {
        if (this.disposed) return;
        this.contextLost = false;
        this.lastLayoutKey = '';
        this.requestRender();
        this.contextCallbacks.onContextRestored?.();
    }

    private emit(edit: SurfaceEdit): void {
        for (const l of [...this.editListeners]) l(edit);
    }

    private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
        const r = this.canvas!.getBoundingClientRect();
        return {x: e.clientX - r.left, y: e.clientY - r.top};
    }

    private onPointerDown(e: PointerEvent): void {
        if (this.disposed || !this.scene || (e.pointerType === 'mouse' && e.button !== 0)) return;
        this.host?.focus?.({preventScroll: true});
        const {x, y} = this.local(e);
        if (this.pinch) return;
        if (this.drag) {
            this.startPinch(e.pointerId, x, y);
            return;
        }
        this.canvas!.setPointerCapture?.(e.pointerId);
        const pointId = this.pickPoint(x, y);
        const base = {pointerId: e.pointerId, startX: x, startY: y, lastX: x, lastY: y};
        if (pointId === null) {
            this.drag = {kind: 'orbit', ...base};
            return;
        }
        this.emit({kind: 'select', pointId});
        const start = this.scene.points.find(p => p.id === pointId)!.xyz;
        if (!this.scene.interaction.editable) {
            this.drag = null;
            return;
        }
        const {origin, dir} = this.rayAt(x, y);
        const grabHit = intersectHorizontalPlane(origin, dir, start[2]) ?? start;
        this.drag = {kind: 'point', pointId, startXyz: [...start], grabHit, last: [...start], ...base};
        this.emit({kind: 'point', pointId, xyz: [...start], phase: 'start'});
    }

    /**
     * A second pointer while one is dragging: the gesture becomes a pinch. A point drag ends where it is, so the
     * edit's start/end pair stays balanced, and the first pointer's capture is released.
     */
    private startPinch(secondId: number, x: number, y: number): void {
        const first = this.drag!;
        this.drag = null;
        this.canvas?.releasePointerCapture?.(first.pointerId);
        this.canvas?.setPointerCapture?.(secondId);
        if (first.kind === 'point') this.emit({kind: 'point', pointId: first.pointId!, xyz: first.last ?? first.startXyz!, phase: 'end'});
        const pointers = new Map([[first.pointerId, {x: first.lastX, y: first.lastY}], [secondId, {x, y}]]);
        this.pinch = {pointers, lastDistance: pinchDistance(pointers)};
    }

    private movePinch(id: number, x: number, y: number): void {
        const pinch = this.pinch!;
        const finger = pinch.pointers.get(id);
        if (!finger || !this.scene) return;
        finger.x = x;
        finger.y = y;
        const distance = pinchDistance(pinch.pointers);
        // Fingers moving apart (a larger distance) bring the camera closer.
        if (pinch.lastDistance > 0 && distance > 0) this.emit({kind: 'camera', camera: zoom(this.scene.camera, pinch.lastDistance / distance)});
        pinch.lastDistance = distance;
    }

    private dragPosition(d: DragState, x: number, y: number, shift: boolean): Xyz {
        const start = d.startXyz!;
        if (shift || this.scene?.interaction.zMode) {
            return zModeDrag(start, y - d.startY, this.scene?.camera.distance ?? 1, this.height, this.scene?.camera.el ?? 0, FOV_DEG);
        }
        const {origin, dir} = this.rayAt(x, y);
        const hit = intersectHorizontalPlane(origin, dir, start[2]);
        return hit ? horizontalDrag(start, d.grabHit!, hit) : (d.last ?? start);
    }

    private onPointerMove(e: PointerEvent): void {
        if (this.pinch && !this.disposed) {
            const {x, y} = this.local(e);
            this.movePinch(e.pointerId, x, y);
            return;
        }
        const d = this.drag;
        if (this.disposed || !d || d.pointerId !== e.pointerId || !this.scene) return;
        const {x, y} = this.local(e);
        if (d.kind === 'orbit') {
            this.emit({kind: 'camera', camera: orbit(this.scene.camera, x - d.lastX, y - d.lastY)});
        } else {
            const xyz = this.dragPosition(d, x, y, e.shiftKey);
            d.last = xyz;
            this.emit({kind: 'point', pointId: d.pointId!, xyz, phase: 'move'});
        }
        d.lastX = x;
        d.lastY = y;
    }

    private onPointerEnd(e: PointerEvent, cancelled: boolean): void {
        if (this.disposed) return;
        if (this.pinch) {
            // Either finger lifting ends the pinch; the other one does not start a drag.
            if (this.pinch.pointers.has(e.pointerId)) {
                for (const id of this.pinch.pointers.keys()) this.canvas?.releasePointerCapture?.(id);
                this.pinch = null;
            }
            return;
        }
        const d = this.drag;
        if (!d || d.pointerId !== e.pointerId) {
            // A pointer that never became a drag (a locked point) still holds its capture.
            this.canvas?.releasePointerCapture?.(e.pointerId);
            return;
        }
        this.drag = null;
        this.canvas?.releasePointerCapture?.(e.pointerId);
        if (d.kind !== 'point' || !this.scene) return;
        // Selection is deliberately retained: no deselect edit exists.
        let xyz = d.last ?? d.startXyz!;
        if (!cancelled) {
            const {x, y} = this.local(e);
            xyz = this.dragPosition(d, x, y, e.shiftKey);
        }
        this.emit({kind: 'point', pointId: d.pointId!, xyz, phase: 'end'});
    }

    private onWheel(e: WheelEvent): void {
        if (this.disposed || !this.scene) return;
        e.preventDefault();
        this.emit({kind: 'camera', camera: zoom(this.scene.camera, Math.exp(e.deltaY * 0.001))});
    }

    private onKey(e: KeyboardEvent): void {
        if (this.disposed || !this.scene || e.altKey || e.ctrlKey || e.metaKey) return;
        const cam = this.scene.camera;
        const step = 0.1;
        let next: SurfaceCamera | null = null;
        switch (e.key) {
            case 'ArrowLeft': next = orbit(cam, step / 0.008, 0); break;
            case 'ArrowRight': next = orbit(cam, -step / 0.008, 0); break;
            case 'ArrowUp': next = orbit(cam, 0, step / 0.008); break;
            case 'ArrowDown': next = orbit(cam, 0, -step / 0.008); break;
            case '+': case '=': next = zoom(cam, 0.9); break;
            case '-': case '_': next = zoom(cam, 1 / 0.9); break;
            default: return;
        }
        e.preventDefault();
        this.emit({kind: 'camera', camera: next});
    }
}

