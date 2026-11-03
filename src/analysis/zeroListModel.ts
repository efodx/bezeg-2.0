import {MAX_MULTIPLICITY, MAX_POLY_DEGREE, mergeZeros} from './polynomial';
import {POLY_BOUNDS, PolySpec} from './schoolFunctions';

/*
 * The zero list of a product-form polynomial k * prod (x - z_i)^m_i: what is valid and how it is edited. Shared by the
 * polynomial-zeros graph (one list) and the rational-function graph (a numerator list and a denominator list), so both
 * apply the same rules: zeros on a grid, multiplicity 1..3, a degree cap, equal zeros merged with the multiplicities added.
 * A rejected value breaks a rule named by a `ZeroListIssue` (data, never text); callers localize it
 * (`graphs/functions/zeroListMessages`). Pure mathematics and rules, no UI imports.
 *
 * Positions snap to a grid of ZERO_GRID_STEP = 0.1, computed once by `snapZero`, so equal positions compare with `===`
 * (the rational-function graph finds a hole by comparing a numerator zero with a denominator zero exactly).
 */

export type ZeroEntry = PolySpec['zeros'][number];

/** The grid of zero positions and its decimals; both languages show one decimal at most. */
export const ZERO_GRID_STEP = 0.1;
export const ZERO_GRID_DECIMALS = 1;

/** The grid position nearest to x; the result is normalized (no -0, no 0.30000000000000004) so equal positions are `===`. */
export const snapZero = (x: number): number => {
    const snapped = Number((Math.round(x / ZERO_GRID_STEP) * ZERO_GRID_STEP).toFixed(ZERO_GRID_DECIMALS));
    return snapped === 0 ? 0 : snapped;
};

export const isOnZeroGrid = (z: number): boolean => Number.isFinite(z) && snapZero(z) === z;

/** The rule a rejected value broke. The range, the cap or the grid travels with it. */
export type ZeroListIssue =
    | { readonly kind: 'zero-range'; readonly min: number; readonly max: number }
    | { readonly kind: 'zero-grid'; readonly step: number }
    | { readonly kind: 'multiplicity'; readonly min: number; readonly max: number }
    /** The sum of multiplicities would exceed `max`. */
    | { readonly kind: 'degree'; readonly max: number }
    /** Two zeros at `z` would merge into a multiplicity above `max`. */
    | { readonly kind: 'merge'; readonly z: number; readonly max: number };

const ZERO_LIST_KINDS: readonly string[] = ['zero-range', 'zero-grid', 'multiplicity', 'degree', 'merge'];

/** Whether an issue of a larger model is one of the zero list's own rules. */
export const isZeroListIssue = (issue: { readonly kind: string }): issue is ZeroListIssue => ZERO_LIST_KINDS.includes(issue.kind);

export type ZeroListCheck =
    | { readonly ok: true; readonly zeros: readonly ZeroEntry[] }
    | { readonly ok: false; readonly issue: ZeroListIssue | undefined };

/** What an edit did besides changing the list: two zeros met and merged into one with the summed multiplicity. */
export type ZeroListEvent = { readonly kind: 'merged'; readonly z: number; readonly m: number };

export type ZeroListEdit =
    | { readonly ok: true; readonly zeros: readonly ZeroEntry[]; readonly event?: ZeroListEvent }
    | { readonly ok: false; readonly issue: ZeroListIssue };

const zeroRangeIssue = (): ZeroListIssue => ({kind: 'zero-range', min: POLY_BOUNDS.z[0], max: POLY_BOUNDS.z[1]});
const multiplicityIssue = (): ZeroListIssue => ({kind: 'multiplicity', min: 1, max: MAX_MULTIPLICITY});

export const zeroListDegree = (zeros: readonly ZeroEntry[]): number => zeros.reduce((sum, e) => sum + e.m, 0);

const isMultiplicity = (m: unknown): m is 1 | 2 | 3 => m === 1 || m === 2 || m === 3;

/** The issue a zero position breaks (not finite counts as out of range), or undefined. Positions are not snapped here. */
const positionIssue = (z: number): ZeroListIssue | undefined => {
    if (!Number.isFinite(z) || z < POLY_BOUNDS.z[0] || z > POLY_BOUNDS.z[1]) return zeroRangeIssue();
    return isOnZeroGrid(z) ? undefined : {kind: 'zero-grid', step: ZERO_GRID_STEP};
};

/**
 * The single validity rule of a stored zero list: an array of `{z, m}` with z on the grid inside POLY_BOUNDS.z, an integer
 * multiplicity 1..3 and a total degree of at most `maxDegree`. Equal zeros are merged (the first position keeps the entry,
 * multiplicities added; a sum above 3 is rejected); the order of the other entries is kept. Entries of the wrong shape give
 * `issue: undefined` (the generic message). Never clamps.
 */
