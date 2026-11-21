import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {getParam, observeParamChanges, probing, splitLabel, type ParamEntry} from './paramRegistry';
import {drawn, meaningful} from './YourTurn';
import {settle, svgRootOf} from './family';
import {uxEnabled} from './flags';
import './FixedPoints.css';

/**
 * a27 — What stays put. When a parameter settles, Bezeg draws a fan of the curve's neighbours (the parameter a little
 * smaller and a little larger) and pins the points every one of them passes through: the vertex a stretch turns around,
 * the point (0; n) a slope rotates the line about, the origin sin(bx) never leaves. One sentence names it ("ko spreminjaš
 * a, graf ostane pripet v (3; 1)") or says there is none ("c premakne ves graf, nobena točka ne ostane na mestu"), which
 * is the difference between a shift and a stretch, seen rather than told. Generic: the fan is the board itself set to
 * neighbouring values for a moment (settle and restore), fixed points are crossings common to every neighbour.
 */

type Pt = [number, number];
interface Fan { symbol: string; paths: {d: string; offset: number}[]; pins: {sx: number; sy: number; text: string}[]; sentence: React.ReactNode; box: {left: number; top: number; width: number; height: number} }
type Units = {unitX: number; unitY: number; origin: {scrCoords: number[]}};

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);
const isCurve = (object: {elType?: string}) => object.elType === 'curve' || object.elType === 'functiongraph';

/**
 * The curve as screen polylines from JSXGraph's own plotted points (exact, and cheap even when the curve runs far off
 * the board), split where it leaves the board or breaks, and densified to about 2 px.
 */
function polylines(object: unknown, W: number, H: number): Pt[][] {
    const points = (object as {points?: {scrCoords: number[]}[]}).points ?? [];
    const runs: Pt[][] = [];
    let run: Pt[] = [];
    const inside = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && x > -2 && y > -2 && x < W + 2 && y < H + 2;
    let last: Pt | undefined;
    for (const point of points) {
        const [, x, y] = point.scrCoords;
        if (!inside(x, y)) { if (run.length > 1) runs.push(run); run = []; last = undefined; continue; }
        if (last) {
            const steps = Math.min(200, Math.floor(Math.hypot(x - last[0], y - last[1]) / 2));
            for (let k = 1; k <= steps; k++) run.push([last[0] + (x - last[0]) * k / (steps + 1), last[1] + (y - last[1]) * k / (steps + 1)]);
        }
        run.push([x, y]);
        last = [x, y];
    }
    if (run.length > 1) runs.push(run);
    const total = runs.reduce((n, r) => n + r.length, 0);
    const keep = Math.max(1, Math.ceil(total / 900));
    return keep === 1 ? runs : runs.map(r => r.filter((_p, i) => i % keep === 0 || i === r.length - 1));
}

/** Distance from a point to a polyline set. */
function distance(p: Pt, lines: Pt[][]): number {
    let best = Infinity;
    for (const run of lines) for (let i = 1; i < run.length; i++) {
        const [x1, y1] = run[i - 1], [x2, y2] = run[i];
        const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / l2)) : 0;
        const d = Math.hypot(p[0] - x1 - t * dx, p[1] - y1 - t * dy);
        if (d < best) best = d;
    }
    return best;
}

/**
 * Points of the curve that every neighbour passes through, crossing or only touching (a stretch's vertex): local minima of
 * the largest distance to a neighbour that are nearly zero and from which the curves clearly part on both sides. A shared
 * tail (every exponential flattens onto the x axis) or a stretch the parameter does not move has no such rise.
 */
function common(own: Pt[][], neighbours: Pt[][][]): Pt[] {
    const out: Pt[] = [];
    const W = 80;
    for (const run of own) {
        const D = run.map(p => Math.max(...neighbours.map(lines => distance(p, lines))));
        const arc = [0];
        for (let i = 1; i < run.length; i++) arc.push(arc[i - 1] + Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]));
        for (let i = 1; i < run.length - 1; i++) {
            if (D[i] >= 1.2 || D[i] > D[i - 1] || D[i] > D[i + 1]) continue;
            let left = 0, right = 0;
            // Near the ends of a run the neighbours may simply end elsewhere; that is not the curves parting.
            for (let j = Math.max(0, i - W); j < i; j++) if (arc[j] > 60) left = Math.max(left, D[j]);
            for (let j = i + 1; j <= Math.min(run.length - 1, i + W); j++) if (arc[run.length - 1] - arc[j] > 60) right = Math.max(right, D[j]);
            if (left - D[i] >= 1.5 && right - D[i] >= 1.5) out.push(run[i]);
        }
    }
    return out;
}
const near = (list: Pt[], p: Pt, r: number) => list.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) <= r);

