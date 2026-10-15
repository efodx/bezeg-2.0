import {isTaylorCenter, isTaylorDegree, isTaylorExampleId, isTaylorX, taylorExample, TaylorExampleId} from './taylor';

/**
 * The stored description of the Taylor approximation demonstration. `boundVisible` says whether the Lagrange remainder bound
 * is shown (the Show error bound action); it is saved with the preset so a reopened preset and a lesson checkpoint show the
 * same scene. The polynomial, the errors and the bound are never stored: they are recomputed from the other fields.
 */
export interface TaylorModel {
    readonly example: TaylorExampleId;
    readonly center: number;
    readonly degree: number;
    readonly x: number;
    readonly boundVisible: boolean;
}

/** e^x about 0 with T_1 at x = 1 (T_1(1) = 2 against e); the bound is hidden so the lesson can ask for a prediction first. */
export const DEFAULT_TAYLOR_MODEL: TaylorModel = {example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false};

/**
 * The model a named example starts from. 1/(1 - x) starts inside its convergence interval (x = 0.5); the lesson moves the
 * point outside it on purpose. The flat function keeps its fixed center 0.
 */
export const TAYLOR_EXAMPLE_MODELS: Readonly<Record<TaylorExampleId, TaylorModel>> = {
    exp: DEFAULT_TAYLOR_MODEL,
    sine: {example: 'sine', center: 0, degree: 3, x: 2, boundVisible: false},
    geometric: {example: 'geometric', center: 0, degree: 3, x: 0.5, boundVisible: false},
    flat: {example: 'flat', center: 0, degree: 3, x: 1, boundVisible: false},
};

/**
 * Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model: a known example,
 * a center and an evaluation point inside that example's domains (the flat example only accepts center 0) and an integer
 * degree 0..10. Nothing is clamped.
 */
export function parseTaylorModel(data: unknown): TaylorModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, center, degree, x, boundVisible} = data as Record<string, unknown>;
    if (!isTaylorExampleId(example)) return undefined;
    const definition = taylorExample(example);
    if (!isTaylorCenter(definition, center) || !isTaylorDegree(degree) || !isTaylorX(definition, x)) return undefined;
    if (typeof boundVisible !== 'boolean') return undefined;
    return {example, center, degree, x, boundVisible};
}
