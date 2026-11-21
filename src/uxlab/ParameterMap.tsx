import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {coverBoard, findMainBoard, recoverBoards, type UxBoard} from './board';
import {format} from './LiveProse';
import {snapshot, type Thumb} from './ParameterFan';
import {readouts} from './SliderTrace';
import './uxlab.css';

const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});
const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

interface Axis { input: HTMLInputElement; name: string; min: number; max: number; step: number }
interface Cell { thumb?: Thumb; readings: Map<string, number> }
interface MapData { x: Axis; y: Axis; size: number; cells: Cell[]; width: number; height: number; heat: {label: string; low: number; high: number}[] }

function axes(): Axis[] {
    return [...document.querySelectorAll<HTMLElement>('#workspace-inspector .slider-field')].flatMap(field => {
        const input = field.querySelector<HTMLInputElement>('input[type=range]');
        if (!input || input.disabled || field.offsetParent === null || /velikost elementov/i.test(field.textContent ?? '')) return [];
        const name = (field.querySelector('.slider-label label, .form-label')?.textContent ?? input.labels?.[0]?.textContent ?? '').replace(/,\s*vrednost.*$/i, '').trim();
        return [{input, name, min: Number(input.min), max: Number(input.max), step: Number(input.step) || 0}];
    });
}

function setSlider(axis: Axis, value: number) {
    const snapped = axis.step ? Math.round((value - axis.min) / axis.step) * axis.step + axis.min : value;
    valueSetter?.call(axis.input, String(Math.min(axis.max, Math.max(axis.min, Number(snapped.toFixed(9))))));
    axis.input.dispatchEvent(new Event('input', {bubbles: true}));
    axis.input.dispatchEvent(new Event('change', {bubbles: true}));
}

const valueAt = (axis: Axis, fraction: number) => axis.min + (axis.max - axis.min) * fraction;
const fractionOf = (axis: Axis) => (Number(axis.input.value) - axis.min) / (axis.max - axis.min || 1);
const short = (name: string) => name.length > 18 ? `${name.slice(0, 17)}…` : name;

/**
 * Lane B b18: a map of two quantities. Any two inspector sliders span a grid of small multiples of the real graph
 * (Bret Victor's ladder of abstraction), tinted by a readout of the scene (an error, a spread, an angle). Dragging
 * across the map moves both sliders at once, so the learner travels the whole family instead of one line through it.
 */
