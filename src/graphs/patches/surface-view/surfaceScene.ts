/**
 * Renderer-agnostic scene contract for Bezier patch surface views.
 * Plain data only: no Three, React or JSXGraph types. The host owns the
 * authoritative scene; the view renders it via reconcile() and reports edit
 * intents that the host applies before calling reconcile() again.
 */

export type Xyz = [number, number, number];

/** `iso-v` and `iso-w` are the second and third iso-line families of a triangular patch; `iso` is the first (and the tensor patch's only). */
export type PolylineRole = 'net' | 'iso' | 'iso-v' | 'iso-w' | 'boundary' | 'construction' | 'highlight';
export type MarkerRole = 'evaluated' | 'construction';

export interface ScenePoint {
    id: string;
    xyz: Xyz;
    selected?: boolean;
}

export interface ScenePolyline {
    id: string;
    role: PolylineRole;
    points: Xyz[];
}

export interface SceneMesh {
    /** Flat xyz triples. */
    positions: Float32Array | number[];
    /** Triangle vertex indices (multiple of 3). */
    faces: number[];
    visible: boolean;
    /**
     * How far the facets may lie in front of the surface they approximate (world units). A label anchored on the true
     * surface is not hidden by facets that close; unset means 0.
     */
    chordTolerance?: number;
}

export interface SceneMarker {
    id: string;
    xyz: Xyz;
    role: MarkerRole;
}

export interface SceneLabel {
    id: string;
    /** LaTeX source; the host typesets it. */
    text: string;
    anchor: Xyz;
    pointId?: string;
}

export interface SurfaceCamera {
    /** Azimuth around the z axis, radians. */
    az: number;
    /** Elevation above the xy plane, radians. */
    el: number;
    distance: number;
    projection: 'perspective';
    target: Xyz;
}

export interface SurfaceScene {
    /** Bumps when geometry (mesh/polylines/points) changes. */
    revision: number;
    points: ScenePoint[];
    polylines: ScenePolyline[];
    mesh?: SceneMesh;
    markers: SceneMarker[];
    labels: SceneLabel[];
    camera: SurfaceCamera;
    interaction: { zMode: boolean; editable: boolean };
}

export type SurfaceEdit =
    | { kind: 'select'; pointId: string }
    | { kind: 'point'; pointId: string; xyz: Xyz; phase: 'start' | 'move' | 'end' }
    | { kind: 'camera'; camera: SurfaceCamera };

export interface LabelLayout {
    id: string;
    text: string;
    /** CSS pixels from the canvas top-left. */
    x: number;
    y: number;
    visible: boolean;
}

export interface SurfaceCapture {
    /** PNG data URL of the current depth-correct render. */
    dataUrl: string;
    width: number;
    height: number;
    labels: LabelLayout[];
}

export interface AttachOptions {
    /** Accessible name for the focusable host; supplied by the host (localized). */
    ariaLabel?: string;
    /** Keyboard help for the host, exposed through `aria-describedby`; supplied by the host (localized). */
    description?: string;
    /** The WebGL context was lost: the view cannot draw until `onContextRestored`. */
    onContextLost?: () => void;
    onContextRestored?: () => void;
}

export interface SurfaceView {
    attach(host: HTMLElement, options?: AttachOptions): Promise<void>;
    /** Renders plain data; never emits edits. May be called before attach resolves. */
    reconcile(scene: SurfaceScene): void;
    onEdit(listener: (edit: SurfaceEdit) => void): () => void;
    setAriaLabel(label: string, description?: string): void;
    /**
     * Subscribes to the projected, occlusion-tested label layout. It is delivered after a render in which the layout
     * changed (camera, scene or resize), never for an unchanged layout, and not after dispose. Returns an unsubscribe.
     */
    onLayout(listener: (labels: LabelLayout[]) => void): () => void;
    capture(): Promise<SurfaceCapture>;
    /** Refits the camera to the control net and emits a camera edit. */
    fitCamera(): void;
    dispose(): void;
}

function finiteXyz(p: readonly number[], where: string): void {
    if (p.length !== 3 || !p.every(Number.isFinite)) {
        throw new Error(`Surface scene has non-finite coordinates in ${where}`);
    }
}

/** Throws on non-finite coordinates (a host bug, not a user error). */
export function assertFiniteScene(scene: SurfaceScene): void {
    for (const p of scene.points) finiteXyz(p.xyz, `point ${p.id}`);
    for (const l of scene.polylines) l.points.forEach(p => finiteXyz(p, `polyline ${l.id}`));
    for (const m of scene.markers) finiteXyz(m.xyz, `marker ${m.id}`);
    for (const l of scene.labels) finiteXyz(l.anchor, `label ${l.id}`);
    const c = scene.camera;
    finiteXyz(c.target, 'camera target');
    if (![c.az, c.el, c.distance].every(Number.isFinite)) {
        throw new Error('Surface scene has non-finite camera values');
    }
    if (scene.mesh) {
        const pos = scene.mesh.positions;
        for (let i = 0; i < pos.length; i++) {
            if (!Number.isFinite(pos[i])) throw new Error('Surface scene has non-finite coordinates in mesh');
        }
        if (scene.mesh.faces.length % 3 !== 0 || scene.mesh.faces.some(f => !(f >= 0 && f < pos.length / 3))) {
            throw new Error('Surface scene mesh has invalid faces');
        }
    }
}
