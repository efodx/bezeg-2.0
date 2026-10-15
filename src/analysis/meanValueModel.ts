import {isMeanValueExampleId, isMeanValueX, isOrdered, MeanValueExampleId} from './meanValue';

/**
 * The stored description of the mean value theorem demonstration. `revealed` says whether the matching points are shown
 * (the Show matching point action); it is saved with the preset so a reopened preset and a lesson checkpoint show the
 * same scene. The matching points themselves are never stored: they are recomputed from the example, a and b.
 */
export interface MeanValueModel {
    readonly example: MeanValueExampleId;
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly revealed: boolean;
}

/** The default tangent point c = 0.5 is deliberately not the matching point c = 1, so the lesson can ask for a prediction first. */
export const DEFAULT_MEAN_VALUE_MODEL: MeanValueModel = {example: 'square', a: 0, b: 2, c: 0.5, revealed: false};

/**
 * The model a named example starts from. x^3 starts at the flat tangent c = 0 (secant slope 1, tangent slope 0) and |x|
 * at c = 0.5 (tangent slope 1, secant slope 0); the corner c = 0 of |x| is reached on purpose, never by default.
 */
export const MEAN_VALUE_EXAMPLE_MODELS: Readonly<Record<MeanValueExampleId, MeanValueModel>> = {
    square: DEFAULT_MEAN_VALUE_MODEL,
    cube: {example: 'cube', a: -1, b: 1, c: 0, revealed: false},
    abs: {example: 'abs', a: -1, b: 1, c: 0.5, revealed: false},
};

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < c < b. */
export function parseMeanValueModel(data: unknown): MeanValueModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, a, b, c, revealed} = data as Record<string, unknown>;
    if (!isMeanValueExampleId(example) || !isMeanValueX(a) || !isMeanValueX(b) || !isMeanValueX(c)) return undefined;
    if (typeof revealed !== 'boolean' || !isOrdered(a, c, b)) return undefined;
    return {example, a, b, c, revealed};
}
