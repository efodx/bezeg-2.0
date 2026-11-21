import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {watchBoard} from './boardAccess';
import {currentParams, getParam, type ParamEntry} from './paramRegistry';
import './CurveGrab.css';

/**
 * a4 — Grab the curve. Press on any curve or circle that the graph's parameters move (not on a draggable point) and pull:
 * the parameters change so the curve follows your finger. The solver knows nothing about the graph. When you grab, it
 * nudges each parameter once to feel how the grabbed spot moves (a quick shiver), then every frame solves a damped
 * least-squares step for the parameter change that pushes the curve through the finger, refining its estimate as it goes
 * (Broyden). Tap the curve to pin a spot: pins stay where they are while you pull elsewhere, so the remaining freedom shows.
 */

type Vec = [number, number];
interface Sample { point: Vec; normal: Vec; isPoint?: boolean }
type BoardObject = {
    id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean};
    points?: {usrCoords: number[]}[]; center?: {coords: {usrCoords: number[]}}; Radius?: () => number;
    coords?: {usrCoords: number[]}; point1?: {coords: {usrCoords: number[]}}; point2?: {coords: {usrCoords: number[]}};
};
type BoardLike = Board & {
    objectsList: BoardObject[]; unitX: number; unitY: number;
    getUsrCoordsOfMouse(event: Event): number[];
    on(event: string, handler: () => void): void; off(event: string, handler: () => void): void;
    containerObj: HTMLElement;
};

const GRAB_PX = 14;
const POINT_PX = 18;

function nearestOnObject(object: BoardObject, target: Vec): Sample | undefined {
    if ((object.elType === 'point' || object.elType === 'glider' || object.elType === 'intersection' || object.elType === 'midpoint') && object.coords) {
        const [z, x, y] = object.coords.usrCoords;
        return z ? {point: [x / z, y / z], normal: [0, 0], isPoint: true} : undefined;
    }
    if (object.point1 && object.point2 && object.elType !== 'axis') {
        const a = object.point1.coords.usrCoords, b = object.point2.coords.usrCoords;
        if (!a[0] || !b[0]) return undefined;
        const ax = a[1] / a[0], ay = a[2] / a[0], vx = b[1] / b[0] - ax, vy = b[2] / b[0] - ay;
        const length2 = vx * vx + vy * vy;
        if (length2 === 0) return undefined;
        let s = ((target[0] - ax) * vx + (target[1] - ay) * vy) / length2;
        if (object.elType === 'segment' || object.elType === 'arrow') s = Math.max(0, Math.min(1, s));
        const length = Math.sqrt(length2);
        return {point: [ax + s * vx, ay + s * vy], normal: [-vy / length, vx / length]};
    }
    if (object.elType === 'circle' && object.center && object.Radius) {
        const [, cx, cy] = object.center.coords.usrCoords;
        const r = object.Radius();
        const dx = target[0] - cx, dy = target[1] - cy;
        const d = Math.hypot(dx, dy) || 1;
        return {point: [cx + dx / d * r, cy + dy / d * r], normal: [dx / d, dy / d]};
    }
    const points = object.points;
    if (!points || points.length < 2) return undefined;
    let best: Sample | undefined;
    let bestDistance = Infinity;
    for (let i = 0; i + 1 < points.length; i++) {
        const a = points[i].usrCoords, b = points[i + 1].usrCoords;
        const ax = a[1] / a[0], ay = a[2] / a[0], bx = b[1] / b[0], by = b[2] / b[0];
        if (![ax, ay, bx, by].every(Number.isFinite)) continue;
        const vx = bx - ax, vy = by - ay;
        const length2 = vx * vx + vy * vy;
        if (length2 === 0) continue;
        const s = Math.max(0, Math.min(1, ((target[0] - ax) * vx + (target[1] - ay) * vy) / length2));
        const px = ax + s * vx, py = ay + s * vy;
        const distance = Math.hypot(target[0] - px, target[1] - py);
        if (distance < bestDistance) {
            bestDistance = distance;
            const length = Math.sqrt(length2);
            best = {point: [px, py], normal: [-vy / length, vx / length]};
        }
    }
    return best;
}

