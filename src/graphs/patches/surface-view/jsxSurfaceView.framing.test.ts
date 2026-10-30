import {afterEach, describe, expect, it} from 'vitest';
import {FRAMING_ATTRIBUTE, type SurfaceFraming} from './jsxFraming';
import {makeCameraModel, projectToScreen} from './jsxProjection';
import {JsxSurfaceView} from './jsxSurfaceView';
import type {SceneMeshOwner, SurfaceCamera, SurfaceScene, Xyz} from './surfaceScene';

const N = 6;

/** A bumpy (N+1)^2-vertex patch, one extra vertex no face uses, and four control points. */
function makeScene(extra: Partial<SurfaceScene> = {}): SurfaceScene {
    const positions: number[] = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) positions.push(i, j, Math.sin(i * 0.9) * Math.cos(j * 0.7));
    positions.push(500, 500, 500);
    const faces: number[] = [];
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
            faces.push(a, b, d, a, d, c);
        }
    }
    const meshOwners: SceneMeshOwner[] = [{id: 'a', kind: 'tensor', faceStart: 0, faceCount: faces.length}];
    return {
        revision: 1,
        points: [[0, 0, 0], [6, 0, 1], [0, 6, 0.5], [6, 6, -1]].map((xyz, k) => ({id: `p${k}`, xyz: xyz as Xyz})),
        polylines: [],
        mesh: {positions, faces, visible: true},
        planes: [],
        markers: [],
        labels: [],
        meshOwners,
        camera: {az: 0.7, el: 0.5, distance: 22, projection: 'perspective', target: [3, 3, 0]},
        interaction: {zMode: false, editable: false},
        ...extra,
    };
}

const withCamera = (scene: SurfaceScene, camera: Partial<SurfaceCamera>): SurfaceScene =>
    ({...scene, camera: {...scene.camera, ...camera}});

function sizeHost(host: HTMLElement, width: number, height: number): void {
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: width});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: height});
}

async function mount(scene: SurfaceScene, size: [number, number] = [800, 600]) {
    const host = document.createElement('div');
    sizeHost(host, size[0], size[1]);
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    view.reconcile(scene);
    await view.attach(host);
    view.flush();
    return {host, view};
}

const read = (host: HTMLElement): SurfaceFraming => JSON.parse(host.getAttribute(FRAMING_ATTRIBUTE)!) as SurfaceFraming;
/** Rounded to 0.001 means within half of that of the exact value. */
const near = (value: number, expected: number): void => expect(Math.abs(value - expected)).toBeLessThanOrEqual(0.0005 + 1e-9);

afterEach(() => {
    document.body.innerHTML = '';
});

