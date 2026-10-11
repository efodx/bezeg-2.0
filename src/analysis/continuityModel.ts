import {CONTINUITY_A_MAX, CONTINUITY_A_MIN} from './continuity';

/** The stored description of the continuity demonstration: the parameter a. */
export interface ContinuityModel {
    readonly a: number;
}

export const DEFAULT_CONTINUITY_MODEL: ContinuityModel = {a: 1};

/** The parameter must be finite and inside the slider range [0, 3]. */
export const isContinuityParameter = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= CONTINUITY_A_MIN && value <= CONTINUITY_A_MAX;

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseContinuityModel(data: unknown): ContinuityModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {a} = data as Record<string, unknown>;
    if (!isContinuityParameter(a)) return undefined;
    return {a};
}
