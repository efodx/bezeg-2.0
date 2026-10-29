import {boards} from 'jsxgraph';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {JsxSurfaceStrategy, JsxSurfaceView} from './jsxSurfaceView';
import {makeCameraModel, projectToBoard} from './jsxProjection';
import {CAMERA_PRESETS} from './surfaceMath';
import type {ScenePoint, SurfaceCamera, SurfaceEdit, SurfaceScene, Xyz} from './surfaceScene';

const N = 4;

/** A 5x5-vertex bumpy patch with its 4x4 control net, an iso line, one marker and a tangent plane. */
function makeScene(overrides: Partial<SurfaceScene> = {}): SurfaceScene {
    const positions: number[] = [];
    for (let j = 0; j <= N; j++) {
        for (let i = 0; i <= N; i++) positions.push(i, j, Math.sin(i * 0.9) * Math.cos(j * 0.7));
    }
    const faces: number[] = [];
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
            faces.push(a, b, d, a, d, c);
        }
    }
    const points: ScenePoint[] = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) points.push({id: `p-${i}-${j}`, xyz: [i * 4 / 3, j * 4 / 3, (i + j) % 2 * 0.5] as Xyz});
    const row = (j: number): Xyz[] => [0, 1, 2, 3].map(i => points[j * 4 + i].xyz);
    return {
        revision: 1,
        points,
        polylines: [
            {id: 'net-0', role: 'net', points: row(0)},
            {id: 'net-1', role: 'net', points: row(1)},
            {id: 'iso-0', role: 'iso', points: [[0, 2, 0], [1, 2, 0.3], [2, 2, -0.2], [3, 2, 0.1]]},
        ],
        mesh: {positions, faces, visible: true},
        planes: [{id: 'plane', corners: [[1, 1, 0.2], [2, 1, 0.2], [2, 2, 0.2], [1, 2, 0.2]]}],
        markers: [{id: 'm', xyz: [1.5, 1.5, 0.2], role: 'evaluated'}],
        labels: [],
        camera: {az: 0.7, el: 0.5, distance: 14, projection: 'perspective', target: [2, 2, 0]},
        interaction: {zMode: false, editable: true},
        ...overrides,
    };
}

const withCamera = (scene: SurfaceScene, camera: Partial<SurfaceCamera>): SurfaceScene =>
    ({...scene, camera: {...scene.camera, ...camera}});

interface ProjectingView {
    project3DTo2D: (x: number, y: number, z: number) => number[];
}

function sizeHost(host: HTMLElement, width: number, height: number): void {
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: width});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: height});
}

async function mount(strategy: JsxSurfaceStrategy, scene = makeScene(), size: [number, number] = [800, 600]) {
    const host = document.createElement('div');
    sizeHost(host, size[0], size[1]);
    document.body.appendChild(host);
    const view = new JsxSurfaceView({strategy});
    view.reconcile(scene);
    await view.attach(host);
    view.flush();
    return {host, view};
}

const boardCount = (): number => Object.keys(boards as object).length;
let baseline = 0;
beforeEach(() => {
    baseline = boardCount();
});
afterEach(() => {
    document.body.innerHTML = '';
});

