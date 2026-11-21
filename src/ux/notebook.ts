/**
 * Prototype c23 "Moj zvezek" (a student's exercise book, Cornell notes, a lab notebook). While the student goes through
 * a lesson, each frame they reach is written into a notebook: its heading, its display formulas and the board as they
 * left it. 📌 pins the board at any moment with the current parameter values and a note of their own. The notebook
 * opens as a page that prints or saves as PDF, so the lesson leaves something to revise from or hand in.
 */
import type {Board} from "jsxgraph";
import {lessonPosition, onLessonPosition, flatIndex, type LessonPosition} from "./lessonNav";
import {mountedSliders} from "./sliderRegistry";
import "./ux.css";

interface Entry {
    key: string;
    order: number;
    heading: string;
    label: string;
    formulas: HTMLElement[];
    picture: HTMLElement;
    width: number;
    height: number;
    values?: string;
    note?: string;
    pinned?: boolean;
}

function format(value: number, decimals: number): string {
    const digits = Math.min(Math.max(decimals, 0), 3);
    const text = value.toFixed(digits);
    return (digits > 0 ? text.replace(/\.?0+$/, '') : text).replace('.', ',').replace('-', '−');
}

function plural(n: number, one: string, two: string, few: string, many: string): string {
    const rest = n % 100;
    return `${n} ${rest === 1 ? one : rest === 2 ? two : rest === 3 || rest === 4 ? few : many}`;
}

