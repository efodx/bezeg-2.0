import React, {useCallback, useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {currentParams, getParam, observeParamChanges, probing, splitLabel, type ParamEntry} from './paramRegistry';
import {drawn, meaningful} from './YourTurn';
import {settle, svgRootOf} from './family';
import './TimeRibbon.css';

/**
 * a26 — Time ribbon. Every settled change of the graph becomes a bead on a ribbon under the board, coloured by the
 * parameter that moved, so an exploration has a visible history the way a document has versions. Hover a bead and the
 * graph of that moment appears as a dashed ghost; click or drag along the ribbon and the whole graph travels back in time;
 * a new change from there starts a new branch, exactly like undo. Ctrl+Z and Ctrl+Y step through it. Being able to go
 * back for free is what makes trying wild values safe. Generic: snapshots are the shared slider registry's values.
 */

interface Snapshot { values: Record<string, number>; changed: string[] }
interface Ghost { svg: SVGSVGElement; box: {width: number; height: number; left: number; top: number} }

const HUES = ['#4f7a3a', '#b0702d', '#2f6f8f', '#8a4f7a', '#a33d4f', '#5f6b2a'];
const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);
const shapeSignature = (node: Element) => ['d', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'width', 'height', 'transform']
    .map(name => node.getAttribute(name) ?? '').join('|');
const usable = () => currentParams().filter(entry => meaningful(entry));
const valuesNow = () => Object.fromEntries(usable().map(entry => [entry.key, entry.value]));
const differs = (a: Record<string, number>, b: Record<string, number>) => Object.keys(b).filter(key => key in a && Math.abs(a[key] - b[key]) > 1e-12);
const LIMIT = 120;

