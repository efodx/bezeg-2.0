/**
 * The school function catalogue (ADR 0026 section 1): shapes with partial domains, used by the school-function
 * lessons. Separate from `FUNCTION_CATALOG` in `functions.ts`, whose entries are total. Values and derivatives return
 * `undefined` (never NaN or +-Infinity) outside the domain, at poles and at non-differentiable points. Pure
 * mathematics: no React, JSXGraph or localization imports.
 *
 * The model is a flat record of plain numbers and closed ids so that it can be stored as Preset data. The kinds
 * `poly` and `rational` are declared here (their shape is final) and filled in by task 03.
 */

export const POWER_SHAPES = ['square', 'cube', 'sqrt', 'reciprocal', 'abs'] as const;
export type PowerShape = typeof POWER_SHAPES[number];
export const NAMED_IDS = ['x2-2', 'cubic-cycle', 'cubic-x3-x'] as const;
export type NamedId = typeof NAMED_IDS[number];

export const BASE_MIN = 0.2;
export const BASE_MAX = 5;
/** Bounds of the transformation parameters a, b, c, d (b = 0 is excluded). */
export const TRANSFORM_BOUNDS = {a: [-10, 10], b: [-10, 10], c: [-20, 20], d: [-20, 20]} as const;

export interface PowerFunction {readonly kind: 'power'; readonly shape: PowerShape}
export interface ExpFunction {readonly kind: 'exp'; readonly base: number}
export interface LogFunction {readonly kind: 'log'; readonly base: number}
export interface NamedFunction {readonly kind: 'named'; readonly id: NamedId}
/** Product form k * prod (x - z_i)^m_i; total degree <= 5 (validated by task 03). */
export interface PolySpec {readonly k: number; readonly zeros: readonly {readonly z: number; readonly m: 1 | 2 | 3}[]}
export interface PolyFunction extends PolySpec {readonly kind: 'poly'}
export interface RationalFunction {readonly kind: 'rational'; readonly numerator: PolySpec; readonly denominator: PolySpec}
export type SchoolBaseFunction = PowerFunction | ExpFunction | LogFunction | NamedFunction | PolyFunction | RationalFunction;
/** a f(b(x - c)) + d for any non-transformed entry f. */
export interface TransformedFunction {
    readonly kind: 'transformed';
    readonly base: SchoolBaseFunction;
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
}
export type SchoolFunction = SchoolBaseFunction | TransformedFunction;

export interface Interval {
    readonly min: number;
    readonly max: number;
    readonly minClosed: boolean;
    readonly maxClosed: boolean;
}

export interface SchoolFunctionModel {
    /** Disjoint intervals in increasing order; bounds may be +-Infinity (then not closed). */
    readonly domain: readonly Interval[];
    readonly value: (x: number) => number | undefined;
    readonly derivative: (x: number) => number | undefined;
    /** Present only where exact. */
    readonly antiderivative?: (x: number) => number | undefined;
    readonly latex: string;
    readonly derivativeLatex: string;
    readonly plain: string;
    readonly derivativePlain: string;
}

const finite = (v: number): number | undefined => Number.isFinite(v) ? v : undefined;
const ALL: Interval = {min: -Infinity, max: Infinity, minClosed: false, maxClosed: false};

export const inInterval = (iv: Interval, x: number): boolean =>
    (x > iv.min || (iv.minClosed && x === iv.min)) && (x < iv.max || (iv.maxClosed && x === iv.max));

/** Index of the domain interval containing x, or -1. */
export const domainIndex = (domain: readonly Interval[], x: number): number => domain.findIndex(iv => inInterval(iv, x));

/** Number formatting for LaTeX and plain strings (plain decimal point; no trailing zeros). */
const fmt = (n: number): string => String(Number(n.toFixed(6)));

/** A symbolic argument: `text` is the expression, `atomic` tells whether it needs no parentheses (just `x`). */
interface Arg {readonly text: string; readonly atomic: boolean}
const paren = (a: Arg): string => a.atomic ? a.text : `\\left(${a.text}\\right)`;
const parenP = (a: Arg): string => a.atomic ? a.text : `(${a.text})`;

interface BaseOps {
    readonly domain: readonly Interval[];
    readonly value: (x: number) => number | undefined;
    readonly derivative: (x: number) => number | undefined;
    readonly antiderivative?: (x: number) => number | undefined;
    readonly latexOf: (a: Arg) => string;
    readonly derivativeLatexOf: (a: Arg) => string;
    readonly plainOf: (a: Arg) => string;
    readonly derivativePlainOf: (a: Arg) => string;
}

