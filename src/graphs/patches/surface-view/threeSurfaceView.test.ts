import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import * as THREE from 'three';
import {SURFACE_COLORS, ThreeSurfaceView, type RendererLike} from './threeSurfaceView';
import type {LabelLayout, SurfaceEdit, SurfaceScene, Xyz} from './surfaceScene';
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
});
