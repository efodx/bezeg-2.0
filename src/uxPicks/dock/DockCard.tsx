import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {GapSlot, useDock} from './BoardDock';
import {GripIcon, KindIcon, MinusIcon, PlusIcon, ResetIcon} from './icons';
import {foldAllFold, foldAllRules, setFoldAllCard, useFoldAll} from './foldAll';
import {
    clearGap, currentGap, dropAtGap, orderOf, pickUp, placedRegion, placementOf, registerCard, resetCard, setFloating, setGap, setOutlines, syncPath,
    useDockLayout, type Target,
} from './dockLayout';
import {REGION_LABEL, measureDrag} from './dockMeasure';
import {useFlip} from './dockFlip';
import {useAutoOpen} from '../boardText/autoOpenStore';

/**
 * A movable, foldable card in the board dock. Docked, it sits at one of seven anchors around the board's edge and never
 * overlaps another docked card. Picked up, its place stays reserved; over an anchor the cards move to the layout a drop there
 * would give (FLIP-animated). Dropped in the central area it floats where it is dropped; a double-click on its head, or Home
 * on its grip, returns it to its default dock. Stack and order are remembered per page. On a phone cards are labelled
 * chips in the top rail and one is open at a time.
 * A floating card is placed in board coordinates whatever element holds it. Placements, floating positions and folds are
 * remembered for the whole app (owner, 2026-11-21).
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
    /** What the head shows instead of `title` (e.g. the lesson's title and, folded, its progress). */
    head?: React.ReactNode;
    /** Extra controls in the head, before the fold button (e.g. the lesson's Končaj). */
    actions?: React.ReactNode;
    /** A fold the owner controls (the lesson card: folding is hiding the instructions); not stored. */
    collapsed?: boolean;
    onToggle?: (open: boolean) => void;
    /** Kept for callers; every card but the lesson card now starts folded on a narrow window (see NARROW_PX), so it changes nothing. */
    foldWhenNarrow?: boolean;
    /** Starts folded while a guided lesson is open (its card and the tools need the column) until the learner unfolds it during that lesson; the fold is kept apart from the one set outside lessons. */
    foldInLesson?: boolean;
}

interface Pos { x: number; y: number; }

const DRAG_THRESHOLD = 4;

const collapsedKey = (kind: string) => kind === 'text' ? 'ux-boardtext-collapsed' : `ux-boardcard-collapsed:${kind}`;
const posKey = (kind: string) => kind === 'text' ? 'ux-boardtext-pos' : `ux-boardcard-pos:${kind}`;

/** Below this window width the board is crowded (tools, three cards, pucks): every card but the lesson card (and the tools card,
 *  which folds by its own rules) starts folded until the learner sets its fold. */