const powerOps = (shape: PowerShape): BaseOps => {
    switch (shape) {
        case 'square':
            return {
                domain: [ALL], value: x => finite(x * x), derivative: x => finite(2 * x), antiderivative: x => finite(x * x * x / 3),
                latexOf: a => `${paren(a)}^{2}`, derivativeLatexOf: a => `2${paren(a)}`,
                plainOf: a => `${parenP(a)}²`, derivativePlainOf: a => `2${parenP(a)}`,
            };
        case 'cube':
            return {
                domain: [ALL], value: x => finite(x * x * x), derivative: x => finite(3 * x * x), antiderivative: x => finite(x * x * x * x / 4),
                latexOf: a => `${paren(a)}^{3}`, derivativeLatexOf: a => `3${paren(a)}^{2}`,
                plainOf: a => `${parenP(a)}³`, derivativePlainOf: a => `3${parenP(a)}²`,
            };
        case 'sqrt':
            return {
                domain: [{min: 0, max: Infinity, minClosed: true, maxClosed: false}],
                value: x => x >= 0 ? finite(Math.sqrt(x)) : undefined,
                derivative: x => x > 0 ? finite(1 / (2 * Math.sqrt(x))) : undefined,
                antiderivative: x => x >= 0 ? finite(2 * x * Math.sqrt(x) / 3) : undefined,
                latexOf: a => `\\sqrt{${a.text}}`, derivativeLatexOf: a => `\\frac{1}{2\\sqrt{${a.text}}}`,
                plainOf: a => `√${parenP(a)}`, derivativePlainOf: a => `1/(2√${parenP(a)})`,
            };
        case 'reciprocal':
            return {
                domain: [{min: -Infinity, max: 0, minClosed: false, maxClosed: false}, {min: 0, max: Infinity, minClosed: false, maxClosed: false}],
                value: x => x === 0 ? undefined : finite(1 / x),
                derivative: x => x === 0 ? undefined : finite(-1 / (x * x)),
                latexOf: a => `\\frac{1}{${a.text}}`, derivativeLatexOf: a => `-\\frac{1}{${paren(a)}^{2}}`,
                plainOf: a => `1/${parenP(a)}`, derivativePlainOf: a => `−1/${parenP(a)}²`,
            };
        case 'abs':
            return {
                domain: [ALL], value: x => finite(Math.abs(x)), derivative: x => x === 0 ? undefined : Math.sign(x),
                antiderivative: x => finite(x * Math.abs(x) / 2),
                latexOf: a => `\\left|${a.text}\\right|`, derivativeLatexOf: a => `\\operatorname{sgn}${paren(a)}`,
                plainOf: a => `|${a.text}|`, derivativePlainOf: a => `sgn ${parenP(a)}`,
            };
    }
};

const expOps = (a0: number): BaseOps => {
    const ln = Math.log(a0);
    const isE = a0 === Math.E;
    const b = isE ? 'e' : fmt(a0);
    return {
        domain: [ALL], value: x => finite(Math.pow(a0, x)), derivative: x => finite(Math.pow(a0, x) * ln),
        antiderivative: x => finite(Math.pow(a0, x) / ln),
        latexOf: a => `${b}^{${a.text}}`, derivativeLatexOf: a => isE ? `e^{${a.text}}` : `${b}^{${a.text}}\\ln ${b}`,
        plainOf: a => `${b}^${parenP(a)}`, derivativePlainOf: a => isE ? `e^${parenP(a)}` : `${b}^${parenP(a)}·ln ${b}`,
    };
};

const logOps = (a0: number): BaseOps => {
    const ln = Math.log(a0);
    const isE = a0 === Math.E;
    const b = fmt(a0);
    return {
        domain: [{min: 0, max: Infinity, minClosed: false, maxClosed: false}],
        value: x => x > 0 ? finite(Math.log(x) / ln) : undefined,
        derivative: x => x > 0 ? finite(1 / (x * ln)) : undefined,
        antiderivative: x => x > 0 ? finite((x * Math.log(x) - x) / ln) : undefined,
        latexOf: a => isE ? `\\ln ${paren(a)}` : `\\log_{${b}}${paren(a)}`,
        derivativeLatexOf: a => isE ? `\\frac{1}{${a.text}}` : `\\frac{1}{${a.text}\\ln ${b}}`,
        plainOf: a => isE ? `ln ${parenP(a)}` : `log_${b} ${parenP(a)}`,
        derivativePlainOf: a => isE ? `1/${parenP(a)}` : `1/(${a.text}·ln ${b})`,
    };
};

