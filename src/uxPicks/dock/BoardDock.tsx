import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './dock.css';
import {lessonLifted, getLessonSize, getOutlines, getPlaceholderEl, lessonSlotted, orderOf, placementOf, setHost, setPlaceholderEl, useDockLayout} from './dockLayout';
import {useFlip} from './dockFlip';
import {LESSON} from './dockLayout';

/**
 * The board dock: one host for everything the picks put on or beside the graph, so objects never overlap.
 * Regions along the board's edges: 'top-start' and 'top-end' are vertical stacks at the left and right ends of a top rail
 * (a stack taller than the board scrolls); 'bottom-end' is a stack in the bottom right corner; 'bottom' is the strip along the bottom left; 'tray' sits directly under
 * the board (phones). Add an object with `<DockCard .../>` (a movable, foldable card) or `<DockItem .../>` (anything).
 */
export type DockRegion = 'top-start' | 'top-end' | 'bottom-end' | 'top-row' | 'bottom-row' | 'bottom' | 'tray';

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

export function BoardDock(props: {frame: React.RefObject<HTMLElement | null>; tray: HTMLElement | null; children: React.ReactNode}) {
    const [start, setStart] = useState<HTMLElement | null>(null);
    const [end, setEnd] = useState<HTMLElement | null>(null);
    const [bottom, setBottom] = useState<HTMLElement | null>(null);
    const [bottomEnd, setBottomEnd] = useState<HTMLElement | null>(null);
    const [topRow, setTopRow] = useState<HTMLElement | null>(null);
    const [bottomRow, setBottomRow] = useState<HTMLElement | null>(null);
    const dockEl = React.useRef<HTMLDivElement>(null);
    const [phoneOpen, setPhoneOpen] = useState<string | null>(null);
    const phone = usePhone();
    const api = useMemo<DockApi>(() => ({
        regions: {'top-start': start, 'top-end': end, 'bottom-end': bottomEnd, 'top-row': topRow, 'bottom-row': bottomRow, bottom, tray: props.tray},
        phone, phoneOpen, setPhoneOpen, frame: props.frame,
    }), [start, end, bottomEnd, topRow, bottomRow, bottom, props.tray, phone, phoneOpen, props.frame]);
    // A stack never grows taller than a share of the board: it scrolls instead.
    useEffect(() => {
        const host = props.frame.current, el = dockEl.current;
        if (!host || !el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(() => el.style.setProperty('--ux-dock-h', `${host.clientHeight}px`));
        ro.observe(host);
        return () => ro.disconnect();
    }, [props.frame]);
    // The graph dock is known to the lesson card (outside this tree) through the layout module.
    useEffect(() => { setHost({regions: api.regions, frame: props.frame.current}); return () => setHost(null); }, [api, props.frame]);
    // A stack that scrolls says so: data-overflow tells the stylesheet which edges are cut (scrollbar and fade).
    useEffect(() => {
        const mark = () => {
            for (const el of Object.values(api.regions)) {
                if (!el || !el.classList.contains('ux-dock-region')) continue;
                const horiz = el.classList.contains('ux-dock-top-row') || el.classList.contains('ux-dock-bottom-row-stack');
                const pos = horiz ? el.scrollLeft : el.scrollTop, size = horiz ? el.clientWidth : el.clientHeight, total = horiz ? el.scrollWidth : el.scrollHeight;
                const v = [pos > 1 ? 'start' : '', pos + size < total - 1 ? 'end' : ''].filter(Boolean).join(' ');
                if (el.getAttribute('data-overflow') !== v) { if (v) el.setAttribute('data-overflow', v); else el.removeAttribute('data-overflow'); }
            }
        };
        mark();
        const timer = window.setInterval(mark, 200);
        document.addEventListener('scroll', mark, true);
        return () => { window.clearInterval(timer); document.removeEventListener('scroll', mark, true); };
    }, [api]);
    const layoutVersion = useDockLayout();
    const outlines = getOutlines();
    const frameEl = props.frame.current;
    return <DockContext.Provider value={api}>
        <div className="ux-dock" data-dock="" ref={dockEl}>
            <div className="ux-dock-top">
                <div className="ux-dock-region ux-dock-start" data-region="top-start" ref={setStart}/>
                <div className="ux-dock-region ux-dock-top-row" data-region="top-row" ref={setTopRow}/>
                <div className="ux-dock-region ux-dock-end" data-region="top-end" ref={setEnd}/>
            </div>
            <div className="ux-dock-bottom-row">
                <div className="ux-dock-region ux-dock-bottom" data-region="bottom" ref={setBottom}/>
                <div className="ux-dock-region ux-dock-bottom-row-stack" data-region="bottom-row" ref={setBottomRow}/>
                <div className="ux-dock-region ux-dock-bottom-end" data-region="bottom-end" ref={setBottomEnd}/>
            </div>
        </div>
        {props.children}
        {outlines && frameEl && createPortal(<>{outlines.map((sl, i) => sl.label !== undefined && !sl.bar && sl.w === 0
            ? <div key={`t${sl.region}`} className="ux-dock-tag" data-dock-tag={sl.region} style={{left: sl.x, top: Math.max(2, Math.min(sl.y, frameEl.clientHeight - 20))}} aria-hidden="true">{sl.label}</div>
            : <div key={`${sl.region}:${i}:${sl.x}:${sl.y}`} className={`ux-dock-slot${sl.bar ? ' is-bar' : ''}`} data-dock-slot={sl.region}
                   style={{left: sl.x, top: sl.y, width: sl.w, height: sl.h}} aria-hidden="true"/>)}</>, frameEl)}
        {layoutVersion >= 0 && lessonSlotted() && !lessonLifted() && !phone && <LessonPlaceholder api={api}/>}
    </DockContext.Provider>;
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
