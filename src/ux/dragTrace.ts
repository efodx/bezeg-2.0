/**
 * Prototype c26 "Sled vlečenja" (a lab data logger, Desmos's trace, a seismograph). While the student drags any point
 * on the board, every number the board prints is logged against where the point is. Numbers that move draw their
 * dependency as a trail of dots; numbers that never move are collected as "stays the same" — the invariant the
 * geometry lesson is about (the inscribed angle, the angle sum, the 2 : 1 ratio) is discovered by the student's own
 * hand rather than read in the prose.
 */
import type {Board} from "jsxgraph";
import {format, readouts, symbolOf} from "./dependence";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import {pointLabel} from "./measure";
import {uxEnabled} from "./flags";
import {discoverLaw} from "./law";
import "./ux.css";

const W = 260, H = 150, PAD_L = 40, PAD_B = 22, PAD_T = 10, PAD_R = 10;
const BINS = 160;

interface Sample { pos: number; x: number; y: number; values: Map<string, number> }

const phone = () => window.matchMedia('(max-width: 640px)').matches;

function draggablePoints(board: Board): any[] {
    return ((board as any).objectsList as any[] ?? []).filter(element =>
        (element.elType === 'point' || element.elType === 'glider') && element.visPropCalc?.visible
        && element.isDraggable !== false && !element.visProp?.fixed);
}

