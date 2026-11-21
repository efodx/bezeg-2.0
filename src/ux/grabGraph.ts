/**
 * Prototype c4 "Primi graf" (grab the graph). Borrowed from direct manipulation in creative tools and from inverse
 * kinematics in game engines and puppet rigs: grab any drawn curve or line and pull it, and the parameters follow your
 * hand. On grab the board briefly nudges every visible slider to measure how the grabbed spot moves (a numerical
 * Jacobian); while dragging, a damped least-squares step turns the hand's offset into slider changes. The sliders move
 * in the inspector, and chips at the hand name the parameters that are doing the work.
 */
import type {Board} from "jsxgraph";
import {boardShapes, sampleShape, Shape} from "./boardShapes";
import {RegisteredSlider, usableSliders} from "./sliderRegistry";
import {formatNumber} from "../analysis/format";
import "./ux.css";

type Vec = [number, number];
const GRAB_RADIUS = 11;
const POINT_RADIUS = 14;

function frames(count = 2): Promise<void> {
    return new Promise(resolve => {
        const step = (left: number) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)));
        step(count);
    });
}

function nearestOn(points: Vec[], target: Vec): {point: Vec; distance: number} {
    let best: Vec = points[0], bestDistance = Infinity;
    for (const point of points) {
        const d = Math.hypot(point[0] - target[0], point[1] - target[1]);
        if (d < bestDistance) { bestDistance = d; best = point; }
    }
    return {point: best, distance: bestDistance};
}

const GRABBABLE = new Set(['curve', 'functiongraph', 'line', 'segment', 'circle', 'arc', 'conic']);

const kindOf = (shape: Shape) => `${shape.element.elType}|${shape.node.getAttribute('stroke') ?? ''}`;

function strokeShapes(board: Board, kind?: string): {shape: Shape; points: Vec[]}[] {
    return boardShapes(board)
        .filter(shape => !shape.dot && GRABBABLE.has(shape.element.elType) && (!kind || kindOf(shape) === kind))
        .map(shape => ({shape, points: sampleShape(shape, 3)}))
        .filter(entry => entry.points.length > 1);
}

/** The nearest drawn stroke point to `target`, optionally only on shapes of the grabbed kind. */
function nearestStroke(board: Board, target: Vec, kind?: string): {point: Vec; distance: number; kind: string} | undefined {
    let best: {point: Vec; distance: number; kind: string} | undefined;
    for (const {shape, points} of strokeShapes(board, kind)) {
        const shapeKind = kindOf(shape);
        const near = nearestOn(points, target);
        if (!best || near.distance < best.distance) best = {...near, kind: shapeKind};
    }
    return best;
}

function nearDraggablePoint(board: Board, target: Vec): boolean {
    return boardShapes(board).some(shape => {
        if (!shape.dot || !shape.element.isDraggable || shape.element.visProp?.fixed) return false;
        const cx = Number(shape.node.getAttribute('cx')), cy = Number(shape.node.getAttribute('cy'));
        return Math.hypot(cx - target[0], cy - target[1]) < POINT_RADIUS;
    });
}

function snap(slider: RegisteredSlider, value: number): number {
    const clamped = Math.min(slider.max, Math.max(slider.min, value));
    const snapped = slider.step > 0 ? slider.min + Math.round((clamped - slider.min) / slider.step) * slider.step : clamped;
    return Math.round(Math.min(slider.max, Math.max(slider.min, snapped)) * 1e9) / 1e9;
}

