/**
 * Prototype c24 "Kako je odvisno?" (Bret Victor's "Up and Down the Ladder of Abstraction", a scientist's parameter
 * sweep, an oscilloscope). Any number the board prints — an area, an arc length, a probability, a slope — is plotted
 * against a parameter: one sweep moves the slider through its whole range and draws the dependency as a curve, and a
 * live dot follows the slider afterwards. The student climbs from one picture to the function behind all pictures.
 */
import type {Board} from "jsxgraph";
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import {uxEnabled} from "./flags";
import {discoverLaw} from "./law";
import "./ux.css";

const SAMPLES = 41;
const W = 260, H = 150, PAD_L = 40, PAD_B = 22, PAD_T = 10, PAD_R = 10;

interface Quantity { key: string; label: string; unit: string }

export function format(value: number, digits = 3): string {
    if (!Number.isFinite(value)) return '–';
    const abs = Math.abs(value);
    const d = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : digits;
    const text = value.toFixed(d);
    return (text.includes('.') ? text.replace(/\.?0+$/, '') : text).replace('.', ',').replace('-', '−');
}

export function symbolOf(label: string): string {
    // »Lega točke P (t, stopinje)«: the letter in brackets is the parameter's symbol.
    const bracketed = /\((\p{L}{1,2}\d?)[,)\s]/u.exec(label)?.[1];
    if (bracketed) return bracketed;
    const last = /\s(\S{1,3})$/.exec(label.trim())?.[1];
    return last && !/^\d+$/.test(last) ? last : label.trim().split(/\s+/)[0];
}

/** Every "label number" pair the board prints, keyed by its label so the key survives the number changing. */
export function readouts(container: HTMLElement): Map<string, {quantity: Quantity; value: number}> {
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
                let label = before.replace(/^[\s,;|.)\]°%]+/, '').replace(/[\s=:≈]+$/, '').replace(/\s+/g, ' ').trim();
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
    // Prototype c13's ruler rows (»|AB| = 3,61«, »∠ABC = 72,3°«, »|AG| : |GM| = 2 : 1«) are numbers the student chose
    // to measure; they count as readouts too, so c24–c28 work on boards that print nothing themselves.
    container.querySelectorAll<HTMLElement>('.ux-measure-row').forEach(row => {
        const label = row.querySelector('b')?.textContent?.trim();
        if (!label) return;
        const rest = (row.textContent ?? '').slice((row.textContent ?? '').indexOf(label) + label.length);
        const match = /^\s*=\s*([−-]?\d+(?:[.,]\d+)?)(?:\s*:\s*(\d+(?:[.,]\d+)?))?/.exec(rest);
        if (!match) return;
        const read = (text: string) => Number(text.replace('−', '-').replace(',', '.'));
        const value = match[2] ? read(match[1]) / read(match[2]) : read(match[1]);
        if (!Number.isFinite(value)) return;
        const key = `📏 ${label}#0`;
        if (!found.has(key)) found.set(key, {quantity: {key, label, unit: rest.includes('°') ? '°' : ''}, value});
    });
    return found;
}

const phone = () => window.matchMedia('(max-width: 640px)').matches;

const BINS = 48;

/** The qualitative answers c28 offers, and the one the sweep finds. */
const SHAPES: [string, string][] = [['up', 'raste'], ['down', 'pada'], ['flat', 'ostane enaka'], ['peak', 'najprej raste, nato pada'], ['valley', 'najprej pada, nato raste']];

