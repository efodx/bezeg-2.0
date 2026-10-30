import {orbit, zoom} from './surfaceMath';
import type {SurfaceCamera, SurfaceEdit, SurfaceScene, Xyz} from './surfaceScene';

/**
 * Pointer, wheel and keyboard input of `JsxSurfaceView` (task 04 of docs/specs/jsxgraph-surface-view.md).
 *
 * The view owns one instance, creates it with `attach` and disposes it. The scene store stays authoritative: this class
 * only turns gestures into `SurfaceEdit`s and never writes to the scene.
 *  - A control point is a JSXGraph `point3d`; JSXGraph itself moves it. A press on it is reported as `select` and a
 *    `point` `start`, every board update that changed it as `move`, the release as `end` with the final coordinates.
 *  - A press that hits no point is an orbit drag; wheel zooms; arrow keys orbit and +/- zoom (same steps as the former Three view).
 *  - z-mode: JSXGraph drags a point along z while `view3d.isVerticalDrag()` is true, which by default means the Shift key
 *    is held (view3d attribute `verticalDrag: {enabled: true, key: 'shift'}`). Touch has no Shift key, so `bindView`
 *    makes the scene's `interaction.zMode` count as "vertical drag" too: with it on, every drag moves z; with it off, a
 *    drag stays in the xy plane and Shift still gives a vertical drag.
 */

/** Orbit step of one arrow key press in pixels of a pointer drag (0.1 rad at the default 0.008 rad / px). */
export const KEY_STEP_PX = 0.1 / 0.008;
/** A background press must move this far before it starts an orbit, so a click does not nudge the camera. */
export const ORBIT_START_PX = 3;

/** The part of a JSXGraph `point3d` that the gesture code reads. */
export interface DraggablePoint {
    X: () => number;
    Y: () => number;
    Z: () => number;
}

/** What `JsxInteraction` needs from the view that owns it. */
export interface InteractionHost {
    /** The element that receives pointer and wheel events (the board container). */
    container: HTMLElement;
    /** The focusable element that receives key events. */
    keyTarget: HTMLElement;
    scene: () => SurfaceScene | null;
    /** JSXGraph lists the elements under a press in `downObjects`; empty means the press hit no control point. */
    pressedObjects: () => readonly unknown[];
    /** The element JSXGraph picked to drag for this pointer (the last of `pressedObjects` that is draggable), if any. */
    draggedObject?: (pointerId: number) => unknown;
    emit: (edit: SurfaceEdit) => void;
    isDisposed: () => boolean;
}

export class JsxInteraction {
    private orbitDrag: {id: number; x: number; y: number; moved: boolean} | null = null;
    private drag: {id: string; point: DraggablePoint; last: Xyz} | null = null;
    private readonly wired = new WeakMap<object, {id: string; point: DraggablePoint}>();
    private readonly cleanups: Array<() => void> = [];

    constructor(private readonly host: InteractionHost) {
        const {container, keyTarget} = host;
        this.listen(container, 'pointerdown', (e: PointerEvent) => this.onPointerDown(e));
        this.listen(container, 'pointermove', (e: PointerEvent) => this.onPointerMove(e));
        this.listen(container, 'pointerup', (e: PointerEvent) => this.onPointerEnd(e));
        this.listen(container, 'pointercancel', (e: PointerEvent) => this.onPointerEnd(e));
        this.listen(container, 'wheel', (e: WheelEvent) => this.onWheel(e), {passive: false});
        this.listen(keyTarget, 'keydown', (e: KeyboardEvent) => this.onKey(e));
    }

    /** The control point being dragged right now, or null. A reconcile must leave this point where JSXGraph has it. */
    get draggedPointId(): string | null {
        return this.drag?.id ?? null;
    }

    /** Makes the scene's z-mode switch behave like holding Shift on `view3d` (see the class comment). */
    bindView(view: {isVerticalDrag: () => boolean}): void {
        const builtIn = view.isVerticalDrag.bind(view);
        // JSXGraph returns the raw key flag, which is undefined before the first press.
        view.isVerticalDrag = () => this.host.scene()?.interaction.zMode === true || builtIn() === true;
    }

    /** Reports the press, drag and release of a control point; call once per created `point3d` and drop it with the board. */
    wirePoint(id: string, point: DraggablePoint, element2D: {on: (event: string, handler: (event?: {pointerId?: number}) => void) => void}): void {
        this.wired.set(element2D, {id, point});
        element2D.on('down', event => {
            if (this.host.isDisposed() || this.drag || !this.host.scene()?.interaction.editable) return;
            this.beginDrag(id, point);
            const pointerId = event?.pointerId;
            // JSXGraph is still going through the points under the pointer; it has chosen one when its listener returns.
            if (typeof pointerId === 'number') queueMicrotask(() => { if (this.drag?.id === id) this.followDraggedObject(pointerId); });
        });
        element2D.on('up', () => {
            if (this.drag?.id !== id) return;
            this.endDrag();
        });
    }

