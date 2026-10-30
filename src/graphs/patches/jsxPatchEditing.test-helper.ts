/**
 * Test support for driving the patch graphs' editing through a real `JsxSurfaceView` (task 04 of
 * docs/specs/jsxgraph-surface-view.md): a drag is a change of the point's 2D screen position followed by a board update,
 * which is what JSXGraph does for a mouse or touch drag, so JSXGraph itself decides which coordinates the point gets.
 */
import {act} from '@testing-library/react';
import JXG from 'jsxgraph';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
import type {SurfaceCamera, SurfaceEdit, Xyz} from './surface-view/surfaceScene';

interface DrawnPoint {
    element2D: {
        triggerEventHandlers: (names: string[], args: unknown[]) => void;
        setPositionDirectly: (method: number, coords: number[]) => void;
    };
    X: () => number;
    Y: () => number;
    Z: () => number;
}
interface Internals {
    draw: {points: Map<string, DrawnPoint>} | null;
    board: {update: () => void; _shiftKey?: boolean} | null;
    view: {project3DTo2D: (xyz: Xyz) => number[]} | null;
}

/** The JSX view mounted for a graph, with the edits it emitted. */
export interface JsxHandle {
    view: JsxSurfaceView;
    edits: SurfaceEdit[];
    /** Waits until the view has drawn the scene (its attach is asynchronous). */
    ready(): Promise<void>;
    /** The coordinates the view shows for a control point. */
    shown(id: string): Xyz;
    pointIds(): string[];
    /** The camera the board is drawn with, as the last edit or the scene had it. */
    camerasEmitted(): SurfaceCamera[];
    /** Presses a control point, as the first press of a mouse or touch drag. */
    press(id: string): void;
    /** Moves the pointer to where `target` is drawn and lets the board update; `shift` holds the Shift key. */
    dragTo(id: string, target: Xyz, shift?: boolean): void;
    release(id: string): void;
    /** Draws the pending frame, as the next animation frame would. */
    flush(): void;
}

export function newJsxHandle(): JsxHandle {
    const view = new JsxSurfaceView();
    const edits: SurfaceEdit[] = [];
    view.onEdit(edit => edits.push(edit));
    const internals = (): Internals => view as unknown as Internals;
    const drawn = (id: string): DrawnPoint => {
        const point = internals().draw?.points.get(id);
        if (!point) throw new Error(`the JSX view draws no point ${id}`);
        return point;
    };
    return {
        view, edits,
        async ready() {
            const deadline = Date.now() + 2000;
            while (!internals().draw && Date.now() < deadline) await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
            if (!internals().draw) throw new Error("the JSX view did not draw");
            act(() => view.flush());
        },
        shown: id => { const p = drawn(id); return [p.X(), p.Y(), p.Z()]; },
        pointIds: () => [...(internals().draw?.points.keys() ?? [])],
        camerasEmitted: () => edits.flatMap(e => e.kind === "camera" ? [e.camera] : []),
        press: id => { act(() => { drawn(id).element2D.triggerEventHandlers(["down"], []); view.flush(); }); },
        dragTo(id, target, shift = false) {
            const {board, view: view3d} = internals();
            const screen = view3d!.project3DTo2D(target);
            act(() => {
                if (shift) board!._shiftKey = true;
                drawn(id).element2D.setPositionDirectly(JXG.COORDS_BY_USER, [screen[1], screen[2]]);
                board!.update();
                view.flush();
                board!._shiftKey = false;
            });
        },
        flush: () => { act(() => view.flush()); },
        release: id => { act(() => { drawn(id).element2D.triggerEventHandlers(["up"], []); view.flush(); }); },
    };
}
