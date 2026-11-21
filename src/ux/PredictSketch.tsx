import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {watchBoard} from './boardAccess';
import './PredictSketch.css';

/**
 * a5 — Predict first. Before the graph changes (the lesson's Next, a drag, a parameter), the learner sketches on the board
 * where they think the curve will go. When the scene changes and settles, the sketch stays on the board, coloured by how
 * close each part came to the curves that actually moved, with a score. When the lesson's text asks for a prediction
 * ("napovej", "predvidi", "ugani"), the pencil invites the learner to draw first; no per-lesson metadata is needed.
 */

type Vec = [number, number];
type BoardObject = {
    id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean};
    points?: {usrCoords: number[]}[]; center?: {coords: {usrCoords: number[]}}; Radius?: () => number;
    point1?: {coords: {usrCoords: number[]}}; point2?: {coords: {usrCoords: number[]}};
};
type BoardLike = Board & {
    objectsList: BoardObject[]; containerObj: HTMLElement;
    getBoundingBox(): number[]; on(e: string, h: () => void): void; off(e: string, h: () => void): void;
    getUsrCoordsOfMouse(event: Event): number[];
};

const NEAR_PX = 16;
const PROMPT_WORDS = /napove|predvidi|ugani|kaj misliš|kaj pričakuješ|predict|guess|what do you expect/i;

interface Verdict { score: number; precision: number; coverage: number }

function signature(node: Element | undefined): string {
    if (!node) return '';
    return ['d', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry'].map(name => node.getAttribute(name) ?? '').join('|');
}

/** Screen-space polylines of a board object, for distance checks. */
function polylines(object: BoardObject, toScreen: (p: Vec) => Vec, bbox: number[]): Vec[][] {
    if (object.elType === 'circle' && object.center && object.Radius) {
        const [, cx, cy] = object.center.coords.usrCoords;
        const r = object.Radius();
        return [Array.from({length: 121}, (_, i) => toScreen([cx + r * Math.cos(i / 120 * 2 * Math.PI), cy + r * Math.sin(i / 120 * 2 * Math.PI)]))];
    }
    if (object.point1 && object.point2) {
        const a = object.point1.coords.usrCoords, b = object.point2.coords.usrCoords;
        if (!a[0] || !b[0]) return [];
        const ax = a[1] / a[0], ay = a[2] / a[0], bx = b[1] / b[0], by = b[2] / b[0];
        if (object.elType === 'segment' || object.elType === 'arrow') return [[toScreen([ax, ay]), toScreen([bx, by])]];
        // An infinite line: extend across the view.
        const span = Math.abs(bbox[2] - bbox[0]) + Math.abs(bbox[1] - bbox[3]);
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const ux = (bx - ax) / len, uy = (by - ay) / len;
        return [[toScreen([ax - ux * span, ay - uy * span]), toScreen([ax + ux * span, ay + uy * span])]];
    }
    if (!object.points) return [];
    const out: Vec[][] = [];
    let current: Vec[] = [];
    for (const point of object.points) {
        const [z, x, y] = point.usrCoords;
        if (!z || !Number.isFinite(x / z) || !Number.isFinite(y / z)) { if (current.length > 1) out.push(current); current = []; continue; }
        current.push(toScreen([x / z, y / z]));
    }
    if (current.length > 1) out.push(current);
    return out;
}

function distanceToPolylines(p: Vec, lines: Vec[][]): number {
    let best = Infinity;
    for (const line of lines) for (let i = 0; i + 1 < line.length; i++) {
        const [ax, ay] = line[i], [bx, by] = line[i + 1];
        const vx = bx - ax, vy = by - ay;
        const l2 = vx * vx + vy * vy;
        const s = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - ay) * vy) / l2));
        const d = Math.hypot(p[0] - ax - s * vx, p[1] - ay - s * vy);
        if (d < best) best = d;
    }
    return best;
}

/** Points along polylines every `spacing` px. */
function resample(lines: Vec[][], spacing: number): Vec[] {
    const out: Vec[] = [];
    for (const line of lines) {
        let carry = 0;
        for (let i = 0; i + 1 < line.length; i++) {
            const [ax, ay] = line[i], [bx, by] = line[i + 1];
            const length = Math.hypot(bx - ax, by - ay);
            let t = carry;
            while (t < length) { out.push([ax + (bx - ax) * t / length, ay + (by - ay) * t / length]); t += spacing; }
            carry = t - length;
        }
    }
    return out;
}

