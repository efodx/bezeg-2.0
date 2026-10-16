import {
    isUniformEpsilon, isUniformExampleId, isUniformN, isUniformR, isUniformX, UniformExampleId,
} from './uniformConvergence';

/**
 * The stored description of the uniform convergence demonstration: f_n on [0, r] with the chosen index n, the chosen point
 * x in [0, r] and the tolerance epsilon. `supremumVisible` says whether the supremum error over the whole domain is shown
 * (the Show supremum action); it is saved so that a reopened preset and a lesson checkpoint show the same scene. Errors,
 * thresholds and suprema are never stored: they are recomputed from the other fields.
 */
export interface UniformConvergenceModel {
    readonly example: UniformExampleId;
    readonly r: number;
    readonly n: number;
    readonly x: number;
    readonly epsilon: number;
    readonly supremumVisible: boolean;
}

/** x^n on [0, 0.8] with n = 5 (0.8^5 = 0.32768); the supremum is hidden so the lesson can ask for a prediction first. */
export const DEFAULT_UNIFORM_MODEL: UniformConvergenceModel =
    {example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false};

/** The model a named example starts from; changing the example loads its model (it does not carry over r, x or n). */
export const UNIFORM_EXAMPLE_MODELS: Readonly<Record<UniformExampleId, UniformConvergenceModel>> = {
    power: DEFAULT_UNIFORM_MODEL,
    scaled: {example: 'scaled', r: 1, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false},
};

/**
 * Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model: a known example,
 * r on the grid 0.05 in [0.1, 1], an integer n in 1..UNIFORM_MAX_N, x on the grid 0.01 in [0, r] and epsilon on the grid 0.01
 * in [0.01, 1]. Nothing is clamped.
 */
export function parseUniformConvergenceModel(data: unknown): UniformConvergenceModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, r, n, x, epsilon, supremumVisible} = data as Record<string, unknown>;
    if (!isUniformExampleId(example) || !isUniformR(r) || !isUniformN(n) || !isUniformX(r, x) || !isUniformEpsilon(epsilon)) return undefined;
    if (typeof supremumVisible !== 'boolean') return undefined;
    return {example, r, n, x, epsilon, supremumVisible};
}

/** Why a requested change of r was refused. */
export type UniformRChange =
    | {readonly ok: true; readonly model: UniformConvergenceModel}
    | {readonly ok: false; readonly reason: 'r-invalid' | 'x-outside-domain'};

/**
 * The model with a new domain end r. The chosen point x is kept only while it stays in [0, r]; otherwise the change is
 * refused (`x-outside-domain`) and nothing is clamped, so the inspector can say the point must move first. An r that is not
 * a grid value in [0.1, 1] is refused as `r-invalid`.
 */
export function changeUniformR(model: UniformConvergenceModel, r: unknown): UniformRChange {
    if (!isUniformR(r)) return {ok: false, reason: 'r-invalid'};
    if (!isUniformX(r, model.x)) return {ok: false, reason: 'x-outside-domain'};
    return {ok: true, model: {...model, r}};
}
