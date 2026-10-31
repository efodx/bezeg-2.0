/**
 * The Bézier drawing playground: one SVG canvas with a pen-tool style editor, a toolbar, keyboard editing and
 * browser-local persistence. See docs/specs/bezier-drawing-playground.md and ADR 0020.
 *
 * Ownership: pointer input uses pointer capture on the SVG element only; there are no window/document listeners.
 * Extension points for the "Look underneath" overlays (slice PG3): the `overlays` render prop draws inside the SVG
 * (non-interactive, between the shape and the handles) and `controls` renders extra content below the toolbar.
 *
 * Undo steps: a pointer drag is one step (committed on pointerup). A keyboard move is one step per key press; held-down
 * key repeat on the same element is coalesced into the step started by the first press.
 */
import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useT} from '../../localization';
import {appStorage} from '../../storage/appStorage';
import {GraphPalette} from '../../graphs/styles/GraphPalette';
import {
    Anchor, AnchorType, Drawing, EMPTY_DRAWING, History, MAX_ANCHORS, Point, VIEWBOX_HEIGHT, VIEWBOX_WIDTH,
    addPointAfterLast, appendCorner, appendSmooth, canClose, canRedo, canUndo, clearDrawing, closeDrawing,
    createHistory, deleteAnchor, moveAnchor, moveHandle, pushHistory, redoHistory, segments, setAnchorType,
    toSvgPath, toggleAnchorType, undoHistory, validateDrawing,
} from './drawingModel';
import './DrawingPlayground.css';

export const PLAYGROUND_STORAGE_KEY = 'bezier-playground.drawing.v1';

const mk = (x: number, y: number, type: AnchorType, inX: number, inY: number, outX: number, outY: number): Anchor =>
    ({position: {x, y}, handleIn: {x: inX, y: inY}, handleOut: {x: outX, y: outY}, type});

/** The authored example: a closed heart with corners at the tip and the notch, smooth lobes and one G1 anchor. */
export const EXAMPLE_DRAWING: Drawing = {
    closed: true,
    anchors: [
        mk(500, 560, 'corner', 640, 480, 360, 480),
        mk(210, 330, 'smooth-mirrored', 210, 410, 210, 250),
        mk(330, 100, 'smooth-mirrored', 240, 100, 420, 100),
        mk(500, 210, 'corner', 470, 120, 530, 120),
        mk(670, 100, 'smooth-mirrored', 580, 100, 760, 100),
        mk(790, 330, 'smooth-aligned', 790, 250, 790, 430),
    ],
};

export interface PlaygroundOverlayContext {
    drawing: Drawing;
    selectedAnchor: number | null;
    mode: 'draw' | 'inspect';
    /** User-space units per CSS pixel on the current canvas (for sizing overlay marks). */
    unitsPerPx: number;
}

export interface DrawingPlaygroundProps {
    mode: 'draw' | 'inspect';
    /** Non-interactive SVG content drawn above the shape and below the handles. */
    overlays?: (ctx: PlaygroundOverlayContext) => React.ReactNode;
    /** Extra content rendered below the toolbar. */
    controls?: (ctx: PlaygroundOverlayContext) => React.ReactNode;
    /** Called when the pointer goes down on an overlay element with data-role="segment" and data-index (a pointer-events stroke hit path); the press then edits nothing. */
    onSelectSegment?: (index: number) => void;
}

type Drag =
    | {kind: 'new'; pointerId: number; base: Drawing; start: Point; moved: boolean}
    | {kind: 'anchor'; pointerId: number; base: Drawing; index: number; start: Point; moved: boolean}
    | {kind: 'handle'; pointerId: number; base: Drawing; index: number; which: 'in' | 'out'; moved: boolean};

const DRAG_THRESHOLD = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampPoint = (p: Point): Point => ({x: clamp(p.x, 0, VIEWBOX_WIDTH), y: clamp(p.y, 0, VIEWBOX_HEIGHT)});
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function loadDrawing(): Drawing {
    let raw: string | null;
    try { raw = appStorage.getItem(PLAYGROUND_STORAGE_KEY); } catch { return EMPTY_DRAWING; }
    if (raw === null) return EMPTY_DRAWING;
    try {
        const valid = validateDrawing(JSON.parse(raw));
        if (valid) return valid;
    } catch { /* fall through to the warning */ }
    console.warn('Bezier playground: stored drawing is invalid and was discarded.');
    return EMPTY_DRAWING;
}