export function shapeOf(values: number[]): string {
    const f = values.filter(Number.isFinite);
    if (f.length < 3) return 'other';
    const lo = Math.min(...f), hi = Math.max(...f);
    if (hi - lo <= 1e-9 * Math.max(1, Math.abs(hi))) return 'flat';
    // Rounded readouts wobble by a last digit; a step smaller than 2 % of the range is not a turn.
    const tol = 0.02 * (hi - lo);
    const rising = (list: number[]) => list.every((v, i) => i === 0 || v >= list[i - 1] - tol);
    const falling = (list: number[]) => list.every((v, i) => i === 0 || v <= list[i - 1] + tol);
    // Flat pieces joined by jumps (an inscribed angle as P crosses to the other arc) are steps, not a smooth turn.
    const steps = f.slice(1).map((v, i) => Math.abs(v - f[i]));
    // Both the top and the bottom must be plateaus: a narrow peak caught by one or two samples is still a peak.
    const plateau = (level: number) => {
        let best = 0, run = 0;
        for (const v of f) { run = Math.abs(v - level) <= tol ? run + 1 : 0; best = Math.max(best, run); }
        return best >= 3;
    };
    if (steps.some(step => step > 0.25 * (hi - lo)) && steps.filter(step => step <= tol).length >= steps.length * 0.8
        && plateau(hi) && plateau(lo)) return 'steps';
    if (rising(f)) return 'up';
    if (falling(f)) return 'down';
    const top = f.indexOf(hi), bottom = f.indexOf(lo);
    if (top > 0 && top < f.length - 1 && rising(f.slice(0, top + 1)) && falling(f.slice(top))) return 'peak';
    if (bottom > 0 && bottom < f.length - 1 && falling(f.slice(0, bottom + 1)) && rising(f.slice(bottom))) return 'valley';
    return 'other';
}

/**
 * With `predict` (prototype c25 "Napovej odvisnost", PhET's and Desmos's predict-then-observe), the chart starts
 * empty: the student sketches how the number will change, and only then the sweep draws the truth over the sketch and
 * scores how well the shapes agree.
 */