    private beginDrag(id: string, point: DraggablePoint): void {
        const last: Xyz = [point.X(), point.Y(), point.Z()];
        this.drag = {id, point, last};
        this.host.emit({kind: 'select', pointId: id});
        this.host.emit({kind: 'point', pointId: id, xyz: [...last], phase: 'start'});
    }

    /**
     * JSXGraph fires `down` on every point within its hit tolerance (30 px for touch, so neighbouring points of a dense net
     * all fire) but drags only one of them. The first `down` started a drag of whichever point came first in the board's
     * list; once JSXGraph has chosen, move the drag (and the selection) to the point it actually drags.
     */
    private followDraggedObject(pointerId: number): void {
        const chosen = this.host.draggedObject?.(pointerId);
        const wired = typeof chosen === 'object' && chosen !== null ? this.wired.get(chosen) : undefined;
        if (!wired || !this.drag || wired.id === this.drag.id) return;
        this.endDrag();
        this.beginDrag(wired.id, wired.point);
    }

    /** Runs after every board update; while a point is dragged, reports its new place. */
    onBoardUpdate(): void {
        const drag = this.drag;
        if (this.host.isDisposed() || !drag) return;
        const xyz: Xyz = [drag.point.X(), drag.point.Y(), drag.point.Z()];
        const last = drag.last;
        if (last[0] === xyz[0] && last[1] === xyz[1] && last[2] === xyz[2]) return;
        drag.last = xyz;
        this.host.emit({kind: 'point', pointId: drag.id, xyz: [...xyz], phase: 'move'});
    }

    /** Ends a running point drag with its last place (the board is about to go away, or the pointer was released). */
    endDrag(): void {
        const drag = this.drag;
        if (!drag) return;
        this.drag = null;
        this.host.emit({kind: 'point', pointId: drag.id, xyz: [drag.point.X(), drag.point.Y(), drag.point.Z()], phase: 'end'});
    }

    dispose(): void {
        this.drag = null;
        this.orbitDrag = null;
        for (const fn of this.cleanups.splice(0)) fn();
    }

    private listen<K extends keyof HTMLElementEventMap>(
        target: HTMLElement, type: K, handler: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions,
    ): void {
        target.addEventListener(type, handler as EventListener, options);
        this.cleanups.push(() => target.removeEventListener(type, handler as EventListener, options));
    }

    private onPointerDown(e: PointerEvent): void {
        if (this.host.isDisposed() || !this.host.scene() || this.drag) return;
        // JSXGraph handled the event first (its listener was registered first): a hit point is now in downObjects.
        if (this.host.pressedObjects().length > 0) return;
        this.orbitDrag = {id: e.pointerId, x: e.clientX, y: e.clientY, moved: false};
        this.host.container.setPointerCapture?.(e.pointerId);
    }

    private onPointerMove(e: PointerEvent): void {
        const d = this.orbitDrag, scene = this.host.scene();
        if (this.host.isDisposed() || !d || d.id !== e.pointerId || !scene || this.drag) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < ORBIT_START_PX) return;
        d.moved = true;
        d.x = e.clientX;
        d.y = e.clientY;
        this.host.emit({kind: 'camera', camera: orbit(scene.camera, dx, dy)});
    }

    private onPointerEnd(e: PointerEvent): void {
        if (this.orbitDrag?.id === e.pointerId) {
            this.host.container.releasePointerCapture?.(e.pointerId);
            this.orbitDrag = null;
        }
    }

    private onWheel(e: WheelEvent): void {
        const scene = this.host.scene();
        if (this.host.isDisposed() || !scene) return;
        e.preventDefault();
        this.host.emit({kind: 'camera', camera: zoom(scene.camera, Math.exp(e.deltaY * 0.001))});
    }

    private onKey(e: KeyboardEvent): void {
        const scene = this.host.scene();
        if (this.host.isDisposed() || !scene || e.altKey || e.ctrlKey || e.metaKey) return;
        const cam = scene.camera;
        let next: SurfaceCamera;
        switch (e.key) {
            case 'ArrowLeft': next = orbit(cam, KEY_STEP_PX, 0); break;
            case 'ArrowRight': next = orbit(cam, -KEY_STEP_PX, 0); break;
            case 'ArrowUp': next = orbit(cam, 0, KEY_STEP_PX); break;
            case 'ArrowDown': next = orbit(cam, 0, -KEY_STEP_PX); break;
            case '+': case '=': next = zoom(cam, 0.9); break;
            case '-': case '_': next = zoom(cam, 1 / 0.9); break;
            default: return;
        }
        e.preventDefault();
        this.host.emit({kind: 'camera', camera: next});
    }
}