export function TimeRibbon(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [history, setHistory] = useState<Snapshot[]>([]);
    const [cursor, setCursor] = useState(0);
    const [hover, setHover] = useState<number>();
    const [ghost, setGhost] = useState<Ghost>();
    const [note, setNote] = useState<string>();
    const state = useRef({history, cursor});
    state.current = {history, cursor};
    const colours = useRef(new Map<string, string>());
    const host = useRef<HTMLDivElement>(null);
    const track = useRef<HTMLDivElement>(null);
    const busy = useRef(false);

    const colour = (key: string) => {
        if (!colours.current.has(key)) colours.current.set(key, HUES[colours.current.size % HUES.length]);
        return colours.current.get(key)!;
    };

    // Record: the first change remembers where the graph started; each change settles for 450 ms into one bead.
    useEffect(() => {
        let timer = 0;
        const commit = () => {
            const now = valuesNow();
            const {history: list, cursor: at} = state.current;
            const base = list[at]?.values;
            if (!base) return;
            const changed = differs(base, now);
            if (!changed.length) return;
            const next = [...list.slice(0, at + 1), {values: {...base, ...now}, changed}].slice(-LIMIT);
            setHistory(next);
            setCursor(next.length - 1);
        };
        // In a guided lesson the ribbon belongs to one step: the lesson's own cuts between frames are not the learner's
        // exploration, so a new frame starts a clean ribbon and the lesson's writes into it are not recorded.
        let frameText = '', quietUntil = 0;
        const poll = window.setInterval(() => {
            const text = document.querySelector('.guided-lesson-progress')?.textContent ?? '';
            if (text === frameText) return;
            frameText = text;
            quietUntil = performance.now() + 700;
            window.clearTimeout(timer);
            state.current = {history: [], cursor: 0};
            setHistory([]); setCursor(0); setNote(undefined);
        }, 200);
        const stop = observeParamChanges((previous, next) => {
            if (probing() || !meaningful(next) || performance.now() < quietUntil) return;
            if (state.current.history.length === 0) {
                const start = {...valuesNow(), [previous.key]: previous.value};
                state.current = {history: [{values: start, changed: []}], cursor: 0};
                setHistory(state.current.history);
                setCursor(0);
            }
            window.clearTimeout(timer);
            timer = window.setTimeout(commit, 450);
        });
        return () => { stop(); window.clearInterval(poll); window.clearTimeout(timer); };
    }, []);

    const travel = useCallback((index: number) => {
        const {history: list} = state.current;
        const target = list[index];
        if (!target) return;
        const now = valuesNow();
        const locked: string[] = [];
        for (const key of differs(now, target.values)) {
            const entry = getParam(key);
            if (!entry) continue;
            if (entry.unavailable !== undefined || entry.inert) { locked.push(symbolOf(entry)); continue; }
            entry.set(target.values[key]);
        }
        state.current = {history: list, cursor: index};
        setCursor(index);
        setGhost(undefined);
        setNote(locked.length ? `${locked.join(', ')}: ta drsnik zdaj vodi lekcija` : undefined);
    }, []);

    // Undo and redo from the keyboard, also while a slider has focus.
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target && (target.isContentEditable || (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') || target.tagName === 'TEXTAREA')) return;
            const k = event.key.toLowerCase();
            const back = k === 'z' && !event.shiftKey, forward = k === 'y' || k === 'z' && event.shiftKey;
            const {history: list, cursor: at} = state.current;
            if (back && at > 0) { event.preventDefault(); travel(at - 1); }
            else if (forward && at < list.length - 1) { event.preventDefault(); travel(at + 1); }
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [travel]);

    // Hovering a bead draws the graph of that moment as a ghost: set, clone the moved shapes, restore before paint.
    useEffect(() => {
        let cancelled = false;
        const show = async () => {
            const snapshot = hover === undefined ? undefined : history[hover];
            const b = findBoard(props.frame.current);
            const svg = b && svgRootOf(b);
            if (!snapshot || hover === cursor || !b || !svg || busy.current) { setGhost(undefined); return; }
            const now = valuesNow();
            const keys = differs(now, snapshot.values);
            if (!keys.length) { setGhost(undefined); return; }
            busy.current = true;
            try {
                const before = new Map(drawn(b).map(object => [object.rendNode!.id, shapeSignature(object.rendNode!)]));
                await settle(b, keys, keys.map(key => snapshot.values[key]));
                const clone = svg.cloneNode(true) as SVGSVGElement;
                const moved = new Set(drawn(b).map(object => object.rendNode!).filter(node => before.get(node.id) !== shapeSignature(node)).map(node => node.id));
                await settle(b, keys, keys.map(key => now[key]));
                if (cancelled) return;
                clone.querySelectorAll('[id]').forEach(node => {
                    if (['path', 'line', 'ellipse', 'circle', 'polygon', 'rect', 'polyline'].includes(node.tagName.toLowerCase()) && !moved.has(node.id)) node.remove();
                });
                clone.querySelectorAll('text, foreignObject, image').forEach(node => node.remove());
                clone.removeAttribute('id');
                const frame = props.frame.current!.getBoundingClientRect(), box = svg.getBoundingClientRect();
                setGhost(moved.size ? {svg: clone, box: {width: box.width, height: box.height, left: box.left - frame.left, top: box.top - frame.top}} : undefined);
            } finally { busy.current = false; }
        };
        const timer = window.setTimeout(() => void show(), 40);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [hover, cursor, history, props.frame]);

    useEffect(() => {
        const node = host.current;
        if (!node) return;
        node.replaceChildren();
        if (!ghost) return;
        ghost.svg.setAttribute('width', String(ghost.box.width));
        ghost.svg.setAttribute('height', String(ghost.box.height));
        node.appendChild(ghost.svg);
    }, [ghost]);

    // Dragging along the ribbon scrubs through time; on a phone a tap travels.
    const indexAt = (clientX: number) => {
        const rect = track.current!.getBoundingClientRect();
        const n = history.length;
        if (n < 2) return 0;
        return Math.max(0, Math.min(n - 1, Math.round((clientX - rect.left - 8) / Math.max(1, rect.width - 16) * (n - 1))));
    };
    const dragging = useRef(false);
    const down = (event: React.PointerEvent) => {
        dragging.current = true;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        setHover(undefined);
        travel(indexAt(event.clientX));
        (window as unknown as {__uxConsumed?: number}).__uxConsumed = performance.now();
    };
    const move = (event: React.PointerEvent) => {
        const index = indexAt(event.clientX);
        if (dragging.current) { if (index !== state.current.cursor) travel(index); return; }
        if (event.pointerType !== 'touch') setHover(index);
    };
    const up = () => { dragging.current = false; };

    if (history.length < 2) return <div className="ux-ribbon ux-ribbon-idle" aria-hidden="true">
        <span className="ux-ribbon-clock">↺</span> {document.querySelector('.guided-lesson-progress') ? 'tvoje spremembe v tem koraku ostanejo na traku' : 'premakni drsnik — vsaka sprememba ostane na traku'}
    </div>;

    const shown = hover ?? cursor;
    const describe = (index: number) => {
        const snapshot = history[index];
        if (index === 0) return 'začetek';
        const previous = history[index - 1];
        return snapshot.changed.map(key => {
            const entry = getParam(key);
            if (!entry) return '';
            const f = (value: number) => entry.format(Number(value.toPrecision(6)));
            return `${symbolOf(entry)}: ${f(previous.values[key])} → ${f(snapshot.values[key])}`;
        }).filter(Boolean).join(', ');
    };
    const n = history.length;
    const at = (index: number) => `calc(8px + (100% - 16px) * ${n < 2 ? 0 : index / (n - 1)})`;

    return <>
        <div ref={host} className="ux-ribbon-ghost" aria-hidden="true" style={ghost ? ghost.box : {display: 'none'}}/>
        <div className="ux-ribbon" role="group" aria-label="Časovni trak raziskovanja">
            <button type="button" className="ux-ribbon-step" disabled={cursor === 0} onClick={() => travel(cursor - 1)} aria-label="Korak nazaj (Ctrl+Z)" title="Korak nazaj (Ctrl+Z)">↶</button>
            <div className="ux-ribbon-body">
                <div className="ux-ribbon-caption" aria-live="polite">
                    <b>{shown === 0 ? 'začetek' : `${shown}. sprememba`}</b> <span>{shown === 0 ? `od ${n - 1}` : describe(shown)}</span>
                    {hover !== undefined && hover !== cursor && <em>klik: vrni se sem</em>}
                    {hover === undefined && note && <em>{note}</em>}
                </div>
                <div ref={track} className="ux-ribbon-track" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => setHover(undefined)}>
                    <span className="ux-ribbon-line"/>
                    <span className="ux-ribbon-past" style={{width: at(cursor)}}/>
                    {history.map((snapshot, index) => {
                        const key = snapshot.changed[0];
                        return <span key={index} className={`ux-ribbon-bead${index === cursor ? ' is-now' : ''}${index > cursor ? ' is-future' : ''}${index === hover ? ' is-hover' : ''}`}
                            style={{left: at(index), background: index === 0 ? '#19372f' : colour(key)}}/>;
                    })}
                </div>
            </div>
            <button type="button" className="ux-ribbon-step" disabled={cursor >= n - 1} onClick={() => travel(cursor + 1)} aria-label="Korak naprej (Ctrl+Y)" title="Korak naprej (Ctrl+Y)">↷</button>
        </div>
    </>;
}