export function attachDragTrace(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    if (!container) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-dep-button ux-trace-button';
    button.innerHTML = '<span aria-hidden="true">〰️</span> Sled vlečenja';
    button.title = 'Zapisuj števila na tabli, medtem ko vlečeš točko';
    button.hidden = true;
    const panel = document.createElement('div');
    panel.className = 'ux-dep ux-trace';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Sled vlečenja');
    panel.hidden = true;
    container.append(panel, button);
    for (const element of [button, panel]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    const sync = () => { button.hidden = (draggablePoints(board).length === 0 && mountedSliders().length === 0) || readouts(container).size === 0; };
    const watch = window.setInterval(sync, 900);
    sync();

    let driver: any;
    let driverName = '';
    let samples: (Sample | undefined)[] = [];
    let quantity: string | undefined;
    let labels = new Map<string, {label: string; unit: string}>();
    let last: Sample | undefined;


    let bySlider = false;
    let lastDriverAt = 0;
    let notice = false;
    const known = new Map<RegisteredSlider, number>();
    const sliders = () => mountedSliders().filter(slider => !/hitrost|velikost|speed|size/i.test(slider.label));
    const snapshot = () => { for (const slider of sliders()) known.set(slider, slider.value()); };
    /** A slider's symbol: the letter in its brackets (»Lega točke P (t, stopinje)«), else its last short word. */
    const sliderSymbol = (label: string) => /\((\p{L}{1,2}\d?)[,)\s]/u.exec(label)?.[1] ?? symbolOf(label);
    const verb = () => bySlider ? 'spreminjaš' : 'vlečeš';
    const reset = () => { samples = []; last = undefined; quantity = undefined; labels = new Map(); };

    const dragged = (): any => {
        const touches = (board as any).touches as {obj?: any}[] | undefined;
        return touches?.find(entry => entry?.obj)?.obj ?? (board as any).mouse?.obj;
    };

    /** The axis the trail is drawn against: a glider's place on its curve, else the coordinate that moved more. */
    const axis = (): {key: 'pos' | 'x' | 'y'; label: string} => {
        const list = samples.filter((s): s is Sample => !!s);
        const spread = (key: 'pos' | 'x' | 'y') => {
            const values = list.map(s => s[key]).filter(Number.isFinite);
            return values.length ? Math.max(...values) - Math.min(...values) : 0;
        };
        const name = driverName || 'točke';
        if (bySlider) return {key: 'pos', label: driverName};
        if (driver?.elType === 'glider' && spread('pos') > 0) return {key: 'pos', label: `lega točke ${name}`};
        return spread('y') > spread('x') * 1.2 ? {key: 'y', label: `y točke ${name}`} : {key: 'x', label: `x točke ${name}`};
    };

    const record = () => {
        // The driver is the point being dragged, or else the slider whose value just changed (a lesson frame that
        // only offers sliders, or a scene animating one, logs just the same).
        let sample: Sample | undefined;
        const object = (board as any).mode === (board as any).BOARD_MODE_DRAG ? dragged() : undefined;
        const moved = sliders().find(slider => known.has(slider) && known.get(slider) !== slider.value());
        snapshot();
        if (object && (object.elType === 'point' || object.elType === 'glider')) {
            if (object !== driver) {
                // A different point starts a different experiment.
                driver = object;
                bySlider = false;
                driverName = pointLabel(object) ?? '';
                reset();
            }
            const pos = object.elType === 'glider' && Number.isFinite(object.position) ? Number(object.position) : NaN;
            sample = {pos, x: object.X(), y: object.Y(), values: new Map()};
        } else if (moved) {
            if (moved !== driver) {
                driver = moved;
                bySlider = true;
                driverName = sliderSymbol(moved.label);
                reset();
            }
            sample = {pos: moved.value(), x: NaN, y: NaN, values: new Map()};
        }
        if (!sample) {
            // The board changed without the driver moving: a late text update belongs to the last sample, while a
            // change long after it (a new lesson frame, another control) starts a new experiment.
            if (!last) return;
            const now = readouts(container);
            const changed = [...now].some(([key, {value}]) => last!.values.has(key) && Math.abs(last!.values.get(key)! - value) > 1e-9);
            if (!changed) return;
            if (performance.now() - lastDriverAt < 400) {
                for (const [key, {value}] of now) last.values.set(key, value);
            } else {
                driver = undefined;
                reset();
                notice = true;
            }
            plot();
            return;
        }
        lastDriverAt = performance.now();
        notice = false;
        for (const [key, {quantity: q, value}] of readouts(container)) {
            sample.values.set(key, value);
            if (!labels.has(key)) labels.set(key, {label: q.label, unit: q.unit});
        }
        last = sample;
        samples.push(sample);
        if (samples.length > 4 * BINS) samples = thin(samples);
        plot();
    };

    /** Keeps one sample per bin of the driving axis, the latest winning. */
    const thin = (list: (Sample | undefined)[]) => {
        const {key} = axis();
        const real = list.filter((s): s is Sample => !!s);
        const values = real.map(s => s[key]);
        const lo = Math.min(...values), hi = Math.max(...values);
        const kept = new Map<number, Sample>();
        for (const s of real) kept.set(hi > lo ? Math.round((s[key] - lo) / (hi - lo) * (BINS - 1)) : 0, s);
        return [...kept.values()];
    };

    /** Splits the logged numbers into the ones the drag moved and the ones it never did. */
    const classify = () => {
        const list = samples.filter((s): s is Sample => !!s);
        const moving: string[] = [], still: {key: string; value: number}[] = [];
        if (list.length < 2) return {moving, still, list};
        const {key: ax} = axis();
        const driverValues = list.map(s => s[ax]);
        const driverSpan = Math.max(...driverValues) - Math.min(...driverValues);
        for (const key of labels.keys()) {
            const values = list.map(s => s.values.get(key)).filter((v): v is number => v !== undefined && Number.isFinite(v));
            if (values.length < list.length * 0.8) continue;
            const lo = Math.min(...values), hi = Math.max(...values);
            const label = labels.get(key)!.label;
            // The dragged point's own coordinates printed back are no news.
            if (driverName && (label === driverName || label.startsWith(`${driverName} `) || label.endsWith(` ${driverName}`))) continue;
            if (hi - lo <= 1e-9 * Math.max(1, Math.abs(hi))) { if (values[0] !== 0) still.push({key, value: values[0]}); }
            else if (!values.every((v, i) => Math.abs(v - driverValues[i]) <= 0.01 * driverSpan + 1e-9)) moving.push(key);
        }
        return {moving, still, list};
    };

    const plot = () => {
        if (panel.hidden) return;
        const chart = panel.querySelector<SVGSVGElement>('.ux-dep-chart')!;
        const caption = panel.querySelector<HTMLElement>('.ux-dep-caption')!;
        const chips = panel.querySelector<HTMLElement>('.ux-dep-quantities')!;
        const stays = panel.querySelector<HTMLElement>('.ux-trace-still')!;
        const readout = panel.querySelector<HTMLElement>('.ux-dep-readout')!;
        const {moving, still, list} = classify();
        const frame = `<rect class="ux-dep-frame" x="${PAD_L}" y="${PAD_T}" width="${W - PAD_L - PAD_R}" height="${H - PAD_B - PAD_T}"/>`;
        const enoughMotion = list.length >= 6;
        stays.innerHTML = enoughMotion && still.length
            ? `<span class="ux-trace-still-head">Ostane enako:</span>` + still.slice(0, 4).map(({key, value}) => {
                const {label, unit} = labels.get(key)!;
                return `<span class="ux-trace-pill">✓ ${label} = ${format(value)}${unit}</span>`;
            }).join('')
            : '';
        const flat = enoughMotion && !moving.length && still.length > 0;
        if (!list.length || (!moving.length && !flat)) {
            chart.innerHTML = frame + `<text class="ux-trace-empty" x="${(PAD_L + W - PAD_R) / 2}" y="${(PAD_T + H - PAD_B) / 2 + 4}" text-anchor="middle">${list.length ? 'Vleci naprej …' : 'Povleci točko ali drsnik'}</text>`;
            caption.innerHTML = list.length
                ? (enoughMotion && still.length ? `Ko ${verb()} <b>${driverName || ''}</b>, se nobeno število ne spreminja.` : `Zapisujem <b>${driverName || ''}</b> …`)
                : notice ? 'Tabla se je spremenila brez vlečenja (nov korak ali druga nastavitev), zato zapisujem znova. Povleci točko ali premakni drsnik.'
            : 'Povleci katero koli točko na tabli ali premakni drsnik. Vsak premik zapiše piko za vsako število, ki ga tabla izpiše.';
            chips.innerHTML = '';
            readout.textContent = '';
            return;
        }
        // When nothing moves, the trail of the first unchanged number is drawn flat: the invariant made visible.
        const candidates = flat ? still.map(entry => entry.key) : moving;
        if (!quantity || !candidates.includes(quantity)) quantity = candidates[0];
        const {key: ax, label: axisLabel} = axis();
        const points = list.map(s => ({x: s[ax], y: s.values.get(quantity!)})).filter((p): p is {x: number; y: number} => p.y !== undefined && Number.isFinite(p.y) && Number.isFinite(p.x));
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        let x0 = Math.min(...xs), x1 = Math.max(...xs);
        if (x1 - x0 < 1e-9) { x0 -= 1; x1 += 1; }
        let lo = Math.min(...ys), hi = Math.max(...ys);
        const rawLo = lo, rawHi = hi;
        const span = hi - lo || Math.max(1, Math.abs(hi) * 0.6);
        lo -= span * 0.08; hi += span * 0.08;
        const sx = (x: number) => PAD_L + (x - x0) / (x1 - x0) * (W - PAD_L - PAD_R);
        const sy = (y: number) => H - PAD_B - (y - lo) / (hi - lo) * (H - PAD_B - PAD_T);
        const {label, unit} = labels.get(quantity)!;
        const latest = last?.values.get(quantity);
        chart.innerHTML = frame
            + points.map(p => `<circle class="ux-trace-dot${flat ? ' ux-trace-dot-still' : ''}" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="2.3"/>`).join('')
            + (last && latest !== undefined ? `<g class="ux-dep-now"><line class="ux-dep-now-line" x1="${sx(last[ax])}" x2="${sx(last[ax])}" y1="${PAD_T}" y2="${H - PAD_B}"/><circle cx="${sx(last[ax])}" cy="${sy(latest)}" r="5"/></g>` : '')
            + `<text class="ux-dep-tick" x="${PAD_L - 4}" y="${sy(rawHi) + 3}" text-anchor="end">${format(rawHi)}</text>`
            + (rawHi !== rawLo ? `<text class="ux-dep-tick" x="${PAD_L - 4}" y="${sy(rawLo) + 3}" text-anchor="end">${format(rawLo)}</text>` : '')
            + `<text class="ux-dep-tick" x="${PAD_L}" y="${H - 6}">${format(x0)}</text>`
            + `<text class="ux-dep-tick" x="${W - PAD_R}" y="${H - 6}" text-anchor="end">${format(x1)}</text>`
            + `<text class="ux-dep-axis" x="${(PAD_L + W - PAD_R) / 2}" y="${H - 6}" text-anchor="middle">${axisLabel}</text>`;
        caption.innerHTML = flat
            ? `<b>${label}</b> se ne spremeni, ko ${verb()} <i>${driverName || 'točko'}</i>: vse pike so na isti višini.`
            : `<b>${label}</b>, ko ${verb()} <i>${driverName || 'točko'}</i>${unit ? ` (v ${unit.trim()})` : ''}`;
        chips.innerHTML = candidates.length > 1 ? candidates.map(key => `<button type="button" class="ux-dep-q${key === quantity ? ' ux-dep-q-on' : ''}" data-key="${key.replace(/"/g, '&quot;')}">${labels.get(key)!.label}</button>`).join('') : '';
        readout.innerHTML = last && latest !== undefined ? `${axisLabel.split(' ')[0]} = ${format(last[ax])} → ${label} = ${format(latest)}${unit}` : '';
        // c30: the law behind the trail, from the student's own samples.
        const lawBox = panel.querySelector<HTMLElement>('.ux-dep-law');
        if (lawBox) {
            const symbol = bySlider ? driverName : `${axisLabel.split(' ')[0]}${driverName ? `_${driverName}` : ''}`;
            const law = uxEnabled('c30') && !flat ? discoverLaw(points.map(p => p.x), points.map(p => p.y), label, symbol, v => format(v)) : undefined;
            lawBox.innerHTML = law ? `<span class="ux-dep-law-tag">Zakon</span> <span class="ux-dep-law-text">${law.text}</span>` : '';
            lawBox.hidden = !law;
        }
    };

    const render = () => {
        panel.innerHTML = `<div class="ux-dep-head"><strong>Sled vlečenja</strong><span><button type="button" class="ux-trace-clear" title="Pobriši zapisane pike">Počisti</button><button type="button" class="ux-dep-close" aria-label="Zapri">✕</button></span></div>`
            + `<p class="ux-dep-caption"></p>`
            + `<div class="ux-dep-plot"><svg class="ux-dep-chart ux-trace-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sled števila med vlečenjem"></svg></div>`
            + `<p class="ux-dep-law" hidden></p><p class="ux-dep-readout" aria-live="polite"></p><div class="ux-trace-still" aria-live="polite"></div><div class="ux-dep-quantities"></div>`
            + `<p class="ux-dep-hint">Vleci počasi tja in nazaj: pike se zložijo v graf odvisnosti. Kar ostane enako, se zbere zgoraj.</p>`;
        if (phone()) {
            if (panel.parentElement !== document.body) document.body.appendChild(panel);
            panel.classList.add('ux-dep-sheet');
        } else {
            if (panel.parentElement !== container) container.insertBefore(panel, button);
            panel.classList.remove('ux-dep-sheet');
        }
        panel.hidden = false;
        snapshot();
        plot();
    };

    const close = () => { panel.hidden = true; panel.replaceChildren(); };
    button.addEventListener('click', () => { if (panel.hidden) render(); else close(); });
    panel.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('.ux-dep-close')) { close(); return; }
        if (target.closest('.ux-trace-clear')) { driver = undefined; reset(); plot(); return; }
        const q = target.closest<HTMLElement>('.ux-dep-q');
        if (q) { quantity = q.dataset.key; plot(); }
    });

    let frame = 0;
    const onUpdate = () => {
        if (panel.hidden || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; record(); });
    };
    board.on('update', onUpdate);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !panel.hidden) close(); };
    window.addEventListener('keydown', onKey);

    return () => {
        window.clearInterval(watch);
        window.removeEventListener('keydown', onKey);
        board.off('update', onUpdate);
        if (frame) cancelAnimationFrame(frame);
        panel.remove(); button.remove();
    };
}
