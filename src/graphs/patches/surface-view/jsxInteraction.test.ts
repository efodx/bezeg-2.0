import {describe, expect, it} from 'vitest';
import {JsxInteraction, KEY_STEP_PX, ORBIT_START_PX} from './jsxInteraction';
import {orbit, zoom} from './surfaceMath';
import type {SurfaceEdit, SurfaceScene, Xyz} from './surfaceScene';

const camera = {az: 0.7, el: 0.5, distance: 14, projection: 'perspective' as const, target: [0, 0, 0] as Xyz};

function setup(overrides: {editable?: boolean; zMode?: boolean} = {}) {
    const chosen: {element: unknown} = {element: undefined};
    const container = document.createElement('div');
    const keyTarget = document.createElement('div');
    document.body.append(container, keyTarget);
    const edits: SurfaceEdit[] = [];
    const state = {
        pressed: [] as unknown[], disposed: false,
        scene: {camera, interaction: {editable: overrides.editable ?? true, zMode: overrides.zMode ?? false}} as unknown as SurfaceScene,
    };
    const interaction = new JsxInteraction({
        container, keyTarget, scene: () => state.scene, pressedObjects: () => state.pressed,
        emit: e => edits.push(e), isDisposed: () => state.disposed, draggedObject: () => chosen.element,
    });
    const handlers = new Map<string, (event?: {pointerId?: number}) => void>();
    const point = {xyz: [1, 2, 3] as Xyz, X() { return this.xyz[0]; }, Y() { return this.xyz[1]; }, Z() { return this.xyz[2]; }};
    const element = {on: (event: string, handler: (event?: {pointerId?: number}) => void) => handlers.set(event, handler)};
    interaction.wirePoint('p', point, element);
    return {interaction, container, keyTarget, edits, state, point, handlers, chosen, element};
}

const pointer = (target: HTMLElement, type: string, x: number, y: number, pointerId = 1): void => {
    const e = new MouseEvent(type, {clientX: x, clientY: y, bubbles: true, cancelable: true});
    Object.defineProperty(e, 'pointerId', {value: pointerId});
    target.dispatchEvent(e);
};

