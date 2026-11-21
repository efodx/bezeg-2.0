/**
 * Parameter rows for the fan (b6): every free quantity of a scene checkpoint, with a short ladder of nearby values.
 * Pure JSON work on the same candidates as the match challenge; the component renders and restores them.
 */
import type {ControlBound} from './controls';
import {jitterCandidates, type Candidates} from './jitter';

type Path = (string | number)[];

export interface FanRow {
    id: string;
    /** The quantity's key, as stored (`a`, `x0`, `points.2`). */
    key: string;
    axis?: 'x' | 'y';
    kind: 'point' | 'scalar';
    leaves: {path: Path; value: number}[];
    /** Offsets added to every leaf; the middle one is 0 (the scene as it is). */
    deltas: number[];
    step?: number;
    /** Index of the scene as it is now (delta 0). */
    now: number;
    /** The inspector slider's label, when the quantity is bound to one. */
    label?: string;
}

export const FAN_SIZE = 7;
const MIDDLE = (FAN_SIZE - 1) / 2;

function quantum(values: readonly number[]): number | undefined {
    return [1, 0.5, 0.25, 0.1].find(step => values.every(value => Math.abs(value / step - Math.round(value / step)) < 1e-9));
}

function ladder(low: number, high: number, original: number, step: number | undefined): number[] {
    const values = Array.from({length: FAN_SIZE}, (_, index) => index < MIDDLE
        ? low + (original - low) * index / MIDDLE
        : index === MIDDLE ? original : original + (high - original) * (index - MIDDLE) / MIDDLE);
    if (!step) return values.map(value => value - original);
    // Snapped ladders keep distinct values: a finer step of the same family if needed, whole steps for integers.
    for (const candidate of [step, 0.5, 0.25, 0.1].filter(value => value <= step)) {
        const snapped = values.map(value => Math.round(value / candidate) * candidate);
        if (new Set(snapped.map(value => value.toFixed(6))).size === FAN_SIZE) return snapped.map(value => Number((value - original).toFixed(6)));
    }
    if (step >= 1) return values.map((_, index) => (index - MIDDLE) * step);
    return values.map(value => value - original);
}

const axisOf = (path: Path) => {
    const last = String(path[path.length - 1]);
    return last === 'x' || last === '0' ? 'x' : 'y';
};

