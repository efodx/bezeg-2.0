import {planFolds} from './dockBudget';
import {onAutoOpenChange} from '../boardText/autoOpenStore';
import React, {createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import './dock.css';
import {
    AXIS, LESSON, TARGETS, currentGap, getLessonSize, getOutlines, getPlaceholderEl, lessonLifted, lessonSlotted, orderOf, placementOf,
    setHost, setPlaceholderEl, useDockLayout, type DragView, type Target,
} from './dockLayout';
import {CARD_DRAG, GLIDING, SETTLED, useFlip} from './dockFlip';
import {ANCHOR_AT, REGION_LABEL} from './dockMeasure';
import {ScrollIcon} from './icons';
import {setToolsExpanded} from '../toolsCard/toolsExpand';
import {GesturesHint} from './GesturesHint';
import {ShortcutsHost} from './Shortcuts';
import {BAR, FADE, blockBands, clearSnap, footOf, pageStep, snapRows} from './snapRows';

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
/** The mounted dock's API for cards rendered outside its tree (pick toolsCard: the tools card lives in the workspace). */
let published: DockApi | null = null;
const apiListeners = new Set<() => void>();
const subscribeApi = (l: () => void) => { apiListeners.add(l); return () => { apiListeners.delete(l); }; };
function publish(api: DockApi | null) { published = api; apiListeners.forEach(l => l()); }
export function useDock(): DockApi | null {
    const own = useContext(DockContext);
    const shared = useSyncExternalStore(subscribeApi, () => published, () => null);
    return own ?? shared;
}

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
    useEffect(() => { publish(api); return () => { if (published === api) publish(null); }; }, [api]);
    // A stack never grows taller than a share of the board: it scrolls instead. Each side column is as wide as its widest
    // stack, so the centre rows never reach a side stack.
    useEffect(() => {
        const host = props.frame.current, el = dockEl.current;
        if (!host || !el || typeof ResizeObserver === 'undefined') return undefined;
        const width = (keys: readonly Target[]) => Math.ceil(keys.reduce((m, k) => { const r = els[k]; return r && r.offsetWidth > 0 ? Math.max(m, r.offsetWidth + 8) : m; }, 0));
        const side = () => {
            const right = width(['tr', 'mr', 'br']);
            el.style.setProperty('--ux-side-l', `${width(['tl', 'ml'])}px`);
            el.style.setProperty('--ux-side-r', `${right}px`);
            // The right column runs down to the board's bottom when the pucks' strip has nothing under it.
            const strip = els.bottom, d = el.getBoundingClientRect();
            const reach = strip ? Array.from(strip.querySelectorAll<HTMLElement>(':scope > *, :scope > * > *'))
                .reduce((m, c) => Math.max(m, c.getBoundingClientRect().right - d.left), 0) : 0;
            const full = reach < d.width - right - 12;
            if (full !== el.hasAttribute('data-right-full')) { if (full) el.setAttribute('data-right-full', ''); else el.removeAttribute('data-right-full'); }
        };
        // Phone: the chips tray wraps, so the room the frame leaves under the graph follows the tray's own height.
        const tray = () => {
            const tl = els.tl, coarse = window.matchMedia('(pointer: coarse)').matches;
            if (window.matchMedia(PHONE_QUERY).matches && tl && tl.offsetHeight > 0) host.style.setProperty('--ux-tray-h', `${Math.ceil(tl.offsetHeight + (coarse ? 8 : 6))}px`);
            else host.style.removeProperty('--ux-tray-h');
        };
        const ro = new ResizeObserver(() => { el.style.setProperty('--ux-dock-h', `${host.clientHeight}px`); side(); tray(); });
        ro.observe(host);
        if (els.tl) ro.observe(els.tl);
        for (const k of SIDE_STACKS) { const r = els[k]; if (r) ro.observe(r); }
        if (els.bottom) { ro.observe(els.bottom); for (const c of Array.from(els.bottom.children)) ro.observe(c); }
        side(); tray();
        return () => { ro.disconnect(); host.style.removeProperty('--ux-tray-h'); };
    }, [props.frame, els]);
    // The graph dock is known to the lesson card (outside this tree) through the layout module.
    useEffect(() => { setHost({regions: api.regions, frame: props.frame.current}); return () => setHost(null); }, [api, props.frame]);
    // Fold before clip: on mount, window resize and a lesson frame change the lowest-priority open card of a column that cannot show its cards whole folds.
    useEffect(() => {
        const dock = dockEl.current;
        if (!dock || phone) return undefined;
        let timer = 0;
        const replan = () => { window.clearTimeout(timer); timer = window.setTimeout(() => planFolds(dock, k => `ux-boardcard-collapsed:${k}`), 250); };
        replan();
        window.addEventListener('resize', replan);
        const off = onAutoOpenChange(replan);
        return () => { window.clearTimeout(timer); window.removeEventListener('resize', replan); off(); };
    }, [phone]);
    // A stack that scrolls says so: data-overflow tells the stylesheet which edges are cut (scrollbar and fade).
    useEffect(() => {
        const mark = () => {
            for (const k of TARGETS) {
                const el = els[k];
                if (!el) continue;
                // A card whose body is a plot (no readout rows) is marked, and so is its stack: the stylesheet keeps its natural height.
                let plot = false;
                for (const card of Array.from(el.children) as HTMLElement[]) {
                    const isPlot = card.classList.contains('ux-btext') && !card.classList.contains('ux-btext-collapsed') && !card.classList.contains('ux-bcard-tools') && !card.classList.contains('ux-bcard-guide') && card.querySelector('[data-readout]') === null;
                    if (card.hasAttribute('data-plot') !== isPlot) { if (isPlot) card.setAttribute('data-plot', ''); else card.removeAttribute('data-plot'); }
                    plot = plot || isPlot;
                }
                if (el.hasAttribute('data-plot') !== plot) { if (plot) el.setAttribute('data-plot', ''); else el.removeAttribute('data-plot'); }
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
    const cues = useOverflowCues(props.frame, dockEl);
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
        {frameEl && !phone && cues.map(c => <React.Fragment key={c.id}>
            <span className="ux-dock-more-fade" style={{left: c.x, top: c.y - FADE, width: c.w, height: FADE}} aria-hidden="true"/>
            <button type="button" className="ux-dock-more" style={{left: c.x, top: c.y, width: c.w, height: BAR}}
                aria-label={c.less ? 'Manj: vrni prejšnjo razdelitev' : c.more ? 'Več: razpni orodja v stolpcu' : c.n ? `Še ${c.n} odčitkov: pomakni navzdol` : 'Pomakni navzdol'}
                aria-expanded={c.less ? true : c.more ? false : undefined} onClick={() => c.scroll()}>{c.less ? 'Manj' : c.n ? `še ${c.n}` : 'Več'}{c.less ? <ChevronUp/> : <ChevronDown/>}</button>
        </React.Fragment>)}
        {view && frameEl && !api.phone && <DragPreview frame={frameEl} dock={dockEl.current} view={view} version={layoutVersion}/>}
        {layoutVersion >= 0 && !phone && <LessonGap api={api}/>}
        {frameEl && <GesturesHint frame={frameEl} phone={phone}/>}
        <ShortcutsHost/>
        {layoutVersion >= 0 && lessonSlotted() && !lessonLifted() && !phone && <LessonPlaceholder api={api}/>}
    </DockContext.Provider>;
}

function ChevronUp() {
    return <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ChevronDown() {
    return <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

interface Cue { id: string; x: number; y: number; w: number; n: number; scroll: () => void; /** Orodja's bar that expands it in its stack. */ more?: boolean; /** Orodja's bar while expanded. */ less?: boolean; }

/**
 * A card or stack whose body is cut at the bottom says so with an opaque footer bar ("še N" rows, or "Več") along the inside
 * of its bottom edge, full width of the card and BAR tall; a click scrolls to the next whole row and the bar goes away at the
 * end. Above it an opaque gradient in the card's colour replaces the see-through mask fade. The visible height first ends on a
 * row or text-line boundary (snapRows), so the bar never cuts a row. Positions are in board coordinates; the bar is drawn in
 * the board's frame, outside the scroller, and always inside the element's own rect (it never reaches another card or chip).
 */
function useOverflowCues(frame: React.RefObject<HTMLElement | null>, dock: React.RefObject<HTMLElement | null>): Cue[] {
    const [cues, setCues] = useState<Cue[]>([]);
    useEffect(() => {
        const measure = () => {
            const host = frame.current, root = dock.current;
            if (!host || !root) return;
            // While a card is dragged the stacks hold its gap slot and change shape under the pointer: no bars, no snapping (a bar
            // was left behind at the card's old place, owner 2026-11-22). The drop measures again.
            if (host.hasAttribute(CARD_DRAG)) { setCues(prev => prev.length ? [] : prev); return; }
            const f = host.getBoundingClientRect();
            const next: Cue[] = [];
            let i = 0;
            const consider = (el: HTMLElement, within = false, snap = true) => {
                // A card gliding to a new height (or a stack holding one) is not at its resting size: measured when the glide ends.
                if (el.closest(`[${GLIDING}]`) || el.querySelector(`[${GLIDING}]`)) return;
                const skipped = !within && (getComputedStyle(el).overflowY === 'hidden' || el.closest('.is-floating') !== null);
                // At the top an element is measured at its natural height, then ended on a whole row.
                // The docked lesson text is ended on a line by useLessonCardFit, which also shrinks the card to it.
                if (el.scrollTop <= 1 && !el.classList.contains('guided-lesson-reading')) { clearSnap(el); if (!skipped && snap) snapRows(el, el.classList.contains('ux-tools-body') ? blockBands : undefined, el.classList.contains('ux-tools-body') ? 120 : undefined); }
                const cut = !skipped && el.scrollHeight > el.clientHeight + 2 && el.scrollTop + el.clientHeight < el.scrollHeight - 2;
                if (el.hasAttribute('data-cut') !== cut) { if (cut) el.setAttribute('data-cut', ''); else el.removeAttribute('data-cut'); }
                // Orodja, expanded: "Manj" shows at the foot of its body whether or not the body is cut. Cut and sharing its stack with open
                // cards: "Več" expands it there instead of scrolling.
                const toolsCard = el.classList.contains('ux-tools-body') ? el.closest<HTMLElement>('.ux-bcard-tools') : null;
                const less = !!toolsCard && !skipped && toolsCard.classList.contains('is-expanded');
                const more = !!toolsCard && cut && !less
                    && Array.from(toolsCard.parentElement?.children ?? []).some(c => c !== toolsCard && c.classList.contains('ux-btext') && !c.classList.contains('ux-btext-collapsed') && (c as HTMLElement).offsetHeight > 0);
                if (!cut && !less) return;
                const r = el.getBoundingClientRect();
                if (r.height < 60 || r.width < 40) return;
                const barTop = r.bottom - footOf(el) - BAR;
                const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-readout]')).filter(row => row.getBoundingClientRect().bottom > barTop - FADE + 1).length;
                // A stack's bar spans the card it cuts (the last one reaching its bottom edge); a card's or text's own box otherwise.
                let left = r.left, right = r.right;
                if (el.classList.contains('ux-dock-region')) {
                    const reach = Array.from(el.children).map(c => c.getBoundingClientRect()).filter(c => c.width > 0 && c.top < barTop + BAR).pop();
                    if (reach) { left = Math.max(r.left, reach.left); right = Math.min(r.right, reach.right); }
                }
                next.push({id: `${el.getAttribute('data-region') ?? el.getAttribute('data-kind') ?? 'x'}-${i++}`, x: Math.round(left - f.left), y: Math.round(barTop - f.top), w: Math.round(right - left), n: rows, more, less,
                    scroll: () => less ? setToolsExpanded(false) : more ? setToolsExpanded(true) : el.scrollBy({top: pageStep(el), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'})});
            };
            root.querySelectorAll<HTMLElement>('.ux-dock-v').forEach(el => consider(el));
            root.querySelectorAll<HTMLElement>('.ux-dock-h > .ux-btext').forEach(el => consider(el));
            // The tools card's body scrolls inside the card: its bar sits in the foot of the card, the body is not snapped to rows.
            root.querySelectorAll<HTMLElement>('.ux-bcard-tools:not(.is-floating) > .ux-tools-body').forEach(el => consider(el));
            // The lesson card's own text scrolls inside it (a docked card capped on a narrow board): the bar sits in the foot of the text.
            root.querySelectorAll<HTMLElement>('.ux-bcard-guide:not(.is-floating):not(.ux-btext-collapsed) .guided-lesson-reading').forEach(el => consider(el, true));
            setCues(prev => prev.length === next.length && prev.every((c, k) => c.id === next[k].id && c.x === next[k].x && c.y === next[k].y && c.w === next[k].w && c.n === next[k].n && c.more === next[k].more && c.less === next[k].less) ? prev : next);
        };
        measure();
        const timer = window.setInterval(measure, 250);
        document.addEventListener('scroll', measure, true);
        window.addEventListener(SETTLED, measure);
        return () => { window.clearInterval(timer); document.removeEventListener('scroll', measure, true); window.removeEventListener(SETTLED, measure); };
    }, [frame, dock]);
    return cues;
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
    // "Prosto" stays above the pucks' strip (it sat on the slider tiles when a card was carried low over the board): under the
    // card while there is room, else above it.
    const strip = dock?.querySelector<HTMLElement>('.ux-dock-strip');
    const stripTop = strip && strip.offsetHeight > 0 ? strip.getBoundingClientRect().top - frame.getBoundingClientRect().top : H;
    const freeMax = Math.max(0, Math.min(H, stripTop) - 24);
    // A tall card near the board's top has room neither under nor above it: the hint goes beside it, right if there is
    // room, else left, level with its top (it no longer sits on the card's head).
    const PILL_W = 64;
    const free = view.free && (view.free.y <= freeMax ? {left: view.free.x, top: view.free.y}
        : view.free.above >= 0 ? {left: view.free.x, top: Math.min(view.free.above, freeMax)}
        : {left: view.free.right + 8 + PILL_W <= W ? view.free.right + 8 : Math.max(0, view.free.x - 8 - PILL_W), top: Math.max(0, Math.min(view.free.top, freeMax))});
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
        {free && <span className="ux-dock-pill ux-dock-free" data-dock-free="" style={free} aria-hidden="true">Prosto mesto</span>}
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
