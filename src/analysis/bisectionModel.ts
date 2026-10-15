import {BisectionExampleId, BISECTION_EXAMPLES, isBisectionBracket, isBisectionExampleId, isBisectionStepCount} from './bisection';

/**
 * The stored description of the bisection demonstration: `step` is the iteration index (how many steps are revealed).
 * Playback state is not stored; a reopened preset is paused. The history is recomputed from these fields.
 */
export interface BisectionModel {
    readonly example: BisectionExampleId;
    readonly a: number;
    readonly b: number;
    readonly step: number;
}

const DEFAULT_EXAMPLE = BISECTION_EXAMPLES['square-minus-two'];

export const DEFAULT_BISECTION_MODEL: BisectionModel = {
    example: DEFAULT_EXAMPLE.id, a: DEFAULT_EXAMPLE.defaultA, b: DEFAULT_EXAMPLE.defaultB, step: 0,
};

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseBisectionModel(data: unknown): BisectionModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, a, b, step} = data as Record<string, unknown>;
    if (!isBisectionExampleId(example) || typeof a !== 'number' || typeof b !== 'number') return undefined;
    if (!isBisectionBracket(a, b) || !isBisectionStepCount(step)) return undefined;
    return {example, a, b, step};
}
