import {KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject, useEffect, useLayoutEffect, useRef, useState} from 'react';

export interface DragOffset {
    x: number;
    y: number;
}

interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

interface ActiveDrag {
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: DragOffset;
    // The element's untranslated box and the bounds, measured once when the pointer goes down.
    base: Box;
    bounds: Box;
    moved: boolean;
    // Snapping home starts once the element has been farther than the snap radius from home during this drag,
    // so a drag that starts at home can leave it.
    snapArmed: boolean;
}

const ORIGIN: DragOffset = {x: 0, y: 0};
// Below this travel a press is a click, so a pressable handle still opens on a short tap.
const DRAG_THRESHOLD_PX = 5;
const KEY_STEP_PX = 16;
const KEY_STEP_LARGE_PX = 64;
const EDGE_GAP_PX = 6;
/** Within this distance of its home an element brought back by drag or arrow keys docks there. */
export const SNAP_HOME_PX = 48;

const measure = (element: Element): Box => {
    const {left, top, right, bottom} = element.getBoundingClientRect();
    return {left, top, right, bottom};
};

const distanceFromHome = (offset: DragOffset) => Math.hypot(offset.x, offset.y);

/**
 * The offset to apply after a move: home once an armed drag, or an arrow key moving towards home, brings the requested
 * offset within the snap radius; otherwise the clamped offset. The request is read before clamping, because home is
 * always a valid place even when the window clamp would keep a tall card from getting near it.
 */
export function snapHome(requested: DragOffset, clamped: DragOffset, previous: DragOffset, armed: boolean): DragOffset {
    const distance = distanceFromHome(requested);
    if (distance > SNAP_HOME_PX) return clamped;
    return armed || distance < distanceFromHome(previous) ? ORIGIN : clamped;
}

const untranslated = (box: Box, offset: DragOffset): Box => ({
    left: box.left - offset.x, top: box.top - offset.y, right: box.right - offset.x, bottom: box.bottom - offset.y,
});

/** Keeps the whole element inside the bounds; when it cannot fit, its top-left edge stays visible. */
export function clampOffset(candidate: DragOffset, base: Box, bounds: Box): DragOffset {
    const clampAxis = (value: number, start: number, end: number, boundStart: number, boundEnd: number) => {
        const min = boundStart + EDGE_GAP_PX - start;
        const max = boundEnd - EDGE_GAP_PX - end;
        return Math.max(min, Math.min(value, max));
    };
    return {
        x: clampAxis(candidate.x, base.left, base.right, bounds.left, bounds.right),
        y: clampAxis(candidate.y, base.top, base.bottom, bounds.top, bounds.bottom),
    };
}

/**
 * The element's untranslated box and the box it may be dragged within. The bounds are the visible window,
 * not the graph, so a lesson card can be parked on the inspector or page margins; `clampOffset` still keeps
 * its top-left grip on screen when the card is larger than the window.
 */
export function computeGeometry(graph: Box, box: Box, offset: DragOffset, viewport: {width: number; height: number}) {
    // Unlaid-out hosts (including tests without layout) report empty boxes; leave the offset untouched.
    if (graph.right <= graph.left || box.right <= box.left) return undefined;
    return {base: untranslated(box, offset), bounds: {left: 0, top: 0, right: viewport.width, bottom: viewport.height}};
}

function measureGeometry(bounds: HTMLElement | null, element: HTMLElement | null, offset: DragOffset) {
    if (!bounds || !element) return undefined;
    return computeGeometry(measure(bounds), measure(element), offset, {width: window.innerWidth, height: window.innerHeight});
}

/**
 * Lets a floating overlay be moved within the window by pointer drag or arrow keys.
 * The offset is applied by the caller as a translate, so the element's CSS placement stays its home;
 * the offset survives the element unmounting and returns to the home placement when `resetKey` changes.
 */
