import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import * as THREE from 'three';
import {SURFACE_COLORS, SURFACE_DASH, ThreeSurfaceView, type RendererLike} from './threeSurfaceView';
import {assertFiniteScene, type LabelLayout, type PolylineRole, type ScenePlane, type SurfaceEdit, type SurfaceScene, type Xyz} from './surfaceScene';
import {fitCameraTo} from './surfaceMath';

function makeScene(overrides: Partial<SurfaceScene> = {}): SurfaceScene {
    const points = [] as SurfaceScene['points'];
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const id = `p${i}${j}`;
            ids.push(id);
            points.push({id, xyz: [i * 2 - 3, j * 2 - 3, 0]});
        }
    }
    const camera = fitCameraTo(points.map(p => p.xyz), 300 / 200, {
        az: 0.3, el: 0.9, distance: 10, projection: 'perspective', target: [0, 0, 0],
    });
    return {
        revision: 1,
        points,
        polylines: [{id: 'n0', role: 'net', points: [[-3, -3, 0], [-3, 3, 0]]}],
        mesh: {positions: [-3, -3, -1, 3, -3, -1, 0, 3, -1], faces: [0, 1, 2], visible: false},
        markers: [{id: 'm', xyz: [0, 0, 0.5], role: 'evaluated'}],
        labels: points.map(p => ({id: `l-${p.id}`, text: `P_{${p.id}}`, anchor: p.xyz, pointId: p.id})),
        camera,
        interaction: {zMode: false, editable: true},
        ...overrides,
    };
}

interface Harness {
    view: ThreeSurfaceView;
    host: HTMLElement;
    renderer: RendererLike & { rendered: Array<[THREE.Scene, THREE.Camera]> };
    created: number;
    release: () => void;
}

function harness(deferred = false): Harness {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', {value: 300});
    Object.defineProperty(host, 'clientHeight', {value: 200});
    document.body.appendChild(host);
    const renderer = {
        domElement: null as unknown as HTMLCanvasElement,
        rendered: [] as Array<[THREE.Scene, THREE.Camera]>,
        setPixelRatio: vi.fn(),
        setSize: vi.fn(),
        setClearColor: vi.fn(),
        render(s: THREE.Scene, c: THREE.Camera) { this.rendered.push([s, c]); },
        dispose: vi.fn(),
        forceContextLoss: vi.fn(),
    };
    const h = {created: 0} as Harness;
    let release!: () => void;
    const gate = deferred ? new Promise<void>(r => { release = r; }) : Promise.resolve();
    const view = new ThreeSurfaceView({
        loadThree: async () => { await gate; return THREE; },
        createRenderer: (_t, canvas) => {
            h.created++;
            canvas.toDataURL = () => 'data:image/png;base64,AAAA';
            renderer.domElement = canvas;
            return renderer;
        },
    });
    return Object.assign(h, {view, host, renderer, release: release ?? (() => undefined)});
}

function fire(el: EventTarget, type: string, x: number, y: number, init: MouseEventInit = {}, pointerId = 1): void {
    const e = new MouseEvent(type, {clientX: x, clientY: y, bubbles: true, cancelable: true, ...init});
    Object.assign(e, {pointerId, pointerType: 'touch'});
    el.dispatchEvent(e);
}

async function screenOf(view: ThreeSurfaceView, pointId: string): Promise<{x: number; y: number; visible: boolean}> {
    const cap = await view.capture();
    const l = cap.labels.find(label => label.id === `l-${pointId}`)!;
    return l;
}

let adds: Array<[EventTarget, string]>;
let removes: Array<[EventTarget, string]>;
const origAdd = EventTarget.prototype.addEventListener;
const origRemove = EventTarget.prototype.removeEventListener;

beforeEach(() => {
    adds = [];
    removes = [];
    EventTarget.prototype.addEventListener = function (this: EventTarget, t: string, ...rest: [never]) {
        adds.push([this, t]);
        return origAdd.call(this, t, ...rest);
    } as typeof origAdd;
    EventTarget.prototype.removeEventListener = function (this: EventTarget, t: string, ...rest: [never]) {
        removes.push([this, t]);
        return origRemove.call(this, t, ...rest);
    } as typeof origRemove;
});

