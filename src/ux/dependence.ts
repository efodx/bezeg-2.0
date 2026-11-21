/**
 * Prototype c24 "Kako je odvisno?" (Bret Victor's "Up and Down the Ladder of Abstraction", a scientist's parameter
 * sweep, an oscilloscope). Any number the board prints — an area, an arc length, a probability, a slope — is plotted
 * against a parameter: one sweep moves the slider through its whole range and draws the dependency as a curve, and a
 * live dot follows the slider afterwards. The student climbs from one picture to the function behind all pictures.
 */
import type {Board} from "jsxgraph";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

const SAMPLES = 41;
const W = 260, H = 150, PAD_L = 40, PAD_B = 22, PAD_T = 10, PAD_R = 10;

interface Quantity { key: string; label: string; unit: string }

function format(value: number, digits = 3): string {
    if (!Number.isFinite(value)) return '–';
    const abs = Math.abs(value);
    const d = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : digits;
    const text = value.toFixed(d);
    return (text.includes('.') ? text.replace(/\.?0+$/, '') : text).replace('.', ',').replace('-', '−');
}

function symbolOf(label: string): string {
    const last = /\s(\S{1,3})$/.exec(label.trim())?.[1];
    return last && !/^\d+$/.test(last) ? last : label.trim().split(/\s+/)[0];
}

