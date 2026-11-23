import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import type {Language} from '../../localization';
import {parseDecimal} from '../../inputs/NumberInput';

/** Pure rules of the pucks (task 05): grid, formatting, constant width, typed entry, drag ruler. No React, no store. */

/** Decimals of a step (0.25 has 2, 5 has 0). */
export function decimalsOf(step: number): number {
    const text = String(step);
    if (text.includes('e')) return 6;
    return text.split('.')[1]?.length ?? 0;
}

/** Decimals a range puck shows. */
export function rangeDecimals(p: Pick<RangeParameter, 'step' | 'maxDecimals'>): number {
    return p.maxDecimals ?? decimalsOf(p.step);
}

/** The value on the step grid (counted from `min`) inside [min, max]. */
export function snapValue(value: number, p: Pick<RangeParameter, 'min' | 'max' | 'step'>): number {
    const clamped = Math.min(p.max, Math.max(p.min, value));
    const steps = Math.round((clamped - p.min) / p.step);
    const snapped = Number((p.min + steps * p.step).toFixed(Math.min(10, decimalsOf(p.step) + 2)));
    return Math.min(p.max, Math.max(p.min, snapped));
}

export function formatRange(value: number, p: Pick<RangeParameter, 'step' | 'maxDecimals'>, language: Language): string {
    return formatNumber(value, language, rangeDecimals(p));
}

/**
 * The number of characters the value box reserves: the widest string the range can format (bounds and
 * nine points between), so a sweep never changes the puck width.
 */
export function widestChars(p: Pick<RangeParameter, 'min' | 'max' | 'step' | 'maxDecimals'>, language: Language): number {
    const values = [p.min, p.max];
    for (let i = 1; i < 9; i++) values.push(p.min + (p.max - p.min) * i / 9);
    // The step's own decimals count even where the bounds are whole, e.g. 0 to 10 in steps of 0.25 shows "9,75".
    values.push(p.max - p.step, p.min + p.step);
    let width = 1;
    for (const v of values) width = Math.max(width, formatRange(v, p, language).length);
    return width;
}

export function widestCountChars(p: Pick<CountParameter, 'min' | 'max'>): number {
    return Math.max(1, String(Math.abs(p.min)).length + (p.min < 0 ? 1 : 0), String(Math.abs(p.max)).length + (p.max < 0 ? 1 : 0));
}

export type EntryResult =
    /** `snapped` is set when the typed number was off the step grid and the value is the nearest grid point. */
    | {readonly ok: true; readonly value: number; readonly snapped?: true}
    | {readonly ok: false; readonly reason: 'number' | 'range' | 'whole'};

const EPS = 1e-9;

/** Reads typed text: either decimal convention. Out of range and unparsable text are refused, never clamped. */
export function parseEntry(text: string, p: Pick<RangeParameter, 'min' | 'max' | 'step'>, whole = false): EntryResult {
    const parsed = parseDecimal(text);
    if (!Number.isFinite(parsed)) return {ok: false, reason: 'number'};
    if (whole && !Number.isInteger(parsed)) return {ok: false, reason: 'whole'};
    if (parsed < p.min - EPS || parsed > p.max + EPS) return {ok: false, reason: whole ? 'whole' : 'range'};
    if (whole) return {ok: true, value: parsed};
    const value = snapValue(parsed, p);
    return Math.abs(value - parsed) > EPS ? {ok: true, value, snapped: true} : {ok: true, value};
}

/** A change of more than one step is a jump, so it offers the undo. */
export function isJump(from: number, to: number, step: number): boolean {
    return Math.abs(to - from) > step * (1 + EPS);
}

/** Finer drag steps the further the pointer is from the puck vertically. */
export const FINE_LEVELS = [
    {distance: 0, factor: 1, label: undefined},
    {distance: 56, factor: 0.25, label: 'puck_fine_quarter'},
    {distance: 130, factor: 1 / 16, label: 'puck_fine_sixteenth'},
] as const;

export function fineLevel(verticalDistance: number): (typeof FINE_LEVELS)[number] {
    let level: (typeof FINE_LEVELS)[number] = FINE_LEVELS[0];
    for (const candidate of FINE_LEVELS) if (Math.abs(verticalDistance) >= candidate.distance) level = candidate;
    return level;
}

/** Pixels the whole range spans in a drag at normal speed: the ruler's width, kept inside the bounds. */
export function rulerWidth(bounds: {width: number} | undefined, viewport: number): number {
    return Math.max(120, Math.min(360, (bounds?.width ?? viewport) - 16));
}

interface Box {left: number; right: number; width?: number}

/** The ruler's left edge: centred on the puck, kept 8 px inside the bounds (and the window). */
export function placeRulerLeft(anchor: {left: number; width: number}, bounds: Box | undefined, width: number, viewport: number): number {
    const lo = Math.max(8, (bounds?.left ?? 0) + 8);
    const hi = Math.min(viewport, bounds?.right ?? viewport) - width - 8;
    return Math.max(lo, Math.min(Math.max(lo, hi), anchor.left + anchor.width / 2 - width / 2));
}

export interface RulerTick {readonly x: number; readonly major: boolean; readonly value: number}

/** Ticks of the drag ruler around `value`: labelled at a round spacing at least 46 px apart, minor ticks between. */
export function rulerTicks(p: Pick<RangeParameter, 'min' | 'max'>, value: number, pxPerRange: number, width: number): RulerTick[] {
    const pxPerUnit = pxPerRange / (p.max - p.min);
    const rawMajor = 46 / pxPerUnit;
    const power = Math.pow(10, Math.floor(Math.log10(rawMajor)));
    const mantissa = [1, 2, 5, 10].find(f => f * power >= rawMajor) ?? 10;
    const major = mantissa * power;
    const minor = major / (mantissa === 2 ? 4 : 5);
    const half = width / 2;
    const ticks: RulerTick[] = [];
    for (let n = Math.ceil((value - half / pxPerUnit) / minor); n * minor <= value + half / pxPerUnit && ticks.length < 400; n++) {
        const v = Number((n * minor).toPrecision(12));
        if (v < p.min - EPS || v > p.max + EPS) continue;
        ticks.push({x: half + (v - value) * pxPerUnit, major: Math.abs(v / major - Math.round(v / major)) < 1e-6, value: v});
    }
    return ticks;
}