export function attachNotebook(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const bar = document.createElement('div');
    bar.className = 'ux-nb';
    bar.innerHTML = '<button type="button" class="ux-nb-pin" title="Pripni ta graf v zvezek">📌 <span>Pripni</span></button>'
        + '<button type="button" class="ux-nb-open" title="Odpri zvezek">📓 Zvezek <b class="ux-nb-count">0</b></button>';
    container.appendChild(bar);
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) bar.addEventListener(type, event => event.stopPropagation());
    const count = bar.querySelector<HTMLElement>('.ux-nb-count')!;

    const entries = new Map<string, Entry>();
    let pins = 0;
    let position: LessonPosition | undefined = lessonPosition();
    let lessonId = position?.lessonId ?? '';
    let timer = 0;

    const picture = (): HTMLElement => {
        const box = document.createElement('div');
        box.className = 'ux-nb-picture';
        for (const child of Array.from(container.children)) {
            if (child === svg || child.classList.contains('JXGtext')) {
                const copy = child.cloneNode(true) as HTMLElement;
                copy.removeAttribute('id');
                copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
                box.appendChild(copy);
            }
        }
        return box;
    };
    const frameText = () => {
        const frame = document.querySelector('.guided-lesson-frame');
        const heading = frame?.querySelector('h3')?.textContent?.trim() ?? '';
        const kind = document.querySelector('.guided-lesson-frame-label')?.textContent?.trim() ?? '';
        const label = position ? `Korak ${position.stepIndex + 1} · okvir ${position.frameIndex + 1}${kind ? ` · ${kind}` : ''}` : kind;
        const formulas = [...(frame?.querySelectorAll<HTMLElement>('.guided-lesson-notation') ?? [])].slice(0, 3)
            .map(node => node.cloneNode(true) as HTMLElement);
        return {heading, label, formulas};
    };
    const updateCount = () => {
        count.textContent = String(entries.size);
        bar.classList.toggle('ux-nb-has', entries.size > 0);
    };
    const captureFrame = () => {
        if (!position || position.complete || !svg.clientWidth) return;
        const order = flatIndex(position.counts, position.stepIndex, position.frameIndex);
        const {heading, label, formulas} = frameText();
        const previous = [...entries.values()].filter(entry => !entry.pinned && entry.order < order).sort((p, q) => q.order - p.order)[0];
        entries.set(`f${order}`, {
            key: `f${order}`, order, heading: heading || previous?.heading || '', label, formulas,
            picture: picture(), width: svg.clientWidth, height: svg.clientHeight,
        });
        updateCount();
    };
    const schedule = (delay = 800) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(captureFrame, delay);
    };
    const onUpdate = () => { if (position) schedule(); };
    board.on('update', onUpdate);
    const stop = onLessonPosition(next => {
        if (!next) return;
        if (next.lessonId !== lessonId) { entries.clear(); pins = 0; lessonId = next.lessonId; }
        position = next;
        schedule(900);
    });
    if (position) schedule(900);

    const pin = () => {
        const values = mountedSliders().filter(slider => !/hitrost|velikost/i.test(slider.label)).slice(0, 6)
            .map(slider => `${slider.label} = ${format(slider.value(), slider.decimals)}`).join(' · ');
        const order = position ? flatIndex(position.counts, position.stepIndex, position.frameIndex) + 0.5 + pins / 100 : 1000 + pins;
        const {heading, label} = position ? frameText() : {heading: document.querySelector('h1')?.textContent?.trim() ?? 'Graf', label: ''};
        pins++;
        const entry: Entry = {key: `p${pins}`, order, heading, label: `📌 Moj posnetek ${pins}${label ? ` · ${label}` : ''}`, formulas: [],
            picture: picture(), width: svg.clientWidth, height: svg.clientHeight, values, pinned: true};
        entries.set(entry.key, entry);
        updateCount();
        bar.classList.remove('ux-nb-flash');
        void bar.offsetWidth;
        bar.classList.add('ux-nb-flash');
        container.classList.remove('ux-nb-shutter');
        void container.offsetWidth;
        container.classList.add('ux-nb-shutter');
    };

    let sheet: HTMLElement | undefined;
    const close = () => {
        sheet?.remove();
        sheet = undefined;
        document.documentElement.classList.remove('ux-nb-reading');
    };
    const open = () => {
        if (position) captureFrame();
        close();
        sheet = document.createElement('div');
        sheet.className = 'ux-nb-sheet';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-label', 'Moj zvezek');
        const title = document.querySelector('h1')?.textContent?.trim() ?? 'Lekcija';
        const date = new Date().toLocaleDateString('sl-SI', {day: 'numeric', month: 'long', year: 'numeric'});
        const list = [...entries.values()].sort((p, q) => p.order - q.order);
        sheet.innerHTML = `<div class="ux-nb-toolbar"><strong>📓 Moj zvezek</strong><span class="ux-nb-spacer"></span>`
            + `<button type="button" class="ux-nb-print">Natisni ali shrani PDF</button><button type="button" class="ux-nb-close" aria-label="Zapri">✕</button></div>`
            + `<article class="ux-nb-page"><header><h1>${title}</h1><p>${date} · ${plural(list.filter(entry => !entry.pinned).length, 'okvir', 'okvirja', 'okvirji', 'okvirjev')}, ${plural(list.filter(entry => entry.pinned).length, 'moj posnetek', 'moja posnetka', 'moji posnetki', 'mojih posnetkov')}</p></header></article>`;
        const page = sheet.querySelector<HTMLElement>('.ux-nb-page')!;
        if (!list.length) {
            page.insertAdjacentHTML('beforeend', '<p class="ux-nb-empty">Zvezek je še prazen. Pojdi skozi lekcijo ali pritisni 📌 Pripni, ko je na grafu kaj vrednega.</p>');
        }
        let lastHeading = '';
        for (const entry of list) {
            const section = document.createElement('section');
            section.className = `ux-nb-entry${entry.pinned ? ' ux-nb-pinned' : ''}`;
            if (entry.heading && entry.heading !== lastHeading) {
                const h = document.createElement('h2');
                h.textContent = entry.heading;
                section.appendChild(h);
                lastHeading = entry.heading;
            }
            const row = document.createElement('div');
            row.className = 'ux-nb-row';
            const text = document.createElement('div');
            text.className = 'ux-nb-text';
            const label = document.createElement('p');
            label.className = 'ux-nb-label';
            label.textContent = entry.label;
            text.appendChild(label);
            for (const formula of entry.formulas) {
                const holder = document.createElement('div');
                holder.className = 'ux-nb-formula';
                holder.appendChild(formula.cloneNode(true));
                text.appendChild(holder);
            }
            if (entry.values) {
                const values = document.createElement('p');
                values.className = 'ux-nb-values';
                values.textContent = entry.values;
                text.appendChild(values);
            }
            const note = document.createElement('p');
            note.className = 'ux-nb-note';
            note.contentEditable = 'true';
            note.dataset.placeholder = entry.pinned ? 'Kaj sem opazil …' : 'Moja opomba …';
            note.textContent = entry.note ?? '';
            note.addEventListener('input', () => { entry.note = note.textContent ?? ''; });
            text.appendChild(note);
            const figure = document.createElement('div');
            figure.className = 'ux-nb-figure';
            const scale = 300 / entry.width;
            figure.style.width = '300px';
            figure.style.height = `${Math.min(entry.height * scale, 300)}px`;
            const inner = entry.picture.cloneNode(true) as HTMLElement;
            inner.style.width = `${entry.width}px`;
            inner.style.height = `${entry.height}px`;
            inner.style.transform = `scale(${scale})`;
            // Tall boards are cut around their middle, where lessons put the figure.
            const cut = Math.max(0, (entry.height * scale - 300) / 2);
            inner.style.top = `${-cut}px`;
            figure.appendChild(inner);
            row.append(text, figure);
            section.appendChild(row);
            page.appendChild(section);
        }
        document.body.appendChild(sheet);
        document.documentElement.classList.add('ux-nb-reading');
        sheet.querySelector<HTMLButtonElement>('.ux-nb-close')!.focus();
        sheet.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            if (target.closest('.ux-nb-close')) close();
            if (target.closest('.ux-nb-print')) window.print();
        });
    };
    bar.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('.ux-nb-pin')) pin();
        if (target.closest('.ux-nb-open')) open();
    });
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && sheet) close(); };
    window.addEventListener('keydown', onKey);

    return () => {
        stop();
        board.off('update', onUpdate);
        window.clearTimeout(timer);
        window.removeEventListener('keydown', onKey);
        close();
        bar.remove();
    };
}
