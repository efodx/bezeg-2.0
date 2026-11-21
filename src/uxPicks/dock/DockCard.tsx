import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useDock} from './BoardDock';
import {GripIcon, MinusIcon, PlusIcon} from './icons';
import {
    TARGETS, clearGap, currentGap, dropAtGap, orderOf, pickUp, placementOf, registerCard, resetCard, setFloating, setGap, syncPath,
    useDockLayout, type Target,
} from './dockLayout';

/**
 * A movable, foldable card in the board dock. Docked, it sits in a vertical stack (left, right or bottom right) and never
 * overlaps another docked card. Picked up, its place stays reserved; over a stack the cards move to the layout a drop there
 * would give (FLIP-animated). Dropped outside every stack it floats where it is dropped; a double-click on its head, or Home
 * on its grip, returns it to its default dock. Stack and order are remembered per page. On a phone cards are labelled
 * chips in the top rail and one is open at a time.
 *
 * Adding a card is one element: `<DockCard kind="x" title="Naslov" what="vsebino" region="top-end" order={3}>{open => body}</DockCard>`.
 */
export interface DockCardProps {
    kind: string;
    /** Short head, e.g. "Besedilo". */
    title: string;
    /** Accessible name of the thing the card holds, in the accusative: "besedilo", "legendo". */
    what: string;
    /** Where the card docks by default. */
    region: Target;
    /** Position in the default stack (smaller is higher). */
    order?: number;
    /** The card's body, rendered only while the card is open. */
    children: (open: boolean) => React.ReactNode;
}

interface Pos { x: number; y: number; }

/** A dragged card within this many pixels of a stack docks into it when released. */
const SNAP = 48;
const DRAG_THRESHOLD = 4;

const collapsedKey = (kind: string) => kind === 'text' ? 'ux-boardtext-collapsed' : `ux-boardcard-collapsed:${kind}`;
const posKey = (kind: string) => kind === 'text' ? `ux-boardtext-pos:${window.location.pathname}` : `ux-boardcard-pos:${kind}:${window.location.pathname}`;

function readCollapsed(kind: string): boolean {
    try { return localStorage.getItem(collapsedKey(kind)) === '1'; } catch { return false; }
}
function readPos(kind: string): Pos | null {
    try {
        const v = JSON.parse(localStorage.getItem(posKey(kind)) ?? 'null') as Pos | null;
        return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? v : null;
    } catch { return null; }
}
function writePos(kind: string, p: Pos | null) {
    try { if (p) localStorage.setItem(posKey(kind), JSON.stringify(p)); else localStorage.removeItem(posKey(kind)); } catch { /* ignore */ }
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
const GLIDE = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * FLIP: after each render, a docked element whose layout position changed glides from where it was last seen to its new
 * place (transform only). A new move interrupts a running glide from where the element visibly is. A floating card is
 * left alone (it follows the pointer), and its last place is where it glides from when it docks.
 */
function useFlip(ref: React.RefObject<HTMLElement | null>, floating: boolean) {
    const last = useRef<{x: number; y: number} | null>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) { last.current = null; return; }
        const x = el.offsetLeft, y = el.offsetTop;
        const prev = last.current;
        last.current = {x, y};
        if (floating || reducedMotion()) { el.style.transition = ''; el.style.transform = ''; return; }
        if (!prev || (Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5)) return;
        let tx = 0, ty = 0;
        const running = getComputedStyle(el).transform;
        if (running && running !== 'none') { const m = new DOMMatrixReadOnly(running); tx = m.m41; ty = m.m42; }
        el.style.transition = 'none';
        el.style.transform = `translate(${prev.x + tx - x}px, ${prev.y + ty - y}px)`;
        void el.offsetWidth;
        el.style.transition = GLIDE;
        el.style.transform = '';
    });
}

/** The reserved place of a lifted card, or where a drop would put it. */
function GapSlot(props: {w: number; h: number; order: number; target: boolean}) {
    const ref = useRef<HTMLDivElement>(null);
    useFlip(ref, false);
    return <div ref={ref} className={`ux-dock-gap${props.target ? ' is-target' : ''}`} data-dock-gap={props.target ? 'target' : 'origin'}
                style={{width: props.w, height: props.h, order: props.order}} aria-hidden="true"/>;
}

