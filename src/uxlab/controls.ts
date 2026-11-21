/**
 * Binds free quantities of a scene checkpoint to the inspector's range sliders by their current value. A bound quantity
 * gets the slider's label, domain and step: the graph's own idea of a sensible value, which keeps probes and jitters
 * inside what the graph accepts (a value outside an example's domain can take the whole route down).
 */
import type {Candidates} from './jitter';

export interface ControlBound { min: number; max: number; step: number; label: string }

function labelOf(input: HTMLInputElement): string {
    const text = input.labels?.[0]?.innerText ?? input.getAttribute('aria-label') ?? '';
    return text.replace(/,\s*vrednost.*$/i, '').replace(/\s+/g, ' ').trim();
}

export function rangeInputs(root: ParentNode = document): HTMLInputElement[] {
    return [...root.querySelectorAll<HTMLInputElement>('input[type=range]')].filter(input => !input.disabled && input.offsetParent !== null);
}

export function bindControls(candidates: Candidates, root: ParentNode = document): Map<string, ControlBound> {
    const inputs = rangeInputs(root).map(input => ({
        min: Number(input.min), max: Number(input.max), step: Number(input.step) || 0, value: Number(input.value), label: labelOf(input),
    })).filter(input => Number.isFinite(input.min) && Number.isFinite(input.max) && input.max > input.min);
    const matches = new Map<string, typeof inputs>();
    const claimed = new Map<number, number>();
    for (const [key, group] of candidates.groups) {
        if (group.kind !== 'scalar') continue;
        const value = group.leaves[0].value;
        const found = inputs.filter(input => Math.abs(input.value - value) <= Math.max(1e-9, (input.step || 0) / 2 + 1e-9));
        matches.set(key, found);
        for (const input of found) claimed.set(inputs.indexOf(input), (claimed.get(inputs.indexOf(input)) ?? 0) + 1);
    }
    // Only one-to-one matches: two quantities that both equal 1 say nothing about which slider is whose.
    const bounds = new Map<string, ControlBound>();
    for (const [key, found] of matches) {
        if (found.length !== 1 || claimed.get(inputs.indexOf(found[0])) !== 1) continue;
        const {min, max, step, label} = found[0];
        bounds.set(key, {min, max, step, label});
    }
    return bounds;
}
