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
}

const ORIGIN: DragOffset = {x: 0, y: 0};
// Below this travel a press is a click, so a pressable handle still opens on a short tap.
const DRAG_THRESHOLD_PX = 5;
const KEY_STEP_PX = 16;
const KEY_STEP_LARGE_PX = 64;
const EDGE_GAP_PX = 6;

const measure = (element: Element): Box => {
    const {left, top, right, bottom} = element.getBoundingClientRect();
    return {left, top, right, bottom};
};

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

function measureGeometry(bounds: HTMLElement | null, element: HTMLElement | null, offset: DragOffset) {
    if (!bounds || !element) return undefined;
    const graph = measure(bounds);
    const box = measure(element);
    // Unlaid-out hosts (including tests without layout) report empty boxes; leave the offset untouched.
    if (graph.right <= graph.left || box.right <= box.left) return undefined;
    // A graph taller than the window must not let the element be dropped below the fold.
    const visible = {left: Math.max(graph.left, 0), top: Math.max(graph.top, 0), right: Math.min(graph.right, window.innerWidth), bottom: Math.min(graph.bottom, window.innerHeight)};
    const usable = visible.right > visible.left && visible.bottom > visible.top ? visible : graph;
    return {base: untranslated(box, offset), bounds: usable};
}

/**
 * Lets a floating overlay be moved within a bounding element by pointer drag or arrow keys.
 * The offset is applied by the caller as a translate, so the element's CSS placement stays its home;
 * the offset survives the element unmounting and returns to the home placement when `resetKey` changes.
 */
export function useDraggableOffset(boundsRef: RefObject<HTMLElement | null>, elementRef: RefObject<HTMLElement | null>, present: boolean, resetKey: unknown) {
    // The stored offset belongs to the reset key it was set under; a new key reads as the home placement.
    const [held, setHeld] = useState({key: resetKey, offset: ORIGIN});
    const [dragging, setDragging] = useState(false);
    const offset = held.key === resetKey ? held.offset : ORIGIN;
    const offsetRef = useRef(offset);
    const drag = useRef<ActiveDrag | null>(null);
    const suppressClick = useRef(false);
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
    // The observer's first notification also covers a graph that changed while the element was unmounted.
    useEffect(() => {
        if (!present || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => {
            const current = offsetRef.current;
            if (drag.current || (current.x === 0 && current.y === 0)) return;
            const measured = measureGeometry(boundsRef.current, elementRef.current, current);
            if (!measured) return;
            const next = clampOffset(current, measured.base, measured.bounds);
            if (next.x === current.x && next.y === current.y) return;
            offsetRef.current = next;
            setHeld(previous => ({...previous, offset: next}));
        });
        if (boundsRef.current) observer.observe(boundsRef.current);
        if (elementRef.current) observer.observe(elementRef.current);
        return () => observer.disconnect();
    }, [present, boundsRef, elementRef]);

    const geometry = () => measureGeometry(boundsRef.current, elementRef.current, offsetRef.current);

    const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
        suppressClick.current = false;
        if (event.button !== 0 || !event.isPrimary) return;
        const measured = geometry();
        if (!measured) return;
        drag.current = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startOffset: offsetRef.current, ...measured, moved: false};
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
            setDragging(true);
        }
        event.preventDefault();
        apply(clampOffset({x: active.startOffset.x + dx, y: active.startOffset.y + dy}, active.base, active.bounds));
    };

    const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        drag.current = null;
        // The click that follows a drag release belongs to the drag, not to the handle's action.
        suppressClick.current = active.moved;
        if (active.moved) setDragging(false);
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
        const step = event.shiftKey ? KEY_STEP_LARGE_PX : KEY_STEP_PX;
        const delta = {ArrowLeft: {x: -step, y: 0}, ArrowRight: {x: step, y: 0}, ArrowUp: {x: 0, y: -step}, ArrowDown: {x: 0, y: step}}[event.key];
        if (!delta || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        const measured = geometry();
        if (!measured) return;
        apply(clampOffset({x: offsetRef.current.x + delta.x, y: offsetRef.current.y + delta.y}, measured.base, measured.bounds));
    };

    /** Returns true once for the click that ends a drag, so the handle can skip its press action. */
    const consumeDragClick = () => {
        const suppressed = suppressClick.current;
        suppressClick.current = false;
        return suppressed;
    };

    return {
        offset,
        dragging,
        style: offset.x === 0 && offset.y === 0 ? undefined : {transform: `translate(${offset.x}px, ${offset.y}px)`},
        handleProps: {onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onKeyDown},
        consumeDragClick,
    };
}
