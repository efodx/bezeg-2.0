/**
 * Arrow-scale ladder (ADR 0050 section 3). The step is a value of 1, 2, 5 x 10^k; an arrow of length 1
 * stands for `step` units. Velocity and acceleration get separate scales (call twice with their units).
 */

export interface ArrowScale {
    /** Ladder step: arrow length 1 = `step` units. */
    step: number;
    unit: string;
    /** For example "5 m/s", decimal comma. */
    label: string;
}

const MANTISSAS = [1, 2, 5] as const;
/** Relative slack so a magnitude equal to a ladder value (up to rounding) keeps that value. */
const BOUNDARY_SLACK = 1e-12;

/** Smallest ladder value >= maxMagnitude (within rounding); 1 for a zero magnitude. */
export function ladderStep(maxMagnitude: number): number {
    if (!Number.isFinite(maxMagnitude) || maxMagnitude < 0) {
        throw new RangeError(`maxMagnitude must be finite and non-negative, got ${maxMagnitude}.`);
    }
    if (maxMagnitude === 0) {
        return 1;
    }
    const target = maxMagnitude * (1 - BOUNDARY_SLACK);
    const k0 = Math.floor(Math.log10(maxMagnitude));
    for (let k = k0 - 1; k <= k0 + 1; k++) {
        for (const m of MANTISSAS) {
            const step = Number(`${m}e${k}`);
            if (step >= target) {
                return step;
            }
        }
    }
    throw new RangeError(`No ladder step for ${maxMagnitude}.`);
}

/** Positional decimal with a comma, never exponent form (ladder steps are m x 10^k, m in 1, 2, 5). */
function formatStep(step: number): string {
    const [mantissa, exponent] = step.toExponential().split('e');
    const digits = mantissa.replace('.', '');
    const k = Number(exponent);
    if (k >= 0) {
        return digits + '0'.repeat(k + 1 - digits.length);
    }
    return '0,' + '0'.repeat(-k - 1) + digits;
}

/** The longest arrow has length at most 1; `unit` is "m/s" or "m/s²". */
export function arrowScale(maxMagnitude: number, unit: string): ArrowScale {
    const step = ladderStep(maxMagnitude);
    return {step, unit, label: `${formatStep(step)} ${unit}`};
}
