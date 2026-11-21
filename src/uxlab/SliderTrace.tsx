import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {coverBoard, findMainBoard, recoverBoards, type UxBoard} from './board';
import {format} from './LiveProse';
import './uxlab.css';

const SAMPLES = 25;
const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});
const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

/** Every "label = number" the scene shows: texts on the board and the inspector's readouts. */
export function readouts(board: UxBoard): Map<string, number> {
    const texts: string[] = [];
    for (const element of board.objectsList) {
        if (element.elType !== 'text' || !element.rendNode || element.visPropCalc?.visible === false) continue;
        texts.push(element.rendNode.textContent ?? '');
    }
    document.querySelectorAll('#workspace-inspector li, #workspace-inspector p, #workspace-inspector dd, #workspace-inspector td').forEach(node => texts.push(node.textContent ?? ''));
    const found = new Map<string, number>();
    const pattern = /([^=;\n]{1,48}?)\s*=\s*([−-]?)\s*(\d+(?:,\d+)?)/g;
    for (const text of texts) {
        for (const match of text.replace(/ /g, ' ').matchAll(pattern)) {
            const label = match[1].split(/,\s|\s·\s|:\s/).pop()!.replace(/\s+/g, ' ').trim();
            if (!label || label.length > 34 || /^\d/.test(label)) continue;
            const value = Number(match[3].replace(',', '.')) * (match[2] ? -1 : 1);
            if (Number.isFinite(value) && !found.has(label)) found.set(label, value);
        }
    }
    return found;
}

interface Trace {
    input: HTMLInputElement;
    host: HTMLElement;
    name: string;
    values: number[];
    series: {label: string; values: (number | undefined)[]}[];
    selected: number;
    phase: 'predict' | 'shown';
    guess?: number;
}

/** How far a series is from a straight line (0 = a line): the interesting ones bend. */
function bend(values: readonly (number | undefined)[]): number {
    const points = values.map((value, index) => [index, value] as const).filter((point): point is readonly [number, number] => point[1] !== undefined);
    if (points.length < 3) return -1;
    const ys = points.map(point => point[1]);
    const range = Math.max(...ys) - Math.min(...ys);
    if (range < 1e-9) return -1;
    const n = points.length, mx = points.reduce((s, p) => s + p[0], 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
    const sxy = points.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0), sxx = points.reduce((s, p) => s + (p[0] - mx) ** 2, 0), syy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
    return 1 - (sxy * sxy) / (sxx * syy || 1);
}

function extreme(series: readonly (number | undefined)[]): {index: number; kind: 'min' | 'max'} {
    const defined = series.map((value, index) => ({value, index})).filter((item): item is {value: number; index: number} => item.value !== undefined);
    const lowest = defined.reduce((best, item) => item.value < best.value ? item : best, defined[0]);
    const highest = defined.reduce((best, item) => item.value > best.value ? item : best, defined[0]);
    // Inside the stretch where the readout exists (it may vanish at the ends, e.g. σ at p = 0).
    const first = defined[0].index, last = defined[defined.length - 1].index;
    const inside = (index: number) => index > first && index < last;
    if (inside(lowest.index) || !inside(highest.index)) return {index: lowest.index, kind: 'min'};
    return {index: highest.index, kind: 'max'};
}

/**
 * Lane B b16: a trace on the slider. Any slider can paint, under its own track, how a readout of the scene (an error, an
 * angle, a probability) depends on it over the whole range. First the learner taps where they expect the extreme; then
 * the curve is revealed with their guess on it. Hover the trace to read it, tap to jump the slider there.
 */
