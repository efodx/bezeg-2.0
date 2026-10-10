/**
 * Validation shared by the G1 spline routes for the 'spline-beta' lesson action. It runs before any mutation, so a
 * rejected action leaves the curve and the sliders untouched.
 */
export function validateSplineBeta(index: unknown, value: unknown, count: number, min: number, max: number): void {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= count) {
        throw new Error(count > 0
            ? `The junction index must be an integer from 0 to ${count - 1}.`
            : 'This curve has no junction parameter to change.');
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new Error(`The parameter β must be a number from ${min} to ${max}.`);
    }
}