const NARROW_PX = 1200;
/** Lesson-time folds, per card, until the lesson closes. */
const lessonFolds = new Map<string, boolean>();
const lessonIsOpen = () => !!document.querySelector('.demonstration-workspace.lesson-open');
function readCollapsed(kind: string): boolean {
    try {
        const stored = localStorage.getItem(collapsedKey(kind));
        return stored === null ? kind !== 'guide' && window.innerWidth < NARROW_PX : stored === '1';
    } catch { return false; }
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
    const [ownCollapsed, setCollapsed] = useState(() => readCollapsed(kind));
    const [pos, setPos] = useState<Pos | null>(() => readPos(kind));
    const card = useRef<HTMLDivElement>(null);
    const drag = useRef<{dx: number; dy: number; sx: number; sy: number; moved: boolean} | null>(null);
    const floating = pos !== null && !phone;
    const [dragging, setDragging] = useState(false);
    const [keyboard, setKeyboard] = useState(false);
    /** What a screen reader hears after a keyboard move, a drop or a reset (a polite status line). */
    const [said, setSaid] = useState('');
    
    // In a guided lesson a `foldInLesson` card starts folded and keeps its own lesson-time fold (memory only); the fold the
    // learner set outside lessons is neither read nor overwritten.
    const auto = useAutoOpen(kind);
    const [cue, setCue] = useState(false);
    const [inLesson, setInLesson] = useState(() => !!props.foldInLesson && lessonIsOpen());
    const [lessonFold, setLessonFold] = useState<boolean | null>(() => lessonFolds.get(kind) ?? null);
    useEffect(() => {
        if (!props.foldInLesson) return undefined;
        const workspace = document.querySelector('.demonstration-workspace');
        if (!workspace) return undefined;
        const apply = () => {
            const now = workspace.classList.contains('lesson-open');
            setInLesson(now);
            if (!now) { lessonFolds.delete(kind); setLessonFold(null); }
        };
        apply();
        const observer = new MutationObserver(apply);
        observer.observe(workspace, {attributes: true, attributeFilter: ['class']});
        return () => observer.disconnect();
    }, [kind, props.foldInLesson]);
    // Fold-all (key Z) decides every card's fold but the lesson card's while it is on; the card's own fold comes back after it.
    useFoldAll();
    const byAll = foldAllRules(kind);
    const collapsed = byAll ? foldAllFold(kind) : props.collapsed ?? (inLesson ? lessonFold ?? !auto : ownCollapsed);
    // The lesson frame refers to this card: it opens by itself (unless the learner chose) and glows briefly.
    const cueNow = auto && inLesson && lessonFold === null;
    useEffect(() => {
        if (!cueNow) { setCue(false); return undefined; }
        setCue(true);
        const timer = window.setTimeout(() => setCue(false), 1200);
        return () => window.clearTimeout(timer);
    }, [cueNow]);
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
    /** Where a floating card may go, in board coordinates: anywhere on the board. */
    const bounds = (el: HTMLElement, host: HTMLElement) => ({minX: 0, maxX: Math.max(0, host.clientWidth - el.offsetWidth), maxY: host.clientHeight - el.offsetHeight});
    /** Keeps a floating card inside its bounds (display only; the stored position is kept), placed in board coordinates
     * whatever element holds it. */
    const clamp = () => {
        const el = card.current, host = frame?.current;
        if (!el || !host || !floating || !pos) return;
        const b = bounds(el, host);
        const x = Math.max(b.minX, Math.min(pos.x, b.maxX)), y = Math.max(0, Math.min(pos.y, b.maxY));
        const parent = (el.offsetParent as HTMLElement | null) ?? host;
        const f = host.getBoundingClientRect(), q = parent.getBoundingClientRect();
        el.style.left = `${x + f.left - q.left - parent.clientLeft}px`;
        el.style.top = `${y + f.top - q.top - parent.clientTop}px`;
    };
    useLayoutEffect(() => {
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
        if (keyboard) setSaid(m.region ? `${props.title}: ${REGION_LABEL[m.region]}. Enter pripne.` : `${props.title}: prosto.`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragging, keyboard, floating, pos, collapsed, frame, version]);
    useFlip(card, floating);

    if (!dock) return null;
    const open = phone ? dock.phoneOpen === kind : !collapsed;

    const toggle = () => {
        if (phone) { dock.setPhoneOpen(open ? null : kind); return; }
        const next = !collapsed;
        if (byAll) { setFoldAllCard(kind, next); return; }
        if (props.onToggle) { props.onToggle(!next); return; }
        if (inLesson) { lessonFolds.set(kind, next); setLessonFold(next); return; }
        setCollapsed(next);
        try { localStorage.setItem(collapsedKey(kind), next ? '1' : '0'); } catch { /* ignore */ }
    };

    const place = (x: number, y: number): Pos => {
        const el = card.current!, host = frame!.current!;
        const b = bounds(el, host);
        return {x: Math.round(Math.max(b.minX, Math.min(x, b.maxX))), y: Math.round(Math.max(0, Math.min(y, b.maxY)))};
    };
    const lift = () => { const el = card.current!; pickUp(kind, el.offsetWidth, el.offsetHeight, !floating); };
    /** The card is docked (by a drop at the gap, or back in its default dock): it no longer floats. */
    const docked = () => {
        setPos(null); writePos(kind, null);
        setDragging(false); setKeyboard(false);
        if (card.current) { card.current.style.left = ''; card.current.style.top = ''; }
    };
    const onPointerDown = (e: React.PointerEvent) => {
        if (phone || e.button !== 0 || (e.target as HTMLElement).closest('button, a')) return;
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
        // A click (no drag) on a folded card's head opens it: the whole head, or the whole rail beside the graph, is the target.
        if (d && !d.moved && collapsed && !phone) { toggle(); return; }
        if (!d?.moved || !el) return;
        if (dropAtGap(kind)) { docked(); return; }
        clearGap(kind);
        const host = frame?.current;
        if (!host) return;
        const r = el.getBoundingClientRect(), f = host.getBoundingClientRect();
        writePos(kind, {x: Math.round(r.left - f.left), y: Math.round(r.top - f.top)});
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (phone) return;
        if (e.key === 'Home') { e.preventDefault(); reset(); return; }
        if (e.key === 'Enter' && keyboard) {
            e.preventDefault();
            const g = currentGap();
            if (g && dropAtGap(kind)) { docked(); setSaid(`${props.title}: pripeto, ${REGION_LABEL[g.region]}.`); }
            return;
        }
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

    /** Back to the default place (Home on the grip, double-click on the head, or the reset button). */
    const reset = () => { resetCard(kind); docked(); setSaid(`${props.title}: na privzetem mestu.`); };

    const placement = placementOf(kind);
    const target = dock.regions[phone ? 'tl' : placement.region];
    if (!target) return null;
    const style: React.CSSProperties | undefined = floating ? {left: pos.x, top: pos.y} : phone ? undefined : {order: orderOf(kind)};
    const label = `${open ? 'Skrij' : 'Pokaži'} ${props.what}`;
    // A phone shows a folded card as a small labelled chip.
    if (phone && !open) {
        return createPortal(<button type="button" className="ux-dock-chip" aria-expanded={false} aria-label={label} onClick={toggle}><KindIcon kind={kind}/>{props.title}</button>, target);
    }
    const g = currentGap();
    const gapTarget = g && g.kind === kind && !phone ? dock.regions[g.region] : null;
    // Away from its default place (moved to another anchor, or floating), the card offers the way back in its head.
    const moved = !phone && (floating || (placedRegion(kind) ?? props.region) !== props.region);
    const resetLabel = `Vrni ${props.what} na privzeto mesto`;
    return <>
        {g && gapTarget && createPortal(<GapSlot w={g.w} h={g.h} order={2 * g.index} target={g.isTarget}/>, gapTarget)}
        {createPortal(<div ref={card} data-dock-item="" data-kind={kind} className={`ux-btext ux-bcard-${kind}${open ? '' : ' ux-btext-collapsed'}${floating ? ' is-floating' : ''}${cue ? ' ux-btext-cue' : ''}`} style={style}>
            <div className="ux-btext-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                 onPointerCancel={onPointerUp} onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button, a')) reset(); }}>
                {!phone && <span className="ux-btext-grip" role="button" tabIndex={0} onKeyDown={onKeyDown} onBlur={() => { setKeyboard(false); clearGap(kind); }}
                      aria-label={`Premakni ${props.what} (puščične tipke, Enter pripne na označeno mesto, Domov pripne na privzeto mesto)`}
                      title="Povleci za premik, dvoklik pripne"><GripIcon/></span>}
                {!open && <KindIcon kind={kind}/>}
                <span className="ux-btext-title">{props.head ?? props.title}</span>
                {props.actions}
                {moved && <button type="button" className="ux-btext-toggle ux-btext-reset" onClick={reset} aria-label={resetLabel} title={resetLabel}><ResetIcon/></button>}
                <button type="button" className="ux-btext-toggle" onClick={toggle} aria-expanded={open}
                        aria-label={label} title={label}>{open ? <MinusIcon/> : <PlusIcon/>}</button>
            </div>
            {props.children(open)}
            {!phone && <span className="visually-hidden" role="status">{said}</span>}
        </div>, target)}
    </>;
}