export function ParameterMap(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [count, setCount] = useState(0);
    const [data, setData] = useState<MapData>();
    const [busy, setBusy] = useState(false);
    const [pair, setPair] = useState<[number, number]>([0, 1]);
    const [heat, setHeat] = useState(0);
    const [marker, setMarker] = useState<[number, number]>([0, 0]);
    const [phone, setPhone] = useState(false);
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const dragging = useRef(false);
    const pending = useRef<[number, number]>();

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
            setCount(axes().length);
            setPhone(window.matchMedia('(max-width: 700px)').matches);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    // The marker follows the sliders, whoever moves them.
    useEffect(() => {
        if (!data) return;
        let frame = 0;
        const loop = () => { setMarker([fractionOf(data.x), fractionOf(data.y)]); frame = requestAnimationFrame(loop); };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [data]);

    const compute = async (choice: [number, number]) => {
        if (!board || busy) return;
        const all = axes();
        const x = all[choice[0]], y = all[choice[1]];
        if (!x || !y) return;
        let base: LessonSceneCheckpoint;
        try { base = caps.current.captureState(); } catch { return; }
        setBusy(true);
        const size = phone ? 5 : 6;
        const cover = coverBoard(board.containerObj);
        const cells: Cell[] = [];
        const key = () => { try { return JSON.stringify(caps.current.captureState().value); } catch { return ''; } };
        let previous = '';
        // Rows from the top (high y) down, columns left to right, as the map is drawn.
        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                try {
                    setSlider(x, valueAt(x, column / (size - 1)));
                    setSlider(y, valueAt(y, 1 - row / (size - 1)));
                    await nextFrames(2);
                    if (recoverBoards()) { cells.push({readings: new Map()}); continue; }
                    const state = key();
                    // A combination the scene refuses leaves it unchanged: no picture rather than a stale one.
                    const refused = state !== '' && state === previous && cells.length > 0;
                    previous = state;
                    cells.push(refused ? {readings: new Map()} : {thumb: snapshot(board), readings: readouts(board)});
                } catch { recoverBoards(); cells.push({readings: new Map()}); }
            }
        }
        try { caps.current.restoreState(base); } catch { recoverBoards(); }
        await nextFrames(2);
        recoverBoards();
        cover.remove();
        setBusy(false);
        // Heat: readouts that vary over the map, most varied first; not a slider's own value under another name.
        const labels = new Set(cells.flatMap(cell => [...cell.readings.keys()]));
        const heatSeries = [...labels].map(label => {
            const values = cells.map(cell => cell.readings.get(label)).filter((value): value is number => value !== undefined);
            const low = Math.min(...values), high = Math.max(...values);
            const own = cells.every((cell, index) => {
                const value = cell.readings.get(label);
                const column = index % size, row = Math.floor(index / size);
                return value === undefined || Math.abs(value - valueAt(x, column / (size - 1))) < 1e-6 || Math.abs(value - valueAt(y, 1 - row / (size - 1))) < 1e-6;
            });
            return {label, low, high, enough: values.length >= cells.length * 0.6, own};
        }).filter(item => item.enough && !item.own && item.high - item.low > 1e-9 * Math.max(1, Math.abs(item.high)))
            .sort((a, b) => new Set(cells.map(cell => cell.readings.get(b.label)?.toFixed(4))).size - new Set(cells.map(cell => cell.readings.get(a.label)?.toFixed(4))).size)
            .slice(0, 4).map(({label, low, high}) => ({label, low, high}));
        setHeat(0);
        setData({x, y, size, cells, width: board.canvasWidth, height: board.canvasHeight, heat: heatSeries});
    };

    const open = (choice: [number, number]) => { setPair(choice); void compute(choice); };

    const scrubTo = (event: React.PointerEvent<HTMLElement>) => {
        if (!data) return;
        const rect = event.currentTarget.getBoundingClientRect();
        // Cell centres are the sampled values: the outer half cells clamp to the slider ends.
        const along = (position: number) => Math.min(1, Math.max(0, (position * data.size - 0.5) / (data.size - 1)));
        const fx = along((event.clientX - rect.left) / rect.width);
        const fy = along(1 - (event.clientY - rect.top) / rect.height);
        if (!pending.current) requestAnimationFrame(() => {
            const target = pending.current;
            pending.current = undefined;
            if (!target) return;
            setSlider(data.x, valueAt(data.x, target[0]));
            setSlider(data.y, valueAt(data.y, target[1]));
        });
        pending.current = [fx, fy];
    };

    if (!board || props.locked || count < 2) return null;
    const host = board.containerObj;
    const button = !data && <button type="button" className="ux-map-open" disabled={busy} onClick={() => open(pair)}
        title="Zemljevid dveh količin: vse kombinacije drsnikov naenkrat">{busy ? 'Rišem zemljevid …' : '▦ Zemljevid'}</button>;
    if (!data) return createPortal(button, host);

    const names = axes().map(axis => axis.name);
    const series = data.heat[heat];
    const tint = (cell: Cell) => {
        if (!series) return undefined;
        const value = cell.readings.get(series.label);
        if (value === undefined) return 'rgba(0,0,0,.04)';
        // Rank, not linear: one huge corner value must not wash out the structure of the rest.
        const values = data.cells.map(item => item.readings.get(series.label)).filter((item): item is number => item !== undefined);
        const f = values.filter(item => item < value).length / Math.max(1, values.length - 1);
        return `rgba(93, 59, 110, ${(0.06 + 0.5 * f).toFixed(3)})`;
    };
    const box = <div className={`ux-map${phone ? ' is-sheet' : ''}`} role="dialog" aria-label="Zemljevid dveh količin" onPointerDown={event => event.stopPropagation()}>
        <div className="ux-map-head">
            <strong>Zemljevid</strong>
            <span className="ux-map-pair">
                <select aria-label="Količina vodoravno" value={pair[0]} onChange={event => { const next: [number, number] = [Number(event.target.value), pair[1] === Number(event.target.value) ? pair[0] : pair[1]]; setData(undefined); open(next); }}>
                    {names.map((name, index) => <option key={index} value={index}>{short(name)}</option>)}</select>
                <span aria-hidden="true">×</span>
                <select aria-label="Količina navpično" value={pair[1]} onChange={event => { const next: [number, number] = [pair[0] === Number(event.target.value) ? pair[1] : pair[0], Number(event.target.value)]; setData(undefined); open(next); }}>
                    {names.map((name, index) => <option key={index} value={index}>{short(name)}</option>)}</select>
            </span>
            <button type="button" className="ux-map-close" aria-label="Zapri zemljevid" onClick={() => setData(undefined)}>✕</button>
        </div>
        <div className="ux-map-body">
            <span className="ux-map-ylabel">{short(data.y.name)} ↑</span>
            <div className="ux-map-grid" style={{gridTemplateColumns: `repeat(${data.size}, 1fr)`}}
                onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); scrubTo(event); }}
                onPointerMove={event => { if (dragging.current) scrubTo(event); }}
                onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
                {data.cells.map((cell, index) => <div key={index} className="ux-map-cell" style={{background: tint(cell)}}>
                    {cell.thumb && <svg viewBox={`0 0 ${data.width} ${data.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" dangerouslySetInnerHTML={{__html: cell.thumb.markup}}/>}
                </div>)}
                <span className="ux-map-marker" style={{left: `${(marker[0] * (data.size - 1) + 0.5) / data.size * 100}%`, top: `${((1 - marker[1]) * (data.size - 1) + 0.5) / data.size * 100}%`}}/>
            </div>
            <span className="ux-map-xlabel">{short(data.x.name)} →</span>
        </div>
        <p className="ux-map-note">
            {series ? <>Barva: <button type="button" className="ux-map-heat" onClick={() => setHeat((heat + 1) % (data.heat.length + 1))}>{series.label}</button> od {format(series.low)} (svetlo) do {format(series.high)} (temno). </>
                : data.heat.length > 0 ? <><button type="button" className="ux-map-heat" onClick={() => setHeat(0)}>Pobarvaj po odčitku</button>. </> : null}
            Vleci po zemljevidu: oba drsnika se premikata hkrati.
        </p>
    </div>;
    return createPortal(box, phone ? document.body : host);
}
