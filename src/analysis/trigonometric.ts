/**
 * Trigonometric functions f(x) = A * g(omega * x + phi) + B with g in {sin, cos, tan}.
 * Pure mathematics: no React, JSXGraph or localization imports.
 */
import {formatNumber, MINUS_SIGN, NumberLanguage} from './format';

export type TrigFunction = 'sin' | 'cos' | 'tan';
export const TRIG_FUNCTIONS: readonly TrigFunction[] = ['sin', 'cos', 'tan'];

export interface TrigParameters {
    readonly fn: TrigFunction;
    readonly A: number;
    readonly omega: number;
    readonly phi: number;
    readonly B: number;
}

/** Slider ranges and steps. omega > 0 always (omega = 0 would be a constant with no period). */
export const AMPLITUDE_MIN = -3;
export const AMPLITUDE_MAX = 3;
export const AMPLITUDE_STEP = 0.1;
export const OMEGA_MIN = 0.25;
export const OMEGA_MAX = 4;
export const OMEGA_STEP = 0.05;
export const PHASE_MIN = -Math.PI;
export const PHASE_MAX = Math.PI;
/** A twelfth of pi, so that +-pi/2, +-pi/3, +-pi/4 and +-pi/6 are all reachable exactly. */
export const PHASE_STEP = Math.PI / 12;
export const MIDLINE_MIN = -3;
export const MIDLINE_MAX = 3;
export const MIDLINE_STEP = 0.1;

const EPSILON = 1e-9;

/** g(u) for the chosen basic function. */
export function basicValue(fn: TrigFunction, u: number): number {
    if (fn === 'sin') return Math.sin(u);
    if (fn === 'cos') return Math.cos(u);
    return Math.tan(u);
}

/** f(x) = A * g(omega * x + phi) + B. */
export function trigValue(parameters: TrigParameters, x: number): number {
    return parameters.A * basicValue(parameters.fn, parameters.omega * x + parameters.phi) + parameters.B;
}

/** Amplitude |A|; tangent has no maximum or minimum, so it has no amplitude (null). */
export function amplitude(parameters: Pick<TrigParameters, 'fn' | 'A'>): number | null {
    return parameters.fn === 'tan' ? null : Math.abs(parameters.A);
}

/** Period 2*pi/omega for sin and cos, pi/omega for tan. */
export function period(parameters: Pick<TrigParameters, 'fn' | 'omega'>): number {
    return (parameters.fn === 'tan' ? Math.PI : 2 * Math.PI) / parameters.omega;
}

/** Phase shift -phi/omega: the graph of g is moved this far to the right (to the left when negative). */
export function phaseShift(parameters: Pick<TrigParameters, 'omega' | 'phi'>): number {
    return -parameters.phi / parameters.omega + 0;
}

/** Range [B - |A|, B + |A|] for sin and cos; all reals (null) for tan, except that A = 0 leaves the constant B. */
export function valueRange(parameters: Pick<TrigParameters, 'fn' | 'A' | 'B'>): readonly [number, number] | null {
    if (parameters.fn === 'tan') return parameters.A === 0 ? [parameters.B, parameters.B] : null;
    const spread = Math.abs(parameters.A);
    return [parameters.B - spread, parameters.B + spread];
}

/**
 * The x positions in [left, right] where omega * x + phi = pi/2 + m*pi (m an integer), in increasing order. These are
 * the vertical asymptotes of tan(omega * x + phi). At most `limit` positions are returned.
 */
export function tangentAsymptotes(omega: number, phi: number, left: number, right: number, limit = 1000): number[] {
    if (!(omega > 0) || !Number.isFinite(left) || !Number.isFinite(right) || right < left) return [];
    const first = Math.ceil(((omega * left + phi) - Math.PI / 2) / Math.PI - EPSILON);
    const result: number[] = [];
    for (let m = first; result.length < limit; m++) {
        const x = (Math.PI / 2 + m * Math.PI - phi) / omega;
        if (x > right + EPSILON) break;
        result.push(x);
    }
    return result;
}

/** A continuous piece of a graph; `x` and `y` have the same length. */
export interface GraphPiece {
    readonly x: number[];
    readonly y: number[];
}

function isAsymptote(omega: number, phi: number, x: number): boolean {
    const turns = (omega * x + phi - Math.PI / 2) / Math.PI;
    return Math.abs(turns - Math.round(turns)) < EPSILON;
}

/**
 * The continuous branches of A * tan(omega * x + phi) + B inside [left, right], one piece per interval between
 * consecutive asymptotes, so a graph drawn from them never joins two branches across an asymptote. Samples are denser
 * near the ends of a branch, and a branch end that lies on an asymptote is moved inwards by `inset` (in units of the
 * argument omega * x + phi) so that the values stay finite.
 */
