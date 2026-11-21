import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {getParam, observeParamChanges, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {drawn, meaningful} from './YourTurn';
import {settle, svgRootOf} from './family';
import {uxEnabled} from './flags';
import './FamilySpace.css';

/**
 * a21 — The family in space. One button turns the chosen parameter into a third axis: Bezeg draws the graph at two
 * dozen values of it, stacks the pictures one behind another and tilts the stack, so the whole family of curves becomes
 * a landscape — the surface y = f(x; p) — with today's graph as an amber slice through it. Drag to turn the landscape,
 * move the slider and the slice travels through it; flatten it again and all the curves fall back onto one board (the
 * ghost-trail view). Students see at once what a parameter does everywhere, not just at the value they are on.
 * Generic: the curves are sampled from the board's own SVG while the parameter is set synchronously through the shared
 * slider registry (restored before paint), so every graph with a slider works without lesson code.
 */

type Vec = [number, number];
interface Slice { value: number; lines: Vec[][]; dots: Vec[]; still?: Vec[][] }
interface Space { key: string; slices: Slice[]; width: number; height: number; low: number; high: number; moving: Set<string> }

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);
const isPoint = (object: {elType?: string}) => object.elType === 'point' || object.elType === 'glider';
const COUNT = 25;

function sampleShape(node: SVGGeometryElement, width: number, height: number): Vec[][] {
    let length = 0;
    try { length = node.getTotalLength(); } catch { return []; }
    if (!(length > 4)) return [];
    const count = Math.max(12, Math.min(140, Math.round(length / 6)));
    const spacing = length / count;
    const out: Vec[][] = [];
    let run: Vec[] = [];
    let last: Vec | undefined;
    for (let i = 0; i <= count; i++) {
        const p = node.getPointAtLength(length * i / count);
        const inside = p.x > -1 && p.y > -1 && p.x < width + 1 && p.y < height + 1;
        const jump = last && Math.hypot(p.x - last[0], p.y - last[1]) > spacing * 4 + 2;
        if (!inside || jump) { if (run.length > 1) out.push(run); run = []; }
        if (inside) run.push([p.x, p.y]);
        last = [p.x, p.y];
    }
    if (run.length > 1) out.push(run);
    return out;
}

function picture(b: Board, width: number, height: number): {lines: Map<string, Vec[][]>; dots: Map<string, Vec>} {
    const lines = new Map<string, Vec[][]>(), dots = new Map<string, Vec>();
    for (const object of drawn(b)) {
        const node = object.rendNode!;
        if (isPoint(object)) {
            const x = Number(node.getAttribute('cx')), y = Number(node.getAttribute('cy'));
            if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= width && y <= height) dots.set(object.id, [x, y]);
        } else if (node instanceof SVGGeometryElement && node.getAttribute('display') !== 'none') {
            lines.set(object.id, sampleShape(node, width, height));
        }
    }
    return {lines, dots};
}