const namedOps = (id: NamedId): BaseOps => {
    const make = (v: (x: number) => number, d: (x: number) => number, f: (x: number) => number,
                  l: string, dl: string, p: string, dp: string): BaseOps => ({
        domain: [ALL], value: x => finite(v(x)), derivative: x => finite(d(x)), antiderivative: x => finite(f(x)),
        // The named entries are written in x only; the argument is substituted textually.
        latexOf: a => l.replace(/x/g, paren(a)), derivativeLatexOf: a => dl.replace(/x/g, paren(a)),
        plainOf: a => p.replace(/x/g, parenP(a)), derivativePlainOf: a => dp.replace(/x/g, parenP(a)),
    });
    switch (id) {
        case 'x2-2':
            return make(x => x * x - 2, x => 2 * x, x => x * x * x / 3 - 2 * x, 'x^{2}-2', '2x', 'x²−2', '2x');
        case 'cubic-cycle':
            return make(x => x * x * x - 2 * x + 2, x => 3 * x * x - 2, x => x * x * x * x / 4 - x * x + 2 * x,
                'x^{3}-2x+2', '3x^{2}-2', 'x³−2x+2', '3x²−2');
        case 'cubic-x3-x':
            return make(x => x * x * x - x, x => 3 * x * x - 1, x => x * x * x * x / 4 - x * x / 2,
                'x^{3}-x', '3x^{2}-1', 'x³−x', '3x²−1');
    }
};

const baseOps = (fn: SchoolBaseFunction): BaseOps => {
    switch (fn.kind) {
        case 'power': return powerOps(fn.shape);
        case 'exp': return expOps(fn.base);
        case 'log': return logOps(fn.base);
        case 'named': return namedOps(fn.id);
        case 'poly':
        case 'rational':
            throw new Error(`School function kind "${fn.kind}" is not implemented yet (task 03).`);
    }
};

/** Whether the text has a top-level + or - after its first character (a sum that a leading factor must bracket). */
const isSum = (text: string): boolean => {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '(' || ch === '{') depth++;
        else if (ch === ')' || ch === '}') depth--;
        else if (depth === 0 && i > 0 && (ch === '+' || ch === '-' || ch === '−')) return true;
    }
    return false;
};
const withFactor = (prefix: string, text: string, plain: boolean): string =>
    prefix !== '' && isSum(text) ? (plain ? `(${text})` : `\\left(${text}\\right)`) : text;

const X: Arg = {text: 'x', atomic: true};

/** The argument b(x - c) as a symbolic expression. */
const transformArg = (b: number, c: number): Arg => {
    const inner = c === 0 ? 'x' : c > 0 ? `x - ${fmt(c)}` : `x + ${fmt(-c)}`;
    if (b === 1) return {text: inner, atomic: c === 0};
    const coef = b === -1 ? '-' : fmt(b);
    return c === 0 ? {text: `${coef}x`, atomic: false} : {text: `${coef}\\left(${inner}\\right)`, atomic: false};
};

const mapDomain = (domain: readonly Interval[], b: number, c: number): Interval[] => {
    const mapped = domain.map((iv): Interval => b > 0
        ? {min: c + iv.min / b, max: c + iv.max / b, minClosed: iv.minClosed, maxClosed: iv.maxClosed}
        : {min: c + iv.max / b, max: c + iv.min / b, minClosed: iv.maxClosed, maxClosed: iv.minClosed});
    return b > 0 ? mapped : mapped.reverse();
};

