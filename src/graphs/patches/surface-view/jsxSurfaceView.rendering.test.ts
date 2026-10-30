import {afterEach, describe, expect, it, vi} from 'vitest';
import {DisplaySettings} from '../../base/DisplaySettings';
import {JsxSurfaceView} from './jsxSurfaceView';
import {RENDERED_OWNERS_ATTRIBUTE} from './jsxMeshOwners';
import type {MarkerRole, PolylineRole, SceneMeshOwner, SurfaceCamera, SurfaceScene, Xyz} from './surfaceScene';
import {dashFor, SURFACE_COLORS} from './surfaceStyles';

const hex = (rgb: number): string => `#${rgb.toString(16).padStart(6, '0')}`;

const ROLES: PolylineRole[] = ['net', 'net-2', 'iso', 'iso-v', 'iso-w', 'boundary', 'construction', 'construction-2', 'highlight',
    'compare', 'vector-u', 'vector-v', 'twist', 'normal'];
const MARKER_ROLES: MarkerRole[] = ['evaluated', 'construction', 'construction-2'];

/** A (n+1) x (n+1) vertex grid with 2 n^2 triangles. */
function gridMesh(n: number): {positions: number[]; faces: number[]} {
    const positions: number[] = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) positions.push(i / n * 4, j / n * 4, Math.sin(i * 0.3) * Math.cos(j * 0.2));
    const faces: number[] = [];
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
            faces.push(a, b, d, a, d, c);
        }
    }
    return {positions, faces};
}

function makeScene(n: number, extra: Partial<SurfaceScene> = {}): SurfaceScene {
    const {positions, faces} = gridMesh(n);
    return {
        revision: 1,
        points: [{id: 'p0', xyz: [0, 0, 0]}, {id: 'p1', xyz: [4, 4, 0.5]}],
        polylines: ROLES.map((role, k) => ({id: `l-${role}`, role, points: [[0, k * 0.2, 0.1], [2, k * 0.2, 0.3], [4, k * 0.2, 0.1]] as Xyz[]})),
        mesh: {positions, faces, visible: true},
        planes: [{id: 'plane', corners: [[1, 1, 0.2], [2, 1, 0.2], [2, 2, 0.2], [1, 2, 0.2]]}],
        markers: MARKER_ROLES.map((role, k) => ({id: `m-${role}`, xyz: [1 + k, 1, 0.2] as Xyz, role})),
        labels: [],
        camera: {az: 0.7, el: 0.5, distance: 14, projection: 'perspective', target: [2, 2, 0]},
        interaction: {zMode: false, editable: false},
        ...extra,
    };
}

const withCamera = (scene: SurfaceScene, camera: Partial<SurfaceCamera>): SurfaceScene =>
    ({...scene, camera: {...scene.camera, ...camera}});

interface Internals {
    draw: {nodes: (SVGElement | null)[]; markers: {element2D: {rendNode: SVGElement}}[]};
    pool: {tris: Uint32Array; planes: Uint32Array; segs: Uint32Array; segRoles: PolylineRole[]};
}
const internals = (view: JsxSurfaceView): Internals => view as unknown as Internals;

async function mount(scene: SurfaceScene) {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: 800});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: 600});
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    view.reconcile(scene);
    await view.attach(host);
    view.flush();
    return {host, view};
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
});

