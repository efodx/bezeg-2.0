import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {drawn} from './YourTurn';
import {svgRootOf} from './family';
import {uxEnabled} from './flags';
import './Bead.css';

/**
 * a18 — Bead on the curve. A bead rides any drawn curve like a bead on a wire, under gravity and a little friction.
 * It speeds up where the curve is steep, slows down where it is flat and comes to rest in a lowest point, which it
 * then names in the lesson's own coordinates. Flip gravity and it finds a highest point instead. The curve is a live
 * track: when the lesson or the learner changes a parameter, the wire reshapes under the bead and it rolls to the new
 * resting place, so "where is the minimum now?" is felt. A short tangent with its slope travels with the bead. Drag the
 * bead onto any other curve to change track; let go with a flick and it keeps that speed. Generic: the track is
 * sampled from the board's own SVG geometry (function graphs, Bézier curves, segments, circles, polygons), so no
 * lesson needs code; closed curves wrap around, so a bead on a circle swings like a pendulum.
 */

type Vec = [number, number];
interface Track { id: string; points: Vec[]; cum: number[]; breaks: Set<number>; closed: boolean; sig: string }
interface Readout { x: number; y: number; slope: number; settled: 'low' | 'high' | 'edge' | 'flat' | undefined; detached: boolean }

const G = 1500; // px / s²
const FRICTION = 2.0; // 1 / s
const fmt = (value: number) => {
    const rounded = Math.abs(value) < 0.005 ? 0 : value;
    return rounded.toLocaleString('sl-SI', {maximumFractionDigits: 2, minimumFractionDigits: 0}).replace('-', '−');
};

type Geometry = SVGGeometryElement;
const signature = (node: SVGElement) => node.tagName === 'line'
    ? ['x1', 'y1', 'x2', 'y2'].map(name => node.getAttribute(name)).join(',')
    : node.tagName === 'ellipse' || node.tagName === 'circle'
        ? ['cx', 'cy', 'rx', 'ry', 'r'].map(name => node.getAttribute(name)).join(',')
        : (node.getAttribute('d') ?? node.getAttribute('points') ?? '');

function sampleTrack(id: string, node: Geometry, width: number, height: number): Track | undefined {
    let length = 0;
    try { length = node.getTotalLength(); } catch { return undefined; }
    if (!(length > 30)) return undefined;
    const count = Math.max(24, Math.min(420, Math.round(length / 3)));
    const points: Vec[] = [];
    const cut = new Set<number>();
    // Only the visible wire counts: function graphs run far past the board, and the bead must stop at its edge.
    let skipped = false;
    for (let i = 0; i <= count; i++) {
        const p = node.getPointAtLength(length * i / count);
        if (p.x < 2 || p.y < 2 || p.x > width - 2 || p.y > height - 2) { skipped = true; continue; }
        if (skipped && points.length > 0) cut.add(points.length);
        skipped = false;
        points.push([p.x, p.y]);
    }
    if (points.length < 4) return undefined;
    const spacing = length / count;
    const cum = [0];
    const breaks = new Set<number>();
    for (let i = 1; i < points.length; i++) {
        const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        // A move-to inside the path (a gap in a function graph) is a jump between samples: the wire ends there.
        if (d > spacing * 4 + 2 || cut.has(i)) breaks.add(i);
        cum.push(cum[i - 1] + (breaks.has(i) ? 0 : d));
    }
    const first = points[0], last = points[points.length - 1];
    const closed = breaks.size === 0 && Math.hypot(first[0] - last[0], first[1] - last[1]) < spacing * 1.5 + 1;
    return {id, points, cum, breaks, closed, sig: signature(node)};
}

/** Index i with cum[i] ≤ s < cum[i + 1]. */
function segmentAt(track: Track, s: number) {
    let lo = 0, hi = track.cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (track.cum[mid] <= s) lo = mid; else hi = mid; }
    return lo;
}

