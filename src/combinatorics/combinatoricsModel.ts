import {assertCount, binomial, factorial, permutationsWithRepetition, variations, variationsWithRepetition} from './binomial';
import {ENUMERATION_CAP, enumeratePaths, pathCount} from './latticePaths';
import {MAX_SHIFT, expandShifted} from './expansion';

/**
 * Stored state of the two combinatorics graphs (docs/adr/0048-combinatorics-bigint-counts-and-two-graphs.md, sections 2 and 3).
 * Pure TypeScript: no React, JSXGraph or localization (messages are English developer text).
 *
 * Only small integers, booleans and view names are stored. Every count is derived from the validated state with the kernel as an
 * exact `bigint` and is never read from a Preset: a Preset that carries `count`, `digits` or any other derived field is accepted
 * and those fields are dropped. Imported values are never snapped or clamped (an off-range value rejects the whole state); input
 * from the UI goes through `snapInput`, the one snapping path of every numeric field and every drag.
 */

// ---- Result type ----

export type CombinatoricsErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'not-boolean' | 'missing' | 'inconsistent';
export interface CombinatoricsError {
    readonly field: string;
    readonly reason: CombinatoricsErrorReason;
    readonly message: string;
}
export type CombinatoricsResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: CombinatoricsError};

const ok = <T>(value: T): CombinatoricsResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: CombinatoricsErrorReason, message: string): CombinatoricsResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);

// ---- Ranges ----

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

/** Target of the lattice paths: both coordinates; (20, 20) is the largest example, counted but not drawn (a + b > cap). */
export const TARGET_RANGE: IntegerRange = {min: 0, max: 20};
/** Exponent of the expansion of (x + c)^n. */
export const EXPANSION_N_RANGE: IntegerRange = {min: 0, max: 12};
export const EXPANSION_C_RANGE: IntegerRange = {min: -MAX_SHIFT, max: MAX_SHIFT};
/** The strings of a and b are listed only up to this n (2^5 = 32 strings). */
export const STRINGS_MAX_N = 5;
/** Counting graph: items and chosen items, each at most this. */
export const COUNT_N_RANGE: IntegerRange = {min: 0, max: 20};
export const COUNT_K_RANGE: IntegerRange = {min: 0, max: 20};
/** Row of Pascal's triangle shown with its sums and weights. */
export const ROW_N_RANGE: IntegerRange = {min: 0, max: 20};
/** Number of kinds of letters in the repeated-letters example, and the largest count of one kind. */
export const MULTISET_KINDS = 4;
export const MULTISET_COUNT_RANGE: IntegerRange = {min: 0, max: 12};
/** The weight t of the bars is a multiple of 1/100. */
export const T_DENOMINATOR = 100;
export const T_RANGE: IntegerRange = {min: 0, max: T_DENOMINATOR};
/** The counting tree is drawn only while it has at most this many leaves; larger inputs get the table. */
export const TREE_LEAF_LIMIT = 64;
/** Routes per page of the route list. */
export const ROUTES_PER_PAGE = 10;
/** Rows of Pascal's triangle that are drawn: the same cap as the routes (rows 0..12 have 91 entries). */
export const TRIANGLE_ROW_LIMIT = ENUMERATION_CAP;

export const LATTICE_VIEWS = ['paths', 'triangle', 'expansion'] as const;
export type LatticeView = typeof LATTICE_VIEWS[number];
export const COUNTING_VIEWS = ['choices', 'multiset', 'row'] as const;
export type CountingView = typeof COUNTING_VIEWS[number];

// ---- Field parsers (strict, no snapping) ----

const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

