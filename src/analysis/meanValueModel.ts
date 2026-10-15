import {isMeanValueExampleId, isMeanValueX, isOrdered, MeanValueExampleId} from './meanValue';

/** The stored description of the mean value theorem demonstration. */
export interface MeanValueModel {
    readonly example: MeanValueExampleId;
    readonly a: number;
    readonly b: number;
    readonly c: number;
}

/** The default tangent point c = 0.5 is deliberately not the matching point c = 1, so the lesson can ask for a prediction first. */
export const DEFAULT_MEAN_VALUE_MODEL: MeanValueModel = {example: 'square', a: 0, b: 2, c: 0.5};

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < c < b. */
export function parseMeanValueModel(data: unknown): MeanValueModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, a, b, c} = data as Record<string, unknown>;
    if (!isMeanValueExampleId(example) || !isMeanValueX(a) || !isMeanValueX(b) || !isMeanValueX(c)) return undefined;
    if (!isOrdered(a, c, b)) return undefined;
    return {example, a, b, c};
}