afterEach(() => {
    EventTarget.prototype.addEventListener = origAdd;
    EventTarget.prototype.removeEventListener = origRemove;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('ThreeSurfaceView lifecycle', () => {
    it('publishes finite geometry samples from the rendered mesh owner and clears them on hide or empty ownership', async () => {
        const h = harness();
        const mesh = {positions: [0.1, 0.2, 0.3, 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3], faces: [0, 1, 2, 1, 3, 2, 0, 2, 3], visible: true};
        const owner = {id: 'tensor-patch-0', kind: 'tensor' as const, faceStart: 0, faceCount: 9};
        const scene = makeScene({mesh, meshOwners: [owner]});
        await h.view.attach(h.host);
        h.view.reconcile(scene);
        await h.view.capture();
        expect(JSON.parse(h.host.getAttribute('data-rendered-surface-owners')!)).toEqual([{id: owner.id, kind: owner.kind, geometrySamples: [
            [Math.fround(0.1), Math.fround(0.2), Math.fround(0.3)],
            [Math.fround(1.1), Math.fround(1.2), Math.fround(1.3)],
            [Math.fround(0.1), Math.fround(0.2), Math.fround(0.3)],
        ]}]);
        vi.spyOn(h.renderer, 'render').mockImplementationOnce(() => { throw new Error('render failed'); });
        await expect(h.view.capture()).rejects.toThrow('render failed');
        expect(h.host.hasAttribute('data-rendered-surface-owners')).toBe(false);

        const invalid = makeScene({mesh, meshOwners: [owner]});
        invalid.points[0].xyz[0] = Number.NaN;
        expect(() => h.view.reconcile(invalid)).toThrow(/non-finite/);
        expect(h.host.hasAttribute('data-rendered-surface-owners')).toBe(false);

        h.view.reconcile({...scene, revision: 2, mesh: {...mesh, visible: false}});
        expect(h.host.hasAttribute('data-rendered-surface-owners')).toBe(false);
        h.view.reconcile({...scene, revision: 3, meshOwners: [{...owner, faceCount: 0}]});
        await h.view.capture();
        expect(h.host.hasAttribute('data-rendered-surface-owners')).toBe(false);
        h.view.reconcile({...scene, revision: 4, mesh: {...mesh, faces: [0, 0, 0]}, meshOwners: [{...owner, faceCount: 3}]});
        await h.view.capture();
        expect(h.host.hasAttribute('data-rendered-surface-owners')).toBe(false);
        h.view.dispose();
        expect(h.host.hasAttribute('data-rendered-surface-owners')).toBe(false);
    });

    it('applies a scene reconciled before attach resolves', async () => {
        const h = harness(true);
        const attached = h.view.attach(h.host, {ariaLabel: 'Surface'});
        h.view.reconcile(makeScene());
        h.release();
        await attached;
        const cap = await h.view.capture();
        expect(cap.labels).toHaveLength(16);
        expect(h.host.getAttribute('aria-label')).toBe('Surface');
        expect(h.host.tabIndex).toBe(0);
        expect(h.host.querySelector('canvas')).not.toBeNull();
        h.view.dispose();
    });

    it('creates nothing when disposed before the import resolves', async () => {
        const h = harness(true);
        const attached = h.view.attach(h.host);
        h.view.dispose();
        h.release();
        await attached;
        expect(h.created).toBe(0);
        expect(h.host.querySelector('canvas')).toBeNull();
        expect(adds.filter(([t]) => t === h.host)).toHaveLength(0);
        await expect(h.view.capture()).rejects.toThrow();
    });

    it('releases every geometry, material, listener, canvas and frame on dispose', async () => {
        const h = harness();
        const seen = new Set<{ dispose(): void }>();
        const disposed = new Set<unknown>();
        const gd = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function (this: THREE.BufferGeometry) { disposed.add(this); });
        const md = vi.spyOn(THREE.Material.prototype, 'dispose').mockImplementation(function (this: THREE.Material) { disposed.add(this); });
        const collect = () => {
            const [sc] = h.renderer.rendered.at(-1)!;
            sc.traverse(o => {
                const m = o as THREE.Mesh;
                if (m.geometry) seen.add(m.geometry);
                const mat = m.material as THREE.Material | THREE.Material[] | undefined;
                for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) seen.add(x);
            });
        };
        await h.view.attach(h.host);
        const raf = vi.spyOn(globalThis, 'cancelAnimationFrame');
        h.view.reconcile(makeScene());
        await h.view.capture();
        collect();
        h.view.reconcile(makeScene({revision: 2}));
        await h.view.capture();
        collect();
        const addedBefore = adds.length;
        expect(addedBefore).toBeGreaterThan(0);
        h.view.reconcile(makeScene({revision: 3}));
        h.view.dispose();
        expect(seen.size).toBeGreaterThan(5);
        for (const r of seen) expect(disposed.has(r), 'resource not disposed').toBe(true);
        expect(gd).toHaveBeenCalled();
        expect(md).toHaveBeenCalled();
        expect(h.renderer.dispose).toHaveBeenCalledTimes(1);
        expect(h.renderer.forceContextLoss).toHaveBeenCalledTimes(1);
        expect(raf).toHaveBeenCalled();
        expect(h.host.querySelector('canvas')).toBeNull();
        expect(h.host.hasAttribute('tabindex')).toBe(false);
        for (const [t, type] of adds) {
            expect(removes.some(([rt, rtype]) => rt === t && rtype === type), `${type} listener leaked`).toBe(true);
        }
    });

    it('dispose twice is a no-op', async () => {
        const h = harness();
        await h.view.attach(h.host);
        h.view.dispose();
        h.view.dispose();
        expect(h.renderer.dispose).toHaveBeenCalledTimes(1);
        expect(h.renderer.forceContextLoss).toHaveBeenCalledTimes(1);
        expect(() => h.view.reconcile(makeScene())).not.toThrow();
    });

    it('rejects non-finite coordinates', async () => {
        const h = harness();
        await h.view.attach(h.host);
        const scene = makeScene();
        scene.points[0].xyz = [NaN, 0, 0];
        expect(() => h.view.reconcile(scene)).toThrow(/non-finite/);
        h.view.dispose();
    });

    it('rejects a plane with a non-finite corner, in the view and in the scene check', async () => {
        const h = harness();
        await h.view.attach(h.host);
        const scene = makeScene({planes: [{id: 'pl', corners: [[0, 0, 0], [1, 0, 0], [NaN, 1, 0], [0, 1, 0]]}]});
        expect(() => assertFiniteScene(scene)).toThrow(/plane pl/);
        expect(() => h.view.reconcile(scene)).toThrow(/non-finite/);
        const infinite = makeScene({planes: [{id: 'pl', corners: [[0, 0, 0], [1, 0, 0], [1, Infinity, 0], [0, 1, 0]]}]});
        expect(() => assertFiniteScene(infinite)).toThrow(/plane pl/);
        expect(() => assertFiniteScene(makeScene({planes: [{id: 'pl', corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]}]}))).not.toThrow();
        h.view.dispose();
    });

    it('reconcile never emits edits', async () => {
        const h = harness();
        const edits: SurfaceEdit[] = [];
        h.view.onEdit(e => edits.push(e));
        h.view.reconcile(makeScene());
        await h.view.attach(h.host);
        h.view.reconcile(makeScene({revision: 2}));
        await h.view.capture();
        expect(edits).toEqual([]);
        h.view.dispose();
    });

    it('unsubscribes edit listeners', async () => {
        const h = harness();
        await h.view.attach(h.host);
        h.view.reconcile(makeScene());
        const edits: SurfaceEdit[] = [];
        const off = h.view.onEdit(e => edits.push(e));
        off();
        h.view.fitCamera();
        expect(edits).toEqual([]);
        h.view.dispose();
    });
});