export const schoolFunctionModel = (fn: SchoolFunction): SchoolFunctionModel => {
    if (fn.kind !== 'transformed') {
        const o = baseOps(fn);
        return {
            domain: o.domain, value: o.value, derivative: o.derivative, antiderivative: o.antiderivative,
            latex: o.latexOf(X), derivativeLatex: o.derivativeLatexOf(X), plain: o.plainOf(X), derivativePlain: o.derivativePlainOf(X),
        };
    }
    const {a, b, c, d} = fn;
    const o = baseOps(fn.base);
    const arg = transformArg(b, c);
    const prefix = a === 1 ? '' : a === -1 ? '-' : `${fmt(a)}\\,`;
    const suffix = d === 0 ? '' : d > 0 ? ` + ${fmt(d)}` : ` - ${fmt(-d)}`;
    const plainPrefix = a === 1 ? '' : a === -1 ? '−' : `${fmt(a)}·`;
    const slope = a * b;
    const slopePrefix = slope === 1 ? '' : slope === -1 ? '-' : `${fmt(slope)}\\,`;
    const slopePlain = slope === 1 ? '' : slope === -1 ? '−' : `${fmt(slope)}·`;
    const anti = o.antiderivative;
    return {
        domain: mapDomain(o.domain, b, c),
        value: x => {
            const v = o.value(b * (x - c));
            return v === undefined ? undefined : finite(a * v + d);
        },
        derivative: x => {
            const v = o.derivative(b * (x - c));
            return v === undefined ? undefined : finite(a * b * v);
        },
        antiderivative: anti ? x => {
            const v = anti(b * (x - c));
            return v === undefined ? undefined : finite(a / b * v + d * x);
        } : undefined,
        latex: `${prefix}${withFactor(prefix, o.latexOf(arg), false)}${suffix}`,
        derivativeLatex: `${slopePrefix}${withFactor(slopePrefix, o.derivativeLatexOf(arg), false)}`,
        plain: `${plainPrefix}${withFactor(plainPrefix, o.plainOf(arg), true)}${suffix}`,
        derivativePlain: `${slopePlain}${withFactor(slopePlain, o.derivativePlainOf(arg), true)}`,
    };
};

// ---------------------------------------------------------------------------------------------------------------
// Validation

export type SchoolFunctionReason =
    | 'not-an-object' | 'missing' | 'not-a-number' | 'not-finite' | 'out-of-range' | 'excluded-value'
    | 'unknown-kind' | 'unknown-shape' | 'unknown-id' | 'nested-transform' | 'unsupported-kind';

export interface SchoolFunctionDiagnosis {
    readonly ok: false;
    /** Dotted path of the offending field, e.g. `base.shape` or `b`; empty for the record itself. */
    readonly field: string;
    readonly reason: SchoolFunctionReason;
    /** Allowed bounds for `out-of-range`. */
    readonly min?: number;
    readonly max?: number;
}
export type SchoolFunctionValidation = {readonly ok: true; readonly value: SchoolFunction} | SchoolFunctionDiagnosis;

const fail = (field: string, reason: SchoolFunctionReason, min?: number, max?: number): SchoolFunctionDiagnosis =>
    min === undefined ? {ok: false, field, reason} : {ok: false, field, reason, min, max};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads a bounded finite number field; returns the number or a diagnosis. Never clamps. */
const readNumber = (rec: Record<string, unknown>, key: string, path: string, min: number, max: number): number | SchoolFunctionDiagnosis => {
    const field = path + key;
    const v = rec[key];
    if (v === undefined) return fail(field, 'missing');
    if (typeof v !== 'number') return fail(field, 'not-a-number');
    if (!Number.isFinite(v)) return fail(field, 'not-finite');
    if (v < min || v > max) return fail(field, 'out-of-range', min, max);
    return v;
};

const validateBase = (input: unknown, path: string): {readonly ok: true; readonly value: SchoolBaseFunction} | SchoolFunctionDiagnosis => {
    if (!isRecord(input)) return fail(path.slice(0, -1), 'not-an-object');
    const kind = input.kind;
    if (kind === undefined) return fail(path + 'kind', 'missing');
    switch (kind) {
        case 'power': {
            const s = input.shape;
            if (s === undefined) return fail(path + 'shape', 'missing');
            if (typeof s !== 'string' || !(POWER_SHAPES as readonly string[]).includes(s)) return fail(path + 'shape', 'unknown-shape');
            return {ok: true, value: {kind: 'power', shape: s as PowerShape}};
        }
        case 'exp':
        case 'log': {
            const base = readNumber(input, 'base', path, BASE_MIN, BASE_MAX);
            if (typeof base !== 'number') return base;
            if (base === 1) return fail(path + 'base', 'excluded-value');
            return {ok: true, value: kind === 'exp' ? {kind: 'exp', base} : {kind: 'log', base}};
        }
        case 'named': {
            const id = input.id;
            if (id === undefined) return fail(path + 'id', 'missing');
            if (typeof id !== 'string' || !(NAMED_IDS as readonly string[]).includes(id)) return fail(path + 'id', 'unknown-id');
            return {ok: true, value: {kind: 'named', id: id as NamedId}};
        }
        case 'poly':
        case 'rational':
            return fail(path + 'kind', 'unsupported-kind');
        case 'transformed':
            return fail(path + 'kind', 'nested-transform');
        default:
            return fail(path + 'kind', 'unknown-kind');
    }
};