export function tangentBranches(parameters: Omit<TrigParameters, 'fn'>, left: number, right: number, samples = 48, inset = 0.01): GraphPiece[] {
    const {omega, phi} = parameters;
    if (!(omega > 0) || !Number.isFinite(left) || !Number.isFinite(right) || !(right > left)) return [];
    const boundaries = tangentAsymptotes(omega, phi, left, right);
    const edges = [left, ...boundaries.filter(x => x > left + EPSILON && x < right - EPSILON), right];
    const insetX = inset / omega;
    const pieces: GraphPiece[] = [];
    for (let i = 0; i + 1 < edges.length; i++) {
        const startsAtAsymptote = i > 0 || isAsymptote(omega, phi, edges[0]);
        const endsAtAsymptote = i + 2 < edges.length || isAsymptote(omega, phi, edges[edges.length - 1]);
        const from = edges[i] + (startsAtAsymptote ? insetX : 0);
        const to = edges[i + 1] - (endsAtAsymptote ? insetX : 0);
        if (!(to > from)) continue;
        const piece: GraphPiece = {x: [], y: []};
        for (let j = 0; j <= samples; j++) {
            const x = from + (to - from) * (1 - Math.cos(Math.PI * j / samples)) / 2;
            piece.x.push(x);
            piece.y.push(trigValue({...parameters, fn: 'tan'}, x));
        }
        pieces.push(piece);
    }
    return pieces;
}

/**
 * Joins pieces into the coordinate arrays of one curve, with a NaN between pieces: JSXGraph lifts the pen at a NaN
 * instead of drawing a connecting segment.
 */
export function joinPieces(pieces: readonly GraphPiece[]): GraphPiece {
    const x: number[] = [];
    const y: number[] = [];
    pieces.forEach((piece, index) => {
        if (index > 0) {
            x.push(NaN);
            y.push(NaN);
        }
        x.push(...piece.x);
        y.push(...piece.y);
    });
    return {x, y};
}

/** Snaps a phase to the nearest multiple of pi/12 when it is within rounding noise of one; other values pass through. */
export function snapPhase(phi: number): number {
    const steps = Math.round(phi / PHASE_STEP);
    return Math.abs(phi - steps * PHASE_STEP) < EPSILON ? steps * PHASE_STEP + 0 : phi;
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

/**
 * A phase that is a multiple of pi/12 written as a multiple of pi ("π/2", "−π/4", "5π/12", "0", "π"); null when it is
 * not (within rounding noise) such a multiple.
 */
export function phaseAsPi(phi: number): string | null {
    if (!Number.isFinite(phi)) return null;
    const steps = Math.round(phi / PHASE_STEP);
    if (Math.abs(phi - steps * PHASE_STEP) >= EPSILON) return null;
    if (steps === 0) return '0';
    const divisor = gcd(Math.abs(steps), 12);
    const numerator = Math.abs(steps) / divisor;
    const denominator = 12 / divisor;
    const sign = steps < 0 ? MINUS_SIGN : '';
    return `${sign}${numerator === 1 ? '' : numerator}π${denominator === 1 ? '' : `/${denominator}`}`;
}

/** The phase for the readouts: as a multiple of pi when exact, otherwise a rounded number. */
export function formatPhase(phi: number, language: NumberLanguage): string {
    return phaseAsPi(phi) ?? formatNumber(phi, language);
}

/** A number with its exact multiple of pi added when it has one, for example "1,57 (π/2)" or "−0,79 (−π/4)". */
export function formatWithPi(value: number, language: NumberLanguage): string {
    const number = formatNumber(value, language);
    const pi = phaseAsPi(value);
    return pi === null || pi === '0' ? number : `${number} (${pi})`;
}

/** The formula text for the board, for example "f(x) = 2·sin(2x + π/2) + 1". */
export function equationText(parameters: TrigParameters, language: NumberLanguage): string {
    const number = (value: number) => formatNumber(value, language);
    const isZero = (value: number) => Math.abs(value) < EPSILON;
    const {fn, A, omega, phi, B} = parameters;
    const scale = Math.abs(A - 1) < EPSILON ? '' : Math.abs(A + 1) < EPSILON ? MINUS_SIGN : `${number(A)}·`;
    const argument = `${Math.abs(omega - 1) < EPSILON ? '' : number(omega)}x`
        + (isZero(phi) ? '' : ` ${phi < 0 ? MINUS_SIGN : '+'} ${phaseAsPi(Math.abs(phi)) ?? number(Math.abs(phi))}`);
    const midline = isZero(B) ? '' : ` ${B < 0 ? MINUS_SIGN : '+'} ${number(Math.abs(B))}`;
    return `f(x) = ${scale}${fn}(${argument})${midline}`;
}
