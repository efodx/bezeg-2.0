import React, {useEffect, useLayoutEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {getParam, observeParamChanges, probing, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {meaningful} from './YourTurn';
import './Explored.css';

/**
 * a22 — Explored ground. Every slider track remembers where the graph has been: a band grows under the thumb as the
 * learner (or the lesson) moves it, so the parts of a parameter nobody has tried stay visibly bare. When a big stretch
 * stays bare, the slider says so in plain words, "poskusi še negativne a" first, because the sign of a parameter is where
 * most surprises live (mirror images, opening downwards, turning the other way), and a tap takes the graph there.
 * Generic: every `Slider` publishes its moves to the shared registry; prototype probes are marked and do not count.
 */

type Interval = [number, number];
const INSET = 9;

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);

function addInterval(list: Interval[], low: number, high: number): Interval[] {
    const all = [...list, [Math.min(low, high), Math.max(low, high)] as Interval].sort((p, q) => p[0] - q[0]);
    const out: Interval[] = [];
    for (const item of all) {
        const last = out[out.length - 1];
        if (last && item[0] <= last[1] + 1e-9) last[1] = Math.max(last[1], item[1]);
        else out.push([item[0], item[1]]);
    }
    return out;
}

interface Hint { text: React.ReactNode; low: number; high: number; target: number }

function hintFor(entry: ParamEntry, visited: Interval[]): Hint | undefined {
    const span = entry.max - entry.min;
    const covered = visited.reduce((n, [a, b]) => n + b - a, 0);
    if (covered < span * 0.04 || entry.cyclic !== undefined && covered > span * 0.7) return undefined;
    const symbol = <i>{symbolOf(entry)}</i>;
    const low = visited[0][0], high = visited[visited.length - 1][1];
    // The other sign first: negative a mirrors, negative b flips, negative c shifts the other way.
    if (entry.min < -entry.step && entry.max > entry.step) {
        if (low >= 0 && -entry.min > span * 0.2) return {text: <>poskusi še negativne {symbol}</>, low: entry.min, high: 0, target: Math.max(entry.min, -Math.max(Math.abs(high), entry.step * 10, span * 0.1))};
        if (high <= 0 && entry.max > span * 0.2) return {text: <>poskusi še pozitivne {symbol}</>, low: 0, high: entry.max, target: Math.min(entry.max, Math.max(Math.abs(low), entry.step * 10, span * 0.1))};
    }
    // Otherwise the largest bare stretch, if it is a good part of the range.
    const gaps: Interval[] = [];
    let at = entry.min;
    for (const [a, b] of visited) { if (a > at) gaps.push([at, a]); at = Math.max(at, b); }
    if (at < entry.max) gaps.push([at, entry.max]);
    const gap = gaps.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0];
    if (!gap || gap[1] - gap[0] < span * 0.3 || covered > span * 0.5) return undefined;
    const f = (value: number) => entry.format(Number(value.toPrecision(4)));
    const text = gap[0] <= entry.min + 1e-9 ? <>poskusi še {symbol} &lt; {f(gap[1])}</> : gap[1] >= entry.max - 1e-9 ? <>poskusi še {symbol} &gt; {f(gap[0])}</> : <>poskusi še {symbol} med {f(gap[0])} in {f(gap[1])}</>;
    const middle = (gap[0] + gap[1]) / 2;
    return {text, low: gap[0], high: gap[1], target: Math.round((middle - entry.min) / entry.step) * entry.step + entry.min};
}

export function Explored() {
    const params = useParams();
    const [visited, setVisited] = useState<Record<string, Interval[]>>({});
    const [, setTick] = useState(0);

    useEffect(() => observeParamChanges((previous, next) => {
        if (probing()) return;
        // Dragging and arrow keys sweep through the values between; a jump (a click on the track, a lesson cut) only
        // visits where it lands, so the stretch it skipped stays bare.
        const jump = Math.abs(next.value - previous.value) > (next.max - next.min) * 0.15 && next.cyclic === undefined;
        setVisited(current => {
            const list = current[next.key] ?? [[previous.value, previous.value] as Interval];
            return {...current, [next.key]: jump ? addInterval(list, next.value, next.value) : addInterval(list, previous.value, next.value)};
        });
    }), []);
    // Track geometry follows layout (inspector width, tabs): re-measure on resize.
    useLayoutEffect(() => {
        const again = () => setTick(n => n + 1);
        window.addEventListener('resize', again);
        return () => window.removeEventListener('resize', again);
    }, []);

    return <>{params.filter(entry => meaningful(entry)).map(entry => {
        const input = document.getElementById(entry.key) as HTMLInputElement | null;
        const track = input?.parentElement;
        if (!input || !track || !input.offsetWidth) return null;
        const list = visited[entry.key] ?? [[entry.value, entry.value]];
        const span = entry.max - entry.min;
        const width = input.offsetWidth - 2 * INSET;
        const x = (value: number) => input.offsetLeft + INSET + (value - entry.min) / span * width;
        const top = input.offsetTop + input.offsetHeight / 2;
        const hint = visited[entry.key] && entry.unavailable === undefined && !entry.inert ? hintFor(entry, list) : undefined;
        return createPortal(<>
            <span className="ux-explored" aria-hidden="true" style={{top}}>
                {list.map(([a, b], i) => <span key={i} className="ux-explored-band" style={{left: x(a) - 3, width: Math.max(6, x(b) - x(a) + 6)}}/>)}
                {hint && <span className="ux-explored-gap" style={{left: x(hint.low), width: Math.max(4, x(hint.high) - x(hint.low))}}/>}
            </span>
            {hint && <button type="button" className="ux-explored-hint" style={{left: Math.max(0, Math.min(track.clientWidth - 200, x((hint.low + hint.high) / 2) - 90))}}
                onClick={() => getParam(entry.key)?.set(hint.target)}>{hint.text} →</button>}
        </>, track, entry.key);
    })}</>;
}