/** Validates a plain record (Preset data) field by field. Returns a normalized copy or a structured diagnosis. */
export const validateSchoolFunction = (input: unknown): SchoolFunctionValidation => {
    if (!isRecord(input)) return fail('', 'not-an-object');
    if (input.kind !== 'transformed') return validateBase(input, '');
    if (input.base === undefined) return fail('base', 'missing');
    const base = validateBase(input.base, 'base.');
    if (!base.ok) return base;
    const nums: Record<'a' | 'b' | 'c' | 'd', number> = {a: 0, b: 0, c: 0, d: 0};
    for (const key of ['a', 'b', 'c', 'd'] as const) {
        const [min, max] = TRANSFORM_BOUNDS[key];
        const v = readNumber(input, key, '', min, max);
        if (typeof v !== 'number') return v;
        if (key === 'b' && v === 0) return fail('b', 'excluded-value');
        nums[key] = v;
    }
    return {ok: true, value: {kind: 'transformed', base: base.value, ...nums}};
};

// ---------------------------------------------------------------------------------------------------------------
// Plotting

export interface PlotPoint {readonly x: number; readonly y: number}

const BISECTIONS = 60;

/**
 * Polyline pieces of the graph on [xMin, xMax]. A piece ends at the last valid point before an undefined point and
 * at every domain edge, so no piece spans a gap and no vertical connector is drawn. Towards an open edge or a pole
 * the piece is refined by bisection; y is clipped to the view enlarged by its own height on both sides.
 */
export const plotPieces = (
    fn: SchoolFunction, xMin: number, xMax: number, viewYMin: number, viewYMax: number, samples = 600,
): PlotPoint[][] => {
    if (!(xMax > xMin) || !(viewYMax > viewYMin) || samples < 2) return [];
    const model = schoolFunctionModel(fn);
    const height = viewYMax - viewYMin;
    const lo = viewYMin - height;
    const hi = viewYMax + height;
    const at = (x: number): PlotPoint | undefined => {
        const y = model.value(x);
        return y === undefined ? undefined : {x, y: Math.min(hi, Math.max(lo, y))};
    };
    /** The valid point nearest to the gap on the segment from the valid x `from` toward the invalid x `toward`. */
    const approach = (from: number, toward: number): PlotPoint | undefined => {
        const idx = domainIndex(model.domain, from);
        if (idx < 0) return undefined;
        const iv = model.domain[idx];
        const up = toward > from;
        const edge = up ? iv.max : iv.min;
        const limit = up ? Math.min(edge, toward) : Math.max(edge, toward);
        const closedEdge = limit === edge && (up ? iv.maxClosed : iv.minClosed);
        if (Number.isFinite(limit) && closedEdge && domainIndex(model.domain, limit) === idx) {
            const p = at(limit);
            if (p) return p;
        }
        let good = from;
        let bad = limit;
        for (let i = 0; i < BISECTIONS; i++) {
            const mid = (good + bad) / 2;
            if (mid === good || mid === bad) break;
            if (domainIndex(model.domain, mid) === idx && model.value(mid) !== undefined) good = mid; else bad = mid;
        }
        return good === from ? undefined : at(good);
    };

    const pieces: PlotPoint[][] = [];
    let current: PlotPoint[] = [];
    let currentIdx = -1;
    let prevX = xMin;
    const close = (nextX: number): void => {
        if (current.length > 0) {
            const last = current[current.length - 1];
            const end = approach(last.x, nextX);
            if (end && end.x > last.x) current.push(end);
            pieces.push(current);
        }
        current = [];
        currentIdx = -1;
    };
    for (let i = 0; i < samples; i++) {
        const x = i === samples - 1 ? xMax : xMin + (xMax - xMin) * i / (samples - 1);
        const p = at(x);
        if (!p) {
            close(x);
        } else {
            const idx = domainIndex(model.domain, x);
            if (current.length > 0 && idx !== currentIdx) close(x);
            if (current.length === 0 && i > 0) {
                const start = approach(x, prevX);
                if (start && start.x < x) current.push(start);
            }
            current.push(p);
            currentIdx = idx;
        }
        prevX = x;
    }
    if (current.length > 0) pieces.push(current);
    return pieces.filter(piece => piece.length >= 2);
};