async function analyse(b: Board, entry: ParamEntry): Promise<Omit<Fan, 'box'> | undefined> {
    const svg = svgRootOf(b);
    if (!svg) return undefined;
    const W = svg.clientWidth, H = svg.clientHeight;
    const v0 = entry.value, span = entry.max - entry.min;
    const delta = Math.max(entry.step, span * 0.06);
    const offsets = [-2, -1, 1, 2].filter(k => entry.cyclic !== undefined || v0 + k * delta >= entry.min - 1e-9 && v0 + k * delta <= entry.max + 1e-9);
    if (offsets.length < 2) return undefined;
    // Step outlines (histograms) are walls and corners, not curves with points of their own.
    const steppy = (lines: Pt[][]) => {
        const all = lines.flat();
        const walls = lines.reduce((n, r) => n + r.slice(1).filter((p, i) => Math.abs(p[0] - r[i][0]) < 0.05 && Math.abs(p[1] - r[i][1]) > 0.2).length, 0);
        return all.length > 0 && walls / all.length > 0.15;
    };
    const curves = drawn(b).filter(isCurve).filter(object => !steppy(polylines(object, W, H)));
    const shape = (id: string) => (svg.querySelector(`[id="${CSS.escape(id)}"]`) as SVGGeometryElement | null);
    const base = new Map(curves.map(object => [object.id, {d: object.rendNode!.getAttribute('d') ?? '', lines: polylines(object, W, H)}]));
    const neighbours: {offset: number; shapes: Map<string, {d: string; lines: Pt[][]}>}[] = [];
    try {
        for (const k of offsets) {
            let value = v0 + k * delta;
            if (entry.cyclic !== undefined) value = ((value - entry.min) % span + span) % span + entry.min;
            await settle(b, [entry.key], [value]);
            const shapes = new Map<string, {d: string; lines: Pt[][]}>();
            for (const object of curves) {
                const node = shape(object.rendNode!.id);
                const d = node?.getAttribute('d') ?? '';
                if (node && d !== base.get(object.id)?.d) shapes.set(object.id, {d, lines: polylines(object, W, H)});
            }
            neighbours.push({offset: k, shapes});
        }
    } finally { await settle(b, [entry.key], [v0]); }
    const moved = curves.filter(object => neighbours.some(n => n.shapes.has(object.id)) && (base.get(object.id)?.lines.length ?? 0) > 0);
    if (!moved.length) return undefined;
    const u = b as unknown as Units;
    const [, ox, oy] = u.origin.scrCoords;
    const decimals = (unit: number) => unit >= 400 ? 3 : unit >= 90 ? 2 : 1;
    const fmt = (value: number, unit: number) => {
        const nice = Math.round(value * 10) / 10;
        const v = Math.abs(value - nice) * unit < 2 ? nice : Number(value.toFixed(decimals(unit)));
        return (Object.is(v, -0) ? 0 : v).toLocaleString('sl-SI', {maximumFractionDigits: 3}).replace('-', '−');
    };
    const pins: Fan['pins'] = [];
    for (const object of moved) {
        const own = base.get(object.id)!.lines;
        const others = neighbours.filter(n => n.shapes.has(object.id)).map(n => n.shapes.get(object.id)!.lines);
        if (others.length < 2) continue;
        for (const p of common(own, others)) {
            if (near(pins.map(q => [q.sx, q.sy] as Pt), p, 10)) continue;
            if (p[0] < 4 || p[1] < 4 || p[0] > W - 4 || p[1] > H - 4) continue;
            pins.push({sx: p[0], sy: p[1], text: `(${fmt((p[0] - ox) / u.unitX, u.unitX)}; ${fmt((oy - p[1]) / u.unitY, u.unitY)})`});
        }
    }
    const symbol = <i>{symbolOf(entry)}</i>;
    const sentence = pins.length === 0
        ? <>{symbol} premakne ves graf — nobena točka ne ostane na mestu</>
        : pins.length <= 3
            ? <>ko spreminjaš {symbol}, graf ostane pripet v {pins.map(p => p.text).join(' in ')}</>
            : <>ko spreminjaš {symbol}, gre graf vedno skozi {pins.length} istih točk</>;
    const paths = neighbours.flatMap(n => [...n.shapes.values()].map(s => ({d: s.d, offset: n.offset})));
    return {symbol: symbolOf(entry), paths, pins: pins.slice(0, 8), sentence};
}

/**
 * a28 — Predict what stays put (a27's machinery). The first time a parameter settles, the fan is held back and the
 * learner is asked first: tap where the graph stays pinned, or say that no point does. Then the fan opens over the guess.
 */
type Guess = {sx: number; sy: number} | 'none';

