import {useEffect, useLayoutEffect, useRef, type RefObject} from 'react';
import type {useDraggableOffset} from '../../learning/runtime/useDraggableOffset';
import {LESSON, clearGap, dropAtGap, getHost, getPlaceholderEl, lessonSlotted, pickUp, releaseLesson, setGap, setLessonSize, setOutlines, useDockLayout} from './dockLayout';
import {measureDrag} from './dockMeasure';

type Drag = ReturnType<typeof useDraggableOffset>;

/**
 * Pick boardText: lets the guided lesson card take a place in the graph dock. The card stays where it is in the React
 * tree (it keeps its state); the dock reserves an invisible placeholder of the card's size, and the card is kept
 * translated exactly over it. While the card is dragged the dock shows its slots and previews the reflow.
 * Returns whether the card holds a graph place.
 */
export function useLessonDock(o: {
    enabled: boolean; lesson: unknown; panelDrag: Drag; tabDrag: Drag;
    panelRef: RefObject<HTMLElement | null>; tabRef: RefObject<HTMLElement | null>; layerRef: RefObject<HTMLElement | null>;
    phase: string;
}): boolean {
    const version = useDockLayout();
    const slotted = o.enabled && lessonSlotted();
    const latest = useRef(o);
    latest.current = o;
    const {panelDrag} = o;
    const dragging = panelDrag.dragging;
    const was = useRef(false);
    const atHome = panelDrag.offset.x === 0 && panelDrag.offset.y === 0;

    // Dragging the card over the graph: slots and the glide preview; the drop docks it or frees its place.
    useLayoutEffect(() => {
        if (!o.enabled) return;
        const el = o.panelRef.current, host = getHost();
        if (dragging) {
            if (!el || !host?.frame) return;
            const w = el.offsetWidth, h = el.offsetHeight;
            if (!was.current) { was.current = true; pickUp(LESSON, w, h, lessonSlotted()); }
            // No side docks: with pick toolsCard the lesson's home already is the tools' side of the graph.
            const m = measureDrag(host.regions, host.frame, null, el.getBoundingClientRect(), w, h, false);
            if (!m) return;
            if (atHome) setGap(LESSON, null, 0, w, h); else setGap(LESSON, m.region, m.index, w, h);
            setOutlines(LESSON, m.view);
        } else if (was.current) {
            was.current = false;
            if (atHome || !dropAtGap(LESSON)) { clearGap(LESSON); releaseLesson(); }
            setOutlines(LESSON, null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragging, panelDrag.offset.x, panelDrag.offset.y, version, o.enabled]);

    // A new lesson (or leaving) frees the place.
    useEffect(() => () => releaseLesson(), [o.lesson]);

    const hidden = o.phase === 'hidden';
    // The placeholder takes the size of whatever shows: the card, or its tab while hidden.
    useEffect(() => {
        if (!slotted || dragging) return undefined;
        const el = hidden ? o.tabRef.current : o.panelRef.current;
        if (!el) return undefined;
        const set = () => setLessonSize(el.offsetWidth, el.offsetHeight);
        set();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(set);
        ro.observe(el);
        return () => ro.disconnect();
    }, [slotted, dragging, hidden, o.tabRef, o.panelRef]);

    // The follower: every frame the card (or tab) is moved onto the placeholder, so it keeps up with resizes, cards moving
    // and scrolling. It rests while a transition runs (opening, closing) or the card is carried.
    useEffect(() => {
        if (!slotted || dragging) return undefined;
        let raf = 0;
        const tick = () => {
            raf = requestAnimationFrame(tick);
            const c = latest.current;
            if (c.phase !== 'visible' && c.phase !== 'hidden') return;
            const ph = getPlaceholderEl(), layer = c.layerRef.current;
            const el = c.phase === 'hidden' ? c.tabRef.current : c.panelRef.current;
            if (!ph || !el || !layer) return;
            const p = ph.getBoundingClientRect(), r = el.getBoundingClientRect(), l = layer.getBoundingClientRect();
            if (p.width <= 0 || (Math.abs(p.left - r.left) < 0.5 && Math.abs(p.top - r.top) < 0.5)) return;
            (c.phase === 'hidden' ? c.tabDrag : c.panelDrag).moveTo({x: p.left - l.left, y: p.top - l.top});
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [slotted, dragging]);
    return slotted;
}
