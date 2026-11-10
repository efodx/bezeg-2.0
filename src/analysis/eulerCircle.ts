import {Complex} from './complex';

/** Largest series degree of the partial-sum stepper. */
export const EXP_SERIES_DEGREE_MAX = 30;

export interface EulerPoint extends Complex {
    /** True for multiples of 90 degrees, where the coordinates are exact integers. */
    exact: boolean;
}

/** e^(i theta) for an integer number of degrees; multiples of 90 degrees give exactly 1, i, -1, -i, other angles computed doubles. */
export function eulerPoint(degrees: number): EulerPoint {
    if (!Number.isInteger(degrees)) throw new RangeError(`The angle must be an integer number of degrees, got ${degrees}.`);
    const d = ((degrees % 360) + 360) % 360;
    switch (d) {
        case 0: return {re: 1, im: 0, exact: true};
        case 90: return {re: 0, im: 1, exact: true};
        case 180: return {re: -1, im: 0, exact: true};
        case 270: return {re: 0, im: -1, exact: true};
    }
    const radians = d * Math.PI / 180;
    return {re: Math.cos(radians), im: Math.sin(radians), exact: false};
}

export interface CircularMotion {
    position: Complex;
    velocity: Complex;
    acceleration: Complex;
}

/** Uniform circular motion z = e^(i omega t): position z, velocity i omega z, acceleration -omega^2 z. Throws RangeError for non-finite input. */
export function circularMotion(omega: number, t: number): CircularMotion {
    if (!Number.isFinite(omega) || !Number.isFinite(t)) throw new RangeError('omega and t must be finite numbers.');
    const c = Math.cos(omega * t);
    const s = Math.sin(omega * t);
    return {
        position: {re: c, im: s},
        velocity: {re: -omega * s, im: omega * c},
        acceleration: {re: -omega * omega * c, im: -omega * omega * s},
    };
}

/**
 * The partial sum of degree N of sum (i theta)^k / k!, by the term recurrence t_(k+1) = t_k * i theta / (k + 1)
 * (no Math.cos or Math.sin). N is an integer in [1, 30]; theta in radians, finite.
 */
export function expSeriesPartial(theta: number, N: number): Complex {
    if (!Number.isFinite(theta)) throw new RangeError('theta must be a finite number.');
    if (!Number.isInteger(N) || N < 1 || N > EXP_SERIES_DEGREE_MAX) {
        throw new RangeError(`The degree must be an integer from 1 to ${EXP_SERIES_DEGREE_MAX}, got ${N}.`);
    }
    let term: Complex = {re: 1, im: 0};
    let sum: Complex = {re: 1, im: 0};
    for (let k = 0; k < N; k++) {
        term = {re: -term.im * theta / (k + 1), im: term.re * theta / (k + 1)};
        sum = {re: sum.re + term.re, im: sum.im + term.im};
    }
    return sum;
}
