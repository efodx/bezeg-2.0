import React, {useEffect, useRef, useState} from 'react';
import {typesetMath} from '../../mathjax/loadMathJax';
import {buildCardHtml} from './boardTextLayout';
import './BoardTextCard.css';

const HIDDEN = 'ux-boardtext-hidden';
const FORMULA_STYLE = 'color:#4d594f;font-size:1.2em';
const KEY = 'ux-boardtext-collapsed';

interface JxgText {
    elType: string; id: string; rendNode?: HTMLElement; visPropCalc?: {visible?: boolean};
    coords?: {scrCoords: number[]}; visProp?: {islabel?: boolean};
}
interface JxgBoard {
    containerObj: HTMLElement; objects: Record<string, JxgText>;
    on(ev: string, fn: () => void): void; off(ev: string, fn: () => void): void; update(): void;
}

/** Informational board texts: the formula line (shared style) and corner readouts (top-left HUD). */
function isInfoText(e: JxgText): boolean {
    if (e.elType !== 'text' || !e.rendNode || e.visProp?.islabel || e.id.endsWith('_infobox')) return false;
    if (e.rendNode.innerHTML.includes(FORMULA_STYLE)) return true;
    const c = e.coords?.scrCoords;
    return !!c && c[1] <= 40 && c[2] <= 130 && e.rendNode.textContent !== '';
}

function findBoard(frame: HTMLElement): JxgBoard | undefined {
    const boards = (window as unknown as {JXG?: {boards: Record<string, JxgBoard>}}).JXG?.boards;
    return boards && Object.values(boards).find(b => frame.contains(b.containerObj));
}

function readCollapsed(): boolean {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

interface Pos { x: number; y: number; }
const posKey = () => `ux-boardtext-pos:${window.location.pathname}`;
function readPos(): Pos | null {
    try {
        const v = JSON.parse(localStorage.getItem(posKey()) ?? 'null') as Pos | null;
        return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? v : null;
    } catch { return null; }
}
function writePos(p: Pos | null) {
    try { if (p) localStorage.setItem(posKey(), JSON.stringify(p)); else localStorage.removeItem(posKey()); } catch { /* ignore */ }
}

/** Moves the formula and readout texts off the board into a movable, hideable card over the graph, typeset with MathJax. */
export function BoardTextCard(props: {frame: React.RefObject<HTMLDivElement | null>}) {
    const [html, setHtml] = useState('');
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [pos, setPos] = useState<Pos | null>(readPos);
    const last = useRef('');
    const card = useRef<HTMLDivElement>(null);
    const body = useRef<HTMLDivElement>(null);
    const buffer = useRef<HTMLDivElement>(null);
    const pipe = useRef({want: '', shown: '', running: false, token: 0});
    const drag = useRef<{dx: number; dy: number} | null>(null);

    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        let board: JxgBoard | undefined;
        let path = window.location.pathname;
        const hidden = new Set<HTMLElement>();
        const sync = () => {
            if (window.location.pathname !== path) { path = window.location.pathname; setPos(readPos()); }
            const b = findBoard(frame);
            if (b !== board) { board?.off('update', sync); board = b; board?.on('update', sync); }
            if (!b) return;
            const parts: string[] = [];
            for (const e of Object.values(b.objects)) {
                if (!isInfoText(e)) continue;
                const node = e.rendNode!;
                if (e.visPropCalc?.visible === false) { node.classList.remove(HIDDEN); continue; }
                const inner = node.innerHTML;
                if (inner.trim() !== '') parts.push(inner);
                node.classList.add(HIDDEN); hidden.add(node);
            }
            const joined = parts.join('\u0000');
            if (joined !== last.current) { last.current = joined; setHtml(buildCardHtml(parts)); }
        };
        sync();
        const timer = window.setInterval(sync, 200);
        return () => {
            window.clearInterval(timer);
            board?.off('update', sync);
            hidden.forEach(n => n.classList.remove(HIDDEN));
            board?.update();
            last.current = '';
        };
    }, [props.frame]);

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
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pos, collapsed, html, props.frame]);

    // Typeset into an off-screen buffer, one pass at a time and only for the newest text, then swap the result in.
    useEffect(() => {
        const st = pipe.current;
        st.want = html;
        if (collapsed || html === '' || st.running) return;
        const my = ++st.token;
        const run = async () => {
            st.running = true;
            try {
                while (st.want !== st.shown && buffer.current && body.current && st.token === my) {
                    const target = st.want;
                    await new Promise<void>(r => requestAnimationFrame(() => r()));
                    if (!buffer.current || !body.current || st.token !== my) break;
                    buffer.current.innerHTML = target;
                    await typesetMath(buffer.current, () => st.token === my);
                    if (!buffer.current || !body.current || st.token !== my) break;
                    body.current.innerHTML = buffer.current.innerHTML;
                    st.shown = target;
                    clamp();
                }
            } finally { if (st.token === my) st.running = false; }
        };
        void run();
        return () => { st.token++; st.shown = ''; st.running = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [html, collapsed]);

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* ignore */ }
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
        if (el) writePos({x: el.offsetLeft, y: el.offsetTop});
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 40 : 10;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const el = card.current;
        if (!el || (dx === 0 && dy === 0)) return;
        e.preventDefault();
        const next = place(el.offsetLeft + dx, el.offsetTop + dy);
        setPos(next); writePos(next);
    };
    const reset = () => {
        setPos(null); writePos(null);
        if (card.current) { card.current.style.left = ''; card.current.style.top = ''; }
    };

    if (html === '') return null;
    const style: React.CSSProperties | undefined = pos ? {left: pos.x, top: pos.y, right: 'auto'} : undefined;
    const label = collapsed ? 'Pokaži besedilo' : 'Skrij besedilo';
    return <div ref={card} className={`ux-btext${collapsed ? ' ux-btext-collapsed' : ''}`} style={style}>
        <div className="ux-btext-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
             onPointerCancel={onPointerUp} onDoubleClick={reset}>
            <span className="ux-btext-grip" role="button" tabIndex={0} onKeyDown={onKeyDown}
                  aria-label="Premakni besedilo (puščične tipke), dvoklik ponastavi"
                  title="Povleci za premik, dvoklik ponastavi"/>
            <span className="ux-btext-title">Besedilo</span>
            <button type="button" className="ux-btext-toggle" onClick={toggle} aria-expanded={!collapsed}
                    aria-label={label} title={label}>{collapsed ? '+' : '–'}</button>
        </div>
        {!collapsed && <>
            <div ref={body} className="ux-btext-body"/>
            <div ref={buffer} className="ux-btext-buffer" aria-hidden="true"/>
        </>}
    </div>;
}