function parseInteger(value: unknown, field: string, range: IntegerRange): CombinatoricsResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected a whole number from ${range.min} to ${range.max}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number, not ${typeof value === 'number' ? String(value) : typeof value}.`);
    if (!Number.isInteger(value)) return fail(field, 'off-grid', `${field} must be a whole number.`);
    if (value < range.min || value > range.max) return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    return ok(norm(value));
}

function parseToggle(value: unknown, field: string): CombinatoricsResult<boolean> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected true or false.`);
    return typeof value === 'boolean' ? ok(value) : fail(field, 'not-boolean', `${field} must be true or false.`);
}

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): CombinatoricsResult<T> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${choices.join(', ')}.`);
    const found = choices.find(choice => choice === value);
    return found !== undefined ? ok(found) : fail(field, 'unknown-value', `${field} must be one of: ${choices.join(', ')}.`);
}

// ---- Snapping: the one path of typed input and of dragging ----

export interface SnappedInput {
    readonly value: number;
    /** True when the range limit moved the rounded value. */
    readonly clamped: boolean;
    /** True when the stored value differs from the input. */
    readonly adjusted: boolean;
}

/** Rounds to the nearest whole number and clamps into the range. NaN and infinity are errors, never a stored value. */
export function snapInput(input: number, range: IntegerRange, field: string): CombinatoricsResult<SnappedInput> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const rounded = Math.round(input);
    const value = norm(Math.min(range.max, Math.max(range.min, rounded)));
    return ok({value, clamped: value !== rounded, adjusted: value !== input});
}

// ---- Lattice paths, Pascal's triangle and the expansion (LatticePathGraph) ----

export interface LatticeState {
    readonly view: LatticeView;
    /** Right steps to the target and up steps to the target. */
    readonly a: number;
    readonly b: number;
    /** Index of the highlighted route in lexicographic order; 0 when the routes are not enumerated (a + b > cap). */
    readonly route: number;
    readonly showCounts: boolean;
    /** Colours the routes by their last step (R or U). */
    readonly split: boolean;
    /** The expansion of (x + c)^n. */
    readonly n: number;
    readonly c: number;
}

/** The default example: 56 routes to (5, 3), as in the checked numbers of the spec. */
export const DEFAULT_LATTICE_STATE: LatticeState = {view: 'paths', a: 5, b: 3, route: 0, showCounts: false, split: false, n: 5, c: 2};

/** Whether the routes to (a, b) are enumerated and drawn. */
export const isEnumerable = (a: number, b: number): boolean => a + b <= ENUMERATION_CAP;

/** The number of routes that can be selected: pathCount when enumerated, otherwise one placeholder index 0. */
export function selectableRoutes(a: number, b: number): number {
    return isEnumerable(a, b) ? Number(pathCount(a, b)) : 1;
}

export function parseLatticeState(data: unknown): CombinatoricsResult<LatticeState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The lattice state must be an object.');
    const view = parseChoice(data.view, 'view', LATTICE_VIEWS);
    if (!view.ok) return view;
    const a = parseInteger(data.a, 'a', TARGET_RANGE);
    if (!a.ok) return a;
    const b = parseInteger(data.b, 'b', TARGET_RANGE);
    if (!b.ok) return b;
    const route = parseInteger(data.route, 'route', {min: 0, max: Math.max(0, selectableRoutes(a.value, b.value) - 1)});
    if (!route.ok) {
        return route.error.reason === 'out-of-range'
            ? fail('route', 'inconsistent', `route is outside the ${selectableRoutes(a.value, b.value)} routes to (${a.value}, ${b.value}).`)
            : route;
    }
    const showCounts = parseToggle(data.showCounts, 'showCounts');
    if (!showCounts.ok) return showCounts;
    const split = parseToggle(data.split, 'split');
    if (!split.ok) return split;
    const n = parseInteger(data.n, 'n', EXPANSION_N_RANGE);
    if (!n.ok) return n;
    const c = parseInteger(data.c, 'c', EXPANSION_C_RANGE);
    if (!c.ok) return c;
    return ok({view: view.value, a: a.value, b: b.value, route: route.value, showCounts: showCounts.value, split: split.value, n: n.value, c: c.value});
}

/** The state to store in a Preset: only the stored fields, no counts. */
export const serializeLatticeState = (s: LatticeState): LatticeState => ({
    view: s.view, a: s.a, b: s.b, route: s.route, showCounts: s.showCounts, split: s.split, n: s.n, c: s.c,
});

/** A new target; the highlighted route restarts at the first route because the list of routes changed. */
export function withTarget(state: LatticeState, a: number, b: number): LatticeState {
    return a === state.a && b === state.b ? state : {...state, a, b, route: 0};
}

/** Route string of a mask over `steps` steps: step 0 is the most significant bit, 1 = R and 0 = U (the kernel's order). */
export function routeString(mask: number, steps: number): string {
    let text = '';
    for (let i = steps - 1; i >= 0; i--) text += (mask >> i) & 1 ? 'R' : 'U';
    return text;
}

/** The corner points of a route from (0, 0), one per step including both ends. */
export function routePoints(mask: number, steps: number): readonly (readonly [number, number])[] {
    const points: [number, number][] = [[0, 0]];
    let x = 0;
    let y = 0;
    for (let i = steps - 1; i >= 0; i--) {
        if ((mask >> i) & 1) x++; else y++;
        points.push([x, y]);
    }
    return points;
}

export interface LatticeDerived {
    readonly steps: number;
    /** Exact count of routes to (a, b). */
    readonly count: bigint;
    readonly enumerable: boolean;
    /** The masks in lexicographic order; empty above the cap. */
    readonly masks: readonly number[];
    /** Routes whose last step is R, that is the routes through (a-1, b); and U, through (a, b-1). */
    readonly lastR: bigint;
    readonly lastU: bigint;
    /** Pages of the route list (at least one) and the page of the selected route. */
    readonly pages: number;
    readonly page: number;
}

export function pageOfRoute(route: number): number {
    return Math.floor(route / ROUTES_PER_PAGE);
}

export function deriveLattice(state: LatticeState): LatticeDerived {
    const {a, b} = state;
    const enumerable = isEnumerable(a, b);
    const masks = enumerable ? enumeratePaths(a, b) : [];
    const count = pathCount(a, b);
    return {
        steps: a + b, count, enumerable, masks,
        lastR: a > 0 ? pathCount(a - 1, b) : 0n,
        lastU: b > 0 ? pathCount(a, b - 1) : 0n,
        pages: Math.max(1, Math.ceil(masks.length / ROUTES_PER_PAGE)),
        page: pageOfRoute(state.route),
    };
}

/**
 * The count at every grid point (x, y) with 0 <= x <= a and 0 <= y <= b, filled cell by cell as the sum of the count left of the
 * point and the count below it (the kernel's addition rule, not the closed formula). Indexed [x][y].
 */
export function gridCounts(a: number, b: number): bigint[][] {
    assertCount(a, 'a');
    assertCount(b, 'b');
    const grid: bigint[][] = [];
    for (let x = 0; x <= a; x++) {
        grid.push([]);
        for (let y = 0; y <= b; y++) {
            grid[x].push(x === 0 || y === 0 ? 1n : grid[x - 1][y] + grid[x][y - 1]);
        }
    }
    return grid;
}

export interface ExpansionDerived {
    /** Coefficients of (x + c)^n for x^n .. x^0 as exact integers. */
    readonly coefficients: readonly bigint[];
    /** The sum at x = 1, which equals (1 + c)^n. */
    readonly sum: bigint;
    /** The strings of a and b for (a + b)^n, grouped by the number of b's; null above STRINGS_MAX_N. */
    readonly groups: readonly (readonly string[])[] | null;
}

export function deriveExpansion(state: LatticeState): ExpansionDerived {
    const coefficients = expandShifted(state.n, state.c);
    return {coefficients, sum: coefficients.reduce((total, value) => total + value, 0n), groups: state.n <= STRINGS_MAX_N ? expansionStrings(state.n) : null};
}

/** All 2^n strings of the letters a and b, grouped by the number of letters b (group k holds C(n, k) strings), lexicographic inside. */
export function expansionStrings(n: number): string[][] {
    assertCount(n, 'n', STRINGS_MAX_N);
    const groups: string[][] = Array.from({length: n + 1}, () => []);
    for (let mask = 0; mask < 1 << n; mask++) {
        let text = '';
        let bs = 0;
        for (let i = n - 1; i >= 0; i--) {
            if ((mask >> i) & 1) { text += 'b'; bs++; } else text += 'a';
        }
        groups[bs].push(text);
    }
    return groups;
}

// ---- Counting tree, repeated letters and a row of the triangle (CountingTreeGraph) ----

export interface CountingState {
    readonly view: CountingView;
    /** Items to choose from and chosen items (view `choices`; and the row and the column of the row view). */
    readonly n: number;
    readonly k: number;
    readonly ordered: boolean;
    readonly repetition: boolean;
    /** How many letters of each of the four kinds (view `multiset`); the default is MISSISSIPPI: M, I, S, P. */
    readonly counts: readonly [number, number, number, number];
    /** The weight t in hundredths (view `row`). */
    readonly t: number;
}

/** The default example: 5! = 120 for the arrangement of five books is a choice with all n items; the graph opens with V(6, 3) = 120. */
export const DEFAULT_COUNTING_STATE: CountingState = {view: 'choices', n: 6, k: 3, ordered: true, repetition: false, counts: [1, 4, 4, 2], t: 50};

/** Which counting formula the choices belong to. */
export type CountingKind = 'variations' | 'variationsRepetition' | 'combinations' | 'combinationsRepetition';

export const countingKind = (ordered: boolean, repetition: boolean): CountingKind =>
    ordered ? (repetition ? 'variationsRepetition' : 'variations') : (repetition ? 'combinationsRepetition' : 'combinations');

export function parseCountingState(data: unknown): CombinatoricsResult<CountingState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The counting state must be an object.');
    const view = parseChoice(data.view, 'view', COUNTING_VIEWS);
    if (!view.ok) return view;
    const n = parseInteger(data.n, 'n', COUNT_N_RANGE);
    if (!n.ok) return n;
    const k = parseInteger(data.k, 'k', COUNT_K_RANGE);
    if (!k.ok) return k;
    const ordered = parseToggle(data.ordered, 'ordered');
    if (!ordered.ok) return ordered;
    const repetition = parseToggle(data.repetition, 'repetition');
    if (!repetition.ok) return repetition;
    if (!repetition.value && k.value > n.value) {
        return fail('k', 'inconsistent', `k (${k.value}) must not exceed n (${n.value}) when items are not repeated.`);
    }
    if (!Array.isArray(data.counts) || data.counts.length !== MULTISET_KINDS) {
        return fail('counts', 'missing', `counts must be a list of ${MULTISET_KINDS} whole numbers.`);
    }
    const counts: number[] = [];
    for (let i = 0; i < MULTISET_KINDS; i++) {
        const count = parseInteger(data.counts[i], `counts[${i}]`, MULTISET_COUNT_RANGE);
        if (!count.ok) return count;
        counts.push(count.value);
    }
    const t = parseInteger(data.t, 't', T_RANGE);
    if (!t.ok) return t;
    return ok({
        view: view.value, n: n.value, k: k.value, ordered: ordered.value, repetition: repetition.value,
        counts: [counts[0], counts[1], counts[2], counts[3]], t: t.value,
    });
}

export const serializeCountingState = (s: CountingState): CountingState => ({
    view: s.view, n: s.n, k: s.k, ordered: s.ordered, repetition: s.repetition, counts: [s.counts[0], s.counts[1], s.counts[2], s.counts[3]], t: s.t,
});

/** The k that a state keeps after n changes: without repetition k cannot exceed n. */
export const keepKValid = (state: CountingState): CountingState =>
    !state.repetition && state.k > state.n ? {...state, k: state.n} : state;

export interface CountingDerived {
    readonly kind: CountingKind;
    /** Exact count of the choices. */
    readonly count: bigint;
    /** The ordered selections (V or n^k) counted by that kind before the order is forgotten; equals `count` for the ordered kinds. */
    readonly ordered: bigint;
    /** k! orderings of one combination; 1n for the ordered kinds. */
    readonly orderings: bigint;
    /** The tree has the ordered selections as leaves; true while their number is at most TREE_LEAF_LIMIT. */
    readonly treeShown: boolean;
}

/** n + k - 1 choose k: unordered picks with repetition (multisets), through the kernel's binomial. */
export function combinationsWithRepetition(n: number, k: number): bigint {
    assertCount(n, 'n');
    assertCount(k, 'k');
    if (n === 0) return k === 0 ? 1n : 0n;
    return binomial(n + k - 1, k);
}

export function deriveCounting(state: CountingState): CountingDerived {
    const {n, k} = state;
    const kind = countingKind(state.ordered, state.repetition);
    const orderedSelections = state.repetition ? variationsWithRepetition(n, k) : variations(n, k);
    let count: bigint;
    switch (kind) {
        case 'variations': count = variations(n, k); break;
        case 'variationsRepetition': count = variationsWithRepetition(n, k); break;
        case 'combinations': count = binomial(n, k); break;
        case 'combinationsRepetition': count = combinationsWithRepetition(n, k); break;
    }
    return {
        kind, count, ordered: orderedSelections, orderings: state.ordered ? 1n : factorial(k),
        treeShown: state.ordered && orderedSelections <= BigInt(TREE_LEAF_LIMIT),
    };
}

/** The ordered selections of k from n items (the leaves of the counting tree), in lexicographic order of the item numbers 1..n. */
export function treeLeaves(n: number, k: number, repetition: boolean): number[][] {
    assertCount(n, 'n', COUNT_N_RANGE.max);
    assertCount(k, 'k', COUNT_K_RANGE.max);
    const leaves: number[][] = [];
    const prefix: number[] = [];
    const used = new Array<boolean>(n + 1).fill(false);
    const walk = () => {
        if (prefix.length === k) { leaves.push([...prefix]); return; }
        for (let item = 1; item <= n; item++) {
            if (!repetition && used[item]) continue;
            used[item] = true;
            prefix.push(item);
            walk();
            prefix.pop();
            used[item] = false;
        }
    };
    if (n > 0 || k === 0) walk();
    return leaves;
}

/** The orderings of one combination are drawn grouped for k from ORDERINGS_GROUP_MIN_K to ORDERINGS_GROUP_MAX_K (at most 4! = 24 of them). */
export const ORDERINGS_GROUP_MIN_K = 2;
export const ORDERINGS_GROUP_MAX_K = 4;

export interface OrderingGroup {
    /** The combination as increasing item numbers. */
    readonly combination: readonly number[];
    /** Exactly its k! orderings, in lexicographic order of the positions. */
    readonly orderings: readonly (readonly number[])[];
}

/**
 * The first `limit` combinations of k from n (lexicographic), each with all k! orderings of its items. Empty outside
 * ORDERINGS_GROUP_MIN_K..ORDERINGS_GROUP_MAX_K or when k > n.
 */
export function orderingGroups(n: number, k: number, limit: number): OrderingGroup[] {
    assertCount(n, 'n', COUNT_N_RANGE.max);
    assertCount(k, 'k', COUNT_K_RANGE.max);
    if (k < ORDERINGS_GROUP_MIN_K || k > ORDERINGS_GROUP_MAX_K || k > n) return [];
    const positions = treeLeaves(k, k, false);
    const groups: OrderingGroup[] = [];
    const chosen: number[] = [];
    const walk = (from: number) => {
        if (groups.length >= limit) return;
        if (chosen.length === k) {
            const combination = [...chosen];
            groups.push({combination, orderings: positions.map(order => order.map(position => combination[position - 1]))});
            return;
        }
        for (let item = from; item <= n - (k - chosen.length) + 1 && groups.length < limit; item++) {
            chosen.push(item);
            walk(item + 1);
            chosen.pop();
        }
    };
    walk(1);
    return groups;
}

export interface MultisetDerived {
    readonly total: number;
    /** Letters of one kind are interchangeable: total! / (c1! c2! c3! c4!), exact. */
    readonly count: bigint;
    /** total! for comparison, the arrangements if all letters were different. */
    readonly allDifferent: bigint;
}

export function deriveMultiset(state: CountingState): MultisetDerived {
    const total = state.counts.reduce((sum, value) => sum + value, 0);
    return {total, count: permutationsWithRepetition(state.counts), allDifferent: factorial(total)};
}

export interface RowDerived {
    /** Row n of Pascal's triangle by the addition rule would be an equal list; the row here is C(n, j) from the kernel. */
    readonly row: readonly bigint[];
    readonly sum: bigint;
    readonly alternatingSum: bigint;
    /** Sum of the diagonal C(j, k) for j = k..n, which is C(n + 1, k + 1) (hockey stick); 0 when k > n. */
    readonly hockeyStick: bigint;
    /** C(n, j) t^j (1 - t)^(n - j) as doubles, labelled computed in the display. */
    readonly weights: readonly number[];
    readonly weightSum: number;
}

export function deriveRow(state: CountingState): RowDerived {
    const {n, k} = state;
    const t = state.t / T_DENOMINATOR;
    const row = Array.from({length: n + 1}, (_, j) => binomial(n, j));
    const sum = row.reduce((total, value) => total + value, 0n);
    const alternatingSum = row.reduce((total, value, j) => (j % 2 === 0 ? total + value : total - value), 0n);
    let hockeyStick = 0n;
    for (let j = k; j <= n; j++) hockeyStick += binomial(j, k);
    const weights = row.map((value, j) => Number(value) * t ** j * (1 - t) ** (n - j));
    return {row, sum, alternatingSum, hockeyStick, weights, weightSum: weights.reduce((total, value) => total + value, 0)};
}

// ---- Display of counts: exact digits, separators only here ----

export type CountLanguage = 'sl' | 'en';

/** Groups the digits of a count in threes: a no-break space in Slovenian, a comma in English. Stored values are plain digit strings. */
export function formatCount(value: bigint, language: CountLanguage): string {
    const sign = value < 0n ? '−' : '';
    const digits = (value < 0n ? -value : value).toString();
    const separator = language === 'sl' ? ' ' : ',';
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}
