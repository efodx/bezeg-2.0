/**
 * Prototype c18 "Previj nazaj" (Braid's time rewind, a DAW's undo history and a video scrubber). Everything the
 * student does to the graph (dragging points, moving sliders) is recorded as a timeline under the board. Dragging along
 * the timeline replays the board through the student's own exploration, so "what did it look like when …" is one
 * scrub away; Ctrl+Z and Ctrl+Y step back and forward one gesture at a time. Replay goes through the same interfaces
 * as the student's hand (slider values and real JSXGraph drags), so the app state follows.
 */
import type {Board} from "jsxgraph";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

interface Frame { t: number; sliders: number[]; points: number[]; gesture: number }

const MAX_FRAMES = 900;
const GESTURE_GAP_MS = 700;

export function attachRewind(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const bar = document.createElement('div');
    bar.className = 'ux-rw';
    bar.hidden = true;
    bar.innerHTML = '<button type="button" class="ux-rw-step" data-step="-1" aria-label="Korak nazaj (Ctrl+Z)" title="Korak nazaj (Ctrl+Z)">⟲</button>'
        + '<div class="ux-rw-track" role="slider" tabindex="0" aria-label="Previj raziskovanje nazaj"><canvas class="ux-rw-spark"></canvas><span class="ux-rw-head"></span></div>'
        + '<button type="button" class="ux-rw-step" data-step="1" aria-label="Korak naprej (Ctrl+Y)" title="Korak naprej (Ctrl+Y)">⟳</button>'
        + '<span class="ux-rw-label"></span>';
    container.append(bar);
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) bar.addEventListener(type, event => event.stopPropagation());
    const track = bar.querySelector<HTMLElement>('.ux-rw-track')!;
    const head = bar.querySelector<HTMLElement>('.ux-rw-head')!;
    const spark = bar.querySelector<HTMLCanvasElement>('.ux-rw-spark')!;
    const label = bar.querySelector<HTMLElement>('.ux-rw-label')!;

    let sliders: RegisteredSlider[] = [];
    let points: any[] = [];
    let frames: Frame[] = [];
    /** Index of the frame the board shows; frames after it are the "future" until the student changes something. */
    let cursor = -1;
    let replaying = false;
    let replayToken = 0;
    let scrubbing = false;
    let gesture = 0;
    let lastChange = 0;

    const draggablePoints = () => ((board as any).objectsList as any[]).filter(element => {
        if (element.elType !== 'point' || !element.visPropCalc?.visible || !element.isDraggable) return false;
        const fixed = typeof element.evalVisProp === 'function' ? element.evalVisProp('fixed') : element.visProp?.fixed;
        return fixed !== true;
    });
    const read = (): Omit<Frame, 'gesture'> => ({
        t: performance.now(),
        sliders: sliders.map(slider => slider.value()),
        points: points.flatMap(point => { try { return [point.X(), point.Y()]; } catch { return [NaN, NaN]; } }),
    });
    const same = (a: Omit<Frame, 'gesture'>, b: Omit<Frame, 'gesture'>) =>
        a.sliders.every((v, i) => Math.abs(v - b.sliders[i]) < 1e-12) && a.points.every((v, i) => Math.abs(v - b.points[i]) < 1e-9 || (Number.isNaN(v) && Number.isNaN(b.points[i])));

    /** The set of things being recorded changes with the board (another demo, a lesson step); start over then. */
    const refreshSubjects = () => {
        const nextSliders = mountedSliders().filter(slider => !/hitrost|velikost|speed|size/i.test(slider.label));
        const nextPoints = draggablePoints();
        const changed = nextSliders.length !== sliders.length || nextSliders.some((s, i) => s !== sliders[i])
            || nextPoints.length !== points.length || nextPoints.some((p, i) => p !== points[i]);
        if (changed) {
            sliders = nextSliders;
            points = nextPoints;
            frames = [];
            cursor = -1;
        }
    };

    const record = () => {
        if (replaying) return;
        refreshSubjects();
        if (!sliders.length && !points.length) return;
        const now = read();
        const current = frames[cursor];
        if (current && same(current, now)) return;
        if (cursor < frames.length - 1) frames = frames.slice(0, cursor + 1);
        if (now.t - lastChange > GESTURE_GAP_MS) gesture++;
        lastChange = now.t;
        frames.push({...now, gesture});
        if (frames.length > MAX_FRAMES) frames.splice(0, frames.length - MAX_FRAMES);
        cursor = frames.length - 1;
        render();
    };

    const fire = (type: string, target: EventTarget, x: number, y: number, pressed: boolean) => {
        const box = container.getBoundingClientRect();
        target.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, composed: true, pointerId: 80, pointerType: 'mouse', isPrimary: true,
            clientX: box.left + x, clientY: box.top + y, screenX: box.left + x, screenY: box.top + y, button: 0, buttons: pressed ? 1 : 0,
        }));
    };
    const toScreen = (x: number, y: number): [number, number] => {
        const origin = (board as any).origin.scrCoords as number[];
        return [origin[1] + x * (board as any).unitX, origin[2] - y * (board as any).unitY];
    };

    const apply = (index: number) => {
        const frame = frames[index];
        if (!frame) return;
        replaying = true;
        const now = read();
        frame.sliders.forEach((value, i) => { if (Math.abs(now.sliders[i] - value) > 1e-12) sliders[i].set(value); });
        points.forEach((point, i) => {
            const x = frame.points[2 * i], y = frame.points[2 * i + 1];
            if (!Number.isFinite(x) || (Math.abs(now.points[2 * i] - x) < 1e-9 && Math.abs(now.points[2 * i + 1] - y) < 1e-9)) return;
            const from = point.coords?.scrCoords as number[] | undefined;
            if (!from) return;
            const [sx, sy] = toScreen(x, y);
            fire('pointerdown', point.rendNode, from[1], from[2], true);
            fire('pointermove', container, sx, sy, true);
            fire('pointerup', document, sx, sy, false);
        });
        cursor = index;
        render();
        // Let the app settle before recording resumes, so the replayed state is not taken for a new change.
        const token = ++replayToken;
        window.setTimeout(() => {
            if (token !== replayToken || scrubbing) return;
            // Adopt what the app shows now as the frame under the cursor (rounding, snapping), then record again.
            const shown = read();
            frames[cursor] = {...frames[cursor], sliders: shown.sliders, points: shown.points};
            replaying = false;
        }, 300);
    };

    const render = () => {
        bar.hidden = frames.length < 2;
        if (bar.hidden) return;
        const width = track.clientWidth, height = track.clientHeight;
        const ratio = window.devicePixelRatio || 1;
        if (spark.width !== Math.round(width * ratio)) { spark.width = Math.round(width * ratio); spark.height = Math.round(height * ratio); }
        const context = spark.getContext('2d');
        if (context) {
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);
            // Activity: how much changed between frames, drawn as a sparkline; gesture borders as ticks.
            const n = frames.length;
            const change = frames.map((frame, i) => {
                if (i === 0) return 0;
                const previous = frames[i - 1];
                let sum = 0;
                frame.sliders.forEach((v, k) => { const s = sliders[k]; if (s) sum += Math.abs(v - previous.sliders[k]) / ((s.max - s.min) || 1) * 40; });
                for (let k = 0; k < frame.points.length; k++) sum += Math.abs(frame.points[k] - previous.points[k]) || 0;
                return sum;
            });
            const peak = Math.max(1e-9, ...change);
            const x = (i: number) => 4 + (width - 8) * (n === 1 ? 0 : i / (n - 1));
            context.fillStyle = 'rgba(36, 76, 55, 0.18)';
            context.beginPath();
            context.moveTo(x(0), height - 3);
            change.forEach((c, i) => context.lineTo(x(i), height - 3 - Math.sqrt(c / peak) * (height - 8)));
            context.lineTo(x(n - 1), height - 3);
            context.fill();
            context.fillStyle = 'rgba(196, 123, 31, 0.9)';
            for (let i = 1; i < n; i++) if (frames[i].gesture !== frames[i - 1].gesture) context.fillRect(x(i) - 0.75, 3, 1.5, height - 6);
            // The future (after the cursor) is greyed out.
            if (cursor < n - 1) { context.fillStyle = 'rgba(255, 253, 245, 0.6)'; context.fillRect(x(cursor), 0, width - x(cursor), height); }
            head.style.left = `${x(cursor)}px`;
        }
        const gestures = new Set(frames.map(frame => frame.gesture)).size;
        const at = new Set(frames.slice(0, cursor + 1).map(frame => frame.gesture)).size;
        label.textContent = `${at}/${gestures}`;
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', String(frames.length - 1));
        track.setAttribute('aria-valuenow', String(cursor));
    };

    const indexAt = (clientX: number) => {
        const box = track.getBoundingClientRect();
        const f = Math.max(0, Math.min(1, (clientX - box.left - 4) / Math.max(1, box.width - 8)));
        return Math.round(f * (frames.length - 1));
    };
    track.addEventListener('pointerdown', event => {
        event.preventDefault();
        scrubbing = true;
        track.setPointerCapture?.(event.pointerId);
        bar.classList.add('ux-rw-scrubbing');
        apply(indexAt(event.clientX));
    });
    track.addEventListener('pointermove', event => {
        if (!scrubbing) return;
        const index = indexAt(event.clientX);
        if (index !== cursor) apply(index);
    });
    const endScrub = () => {
        if (!scrubbing) return;
        scrubbing = false;
        bar.classList.remove('ux-rw-scrubbing');
        apply(cursor);
    };
    track.addEventListener('pointerup', endScrub);
    track.addEventListener('pointercancel', endScrub);

    /** One gesture back or forward: to the last frame of the previous gesture, or the end of the next one. */
    const step = (direction: number) => {
        if (frames.length < 2) return;
        const here = frames[cursor]?.gesture ?? 0;
        if (direction < 0) {
            let index = cursor;
            while (index > 0 && frames[index].gesture === here) index--;
            apply(index);
        } else {
            let index = cursor;
            if (index >= frames.length - 1) return;
            const target = frames[index + 1].gesture;
            while (index < frames.length - 1 && frames[index + 1].gesture === target) index++;
            apply(index);
        }
    };
    bar.addEventListener('click', event => {
        const button = (event.target as HTMLElement).closest<HTMLElement>('[data-step]');
        if (button) step(Number(button.dataset.step));
    });
    track.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); apply(Math.max(0, cursor - 1)); }
        if (event.key === 'ArrowRight') { event.preventDefault(); apply(Math.min(frames.length - 1, cursor + 1)); }
    });
    const onKey = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName) && (target as HTMLInputElement).type !== 'range')) return;
        if (!(event.ctrlKey || event.metaKey) || frames.length < 2) return;
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey) { event.preventDefault(); step(-1); }
        else if (key === 'y' || (key === 'z' && event.shiftKey)) { event.preventDefault(); step(1); }
    };
    window.addEventListener('keydown', onKey);

    let pending = 0;
    const onUpdate = () => { if (!pending) pending = window.setTimeout(() => { pending = 0; record(); }, 50); };
    board.on('update', onUpdate);
    // Sliders can change without a board update (a value the board does not show yet); poll gently as well.
    const interval = window.setInterval(record, 250);
    record();

    return () => {
        board.off('update', onUpdate);
        window.clearTimeout(pending);
        window.clearInterval(interval);
        window.removeEventListener('keydown', onKey);
        bar.remove();
    };
}