export function FixedPoints(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [fan, setFan] = useState<Fan>();
    const [ask, setAsk] = useState<Fan>();
    const [guess, setGuess] = useState<Guess>();
    const busy = useRef(false);
    const asked = useRef(new Set<string>());
    const predict = uxEnabled('a28');

    useEffect(() => {
        // Some pages answer a value with effects of their own after the probe has restored it; those echoes are not the
        // learner's changes and must not start another analysis.
        let timer = 0, key = '', quietUntil = 0;
        const run = async () => {
            const entry = getParam(key);
            const b = findBoard(props.frame.current);
            const svg = b && svgRootOf(b);
            if (!entry || !b || !svg || !meaningful(entry)) return;
            if (busy.current) { timer = window.setTimeout(() => void run(), 300); return; }
            busy.current = true;
            try {
                const result = await analyse(b, entry);
                const frame = props.frame.current!.getBoundingClientRect(), box = svg.getBoundingClientRect();
                const next = result && {...result, box: {left: box.left - frame.left, top: box.top - frame.top, width: box.width, height: box.height}};
                if (next && predict && !asked.current.has(entry.key)) { asked.current.add(entry.key); setGuess(undefined); setAsk(next); setFan(undefined); }
                else setFan(next);
            } finally { busy.current = false; quietUntil = performance.now() + 500; }
        };
        const stop = observeParamChanges((_previous, next) => {
            if (probing() || !meaningful(next) || busy.current || performance.now() < quietUntil) return;
            key = next.key;
            setFan(undefined); setAsk(undefined); setGuess(undefined);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => void run(), 650);
        });
        return () => { stop(); window.clearTimeout(timer); };
    }, [props.frame, predict]);

    const answer = (value: Guess) => {
        (window as unknown as {__uxConsumed?: number}).__uxConsumed = performance.now();
        setGuess(value); setFan(ask); setAsk(undefined);
    };

    if (ask) return <>
        <div className="ux-fixed-catch" style={ask.box} aria-hidden="true" onClick={event => event.stopPropagation()} onPointerDown={event => {
            event.preventDefault(); event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            answer({sx: event.clientX - rect.left, sy: event.clientY - rect.top});
        }}/>
        <div className="ux-fixed-sentence is-ask" role="status">
            <span className="ux-fixed-icon is-ask" aria-hidden="true"/>
            <span className="ux-fixed-text">Napovej: kje ostane graf pripet, ko spreminjaš <i>{ask.symbol}</i>? Tapni točko na grafu.</span>
            <button type="button" onClick={() => answer('none')}>nobena točka</button>
        </div>
    </>;

    if (!fan) return null;
    let verdict: React.ReactNode, right = false;
    if (guess !== undefined) {
        const where = fan.pins.map(p => p.text).join(' in ');
        right = guess === 'none' ? fan.pins.length === 0 : fan.pins.some(p => Math.hypot(p.sx - guess.sx, p.sy - guess.sy) <= 28);
        verdict = fan.pins.length === 0
            ? <>{right ? 'Prav' : 'Ne'}: <i>{fan.symbol}</i> premakne ves graf, nobena točka ne ostane na mestu.</>
            : right ? <>Zadeto! Graf ostane pripet v {where}.</> : <>Ne čisto: graf ostane pripet v {where}.</>;
    }
    return <>
        <svg className="ux-fixed-fan" aria-hidden="true" style={fan.box} width={fan.box.width} height={fan.box.height}>
            {fan.paths.map((path, i) => <path key={i} d={path.d} className={`ux-fixed-path ${path.offset < 0 ? 'is-less' : 'is-more'}`} style={{opacity: Math.abs(path.offset) === 1 ? 0.75 : 0.4}}/>)}
            {fan.pins.map((pin, i) => <g key={i} className="ux-fixed-pin" transform={`translate(${pin.sx} ${pin.sy})`}>
                <circle r="11" className="ux-fixed-halo"/>
                <circle r="5"/>
                <text x="12" y="-12">{pin.text}</text>
            </g>)}
            {guess && guess !== 'none' && <g className={`ux-fixed-guess${right ? ' is-right' : ''}`} transform={`translate(${guess.sx} ${guess.sy})`}>
                <path d="M -7 -7 L 7 7 M -7 7 L 7 -7"/>
                <text x="10" y="20">tvoja napoved</text>
            </g>}
        </svg>
        <div className={`ux-fixed-sentence${guess === undefined ? '' : right ? ' is-right' : ' is-wrong'}`} role="status">
            <span className={fan.pins.length ? 'ux-fixed-icon' : 'ux-fixed-icon is-none'} aria-hidden="true"/><span className="ux-fixed-text">{verdict ?? fan.sentence}</span>
            <small><b className="is-less"/>manjši <b className="is-more"/>večji</small>
        </div>
    </>;
}