/** A spot on a curve the solver follows: its last known position, and how it moves per unit of each parameter. */
interface Handle { object: BoardObject; at: Vec; jacobian: Vec[] }

interface Drag {
    pointerId: number; handle: Handle; target: Vec; keys: string[]; scales: number[];
    phase: 'probe' | 'follow'; probeIndex: number; candidates: Handle[]; origin: number[];
    moved: boolean; start: Vec; startScreen: Vec; lastSetUpdate: number; waited: number; lastStep?: number[]; lastMeasure?: Vec; knob?: number;
}

function isDraggablePoint(object: BoardObject & {visProp?: {fixed?: boolean}; coords?: {usrCoords: number[]}}) {
    return (object.elType === 'point' || object.elType === 'glider') && object.visPropCalc?.visible && !object.visProp?.fixed && object.coords;
}

export function CurveGrab(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [hint, setHint] = useState<string>();
    const [pins, setPins] = useState(0);
    const clearPinsRef = useRef<() => void>(() => undefined);
    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        return watchBoard(frame, (rawBoard: Board) => {
            const board = rawBoard as BoardLike;
            const container = board.containerObj;
            const svgNS = 'http://www.w3.org/2000/svg';
            const overlay = document.createElementNS(svgNS, 'svg');
            overlay.setAttribute('class', 'ux-grab-overlay');
            overlay.setAttribute('aria-hidden', 'true');
            frame.appendChild(overlay);
            let updates = 0;
            const onUpdate = () => { updates++; };
            board.on('update', onUpdate);
            let drag: Drag | undefined;
            let pinList: Handle[] = [];
            let raf = 0;
            let hover: BoardObject | undefined;
            const toScreen = (p: Vec): Vec => {
                const box = (board as unknown as {getBoundingBox(): number[]}).getBoundingBox();
                const w = container.clientWidth, h = container.clientHeight;
                return [(p[0] - box[0]) / (box[2] - box[0]) * w, (box[1] - p[1]) / (box[1] - box[3]) * h];
            };
            const locked = () => frame.closest('.workspace-graph')?.getAttribute('data-lesson-locked') === 'true';
            const grabbable = (): ParamEntry[] => currentParams().filter(entry => !entry.inert && !entry.display && entry.max > entry.min);
            const findTarget = (event: PointerEvent): {object: BoardObject; sample: Sample; distance: number}[] => {
                const [x, y] = board.getUsrCoordsOfMouse(event);
                const target: Vec = [x, y];
                const pxX = 1 / board.unitX;
                const found: {object: BoardObject; sample: Sample; distance: number}[] = [];
                for (const object of board.objectsList) {
                    if (!object.visPropCalc?.visible) continue;
                    if (isDraggablePoint(object as never)) {
                        const c = (object as unknown as {coords: {usrCoords: number[]}}).coords.usrCoords;
                        if (Math.hypot((c[1] - x) * board.unitX, (c[2] - y) * board.unitY) < POINT_PX) return [];
                        continue;
                    }
                    const isLine = Boolean(object.point1 && object.point2) && ['segment', 'line', 'arrow'].includes(object.elType ?? '');
                    const isPoint = Boolean(object.coords) && ['point', 'glider', 'intersection', 'midpoint'].includes(object.elType ?? '');
                    if (object.type !== 8 && object.elType !== 'circle' && !isLine && !isPoint) continue;
                    if (object.elType === 'axis' || object.elType === 'ticks') continue;
                    const sample = nearestOnObject(object, target);
                    if (!sample) continue;
                    // Derived points win over the lines through them.
                    const distance = Math.hypot((sample.point[0] - x) * board.unitX, (sample.point[1] - y) * board.unitY) - (isPoint ? 8 : 0);
                    if (distance < GRAB_PX) found.push({object, sample, distance});
                }
                void pxX;
                return found.sort((a, b) => a.distance - b.distance);
            };
            const draw = () => {
                const parts: string[] = [];
                for (const pin of pinList) {
                    const [sx, sy] = toScreen(pin.at);
                    parts.push(`<g class="ux-pin" transform="translate(${sx},${sy})"><circle r="9"/><path d="M-3.5 0 L3.5 0 M0 -3.5 L0 3.5"/></g>`);
                }
                if (drag && drag.phase === 'follow') {
                    const reach = nearestOnObject(drag.handle.object, drag.target)?.point ?? drag.handle.at;
                    const [hx, hy] = toScreen(reach);
                    const [tx, ty] = toScreen(drag.target);
                    if (Math.hypot(hx - tx, hy - ty) > 3) parts.push(`<line class="ux-band" x1="${hx}" y1="${hy}" x2="${tx}" y2="${ty}"/>`);
                    parts.push(`<circle class="ux-grip" cx="${hx}" cy="${hy}" r="7"/>`);
                }
                if (drag && drag.phase === 'probe') {
                    const [hx, hy] = toScreen(drag.handle.at);
                    parts.push(`<circle class="ux-grip ux-feeling" cx="${hx}" cy="${hy}" r="11"/>`);
                }
                overlay.innerHTML = parts.join('');
            };
            const setParam = (key: string, value: number) => {
                const entry = getParam(key);
                if (!entry) return;
                entry.set(Math.min(entry.max, Math.max(entry.min, value)));
            };
            const measure = (handle: Handle): Sample | undefined => nearestOnObject(handle.object, handle.at);
            const step = () => {
                raf = 0;
                const current = drag;
                if (!current) return;
                if (current.phase === 'probe') {
                    // Probe: each frame measures the spot after the previous nudge, then nudges the next parameter.
                    if (current.probeIndex > 0) {
                        if (updates === current.lastSetUpdate && current.waited++ < 6) { raf = requestAnimationFrame(step); return; }
                        current.waited = 0;
                        const index = current.probeIndex - 1;
                        const h = current.scales[index] * 0.02;
                        // Every curve under the finger is felt; the one the parameters move wins below.
                        for (const candidate of current.candidates) {
                            const sample = measure(candidate);
                            if (sample) candidate.jacobian[index] = [(sample.point[0] - candidate.at[0]) / h, (sample.point[1] - candidate.at[1]) / h];
                        }
                        setParam(current.keys[index], current.origin[index]);
                        for (const pin of pinList) {
                            const pinSample = measure(pin);
                            if (pinSample) pin.jacobian[index] = [(pinSample.point[0] - pin.at[0]) / h, (pinSample.point[1] - pin.at[1]) / h];
                        }
                    }
                    if (current.probeIndex < current.keys.length) {
                        const index = current.probeIndex;
                        const entry = getParam(current.keys[index]);
                        const h = current.scales[index] * 0.02;
                        // Nudge inward when the parameter sits at its upper bound.
                        const direction = entry && entry.value + h > entry.max ? -1 : 1;
                        current.scales[index] *= direction;
                        current.lastSetUpdate = updates;
                        setParam(current.keys[index], current.origin[index] + direction * Math.abs(h));
                        current.probeIndex++;
                        draw();
                        raf = requestAnimationFrame(step);
                        return;
                    }
                    current.scales = current.scales.map(Math.abs);
                    const strength = (candidate: Handle) => candidate.jacobian.reduce((sum, col, i) => sum + Math.hypot(...col) * current.scales[i], 0);
                    current.handle = current.candidates.reduce((best, candidate) => strength(candidate) > strength(best) ? candidate : best, current.candidates[0]);
                    const handle = current.handle;
                    // Parameters that do not move the spot (or any pin) take no part.
                    const live = current.keys.map((_, i) => Math.hypot(...handle.jacobian[i]) > 1e-6 || pinList.some(pin => Math.hypot(...pin.jacobian[i]) > 1e-6));
                    if (!live.some(Boolean)) {
                        setHint('Ta krivulja ni odvisna od parametrov — povleci njene točke.');
                        drag = undefined; draw(); return;
                    }
                    current.keys = current.keys.filter((_, i) => live[i]);
                    current.scales = current.scales.filter((_, i) => live[i]);
                    current.origin = current.origin.filter((_, i) => live[i]);
                    handle.jacobian = handle.jacobian.filter((_, i) => live[i]);
                    for (const pin of pinList) pin.jacobian = pin.jacobian.filter((_, i) => live[i]);
                    current.phase = 'follow';
                    current.lastSetUpdate = updates;
                    draw();
                    raf = requestAnimationFrame(step);
                    return;
                }
                const {handle} = current;
                // Follow: refresh the spot's position, learn from the last step, then step towards the finger.
                const sample = measure(handle);
                if (!sample) { raf = requestAnimationFrame(step); return; }
                const flushed = updates !== current.lastSetUpdate;
                if (current.lastStep && current.lastMeasure && flushed) {
                    const dp = current.lastStep;
                    const dpdp = dp.reduce((s, v) => s + v * v, 0);
                    if (dpdp > 0) {
                        const observed: Vec = [sample.point[0] - current.lastMeasure[0], sample.point[1] - current.lastMeasure[1]];
                        const predicted: Vec = [0, 0];
                        dp.forEach((v, i) => { predicted[0] += handle.jacobian[i][0] * v; predicted[1] += handle.jacobian[i][1] * v; });
                        // Only the normal component is observable (the spot may slide along the curve).
                        if (sample.isPoint) {
                            const ex = observed[0] - predicted[0], ey = observed[1] - predicted[1];
                            dp.forEach((v, i) => { handle.jacobian[i] = [handle.jacobian[i][0] + ex * v / dpdp, handle.jacobian[i][1] + ey * v / dpdp]; });
                        } else {
                            const n = sample.normal;
                            const error = (observed[0] - predicted[0]) * n[0] + (observed[1] - predicted[1]) * n[1];
                            dp.forEach((v, i) => {
                                handle.jacobian[i] = [handle.jacobian[i][0] + n[0] * error * v / dpdp, handle.jacobian[i][1] + n[1] * error * v / dpdp];
                            });
                        }
                    }
                    current.lastStep = undefined;
                }
                if (!flushed && current.lastStep && current.waited++ < 6) { raf = requestAnimationFrame(step); return; }
                current.waited = 0;
                handle.at = sample.point;
                const n = sample.normal;
                const pointMode = Boolean(sample.isPoint);
                const residual = pointMode
                    ? Math.hypot(current.target[0] - sample.point[0], current.target[1] - sample.point[1])
                    : (current.target[0] - sample.point[0]) * n[0] + (current.target[1] - sample.point[1]) * n[1];
                // Rows: the grabbed spot's normal reaches the finger (a grabbed point: both coordinates); each pin's normal stays put.
                const rows: {g: number[]; r: number; w: number}[] = pointMode ? [
                    {g: handle.jacobian.map((col, i) => col[0] * current.scales[i]), r: current.target[0] - sample.point[0], w: 1},
                    {g: handle.jacobian.map((col, i) => col[1] * current.scales[i]), r: current.target[1] - sample.point[1], w: 1},
                ] : [{g: handle.jacobian.map((col, i) => (col[0] * n[0] + col[1] * n[1]) * current.scales[i]), r: residual, w: 1}];
                for (const pin of pinList) {
                    const pinSample = measure(pin);
                    if (!pinSample) continue;
                    const pn = pinSample.normal;
                    // A pin holds its place: the curve's nearest point to it should not move off it.
                    const pinResidual = (pin.at[0] - pinSample.point[0]) * pn[0] + (pin.at[1] - pinSample.point[1]) * pn[1];
                    rows.push({g: pin.jacobian.map((col, i) => (col[0] * pn[0] + col[1] * pn[1]) * current.scales[i]), r: pinResidual, w: 4});
                }
                const k = current.keys.length;
                // Damped least squares in normalised parameter units: (GᵀWG + λI) Δq = GᵀWr.
                const a = Array.from({length: k}, () => new Array<number>(k).fill(0));
                const b = new Array<number>(k).fill(0);
                for (const row of rows) for (let i = 0; i < k; i++) {
                    b[i] += row.w * row.g[i] * row.r;
                    for (let j = 0; j < k; j++) a[i][j] += row.w * row.g[i] * row.g[j];
                }
                const scaleNorm = rows.slice(0, pointMode ? 2 : 1).reduce((sum, row) => sum + row.g.reduce((s, v) => s + v * v, 0), 0);
                const lambda = 0.004 * scaleNorm + 1e-9;
                for (let i = 0; i < k; i++) a[i][i] += lambda;
                let dq = solve(a, b);
                if (pinList.length === 0 && !pointMode) {
                    // Without pins, one knob at a time: the parameter that moves this spot most effectively (kept while it
                    // still works, so the pull feels steady), and the moving puck tells the learner which one it is.
                    const g = rows[0].g;
                    const usable = g.map((gi, i) => {
                        const entry = getParam(current.keys[i]);
                        if (!entry || gi === 0) return 0;
                        const direction = Math.sign(residual / gi);
                        const room = direction > 0 ? entry.max - entry.value : entry.value - entry.min;
                        return room > 1e-9 ? Math.abs(gi) : 0;
                    });
                    const best = usable.reduce((bi, v, i) => v > usable[bi] ? i : bi, 0);
                    if (current.knob === undefined || usable[current.knob] < 0.35 * usable[best]) current.knob = best;
                    dq = g.map(() => 0);
                    if (usable[current.knob] > 0) dq[current.knob] = 0.6 * residual / g[current.knob];
                }
                if (!dq || Math.abs(residual) * board.unitY < 0.5) { draw(); raf = requestAnimationFrame(step); return; }
                // At most 4 % of a range per frame, so the curve glides rather than jumps.
                const largest = Math.max(...dq.map(Math.abs));
                const limit = 0.03;
                const factor = largest > limit ? limit / largest : 1;
                const dp: number[] = [];
                current.lastSetUpdate = updates;
                current.keys.forEach((key, i) => {
                    const entry = getParam(key);
                    if (!entry) { dp.push(0); return; }
                    const next = Math.min(entry.max, Math.max(entry.min, entry.value + dq[i] * factor * current.scales[i]));
                    dp.push(next - entry.value);
                    if (next !== entry.value) setParam(key, next);
                });
                current.lastStep = dp.some(v => v !== 0) ? dp : undefined;
                current.lastMeasure = sample.point;
                // Look for the spot next frame where the step should have taken it, so it never hops to another branch.
                dp.forEach((v, i) => { handle.at = [handle.at[0] + handle.jacobian[i][0] * v, handle.at[1] + handle.jacobian[i][1] * v]; });
                draw();
                raf = requestAnimationFrame(step);
            };
            const pointerDown = (event: PointerEvent) => {
                if (event.button !== 0 || event.shiftKey || locked()) return;
                if (!container.contains(event.target as Node)) return;
                const found = findTarget(event);
                if (found.length === 0) return;
                const params = grabbable();
                if (params.length === 0) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                frame.setPointerCapture(event.pointerId);
                const keys = params.map(entry => entry.key);
                const candidates: Handle[] = found.map(entry => ({object: entry.object, at: entry.sample.point, jacobian: keys.map(() => [0, 0] as Vec)}));
                const handle = candidates[0];
                for (const pin of pinList) pin.jacobian = keys.map(() => [0, 0] as Vec);
                const [x, y] = board.getUsrCoordsOfMouse(event);
                drag = {
                    pointerId: event.pointerId, handle, target: [x, y], keys, scales: params.map(entry => entry.max - entry.min),
                    phase: 'probe', probeIndex: 0, candidates, origin: params.map(entry => entry.value), moved: false, start: [x, y],
                    startScreen: [event.clientX, event.clientY], lastSetUpdate: updates, waited: 0,
                };
                frame.classList.add('ux-grabbing');
                setHint(undefined);
                if (!raf) raf = requestAnimationFrame(step);
            };
            const pointerMove = (event: PointerEvent) => {
                if (drag && event.pointerId === drag.pointerId) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    const [x, y] = board.getUsrCoordsOfMouse(event);
                    drag.target = [x, y];
                    if (Math.hypot(event.clientX - drag.startScreen[0], event.clientY - drag.startScreen[1]) > 5) drag.moved = true;
                    return;
                }
                if (event.pointerType !== 'mouse' || locked()) return;
                const next = findTarget(event)[0]?.object;
                if (next !== hover) {
                    hover?.rendNode?.classList.remove('ux-grab-hover');
                    hover = next;
                    hover?.rendNode?.classList.add('ux-grab-hover');
                    frame.classList.toggle('ux-can-grab', Boolean(hover));
                }
            };
            const pointerUp = (event: PointerEvent) => {
                if (!drag || event.pointerId !== drag.pointerId) return;
                event.stopImmediatePropagation();
                const finished = drag;
                drag = undefined;
                frame.classList.remove('ux-grabbing');
                if (finished.phase === 'probe') finished.keys.forEach((key, i) => { if (i < finished.probeIndex) setParam(key, finished.origin[i]); });
                if (!finished.moved) {
                    // A tap pins the spot (or unpins a pin under the finger).
                    const near = pinList.findIndex(pin => Math.hypot((pin.at[0] - finished.handle.at[0]) * board.unitX, (pin.at[1] - finished.handle.at[1]) * board.unitY) < 16);
                    if (near >= 0) pinList.splice(near, 1);
                    else pinList.push({object: finished.handle.object, at: finished.handle.at, jacobian: []});
                    setPins(pinList.length);
                    if (pinList.length === 1 && near < 0) setHint('Žebljiček drži to točko krivulje. Zdaj povleci krivuljo drugje.');
                }
                draw();
            };
            clearPinsRef.current = () => { pinList = []; setPins(0); draw(); };
            const onView = () => draw();
            board.on('boundingbox', onView);
            frame.addEventListener('pointerdown', pointerDown, true);
            frame.addEventListener('pointermove', pointerMove, true);
            frame.addEventListener('pointerup', pointerUp, true);
            frame.addEventListener('pointercancel', pointerUp, true);
            return () => {
                cancelAnimationFrame(raf);
                board.off('update', onUpdate);
                board.off('boundingbox', onView);
                frame.removeEventListener('pointerdown', pointerDown, true);
                frame.removeEventListener('pointermove', pointerMove, true);
                frame.removeEventListener('pointerup', pointerUp, true);
                frame.removeEventListener('pointercancel', pointerUp, true);
                hover?.rendNode?.classList.remove('ux-grab-hover');
                overlay.remove();
            };
        });
    }, [props.frame]);
    useEffect(() => {
        if (!hint) return;
        const timer = window.setTimeout(() => setHint(undefined), 4200);
        return () => window.clearTimeout(timer);
    }, [hint]);
    return <>
        {hint && <p className="ux-grab-hint" role="status">{hint}</p>}
        {pins > 0 && <button type="button" className="ux-grab-unpin" onClick={() => clearPinsRef.current()}>Odstrani žebljičke ({pins})</button>}
    </>;
}

/** Gaussian elimination with partial pivoting; undefined when singular. */
function solve(a: number[][], b: number[]): number[] | undefined {
    const n = b.length;
    const m = a.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
        let pivot = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
        if (Math.abs(m[pivot][c]) < 1e-14) return undefined;
        [m[c], m[pivot]] = [m[pivot], m[c]];
        for (let r = 0; r < n; r++) {
            if (r === c) continue;
            const f = m[r][c] / m[c][c];
            for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
        }
    }
    return m.map((row, i) => row[n] / row[i]);
}
