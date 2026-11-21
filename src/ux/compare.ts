/**
 * Prototype c7 "A/B" (a DAW's A/B compare, the before/after wipe of photo editors, and the astronomer's blink
 * comparator that found Pluto). Pin the current picture as A, change anything (sliders, points, lesson steps), then
 * compare: a divider wipes between A and the live picture B, or the board blinks between them so that whatever
 * changed jumps out. Works on every board because A is a copy of the drawn picture.
 */
import type {Board} from "jsxgraph";
import "./ux.css";

type Mode = 'idle' | 'pinned' | 'wipe' | 'blink';

export function attachCompare(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const bar = document.createElement('div');
    bar.className = 'ux-ab-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Primerjava A/B');
    const overlay = document.createElement('div');
    overlay.className = 'ux-ab-overlay';
    overlay.hidden = true;
    const divider = document.createElement('div');
    divider.className = 'ux-ab-divider';
    divider.innerHTML = '<span class="ux-ab-tag ux-ab-tag-a">A · prej</span><span class="ux-ab-grip" aria-hidden="true">⟷</span><span class="ux-ab-tag ux-ab-tag-b">B · zdaj</span>';
    divider.hidden = true;
    container.append(overlay, divider, bar);
    for (const element of [bar, divider]) for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());

    let mode: Mode = 'idle';
    let snapshot: HTMLElement | undefined;
    let pinnedView = '';
    let split = 0.5;
    let blinkTimer = 0;
    const viewKey = () => `${board.getBoundingBox().map(v => v.toFixed(5)).join(',')}|${svg.clientWidth}x${svg.clientHeight}`;

    const pin = () => {
        const frozen = document.createElement('div');
        frozen.className = 'ux-ab-frozen';
        for (const child of Array.from(container.children)) {
            if (child === svg || child.classList.contains('JXGtext')) {
                const copy = child.cloneNode(true) as HTMLElement;
                copy.removeAttribute('id');
                copy.querySelectorAll('.ux-ghosts').forEach(node => node.remove());
                frozen.appendChild(copy);
            }
        }
        snapshot = frozen;
        overlay.replaceChildren(frozen);
        pinnedView = viewKey();
        mode = 'pinned';
        render();
    };

    const applySplit = () => {
        if (!snapshot) return;
        const width = svg.clientWidth;
        snapshot.style.clipPath = mode === 'wipe' ? `inset(0 ${Math.round((1 - split) * width)}px 0 0)` : 'none';
        divider.style.transform = `translateX(${Math.round(split * width)}px)`;
    };

    const stopBlink = () => {
        window.clearInterval(blinkTimer);
        blinkTimer = 0;
        overlay.classList.remove('ux-ab-showing-a');
    };

    const setMode = (next: Mode) => {
        stopBlink();
        mode = next;
        if (mode === 'blink') {
            let showA = true;
            overlay.classList.add('ux-ab-showing-a');
            blinkTimer = window.setInterval(() => {
                showA = !showA;
                overlay.classList.toggle('ux-ab-showing-a', showA);
                bar.dataset.showing = showA ? 'A' : 'B';
            }, 650);
        }
        render();
    };

    const render = () => {
        const comparing = mode === 'wipe' || mode === 'blink';
        overlay.hidden = !comparing;
        divider.hidden = mode !== 'wipe';
        overlay.dataset.mode = mode;
        container.classList.toggle('ux-ab-comparing', comparing);
        bar.dataset.mode = mode;
        delete bar.dataset.showing;
        const moved = comparing && pinnedView !== viewKey();
        const buttons: string[] = [];
        if (mode === 'idle') {
            buttons.push('<button type="button" data-action="pin" title="Zapomni si trenutno sliko kot A">◐ Zapomni si A</button>');
        } else {
            buttons.push(`<button type="button" data-action="wipe" aria-pressed="${mode === 'wipe'}" title="Deljeni zaslon: levo A, desno zdaj">Zavesa</button>`);
            buttons.push(`<button type="button" data-action="blink" aria-pressed="${mode === 'blink'}" title="Utripaj med A in zdaj, kot primerjalnik zvezdnih plošč">Utripaj</button>`);
            if (comparing) buttons.push('<button type="button" data-action="done">Končaj</button>');
            else buttons.push('<button type="button" data-action="pin" title="Nova slika A">Nova A</button>');
            buttons.push('<button type="button" data-action="drop" aria-label="Pozabi A" title="Pozabi A">×</button>');
        }
        bar.innerHTML = `<span class="ux-ab-label">A/B</span>${buttons.join('')}${moved ? '<span class="ux-ab-note">pogled se je premaknil</span>' : ''}`;
        applySplit();
    };

    bar.addEventListener('click', event => {
        const action = (event.target as HTMLElement).closest('button')?.dataset.action;
        if (!action) return;
        event.stopPropagation();
        if (action === 'pin') pin();
        else if (action === 'wipe') setMode(mode === 'wipe' ? 'pinned' : 'wipe');
        else if (action === 'blink') setMode(mode === 'blink' ? 'pinned' : 'blink');
        else if (action === 'done') setMode('pinned');
        else if (action === 'drop') { stopBlink(); snapshot = undefined; overlay.replaceChildren(); mode = 'idle'; render(); }
    });

    // Dragging the divider (or anywhere on the board while the curtain is shown) moves the wipe.
    let dragging = false;
    const moveTo = (event: PointerEvent) => {
        const rect = svg.getBoundingClientRect();
        split = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        applySplit();
    };
    const onDown = (event: PointerEvent) => {
        if (mode !== 'wipe' || (event.target as HTMLElement).closest('.ux-ab-bar')) return;
        dragging = true;
        event.preventDefault();
        event.stopImmediatePropagation();
        try { container.setPointerCapture(event.pointerId); } catch { /* the pointer may be gone */ }
        moveTo(event);
    };
    const onMove = (event: PointerEvent) => { if (dragging) moveTo(event); };
    const onUp = () => { dragging = false; };
    container.addEventListener('pointerdown', onDown, true);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
    divider.addEventListener('pointerdown', onDown);
    const onKey = (event: KeyboardEvent) => {
        if (mode !== 'wipe' && mode !== 'blink') return;
        if (event.key === 'Escape') setMode('pinned');
        if (mode === 'wipe' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && document.activeElement?.closest('.ux-ab-bar')) {
            split = Math.min(1, Math.max(0, split + (event.key === 'ArrowLeft' ? -0.05 : 0.05)));
            applySplit();
        }
    };
    document.addEventListener('keydown', onKey);
    render();

    return () => {
        stopBlink();
        container.removeEventListener('pointerdown', onDown, true);
        container.removeEventListener('pointermove', onMove);
        container.removeEventListener('pointerup', onUp);
        document.removeEventListener('keydown', onKey);
        bar.remove();
        overlay.remove();
        divider.remove();
        container.classList.remove('ux-ab-comparing');
    };
}