describe('ThreeSurfaceView interaction', () => {
    async function ready(scene = makeScene()) {
        const h = harness();
        await h.view.attach(h.host);
        h.view.reconcile(scene);
        const edits: SurfaceEdit[] = [];
        h.view.onEdit(e => edits.push(e));
        return {h, edits, canvas: h.host.querySelector('canvas')!};
    }

    it('drags in the horizontal plane at the starting z and keeps selection', async () => {
        const scene = makeScene();
        scene.points[5].xyz = [-1, -1, 0.75];
        const {h, edits, canvas} = await ready(scene);
        const p = await screenOf(h.view, 'p11');
        expect(p.visible).toBe(true);
        fire(canvas, 'pointerdown', p.x, p.y);
        fire(canvas, 'pointermove', p.x, p.y);
        fire(canvas, 'pointermove', p.x + 12, p.y + 7);
        fire(canvas, 'pointermove', p.x + 20, p.y + 9);
        fire(canvas, 'pointerup', p.x + 20, p.y + 9);
        expect(edits[0]).toEqual({kind: 'select', pointId: 'p11'});
        const pts = edits.filter((e): e is Extract<SurfaceEdit, {kind: 'point'}> => e.kind === 'point');
        expect(pts.map(e => e.phase)).toEqual(['start', 'move', 'move', 'move', 'end']);
        // A zero-displacement move leaves x/y exactly at the grabbed point (no plane offset).
        expect(pts[1].xyz[0]).toBeCloseTo(-1, 9);
        expect(pts[1].xyz[1]).toBeCloseTo(-1, 9);
        expect(pts[0].xyz).toEqual([-1, -1, 0.75]);
        for (const e of pts) expect(e.xyz[2]).toBe(0.75);
        expect(pts[2].xyz[0]).not.toBeCloseTo(-1, 3);
        expect(pts[4].xyz).toEqual(pts[3].xyz);
        // Selection retained: pointerup/cancel emit no further select/deselect edits and nothing moves points.
        expect(edits.filter(e => e.kind === 'select')).toHaveLength(1);
        expect(edits.some(e => e.kind === 'camera')).toBe(false);
        // Adapter did not mutate the authoritative scene.
        expect(scene.points[5].xyz).toEqual([-1, -1, 0.75]);
        h.view.dispose();
    });

    it('shift and zMode change only z, camera stays still', async () => {
        for (const mode of ['shift', 'zMode'] as const) {
            const scene = makeScene({interaction: {zMode: mode === 'zMode', editable: true}});
            const {h, edits, canvas} = await ready(scene);
            const p = await screenOf(h.view, 'p11');
            fire(canvas, 'pointerdown', p.x, p.y, {shiftKey: mode === 'shift'});
            fire(canvas, 'pointermove', p.x + 30, p.y - 40, {shiftKey: mode === 'shift'});
            fire(canvas, 'pointerup', p.x + 30, p.y - 40, {shiftKey: mode === 'shift'});
            const pts = edits.filter((e): e is Extract<SurfaceEdit, {kind: 'point'}> => e.kind === 'point');
            const move = pts.find(e => e.phase === 'move')!;
            expect(move.xyz[0]).toBe(-1);
            expect(move.xyz[1]).toBe(-1);
            expect(move.xyz[2]).toBeGreaterThan(0);
            expect(edits.some(e => e.kind === 'camera')).toBe(false);
            h.view.dispose();
        }
    });

    it('cancel ends the drag and emits no deselect', async () => {
        const {h, edits, canvas} = await ready();
        const p = await screenOf(h.view, 'p11');
        fire(canvas, 'pointerdown', p.x, p.y);
        fire(canvas, 'pointermove', p.x + 10, p.y);
        fire(canvas, 'pointercancel', p.x + 10, p.y);
        const phases = edits.filter(e => e.kind === 'point').map(e => (e as {phase: string}).phase);
        expect(phases).toEqual(['start', 'move', 'end']);
        expect(edits.filter(e => e.kind === 'select')).toHaveLength(1);
        h.view.dispose();
    });

    it('orbits on empty space and ignores moves after disposal', async () => {
        const {h, edits, canvas} = await ready();
        fire(canvas, 'pointerdown', 2, 2);
        fire(canvas, 'pointermove', 40, 30);
        const cam = edits.find(e => e.kind === 'camera') as Extract<SurfaceEdit, {kind: 'camera'}>;
        expect(cam.camera.az).not.toBe(0.3);
        expect(edits.some(e => e.kind === 'select' || e.kind === 'point')).toBe(false);
        h.view.dispose();
    });

    it('zooms with the wheel and keys, orbits with arrows', async () => {
        const {h, edits, canvas} = await ready();
        canvas.dispatchEvent(Object.assign(new MouseEvent('wheel', {cancelable: true, bubbles: true}), {deltaY: 100}));
        h.host.dispatchEvent(new KeyboardEvent('keydown', {key: '+', bubbles: true}));
        h.host.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
        const cams = edits.filter((e): e is Extract<SurfaceEdit, {kind: 'camera'}> => e.kind === 'camera');
        expect(cams).toHaveLength(3);
        expect(cams[0].camera.distance).toBeGreaterThan(makeScene().camera.distance);
        expect(cams[1].camera.distance).toBeLessThan(makeScene().camera.distance);
        expect(cams[2].camera.az).not.toBe(0.3);
        h.view.dispose();
    });

    it('marks labels hidden when the mesh occludes them or outside the frustum', async () => {
        const scene = makeScene({
            mesh: {positions: [-20, -20, 0.5, 20, -20, 0.5, 0, 20, 0.5], faces: [0, 1, 2], visible: true},
            camera: {az: 0, el: 0.2, distance: 12, projection: 'perspective', target: [0, 0, 0]},
        });
        scene.points = scene.points.map(p => ({...p, xyz: [p.xyz[0], p.xyz[1], -1] as Xyz}));
        scene.labels = scene.points.map(p => ({id: `l-${p.id}`, text: p.id, anchor: p.xyz, pointId: p.id}));
        scene.labels.push({id: 'far', text: 'far', anchor: [500, 0, 0]});
        const {h} = await ready(scene);
        const cap = await h.view.capture();
        expect(cap.width).toBe(300);
        expect(cap.height).toBe(200);
        expect(cap.dataUrl.startsWith('data:image/png')).toBe(true);
        expect(cap.labels.find(l => l.id === 'l-p11')!.visible).toBe(false);
        expect(cap.labels.find(l => l.id === 'far')!.visible).toBe(false);
        h.view.reconcile({...scene, mesh: {...scene.mesh!, visible: false}});
        const open = await h.view.capture();
        expect(open.labels.find(l => l.id === 'l-p11')!.visible).toBe(true);
        h.view.dispose();
    });
});

