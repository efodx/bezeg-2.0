import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {contentElements, coverBoard, elementSignature, findMainBoard, recoverBoards, svgRoot, type UxBoard, type UxElement} from './board';
import {bindControls} from './controls';
import {fanRows, rowName, type FanRow} from './fan';
import {visibleSamples, type Sample} from './geometrySamples';
import {coarsenGrid, refineGrid} from './morph';
import {pointNames} from './ParameterFan';
import './uxlab.css';

const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});

/** Shapes a learner would call "the curve": the things worth grabbing. Points are dragged by the graph itself. */
const GRABBABLE = new Set(['curve', 'functiongraph', 'line', 'segment', 'arc', 'circle', 'conic', 'ellipse', 'parabola', 'hyperbola', 'polygonalchain', 'spline', 'cardinalspline', 'plot', 'tangent', 'normal', 'semicircle', 'circumcircle', 'circumcirclearc', 'arrow', 'bisector', 'parallel', 'perpendicular']);
const POINTS = new Set(['point', 'glider']);
const COUNT_KEY = /^(degree|order|n|k|m|count|iterations?|steps?|terms|harmonics?|depth|level|levels|subdivisions?|rounds?|segments)$/i;
const ARROWS: Record<string, string> = {'1,0': '→', '-1,0': '←', '0,1': '↑', '0,-1': '↓', '1,1': '↗', '-1,1': '↖', '1,-1': '↘', '-1,-1': '↙'};

interface Knob {
    row: FanRow;
    /** Range of the delta (in the refined checkpoint's units) and its scale for normalisation. */
    low: number; high: number; scale: number;
    /** Whole steps only (grid points). */
    whole: boolean;
    snap?: number;
    name: string;
}

interface Session {
    key: string;
    base: LessonSceneCheckpoint;
    refined: unknown;
    knobs: Knob[];
    /** Normalised deltas (delta / scale). */
    u: number[];
    /** Jacobian: pixels the grabbed point moves per normalised unit, rows x and y. */
    jacobian: [number[], number[]];
    target: Sample;
    pending?: {target: Sample; before: Sample; step: number[]; distance: number};
    /** Largest normalised step per frame: grows while steps help, halves when one makes things worse. */
    trust: number;
    frame: number;
    ticks: number;
    lastGood: number[];
}

/** Drawn with a visible stroke: helper lines with no ink are not something a learner can grab. */
function inked(node: Element): boolean {
    const style = getComputedStyle(node);
    return style.stroke !== 'none' && Number(style.strokeOpacity || 1) > 0.05 && Number(style.opacity || 1) > 0.05 && parseFloat(style.strokeWidth || '1') > 0;
}

function stableKeyed(board: UxBoard): Map<string, UxElement> {
    const seen = new Map<string, number>();
    const result = new Map<string, UxElement>();
    for (const element of contentElements(board)) {
        if (!GRABBABLE.has(element.elType) || !element.rendNode || !inked(element.rendNode)) continue;
        const signature = elementSignature(element);
        const index = seen.get(signature) ?? 0;
        seen.set(signature, index + 1);
        result.set(`${signature}#${index}`, element);
    }
    return result;
}

function nearest(samples: readonly Sample[], point: Sample): {at: Sample; distance: number} | undefined {
    let best: Sample | undefined;
    let bestDistance = Infinity;
    for (let i = 0; i < samples.length; i++) {
        const dx = samples[i][0] - point[0], dy = samples[i][1] - point[1];
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) { bestDistance = distance; best = samples[i]; }
    }
    return best ? {at: best, distance: Math.sqrt(bestDistance)} : undefined;
}

function applyDeltas(value: unknown, knobs: readonly Knob[], deltas: readonly number[]): unknown {
    const copy = JSON.parse(JSON.stringify(value)) as unknown;
    knobs.forEach((knob, index) => {
        for (const leaf of knob.row.leaves) {
            let node = copy as Record<string | number, unknown>;
            for (let i = 0; i < leaf.path.length - 1; i++) node = node[leaf.path[i]] as Record<string | number, unknown>;
            node[leaf.path[leaf.path.length - 1]] = Number((leaf.value + deltas[index]).toFixed(9));
        }
    });
    return copy;
}

function format(value: number): string {
    const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    let text = value.toFixed(digits);
    if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text.replace('.', ',').replace('-', '−');
}

