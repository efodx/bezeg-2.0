/**
 * Prototype c10 "Filmski trak" (a video editor's filmstrip and the flipbook). A guided lesson leaves a strip of
 * frames along the bottom of the board: every frame the student has seen keeps a picture of the board as it was.
 * Dragging along the strip flips the board through those pictures, so a construction can be watched growing and
 * shrinking at any speed; letting go on a frame jumps the lesson there. Works for every lesson, because the
 * pictures are copies of the drawn board and the jump steps the lesson session with its usual Next and Back.
 */
import type {Board} from "jsxgraph";
import {flatIndex, fromFlat, lessonPosition, onLessonPosition, type LessonPosition} from "./lessonNav";
import "./ux.css";

interface Capture {
    picture: HTMLElement;
    width: number;
    height: number;
}

export function attachFilmstrip(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const strip = document.createElement('div');
    strip.className = 'ux-film';
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', 'Filmski trak lekcije');
    strip.hidden = true;
    const track = document.createElement('div');
    track.className = 'ux-film-track';
    strip.appendChild(track);
    const overlay = document.createElement('div');
    overlay.className = 'ux-film-overlay';
    overlay.hidden = true;
    container.append(overlay, strip);
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) strip.addEventListener(type, event => event.stopPropagation());

    const captures = new Map<number, Capture>();
    let lessonId = '';
    let position: LessonPosition | undefined;
    let previewing: number | undefined;
    let captureTimer = 0;

    const current = () => position ? flatIndex(position.counts, position.stepIndex, position.frameIndex) : -1;
    const total = () => position ? position.counts.reduce((sum, count) => sum + count, 0) : 0;

    const snapshot = (): Capture => {
        const picture = document.createElement('div');
        picture.className = 'ux-film-picture';
        for (const child of Array.from(container.children)) {
            if (child === svg || child.classList.contains('JXGtext')) {
                const copy = child.cloneNode(true) as HTMLElement;
                copy.removeAttribute('id');
                copy.querySelectorAll('[class*="ux-"]').forEach(node => { if (!(node as Element).closest('mjx-container')) node.remove(); });
                picture.appendChild(copy);
            }
        }
        return {picture, width: svg.clientWidth, height: svg.clientHeight};
    };

    const captureNow = () => {
        if (!position || position.complete || previewing !== undefined || !svg.clientWidth) return;
        captures.set(current(), snapshot());
        render();
    };
    const scheduleCapture = (delay = 700) => {
        window.clearTimeout(captureTimer);
        captureTimer = window.setTimeout(captureNow, delay);
    };

    const thumb = (capture: Capture, width: number, height: number) => {
        const scale = Math.min(width / capture.width, height / capture.height);
        const frame = document.createElement('div');
        frame.className = 'ux-film-thumb';
        const inner = capture.picture.cloneNode(true) as HTMLElement;
        inner.style.width = `${capture.width}px`;
        inner.style.height = `${capture.height}px`;
        inner.style.transform = `scale(${scale})`;
        frame.appendChild(inner);
        return frame;
    };

    const render = () => {
        const count = total();
        strip.hidden = !position || count < 2;
        if (strip.hidden || !position) return;
        const at = position;
        const steps = at.counts.length;
        // Strip insets (16), track padding and border (14), gaps between steps (6) and between frames (3).
        const available = container.clientWidth - 16 - 14 - (steps - 1) * 6 - (count - steps) * 3;
        const width = Math.max(10, Math.min(66, Math.floor(available / count)));
        const height = width < 30 ? 20 : Math.round(Math.min(44, Math.max(26, width * (svg.clientHeight / Math.max(1, svg.clientWidth)))));
        strip.classList.toggle('ux-film-narrow', width < 30);
        track.replaceChildren();
        const here = current();
        let flat = 0;
        at.counts.forEach((frames, step) => {
            const group = document.createElement('div');
            group.className = 'ux-film-step';
            for (let frame = 0; frame < frames; frame++, flat++) {
                const tile = document.createElement('button');
                tile.type = 'button';
                tile.className = 'ux-film-tile';
                tile.dataset.flat = String(flat);
                tile.style.width = `${width}px`;
                tile.style.height = `${height}px`;
                const capture = captures.get(flat);
                if (capture && width >= 30) tile.appendChild(thumb(capture, width, height));
                if (capture) tile.classList.add('ux-film-seen');
                if (flat === here && !at.complete) tile.classList.add('ux-film-here');
                if (frame === 0) {
                    const label = document.createElement('span');
                    label.className = 'ux-film-label';
                    label.textContent = String(step + 1);
                    tile.appendChild(label);
                }
                tile.setAttribute('aria-label', `Korak ${step + 1}, okvir ${frame + 1}${capture ? '' : ', še neviden'}`);
                group.appendChild(tile);
            }
            track.appendChild(group);
        });
    };

    const preview = (flat: number | undefined) => {
        if (flat === previewing) return;
        previewing = flat;
        track.querySelectorAll('.ux-film-tile').forEach(tile => tile.classList.toggle('ux-film-scrub', Number((tile as HTMLElement).dataset.flat) === flat));
        if (flat === undefined || !position || (flat === current() && !position.complete)) { overlay.hidden = true; overlay.replaceChildren(); return; }
        const capture = captures.get(flat);
        const [step, frame] = fromFlat(position.counts, flat);
        const badge = document.createElement('div');
        badge.className = 'ux-film-badge';
        badge.textContent = capture ? `Korak ${step + 1} · okvir ${frame + 1}` : `Korak ${step + 1} · okvir ${frame + 1} · še neviden`;
        overlay.replaceChildren();
        if (capture) {
            const picture = capture.picture.cloneNode(true) as HTMLElement;
            picture.style.width = `${capture.width}px`;
            picture.style.height = `${capture.height}px`;
            overlay.appendChild(picture);
        }
        overlay.classList.toggle('ux-film-unseen', !capture);
        overlay.appendChild(badge);
        overlay.hidden = false;
    };

    const tileAt = (clientX: number, clientY: number): number | undefined => {
        const tiles = Array.from(track.querySelectorAll('.ux-film-tile')) as HTMLElement[];
        let best: HTMLElement | undefined;
        let bestDistance = Infinity;
        for (const tile of tiles) {
            const box = tile.getBoundingClientRect();
            const distance = clientX < box.left ? box.left - clientX : clientX > box.right ? clientX - box.right : 0;
            if (distance < bestDistance && clientY > box.top - 40 && clientY < box.bottom + 40) { bestDistance = distance; best = tile; }
        }
        return best ? Number(best.dataset.flat) : undefined;
    };

    let dragging = false;
    let pressed: number | undefined;
    track.addEventListener('pointerdown', event => {
        dragging = true;
        pressed = tileAt(event.clientX, event.clientY);
        track.setPointerCapture(event.pointerId);
        preview(pressed);
        event.preventDefault();
    });
    track.addEventListener('pointermove', event => {
        if (dragging || event.pointerType === 'mouse') preview(tileAt(event.clientX, event.clientY));
    });
    const finish = (event: PointerEvent, jump: boolean) => {
        if (!dragging) return;
        dragging = false;
        const target = tileAt(event.clientX, event.clientY) ?? pressed;
        preview(undefined);
        if (jump && target !== undefined && position && (target !== current() || position.complete)) {
            const [step, frame] = fromFlat(position.counts, target);
            position.goTo(step, frame);
        }
    };
    track.addEventListener('pointerup', event => finish(event, true));
    track.addEventListener('pointercancel', event => finish(event, false));
    track.addEventListener('pointerleave', () => { if (!dragging) preview(undefined); });
    track.addEventListener('keydown', event => {
        const tile = (event.target as HTMLElement).closest('.ux-film-tile') as HTMLElement | null;
        if (!tile || !position) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const [step, frame] = fromFlat(position.counts, Number(tile.dataset.flat));
            preview(undefined);
            position.goTo(step, frame);
        }
    });
    track.addEventListener('focusin', event => {
        const tile = (event.target as HTMLElement).closest('.ux-film-tile') as HTMLElement | null;
        if (tile && (event.target as HTMLElement).matches(':focus-visible')) preview(Number(tile.dataset.flat));
    });
    track.addEventListener('focusout', () => preview(undefined));

    const onPosition = (next: LessonPosition | undefined) => {
        if (next && next.lessonId !== lessonId) { captures.clear(); lessonId = next.lessonId; }
        position = next;
        container.classList.toggle('ux-film-on', !!next);
        render();
        scheduleCapture(900);
    };
    const unsubscribe = onLessonPosition(onPosition);
    onPosition(lessonPosition());
    const onUpdate = () => { if (position && previewing === undefined) scheduleCapture(); };
    board.on('update', onUpdate);
    const resize = new ResizeObserver(() => render());
    resize.observe(container);

    return () => {
        unsubscribe();
        board.off('update', onUpdate);
        resize.disconnect();
        window.clearTimeout(captureTimer);
        container.classList.remove('ux-film-on');
        strip.remove();
        overlay.remove();
    };
}