export function attachDependence(board: Board, mode: boolean | 'choice' = false, gate = false): () => void {
    const predict = mode === true;
    const choice = mode === 'choice';
    const container = board.containerObj as HTMLElement | undefined;
    if (!container) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-dep-button';
    button.innerHTML = choice ? '<span aria-hidden="true">❓</span> Kaj se zgodi?' : '<span aria-hidden="true">📈</span> Kako je odvisno?';
    if (choice) button.classList.add('ux-dep-button-choice');
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
    let signature = '';
    const sync = () => {
        const found = readouts(container);
        button.hidden = choices().length === 0 || found.size === 0;
        // c28: a new set of numbers on the board (a new lesson frame) makes the question button call for attention.
        const next = [...found.keys()].sort().join('|');
        if (choice && next !== signature) {
            if (signature && !button.hidden && panel.hidden) {
                button.classList.remove('ux-dep-call');
                void button.offsetWidth;
                button.classList.add('ux-dep-call');
            }
            signature = next;
        }
    };
    const watch = window.setInterval(sync, 900);
    sync();

    let slider: RegisteredSlider | undefined;
    let quantity: string | undefined;
    let xs: number[] = [];
    let series = new Map<string, {quantity: Quantity; values: number[]}>();
    let sweeping = false;
    let token = 0;
    let predicting = false;
    let sketch: number[] = [];

    const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(resolve, 25))));

    const useful = () => [...series.values()].filter(({quantity: q, values}) => {
        const finite = values.filter(Number.isFinite);
        if (finite.length < SAMPLES / 3) return false;
        // The asked-about number is drawn even when it stays the same: that is the answer.
        if (choice && q.key === quantity) return true;
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

    /** The student's sketch in chart coordinates (bins across, 0..1 up). */
    const sketchPath = () => {
        let d = '', pen = false;
        sketch.forEach((fy, bin) => {
            if (!Number.isFinite(fy)) { pen = false; return; }
            const x = PAD_L + bin / (BINS - 1) * (W - PAD_L - PAD_R);
            const y = H - PAD_B - fy * (H - PAD_B - PAD_T);
            d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
            pen = true;
        });
        return `<path class="ux-dep-sketch" d="${d}"/>`;
    };
    const score = (agreement: number) => {
        const box = panel.querySelector<HTMLElement>('.ux-dep-score');
        if (!box) return;
        const stars = agreement >= 0.8 ? 3 : agreement >= 0.6 ? 2 : agreement >= 0.35 ? 1 : 0;
        const words = ['Poskusi znova: primerjaj modro napoved z oranžno resnico.', 'Smer je prava, oblika še ne povsem.', 'Dobro: oblika se lepo ujema.', 'Odlično! Napoved se ujema z obliko odvisnosti.'];
        box.innerHTML = `<span class="ux-dep-stars" aria-label="${stars} od 3">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span> Ujemanje oblike ${Math.round(agreement * 100)} %. ${words[stars]}`;
        box.hidden = false;
    };

    const plot = () => {
        const chart = panel.querySelector<SVGSVGElement>('.ux-dep-chart');
        const list = useful();
        if (!chart || !slider) return;
        const caption = panel.querySelector<HTMLElement>('.ux-dep-caption')!;
        if (predict && !sweeping && quantity && sketch.some(Number.isFinite) && !list.some(entry => entry.quantity.key === quantity)) {
            // The predicted number did not move at all: a flat sketch was right.
            const drawn = sketch.filter(Number.isFinite);
            const flat = Math.max(0, 1 - (Math.max(...drawn) - Math.min(...drawn)) * 1.5);
            const label = series.get(quantity)?.quantity.label ?? quantity;
            chart.innerHTML = `<rect class="ux-dep-frame" x="${PAD_L}" y="${PAD_T}" width="${W - PAD_L - PAD_R}" height="${H - PAD_B - PAD_T}"/>` + sketchPath();
            caption.innerHTML = `<b>${label}</b> se s <i>${symbolOf(slider.label)}</i> sploh ne spremeni.`;
            score(flat);
            return;
        }
        const predicted = predict && sketch.some(Number.isFinite);
        const chosen = list.find(entry => entry.quantity.key === quantity) ?? (predicted ? undefined : list[0]);
        if (!chosen && predicted) return;
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
        const references = constants().filter(entry => entry.quantity.key !== chosen.quantity.key).filter(entry => {
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
        // A number that stays at zero would leave the chart without height.
        if (hi - lo < 1e-12) { lo -= 1; hi += 1; }
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
        if (predict && sketch.some(Number.isFinite)) {
            chart.insertAdjacentHTML('beforeend', sketchPath());
            if (!sweeping) {
                // Shape agreement in the chart's own frame: mean vertical gap over the bins the student drew.
                let gap = 0, n = 0;
                sketch.forEach((fy, bin) => {
                    if (!Number.isFinite(fy)) return;
                    const i = Math.round(bin / (BINS - 1) * (SAMPLES - 1));
                    const v = values[i];
                    if (!Number.isFinite(v)) return;
                    gap += Math.abs(fy - (v - lo) / (hi - lo));
                    n++;
                });
                if (n) score(Math.max(0, 1 - 2.2 * gap / n));
            }
        }
        caption.innerHTML = `<b>${chosen.quantity.label}</b> v odvisnosti od <i>${symbolOf(slider.label)}</i>${unit ? ` (v ${unit.trim()})` : ''}`;
        const lawBox = panel.querySelector<HTMLElement>('.ux-dep-law');
        if (lawBox) {
            // c30: the law behind the curve, once the sweep is complete.
            const law = !sweeping && uxEnabled('c30') && !(predict && predicting) ? discoverLaw(xs, values, chosen.quantity.label, symbolOf(slider.label), v => format(v)) : undefined;
            lawBox.innerHTML = law ? `<span class="ux-dep-law-tag">${law.exact ? 'Zakon' : 'Zakon (zaokroženo)'}</span> <span class="ux-dep-law-text">${law.text}</span>` : '';
            lawBox.hidden = !law;
        }
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
        panel.innerHTML = `<div class="ux-dep-head"><strong>${predict ? 'Napovej odvisnost' : choice ? 'Kaj se zgodi?' : 'Kako je odvisno?'}</strong><button type="button" class="ux-dep-close" aria-label="Zapri">✕</button></div>`
            + `<div class="ux-dep-chips"><span>od</span>${chips}</div>`
            + `<p class="ux-dep-caption"></p>`
            + `<div class="ux-dep-plot"><svg class="ux-dep-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graf odvisnosti"></svg><span class="ux-dep-progress"></span></div>`
            + `<p class="ux-dep-law" hidden></p><p class="ux-dep-readout" aria-live="polite"></p><p class="ux-dep-score" hidden></p><div class="ux-dep-quantities"></div>`
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
        if (!predict && !choice) { void sweep(); return; }
        // Predict first: the chart is empty and the sweep waits for the student's sketch.
        predicting = true;
        sketch = Array(BINS).fill(NaN);
        series = new Map();
        const symbol = symbolOf(slider.label);
        const options = [...readouts(container).values()].filter(({quantity: q}) => q.label !== symbol && !q.label.endsWith(` ${symbol}`));
        if (!quantity || !options.some(option => option.quantity.key === quantity)) quantity = (options.find(option => option.value !== 0) ?? options[0])?.quantity.key;
        const chosen = options.find(option => option.quantity.key === quantity);
        const quantities = panel.querySelector<HTMLElement>('.ux-dep-quantities')!;
        quantities.innerHTML = options.length > 1 ? options.map(({quantity: q}) => `<button type="button" class="ux-dep-q ux-dep-pick${q.key === quantity ? ' ux-dep-q-on' : ''}" data-key="${q.key.replace(/"/g, '&quot;')}">${q.label}</button>`).join('') : '';
        panel.querySelector<HTMLElement>('.ux-dep-caption')!.innerHTML = chosen
            ? `Napovej: kako se bo spreminjala količina <b>${chosen.quantity.label}</b>, ko <i>${symbol}</i> raste od ${format(slider.min)} do ${format(slider.max)}? Nariši s prstom ali miško.`
            : 'Na tem grafu ni števila, ki bi ga lahko napovedal.';
        const chart = panel.querySelector<SVGSVGElement>('.ux-dep-chart')!;
        chart.innerHTML = `<rect class="ux-dep-frame" x="${PAD_L}" y="${PAD_T}" width="${W - PAD_L - PAD_R}" height="${H - PAD_B - PAD_T}"/>`
            + `<text class="ux-dep-tick" x="${PAD_L - 4}" y="${PAD_T + 8}" text-anchor="end">več</text><text class="ux-dep-tick" x="${PAD_L - 4}" y="${H - PAD_B}" text-anchor="end">manj</text>`
            + `<text class="ux-dep-tick" x="${PAD_L}" y="${H - 6}">${format(slider.min)}</text><text class="ux-dep-tick" x="${W - PAD_R}" y="${H - 6}" text-anchor="end">${format(slider.max)}</text>`
            + `<text class="ux-dep-axis" x="${(PAD_L + W - PAD_R) / 2}" y="${H - 6}" text-anchor="middle">${symbol}</text><g class="ux-dep-ink"></g>`;
        if (choice) {
            if (chosen) panel.querySelector<HTMLElement>('.ux-dep-caption')!.innerHTML = `Kaj se zgodi s količino <b>${chosen.quantity.label}</b>, ko <i>${symbol}</i> raste od ${format(slider.min)} do ${format(slider.max)}?`;
            chart.querySelector('.ux-dep-ink')?.remove();
            panel.querySelector<HTMLElement>('.ux-dep-readout')!.innerHTML = chosen ? `<span class="ux-dep-choices">${SHAPES.map(([id, text]) => `<button type="button" class="ux-dep-choice" data-shape="${id}">${text}</button>`).join('')}</span>` : '';
            panel.querySelector<HTMLElement>('.ux-dep-hint')!.textContent = 'Izberi odgovor. Nato drsnik sam preleti ves razpon in tabla pokaže, kaj se res zgodi.';
            return;
        }
        panel.querySelector<HTMLElement>('.ux-dep-readout')!.innerHTML = '<button type="button" class="ux-dep-check" disabled>Preveri napoved</button>';
        panel.querySelector<HTMLElement>('.ux-dep-hint')!.textContent = 'Nariši krivuljo od leve proti desni. Tabla se ne premakne, dokler ne preveriš.';
    };

    /** Scrubbing the dependency graph moves the slider: the abstraction drives the concrete picture. */
    const bindChart = () => {
        const chart = panel.querySelector<SVGSVGElement>('.ux-dep-chart')!;
        let down = false;
        let lastBin = -1;
        const move = (event: PointerEvent) => {
            if (!slider || sweeping) return;
            const box = chart.getBoundingClientRect();
            const fx = ((event.clientX - box.left) / box.width * W - PAD_L) / (W - PAD_L - PAD_R);
            if (predicting) {
                const fy = Math.min(1, Math.max(0, (H - PAD_B - (event.clientY - box.top) / box.height * H) / (H - PAD_B - PAD_T)));
                const bin = Math.round(Math.min(1, Math.max(0, fx)) * (BINS - 1));
                // Fill the bins between two pointer samples, so a fast stroke leaves no holes.
                if (lastBin >= 0 && Math.abs(bin - lastBin) > 1) {
                    const from = sketch[lastBin];
                    const step = bin > lastBin ? 1 : -1;
                    for (let b = lastBin + step; b !== bin; b += step) sketch[b] = from + (fy - from) * (b - lastBin) / (bin - lastBin);
                }
                sketch[bin] = fy;
                lastBin = bin;
                chart.querySelector('.ux-dep-ink')!.innerHTML = sketchPath();
                const check = panel.querySelector<HTMLButtonElement>('.ux-dep-check');
                if (check) check.disabled = sketch.filter(Number.isFinite).length < BINS / 3;
                return;
            }
            const value = slider.min + Math.min(1, Math.max(0, fx)) * (slider.max - slider.min);
            slider.set(slider.step > 0 ? Math.round((value - slider.min) / slider.step) * slider.step + slider.min : value);
        };
        chart.addEventListener('pointerdown', event => { down = true; lastBin = -1; chart.setPointerCapture(event.pointerId); move(event); });
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
        if (q && q.classList.contains('ux-dep-pick')) { quantity = q.dataset.key; render(); return; }
        if (q) { quantity = q.dataset.key; panel.querySelector<HTMLElement>('.ux-dep-score')?.setAttribute('hidden', ''); plot(); }
        if (target.closest('.ux-dep-check')) runCheck();
        const answer = target.closest<HTMLButtonElement>('.ux-dep-choice');
        if (answer && predicting) void runChoice(answer.dataset.shape ?? '');
    });
    async function runChoice(guess: string) {
        predicting = false;
        const asked = quantity;
        panel.querySelectorAll<HTMLButtonElement>('.ux-dep-choice').forEach(b => {
            b.disabled = true;
            b.classList.toggle('ux-dep-choice-on', b.dataset.shape === guess);
        });
        panel.querySelector<HTMLElement>('.ux-dep-quantities')!.innerHTML = '';
        panel.querySelector<HTMLElement>('.ux-dep-hint')!.textContent = 'Opazuj tablo: drsnik preleti ves razpon.';
        await sweep();
        if (panel.hidden || !asked) return;
        const values = series.get(asked)?.values ?? [];
        const truth = shapeOf(values);
        const box = panel.querySelector<HTMLElement>('.ux-dep-score');
        const name = series.get(asked)?.quantity.label ?? '';
        const said = SHAPES.find(([id]) => id === guess)?.[1] ?? '';
        const real = SHAPES.find(([id]) => id === truth)?.[1]
            ?? (truth === 'steps' ? 'na delih razpona ostane enaka in vmes skoči' : 'se spreminja drugače (niha)');
        if (box) {
            box.innerHTML = truth === guess
                ? `<span class="ux-dep-stars" aria-label="Pravilno">★★★</span> Pravilno: <b>${name}</b> ${real}.`
                : `<span class="ux-dep-stars" aria-label="Ne povsem">☆</span> Tvoj odgovor: »${said}«. V resnici <b>${name}</b> ${real}. Povleci po grafu in poglej, kje.`;
            box.hidden = false;
        }
        panel.querySelector<HTMLElement>('.ux-dep-hint')!.textContent = 'Povleci po grafu odvisnosti in tabla sledi. Za novo vprašanje izberi drug parameter zgoraj.';
    }
    // A tap right after a touch stroke may not produce a click on some phones; the release starts the check too.
    panel.addEventListener('pointerup', event => {
        const check = (event.target as HTMLElement).closest<HTMLButtonElement>('.ux-dep-check');
        if (check && !check.disabled) runCheck();
    });
    function runCheck() {
        if (!predicting) return;
        {
            predicting = false;
            panel.querySelector<HTMLElement>('.ux-dep-readout')!.textContent = '';
            panel.querySelector<HTMLElement>('.ux-dep-quantities')!.innerHTML = '';
            panel.querySelector<HTMLElement>('.ux-dep-hint')!.textContent = 'Modra je tvoja napoved, oranžna resnica. Povleci po grafu in tabla sledi.';
            void sweep();
        }
    }
    let frame = 0;
    const onUpdate = () => {
        if (panel.hidden || sweeping || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; live(); });
    };
    board.on('update', onUpdate);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !panel.hidden) close(); };
    window.addEventListener('keydown', onKey);

    /**
     * Prototype c29 "Najprej napoved" (a lab worksheet's »predict before you run it«): in a guided lesson, Naprej on a
     * frame whose board prints numbers first opens the c28 question. Answering, or pressing Naprej again, moves on.
     */
    let frameIndex = 0;
    let askedAt = -1;
    const onNext = (event: MouseEvent) => {
        const next = (event.target as HTMLElement | null)?.closest?.('button');
        if (!next || !/^(Naprej|Nadaljuj)\b/.test(next.textContent?.trim() ?? '') || panel.contains(next)) return;
        if (askedAt === frameIndex || button.hidden || sweeping) { frameIndex++; closeGate(); return; }
        event.preventDefault();
        event.stopPropagation();
        askedAt = frameIndex;
        if (panel.hidden) render();
        panel.classList.add('ux-dep-gate');
        const note = document.createElement('p');
        note.className = 'ux-dep-gate-note';
        note.innerHTML = '<b>Preden greš naprej:</b> kaj misliš, da se zgodi? Odgovori ali nadaljuj brez napovedi. <button type="button" class="ux-dep-gate-next">Naprej ›</button>';
        // On a phone the sheet covers the lesson's own Naprej, so the note carries one.
        note.querySelector('button')!.addEventListener('click', () => next.click());
        panel.querySelector('.ux-dep-head')?.after(note);
        if (phone()) panel.scrollIntoView({block: 'nearest'});
    };
    const closeGate = () => { if (panel.classList.contains('ux-dep-gate')) { panel.classList.remove('ux-dep-gate'); close(); } };
    if (gate) document.addEventListener('click', onNext, true);

    return () => {
        token++;
        if (gate) document.removeEventListener('click', onNext, true);
        window.clearInterval(watch);
        window.removeEventListener('keydown', onKey);
        board.off('update', onUpdate);
        if (frame) cancelAnimationFrame(frame);
        panel.remove(); button.remove();
    };
}
