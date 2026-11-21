import React, {createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './dock.css';
import {
    AXIS, LESSON, TARGETS, currentGap, getLessonSize, getOutlines, getPlaceholderEl, lessonLifted, lessonSlotted, orderOf, placementOf,
    setHost, setPlaceholderEl, useDockLayout, type DragView, type Target,
} from './dockLayout';
import {useFlip} from './dockFlip';
import {ANCHOR_AT, REGION_LABEL} from './dockMeasure';
import {ScrollIcon} from './icons';

/**
 * The board dock: one host for everything the picks put on or beside the graph, so objects never overlap.
 * Anchors around the board's edge (a grid of three columns and four rows): 'tl', 'tc', 'tr' along the top, 'ml' and 'mr'
 * at the sides, 'bc' and 'br' along the bottom, and 'bottom' (the pucks' strip) under them. A stack taller than its room
 * scrolls; 'tray' sits directly under the board (phones). Add an object with `<DockCard .../>` (a movable, foldable card)
 * or `<DockItem .../>` (anything).
 */
export type DockRegion = Target | 'bottom' | 'tray';

export const PHONE_QUERY = '(max-width: 700px)';

interface DockApi {
    regions: Partial<Record<DockRegion, HTMLElement | null>>;
    phone: boolean;
    /** The card open on a phone (one at a time), by kind. */
    phoneOpen: string | null;
    setPhoneOpen(kind: string | null): void;
    frame: React.RefObject<HTMLElement | null>;
}

const DockContext = createContext<DockApi | null>(null);
export function useDock(): DockApi | null { return useContext(DockContext); }

export function usePhone(): boolean {
    const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches === true);
    useEffect(() => {
        const query = window.matchMedia?.(PHONE_QUERY);
        if (!query) return;
        const read = () => setPhone(query.matches);
        read();
        query.addEventListener('change', read);
        return () => query.removeEventListener('change', read);
    }, []);
    return phone;
}

type Els = Partial<Record<Target | 'bottom', HTMLElement | null>>;
const ANCHORS: readonly (Target | 'bottom')[] = ['tl', 'tc', 'tr', 'ml', 'mr', 'bc', 'br', 'bottom'];
/** The dock's columns, left to right: each lists its anchors top to bottom. */
const COLUMNS: readonly (readonly Target[])[] = [['tl', 'ml'], ['tc', 'bc'], ['tr', 'mr', 'br']];
const SIDE_STACKS = ['tl', 'ml', 'tr', 'mr', 'br'] as const;