export function attachGrabGraph(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;
    let busy = false;
    let hoverFrame = 0;

    const local = (event: PointerEvent): Vec => {
        const rect = svg.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const halo = document.createElement('div');
    halo.className = 'ux-grab-halo';
    halo.hidden = true;
    const chips = document.createElement('div');
    chips.className = 'ux-grab-chips';
    chips.hidden = true;
    container.append(halo, chips);
    const place = (element: HTMLElement, [x, y]: Vec) => {
        element.style.transform = `translate(${x}px, ${y}px)`;
    };

    const onHover = (event: PointerEvent) => {
        if (busy || event.buttons !== 0 || hoverFrame) return;
        const target = local(event);
        hoverFrame = requestAnimationFrame(() => {
            hoverFrame = 0;
            const near = nearestStroke(board, target);
            const grabbable = !!near && near.distance < GRAB_RADIUS && !nearDraggablePoint(board, target) && usableSliders().length > 0;
            container.classList.toggle('ux-grab-ready', grabbable);
        });
    };

    const onDown = (event: PointerEvent) => {
        if (busy || event.button !== 0 || !event.isPrimary) return;
        const target = local(event);
        const near = nearestStroke(board, target);
        if (!near || near.distance > GRAB_RADIUS + (event.pointerType === 'touch' ? 8 : 0) || nearDraggablePoint(board, target)) return;
        const sliders = usableSliders();
        if (sliders.length === 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        busy = true;
        void grab(event, near.point, near.kind, sliders);
    };

    const grab = async (down: PointerEvent, anchor: Vec, kind: string, sliders: RegisteredSlider[]) => {
        try { container.setPointerCapture(down.pointerId); } catch { /* the pointer may be gone */ }
        container.classList.add('ux-grabbing');
        halo.hidden = false;
        place(halo, anchor);
        let pointer: Vec = local(down);
        let released = false;
        const onMove = (event: PointerEvent) => { if (event.pointerId === down.pointerId) pointer = local(event); };
        const onUp = (event: PointerEvent) => { if (event.pointerId === down.pointerId) released = true; };
        container.addEventListener('pointermove', onMove);
        container.addEventListener('pointerup', onUp);
        container.addEventListener('pointercancel', onUp);
        const start = new Map(sliders.map(slider => [slider, slider.value()]));
        try {
            // Feel each parameter: nudge it, see where the curve under the hand goes, put it back.
            const probe = async (at: Vec) => {
                const columns: {slider: RegisteredSlider; column: Vec}[] = [];
                for (const slider of sliders) {
                    const value = slider.value();
                    const span = slider.max - slider.min;
                    const delta = Math.max(slider.step || 0, span * 0.015);
                    const nudged = snap(slider, value + delta <= slider.max ? value + delta : value - delta);
                    if (nudged === value) continue;
                    slider.set(nudged);
                    await frames(3);
                    const moved = nearestStroke(board, at, kind);
                    slider.set(value);
                    if (!moved) continue;
                    const shift: Vec = [moved.point[0] - at[0], moved.point[1] - at[1]];
                    if (Math.hypot(shift[0], shift[1]) < 0.6) continue;
                    const used = (nudged - value) / span;
                    columns.push({slider, column: [shift[0] / used, shift[1] / used]});
                }
                await frames(2);
                return columns;
            };
            let probedAt: Vec = anchor;
            let lastProbe = performance.now();
            let columns = await probe(anchor);
            const debug: any = (window as any).__uxGrab = {columns: columns.map(c => [c.slider.label, c.column.map(v => Math.round(v))]), log: []};
            if (columns.length === 0) {
                chips.hidden = false;
                chips.innerHTML = '<span class="ux-grab-none">Tega dela grafa ne premika noben drsnik.</span>';
                place(chips, anchor);
                while (!released) await frames(1);
                return;
            }
            // The curve should pass under the hand: only the gap across the curve counts, since sliding along a curve
            // changes nothing that a parameter could fix.
            while (!released) {
                await frames(1);
                const contact = nearestStroke(board, pointer, kind);
                if (!contact) continue;
                place(halo, pointer);
                const gap: Vec = [pointer[0] - contact.point[0], pointer[1] - contact.point[1]];
                const distance = Math.hypot(gap[0], gap[1]);
                if (debug.log.length < 40) debug.log.push([contact.point.map(Math.round), Math.round(distance)]);
                render(columns, start, contact.point);
                if (distance < 1.5) continue;
                const now = performance.now();
                if (Math.hypot(contact.point[0] - probedAt[0], contact.point[1] - probedAt[1]) > 70 && now - lastProbe > 600) {
                    const fresh = await probe(contact.point);
                    if (fresh.length > 0) { columns = fresh; probedAt = contact.point; }
                    lastProbe = performance.now();
                    continue;
                }
                const normal: Vec = [gap[0] / distance, gap[1] / distance];
                const sensitivities = columns.map(({column}) => column[0] * normal[0] + column[1] * normal[1]);
                const total = sensitivities.reduce((sum, s) => sum + s * s, 0);
                if (!(total > 1e-9)) continue;
                // Minimum-norm step in range units, damped, inside a trust region of 4 % of each range.
                const steps = sensitivities.map(s => s * distance / (total * 1.04) * 0.85);
                const largest = Math.max(...steps.map(Math.abs));
                const scale = largest > 0.04 ? 0.04 / largest : 1;
                let moved = false;
                columns.forEach(({slider}, index) => {
                    const next = snap(slider, slider.value() + steps[index] * scale * (slider.max - slider.min));
                    if (next !== slider.value()) { slider.set(next); moved = true; }
                });
                if (moved) await frames(2);
            }
        } finally {
            container.removeEventListener('pointermove', onMove);
            container.removeEventListener('pointerup', onUp);
            container.removeEventListener('pointercancel', onUp);
            container.classList.remove('ux-grabbing');
            halo.hidden = true;
            window.setTimeout(() => { if (!busy) chips.hidden = true; }, 1600);
            busy = false;
        }
    };

    const render = (columns: {slider: RegisteredSlider}[], start: Map<RegisteredSlider, number>, at: Vec) => {
        chips.hidden = false;
        place(chips, at);
        chips.innerHTML = columns.map(({slider}) => {
            const before = start.get(slider) ?? slider.value();
            const now = slider.value();
            const changed = Math.abs(now - before) > 1e-9;
            const text = `${slider.label} = ${formatNumber(now, 'sl', slider.decimals)}`;
            return `<span class="${changed ? 'ux-grab-chip ux-grab-chip-on' : 'ux-grab-chip'}">${text.replace(/[<>&]/g, '')}</span>`;
        }).join('');
    };

    container.addEventListener('pointerdown', onDown, true);
    container.addEventListener('pointermove', onHover);
    return () => {
        container.removeEventListener('pointerdown', onDown, true);
        container.removeEventListener('pointermove', onHover);
        if (hoverFrame) cancelAnimationFrame(hoverFrame);
        halo.remove();
        chips.remove();
        container.classList.remove('ux-grab-ready', 'ux-grabbing');
    };
}