interface Outline { region: Target; x: number; y: number; w: number; h: number; bar: boolean; }
const BAR = 8;
interface Hit { region: Target | null; index: number; outlines: Outline[]; }

export function DockCard(props: DockCardProps) {
    const {kind} = props;
    const dock = useDock();
    const phone = dock?.phone ?? false;
    const version = useDockLayout();
    const [collapsed, setCollapsed] = useState(() => readCollapsed(kind));
    const [pos, setPos] = useState<Pos | null>(() => readPos(kind));
    const card = useRef<HTMLDivElement>(null);
    const drag = useRef<{dx: number; dy: number; sx: number; sy: number; moved: boolean} | null>(null);
    const floating = pos !== null && !phone;
    const [dragging, setDragging] = useState(false);
    const [keyboard, setKeyboard] = useState(false);
    const [outlines, setOutlines] = useState<Outline[] | null>(null);

    useEffect(() => registerCard(kind, props.region, props.order ?? 0), [kind, props.region, props.order]);
    useEffect(() => { setFloating(kind, floating); }, [kind, floating]);
    // A new page keeps its own place for the card.
    useEffect(() => {
        let path = window.location.pathname;
        const timer = window.setInterval(() => {
            if (window.location.pathname !== path) { path = window.location.pathname; syncPath(); setPos(readPos(kind)); }
        }, 300);
        return () => window.clearInterval(timer);
    }, [kind]);

    const frame = dock?.frame;
    /** Keeps a floating card inside the frame (display only; the stored position is kept). */
    const clamp = () => {
        const el = card.current, host = frame?.current;
        if (!el || !host || !floating || !pos) return;
        el.style.left = `${Math.max(0, Math.min(pos.x, host.clientWidth - el.offsetWidth))}px`;
        el.style.top = `${Math.max(0, Math.min(pos.y, host.clientHeight - el.offsetHeight))}px`;
    };
    useEffect(() => {
        clamp();
        const host = frame?.current;
        if (!host || !floating || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(clamp);
        ro.observe(host);
        if (card.current) ro.observe(card.current);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pos, collapsed, floating, frame]);

    /** The stack the floating card is over (within SNAP of it), the position it would take there, and outlines for the other stacks. */
    const measure = (): Hit | null => {
        const el = card.current, host = frame?.current, rail = host?.querySelector('.ux-dock-top');
        if (!el || !host || !rail || !dock) return null;
        const f = host.getBoundingClientRect(), c = el.getBoundingClientRect(), rr = rail.getBoundingClientRect();
        const w = el.offsetWidth, h = el.offsetHeight, gapPx = 8;
        const origin = (r: Target) => r === 'top-start' ? {x: rr.left, y: rr.top} : r === 'top-end' ? {x: rr.right - w, y: rr.top} : {x: f.right - 10 - w, y: f.bottom - 10 - h};
        let best: Target | null = null, bestDist = Infinity;
        const rects = {} as Record<Target, {box: DOMRect | null; cards: HTMLElement[]}>;
        for (const r of TARGETS) {
            const regionEl = dock.regions[r];
            const box = regionEl && regionEl.getBoundingClientRect().width > 0 ? regionEl.getBoundingClientRect() : null;
            const cards = Array.from(regionEl?.children ?? []).filter((ch): ch is HTMLElement =>
                ch instanceof HTMLElement && ch !== el && ch.classList.contains('ux-btext') && !ch.classList.contains('is-floating'))
                .sort((a, b) => Number(a.style.order) - Number(b.style.order));
            rects[r] = {box, cards};
            const o = origin(r);
            const zone = box ?? {left: o.x, top: o.y, right: o.x + w, bottom: o.y + h};
            const hit = c.left < zone.right + SNAP && c.right > zone.left - SNAP && c.top < zone.bottom + SNAP && c.bottom > zone.top - SNAP;
            const dist = Math.hypot((zone.left + zone.right) / 2 - (c.left + c.right) / 2, (zone.top + zone.bottom) / 2 - (c.top + c.bottom) / 2);
            if (hit && dist < bestDist) { best = r; bestDist = dist; }
        }
        let index = 0;
        if (best) {
            const {box, cards} = rects[best];
            const heights = cards.map(ch => ch.offsetHeight);
            const total = heights.reduce((a, b) => a + b, 0) + gapPx * Math.max(0, cards.length - 1);
            let y = best === 'bottom-end' ? f.bottom - 10 - total : (box ? box.top - (dock.regions[best]?.scrollTop ?? 0) + 2 : origin(best).y);
            const cy = c.top + 16; // the grabbed head decides the position
            heights.forEach(ch => { if (y + ch / 2 < cy) index++; y += ch + gapPx; });
        }
        // Every insertion position of every stack is outlined: a thin slot between (and above, below) the docked cards. The
        // position the card would take is the gap itself (card-sized, emphasised); an empty stack shows one card-sized slot.
        const out: Outline[] = [];
        for (const r of TARGETS) {
            const regionEl = dock.regions[r];
            const {box} = rects[r];
            const items = Array.from(regionEl?.children ?? []).filter((ch): ch is HTMLElement => ch instanceof HTMLElement && ch !== el
                && !ch.classList.contains('is-floating') && (ch.classList.contains('ux-btext') || ch.classList.contains('ux-dock-gap')))
                .sort((a, b) => Number(a.style.order) - Number(b.style.order));
            const left = (r === 'top-start' ? (box?.left ?? 0) : (box?.right ?? 0) - w) - f.left;
            if (items.length === 0) {
                const o = origin(r);
                out.push({region: r, x: Math.max(0, Math.round(o.x - f.left)), y: Math.max(0, Math.round(Math.min(o.y, f.bottom - h) - f.top)), w, h, bar: false});
                continue;
            }
            const rect = (e: HTMLElement) => {
                const b = e.getBoundingClientRect(), t = getComputedStyle(e).transform;
                const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : null;
                return {top: b.top - (m?.m42 ?? 0) - f.top, bottom: b.bottom - (m?.m42 ?? 0) - f.top};
            };
            const isGap = (e: HTMLElement) => e.classList.contains('ux-dock-gap');
            const bar = (y: number) => out.push({region: r, x: Math.round(left), y: Math.round(y), w, h: BAR, bar: true});
            const first = rect(items[0]), last = rect(items[items.length - 1]);
            if (!isGap(items[0])) bar(first.top - BAR - 1);
            for (let i = 0; i + 1 < items.length; i++) {
                if (isGap(items[i]) || isGap(items[i + 1])) continue;
                bar((rect(items[i]).bottom + rect(items[i + 1]).top) / 2 - BAR / 2);
            }
            if (!isGap(items[items.length - 1])) bar(last.bottom + 1);
        }
        return {region: best, index, outlines: out};
    };
    useLayoutEffect(() => {
        if (!(dragging || keyboard) || !floating) { setOutlines(null); return; }
        const m = measure();
        const el = card.current;
        if (!m || !el) return;
        setGap(kind, m.region, m.index, el.offsetWidth, el.offsetHeight);
        setOutlines(prev => prev && JSON.stringify(prev) === JSON.stringify(m.outlines) ? prev : m.outlines);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragging, keyboard, floating, pos, collapsed, frame, version]);
    useFlip(card, floating);

    if (!dock) return null;
    const open = phone ? dock.phoneOpen === kind : !collapsed;

    const toggle = () => {
        if (phone) { dock.setPhoneOpen(open ? null : kind); return; }
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem(collapsedKey(kind), next ? '1' : '0'); } catch { /* ignore */ }
    };

    const place = (x: number, y: number): Pos => {
        const el = card.current!, host = frame!.current!;
        return {
            x: Math.round(Math.max(0, Math.min(x, host.clientWidth - el.offsetWidth))),
            y: Math.round(Math.max(0, Math.min(y, host.clientHeight - el.offsetHeight))),
        };
    };
    const lift = () => { const el = card.current!; pickUp(kind, el.offsetWidth, el.offsetHeight, !floating); };
    /** The card is docked (by a drop at the gap, or back in its default dock): it no longer floats. */
    const docked = () => {
        setPos(null); writePos(kind, null);
        setDragging(false); setKeyboard(false);
        if (card.current) { card.current.style.left = ''; card.current.style.top = ''; }
    };
    const onPointerDown = (e: React.PointerEvent) => {
        if (phone || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
        const el = card.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        drag.current = {dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false};
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current, host = frame?.current;
        if (!d || !host) return;
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
        if (!d.moved) { d.moved = true; lift(); setDragging(true); }
        const f = host.getBoundingClientRect();
        setPos(place(e.clientX - f.left - d.dx, e.clientY - f.top - d.dy));
    };
    const onPointerUp = () => {
        const d = drag.current;
        drag.current = null;
        setDragging(false);
        const el = card.current;
        if (!d?.moved || !el) return;
        if (dropAtGap(kind)) { docked(); return; }
        clearGap(kind);
        writePos(kind, {x: el.offsetLeft, y: el.offsetTop});
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (phone) return;
        if (e.key === 'Home') { e.preventDefault(); resetCard(kind); docked(); return; }
        if (e.key === 'Enter' && keyboard) { e.preventDefault(); if (dropAtGap(kind)) docked(); return; }
        const step = e.shiftKey ? 40 : 10;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const el = card.current, host = frame?.current;
        if (!el || !host || (dx === 0 && dy === 0)) return;
        e.preventDefault();
        const r = el.getBoundingClientRect(), f = host.getBoundingClientRect();
        const next = place((pos?.x ?? r.left - f.left) + dx, (pos?.y ?? r.top - f.top) + dy);
        if (!floating) lift();
        setKeyboard(true);
        setPos(next); writePos(kind, next);
    };

    const placement = placementOf(kind);
    const target = dock.regions[phone ? 'top-start' : placement.region];
    if (!target) return null;
    const style: React.CSSProperties | undefined = floating ? {left: pos.x, top: pos.y} : phone ? undefined : {order: orderOf(kind)};
    const label = `${open ? 'Skrij' : 'Pokaži'} ${props.what}`;
    // A phone shows a folded card as a small labelled chip.
    if (phone && !open) {
        return createPortal(<button type="button" className="ux-dock-chip" aria-expanded={false} aria-label={label} onClick={toggle}>{props.title}</button>, target);
    }
    const g = currentGap();
    const gapTarget = g && g.kind === kind && !phone ? dock.regions[g.region] : null;
    const outlineEls = outlines && frame?.current ? createPortal(<>{outlines.map(sl =>
        <div key={`${sl.region}:${sl.y}`} className={`ux-dock-slot${sl.bar ? ' is-bar' : ''}`} data-dock-slot={sl.region}
             style={{left: sl.x, top: sl.y, width: sl.w, height: sl.h}} aria-hidden="true"/>)}</>, frame.current) : null;
    return <>
        {outlineEls}
        {g && gapTarget && createPortal(<GapSlot w={g.w} h={g.h} order={2 * g.index} target={g.isTarget}/>, gapTarget)}
        {createPortal(<div ref={card} className={`ux-btext ux-bcard-${kind}${open ? '' : ' ux-btext-collapsed'}${floating ? ' is-floating' : ''}`} style={style}>
            <div className="ux-btext-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                 onPointerCancel={onPointerUp} onDoubleClick={() => { resetCard(kind); docked(); }}>
                {!phone && <span className="ux-btext-grip" role="button" tabIndex={0} onKeyDown={onKeyDown} onBlur={() => { setKeyboard(false); clearGap(kind); }}
                      aria-label={`Premakni ${props.what} (puščične tipke, Enter pripne na označeno mesto, Domov pripne na privzeto mesto)`}
                      title="Povleci za premik, dvoklik pripne"><GripIcon/></span>}
                <span className="ux-btext-title">{props.title}</span>
                <button type="button" className="ux-btext-toggle" onClick={toggle} aria-expanded={open}
                        aria-label={label} title={label}>{open ? <MinusIcon/> : <PlusIcon/>}</button>
            </div>
            {props.children(open)}
        </div>, target)}
    </>;
}