describe.each(['view3d', 'board2d'] as const)('JsxSurfaceView (%s)', strategy => {
    it('projects points like view3d.project3DTo2D and keeps point3d on the drawn net', async () => {
        const {view} = await mount(strategy);
        const jsxView = view.jsxView as ProjectingView;
        const cameras: SurfaceCamera[] = [
            makeScene().camera,
            {...makeScene().camera, ...CAMERA_PRESETS.front},
            {...makeScene().camera, ...CAMERA_PRESETS.top, distance: 9},
            {...makeScene().camera, az: -2.4, el: -0.3, distance: 20, target: [1, 3, 0.5]},
        ];
        let worst = 0;
        for (const camera of cameras) {
            view.reconcile(withCamera(makeScene(), camera));
            view.flush();
            const model = makeCameraModel(camera, {width: 800, height: 600});
            for (const p of [[0, 0, 0], [4, 0, 0.3], [2, 3, -0.5], [4, 4, 1], [1.3, 2.7, 0.2]] as Xyz[]) {
                const mine = projectToBoard(model, ...p);
                const jsx = jsxView.project3DTo2D(...p);
                worst = Math.max(worst, Math.abs(mine[0] - jsx[1]), Math.abs(mine[1] - jsx[2]));
            }
        }
        // Board units are pixels; the adapter's projection and JSXGraph's agree to floating-point rounding.
        expect(worst).toBeLessThan(1e-6);
    });

    it('keeps drawn control points at the adapter projection after a camera change', async () => {
        const {view} = await mount(strategy);
        const camera = {...makeScene().camera, az: 1.1, el: 0.3, distance: 11};
        view.reconcile(withCamera(makeScene(), camera));
        view.flush();
        const model = makeCameraModel(camera, {width: 800, height: 600});
        const scene = makeScene();
        const internals = view as unknown as {draw: {points: Map<string, {element2D: {coords: {usrCoords: number[]}}}>}};
        let worst = 0;
        for (const p of scene.points) {
            const mine = projectToBoard(model, ...p.xyz);
            const u = internals.draw.points.get(p.id)!.element2D.coords.usrCoords;
            worst = Math.max(worst, Math.abs(mine[0] - u[1]), Math.abs(mine[1] - u[2]));
        }
        expect(worst).toBeLessThan(1e-6);
    });

    it('creates no elements for a camera-only reconcile and moves few nodes', async () => {
        const {view} = await mount(strategy);
        const before = view.elementCount;
        const created = view.stats.createdElements;
        const rebuilds = view.stats.rebuilds;
        for (let k = 1; k <= 3; k++) {
            view.reconcile(withCamera(makeScene(), {az: 0.7 + k * 0.3, el: 0.5 - k * 0.1}));
            view.flush();
        }
        expect(view.elementCount).toBe(before);
        expect(view.stats.createdElements).toBe(created);
        expect(view.stats.rebuilds).toBe(rebuilds);
    });

    it('draws in back-to-front order: DOM order follows view depth', async () => {
        const {view} = await mount(strategy);
        const internals = view as unknown as {draw: {nodes: SVGElement[]}; depths: Float64Array};
        const nodes = internals.draw.nodes;
        const parent = nodes[0].parentNode!;
        const position = (n: Node): number => Array.prototype.indexOf.call(parent.childNodes, n);
        const depth = internals.depths;
        for (let a = 0; a < nodes.length; a++) {
            for (let b = a + 1; b < nodes.length; b++) {
                if (depth[a] > depth[b] + 1e-9) expect(position(nodes[a])).toBeLessThan(position(nodes[b]));
                if (depth[b] > depth[a] + 1e-9) expect(position(nodes[b])).toBeLessThan(position(nodes[a]));
            }
        }
    });

    it('emits camera edits for keyboard orbit and zoom, wheel and background drag', async () => {
        const {host, view} = await mount(strategy);
        const edits: SurfaceEdit[] = [];
        view.onEdit(e => edits.push(e));
        host.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
        host.dispatchEvent(new KeyboardEvent('keydown', {key: '+', bubbles: true}));
        const container = host.querySelector('div')!;
        container.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true}));
        const pointer = (type: string, x: number, y: number): void => {
            const e = new MouseEvent(type, {clientX: x, clientY: y, bubbles: true, cancelable: true});
            Object.defineProperty(e, 'pointerId', {value: 1});
            container.dispatchEvent(e);
        };
        pointer('pointerdown', 10, 10);
        pointer('pointermove', 40, 30);
        pointer('pointerup', 40, 30);
        const cameras = edits.filter((e): e is Extract<SurfaceEdit, {kind: 'camera'}> => e.kind === 'camera');
        expect(cameras).toHaveLength(4);
        const base = makeScene().camera;
        expect(cameras[0].camera.az).toBeLessThan(base.az);
        expect(cameras[1].camera.distance).toBeLessThan(base.distance);
        expect(cameras[2].camera.distance).toBeGreaterThan(base.distance);
        expect(cameras[3].camera.az).toBeLessThan(base.az);
        expect(cameras[3].camera.el).toBeGreaterThan(base.el);
        expect(edits.every(e => e.kind === 'camera')).toBe(true);
    });

    it('turns a point drag into select, start, move and end edits and leaves the camera alone', async () => {
        const {view} = await mount(strategy);
        const edits: SurfaceEdit[] = [];
        view.onEdit(e => edits.push(e));
        const internals = view as unknown as {
            draw: {points: Map<string, {element2D: {triggerEventHandlers: (names: string[], args: unknown[]) => void}; setPosition: (xyz: Xyz) => void}>};
            board: {update: () => void};
        };
        const p = internals.draw.points.get('p-1-1')!;
        p.element2D.triggerEventHandlers(['down'], []);
        p.setPosition([1.6, 1.4, 0.9]);
        internals.board.update();
        p.element2D.triggerEventHandlers(['up'], []);
        expect(edits.map(e => e.kind)).toEqual(['select', 'point', 'point', 'point']);
        expect(edits.slice(1).map(e => e.kind === 'point' && e.phase)).toEqual(['start', 'move', 'end']);
        const move = edits[2];
        expect(move.kind === 'point' && move.pointId).toBe('p-1-1');
        expect(move.kind === 'point' && move.xyz).toEqual([1.6, 1.4, 0.9]);
        expect(edits.some(e => e.kind === 'camera')).toBe(false);
    });

    it('applies host-authoritative point positions on the next reconcile', async () => {
        const {view} = await mount(strategy);
        const scene = makeScene();
        const moved = {...scene, revision: 2, points: scene.points.map(p => p.id === 'p-0-0' ? {...p, xyz: [0.1, 0.2, 0.3] as Xyz} : p)};
        view.reconcile(moved);
        view.flush();
        const internals = view as unknown as {draw: {points: Map<string, {X: () => number; Y: () => number; Z: () => number}>}; stats: {rebuilds: number}};
        const p = internals.draw.points.get('p-0-0')!;
        expect([p.X(), p.Y(), p.Z()]).toEqual([0.1, 0.2, 0.3]);
        expect(view.stats.rebuilds).toBe(1);
    });

    it('disposes idempotently and frees the board, listeners and frame', async () => {
        const {host, view} = await mount(strategy);
        expect(boardCount()).toBe(baseline + 1);
        view.reconcile(withCamera(makeScene(), {az: 2}));
        view.dispose();
        view.dispose();
        expect(boardCount()).toBe(baseline);
        expect(host.querySelector('div')).toBeNull();
        expect(host.getAttribute('role')).toBeNull();
        view.reconcile(makeScene());
        view.flush();
        expect(boardCount()).toBe(baseline);
    });

    it('survives three remounts with the board count back at baseline', async () => {
        for (let i = 0; i < 3; i++) {
            const {view} = await mount(strategy);
            view.dispose();
        }
        expect(boardCount()).toBe(baseline);
    });

    it('rejects capture with a clear gate message', async () => {
        const {view} = await mount(strategy);
        await expect(view.capture()).rejects.toThrow(/not implemented in the feasibility gate/);
    });
});