describe('ThreeSurfaceView touch zoom', () => {
    async function ready() {
        const h = harness();
        await h.view.attach(h.host);
        h.view.reconcile(makeScene());
        const edits: SurfaceEdit[] = [];
        h.view.onEdit(e => edits.push(e));
        const canvas = h.host.querySelector('canvas')!;
        const capture = vi.fn();
        const release = vi.fn();
        canvas.setPointerCapture = capture;
        canvas.releasePointerCapture = release;
        return {h, edits, canvas, capture, release};
    }
    const distanceOf = (edit: SurfaceEdit | undefined) => (edit as Extract<SurfaceEdit, { kind: 'camera' }>).camera.distance;

    it('two fingers moving apart zoom in, together zoom out, and no orbit edit is emitted', async () => {
        const {h, edits, canvas} = await ready();
        const base = makeScene().camera.distance;
        fire(canvas, 'pointerdown', 10, 100, {}, 1);
        fire(canvas, 'pointerdown', 50, 100, {}, 2);
        fire(canvas, 'pointermove', 90, 100, {}, 2);
        expect(edits.map(e => e.kind)).toEqual(['camera']);
        expect(distanceOf(edits[0])).toBeCloseTo(base * 40 / 80, 9);
        fire(canvas, 'pointermove', 20, 100, {}, 2);
        expect(distanceOf(edits[1])).toBeGreaterThan(distanceOf(edits[0]));
        h.view.dispose();
    });

    it('a second finger during a point drag ends the drag where it is and releases its capture', async () => {
        const {h, edits, canvas, release} = await ready();
        const p = await screenOf(h.view, 'p11');
        fire(canvas, 'pointerdown', p.x, p.y, {}, 1);
        fire(canvas, 'pointermove', p.x + 15, p.y + 5, {}, 1);
        const before = edits.length;
        fire(canvas, 'pointerdown', 200, 150, {}, 2);
        const ended = edits.slice(before);
        expect(ended).toHaveLength(1);
        expect(ended[0]).toMatchObject({kind: 'point', pointId: 'p11', phase: 'end'});
        expect(release).toHaveBeenCalledWith(1);
        // Neither finger drags the point any more.
        fire(canvas, 'pointermove', p.x + 40, p.y, {}, 1);
        expect(edits.slice(before + 1).every(e => e.kind === 'camera')).toBe(true);
        h.view.dispose();
    });

    it('lifting a finger ends the pinch, releases both captures and the other finger does not orbit', async () => {
        const {h, edits, canvas, release} = await ready();
        fire(canvas, 'pointerdown', 10, 100, {}, 1);
        fire(canvas, 'pointerdown', 50, 100, {}, 2);
        fire(canvas, 'pointerup', 50, 100, {}, 2);
        expect(release).toHaveBeenCalledWith(1);
        expect(release).toHaveBeenCalledWith(2);
        fire(canvas, 'pointermove', 80, 100, {}, 1);
        expect(edits).toEqual([]);
        // A new gesture works again.
        fire(canvas, 'pointerdown', 30, 100, {}, 3);
        fire(canvas, 'pointermove', 60, 100, {}, 3);
        expect(edits.map(e => e.kind)).toEqual(['camera']);
        h.view.dispose();
    });
});

