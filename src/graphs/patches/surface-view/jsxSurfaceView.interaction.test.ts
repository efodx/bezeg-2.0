import {afterEach, describe, expect, it} from 'vitest';
import {JsxSurfaceView} from './jsxSurfaceView';
import {orbit, zoom} from './surfaceMath';
import type {ScenePoint, SurfaceEdit, SurfaceScene, Xyz} from './surfaceScene';

/** Gesture tests of the JSX view with a host that behaves like BaseSurfaceGraph: it applies every edit to the scene store. */

type Pt = {
    element2D: {triggerEventHandlers: (names: string[], args: unknown[]) => void; visProp: Record<string, unknown>};
    setPosition: (xyz: Xyz) => void; X: () => number; Y: () => number; Z: () => number;
};
interface Internals {
    draw: {points: Map<string, Pt>};
    board: unknown;
    view: {isVerticalDrag: () => boolean};
}

const GRID = 4;

function makeScene(): SurfaceScene {
    const points: ScenePoint[] = [];
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) points.push({id: `p-${i}-${j}`, xyz: [i * 4 / 3, j * 4 / 3, (i + j) % 2 * 0.5]});
    const row = (j: number): Xyz[] => points.slice(j * GRID, (j + 1) * GRID).map(p => p.xyz);
    const positions: number[] = [];
    for (let j = 0; j <= 4; j++) for (let i = 0; i <= 4; i++) positions.push(i, j, Math.sin(i * 0.9) * Math.cos(j * 0.7));
    const faces: number[] = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const a = j * 5 + i; faces.push(a, a + 1, a + 6, a, a + 6, a + 5); }
    return {
        revision: 1, points,
        polylines: [{id: 'net-0', role: 'net', points: row(0)}, {id: 'net-1', role: 'net', points: row(1)}],
        mesh: {positions, faces, visible: true}, markers: [{id: 'm', xyz: [1.5, 1.5, 0.2], role: 'evaluated'}], labels: [],
        camera: {az: 0.7, el: 0.5, distance: 14, projection: 'perspective', target: [2, 2, 0]},
        interaction: {zMode: false, editable: true},
    };
}

/** Like patchSceneBuilder: selecting a point marks it and adds the highlighted row and column as scene polylines. */
function withSelection(scene: SurfaceScene, id: string): SurfaceScene {
    const k = scene.points.findIndex(p => p.id === id);
    const [i, j] = [k % GRID, Math.floor(k / GRID)];
    const polylines = scene.polylines.filter(l => !l.id.startsWith('highlight'));
    polylines.push({id: 'highlight-row', role: 'highlight', points: scene.points.slice(j * GRID, (j + 1) * GRID).map(p => p.xyz)});
    polylines.push({id: 'highlight-col', role: 'highlight', points: [0, 1, 2, 3].map(r => scene.points[r * GRID + i].xyz)});
    return {...scene, revision: scene.revision + 1, polylines, points: scene.points.map(p => ({id: p.id, xyz: p.xyz, ...(p.id === id ? {selected: true} : {})}))};
}

function withPoint(scene: SurfaceScene, id: string, xyz: Xyz): SurfaceScene {
    const points = scene.points.map(p => p.id === id ? {...p, xyz: [...xyz] as Xyz} : p);
    const polylines = scene.polylines.map(l => l.id === 'net-0' ? {...l, points: points.slice(0, GRID).map(p => p.xyz)} : l);
    return {...scene, revision: scene.revision + 1, points, polylines};
}

async function mountHost(options: {lagMoves?: boolean} = {}) {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: 800});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: 600});
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    let scene = makeScene();
    const edits: SurfaceEdit[] = [];
    view.reconcile(scene);
    view.onEdit(edit => {
        edits.push(edit);
        if (edit.kind === 'camera') scene = {...scene, camera: edit.camera};
        else if (edit.kind === 'select') scene = withSelection(scene, edit.pointId);
        else if (!options.lagMoves || edit.phase === 'end') scene = withPoint(scene, edit.pointId, edit.xyz);
        view.reconcile(scene);
    });
    await view.attach(host);
    view.flush();
    const internals = view as unknown as Internals;
    return {
        host, view, internals, edits, getScene: () => scene,
        press: (id: string) => internals.draw.points.get(id)!.element2D.triggerEventHandlers(['down'], []),
    };
}

const coords = (p: Pt): Xyz => [p.X(), p.Y(), p.Z()];

afterEach(() => {
    document.body.innerHTML = '';
});

