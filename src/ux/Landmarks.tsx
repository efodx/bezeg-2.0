import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {useParams} from './paramRegistry';
import {drawn} from './YourTurn';
import {svgRootOf} from './family';
import './Landmarks.css';

/**
 * a23 — Landmarks. Every curve on the board carries its own signposts, live: where it crosses the x axis (zeros), where it
 * crosses the y axis, and its lowest and highest points, each with coordinates in the lesson's units. When a parameter
 * settles after a change, one sentence says what happened to them: "minimum: (3; 1) → (5; 1), 2 desno", "ničli: 2 → 0".
 * The learner's action is put into words by the graph itself, which is also what a screen reader user hears. Generic:
 * the landmarks are read from the board's own SVG geometry (sampled every pixel, zeros by interpolation, extrema by a
 * parabola through three samples) and shown at the precision the drawing supports.
 */

type Kind = 'zero' | 'yint' | 'min' | 'max';
interface Mark { kind: Kind; x: number; y: number; sx: number; sy: number; curve: string }
type Units = {unitX: number; unitY: number; origin: {scrCoords: number[]}};

const NAMES: Record<Kind, string> = {zero: 'ničla', yint: 'presečišče z osjo y', min: 'lokalni minimum', max: 'lokalni maksimum'};

function landmarks(b: Board): Mark[] {
    const svg = svgRootOf(b);
    if (!svg) return [];
    const W = svg.clientWidth, H = svg.clientHeight;
    const u = b as unknown as Units;
    const [, ox, oy] = u.origin.scrCoords;
    const out: Mark[] = [];
    for (const object of drawn(b)) {
        if (object.elType !== 'curve' && object.elType !== 'functiongraph') continue;
        const node = object.rendNode as unknown as SVGGeometryElement;
        if (!(node instanceof SVGGeometryElement) || node.getAttribute('display') === 'none') continue;
        let length = 0;
        try { length = node.getTotalLength(); } catch { continue; }
        if (!(length > 20)) continue;
        const count = Math.min(2400, Math.round(length));
        const runs: [number, number][][] = [];
        let run: [number, number][] = [], last: [number, number] | undefined;
        for (let i = 0; i <= count; i++) {
            const p = node.getPointAtLength(length * i / count);
            const inside = p.x > 1 && p.y > 1 && p.x < W - 1 && p.y < H - 1;
            const jump = last && Math.hypot(p.x - last[0], p.y - last[1]) > length / count * 4 + 2;
            if (!inside || jump) { if (run.length > 4) runs.push(run); run = []; }
            if (inside) run.push([p.x, p.y]);
            last = [p.x, p.y];
        }
        if (run.length > 4) runs.push(run);
        // A histogram outline is steps: its corners are not extrema of anything. Skip curves that are mostly walls.
        const samples = runs.flat();
        const walls = runs.reduce((n, r) => n + r.slice(1).filter((p, i) => Math.abs(p[0] - r[i][0]) < 0.05 && Math.abs(p[1] - r[i][1]) > 0.2).length, 0);
        if (samples.length > 0 && walls / samples.length > 0.15) continue;
        const ux = (sx: number) => (sx - ox) / u.unitX, uy = (sy: number) => (oy - sy) / u.unitY;
        for (const r of runs) {
            // Zeros and the y-intercept: sign changes between strictly nonzero samples (a curve lying on an axis has none).
            const cross = (value: (p: [number, number]) => number, kind: Kind) => {
                let prev: [number, number] | undefined;
                for (const p of r) {
                    if (Math.abs(value(p)) < 1e-9) continue;
                    if (prev && Math.sign(value(prev)) !== Math.sign(value(p))) {
                        const t = value(prev) / (value(prev) - value(p));
                        const sx = prev[0] + (p[0] - prev[0]) * t, sy = prev[1] + (p[1] - prev[1]) * t;
                        out.push({kind, x: kind === 'zero' ? ux(sx) : 0, y: kind === 'zero' ? 0 : uy(sy), sx, sy, curve: object.id});
                    }
                    prev = p;
                }
            };
            cross(p => oy - p[1], 'zero');
            cross(p => p[0] - ox, 'yint');
            // Extrema: a sample lower (higher) than everything within ±12 px of curve on both sides, by at least 1.5 px.
            const k = 12;
            for (let i = k; i < r.length - k; i++) {
                const y = r[i][1];
                let isMin = true, isMax = true, riseL = 0, riseR = 0;
                for (let j = i - k; j <= i + k; j++) {
                    if (j === i) continue;
                    if (r[j][1] > y) isMin = false; // screen y grows downwards: a minimum of f has the largest screen y
                    if (r[j][1] < y) isMax = false;
                }
                if (!isMin && !isMax) continue;
                // A flat bottom (y = 0,25 x²) rises slowly: judge the rise further out, up to 60 px of curve.
                const far = Math.min(60, i, r.length - 1 - i);
                riseL = Math.abs(r[i - far][1] - y); riseR = Math.abs(r[i + far][1] - y);
                if (riseL < 1.5 || riseR < 1.5) continue;
                // Refine with the parabola through the neighbours.
                const [a, c] = [r[i - 1], r[i + 1]];
                const denom = a[1] - 2 * y + c[1];
                const shift = denom !== 0 ? 0.5 * (a[1] - c[1]) / denom : 0;
                const sx = r[i][0] + shift * (c[0] - a[0]) / 2, sy = y - 0.25 * (a[1] - c[1]) * shift;
                const kind: Kind = isMin ? 'min' : 'max';
                if (out.some(m => m.curve === object.id && m.kind === kind && Math.hypot(m.sx - sx, m.sy - sy) < 6)) continue;
                out.push({kind, x: ux(sx), y: uy(sy), sx, sy, curve: object.id});
                i += k;
            }
        }
    }
    // One mark per place (the end of one subpath may meet the start of the next).
    const unique = out.filter((m, i) => !out.slice(0, i).some(n => n.kind === m.kind && Math.hypot(n.sx - m.sx, n.sy - m.sy) < 4));
    // Where two kinds meet (a vertex on an axis), the extremum carries the label.
    const rank: Record<Kind, number> = {min: 0, max: 0, zero: 1, yint: 2};
    return unique.filter(m => !unique.some(n => n !== m && rank[n.kind] < rank[m.kind] && Math.hypot(n.sx - m.sx, n.sy - m.sy) < 4));
}

