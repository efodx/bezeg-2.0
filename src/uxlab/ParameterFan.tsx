import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {contentElements, findMainBoard, recoverBoards, svgRoot, traced, type UxBoard, type UxElement} from './board';
import {bindControls} from './controls';
import {geometryKey} from './geometrySamples';
import {applyRow, deltaAt, FAN_SIZE, fanRows, rowName, type FanRow} from './fan';
import {morphScene} from './morph';
import './uxlab.css';

interface Thumb { markup: string; ghost: string; box?: [number, number, number, number] }
type Strip = (Thumb | null)[];

const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});

/** A frozen copy of the board over the board, while scenes are tried behind it. */
function coverBoard(container: HTMLElement): HTMLElement {
    const cover = container.cloneNode(true) as HTMLElement;
    cover.removeAttribute('id');
    cover.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    cover.querySelectorAll('.ux-fan, .ux-match, .ux-fan-ghost, .ux-fan-entry').forEach(node => node.remove());
    cover.className = 'ux-fan-cover';
    container.appendChild(cover);
    return cover;
}

const GEOMETRY = /^(path|line|ellipse|circle|polygon|polyline|rect)$/i;

function nodeMarkup(element: UxElement): string {
    const node = element.rendNode;
    if (!node || !GEOMETRY.test(node.tagName)) return '';
    return node.outerHTML.replace(/\s(id|marker-start|marker-end|marker-mid)="[^"]*"/g, '');
}

function snapshot(board: UxBoard): Thumb {
    const elements = contentElements(board);
    const shown = elements.filter(element => traced(element) || element.elType === 'point' || element.elType === 'glider');
    // The drawn extent (inside the canvas), so thumbnails can zoom to the content instead of the whole board.
    let box: Thumb['box'];
    for (const element of shown) {
        const node = element.rendNode;
        if (!(node instanceof SVGGraphicsElement) || !GEOMETRY.test(node.tagName)) continue;
        let rect: DOMRect;
        try { rect = node.getBBox(); } catch { continue; }
        const x0 = Math.max(0, rect.x), y0 = Math.max(0, rect.y);
        const x1 = Math.min(board.canvasWidth, rect.x + rect.width), y1 = Math.min(board.canvasHeight, rect.y + rect.height);
        if (x1 < x0 || y1 < y0) continue;
        box = box ? [Math.min(box[0], x0), Math.min(box[1], y0), Math.max(box[2], x1), Math.max(box[3], y1)] : [x0, y0, x1, y1];
    }
    return {
        markup: shown.map(nodeMarkup).join(''),
        ghost: elements.filter(traced).map(nodeMarkup).join(''),
        box,
    };
}