describe('ThreeSurfaceView accessibility and context loss', () => {
    it('the host is an application region with a short name and key help as its description, restored on dispose', async () => {
        const h = harness();
        h.host.setAttribute('role', 'group');
        await h.view.attach(h.host, {ariaLabel: 'Surface', description: 'Arrow keys orbit.'});
        expect(h.host.getAttribute('role')).toBe('application');
        expect(h.host.getAttribute('aria-label')).toBe('Surface');
        const describedBy = h.host.getAttribute('aria-describedby')!;
        expect(document.getElementById(describedBy)?.textContent).toBe('Arrow keys orbit.');
        h.view.setAriaLabel('Ploskev', 'Tipke.');
        expect(document.getElementById(describedBy)?.textContent).toBe('Tipke.');
        h.view.dispose();
        expect(h.host.getAttribute('role')).toBe('group');
        expect(h.host.hasAttribute('aria-describedby')).toBe(false);
        expect(document.getElementById(describedBy)).toBeNull();
    });

    it('reports a lost context, stops drawing, and draws again once it is restored', async () => {
        const h = harness();
        const lost = vi.fn(), restored = vi.fn();
        await h.view.attach(h.host, {onContextLost: lost, onContextRestored: restored});
        h.view.reconcile(makeScene());
        const canvas = h.host.querySelector('canvas')!;
        const event = new Event('webglcontextlost', {cancelable: true});
        canvas.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(lost).toHaveBeenCalledTimes(1);
        const drawn = h.renderer.rendered.length;
        h.view.reconcile(makeScene({revision: 2}));
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(h.renderer.rendered).toHaveLength(drawn);
        canvas.dispatchEvent(new Event('webglcontextrestored'));
        expect(restored).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => expect(h.renderer.rendered.length).toBeGreaterThan(drawn));
        h.view.dispose();
    });
});

describe('ThreeSurfaceView surface label occlusion', () => {
    // A coarse facet at z = 0 seen from above; the label sits on the "true" surface just behind it.
    const scene = (anchorZ: number, chordTolerance?: number) => makeScene({
        mesh: {positions: [-20, -20, 0, 20, -20, 0, 0, 20, 0], faces: [0, 1, 2], visible: true, ...(chordTolerance === undefined ? {} : {chordTolerance})},
        camera: {az: 0, el: 0.6, distance: 12, projection: 'perspective', target: [0, 0, 0]},
        labels: [{id: 'surface', text: 'S', anchor: [0, 0, anchorZ]}],
    });
    const visibleLabel = async (s: SurfaceScene) => {
        const h = harness();
        await h.view.attach(h.host);
        h.view.reconcile(s);
        const cap = await h.view.capture();
        h.view.dispose();
        return cap.labels[0].visible;
    };

    it('is hidden by a facet in front of it without a tolerance, shown within the chord tolerance, hidden beyond it', async () => {
        expect(await visibleLabel(scene(-0.05))).toBe(false);
        expect(await visibleLabel(scene(-0.05, 0.1))).toBe(true);
        expect(await visibleLabel(scene(-0.5, 0.1))).toBe(false);
    });
    it('a control point label keeps the strict test', async () => {
        const s = scene(-0.05, 0.1);
        s.labels = [{id: 'p', text: 'P', anchor: [0, 0, -0.05], pointId: 'p00'}];
        expect(await visibleLabel(s)).toBe(false);
    });
});

describe('ThreeSurfaceView label layout', () => {
    async function layoutHarness(scene = makeScene({
        mesh: {positions: [-20, -20, 0.5, 20, -20, 0.5, 0, 20, 0.5], faces: [0, 1, 2], visible: true},
        camera: {az: 0, el: 0.2, distance: 12, projection: 'perspective', target: [0, 0, 0]},
    })) {
        scene.points = scene.points.map(p => ({...p, xyz: [p.xyz[0], p.xyz[1], -1] as Xyz}));
        scene.labels = [
            {id: 'under', text: 'U', anchor: [0, 0, -1]},
            {id: 'far', text: 'F', anchor: [500, 0, 0]},
            {id: 'above', text: 'A', anchor: [2, 0, 1.5]},
        ];
        const h = harness();
        await h.view.attach(h.host);
        h.view.reconcile(scene);
        const layouts: LabelLayout[][] = [];
        const off = h.view.onLayout(labels => layouts.push(labels));
        return {h, scene, layouts, off};
    }

    it('publishes the projected, occlusion-tested layout after a render, and only when it changes', async () => {
        const {h, scene, layouts} = await layoutHarness();
        await vi.waitFor(() => expect(layouts).toHaveLength(1));
        const visible = Object.fromEntries(layouts[0].map(l => [l.id, l.visible]));
        expect(visible).toEqual({under: false, far: false, above: true});
        const capture = await h.view.capture();
        expect(layouts[0]).toEqual(capture.labels);
        // A render of the same layout publishes nothing new.
        h.view.reconcile(scene);
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(layouts).toHaveLength(1);
        // A moved camera or a hidden mesh changes the layout and is published.
        h.view.reconcile({...scene, mesh: {...scene.mesh!, visible: false}});
        await vi.waitFor(() => expect(layouts).toHaveLength(2));
        expect(layouts[1].find(l => l.id === 'under')!.visible).toBe(true);
        h.view.reconcile({...scene, camera: {...scene.camera, az: 1.2}});
        await vi.waitFor(() => expect(layouts).toHaveLength(3));
        expect(layouts[2].find(l => l.id === 'above')!.x).not.toBeCloseTo(layouts[1].find(l => l.id === 'above')!.x, 1);
        h.view.dispose();
    });

    it('stops publishing after unsubscribe and after dispose', async () => {
        const {h, scene, layouts, off} = await layoutHarness();
        await vi.waitFor(() => expect(layouts).toHaveLength(1));
        off();
        h.view.reconcile({...scene, camera: {...scene.camera, az: 0.7}});
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(layouts).toHaveLength(1);
        const second: LabelLayout[][] = [];
        h.view.onLayout(labels => second.push(labels));
        await vi.waitFor(() => expect(second).toHaveLength(1));
        h.view.dispose();
        h.view.reconcile(scene);
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(second).toHaveLength(1);
    });
});