export function Landmarks(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const [marks, setMarks] = useState<Mark[]>([]);
    const [box, setBox] = useState<{width: number; height: number; left: number; top: number}>();
    const [decimals, setDecimals] = useState<[number, number]>([1, 1]);
    const [story, setStory] = useState<string[]>();
    const [shown, setShown] = useState(true);
    const settled = useRef<Mark[] | undefined>(undefined);
    const quiet = useRef(0);
    const storyTimer = useRef(0);

    const signature = params.map(entry => `${entry.key}=${entry.value}`).join('|');
    useEffect(() => {
        const frame = props.frame.current;
        let raf = 0, lastGeometry = '';
        // Follow the board, not only the sliders: dragging points or panning also moves the landmarks.
        const poll = () => {
            raf = window.setTimeout(poll, 160) as unknown as number;
            const b = findBoard(frame);
            const svg = b && svgRootOf(b);
            if (!b || !svg || !frame) return;
            const geometry = drawn(b).filter(o => o.elType === 'curve' || o.elType === 'functiongraph').map(o => { const d = o.rendNode!.getAttribute('d') ?? ''; return `${d.length}:${d.slice(0, 40)}:${d.slice(-40)}`; }).join(',')
                + (b as unknown as Units).origin.scrCoords.join(',') + (b as unknown as Units).unitX;
            const sig = geometry + signature;
            if (sig === lastGeometry) return;
            lastGeometry = sig;
            const next = landmarks(b);
            const places = (unit: number) => unit >= 400 ? 3 : unit >= 90 ? 2 : 1;
            const digits: [number, number] = [places((b as unknown as Units).unitX), places((b as unknown as Units).unitY)];
            setDecimals(digits);
            const f = frame.getBoundingClientRect(), r = svg.getBoundingClientRect();
            setBox({width: r.width, height: r.height, left: r.left - f.left, top: r.top - f.top});
            setMarks(next);
            if (!settled.current) settled.current = next;
            window.clearTimeout(quiet.current);
            quiet.current = window.setTimeout(() => {
                const before = settled.current ?? [];
                settled.current = next;
                const lines = describe(before, next, digits);
                if (lines.length) {
                    setStory(lines);
                    window.clearTimeout(storyTimer.current);
                    storyTimer.current = window.setTimeout(() => setStory(undefined), 7000);
                }
            }, 700);
        };
        poll();
        return () => { window.clearTimeout(raf); window.clearTimeout(quiet.current); };
    }, [props.frame, signature]);

    const fmtWith = (value: number, d: number) => {
        const rounded = Number(value.toFixed(d));
        return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString('sl-SI', {maximumFractionDigits: d}).replace('-', '−');
    };
    const fmt = (value: number, axis: 0 | 1 = 0) => fmtWith(value, decimals[axis]);
    const crowded = marks.length > 9;
    return <>
        {shown && box && <svg className="ux-mark-layer" style={box} viewBox={`0 0 ${box.width} ${box.height}`} aria-hidden="true">
            {marks.map((m, i) => <g key={i} className={`ux-mark ux-mark-${m.kind}`} transform={`translate(${m.sx.toFixed(1)} ${m.sy.toFixed(1)})`}>
                {m.kind === 'min' || m.kind === 'max' ? <rect x={-5} y={-5} width={10} height={10} transform="rotate(45)"/> : <circle r={5}/>}
                {!crowded && <text x={m.kind === 'yint' ? 9 : 0} y={m.kind === 'max' ? -11 : m.kind === 'yint' ? 4 : 19} textAnchor={m.kind === 'yint' ? 'start' : 'middle'}>
                    ({fmt(m.x, 0)}; {fmt(m.y, 1)})
                </text>}
            </g>)}
        </svg>}
        <button type="button" className={`ux-mark-legend${shown ? '' : ' is-off'}`} aria-pressed={shown} onClick={() => setShown(value => !value)} title="Pokaži ali skrij značilne točke">
            <span className="z"/>ničle <span className="y"/>os y <span className="e"/>ekstremi
        </button>
        <div className="ux-mark-story" role="status" aria-live="polite">{story && shown && story.map((line, i) => <p key={i}>{line}</p>)}</div>
    </>;

    function describe(before: Mark[], after: Mark[], digits: [number, number]): string[] {
        const f = (value: number, axis: 0 | 1 = 0) => fmtWith(value, digits[axis]);
        const lines: string[] = [];
        // Curve by curve, so a still ghost curve never mixes into the story of the one that moved.
        const curves = [...new Set([...before, ...after].map(m => m.curve))];
        for (const curve of curves) for (const kind of ['min', 'max', 'yint', 'zero'] as Kind[]) {
            // An extremum on the x axis is a zero too (a double root: the graph touches the axis without crossing it).
            const touching = (m: Mark) => (m.kind === 'min' || m.kind === 'max') && Math.abs(m.y) < 10 ** -digits[1] / 2;
            const pick = (list: Mark[]) => list.filter(m => m.curve === curve && (m.kind === kind || kind === 'zero' && touching(m)));
            const a = pick(before), b = pick(after);
            if (a.length === 0 && b.length === 0) continue;
            if (kind === 'zero' && a.length !== b.length) {
                lines.push(b.length === 0 ? `ničle: graf ne seka več osi x (prej ${a.length})`
                    : b.some(touching) ? `ničle: ${a.length} → ${b.length}, graf se osi x le dotakne v (${f(b.find(touching)!.x)}; 0)` : `ničle: ${a.length} → ${b.length}`);
                continue;
            }
            if (a.length === 1 && b.length === 1) {
                const dx = b[0].x - a[0].x, dy = b[0].y - a[0].y;
                const stepX = 10 ** -digits[0], stepY = 10 ** -digits[1];
                if (Math.abs(dx) < stepX && Math.abs(dy) < stepY) continue;
                const parts = [];
                if (Math.abs(dx) >= stepX) parts.push(`${f(Math.abs(dx))} ${dx > 0 ? 'desno' : 'levo'}`);
                if (Math.abs(dy) >= stepY) parts.push(`${f(Math.abs(dy), 1)} ${dy > 0 ? 'gor' : 'dol'}`);
                lines.push(`${NAMES[kind]}: (${f(a[0].x)}; ${f(a[0].y, 1)}) → (${f(b[0].x)}; ${f(b[0].y, 1)}), ${parts.join(' in ')}`);
            } else if (a.length !== b.length) {
                const flip = (kind === 'min' || kind === 'max') && b.length === 0 && after.some(m => m.curve === curve && m.kind === (kind === 'min' ? 'max' : 'min'));
                if (flip) lines.push(`${NAMES[kind]} je postal ${NAMES[kind === 'min' ? 'max' : 'min']}`);
                else if (b.length === 0) lines.push(`${NAMES[kind]}: ni več na vidnem delu grafa`);
                else if (a.length === 0 && !((kind === 'min' || kind === 'max') && before.some(m => m.curve === curve && m.kind === (kind === 'min' ? 'max' : 'min')))) lines.push(`${NAMES[kind]}: (${f(b[0].x)}; ${f(b[0].y, 1)}) se je pojavil na sliki`);
                else if (a.length > 0) lines.push(`${NAMES[kind]}: ${a.length} → ${b.length}`);
            } else if (kind === 'zero' && a.length === 2) {
                const w0 = Math.abs(a[1].x - a[0].x), w1 = Math.abs(b[1].x - b[0].x);
                if (Math.abs(w1 - w0) >= 10 ** -digits[0]) lines.push(`razdalja med ničlama: ${f(w0)} → ${f(w1)}`);
            }
        }
        return lines.slice(0, 3);
    }
}
