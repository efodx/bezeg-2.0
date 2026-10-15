import {DarbouxExampleId, isDarbouxCount, isDarbouxExampleId, isDarbouxInterval, isDarbouxX} from './darboux';

/**
 * The stored description of the Darboux sums demonstration. Sums, infima and suprema are never stored: they are
 * recomputed from the example, a, b and n.
 */
export interface DarbouxModel {
    readonly example: DarbouxExampleId;
    readonly a: number;
    readonly b: number;
    readonly n: number;
    readonly lowerVisible: boolean;
    readonly upperVisible: boolean;
}

export const DEFAULT_DARBOUX_MODEL: DarbouxModel = {example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true};

/** The model a named example starts from. The sine interval ends are stored exactly (0 and 2 pi are not on the 0.01 grid). */
export const DARBOUX_EXAMPLE_MODELS: Readonly<Record<DarbouxExampleId, DarbouxModel>> = {
    square: DEFAULT_DARBOUX_MODEL,
    sine: {example: 'sine', a: 0, b: 2 * Math.PI, n: 4, lowerVisible: true, upperVisible: true},
};

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < b. */
export function parseDarbouxModel(data: unknown): DarbouxModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, a, b, n, lowerVisible, upperVisible} = data as Record<string, unknown>;
    if (!isDarbouxExampleId(example) || !isDarbouxX(a) || !isDarbouxX(b) || !isDarbouxInterval(a, b)) return undefined;
    if (!isDarbouxCount(n) || typeof lowerVisible !== 'boolean' || typeof upperVisible !== 'boolean') return undefined;
    return {example, a, b, n, lowerVisible, upperVisible};
}