/** A chip's text: a quantity shows its value and which way it goes, a point only which way it moves. */
function describe(knob: Knob, d: number): string {
    if (knob.row.kind === 'point') return knob.row.axis === 'x' ? (d > 0 ? '→' : '←') : (d > 0 ? '↑' : '↓');
    return `${format(knob.row.leaves[0].value + d)} ${d > 0 ? '↑' : '↓'}`;
}

function delta(knob: Knob, u: number): number {
    const raw = u * knob.scale;
    return knob.whole ? Math.round(raw) : raw;
}

/**
 * Lane B b12: grab any curve and pull it. The free quantities of the scene (the same ones the inspector's sliders hold)
 * are solved for, frame by frame, so the curve follows the finger with the least change to them; the sliders move by
 * themselves. A Broyden update keeps the linear model of "how the curve moves" current without extra probes.
 */
export function CurveGrab(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [hint, setHint] = useState(true);
    const [busy, setBusy] = useState(false);
    const [chips, setChips] = useState<{name: string; text: string}[]>([]);
    const [result, setResult] = useState<{text: string; undo?: LessonSceneCheckpoint}>();
    const session = useRef<Session>();
    const layer = useRef<SVGGElement>();
    const hovered = useRef<Element>();
    const resultTimer = useRef(0);
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const lockedRef = useRef(props.locked);
    lockedRef.current = props.locked;
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

    useEffect(() => {
        if (!board) return;
        const svg = () => svgRoot(board);
        const toBoard = (event: PointerEvent): Sample | undefined => {
            const root = svg();
            if (!root) return undefined;
            const rect = root.getBoundingClientRect();
            if (rect.width === 0) return undefined;
            return [(event.clientX - rect.left) * board.canvasWidth / rect.width, (event.clientY - rect.top) * board.canvasHeight / rect.height];
        };
        const overlay = () => {
            const root = svg();
            if (!root) return undefined;
            if (!layer.current || !layer.current.isConnected) {
                layer.current = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                layer.current.setAttribute('class', 'ux-grab-layer');
                layer.current.setAttribute('pointer-events', 'none');
                root.appendChild(layer.current);
            }
            return layer.current;
        };
        const nearPoint = (at: Sample, reach: number) => board.objectsList.some(element => {
            if (!POINTS.has(element.elType) || element.visPropCalc?.visible === false) return false;
            const coords = (element as unknown as {coords?: {scrCoords?: number[]}}).coords?.scrCoords;
            if (!coords) return false;
            const draggable = element.isDraggable !== false && element.visProp?.fixed !== true;
            return draggable && Math.hypot(coords[1] - at[0], coords[2] - at[1]) < reach;
        });
        const curveAt = (at: Sample, reach: number): {key: string; element: UxElement; distance: number} | undefined => {
            let best: {key: string; element: UxElement; distance: number} | undefined;
            for (const [key, element] of stableKeyed(board)) {
                const found = nearest(visibleSamples(element.rendNode!, board.canvasWidth, board.canvasHeight, 3), at);
                if (found && found.distance < reach && (!best || found.distance < best.distance)) best = {key, element, distance: found.distance};
            }
            return best;
        };
        const samplesOf = (key: string): Sample[] | undefined => {
            const element = stableKeyed(board).get(key);
            return element ? visibleSamples(element.rendNode!, board.canvasWidth, board.canvasHeight, 2) : undefined;
        };
        const setHover = (node?: Element) => {
            if (hovered.current === node) return;
            hovered.current?.classList.remove('ux-grab-hover');
            hovered.current = node;
            node?.classList.add('ux-grab-hover');
            board.containerObj.classList.toggle('ux-grab-can', Boolean(node));
        };

        const draw = (current: Session, at?: Sample) => {
            const g = overlay();
            if (!g) return;
            const [fx, fy] = current.target;
            let markup = g.querySelector('.ux-grab-ghost')?.outerHTML ?? '';
            if (at && Math.hypot(at[0] - fx, at[1] - fy) > 4) markup += `<line x1="${at[0].toFixed(1)}" y1="${at[1].toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" class="ux-grab-band"/>`;
            markup += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="13" class="ux-grab-hand"/><circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="3.5" class="ux-grab-dot"/>`;
            g.innerHTML = markup;
        };

        const showChips = (current: Session) => {
            const chipsNow: {name: string; text: string}[] = [];
            const pointsMoved = new Map<string, {name: string; x: number; y: number}>();
            current.knobs.forEach((knob, index) => {
                const d = delta(knob, current.u[index]);
                if (Math.abs(current.u[index]) <= 0.004 || d === 0) return;
                if (knob.row.kind !== 'point') { chipsNow.push({name: knob.name, text: describe(knob, d)}); return; }
                const entry = pointsMoved.get(knob.row.key) ?? {name: knob.name, x: 0, y: 0};
                entry[knob.row.axis === 'x' ? 'x' : 'y'] = Math.sign(d);
                pointsMoved.set(knob.row.key, entry);
            });
            for (const {name, x, y} of pointsMoved.values()) chipsNow.push({name, text: ARROWS[`${x},${y}`] ?? ''});
            setChips(chipsNow.slice(0, 5));
        };

        const restore = (current: Session, u: readonly number[]) => {
            const deltas = current.knobs.map((knob, index) => delta(knob, u[index]));
            caps.current.restoreState({version: 1, value: applyDeltas(current.refined, current.knobs, deltas)});
        };

        const tick = () => {
            const current = session.current;
            if (!current) return;
            current.frame = requestAnimationFrame(tick);
            // The graph draws after its host commits: read the result of a step one frame later.
            if (++current.ticks % 2 === 1) return;
            if (recoverBoards()) {
                current.u = [...current.lastGood];
                try { restore(current, current.u); } catch { recoverBoards(); }
                current.pending = undefined;
                return;
            }
            const samples = samplesOf(current.key);
            if (!samples || samples.length === 0) return;
            const J = current.jacobian;
            if (current.pending) {
                // Broyden: correct the linear model by what the last step really did.
                const after = nearest(samples, current.pending.target);
                const step = current.pending.step;
                const norm = step.reduce((sum, value) => sum + value * value, 0);
                if (after && norm > 1e-10) {
                    for (const axis of [0, 1] as const) {
                        const observed = after.at[axis] - current.pending.before[axis];
                        const predicted = J[axis].reduce((sum, value, index) => sum + value * step[index], 0);
                        const error = observed - predicted;
                        for (let i = 0; i < step.length; i++) J[axis][i] += error * step[i] / norm;
                    }
                }
                const worse = after && after.distance > current.pending.distance * 1.1 + 1.5;
                current.pending = undefined;
                if (worse || !after) {
                    // A step that pushed the curve away (a circle through three nearly collinear points, a pole): take
                    // it back and move more carefully. The model above has already learnt from it.
                    current.trust = Math.max(0.004, current.trust * 0.5);
                    current.u = [...current.lastGood];
                    try { restore(current, current.u); } catch { recoverBoards(); }
                    showChips(current);
                    return;
                }
                current.trust = Math.min(0.1, current.trust * 1.25);
                current.lastGood = [...current.u];
            }
            const found = nearest(samples, current.target);
            if (!found) return;
            draw(current, found.at);
            const rx = current.target[0] - found.at[0], ry = current.target[1] - found.at[1];
            const distance = Math.hypot(rx, ry);
            if (distance < 0.8) return;
            // Only the gap across the curve matters: a finger sliding along the curve leaves it where it is.
            const nx = rx / distance, ny = ry / distance;
            const across = J[0].map((value, index) => nx * value + ny * J[1][index]);
            const strength = across.reduce((sum, value) => sum + value * value, 0);
            if (strength < 1e-6) return;
            let step = across.map(value => value * distance / (strength + 4));
            const largest = Math.max(...step.map(Math.abs));
            if (largest > current.trust) step = step.map(value => value * current.trust / largest);
            const next = current.u.map((value, index) => {
                const knob = current.knobs[index];
                return Math.min(knob.high / knob.scale, Math.max(knob.low / knob.scale, value + step[index]));
            });
            // What the graph will really see: whole-step quantities only move once the solve crosses a step.
            const effective = (u: readonly number[]) => u.map((value, index) => delta(current.knobs[index], value) / current.knobs[index].scale);
            const was = effective(current.u);
            const actual = effective(next).map((value, index) => value - was[index]);
            if (actual.every(value => Math.abs(value) < 1e-7)) { current.u = next; return; }
            try {
                restore(current, next);
                current.pending = {target: [...current.target] as Sample, before: found.at, step: actual, distance};
                current.u = next;
                showChips(current);
            } catch {
                recoverBoards();
                try { restore(current, current.lastGood); } catch { recoverBoards(); }
                current.u = [...current.lastGood];
            }
        };

        const finish = () => {
            const current = session.current;
            if (!current) return;
            cancelAnimationFrame(current.frame);
            session.current = undefined;
            window.removeEventListener('pointermove', onMove, true);
            window.removeEventListener('pointerup', finish, true);
            window.removeEventListener('pointercancel', finish, true);
            board.containerObj.classList.remove('ux-grab-active');
            // Back to the graph's own grid and slider steps, so the kept scene is one the controls can show.
            const deltas = current.knobs.map((knob, index) => {
                const d = delta(knob, current.u[index]);
                if (!knob.snap) return d;
                return Math.round((knob.row.leaves[0].value + d) / knob.snap) * knob.snap - knob.row.leaves[0].value;
            });
            const value = coarsenGrid(applyDeltas(current.refined, current.knobs, deltas), current.base.value);
            try { caps.current.restoreState({version: 1, value}); } catch { recoverBoards(); try { caps.current.restoreState(current.base); } catch { recoverBoards(); } }
            window.setTimeout(() => { if (layer.current) layer.current.innerHTML = ''; }, 40);
            const changed = current.knobs.map((knob, index) => ({knob, d: deltas[index]})).filter(({d}) => Math.abs(d) > 1e-6);
            setChips([]);
            window.clearTimeout(resultTimer.current);
            if (changed.length === 0) { setResult(undefined); return; }
            const quantities = changed.filter(({knob}) => knob.row.kind !== 'point').map(({knob, d}) => `${knob.name}: ${format(knob.row.leaves[0].value)} → ${format(knob.row.leaves[0].value + d)}`);
            const points = [...new Set(changed.filter(({knob}) => knob.row.kind === 'point').map(({knob}) => knob.name))];
            const parts = quantities.slice(0, 3);
            if (quantities.length > 3) parts.push(`še ${quantities.length - 3}`);
            if (points.length === 1) parts.push(`premaknjena ${points[0]}`);
            else if (points.length > 1) parts.push(`premaknjene: ${points.slice(0, 5).join(', ')}${points.length > 5 ? ' …' : ''}`);
            const text = parts.join(' · ');
            setResult({text, undo: current.base});
            resultTimer.current = window.setTimeout(() => setResult(undefined), 9000);
        };

        const onMove = (event: PointerEvent) => {
            const current = session.current;
            if (!current) return;
            const at = toBoard(event);
            if (at) current.target = at;
            event.preventDefault();
        };

        const start = async (key: string, element: UxElement, at: Sample, pointer: number) => {
            let base: LessonSceneCheckpoint;
            try { base = caps.current.captureState(); } catch { return; }
            // The shape as it was, kept faintly while pulling (cloned before any probe redraws the board).
            const ghost = element.rendNode!.cloneNode(true) as SVGElement;
            ghost.removeAttribute('id');
            ghost.setAttribute('class', 'ux-grab-ghost');
            let refined = refineGrid(base.value);
            let gridded = JSON.stringify(refined) !== JSON.stringify(base.value);
            if (gridded) {
                // A finer grid lets points slide, but not every graph draws all of itself on one: check behind a cover.
                // The refined scene is the same scene: every element must be drawn where it was.
                const boxes = () => contentElements(board).map(element => {
                    try { const box = (element.rendNode as SVGGraphicsElement).getBBox(); return [box.x, box.y, box.width, box.height]; } catch { return [0, 0, 0, 0]; }
                });
                const shown = boxes();
                const same = (other: number[][]) => other.length === shown.length && other.every((box, index) => box.every((value, k) => Math.abs(value - shown[index][k]) < 1.5));
                const test = coverBoard(board.containerObj);
                try {
                    caps.current.restoreState({version: 1, value: refined});
                    await nextFrames(2);
                    if (recoverBoards() || !same(boxes())) { refined = base.value; gridded = false; }
                } catch { recoverBoards(); refined = base.value; gridded = false; }
                if (!gridded) { try { caps.current.restoreState(base); } catch { recoverBoards(); } await nextFrames(2); recoverBoards(); }
                test.remove();
            }
            const coarse = !gridded && JSON.stringify(refineGrid(base.value)) !== JSON.stringify(base.value);
            const {rows, candidates} = fanRows(refined, board.getBoundingBox(), 16, found => bindControls(found, props.root.current ?? document));
            // Counts and whole-number choices do not slide: the solver moves continuous quantities only.
            const usable = rows.filter(row => row.kind === 'point' || !COUNT_KEY.test(row.key.split('.').pop() ?? ''));
            if (usable.length === 0) { setResult({text: 'Ta prizor nima zveznih količin, ki bi jih lahko vlekel.'}); return; }
            const knobs: Knob[] = usable.map(row => {
                const low = Math.min(0, ...row.deltas), high = Math.max(0, ...row.deltas);
                const point = row.kind === 'point';
                const reach = point ? 2.5 : 1;
                const scale = Math.max(1e-6, (high - low) * reach);
                const whole = point && (gridded || coarse);
                return {row, low: low * reach, high: high * reach, scale, whole, snap: !point && row.label && row.step ? row.step : undefined, name: rowName(row).replace(/\s[↔↕]$/, '')};
            });
            const named = pointNames(board, usable, candidates.grid);
            knobs.forEach(knob => { const name = named.get(knob.row.key); if (name) knob.name = name; });
            setBusy(true);
            setHint(false);
            const cover = coverBoard(board.containerObj);
            const measure = () => {
                const samples = samplesOf(key);
                return samples ? nearest(samples, at)?.at : undefined;
            };
            const jacobian: [number[], number[]] = [knobs.map(() => 0), knobs.map(() => 0)];
            try {
                caps.current.restoreState({version: 1, value: refined});
                await nextFrames(2);
                recoverBoards();
                const origin = measure();
                if (origin) {
                    for (let index = 0; index < knobs.length; index++) {
                        const knob = knobs[index];
                        let h = 0.04;
                        if (knob.whole) h = Math.max(1, Math.round(0.04 * knob.scale)) / knob.scale;
                        if (h * knob.scale > knob.high) h = -h;
                        const u = knobs.map((_, other) => other === index ? h : 0);
                        const tryStep = async (): Promise<boolean> => {
                            try {
                                caps.current.restoreState({version: 1, value: applyDeltas(refined, knobs, knobs.map((item, other) => delta(item, u[other])))});
                                await nextFrames(2);
                                return !recoverBoards();
                            } catch { recoverBoards(); return false; }
                        };
                        let accepted = await tryStep();
                        // A whole number stored as a number (half-degrees, a step count) may refuse fractions: try whole steps.
                        if (!accepted && !knob.whole && Number.isInteger(knob.row.leaves[0].value)) {
                            knob.whole = true;
                            h = Math.sign(h) * Math.max(1, Math.round(0.04 * knob.scale)) / knob.scale;
                            u[index] = h;
                            accepted = await tryStep();
                        }
                        try {
                            if (!accepted) continue;
                            const moved = measure();
                            if (moved) { jacobian[0][index] = (moved[0] - origin[0]) / h; jacobian[1][index] = (moved[1] - origin[1]) / h; }
                        } catch { recoverBoards(); }
                        if (caps.current.isAvailable?.() === false) break;
                    }
                }
                caps.current.restoreState({version: 1, value: refined});
                await nextFrames(2);
                recoverBoards();
            } catch { recoverBoards(); }
            cover.remove();
            setBusy(false);
            // Quantities that do not move this curve stay out of the solve.
            const kept = knobs.map((knob, index) => ({knob, index})).filter(({index}) => Math.hypot(jacobian[0][index], jacobian[1][index]) * 0.04 > 0.25);
            if (kept.length === 0) {
                try { caps.current.restoreState(base); } catch { recoverBoards(); }
                setResult({text: 'Te krivulje ne premakne nobena količina: je trdna.'});
                window.clearTimeout(resultTimer.current);
                resultTimer.current = window.setTimeout(() => setResult(undefined), 5000);
                return;
            }
            const used = kept.map(({knob}) => knob);
            const current: Session = {
                key, base, refined, knobs: used, u: used.map(() => 0),
                jacobian: [kept.map(({index}) => jacobian[0][index]), kept.map(({index}) => jacobian[1][index])],
                target: session.current?.target ?? at, frame: 0, ticks: 0, lastGood: used.map(() => 0), trust: 0.04,
            };
            session.current = current;
            const g = overlay();
            if (g) { g.innerHTML = ''; g.appendChild(ghost); }
            current.frame = requestAnimationFrame(tick);
            void pointer;
        };

        const onDown = (event: PointerEvent) => {
            if (lockedRef.current || session.current || event.button > 0) return;
            const root = svg();
            const target = event.target as Node | null;
            if (!root || !target || !root.contains(target)) return;
            const at = toBoard(event);
            if (!at) return;
            const touch = event.pointerType !== 'mouse';
            if (nearPoint(at, touch ? 22 : 12)) return;
            const hit = curveAt(at, touch ? 20 : 10);
            if (!hit) return;
            if (window.location.search.includes('uxdebug')) console.info(`[ux b12] grab ${hit.key} at ${at.map(Math.round)} distance ${hit.distance.toFixed(1)}`);
            event.preventDefault();
            event.stopImmediatePropagation();
            setHover(undefined);
            setResult(undefined);
            board.containerObj.classList.add('ux-grab-active');
            // Pointer moves during the probe already count: the curve catches up with the finger once it is ready.
            session.current = undefined;
            const pending = {target: at};
            const early = (move: PointerEvent) => { const p = toBoard(move); if (p) pending.target = p; };
            window.addEventListener('pointermove', early, true);
            const stopEarly = () => { window.removeEventListener('pointermove', early, true); };
            let released = false;
            const releasedEarly = () => { released = true; };
            window.addEventListener('pointerup', releasedEarly, true);
            void start(hit.key, hit.element, at, event.pointerId).then(() => {
                stopEarly();
                window.removeEventListener('pointerup', releasedEarly, true);
                if (!session.current) { board.containerObj.classList.remove('ux-grab-active'); return; }
                session.current.target = pending.target;
                window.addEventListener('pointermove', onMove, true);
                window.addEventListener('pointerup', finish, true);
                window.addEventListener('pointercancel', finish, true);
                // A quick tap: one short pull towards where the finger ended, then keep.
                if (released) window.setTimeout(finish, 450);
            });
        };

        let hoverFrame = 0;
        const onHover = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse' || session.current || lockedRef.current) return;
            cancelAnimationFrame(hoverFrame);
            hoverFrame = requestAnimationFrame(() => {
                const root = svg();
                const target = event.target as Node | null;
                if (!root || !target || !root.contains(target) || event.buttons) { setHover(undefined); return; }
                const at = toBoard(event);
                if (!at || nearPoint(at, 12)) { setHover(undefined); return; }
                const hit = curveAt(at, 10);
                setHover(hit?.element.rendNode);
            });
        };

        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointermove', onHover, true);
        return () => {
            window.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointermove', onHover, true);
            cancelAnimationFrame(hoverFrame);
            setHover(undefined);
            if (session.current) finish();
            layer.current?.remove();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [board]);

    if (!board || props.locked) return null;
    const ui = <>
        {hint && !busy && !result && <div className="ux-grab-hint" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16"><path d="M7 10V4.5a1.3 1.3 0 0 1 2.6 0V9 M9.6 8.5V3.6a1.3 1.3 0 0 1 2.6 0V9 M12.2 8.6V4.8a1.3 1.3 0 0 1 2.6 0v6.4c0 3.4-2.2 5.8-5.4 5.8-2.2 0-3.6-1.1-4.7-3L3 10.5a1.3 1.3 0 0 1 2.1-1.5L7 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Primi krivuljo in jo povleci
        </div>}
        {busy && <div className="ux-grab-hint is-busy" role="status">Iščem, kaj premika to krivuljo …</div>}
        {chips.length > 0 && <div className="ux-grab-chips" aria-live="off">{chips.map(chip => <span key={chip.name}><b>{chip.name}</b> {chip.text}</span>)}</div>}
        {result && <div className="ux-grab-result" role="status">
            <span>{result.text}</span>
            {result.undo && <button type="button" onClick={() => {
                try { props.capabilities.restoreState(result.undo!); } catch { recoverBoards(); }
                setResult(undefined);
            }}>Razveljavi</button>}
        </div>}
    </>;
    return createPortal(ui, board.containerObj);
}