function at(track: Track, s: number): {p: Vec; t: Vec} {
    let i = segmentAt(track, s);
    if (track.breaks.has(i + 1) && i > 0) i -= 1;
    const a = track.points[i], b = track.points[Math.min(track.points.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const f = Math.max(0, Math.min(1, (s - track.cum[i]) / (track.cum[i + 1] - track.cum[i] || 1)));
    return {p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], t: [(b[0] - a[0]) / len, (b[1] - a[1]) / len]};
}

/** The wire piece around s: [start, end] arc lengths between move-tos. */
function pieceOf(track: Track, s: number): [number, number] {
    const i = segmentAt(track, s);
    let start = 0, end = track.cum[track.cum.length - 1];
    for (const j of track.breaks) {
        if (j <= i) start = Math.max(start, track.cum[j]);
        else end = Math.min(end, track.cum[j - 1]);
    }
    return [start, end];
}

function nearest(track: Track, q: Vec): {s: number; d: number} {
    let best = 0, bestD = Infinity;
    track.points.forEach((p, i) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bestD) { bestD = d; best = i; } });
    return {s: track.cum[best], d: Math.sqrt(bestD)};
}

const isPoint = (object: {elType?: string}) => object.elType === 'point' || object.elType === 'glider';
function candidates(b: Board): {id: string; node: Geometry; elType?: string}[] {
    return drawn(b).filter(object => !isPoint(object) && object.rendNode instanceof SVGGeometryElement && object.rendNode.getAttribute('display') !== 'none')
        .map(object => ({id: object.id, node: object.rendNode as unknown as Geometry, elType: object.elType}));
}

type Units = {unitX: number; unitY: number; origin: {scrCoords: number[]}};