describe('JsxSurfaceView point gestures', () => {
    it('keeps the board and the pressed point when the first press selects it, and the drag follows the pointer', async () => {
        const {view, internals, edits, getScene, press} = await mountHost();
        const board = internals.board, p = internals.draw.points.get('p-1-1')!;
        const rebuilds = view.stats.rebuilds;
        press('p-1-1');
        view.flush();
        expect(getScene().points.find(q => q.id === 'p-1-1')!.selected).toBe(true);
        expect(getScene().polylines.some(l => l.id === 'highlight-row')).toBe(true);
        expect(internals.board).toBe(board);
        expect(internals.draw.points.get('p-1-1')).toBe(p);
        expect(view.stats.rebuilds).toBe(rebuilds);
        const jxg = board as {update: () => void};
        p.setPosition([1.6, 1.4, 0.9]);
        jxg.update();
        view.flush();
        p.setPosition([1.7, 1.5, 1.0]);
        jxg.update();
        view.flush();
        const moves = edits.filter(e => e.kind === 'point' && e.phase === 'move');
        expect(moves.map(e => e.kind === 'point' && e.xyz)).toEqual([[1.6, 1.4, 0.9], [1.7, 1.5, 1.0]]);
        expect(coords(p)).toEqual([1.7, 1.5, 1.0]);
        p.element2D.triggerEventHandlers(['up'], []);
        view.flush();
        const end = edits.at(-1)!;
        expect(end).toEqual({kind: 'point', pointId: 'p-1-1', xyz: [1.7, 1.5, 1.0], phase: 'end'});
        expect(getScene().points.find(q => q.id === 'p-1-1')!.xyz).toEqual([1.7, 1.5, 1.0]);
        expect(coords(internals.draw.points.get('p-1-1')!)).toEqual([1.7, 1.5, 1.0]);
        expect(edits.some(e => e.kind === 'camera')).toBe(false);
    });

    it('does not pull the dragged point back to a scene that lags the pointer', async () => {
        const {view, internals, edits, getScene, press} = await mountHost({lagMoves: true});
        const start = coords(internals.draw.points.get('p-2-1')!);
        press('p-2-1');
        view.flush();
        const p = internals.draw.points.get('p-2-1')!;
        p.setPosition([2.9, 1.2, 0.8]);
        (internals.board as {update: () => void}).update();
        // The host has not applied the move yet when a frame with a changed scene arrives (selection restyle, marker move).
        view.reconcile({...getScene(), revision: getScene().revision + 1, markers: [{id: 'm', xyz: [1.6, 1.5, 0.2], role: 'evaluated'}]});
        view.flush();
        expect(getScene().points.find(q => q.id === 'p-2-1')!.xyz).toEqual(start);
        expect(coords(p)).toEqual([2.9, 1.2, 0.8]);
        p.element2D.triggerEventHandlers(['up'], []);
        expect(getScene().points.find(q => q.id === 'p-2-1')!.xyz).toEqual([2.9, 1.2, 0.8]);
        expect(edits.at(-1)).toEqual({kind: 'point', pointId: 'p-2-1', xyz: [2.9, 1.2, 0.8], phase: 'end'});
    });

    it('restyles the selected point in place', async () => {
        const {view, internals, press} = await mountHost();
        const a = internals.draw.points.get('p-0-0')!, b = internals.draw.points.get('p-3-3')!;
        const fill = (p: Pt): unknown => p.element2D.visProp.fillcolor;
        const plain = fill(a);
        press('p-0-0');
        view.flush();
        const selected = fill(a);
        expect(selected).not.toEqual(plain);
        expect(fill(b)).toEqual(plain);
        internals.draw.points.get('p-0-0')!.element2D.triggerEventHandlers(['up'], []);
        press('p-3-3');
        view.flush();
        expect(fill(a)).toEqual(plain);
        expect(fill(b)).toEqual(selected);
    });

    it('lets the scene z-mode switch and Shift drag points vertically', async () => {
        const {view, internals, getScene} = await mountHost();
        expect(internals.view.isVerticalDrag()).toBe(false);
        view.reconcile({...getScene(), interaction: {zMode: true, editable: true}});
        view.flush();
        expect(internals.view.isVerticalDrag()).toBe(true);
        view.reconcile({...getScene(), interaction: {zMode: false, editable: true}});
        view.flush();
        expect(internals.view.isVerticalDrag()).toBe(false);
        const board = internals.board as {_shiftKey?: boolean};
        board._shiftKey = true;
        expect(internals.view.isVerticalDrag()).toBe(true);
    });

    it('keeps the keyboard orbit and zoom steps', async () => {
        const {host, edits, getScene} = await mountHost();
        const cam = getScene().camera;
        const key = (k: string): void => { host.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); };
        key('ArrowLeft');
        key('+');
        key('ArrowDown');
        const cams = edits.filter(e => e.kind === 'camera').map(e => e.kind === 'camera' && e.camera);
        const step = 0.1 / 0.008;
        const first = orbit(cam, step, 0), second = zoom(first, 0.9);
        expect(cams).toEqual([first, second, orbit(second, 0, -step)]);
    });
});