export function checkZeroList(data: unknown, maxDegree: number = MAX_POLY_DEGREE): ZeroListCheck {
    const reject = (issue: ZeroListIssue | undefined): ZeroListCheck => ({ok: false, issue});
    if (!Array.isArray(data)) return reject(undefined);
    const out: {z: number; m: 1 | 2 | 3}[] = [];
    for (const item of data as unknown[]) {
        if (item === null || typeof item !== 'object' || Array.isArray(item)) return reject(undefined);
        const {z, m} = item as Record<string, unknown>;
        if (typeof z !== 'number' || typeof m !== 'number') return reject(undefined);
        const issue = positionIssue(z);
        if (issue) return reject(issue);
        if (!isMultiplicity(m)) return reject(multiplicityIssue());
        const same = out.find(e => e.z === z);
        if (same) {
            if (same.m + m > MAX_MULTIPLICITY) return reject({kind: 'merge', z, max: MAX_MULTIPLICITY});
            same.m = (same.m + m) as 1 | 2 | 3;
        } else {
            out.push({z, m});
        }
    }
    if (zeroListDegree(out) > maxDegree) return reject({kind: 'degree', max: maxDegree});
    return {ok: true, zeros: out};
}

/**
 * Moves the zero at `index` to x (snapped to the grid, rejected when out of range, never clamped). When another zero is already
 * there the two merge: the other keeps its place and gets the summed multiplicity, the moved entry disappears, and the edit
 * reports the merge. A merge above multiplicity 3 is refused. Moving to the same place changes nothing (the same list).
 */
export function moveZero(zeros: readonly ZeroEntry[], index: number, x: number): ZeroListEdit {
    const current = zeros[index];
    if (current === undefined || !Number.isFinite(x)) return {ok: false, issue: zeroRangeIssue()};
    const z = snapZero(x);
    if (z < POLY_BOUNDS.z[0] || z > POLY_BOUNDS.z[1]) return {ok: false, issue: zeroRangeIssue()};
    if (z === current.z) return {ok: true, zeros};
    const otherIndex = zeros.findIndex((e, i) => i !== index && e.z === z);
    if (otherIndex < 0) return {ok: true, zeros: zeros.map((e, i) => i === index ? {z, m: e.m} : e)};
    const m = current.m + zeros[otherIndex].m;
    if (m > MAX_MULTIPLICITY) return {ok: false, issue: {kind: 'merge', z, max: MAX_MULTIPLICITY}};
    const merged = zeros.map((e, i) => i === otherIndex ? {z, m: m as 1 | 2 | 3} : e).filter((_, i) => i !== index);
    return {ok: true, zeros: merged, event: {kind: 'merged', z, m}};
}

/** Sets the multiplicity of the zero at `index`: an integer 1..3 whose total degree stays within `maxDegree`. */
export function setZeroMultiplicity(zeros: readonly ZeroEntry[], index: number, m: unknown, maxDegree: number = MAX_POLY_DEGREE): ZeroListEdit {
    const current = zeros[index];
    if (current === undefined || !isMultiplicity(m)) return {ok: false, issue: multiplicityIssue()};
    if (m === current.m) return {ok: true, zeros};
    if (zeroListDegree(zeros) - current.m + m > maxDegree) return {ok: false, issue: {kind: 'degree', max: maxDegree}};
    return {ok: true, zeros: zeros.map((e, i) => i === index ? {z: e.z, m} : e)};
}

/** The first free grid position in the order 0, 1, -1, 2, -2, ... */
const freePosition = (zeros: readonly ZeroEntry[]): number => {
    for (let n = 0; n <= POLY_BOUNDS.z[1]; n++) {
        for (const z of n === 0 ? [0] : [n, -n]) if (!zeros.some(e => e.z === z)) return z;
    }
    return 0;
};

/** Appends a simple zero at the first free position; refused (with the cap) when the degree would exceed `maxDegree`. */
export function addZero(zeros: readonly ZeroEntry[], maxDegree: number = MAX_POLY_DEGREE): ZeroListEdit {
    if (zeroListDegree(zeros) + 1 > maxDegree) return {ok: false, issue: {kind: 'degree', max: maxDegree}};
    return {ok: true, zeros: [...zeros, {z: freePosition(zeros), m: 1}]};
}

/** Removes the zero at `index` (an unknown index changes nothing). */
export function removeZero(zeros: readonly ZeroEntry[], index: number): ZeroListEdit {
    return {ok: true, zeros: zeros.filter((_, i) => i !== index)};
}

/** The list as a kernel `PolySpec`: sorted increasingly (the list itself keeps the order of the gliders). */
export const zeroListSpec = (k: number, zeros: readonly ZeroEntry[]): PolySpec => mergeZeros({k, zeros}).spec;