export function BoardDock(props: {frame: React.RefObject<HTMLElement | null>; tray: HTMLElement | null; children: React.ReactNode}) {
    const [els, setEls] = useState<Els>({});
    // One stable ref callback per anchor (a new one every render would detach and attach the element again).
    const refs = useMemo(() => Object.fromEntries(ANCHORS.map(k => [k, (el: HTMLElement | null) => setEls(prev => (prev[k] ?? null) === el ? prev : {...prev, [k]: el})])) as Record<Target | 'bottom', (el: HTMLElement | null) => void>, []);
    const dockEl = React.useRef<HTMLDivElement>(null);
    const [phoneOpen, setPhoneOpen] = useState<string | null>(null);
    const phone = usePhone();
    const api = useMemo<DockApi>(() => ({
        regions: {...els, tray: props.tray}, phone, phoneOpen, setPhoneOpen, frame: props.frame,
    }), [els, props.tray, phone, phoneOpen, props.frame]);
    // A stack never grows taller than a share of the board: it scrolls instead. Each side column is as wide as its widest
    // stack, so the centre rows never reach a side stack.
    useEffect(() => {
        const host = props.frame.current, el = dockEl.current;
        if (!host || !el || typeof ResizeObserver === 'undefined') return undefined;
        const width = (keys: readonly Target[]) => Math.ceil(keys.reduce((m, k) => { const r = els[k]; return r && r.offsetWidth > 0 ? Math.max(m, r.offsetWidth + 8) : m; }, 0));
        const side = () => {
            el.style.setProperty('--ux-side-l', `${width(['tl', 'ml'])}px`);
            el.style.setProperty('--ux-side-r', `${width(['tr', 'mr', 'br'])}px`);
        };
        const ro = new ResizeObserver(() => { el.style.setProperty('--ux-dock-h', `${host.clientHeight}px`); side(); });
        ro.observe(host);
        for (const k of SIDE_STACKS) { const r = els[k]; if (r) ro.observe(r); }
        side();
        return () => ro.disconnect();
    }, [props.frame, els]);
    // The graph dock is known to the lesson card (outside this tree) through the layout module.
    useEffect(() => { setHost({regions: api.regions, frame: props.frame.current}); return () => setHost(null); }, [api, props.frame]);
    // A stack that scrolls says so: data-overflow tells the stylesheet which edges are cut (scrollbar and fade).
    useEffect(() => {
        const mark = () => {
            for (const k of TARGETS) {
                const el = els[k];
                if (!el) continue;
                const horiz = AXIS[k] === 'h';
                const pos = horiz ? el.scrollLeft : el.scrollTop, size = horiz ? el.clientWidth : el.clientHeight, total = horiz ? el.scrollWidth : el.scrollHeight;
                const v = [pos > 1 ? 'start' : '', pos + size < total - 1 ? 'end' : ''].filter(Boolean).join(' ');
                if (el.getAttribute('data-overflow') !== v) { if (v) el.setAttribute('data-overflow', v); else el.removeAttribute('data-overflow'); }
            }
        };
        mark();
        const timer = window.setInterval(mark, 200);
        document.addEventListener('scroll', mark, true);
        return () => { window.clearInterval(timer); document.removeEventListener('scroll', mark, true); };
    }, [els]);
    const layoutVersion = useDockLayout();
    const view = getOutlines();
    const frameEl = props.frame.current;
    const region = (k: Target | 'bottom') => <div key={k} className={`ux-dock-region ux-dock-${k === 'bottom' ? 'strip' : AXIS[k]} ux-dock-a-${k}`} data-region={k} ref={refs[k]}/>;
    return <DockContext.Provider value={api}>
        <div className="ux-dock" data-dock="" ref={dockEl}>
            {COLUMNS.map((col, i) => <div key={i} className={`ux-dock-col ux-dock-col-${'lcr'[i]}`}>{col.map(region)}</div>)}
            {region('bottom')}
        </div>
        {props.children}
        {view && frameEl && !api.phone && <DragPreview frame={frameEl} dock={dockEl.current} view={view} version={layoutVersion}/>}
        {layoutVersion >= 0 && !phone && <LessonGap api={api}/>}
        {layoutVersion >= 0 && lessonSlotted() && !lessonLifted() && !phone && <LessonPlaceholder api={api}/>}
    </DockContext.Provider>;
}