function cleanName(name: string | undefined): string {
    if (!name) return '';
    const subscript: Record<string, string> = {0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉'};
    return name.replace(/<[^>]+>/g, '').replace(/\\[a-z]+/gi, '').replace(/[{}$\\]/g, '').replace(/_(\d+)/g, (_, digits: string) => digits.split('').map(digit => subscript[digit]).join('')).trim().slice(0, 6);
}

/** Names point rows after the board point that sits where the row's stored coordinates say. */
function pointNames(board: UxBoard, rows: FanRow[], grid: number | undefined): Map<string, string> {
    const names = new Map<string, string>();
    const unit = grid !== undefined ? 2 ** grid : 1;
    const handles = board.objectsList.filter(element => (element.elType === 'point' || element.elType === 'glider') && element.X && element.Y);
    const byKey = new Map<string, {x?: number; y?: number}>();
    // Only stored points are named after board points; a matrix column that happens to sit on e₁ is not e₁.
    for (const row of rows) if (row.kind === 'point' && /(^|\.)points?\./i.test(row.key)) byKey.set(row.key, {...byKey.get(row.key), [row.axis!]: row.leaves[0].value * unit});
    for (const [key, {x, y}] of byKey) {
        if (x === undefined || y === undefined) continue;
        const match = handles.find(element => Math.abs(element.X!() - x) < 1e-6 && Math.abs(element.Y!() - y) < 1e-6 && cleanName(element.name));
        if (match) names.set(key, cleanName(match.name));
    }
    return names;
}

function format(value: number): string {
    const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    let text = value.toFixed(digits);
    if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text.replace('.', ',').replace('-', '−');
}

/**
 * Lane B b6: every free quantity of the scene as a strip of small multiples (Victor's ladder of abstraction). The
 * selected quantity's family is drawn faintly on the graph; sweeping across the strip scrubs the real graph.
 */
export function ParameterFan(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<FanRow[]>([]);
    const [names, setNames] = useState<Map<string, string>>(new Map());
    const [selected, setSelected] = useState(0);
    const [strips, setStrips] = useState<Record<string, Strip>>({});
    const [busy, setBusy] = useState(false);
    const [live, setLive] = useState<{row: string; value: number} | undefined>();
    const [message, setMessage] = useState('');
    const committed = useRef<LessonSceneCheckpoint>();
    const committedJson = useRef('');
    const ghost = useRef<SVGGElement>();
    const scrubbing = useRef<{pointer: number; moved: boolean; position: number} | undefined>();
    const previewing = useRef(false);
    const frame = useRef(0);
    const busyRef = useRef(false);
    const lastPointer = useRef(0);
    useEffect(() => { if (!window.__uxLesson) window.__uxLesson = {capabilities: props.capabilities, session: undefined}; }, [props.capabilities]);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    const removeGhost = () => { ghost.current?.remove(); ghost.current = undefined; };

    const commitNow = useCallback(() => {
        try {
            committed.current = props.capabilities.captureState();
            committedJson.current = JSON.stringify(committed.current.value);
        } catch { committed.current = undefined; }
    }, [props.capabilities]);

    /** Restores the committed scene for every value of a row, two frames each, behind a frozen copy of the board. */
    const computeStrip = useCallback(async (row: FanRow) => {
        if (!board || !committed.current || busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        const cover = coverBoard(board.containerObj);
        const base = committed.current;
        const strip: Strip = [];
        for (let index = 0; index < FAN_SIZE; index++) {
            if (row.deltas[index] === 0 && index !== row.now) { strip.push(null); continue; }
            try {
                props.capabilities.restoreState({version: 1, value: applyRow(base.value, row, row.deltas[index])});
                await nextFrames(2);
                strip.push(recoverBoards() ? null : snapshot(board));
            } catch {
                recoverBoards();
                strip.push(null);
            }
        }
        try { props.capabilities.restoreState(base); } catch { recoverBoards(); }
        await nextFrames(2);
        recoverBoards();
        cover.remove();
        busyRef.current = false;
        setBusy(false);
        setStrips(current => ({...current, [row.id]: strip}));
    }, [board, props.capabilities]);

    /** Keeps the rows whose extreme values change the drawing (a mode's parameter that is not shown does not). */
    const visibleRows = useCallback(async (found: FanRow[]): Promise<FanRow[]> => {
        if (!board || !committed.current) return found;
        const base = committed.current;
        const keys = () => contentElements(board).map(element => element.rendNode ? geometryKey(element.rendNode) : '').join('#');
        const before = keys();
        const container = board.containerObj;
        const cover = coverBoard(container);
        const kept: FanRow[] = [];
        for (const row of found) {
            let changed = false;
            for (const index of [FAN_SIZE - 1, 0]) {
                try {
                    if (window.location.search.includes('uxdebug')) console.info('[ux b6] probe', row.id, row.leaves[0].value + row.deltas[index]);
                    props.capabilities.restoreState({version: 1, value: applyRow(base.value, row, row.deltas[index])});
                    await nextFrames(2);
                    if (window.location.search.includes('uxdebug')) console.info('[ux b6] alive', props.capabilities.isAvailable?.(), Object.keys(window.JXG?.boards ?? {}).length);
                    if (!recoverBoards() && keys() !== before) { changed = true; break; }
                } catch { recoverBoards(); }
            }
            if (changed) kept.push(row);
            if (props.capabilities.isAvailable?.() === false) break;
        }
        try { props.capabilities.restoreState(base); } catch { recoverBoards(); }
        await nextFrames(2);
        recoverBoards();
        cover.remove();
        return kept;
    }, [board, props.capabilities]);

    const openFan = useCallback(async () => {
        if (!board || busyRef.current) return;
        commitNow();
        if (!committed.current) return;
        const {rows: all, candidates} = fanRows(committed.current.value, board.getBoundingBox(), 14, found => bindControls(found, props.root.current ?? document));
        busyRef.current = true;
        setBusy(true);
        const found = (await visibleRows(all)).slice(0, 8);
        busyRef.current = false;
        setBusy(false);
        if (found.length === 0) { setMessage('Ta prizor nima prostih količin.'); return; }
        setRows(found);
        setNames(pointNames(board, found, candidates.grid));
        setStrips({});
        setSelected(0);
        setMessage('');
        setOpen(true);
    }, [board, commitNow]);

    const close = useCallback(() => {
        removeGhost();
        setOpen(false);
        setLive(undefined);
    }, []);

    const row = rows[selected];
    const strip = row ? strips[row.id] : undefined;

    // A new row, or a scene the learner changed with the ordinary controls, needs a fresh strip.
    useEffect(() => {
        if (!open || !row || busyRef.current) return;
        let current = '';
        try { current = JSON.stringify(props.capabilities.captureState().value); } catch { return; }
        if (current !== committedJson.current) { commitNow(); setStrips({}); return; }
        if (!strip) void computeStrip(row);
    }, [open, row, strip, computeStrip, commitNow, props.capabilities]);

    // The faint family on the graph itself, darker towards larger values.
    useEffect(() => {
        if (!open || !board || !strip) { removeGhost(); return; }
        const svg = svgRoot(board);
        if (!svg) return;
        if (!ghost.current || !ghost.current.isConnected) {
            ghost.current = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            ghost.current.setAttribute('class', 'ux-fan-ghost');
            ghost.current.setAttribute('pointer-events', 'none');
            svg.insertBefore(ghost.current, svg.firstChild);
        }
        ghost.current.innerHTML = strip.map((thumb, index) => thumb && index !== row?.now
            ? `<g class="ux-fan-ghost-${index}">${thumb.ghost}</g>` : '').join('');
    }, [open, board, strip, row]);
    useEffect(() => () => removeGhost(), []);

    // Watching for outside changes while open: drags on the graph make the strip stale.
    useEffect(() => {
        if (!open || !board) return;
        const onUp = () => window.setTimeout(() => {
            if (busyRef.current || scrubbing.current || previewing.current) return;
            let current = '';
            try { current = JSON.stringify(props.capabilities.captureState().value); } catch { return; }
            if (current !== committedJson.current) { commitNow(); setStrips({}); }
        }, 120);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('keyup', onUp);
        return () => { window.removeEventListener('pointerup', onUp); window.removeEventListener('keyup', onUp); };
    }, [open, board, commitNow, props.capabilities]);

    const accepted = strip ? strip.map(thumb => thumb !== null) : [];
    // One frame for the whole strip: the union of what every value draws, padded, at the thumbnails' aspect ratio.
    let viewBox = board ? `0 0 ${board.canvasWidth} ${board.canvasHeight}` : '';
    if (board && strip) {
        const boxes = strip.flatMap(thumb => thumb?.box ? [thumb.box] : []);
        if (boxes.length) {
            let [x0, y0, x1, y1] = boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
            const pad = 0.08 * Math.max(x1 - x0, y1 - y0, 40);
            x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
            const aspect = 1.45;
            let width = x1 - x0, height = y1 - y0;
            if (width / height < aspect) { const grow = height * aspect - width; x0 -= grow / 2; width += grow; }
            else { const grow = width / aspect - height; y0 -= grow / 2; height += grow; }
            viewBox = `${x0.toFixed(1)} ${y0.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
        }
    }

    const preview = useCallback((position: number) => {
        if (!row || !committed.current || busyRef.current) return;
        const delta = deltaAt(row, position, accepted);
        if (delta === undefined) return;
        previewing.current = true;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            try {
                props.capabilities.restoreState({version: 1, value: applyRow(committed.current!.value, row, delta)});
                setLive({row: row.id, value: row.leaves[0].value + delta});
            } catch { recoverBoards(); }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row, strip, props.capabilities]);

    const revert = useCallback(() => {
        cancelAnimationFrame(frame.current);
        if (!previewing.current || !committed.current) return;
        previewing.current = false;
        setLive(undefined);
        let before: LessonSceneCheckpoint | undefined;
        try { before = props.capabilities.captureState(); } catch { /* gone */ }
        try { props.capabilities.restoreState(committed.current); } catch { recoverBoards(); return; }
        if (before) morphScene(props.capabilities, before, {duration: 260});
    }, [props.capabilities]);

    const keep = useCallback((position: number) => {
        if (!row || !committed.current) return;
        const delta = deltaAt(row, position, accepted);
        if (delta === undefined) return;
        cancelAnimationFrame(frame.current);
        let before: LessonSceneCheckpoint | undefined;
        try { before = props.capabilities.captureState(); } catch { /* gone */ }
        try { props.capabilities.restoreState({version: 1, value: applyRow(committed.current.value, row, delta)}); } catch { recoverBoards(); return; }
        if (before) morphScene(props.capabilities, before, {duration: 300});
        previewing.current = false;
        setLive(undefined);
        window.setTimeout(() => { commitNow(); setStrips({}); }, 340);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row, strip, props.capabilities, commitNow]);

    const positionOf = (event: React.PointerEvent<HTMLElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return (event.clientX - rect.left) / rect.width * FAN_SIZE - 0.5;
    };

    if (!board || props.locked) return null;
    const middle = row ? row.now : (FAN_SIZE - 1) / 2;
    const original = row ? row.leaves[0].value : 0;
    const shownValue = live && row && live.row === row.id ? live.value : original;
    const ui = !open
        ? <div className="ux-fan-entry">
            <button type="button" className="ux-fan-open" disabled={busy} onClick={() => void openFan()}>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 17 L3 5 M10 17 L7 3.5 M10 17 L13 3.5 M10 17 L17 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M3 5 Q10 0 17 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {busy ? 'Iščem količine …' : 'Pahljača'}
            </button>
            {message && <span className="ux-match-message">{message}</span>}
        </div>
        : <div className="ux-fan" role="group" aria-label="Pahljača količin">
            <div className="ux-fan-head">
                <div className="ux-fan-chips" role="tablist" aria-label="Količina">
                    {rows.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === selected}
                        className={index === selected ? 'is-on' : ''} onClick={() => { revert(); setSelected(index); }}>{rowName(item, names.get(item.key))}</button>)}
                </div>
                <button type="button" className="ux-fan-close" aria-label="Zapri pahljačo" onClick={() => { revert(); close(); }}>×</button>
            </div>
            {row && <div className="ux-fan-value" aria-live="polite">
                <strong>{rowName(row, names.get(row.key))}</strong> = {format(shownValue)}
                <span>{busy && !strip ? ' · rišem družino …' : live ? ' · predogled, spusti za izbiro' : ' · podrsaj po trakcu'}</span>
            </div>}
            <div className="ux-fan-strip"
                onPointerMove={event => {
                    if (!strip) return;
                    const position = positionOf(event);
                    if (scrubbing.current && scrubbing.current.pointer === event.pointerId) {
                        scrubbing.current.position = position;
                        scrubbing.current.moved = true;
                        preview(position);
                    } else if (event.pointerType === 'mouse' && !event.buttons) preview(position);
                }}
                onPointerDown={event => {
                    lastPointer.current = performance.now();
                    if (!strip) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    scrubbing.current = {pointer: event.pointerId, moved: false, position: positionOf(event)};
                    preview(scrubbing.current.position);
                }}
                onPointerUp={event => {
                    lastPointer.current = performance.now();
                    const current = scrubbing.current;
                    scrubbing.current = undefined;
                    if (!current || current.pointer !== event.pointerId) return;
                    keep(current.moved ? current.position : Math.round(current.position));
                }}
                onPointerCancel={() => { scrubbing.current = undefined; revert(); }}
                onPointerLeave={event => { if (event.pointerType === 'mouse' && !scrubbing.current) revert(); }}>
                {Array.from({length: FAN_SIZE}, (_, index) => {
                    const thumb = strip?.[index];
                    const value = row ? original + row.deltas[index] : 0;
                    return <button key={index} type="button" tabIndex={0}
                        className={`ux-fan-thumb${index === middle ? ' is-now' : ''}${strip && !thumb ? ' is-refused' : ''}${!strip ? ' is-pending' : ''}`}
                        aria-label={`${row ? rowName(row, names.get(row.key)) : ''} = ${format(value)}${index === middle ? ', zdaj' : ''}`}
                        disabled={Boolean(strip) && !thumb}
                        onFocus={() => { if (!scrubbing.current && performance.now() - lastPointer.current > 600) preview(index); }}
                        onBlur={() => { if (!scrubbing.current && performance.now() - lastPointer.current > 600) revert(); }}
                        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); keep(index); } }}>
                        {thumb
                            ? <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true" dangerouslySetInnerHTML={{__html: thumb.markup}}/>
                            : <span className="ux-fan-thumb-empty" aria-hidden="true">{strip ? '–' : ''}</span>}
                        <small>{format(value)}</small>
                    </button>;
                })}
            </div>
        </div>;
    return createPortal(ui, board.containerObj);
}