const key0 = (runs: Vec[][]) => runs.map(run => run.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')).join('|');

async function scan(b: Board, entry: ParamEntry, width: number, height: number): Promise<Space> {
    const span = entry.max - entry.min;
    const start = entry.value;
    let half = entry.cyclic !== undefined ? span / 2 : span * 0.2;
    let best: Space | undefined;
    try {
        for (let attempt = 0; attempt < 4; attempt++) {
            let values: number[];
            if (entry.cyclic !== undefined) values = Array.from({length: COUNT}, (_, i) => entry.min + span * i / (COUNT - 1));
            else {
                let low = Math.max(entry.min, start - half), high = Math.min(entry.max, low + 2 * half);
                low = Math.max(entry.min, high - 2 * half);
                values = Array.from({length: COUNT}, (_, i) => low + (high - low) * i / (COUNT - 1));
            }
            const pictures = [];
            for (const value of values) { await settle(b, [entry.key], [value]); pictures.push(picture(b, width, height)); }
            // Only what the parameter moves goes into the landscape; the still parts stay on the slice plane.
            const ids = new Set<string>();
            for (const [id, runs] of pictures[0].lines) if (pictures.some(p => key0(p.lines.get(id) ?? []) !== key0(runs))) ids.add(id);
            const dotIds = new Set<string>();
            for (const [id, p0] of pictures[0].dots) if (pictures.some(p => { const q = p.dots.get(id); return !q || Math.hypot(q[0] - p0[0], q[1] - p0[1]) > 0.5; })) dotIds.add(id);
            const slices = values.map((value, i) => ({value,
                lines: [...pictures[i].lines].filter(([id]) => ids.has(id)).flatMap(([, runs]) => runs),
                dots: [...pictures[i].dots].filter(([id]) => dotIds.has(id)).map(([, p]) => p)}));
            const visible = slices.filter(slice => slice.lines.reduce((n, run) => n + run.length, 0) + slice.dots.length * 6 >= 6).length;
            best = {key: entry.key, slices, width, height, low: values[0], high: values[values.length - 1], moving: new Set([...ids, ...dotIds])};
            // Wide ranges (c from −20 to 20) push most pictures off the board: narrow the window until most show something.
            if (entry.cyclic !== undefined || visible >= COUNT * 0.8 || half <= entry.step * 6) break;
            half /= 2;
        }
    } finally {
        await settle(b, [entry.key], [start]);
    }
    return best!;
}

interface View { yaw: number; pitch: number }

export function FamilySpace(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const usable = params.filter(entry => meaningful(entry) && entry.unavailable === undefined);
    const [phase, setPhase] = useState<'idle' | 'scanning' | 'open'>('idle');
    const [space, setSpace] = useState<Space>();
    const [view, setView] = useState<View>({yaw: 0, pitch: 0});
    const [box, setBox] = useState<{width: number; height: number; left: number; top: number}>();
    const [live, setLive] = useState<Slice>();
    const [chosen, setChosen] = useState<string>();
    const recent = useRef<string[]>([]);
    const drag = useRef<{x: number; y: number; view: View}>();
    const animation = useRef(0);

    useEffect(() => observeParamChanges(previous => {
        recent.current = [previous.key, ...recent.current.filter(key => key !== previous.key)].slice(0, 6);
    }), []);

    const glide = useCallback((to: View, done?: () => void) => {
        cancelAnimationFrame(animation.current);
        const from = {...viewRef.current};
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / 950);
            const e = 1 - (1 - t) ** 3;
            setView({yaw: from.yaw + (to.yaw - from.yaw) * e, pitch: from.pitch + (to.pitch - from.pitch) * e});
            if (t < 1) animation.current = requestAnimationFrame(step); else done?.();
        };
        animation.current = requestAnimationFrame(step);
    }, []);
    const viewRef = useRef(view);
    viewRef.current = view;

    const build = useCallback(async (key: string, keepView: boolean) => {
        const b = findBoard(props.frame.current);
        const svg = b && svgRootOf(b);
        const entry = getParam(key);
        if (!b || !svg || !meaningful(entry)) return;
        setPhase('scanning');
        const frame = props.frame.current!.getBoundingClientRect(), rect = svg.getBoundingClientRect();
        setBox({width: rect.width, height: rect.height, left: rect.left - frame.left, top: rect.top - frame.top});
        const result = await scan(b, entry, svg.clientWidth, svg.clientHeight);
        setSpace(result);
        setChosen(key);
        setPhase('open');
        if (!keepView) { setView({yaw: 0, pitch: 0}); window.setTimeout(() => glide({yaw: -38, pitch: 24}), 60); }
    }, [props.frame, glide]);

    const open = () => {
        const keys = [...recent.current.filter(key => usable.some(entry => entry.key === key)), ...usable.map(entry => entry.key)];
        if (keys[0]) void build(keys[0], false);
    };
    const close = () => glide({yaw: 0, pitch: 0}, () => { setPhase('idle'); setSpace(undefined); setLive(undefined); });

    // Live slice: the board as it is now, placed at the parameter's current value; other parameters rebuild the landscape.
    const signature = usable.map(entry => `${entry.key}=${entry.value}`).join('|');
    const otherSignature = usable.filter(entry => entry.key !== chosen).map(entry => `${entry.key}=${entry.value}`).join('|');
    const built = useRef('');
    useEffect(() => {
        if (phase !== 'open' || !space) return;
        const b = findBoard(props.frame.current);
        const svg = b && svgRootOf(b);
        const entry = getParam(space.key);
        if (!b || !svg || !entry) return;
        const timer = window.setTimeout(() => {
            const now = picture(b, space.width, space.height);
            const pick = <T,>(map: Map<string, T>, moving: boolean) => [...map].filter(([id]) => space.moving.has(id) === moving).map(([, v]) => v);
            setLive({value: entry.value, lines: pick(now.lines, true).flat(), dots: pick(now.dots, true), still: pick(now.lines, false).flat()});
        }, 30);
        return () => window.clearTimeout(timer);
    }, [phase, space, signature, props.frame]);
    useEffect(() => {
        if (phase !== 'open' || !chosen) return;
        if (!built.current) { built.current = otherSignature; return; }
        if (built.current === otherSignature) return;
        built.current = otherSignature;
        const timer = window.setTimeout(() => void build(chosen, true), 350);
        return () => window.clearTimeout(timer);
    }, [phase, chosen, otherSignature, build]);
    useEffect(() => { if (phase === 'idle') built.current = ''; }, [phase]);

    if (usable.length === 0 && phase === 'idle') return null;
    const bottom = 64 + ['a10', 'a11', 'a13', 'a14', 'a15', 'a18'].filter(flag => uxEnabled(flag as 'a10')).length * 48;
    if (phase === 'idle') return <button type="button" className="ux-space-start" style={{bottom}} onClick={open} title="Parameter postane tretja os: družina krivulj kot pokrajina">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 13c3-6 5-6 8 0M5 10.5c3-6 5-6 8 0M8 8c3-6 5-6 8 0"/></svg>
        V prostor
    </button>;
    if (!box) return null;

    const entry = space ? getParam(space.key) : undefined;
    const W = box.width, H = box.height;
    const depth = Math.min(W, H) * 0.95;
    const yaw = view.yaw * Math.PI / 180, pitch = view.pitch * Math.PI / 180;
    const flatness = Math.min(1, Math.hypot(view.yaw, view.pitch) / 30);
    const raw = (p: Vec, z: number): Vec => {
        const X = p[0] - W / 2, Y = p[1] - H / 2, Z = z;
        const x1 = X * Math.cos(yaw) + Z * Math.sin(yaw), z1 = -X * Math.sin(yaw) + Z * Math.cos(yaw);
        const y2 = Y * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = Y * Math.sin(pitch) + z1 * Math.cos(pitch);
        const scale = 1800 / (1800 + z2);
        return [W / 2 + x1 * scale, H / 2 + y2 * scale];
    };
    // Fit the whole tilted stack between the header and the note; flat, it lies exactly on the board again.
    const corners = [-depth / 2, depth / 2].flatMap(z => ([[0, 0], [W, 0], [W, H], [0, H]] as Vec[]).map(p => raw(p, z)));
    const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
    const top = W < 600 ? 50 : 58, bottomSpace = W < 600 ? 8 : 30, margin = W < 600 ? 14 : 26;
    const k = Math.min((W - 2 * margin) / (Math.max(...xs) - Math.min(...xs)), (H - top - bottomSpace) / (Math.max(...ys) - Math.min(...ys)));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const project = (p: Vec, z: number): Vec => {
        const q = raw(p, z);
        const fitted: Vec = [W / 2 + (q[0] - cx) * k, top + (H - top - bottomSpace) / 2 + (q[1] - cy) * k];
        return [q[0] + (fitted[0] - q[0]) * flatness, q[1] + (fitted[1] - q[1]) * flatness];
    };
    const zOf = (value: number) => space ? ((value - space.low) / ((space.high - space.low) || 1) - 0.5) * depth : 0;
    const pathOf = (lines: Vec[][], z: number) => lines.map(run => 'M' + run.map(p => project(p, z).map(n => n.toFixed(1)).join(' ')).join('L')).join('');
    const frameAt = (z: number) => pathOf([[[0, 0], [W, 0], [W, H], [0, H], [0, 0]]], z);
    // Back to front, so nearer slices draw over farther ones.
    const order = space ? space.slices.map((slice, i) => ({slice, i, z: zOf(slice.value)}))
        .sort((p, q) => q.z - p.z) : [];
    const liveZ = live ? zOf(live.value) : 0;
    const axisFrom = project([0, H], zOf(space?.low ?? 0)), axisTo = project([0, H], zOf(space?.high ?? 0));

    const down = (event: React.PointerEvent) => {
        cancelAnimationFrame(animation.current);
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
        drag.current = {x: event.clientX, y: event.clientY, view};
    };
    const move = (event: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        setView({yaw: Math.max(-85, Math.min(85, d.view.yaw + (event.clientX - d.x) * 0.35)), pitch: Math.max(-10, Math.min(70, d.view.pitch + (event.clientY - d.y) * 0.3))});
    };
    const up = () => { drag.current = undefined; };
    // The handle on the parameter axis: slide it and the slice (and the real graph) travel through the landscape.
    const handle = live && space ? project([0, H], liveZ) : undefined;
    const slide = (event: React.PointerEvent) => {
        if (!space || !(event.buttons & 1)) return;
        const svg = (event.currentTarget as SVGElement).ownerSVGElement!;
        const rect = svg.getBoundingClientRect();
        const q: Vec = [(event.clientX - rect.left) * W / rect.width, (event.clientY - rect.top) * H / rect.height];
        const dx = axisTo[0] - axisFrom[0], dy = axisTo[1] - axisFrom[1];
        const f = Math.max(0, Math.min(1, ((q[0] - axisFrom[0]) * dx + (q[1] - axisFrom[1]) * dy) / (dx * dx + dy * dy || 1)));
        const target = getParam(space.key);
        if (!target) return;
        const value = space.low + f * (space.high - space.low);
        target.set(Math.round((value - target.min) / target.step) * target.step + target.min);
    };

    return <div className="ux-space" style={box} role="dialog" aria-label="Družina krivulj v prostoru">
        <svg className="ux-space-stage" viewBox={`0 0 ${W} ${H}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {space && <>
                <path d={frameAt(zOf(space.low))} className="ux-space-frame far"/>
                <line x1={axisFrom[0]} y1={axisFrom[1]} x2={axisTo[0]} y2={axisTo[1]} className="ux-space-axis" markerEnd="url(#ux-space-head)"/>
                <defs><marker id="ux-space-head" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z"/></marker></defs>
                {entry && flatness > 0.3 && <text x={axisTo[0]} y={axisTo[1] + 18} className="ux-space-axis-label">{symbolOf(entry)}</text>}
                {order.map(({slice, i, z}) => {
                    const t = i / (space.slices.length - 1);
                    return <g key={i} className="ux-space-slice" >
                        <path d={pathOf(slice.lines, z)} style={{stroke: `hsl(${150 - 40 * t}, ${30 + 15 * t}%, ${28 + 22 * t}%)`}}/>
                        {slice.dots.map((p, k) => { const q = project(p, z); return <circle key={k} cx={q[0]} cy={q[1]} r={2}/>; })}
                        {(i % 6 === 0 || i === space.slices.length - 1) && flatness > 0.3 && entry && (() => { const q = project([0, H], z); return <text x={q[0] - 6} y={q[1] + 4} className="ux-space-tick">{entry.format(Number(slice.value.toPrecision(4)))}</text>; })()}
                    </g>;
                })}
                {handle && <g className="ux-space-handle" onPointerDown={event => { event.stopPropagation(); (event.currentTarget as Element).setPointerCapture(event.pointerId); }}
                    onPointerMove={event => { event.stopPropagation(); slide(event); }} role="slider" aria-label="Vrednost na tretji osi" aria-valuenow={live?.value}>
                    <circle cx={handle[0]} cy={handle[1]} r={20} className="hit"/>
                    <circle cx={handle[0]} cy={handle[1]} r={8} className="knob"/>
                </g>}
                {live && <g className="ux-space-live">
                    <path d={frameAt(liveZ)} className="ux-space-frame"/>
                    {live.still && <path d={pathOf(live.still, liveZ)} className="still"/>}
                    <path d={pathOf(live.lines, liveZ)}/>
                    {live.dots.map((p, k) => { const q = project(p, liveZ); return <circle key={k} cx={q[0]} cy={q[1]} r={3.5}/>; })}
                </g>}
            </>}
        </svg>
        {phase === 'scanning' && <div className="ux-space-scan" role="status">Rišem družino krivulj …</div>}
        <div className="ux-space-head">
            <span className="ux-space-title">Družina v prostoru</span>
            <span className="ux-space-chips" role="group" aria-label="Parameter na tretji osi">
                {usable.map(item => <button key={item.key} type="button" className={`ux-space-chip${chosen === item.key ? ' is-on' : ''}`} aria-pressed={chosen === item.key}
                    onClick={() => void build(item.key, true)} title={item.label}><i>{symbolOf(item)}</i></button>)}
            </span>
            <button type="button" className="ux-space-flat" onClick={() => glide(Math.hypot(view.yaw, view.pitch) < 5 ? {yaw: -38, pitch: 24} : {yaw: 0, pitch: 0})}>
                {Math.hypot(view.yaw, view.pitch) < 5 ? 'Nagni' : 'Splošči'}
            </button>
            <button type="button" className="ux-space-close" onClick={close} aria-label="Zapri prostor">×</button>
        </div>
        {entry && <p className="ux-space-note">Vsaka tanka krivulja je graf pri drugi vrednosti <i>{symbolOf(entry)}</i>; jantarna je današnja. Povleci pokrajino, da jo zasukaš; povleci rumeni gumb na osi in rezina potuje.</p>}
    </div>;
}