/** Every "label number" pair the board prints, keyed by its label so the key survives the number changing. */
function readouts(container: HTMLElement): Map<string, {quantity: Quantity; value: number}> {
    const found = new Map<string, {quantity: Quantity; value: number}>();
    const texts = [...container.querySelectorAll<HTMLElement>('.JXGtext')].filter(node =>
        node.style.display !== 'none' && node.style.visibility !== 'hidden' && !node.querySelector('mjx-container')
        && /\p{L}/u.test(node.textContent ?? ''));
    // Keys are labels (with a count for repeats), not node positions: axis tick labels come and go as the view rescales.
    const seen = new Map<string, number>();
    texts.forEach(node => {
        const lines = (node.innerText || node.textContent || '').split(/\n+/);
        lines.forEach(line => {
            const number = /[−-]?\d+(?:[.,]\d+)?/g;
            let previous = 0;
            let match: RegExpExecArray | null;
            while ((match = number.exec(line))) {
                const before = line.slice(previous, match.index);
                previous = match.index + match[0].length;
                // A number inside a coordinate pair or right after another number is not a quantity of its own.
                if (/[(\[,;]\s*$/.test(before) && !/[=:]\s*[(\[]?\s*$/.test(before)) continue;
                if (/[(\[]\s*$/.test(before)) continue;
                let label = before.replace(/^[\s,;|.)\]]+/, '').replace(/[\s=:≈]+$/, '').replace(/\s+/g, ' ').trim();
                // A label that runs on from an earlier sentence starts at its last capitalised word, or keeps four words.
                if (label.length > 24) {
                    const words = label.split(' ');
                    const start = words.map((word, i) => /^\p{Lu}/u.test(word) ? i : -1).filter(i => i >= 0).pop();
                    label = words.slice(start ?? Math.max(0, words.length - 4)).join(' ');
                }
                if (!label || !/[\p{L}′)|∫]$/u.test(label) || label.length > 48) continue;
                const after = line.slice(previous, previous + 2);
                const unit = after.trim().startsWith('%') ? ' %' : after.startsWith('°') ? '°' : '';
                const value = Number(match[0].replace('−', '-').replace(',', '.'));
                if (!Number.isFinite(value)) continue;
                const repeat = seen.get(label) ?? 0;
                seen.set(label, repeat + 1);
                const key = `${label}#${repeat}`;
                if (!found.has(key)) found.set(key, {quantity: {key, label, unit}, value});
            }
        });
    });
    return found;
}

const phone = () => window.matchMedia('(max-width: 640px)').matches;

export function attachDependence(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    if (!container) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-dep-button';
    button.innerHTML = '<span aria-hidden="true">📈</span> Kako je odvisno?';
    button.title = 'Nariši, kako se število na grafu spreminja s parametrom';
    button.hidden = true;
    const panel = document.createElement('div');
    panel.className = 'ux-dep';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Kako je odvisno?');
    panel.hidden = true;
    container.append(panel, button);
    for (const element of [button, panel]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    const choices = () => mountedSliders().filter(slider => !/hitrost|velikost|speed|size/i.test(slider.label));
    const sync = () => { button.hidden = choices().length === 0 || readouts(container).size === 0; };
    const watch = window.setInterval(sync, 900);
    sync();

    let slider: RegisteredSlider | undefined;
    let quantity: string | undefined;
    let xs: number[] = [];
    let series = new Map<string, {quantity: Quantity; values: number[]}>();
    let sweeping = false;
    let token = 0;

    const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(resolve, 25))));

    const useful = () => [...series.values()].filter(({values}) => {
        const finite = values.filter(Number.isFinite);
        if (finite.length < SAMPLES / 3) return false;
        const lo = Math.min(...finite), hi = Math.max(...finite);
        if (hi - lo < 1e-9 * Math.max(1, Math.abs(hi))) return false;
        // The parameter itself, printed back (perhaps rounded), is no news.
        const tolerance = 0.01 * Math.abs(xs[xs.length - 1] - xs[0]) + 1e-9;
        return !values.every((v, i) => !Number.isFinite(v) || Math.abs(v - xs[i]) <= tolerance);
    });

    const constants = () => [...series.values()].filter(({values}) => {
        const finite = values.filter(Number.isFinite);
        return finite.length === values.length && finite.every(v => Math.abs(v - finite[0]) <= 1e-9 * Math.max(1, Math.abs(v)));
    });

    const plot = () => {
        const chart = panel.querySelector<SVGSVGElement>('.ux-dep-chart');
        const list = useful();
        if (!chart || !slider) return;
        const chosen = list.find(entry => entry.quantity.key === quantity) ?? list[0];
        const caption = panel.querySelector<HTMLElement>('.ux-dep-caption')!;
        if (!chosen) {
            chart.innerHTML = '';
            caption.textContent = sweeping ? '' : `Ko se ${symbolOf(slider.label)} spreminja, nobeno število na grafu ne spremeni vrednosti.`;
            return;
        }
        quantity = chosen.quantity.key;
        const values = chosen.values;
        const finite = values.filter(Number.isFinite);
        let lo = Math.min(...finite), hi = Math.max(...finite);
        // Quantities that did not move with the parameter are references (an integral the sums approach, a limit).
        const references = constants().filter(entry => {
            const v = entry.values.find(Number.isFinite)!;
            return v !== 0 && v >= lo - (hi - lo) * 0.5 && v <= hi + (hi - lo) * 0.5;
        }).slice(0, 2);
        for (const entry of references) { const v = entry.values.find(Number.isFinite)!; lo = Math.min(lo, v); hi = Math.max(hi, v); }
        if (lo > 0 && lo < hi * 0.25) lo = 0;
        if (hi < 0 && hi > lo * 0.25) hi = 0;
        const rawLo = lo, rawHi = hi;
        const span = hi - lo || 1;
        const floor = lo === 0, ceiling = hi === 0;
        lo = floor ? 0 : lo - span * 0.06;
        hi = ceiling ? 0 : hi + span * 0.06;
        const x0 = slider.min, x1 = slider.max;
        const sx = (x: number) => PAD_L + (x - x0) / (x1 - x0) * (W - PAD_L - PAD_R);
        const sy = (y: number) => H - PAD_B - (y - lo) / (hi - lo) * (H - PAD_B - PAD_T);
        let d = '', pen = false;
        values.forEach((v, i) => {
            if (!Number.isFinite(v)) { pen = false; return; }
            d += `${pen ? 'L' : 'M'}${sx(xs[i]).toFixed(1)},${sy(v).toFixed(1)}`;
            pen = true;
        });
        const zeroY = lo < 0 && hi > 0 ? `<line class="ux-dep-zero" x1="${PAD_L}" x2="${W - PAD_R}" y1="${sy(0)}" y2="${sy(0)}"/>` : '';
        const zeroX = x0 < 0 && x1 > 0 ? `<line class="ux-dep-zero" y1="${PAD_T}" y2="${H - PAD_B}" x1="${sx(0)}" x2="${sx(0)}"/>` : '';
        const unit = chosen.quantity.unit;
        chart.innerHTML = `<rect class="ux-dep-frame" x="${PAD_L}" y="${PAD_T}" width="${W - PAD_L - PAD_R}" height="${H - PAD_B - PAD_T}"/>${zeroY}${zeroX}`
            + references.map(entry => {
                const v = entry.values.find(Number.isFinite)!;
                return `<line class="ux-dep-ref" x1="${PAD_L}" x2="${W - PAD_R}" y1="${sy(v)}" y2="${sy(v)}"/><text class="ux-dep-ref-label" x="${W - PAD_R - 3}" y="${sy(v) - 4}" text-anchor="end">${entry.quantity.label} ${format(v)}</text>`;
            }).join('')
            + `<path class="ux-dep-line" d="${d}"/>`
            + `<text class="ux-dep-tick" x="${PAD_L - 4}" y="${sy(rawHi) + 3}" text-anchor="end">${format(rawHi)}</text>`
            + `<text class="ux-dep-tick" x="${PAD_L - 4}" y="${sy(rawLo) + 3}" text-anchor="end">${format(rawLo)}</text>`
            + `<text class="ux-dep-tick" x="${PAD_L}" y="${H - 6}">${format(x0)}</text>`
            + `<text class="ux-dep-tick" x="${W - PAD_R}" y="${H - 6}" text-anchor="end">${format(x1)}</text>`
            + `<text class="ux-dep-axis" x="${(PAD_L + W - PAD_R) / 2}" y="${H - 6}" text-anchor="middle">${symbolOf(slider.label)}</text>`
            + `<g class="ux-dep-now"><line class="ux-dep-now-line" y1="${PAD_T}" y2="${H - PAD_B}"/><circle r="5"/></g>`;
        chart.dataset.lo = String(lo); chart.dataset.hi = String(hi);
        caption.innerHTML = `<b>${chosen.quantity.label}</b> v odvisnosti od <i>${symbolOf(slider.label)}</i>${unit ? ` (v ${unit.trim()})` : ''}`;
        const chips = panel.querySelector<HTMLElement>('.ux-dep-quantities')!;
        chips.innerHTML = list.length > 1 ? list.map(entry => `<button type="button" class="ux-dep-q${entry === chosen ? ' ux-dep-q-on' : ''}" data-key="${entry.quantity.key.replace(/"/g, '&quot;')}">${entry.quantity.label}</button>`).join('') : '';
        live();
    };

    /** The dot: where the board is now. */
    const live = () => {
        const chart = panel.querySelector<SVGSVGElement>('.ux-dep-chart');
        const now = chart?.querySelector<SVGGElement>('.ux-dep-now');
        if (!chart || !now || !slider || !quantity || sweeping) return;
        const reading = readouts(container).get(quantity);
        const x = slider.value();
        const lo = Number(chart.dataset.lo), hi = Number(chart.dataset.hi);
        const px = PAD_L + (x - slider.min) / (slider.max - slider.min) * (W - PAD_L - PAD_R);
        now.querySelector('line')!.setAttribute('x1', String(px));
        now.querySelector('line')!.setAttribute('x2', String(px));
        const circle = now.querySelector('circle')!;
        if (reading) {
            const py = H - PAD_B - (reading.value - lo) / (hi - lo) * (H - PAD_B - PAD_T);
            circle.setAttribute('cx', String(px));
            circle.setAttribute('cy', String(Math.max(PAD_T, Math.min(H - PAD_B, py))));
            circle.style.display = '';
        } else circle.style.display = 'none';
        const readout = panel.querySelector<HTMLElement>('.ux-dep-readout')!;
        const unit = series.get(quantity)?.quantity.unit ?? '';
        readout.innerHTML = `<i>${symbolOf(slider.label)}</i> = ${format(x)} → ${reading ? `${format(reading.value)}${unit}` : '–'}`;
    };

    const sweep = async () => {
        if (!slider) return;
        const mine = ++token;
        sweeping = true;
        panel.classList.add('ux-dep-sweeping');
        const target = slider;
        const original = target.value();
        xs = Array.from({length: SAMPLES}, (_, i) => {
            const v = target.min + (target.max - target.min) * i / (SAMPLES - 1);
            return target.step > 0 ? Math.min(target.max, Math.round((v - target.min) / target.step) * target.step + target.min) : v;
        });
        series = new Map();
        const bar = panel.querySelector<HTMLElement>('.ux-dep-progress')!;
        for (let i = 0; i < xs.length && mine === token && !panel.hidden; i++) {
            target.set(xs[i]);
            await settle();
            for (const [key, {quantity: q, value}] of readouts(container)) {
                if (!series.has(key)) series.set(key, {quantity: q, values: Array(SAMPLES).fill(NaN)});
                series.get(key)!.values[i] = value;
            }
            bar.style.width = `${(i + 1) / xs.length * 100}%`;
            if (i % 4 === 3) plot();
        }
        target.set(original);
        await settle();
        if (mine !== token) return;
        sweeping = false;
        panel.classList.remove('ux-dep-sweeping');
        plot();
    };

    const render = () => {
        const list = choices();
        if (!slider || !list.includes(slider)) slider = list[0];
        if (!slider) return;
        const chips = list.map((entry, i) => `<button type="button" class="ux-dep-chip${entry === slider ? ' ux-dep-chip-on' : ''}" data-index="${i}" title="${entry.label}">${symbolOf(entry.label)}</button>`).join('');
        panel.innerHTML = `<div class="ux-dep-head"><strong>Kako je odvisno?</strong><button type="button" class="ux-dep-close" aria-label="Zapri">✕</button></div>`
            + `<div class="ux-dep-chips"><span>od</span>${chips}</div>`
            + `<p class="ux-dep-caption"></p>`
            + `<div class="ux-dep-plot"><svg class="ux-dep-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graf odvisnosti"></svg><span class="ux-dep-progress"></span></div>`
            + `<p class="ux-dep-readout" aria-live="polite"></p><div class="ux-dep-quantities"></div>`
            + `<p class="ux-dep-hint">Premakni drsnik ali povleci po grafu odvisnosti: pika kaže, kje je tabla zdaj.</p>`;
        if (phone()) {
            if (panel.parentElement !== document.body) document.body.appendChild(panel);
            panel.classList.add('ux-dep-sheet');
        } else {
            if (panel.parentElement !== container) container.insertBefore(panel, button);
            panel.classList.remove('ux-dep-sheet');
        }
        panel.hidden = false;
        bindChart();
        void sweep();
    };

    /** Scrubbing the dependency graph moves the slider: the abstraction drives the concrete picture. */
    const bindChart = () => {
        const chart = panel.querySelector<SVGSVGElement>('.ux-dep-chart')!;
        let down = false;
        const move = (event: PointerEvent) => {
            if (!slider || sweeping) return;
            const box = chart.getBoundingClientRect();
            const fx = ((event.clientX - box.left) / box.width * W - PAD_L) / (W - PAD_L - PAD_R);
            const value = slider.min + Math.min(1, Math.max(0, fx)) * (slider.max - slider.min);
            slider.set(slider.step > 0 ? Math.round((value - slider.min) / slider.step) * slider.step + slider.min : value);
        };
        chart.addEventListener('pointerdown', event => { down = true; chart.setPointerCapture(event.pointerId); move(event); });
        chart.addEventListener('pointermove', event => { if (down) move(event); });
        chart.addEventListener('pointerup', () => { down = false; });
        chart.addEventListener('pointercancel', () => { down = false; });
    };

    const close = () => { token++; sweeping = false; panel.hidden = true; panel.replaceChildren(); };
    button.addEventListener('click', () => { if (panel.hidden) render(); else close(); });
    panel.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('.ux-dep-close')) { close(); return; }
        const chip = target.closest<HTMLElement>('.ux-dep-chip');
        if (chip && !sweeping) { slider = choices()[Number(chip.dataset.index)]; render(); return; }
        const q = target.closest<HTMLElement>('.ux-dep-q');
        if (q) { quantity = q.dataset.key; plot(); }
    });
    let frame = 0;
    const onUpdate = () => {
        if (panel.hidden || sweeping || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; live(); });
    };
    board.on('update', onUpdate);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !panel.hidden) close(); };
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