describe('JsxInteraction', () => {
    it('reports select and start on the press, moves while the point changes, and end with the final place', () => {
        const {interaction, edits, point, handlers} = setup();
        handlers.get('down')!();
        expect(edits).toEqual([{kind: 'select', pointId: 'p'}, {kind: 'point', pointId: 'p', xyz: [1, 2, 3], phase: 'start'}]);
        expect(interaction.draggedPointId).toBe('p');
        interaction.onBoardUpdate();
        expect(edits).toHaveLength(2);
        point.xyz = [1.5, 2, 3.5];
        interaction.onBoardUpdate();
        interaction.onBoardUpdate();
        expect(edits[2]).toEqual({kind: 'point', pointId: 'p', xyz: [1.5, 2, 3.5], phase: 'move'});
        expect(edits).toHaveLength(3);
        point.xyz = [1.6, 2, 3.5];
        handlers.get('up')!();
        expect(edits[3]).toEqual({kind: 'point', pointId: 'p', xyz: [1.6, 2, 3.5], phase: 'end'});
        expect(interaction.draggedPointId).toBeNull();
        handlers.get('up')!();
        expect(edits).toHaveLength(4);
    });

    it('ignores presses on points of a read-only scene and after disposal', () => {
        const readOnly = setup({editable: false});
        readOnly.handlers.get('down')!();
        expect(readOnly.edits).toEqual([]);
        const gone = setup();
        gone.interaction.dispose();
        gone.state.disposed = true;
        gone.handlers.get('down')!();
        gone.interaction.onBoardUpdate();
        expect(gone.edits).toEqual([]);
    });

    it('closes a running drag on request with the last place', () => {
        const {interaction, edits, point, handlers} = setup();
        handlers.get('down')!();
        point.xyz = [4, 5, 6];
        interaction.endDrag();
        expect(edits.at(-1)).toEqual({kind: 'point', pointId: 'p', xyz: [4, 5, 6], phase: 'end'});
        interaction.endDrag();
        expect(edits.filter(e => e.kind === 'point' && e.phase === 'end')).toHaveLength(1);
    });

    it('orbits on a background drag past the threshold and not when a point was pressed or dragged', () => {
        const {container, edits, state, handlers} = setup();
        pointer(container, 'pointerdown', 10, 10);
        pointer(container, 'pointermove', 10 + ORBIT_START_PX - 1, 10);
        expect(edits).toEqual([]);
        pointer(container, 'pointermove', 40, 30);
        expect(edits).toEqual([{kind: 'camera', camera: orbit(camera, 30, 20)}]);
        pointer(container, 'pointerup', 40, 30);
        pointer(container, 'pointermove', 80, 80);
        expect(edits).toHaveLength(1);
        state.pressed = [{}];
        pointer(container, 'pointerdown', 10, 10);
        pointer(container, 'pointermove', 90, 90);
        expect(edits).toHaveLength(1);
        state.pressed = [];
        handlers.get('down')!();
        pointer(container, 'pointerdown', 10, 10);
        pointer(container, 'pointermove', 90, 90);
        expect(edits.filter(e => e.kind === 'camera')).toHaveLength(1);
    });

    it('turns a second background press into a pinch zoom that either finger ends without resuming the orbit', () => {
        const {container, edits, state} = setup();
        pointer(container, 'pointerdown', 100, 100, 1);
        pointer(container, 'pointermove', 102, 100, 1);
        pointer(container, 'pointerdown', 200, 100, 2);
        expect(edits).toEqual([]);
        pointer(container, 'pointermove', 290, 100, 2);
        expect(edits).toEqual([{kind: 'camera', camera: zoom(camera, 98 / 188)}]);
        state.scene = {...state.scene, camera: zoom(camera, 0.5)};
        pointer(container, 'pointermove', 200, 100, 1);
        expect(edits[1]).toEqual({kind: 'camera', camera: zoom(zoom(camera, 0.5), 188 / 90)});
        pointer(container, 'pointerup', 290, 100, 2);
        pointer(container, 'pointermove', 100, 140, 1);
        pointer(container, 'pointerdown', 100, 100, 3);
        pointer(container, 'pointermove', 100, 100, 3);
        expect(edits).toHaveLength(2);
    });

    it('keeps the arrow, plus and minus key steps and the wheel zoom of the Three view', () => {
        const {keyTarget, container, edits} = setup();
        const key = (k: string): void => { keyTarget.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); };
        for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', 'x']) key(k);
        const step = 0.1 / 0.008;
        expect(KEY_STEP_PX).toBe(step);
        expect(edits.map(e => e.kind === 'camera' && e.camera)).toEqual([
            orbit(camera, step, 0), orbit(camera, -step, 0), orbit(camera, 0, step), orbit(camera, 0, -step),
            zoom(camera, 0.9), zoom(camera, 0.9), zoom(camera, 1 / 0.9), zoom(camera, 1 / 0.9),
        ]);
        keyTarget.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', ctrlKey: true, bubbles: true}));
        expect(edits).toHaveLength(8);
        container.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true}));
        expect(edits[8]).toEqual({kind: 'camera', camera: zoom(camera, Math.exp(0.1))});
    });

    it('removes its listeners on dispose', () => {
        const {interaction, keyTarget, container, edits} = setup();
        interaction.dispose();
        keyTarget.dispatchEvent(new KeyboardEvent('keydown', {key: '+', bubbles: true}));
        container.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, bubbles: true}));
        expect(edits).toEqual([]);
    });

    it('treats the scene z-mode switch as JSXGraph vertical drag, besides its own Shift key', () => {
        const {interaction, state} = setup();
        let shift = false;
        const view = {isVerticalDrag: () => shift};
        interaction.bindView(view);
        expect(view.isVerticalDrag()).toBe(false);
        shift = true;
        expect(view.isVerticalDrag()).toBe(true);
        shift = false;
        state.scene = {...state.scene, interaction: {editable: true, zMode: true}};
        expect(view.isVerticalDrag()).toBe(true);
    });

    it('keeps the drag where it is when JSXGraph drags the point that fired first', async () => {
        const {interaction, edits, handlers, chosen, point, element} = setup();
        const near = {X: () => 1.1, Y: () => 2.1, Z: () => 3};
        const nearElement = {on: () => undefined};
        interaction.wirePoint('q', near, nearElement);
        chosen.element = element;
        handlers.get('down')!({pointerId: 1});
        await Promise.resolve();
        expect(interaction.draggedPointId).toBe('p');
        expect(edits).toEqual([{kind: 'select', pointId: 'p'}, {kind: 'point', pointId: 'p', xyz: [1, 2, 3], phase: 'start'}]);
        expect(point.xyz).toEqual([1, 2, 3]);
    });

    it('moves the drag and the selection to the point JSXGraph chose when another point fired first', async () => {
        const {interaction, edits, handlers, chosen} = setup();
        const other = {X: () => 4, Y: () => 5, Z: () => 6};
        const otherElement = {on: () => undefined};
        interaction.wirePoint('r', other, otherElement);
        chosen.element = otherElement;
        handlers.get('down')!({pointerId: 1});
        expect(interaction.draggedPointId).toBe('p');
        await Promise.resolve();
        expect(interaction.draggedPointId).toBe('r');
        expect(edits).toEqual([
            {kind: 'select', pointId: 'p'}, {kind: 'point', pointId: 'p', xyz: [1, 2, 3], phase: 'start'},
            {kind: 'point', pointId: 'p', xyz: [1, 2, 3], phase: 'end'},
            {kind: 'select', pointId: 'r'}, {kind: 'point', pointId: 'r', xyz: [4, 5, 6], phase: 'start'},
        ]);
    });
});
