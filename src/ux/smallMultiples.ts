/**
 * Prototype c19 "Mreža primerov" (Edward Tufte's small multiples, a photographer's contact sheet). One press lays the
 * board out for six values of a parameter side by side, so the effect of the parameter is seen at once instead of
 * one slider position at a time. Tapping a cell moves the slider there. Every shared slider can be chosen; the board
 * is rendered by the app itself for each value and then put back.
 */
import type {Board} from "jsxgraph";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

const CELLS = 6;

function format(value: number, decimals: number): string {
    const digits = Math.min(Math.max(decimals, 0), 3);
    const text = value.toFixed(digits);
    return (digits > 0 ? text.replace(/\.?0+$/, '') : text).replace('.', ',').replace('-', '−');
}

function symbolOf(label: string): string {
    const last = /\s(\S{1,3})$/.exec(label.trim())?.[1];
    return last && !/^\d+$/.test(last) ? last : label.trim().split(/\s+/)[0];
}

/** Six values across the slider's range, on its step, with 0 included when the range crosses it. */
export function sampleValues(min: number, max: number, step: number, count = CELLS): number[] {
    const snap = (v: number) => step > 0 ? Math.round((v - min) / step) * step + min : v;
    const values = Array.from({length: count}, (_, i) => snap(min + (max - min) * i / (count - 1)));
    if (min < 0 && max > 0 && !values.some(v => Math.abs(v) < 1e-9)) {
        let nearest = 0;
        values.forEach((v, i) => { if (Math.abs(v) < Math.abs(values[nearest])) nearest = i; });
        if (nearest > 0 && nearest < count - 1) values[nearest] = 0;
    }
    return [...new Set(values.map(v => Number(v.toFixed(10))))];
}

export function attachSmallMultiples(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-sm-button';
    button.innerHTML = '<span aria-hidden="true">▦</span> Mreža primerov';
    button.title = 'Pokaži graf za šest vrednosti parametra hkrati';
    button.hidden = true;
    const sheet = document.createElement('div');
    sheet.className = 'ux-sm-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Mreža primerov');
    sheet.hidden = true;
    container.append(sheet, button);
    for (const element of [button, sheet]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    let busy = false;
    let chosen: RegisteredSlider | undefined;
    const choices = () => mountedSliders().filter(slider => !/hitrost|velikost|speed|size/i.test(slider.label));
    const sync = () => { button.hidden = choices().length === 0; };
    const watch = window.setInterval(sync, 800);
    sync();

    const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(resolve, 40))));

    const capture = (): SVGSVGElement => {
        const copy = svg.cloneNode(true) as SVGSVGElement;
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        copy.setAttribute('viewBox', `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
        copy.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        copy.removeAttribute('width');
        copy.removeAttribute('height');
        copy.removeAttribute('style');
        copy.setAttribute('class', 'ux-sm-svg');
        return copy;
    };

    const build = async () => {
        if (busy) return;
        const list = choices();
        if (!list.length) return;
        if (!chosen || !list.includes(chosen)) chosen = list[0];
        busy = true;
        const slider = chosen;
        const original = slider.value();
        const values = sampleValues(slider.min, slider.max, slider.step);
        // The value the board shows now takes the place of its nearest sample, so the sheet starts from the familiar.
        if (!values.some(v => Math.abs(v - original) < 1e-9)) {
            let nearest = 0;
            values.forEach((v, i) => { if (Math.abs(v - original) < Math.abs(values[nearest] - original)) nearest = i; });
            values[nearest] = original;
            values.sort((p, q) => p - q);
        }
        const chips = list.map((entry, i) => `<button type="button" class="ux-sm-chip${entry === slider ? ' ux-sm-chip-on' : ''}" data-index="${i}" title="${entry.label}">${symbolOf(entry.label)}</button>`).join('');
        sheet.innerHTML = `<div class="ux-sm-head"><strong>Mreža primerov</strong><span class="ux-sm-chips">${chips}</span><button type="button" class="ux-sm-close" aria-label="Zapri">✕</button></div>`
            + `<p class="ux-sm-hint">${slider.label}: ${values.length} vrednosti. Tapni sličico in drsnik skoči tja.</p><div class="ux-sm-grid"></div>`;
        sheet.hidden = false;
        sheet.style.setProperty('--ux-sm-aspect', `${svg.clientWidth} / ${svg.clientHeight}`);
        const grid = sheet.querySelector<HTMLElement>('.ux-sm-grid')!;
        const symbol = symbolOf(slider.label);
        const cells = values.map(value => {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'ux-sm-cell ux-sm-pending';
            cell.dataset.value = String(value);
            cell.innerHTML = `<span class="ux-sm-frame"></span><span class="ux-sm-caption"><i>${symbol}</i> = ${format(value, slider.decimals)}</span>`;
            grid.appendChild(cell);
            return cell;
        });
        // The app draws each value itself; the board is hidden behind the sheet meanwhile and then put back.
        for (let i = 0; i < values.length; i++) {
            if (sheet.hidden) break;
            slider.set(values[i]);
            await settle();
            cells[i].querySelector('.ux-sm-frame')!.replaceChildren(capture());
            cells[i].classList.remove('ux-sm-pending');
        }
        slider.set(original);
        await settle();
        let nearest = 0;
        values.forEach((v, i) => { if (Math.abs(v - original) < Math.abs(values[nearest] - original)) nearest = i; });
        if (Math.abs(values[nearest] - original) <= (slider.step || 1e-9) / 2) cells[nearest].classList.add('ux-sm-current');
        busy = false;
    };

    const close = () => { sheet.hidden = true; sheet.replaceChildren(); };
    button.addEventListener('click', () => { if (sheet.hidden) void build(); else close(); });
    sheet.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('.ux-sm-close')) { if (!busy) close(); return; }
        const chip = target.closest<HTMLElement>('.ux-sm-chip');
        if (chip && !busy) { chosen = choices()[Number(chip.dataset.index)]; void build(); return; }
        const cell = target.closest<HTMLElement>('.ux-sm-cell');
        if (cell && !busy && chosen) { chosen.set(Number(cell.dataset.value)); close(); }
    });
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !sheet.hidden && !busy) close(); };
    window.addEventListener('keydown', onKey);

    return () => {
        window.clearInterval(watch);
        window.removeEventListener('keydown', onKey);
        sheet.remove(); button.remove();
    };
}
