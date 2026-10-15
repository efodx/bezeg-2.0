import {FunctionId, isFunctionId} from './functions';
import {isAccumulationBound} from './accumulation';

/** The stored description of the accumulation demonstration. */
export interface AccumulationModel {
    readonly fn: FunctionId;
    /** The lower bound a of A(x) = integral from a to x of f. */
    readonly a: number;
    readonly x: number;
    /** Whether the accumulation curve A is shown; it starts hidden so the lesson can ask for an area prediction first. */
    readonly accumulationVisible: boolean;
}

export const DEFAULT_ACCUMULATION_MODEL: AccumulationModel = {fn: 'sin', a: 0, x: 2, accumulationVisible: false};

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. All four fields are required. */
export function parseAccumulationModel(data: unknown): AccumulationModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {fn, a, x, accumulationVisible} = data as Record<string, unknown>;
    if (!isFunctionId(fn) || !isAccumulationBound(a) || !isAccumulationBound(x)) return undefined;
    if (typeof accumulationVisible !== 'boolean') return undefined;
    return {fn, a, x, accumulationVisible};
}