describe('JsxSurfaceView framing attribute', () => {
    it('publishes size, camera, mesh bounds and projected control points', async () => {
        const {host} = await mount(makeScene(), [800, 600]);
        const framing = read(host);
        expect(Object.keys(framing)).toEqual(['width', 'height', 'camera', 'meshBounds', 'points']);
        expect([framing.width, framing.height]).toEqual([800, 600]);
        expect(framing.camera).toEqual({az: 0.7, el: 0.5, distance: 22, target: [3, 3, 0]});
        expect(Object.keys(framing.meshBounds)).toEqual(['left', 'top', 'right', 'bottom', 'inFrustum']);
        expect(framing.points.map(p => p.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    });

    it('projects points like jsxProjection, in CSS pixels with y down, rounded to 0.001', async () => {
        const scene = makeScene();
        const {host} = await mount(scene, [800, 600]);
        const model = makeCameraModel(scene.camera, {width: 800, height: 600});
        const framing = read(host);
        scene.points.forEach((p, k) => {
            const s = projectToScreen(model, ...p.xyz);
            near(framing.points[k].x, s.x);
            near(framing.points[k].y, s.y);
            // An independent statement of the flip: NDC y up becomes pixel y down.
            near(framing.points[k].y, (1 - s.ndcY) * 300);
            expect(framing.points[k].inFrustum).toBe(true);
        });
    });

    it('bounds the whole indexed mesh inside the frame, ignoring vertices no face uses', async () => {
        const scene = makeScene();
        const {host} = await mount(scene, [800, 600]);
        const {meshBounds, width, height} = read(host);
        expect(meshBounds.inFrustum).toBe(true);
        expect(meshBounds.left).toBeGreaterThan(0);
        expect(meshBounds.top).toBeGreaterThan(0);
        expect(meshBounds.right).toBeLessThan(width);
        expect(meshBounds.bottom).toBeLessThan(height);
        const model = makeCameraModel(scene.camera, {width: 800, height: 600});
        const positions = scene.mesh!.positions;
        const used = new Set(scene.mesh!.faces);
        expect(used.has(positions.length / 3 - 1)).toBe(false);
        let tightLeft = Infinity, tightBottom = -Infinity;
        for (const v of used) {
            const s = projectToScreen(model, positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]);
            expect(s.x).toBeGreaterThanOrEqual(meshBounds.left);
            expect(s.x).toBeLessThanOrEqual(meshBounds.right);
            expect(s.y).toBeGreaterThanOrEqual(meshBounds.top);
            expect(s.y).toBeLessThanOrEqual(meshBounds.bottom);
            tightLeft = Math.min(tightLeft, s.x);
            tightBottom = Math.max(tightBottom, s.y);
        }
        // A box around the mesh, not around the unreferenced far-away vertex.
        expect(meshBounds.left - tightLeft).toBeLessThan(40);
        expect(meshBounds.bottom - tightBottom).toBeLessThan(40);
    });

    it('reports a mesh that the frame crops', async () => {
        const {host} = await mount(withCamera(makeScene(), {distance: 6}), [800, 600]);
        const {meshBounds} = read(host);
        expect(meshBounds.inFrustum).toBe(false);
        expect(meshBounds.left).toBeLessThan(0);
    });

    it('follows host resizes and camera changes, and writes only when the value changes', async () => {
        const scene = makeScene();
        const {host, view} = await mount(scene, [800, 600]);
        const first = host.getAttribute(FRAMING_ATTRIBUTE)!;
        const writes: string[] = [];
        const original = host.setAttribute.bind(host);
        host.setAttribute = (name: string, value: string) => {
            if (name === FRAMING_ATTRIBUTE) writes.push(value);
            original(name, value);
        };
        // The same scene again changes nothing.
        view.reconcile({...scene});
        view.flush();
        expect(writes).toEqual([]);

        sizeHost(host, 500, 700);
        (view as unknown as {measure: () => void}).measure();
        view.flush();
        const resized = read(host);
        expect([resized.width, resized.height]).toEqual([500, 700]);
        expect(host.getAttribute(FRAMING_ATTRIBUTE)).not.toBe(first);
        const model = makeCameraModel(scene.camera, {width: 500, height: 700});
        near(resized.points[1].x, projectToScreen(model, ...scene.points[1].xyz).x);

        view.reconcile(withCamera(scene, {az: 1.4, distance: 25}));
        view.flush();
        const turned = read(host);
        expect(turned.camera).toMatchObject({az: 1.4, distance: 25});
        const turnedModel = makeCameraModel({...scene.camera, az: 1.4, distance: 25}, {width: 500, height: 700});
        near(turned.points[1].y, projectToScreen(turnedModel, ...scene.points[1].xyz).y);
        expect(writes.length).toBe(2);
    });

    it('is removed without mesh owners, without a visible mesh and on dispose', async () => {
        const scene = makeScene();
        const {host, view} = await mount(scene);
        expect(host.hasAttribute(FRAMING_ATTRIBUTE)).toBe(true);
        view.reconcile({...scene, revision: 2, meshOwners: []});
        view.flush();
        expect(host.hasAttribute(FRAMING_ATTRIBUTE)).toBe(false);
        view.reconcile({...scene, revision: 3});
        view.flush();
        expect(host.hasAttribute(FRAMING_ATTRIBUTE)).toBe(true);
        view.reconcile({...scene, revision: 4, mesh: {...scene.mesh!, visible: false}});
        view.flush();
        expect(host.hasAttribute(FRAMING_ATTRIBUTE)).toBe(false);
        view.reconcile({...scene, revision: 5});
        view.flush();
        expect(host.hasAttribute(FRAMING_ATTRIBUTE)).toBe(true);
        view.dispose();
        expect(host.hasAttribute(FRAMING_ATTRIBUTE)).toBe(false);
    });
});