export function fanRows(checkpointValue: unknown, view: readonly number[], limit = 8, bind?: (candidates: Candidates) => Map<string, ControlBound>): {rows: FanRow[]; candidates: Candidates} {
    const candidates = jitterCandidates(checkpointValue);
    const bounds = bind?.(candidates) ?? new Map<string, ControlBound>();
    const [left, top, right, bottom] = view;
    const span = {x: Math.abs(right - left), y: Math.abs(top - bottom)};
    const gridUnit = candidates.grid !== undefined ? 2 ** candidates.grid : undefined;
    const scalars: FanRow[] = [];
    const points: FanRow[] = [];
    for (const [key, group] of candidates.groups) {
        if (group.kind === 'scalar') {
            const original = group.leaves[0].value;
            const bound = bounds.get(key);
            if (bound) {
                // The slider's own domain and step: the whole range the graph offers, the scene's value in the middle.
                const step = bound.step >= 0.001 ? bound.step : undefined;
                const values = Array.from({length: FAN_SIZE}, (_, index) => {
                    const value = bound.min + (bound.max - bound.min) * index / (FAN_SIZE - 1);
                    return step ? Math.min(bound.max, Math.max(bound.min, bound.min + Math.round((value - bound.min) / step) * step)) : value;
                });
                let now = 0;
                values.forEach((value, index) => { if (Math.abs(value - original) < Math.abs(values[now] - original)) now = index; });
                values[now] = original;
                scalars.push({id: key, key, kind: 'scalar', leaves: group.leaves, deltas: values.map(value => Number((value - original).toFixed(9))), step, now, label: bound.label});
                continue;
            }
            // Without a slider to ask, stay close: a value outside an example's domain can take the graph down.
            const step = quantum(group.leaves.map(leaf => leaf.value));
            let low: number, high: number;
            if (Number.isInteger(original) && step === 1) { const reach = Math.max(2, Math.round(0.35 * Math.abs(original))); low = original - reach; high = original + reach; }
            else if (original > 0 && original < 1) { low = Math.max(0.05, original - 0.3); high = Math.min(0.95, original + 0.3); }
            else if (original === 0) { low = -1; high = 1; }
            else { low = original - 0.4 * Math.abs(original); high = original + 0.4 * Math.abs(original); }
            if (original >= 0) low = Math.max(low, 0);
            scalars.push({id: key, key, kind: 'scalar', leaves: group.leaves, deltas: ladder(low, high, original, step), step, now: MIDDLE});
            continue;
        }
        for (const axis of ['x', 'y'] as const) {
            const leaves = group.leaves.filter(leaf => axisOf(leaf.path) === axis);
            if (leaves.length === 0) continue;
            const original = leaves[0].value;
            const unit = gridUnit ?? 1;
            const reach = 0.28 * Math.min(span.x, span.y) / unit;
            const step = gridUnit ? 1 : quantum(leaves.map(leaf => leaf.value));
            points.push({id: `${key}:${axis}`, key, axis, kind: 'point', leaves, deltas: ladder(original - reach, original + reach, original, step), step, now: MIDDLE});
        }
    }
    // Counts (degree, terms, iterations) walk in whole steps from where they are, never below one.
    const counts: FanRow[] = [];
    for (const [key, leaves] of countLeaves(checkpointValue)) {
        const original = leaves[0].value;
        const start = Math.max(original >= 1 ? 1 : 0, original - 3);
        counts.push({id: key, key, kind: 'scalar', leaves, deltas: Array.from({length: FAN_SIZE}, (_, index) => start + index - original), step: 1, now: original - start, label: WORDS[key.toLowerCase()]});
    }
    // Counts and scalars name the ideas of a scene; points come after, a few at most.
    return {rows: [...counts, ...scalars, ...points].slice(0, limit), candidates};
}

const COUNT_KEY = /^(degree|order|n|k|m|count|iterations?|steps?|terms|harmonics?|depth|level|levels|subdivisions?|rounds?|segments)$/i;
const SKIPPED = new Set(['boardState', 'displayState', 'transientState']);

/** Whole-number quantities the jitter leaves alone (it must not change a count), grouped by key across copies. */
function countLeaves(value: unknown): Map<string, {path: Path; value: number}[]> {
    const found = new Map<string, {path: Path; value: number}[]>();
    const walk = (node: unknown, path: Path) => {
        if (typeof node === 'number') {
            const key = path[path.length - 1];
            if (typeof key === 'string' && COUNT_KEY.test(key) && Number.isInteger(node) && node >= 0 && node <= 60) found.set(key, [...found.get(key) ?? [], {path, value: node}]);
            return;
        }
        if (Array.isArray(node)) { node.forEach((item, index) => walk(item, [...path, index])); return; }
        if (typeof node === 'object' && node !== null) for (const [key, child] of Object.entries(node)) if (!(path.length === 0 && SKIPPED.has(key))) walk(child, [...path, key]);
    };
    walk(value, []);
    // Copies of one quantity agree; keys whose copies disagree are not one quantity.
    for (const [key, leaves] of found) if (leaves.some(leaf => leaf.value !== leaves[0].value)) found.delete(key);
    return found;
}