describe('ThreeSurfaceView framing attribute', () => {
    it('is projected again only when the camera, size or points change', async () => {
        const h = harness();
        await h.view.attach(h.host);
        const scene = makeScene();
        h.view.reconcile(scene);
        await h.view.capture();
        const first = h.host.getAttribute('data-surface-framing');
        expect(JSON.parse(first!).points).toHaveLength(16);
        const projected = vi.spyOn(scene.points, 'map');
        await h.view.capture();
        await h.view.capture();
        expect(projected).not.toHaveBeenCalled();
        expect(h.host.getAttribute('data-surface-framing')).toBe(first);
        h.view.reconcile({...scene, camera: {...scene.camera, az: scene.camera.az + 0.5}});
        await h.view.capture();
        expect(h.host.getAttribute('data-surface-framing')).not.toBe(first);
        expect(JSON.parse(h.host.getAttribute('data-surface-framing')!).camera.az).toBeCloseTo(scene.camera.az + 0.5, 12);
        h.view.dispose();
    });
});

describe('surface palette', () => {
    const luminance = (hex: number) => {
        const [r, g, b] = [hex >> 16, hex >> 8, hex].map(v => {
            const c = (v & 255) / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    it('draws small control points with margin over the 3:1 non-text contrast on the white clear colour', () => {
        expect(1.05 / (luminance(SURFACE_COLORS.point) + 0.05)).toBeGreaterThanOrEqual(4.5);
    });

    it('gives the comparison tensor patch its own colour, with at least 3:1 on white', () => {
        const others = Object.entries(SURFACE_COLORS).filter(([role]) => role !== 'compare').map(([, color]) => color);
        expect(others).not.toContain(SURFACE_COLORS.compare);
        expect(1.05 / (luminance(SURFACE_COLORS.compare) + 0.05)).toBeGreaterThanOrEqual(3);
    });

    it('gives the second construction stage its own colour, with at least 3:1 on white', () => {
        const others = Object.entries(SURFACE_COLORS).filter(([role]) => role !== 'construction-2').map(([, color]) => color);
        expect(others).not.toContain(SURFACE_COLORS['construction-2']);
        expect(1.05 / (luminance(SURFACE_COLORS['construction-2']) + 0.05)).toBeGreaterThanOrEqual(3);
    });

    it('gives the derivative arrows and the tangent plane colours with at least 3:1 on white, distinct from every other colour', () => {
        const derivative = ['vector-u', 'vector-v', 'twist', 'normal', 'plane'] as const;
        const polylineRoles = ['net', 'iso', 'iso-v', 'iso-w', 'boundary', 'construction', 'construction-2', 'highlight', 'compare', 'vector-u', 'vector-v', 'twist', 'normal', 'net-2'] as const satisfies readonly PolylineRole[];
        for (const role of derivative) {
            expect(1.05 / (luminance(SURFACE_COLORS[role]) + 0.05), role).toBeGreaterThanOrEqual(3);
            // `selected` deliberately shares the highlight blue.
            const others = Object.entries(SURFACE_COLORS).filter(([name]) => name !== role && name !== 'selected').map(([, color]) => color);
            expect(others, role).not.toContain(SURFACE_COLORS[role]);
        }
        const colours = polylineRoles.map(role => SURFACE_COLORS[role]);
        expect(new Set(colours).size).toBe(polylineRoles.length);
    });

    it('gives the second control net its own colour, with at least 3:1 on white', () => {
        const others = Object.entries(SURFACE_COLORS).filter(([role]) => role !== 'net-2').map(([, color]) => color);
        expect(others).not.toContain(SURFACE_COLORS['net-2']);
        expect(1.05 / (luminance(SURFACE_COLORS['net-2']) + 0.05)).toBeGreaterThanOrEqual(3);
    });

    it('draws only S_u and S_v solid among the new roles, the other two with their own dash patterns', () => {
        const solid = (['vector-u', 'vector-v', 'twist', 'normal'] as const).filter(role => !(role in SURFACE_DASH));
        expect(solid).toEqual(['vector-u', 'vector-v']);
        expect(`${SURFACE_DASH.twist.dash}/${SURFACE_DASH.twist.gap}`).not.toBe(`${SURFACE_DASH.normal.dash}/${SURFACE_DASH.normal.gap}`);
    });
});

describe('ThreeSurfaceView line dashes', () => {
    const roles: PolylineRole[] = ['net', 'iso', 'iso-v', 'iso-w', 'boundary', 'construction', 'construction-2', 'highlight', 'compare', 'vector-u', 'vector-v', 'twist', 'normal', 'net-2'];
    const dashed: PolylineRole[] = ['iso-v', 'iso-w', 'compare', 'construction-2', 'twist', 'normal', 'net-2'];

    /** One polyline per role, the whole scene spanning `size` along x. */
    function dashScene(size: number, revision = 1): SurfaceScene {
        return makeScene({
            revision,
            polylines: roles.map((role, k) => ({id: role, role, points: [[0, k, 0], [size, k, 0], [size, k, 1]] as Xyz[]})),
            mesh: undefined,
            points: [{id: 'a', xyz: [0, 0, 0]}, {id: 'b', xyz: [size, 0, 0]}],
            labels: [],
        });
    }

    /** The bounding-box diagonal of `dashScene(size)`. */
    const extentOf = (size: number) => Math.hypot(size, roles.length - 1, 1);

    const linesOf = (h: Harness): Map<string, THREE.Line> => {
        const found = new Map<string, THREE.Line>();
        const [sc] = h.renderer.rendered.at(-1)!;
        sc.traverse(o => {
            if ((o as THREE.Line).isLine) found.set(roles[found.size], o as THREE.Line);
        });
        return found;
    };

    async function draw(h: Harness, scene: SurfaceScene): Promise<Map<string, THREE.Line>> {
        h.view.reconcile(scene);
        await h.view.capture();
        return linesOf(h);
    }

    it('draws iso-v dashed, iso-w dotted, compare long-dashed, the second construction stage short-dashed, the twist dotted, the normal long-dashed, and every other role solid', async () => {
        const h = harness();
        await h.view.attach(h.host);
        const lines = await draw(h, dashScene(10));
        expect(lines.size).toBe(roles.length);
        for (const role of roles) {
            const material = lines.get(role)!.material as THREE.LineBasicMaterial;
            if (dashed.includes(role)) expect(material, role).toBeInstanceOf(THREE.LineDashedMaterial);
            else expect(material instanceof THREE.LineDashedMaterial, role).toBe(false);
            expect(material.color.getHex(), role).toBe(SURFACE_COLORS[role]);
        }
        // The seven dashed roles differ from one another in pattern.
        const patterns = dashed.map(role => `${SURFACE_DASH[role as keyof typeof SURFACE_DASH].dash}/${SURFACE_DASH[role as keyof typeof SURFACE_DASH].gap}`);
        expect(new Set(patterns).size).toBe(7);
        expect(SURFACE_DASH.twist.dash).toBeLessThan(SURFACE_DASH['iso-w'].dash);
        expect(SURFACE_DASH['iso-w'].dash).toBeLessThan(SURFACE_DASH['construction-2'].dash);
        expect(SURFACE_DASH['construction-2'].dash).toBeLessThan(SURFACE_DASH['iso-v'].dash);
        expect(SURFACE_DASH['iso-v'].dash).toBeLessThan(SURFACE_DASH.normal.dash);
        expect(SURFACE_DASH.normal.dash).toBeLessThan(SURFACE_DASH.compare.dash);
        expect(SURFACE_DASH['iso-v'].dash).toBeLessThan(SURFACE_DASH['net-2'].dash);
        expect(SURFACE_DASH['net-2'].dash).toBeLessThan(SURFACE_DASH.normal.dash);
        h.view.dispose();
    });

    it('computes the line distances of dashed lines only', async () => {
        const h = harness();
        await h.view.attach(h.host);
        const lines = await draw(h, dashScene(10));
        for (const role of roles) {
            const distance = lines.get(role)!.geometry.getAttribute('lineDistance');
            if (dashed.includes(role)) {
                expect(distance, role).toBeDefined();
                expect(distance.getX(distance.count - 1), role).toBeCloseTo(11, 6);
            } else expect(distance, role).toBeUndefined();
        }
        h.view.dispose();
    });

    it('scales dash and gap with the scene extent, also when the extent changes', async () => {
        const h = harness();
        await h.view.attach(h.host);
        const sizes = (lines: Map<string, THREE.Line>, role: PolylineRole) => {
            const m = lines.get(role)!.material as THREE.LineDashedMaterial;
            return [m.dashSize, m.gapSize, m];
        };
        const small = await draw(h, dashScene(2));
        const smallSizes = dashed.map(role => sizes(small, role));
        const big = await draw(h, dashScene(20, 2));
        const bigSizes = dashed.map(role => sizes(big, role));
        dashed.forEach((role, k) => {
            const ratio = (bigSizes[k][0] as number) / (smallSizes[k][0] as number);
            expect(ratio, role).toBeCloseTo(extentOf(20) / extentOf(2), 9);
            expect((bigSizes[k][1] as number) / (smallSizes[k][1] as number), role).toBeCloseTo(ratio, 9);
            expect(bigSizes[k][2], `${role} material is reused, not recreated`).toBe(smallSizes[k][2]);
        });
        // Proportional to the extent: dash / extent is the table entry.
        expect(bigSizes[0][0]).toBeCloseTo(SURFACE_DASH['iso-v'].dash * extentOf(20), 6);
        expect(extentOf(20) / extentOf(2)).toBeGreaterThan(1.8);
        h.view.dispose();
    });

    it('disposes the dashed materials with the view', async () => {
        const h = harness();
        const disposed = new Set<unknown>();
        const md = vi.spyOn(THREE.Material.prototype, 'dispose').mockImplementation(function (this: THREE.Material) { disposed.add(this); });
        await h.view.attach(h.host);
        await draw(h, dashScene(10));
        await draw(h, dashScene(30, 2));
        const materials = dashed.map(role => linesOf(h).get(role)!.material);
        h.view.dispose();
        for (const material of materials) expect(disposed.has(material)).toBe(true);
        md.mockRestore();
    });
});

describe('ThreeSurfaceView tangent plane', () => {
    const corners: ScenePlane['corners'] = [[-2, -2, 1], [2, -2, 1], [2, 2, 1], [-2, 2, 1]];
    const planeScene = (revision = 1, planes: ScenePlane[] = [{id: 'pl', corners}]) => makeScene({revision, planes});

    const planeMeshes = (h: Harness): THREE.Mesh[] => {
        const found: THREE.Mesh[] = [];
        const [sc] = h.renderer.rendered.at(-1)!;
        sc.traverse(o => {
            const m = o as THREE.Mesh;
            if (m.isMesh && (m.material as THREE.MeshBasicMaterial).transparent) found.push(m);
        });
        return found;
    };

    const outlines = (h: Harness): THREE.Line[] => {
        const found: THREE.Line[] = [];
        const [sc] = h.renderer.rendered.at(-1)!;
        sc.traverse(o => {
            const line = o as THREE.Line;
            if (line.isLine && (line.material as THREE.LineBasicMaterial).color.getHex() === SURFACE_COLORS.plane) found.push(line);
        });
        return found;
    };

    it('draws a translucent, double-sided quad that writes no depth, with an outline in the plane colour', async () => {
        const h = harness();
        await h.view.attach(h.host);
        h.view.reconcile(planeScene());
        await h.view.capture();
        const quads = planeMeshes(h);
        expect(quads).toHaveLength(1);
        const material = quads[0].material as THREE.MeshBasicMaterial;
        expect(material.side).toBe(THREE.DoubleSide);
        expect(material.transparent).toBe(true);
        expect(material.depthWrite).toBe(false);
        expect(material.opacity).toBeGreaterThan(0);
        expect(material.opacity).toBeLessThan(1);
        expect(material.color.getHex()).toBe(SURFACE_COLORS.plane);
        const position = quads[0].geometry.getAttribute('position');
        expect(position.count).toBe(4);
        corners.forEach((c, k) => expect([position.getX(k), position.getY(k), position.getZ(k)]).toEqual(c));
        expect(quads[0].geometry.getIndex()!.count).toBe(6);
        // The outline closes the loop through all four corners.
        const loops = outlines(h);
        expect(loops).toHaveLength(1);
        expect(loops[0].geometry.getAttribute('position').count).toBe(5);
        h.view.dispose();
    });

    it('draws no plane when the scene has none', async () => {
        const h = harness();
        await h.view.attach(h.host);
        h.view.reconcile(planeScene(1, []));
        await h.view.capture();
        expect(planeMeshes(h)).toHaveLength(0);
        expect(outlines(h)).toHaveLength(0);
        h.view.dispose();
    });

    it('rebuilds the plane on a new revision, disposing the old geometry and keeping one material', async () => {
        const h = harness();
        const disposedGeometries = new Set<unknown>();
        vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function (this: THREE.BufferGeometry) { disposedGeometries.add(this); });
        await h.view.attach(h.host);
        h.view.reconcile(planeScene(1));
        await h.view.capture();
        const first = planeMeshes(h)[0];
        const firstOutline = outlines(h)[0];
        const moved: ScenePlane['corners'] = [[-2, -2, 3], [2, -2, 3], [2, 2, 3], [-2, 2, 3]];
        h.view.reconcile(planeScene(2, [{id: 'pl', corners: moved}]));
        await h.view.capture();
        const second = planeMeshes(h);
        expect(second).toHaveLength(1);
        expect(outlines(h)).toHaveLength(1);
        expect(second[0]).not.toBe(first);
        expect(second[0].material).toBe(first.material);
        expect(second[0].geometry.getAttribute('position').getZ(0)).toBe(3);
        expect(disposedGeometries.has(first.geometry), 'old plane geometry leaked').toBe(true);
        expect(disposedGeometries.has(firstOutline.geometry), 'old outline geometry leaked').toBe(true);
        expect(disposedGeometries.has(second[0].geometry)).toBe(false);
        h.view.dispose();
    });

    it('disposes the plane geometry, outline and materials with the view', async () => {
        const h = harness();
        const disposed = new Set<unknown>();
        vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function (this: THREE.BufferGeometry) { disposed.add(this); });
        vi.spyOn(THREE.Material.prototype, 'dispose').mockImplementation(function (this: THREE.Material) { disposed.add(this); });
        await h.view.attach(h.host);
        h.view.reconcile(planeScene());
        await h.view.capture();
        const quad = planeMeshes(h)[0];
        const loop = outlines(h)[0];
        h.view.dispose();
        expect(disposed.has(quad.geometry), 'plane geometry').toBe(true);
        expect(disposed.has(quad.material), 'plane material').toBe(true);
        expect(disposed.has(loop.geometry), 'outline geometry').toBe(true);
        expect(disposed.has(loop.material), 'outline material').toBe(true);
    });
});

describe('ThreeSurfaceView construction markers', () => {
    it('draws the second construction stage as larger diamonds, the first stage and the evaluated point as spheres', async () => {
        const h = harness();
        const disposed = new Set<unknown>();
        vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function (this: THREE.BufferGeometry) { disposed.add(this); });
        await h.view.attach(h.host);
        h.view.reconcile(makeScene({markers: [
            {id: 'a', xyz: [0, 0, 0.5], role: 'evaluated'},
            {id: 'b', xyz: [1, 0, 0.5], role: 'construction'},
            {id: 'c', xyz: [2, 0, 0.5], role: 'construction-2'},
        ]}));
        await h.view.capture();
        const [sc] = h.renderer.rendered.at(-1)!;
        const byX = new Map<number, THREE.Mesh>();
        sc.traverse(o => {
            const m = o as THREE.Mesh;
            if (m.isMesh && m.position.z === 0.5 && !m.userData.pointId) byX.set(m.position.x, m);
        });
        const [evaluated, first, second] = [byX.get(0)!, byX.get(1)!, byX.get(2)!];
        expect(evaluated.geometry).toBeInstanceOf(THREE.SphereGeometry);
        expect(first.geometry).toBeInstanceOf(THREE.SphereGeometry);
        expect(first.geometry).toBe(evaluated.geometry);
        expect(second.geometry).not.toBeInstanceOf(THREE.SphereGeometry);
        const radius = (g: THREE.BufferGeometry) => { g.computeBoundingSphere(); return g.boundingSphere!.radius; };
        expect(radius(second.geometry)).toBeGreaterThan(radius(first.geometry) * 1.2);
        expect((second.material as THREE.MeshBasicMaterial).color.getHex()).toBe(SURFACE_COLORS['construction-2']);
        h.view.dispose();
        expect(disposed.has(second.geometry), 'diamond geometry').toBe(true);
    });
});
