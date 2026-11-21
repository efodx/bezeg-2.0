/**
 * Prototype c17 "Kazalnik" (the presenter's laser pointer, disappearing ink from slide tools, and the spotlight of a
 * stage or museum guide). For teaching with a projector: the pointer becomes a glowing dot with a short comet tail,
 * dragging writes ink that fades by itself after a few seconds, and the spotlight dims the board everywhere except
 * around the pointer. Nothing is stored and the graph is untouched, so it works on every board and lesson.
 */
import type {Board} from "jsxgraph";
import "./ux.css";

interface Trace { x: number; y: number; t: number }

const TAIL_MS = 320;
const INK_MS = 2600;

export function attachLaser(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    if (!container) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-laser-button';
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Kazalnik za projekcijo: točka, črnilo, ki izgine, in reflektor (tipka L)';
    button.innerHTML = '<span class="ux-laser-dot-icon" aria-hidden="true"></span> Kazalnik';
    const tools = document.createElement('div');
    tools.className = 'ux-laser-tools';
    tools.hidden = true;
    tools.innerHTML = '<button type="button" data-mode="dot" aria-pressed="true">Točka</button>'
        + '<button type="button" data-mode="spot" aria-pressed="false">Reflektor</button>';
    const canvas = document.createElement('canvas');
    canvas.className = 'ux-laser-canvas';
    canvas.hidden = true;
    const spot = document.createElement('div');
    spot.className = 'ux-laser-spot';
    spot.hidden = true;
    container.append(spot, canvas, tools, button);
    for (const element of [button, tools]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    let on = false;
    let spotlight = false;
    let tail: Trace[] = [];
    let strokes: Trace[][] = [];
    let drawing: Trace[] | undefined;
    let pointer: Trace | undefined;
    let frame = 0;

    const resize = () => {
        const ratio = window.devicePixelRatio || 1;
        const width = container.clientWidth, height = container.clientHeight;
        if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
        }
        return ratio;
    };

    const paint = () => {
        frame = 0;
        const now = performance.now();
        const ratio = resize();
        const context = canvas.getContext('2d');
        if (!context) return;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        // Ink: each stroke fades as a whole once the pen lifts.
        strokes = strokes.filter(stroke => stroke === drawing || now - stroke[stroke.length - 1].t < INK_MS);
        for (const stroke of strokes) {
            const age = stroke === drawing ? 0 : now - stroke[stroke.length - 1].t;
            const alpha = Math.max(0, 1 - Math.max(0, age - INK_MS * 0.55) / (INK_MS * 0.45));
            context.strokeStyle = `rgba(214, 64, 30, ${0.85 * alpha})`;
            context.shadowColor = `rgba(255, 120, 60, ${0.7 * alpha})`;
            context.shadowBlur = 8;
            context.lineWidth = 4.5;
            context.beginPath();
            stroke.forEach((p, i) => { if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y); });
            if (stroke.length === 1) context.lineTo(stroke[0].x + 0.1, stroke[0].y);
            context.stroke();
        }
        // The comet tail behind the dot.
        tail = tail.filter(p => now - p.t < TAIL_MS);
        for (let i = 1; i < tail.length; i++) {
            const k = 1 - (now - tail[i].t) / TAIL_MS;
            context.strokeStyle = `rgba(255, 90, 40, ${0.55 * k})`;
            context.shadowBlur = 0;
            context.lineWidth = 2 + 7 * k;
            context.beginPath();
            context.moveTo(tail[i - 1].x, tail[i - 1].y);
            context.lineTo(tail[i].x, tail[i].y);
            context.stroke();
        }
        if (pointer && !spotlight) {
            const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 18);
            glow.addColorStop(0, 'rgba(255, 70, 30, 0.95)');
            glow.addColorStop(0.35, 'rgba(255, 90, 40, 0.65)');
            glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
            context.fillStyle = glow;
            context.beginPath();
            context.arc(pointer.x, pointer.y, 18, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#fff6ee';
            context.beginPath();
            context.arc(pointer.x, pointer.y, 2.6, 0, Math.PI * 2);
            context.fill();
        }
        if (tail.length > 1 || strokes.length) schedule();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };

    const local = (event: PointerEvent): Trace => {
        const box = container.getBoundingClientRect();
        return {x: event.clientX - box.left, y: event.clientY - box.top, t: performance.now()};
    };
    const moveSpot = () => {
        if (!pointer) return;
        spot.style.setProperty('--x', `${pointer.x}px`);
        spot.style.setProperty('--y', `${pointer.y}px`);
    };

    let lastTap = 0;
    const onDown = (event: PointerEvent) => {
        event.preventDefault();
        canvas.setPointerCapture?.(event.pointerId);
        pointer = local(event);
        const now = performance.now();
        // A double tap wipes the ink at once.
        if (now - lastTap < 320) { strokes = []; drawing = undefined; lastTap = 0; schedule(); return; }
        lastTap = now;
        drawing = [pointer];
        strokes.push(drawing);
        moveSpot();
        schedule();
    };
    const onMove = (event: PointerEvent) => {
        pointer = local(event);
        tail.push(pointer);
        if (drawing) drawing.push(pointer);
        moveSpot();
        schedule();
    };
    const onUp = () => { drawing = undefined; if (!canvas.matches(':hover')) pointer = undefined; schedule(); };
    const onLeave = () => { if (!drawing) { pointer = undefined; schedule(); } };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);

    const setSpotlight = (value: boolean) => {
        spotlight = value;
        spot.hidden = !(on && spotlight);
        tools.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'spot') === spotlight)));
        if (spotlight && !pointer) {
            pointer = {x: container.clientWidth / 2, y: container.clientHeight / 2, t: performance.now()};
            moveSpot();
        }
        schedule();
    };
    const setOn = (value: boolean) => {
        on = value;
        canvas.hidden = !on;
        tools.hidden = !on;
        button.setAttribute('aria-pressed', String(on));
        button.classList.toggle('ux-laser-on', on);
        document.documentElement.classList.toggle('ux-lasering', on);
        if (!on) { strokes = []; tail = []; pointer = undefined; drawing = undefined; }
        setSpotlight(on && spotlight);
        schedule();
    };
    button.addEventListener('click', () => setOn(!on));
    tools.addEventListener('click', event => {
        const mode = (event.target as HTMLElement).closest<HTMLElement>('[data-mode]')?.dataset.mode;
        if (mode) setSpotlight(mode === 'spot');
    });
    const onKey = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
        if (event.key === 'Escape' && on) setOn(false);
        else if ((event.key === 'l' || event.key === 'L') && !event.ctrlKey && !event.metaKey && !event.altKey) setOn(!on);
        else if ((event.key === 's' || event.key === 'S') && on && !event.ctrlKey && !event.metaKey) setSpotlight(!spotlight);
    };
    window.addEventListener('keydown', onKey);

    return () => {
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener('keydown', onKey);
        document.documentElement.classList.remove('ux-lasering');
        spot.remove(); canvas.remove(); tools.remove(); button.remove();
    };
}
