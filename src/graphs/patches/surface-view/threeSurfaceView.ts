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

/** Elderflower palette (from the reviewed prototype). */
export const SURFACE_COLORS = {
    net: 0x526950,
    iso: 0x547957,
    boundary: 0x643f2f,
    construction: 0xc45f3b,
    highlight: 0x1f5fbf,
    point: 0x7d9d61,
    selected: 0x1f5fbf,
    marker: 0xca5c37,
    surface: 0xdcae78,
} as const;

const POINT_RADIUS = 0.105;
const PICK_RADIUS_PX = 20;
const OCCLUSION_EPS = 1e-3;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 200;

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
    private readonly cleanups: Array<() => void> = [];

    private disposed = false;
    private attachStarted = false;
    private ariaLabel = '';
    private scene: SurfaceScene | null = null;
    private appliedRevision = -1;

    private three: Three | null = null;
    private host: HTMLElement | null = null;
    private hostPrev: { tabIndex: string | null; aria: string | null } | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private renderer: RendererLike | null = null;
    private glScene: ThreeNs.Scene | null = null;
    private glCamera: ThreeNs.PerspectiveCamera | null = null;
    private geometryLayer: ThreeNs.Group | null = null;
    private dynamicLayer: ThreeNs.Group | null = null;
    private surfaceMesh: ThreeNs.Mesh | null = null;
    private pointMeshes = new Map<string, ThreeNs.Mesh>();
    private observer: ResizeObserver | null = null;
    private raf = 0;
    private width = DEFAULT_WIDTH;
    private height = DEFAULT_HEIGHT;
    private drag: DragState | null = null;

    // Shared resources, disposed in dispose().
    private shared: Array<{ dispose(): void }> = [];
    private sphereGeometry: ThreeNs.SphereGeometry | null = null;
    private markerGeometry: ThreeNs.SphereGeometry | null = null;
    private lineMaterials = new Map<PolylineRole, ThreeNs.LineBasicMaterial>();
    private pointMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private selectedMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private evaluatedMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private constructionMaterial: ThreeNs.MeshBasicMaterial | null = null;
    private surfaceMaterial: ThreeNs.MeshStandardMaterial | null = null;

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

    setAriaLabel(label: string): void {
        this.ariaLabel = label;
        if (this.host && !this.disposed) this.host.setAttribute('aria-label', label);
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
            const visible = p.inFrustum && !this.isOccluded(label.anchor, label.pointId);
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
            this.host.removeAttribute('data-surface-framing');
        }
        this.renderer = null;
        this.canvas = null;
        this.glScene = null;
        this.glCamera = null;
        this.geometryLayer = null;
        this.dynamicLayer = null;
        this.surfaceMesh = null;
        this.editListeners.clear();
        this.drag = null;
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

        this.hostPrev = {tabIndex: host.getAttribute('tabindex'), aria: host.getAttribute('aria-label')};
        host.tabIndex = 0;
        if (this.ariaLabel) host.setAttribute('aria-label', this.ariaLabel);
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
        this.pointMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.point}));
        this.selectedMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.selected}));
        this.evaluatedMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.marker}));
        this.constructionMaterial = this.track(new T.MeshBasicMaterial({color: SURFACE_COLORS.construction}));
        this.surfaceMaterial = this.track(new T.MeshStandardMaterial({
            color: SURFACE_COLORS.surface, roughness: 0.74, metalness: 0, side: T.DoubleSide,
            polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        }));

        this.measure();
        this.listen(canvas, 'pointerdown', (e: PointerEvent) => this.onPointerDown(e));
        this.listen(canvas, 'pointermove', (e: PointerEvent) => this.onPointerMove(e));
        this.listen(canvas, 'pointerup', (e: PointerEvent) => this.onPointerEnd(e, false));
        this.listen(canvas, 'pointercancel', (e: PointerEvent) => this.onPointerEnd(e, true));
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
            const mesh = new T.Mesh(
                this.markerGeometry!, m.role === 'evaluated' ? this.evaluatedMaterial! : this.constructionMaterial!);
            mesh.position.set(...m.xyz);
            this.dynamicLayer.add(mesh);
        }
        this.applyCamera(scene.camera);
        this.dynamicLayer.updateMatrixWorld(true);
        this.requestRender();
    }

    private lineMaterial(T: Three, role: PolylineRole): ThreeNs.LineBasicMaterial {
        let m = this.lineMaterials.get(role);
        if (!m) {
            m = this.track(new T.LineBasicMaterial({color: SURFACE_COLORS[role]}));
            this.lineMaterials.set(role, m);
        }
        return m;
    }

    private rebuildGeometry(T: Three, scene: SurfaceScene): void {
        const layer = this.geometryLayer!;
        this.clearLayer(layer);
        this.surfaceMesh = null;
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
            obj.userData.ownsGeometry = true;
            layer.add(obj);
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
        if (this.disposed || !this.renderer || !this.glScene || !this.glCamera) return;
        this.renderer.render(this.glScene, this.glCamera);
        this.publishLayout();
        this.publishFraming();
    }

    /**
     * Mirrors the rendered framing onto the host as one read-only `data-surface-framing` attribute: the canvas size, the
     * camera and every control point projected into canvas pixels. The catalog preview capture reads it as evidence
     * that the whole net is in frame; nothing in the app reads it back.
     */
    private publishFraming(): void {
        if (!this.host || !this.scene) return;
        const round = (v: number) => Math.round(v * 1000) / 1000;
        const camera = this.scene.camera;
        const framing = {
            width: this.width, height: this.height,
            camera: {az: camera.az, el: camera.el, distance: camera.distance, target: [...camera.target]},
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

    /** True when the mesh or another control point lies between the camera and xyz. */
    private isOccluded(xyz: Xyz, ownPointId?: string): boolean {
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
        return ray.intersectObjects(blockers, false).some(h => h.distance < dist - OCCLUSION_EPS);
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

    private dragPosition(d: DragState, x: number, y: number, shift: boolean): Xyz {
        const start = d.startXyz!;
        if (shift || this.scene?.interaction.zMode) {
            return zModeDrag(start, y - d.startY, this.scene?.camera.distance ?? 1, this.height);
        }
        const {origin, dir} = this.rayAt(x, y);
        const hit = intersectHorizontalPlane(origin, dir, start[2]);
        return hit ? horizontalDrag(start, d.grabHit!, hit) : (d.last ?? start);
    }

    private onPointerMove(e: PointerEvent): void {
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
        const d = this.drag;
        if (this.disposed || !d || d.pointerId !== e.pointerId) return;
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

