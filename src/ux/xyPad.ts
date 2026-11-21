/**
 * Prototype c20 "Ploščica XY" (a synthesizer's XY / Kaoss pad, a map you move a pin across). Two parameters on one
 * pad: dragging the dot moves both sliders at once, so the student explores a plane of graphs instead of two lines.
 * The pad's background is a map of that plane: the app draws the board for a 4 × 4 grid of value pairs, so the dot
 * always sits on a small picture of what the board will look like there. The student's path stays on the pad as a trail.
 */
import type {Board} from "jsxgraph";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

const GRID = 4;

function format(value: number, decimals: number): string {
    const digits = Math.min(Math.max(decimals, 0), 2);
    const text = value.toFixed(digits);
    return (digits > 0 ? text.replace(/\.?0+$/, '') : text).replace('.', ',').replace('-', '−');
}

function symbolOf(label: string): string {
    const last = /\s(\S{1,3})$/.exec(label.trim())?.[1];
    return last && !/^\d+$/.test(last) ? last : label.trim().split(/\s+/)[0];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const phone = () => window.matchMedia('(max-width: 640px)').matches;

export function attachXyPad(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-xy-button';
    button.innerHTML = '<span aria-hidden="true">✥</span> Ploščica XY';
    button.title = 'Premikaj dva parametra hkrati po zemljevidu grafov';
    button.hidden = true;
    const panel = document.createElement('div');
    panel.className = 'ux-xy';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Ploščica XY');
    panel.hidden = true;
    container.append(panel, button);
    for (const element of [button, panel]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    const choices = () => mountedSliders().filter(slider => !/hitrost|velikost|speed|size/i.test(slider.label));
    const sync = () => {
        button.hidden = choices().length < 2;
        if (button.hidden && !panel.hidden) close();
    };
    const watch = window.setInterval(sync, 800);
    sync();

    let xs: RegisteredSlider | undefined;
    let ys: RegisteredSlider | undefined;
    let mapping = false;
    let token = 0;
    let trail: [number, number][] = [];
    let pad: HTMLElement | undefined;
    let dot: HTMLElement | undefined;
    let trailPath: SVGPathElement | undefined;
    let readout: HTMLElement | undefined;
    let cells: HTMLElement[] = [];

    const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(resolve, 30))));
    const capture = (): SVGSVGElement => {
        const copy = svg.cloneNode(true) as SVGSVGElement;
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        copy.setAttribute('viewBox', `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
        copy.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        for (const name of ['width', 'height', 'style']) copy.removeAttribute(name);
        copy.setAttribute('class', 'ux-xy-svg');
        return copy;
    };

    /** The drawn figure's box in board pixels: curves, points, segments and shapes; not axes, grid, lines or text. */
    const contentBox = (): [number, number, number, number] | undefined => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        const width = svg.clientWidth, height = svg.clientHeight;
        for (const element of (board as any).objectsList as any[]) {
            if (!element.visPropCalc?.visible || /^(axis|ticks|grid|line|text|image|slider|button|checkbox|input)$/.test(element.elType ?? '')) continue;
            const node = element.rendNode as SVGGraphicsElement | undefined;
            if (!node || typeof node.getBBox !== 'function') continue;
            try {
                const box = node.getBBox();
                if (!Number.isFinite(box.x) || (box.width === 0 && box.height === 0)) continue;
                x0 = Math.min(x0, box.x); y0 = Math.min(y0, box.y); x1 = Math.max(x1, box.x + box.width); y1 = Math.max(y1, box.y + box.height);
            } catch { /* not rendered */ }
        }
        x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(width, x1); y1 = Math.min(height, y1);
        return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : undefined;
    };
    /** One view for every cell, so the cells compare: the union of the figure over all renders, padded, at the pad's aspect. */
    const frameCells = (box: [number, number, number, number] | undefined, aspect: number) => {
        const width = svg.clientWidth, height = svg.clientHeight;
        let [x0, y0, x1, y1] = box ?? [0, 0, width, height];
        const padX = (x1 - x0) * 0.12 + 8, padY = (y1 - y0) * 0.12 + 8;
        x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
        let w = x1 - x0, h = y1 - y0;
        if (h / w < aspect) { const grow = w * aspect - h; y0 -= grow / 2; h = w * aspect; }
        else { const grow = h / aspect - w; x0 -= grow / 2; w = h / aspect; }
        const view = `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
        for (const copy of panel.querySelectorAll('.ux-xy-svg')) copy.setAttribute('viewBox', view);
    };

    /** Pad fractions (0..1, y up) for slider values and back; cell centres are exactly the sampled values. */
    const fraction = (slider: RegisteredSlider, value: number) => (value - slider.min) / (slider.max - slider.min);
    const snap = (slider: RegisteredSlider, value: number) => {
        const stepped = slider.step > 0 ? Math.round((value - slider.min) / slider.step) * slider.step + slider.min : value;
        return clamp(Number(stepped.toFixed(10)), slider.min, slider.max);
    };
    const cellValue = (slider: RegisteredSlider, i: number) => snap(slider, slider.min + (slider.max - slider.min) * (i + 0.5) / GRID);

    const place = () => {
        if (!xs || !ys || !dot || !readout) return;
        const fx = clamp(fraction(xs, xs.value()), 0, 1), fy = clamp(fraction(ys, ys.value()), 0, 1);
        dot.style.left = `${fx * 100}%`;
        dot.style.top = `${(1 - fy) * 100}%`;
        readout.innerHTML = `<i>${symbolOf(xs.label)}</i> = ${format(xs.value(), xs.decimals)} · <i>${symbolOf(ys.label)}</i> = ${format(ys.value(), ys.decimals)}`;
        const col = Math.min(GRID - 1, Math.floor(fx * GRID)), row = Math.min(GRID - 1, Math.floor((1 - fy) * GRID));
        cells.forEach((cell, index) => cell.classList.toggle('ux-xy-here', index === row * GRID + col));
    };
    const drawTrail = () => {
        if (!trailPath) return;
        let d = '', pen = false;
        for (const [x, y] of trail) {
            if (!Number.isFinite(x)) { pen = false; continue; }
            d += `${pen ? 'L' : 'M'}${(x * 100).toFixed(2)},${((1 - y) * 100).toFixed(2)}`;
            pen = true;
        }
        trailPath.setAttribute('d', d);
    };

    const render = async () => {
        if (!xs || !ys) return;
        const list = choices();
        const mine = ++token;
        const chipRow = (axis: 'x' | 'y', current: RegisteredSlider) => `<span class="ux-xy-axis-name">${axis === 'x' ? '↔' : '↕'}</span>`
            + list.map((entry, i) => `<button type="button" class="ux-xy-chip${entry === current ? ' ux-xy-chip-on' : ''}" data-axis="${axis}" data-index="${i}" title="${entry.label}"${(axis === 'x' ? ys : xs) === entry ? ' disabled' : ''}>${symbolOf(entry.label)}</button>`).join('');
        const aspect = phone() ? 0.8 : clamp(svg.clientHeight / Math.max(1, svg.clientWidth), 0.62, 1.05);
        const zero = (slider: RegisteredSlider) => slider.min < 0 && slider.max > 0 ? fraction(slider, 0) : undefined;
        const zx = zero(xs), zy = zero(ys);
        panel.innerHTML = `<div class="ux-xy-head"><strong>Ploščica XY</strong><button type="button" class="ux-xy-close" aria-label="Zapri">✕</button></div>`
            + `<div class="ux-xy-chips">${chipRow('x', xs)}</div><div class="ux-xy-chips">${chipRow('y', ys)}</div>`
            + `<div class="ux-xy-pad" tabindex="0" role="slider" aria-label="${xs.label} in ${ys.label}" style="aspect-ratio: 1 / ${aspect.toFixed(3)}">`
            + `<div class="ux-xy-map"></div>`
            + (zx !== undefined ? `<span class="ux-xy-zero ux-xy-zero-x" style="left:${zx * 100}%"></span>` : '')
            + (zy !== undefined ? `<span class="ux-xy-zero ux-xy-zero-y" style="top:${(1 - zy) * 100}%"></span>` : '')
            + `<svg class="ux-xy-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path/></svg>`
            + `<span class="ux-xy-dot" aria-hidden="true"></span>`
            + `<span class="ux-xy-tick ux-xy-xmin">${format(xs.min, xs.decimals)}</span><span class="ux-xy-tick ux-xy-xmax">${format(xs.max, xs.decimals)} <i>${symbolOf(xs.label)}</i></span>`
            + `<span class="ux-xy-tick ux-xy-ymin">${format(ys.min, ys.decimals)}</span><span class="ux-xy-tick ux-xy-ymax"><i>${symbolOf(ys.label)}</i> ${format(ys.max, ys.decimals)}</span>`
            + `</div><p class="ux-xy-readout" aria-live="polite"></p>`
            + `<p class="ux-xy-hint">Vleci piko: oba parametra se premikata hkrati. Sličice kažejo, kako je graf videti tam.</p>`;
        // Phones: a sheet at the window's bottom, with the board scrolled into view above it.
        if (phone()) {
            if (panel.parentElement !== document.body) document.body.appendChild(panel);
            panel.classList.add('ux-xy-sheet');
            container.scrollIntoView({block: 'start', behavior: 'smooth'});
        } else {
            if (panel.parentElement !== container) container.insertBefore(panel, button);
            panel.classList.remove('ux-xy-sheet');
        }
        panel.hidden = false;
        pad = panel.querySelector<HTMLElement>('.ux-xy-pad')!;
        dot = panel.querySelector<HTMLElement>('.ux-xy-dot')!;
        trailPath = panel.querySelector<SVGPathElement>('.ux-xy-trail path')!;
        readout = panel.querySelector<HTMLElement>('.ux-xy-readout')!;
        const map = panel.querySelector<HTMLElement>('.ux-xy-map')!;
        cells = Array.from({length: GRID * GRID}, () => {
            const cell = document.createElement('span');
            cell.className = 'ux-xy-cell ux-xy-pending';
            map.appendChild(cell);
            return cell;
        });
        trail = [];
        drawTrail();
        place();
        bindPad();
        // The map: the app draws the board for each cell's pair of values; then the student's values come back.
        mapping = true;
        panel.classList.add('ux-xy-mapping');
        const x = xs, y = ys;
        const ox = x.value(), oy = y.value();
        let union: [number, number, number, number] | undefined;
        for (let row = 0; row < GRID && mine === token && !panel.hidden; row++) {
            for (let col = 0; col < GRID && mine === token && !panel.hidden; col++) {
                x.set(cellValue(x, col));
                y.set(cellValue(y, GRID - 1 - row));
                await settle();
                if (mine !== token) break;
                const cell = cells[row * GRID + col];
                const box = contentBox();
                if (box) union = union ? [Math.min(union[0], box[0]), Math.min(union[1], box[1]), Math.max(union[2], box[2]), Math.max(union[3], box[3])] : box;
                cell.replaceChildren(capture());
                frameCells(union, aspect);
                cell.classList.remove('ux-xy-pending');
            }
        }
        x.set(ox);
        y.set(oy);
        await settle();
        if (mine === token) {
            mapping = false;
            panel.classList.remove('ux-xy-mapping');
            place();
        }
    };

    const bindPad = () => {
        if (!pad) return;
        const target = pad;
        let dragging = false;
        const move = (event: PointerEvent) => {
            if (!xs || !ys || mapping) return;
            const box = target.getBoundingClientRect();
            const fx = clamp((event.clientX - box.left) / box.width, 0, 1);
            const fy = clamp(1 - (event.clientY - box.top) / box.height, 0, 1);
            xs.set(snap(xs, xs.min + fx * (xs.max - xs.min)));
            ys.set(snap(ys, ys.min + fy * (ys.max - ys.min)));
            trail.push([fx, fy]);
            if (trail.length > 400) trail.shift();
            drawTrail();
            place();
        };
        target.addEventListener('pointerdown', event => {
            if (mapping) return;
            dragging = true;
            target.setPointerCapture(event.pointerId);
            target.classList.add('ux-xy-active');
            trail.push([NaN, NaN]);
            move(event);
            event.preventDefault();
        });
        target.addEventListener('pointermove', event => { if (dragging) move(event); });
        const end = () => { dragging = false; target.classList.remove('ux-xy-active'); };
        target.addEventListener('pointerup', end);
        target.addEventListener('pointercancel', end);
        target.addEventListener('keydown', event => {
            if (!xs || !ys || mapping) return;
            const big = event.shiftKey ? 10 : 1;
            const stepOf = (slider: RegisteredSlider) => (slider.step > 0 ? slider.step : (slider.max - slider.min) / 100) * big;
            let handled = true;
            if (event.key === 'ArrowLeft') xs.set(snap(xs, xs.value() - stepOf(xs)));
            else if (event.key === 'ArrowRight') xs.set(snap(xs, xs.value() + stepOf(xs)));
            else if (event.key === 'ArrowDown') ys.set(snap(ys, ys.value() - stepOf(ys)));
            else if (event.key === 'ArrowUp') ys.set(snap(ys, ys.value() + stepOf(ys)));
            else handled = false;
            if (!handled) return;
            event.preventDefault();
            trail.push([fraction(xs, xs.value()), fraction(ys, ys.value())]);
            drawTrail();
            place();
        });
    };

    const open = () => {
        const list = choices();
        if (list.length < 2) return;
        if (!xs || !list.includes(xs)) xs = list[0];
        if (!ys || !list.includes(ys) || ys === xs) ys = list.find(entry => entry !== xs);
        void render();
    };
    const close = () => {
        token++;
        mapping = false;
        panel.hidden = true;
        panel.replaceChildren();
        pad = dot = readout = undefined;
        trailPath = undefined;
        cells = [];
    };
    button.addEventListener('click', () => { if (panel.hidden) open(); else close(); });
    panel.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('.ux-xy-close')) { if (!mapping) close(); return; }
        const chip = target.closest<HTMLButtonElement>('.ux-xy-chip');
        if (chip && !mapping) {
            const entry = choices()[Number(chip.dataset.index)];
            if (!entry) return;
            if (chip.dataset.axis === 'x') xs = entry; else ys = entry;
            void render();
        }
    });
    // Sliders moved elsewhere (inspector, prose, keyboard) move the dot too.
    let frame = 0;
    const onUpdate = () => {
        if (panel.hidden || mapping || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; place(); });
    };
    board.on('update', onUpdate);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !panel.hidden && !mapping) close(); };
    window.addEventListener('keydown', onKey);

    return () => {
        token++;
        window.clearInterval(watch);
        window.removeEventListener('keydown', onKey);
        board.off('update', onUpdate);
        if (frame) cancelAnimationFrame(frame);
        panel.remove(); button.remove();
    };
}

