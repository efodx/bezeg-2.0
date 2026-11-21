import React, {useEffect, useRef, useState} from 'react';
import './BoardTextCard.css';

/**
 * The shared shell of the cards that lift text off the board (pick boardText): a small movable card over the graph
 * with a grip, a title and a hide toggle. Each card kind keeps its own hidden state and, per page, its own position;
 * a double-click on the head puts it back in its default corner.
 */
export type BoardCardKind = 'text' | 'legend';

interface Pos { x: number; y: number; }

const collapsedKey = (kind: BoardCardKind) => kind === 'text' ? 'ux-boardtext-collapsed' : `ux-boardcard-collapsed:${kind}`;
const posKey = (kind: BoardCardKind) => kind === 'text' ? `ux-boardtext-pos:${window.location.pathname}` : `ux-boardcard-pos:${kind}:${window.location.pathname}`;

function readCollapsed(kind: BoardCardKind): boolean {
    try { return localStorage.getItem(collapsedKey(kind)) === '1'; } catch { return false; }
}
function readPos(kind: BoardCardKind): Pos | null {
    try {
        const v = JSON.parse(localStorage.getItem(posKey(kind)) ?? 'null') as Pos | null;
        return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? v : null;
    } catch { return null; }
}
function writePos(kind: BoardCardKind, p: Pos | null) {
    try { if (p) localStorage.setItem(posKey(kind), JSON.stringify(p)); else localStorage.removeItem(posKey(kind)); } catch { /* ignore */ }
}

export interface BoardCardProps {
    frame: React.RefObject<HTMLDivElement | null>;
    kind: BoardCardKind;
    /** Short uppercase head, e.g. "Besedilo". */
    title: string;
    /** Accessible name of the thing the card holds, in the accusative: "besedilo", "legendo". */
    what: string;
    /** The card's body, rendered only while the card is open. */
    children: (open: boolean) => React.ReactNode;
}

export function BoardCard(props: BoardCardProps) {
    const {kind} = props;
    const [collapsed, setCollapsed] = useState(() => readCollapsed(kind));
    const [pos, setPos] = useState<Pos | null>(() => readPos(kind));
    const card = useRef<HTMLDivElement>(null);
    const drag = useRef<{dx: number; dy: number} | null>(null);

    // A new page keeps its own place for the card.
    useEffect(() => {
        let path = window.location.pathname;
        const timer = window.setInterval(() => {
            if (window.location.pathname !== path) { path = window.location.pathname; setPos(readPos(kind)); }
        }, 300);
        return () => window.clearInterval(timer);
    }, [kind]);

    /** Keeps the card inside the frame (display only; the stored position is kept). */
    const clamp = () => {
        const el = card.current, frame = props.frame.current;
        if (!el || !frame || !pos) return;
        el.style.left = `${Math.max(0, Math.min(pos.x, frame.clientWidth - el.offsetWidth))}px`;
        el.style.top = `${Math.max(0, Math.min(pos.y, frame.clientHeight - el.offsetHeight))}px`;
    };
    useEffect(() => {
        clamp();
        const frame = props.frame.current;
        if (!frame || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(clamp);
        ro.observe(frame);
        if (card.current) ro.observe(card.current);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pos, collapsed, props.frame]);

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem(collapsedKey(kind), next ? '1' : '0'); } catch { /* ignore */ }
    };

    const place = (x: number, y: number): Pos => {
        const el = card.current!, frame = props.frame.current!;
        return {
            x: Math.round(Math.max(0, Math.min(x, frame.clientWidth - el.offsetWidth))),
            y: Math.round(Math.max(0, Math.min(y, frame.clientHeight - el.offsetHeight))),
        };
    };
    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
        const el = card.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        drag.current = {dx: e.clientX - r.left, dy: e.clientY - r.top};
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current, frame = props.frame.current;
        if (!d || !frame) return;
        const f = frame.getBoundingClientRect();
        setPos(place(e.clientX - f.left - d.dx, e.clientY - f.top - d.dy));
    };
    const onPointerUp = () => {
        if (!drag.current) return;
        drag.current = null;
        const el = card.current;
        if (el) writePos(kind, {x: el.offsetLeft, y: el.offsetTop});
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 40 : 10;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const el = card.current;
        if (!el || (dx === 0 && dy === 0)) return;
        e.preventDefault();
        const next = place(el.offsetLeft + dx, el.offsetTop + dy);
        setPos(next); writePos(kind, next);
    };
    const reset = () => {
        setPos(null); writePos(kind, null);
        if (card.current) { card.current.style.left = ''; card.current.style.top = ''; }
    };

    const style: React.CSSProperties | undefined = pos ? {left: pos.x, top: pos.y, right: 'auto', bottom: 'auto'} : undefined;
    const label = `${collapsed ? 'Pokaži' : 'Skrij'} ${props.what}`;
    return <div ref={card} className={`ux-btext ux-bcard-${kind}${collapsed ? ' ux-btext-collapsed' : ''}`} style={style}>
        <div className="ux-btext-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
             onPointerCancel={onPointerUp} onDoubleClick={reset}>
            <span className="ux-btext-grip" role="button" tabIndex={0} onKeyDown={onKeyDown}
                  aria-label={`Premakni ${props.what} (puščične tipke), dvoklik ponastavi`}
                  title="Povleci za premik, dvoklik ponastavi"/>
            <span className="ux-btext-title">{props.title}</span>
            <button type="button" className="ux-btext-toggle" onClick={toggle} aria-expanded={!collapsed}
                    aria-label={label} title={label}>{collapsed ? '+' : '–'}</button>
        </div>
        {props.children(!collapsed)}
    </div>;
}