export function useDraggableOffset(boundsRef: RefObject<HTMLElement | null>, elementRef: RefObject<HTMLElement | null>, present: boolean, resetKey: unknown) {
    // The stored offset belongs to the reset key it was set under; a new key reads as the home placement.
    const [held, setHeld] = useState({key: resetKey, offset: ORIGIN});
    // The element's home box in window coordinates while a drag that has passed the threshold is under way.
    const [dragHome, setDragHome] = useState<Box | undefined>(undefined);
    const offset = held.key === resetKey ? held.offset : ORIGIN;
    const offsetRef = useRef(offset);
    const drag = useRef<ActiveDrag | null>(null);
    const suppressClick = useRef(false);
    const requested = useRef<{key: unknown; point: DragOffset}>();
    // Handlers and the resize observer measure the DOM, so they read the offset that is actually rendered.
    useLayoutEffect(() => {
        offsetRef.current = offset;
    });

    const apply = (next: DragOffset) => {
        if (next.x === offsetRef.current.x && next.y === offsetRef.current.y) return;
        offsetRef.current = next;
        setHeld({key: resetKey, offset: next});
    };

    // Resizing the graph or the element (a new frame, a language switch) must not strand it outside the graph.
    // The observer's first notification, delivered before the first paint, also places an element that mounts
    // with a requested position and covers a graph that changed while the element was unmounted.
    useEffect(() => {
        if (!present || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => {
            const current = offsetRef.current;
            const request = requested.current;
            const target = request && request.key === resetKey ? request.point : undefined;
            if (drag.current || (!target && current.x === 0 && current.y === 0)) return;
            const measured = measureGeometry(boundsRef.current, elementRef.current, current);
            if (!measured || !boundsRef.current) return;
            requested.current = undefined;
            const graph = measure(boundsRef.current);
            const candidate = target ? {x: graph.left + target.x - measured.base.left, y: graph.top + target.y - measured.base.top} : current;
            const next = clampOffset(candidate, measured.base, measured.bounds);
            if (next.x === current.x && next.y === current.y) return;
            offsetRef.current = next;
            setHeld({key: resetKey, offset: next});
        });
        const observeAll = () => {
            if (boundsRef.current) observer.observe(boundsRef.current);
            if (elementRef.current) observer.observe(elementRef.current);
        };
        observeAll();
        // The bounds are the window: re-observing delivers a fresh notification, which re-clamps after a window resize.
        const onResize = () => { observer.disconnect(); observeAll(); };
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); observer.disconnect(); };
    }, [present, boundsRef, elementRef, resetKey]);

    const geometry = () => measureGeometry(boundsRef.current, elementRef.current, offsetRef.current);

    /** The element's top-left corner relative to the bounds, while it is mounted and laid out. */
    const topLeft = (): DragOffset | undefined => {
        if (!boundsRef.current || !elementRef.current) return undefined;
        const graph = measure(boundsRef.current);
        const box = measure(elementRef.current);
        if (graph.right <= graph.left || box.right <= box.left) return undefined;
        return {x: box.left - graph.left, y: box.top - graph.top};
    };

    /** Places the element's top-left corner at a point relative to the bounds, now or as soon as it mounts. */
    const moveTo = (point: DragOffset) => {
        const measured = geometry();
        if (!measured || !boundsRef.current) {
            requested.current = {key: resetKey, point};
            return;
        }
        requested.current = undefined;
        const graph = measure(boundsRef.current);
        apply(clampOffset({x: graph.left + point.x - measured.base.left, y: graph.top + point.y - measured.base.top}, measured.base, measured.bounds));
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
        suppressClick.current = false;
        if (event.button !== 0 || !event.isPrimary) return;
        const measured = geometry();
        if (!measured) return;
        drag.current = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startOffset: offsetRef.current, ...measured, moved: false,
            snapArmed: distanceFromHome(offsetRef.current) > SNAP_HOME_PX};
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        const dx = event.clientX - active.startX;
        const dy = event.clientY - active.startY;
        if (!active.moved) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
            active.moved = true;
            setDragHome(active.base);
        }
        event.preventDefault();
        const requestedOffset = {x: active.startOffset.x + dx, y: active.startOffset.y + dy};
        const next = clampOffset(requestedOffset, active.base, active.bounds);
        if (distanceFromHome(next) > SNAP_HOME_PX) active.snapArmed = true;
        apply(snapHome(requestedOffset, next, offsetRef.current, active.snapArmed));
    };

    const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        drag.current = null;
        // The click that follows a drag release belongs to the drag, not to the handle's action.
        suppressClick.current = active.moved;
        if (active.moved) setDragHome(undefined);
    };

    /** Returns the element to its home placement and drops a position requested for its next mount. */
    const home = () => {
        requested.current = undefined;
        apply(ORIGIN);
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'Home' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            home();
            return;
        }
        const step = event.shiftKey ? KEY_STEP_LARGE_PX : KEY_STEP_PX;
        const delta = {ArrowLeft: {x: -step, y: 0}, ArrowRight: {x: step, y: 0}, ArrowUp: {x: 0, y: -step}, ArrowDown: {x: 0, y: step}}[event.key];
        if (!delta || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        const measured = geometry();
        if (!measured) return;
        const requestedOffset = {x: offsetRef.current.x + delta.x, y: offsetRef.current.y + delta.y};
        apply(snapHome(requestedOffset, clampOffset(requestedOffset, measured.base, measured.bounds), offsetRef.current, false));
    };

    /** Returns true once for the click that ends a drag, so the handle can skip its press action. */
    const consumeDragClick = () => {
        const suppressed = suppressClick.current;
        suppressClick.current = false;
        return suppressed;
    };

    return {
        offset,
        dragging: dragHome !== undefined,
        /** The home box in window coordinates while the element is being dragged, to show where it docks. */
        dragHome,
        style: offset.x === 0 && offset.y === 0 ? undefined : {transform: `translate(${offset.x}px, ${offset.y}px)`},
        handleProps: {onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onKeyDown},
        consumeDragClick,
        topLeft,
        moveTo,
        home,
    };
}