describe('JsxSurfaceView styling', () => {
    it('draws every polyline role in its colour, weight and dash class', async () => {
        const {view} = await mount(makeScene(2));
        const {pool, draw} = internals(view);
        const nSkip = pool.tris.length / 3 + pool.planes.length / 4;
        const base = new DisplaySettings().strokeWidth;
        const seen = new Map<PolylineRole, SVGElement>();
        pool.segRoles.forEach((role, k) => {
            if (!seen.has(role)) seen.set(role, draw.nodes[nSkip + k]!);
        });
        expect([...seen.keys()].sort()).toEqual([...ROLES].sort());
        for (const [role, node] of seen) {
            expect(node.getAttribute('stroke'), role).toBe(hex(SURFACE_COLORS[role]));
            const dash = node.getAttribute('stroke-dasharray');
            if (dashFor(role)) {
                expect(dash, role).toBeTruthy();
            } else {
                expect(dash, role).toBeNull();
            }
        }
        // Three's dash classes survive: dotted < short < medium < long.
        const dashLength = (role: PolylineRole): number => Number(seen.get(role)!.getAttribute('stroke-dasharray')!.split(',')[0]);
        expect(dashLength('iso-w')).toBe(dashLength('twist'));
        expect(dashLength('iso-w')).toBeLessThan(dashLength('construction-2'));
        expect(dashLength('construction-2')).toBeLessThan(dashLength('iso-v'));
        expect(dashLength('iso-v')).toBe(dashLength('net-2'));
        expect(dashLength('net-2')).toBeLessThan(dashLength('normal'));
        expect(dashLength('compare')).toBe(dashLength('normal'));
        // Weights come from the 2D stroke-width token: highlight at the token, curve level below, secondary and iso thinner.
        const width = (role: PolylineRole): number => parseFloat(seen.get(role)!.getAttribute('stroke-width')!);
        expect(width('highlight')).toBe(base);
        expect(width('boundary')).toBeLessThan(width('highlight'));
        expect(width('net')).toBeLessThan(width('boundary'));
        expect(width('iso')).toBeLessThan(width('net'));
        for (const role of ROLES) expect(width(role), role).toBeGreaterThan(0);
    });

    it('draws the mesh, planes and markers in the Three colours', async () => {
        const {view} = await mount(makeScene(2));
        const {pool, draw} = internals(view);
        const mesh = draw.nodes[0]!;
        expect(mesh.getAttribute('fill')).toBe(hex(SURFACE_COLORS.surface));
        expect(mesh.getAttribute('fill-opacity')).toBe('1');
        const plane = draw.nodes[pool.tris.length / 3]!;
        expect(plane.getAttribute('fill')).toBe(hex(SURFACE_COLORS.plane));
        expect(plane.getAttribute('fill-opacity')).toBe('0.3');
        const markerFill = draw.markers.map(m => m.element2D.rendNode.getAttribute('fill'));
        expect(markerFill).toEqual([SURFACE_COLORS.marker, SURFACE_COLORS.construction, SURFACE_COLORS['construction-2']].map(hex));
    });

    it('publishes the rendered mesh owner evidence like the Three view and clears it on dispose', async () => {
        const scene = makeScene(2);
        const owners: SceneMeshOwner[] = [
            {id: 'a', kind: 'tensor', faceStart: 0, faceCount: 12},
            {id: 'b', kind: 'join', faceStart: 12, faceCount: 12},
            {id: 'bad', kind: 'tensor', faceStart: 12, faceCount: 999},
        ];
        const {host, view} = await mount({...scene, meshOwners: owners});
        const evidence = JSON.parse(host.getAttribute(RENDERED_OWNERS_ATTRIBUTE)!) as {id: string; kind: string; geometrySamples: number[][]}[];
        expect(evidence.map(e => [e.id, e.kind])).toEqual([['a', 'tensor'], ['b', 'join']]);
        const first = scene.mesh!.faces[0];
        expect(evidence[0].geometrySamples[0]).toEqual([0, 1, 2].map(k => Math.fround(scene.mesh!.positions[3 * first + k])));
        expect(evidence[0].geometrySamples.length).toBe(3);
        view.dispose();
        expect(host.hasAttribute(RENDERED_OWNERS_ATTRIBUTE)).toBe(false);
    });
});

describe('JsxSurfaceView camera redraw', () => {
    it('draws a camera-only reconcile in the same call without elements, rebuilds or a frame request', async () => {
        const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
        const {view} = await mount(makeScene(3));
        raf.mockClear();
        const {frames, createdElements, rebuilds} = view.stats;
        const nodes = internals(view).draw.nodes;
        const before = nodes[0]!.getAttribute('d');
        view.reconcile(withCamera(makeScene(3), {az: 1.4}));
        expect(view.stats.frames).toBe(frames + 1);
        expect(nodes[0]!.getAttribute('d')).not.toBe(before);
        expect(view.stats.createdElements).toBe(createdElements);
        expect(view.stats.rebuilds).toBe(rebuilds);
        expect(raf).not.toHaveBeenCalled();
        view.flush();
        expect(view.stats.frames).toBe(frames + 1);
    });

    it('keeps geometry changes coalesced into one frame', async () => {
        const scene = makeScene(3);
        const {view} = await mount(scene);
        const frames = view.stats.frames;
        view.reconcile({...scene, revision: 2, points: [{id: 'p0', xyz: [0, 0, 1]}, scene.points[1]]});
        view.reconcile({...scene, revision: 3, points: [{id: 'p0', xyz: [0, 0, 2]}, scene.points[1]]});
        expect(view.stats.frames).toBe(frames);
        view.flush();
        expect(view.stats.frames).toBe(frames + 1);
    });

    it('a camera change right behind a pending geometry change still draws both, once', async () => {
        const scene = makeScene(3);
        const {view} = await mount(scene);
        const frames = view.stats.frames;
        view.reconcile({...scene, revision: 2, points: [{id: 'p0', xyz: [0, 0, 1]}, scene.points[1]]});
        view.reconcile({...withCamera(scene, {az: 2}), revision: 2, points: [{id: 'p0', xyz: [0, 0, 1]}, scene.points[1]]});
        expect(view.stats.frames).toBe(frames);
        view.flush();
        expect(view.stats.frames).toBe(frames + 1);
        expect(view.stats.drawn).toBeGreaterThan(0);
    });
});