export function applyRow(checkpointValue: unknown, row: FanRow, delta: number): unknown {
    const copy = JSON.parse(JSON.stringify(checkpointValue)) as unknown;
    for (const leaf of row.leaves) {
        let node = copy as Record<string | number, unknown>;
        for (let i = 0; i < leaf.path.length - 1; i++) node = node[leaf.path[i]] as Record<string | number, unknown>;
        const last = leaf.path[leaf.path.length - 1];
        const value = leaf.value + delta;
        node[last] = Number(value.toFixed(9));
    }
    return copy;
}

/** Delta for a continuous position 0…FAN_SIZE−1 along the row, between the sampled values that the graph accepted. */
export function deltaAt(row: FanRow, position: number, accepted: readonly boolean[]): number | undefined {
    const clamped = Math.max(0, Math.min(FAN_SIZE - 1, position));
    let below = Math.floor(clamped), above = Math.ceil(clamped);
    while (below >= 0 && !accepted[below]) below--;
    while (above < FAN_SIZE && !accepted[above]) above++;
    if (below < 0 && above >= FAN_SIZE) return undefined;
    if (below < 0) return row.deltas[above];
    if (above >= FAN_SIZE || below === above) return row.deltas[below];
    const t = (clamped - below) / (above - below);
    const value = row.deltas[below] + (row.deltas[above] - row.deltas[below]) * t;
    // Between sampled values a whole-number quantity still moves in whole steps.
    return row.step && row.step >= 1 ? Math.round(value / row.step) * row.step : value;
}

const SUBSCRIPT: Record<string, string> = {0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉'};
const WORDS: Record<string, string> = {
    knots: 'vozel', weights: 'utež', coefficients: 'koeficient', coeffs: 'koeficient', values: 'vrednost', nodes: 'vozlišče',
    degree: 'stopnja', order: 'red', count: 'število', iterations: 'iteracije', iteration: 'iteracija', terms: 'členi', steps: 'koraki', depth: 'globina', level: 'raven', harmonics: 'harmoniki', segments: 'odseki', subdivisions: 'delitve',
    angle: 'kot', secondangle: 'drugi kot', radius: 'polmer', weight: 'utež', weights: 'utež', scale: 'merilo', shift: 'zamik',
    amplitude: 'amplituda', frequency: 'frekvenca', phase: 'faza', speed: 'hitrost', time: 'čas', length: 'dolžina', height: 'višina',
    alpha: 'α', beta: 'β', gamma: 'γ', theta: 'θ', phi: 'φ', lambda: 'λ', mu: 'μ', sigma: 'σ', tension: 'napetost', offset: 'odmik', matrix: 'stolpec', center: 'središče', control: 'kontrolna točka',
};

/** A readable name for a stored key: `x0` → x₀, `zIm` → Im z, `angle` → kot, `points.2` → točka 3. */
export function rowName(row: FanRow, pointName?: string): string {
    if (row.label) return row.label;
    const tail = row.key.split('.');
    if (row.kind === 'point') {
        const index = tail[1] !== undefined && /^\d+$/.test(tail[1]) ? Number(tail[1]) + 1 : undefined;
        const word = tail[0] === 'points' ? 'točka' : WORDS[tail[0].toLowerCase()] ?? tail[0];
        const base = pointName || (index !== undefined ? `${word} ${index}` : tail.join(' '));
        return `${base} ${row.axis === 'x' ? '↔' : '↕'}`;
    }
    const key = tail[tail.length - 1];
    if (/^\d+$/.test(key) && tail.length > 1) {
        const owner = tail[tail.length - 2];
        return `${WORDS[owner.toLowerCase()] ?? owner} ${Number(key) + 1}`;
    }
    if (/^[a-z]Im$/.test(key)) return `Im ${key[0]}`;
    if (/^[a-z]Re$/.test(key)) return `Re ${key[0]}`;
    const word = WORDS[key.toLowerCase()];
    if (word) return word;
    const match = /^([a-zA-Z])(\d+)$/.exec(key);
    if (match) return match[1] + match[2].split('').map(digit => SUBSCRIPT[digit]).join('');
    return tail.slice(-2).join(' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}
