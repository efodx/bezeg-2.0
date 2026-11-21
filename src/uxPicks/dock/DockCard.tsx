import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useDock, type DockRegion} from './BoardDock';
import {GripIcon, MinusIcon, PlusIcon} from './icons';

/**
 * A movable, foldable card in the board dock. Docked, it sits in its region and never overlaps another docked card.
 * Dragged away it floats where it is dropped (remembered per page); dropping it near the top rail, or a double-click
 * on its head, docks it again. On a phone cards are labelled chips in the top rail and one is open at a time.
 *
 * Adding a card is one element: `<DockCard kind="x" title="Naslov" what="vsebino" region="top-end">{open => body}</DockCard>`.
 */
export interface DockCardProps {
    kind: string;
    /** Short head, e.g. "Besedilo". */
    title: string;
    /** Accessible name of the thing the card holds, in the accusative: "besedilo", "legendo". */
    what: string;
    /** Where the card docks by default. */
    region: Extract<DockRegion, 'top-start' | 'top-end'>;
    /** The card's body, rendered only while the card is open. */
    children: (open: boolean) => React.ReactNode;
}

interface Pos { x: number; y: number; }

/** A dropped card within this many pixels of the top rail docks again. */
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

export function DockCard(props: DockCardProps) {
    const {kind} = props;
    const dock = useDock();
    const phone = dock?.phone ?? false;
    const [collapsed, setCollapsed] = useState(() => readCollapsed(kind));
    const [pos, setPos] = useState<Pos | null>(() => readPos(kind));
    const [region, setRegion] = useState(props.region);
    const card = useRef<HTMLDivElement>(null);
    const drag = useRef<{dx: number; dy: number; sx: number; sy: number; moved: boolean} | null>(null);
    const floating = pos !== null && !phone;

    // A new page keeps its own place for the card.
    useEffect(() => {
        let path = window.location.pathname;
        const timer = window.setInterval(() => {
            if (window.location.pathname !== path) { path = window.location.pathname; setPos(readPos(kind)); setRegion(props.region); }
        }, 300);
        return () => window.clearInterval(timer);
    }, [kind, props.region]);

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
        d.moved = true;
        const f = host.getBoundingClientRect();
        setPos(place(e.clientX - f.left - d.dx, e.clientY - f.top - d.dy));
    };
    /** Docks the card again, in the end of the rail its centre is nearest to. */
    const dockAt = (centreX?: number) => {
        const host = frame?.current;
        setPos(null); writePos(kind, null);
        setRegion(host && centreX !== undefined ? (centreX < host.clientWidth / 2 ? 'top-start' : 'top-end') : props.region);
        if (card.current) { card.current.style.left = ''; card.current.style.top = ''; }
    };
    const onPointerUp = () => {
        const d = drag.current;
        drag.current = null;
        const el = card.current, host = frame?.current;
        if (!d?.moved || !el || !host) return;
        const rail = host.querySelector('.ux-dock-top');
        const railBottom = rail ? rail.getBoundingClientRect().bottom - host.getBoundingClientRect().top : 0;
        if (el.offsetTop <= Math.max(railBottom, 0) + SNAP) { dockAt(el.offsetLeft + el.offsetWidth / 2); return; }
        writePos(kind, {x: el.offsetLeft, y: el.offsetTop});
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (phone) return;
        const step = e.shiftKey ? 40 : 10;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const el = card.current, host = frame?.current;
        if (!el || !host || (dx === 0 && dy === 0)) return;
        e.preventDefault();
        const r = el.getBoundingClientRect(), f = host.getBoundingClientRect();
        const next = place((pos?.x ?? r.left - f.left) + dx, (pos?.y ?? r.top - f.top) + dy);
        setPos(next); writePos(kind, next);
    };

    const target = dock.regions[phone ? 'top-start' : region];
    if (!target) return null;
    const style: React.CSSProperties | undefined = floating ? {left: pos.x, top: pos.y} : undefined;
    const label = `${open ? 'Skrij' : 'Pokaži'} ${props.what}`;
    // A phone shows a folded card as a small labelled chip.
    if (phone && !open) {
        return createPortal(<button type="button" className="ux-dock-chip" aria-expanded={false} aria-label={label} onClick={toggle}>{props.title}</button>, target);
    }
    return createPortal(<div ref={card} className={`ux-btext ux-bcard-${kind}${open ? '' : ' ux-btext-collapsed'}${floating ? ' is-floating' : ''}`} style={style}>
        <div className="ux-btext-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
             onPointerCancel={onPointerUp} onDoubleClick={() => dockAt()}>
            {!phone && <span className="ux-btext-grip" role="button" tabIndex={0} onKeyDown={onKeyDown}
                  aria-label={`Premakni ${props.what} (puščične tipke), dvoklik pripne`}
                  title="Povleci za premik, dvoklik pripne"><GripIcon/></span>}
            <span className="ux-btext-title">{props.title}</span>
            <button type="button" className="ux-btext-toggle" onClick={toggle} aria-expanded={open}
                    aria-label={label} title={label}>{open ? <MinusIcon/> : <PlusIcon/>}</button>
        </div>
        {props.children(open)}
    </div>, target);
}