export function PredictSketch(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [drawing, setDrawing] = useState(false);
    const [hasSketch, setHasSketch] = useState(false);
    const [verdict, setVerdict] = useState<Verdict>();
    const [invited, setInvited] = useState(false);
    const drawingRef = useRef(drawing);
    drawingRef.current = drawing;
    const api = useRef<{clear(): void; finish(): void}>({clear: () => undefined, finish: () => undefined});
    // The lesson asks for a prediction: invite the pencil.
    useEffect(() => {
        const read = () => {
            const card = document.querySelector('.guided-lesson');
            setInvited(Boolean(card && PROMPT_WORDS.test(card.textContent ?? '')));
        };
        read();
        const observer = new MutationObserver(read);
        const root = props.frame.current?.closest('.demonstration-workspace') ?? document.body;
        observer.observe(root, {subtree: true, childList: true, characterData: true});
        return () => observer.disconnect();
    }, [props.frame]);
    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        return watchBoard(frame, (rawBoard: Board) => {
            const board = rawBoard as BoardLike;
            const container = board.containerObj;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'ux-predict-layer');
            svg.setAttribute('aria-hidden', 'true');
            frame.appendChild(svg);
            const capture = document.createElement('div');
            capture.className = 'ux-predict-capture';
            frame.appendChild(capture);
            let strokes: Vec[][] = [];
            let active: Vec[] | undefined;
            let baseline: Map<string, string> | undefined;
            let changed = new Set<string>();
            let settleTimer = 0;
            let scored: {segments: {a: Vec; b: Vec; near: boolean}[]} | undefined;
            const toScreen = (p: Vec): Vec => {
                const box = board.getBoundingBox();
                return [(p[0] - box[0]) / (box[2] - box[0]) * container.clientWidth, (box[1] - p[1]) / (box[1] - box[3]) * container.clientHeight];
            };
            const draw = () => {
                const parts: string[] = [];
                if (scored) {
                    for (const segment of scored.segments) {
                        const [ax, ay] = toScreen(segment.a), [bx, by] = toScreen(segment.b);
                        parts.push(`<line class="${segment.near ? 'near' : 'far'}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`);
                    }
                } else {
                    for (const stroke of active ? [...strokes, active] : strokes) {
                        if (stroke.length < 2) continue;
                        parts.push(`<polyline points="${stroke.map(p => toScreen(p).join(',')).join(' ')}"/>`);
                    }
                }
                svg.innerHTML = parts.join('');
            };
            const watched = () => (board.objectsList as BoardObject[]).filter(object => object.visPropCalc?.visible && object.rendNode && object.elType !== 'axis' && object.elType !== 'ticks'
                && (object.type === 8 || object.elType === 'circle' || ((object.elType === 'line' || object.elType === 'segment' || object.elType === 'arrow') && object.point1)));
            const takeBaseline = () => {
                baseline = new Map(watched().map(object => [object.id, signature(object.rendNode)]));
                changed = new Set();
            };
            const evaluate = () => {
                settleTimer = 0;
                if (!baseline || strokes.length === 0) return;
                const box = board.getBoundingBox();
                const moved = watched().filter(object => changed.has(object.id));
                if (moved.length === 0) return;
                const curveLines = moved.flatMap(object => polylines(object, toScreen, box));
                const sketchLines = strokes.map(stroke => stroke.map(toScreen));
                const sketchSamples = resample(sketchLines, 6);
                if (sketchSamples.length === 0) return;
                const precision = sketchSamples.filter(p => distanceToPolylines(p, curveLines) <= NEAR_PX).length / sketchSamples.length;
                // Coverage: how much of the moved curve inside the sketch's own region the sketch follows.
                const xs = sketchSamples.map(p => p[0]), ys = sketchSamples.map(p => p[1]);
                const region = [Math.min(...xs) - 30, Math.min(...ys) - 30, Math.max(...xs) + 30, Math.max(...ys) + 30];
                const curveSamples = resample(curveLines, 8).filter(([x, y]) => x >= region[0] && x <= region[2] && y >= region[1] && y <= region[3]);
                const coverage = curveSamples.length === 0 ? 0 : curveSamples.filter(p => distanceToPolylines(p, sketchLines) <= NEAR_PX).length / curveSamples.length;
                const score = Math.round(100 * (0.6 * precision + 0.4 * coverage));
                const segments: {a: Vec; b: Vec; near: boolean}[] = [];
                for (const stroke of strokes) for (let i = 0; i + 1 < stroke.length; i++) {
                    const mid = toScreen([(stroke[i][0] + stroke[i + 1][0]) / 2, (stroke[i][1] + stroke[i + 1][1]) / 2]);
                    segments.push({a: stroke[i], b: stroke[i + 1], near: distanceToPolylines(mid, curveLines) <= NEAR_PX});
                }
                scored = {segments};
                setVerdict({score, precision, coverage});
                draw();
            };
            const onUpdate = () => {
                if (!baseline || drawingRef.current || scored) return;
                for (const object of watched()) {
                    const before = baseline.get(object.id);
                    if (before === undefined || before !== signature(object.rendNode)) changed.add(object.id);
                }
                if (changed.size === 0) return;
                window.clearTimeout(settleTimer);
                settleTimer = window.setTimeout(evaluate, 650);
            };
            const down = (event: PointerEvent) => {
                if (!drawingRef.current || event.button !== 0) return;
                event.preventDefault();
                capture.setPointerCapture(event.pointerId);
                const [x, y] = board.getUsrCoordsOfMouse(event);
                active = [[x, y]];
                draw();
            };
            const move = (event: PointerEvent) => {
                if (!active) return;
                const [x, y] = board.getUsrCoordsOfMouse(event);
                active.push([x, y]);
                draw();
            };
            const up = () => {
                if (!active) return;
                if (active.length > 1) strokes.push(active);
                active = undefined;
                setHasSketch(strokes.length > 0);
                draw();
            };
            capture.addEventListener('pointerdown', down);
            capture.addEventListener('pointermove', move);
            capture.addEventListener('pointerup', up);
            capture.addEventListener('pointercancel', up);
            api.current = {
                clear: () => { strokes = []; scored = undefined; baseline = undefined; setHasSketch(false); setVerdict(undefined); draw(); },
                // Leaving the pencil fixes the prediction: from now on, a change of the scene is what it is compared with.
                finish: () => { if (strokes.length > 0) takeBaseline(); },
            };
            const onView = () => draw();
            board.on('update', onUpdate);
            board.on('boundingbox', onView);
            return () => {
                window.clearTimeout(settleTimer);
                board.off('update', onUpdate);
                board.off('boundingbox', onView);
                svg.remove();
                capture.remove();
            };
        });
    }, [props.frame]);
    useEffect(() => {
        props.frame.current?.classList.toggle('ux-predicting', drawing);
    }, [drawing, props.frame]);
    const toggle = () => {
        if (drawing) { setDrawing(false); api.current.finish(); }
        else { if (verdict) api.current.clear(); setDrawing(true); }
    };
    const verdictText = verdict && (verdict.score >= 80 ? 'Odlično predvideno!' : verdict.score >= 50 ? 'Blizu — poglej, kje se razlikuje.' : 'Graf je šel drugam. Kje se je tvoja napoved zmotila?');
    return <div className="ux-predict-tools">
        <button type="button" className={`ux-predict-toggle${invited && !drawing && !hasSketch && !verdict ? ' is-invited' : ''}`} aria-pressed={drawing} onClick={toggle}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 17 L4 13 L13 4 L16 7 L7 16 Z M11.5 5.5 L14.5 8.5"/></svg>
            {drawing ? (hasSketch ? 'Zakleni napoved' : 'Riši napoved …') : verdict ? 'Nova napoved' : hasSketch ? 'Napoved čaka' : 'Napovej'}
        </button>
        {drawing && hasSketch && <button type="button" onClick={() => api.current.clear()}>Pobriši</button>}
        {invited && !drawing && !hasSketch && !verdict && <p className="ux-predict-invite">Lekcija te prosi za napoved: najprej jo nariši na graf.</p>}
        {!drawing && hasSketch && !verdict && <p className="ux-predict-invite">Napoved je zaklenjena. Zdaj spremeni graf ali pojdi naprej.</p>}
        {verdict && <div className="ux-predict-verdict" role="status">
            <strong>{verdict.score} %</strong><span>{verdictText}</span>
            <small><i className="near"/> blizu <i className="far"/> drugje</small>
        </div>}
    </div>;
}
