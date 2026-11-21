/**
 * Prototype c14 "Kaj če?" (the sandbox fork of a game level, a DAW's "try a take" and Git's branch). In any lesson
 * frame the student can step off the lesson path: the frame's own parameters (the inspector sliders a lesson keeps
 * hidden) come up as chips on the board, points on the graph become draggable, and the lesson's picture stays behind
 * as a faint ghost to compare with. "Nazaj k lekciji" glides everything back, and moving on in the lesson restores
 * the lesson state first, so exploring never breaks the lesson.
 */
import type {Board} from "jsxgraph";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

interface SavedSlider { slider: RegisteredSlider; value: number }
interface SavedPoint { element: any; x: number; y: number }

function format(value: number, decimals: number): string {
    const digits = Math.min(Math.max(decimals, 0), 3);
    const text = value.toFixed(digits);
    return (digits > 0 ? text.replace(/\.?0+$/, '') : text).replace('.', ',').replace('-', '−');
}

/** A short handle for a slider chip: the symbol its label ends with (t, c, ω), else its first word. */
function symbolOf(label: string): string {
    const last = /\s(\S{1,3})$/.exec(label.trim())?.[1];
    if (last && !/^\d+$/.test(last)) return last;
    return label.trim().split(/\s+/)[0];
}

export function attachWhatIf(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-whatif-button';
    button.innerHTML = '<span aria-hidden="true">⑂</span> Kaj če?';
    button.title = 'Stopi s poti lekcije: spreminjaj, primerjaj z lekcijo in se vrni';
    button.hidden = true;
    const ghost = document.createElement('div');
    ghost.className = 'ux-whatif-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.hidden = true;
    const panel = document.createElement('div');
    panel.className = 'ux-whatif-panel';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Kaj če?');
    panel.hidden = true;
    container.append(ghost, panel, button);
    for (const element of [button, panel]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    let open = false;
    let saved: SavedSlider[] = [];
    let points: SavedPoint[] = [];
    let selected = 0;
    let returning = false;
    let frame = 0;

    const draggablePoints = () => ((board as any).objectsList as any[]).filter(element => {
        if (element.elType !== 'point' && element.elType !== 'glider') return false;
        if (!element.visPropCalc?.visible || !element.isDraggable) return false;
        const fixed = typeof element.evalVisProp === 'function' ? element.evalVisProp('fixed') : element.visProp?.fixed;
        return fixed !== true;
    });

    const inLesson = () => !!document.querySelector('.guided-lesson-frame');
    /** Presentation sliders (animation speed, element size) are not part of the mathematics a student would fork. */
    const forkable = () => mountedSliders().filter(slider => !/hitrost|velikost|speed|size/i.test(slider.label));
    const available = () => inLesson() && (forkable().length > 0 || draggablePoints().length > 0);
    const syncButton = () => {
        const show = open || available();
        if (button.hidden === show) button.hidden = !show;
    };
    const watch = window.setInterval(syncButton, 700);
    syncButton();

    const fire = (type: string, target: EventTarget, x: number, y: number, pressed: boolean) => {
        const box = container.getBoundingClientRect();
        target.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, composed: true, pointerId: 78, pointerType: 'mouse', isPrimary: true,
            clientX: box.left + x, clientY: box.top + y, screenX: box.left + x, screenY: box.top + y, button: 0, buttons: pressed ? 1 : 0,
        }));
    };
    const toScreen = (x: number, y: number): [number, number] => {
        const origin = (board as any).origin.scrCoords as number[];
        return [origin[1] + x * (board as any).unitX, origin[2] - y * (board as any).unitY];
    };
    /** Moves a point the way a student would (a real JSXGraph drag), so the app state follows it. */
    const dragPoint = (point: SavedPoint, fraction: number, from: [number, number]) => {
        const start = toScreen(...from);
        const goal = toScreen(point.x, point.y);
        const at: [number, number] = [start[0] + (goal[0] - start[0]) * fraction, start[1] + (goal[1] - start[1]) * fraction];
        const current = point.element.coords?.scrCoords as number[];
        fire('pointerdown', point.element.rendNode, current[1], current[2], true);
        fire('pointermove', container, at[0], at[1], true);
        fire('pointerup', document, at[0], at[1], false);
    };

    const changed = (entry: SavedSlider) => Math.abs(entry.slider.value() - entry.value) > Math.max(1e-9, entry.slider.step / 2);
    const pointMoved = (point: SavedPoint) => {
        try { return Math.hypot(point.element.X() - point.x, point.element.Y() - point.y) > 1e-6; } catch { return false; }
    };

    const render = () => {
        if (!open) return;
        const rows = saved.map((entry, i) => {
            const symbol = symbolOf(entry.slider.label);
            return `<button type="button" class="ux-whatif-chip${i === selected ? ' ux-whatif-chip-on' : ''}${changed(entry) ? ' ux-whatif-chip-changed' : ''}" data-index="${i}" aria-pressed="${i === selected}" title="${entry.slider.label}">${symbol}</button>`;
        }).join('');
        const entry = saved[selected];
        const movedPoints = points.filter(pointMoved).length;
        const slider = entry ? `
            <label class="ux-whatif-row">
                <span class="ux-whatif-label">${entry.slider.label}</span>
                <span class="ux-whatif-track">
                    <input type="range" class="ux-whatif-range" min="${entry.slider.min}" max="${entry.slider.max}" step="${entry.slider.step || (entry.slider.max - entry.slider.min) / 200}" value="${entry.slider.value()}">
                    <span class="ux-whatif-mark" data-mark>lekcija ${format(entry.value, entry.slider.decimals)}</span>
                </span>
                <output class="ux-whatif-value">${format(entry.slider.value(), entry.slider.decimals)}</output>
            </label>` : '';
        panel.classList.toggle('ux-whatif-mini', saved.length === 0);
        panel.innerHTML = saved.length === 0 ? `<div class="ux-whatif-note">Vleci točke${movedPoints ? ` (premaknjene: ${movedPoints})` : ''}. Bledi graf je lekcija.</div>` : `
            <div class="ux-whatif-head">
                <strong>Kaj če …?</strong>
                <span class="ux-whatif-chips">${rows}</span>
            </div>
            ${slider}
            <div class="ux-whatif-note">${points.length ? `Točke na grafu lahko vlečeš${movedPoints ? ` (premaknjene: ${movedPoints})` : ''}. ` : ''}Bledi graf je lekcija.</div>`;
        const range = panel.querySelector<HTMLInputElement>('.ux-whatif-range');
        if (range && entry) {
            // The lesson's value as a tick on the track.
            const mark = panel.querySelector<HTMLElement>('[data-mark]');
            const fraction = (entry.value - entry.slider.min) / (entry.slider.max - entry.slider.min);
            mark?.style.setProperty('--at', String(Math.max(0, Math.min(1, fraction))));
            range.addEventListener('input', () => {
                const value = Number(range.value);
                entry.slider.set(value);
                const output = panel.querySelector('.ux-whatif-value');
                if (output) output.textContent = format(value, entry.slider.decimals);
                panel.querySelector(`.ux-whatif-chip[data-index="${selected}"]`)?.classList.toggle('ux-whatif-chip-changed', changed(entry));
            });
        }
    };

    /** Values can change from the board (dragging a point that drives a slider); keep the panel in step without re-rendering mid-drag. */
    const follow = () => {
        frame = 0;
        if (!open) return;
        const entry = saved[selected];
        const range = panel.querySelector<HTMLInputElement>('.ux-whatif-range');
        if (entry && range && document.activeElement !== range && Number(range.value) !== entry.slider.value()) {
            range.value = String(entry.slider.value());
            const output = panel.querySelector('.ux-whatif-value');
            if (output) output.textContent = format(entry.slider.value(), entry.slider.decimals);
        }
        saved.forEach((item, i) => panel.querySelector(`.ux-whatif-chip[data-index="${i}"]`)?.classList.toggle('ux-whatif-chip-changed', changed(item)));
    };
    const onUpdate = () => { if (open && !frame) frame = requestAnimationFrame(follow); };
    board.on('update', onUpdate);

    const snapshotGhost = () => {
        const copy = svg.cloneNode(true) as SVGSVGElement;
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        copy.setAttribute('class', 'ux-whatif-ghost-svg');
        ghost.replaceChildren(copy);
        const box = svg.getBoundingClientRect(), outer = container.getBoundingClientRect();
        ghost.style.cssText = `left:${box.left - outer.left}px;top:${box.top - outer.top}px;width:${box.width}px;height:${box.height}px`;
        ghost.hidden = false;
    };

    const start = () => {
        saved = forkable().map(slider => ({slider, value: slider.value()}));
        points = draggablePoints().map(element => ({element, x: element.X(), y: element.Y()}));
        selected = 0;
        open = true;
        snapshotGhost();
        panel.hidden = false;
        button.classList.add('ux-whatif-on');
        button.innerHTML = '<span aria-hidden="true">↺</span> Nazaj k lekciji';
        button.setAttribute('aria-pressed', 'true');
        document.documentElement.classList.add('ux-whatif-open');
        render();
    };

    const close = () => {
        open = false;
        panel.hidden = true;
        ghost.hidden = true;
        ghost.replaceChildren();
        button.classList.remove('ux-whatif-on');
        button.innerHTML = '<span aria-hidden="true">⑂</span> Kaj če?';
        button.setAttribute('aria-pressed', 'false');
        document.documentElement.classList.remove('ux-whatif-open');
        syncButton();
    };

    /** Back to the lesson: glides (or jumps, before the lesson moves on) every slider and point to its saved place. */
    const restore = async (instant: boolean) => {
        if (returning) return;
        returning = true;
        const sliders = saved.filter(changed).map(entry => ({entry, from: entry.slider.value()}));
        const moved = points.filter(pointMoved).map(point => ({point, from: [point.element.X(), point.element.Y()] as [number, number]}));
        const ms = instant ? 0 : 650;
        const began = performance.now();
        for (;;) {
            const k = ms === 0 ? 1 : Math.min(1, (performance.now() - began) / ms);
            const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
            for (const {entry, from} of sliders) entry.slider.set(k >= 1 ? entry.value : from + (entry.value - from) * e);
            for (const {point, from} of moved) {
                try { dragPoint(point, e, from); } catch { /* the point left the board */ }
            }
            if (k >= 1) break;
            await new Promise(requestAnimationFrame);
        }
        returning = false;
        close();
    };

    button.addEventListener('click', () => { if (open) void restore(false); else start(); });
    panel.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        const chip = target.closest<HTMLElement>('.ux-whatif-chip');
        if (chip) { selected = Number(chip.dataset.index); render(); return; }
        if (target.closest('.ux-whatif-back')) void restore(false);
    });
    // Moving on in the lesson restores the lesson state first, so the next frame starts where the lesson expects.
    const onNavigate = (event: Event) => {
        if (!open) return;
        const target = event.target as HTMLElement | null;
        if (!target || target.closest('.ux-whatif-panel, .ux-whatif-button')) return;
        if (event.type === 'keydown' && !['ArrowRight', 'ArrowLeft', 'Enter', 'PageDown', 'PageUp'].includes((event as KeyboardEvent).key)) return;
        if (target.closest('.ux-film') || (target.closest('button, a') && target.closest('[class*="guided-lesson"]'))) void restore(true);
    };
    document.addEventListener('pointerdown', onNavigate, true);
    document.addEventListener('keydown', onNavigate, true);

    return () => {
        if (open) void restore(true);
        window.clearInterval(watch);
        board.off('update', onUpdate);
        if (frame) cancelAnimationFrame(frame);
        document.removeEventListener('pointerdown', onNavigate, true);
        document.removeEventListener('keydown', onNavigate, true);
        document.documentElement.classList.remove('ux-whatif-open');
        ghost.remove(); panel.remove(); button.remove();
    };
}