describe('JsxSurfaceView reduced detail while orbiting', () => {
    const TEAPOT_GRID = 46; // 2 * 45^2 = 4050 triangles, the teapot's order of magnitude

    it('draws a large mesh at reduced detail while the camera moves and in full once it settles', async () => {
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
        const {view} = await mount(makeScene(TEAPOT_GRID - 1));
        const full = view.stats.drawn;
        const nTri = internals(view).pool.tris.length / 3;
        expect(nTri).toBeGreaterThan(1500);
        const {createdElements, frames} = view.stats;
        const hidden = (): number => internals(view).draw.nodes.filter(n => n?.getAttribute('display') === 'none').length;
        expect(hidden()).toBe(0);

        view.reconcile(withCamera(makeScene(TEAPOT_GRID - 1), {az: 1.0}));
        const reduced = view.stats.drawn;
        expect(reduced).toBeLessThan(full * 0.6);
        expect(hidden()).toBeGreaterThan(nTri / 2);
        expect(view.stats.reducedFrames).toBe(1);
        view.reconcile(withCamera(makeScene(TEAPOT_GRID - 1), {az: 1.1}));
        expect(view.stats.drawn).toBe(reduced);
        expect(view.stats.frames).toBe(frames + 2);

        vi.advanceTimersByTime(149);
        expect(view.stats.drawn).toBe(reduced);
        vi.advanceTimersByTime(2);
        expect(view.stats.drawn).toBe(full);
        expect(hidden()).toBe(0);
        expect(view.stats.frames).toBe(frames + 3);
        expect(view.stats.createdElements).toBe(createdElements);
    });

    it('restores full detail after the node list was re-collected during an orbit', async () => {
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
        const {view} = await mount(makeScene(TEAPOT_GRID - 1));
        const hidden = (): number => internals(view).draw.nodes.filter(n => n?.getAttribute('display') === 'none').length;
        view.reconcile(withCamera(makeScene(TEAPOT_GRID - 1), {az: 1.0}));
        expect(hidden()).toBeGreaterThan(0);
        internals(view).draw.nodes = [];
        vi.advanceTimersByTime(200);
        expect(hidden()).toBe(0);
    });

    it('a geometry change during an orbit is drawn in full at once', async () => {
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
        const scene = makeScene(TEAPOT_GRID - 1);
        const {view} = await mount(scene);
        const full = view.stats.drawn;
        view.reconcile(withCamera(scene, {az: 1.0}));
        expect(view.stats.drawn).toBeLessThan(full);
        view.reconcile({...scene, revision: 2, points: [{id: 'p0', xyz: [0, 0, 1]}, scene.points[1]]});
        view.flush();
        expect(view.stats.drawn).toBe(full);
        const frames = view.stats.frames;
        vi.advanceTimersByTime(500);
        expect(view.stats.frames).toBe(frames); // the settle timer was cancelled
    });

    it('never reduces a small mesh', async () => {
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
        const {view} = await mount(makeScene(16));
        const full = view.stats.drawn;
        view.reconcile(withCamera(makeScene(16), {az: 1.0}));
        expect(view.stats.drawn).toBe(full);
        expect(view.stats.reducedFrames).toBe(0);
        const frames = view.stats.frames;
        vi.advanceTimersByTime(500);
        expect(view.stats.frames).toBe(frames); // no settle redraw was scheduled
    });

    it('owns and clears the settle timer on dispose', async () => {
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
        const {view} = await mount(makeScene(TEAPOT_GRID - 1));
        const set = vi.spyOn(globalThis, 'setTimeout');
        const clear = vi.spyOn(globalThis, 'clearTimeout');
        view.reconcile(withCamera(makeScene(TEAPOT_GRID - 1), {az: 1.0}));
        const call = set.mock.calls.findIndex(c => c[1] === 150);
        expect(call).toBeGreaterThanOrEqual(0);
        const id = set.mock.results[call].value;
        const frames = view.stats.frames;
        view.dispose();
        expect(clear).toHaveBeenCalledWith(id);
        vi.advanceTimersByTime(500);
        expect(view.stats.frames).toBe(frames);
    });
});
