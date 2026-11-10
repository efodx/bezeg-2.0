/** Logistic map f(x) = r x (1 - x) with r = R/10 for an integer R. Classified from R only; R >= 30 is rejected (outside this family). */

export const LOGISTIC_R_RANGE = {min: 5, max: 29} as const;

export type LogisticKind =
    | 'extinction' // R <= 9: slope r < 1 at 0, the orbit tends to 0
    | 'extinction-slope-one' // R = 10: slope 1 at 0, the slope does not decide; the orbit still converges to 0, slowly
    | 'attracting'; // 11 <= R <= 29: attracting to 1 - 1/r, |f'| = |2 - r| < 1

export interface LogisticClassification {
    readonly kind: LogisticKind;
    /** The limit of every start in (0, 1): 0 or (R - 10)/R, as a fraction. */
    readonly fixedPoint: {readonly num: number; readonly den: number};
    /** f'(x*) in doubles: r at 0, 2 - r at 1 - 1/r. A local statement. */
    readonly slope: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const isLogisticR = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= LOGISTIC_R_RANGE.min && (value as number) <= LOGISTIC_R_RANGE.max;

/** Starts are restricted to the open interval (0, 1). */
export const isLogisticStart = (x0: unknown): x0 is number => typeof x0 === 'number' && x0 > 0 && x0 < 1;

export function logisticMap(R: number): (x: number) => number {
    if (!isLogisticR(R)) throw new RangeError('R must be an integer from 5 to 29.');
    const r = R / 10;
    return x => r * x * (1 - x);
}

export function classifyLogistic(R: number): LogisticClassification {
    if (!isLogisticR(R)) throw new RangeError('R must be an integer from 5 to 29.');
    const r = R / 10;
    if (R <= 10) return {kind: R === 10 ? 'extinction-slope-one' : 'extinction', fixedPoint: {num: 0, den: 1}, slope: r};
    const g = gcd(R - 10, R);
    return {kind: 'attracting', fixedPoint: {num: (R - 10) / g, den: R / g}, slope: 2 - r};
}