export function Bead(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [on, setOn] = useState(false);
    const [up, setUp] = useState(false);
    const [box, setBox] = useState<{width: number; height: number; left: number; top: number}>();
    const [readout, setReadout] = useState<Readout>();
    const [missing, setMissing] = useState(false);
    const bead = useRef<SVGGElement>(null);
    const tangent = useRef<SVGLineElement>(null);
    const trail = useRef<SVGPolylineElement>(null);
    const dropX = useRef<SVGLineElement>(null);
    const dropY = useRef<SVGLineElement>(null);
    const label = useRef<HTMLDivElement>(null);
    const state = useRef({track: undefined as Track | undefined, s: 0, v: 0, pos: [0, 0] as Vec, still: 0, drag: undefined as undefined | {
        tracks: Track[]; last: Vec; lastTime: number; vel: Vec; attached?: {track: Track; s: number}; pointer: Vec;
    }, history: [] as Vec[], up: false, readoutAt: 0});
    state.current.up = up;

    useEffect(() => {
        if (!on) return;
        const frameEl = props.frame.current;
        let raf = 0, last = performance.now();
        const s0 = state.current;
        s0.track = undefined; s0.history = []; s0.still = 0;
        const step = (now: number) => {
            raf = requestAnimationFrame(step);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const b = findBoard(frameEl);
            const svg = b && svgRootOf(b);
            if (!b || !svg || !frameEl) return;
            const frameRect = frameEl.getBoundingClientRect(), rect = svg.getBoundingClientRect();
            const nextBox = {width: Math.round(rect.width), height: Math.round(rect.height), left: Math.round(rect.left - frameRect.left), top: Math.round(rect.top - frameRect.top)};
            setBox(current => current && current.width === nextBox.width && current.height === nextBox.height && current.left === nextBox.left && current.top === nextBox.top ? current : nextBox);
            const s = state.current;
            const list = candidates(b);
            // Keep the track in step with the board: resample when its geometry changed and put the bead on the nearest
            // point of the new wire, so a reshaped curve slides under the bead instead of teleporting it.
            if (s.track) {
                const object = list.find(item => item.id === s.track!.id);
                if (!object) s.track = undefined;
                else if (signature(object.node) !== s.track.sig) {
                    const next = sampleTrack(object.id, object.node, rect.width, rect.height);
                    if (next) { s.s = nearest(next, s.pos).s; s.still = 0; }
                    s.track = next;
                }
            }
            if (!s.track && !s.drag) {
                // First track: the longest function graph or curve; otherwise the longest drawn shape.
                const tracks = list.map(item => ({item, track: sampleTrack(item.id, item.node, rect.width, rect.height)})).filter(entry => entry.track) as {item: typeof list[number]; track: Track}[];
                // Smooth wires first: a histogram's outline is mostly vertical walls, so it ranks below the bell curve over it.
                const steep = (track: Track) => track.points.slice(1).filter((p, i) => Math.abs(p[0] - track.points[i][0]) < 0.05 * Math.hypot(p[0] - track.points[i][0], p[1] - track.points[i][1])).length / track.points.length;
                const score = (entry: typeof tracks[number]) => entry.track.cum[entry.track.cum.length - 1] * (entry.item.elType === 'curve' || entry.item.elType === 'functiongraph' ? 3 : 1) * (1 - steep(entry.track)) ** 2;
                const best = tracks.sort((p, q) => score(q) - score(p))[0];
                setMissing(!best);
                if (!best) return;
                s.track = best.track;
                // Drop it from rest a little beside the highest point of the wire, so it runs through the whole valley.
                const points = best.track.points;
                let top = 0;
                points.forEach((p, i) => { if (p[1] < points[top][1] - 0.5) top = i; });
                const shift = Math.max(2, Math.round(points.length * 0.04));
                const lower = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))][1];
                const pick = top === 0 || top === points.length - 1 ? top : lower(top + shift) > lower(top - shift) ? top + shift : top - shift;
                s.s = best.track.cum[Math.max(0, Math.min(points.length - 1, pick))];
                s.v = 0;
                s.history = [];
            }
            let detached = false;
            if (s.drag) {
                if (s.drag.attached) { s.track = s.drag.attached.track; s.s = s.drag.attached.s; s.v = 0; }
                else detached = true;
            } else if (s.track) {
                // Bead on a wire: along the wire only gravity's tangential part and friction act.
                const sub = 6, h = dt / sub, g = s.up ? -G : G;
                const total = s.track.cum[s.track.cum.length - 1];
                for (let k = 0; k < sub; k++) {
                    const {t} = at(s.track, s.s);
                    // Near a resting place the wire turns sticky, so the bead settles in a couple of swings instead of rocking for long.
                    const sticky = Math.abs(s.v) < 120 && Math.abs(g * t[1]) < 400 ? 5 : 0;
                    s.v += (g * t[1] - (FRICTION + sticky) * s.v) * h;
                    s.v = Math.max(-2600, Math.min(2600, s.v));
                    s.s += s.v * h;
                    if (s.track.closed) s.s = ((s.s % total) + total) % total;
                    else {
                        const [start, end] = pieceOf(s.track, s.s - s.v * h);
                        if (s.s < start) { s.s = start; s.v = -s.v * 0.35; }
                        if (s.s > end) { s.s = end; s.v = -s.v * 0.35; }
                    }
                }
            }
            const pose = s.drag && !s.drag.attached ? {p: s.drag.pointer, t: [1, 0] as Vec} : s.track ? at(s.track, s.s) : undefined;
            if (!pose) return;
            s.pos = pose.p;
            s.still = !s.drag && Math.abs(s.v) < 8 ? s.still + dt : 0;
            s.history.push(pose.p);
            if (s.history.length > 46) s.history.shift();
            bead.current?.setAttribute('transform', `translate(${pose.p[0].toFixed(1)} ${pose.p[1].toFixed(1)})`);
            bead.current?.classList.toggle('is-detached', detached);
            const [tx, ty] = pose.t;
            tangent.current?.setAttribute('x1', String(pose.p[0] - tx * 46)); tangent.current?.setAttribute('y1', String(pose.p[1] - ty * 46));
            tangent.current?.setAttribute('x2', String(pose.p[0] + tx * 46)); tangent.current?.setAttribute('y2', String(pose.p[1] + ty * 46));
            trail.current?.setAttribute('points', s.history.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '));
            const units = b as unknown as Units;
            const [, ox, oy] = units.origin.scrCoords;
            const ux = (pose.p[0] - ox) / units.unitX, uy = (oy - pose.p[1]) / units.unitY;
            const settled = s.still > 0.4 && s.track ? (edgeOf(s) ? 'edge' : extremum(s.track, s.s, s.up) ? (s.up ? 'high' : 'low') : 'flat') : undefined;
            // Drop lines to the axes once it rests, so the resting point reads as coordinates.
            for (const [ref, x2, y2] of [[dropX, pose.p[0], oy], [dropY, ox, pose.p[1]]] as const) {
                ref.current?.setAttribute('x1', String(pose.p[0])); ref.current?.setAttribute('y1', String(pose.p[1]));
                ref.current?.setAttribute('x2', String(x2)); ref.current?.setAttribute('y2', String(y2));
                ref.current?.classList.toggle('is-on', settled === 'low' || settled === 'high');
            }
            if (label.current) {
                const above = pose.p[1] > 70;
                label.current.style.transform = `translate(${(nextBox.left + Math.max(60, Math.min(nextBox.width - 60, pose.p[0]))).toFixed(0)}px, ${(nextBox.top + pose.p[1] + (above ? -30 : 30)).toFixed(0)}px) translate(-50%, -50%)`;
            }
            const slope = Math.abs(tx) < 1e-4 ? Infinity : -(ty / units.unitY) / (tx / units.unitX);
            if (now - s.readoutAt > 110 || (settled && !readoutSettled.current)) {
                s.readoutAt = now;
                readoutSettled.current = !!settled;
                setReadout({x: ux, y: uy, slope, settled, detached});
            }
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [on, props.frame]);
    const readoutSettled = useRef(false);

    useEffect(() => { state.current.still = 0; }, [up]);

    const pointer = (event: React.PointerEvent): Vec => {
        const svg = (event.currentTarget as SVGElement).ownerSVGElement ?? (event.currentTarget as SVGSVGElement);
        const rect = svg.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    };
    const down = (event: React.PointerEvent) => {
        const b = findBoard(props.frame.current);
        if (!b) return;
        event.preventDefault(); event.stopPropagation();
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
        (window as unknown as {__uxConsumed?: number}).__uxConsumed = performance.now() + 100000;
        const svg = svgRootOf(b);
        const tracks = candidates(b).map(item => sampleTrack(item.id, item.node, svg?.clientWidth ?? 0, svg?.clientHeight ?? 0)).filter(Boolean) as Track[];
        const p = pointer(event);
        const s = state.current;
        s.drag = {tracks, last: p, lastTime: performance.now(), vel: [0, 0], pointer: p, attached: s.track ? {track: s.track, s: s.s} : undefined};
        s.history = [];
    };
    const move = (event: React.PointerEvent) => {
        const drag = state.current.drag;
        if (!drag) return;
        const p = pointer(event), now = performance.now();
        const dt = Math.max(1, now - drag.lastTime) / 1000;
        drag.vel = [drag.vel[0] * 0.5 + 0.5 * (p[0] - drag.last[0]) / dt, drag.vel[1] * 0.5 + 0.5 * (p[1] - drag.last[1]) / dt];
        drag.last = p; drag.lastTime = now; drag.pointer = p;
        let best: {track: Track; s: number; d: number} | undefined;
        for (const track of drag.tracks) { const hit = nearest(track, p); if (!best || hit.d < best.d) best = {track, ...hit}; }
        drag.attached = best && best.d < 46 ? {track: best.track, s: best.s} : undefined;
    };
    const up_ = (event: React.PointerEvent) => {
        const s = state.current, drag = s.drag;
        if (!drag) return;
        (window as unknown as {__uxConsumed?: number}).__uxConsumed = performance.now();
        s.drag = undefined;
        if (drag.attached) {
            s.track = drag.attached.track; s.s = drag.attached.s;
            // A flick keeps its speed along the wire.
            const {t} = at(s.track, s.s);
            s.v = Math.max(-1800, Math.min(1800, drag.vel[0] * t[0] + drag.vel[1] * t[1]));
        }
        s.still = 0;
        event.stopPropagation();
    };

    const bottom = 64 + ['a10', 'a11', 'a13', 'a14', 'a15'].filter(flag => uxEnabled(flag as 'a10')).length * 48;
    const slopeText = readout ? (Number.isFinite(readout.slope) && Math.abs(readout.slope) < 1e3 ? fmt(readout.slope) : 'navpično') : '';
    return <>
        <button type="button" className={`ux-bead-start${on ? ' is-on' : ''}`} style={{bottom}} aria-pressed={on} onClick={() => { setOn(value => !value); setReadout(undefined); }}
            title="Kroglica na žici: drsi po krivulji in obstane v najnižji točki">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 6c4 0 4 10 8 10s4-10 8-10"/><circle cx="6.4" cy="11.2" r="2.4"/></svg>
            Kroglica
        </button>
        {on && box && <svg className="ux-bead-layer" style={box} viewBox={`0 0 ${box.width} ${box.height}`}>
            <line ref={dropX} className="ux-bead-drop"/>
            <line ref={dropY} className="ux-bead-drop"/>
            <polyline ref={trail} className="ux-bead-trail"/>
            <line ref={tangent} className="ux-bead-tangent"/>
            <g ref={bead} className="ux-bead" onPointerDown={down} onPointerMove={move} onPointerUp={up_} onPointerCancel={up_}
                role="slider" aria-label="Kroglica na krivulji" aria-valuetext={readout ? `x ${fmt(readout.x)}, y ${fmt(readout.y)}` : undefined} tabIndex={0}
                onKeyDown={event => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    const s = state.current;
                    if (!s.track) return;
                    const {t} = at(s.track, s.s);
                    s.v += (event.key === 'ArrowRight' ? 1 : -1) * Math.sign(t[0] || 1) * 420; s.still = 0;
                }}>
                <circle r="24" className="hit"/>
                <circle r="9.5" className="ball"/>
                <circle r="3" cx="-3" cy="-3" className="shine"/>
            </g>
        </svg>}
        <div ref={label} className={`ux-bead-label${readout?.settled ? ' is-settled' : ''}`} aria-live="polite" hidden={!(on && readout && !missing)}>
            {!readout ? null : readout.detached ? 'Spusti jo na krivuljo'
                : readout.settled === 'low' ? <>najnižja točka <b>({fmt(readout.x)}; {fmt(readout.y)})</b></>
                    : readout.settled === 'high' ? <>najvišja točka <b>({fmt(readout.x)}; {fmt(readout.y)})</b></>
                        : readout.settled === 'flat' ? <>tu je krivulja skoraj vodoravna, zato kroglica komaj drsi</>
                        : readout.settled === 'edge' ? <>na koncu krivulje: vmes ni {up ? 'najvišje' : 'najnižje'} točke</>
                            : <>naklon <b>{slopeText}</b></>}
        </div>
        {on && <div className="ux-bead-bar" role="group" aria-label="Kroglica">
            <button type="button" className={up ? 'is-on' : ''} aria-pressed={up} onClick={() => setUp(value => !value)} title="Obrni težnost: kroglica poišče najvišjo točko">
                {up ? '↑ teža navzgor' : '↓ teža navzdol'}
            </button>
            <span>Povleci kroglico na katerokoli krivuljo.</span>
        </div>}
        {on && missing && <p className="ux-bead-note" role="status">Na tej sliki ni krivulje, po kateri bi kroglica drsela.</p>}
    </>;
}

/** A resting place is a lowest (highest) point only if the wire rises (falls) on both sides of it, not on a near-flat run. */
function extremum(track: Track, s: number, up: boolean) {
    const [start, end] = pieceOf(track, s);
    const total = track.cum[track.cum.length - 1];
    const y = (arc: number) => at(track, track.closed ? ((arc % total) + total) % total : Math.max(start, Math.min(end, arc))).p[1];
    const here = y(s);
    const sign = up ? -1 : 1;
    // Screen y grows downwards: at a lowest point both neighbours are higher, i.e. have a smaller y.
    return [-40, 40].every(delta => sign * (here - y(s + delta)) > 0.15 || Math.abs(here - y(s + delta)) < 0.02 && Math.abs(here - y(s + delta * 2)) < 0.02);
}

function edgeOf(s: {track: Track | undefined; s: number}) {
    if (!s.track || s.track.closed) return false;
    const [start, end] = pieceOf(s.track, s.s);
    return s.s - start < 1 || end - s.s < 1;
}