function saveDrawing(d: Drawing) {
    try { appStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(d)); } catch { /* storage may be blocked */ }
}

/** Client pixels to user space through the inverse screen CTM; falls back to the bounding box (or identity in jsdom). */
function toUser(svg: SVGSVGElement, clientX: number, clientY: number): Point {
    const ctm = svg.getScreenCTM?.();
    if (ctm) {
        const m = ctm.inverse();
        return clampPoint({x: m.a * clientX + m.c * clientY + m.e, y: m.b * clientX + m.d * clientY + m.f});
    }
    const rect = svg.getBoundingClientRect?.();
    if (rect && rect.width > 0 && rect.height > 0) {
        return clampPoint({x: (clientX - rect.left) * VIEWBOX_WIDTH / rect.width, y: (clientY - rect.top) * VIEWBOX_HEIGHT / rect.height});
    }
    return clampPoint({x: clientX, y: clientY});
}

export default function DrawingPlayground({mode, overlays, controls, onSelectSegment}: DrawingPlaygroundProps) {
    const t = useT();
    const [history, setHistoryState] = useState<History<Drawing>>(() => createHistory(loadDrawing()));
    const historyRef = useRef(history);
    const savedRef = useRef(history.present);
    const [draft, setDraft] = useState<Drawing | null>(null);
    const draftRef = useRef<Drawing | null>(null);
    const updateDraft = (d: Drawing | null) => { draftRef.current = d; setDraft(d); };
    const [selected, setSelected] = useState<number | null>(null);
    const [announce, setAnnounce] = useState<{count: number; closed: boolean} | null>(null);
    const [scale, setScale] = useState({unitsPerPx: 1, coarse: false});
    const svgRef = useRef<SVGSVGElement | null>(null);
    const dragRef = useRef<Drag | null>(null);
    const amendRef = useRef<{key: string; present: Drawing} | null>(null);
    const focusRef = useRef<{role: string; index: number} | null>(null);
    const announcedRef = useRef(history.present);
    /** The last anchor a click created or closed, so the trailing dblclick of that same gesture is not a second action. */
    const recentRef = useRef<{index: number; time: number} | null>(null);

    const flushSave = useCallback(() => {
        const present = historyRef.current.present;
        if (present !== savedRef.current) { savedRef.current = present; saveDrawing(present); }
    }, []);
    /** `save: false` is for coalesced key-repeat amendments; they are stored once, when the key is released. */
    const setHistory = useCallback((h: History<Drawing>, save = true) => {
        historyRef.current = h;
        setHistoryState(h);
        if (save) flushSave();
    }, [flushSave]);
    const commit = useCallback((next: Drawing) => { amendRef.current = null; setHistory(pushHistory(historyRef.current, next)); }, [setHistory]);

    const drawing = draft ?? history.present;
    const n = drawing.anchors.length;
    const selectedIndex = selected !== null && selected < n ? selected : null;

    // Canvas scale for hit targets; the ResizeObserver is owned by this effect.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || typeof ResizeObserver === 'undefined') return;
        const measure = () => {
            const w = svg.getBoundingClientRect().width;
            const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
            if (w > 0) setScale({unitsPerPx: VIEWBOX_WIDTH / w, coarse});
        };
        const observer = new ResizeObserver(measure);
        observer.observe(svg);
        measure();
        return () => observer.disconnect();
    }, []);

    // Debounced live-region summary of the committed drawing (key repeat never announces each keystroke).
    useEffect(() => {
        // Nothing is announced for the drawing present at mount (also across the StrictMode double-mount).
        if (history.present === announcedRef.current) return;
        const timer = setTimeout(() => {
            announcedRef.current = history.present;
            setAnnounce({count: history.present.anchors.length, closed: history.present.closed});
        }, 500);
        return () => clearTimeout(timer);
    }, [history.present]);

    // Unmount (also mid-drag): discard the unfinished drag; nothing is committed.
    useEffect(() => () => { dragRef.current = null; }, []);

    useLayoutEffect(() => {
        const target = focusRef.current;
        if (!target) return;
        focusRef.current = null;
        const el = target.role === 'canvas' ? svgRef.current
            : svgRef.current?.querySelector(`[data-role="${target.role}"][data-index="${target.index}"]`);
        (el as unknown as HTMLElement | null | undefined)?.focus?.();
    });

    const releaseCapture = (pointerId: number) => {
        try { if (svgRef.current?.hasPointerCapture?.(pointerId)) svgRef.current.releasePointerCapture(pointerId); } catch { /* already released */ }
    };

    const dragResult = (drag: Drag, p: Point, alt: boolean): Drawing => {
        if (drag.kind === 'new') return appendSmooth(drag.base, drag.start, p);
        if (drag.kind === 'anchor') {
            const a = drag.base.anchors[drag.index];
            return moveAnchor(drag.base, drag.index, clampPoint({x: a.position.x + p.x - drag.start.x, y: a.position.y + p.y - drag.start.y}));
        }
        return moveHandle(drag.base, drag.index, drag.which, p, alt);
    };

    const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.button > 0 || dragRef.current) return;
        const svg = e.currentTarget;
        const p = toUser(svg, e.clientX, e.clientY);
        const base = historyRef.current.present;
        const el = (e.target as Element).closest?.('[data-role]');
        const role = el?.getAttribute('data-role');
        const index = Number(el?.getAttribute('data-index'));
        if (role === 'segment') {
            onSelectSegment?.(index);
            return;
        }
        if (role === 'anchor') {
            setSelected(index);
            dragRef.current = {kind: 'anchor', pointerId: e.pointerId, base, index, start: p, moved: false};
        } else if (role === 'handle-in' || role === 'handle-out') {
            setSelected(index);
            dragRef.current = {kind: 'handle', pointerId: e.pointerId, base, index, which: role === 'handle-in' ? 'in' : 'out', moved: false};
        } else if (base.closed) {
            setSelected(null);
            return;
        } else {
            if (base.anchors.length >= MAX_ANCHORS) return;
            dragRef.current = {kind: 'new', pointerId: e.pointerId, base, start: p, moved: false};
        }
        try { svg.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointers cannot be captured */ }
    };

    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        const p = toUser(e.currentTarget, e.clientX, e.clientY);
        if (!drag.moved) {
            const from = drag.kind === 'handle' ? drag.base.anchors[drag.index][drag.which === 'in' ? 'handleIn' : 'handleOut'] : drag.start;
            if (dist(p, from) < DRAG_THRESHOLD) return;
            drag.moved = true;
        }
        updateDraft(dragResult(drag, p, e.altKey));
        if (drag.kind === 'new') setSelected(drag.base.anchors.length);
    };

    /** End the drag. pointerup commits; lost capture commits the last draft; pointercancel discards. */
    const finishDrag = (e: React.PointerEvent<SVGSVGElement>, mayCommit: boolean) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        const lastDraft = draftRef.current;
        dragRef.current = null;
        releaseCapture(e.pointerId);
        updateDraft(null);
        if (!mayCommit) return;
        const isUp = e.type === 'pointerup';
        if (drag.moved) {
            commit(isUp ? dragResult(drag, toUser(e.currentTarget, e.clientX, e.clientY), e.altKey) : (lastDraft ?? drag.base));
        } else if (!isUp) {
            return;
        } else if (drag.kind === 'new') {
            commit(appendCorner(drag.base, drag.start));
            recentRef.current = {index: drag.base.anchors.length, time: e.timeStamp};
            setSelected(drag.base.anchors.length);
        } else if (drag.kind === 'anchor' && drag.index === 0 && canClose(drag.base)) {
            commit(closeDrawing(drag.base));
            recentRef.current = {index: 0, time: e.timeStamp};
        }
    };

    /** Pointer capture retargets the dblclick to the svg, so fall back to hit-testing the click position. */
    const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const present = historyRef.current.present;
        let index = -1;
        const el = (e.target as Element).closest?.('[data-role="anchor"]');
        if (el) index = Number(el.getAttribute('data-index'));
        else {
            const p = toUser(e.currentTarget, e.clientX, e.clientY);
            let best = hit;
            present.anchors.forEach((a, i) => { const d = dist(a.position, p); if (d <= best) { best = d; index = i; } });
        }
        if (index < 0 || !present.anchors[index]) return;
        const recent = recentRef.current;
        recentRef.current = null;
        if (recent && recent.index === index && e.timeStamp - recent.time < 600) return; // the first click already acted
        commit(toggleAnchorType(present, index));
    };

    const undo = () => { amendRef.current = null; setSelected(null); setHistory(undoHistory(historyRef.current)); };
    const redo = () => { amendRef.current = null; setSelected(null); setHistory(redoHistory(historyRef.current)); };
    const loadExample = () => {
        setSelected(null);
        if (JSON.stringify(historyRef.current.present) === JSON.stringify(EXAMPLE_DRAWING)) return;
        commit(EXAMPLE_DRAWING);
    };

    const removeAnchor = (index: number) => {
        const next = deleteAnchor(historyRef.current.present, index);
        commit(next);
        setSelected(null);
        focusRef.current = next.anchors.length > 0 ? {role: 'anchor', index: Math.min(index, next.anchors.length - 1)} : {role: 'canvas', index: 0};
    };

    const onKeyUp = (e: React.KeyboardEvent<Element>) => { if (e.key.startsWith('Arrow')) flushSave(); };

    /** Attached to the canvas and the toolbar only, so text fields in `controls()` keep their own Ctrl+Z. */
    const onKeyDown = (e: React.KeyboardEvent<Element>) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
            return;
        }
        const el = (e.target as Element).closest?.('[data-role]');
        if (!el || !svgRef.current?.contains(el)) return;
        const role = el.getAttribute('data-role')!;
        const index = Number(el.getAttribute('data-index'));
        const current = historyRef.current.present;
        const a = current.anchors[index];
        if (!a) return;
        const step = e.shiftKey ? 25 : 5;
        const arrows: Record<string, Point> = {ArrowLeft: {x: -step, y: 0}, ArrowRight: {x: step, y: 0}, ArrowUp: {x: 0, y: -step}, ArrowDown: {x: 0, y: step}};
        const delta = arrows[e.key];
        if (delta) {
            e.preventDefault();
            let next: Drawing;
            if (role === 'anchor') {
                next = moveAnchor(current, index, clampPoint({x: a.position.x + delta.x, y: a.position.y + delta.y}));
            } else {
                const which = role === 'handle-in' ? 'in' : 'out';
                const h = which === 'in' ? a.handleIn : a.handleOut;
                next = moveHandle(current, index, which, clampPoint({x: h.x + delta.x, y: h.y + delta.y}), e.altKey);
            }
            const key = `${role}-${index}`;
            const amend = e.repeat && amendRef.current?.key === key && amendRef.current.present === current;
            const h = historyRef.current;
            setHistory(amend ? {...h, present: next} : pushHistory(h, next), !amend);
            amendRef.current = {key, present: next};
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && role === 'anchor') {
            e.preventDefault();
            removeAnchor(index);
        } else if ((e.key === 'Enter' || e.key === ' ') && (role === 'anchor' || role.startsWith('handle'))) {
            e.preventDefault();
            setSelected(index);
            if (role === 'anchor' && index === 0 && canClose(current)) commit(closeDrawing(current));
        }
    };

    const typeName = (type: AnchorType) => type === 'corner' ? t('playground_type_corner') : type === 'smooth-aligned' ? t('playground_type_g1') : t('playground_type_c1');
    const hit = Math.max(14, (scale.coarse ? 22 : 10) * scale.unitsPerPx);
    const mark = Math.max(1, scale.unitsPerPx * 0.8);
    const ctx: PlaygroundOverlayContext = {drawing, selectedAnchor: selectedIndex, mode, unitsPerPx: scale.unitsPerPx};
    const path = useMemo(() => toSvgPath(drawing), [drawing]);
    const closedShape = drawing.closed && segments(drawing).length > 0;
    const selectedType = selectedIndex !== null ? drawing.anchors[selectedIndex].type : null;
    const present = history.present;

    const handleVisible = (i: number, which: 'in' | 'out') => drawing.closed ? n >= 2 : which === 'in' ? i > 0 : i < n - 1;

    // Tab order follows the path: per anchor, its incoming handle, the anchor, then its outgoing handle. A handle lying
    // within 1.5 hit radii of its anchor is not pointer-grabbable (it would cover the anchor); the keyboard still reaches it.
    const elements: React.ReactNode[] = [];
    drawing.anchors.forEach((a, i) => {
        const isSel = selectedIndex === i;
        const handle = (which: 'in' | 'out') => {
            if (!handleVisible(i, which)) return;
            const h = which === 'in' ? a.handleIn : a.handleOut;
            elements.push(
                <g key={`h-${which}-${i}`} className={`playground-handle${isSel ? ' is-active' : ''}`} data-role={`handle-${which}`} data-index={i}
                   tabIndex={0} role="button" aria-label={t(which === 'in' ? 'playground_handle_in_name' : 'playground_handle_out_name', {value0: i + 1})}
                   onFocus={() => setSelected(i)}>
                    <line x1={a.position.x} y1={a.position.y} x2={h.x} y2={h.y} className="playground-handle__stem"/>
                    <circle cx={h.x} cy={h.y} r={9 * mark} className="playground-focus-ring"/>
                    <circle cx={h.x} cy={h.y} r={hit} className="playground-hit" pointerEvents={dist(h, a.position) < hit * 1.5 ? 'none' : undefined}/>
                    <circle cx={h.x} cy={h.y} r={6 * mark} className="playground-handle__dot"/>
                </g>
            );
        };
        handle('in');
        elements.push(
            <g key={`a-${i}`} className={`playground-anchor${isSel ? ' is-selected' : ''}`} data-role="anchor" data-index={i}
               tabIndex={0} role="button" aria-label={t('playground_point_name', {value0: i + 1, value1: typeName(a.type)})}
               aria-pressed={isSel} onFocus={() => setSelected(i)}>
                <circle cx={a.position.x} cy={a.position.y} r={13 * mark} className="playground-focus-ring"/>
                <circle cx={a.position.x} cy={a.position.y} r={hit} className="playground-hit"/>
                <circle cx={a.position.x} cy={a.position.y} r={9 * mark} className="playground-anchor__dot"/>
            </g>
        );
        handle('out');
    });
    const summary = announce === null ? '' : announce.count === 0 ? t('playground_summary_empty')
        : t(announce.closed ? 'playground_summary_closed' : 'playground_summary_open', {value0: announce.count});

    return (
        <div className={`playground playground--${mode}`}>
            <div className="playground__toolbar" role="group" aria-label={t('playground_toolbar')} onKeyDown={onKeyDown}>
                <button type="button" onClick={undo} disabled={!canUndo(history)}>{t('playground_undo')}</button>
                <button type="button" onClick={redo} disabled={!canRedo(history)}>{t('playground_redo')}</button>
                <button type="button" onClick={() => commit(clearDrawing())} disabled={present.anchors.length === 0}>{t('playground_clear')}</button>
                <button type="button" onClick={() => commit(addPointAfterLast(present))} disabled={present.closed || present.anchors.length >= MAX_ANCHORS}>{t('add_point')}</button>
                <button type="button" onClick={() => commit(closeDrawing(present))} disabled={!canClose(present)}>{t('playground_close')}</button>
                <button type="button" onClick={() => selectedIndex !== null && removeAnchor(selectedIndex)} disabled={selectedIndex === null}>{t('delete_point')}</button>
                <span className="playground__group" role="group" aria-label={t('playground_anchor_type')}>
                    {([['corner', 'playground_set_corner'], ['smooth-aligned', 'playground_set_g1'], ['smooth-mirrored', 'playground_set_c1']] as const).map(([type, key]) => (
                        <button key={type} type="button" aria-pressed={selectedType === type} disabled={selectedIndex === null}
                                onClick={() => selectedIndex !== null && commit(setAnchorType(historyRef.current.present, selectedIndex, type))}>{t(key)}</button>
                    ))}
                </span>
                <button type="button" onClick={loadExample}>{t('playground_load_example')}</button>
            </div>
            <svg ref={svgRef} className="playground__canvas" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} role="group"
                 aria-label={t('playground_canvas')} tabIndex={-1} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onBlur={flushSave} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                 onPointerUp={e => finishDrag(e, true)} onPointerCancel={e => finishDrag(e, false)}
                 onLostPointerCapture={e => finishDrag(e, true)} onDoubleClick={onDoubleClick}>
                <rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} className="playground__paper"/>
                {path && <path d={path} className="playground__shape" fill={closedShape ? GraphPalette.primaryCurve : 'none'}
                               fillOpacity={closedShape ? 0.14 : 0} stroke={GraphPalette.primaryCurve}/>}
                <g className="playground__overlays" pointerEvents="none">{overlays?.(ctx)}</g>
                {elements}
            </svg>
            {controls?.(ctx)}
            <div className="playground__live" role="status" aria-live="polite">{summary}</div>
        </div>
    );
}
