import {ExtremaExampleId, isExtremaExampleId, isExtremaX, isInterval} from './extrema';

/**
 * The stored description of the extrema demonstration. `revealed` says whether the local and global classification is
 * shown (the Show classification action); it is saved with the preset so a reopened preset and a lesson checkpoint show
 * the same scene. Candidates and classifications are never stored: they are recomputed from the example, a and b.
 */
export interface ExtremaModel {
    readonly example: ExtremaExampleId;
    readonly a: number;
    readonly b: number;
    readonly revealed: boolean;
}

/** x^2 on [-1, 2]: an endpoint maximum at -1 (local) and 2 (global) and the minimum 0 in between. */
export const DEFAULT_EXTREMA_MODEL: ExtremaModel = {example: 'square', a: -1, b: 2, revealed: false};

/** The model a named example starts from. */
export const EXTREMA_EXAMPLE_MODELS: Readonly<Record<ExtremaExampleId, ExtremaModel>> = {
    square: DEFAULT_EXTREMA_MODEL,
    cube: {example: 'cube', a: -1, b: 1, revealed: false},
    abs: {example: 'abs', a: -1, b: 1, revealed: false},
    sine: {example: 'sine', a: -4, b: 4, revealed: false},
};

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < b. */
export function parseExtremaModel(data: unknown): ExtremaModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, a, b, revealed} = data as Record<string, unknown>;
    if (!isExtremaExampleId(example) || !isExtremaX(a) || !isExtremaX(b)) return undefined;
    if (typeof revealed !== 'boolean' || !isInterval(a, b)) return undefined;
    return {example, a, b, revealed};
}
