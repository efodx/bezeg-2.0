/**
 * Prototype c27 "Megla" (fog of war in strategy games, the explored map in Zelda, a museum stamp card). Every slider
 * track starts hatched, as unexplored land; wherever the student has dragged the thumb the fog lifts and the track
 * turns elderflower green. A small meter beside each slider counts the explored share, and the whole range earns a
 * check. Students who leave a parameter at its default, or only nudge it, see at a glance where they have not looked.
 */
import {mountedSliders, type RegisteredSlider} from "./sliderRegistry";
import "./ux.css";

/** Playback speed and drawing size are settings, not mathematics to explore. */
const explorable = () => mountedSliders().filter(slider => !/hitrost|velikost|speed|size/i.test(slider.label));

const BINS = 48;
/** Explored bins per slider, per page: a remount (a new lesson frame) keeps what the student already saw. */
const explored = new Map<string, Set<number>>();

const keyOf = (slider: RegisteredSlider) => `${location.pathname}|${slider.label}|${slider.min}|${slider.max}`;

function binOf(slider: RegisteredSlider, value: number): number {
    const span = slider.max - slider.min;
    if (!(span > 0)) return 0;
    return Math.max(0, Math.min(BINS - 1, Math.floor((value - slider.min) / span * BINS)));
}

export function attachFog(): () => void {
    document.documentElement.classList.add('ux-fog');
    const last = new Map<RegisteredSlider, number>();
    const done = new Set<string>();

    const visit = (slider: RegisteredSlider, from: number | undefined, to: number) => {
        const key = keyOf(slider);
        if (!explored.has(key)) explored.set(key, new Set());
        const bins = explored.get(key)!;
        // A jump (a click on the track, a lesson step) uncovers one spot; continuous motion uncovers the way between.
        const near = from !== undefined && Math.abs(to - from) <= 0.25 * (slider.max - slider.min);
        const a = binOf(slider, near ? from : to), b = binOf(slider, to);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) bins.add(i);
    };

    const paint = (slider: RegisteredSlider) => {
        const field = slider.element();
        const range = field?.querySelector<HTMLInputElement>('input.form-range');
        if (!field || !range) return;
        const bins = explored.get(keyOf(slider)) ?? new Set<number>();
        // Hard-stopped gradient: green over explored bins, transparent (showing the hatch) elsewhere.
        const stops: string[] = [];
        for (let i = 0; i < BINS; i++) {
            const colour = bins.has(i) ? 'var(--ux-fog-clear)' : 'transparent';
            stops.push(`${colour} ${(i / BINS * 100).toFixed(2)}%`, `${colour} ${((i + 1) / BINS * 100).toFixed(2)}%`);
        }
        range.style.setProperty('--ux-fog-track', `linear-gradient(to right, ${stops.join(', ')})`);
        const share = Math.round(bins.size / BINS * 100);
        let meter = field.querySelector<HTMLElement>('.ux-fog-meter');
        if (!meter) {
            meter = document.createElement('span');
            meter.className = 'ux-fog-meter';
            meter.setAttribute('aria-live', 'polite');
            field.querySelector('.slider-label')?.append(meter);
        }
        const complete = share >= 96;
        const text = complete ? '✓ ves razpon' : `raziskano ${share} %`;
        if (meter.textContent !== text) meter.textContent = text;
        meter.title = complete ? 'Drsnik si preizkusil po celem razponu.' : 'Kolikšen del razpona drsnika si že preizkusil. Šrafirani deli so še neraziskani.';
        meter.style.setProperty('--ux-fog-share', `${share}%`);
        meter.classList.toggle('ux-fog-complete', complete);
        const key = keyOf(slider);
        if (complete && !done.has(key)) {
            done.add(key);
            field.classList.remove('ux-fog-celebrate');
            void field.offsetWidth;
            field.classList.add('ux-fog-celebrate');
        }
    };

    // Student input fills everything the thumb passed over; programmatic changes (a lesson step) mark one spot only.
    const onInput = (event: Event) => {
        const range = event.target as HTMLElement;
        if (!(range instanceof HTMLInputElement) || !range.classList.contains('form-range')) return;
        const slider = explorable().find(entry => entry.element()?.contains(range));
        if (!slider) return;
        const value = Number(range.value);
        visit(slider, last.get(slider), value);
        last.set(slider, value);
        paint(slider);
    };
    document.addEventListener('input', onInput, true);

    const tick = () => {
        for (const slider of explorable()) {
            const value = slider.value();
            if (last.get(slider) !== value) visit(slider, last.get(slider), value);
            last.set(slider, value);
            paint(slider);
        }
    };
    const timer = window.setInterval(tick, 200);
    tick();

    return () => {
        window.clearInterval(timer);
        document.removeEventListener('input', onInput, true);
        document.documentElement.classList.remove('ux-fog');
        document.querySelectorAll('.ux-fog-meter').forEach(node => node.remove());
        document.querySelectorAll<HTMLInputElement>('input.form-range').forEach(node => node.style.removeProperty('--ux-fog-track'));
    };
}
