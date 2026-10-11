import {EXPONENTIAL_BASE_MAX, EXPONENTIAL_BASE_MIN} from './exponential';

/** The stored description of the exponential-function demonstration: the base and whether the mirror graph is shown. */
export interface ExponentialModel {
    readonly a: number;
    readonly mirror: boolean;
}

export const DEFAULT_EXPONENTIAL_MODEL: ExponentialModel = {a: 2, mirror: false};

/** The base must be finite and inside the slider range, which excludes a <= 0 (a^x is not defined for every x there). */
export const isExponentialBase = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= EXPONENTIAL_BASE_MIN && value <= EXPONENTIAL_BASE_MAX;

/** Returns a sanitized model (unknown properties dropped; a missing `mirror` means hidden) or undefined when the data is not a valid model. */
export function parseExponentialModel(data: unknown): ExponentialModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {a, mirror} = data as Record<string, unknown>;
    if (!isExponentialBase(a)) return undefined;
    if (mirror !== undefined && typeof mirror !== 'boolean') return undefined;
    return {a, mirror: mirror ?? false};
}