interface Box { x: number; y: number; w: number; h: number; }
const same = (a: Box | null, b: Box) => a !== null && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** While dragging: a quiet marker at every anchor, one soft ghost where the card would land, and "Prosto" over the middle. */
function DragPreview(props: {frame: HTMLElement; dock: HTMLElement | null; view: DragView; version: number}) {
    const {frame, dock, view, version} = props;
    const [box, setBox] = useState<Box | null>(null);
    const g = currentGap();
    const active = view.region !== null && g?.isTarget ? view.region : null;
    useLayoutEffect(() => {
        let raf = 0, again = 2;
        const measure = () => {
            const el = dock?.querySelector<HTMLElement>('.ux-dock-gap[data-dock-gap="target"]');
            if (!el || !active) { setBox(null); return; }
            const f = frame.getBoundingClientRect(), b = el.getBoundingClientRect(), t = getComputedStyle(el).transform;
            const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : null;
            const next = {x: Math.round(b.left - (m?.m41 ?? 0) - f.left), y: Math.round(b.top - (m?.m42 ?? 0) - f.top), w: Math.round(b.width), h: Math.round(b.height)};
            setBox(prev => same(prev, next) ? prev : next);
            // Layout may still settle (the side columns resize after the gap appears): look again for two frames.
            if (again-- > 0) raf = requestAnimationFrame(measure);
        };
        measure();
        return () => cancelAnimationFrame(raf);
    }, [frame, dock, active, version, g?.index, g?.w, g?.h]);
    const W = frame.clientWidth, H = frame.clientHeight;
    return createPortal(<>
        {TARGETS.filter(k => k !== active).map(k => {
            const [ax, ay] = ANCHOR_AT[k];
            const corner = ax !== 0.5 && ay !== 0.5, vertical = ax !== 0.5 && ay === 0.5;
            const bw = corner ? 8 : vertical ? 6 : 28, bh = corner ? 8 : vertical ? 28 : 6;
            const left = ax === 0 ? 2 : ax === 1 ? W - 2 - bw : W / 2 - bw / 2, top = ay === 0 ? 2 : ay === 1 ? H - 2 - bh : H / 2 - bh / 2;
            return <div key={k} className="ux-dock-marker" data-dock-marker={k} style={{left, top, width: bw, height: bh}} aria-hidden="true"/>;
        })}
        {box && active && <div className="ux-dock-ghost" data-dock-ghost={active} style={{left: box.x, top: box.y, width: box.w, height: box.h}} aria-hidden="true">
            <span className="ux-dock-pill">{REGION_LABEL[active]}{view.scrolls && <ScrollIcon/>}</span>
        </div>}
        {view.free && <span className="ux-dock-pill ux-dock-free" data-dock-free="" style={{left: view.free.x, top: Math.min(view.free.y, H - 24)}} aria-hidden="true">Prosto</span>}
    </>, frame);
}

/** The reserved place of a lifted card, or where a drop would put it: it only makes room (the ghost is what shows). */
export function GapSlot(props: {w: number; h: number; order: number; target: boolean}) {
    const ref = useRef<HTMLDivElement>(null);
    useFlip(ref, false);
    return <div ref={ref} className="ux-dock-gap" data-dock-gap={props.target ? 'target' : 'origin'}
                style={{width: props.w, height: props.h, order: props.order}} aria-hidden="true"/>;
}

/** The lesson card is not a DockCard: its gap is made here. */
function LessonGap(props: {api: DockApi}) {
    const g = currentGap();
    const target = g && g.kind === LESSON ? props.api.regions[g.region] : null;
    return g && target ? createPortal(<GapSlot w={g.w} h={g.h} order={2 * g.index} target={g.isTarget}/>, target) : null;
}

/** Puts its children in a dock region. On a phone `phoneRegion` replaces `region` (e.g. pucks move to the tray). */
export function DockItem(props: {region: DockRegion; phoneRegion?: DockRegion; children: React.ReactNode}) {
    const dock = useDock();
    if (!dock) return null;
    const target = dock.regions[dock.phone && props.phoneRegion ? props.phoneRegion : props.region];
    return target ? createPortal(props.children, target) : null;
}

/** The lesson card's reserved place in a graph stack: an empty item of the card's size, stacked, ordered and glided like a card. */
function LessonPlaceholder(props: {api: DockApi}) {
    const ref = useRef<HTMLDivElement>(null);
    useFlip(ref, false);
    const region = placementOf(LESSON).region;
    const target = props.api.regions[region];
    useEffect(() => { setPlaceholderEl(ref.current); return () => { if (getPlaceholderEl() === ref.current) setPlaceholderEl(null); }; });
    const {w, h} = getLessonSize();
    if (!target) return null;
    return createPortal(<div ref={ref} className="ux-dock-ph" data-dock-item="" data-kind={LESSON} style={{width: w, height: h, order: orderOf(LESSON)}} aria-hidden="true"/>, target);
}