export function SliderTrace(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [hosts, setHosts] = useState<HTMLElement[]>([]);
    const [trace, setTrace] = useState<Trace>();
    const [busy, setBusy] = useState<HTMLElement>();
    const [hover, setHover] = useState<number>();
    const [now, setNow] = useState(0);
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
            const fields = [...document.querySelectorAll<HTMLElement>('#workspace-inspector .slider-field')].filter(field => {
                const input = field.querySelector<HTMLInputElement>('input[type=range]');
                return input && !input.disabled && field.offsetParent !== null && !/velikost elementov/i.test(field.textContent ?? '');
            });
            setHosts(current => current.length === fields.length && current.every((field, index) => field === fields[index]) ? current : fields);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    // The current value marker follows the slider, whoever moves it.
    useEffect(() => {
        if (!trace) return;
        let frame = 0;
        const loop = () => { setNow(Number(trace.input.value)); frame = requestAnimationFrame(loop); };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [trace]);

    const compute = async (host: HTMLElement) => {
        if (!board || busy) return;
        const input = host.querySelector<HTMLInputElement>('input[type=range]');
        if (!input) return;
        let base: LessonSceneCheckpoint;
        try { base = caps.current.captureState(); } catch { return; }
        setBusy(host);
        setTrace(undefined);
        const cover = coverBoard(board.containerObj);
        const min = Number(input.min), max = Number(input.max), step = Number(input.step) || 0;
        const values = Array.from({length: SAMPLES}, (_, index) => {
            const raw = min + (max - min) * index / (SAMPLES - 1);
            return step ? Math.min(max, Math.round((raw - min) / step) * step + min) : raw;
        });
        const rows: Map<string, number>[] = [];
        const stateKey = () => { try { return JSON.stringify(caps.current.captureState().value); } catch { return ''; } };
        let previous = stateKey(), previousValue = Number(input.value);
        for (const value of values) {
            try {
                valueSetter?.call(input, String(value));
                input.dispatchEvent(new Event('input', {bubbles: true}));
                input.dispatchEvent(new Event('change', {bubbles: true}));
                await nextFrames(2);
                recoverBoards();
                // A value the scene refuses (p = 0 in a binomial) leaves the state as it was: its readouts are stale.
                const key = stateKey();
                const refused = key !== '' && key === previous && Math.abs(value - previousValue) > 1e-12;
                rows.push(refused ? new Map() : readouts(board));
                if (!refused) { previous = key; previousValue = value; }
            } catch { recoverBoards(); rows.push(new Map()); }
        }
        try { caps.current.restoreState(base); } catch { recoverBoards(); }
        await nextFrames(2);
        recoverBoards();
        cover.remove();
        setBusy(undefined);
        const labels = new Set(rows.flatMap(row => [...row.keys()]));
        const series = [...labels].map(label => ({label, values: rows.map(row => row.get(label))}))
            // Not the slider's own value under another name, not a constant.
            .filter(item => item.values.filter(value => value !== undefined).length >= SAMPLES * 0.6)
            .filter(item => !item.values.every((value, index) => value === undefined || Math.abs(value - values[index]) < 1e-6 * Math.max(1, Math.abs(values[index]))))
            .map(item => ({...item, score: bend(item.values)}))
            .filter(item => item.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        const name = (input.labels?.[0]?.textContent ?? '').replace(/,\s*vrednost.*$/i, '').trim();
        if (series.length === 0) { setTrace({input, host, name, values, series: [], selected: 0, phase: 'shown'}); return; }
        (window as unknown as {__uxTrace?: unknown}).__uxTrace = {values, series};
        setTrace({input, host, name, values, series, selected: 0, phase: 'predict'});
    };

    if (!board || props.locked) return null;
    const portals = hosts.map(host => {
        const open = trace?.host === host;
        const button = <button type="button" className={`ux-trace-button ${open ? 'is-open' : ''}`} aria-label="Sled na drsniku" title="Pokaži, kako se odčitki spreminjajo vzdolž drsnika"
            disabled={busy !== undefined} onClick={() => open ? setTrace(undefined) : void compute(host)}>
            {busy === host ? '…' : <svg viewBox="0 0 24 14" width="22" height="13" aria-hidden="true"><path d="M1 11 C5 11 6 2 10 2 S15 12 18 9 21 4 23 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
        </button>;
        const label = host.querySelector<HTMLElement>('.slider-label') ?? host;
        return <React.Fragment key={`trace-${hosts.indexOf(host)}`}>
            {createPortal(button, label)}
            {open && trace && createPortal(<TraceView trace={trace} now={now} hover={hover} setHover={setHover} setTrace={setTrace}/>, host)}
        </React.Fragment>;
    });
    return <>{portals}</>;
}

function TraceView(props: {trace: Trace; now: number; hover?: number; setHover: (index?: number) => void; setTrace: (trace?: Trace) => void}) {
    const {trace} = props;
    const input = trace.input;
    const box = useRef<HTMLDivElement>(null);
    // The trace opens under the slider, often below the fold of the inspector: bring it into view once.
    useEffect(() => { box.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }, [trace.host, trace.series.length]);
    const width = input.offsetWidth || 200, height = 46, pad = 8;
    const left = Math.max(0, input.getBoundingClientRect().left - trace.host.getBoundingClientRect().left);
    if (trace.series.length === 0) return <div ref={box} className="ux-trace" style={{marginLeft: left, width}}><p className="ux-trace-note">Noben odčitek na grafu ali v inšpektorju se ob tem drsniku ne spremeni.</p></div>;
    const series = trace.series[trace.selected];
    const min = trace.values[0], max = trace.values[trace.values.length - 1];
    const xOf = (value: number) => pad + (width - 2 * pad) * (value - min) / (max - min || 1);
    const defined = series.values.filter((value): value is number => value !== undefined);
    const low = Math.min(...defined), high = Math.max(...defined);
    const yOf = (value: number) => height - 6 - (height - 14) * (value - low) / (high - low || 1);
    let path = '';
    series.values.forEach((value, index) => {
        if (value === undefined) return;
        path += `${path && series.values[index - 1] !== undefined ? 'L' : 'M'}${xOf(trace.values[index]).toFixed(1)} ${yOf(value).toFixed(1)}`;
    });
    const target = extreme(series.values);
    const word = target.kind === 'min' ? 'najmanjšo' : 'največjo';
    const indexAt = (clientX: number, element: Element) => {
        const rect = element.getBoundingClientRect();
        const value = min + (max - min) * Math.min(1, Math.max(0, (clientX - rect.left - pad) / (rect.width - 2 * pad)));
        let best = 0;
        trace.values.forEach((sample, index) => { if (Math.abs(sample - value) < Math.abs(trace.values[best] - value)) best = index; });
        return best;
    };
    const jump = (index: number) => {
        valueSetter?.call(input, String(trace.values[index]));
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.dispatchEvent(new Event('change', {bubbles: true}));
    };
    const shown = trace.phase === 'shown';
    const hoverIndex = props.hover;
    const guessText = trace.guess !== undefined ? ` · tvoja napoved ${format(trace.values[trace.guess])}` : '';
    return <div ref={box} className="ux-trace" style={{marginLeft: left, width}}>
        {trace.series.length > 1 && <div className="ux-trace-chips">{trace.series.map((item, index) =>
            <button key={item.label} type="button" aria-pressed={index === trace.selected} onClick={() => props.setTrace({...trace, selected: index, phase: 'predict', guess: undefined})}>{item.label}</button>)}</div>}
        <svg className={`ux-trace-plot ${shown ? '' : 'is-hidden'}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height}
            onPointerMove={event => props.setHover(indexAt(event.clientX, event.currentTarget))}
            onPointerLeave={() => props.setHover(undefined)}
            onClick={event => {
                const index = indexAt(event.clientX, event.currentTarget);
                if (!shown) { props.setTrace({...trace, phase: 'shown', guess: index}); return; }
                jump(index);
            }}>
            <rect x="0.5" y="0.5" width={width - 1} height={height - 1} rx="6" className="ux-trace-frame"/>
            {shown && <path d={path} className="ux-trace-line"/>}
            {shown && <circle cx={xOf(trace.values[target.index])} cy={yOf(series.values[target.index]!)} r="4.5" className="ux-trace-extreme"/>}
            {trace.guess !== undefined && <path d={`M${xOf(trace.values[trace.guess])} ${height - 2} l-5 -8 h10 z`} className="ux-trace-guess"/>}
            <line x1={xOf(props.now)} x2={xOf(props.now)} y1="3" y2={height - 3} className="ux-trace-now"/>
            {shown && hoverIndex !== undefined && series.values[hoverIndex] !== undefined && <circle cx={xOf(trace.values[hoverIndex])} cy={yOf(series.values[hoverIndex]!)} r="3.5" className="ux-trace-hover"/>}
            {!shown && <text x={width / 2} y={height / 2 + 4} textAnchor="middle" className="ux-trace-ask">Kje doseže {word} vrednost? Tapni.</text>}
        </svg>
        <p className="ux-trace-note">
            {shown && hoverIndex !== undefined && series.values[hoverIndex] !== undefined
                ? `${series.label} = ${format(series.values[hoverIndex]!)} pri ${format(trace.values[hoverIndex])} · tapni in drsnik skoči tja`
                : shown ? `${series.label}: ${word} vrednost doseže pri ${format(trace.values[target.index])}${guessText}`
                : <>Napovej, nato poglej. <button type="button" className="ux-trace-skip" onClick={() => props.setTrace({...trace, phase: 'shown'})}>Pokaži takoj</button></>}
        </p>
    </div>;
}
