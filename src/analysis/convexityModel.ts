import {ConvexityExampleId, isConvexityExampleId, isConvexityInterval, isConvexityX} from './convexity';

/**
 * The stored description of the convexity demonstration. `secondDerivativeVisible` says whether the sign of f'' (and the
 * inflection point, if any) is shown; it is saved with the preset so a reopened preset and a lesson checkpoint show the
 * same scene. The tangent point t is independent of [a, b] and may lie outside it.
 */
export interface ConvexityModel {
    readonly example: ConvexityExampleId;
    readonly a: number;
    readonly b: number;
    readonly t: number;
    readonly secondDerivativeVisible: boolean;
}

export const DEFAULT_CONVEXITY_MODEL: ConvexityModel = {
    example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false,
};

/** The model a named example starts from. x^3 starts on an interval containing 0, where no claim can be made. */
export const CONVEXITY_EXAMPLE_MODELS: Readonly<Record<ConvexityExampleId, ConvexityModel>> = {
    square: DEFAULT_CONVEXITY_MODEL,
    negSquare: {example: 'negSquare', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false},
    cube: {example: 'cube', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false},
    quartic: {example: 'quartic', a: -1, b: 1, t: 0.5, secondDerivativeVisible: false},
};

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < b. */
export function parseConvexityModel(data: unknown): ConvexityModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, a, b, t, secondDerivativeVisible} = data as Record<string, unknown>;
    if (!isConvexityExampleId(example) || !isConvexityX(a) || !isConvexityX(b) || !isConvexityX(t)) return undefined;
    if (typeof secondDerivativeVisible !== 'boolean' || !isConvexityInterval(a, b)) return undefined;
    return {example, a, b, t, secondDerivativeVisible};
}
