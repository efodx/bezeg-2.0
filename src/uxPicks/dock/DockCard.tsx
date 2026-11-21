import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {GapSlot, useDock} from './BoardDock';
import {GripIcon, MinusIcon, PlusIcon} from './icons';
import {
    clearGap, currentGap, dropAtGap, orderOf, pickUp, placementOf, registerCard, resetCard, setFloating, setGap, setOutlines, syncPath,
    useDockLayout, type Target,
} from './dockLayout';
import {measureDrag} from './dockMeasure';
import {useFlip} from './dockFlip';

/**
 * A movable, foldable card in the board dock. Docked, it sits at one of seven anchors around the board's edge and never
 * overlaps another docked card. Picked up, its place stays reserved; over an anchor the cards move to the layout a drop there
 * would give (FLIP-animated). Dropped in the central area it floats where it is dropped; a double-click on its head, or Home
 * on its grip, returns it to its default dock. Stack and order are remembered per page. On a phone cards are labelled
 * chips in the top rail and one is open at a time.
 *
 * Adding a card is one element: `<DockCard kind="x" title="Naslov" what="vsebino" region="tr" order={3}>{open => body}</DockCard>`.
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

    const measure = () => {
        const el = card.current, host = frame?.current;
        if (!el || !host || !dock) return null;
        return measureDrag(dock.regions, host, el, el.getBoundingClientRect(), el.offsetWidth, el.offsetHeight);
    };
    useLayoutEffect(() => {
        if (!(dragging || keyboard) || !floating) { setOutlines(kind, null); return; }
        const m = measure();
        const el = card.current;
        if (!m || !el) return;
        setGap(kind, m.region, m.index, el.offsetWidth, el.offsetHeight);
        setOutlines(kind, m.view);
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
    const target = dock.regions[phone ? 'tl' : placement.region];
    if (!target) return null;
    const style: React.CSSProperties | undefined = floating ? {left: pos.x, top: pos.y} : phone ? undefined : {order: orderOf(kind)};
    const label = `${open ? 'Skrij' : 'Pokaži'} ${props.what}`;
    // A phone shows a folded card as a small labelled chip.
    if (phone && !open) {
        return createPortal(<button type="button" className="ux-dock-chip" aria-expanded={false} aria-label={label} onClick={toggle}>{props.title}</button>, target);
    }
    const g = currentGap();
    const gapTarget = g && g.kind === kind && !phone ? dock.regions[g.region] : null;
    return <>
        {g && gapTarget && createPortal(<GapSlot w={g.w} h={g.h} order={2 * g.index} target={g.isTarget}/>, gapTarget)}
        {createPortal(<div ref={card} data-dock-item="" data-kind={kind} className={`ux-btext ux-bcard-${kind}${open ? '' : ' ux-btext-collapsed'}${floating ? ' is-floating' : ''}`} style={style}>
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
